/**
 * dashboard-plan.ts — dữ liệu cho trang chủ `/` (bản đồ 8 chặng → bài → màn).
 * Trang này từng nằm ở /dashboard; 19/10/2026 nó thay trang chủ cũ.
 *
 * Hàm thuần, không import theo alias '@/…', để `node --test` chạy thẳng được
 * (cùng lý do với course-progress.ts).
 *
 * MỌI CON SỐ Ở ĐÂY LÀ DỮ LIỆU THẬT. Bản Figma (node 60:5137) vẽ bằng nội dung
 * mẫu — "Stack Frame & Scope", "+200 XP", bài BOSS ở chặng 1, "5 mục" trong
 * P01 — không bài nào trong số đó có trong khoá. Ở đây:
 *  · chặng / tên bài / số bài   ← curricula.json (CURRICULA.python_advanced)
 *  · phút / XP / boss / các màn ← curricula.json (LESSON_META, do
 *    scripts/pe-v4/sync_curricula.py chép từ gói bài đang seed)
 *  · bài đã xong                ← /api/enrolled, chỉ khi đã có phiên
 *  · màn đã xong trong một bài  ← bản nháp localStorage của trang bài học
 *    (useLessonDraft), tức CHỈ máy này — trang phải nói rõ điều đó.
 */
/**
 * Tên ẩn dụ của tám chặng, chép từ artboard (`.region-label` trong
 * `Main.dc.html`) theo đúng thứ tự M1 → M8. Chuyển từ `world-map.ts` (bản đồ
 * thế giới của trang chủ cũ, đã gỡ 19/10/2026) — dashboard in tên chặng này.
 *
 * Đây là CÂU CHỮ của bản thiết kế, không phải dữ liệu đo được — nên nó được
 * phép viết thẳng ở đây. Nhưng nó gắn với THỨ TỰ chặng, nên nếu giáo trình đổi
 * số chặng thì `buildStages` bỏ hẳn tên ẩn dụ (xem dưới): thà thiếu một cái
 * tên thơ còn hơn gọi chặng pandas là "Hoạ thất".
 */
export const REGION_NAMES = [
  'Xưởng phân thân',
  'Khung cửi song song',
  'Ô cửa quan sát',
  'Thư khố',
  'Cỗ máy ma trận',
  'Bàn sổ cái',
  'Hoạ thất',
  'Đại công trình',
] as const;

export type ModuleRow = { title: string; lessons: string[] };
/** [khoá màn, loại]; loại của màn game là game.type (match, fill…). */
export type ScreenRow = [string, string];
export type LessonMetaRow = {
  code: string;
  minutes: number;
  xp: number;
  boss: boolean;
  screens: ScreenRow[];
};

export type DashLesson = {
  /** Chỉ số 0-based trên danh sách phẳng — đúng giá trị của `?lesson=`. */
  index: number;
  /** Số bài 1-based, khớp `lessons.sort_order` và `completedLessonNumbers`. */
  no: number;
  code: string;
  /** Tên bài đã bỏ tiền tố mã ("P01 · "). */
  title: string;
  minutes: number;
  xp: number;
  boss: boolean;
  screens: ScreenRow[];
};

export type DashStage = {
  /** "M01" — mã hai chữ số như Figma. */
  code: string;
  /** "Chặng 01". */
  label: string;
  /** Tên ẩn dụ của chặng (REGION_NAMES) hoặc tên thật nếu lệch số chặng. */
  name: string;
  /** Tên thật trong giáo trình, đã bỏ "M1 · ". */
  topic: string;
  lessons: DashLesson[];
  hasBoss: boolean;
};

const two = (n: number) => String(n).padStart(2, '0');

/**
 * Ghép giáo trình với LESSON_META thành danh sách chặng.
 *
 * `names` là tên ẩn dụ (REGION_NAMES ở trên); chỉ dùng khi số chặng khớp —
 * thà thiếu tên thơ còn hơn gán nhầm chặng.
 * Bài thiếu meta (curricula.json cũ, chưa chạy lại sync) vẫn hiện, chỉ không
 * có phút/XP/màn: thà thiếu số còn hơn bịa số.
 */
export function buildStages(
  modules: ModuleRow[] | null | undefined,
  meta: LessonMetaRow[] | null | undefined,
  names: readonly string[] = [],
): DashStage[] {
  const list = modules ?? [];
  const rows = meta ?? [];
  const poetic = list.length > 0 && list.length === names.length;
  let flat = 0;
  return list.map((mod, i) => {
    const topic = mod.title.replace(/^M\d+\s*·\s*/, '').trim();
    const lessons = mod.lessons.map((full) => {
      const row = rows[flat];
      const code = /^([A-Z]+\d+)\b/.exec(full)?.[1] ?? row?.code ?? '';
      const lesson: DashLesson = {
        index: flat,
        no: flat + 1,
        code,
        title: full.replace(/^[A-Z]+\d+\s*·\s*/, '').trim(),
        minutes: row?.code === code ? row.minutes : 0,
        xp: row?.code === code ? row.xp : 0,
        boss: row?.code === code ? row.boss : false,
        screens: row?.code === code ? row.screens : [],
      };
      flat += 1;
      return lesson;
    });
    return {
      code: `M${two(i + 1)}`,
      label: `Chặng ${two(i + 1)}`,
      name: poetic ? names[i] : topic,
      topic,
      lessons,
      hasBoss: lessons.some((l) => l.boss),
    };
  });
}

/** Tên của từng loại màn — cùng chữ với nhãn trên thẻ màn (screens/chrome.tsx). */
export const SCREEN_LABEL: Record<string, string> = {
  theory: 'Lý thuyết',
  brief: 'Tổng quan bài',
  context: 'Ngữ cảnh',
  explain: 'Giải thích từng dòng',
  predict: 'Dự đoán kết quả',
  match: 'Nối cặp',
  trueFalse: 'Đúng hay sai',
  traceTable: 'Theo dõi biến',
  fill: 'Luyện có hỗ trợ',
  parsons: 'Ghép code',
  spotError: 'Săn lỗi',
  debug: 'Sửa code',
  selfExplain: 'Tự giải thích',
  sandbox: 'Thử thách độc lập',
  recap: 'Tổng kết',
};

/** Một câu nói màn đó bắt làm gì — dòng phụ dưới mỗi mục. */
export const SCREEN_HINT: Record<string, string> = {
  theory: 'Đọc phần nền của bài: khái niệm và hình minh hoạ.',
  brief: 'Xem đề bài, dữ liệu vào và kết quả cần ra.',
  context: 'Xem bối cảnh của bài.',
  explain: 'Đi qua đoạn code mẫu từng dòng.',
  predict: 'Đoán kết quả trước khi chạy.',
  match: 'Nối mỗi khái niệm với ý nghĩa của nó.',
  trueFalse: 'Xét từng phát biểu là đúng hay sai.',
  traceTable: 'Ghi giá trị biến qua từng bước chạy.',
  fill: 'Lắp các mảnh code còn thiếu vào khung.',
  parsons: 'Xếp các dòng code theo đúng thứ tự rồi chạy.',
  spotError: 'Tìm dòng gây lỗi trong đoạn code.',
  debug: 'Sửa đoạn code lỗi cho chạy đúng.',
  selfExplain: 'Viết lại cơ chế bằng lời của mình.',
  sandbox: 'Tự viết lời giải và chạy các ca kiểm tra.',
  recap: 'Xem lại những gì bài vừa dạy.',
};

export type StepItem = {
  key: string;
  kind: string;
  label: string;
  hint: string;
  /** Số thứ tự 1-based trong bài. */
  n: number;
  state: 'done' | 'current' | 'todo';
};

export type StepPlan = {
  items: StepItem[];
  doneCount: number;
  total: number;
  /** 0–100, làm tròn. */
  pct: number;
  /** Mục đầu tiên chưa xong; null khi đã xong hết. */
  current: StepItem | null;
};

/**
 * Chia các màn của một bài thành "đã học" / "đang học" / "sẽ học".
 *
 * `done` là `draft.done` của bản nháp (khoá màn → true). Bài đã được server
 * ghi nhận hoàn thành thì coi mọi màn là đã xong, kể cả khi máy này không có
 * bản nháp (học ở máy khác): server mới là nguồn của "đã hoàn thành".
 */
export function lessonSteps(
  screens: ScreenRow[],
  done: Record<string, unknown> | null | undefined,
  completed: boolean,
): StepPlan {
  let currentSeen = false;
  const items = screens.map(([key, kind], i): StepItem => {
    const isDone = completed || done?.[key] === true;
    let state: StepItem['state'] = isDone ? 'done' : 'todo';
    if (!isDone && !currentSeen) {
      state = 'current';
      currentSeen = true;
    }
    return {
      key,
      kind,
      label: SCREEN_LABEL[kind] ?? kind,
      hint: SCREEN_HINT[kind] ?? '',
      n: i + 1,
      state,
    };
  });
  const doneCount = items.filter((x) => x.state === 'done').length;
  const total = items.length;
  return {
    items,
    doneCount,
    total,
    pct: total ? Math.round((doneCount / total) * 100) : 0,
    current: items.find((x) => x.state === 'current') ?? null,
  };
}

/**
 * Đọc `done` từ chuỗi bản nháp trong localStorage. Hỏng / thiếu → null.
 * Cùng khoá với useLessonDraft: `pe-studio-lesson-v1:{user}:{course}:{bài}`.
 */
export function draftDone(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { done?: unknown } | null;
    const done = parsed?.done;
    return done && typeof done === 'object' && !Array.isArray(done)
      ? (done as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function draftKey(user: number, courseId: string, lessonNo: number): string {
  return `pe-studio-lesson-v1:${user}:${courseId}:${lessonNo}`;
}

/** Số bài đã xong trong chặng (đếm theo tập bài server đã ghi nhận). */
export function stageDoneCount(stage: DashStage, completed: Set<number>): number {
  return stage.lessons.filter((l) => completed.has(l.no)).length;
}

/**
 * Bài được chọn sẵn khi mở trang và chặng chứa nó. `resumeIndex` là
 * `planResume(...).index` (course-progress.ts) — bài chưa xong nhỏ nhất; nhận từ
 * ngoài chứ không import: file này chạy thẳng bằng `node --test`, mà Node chỉ
 * phân giải được import có đuôi `.ts`, thứ tsconfig của frontend không cho viết.
 */
export function defaultSelection(
  stages: DashStage[],
  resumeIndex: number,
): { stage: number; lesson: number } {
  const stage = stages.findIndex((s) => s.lessons.some((l) => l.index === resumeIndex));
  if (stage < 0) return { stage: 0, lesson: stages[0]?.lessons[0]?.index ?? 0 };
  return { stage, lesson: resumeIndex };
}
