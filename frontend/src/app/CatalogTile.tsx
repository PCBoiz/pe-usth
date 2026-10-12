import type { ReactNode } from 'react';

import CourseGlyph from '@/components/CourseGlyph';

import styles from './home.module.css';

/**
 * Thẻ ở trang chủ: ô trắng bo góc chứa biểu tượng hai lớp màu, nhãn bên dưới.
 * Dùng chung cho lưới khóa học và mục Công cụ để hai nơi luôn cùng kiểu dáng.
 */
export default function CatalogTile({
  href,
  label,
  color,
  accent,
  mark,
  children,
}: {
  href: string;
  label: string;
  color: string;
  accent: string;
  mark: string;
  children?: ReactNode;
}) {
  return (
    <li className={styles.cell}>
      {/* <a> thường (tải lại trang) thay vì next/link: trang chi tiết các
          khóa CSDL nạp script legacy tự gắn sự kiện một lần lúc nạp, đi
          client-side thì chúng không chạy lại (bẫy đã gặp ở ô chấm sao
          — xem comment trong courses/[courseId]/CourseDetail.tsx). */}
      <a className={styles.tile} href={href}>
        <span className={styles.icon}>
          <CourseGlyph color={color} accent={accent} mark={mark} />
        </span>
        <span className={styles.label}>{label}</span>
        {children}
      </a>
    </li>
  );
}
