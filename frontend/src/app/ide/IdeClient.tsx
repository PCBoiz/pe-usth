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
//
// HAI THỨ CHỈ CÓ Ở ĐƯỜNG CLIENT (xem src/lib/ide-runner.ts):
//  · nút Chạy đổi thành "■ Dừng" trong lúc chạy, kèm đếm ngược 5 giây cuối —
//    trước bản này, gặp `while True:` là ngồi chờ hết 15 giây mà không có cách
//    nào dừng và cũng không biết bao giờ thì dừng;
//  · tự lưu mã đang soạn vào localStorage, để câu "mã của bạn vẫn còn nguyên"
//    còn đúng cả sau một lần F5.
// Đường MÁY CHỦ giữ nguyên hành vi cũ: nó có giới hạn 10 s riêng ở backend và
// không có gì ở client cắt được một request đang bay.

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import CodeVisualizer, { type MonacoHandle } from '@/components/code-visualizer/CodeVisualizer';
import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { apiFetch } from '@/lib/api';
import {
  clearIdeCode,
  countdownSeconds,
  disposeIdeRunner,
  IDE_AUTOSAVE_DEBOUNCE_MS,
  IDE_OUTPUT_CAP_CHARS,
  IDE_RUN_TIMEOUT_MS,
  type IdeCodeSource,
  ideRunnerMode,
  loadIdeCode,
  needsLinkConfirm,
  pickIdeOpeningCode,
  runInBrowser,
  saveIdeCode,
  stopInBrowser,
  warmIdeRunner,
} from '@/lib/ide-runner';
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
  /**
   * Ai đã cắt lần chạy (chỉ đường client đặt — xem IdeRunResult trong
   * src/lib/ide-runner.ts). Kết quả từ máy chủ không có trường này, nên nhánh
   * máy chủ vẫn rơi vào đúng thông báo "Hết giờ" cũ.
   */
  cutBy?: 'timeout' | 'user';
};

type RunState =
  | { status: 'idle' }
  | {
      status: 'running';
      /**
       * Lần chạy NÀY có dừng được không. Chỉ đường client dừng được, nên cờ
       * này đi theo từng lần chạy chứ không phải đọc `ideRunnerMode()` lúc
       * render: đọc lúc render thì máy chủ (không thấy `?runner=`) và client
       * ra hai kết quả khác nhau, tức lệch hydration.
       */
      canStop: boolean;
      /** Mốc performance.now() lúc bấm Chạy, để đếm ngược mấy giây cuối. */
      startedAt: number;
    }
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
 * "Đã qua lần render đầu ở client chưa".
 *
 * VÌ SAO CẦN: dải "đã khôi phục bản tự lưu" là chữ THẬT trong DOM, mà máy chủ
 * không đọc được localStorage nên HTML nó trả về không bao giờ có dải đó. Vẽ
 * dải ngay lần render đầu ở client là lệch hydration.
 *
 * Vì sao `useSyncExternalStore` chứ không `setState` trong effect: đây đúng là
 * cơ chế React dành cho giá trị CHỈ CÓ Ở CLIENT — `getServerSnapshot` trả
 * false, React tự so lại sau khi hydrate rồi render thêm một lượt. Viết bằng
 * `useEffect(() => setX(true))` thì lint `react-hooks/set-state-in-effect`
 * chặn, và nó chặn đúng: đó là một lượt render phụ đi qua state không cần thiết.
 */
function subscribeHydrated() {
  // Không bao giờ đổi sau khi hydrate xong, nên không cần đăng ký gì.
  return () => {};
}
const getHydrated = () => true;
const getHydratedServer = () => false;

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
 * Mã /ide mở ra, và nó đến từ đâu. BA nguồn, thứ tự ưu tiên nằm trong
 * `pickIdeOpeningCode` (src/lib/ide-runner.ts, có test):
 *  1. `/ide#code=…` — bàn giao từ nút "Thử ngay trong IDE" của trang bài học
 *     (xem src/lib/ide-handoff.ts). Tham số méo hoặc quá dài → coi như không có.
 *  2. bản tự lưu trong localStorage;
 *  3. ví dụ mặc định — không bao giờ để trang trắng.
 *
 * Đọc ngay lúc khởi tạo state (không phải trong effect) để editor mở ra đã có
 * đúng mã, khỏi nhấp một nhịp ví dụ mặc định. Không gây lệch hydration: máy chủ
 * không thấy fragment lẫn localStorage nên nó trả DEFAULT_CODE, nhưng `code`
 * chỉ chảy vào Monaco — thứ tải động với ssr:false — nên HTML của máy chủ và
 * lần render đầu ở client đều là khung "Đang tải trình soạn thảo…", không có
 * chữ nào khác nhau. Dải "đã khôi phục" thì KHÁC: nó là chữ thật trong HTML,
 * nên nó bật lên trong effect, sau hydration (xem `restored` bên dưới).
 */
function initialOpening(): { code: string; source: IdeCodeSource } {
  if (typeof window === 'undefined') return { code: DEFAULT_CODE, source: 'default' };
  return pickIdeOpeningCode({
    hashCode: readIdeCodeFromHash(window.location.hash),
    savedCode: loadIdeCode(),
    defaultCode: DEFAULT_CODE,
  });
}

export default function IdeClient() {
  const [opening] = useState(initialOpening);
  const [code, setCode] = useState(opening.code);
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
  // Lần chạy đang treo có dừng được không, và nó bắt đầu lúc nào. Rút ra thành
  // hai giá trị vô hướng để làm dep của effect đếm ngược: để nguyên object
  // `state` thì effect dựng lại interval sau MỌI lần setState.
  const canStop = state.status === 'running' && state.canStop;
  const runStartedAt = state.status === 'running' ? state.startedAt : 0;
  // Số giây đếm ngược đang hiện. Khai ở đây — trước `run()` — vì `run()` phải
  // xoá số sót của lần chạy trước; mọi lời giải thích nằm ở chỗ bắc bộ hẹn, tìm
  // "Đếm ngược mấy giây cuối" bên dưới.
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
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

  // --- TỰ LƯU MÃ ĐANG SOẠN -------------------------------------------------
  // Luật chọn nguồn và ba hàm đọc/ghi/xoá nằm ở src/lib/ide-runner.ts (có test);
  // ở đây chỉ còn phần nối vào React.

  /**
   * Có đang hiện dải "đã khôi phục bản tự lưu" không.
   *
   * VÌ SAO PHẢI HIỆN CHO BIẾT thay vì khôi phục im lặng: người học mở /ide ra
   * thấy một đoạn mã mình không vừa gõ thì phản ứng đầu tiên là "trang hỏng"
   * hoặc "mất bài", chứ không phải "à, nó nhớ hộ mình".
   *
   * Dẫn xuất ra chứ không giữ thành state riêng: nguồn mã (`opening.source`)
   * đã chốt lúc mở trang và không đổi nữa, nên chỉ còn hai biến thật — đã
   * hydrate chưa, và người dùng đã đóng dải chưa.
   */
  const hydrated = useSyncExternalStore(subscribeHydrated, getHydrated, getHydratedServer);
  const [restoreDismissed, setRestoreDismissed] = useState(false);
  const restored = hydrated && opening.source === 'autosave' && !restoreDismissed;

  /**
   * Mã đến từ một ĐƯỜNG LINK (`/ide#code=…`) và sắp chạy trong trình duyệt của
   * chính người mở — hỏi một câu trước khi chạy.
   *
   * Đo được trên bản thật: trong Worker thì `localStorage`/`document` đều không
   * với tới (cách ly miễn phí), NHƯNG `fetch` mở và một lời gọi
   * `POST /auth/refresh` kèm `credentials:'include'` trả về access token của
   * chính người đang xem. Nên thiệt hại không phải đọc trộm token mà là CHIẾM
   * PHIÊN, và chặn `ctypes` không giải quyết gì vì `js.fetch` là API hợp pháp.
   *
   * Đây KHÔNG phải lớp phòng thật — lớp thật là tách origin. Nó chỉ cắt chuỗi
   * "gửi link, người kia bấm Chạy, xong" bằng một lần hỏi, và chỉ hỏi đúng ca
   * đáng hỏi. Mã người học tự gõ hoặc khôi phục từ máy họ thì không hỏi.
   */
  const [linkTrusted, setLinkTrusted] = useState(false);
  const askLink = hydrated && !linkTrusted
    && needsLinkConfirm(opening.source, ideRunnerMode());
  // `run` là useCallback rỗng deps (xem codeRef ở trên, cùng lý do): đọc state
  // trong đó là đọc bản của lần render đầu, tức cú bấm NGAY sau khi xác nhận sẽ
  // vẫn thấy "chưa xác nhận". Gương ra ref để nó luôn đọc giá trị mới nhất.
  // Gương qua effect chứ không gán thẳng lúc render: React 19 chặn ghi ref
  // trong thân component (`react-hooks/purity`), và lý do của nó đúng — ghi lúc
  // render thì một lần render bị bỏ dở vẫn để lại dấu vết.
  const askLinkRef = useRef(askLink);
  useEffect(() => {
    askLinkRef.current = askLink;
  }, [askLink]);

  // Ghi có HOÃN: `setItem` là lời gọi đồng bộ trên main thread, ghi mỗi phím
  // nghĩa là tuần tự hoá lại cả bài sau từng ký tự. Mỗi lần `code` đổi, hẹn
  // lại từ đầu — nên một câu gõ liền mạch chỉ tốn đúng một lượt ghi.
  useEffect(() => {
    const hen = setTimeout(() => saveIdeCode(code), IDE_AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(hen);
  }, [code]);

  // Chốt sổ khi rời trang. Thiếu bước này thì đúng mấy ký tự cuối — thứ người
  // ta vừa gõ xong rồi F5 — là thứ bị mất, tức là mất đúng cái mà tự lưu tồn
  // tại để giữ.
  //
  // `pagehide` chứ không `beforeunload`: beforeunload làm trình duyệt bỏ trang
  // ra khỏi bộ nhớ đệm back/forward, và Safari trên iOS gần như không bắn nó
  // khi người dùng chuyển app. `pagehide` bắn cả khi trang chỉ bị ĐÓNG BĂNG.
  useEffect(() => {
    const luuNgay = () => saveIdeCode(codeRef.current);
    window.addEventListener('pagehide', luuNgay);
    return () => {
      window.removeEventListener('pagehide', luuNgay);
      // Cả lúc component bị gỡ: điều hướng trong app (next/link) không bắn
      // pagehide lần nào.
      luuNgay();
    };
  }, []);

  /** "Dùng ví dụ mặc định": bỏ bản tự lưu và quay về ví dụ gốc. */
  const dungViDuMacDinh = useCallback(() => {
    updateCode(DEFAULT_CODE);
    clearIdeCode();
    setRestoreDismissed(true);
    // Effect ghi-có-hoãn ở trên sẽ lưu lại chính DEFAULT_CODE sau 800 ms. Vô
    // hại: `pickIdeOpeningCode` so bản lưu với ví dụ mặc định và coi trùng là
    // 'default', nên lần mở sau không báo "đã khôi phục" nữa.
  }, [updateCode]);

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
    if (askLinkRef.current) return; // mã từ link chưa được xác nhận — xem `askLink`
    const controller = new AbortController();
    abortRef.current = controller;
    // Đường CLIENT: chạy Pyodide ngay trong trình duyệt, không đụng backend.
    // Mặc định vẫn là máy chủ; bật bằng NEXT_PUBLIC_IDE_RUNNER=client hoặc
    // `?runner=client` để thử trên trang thật mà không deploy lại.
    //
    // Chốt chế độ MỘT LẦN ở đây rồi mang theo cả lần chạy: đọc lại
    // `ideRunnerMode()` ở chỗ khác thì nút Dừng và đường thật sự đang chạy có
    // thể lệch nhau nếu địa chỉ đổi giữa chừng.
    const duongClient = ideRunnerMode() === 'client';
    setSecondsLeft(null); // xem chú thích của bộ đếm ngược: xoá số sót của lần trước
    setState({ status: 'running', canStop: duongClient, startedAt: performance.now() });
    try {
      if (duongClient) {
        try {
          const result = await runInBrowser(codeRef.current);
          if (!controller.signal.aborted) setState({ status: 'done', result });
        } catch (e) {
          if (!controller.signal.aborted) {
            setState({
              status: 'error',
              kind: 'unavailable',
              message:
                'Không khởi động được Python trong trình duyệt. Thử tải lại trang; '
                + 'nếu vẫn vậy, trình duyệt có thể đang chặn Web Worker.',
              detail: e instanceof Error ? e.message : String(e),
            });
          }
        }
        return;
      }
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

  /**
   * Người học bấm "■ Dừng".
   *
   * KHÔNG abort `abortRef`: lần chạy bị dừng vẫn phải được VẼ RA (thông báo
   * "bạn đã dừng chương trình" + nhắc rằng mã trong editor còn nguyên), mà
   * nhánh client bỏ qua kết quả khi `controller.signal.aborted`. Abort ở đây
   * là tự bịt miệng chính thông báo mình vừa viết.
   *
   * Việc cắt thật — `terminate()` worker rồi nạp sẵn worker thay thế — nằm
   * trong `stopInBrowser()` (src/lib/ide-runner.ts); promise của `runInBrowser`
   * resolve với `cutBy: 'user'` và `run()` ở trên hiển thị nó như một lần chạy
   * bình thường bị cắt, không phải một lỗi.
   */
  const stop = useCallback(() => {
    stopInBrowser();
  }, []);

  /**
   * "Tôi tin đoạn mã này — cho chạy": tin VÀ chạy, một cú bấm.
   *
   * Trước đây nút này chỉ `setLinkTrusted(true)` — dải cảnh báo biến mất và
   * KHÔNG có gì chạy, dù nhãn hứa "cho chạy". Người dùng phải bấm Chạy lần nữa.
   *
   * Ghi thẳng vào `askLinkRef` chứ không chờ effect gương nó: state mới chưa
   * tới `run()` trong cùng một lượt, nên không ghi ref thì `run()` vẫn thấy
   * "chưa xác nhận" và lại không chạy gì. Ghi ref TRONG event handler là hợp lệ
   * — luật `react-hooks/purity` chỉ chặn ghi trong thân component lúc render.
   */
  const tinVaChay = useCallback(() => {
    setLinkTrusted(true);
    askLinkRef.current = false;
    void run();
  }, [run]);

  /**
   * Đếm ngược mấy giây cuối. Mốc lấy bằng `performance.now()` — đồng hồ ĐƠN
   * ĐIỆU, không bị kéo lùi khi máy đồng bộ NTP; cùng lý do như bộ đếm chờ
   * Monaco ở trên.
   *
   * Nhịp 250 ms chứ không 1000 ms: với nhịp 1 giây, con số hiện ra có thể đã
   * cũ gần một giây, nên người đọc thấy "còn 1 s" rồi bị cắt ngay — đúng cái
   * bất ngờ mà đếm ngược sinh ra để dẹp.
   *
   * ĐỒNG HỒ ĐƯỢC ĐỌC TRONG BỘ HẸN, không phải lúc render. `performance.now()`
   * là hàm không thuần khiết: gọi nó giữa lúc render làm cùng một cây React
   * cho ra hai kết quả khác nhau, và lint `react-hooks/purity` chặn đúng chỗ
   * đó. Nhưng `setSecondsLeft` cũng không được gọi THẲNG trong thân effect
   * (`react-hooks/set-state-in-effect`) — nên cả hai luật cùng dẫn về một
   * khuôn: effect chỉ bắc bộ hẹn, mọi lượt đặt state đi qua bộ hẹn đó.
   *
   * Giá trị cũ của lần chạy TRƯỚC bị che bằng `canStop` lúc render, và `run()`
   * đặt lại null ngay khi bấm Chạy — thiếu bước đó thì 250 ms đầu của lần chạy
   * mới còn hiện "tự dừng sau 0 s" sót lại từ lần vừa bị cắt. Chính vì `run()`
   * dùng tới nó mà `secondsLeft` được khai ở TRÊN `run()`, không phải ở đây.
   */
  useEffect(() => {
    if (!canStop) return;
    const dem = () => setSecondsLeft(countdownSeconds(performance.now() - runStartedAt));
    const nhip = setInterval(dem, 250);
    return () => clearInterval(nhip);
  }, [canStop, runStartedAt]);
  const demNguoc = canStop ? secondsLeft : null;

  // Rời trang giữa chừng thì huỷ request đang treo (container vẫn tự hết giờ ở máy chủ).
  useEffect(() => () => abortRef.current?.abort(), []);

  // Đường client: nạp sẵn runtime lúc người học còn đang gõ. Runtime ~13 MB,
  // để rơi vào lần bấm Chạy đầu thì họ tưởng chương trình của mình chậm.
  useEffect(() => {
    warmIdeRunner();
    return disposeIdeRunner;
  }, []);

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
              {/* Đếm ngược để ĐỂ CẠNH nút Dừng, không nhét vào khung kết quả:
                  khung đó có aria-live="polite" nên một con số đổi mỗi 250 ms
                  sẽ bị đọc đi đọc lại cho người dùng trình đọc màn hình. Câu
                  nói ra luật ("không tự dừng sau 15 giây sẽ bị cắt") nằm trong
                  khung kết quả và chỉ đọc một lần — xem <Output>. */}
              {demNguoc !== null && (
                <span className={styles.countdown} aria-hidden="true">
                  tự dừng sau {demNguoc} s
                </span>
              )}
              {/* MỘT nút đổi vai, không phải hai nút cạnh nhau (mẫu của
                  PyScript: editor đang chạy thì Run thành Stop). Chi phí bằng
                  không, mà đổi được cảm giác "hệ thống cắt tôi" thành "tôi dừng
                  nó". Đường máy chủ không dừng được nên vẫn vô hiệu hoá như cũ. */}
              {/* Vô hiệu hoá khi mã từ link chưa được xác nhận. Trước đây nút
                  vẫn bấm được nhưng `run()` lặng lẽ `return` ở cổng xác nhận —
                  người dùng bấm Chạy và KHÔNG có gì xảy ra, không một lời giải
                  thích. Nút mờ cạnh dải cảnh báo thì tự nói ra lý do. */}
              <button
                type="button"
                className={canStop ? styles.stop : styles.run}
                onClick={canStop ? stop : () => void run()}
                disabled={(running && !canStop) || askLink}
                title={askLink ? 'Xác nhận đoạn mã đến từ link ở bên dưới trước khi chạy' : undefined}
              >
                {canStop ? '■ Dừng' : running ? 'Đang chạy…' : '▶ Chạy'}
                {!running && <kbd className={styles.kbd}>Ctrl+Enter</kbd>}
              </button>
            </div>
          </div>

          {askLink && (
            // Mã này đến từ một đường link và sắp chạy trong trình duyệt của
            // chính người đang mở. Nói thẳng điều đó rồi để họ quyết — xem
            // `needsLinkConfirm` trong ide-runner.ts để biết vì sao chỉ hỏi ở
            // đúng ca này.
            <div className={styles.restored} role="status">
              <span>
                Đoạn mã này đến từ một đường link, và nó sẽ chạy ngay trong trình duyệt của
                bạn. Chỉ chạy nếu bạn tin nơi gửi link.
              </span>
              <button
                type="button"
                className={styles.restoredAction}
                onClick={tinVaChay}
              >
                Tôi tin đoạn mã này — cho chạy
              </button>
            </div>
          )}
          {restored && (
            <div className={styles.restored} role="status">
              <span>
                Đã khôi phục đoạn mã bạn gõ lần trước trên máy này. Bản tự lưu nằm trong trình
                duyệt của bạn, không gửi lên máy chủ.
              </span>
              <button type="button" className={styles.restoredAction} onClick={dungViDuMacDinh}>
                Dùng ví dụ mặc định
              </button>
              <button
                type="button"
                className={styles.restoredClose}
                onClick={() => setRestoreDismissed(true)}
                aria-label="Ẩn thông báo khôi phục"
              >
                ✕
              </button>
            </div>
          )}

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
        {/* Nói LUẬT một lần ở đây (chứ không để đếm ngược nói hộ): khung này
            có aria-live="polite" nên câu này được đọc đúng một lượt, và người
            học biết trước cả hai điều — có hạn 15 giây, và có nút dừng ngay. */}
        {state.canStop
          && ` Chương trình không tự kết thúc trong ${IDE_RUN_TIMEOUT_MS / 1000} giây sẽ bị cắt;`
            + ' bấm “■ Dừng” để cắt ngay.'}
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
  // Bị cắt thì KHÔNG có mã thoát nào để nói (tiến trình không bao giờ thoát),
  // nên `timedOut` — đặt true cho cả hết giờ và nút Dừng — vẫn là cờ đúng ở đây.
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

      <CutNotice result={result} />
      {result.exitCode === 137 && (
        <div className={`${styles.notice} ${styles.noticeWarn}`}>
          Chương trình bị dừng vì dùng quá giới hạn bộ nhớ — mã thoát 137.
        </div>
      )}
      {/* Hai đường chạy cắt đầu ra theo HAI luật khác nhau, và nói chung một
          câu là nói sai một trong hai. Đường MÁY CHỦ: quá 1 MB thì máy chủ giết
          tiến trình. Đường TRÌNH DUYỆT (`cutBy` có giá trị): worker ngừng gom
          sau 60 000 ký tự mỗi luồng nhưng chương trình VẪN chạy — nói "đã bị
          dừng" ở đây là sai, và con số 1 MB cũng sai. */}
      {result.outputTruncated && (
        <div className={`${styles.notice} ${styles.noticeWarn}`}>
          {result.cutBy
            ? `Đầu ra quá dài nên chỉ giữ ${IDE_OUTPUT_CAP_CHARS.toLocaleString('vi-VN')} ký tự đầu của mỗi luồng.`
            : 'Đầu ra vượt 1 MB nên bị cắt và chương trình đã bị dừng.'}
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
 * Thông báo cho một lần chạy BỊ CẮT. Ba nguồn cắt, ba câu khác nhau — xem
 * `cutBy` trong src/lib/ide-runner.ts.
 *
 * CÂU CHỮ Ở ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT, nên viết ra cả ba điều phải nói:
 *  1. chương trình CỦA NGƯỜI HỌC không tự dừng — không đổ lỗi cho hệ thống,
 *     không bắt họ đọc "Pyodide has suffered a fatal error" cho một dòng
 *     `while True:`;
 *  2. các biến (và phần đã in ra) của lần chạy đó đã mất — `terminate()` xoá
 *     sạch namespace lẫn MEMFS, nói trước thì họ không ngồi tìm kết quả;
 *  3. MÃ TRONG TRÌNH SOẠN THẢO VẪN CÒN NGUYÊN. Đây là lợi thế thật của kiến
 *     trúc này: Monaco sống ở main thread nên cắt worker không đụng tới mã.
 *     Đối chiếu: help article của CodeHS thừa nhận trình duyệt "becomes
 *     unresponsive and crashes" mà không hiện lấy một thông báo nào.
 */
function CutNotice({ result }: { result: RunResult }) {
  if (result.cutBy === 'user' || result.cutBy === 'timeout') {
    const boiNguoiHoc = result.cutBy === 'user';
    const giay = IDE_RUN_TIMEOUT_MS / 1000;
    return (
      <div className={`${styles.notice} ${styles.noticeWarn}`}>
        <strong>{boiNguoiHoc ? 'Bạn đã dừng chương trình' : `Đã dừng sau ${giay} giây`}</strong>
        <p>
          Chương trình chưa tự kết thúc — hay gặp nhất là một vòng lặp chưa chạm tới điều kiện
          dừng. Các biến của lần chạy này mất theo, nhưng{' '}
          <strong>mã trong trình soạn thảo vẫn còn nguyên</strong>: sửa điều kiện dừng rồi bấm
          Chạy lại.
        </p>
        {/* Chỉ nói khi THẬT SỰ có đầu ra. Worker gửi đầu ra về theo từng đợt
            200 ms nên phần hiện bên dưới có thể thiếu đợt cuối cùng — nói ra
            chỗ đó, đừng để họ đếm dòng rồi tưởng mã mình sai. */}
        {(result.stdout || result.stderr) && (
          <p>Phần đã in ra tới lúc dừng vẫn ở bên dưới (có thể thiếu một chút ở cuối).</p>
        )}
        {/* Chỉ nhắc khi họ VỪA chờ hết 15 giây: lần sau không phải chờ nữa. */}
        {!boiNguoiHoc && (
          <p>Lần sau không cần chờ hết {giay} giây — nút “■ Dừng” cắt ngay lúc bạn bấm.</p>
        )}
      </div>
    );
  }

  // Không có `cutBy` = kết quả từ đường MÁY CHỦ (backend không biết trường
  // này). Giữ nguyên câu cũ: ở đó chương trình bị container cắt, client không
  // có nút dừng nào để mời họ bấm.
  if (result.timedOut) {
    return (
      <div className={`${styles.notice} ${styles.noticeWarn}`}>
        Hết giờ: chương trình chạy quá thời gian cho phép nên đã bị dừng.
      </div>
    );
  }

  return null;
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
