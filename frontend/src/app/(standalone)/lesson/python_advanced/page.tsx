import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import StudioLesson from '@/components/python-studio/StudioLesson';

// Cùng lý do với /lesson/python: Lighthouse SEO trừ điểm vì thiếu meta
// description, mà tên bài chỉ có sau khi client tải content_json.
export const metadata: Metadata = {
  // Tên khoá lấy đúng tên đang hiển thị ở danh mục (src/lib/catalog.ts):
  // "Advanced Python", không còn chữ "mini-game" trong phần giới thiệu. Số bài
  // là 48 (giáo trình pe-v4), mô tả cũ còn ghi 40 từ thời pe-v3.
  title: 'Bài học Advanced Python – Programming EDU',
  description:
    // "bài tổng hợp chặng", KHÔNG phải "trận Boss": bảng thuật ngữ đã bỏ hẳn ẩn
    // dụ đánh trận (trái triết lý tự học), và chuỗi này là chuỗi NGƯỜI DÙNG
    // THẤY — nó đi vào thẻ meta description, tức vào cả kết quả tìm kiếm.
    'Advanced Python: 48 bài luyện tập — ghép cặp, đúng/sai, dò lỗi và bài '
    + 'tổng hợp cuối chặng, chấm ngay trong trình duyệt.',
};

const STUDIO_CSS = [
  '/static/css/edu-theme.css',
  '/static/css/studio-tokens.css',
];

// Khoá Python Advanced: cùng 40 bài PE v3 nhưng nội dung là studio-lesson/v2
// (mini-game sinh bởi scripts/pe-v3/build_advanced.py). Link từ trang khoá học
// truyền chỉ số bài 0-based; bảng lessons đánh số từ 1 (sort_order).
export default async function LessonPythonAdvancedPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { lesson } = await searchParams;
  const index = Number(lesson);
  const sortOrder =
    lesson === undefined || !Number.isInteger(index) || index < 0 ? 1 : index + 1;
  return (
    <>
      <PageStyles hrefs={STUDIO_CSS} />
      <StudioLesson courseId="python_advanced" courseName="Python Advanced" lessonNo={sortOrder} />
    </>
  );
}
