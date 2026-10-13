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
