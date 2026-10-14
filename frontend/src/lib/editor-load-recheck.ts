/**
 * Hẹn LẦN KIỂM KẾ TIẾP cho bộ đếm giờ "không nạp được trình soạn thảo" ở /ide.
 *
 * VÌ SAO TÁCH RA ĐÂY: editorLoadPhase() (src/lib/editor-load-gate.ts) có test
 * từ đầu, nhưng nó chỉ trả lời "với số đo này thì đã hỏng chưa". Câu hỏi CÒN
 * LẠI — "bao giờ hỏi lại?" — nằm trong effect của IdeClient, và lỗi thật lại ở
 * đúng chỗ đó: bản đầu hẹn MỘT lần duy nhất bằng Date.now(), nên đồng hồ tường
 * bị kéo lùi trong 12 giây chờ làm lượt bắn duy nhất ra "chưa tới trần", cổng
 * trả 'loading', và không còn ai hỏi lại — trang đứng mãi ở "Đang tải", đúng lỗi
 * lưới an toàn sinh ra để chữa (người chấm độc lập bắt được, 14/10/2026).
 *
 * Bất biến hàm này giữ, và test kiểm trên cả số rác:
 *   cổng còn nói 'loading'  ⇔  hàm trả một khoảng chờ (không bao giờ bỏ cuộc)
 *   cổng nói 'ready'/'failed' ⇔ hàm trả null (thôi hẹn, không chạy vô ích)
 * Khoảng chờ luôn là số hữu hạn trong [RECHECK_MIN_MS, timeoutMs].
 *
 * Vì sao nhận `phase` làm đầu vào chứ không tự gọi editorLoadPhase(): file này
 * phải chạy được dưới `node --test` thuần, mà import giữa hai file .ts cần đuôi
 * `.ts` trong đường dẫn — tsconfig của frontend không bật
 * allowImportingTsExtensions. Cùng lý do không import alias '@/…' như
 * src/lib/editor-load-gate.ts, src/lib/feedback-link.ts.
 */

/**
 * Sàn của khoảng chờ. Bộ hẹn giờ có thể bắn SỚM hơn một chút so với
 * performance.now() (trình duyệt làm tròn đồng hồ để chống tấn công đo giờ), nên
 * lượt bắn "đúng trần" có thể đo ra 11 999,9 ms. Khi đó phần còn lại chỉ là
 * 0,1 ms; sàn này giữ cho lượt hẹn lại không thành một chuỗi lời gọi sát nhau.
 */
export const RECHECK_MIN_MS = 16;

/**
 * Khoảng chờ khi KHÔNG tin được con số nào (thời gian đã chờ là NaN/vô cực,
 * hoặc trần là rác). Cổng vẫn nói 'loading' thì vẫn phải hỏi lại — một giây một
 * lần là rẻ, còn bỏ cuộc là đứng im vĩnh viễn.
 */
export const RECHECK_FALLBACK_MS = 1_000;

/**
 * @param phase      kết quả editorLoadPhase() với CHÍNH số đo `elapsedMs` này.
 * @param elapsedMs  thời gian đã chờ (ms), đo bằng performance.now().
 * @param timeoutMs  trần chờ, thường là EDITOR_LOAD_TIMEOUT_MS.
 * @returns số ms tới lần kiểm sau, hoặc null = thôi hẹn.
 */
export function nextEditorCheckDelayMs(
  phase: 'ready' | 'loading' | 'failed',
  elapsedMs: number,
  timeoutMs: number,
): number | null {
  // 'ready': Monaco đã lên. 'failed': đã kết luận, giao diện đã đổi sang ô gõ
  // dự phòng và không bao giờ đổi lại (xem PlainEditor) — hẹn thêm là thừa.
  if (phase !== 'loading') return null;

  if (!(Number.isFinite(timeoutMs) && timeoutMs > 0)) return RECHECK_FALLBACK_MS;
  const remaining = timeoutMs - elapsedMs;
  if (!Number.isFinite(remaining)) return RECHECK_FALLBACK_MS;

  // remaining > timeoutMs: thời gian đã chờ ÂM (đồng hồ lùi) — chờ thêm đúng
  // một trần là đủ, không hẹn xa hơn. remaining <= 0 mà cổng vẫn nói 'loading'
  // nghĩa là cổng dùng trần khác (trần rác rơi về mặc định) — hỏi lại sớm.
  return Math.min(Math.max(remaining, RECHECK_MIN_MS), timeoutMs);
}
