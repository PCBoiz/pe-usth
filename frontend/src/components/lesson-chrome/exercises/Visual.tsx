// Dịch từ màn Stitch "1. VISUAL — Sơ đồ bộ nhớ Stack & Heap": thẻ trực quan
// tĩnh, không tương tác.
import styles from './exercises.module.css';

export interface StackEntry {
  name: string;
  address: string;
  note: string;
}
export interface HeapEntry {
  tag: string;
  address: string;
  refcount: number;
  rows: { label: string; value: string }[];
}

export interface VisualProps {
  stack: StackEntry[];
  heap: HeapEntry[];
}

export default function Visual({ stack, heap }: VisualProps) {
  const col: React.CSSProperties = {
    background: 'var(--ds-card)',
    border: '1px solid var(--ds-line)',
    borderRadius: 12,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <div style={{ fontSize: 'var(--ds-fs-ui)', fontWeight: 700, color: 'var(--ds-violet)', marginBottom: 8 }}>● Stack</div>
        <div style={col}>
          {stack.map((s, i) => (
            <div key={i} style={{ borderBottom: i < stack.length - 1 ? '1px solid var(--ds-line)' : undefined, paddingBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--ds-fs-ui)' }}>
                <code style={{ color: 'var(--ds-violet-deep)', fontWeight: 700 }}>{s.name}</code>
                <code style={{ color: 'var(--ds-soft)' }}>{s.address}</code>
              </div>
              <div style={{ fontSize: 'var(--ds-fs-label)', color: 'var(--ds-soft)', marginTop: 2 }}>{s.note}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 'var(--ds-fs-ui)', fontWeight: 700, color: 'var(--ds-violet)', marginBottom: 8 }}>● Heap</div>
        <div style={col}>
          {heap.map((h, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className={styles.chip} style={{ background: 'var(--ds-violet)', color: 'var(--ds-on-action)', border: 0, cursor: 'default' }}>
                  {h.tag}
                </span>
                <code style={{ fontSize: 'var(--ds-fs-label)', color: 'var(--ds-soft)' }}>@ {h.address}</code>
                <span className={styles.chip} style={{ marginLeft: 'auto', background: 'var(--st-ok-bg)', color: 'var(--st-ok-text)', border: 0, cursor: 'default' }}>
                  Refcount: {h.refcount}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {h.rows.map((r, j) => (
                  <div key={j} style={{ fontSize: 'var(--ds-fs-label)', color: 'var(--ds-soft)' }}>
                    {r.label} <code style={{ color: 'var(--ds-ink)', fontWeight: 700 }}>{r.value}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
