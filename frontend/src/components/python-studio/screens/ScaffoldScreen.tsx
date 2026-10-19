'use client';

// S3 · Lắp ghép khung mã: điền các slot {{slotN}} trong template bằng thẻ ở kho.
// Game "fill" của khoá có mini-game dùng lại đúng màn này.
//
// Bố cục sách mở (ScaffoldBook) theo Figma 107:6804, đặt TRONG thẻ ShellB như
// mọi màn: nhãn "Game · Điền mảnh code", tên bài ở góc, tiêu đề và câu dẫn của
// bài. Figma bỏ phần đầu thẻ này; bản đầu làm theo và chủ sản phẩm yêu cầu trả
// lại (19/10/2026) — thiếu nó thì màn này lạc giữa các màn khác của bài.
// Câu dẫn (step_3.task.body) chỉ in ở đầu thẻ, không in lại dưới code như ghi
// chú của Figma: một câu hai chỗ là đọc hai lần.
// Màn này chạy ở cột rộng (StudioLesson đặt `wide`).
import { scaffoldReview } from '@/lib/studio-lesson';

import c from '../studio-chrome.module.css';
import { ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';
import ScaffoldBook from './ScaffoldBook';
import ScaffoldReview from './ScaffoldReview';

type Props = Pick<
  LessonScreenProps,
  | 'lesson'
  | 'scr'
  | 'metaLabel'
  | 'draft'
  | 'update'
  | 'clearChecked'
  | 'verdict'
  | 'onFinish'
> & { title?: string };

export default function ScaffoldScreen({
  lesson,
  scr,
  metaLabel,
  title,
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
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={title ?? (three?.task?.title || 'Lắp lại khung mã')}
      description={three?.task?.body}
      // Màn này có khung kết quả riêng (ScaffoldReview) thay cho băng chung.
      verdict={null}
    >
      <div className={c.scaffoldScreen}>
        <ScaffoldBook
          scaffold={scaffold}
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
    </ScreenShell>
  );
}
