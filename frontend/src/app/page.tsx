// Trang chủ `/` — cảnh "GÓC HỌC": một căn phòng lofi, mỗi vật trong phòng là
// một lối vào (laptop → bài học, kệ sách → khoá học, bảng ghim → lộ trình,
// cuốn sổ → ôn tập, kệ cúp → thành tựu, điện thoại → hồ sơ và xếp hạng).
//
// Port từ artifact "Góc học PE" (một app Next 15 đứng riêng). Cảnh là DOM ra
// lệnh, không phải React — xem src/components/goc-hoc/StudyRoom.tsx để biết vì
// sao không viết lại thành React, và engine.js để biết nó làm gì.
//
// Bản dashboard theo Figma trước đây ở đúng đường dẫn này còn nguyên, đã dọn
// sang `/dashboard` để nhóm đối chiếu hai bản.
//
// BA ĐIỀU CHỐT Ở ĐÂY, đừng gỡ mà không đọc hết:
//
//  1. GIÁO TRÌNH DỰNG Ở SERVER, TĨNH. Tám học phần và 48 bài đọc từ
//     `curricula.json` ngay trong component server này rồi truyền xuống, nên
//     khách vãng lai thấy đủ phòng, đủ sách, đủ tên bài mà KHÔNG một lời gọi
//     mạng nào. Cùng nguồn với trang khoá học — xem bẫy "Hai nguồn danh sách
//     bài" trong AGENTS.md: đừng viết cứng số 48 ở đây.
//  2. SỐ CỦA NGƯỜI HỌC LẤY Ở CLIENT, QUA `apiFetchSessionOnly`. Trang này công
//     khai; `apiFetch` gặp 401 là tự tạo tài khoản khách, tức mỗi con bot một
//     tài khoản. StudyRoom.tsx giữ luật đó, đừng gọi API ở đây.
//  3. KHÔNG `PageStyles hrefs={[...]}` NÀO KHÁC RỖNG. Cảnh có CSS riêng
//     (scene.css, import trong StudyRoom.tsx). `PageStyles` ở đây chỉ để lấy
//     @font-face tự lưu trữ của Be Vietnam Pro + JetBrains Mono (PageStyles tự
//     thêm edu-fonts.css vào mọi trang) — thêm edu-theme.css vào thì nó đặt
//     lại nền, phông và `.page` của cả trang và cảnh sẽ lệch.
import type { Metadata } from 'next';

import StudyRoom from '@/components/goc-hoc/StudyRoom';
import PageStyles from '@/components/PageStyles';
import { COURSES } from '@/lib/catalog';
import CURRICULA_JSON from '@/lib/curricula.json';
import type { LessonMetaRow, ModuleRow } from '@/lib/goc-hoc';

const COURSE_ID = 'python_advanced';

export const metadata: Metadata = {
  title: 'Programming EDU — Góc học',
};

export default function HomePage() {
  const course = COURSES.find((c) => c.id === COURSE_ID);
  const curricula = CURRICULA_JSON as unknown as {
    CURRICULA: Record<string, { modules?: ModuleRow[] }>;
    LESSON_META?: Record<string, LessonMetaRow[]>;
  };
  const modules = curricula.CURRICULA[COURSE_ID]?.modules ?? [];
  const meta = curricula.LESSON_META?.[COURSE_ID] ?? [];

  return (
    <>
      <PageStyles hrefs={[]} />
      <StudyRoom
        courseId={COURSE_ID}
        courseName={course?.title ?? 'Python nâng cao'}
        lessonUrl={course?.lessonUrl ?? `/lesson/${COURSE_ID}`}
        modules={modules}
        meta={meta}
      />
    </>
  );
}
