/**
 * Unit test cho logic thuần của bộ xem từng bước — frontend/src/lib/trace.ts.
 *
 * Vì sao phải có: ba hàm ở đây quyết định người học ĐỌC ĐƯỢC GÌ.
 *  - `stopNotice` là chỗ duy nhất nói ra "vết đã bị cắt". Im lặng ở đây nghĩa
 *    là người học thấy vết dừng ở bước 1000 và tưởng chương trình mình dừng ở
 *    đó — kết luận sai hoàn toàn về chương trình của chính họ.
 *  - `formatValue` phải giữ lại dấu hiệu "đã cắt bớt": `[1, 2, 3]` thay cho một
 *    list 5000 phần tử là một lời nói sai, không phải một bản rút gọn.
 *  - `outputAt` là thứ làm cho panel đầu ra khớp với bước đang xem.
 *
 * Fixture dưới đây là đầu ra THẬT của src/python-runner/tracer/pe_tracer.py
 * (chạy `py src/python-runner/tracer/pe_tracer_test.py` để xem), không phải
 * hình dạng tự bịa — đúng cái bẫy đã ghi trong AGENTS.md.
 *
 * Bằng chứng bộ test này bắt được lỗi thật (gỡ bản sửa ra, test phải trượt):
 *  - stopNotice trả null cho 'step-limit' (im lặng khi cắt vết) → 2 ca trượt.
 *  - formatValue bỏ nhánh `more` (không nói list bị cắt) → 2 ca trượt.
 *  - formatValue bỏ nhánh 'cycle' (dữ liệu tự tham chiếu) → 1 ca trượt.
 *  - outputAt luôn trả doc.stdout (đầu ra không theo bước) → 2 ca trượt.
 *  - changedNames so cả khi khác độ sâu stack → 1 ca trượt.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTOPLAY_INTERVAL_MS,
  changedNames,
  formatValue,
  nextIndex,
  outputAt,
  outputDelta,
  stackDelta,
  stepMotion,
  stopNotice,
} from '../../src/lib/trace.ts';

// CỐ Ý KHÔNG khớp `PE_LIMITS` thật (nay là timeBudgetMs 4000): câu cảnh báo
// "hết thời gian" phải lấy số TỪ `doc.limits`, nên một fixture mang con số khác
// là thứ duy nhất chứng minh được điều đó. Fixture trùng hằng thật thì một bản
// `stopNotice` ghi cứng "4 giây" cũng ĐẠT. Trần đang chạy nằm ở
// `scripts/tracer/pe_tracer.py`; `tracer-limits.test.mjs` canh con số đó.
const LIMITS = {
  maxSteps: 1000,
  maxStringChars: 200,
  maxItems: 100,
  maxOutputChars: 60000,
  timeBudgetMs: 6500,
};

/** Một bước: [tên biến, giá trị] giữ thứ tự, frames từ ngoài vào trong. */
function step(over = {}) {
  return {
    i: 0,
    line: 1,
    event: 'line',
    frames: [{ name: '<module>', line: 1, locals: [] }],
    out: 0,
    err: 0,
    ...over,
  };
}

function doc(over = {}) {
  return {
    v: 1,
    steps: [],
    stdout: '',
    stderr: '',
    stdoutTruncated: false,
    stderrTruncated: false,
    stopReason: 'done',
    error: null,
    stats: { steps: 0, events: 0, elapsedMs: 1, valuesTruncated: 0 },
    limits: LIMITS,
    ...over,
  };
}

test('stopReason=done thì không nói gì thêm', () => {
  assert.equal(stopNotice(doc()), null);
});

test('chạm trần số bước: nói ra con số VÀ nói là chương trình vẫn chạy hết', () => {
  const n = stopNotice(doc({ stopReason: 'step-limit' }));
  assert.equal(n.kind, 'warn');
  assert.match(n.text, /1000 bước/);
  // Phần quan trọng nhất: đầu ra bên dưới là đầy đủ, chỉ vết dừng sớm.
  assert.match(n.text, /VẪN chạy/);
});

test('hết thời gian ghi vết: nói ra số giây, không nói chung chung', () => {
  const n = stopNotice(doc({ stopReason: 'time-limit' }));
  assert.equal(n.kind, 'warn');
  assert.match(n.text, /7 giây|6 giây/);
});

test('vết quá lớn: chỉ ra nguyên nhân là dữ liệu trong biến', () => {
  const n = stopNotice(doc({ stopReason: 'byte-limit' }));
  assert.equal(n.kind, 'warn');
  assert.match(n.text, /quá nặng|quá lớn/);
});

test('ngoại lệ: nói loại, dòng và thông điệp', () => {
  const n = stopNotice(
    doc({
      stopReason: 'error',
      error: {
        type: 'ZeroDivisionError',
        message: 'division by zero',
        line: 2,
        traceback: 'Traceback…',
      },
    }),
  );
  assert.equal(n.kind, 'error');
  assert.match(n.text, /ZeroDivisionError/);
  assert.match(n.text, /dòng 2/);
  assert.match(n.text, /division by zero/);
});

test('tracer lỗi: chỉ sang nút Chạy chứ không bỏ người dùng ở đó', () => {
  const n = stopNotice(doc({ stopReason: 'tracer-error' }));
  assert.equal(n.kind, 'error');
  assert.match(n.text, /Chạy/);
});

test('đầu ra theo từng bước, không phải toàn bộ đầu ra', () => {
  const d = doc({
    stdout: '0\n1\n2\n',
    steps: [step({ i: 0, out: 0 }), step({ i: 1, out: 2 }), step({ i: 2, out: 6 })],
  });
  assert.equal(outputAt(d, 0).stdout, '');
  assert.equal(outputAt(d, 1).stdout, '0\n');
  assert.equal(outputAt(d, 2).stdout, '0\n1\n2\n');
});

test('không có bước nào (lỗi cú pháp) → hiện toàn bộ đầu ra', () => {
  const d = doc({ stdout: 'rac\n', stderr: 'SyntaxError…', steps: [] });
  assert.deepEqual(outputAt(d, 0), { stdout: 'rac\n', stderr: 'SyntaxError…' });
});

test('formatValue: số, chuỗi, None như Python in ra', () => {
  assert.equal(formatValue({ t: 'prim', r: '42' }), '42');
  assert.equal(formatValue({ t: 'prim', r: 'None' }), 'None');
  assert.equal(formatValue({ t: 'str', r: 'An' }), "'An'");
});

test('formatValue: chuỗi bị cắt vẫn nói ra độ dài THẬT', () => {
  const out = formatValue({ t: 'str', r: 'x'.repeat(200), trunc: true, n: 10000 });
  assert.match(out, /…/);
  assert.match(out, /10000 ký tự/);
});

test('formatValue: list bị cắt phải nói ra là còn nữa, không im lặng', () => {
  const out = formatValue({
    t: 'list',
    items: [
      { t: 'prim', r: '0' },
      { t: 'prim', r: '1' },
    ],
    n: 5000,
    more: true,
  });
  assert.match(out, /5000 phần tử/);
});

test('formatValue: dict bị cắt cũng vậy', () => {
  const out = formatValue({
    t: 'dict',
    items: [[{ t: 'str', r: 'a' }, { t: 'prim', r: '1' }]],
    n: 500,
    more: true,
  });
  assert.match(out, /'a': 1/);
  assert.match(out, /500 cặp/);
});

test('formatValue: dữ liệu tự tham chiếu không được vẽ thành vòng vô hạn', () => {
  const out = formatValue({
    t: 'list',
    items: [{ t: 'prim', r: '1' }, { t: 'cycle' }],
    n: 2,
  });
  assert.match(out, /tự tham chiếu/);
});

test('formatValue: list rỗng, set rỗng, tuple', () => {
  assert.equal(formatValue({ t: 'list', items: [], n: 0 }), '[]');
  assert.equal(formatValue({ t: 'set', items: [], n: 0 }), 'set()');
  assert.equal(
    formatValue({ t: 'tuple', items: [{ t: 'prim', r: '1' }, { t: 'prim', r: '2' }], n: 2 }),
    '(1, 2)',
  );
});

test('formatValue: đối tượng hiện tên lớp và thuộc tính', () => {
  assert.equal(
    formatValue({
      t: 'obj',
      cls: 'Diem',
      attrs: [
        ['x', { t: 'prim', r: '1' }],
        ['y', { t: 'prim', r: '2' }],
      ],
      n: 2,
    }),
    'Diem(x=1, y=2)',
  );
});

test('formatValue: hàm, lớp, kiểu không mở được, vượt độ sâu', () => {
  assert.equal(formatValue({ t: 'fn', name: 'cong', cls: 'function' }), '<hàm cong>');
  assert.equal(formatValue({ t: 'cls', name: 'Diem' }), '<lớp Diem>');
  assert.equal(formatValue({ t: 'opaque', cls: 'module', r: "<module 'math'>" }), "<module 'math'>");
  assert.equal(formatValue({ t: 'depth' }), '…');
});

test('formatValue: một dòng rất dài bị cắt để không phá layout', () => {
  const items = Array.from({ length: 100 }, () => ({ t: 'prim', r: '123456' }));
  const out = formatValue({ t: 'list', items, n: 100 });
  assert.ok(out.length <= 121, `dài ${out.length}`);
});

test('changedNames: chỉ tên có giá trị thay đổi trong frame đang chạy', () => {
  const prev = step({
    frames: [
      {
        name: '<module>',
        line: 2,
        locals: [
          ['tong', { t: 'prim', r: '0' }],
          ['i', { t: 'prim', r: '0' }],
        ],
      },
    ],
  });
  const next = step({
    frames: [
      {
        name: '<module>',
        line: 3,
        locals: [
          ['tong', { t: 'prim', r: '1' }],
          ['i', { t: 'prim', r: '0' }],
        ],
      },
    ],
  });
  const changed = changedNames(prev, next);
  assert.deepEqual([...changed], ['tong']);
});

test('changedNames: biến mới xuất hiện cũng là đổi', () => {
  const prev = step({ frames: [{ name: '<module>', line: 1, locals: [] }] });
  const next = step({
    frames: [{ name: '<module>', line: 2, locals: [['x', { t: 'prim', r: '1' }]] }],
  });
  assert.deepEqual([...changedNames(prev, next)], ['x']);
});

test('changedNames: vừa vào hàm (stack đổi độ sâu) thì không đánh dấu gì', () => {
  const prev = step({ frames: [{ name: '<module>', line: 4, locals: [] }] });
  const next = step({
    frames: [
      { name: '<module>', line: 4, locals: [] },
      { name: 'cong', line: 1, locals: [['a', { t: 'prim', r: '2' }]] },
    ],
  });
  assert.equal(changedNames(prev, next).size, 0);
});

test('changedNames: bước đầu tiên (không có bước trước) không đánh dấu gì', () => {
  const next = step({
    frames: [{ name: '<module>', line: 1, locals: [['x', { t: 'prim', r: '1' }]] }],
  });
  assert.equal(changedNames(undefined, next).size, 0);
});

test('nextIndex: không bao giờ ra ngoài mảng', () => {
  assert.equal(nextIndex(0, 3, 'prev'), 0);
  assert.equal(nextIndex(2, 3, 'next'), 2);
  assert.equal(nextIndex(1, 3, 'first'), 0);
  assert.equal(nextIndex(1, 3, 'last'), 2);
  // Vết rỗng: mọi phím bấm vẫn phải cho ra một chỉ số hợp lệ.
  assert.equal(nextIndex(0, 0, 'next'), 0);
  assert.equal(nextIndex(0, 0, 'last'), 0);
});

/* ───────── Chuyển động: quyết định "hiện hiệu ứng nào" ─────────
 *
 * Vì sao phần này cũng phải có test: ba hàm dưới đây là chỗ DUY NHẤT quyết
 * định người học thấy được "vừa có cái gì thay đổi". Chúng nằm trong trace.ts
 * đúng vì `node --test` không bóc được JSX — logic để trong .tsx là logic
 * không ai kiểm được.
 *
 * Bằng chứng bộ test này bắt được lỗi thật (gỡ bản sửa ra, test phải trượt):
 *  - stepMotion phân loại theo `event` thay vì theo ĐỘ SÂU stack → 1 ca trượt.
 *  - stepMotion bỏ trần MOTION_MAX_MS (nhảy xa thì phải chờ) → 1 ca trượt.
 *  - stepMotion bỏ phần rút theo `paceMs` (hiệu ứng chồng lên nhau khi bấm
 *    nhanh) → 1 ca trượt.
 *  - stepMotion bỏ `reduced` (không tôn trọng prefers-reduced-motion) → 1 ca trượt.
 *  - stackDelta tính độ sâu bằng frames.length, bỏ framesElided → 1 ca trượt.
 *  - stackDelta so bằng tên hàm thay vì độ sâu (đệ quy) → 2 ca trượt.
 *  - outputDelta coi mọi đầu ra là "vừa in" (không so với bước trước) → 2 ca trượt.
 */

/** Một khung: tên hàm, dòng đang đứng, biến cục bộ. */
function frame(name, line, locals = []) {
  return { name, line, locals };
}

test('stepMotion: xuống dòng kế tiếp là nhảy GẦN — nhanh và không bóp con trỏ', () => {
  const m = stepMotion(step({ line: 3 }), step({ line: 4 }));
  assert.equal(m.kind, 'step');
  assert.equal(m.lines, 1);
  assert.equal(m.travel, false);
  assert.ok(m.durationMs >= 60 && m.durationMs <= 160, `${m.durationMs}ms`);
});

test('stepMotion: vòng lặp quay đầu là nhảy XA — vẽ khác, đi lâu hơn một nhịp', () => {
  const near = stepMotion(step({ line: 3 }), step({ line: 4 }));
  const back = stepMotion(step({ line: 9 }), step({ line: 3 }));
  assert.equal(back.kind, 'back');
  assert.equal(back.travel, true);
  assert.ok(back.durationMs > near.durationMs, `${back.durationMs} vs ${near.durationMs}`);
  // Nhảy xa trong cùng hàm (if/else, break) cũng là "travel" nhưng không phải
  // quay đầu — hai thứ này người học đọc ra khác nhau.
  assert.equal(stepMotion(step({ line: 3 }), step({ line: 12 })).kind, 'jump');
});

test('stepMotion: vào hàm / về hàm gọi tính theo ĐỘ SÂU stack, không theo event', () => {
  const caller = step({ line: 9, frames: [frame('<module>', 9)] });
  const inside = step({
    line: 2,
    event: 'call',
    frames: [frame('<module>', 9), frame('cong', 2)],
  });
  assert.equal(stepMotion(caller, inside).kind, 'call');
  assert.equal(stepMotion(inside, caller).kind, 'return');

  // Bẫy thật: sự kiện 'return' còn ĐỨNG TRONG hàm bị gọi (độ sâu CHƯA giảm) —
  // việc về hàm gọi xảy ra ở bước sau. Lấy theo event thì hiệu ứng "bật khung
  // ra" chạy sớm một bước, tức là sai chỗ người học đang nhìn.
  const returning = step({
    line: 3,
    event: 'return',
    frames: [frame('<module>', 9), frame('cong', 3)],
  });
  assert.equal(stepMotion(inside, returning).kind, 'step');
});

test('stepMotion: đứng nguyên một dòng thì không có gì để trượt', () => {
  const m = stepMotion(step({ line: 5 }), step({ line: 5 }));
  assert.equal(m.kind, 'hold');
  assert.equal(m.durationMs, 0);
});

test('stepMotion: bước đầu tiên đặt con trỏ vào chỗ, không trượt từ đâu cả', () => {
  const m = stepMotion(undefined, step({ line: 7 }));
  assert.equal(m.kind, 'none');
  assert.equal(m.durationMs, 0);
});

test('stepMotion: prefers-reduced-motion thì thời lượng về 0', () => {
  for (const [from, to] of [[3, 4], [9, 3], [3, 40]]) {
    const m = stepMotion(step({ line: from }), step({ line: to }), { reduced: true });
    assert.equal(m.durationMs, 0, `${from}->${to}`);
  }
});

test('stepMotion: nhảy 500 dòng vẫn không bắt người dùng chờ', () => {
  const m = stepMotion(step({ line: 1 }), step({ line: 500 }));
  assert.ok(m.durationMs <= 220, `${m.durationMs}ms`);
});

test('stepMotion: bấm nhanh thì hiệu ứng rút lại, không chồng lên bước sau', () => {
  // Giữ phím →: hai bước cách nhau ~40 ms. Hiệu ứng 200 ms sẽ xếp hàng sau con
  // trỏ và người học thấy giật.
  const fast = stepMotion(step({ line: 2 }), step({ line: 20 }), { paceMs: 40 });
  assert.ok(fast.durationMs <= 60, `${fast.durationMs}ms`);
  // Nhịp tự chạy: ngược lại, phải đủ chỗ cho hiệu ứng chạy xong trước bước sau.
  const auto = stepMotion(step({ line: 2 }), step({ line: 20 }), {
    paceMs: AUTOPLAY_INTERVAL_MS,
  });
  assert.ok(
    auto.durationMs < AUTOPLAY_INTERVAL_MS,
    `${auto.durationMs}ms >= nhịp ${AUTOPLAY_INTERVAL_MS}ms`,
  );
});

test('stackDelta: gọi hàm thì ĐẨY VÀO khung mới, không bật ra khung nào', () => {
  const prev = step({ frames: [frame('<module>', 9)] });
  const next = step({ frames: [frame('<module>', 9), frame('cong', 2)] });
  const d = stackDelta(prev, next);
  assert.deepEqual(d.pushed.map((f) => f.name), ['cong']);
  assert.deepEqual(d.popped, []);
});

test('stackDelta: trả về thì BẬT RA khung vừa rời (lấy được từ bước TRƯỚC)', () => {
  const prev = step({ frames: [frame('<module>', 9), frame('cong', 3)] });
  const next = step({ frames: [frame('<module>', 9)] });
  const d = stackDelta(prev, next);
  assert.deepEqual(d.pushed, []);
  // Khung này không còn trong bước hiện tại — không lấy từ prev thì không vẽ
  // được cú bật ra, mà đó là nửa quan trọng của chữ "stack".
  assert.deepEqual(d.popped.map((f) => f.name), ['cong']);
  assert.equal(d.popped[0].line, 3);
});

test('stackDelta: cùng độ sâu, hoặc chưa có bước trước, thì không có gì động', () => {
  const a = step({ frames: [frame('<module>', 1), frame('cong', 2)] });
  const b = step({ frames: [frame('<module>', 1), frame('cong', 3)] });
  assert.deepEqual(stackDelta(a, b), { pushed: [], popped: [] });
  assert.deepEqual(stackDelta(undefined, b), { pushed: [], popped: [] });
});

test('stackDelta: đệ quy cùng tên hàm vẫn đếm đúng khung vào/ra', () => {
  const d1 = step({ frames: [frame('<module>', 9), frame('giaithua', 4)] });
  const d2 = step({
    frames: [frame('<module>', 9), frame('giaithua', 4), frame('giaithua', 4)],
  });
  // Cùng tên, cùng dòng — so bằng tên thì ra "không có gì đổi", trong khi đây
  // đúng là chỗ người học cần thấy stack dày thêm.
  assert.equal(stackDelta(d1, d2).pushed.length, 1);
  assert.equal(stackDelta(d2, d1).popped.length, 1);
});

test('stackDelta: đệ quy sâu bị cắt khung ở giữa thì tính theo ĐỘ SÂU THẬT', () => {
  // framesElided: tracer chỉ gửi về vài khung đầu/cuối. Đếm bằng frames.length
  // thì stack dày thêm 1 mà vẫn ra "không đổi".
  const prev = step({ frames: [frame('<module>', 9), frame('dem', 4)], framesElided: 30 });
  const next = step({ frames: [frame('<module>', 9), frame('dem', 4)], framesElided: 31 });
  const d = stackDelta(prev, next);
  assert.deepEqual(d.popped, []);
  assert.equal(d.pushed.length, 1);
});

test('outputDelta: tách phần VỪA in ra khỏi phần đã thấy ở bước trước', () => {
  const d = doc({
    stdout: '0\n1\n2\n',
    steps: [step({ i: 0, out: 0 }), step({ i: 1, out: 2 }), step({ i: 2, out: 4 })],
  });
  assert.deepEqual(outputDelta(d, 1), { seen: '', fresh: '0\n' });
  assert.deepEqual(outputDelta(d, 2), { seen: '0\n', fresh: '1\n' });
  // Bước đầu: không có bước trước để so, nên không có gì "vừa in".
  assert.deepEqual(outputDelta(d, 0), { seen: '', fresh: '' });
});

test('outputDelta: kéo thanh trượt LÙI thì không có dòng nào vừa in', () => {
  const d = doc({
    stdout: '0\n1\n',
    steps: [step({ i: 0, out: 2 }), step({ i: 1, out: 0 })],
  });
  assert.deepEqual(outputDelta(d, 1), { seen: '', fresh: '' });
});

test('outputDelta: không có bước nào (lỗi cú pháp) thì không tô cả khối đầu ra', () => {
  const d = doc({ stdout: 'rac\n', steps: [] });
  assert.deepEqual(outputDelta(d, 0), { seen: 'rac\n', fresh: '' });
});
