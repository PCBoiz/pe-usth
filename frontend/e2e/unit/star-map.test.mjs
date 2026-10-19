/**
 * BẢN ĐỒ SAO — ca kiểm cho `src/lib/star-map.ts`, `scripts/star/build_sky.py`,
 * hai tệp SVG nó sinh ra, và route xem thử `/ban-do-sao`.
 *
 * Đặc tả: `design/v3/ban-do-sao.md` §9.6 (ba cái bẫy của chính kho mã này) và
 * §19.4 (ca so hai hồ sơ).
 *
 * ── VÌ SAO BỨC TRANH NÀY CẦN TEST CHỨ KHÔNG CHỈ CẦN XEM ────────────────
 *
 * Vì mọi cách nó hỏng đều hỏng IM LẶNG, và bản đồ vực đã trả giá cho từng
 * cái một:
 *
 *  1. `stroke-width` đi qua hàm làm tròn TOẠ ĐỘ thì mọi nét mảnh thành `0`.
 *     Cả bức vẫn render, vẫn ra một tệp đúng kích thước, chỉ là năm chục nghìn
 *     nét VÔ HÌNH — và nhìn ra đúng "mảng phẳng tô gradient", tức chính cái
 *     lỗi mà bản vẽ sinh ra để chữa. Không ngoại lệ nào được ném.
 *  2. Một mã màu ghi cứng trong Python không làm gì đỏ lên cả; nó chỉ làm
 *     bảng tương phản 4,5:1 / 3:1 của §5 thành một lời nói không đo lại được.
 *  3. Sao nền và sao bài lẫn vào nhau thì cả bản đồ thành nhiễu và 48 ngôi
 *     mang nghĩa biến mất trong đó — mà từng ngôi một vẫn "trông ổn".
 *  4. Nhãn chồng lên sao: bản đồ cũ không có ai kiểm nên nhãn M3 và M4 chồng
 *     nhau mà vẫn xuất ra file, và lời chê nhận về là "chữ hơi lệch".
 *  5. Một `id` thừa trong SVG là byte chết — tranh vào trang bằng `<img>` nên
 *     không selector nào với vào trong được. Ở bản vực luật này TỰ thi hành
 *     (ảnh nền cách ly); ở đâu có ngoại lệ thì phải có ca test canh.
 *
 * Mọi phép so dưới đây TỰ KIỂM trên một mẫu HỎNG dựng tay trước khi soi tệp
 * thật — ca xanh vì bộ phân tích câm là ca vô dụng.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as SM from '../../src/lib/star-map.ts';

const {
  placeStar,
  profileColors,
  starMagnitude,
  SKY_CONSTELLATION_KEYS,
  SKY_CONSTELLATIONS,
  SKY_FIELD,
  SKY_HIT,
  SKY_LABEL,
  SKY_LABEL_PLACED,
  SKY_LAYERS,
  SKY_LINK,
  SKY_MAGNITUDE,
  SKY_PROFILES,
  SKY_PROFILE_DARK,
  SKY_VIEW,
  STAR_COPY,
} = SM;

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOT = join(FE, '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

const REST = read('public', 'map', 'star', 'm1-rest.svg');
const FOCUS = read('public', 'map', 'star', 'm1-focus.svg');
const PY = readFileSync(join(ROOT, 'scripts', 'star', 'build_sky.py'), 'utf8');
const CSS = read('src', 'app', 'ban-do-sao', 'star-map.module.css');
const PAGE = read('src', 'app', 'ban-do-sao', 'page.tsx');
/**
 * Bỏ chú thích TRƯỚC khi soi: chú thích KỂ LẠI luật và phải được phép nhắc
 * tới chính thứ mà ca test đang cấm. Không có bước này thì ca "không có nhánh
 * `if profile == 'light'`" đỏ lên vì một chú thích GIẢI THÍCH vì sao không
 * được có nhánh ấy — tức ca test phạt đúng người viết tài liệu.
 */
const CSS_CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
const TSX_CODE = PAGE
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');
const PY_CODE = PY
  .replace(/"""[\s\S]*?"""/g, ' ')
  .replace(/^[ \t]*#.*$/gm, '')
  .replace(/[ \t]+#.*$/gm, '');

/** Đếm ký tự CƠ SỞ (bỏ dấu tổ hợp) — tiếng Việt có dấu nên `length` thô đếm
 *  lố, và bề rộng hộp chữ phải tính y hệt phía Python. */
const chuCaiCoSo = (s) => [...s.normalize('NFD')].filter((ch) => !/\p{M}/u.test(ch)).length;
const beRongChu = (s, size) => chuCaiCoSo(s) * SKY_LABEL.advance * size;

const P = SKY_PROFILE_DARK;
const M1 = SKY_CONSTELLATIONS[0];

/* ── bộ phân tích SVG, dùng chung ───────────────────────────────────── */

/** Nội dung của một lớp `<g data-lop="…">`. */
const lop = (svg, ten) => {
  const i = svg.indexOf(`<g data-lop="${ten}">`);
  if (i < 0) return '';
  const j = svg.indexOf('\n</g>', i);
  return svg.slice(i, j < 0 ? svg.length : j);
};

/** Mọi `<circle r="…">` trong một đoạn SVG. */
const vongTron = (s) => [...s.matchAll(/<circle cx="(-?[\d.]+)" cy="(-?[\d.]+)" r="([\d.]+)"\/>/g)]
  .map((m) => ({ x: +m[1], y: +m[2], r: +m[3] }));

/** Mọi giá trị `stroke-width` trong một đoạn SVG. */
const beRong = (s) => [...s.matchAll(/stroke-width="([^"]*)"/g)].map((m) => Number(m[1]));

/** Số ca chấm của từng bài, ĐẾM LẠI từ giáo trình — không chép từ TS. */
const LESSON_DIR = join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons');
const SO_CA = Object.fromEntries(
  readdirSync(LESSON_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(LESSON_DIR, f), 'utf8')))
    .map((d) => [d.lesson_code, (d.content_json ?? d).step_4?.tests?.length])
    .filter(([code, n]) => code && Number.isInteger(n)),
);

/** Mã bài của chặng M1, lấy từ `curricula.json` — nguồn mà trang khoá học đọc. */
const M1_CODES = JSON.parse(read('src', 'lib', 'curricula.json'))
  .CURRICULA.python_advanced.modules[0].lessons
  .map((t) => t.split('·')[0].trim());

/* ═══ 1 · BẢY NGÔI LÀ BẢY BÀI THẬT ═════════════════════════════════════ */

test('7 ngôi của M1 khớp ĐÚNG 7 mã bài của chặng M1 trong curricula.json', () => {
  // Tự kiểm: nếu tách mã bài hỏng thì cả ca này vô nghĩa.
  assert.deepEqual(M1_CODES.length, 7);
  assert.match(M1_CODES[0], /^P01$/);

  assert.deepEqual(M1.stars.map((s) => s.code), M1_CODES,
    'danh sách ngôi của M1 lệch với giáo trình — thêm/bớt bài mà quên bản đồ');
  // Và từng mã phải có thật trong gói bài đã dựng, không chỉ trong tên hiển thị.
  for (const code of M1_CODES) {
    assert.ok(Number.isInteger(SO_CA[code]),
      `bài ${code} không có trong out-advanced/lessons — bản đồ đang vẽ một bài không tồn tại`);
  }
  // Số ngôi vẽ ra PHẢI bằng số bài. Bản đồ sao thật cho phép thêm một ngôi mờ
  // cho hình dễ nhớ (H. A. Rey làm thế với chòm Song Tử); ở đây CẤM — mỗi ngôi
  // là một bài, và một ngôi "thêm cho đẹp hình" biến con số 48 thành một con
  // số không đếm được.
  assert.equal(vongTron(lop(REST, 'sao-bai')).length, 7);
  assert.equal(vongTron(lop(REST, 'loi-sao')).length, 7);
});

/* ═══ 2 · BẬC SÁNG ĐẾN TỪ SỐ CA CHẤM ═══════════════════════════════════ */

test('bán kính mỗi ngôi khớp số ca chấm đọc từ out-advanced, không phải một con số chọn cho đẹp', () => {
  // Tự kiểm công thức: hàm MŨ, nên hai bậc liền nhau cách nhau đúng `ratio`.
  const r3 = starMagnitude(9).radius;
  const r4 = starMagnitude(8).radius;
  assert.ok(Math.abs(r3 / r4 - SKY_MAGNITUDE.ratio) < 0.01,
    'thang bán kính không còn là thang mũ');
  assert.equal(starMagnitude(19).tier, 1);
  assert.equal(starMagnitude(6).tier, 5);

  const than = vongTron(lop(REST, 'sao-bai'));
  const mong = M1.stars.map((s) => {
    const { x, y } = placeStar(M1, s);
    return { code: s.code, x, y, r: starMagnitude(SO_CA[s.code]).radius * P.scale.star };
  });
  for (const m of mong) {
    const v = than.find((c) => Math.abs(c.x - m.x) < 1.5 && Math.abs(c.y - m.y) < 1.5);
    assert.ok(v, `không tìm thấy ngôi ${m.code} ở (${Math.round(m.x)}, ${Math.round(m.y)})`);
    assert.ok(Math.abs(v.r - m.r) < 0.02,
      `ngôi ${m.code} có ${SO_CA[m.code]} ca chấm ⇒ bán kính ${m.r}, nhưng SVG vẽ ${v.r}`);
  }
  // Và thang phải THẬT SỰ phân bậc: ngôi sáng nhất của M1 (P05, 12 ca) to hơn
  // hẳn ngôi mờ nhất (P07, 6 ca). Nếu không thì "bậc độ sáng" chỉ là lời nói.
  const rMax = Math.max(...than.map((c) => c.r));
  const rMin = Math.min(...than.map((c) => c.r));
  assert.ok(rMax / rMin > 1.5, `chênh lệch bậc chỉ ${(rMax / rMin).toFixed(2)}× — không đọc ra`);
});

/* ═══ 3 · KHE TRỐNG GIỮA SAO NỀN VÀ SAO BÀI ════════════════════════════ */

test('không một ngôi nào có bán kính trong khoảng (1,20 ; 2,20) — hàng rào chính của §7.2', () => {
  const lo = SKY_FIELD.radius;
  const hi = SKY_MAGNITUDE.base;
  // Tự kiểm khoảng: hai đầu khoá phải là hai con số THẬT của hai quần thể.
  assert.equal(lo, 1.2);
  assert.equal(hi, 2.2);

  for (const c of vongTron(lop(REST, 'sao-bai'))) {
    assert.ok(c.r >= hi - 1e-9,
      `một ngôi mang nghĩa có bán kính ${c.r}, rơi vào khe trống — sao nền và sao bài`
      + ' sẽ lẫn vào nhau và 48 ngôi mang nghĩa biến mất trong nhiễu');
  }
  // Sao nền là CHẤM-BẰNG-NÉT: đường kính = bề rộng nét, nên bán kính của nó là
  // `stroke-width / 2`. Hàng rào 1 nói nó CỐ ĐỊNH ở 1,20 px (cho phép nở theo
  // phối cảnh khí quyển ở dải chân trời, nhưng không bao giờ chạm 2,20).
  const ds = beRong(lop(REST, 'truong-sao'));
  assert.ok(ds.length > 0, 'không có sao nền nào');
  for (const w of ds) {
    assert.ok(w / 2 >= lo - 0.01, `một sao nền chỉ có bán kính ${w / 2} — dưới sàn Stellarium 1,2 px`);
    assert.ok(w / 2 < hi, `một sao nền có bán kính ${w / 2}, chạm vào quần thể sao bài`);
  }
  // Hàng rào 2: sao nền dùng sắc TRUNG TÍNH LẠNH, không phải một trong tám sắc
  // khoáng. Một sắc khoáng ở đây là 1 250 ngôi giả làm bài học.
  assert.ok(lop(REST, 'truong-sao').includes(`stroke="${P.field}"`));
  for (const hue of Object.values(P.hues)) {
    assert.ok(!lop(REST, 'truong-sao').includes(hue), `sao nền dùng sắc khoáng ${hue}`);
  }
});

/* ═══ 4 · CÁI BẪY `stroke-width` ═══════════════════════════════════════ */

test('không một `stroke-width` nào bằng 0 — bẫy đã làm cả bản vực vô hình', () => {
  // Tự kiểm bộ phân tích trên một mẫu HỎNG dựng tay: đúng thứ `nf()` sinh ra.
  assert.deepEqual(beRong('<path stroke-width="0" d="M0 0"/>'), [0]);

  for (const [ten, svg] of [['rest', REST], ['focus', FOCUS]]) {
    const ds = beRong(svg);
    assert.ok(ds.length > 50, `${ten}: chỉ có ${ds.length} nhóm nét — tệp không có nội dung`);
    for (const w of ds) {
      assert.ok(Number.isFinite(w) && w > 0,
        `${ten}: có một \`stroke-width="${w}"\`. Bề rộng nét đã đi qua hàm làm tròn TOẠ ĐỘ:`
        + ' cả bức sẽ render với nét vô hình và nhìn ra đúng "mảng phẳng tô gradient".');
    }
    // Nét MỎNG NHẤT của đặc tả là nét lưới 0,6 px — nó phải còn sống sót.
    assert.ok(Math.min(...ds) <= 0.6 + 1e-9,
      `${ten}: nét mỏng nhất là ${Math.min(...ds)} — lưới toạ độ 0,6 px đã bị làm tròn lên`);
  }
});

/* ═══ 5 · KHÔNG MÃ MÀU NÀO Ở NGOÀI HỒ SƠ ══════════════════════════════ */

test('mọi mã màu trong SVG đều có tên trong hồ sơ TS', () => {
  const ten = new Set(profileColors(P));
  // Tự kiểm: một màu lạ dựng tay phải bị bắt.
  assert.ok(!ten.has('#123456'));

  for (const [nhan, svg] of [['rest', REST], ['focus', FOCUS]]) {
    const found = [...svg.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0].toUpperCase());
    assert.ok(found.length > 5, `${nhan}: không tìm thấy mã màu nào — bộ phân tích câm`);
    for (const hex of new Set(found)) {
      assert.ok(ten.has(hex),
        `${nhan}: màu ${hex} không có tên trong SKY_PROFILE_DARK. Màu lạc là màu KHÔNG`
        + ' ĐO ĐƯỢC tương phản, mà cả bảng 4,5:1 / 3:1 của §5 dựa vào việc đo được.');
    }
  }
});

test('build_sky.py không chứa một mã màu nào — §19.4 ca 14', () => {
  const hex = [...PY.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0]);
  assert.deepEqual(hex, [],
    `build_sky.py ghi cứng ${hex.length} mã màu (${hex.slice(0, 5).join(', ')}). Hồ sơ là thứ`
    + ' duy nhất được giữ màu; một mã trong Python là một chỗ bản tối và bản sáng trôi xa nhau.');
  // Và nó cũng không được ghi cứng toạ độ chòm: mọi con số hình thái ở TS.
  assert.ok(/grab\("SKY_CONSTELLATION_KEYS"\)/.test(PY) && /grab\("SKY_%s" % k\)/.test(PY),
    'build_sky.py không còn đọc danh sách chòm từ TS');
});

/* ═══ 6 · KHÔNG GRADIENT, KHÔNG BỘ LỌC ════════════════════════════════ */

test('tinh vân KHÔNG phải một gradient phủ, và không có `<filter>` nào xuống trình duyệt', () => {
  for (const [nhan, svg] of [['rest', REST], ['focus', FOCUS]]) {
    for (const xau of ['Gradient', 'gradient', '<filter', 'feTurbulence', 'feGaussianBlur']) {
      assert.ok(!svg.includes(xau),
        `${nhan}: có \`${xau}\`. "Mảng phẳng tô gradient" là lỗi đã bị loại lần đầu, và nó`
        + ' cũng là dấu hiệu AI rõ nhất; còn bộ lọc SVG thì WebKit không tăng tốc bằng GPU'
        + ' (bug 263848) và một bộ lọc rỗng cũng đủ làm Safari iOS sập (bug 191197).');
    }
    // Tinh vân phải là ĐƯỜNG ĐỒNG MỨC LỒNG NHAU — nhiều hình khép kín, mỗi
    // hình một độ mờ phẳng. Một `<rect>` phủ cả khung là bản "mảng phẳng".
    const tv = lop(svg, 'tinh-van');
    assert.ok((tv.match(/Z/g) ?? []).length >= 8,
      `${nhan}: lớp tinh vân chỉ có ${(tv.match(/Z/g) ?? []).length} hình khép kín`);
    assert.ok(!tv.includes('<rect'), `${nhan}: tinh vân có một hình chữ nhật phủ`);
  }
});

/* ═══ 7 · SVG BỊ CÁCH LY — KHÔNG `id`, KHÔNG `data-*` THỪA ════════════ */

test('không `id` và không `data-*` nào ngoài `data-lop` trong SVG', () => {
  for (const [nhan, svg] of [['rest', REST], ['focus', FOCUS]]) {
    assert.ok(!/\bid="/.test(svg),
      `${nhan}: SVG có \`id=\`. Tranh vào trang bằng <img> nên nó là một tài liệu RIÊNG bị`
      + ' cách ly: CSS của trang không khớp được selector nào bên trong, JS không'
      + ' `querySelector` vào được. Mọi `id` là byte chết tải ở mỗi lượt vào trang.');
    const data = new Set([...svg.matchAll(/\b(data-[\w-]+)=/g)].map((m) => m[1]));
    assert.deepEqual([...data], ['data-lop'], `${nhan}: có data-* thừa`);
  }
  // Và lớp phủ hover bám `[data-map-region]` ở HTML, không bám vào trong SVG.
  assert.match(TSX_CODE, /data-map-region=/);
  assert.match(TSX_CODE, /<img/);
});

test('thứ tự lớp trong SVG đúng bằng SKY_LAYERS — một danh sách duy nhất', () => {
  const thay = [...REST.matchAll(/<g data-lop="([^"]+)">/g)].map((m) => m[1]);
  assert.ok(thay.length >= 10, `chỉ thấy ${thay.length} lớp`);
  for (const t of thay) assert.ok(SKY_LAYERS.includes(t), `lớp "${t}" không có trong SKY_LAYERS`);
  const mong = SKY_LAYERS.filter((l) => thay.includes(l));
  assert.deepEqual(thay, mong,
    'thứ tự z trong tranh lệch với SKY_LAYERS — Azgaar đã trả giá cho việc chép thứ tự lớp'
    + ' ở ba chỗ mà "không có gì giữ cho ba chỗ ấy khớp nhau"');
});

/* ═══ 8 · HÌNH "CHẠC": RẼ ĐÔI RỒI CHỤM LẠI ════════════════════════════ */

test('hình Chạc: ≤ 12 nét, một thân, rẽ đôi ở P02, chụm lại ở P07', () => {
  assert.ok(M1.lines.length <= SKY_LINK.maxLines,
    `M1 có ${M1.lines.length} nét, vượt trần ${SKY_LINK.maxLines} — trên mức đó hình không nhớ được`);
  assert.equal(lop(REST, 'net-chom').match(/M-?\d/g).length, M1.lines.length,
    'số nét vẽ ra lệch với số nét khai trong TS');

  // Bậc của từng ngôi trong đồ thị nét nối. Đây là chỗ "rẽ đôi rồi chụm lại"
  // trở thành một khẳng định KIỂM ĐƯỢC chứ không phải một lời tả.
  const bac = Object.fromEntries(M1.stars.map((s) => [s.code, 0]));
  for (const [a, b] of M1.lines) { bac[a] += 1; bac[b] += 1; }
  const ngon = Object.entries(bac).filter(([, n]) => n === 1).map(([c]) => c);
  const chac = Object.entries(bac).filter(([, n]) => n === 3).map(([c]) => c);
  assert.deepEqual(ngon, ['P01'], `hình có ${ngon.length} đầu hở — cái chạc chỉ có MỘT gốc thân`);
  assert.deepEqual(chac.sort(), ['P02'], 'không có đúng một CHỖ RẼ bậc ba');
  assert.equal(bac.P07, 2, 'P07 không phải chỗ hai nhánh gặp lại');

  // Và hai nhánh phải THẬT SỰ rời nhau giữa chừng: đi từ P02 lên P07 có đúng
  // HAI đường, không chung ngôi nào ở giữa. `fork()` tách rồi `wait()` chụm —
  // phần kín giữa hai nhánh là khoảng thời gian cả hai cùng sống.
  const ke = {};
  for (const [a, b] of M1.lines) {
    (ke[a] ??= []).push(b);
    (ke[b] ??= []).push(a);
  }
  const duong = [];
  const di = (nut, cam, path) => {
    if (nut === 'P07') { duong.push(path); return; }
    for (const k of ke[nut]) if (k !== cam) di(k, nut, [...path, k]);
  };
  di('P02', 'P01', ['P02']);
  assert.equal(duong.length, 2, `từ chỗ rẽ lên chỗ chụm có ${duong.length} đường, phải là 2`);
  const giua = duong.map((d) => d.slice(1, -1));
  assert.deepEqual(giua[0].filter((c) => giua[1].includes(c)), [],
    'hai nhánh dùng chung một ngôi ở giữa — thế thì không có chỗ nào "rẽ đôi"');

  // Một nhánh là việc HỆ ĐIỀU HÀNH làm (lập lịch, ống dẫn), nhánh kia là việc
  // PYTHON gọi (`run`, `Popen`). Chúng gặp nhau ở `multiprocessing`.
  assert.deepEqual(giua.map((g) => g.join('-')).sort(), ['P03-P04', 'P05-P06']);
});

test('nét nối không chạm vào sao — sao là một vật thể, không phải một cái nút của nét', () => {
  const sao = M1.stars.map((s) => ({ ...placeStar(M1, s), r: starMagnitude(SO_CA[s.code]).radius }));
  const ds = lop(REST, 'net-chom').match(/M(-?[\d.]+) (-?[\d.]+)/g).map((m) => {
    const [, x, y] = m.match(/M(-?[\d.]+) (-?[\d.]+)/);
    return { x: +x, y: +y };
  });
  for (const d of ds) {
    const gan = sao.map((s) => Math.hypot(s.x - d.x, s.y - d.y) - s.r).sort((a, b) => a - b)[0];
    assert.ok(gan >= SKY_LINK.gap - 1.5,
      `một nét bắt đầu cách rìa sao gần nhất ${gan.toFixed(1)} đơn vị, dưới khe hở`
      + ` ${SKY_LINK.gap} — đây cũng là lý do bản vực cũ nhìn rối`);
  }
});

/* ═══ 9 · NHÃN — LUẬT NEO, KHÔNG "ĐẶT CHO ĐẸP" ════════════════════════ */

test('nhãn neo vào ngôi SÁNG NHẤT, đường dẫn đúng 30°, và hộp chữ không đè lên ngôi nào', () => {
  const rec = SKY_LABEL_PLACED.find((r) => r.key === M1.key);
  assert.ok(rec, 'SKY_LABEL_PLACED thiếu M1');

  // Neo vào ngôi sáng nhất (§8.2), hoà thì lấy bài đứng trước.
  const sapXep = [...M1.stars]
    .map((s, i) => ({ code: s.code, r: starMagnitude(SO_CA[s.code]).radius, i }))
    .sort((a, b) => b.r - a.r || a.i - b.i);
  assert.equal(rec.anchor, sapXep[0].code,
    `nhãn neo vào ${rec.anchor}, nhưng ngôi sáng nhất của M1 là ${sapXep[0].code}`);

  // Hình học §8.3: đoạn xiên ĐÚNG 30°, đo lại từ chính đường dẫn trong SVG.
  const nhan = lop(REST, 'nhan');
  const dan = nhan.match(/d="M(-?[\d.]+) (-?[\d.]+)l(-?[\d.]+) (-?[\d.]+)/);
  assert.ok(dan, 'không tìm thấy đường dẫn của nhãn');
  const goc = Math.abs(Math.atan2(+dan[4], +dan[3]) * 180 / Math.PI);
  assert.ok(Math.abs(goc - SKY_LABEL.legAngle) < 2.5,
    `đoạn xiên đo được ${goc.toFixed(1)}°, phải là ${SKY_LABEL.legAngle}° — 45° trùng đường chéo`
    + ' điểm ảnh (răng cưa đều đặn) và trùng góc mắt đọc ra "một mũi tên"');

  // Hộp chữ không được đè lên một ngôi nào (nở `starPad`). Lấy mốc từ chính
  // toạ độ `<text>` trong SVG, không từ một con số chép tay.
  const chu = [...nhan.matchAll(/<text x="(-?[\d.]+)" y="(-?[\d.]+)">([^<]*)<\/text>/g)]
    .map((m) => ({ x: +m[1], y: +m[2], s: m[3] }));
  assert.ok(chu.length >= 2, 'nhãn thiếu dòng tên hoặc dòng phụ');
  assert.ok(chu.some((c) => c.s === M1.name), `không thấy tên chòm "${M1.name}"`);
  // Dòng phụ đếm SỐ BÀI từ chính danh sách ngôi, nên nó không nói sai được.
  assert.ok(chu.some((c) => c.s === `${M1.key} · ${M1.subtitle} · ${M1.stars.length} bài`),
    `dòng phụ không khớp: ${chu.map((c) => c.s).join(' | ')}`);

  const x0 = Math.min(...chu.map((c) => c.x));
  const y0 = Math.min(...chu.map((c) => c.y)) - SKY_LABEL.nameSize;
  const y1 = Math.max(...chu.map((c) => c.y)) + SKY_LABEL.subSize * 0.3;
  const x1 = x0 + Math.max(...chu.map((c) => c.s.length)) * SKY_LABEL.advance * SKY_LABEL.nameSize;
  for (const s of M1.stars) {
    const p = placeStar(M1, s);
    const pad = SKY_LABEL.starPad;
    assert.ok(!(p.x >= x0 - pad && p.x <= x1 + pad && p.y >= y0 - pad && p.y <= y1 + pad),
      `hộp chữ đè lên ngôi ${s.code} — đúng lời chê "chữ hơi lệch", và ở Azgaar giấu một`
      + ' BIỂU TƯỢNG đắt gấp ba lần giấu một nhãn: ngôi sao LÀ cái bài, cái tên chỉ là tên');
  }
  // Và hộp chữ nằm TRỌN trong khung, nở `boxPad`.
  assert.ok(x0 - SKY_LABEL.boxPad >= SKY_VIEW.x, 'hộp chữ tràn mép trái');
  assert.ok(x1 + SKY_LABEL.boxPad <= SKY_VIEW.x + SKY_VIEW.width, 'hộp chữ tràn mép phải');
  assert.ok(y1 + SKY_LABEL.boxPad <= SKY_VIEW.y + SKY_VIEW.height, 'hộp chữ tràn mép dưới');
});

/* ═══ 10 · HAI TẤM CHỈ KHÁC NHAU Ở ĐỘ MỜ ══════════════════════════════ */

test('tấm hover chỉ đổi ĐỘ MỜ: không bán kính nào to lên, không nét nào dày lên', () => {
  // Đây là điều làm cả bản này an toàn với `prefers-reduced-motion` ngay từ
  // lúc SINH. WCAG có một định nghĩa hẹp dễ đọc nhầm: đổi màu/độ mờ KHÔNG tính
  // là hoạt ảnh chuyển động, còn đổi KÍCH THƯỚC thì tính. Nếu tấm hover đổi
  // bán kính thì phải sinh thêm một tấm thứ ba cho `reduce`, và tấm thứ ba là
  // chỗ ba bức trôi ra xa nhau.
  const rNghi = vongTron(lop(REST, 'sao-bai')).map((c) => c.r).sort();
  const rHover = vongTron(lop(FOCUS, 'sao-bai')).map((c) => c.r).sort();
  assert.deepEqual(rHover, rNghi, 'ngôi to lên khi hover — đổi kích thước là "chuyển động"');

  const wNghi = Math.max(...beRong(lop(REST, 'net-chom')));
  const wHover = Math.max(...beRong(lop(FOCUS, 'net-chom')));
  assert.equal(wHover, wNghi, 'nét chòm dày lên khi hover — đổi kích thước là "chuyển động"');

  // Nhưng phản hồi thì phải CÓ: nét chòm sáng lên, và trời mờ đi.
  const op = (s) => [...s.matchAll(/stroke-opacity="([\d.]+)"/g)].map((m) => +m[1]);
  assert.ok(Math.max(...op(lop(FOCUS, 'net-chom')), 1) >= P.scale.lineOpacity[1] - 0.01
    || lop(FOCUS, 'net-chom').includes(`stroke="${P.hues[M1.hue]}"`));
  const sangNghi = Math.max(...op(lop(REST, 'net-chom')), 0);
  const sangHover = Math.max(...op(lop(FOCUS, 'net-chom')), 1);
  assert.ok(sangHover > sangNghi,
    `nét chòm không sáng lên khi hover (${sangNghi} → ${sangHover}) — giảm chuyển động không`
    + ' có nghĩa là bỏ phản hồi');
  // Mã bài hiện ra lúc hover, và CHỈ lúc hover.
  for (const s of M1.stars) {
    assert.ok(FOCUS.includes(`>${s.code}<`), `tấm hover thiếu mã bài ${s.code}`);
    assert.ok(!REST.includes(`>${s.code}<`), `tấm nghỉ đã hiện mã bài ${s.code}`);
  }
});

/* ═══ 11 · TẤT ĐỊNH VÀ TRẦN DUNG LƯỢNG ════════════════════════════════ */

const PYBIN = ['py', 'python3', 'python'].find((bin) => {
  const r = spawnSync(bin, ['--version'], { encoding: 'utf8' });
  return r.status === 0;
});

test('chạy script hai lần ra ĐÚNG một tệp', () => {
  assert.ok(PYBIN, 'không tìm thấy trình thông dịch Python (py / python3 / python)');
  const a = mkdtempSync(join(tmpdir(), 'sky-a-'));
  const b = mkdtempSync(join(tmpdir(), 'sky-b-'));
  try {
    const chay = (out) => execFileSync(
      PYBIN, ['-I', join(ROOT, 'scripts', 'star', 'build_sky.py'), '--out', out],
      { cwd: ROOT, encoding: 'utf8' },
    );
    chay(a);
    chay(b);
    for (const f of ['m1-rest.svg', 'm1-focus.svg']) {
      assert.equal(readFileSync(join(a, f), 'utf8'), readFileSync(join(b, f), 'utf8'),
        `${f} đổi giữa hai lần chạy — mỗi lần build sẽ là một diff vô nghĩa`);
      // Và nó phải khớp tệp ĐÃ COMMIT: tranh là tập SINH RA, sửa tay là lần
      // chạy sau xoá sạch.
      assert.equal(readFileSync(join(a, f), 'utf8'), read('public', 'map', 'star', f),
        `${f} trong public/ lệch với thứ script sinh ra — hoặc ai đó sửa tay, hoặc quên`
        + ' chạy lại `py scripts/star/build_sky.py`');
    }
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test('hai tệp nằm dưới trần dung lượng mà script tự chặn', () => {
  const tran = Number(PY.match(/^MAX_KB = (\d+)/m)[1]);
  assert.ok(tran > 0 && tran <= 900, `trần ${tran} KB vô lý`);
  for (const f of ['m1-rest.svg', 'm1-focus.svg']) {
    const kb = statSync(join(FE, 'public', 'map', 'star', f)).size / 1024;
    assert.ok(kb < tran, `${f} nặng ${kb.toFixed(0)} KB, vượt trần ${tran} KB`);
  }
});

/* ═══ 12 · HAI HỒ SƠ KHÔNG ĐƯỢC TRÔI XA NHAU ══════════════════════════ */

test('hồ sơ khai đủ cơ chế để bản sáng cắm vào mà không cần nhánh `if` nào trong Python', () => {
  // §19.1: `build_sky.py` không được có nhánh theo TÊN hồ sơ — nhánh `if` theo
  // tên là đúng chỗ hai bản trôi xa nhau mà không ai thấy.
  assert.ok(!/profile\s*==\s*['"]light['"]|args\.profile\s*==/.test(PY_CODE),
    'build_sky.py có một nhánh rẽ theo TÊN hồ sơ');
  for (const k of ['render', 'stipple', 'core', 'halo', 'scale', 'hueBranch']) {
    assert.ok(k in P, `SKY_PROFILE_DARK thiếu khoá "${k}" — bản sáng sẽ không cắm vào được`);
  }
  assert.equal(P.render, 'luminance');
  assert.equal(P.stipple, null, 'bản tối tô bằng đường đồng mức, không bằng mật độ chấm');
  assert.equal(SKY_PROFILES.dark, P);
  assert.ok(!('light' in SKY_PROFILES) || SKY_PROFILES.light,
    'SKY_PROFILES.light khai mà rỗng');

  // `SKY_LINK` là LUẬT, `profile.scale` là thứ bộ sinh ĐỌC. Hai chỗ phải nói
  // cùng một con số ở bản tối, không thì bảng §19.3 thành một tờ giấy.
  assert.equal(P.scale.line, SKY_LINK.width);
  assert.deepEqual(P.scale.lineOpacity, [SKY_LINK.opacity, SKY_LINK.focusOpacity]);
});

test('kết quả đặt nhãn ĐÓNG BĂNG ở TS, không tính lại mỗi lần dựng', () => {
  assert.equal(SKY_LABEL_PLACED.length, SKY_CONSTELLATIONS.length);
  for (const r of SKY_LABEL_PLACED) {
    assert.ok(SKY_CONSTELLATIONS.some((c) => c.key === r.key), `thừa chòm ${r.key}`);
    assert.equal(r.dir.length, 2);
    assert.ok(Math.abs(r.dir[0]) === 1 && Math.abs(r.dir[1]) === 1, 'hướng phải là ±1');
    assert.ok(r.leg >= SKY_LABEL.legMin && r.leg <= SKY_LABEL.legHardMax,
      `đoạn xiên ${r.leg} ngoài khoảng ${SKY_LABEL.legMin}–${SKY_LABEL.legHardMax}`);
  }
  // Và bộ sinh phải ĐỌC khối đó, không tự tìm lại. Nếu nó tự tìm thì hai hồ sơ
  // sẽ tự tính ra hai chỗ đặt nhãn khác nhau, và kiểu hỏng là kiểu im lặng —
  // không ai mở hai bản cạnh nhau để so.
  assert.ok(/PLACED = grab\("SKY_LABEL_PLACED"\)/.test(PY));
  assert.ok(/def nhan_box\([\s\S]{0,900}?rec = next\(/.test(PY),
    'nhan_box() không còn đọc SKY_LABEL_PLACED');
});

test('danh sách khoá chòm khớp danh sách chòm', () => {
  assert.deepEqual([...SKY_CONSTELLATION_KEYS], SKY_CONSTELLATIONS.map((c) => c.key),
    'SKY_CONSTELLATION_KEYS (Python đọc) lệch với SKY_CONSTELLATIONS (React đọc)');
});

/* ═══ 13 · LỚP PHỦ HOVER ═══════════════════════════════════════════════ */

test('vùng bấm khớp bao lồi chòm nở 20 px HỢP hộp nhãn, tính lại từ chính tranh', () => {
  const sao = M1.stars.map((s) => ({ ...placeStar(M1, s), r: starMagnitude(SO_CA[s.code]).radius }));
  const pad = SKY_HIT.hullPad;
  let x0 = Math.min(...sao.map((s) => s.x)) - pad;
  let x1 = Math.max(...sao.map((s) => s.x)) + pad;
  let y0 = Math.min(...sao.map((s) => s.y)) - pad;
  let y1 = Math.max(...sao.map((s) => s.y)) + pad;
  const chu = [...lop(REST, 'nhan').matchAll(/<text x="(-?[\d.]+)" y="(-?[\d.]+)">([^<]*)<\/text>/g)]
    .map((m) => ({ x: +m[1], y: +m[2], s: m[3] }));
  // Hộp nhãn = hộp CHỮ, không phải mấy cái mốc `x`: bề rộng tính y hệt phía
  // Python (`text_w`), nếu không thì vùng bấm "đúng" theo test lại hụt mất cả
  // dòng phụ — mà bấm vào nhãn cũng phải là mở chặng (§10).
  const bw = Math.max(
    beRongChu(M1.name, SKY_LABEL.nameSize),
    beRongChu(`${M1.key} · ${M1.subtitle} · ${M1.stars.length} bài`, SKY_LABEL.subSize),
  ) + SKY_LABEL.rulePad;
  x0 = Math.min(x0, ...chu.map((c) => c.x));
  x1 = Math.max(x1, ...chu.map((c) => c.x + bw));
  y0 = Math.min(y0, ...chu.map((c) => c.y - SKY_LABEL.nameSize * 0.8 - SKY_LABEL.baselineLift));
  y1 = Math.max(y1, ...chu.map((c) => c.y + SKY_LABEL.subSize * 0.3));

  const khoi = CSS_CODE.match(/\.hitM1\s*\{([^}]*)\}/);
  assert.ok(khoi, 'star-map.module.css thiếu .hitM1');
  const so = Object.fromEntries(
    [...khoi[1].matchAll(/(left|top|width|height):\s*([\d.]+)%/g)].map((m) => [m[1], +m[2]]),
  );
  const mong = {
    left: (x0 - SKY_VIEW.x) / SKY_VIEW.width * 100,
    top: (y0 - SKY_VIEW.y) / SKY_VIEW.height * 100,
    width: (x1 - x0) / SKY_VIEW.width * 100,
    height: (y1 - y0) / SKY_VIEW.height * 100,
  };
  for (const k of ['left', 'top', 'width', 'height']) {
    assert.ok(Math.abs(so[k] - mong[k]) < 6,
      `.hitM1 ${k} = ${so[k]}% nhưng tính lại từ tranh ra ${mong[k].toFixed(2)}% —`
      + ' vùng bấm không còn trùm lên chòm và nhãn. Chạy `build_sky.py --css`.');
  }
});

test('`:focus-visible` cho ra đúng cùng một trạng thái như `:hover`', () => {
  const quy = CSS_CODE.match(/([^{}]*):hover\s*~\s*\.skyFocus[^{]*\{([^}]*)\}/);
  assert.ok(quy, 'CSS không có quy tắc hover đổi sang tấm hover');
  assert.match(quy[1] + quy[0], /:focus-visible\s*~\s*\.skyFocus/,
    'hover và focus-visible không chung một khối — người đi bằng Tab thấy một bản đồ khác');
  assert.match(CSS_CODE, /\.hit:focus-visible\s*\{[^}]*outline:/, 'thiếu vòng tiêu điểm');
});

test('giảm chuyển động: bỏ CHUYỂN TIẾP nhưng GIỮ tương phản', () => {
  const khoi = CSS_CODE.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(khoi, 'CSS không có nhánh prefers-reduced-motion');
  assert.match(khoi[1], /transition:\s*none/, 'nhánh reduce không tắt chuyển tiếp');
  assert.ok(!/opacity:\s*0\s*(!important)?\s*;/.test(khoi[1]),
    'nhánh reduce tắt luôn phản hồi — giảm chuyển động không có nghĩa là bỏ phản hồi');
});

test('không hiệu ứng TỰ CHẠY nào: trang nạp xong là bản đồ đứng yên', () => {
  assert.ok(!/@keyframes|animation:/.test(CSS_CODE),
    'CSS có hoạt ảnh tự chạy — chủ sản phẩm đã chốt chỉ hover mới động, và nhờ thế bản đồ'
    + ' nằm hoàn toàn ngoài tiêu chí WCAG 2.2.2 (Dừng/Ngừng/Ẩn)');
  // Và không `style={{…}}` trong TSX: SSR tuần tự hoá nó thành `style="…"`,
  // một trong hai nguyên nhân `style-src 'unsafe-inline'` chưa bỏ được.
  assert.ok(!/style=\{\{/.test(TSX_CODE), 'trang dùng style nội tuyến');
});

test('route xem thử không gọi API nào — nó công khai', () => {
  assert.ok(!/apiFetch|fetch\(/.test(TSX_CODE),
    'trang công khai mà gọi API: `apiFetch` gặp 401 là TỰ TẠO tài khoản khách, tức mỗi con'
    + ' bot quét web sinh một `@guest.local` và ăn một suất của THROTTLE_GUEST_LIMIT');
  // Câu chữ ở TS để `node --test` đọc được, không nằm rải trong JSX.
  for (const s of [STAR_COPY.title, STAR_COPY.hint, STAR_COPY.legendTitle]) {
    assert.ok(s.length > 3);
  }
  assert.ok(STAR_COPY.legend.length >= 3, 'chú giải quá sơ sài — bản đồ không có chú giải là'
    + ' một bức tranh, không phải một dụng cụ');
});
