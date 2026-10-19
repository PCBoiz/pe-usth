// Dịch từ màn Stitch "4. ASSEMBLE — Lắp ráp mã nguồn". Cùng cơ chế "cầm rồi
// thả" như Classify: bấm token trong kho để cầm lên, rồi bấm vào ô trống
// trong code để điền — thay cho kéo-thả tự do. Đây cũng là đường bàn phím
// (Tab → Enter cầm, Tab → Enter thả) mà bản Figma kéo-thả không có.
//
// Gộp Figma (design/v3/quyet-dinh.md mục 4): ô trống mang số ①②③ ngay trong
// code, và kho thẻ gom theo ô — trước đây ô in "···" không số còn lời phản hồi
// lại nói "Ô 2", người học phải tự đếm.
import styles from './exercises.module.css';

export interface AssembleLine {
  num: number;
  before: React.ReactNode;
  /** Có ô trống trên dòng này thì khai ô; dòng thường thì bỏ trống. */
  slot?: { id: string; n: number; mark: string };
  after?: React.ReactNode;
}

export interface AssembleGroup {
  n: number;
  mark: string;
  /** Ô này làm gì — chỉ có khi bài khai `slots[].hint`; không thì nhóm không nhãn. */
  hint?: string;
  tokens: string[];
}

export interface AssembleProps {
  filename?: string;
  langTag?: string;
  lines: AssembleLine[];
  filled: Record<string, string>;
  groups: AssembleGroup[];
  heldToken: string | null;
  onHold: (token: string) => void;
  onFillSlot: (slotId: string) => void;
}

export default function Assemble({
  filename,
  langTag,
  lines,
  filled,
  groups,
  heldToken,
  onHold,
  onFillSlot,
}: AssembleProps) {
  const empty = groups.every((g) => g.tokens.length === 0);
  return (
    <div>
      <div className={styles.codeCard}>
        <div className={styles.codeHeader}>
          <div className={styles.dots}><i /><i /><i /></div>
          {filename && <span className={styles.filename}>{filename}</span>}
          {langTag && <span className={styles.langTag}>{langTag}</span>}
        </div>
        <div className={styles.codeBody}>
          {lines.map((line) => {
            const slot = line.slot;
            const value = slot ? filled[slot.id] : undefined;
            return (
              <div key={line.num} className={styles.codeLine}>
                <span className={styles.lineNum}>{line.num}</span>
                <span className={styles.codeText}>
                  {/* `before` giữ nguyên khoảng trắng đầu dòng, nên ô nằm đúng
                      cột thụt lề của nó (Figma đặt ô ② sát lề trái — đọc như
                      IndentationError). */}
                  {line.before}
                  {slot && (
                    <button
                      type="button"
                      // Chưa cầm token thì ô trống không nhận được gì: bỏ khỏi
                      // thứ tự Tab thay vì để một nút bấm không ra kết quả.
                      disabled={!heldToken}
                      onClick={() => heldToken && onFillSlot(slot.id)}
                      className={value ? styles.assembleSlotFilled : styles.assembleSlot}
                      aria-label={
                        value
                          ? `Ô ${slot.n}: ${value}`
                          : heldToken
                            ? `Ô ${slot.n}, thả "${heldToken}" vào đây`
                            : `Ô ${slot.n}, trống`
                      }
                    >
                      <span className={styles.slotMark} aria-hidden="true">{slot.mark}</span>
                      <span aria-hidden="true">{value || (heldToken ? 'thả vào đây' : '···')}</span>
                    </button>
                  )}
                  {line.after}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.bankBox}>
        {/* Giống Classify: "đang cầm X" là phản hồi duy nhất của thao tác. */}
        <div className={styles.bankStatus} role="status">
          KHO TỪ KHOÁ {heldToken ? `— đang cầm "${heldToken}"` : '(bấm để cầm lên)'}
        </div>
        {empty && <span className={styles.bankEmpty}>Đã đặt hết thẻ.</span>}
        {!empty &&
          // Nhóm đã hết thẻ thì thôi hiện nhãn — một nhãn treo trên khoảng
          // trống đọc như thẻ bị mất.
          groups.filter((g) => g.tokens.length > 0).map((g) => (
            <div
              key={g.n}
              role="group"
              aria-label={g.hint ? `Thẻ cho ô ${g.n}: ${g.hint}` : `Thẻ cho ô ${g.n}`}
              className={styles.bankGroup}
            >
              <div className={styles.bankGroupHead} aria-hidden="true">
                <span className={styles.bankGroupMark}>{g.mark}</span>
                {g.hint && <span>{g.hint}</span>}
              </div>
              <div className={styles.bankGroupCards}>
                {g.tokens.map((token) => (
                  <button
                    key={token}
                    type="button"
                    className={heldToken === token ? styles.chipHeld : styles.chip}
                    aria-pressed={heldToken === token}
                    onClick={() => onHold(token)}
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
