/**
 * "Xem từng bước" chạy bằng Pyodide trong trình duyệt, thay đường
 * POST /api/python/trace → container Docker ở backend.
 *
 * Bộ ghi vết là CHÍNH `src/python-runner/tracer/pe_tracer.py`: một lượt
 * `node scripts/build-tracer-source.mjs` sinh ra cả bản nhúng cho backend
 * (`tracer-source.ts`) lẫn bản phục vụ tĩnh cho trình duyệt
 * (`/static/py/pe_tracer.min.py`). Hợp đồng JSON v1 giữ nguyên, nên
 * `frontend/src/lib/trace.ts` không phải đổi một dòng nào.
 *
 * Đo trước khi làm, trong Pyodide 314.0.7 thật: tracer chậm hơn CPython native
 * 2,1–3,3×, ca xấu nhất 86 ms — trong khi thứ nó thay thế là 200–600 ms khởi
 * động container. Vết sinh ra giống hệt từng byte.
 *
 * DÙNG CHUNG worker với nút Chạy (`sharedIdeWorker()` trong `ide-runner.ts`).
 * Bản đầu giữ worker riêng, và soi DevTools thấy ngay cái giá: `pyodide.asm.wasm`
 * 9,2 MB bị tải HAI lần, hai runtime cùng nằm trong bộ nhớ máy học viên.
 */
import { dropIdeWorker, sharedIdeWorker } from '@/lib/ide-runner';
import type { TraceDocument, TraceRunInfo } from '@/lib/trace';

export type IdeTraceResult = { trace: TraceDocument; run: TraceRunInfo };

/** Lỗi HẠ TẦNG (không nạp được runtime/bộ ghi vết) — khác lỗi trong mã người học. */
export class IdeTraceError extends Error {}

/**
 * Dài hơn `timeBudgetMs` 6 500 ms của chính tracer, cộng chỗ cho lần nạp runtime
 * đầu tiên (~2 giây). Tracer TỰ dừng ở 6,5 giây và vẫn in ra vết đã ghi được —
 * nên cái hẹn này chỉ để bắt trường hợp tracer không trả lời được nữa, và nó
 * phải thua cuộc trong mọi tình huống bình thường. Đặt ngắn hơn 6,5 giây là
 * cướp mất vết một phần mà học viên lẽ ra đã được xem.
 */
const TIMEOUT_MS = 20_000;

export function traceInBrowser(code: string): Promise<IdeTraceResult> {
  return new Promise((resolve, reject) => {
    let w: Worker;
    try {
      w = sharedIdeWorker();
    } catch (error) {
      reject(new IdeTraceError(`Không tạo được worker: ${String(error)}`));
      return;
    }

    let xong = false;
    const het = (fn: () => void) => {
      if (xong) return;
      xong = true;
      clearTimeout(hen);
      w.onmessage = null;
      w.onerror = null;
      fn();
    };

    const hen = setTimeout(() => {
      het(() => {
        w.terminate();
        dropIdeWorker();
        reject(new IdeTraceError('bộ ghi vết không trả lời trong 20 giây'));
      });
    }, TIMEOUT_MS);

    w.onmessage = ({ data }) => {
      if (!data) return;
      if (data.type === 'result') het(() => resolve(data.result as IdeTraceResult));
      else if (data.type === 'fatal') {
        het(() => {
          w.terminate();
          dropIdeWorker();
          reject(new IdeTraceError(String(data.message)));
        });
      }
    };
    w.onerror = (event) => {
      het(() => {
        w.terminate();
        dropIdeWorker();
        reject(new IdeTraceError(event.message || 'worker dừng đột ngột'));
      });
    };

    w.postMessage({ type: 'trace', code });
  });
}
