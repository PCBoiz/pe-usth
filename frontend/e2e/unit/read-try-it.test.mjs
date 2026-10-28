/**
 * Nút "Thử ngay trong IDE" dưới khối code của MÀN ĐỌC — kiểu "Try it Yourself"
 * của W3Schools.
 *
 * Vì sao bộ test này tồn tại. Nút đã được dựng từ trước (`TryItButton`, và
 * `ideCodeHref` bàn giao mã qua `/ide#code=…`), nhưng nó chỉ được MOUNT ở màn
 * `brief` và màn `explain` — mà bộ 172 bài đang xuất bản có **0/172** màn nào
 * trong hai màn đó. Nên trong suốt thời gian khoá này chạy, không một người học
 * nào thấy nút, và `ide-brief-code.test.mjs` vẫn xanh vì nó test đúng cái cổng
 * đó trên dữ liệu pe-v4 (khoá đã ẩn). Một tính năng có nút, có cổng, có test,
 * và không có đường đi tới người dùng.
 *
 * Hai thứ ở đây dễ làm sai mà trông như xong, nên mỗi thứ có ca riêng:
 *
 *  1. **Mã bàn giao là TIỀN TỐ, không phải một khối.** Nguồn viết các đoạn
 *     trong một bài để chạy NỐI TIẾP nhau — đoạn 3 dùng `df` và `import pandas`
 *     của đoạn 1. Bàn giao một mình đoạn 3 là mở một tab mới rồi để người học
 *     đọc `NameError: name 'df' is not defined`, tức đúng cái nút này ra đời để
 *     tránh. Và tiền tố phải vắt qua được RANH GIỚI MÀN: `step_1.read` đã chia
 *     sẵn thành màn ở khâu build, nên đoạn 1 thường nằm ở màn trước.
 *
 *  2. **Cờ `tryIt` do khâu BUILD phát, không do frontend đoán.** `chayDuocTrongIde`
 *     trong ide-brief-code.ts là một regex trên dòng `import` và nó bắt đúng các
 *     giới hạn WASM (tkinter/threading/subprocess) — nhưng thứ chặn bài của khoá
 *     Data Analyst là THIẾU WHEEL (seaborn, plotly, openpyxl, h5py, sqlalchemy,
 *     ipywidgets), là gói ẩn sau chuỗi (`engine="openpyxl"`), và là thuộc tính
 *     phơi ra máy thật (`sys.executable`). Chỉ `build.py` biết cả ba, nên phép
 *     phân loại nằm ở đó và frontend chỉ đọc cờ.
 *
 * Phép nối phải khớp TỪNG KÝ TỰ ở ba chỗ: `maDeThu` (ở đây), `noi_code()` trong
 * scripts/pe-da/build.py, và `_noi_nhu_build()` trong scripts/pe-da/check.py.
 * Ca "khối tryIt cuối == step_4.starterCode" khoá đúng chỗ đó từ phía frontend,
 * còn check.py khoá nó từ phía build.
 *
 * Bằng chứng bộ test này bắt được lỗi thật (quy ước AGENTS.md: gỡ bản sửa ra,
 * test phải trượt) — đã gỡ bốn mảnh và ĐẾM, không đoán:
 *   · không vắt qua ranh giới màn (vòng ngoài chỉ chạy `i = lat`)   → 3 ca đỏ;
 *   · bỏ các khối TRƯỚC trong cùng màn (vòng trong chỉ lấy `j = den`) → 4 ca đỏ;
 *   · bỏ phép lọc `b.tryIt` (bàn giao cả đoạn KHÔNG chạy được)      → 4 ca đỏ;
 *   · bỏ mốc `# ── Đoạn i ──` khi nhiều đoạn                        → 3 ca đỏ.
 *
 * Phía build thì ablation ghi trong cùng commit: không phát cờ → 145 lỗi
 * check.py; lệch bản đồ `id()` → 7 lỗi; cho cờ lên cả khối `terminal` → 88 lỗi.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MAX_IDE_CODE_CHARS } from '../../src/lib/ide-handoff.ts';
import { maDeThu } from '../../src/lib/studio-lesson.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const DUNG = join(FE, '..', 'scripts', 'pe-da', 'out', 'lessons.json');

const MOC = '# ── Đoạn ';

/** Khối code cho fixture — `tryIt` chỉ được phát khi ĐÚNG, nên nó là `true` hoặc vắng. */
const code = (c, thu) => (thu ? { type: 'code', code: c, tryIt: true } : { type: 'code', code: c });
const van = (t) => ({ type: 'paragraph', text: t });

// ---------------------------------------------------------------------------
// Phần 1 — `maDeThu` là hàm thuần, test trên fixture nhỏ để từng luật một mình
// bị nhìn thấy. (Phần 2 mới đối chiếu bản dựng thật.)
// ---------------------------------------------------------------------------

test('maDeThu: không có khối nào chạy được → null, không phải chuỗi rỗng', () => {
  const read = [[van('a'), code('import seaborn')]];
  assert.equal(maDeThu(read, 0, 1), null);
});

test('maDeThu: read rỗng hoặc undefined → null', () => {
  assert.equal(maDeThu(undefined, 0, 0), null);
  assert.equal(maDeThu([], 0, 0), null);
  assert.equal(maDeThu([[]], 0, 0), null);
});

test('maDeThu: một đoạn duy nhất thì KHÔNG chèn mốc "Đoạn 1"', () => {
  const read = [[code('print(1)', true)]];
  const ra = maDeThu(read, 0, 0);
  assert.equal(ra, 'print(1)\n');
  assert.ok(!ra.includes(MOC), 'một đoạn mà có mốc thì người học tưởng bài có nhiều phần');
});

test('maDeThu: nhiều đoạn thì chèn mốc, đánh số từ 1', () => {
  const read = [[code('a = 1', true), code('print(a)', true)]];
  assert.equal(maDeThu(read, 0, 1), '# ── Đoạn 1 ──\na = 1\n\n# ── Đoạn 2 ──\nprint(a)\n');
});

test('maDeThu: TIỀN TỐ — bấm ở đoạn 2 thì mã gồm cả đoạn 1 (bẫy NameError)', () => {
  const read = [[code('import pandas as pd\ndf = pd.DataFrame()', true), code('print(df)', true)]];
  const ra = maDeThu(read, 0, 1);
  assert.ok(ra.includes('import pandas'), 'thiếu import của đoạn trước → ModuleNotFoundError');
  assert.ok(ra.includes('df = pd.DataFrame()'), 'thiếu phép gán của đoạn trước → NameError');
  assert.ok(ra.includes('print(df)'));
});

test('maDeThu: tiền tố vắt QUA ranh giới màn — đoạn của màn trước vẫn được gộp', () => {
  const read = [
    [van('dẫn chuyện'), code('x = 10', true)],
    [van('giải thích'), code('print(x)', true)],
  ];
  const ra = maDeThu(read, 1, 1);
  assert.ok(ra.includes('x = 10'), 'build đã chia bài thành màn; tiền tố phải đi qua được');
  assert.ok(ra.includes('print(x)'));
});

test('maDeThu: KHÔNG lấy đoạn đứng SAU khối được bấm trong cùng màn', () => {
  const read = [[code('a = 1', true), code('b = 2', true)]];
  const ra = maDeThu(read, 0, 0);
  assert.equal(ra, 'a = 1\n');
  assert.ok(!ra.includes('b = 2'), 'bấm ở đoạn 1 mà nhận cả đoạn 2 là lộ phần chưa đọc');
});

test('maDeThu: KHÔNG lấy đoạn của màn SAU', () => {
  const read = [[code('a = 1', true)], [code('b = 2', true)]];
  assert.ok(!(maDeThu(read, 0, 0) ?? '').includes('b = 2'));
});

test('maDeThu: bỏ qua khối code KHÔNG có cờ — đoạn không chạy được thì không bàn giao', () => {
  const read = [[code('import plotly.express as px'), code('print(1)', true)]];
  const ra = maDeThu(read, 0, 1);
  assert.equal(ra, 'print(1)\n');
  assert.ok(!ra.includes('plotly'), 'bàn giao đoạn thiếu wheel = mở IDE rồi ném ModuleNotFoundError');
});

test('maDeThu: bỏ qua khối terminal dù nó cũng có trường `code`', () => {
  const read = [[{ type: 'terminal', code: 'py -m venv .venv' }, code('print(1)', true)]];
  const ra = maDeThu(read, 0, 1);
  assert.ok(!ra.includes('venv'), 'lệnh shell vào sandbox Python là SyntaxError');
});

test('maDeThu: cắt khoảng trắng cuối mỗi đoạn, luôn kết bằng đúng một \\n', () => {
  const read = [[code('print(1)\n\n\n', true)]];
  assert.equal(maDeThu(read, 0, 0), 'print(1)\n');
});

test('maDeThu: chỉ số khối vượt mảng thì không nổ', () => {
  const read = [[code('print(1)', true)]];
  assert.equal(maDeThu(read, 0, 99), 'print(1)\n');
  assert.equal(maDeThu(read, 99, 0), 'print(1)\n');
});

// ---------------------------------------------------------------------------
// Phần 2 — đối chiếu BẢN DỰNG THẬT. Fixture tự bịa không chứng minh được rằng
// build.py phát cờ đúng chỗ; đây là nơi duy nhất nói được điều đó từ phía
// frontend. (Bẫy fixture đã ghi trong AGENTS.md: `quizzes.service.spec.ts` từng
// khẳng định "không bao giờ lộ đáp án" trên một hình dạng dữ liệu không tồn tại.)
// ---------------------------------------------------------------------------

const coDung = existsSync(DUNG);
const bai = coDung ? JSON.parse(readFileSync(DUNG, 'utf8')).lessons : [];
const boQua = { skip: coDung ? false : 'chưa dựng — chạy `py scripts/pe-da/build.py`' };

const khoiCua = (b) => b.content_json?.step_1?.read ?? [];

test('bản dựng: `tryIt` chỉ nằm trên khối `code`', boQua, () => {
  const sai = [];
  for (const b of bai) {
    khoiCua(b).forEach((lat, i) => lat.forEach((k) => {
      if ('tryIt' in k && k.type !== 'code') sai.push(`${b.lesson_code} màn ${i}: ${k.type}`);
    }));
  }
  assert.deepEqual(sai, []);
});

test('bản dựng: KHÔNG bài nào phát `tryIt: false`', boQua, () => {
  // Renderer đọc bằng `block.tryIt ?` nên false và vắng mặt là một — phát false
  // chỉ làm content_json nặng thêm mà không đổi gì.
  const sai = [];
  for (const b of bai) {
    for (const lat of khoiCua(b)) {
      for (const k of lat) if ('tryIt' in k && k.tryIt !== true) sai.push(b.lesson_code);
    }
  }
  assert.deepEqual(sai, []);
});

test('bản dựng: 408 nút trên 146 bài — khớp số đoạn check-pyodide.mjs chạy thật', boQua, () => {
  // 408 KHÔNG phải một con số tự chọn: đó đúng là số đoạn mà
  // `node scripts/pe-da/check-pyodide.mjs` chạy trong Pyodide rồi so với
  // `expected` của bài (mốc trong AGENTS.md: "146 bài, 408 đoạn code, 0 hỏng").
  //
  // 29/10/2026: 406/145 -> 408/146. Hai đoạn mới đến từ SY11 và SY12, nơi bản
  // văn mới viết lại hai khối mã GIẢ (dán `# grades.py` và `# main.py` vào cùng
  // một khối) thành Python chạy được thật. Xem chú thích ở studio-lesson.test.mjs.
  // Nghĩa là mọi nút ở đây trỏ vào đoạn mã ĐÃ được chứng minh chạy được và in
  // ra đúng cái bài nói nó in ra. Hai con số lệch nhau = nút trỏ vào đoạn chưa
  // ai chạy thử.
  let nut = 0;
  const coNut = new Set();
  for (const b of bai) {
    for (const lat of khoiCua(b)) {
      for (const k of lat) if (k.tryIt) { nut += 1; coNut.add(b.lesson_code); }
    }
  }
  assert.equal(nut, 408);
  assert.equal(coNut.size, 146);
});

test('bản dựng: bài phải chạy trên máy thì KHÔNG có nút nào', boQua, () => {
  const sai = bai
    .filter((b) => b._mode === 'local')
    .filter((b) => khoiCua(b).some((lat) => lat.some((k) => k.tryIt)))
    .map((b) => b.lesson_code);
  assert.deepEqual(sai, []);
});

test('bản dựng: tiền tố ĐẦY ĐỦ khớp step_4.starterCode của ô chạy thử', boQua, () => {
  // `starterCode` của ô chạy thử CHÍNH LÀ `noi_code(chay_duoc)` trong build.py,
  // nên nối tới khối tryIt CUỐI phải ra đúng nó. Đây là phép so hai bộ nối viết
  // bằng hai ngôn ngữ khác nhau.
  //
  // Bỏ bài có BÀI TẬP ĐƯỢC CHẤM: `starterCode` của chúng là KHUNG TRỐNG của bài
  // tập, không phải mã bài đọc. (Lẫn hai thứ này cho đúng 122 lỗi sai — đã gặp.)
  const sai = [];
  let daSo = 0;
  for (const b of bai) {
    const bon = b.content_json?.step_4 ?? {};
    if (bon.tests || !bon.starterCode) continue;
    const read = khoiCua(b);
    let cuoi = null;
    read.forEach((lat, i) => lat.forEach((k, j) => { if (k.tryIt) cuoi = [i, j]; }));
    if (!cuoi) continue;
    daSo += 1;
    if (maDeThu(read, cuoi[0], cuoi[1]) !== bon.starterCode) sai.push(b.lesson_code);
  }
  assert.deepEqual(sai, []);
  assert.ok(daSo > 0, 'không bài nào so được thì ca này không chứng minh gì');
});

test('bản dựng: mọi mã bàn giao nằm trong trần của /ide — nút không được biến mất im lặng', boQua, () => {
  // `ideCodeHref` trả null khi mã dài quá `MAX_IDE_CODE_CHARS`, và `TryItButton`
  // thấy null thì không render gì. Đó là cách hỏng ĐÚNG (thà thiếu nút còn hơn
  // một link chết), nhưng nó im lặng — nên phải biết có bài nào chạm trần.
  const vuot = [];
  for (const b of bai) {
    const read = khoiCua(b);
    read.forEach((lat, i) => lat.forEach((k, j) => {
      if (!k.tryIt) return;
      const ma = maDeThu(read, i, j);
      if (ma && ma.length > MAX_IDE_CODE_CHARS) vuot.push(`${b.lesson_code} ${ma.length}`);
    }));
  }
  assert.deepEqual(vuot, []);
});

// ---------------------------------------------------------------------------
// Phần 3 — DÂY NỐI. Hai ca trên đã chứng minh dữ liệu đúng và hàm đúng; nhưng
// chính thứ đã hỏng suốt thời gian qua là KHÔNG CÓ AI GỌI. Nên phải canh cả
// chỗ gọi, không chỉ hàm.
// ---------------------------------------------------------------------------

test('ReadScreen thực sự dựng nút: có import TryItButton và có gọi maDeThu', () => {
  const src = readFileSync(
    join(FE, 'src', 'components', 'python-studio', 'screens', 'ReadScreen.tsx'),
    'utf8',
  );
  assert.ok(src.includes('TryItButton'), 'màn đọc không mount nút thì 172 bài không có đường tới /ide');
  assert.ok(src.includes('maDeThu('), 'không gọi maDeThu nghĩa là bàn giao một khối lẻ, không phải tiền tố');
  assert.ok(src.includes('block.tryIt'), 'không đọc cờ nghĩa là dựng nút cả cho đoạn không chạy được');
});

test('nhãn nút nói ra khi mã bàn giao gồm cả các đoạn TRƯỚC', () => {
  // Bấm "Thử ngay trong IDE" dưới đoạn 3 rồi thấy trong editor có cả đoạn 1 và
  // 2 là một bất ngờ không cần thiết — nhất là khi người học đang muốn thử
  // đúng một dòng. Nhãn phải khác nhau, và dấu hiệu phân biệt là chính cái mốc
  // mà `maDeThu` chèn.
  //
  // (`rel="noopener"` của TryItButton KHÔNG kiểm lại ở đây: đã có ca riêng
  // trong ide-stop-autosave.test.mjs bóc đúng giá trị thuộc tính, mà kiểm bằng
  // `includes('noreferrer')` trên cả file thì khớp luôn chữ trong chú thích —
  // đã bị đúng dương tính giả đó.)
  const src = readFileSync(
    join(FE, 'src', 'components', 'python-studio', 'screens', 'ReadScreen.tsx'),
    'utf8',
  );
  assert.ok(src.includes(MOC), 'ReadScreen phải nhận ra mốc "# ── Đoạn " để đổi nhãn');
  assert.equal(maDeThu([[code('a=1', true)]], 0, 0)?.includes(MOC), false);
  assert.equal(
    maDeThu([[code('a=1', true), code('print(a)', true)]], 0, 1)?.includes(MOC),
    true,
  );
});
