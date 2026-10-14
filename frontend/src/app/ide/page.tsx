import type { Metadata } from 'next';

import IdeClient from './IdeClient';

// Tiêu đề tab là "Bàn thí nghiệm", không phải "Python IDE": bảng thuật ngữ của
// bản thiết kế v2 chốt MỘT tên cho trình soạn code, và tiêu đề tab là chỗ người
// học đọc tên đó nhiều nhất (nó nằm trong lịch sử, bookmark, thanh tab). Để lẫn
// hai tên thì "Bàn thí nghiệm" ở nav và "Python IDE" ở tab trông như hai trang.
export const metadata: Metadata = {
  title: 'Bàn thí nghiệm – Programming EDU',
  description: 'Viết và chạy thử mã Python ngay trên trang, chạy trong sandbox cách ly trên máy chủ.',
};

export default function IdePage() {
  return <IdeClient />;
}
