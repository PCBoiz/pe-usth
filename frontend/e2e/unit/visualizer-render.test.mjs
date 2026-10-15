// Số lần VẼ LẠI của bộ "Xem từng bước" (code visualizer).
//
// LỖI ĐANG SỬA, đã đo ở phiên trước bằng Chrome (CPU chậm 4×): quanh MỖI ranh
// giới bước có ~35 khung hình dài. Nguyên nhân đọc được thẳng từ code: `index`
// là state của component gốc, mà toàn bộ panel — tiêu đề, nút mở đưa qua
// portal, ghi chú giá, lời nhắc dừng, bộ điều khiển, call stack, nhóm biến của
// TỪNG khung, panel đầu ra, traceback — nằm trong CÙNG một hàm render. Bấm ▶
// một lần là dựng lại cả cây element và gọi lại `formatValue` cho mọi giá trị
// của mọi khung, kể cả khung không đổi gì từ lúc được gọi.
//
// CÁCH ĐO Ở ĐÂY. Bộ test frontend chạy bằng `node --test`: không có jsdom,
// không có bộ dịch JSX, nên render thật một component React là không làm được
// (và phiên này không được mở Chrome). Vì vậy quyết định "panel nào phải vẽ
// lại" đã được đưa ra khỏi component vào MỘT hàm thuần — `panelSignatures()` —
// và comparator của `memo` ở mỗi panel chỉ so chữ ký đó (`sameSignature`). Nên
// ĐẾM SỐ LẦN CHỮ KÝ ĐỔI khi đi qua N bước là đếm đúng số lần panel vẽ lại.
// Ca "mỗi panel được bọc memo với comparator đó" ở cuối file giữ mắt xích còn
// lại: gỡ `memo` ra là trượt, dù chữ ký vẫn đúng.
//
// Bằng chứng bộ test này bắt được lỗi thật — xem con số ở cuối file.
//
// Chạy: cd frontend && npm run test:unit
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { panelSignatures } from '../../src/lib/trace.ts';

const SOURCE = readFileSync(
  new URL('../../src/components/code-visualizer/CodeVisualizer.tsx', import.meta.url),
  'utf8',
);

/* ── Fixture ────────────────────────────────────────────────────────────────
   Hình dạng bước LẤY ĐÚNG như src/python-runner/tracer/pe_tracer.py sinh ra
   (cùng nguồn với e2e/unit/visualizer-motion.test.mjs): mỗi bước có
   {i, line, event, frames:[{name, line, locals}], out, err}, `locals` là mảng
   cặp [tên, giá trị], `out`/`err` là SỐ KÝ TỰ stdout/stderr đã in tới bước đó.

   Chương trình được giả lập là chương trình fib/tong đã dùng ở bộ test chuyển
   động, viết lại thành một bộ sinh để có một vết đủ dài (hàng trăm bước, có đệ
   quy, có print ở cuối) — chứ không phải 5 bước tự bịa: cái cần đo chính là
   "khung dưới đứng yên trong rất nhiều bước liền".

     1  def fib(n):
     2      if n < 2:
     3          return n
     4      return fib(n - 1) + fib(n - 2)
     6  def tong(k):
     7      total = 0
     8      for i in range(k):
     9          total += fib(i)
     10     print(total)
     11     return total
     13 tong(6)
   ───────────────────────────────────────────────────────────────────────────── */

function buildTrace() {
  const steps = [];
  let stdout = '';
  /** Chồng khung đang chạy; mỗi phần tử là {name, line, locals: Map}. */
  const stack = [{ name: '<module>', line: 1, locals: new Map() }];

  const snap = (event, extra = {}) => {
    steps.push({
      i: steps.length,
      line: stack[stack.length - 1].line,
      event,
      // Bản chụp SÂU: vết thật tới từ JSON.parse nên không bước nào dùng chung
      // object với bước khác — đó cũng là lý do `memo` so nông không ăn.
      frames: stack.map((f) => ({
        name: f.name,
        line: f.line,
        locals: [...f.locals.entries()].map(([k, v]) => [k, v]),
      })),
      out: stdout.length,
      err: 0,
      ...extra,
    });
  };

  const top = () => stack[stack.length - 1];
  const at = (line) => {
    top().line = line;
    snap('line');
  };

  function fib(n) {
    stack.push({ name: 'fib', line: 1, locals: new Map([['n', { t: 'int', v: n }]]) });
    snap('call');
    at(2);
    if (n < 2) {
      at(3);
      const ret = { t: 'int', v: n };
      snap('return', { ret });
      stack.pop();
      return n;
    }
    at(4);
    const a = fib(n - 1);
    const b = fib(n - 2);
    top().locals.set('n', { t: 'int', v: n });
    const ret = { t: 'int', v: a + b };
    snap('return', { ret });
    stack.pop();
    return a + b;
  }

  // `tong(6)` ở dòng 13
  at(13);
  stack.push({ name: 'tong', line: 6, locals: new Map([['k', { t: 'int', v: 6 }]]) });
  snap('call');
  at(7);
  let total = 0;
  top().locals.set('total', { t: 'int', v: total });
  for (let i = 0; i < 6; i += 1) {
    at(8);
    top().locals.set('i', { t: 'int', v: i });
    at(9);
    total += fib(i);
    top().locals.set('total', { t: 'int', v: total });
  }
  at(10);
  stdout += `${total}\n`;
  at(11);
  snap('return', { ret: { t: 'int', v: total } });
  stack.pop();
  at(13);

  return {
    steps,
    stdout,
    stderr: '',
    stdoutTruncated: false,
    stop: { kind: 'done' },
    stats: { steps: steps.length, events: steps.length },
    limits: { maxOutputChars: 20000, maxSteps: 20000 },
  };
}

const DOC = buildTrace();

/** Panel có một chữ ký; `vars` là một chữ ký cho MỖI nhóm biến. */
const PANELS = ['chrome', 'notice', 'controls', 'stack', 'output', 'traceback'];

/**
 * Đi qua cả vết và đếm số lần MỖI panel phải vẽ lại.
 *
 * Lần đầu (bước 0) là một lần vẽ của mọi panel; từ đó trở đi, panel vẽ lại
 * đúng khi chữ ký của nó đổi — vì comparator của `memo` chỉ so chữ ký.
 */
function countRenders(doc) {
  const counts = Object.fromEntries(PANELS.map((k) => [k, 0]));
  counts.varsPane = 0;
  counts.varGroups = 0;
  let prev = null;
  for (let i = 0; i < doc.steps.length; i += 1) {
    const sig = panelSignatures(doc, i, {
      status: 'ready',
      autoRunning: false,
      runDurationMs: 1234,
      runQueuedMs: 0,
    });
    if (!prev) {
      for (const k of PANELS) counts[k] += 1;
      counts.varsPane += 1;
      counts.varGroups += sig.vars.length;
    } else {
      for (const k of PANELS) if (sig[k] !== prev[k]) counts[k] += 1;
      if (sig.vars.join('\u0001') !== prev.vars.join('\u0001')) counts.varsPane += 1;
      // So theo VỊ TRÍ vẽ (khung trên cùng trước): khoá của nhóm là
      // `vars-<tên>-<vị trí>`, và chữ ký nhóm đã chứa tên hàm, nên vị trí đổi
      // chủ cũng là một lần vẽ.
      for (let f = 0; f < Math.max(sig.vars.length, prev.vars.length); f += 1) {
        if (sig.vars[f] !== prev.vars[f]) counts.varGroups += 1;
      }
    }
    prev = sig;
  }
  return counts;
}

const N = DOC.steps.length;
const GROUPS_BEFORE = DOC.steps.reduce((n, s) => n + s.frames.length, 0);
const COUNTS = countRenders(DOC);

test('vết fixture đủ dài và đủ sâu để con số nói được điều gì', () => {
  assert.equal(N, 155);
  // Có đệ quy: fib gọi fib, nên có bước sâu 4 khung (<module>, tong, fib, fib).
  assert.ok(Math.max(...DOC.steps.map((s) => s.frames.length)) >= 4);
  assert.equal(GROUPS_BEFORE, 684);
});

test('panel tĩnh vẽ ĐÚNG MỘT LẦN cho cả vết, không phải một lần mỗi bước', () => {
  // TRƯỚC bản sửa: 337 lần mỗi panel (một hàm render dựng lại tất cả).
  assert.equal(COUNTS.chrome, 1);
  assert.equal(COUNTS.notice, 1);
  assert.equal(COUNTS.traceback, 1);
});

test('panel đầu ra chỉ vẽ lại ở bước THẬT CÓ in thêm', () => {
  // Chương trình in đúng một lần (print(total) ở dòng 10): 1 lần vẽ đầu, 1 khi
  // phần vừa in xuất hiện, 1 khi nó thôi là "vừa in", 1 ở bước `return` kế tiếp.
  // TRƯỚC bản sửa: 155 — vẽ lại cả khối <pre> đầu ra ở mọi bước.
  assert.equal(COUNTS.output, 4);
});

test('nhóm biến: khung dưới đứng yên, chỉ khung có biến đổi mới vẽ lại', () => {
  // TRƯỚC bản sửa: mỗi bước dựng lại nhóm biến của MỌI khung = 684 lần, mỗi
  // lần gọi formatValue cho từng giá trị.
  assert.equal(COUNTS.varGroups, 220);
  assert.ok(COUNTS.varGroups < GROUPS_BEFORE / 1.5);
});

test('tổng số lần vẽ panel giảm hơn một nửa khi đi hết vết', () => {
  const after = PANELS.reduce((n, k) => n + COUNTS[k], 0) + COUNTS.varsPane + COUNTS.varGroups;
  // TRƯỚC: 6 panel × 155 bước + 155 lần panel biến + 684 nhóm = 1769.
  const before = PANELS.length * N + N + GROUPS_BEFORE;
  assert.equal(before, 1769);
  assert.equal(after, 594);
  assert.ok(after < before / 2);
});

test('bộ điều khiển và call stack vẫn theo từng bước — chúng in chính số bước và dòng', () => {
  // Hai panel này KHÔNG được đóng băng: bộ đếm "Bước 12/337" và dòng của khung
  // trên cùng đổi gần như mỗi bước. Ghi lại ở đây để lần sau ai thấy con số
  // 337 thì biết đó là cố ý, không phải chỗ bỏ sót.
  assert.equal(COUNTS.controls, N);
  // 134 chứ không phải 155: đúng 21 bước có chồng khung in ra y hệt bước trước
  // nên panel này được bỏ qua. Cả 21 bước đó là sự kiện `return` của `return n`
  // (dòng 3): độ sâu CHƯA giảm và dòng không đổi, nên call stack không có gì
  // khác — giá trị trả về nằm ở panel biến, không nằm ở đây.
  assert.equal(COUNTS.stack, 134);
});

test('chữ ký không được mang `index` một cách thừa — đó chính là lỗi cũ', () => {
  const a = panelSignatures(DOC, 40, { status: 'ready' });
  const b = panelSignatures(DOC, 40, { status: 'ready' });
  assert.deepEqual(a, b);
  // `index` chỉ được xuất hiện trong chữ ký của panel có hiệu ứng phải DIỄN
  // LẠI theo bước (đầu ra vừa in, đẩy vào/bật ra của call stack).
  for (const k of ['chrome', 'notice', 'traceback']) {
    const sigs = DOC.steps.map((_, i) => panelSignatures(DOC, i, { status: 'ready' })[k]);
    assert.equal(new Set(sigs).size, 1, `chữ ký ${k} đổi theo bước`);
  }
});

test('mỗi panel con được bọc memo với comparator so chữ ký', () => {
  // Mắt xích mà hàm thuần không chứng minh được: chữ ký đúng nhưng panel không
  // bọc memo thì vẫn vẽ lại mỗi bước như cũ.
  for (const name of [
    'VizChrome',
    'StopNotice',
    'StepControls',
    'StackPane',
    'VarGroup',
    'VarsPane',
    'OutputText',
    'OutputStatic',
  ]) {
    assert.match(
      SOURCE,
      new RegExp(`const ${name} = memo\\(`),
      `${name} không được bọc memo()`,
    );
    assert.match(SOURCE, new RegExp(`sig=\\{(sigs\\.|varsSig)`), 'panel không nhận prop sig');
  }
  // 7 panel dùng comparator dùng chung; VizChrome có comparator riêng vì còn
  // phải so `triggerHost`, nhưng nó cũng gọi sameSignature.
  assert.equal(SOURCE.match(/sameSignature/g).length, 9);
  assert.match(SOURCE, /panelSignatures\(doc, index/);
});
