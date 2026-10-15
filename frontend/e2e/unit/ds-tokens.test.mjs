/**
 * Unit test NỐI DÂY: màu của trang bài học phải đi qua BẢNG TOKEN v2, và mọi
 * cặp chữ/nền thật phải đạt WCAG AA.
 *
 * Vì sao phải có. Bản thiết kế v2 (rà 9 artboard ngày 14/10/2026) đếm được
 * **66 mã hex + 26 giá trị rgba** trong khi bảng token chỉ khai 8 màu — tức
 * bảng token đã có nhưng không ai bị buộc dùng nó. Trang bài học thật cũng
 * cùng bệnh ở mức nhẹ hơn: màu nằm rải trong `studio-tokens.css` (23 hex +
 * 23 rgba) và còn hai giá trị màu viết thẳng trong TSX/CSS module. Khi màu
 * không có một nguồn duy nhất thì hai thứ xảy ra, cả hai đều lặng lẽ:
 *   1. màu mới mọc thêm (ai cũng chỉ thêm "một sắc nữa thôi"), và
 *   2. tương phản tụt dưới ngưỡng AA mà không ai đo.
 * Lần sửa này gom hết về `--ds-*` và đo lại 127 cặp. Test giữ cả hai việc đó.
 *
 * Cách kiểm: ĐỌC MÃ NGUỒN, giống các ca NỐI DÂY ở `lesson-chrome-no-streak`
 * và `ide-reload`. Bộ test là `node --test` thuần, không có React renderer
 * lẫn trình duyệt để lấy computed style — mà cái cần chốt ("không file nào
 * viết màu ngoài bảng", "bảng cho ra đủ tương phản") đo được từ nguồn.
 *
 * Phép đo tương phản nằm ở `./ds-contrast.mjs` (hàm thuần, chạy tay được:
 * `node e2e/unit/ds-contrast.mjs`).
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  audit,
  colorLiterals,
  contrast,
  cssBlocks,
  cssCode,
  cssRules,
  CSS_NAMED_COLORS,
  declList,
  EXEMPT,
  PAIRS,
  readTokens,
  TOKEN_SELECTORS,
  winningDecl,
} from './ds-contrast.mjs';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO = join(FE, '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

const TOKENS_PATH = ['public', 'static', 'css', 'studio-tokens.css'];
const TOKENS_CSS = read(...TOKENS_PATH);

/** Bản thiết kế, đọc từ REPO — xem design-refs.test.mjs: nó nằm trong repo. */
const DESIGN_DOC = readFileSync(join(REPO, 'design-system-v2.md'), 'utf8');
/** Bỏ chú thích JS/TS. */
const tsCode = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');

/* ── 1 · bảng token phải khớp ĐÚNG bản thiết kế ───────────────────────── */

/**
 * Bảng màu ĐỌC TỪ `design-system-v2.md` — khối CSS ở mục 1.3 — chứ không chép
 * tay vào đây nữa.
 *
 * Bản cũ chép tay, với lý do viết kèm: "bản thiết kế là file NGOÀI repo, nên
 * nếu không chốt con số vào test thì 'khớp bản thiết kế' chỉ là lời nói". Lý
 * do đó hết đúng từ `4f556c8` — tài liệu nay nằm ở gốc repo. Và chép tay có
 * giá: đổi bảng màu phải sửa hai chỗ, mà chỗ nào quên thì test đỏ với thông
 * báo "không khớp bản thiết kế" trong khi sự thật là chính test đang lạc hậu.
 * Đã trả giá đúng vậy ngày 15/10 khi chủ sản phẩm chốt quay về bảng xanh–đỏ.
 *
 * Nay một nguồn: tài liệu. Test canh CSS khớp tài liệu, không canh CSS khớp
 * một bản sao của tài liệu.
 */
function paletteFromDesignDoc() {
  const md = readFileSync(join(FE, '..', 'design-system-v2.md'), 'utf8');
  const khoi = /```css\s*([\s\S]*?)```/.exec(md);
  if (!khoi) throw new Error('design-system-v2.md không còn khối CSS bảng màu');
  const doc = khoi[1];
  const i = doc.indexOf('[data-theme="dark"]');
  if (i < 0) throw new Error('khối CSS thiếu bộ Ban đêm');
  const doc_doc = (s) => {
    const ra = {};
    for (const m of s.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})/g)) {
      ra[`--ds-${m[1]}`] = m[2].toUpperCase();
    }
    return ra;
  };
  return { light: doc_doc(doc.slice(0, i)), dark: doc_doc(doc.slice(i)) };
}

const DESIGN = paletteFromDesignDoc();
const DESIGN_LIGHT = DESIGN.light;
const DESIGN_DARK = DESIGN.dark;

test('bảng token v2 khai đúng từng mã màu bản thiết kế chốt (bản ngày)', () => {
  const { light } = readTokens(TOKENS_CSS);
  for (const [name, want] of Object.entries(DESIGN_LIGHT)) {
    assert.equal(
      light[name]?.toUpperCase(), want,
      `${name} phải là ${want} theo design-system-v2 §1.3, đang là ${light[name]}`,
    );
  }
});

test('bảng token v2 khai đúng bộ Ban đêm (chỗ bản thiết kế bắt lỗi tương phản)', () => {
  const { dark } = readTokens(TOKENS_CSS);
  for (const [name, want] of Object.entries(DESIGN_DARK)) {
    assert.equal(
      dark[name]?.toUpperCase(), want,
      `${name} ở bản đêm phải là ${want}, đang là ${dark[name]}`,
    );
  }
  // Chốt riêng hai cặp mà bản thiết kế chỉ đích danh là TRƯỢT ở bản cũ:
  // link và vòng "Bạn ở đây" dùng tím bản NGÀY trên nền đêm.
  assert.ok(
    contrast(dark['--ds-violet'], dark['--ds-page']) >= 4.5,
    'tím bản đêm trên nền đêm phải ≥ 4,5:1 (bản cũ dùng #6E2BA8 → 2,28:1)',
  );
  assert.ok(
    contrast(dark['--ds-on-action'], dark['--ds-action']) >= 4.5,
    'chữ trên nút chính ở bản đêm phải ≥ 4,5:1',
  );
});

test('mọi màu trong bảng token đều là mã hex 6 chữ số, không có màu mồ côi', () => {
  const { light, dark } = readTokens(TOKENS_CSS);
  const names = new Set([...Object.keys(light), ...Object.keys(dark)]);
  for (const n of names) {
    if (!n.startsWith('--ds-')) continue;
    assert.match(light[n] ?? '', /^#[0-9A-Fa-f]{6}$/, `${n} không phải mã hex 6 chữ số`);
  }
  // Mọi --ds-* khai ở bản đêm phải có bản ngày tương ứng, nếu không thì bản
  // ngày thiếu màu và trang rơi về giá trị thừa hưởng không ai định.
  for (const n of Object.keys(DESIGN_DARK)) {
    assert.ok(light[n], `${n} có ở bản đêm nhưng thiếu ở bản ngày`);
  }
});

/* ── 2 · không còn mã màu nào NGOÀI bảng token ────────────────────────── */

/**
 * Mọi file vẽ nên BỀ MẶT ĐÃ CHUYỂN sang bảng v2 (trừ vùng của agent khác).
 *
 * 15/10/2026 — thêm `app/home.module.css` và `components/SiteHeader.module.css`.
 * Trang chủ và thanh đầu trang trước đó còn ở bảng xanh dương --edu-*, tức sản
 * phẩm có hai nguồn màu: vào trang chủ thấy nền xanh, bấm vào bài thấy nền kem.
 * Đưa hai file vào đây để chúng chịu đúng ba luật của trang bài học: không mã
 * màu, không đọc --edu-* (trừ --edu-font), không hạ độ đục để làm nhạt.
 *
 * 15/10/2026 (lượt sau) — thêm `components/CourseShell.module.css`. Trang khoá
 * là bề mặt cuối cùng còn ở bảng xanh: nó không vẽ bằng CSS module mà bằng lớp
 * TOÀN CỤC `.edu-cd-*` / `.cd-block*` của hai file legacy nạp qua <link>. Nay
 * markup đã chuyển sang lớp CSS module (tên băm, không selector legacy nào
 * khớp được) và cả phần vẽ nằm trong file này, nên nó chịu đúng ba luật trên.
 * Xem ghi chú ở cuối file.
 */
const SURFACE_CSS = [
  ['src', 'app', 'home.module.css'],
  ['src', 'components', 'SiteHeader.module.css'],
  ['src', 'components', 'CourseShell.module.css'],
  // 15/10/2026 — bỏ `python-studio/studio.module.css`: file đó chỉ vẽ trang demo
  // `/lesson/python?demo=list` (PythonStudio.tsx), và cả route lẫn component đã
  // xoá trong đợt dọn route chết, nên đọc file là ném ENOENT.
  ['src', 'components', 'python-studio', 'studio-chrome.module.css'],
  ['src', 'components', 'lesson-chrome', 'LessonChrome.module.css'],
  ['src', 'components', 'lesson-chrome', 'LessonBrief.module.css'],
  ['src', 'components', 'lesson-chrome', 'ShellA.module.css'],
  ['src', 'components', 'lesson-chrome', 'ShellB.module.css'],
  ['src', 'components', 'lesson-chrome', 'TryItButton.module.css'],
  ['src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css'],
];

function surfaceSources() {
  const out = [];
  for (const dir of [
    ['src', 'components', 'lesson-chrome'],
    ['src', 'components', 'lesson-chrome', 'exercises'],
    ['src', 'components', 'python-studio'],
    ['src', 'components', 'python-studio', 'screens'],
    ['src', 'components', 'python-studio', 'screens', 'games'],
  ]) {
    for (const name of readdirSync(join(FE, ...dir))) {
      if (/\.tsx?$/.test(name)) out.push([...dir, name]);
    }
  }
  return out;
}

test('*.module.css của trang bài học không viết mã màu nào (chỉ var(--…))', () => {
  // `colorLiterals` (ds-contrast.mjs) quét GIÁ TRỊ của từng khai báo, nên nó
  // thấy cả ba họ mà bản cũ bỏ sót và lượt đột biến chứng minh là bỏ sót:
  // tên màu CSS (`magenta`, `white`), `oklch()`/`lab()`, và tên màu nằm trong
  // `color-mix()`. Bản cũ chỉ grep `#hex` + `rgb(`/`hsl(` trên cả file.
  for (const p of SURFACE_CSS) {
    const found = colorLiterals(read(...p));
    assert.deepEqual(found, [], `${p.join('/')} còn mã màu viết cứng: ${found.join(' ')}`);
  }
});

test('TSX của trang bài học không viết mã màu nào (chỉ var(--…))', () => {
  const offenders = [];
  for (const p of surfaceSources()) {
    const code = tsCode(read(...p));
    const hex = code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    // Cùng họ hàm màu như bên CSS: `oklch(0.5 0.2 300)` cũng là một màu viết
    // cứng, chỉ là bản cũ không biết tên hàm đó.
    const fn = code.match(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|device-cmyk)\([^)]*\)/gi) ?? [];
    // Tên màu CSS trong TSX chỉ xét khi nó là MỘT chuỗi trọn vẹn (`'white'`):
    // quét từ trần trong TSX là dương tính giả ngay (biến `red`, chữ trong câu
    // tiếng Anh, tên lớp `.orange`).
    const named = [...code.matchAll(/'([A-Za-z]+)'|"([A-Za-z]+)"/g)]
      .map((m) => m[1] ?? m[2])
      .filter((w) => CSS_NAMED_COLORS.has(w.toLowerCase()));
    if (hex.length || fn.length || named.length) {
      offenders.push(`${p.join('/')}: ${[...hex, ...fn, ...named].join(' ')}`);
    }
  }
  assert.deepEqual(offenders, [], `màu viết thẳng trong TSX:\n${offenders.join('\n')}`);
});

test('chỉ :root và body.dark được khai token --ds-* — không có chế độ thứ ba lặng lẽ', () => {
  // Đột biến C4 ghi đè `--ds-ink` trong `[data-theme="dark"]` và CẢ 14 ca vẫn
  // xanh: bộ đọc chỉ biết hai selector, nên một chế độ chủ đề thứ ba vừa
  // KHÔNG được đo tương phản, vừa có thể thắng cascade trên trang thật. Luật
  // ở đây là luật đọc được: muốn thêm chế độ thì phải thêm vào
  // TOKEN_SELECTORS và PAIRS cùng lúc, chứ không thêm lặng lẽ vào CSS.
  const la = [];
  for (const r of cssRules(TOKENS_CSS)) {
    if (!declList(r.body).some((d) => d.prop.startsWith('--ds-'))) continue;
    const sels = r.prelude.split(',').map((x) => x.trim());
    for (const sel of sels) {
      if (!TOKEN_SELECTORS.includes(sel)) la.push(`${[...r.at, sel].join(' › ')}`);
    }
  }
  assert.deepEqual(
    la, [],
    'khối lạ khai token bảng v2 — chế độ này không được đo tương phản:\n' + la.join('\n'),
  );
});

test('trang bài học không còn đọc token màu của bảng cũ (--edu-* trừ --edu-font)', () => {
  const offenders = [];
  for (const p of [...SURFACE_CSS, ...surfaceSources()]) {
    const code = p[p.length - 1].endsWith('.css') ? cssCode(read(...p)) : tsCode(read(...p));
    for (const m of code.matchAll(/--edu-[\w-]+/g)) {
      if (m[0] !== '--edu-font') offenders.push(`${p.join('/')}: ${m[0]}`);
    }
  }
  assert.deepEqual(
    offenders, [],
    'còn token của bảng xanh dương kế thừa từ bản Django — bảng v2 nằm ở --ds-*:\n'
    + offenders.join('\n'),
  );
});

test('mọi var(--ds-…) được dùng đều đã khai trong bảng token', () => {
  const { light } = readTokens(TOKENS_CSS);
  const declared = new Set(Object.keys(light));
  // Các thang KHÔNG PHẢI MÀU (cỡ chữ, bo góc, nét viền, chuyển động, độ nổi)
  // cũng mang tiền tố --ds-*, nhưng `readTokens` chỉ đọc mã màu nên phải quét
  // thêm. Trước đây chỗ này liệt kê tay `--ds-fs-*` + `--ds-shadow-open`; khi
  // bảng mọc thêm thang bo góc thì mọi `var(--ds-r-md)` hợp lệ lại bị báo là
  // "token chưa khai". Quét theo KHAI BÁO trong chính bảng token, đừng kể tên.
  for (const m of cssCode(TOKENS_CSS).matchAll(/(--ds-[\w-]+)\s*:/g)) declared.add(m[1]);

  const missing = new Set();
  for (const p of [...SURFACE_CSS, ...surfaceSources()]) {
    const code = p[p.length - 1].endsWith('.css') ? cssCode(read(...p)) : tsCode(read(...p));
    for (const m of code.matchAll(/--ds-[\w-]+/g)) {
      if (!declared.has(m[0])) missing.add(`${p.join('/')}: ${m[0]}`);
    }
  }
  assert.deepEqual([...missing], [], `token chưa khai (trang sẽ không có màu):\n${[...missing].join('\n')}`);
});

/* ── 3 · NỐI DÂY: danh sách cặp đo phải khớp CSS đang chạy ─────────────
   Đây là mắt yếu của mọi bộ đo tương phản viết tay: `PAIRS` nói ".lineNum
   dùng --ds-code-num" nhưng không gì buộc CSS phải thật như thế. Đổi CSS mà
   quên đổi `PAIRS` thì cả hai ca ở mục 4 vẫn xanh trong khi trang đã trượt.
   Đo ngày 15/10/2026: gỡ ba bản sửa dưới đây ra mà KHÔNG có mục này thì
   không ca nào bắt được. Bảng dưới chốt đúng những chỗ load-bearing. */

const WIRING = [
  // [file, lớp, thuộc tính, token phải thấy, vì sao]
  [['src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css'],
    '.lineNum', 'color', '--ds-code-num',
    'màu cũ là --st-code-gutter (rgba trắng 0,28) → 2,3:1 trên nền code'],
  [['src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css'],
    '.optionCard', 'border', '--ds-sketch',
    'viền của thứ bấm được; `line` chỉ 1,36:1'],
  [['src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css'],
    '.toggleBtn', 'border', '--ds-sketch', 'như .optionCard'],
  [['src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css'],
    '.chip', 'border', '--ds-sketch', 'như .optionCard'],
  [['src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css'],
    '.optionRadio', 'border', '--ds-sketch', 'ô tròn chọn là đồ hoạ mang thông tin'],
  [['src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css'],
    '.blank', 'border', '--ds-mark-violet',
    'ô trống nằm trong khung code (nền tối) nên phải dùng bản -on-dark'],
  [['src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css'],
    '.toggleIcon', 'background', '--ds-soft', 'chữ trắng trên `sketch` chỉ 4,32:1'],
  [['src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css'],
    '.consoleRowOk', 'color', '--ds-mark-ochre', 'nền là khung code, không phải thẻ sáng'],
  [['src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css'],
    '.consoleRowErr', 'color', '--ds-mark-sanguine', 'như .consoleRowOk'],
  [['src', 'components', 'lesson-chrome', 'LessonChrome.module.css'],
    '.primaryBtn', 'background', '--ds-action', '--ds-action chỉ có một vai: nền nút chính'],
  [['src', 'components', 'lesson-chrome', 'LessonChrome.module.css'],
    '.primaryBtn', 'color', '--ds-on-action', 'phải đọc được ở CẢ hai chế độ'],
  [['src', 'components', 'lesson-chrome', 'LessonChrome.module.css'],
    '.secondaryBtn', 'border', '--ds-ink', 'bản thiết kế chốt nút phụ = viền ink 2px'],
  [['src', 'components', 'lesson-chrome', 'LessonChrome.module.css'],
    '.segmentFill', 'background', '--ds-ink', 'đoạn đã xong'],
  [['src', 'components', 'lesson-chrome', 'ShellA.module.css'],
    '.dot', 'background', '--ds-sketch', '`desk` chỉ 1,24:1 trên thẻ'],
  [['src', 'components', 'lesson-chrome', 'ShellB.module.css'],
    '.hintToggle', 'border', '--ds-sketch', 'nút bấm được'],
  [['src', 'components', 'python-studio', 'studio-chrome.module.css'],
    '.theoryFigureToggle', 'border', '--ds-sketch', 'nút bấm được'],
  [['src', 'components', 'python-studio', 'studio-chrome.module.css'],
    '.theoryFigureOff', 'border', '--ds-sketch', 'nét đứt mang thông tin "hình đang tắt"'],

  // ── trang chủ + thanh đầu trang (15/10/2026)
  [['src', 'app', 'home.module.css'],
    '.page', 'background', '--ds-page',
    'nền xanh của trang chủ do `body` trong edu-theme.css vẽ; không đặt nền ở '
    + '.page thì đổi hết token vẫn ra thẻ kem trên nền xanh'],
  [['src', 'app', 'home.module.css'],
    '.card', 'border', '--ds-sketch',
    'thẻ khoá là <a> bấm được; `line` chỉ 1,36:1 trên nền thẻ'],
  [['src', 'app', 'home.module.css'],
    '.next', 'background', '--ds-ink',
    'bản thiết kế §1.4: khối hệ thống gợi ý có nền `ink`, chữ `page` — cặp này '
    + 'tự đảo theo bản nền nên không phải khai riêng cho chế độ tối'],
  [['src', 'app', 'home.module.css'],
    '.nextCta', 'color', '--ds-on-action',
    'bản cũ viết cứng `white`: ở bản đêm nền nút sáng lên, chữ trắng còn 3,19:1'],
  [['src', 'app', 'home.module.css'],
    '.note', 'border', '--ds-sketch',
    'khối ghi chú trung thực = nét đứt `sketch` 2px trên nền `paper`'],
  [['src', 'app', 'home.module.css'],
    '.feedbackButton', 'border', '--ds-ink', 'nút phụ = viền ink 2px'],
  [['src', 'components', 'SiteHeader.module.css'],
    '.fullBar', 'background', '--ds-paper',
    'thanh đầu trang chủ: nền `paper`. Bản cũ --edu-nav-bg là trắng 72% trên '
    + 'nền xanh dương'],
  [['src', 'components', 'SiteHeader.module.css'],
    '.theme', 'border', '--ds-ink',
    'nút icon theo bản thiết kế §1.4 là viền `ink` 2px; bản cũ dùng viền trắng '
    + '85% nên gần như không thấy'],

  // ── trang khoá /courses/[courseId] (15/10/2026)
  // Đã ĐO thác đổ trên trang thật trước khi sửa (DevTools, duyệt
  // document.styleSheets + el.matches). Mỗi dòng dưới đây là một khối mà phép
  // đo đó chỉ ra đang bị một file LEGACY tô màu xanh dương.
  [['src', 'components', 'CourseShell.module.css'],
    '.page', 'background', '--ds-page',
    'nền xanh của trang khoá do `body` trong edu-theme.css vẽ (mesh ba quầng '
    + '--edu-bg-image). Không đặt nền ở `.page` thì đổi hết token vẫn ra thẻ '
    + 'kem trên nền xanh — đúng lỗi đã gặp ở trang chủ'],
  [['src', 'components', 'CourseShell.module.css'],
    '.lesson', 'border', '--ds-sketch',
    'mỗi bài là một <a> bấm được. Quy tắc thắng cũ là `.edu-cd-lesson` của '
    + 'edu-course-detail.css, viền --edu-input-border = trắng 90% trên nền '
    + 'trắng 60%, tức gần như không có viền'],
  [['src', 'components', 'CourseShell.module.css'],
    '.lessonIconDone', 'background', '--ds-ink',
    'bản thiết kế §1.4 "Nút trạng thái bài": đã xong = nền `ink` + dấu tích '
    + '`page`. Bản cũ nền xanh lá #22c55e với `color: white !important` — màu '
    + 'code cứng không đảo theo bản nền, và bảng v2 không có xanh lá'],
  [['src', 'components', 'CourseShell.module.css'],
    '.btnPrimary', 'background', '--ds-action',
    '--ds-action chỉ có một vai: nền nút chính. Bản cũ là --edu-accent-grad '
    + '(gradient xanh) + box-shadow quầng xanh'],
  [['src', 'components', 'CourseShell.module.css'],
    '.btnPrimary', 'color', '--ds-on-action',
    'bản cũ viết cứng `color:#fff`; ở bản đêm nền nút sáng lên nên chữ trắng '
    + 'tụt dưới ngưỡng'],
  [['src', 'components', 'CourseShell.module.css'],
    '.btnSecondary', 'border', '--ds-ink', 'bản thiết kế chốt nút phụ = viền ink 2px'],
  [['src', 'components', 'CourseShell.module.css'],
    '.resumeCard', 'background', '--ds-ink',
    'bản thiết kế §1.4: khối hệ thống gợi ý có nền `ink`, chữ `page` — cặp này '
    + 'tự đảo theo bản nền nên không phải khai riêng cho chế độ tối'],
  [['src', 'components', 'CourseShell.module.css'],
    '.block', 'border', '--ds-line',
    'khối nội dung KHÔNG bấm được nên `line` là đúng vai. Quy tắc thắng cũ là '
    + 'hai dòng !important của edu-theme.css (`.section-card,…,.cd-block`) phủ '
    + 'sheen xanh/đỏ + backdrop-filter lên nó'],
  [['src', 'components', 'CourseShell.module.css'],
    '.blockIcon', 'background', '--ds-violet-tint',
    'ô icon tiêu đề mục; bản cũ --edu-accent-soft (xanh 10%) và bên trong là '
    + 'EMOJI trần, không đổi màu theo bản nền'],
  [['src', 'components', 'CourseShell.module.css'],
    '.outcomeDot', 'background', '--ds-violet',
    'chấm đầu dòng "Bạn sẽ học được"; bản cũ --edu-accent #2563eb'],
];

test('NỐI DÂY: những chỗ load-bearing dùng đúng token mà bảng đo giả định', () => {
  const offenders = [];
  for (const [path, cls, prop, token, why] of WIRING) {
    const css = read(...path);
    // Phải xét MỌI khối có lớp đó trong danh sách selector, không chỉ khối
    // `\.cls {` đứng một mình: `.dot, .dotActive { background: … }` mới là
    // chỗ khai nền của `.dot`, còn `.dot { width: 6px }` thì không.
    //
    // 15/10/2026 — và phải xét giá trị THẮNG, không phải "có tồn tại một khai
    // báo đúng". Hai đột biến đã đo: C14 nối `.lineNum{color:var(--ds-code-line)}`
    // ở CUỐI file, C15 đặt nền sai cho `.primaryBtn` trong
    // `@media (max-width:700px)` — cả hai đi qua bản cũ (`found.some(…)`),
    // trong khi trên trang thật chúng là quy tắc thắng. `cssRules` trả cả quy
    // tắc trong @media, `winningDecl` lấy khai báo sau cùng (và !important).
    // Chỉ lấy quy tắc của TRẠNG THÁI NGHỈ: selector ĐÚNG BẰNG lớp đó (kể cả
    // khi nằm trong danh sách `\.dot, \.dotActive {…}` hay trong `@media`).
    // `.primaryBtn:disabled` và `.segmentAhead .segmentFill` là trạng thái
    // KHÁC, chúng chỉ thắng khi trạng thái đó xảy ra, nên không được tính là
    // quy tắc thắng của nền mặc định — gộp chúng vào là dương tính giả.
    const bodies = cssRules(css)
      .filter((r) => r.prelude.split(',').map((x) => x.trim()).includes(cls))
      .map((r) => r.body);
    const win = winningDecl(bodies, prop);
    if (!win) { offenders.push(`${path.at(-1)} ${cls}: không thấy ${prop}`); continue; }
    if (!win.value.includes(`var(${token})`)) {
      offenders.push(`${path.at(-1)} ${cls} ${prop}: quy tắc THẮNG là "${win.value}" — phải là ${token} (${why})`);
    }
  }
  assert.deepEqual(offenders, [], `bảng đo và CSS lệch nhau:\n${offenders.join('\n')}`);
});

/**
 * Bí danh --st-* nay chỉ được trỏ vào --ds-*; viết lại mã màu ở đó là mở lại
 * đúng cái cửa mà lần này đi đóng. Bảng dưới cũng chốt VAI NGỮ NGHĨA: "ok" là
 * ochre (đã có), "err"/"warn" là sanguine (chú ý) — bảng v2 không có xanh lá.
 */
const ALIASES = {
  '--st-ok-bg': '--ds-ochre-tint',
  '--st-ok-text': '--ds-ochre',
  '--st-ok-line': '--ds-ochre',
  '--st-err-bg': '--ds-sanguine-tint',
  '--st-err-text': '--ds-sanguine',
  '--st-err-line': '--ds-sanguine',
  '--st-warn-bg': '--ds-sanguine-tint',
  '--st-warn-text': '--ds-sanguine',
  '--st-warn-line': '--ds-sanguine',
  '--st-code-bg': '--ds-code-bg',
  '--st-code-gutter': '--ds-code-line',
  '--st-syn-plain': '--ds-code-fg',
  '--st-syn-keyword': '--ds-code-kw',
  '--st-syn-string': '--ds-code-str',
  '--st-syn-comment': '--ds-code-num',
  '--st-page-bg': '--ds-page',
  '--st-track': '--ds-desk',
  '--st-predict-bg': '--ds-sanguine-tint',
  '--st-reflect-bg': '--ds-violet-tint',
  '--st-reflect-text': '--ds-violet-deep',
  '--st-slot-border': '--ds-violet',
  '--st-code-meta': '--ds-code-meta',
  '--st-code-bar': '--ds-code-line',
};

test('mọi token --st-* chỉ là bí danh trỏ vào --ds-*, không có mã màu riêng', () => {
  const decl = new Map();
  for (const m of cssCode(TOKENS_CSS).matchAll(/(--st-[\w-]+)\s*:\s*([^;]+);/g)) {
    decl.set(m[1], m[2].trim());
  }
  for (const [alias, target] of Object.entries(ALIASES)) {
    assert.equal(
      decl.get(alias), `var(${target})`,
      `${alias} phải là var(${target}) — đang là ${decl.get(alias)}`,
    );
  }
  // Và không bí danh nào còn viết mã màu.
  const hex = [...decl].filter(([, v]) => /#[0-9a-fA-F]{3,8}|rgba?\(/.test(v));
  assert.deepEqual(
    hex.map(([k, v]) => `${k}: ${v}`), [],
    'bí danh --st-* viết mã màu riêng — màu phải có một nguồn duy nhất',
  );
});

/* ── 4 · tương phản WCAG AA trên cặp chữ/nền THẬT ────────────────────── */

test('221 cặp chữ/nền thật: không cặp nào trượt AA ở bản ngày', () => {
  const { light } = readTokens(TOKENS_CSS);
  const rows = audit(light);
  const bad = rows.filter((r) => !r.pass);
  assert.deepEqual(
    bad.map((r) => `${r.label} = ${r.ratio.toFixed(2)} (cần ${r.need})`), [],
    'cặp trượt WCAG AA (chạy `node e2e/unit/ds-contrast.mjs` để xem cả bảng)',
  );
  // Chặn việc xoá cặp cho test xanh. Mốc này CHỈ ĐƯỢC HẠ khi selector thật sự
  // biến mất khỏi CSS — và ca "mọi nhãn còn trỏ vào selector có thật" bên dưới
  // mới là thứ phân biệt "dọn cặp chết" với "giấu cặp trượt".
  //
  // 15/10: hạ 219 → 216 sau khi gỡ ba cặp đo vào selector đã xoá cùng đợt cắt
  // văn kể lể (`.nextFoot` ở trang chủ, hai phần của thẻ gợi ý ở trang khoá).
  // Mốc cũ chặn đúng việc dọn đó, nên nó tự biến thành lý do giữ lại ba phép
  // đo không đo gì cả.
  assert.ok(rows.length >= 216, `danh sách cặp bị thu nhỏ còn ${rows.length} — đừng xoá cặp để test xanh`);
});

/**
 * Nhãn của mỗi cặp hay ghi kèm selector trong ngoặc, ví dụ "(.resumePick)".
 * Ca này đòi selector đó CÒN TỒN TẠI trong một file CSS nào đó.
 *
 * Vì sao cần: ba cặp vừa gỡ đã đo tương phản cho `.nextFoot` và `.resumePick`
 * hàng tháng sau khi hai lớp ấy bị xoá — con số vẫn đẹp, vẫn "0 trượt", và
 * không ai biết nó đang đo một thứ không còn trên màn hình. Đếm số cặp không
 * bắt được chuyện đó; chỉ nối nhãn với CSS mới bắt được.
 */
/** Nội dung MỌI file *.module.css dưới src/, nối làm một. */
function moiCssModule() {
  const ra = [];
  const di = (d) => {
    for (const ten of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, ten.name);
      if (ten.isDirectory()) di(p);
      else if (ten.name.endsWith('.module.css')) ra.push(readFileSync(p, 'utf8'));
    }
  };
  di(join(FE, 'src'));
  return ra.join(String.fromCharCode(10));
}

test('mọi nhãn cặp tương phản còn trỏ vào selector CÓ THẬT', () => {
  // Gom MỌI CSS module của sản phẩm, không chỉ danh sách SURFACE_CSS: nhãn có
  // thể trỏ vào lớp nằm ngoài danh sách đó, và ca này hỏi "lớp còn tồn tại
  // không", không hỏi "lớp có trong phạm vi soát không".
  const css = moiCssModule();
  const chet = [];
  for (const [label] of PAIRS) {
    const m = /\((\.[A-Za-z][\w-]*)\)/.exec(label);
    if (!m) continue;
    const ten = m[1].slice(1);
    // `String.raw` chứ KHÔNG phải template literal thường: trong template
    // literal, `\b` là ký tự BACKSPACE, không phải ranh giới từ — mẫu sẽ không
    // khớp gì và ca này báo MỌI nhãn là chết. Đúng cái bẫy đã ghi ở đầu
    // `seo-copy.test.mjs` sáng nay, và tôi vấp lại nó ngay trong ngày.
    const mau = new RegExp(String.raw`\.${ten}\b`);
    if (!mau.test(css)) chet.push(`${label} → ${m[1]}`);
  }
  assert.deepEqual(
    chet, [],
    'nhãn trỏ vào lớp CSS không còn tồn tại — phép đo này không đo gì:\n' + chet.join('\n'),
  );
});

test('221 cặp chữ/nền thật: không cặp nào trượt AA ở bản Ban đêm', () => {
  const { dark } = readTokens(TOKENS_CSS);
  const bad = audit(dark).filter((r) => !r.pass);
  assert.deepEqual(
    bad.map((r) => `${r.label} = ${r.ratio.toFixed(2)} (cần ${r.need})`), [],
    'cặp trượt WCAG AA ở bản đêm',
  );
});

test('cặp được MIỄN ngưỡng thì phải viết lý do, và chỉ được miễn ở hai loại', () => {
  const { light } = readTokens(TOKENS_CSS);
  const exempt = audit(light).filter((r) => EXEMPT.includes(r.kind));
  assert.ok(exempt.length > 0, 'không còn dòng miễn nào — nếu bỏ hẳn thì sửa cả ca test này');
  for (const r of exempt) {
    assert.ok(
      typeof r.reason === 'string' && r.reason.length >= 40,
      `cặp "${r.label}" được miễn ngưỡng mà không nêu lý do — miễn phải đắt`,
    );
  }
  // Không được lặng lẽ hạ một cặp CHỮ xuống loại miễn để test xanh.
  for (const [label, , , kind] of PAIRS) {
    if (!EXEMPT.includes(kind)) continue;
    assert.ok(
      !/chữ |đoạn văn|tiêu đề|nhãn |câu /.test(label),
      `"${label}" là chữ nên không được miễn ngưỡng tương phản`,
    );
  }
});

/* ── 4 · các chỗ làm mờ bằng opacity ─────────────────────────────────────
   Đây là cách nhanh nhất để chữ tụt dưới ngưỡng, và nó không hiện ra trong
   bảng token nên không cặp nào ở trên bắt được. Chốt bằng cách đọc nguồn.
   `opacity: 0` và `opacity: 1` vẫn được (hiện/ẩn, khung animation). */

/**
 * Danh sách MIỄN cho luật trên, mỗi dòng phải nêu lý do.
 *
 * 15/10/2026 — danh sách nay RỖNG, và đó là hiện trạng thật: không bề mặt nào
 * còn hạ độ đục để làm chữ nhạt. Dòng miễn duy nhất từng có là
 * `studio.module.css | .lockedExplanation` (lời giải mẫu bị giữ lại, nơi chữ
 * KHÔNG ĐỌC ĐƯỢC mới là đúng yêu cầu) — nhưng file đó đã xoá cùng route demo
 * ở đợt dọn route chết, và bài cửa nay không nhận `solutionCode` nữa nên cũng
 * không còn chỗ nào vẽ lời giải mờ. `SURFACE_CSS` ở trên đã bỏ file đó, còn
 * dòng miễn này thì bị bỏ quên: nó trở thành một khoá KHÔNG BAO GIỜ khớp, kèm
 * một câu chú thích khẳng định sai về hiện trạng. Ca ngay dưới canh để lần sau
 * xoá file là biết ngay, thay vì để dòng miễn chết lặng lẽ ở lại.
 */
const OPACITY_OK = [];

test('mỗi dòng MIỄN hạ-độ-đục phải trỏ vào file và selector CÓ THẬT', () => {
  // 15/10/2026 — ca này TỪNG MÙ HẲN: `OPACITY_OK` rỗng nên vòng lặp dưới chạy
  // 0 lần và cả ca không có một assert nào, tức nó xanh kể cả khi mọi luật ở
  // đây bị phá. Đúng khuôn "vòng lặp rỗng luôn xanh" mà chú thích trong
  // ds-type-scale.test.mjs dặn phải gỡ. Khẳng định đầu tiên dưới đây là
  // khẳng định về HIỆN TRẠNG (không bề mặt nào còn hạ độ đục để làm chữ
  // nhạt), nên ca có nội dung ở cả hai nhánh: danh sách rỗng ⇒ nó chốt rằng
  // rỗng là thật; danh sách có dòng ⇒ mỗi dòng phải trỏ vào chỗ có thật.
  assert.equal(
    OPACITY_OK.length, 0,
    'danh sách miễn vừa mọc thêm dòng — đọc lại chú thích ngay trên: mỗi dòng '
    + 'miễn phải nêu file, selector và lý do, và ca này sẽ kiểm cả ba',
  );
  // Lưới an toàn cho đúng cái đã xảy ra: file bị xoá, dòng miễn ở lại. Khoá
  // chết thì vô hại về bảo mật (luật nghiêm hơn chứ không lỏng hơn) nhưng nó
  // là một lời khẳng định sai về hiện trạng, và lời khẳng định sai thì không
  // ai kiểm lại.
  const surface = new Map(
    [...SURFACE_CSS, ...surfaceSources()].map((p) => [p[p.length - 1], p]),
  );
  for (const x of OPACITY_OK) {
    const p = surface.get(x.file);
    assert.ok(p, `${x.file} không còn nằm trong bề mặt được quét — dòng miễn này đã chết`);
    assert.ok(
      read(...p).includes(x.selector),
      `${x.file} không còn selector ${x.selector} — dòng miễn này đã chết`,
    );
    assert.ok(x.reason.length >= 60, `miễn ${x.selector} mà không nêu lý do đủ rõ`);
  }
});

test('không chỗ nào hạ ĐỘ ĐỤC để làm chữ nhạt đi — phải hạ cấp MÀU', () => {
  const allowed = new Set(OPACITY_OK.map((x) => `${x.file}|${x.selector}`));
  const offenders = [];
  for (const p of [...SURFACE_CSS, ...surfaceSources()]) {
    const file = p[p.length - 1];
    const isCss = file.endsWith('.css');
    const code = isCss ? cssCode(read(...p)) : tsCode(read(...p));
    // `opacity\s*:` không phân biệt hoa/thường và cho khoảng trắng trước dấu
    // hai chấm (CSS cho phép cả hai), và nhận cả ĐƠN VỊ PHẦN TRĂM: đột biến C9
    // viết `opacity: 45%` — hợp lệ trong CSS, cùng tác hại, mà regex cũ
    // `(0?\.\d+)` không thấy. `0`/`0%`/`1`/`100%` vẫn được (hiện/ẩn).
    for (const m of code.matchAll(/opacity\s*:\s*(\d*\.?\d+%?)/gi)) {
      const raw = m[1];
      const pct = raw.endsWith('%') ? Number(raw.slice(0, -1)) : Number(raw) * 100;
      if (pct <= 0 || pct >= 100) continue;
      const before = code.slice(Math.max(0, m.index - 260), m.index);
      // Khung @keyframes được phép: đó là chuyển cảnh, không phải trạng thái
      // đứng yên mà người học phải đọc trong lúc nó mờ.
      if (/@keyframes[^}]*$/.test(before)) continue;
      // Lớp gần nhất phía trước, để đối chiếu với danh sách miễn.
      const sel = [...before.matchAll(/(\.[A-Za-z][\w-]*)[^{}]*\{[^{}]*$/g)].pop()?.[1];
      if (sel && allowed.has(`${file}|${sel}`)) continue;
      offenders.push(`${p.join('/')}: ${sel ?? '?'} opacity ${m[1]}`);
    }
  }
  assert.deepEqual(
    offenders, [],
    'còn chỗ làm mờ bằng opacity — dùng nền `desk` + chữ `soft` + viền `sketch`:\n'
    + offenders.join('\n'),
  );
});

/* ── 4b · hai file NGOÀI bề mặt đã chuyển: nợ có MỐC TRẦN, chỉ được hạ ──────
   `ide.module.css` và `code-visualizer/CodeVisualizer.module.css` vẽ hai bề
   mặt người học thật sự dùng (/ide và bộ "Xem từng bước"), nhưng chưa chuyển
   sang bảng v2. Trước 15/10/2026 KHÔNG ca nào quét tới chúng, nên ba luật ở
   mục 2 — không mã màu, không đọc --edu-*, không hạ độ đục — không áp cho
   đúng hai file đang phá cả ba.

   Đưa thẳng vào `SURFACE_CSS` thì bộ test đỏ ~100 ca ngay, và đây là vùng
   agent khác đang sửa. Nên vào đây dưới dạng MỐC TRẦN đo được (cùng cách
   AGENTS.md dùng cho lint backend): con số chỉ được HẠ. Tác dụng thật, không
   chỉ để đẹp số: thêm một `color: orange` hay một `--edu-accent` mới vào hai
   file này là ĐỎ ngay, trong khi trước đó thêm bao nhiêu cũng xanh.

   Đo ngày 15/10/2026 bằng chính các hàm ở mục 2. `hex` để mốc 0 vì ĐO ĐƯỢC là
   cả hai file đã không còn mã hex nào — đó là luật tuyệt đối, không phải trần. */
const DEBT_CSS = [
  { path: ['src', 'components', 'code-visualizer', 'CodeVisualizer.module.css'], color: 7, edu: 44, opacity: 3 },
  { path: ['src', 'app', 'ide', 'ide.module.css'], color: 6, edu: 38, opacity: 1 },
];

test('nợ màu của /ide và Xem-từng-bước không được phình thêm (mốc chỉ được hạ)', () => {
  for (const d of DEBT_CSS) {
    const css = read(...d.path);
    const name = d.path.at(-1);
    const colors = colorLiterals(css);
    assert.ok(
      colors.length <= d.color,
      `${name}: ${colors.length} mã màu viết cứng, mốc trần là ${d.color} — `
      + `đừng thêm màu ngoài bảng (${colors.join(' ')})`,
    );
    // Mã hex: mốc TUYỆT ĐỐI 0. Hai file này dùng tên màu CSS và --edu-*, chứ
    // không còn hex nào — nên không có lý do nào để một hex mới xuất hiện.
    const hex = colors.filter((c) => c.startsWith('#'));
    assert.deepEqual(hex, [], `${name} vừa có mã hex mới: ${hex.join(' ')}`);
    const edu = [...cssCode(css).matchAll(/--edu-[\w-]+/g)]
      .map((m) => m[0]).filter((x) => x !== '--edu-font');
    assert.ok(
      edu.length <= d.edu,
      `${name}: ${edu.length} lượt đọc token bảng xanh --edu-*, mốc trần là ${d.edu}`,
    );
    const fade = [];
    for (const r of cssRules(css)) {
      if (/@keyframes/.test(r.at.join(' ')) || /^\d+%$|^(from|to)$/.test(r.prelude)) continue;
      for (const dc of declList(r.body)) {
        if (dc.prop !== 'opacity') continue;
        const raw = dc.value.replace('!important', '').trim();
        const pct = raw.endsWith('%') ? Number(raw.slice(0, -1)) : Number(raw) * 100;
        if (pct > 0 && pct < 100) fade.push(`${r.prelude} ${raw}`);
      }
    }
    assert.ok(
      fade.length <= d.opacity,
      `${name}: ${fade.length} chỗ hạ độ đục, mốc trần là ${d.opacity} — `
      + `hạ cấp MÀU thay vì hạ độ đục (${fade.join(' | ')})`,
    );
  }
});

/* ── 5 · các thang KHÔNG PHẢI MÀU: bo góc, nét viền, chuyển động, độ nổi ───
   Trước 15/10/2026 bốn thang này KHÔNG CA NÀO canh. Phép thử quyết định đã
   chạy: nối thêm một khối `:root` vào studio-tokens.css đặt lại cả bốn thang
   sang giá trị vô lý (`--ds-bw-2: 11px`, `--ds-r-pill: 3px`,
   `--ds-dur-base: 6s`, `--ds-halo: 0 0 0 80px rgba(0,255,0,.9)`) rồi chạy cả
   8 file guard: **87/87 ca vẫn xanh, 0 ca đỏ**. design-refs chỉ kiểm rằng TÀI
   LIỆU còn ghi TÊN các bậc, không ai so GIÁ TRỊ.

   Số ở đây ĐỌC TỪ `design-system-v2.md` bằng regex, không chép tay. Lý do là
   lỗi đã trả giá một lần: ds-type-scale chép tay `--ds-fs-h1: 36px` và ghi
   "chép từ §1.3", trong khi §1.3 chốt `h1` = 44 (36 là cột ĐIỆN THOẠI) — chép
   tay thì không ai phát hiện được lệch, vì cả hai vế đều do một người gõ.
   Đọc từ tài liệu thì đổi tài liệu ⇒ ca đỏ, đổi CSS ⇒ ca đỏ. */

/** Ô thứ `col` (1 = cột giá trị) của dòng bảng có ô đầu mang `` `name` ``. */
function docRow(name, col = 1) {
  const re = new RegExp(`^\\|([^|]*\`${name}\`[^|]*)\\|([^|]*)\\|([^|]*)\\|`, 'm');
  const m = DESIGN_DOC.match(re);
  assert.ok(m, `design-system-v2.md không còn dòng bảng cho \`${name}\``);
  return m[col + 1].trim().replace(/`/g, '');
}

/** Mọi bậc của một thang theo TÀI LIỆU: ô đầu dòng là đúng `` `tiền tố-…` ``. */
function docSteps(prefix) {
  const out = new Map();
  for (const m of DESIGN_DOC.matchAll(
    new RegExp(`^\\|\\s*\`(${prefix}[\\w-]+)\`\\s*\\|([^|]*)\\|`, 'gm'),
  )) out.set(m[1], m[2].trim().replace(/`/g, ''));
  return out;
}

/** Token thang (không phải màu nên `readTokens` bỏ qua) lấy theo giá trị THẮNG. */
const ROOT_BODIES = cssBlocks(TOKENS_CSS, ':root');
const scaleToken = (name) => winningDecl(ROOT_BODIES, name)?.value ?? null;
/** So hai giá trị CSS mà bỏ qua khoảng trắng — tài liệu viết `rgba(42,32,23,.08)`. */
const sameValue = (a, b) => a.replace(/\s+/g, '') === b.replace(/\s+/g, '');

test('thang BO GÓC khớp từng bậc của design-system-v2 §1.3, không hơn không kém', () => {
  const doc = docSteps('r-');
  assert.equal(doc.size, 6, 'tài liệu phải còn đúng sáu bậc bo góc');
  const declared = new Set(
    [...cssCode(TOKENS_CSS).matchAll(/(--ds-r-[\w-]+)\s*:/g)].map((m) => m[1]),
  );
  assert.deepEqual(
    [...declared].sort(), [...doc.keys()].map((k) => `--ds-${k}`).sort(),
    'thang bo góc trong CSS mọc thêm hoặc hụt một bậc so với tài liệu',
  );
  for (const [name, raw] of doc) {
    // Tài liệu viết bậc không đơn vị (`4`, `999`) và một bậc phần trăm (`50%`).
    const want = /^\d+$/.test(raw) ? `${raw}px` : raw;
    assert.ok(
      sameValue(scaleToken(`--ds-${name}`) ?? '', want),
      `--ds-${name} phải là ${want} theo §1.3, đang là ${scaleToken(`--ds-${name}`)}`,
    );
  }
});

test('thang NÉT VIỀN khớp từng bậc của §1.3 — bốn bậc, không phải tám', () => {
  // Bản thiết kế đếm được 8 độ dày trong 9 artboard rồi chốt lại còn bốn; cả
  // bốn đều mang đơn vị px trong tài liệu nên so thẳng.
  const doc = docSteps('bw-');
  assert.equal(doc.size, 4, 'tài liệu phải còn đúng bốn bậc nét viền');
  const declared = new Set(
    [...cssCode(TOKENS_CSS).matchAll(/(--ds-bw-[\w-]+)\s*:/g)].map((m) => m[1]),
  );
  assert.deepEqual(
    [...declared].sort(), [...doc.keys()].map((k) => `--ds-${k}`).sort(),
    'thang nét viền trong CSS lệch danh sách bậc của tài liệu',
  );
  for (const [name, want] of doc) {
    assert.ok(
      sameValue(scaleToken(`--ds-${name}`) ?? '', want),
      `--ds-${name} phải là ${want} theo §1.3, đang là ${scaleToken(`--ds-${name}`)}`,
    );
  }
});

test('thang CHUYỂN ĐỘNG đúng 200/320/450ms như §1.3, đọc từ tài liệu', () => {
  // Tài liệu gộp ba bậc vào một dòng: `dur-fast` / `dur-base` / `dur-page` |
  // 200 / 320 / 450 ms. Tách theo đúng thứ tự đó.
  const names = [...docRow('dur-fast', 0).matchAll(/dur-[\w-]+/g)].map((m) => m[0]);
  const nums = docRow('dur-fast').match(/\d+/g) ?? [];
  assert.deepEqual(names, ['dur-fast', 'dur-base', 'dur-page']);
  assert.equal(nums.length, 3, 'thang chuyển động phải còn ba số trong tài liệu');
  names.forEach((name, i) => {
    assert.equal(
      scaleToken(`--ds-${name}`), `${nums[i]}ms`,
      `--ds-${name} phải là ${nums[i]}ms theo §1.3`,
    );
  });
  // "Chỉ MỘT mức nổi" và ba bậc thời lượng: không được mọc bậc thứ tư lặng lẽ.
  const extra = [...cssCode(TOKENS_CSS).matchAll(/(--ds-dur-[\w-]+)\s*:/g)]
    .map((m) => m[1])
    .filter((n) => !names.includes(n.replace('--ds-', '')));
  assert.deepEqual(extra, [], `thang chuyển động mọc bậc ngoài tài liệu: ${extra.join(' ')}`);
});

test('ĐỘ NỔI: đúng một mức bóng và một quầng, trùng giá trị §1.3', () => {
  for (const name of ['shadow-open', 'halo']) {
    const want = docRow(name);
    const got = scaleToken(`--ds-${name}`);
    assert.ok(got, `--ds-${name} chưa khai trong bảng token`);
    assert.ok(
      sameValue(got, want),
      `--ds-${name} phải là "${want}" theo §1.3, đang là "${got}"`,
    );
  }
  // Bản thiết kế chốt "Chỉ một mức nổi": token bóng thứ hai mang giá trị RIÊNG
  // là mở lại cái thang nổi mà bản v2 đi bỏ. Bí danh trỏ vào shadow-open thì
  // vẫn được (`--st-shadow-sm/md`), vì nó không thêm mức nào.
  const shadows = [...cssCode(TOKENS_CSS).matchAll(/(--[\w-]*shadow[\w-]*)\s*:\s*([^;]+);/g)]
    .filter(([, , v]) => !/^var\(/.test(v.trim()))
    .map(([, n]) => n);
  assert.deepEqual(
    [...new Set(shadows)], ['--ds-shadow-open'],
    `chỉ --ds-shadow-open được mang giá trị bóng riêng, đang có: ${shadows.join(' ')}`,
  );
});

/**
 * ── BẰNG CHỨNG BẮT ĐƯỢC LỖI THẬT ──────────────────────────────────────
 * Đã CHẠY THẬT: gỡ từng bản sửa khỏi cây làm việc, chạy bộ test, rồi trả lại
 * nguyên trạng (15/10/2026). Kết quả đo được, không phải suy đoán:
 *
 *   gỡ bản sửa                                      → ca trượt
 *   ─────────────────────────────────────────────────────────────────────
 *   `--st-ok-*` trở lại xanh lá (#1f9d59 …)         → "bí danh --st-*" (1)
 *   `.lineNum { color: var(--st-code-gutter) }`     → "NỐI DÂY" (1)
 *   `color: #fff` ở `.primaryBtn`                   → "không viết mã màu
 *                                                      nào" + "NỐI DÂY" (2)
 *   viền `--ds-line` cho `.optionCard`/`.toggleBtn` → "NỐI DÂY" (1)
 *   `opacity: .5` ở `.primaryBtn:disabled`          → "không hạ ĐỘ ĐỤC" (1)
 *   `opacity: .55` nội tuyến ở `Mcq.tsx`            → "không hạ ĐỘ ĐỤC" (1)
 *
 * Lượt đo đầu (14/10) cho thấy BA mutation đầu tiên KHÔNG bị bắt: lúc đó
 * danh sách `PAIRS` nói ".lineNum dùng --ds-code-num" mà không gì buộc CSS
 * phải thật như vậy — đúng cái bẫy "fixture không giống dữ liệu thật thì test
 * vô dụng" trong AGENTS.md. Mục 3 (NỐI DÂY + bí danh) được thêm chính vì
 * phép đo đó, và lượt đo lại thì cả ba đều bị bắt.
 *
 * Số đo tương phản: TRƯỚC khi sửa, 77 cặp đo được **28 cặp trượt**; SAU khi
 * sửa, 127 cặp **0 trượt** (4 dòng được miễn, đều có lý do viết kèm).
 *
 * ── ĐỢT 15/10/2026: THÊM TRANG CHỦ + THANH ĐẦU TRANG ──────────────────
 * `PAIRS` thêm 45 cặp (6 của SiteHeader, 39 của trang chủ) → 172 cặp, **0
 * trượt** ở cả hai bản nền, 7 dòng được miễn (tất cả đều là đường kẻ/viền
 * THUẦN TRANG TRÍ, mỗi dòng có lý do).
 *
 * Trước đó trang chủ được đo bằng script riêng của nhóm thiết kế
 * (`scratchpad/ds-audit/home-contrast.py`, bảng --edu-*): 24 cặp mỗi bản nền,
 * **1 cặp trượt** ở mỗi bản — viền nhãn `.tag` dùng --edu-chip-border, 1,20:1
 * bản ngày và 1,32:1 bản đêm. Bảng v2 có token `sketch` dành riêng cho "viền
 * thứ bấm được" nên cặp đó nay đạt 4,00:1 và không còn phải miễn ngưỡng.
 *
 * ── ĐỢT 15/10/2026 (lượt sau): TRANG KHOÁ — NỢ ĐÃ TRẢ ────────────────
 * Ghi chú cũ ở đây nói trang khoá "CHƯA chuyển, và cố ý không làm dở", với
 * điều kiện để làm là "phải xem được trang thật để biết style.css/
 * dashboard.css/edu-dashboard.css còn tô vào đâu". Điều kiện đó đã thoả: đo
 * bằng DevTools trên localhost (duyệt `document.styleSheets`, lọc bằng
 * `el.matches(selectorText)`, lấy theo thứ tự nạp). Kết quả đo, không phải
 * suy đoán — quy tắc THẮNG ở từng khối:
 *
 *   body                 → edu-theme.css `body` (mesh ba quầng xanh/đỏ)
 *   .edu-cd-hero/-card   → edu-course-detail.css (--edu-card-bg, trắng 55%)
 *   .cd-block            → edu-theme.css `.section-card,…,.cd-block` ×2,
 *                          cả hai !important — ĐÈ `.cd-block` của course_detail.css
 *   .cd-block-icon       → course_detail.css (--edu-accent-soft)
 *   .edu-cd-lesson       → edu-course-detail.css (--edu-input-bg)
 *   .cd-desc / .cd-req-list li → course_detail.css (14px / 13px)
 *
 * KHÔNG file nào trong {style.css, dashboard.css, pages.css, dark-mode.css,
 * edu-dashboard.css} thắng ở bất kỳ khối nào — chúng chỉ tô `body` rồi bị
 * edu-theme.css đè. Vì vậy trang nay chỉ còn nạp edu-theme.css, giống trang chủ.
 *
 * Cách trả nợ: chuyển markup sang CSS MODULE thay vì sửa hai file legacy.
 * Lý do chọn hướng này, cả hai đều đo được:
 *   · `edu-course-detail.css` còn được BA trang `/courses/db_design*` nạp, nên
 *     sửa nó là lặng lẽ đổi màu ba trang khác trong cùng commit;
 *   · tên lớp CSS module bị băm nên KHÔNG selector legacy nào khớp nữa — kể cả
 *     hai dòng `!important` của edu-theme.css. Không còn chỗ nào phải đoán.
 * Kèm theo: không đụng `public/static/css` nên không phải kéo ASSET_VERSION.
 *
 * ── ĐỢT 15/10/2026 (lượt ba): BỊT LỖ DO KIỂM ĐỘT BIẾN CHỈ RA ─────────
 * 44 phép đột biến đã chạy thật trên 8 file guard thiết kế; tám phép ĐI QUA cả
 * bộ test. Nay cả tám đều ĐỎ — mỗi phép đã gây lại rồi phục hồi để đo:
 *
 *   đột biến                                          → ca trượt (sau khi sửa)
 *   ─────────────────────────────────────────────────────────────────────
 *   C3  khối `:root` THỨ HAI ghi đè --ds-ink          → 2 ca
 *   C4  ghi đè --ds-ink trong `[data-theme="dark"]`   → 1 ca (ca MỚI)
 *   C5  `color: magenta; background: white`           → 1 ca
 *   C6  `color: oklch(0.5 0.2 300)`                   → 1 ca
 *   C7  `color-mix(in srgb, crimson 50%, …)`          → 1 ca
 *   C9  `opacity: 45%` (phần trăm, CSS hợp lệ)        → 1 ca
 *   C14 ghi đè `.lineNum{color:…}` ở CUỐI file        → 1 ca
 *   C15 `.primaryBtn` sai nền trong `@media`          → 1 ca
 *   phép thử QUYẾT ĐỊNH (nối `:root` đặt lại CẢ bốn thang bo góc / nét viền /
 *   chuyển động / độ nổi sang giá trị vô lý)          → TRƯỚC 87/87 ca xanh,
 *                                                       NAY 4 ca đỏ
 *   đổi `| r-md | 12 |` thành 14 TRONG TÀI LIỆU       → 1 ca (số đọc từ
 *     design-system-v2.md bằng regex nên lệch chiều nào cũng thấy)
 *   thêm `orange` + `#ff00ff` + `opacity:.4` + `--edu-accent` vào
 *     ide.module.css                                  → 1 ca (mốc nợ 4b)
 *
 * `CourseShell.module.css` nay nằm trong `SURFACE_CSS` và có 10 dòng `WIRING`,
 * nên ba luật của trang bài học áp cho nó như mọi bề mặt khác.
 *
 * NỢ CÒN LẠI sau đợt này — và đây là nợ KHÁC, không phải nợ trên:
 *   · `/courses/db_design`, `/courses/db_design_nc`, `/courses/db_design_tc` và
 *     `/card/[cardId]` vẫn vẽ bằng `edu-course-detail.css` + `course_db_design.css`
 *     ở bảng xanh. Bốn trang này KHÔNG nằm trong `lib/catalog.ts` nên không ai
 *     đi từ trang chủ tới được; chúng dùng một bảng thuật ngữ khác và được miễn
 *     trong `ds-wording.test.mjs` với cùng lý do. Hai file legacy vì vậy vẫn
 *     phải ở lại — đừng xoá chúng khi thấy trang khoá không còn nạp.
 *   · `CourseDbDesign.tsx` dùng chung `.shell` và `.back` của
 *     `CourseShell.module.css`, nên `.back` ở đó nay là chữ `soft` kem trên nền
 *     xanh (7,0:1 — vẫn đạt AA). Nền thì không đổi: nền kem đặt ở `.page`, mà
 *     trang db_design không dùng lớp đó.
 */
