/**
 * Lời nhắc ở màn "Thử thách độc lập" cho BA bài cửa tự kiểm tra (R02, DA01,
 * DA02) — tách khỏi `SandboxScreen.tsx` để `node --test` kiểm được câu chữ.
 *
 * Vì sao phải là file riêng, và vì sao câu chữ cũ là một lời nói sai:
 *
 * Bản cũ viết thẳng trong JSX: "Lời giải mẫu chỉ mở sau lần nộp đầu". Luật
 * THẬT nằm ở `src/lessons/lessons.service.ts` (`gated && !completed`): server
 * giữ `solutionCode` tới khi bài được tính HOÀN THÀNH, mà hoàn thành đòi code
 * đạt hết ca chấm. Phía FE, `useLessonData.complete` chỉ xin lại nội dung sau
 * khi `POST /lessons/:n/complete` đi qua — nên người nộp mà CHƯA ĐẠT thì
 * `four.solutionCode` vẫn `undefined` và nút "Hiện lời giải" không mọc ra.
 *
 * Tức là câu cũ hứa đúng với người làm được bài, và nói sai với người làm
 * không được — đúng cái nhóm đang cần lời giải nhất. AGENTS.md đã ghi gốc của
 * chuyện này ("Server biết 'đã hoàn thành', không biết 'đã nộp'"); câu trên
 * màn hình thì chưa ai sửa theo.
 *
 * Hai thứ khác cũng chốt ở đây:
 *  · "điểm trận này" đổi thành "điểm bài này" — bảng thuật ngữ là khoá · chặng
 *    · bài · màn, không có "trận"; ẩn dụ đánh trận là thứ `9bc42c1` đã gỡ khỏi
 *    phần giữ lại.
 *  · Trần điểm khi có hỗ trợ (60% cho bài tổng hợp, 80% cho bài thường) KHÔNG
 *    viết cứng ở đây dưới dạng số rời: test đọc lại chính `quizPercent()` để
 *    so, vì đã ba lần trong repo này một bảng tham chiếu CHÉP TAY làm test
 *    tưởng mình đang canh nguồn thật.
 */

/** Trần điểm khi lượt làm có hỗ trợ — phải khớp `quizPercent()` ở `studio-lesson.ts`. */
export const ASSIST_CAP_PCT = { boss: 60, normal: 80 } as const;

export type GateNotice = {
  /** Câu in đậm mở đầu: nói CÁI GÌ LÀ THẬT trước, rồi mới tới hệ quả. */
  strong: string;
  rest: string;
  /** `true` ⇒ dùng kiểu nền bài tổng hợp (`c.boss`). */
  boss: boolean;
};

/**
 * `null` = bài thường, không có lời nhắc nào.
 *
 * `boss` và `gate` HIỆN TẠI luôn bằng nhau (cả ba bài R02/DA01/DA02 mang cả
 * `play.boss` và `step_4.gate`), nên nhánh `gate` một mình chưa bao giờ hiện
 * ra. Vẫn giữ nó vì thêm một bài cửa KHÔNG phải bài tổng hợp là việc hợp lý,
 * và có một ca test canh đúng chỗ đó: nếu hai cờ tách nhau thì ca trượt để
 * người sửa biết nhánh này vừa sống lại và phải đọc lại câu chữ của nó.
 */
export function gateNotice(input: {
  boss: boolean;
  gate: boolean;
  /** Đã nộp ít nhất một lần trong lượt này. */
  submitted: boolean;
}): GateNotice | null {
  if (input.boss) {
    return {
      strong: 'Bài tổng hợp chặng.',
      rest:
        ' Bài này không có nút gợi ý — tự viết rồi nộp. Lời giải mẫu mở khi bài'
        + ' được tính hoàn thành, tức khi code đạt hết ca chấm; nộp mà chưa đạt'
        + ' thì nó vẫn đóng. Nếu bạn mở lời giải rồi làm lại bài, điểm lượt làm'
        + ` lại tối đa ${ASSIST_CAP_PCT.boss}%.`,
      boss: true,
    };
  }
  if (input.gate && !input.submitted) {
    return {
      strong: 'Cửa tự kiểm tra.',
      rest:
        ' Tự viết rồi nộp trước. Lời giải mẫu mở khi bài được tính hoàn thành —'
        + ' không phải ngay sau lần nộp đầu. Mở gợi ý vẫn được, nhưng lượt này'
        + ` ghi nhận là có hỗ trợ nên điểm tối đa ${ASSIST_CAP_PCT.normal}%.`,
      boss: false,
    };
  }
  return null;
}
