/**
 * Biểu tượng khóa học vẽ bằng SVG, mỗi loại một hình riêng, dùng màu thương
 * hiệu của khóa (`color` / `accent` trong catalog.ts) — riêng `python` là logo
 * Python chính thức. Không `icon` thì dùng hình mặc
 * định cũ (khối bo góc + vòng tròn + chữ viết tắt).
 *
 * `aria-hidden`: tên khóa đã có ở nhãn bên cạnh, biểu tượng chỉ để trang trí.
 */
export type GlyphKind = 'python' | 'ide';

export default function CourseGlyph({
  color,
  accent,
  mark,
  icon,
  size = 72,
}: {
  color: string;
  accent: string;
  mark: string;
  icon?: GlyphKind;
  size?: number;
}) {
  if (icon === 'python') {
    // Logo Python chính thức (hai con rắn xanh/vàng) — ảnh tĩnh, không tô lại màu.
    return (
      <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true" focusable="false">
        <image href="/static/images/python-logo.png" x="0" y="0" width="72" height="72" />
      </svg>
    );
  }

  if (icon === 'ide') {
    // Ô tối bo góc với dấu nhắc ">_" màu cyan.
    return (
      <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true" focusable="false">
        <rect x="0" y="0" width="72" height="72" rx="16" fill={color} />
        <path d="M17 26l13 10-13 10" fill="none" stroke="#22d3ee" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M36 48h18" fill="none" stroke="#22d3ee" strokeWidth="3.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      <rect x="9" y="9" width="36" height="36" rx="10" fill={accent} opacity="0.92" />
      <circle cx="43" cy="43" r="22" fill={color} opacity="0.95" />
      <text
        x="43"
        y="48.5"
        textAnchor="middle"
        fontSize={mark.length > 2 ? 14 : 17}
        fontWeight="700"
        fontFamily="var(--edu-font), system-ui, sans-serif"
        fill="#fff"
      >
        {mark}
      </text>
    </svg>
  );
}
