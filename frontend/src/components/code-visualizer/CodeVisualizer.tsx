'use client';

// Bộ xem từng bước (code visualizer) cho Python IDE.
//
// Người học bấm "Xem từng bước": chương trình chạy ĐÚNG MỘT LẦN trong sandbox
// Docker trên máy chủ (cùng đường đi với nút Chạy — xem src/python-runner), và
// trả về toàn bộ vết trong một phản hồi. Từ đó việc bước tiến/bước lùi là thuần
// cục bộ, không có lượt gọi máy chủ nào cho mỗi bước. Lý do không phải là tối
// ưu: mỗi lượt chạy là một container DÙNG MỘT LẦN, không có tiến trình nào sống
// sót giữa hai request để mà "bước tiếp".
//
// Vì sao là Python thật chứ không mô phỏng trong trình duyệt: cái người học
// thấy ở đây phải trùng khít cái họ nhận khi bấm Chạy. Một bộ giả lập viết bằng
// JS sẽ lệch ở đúng những chỗ khó (số thực, thứ tự dict, thông điệp ngoại lệ).
//
// Mọi logic quyết định "hiện cái gì" nằm ở frontend/src/lib/trace.ts để test
// được bằng `node --test` (nó không bóc được JSX).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { OnMount } from '@monaco-editor/react';

import { apiFetch } from '@/lib/api';
import { isRunnerDown, RUNNER_UNAVAILABLE_MESSAGE } from '@/lib/runner-error';
import {
  AUTOPLAY_INTERVAL_MS,
  callSiteLines,
  changedNames,
  cursorPlacement,
  EVENT_LABELS,
  formatValue,
  nextIndex,
  outputAt,
  outputDelta,
  rowsTransform,
  stackDelta,
  stackMove,
  stepMotion,
  stopNotice,
  TRACE_COST_NOTE,
  type TraceDocument,
  type TraceResponse,
  type TraceRunInfo,
} from '@/lib/trace';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

import styles from './CodeVisualizer.module.css';

type MountArgs = Parameters<OnMount>;
/** Đúng hai thứ `onMount` của Monaco đưa cho IdeClient; không nhận thêm gì. */
export type MonacoHandle = { editor: MountArgs[0]; monaco: MountArgs[1] };

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; doc: TraceDocument; run: TraceRunInfo; code: string }
  | { status: 'error'; kind: 'infra' | 'busy' | 'other'; message: string; detail?: string };

/** Backend bọc lỗi thành { error: { message } } (AllExceptionsFilter) hoặc { message } (ValidationPipe). */
function errorMessage(body: unknown, fallback: string): string {
  const b = body as { error?: { message?: unknown } | string; message?: unknown } | null;
  const raw = (typeof b?.error === 'object' ? b.error?.message : undefined) ?? b?.message;
  if (Array.isArray(raw)) return raw.join(', ');
  return typeof raw === 'string' && raw ? raw : fallback;
}

export default function CodeVisualizer({
  codeRef,
  editorRef,
  triggerHost,
}: {
  /**
   * Nội dung editor MỚI NHẤT. Nhận ref chứ không nhận chuỗi `code`: IdeClient
   * cập nhật `codeRef.current` ĐỒNG BỘ trong onChange, nên bấm ngay sau khi gõ
   * vẫn ghi vết đúng bản vừa gõ (state `code` chỉ mới ở render kế tiếp — bẫy đã
   * có thật ở Ctrl+Enter của nút Chạy).
   */
  codeRef: { current: string };
  /** Dòng đang chạy được tô ngay trong Monaco — đó là bản mã DUY NHẤT hiện ra. */
  editorRef?: { current: MonacoHandle | null };
  /**
   * Chỗ để đặt nút mở, nếu muốn nó nằm nơi khác (IdeClient đặt cạnh nút Chạy
   * trên thanh công cụ cho dễ thấy).
   *
   * Dùng portal chứ không nâng state lên IdeClient: toàn bộ việc ghi vết —
   * trạng thái, huỷ request, nhãn nút đổi theo trạng thái — vẫn nằm gọn trong
   * component này. Nâng lên thì IdeClient phải giữ thêm một bản sao trạng thái
   * và hai bên dễ lệch nhau.
   */
  triggerHost?: HTMLElement | null;
}) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [index, setIndex] = useState(0);
  // Tự chạy: xem luồng điều khiển ĐI, chứ không phải bấm 200 lần để đoán nó đi
  // đâu. Nhịp cố định ở AUTOPLAY_INTERVAL_MS nên hiệu ứng không chồng lên nhau.
  const [playing, setPlaying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  /** Lần đổi bước gần nhất (performance.now) — để đo nhịp bấm thật của người dùng. */
  const lastMoveRef = useRef<number | null>(null);
  // Một chỗ duy nhất đọc prefers-reduced-motion cho cả repo (lib/use-reduced-motion.ts).
  // Theo dõi được cả lúc người dùng đổi tuỳ chọn GIỮA phiên, nên không có trạng
  // thái bị đóng băng sai như khi đọc matchMedia đúng một lần.
  const reduced = usePrefersReducedMotion();
  /** Lớp phủ con trỏ dòng, nằm NGOÀI vòng vẽ của Monaco (xem effect bên dưới). */
  const layerRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const sitesRef = useRef<HTMLDivElement[]>([]);
  const decorationsRef = useRef<ReturnType<MountArgs[0]['createDecorationsCollection']> | null>(
    null,
  );
  const stackRef = useRef<HTMLOListElement | null>(null);
  /** Đặt lại con trỏ sau khi Monaco cuộn — do effect theo bước nạp vào. */
  const replaceCursorRef = useRef<((animated: boolean) => void) | null>(null);
  /** Con trỏ còn đang trên đường tới mốc này (performance.now). */
  const movingUntilRef = useRef(0);

  const doc = state.status === 'ready' ? state.doc : null;
  // useMemo (không phải `doc?.steps ?? []`): mảng rỗng mới mỗi lần render làm
  // mọi useMemo/useCallback phụ thuộc vào nó tính lại vô ích ở mỗi render.
  const steps = useMemo(
    () => (state.status === 'ready' ? state.doc.steps : []),
    [state],
  );
  const step = steps[index];

  const start = useCallback(async () => {
    if (abortRef.current) return; // đang chạy: bỏ qua cú bấm thứ hai
    const controller = new AbortController();
    abortRef.current = controller;
    const code = codeRef.current;
    setState({ status: 'loading' });
    setIndex(0);
    setPlaying(false); // vết mới: đừng để nhịp tự chạy của vết CŨ chạy tiếp
    lastMoveRef.current = null;
    try {
      const res = await apiFetch('/api/python/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      });
      const body: unknown = await res.json().catch(() => null);
      if (res.status === 429) {
        // Hai nguồn 429 với hai lời khuyên khác nhau (bấm quá nhiều / máy chủ
        // quá tải); backend đã phân biệt bằng thông điệp nên hiện đúng câu đó.
        setState({
          status: 'error',
          kind: 'busy',
          message: errorMessage(body, 'Máy chủ đang quá tải, thử lại sau'),
        });
      } else if (res.status === 503) {
        setState({
          status: 'error',
          kind: 'infra',
          message: RUNNER_UNAVAILABLE_MESSAGE,
          detail: `HTTP 503 — ${errorMessage(body, 'bộ chạy Python không trả lời.')}`,
        });
      } else if (res.status === 401) {
        setState({
          status: 'error',
          kind: 'infra',
          message:
            // "Bàn thí nghiệm" + "khoá" theo bảng thuật ngữ: màn này không gọi
            // mình là IDE ở chỗ người học đọc được, và chính tả là "khoá".
            'Lúc này Bàn thí nghiệm chưa chạy được mã. Các bài học trong khoá vẫn chạy '
            + 'Python bình thường ngay trong trình duyệt.',
          detail: `HTTP 401 — ${errorMessage(body, 'phiên khách chưa sẵn sàng; tải lại trang.')}`,
        });
      } else if (!res.ok) {
        // 400 ở đây gần như luôn là "chương trình quá dài để ghi vết": thông
        // điệp của backend có con số thật và chỉ sang nút Chạy, nên hiện nguyên.
        setState({
          status: 'error',
          kind: 'other',
          message: errorMessage(body, `Không ghi được vết (HTTP ${res.status}).`),
        });
      } else {
        const payload = body as TraceResponse | null;
        if (!payload?.trace) {
          setState({ status: 'error', kind: 'other', message: 'Máy chủ trả về dữ liệu lạ.' });
        } else if (
          // 200 nhưng docker chết trước khi Python kịp chạy — cùng phép thử với
          // nút Chạy, dùng lại đúng hàm đó để hai nơi không nói khác nhau.
          isRunnerDown({
            stdout: payload.trace.stdout,
            stderr: payload.trace.stderr,
            exitCode: payload.run.exitCode,
            timedOut: payload.run.timedOut,
            outputTruncated: payload.run.outputTruncated,
          })
        ) {
          setState({
            status: 'error',
            kind: 'infra',
            message: RUNNER_UNAVAILABLE_MESSAGE,
            detail: payload.trace.stderr.trim(),
          });
        } else {
          setState({
            status: 'ready',
            doc: payload.trace,
            run: payload.run,
            code,
          });
          setIndex(0);
        }
      }
    } catch (e) {
      if (controller.signal.aborted) return; // người dùng rời trang
      setState({
        status: 'error',
        kind: 'other',
        message:
          e instanceof Error
            ? `Không kết nối được máy chủ: ${e.message}`
            : 'Không kết nối được máy chủ.',
      });
    } finally {
      abortRef.current = null;
    }
  }, [codeRef]);

  // Rời trang giữa chừng thì huỷ request đang treo (container tự hết giờ ở máy chủ).
  useEffect(() => () => abortRef.current?.abort(), []);

  /* =======================================================================
     CON TRỎ DÒNG CÓ ĐƯỜNG ĐI
     =======================================================================
     Lỗi đang sửa (rà soát chuyển động 14/10/2026, mục A6): dòng đang chạy chỉ
     HIỆN DẦN tại chỗ mới. Mắt không thấy nó đi TỪ ĐÂU tới ĐÂU, nên bước vào
     hàm, bước trả về và bước nhảy xa trông y hệt bước xuống dòng kế tiếp — vết
     đã phân loại sẵn bốn thứ đó (stepMotion) mà không có gì truyền tới mắt
     người học. Đó là lý do chính khiến bộ xem bị kêu là "chưa đủ động".

     Cách sửa: một lớp phủ nằm NGOÀI vòng vẽ của Monaco. Con trỏ ĐI tới dòng
     mới bằng translateY, đúng thời lượng và đường cong mà stepMotion trả về
     (xem cursorPlacement trong lib/trace.ts — đó là chỗ duy nhất nhịp đi tới
     DOM, và nó test được). Mỗi khung stack chưa chạy xong để lại một dấu mờ ở
     dòng gọi của nó: đó chính là địa chỉ trả về, và nó tự mất khi hàm trả về.

     Vì sao lớp phủ chứ không phải decoration của Monaco: decoration chỉ nhận
     className, nên nhịp phải dịch sang một trong bốn lớp CSS tĩnh — "call
     220ms" và "jump 199ms" rơi vào cùng một lớp, tức toàn bộ việc phân loại
     rơi mất ở đúng bước cuối. Lớp phủ còn miễn nhiễm với chuyện Monaco vẽ lại
     overlay lúc cuộn/gõ (mục A8), vì nó không nằm trong vòng render đó.

     Vì sao ghi thẳng vào `el.style` chứ không qua `style={{…}}` của React:
     (1) nó KHÔNG thêm nợ cho việc bỏ `style-src 'unsafe-inline'` — CSP chỉ
     chặn thuộc tính style trong MÃ NGUỒN (và setAttribute('style', …)), không
     chặn CSSOM; (2) ghi qua state thì mỗi khung hình là một lần render React.
     ======================================================================= */

  /** Lớp phủ + con trỏ, dựng một lần rồi dùng lại. `null` = không dựng được. */
  const ensureLayer = useCallback((editor: MountArgs[0]): HTMLDivElement | null => {
    if (layerRef.current) return layerRef.current;
    const root = editor.getDomNode();
    // `.overflow-guard` là hộp CẮT của Monaco: đúng cỡ khung nhìn và KHÔNG bị
    // cuộn theo nội dung. Chèn ngay trước vùng cuộn thì lớp phủ nằm trên nền
    // gutter nhưng DƯỚI chữ, đúng chỗ của một dấu tô dòng.
    const guard = root?.querySelector('.overflow-guard');
    const scroll = guard?.querySelector('.monaco-scrollable-element');
    // Không tìm được (Monaco đổi cấu trúc DOM ở bản sau): thôi, không dựng gì.
    // Dòng vẫn được tô bằng decoration, tức trạng thái nghỉ vẫn đầy đủ — mọi
    // đường hỏng ra cùng một kết quả an toàn.
    if (!guard || !scroll) return null;
    const layer = document.createElement('div');
    layer.className = styles.cursorLayer;
    layer.setAttribute('aria-hidden', 'true');
    const cursor = document.createElement('div');
    cursor.className = styles.lineCursor;
    layer.appendChild(cursor);
    guard.insertBefore(layer, scroll);
    layerRef.current = layer;
    cursorRef.current = cursor;
    return layer;
  }, []);

  // Gỡ lớp phủ + dấu tô khi panel rời khỏi trang: cả hai nằm trong DOM của
  // Monaco, mà Monaco sống lâu hơn component này.
  useEffect(
    () => () => {
      layerRef.current?.remove();
      layerRef.current = null;
      cursorRef.current = null;
      sitesRef.current = [];
      decorationsRef.current?.clear();
      decorationsRef.current = null;
    },
    [],
  );

  // Monaco cuộn (người dùng kéo, hoặc revealLine lúc bước ra ngoài khung nhìn):
  // toạ độ dòng tính từ đỉnh khung nhìn đã đổi nên phải đặt lại. Trong lúc con
  // trỏ còn đang đi thì GIỮ transition — transition tự nhắm lại đích mới từ chỗ
  // nó đang đứng; xong rồi thì đặt tức thì, để kéo thanh cuộn không kéo theo
  // một con trỏ trễ 200ms.
  useEffect(() => {
    const handle = editorRef?.current;
    if (!handle || !doc) return;
    const sub = handle.editor.onDidScrollChange(() => {
      replaceCursorRef.current?.(performance.now() < movingUntilRef.current);
    });
    return () => sub.dispose();
  }, [editorRef, doc]);

  // Tô dòng đang chạy trong Monaco + đưa con trỏ tới đó. Dọn sạch khi đóng
  // panel, nếu không các decoration cũ cộng dồn và cả file sáng lên.
  useEffect(() => {
    const handle = editorRef?.current;
    if (!handle) return;
    const { editor, monaco } = handle;
    if (!step) {
      // Vết mới / không có bước nào: không để lại dấu tô lẫn con trỏ của vết cũ
      // đứng trên một đoạn mã nay đã khác.
      decorationsRef.current?.clear();
      layerRef.current?.remove();
      layerRef.current = null;
      cursorRef.current = null;
      sitesRef.current = [];
      return;
    }

    const now = performance.now();
    const last = lastMoveRef.current;
    lastMoveRef.current = now;
    const motion = stepMotion(steps[index - 1], step, {
      reduced,
      paceMs: last === null ? undefined : now - last,
    });

    // MỘT bộ decoration dùng lại, không dựng mới rồi xoá ở MỖI bước: dựng mới
    // bắt Monaco tháo/lắp lại lớp overlay mỗi lần bấm, mà người học giữ phím →
    // là bấm hàng trăm lần.
    const collection
      = decorationsRef.current ?? (decorationsRef.current = editor.createDecorationsCollection([]));
    collection.set([
      {
        range: new monaco.Range(step.line, 1, step.line, 1),
        options: {
          isWholeLine: true,
          className: styles.monacoLine,
          glyphMarginClassName: styles.monacoGlyph,
        },
      },
    ]);
    editor.revealLineInCenterIfOutsideViewport(step.line);

    const layer = ensureLayer(editor);
    if (!layer) return;
    const cursor = cursorRef.current;
    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
    const sites = callSiteLines(step);

    // Số dấu chỗ gọi đổi theo độ sâu stack; giữ một rổ và chỉ thêm/bớt phần
    // chênh, để bước nào cũng không phải dựng lại cả cụm.
    const pool = sitesRef.current;
    while (pool.length < sites.length) {
      const mark = document.createElement('div');
      mark.className = styles.callSite;
      layer.appendChild(mark);
      pool.push(mark);
    }
    while (pool.length > sites.length) pool.pop()?.remove();

    const place = (animated: boolean) => {
      const scrollTop = editor.getScrollTop();
      const where = cursorPlacement(step, motion, {
        topForLine: editor.getTopForLineNumber(step.line) - scrollTop,
        lineHeight,
      });
      if (cursor) {
        cursor.style.height = `${where.heightPx}px`;
        cursor.style.transition = animated ? where.transition : 'none';
        cursor.style.transform = `translate3d(${where.indentPx}px, ${where.topPx}px, 0)`;
        cursor.dataset.cvStyle = where.cursorStyle;
      }
      // Dấu chỗ gọi không chuyển động: chúng là chú thích tĩnh trên mã, và
      // bảng motion-v2 nói rõ "chữ và nhãn đứng yên, chỉ dấu nhấn di chuyển".
      sites.forEach((line, i) => {
        const mark = pool[i];
        mark.style.height = `${lineHeight}px`;
        mark.style.transform = `translate3d(0px, ${editor.getTopForLineNumber(line) - scrollTop}px, 0)`;
      });
    };

    movingUntilRef.current = now + motion.durationMs;
    replaceCursorRef.current = place;
    place(motion.durationMs > 0);
  }, [editorRef, step, steps, index, reduced, ensureLayer]);

  const total = steps.length;
  const atEnd = index >= total - 1;
  // `playing` là Ý MUỐN của người dùng; ở cuối vết thì chẳng còn gì chạy nên
  // coi như đang dừng. Vì sao không dùng một useEffect để tự setPlaying(false):
  // setState trong thân effect sinh render nối tầng — eslint của repo chặn
  // đúng chỗ này, và suy ra từ `index` thì không cần state thứ hai.
  const autoRunning = playing && !atEnd;

  // Tự chạy: hẹn MỘT nhịp cho bước kế tiếp, hẹn lại sau mỗi bước. Mỗi nhịp là
  // một bước THẬT (dòng, biến, stack, đầu ra đều đi theo) nên dừng ở đâu cũng
  // đọc được đúng trạng thái ở đó. Nhịp dài hơn mọi hiệu ứng (xem
  // AUTOPLAY_INTERVAL_MS) để hai bước không chồng chuyển động lên nhau.
  useEffect(() => {
    if (!autoRunning) return;
    const id = window.setTimeout(
      () => setIndex((i) => nextIndex(i, total, 'next')),
      AUTOPLAY_INTERVAL_MS,
    );
    return () => window.clearTimeout(id);
  }, [autoRunning, index, total]);

  const toggleAuto = useCallback(() => {
    if (autoRunning) {
      setPlaying(false);
      return;
    }
    // Đang đứng ở bước cuối: bấm ⏩ nghĩa là "xem lại từ đầu".
    if (atEnd) setIndex(0);
    setPlaying(true);
  }, [autoRunning, atEnd]);

  const go = useCallback(
    (move: 'first' | 'prev' | 'next' | 'last') =>
      setIndex((i) => nextIndex(i, steps.length, move)),
    [steps.length],
  );

  const changed = useMemo(
    () => (step ? changedNames(steps[index - 1], step) : new Set<string>()),
    [step, steps, index],
  );
  // Khung vừa đẩy vào / vừa bật ra. So bằng THAM CHIẾU ở dưới (mảng được cắt ra
  // từ chính `step.frames`) nên không phải so lại tên lần nữa.
  const stack = useMemo(
    () => (step ? stackDelta(steps[index - 1], step) : { pushed: [], popped: [] }),
    [step, steps, index],
  );
  /* =======================================================================
     CHỒNG KHUNG — ĐẨY VÀO RƠI TỪ TRÊN, BẬT RA BAY LÊN TRÊN
     =======================================================================
     Lỗi đang sửa (mục A5 của bản rà soát, đo lại ngày 15/10/2026): bóng khung
     vừa bật ra trôi XUỐNG trong khi nó nằm `absolute top: 0` — đúng chỗ khung
     trên cùng MỚI vừa chiếm. Đo được hai hàng cách nhau 2,05px: "fib dòng 3"
     in chồng lên "fib dòng 4" suốt 200ms. Và hướng đi ngược với hình ảnh cái
     chồng: đỉnh ở trên cùng thì bật ra phải đi LÊN.

     Luật mới nằm trong stackMove() (lib/trace.ts) và lý do nó KHÔNG đè lại
     được nữa viết ở đó: bóng và các hàng còn lại dùng chung một thời lượng,
     một đường cong, một quãng đường, và bóng luôn đi trước đúng một hàng.

     Vì sao WAAPI chứ không keyframe CSS như bản cũ: hai cú đẩy vào liên tiếp
     (f() gọi g() ngay) không đổi tên lớp nên animation CSS KHÔNG chạy lại —
     cú thứ hai im lặng. `el.animate()` chạy lại mọi lần, và vẫn là transform +
     opacity nên vẫn ở trên compositor. Quãng đường là `translateY(±100%)`:
     phần trăm tính theo chính hàng đó nên không phải đo gì (không có forced
     layout trong vòng vẽ).
     ======================================================================= */
  useLayoutEffect(() => {
    const ol = stackRef.current;
    if (!ol) return;
    // Đọc (không ghi) mốc của bước TRƯỚC: layout effect chạy trước passive
    // effect của con trỏ dòng, nên ở đây lastMoveRef còn là bước trước.
    const last = lastMoveRef.current;
    const move = stackMove(stack, {
      reduced,
      paceMs: last === null ? undefined : performance.now() - last,
    });
    if (!move) return;

    const opts = { duration: move.durationMs, easing: move.easing, fill: 'backwards' as const };
    for (const row of ol.querySelectorAll<HTMLElement>('[data-cv-row]')) {
      if (typeof row.animate !== 'function') return;
      const frames: Keyframe[] = [
        { transform: rowsTransform(move.rowFromRows) },
        { transform: rowsTransform(move.rowToRows) },
      ];
      // Khung MỚI vừa được đẩy vào: trôi cùng cả chồng, nhưng còn hiện dần ra
      // để phân biệt "cái vừa thêm" với "cái chỉ dịch chỗ".
      if (row.dataset.cvRow === 'new') {
        frames[0].opacity = '0';
        frames[1].opacity = '1';
      }
      row.animate(frames, opts);
    }
    const ghost = ol.querySelector<HTMLElement>('[data-cv-ghost]');
    if (ghost && move.ghost && typeof ghost.animate === 'function') {
      ghost.animate(
        [
          { opacity: '1', transform: rowsTransform(move.ghostFromRows) },
          { opacity: '0', transform: rowsTransform(move.ghostToRows) },
        ],
        opts,
      );
    }
  }, [stack, reduced]);

  const output = doc ? outputAt(doc, index) : { stdout: '', stderr: '' };
  const printed = doc ? outputDelta(doc, index) : { seen: '', fresh: '' };
  const notice = doc ? stopNotice(doc) : null;

  // Nhãn nút nói đúng việc tiếp theo: chưa ghi thì "Xem từng bước", ghi rồi thì
  // "Ghi vết lại" (vì người học vừa sửa mã xong mới bấm lại).
  const trigger = (
    <button
      type="button"
      className={styles.start}
      onClick={() => void start()}
      disabled={state.status === 'loading'}
      title="Chạy một lượt rồi bước qua từng dòng của chính đoạn mã đang soạn"
    >
      {state.status === 'loading'
        ? 'Đang ghi vết…'
        : state.status === 'ready'
          ? '↻ Ghi vết lại'
          : '⇥ Xem từng bước'}
    </button>
  );

  return (
    <section
      className={styles.panel}
      ref={panelRef}
      aria-label="Xem từng bước"
      // ←/→ bước, Home/End về đầu/cuối — chỉ khi tiêu điểm đang ở TRONG panel,
      // nên không giành phím mũi tên của người đang gõ mã trong Monaco. Ô kéo
      // (type=range) tự xử lý ←/→ rồi, đừng xử lý hai lần.
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement) return;
        if (e.key === ' ') {
          // Nút bấm tự xử lý Space rồi; xử lý ở đây nữa là bật/tắt hai lần.
          if (e.target instanceof HTMLButtonElement || total < 2) return;
          e.preventDefault();
          toggleAuto();
          return;
        }
        const move =
          e.key === 'ArrowLeft'
            ? 'prev'
            : e.key === 'ArrowRight'
              ? 'next'
              : e.key === 'Home'
                ? 'first'
                : e.key === 'End'
                  ? 'last'
                  : null;
        if (!move) return;
        e.preventDefault();
        go(move);
      }}
    >
      <header className={styles.head}>
        <h2 className={styles.title}>Xem từng bước</h2>
        {/* Nút mở: ra thanh công cụ nếu IdeClient đưa chỗ, không thì đứng tại
            đây. Dựng MỘT LẦN rồi chuyển đi bằng portal — cùng một nút, cùng một
            trạng thái, không phải hai bản phải giữ cho khớp nhau. */}
        {triggerHost ? createPortal(trigger, triggerHost) : trigger}
        {state.status === 'ready' && (
          <span className={styles.cost}>
            Ghi vết mất {(state.run.durationMs / 1000).toFixed(2)} s
            {state.run.queuedMs > 0 && ` (chờ hàng đợi ${(state.run.queuedMs / 1000).toFixed(1)} s)`}
            {' · '}
            {state.doc.stats.steps.toLocaleString('vi-VN')} bước ghi được
            {state.doc.stats.events > state.doc.stats.steps
              && ` / ${state.doc.stats.events.toLocaleString('vi-VN')} bước đã chạy`}
          </span>
        )}
      </header>

      {/* Nói trước cái giá, ở TRÊN MẶT chứ không chỉ trong tài liệu. */}
      <p className={styles.note}>{TRACE_COST_NOTE}</p>

      {state.status === 'error' && (
        <div
          className={`${styles.notice} ${
            state.kind === 'infra' ? styles.noticeWarn : styles.noticeError
          }`}
          role="alert"
        >
          <p>{state.message}</p>
          {state.detail && (
            <details className={styles.detail}>
              <summary>Chi tiết kỹ thuật</summary>
              <pre className={styles.detailBody}>{state.detail}</pre>
            </details>
          )}
        </div>
      )}

      {/* Ghi vết mất 0,2–2 s. Không có gì động trong khoảng đó thì người học
          tưởng cú bấm bị rơi và bấm lại — nên có một dải chạy (translateX,
          không phải width: đổi width là layout lại mỗi khung hình). Dải này là
          "đang chạy", KHÔNG phải tiến độ: không ai biết trước chương trình của
          người học chạy bao lâu. MỘT chỉ báo là đủ: con quay đứng cạnh dải này
          nói đúng cùng một điều mà vẫn tốn tính lại style mỗi khung hình, nên
          đã bỏ. */}
      {state.status === 'loading' && (
        <>
          <p className={styles.hint}>Đang chạy và ghi vết trong sandbox…</p>
          <div className={styles.progress} aria-hidden="true">
            <span className={styles.progressBar} />
          </div>
        </>
      )}

      {doc && (
        <>
          {notice && (
            <div
              className={`${styles.notice} ${
                notice.kind === 'error' ? styles.noticeError : styles.noticeWarn
              }`}
              role="status"
            >
              <p>{notice.text}</p>
            </div>
          )}

          {steps.length === 0 ? (
            <p className={styles.hint}>
              Không có bước nào để xem — chương trình chưa chạy được dòng nào.
            </p>
          ) : (
            <>
              <div className={styles.controls}>
                <div className={styles.buttons} role="group" aria-label="Điều khiển bước">
                  <button
                    type="button"
                    className={styles.ctrl}
                    onClick={() => go('first')}
                    disabled={index === 0}
                    aria-label="Về bước đầu"
                    title="Về bước đầu (Home)"
                  >
                    ⏮
                  </button>
                  <button
                    type="button"
                    className={styles.ctrl}
                    onClick={() => go('prev')}
                    disabled={index === 0}
                    aria-label="Bước trước"
                    title="Bước trước (←)"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    className={styles.ctrl}
                    onClick={() => go('next')}
                    disabled={index >= steps.length - 1}
                    aria-label="Bước sau"
                    title="Bước sau (→)"
                  >
                    {/* aria-hidden dù nút đã có aria-label (tên của nút lấy từ
                        aria-label, nội dung bị bỏ qua): nói thẳng ra là ký tự
                        này TRANG TRÍ, để lần sau ai gỡ aria-label thì không
                        biến nó thành tên nút. */}
                    <span aria-hidden="true">▶</span>
                  </button>
                  <button
                    type="button"
                    className={styles.ctrl}
                    onClick={() => go('last')}
                    disabled={index >= steps.length - 1}
                    aria-label="Tới bước cuối"
                    title="Tới bước cuối (End)"
                  >
                    ⏭
                  </button>
                  {/* Tự chạy: xem luồng điều khiển ĐI qua các dòng. Tách khỏi
                      nút ▶ (một bước) vì hai việc khác nhau. */}
                  <button
                    type="button"
                    className={
                      autoRunning ? `${styles.ctrl} ${styles.ctrlOn}` : styles.ctrl
                    }
                    onClick={toggleAuto}
                    disabled={total < 2}
                    aria-pressed={autoRunning}
                    aria-label={autoRunning ? 'Dừng tự chạy' : 'Tự chạy'}
                    title={autoRunning ? 'Dừng tự chạy (Space)' : 'Tự chạy (Space)'}
                  >
                    {autoRunning ? '⏸' : '⏩'}
                  </button>
                </div>
                {/* <input type=range> thay vì thanh tiến trình tự vẽ: kéo được,
                    đọc được bằng bàn phím và trình đọc màn hình, và không cần
                    style nội tuyến (CSP của trang không cho style="…"). */}
                <input
                  className={styles.scrub}
                  type="range"
                  min={0}
                  max={steps.length - 1}
                  value={index}
                  onChange={(e) => setIndex(Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Home') {
                      e.preventDefault();
                      go('first');
                    } else if (e.key === 'End') {
                      e.preventDefault();
                      go('last');
                    }
                  }}
                  aria-label="Chọn bước"
                  aria-valuetext={`Bước ${index + 1} trên ${steps.length}`}
                />
                {/* aria-live TẮT trong lúc tự chạy: bước đổi mỗi 460 ms, để
                    "polite" thì trình đọc màn hình đọc lại bộ đếm 2 lần/giây và
                    nuốt mất mọi thứ khác người dùng đang nghe. Bấm từng bước thì
                    thông báo lại có ích, nên chỉ tắt đúng lúc đang chạy tự động. */}
                <span className={styles.counter} aria-live={autoRunning ? 'off' : 'polite'}>
                  Bước {(index + 1).toLocaleString('vi-VN')}/
                  {steps.length.toLocaleString('vi-VN')}
                  {step && ` · ${EVENT_LABELS[step.event]} ${step.line}`}
                </span>
              </div>

              <div className={styles.grid}>
                {/* KHÔNG in lại mã ở đây. Trước đây panel có cột "Mã đã ghi vết"
                    chép lại y nguyên nội dung editor ngay phía trên — cùng một
                    đoạn mã hiện hai lần, bản dưới lại hẹp nên phải cuộn ngang.
                    Dòng đang chạy nay chỉ tô trong CHÍNH Monaco (xem effect
                    createDecorationsCollection ở trên), nên người học nhìn đúng
                    đoạn mã họ vừa gõ, ở đúng chỗ họ đang gõ. */}
                <div className={styles.sidePane}>
                  <h3 className={styles.paneTitle}>Call stack</h3>
                  <ol className={styles.stack} ref={stackRef}>
                    {/* Bóng của khung VỪA BẬT RA: nó đã không còn trong bước
                        này nên phải lấy từ bước trước (stackDelta). Nằm ngoài
                        luồng (position: absolute) để nó không chiếm chỗ của ai,
                        và ở trạng thái NGHỈ nó vô hình — nên mọi đường hỏng
                        (không có WAAPI, JS chết giữa chừng, giảm chuyển động)
                        đều ra cùng một kết quả: không có gì đè lên khung trên
                        cùng. Khoá theo `index` để bước nào cũng diễn lại. */}
                    {stack.popped.map((f, i) => (
                      <li
                        key={`pop-${index}-${i}`}
                        data-cv-ghost=""
                        className={`${styles.frame} ${styles.frameTop} ${styles.framePopped}`}
                        aria-hidden="true"
                      >
                        <span className={styles.frameName}>{f.name}</span>
                        <span className={styles.frameLine}>dòng {f.line}</span>
                      </li>
                    ))}
                    {step?.framesElided ? (
                      <li className={styles.stackElided} data-cv-row="">
                        … bỏ {step.framesElided.toLocaleString('vi-VN')} khung ở giữa (đệ quy sâu)
                      </li>
                    ) : null}
                    {step?.frames
                      .slice()
                      .reverse()
                      .map((f, i) => {
                        const pushed = stack.pushed.includes(f);
                        return (
                          <li
                            // Khoá theo ĐỘ SÂU + tên hàm, không theo chỉ số
                            // đếm từ trên: khung cũ giữ nguyên phần tử DOM khi
                            // stack dày thêm, nên chỉ khung MỚI mới chạy hiệu
                            // ứng đẩy vào.
                            key={`${step.frames.length - 1 - i}-${f.name}`}
                            // Cả chồng trượt CÙNG một quãng; chỉ khung mới
                            // được đánh dấu riêng để nó còn hiện dần ra.
                            data-cv-row={pushed ? 'new' : ''}
                            className={[styles.frame, i === 0 ? styles.frameTop : '']
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <span className={styles.frameName}>{f.name}</span>
                            <span className={styles.frameLine}>dòng {f.line}</span>
                          </li>
                        );
                      })}
                  </ol>

                  <h3 className={styles.paneTitle}>Biến</h3>
                  {step && step.frames.length > 0 ? (
                    step.frames
                      .slice()
                      .reverse()
                      .map((f, fi) => (
                        <div key={`vars-${f.name}-${fi}`} className={styles.varGroup}>
                          <p className={styles.varScope}>
                            {f.name === '<module>' ? 'toàn cục' : `trong ${f.name}`}
                          </p>
                          {f.locals.length === 0 ? (
                            <p className={styles.hint}>(chưa có biến nào)</p>
                          ) : (
                            <dl className={styles.vars}>
                              {f.locals.map(([name, value]) => {
                                const fresh = fi === 0 && changed.has(name);
                                const text = formatValue(value);
                                return (
                                  <div
                                    key={name}
                                    className={
                                      fresh
                                        ? `${styles.varRow} ${styles.varChanged}`
                                        : styles.varRow
                                    }
                                  >
                                    <dt className={styles.varName}>{name}</dt>
                                    <dd className={styles.varValue}>
                                      {/* Khoá theo CHÍNH GIÁ TRỊ: giá trị đổi
                                          thì React dựng lại ô này, nên hiệu
                                          ứng "giá trị mới thay chỗ giá trị cũ"
                                          diễn lại — kể cả khi cùng một biến đổi
                                          liên tiếp nhiều bước (đổi class thôi
                                          thì CSS không chạy lại animation). */}
                                      <span
                                        key={text}
                                        className={fresh ? styles.varNew : undefined}
                                      >
                                        {text}
                                      </span>
                                    </dd>
                                  </div>
                                );
                              })}
                            </dl>
                          )}
                        </div>
                      ))
                  ) : (
                    <p className={styles.hint}>(chưa có biến nào)</p>
                  )}

                  {step?.ret !== undefined && (
                    <p className={styles.returned}>
                      Trả về: <code>{formatValue(step.ret)}</code>
                    </p>
                  )}
                  {step?.exc && (
                    <p className={styles.thrown}>
                      Ngoại lệ: <code>{step.exc.type}: {step.exc.message}</code>
                    </p>
                  )}
                </div>

                <div className={styles.outPane}>
                  <h3 className={styles.paneTitle}>Đầu ra tới bước này</h3>
                  {output.stdout ? (
                    <pre className={styles.stdout}>
                      {printed.seen}
                      {/* Phần VỪA được in ở bước này: hiện dần và giữ một nền
                          nhạt, nên nhìn là biết dòng nào do lệnh print vừa
                          chạy. Khoá theo `index` để mỗi bước diễn lại. */}
                      {printed.fresh && (
                        <span key={index} className={styles.freshOut}>
                          {printed.fresh}
                        </span>
                      )}
                    </pre>
                  ) : (
                    <p className={styles.hint}>(chưa in gì)</p>
                  )}
                  {output.stderr && <pre className={styles.stderr}>{output.stderr}</pre>}
                  {doc.stdoutTruncated && (
                    <p className={styles.hint}>
                      … đầu ra vượt {doc.limits.maxOutputChars.toLocaleString('vi-VN')} ký tự nên
                      phần sau không được giữ.
                    </p>
                  )}
                  {doc.error?.traceback && (
                    <details className={styles.detail} open>
                      <summary>Traceback</summary>
                      <pre className={styles.stderr}>{doc.error.traceback}</pre>
                    </details>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
