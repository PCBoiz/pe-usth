// Canh lệch giữa `pe_tracer.py` (NGUỒN) và `pe_tracer.min.py` (bản mà TRÌNH
// DUYỆT tải về khi bấm "Xem từng bước").
//
// VÌ SAO FILE NÀY NẰM Ở BỘ TEST FRONTEND, không nằm cạnh tracer trong backend:
// bản canh lệch hiện có (`src/python-runner/tracer/tracer-source.spec.ts`) chỉ
// so nguồn với bản NHÚNG CHO BACKEND. Bản cho trình duyệt — thứ duy nhất còn
// chạy sau khi `/ide` chuyển sang Pyodide — thì KHÔNG ai canh. Và pha dọn sắp
// tới sẽ xoá `src/python-runner/**` cùng cái spec đó, nên nếu chỉ thêm ca vào
// đó thì đúng lúc cần nhất là lúc nó biến mất.
//
// Hỏng kiểu gì: sửa `pe_tracer.py` rồi quên `node scripts/build-tracer-source.mjs`.
// Bộ test Python của tracer vẫn xanh (nó chạy trên bản .py), backend vẫn xanh
// (bản nhúng có thể đã sinh lại), mà học viên nhận bản .min.py CŨ — cùng một
// đoạn mã cho ra hai vết khác nhau tuỳ đường nào chạy.
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const WEB = new URL('../../public/static/py/pe_tracer.min.py', import.meta.url);
// Đường dẫn nguồn. Pha dọn có thể DI CHUYỂN nó; khi đó ca đầu tiên đỏ với đúng
// câu phải làm, chứ không im lặng bỏ qua phép canh.
const NGUON = new URL('../../../src/python-runner/tracer/pe_tracer.py', import.meta.url);

test('tệp nguồn của tracer còn ở chỗ đã khai', () => {
  assert.ok(
    existsSync(NGUON),
    'không thấy src/python-runner/tracer/pe_tracer.py — nếu pha dọn đã dời nó thì '
      + 'sửa hằng NGUON trong file này VÀ scripts/build-tracer-source.mjs. Đừng xoá ca này: '
      + 'nó là thứ duy nhất còn canh bản tracer mà trình duyệt tải.',
  );
});

test('sha256 ghi trong bản .min.py khớp nguồn — quên sinh lại là đỏ', () => {
  const nguon = readFileSync(NGUON, 'utf8').replace(/\r\n/g, '\n');
  const web = readFileSync(WEB, 'utf8');
  const m = /# sha256 của nguồn: ([0-9a-f]{64})/.exec(web);
  assert.ok(m, 'bản .min.py thiếu dòng "# sha256 của nguồn:" — sinh lại bằng '
    + 'node scripts/build-tracer-source.mjs');
  const sha = createHash('sha256').update(nguon, 'utf8').digest('hex');
  assert.equal(
    m[1], sha,
    'pe_tracer.min.py đã cũ so với pe_tracer.py — chạy: node scripts/build-tracer-source.mjs',
  );
});

test('bản .min.py còn đủ phần cốt lõi sau khi rút gọn', () => {
  const web = readFileSync(WEB, 'utf8');
  for (const can of ['def _pe_run(', 'sys.settrace', 'PE_BEGIN', 'PE_END', 'PE_LIMITS']) {
    assert.ok(web.includes(can), `thiếu ${can} — bước rút gọn đã làm hỏng mã`);
  }
});

test('và THỰC SỰ là bản rút gọn, không phải bản nguồn chép tay', () => {
  // Chép nguyên .py sang cũng làm hai ca trên xanh. Bản rút gọn phải NHỎ HƠN và
  // không còn chú thích tiếng Việt.
  const nguon = readFileSync(NGUON, 'utf8').replace(/\r\n/g, '\n');
  const web = readFileSync(WEB, 'utf8');
  assert.ok(
    Buffer.byteLength(web, 'utf8') < Buffer.byteLength(nguon, 'utf8'),
    `bản web ${Buffer.byteLength(web, 'utf8')} byte, nguồn ${Buffer.byteLength(nguon, 'utf8')} byte`,
  );
  assert.ok(!web.includes('# Vì sao'), 'bản web còn chú thích tiếng Việt của nguồn');
});

test('worker của /ide tải đúng tên file này', () => {
  // Đổi tên file mà quên worker thì nút "Xem từng bước" chết lặng: worker fetch
  // 404 rồi báo "không chạy được Python".
  const w = readFileSync(
    new URL('../../public/static/js/ide.worker.js', import.meta.url),
    'utf8',
  );
  // So đúng LỜI GỌI `fetch`, không chỉ "chuỗi có xuất hiện trong file": tên
  // file cũng nằm trong một chú thích ở trên, nên `includes` một mình vẫn xanh
  // khi lời gọi thật đã bị đổi — bản đầu của ca này đúng như vậy và phép thử gỡ
  // bản sửa không bắt được gì.
  assert.match(
    w,
    /fetch\('\/static\/py\/pe_tracer\.min\.py'/,
    'ide.worker.js không còn fetch /static/py/pe_tracer.min.py',
  );
});
