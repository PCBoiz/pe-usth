/**
 * Lưới an toàn cho lời giải thích ở màn "Điền chỗ trống": LỜI CHÊ BẪY SAI
 * KHÔNG ĐƯỢC NÓI RA ĐÁP ÁN CỦA CHÍNH Ô ĐÓ.
 *
 * LỖI ĐANG CHẶN (đã có thật, 6 chỗ, sửa cùng commit này). Ở `step_3.scaffold`,
 * mỗi mảnh trong `bank` có thể mang `trap`: câu hiện ra khi người học kéo mảnh
 * SAI vào ô. Mục đích của nó là giải thích vì sao LỰA CHỌN VỪA RỒI sai. Nhưng
 * sáu câu đang viết thẳng luôn đáp án đúng của ô ấy ra:
 *
 *   P02 ô1 — đáp án `"ready"`           — trap: "…phải về ready chờ dispatch."
 *   T03 ô2 — đáp án `super().__init__()`— trap: "…lại thiếu super().__init__()."
 *   G02 ô3 — đáp án `send`              — trap: "Gọi send ngay lúc dựng giao diện…"
 *   X01 ô1 — đáp án `";"`               — trap: "…file này ngăn cột bằng ";"."
 *   X01 ô3 — đáp án `["-"]`             — trap: "…file này ghi thiếu bằng "-"."
 *   X02 ô2 — đáp án `scipy.io.loadmat`  — trap: "….mat thông thường đọc bằng scipy.io.loadmat."
 *
 * CHỖ LUẬT NÀY CÒN MÙ, nói trước để không ai tin quá: luật so khớp đòi đáp án
 * xuất hiện gần như nguyên văn. `X01 ô3` ở trên nó KHÔNG bắt được — đáp án là
 * `["-"]` còn trap viết `"-"`, khác nhau cặp ngoặc, nên phải tìm bằng mắt. Đáp
 * án nào là một biểu thức bọc quanh một giá trị thì vẫn có thể lọt. Thêm trap
 * mới vẫn phải tự đọc lại, test này chỉ đỡ phần nguyên văn.
 *
 * Hệ quả không phải thẩm mỹ: ô có 2–3 mảnh ứng viên, nên chọn bừa một mảnh sai
 * là ĐƯỢC PHÁT luôn đáp án. Màn điền chỗ trống mất hẳn tác dụng — nó thành một
 * nút "hiện lời giải" mà không ai gọi tên như vậy. Server thì không chấm lại gì
 * (xem bẫy "Chấm bài nằm ở trình duyệt" trong AGENTS.md), nên không chỗ nào
 * khác chặn được.
 *
 * VÌ SAO ĐỌC JSON THẬT, KHÔNG FIXTURE: bẫy số 1 trong AGENTS.md —
 * `quizzes.service.spec.ts` từng khẳng định "không bao giờ lộ đáp án" trên
 * fixture `options: ['a','b']` trong khi dữ liệu thật là mảng object, nên lỗ
 * thật sống sót qua mọi lần chạy test. Ở đây mọi `trap`/`answer` đều lấy từ
 * scripts/pe-v4/out-advanced/lessons/*.json — đúng bản `seed` nạp vào
 * `lessons.content_json`.
 *
 * BẰNG CHỨNG BỘ NÀY BẮT ĐƯỢC LỖI THẬT: trả bốn câu trap cũ về
 * scripts/pe-v4/lessons_{proc,thread,gui,data}.py rồi dựng lại ⇒ ca
 * "không trap nào nói ra đáp án của ô mình" TRƯỢT với đúng 4 chỗ được nêu tên.
 *
 * VÌ SAO CÓ CA TỰ KIỂM LUẬT SO KHỚP: `\b` nằm trong template literal là ký tự
 * BACKSPACE, không phải ranh giới từ — đã vấp hai lần trong repo này
 * (seo-copy.test.mjs, ds-tokens.test.mjs) và cả hai lần test vẫn XANH trong khi
 * không kiểm gì cả. Ở đây `\b` chỉ xuất hiện trong chuỗi truyền cho `RegExp`,
 * và `luật so khớp` phải tự chứng minh là nó còn phân biệt được
 * "gọi run xong" với "trung bình" trước khi được dùng để kết luận 48 bài sạch.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const LESSON_DIR = join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons');

/** Bỏ dấu nháy bao quanh: đáp án `"ready"` và chữ `ready` trong trap là một. */
const stripQuotes = (s) => String(s ?? '').replace(/["'`]/g, '').trim();

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Đáp án có bị nói ra trong câu `trap` không.
 *
 * Chỉ chèn ranh giới từ ở ĐẦU/CUỐI nào là chữ-số-gạch dưới. Đáp án như
 * `super().__init__()` kết thúc bằng `)`: thêm `\b` sau nó thì đòi phải có một
 * ký tự chữ liền ngay sau, và câu trap có chấm câu sẽ không khớp — tức luật tự
 * làm mù chính nó. Đây là lý do không dùng một `\b…\b` cho mọi trường hợp.
 */
function mentions(trapText, answer) {
  const a = stripQuotes(answer);
  if (!a) return false;
  const head = /^[A-Za-z0-9_]/.test(a) ? '\\b' : '';
  const tail = /[A-Za-z0-9_]$/.test(a) ? '\\b' : '';
  return new RegExp(head + escapeRe(a) + tail).test(stripQuotes(trapText));
}

const LESSONS = readdirSync(LESSON_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => {
    const raw = JSON.parse(readFileSync(join(LESSON_DIR, f), 'utf8'));
    const content = raw.content_json ?? raw;
    return { file: f, code: raw.lesson_code ?? raw.code ?? f, content };
  });

/** Mọi cặp (câu trap, đáp án của đúng ô mà mảnh đó nhắm vào). */
function trapPairs() {
  const out = [];
  for (const { file, code, content } of LESSONS) {
    const scaffold = content?.step_3?.scaffold;
    if (!scaffold) continue;
    const answerOf = new Map((scaffold.slots ?? []).map((s) => [s.n, s.answer]));
    for (const piece of scaffold.bank ?? []) {
      if (!piece.trap) continue;
      out.push({
        file,
        code,
        slot: piece.slot,
        label: piece.label,
        trap: piece.trap,
        answer: answerOf.get(piece.slot),
      });
    }
  }
  return out;
}

test('luật so khớp: còn phân biệt được ranh giới từ (không phải BACKSPACE)', () => {
  // Nếu `\b` bị hỏng thành ký tự điều khiển thì hai khẳng định dưới đây đổ.
  assert.equal(mentions('gọi run xong là hết', 'run'), true);
  assert.equal(mentions('trung bình của dãy', 'run'), false);
  assert.equal(mentions('lại thiếu super().__init__().', 'super().__init__()'), true);
  assert.equal(mentions('constructor của lớp cha vẫn chưa chạy', 'super().__init__()'), false);
  // Dấu nháy trong đáp án không được làm luật mù.
  assert.equal(mentions('đọc bằng scipy.io.loadmat.', '"scipy.io.loadmat"'), true);
});

test('có đủ dữ liệu để kiểm — 48 bài, và màn điền chỗ trống thật có trap', () => {
  assert.equal(LESSONS.length, 48);
  const pairs = trapPairs();
  assert.ok(pairs.length >= 100, `chỉ thấy ${pairs.length} câu trap — nghi đọc sai đường dẫn`);
  // Mọi trap phải trỏ vào một ô có đáp án; nếu không, ca chính dưới đây sẽ bỏ
  // qua nó trong im lặng.
  const orphan = pairs.filter((p) => !p.answer);
  assert.deepEqual(orphan, [], 'có mảnh trap trỏ vào ô không tồn tại');
});

test('không trap nào nói ra đáp án của ô mình', () => {
  const leaks = trapPairs()
    .filter((p) => mentions(p.trap, p.answer))
    .map((p) => `${p.code} ô${p.slot}: đáp án ${p.answer} — "${p.trap}"`);
  assert.deepEqual(leaks, []);
});
