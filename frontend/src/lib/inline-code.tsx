// `code nội tuyến` trong dấu backtick → <code>.
//
// VÌ SAO NÓ LÀ MỘT FILE RIÊNG, không nằm trong screens/chrome.tsx như trước:
// ngày 27/10/2026 một người thử gửi ảnh ô "KIẾN THỨC CỐT LÕI ĐÃ HỌC" ở màn
// tổng kết, trong đó có dòng
//
//     `.venv\Scripts\python -m pip install numpy`
//
// — nguyên văn kể cả hai dấu backtick. Nguyên nhân: ô đó lấy ĐOẠN VĂN ĐẦU của
// từng màn đọc làm ý chính (RecapScreen.facts) rồi dựng thẳng `{f}`, trong khi
// màn đọc dựng cùng chuỗi ấy qua `paragraphs()` nên ở đó backtick được bóc.
// Cùng một câu, hai nơi, hai kết quả.
//
// Sửa bằng cách tách hàm ra chỗ cả hai nhánh component dùng được: ô tổng kết
// (`lesson-chrome/exercises/Recap.tsx`) là thứ dùng chung cho MỌI loại bài,
// nên nó không được import ngược vào `components/python-studio/`.
import c from './inline-code.module.css';

/**
 * Chỉ nhận cặp backtick trên CÙNG một dòng: backtick lẻ trong văn bản thường
 * (hiếm, nhưng có) thì để nguyên chứ không nuốt cả đoạn sau nó.
 */
const INLINE_CODE = /`([^`\n]+)`/g;

export function withInlineCode(text: string): React.ReactNode {
  if (!text.includes('`')) return text;
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(INLINE_CODE)) {
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <code key={key++} className={c.inlineCode}>
        {match[1]}
      </code>,
    );
    last = at + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
