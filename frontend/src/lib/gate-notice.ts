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
 *
 * 15/10/2026 — "hoàn thành" đổi thành "đã xong", và vì sao đây KHÔNG phải nới
 * luật cho test xanh. Hai ca test ra hai luật trái nhau, chỉ không đụng nhau vì
 * `src/lib` từng nằm ngoài bề mặt quét của `ds-wording.test.mjs`:
 *   · `ds-wording` cấm chữ "hoàn thành" trong chuỗi hiển thị, lý do nêu thẳng
 *     trong ca đó: "hoàn thành" chỉ dùng cho TÊN TRƯỜNG DỮ LIỆU (`completed`,
 *     `completedLessons`). Nhãn người học đọc là "đã xong" — trang khoá in
 *     "· đã xong 7/48", màn Tổng kết in "đã xong". Lời nhắc ở màn nộp bài là
 *     chỗ thứ ba trên CÙNG một luồng, nên nó gọi tên khác là người học phải tự
 *     đoán hai chữ đó có cùng nghĩa hay không.
 *   · `gate-notice.test.mjs` thì ĐÒI `/hoàn thành/i`. Nhưng đọc lại lý do của
 *     ca đó ("nói đúng MỐC mở lời giải"), cái nó cần canh là cái MỐC — mở khi
 *     bài được tính xong, không phải ngay sau lần nộp đầu — chứ không phải một
 *     từ cụ thể. Nên ca đó đổi sang `/đã xong/`: vẫn là một assert DƯƠNG (lưới
 *     bắt cả chuỗi NFD), vẫn trượt nếu ai viết lại lời hứa "mở sau lần nộp
 *     đầu", mà thôi khoá cứng đúng chữ mà bảng thuật ngữ đã bỏ.
 * Tức một bên có lý do về sản phẩm, một bên chỉ dùng từ đó làm cái mốc để so.
 *
 * Câu chữ cũng gọn lại: bản cũ có bốn mệnh đề, một dấu chấm phẩy, một "tức
 * khi", và chữ "bài" ba lần trong hai câu — đọc như điều khoản hợp đồng.
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
        ' Không có nút gợi ý — tự viết rồi nộp. Lời giải mẫu mở khi bài được'
        + ' tính là đã xong, tức khi code đạt hết ca chấm; nộp mà chưa đạt thì'
        + ' lời giải vẫn đóng. Mở lời giải rồi làm lại thì điểm lượt sau tối đa'
        + ` ${ASSIST_CAP_PCT.boss}%.`,
      boss: true,
    };
  }
  if (input.gate && !input.submitted) {
    return {
      strong: 'Cửa tự kiểm tra.',
      rest:
        ' Tự viết rồi nộp trước. Lời giải mẫu mở khi bài được tính là đã xong —'
        + ' không phải ngay sau lần nộp đầu. Mở gợi ý vẫn được, nhưng lượt này'
        + ` ghi nhận là có hỗ trợ nên điểm tối đa ${ASSIST_CAP_PCT.normal}%.`,
      boss: false,
    };
  }
  return null;
}
