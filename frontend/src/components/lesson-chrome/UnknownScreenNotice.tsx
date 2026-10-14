'use client';

// Khối thay thế khi bộ phân tuyến màn KHÔNG nhận ra `kind` / `game.type`.
//
// Vì sao có: trước bản sửa này, nhánh `default` của
// `components/python-studio/screens/index.tsx` trả `null` và switch trong
// `screens/GameScreen.tsx` không có nhánh default nào — một giá trị `kind` sai
// chính tả trong `lessons.content_json` (server không ràng buộc giá trị, xem
// `src/lib/screen-kinds.ts`) biến thành MÀN TRẮNG: người học bấm tiếp mà không
// có gì hiện ra, và không có log nào ở console hay server để lần ra.
//
// Hai việc khối này làm: (1) ghi console.warn kèm giá trị nhận được và tên bài
// để người sửa nội dung biết đi đâu, (2) nói với người học bằng giọng sản
// phẩm — lỗi ở phía chúng tôi, không phải ở họ, và họ đi tiếp được.
//
// Dùng lại ShellB nên KHÔNG thêm file CSS nào.
import { canhBaoManLa } from '@/lib/screen-kinds';

import ShellB from './ShellB';

const ICON_ALERT = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12" y2="17" />
  </svg>
);

export default function UnknownScreenNotice({
  what,
  kind,
  lessonLabel,
  metaLabel,
}: {
  /** "màn" khi lạc ở bộ phân tuyến màn, "mini-game" khi lạc trong GameScreen. */
  what: 'màn' | 'mini-game';
  /** Giá trị thật đọc từ nội dung bài — in ra cả console và cho người học. */
  kind: unknown;
  /** Tên/mã bài để người nhận báo lỗi biết sửa bài nào. */
  lessonLabel?: string;
  metaLabel?: string;
}) {
  // Gọi ngay trong render: màn này chỉ dựng khi đã có dữ liệu sai, nên không có
  // nguy cơ spam log ở đường chạy bình thường.
  console.warn(canhBaoManLa(what, kind, lessonLabel));

  return (
    <ShellB
      eyebrowIcon={ICON_ALERT}
      eyebrowLabel="Lỗi nội dung bài"
      metaLabel={metaLabel}
      title="Màn này chưa hiển thị được"
      description={
        `Chỗ này là lỗi của chúng tôi, không phải do bạn làm sai. Bạn bấm tiếp để sang màn ` +
        `sau được, phần đã làm vẫn được lưu. Nếu báo cho chúng tôi thì nói kèm hai thứ này ` +
        `để sửa nhanh hơn: bài “${lessonLabel && lessonLabel.trim() ? lessonLabel : 'không rõ tên'}”, ` +
        `loại ${what} “${String(kind)}”.`
      }
    />
  );
}
