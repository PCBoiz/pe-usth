// Dịch từ màn Stitch "4. ASSEMBLE — Lắp ráp mã nguồn". Cùng cơ chế "cầm rồi
// thả" như Classify: bấm token trong kho để cầm lên, rồi bấm vào ô trống
// trong code để điền — thay cho kéo-thả tự do.
import styles from './exercises.module.css';

export interface AssembleLine {
  num: number;
  before: React.ReactNode;
  /** Có ô trống trên dòng này thì đặt slotId; dòng thường thì bỏ trống. */
  slotId?: string;
  after?: React.ReactNode;
}

export interface AssembleProps {
  filename?: string;
  langTag?: string;
  lines: AssembleLine[];
  filled: Record<string, string>;
  bank: string[];
  heldToken: string | null;
  onHold: (token: string) => void;
  onFillSlot: (slotId: string) => void;
}

export default function Assemble({
  filename,
  langTag,
  lines,
  filled,
  bank,
  heldToken,
  onHold,
  onFillSlot,
}: AssembleProps) {
  return (
    <div>
      <div className={styles.codeCard}>
        <div className={styles.codeHeader}>
          <div className={styles.dots}><i /><i /><i /></div>
          {filename && <span className={styles.filename}>{filename}</span>}
          {langTag && <span className={styles.langTag}>{langTag}</span>}
        </div>
        <div className={styles.codeBody}>
          {lines.map((line) => (
            <div key={line.num} className={styles.codeLine}>
              <span className={styles.lineNum}>{line.num}</span>
              <span className={styles.codeText}>
                {line.before}
                {line.slotId && (
                  <button
                    type="button"
                    // Chưa cầm token thì ô trống không nhận được gì: bỏ khỏi
                    // thứ tự Tab thay vì để một nút bấm không ra kết quả.
                    disabled={!heldToken}
                    onClick={() => heldToken && onFillSlot(line.slotId!)}
                    style={{
                      display: 'inline-block',
                      minWidth: 90,
                      margin: '0 4px',
                      padding: '1px 10px',
                      borderRadius: 6,
                      // Ô nằm trong khung code (nền tối) nên viền lấy bản
                      // -on-dark: tím bản ngày chỉ 2,10:1 ở đây.
                      border: '2px ' + (filled[line.slotId] ? 'solid' : 'dashed') + ' var(--ds-mark-violet)',
                      // Ô đã lắp: nền lấy đường kẻ của khung code thay cho
                      // rgba trắng rời — mã màu cuối cùng ngoài bảng token.
                      background: filled[line.slotId] ? 'var(--ds-code-line)' : 'transparent',
                      color: 'var(--st-syn-plain)',
                      font: 'inherit',
                      fontWeight: 700,
                      cursor: heldToken ? 'pointer' : 'default',
                    }}
                  >
                    {filled[line.slotId] || (heldToken ? 'thả vào đây' : '···')}
                  </button>
                )}
                {line.after}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'var(--ds-tint)', borderRadius: 12, padding: 14, marginTop: 12 }}>
        {/* Giống Classify: "đang cầm X" là phản hồi duy nhất của thao tác. */}
        <div style={{ fontSize: 'var(--ds-fs-label)', fontWeight: 700, color: 'var(--ds-soft)', marginBottom: 8 }} role="status">
          KHO TỪ KHOÁ {heldToken ? `— đang cầm "${heldToken}"` : '(bấm để cầm lên)'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {bank.length === 0 && <span style={{ fontSize: 'var(--ds-fs-label)', color: 'var(--ds-soft)' }}>Hết token.</span>}
          {bank.map((token) => (
            <button
              key={token}
              type="button"
              className={styles.chip}
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
