import {
  isDockerAvailable,
  readDockerInfo,
  runInSandbox,
} from '../../src/python-runner/sandbox/docker-sandbox';
import { RunQueue } from '../../src/python-runner/sandbox/run-queue';
import { HostCapacityMonitor } from './capacity-monitor';
import { loadConfig, type RunnerConfig } from './config';
import { createRunnerServer } from './server';

const log = (message: string) => console.log(`${new Date().toISOString()} ${message}`);

async function main(): Promise<void> {
  let config: RunnerConfig;
  try {
    config = loadConfig(process.env);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const capacity = new HostCapacityMonitor({
    slots: config.maxConcurrent,
    memoryMiB: config.memoryMiB,
    readInfo: () => readDockerInfo(),
    log,
  });

  // Kiểm cấu hình TRƯỚC khi nhận request: đọc NCPU/MemTotal từ `docker info` (máy
  // thật chạy container, kể cả Docker Desktop/WSL2). Thiếu RAM thì từ chối khởi
  // động ngay — chạy rồi để kernel OOM-kill ngẫu nhiên còn tệ hơn.
  const state = await capacity.startup();
  if (state.status === 'insufficient') {
    // monitor đã in số liệu + gợi ý; thoát mã 1 để pm2 không tưởng là đã chạy ổn.
    process.exit(1);
  }

  const queue = new RunQueue({
    slots: config.maxConcurrent,
    queueMax: config.queueMax,
    queueTimeoutMs: config.queueTimeoutMs,
  });

  const server = createRunnerServer({
    secret: config.secret,
    queue,
    capacity,
    run: (code, signal) =>
      runInSandbox(code, {
        image: config.image,
        timeoutMs: config.timeoutMs,
        memory: config.memory,
        signal,
        onWarn: log,
      }),
    checkDocker: () => isDockerAvailable(),
    log,
  });

  server.listen(config.port, config.host, () => {
    log(
      `Runner nghe tại http://${config.host}:${config.port} — image=${config.image} timeout=${config.timeoutMs}ms ` +
        `đồng thời=${config.maxConcurrent} RAM/bài=${config.memory} hàng đợi=${config.queueMax} (chờ tối đa ${config.queueTimeoutMs}ms)`,
    );
    if (config.host === '0.0.0.0') {
      log('CẢNH BÁO: HOST=0.0.0.0 mở runner ra mọi giao diện mạng; nên để 127.0.0.1 và đặt Caddy phía trước.');
    }
  });

  // Tắt êm: ngừng nhận kết nối mới, để các lượt đang chạy xong (pm2 chờ kill_timeout).
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      log(`Nhận ${signal}, đang tắt…`);
      server.close(() => process.exit(0));
    });
  }
}

void main();
