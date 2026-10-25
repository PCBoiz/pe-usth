// Logic thuần của lượt NẠP BÀI HỌC. Tách khỏi useLessonData.ts vì logic nằm
// trong hook là logic không có test — cùng lý lẽ với src/lib/ide-runner.ts.

/**
 * Lỗi này có phải "chưa ghi danh khoá học" (HTTP 403) hay không?
 *
 * VÌ SAO CẦN: ba lượt gọi lúc mở bài — `/api/user`, `/api/enrolled`,
 * `/content` — nay chạy SONG SONG (đo trên production: tuần tự mất 3,7 giây,
 * song song còn ~1,3 giây). Nhưng với người MỚI thì `/content` trả 403 vì họ
 * chưa ghi danh, và 403 ở đó KHÔNG phải lỗi: nhánh ghi danh ngay sau đó lo, rồi
 * mới gọi lại content. Phải phân biệt được 403-đó-là-bình-thường với mọi lỗi
 * khác, nếu không thì một 500 thật cũng bị nuốt và người học nhìn màn hình trống
 * mà không ai biết vì sao.
 *
 * Nhận diện bằng HAI dấu hiệu vì mỗi dấu hiệu một mình đều mong manh: helper
 * `json()` dựng Error từ *thông điệp* của backend, nên khi backend có message
 * thì chuỗi "403" KHÔNG xuất hiện; còn khi không có message thì nó mới ghép
 * `(403)`. Thiếu một trong hai là lúc nào đó nuốt sai hoặc ném sai.
 */
export function la403ChuaGhiDanh(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // `\b403\b` chứ không `includes('403')`: một bài có sortOrder 403, hay một
  // thông điệp chứa "4030", không được tính là 403.
  if (/\b403\b/.test(error.message)) return true;
  // Câu của ForbiddenException trong lessons.service.ts. So không phân biệt dấu
  // hoa/thường, và chỉ lấy phần cốt lõi để sửa câu chữ không làm vỡ phép nhận.
  return /chưa đăng ký khóa học/i.test(error.message);
}
