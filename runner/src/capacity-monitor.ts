import type { DockerHostInfo } from '../../src/python-runner/sandbox/docker-sandbox';
import { checkHostCapacity } from '../../src/python-runner/sandbox/host-capacity';

/**
 * Trạng thái "máy này chịu nổi cấu hình không":
 *   - unchecked    : chưa đọc được `docker info` (Docker chưa lên) nên chưa biết;
 *   - ok           : đủ RAM;
 *   - insufficient : PY_RUN_MAX_CONCURRENT × PY_RUN_MEMORY + dự phòng > RAM của máy.
 *
 * `insufficient` là trạng thái CHỐT: runner từ chối mọi lượt chạy (503) cho tới
 * khi cấu hình được sửa và runner khởi động lại — chạy tiếp với cấu hình biết là
 * quá RAM thì kernel sẽ OOM-kill ngẫu nhiên cả các bài hợp lệ.
 */
export type CapacityStatus = 'ok' | 'unchecked' | 'insufficient';

export interface CapacityState {
  status: CapacityStatus;
  /** Chỉ có khi insufficient: nguyên văn lỗi kèm số liệu và gợi ý. */
  message?: string;
}

export interface CapacityMonitor {
  /** Trạng thái hiện có, KHÔNG đụng tới docker. */
  current(): CapacityState;
  /** Nếu còn `unchecked` thì thử đọc `docker info` (có giãn cách); đã chốt thì trả luôn. */
  refresh(): Promise<CapacityState>;
}

export interface MonitorOptions {
  /** PY_RUN_MAX_CONCURRENT */
  slots: number;
  /** PY_RUN_MEMORY đã đổi sang MiB */
  memoryMiB: number;
  readInfo: () => Promise<DockerHostInfo | null>;
  log: (message: string) => void;
  /** Giãn cách giữa hai lần thử đọc docker info lúc chạy (tránh mỗi request lại gọi docker). */
  retryAfterMs?: number;
  now?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class HostCapacityMonitor implements CapacityMonitor {
  private state: CapacityState = { status: 'unchecked' };
  private inflight: Promise<CapacityState> | null = null;
  private lastFailAt = Number.NEGATIVE_INFINITY;
  private readonly retryAfterMs: number;
  private readonly now: () => number;

  constructor(private readonly options: MonitorOptions) {
    this.retryAfterMs = options.retryAfterMs ?? 5000;
    this.now = options.now ?? Date.now;
  }

  current(): CapacityState {
    return this.state;
  }

  async refresh(): Promise<CapacityState> {
    if (this.state.status !== 'unchecked') return this.state;
    if (this.inflight) return this.inflight;
    if (this.now() - this.lastFailAt < this.retryAfterMs) return this.state;
    return this.evaluate();
  }

  /**
   * Lúc khởi động: Docker có thể chưa lên (máy vừa bật, pm2 khởi động trước
   * daemon) nên thử lại vài lần thay vì kết luận ngay. Hết lượt vẫn không đọc
   * được thì CHO PHÉP khởi động (từ chối sẽ làm pm2 lặp vòng) — việc kiểm sẽ được
   * làm lại ngay khi Docker trả lời lần đầu (refresh).
   */
  async startup(
    attempts = 5,
    delayMs = 2000,
    sleep: (ms: number) => Promise<void> = defaultSleep,
  ): Promise<CapacityState> {
    for (let i = 1; i <= attempts; i++) {
      const state = await this.evaluate(true);
      if (state.status !== 'unchecked') return state;
      if (i < attempts) await sleep(delayMs);
    }
    this.options.log(
      `CẢNH BÁO: chưa kiểm được cấu hình — \`docker info\` không trả lời sau ${attempts} lần thử cách nhau ${delayMs / 1000} giây. ` +
        'Runner vẫn khởi động; việc kiểm RAM sẽ được làm lại khi Docker trả lời lần đầu (lúc có lượt chạy hoặc khi gọi /health).',
    );
    return this.state;
  }

  private evaluate(atStartup = false): Promise<CapacityState> {
    this.inflight ??= this.read(atStartup).finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async read(atStartup: boolean): Promise<CapacityState> {
    const info = await this.options.readInfo();
    if (!info) {
      this.lastFailAt = this.now();
      return this.state;
    }

    const report = checkHostCapacity({
      slots: this.options.slots,
      memoryMiB: this.options.memoryMiB,
      ncpu: info.ncpu,
      memTotalBytes: info.memTotalBytes,
    });
    for (const w of report.warnings) this.options.log(`CẢNH BÁO: ${w}`);

    if (report.status === 'insufficient') {
      const message = report.errors.join(' ');
      this.state = { status: 'insufficient', message };
      // Lúc khởi động runner THOÁT ngay (xem main.ts); chỉ khi phát hiện muộn (Docker lên sau)
      // mới ở lại và từ chối từng lượt chạy. Câu kết phải nói đúng việc sắp xảy ra.
      const consequence = atStartup
        ? 'Runner từ chối khởi động (thoát mã 1); sửa cấu hình rồi chạy lại.'
        : 'Runner sẽ từ chối mọi lượt chạy (503) cho tới khi sửa cấu hình và khởi động lại.';
      this.options.log(`LỖI CẤU HÌNH: ${message} ${consequence}`);
    } else {
      this.state = { status: 'ok' };
    }
    return this.state;
  }
}
