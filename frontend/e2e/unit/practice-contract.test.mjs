/**
 * Unit test cho HỢP ĐỒNG DỮ LIỆU của ca chấm — đường đi từ `step_4` tới worker.
 *
 * Vì sao phải có bộ này. Tới 26/10/2026 khoá 172 bài đang xuất bản KHÔNG có một
 * ca chấm nào: mọi bài có `step_4.task` và phần lớn có `starterCode`, nhưng
 * `step_4.tests` thì trống trơn — người học viết code rồi tự so bằng mắt. Nay
 * 124 bài có bài tập được chấm với 415 ca, và chúng dùng một hợp đồng KHÁC hợp
 * đồng của pe-v4: `{name, input, expected}` thay cho `{name, call, expect}`.
 *
 * Cái dễ vỡ không phải phép so khớp (đó là việc của studio-harness.py, có
 * `scripts/pe-da/check-practice.mjs` canh bằng 415 ca thật + 556 biến thể sai).
 * Cái dễ vỡ là ĐƯỜNG ĐI: `contract` phải chạy qua năm chặng —
 *
 *     step_4.contract -> useCodeRunner -> RunRequest -> pyodide-runner.send()
 *                     -> postMessage -> studio-lesson.worker.js -> _studio_main
 *
 * — và rơi ở chặng nào cũng KHÔNG có lỗi nào được ném. Bộ chấm chỉ lặng lẽ rơi
 * về tên biến mặc định (`data`/`result`), rồi 12 bài `mode: "script"` trượt
 * TOÀN BỘ ca với NameError, trên lời giải đúng. Đúng loại lỗi mà một bộ test
 * chạy ở Node không thấy nhưng học viên thấy ngay.
 *
 * Bằng chứng bộ này bắt được lỗi thật (quy ước AGENTS.md: gỡ bản sửa ra, test
 * phải trượt). Ba lần gỡ, ba kết quả khác nhau:
 *   · bỏ `contract: request.contract ?? null` trong pyodide-runner.send()
 *     → 2 ca trượt ("runner gửi contract", "contract null thay vì undefined");
 *   · bỏ dòng đọc `data.contract` trong studio-lesson.worker.js
 *     → 2 ca trượt ("worker đọc contract", "worker truyền vào _studio_main");
 *   · bỏ `contract: four.contract` trong useCodeRunner.ts
 *     → 1 ca trượt ("useCodeRunner gửi contract của bài").
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { laCaDuLieu } from '../../src/lib/studio-lesson.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const FE = join(ROOT, 'frontend');

const doc = (...p) => readFileSync(join(FE, ...p), 'utf8');

/** Bản dựng THẬT — không bịa fixture, xem bẫy fixture trong AGENTS.md. */
const bundle = JSON.parse(
  readFileSync(join(ROOT, 'scripts', 'pe-da', 'out', 'lessons.json'), 'utf8'),
).lessons;

const coBaiTap = bundle.filter((b) => (b.content_json?.step_4?.tests ?? []).length);

// ───────────────────────────────────────────── phân loại hai hợp đồng ca chấm

test('laCaDuLieu: ca có `call` là dạng biểu thức, ca có `input` là dạng dữ liệu', () => {
  assert.equal(laCaDuLieu({ name: 'x', call: 'f(1)', expect: '1' }), false);
  assert.equal(laCaDuLieu({ name: 'x', input: [1], expected: 1 }), true);
  // `expected: null` là đáp án HỢP LỆ của nhiều bài ("đầu vào rỗng -> không có
  // kết quả"), nên phép phân loại không được dựa vào giá trị khác null.
  assert.equal(laCaDuLieu({ name: 'x', input: [], expected: null }), true);
});

test('bài CÓ contract thì không được trộn hai hợp đồng', () => {
  // Trộn chỉ HẠI KHI bài khai `contract`: mode/inputVariable/resultVariable/
  // returnType chỉ được áp cho ca DỮ LIỆU, nên ca biểu thức lặng lẽ bỏ qua
  // chúng và không báo gì — bộ chấm phân nhánh theo từng ca nên nó cứ chạy.
  //
  // Bài KHÔNG khai contract thì không có gì để bỏ qua. Luật cũ cấm MỌI bài
  // trộn, tức rộng hơn chính lý do của nó, và nó đã chặn đúng cách duy nhất
  // cứu được ca "tên kèm byte null" của SY20: ca đó cần một byte NUL — thứ DUY
  // NHẤT làm lời giải tầm thường `return data` trượt ở bài round-trip này — mà
  // Postgres jsonb không lưu được NUL, nên nạp 172 bài chết ở câu UPDATE thứ
  // 123 và rollback cả khoá. Viết nó thành biểu thức thì NUL nằm trong MÃ
  // NGUỒN Python chứ không trong dữ liệu. Luật này khớp `kiem_bai_tap()` của
  // scripts/pe-da/check.py — bốn chỗ cùng ghi giả định này, đừng để lệch.
  let thuanMotHopDong = 0;
  for (const b of coBaiTap) {
    const t = b.content_json.step_4.tests;
    const duLieu = t.filter(laCaDuLieu).length;
    const thuan = duLieu === 0 || duLieu === t.length;
    if (thuan) thuanMotHopDong += 1;
    if (b.content_json.step_4.contract) {
      assert.ok(
        thuan,
        `${b.lesson_code}: ${duLieu}/${t.length} ca dạng dữ liệu — bài CÓ contract mà trộn hai hợp đồng`,
      );
    }
  }
  // Trộn phải là NGOẠI LỆ. Nới luật mà không đặt trần là mở cửa cho "bài nào
  // khó thì viết một ca biểu thức cho xong", và khi đó luật trên không còn nói
  // được gì. Hôm nay đúng 1 bài (SY20).
  assert.ok(
    thuanMotHopDong >= coBaiTap.length - 2,
    `${coBaiTap.length - thuanMotHopDong} bài trộn hợp đồng — quá nhiều, xem lại thay vì nới tiếp`,
  );
});

test('bài script khai ĐỦ cả inputVariable và resultVariable', () => {
  // Thiếu một trong hai thì bộ chấm tiêm vào tên mặc định mà đề không nói, và
  // MỌI ca trượt với NameError — trên lời giải đúng.
  const script = coBaiTap.filter((b) => b.content_json.step_4.contract?.mode === 'script');
  assert.ok(script.length >= 1, 'bản dựng phải có bài mode=script để ca này nói được gì');
  for (const b of script) {
    const hd = b.content_json.step_4.contract;
    assert.ok(hd.inputVariable, `${b.lesson_code}: thiếu inputVariable`);
    assert.ok(hd.resultVariable, `${b.lesson_code}: thiếu resultVariable`);
  }
});

test('contract chỉ chứa khoá bộ chấm thật sự đọc', () => {
  // Khoá lạ không làm gì đỏ: `_chay_ca_du_lieu` đọc đúng bốn khoá rồi bỏ qua
  // phần còn lại, nên một `soLuong: 3` viết thêm sẽ im lặng vô hiệu.
  const biet = new Set(['mode', 'inputVariable', 'resultVariable', 'returnType']);
  for (const b of coBaiTap) {
    for (const k of Object.keys(b.content_json.step_4.contract ?? {})) {
      assert.ok(biet.has(k), `${b.lesson_code}: contract có khoá lạ "${k}"`);
    }
  }
});

test('bài nào có ca dạng dữ liệu thì PHẢI có contract hoặc theo mặc định solve(data)', () => {
  for (const b of coBaiTap) {
    const s4 = b.content_json.step_4;
    if (!s4.tests.some(laCaDuLieu)) continue;
    const mode = s4.contract?.mode ?? 'function';
    assert.ok(
      mode === 'function' || mode === 'script',
      `${b.lesson_code}: contract.mode lạ: ${mode}`,
    );
    // Hợp đồng `function` nghĩa là mã học viên phải định nghĩa `solve` — khung
    // đề buộc phải mớm sẵn tên đó, không thì không ai đoán ra.
    if (mode === 'function') {
      assert.match(
        s4.starterCode ?? '',
        /def\s+solve\s*\(/,
        `${b.lesson_code}: hợp đồng solve(data) nhưng khung đề không có def solve(`,
      );
    }
  }
});

// ──────────────────────────────────────── đường đi của contract qua các chặng

test('useCodeRunner gửi contract của bài', () => {
  const src = doc('src', 'components', 'python-studio', 'useCodeRunner.ts');
  assert.match(
    src,
    /^\s*contract:\s*four\.contract,?$/m,
    'useCodeRunner.execute() phải đưa four.contract vào RunRequest',
  );
});

test('runner gửi contract trong postMessage', () => {
  const src = doc('src', 'components', 'python-studio', 'runner', 'pyodide-runner.ts');
  assert.match(
    src,
    /^\s*contract:\s*request\.contract\s*\?\?\s*null,?$/m,
    'pyodide-runner.send() phải truyền contract sang worker',
  );
});

test('contract gửi đi là null, KHÔNG phải undefined', () => {
  // `JSON.stringify(undefined)` trả chuỗi "undefined", và `json.loads` phía
  // Python nổ trên đó — ở một chỗ không ai nghĩ tới. `?? null` là chỗ chặn.
  const src = doc('src', 'components', 'python-studio', 'runner', 'pyodide-runner.ts');
  assert.ok(
    !/contract:\s*request\.contract,/.test(src),
    'gửi contract mà không có `?? null` thì worker JSON.stringify ra "undefined"',
  );
});

test('hợp đồng thông điệp trong chú thích có nhắc contract', () => {
  // Chú thích đó là chỗ duy nhất liệt kê tên trường cố định giữa React và
  // worker; để nó lỗi thời là người sau đọc xong vẫn không biết có trường này.
  // 29/10: thêm `dataFiles` (tên file của bộ dữ liệu quán — xem
  // e2e/unit/data-files.test.mjs). Danh sách này phải ĐẦY ĐỦ, không chỉ "có
  // chữ contract": nó là chỗ duy nhất một người đọc biết worker nhận gì.
  const types = doc('src', 'components', 'python-studio', 'runner', 'types.ts');
  assert.match(
    types,
    /\{ code, tests, forbid, files, dataFiles, stdin, packages, contract \}/,
  );
});

test('worker đọc contract từ thông điệp', () => {
  const src = doc('public', 'static', 'js', 'studio-lesson.worker.js');
  assert.match(
    src,
    /^\s*const contract = data\.contract/m,
    'studio-lesson.worker.js phải đọc data.contract',
  );
});

test('worker truyền contract vào _studio_main ở ĐÚNG vị trí tham số thứ 6', () => {
  // `_studio_main(source, cases_json, files_json, stdin_json, perf_json,
  // contract_json)`. Truyền thiếu một tham số là contract rơi vào chỗ của
  // perf_json: pha đo độ hiệu quả nhận một dict lạ, và hợp đồng thì mất —
  // không ngoại lệ nào được ném.
  const src = doc('public', 'static', 'js', 'studio-lesson.worker.js');
  // Lấy từ `grade(` tới dấu `)` ĐÓNG NGOÀI CÙNG, đếm ngoặc chứ không dùng
  // regex: bản đầu của ca này dùng `/grade\(([^;]*?)\)/` và nó dừng ở dấu đóng
  // của `JSON.stringify(contract)`, nên ca test ĐỎ trên một đoạn code đúng.
  const dau = src.indexOf('grade(');
  assert.notEqual(dau, -1, 'không tìm thấy lời gọi grade(...) trong worker');
  let sau = dau + 'grade('.length;
  let sau_ngoac = 1;
  while (sau < src.length && sau_ngoac > 0) {
    if (src[sau] === '(') sau_ngoac += 1;
    else if (src[sau] === ')') sau_ngoac -= 1;
    sau += 1;
  }
  assert.equal(sau_ngoac, 0, 'lời gọi grade(...) không đóng ngoặc');
  const doi = src.slice(dau + 'grade('.length, sau - 1);
  assert.match(doi, /JSON\.stringify\(stdin\)/, 'tham số 4 phải là stdin');
  assert.match(doi, /'null'/, "tham số 5 (perf_json) phải là 'null'");
  assert.match(doi, /JSON\.stringify\(contract\)/, 'tham số 6 phải là contract');
  // Thứ tự, không chỉ sự có mặt.
  assert.ok(
    doi.indexOf("'null'") < doi.indexOf('JSON.stringify(contract)'),
    'contract phải đứng SAU perf_json',
  );
});

test('harness khai contract_json và phân nhánh theo trường có mặt', () => {
  const py = readFileSync(
    join(FE, 'public', 'static', 'js', 'studio-harness.py'), 'utf8');
  assert.match(py, /def _studio_main\([^)]*contract_json/s,
    '_studio_main phải nhận contract_json');
  assert.match(py, /^\s*if 'call' in case:/m,
    "phân nhánh phải theo `'call' in case`, không theo một cờ riêng");
  assert.match(py, /_chay_ca_du_lieu\(studio, case, hop_dong or \{\}\)/,
    'nhánh dữ liệu phải gọi _chay_ca_du_lieu');
});

// ─────────────────────────────────────────────────── số đo, để không tụt mốc

test('bản dựng có 124 bài tập được chấm và 415 ca', () => {
  // Con số này phải đo lại mỗi lần đổi nguồn hoặc đổi cổng lọc, không được
  // đoán — xem AGENTS.md, dòng "204 ca test tưởng có mà không có".
  //
  // 377 -> 415 ngày 27/10/2026: pha 2 của check-practice.mjs tìm được 38 bài mà
  // một LỜI GIẢI TẦM THƯỜNG (khung trống, dội lại đầu vào, trả rỗng theo kiểu)
  // vẫn đạt một ca — người học chưa viết dòng nào đã thấy một ca xanh. Mỗi bài
  // đó nhận THÊM một ca mà lời giải tầm thường ấy trượt. Số bài vẫn 124: chỉ
  // thêm ca, không thêm bài.
  const ca = coBaiTap.reduce((s, b) => s + b.content_json.step_4.tests.length, 0);
  assert.equal(coBaiTap.length, 124, 'số bài có bài tập được chấm');
  assert.equal(ca, 415, 'tổng số ca chấm');
});

test('mọi bài tập được chấm đều có lời giải mẫu KHÁC khung đề', () => {
  // `check-practice.mjs` dùng lời giải mẫu làm thước đo: thiếu nó thì bài đó
  // không có gì chứng minh ca chấm của nó đúng. Trùng khung đề thì khung đề
  // đang chứa đáp án.
  for (const b of coBaiTap) {
    const s4 = b.content_json.step_4;
    assert.ok(s4.solutionCode?.trim(), `${b.lesson_code}: không có lời giải mẫu`);
    assert.notEqual(
      s4.solutionCode.trim(), (s4.starterCode ?? '').trim(),
      `${b.lesson_code}: lời giải mẫu trùng khung đề`,
    );
  }
});
