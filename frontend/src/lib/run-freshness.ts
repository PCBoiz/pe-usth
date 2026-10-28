/**
 * XUẤT XỨ của ô kết quả: thứ đang hiện trong console thuộc bản code NÀO?
 *
 * VÌ SAO FILE NÀY TỒN TẠI. Bài PY01 của khoá 172 bài có một câu tự vấn viết
 * sẵn trong nguồn: *"Nếu không bấm chạy lại, output đang nhìn thuộc bản code
 * nào?"* — và trước bản này nền tảng KHÔNG trả lời được câu đó. Người học sửa
 * một dòng, không bấm Chạy, rồi đọc tiếp ô kết quả bên dưới như thể nó là kết
 * quả của bản vừa sửa. Không có gì trên màn hình nói ngược lại: console vẫn
 * nguyên màu, bảng ca kiểm thử vẫn ✓ xanh, dòng "123 ms" vẫn đứng đó.
 *
 * Đây là lớp rẻ nhất trả lời được câu hỏi đó, và nó đúng với CẢ 172 bài chứ
 * không riêng bài nào: nó chỉ cần hai chuỗi.
 *
 * LUẬT: so mã hiện trong ô soạn với mã của LẦN CHẠY gần nhất (chuỗi đã được
 * gửi vào worker). Khác nhau ⇒ kết quả là của bản trước.
 *
 * KHÔNG dùng cờ "đã gõ phím" (một `useState` bật khi onChange nổ), vì người
 * học gõ rồi xoá về đúng như cũ thì kết quả vẫn ĐÚNG, mà cờ kia đã bật và
 * không có đường tắt lại. So chuỗi thì chuyện đó tự xử lý.
 *
 * So BẰNG NHAU TUYỆT ĐỐI, không chuẩn hoá khoảng trắng: thêm một dấu cách cuối
 * dòng thật ra không đổi đầu ra, nên ở đó phép so này nói "cũ" oan một lần.
 * Chấp nhận, vì chiều lệch kia tệ hơn hẳn — bỏ sót một thay đổi CÓ đổi đầu ra
 * là nói với người học rằng kết quả cũ vẫn đúng, tức đúng cái lỗi đang sửa. Và
 * khoảng trắng trong Python không phải thứ vô hại để đi chuẩn hoá (thụt lề là
 * cú pháp, dấu cách trong chuỗi là dữ liệu).
 */

/** Câu nói ra xuất xứ. Một bản duy nhất: UI dựng nó, ca test đọc lại chính nó. */
export const NHAN_KET_QUA_CU = 'Kết quả này của bản code trước — bấm Chạy để cập nhật.';

export function ketQuaLaCu({
  /** Mã đã thật sự gửi vào worker ở lần chạy gần nhất; `null` = chưa chạy lần nào. */
  daChay,
  /** Mã đang nằm trong ô soạn. */
  dangGo,
  /** Có kết quả nào đang hiện hay không. */
  coKetQua,
}: {
  daChay: string | null;
  dangGo: string;
  coKetQua: boolean;
}): boolean {
  // Không có gì đang hiện thì không có xuất xứ nào để nói. Ca thật: bấm Chạy
  // rồi bấm Dừng — `result` về null nhưng `daChay` vẫn giữ mã của lượt TRƯỚC,
  // nên thiếu cổng này thì console rỗng lại đeo thêm băng "kết quả của bản
  // code trước".
  if (!coKetQua) return false;
  if (daChay === null) return false;
  return daChay !== dangGo;
}
