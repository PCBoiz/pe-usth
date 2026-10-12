'use client';

// Python IDE: editor Monaco bên trái, kết quả bên phải. Bấm Run (hoặc Ctrl+Enter)
// gửi mã tới POST /api/python/run; backend chạy trong container Docker cách ly
// rồi trả stdout/stderr (xem src/python-runner ở backend). Một request đồng bộ,
// không hàng đợi — nên "đang chạy" kéo dài tới khi chương trình xong hoặc hết giờ.
//
// Đây là công cụ, KHÔNG phải khóa học: không ghi tiến độ/XP/đăng ký.
//
// Lỗi HẠ TẦNG (máy chủ không có Docker, runner tắt, IDE chưa mở) được nói bằng
// một câu bình thường, nguyên văn thông điệp kỹ thuật thì gập vào <details>. Lỗi
// của MÃ người học (SyntaxError, exception, hết giờ) vẫn hiện nguyên như trước —
// đó mới là thứ công cụ này tồn tại để cho thấy.

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { apiFetch } from '@/lib/api';
import { isRunnerDown, RUNNER_UNAVAILABLE_MESSAGE } from '@/lib/runner-error';

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
  /** Thời gian chờ trong hàng đợi của máy chạy (ms). Backend/runner cũ không gửi → undefined. */
  queuedMs?: number;
};

type RunState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: RunResult }
  | {
      status: 'error';
      kind: 'private' | 'busy' | 'unavailable' | 'other';
      message: string;
      /** Nguyên văn thông điệp kỹ thuật, gập trong <details> cho người vận hành. */
      detail?: string;
    };

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

const ERROR_TITLES: Record<Extract<RunState, { status: 'error' }>['kind'], string> = {
  private: 'IDE chưa mở cho phiên này',
  busy: 'Chưa chạy được lúc này',
  unavailable: 'Bộ chạy Python đang được dựng',
  other: 'Lỗi',
};

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
        // Không có đăng nhập để mà gợi ý: 401 nghĩa là backend vẫn đòi JWT cho route
        // này và phiên khách hiện tại không có token. Tên biến môi trường là việc của
        // người vận hành chứ không phải của người học → xuống <details>.
        setState({
          status: 'error',
          kind: 'private',
          message:
            'Lúc này IDE chưa chạy được mã. Các bài học trong khóa vẫn chạy Python '
            + 'bình thường ngay trong trình duyệt.',
          // KHÔNG gợi ý PY_RUNNER_PUBLIC=true ở đây. Câu cũ mời người vận hành
          // bật một cờ mở toang route chạy mã cho cả internet, trong khi 401
          // gần như luôn có nghĩa khác: phiên khách chưa kịp cấp. apiFetch đã
          // tự gọi POST /auth/guest khi gặp 401 rồi gửi lại — nên IDE chạy
          // bình thường với PY_RUNNER_PUBLIC=false.
          detail: `HTTP 401 — ${errorMessage(body, 'phiên đăng nhập chưa sẵn sàng; tải lại trang để nhận phiên khách mới.')}`,
        });
      } else if (res.status === 429) {
        setState({
          status: 'error',
          kind: 'busy',
          // 429 có hai nguồn với hai lời khuyên KHÁC NHAU, backend đã phân biệt bằng
          // thông điệp: "Bạn chạy quá nhiều lần, đợi khoảng 1 phút…" (throttle) hoặc
          // "Máy chủ đang quá tải, thử lại sau" (hàng đợi đầy / chờ quá hạn). Hiện đúng
          // câu đó, đừng thay bằng câu chung: cả hai đều là lời khuyên cho người dùng.
          message: errorMessage(body, 'Máy chủ đang quá tải, thử lại sau'),
        });
      } else if (res.status === 503) {
        // 503 ở route này LUÔN là hạ tầng, không bao giờ là lỗi của mã: chế độ remote
        // không gọi được runner (tắt, lệch khoá, quá hạn), chế độ local không có docker
        // ("Máy chủ chưa cài Docker"). Trước đây trang hiện thẳng câu của backend vì nó
        // nói đúng nguyên nhân — nhưng người đọc là sinh viên, nên câu đó xuống
        // <details> còn trên mặt là một câu bình thường.
        setState({
          status: 'error',
          kind: 'unavailable',
          message: RUNNER_UNAVAILABLE_MESSAGE,
          detail: `HTTP 503 — ${errorMessage(body, 'bộ chạy Python không trả lời.')}`,
        });
      } else if (!res.ok) {
        setState({
          status: 'error',
          kind: 'other',
          message: errorMessage(body, `Không chạy được (HTTP ${res.status}).`),
        });
      } else if (isRunnerDown(body as RunResult)) {
        // 200 nhưng docker chết trước khi Python kịp chạy — xem isRunnerDown().
        setState({
          status: 'error',
          kind: 'unavailable',
          message: RUNNER_UNAVAILABLE_MESSAGE,
          detail: (body as RunResult).stderr.trim(),
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

  if (state.status === 'error') {
    // Hạ tầng chưa sẵn sàng thì KHÔNG tô đỏ: người học không làm gì sai cả.
    const infra = state.kind === 'unavailable' || state.kind === 'private';
    return (
      <div className={`${styles.notice} ${infra ? styles.noticeWarn : styles.noticeError}`} role="alert">
        <strong>
          {ERROR_TITLES[state.kind]}
        </strong>
        <p>{state.message}</p>
        {/* Gập chứ không xoá: giảng viên/trợ giảng cần đúng nguyên văn để báo lỗi. */}
        {state.detail && (
          <details className={styles.detail}>
            <summary>Chi tiết kỹ thuật</summary>
            <pre className={styles.detailBody}>{state.detail}</pre>
          </details>
        )}
      </div>
    );
  }

  const { result } = state;
  const out = clip(result.stdout);
  const err = clip(result.stderr);
  const ranOk = !result.timedOut && !result.outputTruncated;
  return (
    <>
      <div className={styles.meta}>
        <span>Thời gian chạy: {(result.durationMs / 1000).toFixed(2)} s</span>
        {/* Chỉ hiện khi thật sự phải xếp hàng; chạy ngay (0 ms) thì không thêm nhiễu. */}
        {(result.queuedMs ?? 0) > 0 && (
          <span>Chờ hàng đợi: {((result.queuedMs ?? 0) / 1000).toFixed(1)} s</span>
        )}
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
          Chương trình bị dừng vì dùng quá giới hạn bộ nhớ — mã thoát 137.
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
