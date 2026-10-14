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

/** Mọi file vẽ nên trang bài học (trừ vùng của agent khác). */
const SURFACE_CSS = [
  ['src', 'components', 'python-studio', 'studio.module.css'],
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
  // Thang cỡ chữ cũng là --ds-* nhưng không phải màu, nên đọc riêng.
  for (const m of cssCode(TOKENS_CSS).matchAll(/(--ds-fs-[\w-]+)\s*:/g)) declared.add(m[1]);
  declared.add('--ds-shadow-open');

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

test('127 cặp chữ/nền thật: không cặp nào trượt AA ở bản ngày', () => {
  const { light } = readTokens(TOKENS_CSS);
  const rows = audit(light);
  const bad = rows.filter((r) => !r.pass);
  assert.deepEqual(
    bad.map((r) => `${r.label} = ${r.ratio.toFixed(2)} (cần ${r.need})`), [],
    'cặp trượt WCAG AA (chạy `node e2e/unit/ds-contrast.mjs` để xem cả bảng)',
  );
  assert.ok(rows.length >= 120, `danh sách cặp bị thu nhỏ còn ${rows.length} — đừng xoá cặp để test xanh`);
});

test('127 cặp chữ/nền thật: không cặp nào trượt AA ở bản Ban đêm', () => {
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
 * Danh sách MIỄN cho luật trên, mỗi dòng phải nêu lý do. Đúng một chỗ: lời
 * giải mẫu đang bị giữ lại, nơi chữ KHÔNG ĐỌC ĐƯỢC mới là đúng yêu cầu.
 */
const OPACITY_OK = [
  {
    file: 'studio.module.css',
    selector: '.lockedExplanation',
    reason: 'Lời giải mẫu bị giữ lại tới khi bài được ghi nhận đã xong. Chữ ở '
      + 'đây PHẢI không đọc được, nên blur + opacity là việc cần làm chứ không '
      + 'phải lỗi tương phản.',
  },
];

test('không chỗ nào hạ ĐỘ ĐỤC để làm chữ nhạt đi — phải hạ cấp MÀU', () => {
  const allowed = new Set(OPACITY_OK.map((x) => `${x.file}|${x.selector}`));
  for (const x of OPACITY_OK) {
    assert.ok(x.reason.length >= 60, `miễn ${x.selector} mà không nêu lý do đủ rõ`);
  }
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
 */
