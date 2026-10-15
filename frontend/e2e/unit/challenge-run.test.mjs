/**
 * Unit test cho màn "Thử thách ôn": src/lib/challenge-run.ts và phần nối dây
 * của src/app/(standalone)/practice/challenge/.
 *
 * Vì sao năm chỗ này KHÔNG kiểm được bằng mắt:
 *
 *  1. ĐÁP ÁN LỘ Ở LẦN SAI ĐẦU. Luật chơi: sai lần đầu thì chưa lộ đáp án, cho
 *     nghĩ lại một lần. Nhưng đáp án ĐÃ nằm trong bộ nhớ trình duyệt từ lúc máy
 *     chủ chấm cả đề, nên chỉ cần một nhánh JSX đọc `cell.correctIndex` không
 *     kèm điều kiện là lộ hết — và lộ ở đúng trạng thái ít gặp nhất khi xem
 *     trang bằng mắt (phải chọn SAI mới thấy). Mục 2 chốt cả hàm thuần lẫn việc
 *     giao diện chỉ đi qua `visibleCorrectIndex()`/`visibleExplanation()`.
 *
 *  2. CHỈ SỐ MANG RA SO BÁO TỤT. Chỉ số duy nhất màn này so là "lượt trả lời
 *     đúng ngay lần đầu, cộng dồn". Một lượt ôn tệ KHÔNG được làm nó giảm; mà
 *     cách sai thì rất tự nhiên (tính lại từ `quiz/history` rồi lấy số của lượt
 *     mới nhất, hoặc trừ số câu sai). Mục 3 chốt tính đơn điệu.
 *
 *  3. VẼ THỨ CHƯA CÓ. Bản thiết kế vẽ "câu đã chắc" theo từng câu, hộp Leitner
 *     1·3·7·14, "lần trước bạn chọn B", tên bài của từng câu, chip chọn phạm vi
 *     theo chặng. Hệ thống không có dữ liệu cho một cái nào trong số đó. Vẽ ra
 *     thì màn hình vẫn đẹp và vẫn chạy — đó mới là chỗ nguy. Mục 5 đọc mã nguồn
 *     để chốt.
 *
 *  4. PHẢN HỒI MỨC TỪNG LỰA CHỌN. `normalizeQuestion()` của backend bỏ field
 *     `detail` của từng phương án (438/438 phương án trong giáo trình đều có),
 *     nên "vì sao phương án bạn vừa chọn là sai" không dựng được. Mục 5 chốt
 *     rằng màn này không đọc `optionFeedback`.
 *
 *  5. TƯƠNG PHẢN. Mục 6 đo bằng chính bộ đo của trang bài học
 *     (`./ds-contrast.mjs`) trên 63 cặp chữ/nền của màn này, ở CẢ hai chế độ.
 *
 * Chạy bằng `node --test` + `.mjs` (Node tự bóc kiểu TypeScript) — cùng lý do
 * đã ghi ở practice-plan.test.mjs; cũng chính vì runner không phân giải alias
 * '@/…' mà challenge-run.ts không import gì.
 *
 * Bằng chứng bộ ca này bắt được lỗi thật — xem khối chú thích cuối file.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { audit, contrast, readTokens } from './ds-contrast.mjs';
import {
  LESSONS_FOR_FULL_RUN,
  QUESTIONS_PER_LESSON,
  RUN_RULES,
  SAMPLE_MAX,
  SAMPLE_MIN,
  STATE_LABEL,
  allCommitted,
  applyGrading,
  cellState,
  challengeGate,
  commitPick,
  committedCount,
  createCells,
  cumulativeFirstTry,
  expectedQuestionCount,
  feedbackBody,
  feedbackHead,
  firstTryAfterRun,
  firstTryLine,
  isPickable,
  lessonIdsOf,
  lockedOptionIndex,
  optionLetter,
  revealsAnswer,
  runStage,
  runSummary,
  shownPick,
  splitScore,
  stageProgress,
  visibleCorrectIndex,
  visibleExplanation,
} from '../../src/lib/challenge-run.ts';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

const DIR = ['src', 'app', '(standalone)', 'practice', 'challenge'];
const CLIENT = [...DIR, 'ChallengeClient.tsx'];
const CSS = [...DIR, 'challenge.module.css'];
const LIB = ['src', 'lib', 'challenge-run.ts'];

/** Bỏ chú thích: chính các chú thích giải thích "vì sao KHÔNG vẽ hộp Leitner"
 *  lại chứa những chữ bị cấm, và đó là thứ phải giữ lại. */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');

/* ── khuôn dữ liệu THẬT ──────────────────────────────────────────────────
   Đề mà `generate-review` gửi về chỉ có {index, question, options} (danh sách
   cho phép của `stripAnswers()`), và `detail[i]` của submit có
   {question, given, correct, is_correct, explanation, lesson_id}. Fixture dưới
   đây giữ ĐÚNG hai khuôn đó — fixture không giống dữ liệu thật thì test vô
   dụng (AGENTS.md). Câu hỏi, phương án và lời giải thích chép từ bài P03/T03
   trong scripts/pe-v4/out-advanced/lessons/*.json. */

const QUESTIONS = [
  {
    index: 0,
    question: 'Trong lúc context switch, CPU đang làm gì?',
    options: [
      'Chạy cả hai process cùng lúc',
      'Lưu ngữ cảnh process cũ, nạp ngữ cảnh process mới (PCB)',
      'Chạy tiếp process cũ',
    ],
  },
  {
    index: 1,
    question: 'Method nào được override, method nào được gọi để khởi chạy?',
    options: ['Override run(); gọi start()', 'Override __init__; gọi join()'],
  },
];

/** `detail` của response submit, cho một lượt: câu 0 sai, câu 1 đúng. */
const DETAIL = [
  {
    question: QUESTIONS[0].question,
    given: 0,
    correct: 1,
    is_correct: false,
    explanation: 'Một lõi chỉ chạy một luồng lệnh tại một thời điểm.',
    lesson_id: 312,
  },
  {
    question: QUESTIONS[1].question,
    given: 0,
    correct: 0,
    is_correct: true,
    explanation: 'start() tạo thread rồi gọi run() bên trong nó.',
    lesson_id: 318,
  },
];

/**
 * Bản sao `readGradedQuestions()` thu nhỏ — chỉ ba field `applyGrading()` cần.
 *
 * `isCorrect` tính TẠI CHỖ từ phương án vừa chốt, đúng cách backend chấm
 * (`String(q.correct) === String(answers[i])`), chứ không lấy cờ `is_correct`
 * cứng trong fixture: như vậy một lượt chốt khác nhau mới ra kết quả khác nhau.
 */
function gradedFromDetail(detail, picks) {
  return detail.map((row, i) => ({
    correctIndex: Number.isInteger(row.correct) ? row.correct : null,
    isCorrect: String(row.correct) === String(picks[i]),
    explanation: typeof row.explanation === 'string' ? row.explanation : null,
  }));
}

/** Lượt đã chốt xong và đã được máy chủ chấm. */
function gradedRun(picks = [0, 0]) {
  let cells = createCells(QUESTIONS);
  picks.forEach((p, i) => {
    cells = commitPick(cells, i, p);
  });
  return applyGrading(cells, gradedFromDetail(DETAIL, picks), lessonIdsOf(DETAIL));
}

/* ─────────────────────── 1. Cổng vào và số câu mỗi lượt ──────────────────── */

test('số câu mỗi lượt suy từ hằng của backend, kẹp trong [5, 10]', () => {
  assert.equal(SAMPLE_MIN, 5);
  assert.equal(SAMPLE_MAX, 10);
  assert.equal(expectedQuestionCount(0), 0, 'chưa xong bài nào thì không có lượt nào');
  assert.equal(expectedQuestionCount(1), 0, 'kho 3 câu < MIN_POOL 5 → backend từ chối');
  assert.equal(expectedQuestionCount(2), 6);
  assert.equal(expectedQuestionCount(3), 9);
  assert.equal(expectedQuestionCount(4), SAMPLE_MAX);
  assert.equal(expectedQuestionCount(48), SAMPLE_MAX, 'không bao giờ vượt 10');
  assert.equal(LESSONS_FOR_FULL_RUN, Math.ceil(SAMPLE_MAX / QUESTIONS_PER_LESSON));
});

test('chưa xong 2 bài: nói trước là chưa ôn được, KHÔNG hứa 10 câu', () => {
  const gate = challengeGate({ completed: [1] });
  assert.equal(gate.kind, 'locked');
  assert.equal(gate.canStart, false);
  assert.equal(gate.expected, 0);
  assert.ok(gate.body.includes('1 bài'), 'phải nói số bài THẬT đã xong');
  // Không được hứa con số mình không phát được.
  assert.ok(
    !gate.headline.includes(`${SAMPLE_MAX} câu`),
    'màn chưa ôn được thì không hứa 10 câu',
  );
});

test('xong 2–3 bài: ôn được nhưng nói thẳng là lượt ngắn hơn 10 câu', () => {
  const gate = challengeGate({ completed: [1, 2] });
  assert.equal(gate.kind, 'short');
  assert.equal(gate.canStart, true);
  assert.equal(gate.expected, 6);
  assert.ok(gate.headline.includes('ít nhất 6'), `nói sai số câu: ${gate.headline}`);
  assert.ok(gate.body.includes(`${LESSONS_FOR_FULL_RUN} bài`), 'phải nói xong mấy bài thì đủ 10');
});

test('xong 4 bài: tiêu đề chỉ có con số, KHÔNG kéo theo đoạn mô tả nào', () => {
  const gate = challengeGate({ completed: [1, 2, 3, 4] });
  assert.equal(gate.kind, 'ready');
  assert.equal(gate.expected, SAMPLE_MAX);
  assert.equal(gate.headline, `${SAMPLE_MAX} câu`);
  // Bản cũ: tiêu đề "10 câu, không tính giờ, không xếp hạng" + một đoạn kể cơ
  // chế trọng số và một lời trấn an. Chủ sản phẩm chốt: giữ title, bỏ mô tả.
  assert.equal(gate.body, '', `tiêu đề lại kéo theo mô tả: ${gate.body}`);
  for (const cam of [/không tính giờ/, /không xếp hạng/, /Hệ thống/, /không trừ/]) {
    assert.ok(
      !cam.test(gate.headline + gate.body),
      `cổng vào lại kể thứ hệ thống không làm: ${cam}`,
    );
  }
});

/* ───────── 2. Sai lần đầu KHÔNG lộ đáp án (luật quan trọng nhất) ────────── */

test('đã chốt mà máy chủ chưa chấm: trạng thái "committed", chưa lộ gì', () => {
  const cells = commitPick(createCells(QUESTIONS), 0, 0);
  assert.equal(cellState(cells[0]), 'committed');
  assert.equal(revealsAnswer(cells[0]), false);
  assert.equal(visibleCorrectIndex(cells[0]), null);
  assert.equal(feedbackHead('committed'), null, 'lượt chốt không có khối phản hồi nào');
  assert.equal(committedCount(cells), 1);
  assert.equal(allCommitted(cells), false);
});

test('SAI LẦN ĐẦU: chưa lộ đáp án, chưa lộ lời giải, phương án đã thử bị khoá', () => {
  const run = gradedRun([0, 0]); // câu 0 chọn sai
  const cell = run[0];
  assert.equal(cellState(cell), 'rethinking');
  assert.equal(revealsAnswer(cell), false);
  assert.equal(visibleCorrectIndex(cell), null, 'ĐÁP ÁN LỘ Ở LẦN SAI ĐẦU');
  assert.equal(visibleExplanation(cell), null, 'lời giải thích nêu luôn đáp án nên cũng phải giữ');
  // Đáp án VẪN nằm trong bộ nhớ — đó chính là lý do phải có hai hàm trên.
  assert.equal(cell.correctIndex, 1);
  assert.equal(lockedOptionIndex(cell), 0);
  assert.equal(isPickable(cell), true, 'phải còn chọn lại được');
  // Và lời phản hồi ở trạng thái này không được nhắc tới đáp án.
  const body = feedbackBody('rethinking');
  assert.ok(body.includes('Đáp án chưa lộ'));
  assert.ok(!body.includes('Đáp án đúng'), `lời phản hồi tiết lộ đáp án: ${body}`);
});

test('lượt nghĩ lại không được chọn lại phương án đã thử', () => {
  const run = gradedRun([0, 0]);
  const same = commitPick(run, 0, 0);
  assert.equal(same, run, 'chọn lại phương án bị khoá phải không đổi gì');
  assert.equal(cellState(same[0]), 'rethinking');
});

test('đúng ở lần nghĩ lại: lộ đáp án, và được đánh dấu KHÁC "đúng lần đầu"', () => {
  const run = commitPick(gradedRun([0, 0]), 0, 1);
  assert.equal(cellState(run[0]), 'again');
  assert.equal(visibleCorrectIndex(run[0]), 1);
  assert.equal(feedbackHead('again'), 'Đúng ở lần nghĩ lại');
  assert.notEqual(STATE_LABEL.again, STATE_LABEL.ok, 'hai kết cục phải có hai nhãn');
});

test('sai cả hai lần: lúc này mới lộ đáp án, và phản hồi chỉ nói VIỆC', () => {
  const run = commitPick(gradedRun([0, 0]), 0, 2);
  assert.equal(cellState(run[0]), 'bad');
  assert.equal(visibleCorrectIndex(run[0]), 1);
  assert.equal(visibleExplanation(run[0]), DETAIL[0].explanation);
  assert.equal(feedbackBody('bad'), 'Đọc lại chỗ này trong bài.');
  // Hai trạng thái ĐÃ XONG không còn phần thân: đầu đề đã nói hết, phần thân
  // cũ chỉ là lời bình ("chưa thành phản xạ") và trấn an ("không có điểm
  // thưởng nào để đếm").
  assert.equal(feedbackBody('ok'), null);
  assert.equal(feedbackBody('again'), null);
});

test('đúng ngay lần đầu: không có lượt nghĩ lại nào, đáp án hiện luôn', () => {
  const run = gradedRun([1, 0]);
  assert.equal(cellState(run[0]), 'ok');
  assert.equal(isPickable(run[0]), false);
  assert.equal(visibleCorrectIndex(run[0]), 1);
  assert.equal(shownPick(run[0]), 1);
});

test('câu đã kết thúc thì không chốt lại được (chống tự chấm lại điểm)', () => {
  const run = gradedRun([1, 0]);
  assert.equal(commitPick(run, 0, 0), run, 'câu đúng lần đầu vẫn sửa được');
  const done = commitPick(gradedRun([0, 0]), 0, 2); // 'bad'
  assert.equal(commitPick(done, 0, 1), done, 'câu đã sai hai lần vẫn sửa được');
});

test('NỘP HỎNG rồi thử đổi đáp án: ô đã chốt KHÔNG mở lại, nút đổi sang "nộp lại"', () => {
  /* Đúng kịch bản của lỗi đã sửa: chốt đủ cả đề → `grade()` thất bại (mất
     mạng / 429 / 409 "Quiz này đã được nộp") → `phase` quay về 'run' với MỌI ô
     đã chốt. Bản trước truyền `pickable = phase === 'run'` nên các nút phương án
     BẬT LẠI; người học bấm phương án khác thì nó sáng lên, nút chính bật, nhưng
     `commitPick` thấy ô 'committed' nên trả về mảng KHÔNG ĐỔI và lượt nộp lại
     gửi `firstPick` CŨ — điểm lưu vào DB lệch hẳn với thao tác cuối của họ. */
  let cells = createCells(QUESTIONS);
  cells = commitPick(cells, 0, 0);
  cells = commitPick(cells, 1, 0);
  assert.equal(allCommitted(cells), true, 'fixture phải là lượt đã chốt xong');

  const stage = runStage(cells, 1, null);
  assert.equal(
    stage.pickable, false,
    'ô đã chốt mà nút phương án bật lại = mời người học đổi một thứ không đổi được',
  );
  assert.equal(stage.action, 'resubmit', 'việc duy nhất còn làm được là nộp lại');
  assert.ok(/[Nn]ộp lại/.test(stage.label), `nhãn nút không nói đúng việc: ${stage.label}`);
  assert.ok(
    /không đổi được/.test(stage.hint),
    `giao diện phải NÓI THẲNG là đã chốt thì không đổi được: ${stage.hint}`,
  );

  // Và nếu nút phương án vẫn bật thì đây là cái bẫy: commitPick bỏ qua IM LẶNG.
  assert.equal(commitPick(cells, 1, 1), cells, 'commitPick phải giữ nguyên ô đã chốt');
  assert.deepEqual(cells.map((c) => c.firstPick), [0, 0], 'lựa chọn cũ vẫn là thứ sẽ được nộp');

  // Lượt còn câu trống thì nút vẫn là nút Chốt, và ô đang mở vẫn bấm được.
  const mid = runStage(commitPick(createCells(QUESTIONS), 0, 0), 1, 2);
  assert.equal(mid.action, 'commit');
  assert.equal(mid.pickable, true);
  assert.ok(mid.label.includes('Chốt'), `nhãn nút sai ở lượt còn câu trống: ${mid.label}`);
  assert.ok(mid.hint.includes('Đã chọn C'), `chữ phụ phải nói phương án đang chọn: ${mid.hint}`);
  // Chưa chọn gì thì chữ phụ nói vì sao nút mờ, không nói chuyện nộp lại.
  assert.ok(runStage(createCells(QUESTIONS), 0, null).hint.includes('Nút Chốt mờ'));
  // Trong lúc lượt nộp còn bay trên đường thì nhãn nói đúng việc ĐANG xảy ra,
  // chứ không mời "nộp lại" một lượt chưa biết kết quả.
  const flying = runStage(cells, 1, null, true);
  assert.ok(/[Đđ]ang nộp/.test(flying.label), `nhãn lúc đang nộp sai: ${flying.label}`);
  assert.equal(flying.pickable, false);
  // Nhãn chữ cái dùng CHUNG một hàm, hết chữ thì rơi về số.
  assert.equal(optionLetter(0), 'A');
  assert.equal(optionLetter(5), '6');
});

test('NỐI DÂY: lượt chốt hỏi runStage(), không suy "bấm được" từ phase', () => {
  const src = codeOnly(read(...CLIENT));
  const call = /questionCard\(cells\[at\],([^)]*)\)/.exec(src);
  assert.ok(call, 'không tìm được chỗ dựng thẻ câu của lượt chốt');
  assert.ok(
    !/phase/.test(call[1]),
    '"bấm được" suy từ `phase`: nộp hỏng là ô đã chốt nhưng nút phương án bật lại',
  );
  assert.ok(
    /stage\.pickable|isPickable\(/.test(call[1]),
    `phải hỏi trạng thái của chính ô đó, nhận được: ${call[1]}`,
  );
  assert.ok(/runStage\(cells, at, sel/.test(src), 'nút chính phải đi qua runStage()');
  assert.ok(
    /stage\.action === 'resubmit'/.test(src),
    'phải có đường nộp lại — khoá nút phương án mà không cho nộp lại là ngõ cụt',
  );
});

test('chỉ số phương án ngoài khoảng, hoặc câu không có, thì bỏ qua êm', () => {
  const cells = createCells(QUESTIONS);
  assert.equal(commitPick(cells, 0, 9), cells);
  assert.equal(commitPick(cells, 0, -1), cells);
  assert.equal(commitPick(cells, 7, 0), cells);
});

/* ──────────── 3. Chỉ số mang ra so CHỈ TĂNG, không bao giờ tụt ──────────── */

test('cộng dồn câu đúng lần đầu đọc từ quiz/history, bỏ hàng rác', () => {
  const total = cumulativeFirstTry([
    { score: 7, total: 10 },
    { score: 4, total: 6 },
    { score: -3, total: 10 }, // số âm: kẹp về 0
    { score: 99, total: 10 }, // vượt tổng: kẹp về 10
    { score: 'x', total: 10 }, // không đọc được: bỏ hàng
    { score: 5, total: 0 }, // tổng 0: bỏ hàng
    null,
  ]);
  assert.equal(total.answers, 7 + 4 + 0 + 10);
  assert.equal(total.runs, 4);
  assert.deepEqual(cumulativeFirstTry(null), { answers: 0, runs: 0 });
  assert.equal(firstTryLine({ answers: 0, runs: 0 }), 'Chưa có lượt ôn nào được lưu');
});

test('chỉ số sau lượt KHÔNG BAO GIỜ nhỏ hơn trước lượt', () => {
  const before = 34;
  // Kể cả lượt đúng 0 câu, kể cả khi con số cộng vào là rác âm/NaN.
  for (const gained of [0, 1, 10, -5, -1, NaN, Infinity, undefined]) {
    assert.ok(
      firstTryAfterRun(before, gained) >= before,
      `chỉ số tụt khi cộng thêm ${String(gained)}`,
    );
  }
  assert.equal(firstTryAfterRun(34, 0), 34, 'lượt sai hết không làm tụt');
  assert.equal(firstTryAfterRun(34, 3), 37);
  assert.equal(firstTryAfterRun(-9, 2), 2, 'số trước lượt bị rác thì coi như 0, không âm');
});

test('thêm một lượt vào lịch sử không bao giờ làm chỉ số nhỏ đi', () => {
  const rows = [{ score: 7, total: 10 }];
  const before = cumulativeFirstTry(rows).answers;
  for (const score of [0, 1, 10]) {
    const after = cumulativeFirstTry([{ score, total: 10 }, ...rows]).answers;
    assert.ok(after >= before, `lượt ${score}/10 làm chỉ số tụt từ ${before} xuống ${after}`);
  }
});

test('mức theo chặng đếm BÀI đã xong — chỉ đi lên, và khớp giáo trình thật', () => {
  const { CURRICULA } = JSON.parse(read('src', 'lib', 'curricula.json'));
  const modules = CURRICULA.python_advanced.modules;
  const rows = stageProgress(modules, []);
  assert.equal(rows.length, 8, 'giáo trình đang chạy có 8 chặng');
  assert.equal(
    rows.reduce((s, r) => s + r.total, 0), 48,
    'tổng số bài theo chặng phải là 48',
  );
  assert.deepEqual(rows.map((r) => r.done), [0, 0, 0, 0, 0, 0, 0, 0]);
  // Xong thêm bài thì không chặng nào tụt.
  const base = stageProgress(modules, [1, 2, 3]);
  const more = stageProgress(modules, [1, 2, 3, 9]);
  more.forEach((r, i) => assert.ok(r.done >= base[i].done, `chặng ${r.name} tụt`));
  assert.equal(base[0].label, '3/7 bài đã xong');
});

/* ───────── 4. Tổng kết: hai con số, hai nguồn, KHÔNG cộng vào nhau ──────── */

test('tổng kết đếm đúng bốn kết cục, và đếm được số BÀI cần đọc lại', () => {
  const run = commitPick(gradedRun([0, 0]), 0, 2); // câu 0: sai hai lần; câu 1: đúng
  const s = runSummary(run);
  assert.deepEqual(
    { firstTry: s.firstTry, afterRethink: s.afterRethink, stillWrong: s.stillWrong },
    { firstTry: 1, afterRethink: 0, stillWrong: 1 },
  );
  assert.equal(s.lessonsToReview, 1, 'một câu sai → đúng một bài, đọc từ lesson_id');
  assert.equal(lessonIdsOf(DETAIL)[0], 312);
});

test('không biết câu sai thuộc bài nào thì KHÔNG nói "n bài"', () => {
  // `detail` thiếu lesson_id (hoặc backend đổi tên field) → -1, không phải 0.
  const noLesson = applyGrading(
    gradedRun([0, 0]),
    gradedFromDetail(DETAIL, [0, 0]),
    lessonIdsOf([{ ...DETAIL[0], lesson_id: null }, DETAIL[1]]),
  );
  assert.equal(runSummary(noLesson).lessonsToReview, -1);
});

test('điểm máy chủ chấm và điểm trình duyệt chấm nằm ở HAI dòng, nói rõ nguồn', () => {
  const run = commitPick(gradedRun([0, 0]), 0, 1); // nghĩ lại ra đúng
  const s = runSummary(run);
  const score = splitScore(s);
  assert.ok(score.officialLine.includes('Đúng lần đầu 1 trên 2'));
  // Hai ghi chú rút xuống còn ĐÚNG phần phân biệt được hai con số. Bản cũ kể
  // thêm cơ chế trọng số và lặp lại luật nộp một lần.
  assert.equal(score.officialNote, 'Đã lưu.');
  assert.ok(score.localLine.includes('thêm 1 câu'));
  assert.equal(score.localNote, 'Không lưu.');
  assert.ok(
    !/Hệ thống|lượt sau|trọng số/.test(score.officialNote + score.localNote),
    'ghi chú điểm lại kể cơ chế chọn đề',
  );
  // Hai con số KHÔNG được gộp: 1 đúng lần đầu + 1 sau nghĩ lại ≠ "2 trên 2".
  assert.ok(
    !score.officialLine.includes('2 trên 2'),
    'điểm chính thức bị cộng cả lần nghĩ lại — máy chủ không lưu con số đó',
  );
  // Lượt không có câu nào nghĩ lại thì không bày dòng thứ hai ra làm gì.
  assert.equal(splitScore(runSummary(gradedRun([1, 0]))).localLine, null);
});

/* ────────────── 5. Giao diện không vẽ thứ hệ thống chưa có ──────────────── */

test('giao diện KHÔNG đọc phản hồi mức-lựa-chọn (backend chưa gửi)', () => {
  const src = codeOnly(read(...CLIENT));
  for (const name of ['optionFeedback', 'option_details', 'optionDetail']) {
    assert.ok(
      !src.includes(name),
      `màn này đọc ${name} — backend bỏ field detail của từng phương án khi gom kho `
      + 'câu, nên nó LUÔN rỗng; vẽ ra là vẽ trống trơn đúng ở những câu trả lời sai',
    );
  }
  // Và chính file luật cũng không có khái niệm đó, để không ai tưởng là đã có.
  assert.ok(!codeOnly(read(...LIB)).includes('optionFeedback'));
});

test('NỐI DÂY: mọi chỗ hiện đáp án đều đi qua hàm canh "đã kết thúc chưa"', () => {
  const src = codeOnly(read(...CLIENT));
  // `correctIndex` chỉ được xuất hiện trong lời gọi visibleCorrectIndex().
  const bare = src.match(/(?<!visible)[Cc]orrectIndex/g) ?? [];
  assert.deepEqual(
    bare.filter((m) => m !== 'CorrectIndex'), [],
    'có chỗ đọc thẳng correctIndex — sai lần đầu sẽ lộ đáp án',
  );
  assert.ok(src.includes('visibleCorrectIndex(cell)'));
  assert.ok(src.includes('visibleExplanation(cell)'));
  // Không chỗ nào đọc `cell.explanation` trực tiếp (lời giải nêu luôn đáp án).
  assert.ok(
    !/\.explanation\b/.test(src.replace(/visibleExplanation/g, '')),
    'có chỗ đọc thẳng explanation — lời giải thích nêu đáp án nên cũng phải bị canh',
  );
});

test('không màn nào bịa lịch Leitner, lịch sử theo câu, hay tên bài của câu', () => {
  const src = codeOnly(read(...CLIENT));
  const banned = [
    [/Leitner|[Hh]ộp [1-9]/, 'hộp/lịch Leitner: không có bảng nào lưu hộp và ngày gặp lại'],
    [/1 · 3 · 7 · 14|1·3·7·14/, 'lịch 1·3·7·14 ngày là số bịa'],
    [/[Ll]ần trước bạn chọn/, 'không có lịch sử theo từng câu'],
    [/gặp lại sau \d+ ngày|sẽ giãn ra \d+ ngày/, 'hệ thống không hẹn ngày gặp lại'],
    [/[Tt]ừ bài [A-Z]\d|q\.lesson|cell\.lesson\b/, 'không biết câu nào thuộc bài nào'],
    [/[Nn]gộ nhận:/, 'tên ngộ nhận của bài không có trong kho câu ôn'],
    [/[Hh]ôm qua|\d+ ngày trước/, 'không có mốc thời gian theo từng câu'],
    [/[Hh]ạng \d|thứ hạng của bạn|bảng xếp hạng/, 'không xếp hạng, và cũng không có dữ liệu'],
    [/[Cc]huỗi \d+ ngày|🔥/, 'chuỗi bị ĐỨT là thứ đẩy người học bỏ cuộc'],
    [/còn \d+ giây|hết giờ|[Đđ]iểm tốc độ của bạn/, 'không có đồng hồ trong màn này'],
    [/\bXP\b/, 'màn này không cộng XP nào — đừng hứa'],
  ];
  for (const [re, why] of banned) {
    const hits = src.split('\n').filter((l) => re.test(l));
    assert.deepEqual(hits.map((l) => l.trim().slice(0, 100)), [], why);
  }
});

test('chỉ số đúng-lần-đầu vẫn ghi đúng ĐƠN VỊ là "lượt", không phải "câu"', () => {
  const src = codeOnly(read(...CLIENT));
  const lines = src.split('\n').filter((l) => /câu đã chắc/.test(l));
  assert.deepEqual(
    lines.map((l) => l.trim()), [],
    '"câu đã chắc" là chỉ số CHƯA tính được (không có lịch sử theo từng câu) '
    + 'nên nó không được xuất hiện dưới bất kỳ hình thức nào',
  );
  // Nhãn đơn vị là chỗ DUY NHẤT còn nói sự phân biệt lượt/câu. Khối "ghi chú
  // trung thực" đi giải thích phân biệt đó đã bỏ, nên nếu nhãn này bị gọn hoá
  // thành "câu" thì không còn gì đỡ.
  assert.ok(src.includes('lượt trả lời đúng ngay lần đầu'));
});

test('luật của lượt nói đúng cách chấm, và KHÔNG liệt kê thứ hệ thống không có', () => {
  // Ba luật này đổi được cách người học làm, nên giữ.
  assert.ok(RUN_RULES.some((r) => r.includes('chấm một lượt ở máy chủ')));
  assert.ok(RUN_RULES.some((r) => r.includes('không được lưu')));
  assert.ok(
    RUN_RULES.some((r) => /không hiện ngay sau mỗi câu/.test(r)),
    'luật của lượt không được hứa phản hồi ngay sau mỗi câu — backend không chấm thế',
  );
  // Hai dòng cũ chỉ liệt kê những thứ KHÔNG tồn tại.
  for (const cam of [/Ngồi bao lâu cũng vậy/, /không xếp hạng/, /chuỗi ngày/,
    /không ai để so/, /điểm tốc độ/]) {
    const hits = RUN_RULES.filter((r) => cam.test(r));
    assert.deepEqual(hits, [], `luật của lượt lại liệt kê thứ không có: ${cam}`);
  }
});

/**
 * HÀNG RÀO cho đợt gỡ văn kể lể ngày 15/10/2026.
 *
 * Chủ sản phẩm nói nguyên văn: "những phần như này thì bỏ đi, trông tởm lợm
 * kinh khủng AI slop, bỏ luôn đi, làm 1 cái button là được, đừng cho narrative
 * gì cả, các phần khác cũng thế" — rồi siết thêm: "Bỏ hết, giữ title thôi,
 * thêm phần narrative/description đấy làm gì".
 *
 * Màn này là chỗ đọng nhiều nhất: ba khối "ghi chú trung thực", một danh sách
 * "Ở đây không có", một <details> "Vì sao câu này?", hai câu dẫn dưới tiêu đề
 * và bốn lời trấn an. Mỗi chuỗi đó rẻ để thêm lại (một dòng JSX trong một PR
 * về chuyện khác) và không ai thấy trong diff, nên nó phải có hàng rào.
 *
 * Phép so chạy trên MÃ ĐÃ BỎ CHÚ THÍCH: chú thích giải thích vì sao bỏ thì
 * được phép nhắc lại chuỗi cũ, chính nó mới là thứ ngăn người sau thêm lại.
 */
const KE_LE = [
  [/Vì sao câu này/, 'khuôn 2 — trả lời câu hỏi chưa ai hỏi'],
  [/Hệ thống không (?:chọn|lưu)|Đường sinh đề/, 'khuôn 1 — kể cơ chế bên trong'],
  [/Ở đây không có|không có chuỗi ngày để đứt|không ghép cặp với ai/,
    'khuôn 4 — liệt kê thứ hệ thống KHÔNG làm'],
  [/không trừ gì|không trừ đi gì|không lấy đi gì|không trừ điểm/, 'khuôn 3 — lời rào đón'],
  [/Bản thiết kế vẽ/, 'khuôn 7 — giải thích một phân biệt trước khi người đọc gặp'],
  [/bàn so sánh duy nhất|Không ai đứng bên kia bàn/, 'câu dẫn dưới tiêu đề'],
  // Chuỗi cũ bị ngắt dòng trong JSX, nên phép so phải trúng MỘT dòng — bắt ở
  // đầu câu. Bản đầu của hàng rào này viết /nói rõ\s+để bạn biết cái nào được
  // lưu/ và trượt bản cũ đúng vì lý do đó; `\s+` không vượt được ranh giới
  // dòng khi mình lọc theo từng dòng.
  [/Hai con số dưới đây/, 'khuôn 7 — dẫn trước hai con số'],
];

test('màn thử thách không kể cơ chế, không rào đón, không liệt kê thứ KHÔNG có', () => {
  const src = codeOnly(read(...CLIENT));
  const lib = codeOnly(read(...LIB)).normalize('NFC');
  const be_mat = (src.normalize('NFC') + '\n' + lib).split('\n');
  for (const [mau, ly_do] of KE_LE) {
    const dinh = be_mat.filter((l) => mau.test(l)).map((l) => l.trim().slice(0, 110));
    assert.deepEqual(dinh, [], ly_do + ':\n' + dinh.join('\n'));
  }
});

test('TỰ KIỂM: bảy phép so trên phải bắt được chính câu chữ CŨ', () => {
  // Một hàng rào không bắt nổi bản cũ là hàng rào chết mà vẫn báo đạt. Bảy
  // chuỗi dưới đây lấy nguyên văn từ bản trước commit gỡ văn kể lể.
  const CU = [
    '<summary className={styles.whySummary}>Vì sao câu này?</summary>',
    'Hệ thống không lưu lịch sử theo từng câu, nên nó không biết',
    '<p className={styles.sideLabel} id="notTitle">Ở đây không có</p>',
    'Lần nghĩ lại không trừ gì cả.',
    'Bản thiết kế vẽ “mức câu đã chắc theo chặng”; muốn vậy phải có lịch sử',
    'Không ai đứng bên kia bàn — bàn so sánh duy nhất ở đây là bạn của những lượt trước.',
    'Hai con số dưới đây là của riêng bạn, và chúng đến từ hai nơi khác nhau — nói rõ',
  ];
  assert.equal(CU.length, KE_LE.length);
  for (let k = 0; k < KE_LE.length; k += 1) {
    assert.ok(
      KE_LE[k][0].test(CU[k].normalize('NFC')),
      `mẫu ${k} (${KE_LE[k][1]}) không bắt nổi chuỗi cũ: ${CU[k]}`,
    );
  }
});

test('một tiêu đề KHÔNG được kéo theo một đoạn mô tả', () => {
  // Đếm được: mỗi <h1>/<h2> của màn này phải đi liền nút, con số hoặc danh
  // sách — không phải một <p className={styles.lead|kicker|gateBody}> chỉ mang
  // câu dẫn. Cách rẻ nhất để canh: hai lớp `lead`/`kicker` không còn chỗ dùng
  // nào trong màn mở đầu và màn kết quả, và `gateBody` chỉ hiện khi có nội
  // dung thật (nhánh 'ready' trả body rỗng).
  const src = codeOnly(read(...CLIENT));
  const dan = src.match(/className=\{styles\.(?:lead|kicker)\}/g) ?? [];
  assert.deepEqual(
    dan, [],
    'còn một đoạn dẫn dắt ngay dưới tiêu đề — chủ sản phẩm chốt: giữ title, bỏ mô tả.\n'
    + dan.join('\n'),
  );
  assert.ok(
    /\{gate\.body && <p/.test(src),
    'gateBody phải có điều kiện, không thì nhánh ready in ra một <p> rỗng',
  );
});

test('màn này dùng apiFetch (trang sau đăng nhập) và không tự dựng đường API', () => {
  const src = codeOnly(read(...CLIENT));
  assert.ok(src.includes('apiFetch('));
  assert.ok(
    !src.includes('apiFetchSessionOnly'),
    'apiFetchSessionOnly là đường của TRANG CÔNG KHAI; ở đây khách mới không ôn được',
  );
  // Dùng lại đúng ba đường của /practice, không viết thẳng chuỗi nào.
  assert.ok(src.includes('reviewPath(COURSE_ID)'));
  assert.ok(src.includes('submitPath(quizId)'));
  const literals = src.match(/['"`]\/api\/[^'"`]*['"`]/g) ?? [];
  assert.deepEqual(literals, [], `đường dẫn viết thẳng: ${literals.join(' ')}`);
});

test('tôn trọng prefers-reduced-motion ở CẢ React và CSS', () => {
  const src = codeOnly(read(...CLIENT));
  assert.ok(src.includes('usePrefersReducedMotion'), 'phải dùng lại lib đã có');
  assert.ok(/reduced \? '' :/.test(src), 'nhánh giảm chuyển động phải bỏ hẳn lớp animation');
  const css = read(...CSS);
  assert.ok(/@media \(prefers-reduced-motion: reduce\)/.test(css));
});

/* ───────────────── 6. Màu, cỡ chữ và tương phản WCAG AA ─────────────────── */

test('CSS của màn không viết mã màu, không cỡ chữ thẳng, không opacity', () => {
  const css = read(...CSS).replace(/\/\*[\s\S]*?\*\//g, ' ');
  const hex = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  const fn = css.match(/\b(?:rgba?|hsla?)\(/g) ?? [];
  assert.deepEqual(hex, [], `còn mã màu hex: ${hex.join(' ')}`);
  assert.deepEqual(fn, [], `còn màu viết bằng ${fn.join(' ')} — phải qua token`);
  const raw = (css.match(/font-size:\s*[^;]+;/g) ?? []).filter((s) => !s.includes('var(--ds-fs-'));
  assert.deepEqual(raw, [], `cỡ chữ viết thẳng: ${raw.join(' ')}`);
  // Làm mờ chữ bằng độ đục là cách nhanh nhất để tụt dưới ngưỡng AA; ở đây
  // mọi trạng thái "lùi về sau" đều hạ MÀU và VIỀN, không hạ độ đục. Khung
  // @keyframes được phép (chuyển cảnh, không phải trạng thái đứng yên).
  const dim = (css.match(/opacity:\s*(0?\.\d+)/g) ?? []).filter((m) => {
    const at = css.indexOf(m);
    return !/@keyframes[^}]*$/.test(css.slice(Math.max(0, at - 260), at));
  });
  assert.deepEqual(dim, [], `còn hạ độ đục: ${dim.join(' ')}`);
});

test('TSX của màn không viết mã màu, không style nội tuyến', () => {
  const src = codeOnly(read(...CLIENT));
  const hex = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  assert.deepEqual(hex, [], `màu viết thẳng trong TSX: ${hex.join(' ')}`);
  // style={{…}} bị `style-src` của CSP chặn khi SSR tuần tự hoá (xem AGENTS.md).
  assert.ok(!/style=\{\{/.test(src), 'style nội tuyến — dùng CSS module');
});

/* Cặp chữ/nền THẬT của màn này, mỗi dòng ghi lớp nó đến từ đâu.
   Loại: 'text' ≥4,5 · 'large' ≥3 (≥24px) · 'ui' ≥3 (viền/đồ hoạ mang tin)
         'decor' được miễn — phần tử thứ 5 PHẢI là lý do. */
const PAIRS = [
  ['màn: chữ chính / nền trang', '--ds-ink', '--ds-page', 'text'],
  ['màn: eyebrow, lead, ghi chú (.quiet/.lead/.kicker)', '--ds-soft', '--ds-page', 'text'],
  ['màn: liên kết về Ôn tập (.backLink/.quietLink)', '--ds-violet', '--ds-page', 'text'],
  ['màn: chú giải ô tiến độ (.legendItem)', '--ds-soft', '--ds-page', 'text'],
  ['cổng vào: tiêu đề + thân (.gateCard)', '--ds-ink', '--ds-card', 'text'],
  ['cổng vào: viền thẻ', '--ds-line', '--ds-card', 'decor',
    'Viền của thẻ KHÔNG bấm được; ranh giới do NỀN và phần đệm 22–26px nói. '
    + 'Bảng token ghi rõ về `line`: không dùng làm ranh giới thành phần cần nhận ra.'],
  ['nút chính (.primary)', '--ds-on-action', '--ds-action', 'text'],
  ['nút chính đang tắt: chữ', '--ds-soft', '--ds-desk', 'text'],
  ['nút chính đang tắt: viền', '--ds-sketch', '--ds-desk', 'ui'],
  ['thanh lượt: số câu (.runCount)', '--ds-ink', '--ds-card', 'text'],
  ['thanh lượt: ghi chú (.runNote)', '--ds-soft', '--ds-card', 'text'],
  ['ô tiến độ: chưa làm · nét đứt (.pipEmpty)', '--ds-sketch', '--ds-card', 'ui'],
  ['ô tiến độ: đã chốt chưa chấm (.pipCommitted)', '--ds-ink', '--ds-card', 'ui'],
  ['ô tiến độ: đúng lần đầu · ô (.pipOk)', '--ds-ochre', '--ds-card', 'ui'],
  ['ô tiến độ: đúng lần đầu · dấu kiểm', '--ds-on-action', '--ds-ochre', 'ui'],
  ['ô tiến độ: đúng sau nghĩ lại · viền (.pipAgain)', '--ds-ochre', '--ds-card', 'ui'],
  ['ô tiến độ: chưa đúng · viền (.pipBad)', '--ds-sanguine', '--ds-card', 'ui'],
  ['ô tiến độ: đang nghĩ lại · nét đứt (.pipRethink)', '--ds-sanguine', '--ds-card', 'ui'],
  ['ô tiến độ: vòng "bạn ở đây" (.pipHere)', '--ds-violet', '--ds-card', 'ui'],
  ['thẻ câu: nhãn (.cardLabel)', '--ds-soft', '--ds-card', 'text'],
  ['thẻ câu: câu hỏi 22px (.question)', '--ds-ink', '--ds-card', 'text'],
  ['thẻ câu: viền 2px', '--ds-ink', '--ds-card', 'ui'],
  ['phương án: chữ (.optionText)', '--ds-ink', '--ds-card', 'text'],
  ['phương án: viền 2px', '--ds-ink', '--ds-card', 'ui'],
  ['phương án: chữ cái (.letter viền)', '--ds-ink', '--ds-card', 'ui'],
  ['phương án đang chọn: chữ', '--ds-ink', '--ds-violet-tint', 'text'],
  ['phương án đang chọn: viền', '--ds-violet', '--ds-card', 'ui'],
  ['phương án đang chọn: chữ cái', '--ds-on-action', '--ds-violet', 'text'],
  ['phương án đúng: chữ', '--ds-ink', '--ds-ochre-tint', 'text'],
  ['phương án đúng: viền', '--ds-ochre', '--ds-card', 'ui'],
  ['phương án đúng: chữ cái', '--ds-on-action', '--ds-ochre', 'text'],
  ['phương án đúng: nhãn "Đáp án đúng" (.tagOk)', '--ds-ochre', '--ds-ochre-tint', 'text'],
  ['phương án chưa đúng: chữ', '--ds-ink', '--ds-sanguine-tint', 'text'],
  ['phương án chưa đúng: viền', '--ds-sanguine', '--ds-card', 'ui'],
  ['phương án chưa đúng: nhãn "Bạn chọn" (.tagBad)', '--ds-sanguine', '--ds-sanguine-tint', 'text'],
  ['phương án đã khoá: chữ (.optionLocked)', '--ds-ink', '--ds-tint', 'text'],
  ['phương án đã khoá: nhãn (.tagLocked)', '--ds-soft', '--ds-tint', 'text'],
  ['phương án đã khoá: viền nét đứt', '--ds-sketch', '--ds-tint', 'ui'],
  ['phương án lùi về sau: chữ GIỮ NGUYÊN màu (.optionRest)', '--ds-ink', '--ds-card', 'text'],
  ['phản hồi đúng: đầu đề (.fbOk .fbHead)', '--ds-ochre', '--ds-ochre-tint', 'text'],
  ['phản hồi đúng: thân', '--ds-ink', '--ds-ochre-tint', 'text'],
  ['phản hồi đúng: vạch nhấn trái', '--ds-ochre', '--ds-ochre-tint', 'ui'],
  ['phản hồi chưa đúng: đầu đề (.fbBad .fbHead)', '--ds-sanguine', '--ds-sanguine-tint', 'text'],
  ['phản hồi chưa đúng: thân', '--ds-ink', '--ds-sanguine-tint', 'text'],
  ['phản hồi chưa đúng: vạch nhấn trái', '--ds-sanguine', '--ds-sanguine-tint', 'ui'],
  ['"Vì sao câu này?": tiêu đề (.whySummary)', '--ds-violet-deep', '--ds-tint', 'text'],
  ['"Vì sao câu này?": thân (.whyBody)', '--ds-ink', '--ds-tint', 'text'],
  ['thẻ kết quả: viền (.resultCard)', '--ds-ochre', '--ds-page', 'ui'],
  ['thẻ chỉ số lật ngược: số 36px (.metricBig)', '--ds-page', '--ds-ink', 'large'],
  ['thẻ chỉ số lật ngược: nhãn và ghi chú', '--ds-page', '--ds-ink', 'text'],
  ['thẻ phụ: nhãn (.sideLabel)', '--ds-soft', '--ds-card', 'text'],
  ['thẻ phụ: thân và luật (.sideBody/.ruleItem)', '--ds-ink', '--ds-card', 'text'],
  ['mức theo chặng: nhãn số bài (.stageLabel)', '--ds-soft', '--ds-card', 'text'],
  ['mức theo chặng: ô bài đã xong (.segDone)', '--ds-ink', '--ds-card', 'ui'],
  ['mức theo chặng: ô bài chưa xong · nét đứt (.segTodo)', '--ds-sketch', '--ds-card', 'ui'],
  ['ghi chú trung thực: chữ (.honest)', '--ds-ink', '--ds-paper', 'text'],
  ['ghi chú trung thực: viền nét đứt', '--ds-sketch', '--ds-paper', 'ui'],
  ['xem lại: nhãn câu (.reviewLabel)', '--ds-soft', '--ds-card', 'text'],
  ['xem lại: lời giải thích (.reviewWhy)', '--ds-soft', '--ds-card', 'text'],
  ['báo lỗi: chữ (.notice)', '--ds-ink', '--ds-sanguine-tint', 'text'],
  ['báo lỗi: vạch nhấn trái', '--ds-sanguine', '--ds-sanguine-tint', 'ui'],
  ['chân màn: ghi chú (.footNote)', '--ds-soft', '--ds-page', 'text'],
  ['vòng focus / nền trang', '--ds-violet', '--ds-page', 'ui'],
];

for (const name of ['NGÀY', 'ĐÊM']) {
  test(`${PAIRS.length} cặp chữ/nền của màn này: không cặp nào trượt AA ở bản ${name}`, () => {
    const tokens = readTokens()[name === 'NGÀY' ? 'light' : 'dark'];
    const bad = audit(tokens, PAIRS).filter((r) => !r.pass);
    assert.deepEqual(
      bad.map((r) => `${r.label} = ${r.ratio.toFixed(2)} (cần ${r.need})`), [],
      'cặp trượt WCAG AA — sửa token hoặc đổi cặp, đừng xoá dòng đo',
    );
  });
}

test('cặp được MIỄN ngưỡng phải nêu lý do, và không được là CHỮ', () => {
  const exempt = PAIRS.filter(([, , , kind]) => kind === 'decor');
  assert.ok(exempt.length > 0 && exempt.length <= 2, 'miễn phải đắt: nhiều nhất hai dòng');
  for (const [label, , , , reason] of exempt) {
    assert.ok(
      typeof reason === 'string' && reason.length >= 40,
      `cặp "${label}" được miễn mà không nêu lý do`,
    );
    assert.ok(!/chữ |đoạn văn|nhãn |câu /.test(label), `"${label}" là chữ nên không được miễn`);
  }
});

test('NỐI DÂY: những chỗ load-bearing dùng đúng token mà bảng đo giả định', () => {
  // Mắt yếu của mọi bộ đo viết tay: bảng PAIRS nói ".option viền là ink" mà
  // không gì buộc CSS phải thật như thế. Bảng dưới chốt đúng những chỗ mà đổi
  // token là tụt dưới ngưỡng, hoặc là mất thông tin không-chỉ-bằng-màu.
  const css = read(...CSS).replace(/\/\*[\s\S]*?\*\//g, ' ');
  const WIRING = [
    ['.option', 'border', '--ds-ink', 'viền của thứ bấm được; `line` chỉ 1,36:1'],
    ['.optionLocked', 'border-color', '--ds-sketch', 'nét đứt mang thông tin "đã thử, bị khoá"'],
    ['.optionRest', 'border-color', '--ds-line', 'phương án không liên quan, chữ giữ nguyên màu'],
    ['.pipEmpty', 'border', '--ds-sketch', 'ô "chưa làm" là đồ hoạ mang thông tin'],
    ['.segTodo', 'border', '--ds-sketch', 'ô bài chưa xong, như .pipEmpty'],
    ['.honest', 'border', '--ds-sketch', 'viền nét đứt của khối ghi chú trung thực'],
    ['.primary', 'background', '--ds-action', '--ds-action chỉ có một vai: nền nút chính'],
    ['.primary', 'color', '--ds-on-action', 'phải đọc được ở CẢ hai chế độ'],
    ['.metric', 'background', '--ds-ink', 'thẻ lật ngược'],
    ['.metric', 'color', '--ds-page', 'chữ trên thẻ lật ngược KHÔNG được là màu nhấn cố định'],
  ];
  const offenders = [];
  for (const [cls, prop, token, why] of WIRING) {
    const found = [];
    for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const selectors = m[1].split(',').map((x) => x.trim());
      if (!selectors.some((s) => s === cls || s.startsWith(`${cls}:`) || s.startsWith(`${cls} `))) {
        continue;
      }
      const decl = m[2].match(new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)`));
      if (decl) found.push(decl[1].trim());
    }
    if (!found.length) { offenders.push(`${cls}: không thấy ${prop}`); continue; }
    if (!found.some((v) => v.includes(`var(${token})`))) {
      offenders.push(`${cls} ${prop}: ${found.join(' | ')} — phải là ${token} (${why})`);
    }
  }
  assert.deepEqual(offenders, [], `bảng đo và CSS lệch nhau:\n${offenders.join('\n')}`);
});

test('ô tiến độ phân biệt bằng HÌNH, không chỉ bằng màu', () => {
  const css = read(...CSS).replace(/\/\*[\s\S]*?\*\//g, ' ');
  const shapeOf = (cls) => {
    const m = css.match(new RegExp(`\\${cls}\\s*\\{([^}]*)\\}`));
    assert.ok(m, `không thấy lớp ${cls}`);
    const radius = (m[1].match(/border-radius:\s*([^;]+)/) ?? [])[1]?.trim() ?? '';
    const style = /dashed/.test(m[1]) ? 'dashed' : /border:/.test(m[1]) ? 'solid' : 'fill';
    return `${radius}|${style}`;
  };
  const shapes = ['.pipEmpty', '.pipCommitted', '.pipOk', '.pipAgain', '.pipBad', '.pipRethink']
    .map(shapeOf);
  // Bốn kết cục của bản thiết kế (chưa làm · đúng lần đầu · đúng sau nghĩ lại ·
  // chưa đúng) phải có bốn hình KHÁC NHAU, không chỉ khác màu.
  const four = [shapes[0], shapes[2], shapes[3], shapes[4]];
  assert.equal(new Set(four).size, 4, `bốn kết cục chỉ có ${new Set(four).size} hình: ${four}`);
  // Và mỗi trạng thái đã kết thúc còn kèm một hình vẽ bên trong (dấu kiểm,
  // chấm, dấu nhân) — xem PipGlyph trong ChallengeClient.
  const src = codeOnly(read(...CLIENT));
  assert.ok(/state === 'ok'/.test(src) && /M3 8.5L6.5 12L13 4.5/.test(src), 'thiếu dấu kiểm');
  assert.ok(/state === 'bad'/.test(src) && /M4.5 4.5l7 7/.test(src), 'thiếu dấu nhân');
  assert.ok(/state === 'again'/.test(src) && /<circle/.test(src), 'thiếu chấm giữa');
  // Mỗi ô có nhãn chữ cho trình đọc màn hình.
  assert.ok(src.includes('STATE_LABEL[state]'));
  assert.equal(new Set(Object.values(STATE_LABEL)).size, 6, 'sáu trạng thái phải có sáu nhãn');
});

test('cỡ chữ: thân ≥17px, nhãn 15px — đúng thang token, không có cỡ thứ chín', () => {
  const { light } = readTokens();
  // Thang cỡ chữ đọc từ chính bảng token (không phải màu nên readTokens bỏ);
  // đọc lại bằng regex trên file token.
  const tokensCss = read('public', 'static', 'css', 'studio-tokens.css');
  const scale = {};
  for (const m of tokensCss.matchAll(/(--ds-fs-[\w-]+):\s*(\d+)px/g)) scale[m[1]] = Number(m[2]);
  const css = read(...CSS).replace(/\/\*[\s\S]*?\*\//g, ' ');
  const used = [...css.matchAll(/font-size:\s*var\((--ds-fs-[\w-]+)\)/g)].map((m) => m[1]);
  assert.ok(used.length > 20, 'chưa đọc được các khai báo cỡ chữ');
  for (const name of new Set(used)) {
    assert.ok(scale[name], `${name} chưa khai trong bảng token`);
    assert.ok(scale[name] >= 15, `${name} = ${scale[name]}px — bảng v2 không có chữ dưới 15px`);
  }
  // Không dùng cỡ 16px (--ds-fs-code) cho chữ thường: đó là cỡ của khối code.
  assert.ok(!used.includes('--ds-fs-code'), 'màn này không có khối code nào');
  assert.ok(light['--ds-ink'], 'bảng token đọc được');
});

/*
 * ── BẰNG CHỨNG BỘ CA NÀY BẮT ĐƯỢC LỖI (đo 15/10/2026) ─────────────────────
 * ĐÃ CHẠY THẬT: gỡ từng bản sửa khỏi cây làm việc, chạy
 * `node --test e2e/unit/challenge-run.test.mjs`, đếm số ca trượt, rồi trả lại
 * nguyên trạng — 18 mutation. Số đo được, không phải suy đoán:
 *
 *   gỡ bản sửa                                                     → ca trượt
 *   ──────────────────────────────────────────────────────────────────────────
 *   ChallengeClient truyền `pickable = phase === 'run'` (bản cũ) —
 *     nộp hỏng thì ô ĐÃ CHỐT lại bật nút phương án, rồi lượt nộp
 *     lại gửi lựa chọn CŨ trong im lặng                                  1
 *   `runStage()` trả `pickable: true` khi cả đề đã chốt — cùng
 *     cái lỗ, đường khác (hàm thuần)                                     1
 *   `revealsAnswer()` trả true cả ở 'rethinking' — tức SAI LẦN ĐẦU
 *     là lộ đáp án ngay, đúng cái luật chơi cấm, và chỉ thấy được
 *     nếu người xem CHỌN SAI                                             1
 *   ChallengeClient đọc thẳng `cell.correctIndex` thay vì
 *     `visibleCorrectIndex(cell)` — cùng cái lỗ, đường khác               1
 *   `lockedOptionIndex()` trả null — lần nghĩ lại chọn lại được
 *     đúng phương án vừa sai                                             2
 *   `commitPick()` bỏ chốt chặn "câu đã kết thúc" → chốt lại
 *     được một câu máy chủ đã chấm                                       1
 *   `cellState()` coi "đã chốt, chưa chấm" là 'bad' → lượt chốt
 *     vẽ sẵn kết quả khi chưa ai chấm                                    1
 *   `firstTryAfterRun()` trả số của lượt mới nhất thay vì cộng
 *     dồn → chỉ số BÁO TỤT sau một lượt tệ                               1
 *   `splitScore()` cộng cả lần nghĩ lại vào điểm chính thức              1
 *   `runSummary().lessonsToReview` trả 0 thay vì -1 khi thiếu
 *     `lesson_id` → màn hình nói "0 bài" thay vì không nói               1
 *   `expectedQuestionCount()` luôn trả 10 → hứa 10 câu với người
 *     mới xong 1 bài, rồi backend từ chối bằng 400                       2
 *   ChallengeClient vẽ phản hồi mức-lựa-chọn (`optionFeedback`)          1
 *   ChallengeClient thêm dòng "Lần trước bạn chọn B"                     1
 *   bỏ câu "máy chủ chấm cả đề một lượt" khỏi màn hình                   1
 *   bỏ nhánh `prefers-reduced-motion` ở React                            1
 *   `.pipAgain` dùng cùng hình với `.pipOk` (chỉ khác màu)               1
 *   `.option { border: … var(--ds-line) }` (viền 1,36:1)                 1
 *   một mã màu hex viết thẳng trong challenge.module.css                 1
 *
 * 16/16 mutation bị bắt. Chỗ yếu đã biết: phần lớn mutation chỉ làm trượt MỘT
 * ca, nên đừng xoá ca nào mà không thay bằng ca khác đo cùng thứ.
 *
 * Tương phản: 63 cặp chữ/nền của màn này, 0 trượt ở cả bản ngày và bản Ban
 * đêm, 1 dòng được miễn (viền trang trí của thẻ, có lý do viết kèm).
 */
