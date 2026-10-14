// Trang "Ôn tập của tôi" (/practice) — viết lại từ đầu 15/10/2026.
//
// Trang /practice cũ bị xoá ở cd9c05a vì nó import HeaderBar, PeRouterBridge và
// Sidebar — cả ba đã bị gỡ khỏi dự án cùng với giao diện đăng nhập. Bản này
// không dùng lại gì của nó; hợp đồng dữ liệu với backend thì giữ (xem khối chú
// thích đầu src/lib/practice-plan.ts), kèm một chỗ SỬA: trang cũ gửi NỘI DUNG
// phương án làm câu trả lời, mà backend so với `q.correct` là CHỈ SỐ — nên mọi
// câu đều bị tính sai và điểm luôn 0.
//
// Server component: chỉ dựng <title>/description. Toàn bộ phần tương tác (gọi
// API có JWT, chọn phương án, chấm) nằm ở PracticeClient.
import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';

import PracticeClient from './PracticeClient';

// Cùng tổ hợp CSS với trang bài học: edu-theme.css cho font và token --edu-*,
// studio-tokens.css cho bảng token màu/cỡ chữ v2 (--ds-*) mà trang này dùng.
// studio-tokens.css chỉ khai biến, không có quy tắc nào, nên nạp ở đây không
// đụng tới bố cục của trang bài học.
const PRACTICE_CSS = ['/static/css/edu-theme.css', '/static/css/studio-tokens.css'];

export const metadata: Metadata = {
  title: 'Ôn tập của tôi – Programming EDU',
  description:
    'Ôn lại những câu bạn đã làm trong khoá Advanced Python: hệ thống lấy nhiều câu hơn '
    + 'từ những bài bạn hay chọn sai, chấm ngay và giải thích đáp án.',
};

export default function PracticePage() {
  return (
    <>
      <PageStyles hrefs={PRACTICE_CSS} />
      <PracticeClient />
    </>
  );
}
