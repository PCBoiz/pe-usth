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

import { audit, contrast, EXEMPT, PAIRS, readTokens } from './ds-contrast.mjs';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

const TOKENS_PATH = ['public', 'static', 'css', 'studio-tokens.css'];
const TOKENS_CSS = read(...TOKENS_PATH);

/** Bỏ chú thích CSS — chú thích CÓ chứa mã màu, và đó là chỗ nên có. */
const cssCode = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
/** Bỏ chú thích JS/TS. */
const tsCode = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');

/* ── 1 · bảng token phải khớp ĐÚNG bản thiết kế ───────────────────────── */

/**
 * Chép từ design-system-v2 mục 1.3. Viết lại ở đây có chủ ý: bản thiết kế là
 * file ngoài repo, nên nếu không chốt con số vào test thì "khớp bản thiết kế"
 * chỉ là lời nói. Đổi bảng màu sản phẩm thì phải đổi cả hai chỗ.
 */
const DESIGN_LIGHT = {
  '--ds-page': '#FBF7EE',
  '--ds-card': '#FFFFFF',
  '--ds-paper': '#FFFCF5',
  '--ds-tint': '#F6EFE1',
  '--ds-desk': '#EFE6D3',
  '--ds-line': '#E7DCC6',
  '--ds-sketch': '#8E7652',
  '--ds-ink': '#2A2017',
  '--ds-soft': '#5E4630',
  '--ds-violet': '#6E2BA8',
  '--ds-violet-deep': '#4F1D7A',
  '--ds-violet-tint': '#F5EAFB',
  '--ds-action': '#7A2BB8',
  '--ds-on-action': '#FFFFFF',
  '--ds-sanguine': '#9C3B22',
  '--ds-sanguine-tint': '#FBF1EC',
  '--ds-ochre': '#8A5A0F',
  '--ds-ochre-tint': '#FBF4E4',
  '--ds-code-bg': '#221A13',
  '--ds-code-line': '#3D3127',
  '--ds-code-fg': '#EFE6D2',
  '--ds-code-meta': '#C9B48C',
  '--ds-code-num': '#A8977F',
  '--ds-code-kw': '#F2B880',
  '--ds-code-str': '#C8DDA0',
  '--ds-mark-violet': '#C99BEF',
  '--ds-mark-sanguine': '#EC9277',
  '--ds-mark-ochre': '#E0B062',
};
const DESIGN_DARK = {
  '--ds-page': '#16120E',
  '--ds-card': '#221C16',
  '--ds-paper': '#1B1611',
  '--ds-tint': '#2A231C',
  '--ds-desk': '#3A2F25',
  '--ds-line': '#3A2F25',
  '--ds-sketch': '#A99272',
  '--ds-ink': '#F2EBDD',
  '--ds-soft': '#CDBFA6',
  '--ds-violet': '#C99BEF',
  '--ds-violet-tint': '#2E2238',
  '--ds-action': '#C99BEF',
  '--ds-on-action': '#16120E',
  '--ds-sanguine': '#EC9277',
  '--ds-sanguine-tint': '#33201A',
  '--ds-ochre': '#E0B062',
  '--ds-ochre-tint': '#2B2416',
};

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
  for (const p of SURFACE_CSS) {
    const code = cssCode(read(...p));
    const hex = code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    const fn = code.match(/\b(?:rgba?|hsla?)\(/g) ?? [];
    assert.deepEqual(hex, [], `${p.join('/')} còn mã màu hex: ${hex.join(' ')}`);
    assert.deepEqual(fn, [], `${p.join('/')} còn màu viết bằng ${fn.join(' ')} — phải qua token`);
  }
});

test('TSX của trang bài học không viết mã màu nào (chỉ var(--…))', () => {
  const offenders = [];
  for (const p of surfaceSources()) {
    const code = tsCode(read(...p));
    const hex = code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    const fn = code.match(/\b(?:rgba?|hsla?)\([\d.\s,]+\)/g) ?? [];
    if (hex.length || fn.length) offenders.push(`${p.join('/')}: ${[...hex, ...fn].join(' ')}`);
  }
  assert.deepEqual(offenders, [], `màu viết thẳng trong TSX:\n${offenders.join('\n')}`);
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
    const css = cssCode(read(...path));
    // Phải xét MỌI khối có lớp đó trong danh sách selector, không chỉ khối
    // `\.cls {` đứng một mình: `.dot, .dotActive { background: … }` mới là
    // chỗ khai nền của `.dot`, còn `.dot { width: 6px }` thì không.
    const found = [];
    for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const selectors = m[1].split(',').map((x) => x.trim());
      if (!selectors.some((sl) => sl === cls || sl.startsWith(`${cls}:`) || sl.endsWith(` ${cls}`))) continue;
      const decl = m[2].match(new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)`));
      if (decl) found.push(decl[1].trim());
    }
    if (!found.length) { offenders.push(`${path.at(-1)} ${cls}: không thấy ${prop}`); continue; }
    if (!found.some((v) => v.includes(`var(${token})`))) {
      offenders.push(`${path.at(-1)} ${cls} ${prop}: ${found.join(' | ')} — phải là ${token} (${why})`);
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
  assert.ok(rows.length >= 219, `danh sách cặp bị thu nhỏ còn ${rows.length} — đừng xoá cặp để test xanh`);
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
    for (const m of code.matchAll(/opacity:\s*(0?\.\d+)/g)) {
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
