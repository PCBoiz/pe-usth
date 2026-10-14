/**
 * Thông báo nổi "+10 điểm · Combo x3" và "▶ Code chạy đúng!" sống bao lâu, và
 * CÁI GÌ gỡ nó đi — phần quyết định, không có React.
 *
 * VÌ SAO PHẢI CÓ FILE NÀY (lỗi thật, đo ngày 14/10/2026 bằng Chrome DevTools):
 * người bật "giảm chuyển động" KHÔNG HỀ THẤY hai thông báo đó. Cơ chế hỏng gồm
 * hai mảnh khớp nhau:
 *
 *  1. `studio-chrome.module.css` chạy `.pop` và `.burst strong` bằng keyframe
 *     `pe-pop`, mà `pe-pop` KẾT THÚC ở `opacity: 0` (nó là animation vào–rồi–ra,
 *     cộng `forwards` để giữ khung cuối). Trong nhánh
 *     `@media (prefers-reduced-motion: reduce)`, file chỉ đặt
 *     `animation-duration: 0.01ms`. Rút thời lượng của một animation TẮT DẦN
 *     không làm nó đứng yên — nó nhảy thẳng tới khung cuối, tức `opacity: 0`.
 *     Chữ chớp qua trong 0,01 ms rồi mất.
 *  2. `LessonOverlays.tsx` gỡ phần tử `role="status"` ở `onAnimationEnd`. Với
 *     thời lượng 0,01 ms thì sự kiện đó bắn gần như ngay lập tức, nên phần tử
 *     bị tháo khỏi DOM trước khi trình đọc màn hình kịp đọc vùng live.
 *
 * Cách sửa: nhánh giảm chuyển động KHÔNG animate gì cả (`animation: none`,
 * `opacity: 1`) — nên `animationend` sẽ KHÔNG BAO GIỜ bắn, và nếu vẫn chỉ dựa
 * vào nó thì thông báo đứng mãi trên màn. Vì thế việc gỡ phải chuyển sang HẸN
 * GIỜ. Hàm dưới đây là chỗ duy nhất quyết định dùng cơ chế nào.
 *
 * Vì sao là file riêng không import gì theo alias '@/…': bộ test chạy bằng
 * `node --test` thuần (script `test:unit`), không phân giải alias và không bóc
 * JSX. Tiền lệ: src/lib/editor-load-gate.ts, src/lib/figure-motion.ts.
 */

/**
 * Thông báo đứng trên màn 6 giây khi người dùng bật giảm chuyển động.
 *
 * Vì sao 6 s chứ không phải 1,6 s (bằng thời lượng animation của bản thường):
 * bản thường DÙNG chuyển động để kéo mắt về góc trên bên phải, còn ở đây không
 * có gì kéo mắt — người dùng đang nhìn vào bài, phải tự phát hiện ra thông báo
 * rồi mới đọc. WCAG 2.2.1 lấy 20 s làm mốc "đủ để đọc" cho nội dung có hạn
 * giờ; 6 s là mức thoả hiệp: đủ cho một câu 6–9 từ ("+10 điểm · Combo x3 🔥")
 * cộng thời gian phát hiện, mà vẫn không chắn góc màn hình khi học viên đang
 * làm liên tiếp nhiều màn.
 */
export const STATUS_POP_REDUCED_MS = 6_000;

export type StatusPopPlan = {
  /** Có gắn `onAnimationEnd` để gỡ phần tử hay không. */
  dismissOnAnimationEnd: boolean;
  /** Hẹn giờ gỡ (ms); `null` = không hẹn giờ, để animation lo. */
  dismissAfterMs: number | null;
};

/**
 * @param prefersReducedMotion người dùng có bật giảm chuyển động không.
 * @param reducedMs cho test đổi số; bỏ trống = STATUS_POP_REDUCED_MS.
 */
export function statusPopPlan(
  prefersReducedMotion: boolean,
  reducedMs: number = STATUS_POP_REDUCED_MS,
): StatusPopPlan {
  if (!prefersReducedMotion) {
    // Bản thường: `pe-pop` tự tắt dần rồi `animationend` gỡ phần tử. Giữ y
    // nguyên hành vi đang chạy — không thêm hẹn giờ, vì hai cơ chế cùng chạy
    // thì cái nào thắng tuỳ máy, và đó là nguồn lỗi khó tái hiện.
    return { dismissOnAnimationEnd: true, dismissAfterMs: null };
  }
  // Nhánh giảm chuyển động: KHÔNG có animation nào nên `animationend` không bao
  // giờ bắn. Chỉ hẹn giờ.
  const ms = Number.isFinite(reducedMs) && reducedMs > 0 ? reducedMs : STATUS_POP_REDUCED_MS;
  return { dismissOnAnimationEnd: false, dismissAfterMs: ms };
}
