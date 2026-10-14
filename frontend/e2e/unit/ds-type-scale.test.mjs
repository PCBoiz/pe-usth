/**
 * Unit test NỐI DÂY: thang cỡ chữ của trang bài học.
 *
 * Vì sao phải có. Bản thiết kế v2 chốt hai luật đọc được:
 *   · không có chữ nào nhỏ hơn 15px;
 *   · câu nào người học phải đọc để biết làm gì thì từ 17px trở lên.
 * Trước lần sửa này trang bài học dùng **23 cỡ chữ rời rạc**, nhỏ nhất 8px,
 * và đoạn văn lý thuyết — thứ người học đọc lâu nhất trong cả bài — nằm ở
 * 16px. Cỡ chữ là loại giá trị dễ bò lại nhất: ai cũng chỉ sửa "một chỗ cho
 * vừa khung", và một tuần sau lại có 23 cỡ. Test chốt cả thang lẫn việc các
 * file đã chuyển không được viết lại số px.
 *
 * ── PHẠM VI, nói thẳng để chú thích không hứa quá ──────────────────────
 * ĐÃ CHUYỂN và được canh ở đây: 7 file CSS module của khung bài + bài tập +
 * `studio-chrome.module.css`, cùng mọi `fontSize` nội tuyến trong
 * `lesson-chrome/exercises/*.tsx`.
 *
 * CHƯA CHUYỂN, cố ý để lại:
 *   · `code-visualizer/CodeVisualizer.module.css` — 12 khai báo, 11 dưới
 *     15px. Thuộc vùng của agent khác, không sửa trong đợt này.
 *
 * 15/10/2026 — món nợ lớn nhất ở đây (`python-studio/studio.module.css`, 100
 * khai báo px) đã TRẢ bằng cách xoá: file chỉ vẽ trang demo
 * `/lesson/python?demo=list`, mà route đó cùng `PythonStudio.tsx` đã bị dọn.
 * Ca "nợ cỡ chữ px" vì vậy không còn file nào để đo nên đã gỡ — đừng dựng lại
 * một ca chạy vòng lặp rỗng, nó luôn xanh và không canh gì.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');
const cssCode = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
const tsCode = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');

const TOKENS = cssCode(read('public', 'static', 'css', 'studio-tokens.css'));

/** Chép từ design-system-v2 mục 1.3 — xem lý do chép ở ds-tokens.test.mjs. */
const SCALE = {
  '--ds-fs-label': 15,
  '--ds-fs-code': 16,
  '--ds-fs-ui': 17,
  '--ds-fs-body': 18,
  '--ds-fs-lead': 20,
  '--ds-fs-h3': 22,
  '--ds-fs-h2': 28,
  '--ds-fs-h1': 36,
};

/** File đã chuyển — không được còn một con số px cỡ chữ nào. */
const MIGRATED_CSS = [
  ['src', 'components', 'python-studio', 'studio-chrome.module.css'],
  ['src', 'components', 'lesson-chrome', 'LessonChrome.module.css'],
  ['src', 'components', 'lesson-chrome', 'LessonBrief.module.css'],
  ['src', 'components', 'lesson-chrome', 'ShellA.module.css'],
  ['src', 'components', 'lesson-chrome', 'ShellB.module.css'],
  ['src', 'components', 'lesson-chrome', 'TryItButton.module.css'],
  ['src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css'],
];

const EXERCISES_DIR = ['src', 'components', 'lesson-chrome', 'exercises'];

/* ── 1 · thang chỉ có 8 cỡ, và không cỡ nào dưới 15px ─────────────────── */

test('thang cỡ chữ khai đúng 8 cỡ của bản thiết kế, không hơn không kém', () => {
  const found = new Map();
  for (const m of TOKENS.matchAll(/(--ds-fs-[\w-]+)\s*:\s*(\d+)px\s*;/g)) {
    found.set(m[1], Number(m[2]));
  }
  assert.deepEqual(
    [...found.keys()].sort(), Object.keys(SCALE).sort(),
    'thang mọc thêm hoặc hụt một cỡ — bản thiết kế chốt đúng 8 token',
  );
  for (const [name, px] of Object.entries(SCALE)) {
    assert.equal(found.get(name), px, `${name} phải là ${px}px, đang là ${found.get(name)}px`);
  }
});

test('không cỡ nào trong thang nhỏ hơn 15px, và cỡ thân ≥ 17px', () => {
  for (const [name, px] of Object.entries(SCALE)) {
    assert.ok(px >= 15, `${name} = ${px}px, dưới mức 15px của bản thiết kế`);
  }
  assert.ok(SCALE['--ds-fs-body'] >= 17, 'cỡ thân phải ≥ 17px');
  assert.ok(SCALE['--ds-fs-ui'] >= 17, 'cỡ nút/lựa chọn phải ≥ 17px');
  // Nhãn/chip được phép 14–15px, nhưng không thấp hơn.
  assert.ok(SCALE['--ds-fs-label'] >= 14, 'cỡ nhãn/chip phải ≥ 14px');
});

/* ── 2 · file đã chuyển không được viết lại số px ─────────────────────── */

test('7 file CSS đã chuyển không còn khai báo font-size bằng px', () => {
  const offenders = [];
  for (const p of MIGRATED_CSS) {
    const code = cssCode(read(...p));
    for (const m of code.matchAll(/font-size:\s*([^;}]+)/g)) {
      if (!m[1].includes('var(--ds-fs-')) offenders.push(`${p.join('/')}: font-size: ${m[1].trim()}`);
    }
    // `font:` viết gộp cũng mang cỡ chữ — đừng để nó thành lối lách.
    for (const m of code.matchAll(/\bfont:\s*([^;}]+)/g)) {
      if (/\d+px/.test(m[1])) offenders.push(`${p.join('/')}: font: ${m[1].trim()}`);
    }
  }
  assert.deepEqual(offenders, [], `cỡ chữ viết bằng px trong file đã chuyển:\n${offenders.join('\n')}`);
});

test('TSX bài tập không còn fontSize bằng số — mọi chỗ đọc từ thang', () => {
  const offenders = [];
  for (const name of readdirSync(join(FE, ...EXERCISES_DIR))) {
    if (!/\.tsx$/.test(name)) continue;
    const code = tsCode(read(...EXERCISES_DIR, name));
    for (const m of code.matchAll(/fontSize:\s*([^,}\n]+)/g)) {
      const v = m[1].trim();
      if (!v.includes('var(--ds-fs-')) offenders.push(`${name}: fontSize: ${v}`);
    }
  }
  assert.deepEqual(offenders, [], `fontSize nội tuyến không qua thang:\n${offenders.join('\n')}`);
});

test('khung bài khai cỡ chữ gốc, nên chữ không tự khai không rơi về 16px', () => {
  // `.chrome` là tổ tiên của mọi màn. Không có dòng này thì đoạn văn và
  // phương án trắc nghiệm thừa 16px mặc định của trình duyệt — dưới mức thân.
  const css = cssCode(read('src', 'components', 'lesson-chrome', 'LessonChrome.module.css'));
  const chrome = css.match(/\.chrome\s*\{([\s\S]*?)\}/);
  assert.ok(chrome, 'không tìm thấy lớp .chrome');
  assert.match(
    chrome[1], /font-size:\s*var\(--ds-fs-body\)/,
    '.chrome phải khai font-size: var(--ds-fs-body) làm cỡ gốc của cả màn',
  );
  // Nút/lựa chọn dùng `font: inherit`, mà viết gộp đó RESET cả cỡ chữ về cỡ
  // thừa hưởng; phương án phải tự khai lại cỡ nút.
  const ex = cssCode(read(...EXERCISES_DIR, 'exercises.module.css'));
  const option = ex.match(/\.optionCard\s*\{([\s\S]*?)\}/);
  assert.ok(option, 'không tìm thấy lớp .optionCard');
  assert.match(
    option[1], /font-size:\s*var\(--ds-fs-ui\)/,
    '.optionCard dùng `font: inherit` nên phải khai lại cỡ nút/lựa chọn',
  );
});

test('đoạn văn lý thuyết — chữ đọc lâu nhất của bài — ở cỡ thân, không phải 16px', () => {
  const css = cssCode(read('src', 'components', 'python-studio', 'studio-chrome.module.css'));
  for (const sel of ['.theoryBlock p', '.theoryBlock li']) {
    const rx = new RegExp(`${sel.replace('.', '\\.')}\\s*\\{([^}]*)\\}`);
    const m = css.match(rx);
    assert.ok(m, `không tìm thấy ${sel}`);
    assert.match(
      m[1], /font-size:\s*var\(--ds-fs-body\)/,
      `${sel} phải ở cỡ thân (18px); trước lần này là 16px`,
    );
  }
});

/* ── 3 · nợ còn lại ──────────────────────────────────────────────────────
 * Ca "nợ cỡ chữ px không được phình thêm" (mốc 14/10/2026: 100 khai báo, 88
 * dưới 14px) đã GỠ ngày 15/10/2026 cùng với file duy nhất nó đo —
 * `python-studio/studio.module.css`, CSS của trang demo `?demo=list` đã xoá.
 * Nợ còn lại duy nhất là `code-visualizer/CodeVisualizer.module.css` (vùng của
 * agent khác); khi vùng đó chuyển sang thang token thì thêm ca mới ở đây. */

/**
 * ── BẰNG CHỨNG BẮT ĐƯỢC LỖI THẬT ──────────────────────────────────────
 * Đã CHẠY THẬT: gỡ từng bản sửa khỏi cây làm việc, chạy bộ test, rồi trả lại
 * nguyên trạng (15/10/2026). Kết quả đo được:
 *   · `.theoryBlock p { font-size: 16px }` → 2 ca trượt ("đoạn văn lý
 *     thuyết…" và "7 file CSS đã chuyển…").
 *   · bỏ `font-size` của `.chrome` → 1 ca ("khung bài khai cỡ chữ gốc").
 *   · `fontSize: 11` nội tuyến ở `Classify.tsx` → 1 ca ("TSX bài tập không
 *     còn fontSize bằng số"), và thông báo nêu đúng file.
 *   · thêm `--ds-fs-micro: 13px` vào thang → 1 ca ("đúng 8 cỡ").
 * Số đo: TRƯỚC khi sửa, 8 file bề mặt dùng 23 cỡ chữ khác nhau (8px → 36px)
 * cộng 12 cỡ nội tuyến trong TSX; SAU khi sửa, phần đã chuyển dùng đúng 8
 * cỡ, nhỏ nhất 15px — và phần chưa chuyển được chốt mốc ở ca cuối file.
 */
