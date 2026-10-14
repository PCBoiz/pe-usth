/**
 * Quyết định KHI NÀO coi là "không nạp được trình soạn thảo" ở trang /ide.
 *
 * VÌ SAO PHẢI CÓ FILE NÀY: đo ngày 14/10/2026, /ide nạp Monaco bằng
 * `@monaco-editor/react`, và cả hai lớp nạp đều KHÔNG có đường thoát khi hỏng:
 *  - `next/dynamic` chỉ có prop `loading`, không có `error`;
 *  - `@monaco-editor/react` bắt lỗi của `loader.init()` rồi `console.error`,
 *    không đẩy gì ra giao diện.
 * Hệ quả: chặn nguồn tải Monaco là khung soạn thảo đứng mãi ở chữ "Loading…" —
 * không báo lỗi, không hết giờ, không nút thử lại. Trang /ide là thứ DUY NHẤT
 * còn demo được trong buổi thử nghiệm USTH 14/10/2026 (DB Neon đang hỏng đăng
 * nhập nên phần bài học không vào được), nên "đứng im vĩnh viễn" là hỏng hóc
 * phải chặn bằng test, không phải bằng mắt.
 *
 * Vì sao là file riêng không import gì theo alias '@/…': bộ test chạy bằng
 * `node --test` thuần (xem script `test:unit`) và runner đó không phân giải
 * alias, cũng không bóc được JSX. Tiền lệ: src/lib/feedback-link.ts,
 * src/components/python-studio/prewarm-gate.ts.
 */

/**
 * Trần chờ trước khi coi là hỏng: 12 giây.
 *
 * Vì sao 12 s chứ không phải 3 s hay 60 s — ba con số đo được ngày 14/10/2026:
 *  1. Monaco nay TỰ HOST (public/monaco/v0.57.0/vs), tức cùng origin với trang.
 *     Lượt tải đầu cho editor python (đo lại bằng chrome-devtools trên
 *     `next start`, 14/10/2026 — bản đầu của chú thích này ghi nhầm ~3,0 MB):
 *     19 request vào /monaco/, 4,94 MB sau giải nén — riêng editor-*.js
 *     2,47 MB, toggleHighContrast-*.js 1,29 MB, editor.main.css 0,39 MB,
 *     editorWorkerHost-*.js 0,36 MB, assets/editor.worker-*.js 0,28 MB, đều
 *     tải ngay lúc mở. Máy chủ nén gzip nên trên dây chỉ ~1,3 MB. Với tốc độ
 *     đã đo bằng Pyodide (13,2 MB trong 2,7 s ≈ 5 MB/s) thì ~0,3 s khi có
 *     nén, khoảng 1 giây nếu không nén.
 *  2. Hỏng kiểu BIẾT NGAY (404 vì chép thiếu file, domain bị chặn) không chờ
 *     tới đây: `loader.js` bắn `onerror` trong vài trăm ms và cờ `rejected`
 *     bên dưới cắt ngay.
 *  3. Nên trần này chỉ còn để đỡ kiểu hỏng IM LẶNG: proxy/captive portal của
 *     phòng máy nhận kết nối rồi không trả gì. Chrome tự bỏ cuộc sau hàng chục
 *     giây — quá lâu cho người đang đứng trình bày.
 * 12 s ≈ 4 lần thời gian tải xấu nhất còn hợp lý (3 s), đủ rộng để mạng chậm
 * thật không bị kết luận oan, mà vẫn đủ ngắn để người dùng còn kịp gõ bài.
 *
 * Đổi số này thì sửa cả chú thích: nó là một đánh đổi có số đo, không phải
 * hằng số bịa.
 */
export const EDITOR_LOAD_TIMEOUT_MS = 12_000;

/** Những gì trang biết được về lần nạp trình soạn thảo đang diễn ra. */
export type EditorLoadSignals = {
  /** Monaco đã gọi `onMount`: editor thật đã dựng xong trong DOM. */
  mounted: boolean;
  /**
   * `loader.init()` đã từ chối (thường là `script.onerror` của loader.js).
   * Đây là bằng chứng CHẮC CHẮN hỏng nên không cần chờ hết trần.
   */
  rejected: boolean;
  /** Đã chờ bao lâu kể từ lúc bắt đầu lần thử này (ms). */
  elapsedMs: number;
  /** Trần chờ riêng (chỉ dùng cho test); bỏ trống = EDITOR_LOAD_TIMEOUT_MS. */
  timeoutMs?: number;
};

/**
 * `ready`  — dùng Monaco như thường.
 * `loading` — còn chờ, giữ khung "Đang tải trình soạn thảo…".
 * `failed` — hiện thông báo + nút thử lại + rơi về <textarea> để còn gõ được.
 */
export type EditorLoadPhase = 'ready' | 'loading' | 'failed';

export function editorLoadPhase(signals: EditorLoadSignals): EditorLoadPhase {
  // `mounted` THẮNG mọi tín hiệu khác, kể cả `rejected`. Nói thẳng: với cách
  // nối dây HIỆN TẠI, hai cờ này không thể cùng bật. `rejected` chỉ bật từ
  // lời gọi `loader.init()` trong factory của `dynamic()` (IdeClient.tsx) — lời
  // gọi đó không gắn với effect nào nên không bao giờ bị huỷ — và mọi lời gọi
  // init() đều bọc CÙNG MỘT promise của loader: đã resolve (điều kiện để có
  // onMount) thì không thể reject nữa. Dòng này là PHÒNG THỦ cho lần sửa sau:
  // nếu ai đó nối `rejected` vào một lời gọi huỷ được (promise của init() bị
  // huỷ sẽ reject với `{ type: 'cancelation' }`) thì editor đã nằm trong DOM
  // vẫn không bị che bằng <textarea>.
  if (signals.mounted) return 'ready';
  if (signals.rejected) return 'failed';

  const timeoutMs =
    // Trần phải là số dương hữu hạn. Giá trị rác (0, âm, NaN) mà để nguyên thì
    // phép so sánh dưới đây đúng NGAY LẬP TỨC — nghĩa là người dùng thấy
    // <textarea> dù Monaco đang chạy tốt. Hỏng kiểu đó khó nhìn ra nên chặn ở
    // đây, không phải ở chỗ gọi.
    Number.isFinite(signals.timeoutMs) && (signals.timeoutMs as number) > 0
      ? (signals.timeoutMs as number)
      : EDITOR_LOAD_TIMEOUT_MS;

  // Thời gian đã chờ KHÔNG tin tuyệt đối được. Bản đầu tính bằng `Date.now()`
  // (đồng hồ tường: đồng bộ NTP/chỉnh giờ giữa lúc chờ là ra số âm); nay
  // IdeClient dùng performance.now() vốn đơn điệu, nhưng cổng vẫn không được
  // dựa vào điều đó. Số âm/NaN/vô cực thì nghiêng về "còn chờ" chứ không kết
  // luận hỏng — kết luận oan là giật mất editor đang chạy khỏi tay người dùng.
  // Đổi lại, phía hẹn giờ (src/lib/editor-load-recheck.ts) phải hỏi lại chừng
  // nào cổng còn nói 'loading', không thì "còn chờ" thành "chờ mãi".
  if (!Number.isFinite(signals.elapsedMs) || signals.elapsedMs < 0) return 'loading';

  return signals.elapsedMs >= timeoutMs ? 'failed' : 'loading';
}
