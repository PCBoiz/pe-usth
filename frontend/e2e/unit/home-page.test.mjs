/**
 * Unit test cho TRANG CHỦ và TRANG KHOÁ — hai trang CÔNG KHAI.
 *
 * 19/10/2026 — trang chủ cũ (bản đồ thế giới + thẻ khoá + thẻ "bắt đầu ở đâu"
 * + chân trang) đã THAY bằng dashboard theo Figma 60:5137 (src/app/page.tsx +
 * DashboardMap.tsx + home.module.css). File này viết lại theo trang mới:
 *
 *  · GIỮ, chuyển sang canh trang mới: không chuỗi ngày, không ổ khoá, không
 *    "Boss"/thi đua, không điểm sao, "Bàn thí nghiệm" chứ không IDE, chính tả
 *    "khoá", nói thật nơi chạy code, cỡ chữ ≥ 15px / câu văn ≥ 17px, không mã
 *    màu, tương phản AA, nhãn góp ý thống nhất, ba câu đã cắt không mọc lại.
 *  · THAY bằng luật hợp với trang mới:
 *      "trang chủ không gọi API nào" → trang chủ KHÔNG BAO GIỜ tạo tài khoản
 *        khách: không apiFetch, không ensureGuest, không fetch trần; mọi
 *        apiFetchSessionOnly phải nằm sau cổng phiên loadCompletedLessons.
 *      "không chỉ số nào" → không chỉ số VIẾT CỨNG: XP/phút/tiến độ đọc từ
 *        dữ liệu (LESSON_META, server, bản nháp), không từ hằng trong JSX.
 *  · BỎ, theo quyết định sản phẩm mới (thiết kế 60:5137 có chúng): "hero
 *    không câu dẫn" (INTRO chỉ có title), chân trang footerLine, thẻ "bắt đầu
 *    ở đâu" (nextStep), nhãn thẻ khoá (courseTileTags), SECTIONS.
 *
 * Bốn lý do gốc của file này vẫn đúng: (1) tài khoản khách sinh ra trong im
 * lặng nếu trang công khai gọi apiFetch; (2) số liệu bịa trông như số thật;
 * (3) câu chữ là chỗ triết lý hiện ra; (4) tương phản và cỡ chữ không ước
 * lượng bằng mắt được.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { blend, contrast } from './ds-contrast.mjs';
import { courseEyebrow, courseShape, FEEDBACK, LAB_TILE, shapeLine } from '../../src/lib/home-copy.ts';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

/** Bỏ chú thích /* … *\/ và // … — chú thích KỂ LẠI chuỗi cũ, và phải giữ. */
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/[ \t]+\/\/.*$/gm, '');
}

const PAGE = codeOnly(read('src', 'app', 'page.tsx'));
const MAP = codeOnly(read('src', 'app', 'DashboardMap.tsx'));
const PLAN = codeOnly(read('src', 'lib', 'dashboard-plan.ts'));
const CATALOG = codeOnly(read('src', 'lib', 'catalog.ts'));
const COPY = codeOnly(read('src', 'lib', 'home-copy.ts'));
const COURSE_DETAIL = codeOnly(
  read('src', 'app', '(standalone)', 'courses', '[courseId]', 'CourseDetail.tsx'),
);
const HOME_CSS = read('src', 'app', 'home.module.css');
const SHELL_CSS = read('src', 'components', 'CourseShell.module.css');

/** Giáo trình thật — cùng file mà trang chủ và trang khoá đọc. */
const CURRICULA = JSON.parse(read('src', 'lib', 'curricula.json')).CURRICULA;
const MODULES = CURRICULA.python_advanced.modules;

/**
 * Chuẩn hoá một chuỗi TRƯỚC khi đem so.
 *
 * Hai thứ từng lọt qua mọi luật bên dưới, đo được bằng cách tự gây lỗi:
 *  · NFD — "khoá" gõ bằng dấu TỔ HỢP (k-h-o-a + U+0301) là dãy ký tự khác hẳn
 *    "khoá" dựng sẵn, nên /bị khoá/ không khớp. Trình soạn thảo trên macOS và
 *    dữ liệu dán từ web sinh ra NFD mà không ai thấy khác biệt trên màn hình.
 *  · Khoảng trắng không ngắt (U+00A0) và hai dấu cách liền nhau — "8  module"
 *    và "8 module" đều lọt /8 module/.
 */
const chuanHoa = (s) => s.normalize('NFC').replace(/\s+/g, ' ').trim();

const CO_DAU_VIET =
  /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩậắằẳẵặẹẻẽếềểệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;

/**
 * Mọi chuỗi HIỂN THỊ trong một file — cả chuỗi trong dấu nháy LẪN chữ viết
 * thẳng giữa hai thẻ JSX.
 *
 * Phần JSX là bản vá ngày 15/10/2026. Trước đó hàm này chỉ bóc chuỗi trong
 * nháy, mà chữ viết thẳng giữa hai thẻ là cách TỰ NHIÊN NHẤT để viết câu trong
 * React. Hậu quả đo được bằng cách tự nhồi vi phạm vào trang: cả ba luật trung
 * thực của trang chủ — không chuỗi ngày, không ổ khoá, không chỉ số bịa — đều
 * XANH với `<span>🔒 Chặng 2 mở khi đủ 5 bài</span>` và `<span>320 XP tuần
 * này</span>`. Luật nghiêm mà bề mặt quét hụt thì luật chỉ nghiêm trên giấy.
 */
function vietStrings(code) {
  const out = [];
  for (const m of code.matchAll(/(['"`])((?:[^\\n]|\.)*?)\1/g)) {
    if (CO_DAU_VIET.test(m[2].normalize('NFC'))) out.push(chuanHoa(m[2]));
  }
  // Chữ giữa hai thẻ JSX: phần `>…<` không chứa thẻ hay biểu thức `{…}`.
  // Lấy cả đoạn không dấu tiếng Việt, vì chính emoji và con số là thứ mấy luật
  // dưới đi tìm (🔥 ổ khoá, "320 XP tuần này").
  for (const m of code.matchAll(/>([^<>{}]+)</g)) {
    const s = chuanHoa(m[1]);
    if (s && (CO_DAU_VIET.test(s) || /[🔥🔒\d]/u.test(s))) out.push(s);
  }
  return out;
}

/** Câu chữ trang chủ lấy từ home-copy.ts. */
const ALL_COPY = [
  ...Object.values(FEEDBACK),
  LAB_TILE.description,
  courseEyebrow('Python nâng cao', courseShape(MODULES)),
];
/** Mọi chữ người xem trang chủ đọc được: câu chữ chung + chữ trong JSX + nhãn màn. */
const SURFACE = [...ALL_COPY, ...vietStrings(PAGE), ...vietStrings(MAP), ...vietStrings(PLAN)];

/* ═══ 1 · hình dạng khoá: số đếm từ giáo trình, không phải số rời ═══════ */

test('đếm chặng/bài từ chính giáo trình đang render (8 chặng · 48 bài)', () => {
  const shape = courseShape(MODULES);
  assert.equal(shape.stageCount, 8);
  assert.equal(shape.lessonCount, 48);
  assert.equal(shapeLine(shape), '8 chặng · 48 bài');
  assert.equal(courseEyebrow('Python nâng cao', shape), 'Python nâng cao · 8 chặng · 48 bài');
  // Giáo trình rỗng/thiếu: không được vỡ, và không được bịa ra con số nào.
  assert.deepEqual(courseShape(undefined), { stageCount: 0, lessonCount: 0 });
  assert.deepEqual(courseShape(null), { stageCount: 0, lessonCount: 0 });
  // Nhãn hero đi qua hàm, không viết thẳng "8 chặng · 48 bài" vào JSX.
  assert.match(PAGE, /courseEyebrow\(/);
  const cung = [...vietStrings(PAGE), ...vietStrings(MAP)].filter((x) => /\d+\s*(chặng|bài)\b/.test(x));
  assert.deepEqual(cung, [], 'số chặng/bài viết cứng trong JSX: ' + cung.join(' | '));
});

/**
 * Luật chống AI slop đã có thật trên trang chủ cũ: KHÔNG KỂ VỀ CƠ CHẾ CỦA
 * CHÍNH MÌNH, KHÔNG TRẢ LỜI CÂU HỎI CHƯA AI HỎI, KHÔNG RÀO ĐÓN. Luật đầy đủ:
 * khối "LUẬT VIẾT CÂU CHỮ" ở đầu src/lib/home-copy.ts.
 */
test('trang chủ không kể về cơ chế, không rào đón, không giải thích trước', () => {
  const CAM = [
    [/hệ thống chọn|do hệ thống|AI (?:chọn|đề xuất)/i, 'kể về cơ chế bên trong'],
    [/không phải lệnh|chỉ là gợi ý|bạn không bắt buộc/i, 'rào đón cho một gợi ý'],
    [/vì sao bài này/i, 'trả lời câu hỏi chưa ai hỏi'],
    [/hai nơi chạy python|không giống nhau/i, 'giải thích trước khi người đọc gặp'],
  ];
  for (const [mau, ly_do] of CAM) {
    const dinh = SURFACE.filter((x) => mau.test(x));
    assert.deepEqual(dinh, [], ly_do + ':\n' + dinh.join('\n'));
  }
  // Tự kiểm phép so trên chính câu chữ CŨ — nếu nó không bắt được bản cũ thì
  // ca này vô dụng, và đó đúng là cách một hàng rào chết mà vẫn báo đạt.
  const CU = [
    'Gợi ý bước tiếp · hệ thống chọn',
    'Đây là gợi ý, không phải lệnh.',
    'Vì sao bài này: Đây là bài mở đầu chặng M1',
    'Hai nơi chạy Python, không giống nhau',
  ];
  for (let k = 0; k < CAM.length; k += 1) {
    assert.ok(CAM[k][0].test(CU[k]), `mẫu ${k} không bắt nổi chuỗi cũ: ${CU[k]}`);
  }
});

/* ═══ 2 · không chuỗi ngày, không chỉ số viết cứng, không khoá ══════════ */

test('không câu nào nhắc chuỗi ngày / ngọn lửa / "x trên 7 ngày"', () => {
  const bad = [...SURFACE, ...vietStrings(CATALOG)].filter(
    (s) => /🔥|chuỗi ngày|ngày liên tiếp|liên tiếp|\d\s*\/\s*7\s*ngày|streak/i.test(s),
  );
  assert.deepEqual(
    bad, [],
    'Chuỗi ngày là chỉ số TỤT khi người học nghỉ — bản thiết kế đã gỡ hẳn; chỉ số '
    + 'hiện ra phải là loại chỉ tăng.\n' + bad.join('\n'),
  );
});

test('trang chủ không khoá gì: không ổ khoá, không "mở khi đủ N bài"', () => {
  const bad = [...SURFACE, ...vietStrings(CATALOG)]
    .filter((s) => /🔒|ổ khoá|ổ khóa|bị khoá|bị khóa|đã mở khoá|đã mở khóa|mở khi đủ/i.test(s));
  assert.deepEqual(
    bad, [],
    'Grep cả frontend và backend không thấy cơ chế khoá chặng nào. Vẽ ổ khoá là '
    + 'hứa một cánh cửa không tồn tại và lấy đi quyền tự chọn bài.\n' + bad.join('\n'),
  );
  /*
   * ĐỔI LUẬT 19/10/2026: ca này từng đòi thêm "INTRO chỉ có title, hero không
   * có <p> dẫn dắt" (quyết định 15/10). Thiết kế 60:5137 có một câu dẫn dưới
   * tiêu đề và khối "Học như thế nào?"; chủ sản phẩm chọn theo thiết kế mới,
   * nên phần đó bỏ. Phần ổ khoá ở trên giữ nguyên.
   */
});

test('không chỉ số nào viết cứng: XP/phút/tiến độ đều đọc từ dữ liệu', () => {
  /*
   * Luật cũ là "trang chủ không có số đo nào" (vì nó không gọi API). Trang mới
   * CÓ số đo — XP, phút, "x / 7 đã xong", "%" — nên luật đổi thành: con số
   * nào về việc học cũng phải đi ra từ dữ liệu, không được nằm trong chuỗi.
   */
  // Chỉ soát chữ trong JSX: câu chữ chung như FEEDBACK.text ("khoảng 3 phút")
  // là thông tin cố định về khảo sát, không phải số đo việc học.
  const bad = [...vietStrings(PAGE), ...vietStrings(MAP), ...vietStrings(PLAN)].filter(
    (s) => /\+?\d+\s*XP\b|\d+\s*phút|\d+\s*%|\d+\s*(bài|thẻ)\s*(tuần này|hôm nay)|đã xong \d+|Câu đã chắc/i.test(s),
  );
  assert.deepEqual(bad, [], 'con số về việc học viết cứng:\n' + bad.join('\n'));
  // Và các con số đó thật sự đọc từ dữ liệu bài, không phải hằng.
  assert.match(MAP, /lesson\.xp/);
  assert.match(MAP, /lesson\.minutes/);
  assert.match(MAP, /steps\.pct/);
});

/* ═══ 3 · trang công khai KHÔNG tạo tài khoản khách ═════════════════════ */

test('trang chủ không bao giờ tạo tài khoản khách', () => {
  // Phần tĩnh (server) không chạm mạng gì cả.
  for (const [name, code] of [['page.tsx', PAGE], ['catalog.ts', CATALOG],
    ['home-copy.ts', COPY], ['dashboard-plan.ts', PLAN]]) {
    for (const pattern of [/\bapiFetch\b/, /apiFetchSessionOnly/, /ensureGuest/, /auth\/guest/,
      /\bfetch\s*\(/, /from '@\/lib\/api'/]) {
      assert.ok(!pattern.test(code), `${name} chạm vào đường mạng (${pattern})`);
    }
  }
  // Phần client chỉ được đọc PHIÊN ĐANG CÓ: apiFetch gặp 401 là TỰ TẠO tài
  // khoản khách cho mọi con bot mở trang (bẫy trong AGENTS.md).
  for (const pattern of [/\bapiFetch\s*\(/, /ensureGuest/, /auth\/guest/, /(?<![\w.])fetch\s*\(/]) {
    assert.ok(!pattern.test(MAP), `DashboardMap.tsx chạm mạng ngoài cổng phiên (${pattern})`);
  }
  // Mỗi lời gọi apiFetchSessionOnly phải nằm sau cổng loadCompletedLessons —
  // cổng đó trả null mà KHÔNG gọi gì khi máy chưa có phiên.
  const calls = (MAP.match(/apiFetchSessionOnly\(/g) ?? []).length;
  const gates = (MAP.match(/fetchCompleted:/g) ?? []).length;
  assert.ok(calls > 0, 'trang chủ đọc tiến độ mà không qua apiFetchSessionOnly');
  assert.ok(calls <= gates, `${calls} lời gọi apiFetchSessionOnly nhưng chỉ ${gates} cổng phiên`);
});

test('trang khoá chỉ được dùng apiFetchSessionOnly, không dùng apiFetch', () => {
  // `apiFetchSessionOnly` chỉ gửi kèm phiên đang có; 401 thì trả 401 và để UI
  // hiện trạng thái "chưa có phiên". `apiFetch` thì tạo tài khoản.
  const bare = COURSE_DETAIL.match(/\bapiFetch\s*\(/g) ?? [];
  assert.deepEqual(
    bare, [],
    'CourseDetail gọi `apiFetch(` — trang /courses/:id nằm trong sitemap, mọi con '
    + 'bot mở nó sẽ sinh một tài khoản @guest.local.',
  );
  assert.ok(
    COURSE_DETAIL.includes('apiFetchSessionOnly'),
    'trang khoá đọc tiến độ thì phải đọc bằng apiFetchSessionOnly',
  );
});

/* ═══ 4 · dữ liệu giả đã gỡ ════════════════════════════════════════════ */

test('catalog.ts không còn điểm sao viết cứng', () => {
  assert.ok(!/\brating\b/.test(CATALOG), 'còn trường `rating` trong danh mục khoá');
  assert.ok(!/\b4[.,]8\b/.test(CATALOG), 'còn hằng số 4.8 (điểm đánh giá bịa)');
  assert.ok(!/★/.test(CATALOG), 'còn ký tự sao trong danh mục khoá');
});

test('trang khoá không còn ô chấm sao và không còn "đánh giá trung bình"', () => {
  for (const pattern of [/StarRating/, /star-interactive/, /star-avg/, /RATE_LABELS/,
    /course\.rating/, /ratingFill/, /★/, /Đánh giá trung bình/]) {
    assert.ok(
      !pattern.test(COURSE_DETAIL),
      `trang khoá còn ${pattern}: 4,8 sao là số viết cứng và ô chấm sao không lưu `
      + 'điểm đi đâu — bày số liệu bịa cho người thử làm mất đáng tin cả những '
      + 'con số thật (48 bài, tiến độ).',
    );
  }
});

/* ═══ 5 · một việc, một từ ═════════════════════════════════════════════ */

test('trình soạn và chạy Python gọi là "Bàn thí nghiệm", không phải IDE', () => {
  assert.ok(
    /label: 'Bàn thí nghiệm'/.test(CATALOG),
    'thẻ công cụ ở trang chủ phải mang nhãn "Bàn thí nghiệm"',
  );
  for (const [name, code] of [['page.tsx', PAGE], ['DashboardMap.tsx', MAP],
    ['catalog.ts', CATALOG], ['home-copy.ts', COPY]]) {
    const hits = [...vietStrings(code), ...(code.match(/'[^'\n]*IDE[^'\n]*'/g) ?? [])]
      .filter((s) => /\bIDE\b/.test(s));
    assert.deepEqual(hits, [], `${name} còn gọi là IDE: ${hits.join(' | ')}`);
  }
});

test('chính tả "khoá" (không lẫn "khóa") và đơn vị "bài"/"chặng" ở trang chủ', () => {
  for (const [name, code] of [['page.tsx', PAGE], ['DashboardMap.tsx', MAP],
    ['dashboard-plan.ts', PLAN], ['catalog.ts', CATALOG], ['home-copy.ts', COPY]]) {
    const wrong = vietStrings(code).filter((s) => /khóa|Khóa/.test(s));
    assert.deepEqual(wrong, [], `${name} viết "khóa" lẫn với "khoá": ${wrong.join(' | ')}`);
    const pages = vietStrings(code).filter((s) => /\btrang \d|\d+ trang\b/i.test(s));
    assert.deepEqual(pages, [], `${name} gọi bài là "trang": ${pages.join(' | ')}`);
  }
  assert.ok(SURFACE.some((s) => /chặng/.test(s)), 'trang chủ phải dùng từ "chặng"');
  assert.ok(SURFACE.some((s) => /\bbài\b/.test(s)), 'trang chủ phải dùng từ "bài"');
});

test('không thi đua, không đánh trận, không thúc ép ở câu chữ trang chủ', () => {
  const bad = [...SURFACE, ...vietStrings(CATALOG)].filter(
    (s) => /⚔️|\bBoss\b|xếp hạng|thi đua|^Hãy |\bbạn phải\b|quá hạn/i.test(s),
  );
  assert.deepEqual(
    bad, [],
    'Giọng đã chốt: dẫn đường kiên nhẫn, không thúc ép, không so sánh với ai.\n'
    + bad.join('\n'),
  );
});

test('nói thật về nơi chạy code: Bàn thí nghiệm chạy trên máy chủ', () => {
  // `/ide` gửi mã tới POST /api/python/run và backend chạy trong container
  // Docker; chỉ BÀI HỌC mới chạy Pyodide trong trình duyệt.
  assert.ok(!/trong trình duyệt/.test(LAB_TILE.description), 'thẻ công cụ hứa sai nơi chạy');
  assert.match(LAB_TILE.description, /máy chủ/);
  // Thẻ Bàn thí nghiệm in đúng câu này, không viết một câu thứ hai vào JSX.
  assert.match(PAGE, /LAB_TILE\.description/);
});

/* ═══ 6 · thang cỡ chữ ═════════════════════════════════════════════════ */

/**
 * Thang cỡ chữ đọc từ chính bảng token, để `fontSizes()` quy được
 * `var(--ds-fs-ui)` về số px. Không có bước này thì mỗi chỗ chuyển sang token
 * là một chỗ ca dưới đây thôi nhìn thấy — luật "câu văn ≥ 17px" sẽ im lặng
 * đúng lúc file làm điều đúng.
 */
const FS_SCALE = new Map(
  [...readFileSync(join(FE, 'public', 'static', 'css', 'studio-tokens.css'), 'utf8')
    .matchAll(/(--ds-fs-[\w-]+)\s*:\s*(\d+(?:\.\d+)?)px\s*;/g)]
    .map((m) => [m[1], Number(m[2])]),
);

/** [tên lớp, px] cho mọi khai báo font-size trong một file CSS module. */
function fontSizes(css) {
  const out = [];
  let selector = '?';
  for (const line of css.split('\n')) {
    const sel = line.match(/^\.([\w-]+)/);
    if (sel) selector = sel[1];
    const size = line.match(/font-size:\s*(\d+(?:\.\d+)?)px/);
    if (size) { out.push([selector, Number(size[1])]); continue; }
    const tok = line.match(/font-size:\s*var\((--ds-fs-[\w-]+)\)/);
    if (tok && FS_SCALE.has(tok[1])) out.push([selector, FS_SCALE.get(tok[1])]);
  }
  return out;
}

test('trang chủ: không cỡ chữ nào < 15px', () => {
  const small = fontSizes(HOME_CSS).filter(([, px]) => px < 15);
  assert.deepEqual(
    small, [],
    'Bản thiết kế chốt: không có chữ nào nhỏ hơn 15px. Nhãn/chip 15px, câu văn '
    + '≥ 17px.\n' + small.map(([c, px]) => `.${c}: ${px}px`).join('\n'),
  );
});

test('trang chủ: mọi CÂU VĂN ở cỡ thân ≥ 17px', () => {
  // Những lớp này mang câu đầy đủ người học phải đọc. Figma vẽ vài câu ở
  // 13–15px; thang chữ thắng (design-system-v2: câu văn ≥ 17px).
  const BODY = ['heroDesc', 'labText', 'feedbackText', 'nowText', 'detailNote'];
  const sizes = new Map(fontSizes(HOME_CSS));
  for (const cls of BODY) {
    const px = sizes.get(cls);
    assert.ok(px !== undefined, `.${cls} không khai cỡ chữ`);
    assert.ok(px >= 17, `.${cls} là câu văn nhưng chỉ ${px}px (cỡ thân ≥ 17px)`);
  }
});

test('trang khoá: không cỡ chữ nào < 15px', () => {
  const small = fontSizes(SHELL_CSS).filter(([, px]) => px < 15);
  assert.deepEqual(
    small, [],
    'CourseShell.module.css từng dùng 11/12/13px.\n'
    + small.map(([c, px]) => `.${c}: ${px}px`).join('\n'),
  );
  // Bốn lớp dưới đây ĐÃ XOÁ cùng bốn lớp chú giải của thẻ "học tiếp" (nhãn
  // "hệ thống chọn", đoạn "Vì sao bài này", câu "Đây là gợi ý, không phải
  // lệnh", lối ra "Tự chọn bài"). Ca cũ chốt `.resumeWhy`/`.resumeFoot` ở cỡ
  // thân ≥ 17px; nay chốt NGƯỢC LẠI: chúng không được mọc lại.
  const con = fontSizes(SHELL_CSS).map(([c]) => c);
  for (const cls of ['resumeKicker', 'resumeWhy', 'resumeFoot', 'resumePick']) {
    assert.ok(!con.includes(cls), `.${cls} mọc lại — một lớp chú giải quay về`);
  }
});

test('không dùng mã màu trong *.module.css của trang chủ/trang khoá', () => {
  // Cùng luật với `npm run lint:tokens`, nhưng ca này nói rõ VÌ SAO khi trượt.
  for (const [name, css] of [['home.module.css', HOME_CSS], ['CourseShell.module.css', SHELL_CSS]]) {
    const hits = css.split('\n')
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => /#[0-9a-fA-F]{3,8}/.test(l));
    assert.deepEqual(
      hits.map(([i, l]) => `${name}:${i} ${l.trim()}`), [],
      'Mã màu rời không đổi theo bản nền (sáng/tối) và không ai đo lại được nó.',
    );
  }
});

/* ═══ 7 · tương phản WCAG AA trên cặp chữ/nền THẬT ══════════════════════ */

/**
 * Đọc token của HAI file mà trang chủ nạp, theo đúng thứ tự nạp:
 *   · `edu-theme.css`     — bảng --edu-* kế thừa bản Django (còn --edu-font và
 *                           các trang legacy chưa chuyển đọc tới);
 *   · `studio-tokens.css` — BẢNG v2 --ds-*, nguồn màu của trang chủ từ
 *                           15/10/2026.
 *
 * Vì sao phải đọc cả hai chứ không chỉ file v2: ca này đo màu LẤY TỪ CSS, và
 * CSS của trang chủ còn một token của bảng cũ (`--edu-font`). Đọc thiếu một
 * file là test ném "token chưa khai" cho một trang hoàn toàn bình thường.
 *
 * Giá trị có thể là hex hoặc rgba(); rgba được trộn lên nền thật khi đo.
 */
function eduTokens() {
  const files = [
    ['public', 'static', 'css', 'edu-theme.css'],
    ['public', 'static', 'css', 'studio-tokens.css'],
  ];
  const grab = (css, selector, where) => {
    const at = css.indexOf(selector);
    assert.ok(at >= 0, `không thấy ${selector} trong ${where}`);
    const open = css.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          const map = new Map();
          for (const m of css.slice(open + 1, i).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
            map.set(m[1], m[2].trim());
          }
          return map;
        }
      }
    }
    throw new Error(`khối ${selector} trong ${where} không đóng ngoặc`);
  };
  const light = new Map();
  const dark = new Map();
  for (const f of files) {
    const css = readFileSync(join(FE, ...f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    const root = grab(css, ':root', f.at(-1));
    for (const [k, v] of root) { light.set(k, v); dark.set(k, v); }
    for (const [k, v] of grab(css, 'body.dark', f.at(-1))) dark.set(k, v);
  }
  return { light, dark };
}

/** Giải một token thành mã hex, trộn lên `over` nếu nó là rgba(). */
function solid(tokens, name, over) {
  const raw = tokens.get(name);
  assert.ok(raw, `token chưa khai: ${name}`);
  if (/^#[0-9a-fA-F]{3,6}$/.test(raw)) return raw;
  const rgba = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  assert.ok(rgba, `token ${name} không phải màu đo được: ${raw}`);
  const hex = `#${[1, 2, 3].map((i) => Number(rgba[i]).toString(16).padStart(2, '0')).join('')}`;
  const alpha = rgba[4] === undefined ? 1 : Number(rgba[4]);
  return alpha === 1 ? hex : blend(hex, alpha, over);
}

/**
 * Lấy MỘT quy tắc CSS ra khỏi home.module.css thành map thuộc tính → giá trị.
 *
 * Vì sao đọc từ CSS chứ không chép danh sách màu vào test: danh sách chép tay
 * vẫn xanh sau khi ai đó đổi màu trong CSS mà quên sửa test — đúng kiểu lỗi mà
 * test tương phản sinh ra để bắt. Đọc từ CSS thì đổi `background` của nút chính
 * sang một màu nhạt hơn là ca này trượt ngay.
 */
function cssRule(css, selector) {
  let at = css.indexOf(`${selector} {`);
  if (at < 0) at = css.indexOf(`${selector}{`);
  assert.ok(at >= 0, `không thấy quy tắc ${selector} trong home.module.css`);
  const open = css.indexOf('{', at);
  const close = css.indexOf('}', open);
  const decls = new Map();
  // PHẢI bỏ chú thích trước khi dò khai báo. Chú thích trong CSS của repo này
  // là tiếng Việt và thường có dấu hai chấm ("Viền `sketch`, không `line`: …"),
  // nên regex `([a-z-]+)\s*:\s*([^;]+);` bắt được "line" làm tên thuộc tính và
  // ăn luôn tới dấu `;` của khai báo thật phía sau — khai báo đó biến mất khỏi
  // map, và ca test trượt với "không đọc được màu (không khai)".
  const body = css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const m of body.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)) {
    decls.set(m[1], m[2].trim());
  }
  return decls;
}

/**
 * Giá trị CSS (`white`, `transparent`, `var(--x)`, `2px dashed var(--x)`,
 * `rgba(…)`) → hex. `rgba()` viết thẳng trong CSS cũng phải đo được: luật
 * `lint:tokens` chỉ cấm mã HEX, nên một màu rời vẫn lọt vào được dưới dạng
 * rgba — và đó đúng là cách hai nhãn màu trượt AA của bản cũ được viết.
 */
function colorOf(tokens, value, over) {
  if (!value) return null;
  if (/^transparent$/.test(value)) return over;
  if (/\bwhite\b/.test(value)) return '#ffffff';
  const v = value.match(/var\((--[\w-]+)\)/);
  if (v) return solid(tokens, v[1], over);
  const rgba = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (!rgba) return null;
  const hex = `#${[1, 2, 3].map((i) => Number(rgba[i]).toString(16).padStart(2, '0')).join('')}`;
  const alpha = rgba[4] === undefined ? 1 : Number(rgba[4]);
  return alpha === 1 ? hex : blend(hex, alpha, over);
}

/* Nền phía sau từng quy tắc, theo bảng v2. */
const SURFACE_BG = {
  page: '--ds-page', card: '--ds-card', paper: '--ds-paper',
  vtint: '--ds-violet-tint', stint: '--ds-sanguine-tint',
};

/**
 * Cặp chữ/nền THẬT của trang chủ mới, đọc từ home.module.css. `on` là nền phía
 * sau quy tắc (khi quy tắc không tự tô nền); `prop` là thuộc tính được đo khi
 * không phải chữ. 'text' ≥ 4,5 · 'ui' ≥ 3 (viền/đồ hoạ mang thông tin).
 */
const CSS_PAIRS = [
  // hero
  { sel: '.eyebrow', on: 'page', kind: 'text' },
  { sel: '.eyebrow', on: 'card', kind: 'text', what: 'nhãn "Công cụ" trên thẻ' },
  { sel: '.heroTitle', on: 'page', kind: 'text' },
  { sel: '.heroDesc', on: 'page', kind: 'text' },
  { sel: '.nowCta', on: 'page', kind: 'text', what: 'nút chính' },
  { sel: '.previewCard', on: 'page', kind: 'ui', prop: 'border', what: 'viền thẻ bấm được' },
  { sel: '.previewEyebrow', on: 'card', kind: 'text' },
  { sel: '.previewTitle', on: 'card', kind: 'text', from: '.previewCard' },
  { sel: '.howBadge', on: 'card', kind: 'text' },
  // bản đồ + chặng
  { sel: '.mapCount', on: 'card', kind: 'text' },
  { sel: '.nodeBox', on: 'card', kind: 'text' },
  { sel: '.nodeBox', on: 'card', kind: 'ui', prop: 'border', what: 'viền nút chặng' },
  { sel: '.bossNote', on: 'card', kind: 'text' },
  { sel: '.stageCode', on: 'card', kind: 'text' },
  { sel: '.stageSub', on: 'card', kind: 'text' },
  { sel: '.lessonCard', on: 'card', kind: 'ui', prop: 'border', what: 'viền thẻ bài bấm được' },
  { sel: '.lessonMeta', on: 'paper', kind: 'text' },
  { sel: '.lessonStatus', on: 'paper', kind: 'text' },
  { sel: '.lessonCardDone .lessonStatus', on: 'paper', kind: 'text', what: 'đã xong' },
  { sel: '.lessonCardBoss .lessonStatus', on: 'stint', kind: 'text', what: 'bài tổng hợp' },
  // bài đang chọn
  { sel: '.band', on: 'card', kind: 'text' },
  { sel: '.crumb', on: 'card', kind: 'text' },
  { sel: '.detailMeta', on: 'card', kind: 'text' },
  { sel: '.xp', on: 'card', kind: 'text' },
  { sel: '.nowEyebrow', on: 'vtint', kind: 'text' },
  { sel: '.nowText', on: 'vtint', kind: 'text' },
  { sel: '.listCount', on: 'card', kind: 'text' },
  { sel: '.listNote', on: 'card', kind: 'text', what: 'cùng quy tắc với .listEmpty' },
  { sel: '.detailNote', on: 'card', kind: 'text' },
  { sel: '.outlineBtn', on: 'card', kind: 'text', what: 'nút phụ' },
  { sel: '.outlineBtn', on: 'card', kind: 'ui', prop: 'border', what: 'viền nút phụ' },
  // công cụ + góp ý
  { sel: '.labText', on: 'card', kind: 'text' },
  { sel: '.feedbackCard', on: 'page', kind: 'ui', prop: 'border', what: 'viền nét đứt thẻ góp ý' },
  { sel: '.feedbackText', on: 'paper', kind: 'text' },
];

const NEED = { text: 4.5, ui: 3 };

for (const mode of ['light', 'dark']) {
  test(`tương phản AA — bản ${mode === 'light' ? 'ngày' : 'Ban đêm'} của trang chủ`, () => {
    const tokens = eduTokens()[mode];
    const bad = [];
    for (const pair of CSS_PAIRS) {
      const decls = cssRule(HOME_CSS, pair.sel);
      const surface = solid(tokens, SURFACE_BG[pair.on]);
      const bg = colorOf(tokens, decls.get('background'), surface) ?? surface;
      const raw = pair.prop
        ? decls.get(pair.prop)
        : decls.get('color') ?? cssRule(HOME_CSS, pair.from).get('color');
      const fg = colorOf(tokens, raw, bg);
      const label = `${pair.sel}${pair.what ? ` (${pair.what})` : ''}`;
      assert.ok(fg, `${label}: không đọc được màu (${raw ?? 'không khai'})`);
      const ratio = contrast(fg, bg);
      if (ratio < NEED[pair.kind]) {
        bad.push(`${label}: ${ratio.toFixed(2)} < ${NEED[pair.kind]} (${fg} trên ${bg})`);
      }
    }
    assert.deepEqual(bad, [], `trượt AA:\n${bad.join('\n')}`);
  });
}

/* ═══ 8 · thẻ góp ý gọi cùng một tên ở cả hai chỗ ═══════════════════════ */

test('nút góp ý ở trang khoá dùng ĐÚNG nhãn của FEEDBACK.title', () => {
  /* Lỗi thật đã sửa 15/10/2026. Thẻ góp ý ở trang chủ đã đổi sang "Góp ý cho
     nhóm làm khoá" (FEEDBACK.title) vì ngôi "chúng tôi" dựng ra một công ty vô
     hình ở phía kia và không nói góp ý VỀ CÁI GÌ. Nút góp ý ở trang khoá —
     mở ĐÚNG một biểu mẫu đó, qua cùng `feedbackFormHref()` — thì vẫn ghi "Góp ý
     cho chúng tôi". Một biểu mẫu, hai cái tên, trên hai trang liền nhau.

     Nhãn đọc TỪ NGUỒN (`home-copy.ts`) chứ không chép tay: đổi nhãn ở đó mà
     quên trang khoá là ca này đỏ, chứ không trôi đi như lần trước.

     Vì sao KHÔNG cấm trần ngôi "chúng tôi" ở mọi nơi: nó có một chỗ dùng đúng —
     `components/lesson-chrome/UnknownScreenNotice.tsx` nói "Chỗ này là lỗi của
     chúng tôi, không phải do bạn làm sai". Ở đó ngôi thứ nhất là để hệ thống
     NHẬN LỖI, không phải để tự xưng. Cấm trần là làm mất đúng câu đó. */
  const CU = 'Góp ý cho chúng tôi';
  assert.ok(FEEDBACK.title !== CU, 'FEEDBACK.title đã quay về bản cũ');
  assert.ok(
    COURSE_DETAIL.includes(CU) === false,
    `trang khoá còn nhãn cũ "${CU}" — ngôi "chúng tôi" đã bỏ khỏi thẻ góp ý`,
  );
  assert.ok(
    COURSE_DETAIL.includes(FEEDBACK.title),
    `trang khoá không dùng nhãn "${FEEDBACK.title}" — một biểu mẫu mà hai tên`,
  );
});

/* ═══ 9 · ba câu cuối của đợt cắt văn kể lể ════════════════════════════ */

/**
 * Chủ sản phẩm chốt chuẩn gắt nhất sau ba lượt cắt: "hơi liên quan đến kể lể
 * hoặc có chút yếu tố kể lể như thế là xoá".
 *
 * Ba câu dưới đây từng được một lượt soát xếp vào "cần chủ sản phẩm quyết" vì
 * chúng đứng giữa ranh giới — vừa là thông tin, vừa hơi kể lể. Quyết: xoá cả
 * ba.
 *
 *  · `SECTIONS.toolNote` "Dùng được cả khi không mở bài học" — không hứa gì
 *    sai, nhưng là một câu MÔ TẢ treo dưới một nhãn, mà thẻ công cụ ngay dưới
 *    đã nói nó làm gì.
 *  · nhãn chỉ số "Chỉ tăng, không bao giờ tụt" — nói về CÁCH TÍNH thay vì gọi
 *    tên con số. Nay là "Đúng ngay lần đầu", và dòng đơn vị ngay dưới vẫn in
 *    "lượt trả lời đúng ngay lần đầu".
 *  · `ExplainScreen` "Cùng cơ chế với bài, nhưng dữ liệu khác — đọc hiểu rồi
 *    tự áp dụng vào đề." — giảng giải trước khi người đọc gặp.
 *
 * CÒN GIỮ, và đây là ranh giới: câu hiện ra lúc HỎNG ("các phương án bạn chọn
 * vẫn còn đây", "đây là sự cố bên chúng tôi, không phải phiên học của bạn").
 * Chúng không mô tả sản phẩm — chúng nói chuyện gì vừa xảy ra và làm gì tiếp,
 * đúng lúc người học cần biết. Cắt chúng là quay lại đổ lỗi cho người học,
 * thứ `lib/lesson-load-error.ts` vừa sửa.
 */
test('ba câu cuối của đợt cắt đã đi, và không mọc lại', () => {
  const CAM = [
    ['Dùng được cả khi không mở bài học', 'mô tả treo dưới một nhãn'],
    ['Chỉ tăng, không bao giờ tụt', 'nhãn nói về cách tính thay vì tên con số'],
    ['Cùng cơ chế với bài', 'giảng giải trước khi người đọc gặp'],
  ];
  const be_mat = [
    ...ALL_COPY,
    ...vietStrings(PAGE),
    ...vietStrings(read('src', 'app', '(standalone)', 'practice', 'challenge', 'ChallengeClient.tsx')),
    ...vietStrings(read('src', 'components', 'python-studio', 'screens', 'ExplainScreen.tsx')),
  ];
  for (const [chuoi, ly_do] of CAM) {
    const dinh = be_mat.filter((x) => x.includes(chuoi));
    assert.deepEqual(dinh, [], ly_do + ': ' + dinh.join(' | '));
  }
  // Tự kiểm phép so trên chính ba chuỗi CŨ — không bắt nổi bản cũ thì ca này
  // là hàng rào chết mà vẫn báo đạt.
  for (const [chuoi] of CAM) {
    assert.ok(['Dùng được cả khi không mở bài học',
      'Chỉ tăng, không bao giờ tụt',
      'Cùng cơ chế với bài, nhưng dữ liệu khác — đọc hiểu rồi tự áp dụng vào đề.',
    ].some((cu) => cu.includes(chuoi)), `phép so không bắt nổi chuỗi cũ: ${chuoi}`);
  }
});

