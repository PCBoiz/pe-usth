// Dịch từ màn Stitch "1. mcq — trắc nghiệm 1 lựa chọn".
import styles from './exercises.module.css';

export interface McqCodeLine {
  num: number;
  content: React.ReactNode;
}

export interface McqOption {
  key: string;
  label: string;
  sub?: string;
}

export interface McqProps {
  filename?: string;
  langTag?: string;
  code?: McqCodeLine[];
  options: McqOption[];
  selected: string | null;
  onSelect: (key: string) => void;
  /** Đáp án đúng — chỉ dùng để tô màu SAU khi bấm "Kiểm tra". */
  correctKey?: string;
  checked?: boolean;
}

export default function Mcq({
  filename,
  langTag,
  code,
  options,
  selected,
  onSelect,
  correctKey,
  checked,
}: McqProps) {
  return (
    <div>
      {code && (
        <div className={styles.codeCard}>
          <div className={styles.codeHeader}>
            <div className={styles.dots}><i /><i /><i /></div>
            {filename && <span className={styles.filename}>{filename}</span>}
            {langTag && <span className={styles.langTag}>{langTag}</span>}
          </div>
          <div className={styles.codeBody}>
            {code.map((line) => (
              <div key={line.num} className={styles.codeLine}>
                <span className={styles.lineNum}>{line.num}</span>
                <span className={styles.codeText}>{line.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={styles.optionsList}>
        {options.map((opt) => {
          const isSelected = selected === opt.key;
          const isRight = checked && correctKey === opt.key;
          const isWrong = checked && isSelected && correctKey !== opt.key;

          const cardClass = isRight
            ? styles.optionCorrect
            : isWrong
              ? styles.optionWrong
              : isSelected
                ? styles.optionSelected
                : styles.optionCard;
          const markClass = isRight
            ? styles.markCorrect
            : isWrong
              ? styles.markWrong
              : isSelected
                ? styles.optionRadioSelected
                : styles.optionRadio;

          return (
            <button
              key={opt.key}
              type="button"
              className={cardClass}
              onClick={() => onSelect(opt.key)}
              disabled={checked}
              aria-pressed={isSelected}
              // Phương án KHÔNG được chọn và KHÔNG phải đáp án: mờ đi để hai ô
              // kia nổi lên. Nhưng nếu nó mang lời giải thích thì chữ đó là thứ
              // người học phải ĐỌC được — phản hồi có giải thích là d = 0,49,
              // cao gấp gần 10 lần kiểu chỉ nói đúng/sai (Van der Kleij 2015),
              // và 1 548/1 548 phương án của khoá 172 bài đều có `detail`. Mờ
              // 0,8 thay vì 0,55: vẫn tụt hẳn so với hai ô kia, vẫn đọc được.
              style={
                checked && !isRight && !isWrong ? { opacity: opt.sub ? 0.8 : 0.55 } : undefined
              }
            >
              <span className={styles.optionMain}>
                <code>{opt.key}.</code> {opt.label}
                {opt.sub && <span className={styles.optionSub}>{opt.sub}</span>}
              </span>
              {/* Ô tròn/dấu ✓✕ là hình; kết quả chấm phải có bản chữ, nếu không
                  thì sau khi "Kiểm tra" người dùng trình đọc màn hình chỉ nghe
                  lại đúng danh sách lựa chọn như trước. */}
              <span aria-hidden="true" className={markClass}>{isRight ? '✓' : isWrong ? '✕' : ''}</span>
              {checked && (isRight || isWrong) && (
                <span className={styles.srOnly}>{isRight ? ' — đáp án đúng' : ' — bạn đã chọn, sai'}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
