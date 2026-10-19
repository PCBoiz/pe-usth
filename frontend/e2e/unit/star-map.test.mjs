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
  stageLessons,
  zoomFor,
  zoomToFrame,
  profileColors,
  starAriaLabel,
  starMagnitude,
  starScaleLine,
  starScaleRange,
  zodiacAnchors,
  SKY_CURSOR,
  SKY_TESTS,
  SKY_TITLES,
  SKY_ZOOM,
  SKY_ZOOM_PLACED,
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
/**
 * TÁM TẤM NGHỈ và TÁM TẤM RÕ, theo khoá chòm — không còn một tấm `chom-nghi`
 * vẽ đủ tám chòm.
 *
 * Mỗi tấm nay chỉ vẽ MỘT chòm (xem `build_chom` trong `build_sky.py`): chín
 * tấm cũ cân 446 005 byte vì cả 48 ngôi được vẽ chín lần; mười sáu tấm riêng
 * cân 109 147. `NGHI` gộp lại là thứ thay cho `sky-chom-nghi.svg` trong mọi
 * phép kiểm nói về "bức tranh lúc nghỉ".
 */
const NGHI = Object.fromEntries(SKY_CONSTELLATIONS.map((c) => [c.key, doc(`sky-chom-${c.key}.svg`)]));
const RO = Object.fromEntries(
  SKY_CONSTELLATIONS.map((c) => [c.key, doc(`sky-chom-${c.key}-ro.svg`)]),
);
/** Cả bức lúc NGHỈ, nối tám tấm lại — cho các phép kiểm đếm nét/đọc toạ độ
 *  trên toàn bộ 48 ngôi. Nối chuỗi là đủ: mỗi phép kiểm dưới đây soi theo
 *  `<g data-lop="…">`, `<circle>` hay `stroke-width`, không soi theo tệp. */
const CHOM = SKY_CONSTELLATIONS.map((c) => NGHI[c.key]).join('\n');
/** Mọi tệp của bộ — dùng cho các phép kiểm áp cho TẤT CẢ (màu lạ, gradient, id). */
const TAT_CA = [
  ['troi', TROI], ['sao-nen', SAONEN], ['mach', MACH],
  ...SKY_CONSTELLATIONS.flatMap((c) => [
    [`chom-${c.key}`, NGHI[c.key]], [`chom-${c.key}-ro`, RO[c.key]],
  ]),
];
const TEN_TEP = ['sky-troi.svg', 'sky-sao-nen.svg', 'sky-mach.svg',
  ...SKY_CONSTELLATIONS.flatMap((c) => [`sky-chom-${c.key}.svg`, `sky-chom-${c.key}-ro.svg`])];
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
/** Đường ra của cú phóng — thành phần client thứ hai của trang, và mọi ca cấm
 *  áp cho `page.tsx` cũng phải áp cho nó. */
const EXIT_CODE = boChuThich(read('src', 'app', 'ban-do-sao', 'SkyExit.tsx'));
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

/**
 * Nội dung của một lớp `<g data-lop="…">` — MỌI lần nó xuất hiện, nối lại.
 *
 * "Mọi lần" chứ không "lần đầu", và đó là bản sửa cho việc TÁCH TẤM: lớp chòm
 * nay nằm ở tám tệp (một tệp một chòm), nên `CHOM` dưới đây là tám tệp nối
 * nhau và một `indexOf` thô chỉ thấy chòm M1. Triệu chứng nếu bỏ sót: mọi phép
 * đếm nét và mọi phép soi toạ độ im lặng chỉ còn soi 1/8 bức, và chúng BÁO
 * XANH — đúng loại hỏng mà cả tệp test này tồn tại để chặn.
 */
const lop = (svg, ten) => {
  const mo = `<g data-lop="${ten}">`;
  const out = [];
  let i = svg.indexOf(mo);
  while (i >= 0) {
    const j = svg.indexOf('\n</g>', i);
    const het = j < 0 ? svg.length : j;
    out.push(svg.slice(i, het));
    i = svg.indexOf(mo, het);
  }
  return out.join('\n');
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
  // Mỗi TẤM CHÒM (nghỉ và rõ) cũng phải giữ đúng thứ tự z của tấm `chom` —
  // kiểm từng tệp một, không kiểm chuỗi nối: chuỗi nối sẽ cho ra năm lớp lặp
  // tám lần và một tệp thiếu lớp `nhan` vẫn lọt.
  for (const c of SKY_CONSTELLATIONS) {
    for (const [ten, svg] of [[c.key, NGHI[c.key]], [`${c.key}-ro`, RO[c.key]]]) {
      const thay = [...svg.matchAll(/<g data-lop="([^"]+)">/g)].map((m) => m[1]);
      assert.deepEqual(thay, [...SKY_TILES[3].layers],
        `sky-chom-${ten}.svg: thứ tự z trong tranh lệch với SKY_TILES`);
    }
  }

  // Thứ tự `<img>` trong TSX phải khớp thứ tự tấm — thứ tự DOM LÀ thứ tự z.
  // BA tấm trời, rồi TÁM tấm nghỉ, rồi TÁM tấm rõ. Tấm rõ phải đứng SAU tấm
  // nghỉ của chính nó, nếu không "rõ lên" bị tấm nghỉ vẽ phủ lại.
  const src = [...TSX_CODE.matchAll(/\/map\/star\/([a-z0-9-]+)(?:\$\{c\.key\})?(-ro)?\.svg/g)]
    .map((m) => m[1] + (m[2] ?? ''));
  assert.deepEqual(src, ['sky-troi', 'sky-sao-nen', 'sky-mach', 'sky-chom-', 'sky-chom--ro'],
    `thứ tự <img> trong trang là ${src.join(', ')} — nó LÀ thứ tự z`);
});

/* ═══ 7b · TÁCH TẤM: MỖI CHÒM MỘT TẤM, KHÔNG MỘT BẢN SAO NÀO ══════════ */

test('mỗi tấm chòm vẽ ĐÚNG MỘT chòm — không tấm nào cõng 48 ngôi của bảy chòm kia', () => {
  // Đây là ca canh cho bản tách tấm, và nó đo thứ duy nhất đáng đo: SỐ NGÔI
  // trong một tấm. Chín tấm cũ mỗi tấm vẽ đủ 48 ngôi (446 005 byte cả bộ);
  // nếu ai đó "gộp lại cho gọn" thì bytes quay lại mà không có gì đỏ lên — tệ
  // nhất là nó vẫn HIỆN ĐÚNG, vì CSS chỉ bật một tấm ở mỗi lúc.
  for (const c of SKY_CONSTELLATIONS) {
    for (const [ten, svg] of [[c.key, NGHI[c.key]], [`${c.key}-ro`, RO[c.key]]]) {
      const than = vongTron(lop(svg, 'sao-bai'));
      assert.equal(than.length, c.stars.length,
        `sky-chom-${ten}.svg vẽ ${than.length} ngôi, chòm ${c.key} có ${c.stars.length}`
        + ' — một tấm vẽ quá số ngôi của chòm nó là một bản sao thừa tải ở mỗi lượt');
      // …và đúng những ngôi ấy, không phải một số ngôi nào khác.
      // Khớp với sai số 1 px, không khớp tuyệt đối: `nf()` của Python dùng
      // `%.0f` (làm tròn về số CHẴN ở đúng .5) còn `Math.round` của JS làm
      // tròn LÊN, nên một ngôi ở y = 486,5 ra 486 bên này và 487 bên kia. Sai
      // số 1 px vẫn chặn được đúng thứ ca này chặn: khe nhỏ nhất giữa hai chòm
      // là 64,9 px (`SKY_LINK.minGap`), nên không ngôi của chòm khác lọt được.
      for (const v of than) {
        const gan = c.stars.some((s) => Math.abs(VI_TRI[s.code].x - v.x) <= 1
          && Math.abs(VI_TRI[s.code].y - v.y) <= 1);
        assert.ok(gan,
          `sky-chom-${ten}.svg có một ngôi ở (${v.x}, ${v.y}) không thuộc chòm ${c.key}`);
      }
    }
  }
});

test('MÃ BÀI không còn vẽ vào tranh — nó là chữ HTML, và hai bản từng in đè nhau', () => {
  // Bước 2 dựng mã bài bằng HTML (`.chip` trong `SkyCursor.tsx`), nhưng bản
  // SVG vẫn còn và hai bản rơi vào ĐÚNG MỘT điểm: chip neo `calc(50% + 9px)`
  // chéo trên-phải, đúng `SKY_LABEL.codeOffset = 9`. Tức mỗi mã bài được in
  // hai lần chồng lên nhau — mắt đọc ra "chữ hơi dày", không ai đỏ lên.
  //
  // Gỡ bản sửa ra (vẽ lại mã bài trong `ve_nhan`) là ca này trượt.
  const ma = new Set(SKY_CONSTELLATIONS.flatMap((c) => c.stars.map((s) => s.code)));
  for (const c of SKY_CONSTELLATIONS) {
    for (const [ten, svg] of [[c.key, NGHI[c.key]], [`${c.key}-ro`, RO[c.key]]]) {
      for (const m of svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)) {
        assert.ok(!ma.has(m[1].trim()),
          `sky-chom-${ten}.svg còn vẽ mã bài "${m[1]}" — nó đã là chữ HTML trong chip,`
          + ' và hai bản in đè lên nhau ở cùng một điểm');
      }
    }
  }
  // …và chip HTML thì PHẢI mang mã bài.
  assert.match(CUR_CODE, /className=\{styles\.ma\}>\{s\.code\}/);
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

  // MỖI TẤM MANG ĐÚNG MỘT NHÃN — của chính chòm nó, không của bảy chòm kia.
  // Trước khi tách tấm, mỗi tấm vẽ cả tám nhãn và một tấm hiện tám nhãn cùng
  // lúc là đúng; nay một nhãn lạ trong tấm nào là một bản sao thừa, và nó sẽ
  // CỘNG ĐỘ MỜ với bản thật ở tấm kia.
  for (const c of SKY_CONSTELLATIONS) {
    for (const [ten, svg] of [[c.key, NGHI[c.key]], [`${c.key}-ro`, RO[c.key]]]) {
      const chu = [...lop(svg, 'nhan')
        .matchAll(/<text x="-?[\d.]+" y="-?[\d.]+">([^<]*)<\/text>/g)].map((m) => m[1]);
      assert.ok(chu.includes(dongChang(c)),
        `tấm ${ten} thiếu dòng chặng "${dongChang(c)}"`);
      for (const k of SKY_CONSTELLATIONS) {
        if (k.key === c.key) continue;
        assert.ok(!chu.includes(dongChang(k)),
          `tấm ${ten} còn vẽ nhãn của ${k.key} — một bản sao thừa, và nó cộng độ mờ với`
          + ' bản thật ở tấm của chính chòm ấy');
      }
    }
  }

  // DÒNG KHOÁ chỉ ở tấm RÕ, không ở tấm NGHỈ: bản khắc lúc nghỉ còn đúng cái
  // Bayer in — một ký hiệu ngắn cho mỗi chòm.
  for (const c of SKY_CONSTELLATIONS) {
    assert.ok(RO[c.key].includes(dongKhoa(c)), `tấm ${c.key}-ro thiếu dòng khoá`);
    assert.ok(!NGHI[c.key].includes(dongKhoa(c)),
      `tấm nghỉ ${c.key} đã mang dòng khoá — nó chỉ được hiện lúc trỏ vào`);
  }

  // CHỮ của bảy nhãn kia mờ bằng `--sky-mo` của CSS, không bằng một độ mờ
  // riêng vẽ vào SVG. Đây là chỗ việc tách tấm đổi luật: một `opacity` trên
  // thẻ `<img>` mờ ĐỀU cả nét lẫn chữ, nên không còn chỗ cho hai tỉ số — và
  // chữ có sàn 4,5:1 mà nét không có. Nên `dimTextOpacity` đổi vai thành SÀN,
  // và `dimOpacity` phải đủ cao để tỉ số đạt sàn ấy (0,28 cho 0,509 và nhãn M4
  // đo được 4,36:1; 0,31 cho 0,5636).
  const mo = P.scale.dimOpacity / P.scale.lineOpacity[0];
  assert.ok(mo >= SKY_LABEL.dimTextOpacity,
    `hệ số mờ ${mo.toFixed(4)} dưới sàn chữ ${SKY_LABEL.dimTextOpacity} — nâng dimOpacity`);
  // Bộ sinh làm tròn bốn chữ số (xem `mo_css()`): `of()` chỉ giữ hai chữ số
  // nên nó biến 0,5636 thành 0,56, và lúc đó phép ĐO tương phản nói về một bức
  // tranh khác bức chạy thật.
  assert.match(THEME, new RegExp(`--sky-mo:\\s*${mo.toFixed(4)};`),
    `sky-theme.css không khai --sky-mo = ${mo.toFixed(4)}`);
  assert.match(CSS_CODE, /\.chomNen\s*\{[^}]*\}|opacity:\s*var\(--sky-mo\)/,
    'CSS không dùng var(--sky-mo) để mờ bảy chòm kia');
  // …và KHÔNG tấm nào còn vẽ chữ nhãn ở một độ mờ nào khác 1: trạng thái mờ
  // nay thuộc về CSS. Một `fill-opacity` trên nhóm chữ là dấu của bản cũ.
  for (const c of SKY_CONSTELLATIONS) {
    for (const [ten, svg] of [[c.key, NGHI[c.key]], [`${c.key}-ro`, RO[c.key]]]) {
      const re = new RegExp(`font-size="${SKY_LABEL.nameSize}"[^>]*fill-opacity=`);
      assert.ok(!re.test(lop(svg, 'nhan')),
        `tấm ${ten} còn vẽ chữ chặng ở một độ mờ < 1 — trạng thái mờ thuộc về CSS`);
    }
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
  // So TỪNG CẶP tấm (nghỉ ↔ rõ) của CÙNG một chòm, không so với cả bức: từ
  // lúc tách tấm, hai tấm của một chòm chỉ chứa ngôi của chòm ấy, nên một phép
  // so với 48 bán kính sẽ luôn trượt mà không nói gì về điều cần nói.
  for (const c of SKY_CONSTELLATIONS) {
    const rNghi = vongTron(lop(NGHI[c.key], 'sao-bai')).map((q) => q.r).sort();
    const wNghi = [...new Set(beRong(lop(NGHI[c.key], 'net-chom')))].sort();
    assert.deepEqual(vongTron(lop(RO[c.key], 'sao-bai')).map((q) => q.r).sort(), rNghi,
      `${c.key}: ngôi to lên khi trỏ vào — đổi kích thước là "chuyển động"`);
    assert.deepEqual([...new Set(beRong(lop(RO[c.key], 'net-chom')))].sort(), wNghi,
      `${c.key}: nét chòm dày lên khi trỏ vào`);
  }

  // Nhưng phản hồi thì phải CÓ: tấm NGHỈ của mọi chòm ở `lineOpacity[0]`, tấm
  // RÕ ở `lineOpacity[1]`. Trạng thái MỜ không có tấm riêng nữa — CSS hạ tấm
  // nghỉ xuống `--sky-mo`, nên `dimOpacity` KHÔNG được xuất hiện trong tranh.
  const op = (s) => [...s.matchAll(/stroke-opacity="([\d.]+)"/g)].map((m) => +m[1]);
  const [nghi, ro] = P.scale.lineOpacity;
  for (const c of SKY_CONSTELLATIONS) {
    assert.deepEqual([...new Set(op(lop(NGHI[c.key], 'net-chom')))], [nghi],
      `${c.key}: tấm nghỉ không vẽ nét ở ${nghi}`);
    assert.deepEqual([...new Set(op(lop(RO[c.key], 'net-chom')))], [ro],
      `${c.key}: tấm rõ không vẽ nét ở ${ro}`);
    assert.ok(!op(lop(NGHI[c.key], 'net-chom')).includes(P.scale.dimOpacity),
      `${c.key}: tấm nghỉ vẽ sẵn độ mờ ${P.scale.dimOpacity} — trạng thái mờ thuộc về CSS`);
  }
});

/* ═══ 13 · TẤT ĐỊNH VÀ TRẦN DUNG LƯỢNG ════════════════════════════════ */

const PYBIN = ['py', 'python3', 'python'].find((bin) => {
  const r = spawnSync(bin, ['--version'], { encoding: 'utf8' });
  return r.status === 0;
});

test('chạy script hai lần ra ĐÚNG một bộ hai mươi tệp', () => {
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
  // ── TRẦN RIÊNG CHO NHÓM CHÒM, và nó là ca canh cho việc TÁCH TẤM ──────
  //
  // Chín tấm cũ (một tấm nghỉ + tám tấm tiêu điểm, mỗi tấm vẽ ĐỦ 48 ngôi) cân
  // **446 005 byte**: tám phần chín là bản sao. Mười sáu tấm riêng cân
  // **109 147 byte** — tiết kiệm 336 858 byte mỗi lượt vào trang.
  //
  // Vì sao một trần byte chứ chỉ một ca đếm ngôi: ca "mỗi tấm chòm vẽ ĐÚNG MỘT
  // chòm" chặn được việc gộp lại, nhưng không chặn được việc THÊM vào từng tấm
  // (một lớp mới, một tấm trạng thái thứ ba) — và 16 tấm thì mỗi thứ thêm vào
  // nhân lên 16 lần. Trần 160 KB cho cả nhóm chừa ~47% khoảng trống trên số đo
  // thật, nên nó không đỏ vì một thay đổi nhỏ, chỉ đỏ vì một bản sao quay lại.
  const kbCua = (f) => statSync(join(FE, 'public', 'map', 'star', f)).size / 1024;
  const chomKb = SKY_CONSTELLATIONS
    .flatMap((c) => [`sky-chom-${c.key}.svg`, `sky-chom-${c.key}-ro.svg`])
    .reduce((n, f) => n + kbCua(f), 0);
  assert.ok(chomKb < 160,
    `mười sáu tấm chòm cân ${chomKb.toFixed(0)} KB — chín tấm cũ cân 436 KB vì mỗi tấm`
    + ' cõng lại cả 48 ngôi. Trần 160 KB giữ cho bản sao ấy không quay lại.');
  // …và không tấm chòm nào được nặng bằng một phần tư tấm trời: tấm chòm chỉ
  // vẽ nét, quầng, thân, lõi và một nhãn cho MỘT chòm. Tấm nào vượt mức đó là
  // tấm đang cõng thứ không thuộc về nó.
  for (const c of SKY_CONSTELLATIONS) {
    for (const f of [`sky-chom-${c.key}.svg`, `sky-chom-${c.key}-ro.svg`]) {
      assert.ok(kbCua(f) < kbCua('sky-troi.svg') / 4,
        `${f} nặng ${kbCua(f).toFixed(0)} KB — hơn một phần tư tấm trời, nó đang cõng`
        + ' thứ không thuộc về một chòm');
    }
  }
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
    // HAI khối mỗi chòm từ lúc tách tấm: bật tấm RÕ và tắt tấm NGHỈ của chính
    // nó. Cả hai phải mang `:focus-visible` — thiếu ở khối thứ hai thì người
    // đi bằng Tab nhận hai bản của một chòm CỘNG độ mờ với nhau.
    for (const lop2 of [`ro${c.key}`, `chom${c.key}`]) {
      const re = new RegExp(`\\.hit${c.key}:hover ~ \\.${lop2},\\s*\\.hit${c.key}:focus-visible ~ \\.${lop2}`);
      assert.match(CSS_CODE, re,
        `${c.key}/${lop2}: hover và focus-visible không chung một khối — người đi bằng Tab`
        + ' thấy một bản đồ khác');
    }
    // …và khối TẮT tấm nghỉ phải đưa nó về 0, không về `--sky-mo`: chòm được
    // trỏ không phải một chòm bị gác lại.
    const re0 = new RegExp(`\\.lop\\[data-chang='${c.key}'\\] ~ \\.chom${c.key} \\{ opacity: 0; \\}`);
    assert.match(CSS_CODE, re0, `${c.key}: tấm nghỉ không tắt hẳn khi chòm được trỏ`);
  }
  assert.match(CSS_CODE, /\.hit:hover ~ \.chomNen,\s*\.hit:focus-visible ~ \.chomNen/);
  assert.match(CSS_CODE, /\.hit:focus-visible\s*\{[^}]*outline:/, 'thiếu vòng tiêu điểm');
  // TÁM Ô BẤM phải đứng TRƯỚC mọi `<img>`: bộ chọn anh em `~` chỉ nhìn về
  // phía SAU, nên thứ tự DOM là một hợp đồng chứ không phải một cách sắp cho
  // gọn. Soi theo `styles.hit`, không theo `<a`/`<Link`: từ bước 3 trong khung
  // còn nút Thoát và dưới khung còn bảng bài, và CẢ HAI phải đứng sau tranh
  // (nút Thoát nằm trên tranh bằng `z-index`, không bằng thứ tự).
  const cuoiHit = TSX_CODE.lastIndexOf('styles.hit');
  assert.ok(cuoiHit > 0 && cuoiHit < TSX_CODE.indexOf('<img'),
    'có một ô bấm đứng sau <img> — `.hitM1:hover ~ .chomM1` sẽ không khớp');
  // Và lớp con trỏ phải đứng GIỮA: sau tám ô bấm, trước mười chín tấm.
  const iLop = TSX_CODE.indexOf('<SkyCursor');
  assert.ok(cuoiHit < iLop && iLop < TSX_CODE.indexOf('<img'),
    '<SkyCursor /> không còn nằm giữa ô bấm và tranh — nó là chỗ DUY NHẤT thoả cả hai'
    + ' chiều của bộ chọn `~`');
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
  assert.ok(!/apiFetch|fetch\(/.test(EXIT_CODE),
    'đường ra của cú phóng gọi API — nó cũng chạy ở client trên trang công khai');
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
  // đặc trưng hơn `.chomNen`, nên nó sẽ đè luôn `transition: none` của nhánh
  // `reduce` — người bật giảm chuyển động vẫn nhận đủ 320 ms, trong khi ca test
  // đọc nhánh reduce và báo xanh. Đúng kiểu hỏng im lặng.
  const hv = CSS_CODE.match(/\.hit:hover ~ \.chomNen,[\s\S]*?\{([^}]*)\}/);
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

/* ═══ 20 · TỈ LỆ THỨ HAI — CÚ PHÓNG ═══════════════════════════════════

   Bước 3 của `design/v3/tuong-tac-ban-do.md`. Nghiên cứu khảo bảy bản đồ game
   và đo được ba thứ mà bản đồ này thiếu cả ba: **một động từ có hậu quả · hai
   tỉ lệ trở lên · cái gì bị giữ lại**. Bước này cấp hai thứ sau.

   NĂM CÁCH CÚ PHÓNG HỎNG IM LẶNG, và đó là lý do khối này tồn tại:

    1. Ba con số của phép biến hình sống ở HAI chỗ — `.phongM<k>` trong CSS
       (lái bức tranh) và `SKY_ZOOM_PLACED` trong TS (lái phép ĐẢO của lớp con
       trỏ). Hai chỗ lệch nhau thì tranh phóng đúng mà vòng dò nhận ngôi BÊN
       CẠNH ngôi con trỏ đang chỉ vào, và triệu chứng đọc ra thành "chuột hơi
       lệch" — thứ không ai đi tìm trong một phép biến hình.
    2. Tâm không được KẸP: phóng vào M8 (hai ngôi ở thiên đỉnh, sát mép trên)
       để lộ một dải trống ngoài bức tranh. Bản đồ có mép là bản đồ nói rằng
       thế giới hết ở đó.
    3. `prefers-reduced-motion` tắt luôn TÍNH NĂNG thay vì tắt hoạt ảnh: nếu
       khối `reduce` đụng vào `transform` thì người bật giảm chuyển động không
       phóng được, và cả bước này biến mất với họ.
    4. `@media (hover: none)` cho ra một bản đồ chết: cú phóng là đường CHÍNH
       của điện thoại, nên một quy tắc tắt chip hay tắt bảng bài trong khối ấy
       là tắt toàn bộ thứ vừa mua được.
    5. Tỉ lệ gần không giữ lại gì: nếu `SKY_TITLES` cũ hoặc chip không in tên
       bài thì cú phóng là phóng to một bức ảnh, và không có gì đỏ lên. */

test('`SKY_TITLES` khớp TÊN BÀI THẬT đọc lại từ giáo trình — 48 chuỗi, không một chuỗi cũ', () => {
  // ĐỌC LẠI từ `scripts/pe-v4/out-advanced/lessons/*.json`, đúng khuôn
  // `SKY_TESTS`: khối trong TS là bản ĐÓNG BĂNG (trang công khai nên không gọi
  // API nào được), và ca này là thứ duy nhất giữ cho nó không cũ.
  const that = Object.fromEntries(
    readdirSync(LESSON_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(LESSON_DIR, f), 'utf8')))
      .map((d) => [d.lesson_code, d.title])
      .filter(([code, t]) => code && typeof t === 'string'),
  );
  const ma = SKY_CONSTELLATIONS.flatMap((c) => c.stars.map((s) => s.code));
  assert.equal(Object.keys(SKY_TITLES).length, ma.length,
    `SKY_TITLES có ${Object.keys(SKY_TITLES).length} khoá, bản đồ có ${ma.length} ngôi`);
  for (const code of ma) {
    const goc = that[code];
    assert.ok(goc, `giáo trình không có bài ${code}`);
    // Tiền tố mã bài phải ĐÃ CẮT: chip và bảng bài đều có ô riêng cho mã, nên
    // để nguyên tiền tố là in `P01` hai lần cạnh nhau.
    const cho = goc.startsWith(`${code} · `) ? goc.slice(code.length + 3) : goc;
    assert.equal(SKY_TITLES[code], cho,
      `SKY_TITLES.${code} = "${SKY_TITLES[code]}" nhưng giáo trình nói "${cho}" — chạy`
      + ' `py scripts/star/build_sky.py --ten-bai` rồi chép lại khối');
    assert.ok(!SKY_TITLES[code].startsWith(code), `SKY_TITLES.${code} còn tiền tố mã bài`);
    assert.ok(SKY_TITLES[code].length > 5, `tên bài ${code} quá ngắn để là một cái tên`);
  }
  // …và nó phải THẬT SỰ đi vào chip, không chỉ nằm trong TS.
  assert.match(CUR_CODE, /className=\{styles\.tenBai\}>\{SKY_TITLES\[s\.code\]\}/,
    'chip không in tên bài — không có nó thì tỉ lệ gần chỉ là tỉ lệ xa phóng to');
  assert.match(CSS_CODE, /\.tenBai\s*\{[^}]*display:\s*none/,
    '`.tenBai` không ẩn ở tỉ lệ xa — 48 cái tên trên cả bầu trời là một bảng chữ');
});

test('cú phóng KẸP ĐÚNG: chòm vào GIỮA khung, không mép nào lộ ra ngoài bức tranh', () => {
  assert.deepEqual(SKY_ZOOM_PLACED.map((z) => z.key), [...SKY_CONSTELLATION_KEYS],
    'SKY_ZOOM_PLACED không phủ đúng tám chặng, đúng thứ tự');
  for (const z of SKY_ZOOM_PLACED) {
    assert.ok(z.scale >= SKY_ZOOM.minScale && z.scale <= SKY_ZOOM.maxScale,
      `${z.key}: hệ số ${z.scale} ngoài khoảng [${SKY_ZOOM.minScale}; ${SKY_ZOOM.maxScale}]`);
    // ĐIỂM DỪNG. Cửa sổ thấy được là `[c − 0,5/S ; c + 0,5/S]`; nó phải nằm
    // TRỌN trong [0; 1]. Không kẹp thì M8 (hai ngôi ở thiên đỉnh) để lộ một
    // dải trống ngoài bức tranh.
    const nua = 0.5 / z.scale;
    for (const [truc, c] of [['x', z.cx], ['y', z.cy]]) {
      assert.ok(c - nua >= -1e-6 && c + nua <= 1 + 1e-6,
        `${z.key}: cửa sổ trên trục ${truc} là [${(c - nua).toFixed(4)};`
        + ` ${(c + nua).toFixed(4)}] — nó ra ngoài bức tranh, tức bản đồ có MÉP`);
    }
    // …và chòm phải nằm TRỌN trong cửa sổ ấy. "Phóng vào chòm" chứ không
    // "phóng vào gần chòm": một ngôi bị cắt khỏi khung là một bài biến mất ở
    // đúng tỉ lệ được dựng ra để kể về nó.
    const c = byKey[z.key];
    for (const s of c.stars) {
      const p = VI_TRI[s.code];
      assert.ok(Math.abs(p.x / SKY_FRAME.width - z.cx) <= nua
        && Math.abs(p.y / SKY_FRAME.height - z.cy) <= nua,
      `${z.key}: ngôi ${s.code} nằm ngoài cửa sổ phóng`);
    }
  }
});

test('biên độ HÀNG TRĂM PIXEL, do tay người dùng gây ra — không phải một cú nhích', () => {
  // Nghiên cứu §3 phân biệt PHẢN HỒI (theo tay, kết thúc khi tay rời) với
  // CHUYỂN CẢNH (một quãng đường có đích). Cú phóng là loại thứ hai, và cái
  // làm nó đọc ra là chuyển cảnh chính là BIÊN ĐỘ: dưới ~1,4 lần thì mắt đọc
  // ra "hình nhích một chút", không ra "tôi vừa đi tới một chỗ khác".
  //
  // Đo ở bề rộng khung THẬT: `.wrap` max-width 1100 trừ 2 × 16 padding = 1068
  // px, khung cao 1068 × 820/1360 = 643,9 px. Quãng đường của TÂM CHÒM trên
  // màn = `S × |0,5 − c| × cỡ khung`.
  const W = 1100 - 2 * 16;
  const H = W * SKY_FRAME.height / SKY_FRAME.width;
  for (const z of SKY_ZOOM_PLACED) {
    const dx = z.scale * Math.abs(0.5 - z.cx) * W;
    const dy = z.scale * Math.abs(0.5 - z.cy) * H;
    const d = Math.hypot(dx, dy);
    assert.ok(d >= 200,
      `${z.key}: tâm chòm chỉ đi ${d.toFixed(0)} px — dưới mức đó cú phóng đọc ra là một cú`
      + ' nhích, và cái động từ mất hậu quả');
  }
  // Số đo ngày 19/10/2026: 301 px (M6, ngắn nhất) tới 1 118 px (M8). Mốc 200
  // px chừa một phần ba khoảng trống trên ca ngắn nhất.
});

test('ba con số của phép biến hình: CSS và TS nói CÙNG MỘT THỨ', () => {
  // Hai chỗ, một nguồn (`build_sky.py --css` và `--phong` in ra từ cùng một
  // hàm). Lệch nhau thì tranh phóng đúng mà vòng dò nhận SAI ngôi — và không
  // có gì đỏ lên, vì cả hai mình nó vẫn "trông đúng".
  for (const z of SKY_ZOOM_PLACED) {
    const m = CSS_CODE.match(new RegExp(`\\.phong${z.key}\\s*\\{([^}]*)\\}`));
    assert.ok(m, `CSS thiếu khối .phong${z.key}`);
    const v = Object.fromEntries([...m[1].matchAll(/--(z[sxy]):\s*([^;]+);/g)]
      .map((q) => [q[1], q[2].trim()]));
    assert.equal(Number(v.zs), z.scale, `.phong${z.key}: --zs lệch với SKY_ZOOM_PLACED`);
    for (const [ten, c] of [['zx', z.cx], ['zy', z.cy]]) {
      assert.match(v[ten], /%$/, `.phong${z.key}: --${ten} phải là %, vì translate() lấy %`
        + ' của chính phần tử — và cả tấm lẫn lớp con trỏ đều phủ đúng khung');
      assert.ok(Math.abs(parseFloat(v[ten]) - (0.5 - c) * 100) < 0.002,
        `.phong${z.key}: --${ten} = ${v[ten]} nhưng (0,5 − ${c}) × 100 =`
        + ` ${((0.5 - c) * 100).toFixed(3)}%`);
    }
  }
  // Và transform phải nằm trên TỪNG tấm cộng lớp con trỏ, không trên một div
  // bọc: trạng thái hover đi qua bộ chọn ANH EM, nên bọc tấm vào một div là
  // cắt mọi quan hệ `~` và phải dựng lại tám trạng thái hover bằng JS.
  for (const cls of ['sky', 'lop']) {
    assert.match(CSS_CODE, new RegExp(`\\.${cls}\\s*\\{[^}]*transform:\\s*scale\\(var\\(--zs\\)\\) translate\\(var\\(--zx\\), var\\(--zy\\)\\)`),
      `.${cls} không mang phép biến hình của cú phóng`);
  }
  // Tỉ lệ XA phải là phép ĐỒNG NHẤT khai tường minh: không khai `--zs: 1` thì
  // `var(--zs)` không giải được, cả `transform` thành không hợp lệ, và
  // `transition` không có gì để nội suy — cú phóng NHẢY.
  const fr = CSS_CODE.match(/\n\.frame\s*\{([^}]*)\}/);
  assert.ok(fr, 'thiếu quy tắc .frame');
  assert.match(fr[1], /--zs:\s*1;/, '.frame không khai --zs: 1 cho tỉ lệ xa');
  assert.match(fr[1], /--zx:\s*0%;/);
  assert.match(fr[1], /--zy:\s*0%;/);
});

test('`zoomToFrame()` ĐẢO đúng phép biến hình — không thì vòng dò nhận ngôi bên cạnh', () => {
  // Ở tỉ lệ gần, tỉ lệ con trỏ trong KHUNG không còn là toạ độ trong BỨC
  // TRANH. Lớp con trỏ phải đảo lại, và phép đảo ấy ở TS để ca này gọi được.
  for (const z of SKY_ZOOM_PLACED) {
    const giua = zoomToFrame(z.key, 0.5, 0.5);
    assert.ok(Math.abs(giua.x - z.cx * SKY_FRAME.width) < 1e-6
      && Math.abs(giua.y - z.cy * SKY_FRAME.height) < 1e-6,
    `${z.key}: giữa khung không ra tâm chòm`);
    const nua = 0.5 / z.scale;
    const tl = zoomToFrame(z.key, 0, 0);
    assert.ok(Math.abs(tl.x - (z.cx - nua) * SKY_FRAME.width) < 1e-6,
      `${z.key}: góc trên-trái khung không ra mép trái cửa sổ`);
    // VÒNG TRÒN: lấy một ngôi thật, tính xuôi ra tỉ lệ khung, đảo lại phải về
    // đúng ngôi ấy. Đây là phép so duy nhất chứng minh được hai chiều khớp
    // nhau — và sai chiều là đúng cái lỗi "nhận ngôi bên cạnh".
    for (const s of byKey[z.key].stars) {
      const p = VI_TRI[s.code];
      const u = (p.x / SKY_FRAME.width - (z.cx - nua)) / (2 * nua);
      const v = (p.y / SKY_FRAME.height - (z.cy - nua)) / (2 * nua);
      const q = zoomToFrame(z.key, u, v);
      assert.ok(Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6,
        `${z.key}/${s.code}: vòng tròn xuôi-ngược lệch`);
    }
  }
  // Không phóng ⇒ phép đồng nhất.
  const t = zoomToFrame(null, 0.25, 0.75);
  assert.equal(t.x, 0.25 * SKY_FRAME.width);
  assert.equal(t.y, 0.75 * SKY_FRAME.height);
  // Tham số rác KHÔNG được ném: `?chang=` đến từ người lạ.
  for (const rac of ['', 'M9', 'm1', '<script>', 'M1 ']) {
    assert.equal(zoomFor(rac), null, `zoomFor("${rac}") phải là null`);
  }
  assert.equal(zoomFor('M1')?.key, 'M1');
  // …và lớp con trỏ phải THẬT SỰ gọi nó, với trạng thái đọc từ chính khung.
  assert.match(CUR_CODE, /zoomToFrame\(khung\.dataset\.phong, u, v\)/,
    'lớp con trỏ không đảo phép biến hình — ở tỉ lệ gần nó sẽ nhận một ngôi cách đó'
    + ' mấy trăm pixel');
});

test('TRẠNG THÁI NẰM TRONG URL: nút Lùi đúng việc, đường dẫn gửi được, không-JS vẫn phóng', () => {
  // Đây là chỗ hầu hết bản đồ web làm hỏng: phóng vào bằng một `useState` rồi
  // bấm Lùi thì văng khỏi cả trang. Ba thứ dưới đây là ba hệ quả của việc đọc
  // trạng thái ở SERVER từ `searchParams`.
  assert.match(TSX_CODE, /searchParams:\s*Promise</,
    'trang không nhận `searchParams` — trạng thái sẽ phải sống trong một `useState`,'
    + ' và lúc đó nút Lùi văng khỏi trang');
  assert.match(TSX_CODE, /await searchParams/);
  assert.match(TSX_CODE, /sp\.chang/, 'trang không đọc tham số `chang`');
  // Khoá PHẢI đi qua `zoomFor()` trước khi ghép vào className: `?chang=` là
  // dữ liệu của người lạ, và `styles[\`phong${…}\`]` ghép chuỗi.
  assert.match(TSX_CODE, /const chang = zoomFor\([\s\S]{0,80}?\)\?\.key \?\? null;/,
    'khoá chặng không đi qua `zoomFor()` — một `?chang=` rác sẽ ghép thẳng vào className');
  assert.match(TSX_CODE, /styles\[`phong\$\{chang\}`\]/,
    'lớp phóng không dựng từ `chang` đã qua `zoomFor()`');
  // Ô bấm là `href` THẬT, không `onClick`.
  assert.match(TSX_CODE, /\/ban-do-sao\?chang=\$\{key\}/,
    'ô bấm không dẫn tới `?chang=` — mất cả ba thứ: nút Lùi, đường dẫn gửi được, không-JS');
  assert.ok(!/onClick/.test(TSX_CODE), 'trang dùng onClick cho cú phóng — nó không gửi được');
});

test('BA ĐƯỜNG RA, và đường ra chắc hơn đường vào', () => {
  // Esc.
  assert.match(EXIT_CODE, /window\.addEventListener\('keydown'/,
    'Esc nghe trên một phần tử con — nó phải chạy dù tiêu điểm đang ở đâu, kể cả ở một'
    + ' dòng của bảng bài DƯỚI khung');
  assert.match(EXIT_CODE, /e\.key !== 'Escape'/);
  // `defaultPrevented`: `SkyCursor` cũng nhận Esc, cho một việc KHÁC (từ một
  // ngôi lùi về ô bấm cả chặng). Không kiểm cờ này thì một cú Esc làm CẢ HAI.
  assert.match(EXIT_CODE, /e\.defaultPrevented/,
    'Esc không kiểm `defaultPrevented` — một cú Esc sẽ làm cả hai việc, và người đi bằng'
    + ' bàn phím mất một bậc trong cái thang mà bước 1 vừa dựng');
  assert.match(CUR_CODE, /e\.key === 'Escape'[\s\S]{0,120}preventDefault\(\)/,
    'lớp con trỏ không còn `preventDefault()` cho Esc — cờ ở `SkyExit` sẽ vô nghĩa');
  // `push`, KHÔNG `back()`: một người mở đường dẫn ĐƯỢC GỬI chưa có lịch sử
  // nào trong tab, nên `back()` đưa họ ra khỏi trang — "thoát khỏi chặng"
  // thành "thoát khỏi bản đồ".
  assert.match(EXIT_CODE, /router\.push\(RA, \{ scroll: false \}\)/);
  assert.ok(!/router\.back\(\)/.test(EXIT_CODE),
    '`router.back()` sai ở đúng trường hợp cú phóng phục vụ: một đường dẫn được gửi');
  // Nút THẤY ĐƯỢC, và nó là một `<Link>` thật nên nó chạy khi JS chưa tải xong.
  assert.match(EXIT_CODE, /<Link className=\{styles\.thoat\}/);
  assert.ok(!/<button/.test(EXIT_CODE), 'nút Thoát là một <button> — nó cần JS mới chạy');
  assert.ok(STAR_COPY.zoomExit.length > 3 && STAR_COPY.zoomBackdrop.length > 10);
  // Nền trống, với một tên nghe được.
  assert.match(TSX_CODE, /aria-label=\{STAR_COPY\.zoomBackdrop\} className=\{styles\.nenRa\}/);
  // …và nó phải nằm DƯỚI lớp con trỏ: bấm một ngôi thì mở bài, chỉ khoảng trời
  // còn lại mới lùi ra. Thứ tự z LÀ hợp đồng ấy.
  const z = (cls) => Number(CSS_CODE.match(new RegExp(`\\.${cls}\\s*\\{[^}]*z-index:\\s*(\\d+)`))?.[1]);
  assert.ok(z('nenRa') < z('lop'),
    `nền trống (z ${z('nenRa')}) không nằm dưới lớp con trỏ (z ${z('lop')}) — 48 ngôi sẽ`
    + ' thành vật trang trí');
  assert.ok(z('sky') < z('nenRa'), 'nền trống nằm dưới tranh — nó sẽ không ăn được cú bấm nào');
  assert.ok(z('thoat') > z('lop'), 'nút Thoát nằm dưới lớp con trỏ');
  // Cả ba đường tới CÙNG một đích.
  assert.equal((EXIT_CODE.match(/'\/ban-do-sao'/g) ?? []).length, 1,
    'đích của đường ra viết ở nhiều chỗ trong SkyExit — một chuỗi, một chỗ');
});

test('GIẢM CHUYỂN ĐỘNG tắt HOẠT ẢNH, không tắt TÍNH NĂNG — và tới đúng trạng thái đó', () => {
  // Phép thử của nghiên cứu §5.3, áp cho chính bước này. Cú phóng ĐỔI kích
  // thước và vị trí, tức nó LÀ chuyển động theo định nghĩa hẹp của WCAG. Nên
  // dưới `reduce` nó phải tới NGAY — không phải bị tắt.
  const kh = [...CSS_CODE.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)]
    .map((m) => m[1]).join('\n');
  assert.ok(kh.length > 0, 'CSS không còn nhánh `prefers-reduced-motion: reduce`');
  for (const cls of ['.sky', '.lop']) {
    assert.ok(new RegExp(`\\${cls}[,\\s]`).test(kh) || kh.includes(`${cls} {`),
      `nhánh reduce không tắt chuyển tiếp của ${cls} — cú phóng vẫn chạy 450 ms`);
  }
  // …nhưng KHÔNG được đụng vào `transform`, `--zs` hay bất cứ khối `.phong*`:
  // đụng vào là người bật giảm chuyển động không phóng được, và cả bước này
  // biến mất với họ.
  assert.ok(!/transform|--zs|phong/.test(kh),
    'nhánh reduce đụng vào phép biến hình — giảm chuyển động không có nghĩa là bỏ tính năng');
  // Và mọi thứ nhánh ấy làm là `transition: none`, không gì khác.
  for (const m of kh.matchAll(/\{([^}]*)\}/g)) {
    assert.match(m[1].trim(), /^transition:\s*none;?$/,
      `nhánh reduce làm thêm việc khác: "${m[1].trim()}"`);
  }
});

test('ĐIỆN THOẠI KHÔNG NHẬN MỘT BẢN ĐỒ CHẾT: chạm để phóng là đường CHÍNH', () => {
  // `@media (hover: none)` chỉ được tắt những thứ THẬT SỰ dựa vào hover. Cú
  // phóng cần một cú BẤM, không cần hover; tên bài, thứ tự học và số ca ở tỉ lệ
  // gần hiện ra bằng CHỮ cho mọi thiết bị như nhau; bảng bài dưới khung cũng
  // không cần hover.
  const kh = [...CSS_CODE.matchAll(/@media \(hover: none\)\s*\{([\s\S]*?)\n\}/g)]
    .map((m) => m[1]).join('\n');
  assert.ok(kh.length > 0, 'CSS không còn nhánh `(hover: none)`');
  for (const tu of ['phong', 'nenRa', 'thoat', 'chip', 'tenBai', 'thuTu', 'soCa', 'hang', 'bang']) {
    assert.ok(!new RegExp(`\\.${tu}\\b`).test(kh),
      `nhánh (hover: none) đụng vào \`.${tu}\` — nó cho ra một bản đồ chết trên điện thoại,`
      + ' đúng thứ nghiên cứu §11.1 cấm');
  }
  // Câu dẫn phải DẠY cái động từ, và dạy bằng chữ "chạm": một thao tác không ai
  // biết để thử thì không tồn tại.
  for (const tu of ['chạm', 'PHÓNG VÀO', 'Esc', 'Thoát', 'Lùi']) {
    assert.ok(STAR_COPY.hint.includes(tu), `câu gợi ý không nhắc tới "${tu}"`);
  }
});

test('TỈ LỆ GẦN GIỮ LẠI BA THỨ, và cả ba đọc được KHÔNG CẦN HOVER', () => {
  // Thiếu khối này thì cú phóng là phóng to một bức ảnh — và không có gì đỏ.
  for (const c of SKY_CONSTELLATIONS) {
    for (const re of [
      new RegExp(`\\.frame\\[data-phong='${c.key}'\\] \\.cum${c.key} \\.chip`),
      new RegExp(`\\.frame\\[data-phong='${c.key}'\\] \\.cum${c.key} \\.sao`),
    ]) {
      assert.match(CSS_CODE, re, `${c.key}: thiếu quy tắc tỉ lệ gần`);
    }
  }
  assert.match(CSS_CODE, /\.frame\[data-phong\] \.tenBai\s*\{[^}]*display:\s*block/);
  assert.match(CSS_CODE, /\.frame\[data-phong\] \.soCa,\s*\n\.frame\[data-phong\] \.thuTu\s*\{[^}]*display:\s*inline/);
  // THỨ TỰ HỌC bằng một CON SỐ, không chỉ bằng bậc thang 45 ms: thời gian là
  // thứ người bật `reduce` không nhận được.
  assert.match(CUR_CODE, /className=\{styles\.thuTu\}>\{j \+ 1\}/,
    'chip không in thứ tự học — ở tỉ lệ xa thứ tự ấy không đọc được ở đâu cả, vì bản đồ'
    + ' cố ý không vẽ mũi tên lộ trình');
  // Bảng bài dưới khung: bốn ô mỗi dòng, và cả bốn lấy từ MỘT hàm.
  for (const o of ['hangSo', 'hangMa', 'hangTen', 'hangCa']) {
    assert.match(TSX_CODE, new RegExp(`styles\\.${o}`), `bảng bài thiếu ô \`${o}\``);
  }
  assert.match(TSX_CODE, /stageLessons\(chang\)/);
  // `stageLessons()` nối tên · thứ tự · số bài phẳng · số ca vào MỘT chỗ: hai
  // chỗ tự tra `SKY_TITLES` và tự cộng `lessonNumber` là hai chỗ sẽ lệch, và
  // kiểu lệch tệ nhất — một cái tên cạnh số bài của bài khác.
  let n = 1;
  for (const c of SKY_CONSTELLATIONS) {
    const ds = stageLessons(c.key);
    assert.equal(ds.length, c.stars.length, `${c.key}: stageLessons trả sai số bài`);
    ds.forEach((b, i) => {
      assert.equal(b.order, i + 1);
      assert.equal(b.lesson, n + i, `${c.key}/${b.code}: số bài phẳng lệch`);
      assert.equal(b.code, c.stars[i].code);
      assert.equal(b.title, SKY_TITLES[b.code]);
      assert.equal(b.tests, SO_CA[b.code], `${b.code}: số ca lệch với giáo trình`);
    });
    n += ds.length;
  }
  assert.equal(n - 1, 48, 'tám chặng không cộng lại thành 48 bài');
  assert.deepEqual(stageLessons('rác'), [], 'stageLessons không trả mảng rỗng cho khoá lạ');
});

test('VÙNG CHẠM Ở TỈ LỆ GẦN ≥ 44 px, và 48 ngôi nay KHÔNG chồng nhau nữa', () => {
  // Ở tỉ lệ xa 48 dấu ngôi KHÔNG phải vùng chạm, và con số nói ra lý do: hai
  // ngôi gần nhau nhất cách 48,4 đơn vị khung ⇒ ~38 px thấy được, nên ô 44 px
  // CHỒNG nhau. Ca này đo lại ở tỉ lệ gần, nơi cùng khe ấy giãn theo hệ số.
  const W = 1100 - 2 * 16;
  assert.match(CSS_CODE, /\.frame\[data-phong\] \.sao\s*\{[^}]*--do:\s*44px/,
    'ngôi ở tỉ lệ gần không lên 44 px');
  // `--do` là px THẤY ĐƯỢC chỉ vì `.sao` tự đảo hệ số phóng. Mất dòng ấy thì
  // 44 px thành 44/S ≈ 15 px — nhỏ hơn cả ô 22 px cũ.
  assert.match(CSS_CODE, /\.sao\s*\{[^}]*transform:\s*scale\(calc\(1 \/ var\(--zs\)\)\)/,
    '`.sao` không đảo hệ số phóng — mọi px trong nó, kể cả vùng chạm, sẽ bị nhân lên S lần');
  for (const z of SKY_ZOOM_PLACED) {
    const p = byKey[z.key].stars.map((s) => VI_TRI[s.code]);
    let khe = Infinity;
    for (let i = 0; i < p.length; i += 1) {
      for (let j = i + 1; j < p.length; j += 1) {
        khe = Math.min(khe, Math.hypot(p[i].x - p[j].x, p[i].y - p[j].y));
      }
    }
    const px = khe / SKY_FRAME.width * W * z.scale;
    assert.ok(px >= 44,
      `${z.key}: hai ngôi gần nhau nhất cách ${px.toFixed(0)} px ở tỉ lệ gần — ô 44 px sẽ`
      + ' chồng nhau, đúng cái lỗi mà tỉ lệ xa phải để 48 ngôi không nhận chạm');
  }
  // Nút Thoát và mỗi dòng bảng bài cũng ≥ 44 px.
  for (const cls of ['thoat', 'hang']) {
    assert.match(CSS_CODE, new RegExp(`\\.${cls}\\s*\\{[^}]*min-height:\\s*44px`),
      `.${cls} không đạt 44 px`);
  }
});

test('CÚ PHÓNG LÀ LỚP HTML, KHÔNG phải hoạt ảnh trong tài liệu SVG', () => {
  // Bẫy đã đo và đã trả giá (`figure-motion.ts`): animation CSS bên trong một
  // SVG nhúng bằng `<img>` KHÔNG được đưa lên compositor — 2 007 ms luồng
  // chính (19% trace) cho HAI hình, và trang không tắt được nó. Bản đồ này có
  // MƯỜI CHÍN tấm phủ kín khung.
  for (const [nhan, svg] of TAT_CA) {
    for (const xau of ['<animate', '<style', '@keyframes', 'transition', 'transform=']) {
      assert.ok(!svg.includes(xau),
        `${nhan}: SVG chứa \`${xau}\` — mọi chuyển động phải ở lớp HTML chồng lên`);
    }
  }
  // Và chỉ `transform`/`opacity` ở phía CSS: hai thuộc tính duy nhất chạy trên
  // compositor. Một `width`/`top` được nội suy là một lượt tính lại bố cục mỗi
  // khung hình, trên mười chín tấm.
  for (const m of CSS_CODE.matchAll(/transition:\s*([^;]+);/g)) {
    for (const p of m[1].split(',')) {
      const tp = p.trim().split(/\s+/)[0];
      assert.ok(['opacity', 'transform', 'border-color', 'background', 'none'].includes(tp),
        `CSS nội suy \`${tp}\` — chỉ opacity/transform chạy trên compositor`);
    }
  }
});
