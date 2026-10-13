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
  changedNames,
  formatValue,
  nextIndex,
  outputAt,
  stopNotice,
} from '../../src/lib/trace.ts';

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
