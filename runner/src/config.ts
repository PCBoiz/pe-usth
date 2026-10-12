import { parseMemory } from '../../src/python-runner/sandbox/host-capacity';

/**
 * Đọc và kiểm tra cấu hình runner từ biến môi trường. Sai thì báo MỌI lỗi một
 * lượt rồi dừng — runner chạy với khoá yếu hay cổng sai còn tệ hơn không chạy.
 */
export interface RunnerConfig {
  secret: string;
  host: string;
  port: number;
  image: string;
  timeoutMs: number;
  /** PY_RUN_MAX_CONCURRENT: số bài chạy cùng lúc. */
  maxConcurrent: number;
  /** PY_RUN_MEMORY đã chuẩn hoá, dùng cho --memory và --memory-swap (vd "1536m"). */
  memory: string;
  memoryMiB: number;
  /** PY_RUN_QUEUE_MAX: số bài tối đa được xếp hàng; đầy thì 429. */
  queueMax: number;
  /** PY_RUN_QUEUE_TIMEOUT_MS: chờ quá lâu chưa tới lượt thì 429. */
  queueTimeoutMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv): RunnerConfig {
  const errors: string[] = [];

  const int = (name: string, fallback: number, min: number, max: number): number => {
    const raw = env[name]?.trim();
    if (!raw) return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) {
      errors.push(`${name} phải là số nguyên trong [${min}, ${max}] (đang là "${raw}")`);
      return fallback;
    }
    return n;
  };

  const secret = env.RUNNER_SECRET?.trim() ?? '';
  if (secret.length < 32) {
    errors.push(
      'RUNNER_SECRET bắt buộc và tối thiểu 32 ký tự ' +
        '(sinh bằng: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")',
    );
  }

  let memory = { mib: 1024, flag: '1g' };
  const rawMemory = env.PY_RUN_MEMORY?.trim();
  if (rawMemory) {
    try {
      memory = parseMemory(rawMemory);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  const config: RunnerConfig = {
    secret,
    host: env.HOST?.trim() || '127.0.0.1',
    port: int('PORT', 8080, 1, 65535),
    image: env.PY_SANDBOX_IMAGE?.trim() || 'py-sandbox',
    timeoutMs: int('PY_RUN_TIMEOUT_MS', 10_000, 1000, 60_000),
    maxConcurrent: int('PY_RUN_MAX_CONCURRENT', 1, 1, 64),
    memory: memory.flag,
    memoryMiB: memory.mib,
    queueMax: int('PY_RUN_QUEUE_MAX', 100, 0, 10_000),
    queueTimeoutMs: int('PY_RUN_QUEUE_TIMEOUT_MS', 30_000, 1000, 300_000),
  };

  if (errors.length) {
    throw new Error(`Cấu hình runner không hợp lệ:\n - ${errors.join('\n - ')}`);
  }
  return config;
}
