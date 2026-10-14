'use client';

// Route động /lesson/[courseId] — port logic _LESSON_TEMPLATES/_LESSON_URLS
// của main.py lesson_view():
//   db_design | db_design_tc | db_design_nc → lesson_db_design.html (LessonDbDesign)
//   khác                                    → redirect /courses/<id>
// (python_advanced có route TĨNH riêng — Next ưu tiên static trước dynamic.)
//
// 15/10/2026 — bỏ bảng LESSON_URLS. Nó chỉ còn một dòng `cpp → /interface`, mà
// /interface (mission "Cứu nguy Robot" của khoá cpp) đã xoá cùng đợt dọn route
// chết: khoá cpp không còn trong danh mục, không còn link nào trỏ tới, và trang
// đó vẫn vẽ huy hiệu chuỗi ngày đã bị gỡ khỏi bài học thật. Mọi khoá không phải
// db_design giờ về chung một lối: /courses/<id>.
import { use, useEffect } from 'react';

import LessonDbDesign from '@/components/LessonDbDesign';
import PageStyles from '@/components/PageStyles';

const DB_COURSES = ['db_design', 'db_design_tc', 'db_design_nc'];

export default function LessonDispatchPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const isDb = DB_COURSES.includes(courseId);

  useEffect(() => {
    if (!isDb) {
      window.location.replace(`/courses/${courseId}`);
    }
  }, [courseId, isDb]);

  if (!isDb) return null;
  return (
    <>
      <PageStyles hrefs={['/static/css/lesson_db_design.css', '/static/css/edu-theme.css', '/static/css/edu-db.css']} />
      <LessonDbDesign courseId={courseId} />
    </>
  );
}
