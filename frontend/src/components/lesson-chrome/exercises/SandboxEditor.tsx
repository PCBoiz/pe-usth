'use client';

// Bản CHẠY THẬT của màn Stitch "3. SANDBOX": cùng bố cục với Sandbox.tsx (khối
// code — thanh chạy — console — bảng kiểm thử) nhưng code là ô soạn thảo được
// và kết quả đến từ Pyodide trong Web Worker, không phải dữ liệu soạn sẵn.
// Sandbox.tsx giữ nguyên cho trang xem trước; bài học thật dùng file này.
import { useId, useState } from 'react';

import styles from './exercises.module.css';
import Console, { ConsoleLine } from './Console';

export interface SandboxTestRow {
  label: string;
  detail?: string;
  status: 'pass' | 'fail' | 'pending';
}

export interface SandboxEditorProps {
  filename?: string;
  langTag?: string;
  code: string;
  onCodeChange: (code: string) => void;
  running: boolean;
  /** Chạy thử: chỉ xem output, không chấm. */
  onRun: () => void;
  onStop: () => void;
  /** Có lời giải mẫu thì hiện nút xem — bài nào không có thì bỏ trống. */
  onShowSolution?: () => void;
  consoleLines: ConsoleLine[] | null;
  consoleMeta?: string;
  tests: SandboxTestRow[];
  disabled?: boolean;
  /** Chữ mờ khi ô còn trống — bài không có code khởi tạo thì nói rõ ô này dùng làm gì. */
  placeholder?: string;
  /**
   * Câu thay cho "x/y ca kiểm thử đạt" khi bài KHÔNG có ca nào. Phải truyền từ
   * ngoài: thiếu `tests` có nhiều lý do khác nhau (bài quy trình làm trên máy,
   * bài đọc chạy thử tự do) và trước đây chỗ này ghi cứng một lý do duy nhất
   * nên nó nói sai cho các lý do còn lại.
   */
  noTestsHint?: string;
}

const STATUS_STYLE: Record<SandboxTestRow['status'], { bg: string; text: string; label: string }> = {
  pass: { bg: 'var(--st-ok-bg)', text: 'var(--st-ok-text)', label: '✓ Đạt' },
  fail: { bg: 'var(--st-err-bg)', text: 'var(--st-err-text)', label: '✕ Chưa đạt' },
  pending: { bg: 'var(--edu-card-bg)', text: 'var(--edu-t3)', label: '• Chưa chạy' },
};

export default function SandboxEditor({
  filename = 'solution.py',
  langTag = 'CPython 3.12',
  code,
  onCodeChange,
  running,
  onRun,
  onStop,
  onShowSolution,
  consoleLines,
  consoleMeta,
  tests,
  disabled,
  placeholder,
  noTestsHint = 'Bài này không có ca kiểm thử tự động',
}: SandboxEditorProps) {
  const passed = tests.filter((t) => t.status === 'pass').length;
  const hintId = useId();
  // Tab trong ô này thụt lề chứ không nhảy focus, nên tự nó là một BẪY BÀN PHÍM
  // (WCAG 2.1.2): người dùng bàn phím vào được mà không ra được. Cách thoát quen
  // thuộc của các trình soạn mã trên web: nhấn Escape để "nhả" Tab một lần, rồi
  // Tab đi tiếp như bình thường. Shift+Tab luôn nhường cho trình duyệt nên lúc
  // nào cũng còn một đường lùi ra khỏi ô, kể cả khi chưa biết mẹo Escape.
  const [tabEscapes, setTabEscapes] = useState(false);

  return (
    <div>
      <div className={styles.codeCard}>
        <div className={styles.codeHeader}>
          <div className={styles.dots}><i /><i /><i /></div>
          <span className={styles.filename}>{filename}</span>
          <span className={styles.langTag}>{langTag}</span>
        </div>
        <textarea
          className={styles.codeBody}
          aria-label="Trình soạn mã Python"
          aria-describedby={hintId}
          spellCheck={false}
          placeholder={placeholder}
          value={code}
          disabled={disabled}
          onChange={(e) => onCodeChange(e.target.value)}
          style={{
            width: '100%',
            minHeight: 220,
            resize: 'vertical',
            border: 0,
            // KHÔNG đặt outline:none ở đây. Bản trước có, và vì style nội tuyến
            // thắng mọi quy tắc CSS nên không cách nào vẽ lại vòng focus —
            // người dùng bàn phím vào ô này là mất dấu con trỏ (WCAG 2.4.7).
            // Vòng focus nay do .codeBody:focus-visible trong
            // exercises.module.css vẽ.
            color: 'var(--st-syn-plain)',
            background: 'transparent',
            fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 13,
            lineHeight: 1.7,
            // Tab thay vì nhảy focus: đang gõ code thụt lề là chuyện thường.
            tabSize: 4,
          }}
          onBlur={() => setTabEscapes(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setTabEscapes(true);
              return;
            }
            if (e.key !== 'Tab') {
              // Gõ tiếp là lại muốn thụt lề: thu hồi quyền thoát đã mở.
              if (tabEscapes) setTabEscapes(false);
              return;
            }
            if (e.shiftKey || tabEscapes) {
              setTabEscapes(false);
              return; // không preventDefault → trình duyệt tự chuyển focus
            }
            e.preventDefault();
            const el = e.currentTarget;
            const at = el.selectionStart;
            onCodeChange(code.slice(0, at) + '    ' + code.slice(el.selectionEnd));
            requestAnimationFrame(() => el.setSelectionRange(at + 4, at + 4));
          }}
        />
      </div>
      {/* Vừa là nội dung aria-describedby (đọc khi focus vào ô) vừa là vùng
          sống: đổi câu lúc Escape được nhấn để người dùng biết mẹo đã ăn.

          Nằm NGOÀI .codeCard (không phải trong như bản trước) để
          `.codeCard:focus-within + .editorHint` hiện nó thành một dòng chữ
          THẬT khi ô soạn mã đang được focus: người dùng bàn phím không dùng
          trình đọc màn hình cũng cần biết mẹo Escape, nếu chỉ để srOnly thì
          với họ đây vẫn là bẫy bàn phím (WCAG 2.1.2 đòi "phải CHỈ cho người
          dùng cách thoát", không chỉ riêng người dùng trình đọc màn hình). */}
      <p id={hintId} className={styles.editorHint} role="status">
        {tabEscapes
          ? 'Đã nhả Tab: nhấn Tab để chuyển ra khỏi trình soạn mã.'
          : 'Tab thụt lề 4 dấu cách. Nhấn Escape rồi Tab để chuyển ra khỏi trình soạn mã; Shift+Tab lùi về điều khiển trước.'}
      </p>

      <div className={styles.runRow}>
        <button
          type="button"
          className={styles.runBtn}
          onClick={running ? onStop : onRun}
          disabled={disabled}
        >
          {/* Ký hiệu ■/▶ chỉ là hình: để trần thì trình đọc màn hình đọc thành
              "black square"/"black right-pointing triangle" trước tên nút. */}
          <span aria-hidden="true">{running ? '■' : '▶'}</span> {running ? 'Dừng' : 'Chạy thử'}
        </button>
        {onShowSolution && (
          <button type="button" className={styles.chip} onClick={onShowSolution}>
            Xem lời giải mẫu
          </button>
        )}
        {/* Kết quả chấm phải được ĐỌC LÊN: trước đây chỉ có màu và dấu ✓/✕ đổi,
            người dùng trình đọc màn hình bấm "Chạy thử" rồi không biết gì xảy ra. */}
        <span className={styles.runHint} role="status">
          {tests.length ? `${passed}/${tests.length} ca kiểm thử đạt` : noTestsHint}
        </span>
      </div>

      <Console
        title="KẾT QUẢ CHẠY"
        meta={consoleMeta}
        running={running}
        lines={consoleLines}
        placeholder='Bấm "Chạy thử" để thực thi solution.py ngay trong trình duyệt.'
      />

      {tests.length > 0 && (
        <div style={{ marginTop: 16, background: 'var(--edu-card-bg)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--edu-t1)', marginBottom: 10 }}>
            Kiểm thử &nbsp;
            <span style={{ color: 'var(--edu-t3)', fontWeight: 500 }}>
              {passed}/{tests.length} đạt
            </span>
          </div>
          {/* Danh sách thật (ul/li): trình đọc màn hình đọc được "3 mục" thay vì
              một chuỗi div không rõ đâu là hết. */}
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
            {tests.map((t, i) => {
              const style = STATUS_STYLE[t.status];
              return (
                <li
                  key={i}
                  style={{
                    background: 'var(--edu-panel-bg-solid)',
                    border: '1px solid var(--edu-sidebar-border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ color: 'var(--edu-t1)' }}>{t.label}</span>
                    <span
                      className={styles.chip}
                      style={{ background: style.bg, color: style.text, border: 0, cursor: 'default', flexShrink: 0 }}
                    >
                      {style.label}
                    </span>
                  </div>
                  {t.detail && t.status !== 'pending' && (
                    <div style={{ fontSize: 12, color: 'var(--edu-t3)', marginTop: 4 }}>{t.detail}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
