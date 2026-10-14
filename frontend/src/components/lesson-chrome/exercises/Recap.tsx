// Dịch từ màn Stitch "3. RECAP — Tổng kết bài học & Nhận XP". Cũng là màn
// toàn thẻ, đứng độc lập như Checkpoint.
export interface RecapStat {
  icon: string;
  value: string;
  label: string;
}

export interface RecapProps {
  xpLabel: string;
  title: string;
  description: string;
  stats: RecapStat[];
  facts: string[];
  onFinish: () => void;
}

export default function Recap({ xpLabel, title, description, stats, facts, onFinish }: RecapProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--ds-card)',
          border: '1px solid var(--ds-line)',
          borderRadius: 999,
          padding: '10px 20px',
          fontSize: 'var(--ds-fs-h3)',
          fontWeight: 800,
          color: 'var(--ds-violet-deep)',
        }}
      >
        <span aria-hidden="true">💎</span> {xpLabel} <span aria-hidden="true">✨</span>
      </span>
      <h2 style={{ fontSize: 'var(--ds-fs-h2)', fontWeight: 800, margin: '16px 0 8px', color: 'var(--ds-ink)' }}>{title}</h2>
      <p style={{ fontSize: 'var(--ds-fs-body)', color: 'var(--ds-soft)', maxWidth: 460, margin: '0 auto 20px' }}>{description}</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 12, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div
            key={i}
            style={{
              background: 'var(--ds-card)',
              border: '1px solid var(--ds-line)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 'var(--ds-fs-h3)' }} aria-hidden="true">{s.icon}</div>
            <div style={{ fontSize: 'var(--ds-fs-body)', fontWeight: 800, color: 'var(--ds-ink)', margin: '6px 0 2px' }}>{s.value}</div>
            <div style={{ fontSize: 'var(--ds-fs-label)', color: 'var(--ds-soft)' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 'var(--ds-fs-label)', fontWeight: 700, color: 'var(--ds-soft)', marginBottom: 8 }}>
          <span aria-hidden="true">📖</span> KIẾN THỨC CỐT LÕI ĐÃ HỌC
        </div>
        {/* Danh sách thật: trình đọc màn hình báo được "3 mục" thay vì đọc liền
            một mạch ba đoạn văn không rõ ranh giới. */}
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
          {facts.map((f, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                background: 'var(--ds-card)',
                border: '1px solid var(--ds-line)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 'var(--ds-fs-ui)',
                color: 'var(--ds-ink)',
              }}
            >
              <span aria-hidden="true" style={{ color: 'var(--st-ok-text)' }}>✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={onFinish}
        style={{
          width: '100%',
          height: 52,
          borderRadius: 999,
          border: 0,
          background: 'var(--ds-action)',
          color: 'var(--ds-on-action)',
          fontWeight: 700,
          fontSize: 'var(--ds-fs-ui)',
          cursor: 'pointer',
          marginTop: 20,
        }}
      >
        Hoàn thành <span aria-hidden="true">✓</span>
      </button>
    </div>
  );
}
