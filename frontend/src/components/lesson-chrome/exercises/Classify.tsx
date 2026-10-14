// Dịch từ màn Stitch "1. CLASSIFY — Phân loại dữ liệu". Bản gốc dùng kéo-thả
// (drag&drop) token vào ô; ở đây đơn giản hoá thành "chọn rồi bấm": bấm 1
// token trong kho để cầm lên (nổi bật), rồi bấm vào nhóm muốn thả vào —
// tương đương thao tác, không cần theo dõi toạ độ con trỏ.
import styles from './exercises.module.css';

export interface ClassifyBin {
  key: string;
  label: string;
  sub: string;
  items: string[];
}

export interface ClassifyProps {
  bins: ClassifyBin[];
  pool: string[];
  heldToken: string | null;
  onHold: (token: string) => void;
  onDrop: (binKey: string) => void;
}

export default function Classify({ bins, pool, heldToken, onHold, onDrop }: ClassifyProps) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bins.length}, 1fr)`, gap: 12, marginBottom: 16 }}>
        {bins.map((bin) => (
          <button
            key={bin.key}
            type="button"
            // Chưa cầm token thì nút không làm gì: để `disabled` cho nó rơi hẳn
            // khỏi thứ tự Tab, thay vì bắt người dùng bàn phím đi qua 3 nút chết.
            disabled={!heldToken}
            // Tên gọi của nút phải nói nó LÀM GÌ. Chỉ có nhãn nhóm (`int`,
            // `str`…) thì trình đọc màn hình đọc "int, nút" — không hiểu bấm
            // vào thì chuyện gì xảy ra.
            aria-label={
              heldToken
                ? `Thả "${heldToken}" vào nhóm ${bin.label}${bin.items.length ? ` (đang có ${bin.items.length} token)` : ''}`
                : `Nhóm ${bin.label} — chọn một token trong kho trước`
            }
            onClick={() => heldToken && onDrop(bin.key)}
            style={{
              textAlign: 'left',
              font: 'inherit',
              cursor: heldToken ? 'pointer' : 'default',
              background: 'var(--ds-tint)',
              border: heldToken ? '1.5px dashed var(--st-slot-border)' : '1px solid var(--ds-line)',
              borderRadius: 14,
              padding: 14,
              minHeight: 140,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 'var(--ds-fs-label)', fontWeight: 700, color: 'var(--ds-ink)' }}>
              <code>{bin.label}</code>
            </div>
            <div style={{ fontSize: 'var(--ds-fs-label)', color: 'var(--ds-soft)' }}>{bin.sub}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {bin.items.map((item) => (
                <span key={item} className={styles.chip} style={{ cursor: 'default' }}>
                  {item} ✓
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
      <div
        style={{
          background: 'var(--ds-tint)',
          borderRadius: 12,
          padding: '12px 16px',
        }}
      >
        {/* "Đang cầm X" là trạng thái duy nhất cho biết thao tác đã ăn: phải
            được đọc lên khi đổi. */}
        <div style={{ fontSize: 'var(--ds-fs-label)', fontWeight: 700, color: 'var(--ds-soft)', marginBottom: 8 }} role="status">
          KHO TOKEN {heldToken ? `— đang cầm "${heldToken}", bấm vào nhóm để thả` : '(bấm để cầm lên)'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pool.length === 0 && <span style={{ fontSize: 'var(--ds-fs-label)', color: 'var(--ds-soft)' }}>Đã phân loại hết.</span>}
          {pool.map((token) => (
            <button
              key={token}
              type="button"
              className={styles.chip}
              // Token đang cầm chỉ khác nhau ở viền/nền — trạng thái "đang chọn"
              // phải có mặt trong cây trợ năng, không chỉ trong màu.
              aria-pressed={heldToken === token}
              onClick={() => onHold(token)}
              style={heldToken === token ? { borderColor: 'var(--ds-violet)', background: 'var(--ds-violet-tint)' } : undefined}
            >
              {token}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
