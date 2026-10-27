/**
 * Unit test cho LÕI CHẤM BÀI của Python Studio: frontend/src/lib/studio-lesson.ts.
 *
 * Vì sao phải có: chấm bài nằm hoàn toàn ở trình duyệt (xem AGENTS.md — server
 * tin `quizScore` client gửi). Nghĩa là file này là thứ duy nhất quyết định học
 * viên đạt hay không đạt, mà trước đây nó có 0 ca test.
 *
 * Vì sao chạy bằng `node --test` + `.mjs` chứ không thêm Jest/Vitest:
 *  - frontend cố ý KHÔNG có dependency runtime nào; thêm runner là thêm nợ.
 *  - đã có tiền lệ `e2e/unit/forum-xss.test.mjs` chạy bằng Node thuần.
 *  - Node 24 tự bóc kiểu TypeScript, nên import thẳng `studio-lesson.ts` được.
 *    Phải để đuôi `.ts` trong đường dẫn import (Node không tự đoán đuôi); và
 *    phải viết test bằng `.mjs` chứ không `.ts`, vì tsconfig của frontend chưa
 *    bật `allowImportingTsExtensions` — file `.ts` nào viết `from './x.ts'` sẽ
 *    làm `npm run typecheck` đỏ. `.mjs` nằm ngoài `include` của tsconfig.
 *
 * Vì sao fixture là JSON THẬT chứ không phải object tự bịa: bẫy đã ghi trong
 * AGENTS.md — `quizzes.service.spec.ts` từng khẳng định "không bao giờ lộ đáp
 * án" trên fixture `options: ['a','b']`, trong khi dữ liệu thật là mảng object
 * mang cờ `correct`, nên lỗ lộ đáp án sống sót qua mọi lần chạy test. Ở đây mọi
 * ca đều nạp từ scripts/pe-v3/out{,-advanced}/lessons/*.json — đúng cái mà
 * build.py sinh ra và seed đẩy vào `lessons.content_json`.
 *
 * Bằng chứng bộ test này bắt được lỗi thật (quy ước AGENTS.md: gỡ bản sửa ra,
 * test phải trượt). Sửa tay `quizPercent` trong studio-lesson.ts, đổi trần khi
 * học viên mở gợi ý ở cửa boss từ 60 thành 80:
 *     -  if (d.assisted) pct = Math.min(pct, boss ? 60 : 80);
 *     +  if (d.assisted) pct = Math.min(pct, boss ? 80 : 80);
 * → đúng 1/32 ca trượt, không ca nào khác nhiễu:
 *     ✖ quizPercent: mở gợi ý thì bị chặn trần 80, ở cửa boss là 60
 *       AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
 *       80 !== 60
 * Đây là lỗi có hậu quả thật: cửa boss bị nới trần điểm thì học viên mở hết gợi
 * ý vẫn ăn XP như tự làm.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EMPTY_SCORE,
  READ_BLOCK_TYPES,
  SELF_EXPLAIN_MIN,
  buildScreens,
  correctIndex,
  gameAnswered,
  gameOf,
  gameVerdict,
  initialLessonDraft,
  isGraded,
  letterKey,
  parsonsCode,
  quizPercent,
  sameTraceValue,
  scoreCheck,
  screenVerdict,
} from '../../src/lib/studio-lesson.ts';

// ─────────────────────────────────────────────────────────── nạp dữ liệu thật

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const bundleDir = (bundle) => join(ROOT, 'scripts', 'pe-v3', bundle, 'lessons');

/** `content_json` của một bài — đúng cột mà frontend nhận từ API. */
function lesson(bundle, file) {
  return JSON.parse(readFileSync(join(bundleDir(bundle), file), 'utf8')).content_json;
}

function allLessons(bundle) {
  return readdirSync(bundleDir(bundle))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f, lesson(bundle, f)]);
}

const V1 = allLessons('out'); // khoá `python` — luồng S1–S4
const V2 = allLessons('out-advanced'); // khoá `python_advanced` — có khối `play`

/**
 * Khoá python_advanced ĐANG CHẠY THẬT: 48 bài của pe-v4 (xem memory pe-v4-pipeline).
 * Chỉ bộ này có `step_1.theory`, nên mọi ca về màn lý thuyết phải đọc từ đây.
 */
const v4Dir = join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons');
const V4 = readdirSync(v4Dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => [f, JSON.parse(readFileSync(join(v4Dir, f), 'utf8')).content_json]);

const b01 = lesson('out', '001-B01.json');
const b01play = lesson('out-advanced', '001-B01.json');
const b04play = lesson('out-advanced', '004-B04.json'); // bài duy nhất có traceTable
const n01play = lesson('out-advanced', '033-N01.json'); // fill + debug + selfExplain
const b20boss = lesson('out-advanced', '020-B20.json'); // cửa tự kiểm tra (boss)

const draftOf = (l, over = {}) => ({ ...initialLessonDraft(l), ...over });

/**
 * Đáp án đúng đọc TRỰC TIẾP từ cờ `correct` trong JSON — cố ý KHÔNG gọi
 * correctIndex() của file đang test. Nếu dùng correctIndex() làm chuẩn so sánh
 * thì test tự quay vòng: đổi correctIndex thành `return 0` vẫn xanh (đã thử).
 */
function answerIndex(q) {
  const i = q.options.findIndex((o) => typeof o === 'object' && o.correct === true);
  assert.ok(i >= 0, 'câu MCQ trong dữ liệu không có lựa chọn nào mang correct: true');
  return i;
}
const screenByKey = (screens, key) => {
  const s = screens.find((x) => x.key === key);
  assert.ok(s, `không có màn ${key}`);
  return s;
};

/**
 * Dựng một câu có ĐÚNG `nWords` từ và ĐÚNG `totalChars` ký tự, để đặt ngưỡng
 * tự giải thích ngay sát mép. Tự kiểm lại chính nó: nếu công thức sai thì ca
 * test ngưỡng sẽ vô nghĩa, nên thà nổ ngay ở đây.
 */
function sentence(nWords, totalChars) {
  const letters = totalChars - (nWords - 1);
  assert.ok(letters >= nWords, 'không dựng được câu với tham số đó');
  const base = Math.floor(letters / nWords);
  const extra = letters % nWords;
  const s = Array.from({ length: nWords }, (_, i) => 'x'.repeat(base + (i < extra ? 1 : 0))).join(' ');
  assert.equal(s.length, totalChars);
  assert.equal(s.trim().split(/\s+/).filter(Boolean).length, nWords);
  return s;
}

// ───────────────────────────────────── 0. fixture có đúng hình dạng thật không
//
// Nhóm này không test logic — nó bảo vệ các nhóm dưới. Nếu build.py đổi hình
// dạng dữ liệu, các assert dưới đây đỏ TRƯỚC, thay vì để cả bộ test tiếp tục
// xanh trên dữ liệu không còn tồn tại (đúng bẫy đã ghi trong AGENTS.md).

test('fixture: 40 bài v1 và 40 bài v2, đúng schema', () => {
  assert.equal(V1.length, 40);
  assert.equal(V2.length, 40);
  for (const [f, l] of V1) {
    assert.equal(l.schema, 'studio-lesson/v1', f);
    assert.equal(l.play, undefined, `${f}: bài v1 không được có khối play`);
  }
  for (const [f, l] of V2) {
    assert.equal(l.schema, 'studio-lesson/v2', f);
    assert.ok(l.play?.games?.length, `${f}: bài v2 phải có ít nhất 1 mini-game`);
  }
});

test('fixture: mỗi lựa chọn MCQ là OBJECT mang cờ correct, không phải chuỗi', () => {
  // Chính chỗ này là nơi fixture giả đã từng lừa được cả bộ test.
  let total = 0;
  for (const [f, l] of [...V1, ...V2]) {
    for (const [i, q] of (l.step_2?.mcq ?? []).entries()) {
      total++;
      assert.ok(q.options.length >= 2, `${f} mcq#${i}: cần >= 2 lựa chọn`);
      for (const o of q.options) {
        assert.equal(typeof o, 'object', `${f} mcq#${i}: lựa chọn phải là object`);
        assert.equal(typeof o.text, 'string');
      }
      assert.equal(
        q.options.filter((o) => o.correct === true).length,
        1,
        `${f} mcq#${i}: phải có đúng 1 đáp án đúng`,
      );
      // Hai cách khai đáp án (`correct: <số>` và cờ trên option) phải trùng nhau,
      // nếu không correctIndex() sẽ ưu tiên con số và chấm theo đáp án khác.
      assert.equal(correctIndex(q), answerIndex(q), `${f} mcq#${i}: correct lệch cờ option`);
    }
  }
  assert.ok(total >= 40, `đếm được ${total} câu MCQ — ít bất thường`);
});

test('fixture: đáp án đúng KHÔNG luôn đứng đầu (hồi quy xáo lựa chọn)', () => {
  // Trước bản sửa "xáo thứ tự lựa chọn", mọi correctIndex đều là 0 — học viên
  // bấm A là qua hết. Giữ ca này để bản sửa không bị gỡ im lặng.
  const all = [...V1, ...V2].flatMap(([, l]) => (l.step_2?.mcq ?? []).map(answerIndex));
  assert.ok(all.length > 0);
  assert.ok(new Set(all).size > 1, `mọi đáp án đúng đều ở vị trí ${all[0]}`);
  assert.ok(all.some((i) => i > 0));
});

test('fixture: không bài nào khai rubric cho ô tự giải thích', () => {
  // Hệ quả: nhánh chấm selfExplain đang chạy thật trong production LUÔN là
  // nhánh ngưỡng SELF_EXPLAIN_MIN, không phải nhánh rubric. Nhóm 4 test nhánh đó.
  for (const [f, l] of [...V1, ...V2])
    assert.equal(l.step_2?.selfExplain?.rubric, undefined, `${f} đã khai rubric`);
});

// ─────────────────────────────────────────────── 1. dựng danh sách màn hình

test('buildScreens: bài v1 trải đủ luồng S1→S4 rồi tới tổng kết', () => {
  const keys = buildScreens(b01).map((s) => s.key);
  assert.deepEqual(keys, [
    's1-brief',
    's1-explain',
    's1-misconception',
    's1-predict',
    's2-mcq-0',
    's2-mcq-1',
    's2-self',
    's3-scaffold',
    's3-trace',
    's3-counter',
    's4-sandbox',
    'recap',
  ]);
  // Bài v1 không có mini-game nào — nếu lọt màn 'game' là buildScreens đã chọn
  // nhầm nhánh play cho khoá `python`.
  assert.equal(
    buildScreens(b01).filter((s) => s.kind === 'game').length,
    0,
  );
});

test('buildScreens: bài v2 đi luồng mini-game, bỏ MCQ/scaffold/ngộ nhận', () => {
  const screens = buildScreens(b01play);
  assert.deepEqual(screens.map((s) => s.key), [
    's1-brief',
    's1-explain',
    's1-predict',
    'g-match-0',
    'g-parsons-1',
    'g-spotError-2',
    's4-sandbox',
    'recap',
  ]);
  // step_2.mcq vẫn còn trong dữ liệu (quiz ôn tập đọc nó) nhưng KHÔNG được
  // thành màn ở khoá advanced.
  assert.ok(b01play.step_2.mcq.length > 0);
  assert.equal(screens.filter((s) => s.kind === 'mcq').length, 0);

  for (const s of screens.filter((x) => x.kind === 'game')) {
    const g = gameOf(b01play, s);
    assert.ok(g, `${s.key}: gameOf không tìm được game`);
    assert.equal(g.id, s.gameId);
    assert.equal(g.type, s.gameType);
  }
});

test('buildScreens: cửa tự kiểm tra (boss) bỏ giải thích và dự đoán', () => {
  assert.equal(b20boss.play.boss, true);
  const keys = buildScreens(b20boss).map((s) => s.key);
  assert.deepEqual(keys, ['s1-brief', 'g-trueFalse-0', 'g-spotError-1', 's4-sandbox', 'recap']);
  // Dữ liệu VẪN có explain + predict — việc bỏ là do cờ boss, không do thiếu dữ liệu.
  assert.ok(b20boss.step_1.explain.length > 0);
  assert.ok(b20boss.step_1.predict.options.length >= 2);
});

test('buildScreens: màn lý thuyết đứng TRƯỚC đề bài, rồi mới tới explain', () => {
  // Thứ tự này là một thay đổi CÓ Ý: trước đây bài mở ra bằng brief ("NHIỆM VỤ",
  // "DỰ ĐOÁN", khung main.py) rồi mới tới "S1 · LÝ THUYẾT" — người gặp
  // process/thread/widget lần đầu bị đòi viết code trước khi được kể đó là gì.
  // Ca này chốt lại thứ tự mới để nó không bị đảo lại trong một lần dọn code.
  //
  // Dữ liệu thật của khoá pe-v4 (M1–M3 có theory, M4–M8 không) — xem AGENTS.md:
  // fixture tự bịa thì test không chứng minh được gì.
  const p01 = JSON.parse(
    readFileSync(join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons', '001-P01.json'), 'utf8'),
  ).content_json;
  assert.ok(p01.step_1.theory.length >= 3, 'P01 phải có 3–5 khối lý thuyết');
  assert.ok(p01.step_1.figure.src.endsWith('.svg'));
  const keys = buildScreens(p01).map((s) => s.key);
  assert.equal(keys[0], 's1-theory', 'lý thuyết phải là màn ĐẦU TIÊN của bài');
  assert.equal(keys[1], 's1-brief');
  assert.ok(keys.indexOf('s1-theory') < keys.indexOf('s1-explain'));
  // Dữ liệu CÓ cả brief và theory — nếu một trong hai biến mất thì ca trên chỉ
  // đang nói về một bài thiếu dữ liệu, không nói gì về thứ tự.
  assert.ok(p01.step_1.brief.task);

  // Cả 20 bài có theory đều phải mở bằng màn lý thuyết, không riêng P01. Chốt
  // mốc DƯỚI chứ không phải con số chính xác: M4–M8 có thể được viết lý thuyết
  // sau, và thêm lý thuyết cho một bài không được làm ca này đỏ. Mốc dưới vẫn
  // đủ để vòng lặp bên dưới không rỗng (ca test rỗng thì xanh mà vô nghĩa).
  assert.ok(
    V4.filter(([, l]) => l.step_1?.theory?.length).length >= 20,
    'bộ pe-v4 phải có ít nhất 20 bài khai lý thuyết',
  );
  for (const [f, l] of V4)
    if (l.step_1?.theory?.length) {
      const k = buildScreens(l).map((s) => s.key);
      assert.equal(k[0], 's1-theory', `${f}: bài có lý thuyết mà không mở bằng lý thuyết`);
      assert.ok(k.indexOf('s1-theory') < k.indexOf('s1-brief'), `${f}: lý thuyết đứng sau đề bài`);
    }

  // Bài M4–M8 không khai theory thì KHÔNG được mọc thêm màn.
  const m01 = JSON.parse(
    readFileSync(join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons', '041-M01.json'), 'utf8'),
  ).content_json;
  assert.equal(m01.step_1.theory, undefined);
  assert.ok(!buildScreens(m01).some((s) => s.kind === 'theory'));
  assert.equal(buildScreens(m01).map((s) => s.key)[0], 's1-brief');
});

test('buildScreens: game debug thuộc S4 (sandbox), các game khác thuộc S3', () => {
  const screens = buildScreens(n01play);
  assert.equal(screenByKey(screens, 'g-debug-3').origin, 4);
  assert.equal(screenByKey(screens, 'g-match-0').origin, 3);
  assert.equal(screenByKey(screens, 'g-selfExplain-4').origin, 3);
});

test('buildScreens: mọi bài đều có khoá màn duy nhất và kết bằng recap', () => {
  for (const [f, l] of [...V1, ...V2]) {
    const screens = buildScreens(l);
    assert.ok(screens.length > 1, `${f}: không dựng được màn nào`);
    assert.equal(screens.at(-1).kind, 'recap', `${f}: màn cuối phải là recap`);
    assert.equal(new Set(screens.map((s) => s.key)).size, screens.length, `${f}: khoá màn trùng`);
    assert.ok(screens.filter((s) => isGraded(s.kind)).length > 0, `${f}: không có màn nào được chấm`);
  }
});

test('initialLessonDraft: nạp sẵn starterCode và điểm rỗng', () => {
  const d = initialLessonDraft(b01);
  assert.equal(d.code, b01.step_4.starterCode);
  assert.notEqual(d.code, '');
  assert.deepEqual(d.score, EMPTY_SCORE);
  assert.equal(d.submitted, false);
  assert.equal(d.assisted, false);
  // Bài quy trình không có starterCode thì draft.code phải là '' chứ không undefined.
  assert.equal(initialLessonDraft({}).code, '');
});

// ──────────────────────────────────────────────────────── 2. chấm MCQ thật

test('screenVerdict/mcq: đáp án đúng của MỌI câu trong 40 bài v1 đều chấm đúng', () => {
  for (const [f, l] of V1) {
    const screens = buildScreens(l);
    for (const scr of screens.filter((s) => s.kind === 'mcq')) {
      const q = l.step_2.mcq[scr.index];
      const d = draftOf(l, { mcq: { [scr.index]: letterKey(answerIndex(q)) } });
      const v = screenVerdict(l, scr, d);
      assert.equal(v.correct, true, `${f} ${scr.key}: đáp án đúng bị chấm sai`);
    }
  }
});

test('screenVerdict/mcq: MỌI lựa chọn sai đều bị chấm sai', () => {
  for (const [f, l] of V1) {
    for (const scr of buildScreens(l).filter((s) => s.kind === 'mcq')) {
      const q = l.step_2.mcq[scr.index];
      const answer = answerIndex(q);
      for (let i = 0; i < q.options.length; i++) {
        if (i === answer) continue;
        const d = draftOf(l, { mcq: { [scr.index]: letterKey(i) } });
        assert.equal(
          screenVerdict(l, scr, d).correct,
          false,
          `${f} ${scr.key}: lựa chọn ${letterKey(i)} (sai) lại được chấm đúng`,
        );
      }
    }
  }
});

test('screenVerdict/mcq: lựa chọn ngoài phạm vi trả `correct: false`, KHÔNG ném', () => {
  // ĐÃ SỬA 27/10/2026. Ca này trước đây tên là "KHIẾM KHUYẾT ĐÃ BIẾT" và nó
  // khoá đúng hành vi NÉM: `screenVerdict` tính `picked = keyIndex(...)` rồi gọi
  // `optionDetail(q.options[picked])`, nên picked ngoài [0, options.length) cho
  // `undefined` và `optionDetail` đọc `o.detail` → TypeError, màn bài TRẮNG.
  //
  // Hai nguồn picked xấu, cả hai nay đều ra `correct: false`:
  //   · chưa chọn gì — `keyIndex('')` = -1, mà `Number.isInteger(-1)` là TRUE
  //     nên nhánh bảo vệ duy nhất không chặn được. Nay điều kiện là `picked >= 0`.
  //   · nháp cũ trong localStorage giữ khoá của bản bài có NHIỀU lựa chọn hơn;
  //     dựng lại giáo trình làm số lựa chọn giảm thì học viên đó mở bài là
  //     crash, mãi mãi, vì nháp được nạp lại mỗi lần vào. Nay `optionDetail`
  //     nhận `undefined` — nó vốn trả `string | undefined` nên không mất gì.
  //
  // Vì sao sửa BÂY GIỜ: hàng rào duy nhất trước đây là nút "Kiểm tra" bị disable
  // bởi `answered()`, và nó không chặn được nháp cũ. Tới 27/10 thì 172 bài mỗi
  // bài có 3 màn trắc nghiệm, tức đường đi này thành đường đi CHÍNH của sản
  // phẩm chứ không còn là ngõ cụt của 48 bài đã ẩn.
  const scr = screenByKey(buildScreens(b01), 's2-mcq-0');
  const n = b01.step_2.mcq[0].options.length;
  for (const nhap of [
    draftOf(b01),                                   // chưa chọn gì
    draftOf(b01, { mcq: { 0: '' } }),               // khoá rỗng
    draftOf(b01, { mcq: { 0: letterKey(n) } }),     // vừa quá cuối mảng
    draftOf(b01, { mcq: { 0: 'z' } }),              // nháp cũ, khoá lạ
  ]) {
    const v = screenVerdict(b01, scr, nhap);
    assert.equal(v.correct, false);
    // Và vẫn phải NÓI được điều gì: rơi về giải thích của câu, hoặc của đáp án
    // đúng. Trả `explain: undefined` là học viên thấy một dấu X không lời.
    assert.equal(typeof v.explain, 'string');
  }

  // Màn dự đoán vốn đã xử lý đúng cách — giữ lại làm mốc đối chiếu.
  const pScr = screenByKey(buildScreens(b01), 's1-predict');
  assert.equal(screenVerdict(b01, pScr, draftOf(b01)).correct, false);
  assert.equal(screenVerdict(b01, pScr, draftOf(b01, { predict: 'z' })).correct, false);
});

test('screenVerdict/mcq: giải thích lấy theo lựa chọn ĐÃ bấm, không phải đáp án đúng', () => {
  // Học viên bấm sai phải đọc được "vì sao lựa chọn CỦA MÌNH sai".
  const scr = screenByKey(buildScreens(b01), 's2-mcq-0');
  const q = b01.step_2.mcq[0];
  const wrong = q.options.findIndex((o) => !o.correct && o.detail);
  assert.ok(wrong >= 0, 'bài B01 phải có lựa chọn sai kèm detail');
  const v = screenVerdict(b01, scr, draftOf(b01, { mcq: { 0: letterKey(wrong) } }));
  assert.equal(v.correct, false);
  assert.equal(v.explain, q.options[wrong].detail);
});

test('screenVerdict/predict: chấm theo cờ correct của lựa chọn thật', () => {
  for (const [f, l] of V1) {
    const options = l.step_1.predict.options;
    const right = options.findIndex((o) => o.correct);
    assert.ok(right >= 0, `${f}: câu dự đoán không có đáp án đúng`);
    const scr = screenByKey(buildScreens(l), 's1-predict');
    assert.equal(screenVerdict(l, scr, draftOf(l, { predict: letterKey(right) })).correct, true, f);
    for (let i = 0; i < options.length; i++)
      if (i !== right)
        assert.equal(
          screenVerdict(l, scr, draftOf(l, { predict: letterKey(i) })).correct,
          false,
          `${f}: lựa chọn ${letterKey(i)} sai mà chấm đúng`,
        );
  }
});

test('screenVerdict/counter + scaffold: dùng đáp án thật của bài B01', () => {
  const screens = buildScreens(b01);
  const counter = b01.step_3.counter;
  const right = counter.options.indexOf(counter.correct);
  assert.ok(right >= 0);
  const scrC = screenByKey(screens, 's3-counter');
  assert.equal(screenVerdict(b01, scrC, draftOf(b01, { counter: letterKey(right) })).correct, true);
  assert.equal(
    screenVerdict(b01, scrC, draftOf(b01, { counter: letterKey((right + 1) % counter.options.length) }))
      .correct,
    false,
  );

  const slots = b01.step_3.scaffold.slots;
  const scrS = screenByKey(screens, 's3-scaffold');
  const filled = Object.fromEntries(slots.map((s) => [s.n, s.answer]));
  assert.equal(screenVerdict(b01, scrS, draftOf(b01, { slots: filled })).correct, true);
  // Thiếu một ô: phải sai, và phải chỉ ra ô nào.
  const partial = { ...filled };
  delete partial[slots[0].n];
  const v = screenVerdict(b01, scrS, draftOf(b01, { slots: partial }));
  assert.equal(v.correct, false);
  assert.match(v.explain, new RegExp(`Slot ${slots[0].n}`));
});

// ──────────────────────────────────── 3. ngưỡng ô tự giải thích (SELF_EXPLAIN_MIN)

test('screenVerdict/selfExplain: hai điều kiện chars VÀ words, kiểm ngay sát mép', () => {
  const scr = screenByKey(buildScreens(b01), 's2-self');
  const { chars, words } = SELF_EXPLAIN_MIN;
  const verdict = (text) => screenVerdict(b01, scr, draftOf(b01, { explanation: text })).correct;

  // Đủ từ, thiếu 1 ký tự → chưa đạt.
  assert.equal(verdict(sentence(words, chars - 1)), false);
  // Đủ từ, đúng đủ ký tự → đạt (mép dưới của cả hai điều kiện).
  assert.equal(verdict(sentence(words, chars)), true);
  // Thiếu 1 từ nhưng dư ký tự → vẫn chưa đạt (điều kiện AND, không phải OR).
  assert.equal(verdict(sentence(words - 1, chars + 40)), false);
  // Dư cả hai → đạt.
  assert.equal(verdict(sentence(words + 5, chars + 40)), true);
});

test('screenVerdict/selfExplain: gõ cho có thì bị chặn, và khoảng trắng không tính là từ', () => {
  const scr = screenByKey(buildScreens(b01), 's2-self');
  const verdict = (text) => screenVerdict(b01, scr, draftOf(b01, { explanation: text })).correct;
  assert.equal(verdict(''), false);
  assert.equal(verdict('   \n\t  '), false);
  assert.equal(verdict('ok'), false);
  // Một chuỗi dài nhưng chỉ 1 từ: vượt mốc ký tự, vẫn phải trượt mốc từ.
  assert.equal(verdict('x'.repeat(SELF_EXPLAIN_MIN.chars + 50)), false);
  // Nhiều khoảng trắng liền nhau không được đếm thành nhiều từ.
  const padded = Array.from({ length: SELF_EXPLAIN_MIN.words }, () => 'xxxxx').join('     ');
  assert.ok(padded.length > SELF_EXPLAIN_MIN.chars);
  assert.equal(verdict(padded), true);
  const faked = Array.from({ length: SELF_EXPLAIN_MIN.words - 1 }, () => 'xxxxx').join('          ');
  assert.ok(faked.length > SELF_EXPLAIN_MIN.chars);
  assert.equal(verdict(faked), false);
});

test('screenVerdict/selfExplain: đạt rồi mới được đối chiếu lời giải thích mẫu', () => {
  // Chống lộ đáp án: `sample` là lời giải mức 2/2, chỉ hiện SAU khi học viên viết.
  const scr = screenByKey(buildScreens(b01), 's2-self');
  const sample = b01.step_2.selfExplain.sample;
  assert.ok(sample && sample.length > 50, 'B01 phải có lời giải thích mẫu');
  const tooShort = screenVerdict(b01, scr, draftOf(b01, { explanation: 'ngắn quá' }));
  assert.equal(tooShort.correct, false);
  assert.ok(!tooShort.explain.includes(sample), 'lời giải mẫu bị lộ khi chưa đạt ngưỡng');
  const ok = screenVerdict(
    b01,
    scr,
    draftOf(b01, { explanation: sentence(SELF_EXPLAIN_MIN.words, SELF_EXPLAIN_MIN.chars) }),
  );
  assert.equal(ok.correct, true);
  assert.ok(ok.explain.includes(sample));
});

test('gameVerdict/selfExplain: bài v2 dùng play.selfExplainMinWords, không có mốc ký tự', () => {
  const min = n01play.play.selfExplainMinWords;
  assert.equal(min, 8, 'build_advanced.py đang sinh mốc 8 từ');
  const game = n01play.play.games.find((g) => g.type === 'selfExplain');
  const verdict = (text) => gameVerdict(n01play, game, draftOf(n01play, { explanation: text }));
  assert.equal(verdict(sentence(min - 1, 300)).correct, false);
  assert.equal(verdict(sentence(min, 300)).correct, true);
  // Ghi lại một khác biệt CÓ THẬT giữa hai nhánh: nhánh v2 không có mốc ký tự,
  // nên 8 từ một chữ cũng qua. Nếu sau này siết lại thì ca này phải đổi có ý thức.
  assert.equal(verdict(sentence(min, min * 2 - 1)).correct, true);
  assert.match(verdict('ngắn').explain, /ít nhất 8 từ/);
  // Chưa viết gì thì nút "Kiểm tra" chưa được mở.
  assert.equal(gameAnswered(n01play, game, draftOf(n01play)), false);
  assert.equal(gameAnswered(n01play, game, draftOf(n01play, { explanation: 'a' })), true);
});

// ────────────────────────────────────────────── 4. chấm mini-game trên dữ liệu thật

test('gameVerdict/traceTable: điền đúng mọi ô mới đạt, sai thì đếm đúng số ô', () => {
  const game = b04play.play.games.find((g) => g.type === 'traceTable');
  assert.ok(Object.keys(game.answers).length >= 2);
  const right = { ...game.answers };
  const d = draftOf(b04play, { games: { [game.id]: { cells: right } } });
  assert.equal(gameAnswered(b04play, game, d), true);
  assert.equal(gameVerdict(b04play, game, d).correct, true);

  const keys = Object.keys(game.answers);
  const broken = { ...right, [keys[0]]: 'sai-hoan-toan' };
  const bad = gameVerdict(b04play, game, draftOf(b04play, { games: { [game.id]: { cells: broken } } }));
  assert.equal(bad.correct, false);
  assert.match(bad.explain, /Còn 1 ô/);
  // Bỏ trống thì chưa được bấm Kiểm tra.
  assert.equal(gameAnswered(b04play, game, draftOf(b04play, { games: { [game.id]: { cells: {} } } })), false);
});

test('sameTraceValue: bỏ nháy, gộp khoảng trắng, không phân biệt hoa thường', () => {
  // repr Python trong dữ liệu là "'noon'" — học viên gõ noon cũng phải tính đúng.
  assert.equal(sameTraceValue("'noon'", "'noon'"), true);
  assert.equal(sameTraceValue('noon', "'noon'"), true);
  assert.equal(sameTraceValue('  NOON  ', "'noon'"), true);
  assert.equal(sameTraceValue('true', 'True'), true);
  assert.equal(sameTraceValue('False', 'True'), false);
  assert.equal(sameTraceValue('', "'noon'"), false);
  assert.equal(sameTraceValue("'no on'", "'no  on'"), true);
});

test('gameVerdict/trueFalse: đúng hết mới đạt, nêu rõ phát biểu nào sai', () => {
  const game = b20boss.play.games.find((g) => g.type === 'trueFalse');
  const allRight = Object.fromEntries(game.items.map((it, i) => [i, it.answer ? 'true' : 'false']));
  const d = draftOf(b20boss, { games: { [game.id]: { tf: allRight } } });
  assert.equal(gameAnswered(b20boss, game, d), true);
  assert.equal(gameVerdict(b20boss, game, d).correct, true);

  for (let i = 0; i < game.items.length; i++) {
    const flipped = { ...allRight, [i]: allRight[i] === 'true' ? 'false' : 'true' };
    const v = gameVerdict(b20boss, game, draftOf(b20boss, { games: { [game.id]: { tf: flipped } } }));
    assert.equal(v.correct, false, `lật câu ${i} mà vẫn chấm đúng`);
    assert.ok(v.explain.includes(game.items[i].statement));
  }
  // Còn câu chưa chọn → chưa được bấm Kiểm tra.
  const partial = { ...allRight };
  delete partial[0];
  assert.equal(gameAnswered(b20boss, game, draftOf(b20boss, { games: { [game.id]: { tf: partial } } })), false);
});

test('gameVerdict/spotError: chỉ dòng trong khối lỗi được tính đúng', () => {
  const game = n01play.play.games.find((g) => g.type === 'spotError');
  const hits = game.lines?.length ? game.lines : [game.line];
  for (const line of hits)
    assert.equal(gameVerdict(n01play, game, draftOf(n01play, { games: { [game.id]: { line } } })).correct, true);

  const totalLines = game.code.split('\n').length;
  for (let line = game.firstLine; line < game.firstLine + totalLines; line++) {
    if (hits.includes(line)) continue;
    assert.equal(
      gameVerdict(n01play, game, draftOf(n01play, { games: { [game.id]: { line } } })).correct,
      false,
      `dòng ${line} đúng mà bị chấm là lỗi`,
    );
  }
  assert.equal(gameAnswered(n01play, game, draftOf(n01play)), false);
});

test('gameVerdict/fill: khớp slots thật mới đạt; chọn thẻ bẫy thì hiện lý do', () => {
  const game = n01play.play.games.find((g) => g.type === 'fill');
  const slots = n01play.step_3.scaffold.slots;
  const filled = Object.fromEntries(slots.map((s) => [s.n, s.answer]));
  const d = draftOf(n01play, { slots: filled });
  assert.equal(gameAnswered(n01play, game, d), true);
  assert.equal(gameVerdict(n01play, game, d).correct, true);

  const trap = n01play.step_3.scaffold.bank.find((b) => b.trap);
  assert.ok(trap, 'N01 phải có thẻ bẫy trong bank');
  const v = gameVerdict(n01play, game, draftOf(n01play, { slots: { ...filled, [trap.slot]: trap.label } }));
  assert.equal(v.correct, false);
  assert.ok(v.explain.includes(trap.trap), `giải thích không nêu bẫy: ${v.explain}`);
});

test('gameVerdict/match: nối sai bị chặn tại chỗ nên đủ cặp là đạt, nhưng đếm số lần nhầm', () => {
  const game = b01play.play.games.find((g) => g.type === 'match');
  const half = { 0: 0 };
  assert.equal(gameAnswered(b01play, game, draftOf(b01play, { games: { [game.id]: { matched: half } } })), false);
  const full = Object.fromEntries(game.pairs.map((_, i) => [i, i]));
  const d = draftOf(b01play, { games: { [game.id]: { matched: full, misses: 2 } } });
  assert.equal(gameAnswered(b01play, game, d), true);
  const v = gameVerdict(b01play, game, d);
  assert.equal(v.correct, true);
  assert.match(v.explain, /2 lần nhầm/);
});

test('parsonsCode: ghép đúng thứ tự dòng, không lẫn dòng nhiễu', () => {
  const game = b01play.play.games.find((g) => g.type === 'parsons');
  const inOrder = game.lines.map((l) => l.id);
  const expected = [game.head, game.lines.map((l) => l.text).join('\n'), game.tail]
    .filter((p) => p !== '')
    .join('\n') + '\n';
  assert.equal(parsonsCode(game, inOrder), expected);
  // Mọi dòng của lời giải phải xuất hiện, dòng nhiễu thì không.
  for (const l of game.lines) assert.ok(parsonsCode(game, inOrder).includes(l.text));
  for (const d of game.distractors) assert.ok(!parsonsCode(game, inOrder).includes(d.text));
  // Id lạ không được làm hỏng chương trình (thành dòng rỗng, không ném lỗi).
  assert.equal(typeof parsonsCode(game, ['khong-ton-tai']), 'string');
  // parsons/debug chấm bằng CHẠY code → gameVerdict đồng bộ phải trả null.
  assert.equal(gameVerdict(b01play, game, draftOf(b01play)), null);
});

// ────────────────────────────────── 5. cộng điểm và tỉ lệ đúng-ngay-lần-đầu

test('scoreCheck: đúng lần đầu +10, chuỗi từ 3 thì +20, sửa rồi đúng +5', () => {
  let s = EMPTY_SCORE;
  const hit = (key) => {
    const r = scoreCheck(s, key, true);
    s = r.score;
    return r.gained;
  };
  assert.equal(hit('a'), 10);
  assert.equal(hit('b'), 10);
  assert.equal(hit('c'), 20); // chuỗi đạt 3
  assert.equal(s.points, 40);
  assert.equal(s.combo, 3);
  assert.equal(s.bestCombo, 3);

  // Sai một màn: mất chuỗi, firstTry ghi false, không cộng điểm.
  const missed = scoreCheck(s, 'd', false);
  assert.equal(missed.gained, 0);
  assert.equal(missed.score.combo, 0);
  assert.equal(missed.score.firstTry.d, false);
  assert.equal(missed.score.attempts.d, 1);

  // Sửa rồi đúng: +5, và firstTry.d PHẢI vẫn là false (đây là số dùng để tính %).
  const fixed = scoreCheck(missed.score, 'd', true);
  assert.equal(fixed.gained, 5);
  assert.equal(fixed.score.firstTry.d, false);
  assert.equal(fixed.score.points, 45);
  assert.equal(fixed.score.bestCombo, 3, 'chuỗi tốt nhất không được tụt');

  // Bấm Kiểm tra lại ở màn đã đúng ngay lần đầu (xem lại bài) → không cộng thêm.
  const again = scoreCheck(fixed.score, 'a', true);
  assert.equal(again.gained, 0);
  assert.equal(again.score.points, 45);
  assert.equal(again.score.attempts.a, 2);
});

test('quizPercent: tỉ lệ màn đúng ngay lần đầu trên tổng màn ĐƯỢC CHẤM', () => {
  const screens = buildScreens(b01);
  const graded = screens.filter((s) => isGraded(s.kind)).map((s) => s.key);
  // Chốt lại tập màn được chấm của B01 — màn đọc (brief/explain/trace/sandbox)
  // không được vào mẫu số, nếu không % sẽ bị pha loãng.
  assert.deepEqual(graded, ['s1-predict', 's2-mcq-0', 's2-mcq-1', 's2-self', 's3-scaffold', 's3-counter']);

  const pct = (firstTry, over = {}) =>
    quizPercent(screens, draftOf(b01, { score: { ...EMPTY_SCORE, firstTry }, ...over }), false);

  assert.equal(pct({}), 0);
  assert.equal(pct(Object.fromEntries(graded.map((k) => [k, true]))), 100);
  // 3/6 đúng ngay lần đầu, 3 màn còn lại sửa rồi mới đúng → 50, không phải 100.
  assert.equal(
    pct(Object.fromEntries(graded.map((k, i) => [k, i < 3]))),
    50,
  );
  // 5/6 = 83.33 → làm tròn 83.
  assert.equal(pct(Object.fromEntries(graded.map((k, i) => [k, i < 5]))), 83);
  // Màn đọc có firstTry (không nên xảy ra) cũng không được cộng vào tử số.
  assert.equal(pct({ 's4-sandbox': true, recap: true }), 0);
});

test('quizPercent: mở gợi ý thì bị chặn trần 80, ở cửa boss là 60', () => {
  const screens = buildScreens(b01);
  const graded = screens.filter((s) => isGraded(s.kind)).map((s) => s.key);
  const all = Object.fromEntries(graded.map((k) => [k, true]));
  const run = (firstTry, assisted, boss) =>
    quizPercent(screens, draftOf(b01, { score: { ...EMPTY_SCORE, firstTry }, assisted }), boss);

  assert.equal(run(all, false, false), 100);
  assert.equal(run(all, true, false), 80);
  assert.equal(run(all, true, true), 60);
  // Trần là CHẶN TRÊN, không phải điểm sàn: 2/6 = 33 thì vẫn là 33.
  const two = Object.fromEntries(graded.map((k, i) => [k, i < 2]));
  assert.equal(run(two, false, false), 33);
  assert.equal(run(two, true, false), 33);
  // Bài toàn màn đọc (không có màn chấm) thì coi như 100, tránh chia cho 0.
  assert.equal(quizPercent([], draftOf(b01), false), 100);
});

test('đi hết bài B01 v2 như học viên thật: sai một màn thì % không còn 100', () => {
  const lessonV2 = b01play;
  const screens = buildScreens(lessonV2);
  let d = initialLessonDraft(lessonV2);

  const check = (scr) => {
    const v = screenVerdict(lessonV2, scr, d);
    const r = scoreCheck(d.score, scr.key, Boolean(v?.correct));
    d = { ...d, score: r.score };
    return { correct: Boolean(v?.correct), gained: r.gained };
  };

  const predict = screenByKey(screens, 's1-predict');
  const pOptions = lessonV2.step_1.predict.options;
  const pRight = pOptions.findIndex((o) => o.correct);
  const pWrong = pOptions.findIndex((o) => !o.correct);

  // Dự đoán sai trước, rồi sửa đúng — đúng kiểu học viên dùng màn dự đoán.
  d = { ...d, predict: letterKey(pWrong) };
  assert.deepEqual(check(predict), { correct: false, gained: 0 });
  d = { ...d, predict: letterKey(pRight) };
  assert.deepEqual(check(predict), { correct: true, gained: 5 });

  // match: nối đủ cặp.
  const match = screenByKey(screens, 'g-match-0');
  const mGame = gameOf(lessonV2, match);
  d = {
    ...d,
    games: { ...d.games, [mGame.id]: { matched: Object.fromEntries(mGame.pairs.map((_, i) => [i, i])) } },
  };
  assert.deepEqual(check(match), { correct: true, gained: 10 });

  // spotError: chỉ đúng dòng lỗi.
  const spot = screenByKey(screens, 'g-spotError-2');
  const sGame = gameOf(lessonV2, spot);
  d = { ...d, games: { ...d.games, [sGame.id]: { line: sGame.lines?.[0] ?? sGame.line } } };
  assert.deepEqual(check(spot), { correct: true, gained: 10 });

  // parsons chấm bằng Pyodide (ngoài phạm vi unit test) → coi như đúng lần đầu.
  const parsons = screenByKey(screens, 'g-parsons-1');
  assert.equal(screenVerdict(lessonV2, parsons, d), null, 'parsons phải để Pyodide chấm');
  d = { ...d, score: scoreCheck(d.score, parsons.key, true).score };

  const graded = screens.filter((s) => isGraded(s.kind));
  assert.equal(graded.length, 4);
  // 3/4 đúng ngay lần đầu (màn dự đoán đã sai lần đầu) → 75.
  assert.equal(quizPercent(screens, d, Boolean(lessonV2.play.boss)), 75);
  assert.equal(d.score.firstTry['s1-predict'], false);
  // 5 (sửa rồi đúng) + 10 + 10 + 20 (chuỗi đạt 3) = 45.
  assert.equal(d.score.points, 45);
  assert.equal(d.score.bestCombo, 3);
  // Có mở gợi ý: 75 vẫn dưới trần 80 nên không bị hạ thêm.
  assert.equal(quizPercent(screens, { ...d, assisted: true }, false), 75);
});

// ───────────────────── 7. khoá BÀI ĐỌC (step_1.read + step_2.practice)
//
// Khoá python_advanced đổi ruột sang 172 bài giáo trình ĐỌC
// (scripts/pe-da/SCHEMA.md): không trắc nghiệm, không scaffold, không ca kiểm
// thử. Nhóm này chứng minh buildScreens() phát ĐÚNG SỐ màn `read`/`practice`,
// hai loại màn đó KHÔNG được chấm, và ReadScreen biết dựng ĐỦ 5 loại khối.
//
// Fixture là bản dựng THẬT `scripts/pe-da/out/lessons.json` — đúng cái mà bước
// nạp đẩy vào `lessons.content_json`, cùng quy ước với các nhóm trên (bẫy
// AGENTS.md: fixture tự bịa thì test nói dối).
//
// Bằng chứng nhóm này bắt được lỗi thật (quy ước AGENTS.md: gỡ bản sửa ra, test
// phải trượt).
//  (a) Gỡ hai dòng phát màn trong buildScreens() của src/lib/studio-lesson.ts
//      (`(one?.read ?? []).forEach(…)` và `(two?.practice ?? []).forEach(…)`)
//      → 4 ca trượt, đều trong nhóm này:
//        ✖ bài đọc: mỗi lát của step_1.read thành MỘT màn, đúng thứ tự
//          AssertionError: 0 !== 3   (không màn đọc nào được phát)
//        ✖ bài đọc: mỗi câu step_2.practice thành MỘT màn, xếp sau mcq/classify
//        ✖ bài đọc: màn read đứng TRƯỚC mọi màn khác của S1
//        ✖ bài đọc: cả bài không có màn nào được chấm, nên % luôn 100
//      Hậu quả thật: 172 bài đọc mở ra chỉ còn sandbox + tổng kết, toàn bộ nội
//      dung giáo trình không hiện ra màn nào.
//  (b) Trả `READ_BLOCK_TYPES` về bản thiếu hai loại (chỉ paragraph | code |
//      table, đúng bản đặc tả đầu) → 1 ca trượt:
//        ✖ bài đọc: renderer biết dựng ĐỦ 5 loại khối build phát ra
//          AssertionError: Expected values to be strictly deep-equal
//          (thiếu 'figure' và 'terminal')
//      Hậu quả thật: khối figure rơi vào nhánh bảng của Block(), `.headers.map`
//      ném TypeError và 26 bài có hình thành trang trắng. Bỏ hẳn hai loại khỏi
//      `ReadBlock` thì `npm run typecheck` đỏ TRƯỚC cả test — đã kiểm bằng cách
//      thêm một loại thứ sáu chưa có nhánh:
//        ReadScreen.tsx: error TS2322: Type '{ type: "video"; … }' is not
//        assignable to type 'never'.
//  (c) Đổi `.readFigure img` thành dùng lại `.theoryFigure` (có
//      `aspect-ratio: 2 / 1`) → 1 ca trượt:
//        ✖ bài đọc: khối figure KHÔNG dùng lại Figure/CSS của màn lý thuyết
//      Hậu quả thật: 68/80 ảnh là 780×455 (tỉ lệ 1,71), ghim 2/1 là méo hết.

const paBuild = JSON.parse(
  readFileSync(join(ROOT, 'scripts', 'pe-da', 'out', 'lessons.json'), 'utf8'),
);
/** `content_json` của 172 bài đọc — đúng cột mà frontend nhận từ API. */
const DA = paBuild.lessons.map((row) => [row.lesson_code, row.content_json]);
const daBy = (code) => {
  const found = DA.find(([c]) => c === code);
  assert.ok(found, `không có bài ${code} trong bản dựng pe-da`);
  return found[1];
};
const vz01 = daBy('VZ01'); // 3 lát, lát nào cũng có figure
const np02 = daBy('NP02'); // bài DUY NHẤT có khối table
const py02 = daBy('PY02'); // có khối terminal

/** Mọi khối đọc của cả 172 bài, phẳng ra. */
const daBlocks = DA.flatMap(([, l]) => (l.step_1?.read ?? []).flat());

test('fixture bài đọc: bản dựng pe-da đúng hình dạng ReadBlock/PracticeItem', () => {
  assert.equal(DA.length, 172);
  for (const [code, l] of DA) {
    assert.equal(l.schema, 'studio-lesson/v2', code);
    // Bộ này KHÔNG có trắc nghiệm: lối vào quiz ôn tập vì vậy không bao giờ mở
    // được (QuizzesService đòi MIN_POOL = 5 câu lấy từ step_2.mcq).
    assert.equal(l.step_3, undefined, code);
    assert.equal(l.play, undefined, code);
  }
  // `step_4.tests` KHÔNG còn luôn rỗng. Dòng này từng là
  // `assert.equal(l.step_4?.tests, undefined)` cho cả 172 bài, và nó đúng cho
  // tới 26/10/2026 — khi đó khoá không có một ca chấm nào, người học viết code
  // rồi tự so bằng mắt. Nay 124 bài có bài tập được chấm từ
  // scripts/pe-da/source/practice.json. Số 124 và 415 được canh riêng ở
  // practice-contract.test.mjs; ở đây chỉ chốt rằng bài nào CÓ ca chấm thì có
  // đủ khung đề và lời giải mẫu — thiếu một trong hai là bảng ca kiểm thử hiện
  // ra mà không có chỗ viết, hoặc không có thước đo nào chứng minh ca đúng.
  // `step_2.mcq` cũng KHÔNG còn rỗng. Dòng này từng là
  // `assert.equal(l.step_2?.mcq, undefined)` cho cả 172 bài — đúng cho tới
  // 27/10/2026, khi 516 câu trắc nghiệm NGƯỜI VIẾT của gói được rót vào. Trước
  // đó kho quiz ôn tập ở backend (chấm Ở SERVER, không gửi đáp án ra client)
  // rỗng hoàn toàn: 0/172 bài có câu hỏi.
  for (const [code, l] of DA) {
    const mcq = l.step_2?.mcq ?? [];
    assert.equal(mcq.length, 3, code);
    for (const q of mcq) {
      assert.equal(typeof q.question, 'string', code);
      assert.ok(q.options.length >= 2, code);
      // Đúng MỘT đáp án: 0 thì màn không bao giờ đúng được và
      // `firstUnfinished()` chặn nút kết thúc bài; 2 thì `correctIndex()` lấy
      // cái đầu và câu đó chấm sai một nửa học viên.
      assert.equal(correctIndex(q), q.options.findIndex((o) => o.correct === true), code);
      assert.equal(q.options.filter((o) => o.correct === true).length, 1, code);
    }
  }

  const coCa = DA.filter(([, l]) => (l.step_4?.tests ?? []).length);
  assert.ok(coCa.length > 0, 'bản dựng phải có bài tập được chấm');
  for (const [code, l] of coCa) {
    assert.ok(l.step_4.starterCode?.trim(), code);
    assert.ok(l.step_4.solutionCode?.trim(), code);
    // Hợp đồng DỮ LIỆU: `input`/`expected`, không phải `call`/`expect` của
    // pe-v4. Trộn hai dạng thì `contract` chỉ đúng một nửa số ca.
    for (const t of l.step_4.tests) {
      assert.equal('call' in t, false, `${code}: ca dùng hợp đồng biểu thức`);
      assert.ok('input' in t && 'expected' in t, `${code}: ca thiếu input/expected`);
    }
  }
  // Số khối từng loại, đúng con số ghi trong SCHEMA.md. Đây là cái chốt: build
  // đổi hình dạng dữ liệu thì ca này đỏ TRƯỚC, thay vì để các ca dưới tiếp tục
  // xanh trên dữ liệu không còn tồn tại.
  const count = {};
  for (const b of daBlocks) count[b.type] = (count[b.type] ?? 0) + 1;
  assert.deepEqual(count, { paragraph: 738, code: 495, terminal: 21, figure: 80, table: 1 });
  // Câu luyện tập là câu MỞ kèm lời giải mẫu — không có phương án sai nào để
  // so, nên không chấm được. Đây là lý do isGraded('practice') phải là false.
  for (const d of vz01.step_2.practice) {
    assert.equal(typeof d.prompt, 'string');
    assert.equal(typeof d.answer, 'string');
    assert.equal(d.options, undefined);
    assert.equal(d.correct, undefined);
  }
});

test('bài đọc: renderer biết dựng ĐỦ 5 loại khối build phát ra', () => {
  // Nhánh `default: const unhandled: never = block` trong ReadScreen chỉ bắt
  // được lúc typecheck, mà DỮ LIỆU đổi không cần biên dịch lại — nên phải đối
  // chiếu "loại khối build phát ra" với "loại khối renderer khai".
  assert.deepEqual([...READ_BLOCK_TYPES].sort(), [
    'code',
    'figure',
    'paragraph',
    'table',
    'terminal',
  ]);
  const seen = [...new Set(daBlocks.map((b) => b.type))];
  const unhandled = seen.filter((t) => !READ_BLOCK_TYPES.includes(t));
  assert.deepEqual(
    unhandled,
    [],
    `loại khối build phát ra mà ReadScreen không có nhánh: ${unhandled.join(', ')}`,
  );
  // Và ngược lại: không khai loại nào build không bao giờ phát (chết cứng).
  assert.deepEqual([...seen].sort(), [...READ_BLOCK_TYPES].sort());

  // Hình dạng từng loại, vì mỗi nhánh của Block() đọc đúng những khoá này.
  for (const b of daBlocks) {
    if (b.type === 'paragraph') assert.equal(typeof b.text, 'string');
    if (b.type === 'code' || b.type === 'terminal') assert.equal(typeof b.code, 'string');
    if (b.type === 'table') {
      assert.ok(Array.isArray(b.headers) && Array.isArray(b.rows));
      for (const row of b.rows) assert.equal(row.length, b.headers.length);
    }
    if (b.type === 'figure') {
      // PNG cùng miền: khối này hiện bằng <img src> nên file phải có thật,
      // nếu không 26 bài hiện ra ô ảnh vỡ mà không log nào đỏ. `.html` của
      // Plotly (4,7 MB/hình) cố ý KHÔNG được phát ra đây.
      assert.match(b.src, /^\/static\/da\/[\w.-]+\.png$/, b.src);
      assert.ok(
        existsSync(join(ROOT, 'frontend', 'public', b.src.replace(/^\//, ''))),
        `thiếu file ảnh ${b.src}`,
      );
      // `alt` bắt buộc (người không xem được hình), `caption` thì build KHÔNG
      // phát — đó là lý do không dùng lại LessonFigure của màn lý thuyết.
      assert.ok(b.alt && b.alt.length > 0, b.src);
      assert.equal(b.caption, undefined, b.src);
    }
  }
});

test('bài đọc: khối figure KHÔNG dùng lại Figure/CSS của màn lý thuyết', () => {
  // Không render được JSX trong runner này (node --test chỉ bóc kiểu, không
  // biên dịch JSX), nên kiểm ở mức NGUỒN — vẫn bắt đúng hồi quy cần chặn.
  const screen = readFileSync(
    join(ROOT, 'frontend', 'src', 'components', 'python-studio', 'screens', 'ReadScreen.tsx'),
    'utf8',
  );
  assert.equal(
    /from '\.\/TheoryScreen'/.test(screen),
    false,
    'ReadScreen không được import Figure của TheoryScreen: LessonFigure.caption là bắt buộc mà khối figure của bài đọc không có',
  );
  assert.ok(screen.includes('c.readFigure'), 'khối figure phải dùng class .readFigure riêng');
  // Dò lượt DÙNG class (`c.theoryFigure`), không dò chữ "theoryFigure" trần —
  // chú thích trong ReadScreen có nhắc tên đó để giải thích vì sao không dùng.
  assert.equal(screen.includes('c.theoryFigure'), false);

  // Và class riêng đó KHÔNG được ghim tỉ lệ: khổ thật trải từ 676×338 tới
  // 1248×624, ghim 2/1 như .theoryFigure là méo 68/80 ảnh.
  const css = readFileSync(
    join(ROOT, 'frontend', 'src', 'components', 'python-studio', 'studio-chrome.module.css'),
    'utf8',
  );
  const rule = css.match(/\.readFigure img \{[^}]*\}/);
  assert.ok(rule, 'thiếu quy tắc .readFigure img');
  assert.equal(/aspect-ratio/.test(rule[0]), false, rule[0]);
  // Đối chứng: .theoryFigure img THẬT SỰ có ghim — nếu ngày nào nó bỏ đi thì
  // câu "không dùng lại vì nó ghim tỉ lệ" ở trên thành vô nghĩa và phải xem lại.
  const theory = css.match(/\.theoryFigure img \{[^}]*\}/);
  assert.ok(theory && /aspect-ratio: 2 \/ 1/.test(theory[0]));

  // Nút "Xem đáp án" phải có vòng focus: Tab tới mà không thấy mình ở đâu là
  // WCAG 2.4.7. :hover một mình không đủ (đó là tín hiệu của chuột).
  assert.ok(/\.practiceReveal:focus-visible \{[^}]*outline:/.test(css));
});

test('bài đọc: mỗi lát của step_1.read thành MỘT màn, đúng thứ tự', () => {
  // VZ01 (sort_order 74): 3 lát, mỗi lát "paragraph code figure".
  assert.deepEqual(
    vz01.step_1.read.map((slice) => slice.map((b) => b.type).join(' ')),
    ['paragraph code figure', 'paragraph code figure', 'paragraph code figure'],
  );

  const screens = buildScreens(vz01);
  const read = screens.filter((s) => s.kind === 'read');
  assert.equal(read.length, 3);
  assert.deepEqual(
    read.map((s) => s.key),
    ['s1-read-0', 's1-read-1', 's1-read-2'],
  );
  // `index` phải trỏ đúng lát: ReadScreen đọc read[scr.index], lệch một ô là
  // người học đọc nhầm đoạn mà không có gì báo lỗi.
  assert.deepEqual(
    read.map((s) => s.index),
    [0, 1, 2],
  );
  for (const s of read) assert.equal(s.origin, 1);

  // Đúng với CẢ 172 bài, không riêng bài mẫu: số màn đọc = số lát.
  for (const [code, l] of DA)
    assert.equal(
      buildScreens(l).filter((s) => s.kind === 'read').length,
      l.step_1.read.length,
      code,
    );
  // Thêm/bớt lát là thêm/bớt màn, không phải gộp vào một màn đọc dài.
  assert.equal(
    buildScreens({ ...vz01, step_1: { ...vz01.step_1, read: vz01.step_1.read.slice(0, 2) } })
      .filter((s) => s.kind === 'read').length,
    2,
  );
  // Không khai `read` thì không có màn đọc nào — 48 bài pe-v4 vẫn như cũ.
  for (const [f, old] of V4)
    assert.equal(
      buildScreens(old).some((s) => s.kind === 'read'),
      false,
      f,
    );
});

test('bài đọc: mỗi câu step_2.practice thành MỘT màn, xếp sau mcq/classify', () => {
  for (const [code, l] of DA) {
    const practice = buildScreens(l).filter((s) => s.kind === 'practice');
    assert.equal(practice.length, l.step_2?.practice?.length ?? 0, code);
    assert.deepEqual(
      practice.map((s) => [s.key, s.index, s.origin]),
      (l.step_2?.practice ?? []).map((_, i) => [`s2-practice-${i}`, i, 2]),
      code,
    );
  }

  // Bài trộn cả hai: phần ĐƯỢC CHẤM làm trước, phần tự viết làm sau.
  const mixed = {
    ...vz01,
    step_2: { mcq: b01.step_2.mcq, classify: b01.step_2.classify, practice: vz01.step_2.practice },
  };
  const kinds = buildScreens(mixed)
    .filter((s) => s.origin === 2)
    .map((s) => s.kind);
  const lastGraded = Math.max(kinds.lastIndexOf('mcq'), kinds.lastIndexOf('classify'));
  assert.ok(lastGraded >= 0, 'fixture B01 phải có mcq/classify');
  assert.ok(
    kinds.indexOf('practice') > lastGraded,
    'practice phải đứng sau mcq/classify, nhưng thứ tự là ' + kinds.join(' '),
  );
  // Và các màn cũ của S2 không bị mất đi.
  assert.equal(kinds.filter((k) => k === 'mcq').length, b01.step_2.mcq.length);
});

test('bài đọc: màn read đứng TRƯỚC mọi màn khác của S1', () => {
  // Bài trộn bài đọc với lý thuyết + đề bài của khoá pe-v4: đọc xong mới tới
  // lý thuyết/đề bài, không phải ngược lại.
  const [, v4] = V4[0];
  const mixed = { ...v4, play: undefined, step_1: { ...v4.step_1, read: vz01.step_1.read } };
  const s1 = buildScreens(mixed).filter((s) => s.origin === 1);
  const lastRead = s1.map((s) => s.kind).lastIndexOf('read');
  assert.equal(lastRead, 2);
  assert.equal(
    s1.slice(0, lastRead + 1).every((s) => s.kind === 'read'),
    true,
  );
  assert.ok(lastRead + 1 < s1.length, 'fixture phải còn màn S1 khác sau bài đọc');
  assert.equal(s1[lastRead + 1].kind, 'theory');
});

test('bài đọc: 3 màn trắc nghiệm ĐƯỢC chấm, màn đọc và luyện tập thì không', () => {
  // ĐỔI HÀNH VI NGƯỜI HỌC THẤY ĐƯỢC, 27/10/2026. Ca này từng tên là "cả bài
  // không có màn nào được chấm, nên % luôn 100" và nó ĐÚNG: pe-da không có câu
  // trắc nghiệm nào, nên điểm bài học luôn 100% và XP được trả bất kể học viên
  // hiểu hay không. Nay mỗi bài có 3 câu trắc nghiệm được chấm, nên trả lời sai
  // là điểm dưới 100 và XP ít hơn.
  //
  // `isGraded` vẫn là danh sách TRẮNG, và `read`/`practice` vẫn KHÔNG nằm trong
  // đó: màn đọc không có gì để so, còn câu luyện tập là câu MỞ kèm lời giải mẫu
  // (không có phương án sai nào). Đưa chúng vào là chặn nút kết thúc bài bằng
  // một màn không bao giờ "đúng" được.
  assert.equal(isGraded('read'), false);
  assert.equal(isGraded('practice'), false);
  assert.equal(isGraded('mcq'), true);

  for (const [code, l] of DA) {
    const screens = buildScreens(l);
    // Đúng 3 màn được chấm — khớp 3 câu trắc nghiệm build phát ra.
    assert.equal(screens.filter((s) => isGraded(s.kind)).length, 3, code);
    assert.deepEqual(
      screens.filter((s) => isGraded(s.kind)).map((s) => s.kind),
      ['mcq', 'mcq', 'mcq'],
      code,
    );
    // Nháp TRỐNG = chưa trả lời câu nào, nên % phải là 0 chứ không phải 100.
    // Nếu ở đây ra 100 thì học viên bỏ qua cả ba câu vẫn ăn XP đầy đủ.
    assert.equal(quizPercent(screens, initialLessonDraft(l), false), 0, code);
    // Khoá màn không trùng nhau (bản nháp lưu theo khoá này) và bài kết bằng
    // tổng kết.
    assert.equal(new Set(screens.map((s) => s.key)).size, screens.length, code);
    assert.equal(screens.at(-1).kind, 'recap', code);
  }

  // VZ01: 3 màn đọc + 3 trắc nghiệm + 3 câu luyện tập + sandbox + tổng kết.
  // Trắc nghiệm đứng TRƯỚC luyện tập: phần được chấm làm trước.
  assert.deepEqual(
    buildScreens(vz01).map((s) => s.kind),
    ['read', 'read', 'read', 'mcq', 'mcq', 'mcq',
      'practice', 'practice', 'practice', 'sandbox', 'recap'],
  );
  // Nháp có chỗ cho câu tự viết và cờ "đã xem đáp án".
  const d = initialLessonDraft(vz01);
  assert.deepEqual(d.practice, {});
  assert.deepEqual(d.practiceSeen, {});
  // Màn ĐƯỢC chấm trả một kết quả (chưa chọn gì = sai); màn đọc và luyện tập
  // trả null và không bao giờ khác.
  for (const s of buildScreens(vz01)) {
    const v = screenVerdict(vz01, s, d);
    if (isGraded(s.kind)) {
      assert.equal(v.correct, false, s.key);
      assert.equal(typeof v.explain, 'string', s.key);
    } else {
      assert.equal(v, null, s.key);
    }
  }
});

test('bài đọc: đi hết 3 câu trắc nghiệm như học viên thật — đúng hết thì 100%', () => {
  // Nửa còn lại của ca trên. Không có nó thì một lỗi làm MỌI câu bị tính sai
  // vẫn đi qua, vì ca trên chỉ kiểm nháp rỗng ra 0.
  //
  // Phải đi qua `scoreCheck` chứ không chỉ đặt `draft.mcq`: `quizPercent` đọc
  // `d.score.firstTry[key]`, tức "đúng ngay lần KIỂM TRA đầu", không đọc câu
  // trả lời đang chọn. Bản đầu của ca này đặt `draft.mcq` rồi mong 100 và nhận
  // 0 — đúng cơ chế, sai chỗ đặt.
  const screens = buildScreens(vz01);
  const mcqScreens = screens.filter((x) => isGraded(x.kind));
  assert.equal(mcqScreens.length, 3);

  const diHet = (chon) => {
    let d = initialLessonDraft(vz01);
    for (const scr of mcqScreens) {
      const i = scr.index;
      d = { ...d, mcq: { ...d.mcq, [i]: chon(vz01.step_2.mcq[i], i) } };
      const v = screenVerdict(vz01, scr, d);
      d = { ...d, score: scoreCheck(d.score, scr.key, Boolean(v?.correct)).score };
    }
    return quizPercent(screens, d, false);
  };

  // Đúng cả ba.
  assert.equal(diHet((q) => letterKey(correctIndex(q))), 100);

  // Sai câu đầu, đúng hai câu sau -> 2/3.
  assert.equal(
    diHet((q, i) =>
      letterKey(i === 0 ? (correctIndex(q) + 1) % q.options.length : correctIndex(q))),
    67,
  );

  // Sai cả ba -> 0, và KHÔNG âm.
  assert.equal(
    diHet((q) => letterKey((correctIndex(q) + 1) % q.options.length)),
    0,
  );
});

test('bài đọc: khối terminal và khối table vẫn là hai loại riêng', () => {
  // PY02 dạy dựng môi trường: lệnh shell, không phải Python. Nếu hai loại này
  // bị gộp thì học viên copy `python -m venv .venv` vào ô Python.
  const term = py02.step_1.read.flat().filter((b) => b.type === 'terminal');
  assert.ok(term.length >= 2);
  for (const b of term) {
    assert.equal(b.type, 'terminal');
    // `expected` ở đây là MÔ TẢ bằng lời, không phải stdout — nên ReadScreen
    // dùng nhãn "Dấu hiệu thành công", không phải "Kết quả:".
    assert.ok(b.expected.length > 20, b.expected);
  }
  // Và khối table thật (bài duy nhất có) vẫn đủ cột cho mọi hàng.
  const table = np02.step_1.read.flat().find((b) => b.type === 'table');
  assert.ok(table);
  assert.deepEqual(table.headers, ['Chỉ số', '0', '1', '2']);
  for (const row of table.rows) assert.equal(row.length, 4);
});
