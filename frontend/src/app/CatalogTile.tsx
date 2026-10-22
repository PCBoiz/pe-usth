import CourseGlyph, { type GlyphKind } from '@/components/CourseGlyph';

import styles from './home.module.css';

export type TileTag = { text: string; tone?: 'neutral' | 'red' | 'ok' };

/**
 * Thẻ ngang ở trang chủ: biểu tượng bên trái; giữa là tên, mô tả, nhãn; góc phải
 * là mũi tên (khóa học) hoặc biểu tượng mở ra (công cụ). Dùng chung cho cột
 * "Chương trình đào tạo" và cột "Công cụ" để hai nơi luôn cùng kiểu dáng.
 */
export default function CatalogTile({
  href,
  label,
  description,
  tags,
  color,
  accent,
  mark,
  icon,
  external = false,
}: {
  href: string;
  label: string;
  description: string;
  tags: TileTag[];
  color: string;
  accent: string;
  mark: string;
  icon?: GlyphKind;
  /** true: công cụ mở trang riêng — hiện biểu tượng "mở ra" thay vì mũi tên. */
  external?: boolean;
}) {
  const bare = icon === 'ide';
  return (
    <li className={styles.cell}>
      {/* <a> thường (tải lại trang) thay vì next/link: trang chi tiết các
          khóa CSDL nạp script legacy tự gắn sự kiện một lần lúc nạp, đi
          client-side thì chúng không chạy lại (bẫy đã gặp ở ô chấm sao
          — xem comment trong courses/[courseId]/CourseDetail.tsx). */}
      <a className={styles.card} href={href} data-fx>
        <span className={bare ? styles.iconBare : styles.icon}>
          <CourseGlyph color={color} accent={accent} mark={mark} icon={icon} size={bare ? 100 : 60} />
        </span>
        <span className={styles.body}>
          <span className={styles.label}>{label}</span>
          <span className={styles.desc}>{description}</span>
          <span className={styles.tags}>
            {tags.map((tag) => (
              <span
                key={tag.text}
                className={`${styles.tag} ${tag.tone === 'red' ? styles.tagRed : ''} ${tag.tone === 'ok' ? styles.tagOk : ''}`}
              >
                {tag.tone === 'ok' && <span className={styles.dot} aria-hidden="true" />}
                {tag.text}
              </span>
            ))}
          </span>
        </span>
        <span className={styles.go} aria-hidden="true">
          {external ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          )}
        </span>
      </a>
    </li>
  );
}
