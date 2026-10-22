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

export type StepMotion = {
  kind: StepMotionKind;
  /** Số dòng phải vượt qua — dùng để quyết định nhanh/chậm. */
  lines: number;
  durationMs: number;
  easing: string;
  /** Nhảy XA: vẽ khác nhảy gần (con trỏ bị bóp lại trên đường đi). */
  travel: boolean;
};

/**
 * Con trỏ dòng trượt thế nào khi sang bước mới.
 *
 * Vì sao có hàm này chứ không viết thẳng số vào component: ba quyết định ở đây
 * đều là quyết định dạy học, và đều test được bằng `node --test` (JSX thì
 * không).
 *  1. NHẢY GẦN khác NHẢY XA. Xuống dòng kế tiếp là chuyện thường, cho nó nhanh
 *     và êm. Vào hàm / trả về / vòng lặp quay đầu là chỗ người học MẤT dấu
 *     luồng điều khiển, nên đi chậm hơn một nhịp và bóp con trỏ lại để thấy nó
 *     đã đi qua đâu.
 *  2. HIỆU ỨNG KHÔNG ĐƯỢC CHỒNG LÊN NHAU. `paceMs` là khoảng cách thật giữa
 *     hai lần đổi bước (giữ phím →, hoặc nhịp tự chạy); bước nhanh hơn hiệu
 *     ứng thì rút hiệu ứng lại, không bao giờ bắt người dùng chờ.
 *  3. `reduced` (prefers-reduced-motion) thì thời lượng về 0 — con trỏ vẫn
 *     nhảy tới đúng dòng, chỉ là không trượt.
 */
export function stepMotion(
  prev: TraceStep | undefined,
  next: TraceStep,
  opts: { reduced?: boolean; paceMs?: number } = {},
): StepMotion {
  const lines = prev ? Math.abs(next.line - prev.line) : 0;
  const kind = motionKind(prev, next);
  const travel = kind === 'call' || kind === 'return' || lines >= 2;

  let durationMs = 0;
  if (kind !== 'none' && kind !== 'hold') {
    // Đi xa thì lâu hơn một chút, nhưng không tỉ lệ thuận: nhảy 200 dòng mà
    // mất 2 giây thì thành phải CHỜ.
    durationMs = 110 + 14 * Math.min(lines, 8);
    if (kind === 'call' || kind === 'return') durationMs = Math.max(durationMs, 170);
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
    // Nhảy xa: tăng tốc rồi phanh (ease-in-out) — đọc ra thành một chuyến đi.
    easing: travel ? 'cubic-bezier(.65, 0, .35, 1)' : 'cubic-bezier(.33, 1, .68, 1)',
    travel,
  };
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
