// Trang chủ: hai cột — "Chương trình đào tạo" (khóa học) và "Công cụ" — rồi thẻ góp ý.
// Dữ liệu từ danh mục tĩnh (src/lib/catalog.ts) — không gọi API vì mọi route
// /api/courses* đều đòi đăng nhập mà frontend không còn trang đăng nhập.
//
// Từ 13/10/2026 danh mục chỉ còn Python Advanced: buổi dùng thử chỉ xoay quanh
// khóa đó, các thẻ khác dẫn vào khóa dựng nửa vời (xem catalog.ts).
import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { COURSES, LEVEL_LABEL, TOOLS } from '@/lib/catalog';
import { feedbackFormHref } from '@/lib/feedback-link';

import CatalogTile from './CatalogTile';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: 'Programming EDU — Khóa học',
};

export default function HomePage() {
  const feedback = feedbackFormHref();

  return (
    <>
      <PageStyles hrefs={['/static/css/edu-theme.css']} />
      {/* .page cao tối thiểu bằng khung nhìn: style.css (đặt min-height cho body)
          không nạp ở trang này, body co theo nội dung thì nền gradient bị đứt
          một đường ngang ở đáy khối nội dung. */}
      <div className={styles.page}>
        <SiteHeader wide />
        <main className={styles.main}>
          <h1 className={styles.title}>Khóa học</h1>
          <p className={styles.sub}>Chọn một khóa để xem giáo trình chi tiết.</p>

          <div className={styles.cols}>
            <section className={styles.col} aria-labelledby="programTitle">
              <h2 className={styles.pill} id="programTitle">
                Chương trình đào tạo
              </h2>
              <ul className={styles.list}>
                {COURSES.map((course) => (
                  <CatalogTile
                    key={course.id}
                    href={`/courses/${course.id}`}
                    label={course.label}
                    description={course.subtitle}
                    tags={[
                      { text: 'Python 3.12' },
                      { text: LEVEL_LABEL[course.level], tone: 'red' },
                    ]}
                    color={course.color}
                    accent={course.accent}
                    mark={course.mark}
                    icon={course.icon}
                  />
                ))}
              </ul>
            </section>

            {/* Công cụ nằm NGOÀI cột khóa học: không phải khóa, không ảnh hưởng
                tiến độ/XP/đăng ký. Mặc định có đúng một mục (Python IDE); tắt bằng
                NEXT_PUBLIC_IDE_ENABLED=off thì danh sách rỗng, và khi rỗng phải bỏ
                luôn cả cột — không để một mục "Công cụ" trống trơ trên trang. */}
            {TOOLS.length > 0 && (
              <section className={styles.col} aria-labelledby="toolsTitle">
                <div className={styles.colHead}>
                  <h2 className={styles.sectionTitle} id="toolsTitle">
                    Công cụ
                  </h2>
                  <span className={styles.colNote}>Môi trường thực hành trực tuyến</span>
                </div>
                <ul className={styles.list}>
                  {TOOLS.map((tool) => (
                    <CatalogTile
                      key={tool.id}
                      href={tool.href}
                      label={tool.label}
                      description="Viết và chạy code Python ngay trong trình duyệt, xem kết quả tức thì."
                      tags={[
                        { text: 'Sẵn sàng sử dụng', tone: 'ok' },
                        { text: 'Web Compiler' },
                      ]}
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
                  Góp ý cho chúng tôi
                </h2>
                <p className={styles.feedbackText}>
                  Khảo sát ẩn danh, mất khoảng 3–5 phút. Ý kiến của bạn cho chúng tôi
                  biết phần nào đang khó học.
                </p>
              </div>
              {/* Tab mới để người đang học không mất chỗ; rel="noopener
                  noreferrer" vì đây là tên miền ngoài (Google Forms). */}
              <a
                className={styles.feedbackButton}
                href={feedback}
                target="_blank"
                rel="noopener noreferrer"
              >
                Viết đánh giá
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
            </section>
          )}
        </main>
        <footer className={styles.footer}>
          © 2026 Programming EDU. Học lập trình trực quan và hiệu quả.
        </footer>
      </div>
    </>
  );
}
