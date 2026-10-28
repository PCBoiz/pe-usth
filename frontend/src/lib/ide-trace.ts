/**
 * "Xem từng bước" chạy bằng Pyodide trong trình duyệt. ĐÂY LÀ ĐƯỜNG DUY NHẤT —
 * `POST /api/python/trace` và container Docker sau nó đã bị xoá ngày 25/10/2026.
 *
 * Bộ ghi vết là `scripts/tracer/pe_tracer.py`, rút gọn thành
 * `/static/py/pe_tracer.min.py` bằng `node scripts/build-tracer-source.mjs`.
 * Hợp đồng JSON v1 giữ nguyên qua cả lần chuyển, nên
 * `frontend/src/lib/trace.ts` không phải đổi một dòng nào.
 * `frontend/e2e/unit/tracer-web-sync.test.mjs` canh hai bản khỏi lệch.
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
 * Dài hơn `timeBudgetMs` 4 000 ms của chính tracer, cộng chỗ cho lần nạp runtime
 * đầu tiên (~2 giây). Tracer TỰ dừng ở 4 giây và vẫn trả về vết đã ghi được —
 * nên cái hẹn này chỉ để bắt trường hợp tracer không trả lời được nữa, và nó
 * phải thua cuộc trong mọi tình huống bình thường. Đặt ngắn hơn 4 giây là cướp
 * mất vết một phần mà học viên lẽ ra đã được xem.
 *
 * Con số 4 000 nằm ở `PE_LIMITS` trong `scripts/tracer/pe_tracer.py`, KHÔNG ở
 * đây — đừng chép nó thành hằng thứ hai. Và nó là trần MỀM: đo được rằng
 * `signal.setitimer` không tồn tại trong Pyodide, nên tracer chỉ kiểm giờ TRONG
 * callback và một lời gọi thư viện dài (ví dụ `time.sleep(8)`) đi quá hạn mà
 * không ai cắt được. Chính vì vậy cái hẹn 20 giây ở đây phải ở lại.
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
