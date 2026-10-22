import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import PythonStudio from '@/components/python-studio/PythonStudio';
import StudioLesson from '@/components/python-studio/StudioLesson';
import { PYTHON_DEMO_PARAM } from '@/lib/python-studio';

// Lighthouse SEO chấm 90 trên trang bài học vì thiếu meta description. Tên bài
// chỉ biết được sau khi client tải content_json (bài render ở trình duyệt), nên
// không thể ghép tên bài vào đây mà vẫn giữ trang tĩnh — dùng câu mô tả chung
// cho cả khoá, đã đủ cho thẻ description.
export const metadata: Metadata = {
  title: 'Bài học Python – Programming EDU',
  description:
    'Giáo trình Python 40 bài: đọc hiểu từng dòng, lắp ghép mã rồi tự viết và '
    + 'chạy thử ngay trong trình duyệt, chấm tự động và lưu tiến độ.',
};

const STUDIO_CSS = [
  '/static/css/edu-theme.css',
  '/static/css/studio-tokens.css',
];

// Course links pass a zero-based lesson index; the lessons table numbers rows
// from 1 (sort_order). Mọi bài của khoá (40 bài PE Python v3) render từ
// lessons.content_json bằng StudioLesson. Studio dựng tay List & Mutability
// không còn thuộc giáo trình: chỉ mở được bằng ?demo=list, không ghi tiến độ.
export default async function LessonPythonPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string; demo?: string }>;
}) {
  const { lesson, demo } = await searchParams;
  if (demo === PYTHON_DEMO_PARAM)
    return (
      <>
        <PageStyles hrefs={STUDIO_CSS} />
        <PythonStudio />
      </>
    );

  const index = Number(lesson);
  const sortOrder =
    lesson === undefined || !Number.isInteger(index) || index < 0 ? 1 : index + 1;
  return (
    <>
      <PageStyles hrefs={STUDIO_CSS} />
      <StudioLesson courseId="python" lessonNo={sortOrder} />
    </>
  );
}
