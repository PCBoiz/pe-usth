/**
 * Đi tới / lùi lại giữa các màn của một bài — tách khỏi `cta.ts` (nó import
 * `screens/chrome.tsx`, có JSX) để `node --test` kiểm được. File này KHÔNG
 * import gì, như `gate-notice.ts`.
 *
 * Gộp từ bản Figma của thành viên (design/v3/quyet-dinh.md mục 4):
 *
 *  · Nút "Màn trước" rõ ràng ở thanh dưới. Trước đây chỉ quay lại được bằng
 *    cách bấm đúng một đoạn trên thanh tiến độ mảnh ở trên cùng — không có chữ,
 *    không ai đoán ra.
 *
 *  · Nút đi tiếp BẬT ngay khi đã làm đúng — điểm bản mình đã hơn Figma (Figma
 *    để "Next" mờ cả sau khi đúng, rồi đặt một nút "Bài tiếp" thứ hai cạnh
 *    tranh). Có nút "Màn trước" thì việc quay lại một màn ĐÃ XONG thành chuyện
 *    thường ngày, nên luật phải phủ cả trường hợp đó: màn đã xong mà chưa bấm
 *    Kiểm tra lại (goTo() xoá `checkedKey`) thì vẫn là "Tiếp tục", không bắt
 *    chấm lại mới cho đi — giống màn Bàn thí nghiệm đã làm (`draft.done` →
 *    "Tiếp tục").
 */

export const PREV_LABEL = 'Màn trước';

/** Màn liền trước (1-based), hoặc null khi đang ở màn đầu / bài chỉ có một màn. */
export function prevStep(step: number, total: number): number | null {
  if (total <= 1 || step <= 1) return null;
  return Math.min(step, total) - 1;
}

export type GradedCta = {
  label: string;
  tone: 'accent' | 'ok' | 'err';
  disabled?: boolean;
  action: 'check' | 'retry' | 'next';
};

/**
 * Nút chính của một màn có chấm.
 * `correct`: kết quả lần chấm vừa rồi; null khi chưa có (vd. game chạy code
 * chưa trả kết quả) — giữ đúng luật cũ của cta.ts là cho đi tiếp.
 */
export function gradedCta(s: {
  runnable: boolean;
  running: boolean;
  checked: boolean;
  answered: boolean;
  correct: boolean | null;
  done: boolean;
}): GradedCta {
  if (s.runnable && s.running)
    return { label: 'Đang chạy code…', tone: 'accent', disabled: true, action: 'check' };
  if (!s.checked) {
    if (s.done) return { label: 'Tiếp tục →', tone: 'ok', action: 'next' };
    return {
      label: s.runnable ? 'Chạy & kiểm tra' : 'Kiểm tra',
      tone: 'accent',
      disabled: !s.answered,
      action: 'check',
    };
  }
  if (s.correct === false) return { label: 'Thử lại', tone: 'err', action: 'retry' };
  return { label: 'Tiếp tục →', tone: 'ok', action: 'next' };
}
