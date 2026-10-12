import {
  BadRequestException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { PythonRunnerService } from './python-runner.service';

jest.mock('node:child_process', () => ({ execFile: jest.fn() }));

type Callback = (
  error: (Error & Record<string, unknown>) | null,
  stdout: string,
  stderr: string,
) => void;
type Call = { cmd: string; args: string[]; cb: Callback };

const execMock = execFile as unknown as jest.Mock;

/** Giá trị cấu hình mặc định như env.validation.ts. */
function makeService(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    PY_SANDBOX_IMAGE: 'py-sandbox',
    PY_RUN_TIMEOUT_MS: 10_000,
    PY_RUN_MAX_CONCURRENT: 2,
    ...overrides,
  };
  const config = { get: (k: string) => values[k] } as unknown as ConfigService;
  return new PythonRunnerService(config);
}

function err(props: Record<string, unknown>) {
  return Object.assign(new Error('Command failed'), props);
}

/** Thư mục tạm mà service đã mount, đọc ngược từ đối số `--mount`. */
function mountedDir(args: string[]): string {
  const mount = args[args.indexOf('--mount') + 1];
  return /source=(.*),target=\/code/.exec(mount)![1];
}

/**
 * execFile giả: mỗi lời gọi được GHI LẠI, test tự quyết lúc nào trả lời bằng
 * `answer`. `docker kill` luôn trả lời ngay.
 */
function installExec(onRun: (call: Call) => void) {
  const calls: Call[] = [];
  execMock.mockImplementation(
    (cmd: string, args: string[], _opts: unknown, cb: Callback) => {
      const call = { cmd, args, cb };
      calls.push(call);
      if (args[0] === 'kill') cb(null, '', '');
      else onRun(call);
    },
  );
  return calls;
}

describe('PythonRunnerService', () => {
  beforeEach(() => execMock.mockReset());

  it('chạy thành công: trả stdout, exitCode 0 và dựng lệnh docker đúng cờ', async () => {
    const calls = installExec((c) => c.cb(null, '2\n', ''));
    const result = await makeService().run('print(1+1)');

    expect(result).toMatchObject({
      stdout: '2\n',
      stderr: '',
      exitCode: 0,
      timedOut: false,
      outputTruncated: false,
    });
    expect(typeof result.durationMs).toBe('number');

    // chỉ một lời gọi, không có docker kill
    expect(calls).toHaveLength(1);
    const { cmd, args } = calls[0];
    expect(cmd).toBe('docker');
    // mảng đối số, không qua shell; mỗi cờ là một phần tử riêng
    expect(args.slice(0, 2)).toEqual(['run', '--rm']);
    expect(args).toEqual(
      expect.arrayContaining([
        '--cpus=1',
        '--memory=1g',
        '--memory-swap=1g',
        '--pids-limit=128',
        '--network=none',
        '--read-only',
        '--tmpfs',
        '/tmp:size=64m',
      ]),
    );
    expect(args[args.indexOf('--name') + 1]).toMatch(/^pyrun-[0-9a-f-]{36}$/);
    // mount bằng --mount ... readonly, không dùng -v
    expect(args).not.toContain('-v');
    expect(args[args.indexOf('--mount') + 1]).toMatch(
      /^type=bind,source=.+,target=\/code,readonly$/,
    );
    expect(args.slice(-3)).toEqual(['py-sandbox', 'python', '/code/main.py']);
    // mã người dùng không bao giờ nằm trên dòng lệnh
    expect(args.join(' ')).not.toContain('print(1+1)');
  });

  it('timeout: gọi docker kill đúng tên container và báo timedOut', async () => {
    const calls = installExec((c) =>
      c.cb(err({ killed: true, signal: 'SIGKILL', code: null }), '', ''),
    );
    const result = await makeService().run('while True: pass');

    expect(result.timedOut).toBe(true);
    expect(result.outputTruncated).toBe(false);
    expect(result.exitCode).toBeNull();

    const name = calls[0].args[calls[0].args.indexOf('--name') + 1];
    const kill = calls.find((c) => c.args[0] === 'kill');
    expect(kill).toBeDefined();
    expect(kill!.cmd).toBe('docker');
    expect(kill!.args).toEqual(['kill', name]);
  });

  it('timeout đọc từ cấu hình và truyền cho execFile', async () => {
    installExec((c) => c.cb(null, '', ''));
    await makeService({ PY_RUN_TIMEOUT_MS: 3000 }).run('pass');
    const calls = execMock.mock.calls as unknown[][];
    const opts = calls[0][2] as Record<string, unknown>;
    expect(opts).toMatchObject({ timeout: 3000, maxBuffer: 1024 * 1024 });
  });

  it('tràn maxBuffer: báo outputTruncated (không phải timedOut) và docker kill', async () => {
    const calls = installExec((c) =>
      c.cb(
        err({
          killed: true,
          signal: 'SIGKILL',
          code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
        }),
        'x'.repeat(1024),
        '',
      ),
    );
    const result = await makeService().run('while True: print("x")');

    expect(result.outputTruncated).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toHaveLength(1024);
    expect(calls.some((c) => c.args[0] === 'kill')).toBe(true);
  });

  it('thoát 137 (hết RAM): trả nguyên exitCode, KHÔNG gọi docker kill', async () => {
    const calls = installExec((c) =>
      c.cb(err({ code: 137, killed: false }), '', 'Killed'),
    );
    const result = await makeService().run('x = b"x" * 2**31');

    expect(result).toMatchObject({
      exitCode: 137,
      timedOut: false,
      outputTruncated: false,
    });
    expect(calls.some((c) => c.args[0] === 'kill')).toBe(false);
  });

  it('thư mục tạm LUÔN bị xoá: khi chạy xong, khi timeout và khi lỗi hạ tầng', async () => {
    const dirs: string[] = [];
    const record = (c: Call) => {
      const dir = mountedDir(c.args);
      // trong lúc chạy thì file main.py phải có thật
      expect(existsSync(`${dir}/main.py`)).toBe(true);
      dirs.push(dir);
    };

    installExec((c) => {
      record(c);
      c.cb(null, 'ok', '');
    });
    await makeService().run('print("ok")');

    installExec((c) => {
      record(c);
      c.cb(err({ killed: true, signal: 'SIGKILL' }), '', '');
    });
    await makeService().run('while True: pass');

    installExec((c) => {
      record(c);
      c.cb(err({ code: 'ENOENT' }), '', '');
    });
    await expect(makeService().run('pass')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    expect(dirs).toHaveLength(3);
    for (const dir of dirs) expect(existsSync(dir)).toBe(false);
  });

  it('vượt PY_RUN_MAX_CONCURRENT thì 429, và nhả chỗ khi một lượt chạy xong', async () => {
    const pending: Call[] = [];
    installExec((c) => pending.push(c));
    const service = makeService({ PY_RUN_MAX_CONCURRENT: 1 });

    const first = service.run('while True: pass');
    // chờ service đi tới execFile (sau mkdtemp/writeFile bất đồng bộ)
    await new Promise((r) => setTimeout(r, 50));
    expect(pending).toHaveLength(1);

    const second = service.run('print(2)');
    await expect(second).rejects.toBeInstanceOf(HttpException);
    await expect(second).rejects.toMatchObject({ status: 429 });
    // lượt bị từ chối không được spawn container
    expect(pending).toHaveLength(1);

    pending[0].cb(null, '', '');
    await first;

    // chỗ đã được nhả: lượt sau chạy được
    installExec((c) => c.cb(null, '3\n', ''));
    await expect(service.run('print(3)')).resolves.toMatchObject({
      stdout: '3\n',
    });
  });

  it('từ chối mã quá 20 KB (đếm BYTE) trước khi đụng tới docker', async () => {
    installExec((c) => c.cb(null, '', ''));
    // 7000 ký tự × 3 byte = 21000 byte > 20480, dù chỉ 7000 ký tự
    await expect(makeService().run('ệ'.repeat(7000))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(execMock).not.toHaveBeenCalled();
  });
});
