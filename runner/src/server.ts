import { createHash, timingSafeEqual } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';

import {
  assertCodeSize,
  SandboxError,
  type SandboxResult,
} from '../../src/python-runner/sandbox/docker-sandbox';
import {
  QUEUE_BUSY_MESSAGE,
  QueueAbortedError,
  QueueRejectedError,
  type RunQueue,
} from '../../src/python-runner/sandbox/run-queue';
import type { CapacityMonitor } from './capacity-monitor';

/**
 * Trần dung lượng THÂN REQUEST (JSON). Mã tối đa 20 KB nhưng nằm trong JSON nên
 * có thể phình tới ~6 lần (ký tự điều khiển thành \u00XX); 256 KB đủ rộng cho
 * trường hợp xấu nhất mà vẫn chặn được kẻ gửi thân khổng lồ. Mã thật sự quá
 * 20 KB bị chặn riêng ở assertCodeSize (400).
 */
const MAX_BODY_BYTES = 256 * 1024;

export interface RunnerDeps {
  /** Khoá bí mật dùng chung với backend (đã kiểm độ dài lúc nạp cấu hình). */
  secret: string;
  /** Hàng đợi: tối đa N bài chạy cùng lúc, phần vượt xếp hàng FIFO; đầy/chờ quá hạn thì 429. */
  queue: RunQueue;
  /** Chạy một đoạn mã — bản thật là runInSandbox với image/timeout/RAM đã cấu hình. */
  run: (code: string, signal?: AbortSignal) => Promise<SandboxResult>;
  /** Máy có đủ RAM cho cấu hình không (insufficient → 503 mọi lượt chạy). */
  capacity: CapacityMonitor;
  /** Docker có chạy không (cho GET /health). */
  checkDocker: () => Promise<boolean>;
  log?: (message: string) => void;
}

export function createRunnerServer(deps: RunnerDeps): Server {
  const log = deps.log ?? (() => {});

  const server = createServer((req, res) => {
    handle(req, res, deps, log).catch((e: unknown) => {
      // Client đã ngắt giữa chừng (ví dụ đang gửi thân request): không còn ai để trả lời.
      if (res.destroyed) return;
      log(`Lỗi không lường trước: ${e instanceof Error ? e.message : String(e)}`);
      if (!res.headersSent) send(res, 500, { message: 'Lỗi nội bộ của runner' });
      else res.destroy();
    });
  });
  // Chống gửi thân request nhỏ giọt để giữ kết nối (slowloris). Chỉ tính thời
  // gian NHẬN request, không tính thời gian chạy mã.
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  return server;
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  deps: RunnerDeps,
  log: (m: string) => void,
): Promise<void> {
  const path = (req.url ?? '/').split('?')[0];

  if (path === '/health') {
    if (req.method !== 'GET') return send(res, 405, { message: 'Method Not Allowed' });
    // Không cần khoá: monitoring/Caddy hỏi được. Chỉ lộ trạng thái và số đếm, không lộ cấu hình nhạy cảm.
    const docker = await deps.checkDocker();
    // Docker vừa trả lời lần đầu thì đây là lúc kiểm RAM nếu lúc khởi động chưa kiểm được.
    const capacity = docker ? await deps.capacity.refresh() : deps.capacity.current();
    const insufficient = capacity.status === 'insufficient';
    return send(res, insufficient ? 503 : 200, {
      ok: !insufficient,
      docker,
      capacity: { status: capacity.status, ...(capacity.message ? { message: capacity.message } : {}) },
      ...deps.queue.stats(),
    });
  }

  if (path !== '/run') return send(res, 404, { message: 'Not Found' });
  if (req.method !== 'POST') return send(res, 405, { message: 'Method Not Allowed' });

  // Kiểm khoá TRƯỚC khi đọc thân: người không có khoá không được bắt máy này
  // nhận và phân tích dữ liệu của họ.
  if (!isAuthorized(req.headers.authorization, deps.secret)) {
    return send(res, 401, { message: 'Unauthorized' });
  }

  // Client ngắt kết nối trước khi ta trả lời xong (đóng/tải lại tab, backend hết giờ):
  // bài đang chờ thì rút khỏi hàng, đang chạy thì giết container. `writableFinished`
  // để phân biệt với lần đóng bình thường sau khi đã trả lời.
  const abort = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) abort.abort();
  });

  const capacity = await deps.capacity.refresh();
  if (capacity.status === 'insufficient') {
    log(`Từ chối lượt chạy (503): ${capacity.message ?? 'cấu hình RAM không đủ'}`);
    return send(res, 503, {
      message: 'Runner chưa được cấu hình đúng (không đủ RAM), xem log của runner',
    });
  }

  const raw = await readBody(req, MAX_BODY_BYTES);
  if (raw === null) {
    // Đã ngừng thu thập dữ liệu. Trả 413 rồi TIÊU THỤ-VÀ-BỎ phần còn lại thay vì
    // huỷ socket: đóng khi client còn đang gửi làm nó nhận ECONNRESET chứ không
    // thấy 413. Việc này chỉ tới được sau bước xác thực và bị chặn bởi
    // server.requestTimeout nên người không có khoá không bắt máy nhận dữ liệu thừa.
    res.setHeader('Connection', 'close');
    req.resume();
    return send(res, 413, { message: 'Thân request quá lớn' });
  }

  let code: unknown;
  try {
    code = (JSON.parse(raw) as { code?: unknown } | null)?.code;
  } catch {
    return send(res, 400, { message: 'Thân request không phải JSON hợp lệ' });
  }
  if (typeof code !== 'string' || code.length === 0) {
    return send(res, 400, { message: 'Thiếu mã nguồn (code phải là chuỗi không rỗng)' });
  }
  try {
    assertCodeSize(code);
  } catch (e) {
    return send(res, 400, { message: e instanceof Error ? e.message : 'Mã nguồn không hợp lệ' });
  }

  const source = code;
  try {
    // Còn chỗ thì chạy ngay, hết chỗ thì xếp hàng FIFO. `abort.signal` vừa rút
    // bài khỏi hàng (nếu đang chờ) vừa giết container (nếu đang chạy).
    const { value, queuedMs } = await deps.queue.run(
      (signal) => deps.run(source, signal),
      abort.signal,
    );
    log(
      `run exit=${value.exitCode} timedOut=${value.timedOut} truncated=${value.outputTruncated} queued=${queuedMs}ms ${value.durationMs}ms`,
    );
    return send(res, 200, { ...value, queuedMs });
  } catch (e) {
    // Hàng đầy hoặc chờ quá hạn: cùng một câu cho người dùng.
    if (e instanceof QueueRejectedError) {
      log(`429 ${e.reason === 'FULL' ? 'hàng đợi đầy' : 'chờ quá hạn trong hàng đợi'}`);
      return send(res, 429, { message: QUEUE_BUSY_MESSAGE });
    }
    // Client đã bỏ đi: không còn ai để trả lời; bài đã được rút khỏi hàng / container đã bị kill.
    if (
      e instanceof QueueAbortedError ||
      (e instanceof SandboxError && e.kind === 'ABORTED')
    ) {
      log('Client ngắt kết nối: bài đã bị huỷ');
      return;
    }
    if (e instanceof SandboxError) {
      log(`SandboxError ${e.kind}: ${e.message}`);
      // CODE_TOO_LARGE đã bị chặn ở trên; còn lại là hạ tầng của runner (thiếu Docker…).
      return send(res, 503, { message: e.message });
    }
    log(`Lỗi khi chạy: ${e instanceof Error ? e.message : String(e)}`);
    // Không trả chi tiết lỗi ra ngoài.
    return send(res, 500, { message: 'Lỗi nội bộ của runner' });
  }
}

/**
 * So khớp `Authorization: Bearer <khoá>` bằng timingSafeEqual.
 *
 * timingSafeEqual ném lỗi nếu hai buffer khác độ dài, mà so độ dài trước rồi
 * mới so nội dung lại lộ độ dài khoá qua thời gian phản hồi. Băm cả hai bằng
 * SHA-256 trước: luôn 32 byte nên so được mà không rò rỉ gì.
 */
export function isAuthorized(header: string | undefined, secret: string): boolean {
  const match = /^Bearer (.+)$/.exec(header ?? '');
  const given = createHash('sha256').update(match?.[1] ?? '').digest();
  const expected = createHash('sha256').update(secret).digest();
  // `match` vẫn được xét SAU phép so để mọi nhánh đều tốn cùng một lượt so sánh.
  return timingSafeEqual(given, expected) && match !== null;
}

/** Đọc thân tới `limit` byte; vượt thì trả null và bỏ phần dữ liệu còn lại (không giữ trong bộ nhớ). */
function readBody(req: IncomingMessage, limit: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    req.on('data', (chunk: Buffer) => {
      if (done) return;
      size += chunk.length;
      if (size > limit) {
        done = true;
        chunks.length = 0; // giải phóng ngay phần đã gom
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!done) resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', (e) => {
      if (!done) reject(e);
    });
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}
