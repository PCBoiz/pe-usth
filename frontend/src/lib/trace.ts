/**
 * Logic thuần của bộ xem từng bước (code visualizer) trong `/ide`.
 *
 * Vì sao tách khỏi component: `node --test` bóc được kiểu TypeScript nhưng
 * KHÔNG bóc JSX, nên bất cứ logic nào nằm trong .tsx là không test được bằng bộ
 * test hiện có (cùng lý do đã tách frontend/src/lib/runner-error.ts). Mọi quyết
 * định "hiện cái gì" nằm ở đây; .tsx chỉ còn vẽ.
 *
 * Hợp đồng JSON do tracer sinh ra — bản gốc có ví dụ đầy đủ ở
 * src/python-runner/tracer/trace-document.ts (backend). Hai bên phải cùng đổi.
 */

export type TraceValue =
  | { t: 'prim'; r: string }
  | { t: 'str'; r: string; trunc?: true; n?: number }
  | { t: 'bytes'; r: string; n: number }
  | {
      t: 'list' | 'tuple' | 'set' | 'frozenset';
      items: TraceValue[];
      n: number;
      more?: true;
    }
  | { t: 'dict'; items: [TraceValue, TraceValue][]; n: number; more?: true }
  | { t: 'obj'; cls: string; attrs: [string, TraceValue][]; n: number; more?: true }
  | { t: 'fn'; name: string; cls: string }
  | { t: 'cls'; name: string }
  | { t: 'cycle' }
  | { t: 'depth' }
  | { t: 'opaque'; cls: string; r: string };

export type TraceFrame = {
  name: string;
  line: number;
  locals: [string, TraceValue][];
};

export type TraceStep = {
  i: number;
  line: number;
  event: 'line' | 'call' | 'return' | 'exception';
  frames: TraceFrame[];
  framesElided?: number;
  out: number;
  err: number;
  ret?: TraceValue;
  exc?: { type: string; message: string };
};

export type TraceStopReason =
  | 'done'
  | 'error'
  | 'step-limit'
  | 'byte-limit'
  | 'time-limit'
  | 'tracer-error';

export type TraceDocument = {
  v: 1;
  steps: TraceStep[];
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  stopReason: TraceStopReason;
  error: {
    type: string;
    message: string;
    line: number | null;
    traceback: string;
  } | null;
  stats: {
    steps: number;
    events: number;
    elapsedMs: number;
    valuesTruncated: number;
  };
  limits: {
    maxSteps: number;
    maxStringChars: number;
    maxItems: number;
    maxOutputChars: number;
    timeBudgetMs: number;
  };
};

export type TraceRunInfo = {
  exitCode: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
  durationMs: number;
  queuedMs: number;
};

export type TraceResponse = { trace: TraceDocument; run: TraceRunInfo };

/**
 * Nói trước cái giá, không để người học tự đoán.
 *
 * Ba điều họ sẽ gặp và sẽ tưởng là lỗi của mình nếu không ai nói: ghi vết chậm
 * hơn chạy (một callback Python cho MỖI dòng), vết có trần số bước, và sandbox
 * không có mạng cũng không có bàn phím.
 */
export const TRACE_COST_NOTE =
  'Xem từng bước chạy chương trình MỘT lần trong sandbox rồi ghi lại toàn bộ '
  + 'đường đi, nên chậm hơn bấm Chạy. Vết có trần số bước, sandbox không có mạng '
  + 'và không có bàn phím (input() không dùng được).';

/** Nhãn cho từng loại sự kiện, nói bằng tiếng người học chứ không phải tên API. */
export const EVENT_LABELS: Record<TraceStep['event'], string> = {
  call: 'vào hàm',
  line: 'dòng',
  return: 'trả về',
  exception: 'ngoại lệ',
};

/**
 * Câu nói thật về việc vết dừng ở đâu và vì sao.
 *
 * `kind` quyết định tô màu: 'info' là chuyện bình thường, 'warn' là có thứ bị
 * cắt bớt (người học PHẢI biết để không tưởng chương trình mình dừng ở đó),
 * 'error' là chương trình thật sự lỗi.
 */
export function stopNotice(
  doc: TraceDocument,
): { kind: 'info' | 'warn' | 'error'; text: string } | null {
  const max = doc.limits.maxSteps;
  switch (doc.stopReason) {
    case 'done':
      return null;
    case 'error':
      return {
        kind: 'error',
        text: doc.error
          ? `Chương trình dừng vì ${doc.error.type}`
            + (doc.error.line ? ` ở dòng ${doc.error.line}` : '')
            + `: ${doc.error.message}`
          : 'Chương trình dừng vì một ngoại lệ chưa được bắt.',
      };
    case 'step-limit':
      return {
        kind: 'warn',
        text: `Vết dừng ở ${max} bước đầu tiên (chương trình chạy nhiều bước hơn thế). `
          + 'Chương trình VẪN chạy tới hết nên đầu ra bên dưới là đầy đủ — chỉ phần '
          + 'bước từng dòng là dừng sớm. Muốn xem hết thì giảm số vòng lặp.',
      };
    case 'byte-limit':
      return {
        kind: 'warn',
        text: 'Vết đã quá lớn để gửi về (dữ liệu trong các biến quá nặng) nên dừng '
          + 'sớm. Thử lại với dữ liệu nhỏ hơn.',
      };
    case 'time-limit':
      return {
        kind: 'warn',
        text: `Hết thời gian dành cho một lượt ghi vết (${Math.round(
          doc.limits.timeBudgetMs / 1000,
        )} giây). Ghi vết chậm hơn chạy thường; chương trình có thể còn đang lặp.`,
      };
    case 'tracer-error':
      return {
        kind: 'error',
        text: 'Không dựng được vết cho lần chạy này. Nút “Chạy” vẫn dùng được bình thường.',
      };
  }
}

/** Đầu ra TỚI bước thứ `index` (không phải toàn bộ đầu ra của chương trình). */
export function outputAt(
  doc: TraceDocument,
  index: number,
): { stdout: string; stderr: string } {
  const step = doc.steps[index];
  // Không có bước nào (lỗi cú pháp, hoặc tài liệu thay thế): hiện toàn bộ đầu ra.
  if (!step) return { stdout: doc.stdout, stderr: doc.stderr };
  return {
    stdout: doc.stdout.slice(0, step.out),
    stderr: doc.stderr.slice(0, step.err),
  };
}

/**
 * Tên biến ĐỔI GIÁ TRỊ giữa hai bước, trong frame đang chạy.
 *
 * Vì sao cần: một panel biến với 10 tên trông như nhau ở mọi bước thì người học
 * không thấy được cái gì vừa xảy ra — đúng thứ họ mở công cụ này để xem. So
 * bằng JSON vì giá trị đã là cây JSON thuần (xem TraceValue), không có hàm,
 * không có vòng tròn (tracer đã cắt thành {t:'cycle'}).
 */
export function changedNames(prev: TraceStep | undefined, next: TraceStep): Set<string> {
  const changed = new Set<string>();
  const top = next.frames[next.frames.length - 1];
  if (!top) return changed;
  // So với frame CÙNG ĐỘ SÂU của bước trước; khác độ sâu (vừa gọi/vừa trả về)
  // thì mọi biến đều là mới với người đọc, nhưng đánh dấu tất cả chỉ gây nhiễu
  // nên lúc đó không đánh dấu gì.
  const before =
    prev && prev.frames.length === next.frames.length
      ? prev.frames[prev.frames.length - 1]
      : undefined;
  if (!before) return changed;
  const old = new Map(before.locals.map(([k, v]) => [k, JSON.stringify(v)]));
  for (const [name, value] of top.locals) {
    if (old.get(name) !== JSON.stringify(value)) changed.add(name);
  }
  return changed;
}

/**
 * Đầu ra tới bước này, TÁCH phần đã thấy ở bước trước và phần vừa in ra.
 *
 * Vì sao cần: panel đầu ra chỉ dài thêm vài ký tự mỗi bước, và mắt người không
 * bắt được chỗ dài thêm trong một khối chữ đơn sắc — đúng lúc người học cần
 * biết "dòng nào là do lệnh print vừa chạy". Phần `fresh` được tô + hiện dần
 * nên nó tự chỉ ra mình.
 *
 * Vết ghi dồn nên đầu ra bước trước luôn là TIỀN TỐ của bước này; khi không
 * phải (người học kéo thanh trượt lùi) thì không có gì "vừa in" cả.
 */
export function outputDelta(
  doc: TraceDocument,
  index: number,
): { seen: string; fresh: string } {
  const { stdout } = outputAt(doc, index);
  // Bước đầu tiên: chưa có "bước trước" để so, nên không đánh dấu gì — kể cả
  // tài liệu không có bước nào (lúc đó outputAt trả TOÀN BỘ đầu ra, tô hết thì
  // thành nhấp nháy cả khối).
  if (index <= 0) return { seen: stdout, fresh: '' };
  const before = outputAt(doc, index - 1).stdout;
  if (!stdout.startsWith(before)) return { seen: stdout, fresh: '' };
  return { seen: before, fresh: stdout.slice(before.length) };
}

/** Độ sâu THẬT của call stack: `frames` đã bị cắt bớt ở giữa khi đệ quy sâu. */
function depthOf(step: TraceStep): number {
  return step.frames.length + (step.framesElided ?? 0);
}

/**
 * Khung vừa ĐẨY VÀO và khung vừa BẬT RA giữa hai bước.
 *
 * Vì sao cần: không có cái này thì call stack chỉ là một danh sách đổi nội
 * dung — người học không thấy được "gọi hàm thì chồng thêm một khung, trả về
 * thì bỏ khung trên cùng", tức là không thấy được cái duy nhất mà chữ "stack"
 * muốn nói. `pushed` để khung mới trôi vào, `popped` để vẽ bóng khung vừa rời
 * đi (nó đã không còn trong `next.frames` nên phải lấy từ `prev`).
 *
 * So bằng ĐỘ SÂU chứ không bằng tên hàm: đệ quy có nhiều khung cùng tên.
 */
export function stackDelta(
  prev: TraceStep | undefined,
  next: TraceStep,
): { pushed: TraceFrame[]; popped: TraceFrame[] } {
  if (!prev) return { pushed: [], popped: [] };
  const before = depthOf(prev);
  const after = depthOf(next);
  if (after > before) {
    // Chỉ lấy được những khung CÒN trong mảng (mảng có thể đã bị cắt ở giữa).
    const n = Math.min(after - before, next.frames.length);
    return { pushed: next.frames.slice(next.frames.length - n), popped: [] };
  }
  if (after < before) {
    const n = Math.min(before - after, prev.frames.length);
    return { pushed: [], popped: prev.frames.slice(prev.frames.length - n) };
  }
  return { pushed: [], popped: [] };
}

/** Nhịp tự chạy (nút ⏩). Dài hơn mọi hiệu ứng để hai bước không chồng lên nhau. */
export const AUTOPLAY_INTERVAL_MS = 460;

/**
 * Hai đường cong của bảng chuẩn (motion-v2.md §3.2). Lấy nguyên, không nắn lại,
 * và dùng ĐÚNG hai giá trị mà lib/lesson-intro.ts đã dùng — hai cảnh khác nhau
 * trong cùng một sản phẩm thì phải chuyển động cùng một giọng.
 */
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
export const EASE_MOVE = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** Khung thời gian cho một lần dịch con trỏ dòng. */
const MOTION_MIN_MS = 60;
const MOTION_MAX_MS = 220;

export type StepMotionKind =
  | 'none' // chưa có bước trước: đặt con trỏ vào chỗ, không trượt
  | 'hold' // vẫn ở đúng dòng đó
  | 'step' // xuống dòng kế tiếp
  | 'back' // quay lên trên (vòng lặp quay đầu)
  | 'jump' // nhảy xa trong cùng một hàm (if/else, break)
  | 'call' // vào hàm
  | 'return'; // về hàm gọi

/**
 * CÁCH VẼ con trỏ dòng, tách khỏi `kind`.
 *
 * Vì sao cần cái thứ hai: `kind` là chuyện của Python (độ sâu stack đổi hay
 * không), còn cái này là chuyện của mắt. Bản cũ chỉ có cờ `travel` nhị phân nên
 * vào hàm, trả về và nhảy xa đều rơi vào CÙNG một cách vẽ — đúng lời phàn nàn
 * "chưa đủ động": vết phân loại kỹ mà người học không đọc ra được gì khác nhau.
 */
export type CursorStyle =
  | 'place' // đặt vào chỗ, không có đường đi (bước đầu, hoặc đứng nguyên dòng)
  | 'near' // xuống dòng kế tiếp
  | 'travel' // nhảy xa trong cùng một hàm, hoặc vòng lặp quay đầu
  | 'enter' // vào hàm: con trỏ thụt vào một nấc, để lại dấu ở dòng gọi
  | 'leave'; // trả về: con trỏ lùi ra một nấc, đáp xuống đúng dấu đó

export type StepMotion = {
  kind: StepMotionKind;
  /** Số dòng phải vượt qua — dùng để quyết định nhanh/chậm. */
  lines: number;
  durationMs: number;
  easing: string;
  /** Nhảy XA: đi bằng đường cong "vật di chuyển" thay vì "đáp xuống". */
  travel: boolean;
  cursorStyle: CursorStyle;
};

/**
 * Thời lượng theo LOẠI bước — năm băng KHÔNG chồng lên nhau.
 *
 * Vì sao tách băng chứ không dùng một công thức theo quãng đường như bản cũ:
 * bản cũ cho `jump` 8 dòng và `call` ra cùng 220ms, nên hai việc rất khác nhau
 * (đi tới chỗ khác TRONG hàm / rơi vào một hàm khác) đọc ra y hệt. Thời lượng ở
 * đây mang NGHĨA: càng lâu thì càng "đi xa khỏi chỗ đang đứng".
 *
 *   step   110…134  đi tiếp một dòng — chuyện thường, phải nhanh
 *   back   145…169  vòng lặp quay đầu — vẫn trong hàm, nhưng ngược chiều đọc
 *   jump   175…199  if/else/break — nhảy trong hàm
 *   return 205      bật khỏi một khung stack
 *   call   220      rơi vào một khung stack mới — chỗ MẤT dấu nhất
 *
 * Trần 220ms: nhịp tự chạy là 460ms (AUTOPLAY_INTERVAL_MS) nên hiệu ứng dài
 * nhất vẫn xong trước bước sau. Bảng motion-v2 xếp call/return vào hạng "chuyển
 * trạng thái 200–320ms" — đúng là vậy: đó là đổi khung thực thi, không phải một
 * cú dịch con trỏ.
 */
function kindDurationMs(kind: StepMotionKind, lines: number): number {
  switch (kind) {
    case 'none':
    case 'hold':
      return 0;
    case 'step':
      return 110 + 6 * Math.min(lines, 4);
    case 'back':
      return 145 + 3 * Math.min(lines, 8);
    case 'jump':
      return 175 + 3 * Math.min(lines, 8);
    case 'return':
      return 205;
    case 'call':
      return 220;
  }
}

function cursorStyleOf(kind: StepMotionKind): CursorStyle {
  switch (kind) {
    case 'none':
    case 'hold':
      return 'place';
    case 'step':
      return 'near';
    case 'back':
    case 'jump':
      return 'travel';
    case 'call':
      return 'enter';
    case 'return':
      return 'leave';
  }
}

/**
 * Con trỏ dòng trượt thế nào khi sang bước mới.
 *
 * Vì sao có hàm này chứ không viết thẳng số vào component: bốn quyết định ở đây
 * đều là quyết định dạy học, và đều test được bằng `node --test` (JSX thì
 * không).
 *  1. MỖI LOẠI BƯỚC MỘT CÁCH ĐỌC. Xuống dòng kế tiếp là chuyện thường, cho nó
 *     nhanh và êm. Vào hàm / trả về / vòng lặp quay đầu là chỗ người học MẤT
 *     dấu luồng điều khiển, nên đi chậm hơn và được vẽ khác (xem `cursorStyle`
 *     và `callSiteLines`).
 *  2. HIỆU ỨNG KHÔNG ĐƯỢC CHỒNG LÊN NHAU. `paceMs` là khoảng cách thật giữa
 *     hai lần đổi bước (giữ phím →, hoặc nhịp tự chạy); bước nhanh hơn hiệu
 *     ứng thì rút hiệu ứng lại, không bao giờ bắt người dùng chờ.
 *  3. `reduced` (prefers-reduced-motion) thì thời lượng về 0 — con trỏ vẫn
 *     nhảy tới đúng dòng và dấu chỗ gọi vẫn còn, chỉ là không trượt. Không có
 *     thông tin nào mất đi ở nhánh này.
 */
export function stepMotion(
  prev: TraceStep | undefined,
  next: TraceStep,
  opts: { reduced?: boolean; paceMs?: number } = {},
): StepMotion {
  const lines = prev ? Math.abs(next.line - prev.line) : 0;
  const kind = motionKind(prev, next);
  const cursorStyle = cursorStyleOf(kind);
  const travel = cursorStyle === 'travel' || cursorStyle === 'enter' || cursorStyle === 'leave';

  let durationMs = kindDurationMs(kind, lines);
  if (durationMs > 0) {
    durationMs = Math.min(MOTION_MAX_MS, Math.max(MOTION_MIN_MS, durationMs));
    const pace = opts.paceMs;
    if (pace !== undefined && Number.isFinite(pace) && pace > 0) {
      durationMs = Math.min(durationMs, Math.max(MOTION_MIN_MS, Math.round(pace * 0.6)));
    }
  }
  if (opts.reduced) durationMs = 0;

  return {
    kind,
    lines,
    durationMs,
    // Nhảy gần: phanh dần (ease-out) — như con trỏ "đáp" xuống dòng mới.
    // Nhảy xa: tăng tốc rồi phanh — đọc ra thành một chuyến đi có đường.
    easing: travel ? EASE_MOVE : EASE_OUT,
    travel,
    cursorStyle,
  };
}

/**
 * Mỗi nấc stack thụt con trỏ sang phải bấy nhiêu px, tối đa bấy nhiêu nấc.
 *
 * Vì sao có thụt lề: nó biến "đang ở độ sâu mấy" thành thứ nhìn thấy được, và
 * làm cú vào hàm (đi xuống VÀ sang phải) khác hẳn cú trả về (đi lên VÀ sang
 * trái) — hai cú này trước đây vẽ y như nhau. Chặn ở 3 nấc để đệ quy 20 tầng
 * không đẩy con trỏ ra khỏi khung.
 */
export const CURSOR_INDENT_PX = 5;
export const CURSOR_MAX_INDENT_LEVELS = 3;

export type CursorPlacement = {
  /** px tính từ đỉnh vùng nhìn của trình soạn thảo. */
  topPx: number;
  heightPx: number;
  indentPx: number;
  /** Chuỗi cho `style.transition`; 'none' nghĩa là đặt tức thì. */
  transition: string;
  cursorStyle: CursorStyle;
};

/**
 * Con trỏ dòng nằm ở đâu và đi tới đó trong bao lâu.
 *
 * Vì sao là hàm riêng chứ không viết thẳng trong .tsx: đây là chỗ DUY NHẤT nhịp
 * mà `stepMotion` tính ra đi được tới DOM. Trước đây nhịp bị dịch sang một
 * trong bốn tên lớp CSS tĩnh, nên "call 220ms" và "jump 199ms" lại ra cùng một
 * lớp — tức là toàn bộ việc phân loại rơi mất ở đúng bước cuối. Có hàm này thì
 * `node --test` kiểm được rằng thời lượng thật sự tới nơi.
 */
export function cursorPlacement(
  step: TraceStep,
  motion: StepMotion,
  geom: { topForLine: number; lineHeight: number },
): CursorPlacement {
  const level = Math.min(Math.max(depthOf(step) - 1, 0), CURSOR_MAX_INDENT_LEVELS);
  return {
    topPx: geom.topForLine,
    heightPx: geom.lineHeight,
    indentPx: level * CURSOR_INDENT_PX,
    // 0ms thì KHÔNG viết 'transform 0ms …': một transition 0ms vẫn là một
    // transition đang chạy, và thuộc tính transition-* đổi về sau không dừng
    // được nó (bẫy đã trả giá ở lib/lesson-intro.ts). 'none' là đặt thẳng.
    transition: motion.durationMs > 0 ? `transform ${motion.durationMs}ms ${motion.easing}` : 'none',
    cursorStyle: motion.cursorStyle,
  };
}

/** Nhiều nhất bấy nhiêu dấu chỗ gọi; sâu hơn thì chỉ còn là nhiễu. */
export const MAX_CALL_SITES = 6;

/**
 * Dòng ĐANG CHỜ ở mỗi khung bên dưới khung đang chạy — tức "địa chỉ trả về".
 *
 * Vì sao vẽ ra: lúc nhảy vào hàm, người học mất dấu chỗ vừa rời đi. Mỗi khung
 * chưa chạy xong đang đứng ở đúng dòng gọi của nó, nên chỉ cần đánh dấu những
 * dòng đó là đường về hiện ra trên chính đoạn mã — và nó tự biến mất khi hàm
 * trả về, vì khung đó không còn trong vết nữa. Gần nhất xếp trước.
 *
 * Bỏ dòng ≤ 0: sự kiện 'call' đầu tiên của `<module>` ghi line 0 (chương trình
 * chưa vào dòng nào), đánh dấu dòng 0 là vẽ sai chỗ.
 */
export function callSiteLines(step: TraceStep | undefined): number[] {
  if (!step) return [];
  const out: number[] = [];
  for (let i = step.frames.length - 2; i >= 0 && out.length < MAX_CALL_SITES; i--) {
    const line = step.frames[i].line;
    if (line > 0) out.push(line);
  }
  return out;
}

/* ===========================================================================
   CALL STACK — ĐẨY VÀO / BẬT RA, ĐÚNG HÌNH ẢNH CÁI CHỒNG
   ===========================================================================
   Lỗi đang sửa (đo ngày 15/10/2026 bằng Chrome, bước 31 của vết fib): khung
   vừa bật ra trôi XUỐNG 12px trong 200ms, mà nó lại nằm `absolute top: 0` —
   đúng chỗ khung trên cùng MỚI vừa chiếm. Đo được hai hàng cách nhau 2,05px,
   tức hai tên hàm in chồng lên nhau suốt 200ms ("fib dòng 3" đè "fib dòng 4").
   Thêm nữa, hướng đi ngược với hình ảnh cái chồng: đỉnh ở trên cùng thì bật ra
   phải đi LÊN.

   Cách sửa, và vì sao nó không thể đè lại được nữa: bóng khung bật ra và các
   hàng CÒN LẠI dùng CHUNG một thời lượng, CHUNG một đường cong, và đi CÙNG một
   quãng đường đúng một hàng. Bóng đi từ hàng 0 lên hàng −1; các hàng còn lại đi
   từ hàng +1 (chỗ cũ của chúng) về hàng 0. Ở MỌI thời điểm, bóng luôn cách
   hàng trên cùng đúng một hàng — không phải "ít khi chồng", mà là không chồng
   được. Cả hai con số đó ra từ MỘT lời gọi stackMove() nên không có đường nào
   để hai bên lệch nhau.

   Đẩy vào thì cùng một lẽ: khung mới rơi xuống từ hàng −1, các hàng cũ cũng
   trượt xuống một hàng từ hàng −1 về chỗ của chúng.
   =========================================================================== */

/** Nhịp của một cú đẩy vào / bật ra. Ngắn hơn con trỏ dòng: đây là hệ quả, không phải chủ ngữ. */
const STACK_MOTION_MS = 180;

export type StackMove = {
  pushed: number;
  popped: number;
  /** Có vẽ bóng của khung vừa rời stack hay không. */
  ghost: boolean;
  durationMs: number;
  easing: string;
  /** Hàng CÒN LẠI (và khung mới) đi từ đâu về đâu, tính theo SỐ HÀNG. */
  rowFromRows: number;
  rowToRows: number;
  /** Bóng khung vừa bật ra đi từ đâu về đâu — cùng đơn vị, cùng quãng đường. */
  ghostFromRows: number;
  ghostToRows: number;
};

/**
 * Cả chồng khung dịch thế nào giữa hai bước. `null` = không có gì đổi.
 *
 * `reduced` trả null: ở nhánh giảm chuyển động, danh sách khung đã ở đúng chỗ
 * ngay từ lần vẽ đầu và bóng khung bật ra không được dựng — thông tin ("stack
 * sâu mấy, đang ở hàm nào") nằm trong chính danh sách, không nằm trong chuyển
 * động, nên không mất gì.
 */
export function stackMove(
  delta: { pushed: TraceFrame[]; popped: TraceFrame[] },
  opts: { reduced?: boolean; paceMs?: number } = {},
): StackMove | null {
  const pushed = delta.pushed.length;
  const popped = delta.popped.length;
  if (opts.reduced || (pushed === 0 && popped === 0)) return null;

  let durationMs = STACK_MOTION_MS;
  const pace = opts.paceMs;
  if (pace !== undefined && Number.isFinite(pace) && pace > 0) {
    durationMs = Math.min(durationMs, Math.max(MOTION_MIN_MS, Math.round(pace * 0.6)));
  }

  // Bật ra: cả chồng đi LÊN một hàng. Đẩy vào: cả chồng đi XUỐNG một hàng.
  const up = popped > 0;
  const from = up ? 1 : -1;
  return {
    pushed,
    popped,
    ghost: up,
    durationMs,
    easing: EASE_OUT,
    rowFromRows: from,
    rowToRows: 0,
    // Bóng luôn đi TRƯỚC hàng trên cùng đúng một hàng, cùng chiều, cùng quãng.
    ghostFromRows: from - 1,
    ghostToRows: -1,
  };
}

/** Số hàng -> chuỗi transform. `%` là so với CHÍNH hàng đó nên không phải đo gì. */
export function rowsTransform(rows: number): string {
  return rows === 0 ? 'none' : `translateY(${rows * 100}%)`;
}

function motionKind(prev: TraceStep | undefined, next: TraceStep): StepMotionKind {
  if (!prev) return 'none';
  const before = depthOf(prev);
  const after = depthOf(next);
  // Phân loại theo ĐỘ SÂU trước, không theo `event`: sự kiện 'return' còn đứng
  // ở dòng cuối của hàm bị gọi (độ sâu CHƯA giảm), việc về hàm gọi xảy ra ở
  // bước SAU đó. Lấy theo event thì hiệu ứng "bật ra" chạy sớm một bước.
  if (after > before) return 'call';
  if (after < before) return 'return';
  if (next.line === prev.line) return 'hold';
  if (next.line === prev.line + 1) return 'step';
  if (next.line < prev.line) return 'back';
  return 'jump';
}

/** Trần số ký tự cho MỘT giá trị khi vẽ một dòng; dài hơn thì cắt và thêm `…`. */
const INLINE_CAP = 120;

/**
 * Giá trị -> một dòng chữ đọc được, giống cách Python in ra.
 *
 * Giữ nguyên dấu hiệu "đã bị cắt" của tracer: `[1, 2, 3, … 5000 phần tử]` nói
 * thật hơn `[1, 2, 3]` rất nhiều — người học đang đọc giá trị để tìm lỗi.
 */
export function formatValue(v: TraceValue, depth = 0): string {
  switch (v.t) {
    case 'prim':
      return v.r;
    case 'str': {
      const body = JSON.stringify(v.r).slice(1, -1);
      return v.trunc ? `'${body}…' (${v.n} ký tự)` : `'${body}'`;
    }
    case 'bytes':
      return v.r;
    case 'cycle':
      return '… (tự tham chiếu)';
    case 'depth':
      return '…';
    case 'fn':
      return `<hàm ${v.name}>`;
    case 'cls':
      return `<lớp ${v.name}>`;
    case 'opaque':
      return v.r;
    case 'list':
    case 'tuple':
    case 'set':
    case 'frozenset': {
      const [open, close] =
        v.t === 'list' ? ['[', ']'] : v.t === 'tuple' ? ['(', ')'] : ['{', '}'];
      const parts = v.items.map((x) => formatValue(x, depth + 1));
      if (v.more) parts.push(`… ${v.n} phần tử`);
      if (v.t === 'set' && v.items.length === 0 && !v.more) return 'set()';
      return clipInline(`${open}${parts.join(', ')}${close}`);
    }
    case 'dict': {
      const parts = v.items.map(
        ([k, val]) => `${formatValue(k, depth + 1)}: ${formatValue(val, depth + 1)}`,
      );
      if (v.more) parts.push(`… ${v.n} cặp`);
      return clipInline(`{${parts.join(', ')}}`);
    }
    case 'obj': {
      const parts = v.attrs.map(([k, val]) => `${k}=${formatValue(val, depth + 1)}`);
      if (v.more) parts.push(`… ${v.n} thuộc tính`);
      return clipInline(`${v.cls}(${parts.join(', ')})`);
    }
  }
}

function clipInline(s: string): string {
  return s.length > INLINE_CAP ? `${s.slice(0, INLINE_CAP)}…` : s;
}

/** Đi tới bước nào: dùng chung cho nút bấm và cho phím ←/→/Home/End. */
export function nextIndex(
  current: number,
  total: number,
  move: 'first' | 'prev' | 'next' | 'last',
): number {
  if (total === 0) return 0;
  switch (move) {
    case 'first':
      return 0;
    case 'last':
      return total - 1;
    case 'prev':
      return Math.max(0, current - 1);
    case 'next':
      return Math.min(total - 1, current + 1);
  }
}
