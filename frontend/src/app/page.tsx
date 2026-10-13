// Trang chủ: lưới biểu tượng của mọi khóa học, bấm vào để mở trang chi tiết.
// Dữ liệu từ danh mục tĩnh (src/lib/catalog.ts) — không gọi API vì mọi route
// /api/courses* đều đòi đăng nhập mà frontend không còn trang đăng nhập.
//
// Từ 13/10/2026 danh mục chỉ còn Python Advanced: buổi dùng thử chỉ xoay quanh
// khóa đó, các thẻ khác dẫn vào khóa dựng nửa vời (xem catalog.ts).
import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { COURSES, TOOLS } from '@/lib/catalog';
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
        <SiteHeader />
        <main className={styles.main}>
          <h1 className={styles.title}>Khóa học</h1>
          <p className={styles.sub}>Chọn một khóa để xem giáo trình chi tiết.</p>

          <ul className={styles.grid}>
            {COURSES.map((course) => (
              <CatalogTile
                key={course.id}
                href={`/courses/${course.id}`}
                label={course.label}
                color={course.color}
                accent={course.accent}
                mark={course.mark}
              />
            ))}
          </ul>

          {/* Công cụ nằm NGOÀI lưới khóa học: không phải khóa, không ảnh hưởng
              tiến độ/XP/đăng ký. Mặc định có đúng một mục (Python IDE); tắt bằng
              NEXT_PUBLIC_IDE_ENABLED=off thì danh sách rỗng, và khi rỗng phải bỏ
              luôn cả tiêu đề — không để một mục "Công cụ" trống trơ trên trang. */}
          {TOOLS.length > 0 && (
            <>
              <h2 className={styles.sectionTitle}>Công cụ</h2>
              <ul className={styles.grid}>
                {TOOLS.map((tool) => (
                  <CatalogTile
                    key={tool.id}
                    href={tool.href}
                    label={tool.label}
                    color={tool.color}
                    accent={tool.accent}
                    mark={tool.mark}
                  />
                ))}
              </ul>
            </>
          )}

          {/* Lối góp ý cho buổi thử nghiệm với giảng viên và sinh viên USTH
              (14/10/2026). CHỈ đặt ở trang chủ — gắn ở cuối bài hay trong khung
              bài học thì chen ngang lúc người ta đang học.

              Ẩn hẳn khi chưa đặt NEXT_PUBLIC_FEEDBACK_URL hoặc giá trị không
              phải URL http/https: xem feedbackHref() để biết vì sao thà không
              có thẻ còn hơn có nút bấm vào không đi đâu. */}
          {feedback && (
            <section className={styles.feedback} aria-labelledby="feedbackTitle">
              <h2 className={styles.feedbackTitle} id="feedbackTitle">
                Góp ý cho chúng tôi
              </h2>
              <p className={styles.feedbackText}>
                Khảo sát ẩn danh, mất khoảng 3–5 phút. Ý kiến của bạn cho chúng tôi
                biết phần nào đang khó học.
              </p>
              {/* Tab mới để người đang học không mất chỗ; rel="noopener
                  noreferrer" vì đây là tên miền ngoài (Google Forms). */}
              <a
                className={styles.feedbackButton}
                href={feedback}
                target="_blank"
                rel="noopener noreferrer"
              >
                Viết đánh giá
              </a>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
