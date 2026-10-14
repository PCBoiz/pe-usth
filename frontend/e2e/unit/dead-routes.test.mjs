/**
 * Canh đợt dọn ROUTE CHẾT ngày 15/10/2026 — và canh nó theo hai chiều.
 *
 * ── Vì sao có file này ────────────────────────────────────────────────────
 * Sản phẩm đã thu về MỘT khoá (`python_advanced`) cộng Bàn thí nghiệm `/ide`.
 * Nhưng bốn trang cũ vẫn mở được bằng đường dẫn trực tiếp và vẫn vẽ huy hiệu
 * "0 ngày · Học ngay để giữ chuỗi" / "0 Ngày liên tiếp!" — trong khi chuỗi ngày
 * đã bị gỡ khỏi trang bài học thật (commit 330a469). Người dùng gõ trúng URL
 * thì thấy sản phẩm tự nói ngược mình, và đó là loại lỗi không ai phát hiện
 * bằng cách dùng thử bình thường vì không có lối vào nào dẫn tới đó.
 *
 * ── Hai chiều, vì chiều nào thiếu cũng sai ───────────────────────────────
 *  1. ĐÃ XOÁ thì phải xoá hẳn: route, component chỉ phục vụ nó, và file JS/CSS
 *     legacy mà sau khi xoá không còn trang nào nạp. Để lại file thì lần sau
 *     có người "dọn dở" sẽ nạp lại nó.
 *  2. BỐN TRANG SỐNG phải còn: `/`, `/courses/[courseId]`, `/lesson/python_advanced`,
 *     `/ide`. Ca này là cái phanh — nếu đợt dọn sau quét quá tay thì trượt ở
 *     đây chứ không phải ở buổi dùng thử.
 *
 * ── Cơ chế "miễn có khai báo lý do" ──────────────────────────────────────
 * Ca chữ nghĩa chỉ soi MÃ CHẠY (đã bỏ chú thích). Chú thích được phép nhắc tới
 * streak/chuỗi ngày — phải được phép, vì chỗ đã gỡ cần để lại lời giải thích
 * "vì sao gỡ" cho người đọc sau (xem LessonChrome.tsx, LessonDbDesign.tsx).
 * Cần miễn một chỗ trong MÃ thì thêm vào `ALLOW` kèm lý do viết thành câu.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const at = (...p) => join(FE, ...p);

/** Bỏ chú thích khối, chú thích `//` cả dòng và `//` cuối dòng.
 *  `[ \t]+//` chứ không phải `//` trần: `https://` có dấu hai chấm ngay trước
 *  nên không bị cắt (cùng cách làm với ds-wording/ds-type-scale). */
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');

/* ── 1 · route và component chỉ phục vụ nó: không còn file ───────────────── */

/**
 * Mỗi dòng: đường dẫn + vì sao nó CHẾT (không link nào trong src/** trỏ tới, và
 * khoá tương ứng không có trong src/lib/catalog.ts).
 */
const REMOVED = [
  [['src', 'app', '(standalone)', 'lesson', 'python'],
    'khoá `python` cơ bản đã rời danh mục; seed-courses.js nay dựng nó RỖNG'],
  [['src', 'app', '(standalone)', 'lesson', 'java'],
    'khoá `java` rời danh mục 13/10/2026; trang còn vẽ huy hiệu "giữ chuỗi"'],
  [['src', 'app', '(standalone)', 'lesson', 'htmlcss'],
    'khoá `htmlcss` rời danh mục 13/10/2026; cùng huy hiệu "giữ chuỗi"'],
  [['src', 'app', '(standalone)', 'interface'],
    'mission "Cứu nguy Robot" của khoá `cpp`; vẽ "0 Ngày liên tiếp!"'],
  [['src', 'components', 'Chatbot.tsx'],
    'chỉ /lesson/java và /lesson/htmlcss dựng hộp chat này'],
  [['src', 'components', 'python-studio', 'PythonStudio.tsx'],
    'studio dựng tay cho bài demo ?demo=list, chỉ mở được từ /lesson/python'],
  [['src', 'components', 'python-studio', 'studio-ui.tsx'],
    'chỉ PythonStudio.tsx dùng (Card/Choice/Code/Icon/Stepper + hình Figma)'],
  [['src', 'components', 'python-studio', 'studio.module.css'],
    'CSS riêng của PythonStudio.tsx + studio-ui.tsx'],
  [['src', 'lib', 'python-studio.ts'],
    'đề bài/lời giải viết cứng của bài demo ?demo=list'],
];

test('route chết và component chỉ phục vụ nó đã xoá hẳn khỏi src/**', () => {
  const back = [];
  for (const [p, why] of REMOVED) {
    if (existsSync(at(...p))) back.push(`${p.join('/')} — ${why}`);
  }
  assert.deepEqual(back, [], `những thứ này đã dọn 15/10/2026 mà lại có mặt:\n${back.join('\n')}`);
});

/* ── 2 · file legacy trong public/static không còn ai nạp ────────────────── */

/**
 * Chỉ gồm file mà loader DUY NHẤT là một trong bốn trang đã xoá — đã grep từng
 * file trước khi xoá (`LegacyScripts`/`PageStyles` là hai chỗ nạp duy nhất).
 * `chatbot.css` KHÔNG có trong danh sách: ba trang /courses/db_design* còn nạp.
 */
const REMOVED_STATIC = [
  ['public', 'static', 'js', 'main.js'],
  ['public', 'static', 'js', 'chatbot.js'],
  ['public', 'static', 'js', 'python-studio.worker.js'],
  ['public', 'static', 'js', 'pages', 'lesson-topbar.hydrate.js'],
  ['public', 'static', 'js', 'pages', 'lesson_java.inline.js'],
  ['public', 'static', 'js', 'pages', 'lesson_java.tailwind.js'],
  ['public', 'static', 'js', 'pages', 'lesson_htmlcss.inline.js'],
  ['public', 'static', 'js', 'pages', 'lesson_htmlcss.tailwind.js'],
  ['public', 'static', 'js', 'pages', 'interface.inline.js'],
  ['public', 'static', 'js', 'pages', 'interface.tailwind.js'],
  ['public', 'static', 'css', 'lesson.css'],
  ['public', 'static', 'css', 'edu-lesson.css'],
  ['public', 'static', 'css', 'pages', 'lesson_java.inline.css'],
  ['public', 'static', 'css', 'pages', 'lesson_htmlcss.inline.css'],
  ['public', 'static', 'css', 'pages', 'interface.inline.css'],
  ['public', 'static', 'python-studio'],
];

test('file JS/CSS legacy không còn trang nào nạp đã xoá khỏi public/static', () => {
  const back = REMOVED_STATIC.filter((p) => existsSync(at(...p))).map((p) => p.join('/'));
  assert.deepEqual(back, [], `file legacy đã dọn mà lại có mặt: ${back.join(', ')}`);
});

/* ── 3 · không chỗ nào trong src/** còn trỏ tới thứ đã xoá ───────────────── */

/** Mọi file nguồn của frontend (bỏ JSON dữ liệu — curricula.json là bảng bài học). */
function sources(dir = at('src')) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { out.push(...sources(full)); continue; }
    if (/\.(ts|tsx|css|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

const SOURCES = sources().map((f) => [relative(FE, f).split(sep).join('/'), readFileSync(f, 'utf8')]);

test('src/** không còn nạp hay dẫn tới route/asset đã xoá', () => {
  // Chuỗi nào cũng là ĐƯỜNG DẪN thật; tìm trong mã chạy (chú thích được phép
  // nhắc tên chúng để kể lại chuyện đã xoá).
  const GONE = [
    '/static/js/main.js',
    '/static/js/chatbot.js',
    '/static/js/python-studio.worker.js',
    '/static/js/pages/lesson-topbar.hydrate.js',
    '/static/js/pages/lesson_java',
    '/static/js/pages/lesson_htmlcss',
    '/static/js/pages/interface',
    '/static/css/lesson.css',
    '/static/css/edu-lesson.css',
    '/static/css/pages/lesson_java',
    '/static/css/pages/lesson_htmlcss',
    '/static/css/pages/interface',
    '/static/python-studio/',
    '@/components/Chatbot',
    '@/lib/python-studio',
    'python-studio/PythonStudio',
    './studio-ui',
    './studio.module.css',
  ];
  const offenders = [];
  for (const [path, raw] of SOURCES) {
    const code = stripComments(raw);
    for (const needle of GONE) {
      if (code.includes(needle)) offenders.push(`${path}: còn ${needle}`);
    }
  }
  assert.deepEqual(offenders, [], `trỏ tới thứ đã xoá:\n${offenders.join('\n')}`);
});

test('/lesson/[courseId] không còn chuyển hướng sang /interface', () => {
  const code = stripComments(
    readFileSync(at('src', 'app', '(standalone)', 'lesson', '[courseId]', 'page.tsx'), 'utf8'),
  );
  assert.ok(!code.includes('/interface'), 'vẫn còn bảng LESSON_URLS đẩy khoá cpp sang /interface đã xoá');
  assert.ok(!/\bcpp\b/.test(code), 'vẫn còn nhánh riêng cho khoá cpp — khoá đó không còn trang nào');
});

/* ── 4 · chữ nghĩa: không còn chuỗi ngày trên bề mặt sản phẩm ───────────── */

/**
 * Miễn trừ trong MÃ CHẠY. Rỗng là đúng: hiện không chỗ nào trong src/** cần
 * nhắc chuỗi ngày trong mã. Thêm thì phải có lý do viết thành câu — và nhớ
 * rằng chú thích vốn đã được phép, nên đừng dùng danh sách này để lách.
 * Dạng mỗi dòng: [đường-dẫn-tương-đối, chuỗi bị cấm, lý do].
 */
const ALLOW = [];

/**
 * Bốn chuỗi này là CHỮ HIỆN RA, không phải tên biến nội bộ:
 *   · "giữ chuỗi"      — "Học ngay để giữ chuỗi" (/lesson/java, /lesson/htmlcss)
 *   · "ngày liên tiếp" — "0 Ngày liên tiếp!" (/interface)
 *   · "🔥 ngày"        — pill chuỗi ngày ở thanh trên cùng
 *   · "streak"         — gồm cả `USER_STREAK`, `#streak-count`, `.streak-overlay`:
 *                        tên nào còn trong mã thì vẫn còn một mảnh tính năng đó.
 * KHÔNG cấm "chuỗi ngày" trần: sản phẩm có chỗ nói THẲNG là mình không dùng
 * chuỗi ngày ("không xếp hạng, không chuỗi ngày") — câu phủ định đó phải sống.
 */
const BANNED = [
  [/giữ\s+chuỗi/iu, 'huy hiệu "Học ngay để giữ chuỗi"'],
  [/ngày\s+liên\s+tiếp/iu, 'huy hiệu "0 Ngày liên tiếp!"'],
  [/🔥\s*ngày/iu, 'pill 🔥 + số ngày'],
  [/streak/iu, 'tên biến/id/lớp CSS còn sót của chuỗi ngày'],
];

test('mã chạy trong src/** không còn mảnh nào của chuỗi ngày (streak)', () => {
  const offenders = [];
  for (const [path, raw] of SOURCES) {
    const code = stripComments(raw);
    for (const [rx, what] of BANNED) {
      const hit = code.match(rx);
      if (!hit) continue;
      if (ALLOW.some(([p, s]) => p === path && hit[0].toLowerCase().includes(s.toLowerCase()))) continue;
      offenders.push(`${path}: "${hit[0]}" — ${what}`);
    }
  }
  assert.deepEqual(
    offenders, [],
    'chuỗi ngày đã gỡ khỏi sản phẩm (commit 330a469); những chỗ này dựng lại nó:\n'
    + offenders.join('\n'),
  );
});

/* ── 5 · phanh: bốn trang sống không được dọn lây ────────────────────────── */

const ALIVE = [
  [['src', 'app', 'page.tsx'], 'trang chủ'],
  [['src', 'app', '(standalone)', 'courses', '[courseId]', 'page.tsx'], '/courses/python_advanced'],
  [['src', 'app', '(standalone)', 'lesson', 'python_advanced', 'page.tsx'], 'trang bài học'],
  [['src', 'app', 'ide', 'page.tsx'], 'Bàn thí nghiệm /ide'],
  [['src', 'components', 'python-studio', 'StudioLesson.tsx'], 'bộ dựng 48 bài'],
  [['src', 'components', 'python-studio', 'studio-chrome.module.css'], 'CSS của 48 bài'],
];

test('bốn trang sống (và bộ dựng bài) vẫn còn — đợt dọn sau không được quét lây', () => {
  const missing = ALIVE.filter(([p]) => !existsSync(at(...p)))
    .map(([p, why]) => `${p.join('/')} (${why})`);
  assert.deepEqual(missing, [], `trang/đường sống bị xoá: ${missing.join(', ')}`);
});

/**
 * ── BẰNG CHỨNG BẮT ĐƯỢC LỖI THẬT (đã CHẠY, không phải suy ra) ───────────
 * Không dùng `git stash`/`git checkout <thư mục>`: có agent khác đang làm trong
 * cùng cây làm việc. Cách đo: `git show HEAD:<file> > <file>` cho đúng từng
 * file, chạy lại file test này, rồi đưa bản sửa về chỗ.
 *
 *  · Dựng lại 9 đường dẫn ở `REMOVED` (4 route + 5 component/lib)
 *    → 3/6 ca trượt: ca 1 (file trở lại), ca 3 (src/** nạp lại
 *      main.js · chatbot.js · lesson-topbar.hydrate.js · python-studio.worker.js
 *      · lesson.css · edu-lesson.css · 3 cặp pages/*.inline.*),
 *      ca "chuỗi ngày" ("Học ngay để giữ chuỗi" ở java + htmlcss,
 *      "0 Ngày liên tiếp!" + #streak-plain ở interface).
 *  · Dựng lại 7 file static đại diện (main.js, chatbot.js,
 *    python-studio.worker.js, lesson-topbar.hydrate.js, lesson.css,
 *    edu-lesson.css, python-studio/s3-stepper-check.svg)
 *    → 1/6 ca trượt: ca 2.
 *  · Trả 4 file GIỮ LẠI về bản HEAD (LessonDbDesign.tsx, layout.tsx,
 *    CourseDbDesign.tsx, lesson/[courseId]/page.tsx)
 *    → 2/6 ca trượt: ca "/interface" và ca "chuỗi ngày" (#streak-count,
 *      .streak-fire, "giữ chuỗi streak 🔥", .streak-overlay, USER_STREAK).
 *  · Phanh ở ca 5: thêm một đường dẫn không tồn tại vào `ALIVE`
 *    → 1/6 ca trượt (đúng ca 5), rồi gỡ đường dẫn đó ra.
 *
 * Gỡ TOÀN BỘ bản sửa thì hợp của ba mẻ trên = 5 TRONG 6 CA TRƯỢT (ca 5 là
 * phanh cho chiều ngược lại nên nó vẫn xanh — đó là đúng).
 */
