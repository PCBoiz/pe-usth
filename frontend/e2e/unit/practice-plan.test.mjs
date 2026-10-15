/**
 * Unit test cho trang "Ôn tập của tôi": src/lib/practice-plan.ts và phần nối
 * dây của src/app/(standalone)/practice/.
 *
 * Vì sao phải có, và vì sao bốn chỗ này KHÔNG kiểm được bằng mắt:
 *
 *  1. CHỌN ENDPOINT. Backend có ba đường sinh đề. Gọi lầm
 *     `courses/:id/quiz/generate` thì đề vẫn hiện, vẫn chấm được, chỉ mất hẳn
 *     trọng số "bài hay sai thì gặp lại nhiều hơn" — mất đúng phần thích ứng
 *     duy nhất đang có, mà màn hình không có dấu hiệu nào. Gọi lầm
 *     `quiz/generate-review` (bản hằng ngày) thì phải CHỜ SANG NGÀY MAI mới
 *     thấy lỗi "mỗi ngày một đề".
 *
 *  2. KIỂU CÂU TRẢ LỜI GỬI LÊN. Backend chấm bằng
 *     `String(q.correct) === String(answers[i])`, và `q.correct` của cả 146 câu
 *     trong giáo trình là CHỈ SỐ phương án. Trang /practice cũ (xoá ở cd9c05a)
 *     gửi NỘI DUNG phương án nên điểm luôn 0 — luồng vẫn chạy trọn, không có
 *     lỗi nào, chỉ "hôm nay làm sai hết". Ca ở mục 2 dưới đây chấm thử bằng
 *     CHÍNH hàm so sánh của backend, trên câu hỏi THẬT đọc từ
 *     scripts/pe-v4/out-advanced/lessons/*.json (AGENTS.md: fixture không
 *     giống dữ liệu thật thì test vô dụng).
 *
 *  3. CỔNG "PHẢI XONG 2 BÀI". `buildQuestionPool()` đòi kho câu ≥ 5 mà mỗi bài
 *     góp 3 câu, nên người vừa xong bài đầu bấm "Ôn tập" sẽ nhận 400. Dựng lại
 *     cảnh đó bằng tay phải có một tài khoản xong ĐÚNG một bài.
 *
 *  4. KHÔNG VẼ THỨ CHƯA CÓ. Backend bỏ `detail` của từng phương án, nên phản
 *     hồi chỉ tới mức CÂU. Nếu một ngày nào đó giao diện bắt đầu vẽ phản hồi
 *     mức-lựa-chọn từ dữ liệu không có, nó sẽ hiện ra trống trơn hoặc undefined
 *     — chỉ ở đúng những câu trả lời sai, tức khó gặp khi xem trang.
 *
 * Chạy bằng `node --test` + `.mjs` (Node tự bóc kiểu TypeScript) — cùng lý do
 * đã ghi ở course-progress.test.mjs; cũng chính vì runner không phân giải alias
 * '@/…' mà practice-plan.ts không import gì.
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

import {
  COURSE_ID,
  ENROLLED_PATH,
  MIN_LESSONS,
  MIN_POOL,
  TOTAL_LESSONS,
  answersPayload,
  completedLessons,
  formatStudyDay,
  gateFromError,
  historyPath,
  lessonLabels,
  planPractice,
  nextLessonNo,
  readGeneratedQuiz,
  readGradedQuestions,
  recentReviews,
  REJECTED_PATHS,
  reviewPath,
  scoreLine,
  submitPath,
} from '../../src/lib/practice-plan.ts';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');
/** Bỏ chú thích: chính chú thích nói "ĐỪNG dùng generate" nên chứa chuỗi bị cấm. */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');
/** Như codeOnly nhưng gộp mọi khoảng trắng: câu trong JSX bị ngắt dòng theo
 *  chiều rộng cột, nên tìm chuỗi nguyên văn trong mã nguồn sẽ trượt oan. */
const textOnly = (src) => codeOnly(src).replace(/\s+/g, ' ');

/**
 * Chuẩn hoá TRƯỚC khi so: "khoá" gõ bằng dấu TỔ HỢP (o + U+0301) là dãy ký tự
 * khác hẳn bản dựng sẵn nên regex không khớp, và U+00A0 lọt qua mọi mẫu có
 * khoảng trắng. Cùng lý do đã ghi ở home-page.test.mjs.
 */
const chuanHoa = (x) => x.normalize('NFC').replace(/\s+/g, ' ').trim();

/**
 * Mọi chuỗi HIỂN THỊ trong một file: cả chuỗi trong nháy LẪN chữ viết thẳng
 * giữa hai thẻ JSX — viết câu thẳng vào JSX là cách TỰ NHIÊN NHẤT trong React,
 * nên bề mặt quét thiếu phần đó thì luật chỉ nghiêm trên giấy.
 */
function hienThi(code) {
  const out = [];
  for (const m of code.matchAll(/(['"`])((?:[^\\\n]|\\.)*?)\1/g)) out.push(chuanHoa(m[2]));
  for (const m of code.matchAll(/>([^<>{}]+)</g)) out.push(chuanHoa(m[1]));
  return out.filter(Boolean);
}

const CLIENT = ['src', 'app', '(standalone)', 'practice', 'PracticeClient.tsx'];
const CSS = ['src', 'app', '(standalone)', 'practice', 'practice.module.css'];

/* ───────────────── 1. Đúng endpoint có trọng số, không hai cái kia ──────── */

test('đề ôn lấy từ courses/:id/quiz/generate-review (bản CÓ TRỌNG SỐ)', () => {
  const path = reviewPath('python_advanced');
  assert.equal(path, '/api/courses/python_advanced/quiz/generate-review');
  // Có khoá trong đường dẫn = bản có trọng số; thiếu khoá = bản hằng ngày.
  assert.ok(path.includes('/courses/'), 'thiếu /courses/ là rơi vào đề ôn hằng ngày');
  assert.ok(path.endsWith('/quiz/generate-review'));
});

test('KHÔNG dùng quiz/generate (random đều) và quiz/generate-review (cổng theo ngày)', () => {
  const path = reviewPath(COURSE_ID);
  for (const rejected of REJECTED_PATHS) {
    assert.notEqual(path, rejected.path, `vẫn trỏ vào ${rejected.path}: ${rejected.why}`);
  }
  // Bản random đều là cùng đường nhưng KHÔNG có hậu tố '-review'.
  assert.notEqual(path, `/api/courses/${COURSE_ID}/quiz/generate`);
  assert.notEqual(path, '/api/quiz/generate-review');
  // Hai lý do phải còn nguyên trong mã nguồn: ai định đổi endpoint sẽ đọc được.
  assert.equal(REJECTED_PATHS.length, 2);
  assert.ok(REJECTED_PATHS[0].why.includes('trọng số'));
  assert.ok(REJECTED_PATHS[1].why.includes('mỗi ngày'));
});

test('mã nguồn trang chỉ gọi đúng ba đường của backend, không tự dựng đường khác', () => {
  const src = codeOnly(read(...CLIENT));
  assert.ok(src.includes('reviewPath(COURSE_ID)'), 'trang không gọi reviewPath()');
  // Không chuỗi đường dẫn nào viết thẳng trong JSX: viết thẳng là chỗ để lầm.
  const literals = src.match(/['"`]\/api\/[^'"`]*['"`]/g) ?? [];
  assert.deepEqual(literals, [], `đường dẫn viết thẳng trong trang: ${literals.join(' ')}`);
  assert.ok(!src.includes('generate-today'), 'generate-today bó vào bài học HÔM NAY, không phải ôn');
  assert.equal(submitPath(7), '/api/quizzes/7/submit');
  assert.equal(historyPath('a b'), '/api/courses/a%20b/quiz/history');
  assert.equal(ENROLLED_PATH, '/api/enrolled');
});

test('/practice là trang SAU đăng nhập: dùng apiFetch, không phải apiFetchSessionOnly', () => {
  const src = codeOnly(read(...CLIENT));
  assert.ok(src.includes('apiFetch('), 'trang phải gọi apiFetch (tự lấy tài khoản khách khi cần)');
  assert.ok(
    !src.includes('apiFetchSessionOnly'),
    'apiFetchSessionOnly là đường của TRANG CÔNG KHAI; ở đây khách mới sẽ không bao giờ ôn được',
  );
});

/* ───────── 2. Câu trả lời gửi lên phải khớp cách chấm của backend ───────── */

/** Bản sao `isCorrect()` của src/quizzes/quizzes.service.ts. */
function backendIsCorrect(expected, given) {
  if (given === undefined || given === null) return false;
  return String(expected).trim().toLowerCase() === String(given).trim().toLowerCase();
}

/** Bản sao `normalizeQuestion()` + `stripAnswers()` cho dạng dữ liệu thật. */
function backendPool(lessonJson) {
  const mcq = lessonJson.content_json.step_2.mcq;
  return mcq.map((q) => ({
    question: q.question,
    options: q.options.map((o) => String(o.text ?? o.label ?? '')),
    correct: q.correct,
  }));
}

const REAL_LESSON = JSON.parse(
  readFileSync(
    join(FE, '..', 'scripts', 'pe-v4', 'out-advanced', 'lessons', '002-P02.json'),
    'utf8',
  ),
);

test('answersPayload gửi CHỈ SỐ phương án — chấm bằng chính hàm của backend thì đúng hết', () => {
  const pool = backendPool(REAL_LESSON);
  assert.ok(pool.length >= 3, 'fixture phải là câu hỏi thật của bài P02');
  // Dữ liệu thật: `correct` là số nguyên, phương án là chuỗi trần.
  for (const q of pool) {
    assert.equal(typeof q.correct, 'number');
    assert.ok(q.options.every((o) => typeof o === 'string' && o.length > 0));
  }

  // Người học chọn đúng phương án đúng ở mọi câu.
  const picks = pool.map((q) => q.correct);
  const payload = answersPayload(picks, pool.length);
  const score = pool.filter((q, i) => backendIsCorrect(q.correct, payload[i])).length;
  assert.equal(score, pool.length, 'chọn đúng hết mà backend không tính điểm');

  // Lỗi của trang cũ: gửi NỘI DUNG phương án. Giữ ca này để không ai làm lại.
  //
  // Lọc bỏ một câu có thật trong P02 mà nội dung phương án đúng LẠI LÀ "0"
  // (hỏi os.fork() trả về gì trong process con) — ở đúng câu đó gửi nội dung
  // vẫn khớp `String(0)` nên tình cờ được điểm. Chính kiểu tình cờ này làm lỗi
  // của trang cũ khó thấy: không phải sai sạch, chỉ sai gần hết.
  const textDiffers = pool.filter((q) => q.options[q.correct] !== String(q.correct));
  assert.ok(textDiffers.length >= 2, 'fixture phải có câu mà nội dung khác chỉ số');
  const wrong = textDiffers.filter((q) => backendIsCorrect(q.correct, q.options[q.correct])).length;
  assert.equal(wrong, 0, 'gửi nội dung phương án thì backend chấm 0 — đúng lỗi của trang /practice cũ');
});

test('câu bỏ trống gửi null (backend coi là chưa đúng, không ném lỗi)', () => {
  assert.deepEqual(answersPayload([2, null, 0], 4), [2, null, 0, null]);
  // Giá trị rác không được biến thành 0 — 0 là một phương án có thật.
  assert.deepEqual(answersPayload(['1', -1, 1.5, undefined], 4), [null, null, null, null]);
  assert.equal(backendIsCorrect(0, null), false);
});

/* ─────────────── 3. Cổng "phải xong 2 bài" — trạng thái trống ───────────── */

test('cổng tính ra từ MIN_POOL: 5 câu / 3 câu mỗi bài = 2 bài', () => {
  assert.equal(MIN_POOL, 5);
  assert.equal(MIN_LESSONS, 2);
});

test('chưa xong bài nào: nói rõ câu ôn lấy từ đâu, kèm lối đi, không trách', () => {
  const gate = planPractice({ completed: [] });
  assert.equal(gate.kind, 'empty');
  assert.equal(gate.completedCount, 0);
  assert.match(gate.body, /Xong 2 bài là có phần ôn đầu tiên/);
  assert.equal(gate.ctaLessonNo, 1);
  assert.equal(gate.ctaLabel, 'Mở bài 1');
  for (const bad of ['quá hạn', 'còn thiếu', 'phải hoàn thành', 'Sai rồi']) {
    assert.ok(!`${gate.headline} ${gate.body}`.includes(bad), `câu chữ thúc ép: ${bad}`);
  }
});

test('xong ĐÚNG 1 bài: nói trước là chưa ôn được, không để bấm rồi nhận lỗi 400', () => {
  const gate = planPractice({ completed: [1] });
  assert.equal(gate.kind, 'almost');
  assert.equal(gate.headline, 'Ôn tập mở sau khi bạn xong 2 bài — bạn đã xong 1');
  // Thông tin người học CẦN để hành động (còn thiếu mấy bài) nằm ở tiêu đề;
  // thân chỉ là lối đi tiếp, MỘT câu. Đoạn "Vì sao: mỗi bài góp 3 câu vào kho
  // ôn, mà một phần ôn cần ít nhất 5 câu" đã gỡ — đó là phép tính nội bộ.
  assert.equal(gate.body, 'Xong thêm một bài là đủ.');
  // Lối đi tiếp: bài trống đầu tiên, không phải "bài 1" cứng.
  assert.equal(gate.ctaLessonNo, 2);
});

test('xong 2 bài: mở phần ôn, nói kho ôn lấy từ mấy bài — không kể cơ chế', () => {
  const gate = planPractice({ completed: [1, 2] });
  assert.equal(gate.kind, 'ready');
  assert.match(gate.body, /2 bài bạn đã xong/);
  // Câu "Hệ thống lấy nhiều câu hơn từ những bài bạn hay chọn sai" đã gỡ: đó
  // là hệ thống kể về cơ chế của chính mình, và người học không làm gì với nó.
  assert.ok(!/hay chọn sai|Hệ thống lấy/.test(gate.body), gate.body);
});

test('tiến độ rời rạc: cổng đếm số bài THẬT, gợi ý bài trống đầu tiên', () => {
  // Xong bài 1 và 20: đủ 2 bài nên ôn được, nhưng bài gợi ý là 2 chứ không phải 21.
  const gate = planPractice({ completed: completedLessons([20, 1, 20, null, 0, 99, '3']) });
  assert.equal(gate.kind, 'ready');
  assert.equal(gate.completedCount, 3, 'số trùng/null/ngoài khoảng phải bị lọc');
  assert.equal(gate.ctaLessonNo, 2);
});

test('xong hết 48 bài: không còn bài để gợi ý, ôn tập vẫn mở', () => {
  const all = Array.from({ length: TOTAL_LESSONS }, (_, i) => i + 1);
  assert.equal(nextLessonNo(all), null);
  const gate = planPractice({ completed: all });
  assert.equal(gate.kind, 'ready');
  assert.equal(gate.ctaLabel, null);
});

test('server vẫn nói "chưa đủ câu hỏi": hiện trạng thái trống, KHÔNG hiện chữ lỗi', () => {
  const ready = planPractice({ completed: [1, 2] });
  const gate = gateFromError(ready, 'Chưa đủ câu hỏi để tạo quiz, hãy hoàn thành thêm bài học');
  assert.equal(gate.kind, 'almost');
  assert.ok(!gate.headline.includes('quiz'), 'không lặp lại chữ lỗi của server');
  assert.match(gate.body, /Xong thêm một bài là đủ/);
  // Lỗi lạ (502, mất mạng…) không được biến thành "kho ôn chưa đủ câu".
  assert.equal(gateFromError(ready, 'Internal server error').kind, 'ready');
  assert.equal(gateFromError(ready, undefined).kind, 'ready');
});

/* ──────── 4. Không vẽ phản hồi mức-lựa-chọn khi dữ liệu chưa có ────────── */

/** Đề gửi xuống trình duyệt: đúng khuôn `stripAnswers()` trên dữ liệu thật. */
function generatedBody() {
  const pool = backendPool(REAL_LESSON);
  return {
    ok: true,
    quiz_id: 41,
    questions: pool.map((q, i) => ({ index: i, question: q.question, options: q.options })),
  };
}

/** Response của `submit`: đúng khuôn `detail[i]` của backend. */
function gradedBody(picks) {
  const pool = backendPool(REAL_LESSON);
  const detail = pool.map((q, i) => ({
    question: q.question,
    given: picks[i] ?? null,
    correct: q.correct,
    is_correct: backendIsCorrect(q.correct, picks[i] ?? null),
    explanation: REAL_LESSON.content_json.step_2.mcq[i].explanation ?? null,
    lesson_id: 2,
  }));
  return { ok: true, score: detail.filter((d) => d.is_correct).length, total: detail.length, detail };
}

test('với dữ liệu backend đang gửi, optionFeedback LUÔN null (chưa có detail từng phương án)', () => {
  const quiz = readGeneratedQuiz(generatedBody());
  const picks = quiz.questions.map((_, i) => (i === 0 ? 1 : 0)); // câu 1 chọn sai
  const rows = readGradedQuestions(quiz.questions, gradedBody(picks).detail);

  assert.equal(rows.length, quiz.questions.length);
  for (const row of rows) {
    assert.equal(row.optionFeedback, null, 'vẽ phản hồi mức-lựa-chọn từ dữ liệu không có');
  }
  // Nhưng phản hồi MỨC CÂU thì có thật và phải hiện được.
  assert.equal(typeof rows[0].explanation, 'string');
  assert.equal(rows[0].isCorrect, false);
  assert.equal(rows[0].pickedIndex, 1);
  assert.equal(rows[0].correctIndex, 0);
  assert.equal(rows[1].isCorrect, true);
});

test('giao diện chỉ có một chỗ đọc optionFeedback, và chỉ khi nó có thật', () => {
  const src = codeOnly(read(...CLIENT));
  // Hôm nay màn hình KHÔNG được vẽ phản hồi theo từng phương án: dữ liệu chưa
  // có. Chỗ gắn vào sau này nằm ở GradedQuestion.optionFeedback (practice-plan).
  assert.ok(
    !src.includes('optionFeedback'),
    'trang đang vẽ phản hồi mức-lựa-chọn, nhưng backend chưa gửi detail của từng phương án',
  );
  assert.ok(src.includes('row.explanation'), 'phải hiện lời giải thích MỨC CÂU');
});

test('khi nào backend gửi option_details thì hàm đọc được ngay (chỗ gắn đã chừa)', () => {
  const quiz = readGeneratedQuiz(generatedBody());
  const body = gradedBody([1, 0, 0]);
  body.detail[0].option_details = ['a', 'b', 'c'];
  const rows = readGradedQuestions(quiz.questions, body.detail);
  assert.deepEqual(rows[0].optionFeedback, ['a', 'b', 'c']);
  // Thiếu một phần tử là dữ liệu hỏng — thà không hiện gì hơn hiện undefined.
  body.detail[1].option_details = ['a', 'b'];
  assert.equal(readGradedQuestions(quiz.questions, body.detail)[1].optionFeedback, null);
});

test('đề đọc vào chỉ giữ {index, question, options} — field lạ không lọt sang giao diện', () => {
  const body = generatedBody();
  // Giả cảnh server lỡ gửi kèm đáp án: trang không được mang nó đi đâu.
  body.questions[0].correct = 0;
  body.questions[0].explanation = 'đáp án';
  const quiz = readGeneratedQuiz(body);
  assert.deepEqual(Object.keys(quiz.questions[0]).sort(), ['index', 'options', 'question']);
  assert.equal(quiz.quizId, 41);
});

test('đề méo: phương án là object hoặc thiếu câu hỏi thì bỏ câu đó, không vẽ [object Object]', () => {
  const body = generatedBody();
  body.questions[1].options = [{ text: 'a' }, { text: 'b' }];
  delete body.questions[2].question;
  const quiz = readGeneratedQuiz(body);
  assert.equal(quiz.questions.length, 1);
  assert.equal(readGeneratedQuiz({ ok: true, quiz_id: 1, questions: [] }), null);
  assert.equal(readGeneratedQuiz({ ok: true, questions: [] }), null);
  assert.equal(readGeneratedQuiz(null), null);
});

test('index do backend gửi là nguồn chính; thiếu thì lấy vị trí trong mảng', () => {
  const quiz = readGeneratedQuiz({
    quiz_id: 2,
    questions: [
      { index: 5, question: 'a', options: ['x', 'y'] },
      { question: 'b', options: ['x'] },
    ],
  });
  assert.deepEqual(quiz.questions.map((q) => q.index), [5, 1]);
});

/* ───────────── 5. Nhịp ôn: chỉ hiện thứ tính được từ dữ liệu thật ───────── */

test('"Những lần ôn gần đây" đọc từ quiz/history, viết ngày kiểu "thứ Tư 14/10"', () => {
  const rows = recentReviews(
    [
      { id: 9, score: 4, total: 6, submittedAt: '2026-10-14T09:00:00.000Z' },
      { id: 8, score: 6, total: 6, submittedAt: '2026-10-12T09:00:00.000Z' },
      { id: 7, score: 2, total: 5, submittedAt: 'không-phải-ngày' },
      { id: 6, score: 3, total: 0, submittedAt: '2026-10-11T09:00:00.000Z' },
    ],
    5,
  );
  assert.equal(rows.length, 2, 'bản ghi méo phải bị bỏ, không hiện "NaN" hay "Invalid Date"');
  assert.match(rows[0].line, /^thứ \S+ \d+\/10 · Đúng 4 trên 6$/);
  assert.equal(recentReviews(null).length, 0);
  assert.equal(recentReviews([{ score: 1, total: 1, submittedAt: '2026-10-14' }], 0).length, 0);
});

test('không có bảng lịch Leitner nào bị bịa ra trên màn hình', () => {
  const src = textOnly(read(...CLIENT));
  // Hộp Leitner (1·3·7·14 ngày) chưa có bảng lưu. Màn hình chỉ được NÓI là
  // chưa có, không được vẽ hộp, không được vẽ biểu đồ 14 ngày.
  for (const bad of ['Hộp 1', 'Hộp 2', 'hộp 3', '14 ngày tới', 'gặp lại sau']) {
    assert.ok(!src.includes(bad), `vẽ lịch Leitner chưa có dữ liệu: "${bad}"`);
  }
  // ĐẢO CHIỀU 15/10/2026. Ca cũ ĐÒI màn hình nói "Chưa có lịch ôn theo ngày"
  // rồi giải thích rằng hệ thống không hẹn ngày gặp lại cho từng câu — tức
  // một đoạn văn về thứ hệ thống KHÔNG làm, đứng trong một khối viền nét đứt.
  // Không vẽ lịch Leitner thì không cần nói gì cả: không ai hỏi.
  for (const nope of ['Chưa có lịch ôn theo ngày', 'không hẹn ngày gặp lại', 'cân lại tỉ lệ']) {
    assert.ok(!src.includes(nope), `giải thích thứ hệ thống KHÔNG làm: "${nope}"`);
  }
  assert.ok(src.includes('mã khôi phục'), 'phải nói mã khôi phục là ĐỀ XUẤT chưa có');
});

test('điểm viết cộng dồn, không phần trăm, không xếp loại, không so với ai', () => {
  assert.equal(scoreLine(4, 6), 'Đúng 4 trên 6');
  const src = codeOnly(read(...CLIENT));
  // 'quá hạn' và 'đến hạn' nằm trong bảng thuật ngữ KHÔNG DÙNG: thẻ ôn chỉ chờ,
  // không có gì bị trừ. 'phần trăm', 'xếp hạng', 'Boss', so sánh với người khác
  // là bốn nhóm câu chữ bản thiết kế bắt bỏ.
  for (const bad of ['%', 'xếp hạng', 'chuỗi ngày', 'streak', 'Boss', 'giỏi hơn', 'quá hạn', 'đến hạn']) {
    assert.ok(!src.includes(bad), `câu chữ lệch triết lý tự học: "${bad}"`);
  }
});

test('ngày viết "thứ Tư 14/10"; ngày không đọc được trả null chứ không "Invalid Date"', () => {
  assert.equal(formatStudyDay(new Date(2026, 9, 14)), 'thứ Tư 14/10');
  assert.equal(formatStudyDay(new Date(2026, 9, 18)), 'Chủ nhật 18/10');
  assert.equal(formatStudyDay('rác'), null);
});

/**
 * Luật chống đúng loại AI slop đã có thật trên màn này: KHÔNG KỂ VỀ CƠ CHẾ CỦA
 * CHÍNH MÌNH · KHÔNG TRẢ LỜI CÂU HỎI CHƯA AI HỎI · KHÔNG RÀO ĐÓN · MỘT LỐI RA
 * CHỈ ĐÁNG CÓ KHI KHÔNG CÒN LỐI NÀO KHÁC · TRẠNG THÁI RỖNG KHÔNG CẦN MỘT ĐOẠN
 * VĂN NÓI RẰNG NÓ RỖNG.
 *
 * Bản cũ của /practice có bốn chỗ vi phạm, chủ sản phẩm chỉ ra khi xem bản
 * chạy thật:
 *  · thẻ cột phải: nhãn "Gợi ý bước tiếp · hệ thống chọn", đoạn "Vì sao: bạn
 *    đã xong 0/48 bài, và P01 … là bài trống đầu tiên trong giáo trình
 *    (M1 · …)", rồi "Đây là gợi ý, không phải lệnh. Bạn tự quyết đường đi:" và
 *    lối ra "Tự chọn bài" — bốn lớp bọc đúng MỘT cái nút;
 *  · thẻ "Chế độ thử thách": một đoạn giới thiệu luật chơi của một màn mà
 *    người đọc chưa mở;
 *  · "Những lần ôn gần đây" khi rỗng: một câu nói rằng nó rỗng;
 *  · khối viền nét đứt giải thích rằng hệ thống KHÔNG hẹn ngày gặp lại cho
 *    từng câu (kiểu 1·3·7·14 ngày).
 *
 * GIỮ LẠI, vì là thông tin người học cần để HÀNH ĐỘNG chứ không phải triết lý
 * sản phẩm: cổng "xong 2 bài mới ôn được" — không biết thì bấm rồi nhận 400.
 * Nhưng nói bằng MỘT câu, không bằng một đoạn.
 */
test('/practice không kể về cơ chế, không rào đón, không giải thích trước', () => {
  const CAM = [
    [/hệ thống chọn|do hệ thống|Hệ thống lấy|AI (?:chọn|đề xuất)/i, 'kể về cơ chế bên trong'],
    [/không phải lệnh|chỉ là gợi ý|bạn tự quyết/i, 'rào đón cho một gợi ý'],
    [/vì sao: bạn đã xong|bài trống đầu tiên|khác luật/i, 'trả lời câu hỏi chưa ai hỏi'],
    [/tự chọn bài/i, 'lối ra thừa: trang khoá đã ở trên thanh điều hướng'],
    [/chưa có lần ôn nào|sẽ nằm ở đây|chưa có lịch ôn/i, 'đoạn văn nói rằng rỗng là rỗng'],
  ];
  const be_mat = [
    ...[0, 1, 2, 48].flatMap((n) => {
      const g = planPractice({ completed: Array.from({ length: n }, (_, i) => i + 1) });
      return [g.headline, g.body, g.ctaLabel ?? ''];
    }),
    gateFromError(planPractice({ completed: [1, 2] }), 'Chưa đủ câu hỏi để tạo quiz').body,
    ...hienThi(codeOnly(read(...CLIENT))),
  ];
  for (const [mau, ly_do] of CAM) {
    const dinh = be_mat.filter((x) => mau.test(x));
    assert.deepEqual(dinh, [], ly_do + ':\n' + dinh.join('\n'));
  }

  // Thông tin phải CÒN: cổng 2 bài, và nói bằng MỘT câu.
  const trong = planPractice({ completed: [] });
  assert.ok(trong.body.includes(String(MIN_LESSONS)), 'mất con số "xong 2 bài"');
  assert.ok(trong.body.length <= 60, `thân dài ${trong.body.length} ký tự — một câu là đủ`);

  // Tự kiểm năm phép so trên chính câu chữ CŨ: một hàng rào không bắt nổi bản
  // cũ là hàng rào chết mà vẫn báo đạt.
  const CU = [
    'Gợi ý bước tiếp · hệ thống chọn',
    'Đây là gợi ý, không phải lệnh. Bạn tự quyết đường đi:',
    'Vì sao: bạn đã xong 0/48 bài, và P01 là bài trống đầu tiên trong giáo trình',
    'Tự chọn bài',
    'Chưa có lần ôn nào được lưu. Phần ôn đầu tiên của bạn sẽ nằm ở đây.',
  ];
  for (let k = 0; k < CAM.length; k += 1) {
    assert.ok(CAM[k][0].test(CU[k]), `mẫu ${k} không bắt nổi chuỗi cũ: ${CU[k]}`);
  }
  // Và đoạn giới thiệu "Chế độ thử thách" cũ phải bị mẫu thứ ba bắt được.
  assert.ok(CAM[2][0].test('Cùng kho câu này, khác luật: đi một câu một lần'));
});

/* ─────────────────── 6. Nhãn bài lấy từ giáo trình tĩnh ─────────────────── */

test('nhãn bài phẳng theo số bài, kèm tên chặng (không ghép thêm mã bài)', () => {
  const labels = lessonLabels([
    { title: 'M1 · Tiến trình và subprocess', lessons: ['P01 · a', 'P02 · b'] },
    { title: 'M2 · Khung cửi song song', lessons: ['T01 · c'] },
  ]);
  assert.equal(labels.get(1).title, 'P01 · a');
  assert.equal(labels.get(3).title, 'T01 · c');
  assert.equal(labels.get(3).stage, 'M2 · Khung cửi song song');
  assert.equal(labels.get(4), undefined);
  assert.equal(lessonLabels(null).size, 0);
});

test('giáo trình thật có đúng 48 bài — nhãn không lệch với TOTAL_LESSONS', () => {
  const curricula = JSON.parse(read('src', 'lib', 'curricula.json'));
  const labels = lessonLabels(curricula.CURRICULA[COURSE_ID].modules);
  assert.equal(labels.size, TOTAL_LESSONS);
  assert.ok(labels.get(TOTAL_LESSONS).title.length > 0);
});

/* ───────────────────────── 7. Màu và cỡ chữ qua token ───────────────────── */

test('CSS của trang không viết mã màu nào (chỉ var(--ds-…))', () => {
  const css = read(...CSS).replace(/\/\*[\s\S]*?\*\//g, ' ');
  const hex = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  const fn = css.match(/\b(?:rgba?|hsla?)\(/g) ?? [];
  assert.deepEqual(hex, [], `còn mã màu hex: ${hex.join(' ')}`);
  assert.deepEqual(fn, [], `còn màu viết bằng ${fn.join(' ')} — phải qua token`);
  // Cỡ chữ cũng qua thang token: không có cỡ thứ chín, và không có chữ < 15px.
  const sizes = css.match(/font-size:\s*[^;]+;/g) ?? [];
  const raw = sizes.filter((s) => !s.includes('var(--ds-fs-'));
  assert.deepEqual(raw, [], `cỡ chữ viết thẳng: ${raw.join(' ')}`);
});

test('TSX của trang không viết mã màu, không style nội tuyến', () => {
  const src = codeOnly(read(...CLIENT));
  const hex = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  assert.deepEqual(hex, [], `màu viết thẳng trong TSX: ${hex.join(' ')}`);
  // style={{…}} bị `style-src` của CSP chặn khi SSR tuần tự hoá (xem AGENTS.md).
  assert.ok(!/style=\{\{/.test(src), 'style nội tuyến — dùng CSS module');
});

/*
 * ── BẰNG CHỨNG BỘ CA NÀY BẮT ĐƯỢC LỖI (đo 15/10/2026) ─────────────────────
 * Gỡ từng bản sửa ra rồi chạy `npm run test:unit`:
 *
 *  1. `reviewPath()` trả '/api/courses/:id/quiz/generate' (bản random đều,
 *     đúng endpoint trang /practice cũ dùng) → 2 ca trượt.
 *  2. `answersPayload()` trả nội dung phương án thay vì chỉ số (đúng lỗi của
 *     trang cũ) → 2 ca trượt.
 *  3. `MIN_LESSONS = 1` (bỏ cổng "phải xong 2 bài") → 3 ca trượt.
 *  4. `readGradedQuestions()` bịa optionFeedback bằng cách nhân bản
 *     `explanation` mức câu cho từng phương án → 2 ca trượt.
 *  5. PracticeClient.tsx đọc `row.optionFeedback` để vẽ phản hồi mức-lựa-chọn,
 *     và đổi ghi chú trung thực thành "Hộp 1 → Hộp 2 · gặp lại sau 3 ngày"
 *     (vẽ lịch Leitner chưa có dữ liệu) → 2 ca trượt.
 *  6. Một mã màu viết thẳng trong practice.module.css → 1 ca trượt.
 */
