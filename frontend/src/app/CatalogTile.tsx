import CourseGlyph, { type GlyphKind } from '@/components/CourseGlyph';

import styles from './home.module.css';

/**
 * Thẻ ngang ở trang chủ: biểu tượng bên trái; giữa là tên, mô tả, nhãn; góc phải
 * là mũi tên (khoá) hoặc biểu tượng mở ra (công cụ). Dùng chung cho khối
 * "Khoá đang mở" và khối "Công cụ" để hai nơi luôn cùng kiểu dáng.
 *
 * 15/10/2026 — `tags` nay là mảng CHUỖI, không còn `tone: 'red' | 'ok'`:
 *  · hai biến thể màu đó trượt tương phản AA (đo bằng scratchpad/ds-audit:
 *    đỏ `#e5334b` trên nền đỏ nhạt chỉ 3,72:1 bản ngày và 3,41:1 bản đêm; xanh
 *    `#059669` trên nền xanh nhạt 3,33:1 và 3,75:1 — chữ thường cần ≥ 4,5:1);
 *  · và bản thiết kế chốt nhãn chỉ có hai biến thể (đặc / viền), màu dùng để
 *    MÃ HOÁ NGỮ NGHĨA chứ không để trang trí. "Nâng cao" không phải cảnh báo
 *    nên không có lý do gì nó màu đỏ.
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
  tags: string[];
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
          khoá CSDL nạp script legacy tự gắn sự kiện một lần lúc nạp, đi
          client-side thì chúng không chạy lại.
          `data-catalog-tile` là chỗ bám của e2e (đếm "còn đúng một ô khoá"):
          đếm theo `a[href^="/courses/"]` thì thẻ gợi ý bên cột phải — cũng trỏ
          vào /courses/… — bị tính lẫn vào. */}
      <a className={styles.card} href={href} data-catalog-tile="1" data-fx>
        <span className={bare ? styles.iconBare : styles.icon}>
          <CourseGlyph color={color} accent={accent} mark={mark} icon={icon} size={bare ? 100 : 60} />
        </span>
        <span className={styles.body}>
          <span className={styles.label}>{label}</span>
          <span className={styles.desc}>{description}</span>
          <span className={styles.tags}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
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
