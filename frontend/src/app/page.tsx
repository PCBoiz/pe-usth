// Trang chủ: lưới biểu tượng của mọi khóa học, bấm vào để mở trang chi tiết.
// Dữ liệu từ danh mục tĩnh (src/lib/catalog.ts) — không gọi API vì mọi route
// /api/courses* đều đòi đăng nhập mà frontend không còn trang đăng nhập.
import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { COURSES, TOOLS } from '@/lib/catalog';

import CatalogTile from './CatalogTile';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: 'Programming EDU — Khóa học',
};

export default function HomePage() {
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
              tiến độ/XP/đăng ký. Danh sách rỗng (IDE đang tắt) thì bỏ luôn cả
              tiêu đề, không để một mục "Công cụ" trống trơ trên trang chủ. */}
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
        </main>
      </div>
    </>
  );
}
