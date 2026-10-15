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
 * CHƯA CHUYỂN, cố ý để lại — nhưng từ 15/10/2026 KHÔNG còn vô hình:
 *   · `code-visualizer/CodeVisualizer.module.css` (đo lại: 20 khai báo) và
 *     `app/ide/ide.module.css` (12) thuộc vùng của agent khác nên không sửa,
 *     nhưng nay có MỐC TRẦN ở ca "nợ cỡ chữ px… không được phình thêm": thêm
 *     một cỡ px mới vào hai file đó là đỏ. Trước đó hai file này không ca nào
 *     quét tới, tức thêm bao nhiêu cũng xanh.
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

import { cssBlocks, cssCode, cssRules, declList, winningDecl } from './ds-contrast.mjs';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO = join(FE, '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');
const tsCode = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');

const TOKENS_RAW = read('public', 'static', 'css', 'studio-tokens.css');
const TOKENS = cssCode(TOKENS_RAW);
const DESIGN_DOC = readFileSync(join(REPO, 'design-system-v2.md'), 'utf8');

/* ── thang cỡ chữ ĐỌC TỪ TÀI LIỆU, không chép tay ────────────────────────
   Bản cũ chép tay `--ds-fs-h1: 36` kèm câu "chép từ design-system-v2 mục
   1.3". Lượt kiểm đột biến 15/10/2026 tìm ra một MÂU THUẪN mà hai ca cùng
   xanh vẫn giữ được: `design-refs.test.mjs` assert tài liệu phải ghi
   `| h1 | 44`, trong khi ca ở đây chốt token là 36. Hai con số khác nhau cho
   cùng một token, không ca nào đỏ — vì cả hai vế đều do người gõ tay.

   ĐỌC LẠI TÀI LIỆU rồi quyết. Bảng chữ §1.3 có HAI cột: cột đầu là máy tính,
   cột "Điện thoại" là bản thu nhỏ. `h1` = 44 / 36. Và `studio-tokens.css`
   KHÔNG có một `@media` nào (đếm được: 0), nên token một giá trị 36px đang
   chạy ở MỌI bề rộng — tức tiêu đề màn dùng cỡ ĐIỆN THOẠI cả trên máy tính.

   Vì sao biết đó là lệch chứ không phải một cách đọc khác: BẢY token còn lại
   đều lấy cột MÁY TÍNH (lead 20 khi điện thoại là 19, h3 22 khi điện thoại là
   20, h2 28 khi điện thoại là 26). `h1` là token DUY NHẤT lấy cột điện thoại.

   Sửa cho đúng là đổi token sang 44px + thêm `@media` hạ về 36 — nhưng đó là
   đổi hình ở mọi màn lý thuyết và nằm trong file sản phẩm, ngoài phạm vi đợt
   sửa TEST này. Nên ở đây nó thành một MIỄN VIẾT RA: ca dưới đòi h1 đúng bằng
   cột ĐIỆN THOẠI, đòi danh sách miễn chỉ có đúng nó, và đòi tài liệu vẫn còn
   cả hai cột. Ai nâng h1 lên 44 thì ca đỏ kèm câu nhắc thêm `@media`. */

/** Ô [máy tính, điện thoại] của một dòng bảng chữ §1.3. */
function docType(name) {
  const m = DESIGN_DOC.match(
    new RegExp(`^\\|\\s*\`${name}\`\\s*\\|([^|]*)\\|([^|]*)\\|`, 'm'),
  );
  assert.ok(m, `design-system-v2.md không còn dòng bảng chữ cho \`${name}\``);
  return [Number(m[1].match(/\d+/)[0]), Number(m[2].match(/\d+/)[0])];
}

/** Token thang → tên bậc trong tài liệu. */
const SCALE_ROWS = {
  '--ds-fs-label': 'label',
  '--ds-fs-code': 'code',
  '--ds-fs-ui': 'ui',
  '--ds-fs-body': 'body',
  '--ds-fs-lead': 'lead',
  '--ds-fs-h3': 'h3',
  '--ds-fs-h2': 'h2',
  '--ds-fs-h1': 'h1',
};

/** Bậc dùng cột ĐIỆN THOẠI trong khi cả thang dùng cột máy tính — xem trên. */
const PHONE_WAIVER = new Set(['--ds-fs-h1']);

const SCALE = Object.fromEntries(
  Object.entries(SCALE_ROWS).map(([token, row]) => {
    const [desktop, phone] = docType(row);
    return [token, PHONE_WAIVER.has(token) ? phone : desktop];
  }),
);

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
    // Giá trị THẮNG, không phải khai báo đầu: đột biến nối một `:root` thứ hai
    // đặt lại cả thang vào cuối file và 87/87 ca vẫn xanh.
    const win = winningDecl(cssBlocks(TOKENS_RAW, ':root'), name);
    assert.equal(win?.value, `${px}px`, `${name} phải là ${px}px, đang là ${win?.value}`);
    assert.equal(found.get(name), px, `${name} phải là ${px}px, đang là ${found.get(name)}px`);
  }
});

test('mâu thuẫn h1: token lấy cột ĐIỆN THOẠI, và đó là miễn VIẾT RA, không phải tình cờ', () => {
  // Xem lập luận đầy đủ ở khối chú thích trên `SCALE`. Ca này giữ ba việc:
  //  1. tài liệu vẫn còn CẢ HAI cột cho h1 (44 máy tính / 36 điện thoại) —
  //     nếu tài liệu đổi thì ca đỏ, không im lặng đi theo;
  //  2. chỉ h1 được miễn: token nào khác tụt về cột điện thoại là đỏ;
  //  3. bảng token không có `@media` nào — nên không ai được kể câu "có media
  //     query hạ xuống rồi" mà không thêm thật.
  const [desktop, phone] = docType('h1');
  assert.equal(desktop, 44, 'cột máy tính của h1 trong §1.3');
  assert.equal(phone, 36, 'cột điện thoại của h1 trong §1.3');
  assert.deepEqual([...PHONE_WAIVER], ['--ds-fs-h1'], 'chỉ h1 được dùng cỡ điện thoại');
  assert.equal(
    winningDecl(cssBlocks(TOKENS_RAW, ':root'), '--ds-fs-h1')?.value, `${phone}px`,
    `h1 đang KHÔNG bằng cột điện thoại nữa: nếu vừa nâng lên ${desktop}px thì gỡ `
    + '--ds-fs-h1 khỏi PHONE_WAIVER và thêm @media hạ về 36px cho màn hẹp',
  );
  assert.equal(
    cssRules(TOKENS_RAW).filter((r) => r.prelude.startsWith('@media')).length, 0,
    'bảng token vừa có @media — lúc đó thang phải đo theo CẢ HAI cột, sửa ca này',
  );
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

/**
 * Mọi khai báo cỡ chữ của một bảng CSS: `[{ where, value }]`.
 *
 * Ba chỗ bản cũ bỏ sót, cả ba đã đo bằng đột biến thật:
 *   · `FONT-SIZE:` chữ HOA — CSS không phân biệt hoa/thường (A5);
 *   · `font-size :` có khoảng trắng trước dấu hai chấm — CSS cho phép (A6);
 *   · khai báo mới ở BẤT KỲ đâu trong file, kể cả trong `@media` (A9/A10).
 * `declList` chuẩn hoá tên thuộc tính về chữ thường nên cả ba vào cùng một rọ.
 */
function fontSizeDecls(cssText) {
  const out = [];
  for (const r of cssRules(cssText)) {
    for (const d of declList(r.body)) {
      if (d.prop === 'font-size') out.push({ where: r.prelude, value: d.value });
      // `font:` viết gộp cũng mang cỡ chữ — đừng để nó thành lối lách.
      if (d.prop === 'font' && /\d+(\.\d+)?px/.test(d.value)) {
        out.push({ where: r.prelude, value: `font: ${d.value}` });
      }
    }
  }
  return out;
}

test('7 file CSS đã chuyển không còn khai báo font-size bằng px', () => {
  const offenders = [];
  for (const p of MIGRATED_CSS) {
    for (const { where, value } of fontSizeDecls(read(...p))) {
      // Phải là một bậc CÓ THẬT của thang: `var(--ds-fs-nano)` đi qua bản cũ
      // (chỉ kiểm tiền tố `var(--ds-fs-`) nhưng là token không tồn tại, tức
      // cỡ chữ rơi về 16px thừa hưởng — đúng lỗi thang ra đời để bỏ.
      const token = value.match(/var\((--ds-fs-[\w-]+)\)/)?.[1];
      if (token && token in SCALE) continue;
      offenders.push(`${p.join('/')}: ${where} { font-size: ${value} }`);
    }
  }
  assert.deepEqual(offenders, [], `cỡ chữ không qua thang trong file đã chuyển:\n${offenders.join('\n')}`);
});

/* Nợ cỡ chữ của hai file CHƯA chuyển — mốc trần, chỉ được hạ.
   Đo ngày 15/10/2026. Cùng lý do như `DEBT_CSS` trong ds-tokens.test.mjs: hai
   file này vẽ bề mặt người học thật sự dùng (/ide, bộ "Xem từng bước") nhưng
   không ca nào quét tới, nên tới giờ thêm bao nhiêu cỡ px cũng xanh. Chú thích
   cũ ở cuối file này dặn "đừng dựng lại một ca chạy vòng lặp rỗng" — ca dưới
   KHÔNG rỗng: nó đọc hai file có thật và so với hai con số đo được. */
const DEBT_FONT_PX = [
  { path: ['src', 'components', 'code-visualizer', 'CodeVisualizer.module.css'], max: 20 },
  { path: ['src', 'app', 'ide', 'ide.module.css'], max: 12 },
];

test('nợ cỡ chữ px của /ide và Xem-từng-bước không được phình thêm', () => {
  for (const d of DEBT_FONT_PX) {
    const px = fontSizeDecls(read(...d.path)).filter(
      ({ value }) => !(value.match(/var\((--ds-fs-[\w-]+)\)/)?.[1] in SCALE),
    );
    assert.ok(
      px.length <= d.max,
      `${d.path.at(-1)}: ${px.length} khai báo cỡ chữ không qua thang, mốc trần là `
      + `${d.max} — ${px.map((x) => `${x.where}:${x.value}`).join(' | ')}`,
    );
  }
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
  // Giá trị THẮNG trên MỌI khối `.chrome`, không phải khớp đầu tiên: đột biến
  // A11 nối `.chrome { font-size: var(--ds-fs-label) }` (15px) vào CUỐI file
  // và ca này vẫn xanh, trong khi trên trang thật cả màn tụt xuống cỡ nhãn.
  const css = read('src', 'components', 'lesson-chrome', 'LessonChrome.module.css');
  const chrome = cssBlocks(css, '.chrome');
  assert.ok(chrome.length, 'không tìm thấy lớp .chrome');
  assert.equal(
    winningDecl(chrome, 'font-size')?.value, 'var(--ds-fs-body)',
    '.chrome phải khai font-size: var(--ds-fs-body) làm cỡ gốc của cả màn',
  );
  // Nút/lựa chọn dùng `font: inherit`, mà viết gộp đó RESET cả cỡ chữ về cỡ
  // thừa hưởng; phương án phải tự khai lại cỡ nút.
  const ex = read(...EXERCISES_DIR, 'exercises.module.css');
  const option = cssBlocks(ex, '.optionCard');
  assert.ok(option.length, 'không tìm thấy lớp .optionCard');
  assert.equal(
    winningDecl(option, 'font-size')?.value, 'var(--ds-fs-ui)',
    '.optionCard dùng `font: inherit` nên phải khai lại cỡ nút/lựa chọn',
  );
});

test('đoạn văn lý thuyết — chữ đọc lâu nhất của bài — ở cỡ thân, không phải 16px', () => {
  const css = read('src', 'components', 'python-studio', 'studio-chrome.module.css');
  for (const sel of ['.theoryBlock p', '.theoryBlock li']) {
    const blocks = cssBlocks(css, sel);
    assert.ok(blocks.length, `không tìm thấy ${sel}`);
    assert.equal(
      winningDecl(blocks, 'font-size')?.value, 'var(--ds-fs-body)',
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
 * ── ĐỢT 15/10/2026 (lượt hai): KIỂM ĐỘT BIẾN ──────────────────────────
 * Sáu phép đột biến từng ĐI QUA cả bộ test; nay mỗi phép đã gây lại, đo, rồi
 * phục hồi:
 *   `.tinyHack { FONT-SIZE: 8px }` (chữ HOA)            → 1 ca
 *   `.tinyHack { font-size : 8px }` (trắng trước `:`)   → 1 ca
 *   `font-size: var(--ds-fs-nano)` (token KHÔNG TỒN TẠI)→ 1 ca
 *   `.chrome { font-size: var(--ds-fs-label) }` ở CUỐI  → 1 ca
 *   `:root{--ds-fs-body:13px}` nối thêm ở cuối bảng     → 1 ca
 *   nâng `--ds-fs-h1` lên 44px                          → 2 ca, kèm câu nhắc
 *     phải thêm `@media` hạ về 36px (xem chú thích trên `SCALE`)
 *
 * Số đo: TRƯỚC khi sửa, 8 file bề mặt dùng 23 cỡ chữ khác nhau (8px → 36px)
 * cộng 12 cỡ nội tuyến trong TSX; SAU khi sửa, phần đã chuyển dùng đúng 8
 * cỡ, nhỏ nhất 15px — và phần chưa chuyển được chốt mốc ở ca cuối file.
 */
