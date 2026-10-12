import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAX_CODE_BYTES } from './dto/run-code.dto';

export interface RunResult {
  stdout: string;
  stderr: string;
  /** null khi tiến trình bị giết (timeout / vượt maxBuffer) nên không có mã thoát. */
  exitCode: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
  durationMs: number;
}

/** Trần dung lượng mỗi luồng (stdout, stderr) mà Node giữ lại: 1 MB. */
const MAX_BUFFER = 1024 * 1024;

type ExecOutcome = Omit<RunResult, 'durationMs'>;

/**
 * Chạy mã Python của người dùng trong container Docker dùng một lần.
 *
 * Cách ly nằm ở các cờ `docker run` (không mạng, FS chỉ đọc, 1 CPU/1 GB RAM,
 * 128 tiến trình, người dùng không phải root trong image) — service này chỉ
 * dựng lệnh, đặt giờ chặn và dọn dẹp.
 *
 * Lệnh được dựng bằng `execFile` với MẢNG đối số, không qua shell: nội dung mã
 * của người dùng chỉ nằm trong một file được mount, không bao giờ nằm trên
 * dòng lệnh.
 */
@Injectable()
export class PythonRunnerService {
  private readonly logger = new Logger(PythonRunnerService.name);
  /** Số container đang chạy trong tiến trình này (xem PY_RUN_MAX_CONCURRENT). */
  private running = 0;

  constructor(private readonly config: ConfigService) {}

  async run(code: string): Promise<RunResult> {
    // Phép kiểm byte chính xác; DTO chỉ chặn sớm theo số ký tự.
    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
      throw new BadRequestException('Mã nguồn tối đa 20 KB');
    }

    const maxConcurrent = this.config.get<number>('PY_RUN_MAX_CONCURRENT') ?? 2;
    // Kiểm và tăng đếm cùng một lượt đồng bộ (không có await ở giữa) để hai
    // request đến sát nhau không cùng lọt qua ngưỡng.
    if (this.running >= maxConcurrent) {
      throw new HttpException(
        `Máy chủ đang chạy tối đa ${maxConcurrent} chương trình cùng lúc. Vui lòng thử lại sau vài giây.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.running++;

    const started = Date.now();
    let dir: string | undefined;
    try {
      dir = await mkdtemp(join(tmpdir(), 'pyrun-'));
      // `--mount` tách tham số bằng dấu phẩy: đường dẫn có dấu phẩy sẽ bị hiểu
      // thành tham số mới. Thư mục do mkdtemp sinh ra nên không xảy ra, trừ khi
      // TMP/TEMP của máy bị đặt lạ — thà từ chối còn hơn mount sai chỗ.
      if (dir.includes(',')) {
        throw new ServiceUnavailableException(
          'Thư mục tạm có dấu phẩy, không thể mount vào sandbox',
        );
      }
      // mkdtemp tạo thư mục 0700 thuộc user của Node; user không phải root
      // trong container (Linux) sẽ không đọc được nếu không mở quyền.
      await chmod(dir, 0o755);
      await writeFile(join(dir, 'main.py'), code, { mode: 0o644 });

      const name = `pyrun-${randomUUID()}`;
      const outcome = await this.runContainer(name, dir);
      return { ...outcome, durationMs: Date.now() - started };
    } finally {
      this.running--;
      if (dir) {
        // Dọn thư mục tạm kể cả khi chạy lỗi; lỗi dọn không được che lỗi gốc.
        await rm(dir, { recursive: true, force: true }).catch((e: unknown) =>
          this.logger.warn(`Không xoá được ${dir}: ${String(e)}`),
        );
      }
    }
  }

  private async runContainer(name: string, dir: string): Promise<ExecOutcome> {
    const image = this.config.get<string>('PY_SANDBOX_IMAGE') ?? 'py-sandbox';
    const timeout = this.config.get<number>('PY_RUN_TIMEOUT_MS') ?? 10_000;

    const args = [
      'run',
      '--rm',
      '--name',
      name,
      '--cpus=1',
      '--memory=1g',
      '--memory-swap=1g',
      '--pids-limit=128',
      '--network=none',
      '--read-only',
      '--tmpfs',
      '/tmp:size=64m',
      '--mount',
      `type=bind,source=${dir},target=/code,readonly`,
      image,
      'python',
      '/code/main.py',
    ];

    const outcome = await new Promise<ExecOutcome>((resolve, reject) => {
      execFile(
        'docker',
        args,
        {
          timeout,
          maxBuffer: MAX_BUFFER,
          // SIGKILL chứ không phải SIGTERM mặc định: docker CLI bắt SIGTERM để
          // chuyển tiếp cho container, có thể không chịu chết đúng giờ.
          killSignal: 'SIGKILL',
          windowsHide: true,
          encoding: 'utf8',
        },
        (error, stdout, stderr) => {
          if (!error) {
            return resolve({
              stdout,
              stderr,
              exitCode: 0,
              timedOut: false,
              outputTruncated: false,
            });
          }
          const e = error as NodeJS.ErrnoException & {
            killed?: boolean;
            code?: number | string;
          };
          // Không có docker CLI trên máy chủ: lỗi hạ tầng, không phải lỗi của mã.
          if (e.code === 'ENOENT') {
            return reject(
              new ServiceUnavailableException('Máy chủ chưa cài Docker'),
            );
          }
          const outputTruncated =
            e.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
          // Node đã giết tiến trình docker CLI: do hết giờ hoặc do tràn buffer.
          const killed = e.killed === true;
          resolve({
            stdout: stdout ?? '',
            stderr: stderr ?? '',
            exitCode: typeof e.code === 'number' ? e.code : null,
            timedOut: killed && !outputTruncated,
            outputTruncated,
          });
        },
      );
    });

    // Node chỉ giết tiến trình docker CLI; CONTAINER vẫn chạy tiếp (còn ăn CPU
    // tới khi tự thoát) nên phải bảo daemon giết nó. `--rm` sẽ xoá nó sau đó.
    if (outcome.timedOut || outcome.outputTruncated) {
      await this.killContainer(name);
    }
    return outcome;
  }

  private killContainer(name: string): Promise<void> {
    return new Promise((resolve) => {
      execFile(
        'docker',
        ['kill', name],
        { timeout: 5000, windowsHide: true },
        (error, _stdout, stderr) => {
          // Container đã tự thoát/chưa kịp tạo thì `docker kill` báo "No such
          // container" — chấp nhận được, chỉ ghi log.
          if (error) {
            this.logger.warn(
              `docker kill ${name} lỗi: ${String(stderr || error.message).trim()}`,
            );
          }
          resolve();
        },
      );
    });
  }
}
