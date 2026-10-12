import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadConfig } from '../src/config';

const SECRET = 'k'.repeat(32);

describe('loadConfig', () => {
  it('mặc định an toàn: nghe 127.0.0.1:8080, đồng thời 1, RAM 1g, hàng đợi 100 / 30 giây', () => {
    const c = loadConfig({ RUNNER_SECRET: SECRET });
    assert.deepEqual(c, {
      secret: SECRET,
      host: '127.0.0.1',
      port: 8080,
      image: 'py-sandbox',
      timeoutMs: 10_000,
      maxConcurrent: 1,
      memory: '1g',
      memoryMiB: 1024,
      queueMax: 100,
      queueTimeoutMs: 30_000,
    });
  });

  it('chép nguyên .env.example (các dòng có giá trị trống) vẫn nạp được', () => {
    const c = loadConfig({
      RUNNER_SECRET: SECRET,
      HOST: '',
      PORT: '',
      PY_RUN_MAX_CONCURRENT: '',
      PY_RUN_MEMORY: '',
      PY_RUN_QUEUE_MAX: '',
      PY_RUN_QUEUE_TIMEOUT_MS: '',
    });
    assert.equal(c.host, '127.0.0.1');
    assert.equal(c.port, 8080);
    assert.equal(c.memory, '1g');
    assert.equal(c.queueMax, 100);
  });

  it('thiếu RUNNER_SECRET hoặc ngắn hơn 32 ký tự → từ chối', () => {
    assert.throws(() => loadConfig({}), /RUNNER_SECRET/);
    assert.throws(() => loadConfig({ RUNNER_SECRET: 'k'.repeat(31) }), /RUNNER_SECRET/);
  });

  it('khoá toàn khoảng trắng không được tính là đủ dài', () => {
    assert.throws(() => loadConfig({ RUNNER_SECRET: ' '.repeat(40) }), /RUNNER_SECRET/);
  });

  it('số sai (chữ, ngoài khoảng, số lẻ) → từ chối và báo MỌI lỗi một lượt', () => {
    assert.throws(
      () =>
        loadConfig({
          RUNNER_SECRET: SECRET,
          PORT: 'abc',
          PY_RUN_MAX_CONCURRENT: '0',
          PY_RUN_TIMEOUT_MS: '5.5',
          PY_RUN_QUEUE_MAX: '-3',
        }),
      (e: Error) =>
        /PORT/.test(e.message) &&
        /PY_RUN_MAX_CONCURRENT/.test(e.message) &&
        /PY_RUN_TIMEOUT_MS/.test(e.message) &&
        /PY_RUN_QUEUE_MAX/.test(e.message),
    );
  });

  it('đọc đúng giá trị tuỳ chỉnh (ví dụ VM 4 nhân, 8 GB: 4 bài × 1.5g)', () => {
    const c = loadConfig({
      RUNNER_SECRET: SECRET,
      HOST: '0.0.0.0',
      PORT: '9000',
      PY_SANDBOX_IMAGE: 'my-img',
      PY_RUN_TIMEOUT_MS: '5000',
      PY_RUN_MAX_CONCURRENT: '4',
      PY_RUN_MEMORY: '1.5g',
      PY_RUN_QUEUE_MAX: '50',
      PY_RUN_QUEUE_TIMEOUT_MS: '20000',
    });
    assert.deepEqual(
      [c.host, c.port, c.image, c.timeoutMs, c.maxConcurrent, c.memory, c.memoryMiB, c.queueMax, c.queueTimeoutMs],
      ['0.0.0.0', 9000, 'my-img', 5000, 4, '1536m', 1536, 50, 20_000],
    );
  });

  it('PY_RUN_MEMORY nhận 1536m và 1.5g như nhau', () => {
    const a = loadConfig({ RUNNER_SECRET: SECRET, PY_RUN_MEMORY: '1536m' });
    const b = loadConfig({ RUNNER_SECRET: SECRET, PY_RUN_MEMORY: '1.5g' });
    assert.equal(a.memory, '1536m');
    assert.equal(b.memory, '1536m');
  });

  it('PY_RUN_MEMORY sai (thiếu đơn vị, quá nhỏ) → từ chối', () => {
    assert.throws(() => loadConfig({ RUNNER_SECRET: SECRET, PY_RUN_MEMORY: '1024' }), /PY_RUN_MEMORY/);
    assert.throws(() => loadConfig({ RUNNER_SECRET: SECRET, PY_RUN_MEMORY: '16m' }), /PY_RUN_MEMORY/);
  });

  it('PY_RUN_QUEUE_MAX = 0 hợp lệ (tắt xếp hàng)', () => {
    assert.equal(loadConfig({ RUNNER_SECRET: SECRET, PY_RUN_QUEUE_MAX: '0' }).queueMax, 0);
  });
});
