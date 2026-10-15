/**
 * challenge-run.ts — các quyết định của màn "Thử thách ôn" (/practice/challenge).
 *
 * Màn này là chế độ ôn MỘT CÂU MỘT LẦN của trang "Ôn tập của tôi": chốt từng
 * câu, sai lần đầu thì được nghĩ lại một lần, cuối lượt mới tổng kết. Không
 * đồng hồ, không xếp hạng, không chuỗi ngày, không điểm tốc độ — nghiên cứu
 * đứng sau đã bỏ hẳn phần "đấu với người khác" (không đủ người để ghép cặp,
 * trạng thái trận nằm trong RAM một tiến trình nên mất mỗi lần deploy, và thứ
 * hạng tiêu cực hại động lực hơn là không báo gì).
 *
 * Vì sao tách ra file riêng, KHÔNG import gì theo alias '@/…': bộ test chạy
 * bằng `node --test` thuần (`npm run test:unit`) và runner đó không phân giải
 * alias — cùng lý do đã ghi ở practice-plan.ts và course-progress.ts.
 *
 * Vì sao những hàm dưới đây phải là hàm thuần có test, chứ không nằm rải trong
 * JSX: cả năm cái đều sai một cách IM LẶNG, mở trang bằng mắt không thấy.
 *
 *  1. ĐÁP ÁN KHÔNG ĐƯỢC LỘ Ở LẦN SAI ĐẦU. Luật chơi: sai lần đầu thì chưa lộ
 *     đáp án, cho nghĩ lại một lần, sai lần hai mới lộ. Nhưng đáp án đã NẰM
 *     TRONG BỘ NHỚ trình duyệt từ lúc máy chủ chấm (xem mục 2), nên chỉ cần
 *     một nhánh JSX vẽ `cell.correctIndex` không kèm điều kiện là lộ hết —
 *     và lộ ở đúng trạng thái ít gặp nhất khi xem trang bằng mắt. Vì vậy mọi
 *     chỗ hiện đáp án đều phải đi qua `visibleCorrectIndex()`, và test chốt
 *     rằng ở trạng thái 'rethinking' nó trả null.
 *
 *  2. MÁY CHỦ CHẤM CẢ ĐỀ MỘT LƯỢT, KHÔNG CHẤM TỪNG CÂU. `POST /quizzes/:id/submit`
 *     chỉ nộp được MỘT lần (lần hai nhận 409 'Quiz này đã được nộp'), và trình
 *     duyệt KHÔNG hề biết đáp án trước đó — `stripAnswers()` chỉ gửi
 *     {index, question, options}. Nên luồng của bản thiết kế ("chốt một câu →
 *     phản hồi ngay → nghĩ lại") không chạy được nguyên văn. Cách giải ở đây,
 *     và nó được nói thẳng trên màn hình:
 *       · LƯỢT CHỐT: chốt lần lượt 10 câu, KHÔNG có phản hồi nào (trình duyệt
 *         chưa có gì để chấm — nói trước điều này ở màn mở đầu);
 *       · nộp cả đề một lượt → máy chủ trả `is_correct`, `correct`,
 *         `explanation`, `lesson_id` cho từng câu. Đây là ĐIỂM CHÍNH THỨC, và
 *         là điểm duy nhất được lưu vào DB;
 *       · LƯỢT NGHĨ LẠI: những câu chưa đúng được chọn lại một lần; lần này
 *         TRÌNH DUYỆT tự chấm bằng đáp án máy chủ vừa gửi, và KHÔNG gửi lên
 *         (đề đã nộp rồi). Màn kết quả phải nói rõ con số nào do đâu.
 *     `splitScore()` giữ đúng sự phân đôi đó để không ai cộng hai loại điểm
 *     vào một con số.
 *
 *  3. CHỈ SỐ MANG RA SO PHẢI CHỈ TĂNG. Bản thiết kế vẽ "câu đã chắc" = một câu
 *     trả lời đúng ngay lần đầu ở HAI ngày khác nhau. Hệ thống KHÔNG có bảng
 *     nào lưu lịch sử theo từng câu: `quiz/history` chỉ trả {score, total,
 *     submittedAt}. Nên chỉ số đó không tính được và KHÔNG được bịa. Thứ tính
 *     được từ dữ liệu thật là `cumulativeFirstTry()`: cộng dồn số câu đúng
 *     ngay lần đầu qua các lượt đã lưu — "ngay lần đầu" là chính xác vì mỗi đề
 *     chỉ nộp được một lần, nên mọi câu máy chủ tính đúng đều là lần thử đầu.
 *     Nó đếm LƯỢT TRẢ LỜI, không phải câu khác nhau, và màn hình phải nói thế.
 *
 *  4. PHẢN HỒI MỨC TỪNG LỰA CHỌN CHƯA CÓ. `normalizeQuestion()` của backend ép
 *     mỗi phương án thành chuỗi trần và BỎ field `detail` (lời giải thích riêng
 *     của từng phương án) — dù cả 438 phương án trong giáo trình đều có. Nên
 *     "Vì sao phương án bạn vừa chọn là sai" KHÔNG dựng được; chỗ duy nhất
 *     chừa sẵn để gắn là `optionFeedback` của practice-plan.ts, hôm nay luôn
 *     null, và màn này KHÔNG đọc nó (test chốt).
 *
 *  5. ĐƯỜNG NỘP HỎNG. Nộp cả đề mà mất mạng / 429 / 409 thì màn quay về lượt
 *     chốt với MỌI ô ĐÃ CHỐT. Suy "câu này còn bấm được không" từ `phase` —
 *     chứ không từ chính ô đó — làm các nút phương án bật lại, và lựa chọn mới
 *     sáng lên trong khi lượt nộp lại vẫn gửi lựa chọn CŨ: điểm chính thức ghi
 *     sai so với thao tác cuối của người học, không một lỗi nào được ném ra.
 *     Đó là việc của `runStage()`, và nó có ca test đi đúng kịch bản đó.
 */

/* ───────────────────────────── số câu mỗi lượt ──────────────────────────── */

/**
 * Hai hằng `SAMPLE_MIN`/`SAMPLE_MAX` của src/quizzes/quizzes.service.ts.
 * Chép sang đây để NÓI TRƯỚC lượt này sẽ có mấy câu; không phải nơi đổi luật.
 */
export const SAMPLE_MIN = 5;
export const SAMPLE_MAX = 10;

/** Số câu trắc nghiệm ít nhất mà một bài góp vào kho (46/48 bài góp đúng 3). */
export const QUESTIONS_PER_LESSON = 3;

/**
 * Số bài phải xong để lượt đủ 10 câu: 10 / 3 câu mỗi bài → 4 bài.
 * Tính ra chứ không viết số 4, để đổi hằng ở backend thì câu chữ đi theo.
 */
export const LESSONS_FOR_FULL_RUN = Math.ceil(SAMPLE_MAX / QUESTIONS_PER_LESSON);

/**
 * Số câu lượt này sẽ có, suy từ số bài đã xong — `sampleSize()` của backend
 * kẹp trong [5, 10] theo cỡ kho câu.
 *
 * Trả 0 khi kho câu chưa đủ 5 (backend sẽ từ chối bằng 400). Con số này là
 * CẬN DƯỚI: 2/48 bài góp 4 câu thay vì 3, nên kho có thể lớn hơn — vì vậy câu
 * chữ trên màn hình nói "ít nhất", và số thật lấy từ đề khi đề về.
 */
export function expectedQuestionCount(
  completedCount: number,
  perLesson = QUESTIONS_PER_LESSON,
): number {
  const pool = Math.max(0, Math.floor(completedCount)) * perLesson;
  if (pool < SAMPLE_MIN) return 0;
  return Math.min(SAMPLE_MAX, Math.max(SAMPLE_MIN, Math.min(pool, SAMPLE_MAX)));
}

/* ──────────────────────────── cổng vào màn này ──────────────────────────── */

export type ChallengeGate = {
  /** 'locked' chưa ôn được · 'short' ôn được nhưng chưa đủ 10 câu · 'ready' */
  kind: 'locked' | 'short' | 'ready';
  headline: string;
  /** Vì sao lại thế, và làm gì tiếp. Không có lời trách. */
  body: string;
  /** Số câu dự kiến; 0 khi chưa ôn được. */
  expected: number;
  canStart: boolean;
  completedCount: number;
};

/**
 * Màn này đang ở trạng thái nào, theo tiến độ THẬT trong khoá.
 *
 * Vì sao cần một cổng RIÊNG, không dùng lại `planPractice()` của /practice:
 * /practice chạy được với 5 câu, còn "Thử thách ôn" hứa 10 câu. Hứa 10 rồi
 * phát 6 là nói sai, nên ngưỡng ở đây là `LESSONS_FOR_FULL_RUN` (4 bài) và
 * khoảng giữa (2–3 bài) được nói thẳng: ôn được, nhưng lượt này ngắn hơn.
 */
export function challengeGate(input: {
  completed: number[];
  minLessons?: number;
}): ChallengeGate {
  const done = input.completed.length;
  const minLessons = input.minLessons ?? Math.ceil(SAMPLE_MIN / QUESTIONS_PER_LESSON);
  const expected = expectedQuestionCount(done);

  if (done < minLessons || expected === 0) {
    return {
      kind: 'locked',
      headline: `Thử thách ôn mở sau khi bạn xong ${minLessons} bài`,
      body:
        `Bạn đã xong ${done} bài. Câu trong lượt thử thách lấy từ chính những câu bạn `
        + `đã trả lời trong bài, mà mỗi bài góp ${QUESTIONS_PER_LESSON} câu và một lượt `
        + `cần ít nhất ${SAMPLE_MIN} câu.`,
      expected: 0,
      canStart: false,
      completedCount: done,
    };
  }

  if (done < LESSONS_FOR_FULL_RUN) {
    return {
      kind: 'short',
      headline: `Lượt này ít nhất ${expected} câu, chưa đủ ${SAMPLE_MAX}`,
      body:
        `Bạn đã xong ${done} bài nên kho ôn mới có khoảng ${done * QUESTIONS_PER_LESSON} câu. `
        + `Xong ${LESSONS_FOR_FULL_RUN} bài là mỗi lượt đủ ${SAMPLE_MAX} câu. `
        ,
      expected,
      canStart: true,
      completedCount: done,
    };
  }

  return {
    kind: 'ready',
    // Bản cũ: tiêu đề "15 câu, không tính giờ, không xếp hạng" + một đoạn kể
    // cơ chế trọng số ("Hệ thống lấy nhiều câu hơn từ những bài bạn hay chọn
    // sai") và một lời trấn an ("Sai ở đây không trừ gì cả"). Giữ lại đúng con
    // số người học cần biết trước khi bấm Bắt đầu.
    headline: `${SAMPLE_MAX} câu`,
    body: '',
    expected,
    canStart: true,
    completedCount: done,
  };
}

/* ─────────────────────── một câu trong lượt thử thách ───────────────────── */

export type RunCell = {
  /** `index` do backend gửi (từ 0), không phải số thứ tự bài. */
  index: number;
  question: string;
  /** Mảng CHUỖI — backend đã ép mỗi phương án về chuỗi trần. */
  options: string[];
  /** Phương án chốt ở lượt chốt; null khi chưa chốt. */
  firstPick: number | null;
  /** Phương án chốt ở lượt nghĩ lại; null khi chưa nghĩ lại. */
  rethinkPick: number | null;
  /**
   * Máy chủ chấm lần chốt đầu: null nghĩa là CHƯA chấm (chưa nộp đề).
   * Không dùng false cho "chưa biết" — hai cái đó vẽ ra hai ô tiến độ khác nhau.
   */
  firstCorrect: boolean | null;
  /** Đáp án đúng, chỉ có sau khi máy chủ chấm. KHÔNG đọc thẳng để vẽ. */
  correctIndex: number | null;
  /** Lời giải thích MỨC CÂU — thứ duy nhất backend đang gửi. */
  explanation: string | null;
  /**
   * `lesson_id` trong `detail[i]` của response submit: id BẢNG lessons, KHÔNG
   * phải số bài. Bài tra theo (course_id, sort_order) nên id này không đổi
   * được thành "bài số mấy" mà không có thêm một vòng gọi API cho từng bài —
   * vì vậy nó chỉ dùng để ĐẾM số bài khác nhau, không bao giờ để đặt tên bài.
   */
  lessonId: number | null;
};

export function createCells(
  questions: ReadonlyArray<{ index: number; question: string; options: string[] }>,
): RunCell[] {
  return questions.map((q) => ({
    index: q.index,
    question: q.question,
    options: q.options,
    firstPick: null,
    rethinkPick: null,
    firstCorrect: null,
    correctIndex: null,
    explanation: null,
    lessonId: null,
  }));
}

/**
 * Sáu trạng thái của một câu. Ô tiến độ phân biệt bằng HÌNH chứ không chỉ bằng
 * màu, nên danh sách này cũng là danh sách hình.
 *
 *   'empty'      chưa chốt
 *   'committed'  đã chốt, máy chủ CHƯA chấm (cả lượt chốt nằm ở đây)
 *   'ok'         đúng ngay lần đầu — máy chủ chấm
 *   'rethinking' chưa đúng lần đầu, đang được nghĩ lại; ĐÁP ÁN CHƯA LỘ
 *   'again'      đúng ở lần nghĩ lại — trình duyệt chấm, không lưu
 *   'bad'        chưa đúng sau cả hai lần
 */
export type CellState = 'empty' | 'committed' | 'ok' | 'rethinking' | 'again' | 'bad';

export function cellState(cell: RunCell): CellState {
  if (cell.firstPick === null) return 'empty';
  if (cell.firstCorrect === null) return 'committed';
  if (cell.firstCorrect) return 'ok';
  if (cell.rethinkPick === null) return 'rethinking';
  return cell.rethinkPick === cell.correctIndex ? 'again' : 'bad';
}

/**
 * Được phép hiện đáp án chưa? Chỉ khi câu đã kết thúc.
 *
 * Đây là cái chốt của luật "sai lần đầu thì chưa lộ đáp án": ở 'rethinking'
 * đáp án đã có trong bộ nhớ (máy chủ gửi về cùng lượt chấm) nên không có gì
 * ngăn một nhánh JSX vẽ nó ra ngoài hàm này.
 */
export function revealsAnswer(cell: RunCell): boolean {
  const s = cellState(cell);
  return s === 'ok' || s === 'again' || s === 'bad';
}

/** Đáp án ĐƯỢC PHÉP vẽ: null ở mọi trạng thái chưa kết thúc. */
export function visibleCorrectIndex(cell: RunCell): number | null {
  return revealsAnswer(cell) ? cell.correctIndex : null;
}

/** Lời giải thích ĐƯỢC PHÉP vẽ — cùng luật với đáp án. */
export function visibleExplanation(cell: RunCell): string | null {
  return revealsAnswer(cell) ? cell.explanation : null;
}

/**
 * Phương án bị KHOÁ ở lượt nghĩ lại: chính phương án đã thử và chưa đúng.
 * Khoá nó là cách duy nhất nói "sai rồi" mà không nói "đáp án là cái kia".
 */
export function lockedOptionIndex(cell: RunCell): number | null {
  return cellState(cell) === 'rethinking' ? cell.firstPick : null;
}

/** Câu còn bấm chọn được không (lượt chốt, hoặc lượt nghĩ lại). */
export function isPickable(cell: RunCell): boolean {
  const s = cellState(cell);
  return s === 'empty' || s === 'rethinking';
}

/** Phương án đang hiện là "của bạn": chốt sau nếu đã nghĩ lại, không thì chốt đầu. */
export function shownPick(cell: RunCell): number | null {
  return cell.rethinkPick !== null ? cell.rethinkPick : cell.firstPick;
}

/* ───────────────────────────── chốt và nghĩ lại ─────────────────────────── */

/**
 * Chốt một phương án cho câu thứ `at`.
 *
 * Một hàm cho CẢ HAI lượt: lượt chốt ghi `firstPick`, lượt nghĩ lại ghi
 * `rethinkPick`. Hai luật cứng, cả hai đều là lỗ nếu để JSX tự giữ:
 *   · câu không còn bấm được thì bỏ qua — chống bấm đúp và chống chốt lại
 *     một câu đã xong (chốt lại được là tự chấm lại điểm chính thức);
 *   · ở lượt nghĩ lại không được chọn LẠI phương án đã thử.
 */
export function commitPick(cells: RunCell[], at: number, pick: number): RunCell[] {
  const cell = cells[at];
  if (!cell) return cells;
  if (!isPickable(cell)) return cells;
  if (!Number.isInteger(pick) || pick < 0 || pick >= cell.options.length) return cells;
  if (lockedOptionIndex(cell) === pick) return cells;

  const next = [...cells];
  next[at] = cellState(cell) === 'empty'
    ? { ...cell, firstPick: pick }
    : { ...cell, rethinkPick: pick };
  return next;
}

/** Cả lượt chốt đã xong chưa — điều kiện để nộp đề. */
export function allCommitted(cells: ReadonlyArray<RunCell>): boolean {
  return cells.length > 0 && cells.every((c) => c.firstPick !== null);
}

/** Số câu đã chốt ở lượt chốt. */
export function committedCount(cells: ReadonlyArray<RunCell>): number {
  return cells.filter((c) => c.firstPick !== null).length;
}

/* ──────────── nút chính của lượt chốt, KỂ CẢ khi nộp bị hỏng ────────────── */

/** Nhãn chữ cái của phương án; hết chữ thì rơi về số. MỘT nguồn cho cả màn. */
export function optionLetter(index: number): string {
  return ['A', 'B', 'C', 'D', 'E'][index] ?? String(index + 1);
}

export type RunStage = {
  /** Câu đang mở còn bấm chọn được không. */
  pickable: boolean;
  /** Nút chính đang làm việc gì: chốt câu này, hay nộp lại cả đề. */
  action: 'commit' | 'resubmit';
  label: string;
  /** Chữ phụ dưới nút — phải nói đúng cái việc nút đang làm. */
  hint: string;
};

/**
 * Nút chính + chữ phụ của lượt chốt.
 *
 * Vì sao là MỘT hàm thuần có test chứ không ba điều kiện rải trong JSX: đường
 * NỘP HỎNG. `grade()` nộp cả đề một lượt; mất mạng / 429 / 409 thì nó đặt lại
 * `phase: 'run'` với MỌI ô đã chốt. Bản trước truyền `pickable = phase === 'run'`
 * nên đúng lúc đó các nút phương án BẬT LẠI: người học bấm một phương án khác
 * thì nó sáng lên như đã chọn, nút chính bật và còn mang nhãn "Chốt câu cuối và
 * nộp" — nhưng `commitPick` thấy ô đã 'committed' nên trả về mảng KHÔNG ĐỔI, im
 * lặng, rồi lần nộp lại vẫn gửi `firstPick` CŨ. Điểm chính thức — thứ duy nhất
 * được lưu vào DB và dùng tính trọng số cho các lượt sau — ghi sai so với thao
 * tác cuối cùng của người học, mà màn hình thì đang nói ngược lại.
 *
 * VÌ SAO CHỌN HƯỚNG "KHOÁ, VÀ NÓI THẲNG" chứ không mở cho đổi đáp án:
 *   · "chốt rồi thì không đổi được" là luật đã hứa ngay dưới nút từ trước, và
 *     `commitPick` giữ đúng luật đó (chống bấm đúp, chống tự chấm lại);
 *   · lần nộp hỏng vẫn có thể đã TỚI máy chủ — 409 "Quiz này đã được nộp" là
 *     đúng cái ca đề đã được nhận và chấm xong. Cho đổi đáp án sau đó là hứa
 *     một thứ máy chủ không nhận lại.
 * Nên lượt nộp hỏng chỉ còn đúng MỘT việc làm được, và nút phải nói đúng chữ
 * đó: nộp lại. Nút sáng lên để rồi âm thầm bỏ qua là điều tệ hơn cả hai hướng.
 */
export function runStage(
  cells: ReadonlyArray<RunCell>,
  at: number,
  sel: number | null,
  /** Đang có một lượt nộp bay trên đường. Nhãn phải nói đúng việc ĐANG xảy ra. */
  submitting = false,
): RunStage {
  const total = cells.length;
  if (allCommitted(cells)) {
    return {
      pickable: false,
      action: 'resubmit',
      label: submitting ? 'Đang nộp cả đề…' : 'Nộp lại cả đề',
      hint: submitting
        ? `Đang gửi cả ${total} câu lên máy chủ. Phương án đã chốt không đổi được nữa.`
        : `Cả ${total} câu đã chốt nên không đổi được nữa — máy chủ chấm đúng những phương `
          + 'án bạn đã chốt. Lần nộp vừa rồi chưa đi được, bấm "Nộp lại cả đề" để gửi lại.',
    };
  }
  const cell = cells[at];
  return {
    pickable: cell ? isPickable(cell) : false,
    action: 'commit',
    label: committedCount(cells) + 1 >= total ? 'Chốt câu cuối và nộp' : 'Chốt',
    hint: sel === null
      ? 'Nút Chốt mờ tới khi bạn chọn một phương án. Đổi ý bao nhiêu lần cũng được — '
        + 'chưa Chốt là chưa tính.'
      : `Đã chọn ${optionLetter(sel)}. Chốt rồi thì không đổi được: máy chủ chấm đúng `
        + 'phương án bạn chốt.',
  };
}

/**
 * Ghép kết quả máy chủ vào các câu.
 *
 * Nhận `graded` ĐÃ ĐỌC SẴN bởi `readGradedQuestions()` của practice-plan.ts
 * (hàm đó đã có 27 ca test canh việc đọc `detail[i]`) — ở đây chỉ thêm đúng
 * thứ hàm kia không lấy: `lesson_id`. Nhận theo hình dạng (duck typing) chứ
 * không import, vì file này phải không import gì.
 */
export function applyGrading(
  cells: ReadonlyArray<RunCell>,
  graded: ReadonlyArray<{
    correctIndex: number | null;
    isCorrect: boolean;
    explanation: string | null;
  }>,
  lessonIds: ReadonlyArray<number | null> = [],
): RunCell[] {
  return cells.map((cell, i) => {
    const row = graded[i];
    if (!row) return cell;
    return {
      ...cell,
      firstCorrect: row.isCorrect === true,
      correctIndex: row.correctIndex,
      explanation: row.explanation,
      lessonId: lessonIds[i] ?? null,
    };
  });
}

/**
 * `lesson_id` của từng câu trong `detail` của response submit.
 *
 * Tách riêng vì `readGradedQuestions()` cố tình chỉ giữ những field nó cần —
 * thêm field vào hàm đó là đổi hành vi của 27 ca test đang canh nó.
 */
export function lessonIdsOf(detail: unknown): Array<number | null> {
  const rows: unknown[] = Array.isArray(detail) ? detail : [];
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return null;
    const raw = (row as Record<string, unknown>).lesson_id;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  });
}

/* ──────────────────────────── tổng kết một lượt ─────────────────────────── */

export type RunSummary = {
  total: number;
  /** Đúng ngay lần đầu — MÁY CHỦ chấm, là điểm chính thức được lưu. */
  firstTry: number;
  /** Đúng ở lần nghĩ lại — TRÌNH DUYỆT chấm, không lưu ở đâu. */
  afterRethink: number;
  /** Chưa đúng sau cả hai lần. */
  stillWrong: number;
  /** Câu chưa đúng lần đầu mà người học chưa nghĩ lại. */
  pendingRethink: number;
  /** Số BÀI khác nhau có câu chưa đúng lần đầu; -1 khi không đếm được. */
  lessonsToReview: number;
};

export function runSummary(cells: ReadonlyArray<RunCell>): RunSummary {
  let firstTry = 0;
  let afterRethink = 0;
  let stillWrong = 0;
  let pendingRethink = 0;
  const lessons = new Set<number>();
  let unknownLesson = false;

  for (const cell of cells) {
    switch (cellState(cell)) {
      case 'ok': firstTry += 1; break;
      case 'again': afterRethink += 1; break;
      case 'bad': stillWrong += 1; break;
      case 'rethinking': pendingRethink += 1; break;
      default: break;
    }
    if (cell.firstCorrect === false) {
      if (cell.lessonId === null) unknownLesson = true;
      else lessons.add(cell.lessonId);
    }
  }

  return {
    total: cells.length,
    firstTry,
    afterRethink,
    stillWrong,
    pendingRethink,
    // Không nói "2 bài" khi có câu không biết thuộc bài nào — thà không nói.
    lessonsToReview: unknownLesson ? -1 : lessons.size,
  };
}

/**
 * Hai con số, hai nguồn, KHÔNG được cộng vào nhau.
 *
 * Đây là chỗ mâu thuẫn "máy chủ chấm cả đề một lượt" hiện ra thành câu chữ:
 * `official` do máy chủ chấm và lưu vào DB; `local` do trình duyệt chấm ở lượt
 * nghĩ lại và không gửi đi đâu (đề chỉ nộp được một lần). Gộp hai số là nói
 * sai về thứ đã lưu.
 */
export type SplitScore = {
  officialLine: string;
  officialNote: string;
  localLine: string | null;
  localNote: string | null;
};

export function splitScore(summary: RunSummary): SplitScore {
  const official = `Đúng lần đầu ${summary.firstTry} trên ${summary.total}`;
  // Hai ghi chú này rút xuống còn ĐÚNG phần phân biệt được hai con số. Bản cũ
  // kể thêm cơ chế ("Nó cũng là thứ quyết định những bài nào góp nhiều câu hơn
  // vào các lượt sau") và lặp lại luật nộp một lần — người học đang xem hai con
  // số, họ chỉ cần biết cái nào đã lưu.
  const officialNote = 'Đã lưu.';
  if (summary.afterRethink === 0) {
    return { officialLine: official, officialNote, localLine: null, localNote: null };
  }
  return {
    officialLine: official,
    officialNote,
    localLine: `Đúng ở lần nghĩ lại: thêm ${summary.afterRethink} câu`,
    localNote: 'Không lưu.',
  };
}

/* ───────────────── chỉ số mang ra so — phải CHỈ TĂNG ────────────────────── */

export type FirstTryTotal = { answers: number; runs: number };

/**
 * Cộng dồn số câu đúng NGAY LẦN ĐẦU qua mọi lượt ôn đã lưu, đọc từ
 * `/courses/:id/quiz/history`.
 *
 * Vì sao "ngay lần đầu" là đúng chữ: mỗi đề chỉ nộp được MỘT lần (lần hai nhận
 * 409), nên mọi câu máy chủ tính đúng đều là lần thử đầu của câu đó trong lượt
 * đó. Nó đếm LƯỢT TRẢ LỜI, không phải câu khác nhau — màn hình phải nói thế.
 *
 * Vì sao KHÔNG phải "câu đã chắc" của bản thiết kế: chỉ số đó cần biết cùng
 * một CÂU đúng lần đầu ở hai ngày khác nhau, mà `quiz/history` chỉ trả
 * {score, total, submittedAt} — không có bảng nào lưu lịch sử theo từng câu.
 * Bịa ra là vẽ thứ chưa có.
 */
export function cumulativeFirstTry(rows: unknown): FirstTryTotal {
  const list: unknown[] = Array.isArray(rows) ? rows : [];
  let answers = 0;
  let runs = 0;
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const score = Number(r.score);
    const total = Number(r.total);
    if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) continue;
    // Kẹp trong [0, total]: dữ liệu dùng chung với bản Django cũ nên không tin
    // số âm hay số vượt tổng — một hàng rác không được làm chỉ số nhảy vọt.
    answers += Math.min(Math.max(Math.floor(score), 0), Math.floor(total));
    runs += 1;
  }
  return { answers, runs };
}

/**
 * Chỉ số sau lượt này. CHỈ TĂNG, không bao giờ tụt — kể cả khi lượt này đúng
 * 0 câu, và kể cả khi `gained` là số rác âm.
 */
export function firstTryAfterRun(before: number, gained: number): number {
  const base = Number.isFinite(before) ? Math.max(0, Math.floor(before)) : 0;
  const add = Number.isFinite(gained) ? Math.max(0, Math.floor(gained)) : 0;
  return base + add;
}

/** "Bạn đã trả lời đúng ngay lần đầu 34 câu, qua 5 lượt ôn." */
export function firstTryLine(total: FirstTryTotal): string {
  if (total.runs === 0) return 'Chưa có lượt ôn nào được lưu';
  return `${total.answers} lượt trả lời đúng ngay lần đầu, qua ${total.runs} lượt ôn`;
}

/* ─────────────────── mức theo chặng (từ dữ liệu thật) ───────────────────── */

export type StageRow = {
  name: string;
  /** Số bài ĐÃ XONG trong chặng. */
  done: number;
  total: number;
  /** 0–100, để vẽ thanh. */
  pct: number;
  label: string;
};

/**
 * Mức của người học theo chặng, đọc từ giáo trình tĩnh + bài đã xong.
 *
 * Vì sao đo BÀI ĐÃ XONG chứ không phải "câu đã chắc theo chặng" như bản thiết
 * kế: xem lý do ở `cumulativeFirstTry()` — không có dữ liệu theo từng câu. Số
 * bài đã xong thì có thật, và cũng là thứ quyết định kho câu của chặng đó.
 * Thanh này chỉ đi lên vì bài đã xong không bị gỡ.
 */
export function stageProgress(modules: unknown, completed: ReadonlyArray<number>): StageRow[] {
  const done = new Set(completed);
  const out: StageRow[] = [];
  if (!Array.isArray(modules)) return out;
  let no = 0;
  for (const m of modules) {
    if (!m || typeof m !== 'object') continue;
    const mod = m as Record<string, unknown>;
    const lessons: unknown[] = Array.isArray(mod.lessons) ? mod.lessons : [];
    if (!lessons.length) continue;
    let hit = 0;
    for (let i = 0; i < lessons.length; i += 1) {
      no += 1;
      if (done.has(no)) hit += 1;
    }
    const name = typeof mod.title === 'string' ? mod.title : `Chặng ${out.length + 1}`;
    out.push({
      name,
      done: hit,
      total: lessons.length,
      pct: Math.round((100 * hit) / lessons.length),
      label: `${hit}/${lessons.length} bài đã xong`,
    });
  }
  return out;
}

/* ───────────────────────── câu chữ của màn này ──────────────────────────── */

/*
 * ĐÃ BỎ: `WHY_THIS_QUESTION` và `WHY_NO_PER_QUESTION_REASON`, cùng khối
 * <details>"Vì sao câu này?" dựng chúng ở ChallengeClient.
 *
 * Hai hằng đó kể cơ chế chọn đề ("Hệ thống không chọn ngẫu nhiên đều: bài nào
 * bạn hay chọn sai thì câu của bài đó được lấy nhiều hơn, trọng số gấp tối đa
 * hai lần") rồi kể tiếp thứ hệ thống KHÔNG làm ("không lưu lịch sử theo từng
 * câu, nên nó không nói được 'bạn sai câu này bốn ngày trước'"). Cả hai đều
 * đúng, và cả hai đều vô dụng với người đang nhìn một câu trắc nghiệm: biết
 * trọng số không đổi được phương án nào họ chọn. Chúng trả lời một câu hỏi
 * chưa ai hỏi — đúng khuôn văn do máy sinh mà chủ sản phẩm đã gạt ở trang chủ.
 */

/**
 * Luật của lượt — mỗi dòng là một điều ĐANG đúng và ĐỔI được cách người học
 * làm. Hai dòng cũ đã bỏ: "Không có đồng hồ. Ngồi bao lâu cũng vậy." và "Không
 * có điểm tốc độ, không xếp hạng, không chuỗi ngày, không ai để so." — chúng
 * liệt kê những thứ KHÔNG tồn tại, nên không có gì để làm theo, và một danh
 * sách những thứ không có là lời tự khen trá hình.
 */
export const RUN_RULES: ReadonlyArray<string> = [
  'Sai lần đầu thì được nghĩ lại ngay trong lượt.',
  'Cả đề được chấm một lượt ở máy chủ sau khi bạn chốt câu cuối, nên phản hồi '
    + 'hiện ở cuối lượt chứ không hiện ngay sau mỗi câu.',
  'Dừng giữa lượt thì lượt đó không được lưu — máy chủ chỉ chấm khi cả đề được nộp.',
];

/** Nhãn + hình của ô tiến độ. Phân biệt bằng HÌNH, không chỉ bằng màu. */
export const STATE_LABEL: Record<CellState, string> = {
  empty: 'chưa làm',
  committed: 'đã chốt, chưa chấm',
  ok: 'đúng lần đầu',
  rethinking: 'chưa đúng — đang nghĩ lại',
  again: 'đúng sau nghĩ lại',
  bad: 'chưa đúng',
};

/** Đầu đề khối phản hồi của từng trạng thái đã kết thúc. */
export function feedbackHead(state: CellState): string | null {
  if (state === 'ok') return 'Đúng ngay lần đầu';
  if (state === 'rethinking') return 'Chưa đúng';
  if (state === 'again') return 'Đúng ở lần nghĩ lại';
  if (state === 'bad') return 'Vẫn chưa đúng';
  return null;
}

/**
 * Thân khối phản hồi. Ở 'rethinking' KHÔNG được nhắc tới đáp án dưới mọi hình
 * thức — kể cả "đáp án là phương án dài hơn".
 *
 * Chỉ còn hai trạng thái có thân, và cả hai nói MỘT việc phải làm. 'ok' và
 * 'again' trả null: đầu đề ("Đúng ngay lần đầu" / "Đúng ở lần nghĩ lại") đã nói
 * hết, phần thân cũ chỉ là lời bình ("Nghĩ lại ra đúng nghĩa là bạn biết, nhưng
 * chưa thành phản xạ") và lời trấn an ("Không có điểm thưởng nào để đếm").
 */
export function feedbackBody(state: CellState): string | null {
  if (state === 'rethinking') {
    return 'Đáp án chưa lộ. Phương án bạn vừa chọn đã bị khoá — chọn một phương án khác '
      + 'rồi chốt lại.';
  }
  if (state === 'bad') {
    return 'Đọc lại chỗ này trong bài.';
  }
  return null;
}
