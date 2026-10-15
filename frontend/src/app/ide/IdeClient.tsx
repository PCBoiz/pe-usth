'use client';

// Bàn thí nghiệm (/ide): editor Monaco bên trái, kết quả bên phải. Bấm Run (hoặc Ctrl+Enter)
// gửi mã tới POST /api/python/run; backend chạy trong container Docker cách ly
// rồi trả stdout/stderr (xem src/python-runner ở backend). Một request đồng bộ,
// không hàng đợi — nên "đang chạy" kéo dài tới khi chương trình xong hoặc hết giờ.
//
// Đây là công cụ, KHÔNG phải khoá học: không ghi tiến độ/XP/đăng ký.
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
import { nextEditorCheckDelayMs } from '@/lib/editor-load-recheck';
import {
  forgetIdeReloadCode,
  planIdeReload,
  readIdeCodeOnLoad,
  sessionStorageOrNull,
} from '@/lib/ide-handoff';
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
 * public/pyodide/v0.27.7/ đúng vì lý do này từ trước; Monaco bị bỏ sót.
 *
 * Thư mục GHIM PHIÊN BẢN (v0.57.0) nên nội dung không bao giờ đổi → có luật
 * cache `immutable` trong next.config.ts, giống /pyodide/:path*. Muốn nâng cấp
 * là chép sang thư mục mới rồi đổi hằng số này, KHÔNG ghi đè file cũ.
 *
 * Cách dựng lại thư mục — chạy TỪ `frontend/`, trong Git Bash (bốn lệnh dưới
 * là POSIX, máy làm việc của repo này là Windows). node_modules/monaco-editor
 * chỉ có ở `frontend/`; 0.57.0 đã ghim trong frontend/package-lock.json vì
 * @monaco-editor/react khai nó là peer dependency:
 *     rm -rf public/monaco/v0.57.0/vs && mkdir -p public/monaco/v0.57.0
 *     cp -r node_modules/monaco-editor/min/vs public/monaco/v0.57.0/vs
 *     rm -rf public/monaco/v0.57.0/vs/nls
 *     rm -rf public/monaco/v0.57.0/vs/language/typescript
 *     rm public/monaco/v0.57.0/vs/assets/ts.worker-*.js
 * (Không cần dọn `*.d.ts`: cả 13 tệp .d.ts của bản 0.57.0 đều nằm trong
 * `nls/lang/`, nên `rm -rf nls` ở trên đã cuốn hết — một lệnh `find … -delete`
 * thêm vào đây xoá đúng 0 tệp.)
 * Ra 122 tệp, 9 152 631 byte (bản gốc 151 tệp, 25 564 261 byte). Đã kiểm ngày
 * 14/10/2026: dựng theo đúng các lệnh trên vào thư mục tạm rồi `diff -r` với
 * bản trong repo — trùng từng byte.
 *
 * Hai nhóm bị bỏ và hậu quả THẬT nếu sau này cần tới chúng:
 *  - `nls/` chỉ chứa bản dịch giao diện, chỉ tải khi require.config đặt
 *    availableLanguages — ở đây không đặt.
 *  - TypeScript: worker ở `assets/ts.worker-*.js` và `language/typescript/`.
 *    Đặt `language="typescript"` thì editor KHÔNG treo — tô màu cú pháp vẫn có
 *    (phần đó nằm ở basic-languages, còn giữ) — chỉ lượt tải TS worker bị 404,
 *    tức mất gợi ý/báo lỗi kiểu. Cần những thứ đó thì chép lại hai nhóm này.
 * JSON KHÔNG bị tỉa (còn `assets/json.worker-*.js`, `language/json/`), nên
 * `language="json"` chạy đủ như bản gốc.
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
  // "Bàn thí nghiệm", không "IDE": bảng thuật ngữ của bản thiết kế chốt
  // MỘT tên cho trình soạn code, và người học chỉ gặp cái tên đó.
  private: 'Bàn thí nghiệm chưa mở cho phiên này',
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
  // Sau fragment còn bản cất của nút "Thử lại" (sessionStorage) — đường dành
  // cho mã quá dài để nhét vào địa chỉ. Thứ tự ưu tiên và lý do: xem
  // readIdeCodeOnLoad() trong src/lib/ide-handoff.ts (có test).
  return readIdeCodeOnLoad(window.location.hash, sessionStorageOrNull()) ?? DEFAULT_CODE;
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
  // Bản cất của nút "Thử lại" đã nằm trong state ở trên → xoá nó đi, kẻo mở lại
  // /ide trong tab này về sau hiện mã cũ thay cho ví dụ mặc định.
  useEffect(() => forgetIdeReloadCode(sessionStorageOrNull()), []);

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
    // trần (bộ hẹn giờ bắn sớm vài phần mười ms so với performance.now(), tab
    // bị treo rồi tỉnh), lượt sau vẫn kiểm tiếp. Khi nào hẹn, khi nào thôi do
    // nextEditorCheckDelayMs() quyết (src/lib/editor-load-recheck.ts, có test):
    // nó hỏi lại CHỪNG NÀO cổng còn nói 'loading', và thôi ngay khi cổng kết
    // luận — nên vừa không đứng im, vừa không phải vòng lặp vô hạn.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const elapsedMs = performance.now() - editorStartedAtRef.current;
      setEditorElapsedMs(elapsedMs);
      const phase = editorLoadPhase({ mounted: false, rejected: getMonacoRejected(), elapsedMs });
      const delay = nextEditorCheckDelayMs(phase, elapsedMs, EDITOR_LOAD_TIMEOUT_MS);
      if (delay !== null) timer = setTimeout(check, delay);
    };
    // Lượt đầu hẹn thẳng một trần (không gọi check() ngay): vừa mở thì đã chờ
    // 0 ms, hỏi cổng lúc này chắc chắn ra 'loading' — chỉ tốn một lần render.
    timer = setTimeout(check, EDITOR_LOAD_TIMEOUT_MS);
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
   * Mã đang gõ được cất TRƯỚC khi tải lại, bằng planIdeReload()
   * (src/lib/ide-handoff.ts, có test): vào fragment nếu vừa (cùng cơ chế nút
   * "Thử ngay trong IDE"), không vừa — quá 16.000 ký tự — thì vào
   * sessionStorage. Bản đầu chỉ có fragment: mã dài là tải lại MẤT BÀI, trong
   * khi chú thích chỗ này hứa ngược lại. Nếu cả hai đều không cất được (bộ nhớ
   * bị chặn, hết hạn mức) thì KHÔNG tải lại: hiện lời nhắn bảo chép mã ra trước,
   * người dùng tự bấm tải lại khi đã chép xong.
   *
   * `replaceState` đổi địa chỉ mà không điều hướng, rồi `reload()` nạp lại
   * chính địa chỉ đó — đặt thẳng `location.hash` bằng giá trị đang có thì trình
   * duyệt coi là không đổi và không tải lại gì.
   */
  const [retryBlocked, setRetryBlocked] = useState(false);
  const retryEditor = useCallback(() => {
    const plan = planIdeReload(codeRef.current, sessionStorageOrNull());
    if (!plan.ok) {
      setRetryBlocked(true);
      return;
    }
    window.history.replaceState(null, '', plan.href);
    window.location.reload();
  }, []);
  // Người dùng đã thấy lời nhắn và tự xác nhận đã chép mã. THỬ CẤT LẠI MỘT LẦN
  // NỮA trước khi tải lại: giữa lúc đọc lời nhắn họ thường xoá bớt mã cho ngắn
  // lại (ngắn tới mức vừa fragment), hoặc bộ nhớ của trình duyệt hồi lại. Bản
  // đầu gọi thẳng reload() nên hai trường hợp đó vẫn mất bài một cách vô ích —
  // `retryBlocked` một khi bật thì không bao giờ tắt.
  const forceReload = useCallback(() => {
    const plan = planIdeReload(codeRef.current, sessionStorageOrNull());
    if (plan.ok) window.history.replaceState(null, '', plan.href);
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
          // Cùng MỘT câu với nhánh 503 và nhánh docker-chết: người học thấy
          // cùng một hỏng hóc ("không chạy được trên máy chủ") nên không có lý
          // do nào để ba nhánh nói ba kiểu. Nguyên nhân thật ở `detail`.
          message: RUNNER_UNAVAILABLE_MESSAGE,
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
            <h1 className={styles.title}>Bàn thí nghiệm</h1>
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
                {/* ▶ là trang trí: trong nhãn nút nó bị trình đọc màn hình đọc
                    thành tên ký tự, nên phải aria-hidden chứ không để trần. */}
                {running ? 'Đang chạy…' : <><span aria-hidden="true">▶</span> Chạy</>}
                {!running && <kbd className={styles.kbd}>Ctrl+Enter</kbd>}
              </button>
            </div>
          </div>

          <div className={styles.split}>
            <section className={styles.editorPane} aria-label="Trình soạn thảo mã Python">
              {editorPhase === 'failed' ? (
                <PlainEditor
                  code={code}
                  onChange={updateCode}
                  onRun={run}
                  onRetry={retryEditor}
                  retryBlocked={retryBlocked}
                  onForceReload={forceReload}
                />
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

              {/* "Xem từng bước" nằm TRONG mục kết quả, không phải một khối
                  riêng dưới cả hai cột. Lý do: nó cũng là kết quả của việc
                  chạy — chỉ khác ở chỗ xem được từng bước — nên đặt nó ngoài
                  mục này buộc người học nhìn xuống một vùng thứ ba để đọc cùng
                  một thứ. Khối cũ còn kéo dài hết chiều ngang trang nên đẩy
                  console lên cao và tách rời khỏi vết của chính nó.
                  Toàn bộ nằm trong component — xem
                  frontend/src/components/code-visualizer/CodeVisualizer.tsx. */}
              <CodeVisualizer codeRef={codeRef} editorRef={monacoRef} triggerHost={visualizeSlot} />
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
        {/* "Đang chạy trong sandbox…" là bản cũ: "sandbox" lọt tiếng Anh, và
            nó cũng không trả lời câu người học đang thắc mắc lúc chờ — mã đang
            chạy Ở ĐÂU. Ở trang này là MÁY CHỦ (POST /api/python/run), khác với
            bài học chạy Pyodide trong trình duyệt; nói ra thì khối ghi chú
            "Hai nơi chạy Python" ở trang chủ mới có chỗ bám. */}
        <span className={styles.spinner} aria-hidden="true" /> Đang chạy trên máy chủ…
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
 * phòng; muốn Monaco thì bấm "Thử lại" (tải lại trang; mã được cất vào địa
 * chỉ hoặc sessionStorage trước, không cất được thì trang KHÔNG tự tải lại —
 * xem retryEditor).
 */
function PlainEditor({
  code,
  onChange,
  onRun,
  onRetry,
  retryBlocked,
  onForceReload,
}: {
  code: string;
  onChange: (next: string) => void;
  onRun: () => void | Promise<void>;
  onRetry: () => void;
  /** "Thử lại" vừa không cất được mã → hỏi lại người dùng thay vì tải lại mù. */
  retryBlocked: boolean;
  onForceReload: () => void;
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
        {retryBlocked ? (
          // Đến được đây nghĩa là mã quá dài để nhét vào địa chỉ VÀ trình duyệt
          // không cho ghi sessionStorage. Tải lại lúc này là mất bài, nên để
          // người dùng tự quyết sau khi đã chép mã ra chỗ khác.
          <>
            <p>
              <strong>Chưa tải lại:</strong> mã của bạn quá dài để giữ qua lần tải lại, và trình
              duyệt đang chặn bộ nhớ tạm của trang. Hãy chép mã ra chỗ khác trước (bấm vào ô gõ,
              Ctrl+A rồi Ctrl+C), sau đó mới tải lại.
            </p>
            <p>
              <button type="button" className={styles.retry} onClick={onForceReload}>
                Đã chép mã — tải lại
              </button>
            </p>
          </>
        ) : (
          <p>
            <button type="button" className={styles.retry} onClick={onRetry}>
              Thử lại
            </button>
          </p>
        )}
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
