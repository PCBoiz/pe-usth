// Dịch từ màn Stitch "3. ORDER — Sắp xếp luồng lệnh". Bản gốc kéo-thả tự do;
// ở đây dùng nút lên/xuống cho từng dòng — cùng kết quả sắp xếp lại thứ tự,
// thao tác được cả bằng bàn phím/chạm thay vì chỉ con trỏ chuột.
import styles from './exercises.module.css';

export interface OrderStepItem {
  id: string;
  content: React.ReactNode;
}

export interface OrderStepsProps {
  items: OrderStepItem[];
  onMove: (index: number, direction: -1 | 1) => void;
}

export default function OrderSteps({ items, onMove }: OrderStepsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--ds-card)',
            border: '1px solid var(--ds-line)',
            borderRadius: 10,
            padding: '10px 14px',
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--ds-violet-tint)',
              color: 'var(--ds-violet-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--ds-fs-label)',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {i + 1}
          </span>
          <code style={{ flex: 1, fontSize: 'var(--ds-fs-code)' }}>{item.content}</code>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              type="button"
              // Nút ở đầu/cuối danh sách dùng .chipOff (nền `desk`, chữ
              // `soft`, viền `line`) chứ không `opacity: .35` — mờ tới mức
              // 2,0:1 thì không còn nhận ra là nút (WCAG 1.4.11).
              className={i === 0 ? styles.chipOff : styles.chip}
              disabled={i === 0}
              onClick={() => onMove(i, -1)}
              aria-label="Chuyển lên trên"
            >
              ↑
            </button>
            <button
              type="button"
              className={i === items.length - 1 ? styles.chipOff : styles.chip}
              disabled={i === items.length - 1}
              onClick={() => onMove(i, 1)}
              aria-label="Chuyển xuống dưới"
            >
              ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
