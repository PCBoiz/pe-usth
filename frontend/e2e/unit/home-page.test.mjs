/**
 * Unit test cho TRANG CHỦ và TRANG KHOÁ — hai trang CÔNG KHAI.
 *
 * Vì sao phải có, và vì sao không kiểm được bằng cách mở trang ra xem:
 *
 *  1. TÀI KHOẢN KHÁCH SINH RA TRONG IM LẶNG. `apiFetch` (src/lib/api.ts) khi
 *     gặp 401 mà refresh không được sẽ rơi xuống `ensureGuest()`. Gọi nó ở một
 *     trang ai cũng vào được nghĩa là mỗi con bot quét web sinh một tài khoản
 *     `@guest.local` và ăn một suất của THROTTLE_GUEST_LIMIT (mặc định 120
 *     lượt/giờ/IP) — cả phòng máy chung một NAT sẽ nhận 429 đúng lúc có người
 *     cần tài khoản thật. Mở trang bằng mắt thì KHÔNG thấy gì: người đang xem
 *     thường đã có phiên, và tài khoản rác sinh ra ở phía server.
 *
 *  2. SỐ LIỆU BỊA TRÔNG GIỐNG SỐ LIỆU THẬT. 4,8 sao "đánh giá trung bình" ở
 *     trang khoá là một hằng số trong `catalog.ts`, và ô chấm sao bên dưới nó
 *     không lưu điểm đi đâu. Nhìn trang thì cả hai trông như tính năng chạy
 *     được — chỉ đọc mã mới thấy không có gì ở sau.
 *
 *  3. CÂU CHỮ LÀ CHỖ TRIẾT LÝ HIỆN RA. Bản thiết kế
 *     (`design/project/Main.dc.html` + `design-system-v2.md`) chốt: không chuỗi
 *     ngày, không khoá gì, thẻ gợi ý có đủ bốn phần, và một việc một từ
 *     (khoá · chặng · bài · màn · Bàn thí nghiệm). Một chuỗi đổi đi là không ai
 *     thấy trong diff của tính năng khác.
 *
 *  4. TƯƠNG PHẢN VÀ CỠ CHỮ không ước lượng bằng mắt được. Hai nhãn màu của bản
 *     cũ (đỏ 3,72:1 bản ngày / 3,41:1 bản đêm; xanh 3,33 / 3,75) trông "vẫn
 *     đọc được" nhưng trượt AA.
 *
 * Phần hàm thuần nằm ở `src/lib/home-copy.ts` (không import gì, vì `node --test`
 * không phân giải alias `@/…`); phần còn lại là test ĐỌC MÃ NGUỒN dạng văn bản.
 *
 * Bằng chứng bắt được lỗi thật: xem khối chú thích cuối file.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { blend, contrast } from './ds-contrast.mjs';
import {
  courseEyebrow,
  courseShape,
  courseTileTags,
  FEEDBACK,
  footerLine,
  HONEST_NOTE,
  INTRO,
  LAB_TILE,
  nextStep,
  SECTIONS,
  shapeLine,
} from '../../src/lib/home-copy.ts';

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
const TILE = codeOnly(read('src', 'app', 'CatalogTile.tsx'));
const CATALOG = codeOnly(read('src', 'lib', 'catalog.ts'));
const COPY = codeOnly(read('src', 'lib', 'home-copy.ts'));
const COURSE_DETAIL = codeOnly(
  read('src', 'app', '(standalone)', 'courses', '[courseId]', 'CourseDetail.tsx'),
);
const HOME_CSS = read('src', 'app', 'home.module.css');
const SHELL_CSS = read('src', 'components', 'CourseShell.module.css');

/** Giáo trình thật — cùng file mà trang khoá đọc để vẽ 48 bài. */
const CURRICULA = JSON.parse(read('src', 'lib', 'curricula.json')).CURRICULA;
const MODULES = CURRICULA.python_advanced.modules;

/** Mọi chuỗi hiển thị trong một file (nháy đơn/đôi/backtick) có chữ Việt. */
function vietStrings(code) {
  const out = [];
  for (const m of code.matchAll(/(['"`])((?:[^\\\n]|\\.)*?)\1/g)) {
    const s = m[2];
    if (/[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩậắằẳẵặẹẻẽếềểệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(s)) out.push(s);
  }
  return out;
}

/* ═══ 1 · hình dạng khoá: số đếm từ giáo trình, không phải số rời ═══════ */

test('đếm chặng/bài từ chính giáo trình đang render (8 chặng · 48 bài)', () => {
  const shape = courseShape(MODULES);
  assert.equal(shape.stageCount, 8);
  assert.equal(shape.lessonCount, 48);
  assert.equal(shapeLine(shape), '8 chặng · 48 bài');
  assert.equal(courseEyebrow('Advanced Python', shape), 'Advanced Python · 8 chặng · 48 bài');
  // Giáo trình rỗng/thiếu: không được vỡ, và không được bịa ra con số nào.
  assert.deepEqual(courseShape(undefined), { stageCount: 0, lessonCount: 0 });
  assert.deepEqual(courseShape(null), { stageCount: 0, lessonCount: 0 });
});

test('nhãn thẻ khoá không có điểm sao, và dùng đơn vị "chặng"/"bài"', () => {
  const tags = courseTileTags(courseShape(MODULES), 'Nâng cao');
  assert.deepEqual(tags, ['Python 3.12', 'Nâng cao', '8 chặng · 48 bài']);
  for (const tag of tags) {
    assert.ok(!/★|\bsao\b|\d,\d\s*\/\s*5/.test(tag), `nhãn "${tag}" mang điểm sao`);
    // "cỗ máy" là tên ẩn dụ của chặng, "trang" là trang giấy trong sổ lý thuyết:
    // cả hai đều KHÔNG phải đơn vị đếm bài (bảng thuật ngữ mục 2.1).
    assert.ok(!/cỗ máy|\btrang\b|\bmodule\b/i.test(tag), `nhãn "${tag}" dùng đơn vị sai`);
  }
});

/* ═══ 2 · thẻ gợi ý: đủ bốn phần + vạch ngăn + lối ra ═══════════════════ */

test('thẻ gợi ý có đủ 4 phần, rồi "không phải lệnh" + lối ra yên tĩnh', () => {
  const step = nextStep({
    courseId: 'python_advanced',
    lessonUrl: '/lesson/python_advanced',
    firstStage: MODULES[0].title,
    firstLesson: MODULES[0].lessons[0],
  });

  // (1) nhãn nói rõ AI đề xuất — thiếu chỗ này thì gợi ý nghe như bổn phận.
  assert.match(step.label, /hệ thống/i);
  // (2) tiêu đề là mã + tên bài thật, lấy từ giáo trình.
  assert.equal(step.title, MODULES[0].lessons[0]);
  // (3) "Vì sao" phải dẫn ra DỮ KIỆN (tên chặng), không phải lời cổ vũ.
  assert.ok(step.why.includes(MODULES[0].title), `"Vì sao" không dẫn dữ kiện nào: ${step.why}`);
  // (4) nút chính: động từ + đích, ≤ 4 từ, không dùng ký tự ▶ thay icon.
  assert.ok(step.ctaLabel.split(/\s+/).length <= 4, `nhãn nút quá dài: ${step.ctaLabel}`);
  assert.ok(!/▶|→/.test(step.ctaLabel), 'ký tự mũi tên trong nhãn nút');
  assert.equal(step.ctaHref, '/lesson/python_advanced?lesson=0');

  // Vạch ngăn rồi tới lối ra: hai thứ này là phần phân biệt GỢI Ý với LỆNH.
  assert.equal(step.note, 'Đây là gợi ý, không phải lệnh.');
  assert.equal(step.exitLabel, 'Tự chọn bài');
  assert.match(step.exitHref, /^\/courses\/python_advanced/);
  // Lối ra dẫn tới danh sách bài, không dẫn vòng về chính bài được gợi ý.
  assert.notEqual(step.exitHref, step.ctaHref);
});

test('không có giáo trình thì thẻ gợi ý vẫn đứng được, không in "undefined"', () => {
  const step = nextStep({ courseId: 'x', lessonUrl: '/lesson/x' });
  for (const value of Object.values(step)) {
    assert.ok(!/undefined|null|NaN/.test(value), `thẻ gợi ý in ra giá trị rỗng: ${value}`);
  }
  assert.ok(step.why.length > 20, 'vẫn phải có câu "vì sao", kể cả khi thiếu dữ liệu');
});

/* ═══ 3 · không chuỗi ngày, không chỉ số bịa, không khoá ════════════════ */

const ALL_COPY = [
  ...Object.values(INTRO), ...Object.values(SECTIONS), ...Object.values(FEEDBACK),
  ...Object.values(HONEST_NOTE), LAB_TILE.description, ...LAB_TILE.tags,
  footerLine(2026, 'Advanced Python'),
  ...Object.values(nextStep({
    courseId: 'python_advanced',
    lessonUrl: '/lesson/python_advanced',
    firstStage: MODULES[0].title,
    firstLesson: MODULES[0].lessons[0],
  })),
];

test('không câu nào nhắc chuỗi ngày / ngọn lửa / "x trên 7 ngày"', () => {
  const bad = [...ALL_COPY, ...vietStrings(PAGE), ...vietStrings(CATALOG)].filter(
    (s) => /🔥|chuỗi ngày|ngày liên tiếp|liên tiếp|\d\s*\/\s*7\s*ngày|streak/i.test(s),
  );
  assert.deepEqual(
    bad, [],
    'Chuỗi ngày là chỉ số TỤT khi người học nghỉ — bản thiết kế đã gỡ hẳn; chỉ số '
    + 'hiện ra phải là loại chỉ tăng.\n' + bad.join('\n'),
  );
});

test('trang chủ không khoá gì: không ổ khoá, không "mở khi đủ N bài"', () => {
  const bad = [...ALL_COPY, ...vietStrings(PAGE), ...vietStrings(CATALOG), ...vietStrings(TILE)]
    .filter((s) => /🔒|ổ khoá|ổ khóa|bị khoá|bị khóa|đã mở khoá|đã mở khóa|mở khi đủ/i.test(s));
  assert.deepEqual(
    bad, [],
    'Grep cả frontend và backend không thấy cơ chế khoá chặng nào. Vẽ ổ khoá là '
    + 'hứa một cánh cửa không tồn tại và lấy đi quyền tự chọn bài.\n' + bad.join('\n'),
  );
  // Và phải nói THẲNG rằng không khoá — gỡ ổ khoá mà không nói thì người học
  // vẫn tưởng phải đi tuần tự.
  assert.match(INTRO.lead, /vào được/);
});

test('không chỉ số nào bịa: trang chủ không có số đo nào ngoài số đếm giáo trình', () => {
  // Trang chủ không gọi API (ca dưới chứng minh), nên nó KHÔNG BIẾT tiến độ.
  const bad = [...ALL_COPY, ...vietStrings(PAGE)].filter(
    (s) => /\bXP\b|\d+\s*(bài|thẻ)\s*(tuần này|hôm nay)|đã xong \d+|Câu đã chắc/i.test(s),
  );
  assert.deepEqual(
    bad, [],
    'Trang chủ không đọc tiến độ của ai (không gọi API), nên mọi con số về việc '
    + 'học đều là số bịa.\n' + bad.join('\n'),
  );
});

/* ═══ 4 · trang công khai KHÔNG tạo tài khoản khách ═════════════════════ */

test('trang chủ không gọi API nào — không có đường rơi xuống ensureGuest()', () => {
  for (const [name, code] of [['page.tsx', PAGE], ['CatalogTile.tsx', TILE],
    ['catalog.ts', CATALOG], ['home-copy.ts', COPY]]) {
    for (const pattern of [/\bapiFetch\b/, /ensureGuest/, /auth\/guest/, /\bfetch\s*\(/,
      /from '@\/lib\/api'/]) {
      assert.ok(
        !pattern.test(code),
        `${name} chạm vào đường mạng (${pattern}) — trang chủ phải là trang tĩnh. `
        + 'apiFetch gặp 401 là TỰ TẠO tài khoản khách cho mọi con bot mở trang.',
      );
    }
  }
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

/* ═══ 5 · dữ liệu giả đã gỡ ════════════════════════════════════════════ */

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

/* ═══ 6 · một việc, một từ ═════════════════════════════════════════════ */

test('trình soạn và chạy Python gọi là "Bàn thí nghiệm", không phải IDE', () => {
  assert.ok(
    /label: 'Bàn thí nghiệm'/.test(CATALOG),
    'thẻ công cụ ở trang chủ phải mang nhãn "Bàn thí nghiệm"',
  );
  for (const [name, code] of [['page.tsx', PAGE], ['catalog.ts', CATALOG], ['home-copy.ts', COPY]]) {
    const hits = [...vietStrings(code), ...(code.match(/'[^'\n]*IDE[^'\n]*'/g) ?? [])]
      .filter((s) => /\bIDE\b/.test(s));
    assert.deepEqual(hits, [], `${name} còn gọi là IDE: ${hits.join(' | ')}`);
  }
});

test('chính tả "khoá" (không lẫn "khóa") và đơn vị "bài"/"chặng" ở trang chủ', () => {
  for (const [name, code] of [['page.tsx', PAGE], ['catalog.ts', CATALOG], ['home-copy.ts', COPY]]) {
    const wrong = vietStrings(code).filter((s) => /khóa|Khóa/.test(s));
    assert.deepEqual(wrong, [], `${name} viết "khóa" lẫn với "khoá": ${wrong.join(' | ')}`);
    // "trang 3" / "N trang" là cách gọi bài của bản thiết kế cũ; "trang" nay chỉ
    // còn nghĩa trang giấy trong sổ lý thuyết.
    const pages = vietStrings(code).filter((s) => /\btrang \d|\d+ trang\b/i.test(s));
    assert.deepEqual(pages, [], `${name} gọi bài là "trang": ${pages.join(' | ')}`);
  }
  assert.ok(ALL_COPY.some((s) => /chặng/.test(s)), 'trang chủ phải dùng từ "chặng"');
  assert.ok(ALL_COPY.some((s) => /\bbài\b/.test(s)), 'trang chủ phải dùng từ "bài"');
});

test('không thi đua, không đánh trận, không thúc ép ở câu chữ trang chủ', () => {
  const bad = [...ALL_COPY, ...vietStrings(PAGE), ...vietStrings(CATALOG)].filter(
    (s) => /⚔️|\bBoss\b|xếp hạng|thi đua|^Hãy |\bbạn phải\b|quá hạn/i.test(s),
  );
  assert.deepEqual(
    bad, [],
    'Giọng đã chốt: dẫn đường kiên nhẫn, không thúc ép, không so sánh với ai.\n'
    + bad.join('\n'),
  );
});

test('chân trang không tự phong chất lượng, và không viết cứng năm', () => {
  /* Lỗi thật đã sửa: `app/page.tsx` in thẳng trong JSX "© 2026 Programming EDU.
     Học lập trình trực quan và hiệu quả." Nửa sau là lời hứa về CHẤT LƯỢNG do
     sản phẩm tự phong — không có số nào, không có đo nào ở sau, cùng họ với
     `rating: 4.8` đã gỡ ở a04c3cf. Chính `SECTIONS.toolNote` đã chép luật này
     vào repo ("không hứa hẹn gì về chất lượng; chỉ nói chỗ dùng") mà chân
     trang vẫn trái nó, vì nó không nằm ở file nào có test.

     Ba phép so dưới đây đều TỰ KIỂM trên chuỗi cũ trước, để không có ca nào
     xanh trong khi câu sai còn nguyên. */
  const CU = '© 2026 Programming EDU. Học lập trình trực quan và hiệu quả.';
  const KHOE = ['trực quan', 'hiệu quả', 'tốt nhất', 'dễ dàng', 'nhanh chóng', 'chuyên sâu'];

  // (a) phép so có bắt được chuỗi cũ không — tự kiểm.
  assert.ok(KHOE.some((t) => CU.includes(t)), 'bảng từ khoe không bắt nổi chuỗi cũ');
  assert.ok(/\b20\d\d\b/.test(CU));

  const now = footerLine(2026, 'Advanced Python');
  for (const t of KHOE) {
    assert.ok(!now.includes(t), `chân trang lại tự phong chất lượng ("${t}"): ${now}`);
  }

  // (b) nội dung còn lại phải LẤY TỪ DANH MỤC, không chép tay.
  assert.ok(now.includes('Advanced Python'), 'chân trang không nói khoá nào');
  assert.ok(footerLine(2026, 'Khoá X').includes('Khoá X'), 'tên khoá bị viết cứng');
  // Danh mục rỗng ⇒ bỏ hẳn nửa sau, đừng bịa tên khoá.
  assert.equal(footerLine(2026), '© 2026 Programming EDU');
  assert.equal(footerLine(2026, '   '), '© 2026 Programming EDU');

  // (c) năm đi theo tham số, nên JSX không được ghi cứng một năm nào.
  assert.ok(footerLine(2031, 'Advanced Python').includes('2031'));
  const nam = PAGE.match(/\b20\d\d\b/g) ?? [];
  assert.deepEqual(nam, [], `app/page.tsx còn năm viết cứng: ${nam.join(', ')}`);

  // (d) và chân trang phải đi qua hàm, không quay về chuỗi thẳng trong JSX.
  assert.match(PAGE, /footerLine\(/);
  assert.ok(
    !/Programming EDU\./.test(PAGE),
    'câu chân trang lại bị viết thẳng vào JSX — chỗ không có test nào soi',
  );
});

test('nói thật về nơi chạy code: Bàn thí nghiệm chạy trên máy chủ', () => {
  // `/ide` gửi mã tới POST /api/python/run và backend chạy trong container
  // Docker; chỉ BÀI HỌC mới chạy Pyodide trong trình duyệt. Câu cũ của thẻ công
  // cụ ("chạy code Python ngay trong trình duyệt") là sai sự thật.
  assert.ok(!/trong trình duyệt/.test(LAB_TILE.description), 'thẻ công cụ hứa sai nơi chạy');
  assert.match(LAB_TILE.description, /máy chủ/);
  assert.ok(LAB_TILE.tags.some((t) => /máy chủ/.test(t)));
  // Khối ghi chú trung thực mở đầu bằng câu nói CÁI GÌ LÀ THẬT.
  assert.match(HONEST_NOTE.strong, /trình duyệt/);
});

/* ═══ 7 · thang cỡ chữ ═════════════════════════════════════════════════ */

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

test('trang chủ: không cỡ chữ nào < 15px (bản cũ có ba chỗ 13px)', () => {
  const small = fontSizes(HOME_CSS).filter(([, px]) => px < 15);
  assert.deepEqual(
    small, [],
    'Bản thiết kế chốt: không có chữ nào nhỏ hơn 15px. Nhãn/chip 15px, câu văn '
    + '≥ 17px.\n' + small.map(([c, px]) => `.${c}: ${px}px`).join('\n'),
  );
});

test('trang chủ: mọi CÂU VĂN ở cỡ thân ≥ 17px', () => {
  // Những lớp này mang câu đầy đủ người học phải đọc để biết làm gì tiếp.
  const BODY = ['lead', 'desc', 'nextWhy', 'nextFoot', 'nextExit', 'noteText', 'feedbackText'];
  const sizes = new Map(fontSizes(HOME_CSS));
  for (const cls of BODY) {
    const px = sizes.get(cls);
    assert.ok(px !== undefined, `.${cls} không khai cỡ chữ`);
    assert.ok(px >= 17, `.${cls} là câu văn nhưng chỉ ${px}px (cỡ thân ≥ 17px)`);
  }
});

test('trang khoá: không cỡ chữ nào < 15px, và "Vì sao bài này" ở cỡ thân', () => {
  const small = fontSizes(SHELL_CSS).filter(([, px]) => px < 15);
  assert.deepEqual(
    small, [],
    'CourseShell.module.css từng dùng 11/12/13px.\n'
    + small.map(([c, px]) => `.${c}: ${px}px`).join('\n'),
  );
  const sizes = new Map(fontSizes(SHELL_CSS));
  for (const cls of ['resumeWhy', 'resumeFoot']) {
    assert.ok(sizes.get(cls) >= 17, `.${cls} là câu văn nhưng chỉ ${sizes.get(cls)}px`);
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

/* ═══ 8 · tương phản WCAG AA trên cặp chữ/nền THẬT ══════════════════════ */

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

/* Nền phía sau từng quy tắc, theo bảng v2. `next` là thẻ gợi ý — bản thiết kế
   §1.4 chốt nền `ink`, và cặp ink/page tự đảo theo bản nền. */
const SURFACE = {
  page: '--ds-page', card: '--ds-card', paper: '--ds-paper', next: '--ds-ink',
};

/**
 * Cặp chữ/nền THẬT của trang chủ. `on` là nền phía sau quy tắc đó (trang, thẻ,
 * hay thẻ gợi ý nền đậm); `prop` là thuộc tính được đo khi không phải chữ.
 * Loại: 'text' ≥ 4,5 · 'ui' ≥ 3 (viền/đồ hoạ mang thông tin) · 'decor' được
 * miễn và PHẢI kèm `why` (thuần trang trí, gỡ đi không mất thông tin nào).
 */
const CSS_PAIRS = [
  { sel: '.eyebrow', on: 'page', kind: 'text' },
  { sel: '.title', on: 'page', kind: 'text' },
  { sel: '.lead', on: 'page', kind: 'text' },
  { sel: '.pill', on: 'page', kind: 'text' },
  { sel: '.colNote', on: 'page', kind: 'text' },
  { sel: '.footer', on: 'page', kind: 'text' },
  { sel: '.label', on: 'card', kind: 'text' },
  { sel: '.desc', on: 'card', kind: 'text' },
  { sel: '.tag', on: 'card', kind: 'text' },
  { sel: '.go', on: 'card', kind: 'ui' },
  { sel: '.card:hover .go', on: 'card', kind: 'ui' },
  { sel: '.next', on: 'page', kind: 'text' },
  { sel: '.nextLabel', on: 'next', kind: 'text', from: '.next' },
  { sel: '.nextTitle', on: 'next', kind: 'text', from: '.next' },
  { sel: '.nextWhy', on: 'next', kind: 'text', from: '.next' },
  { sel: '.nextCta', on: 'next', kind: 'text' },
  { sel: '.nextExit', on: 'next', kind: 'text' },
  { sel: '.nextFoot', on: 'next', kind: 'text', from: '.next' },
  { sel: '.nextFoot', on: 'next', kind: 'ui', prop: 'border-top', what: 'vạch ngăn' },
  { sel: '.noteTitle', on: 'paper', kind: 'text' },
  { sel: '.noteText', on: 'paper', kind: 'text' },
  { sel: '.noteIcon', on: 'paper', kind: 'ui' },
  { sel: '.note', on: 'paper', kind: 'ui', prop: 'border', what: 'viền nét đứt' },
  { sel: '.feedbackTitle', on: 'card', kind: 'text' },
  { sel: '.feedbackText', on: 'card', kind: 'text' },
  { sel: '.feedbackIcon', on: 'card', kind: 'ui' },
  { sel: '.feedbackButton', on: 'card', kind: 'text' },
  { sel: '.feedbackButton', on: 'card', kind: 'ui', prop: 'border', what: 'viền nút phụ' },
  // 15/10/2026 — hai cặp dưới đây TRƯỚC ĐÂY phải miễn ngưỡng (viền `line` của
  // bảng cũ chỉ 1,20:1 trên nền thẻ). Bảng v2 có token `sketch` dành riêng cho
  // "viền thứ bấm được", nên nay chúng đo được và ĐẠT — không cần miễn nữa.
  { sel: '.tag', on: 'card', kind: 'ui', prop: 'border', what: 'viền nhãn' },
  { sel: '.card', on: 'page', kind: 'ui', prop: 'border', what: 'viền thẻ bấm được' },
  {
    sel: '.feedback', on: 'page', kind: 'decor', prop: 'border', what: 'viền thẻ góp ý',
    why: 'thẻ góp ý KHÔNG bấm được (nút nằm bên trong), ranh giới do nền `card` '
      + 'và phần đệm 32px nói — đúng vai bảng thiết kế dành cho token `line`',
  },
  {
    sel: '.footer', on: 'page', kind: 'decor', prop: 'border-top', what: 'vạch chân trang',
    why: 'chân trang đã tách bằng 22px đệm và nằm sau khối cuối; đường kẻ chỉ '
      + 'để mắt nghỉ, gỡ đi không mất thông tin nào',
  },
];

const NEED = { text: 4.5, ui: 3, decor: 0 };

for (const mode of ['light', 'dark']) {
  test(`tương phản AA — bản ${mode === 'light' ? 'ngày' : 'Ban đêm'} của trang chủ`, () => {
    const tokens = eduTokens()[mode];
    const bad = [];
    for (const pair of CSS_PAIRS) {
      const decls = cssRule(HOME_CSS, pair.sel);
      const surface = solid(tokens, SURFACE[pair.on]);
      const bg = colorOf(tokens, decls.get('background'), surface) ?? surface;
      const raw = pair.prop
        ? decls.get(pair.prop)
        : decls.get('color') ?? cssRule(HOME_CSS, pair.from).get('color');
      const fg = colorOf(tokens, raw, bg);
      const label = `${pair.sel}${pair.what ? ` (${pair.what})` : ''}`;
      assert.ok(fg, `${label}: không đọc được màu (${raw ?? 'không khai'})`);
      if (pair.kind === 'decor') {
        assert.ok(pair.why, `cặp "${label}" được miễn ngưỡng mà không viết lý do`);
        continue;
      }
      const ratio = contrast(fg, bg);
      if (ratio < NEED[pair.kind]) {
        bad.push(`${label}: ${ratio.toFixed(2)} < ${NEED[pair.kind]} (${fg} trên ${bg})`);
      }
    }
    assert.deepEqual(bad, [], `trượt AA:\n${bad.join('\n')}`);
  });
}

/**
 * ── BẰNG CHỨNG BẮT ĐƯỢC LỖI THẬT ──────────────────────────────────────
 * Đo ngày 15/10/2026: dựng lại bản cũ rồi chạy
 * `node --test e2e/unit/home-page.test.mjs`.
 *
 * Lượt 1 — dựng lại 7 chỗ của bản cũ cùng lúc: `rating: 4.8` trong catalog.ts,
 * khối "Đánh giá của học viên" (`<div className="star-avg">…`) ở CourseDetail,
 * `label: 'Python IDE'`, "trận Boss cuối chặng" trong mô tả khoá, mô tả công cụ
 * "chạy code Python ngay trong trình duyệt" + nhãn "Web Compiler", `.pill` 13px,
 * `.desc` 15px, và `import { apiFetch } from '@/lib/api'` ở page.tsx.
 * → 8 / 21 ca TRƯỢT: "không gọi API nào" · "điểm sao viết cứng" · "ô chấm sao" ·
 *   "Bàn thí nghiệm, không phải IDE" · "không đánh trận" · "nói thật về nơi chạy
 *   code" · "không cỡ chữ nào < 15px" · "mọi CÂU VĂN ở cỡ thân ≥ 17px".
 *
 * Lượt 2 — đổi màu trong CSS: nền nút chính `.nextCta` về `--edu-accent-3`
 * (chữ trắng 3,19:1) và nhãn `.tag` về đỏ-trên-đỏ-nhạt của bản cũ.
 * → 2 / 21 ca TRƯỢT: tương phản bản ngày và bản Ban đêm, in đúng hai dòng
 *   `.tag: 4.28 < 4.5` và `.nextCta: 3.19 < 4.5`. (Ca này đọc màu TỪ CSS nên nó
 *   bắt được cả lần đổi màu không đi qua bảng token.)
 */
