/**
 * Bàn thí nghiệm (/ide) — bề mặt cuối cùng rời bảng XANH sang bảng kem --ds-*.
 *
 * `ds-tokens.test.mjs` có một danh sách `SURFACE_CSS` và `ds-type-scale` có
 * `MIGRATED_CSS`; **không danh sách nào kể `src/app/ide/ide.module.css`** (lỗ
 * T1 của báo cáo soát). Hậu quả đo được trước commit này: 39 lần đọc
 * `--edu-*`, 5 bậc cỡ chữ dưới sàn 15px (11 / 12,5 / 13 / 13,5 / 14), 6 chỗ
 * `color-mix(orange|crimson)`, một chỗ hạ `opacity` để làm mờ nút tắt, và
 * `.page` không đặt `background` nên nền trang là mesh xanh/đỏ của `body`
 * trong `edu-theme.css` — mỗi nhóm đã có một ca viết sẵn ở hai bộ trên để cấm
 * đúng việc đó, chỉ là không quét tới file.
 *
 * File này canh /ide bằng chính ba luật đó, ĐỘC LẬP với hai bộ kia (chúng đang
 * được một phiên khác sửa). Trùng luật là có chủ ý: luật trùng thì ai gỡ một
 * chỗ vẫn còn chỗ kia đỏ.
 *
 * ===========================================================================
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 * ===========================================================================
 *  - "nền trang /ide là --ds-page": trượt với `.page { min-height: 100vh; }`
 *    trần của bản cũ — đó CHÍNH là cú giật màu bài học → Bàn thí nghiệm.
 *  - "không đọc token màu của bảng cũ": trượt với --edu-t1/-t3/-pill-bg/
 *    -pill-border/-accent/-accent-grad/-accent-text/-panel-bg-solid/
 *    -panel-border/-card-border/-card-shadow/-track-bg. Hai token PHÔNG
 *    (--edu-font, --edu-mono) được miễn — xem FONT_OK bên dưới.
 *  - "không viết màu ngoài bảng": trượt với `color-mix(in srgb, orange …)` và
 *    `crimson`. Ca này cấm cả TÊN màu CSS và mọi hàm màu, tức vá luôn lỗ T2
 *    ("ca cũ chỉ grep `#` và `rgba(`").
 *  - "mọi cỡ chữ qua thang --ds-fs-*": trượt với 11px, 12,5px, 13px, 13,5px,
 *    14px, 24px.
 *  - "không hạ opacity để làm nhạt": trượt với `.run:disabled { opacity: .6 }`.
 *  - "mọi token --ds-* dùng ở đây đều đã khai": ca canh TIỀN ĐỀ — nó bắt lỗi
 *    gõ sai tên token, thứ lặng lẽ bỏ cả thuộc tính thay vì báo lỗi.
 *  - "mọi lớp IdeClient dùng đều được khai": trượt với bản cũ, nơi
 *    `styles.exampleLabel` được dùng mà CSS không có lớp đó — một `<label>`
 *    không style, không ai thấy vì nó chỉ lệch căn dòng vài pixel.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');

const CSS_REL = 'src/app/ide/ide.module.css';
const TSX_REL = 'src/app/ide/IdeClient.tsx';
const TOKENS_REL = 'public/static/css/studio-tokens.css';

/** Bỏ chú thích: chú thích ĐƯỢC nhắc lại giá trị sai cũ để giải thích vì sao sai. */
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

const css = stripCss(readFileSync(join(FE, CSS_REL), 'utf8'));
const tsx = readFileSync(join(FE, TSX_REL), 'utf8');
const tokens = readFileSync(join(FE, TOKENS_REL), 'utf8');

test('nền trang /ide là --ds-page, không phải mesh xanh của body', () => {
  const khoi = /\.page\s*\{([^}]*)\}/.exec(css);
  assert.ok(khoi, 'không tìm thấy quy tắc .page');
  assert.match(
    khoi[1],
    /background:\s*var\(--ds-page\)/,
    '.page không đặt nền --ds-page — nền trang rơi về `body` của edu-theme.css '
    + '(mesh ba quầng xanh/đỏ), tức một cú giật màu khi đi từ bài học sang đây',
  );
});

/**
 * HAI token --edu-* được miễn, và cả hai là PHÔNG chứ không phải màu:
 * `--edu-font` (thân chữ) và `--edu-mono` (code). `--edu-mono` phải miễn vì
 * `fonts-naming.test.mjs` canh đúng chiều NGƯỢC LẠI — nó cấm /ide viết tay
 * chuỗi `ui-monospace, 'Cascadia Code', …` và đòi đọc `var(--edu-mono)`, để
 * JetBrains Mono tự lưu trữ nằm đầu chuỗi ở một chỗ duy nhất. Miễn sai hai
 * token này là dựng hai ca cấm nhau.
 */
const FONT_OK = new Set(['--edu-font', '--edu-mono']);

test('không đọc token màu của bảng cũ (--edu-* trừ hai token phông)', () => {
  const sai = [...css.matchAll(/--edu-[\w-]+/g)].map((m) => m[0]).filter((t) => !FONT_OK.has(t));
  assert.deepEqual(sai, [], `${CSS_REL} còn đọc: ${sai.join(' ')}`);
});

test('không viết màu ngoài bảng (mã hex, hàm màu, hay TÊN màu CSS)', () => {
  const hex = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  assert.deepEqual(hex, [], `còn mã màu hex: ${hex.join(' ')}`);
  // Mọi hàm màu, không chỉ rgba(): `color-mix`, `oklch`, `color(display-p3 …)`,
  // `light-dark()` — bản cũ lọt đúng vì ca kia chỉ grep `rgba(`.
  const ham = css.match(/\b(?:rgba?|hsla?|color-mix|oklch|oklab|lab|lch|color)\(/g) ?? [];
  assert.deepEqual(ham, [], `màu viết bằng hàm: ${ham.join(' ')} — phải qua var(--ds-*)`);
  // Tên màu mặc định của trình duyệt. Chỉ cần những cái thật sự dễ bị với tới
  // cho vai "cảnh báo / lỗi / đúng" — đó là chỗ người ta bỏ qua bảng màu.
  const ten = [
    'orange', 'crimson', 'red', 'green', 'blue', 'yellow', 'purple', 'gold',
    'tomato', 'salmon', 'coral', 'teal', 'olive', 'navy', 'maroon', 'lime',
  ];
  for (const t of ten) {
    assert.ok(
      !new RegExp(`:\\s*[^;{}]*\\b${t}\\b`).test(css),
      `còn dùng tên màu CSS \`${t}\` — bảng v2 chỉ có bốn họ nhấn`,
    );
  }
});

test('mọi cỡ chữ qua thang --ds-fs-*', () => {
  const px = [...css.matchAll(/font-size:\s*([^;]+);/g)]
    .map((m) => m[1].trim())
    .filter((v) => !/^var\(--ds-fs-[\w-]+\)$/.test(v));
  assert.deepEqual(
    px,
    [],
    `cỡ chữ không qua thang: ${px.join(' · ')} — bản thiết kế chốt 8 bậc và sàn 15px`,
  );
  // Và `font:` gộp không được mang cỡ (nó sẽ lách được ca trên).
  for (const m of css.matchAll(/(^|[;{])\s*font:\s*([^;]+);/g)) {
    assert.ok(
      /^inherit$/.test(m[2].trim()),
      `\`font:\` gộp mang cỡ chữ: ${m[2].trim()} — tách ra thành font-size: var(--ds-fs-*)`,
    );
  }
});

test('không hạ opacity để làm nhạt', () => {
  // Bản thiết kế §1.2: "Trạng thái tắt: viền `sketch`, chữ `soft`, không dùng
  // opacity" — opacity 0,4 cho 2,42:1. Làm nhạt bằng MÀU.
  const mo = [...css.matchAll(/(?:^|[;{])\s*opacity:\s*([^;]+);/g)]
    .map((m) => m[1].trim())
    .filter((v) => v !== '1' && v !== '0');
  assert.deepEqual(mo, [], `còn hạ độ đục: ${mo.join(' ')} — làm nhạt bằng màu`);
});

test('mọi token --ds-* dùng ở đây đều đã khai trong studio-tokens.css', () => {
  const khai = new Set([...tokens.matchAll(/(--ds-[\w-]+)\s*:/g)].map((m) => m[1]));
  const dung = new Set([...css.matchAll(/var\((--ds-[\w-]+)\)/g)].map((m) => m[1]));
  const thieu = [...dung].filter((t) => !khai.has(t));
  assert.deepEqual(thieu, [], `token chưa khai (viết sai tên thì thuộc tính bị bỏ im lặng): ${thieu.join(' ')}`);
});

test('mọi lớp IdeClient dùng đều được khai trong ide.module.css', () => {
  const dung = new Set([...tsx.matchAll(/styles\.([A-Za-z][\w]*)/g)].map((m) => m[1]));
  const khai = new Set([...css.matchAll(/\.([A-Za-z][\w]*)/g)].map((m) => m[1]));
  const thieu = [...dung].filter((c) => !khai.has(c));
  assert.deepEqual(
    thieu,
    [],
    `lớp được dùng mà CSS không khai (phần tử đó vẽ không style): ${thieu.join(' ')}`,
  );
});
