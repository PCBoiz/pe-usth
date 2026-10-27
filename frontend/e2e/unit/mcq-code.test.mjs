/**
 * Đoạn code của câu trắc nghiệm — 214/516 câu đang phát đã MẤT nó.
 *
 * Lỗi thật, đo trên bản dựng 27/10 và đã sửa 28/10. 471/1032 câu của gói nguồn
 * mang một trường `code` RIÊNG, và đề bài của chúng không tự đứng được.
 * `cau_trac_nghiem()` bỏ trường đó, nên:
 *
 *   · **214/516 câu** đang phát mất đoạn code quyết định đáp án;
 *   · **90 câu ở 45 bài** thì đề bài CÒN TRỎ TỚI nó, nên không trả lời được —
 *     nguyên văn PY01, bài ĐẦU TIÊN của khoá: "Buổi sáng bán 10 cốc, chiều bán
 *     7 cốc. Kết quả ở lệnh print cuối có giá trị nào?" và không có lệnh print
 *     nào trên màn hình;
 *   · **VZ20 có HAI câu trùng nhau từng ký tự** trong cùng một bài, vì thứ duy
 *     nhất phân biệt hai biến thể là `code`.
 *
 * Không ngoại lệ nào được ném, không log nào đỏ, và cả 30 ca test backend đều
 * xanh — chúng kiểm "snapshot khớp bản dựng", không kiểm "câu hỏi trả lời được".
 *
 * Vì sao code được GẤP vào `question` chứ không là một trường mới: hình dạng
 * này đi qua `normalizeQuestion` ở backend để vào kho quiz chấm Ở SERVER, mà
 * hàm đó chỉ đọc `question`/`options`/`explanation`. Một trường `code` riêng sẽ
 * bị BỎ ÂM THẦM ở đúng con đường chấm duy nhất client không giả mạo được — tức
 * tái tạo chính cái bẫy vừa sửa, ở chỗ tệ hơn.
 *
 * Nên có HAI nửa phải khớp từng ký tự, và đó là thứ bộ test này canh:
 * `NOI_DE_CODE` trong scripts/pe-da/build.py nối, `tachDeVaCode()` tách.
 *
 * Bằng chứng bắt được lỗi thật (gỡ bản sửa ra, test phải trượt) — đã ĐẾM:
 *   · build không gấp code vào đề (quay lại bản 27/10) → `check.py` **214 lỗi**;
 *   · gấp bằng MỘT dòng mới thay vì dòng trống        → `check.py` **214 lỗi**;
 *   · phía frontend, các ablation ở cuối file này.
 *
 * Và một luật đã BỊ XOÁ vì nó không chứng minh được gì: một regex "đề trỏ tới
 * code thì phải có code" báo oan ngay PY01 (code nội tuyến trong đề), rồi sau
 * khi thêm phép loại trừ thì bắt được **0 ca ngay cả khi gỡ cả hai luật trên**.
 * Xem chú thích trong `kiem_trac_nghiem()`.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tachDeVaCode } from '../../src/lib/studio-lesson.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const DUNG = join(FE, '..', 'scripts', 'pe-da', 'out', 'lessons.json');

// ---------------------------------------------------------------------------
// tachDeVaCode — hàm thuần
// ---------------------------------------------------------------------------

test('tachDeVaCode: đề một dòng → không có code, trả nguyên đề', () => {
  const r = tachDeVaCode('Giá trị nào đúng?');
  assert.equal(r.de, 'Giá trị nào đúng?');
  assert.equal(r.code, undefined);
});

test('tachDeVaCode: tách ở dòng trống, code bị cắt khoảng trắng hai đầu', () => {
  const r = tachDeVaCode('Đoạn code dưới in gì?\n\nx = 1\nprint(x)\n');
  assert.equal(r.de, 'Đoạn code dưới in gì?');
  assert.equal(r.code, 'x = 1\nprint(x)');
});

test('tachDeVaCode: chỉ tách ở dòng trống ĐẦU — code nhiều khối vẫn nguyên', () => {
  // Code của nguồn có thể tự chứa dòng trống; tách ở lần cuối hay tách hết thì
  // một nửa code rơi vào tiêu đề.
  const r = tachDeVaCode('In gì?\n\na = 1\n\nb = 2\nprint(a + b)');
  assert.equal(r.de, 'In gì?');
  assert.equal(r.code, 'a = 1\n\nb = 2\nprint(a + b)');
});

test('tachDeVaCode: dòng trống mà sau đó RỖNG → không bịa ra khối code', () => {
  const r = tachDeVaCode('Giá trị nào đúng?\n\n   \n');
  assert.equal(r.code, undefined);
  assert.equal(r.de, 'Giá trị nào đúng?');
});

test('tachDeVaCode: đề nhiều dòng nhưng KHÔNG có dòng trống → vẫn là đề', () => {
  // `\n` đơn không phải mốc nối. Nếu lấy `\n` làm mốc thì một đề xuống dòng
  // bình thường bị cắt làm hai và nửa sau hiện thành khối code.
  const r = tachDeVaCode('Dòng một\nDòng hai');
  assert.equal(r.de, 'Dòng một\nDòng hai');
  assert.equal(r.code, undefined);
});

// ---------------------------------------------------------------------------
// Đối chiếu BẢN DỰNG THẬT — fixture tự bịa không chứng minh được build phát đúng
// ---------------------------------------------------------------------------

const coDung = existsSync(DUNG);
const bai = coDung ? JSON.parse(readFileSync(DUNG, 'utf8')).lessons : [];
const boQua = { skip: coDung ? false : 'chưa dựng — chạy `py scripts/pe-da/build.py`' };

const cauCua = (b) => (b.content_json?.step_2?.mcq ?? []);

test('bản dựng: 214/516 câu mang đoạn code, và mọi đoạn tách lại được', boQua, () => {
  let tong = 0;
  let coCode = 0;
  for (const b of bai) {
    for (const q of cauCua(b)) {
      tong += 1;
      const { de, code } = tachDeVaCode(q.question);
      if (!code) continue;
      coCode += 1;
      assert.ok(de.trim(), `${b.lesson_code}: tách ra đề RỖNG`);
      assert.ok(!code.startsWith('\n'), `${b.lesson_code}: code còn dòng trống đầu`);
    }
  }
  assert.equal(tong, 516);
  assert.equal(coCode, 214);
});

test('bản dựng: KHÔNG bài nào có hai câu trùng nguyên văn', boQua, () => {
  // VZ20 từng có đúng chuyện này: hai biến thể dùng chung câu dẫn và thứ phân
  // biệt chúng (`code`) bị bỏ, nên người học thấy hai màn hỏi y hệt nhau.
  const trung = [];
  for (const b of bai) {
    const seen = new Set();
    for (const q of cauCua(b)) {
      if (seen.has(q.question)) trung.push(`${b.lesson_code}: ${q.question.slice(0, 50)}`);
      seen.add(q.question);
    }
  }
  assert.deepEqual(trung, []);
});

test('bản dựng: đề bài tách ra không bao giờ RỖNG', boQua, () => {
  // Nếu `prompt` của nguồn rỗng mà `code` có thì `question` bắt đầu bằng mốc
  // nối, và màn trắc nghiệm hiện một tiêu đề trống trên một khối code.
  const xau = [];
  for (const b of bai) {
    for (const q of cauCua(b)) {
      if (!tachDeVaCode(q.question).de.trim()) xau.push(b.lesson_code);
    }
  }
  assert.deepEqual(xau, []);
});

// ---------------------------------------------------------------------------
// DÂY NỐI — thứ đã hỏng là không ai dựng khối code ra, nên phải canh chỗ gọi
// ---------------------------------------------------------------------------

test('McqScreen thực sự dựng khối code: gọi tachDeVaCode và dùng CodeBlock', () => {
  const src = readFileSync(
    join(FE, 'src', 'components', 'python-studio', 'screens', 'McqScreen.tsx'),
    'utf8',
  );
  assert.ok(src.includes('tachDeVaCode('), 'không tách thì cả chuỗi gộp vào tiêu đề');
  assert.ok(src.includes('CodeBlock'), 'code phải dựng bằng CodeBlock, không phải văn xuôi');
  // Tiêu đề phải là ĐỀ đã tách, không phải `q.question` nguyên bản.
  assert.ok(!/title=\{q\.question\}/.test(src), 'vẫn truyền nguyên question làm tiêu đề');
});
