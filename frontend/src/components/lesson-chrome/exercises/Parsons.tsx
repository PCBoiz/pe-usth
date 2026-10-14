// Dịch từ màn Stitch "5. PARSONS — Ghép & Thụt lề mã". Bản gốc kéo-thả tự do
// theo toạ độ + căn thụt lề bằng tay; ở đây đơn giản hoá thành "bấm để nối
// tiếp vào cuối khối mã đang lắp" — vẫn giữ đúng ý: chọn đúng dòng, bỏ qua
// dòng gây nhiễu, thứ tự do người học quyết định qua thứ tự bấm.
import styles from './exercises.module.css';

export interface ParsonsPoolItem {
  id: string;
  content: React.ReactNode;
  /** Dòng nhiễu — cố tình sai cú pháp/logic, không nên được chọn. */
  distractorReason?: string;
}

export interface ParsonsLine {
  id: string;
  content: React.ReactNode;
  indent: number;
  /** Dòng có sẵn (phần đầu/đuôi cố định của chương trình) — tô mờ. */
  fixed?: boolean;
}

export interface ParsonsProps {
  filename?: string;
  builtLines: ParsonsLine[];
  /** Phần cuối chương trình có sẵn, hiện SAU ô "bấm để nối tiếp". */
  tailLines?: ParsonsLine[];
  pool: ParsonsPoolItem[];
  onPick: (id: string) => void;
  onAttemptDistractor: (id: string) => void;
  /**
   * Có truyền thì nhãn "Nhiễu: lý do" chỉ hiện cho dòng nhiễu đã bấm nhầm
   * (dạng game); không truyền thì hiện ngay như bản demo.
   */
  revealed?: string[];
}

function Line({ line, num }: { line: ParsonsLine; num: number }) {
  return (
    <div
      className={styles.codeLine}
      style={{ paddingLeft: line.indent * 20 }}
    >
      <span className={styles.lineNum}>{num}</span>
      {/* Dòng cho sẵn (fixed) từng làm mờ cả dòng bằng `opacity: .55`: chữ
          code mờ 55% trên nền khung code chỉ còn ≈3,4:1. Nay đổi MÀU sang
          --ds-code-num (6,04:1), vẫn nhạt hơn dòng người học phải lắp. */}
      <span className={styles.codeText} style={line.fixed ? { color: 'var(--ds-code-num)' } : undefined}>
        {line.content}
      </span>
    </div>
  );
}

export default function Parsons({
  filename,
  builtLines,
  tailLines = [],
  pool,
  onPick,
  onAttemptDistractor,
  revealed,
}: ParsonsProps) {
  return (
    <div>
      <div className={styles.codeCard}>
        <div className={styles.codeHeader}>
          <div className={styles.dots}><i /><i /><i /></div>
          {filename && <span className={styles.filename}>{filename}</span>}
        </div>
        {/* Bấm một dòng ở kho là nó CHUYỂN vào đây — chỗ khác hẳn với nút vừa
            bấm. aria-relevant="additions" để chỉ dòng mới được đọc, không đọc
            lại cả khối mã mỗi lần. */}
        <div className={styles.codeBody} role="log" aria-live="polite" aria-relevant="additions">
          {builtLines.map((line, i) => (
            <Line key={line.id} line={line} num={i + 1} />
          ))}
          <div
            style={{
              border: '1px dashed var(--st-code-gutter)',
              borderRadius: 6,
              padding: '6px 12px',
              margin: '6px 0',
              fontSize: 'var(--ds-fs-label)',
              color: 'var(--st-syn-comment)',
              textAlign: 'center',
            }}
          >
            + Bấm một dòng lệnh bên dưới để nối tiếp vào đây
          </div>
          {tailLines.map((line, i) => (
            <Line key={line.id} line={line} num={builtLines.length + i + 1} />
          ))}
        </div>
      </div>
      {/* Nhóm có tên: không thế thì trình đọc màn hình gặp một dãy nút lệnh
          Python trần, không biết chúng thuộc kho dòng lệnh nào. */}
      <div style={{ marginTop: 14 }} role="group" aria-label="Kho dòng lệnh còn lại, có cả dòng gây nhiễu">
        <div style={{ fontSize: 'var(--ds-fs-label)', fontWeight: 700, color: 'var(--ds-soft)', marginBottom: 8 }}>
          {revealed ? 'DÒNG LỆNH CÒN LẠI (CÓ DÒNG BẪY)' : <>DÒNG LỆNH CÒN LẠI &amp; DÒNG GÂY NHIỄU</>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pool.map((item) => {
            const showReason =
              item.distractorReason && (!revealed || revealed.includes(item.id));
            return (
              <button
                key={item.id}
                type="button"
                // Dòng nhiễu đã lộ lý do: .optionDim thay cho `opacity: .6`.
                className={revealed && showReason ? styles.optionDim : styles.optionCard}
                disabled={Boolean(revealed && showReason)}
                onClick={() => (item.distractorReason ? onAttemptDistractor(item.id) : onPick(item.id))}
                style={{
                  justifyContent: 'space-between',
                  minWidth: 0,
                  gap: 8,
                }}
              >
                {/* Giữ thụt lề (pre) nhưng cuộn ngang trong nút, không đẩy rộng trang. */}
                <code style={{ display: 'block', flex: 1, whiteSpace: 'pre', overflowX: 'auto', minWidth: 0, textAlign: 'left' }}>
                  {item.content}
                </code>
                {showReason && (
                  <span style={{ fontSize: 'var(--ds-fs-label)', color: 'var(--st-err-text)', background: 'var(--st-err-bg)', borderRadius: 999, padding: '2px 10px', whiteSpace: 'normal' }}>
                    Nhiễu: {item.distractorReason}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
