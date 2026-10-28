'use client';

// Màn cuối · Tổng kết: XP, thống kê và nút đi tiếp. Hai bản khác nhau: khoá có
// mini-game đếm điểm/combo/"đúng ngay lần đầu", khoá thường đếm câu đúng và ca
// kiểm thử đạt.
import Recap from '@/components/lesson-chrome/exercises/Recap';
import { EMPTY_SCORE, isGraded } from '@/lib/studio-lesson';

import { sandboxMode } from './chrome';
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
          completed ? (boss ? '⚔️ Đã hạ Boss của chặng!' : 'Đã hoàn thành bài học!') : 'Tổng kết bài học'
        }
        description={
          (completed
            ? boss
              ? 'Chặng tiếp theo đã mở khoá. '
              : 'Tiến độ và XP đã được lưu. '
            : tests.length
              ? 'Nộp bài ở màn sandbox để ghi nhận hoàn thành. '
              : 'Xác nhận khi bạn đã làm xong. ') +
          `XP nhận được tính theo số game bạn làm đúng ngay lần đầu (${firstTry}/${graded.length}).` +
          (draft.assisted ? ' Lượt này có dùng gợi ý/lời giải nên điểm bị giới hạn.' : '')
        }
        stats={[
          { icon: '⭐', value: String(score.points), label: 'Điểm trong bài' },
          { icon: '🔥', value: `x${score.bestCombo}`, label: 'Combo cao nhất' },
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

  // Bài ĐỌC (step_1.read, khoá 172 bài): không ca chấm, không màn nào được
  // chấm, nên hai ô "Câu đã làm đúng 0/0" và "Ca kiểm thử đạt 0/0" của bản
  // thường chỉ là hai con số rỗng — mà đặt cạnh chữ "hoàn thành" thì chúng còn
  // trông như vừa trượt hết. Khoá này đếm thứ đếm được: số màn đọc và số câu
  // luyện tập. Lý do "không có ca chấm" cũng khác bài quy trình, nên câu mô tả
  // không được dùng chung — xem sandboxMode().
  const readSlices = lesson.step_1?.read?.length ?? 0;
  const practice = lesson.step_2?.practice?.length ?? 0;
  const reading = readSlices > 0;
  // Ô TRẮC NGHIỆM của khoá bài đọc, và nó phải nói THẬT.
  //
  // Khoá 172 bài có 3 câu trắc nghiệm được chấm mỗi bài, mà ba ô của nhánh này
  // ("Phần đã đọc", "Câu luyện tập", "Màn đã học") không ô nào nói tới chúng —
  // tức màn tổng kết im lặng về đúng phần duy nhất có đo lường. Nay câu trắc
  // nghiệm thay ô "Màn đã học" (ô ít nghĩa nhất: nó chỉ đếm lại thanh tiến độ).
  //
  // Đếm bằng `firstTry === true`, KHÔNG bằng `draft.done`: `done` là "đã làm
  // đúng ở lần nào đó", nên sau khi bấm "Chọn lại" rồi chọn phương án vừa đọc
  // được trong lời giải thích, nó lại về 3/3 — đúng cái mẹo mà người thử nói
  // ra. `firstTry` khoá kết quả ở lần chấm ĐẦU, nên con số này là con số duy
  // nhất ở đây còn đo được gì.
  const quizStat =
    graded.length > 0
      ? { icon: '🎯', value: `${firstTry}/${graded.length}`, label: 'Trắc nghiệm đúng lần đầu' }
      : { icon: '📚', value: `${screens.length - 1}`, label: 'Màn đã học' };

  return (
    <Recap
      xpLabel={completed ? `+${xpReward} XP` : `${xpReward} XP`}
      title={completed ? 'Đã hoàn thành bài học!' : 'Tổng kết bài học'}
      description={
        (completed
          ? 'Tiến độ và XP đã được lưu. Bạn có thể quay lại luyện tập bất cứ lúc nào.'
          : tests.length
            ? 'Bài này chấm tự động — nộp bài ở màn sandbox để ghi nhận hoàn thành.'
            : sandboxMode(lesson) === 'procedure'
              ? 'Bài này thực hành trên máy lab nên không có ca chấm tự động. Xác nhận khi bạn đã làm xong.'
              : 'Bài đọc — không có ca chấm nào. Xác nhận khi bạn đã đọc hết và thử lại ví dụ.') +
        // Nói ra luật tính điểm, vì nó vừa đổi: trả lời sai một câu trắc
        // nghiệm KHÔNG còn chặn đường đi tiếp, nhưng cũng không chọn lại được
        // để lấy lại điểm. Im lặng về chuyện đó thì con số XP thấp hơn trông
        // như lỗi.
        (graded.length
          ? ` Điểm bài tính theo số câu trắc nghiệm đúng ngay lần trả lời đầu (${firstTry}/${graded.length}) — trả lời sai vẫn đi tiếp được.`
          : '') +
        (draft.assisted
          ? gate
            ? ' Lượt này có dùng gợi ý/lời giải: cửa tự kiểm tra tính là "có hỗ trợ" — hãy tự làm lại với dữ liệu mới.'
            : ' Lượt này có dùng gợi ý/lời giải — thử làm lại không mở gợi ý để chắc kiến thức.'
          : '')
      }
      stats={
        reading
          ? [
              { icon: '📖', value: `${readSlices}`, label: 'Phần đã đọc' },
              { icon: '✍️', value: `${practice}`, label: 'Câu luyện tập' },
              quizStat,
            ]
          : [
              { icon: '🎯', value: `${done}/${graded.length || 0}`, label: 'Câu đã làm đúng' },
              {
                icon: '🧪',
                // Kết quả chạy không lưu qua lần tải trang; bài có test chỉ hoàn thành
                // được qua lượt nộp đạt hết ca, nên đã hoàn thành = đạt đủ.
                value: `${result ? result.tests.filter((t) => t.passed).length : completed ? tests.length : 0}/${tests.length}`,
                label: 'Ca kiểm thử đạt',
              },
              { icon: '📚', value: `${screens.length - 1}`, label: 'Màn đã học' },
            ]
      }
      facts={[
        lesson.step_1?.context?.body,
        ...(lesson.step_1?.explain ?? []).map((row) => row.body),
        // Bài đọc không có `explain`/`context`: lấy đoạn văn đầu của từng màn
        // đọc làm ý chính, thay vì để ô "Ghi nhớ" trống trơn.
        ...(lesson.step_1?.read ?? []).map(
          (slice) => slice.find((b) => b.type === 'paragraph')?.text,
        ),
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
