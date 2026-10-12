'use client';

// Python IDE: editor Monaco bên trái, kết quả bên phải. Bấm Run (hoặc Ctrl+Enter)
// gửi mã tới POST /api/python/run; backend chạy trong container Docker cách ly
// rồi trả stdout/stderr (xem src/python-runner ở backend). Một request đồng bộ,
// không hàng đợi — nên "đang chạy" kéo dài tới khi chương trình xong hoặc hết giờ.
//
// Đây là công cụ, KHÔNG phải khóa học: không ghi tiến độ/XP/đăng ký.

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { apiFetch } from '@/lib/api';

import { DEFAULT_CODE, IDE_EXAMPLES } from './examples';
import styles from './ide.module.css';

// Monaco chỉ chạy được trong trình duyệt (cần window/worker) nên tắt SSR.
// Mặc định @monaco-editor/react tải Monaco từ cdn.jsdelivr.net — domain đã nằm
// trong script-src/style-src/font-src của CSP ở next.config.ts.
const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className={styles.editorLoading}>Đang tải trình soạn thảo…</div>,
});

type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
  durationMs: number;
};

type RunState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: RunResult }
  | { status: 'error'; kind: 'private' | 'busy' | 'other'; message: string };

/** Chủ đề sáng/tối của trang: class `dark` trên <body> (xem SiteHeader/layout gốc). */
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
const getDark = () => document.body.classList.contains('dark');
const getDarkServer = () => false;

/**
 * Trần số ký tự DỰNG vào DOM cho mỗi luồng. Backend cho phép tới 1 MB (~500 nghìn
 * dòng với `print('x')`); dựng hết vào <pre> làm trình duyệt khựng hàng giây.
 * Chỉ cắt phần HIỂN THỊ, dữ liệu trả về vẫn nguyên.
 */
const MAX_SHOWN_CHARS = 200_000;

function clip(text: string): { text: string; clipped: boolean } {
  return text.length > MAX_SHOWN_CHARS
    ? { text: text.slice(0, MAX_SHOWN_CHARS), clipped: true }
    : { text, clipped: false };
}

/** Backend bọc lỗi thành { error: { message } } (AllExceptionsFilter) hoặc { message } (ValidationPipe). */
function errorMessage(body: unknown, fallback: string): string {
  const b = body as { error?: { message?: unknown } | string; message?: unknown } | null;
  const raw = (typeof b?.error === 'object' ? b.error?.message : undefined) ?? b?.message;
  if (Array.isArray(raw)) return raw.join(', ');
  return typeof raw === 'string' && raw ? raw : fallback;
}

export default function IdeClient() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [state, setState] = useState<RunState>({ status: 'idle' });
  const dark = useSyncExternalStore(subscribeTheme, getDark, getDarkServer);
  // Nội dung editor MỚI NHẤT, cập nhật đồng bộ trong onChange. Ctrl+Enter được gắn
  // MỘT lần lúc Monaco mount; nếu run() đọc state `code` (chỉ mới sau render kế)
  // thì gõ xong bấm phím tắt ngay có thể chạy bản cũ vài ký tự — đã đo được.
  const codeRef = useRef(DEFAULT_CODE);
  const updateCode = useCallback((next: string) => {
    codeRef.current = next;
    setCode(next);
  }, []);

  const running = state.status === 'running';
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (abortRef.current) return; // đang chạy: bỏ qua cú bấm thứ hai
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: 'running' });
    try {
      const res = await apiFetch('/api/python/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeRef.current }),
        signal: controller.signal,
      });
      const body: unknown = await res.json().catch(() => null);
      if (res.status === 401) {
        // Không có đăng nhập để mà gợi ý: 401 nghĩa là backend vẫn đòi JWT cho route này.
        setState({
          status: 'error',
          kind: 'private',
          message: 'Backend chưa bật chế độ công khai cho IDE (PY_RUNNER_PUBLIC=true).',
        });
      } else if (res.status === 429) {
        setState({
          status: 'error',
          kind: 'busy',
          // 429 có hai nguồn (đủ số container đang chạy / vượt 10 lượt mỗi phút), cả hai
          // đều chữa bằng cách chờ nên dùng chung một câu.
          message: 'Đang có quá nhiều bài chạy, thử lại sau vài giây.',
        });
      } else if (!res.ok) {
        setState({
          status: 'error',
          kind: 'other',
          message: errorMessage(body, `Không chạy được (HTTP ${res.status}).`),
        });
      } else {
        setState({ status: 'done', result: body as RunResult });
      }
    } catch (e) {
      if (controller.signal.aborted) return; // người dùng rời trang
      setState({
        status: 'error',
        kind: 'other',
        message: e instanceof Error ? `Không kết nối được máy chủ: ${e.message}` : 'Không kết nối được máy chủ.',
      });
    } finally {
      abortRef.current = null;
    }
  }, []);

  // Rời trang giữa chừng thì huỷ request đang treo (container vẫn tự hết giờ ở máy chủ).
  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <>
      <PageStyles hrefs={['/static/css/edu-theme.css']} />
      <div className={styles.page}>
        <SiteHeader />
        <main className={styles.main}>
          <div className={styles.toolbar}>
            <h1 className={styles.title}>Python IDE</h1>
            <div className={styles.actions}>
              <label className={styles.exampleLabel}>
                <span className={styles.srOnly}>Ví dụ test</span>
                <select
                  className={styles.select}
                  value=""
                  onChange={(e) => {
                    const ex = IDE_EXAMPLES.find((x) => x.id === e.target.value);
                    if (ex) updateCode(ex.code);
                  }}
                >
                  <option value="">Ví dụ test…</option>
                  {IDE_EXAMPLES.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className={styles.run} onClick={() => void run()} disabled={running}>
                {running ? 'Đang chạy…' : '▶ Chạy'}
                {!running && <kbd className={styles.kbd}>Ctrl+Enter</kbd>}
              </button>
            </div>
          </div>

          <div className={styles.split}>
            <section className={styles.editorPane} aria-label="Trình soạn thảo mã Python">
              <Editor
                height="100%"
                language="python"
                theme={dark ? 'vs-dark' : 'light'}
                value={code}
                onChange={(v) => updateCode(v ?? '')}
                onMount={(editor, monaco) => {
                  // addCommand đè lệnh mặc định của Ctrl+Enter trong Monaco (chèn dòng mới).
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => void run());
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  tabSize: 4,
                  insertSpaces: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </section>

            <section className={styles.outputPane} aria-label="Kết quả" aria-live="polite" aria-busy={running}>
              <Output state={state} />
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function Output({ state }: { state: RunState }) {
  if (state.status === 'idle')
    return <p className={styles.hint}>Bấm “Chạy” để xem kết quả ở đây.</p>;

  if (state.status === 'running')
    return (
      <p className={styles.hint}>
        <span className={styles.spinner} aria-hidden="true" /> Đang chạy trong sandbox…
      </p>
    );

  if (state.status === 'error')
    return (
      <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
        <strong>
          {state.kind === 'private' ? 'IDE chưa được bật' : state.kind === 'busy' ? 'Máy chủ đang bận' : 'Lỗi'}
        </strong>
        <p>{state.message}</p>
      </div>
    );

  const { result } = state;
  const out = clip(result.stdout);
  const err = clip(result.stderr);
  const ranOk = !result.timedOut && !result.outputTruncated;
  return (
    <>
      <div className={styles.meta}>
        <span>Thời gian chạy: {(result.durationMs / 1000).toFixed(2)} s</span>
        {ranOk && (
          <span className={result.exitCode === 0 ? styles.ok : styles.fail}>Mã thoát: {result.exitCode}</span>
        )}
      </div>

      {result.timedOut && (
        <div className={`${styles.notice} ${styles.noticeWarn}`}>
          Hết giờ: chương trình chạy quá thời gian cho phép nên đã bị dừng.
        </div>
      )}
      {result.exitCode === 137 && (
        <div className={`${styles.notice} ${styles.noticeWarn}`}>
          Chương trình bị dừng vì dùng quá giới hạn bộ nhớ (1 GB) — mã thoát 137.
        </div>
      )}
      {result.outputTruncated && (
        <div className={`${styles.notice} ${styles.noticeWarn}`}>
          Đầu ra vượt 1 MB nên bị cắt và chương trình đã bị dừng.
        </div>
      )}

      {out.text && <pre className={styles.stdout}>{out.text}</pre>}
      {err.text && <pre className={styles.stderr}>{err.text}</pre>}
      {(out.clipped || err.clipped) && (
        <p className={styles.hint}>… chỉ hiển thị {MAX_SHOWN_CHARS.toLocaleString('vi-VN')} ký tự đầu của mỗi luồng.</p>
      )}
      {!result.stdout && !result.stderr && <p className={styles.hint}>(Không có đầu ra)</p>}
    </>
  );
}
