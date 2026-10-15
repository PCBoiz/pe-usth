// Trang chủ — dựng lại theo bản thiết kế `design/project/Main.dc.html`
// ("bản đồ thế giới") và `design-system-v2.md`.
//
// Bố cục: hero (nhãn · tiêu đề · câu dẫn) → cột trái "Khoá đang mở" + "Công cụ"
// → cột phải thẻ gợi ý bước tiếp + khối ghi chú trung thực → thẻ góp ý.
//
// BỐN ĐIỀU BẢN THIẾT KẾ CHỐT, GIỮ Ở ĐÂY (đổi đi là đổi hành vi người dùng thấy):
//
//  1. KHÔNG GỌI API, nên cũng không có chỉ số nào. Trang này công khai: gọi
//     `apiFetch` mà gặp 401 thì nó rơi xuống `ensureGuest()` (src/lib/api.ts) —
//     mỗi con bot quét web sinh một tài khoản `@guest.local` và ăn một suất của
//     THROTTLE_GUEST_LIMIT (120 lượt/giờ/IP). Cần đọc phiên ở trang công khai
//     thì dùng `apiFetchSessionOnly`; ở ĐÂY thì không cần gì cả, vì danh mục là
//     tĩnh. Hệ quả cố ý: trang chủ không biết người xem học tới đâu, nên nó
//     KHÔNG hiện tiến độ — và cũng không bịa ra chỉ số nào để lấp chỗ trống.
//  2. KHÔNG CHUỖI NGÀY, không ngọn lửa, không "5/7 ngày". Chỉ số nào hiện ra
//     cũng phải là loại CHỈ TĂNG; chuỗi bị đứt là thứ đẩy người học bỏ cuộc.
//  3. KHÔNG KHOÁ GÌ: không ổ khoá, không "mở khi đủ N bài". Câu dẫn nói thẳng
//     rằng chặng nào cũng vào được.
//  4. THẺ GỢI Ý CÓ ĐỦ BỐN PHẦN: nhãn · tiêu đề · "Vì sao bài này" · nút chính,
//     rồi vạch ngăn + "Đây là gợi ý, không phải lệnh" + lối ra "Tự chọn bài".
//     Thiếu "Vì sao" và thiếu lối ra thì gợi ý thành lệnh.
//
// Câu chữ và các quyết định nằm ở `src/lib/home-copy.ts` (có test:
// `e2e/unit/home-page.test.mjs`); file này chỉ dựng DOM.
import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { COURSES, LEVEL_LABEL, TOOLS } from '@/lib/catalog';
import CURRICULA_JSON from '@/lib/curricula.json';
import { feedbackFormHref } from '@/lib/feedback-link';
import {
  courseEyebrow,
  courseShape,
  courseTileTags,
  FEEDBACK,
  footerLine,
  INTRO,
  LAB_TILE,
  nextStep,
  SECTIONS,
  type ModuleLike,
} from '@/lib/home-copy';

import CatalogTile from './CatalogTile';
import styles from './home.module.css';

const CURRICULA = CURRICULA_JSON.CURRICULA as Record<string, { modules?: ModuleLike[] }>;

export const metadata: Metadata = {
  title: 'Programming EDU — Khoá học',
};

export default function HomePage() {
  const feedback = feedbackFormHref();
  // Khoá dẫn đầu danh mục; 13/10/2026 danh mục chỉ còn Advanced Python.
  const headCourse = COURSES[0];
  const modules = headCourse ? CURRICULA[headCourse.id]?.modules ?? [] : [];
  const shape = courseShape(modules);
  const step = headCourse
    ? nextStep({
      courseId: headCourse.id,
      lessonUrl: headCourse.lessonUrl,
      firstLesson: modules[0]?.lessons[0],
    })
    : null;

  return (
    <>
      <PageStyles hrefs={['/static/css/edu-theme.css']} />
      {/* .page cao tối thiểu bằng khung nhìn: style.css (đặt min-height cho body)
          không nạp ở trang này, body co theo nội dung thì nền gradient bị đứt
          một đường ngang ở đáy khối nội dung. */}
      <div className={styles.page}>
        <SiteHeader wide />
        <main className={styles.main}>
          <header className={styles.hero}>
            {headCourse && (
              <p className={styles.eyebrow}>{courseEyebrow(headCourse.label, shape)}</p>
            )}
            <h1 className={styles.title}>{INTRO.title}</h1>
            <p className={styles.lead}>{INTRO.lead}</p>
          </header>

          <div className={styles.cols}>
            <div className={styles.col}>
              <section aria-labelledby="programTitle">
                <h2 className={styles.pill} id="programTitle">
                  {SECTIONS.course}
                </h2>
                <ul className={styles.list}>
                  {COURSES.map((course) => (
                    <CatalogTile
                      key={course.id}
                      href={`/courses/${course.id}`}
                      label={course.label}
                      description={course.subtitle}
                      tags={courseTileTags(
                        course.id === headCourse?.id ? shape : courseShape(CURRICULA[course.id]?.modules),
                        LEVEL_LABEL[course.level],
                      )}
                      color={course.color}
                      accent={course.accent}
                      mark={course.mark}
                      icon={course.icon}
                    />
                  ))}
                </ul>
              </section>

              {/* Công cụ nằm NGOÀI cột khoá: không phải khoá, không ảnh hưởng
                  tiến độ/XP/ghi danh. Mặc định có đúng một mục (Bàn thí nghiệm);
                  tắt bằng NEXT_PUBLIC_IDE_ENABLED=off thì danh sách rỗng, và khi
                  rỗng phải bỏ luôn cả khối — không để một mục "Công cụ" trống
                  trơ trên trang. */}
              {TOOLS.length > 0 && (
                <section aria-labelledby="toolsTitle">
                  <div className={styles.colHead}>
                    <h2 className={styles.pill} id="toolsTitle">
                      {SECTIONS.tool}
                    </h2>
                    <span className={styles.colNote}>{SECTIONS.toolNote}</span>
                  </div>
                  <ul className={styles.list}>
                    {TOOLS.map((tool) => (
                      <CatalogTile
                        key={tool.id}
                        href={tool.href}
                        label={tool.label}
                        description={LAB_TILE.description}
                        tags={[...LAB_TILE.tags]}
                        color={tool.color}
                        accent={tool.accent}
                        mark={tool.mark}
                        icon={tool.icon}
                        external
                      />
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className={styles.aside} aria-label="Việc tiếp theo">
              {step && (
                <section className={styles.next} aria-labelledby="nextTitle">
                  {/* Tên bài, rồi nút. Bản cũ có thêm bốn lớp chú giải
                      quanh đúng cái nút này — xem lý lẽ cắt bỏ ở đầu khối
                      `nextStep` trong `lib/home-copy.ts`. */}
                  <h2 className={styles.nextTitle} id="nextTitle">{step.title}</h2>
                  <a className={styles.nextCta} href={step.ctaHref}>
                    {step.ctaLabel}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
                  </a>
                </section>
              )}

            </aside>
          </div>

          {/* Lối góp ý cho buổi thử nghiệm với giảng viên và sinh viên USTH
              (14/10/2026). CHỈ đặt ở trang chủ — gắn ở cuối bài hay trong khung
              bài học thì chen ngang lúc người ta đang học.

              Ẩn hẳn khi chưa đặt NEXT_PUBLIC_FEEDBACK_URL hoặc giá trị không
              phải URL http/https: xem feedbackHref() để biết vì sao thà không
              có thẻ còn hơn có nút bấm vào không đi đâu. */}
          {feedback && (
            <section className={styles.feedback} aria-labelledby="feedbackTitle">
              <div className={styles.feedbackBody}>
                <h2 className={styles.feedbackTitle} id="feedbackTitle">
                  <span className={styles.feedbackIcon} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /><path d="M8 9h8M8 13h5" /></svg>
                  </span>
                  {FEEDBACK.title}
                </h2>
                <p className={styles.feedbackText}>{FEEDBACK.text}</p>
              </div>
              {/* Tab mới để người đang học không mất chỗ; rel="noopener
                  noreferrer" vì đây là tên miền ngoài (Google Forms). */}
              <a
                className={styles.feedbackButton}
                href={feedback}
                target="_blank"
                rel="noopener noreferrer"
              >
                {FEEDBACK.cta}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" /></svg>
              </a>
            </section>
          )}
        </main>
        {/* Câu chân trang ở `home-copy.ts` (có test), và NĂM lấy từ đồng hồ chứ
            không viết cứng "2026" như bản cũ. Trang này là trang tĩnh render ở
            server, nên `getFullYear()` chạy lúc DỰNG, không phải lúc người xem
            mở — tức năm đi theo mỗi lần deploy. Vẫn đúng hơn một con số chép
            tay, vốn chỉ đổi khi có ai nhớ ra mà sửa. */}
        <footer className={styles.footer}>
          {footerLine(new Date().getFullYear(), headCourse?.label)}
        </footer>
      </div>
    </>
  );
}
