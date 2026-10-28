/**
 * BẢNG TỪNG BƯỚC của màn đọc (`ReadBlock.trace` + `StepTrace.tsx`).
 *
 * VÌ SAO TÍNH NĂNG NÀY TỒN TẠI. Nguyên văn chủ dự án: *"thay vì cho full cli
 * như này thì có thể làm một visualizations phân tích step by step … một dạng
 * python tracer trong lý thuyết cho người học dễ hiểu (không giống code
 * visualizer trên IDE)"*. Hôm nay màn đọc hiện khối code rồi một ô "KẾT QUẢ:"
 * với toàn bộ đầu ra — không thấy được gì xảy ra ở GIỮA.
 *
 * VÌ SAO CÓ CỔNG DỰ ĐOÁN, và vì sao nó là phần KHÔNG được bỏ cho gọn.
 * Hundhausen 2002 tổng hợp 24 thực nghiệm CÓ ĐỐI CHỨNG về trực quan hoá thuật
 * toán: chỉ 46% cho kết quả có ý nghĩa, 42% KHÔNG — và Gurka lặp lại thí
 * nghiệm nhưng BỎ điều kiện "dự đoán trước" thì lợi thế biến mất. Brod 2021
 * nói ra cơ chế: đoán sai → ngạc nhiên → chú ý dồn vào đáp án đúng. Nghĩa là
 * một cái bảng ai cũng cuộn qua là thứ ĐÃ ĐƯỢC CHỨNG MINH là ít tác dụng. Nên
 * nút "Mở bảng" chỉ bật khi người học đã gõ một câu trả lời, và khâu sinh BỎ
 * QUA (và đếm) mọi khối không ra được câu hỏi mà bảng trả lời được — thà không
 * có bảng còn hơn có một cái bảng không ai phải đoán gì.
 *
 * HAI NỬA ĐƯỢC CANH Ở ĐÂY, vì mỗi nửa hỏng theo một kiểu khác nhau:
 *
 *  · DỮ LIỆU. Vết sinh ở MỘT LẦN CHẠY KHÁC (`scripts/pe-da/gen_traces.py` →
 *    `traces.json`), trên CHƯƠNG TRÌNH ĐÃ NỐI của cả bài, rồi cắt theo khoảng
 *    dòng của từng đoạn. Lệch một dòng ở phép cắt đó là bảng của đoạn 2 nằm
 *    dưới đoạn 3 — và nó hỏng IM LẶNG: bảng vẫn mở, vẫn có số dòng, chỉ là số
 *    dòng của một đoạn khác.
 *  · GIAO DIỆN. Cổng dự đoán là MỘT dòng `disabled={!doan.trim()}`; gỡ nó ra
 *    thì mọi test về dữ liệu vẫn xanh và tính năng mất đúng phần có bằng chứng.
 *
 * ABLATION (đo ngày 29/10/2026) — gỡ từng mảnh rồi ĐẾM, không đoán.
 * Ở FILE NÀY (`node --test e2e/unit/read-trace.test.mjs`):
 *   bỏ `{block.trace ? <StepTrace …>}` khỏi ReadScreen     → 2 đỏ
 *   bỏ `disabled={!doan.trim()}` (cổng dự đoán)            → 1 đỏ
 *   dựng `{trace.predict.prompt}` trần thay cho paragraphs → 1 đỏ
 *   bỏ `.trace { animation: none }` trong reduced-motion   → 1 đỏ
 *   hạ font-size ô nhập về 14px (iOS tự phóng trang)       → 1 đỏ
 *   bỏ `overflow-x: auto` của bảng (hỏng ở 360px)          → 1 đỏ
 *   `khopDapAn` bóc luôn dấu nháy                          → 1 đỏ
 *   dựng lại dòng "Nguồn: …" ở ReadScreen                  → 1 đỏ
 *   build không phát vết nào (traces.json vắng)            → 2 đỏ ở đây,
 *                                                            và build.py return 1
 * Ở PHÍA DỰNG (`py scripts/pe-da/check.py --strict`), gỡ luật trong
 * gen_traces.py rồi dựng lại — đây là các số ĐÃ ĐO trên bản dựng thật:
 *   bỏ "đáp án không được có trong ô Kết quả" (câu `count`) → 3 lỗi
 *   bỏ "đáp án không gõ lại được thì bỏ khối"               → 9 lỗi
 *   bỏ hai luật chất lượng câu hỏi (đáp án lộ nguyên văn
 *   trong code, và chỉ đếm dòng THÂN vòng lặp)              → 46 lỗi
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { khopDapAn } from '../../src/lib/studio-lesson.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const doc = (...p) => readFileSync(join(ROOT, ...p), 'utf8').replace(/\r/g, '');

const SCREEN = doc('frontend', 'src', 'components', 'python-studio', 'screens', 'ReadScreen.tsx');
const TRACE = doc('frontend', 'src', 'components', 'python-studio', 'screens', 'StepTrace.tsx');
const CSS = doc('frontend', 'src', 'components', 'python-studio', 'studio-chrome.module.css');
const LIB = doc('frontend', 'src', 'lib', 'studio-lesson.ts');
const BUILD = doc('scripts', 'pe-da', 'build.py');
const CHECK = doc('scripts', 'pe-da', 'check.py');
// Bản ĐÃ BÓC CHÚ THÍCH: các phép "không được có X trong DOM" phải không đếm
// chữ trong chú thích — chú thích ở đây nói về `<img>` và về dòng "Nguồn:" đã
// bỏ, nên quét cả file thì chúng đỏ oan.
const bocChuThich = (s) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
const SCREEN_CODE = bocChuThich(SCREEN);
const TRACE_CODE = bocChuThich(TRACE);

const DA = JSON.parse(doc('scripts', 'pe-da', 'out', 'lessons.json')).lessons;

/** Mọi khối code CÓ VẾT của bản dựng. */
const coVet = DA.flatMap((b) =>
  (b.content_json.step_1?.read ?? []).flatMap((lat, man) =>
    lat.filter((k) => k.trace).map((k) => ({ ma: b.lesson_code, thu: b.sort_order, man, k })),
  ),
);

/** Một quy tắc CSS theo selector, trả phần thân trong {…}. */
function rule(selector) {
  const esc = selector.replace(/[.+*()[\]]/g, (ch) => `\\${ch}`);
  const m = CSS.match(new RegExp(`${esc}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `thiếu quy tắc CSS ${selector}`);
  return m[1];
}

// ───────────────────────────── hàm thuần

test('khopDapAn bỏ khoảng trắng nhưng KHÔNG bóc dấu nháy', () => {
  // Khoảng trắng trong `{'a': 1}` là quy ước IN của Python, không phải điều
  // bài hỏi — bắt gõ đúng từng dấu cách là chấm sai người đoán đúng.
  assert.equal(khopDapAn("{'a':1}", "{'a': 1}"), true);
  assert.equal(khopDapAn('  40 ', '40'), true);
  // Nhưng `2` và `'2'` là hai giá trị khác nhau, và phân biệt được chúng đúng
  // là một trong những thứ giáo trình này dạy. Bóc nháy hộ là dạy ngược.
  assert.equal(khopDapAn('2', "'2'"), false);
  assert.equal(khopDapAn("'An'", 'An'), false);
  // Chuỗi rỗng không bao giờ là một câu đoán.
  assert.equal(khopDapAn('', ''), false);
  assert.equal(khopDapAn('   ', ''), false);
});

// ───────────────────────────── dữ liệu build phát ra

test('bảng CÓ ĐƯỜNG TỚI người học, và KHÔNG có ở module 1', () => {
  // Lỗi hay gặp nhất của repo này không phải "làm sai" mà là "làm rồi không ai
  // nối": bộ ghi vết không bài nào tới, nút Try-it không màn nào mount, 13 màn
  // tối. Một trường khai trong ReadBlock mà build không bao giờ phát thì với
  // người học nó không tồn tại.
  assert.ok(coVet.length >= 50, `chỉ ${coVet.length} khối có bảng từng bước`);
  // Module 1 = 18 bài đầu. Quyết định đã chốt: ở đó code còn là `print(2 + 3)`
  // nên bảng không nói thêm gì, mà lại dạy người học bỏ qua cái nút đúng lúc
  // nó chưa đáng bấm.
  const m1 = coVet.filter((x) => x.thu <= 18);
  assert.equal(m1.length, 0, `module 1 có bảng ở ${m1.map((x) => x.ma)}`);
});

test('mọi dòng bảng trỏ vào một dòng CÓ THẬT, KHÔNG RỖNG của chính khối', () => {
  // Đây là luật bắt phép CẮT VẾT lệch đoạn. Vết được sinh trên chương trình đã
  // nối của cả bài rồi cắt theo khoảng dòng của từng đoạn; lệch một dòng là
  // bảng của đoạn 2 nằm dưới đoạn 3, và không ngoại lệ nào được ném.
  for (const { ma, k } of coVet) {
    const dong = k.code.split('\n');
    for (const h of k.trace.rows) {
      assert.ok(
        Number.isInteger(h.line) && h.line >= 1 && h.line <= dong.length,
        `${ma}: bảng trỏ vào dòng ${h.line} nhưng khối có ${dong.length} dòng`,
      );
      assert.ok(dong[h.line - 1].trim(), `${ma}: bảng nói dòng ${h.line} chạy nhưng nó RỖNG`);
    }
  }
});

test('mỗi bảng có câu dự đoán, và BẢNG trả lời được câu đó', () => {
  for (const { ma, k } of coVet) {
    const d = k.trace.predict;
    assert.ok(d?.prompt?.trim(), `${ma}: bảng không có câu dự đoán`);
    assert.ok(String(d.answer ?? '').trim(), `${ma}: câu dự đoán không có đáp án`);
    // Backtick phải đi theo CẶP — `withInlineCode` chỉ bóc được cặp, một dấu
    // lẻ hiện ra nguyên văn trước mặt người học (lỗi ô tổng kết 27/10).
    assert.equal((d.prompt.match(/`/g) ?? []).length % 2, 0, `${ma}: backtick lẻ`);
    if (d.kind === 'final' || d.kind === 'mid') {
      const hien = k.trace.rows.some((h) => (h.set ?? []).some(([t]) => t === d.var));
      assert.ok(hien, `${ma}: hỏi về \`${d.var}\` nhưng không dòng nào hiện biến đó`);
    } else if (d.kind === 'count') {
      const lan = k.trace.rows.filter((h) => h.line === d.line && !h.fn).length;
      assert.equal(String(lan), String(d.answer), `${ma}: số lần chạy không khớp bảng`);
    } else {
      assert.fail(`${ma}: loại câu hỏi lạ ${d.kind}`);
    }
  }
});

test('đáp án KHÔNG nằm sẵn trong ô "Kết quả:" ngay phía trên', () => {
  // Nếu đáp án đã in sẵn trên màn hình thì "dự đoán" chỉ là chép lại, và đúng
  // cơ chế (đoán → ngạc nhiên → chú ý) mà bước này tồn tại để kích hoạt sẽ
  // không chạy lần nào. Đây là luật phân biệt một cổng dự đoán THẬT với một
  // cổng chỉ để trông có vẻ.
  const gon = (t) => String(t ?? '').replace(/\s+/g, '');
  for (const { ma, k } of coVet) {
    const kq = gon(k.expected);
    const da = gon(k.trace.predict.answer);
    assert.ok(!(da && kq.includes(da)), `${ma}: đáp án "${k.trace.predict.answer}" đã có trong Kết quả`);
  }
});

test('bảng có cỡ đọc được: ≥ 3 dòng, ≤ 42 dòng, chỗ bỏ hợp lệ', () => {
  for (const { ma, k } of coVet) {
    const n = k.trace.rows.length;
    assert.ok(n >= 3, `${ma}: bảng ${n} dòng — ít thế thì không có gì để xem`);
    assert.ok(n <= 42, `${ma}: bảng ${n} dòng — không ai đọc hết`);
    if (k.trace.elided) {
      // Cắt GIỮA, giữ cả hai đầu: đáp án của câu dự đoán nằm ở đầu cuối.
      assert.ok(k.trace.elidedAt > 0 && k.trace.elidedAt < n, `${ma}: elidedAt ngoài bảng`);
    }
  }
});

// ───────────────────────────── giao diện

test('ReadScreen dựng StepTrace cho khối có vết', () => {
  assert.match(SCREEN, /import StepTrace from '\.\/StepTrace'/);
  assert.match(SCREEN_CODE, /block\.trace \? <StepTrace trace=\{block\.trace\} code=\{block\.code\}/);
});

test('CỔNG DỰ ĐOÁN: không gõ gì thì không mở được bảng', () => {
  // Một dòng, và nó là toàn bộ phần có bằng chứng của tính năng này. Gỡ nó ra
  // thì mọi ca về dữ liệu vẫn xanh.
  assert.match(TRACE_CODE, /disabled=\{!doan\.trim\(\)\}/);
  // Và bảng chỉ dựng SAU khi đã nộp: `daNop === null` là nhánh cổng.
  assert.match(TRACE_CODE, /daNop === null \?/);
});

test('bảng là CHỮ THẬT: <table> thật, không <img>, không <canvas>', () => {
  // Cùng lý do khối `diagram` tồn tại: chữ trong ảnh thì SCALE, chữ của trang
  // thì REFLOW — ba trên bốn người thử báo "chữ trong sơ đồ quá nhỏ", và CSS
  // không với tới pixel trong ảnh.
  assert.ok(!/<img|<canvas|<svg/.test(TRACE_CODE), 'bảng dựng bằng ảnh/canvas/svg');
  assert.match(TRACE_CODE, /<table>/);
  // <th scope> và <caption>: trình đọc màn hình đọc được tên cột khi nhảy ô,
  // và biết cái bảng này nói về gì mà không cần đọc hết.
  assert.match(TRACE_CODE, /<th scope="col">/);
  assert.match(TRACE_CODE, /<th scope="row">/);
  assert.match(TRACE_CODE, /<caption>/);
});

test('câu hỏi đi qua withInlineCode — backtick không lọt ra', () => {
  // `prompt` là "Sau khi chạy xong, `total` bằng mấy?" — có backtick. Dựng
  // trần là in ra nguyên hai dấu nháy ngược, đúng lỗi người thử gửi ảnh ngày
  // 27/10 ở ô tổng kết.
  assert.ok(TRACE_CODE.includes('paragraphs(trace.predict.prompt)'), 'thiếu paragraphs()');
  assert.ok(!TRACE_CODE.includes('{trace.predict.prompt}'), 'prompt dựng trần');
});

test('360px: bảng cuộn ngang, ô nhập không làm iOS tự phóng trang', () => {
  // Ba cột với một cột mã `white-space: pre` thì ở 360px không có cách nào vừa
  // mà vẫn giữ được THỤT LỀ — mà thụt lề chính là thứ nói ra "dòng này nằm
  // trong vòng lặp". Cuộn ngang giữ được cả hai.
  assert.match(rule('.traceTable'), /overflow-x:\s*auto/);
  assert.match(rule('.tracePredictLine'), /flex-wrap:\s*wrap/);
  // iOS Safari tự phóng cả trang khi focus vào input có font-size < 16px, và
  // lúc đó người học mất chỗ đang đọc.
  const px = Number(rule('.tracePredictInput').match(/font-size:\s*(\d+)px/)?.[1]);
  assert.ok(px >= 16, `ô nhập có font-size ${px}px — iOS sẽ phóng trang`);
});

test('tôn trọng prefers-reduced-motion: TẮT HẲN, không "chậm hơn"', () => {
  // File có NHIỀU khối reduced-motion (màn khác cũng có chuyển động), nên phải
  // quét HẾT rồi tìm khối nói về `.trace` — lấy khối đầu tiên là ca này đỏ oan.
  const khoi = [...CSS.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)];
  assert.ok(khoi.length, 'không có khối @media prefers-reduced-motion nào');
  assert.ok(
    khoi.some((m) => /\.trace\s*\{[^}]*animation:\s*none/.test(m[1])),
    'không tắt animation của .trace',
  );
});

// ───────────────────────────── dọn: dòng "Nguồn: …"

test('màn đọc KHÔNG còn in dòng "Nguồn: …", nhưng dữ liệu vẫn còn', () => {
  // Chủ dự án: "không cần ghi nguồn". Bỏ phần DỰNG RA, giữ dữ liệu — `slides`
  // còn trong bản dựng nên bật lại chỉ là một khối JSX, và check.py vẫn cảnh
  // báo khi một bài mất nó.
  assert.ok(!SCREEN_CODE.includes('Nguồn:'), 'ReadScreen còn dựng dòng Nguồn');
  assert.ok(!SCREEN_CODE.includes('readSource'), 'ReadScreen còn dùng .readSource');
  assert.ok(!/^\.readSource\s*\{/m.test(CSS), 'CSS còn quy tắc .readSource mồ côi');
  const coSlides = DA.filter((b) => b.content_json.source?.slides).length;
  assert.ok(coSlides > 150, `chỉ ${coSlides}/172 bài còn source.slides — dữ liệu đã bị xoá`);
});

// ───────────────────────────── bốn chỗ phải đổi cùng lúc

test('cả BỐN chỗ biết về `trace`', () => {
  // Cùng luật với "SÁU loại khối, BỐN chỗ phải đổi cùng lúc" của AGENTS.md.
  // Bỏ sót một chỗ thì hoặc trang trắng (renderer), hoặc vết trôi vào DB mà
  // không ai chặn (check.py).
  assert.match(LIB, /trace\?: ReadTrace/);
  assert.match(LIB, /export type ReadTrace = \{/);
  assert.match(SCREEN, /<StepTrace /);
  assert.match(BUILD, /def vet_cua_bai\(/);
  assert.match(CHECK, /def kiem_vet\(/);
});

test('build.py ĐỎ khi số vết phát ra không khớp số khối đủ điều kiện', () => {
  // Cổng chống "built but unreachable": vết sinh ở một lần chạy khác và commit
  // vào traces.json, nên nó có thể cũ, mồ côi, hoặc lệch chỉ số — và cả ba
  // đều hỏng im lặng.
  assert.match(BUILD, /if loi_vet or vet_phat != vet_co or vet_co \+ vet_bo != vet_can:/);
  assert.match(BUILD, /vet_phat != vet_co[\s\S]{0,900}return 1/);
  // Và hash: nguồn sửa code sau khi sinh vết là lệch NGUY HIỂM NHẤT, vì bảng
  // vẫn mở ra, vẫn đẹp, và dạy một đoạn code không còn tồn tại.
  assert.match(BUILD, /codeHash/);
});
