/**
 * studio-lesson/v1 — shape of a Python Studio lesson stored in
 * `lessons.content_json` and produced by the admin import (Markdown/PDF).
 *
 * Every `step_N` is optional: a document rarely supplies all four. The renderer
 * drops the missing ones and renumbers what is left, so a lesson with only
 * theory + a quiz shows "Bước 1/2" rather than empty S3/S4 screens.
 *
 * `step_2.mcq` is NOT free to move: QuizzesService.collectQuestions() reads
 * `content_json.step_2.mcq` to build review quizzes (src/quizzes/quizzes.service.ts).
 *
 * Nhưng ĐỪNG suy ra "bài nào cũng có mcq nên quiz ôn tập luôn chạy": khoá 172
 * bài đọc (scripts/pe-da) không phát ra `step_2.mcq` nào, nên kho câu hỏi của
 * khoá đó LUÔN dưới `MIN_POOL = 5` và quiz ôn tập không bao giờ mở được. Giao
 * diện không được hứa nó — xem ghi chú ở
 * src/app/(standalone)/courses/[courseId]/CourseDetail.tsx.
 */

export const STUDIO_LESSON_SCHEMA = 'studio-lesson/v1';

/**
 * studio-lesson/v2 = v1 + khối `play` (khoá Python Advanced): danh sách
 * mini-game sinh bởi scripts/pe-v3/build_advanced.py. Có `play` thì
 * buildScreens() dựng luồng ngắn theo game thay cho luồng S1–S4 đầy đủ; mọi
 * trường v1 vẫn giữ (step_2.mcq còn phục vụ quiz ôn tập).
 *
 * v2 còn mang khoá BÀI ĐỌC: `step_1.read` + `step_2.practice` (xem
 * scripts/pe-da/SCHEMA.md). Bộ đó không có `play`, không `mcq`, không
 * `step_4.tests` — buildScreens() vì vậy dựng luồng "đọc → luyện tập →
 * sandbox chạy tự do → tổng kết", và không màn nào được chấm.
 */
export const STUDIO_LESSON_SCHEMA_V2 = 'studio-lesson/v2';

export type McqOption = string | { text: string; correct?: boolean; detail?: string };

export type Mcq = {
  /**
   * Đề bài, và CÓ THỂ kèm một đoạn code sau một dòng trống — xem `tachDeVaCode`.
   * Hai thứ nằm chung MỘT trường vì hình dạng này đi qua `normalizeQuestion` ở
   * backend để vào kho quiz chấm Ở SERVER, mà hàm đó chỉ đọc
   * `question`/`options`/`explanation`: một trường `code` riêng sẽ bị bỏ âm
   * thầm ở đúng con đường chấm duy nhất client không giả mạo được.
   */
  question: string;
  options: McqOption[];
  /** Index of the correct option. The object form of `options` may set it instead. */
  correct?: number;
  explanation?: string;
};

/** Mốc nối giữa đề bài và đoạn code — khớp `NOI_DE_CODE` trong scripts/pe-da/build.py. */
const NOI_DE_CODE = '\n\n';

/**
 * Tách `Mcq.question` thành (đề bài, đoạn code) để màn trắc nghiệm dựng đúng loại.
 *
 * Vì sao cần: 471/1032 câu của gói nguồn mang một trường `code` riêng, và đề
 * bài của chúng KHÔNG tự đứng được. Bản dựng đầu bỏ trường đó, nên **214/516
 * câu đang phát mất đoạn code quyết định đáp án và 90 câu ở 45 bài còn TRỎ TỚI
 * nó** — ví dụ PY01, bài đầu tiên của khoá: "Buổi sáng bán 10 cốc, chiều bán 7
 * cốc. Kết quả ở lệnh print cuối có giá trị nào?" mà không có lệnh print nào
 * trên màn hình. Nay build gấp code vào `question`, và chỗ này tách lại.
 *
 * Nhồi cả hai vào `title` của màn thì code dồn thành một dòng (HTML gộp khoảng
 * trắng) và học viên đọc code như văn xuôi — đúng loại ngộ nhận mà `ReadScreen`
 * đã cố ý tránh khi để `expected` ra ngoài `CodeBlock`.
 *
 * Chỉ tách ở LẦN XUẤT HIỆN ĐẦU của dòng trống: một đề bài nhiều đoạn văn thì
 * phần sau vẫn là code, mà `build.py` không bao giờ phát đề nhiều đoạn (nguồn
 * là `prompt` một đoạn), nên luật này không mất gì. Không có dòng trống thì
 * `code` là undefined và màn hiện y như trước.
 */
export function tachDeVaCode(question: string): { de: string; code?: string } {
  const at = question.indexOf(NOI_DE_CODE);
  if (at < 0) return { de: question };
  const code = question.slice(at + NOI_DE_CODE.length).trim();
  if (!code) return { de: question.slice(0, at) };
  return { de: question.slice(0, at), code };
}

export type PredictOption = {
  id: string;
  title: string;
  detail?: string;
  correct?: boolean;
};

export type MemoryModel = {
  heapAddr?: string;
  stack?: { label?: string; name: string; ptr?: string }[];
  heap?: {
    type?: string;
    refcount?: number;
    cells?: { value: string; id?: string; note?: string }[];
    note?: string;
  };
  assertion?: string;
  assertionResult?: string;
};

/** Màn mở đầu "một màn" (Figma PE Python v3): tóm cả bài trên một trang. */
export type LessonBriefData = {
  /** ["M1", "BÀI TẬP CƠ BẢN", "B01"] */
  eyebrow: string[];
  title: string;
  goal?: string;
  task: string;
  predict?: string;
  /** Khung code rút gọn hiện trong main.py (không phải code khởi tạo thật). */
  code?: string;
  /** Hai ca công khai, dạng "Mặc định → Python ↵ 1991". */
  tests?: string[];
  reflect?: string;
};

/**
 * Hình minh hoạ của bài (khoá python_advanced, chặng M1–M3). `src` là SVG tĩnh
 * cùng miền (/static/anim/<tên>.svg) nên hiện bằng `<img>` là đủ: animation viết
 * bằng CSS trong chính file SVG vẫn chạy, và CSP không phải nới thêm gì.
 */
export type LessonFigure = {
  /** Tên file không đuôi — sổ tay PDF dùng để tìm PNG đã chụp. */
  name?: string;
  src: string;
  caption: string;
  /** Mô tả hình cho người không xem được hình. */
  alt: string;
};

/** Một khối LÝ THUYẾT: khái niệm nền, trước khi đọc code từng dòng ở `explain`. */
export type TheoryBlock = {
  title: string;
  body?: string;
  bullets?: string[];
  /** Đúng một khối trong bài mang hình chính. */
  figure?: LessonFigure;
};

/**
 * Một khối trong bài ĐỌC (`step_1.read`) — khoá 172 bài "Python cho Data
 * Analyst", xem scripts/pe-da/SCHEMA.md.
 *
 * Nguồn của bộ này KHÔNG có trắc nghiệm, scaffold hay ca kiểm thử: nó có lời
 * giảng, code kèm kết quả in ra, và bảng. `expected` là output thật của khối
 * code — renderer phải hiện nó TÁCH khỏi code, vì người học cần phân biệt
 * được đâu là lệnh và đâu là cái lệnh đó in ra.
 */
export type ReadBlock =
  | { type: 'paragraph'; text: string }
  /**
   * `tryIt` = khâu build đã xác nhận đoạn này CHẠY ĐƯỢC trong Pyodide, nên màn
   * đọc dựng nút "Thử ngay trong IDE" dưới nó (kiểu "Try it Yourself" của
   * W3Schools). Chỉ có mặt khi đúng — xem `khoi_doc` trong scripts/pe-da/build.py.
   *
   * Vì sao cờ này do BUILD phát chứ không do frontend tự đoán: `chayDuocTrongIde`
   * trong ide-brief-code.ts chỉ là một regex trên dòng `import` và nó bắt đúng
   * các giới hạn WASM (tkinter/threading/subprocess) — nhưng thứ chặn bài của
   * khoá Data Analyst là THIẾU WHEEL (seaborn, plotly, openpyxl, h5py,
   * sqlalchemy, ipywidgets), là gói ẩn sau chuỗi (`engine="openpyxl"`), và là
   * thuộc tính phơi ra máy thật (`sys.executable`). Chỉ build.py biết cả ba.
   */
  | { type: 'code'; code: string; expected?: string; tryIt?: true }
  /**
   * Lệnh gõ trong TERMINAL (`python -m venv .venv`, `git status`) — KHÔNG phải
   * Python. Phải hiện khác khối `code`, nếu không người học copy nó vào ô soạn
   * mã Python rồi nhận SyntaxError mà không hiểu vì sao. `expected` của khối
   * này thường là MÔ TẢ bằng lời ("lệnh thường không in thông báo; trong thư
   * mục xuất hiện .venv…") chứ không phải stdout, nên nhãn cũng khác.
   */
  | { type: 'terminal'; code: string; expected?: string }
  /**
   * Biểu đồ do chính đoạn code ngay TRÊN nó vẽ ra. Luôn là PNG cùng miền dưới
   * /static/da/. KHÔNG có `caption` (khâu build không phát) nên đừng dùng lại
   * `LessonFigure`/`Figure` của màn lý thuyết — xem ReadScreen.
   */
  | { type: 'figure'; src: string; alt: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

/**
 * NĂM loại khối, không phải ba. Bản đặc tả đầu của pe-da chỉ khai ba
 * (paragraph/code/table) trong khi khâu build phát thêm `terminal` (21 khối,
 * 10 bài) và `figure` (80 khối, 26 bài): renderer viết theo đặc tả thì 26 bài
 * có hình ném TypeError ngay màn đọc.
 *
 * Hằng này để bộ test đối chiếu được "loại khối build phát ra" với "loại khối
 * renderer biết dựng" — nhánh `default` ép kiểu `never` trong ReadScreen chỉ
 * bắt được lúc typecheck, mà dữ liệu thì đổi mà không cần biên dịch lại.
 */
export const READ_BLOCK_TYPES: ReadBlock['type'][] = [
  'paragraph',
  'code',
  'terminal',
  'figure',
  'table',
];

/**
 * Mã bàn giao cho `/ide` khi bấm "Thử ngay trong IDE" dưới một khối của màn đọc.
 *
 * KHÔNG phải mã của riêng khối đó, và đây là chỗ một bản sửa nửa vời trông như
 * xong: nguồn viết các đoạn trong một bài để chạy NỐI TIẾP nhau — đoạn 3 dùng
 * `df` và `import pandas` của đoạn 1. Bàn giao một mình đoạn 3 là mở một tab
 * mới rồi để người học đọc `NameError: name 'df' is not defined`, tức đúng cái
 * nút này ra đời để tránh. Nên bàn giao TOÀN BỘ tiền tố: mọi khối `tryIt` từ
 * đầu bài tới khối được bấm.
 *
 * Phép nối phải giống `noi_code()` trong scripts/pe-da/build.py từng ký tự:
 * một đoạn thì để trần, nhiều đoạn thì chèn mốc `# ── Đoạn i ──`. Có ca test
 * khoá chỗ này bằng cách so tiền tố ĐẦY ĐỦ với `step_4.starterCode` — chính
 * `noi_code(chay_duoc)` — ở những bài còn ô chạy thử.
 *
 * @param read `step_1.read` — mảng các MÀN, mỗi màn là mảng khối.
 * @param lat chỉ số màn đang xem.
 * @param khoi chỉ số khối trong màn đó.
 */
export function maDeThu(
  read: ReadBlock[][] | undefined,
  lat: number,
  khoi: number,
): string | null {
  if (!read?.length) return null;
  const doan: string[] = [];
  for (let i = 0; i <= lat && i < read.length; i++) {
    const khoiCuaLat = read[i] ?? [];
    // Màn cuối chỉ lấy tới đúng khối được bấm; các màn trước lấy hết.
    const den = i === lat ? khoi : khoiCuaLat.length - 1;
    for (let j = 0; j <= den && j < khoiCuaLat.length; j++) {
      const b = khoiCuaLat[j];
      if (b.type === 'code' && b.tryIt) doan.push(b.code.replace(/\s+$/, ''));
    }
  }
  if (!doan.length) return null;
  if (doan.length === 1) return `${doan[0]}\n`;
  return `${doan.map((c, i) => `# ── Đoạn ${i + 1} ──\n${c}`).join('\n\n')}\n`;
}

export type Step1 = {
  heading?: string;
  /**
   * Bài đọc, ĐÃ CHIA SẴN thành màn ở khâu build: mỗi phần tử là MỘT màn
   * `read`. Renderer không chia lại — luật chia là luật nội dung (một màn =
   * một ý được một đoạn code chứng minh) nên nó được kiểm bằng Python ở
   * scripts/pe-da, và chia cố định thì khoá `s1-read-<i>` của bản nháp không
   * đổi khi sửa CSS.
   */
  read?: ReadBlock[][];
  /** Có thì màn đầu của bài là LessonBrief thay cho thẻ "Ngữ cảnh". */
  brief?: LessonBriefData;
  /** 3–5 khối lý thuyết — có thì chèn một màn `theory` NGAY TRƯỚC `brief`. */
  theory?: TheoryBlock[];
  /** Hình chính của bài; màn `explain` dùng khi không có màn `theory`. */
  figure?: LessonFigure;
  context?: {
    title?: string;
    body?: string;
    /** Ví dụ vào/ra của đề, hiện ngay dưới đề. */
    example?: string;
    /** "Học trước", mức độ và file cấp sẵn — hiện thành dải nhãn nhỏ. */
    prereq?: string;
    level?: string;
    files?: string[];
  };
  /** kind 'demo' = ví dụ minh hoạ khác dữ liệu đề: chỉ dùng ở màn giải thích. */
  code?: { filename?: string; version?: string; source: string; kind?: 'demo' | 'lesson' };
  /** `code` riêng của câu dự đoán; bỏ trống thì dùng step_1.code (trừ khi là demo). */
  predict?: { question: string; options: PredictOption[]; code?: string };
  memory?: MemoryModel;
  explain?: { n?: number; title?: string; body: string }[];
  misconception?: { title?: string; body: string; code?: string };
};

export type ClassifyBin = {
  key: string;
  title: string;
  subtitle?: string;
  desc?: string;
};

/**
 * Câu luyện tập có đáp án mẫu (`step_2.practice`, khoá bài đọc). KHÔNG chấm:
 * 516 câu trong nguồn đều là câu hỏi MỞ kèm lời giải mẫu, không phải trắc
 * nghiệm có phương án sai — nên không có gì để so đúng/sai. Học viên tự viết
 * rồi bấm "Xem đáp án"; xem isGraded().
 */
export type PracticeItem = {
  prompt: string;
  answer: string;
  answerCode?: string;
  answerExpected?: string;
};

export type Step2 = {
  heading?: string;
  mcq?: Mcq[];
  /** Mỗi câu một màn `practice`. */
  practice?: PracticeItem[];
  classify?: {
    instruction?: string;
    bins: ClassifyBin[];
    tokens: { label: string; bin: string }[];
  };
  selfExplain?: {
    prompt: string;
    placeholder?: string;
    rubric?: { label: string; keywords: string[] }[];
    /** Lời giải thích mẫu (mức 2/2) — chỉ hiện SAU khi học viên đã viết của mình. */
    sample?: string;
  };
};

export type Step3 = {
  heading?: string;
  task?: { title?: string; body?: string; rule?: string };
  scaffold?: {
    /** Uses {{slot1}}, {{slot2}}… as placeholders. */
    template: string;
    slots: { n: number; placeholder?: string; answer: string }[];
    bank: { label: string; slot: number; trap?: string }[];
  };
  trace?: { input?: (number | string)[]; steps: { label?: string; text: string }[] };
  counter?: { question: string; options: string[]; correct: string };
};

/**
 * Một ca chấm. HAI hợp đồng, và chúng không thay nhau được — xem chú thích dài
 * ở studio-harness.py (`hợp đồng DỮ LIỆU`).
 *
 * BIỂU THỨC (pe-v4, 427 ca): `call` và `expect` là hai chuỗi Python được eval
 * trong namespace của học viên rồi so bằng `==`. Cần thế vì ca pe-v4 phải gọi
 * `_studio.run(...)`, dựng fixture, đọc timeline thread/process.
 *
 * DỮ LIỆU (gói practice, 419 ca): `input`/`expected` là giá trị JSON thuần; bộ
 * chấm chạy LẠI chương trình cho từng ca rồi so sau khi chuẩn hoá (tuple và
 * ndarray hạ về list, số so bằng isclose). Dạng này cần `Step4.contract` để
 * biết gọi `solve(data)` hay tiêm biến rồi đọc biến kết quả.
 *
 * Bộ chấm phân nhánh theo TRƯỜNG CÓ MẶT (`call` -> biểu thức), không theo một
 * cờ riêng: một cờ riêng là thứ thứ hai phải khớp, và nó sẽ lệch.
 */
export type LessonTest =
  | { name: string; call: string; expect: string }
  | { name: string; input: unknown; expected: unknown };

/** Ca chấm dạng dữ liệu? Dùng chung cho UI và cho phép kiểm ở build/test. */
export function laCaDuLieu(
  t: LessonTest,
): t is { name: string; input: unknown; expected: unknown } {
  return !('call' in t);
}

/**
 * Hợp đồng gọi của bài tập dạng dữ liệu — MỘT cho cả bài, không nhắc lại từng ca.
 *
 * `mode: "script"` nghĩa là đề cấp sẵn `inputVariable` và học viên gán kết quả
 * vào `resultVariable`; bỏ trống thì bài theo hợp đồng `solve(data)`.
 * `returnType` ghim KIỂU trả về (`tuple`, `numpy.ndarray`) cho những bài dạy
 * dựng đúng cấu trúc dữ liệu — phép chuẩn hoá xoá sạch khác biệt đó nên không
 * có nó thì trả list cũng đạt.
 */
export type LessonContractCall = {
  mode?: 'script' | 'function';
  inputVariable?: string;
  resultVariable?: string;
  returnType?: string;
};

/** File đặt sẵn trong thư mục chạy bài: module cấp sẵn (import được) hoặc dữ liệu (data.txt…). */
export type LessonFile = { name: string; content: string; kind?: 'module' | 'data' };

/** "Hợp đồng" của một hàm/method: nhận gì, trả gì, tác dụng phụ — đúng mẫu thẻ hàm của PE v3. */
export type LessonContract = {
  sig: string;
  does?: string;
  takes?: string;
  gives?: string;
  effect?: string;
  call?: string;
};

export type Step4 = {
  heading?: string;
  task?: { title?: string; body?: string; io?: { label: string; value: string }[] };
  starterCode?: string;
  solutionCode?: string;
  hints?: { title: string; body: string }[];
  /** Bài quy trình (dựng môi trường, Git, MySQL…): các bước phải tự làm trên
   *  máy. Không có mã Python để chạy nên Studio hiện khối này thay cho sandbox. */
  procedure?: string[];
  tests?: LessonTest[];
  /** Hợp đồng gọi cho ca chấm dạng DỮ LIỆU. Bài dùng ca dạng biểu thức
   *  (pe-v4) không khai trường này. */
  contract?: LessonContractCall;
  /** Substrings that must not appear in the learner's code (anti-mutation guard). */
  forbid?: string[];
  /** Ghi vào thư mục chạy trước mỗi lần chạy; bộ chấm cho phép thay theo từng ca. */
  files?: LessonFile[];
  contracts?: LessonContract[];
  /**
   * Cửa tự kiểm tra: lời giải chỉ mở sau khi bài được ghi nhận HOÀN THÀNH.
   *
   * Danh sách cũ ở đây (B20, I07, I12, N04, N08) là của khoá cơ bản pe-v3 ĐÃ
   * XOÁ — AGENTS.md cảnh báo đúng chú thích này. Khoá đang chạy là 172 bài
   * pe-da, không có cửa nào; pe-v4 (còn trong repo, không xuất bản) có ba:
   * R02, DA01, DA02. Cả hai phía nhận diện theo CỜ này chứ không theo mã bài.
   */
  gate?: boolean;
  /** Server đang giữ solutionCode (bài cửa chưa hoàn thành) — xem
   *  withholdSolutionCode ở src/lessons/lessons.service.ts. */
  solutionWithheld?: boolean;
  /** Ghi chú môi trường (thread/fork chạy bản mô phỏng trong trình duyệt). */
  env?: string;
  /**
   * Thư viện ngoài bài cần (khoá Python Advanced): worker tải + import sẵn
   * TRƯỚC khi bấm giờ 5 giây. Chỉ các gói tự lưu trữ trong /pyodide/v314.0.7/.
   */
  packages?: StudioPackage[];
};

/**
 * Gói Pyodide 314.0.7 tự lưu trữ — khớp PACKAGES của studio-lesson.worker.js,
 * VENDORED của scripts/pe-da/build.py và scripts/pe-v4/build.py.
 *
 * `sqlite3` đã RỜI danh sách này khi nâng từ 0.27.7: ở bản mới nó là stdlib,
 * và khai nó làm `loadPackage` ném "No known package" rồi giết cả lần chạy.
 * `tzdata` vào thay: `zoneinfo` là stdlib nhưng rỗng dữ liệu múi giờ.
 */
export type StudioPackage = 'numpy' | 'pandas' | 'matplotlib' | 'tzdata';

export type TraceTableGame = {
  type: 'traceTable';
  code: string;
  columns: string[];
  /** null = ô học viên phải điền. */
  rows: { step: string; values: Record<string, string | null> }[];
  /** Khoá `${rowIndex}-${column}` → giá trị đúng (repr Python). */
  answers: Record<string, string>;
};
export type MatchGame = {
  type: 'match';
  pairs: { left: string; right: string }[];
  /** Thứ tự hiện cột phải (chỉ số trong pairs), trộn sẵn lúc build. */
  rightOrder: number[];
};
export type TrueFalseGame = {
  type: 'trueFalse';
  /** Câu hỏi chung cho mọi phát biểu (vd đề trắc nghiệm ở trận Boss). */
  prompt?: string;
  items: { statement: string; answer: boolean; explain?: string }[];
};
/** Dùng nguyên step_3.scaffold, chỉ thêm phản hồi theo bẫy của từng thẻ. */
export type FillGame = { type: 'fill' };
export type ParsonsGame = {
  type: 'parsons';
  /** Phần đầu/cuối lời giải giữ cố định, chỉ xếp lại các dòng ở giữa. */
  head: string;
  tail: string;
  /** Đúng thứ tự của lời giải. */
  lines: { id: string; text: string }[];
  /** Dòng nhiễu lấy từ biến thể sai — bấm vào là bị chặn và hiện lý do. */
  distractors: { id: string; text: string; reason: string }[];
  /** Thứ tự hiện trong kho (đã trộn cả dòng nhiễu). */
  order: string[];
};
export type SpotErrorGame = {
  type: 'spotError';
  code: string;
  /** Số dòng của dòng đầu tiên trong `code` (đoạn trích từ chương trình dài). */
  firstLine: number;
  line: number;
  /** Mọi dòng thuộc khối lỗi — chọn dòng nào trong đó cũng tính đúng. */
  lines?: number[];
  label: string;
  fix?: string;
};
export type DebugGame = { type: 'debug'; code: string; label: string };
export type SelfExplainGame = { type: 'selfExplain' };

export type PlayGame = { id: string; title: string } & (
  | TraceTableGame
  | MatchGame
  | TrueFalseGame
  | FillGame
  | ParsonsGame
  | SpotErrorGame
  | DebugGame
  | SelfExplainGame
);

export type Play = {
  level: 'B' | 'I' | 'N';
  /** Cửa tự kiểm tra: chỉ game + sandbox, không gợi ý. */
  boss?: boolean;
  games: PlayGame[];
  selfExplainMinWords?: number;
};

export type StudioLesson = {
  schema?: string;
  play?: Play;
  title?: string;
  subtitle?: string;
  source?: {
    kind?: string;
    filename?: string;
    parser?: string;
    importedAt?: string;
    /** Trang slide gốc của giảng viên ("SL 15-16") — in nguyên văn, không tách. */
    slides?: string;
  };
  step_1?: Step1;
  step_2?: Step2;
  step_3?: Step3;
  step_4?: Step4;
};

export type StepKey = 'step_1' | 'step_2' | 'step_3' | 'step_4';

export const STEP_KEYS: StepKey[] = ['step_1', 'step_2', 'step_3', 'step_4'];

/** Short label per original step, used for the S1-S4 progress bar. */
export const STEP_LABELS: Record<StepKey, string> = {
  step_1: 'Hiểu & Dự đoán',
  step_2: 'Bẫy ngộ nhận',
  step_3: 'Luyện có hỗ trợ',
  step_4: 'Sandbox IDE',
};

export type PresentStep = { key: StepKey; origin: number; label: string };

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

/** Steps that actually carry data, in order, with their original S-number. */
export function presentSteps(lesson: StudioLesson): PresentStep[] {
  return STEP_KEYS.map((key, i) => ({ key, origin: i + 1, label: STEP_LABELS[key] }))
    .filter(({ key }) => hasContent(lesson[key]));
}

/** Resolve an mcq's correct index across both authoring shapes. */
export function correctIndex(q: Mcq): number {
  if (typeof q.correct === 'number') return q.correct;
  return q.options.findIndex((o) => typeof o === 'object' && o.correct === true);
}

export function optionText(o: McqOption): string {
  return typeof o === 'string' ? o : o.text;
}

export function optionDetail(o: McqOption | undefined): string | undefined {
  // Nhận `undefined`: hàm vốn trả `string | undefined` nên không có gì để mất,
  // và chỗ gọi hay tra `options[index]` với index tính ra từ nháp của học viên
  // — nháp trống cho -1. Trước đây nó ném TypeError ở đó (xem screenVerdict).
  return typeof o === 'string' || o === undefined ? undefined : o.detail;
}

/** Diacritic-insensitive match so rubric keywords work on unaccented typing too. */
export function foldVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

/** How many rubric rows the learner's explanation covers. */
export function rubricScore(
  text: string,
  rubric: { label: string; keywords: string[] }[] = [],
): number {
  const folded = foldVietnamese(text);
  return rubric.filter((row) =>
    row.keywords.some((k) => folded.includes(foldVietnamese(k))),
  ).length;
}

/** Fill {{slotN}} placeholders with the learner's picks (or a visible stub). */
export function assembleScaffold(
  template: string,
  slots: { n: number; placeholder?: string }[],
  picks: Record<number, string>,
): string {
  return slots.reduce(
    (code, slot) =>
      code.replace(
        new RegExp(`\\{\\{\\s*slot${slot.n}\\s*\\}\\}`, 'g'),
        picks[slot.n] || slot.placeholder || `[Slot ${slot.n}]`,
      ),
    template,
  );
}

export type LessonDraft = {
  step: number;
  predict: string;
  mcq: Record<number, string>;
  bins: Record<string, string>;
  explanation: string;
  slots: Record<number, string>;
  counter: string;
  code: string;
  /**
   * Bài đọc: câu trả lời học viên tự viết cho `step_2.practice`, theo chỉ số
   * câu. Không chấm, nhưng vẫn lưu — nháp mất là mất công viết của người học.
   */
  practice?: Record<number, string>;
  /** Câu luyện tập đã bấm "Xem đáp án"; giữ trong nháp để quay lại màn vẫn thấy. */
  practiceSeen?: Record<number, boolean>;
  solutionUsed: boolean;
  /** Màn hình đã qua, theo `LessonScreen.key`. */
  done: Record<string, boolean>;
  /** Đã bấm "Nộp & Chấm điểm" ít nhất một lần — mở khoá lời giải ở cửa tự kiểm tra. */
  submitted?: boolean;
  /** Đã mở gợi ý hoặc lời giải: lượt này được ghi nhận là "có hỗ trợ". */
  assisted?: boolean;
  /** Trạng thái từng mini-game (studio-lesson/v2), theo PlayGame.id. */
  games?: Record<string, GameState>;
  /** Điểm trong bài: lần chấm đầu đúng +10 (combo từ 3 trở lên thì 20), sửa rồi đúng +5. */
  score?: LessonScore;
};

export type GameState = {
  /** match: chỉ số trái → chỉ số phải đã nối ĐÚNG. */
  matched?: Record<number, number>;
  pending?: number | null;
  misses?: number;
  /** trueFalse: chỉ số câu → lựa chọn. */
  tf?: Record<number, 'true' | 'false'>;
  /** traceTable: `${row}-${col}` → giá trị học viên gõ. */
  cells?: Record<string, string>;
  /** parsons: id các dòng đã xếp, theo thứ tự. */
  picked?: string[];
  /** parsons: dòng nhiễu đã bấm nhầm (hiện lý do). */
  revealed?: string[];
  /** spotError: dòng đang chọn. */
  line?: number | null;
  /** debug: code đang sửa. */
  code?: string;
};

export type LessonScore = {
  points: number;
  combo: number;
  bestCombo: number;
  /** Số lần đã bấm "Kiểm tra" ở từng màn. */
  attempts: Record<string, number>;
  /** Màn đúng ngay lần chấm đầu (true) hay sai lần đầu (false). */
  firstTry: Record<string, boolean>;
};

export const EMPTY_SCORE: LessonScore = {
  points: 0,
  combo: 0,
  bestCombo: 0,
  attempts: {},
  firstTry: {},
};

export function initialLessonDraft(lesson: StudioLesson): LessonDraft {
  return {
    step: 1,
    predict: '',
    mcq: {},
    bins: {},
    explanation: '',
    slots: {},
    counter: '',
    code: lesson.step_4?.starterCode ?? '',
    practice: {},
    practiceSeen: {},
    solutionUsed: false,
    done: {},
    submitted: false,
    assisted: false,
    games: {},
    score: EMPTY_SCORE,
  };
}

// ---------------------------------------------------------------- màn hình
//
// LessonChrome đi TỪNG MÀN một (một thẻ, một nút CTA) chứ không gộp cả bước S
// vào một trang. Một bài studio-lesson vì vậy trải ra thành nhiều màn: S1 có
// thể cho 4 màn (ngữ cảnh, giải thích, ngộ nhận, dự đoán), S2 cho mỗi câu hỏi
// một màn… Thanh tiến độ trên đầu đếm theo số màn này.

export type ScreenKind =
  | 'brief'
  /** Một lát của bài đọc (step_1.read[index]) — màn ĐẦU bài, trước cả theory. */
  | 'read'
  /** Lý thuyết nền + hình (step_1.theory) — màn ĐẦU bài, trước brief. */
  | 'theory'
  | 'context'
  | 'explain'
  | 'memory'
  | 'misconception'
  | 'predict'
  | 'mcq'
  | 'classify'
  /** Một câu luyện tập có đáp án mẫu (step_2.practice[index]) — KHÔNG chấm. */
  | 'practice'
  | 'selfExplain'
  | 'scaffold'
  | 'trace'
  | 'counter'
  | 'sandbox'
  | 'recap'
  /** Một mini-game của studio-lesson/v2 (xem `gameId`). */
  | 'game';

export type LessonScreen = {
  /** Khoá ổn định (không đổi khi chèn thêm màn) — dùng lưu nháp và animation. */
  key: string;
  kind: ScreenKind;
  /** Bước gốc S1–S4, để hiện nhãn "S2 · Bẫy ngộ nhận". */
  origin: 1 | 2 | 3 | 4;
  label: string;
  /** Vị trí trong mảng nguồn của màn: step_2.mcq, step_1.read hay step_2.practice. */
  index?: number;
  /** PlayGame.id khi kind = 'game'. */
  gameId?: string;
  gameType?: PlayGame['type'];
};

const ORIGIN_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: STEP_LABELS.step_1,
  2: STEP_LABELS.step_2,
  3: STEP_LABELS.step_3,
  4: STEP_LABELS.step_4,
};

function screen(
  key: string,
  kind: ScreenKind,
  origin: 1 | 2 | 3 | 4,
  index?: number,
): LessonScreen {
  return { key, kind, origin, label: ORIGIN_LABEL[origin], index };
}

/**
 * Luồng ngắn của bài có `play` (khoá Python Advanced):
 *   lý thuyết → brief → giải thích (+ ngộ nhận) → dự đoán → các mini-game →
 *   sandbox → tổng kết.
 * Boss bỏ giải thích/dự đoán: chỉ lý thuyết, game và sandbox.
 */
function buildPlayScreens(lesson: StudioLesson, play: Play): LessonScreen[] {
  const out: LessonScreen[] = [];
  const one = lesson.step_1;
  // LÝ THUYẾT ĐỨNG TRƯỚC ĐỀ BÀI — đổi sau khi xem người học dùng bản chạy thật.
  // Trước đây bài mở ra là "NHIỆM VỤ" + "DỰ ĐOÁN" + khung main.py, màn "S1 · LÝ
  // THUYẾT" mới tới sau: người gặp chữ process/thread/widget lần đầu bị đòi viết
  // code trước khi được kể thứ đó là gì. Boss cũng được xem lý thuyết — đó là
  // phần nền, không phải lời giải.
  if (one?.theory?.length) out.push(screen('s1-theory', 'theory', 1));
  if (one?.brief?.task) out.push(screen('s1-brief', 'brief', 1));
  else if (one?.context?.body) out.push(screen('s1-context', 'context', 1));
  if (!play.boss) {
    if (one?.explain?.length) out.push(screen('s1-explain', 'explain', 1));
    if ((one?.predict?.options?.length ?? 0) >= 2) out.push(screen('s1-predict', 'predict', 1));
  }
  for (const game of play.games) {
    if (game.type === 'fill' && !lesson.step_3?.scaffold?.slots?.length) continue;
    if (game.type === 'selfExplain' && !lesson.step_2?.selfExplain?.prompt) continue;
    out.push({ ...screen(`g-${game.id}`, 'game', game.type === 'debug' ? 4 : 3), gameId: game.id, gameType: game.type });
  }
  const four = lesson.step_4;
  if (four?.task?.body || four?.starterCode || four?.tests?.length || four?.solutionCode)
    out.push(screen('s4-sandbox', 'sandbox', 4));
  if (out.length) out.push(screen('recap', 'recap', 4));
  return out;
}

export function gameOf(lesson: StudioLesson, scr: LessonScreen | undefined): PlayGame | undefined {
  if (!scr || scr.kind !== 'game') return undefined;
  return lesson.play?.games.find((g) => g.id === scr.gameId);
}

/** Trải nội dung bài thành danh sách màn hình, bỏ phần tài liệu không có. */
export function buildScreens(lesson: StudioLesson): LessonScreen[] {
  if (lesson.play?.games?.length) return buildPlayScreens(lesson, lesson.play);
  const out: LessonScreen[] = [];
  const one = lesson.step_1;
  // BÀI ĐỌC ĐỨNG TRƯỚC MỌI MÀN KHÁC CỦA S1. Khoá 172 bài chỉ có `read` nên thứ
  // tự này không quan sát được ở đó; nó quan trọng cho bài nào trộn cả hai —
  // đọc xong mới tới lý thuyết/đề bài, không phải ngược lại.
  // Các lát đã được khâu build chia sẵn (xem Step1.read), ở đây chỉ phát màn.
  (one?.read ?? []).forEach((_, i) => out.push(screen(`s1-read-${i}`, 'read', 1, i)));
  // Cùng thứ tự với buildPlayScreens: lý thuyết trước, rồi mới tới đề bài.
  if (one?.theory?.length) out.push(screen('s1-theory', 'theory', 1));
  if (one?.brief?.task) out.push(screen('s1-brief', 'brief', 1));
  else if (one?.context?.body || one?.code?.source) out.push(screen('s1-context', 'context', 1));
  if (one?.explain?.length) out.push(screen('s1-explain', 'explain', 1));
  if (one?.memory) out.push(screen('s1-memory', 'memory', 1));
  if (one?.misconception?.body) out.push(screen('s1-misconception', 'misconception', 1));
  if ((one?.predict?.options?.length ?? 0) >= 2) out.push(screen('s1-predict', 'predict', 1));

  const two = lesson.step_2;
  (two?.mcq ?? []).forEach((q, i) => {
    if ((q.options?.length ?? 0) >= 2) out.push(screen(`s2-mcq-${i}`, 'mcq', 2, i));
  });
  if (two?.classify?.tokens?.length) out.push(screen('s2-classify', 'classify', 2));
  // Câu luyện tập xếp SAU trắc nghiệm/phân loại: bài nào có cả hai thì phần
  // được chấm làm trước, phần tự viết (không chấm) làm sau.
  (two?.practice ?? []).forEach((_, i) => out.push(screen(`s2-practice-${i}`, 'practice', 2, i)));
  if (two?.selfExplain?.prompt) out.push(screen('s2-self', 'selfExplain', 2));

  const three = lesson.step_3;
  if (three?.scaffold?.slots?.length) out.push(screen('s3-scaffold', 'scaffold', 3));
  if (three?.trace?.steps?.length || (three?.task?.body && !three?.scaffold))
    out.push(screen('s3-trace', 'trace', 3));
  if (three?.counter?.options?.length) out.push(screen('s3-counter', 'counter', 3));

  const four = lesson.step_4;
  if (four?.task?.body || four?.starterCode || four?.tests?.length || four?.solutionCode)
    out.push(screen('s4-sandbox', 'sandbox', 4));

  if (out.length) out.push(screen('recap', 'recap', 4));
  return out;
}

/** Nhãn A, B, C… cho từng lựa chọn — Mcq hiển thị chính khoá này. */
export function letterKey(index: number): string {
  return String.fromCharCode(65 + index);
}

export function keyIndex(key: string): number {
  return key ? key.charCodeAt(0) - 65 : -1;
}

/** Ngưỡng tối thiểu cho ô tự giải thích khi bài không khai rubric từ khoá. */
export const SELF_EXPLAIN_MIN = { chars: 60, words: 12 };

/**
 * Màn hình có chấm đúng/sai tại chỗ (nút CTA đổi thành "Kiểm tra").
 *
 * Danh sách TRẮNG, cố ý: `read` và `practice` của khoá bài đọc KHÔNG nằm trong
 * đây vì không có gì để so — câu luyện tập là câu mở kèm lời giải mẫu, không
 * phải trắc nghiệm có phương án sai. Đưa chúng vào đây thì `firstUnfinished()`
 * sẽ chặn nút kết thúc bài bằng một màn không bao giờ "đúng" được, và
 * `quizPercent()` chia cho một mẫu số vô nghĩa.
 */
export function isGraded(kind: ScreenKind): boolean {
  return (
    kind === 'predict' ||
    kind === 'mcq' ||
    kind === 'classify' ||
    kind === 'selfExplain' ||
    kind === 'scaffold' ||
    kind === 'counter' ||
    kind === 'game'
  );
}

/** Game chấm bằng CHẠY code trong Pyodide (bất đồng bộ) thay vì so đáp án. */
export function isRunnableGame(game: PlayGame | undefined): boolean {
  return game?.type === 'parsons' || game?.type === 'debug';
}

/** Ghép chương trình từ các dòng đã xếp — khớp scripts/pe-v3/check-advanced.mjs. */
export function parsonsCode(game: ParsonsGame, ids: string[]): string {
  const byId = new Map(game.lines.map((l) => [l.id, l.text]));
  const body = ids.map((id) => byId.get(id) ?? '').join('\n');
  return [game.head, body, game.tail].filter((part) => part !== '').join('\n') + '\n';
}

/** So giá trị bảng theo dõi biến: bỏ nháy, khoảng trắng; True/true như nhau. */
export function sameTraceValue(typed: string, expected: string): boolean {
  const norm = (v: string) =>
    v
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  return norm(typed) === norm(expected);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Đã có câu trả lời đủ để bấm "Kiểm tra" chưa. */
export function gameAnswered(lesson: StudioLesson, game: PlayGame, d: LessonDraft): boolean {
  const st = d.games?.[game.id] ?? {};
  switch (game.type) {
    case 'traceTable':
      return Object.keys(game.answers).every((k) => (st.cells?.[k] ?? '').trim() !== '');
    case 'match':
      return Object.keys(st.matched ?? {}).length === game.pairs.length;
    case 'trueFalse':
      return game.items.every((_, i) => Boolean(st.tf?.[i]));
    case 'fill':
      return (lesson.step_3?.scaffold?.slots ?? []).every((slot) => d.slots[slot.n]);
    case 'parsons':
      return (st.picked?.length ?? 0) === game.lines.length;
    case 'spotError':
      return st.line != null;
    case 'debug':
      return true;
    case 'selfExplain':
      return d.explanation.trim().length > 0;
  }
}

/** Chấm game đồng bộ. Game chạy code (parsons/debug) trả null — chấm qua Pyodide. */
export function gameVerdict(
  lesson: StudioLesson,
  game: PlayGame,
  d: LessonDraft,
): { correct: boolean; explain?: string } | null {
  const st = d.games?.[game.id] ?? {};
  switch (game.type) {
    case 'traceTable': {
      const wrong = Object.entries(game.answers).filter(
        ([k, v]) => !sameTraceValue(st.cells?.[k] ?? '', v),
      );
      return {
        correct: wrong.length === 0,
        explain: wrong.length
          ? `Còn ${wrong.length} ô chưa đúng. Đọc lại dòng lệnh ở cột "Bước": biến nào vừa đổi, đổi thành gì?`
          : 'Bạn đã chạy chương trình trong đầu đúng như Python.',
      };
    }
    case 'match':
      return {
        // Nối sai bị chặn ngay tại chỗ nên đủ cặp là đúng; số lần nhầm chỉ
        // ảnh hưởng điểm (StudioLesson tính như "sửa rồi đúng").
        correct: true,
        explain: st.misses
          ? `Nối đủ ${game.pairs.length} cặp sau ${st.misses} lần nhầm.`
          : `Nối đúng cả ${game.pairs.length} cặp, không nhầm lần nào.`,
      };
    case 'trueFalse': {
      const wrong = game.items.filter((it, i) => (st.tf?.[i] === 'true') !== it.answer);
      return {
        correct: wrong.length === 0,
        explain: wrong.length
          ? wrong
              .map((it) => `"${it.statement}" là ${it.answer ? 'ĐÚNG' : 'SAI'}. ${it.explain ?? ''}`)
              .join('\n\n')
          : game.items.find((it) => !it.answer)?.explain,
      };
    }
    case 'fill': {
      const scaffold = lesson.step_3?.scaffold;
      const slots = scaffold?.slots ?? [];
      const wrong = slots.find((slot) => d.slots[slot.n] !== slot.answer);
      if (!wrong) return { correct: slots.length > 0, explain: 'Khung mã đã khớp lời giải.' };
      const trap = scaffold?.bank.find((b) => b.label === d.slots[wrong.n])?.trap;
      return {
        correct: false,
        explain: trap
          ? `Ô ${wrong.n}: ${d.slots[wrong.n]} — ${trap}`
          : `Ô ${wrong.n} chưa đúng — thẻ này không làm đúng việc ô cần.`,
      };
    }
    case 'spotError': {
      const hits = game.lines?.length ? game.lines : [game.line];
      const ok = st.line != null && hits.includes(st.line);
      return {
        correct: ok,
        explain: ok
          ? `Chuẩn: ${game.label}.${game.fix ? ` Sửa đúng là: ${game.fix.trim()}` : ''}`
          : 'Dòng này vẫn đúng. Hỏi: dòng nào làm kết quả khác với đề bài yêu cầu?',
      };
    }
    case 'selfExplain': {
      const min = lesson.play?.selfExplainMinWords ?? SELF_EXPLAIN_MIN.words;
      const enough = wordCount(d.explanation) >= min;
      const sample = lesson.step_2?.selfExplain?.sample;
      return {
        correct: enough,
        explain: enough
          ? sample
            ? `So với lời giải thích mẫu: ${sample}`
            : 'Đã ghi lại lời giải thích của bạn.'
          : `Viết thành một câu, ít nhất ${min} từ.`,
      };
    }
    default:
      return null;
  }
}

// ------------------------------------------------- ba trạng thái của một màn
//
// TRẠNG THÁI THỨ BA: "đã trả lời và đã xem đáp án", khác hẳn "đã làm đúng".
//
// Trước bản này một màn có chấm chỉ có HAI trạng thái — `done[key]` true hoặc
// false — nên trả lời sai là không có đường nào đi tiếp: `primaryCta` trả đúng
// một nút "Thử lại". Một người thử ngày 27/10/2026 nói đúng cái giá: "mấy cái
// câu trắc nghiệm ấy nếu sai rồi thì cho next luôn vì thử lại ở đây cũng ko làm
// đc gì. căn bản là người dùng chỉ cần nhớ đáp án rồi chọn lại là được."
//
// Vì sao bắt-làm-lại không mua thêm gì (VAN-PHONG.md §8 M5): Van der Kleij
// 2015, 40 nghiên cứu / 70 cỡ hiệu ứng — phản hồi CÓ GIẢI THÍCH d = 0,49, hiện
// đáp án đúng d = 0,32, chỉ nói đúng/sai d = 0,05. Nút "Thử lại" không kèm
// giải thích chính là loại d = 0,05. Butler 2007: bắt-làm-lại TƯƠNG ĐƯƠNG hiện
// thẳng đáp án. Bằng chứng mục này HỖN HỢP (vài nghiên cứu ủng hộ multiple-try)
// nên phát biểu mạnh nhất được phép là: bắt làm lại không mua thêm gì so với
// hiện đáp án, và trên 3 phương án nó phá giá trị ĐO LƯỜNG — làm lại vô hạn
// đảm bảo đúng sau tối đa 3 lần bấm, lúc đó câu hỏi không còn mang thông tin.
//
// Vì sao KHÔNG sửa bằng một dòng (AGENTS.md đã ghi): cho đi tiếp mà không
// `markDone` thì `firstUnfinished()` chặn ở màn TỔNG KẾT — kẹt ở cuối bài thay
// vì giữa bài, tệ hơn; còn `markDone` cho câu SAI thì ô "câu đúng" ở
// RecapScreen nói dối. Nên phải có một trạng thái thứ ba.
//
// Nó KHÔNG là một trường nháp mới: `score.firstTry[key]` đã ghi sẵn kết quả của
// LẦN CHẤM ĐẦU (true/false), nên "đã chấm ít nhất một lần" đọc được từ chính
// nó. Thêm một `reviewed: Record<string, boolean>` là dựng thứ thứ hai phải
// khớp với nó, và nó sẽ lệch — đúng họ bẫy mà AGENTS.md cảnh báo. Đổi lại,
// `award()` trong useLessonProgress.ts phải GHI `firstTry` cho MỌI khoá, không
// chỉ khoá có mini-game (xem chú thích ở đó).

/**
 * Màn mà "làm lại tới khi đúng" KHÔNG đo được gì: chọn MỘT phương án trong một
 * danh sách ngắn (3 phương án ở cả 516 câu của khoá 172 bài).
 *
 * Danh sách TRẮNG, cố ý: `classify`/`scaffold`/`counter`/`selfExplain`/`game`
 * cũng được chấm, nhưng làm lại ở đó là LÀM LẠI VIỆC (xếp lại dòng code, sửa
 * lại hàm) chứ không phải bấm nốt hai phương án còn lại — lý lẽ của M5 không
 * với tới chúng, nên chúng giữ nguyên nút "Thử lại" làm nút chính.
 */
export function isChoiceScreen(kind: ScreenKind): boolean {
  return kind === 'mcq' || kind === 'predict';
}

/** Đã bấm "Kiểm tra" ở màn này ít nhất một lần — KỂ CẢ khi trả lời sai. */
export function screenAnswered(d: LessonDraft, key: string): boolean {
  return d.score?.firstTry?.[key] !== undefined;
}

/**
 * Màn này còn CHẶN đường đi tiếp hay không. Làm đúng thì thôi chặn (như cũ);
 * câu chọn phương án thì trả lời MỘT lần là thôi chặn, đúng hay sai.
 */
export function screenSettled(scr: LessonScreen, d: LessonDraft): boolean {
  return Boolean(d.done[scr.key]) || (isChoiceScreen(scr.kind) && screenAnswered(d, scr.key));
}

/**
 * Màn có chấm mà học viên chưa giải quyết — chặn việc kết thúc bài.
 * Ở đây (lib) chứ không ở cta.ts: `cta.ts` import một file .tsx nên
 * `node --test` không nạp được, mà đây là luật phải có test chạy thật.
 */
export function firstUnfinished(
  screens: LessonScreen[],
  d: LessonDraft,
): LessonScreen | undefined {
  return screens.find((x) => isGraded(x.kind) && !screenSettled(x, d));
}

/**
 * Màn xa nhất thanh tiến độ cho nhảy TỚI. Màn đã giải quyết thì mở, nên câu
 * trả lời sai cũng không khoá đường nhảy về phía trước — người học vừa đi qua
 * nó bằng nút CTA thì bấm lại trên thanh tiến độ phải tới được.
 */
export function maxReachedStep(screens: LessonScreen[], d: LessonDraft): number {
  return screens.reduce((acc, x, i) => (screenSettled(x, d) ? Math.max(acc, i + 2) : acc), 1);
}

/**
 * Bấm nút đi tiếp thì có được đánh dấu màn này "đã làm đúng" hay không.
 *
 * Nút đi tiếp của màn có chấm trước đây chỉ xuất hiện khi ĐÚNG, nên nhánh
 * cuối của `doAction` gọi `markDone` cho mọi màn mà không cần hỏi. Nay câu
 * chọn phương án đi tiếp được cả khi SAI, và nếu vẫn `markDone` thì ô "Câu đã
 * làm đúng" ở màn tổng kết đếm luôn cả câu sai.
 */
export function markDoneOnNext(
  scr: LessonScreen,
  verdict: { correct: boolean } | null | undefined,
): boolean {
  return !(isGraded(scr.kind) && Boolean(verdict) && !verdict?.correct);
}

/**
 * Cộng điểm cho một lần bấm "Kiểm tra". Đúng ngay lần đầu: +10, chuỗi đúng
 * liên tiếp từ 3 trở lên: +20. Sai rồi sửa đúng: +5 và mất chuỗi. Đúng lần nữa
 * ở màn đã đúng (xem lại bài) không cộng thêm.
 */
export function scoreCheck(
  prev: LessonScore,
  key: string,
  correct: boolean,
): { score: LessonScore; gained: number } {
  const attempts = (prev.attempts[key] ?? 0) + 1;
  const first = attempts === 1;
  const base = { ...prev, attempts: { ...prev.attempts, [key]: attempts } };
  if (!correct)
    return {
      score: {
        ...base,
        combo: 0,
        firstTry: first ? { ...prev.firstTry, [key]: false } : prev.firstTry,
      },
      gained: 0,
    };
  if (prev.firstTry[key] === true) return { score: base, gained: 0 };
  const combo = first ? prev.combo + 1 : 0;
  const gained = first ? (combo >= 3 ? 20 : 10) : 5;
  return {
    score: {
      ...base,
      points: prev.points + gained,
      combo,
      bestCombo: Math.max(prev.bestCombo, combo),
      firstTry: { ...prev.firstTry, [key]: first },
    },
    gained,
  };
}

/** Điểm 0–100 gửi về backend: tỉ lệ màn đúng ngay lần đầu, bị chặn trần khi dùng gợi ý. */
export function quizPercent(screens: LessonScreen[], d: LessonDraft, boss: boolean): number {
  const graded = screens.filter((x) => isGraded(x.kind));
  if (!graded.length) return 100;
  const first = graded.filter((x) => d.score?.firstTry[x.key] === true).length;
  let pct = Math.round((first / graded.length) * 100);
  if (d.assisted) pct = Math.min(pct, boss ? 60 : 80);
  return Math.max(0, Math.min(100, pct));
}

/** Chấm màn hình hiện tại. null = màn chỉ để đọc. Màn sandbox chấm bằng Pyodide. */
export function screenVerdict(
  lesson: StudioLesson,
  scr: LessonScreen,
  d: LessonDraft,
): { correct: boolean; explain?: string } | null {
  if (scr.kind === 'predict') {
    const options = lesson.step_1?.predict?.options ?? [];
    const chosen = options[keyIndex(d.predict)];
    const right = options.find((o) => o.correct);
    return {
      correct: Boolean(chosen?.correct),
      explain: chosen?.detail || right?.detail || right?.title,
    };
  }
  if (scr.kind === 'mcq') {
    const q = lesson.step_2?.mcq?.[scr.index ?? 0];
    if (!q) return null;
    const picked = keyIndex(d.mcq[scr.index ?? 0] ?? '');
    const answer = correctIndex(q);
    return {
      // `picked >= 0`, KHÔNG `Number.isInteger(picked)`: nháp trống làm
      // `keyIndex('')` trả -1, mà `Number.isInteger(-1)` là TRUE — nên nhánh
      // này chạy với `q.options[-1]` là undefined và `optionDetail` ném
      // TypeError. Bấm "Kiểm tra" mà chưa chọn gì là MÀN HÌNH TRẮNG, và không
      // chỗ nào chặn lời gọi đó. Lỗi có từ pe-v4; chỉ tới khi 172 bài có 3 câu
      // trắc nghiệm mỗi bài thì nó mới nằm trên đường đi chính.
      correct: picked === answer,
      explain:
        (picked >= 0 ? optionDetail(q.options[picked]) : undefined) ||
        q.explanation ||
        optionDetail(q.options[answer]),
    };
  }
  if (scr.kind === 'classify') {
    const tokens = lesson.step_2?.classify?.tokens ?? [];
    const wrong = tokens.filter((t) => d.bins[t.label] !== t.bin);
    return {
      correct: tokens.length > 0 && wrong.length === 0,
      explain: wrong.length
        ? `Còn ${wrong.length}/${tokens.length} thẻ chưa đúng nhóm.`
        : `Đúng cả ${tokens.length} thẻ.`,
    };
  }
  if (scr.kind === 'selfExplain') {
    // Rubric của ngân hàng PE là thang 0–2 cho NGƯỜI chấm đọc, không phải từ
    // khoá máy dò. Bài nào không khai keywords thì không tự chấm đúng/sai được
    // — nhưng vẫn phải chặn kiểu gõ một chữ cho qua, nên yêu cầu tối thiểu một
    // câu có nghĩa (SELF_EXPLAIN_MIN).
    const rubric = lesson.step_2?.selfExplain?.rubric ?? [];
    const text = d.explanation.trim();
    if (rubric.length) {
      const got = rubricScore(text, rubric);
      return {
        correct: got >= rubric.length,
        explain: `Đạt ${got}/${rubric.length} ý của rubric.`,
      };
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    const enough = text.length >= SELF_EXPLAIN_MIN.chars && words >= SELF_EXPLAIN_MIN.words;
    const sample = lesson.step_2?.selfExplain?.sample;
    return {
      correct: enough,
      explain: enough
        ? sample
          ? `Đối chiếu với lời giải thích mẫu (mức 2/2): ${sample}`
          : 'Lời giải thích đã được ghi lại cho người chấm.'
        : `Viết thành câu giải thích cơ chế (ít nhất ${SELF_EXPLAIN_MIN.words} từ), đừng gõ cho có.`,
    };
  }
  if (scr.kind === 'scaffold') {
    const slots = lesson.step_3?.scaffold?.slots ?? [];
    const wrong = slots.find((slot) => d.slots[slot.n] !== slot.answer);
    return {
      correct: slots.length > 0 && !wrong,
      explain: wrong ? `Slot ${wrong.n} chưa đúng.` : 'Khung mã đã khớp lời giải.',
    };
  }
  if (scr.kind === 'counter') {
    const counter = lesson.step_3?.counter;
    if (!counter) return null;
    return {
      correct: counter.options[keyIndex(d.counter)] === counter.correct,
      explain: `Đáp án đúng: ${counter.correct}.`,
    };
  }
  if (scr.kind === 'game') {
    const game = gameOf(lesson, scr);
    return game ? gameVerdict(lesson, game, d) : null;
  }
  return null;
}
