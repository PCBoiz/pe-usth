import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import StudioLesson from '@/components/python-studio/StudioLesson';
import { findCourse } from '@/lib/catalog';
import { lessonSeoDescription } from '@/lib/seo-copy';

// Cùng lý do với /lesson/python: Lighthouse SEO trừ điểm vì thiếu meta
// description, mà tên bài chỉ có sau khi client tải content_json.
export const metadata: Metadata = {
  // Tên khoá lấy đúng tên đang hiển thị ở danh mục (src/lib/catalog.ts):
  // "Advanced Python", không còn chữ "mini-game" trong phần giới thiệu.
  title: 'Bài học Advanced Python – Programming EDU',
  // Câu chữ nằm ở `lib/seo-copy.ts`, và SỐ BÀI ĐẾM TỪ DANH MỤC.
  //
  // 15/10/2026 — trước đó dòng này viết cứng "48 bài" ngay trong `page.tsx`.
  // Hai lý do đổi, cả hai là lỗi đã trả giá trong repo này: (1) bẫy "hai nguồn
  // danh sách bài" — dựng lại pe-v4 là con số lệch im lặng; (2) `metadata` của
  // route KHÔNG phải layout gốc thì không ca nào soi, nên nhồi gì vào đây cũng
  // xanh — đúng con đường mà câu "Python, Java, HTML/CSS" (hai khoá đã 404)
  // sống qua cả đợt xoá 124 file.
  description: lessonSeoDescription(findCourse('python_advanced')?.lessons ?? 0),
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
