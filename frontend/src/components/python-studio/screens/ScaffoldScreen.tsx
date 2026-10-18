'use client';

// S3 · Lắp ghép khung mã: điền các slot {{slotN}} trong template bằng thẻ ở kho.
// Game "fill" của khoá có mini-game dùng lại đúng màn này.
//
// Bố cục sách mở (ScaffoldBook) theo Figma 107:6804 thay cho thẻ ShellB: bản
// thiết kế không có dải nhãn/tiêu đề phía trên — tiêu đề nằm ở đầu trang phải.
// Màn này chạy ở cột rộng (StudioLesson đặt `wide`).
import { scaffoldReview } from '@/lib/studio-lesson';

import c from '../studio-chrome.module.css';
import type { LessonScreenProps } from './props';
import ScaffoldBook from './ScaffoldBook';
import ScaffoldReview from './ScaffoldReview';

type Props = Pick<
  LessonScreenProps,
  'lesson' | 'draft' | 'update' | 'clearChecked' | 'verdict' | 'onFinish'
> & { title?: string };

export default function ScaffoldScreen({
  lesson,
  draft,
  update,
  clearChecked,
  verdict,
  onFinish,
}: Props) {
  const three = lesson.step_3;
  const scaffold = three?.scaffold;
  if (!scaffold) return null;
  // Đã bấm "Kiểm tra" (`verdict` đã lọc theo checked ở StudioLesson).
  const reviews = verdict ? scaffoldReview(lesson, draft) : [];
  const reset = () => {
    clearChecked();
    update({ slots: {} });
  };

  return (
    <div className={c.scaffoldScreen}>
      <ScaffoldBook
        scaffold={scaffold}
        note={three?.task?.body}
        slots={draft.slots}
        wrong={reviews.filter((r) => !r.correct).map((r) => r.n)}
        checked={Boolean(verdict)}
        onPlace={(n, label) => {
          // Đổi thẻ là bỏ kết quả chấm cũ, như mọi màn có "Kiểm tra".
          clearChecked();
          update({ slots: { ...draft.slots, [n]: label } });
        }}
      />
      {verdict ? (
        // Nút "Tiếp theo" trong khung làm đúng việc nút chính dưới đáy (lúc
        // này đang là "Tiếp tục →"), để hai nút không bao giờ đi hai ngả.
        <ScaffoldReview reviews={reviews} onRedo={reset} onNext={onFinish} />
      ) : (
        <button type="button" className={c.resetLink} onClick={reset}>
          Đặt lại các ô
        </button>
      )}
    </div>
  );
}
