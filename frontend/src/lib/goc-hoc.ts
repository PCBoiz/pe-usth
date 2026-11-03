/**
 * goc-hoc.ts — NỘI DUNG của cảnh "Góc học" (trang chủ `/`), tách khỏi cảnh.
 *
 * Vì sao file này tồn tại: bản artifact gốc của căn phòng mang theo một giáo
 * trình BỊA (khoá "C++ Nền tảng", "Python cơ bản", "Tư duy giải thuật" với
 * những bài tự nghĩ ra) và những con số BỊA về người học (XP 2.340, 23 huy
 * hiệu, hạng 37). Trên một trang mà người test mở ra để xem sản phẩm của
 * mình, mỗi con số bịa là một câu nói dối: họ không có cách nào biết "2.340
 * XP" là của ai. Nên luật ở đây:
 *
 *   · GIÁO TRÌNH là thật và TĨNH — đọc từ `curricula.json` (cùng nguồn với
 *     trang khoá học), không cần mạng, nên khách chưa đăng nhập vẫn thấy ĐỦ
 *     tám học phần và cả 48 bài.
 *   · SỐ CỦA NGƯỜI HỌC là thật hoặc TRỐNG. Lấy qua `apiFetchSessionOnly` và
 *     chỉ khi máy đã có phiên (xem StudyRoom.tsx + course-progress.ts); không
 *     có thì hiện dấu "—", không bao giờ hiện số mẫu.
 *
 * Không import gì theo alias '@/…' và không chạm `window`: cùng lý do đã ghi ở
 * course-progress.ts — bộ test chạy bằng `node --test` thuần, không phân giải
 * alias.
 */

/** Một học phần trong `curricula.json` (cùng hình dạng với dashboard-plan.ts). */
export type ModuleRow = { title: string; lessons: string[] };

/** Một dòng của `LESSON_META` — chỉ lấy ba trường cảnh này cần. */
export type LessonMetaRow = { code: string; minutes?: number; xp?: number };

/**
 * Trạng thái một cuốn sách trên kệ.
 *  · 'done' — đã hoàn thành (server nói).
 *  · 'cur'  — bài được GỢI Ý học tiếp.
 *  · ''     — chưa có thông tin, hoặc khách chưa có phiên.
 *
 * KHÔNG có trạng thái "khoá": sản phẩm này không khoá bài nào (mọi bài đều mở
 * được từ trang khoá học), nên dựng lại ổ khoá ở đây là nói sai về sản phẩm.
 */
export type LessonState = '' | 'done' | 'cur';

export type RoomLesson = {
  /** Số bài 1-based trong khoá, khớp `lessons.sort_order`. */
  no: number;
  /** Mã bài trong giáo trình, ví dụ 'P01'. */
  code: string;
  /** Tên bài, đã bỏ tiền tố mã. */
  title: string;
  minutes: number;
  xp: number;
  state: LessonState;
};

export type RoomModule = {
  /** Kệ trong phòng mà học phần này nằm trên; null = chỉ hiện ở trang Khoá học. */
  shelfKey: 'book' | 'pb' | 'tb' | null;
  /** Tên vùng để máy ảnh phóng vào (khớp bảng FOCUS của engine). */
  focus: string | null;
  /** 'M1 · Tiến trình và subprocess' */
  name: string;
  /** 'M1' — nhãn ngắn cho nhãn vật và câu thông báo. */
  short: string;
  lessons: RoomLesson[];
};

export type RoomContent = {
  course: { id: string; name: string; total: number; lessonUrl: string };
  /** Cả tám học phần, đúng thứ tự giáo trình. */
  modules: RoomModule[];
};

/**
 * Ba kệ sách CÓ THẬT trong bức ảnh, kèm số chỗ để sách của từng kệ.
 *
 * Đây là ràng buộc của BỨC ẢNH, không phải của giáo trình: mỗi chỗ là một cuốn
 * sách đã được cắt rời khỏi `room.webp` và có đa giác viền riêng trong
 * `DATA.hits` (book0…8, pb0…10, tb0…7). Học phần có nhiều bài hơn số chỗ thì
 * những bài dư KHÔNG mất đi — chúng vẫn hiện đủ ở trang Khoá học, chỉ là không
 * có cuốn sách nào trên kệ trỏ vào. Ngược lại, chỗ dư trên kệ vẫn được vẽ (nó
 * là một phần của bức tranh) nhưng không bấm vào được.
 */
export const SHELF_SLOTS: Array<{ key: 'book' | 'pb' | 'tb'; slots: number; focus: string }> = [
  { key: 'book', slots: 9, focus: 'book' },
  { key: 'pb', slots: 11, focus: 'pb' },
  { key: 'tb', slots: 8, focus: 'tb' },
];

/** Tách "P01 · Program, process và tài nguyên" thành mã + tên. */
export function splitLessonTitle(raw: string): { code: string; title: string } {
  const at = raw.indexOf(' · ');
  if (at < 0) return { code: '', title: raw.trim() };
  return { code: raw.slice(0, at).trim(), title: raw.slice(at + 3).trim() };
}

/** Nhãn ngắn của học phần: "M3 · GUI Tkinter và dự án" → "M3". */
export function shortModuleName(title: string): string {
  const at = title.indexOf(' · ');
  return at < 0 ? title : title.slice(0, at);
}

/**
 * Dựng nội dung của cảnh từ giáo trình thật.
 *
 * `completed` là tập số bài đã xong (1-based). Rỗng nghĩa là "chưa biết" — lúc
 * đó KHÔNG bài nào được đánh 'cur': gợi ý "học tiếp bài 1" cho người đã học tới
 * bài 30 còn tệ hơn là không gợi ý gì. Bài 'cur' là bài CHƯA XONG NHỎ NHẤT,
 * cùng luật với `planResume` ở course-progress.ts — cùng luật nên hai chỗ không
 * bao giờ chỉ vào hai bài khác nhau.
 */
export function buildContent(input: {
  courseId: string;
  courseName: string;
  lessonUrl: string;
  modules: ModuleRow[];
  meta?: LessonMetaRow[];
  completed?: Set<number>;
}): RoomContent {
  const metaByCode = new Map<string, LessonMetaRow>();
  for (const row of input.meta ?? []) metaByCode.set(row.code, row);

  const completed = input.completed ?? new Set<number>();
  const total = input.modules.reduce((s, m) => s + m.lessons.length, 0);
  let curNo = 0;
  if (completed.size > 0) {
    for (let n = 1; n <= total; n += 1) {
      if (!completed.has(n)) {
        curNo = n;
        break;
      }
    }
  }

  let no = 0;
  const modules: RoomModule[] = input.modules.map((mod, i) => {
    const shelf = SHELF_SLOTS[i];
    return {
      shelfKey: shelf ? shelf.key : null,
      focus: shelf ? shelf.focus : null,
      name: mod.title,
      short: shortModuleName(mod.title),
      lessons: mod.lessons.map((raw) => {
        no += 1;
        const { code, title } = splitLessonTitle(raw);
        const m = metaByCode.get(code);
        const state: LessonState = completed.has(no) ? 'done' : no === curNo ? 'cur' : '';
        return { no, code, title, minutes: m?.minutes ?? 0, xp: m?.xp ?? 0, state };
      }),
    };
  });

  return {
    course: { id: input.courseId, name: input.courseName, total, lessonUrl: input.lessonUrl },
    modules,
  };
}

/** Bài được gợi ý học tiếp; chưa biết tiến độ thì là bài đầu khoá. */
export function nextLesson(
  content: RoomContent,
): { module: RoomModule; lesson: RoomLesson } | null {
  for (const mod of content.modules) {
    for (const lesson of mod.lessons) {
      if (lesson.state === 'cur') return { module: mod, lesson };
    }
  }
  const first = content.modules[0];
  if (first && first.lessons[0]) return { module: first, lesson: first.lessons[0] };
  return null;
}

/** Đường tới bài học THẬT. `?lesson=` dùng chỉ số 0-based — xem lesson/python_advanced. */
export function lessonHref(content: RoomContent, no: number): string {
  return `${content.course.lessonUrl}?lesson=${Math.max(0, no - 1)}`;
}

/**
 * Số của người học. Mỗi trường `null` nghĩa là CHƯA BIẾT và phải hiện ra là
 * trống — không được đổi thành 0, vì "0 XP" là một khẳng định còn "—" thì
 * không nói gì cả.
 */
export type RoomUser = {
  /** Máy này đã có phiên học chưa (quyết định ở course-progress.hasStoredSession). */
  signedIn: boolean;
  name: string | null;
  xp: number | null;
  /** Đã xong bao nhiêu bài của khoá đang chạy. */
  lessonsDone: number | null;
  badges: { done: number; total: number } | null;
  rank: { rank: number; value: number } | null;
  /** Danh sách huy hiệu cho kệ cúp; null = chưa biết. */
  badgeList: Array<{ code: string; name: string; unlocked: boolean }> | null;
  /** Bảng xếp hạng cho điện thoại; null = chưa biết. */
  board: Array<{ rank: number; name: string; value: number; isMe: boolean }> | null;
};

export const EMPTY_USER: RoomUser = {
  signedIn: false,
  name: null,
  xp: null,
  lessonsDone: null,
  badges: null,
  rank: null,
  badgeList: null,
  board: null,
};

/** Chữ hiện ra cho một con số có thể chưa biết. */
export function num(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('vi-VN') : '—';
}

/** Chữ cái trên ảnh đại diện. Không có tên thì để dấu hỏi, không bịa chữ. */
export function initialOf(name: string | null): string {
  const t = (name ?? '').trim();
  return t ? t[0].toUpperCase() : '?';
}
