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

import CodeVisualizer, { type MonacoHandle } from '@/components/code-visualizer/CodeVisualizer';
import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { apiFetch } from '@/lib/api';
import { EDITOR_LOAD_TIMEOUT_MS, editorLoadPhase } from '@/lib/editor-load-gate';
import { ideCodeHref, readIdeCodeFromHash } from '@/lib/ide-handoff';
import { isRunnerDown, RUNNER_UNAVAILABLE_MESSAGE } from '@/lib/runner-error';

import { DEFAULT_CODE, IDE_EXAMPLES } from './examples';
import styles from './ide.module.css';

/**
 * Bản Monaco TỰ HOST, cùng origin với trang.
 *
 * VÌ SAO KHÔNG DÙNG CDN NỮA: mặc định `@monaco-editor/loader` nạp
 * `https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs` — tức mở /ide là
 * 12 lượt tải sang jsdelivr. Phòng máy chặn hoặc làm chậm domain đó là mất
 * trắng trang IDE, mà /ide đang là thứ duy nhất demo được (xem AGENTS.md: DB
 * dùng chung đang hỏng đăng nhập). Pyodide đã tự host ở
 * public/pyodide/v314.0.7/ đúng vì lý do này từ trước; Monaco bị bỏ sót.
 *
 * Thư mục GHIM PHIÊN BẢN (v0.57.0) nên nội dung không bao giờ đổi → có luật
 * cache `immutable` trong next.config.ts, giống /pyodide/:path*. Muốn nâng cấp
 * là chép sang thư mục mới rồi đổi hằng số này, KHÔNG ghi đè file cũ.
 *
 * Cách dựng lại thư mục (0.57.0 đã ghim trong package-lock.json vì
 * @monaco-editor/react khai nó là peer dependency):
 *     cp -r node_modules/monaco-editor/min/vs frontend/public/monaco/v0.57.0/vs
 * rồi bỏ ba nhóm KHÔNG bao giờ được tải với editor python (25 MB → 9,3 MB):
 *     rm -rf …/vs/nls/lang          # chỉ tải khi require.config đặt availableLanguages
 *     rm -rf …/vs/language/typescript && rm …/vs/assets/ts.worker-*.js
 *     find …/vs -name '*.d.ts' -delete
 * Thêm `language="typescript"`/`"json"` hay đổi ngôn ngữ giao diện ở đâu đó
 * thì phải chép lại ĐỦ, không thì editor treo đúng kiểu đang sửa.
 */
const MONACO_VS_PATH = '/monaco/v0.57.0/vs';

/**
 * Cờ "không nạp được Monaco" do chính `loader.init()` báo.
 *
 * Vì sao là biến ở TẦM MODULE chứ không phải state: factory của `dynamic()`
 * chạy một lần, ngoài React, trước khi component nào kịp mount. `useSyncExternalStore`
 * bên dưới đọc lại cờ này nên vẫn vào đúng vòng render.
 */
let monacoRejected = false;
const monacoRejectedListeners = new Set<() => void>();
function subscribeMonacoRejected(onChange: () => void) {
  monacoRejectedListeners.add(onChange);
  return () => {
    monacoRejectedListeners.delete(onChange);
  };
}
const getMonacoRejected = () => monacoRejected;
const getMonacoRejectedServer = () => false;

// Monaco chỉ chạy được trong trình duyệt (cần window/worker) nên tắt SSR.
//
// `loader.config()` phải gọi TRƯỚC khi <Editor> render lần đầu, vì chính
// <Editor> gọi `loader.init()` trong effect của nó và lúc đó cấu hình đã đóng.
// Đặt ngay trong factory của dynamic() là chỗ duy nhất bảo đảm thứ tự đó.
//
// Gọi thêm `loader.init()` ở đây KHÔNG phải để lấy monaco (đã có <Editor> lo)
// mà để bắt được lời TỪ CHỐI: `@monaco-editor/react` bắt lỗi rồi chỉ
// console.error, không đẩy gì ra giao diện — nên trước bản này 404/bị chặn
// trông y hệt "đang tải", mãi mãi. Hai lời gọi init() dùng chung một promise
// trong loader nên không tải hai lần.
const Editor = dynamic(
  async () => {
    const mod = await import('@monaco-editor/react');
    mod.loader.config({ paths: { vs: MONACO_VS_PATH } });
    mod.loader.init().catch(() => {
      monacoRejected = true;
      for (const notify of monacoRejectedListeners) notify();
    });
    return mod.default;
  },
  {
    ssr: false,
    loading: () => <div className={styles.editorLoading}>Đang tải trình soạn thảo…</div>,
  },
);

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

/**
 * Mã bàn giao từ nút "Thử ngay trong IDE" của trang bài học: /ide#code=…
 * (xem src/lib/ide-handoff.ts). Tham số méo, quá dài hoặc không có → ví dụ mặc
 * định, không bao giờ để trang trắng.
 *
 * Đọc ngay lúc khởi tạo state (không phải trong effect) để editor mở ra đã có
 * đúng mã, khỏi nhấp một nhịp ví dụ mặc định. Không gây lệch hydration: máy chủ
 * không thấy fragment nên nó trả DEFAULT_CODE, nhưng `code` chỉ chảy vào Monaco
 * — thứ tải động với ssr:false — nên HTML của máy chủ và lần render đầu ở client
 * đều là khung "Đang tải trình soạn thảo…", không có chữ nào khác nhau.
 */
function initialCode(): string {
  if (typeof window === 'undefined') return DEFAULT_CODE;
  return readIdeCodeFromHash(window.location.hash) ?? DEFAULT_CODE;
}

export default function IdeClient() {
  const [code, setCode] = useState(initialCode);
  const [state, setState] = useState<RunState>({ status: 'idle' });
  const dark = useSyncExternalStore(subscribeTheme, getDark, getDarkServer);
  // Nội dung editor MỚI NHẤT, cập nhật đồng bộ trong onChange. Ctrl+Enter được gắn
  // MỘT lần lúc Monaco mount; nếu run() đọc state `code` (chỉ mới sau render kế)
  // thì gõ xong bấm phím tắt ngay có thể chạy bản cũ vài ký tự — đã đo được.
  const codeRef = useRef(code);
  const updateCode = useCallback((next: string) => {
    codeRef.current = next;
    setCode(next);
  }, []);

  const running = state.status === 'running';
  const abortRef = useRef<AbortController | null>(null);
  // Cho CodeVisualizer tô dòng đang chạy ngay trong Monaco. Giữ ở đây vì chỉ
  // `onMount` của editor mới có hai đối tượng này; mọi việc với decoration nằm
  // trong CodeVisualizer.
  const monacoRef = useRef<MonacoHandle | null>(null);
  // Chỗ đặt nút "Xem từng bước" trên thanh công cụ, cạnh nút Chạy — người dùng
  // bảo để dưới cuối trang thì không ai thấy. Dùng state chứ không dùng ref vì
  // CodeVisualizer phải render LẠI khi chỗ này có thật (ref thay đổi không báo
  // cho React biết); nó portal nút vào đây, nên trạng thái nút vẫn do chính nó
  // giữ, không phải một bản sao ở đây.
  const [visualizeSlot, setVisualizeSlot] = useState<HTMLSpanElement | null>(null);

  // --- LƯỚI AN TOÀN KHI KHÔNG NẠP ĐƯỢC TRÌNH SOẠN THẢO ---------------------
  // Ba tín hiệu đi vào editorLoadPhase() (src/lib/editor-load-gate.ts, có test):
  // mount được chưa, loader đã từ chối chưa, và đã chờ bao lâu.
  const [editorMounted, setEditorMounted] = useState(false);
  const monacoLoaderRejected = useSyncExternalStore(
    subscribeMonacoRejected,
    getMonacoRejected,
    getMonacoRejectedServer,
  );
  const editorStartedAtRef = useRef(0);
  const [editorElapsedMs, setEditorElapsedMs] = useState(0);
  useEffect(() => {
    if (editorMounted) return;
    // Mốc đặt trong effect (chạy ở client) chứ không phải lúc khởi tạo module:
    // trang có thể nằm sẵn trong bộ nhớ đệm back/forward hàng phút trước khi
    // người dùng mở lại, mốc cũ sẽ ra "đã chờ 3 phút" ngay lần render đầu.
    // performance.now() chứ không Date.now(): đây là đồng hồ ĐƠN ĐIỆU, không bị
    // kéo lùi khi máy đồng bộ NTP hay người dùng chỉnh giờ. Người chấm độc lập
    // bắt được chỗ này: với Date.now(), một lần chỉnh lùi trong 12 giây chờ sẽ
    // làm hiệu số nhỏ hơn trần, cổng trả 'loading', và vì bộ đếm chỉ bắn MỘT
    // lần nên trang đứng mãi ở "Đang tải" — đúng cái lỗi bản sửa này đang chữa.
    editorStartedAtRef.current = performance.now();
    // Hẹn LẠI chứ không hẹn một lần: nếu lượt bắn đầu vì lý do nào đó chưa đủ
    // trần (đồng hồ, tab bị treo rồi tỉnh), lượt sau vẫn kiểm tiếp. Dừng hẳn
    // khi đã quá trần, nên không phải vòng lặp vô hạn.
    let timer: ReturnType<typeof setTimeout>;
    const dem = () => {
      const troi = performance.now() - editorStartedAtRef.current;
      setEditorElapsedMs(troi);
      if (troi < EDITOR_LOAD_TIMEOUT_MS) {
        timer = setTimeout(dem, EDITOR_LOAD_TIMEOUT_MS - troi);
      }
    };
    timer = setTimeout(dem, EDITOR_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [editorMounted]);

  const editorPhase = editorLoadPhase({
    mounted: editorMounted,
    rejected: monacoLoaderRejected,
    elapsedMs: editorElapsedMs,
  });

  /**
   * "Thử lại" = TẢI LẠI TRANG, không phải dựng lại <Editor>.
   *
   * Vì sao: `@monaco-editor/loader` giữ một promise duy nhất cho cả vòng đời
   * trang (`isInitialized` + `wrapperPromise` trong monaco-loader.js). Một khi
   * promise đó đã từ chối thì mọi lần `loader.init()` sau đều nhận lại đúng
   * lời từ chối cũ — dựng lại component chỉ cho ra khung "đang tải" treo lần
   * nữa. Chỉ lần tải trang mới mới có loader mới.
   *
   * Mã người dùng đang gõ được cất vào fragment trước khi tải lại (cùng cơ chế
   * nút "Thử ngay trong IDE" của trang bài học, xem src/lib/ide-handoff.ts) nên
   * thử lại KHÔNG mất bài. `replaceState` đổi địa chỉ mà không điều hướng, rồi
   * `reload()` nạp lại chính địa chỉ đó — đặt thẳng `location.hash` bằng giá
   * trị đang có thì trình duyệt coi là không đổi và không tải lại gì.
   */
  const retryEditor = useCallback(() => {
    const href = ideCodeHref(codeRef.current);
    if (href) window.history.replaceState(null, '', href);
    window.location.reload();
  }, []);

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
              <span ref={setVisualizeSlot} className={styles.visualizeSlot} />
              <button type="button" className={styles.run} onClick={() => void run()} disabled={running}>
                {running ? 'Đang chạy…' : '▶ Chạy'}
                {!running && <kbd className={styles.kbd}>Ctrl+Enter</kbd>}
              </button>
            </div>
          </div>

          <div className={styles.split}>
            <section className={styles.editorPane} aria-label="Trình soạn thảo mã Python">
              {editorPhase === 'failed' ? (
                <PlainEditor code={code} onChange={updateCode} onRun={run} onRetry={retryEditor} />
              ) : (
                <Editor
                  height="100%"
                  language="python"
                  theme={dark ? 'vs-dark' : 'light'}
                  value={code}
                  onChange={(v) => updateCode(v ?? '')}
                  onMount={(editor, monaco) => {
                    // addCommand đè lệnh mặc định của Ctrl+Enter trong Monaco (chèn dòng mới).
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => void run());
                    monacoRef.current = { editor, monaco };
                    setEditorMounted(true);
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
              )}
            </section>

            <section className={styles.outputPane} aria-label="Kết quả" aria-live="polite" aria-busy={running}>
              <Output state={state} />
            </section>
          </div>

          {/* Xem từng bước: chạy MỘT lượt trong cùng sandbox rồi bước qua vết
              cục bộ. Toàn bộ nằm trong component — xem
              frontend/src/components/code-visualizer/CodeVisualizer.tsx. */}
          <CodeVisualizer codeRef={codeRef} editorRef={monacoRef} triggerHost={visualizeSlot} />
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

/**
 * Trình soạn thảo DỰ PHÒNG: một <textarea> trần, hiện khi Monaco không lên.
 *
 * Vì sao phải có chứ không chỉ báo lỗi rồi thôi: /ide là thứ duy nhất còn demo
 * được trong buổi thử nghiệm USTH, và nút Chạy KHÔNG phụ thuộc Monaco — nó gửi
 * `codeRef.current` lên máy chủ. Mất tô màu cú pháp thì vẫn gõ và chạy được
 * Python; mất cả ô gõ thì mất trắng.
 *
 * Vì sao Monaco bị GỠ HẲN khi rơi vào đây (không giữ ẩn để nó lên sau rồi
 * đổi lại): editor tự hiện ra giữa lúc người ta đang gõ sẽ cướp con trỏ và
 * trông như trang hỏng — đúng lúc đang đứng trình bày. Thà đứng yên ở bản dự
 * phòng; muốn Monaco thì bấm "Thử lại" (tải lại trang, mã được giữ).
 */
function PlainEditor({
  code,
  onChange,
  onRun,
  onRetry,
}: {
  code: string;
  onChange: (next: string) => void;
  onRun: () => void | Promise<void>;
  onRetry: () => void;
}) {
  return (
    <div className={styles.fallback}>
      <div className={`${styles.notice} ${styles.noticeWarn}`} role="alert">
        <strong>Không tải được trình soạn thảo</strong>
        <p>
          Nhiều khả năng mạng ở đây chặn hoặc làm rớt tệp của trình soạn thảo. Ô gõ bên dưới
          vẫn chạy được: gõ mã rồi bấm “Chạy” như thường (chỉ không có tô màu cú pháp và gợi
          ý). Thụt dòng bằng 4 dấu cách.
        </p>
        <p>
          <button type="button" className={styles.retry} onClick={onRetry}>
            Thử lại
          </button>
        </p>
      </div>
      <textarea
        className={styles.fallbackInput}
        aria-label="Mã Python (trình soạn thảo dự phòng)"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        // Ctrl+Enter gắn ở đây vì phím tắt kia do Monaco cung cấp, mà Monaco
        // chính là thứ đang thiếu. Nhãn <kbd> trên nút Chạy vẫn nói đúng sự thật.
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            void onRun();
          }
        }}
      />
    </div>
  );
}
