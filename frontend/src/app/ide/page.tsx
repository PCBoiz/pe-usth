import type { Metadata } from 'next';

import IdeClient from './IdeClient';

// Tiêu đề tab là "Bàn thí nghiệm", không phải "Python IDE": bảng thuật ngữ của
// bản thiết kế v2 chốt MỘT tên cho trình soạn code, và tiêu đề tab là chỗ người
// học đọc tên đó nhiều nhất (nó nằm trong lịch sử, bookmark, thanh tab). Để lẫn
// hai tên thì "Bàn thí nghiệm" ở nav và "Python IDE" ở tab trông như hai trang.
export const metadata: Metadata = {
  title: 'Bàn thí nghiệm – Programming EDU',
  // "sandbox" là từ của người viết code: nó lọt vào đây tiếng Anh nguyên xi, và
  // mô tả này là thứ Google in ra bên dưới liên kết, tức câu đầu tiên nhiều
  // người đọc về trang. "môi trường cách ly" nói đúng cùng một việc bằng tiếng
  // Việt — và trùng với câu đã dùng ở thẻ công cụ trang chủ
  // (`lib/home-copy.ts`, LAB_TILE.description), nên hai chỗ không nói hai kiểu.
  description:
    'Viết và chạy thử mã Python ngay trên trang; mã chạy trong môi trường cách ly trên máy chủ.',
};

export default function IdePage() {
  return <IdeClient />;
}
