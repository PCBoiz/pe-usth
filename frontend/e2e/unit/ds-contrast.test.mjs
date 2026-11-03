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

/**
 * Giá trị CUỐI CÙNG của một token trong một khối selector.
 * Lấy lần khai SAU CÙNG: CSS sau đè CSS trước, và `body.dark` khai lại một số
 * token của `:root` — đọc lần đầu là đọc bảng ngày rồi tưởng đó là ban đêm.
 */
function token(selector, ten) {
  const i = CSS.indexOf(selector + ' {') >= 0
    ? CSS.indexOf(selector + ' {')
    : CSS.indexOf(selector + '{');
  assert.ok(i >= 0, `không tìm thấy khối ${selector} trong studio-tokens.css`);
  const than = CSS.slice(i, CSS.indexOf('\n}', i));
  const hit = [...than.matchAll(new RegExp(`${ten}\\s*:\\s*(#[0-9a-fA-F]{6})`, 'g'))];
  return hit.length ? hit[hit.length - 1][1] : null;
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
