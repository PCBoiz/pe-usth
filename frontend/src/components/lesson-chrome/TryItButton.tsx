// Nút "Thử ngay trong IDE" dưới một khối code — đúng kiểu "Try it Yourself" của
// W3Schools: đọc xong ví dụ là có chỗ gõ lại ngay, không phải tự chép tay.
//
// Mở Ở TAB MỚI, và đó là một lựa chọn: bài học giữ nguyên màn đang xem, nháp
// trong localStorage và tiến độ. Điều hướng ngay trong tab sẽ rời khỏi bài.
//
// Mã đi theo FRAGMENT của địa chỉ (`/ide#code=…`), không phải query — lý do dài
// nên viết ở src/lib/ide-handoff.ts. Đây là một <a> thuần: bấm giữa chuột, mở
// bằng chuột phải, copy dán đường dẫn đều ra đúng đoạn mã, và không có form nào
// phải nộp.
import { ideCodeHref } from '@/lib/ide-handoff';

import styles from './TryItButton.module.css';

export interface TryItButtonProps {
  /** Mã nạp sẵn vào editor. Rỗng/quá dài → không render gì (xem ideCodeHref). */
  code?: string;
  label?: string;
  /** Thêm lề trên — dùng khi khối bên trên không cách bằng `gap` của flex. */
  spaced?: boolean;
}

export default function TryItButton({
  code,
  label = 'Thử ngay trong IDE',
  spaced,
}: TryItButtonProps) {
  // Bài quy trình (dựng môi trường, Git) không có mã, và mã dài quá trần thì
  // không bàn giao được: cả hai trường hợp KHÔNG hiện nút, chứ không mở một IDE
  // trắng rồi để người học đoán vì sao mã của bài không có ở đó.
  const href = code ? ideCodeHref(code) : null;
  if (!href) return null;
  return (
    <p className={spaced ? styles.rowSpaced : styles.row}>
      <a
        className={styles.button}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title="Mở Python IDE ở tab mới — bài học giữ nguyên tiến độ, đoạn mã này đã nạp sẵn trong trình soạn thảo"
      >
        {label}
        <span aria-hidden="true">↗</span>
      </a>
    </p>
  );
}
