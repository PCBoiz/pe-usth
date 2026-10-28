/**
 * Trả lời trắc nghiệm SAI phải CÓ đường đi tiếp.
 *
 * Triệu chứng, nguyên văn một người thử ngày 27/10/2026: "mấy cái câu trắc
 * nghiệm ấy nếu sai rồi thì cho next luôn vì thử lại ở đây cũng ko làm đc gì.
 * căn bản là người dùng chỉ cần nhớ đáp án rồi chọn lại là được."
 *
 * Bằng chứng trong mã: `primaryCta` trả đúng MỘT nút sau một câu sai —
 * `{ label: 'Thử lại', tone: 'err', action: 'retry' }`. Với 3 phương án, làm
 * lại vô hạn đảm bảo đúng sau tối đa 3 lần bấm, nên câu hỏi không còn mang
 * thông tin nào. Van der Kleij 2015 (40 nghiên cứu / 70 cỡ hiệu ứng): phản hồi
 * CÓ GIẢI THÍCH d = 0,49 · hiện đáp án đúng d = 0,32 · chỉ nói đúng/sai
 * d = 0,05. Nút "Thử lại" không kèm giải thích chính là loại d = 0,05.
 * Butler 2007: bắt-làm-lại TƯƠNG ĐƯƠNG hiện thẳng đáp án, không hơn.
 * Bằng chứng mục này HỖN HỢP (VAN-PHONG.md §8 M5), nên phát biểu mạnh nhất
 * được phép: bắt làm lại không mua thêm gì so với hiện đáp án, và trên 3
 * phương án nó phá giá trị ĐO LƯỜNG.
 *
 * Vì sao nó không sửa được bằng một dòng (AGENTS.md đã ghi trước khi sửa):
 * cho đi tiếp mà không `markDone` thì `firstUnfinished()` chặn ở màn TỔNG KẾT
 * (kẹt ở cuối bài, tệ hơn kẹt giữa bài); `markDone` cho câu SAI thì ô "câu
 * đúng" ở RecapScreen nói dối. Nên phải có TRẠNG THÁI THỨ BA.
 *
 * Trạng thái thứ ba KHÔNG là trường nháp mới: nó là "có `score.firstTry[key]`
 * nhưng không có `done[key]`" — `screenAnswered()` / `screenSettled()` trong
 * lib/studio-lesson.ts. Thêm một `reviewed: Record<string, boolean>` là dựng
 * thứ thứ hai phải khớp với `firstTry`, và nó sẽ lệch.
 *
 * Phần chạy THẬT nằm ở nhóm 1–7 (hàm thuần, chạy trên dữ liệu bản dựng thật).
 * Nhóm 8 đọc CÂY MÃ vì `cta.ts` import một file `.tsx`, nên `node --test`
 * không nạp được nó — cùng cách mà consent-banner.test.mjs làm với
 * ConsentBanner.tsx.
 *
 * Ablate (gỡ từng mảnh của bản sửa, ĐẾM số ca đỏ) — xem mô tả commit.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EMPTY_SCORE,
  buildScreens,
  correctIndex,
  firstUnfinished,
  initialLessonDraft,
  isChoiceScreen,
  isGraded,
  letterKey,
  markDoneOnNext,
  maxReachedStep,
  quizPercent,
  scoreCheck,
  screenAnswered,
  screenSettled,
  screenVerdict,
} from '../../src/lib/studio-lesson.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const ROOT = join(FE, '..');
const doc = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

// ───────────────────────────────────────────────────────────── dữ liệu THẬT
//
// Khoá 172 bài ĐANG XUẤT BẢN (3 câu trắc nghiệm mỗi bài) và một bài pe-v4 có
// cả màn `predict` (chọn phương án) lẫn màn `game` (làm lại là làm lại VIỆC).
const PE_DA = JSON.parse(doc(join(ROOT, 'scripts', 'pe-da', 'out', 'lessons.json')));
const py01 = PE_DA.lessons.find((l) => l.lesson_code === 'PY01').content_json;
const p01 = JSON.parse(
  doc(join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons', '001-P01.json')),
).content_json;

const draftOf = (l, over = {}) => ({ ...initialLessonDraft(l), ...over });

/** Nháp sau khi bấm "Kiểm tra" ở `keys` với kết quả `correct`. */
function afterChecks(l, pairs) {
  let d = draftOf(l);
  for (const [key, correct] of pairs) {
    const r = scoreCheck(d.score ?? EMPTY_SCORE, key, correct);
    d = { ...d, score: r.score, done: correct ? { ...d.done, [key]: true } : d.done };
  }
  return d;
}

const mcqKeys = (l) =>
  buildScreens(l)
    .filter((s) => s.kind === 'mcq')
    .map((s) => s.key);

// ─────────────────────────────────────────── 1. phạm vi: màn nào được đi tiếp

test('isChoiceScreen: chỉ mcq và predict — làm lại ở đó là bấm nốt phương án còn lại', () => {
  assert.equal(isChoiceScreen('mcq'), true);
  assert.equal(isChoiceScreen('predict'), true);
  // Các màn có chấm KHÁC giữ nguyên "Thử lại": xếp lại dòng code hay sửa hàm
  // là làm lại VIỆC, lý lẽ của M5 không với tới chúng.
  for (const kind of ['classify', 'scaffold', 'counter', 'selfExplain', 'game'])
    assert.equal(isChoiceScreen(kind), false, kind);
  // Và màn không chấm thì không liên quan.
  for (const kind of ['read', 'practice', 'sandbox', 'recap', 'theory'])
    assert.equal(isChoiceScreen(kind), false, kind);
});

test('mọi màn choice đều là màn ĐƯỢC CHẤM — nếu không thì luật mới không chạm tới nó', () => {
  for (const kind of ['mcq', 'predict']) assert.equal(isGraded(kind), true, kind);
});

// ───────────────────────────────────────────── 2. trạng thái THỨ BA, đọc được

test('screenAnswered: nháp mới chưa trả lời; trả lời SAI vẫn là đã trả lời', () => {
  const d0 = draftOf(py01);
  const key = mcqKeys(py01)[0];
  assert.equal(screenAnswered(d0, key), false);

  const sai = afterChecks(py01, [[key, false]]);
  assert.equal(screenAnswered(sai, key), true);
  // Và nó KHÔNG được biến thành "đã làm đúng".
  assert.equal(Boolean(sai.done[key]), false);
  assert.equal(sai.score.firstTry[key], false);

  const dung = afterChecks(py01, [[key, true]]);
  assert.equal(screenAnswered(dung, key), true);
  assert.equal(dung.done[key], true);
});

test('screenSettled: câu trắc nghiệm trả lời SAI thôi chặn, màn game thì KHÔNG', () => {
  const screens = buildScreens(p01);
  const predict = screens.find((s) => s.kind === 'predict');
  const game = screens.find((s) => s.kind === 'game');
  assert.ok(predict && game, 'bài P01 phải có cả màn predict và màn game');

  const d = afterChecks(p01, [
    [predict.key, false],
    [game.key, false],
  ]);
  assert.equal(screenSettled(predict, d), true);
  assert.equal(screenSettled(game, d), false);
  // Làm đúng thì cả hai đều thôi chặn, như cũ.
  const ok = afterChecks(p01, [
    [predict.key, true],
    [game.key, true],
  ]);
  assert.equal(screenSettled(predict, ok), true);
  assert.equal(screenSettled(game, ok), true);
});

// ─────────────────────── 3. CA BẮT LỖI: màn tổng kết không được chặn nữa

test('firstUnfinished: trả lời SAI cả 3 câu vẫn kết thúc được bài (đây là ca bắt lỗi)', () => {
  const screens = buildScreens(py01);
  const keys = mcqKeys(py01);
  assert.equal(keys.length, 3, 'khoá 172 bài phát 3 câu trắc nghiệm mỗi bài');

  // Trước bản sửa: cả 3 câu sai → `firstUnfinished` trả màn mcq đầu, nút ở màn
  // tổng kết thành "Còn phải làm: …" và người học KẸT Ở CUỐI BÀI.
  const sai = afterChecks(py01, keys.map((k) => [k, false]));
  assert.equal(firstUnfinished(screens, sai), undefined);

  // Chưa trả lời thì VẪN chặn — đi tiếp được không có nghĩa là bỏ qua được.
  const chua = draftOf(py01);
  assert.equal(firstUnfinished(screens, chua)?.key, keys[0]);

  // Trả lời 2 câu, bỏ câu thứ 3 (nhảy bằng thanh tiến độ): vẫn chặn, và chặn
  // đúng ở câu còn thiếu.
  const thieu = afterChecks(py01, [
    [keys[0], false],
    [keys[1], true],
  ]);
  assert.equal(firstUnfinished(screens, thieu)?.key, keys[2]);
});

test('firstUnfinished: màn game trả lời sai thì VẪN chặn — phạm vi không bị nới', () => {
  const screens = buildScreens(p01);
  const graded = screens.filter((s) => isGraded(s.kind));
  const d = afterChecks(p01, graded.map((s) => [s.key, false]));
  const missing = firstUnfinished(screens, d);
  assert.ok(missing, 'bài có game: trả lời sai hết thì vẫn phải còn màn chặn');
  assert.equal(isChoiceScreen(missing.kind), false);
});

// ───────────────────────────────── 4. không được đánh dấu câu sai là "đã đúng"

test('markDoneOnNext: bấm đi tiếp sau câu SAI thì KHÔNG đánh dấu đã làm đúng', () => {
  const screens = buildScreens(py01);
  const mcq = screens.find((s) => s.kind === 'mcq');
  const read = screens.find((s) => s.kind === 'read');

  assert.equal(markDoneOnNext(mcq, { correct: false }), false);
  assert.equal(markDoneOnNext(mcq, { correct: true }), true);
  // Màn chỉ để đọc: `screenVerdict` trả null ở đó, và nó vẫn phải được đánh
  // dấu đã qua — nếu không thì thanh tiến độ của bài đọc trống trơn.
  assert.equal(screenVerdict(py01, read, draftOf(py01)), null);
  assert.equal(markDoneOnNext(read, null), true);
  assert.equal(markDoneOnNext(read, undefined), true);
});

test('đi hết bài mà trả lời SAI mọi câu: kết thúc được, và không ô nào nói là đã đúng', () => {
  // Mô phỏng đúng nhánh "đi tiếp" của `doAction`: chấm màn → ghi `firstTry` →
  // chỉ đánh dấu `done` khi `markDoneOnNext` cho phép. Chạy trên dữ liệu bài
  // thật, nên đây là ca gần nhất với một người học bấm hết lượt bài.
  const screens = buildScreens(py01);
  let d = draftOf(py01);
  for (const scr of screens) {
    const v = screenVerdict(py01, scr, d); // chưa chọn gì → mọi câu chấm là SAI
    if (v) {
      const r = scoreCheck(d.score ?? EMPTY_SCORE, scr.key, v.correct);
      d = { ...d, score: r.score };
    }
    if (markDoneOnNext(scr, v)) d = { ...d, done: { ...d.done, [scr.key]: true } };
  }
  const graded = screens.filter((s) => isGraded(s.kind));
  assert.equal(graded.length, 3);
  // Kết thúc bài được…
  assert.equal(firstUnfinished(screens, d), undefined);
  // …nhưng KHÔNG câu nào được tính là làm đúng, ở cả hai cách đếm.
  assert.equal(graded.filter((s) => d.done[s.key]).length, 0);
  assert.equal(quizPercent(screens, d, false), 0);
  // Màn chỉ để đọc vẫn được đánh dấu đã qua — nếu không thì thanh tiến độ trống.
  assert.ok(screens.filter((s) => s.kind === 'read').every((s) => d.done[s.key]));
});

test('ô "câu đúng" ở màn tổng kết không đếm câu đã đi tiếp mà sai', () => {
  const screens = buildScreens(py01);
  const keys = mcqKeys(py01);
  const d = afterChecks(py01, [
    [keys[0], true],
    [keys[1], false],
    [keys[2], false],
  ]);
  const graded = screens.filter((s) => isGraded(s.kind));
  // `done` (ô "Câu đã làm đúng" của bản thường) và `firstTry` (ô của khoá bài
  // đọc) phải CÙNG nói 1/3 — không ô nào được đếm hai câu đã bỏ qua.
  assert.equal(graded.filter((s) => d.done[s.key]).length, 1);
  assert.equal(graded.filter((s) => d.score.firstTry[s.key] === true).length, 1);
});

// ──────────────────────────────────────── 5. điểm bài: không còn luôn 100%

test('quizPercent: khoá 172 bài nay cho điểm theo lần trả lời ĐẦU', () => {
  const screens = buildScreens(py01);
  const keys = mcqKeys(py01);
  assert.equal(quizPercent(screens, afterChecks(py01, keys.map((k) => [k, true])), false), 100);
  assert.equal(quizPercent(screens, afterChecks(py01, keys.map((k) => [k, false])), false), 0);
  assert.equal(
    quizPercent(
      screens,
      afterChecks(py01, [
        [keys[0], true],
        [keys[1], false],
        [keys[2], false],
      ]),
      false,
    ),
    33,
  );
});

test('chọn lại sau khi đọc đáp án KHÔNG mua lại điểm', () => {
  const screens = buildScreens(py01);
  const key = mcqKeys(py01)[0];
  // Sai, rồi bấm "Chọn lại" và chọn đúng phương án vừa đọc được trong lời giải
  // thích: `done` lên true nhưng `firstTry` phải GIỮ false, nếu không thì mẹo
  // "nhớ đáp án rồi chọn lại" lại đưa điểm về 100%.
  const d = afterChecks(py01, [
    [key, false],
    [key, true],
  ]);
  assert.equal(d.done[key], true);
  assert.equal(d.score.firstTry[key], false);
  assert.equal(quizPercent(screens, d, false), 0);
});

test('bài KHÔNG có màn chấm nào vẫn gửi 100 — bài quy trình/làm trên máy không bị hạ điểm', () => {
  const chiDoc = { ...py01, step_2: { ...py01.step_2, mcq: [] } };
  const screens = buildScreens(chiDoc);
  assert.equal(screens.filter((s) => isGraded(s.kind)).length, 0);
  assert.equal(quizPercent(screens, draftOf(chiDoc), false), 100);
});

// ─────────────────────────────────── 6. thanh tiến độ mở theo trạng thái mới

test('maxReachedStep: câu sai đã đi qua vẫn cho nhảy tới trước trên thanh tiến độ', () => {
  const screens = buildScreens(py01);
  const keys = mcqKeys(py01);
  const iMcq0 = screens.findIndex((s) => s.key === keys[0]);
  const d = afterChecks(py01, [[keys[0], false]]);
  // Màn SAU câu vừa trả lời phải mở ra, bằng đúng lúc trả lời đúng.
  assert.equal(maxReachedStep(screens, d), iMcq0 + 2);
  assert.equal(maxReachedStep(screens, afterChecks(py01, [[keys[0], true]])), iMcq0 + 2);
  // Nháp mới thì chỉ ở màn 1.
  assert.equal(maxReachedStep(screens, draftOf(py01)), 1);
});

// ──────────────────────────────── 7. dữ liệu "vì sao từng phương án sai" có đủ

test('mọi phương án của mọi câu đang phát đều có `detail` — phản hồi d = 0,49 có nguyên liệu', () => {
  let options = 0;
  let cauHoi = 0;
  let thieu = [];
  for (const l of PE_DA.lessons) {
    for (const [i, q] of (l.content_json.step_2?.mcq ?? []).entries()) {
      cauHoi += 1;
      for (const [oi, o] of q.options.entries()) {
        options += 1;
        if (!o.detail) thieu.push(`${l.lesson_code}#${i}.${oi}`);
      }
      // Và đáp án đúng tra được — ô "đáp án đúng" dựa vào nó.
      assert.ok(correctIndex(q) >= 0, `${l.lesson_code}#${i} không có đáp án`);
      assert.ok(letterKey(correctIndex(q)).length === 1);
    }
  }
  assert.equal(thieu.length, 0, `phương án thiếu lời giải thích: ${thieu.slice(0, 5)}`);
  // Đo ngày 29/10/2026: 516 câu × 3 phương án = 1 548. KHÔNG ghim 1 548 thành
  // hằng: phép so quan trọng là "không phương án nào thiếu lời giải thích", mà
  // một con số ghim ở đây sẽ đỏ OAN vào lần thay giáo trình kế tiếp và lúc đó
  // không ai đọc nữa. Chặn dưới thì vẫn phải có, nếu không thì luật trên đạt
  // một cách rỗng khi kho câu hỏi trống — đúng lỗi "0/172 bài có câu hỏi" đã
  // từng sống sót im lặng.
  assert.ok(cauHoi >= 500, `kho câu hỏi chỉ còn ${cauHoi} câu`);
  assert.equal(options, cauHoi * 3);
});

test('Mcq dựng lời giải thích cho MỌI phương án, và không làm mờ chữ phải đọc', () => {
  const mcq = doc(join(FE, 'src', 'components', 'lesson-chrome', 'exercises', 'Mcq.tsx'));
  // `opt.sub` đi với mọi lựa chọn, không chỉ lựa chọn được chọn.
  assert.match(mcq, /\{opt\.sub && <span className=\{styles\.optionSub\}>\{opt\.sub\}<\/span>\}/);
  // Phương án không được chọn mang lời giải thích thì không bị mờ xuống 0,55.
  assert.match(mcq, /opacity: opt\.sub \? 0\.8 : 0\.55/);

  const screens = join(FE, 'src', 'components', 'python-studio', 'screens');
  for (const f of ['McqScreen.tsx', 'PredictScreen.tsx']) {
    const src = doc(join(screens, f));
    assert.match(src, /sub: checked \?/, `${f}: lời giải thích phải hiện SAU khi kiểm tra`);
  }
});

// ──────────────────────────────────── 8. cây mã: nút CHÍNH và nút PHỤ đã đổi

const CTA = doc(join(FE, 'src', 'components', 'python-studio', 'cta.ts'));
const STUDIO = doc(join(FE, 'src', 'components', 'python-studio', 'StudioLesson.tsx'));
const PROGRESS = doc(join(FE, 'src', 'components', 'python-studio', 'useLessonProgress.ts'));
const RECAP = doc(join(FE, 'src', 'components', 'python-studio', 'screens', 'RecapScreen.tsx'));

test('cta.ts: nút CHÍNH sau câu trắc nghiệm sai là ĐI TIẾP, không phải Thử lại', () => {
  // Dòng cũ, nguyên văn, không được còn: nó là nút DUY NHẤT sau một câu sai.
  assert.ok(
    !CTA.includes("if (verdict && !verdict.correct) return { label: 'Thử lại'"),
    'cta.ts còn nhánh cũ "sai → chỉ có Thử lại"',
  );
  const khoi = CTA.slice(CTA.indexOf('if (verdict && !verdict.correct)'));
  const diTiep = khoi.indexOf("action: 'next'");
  const thuLai = khoi.indexOf("action: 'retry'");
  assert.ok(diTiep > 0 && thuLai > 0);
  // Nhánh ĐI TIẾP phải đứng trước, và nó phải gắn với isChoiceScreen.
  assert.ok(diTiep < thuLai, 'nhánh đi tiếp phải là nhánh của câu chọn phương án');
  assert.match(khoi.slice(0, diTiep), /isChoiceScreen\(scr\.kind\)/);
  // Vẫn phải THẤY RÕ là sai: nút đi tiếp giữ tone 'err' và nhãn nói ra.
  assert.match(khoi, /label: 'Đã xem đáp án →', tone: 'err'/);
  // Nhãn của hai nút cùng hiện sau một câu sai phải NGẮN: dưới 560px thanh
  // dưới là flex, nút chính `min-width: 132px` và nút phụ `flex-shrink: 0`,
  // nên hai nhãn dài cùng lúc đẩy thanh tràn ngang trên điện thoại.
  const nhan = [
    ...khoi.slice(0, diTiep).matchAll(/label: '([^']+)'/g),
    ...CTA.slice(CTA.indexOf('export function secondaryCta')).matchAll(/label: '([^']+)'/g),
  ].map((m) => m[1]);
  assert.equal(nhan.length, 2, 'phải đo đúng hai nhãn: nút chính và nút phụ');
  for (const label of nhan) assert.ok(label.length <= 20, `nhãn quá dài cho màn hẹp: ${label}`);
});

test('cta.ts: "Thử lại" còn làm nút PHỤ, và chỉ ở câu chọn phương án', () => {
  assert.match(CTA, /export function secondaryCta/);
  const phu = CTA.slice(CTA.indexOf('export function secondaryCta'));
  assert.match(phu, /if \(!scr \|\| !checked \|\| !verdict \|\| verdict\.correct\) return null/);
  assert.match(phu, /if \(!isChoiceScreen\(scr\.kind\)\) return null/);
  assert.match(phu, /action: 'retry'/);
});

test('StudioLesson.tsx: nút phụ được NỐI, nếu không thì "Thử lại" biến mất hẳn', () => {
  assert.match(STUDIO, /const phu = secondaryCta\(\{/);
  assert.match(STUDIO, /if \(phu\) return doAction\(phu\.action\)/);
  assert.match(STUDIO, /phu\s*\n?\s*\? phu\.label/);
});

test('StudioLesson.tsx: nhánh đi tiếp hỏi markDoneOnNext, không markDone trần', () => {
  assert.match(STUDIO, /if \(scr && markDoneOnNext\(scr, verdict\)\) markDone\(scr\.key\)/);
  assert.ok(
    !STUDIO.includes('if (scr) markDone(scr.key);'),
    'còn dòng markDone trần: câu sai sẽ bị đánh dấu "đã làm đúng"',
  );
  // Thanh tiến độ và màn bị chặn đọc cùng một luật trong lib.
  assert.match(STUDIO, /const reached = maxReachedStep\(screens, d\)/);
  assert.match(STUDIO, /firstUnfinished,/);
});

test('StudioLesson.tsx: điểm bài không còn ghi cứng 100 cho khoá không có mini-game', () => {
  assert.ok(
    !STUDIO.includes('play ? quizPercent(screens, d, boss) : 100'),
    'điểm bài còn là 100 bất kể trả lời đúng sai ở khoá 172 bài',
  );
  assert.match(STUDIO, /function diemBai\(\): number \{\s*\n\s*return quizPercent\(screens, d, boss\);/);
  // Hai chỗ gọi (nộp bài ở sandbox, và nút "Đánh dấu đã hoàn thành") phải dùng
  // CÙNG một hàm — lệch nhau thì một đường gửi 100, một đường gửi điểm thật.
  assert.equal(STUDIO.split('data.complete(diemBai())').length - 1, 2);
});

test('useLessonProgress: award ghi firstTry cho MỌI khoá, chỉ điểm/hiệu ứng mới theo `scored`', () => {
  assert.ok(
    !PROGRESS.includes('if (!scored) return;'),
    'award còn bỏ qua khoá không có mini-game → score.firstTry rỗng → không có trạng thái thứ ba',
  );
  assert.match(PROGRESS, /if \(scored && r\.gained > 0\)/);
});

test('RecapScreen: ô trắc nghiệm của khoá bài đọc đếm theo firstTry, không theo done', () => {
  const khoi = RECAP.slice(RECAP.indexOf('const quizStat'), RECAP.indexOf('return (\n    <Recap'));
  assert.match(khoi, /\$\{firstTry\}\/\$\{graded\.length\}/);
  assert.ok(!/\$\{done\}/.test(khoi), 'ô này dùng done thì bấm "Chọn lại" là về 3/3');
  assert.match(RECAP, /quizStat,/);
  // Và luật tính điểm được nói ra ở phần mô tả.
  assert.match(RECAP, /đúng ngay lần trả lời đầu/);
});

test('băng phản hồi không còn nói "thử lại nhé" ở câu chọn phương án', () => {
  const chrome = doc(join(FE, 'src', 'components', 'python-studio', 'screens', 'chrome.tsx'));
  assert.match(chrome, /isChoiceScreen\(scr\.kind\)/);
  const i = chrome.indexOf('isChoiceScreen(scr.kind)');
  assert.match(chrome.slice(i), /đáp án đúng và lý do của từng phương án/);
});
