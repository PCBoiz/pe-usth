/**
 * TƯƠNG PHẢN CỦA KHỐI CODE — tính từ chính `studio-tokens.css`, không chép số.
 *
 * ── VÌ SAO ───────────────────────────────────────────────────────────────
 * Khối code đổi từ bảng xanh lạnh sang bảng nâu ấm (theme lofi chill nhóm đã
 * chốt — xem commit 070886a). Bảng mới có số đẹp HÔM NAY: 6,04 đến 13,81:1.
 * Nhưng màu là thứ người ta chỉnh bằng mắt, và "nhạt đi một chút cho dịu" là
 * việc rất dễ làm — rồi chú thích vẫn ghi con số cũ, vì chú thích không tự
 * tính lại. Ca này tính lại.
 *
 * Nó ĐỌC FILE rồi tự tính, KHÔNG giữ một bảng giá trị thứ hai. Bài học vừa
 * học trong chính phiên này: `da-nap-hash-sync.spec.ts` bản đầu tự chép hàm
 * băm vào spec, và khi ablate thì cả ba ca vẫn xanh vì nó không đụng tới file
 * nó định canh.
 *
 * ── NGƯỠNG, VÀ VÌ SAO LÀ SÀN CHỨ KHÔNG PHẢI SỐ ĐÚNG ──────────────────────
 * AA cho chữ thường là 4,5:1 (WCAG 2.1 §1.4.3). Ca này đòi ≥ 4,5 cho MỌI màu
 * cú pháp, cộng một SÀN RIÊNG cho bảng đang dùng ở mức thấp hơn số đo thật
 * một chút. Ghim đúng số đo thật thì đổi một màu là đỏ oan; không ghim gì thì
 * tụt dần tới 4,51:1 mà không ai thấy. Sàn ở giữa: chỉ được NÂNG.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(
  join(__dirname, '..', '..', 'public', 'static', 'css', 'studio-tokens.css'),
  'utf8',
);

/** WCAG 2.1 §1.4.3 — không có thư viện nào, công thức ngắn hơn việc thêm gói. */
const kenh = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const sang = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * kenh(r) + 0.7152 * kenh(g) + 0.0722 * kenh(b);
};
const tiSo = (a, b) => {
  const [x, y] = [sang(a), sang(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Thân của một khối selector trong studio-tokens.css, hoặc null. */
function khoi(selector) {
  const i = CSS.indexOf(selector + ' {') >= 0
    ? CSS.indexOf(selector + ' {')
    : CSS.indexOf(selector + '{');
  return i >= 0 ? CSS.slice(i, CSS.indexOf('\n}', i)) : null;
}

/** Khai báo CUỐI CÙNG của một token trong một thân khối (CSS sau đè CSS trước). */
function khai(than, ten) {
  if (!than) return null;
  const hit = [...than.matchAll(new RegExp(`${ten}\\s*:\\s*([^;]+);`, 'g'))];
  return hit.length ? hit[hit.length - 1][1].trim() : null;
}

/**
 * Giá trị CUỐI CÙNG của một token, SAU khi giải bí danh.
 *
 * Bảng v2 chia HAI TẦNG: `:root` giữ mã màu `--ds-*`, `body` giữ `--st-*` làm
 * BÍ DANH trỏ vào chúng. Bản đầu của hàm này chỉ đọc `:root` và chỉ nhận mã màu
 * TRỰC TIẾP, nên lúc bảng chuyển sang hai tầng thì **3 ca ĐỎ với ":root không có
 * --st-code-bg"** trong khi màu vẫn đúng y nguyên (`--ds-code-bg` = `#221A13`,
 * trùng từng ký tự với bảng cũ). Một cổng BÁO OAN là một cổng sẽ bị tắt, nên nó
 * phải biết đi tiếp qua `var(--ds-…)`.
 *
 * ĐÚNG MỘT NẤC, cố ý: bí danh trỏ vào bí danh là bảng đang tự vòng vo, và lúc đó
 * cổng phải ĐỎ chứ không đoán tiếp — đoán tiếp là cách một cổng tự khai khống
 * rằng nó hiểu bảng.
 */
function token(selector, ten) {
  // `:root` KHÔNG chứa `--st-*` ở bảng hai tầng, nên phần NGÀY đọc cả `body`.
  // Chỉ `:root` mới gộp: `body.dark` vẫn là khối riêng, gộp nó là trộn hai chế độ.
  const than = selector === ':root'
    ? [khoi(':root'), khoi('body')].filter(Boolean).join('\n')
    : khoi(selector);
  assert.ok(than, `không tìm thấy khối ${selector} trong studio-tokens.css`);
  let v = khai(than, ten);
  const biDanh = v && v.match(/^var\((--[a-z0-9-]+)\)$/);
  if (biDanh) {
    // Ban đêm: `body.dark` khai lại `--ds-*`, nên tra ở đó TRƯỚC rồi mới về `:root`.
    v = selector === 'body.dark'
      ? khai(khoi('body.dark'), biDanh[1]) ?? khai(khoi(':root'), biDanh[1])
      : khai(khoi(':root'), biDanh[1]);
  }
  // Token KHÔNG được khai ở khối này → null, và đó là câu trả lời hợp lệ: chỗ gọi
  // dùng `?? token(':root', …)` để rơi về bảng ngày.
  if (v === null) return null;
  // Nhưng ĐÃ KHAI mà giải ra không phải mã màu thì cổng đang MÙ, không phải
  // "không có". Ablate đã đo: trỏ `--ds-code-kw` vào `var(--ds-code-fg)` (bí danh
  // hai nấc) → bản trước trả null, chỗ gọi `??` nuốt mất, **0 ca đỏ**. Một cổng
  // im lặng khi nó không đọc được bảng là cổng tự khai khống rằng nó hiểu bảng.
  assert.match(
    v,
    /^#[0-9a-fA-F]{6}$/,
    `${ten} ở ${selector} khai "${v}" — cổng không giải được thành mã màu. `
      + 'Bí danh chỉ được đi MỘT nấc (--st-* → --ds-*); hai nấc thì sửa bảng, '
      + 'đừng dạy cổng đoán tiếp.',
  );
  return v;
}

/** Màu cú pháp + SÀN riêng. Chỉ được NÂNG, không được hạ. */
const CU_PHAP = [
  ['--st-syn-plain', 12.0],
  ['--st-syn-keyword', 8.0],
  ['--st-syn-string', 10.0],
  ['--st-syn-number', 7.0],
  ['--st-syn-comment', 5.5],
  ['--st-code-meta', 7.5],
];
const AA = 4.5;

for (const che of [':root', 'body.dark']) {
  test(`khối code ở ${che}: mọi màu cú pháp vượt AA và vượt sàn riêng`, () => {
    const nen = token(che, '--st-code-bg') ?? token(':root', '--st-code-bg');
    assert.ok(nen, `${che} không có --st-code-bg`);

    const duoi = [];
    for (const [ten, san] of CU_PHAP) {
      const mau = token(che, ten) ?? token(':root', ten);
      if (!mau) continue; // token không khai lại ở chế độ này thì thừa hưởng
      const r = tiSo(mau, nen);
      if (r < AA) duoi.push(`${ten} ${mau} chỉ ${r.toFixed(2)}:1 — DƯỚI AA ${AA}`);
      else if (r < san) duoi.push(`${ten} ${mau} ${r.toFixed(2)}:1 < sàn ${san}`);
    }
    assert.deepEqual(duoi, [], duoi.join('\n'));
  });
}

test('bảng code là NÂU ẤM, không phải xanh lạnh — kênh đỏ ≥ kênh xanh dương', () => {
  // Ghim chính cái QUYẾT ĐỊNH, không ghim mã màu: một bản "chỉnh lại cho hợp
  // tông xanh của trang" sẽ qua được mọi phép kiểm tương phản ở trên mà vẫn
  // phá đúng thứ theme này mang lại. Nền nâu thì R > B; nền navy thì B > R.
  for (const che of [':root', 'body.dark']) {
    const nen = (token(che, '--st-code-bg') ?? token(':root', '--st-code-bg')).replace('#', '');
    const r = parseInt(nen.slice(0, 2), 16);
    const b = parseInt(nen.slice(4, 6), 16);
    assert.ok(r >= b, `${che}: nền code #${nen} có B(${b}) > R(${r}) — đã quay về bảng lạnh`);
  }
});

/**
 * BÓNG THẺ phải ẤM và BÁM SÁT — ghim QUYẾT ĐỊNH, không ghim chuỗi CSS.
 *
 * Bóng là thứ không có tương phản để đo, nên mọi phép kiểm ở trên mù với nó.
 * Mà nó lại là một trong ba thứ còn lệch thật giữa main và bảng lofi (bảng
 * MÀU bề mặt thì đã trùng nhau từng mã: #eaeff6 · #0f1b33 · #3a4a66 · #ffffff).
 * Bản cũ `0 10px 30px rgba(113,132,167,.10)` là bóng XANH LẠNH toả rộng — thẻ
 * nổi lên như hộp thoại; bóng nâu bám sát thì thẻ nằm TRÊN giấy.
 *
 * Hai tính chất, không phải một chuỗi: (1) ở chế độ NGÀY màu bóng phải ấm
 * (R >= B); (2) độ toả không được vượt 24px ở cả hai chế độ. Ghim nguyên chuỗi
 * thì đổi 6px thành 7px là đỏ oan; ghim tính chất thì "làm mềm lại cho giống
 * bản cũ" mới đỏ.
 */
const THEME = readFileSync(
  join(__dirname, '..', '..', 'public', 'static', 'css', 'edu-theme.css'),
  'utf8',
);

test('bóng thẻ: ngày phải ẤM, và cả hai chế độ phải BÁM SÁT (toả <= 24px)', () => {
  const hit = [...THEME.matchAll(/--edu-card-shadow:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.equal(hit.length, 2, 'phải có đúng 2 khai báo --edu-card-shadow (ngày + Ban đêm)');

  const [ngay, dem] = hit;
  const toa = (css) => Number(css.match(/\d+px\s+(\d+)px/)[1]);
  assert.ok(toa(ngay) <= 24, 'bóng ban ngày toả ' + toa(ngay) + 'px — đã quay về bóng toả rộng');
  assert.ok(toa(dem) <= 24, 'bóng Ban đêm toả ' + toa(dem) + 'px');

  const rgb = ngay.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  assert.ok(rgb, 'bóng ban ngày phải dùng rgba() để đọc được màu');
  const [r, , b] = [rgb[1], rgb[2], rgb[3]].map(Number);
  assert.ok(r >= b, 'bóng ban ngày R(' + r + ') < B(' + b + ') — đã quay về bóng xanh lạnh');
});

/**
 * VIỀN THẺ — và trước hết là một LỚP LỖI, không phải một mã màu.
 *
 * `ShellB.module.css` viết `border: var(--edu-card-border)`. Token đó là một
 * MÀU, còn shorthand `border` đặt lại mọi longhand bị bỏ về giá trị đầu, tức
 * `border-style: none`. Đo trong Chrome: `border-top-width` **0px**,
 * `border-top-style` **none**. Vỏ của MỌI màn bài học (179 bài) chỉ có bóng,
 * không có cạnh — và không một phép kiểm nào thấy, vì CSS sai cú pháp không
 * ném gì, nó chỉ bị DROP.
 *
 * Nên ca đầu quét CẢ cây CSS tìm lớp lỗi ấy, không chỉ canh ShellB. Phải loại
 * các dòng ĐỊNH NGHĨA biến (`--border: var(--x)`) — ở đó gán một màu vào một
 * custom property là chuyện bình thường, chỉ `border:` thật mới hỏng.
 *
 * Ca thứ hai canh MÀU: `--edu-card-border` (trắng .85) là viền SÁNG có chủ
 * đích trên nền KHÔNG-trắng của các trang di sản, nhưng thẻ bài học có nền
 * `--edu-panel-bg` rgba(255,255,255,.96) ⇒ trắng-trên-trắng, vẽ ra cũng không
 * ai thấy. Nên đường kẻ của thẻ phải TỐI HƠN nền thẻ. Đó là tính chất, không
 * phải mã màu: đổi #CFD9E8 sang một xám khác vẫn xanh, "sửa lại cho hợp tông
 * sáng" mới đỏ.
 *
 * KHÔNG đòi 3:1 cho đường kẻ này. Chú thích gốc của `--ds-line` trong bảng
 * lofi nói rõ 1,36:1 trên thẻ và dặn KHÔNG dùng nó làm viền của thứ bấm được;
 * WCAG 1.4.11 đòi 3:1 cho thành phần giao diện, còn đường bao một thẻ nội dung
 * là TRANG TRÍ. Đòi 3:1 ở đây là biến một cổng đúng thành một cổng kêu oan.
 */
const liet = (d, ra = []) => {
  for (const m of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, m.name);
    if (m.isDirectory()) liet(p, ra);
    else if (m.name.endsWith('.css')) ra.push(p);
  }
  return ra;
};
const CSS_CAY = [
  ...liet(join(__dirname, '..', '..', 'src')),
  ...liet(join(__dirname, '..', '..', 'public', 'static', 'css')),
];

test('border/outline shorthand KHÔNG được chỉ có một var MÀU (trình duyệt DROP nó)', () => {
  // QUÉT THEO KHAI BÁO, KHÔNG THEO DÒNG. Bản đầu của tôi neo regex vào cả
  // dòng đã trim — và ablate cho thấy nó RỖNG: gieo
  // `.ablate-x { outline: var(--edu-card-border); }` vào edu-lesson.css thì
  // 0 ca đỏ, vì CSS của repo này viết một rule MỘT DÒNG
  // (`.cal-day { border-radius: 14px !important; }`) nên khai báo gần như
  // không bao giờ đứng riêng một dòng. Cắt theo `;` sau khi bỏ chú thích mới
  // chạm tới mọi khai báo, bất kể tác giả xuống dòng thế nào.
  const xau = [];
  for (const p of CSS_CAY) {
    const v = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const ten = p.split(/[\\/]/).pop();
    for (const raw of v.split(';')) {
      // bỏ phần selector / dấu ngoặc đứng TRƯỚC khai báo trên cùng một dòng
      const t = raw.slice(Math.max(raw.lastIndexOf('{'), raw.lastIndexOf('}')) + 1).trim();
      // ĐỊNH NGHĨA biến thì bỏ qua: `--border: var(--x)` là gán một màu vào
      // custom property, hoàn toàn hợp lệ — có 5 chỗ trong repo làm vậy.
      if (t.startsWith('--')) continue;
      if (/^(border|outline)(-(top|right|bottom|left))?:\s*var\(--[a-z0-9-]+\)$/i.test(t)) {
        xau.push(`${ten}  ${t}`);
      }
    }
  }
  assert.deepEqual(
    xau,
    [],
    'shorthand chỉ có màu ⇒ border-style: none ⇒ KHÔNG VẼ GÌ. Ghi đủ width + style:\n  ' +
      xau.join('\n  '),
  );
});

test('đường kẻ của thẻ bài học phải TỐI HƠN nền thẻ (trắng-trên-trắng là vô hình)', () => {
  const hit = [...THEME.matchAll(/--edu-card-line:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.equal(hit.length, 2, 'phải có đúng 2 khai báo --edu-card-line (ngày + Ban đêm)');

  // Ban ngày: nền thẻ là trắng (--edu-panel-bg rgba(255,255,255,.96) trên
  // --edu-bg-solid #eaeff6), nên đường kẻ phải sáng THẤP HƠN hẳn.
  const L = (hex) => sang(hex);
  assert.ok(
    L(hit[0]) < L('#ffffff') - 0.1,
    'đường kẻ ban ngày ' + hit[0] + ' sáng gần bằng nền thẻ trắng — lại vô hình',
  );

  // Ban đêm thì NGƯỢC: nền thẻ tối (--edu-panel-bg-solid #1d232d), đường kẻ
  // phải sáng hơn nó. Hai chiều khác nhau, nên phải kiểm riêng từng chế độ —
  // một phép kiểm "khác nền" chung sẽ cho qua một đường kẻ tối hơn cả nền tối.
  assert.ok(
    L(hit[1]) > L('#1d232d'),
    'đường kẻ Ban đêm ' + hit[1] + ' tối hơn nền thẻ #1d232d — không thấy được',
  );
});

test('ShellB .card phải vẽ viền bằng --edu-card-line, không bằng --edu-card-border', () => {
  const v = readFileSync(
    join(__dirname, '..', '..', 'src', 'components', 'lesson-chrome', 'ShellB.module.css'),
    'utf8',
  );
  const khoi = v.slice(v.indexOf('.card {'), v.indexOf('}', v.indexOf('.card {')));
  assert.match(
    khoi,
    /border:\s*1px\s+solid\s+var\(--edu-card-line\)/,
    '.card của vỏ bài học phải có width + style + --edu-card-line',
  );
});

/**
 * HAI THANH STICKY của vỏ bài học phải có CẠNH.
 *
 * `.topBar` và `.bottomBar` của `LessonChrome` — vỏ mà `StudioLesson` dựng cho
 * MỌI màn của 179 bài — dùng nền `--edu-panel-bg-solid` #ffffff, mà thẻ nội
 * dung cũng #ffffff. Đo: tương phản **1,000:1**, tức CÙNG MỘT MÀU. Cả hai
 * sticky, nội dung cuộn LỌT xuống dưới chúng, và không thanh nào có border
 * hay box-shadow ⇒ chữ trôi vào thanh rồi biến mất, không gì nói ranh giới.
 *
 * ĐÃ ĐO VÀ BỎ một cách sửa khác, nên đừng dựng lại: chuyển thanh sang tầng
 * "paper" #F7FAFD của bảng lofi chỉ cho **1,048:1** so với thẻ — vẫn không ai
 * thấy. Màu nền không tách được hai mặt phẳng ở khoảng này.
 *
 * Ca này ghim TÍNH CHẤT, không ghim mã màu hay chuỗi CSS: một mặt phẳng
 * sticky mà nền trùng với mặt dưới nó thì PHẢI có cạnh hoặc bóng. "Bỏ cạnh
 * cho phẳng, cho gọn" là việc rất dễ làm.
 */
const CHROME = readFileSync(
  join(__dirname, '..', '..', 'src', 'components', 'lesson-chrome', 'LessonChrome.module.css'),
  'utf8',
);

test('thanh sticky của vỏ bài học phải có cạnh (nền trùng màu với thẻ: 1,000:1)', () => {
  const khoi = (ten) => {
    const i = CHROME.indexOf(`.${ten} {`);
    assert.ok(i >= 0, `không còn quy tắc .${ten} — đổi tên thì sửa ca này`);
    return CHROME.slice(i, CHROME.indexOf('}', i));
  };

  // Regex viết THẲNG, không dựng từ chuỗi: `new RegExp(\`${canh}:\\s*…\`)` là
  // một lớp thoát nữa phải đếm đúng, và lần đầu tôi đếm sai — pattern thành
  // `border-bottom:s*1px…`, ca ĐỎ trong khi CSS đã đúng.
  for (const [ten, canh, re] of [
    ['topBar', 'border-bottom', /border-bottom:\s*1px\s+solid\s+var\(--edu-card-line\)/],
    ['bottomBar', 'border-top', /border-top:\s*1px\s+solid\s+var\(--edu-card-line\)/],
  ]) {
    const k = khoi(ten);
    // Nếu một ngày thanh đổi sang nền KHÁC hẳn thẻ thì cạnh mới là tuỳ chọn —
    // nhưng chừng nào còn dùng chung --edu-panel-bg-solid thì nó là bắt buộc.
    assert.match(
      k,
      /background:\s*var\(--edu-panel-bg-solid\)/,
      `.${ten} đổi nền rồi — đo lại tương phản với thẻ trước khi sửa ca này`,
    );
    assert.ok(
      re.test(k) || /box-shadow:\s*[^;]*\S/.test(k),
      `.${ten} trùng màu với thẻ (1,000:1) mà không có ${canh} lẫn box-shadow — ` +
        'nội dung cuộn vào nó sẽ biến mất không dấu vết',
    );
  }
});

/* --edu-panel-border là viền của thẻ TRANG CHỦ và TRANG KHOÁ HỌC (home.module
 * .css 2 chỗ, ide.module.css, CodeVisualizer.module.css, edu-theme.css 3 chỗ).
 *
 * Đo 04/11/2026: ban ngày nó là rgba(255,255,255,.9) phủ lên thẻ #ffffff, tức
 * ra ĐÚNG #ffffff — **1,000:1**, cùng MỘT màu. Đây là lần thứ HAI cùng một lỗi
 * (ShellB .card là lần đầu), nên nó cần một cổng chứ không phải thêm một lần
 * sửa tay.
 *
 * Ca này ghim CẤU TRÚC chứ không ghim mã màu: panel-border phải DÙNG CHUNG
 * token với card-line. Phép chứng minh "đường kẻ đó có thấy được không" đã nằm
 * ở ca trên và kiểm cả hai chiều ngày/đêm — nuôi một màu thứ hai ở đây là nuôi
 * một thứ sẽ trôi khỏi nó. */
test('viền thẻ trang công khai phải dùng chung --edu-card-line (trắng-trên-trắng là 1,000:1)', () => {
  const hit = [...THEME.matchAll(/--edu-panel-border:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.equal(hit.length, 2, 'phải có đúng 2 khai báo --edu-panel-border (ngày + Ban đêm)');
  for (const [i, v] of hit.entries()) {
    assert.equal(
      v,
      'var(--edu-card-line)',
      `--edu-panel-border #${i + 1} là ${v} — phải là var(--edu-card-line). `
        + 'Một màu riêng ở đây sẽ trôi khỏi đường kẻ của thẻ bài học, và bản cũ '
        + 'rgba(255,255,255,.9) đo được ĐÚNG 1,000:1 trên thẻ trắng.',
    );
  }
});

/* Bóng của mặt NỔI. Khác --edu-card-shadow ở hình dạng (20/50 vì nó là mặt
 * nổi, không phải thẻ nằm trên giấy) nên KHÔNG áp trần toả 24px ở đây — chỉ
 * áp đúng cái quyết định của bảng lofi: ban ngày bóng phải ẤM. Ca cũ chỉ canh
 * --edu-card-shadow, nên bóng này ở lại xanh lạnh suốt hai vòng. */
test('bóng mặt nổi: ngày phải ẤM (R >= B), không phải xanh lạnh', () => {
  const hit = [...THEME.matchAll(/--edu-panel-shadow:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.equal(hit.length, 2, 'phải có đúng 2 khai báo --edu-panel-shadow');
  const rgb = hit[0].match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  assert.ok(rgb, 'bóng ban ngày phải dùng rgba() để đọc được màu: ' + hit[0]);
  const [r, , b] = rgb.slice(1).map(Number);
  assert.ok(r >= b, `bóng mặt nổi ban ngày R(${r}) < B(${b}) — đã quay về bóng xanh lạnh`);
});

/* NỀN TRANG là bề mặt LỚN NHẤT, nên nó quyết định trang đọc ra "lofi" hay
 * "bố cục xanh–đỏ cũ" hơn mọi thẻ cộng lại.
 *
 * Đo trên production 04/11/2026, SAU khi viền thẻ đã sửa: `body` vẫn vẽ
 * rgba(255,90,110,.20) đỏ góc trên-phải + rgba(79,141,255,.30) xanh góc
 * dưới-trái đè lên #eaeff6 — tức chủ dự án nhìn vào vẫn thấy hồng/tím.
 *
 * Ca này ghim TÍNH CHẤT: mọi màu trong --edu-bg-image phải TRUNG TÍNH, đo
 * bằng |R - B|. Giấy lofi lệch 6–16; đỏ brand lệch 145, xanh brand lệch 176.
 * Ghim nguyên chuỗi CSS thì đổi một mốc dốc là đỏ oan. */
const TRAN_LECH_KENH_NEN = 24; // CHỈ ĐƯỢC HẠ — nới là mời mesh brand quay lại

test('nền trang phải TRUNG TÍNH, không mang quầng xanh–đỏ của bảng cũ', () => {
  const hit = [...THEME.matchAll(/--edu-bg-image:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.equal(hit.length, 2, 'phải có đúng 2 khai báo --edu-bg-image (ngày + Ban đêm)');
  for (const [i, v] of hit.entries()) {
    const che = i === 0 ? 'ngày' : 'Ban đêm';
    const mau = [
      ...[...v.matchAll(/#([0-9a-f]{6})/gi)].map((m) => [0, 2, 4].map((k) => parseInt(m[1].slice(k, k + 2), 16))),
      ...[...v.matchAll(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)].map((m) => m.slice(1, 4).map(Number)),
    ];
    assert.ok(mau.length >= 2, `--edu-bg-image ${che} không đọc được màu nào: ${v.slice(0, 60)}`);
    for (const [r, , b] of mau) {
      assert.ok(
        Math.abs(r - b) <= TRAN_LECH_KENH_NEN,
        `nền ${che} có màu rgb(${r}, _, ${b}) lệch kênh ${Math.abs(r - b)} `
          + `> ${TRAN_LECH_KENH_NEN} — đó là quầng brand, không phải giấy lofi.`,
      );
    }
  }
});

/* Nửa còn lại của cùng một lỗi: hai quầng bám chuột cũng tô xanh–đỏ lên MỌI
 * trang. Sửa mỗi nền thì chúng vẫn chạy theo con trỏ, tức bản sửa trông như
 * xong mà trang vẫn không phải lofi. Đã xoá hẳn — tô lại bằng màu trung tính
 * trên giấy sáng chỉ thành một vệt mờ bẩn. */
test('không còn quầng sáng bám chuột vẽ trên <html>', () => {
  assert.ok(
    !/html\.edu-fx\s*::?(before|after)/.test(THEME),
    'html.edu-fx::before/::after đã quay lại — hai quầng brand bám con trỏ '
      + 'là nửa còn lại của mesh xanh–đỏ, xem chú thích trong edu-theme.css.',
  );
  // Nửa JS của cùng hiệu ứng: gỡ phần VẼ mà để vòng rAF ghi --ax/--ay/--bx/--by
  // lên <html> thì mỗi khung chuột di chuyển là tính lại style CẢ TRANG cho một
  // thứ không ai đọc — đo trên /courses: 161 ms/s style, 23% luồng chính. Biến
  // của thẻ/nút (--cx, --mx…) ghi lên CHÍNH phần tử đó thì không bị cấm.
  const FX = readFileSync(join(__dirname, '..', '..', 'public', 'static', 'js', 'edu-fx.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((d) => !d.trimStart().startsWith('//')).join('\n');
  assert.ok(
    !/(root|documentElement)\.style\.setProperty\(/.test(FX),
    'edu-fx.js lại ghi biến CSS lên <html> — biến khai trên gốc thì MỌI phần tử '
      + 'thừa kế, nên mỗi lần ghi là tính lại style cả trang.',
  );
});

/* TRANG CHỦ KHÔNG ĐƯỢC DÙNG BẢNG BRAND XANH–ĐỎ NỮA.
 *
 * Màu TĨNH của trang đã sang lofi từ mấy vòng trước, nhưng lớp TƯƠNG TÁC thì
 * không: rê chuột lên thẻ khoá học là một viền gradient xanh→đỏ (`--edu-g-brand`)
 * cộng quầng `--edu-brand-glow` = rgba(37,99,235,.34) + rgba(229,51,75,.22) loé
 * lên; nút "Viết đánh giá" thì nền gradient brand. Thứ loé ở MỌI lần rê chuột
 * quyết định trang "đọc ra" bảng nào mạnh hơn cả màu tĩnh — và đó đúng là lý do
 * chủ dự án vẫn thấy giao diện cũ sau ba vòng sửa màu nền.
 *
 * Ca này cấm bốn token brand trong KHAI BÁO của home.module.css. Chú thích thì
 * được: chúng ghi lại cái đã bỏ và vì sao, mà một cổng cấm cả chú thích sẽ bắt
 * người ta xoá đúng phần giải thích.
 */
/* Mặt nào ĐÃ chuyển sang lofi thì không được lùi. Danh sách này CHỈ ĐƯỢC DÀI
 * THÊM: mỗi vòng chuyển xong một bề mặt là thêm một dòng, không bao giờ bớt.
 * Đo trên production trước khi thêm — quét MỌI phần tử đang VẼ RA màu brand,
 * không đếm grep: trang khoá học có **22 chỗ thật**, còn grep trên 8 file CSS
 * nó nạp thì ra 128, vì phần lớn selector là dashboard/forum di sản không
 * trang nào render. */
const DA_SANG_LOFI = [
  // Dòng này từng là `src/app/home.module.css`. Từ 4d5f86d trang chủ là cảnh
  // Góc học và file đó không còn ai nạp — đã XOÁ cùng `CatalogTile.tsx`, thành
  // phần duy nhất import nó. Dòng KHÔNG bớt đi mà trỏ sang bề mặt đang LÀ trang
  // chủ, để danh sách vẫn chỉ dài thêm. (Ca "chip trang chủ nền đục" cùng file
  // thì đã gỡ: hai chip nó canh chỉ sống trong file đã xoá — xem AGENTS.md.)
  ['src/components/goc-hoc/scene.css',
    readFileSync(join(__dirname, '..', '..', 'src', 'components', 'goc-hoc', 'scene.css'), 'utf8')],
  ['public/static/css/edu-course-detail.css',
    readFileSync(join(__dirname, '..', '..', 'public', 'static', 'css', 'edu-course-detail.css'), 'utf8')],
  ['src/components/CourseShell.module.css',
    readFileSync(join(__dirname, '..', '..', 'src', 'components', 'CourseShell.module.css'), 'utf8')],
  // 04/11 — /ide (6ac5a0c, 19 khai báo brand → 0) và màn BÀI HỌC (7 file, tới
  // 18 phần tử brand mỗi màn → chỉ còn --ds-action ở nút chính). Thiếu các dòng
  // này thì hai bề mặt lớn nhất của sản phẩm không có gì chặn lùi về bảng cũ.
  ...[
    'src/app/ide/ide.module.css',
    'src/components/code-visualizer/CodeVisualizer.module.css',
    'src/components/lesson-chrome/LessonChrome.module.css',
    'src/components/lesson-chrome/ShellB.module.css',
    'src/components/lesson-chrome/LessonBrief.module.css',
    'src/components/lesson-chrome/TryItButton.module.css',
    'src/components/lesson-chrome/exercises/exercises.module.css',
    'src/components/python-studio/studio-chrome.module.css',
    'src/components/python-studio/review-quiz.module.css',
  ].map((p) => [p, readFileSync(join(__dirname, '..', '..', ...p.split('/')), 'utf8')]),
];

test('bề mặt đã sang lofi: lớp tương tác không còn token brand xanh–đỏ', () => {
  const CAM = ['--edu-g-brand', '--edu-brand-glow', '--edu-accent-grad', '--edu-accent'];
  for (const [ten, noiDung] of DA_SANG_LOFI) {
  // Bỏ chú thích /* … */ trước khi quét, để chỉ còn KHAI BÁO.
  const sach = noiDung.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const t of CAM) {
    const n = sach.split(`var(${t})`).length - 1;
    assert.equal(
      n, 0,
      `${ten} còn ${n} chỗ dùng var(${t}) — đó là bảng xanh–đỏ của bố `
        + 'cục TRƯỚC việc thiết kế. Bảng lofi có token đúng vai: --ds-action (nền '
        + 'nút chính), --ds-violet (vị trí/lựa chọn), --ds-mark-ochre (nhấn ấm).',
    );
  }
  }
});

/**
 * Thang chữ BAN NGÀY phải ẤM cả sáu bậc — và đây là ca bắt lỗi của đợt port.
 *
 * Đợt warm trước đổi t1 (#2A2018) và t2 (#4A3B2E) rồi DỪNG. Hệ quả đo được trên
 * màn "Đang tải bài học…" ngày 07/11/2026, bằng cách quét phần tử ĐANG VẼ ra màu
 * trong Chrome (grep đã sai 6:1 một lần, xem AGENTS.md): tiêu đề nâu #2A2018 ở
 * 25 phần tử, ngay cạnh chữ phụ XANH LẠNH #5b6a85 (t3, 4 phần tử) và #62718c
 * (t5, 4 phần tử). Cùng một màn, hai họ màu.
 *
 * Ca này ghim QUYẾT ĐỊNH (kênh đỏ >= kênh xanh dương), không ghim mã màu — cùng
 * khuôn ca "bảng code là NÂU ẤM" ở trên. Một bản "chỉnh lại cho hợp tông xanh"
 * sẽ qua hết mọi phép kiểm tương phản mà vẫn phá đúng thứ nhánh lofi mang lại.
 *
 * SÀN thì tính từ CHÍNH file CSS, không giữ bảng giá trị thứ hai (bài học
 * da-nap-hash-sync.spec.ts: bản đầu tự chép hàm băm vào spec rồi ablate vẫn
 * xanh). Mỗi bậc phải vượt mốc CŨ trên CẢ HAI mặt nó được vẽ lên — thẻ trắng và
 * giấy kem — vì t5 cũ chỉ 4,27:1 trên giấy, tức DƯỚI AA 4,5.
 *
 * BAN ĐÊM cố ý KHÔNG bị ca này kiểm: ở đó cả sáu bậc lạnh đồng nhất (t1 #e8eefb
 * cũng lạnh) và đều vượt AA (4,84–13,57 trên thẻ #1d232d), nên warm riêng t3–t6
 * ban đêm là TẠO ra đúng cái lệch mà ban ngày vừa xoá.
 */
const NGAY = THEME.slice(0, THEME.indexOf('body.dark {'));
const docToken = (ten) => {
  // Regex viết THẲNG, không dựng từ chuỗi: `new RegExp(`${ten}:\s*…`)` trong một
  // template literal biến `\s` thành chữ `s`, nên pattern thành `--edu-t1:s*…` và
  // KHÔNG khớp gì — đúng bẫy đã ghi ở ca thanh sticky và ca chip trang chủ.
  const i = NGAY.indexOf(ten + ':');
  assert.ok(i >= 0, `khối NGÀY của edu-theme.css không khai ${ten}`);
  const sau = NGAY.slice(i + ten.length + 1, i + ten.length + 40);
  const m = /^\s*(#[0-9a-fA-F]{6})\s*;/.exec(sau);
  assert.ok(m, `${ten} ở khối NGÀY khai "${sau.split(';')[0].trim()}" — không phải mã màu`);
  return m[1];
};
/** Sàn của t3–t6: [thẻ, giấy]. CHỈ ĐƯỢC NÂNG — xem scripts/nguong-mot-chieu.json. */
const SAN_THANG_NGAY = [
  // Sàn đặt THẤP HƠN số đo thật một nhịp, cố ý. Bản đầu ghim đúng con số cũ
  // (t3 5.46) và phép ablate cho thấy nó đỏ vì LÀM TRÒN float: trả t3 về chính
  // #5b6a85 — màu vẫn đạt sàn của nó — vẫn ra 2 ca đỏ thay vì 1, còn t6 cùng
  // tình huống lại ra 1. Một cổng đỏ không nhất quán là cổng sẽ bị tắt.
  // Riêng t5 giữ ĐÚNG 4.5: đó là AA, không phải một mốc cũ, và #806853 đo được
  // 4,52 nên vẫn còn biên.
  ['--edu-t3', 5.4, 4.7],
  ['--edu-t4', 5.6, 4.85],
  ['--edu-t5', 4.9, 4.5],
  ['--edu-t6', 6.6, 5.7],
];

test('thang chữ BAN NGÀY: cả sáu bậc ẤM (kênh đỏ >= kênh xanh dương)', () => {
  const lanh = [];
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const hex = docToken(`--edu-t${n}`).replace('#', '');
    const [r, , b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    if (r < b) lanh.push(`--edu-t${n} #${hex} có đỏ ${r} < xanh dương ${b}`);
  }
  assert.deepEqual(
    lanh, [],
    `${lanh.join('\n')}\nThang chữ ban ngày phải cùng một họ: đợt port trước dừng `
      + 'ở t2 và để t3–t6 xanh lạnh, nên một màn vẽ tiêu đề nâu ngay cạnh chữ phụ '
      + 'xanh. Giá trị mới nằm trên đường ấm t1→t2 (delta +32,+27,+22 mỗi bậc).',
  );
});

test('thang chữ BAN NGÀY: t3–t6 vượt sàn CŨ trên cả thẻ trắng và giấy kem', () => {
  const the = docToken('--edu-panel-bg-solid');
  const giay = docToken('--edu-bg-solid');
  const duoi = [];
  for (const [ten, sanThe, sanGiay] of SAN_THANG_NGAY) {
    const mau = docToken(ten);
    const a = tiSo(mau, the);
    const g = tiSo(mau, giay);
    if (a < AA) duoi.push(`${ten} ${mau} trên thẻ ${the} chỉ ${a.toFixed(2)}:1 — DƯỚI AA ${AA}`);
    else if (a < sanThe) duoi.push(`${ten} ${mau} trên thẻ ${a.toFixed(2)}:1 < sàn ${sanThe}`);
    if (g < AA) duoi.push(`${ten} ${mau} trên giấy ${giay} chỉ ${g.toFixed(2)}:1 — DƯỚI AA ${AA}`);
    else if (g < sanGiay) duoi.push(`${ten} ${mau} trên giấy ${g.toFixed(2)}:1 < sàn ${sanGiay}`);
  }
  assert.deepEqual(duoi, [], duoi.join('\n'));
});
