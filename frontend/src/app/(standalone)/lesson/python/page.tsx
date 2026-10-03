import PageStyles from '@/components/PageStyles';
import PythonStudio from '@/components/python-studio/PythonStudio';
import StudioLesson from '@/components/python-studio/StudioLesson';
import { PYTHON_DEMO_PARAM } from '@/lib/python-studio';

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
