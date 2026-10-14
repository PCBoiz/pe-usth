// Dịch từ màn Stitch "6. TRACE-TABLE — Bảng theo dõi biến": khối code +
// bảng nhập giá trị biến qua từng bước lặp.
import CodeBlock, { CodeBlockLine } from './CodeBlock';
import styles from './exercises.module.css';

export interface TraceRow {
  step: string;
  values: Record<string, string | null>; // null = ô còn trống, cần nhập
}

export interface TraceTableProps {
  filename?: string;
  code: CodeBlockLine[];
  columns: string[];
  rows: TraceRow[];
  answers: Record<string, string>; // key `${rowIndex}-${col}`
  onAnswerChange: (key: string, value: string) => void;
}

export default function TraceTable({ filename, code, columns, rows, answers, onAnswerChange }: TraceTableProps) {
  const filledCount = rows.reduce(
    (acc, row, i) =>
      acc + columns.filter((c) => row.values[c] !== null || answers[`${i}-${c}`]?.trim()).length,
    0,
  );
  const totalCells = rows.length * columns.length;

  return (
    <div>
      <CodeBlock filename={filename} lines={code} />
      <div style={{ background: 'var(--ds-tint)', borderRadius: 12, marginTop: 16, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 14px',
            fontSize: 'var(--ds-fs-label)',
            fontWeight: 700,
            color: 'var(--ds-soft)',
          }}
        >
          <span>
            <span aria-hidden="true">📊</span> TRẠNG THÁI BỘ NHỚ
          </span>
          {/* Số ô đã điền là phản hồi tiến độ duy nhất của màn này. */}
          <span role="status">{filledCount}/{totalCells} giá trị</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-fs-ui)' }}>
          {/* Tên bảng cho trình đọc màn hình: tiêu đề "TRẠNG THÁI BỘ NHỚ" ở trên
              là một div rời, không gắn gì với <table>. */}
          <caption className={styles.srOnly}>
            Trạng thái bộ nhớ qua từng bước — điền giá trị của {columns.join(', ')}
          </caption>
          <thead>
            <tr style={{ background: 'var(--ds-violet-tint)' }}>
              <th scope="col" style={{ textAlign: 'left', padding: '8px 14px', fontWeight: 700, color: 'var(--ds-ink)' }}>Bước</th>
              {columns.map((c) => (
                <th key={c} scope="col" style={{ padding: '8px 14px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--ds-violet-deep)' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--ds-line)' }}>
                <td style={{ padding: '8px 14px', color: 'var(--ds-soft)' }}>{row.step}</td>
                {columns.map((c) => {
                  const given = row.values[c];
                  const key = `${i}-${c}`;
                  return (
                    <td key={c} style={{ padding: '8px 14px', textAlign: 'center' }}>
                      {given !== null ? (
                        <span style={{ background: 'var(--ds-violet-tint)', borderRadius: 999, padding: '2px 12px', fontFamily: 'JetBrains Mono, monospace' }}>
                          {given}
                        </span>
                      ) : (
                        <input
                          value={answers[key] || ''}
                          onChange={(e) => onAnswerChange(key, e.target.value)}
                          style={{
                            width: 48,
                            textAlign: 'center',
                            border: '1.5px solid var(--st-slot-border)',
                            borderRadius: 999,
                            padding: '2px 4px',
                            font: 'inherit',
                            fontFamily: 'JetBrains Mono, monospace',
                            background: 'var(--ds-card)',
                            color: 'var(--ds-ink)',
                          }}
                          aria-label={`${row.step} - ${c}`}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
