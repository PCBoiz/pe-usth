// Khung kết quả của màn lắp khung mã, theo Figma "Lesson card" (node 15:1642 —
// làm đúng, 15:2372 — làm sai). Thay cho FeedbackBanner chung ở màn này vì
// banner chỉ nói được một câu ("Slot 1 chưa đúng."), còn ở đây học viên cần
// thấy từng ô: đã chọn gì, sai vì sao, và mỗi đáp án đúng loại được bẫy nào.
//
// Màu và cỡ chữ của Figma (bản tối, mã hex) được quy về token: trang có cả bản
// ngày lẫn Ban đêm, và `ds-tokens.test.mjs` cấm mã màu trong TSX/module.css.
// Bốn icon là hình học lucide của Figma (x, check, rotate-ccw, arrow-right)
// vẽ bằng `currentColor` — file SVG của Figma tô cứng màu hồng/xanh của bản
// tối, đặt lên nền ngày sẽ gần như mất.
//
// Câu chữ theo Figma, trừ hạt "nhé" ("Thử lại nhé!", "Cùng xem lại vì sao
// nhé."): giọng đã chốt bỏ hẳn hạt này — xem ds-wording.test.mjs.
import type { ScaffoldSlotReview } from '@/lib/studio-lesson';

import c from '../studio-chrome.module.css';

/** ①…⑳ — đúng ký hiệu Figma dùng để gọi tên ô. */
export function circled(n: number): string {
  return n >= 1 && n <= 20 ? String.fromCodePoint(0x2460 + n - 1) : `(${n})`;
}

const ICON_X = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M18 6L12 12M12 12L6 18M12 12L6 6M12 12L18 18" />
  </svg>
);
const ICON_CHECK = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M19.9992 6L9.0003 16.9992L4.0008 11.9996" />
  </svg>
);
const ICON_REDO = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M2.5 10C2.5 11.4834 2.93987 12.9334 3.76398 14.1668C4.58809 15.4001 5.75943 16.3614 7.12987 16.9291C8.50032 17.4968 10.0083 17.6453 11.4632 17.3559C12.918 17.0665 14.2544 16.3522 15.3033 15.3033C16.3522 14.2544 17.0665 12.918 17.3559 11.4632C17.6453 10.0083 17.4968 8.50032 16.9291 7.12987C16.3614 5.75943 15.4001 4.58809 14.1668 3.76398C12.9334 2.93987 11.4834 2.5 10 2.5C7.90329 2.50789 5.89081 3.32602 4.38333 4.78333L2.5 6.66667M6.66667 6.66667H2.5V2.5" />
  </svg>
);
const ICON_NEXT = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4.166 10H15.834M10 15.834L15.834 10L10 4.166" />
  </svg>
);

export default function ScaffoldReview({
  reviews,
  onRedo,
  onNext,
}: {
  reviews: ScaffoldSlotReview[];
  /** Đặt lại MỌI ô — sau khi chấm, kho đã hết thẻ nên không đổi lẻ từng ô được. */
  onRedo: () => void;
  onNext: () => void;
}) {
  const total = reviews.length;
  const wrong = reviews.filter((r) => !r.correct);
  const ok = total > 0 && wrong.length === 0;
  const right = total - wrong.length;

  return (
    // Vùng sống như FeedbackBanner: kết quả chấm chỉ xuất hiện sau "Kiểm tra".
    <div className={`${c.review} ${ok ? c.reviewOk : c.reviewErr}`} role="status">
      <div className={c.reviewHead}>
        <span className={c.reviewEmblem} aria-hidden="true">
          {ok ? ICON_CHECK : ICON_X}
        </span>
        <div className={c.reviewMsg}>
          <p className={c.reviewTitle}>
            {ok ? 'Chúc mừng! Bạn đã làm đúng.' : 'Chưa đúng rồi. Thử lại.'}
          </p>
          <p className={c.reviewSub}>
            {ok
              ? `Cả ${total} đoạn mã đều chính xác. Xem lại vì sao.`
              : `Ô ${wrong.map((r) => circled(r.n)).join(', ')} chưa đúng.`}
          </p>
        </div>
        <p className={c.reviewScore}>
          {right} / {total} đúng
        </p>
      </div>

      {ok
        ? reviews.map((r) => (
            <div key={r.n} className={c.reviewItem}>
              <p className={c.reviewAnswer}>
                {circled(r.n)}  {r.answer}
              </p>
              {r.traps.map((t) => (
                <p key={t.label} className={c.reviewText}>
                  Chọn <code className={c.reviewInline}>{t.label}</code> thì sai: {t.trap}
                </p>
              ))}
            </div>
          ))
        : wrong.map((r) => (
            <div key={r.n} className={c.reviewItem}>
              <div className={c.reviewPicked}>
                <span>{wrong.length > 1 ? `Ô ${circled(r.n)}: bạn đã chọn` : 'Bạn đã chọn'}</span>
                <code className={c.reviewWrong}>{r.picked || '(để trống)'}</code>
              </div>
              <p className={c.reviewText}>
                {r.trap ??
                  (r.belongsTo
                    ? `Thẻ này dành cho ô ${circled(r.belongsTo)}, không phải ô ${circled(r.n)}.`
                    : 'Thẻ này không làm đúng việc ô cần.')}
              </p>
              <p className={c.reviewText}>
                Cần dùng <code className={c.reviewInline}>{r.answer}</code>.
              </p>
            </div>
          ))}
      {!ok && right > 0 && (
        <p className={c.reviewText}>
          {right === 1 ? 'Ô còn lại đã đúng.' : `${right} ô còn lại đã đúng.`}
        </p>
      )}

      <div className={c.reviewFoot}>
        <p className={c.reviewHint}>
          {ok ? 'Sẵn sàng cho phần tiếp theo?' : `Làm lại để đặt lại cả ${total} ô và chọn lại mã.`}
        </p>
        <button type="button" className={c.reviewAction} onClick={ok ? onNext : onRedo}>
          {ok ? 'Tiếp theo / Next' : 'Làm lại / Redo'}
          <span aria-hidden="true" className={c.reviewActionIcon}>
            {ok ? ICON_NEXT : ICON_REDO}
          </span>
        </button>
      </div>
    </div>
  );
}
