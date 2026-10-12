// Trang chi tiết khóa học. Danh mục tĩnh từ 13/10/2026 chỉ còn python_advanced
// (xem src/lib/catalog.ts), nên route động này thực tế chỉ sinh ra
// /courses/python_advanced; cpp/java/htmlcss đã rời danh mục nên thành 404.
// Ba khóa db_design* có route tĩnh riêng (courses/db_design*/page.tsx) và được
// Next ưu tiên trước route động này — mở bằng đường dẫn trực tiếp vẫn chạy.
//
// Server component: chỉ tra danh mục tĩnh để dựng <title>/description và trả 404
// cho mã khóa lạ. Phần tương tác (accordion giáo trình, chấm sao) ở CourseDetail.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { COURSES, findCourse } from '@/lib/catalog';

import CourseDetail from './CourseDetail';

// Mã khóa ngoài danh mục là 404 ngay, không chạy tới client rồi tự chuyển hướng.
export const dynamicParams = false;

export function generateStaticParams() {
  // Lọc db_design* không còn khớp gì (chúng đã rời danh mục) nhưng vẫn giữ: nếu
  // sau này đưa một khóa db_design trở lại `COURSES`, route động mà sinh ra
  // /courses/db_design thì đụng đúng đường dẫn của route tĩnh có sẵn.
  return COURSES.filter((c) => !c.id.startsWith('db_design')).map((c) => ({ courseId: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const course = findCourse((await params).courseId);
  if (!course) return {};
  return {
    title: `${course.title} – Programming EDU`,
    description: course.description,
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  if (!findCourse(courseId)) notFound();
  return <CourseDetail courseId={courseId} />;
}
