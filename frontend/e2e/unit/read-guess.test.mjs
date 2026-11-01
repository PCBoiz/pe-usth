/**
 * CỔNG DỰ ĐOÁN OUTPUT ở màn đọc (`doanDuocOutput` + `CongDuDoan` trong
 * ReadScreen.tsx).
 *
 * VÌ SAO TÍNH NĂNG NÀY TỒN TẠI — số đo, không phải cảm giác. Đếm trên bản dựng
 * 179 bài: **508 khối code ở màn đọc, cả 508 đều in sẵn `expected` ngay dưới
 * code**, và chỉ 56 khối có bảng từng bước. Tức 4/5 khối code của khoá không
 * đòi người học nghĩ gì trước khi thấy đáp án, và 51/179 bài có 4 màn đọc liền
 * nhau trước câu hỏi đầu tiên. Người thử ngày 1/11/2026: *"Nên đặt trọng tâm
 * vào practice"*, kèm ảnh một màn ĐỌC dày chữ.
 *
 * Bằng chứng thì CÙNG MỘT BỘ với `StepTrace` và nút "Xem đáp án" của
 * `PracticeScreen`: Hundhausen 2002 tổng hợp 24 thực nghiệm có đối chứng — chỉ
 * 46% cho kết quả có ý nghĩa, 42% KHÔNG, và Gurka lặp lại thí nghiệm nhưng BỎ
 * điều kiện "dự đoán trước" thì lợi thế BIẾN MẤT. Brod 2021 nói ra cơ chế:
 * đoán sai → ngạc nhiên → chú ý dồn vào đáp án đúng.
 *
 * HAI NỬA ĐƯỢC CANH Ở ĐÂY, vì mỗi nửa hỏng theo một kiểu khác nhau:
 *
 *  · PHÉP CHỌN KHỐI (`doanDuocOutput`, hàm thuần ở lib). Nó chạy trên DỮ LIỆU,
 *    mà dữ liệu đổi không cần biên dịch lại — một lỗi trong nó làm cổng BIẾN
 *    MẤT im lặng ở toàn khoá, và bộ test giao diện vẫn xanh. Đó đúng là hình
 *    dạng lỗi thống trị của repo này ("dựng xong mà không có đường tới người
 *    dùng", đã TÁM lần). Nên ca đầu tiên dưới đây ĐẾM trên bản dựng thật, và
 *    ngưỡng trả về 0 là ĐỎ ngay.
 *  · GIAO DIỆN. Cổng là MỘT dòng `disabled={!doan.trim()}` cộng một nhánh
 *    "chưa nộp → form". Gỡ nó ra thì mọi ca đếm vẫn xanh và tính năng mất đúng
 *    phần có bằng chứng.
 *
 * NGƯỠNG ĐÃ ĐO (bản dựng 179 bài, sau cả năm phép loại):
 *   ≤1 dòng / ≤24 ký tự →  99 khối /  58 bài · module 1:  8
 *   ≤2 dòng / ≤40 ký tự → 262 khối / 127 bài · module 1: 31   ← đang dùng
 *   ≤3 dòng / ≤80 ký tự → 322 khối / 137 bài · module 1: 44
 *
 * ABLATION — gỡ từng mảnh rồi ĐẾM (`node --test e2e/unit/read-guess.test.mjs`):
 *   bỏ phép loại khối có `trace`                   → 1 đỏ
 *   bỏ phép loại khối vẽ hình                      → 2 đỏ
 *   bỏ phép loại "đáp án nguyên văn trong code"    → 1 đỏ
 *   bỏ trần số dòng / số ký tự                     → 2 đỏ
 *   `doanDuocOutput` trả false cho mọi khối        → 4 đỏ
 *   bỏ `<CongDuDoan>` khỏi ReadScreen              → 2 đỏ
 *   bỏ `disabled={!doan.trim()}`                   → 1 đỏ
 *   không dựng <KetQua> ở nhánh ĐÃ NỘP (giấu
 *   output của người đoán sai)                     → 1 đỏ
 *   cất câu đã nộp trong useState thay vì draft    → 2 đỏ
 *   khoá nháp bỏ chỉ số màn (chỉ `${i}`)           → 1 đỏ
 *   thêm animation lúc mở đáp án                   → 1 đỏ
 *   verdict ghi "Sai" thay cho "Chưa khớp"         → 1 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DOAN_OUTPUT_MAX_DONG,
  DOAN_OUTPUT_MAX_KY_TU,
  doanDuocOutput,
  initialLessonDraft,
  khopDapAn,
} from '../../src/lib/studio-lesson.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const doc = (...p) => readFileSync(join(ROOT, ...p), 'utf8').replace(/\r/g, '');

const SCREEN = doc('frontend', 'src', 'components', 'python-studio', 'screens', 'ReadScreen.tsx');
const CSS = doc('frontend', 'src', 'components', 'python-studio', 'studio-chrome.module.css');
const LIB = doc('frontend', 'src', 'lib', 'studio-lesson.ts');

// Bản ĐÃ BÓC CHÚ THÍCH. Mọi phép "không được có X" phải không đếm chữ trong
// chú thích: chú thích ở đây NÓI VỀ animation và về chữ "sai", nên quét cả file
// thì chúng đỏ oan. Cùng khuôn `bocChuThich` của read-trace/read-diagram.
const bocChuThich = (s) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
const SCREEN_CODE = bocChuThich(SCREEN);

const DA = JSON.parse(doc('scripts', 'pe-da', 'out', 'lessons.json')).lessons;

/** Mọi khối của màn đọc trên bản dựng thật, kèm bài / màn / vị trí. */
const KHOI = DA.flatMap((b) =>
  (b.content_json.step_1?.read ?? []).flatMap((lat, man) =>
    lat.map((k, i) => ({
      ma: b.lesson_code,
      module: String(b.module).slice(0, 3).trim(),
      man,
      i,
      k,
      // Khối ngay SAU nó — dùng để kiểm phép loại khối vẽ hình bằng một dấu
      // hiệu ĐỘC LẬP với regex của chính `doanDuocOutput`.
      sau: lat[i + 1],
    })),
  ),
);
const CODE = KHOI.filter((x) => x.k.type === 'code');
const DU_DIEU_KIEN = CODE.filter((x) => doanDuocOutput(x.k));

const gon = (s) => s.replace(/\s+/g, '');

// ───────────────────────────── HÀNG RÀO "dựng rồi không ai tới"

test('bản dựng thật: cổng phủ được một phần ĐÁNG KỂ số khối code, và không bao giờ 0', () => {
  // Con số đo ngày 1/11/2026: 508 khối code → 262 khối đủ điều kiện ở 127 bài.
  // Đây là ca duy nhất biết được "hàm lọc đã hỏng": một `return false` lạc chỗ
  // làm tính năng biến mất với toàn bộ 179 bài mà không ca giao diện nào đỏ.
  assert.equal(CODE.length, 508, 'số khối code của bản dựng đã đổi — đo lại các số dưới');
  assert.ok(DU_DIEU_KIEN.length > 0, 'KHÔNG khối nào đủ điều kiện — cổng không tới được ai');
  // SÀN, chỉ được nâng. Không ghim đúng 262: thêm một module là đổi con số
  // (module 11 đã làm đỏ 14 ca ghi cứng kiểu đó), nhưng tụt xuống dưới 200 thì
  // phải là một quyết định có người đọc, không phải một tác dụng phụ.
  assert.ok(
    DU_DIEU_KIEN.length >= 200,
    `chỉ còn ${DU_DIEU_KIEN.length} khối đủ điều kiện (sàn 200) — phép lọc đã siết lại?`,
  );
  const bai = new Set(DU_DIEU_KIEN.map((x) => x.ma));
  assert.ok(bai.size >= 110, `chỉ ${bai.size} bài có cổng (sàn 110)`);
});

test('module 1 ĐƯỢC phủ — đó là chỗ bảng từng bước CỐ Ý không có', () => {
  // Bảng từng bước bỏ hẳn module 1 (quyết định đã chốt: ở đó code còn là
  // `print(2 + 3)`, một cái bảng 3 dòng không nói thêm gì mà lại dạy người học
  // bỏ qua cái nút đúng lúc nó chưa đáng bấm). Nhưng "in ra gì" thì ở module 1
  // lại là CÂU HỎI ĐÚNG nhất của cả khoá — đó là toàn bộ việc người mới đang
  // học. Nên nếu phép lọc này cũng trống module 1 thì nó đang bỏ đúng chỗ nó
  // đáng có mặt nhất.
  const m1 = DU_DIEU_KIEN.filter((x) => x.module === 'M1');
  assert.ok(m1.length >= 20, `module 1 chỉ có ${m1.length} khối có cổng (sàn 20)`);
  const vet = KHOI.filter((x) => x.k.trace && x.module === 'M1');
  assert.equal(vet.length, 0, 'module 1 nay có vết — đọc lại quyết định ở gen_traces.py');
});

// ───────────────────────────── NĂM PHÉP LOẠI

test('khối đã có bảng từng bước thì KHÔNG có cổng — không hỏi hai câu dự đoán một khối', () => {
  const coVet = CODE.filter((x) => x.k.trace);
  assert.ok(coVet.length >= 50, `bản dựng chỉ còn ${coVet.length} khối có vết`);
  const trung = coVet.filter((x) => doanDuocOutput(x.k));
  assert.equal(
    trung.length,
    0,
    `${trung.length} khối vừa có vết vừa có cổng: ${trung.slice(0, 3).map((x) => x.ma)}`,
  );
});

test('khối VẼ HÌNH không có cổng — kiểm bằng khối figure đứng sau, không bằng regex của hàm', () => {
  // Phép loại trong `doanDuocOutput` là một regex trên `code`. Nếu ca test
  // cũng dùng regex đó thì nó so hàm với chính nó. Dấu hiệu ĐỘC LẬP: khối
  // `figure` ngay sau — khối code nào có nó thì chính nó đã vẽ ra hình đó.
  //
  // Đo được: 80 khối như vậy, và `expected` của chúng là mấy con số in kèm
  // ("36", "12", "[3, 2]" ở VZ01) — ngắn, nên KHÔNG có phép loại này thì chúng
  // lọt hết và người học bị hỏi "đoán xem in ra gì" cho một đoạn vẽ biểu đồ.
  const veHinh = CODE.filter((x) => x.sau && x.sau.type === 'figure');
  assert.ok(veHinh.length >= 70, `chỉ còn ${veHinh.length} khối có figure đứng sau`);
  const lot = veHinh.filter((x) => doanDuocOutput(x.k));
  assert.equal(
    lot.length,
    0,
    `${lot.length} khối vẽ hình vẫn có cổng: ${lot.slice(0, 3).map((x) => x.ma)}`,
  );
});

test('đáp án không được nằm NGUYÊN VĂN trong đoạn code', () => {
  // `print("Xin chào")` thì cổng chỉ bắt người học chép lại một chuỗi họ đang
  // nhìn — ma sát không mua thêm gì, đúng thứ `gen_traces.py` đã phải loại cho
  // câu dự đoán của bảng. Đo được 35 khối rơi vào diện này ở trần đang dùng.
  const lo = DU_DIEU_KIEN.filter((x) => gon(x.k.code).includes(gon(x.k.expected)));
  assert.equal(lo.length, 0, `${lo.length} khối lộ đáp án: ${lo.slice(0, 3).map((x) => x.ma)}`);
});

test('trần số dòng và số ký tự được tôn trọng trên MỌI khối đủ điều kiện', () => {
  assert.equal(DOAN_OUTPUT_MAX_DONG, 2);
  assert.equal(DOAN_OUTPUT_MAX_KY_TU, 40);
  for (const x of DU_DIEU_KIEN) {
    const exp = x.k.expected.trim();
    const dong = exp.split('\n').filter((d) => d.trim()).length;
    assert.ok(dong <= DOAN_OUTPUT_MAX_DONG, `${x.ma}: ${dong} dòng`);
    assert.ok(exp.length <= DOAN_OUTPUT_MAX_KY_TU, `${x.ma}: ${exp.length} ký tự`);
  }
});

// ───────────────────────────── CỔNG PHẢI ĐI QUA ĐƯỢC

test('mọi khối có cổng đều có một câu trả lời GÕ LẠI ĐƯỢC làm người học khớp', () => {
  // Nếu `khopDapAn(expected, expected)` mà false thì cổng đó KHÔNG AI qua được
  // với verdict "Khớp" — tức người gõ đúng từng ký tự vẫn bị báo chưa khớp.
  // `khopDapAn` đòi chuỗi sau khi bỏ khoảng trắng phải KHÁC RỖNG, nên một khối
  // có `expected` toàn khoảng trắng sẽ bắt ở đây.
  for (const x of DU_DIEU_KIEN) {
    assert.ok(khopDapAn(x.k.expected, x.k.expected), `${x.ma}: không ai khớp được`);
  }
  // Và output nhiều dòng thì gõ liền trên MỘT dòng vẫn khớp — ô nhập là một
  // dòng, nên nếu không có tính chất này thì mọi khối 2 dòng đều bất khả.
  const haiDong = DU_DIEU_KIEN.filter(
    (x) => x.k.expected.trim().split('\n').filter((d) => d.trim()).length === 2,
  );
  assert.ok(haiDong.length > 0, 'không khối 2 dòng nào — trần đã bị hạ mà chú thích chưa đổi?');
  for (const x of haiDong) {
    assert.ok(khopDapAn(gon(x.k.expected), x.k.expected), `${x.ma}: gõ liền dòng không khớp`);
  }
});

test('doanDuocOutput loại đúng những hình dạng không phải khối code', () => {
  assert.equal(doanDuocOutput({ type: 'paragraph', text: 'x' }), false);
  assert.equal(doanDuocOutput({ type: 'terminal', code: 'ls', expected: 'a' }), false);
  assert.equal(doanDuocOutput({ type: 'table', headers: [], rows: [] }), false);
  // Khối code KHÔNG có expected: không có gì để đoán.
  assert.equal(doanDuocOutput({ type: 'code', code: 'x = 1' }), false);
  assert.equal(doanDuocOutput({ type: 'code', code: 'x = 1', expected: '   ' }), false);
  // Khối code đúng diện.
  assert.equal(doanDuocOutput({ type: 'code', code: 'print(3 * 7)', expected: '21' }), true);
});

// ───────────────────────────── GIAO DIỆN

test('ReadScreen DỰNG cổng ở nhánh khối code, và phép chọn đến từ lib', () => {
  assert.match(SCREEN, /import \{[^}]*doanDuocOutput[^}]*\} from '@\/lib\/studio-lesson'/s);
  assert.match(SCREEN_CODE, /doanDuocOutput\(block\)/);
  assert.match(SCREEN_CODE, /<CongDuDoan\s/);
  // Và phép chọn KHÔNG được viết lại tại chỗ: một điều kiện trong component là
  // một điều kiện không có test.
  assert.ok(
    !/expected\.length\s*<=\s*\d/.test(SCREEN_CODE),
    'ReadScreen tự đo độ dài expected — luật phải nằm ở doanDuocOutput',
  );
});

test('cổng KHOÁ tới khi người học gõ gì đó — một dòng, và là toàn bộ phần có bằng chứng', () => {
  assert.match(SCREEN_CODE, /disabled=\{!doan\.trim\(\)\}/);
});

test('ô "Kết quả:" MỞ RA dù đoán đúng hay sai', () => {
  // Giấu output của người đoán sai là lấy đi đúng thứ họ cần nhất lúc đó. Hai
  // phép kiểm: nhánh ĐÃ NỘP dựng <KetQua>, và không chỗ nào điều kiện hoá nó
  // theo `khop`.
  // `<KetQua>` phải là EM RUỘT ngay sau thẻ verdict, không nằm trong một
  // `khop ? … : …` nào: đứng liền `</p>` thì nó không thể bị điều kiện hoá.
  assert.match(
    SCREEN_CODE,
    /<\/p>\s*<KetQua expected=\{expected\} \/>/,
    'ô Kết quả không đứng liền sau verdict — có thể đã bị điều kiện hoá theo `khop`',
  );
  // Ô "Kết quả:" là CÙNG một component cho cả khối có cổng và khối không có:
  // hai bản dựng là hai thứ sẽ lệch (đúng lỗi `withInlineCode` ở ô tổng kết).
  assert.equal(SCREEN_CODE.match(/<span className=\{c\.readExpectedLabel\}>/g).length, 1);
});

test('verdict không phán xét, và NÓI RA giới hạn của phép so', () => {
  assert.ok(SCREEN_CODE.includes('Chưa khớp từng ký tự.'), 'thiếu chữ "Chưa khớp từng ký tự"');
  // `khopDapAn` cố ý KHÔNG bóc dấu nháy, nên `[ 6  8 10]` đòi đúng ngoặc và
  // người đoán ĐÚNG mà viết `6 8 10` sẽ nhận "chưa khớp". Không nói ra điều đó
  // là để nền tảng khẳng định một điều nó không biết.
  assert.match(SCREEN_CODE, /chỉ bỏ khoảng trắng, không bỏ dấu nháy/);
  for (const xau of ['Sai.', 'sai rồi', 'Bạn sai']) {
    assert.ok(!SCREEN_CODE.includes(xau), `verdict mang chữ phán xét "${xau}"`);
  }
});

test('KHÔNG animation lúc mở đáp án — Tversky 2002, cùng kết luận đã ghim cho khối diagram', () => {
  // Giá trị nằm ở việc SO đáp án mình đoán với output thật, mà so sánh thì cần
  // cả hai cùng có mặt. "Thêm một animation nhỏ cho sinh động" là việc rất dễ
  // làm, nên nó được ghim.
  assert.ok(
    !/animation|transition|@keyframes/.test(bocChuThich(SCREEN)),
    'ReadScreen khai animation/transition',
  );
  const readExpected = CSS.match(/\.readExpected\s*\{([^}]*)\}/);
  assert.ok(readExpected, 'thiếu quy tắc .readExpected');
  assert.ok(
    !/animation|transition/.test(readExpected[1]),
    '.readExpected có animation — ô kết quả phải hiện ra ngay',
  );
});

test('cổng DÙNG LẠI bộ class của StepTrace, không dựng bộ thứ hai', () => {
  // Hai cổng dự đoán trên cùng một màn đọc mà trông khác nhau thì người học
  // không nhận ra đó là cùng một việc. Và một bộ class thứ hai là một bộ nữa
  // phải sửa theo ở lần đổi giao diện sau.
  for (const cls of [
    'c.tracePredict',
    'c.tracePredictAsk',
    'c.tracePredictWhy',
    'c.tracePredictLine',
    'c.tracePredictInput',
    'c.tracePredictGo',
  ]) {
    assert.ok(SCREEN_CODE.includes(cls), `cổng không dùng ${cls}`);
  }
  // 16px, KHÔNG nhỏ hơn: iOS Safari tự phóng cả trang khi focus vào input có
  // font-size < 16px, và lúc đó người học mất chỗ đang đọc.
  assert.match(CSS.match(/\.tracePredictInput\s*\{([^}]*)\}/)[1], /font-size:\s*16px/);
});

// ───────────────────────────── NHÁP

test('câu đã nộp nằm trong NHÁP, nên rời màn rồi quay lại không bị hỏi lại', () => {
  assert.match(LIB, /readGuess\?: Record<string, string>/);
  assert.deepEqual(initialLessonDraft({}).readGuess, {});
  // Đọc từ draft và ghi qua `update` — KHÔNG useState cho câu đã nộp.
  assert.match(SCREEN_CODE, /draft\.readGuess\?\.\[/);
  assert.match(SCREEN_CODE, /update\(\{ readGuess:/);
  // `useState` chỉ được dùng cho chữ ĐANG GÕ, đúng một chỗ.
  assert.equal((SCREEN_CODE.match(/useState\(/g) ?? []).length, 1);
  // React 19 chặn setState đồng bộ trong thân effect; cổng này không cần effect
  // nào, nên có một `useEffect` ở đây là dấu hiệu đã đi sai đường.
  assert.ok(!SCREEN_CODE.includes('useEffect'), 'ReadScreen dựng useEffect');
});

test('khoá nháp mang CẢ chỉ số màn — thiếu nó là đoán ở màn 1 mở sẵn đáp án màn 2', () => {
  // 51/179 bài có 4 màn đọc liền nhau, mỗi màn đánh số khối lại từ 0. Khoá chỉ
  // mang `i` thì khối thứ nhất của mọi màn dùng chung một ô nháp.
  assert.match(SCREEN_CODE, /`\$\{at\}-\$\{i\}`/);
  // Và bản dựng THẬT có bài như thế, nên đây không phải lo xa.
  const nhieuMan = DA.filter((b) => (b.content_json.step_1?.read ?? []).length >= 4);
  assert.ok(nhieuMan.length >= 40, `chỉ ${nhieuMan.length} bài có ≥4 màn đọc`);
  // Ít nhất một bài có cổng ở HAI màn khác nhau — tức khoá thật sự phải phân biệt.
  const theoBai = new Map();
  for (const x of DU_DIEU_KIEN) {
    if (!theoBai.has(x.ma)) theoBai.set(x.ma, new Set());
    theoBai.get(x.ma).add(x.man);
  }
  assert.ok(
    [...theoBai.values()].filter((s) => s.size >= 2).length >= 20,
    'không bài nào có cổng ở hai màn — khoá nháp chưa cần phân biệt màn?',
  );
});
