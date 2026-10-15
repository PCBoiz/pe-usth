/**
 * Câu mô tả cho máy tìm kiếm — tách riêng để `node --test` soi được.
 *
 * Vì sao đáng một file: đây là câu Google in ra dưới MỌI liên kết của site.
 * Bản cũ ở `app/layout.tsx` quảng cáo "Python, Java, HTML/CSS và thiết kế cơ
 * sở dữ liệu". Java và HTML/CSS là hai khoá đã bị xoá ở `9bc42c1` — route trả
 * 404 — nên câu đó mời người ta vào một thứ không tồn tại, ở chỗ đông người
 * đọc nhất và cũng là chỗ lâu nhất mới sửa được (phải chờ Google quét lại).
 *
 * Một chuỗi sai trong `metadata` không làm vỡ build, không đỏ test nào, không
 * ai thấy khi xem trang. Đó là lý do nó sống sót qua cả đợt xoá 124 file.
 *
 * File này cố ý KHÔNG import gì — `node --test` không phân giải alias `@/…`,
 * cùng lý do với `home-copy.ts`. Số bài được TRUYỀN VÀO, và `layout.tsx` lấy
 * nó từ danh mục (vốn đếm từ `curricula.json`); viết cứng ở đây là rơi đúng
 * bẫy "hai nguồn danh sách bài" trong AGENTS.md.
 */

/**
 * `lessonCount` ≤ 0 nghĩa là chưa đọc được giáo trình: nói "nhiều bài" chứ
 * không in ra số 0, và cũng không bịa một con số.
 */
export function seoDescription(lessonCount: number): string {
  const soBai = lessonCount > 0 ? `${lessonCount} bài` : 'nhiều bài';
  return (
    `Programming EDU — khoá Advanced Python ${soBai}: đọc lý thuyết, viết code `
    + 'rồi chạy ngay trong trình duyệt, chấm tại chỗ và lưu tiến độ của bạn.'
  );
}
