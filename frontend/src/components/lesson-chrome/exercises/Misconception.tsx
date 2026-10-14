// Dịch từ màn Stitch "6. MISCONCEPTION — Sửa hiểu lầm sai sót": câu hiểu lầm
// bị gạch ngang, kèm khối "thực tế chính xác" và ví dụ minh hoạ.
import shellStyles from '../ShellB.module.css';
import CodeBlock, { CodeBlockLine } from './CodeBlock';

export interface MisconceptionProps {
  myth: string;
  correction: React.ReactNode;
  exampleLabel?: string;
  langTag?: string;
  code?: CodeBlockLine[];
}

export default function Misconception({ myth, correction, exampleLabel, langTag, code }: MisconceptionProps) {
  return (
    <div>
      <span className={shellStyles.eyebrow} style={{ background: 'var(--st-err-bg)', color: 'var(--st-err-text)' }}>
        ⚠ Hiểu lầm phổ biến
      </span>
      <p
        style={{
          fontSize: 'var(--ds-fs-lead)',
          fontWeight: 700,
          textDecoration: 'line-through',
          color: 'var(--ds-soft)',
          margin: '16px 0 20px',
        }}
      >
        &ldquo;{myth}&rdquo;
      </p>
      <div
        style={{
          background: 'var(--st-ok-bg)',
          borderRadius: 12,
          padding: '16px 18px',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 'var(--ds-fs-label)', fontWeight: 700, color: 'var(--st-ok-text)', marginBottom: 6 }}>
          ✓ THỰC TẾ CHÍNH XÁC
        </div>
        <div style={{ fontSize: 'var(--ds-fs-body)', color: 'var(--ds-ink)', lineHeight: 1.6 }}>{correction}</div>
      </div>
      {code && (
        <>
          {exampleLabel && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--ds-fs-label)', color: 'var(--ds-soft)', marginBottom: 6 }}>
              <span>● {exampleLabel}</span>
              {langTag && <span>{langTag}</span>}
            </div>
          )}
          <CodeBlock lines={code} showDots={false} />
        </>
      )}
    </div>
  );
}
