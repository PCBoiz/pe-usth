/**
 * BẢN ĐỒ SAO — ca kiểm cho `src/lib/star-map.ts`, `scripts/star/build_sky.py`,
 * mười hai tệp SVG nó sinh ra, và route xem thử `/ban-do-sao`.
 *
 * Đặc tả: `design/v3/ban-do-sao.md` §9.6 (ba cái bẫy của chính kho mã này) và
 * §19.4 (ca so hai hồ sơ). Số đo độ chói: `design/v3/chieu-sau-tuong-tac.md`.
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
 *  6. MỚI, và nó là lý do cả bản này tồn tại: **ba lớp liên kết của §4 lẫn
 *     vào nhau.** Nét chòm, cung hoàng đạo và dải Ngân Hà phải phân biệt được
 *     BẰNG MẮT; nếu cung hoàng đạo đổi thành nét liền, hay dùng chung sắc với
 *     một chặng, hay chạm vào một ngôi, thì nó đọc ra là "nét của chòm" và
 *     câu trả lời cho "các chòm kết nối với nhau như nào" biến mất — trong
 *     khi tệp vẫn ra, vẫn đúng kích thước, vẫn không ai đỏ.
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
  lessonNumber,
  placeStar,
  profileColors,
  starAriaLabel,
  starMagnitude,
  starScaleLine,
  starScaleRange,
  zodiacAnchors,
  SKY_CURSOR,
  SKY_TESTS,
  SKY_BUDGET,
  SKY_CONSTELLATION_KEYS,
  SKY_CONSTELLATIONS,
  SKY_COURSE,
  SKY_FIELD,
  SKY_FRAME,
  SKY_HIT,
  SKY_LABEL,
  SKY_LABEL_PLACED,
  SKY_LAYERS,
  SKY_LIGHT,
  SKY_LINK,
  SKY_MAGNITUDE,
  SKY_MILKYWAY,
  SKY_PROFILES,
  SKY_PROFILE_DARK,
  SKY_TILES,
  SKY_ZODIAC,
  STAR_COPY,
} = SM;

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOT = join(FE, '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');
const doc = (f) => read('public', 'map', 'star', f);

const TROI = doc('sky-troi.svg');
const SAONEN = doc('sky-sao-nen.svg');
const MACH = doc('sky-mach.svg');
const CHOM = doc('sky-chom-nghi.svg');
/** Tám tấm tiêu điểm, theo khoá chòm. */
const RO = Object.fromEntries(SKY_CONSTELLATIONS.map((c) => [c.key, doc(`sky-chom-${c.key}.svg`)]));
/** Mọi tệp của bộ — dùng cho các phép kiểm áp cho TẤT CẢ (màu lạ, gradient, id). */
const TAT_CA = [
  ['troi', TROI], ['sao-nen', SAONEN], ['mach', MACH], ['chom-nghi', CHOM],
  ...SKY_CONSTELLATIONS.map((c) => [`chom-${c.key}`, RO[c.key]]),
];
const TEN_TEP = ['sky-troi.svg', 'sky-sao-nen.svg', 'sky-mach.svg', 'sky-chom-nghi.svg',
  ...SKY_CONSTELLATIONS.map((c) => `sky-chom-${c.key}.svg`)];
/** Mọi tệp bộ sinh ghi ra, KỂ CẢ `sky-theme.css` — biến `--sky-base` cũng là
 *  tập sinh ra, nên nó cũng phải tất định và cũng không được sửa tay. */
const TEN_TEP_SINH = [...TEN_TEP, 'sky-theme.css'];
const THEME = read('public', 'map', 'star', 'sky-theme.css');

/* Hai dòng của một nhãn. Ở đúng MỘT chỗ vì ca test nào cũng cần cả hai, và
   dựng lại chuỗi ở năm chỗ là năm chỗ sẽ lệch khi câu chữ đổi lần nữa. */
const dongChang = (c) => `${c.key} · ${c.subtitle}`;
const dongKhoa = (c) => `${SKY_COURSE.name} · ${c.stars.length} bài`;

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
const boChuThich = (s) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');
const TSX_CODE = boChuThich(PAGE);
/** Lớp con trỏ — thành phần client duy nhất của trang. Mọi ca cấm áp cho
 *  `page.tsx` (không API, không `style={{…}}`, không hiệu ứng tự chạy) phải áp
 *  cho CẢ tệp này, nếu không thì chúng chỉ còn canh một nửa trang. */
const CUR_CODE = boChuThich(read('src', 'app', 'ban-do-sao', 'SkyCursor.tsx'));
const PY_CODE = PY
  .replace(/"""[\s\S]*?"""/g, ' ')
  .replace(/^[ \t]*#.*$/gm, '')
  .replace(/[ \t]+#.*$/gm, '');

/** Đếm ký tự CƠ SỞ (bỏ dấu tổ hợp) — tiếng Việt có dấu nên `length` thô đếm
 *  lố, và bề rộng hộp chữ phải tính y hệt phía Python. */
const chuCaiCoSo = (s) => [...s.normalize('NFD')].filter((ch) => !/\p{M}/u.test(ch)).length;
const beRongChu = (s, size) => chuCaiCoSo(s) * SKY_LABEL.advance * size;

const P = SKY_PROFILE_DARK;
const byKey = Object.fromEntries(SKY_CONSTELLATIONS.map((c) => [c.key, c]));
const M1 = byKey.M1;

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

/** Giải một chuỗi `d` kiểu `M x yl dx dyl dx dy…` ra danh sách điểm. */
const giaiPath = (d) => {
  const m = d.match(/^M(-?[\d.]+) (-?[\d.]+)/);
  if (!m) return [];
  const pts = [[+m[1], +m[2]]];
  for (const g of d.matchAll(/l(-?[\d.]+) (-?[\d.]+)/g)) {
    const [x, y] = pts[pts.length - 1];
    pts.push([x + +g[1], y + +g[2]]);
  }
  return pts;
};

/** Khoảng cách từ một điểm tới một đoạn thẳng. */
const khoangDoan = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax; const dy = by - ay;
  const L = dx * dx + dy * dy;
  const t = L === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
};
const khoangTuyen = (px, py, pts) => Math.min(
  ...pts.slice(1).map((_, i) => khoangDoan(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])),
);

/** Số ca chấm của từng bài, ĐẾM LẠI từ giáo trình — không chép từ TS. */
const LESSON_DIR = join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons');
const SO_CA = Object.fromEntries(
  readdirSync(LESSON_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(LESSON_DIR, f), 'utf8')))
    .map((d) => [d.lesson_code, (d.content_json ?? d).step_4?.tests?.length])
    .filter(([code, n]) => code && Number.isInteger(n)),
);

/** Mã bài của từng chặng, lấy từ `curricula.json` — nguồn mà trang khoá học đọc. */
const MODULES = JSON.parse(read('src', 'lib', 'curricula.json'))
  .CURRICULA.python_advanced.modules
  .map((m) => m.lessons.map((t) => t.split('·')[0].trim()));

/** Toạ độ khung của mọi ngôi. */
const VI_TRI = {};
for (const c of SKY_CONSTELLATIONS) {
  for (const s of c.stars) VI_TRI[s.code] = { ...placeStar(c, s), key: c.key };
}

/* ═══ 1 · BỐN MƯƠI TÁM NGÔI LÀ BỐN MƯƠI TÁM BÀI THẬT ══════════════════ */

test('8 chòm · 48 ngôi khớp ĐÚNG 48 mã bài của tám chặng trong curricula.json', () => {
  // Tự kiểm: nếu tách mã bài hỏng thì cả ca này vô nghĩa.
  assert.equal(MODULES.length, 8);
  assert.deepEqual(MODULES.map((m) => m.length), [7, 6, 7, 5, 6, 9, 6, 2]);
  assert.equal(MODULES[0][0], 'P01');

  assert.equal(SKY_CONSTELLATIONS.length, 8);
  SKY_CONSTELLATIONS.forEach((c, i) => {
    assert.deepEqual([...c.stars].map((s) => s.code).sort(), [...MODULES[i]].sort(),
      `danh sách ngôi của ${c.key} lệch với giáo trình — thêm/bớt bài mà quên bản đồ`);
  });
  const tong = SKY_CONSTELLATIONS.reduce((n, c) => n + c.stars.length, 0);
  assert.equal(tong, 48, `bản đồ vẽ ${tong} ngôi, giáo trình có 48 bài`);

  // Và từng mã phải có thật trong gói bài đã dựng, không chỉ trong tên hiển thị.
  for (const code of Object.keys(VI_TRI)) {
    assert.ok(Number.isInteger(SO_CA[code]),
      `bài ${code} không có trong out-advanced/lessons — bản đồ đang vẽ một bài không tồn tại`);
  }
  // Số ngôi vẽ ra PHẢI bằng số bài. Bản đồ sao thật cho phép thêm một ngôi mờ
  // cho hình dễ nhớ (H. A. Rey làm thế với chòm Song Tử); ở đây CẤM — mỗi ngôi
  // là một bài, và một ngôi "thêm cho đẹp hình" biến con số 48 thành một con
  // số không đếm được.
  assert.equal(vongTron(lop(CHOM, 'sao-bai')).length, 48);
  assert.equal(vongTron(lop(CHOM, 'loi-sao')).length, 48);
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

  const than = vongTron(lop(CHOM, 'sao-bai'));
  for (const [code, p] of Object.entries(VI_TRI)) {
    const r = starMagnitude(SO_CA[code]).radius * P.scale.star;
    const v = than.find((c) => Math.abs(c.x - p.x) < 1.5 && Math.abs(c.y - p.y) < 1.5);
    assert.ok(v, `không tìm thấy ngôi ${code} ở (${Math.round(p.x)}, ${Math.round(p.y)})`);
    assert.ok(Math.abs(v.r - r) < 0.02,
      `ngôi ${code} có ${SO_CA[code]} ca chấm ⇒ bán kính ${r}, nhưng SVG vẽ ${v.r}`);
  }
  // Và thang phải THẬT SỰ phân bậc: ba bài cửa (R02 17 ca, DA01 19, DA02 14)
  // là bậc 1, còn P07/M06/X01 (6 ca) là bậc 5. Nếu không chênh thì "bậc độ
  // sáng" chỉ là lời nói.
  const rMax = Math.max(...than.map((c) => c.r));
  const rMin = Math.min(...than.map((c) => c.r));
  assert.ok(rMax / rMin > 2.0, `chênh lệch bậc chỉ ${(rMax / rMin).toFixed(2)}× — không đọc ra`);
  for (const code of ['R02', 'DA01', 'DA02']) {
    assert.equal(starMagnitude(SO_CA[code]).tier, 1, `${code} là bài cửa mà không phải bậc 1`);
  }
});

/* ═══ 3 · KHE TRỐNG GIỮA SAO NỀN VÀ SAO BÀI ════════════════════════════ */

test('không một ngôi nào có bán kính trong khoảng (1,20 ; 2,20) — hàng rào chính của §7.2', () => {
  const lo = SKY_FIELD.radius;
  const hi = SKY_MAGNITUDE.base;
  // Tự kiểm khoảng: hai đầu khoá phải là hai con số THẬT của hai quần thể.
  assert.equal(lo, 1.2);
  assert.equal(hi, 2.2);

  for (const c of vongTron(lop(CHOM, 'sao-bai'))) {
    assert.ok(c.r >= hi - 1e-9,
      `một ngôi mang nghĩa có bán kính ${c.r}, rơi vào khe trống — sao nền và sao bài`
      + ' sẽ lẫn vào nhau và 48 ngôi mang nghĩa biến mất trong nhiễu');
  }
  // Sao nền là CHẤM-BẰNG-NÉT: đường kính = bề rộng nét, nên bán kính của nó là
  // `stroke-width / 2`. Hàng rào 1 nói nó CỐ ĐỊNH ở 1,20 px (cho phép nở theo
  // phối cảnh khí quyển ở dải chân trời, nhưng không bao giờ chạm 2,20).
  const ds = beRong(lop(SAONEN, 'truong-sao'));
  assert.ok(ds.length > 0, 'không có sao nền nào');
  for (const w of ds) {
    assert.ok(w / 2 >= lo - 0.01, `một sao nền chỉ có bán kính ${w / 2} — dưới sàn Stellarium 1,2 px`);
    assert.ok(w / 2 < hi, `một sao nền có bán kính ${w / 2}, chạm vào quần thể sao bài`);
  }
  // Hàng rào 2: sao nền dùng sắc TRUNG TÍNH LẠNH, không phải một trong tám sắc
  // khoáng. Một sắc khoáng ở đây là 1 250 ngôi giả làm bài học.
  assert.ok(lop(SAONEN, 'truong-sao').includes(`stroke="${P.field}"`));
  for (const hue of Object.values(P.hues)) {
    assert.ok(!lop(SAONEN, 'truong-sao').includes(hue), `sao nền dùng sắc khoáng ${hue}`);
  }
});

/* ═══ 4 · CÁI BẪY `stroke-width` ═══════════════════════════════════════ */

test('không một `stroke-width` nào bằng 0 — bẫy đã làm cả bản vực vô hình', () => {
  // Tự kiểm bộ phân tích trên một mẫu HỎNG dựng tay: đúng thứ `nf()` sinh ra.
  assert.deepEqual(beRong('<path stroke-width="0" d="M0 0"/>'), [0]);

  let tong = 0;
  for (const [ten, svg] of TAT_CA) {
    const ds = beRong(svg);
    tong += ds.length;
    for (const w of ds) {
      assert.ok(Number.isFinite(w) && w > 0,
        `${ten}: có một \`stroke-width="${w}"\`. Bề rộng nét đã đi qua hàm làm tròn TOẠ ĐỘ:`
        + ' cả bức sẽ render với nét vô hình và nhìn ra đúng "mảng phẳng tô gradient".');
    }
  }
  assert.ok(tong > 60, `chỉ có ${tong} nhóm nét trong cả bộ — tệp không có nội dung`);
  // Nét MỎNG NHẤT của đặc tả là nét lưới 0,6 px — nó phải còn sống sót.
  const luoi = beRong(lop(SAONEN, 'luoi'));
  assert.ok(luoi.length > 0 && Math.min(...luoi) <= 0.6 + 1e-9,
    `nét lưới mỏng nhất là ${Math.min(...luoi)} — lưới toạ độ 0,6 px đã bị làm tròn lên`);
});

/* ═══ 5 · KHÔNG MÃ MÀU NÀO Ở NGOÀI HỒ SƠ ══════════════════════════════ */

test('mọi mã màu trong SVG đều có tên trong hồ sơ TS', () => {
  const ten = new Set(profileColors(P));
  // Tự kiểm: một màu lạ dựng tay phải bị bắt.
  assert.ok(!ten.has('#123456'));

  for (const [nhan, svg] of TAT_CA) {
    const found = [...svg.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0].toUpperCase());
    assert.ok(found.length > 0, `${nhan}: không tìm thấy mã màu nào — bộ phân tích câm`);
    for (const hex of new Set(found)) {
      assert.ok(ten.has(hex),
        `${nhan}: màu ${hex} không có tên trong SKY_PROFILE_DARK. Màu lạc là màu KHÔNG`
        + ' ĐO ĐƯỢC tương phản, mà cả bảng 4,5:1 / 3:1 của §5 dựa vào việc đo được.');
    }
  }
});

test('build_sky.py không chứa một mã màu nào — §19.4 ca 14', () => {
  // Soi phần MÃ, không soi chú thích: chú thích KỂ LẠI luật và phải được phép
  // dẫn ra chính những mã màu mà luật nói tới (`#CC4C4C` của Stellarium,
  // `#070C17` của bản màu cũ). Soi cả chú thích thì ca này phạt đúng người
  // viết tài liệu, và cách chữa duy nhất là xoá lời giải thích đi.
  const hex = [...PY_CODE.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0]);
  assert.deepEqual(hex, [],
    `build_sky.py ghi cứng ${hex.length} mã màu (${hex.slice(0, 5).join(', ')}). Hồ sơ là thứ`
    + ' duy nhất được giữ màu; một mã trong Python là một chỗ bản tối và bản sáng trôi xa nhau.');
  // Và nó cũng không được ghi cứng toạ độ chòm: mọi con số hình thái ở TS.
  assert.ok(/grab\("SKY_CONSTELLATION_KEYS"\)/.test(PY) && /grab\("SKY_%s" % k\)/.test(PY),
    'build_sky.py không còn đọc danh sách chòm từ TS');
  for (const k of ['SKY_ZODIAC', 'SKY_LIGHT', 'SKY_BUDGET', 'SKY_TILES']) {
    assert.ok(PY.includes(`grab("${k}")`), `build_sky.py không đọc ${k} từ TS`);
  }
});

/* ═══ 6 · KHÔNG GRADIENT, KHÔNG BỘ LỌC ════════════════════════════════ */

test('tinh vân và nguồn sáng KHÔNG phải gradient, và không `<filter>` nào xuống trình duyệt', () => {
  for (const [nhan, svg] of TAT_CA) {
    for (const xau of ['Gradient', 'gradient', '<filter', 'feTurbulence', 'feGaussianBlur']) {
      assert.ok(!svg.includes(xau),
        `${nhan}: có \`${xau}\`. "Mảng phẳng tô gradient" là lỗi đã bị loại lần đầu, và nó`
        + ' cũng là dấu hiệu AI rõ nhất; còn bộ lọc SVG thì WebKit không tăng tốc bằng GPU'
        + ' (bug 263848) và một bộ lọc rỗng cũng đủ làm Safari iOS sập (bug 191197).');
    }
  }
  // Tinh vân phải là ĐƯỜNG ĐỒNG MỨC LỒNG NHAU — nhiều hình khép kín, mỗi
  // hình một độ mờ phẳng. Một `<rect>` phủ cả khung là bản "mảng phẳng".
  const tv = lop(TROI, 'tinh-van');
  assert.ok((tv.match(/Z/g) ?? []).length >= 8,
    `lớp tinh vân chỉ có ${(tv.match(/Z/g) ?? []).length} hình khép kín`);
  assert.ok(!tv.includes('<rect'), 'tinh vân có một hình chữ nhật phủ');
  // Nguồn sáng trội cũng vậy: ĐA GIÁC LỒNG NHAU, đủ `levels` cái. Hai bản
  // trước dựng nó bằng đường đồng mức và cả hai hỏng NHÌN THẤY ĐƯỢC — một
  // bản ra cái đĩa xám phẳng, một bản ra cái lỗ tối ở giữa.
  const ns = lop(TROI, 'nguon-sang');
  const hinh = (ns.match(/Z/g) ?? []).length;
  assert.ok(hinh >= SKY_LIGHT.levels - 2,
    `nguồn sáng chỉ có ${hinh} đa giác, khai ${SKY_LIGHT.levels} vòng`);
  assert.ok(!ns.includes('fill-rule="evenodd"'),
    'nguồn sáng dùng `evenodd` — đó là cách bản trước biến tâm nguồn sáng thành một LỖ TỐI');
});

/* ═══ 7 · SVG BỊ CÁCH LY — KHÔNG `id`, KHÔNG `data-*` THỪA ════════════ */

test('không `id` và không `data-*` nào ngoài `data-lop` trong SVG', () => {
  for (const [nhan, svg] of TAT_CA) {
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

test('bốn TẤM phủ đúng SKY_LAYERS, đúng thứ tự — một danh sách duy nhất', () => {
  // Hợp của `SKY_TILES` phải đúng bằng `SKY_LAYERS`, giữ nguyên thứ tự: thứ
  // tự tệp trong DOM LÀ thứ tự z, và một lớp bị bỏ quên khỏi `SKY_TILES` thì
  // biến mất khỏi bức mà KHÔNG có gì đỏ lên.
  const phang = SKY_TILES.flatMap((t) => [...t.layers]);
  assert.deepEqual(phang, [...SKY_LAYERS],
    'SKY_TILES không phủ đúng SKY_LAYERS — thêm một lớp là phải sửa HAI mảng');

  // …và mỗi tệp chỉ chứa đúng các lớp của tấm nó.
  const cua = { 'sky-troi.svg': 0, 'sky-sao-nen.svg': 1, 'sky-mach.svg': 2 };
  for (const [ten, i] of Object.entries(cua)) {
    const svg = doc(ten);
    const thay = [...svg.matchAll(/<g data-lop="([^"]+)">/g)].map((m) => m[1]);
    assert.deepEqual(thay, [...SKY_TILES[i].layers].filter((l) => thay.includes(l)),
      `${ten}: thứ tự z trong tranh lệch với SKY_TILES`);
    for (const l of thay) {
      assert.ok(SKY_TILES[i].layers.includes(l), `${ten} chứa lớp "${l}" của tấm khác`);
    }
  }
  const thayChom = [...CHOM.matchAll(/<g data-lop="([^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(thayChom, [...SKY_TILES[3].layers]);

  // Thứ tự `<img>` trong TSX phải khớp thứ tự tấm — thứ tự DOM LÀ thứ tự z.
  const src = [...TSX_CODE.matchAll(/\/map\/star\/([a-z0-9-]+)(?:\$\{c\.key\})?\.svg/g)]
    .map((m) => m[1]);
  assert.deepEqual(src, ['sky-troi', 'sky-sao-nen', 'sky-mach', 'sky-chom-nghi', 'sky-chom-'],
    `thứ tự <img> trong trang là ${src.join(', ')} — nó LÀ thứ tự z`);
});

/* ═══ 8 · TÁM HÌNH, VÀ CHÚNG PHẢI ĐỌC RA ĐƯỢC ═════════════════════════ */

test('mỗi chòm ≤ 12 nét, tổng đúng 50, và số nét vẽ ra khớp số nét khai', () => {
  let tong = 0;
  for (const c of SKY_CONSTELLATIONS) {
    assert.ok(c.lines.length <= SKY_LINK.maxLines,
      `${c.key} có ${c.lines.length} nét, vượt trần ${SKY_LINK.maxLines} — trên mức đó hình`
      + ' không nhớ được nữa');
    tong += c.lines.length;
    // Mọi nét phải nối hai ngôi CÓ THẬT của chính chòm đó.
    const co = new Set(c.stars.map((s) => s.code));
    for (const ab of c.lines) {
      assert.ok(co.has(ab[0]) && co.has(ab[1]), `${c.key}: nét ${ab[0]}–${ab[1]} nối ngôi lạ`);
    }
    // Và hình phải LIỀN: một chòm gãy làm hai mảnh thì nó là hai hình.
    const ke = {};
    for (const ab of c.lines) {
      (ke[ab[0]] ??= []).push(ab[1]);
      (ke[ab[1]] ??= []).push(ab[0]);
    }
    const tham = new Set([c.stars[0].code]);
    const hang = [c.stars[0].code];
    while (hang.length) {
      for (const k of ke[hang.pop()] ?? []) if (!tham.has(k)) { tham.add(k); hang.push(k); }
    }
    assert.equal(tham.size, c.stars.length,
      `${c.key} gãy làm nhiều mảnh: nét nối chỉ với tới ${tham.size}/${c.stars.length} ngôi`);
  }
  assert.equal(tong, 50, `cả bản đồ có ${tong} nét trong chòm, đặc tả §4.1 nói 50`);
  assert.equal(lop(CHOM, 'net-chom').match(/M-?\d/g).length, 50,
    'số nét vẽ ra lệch với số nét khai trong TS');
});

test('hình M1 "Kẹp": một cán, hai càng RỜI NHAU rồi GẶP LẠI', () => {
  // Đây là chỗ ngữ nghĩa `fork()` … `wait()` trở thành một khẳng định KIỂM
  // ĐƯỢC chứ không phải một lời tả. Tên đã đổi từ "Chạc" sang "Kẹp" vì nhánh
  // của một cái chạc KHÔNG gặp lại nhau — nhưng HÌNH thì giữ nguyên, nên
  // chính ca này là thứ nói ra cái tên mới đúng với cái hình.
  assert.equal(M1.name, 'Kẹp');
  const bac = Object.fromEntries(M1.stars.map((s) => [s.code, 0]));
  for (const ab of M1.lines) { bac[ab[0]] += 1; bac[ab[1]] += 1; }
  const ngon = Object.entries(bac).filter(([, n]) => n === 1).map(([c]) => c);
  const re = Object.entries(bac).filter(([, n]) => n === 3).map(([c]) => c);
  assert.deepEqual(ngon, ['P01'], `hình có ${ngon.length} đầu hở — cái kẹp chỉ có MỘT cán`);
  assert.deepEqual(re.sort(), ['P02'], 'không có đúng một CHỖ RẼ bậc ba');
  assert.equal(bac.P07, 2, 'P07 không phải chỗ hai càng gặp lại');

  const ke = {};
  for (const ab of M1.lines) {
    (ke[ab[0]] ??= []).push(ab[1]);
    (ke[ab[1]] ??= []).push(ab[0]);
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
    'hai càng dùng chung một ngôi ở giữa — thế thì không có chỗ nào "rẽ đôi"');
  // Một càng là việc HỆ ĐIỀU HÀNH làm (lập lịch, ống dẫn), càng kia là việc
  // PYTHON gọi (`run`, `Popen`). Chúng gặp nhau ở `multiprocessing`.
  assert.deepEqual(giua.map((g) => g.join('-')).sort(), ['P03-P04', 'P05-P06']);
});

test('M6 "Bàn có nhãn" có nét ĐẬM ở hàng/cột nhãn; M5 "Lưới trần" không có nét nào đậm hơn', () => {
  // Khác biệt giữa `ndarray` và `DataFrame` được nói bằng HÌNH: một cái có
  // nhãn, một cái không. Nếu M5 mọc ra một nét đậm, hoặc M6 mất nét đậm, thì
  // câu đó biến mất mà tệp vẫn ra bình thường.
  const dam = byKey.M6.lines.filter((ab) => ab.length > 2);
  assert.equal(dam.length, 4, 'M6 phải có đúng 4 nét đậm: hàng nhãn trên + cột nhãn trái');
  assert.deepEqual(dam.map((ab) => `${ab[0]}-${ab[1]}`).sort(),
    ['PD01-PD02', 'PD01-PD04', 'PD02-PD03', 'PD04-PD07']);
  for (const c of SKY_CONSTELLATIONS) {
    if (c.key === 'M6') continue;
    assert.equal(c.lines.filter((ab) => ab.length > 2).length, 0,
      `${c.key} có nét đậm — độ dày nét mang nghĩa riêng CHỈ ở M6`);
  }
  // …và nó phải ra tới tranh: đúng hai bề rộng nét trong lớp nét chòm.
  const ws = [...new Set(beRong(lop(CHOM, 'net-chom')))].sort((a, b) => a - b);
  assert.equal(ws.length, 2, `lớp nét chòm có ${ws.length} bề rộng, phải có đúng 2`);
  assert.ok(Math.abs(ws[1] / ws[0] - SKY_LINK.emphasis) < 0.05,
    `tỉ lệ nét đậm/nét thường là ${(ws[1] / ws[0]).toFixed(2)}, khai ${SKY_LINK.emphasis}`);
  assert.ok(lop(CHOM, 'net-chom').includes(`stroke="${P.hues.m6}" stroke-width="${ws[1]}"`)
    || new RegExp(`stroke="${P.hues.m6}"[^/]*stroke-width="${ws[1]}"`).test(lop(CHOM, 'net-chom')),
    'nét đậm không mang sắc của M6 — tức nó đang ở nhầm chòm');
});

test('nét nối không chạm vào sao — sao là một vật thể, không phải một cái nút của nét', () => {
  const sao = Object.entries(VI_TRI)
    .map(([code, p]) => ({ ...p, r: starMagnitude(SO_CA[code]).radius }));
  const ds = lop(CHOM, 'net-chom').match(/M(-?[\d.]+) (-?[\d.]+)/g).map((m) => {
    const [, x, y] = m.match(/M(-?[\d.]+) (-?[\d.]+)/);
    return { x: +x, y: +y };
  });
  assert.equal(ds.length, 50);
  for (const d of ds) {
    const gan = sao.map((s) => Math.hypot(s.x - d.x, s.y - d.y) - s.r).sort((a, b) => a - b)[0];
    assert.ok(gan >= SKY_LINK.gap - 1.5,
      `một nét bắt đầu cách rìa sao gần nhất ${gan.toFixed(1)} đơn vị, dưới khe hở`
      + ` ${SKY_LINK.gap} — đây cũng là lý do bản vực cũ nhìn rối`);
  }
});

test('hai chòm không bao giờ dính nhau — khe nhỏ nhất ≥ SKY_LINK.minGap', () => {
  // Bảng hộp §15 của đặc tả CHỒNG NHAU; đặt đúng theo nó thì PD07 của M6 và
  // X03 của M4 cách nhau 21 px, và mắt đọc ra một cặp sao đôi không ai định
  // vẽ. Hộp ở TS đã dịch cho hết chồng, con số này giữ cho lần sau.
  const ds = Object.entries(VI_TRI);
  let khe = Infinity; let xau = null;
  for (let i = 0; i < ds.length; i += 1) {
    for (let j = i + 1; j < ds.length; j += 1) {
      if (ds[i][1].key === ds[j][1].key) continue;
      const d = Math.hypot(ds[i][1].x - ds[j][1].x, ds[i][1].y - ds[j][1].y);
      if (d < khe) { khe = d; xau = `${ds[i][0]} (${ds[i][1].key}) – ${ds[j][0]} (${ds[j][1].key})`; }
    }
  }
  assert.ok(khe >= SKY_LINK.minGap,
    `${xau} chỉ cách nhau ${khe.toFixed(1)} px, dưới ${SKY_LINK.minGap}`);
  // Và mọi ngôi nằm trọn trong khung, nở theo quầng.
  for (const [code, p] of Object.entries(VI_TRI)) {
    const r = starMagnitude(SO_CA[code]).radius * 3.2;
    assert.ok(p.x - r > 0 && p.x + r < SKY_FRAME.width && p.y - r > 0 && p.y + r < SKY_FRAME.height,
      `ngôi ${code} bị mép khung cắt`);
  }
});

/* ═══ 9 · BA LỚP LIÊN KẾT PHẢI PHÂN BIỆT ĐƯỢC BẰNG MẮT ════════════════ */

test('mạch hoàng đạo: nét ĐỨT, sắc RIÊNG, lớp RIÊNG — không lẫn với nét chòm', () => {
  const m = lop(MACH, 'mach-hoang-dao');
  assert.ok(m, 'không có lớp mạch hoàng đạo');
  // 1 · nét ĐỨT. Nét chòm là nét LIỀN; nếu cung này cũng liền thì nó đọc ra là
  //     "một nét nối chòm dài", tức nói rằng tám chặng có một thứ tự.
  const dash = [...m.matchAll(/stroke-dasharray="([^"]+)"/g)].map((g) => g[1]);
  assert.ok(dash.length >= 1 && dash.every((d) => d === SKY_ZODIAC.dash),
    `nét đứt của mạch là ${dash.join('|')}, khai ${SKY_ZODIAC.dash}`);
  // …và nó phải ĐỨT THẬT. So với `SKY_ZODIAC.dash` thôi thì chưa đủ: đó là so
  // tranh với chính nguồn của nó, nên đổi `dash` thành `'0 0'` ở TS là cả hai
  // bên cùng đổi và ca test vẫn xanh trong khi cung đã thành nét liền. Đo đột
  // biến bắt được đúng chỗ này. Nên đòi HAI số dương: có vạch, và có khe.
  const so = SKY_ZODIAC.dash.split(/\s+/).map(Number);
  assert.equal(so.length, 2, `\`dash\` phải là "vạch khe", đang là "${SKY_ZODIAC.dash}"`);
  assert.ok(so.every((v) => v > 0),
    `\`dash\` = "${SKY_ZODIAC.dash}" — một số bằng 0 nghĩa là nét LIỀN, và cung liền đọc ra`
    + ' là "một nét nối chòm dài", tức nói rằng tám chặng có một thứ tự');
  assert.ok(!lop(CHOM, 'net-chom').includes('stroke-dasharray'),
    'nét trong chòm cũng đứt — hai loại nét đứt trên một bản đồ là hai thứ không phân biệt được');
  // 2 · sắc RIÊNG, không chia với tám sắc chặng (luật Stellarium, §4.1).
  assert.ok(m.includes(`stroke="${P.zodiac}"`), 'mạch không dùng `profile.zodiac`');
  for (const [k, hue] of Object.entries(P.hues)) {
    assert.ok(!m.includes(hue), `mạch dùng sắc của chặng ${k} — hai loại nét chia chung một sắc`);
  }
  assert.ok(!Object.values(P.hues).includes(P.zodiac), 'sắc mạch trùng một sắc chặng');
  // 3 · DẢI chứ không VẠCH: hai nét song song, nét ngoài mờ hơn.
  const ops = [...m.matchAll(/stroke-opacity="([\d.]+)"/g)].map((g) => +g[1]);
  assert.equal(ops.length, 2, 'mạch phải là HAI nét song song — atlas cổ vẽ hoàng đạo là một DẢI');
  assert.ok(Math.min(...ops) < Math.max(...ops), 'hai nét của dải cùng độ mờ');
  // 4 · KHÔNG mũi tên, KHÔNG chữ: nó là một quan hệ, không phải một lộ trình.
  assert.ok(!/<text|marker|arrow/i.test(MACH), 'mạch có chữ hoặc mũi tên');
});

test('mạch đi SÁT bốn mốc M5→M6→M7→M8, không chạm ngôi nào, và KHÔNG nối 1→8', () => {
  const d = lop(MACH, 'mach-hoang-dao').match(/ d="([^"]+)"/)[1];
  const pts = giaiPath(d);
  assert.ok(pts.length > 40, `cung chỉ có ${pts.length} điểm — nó không phải một cung trơn`);
  // Tự kiểm bộ giải path trên một mẫu dựng tay.
  assert.deepEqual(giaiPath('M10 20l5 0l0 5'), [[10, 20], [15, 20], [15, 25]]);

  // Không chạm ngôi nào (≥ clearMin): cung dính một ngôi thì nó đọc ra là nét
  // của chòm, và ba lớp liên kết của §4 lẫn vào nhau.
  for (const [code, p] of Object.entries(VI_TRI)) {
    const k = khoangTuyen(p.x, p.y, pts);
    assert.ok(k >= SKY_ZODIAC.clearMin - 1.5,
      `mạch chạy cách ngôi ${code} chỉ ${k.toFixed(1)} px, dưới ${SKY_ZODIAC.clearMin}`);
  }
  // …nhưng ĐI SÁT bốn mốc đã khai.
  for (const a of zodiacAnchors()) {
    const k = khoangTuyen(a.x, a.y, pts);
    assert.ok(k <= 4, `mạch đi cách một mốc tới ${k.toFixed(1)} px — mốc là điểm cung phải qua`);
  }
  // …và nó đi qua ĐÚNG bốn chòm M5 M6 M7 M8, không chòm nào khác. "Không một
  // nét nào nối 1→8": khoá này không có thứ tự đó, vẽ ra là nói sai.
  const gan = new Set();
  for (const p of Object.values(VI_TRI)) {
    if (khoangTuyen(p.x, p.y, pts) <= SKY_ZODIAC.nearMax + 12) gan.add(p.key);
  }
  assert.deepEqual([...gan].sort(), ['M5', 'M6', 'M7', 'M8'],
    `mạch đi sát các chòm ${[...gan].sort().join(', ')} — phụ thuộc THẬT chỉ có M5→M6→M7→M8`);
  // Và mạch đi GIỮA hai ngôi M8, không sát một ngôi.
  const d1 = khoangTuyen(VI_TRI.DA01.x, VI_TRI.DA01.y, pts);
  const d2 = khoangTuyen(VI_TRI.DA02.x, VI_TRI.DA02.y, pts);
  assert.ok(Math.abs(d1 - d2) < 6, `mạch lệch về một ngôi M8 (${d1.toFixed(1)} vs ${d2.toFixed(1)})`);
});

test('KHÔNG một `<path>` ranh giới chòm nào — đó là quy ước Bayer, không phải chỗ bỏ sót', () => {
  // IAU 1930 chia TRỌN bầu trời: mọi điểm thuộc về đúng một chòm. Bayer 1603
  // chỉ có hình, khoảng trời giữa các chòm KHÔNG thuộc về ai. Chọn Bayer, vì
  // ranh giới chia trọn là một lời khẳng định rằng mọi thứ đều thuộc về một
  // chặng nào đó — không đúng với một khoá học.
  assert.ok(!SKY_LAYERS.includes('ranh-gioi'), 'SKY_LAYERS có một lớp ranh giới');
  const canh = new Set();
  for (const c of SKY_CONSTELLATIONS) for (const ab of c.lines) canh.add(`${ab[0]}|${ab[1]}`);
  // Mỗi `M…` trong lớp nét chòm phải là một nét ĐÃ KHAI, không có nét thừa.
  assert.equal(lop(CHOM, 'net-chom').match(/M-?\d/g).length, canh.size);
  // …và vùng bấm KHÔNG chia hết bầu trời: tổng diện tích tám ô bao lồi phải
  // nhỏ hơn hẳn diện tích khung, nếu không thì ta đang vẽ ranh giới IAU bằng
  // một cách khác.
  const o = [...CSS_CODE.matchAll(/\.hitM\da\s*\{[^}]*width:\s*([\d.]+)%[^}]*height:\s*([\d.]+)%/g)]
    .map((m) => +m[1] * +m[2] / 10000);
  assert.equal(o.length, 8, 'thiếu ô bấm bao lồi');
  const phu = o.reduce((a, b) => a + b, 0);
  assert.ok(phu < 0.55, `tám ô bấm phủ ${(phu * 100).toFixed(0)}% bầu trời — gần như chia hết`);
});

test('dải Ngân Hà là MỘT thể liên tục cắt ngang cả bầu trời', () => {
  // Bài học đắt nhất của bản vực: phải có một thể liên tục duy nhất mà mọi
  // phần đều thuộc về, nếu không tám phần vẫn là tám mảnh rời. Ở đây đo bằng
  // chính các đường đồng mức: chúng phải có mặt ở CẢ hai lề và ở giữa, theo
  // đúng trục khai trong `SKY_MILKYWAY`.
  const tv = lop(TROI, 'tinh-van') + lop(TROI, 'bui-xa');
  const xs = [...tv.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => +m[1]);
  assert.ok(xs.length > 10, 'không đủ đường đồng mức để đo');
  assert.ok(Math.min(...xs) < SKY_FRAME.width * 0.1, 'dải không chạm lề trái');
  assert.ok(Math.max(...xs) > SKY_FRAME.width * 0.9, 'dải không chạm lề phải');
  // Trục của dải đi XUỐNG-LÊN qua cả khung (0,650) → (1360,230): đó là thứ
  // cắt qua cả bốn dải độ cao, nên mọi chòm đều nằm trong nó hoặc ngoài nó.
  assert.equal(SKY_MILKYWAY.from.x, 0);
  assert.equal(SKY_MILKYWAY.to.x, SKY_FRAME.width);
  assert.ok(SKY_MILKYWAY.from.y > SKY_MILKYWAY.to.y, 'dải không còn chạy chéo');
  // Khe bụi tối phải NHÂN vào trong chính dải ấy — tín hiệu che khuất mạnh
  // nhất trong bảy tín hiệu chiều sâu (§3.2).
  assert.ok(lop(TROI, 'khe-bui').includes(`fill="${P.dustLane}"`), 'mất khe bụi tối');
});

/* ═══ 10 · NGUỒN SÁNG TRỘI VÀ NGÂN SÁCH ĐỘ CHÓI ═══════════════════════ */

test('một nguồn sáng trội: ở xa mọi bao lồi và xa mạch, và script TỰ ĐO ngân sách', () => {
  // Bản đánh giá `chieu-sau-tuong-tac.md` §2.4: trần độ chói TOÀN CỤC đã bị
  // bỏ và thay bằng ngân sách theo DIỆN TÍCH. Ca này canh cho nó không lặng
  // lẽ quay lại thành một con số trong chú thích.
  assert.ok(!('ceiling' in P), '`profile.ceiling` (trần toàn cục) quay lại — nó là thứ ép dải'
    + ' độ chói của cả bức, và §8 đã giải ràng buộc "chữ đọc được" ở mức CỤC BỘ rồi');
  assert.ok('hullCeiling' in P && 'textCeiling' in P, 'mất hai trần CỤC BỘ — chúng là ràng buộc'
    + ' tiếp cận ở đúng chỗ có nét mang tin và có chữ');
  assert.ok(SKY_BUDGET.brightShareMin >= 0.02 && SKY_BUDGET.medianMax <= 0.05);
  assert.ok(/def kiem_ngan_sach/.test(PY) && /raise SystemExit/.test(PY),
    'build_sky.py không còn tự chặn theo ngân sách');
  assert.ok(/kiem_ngan_sach\(P\)/.test(PY_CODE.split('def kiem_ngan_sach')[1] ?? ''),
    'ngân sách được định nghĩa mà không ai gọi');

  // Vị trí: lõi nằm TRỌN trong khung, và quầng không chạm bao lồi chòm nào
  // (nếu chạm thì độ chói trong bao lồi vượt `hullCeiling` và nét chòm ở đó
  // tụt dưới 3:1).
  const { x, y } = SKY_LIGHT.at;
  const R = SKY_LIGHT.outer * (1 + SKY_LIGHT.warp);
  assert.ok(x - SKY_LIGHT.core > 0 && y - SKY_LIGHT.core > 0
    && x + SKY_LIGHT.core < SKY_FRAME.width && y + SKY_LIGHT.core < SKY_FRAME.height,
  'lõi nguồn sáng bị mép khung cắt — ngân sách diện tích tính trên phần THẤY ĐƯỢC');
  for (const [code, p] of Object.entries(VI_TRI)) {
    assert.ok(Math.hypot(p.x - x, p.y - y) > R + SKY_FIELD.ceilingPad,
      `nguồn sáng phủ lên ngôi ${code} (${p.key})`);
  }
  const pts = giaiPath(lop(MACH, 'mach-hoang-dao').match(/ d="([^"]+)"/)[1]);
  assert.ok(khoangTuyen(x, y, pts) > R,
    'nguồn sáng phủ lên mạch hoàng đạo — nét MANG TIN cũng phải giữ 3:1');

  // Mở TỈ LỆ: vật sáng lớn nhất / sao nền. Và nó KHÔNG được đạt bằng cách
  // phóng to một ngôi nào — bán kính 48 ngôi vẫn do số ca chấm quyết.
  const ti = (SKY_LIGHT.core * 2) / (SKY_FIELD.radius * 2);
  assert.ok(ti >= SKY_BUDGET.scaleRatioMin,
    `tỉ lệ vật lớn nhất : sao nền chỉ ${ti.toFixed(1)}:1`);
  assert.equal(SKY_MAGNITUDE.base, 2.2, 'bán kính ngôi bị chỉnh để lấy tỉ lệ');
});

/* ═══ 11 · NHÃN — LUẬT NEO VÀ LUẬT NHƯỜNG ═════════════════════════════ */

test('tám nhãn: neo vào ngôi sáng nhất còn đặt được, đường dẫn 30°, không hộp nào chồng nhau', () => {
  assert.equal(SKY_LABEL_PLACED.length, 8);
  // Thứ tự các dòng LÀ thứ tự nhường (§8.4): chòm có ngôi neo sáng nhất đặt
  // trước và giữ chỗ. Với một nhãn thì luật này không thử được; tám nhãn mới
  // là lúc nó phải đúng.
  const sang = (key) => Math.max(...byKey[key].stars.map((s) => starMagnitude(SO_CA[s.code]).radius));
  const mong = [...SKY_CONSTELLATIONS].map((c) => c.key)
    .sort((a, b) => sang(b) - sang(a) || a.localeCompare(b));
  assert.deepEqual(SKY_LABEL_PLACED.map((r) => r.key), mong,
    'SKY_LABEL_PLACED không còn theo thứ tự nhường — sắp lại cho gọn mắt là xoá mất một luật');

  for (const r of SKY_LABEL_PLACED) {
    const c = byKey[r.key];
    assert.ok(c, `thừa chòm ${r.key}`);
    assert.ok(c.stars.some((s) => s.code === r.anchor),
      `${r.key} neo vào ${r.anchor}, không phải ngôi của chòm đó`);
    assert.ok(Math.abs(r.dir[0]) === 1 && Math.abs(r.dir[1]) === 1, 'hướng phải là ±1');
    assert.ok(r.leg >= SKY_LABEL.legMin && r.leg <= SKY_LABEL.legHardMax,
      `đoạn xiên ${r.leg} ngoài khoảng ${SKY_LABEL.legMin}–${SKY_LABEL.legHardMax}`);
  }

  // Hình học §8.3: mọi đoạn xiên ĐÚNG 30°, đo lại từ chính đường dẫn trong SVG.
  const nhan = lop(CHOM, 'nhan');
  const dan = [...nhan.matchAll(/d="M(-?[\d.]+) (-?[\d.]+)l(-?[\d.]+) (-?[\d.]+)l/g)];
  assert.equal(dan.length, 8, `thấy ${dan.length} đường dẫn, phải có 8`);
  for (const g of dan) {
    // Góc so với PHƯƠNG NGANG, không phải góc có dấu: bốn hướng ứng viên cho
    // ra ±30° và ±150°, cả bốn đều là "xiên 30°".
    const tho = Math.abs(Math.atan2(+g[4], +g[3]) * 180 / Math.PI);
    const goc = Math.min(tho, 180 - tho);
    assert.ok(Math.abs(goc - SKY_LABEL.legAngle) < 2.5,
      `một đoạn xiên đo được ${goc.toFixed(1)}°, phải là ${SKY_LABEL.legAngle}° — 45° trùng`
      + ' đường chéo điểm ảnh (răng cưa đều đặn) và trùng góc mắt đọc ra "một mũi tên"');
  }

  // Tám dòng chặng, và KHÔNG MỘT dòng nào khác ở tấm nghỉ.
  const chu = [...nhan.matchAll(/<text x="(-?[\d.]+)" y="(-?[\d.]+)">([^<]*)<\/text>/g)]
    .map((m) => ({ x: +m[1], y: +m[2], s: m[3] }));
  for (const c of SKY_CONSTELLATIONS) {
    assert.ok(chu.some((t) => t.s === dongChang(c)),
      `không thấy dòng chặng "${dongChang(c)}"`);
  }
  assert.equal(chu.length, 8,
    `tấm nghỉ có ${chu.length} dòng chữ, phải có đúng 8 — một dòng cho mỗi chặng. Dòng khoá`
    + ' và mã bài chỉ thuộc tấm TIÊU ĐIỂM.');

  // LUẬT NHƯỜNG: không hai hộp chữ nào chồng nhau, và không hộp nào đè ngôi.
  //
  // Hộp tính CẢ dòng khoá dù tấm nghỉ chưa vẽ nó: một chỗ đặt phải hợp lệ ở
  // CẢ HAI trạng thái, không thì hover đẩy dòng khoá (dài hơn dòng chặng ở sáu
  // trong tám chòm) ra ngoài hộp và lên một ngôi sao — mà nó chỉ rơi lúc
  // hover nên mở bản tĩnh ra không thấy được.
  const hop = SKY_CONSTELLATIONS.map((c) => {
    const t = chu.filter((q) => q.s === dongChang(c));
    assert.equal(t.length, 1, `${c.key} phải có đúng một dòng nhãn lúc nghỉ`);
    const x0 = t[0].x;
    const bw = Math.max(beRongChu(dongChang(c), SKY_LABEL.nameSize),
      beRongChu(dongKhoa(c), SKY_LABEL.subSize)) + SKY_LABEL.rulePad;
    // Dòng chặng ở `p2.y − baselineLift`, nên gạch chân ở `p2.y` và dòng khoá
    // ở `p2.y + sublineGap`: dựng lại hai mép hộp từ chính baseline đọc được.
    const py = t[0].y + SKY_LABEL.baselineLift;
    return {
      key: c.key,
      x0,
      x1: x0 + bw,
      y0: t[0].y - SKY_LABEL.nameSize * 0.8,
      y1: py + SKY_LABEL.sublineGap + SKY_LABEL.subSize * 0.3,
    };
  });
  for (let i = 0; i < hop.length; i += 1) {
    for (let j = i + 1; j < hop.length; j += 1) {
      const a = hop[i]; const b = hop[j];
      assert.ok(!(a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0),
        `hộp nhãn ${a.key} chồng hộp nhãn ${b.key} — đúng lời chê "chữ hơi lệch", và bản cũ`
        + ' không có ai kiểm nên nhãn M3 và M4 chồng nhau mà vẫn xuất ra file');
    }
  }
  for (const h of hop) {
    for (const [code, p] of Object.entries(VI_TRI)) {
      // Trừ 1 px cho phép làm tròn: `nf()` đưa mọi toạ độ trong SVG về SỐ
      // NGUYÊN, nên hộp chữ đo lại từ tranh lệch tới nửa pixel mỗi mép. Và bộ
      // đặt nhãn, theo thiết kế, chọn chỗ RẺ NHẤT còn hợp lệ — tức nó luôn
      // dừng ĐÚNG ở mép ràng buộc. Hai thứ đó cộng lại thì một ca đo khít
      // khe `starPad` sẽ đỏ lên vì nửa pixel, trong khi luật thì vẫn đạt.
      const pad = SKY_LABEL.starPad - 1;
      assert.ok(!(p.x >= h.x0 - pad && p.x <= h.x1 + pad && p.y >= h.y0 - pad && p.y <= h.y1 + pad),
        `hộp chữ ${h.key} đè lên ngôi ${code} — ở Azgaar giấu một BIỂU TƯỢNG đắt gấp ba lần`
        + ' giấu một nhãn: ngôi sao LÀ cái bài, cái tên chỉ là tên');
    }
    assert.ok(h.x0 - SKY_LABEL.boxPad >= 0 && h.x1 + SKY_LABEL.boxPad <= SKY_FRAME.width
      && h.y0 - SKY_LABEL.boxPad >= 0 && h.y1 + SKY_LABEL.boxPad <= SKY_FRAME.height,
    `hộp chữ ${h.key} tràn khỏi khung`);
  }
});

test('nhãn KHÔNG mang tên chòm, và dòng khoá chỉ hiện lúc trỏ vào', () => {
  // Chủ sản phẩm bỏ tên chòm khỏi nhãn ngày 19/10/2026 sau khi xem thật: học
  // viên tìm "chặng nào, học gì", mà "Kẹp" không trả lời câu nào trong hai câu
  // đó — giữ nó là bắt mọi người học một hệ tên THỨ HAI mới dùng được bản đồ.
  //
  // Vì sao một ca test chứ không chỉ một lần sửa: tên chòm vẫn còn trong dữ
  // liệu (`name` là một lời khẳng định về HÌNH, có ca kiểm riêng), nên nó nằm
  // sẵn ở đó để ai sửa tới `ve_nhan` lại in ra. Và nó sẽ hỏng im lặng: chữ vẫn
  // đẹp, tệp vẫn ra, chỉ là nhãn dài lại thành hai dòng và hộp va chạm lệch.
  // SOI CẢ TỆP, KHÔNG CHỈ LỚP `nhan`. Bản đầu của ca này chỉ soi lớp `nhan`,
  // và tên hình đã sống sót trong `aria-label` của chính tấm đó: chữ nhìn thấy
  // là "M1 · Tiến trình" trong khi người dùng trình đọc màn hình nghe "Chòm M1
  // · Kẹp" — một cái tên giao diện không còn dùng và không chỗ nào giải thích.
  // Hỏng im lặng theo đúng nghĩa đen: nó chỉ phát ra thành tiếng.
  for (const [ten, svg] of TAT_CA) {
    for (const c of SKY_CONSTELLATIONS) {
      assert.ok(!svg.includes(c.name),
        `${ten}: còn chữ "${c.name}" trong tệp — tên hình thuộc về tài liệu, không thuộc về`
        + ' bản đồ, kể cả trong aria-label');
    }
  }

  // Tên NGHE ĐƯỢC phải trùng tên NHÌN THẤY. Hai đường ra khác nhau trong
  // `build_sky.py` (`cum_nhan()` và chuỗi `aria-label`) nên chúng trôi khỏi
  // nhau được mà không ai thấy.
  for (const c of SKY_CONSTELLATIONS) {
    const svg = TAT_CA.find(([ten]) => ten === `sky-chom-${c.key}`)?.[1];
    if (!svg) continue;
    const nhan = `${c.key} · ${c.subtitle}`;
    const aria = svg.match(/aria-label="([^"]*)"/)?.[1] ?? '';
    assert.ok(aria.includes(nhan),
      `sky-chom-${c.key}: aria-label "${aria}" không chứa tên nhìn thấy "${nhan}"`);
  }

  // Tấm TIÊU ĐIỂM: đúng chòm đang trỏ có thêm dòng khoá, bảy chòm kia không.
  for (const c of SKY_CONSTELLATIONS) {
    const chu = [...lop(RO[c.key], 'nhan')
      .matchAll(/<text x="-?[\d.]+" y="-?[\d.]+">([^<]*)<\/text>/g)].map((m) => m[1]);
    assert.ok(chu.includes(dongKhoa(c)),
      `tấm ${c.key} thiếu dòng khoá "${dongKhoa(c)}"`);
    for (const k of SKY_CONSTELLATIONS) {
      assert.ok(chu.includes(dongChang(k)), `tấm ${c.key} thiếu dòng chặng của ${k.key}`);
      if (k.key === c.key) continue;
      // Dòng khoá của chòm KHÁC không được hiện — tám dòng khoá cùng lúc là
      // một bảng chữ, không phải một bản khắc.
      assert.ok(!chu.includes(dongKhoa(k)) || dongKhoa(k) === dongKhoa(c),
        `tấm ${c.key} hiện dòng khoá của ${k.key}`);
    }
  }

  // CHỮ của bảy nhãn kia mờ theo `dimTextOpacity`, KHÔNG theo tỉ số của nét
  // (`dimOpacity / lineOpacity[0]` = 0,509). Hai sàn khác nhau: chữ 4,5:1,
  // hình 3:1 — mờ cùng một tỉ số là một thứ trượt trước, và nó đã trượt thật
  // (nhãn M4 còn 4,36:1 ở 0,509).
  for (const c of SKY_CONSTELLATIONS) {
    const nhan = lop(RO[c.key], 'nhan');
    const re = new RegExp(`font-size="${SKY_LABEL.nameSize}"[^>]*fill-opacity="([\\d.]+)"`);
    const m = nhan.match(re);
    assert.ok(m, `tấm ${c.key}: không nhóm chữ chặng nào mờ đi`);
    assert.equal(+m[1], SKY_LABEL.dimTextOpacity,
      `tấm ${c.key}: chữ chặng mờ xuống ${m[1]} nhưng SKY_LABEL.dimTextOpacity là`
      + ` ${SKY_LABEL.dimTextOpacity}`);
    assert.notEqual(SKY_LABEL.dimTextOpacity, P.scale.dimOpacity / P.scale.lineOpacity[0],
      'chữ lại mờ theo tỉ số của NÉT — xem chú thích ở `dimTextOpacity`');
  }

  // SỐ BÀI trong dòng khoá đếm từ danh sách ngôi, nên nó không nói sai được.
  for (const c of SKY_CONSTELLATIONS) {
    assert.match(dongKhoa(c), new RegExp(`· ${c.stars.length} bài$`));
  }

  // TÊN KHOÁ phải khớp danh mục. Đọc `catalog.ts` dạng VĂN BẢN vì nó import
  // alias `@/…` mà `node --test` không phân giải — cùng cách
  // `catalog-naming.test.mjs` làm. Tên khoá này đã đổi một lần
  // (`scripts/rename-python-advanced.ts`) và lần đó phải sửa ba chỗ; bản đồ
  // sao là chỗ thứ tư, nên nó phải có người canh.
  const CATALOG = readFileSync(join(FE, 'src', 'lib', 'catalog.ts'), 'utf8');
  const i = CATALOG.indexOf("id: 'python_advanced'");
  assert.notEqual(i, -1, 'catalog.ts không còn khoá python_advanced');
  const tieuDe = CATALOG.slice(i, i + 400).match(/title:\s*'([^']+)'/);
  assert.ok(tieuDe, 'không đọc được title của python_advanced');
  assert.equal(SKY_COURSE.name, tieuDe[1],
    `SKY_COURSE.name = "${SKY_COURSE.name}" nhưng catalog.ts gọi khoá là "${tieuDe[1]}"`);

  // Và câu gợi ý phải nói ra hover CHO GÌ: nhãn lúc nghỉ không còn tên khoá
  // lẫn số bài, nên nếu không ai nói "trỏ vào thì có" thì chúng là thứ không
  // ai biết để đi tìm.
  for (const tu of ['Tab', 'tên khoá', 'số bài', 'mã bài']) {
    assert.ok(STAR_COPY.hint.includes(tu), `câu gợi ý không nhắc tới "${tu}"`);
  }
  // Chú giải KHÔNG được gọi một chòm bằng tên hình nữa: cái tên ấy không còn ở
  // đâu trên bản đồ để người đọc tìm ra. Đây là cái bẫy của chính lần sửa này
  // — bỏ tên khỏi nhãn thì mọi câu chữ TRỎ VÀO tên đó thành một lời chỉ dẫn
  // vào hư không.
  const cg = STAR_COPY.legend.join(' ');
  for (const c of SKY_CONSTELLATIONS) {
    assert.ok(!cg.includes(`"${c.name}"`),
      `chú giải gọi một chặng bằng tên hình "${c.name}" — gọi bằng mã chặng (M1…M8)`);
  }
  assert.ok(/M6/.test(cg) && /M5/.test(cg),
    'chú giải không còn gọi hai chặng nét đậm/nét trần bằng mã chặng');
});

test('chữ trên CẢ TÁM nhãn đạt 4,5:1, và bộ sinh TỰ ĐO rồi trượt nếu không', () => {
  assert.ok(PYBIN, 'không tìm thấy trình thông dịch Python');
  // Phép đo thật, chạy bằng chính bộ đo của bộ sinh. Đắt (một lượt Python) và
  // vẫn đáng: đổi câu chữ nhãn là đổi bề rộng hộp → đổi chỗ đặt → đổi nền sau
  // chữ, nên 4,5:1 là một con số phải ĐO LẠI mỗi lần, không phải một con số
  // chép vào chú thích một lần rồi tin mãi. Lần này đã đổi câu chữ cả tám.
  const ra = execFileSync(PYBIN, [join(ROOT, 'scripts', 'star', 'build_sky.py'), '--do'],
    { cwd: ROOT, encoding: 'utf8' });
  const dong = [...ra.matchAll(/nhãn (M\d)\s+dòng (\S+)\s+([\d.]+):1/g)];
  // BA phép đo mỗi nhãn: dòng chặng, dòng chặng lúc MỜ (khi một chòm khác
  // được trỏ), dòng khoá. Trạng thái mờ cũng là trạng thái có chữ — và nó là
  // đúng chỗ việc thôi làm mờ bầu trời đã làm vỡ một lần: nền sau chữ không
  // tối theo nữa nên nhãn M4 tụt từ 4,66:1 xuống 4,36:1.
  assert.equal(dong.length, 24,
    `đọc được ${dong.length} số đo nhãn, phải có 24 (8 nhãn × 3 trạng thái)`);
  for (const m of dong) {
    assert.ok(+m[3] >= 4.5,
      `nhãn ${m[1]} dòng ${m[2]} chỉ đạt ${m[3]}:1, dưới 4,5:1 của §5.2`);
  }
  assert.ok(dong.some((m) => m[2] === 'chặng-mờ'), 'không có phép đo nào cho trạng thái mờ');
  // …và chính bộ sinh phải CHẶN, không chỉ in ra: một bảng số in ra mà không
  // ai đọc thì bằng không có.
  assert.ok(/def kiem_tuong_phan_nhan\(P, san=4\.5\)/.test(PY),
    'build_sky.py không còn hàm chặn tương phản nhãn ở sàn 4,5');
  assert.ok(/kiem_tuong_phan_nhan\(P\)/.test(PY_CODE.split('def main')[1] ?? ''),
    'main() không gọi kiem_tuong_phan_nhan — build sẽ xuất ra nhãn không đọc được');
});

/* ═══ 12 · CHÍN TẤM CHÒM CHỈ KHÁC NHAU Ở ĐỘ MỜ ════════════════════════ */

test('tấm tiêu điểm chỉ đổi ĐỘ MỜ: không bán kính nào to lên, không nét nào dày lên', () => {
  // Đây là điều làm cả bản này an toàn với `prefers-reduced-motion` ngay từ
  // lúc SINH. WCAG có một định nghĩa hẹp dễ đọc nhầm: đổi màu/độ mờ KHÔNG tính
  // là hoạt ảnh chuyển động, còn đổi KÍCH THƯỚC thì tính. Nếu tấm tiêu điểm
  // đổi bán kính thì phải sinh thêm một tấm thứ ba cho `reduce`, và tấm thứ
  // ba là chỗ ba bức trôi ra xa nhau.
  const rNghi = vongTron(lop(CHOM, 'sao-bai')).map((c) => c.r).sort();
  const wNghi = [...new Set(beRong(lop(CHOM, 'net-chom')))].sort();
  for (const c of SKY_CONSTELLATIONS) {
    const svg = RO[c.key];
    assert.deepEqual(vongTron(lop(svg, 'sao-bai')).map((q) => q.r).sort(), rNghi,
      `${c.key}: ngôi to lên khi trỏ vào — đổi kích thước là "chuyển động"`);
    assert.deepEqual([...new Set(beRong(lop(svg, 'net-chom')))].sort(), wNghi,
      `${c.key}: nét chòm dày lên khi trỏ vào`);
  }

  // Nhưng phản hồi thì phải CÓ, và nó phải đúng CHÒM: chòm được trỏ sáng lên
  // tới `lineOpacity[1]`, BẢY chòm kia tụt xuống `dimOpacity`.
  const op = (s) => [...s.matchAll(/stroke-opacity="([\d.]+)"/g)].map((m) => +m[1]);
  const [nghi, ro] = P.scale.lineOpacity;
  assert.deepEqual([...new Set(op(lop(CHOM, 'net-chom')))], [nghi],
    'tấm nghỉ không để tám chòm cùng một độ mờ');
  for (const c of SKY_CONSTELLATIONS) {
    const ds = [...new Set(op(lop(RO[c.key], 'net-chom')))].sort((a, b) => a - b);
    assert.deepEqual(ds, [P.scale.dimOpacity, ro],
      `${c.key}: độ mờ nét chòm là ${ds.join('/')} — phải là ${P.scale.dimOpacity} (bảy chòm`
      + ` kia) và ${ro} (chòm được trỏ)`);
    // Mã bài hiện ra ở ĐÚNG chòm đang trỏ, và chỉ ở đó.
    for (const s of c.stars) assert.ok(RO[c.key].includes(`>${s.code}<`), `thiếu mã ${s.code}`);
    const la = SKY_CONSTELLATIONS.find((o) => o.key !== c.key).stars[0].code;
    assert.ok(!RO[c.key].includes(`>${la}<`), `${c.key} hiện mã bài ${la} của chòm khác`);
  }
  for (const s of SKY_CONSTELLATIONS[0].stars) {
    assert.ok(!CHOM.includes(`>${s.code}<`), `tấm nghỉ đã hiện mã bài ${s.code}`);
  }
});

/* ═══ 13 · TẤT ĐỊNH VÀ TRẦN DUNG LƯỢNG ════════════════════════════════ */

const PYBIN = ['py', 'python3', 'python'].find((bin) => {
  const r = spawnSync(bin, ['--version'], { encoding: 'utf8' });
  return r.status === 0;
});

test('chạy script hai lần ra ĐÚNG một bộ mười hai tệp', () => {
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
    assert.equal(readdirSync(a).length, TEN_TEP_SINH.length,
      'số tệp sinh ra lệch với danh sách tấm');
    for (const f of TEN_TEP_SINH) {
      assert.equal(readFileSync(join(a, f), 'utf8'), readFileSync(join(b, f), 'utf8'),
        `${f} đổi giữa hai lần chạy — mỗi lần build sẽ là một diff vô nghĩa`);
      // Và nó phải khớp tệp ĐÃ COMMIT: tranh là tập SINH RA, sửa tay là lần
      // chạy sau xoá sạch.
      assert.equal(readFileSync(join(a, f), 'utf8'), doc(f),
        `${f} trong public/ lệch với thứ script sinh ra — hoặc ai đó sửa tay, hoặc quên`
        + ' chạy lại `py scripts/star/build_sky.py`');
    }
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test('mỗi tệp dưới trần, và CẢ BỘ dưới trần tổng — script tự chặn cả hai', () => {
  const tran = Number(PY.match(/^MAX_KB = (\d+)/m)[1]);
  const tranTong = Number(PY.match(/^MAX_TOTAL_KB = (\d+)/m)[1]);
  assert.ok(tran > 0 && tran <= 900, `trần mỗi tệp ${tran} KB vô lý`);
  assert.ok(tranTong <= 900, `trần tổng ${tranTong} KB vượt mốc 900 KB của đặc tả §9.2`);
  let tong = 0;
  for (const f of TEN_TEP) {
    const kb = statSync(join(FE, 'public', 'map', 'star', f)).size / 1024;
    tong += kb;
    assert.ok(kb < tran, `${f} nặng ${kb.toFixed(0)} KB, vượt trần ${tran} KB`);
  }
  assert.ok(tong < tranTong, `cả bộ nặng ${tong.toFixed(0)} KB, vượt trần ${tranTong} KB`);
  // Chia lớp phải GIẢM byte chứ không tăng: tấm trời dựng MỘT lần thay vì
  // chín lần. Tấm trời cộng tấm sao nền phải nhỏ hơn hẳn chín tấm chòm.
  const troiKb = ['sky-troi.svg', 'sky-sao-nen.svg', 'sky-mach.svg']
    .reduce((n, f) => n + statSync(join(FE, 'public', 'map', 'star', f)).size / 1024, 0);
  assert.ok(troiKb < tong * 0.4,
    `phần trời chiếm ${(troiKb / tong * 100).toFixed(0)}% cả bộ — phép chia lớp sai chỗ`);
});

/* ═══ 14 · HAI HỒ SƠ KHÔNG ĐƯỢC TRÔI XA NHAU ══════════════════════════ */

test('hồ sơ khai đủ cơ chế để bản sáng cắm vào mà không cần nhánh `if` nào trong Python', () => {
  // §19.1: `build_sky.py` không được có nhánh theo TÊN hồ sơ — nhánh `if` theo
  // tên là đúng chỗ hai bản trôi xa nhau mà không ai thấy.
  assert.ok(!/profile\s*==\s*['"]light['"]|args\.profile\s*==/.test(PY_CODE),
    'build_sky.py có một nhánh rẽ theo TÊN hồ sơ');
  for (const k of ['render', 'stipple', 'core', 'halo', 'scale', 'hueBranch', 'zodiac', 'glow']) {
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
  // Và bộ sinh phải ĐỌC khối đó, không tự tìm lại. Nếu nó tự tìm thì hai hồ sơ
  // sẽ tự tính ra hai chỗ đặt nhãn khác nhau, và kiểu hỏng là kiểu im lặng —
  // không ai mở hai bản cạnh nhau để so.
  assert.ok(/PLACED = grab\("SKY_LABEL_PLACED"\)/.test(PY));
  assert.ok(/def nhan_box\([\s\S]{0,1200}?rec = next\(/.test(PY),
    'nhan_box() không còn đọc SKY_LABEL_PLACED');
  // …và nó phải KIỂM LẠI khối ấy mỗi lần build, nếu không một khối cũ sẽ âm
  // thầm đặt chữ chồng lên sao sau khi hình chòm đổi.
  assert.ok(/def nhan_box\([\s\S]{0,2200}?nhan_vi_pham\(/.test(PY),
    'nhan_box() không kiểm lại chỗ đặt đã đóng băng');
});

test('danh sách khoá chòm khớp danh sách chòm', () => {
  assert.deepEqual([...SKY_CONSTELLATION_KEYS], SKY_CONSTELLATIONS.map((c) => c.key),
    'SKY_CONSTELLATION_KEYS (Python đọc) lệch với SKY_CONSTELLATIONS (React đọc)');
});

/* ═══ 15 · LỚP PHỦ HOVER ═══════════════════════════════════════════════ */

test('mười sáu ô bấm khớp bao lồi chòm nở 20 px và hộp nhãn, tính lại từ chính tranh', () => {
  const chu = [...lop(CHOM, 'nhan').matchAll(/<text x="(-?[\d.]+)" y="(-?[\d.]+)">([^<]*)<\/text>/g)]
    .map((m) => ({ x: +m[1], y: +m[2], s: m[3] }));
  for (const c of SKY_CONSTELLATIONS) {
    const sao = c.stars.map((s) => placeStar(c, s));
    const pad = SKY_HIT.hullPad;
    const bl = {
      left: (Math.min(...sao.map((s) => s.x)) - pad) / SKY_FRAME.width * 100,
      top: (Math.min(...sao.map((s) => s.y)) - pad) / SKY_FRAME.height * 100,
      width: (Math.max(...sao.map((s) => s.x)) - Math.min(...sao.map((s) => s.x)) + pad * 2)
        / SKY_FRAME.width * 100,
      height: (Math.max(...sao.map((s) => s.y)) - Math.min(...sao.map((s) => s.y)) + pad * 2)
        / SKY_FRAME.height * 100,
    };
    const khoi = CSS_CODE.match(new RegExp(`\\.hit${c.key}a\\s*\\{([^}]*)\\}`));
    assert.ok(khoi, `star-map.module.css thiếu .hit${c.key}a`);
    const so = Object.fromEntries(
      [...khoi[1].matchAll(/(left|top|width|height):\s*([\d.]+)%/g)].map((m) => [m[1], +m[2]]),
    );
    for (const k of ['left', 'top', 'width', 'height']) {
      assert.ok(Math.abs(so[k] - bl[k]) < 0.5,
        `.hit${c.key}a ${k} = ${so[k]}% nhưng tính lại từ tranh ra ${bl[k].toFixed(2)}% —`
        + ' vùng bấm không còn trùm lên chòm. Chạy `build_sky.py --css`.');
    }
    // Ô NHÃN phải khớp HỘP CHỮ, tính lại từ chính dòng chữ trong tranh — nếu
    // không thì "bấm vào nhãn cũng là mở chặng" chỉ là một lời.
    //
    // So cả bốn con số chứ không chỉ "có trùm lên dòng chữ không": nhãn vừa
    // ngắn lại một dòng (19/10/2026), và kiểu lỗi đúng của lần ấy là NHỚ sửa
    // câu chữ mà QUÊN chạy lại `--css`. Một phép kiểm "có trùm lên" thì một ô
    // bấm rộng dư 60 px vẫn qua, trong khi nó đang ăn con trỏ của chòm bên.
    const t = chu.find((q) => q.s === dongChang(c));
    assert.ok(t, `tấm nghỉ thiếu dòng chặng của ${c.key}`);
    const bwN = Math.max(beRongChu(dongChang(c), SKY_LABEL.nameSize),
      beRongChu(dongKhoa(c), SKY_LABEL.subSize)) + SKY_LABEL.rulePad;
    const pyN = t.y + SKY_LABEL.baselineLift;
    const hn = {
      left: t.x / SKY_FRAME.width * 100,
      top: (t.y - SKY_LABEL.nameSize * 0.8) / SKY_FRAME.height * 100,
      width: bwN / SKY_FRAME.width * 100,
      height: (SKY_LABEL.nameSize * 0.8 + SKY_LABEL.baselineLift + SKY_LABEL.sublineGap
        + SKY_LABEL.subSize * 0.3) / SKY_FRAME.height * 100,
    };
    assert.ok(hn.top + hn.height > pyN / SKY_FRAME.height * 100, 'hộp nhãn không bọc gạch chân');
    const nk = CSS_CODE.match(new RegExp(`\\.hit${c.key}b\\s*\\{([^}]*)\\}`));
    assert.ok(nk, `thiếu .hit${c.key}b`);
    const ns = Object.fromEntries(
      [...nk[1].matchAll(/(left|top|width|height):\s*([\d.]+)%/g)].map((m) => [m[1], +m[2]]),
    );
    for (const k of ['left', 'top', 'width', 'height']) {
      assert.ok(Math.abs(ns[k] - hn[k]) < 0.5,
        `.hit${c.key}b ${k} = ${ns[k]}% nhưng hộp chữ trong tranh ra ${hn[k].toFixed(2)}% —`
        + ' câu chữ nhãn đổi mà chưa chạy lại `build_sky.py --css`.');
    }
  }
  // TÁM ô BAO LỒI không được chồng nhau: ô nào nằm sau trong DOM sẽ nuốt con
  // trỏ của ô kia, tức trỏ vào chòm này lại làm chòm khác sáng lên.
  const o = SKY_CONSTELLATIONS.map((c) => {
    const k = CSS_CODE.match(new RegExp(`\\.hit${c.key}a\\s*\\{([^}]*)\\}`))[1];
    const s = Object.fromEntries(
      [...k.matchAll(/(left|top|width|height):\s*([\d.]+)%/g)].map((m) => [m[1], +m[2]]),
    );
    return { key: c.key, ...s };
  });
  for (let i = 0; i < o.length; i += 1) {
    for (let j = i + 1; j < o.length; j += 1) {
      const a = o[i]; const b = o[j];
      assert.ok(!(a.left < b.left + b.width && a.left + a.width > b.left
        && a.top < b.top + b.height && a.top + a.height > b.top),
      `ô bấm ${a.key} chồng ô bấm ${b.key}`);
    }
  }
});

test('`:focus-visible` cho ra đúng cùng một trạng thái như `:hover`, cho CẢ TÁM chòm', () => {
  for (const c of SKY_CONSTELLATIONS) {
    const re = new RegExp(`\\.hit${c.key}:hover ~ \\.chom${c.key},\\s*\\.hit${c.key}:focus-visible ~ \\.chom${c.key}`);
    assert.match(CSS_CODE, re,
      `${c.key}: hover và focus-visible không chung một khối — người đi bằng Tab thấy một`
      + ' bản đồ khác');
  }
  assert.match(CSS_CODE, /\.hit:hover ~ \.chomNghi,\s*\.hit:focus-visible ~ \.chomNghi/);
  assert.match(CSS_CODE, /\.hit:focus-visible\s*\{[^}]*outline:/, 'thiếu vòng tiêu điểm');
  // Mọi `<a>` phải đứng TRƯỚC mọi `<img>`: bộ chọn anh em `~` chỉ nhìn về phía
  // SAU, nên thứ tự DOM là một hợp đồng chứ không phải một cách sắp cho gọn.
  assert.ok(TSX_CODE.lastIndexOf('<a') < TSX_CODE.indexOf('<img'),
    'có một <a> vùng bấm đứng sau <img> — `.hitM1:hover ~ .chomM1` sẽ không khớp');
});

test('TRỜI KHÔNG MỜ ĐI lúc trỏ vào — liên kết giữa tám chòm không được biến mất', () => {
  // Bản trước hạ CẢ BA tấm trời xuống `scale.skyDim` = 0,62 lúc hover, và nó
  // sai theo hai tầng. Ca này canh tầng thứ hai, tầng không ai thấy bằng mắt
  // được nếu chỉ sửa cái nền:
  //
  //  · tầng một là một lỗi màu — nền khung tô `--ds-page` (trắng xanh ở bản
  //    sáng), nên hạ độ mờ một lớp TỐI trên nền SÁNG làm nó NHẠT thành xám
  //    sữa chứ không tối đi. Ca `nền khung là màu nền trời` dưới canh tầng ấy;
  //  · tầng hai: mờ cả trời là mờ luôn tinh vân, dải Ngân Hà và mạch hoàng
  //    đạo — tức mờ đúng cái LIÊN KẾT giữa tám chòm, ngay lúc người ta đang
  //    chọn. Cả bầu trời được dựng ra để trả lời "chòm này nối với các chòm
  //    khác như nào"; làm nó mờ đi lúc hover là xoá câu trả lời đúng lúc có
  //    người hỏi. Đo được: tương phản lõi Ngân Hà / trời trống 15,8:1 → 6,4:1
  //    (mất 59%), đổi lấy +3% tỉ số hình/nền. Không đáng.
  //
  // Phép kiểm là "không quy tắc nào hạ độ mờ `.troi`", không phải "`.troi`
  // không xuất hiện": nó vẫn cần `pointer-events: none`.
  for (const m of CSS_CODE.matchAll(/([^{}]*\.troi[^{}]*)\{([^}]*)\}/g)) {
    const op = m[2].match(/opacity:\s*([\d.]+)/);
    assert.ok(!op || +op[1] === 1,
      `CSS hạ độ mờ phần trời xuống ${op?.[1]} ở "${m[1].trim()}" — cả bầu trời mờ theo thì`
      + ' tinh vân, Ngân Hà và mạch hoàng đạo biến mất đúng lúc người ta đang chọn một chặng');
  }
  // Và hồ sơ không được còn khoá `skyDim`: một hệ số nằm đó không ai đọc là
  // một lời mời cắm nó trở lại.
  assert.ok(!('skyDim' in P.scale),
    'SKY_PROFILE_DARK.scale còn `skyDim` — khoá đó đã bỏ, xem chú thích ở `scale`');
  // Việc làm nổi phải nằm TRỌN ở lớp chòm, và nó vẫn còn đó.
  assert.ok(P.scale.dimOpacity < P.scale.lineOpacity[0],
    'bảy chòm kia không mờ hơn trạng thái nghỉ — không còn hiệu ứng làm nổi nào cả');
});

test('nền khung là MÀU NỀN TRỜI, sinh ra từ hồ sơ — không phải `--ds-page`', () => {
  // Đây là lỗi chủ sản phẩm đã định vị: `.frame { background: var(--ds-page) }`
  // mà `--ds-page` bản sáng là một màu trắng xanh. Nền ấy lộ ra lúc ảnh chưa
  // tải xong, và trước đây còn lộ ra mỗi lần hover.
  const frame = CSS_CODE.match(/\.frame\s*\{([^}]*)\}/);
  assert.ok(frame, 'CSS thiếu .frame');
  assert.match(frame[1], /background:\s*var\(--sky-base\)/,
    '.frame không tô bằng `var(--sky-base)`');
  assert.ok(!/--ds-page/.test(frame[1]),
    '.frame tô bằng `--ds-page` — token đó SÁNG ở bản sáng, nên bầu trời gần đen sẽ lộ một'
    + ' nền trắng xanh xuyên qua bất cứ lúc nào một tấm trời không kín sáng');

  // Và giá trị của biến phải ĐÚNG BẰNG `base` của hồ sơ. Tệp này do
  // `build_sky.py` sinh ra chính vì thế: `lint:tokens` cấm hex trong
  // `*.module.css`, nên nếu màu không đi qua một tệp SINH RA thì nó sẽ bị chép
  // tay vào đâu đó, và một mã chép tay là một chỗ bản tối với bản sáng trôi xa
  // nhau.
  const v = THEME.match(/--sky-base:\s*(#[0-9A-Fa-f]{6})\s*;/);
  assert.ok(v, 'sky-theme.css không khai --sky-base');
  assert.equal(v[1].toUpperCase(), P.base.toUpperCase(),
    `sky-theme.css nói ${v[1]} nhưng SKY_PROFILE_DARK.base là ${P.base} — chạy lại`
    + ' `py scripts/star/build_sky.py`');
  // Trang phải THẬT SỰ nạp tệp đó, không thì `var(--sky-base)` không có giá
  // trị và thuộc tính `background` bị bỏ hẳn: khung trong suốt, nền trang lộ
  // ra, tức đúng cái lỗi cũ bằng một đường khác.
  assert.ok(TSX_CODE.includes('/map/star/sky-theme.css'),
    'page.tsx không nạp sky-theme.css — `var(--sky-base)` sẽ không phân giải được');
  // `lint:tokens` cấm hex trong module CSS; canh lại ở đây để lỗi nói ra VÌ SAO
  // thay vì chỉ là một dòng grep đỏ.
  assert.ok(!/#[0-9a-fA-F]{3,8}/.test(CSS),
    'star-map.module.css có một mã màu — màu chỉ được sống ở hồ sơ TS');
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
  // LỚP CON TRỎ phải chịu đúng hai luật ấy. Nó là chỗ dễ vi phạm nhất, vì nó
  // là tệp duy nhất có JavaScript chạy trên trang này: một `setInterval` ở đây
  // là một hiệu ứng tự chạy mà CSS không biết, và trang sẽ rơi vào WCAG 2.2.2
  // mà không có nút Dừng nào.
  assert.ok(!/style=\{\{/.test(CUR_CODE), 'lớp con trỏ dùng style nội tuyến');
  assert.ok(!/setInterval|requestAnimationFrame\(\s*function|@keyframes/.test(CUR_CODE),
    'lớp con trỏ có một vòng chạy theo ĐỒNG HỒ — nhóm C của nghiên cứu §3, tức thứ phải cho'
    + ' người dùng tắt và không mua được một tin nào');
  // `requestAnimationFrame` CÓ được dùng, nhưng chỉ để gộp các lượt
  // `pointermove` thành một lượt ghi mỗi khung hình — nó phải được gọi TỪ
  // trình xử lý sự kiện, tức tay người dùng là cái khởi động, không phải đồng
  // hồ. Phép thử: không lượt nào tự hẹn lượt sau.
  const ve = CUR_CODE.slice(CUR_CODE.indexOf('const ve ='), CUR_CODE.indexOf('const diChuyen'));
  assert.ok(ve.length > 100, 'không tìm thấy hàm vẽ một khung của lớp con trỏ');
  assert.ok(!/requestAnimationFrame/.test(ve),
    'hàm vẽ tự hẹn khung sau — đó là một vòng lặp vô hạn mang lốt phản hồi');
  // Toạ độ con trỏ đi vào CSS qua CSSOM (`setProperty`), KHÔNG qua một thuộc
  // tính `style` trong markup: `style-src` chi phối cái sau, không chi phối
  // cái trước, nên cách này không thêm nợ cho việc bỏ `unsafe-inline`.
  assert.match(CUR_CODE, /style\.setProperty\('--cx'/);
});

test('route xem thử không gọi API nào — nó công khai', () => {
  assert.ok(!/apiFetch|fetch\(/.test(CUR_CODE),
    'lớp con trỏ gọi API — nó chạy ở client trên một trang công khai, tức đúng chỗ mỗi con'
    + ' bot sinh một tài khoản khách');
  assert.ok(!/apiFetch|fetch\(/.test(TSX_CODE),
    'trang công khai mà gọi API: `apiFetch` gặp 401 là TỰ TẠO tài khoản khách, tức mỗi con'
    + ' bot quét web sinh một `@guest.local` và ăn một suất của THROTTLE_GUEST_LIMIT');
  // Câu chữ ở TS để `node --test` đọc được, không nằm rải trong JSX.
  for (const s of [STAR_COPY.title, STAR_COPY.hint, STAR_COPY.legendTitle, STAR_COPY.alt]) {
    assert.ok(s.length > 3);
  }
  // Chú giải phải nói ra BA LỚP LIÊN KẾT và nói ra chỗ độ dày nét mang nghĩa.
  // Một bản đồ không có chú giải là một bức tranh, không phải một dụng cụ.
  const cg = STAR_COPY.legend.join(' ');
  for (const tu of ['LIỀN', 'ĐỨT', 'Ngân Hà', 'ĐẬM HƠN', 'sao nền']) {
    assert.ok(cg.includes(tu), `chú giải không nhắc tới "${tu}"`);
  }
});

/* ═══ 18 · LỚP CON TRỎ — "con trỏ có mặt trong bức tranh" ══════════════

   Nghiên cứu: `design/v3/tuong-tac-ban-do.md` §6.1–§6.2. Lớp này hỏng theo
   những cách KHÁC hẳn bức tranh, nên nó cần ca canh riêng — và cả bốn cách
   dưới đây đều hỏng IM LẶNG:

    1. Một lớp `.sao<MÃ>` thiếu trong CSS: CSS module trả về `undefined`, React
       bỏ luôn className, và ngôi ấy dán ở GÓC TRÊN-TRÁI khung. Không lỗi, không
       cảnh báo — chỉ là một ngôi sai chỗ giữa 48 ngôi đúng chỗ.
    2. Một con số toạ độ lệch: dấu ngôi không còn nằm trên ngôi, nên "ngôi gần
       con trỏ nhất tự nhận mình" nhận SAI ngôi. Vẫn mượt, vẫn đẹp, vẫn nói sai.
    3. `SKY_TESTS` cũ: chip in ra một con số ca chấm không còn đúng, trong khi
       bán kính ngôi (tính từ giáo trình) thì đúng. Hai thứ cùng nói về một bài
       mà nói khác nhau, và chỉ cái CHỮ là sai.
    4. Bậc thang 45 ms kể "thứ tự bài" trong khi `stars` xếp theo thứ tự khác:
       một chuyển động nói dối, chạy đúng nhịp. */

test('48 dấu ngôi khớp `placeStar()` từng con số — một lớp thiếu là một ngôi dán ở góc', () => {
  const doc = (css, cls) => {
    const m = css.match(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`));
    if (!m) return null;
    return Object.fromEntries(
      [...m[1].matchAll(/(left|top):\s*([\d.]+)%/g)].map((x) => [x[1], +x[2]]),
    );
  };
  // Tự kiểm: một bộ đọc câm làm cả ca này vô dụng.
  assert.deepEqual(doc('.saoZZ9 { left: 1.5%; top: 2.5%; }', 'saoZZ9'), { left: 1.5, top: 2.5 });
  assert.equal(doc('.saoP01 { left: 1%; }', 'saoXX9'), null);

  for (const c of SKY_CONSTELLATIONS) {
    for (const s of c.stars) {
      const p = placeStar(c, s);
      const k = doc(CSS_CODE, `sao${s.code}`);
      assert.ok(k, `star-map.module.css thiếu .sao${s.code} — CSS module sẽ trả về undefined,`
        + ' className rơi mất và ngôi ấy dán ở góc trên-trái. Chạy `build_sky.py --css`.');
      assert.ok(Math.abs(k.left - (p.x / SKY_FRAME.width) * 100) < 0.01,
        `.sao${s.code} left = ${k.left}% nhưng placeStar() ra`
        + ` ${((p.x / SKY_FRAME.width) * 100).toFixed(3)}%`);
      assert.ok(Math.abs(k.top - (p.y / SKY_FRAME.height) * 100) < 0.01,
        `.sao${s.code} top = ${k.top}% nhưng placeStar() ra`
        + ` ${((p.y / SKY_FRAME.height) * 100).toFixed(3)}%`);
    }
  }
  // …và không một lớp `.sao*` LẠ nào: một mã bài đã bỏ mà còn vị trí trong CSS
  // là một con số sẽ được chép tiếp qua mỗi lần sửa sau.
  const co = [...CSS_CODE.matchAll(/\.sao([A-Z]+\d+)\s*\{/g)].map((m) => m[1]);
  assert.deepEqual([...co].sort(), Object.keys(VI_TRI).sort(),
    'danh sách lớp `.sao*` trong CSS lệch với 48 ngôi của hồ sơ TS');
});

test('`SKY_TESTS` khớp số ca chấm ĐẾM LẠI từ giáo trình — khối đóng băng không được cũ', () => {
  assert.equal(Object.keys(SKY_TESTS).length, 48);
  for (const code of Object.keys(VI_TRI)) {
    assert.equal(SKY_TESTS[code], SO_CA[code],
      `SKY_TESTS.${code} = ${SKY_TESTS[code]} nhưng giáo trình đếm được ${SO_CA[code]} ca chấm`
      + ' — chạy `py scripts/star/build_sky.py --so-ca` rồi chép lại khối. Bán kính ngôi tính'
      + ' từ giáo trình nên nó vẫn ĐÚNG; chỉ con số IN RA cạnh ngôi là sai.');
  }
  for (const code of Object.keys(SKY_TESTS)) {
    assert.ok(VI_TRI[code], `SKY_TESTS có ${code} mà bản đồ không vẽ ngôi nào mã đó`);
  }
  // Câu chú giải nói ra thang phải nói ra thang THẬT, và không còn chỗ `{…}`
  // nào chưa thay — một placeholder sót lại là một câu đọc trôi mà vô nghĩa.
  const r = starScaleRange();
  const nums = Object.keys(VI_TRI).map((code) => SO_CA[code]);
  assert.equal(r.min, Math.min(...nums));
  assert.equal(r.max, Math.max(...nums));
  assert.ok(r.minCodes.length >= 1 && r.maxCodes.length >= 1);
  const line = starScaleLine();
  assert.ok(!/[{}]/.test(line), `câu thang còn placeholder chưa thay: ${line}`);
  assert.ok(line.includes(String(r.min)) && line.includes(String(r.max)));
  for (const code of [...r.minCodes, ...r.maxCodes]) assert.ok(line.includes(code));
  // Và nó phải được DÙNG — một câu chữ đúng nằm trong thư viện mà không ai in
  // ra thì con số vẫn không ai đọc được, tức cái lỗi gốc còn nguyên.
  assert.match(TSX_CODE, /starScaleLine\(\)/,
    'page.tsx không in câu thang bán kính — con số ca chấm lại thành thứ không ai đọc được');
});

test('thứ tự `stars` LÀ thứ tự bài của giáo trình — bậc thang 45 ms kể đúng thứ tự đó', () => {
  // Ca `48 ngôi khớp 48 mã bài` ở trên so hai danh sách đã SẮP, nên nó không
  // bắt được thứ tự. Thứ tự nay mang tin: mã bài bật lên lần lượt theo đúng
  // thứ tự này, và đó là thứ duy nhất trên bản đồ nói ra thứ tự trong một
  // chặng (bản đồ cố ý không vẽ mũi tên lộ trình).
  SKY_CONSTELLATIONS.forEach((c, i) => {
    assert.deepEqual(c.stars.map((s) => s.code), MODULES[i],
      `thứ tự ngôi của ${c.key} lệch thứ tự bài trong curricula.json — bậc thang của lớp`
      + ' con trỏ sẽ kể một thứ tự không có thật');
  });
  // `lessonNumber` phải đếm đúng danh sách phẳng 48 bài: hai chỗ tự cộng dồn
  // (ô bấm cả chặng, và 48 liên kết ngôi) là hai chỗ sẽ lệch, và kiểu lệch là
  // một liên kết dẫn sang bài của chặng khác.
  let n = 0;
  SKY_CONSTELLATIONS.forEach((c, i) => {
    c.stars.forEach((s, j) => {
      n += 1;
      assert.equal(lessonNumber(i, j), n, `lessonNumber(${i}, ${j}) phải ra ${n} (${s.code})`);
    });
  });
  assert.equal(n, 48);
  // Tên nghe được phải nói đủ bốn thứ mà chip nói bằng mắt: người dùng trình
  // đọc màn hình không thấy chip nào hiện ra.
  const nhan = starAriaLabel('M3', 'R02', 20);
  for (const tu of ['Bài 20', 'R02', 'M3', `${SO_CA.R02} ca chấm`]) {
    assert.ok(nhan.includes(tu), `aria-label của ngôi không nhắc "${tu}": ${nhan}`);
  }
});

test('tiết lộ CÓ THỨ TỰ: chín bậc thang khớp `SKY_CURSOR`, và độ trễ không dính vào lượt VỀ', () => {
  const { lead } = SKY_CURSOR;
  const np = CSS_CODE.match(/@media \(prefers-reduced-motion: no-preference\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(np, 'CSS không khai bậc thang trong nhánh `no-preference` — khai ngoài rồi tắt'
    + ' trong `reduce` thì quy tắc nth-child đặc trưng hơn mọi cách tắt viết gọn');
  const bac = [...np[1].matchAll(/nth-child\((\d+)\) \.chip \{ --bac: (\d+)ms/g)];
  const day = Math.max(...SKY_CONSTELLATIONS.map((c) => c.stars.length));
  assert.equal(bac.length, day,
    `có ${bac.length} bậc thang cho chòm dày nhất ${day} ngôi — ngôi thiếu bậc sẽ hiện NGAY,`
    + ' tức đứng sai chỗ trong chính cái thứ tự mà bậc thang sinh ra để kể');
  bac.forEach(([, i, ms]) => {
    assert.equal(+ms, lead.codeDelay + lead.stagger * (+i - 1),
      `bậc ${i} trễ ${ms}ms, nhưng SKY_CURSOR.lead ra`
      + ` ${lead.codeDelay + lead.stagger * (+i - 1)}ms`);
  });
  // Trạng thái NGHỈ phải trễ 0: CSS lấy `transition-*` của trạng thái ĐÍCH, nên
  // một `--bac` khác 0 ở đây là con trỏ rời đi rồi mà bức tranh còn kể nốt.
  const base = CSS_CODE.match(/\n\.chip\s*\{([^}]*)\}/);
  assert.ok(base, 'thiếu quy tắc gốc .chip');
  assert.match(base[1], /--bac:\s*0ms/, 'quy tắc gốc .chip không đặt --bac về 0');
  assert.match(base[1], /transition:\s*opacity\s+\d+ms\s+ease\s+var\(--bac\)/);
  // HAI NHỊP của tấm chòm: cái được chọn tới TRƯỚC (150 ms), bảy cái kia lùi
  // SAU (+120 ms). Trước đây cả hai cùng một nhịp 320 ms — một cái công tắc có
  // bóng đèn chậm.
  assert.match(CSS_CODE, new RegExp(`\\.chomRo\\s*\\{[^}]*transition:\\s*opacity\\s+${lead.tileIn}ms`),
    `.chomRo không còn hiện lên trong ${lead.tileIn}ms`);
  assert.match(CSS_CODE, new RegExp(`--nghi-tre:\\s*${lead.tileOutDelay}ms`),
    `tấm nghỉ không còn lùi lại SAU ${lead.tileOutDelay}ms`);
  // …và quy tắc hover của tấm nghỉ KHÔNG được viết `transition:` trực tiếp: nó
  // đặc trưng hơn `.chomNghi`, nên nó sẽ đè luôn `transition: none` của nhánh
  // `reduce` — người bật giảm chuyển động vẫn nhận đủ 320 ms, trong khi ca test
  // đọc nhánh reduce và báo xanh. Đúng kiểu hỏng im lặng.
  const hv = CSS_CODE.match(/\.hit:hover ~ \.chomNghi,[\s\S]*?\{([^}]*)\}/);
  assert.ok(hv, 'thiếu quy tắc tắt tấm nghỉ lúc hover');
  assert.ok(!/transition:/.test(hv[1]),
    'quy tắc hover của tấm nghỉ viết `transition:` trực tiếp — nó sẽ đè nhánh reduce');
});

test('ngôi được NHẬN và ngôi được TIÊU ĐIỂM cho ra ĐÚNG một trạng thái, cả tám chặng', () => {
  for (const re of [
    /\.sao\[data-gan\],\s*\n\.sao:focus-visible\s*\{/,
    /\.sao\[data-gan\] \.chip,\s*\n\.sao:focus-visible \.chip\s*\{/,
    /\.sao\[data-gan\] \.soCa,\s*\n\.sao:focus-visible \.soCa\s*\{/,
  ]) {
    assert.match(CSS_CODE, re,
      'trạng thái con trỏ và trạng thái bàn phím không chung một khối — người đi bằng Tab/mũi'
      + ' tên sẽ thấy một bản đồ khác người đi bằng chuột');
  }
  for (const c of SKY_CONSTELLATIONS) {
    const k = c.key;
    assert.match(CSS_CODE, new RegExp(`\\.lop\\[data-chang='${k}'\\] ~ \\.chom${k}`),
      `${k}: thiếu đường BÀN PHÍM tới tấm chòm. Ngôi nằm TRONG lớp phủ nên :focus-visible của`
      + ' nó không với tới tấm ảnh được — trạng thái phải đi qua thuộc tính trên lớp phủ');
    assert.match(CSS_CODE, new RegExp(`\\.lop\\[data-chang='${k}'\\] \\.cum${k} \\.chip`),
      `${k}: đi bằng mũi tên không làm hiện mã bài của chặng`);
    assert.match(CSS_CODE, new RegExp(`\\.cum${k} \\{ --sac: var\\(--sky-${k.toLowerCase()}\\)`),
      `${k}: vòng quanh ngôi không lấy sắc của chặng — "ngôi này của chặng nào" lại phải đọc`
      + ' bằng chữ');
  }
  // Ba chục dòng CSS trên là chữ chết nếu JS không đặt hai thuộc tính ấy.
  assert.match(CUR_CODE, /setAttribute\('data-chang'/);
  assert.match(CUR_CODE, /setAttribute\('data-gan'/);
  // Mũi tên · Home/End · Esc, và phải chặn cuộn trang.
  for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Escape', 'Home', 'End']) {
    assert.ok(CUR_CODE.includes(k), `lớp con trỏ không xử lý ${k}`);
  }
  assert.match(CUR_CODE, /preventDefault/, 'mũi tên không chặn cuộn trang');
  // Tiêu điểm LUÂN PHIÊN: 48 chặng dừng Tab mới sẽ nhấn chìm tám ô bấm thật.
  assert.match(CUR_CODE, /tabIndex=\{-1\}/,
    '48 dấu ngôi nhận Tab — tám ô bấm chặng sẽ chìm trong 48 chặng dừng');
  assert.equal((TSX_CODE.match(/tabIndex/g) ?? []).length, 1,
    'page.tsx có thêm/bớt một chỗ đặt tabIndex — ô nhãn là chỗ duy nhất');
});

test('chip đo được bằng HAI mã màu, và vòng HAI NÉT không thể cùng trượt 3:1', () => {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const Lum = (hex) => {
    const v = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const tp = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  // Tự kiểm bộ đo trên hai cặp đã biết trước.
  assert.ok(Math.abs(tp(Lum('#FFFFFF'), Lum('#000000')) - 21) < 0.01);
  assert.ok(Math.abs(Lum('#FFFFFF') - 1) < 1e-9);
  // Hai ngưỡng của phép chứng minh dưới đây, ghim lại bằng số: nét sáng
  // (L = 0,8502) chỉ tụt dưới 3:1 khi nền sáng hơn L = 0,250; nét tối
  // (L = 0,0038) chỉ tụt khi nền tối hơn L = 0,111.
  assert.ok(Math.abs((Lum(P.text) + 0.05) / 3 - 0.05 - 0.2501) < 0.001);
  assert.ok(Math.abs((Lum(P.base) + 0.05) * 3 - 0.05 - 0.1113) < 0.001);

  // CHỮ: nền chip ĐẶC, nên tương phản là một phép tính, không phải một phép
  // lấy mẫu ảnh. Đây là lý do chip có nền thay vì chữ đặt thẳng lên tranh —
  // điểm sáng nhất của bức là L = 0,88, và chữ sáng trên đó thì không có số đo
  // nào cứu được.
  const nen = Lum(P.base);
  for (const [ten, mau, san] of [['--sky-ink', P.text, 4.5], ['--sky-code', P.code, 4.5],
    ['--sky-dim', P.textSub, 4.5]]) {
    const t = tp(Lum(mau), nen);
    assert.ok(t >= san, `${ten} trên nền chip chỉ đạt ${t.toFixed(2)}:1, dưới ${san}:1`);
  }

  // VÒNG DÒ: một nét sáng kèm một nét tối, và phép chứng minh là phép quét —
  // không tồn tại độ chói nền nào làm CẢ HAI nét dưới 3:1. (Nét sáng chỉ tụt
  // dưới 3:1 khi nền sáng hơn L = 0,250; nét tối chỉ tụt khi nền tối hơn
  // L = 0,111. Hai điều kiện loại nhau.) Nhờ thế vòng dò đạt 3:1 trên MỌI chỗ
  // của bầu trời, kể cả giữa vệt loé.
  const sang = Lum(P.text);
  for (let i = 0; i <= 1000; i += 1) {
    const bg = i / 1000;
    assert.ok(Math.max(tp(sang, bg), tp(nen, bg)) >= 3,
      `nền L = ${bg.toFixed(3)} làm cả hai nét của vòng dò dưới 3:1`);
  }
  // …và cả hai nét phải CÓ THẬT trong CSS của ba vật mang tin. Gỡ `outline`
  // tối đi "cho gọn" là gỡ đúng nửa phép chứng minh trên.
  const vong = CSS_CODE.match(/\n\.vong\s*\{([^}]*)\}/);
  assert.ok(vong, 'thiếu quy tắc .vong');
  assert.match(vong[1], /border:[^;]*var\(--sky-ink\)/);
  assert.match(vong[1], /outline:[^;]*var\(--sky-chip\)/);
  const vach = CSS_CODE.match(/\n\.vachX,\s*\n\.vachY\s*\{([^}]*)\}/);
  assert.ok(vach, 'thiếu quy tắc chung của hai vạch lề');
  assert.match(vach[1], /background:\s*var\(--sky-ink\)/);
  assert.match(vach[1], /outline:[^;]*var\(--sky-chip\)/);
  // Mười ba biến của `sky-theme.css` phải đúng hồ sơ — ca "nền khung là màu
  // nền trời" so cả tệp, ở đây chỉ canh rằng chúng CÓ MẶT và lớp CSS đọc đúng
  // tên, vì một `var(--sky-ink)` gõ sai thành `var(--sky-in)` là chữ KHÔNG MÀU
  // trên nền đặc: vẫn đọc được, vẫn sai.
  const theme = readFileSync(join(FE, 'public', 'map', 'star', 'sky-theme.css'), 'utf8');
  for (const bien of [...[...CSS_CODE.matchAll(/var\((--sky-[a-z0-9]+)\)/g)].map((m) => m[1])]) {
    assert.ok(theme.includes(`${bien}:`),
      `CSS đọc ${bien} mà sky-theme.css không khai — một biến không tồn tại làm thuộc tính bị`
      + ' bỏ, tức chữ rơi về màu thừa hưởng');
  }
});

test('MƯỜI SÁU ô bấm đều ≥ 44 px ở bề rộng khung thật — chín ô từng dưới mức đó', () => {
  // Con số này ĐO LẠI, không tin bảng %: bề rộng thì dư sức ở mọi ô (hẹp nhất
  // 72,9 px) nên nhìn % thì mọi ô đều "to", trong khi CHIỀU CAO của chín ô
  // (tám ô nhãn 34,2 px và bao lồi M8 31,4 px) nằm dưới 44.
  const W = 1100 - 32; // `.wrap` max-width trừ 2 × 16 padding
  const H = (W * SKY_FRAME.height) / SKY_FRAME.width; // khung giữ aspect-ratio
  const hitBase = CSS_CODE.match(/\n\.hit\s*\{([^}]*)\}/);
  assert.ok(hitBase, 'thiếu quy tắc gốc .hit');
  const mh = hitBase[1].match(/min-height:\s*(\d+)px/);
  assert.ok(mh, 'ô bấm không còn `min-height` — chín ô sẽ tụt lại dưới 44 px');
  const san = +mh[1];
  assert.ok(san >= 44, `min-height chỉ ${san}px`);

  const o = [];
  for (const m of CSS_CODE.matchAll(/\.hit(M\d)([ab])\s*\{([^}]*)\}/g)) {
    const s = Object.fromEntries(
      [...m[3].matchAll(/(left|top|width|height):\s*([\d.]+)%/g)].map((x) => [x[1], +x[2]]),
    );
    o.push({
      ten: `hit${m[1]}${m[2]}`,
      key: m[1],
      hau: m[2],
      x: (s.left / 100) * W,
      y: (s.top / 100) * H,
      w: (s.width / 100) * W,
      h: Math.max((s.height / 100) * H, san),
    });
  }
  assert.equal(o.length, 16, `đọc được ${o.length} ô bấm, phải có 16`);
  for (const b of o) {
    assert.ok(b.w >= 44 && b.h >= 44,
      `${b.ten} chỉ ${b.w.toFixed(1)} × ${b.h.toFixed(1)} px — dưới vùng chạm 44 px`);
  }
  // …và `min-height` không được tạo ra một cặp BAO LỒI chồng nhau mới: ô nào
  // nằm sau trong DOM thì nuốt con trỏ của ô kia, tức trỏ vào chòm này lại làm
  // chòm khác sáng lên. (Ô NHÃN phủ lên bao lồi thì không sao — luật nhường đã
  // đặt nhãn trước bao lồi trong DOM.)
  const bl = o.filter((b) => b.hau === 'a');
  for (let i = 0; i < bl.length; i += 1) {
    for (let j = i + 1; j < bl.length; j += 1) {
      const a = bl[i]; const b = bl[j];
      assert.ok(!(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y),
        `min-height làm bao lồi ${a.key} chồng bao lồi ${b.key}`);
    }
  }
  // 48 DẤU NGÔI thì KHÔNG phải vùng chạm, và con số nói ra lý do: hai ngôi gần
  // nhau nhất cách nhau dưới 44 px CSS, nên 48 ô 44 px sẽ chồng nhau.
  const vt = Object.values(VI_TRI);
  let khe = Infinity;
  for (let i = 0; i < vt.length; i += 1) {
    for (let j = i + 1; j < vt.length; j += 1) {
      khe = Math.min(khe, Math.hypot(vt[i].x - vt[j].x, vt[i].y - vt[j].y));
    }
  }
  const khePx = (khe / SKY_FRAME.width) * W;
  assert.ok(khePx < 44,
    `khe hai ngôi gần nhau nhất đã là ${khePx.toFixed(1)} px CSS — nếu nó thật sự ≥ 44 thì`
    + ' 48 ngôi ĐÁNG được là vùng chạm và chú thích trong SkyCursor.tsx phải viết lại');
  const sao = CSS_CODE.match(/\n\.sao\s*\{([^}]*)\}/);
  assert.ok(sao, 'thiếu quy tắc gốc .sao');
  assert.match(sao[1], /pointer-events:\s*none/,
    `48 dấu ngôi ăn con trỏ, mà khe giữa hai ngôi chỉ ${khePx.toFixed(1)} px CSS — chúng sẽ`
    + ' chồng nhau VÀ nuốt con trỏ của tám ô bấm thật');
});

test('máy chạm: thiết bị tắt hẳn, nhưng bản đồ KHÔNG chết — và 48 ngôi vẫn ở đó cho bàn phím', () => {
  const kho = CSS_CODE.match(/@media \(hover: none\)\s*\{([\s\S]*?)\n\}/g);
  assert.ok(kho && kho.length >= 1, 'CSS không còn nhánh (hover: none)');
  const het = kho.join('\n');
  for (const v of ['.vong', '.vachX', '.vachY', '.keX', '.keY', '.lanX', '.lanY']) {
    assert.ok(het.includes(v), `nhánh (hover: none) không tắt ${v} — một vật không bao giờ bật`
      + ' mà vẫn ở trong cây là một vật sẽ bật vì một lỗi khác');
  }
  // 48 dấu ngôi KHÔNG được tắt: một chiếc điện thoại cắm bàn phím vẫn phải đi
  // được bằng mũi tên.
  assert.ok(!/\.sao\b[^{]*\{[^}]*display:\s*none/.test(het),
    'nhánh (hover: none) tắt luôn 48 dấu ngôi — bàn phím trên máy chạm mất đường đi');
  // Và JS phải THẬT SỰ không gắn listener con trỏ ở đó: tắt bằng CSS mà vẫn
  // tính 48 khoảng cách mỗi khung hình là tốn pin cho một thứ không ai thấy.
  assert.match(CUR_CODE, /matchMedia\('\(hover: hover\)'\)/,
    'lớp con trỏ không hỏi máy có con trỏ hay không');
  // Đường dùng được trên máy chạm là CHỮ, không phải hover: thang bán kính
  // phải nằm trong câu chú giải, nơi không cần tay nào.
  assert.ok(/ca chấm/.test(STAR_COPY.scaleNote) && /{min}/.test(STAR_COPY.scaleNote));
});
