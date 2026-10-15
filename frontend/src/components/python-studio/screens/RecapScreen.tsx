'use client';

// Màn cuối · Tổng kết: XP, thống kê và nút đi tiếp. Hai bản khác nhau: khoá có
// mini-game đếm điểm/combo/"đúng ngay lần đầu", khoá thường đếm câu đúng và ca
// kiểm thử đạt.
//
// Hai câu dẫn người học đi nộp bài TỪNG CHỈ SAI CHỖ: chúng ghi "Nộp ở màn Bàn
// thí nghiệm". "Bàn thí nghiệm" là tên của `/ide` — một CÔNG CỤ khác, nằm
// ngoài bài học và gửi mã lên máy chủ qua `POST /api/python/run`
// (`app/ide/IdeClient.tsx`); ở đó KHÔNG có nút nộp nào, không có ca chấm của
// bài, không ghi tiến độ. Màn nộp bài nằm trong chính bài học và tên nó là
// "Thử thách độc lập" (`screens/chrome.tsx`, nhãn của `kind: 'sandbox'`; cũng
// là tiêu đề mặc định của `SandboxScreen.tsx`). Tên công cụ giữ nguyên theo
// bảng thuật ngữ (design-system-v2.md) — chỗ sai là câu ở đây.
// Canh bởi `e2e/unit/ds-wording.test.mjs`.
import Recap from '@/components/lesson-chrome/exercises/Recap';
import { EMPTY_SCORE, isGraded } from '@/lib/studio-lesson';

import type { LessonScreenProps } from './props';

type Props = Pick<
  LessonScreenProps,
  | 'lesson'
  | 'screens'
  | 'draft'
  | 'completed'
  | 'xpGained'
  | 'xpReward'
  | 'result'
  | 'onFinish'
>;

export default function RecapScreen({
  lesson,
  screens,
  draft,
  completed,
  xpGained,
  xpReward,
  result,
  onFinish,
}: Props) {
  const tests = lesson.step_4?.tests ?? [];
  const gate = Boolean(lesson.step_4?.gate);
  const play = lesson.play;
  const boss = Boolean(play?.boss);
  const score = draft.score ?? EMPTY_SCORE;
  const graded = screens.filter((x) => isGraded(x.kind));
  const done = graded.filter((x) => draft.done[x.key]).length;
  const firstTry = graded.filter((x) => score.firstTry[x.key] === true).length;

  if (play) {
    const xpText =
      completed && xpGained !== null
        ? `+${xpGained} XP`
        : completed
          ? `+${xpReward} XP`
          : `${xpReward} XP`;
    return (
      <Recap
        xpLabel={xpText}
        title={
          completed ? (boss ? 'Đã xong bài tổng hợp chặng.' : 'Đã xong bài này.') : 'Tổng kết bài học'
        }
        description={
          (completed
            ? 'Tiến độ và XP đã được lưu. '
            : tests.length
              ? 'Nộp ở màn Thử thách độc lập để ghi nhận là đã xong. '
              : 'Xác nhận khi bạn đã làm xong. ') +
          `XP nhận được tính theo số game bạn làm đúng ngay lần đầu (${firstTry}/${graded.length}).` +
          (draft.assisted ? ' Lượt này có dùng gợi ý/lời giải nên điểm bị giới hạn.' : '')
        }
        stats={[
          { icon: '⭐', value: String(score.points), label: 'Điểm trong bài' },
          /* Ô "🔥 Combo cao nhất" từng đứng ở giữa. Bỏ: combo đo TỐC ĐỘ trả
             lời liên tiếp, tức một con số tụt xuống khi người học dừng lại
             suy nghĩ — đúng loại áp lực mà triết lý tự học đã gạt ra. Hai ô
             còn lại đều chỉ tăng. */
          { icon: '🎯', value: `${firstTry}/${graded.length || 0}`, label: 'Đúng ngay lần đầu' },
        ]}
        facts={[
          ...(lesson.step_1?.explain ?? []).map((row) => row.body),
          lesson.step_1?.misconception?.body
            ? `Tránh ngộ nhận: ${lesson.step_1.misconception.body}`
            : undefined,
        ]
          .filter((x): x is string => Boolean(x))
          .slice(0, 3)}
        onFinish={onFinish}
      />
    );
  }

  return (
    <Recap
      xpLabel={completed ? `+${xpReward} XP` : `${xpReward} XP`}
      title={completed ? 'Đã xong bài này.' : 'Tổng kết bài học'}
      description={
        (completed
          ? 'Tiến độ và XP đã được lưu. Bạn có thể quay lại luyện tập bất cứ lúc nào.'
          : tests.length
            ? 'Bài này chấm tự động — nộp ở màn Thử thách độc lập để ghi nhận là đã xong.'
            : 'Bài này thực hành trên máy tính của bạn nên không có ca chấm tự động. Xác nhận khi bạn đã làm xong.') +
        (draft.assisted
          ? gate
            ? ' Lượt này có dùng gợi ý/lời giải: cửa tự kiểm tra tính là "có hỗ trợ" — hãy tự làm lại với dữ liệu mới.'
            : ' Lượt này có dùng gợi ý/lời giải — thử làm lại không mở gợi ý để chắc kiến thức.'
          : '')
      }
      stats={[
        { icon: '🎯', value: `${done}/${graded.length || 0}`, label: 'Câu đã làm đúng' },
        {
          icon: '🧪',
          // Kết quả chạy không lưu qua lần tải trang; bài có test chỉ hoàn thành
          // được qua lượt nộp đạt hết ca, nên đã hoàn thành = đạt đủ.
          value: `${result ? result.tests.filter((t) => t.passed).length : completed ? tests.length : 0}/${tests.length}`,
          label: 'Ca kiểm thử đạt',
        },
        { icon: '📚', value: `${screens.length - 1}`, label: 'Màn đã học' },
      ]}
      facts={[
        lesson.step_1?.context?.body,
        ...(lesson.step_1?.explain ?? []).map((row) => row.body),
        lesson.step_1?.misconception?.body
          ? `Tránh ngộ nhận: ${lesson.step_1.misconception.body}`
          : undefined,
      ]
        .filter((x): x is string => Boolean(x))
        .slice(0, 4)}
      onFinish={onFinish}
    />
  );
}
