// Màn "Thử thách ôn" (/practice/challenge) — chế độ ôn một-câu-một-lần của
// trang "Ôn tập của tôi".
//
// Vì sao là route con của /practice chứ không phải một trang riêng ngang hàng:
// nó dùng ĐÚNG hạ tầng của /practice (cùng ba đường backend, cùng cổng "phải
// xong 2 bài", cùng cách gửi câu trả lời — xem src/lib/practice-plan.ts) và chỉ
// đổi luật chơi. Đặt dưới /practice để đường dẫn nói đúng quan hệ đó, và để
// người học luôn có lối về "Ôn tập của tôi".
//
// Server component: chỉ dựng <title>/description. Toàn bộ phần tương tác (gọi
// API có JWT, chốt từng câu, lượt nghĩ lại) nằm ở ChallengeClient.
import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';

import ChallengeClient from './ChallengeClient';

// Cùng tổ hợp CSS với /practice và trang bài học: edu-theme.css cho font và
// token --edu-*, studio-tokens.css cho bảng token màu/cỡ chữ v2 (--ds-*).
// studio-tokens.css chỉ khai biến, không có quy tắc nào.
const CHALLENGE_CSS = ['/static/css/edu-theme.css', '/static/css/studio-tokens.css'];

export const metadata: Metadata = {
  title: 'Thử thách ôn – Programming EDU',
  // Một câu, không dẫn dắt. Câu cũ kể luật chơi rồi liệt kê ba thứ hệ thống
  // KHÔNG làm — đúng khuôn đã cắt khắp sản phẩm ngày 15/10.
  description: 'Ôn lại các câu trắc nghiệm của khoá Advanced Python.',
};

export default function ChallengePage() {
  return (
    <>
      <PageStyles hrefs={CHALLENGE_CSS} />
      <ChallengeClient />
    </>
  );
}
