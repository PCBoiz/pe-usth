import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';

import {
  SandboxError,
  type SandboxResult,
} from '../../src/python-runner/sandbox/docker-sandbox';
import { RunQueue } from '../../src/python-runner/sandbox/run-queue';
import type { CapacityMonitor, CapacityState } from '../src/capacity-monitor';
import { createRunnerServer, isAuthorized } from '../src/server';

const SECRET = 'k'.repeat(32);
const OK: SandboxResult = {
  stdout: '2\n',
  stderr: '',
  exitCode: 0,
  timedOut: false,
  outputTruncated: false,
  durationMs: 300,
};
const BUSY = 'Máy chủ đang quá tải, thử lại sau';

type Deps = Parameters<typeof createRunnerServer>[0];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function capacityOf(state: CapacityState): CapacityMonitor {
  return { current: () => state, refresh: async () => state };
}

/** Dựng server thật trên cổng tự chọn; `run` là bản giả để khỏi cần Docker. */
async function start(
  overrides: Partial<Deps> & {
    slots?: number;
    queueMax?: number;
    queueTimeoutMs?: number;
  } = {},
) {
  const { slots = 1, queueMax = 100, queueTimeoutMs = 30_000, ...rest } = overrides;
  const calls: string[] = [];
  const server = createRunnerServer({
    secret: SECRET,
    queue: new RunQueue({ slots, queueMax, queueTimeoutMs }),
    capacity: capacityOf({ status: 'ok' }),
    run: async (code) => {
      calls.push(code);
      return OK;
    },
    checkDocker: async () => true,
    ...rest,
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    base,
    calls,
    close: () => {
      server.closeAllConnections();
      return new Promise<void>((r) => server.close(() => r()));
    },
    post: (body: unknown, key: string | null = SECRET, signal?: AbortSignal) =>
      fetch(`${base}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key === null ? {} : { Authorization: `Bearer ${key}` }),
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
        signal,
      }),
  };
}

describe('GET /health', () => {
  it('không cần khoá; báo ok, docker và số chỗ / đang chạy / đang chờ', async () => {
    const s = await start({ slots: 4, queueMax: 50 });
    const res = await fetch(`${s.base}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      ok: true,
      docker: true,
      capacity: { status: 'ok' },
      slots: 4,
      running: 0,
      queued: 0,
      queueMax: 50,
    });
    await s.close();
  });

  it('Docker không chạy → ok:true docker:false (runner vẫn sống), 200', async () => {
    const s = await start({
      checkDocker: async () => false,
      capacity: capacityOf({ status: 'unchecked' }),
    });
    const res = await fetch(`${s.base}/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean; docker: boolean; capacity: { status: string } };
    assert.equal(body.ok, true);
    assert.equal(body.docker, false);
    assert.equal(body.capacity.status, 'unchecked');
    await s.close();
  });

  it('thiếu RAM → 503, ok:false, kèm lý do', async () => {
    const s = await start({
      capacity: capacityOf({ status: 'insufficient', message: 'Không đủ RAM: 4 × 1536m…' }),
    });
    const res = await fetch(`${s.base}/health`);
    assert.equal(res.status, 503);
    const body = (await res.json()) as {
      ok: boolean;
      capacity: { status: string; message: string };
    };
    assert.equal(body.ok, false);
    assert.equal(body.capacity.status, 'insufficient');
    assert.match(body.capacity.message, /Không đủ RAM/);
    await s.close();
  });

  it('phản ánh hàng đợi đang có: running và queued theo thời gian thực', async () => {
    const releases: Array<() => void> = [];
    const s = await start({
      slots: 1,
      run: () =>
        new Promise<SandboxResult>((resolve) => releases.push(() => resolve(OK))),
    });
    const a = s.post({ code: 'a' });
    const b = s.post({ code: 'b' });
    const c = s.post({ code: 'c' });
    await sleep(80);
    const health = (await (await fetch(`${s.base}/health`)).json()) as {
      running: number;
      queued: number;
    };
    assert.equal(health.running, 1);
    assert.equal(health.queued, 2);
    while (releases.length < 3) {
      releases.shift()?.();
      await sleep(30);
      if (releases.length === 0) break;
    }
    releases.forEach((r) => r());
    await Promise.all([a, b, c].map((p) => p.then((r) => r.text()).catch(() => '')));
    await s.close();
  });
});

describe('POST /run — xác thực', () => {
  let s: Awaited<ReturnType<typeof start>>;
  before(async () => {
    s = await start();
  });
  after(() => s.close());

  it('thiếu Authorization → 401 và KHÔNG chạy mã', async () => {
    const res = await s.post({ code: 'print(1)' }, null);
    assert.equal(res.status, 401);
    assert.equal(s.calls.length, 0);
  });

  it('khoá sai (cùng độ dài, khác độ dài, rỗng) → 401', async () => {
    for (const key of ['x'.repeat(32), 'x'.repeat(5), 'x'.repeat(500), ' ']) {
      const res = await s.post({ code: 'print(1)' }, key);
      assert.equal(res.status, 401, `khoá "${key.slice(0, 8)}…"`);
    }
    assert.equal(s.calls.length, 0);
  });

  it('sai scheme (Basic …) → 401', async () => {
    const res = await fetch(`${s.base}/run`, {
      method: 'POST',
      headers: { Authorization: `Basic ${SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'print(1)' }),
    });
    assert.equal(res.status, 401);
  });

  it('khoá đúng → 200, trả RunResult kèm queuedMs', async () => {
    const res = await s.post({ code: 'print(1+1)' });
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.deepEqual({ ...body, queuedMs: 0 }, { ...OK, queuedMs: 0 });
    assert.equal(typeof body.queuedMs, 'number');
    assert.deepEqual(s.calls, ['print(1+1)']);
  });

  it('isAuthorized so khớp đúng và không ném lỗi khi độ dài khác nhau', () => {
    assert.equal(isAuthorized(`Bearer ${SECRET}`, SECRET), true);
    assert.equal(isAuthorized(`Bearer ${SECRET}x`, SECRET), false);
    assert.equal(isAuthorized('Bearer ', SECRET), false);
    assert.equal(isAuthorized(undefined, SECRET), false);
    // khoá rỗng ở cấu hình KHÔNG được coi là "ai cũng qua"
    assert.equal(isAuthorized(undefined, ''), false);
  });
});

describe('POST /run — kiểm tra đầu vào', () => {
  let s: Awaited<ReturnType<typeof start>>;
  before(async () => {
    s = await start();
  });
  after(() => s.close());

  it('JSON hỏng → 400', async () => {
    assert.equal((await s.post('{không phải json')).status, 400);
  });

  it('thiếu code / không phải chuỗi / rỗng → 400', async () => {
    for (const body of [{}, { code: 5 }, { code: null }, { code: '' }]) {
      assert.equal((await s.post(body)).status, 400, JSON.stringify(body));
    }
    assert.equal(s.calls.length, 0);
  });

  it('mã đúng 20 KB chạy được; hơn 20 KB (đếm BYTE) → 400', async () => {
    assert.equal((await s.post({ code: '#' + 'a'.repeat(20 * 1024 - 1) })).status, 200);
    // 7000 ký tự × 3 byte = 21000 byte
    assert.equal((await s.post({ code: 'ệ'.repeat(7000) })).status, 400);
  });

  it('thân request khổng lồ → 413, và vẫn nhận được phản hồi', async () => {
    const res = await s.post({ code: 'a'.repeat(2 * 1024 * 1024) });
    assert.equal(res.status, 413);
  });

  it('đường dẫn lạ → 404; sai method → 405', async () => {
    assert.equal((await fetch(`${s.base}/nope`)).status, 404);
    assert.equal((await fetch(`${s.base}/run`)).status, 405);
  });
});

describe('POST /run — hàng đợi', { timeout: 15_000 }, () => {
  it('hết chỗ thì XẾP HÀNG và chạy theo thứ tự đến; queuedMs phản ánh thời gian chờ', async () => {
    const order: string[] = [];
    const releases = new Map<string, () => void>();
    const s = await start({
      slots: 1,
      run: (code) => {
        order.push(code);
        return new Promise<SandboxResult>((resolve) => {
          releases.set(code, () => resolve(OK));
        });
      },
    });

    const a = s.post({ code: 'a' });
    await sleep(40);
    const b = s.post({ code: 'b' });
    await sleep(40);
    const c = s.post({ code: 'c' });
    await sleep(40);
    assert.deepEqual(order, ['a']); // b, c đang chờ — KHÔNG bị 429

    await sleep(120);
    releases.get('a')!();
    await sleep(60);
    assert.deepEqual(order, ['a', 'b']);
    releases.get('b')!();
    await sleep(60);
    assert.deepEqual(order, ['a', 'b', 'c']);
    releases.get('c')!();

    const results = await Promise.all(
      [a, b, c].map(async (p) => {
        const res = await p;
        return { status: res.status, body: (await res.json()) as { queuedMs: number } };
      }),
    );
    assert.deepEqual(
      results.map((r) => r.status),
      [200, 200, 200],
    );
    assert.equal(results[0].body.queuedMs < 30, true, 'a chạy ngay');
    assert.equal(results[1].body.queuedMs >= 100, true, `b chờ a: ${results[1].body.queuedMs}ms`);
    assert.equal(results[2].body.queuedMs >= results[1].body.queuedMs, true, 'c chờ lâu hơn b');
    await s.close();
  });

  it('hàng đầy → 429 "Máy chủ đang quá tải" ngay, bài đó không chạy', async () => {
    const releases: Array<() => void> = [];
    const s = await start({
      slots: 1,
      queueMax: 1,
      run: (code) => {
        s.calls.push(code);
        return new Promise<SandboxResult>((resolve) => releases.push(() => resolve(OK)));
      },
    });
    const a = s.post({ code: 'a' });
    await sleep(40);
    const b = s.post({ code: 'b' }); // chiếm chỗ duy nhất trong hàng
    await sleep(40);
    const c = await s.post({ code: 'c' });
    assert.equal(c.status, 429);
    assert.deepEqual(await c.json(), { message: BUSY });
    assert.deepEqual(s.calls, ['a']);

    releases[0]();
    await a;
    await sleep(40);
    releases[1]();
    await b;
    assert.deepEqual(s.calls, ['a', 'b']);
    await s.close();
  });

  it('chờ quá PY_RUN_QUEUE_TIMEOUT_MS → rút khỏi hàng, 429 cùng thông điệp, không chạy', async () => {
    let release: () => void = () => {};
    const s = await start({
      slots: 1,
      queueTimeoutMs: 150,
      run: (code) => {
        s.calls.push(code);
        return new Promise<SandboxResult>((resolve) => {
          release = () => resolve(OK);
        });
      },
    });
    const a = s.post({ code: 'a' });
    await sleep(40);
    const started = Date.now();
    const b = await s.post({ code: 'b' });
    assert.equal(b.status, 429);
    assert.deepEqual(await b.json(), { message: BUSY });
    const waited = Date.now() - started;
    assert.equal(waited >= 120 && waited < 1500, true, `chờ ~150ms, thực tế ${waited}ms`);

    release();
    await a;
    await sleep(60);
    assert.deepEqual(s.calls, ['a'], 'bài hết hạn không chạy muộn');
    await s.close();
  });

  it('client ngắt khi bài đang CHỜ → bài không bao giờ chạy và rời khỏi hàng', async () => {
    let release: () => void = () => {};
    const s = await start({
      slots: 1,
      run: (code) => {
        s.calls.push(code);
        return new Promise<SandboxResult>((resolve) => {
          release = () => resolve(OK);
        });
      },
    });
    const a = s.post({ code: 'a' });
    await sleep(40);

    const client = new AbortController();
    const b = s.post({ code: 'b', }, SECRET, client.signal).catch((e: unknown) => e);
    await sleep(60);
    assert.equal(((await (await fetch(`${s.base}/health`)).json()) as { queued: number }).queued, 1);

    client.abort(); // tab đóng / backend hết giờ
    await b;
    await sleep(80);
    assert.equal(((await (await fetch(`${s.base}/health`)).json()) as { queued: number }).queued, 0);

    release();
    await a;
    await sleep(60);
    assert.deepEqual(s.calls, ['a'], 'bài của client đã ngắt không được chạy');
    await s.close();
  });

  it('client ngắt khi bài đang CHẠY → run() nhận signal bị huỷ (để kill container), chỗ nhả ra', async () => {
    let seen: AbortSignal | undefined;
    let hang = true;
    const s = await start({
      slots: 1,
      run: (code, signal) => {
        s.calls.push(code);
        if (!hang) return Promise.resolve(OK); // bài sau: chạy xong ngay
        seen = signal;
        return new Promise<SandboxResult>((resolve) => {
          // như docker-sandbox thật: signal bị huỷ thì container bị kill và `docker run` kết thúc
          signal?.addEventListener('abort', () => resolve({ ...OK, exitCode: 137 }));
        });
      },
    });
    const client = new AbortController();
    const a = s.post({ code: 'while True: pass' }, SECRET, client.signal).catch((e: unknown) => e);
    await sleep(60);
    assert.equal(seen?.aborted, false);
    assert.equal(((await (await fetch(`${s.base}/health`)).json()) as { running: number }).running, 1);

    client.abort();
    await a;
    await sleep(100);
    assert.equal(seen?.aborted, true);
    assert.equal(((await (await fetch(`${s.base}/health`)).json()) as { running: number }).running, 0);

    // chỗ đã nhả: bài sau chạy được ngay
    hang = false;
    const next = await s.post({ code: 'print(1)' });
    assert.equal(next.status, 200);
    await s.close();
  });

  it('chạy lỗi vẫn nhả chỗ (không kẹt hàng đợi)', async () => {
    let n = 0;
    const s = await start({
      slots: 1,
      run: async () => {
        if (n++ === 0) throw new Error('boom');
        return OK;
      },
    });
    assert.equal((await s.post({ code: 'x' })).status, 500);
    assert.equal((await s.post({ code: 'x' })).status, 200);
    await s.close();
  });

  it('nhiều chỗ chạy song song: 4 bài cùng lúc không phải xếp hàng', async () => {
    const releases: Array<() => void> = [];
    const s = await start({
      slots: 4,
      run: () => new Promise<SandboxResult>((resolve) => releases.push(() => resolve(OK))),
    });
    const all = Array.from({ length: 5 }, (_, i) => s.post({ code: `p${i}` }));
    await sleep(80);
    assert.equal(releases.length, 4, '4 bài chạy ngay, bài thứ 5 chờ');
    releases.splice(0).forEach((r) => r());
    await sleep(60);
    assert.equal(releases.length, 1);
    releases.splice(0).forEach((r) => r());
    const statuses = await Promise.all(all.map(async (p) => (await p).status));
    assert.deepEqual(statuses, [200, 200, 200, 200, 200]);
    await s.close();
  });
});

describe('POST /run — cấu hình máy không đủ RAM', () => {
  it('capacity insufficient → 503 cho MỌI lượt chạy, không chạy mã, không đụng hàng đợi', async () => {
    const logs: string[] = [];
    const s = await start({
      capacity: capacityOf({
        status: 'insufficient',
        message: 'Không đủ RAM: PY_RUN_MAX_CONCURRENT=4 × PY_RUN_MEMORY=1536m = 6.0 GiB…',
      }),
      log: (m) => logs.push(m),
    });
    for (let i = 0; i < 3; i++) {
      const res = await s.post({ code: 'print(1)' });
      assert.equal(res.status, 503);
      assert.match(((await res.json()) as { message: string }).message, /không đủ RAM/);
    }
    assert.equal(s.calls.length, 0);
    // log nêu rõ số liệu
    assert.equal(logs.some((l) => l.includes('PY_RUN_MAX_CONCURRENT=4') && l.includes('6.0 GiB')), true);
    await s.close();
  });

  it('khoá sai vẫn là 401 (kiểm khoá đi trước, không lộ trạng thái cho người lạ)', async () => {
    const s = await start({ capacity: capacityOf({ status: 'insufficient', message: 'x' }) });
    assert.equal((await s.post({ code: 'x' }, 'sai'.repeat(20))).status, 401);
    await s.close();
  });

  it('unchecked → gặp lượt chạy đầu tiên thì kiểm lại; thiếu RAM thì từ chối từ lượt đó', async () => {
    let state: CapacityState = { status: 'unchecked' };
    let refreshes = 0;
    const s = await start({
      capacity: {
        current: () => state,
        refresh: async () => {
          refreshes++;
          // Docker "vừa lên": lần refresh đầu cho thấy cấu hình vượt RAM
          state = { status: 'insufficient', message: 'Không đủ RAM (đo lúc chạy)' };
          return state;
        },
      },
    });
    const res = await s.post({ code: 'print(1)' });
    assert.equal(res.status, 503);
    assert.equal(refreshes, 1);
    assert.equal(s.calls.length, 0);
    await s.close();
  });
});

describe('POST /run — lỗi hạ tầng', () => {
  it('thiếu Docker (SandboxError) → 503 kèm thông điệp', async () => {
    const s = await start({
      run: async () => {
        throw new SandboxError('DOCKER_MISSING', 'Máy chủ chưa cài Docker');
      },
    });
    const res = await s.post({ code: 'x' });
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { message: 'Máy chủ chưa cài Docker' });
    await s.close();
  });

  it('lỗi lạ → 500 và KHÔNG lộ chi tiết lỗi ra ngoài', async () => {
    const s = await start({
      run: async () => {
        throw new Error('đường dẫn nội bộ /srv/secret/xyz');
      },
    });
    const res = await s.post({ code: 'x' });
    assert.equal(res.status, 500);
    assert.doesNotMatch(await res.text(), /secret|xyz/);
    await s.close();
  });
});
