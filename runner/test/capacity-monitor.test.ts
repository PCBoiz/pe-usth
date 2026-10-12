import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DockerHostInfo } from '../../src/python-runner/sandbox/docker-sandbox';
import { HostCapacityMonitor } from '../src/capacity-monitor';

const GIB = 1024 ** 3;

/** `docker info` giả: trả lần lượt các giá trị trong `script` (null = Docker chưa trả lời). */
function makeMonitor(
  script: Array<DockerHostInfo | null>,
  over: { slots?: number; memoryMiB?: number; now?: () => number } = {},
) {
  const logs: string[] = [];
  let reads = 0;
  const monitor = new HostCapacityMonitor({
    slots: over.slots ?? 4,
    memoryMiB: over.memoryMiB ?? 1536,
    readInfo: async () => {
      const value = script[Math.min(reads, script.length - 1)];
      reads++;
      return value;
    },
    log: (m) => logs.push(m),
    now: over.now,
  });
  return { monitor, logs, reads: () => reads };
}

const noSleep = async () => {};
const BIG: DockerHostInfo = { ncpu: 4, memTotalBytes: 8 * GIB };
const SMALL: DockerHostInfo = { ncpu: 4, memTotalBytes: 4 * GIB };

describe('HostCapacityMonitor.startup', () => {
  it('Docker trả lời và đủ RAM → ok, không cảnh báo', async () => {
    const { monitor, logs } = makeMonitor([BIG]);
    assert.deepEqual(await monitor.startup(5, 2000, noSleep), { status: 'ok' });
    assert.deepEqual(logs, []);
  });

  it('thiếu RAM → insufficient, log nêu RÕ số liệu và gợi ý', async () => {
    const { monitor, logs } = makeMonitor([SMALL]);
    const state = await monitor.startup(5, 2000, noSleep);
    assert.equal(state.status, 'insufficient');
    const text = logs.join('\n');
    assert.match(text, /PY_RUN_MAX_CONCURRENT=4/);
    assert.match(text, /PY_RUN_MEMORY=1536m/);
    assert.match(text, /7\.5 GiB/);
    assert.match(text, /4\.0 GiB/);
    assert.match(text, /giảm PY_RUN_MAX_CONCURRENT xuống tối đa 1/);
    assert.match(text, /từ chối khởi động/); // lúc khởi động: thoát, không phải "từ chối từng lượt"
    assert.doesNotMatch(text, /từ chối mọi lượt chạy/);
  });

  it('Docker chưa lên: thử lại ĐÚNG 5 lần, cách nhau 2 giây, rồi vẫn khởi động kèm cảnh báo', async () => {
    const sleeps: number[] = [];
    const { monitor, logs, reads } = makeMonitor([null]);
    const state = await monitor.startup(5, 2000, async (ms) => {
      sleeps.push(ms);
    });
    assert.equal(state.status, 'unchecked');
    assert.equal(reads(), 5);
    assert.deepEqual(sleeps, [2000, 2000, 2000, 2000]); // giữa 5 lần = 4 quãng nghỉ
    assert.equal(logs.length, 1);
    assert.match(logs[0], /chưa kiểm được cấu hình/);
  });

  it('Docker lên giữa chừng (lần thứ 3) → dừng thử và kết luận ngay', async () => {
    const { monitor, reads } = makeMonitor([null, null, BIG]);
    assert.equal((await monitor.startup(5, 2000, noSleep)).status, 'ok');
    assert.equal(reads(), 3);
  });

  it('cảnh báo CPU (slots > 1.5 × nhân) được log nhưng vẫn ok', async () => {
    const { monitor, logs } = makeMonitor([{ ncpu: 2, memTotalBytes: 32 * GIB }], {
      slots: 4,
      memoryMiB: 512,
    });
    assert.equal((await monitor.startup(5, 2000, noSleep)).status, 'ok');
    assert.match(logs.join('\n'), /CẢNH BÁO: PY_RUN_MAX_CONCURRENT=4/);
  });
});

describe('HostCapacityMonitor.refresh (kiểm lại lúc chạy)', () => {
  it('đang unchecked: refresh gọi docker info; thiếu RAM thì chốt insufficient và log số liệu', async () => {
    let t = 0;
    const { monitor, logs } = makeMonitor([null, SMALL], { now: () => t });
    await monitor.startup(1, 0, noSleep); // Docker chưa lên
    assert.equal(monitor.current().status, 'unchecked');

    t += 6000; // qua khoảng giãn cách
    const state = await monitor.refresh();
    assert.equal(state.status, 'insufficient');
    assert.match(state.message ?? '', /Không đủ RAM/);
    assert.match(logs.join('\n'), /LỖI CẤU HÌNH/);
    assert.match(logs.join('\n'), /từ chối mọi lượt chạy \(503\)/); // phát hiện muộn: ở lại và từ chối từng lượt
  });

  it('insufficient là trạng thái CHỐT: không đọc docker info lại, kể cả khi RAM tăng sau đó', async () => {
    let t = 0;
    const { monitor, reads } = makeMonitor([SMALL, BIG], { now: () => t });
    await monitor.startup(1, 0, noSleep);
    const before = reads();
    t += 60_000;
    assert.equal((await monitor.refresh()).status, 'insufficient');
    assert.equal(reads(), before); // phải khởi động lại runner mới được kiểm lại
  });

  it('ok cũng chốt: không gọi docker info ở mỗi request', async () => {
    const { monitor, reads } = makeMonitor([BIG]);
    await monitor.startup(1, 0, noSleep);
    for (let i = 0; i < 20; i++) await monitor.refresh();
    assert.equal(reads(), 1);
  });

  it('Docker vẫn tắt: giãn cách ≥ 5 giây giữa hai lần thử, không gọi docker mỗi request', async () => {
    let t = 0;
    const { monitor, reads } = makeMonitor([null], { now: () => t });
    await monitor.startup(1, 0, noSleep); // 1 lần
    assert.equal(reads(), 1);
    for (let i = 0; i < 10; i++) await monitor.refresh(); // t không đổi
    assert.equal(reads(), 1);
    t += 5001;
    await monitor.refresh();
    assert.equal(reads(), 2);
  });

  it('nhiều request cùng lúc chỉ gây MỘT lần đọc docker info', async () => {
    let t = 0;
    const { monitor, reads } = makeMonitor([null, BIG], { now: () => t });
    await monitor.startup(1, 0, noSleep);
    t += 10_000;
    const states = await Promise.all(Array.from({ length: 10 }, () => monitor.refresh()));
    assert.equal(reads(), 2); // 1 lúc khởi động + 1 chung cho cả 10 request
    assert.ok(states.every((s) => s.status === 'ok'));
  });

  it('Docker lên (ok) sau khi khởi động unchecked → từ đó cho chạy bình thường', async () => {
    let t = 0;
    const { monitor } = makeMonitor([null, BIG], { now: () => t });
    await monitor.startup(1, 0, noSleep);
    t += 6000;
    assert.equal((await monitor.refresh()).status, 'ok');
    assert.equal(monitor.current().status, 'ok');
  });
});
