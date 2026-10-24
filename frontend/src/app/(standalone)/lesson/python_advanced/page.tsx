import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import StudioLesson from '@/components/python-studio/StudioLesson';

// Cùng lý do với /lesson/python: Lighthouse SEO trừ điểm vì thiếu meta
// description, mà tên bài chỉ có sau khi client tải content_json.
export const metadata: Metadata = {
  // Tên khoá lấy đúng tên đang hiển thị ở danh mục (src/lib/catalog.ts). Khoá
  // nay là 172 bài giáo trình ĐỌC (pe-da), không còn 48 bài mini-game của
  // pe-v4 — mô tả cũ ghi "ghép cặp, đúng/sai, dò lỗi và trận Boss" là những
  // thứ bộ mới không có một cái nào.
  title: 'Bài học Python cho Data Analyst – Programming EDU',
  description:
    'Python cho Data Analyst: 172 bài từ phép cộng đầu tiên tới NumPy, pandas '
    + 'và trực quan hoá — đọc lời giảng, xem code kèm kết quả rồi chạy lại ngay '
    + 'trong trình duyệt.',
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
