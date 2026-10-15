/**
 * practice-plan.ts — các quyết định của trang "Ôn tập của tôi" (/practice).
 *
 * Vì sao tách ra file riêng, không import gì theo alias '@/…': bộ test chạy
 * bằng `node --test` thuần (script `test:unit`) và runner đó không phân giải
 * alias — cùng lý do đã ghi ở src/lib/course-progress.ts và feedback-link.ts.
 *
 * Vì sao những quyết định dưới đây phải là hàm thuần có test, chứ không nằm
 * rải trong JSX: cả bốn cái đều ĐÃ hoặc SẼ sai một cách im lặng, mở trang bằng
 * mắt không thấy.
 *
 *  1. CHỌN ĐÚNG ENDPOINT. Backend có BA đường sinh đề và chỉ một đường đúng
 *     cho trang này (xem REVIEW_PATH / REJECTED_PATHS). Gọi lầm `quiz/generate`
 *     thì đề vẫn hiện ra, vẫn chấm được, chỉ mất hẳn trọng số "bài hay sai thì
 *     gặp lại nhiều hơn" — tức mất đúng phần thích ứng duy nhất đang có, mà
 *     trên màn hình không có dấu hiệu nào. Gọi lầm `quiz/generate-review`
 *     (bản hằng ngày, không có khoá trong đường dẫn) thì ôn lần thứ hai trong
 *     ngày bị chặn bằng lỗi 400.
 *
 *  2. GỬI ĐÚNG KIỂU CÂU TRẢ LỜI. Backend chấm bằng
 *     `String(q.correct) === String(answers[i])`, mà `q.correct` của toàn bộ
 *     146 câu trong giáo trình là CHỈ SỐ phương án (số nguyên). Trang /practice
 *     cũ (xoá ở cd9c05a) gửi NỘI DUNG phương án nên mọi câu đều bị tính sai và
 *     điểm luôn 0 — không ai thấy vì màn hình vẫn chạy trọn luồng. Xem
 *     `answersPayload()`.
 *
 *  3. CỔNG "PHẢI XONG 2 BÀI". `buildQuestionPool()` đòi kho câu ≥ 5, mà mỗi bài
 *     chỉ góp 3 câu (46/48 bài) hoặc 4 câu (2 bài) — nên thực tế phải xong 2
 *     bài mới ôn được. Người vừa xong bài đầu bấm "Ôn tập" sẽ nhận lỗi 400.
 *     `planPractice()` nói trước điều đó bằng câu tử tế thay vì để họ vấp.
 *
 *  4. KHÔNG VẼ THỨ CHƯA CÓ. `normalizeQuestion()` của backend ép mỗi phương án
 *     thành chuỗi trần và BỎ field `detail` (lời giải thích riêng của từng
 *     phương án) — dù cả 438 phương án trong giáo trình đều có. Nên phản hồi
 *     hiện được chỉ tới MỨC CÂU (`explanation`). `readGradedQuestions()` trả
 *     `optionFeedback: null` đúng vào chỗ sau này gắn `detail` vào là xong, và
 *     test chốt rằng với dữ liệu backend đang gửi thì nó LUÔN null.
 */

/** Khoá duy nhất đang chạy (xem src/lib/catalog.ts). */
export const COURSE_ID = 'python_advanced';

/** Số bài của giáo trình pe-v4 đang chạy. */
export const TOTAL_LESSONS = 48;

/**
 * Kho câu tối thiểu để backend sinh được một đề — hằng `MIN_POOL` trong
 * src/quizzes/quizzes.service.ts. Chép sang đây để NÓI TRƯỚC cho người học;
 * không phải nơi đổi luật (đổi thì đổi ở backend).
 */
export const MIN_POOL = 5;

/** Số câu trắc nghiệm ít nhất mà một bài góp vào kho (46/48 bài góp đúng 3). */
export const QUESTIONS_PER_LESSON = 3;

/**
 * Số bài phải xong trước khi ôn được: 5 câu / 3 câu mỗi bài → 2 bài.
 * Tính ra chứ không viết thẳng số 2, để nếu backend hạ `MIN_POOL` (việc riêng,
 * cần đo kỹ hơn) thì câu chữ trên màn hình đi theo luôn.
 */
export const MIN_LESSONS = Math.ceil(MIN_POOL / QUESTIONS_PER_LESSON);

/**
 * Đường sinh đề ĐÚNG cho trang này: có trọng số theo bài hay sai, không cổng
 * theo ngày, không giới hạn số lần.
 */
export function reviewPath(courseId: string): string {
  return `/api/courses/${encodeURIComponent(courseId)}/quiz/generate-review`;
}

/**
 * Hai đường KHÔNG được dùng, kèm lý do. Để ở đây (chứ chỉ trong chú thích) để
 * test chốt được rằng trang không gọi chúng: lầm đường là lỗi im lặng.
 */
export const REJECTED_PATHS: ReadonlyArray<{ path: string; why: string }> = [
  {
    path: '/api/courses/:id/quiz/generate',
    why: 'sample() random đều — mất trọng số "bài hay sai thì gặp lại nhiều hơn"',
  },
  {
    path: '/api/quiz/generate-review',
    why: 'đề ôn hằng ngày: mỗi ngày chỉ một đề, ôn lần hai trong ngày bị chặn 400',
  },
];

export function submitPath(quizId: number): string {
  return `/api/quizzes/${quizId}/submit`;
}

export function historyPath(courseId: string): string {
  return `/api/courses/${encodeURIComponent(courseId)}/quiz/history`;
}

export const ENROLLED_PATH = '/api/enrolled';

/* ─────────────────────────── tiến độ trong khoá ─────────────────────────── */

/**
 * Lọc `completedLessonNumbers` của `/api/enrolled` về tập số bài hợp lệ.
 *
 * Phải lọc chứ không đếm thẳng độ dài mảng: DB dùng chung với bản Django cũ nên
 * mảng này có thể lẫn số trùng, số null, hoặc số của bài đã gỡ khỏi giáo trình.
 * Số rác lọt vào làm bộ đếm vượt 48 và làm cổng "đã xong 2 bài" mở sớm.
 */
export function completedLessons(raw: unknown, total = TOTAL_LESSONS): number[] {
  const seen = new Set<number>();
  if (!Array.isArray(raw)) return [];
  for (const item of raw) {
    const n = typeof item === 'number' ? item : Number(item);
    if (Number.isInteger(n) && n >= 1 && n <= total) seen.add(n);
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * Bài gợi ý học tiếp: bài TRỐNG ĐẦU TIÊN, không phải "bài lớn nhất + 1".
 * Người học nhảy xuống bài 20 trước thì những bài trống ở giữa vẫn được nhắc
 * lại, không bị bỏ quên. Xong hết 48 bài thì trả null.
 */
export function nextLessonNo(done: number[], total = TOTAL_LESSONS): number | null {
  const set = new Set(done);
  for (let n = 1; n <= total; n += 1) if (!set.has(n)) return n;
  return null;
}

export type PracticeGate =
  | {
      kind: 'empty';
      /** Tiêu đề trạng thái trống. */
      headline: string;
      /** Vì sao trống + bắt đầu thế nào. Không có lời trách. */
      body: string;
      /** Nhãn nút đi học; null khi không còn bài nào để mở. */
      ctaLabel: string | null;
      ctaLessonNo: number | null;
      completedCount: number;
    }
  | {
      kind: 'almost';
      headline: string;
      body: string;
      ctaLabel: string | null;
      ctaLessonNo: number | null;
      completedCount: number;
    }
  | {
      kind: 'ready';
      headline: string;
      body: string;
      ctaLabel: string | null;
      ctaLessonNo: number | null;
      completedCount: number;
    };

/**
 * Trang ôn tập đang ở trạng thái nào, theo tiến độ THẬT trong khoá.
 *
 * Ba trạng thái, và cả hai trạng thái không-ôn-được đều phải nói rõ còn thiếu
 * gì và cho một lối đi — không bao giờ để người học bấm rồi mới nhận lỗi.
 */
export function planPractice(input: {
  completed: number[];
  total?: number;
  minLessons?: number;
}): PracticeGate {
  const total = input.total ?? TOTAL_LESSONS;
  const minLessons = input.minLessons ?? MIN_LESSONS;
  const done = input.completed.length;
  const next = nextLessonNo(input.completed, total);
  const cta = next === null ? null : `Mở bài ${next}`;

  if (done === 0) {
    return {
      kind: 'empty',
      headline: 'Chưa có câu ôn nào',
      // MỘT câu, và nó là THÔNG TIN ĐỂ HÀNH ĐỘNG: không biết con số này thì
      // người học bấm "Ôn tập" rồi nhận lỗi 400. Câu "câu ôn lấy từ chính
      // những câu bạn trả lời trong bài" đứng trước nó đã gỡ — đó là kể về cơ
      // chế của chính mình.
      body: `Xong ${minLessons} bài là có phần ôn đầu tiên.`,
      ctaLabel: cta,
      ctaLessonNo: next,
      completedCount: done,
    };
  }

  if (done < minLessons) {
    return {
      kind: 'almost',
      headline: `Ôn tập mở sau khi bạn xong ${minLessons} bài — bạn đã xong ${done}`,
      // Tiêu đề đã nói còn thiếu bao nhiêu bài; phép tính đằng sau
      // (mỗi bài góp 3 câu, một phần ôn cần 5 câu) là chuyện nội bộ.
      body: 'Xong thêm một bài là đủ.',
      ctaLabel: cta,
      ctaLessonNo: next,
      completedCount: done,
    };
  }

  return {
    kind: 'ready',
    headline: 'Phần ôn của bạn đã sẵn',
    body: `Kho ôn đang có câu từ ${done} bài bạn đã xong.`,
    ctaLabel: cta,
    ctaLessonNo: next,
    completedCount: done,
  };
}

/**
 * Lỗi 400 của backend → trạng thái trống tử tế.
 *
 * Vì sao cần cả đường này khi đã có `planPractice()`: hai nguồn số bài đã xong
 * không nhất thiết trùng nhau (`/api/enrolled` đọc bảng `lesson_progress`, kho
 * câu đọc `content_json` của từng bài — bài không có `step_2.mcq` thì xong vẫn
 * không góp câu nào). Khi lệch, người học vẫn phải thấy câu tử tế chứ không
 * phải chữ lỗi của server.
 */
export function gateFromError(gate: PracticeGate, message: unknown): PracticeGate {
  const text = typeof message === 'string' ? message : '';
  const known =
    text.includes('hoàn thành ít nhất một bài') || text.includes('Chưa đủ câu hỏi');
  if (!known) return gate;
  // Giữ nguyên nhánh 'empty'/'almost' đã tính được; chỉ hạ nhánh 'ready' xuống
  // vì server vừa nói thẳng là kho câu chưa đủ.
  if (gate.kind !== 'ready') return gate;
  return {
    kind: 'almost',
    headline: 'Kho ôn chưa đủ câu',
    body: 'Xong thêm một bài là đủ.',
    ctaLabel: gate.ctaLabel,
    ctaLessonNo: gate.ctaLessonNo,
    completedCount: gate.completedCount,
  };
}

/* ─────────────────────────────── đề và chấm ─────────────────────────────── */

export type ReviewQuestion = {
  /** Số thứ tự TỪ 0 do backend gửi (`index`), không phải `question_no`. */
  index: number;
  question: string;
  /** Mảng CHUỖI — backend đã ép mỗi phương án về chuỗi trần. */
  options: string[];
};

export type ReviewQuiz = { quizId: number; questions: ReviewQuestion[] };

/**
 * Đọc response của `generate-review` → { quizId, questions }, hoặc null nếu
 * khuôn dữ liệu không dùng được.
 *
 * Chỉ giữ ĐÚNG ba field trong danh sách cho phép của `stripAnswers()`
 * ({index, question, options}). Lấy thêm field lạ là mời chính mình vẽ đáp án
 * ra màn hình nếu một ngày nào đó server lỡ gửi kèm `correct`.
 */
export function readGeneratedQuiz(body: unknown): ReviewQuiz | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;
  const quizId = typeof raw.quiz_id === 'number' ? raw.quiz_id : Number(raw.quiz_id);
  if (!Number.isInteger(quizId)) return null;
  if (!Array.isArray(raw.questions)) return null;

  const questions: ReviewQuestion[] = [];
  raw.questions.forEach((item, i) => {
    if (!item || typeof item !== 'object') return;
    const q = item as Record<string, unknown>;
    if (typeof q.question !== 'string' || !Array.isArray(q.options)) return;
    // Phương án phải là chuỗi: object lọt tới đây sẽ vẽ ra '[object Object]'
    // trên nút chọn, nên bỏ cả câu thay vì hiện nhãn rác.
    if (!q.options.every((o) => typeof o === 'string')) return;
    const index = typeof q.index === 'number' && Number.isInteger(q.index) ? q.index : i;
    questions.push({ index, question: q.question, options: q.options });
  });

  return questions.length ? { quizId, questions } : null;
}

/**
 * Mảng câu trả lời GỬI LÊN: theo VỊ TRÍ câu, giá trị là CHỈ SỐ phương án.
 *
 * Backend chấm bằng `String(q.correct) === String(answers[i])` và `q.correct`
 * của cả 146 câu trong giáo trình là chỉ số (số nguyên) — gửi nội dung phương
 * án như trang /practice cũ thì điểm luôn 0. Câu chưa chọn gửi null; backend
 * coi null là chưa đúng và không ném lỗi.
 */
export function answersPayload(
  picks: ReadonlyArray<number | null>,
  count: number,
): Array<number | null> {
  const out: Array<number | null> = [];
  for (let i = 0; i < count; i += 1) {
    const pick = picks[i];
    out.push(typeof pick === 'number' && Number.isInteger(pick) && pick >= 0 ? pick : null);
  }
  return out;
}

export type GradedQuestion = {
  index: number;
  question: string;
  options: string[];
  /** Phương án bạn đã chọn; null khi bỏ trống. */
  pickedIndex: number | null;
  /** Phương án đúng; null khi response không nói rõ. */
  correctIndex: number | null;
  isCorrect: boolean;
  /** Lời giải thích MỨC CÂU — thứ duy nhất backend đang gửi. */
  explanation: string | null;
  /**
   * Lời giải thích riêng của TỪNG phương án.
   *
   * LUÔN null với dữ liệu backend hiện tại: `normalizeQuestion()` bỏ field
   * `detail` của từng phương án khi gom kho câu, nên nó không bao giờ tới được
   * trình duyệt. Giữ chỗ ở đây để ngày gắn `detail` vào thì giao diện chỉ việc
   * đọc — và để test chốt rằng hôm nay KHÔNG màn nào vẽ phản hồi mức-lựa-chọn.
   */
  optionFeedback: string[] | null;
};

/**
 * Ghép response của `submit` với đề đang hiện → danh sách câu đã chấm.
 *
 * `detail[i]` của backend là { question, given, correct, is_correct, explanation }
 * — KHÔNG có `percentage`, `your_answer`, `correct_answer`.
 */
export function readGradedQuestions(
  questions: ReadonlyArray<ReviewQuestion>,
  detail: unknown,
): GradedQuestion[] {
  const rows: unknown[] = Array.isArray(detail) ? detail : [];
  return questions.map((q, i) => {
    const row = (rows[i] && typeof rows[i] === 'object' ? rows[i] : {}) as Record<
      string,
      unknown
    >;
    const inRange = (v: unknown): number | null => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isInteger(n) && n >= 0 && n < q.options.length ? n : null;
    };
    // `given` là chính giá trị trang này vừa gửi lên (chỉ số phương án).
    const pickedIndex = row.given === null || row.given === undefined ? null : inRange(row.given);
    const optionFeedback = Array.isArray(row.option_details)
      && row.option_details.length === q.options.length
      && row.option_details.every((d) => typeof d === 'string')
      ? (row.option_details as string[])
      : null;
    return {
      index: q.index,
      question: q.question,
      options: q.options,
      pickedIndex,
      correctIndex: inRange(row.correct),
      isCorrect: row.is_correct === true,
      explanation: typeof row.explanation === 'string' && row.explanation.trim()
        ? row.explanation
        : null,
      optionFeedback,
    };
  });
}

/** "Đúng 4 trên 6" — cộng dồn, không phần trăm, không xếp loại, không so với ai. */
export function scoreLine(score: number, total: number): string {
  return `Đúng ${score} trên ${total}`;
}

/* ───────────────────────── nhịp ôn (từ dữ liệu thật) ───────────────────── */

const DOW = ['Chủ nhật', 'thứ Hai', 'thứ Ba', 'thứ Tư', 'thứ Năm', 'thứ Sáu', 'thứ Bảy'];

/** "thứ Tư 14/10" — đúng lối viết ngày đã chốt trong hướng dẫn câu chữ. */
export function formatStudyDay(value: unknown): string | null {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return `${DOW[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}

export type PastReview = { day: string; score: number; total: number; line: string };

/**
 * Những lần ôn gần đây, đọc từ `/courses/:id/quiz/history`.
 *
 * Vì sao chỗ này KHÔNG phải lịch Leitner 14 ngày như bản thiết kế: hệ thống
 * chưa có bảng nào lưu hộp/ngày gặp lại của từng câu, nên mọi con số 1·3·7·14
 * vẽ ra đều là số bịa. Lịch sử các lần ôn thì có thật trong DB — hiện đúng thứ
 * tính được từ dữ liệu thật, không hơn.
 */
export function recentReviews(rows: unknown, limit = 5): PastReview[] {
  const list: unknown[] = Array.isArray(rows) ? rows : [];
  const out: PastReview[] = [];
  for (const item of list) {
    // Kiểm hạn mức TRƯỚC khi lấy thêm: `limit = 0` phải ra danh sách rỗng, chứ
    // không phải một dòng rồi mới dừng.
    if (out.length >= limit) break;
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const day = formatStudyDay(r.submittedAt ?? r.submitted_at);
    const score = Number(r.score);
    const total = Number(r.total);
    if (!day || !Number.isFinite(score) || !Number.isFinite(total) || total <= 0) continue;
    out.push({ day, score, total, line: `${day} · ${scoreLine(score, total)}` });
  }
  return out;
}

/* ─────────────────────────── nhãn bài từ giáo trình ─────────────────────── */

export type LessonLabel = { no: number; title: string; stage: string };

/**
 * Giáo trình (`curricula.json`) → nhãn phẳng theo số bài.
 *
 * Nhận `modules` từ ngoài thay vì tự import JSON: file này phải không import gì
 * để `node --test` nạp được. Tiêu đề trong giáo trình đã mang mã bài
 * ("P06 · Popen, communicate và timeout") nên không ghép thêm mã nữa.
 */
export function lessonLabels(modules: unknown): Map<number, LessonLabel> {
  const out = new Map<number, LessonLabel>();
  if (!Array.isArray(modules)) return out;
  let no = 0;
  for (const m of modules) {
    if (!m || typeof m !== 'object') continue;
    const mod = m as Record<string, unknown>;
    const stage = typeof mod.title === 'string' ? mod.title : '';
    const lessons: unknown[] = Array.isArray(mod.lessons) ? mod.lessons : [];
    for (const l of lessons) {
      no += 1;
      if (typeof l === 'string') out.set(no, { no, title: l, stage });
    }
  }
  return out;
}
