/**
 * TIỀN CẢNH BÀN QUAN TRẮC — ca kiểm cho `src/lib/room-art.ts`,
 * `scripts/room/build_room.py` và tệp SVG nó sinh ra.
 *
 * ── VÌ SAO BỨC TRANH NÀY CẦN TEST CHỨ KHÔNG CHỈ CẦN XEM ────────────────
 *
 * Vì mọi cách nó hỏng đều hỏng IM LẶNG, và cả hai bộ sinh trước đã trả giá
 * cho từng cái một:
 *
 *  1. `stroke-width` đi qua hàm làm tròn TOẠ ĐỘ thì mọi nét mảnh thành `0`.
 *     Cả bức vẫn render, vẫn ra một tệp đúng kích thước, chỉ là mười bốn
 *     nghìn nét VÔ HÌNH — và nhìn ra đúng "mảng phẳng tô gradient", tức chính
 *     cái lỗi mà bức này sinh ra để chữa. Không ngoại lệ nào được ném.
 *  2. Một mã màu ghi cứng trong Python không làm gì đỏ lên cả; nó chỉ làm hai
 *     bản sáng/tối trôi xa nhau ở đúng chỗ con số ấy bị chép.
 *  3. Một `<linearGradient>` lọt vào là cái lỗi gốc quay lại, ở chỗ to nhất.
 *  4. Một `id` thừa là byte chết: tranh vào trang bằng `<img>` nên bị cách ly,
 *     không selector nào với vào trong được.
 *  5. Vòng ánh đèn GỘP NHÓM thì độ mờ tích luỹ thôi cộng dồn và cả vệt sáng
 *     mất phần lớn độ sáng — ở bản đồ sao, mô hình nói 47,3 % còn tranh thật
 *     đo ra 4,3 %, và không ca nào bắt được vì MỌI ca đều đọc mô hình.
 *  6. Bóng đổ lệch SAI HƯỚNG là thứ duy nhất trong bức nói ra "có một nguồn
 *     sáng ở trên-trái". Một vật đổ bóng ngược là `box-shadow` toả đều quay
 *     lại, tức đúng cái CSS làm mà bức này sinh ra để không làm.
 *  7. Một nét lọt lên TRÊN mép bàn là một vệt sơn trên bầu trời: chỗ ấy để
 *     tấm sao lọt qua, và cái mép CHÍNH LÀ vết cắt nóng-lạnh của bố cục.
 *
 * Mỗi phép so dưới đây đã được thử bằng cách GỠ bản sửa ra — số ca trượt ghi
 * trong mô tả commit.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as RA from '../../src/lib/room-art.ts';

const {
  deskDepth,
  deskHorizon,
  deskRowY,
  lampCumAlpha,
  lampRadiusOf,
  lampRings,
  shadowOffset,
  shadowFade,
  ROOM_BOOK,
  ROOM_BUDGET,
  ROOM_COPY,
  ROOM_DESK,
  ROOM_FRAME,
  ROOM_LAMP,
  ROOM_LAYERS,
  ROOM_LIT,
  ROOM_PLATE,
  ROOM_PROFILES,
  ROOM_PROFILE_DARK,
  ROOM_SHADOW,
  ROOM_TOOLS,
} = RA;

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOT = join(FE, '..');
const PY_PATH = join(ROOT, 'scripts', 'room', 'build_room.py');
const PY = readFileSync(PY_PATH, 'utf8');
const SVG = readFileSync(join(FE, 'public', 'map', 'room', 'room-ban.svg'), 'utf8');

/** Thân của một lớp theo `data-lop`. */
const lop = (ten) => {
  const m = SVG.match(new RegExp(`<g data-lop="${ten}">([\\s\\S]*?)\\n</g>`));
  return m ? m[1] : '';
};
const so = (s, re) => [...s.matchAll(re)].map((m) => Number(m[1]));

/* ═══ 1 · HAI HÀM LÀM TRÒN, VÀ KHÔNG NÉT NÀO BỀ RỘNG 0 ════════════════ */

test('bề rộng nét có hàm làm tròn RIÊNG, và không nét nào về 0', () => {
  // Hai hàm, và `wf` KHÔNG được gọi `nf`. Đây là cái bẫy đắt nhất của cả ba
  // bộ sinh trong kho mã: bản đồ vực đã render một lần với năm chục nghìn nét
  // `stroke-width="0"` và nhìn ra đúng "mảng phẳng tô gradient".
  assert.match(PY, /^def nf\(v: float\) -> str:/m, 'build_room.py thiếu nf()');
  assert.match(PY, /^def wf\(v: float\) -> str:/m, 'build_room.py thiếu wf()');
  const i0 = PY.indexOf('def wf(v: float) -> str:');
  // Bỏ CHUỖI TÀI LIỆU trước khi soi: chú thích của `wf` nói về `nf()` (nó kể
  // lại chính cái bẫy), nên soi cả docstring là một ca đỏ vì một câu văn.
  const than = PY.slice(i0, PY.indexOf('\ndef ', i0 + 10)).replace(/"""[\s\S]*?"""/g, '');
  assert.ok(!/\bnf\(/.test(than), 'wf() gọi nf() — bề rộng sẽ bị làm tròn về số nguyên');
  assert.match(than, /max\(0\.05,/, 'wf() không có SÀN, nét mảnh vẫn về 0 được');

  const ws = so(SVG, /stroke-width="([\d.]+)"/g);
  assert.ok(ws.length > 100, `chỉ thấy ${ws.length} thuộc tính stroke-width — tranh rỗng?`);
  const zero = ws.filter((w) => !(w > 0));
  assert.equal(zero.length, 0,
    `${zero.length}/${ws.length} nét có stroke-width = 0 — cả bức VÔ HÌNH mà tệp vẫn`
    + ' đúng kích thước. Bề rộng đang đi qua hàm làm tròn toạ độ.');
  // …và nét mảnh nhất phải THẬT mảnh: nếu mọi bề rộng đều ≥ 1 thì hoặc `wf`
  // đang làm tròn lên, hoặc chất liệu đã bị thay bằng nét kẻ.
  assert.ok(Math.min(...ws) < 0.75,
    `nét mảnh nhất ${Math.min(...ws)} — thớ gỗ và sợi giấy phải dưới 0,75 đơn vị`);
});

/* ═══ 2 · KHÔNG MÃ MÀU NÀO TRONG PYTHON ═══════════════════════════════ */

test('bộ sinh KHÔNG mang một mã màu nào — màu sống ở TS', () => {
  // Soi mã màu ĐÃ ĐÓNG NHÁY — một màu ghi cứng trong mã Python luôn là một
  // chuỗi. Chú thích ĐƯỢC nhắc tới mã màu (dẫn lại một phép đo), nên không
  // soi trần cả tệp; nhưng cũng KHÔNG bỏ chú thích bằng `#[^\n]*` như bản
  // đầu — regex ấy ăn luôn từ dấu `#` của chính mã màu tới hết dòng, nên nó
  // xoá đúng thứ nó đi tìm. Đã thử bằng đột biến: nhét `"#120D09"` vào
  // `ve_mat_ban` thì ca test vẫn XANH. Một ca không bắt được lỗi là một ca
  // tệ hơn không có ca, vì nó còn nói rằng chỗ ấy đã được canh.
  const ma = PY
    .replace(/"""[\s\S]*?"""/g, '')
    .replace(/"#%02X%02X%02X"/g, '');
  const hit = [...ma.matchAll(/["']#[0-9A-Fa-f]{6}["']/g)].map((m) => m[0]);
  assert.deepEqual(hit, [],
    `build_room.py ghi cứng ${hit.length} mã màu (${hit.slice(0, 3)}) — hai bản sáng/tối`
    + ' sẽ trôi xa nhau ở đúng chỗ con số ấy bị chép');
  // Và nó phải ĐỌC hồ sơ từ TS, không nhận một bộ màu mặc định nào.
  assert.match(PY, /grab\("ROOM_PROFILE_%s" % args\.profile\.upper\(\)\)|ROOM_PROFILE_%s/,
    'build_room.py không đọc ROOM_PROFILE_<TÊN> từ room-art.ts');
  for (const k of ['ROOM_FRAME', 'ROOM_LAYERS', 'ROOM_DESK', 'ROOM_LAMP', 'ROOM_BOOK',
    'ROOM_PLATE', 'ROOM_TOOLS', 'ROOM_SHADOW', 'ROOM_BUDGET', 'ROOM_LIT', 'ROOM_COPY']) {
    assert.ok(PY.includes(`grab("${k}")`), `build_room.py không đọc ${k} từ TS`);
  }
});

test('mọi màu trong hồ sơ là mã hex hợp lệ, và SVG không dùng màu nào ngoài hồ sơ', () => {
  const thu = [];
  for (const v of Object.values(ROOM_PROFILE_DARK)) {
    for (const c of Array.isArray(v) ? v : [v]) {
      assert.match(c, /^#[0-9A-F]{6}$/i, `màu ${c} không phải mã hex 6 chữ số`);
      thu.push(c.toUpperCase());
    }
  }
  const dung = new Set(so(SVG, /(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)
    .map(String)
    .concat([...SVG.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase())));
  dung.delete('NaN');
  const co = new Set(thu);
  // Ngoại lệ DUY NHẤT: màu NỘI SUY giữa hai tông của hồ sơ (`ton_muot`,
  // `pool_ton`). Chúng tính RA TỪ hồ sơ, nên một màu lạ chỉ hợp lệ khi nó nằm
  // trên đoạn thẳng nối hai màu nào đó của hồ sơ.
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const tren_doan = (c) => {
    const p = rgb(c);
    for (const a of co) {
      for (const b of co) {
        if (a === b) continue;
        const [A, B] = [rgb(a), rgb(b)];
        const den = B[0] - A[0] || B[1] - A[1] || B[2] - A[2];
        if (!den) continue;
        const t = ((p[0] - A[0]) || (p[1] - A[1]) || (p[2] - A[2])) / den;
        if (t < -0.02 || t > 1.02) continue;
        if (p.every((v, i) => Math.abs(v - (A[i] + (B[i] - A[i]) * t)) <= 1.5)) return true;
      }
    }
    return false;
  };
  const la = [...dung].filter((c) => !co.has(c) && !tren_doan(c));
  assert.deepEqual(la, [],
    `SVG dùng ${la.length} màu không có trong ROOM_PROFILE_DARK và cũng không nằm giữa`
    + ` hai màu của nó: ${la.slice(0, 5)}`);
});

/* ═══ 3 · KHÔNG GRADIENT, KHÔNG id, KHÔNG filter ══════════════════════ */

test('0 gradient · 0 filter · 0 id · không data-* nào ngoài data-lop', () => {
  for (const xau of ['<linearGradient', '<radialGradient', 'Gradient', '<filter',
    'feTurbulence', 'feGaussian']) {
    assert.ok(!SVG.includes(xau),
      `SVG chứa \`${xau}\` — chuyển sắc phải dựng bằng đĩa/nét chồng. Một ngoại lệ là`
      + ' một cái lỗ để đúng cái lỗi "mảng phẳng tô gradient" quay lại.');
  }
  assert.ok(!/\sid="/.test(SVG),
    'SVG có thuộc tính id — tranh vào trang bằng <img> nên bị cách ly, mọi id là byte'
    + ' chết tải ở mỗi lượt vào trang chủ');
  const data = [...new Set([...SVG.matchAll(/\s(data-[\w-]+)=/g)].map((m) => m[1]))];
  assert.deepEqual(data, ['data-lop'], `SVG mang thuộc tính data-* thừa: ${data}`);
  // Và chính bộ sinh phải TỰ CHẶN, không chỉ tệp hiện tại tình cờ sạch.
  assert.match(PY, /raise SystemExit\([\s\S]{0,400}?luật 3 và 4/,
    'build_room.py không tự chặn gradient/id khi ghi tệp');
});

/* ═══ 4 · LỚP: đúng tập, đúng THỨ TỰ ══════════════════════════════════ */

test('lớp trong SVG đúng tập và đúng THỨ TỰ của ROOM_LAYERS', () => {
  const co = [...SVG.matchAll(/<g data-lop="([^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(co, [...ROOM_LAYERS],
    'thứ tự lớp trong tệp lệch với ROOM_LAYERS — thứ tự đăng ký LÀ thứ tự z, LÀ thứ tự'
    + ' vẽ, và chép nó ở chỗ thứ hai là hai chỗ sẽ lệch');
  // BA lớp bóng, không một: bóng phải nằm TRÊN vật nó đổ lên và DƯỚI vật đổ
  // ra nó. Gộp lại thì bóng com-pa rơi xuống dưới sổ tay, tức biến mất.
  const z = Object.fromEntries(ROOM_LAYERS.map((l, i) => [l, i]));
  assert.ok(z['bong-xa'] < z['the-dong'] && z['the-dong'] < z['bong-giua']
    && z['bong-giua'] < z['so-tay'] && z['so-tay'] < z['bong-gan']
    && z['bong-gan'] < z['com-pa'],
    'ba lớp bóng không xen đúng giữa các vật — "vật gần che vật xa" mất nghĩa');
  assert.equal(z['den'], ROOM_LAYERS.length - 2,
    'đèn phải nằm gần trên cùng: nó CHE mép bàn theo chủ ý');
});

/* ═══ 5 · MÉP BÀN LÀ VẾT CẮT — trên nó không có nét nào ═══════════════ */

test('không nét nào lọt lên TRÊN mép bàn, trừ cái đèn', () => {
  const tran = ROOM_DESK.edgeY - ROOM_DESK.edgeWobble - ROOM_DESK.rim.drop * 0.4 - 1;
  for (const ten of ROOM_LAYERS) {
    if (ten === 'den') continue;
    const than = lop(ten);
    if (!than) continue;
    let xau = Infinity;
    for (const m of than.matchAll(/\sd="([^"]*)"/g)) {
      let cur = 0;
      for (const t of m[1].matchAll(/([Mlhv])\s*(-?[\d.]+)(?:[ ,]+(-?[\d.]+))?/g)) {
        if (t[1] === 'M') cur = Number(t[3]);
        else if (t[1] === 'l') cur += Number(t[3]);
        else if (t[1] === 'v') cur += Number(t[2]);
        else continue;
        if (cur < xau) xau = cur;
      }
    }
    for (const m of than.matchAll(/<text x="-?[\d.]+" y="(-?[\d.]+)"/g)) {
      xau = Math.min(xau, Number(m[1]));
    }
    assert.ok(!(xau < tran),
      `lớp ${ten} có nét ở y = ${xau}, trên mép bàn (${tran.toFixed(1)}) — chỗ ấy để tấm`
      + ' trời lọt qua, một nét ở đó là một vệt sơn trên bầu trời');
  }
  // Và cái đèn PHẢI vượt lên trên: nó che mép, và chính chỗ che ấy là thứ cho
  // bức một lớp chiều sâu. Một cái đèn nằm gọn dưới mép là một hình dán.
  const ysDen = [];
  for (const m of lop('den').matchAll(/\sd="M(-?[\d.]+) (-?[\d.]+)/g)) ysDen.push(Number(m[2]));
  assert.ok(Math.min(...ysDen) < ROOM_DESK.edgeY - 40,
    'đèn không vượt lên trên mép bàn — mất lớp chiều sâu duy nhất của bố cục');
  assert.match(PY, /def kiem_mep_trong/, 'build_room.py không tự gác luật mép trống');
});

/* ═══ 6 · ÁNH SÁNG: hồ sơ, 152 đĩa RIÊNG, và không thấy dải ═══════════ */

test('hồ sơ ánh đèn đơn điệu giảm và phủ hết khung', () => {
  const p = ROOM_LAMP.profile;
  for (let i = 1; i < p.length; i += 1) {
    assert.ok(p[i][0] > p[i - 1][0], `bán kính mốc ${i} không tăng`);
    assert.ok(p[i][1] <= p[i - 1][1],
      `độ mờ tích luỹ TĂNG ở mốc ${i} — lamp_r_of_A là phép đảo, nó đòi đơn điệu`);
  }
  assert.equal(p[0][1], 1, 'hồ sơ không bão hoà ở lõi');
  assert.equal(p[p.length - 1][1], 0, 'hồ sơ không về 0 ở đuôi');
  // Đuôi phải với tới GÓC XA NHẤT tính theo BÁN KÍNH HIỆU DỤNG (khoảng cách
  // dọc chia cho `squash`, vì mặt bàn nhìn xiên) — không phải theo bề rộng
  // khung. Ngắn hơn thì vùng sáng có một MÉP TRÒN cắt ngang mặt bàn.
  const { x: px, y: py, squash } = ROOM_LAMP.pool;
  const goc = [[0, ROOM_DESK.edgeY], [ROOM_FRAME.width, ROOM_DESK.edgeY],
    [0, ROOM_FRAME.height], [ROOM_FRAME.width, ROOM_FRAME.height]];
  const xaNhat = Math.max(...goc.map(([x, y]) => Math.hypot(x - px, (y - py) / squash)));
  assert.ok(p[p.length - 1][0] >= xaNhat,
    `đuôi hồ sơ dừng ở ${p[p.length - 1][0]} trong khi góc xa nhất ở bán kính hiệu dụng`
    + ` ${xaNhat.toFixed(0)} — vùng sáng sẽ có một MÉP TRÒN cắt ngang mặt bàn`);
  // Phép đảo phải khớp phép thuận ở mọi mốc.
  for (const [r, a] of p) {
    if (a > 0 && a < 1) {
      assert.ok(Math.abs(lampCumAlpha(lampRadiusOf(a)) - a) < 1e-9,
        `lampRadiusOf không đảo được lampCumAlpha tại r=${r}`);
    }
  }
  // `a` ở hay trên thềm bão hoà phải trả về MÉP NGOÀI thềm, không tâm: trả về
  // tâm là một đa giác suy biến, và cái lõi KHÔNG ĐƯỢC TÔ. Bản đồ sao đã mất
  // đúng cái lõi ấy một lần, và chỉ raster hoá mới bắt được.
  assert.equal(lampRadiusOf(1), p[1][0],
    'lampRadiusOf(1) không trả về mép ngoài thềm bão hoà — vòng trong cùng suy biến');
});

test('đúng `levels` ĐĨA, mỗi đĩa một <path> RIÊNG, bán kính giảm dần', () => {
  const than = lop('vung-sang');
  const dia = [...than.matchAll(/<path fill="#[0-9A-F]{6}"[^>]*d="M[^"]*Z"\/>/gi)];
  assert.ok(dia.length >= ROOM_LAMP.levels,
    `lớp vùng sáng chỉ có ${dia.length} mảng tô, cần ít nhất ${ROOM_LAMP.levels} —`
    + ' hình LỒNG NHAU bị gộp nhóm thì độ mờ tích luỹ thôi cộng dồn và cả vệt sáng mất'
    + ' phần lớn độ sáng, im lặng (bản đồ sao: mô hình 47,3 % ‖ tranh thật 4,3 %)');
  const r = lampRings();
  assert.equal(r.length, ROOM_LAMP.levels);
  for (let i = 1; i < r.length; i += 1) {
    assert.ok(r[i] < r[i - 1], `bán kính đĩa ${i} không nhỏ hơn đĩa ${i - 1}`);
  }
  // CHIA ĐỀU THEO ĐỘ MỜ, không theo bán kính — đó là chỗ con số "không thấy
  // dải" đến từ. Kiểm bằng cách đọc lại độ mờ tích luỹ ở từng bán kính.
  for (let i = 0; i < r.length; i += 1) {
    assert.ok(Math.abs(lampCumAlpha(r[i]) - (i + 1) / r.length) < 2e-9,
      `đĩa ${i} không nằm ở mức độ mờ tích luỹ ${(i + 1) / r.length}`);
  }
  // Và khoảng cách bán kính KHÔNG đều — nếu đều thì ai đó đã đổi sang chia
  // theo bán kính, và dải sẽ thấy lại ở đúng chỗ dốc nhất.
  const khe = r.slice(1).map((v, i) => r[i] - v);
  assert.ok(Math.max(...khe) / Math.min(...khe) > 3,
    'khoảng cách giữa các đĩa gần như đều nhau — đang chia theo BÁN KÍNH, không theo'
    + ' độ mờ');
});

/* ═══ 7 · BÓNG ĐỔ MỘT NGUỒN ═══════════════════════════════════════════ */

test('mọi vật đổ bóng xuống-phải, dài ngắn theo khoảng cách tới đèn', () => {
  const vat = [
    ['thẻ đồng', ROOM_PLATE.quad, ROOM_SHADOW.height.plate],
    ['sổ tay', [[ROOM_BOOK.left.farX, ROOM_BOOK.left.farY],
      [ROOM_BOOK.right.farX, ROOM_BOOK.right.farY],
      [ROOM_BOOK.right.nearX, ROOM_BOOK.right.nearY],
      [ROOM_BOOK.left.nearX, ROOM_BOOK.left.nearY]], ROOM_SHADOW.height.book],
    ['thước', [[ROOM_TOOLS.ruler.from.x, ROOM_TOOLS.ruler.from.y],
      [ROOM_TOOLS.ruler.to.x, ROOM_TOOLS.ruler.to.y]], ROOM_SHADOW.height.ruler],
    ['com-pa', [[ROOM_TOOLS.divider.hinge.x, ROOM_TOOLS.divider.hinge.y],
      ...ROOM_TOOLS.divider.legs.map((l) => [l.x, l.y])], ROOM_SHADOW.height.divider],
  ];
  for (const [ten, pts, h] of vat) {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const [ox, oy] = shadowOffset(cx, cy, h);
    assert.ok(ox > 0, `${ten}: bóng lệch sang TRÁI (${ox.toFixed(1)}) — đèn ở trên-trái`);
    assert.ok(oy > 0, `${ten}: bóng đổ LÊN TRÊN (${oy.toFixed(1)}) — không có nguồn sáng`
      + ' nào ở dưới mặt bàn');
    for (const [x, y] of pts) {
      assert.ok(shadowOffset(x, y, h)[1] > 0, `${ten}: điểm (${x}, ${y}) đổ bóng lên trên`);
    }
  }
  // DÀI NGẮN THEO KHOẢNG CÁCH: vật xa đèn phải có bóng dài hơn vật gần, ở
  // cùng độ cao. Đây là thứ `box-shadow` toả đều không bao giờ có.
  const gan = Math.hypot(...shadowOffset(400, 200, 10));
  const xa = Math.hypot(...shadowOffset(1200, 320, 10));
  assert.ok(xa > gan * 1.2,
    `bóng vật xa (${xa.toFixed(1)}) không dài hơn vật gần (${gan.toFixed(1)}) — độ dài`
    + ' bóng không phụ thuộc khoảng cách, tức nguồn sáng ở vô cực');
  // …nhưng bóng vật xa phải NHẠT hơn: xa đèn thì cả vật lẫn bóng đều chìm.
  assert.ok(shadowFade(1200, 320) < shadowFade(400, 200) * 0.75,
    'bóng không nhạt dần theo khoảng cách — một bóng đậm như nhau ở mọi chỗ phá đúng'
    + ' cái nó dựng');
  assert.match(PY, /def kiem_bong_mot_nguon/, 'build_room.py không tự gác hướng bóng');
});

/* ═══ 8 · PHỐI CẢNH MẶT BÀN ═══════════════════════════════════════════ */

test('độ sâu mặt bàn là phép phối cảnh, không tuyến tính theo y', () => {
  assert.ok(deskHorizon() < ROOM_DESK.edgeY, 'chân trời ảo không nằm trên mép xa');
  assert.ok(Math.abs(deskDepth(ROOM_DESK.edgeY)) < 1e-9, 'mép xa không ở độ sâu 0');
  assert.ok(Math.abs(deskDepth(ROOM_FRAME.height) - 1) < 1e-9, 'mép khung không ở độ sâu 1');
  for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    assert.ok(Math.abs(deskDepth(deskRowY(t)) - t) < 1e-9,
      `deskRowY không đảo được deskDepth tại ${t}`);
  }
  // NÉN VỀ PHÍA XA: nửa độ sâu đầu phải chiếm ÍT chiều cao màn hình hơn nửa
  // sau. Chia đều theo `y` thì mặt bàn đọc ra một hình chữ nhật dán lên.
  const giua = deskRowY(0.5);
  assert.ok(giua - ROOM_DESK.edgeY < (ROOM_FRAME.height - giua) * 0.55,
    `hàng giữa ở y=${giua.toFixed(0)}: mặt bàn không nén về phía xa`);
});

/* ═══ 9 · CHẤT LIỆU: bức này phải LÀ nét, không phải mảng tô ══════════ */

test('tranh là NÉT và CHẤM, không phải vài mảng tô', () => {
  const net = [...SVG.matchAll(/<path fill="none"/g)].length;
  const mang = [...SVG.matchAll(/<path fill="#/g)].length;
  assert.ok(net > 180,
    `chỉ ${net} nhóm nét — một tiền cảnh dựng bằng mảng tô là CSS gradient viết bằng SVG`);
  const d = SVG.match(/d="[^"]*"/g).join('').length;
  assert.ok(d > 200000,
    `tổng dữ liệu đường chỉ ${d} ký tự — chất liệu (thớ gỗ, sợi giấy, vân xước) đã biến mất`);
  assert.ok(mang > 150, `chỉ ${mang} mảng tô — các đĩa ánh đèn đâu?`);
  // Lớp thớ gỗ phải là lớp NẶNG NHẤT: nó là thứ đầu tiên trong bốn thứ bức
  // này tồn tại để có, nên nếu một lớp khác vượt nó thì ưu tiên đã trôi.
  const nang = ROOM_LAYERS.map((l) => [l, lop(l).length]).sort((a, b) => b[1] - a[1]);
  assert.equal(nang[0][0], 'tho-go',
    `lớp nặng nhất là ${nang[0][0]}, không phải thớ gỗ`);
});

/* ═══ 10 · CHỮ KHẮC là chú giải THẬT ══════════════════════════════════ */

test('chữ trên thẻ đồng khắc đúng câu trong ROOM_COPY, hai lượt (khắc)', () => {
  const than = lop('chu');
  for (const s of [ROOM_COPY.title, ...ROOM_COPY.rows]) {
    const n = [...than.matchAll(new RegExp(`>${s}<`, 'g'))].length;
    assert.equal(n, 2,
      `"${s}" xuất hiện ${n} lần, cần ĐÚNG 2: một bản tối lệch về phía đèn (thành rãnh`
      + ' khắc trong bóng) và một bản sáng phủ lên. Một lần là chữ phẳng, không phải khắc.');
  }
  // Bản tối lệch LÊN-TRÁI (về phía đèn). Lệch xuống-phải là đổ bóng NGOÀI,
  // tức chữ NỔI LÊN khỏi mặt tấm — ngược hẳn với "khắc", và đọc ra sai ngay
  // vì mọi bóng khác trong bức đi xuống-phải.
  assert.ok(ROOM_PLATE.text.reliefDx < 0 && ROOM_PLATE.text.reliefDy < 0,
    'bản chữ tối lệch xuống-phải — đó là chữ NỔI, không phải chữ KHẮC');
  assert.ok(ROOM_COPY.rows.length >= 3 && ROOM_COPY.rows.every((r) => r.length > 8),
    'chú giải quá ngắn để nói được điều gì');
  // Và nó phải nói về BỨC TRÊN, không phải chữ trang trí.
  const cg = [ROOM_COPY.title, ...ROOM_COPY.rows].join(' ').toUpperCase();
  for (const tu of ['NGÔI', 'BÀI']) {
    assert.ok(cg.includes(tu), `chú giải không nhắc tới "${tu}" — nó đang là chữ giả`);
  }
});

/* ═══ 11 · HỒ SƠ: tông nóng, và hai hồ sơ cùng một BỘ KHOÁ ════════════ */

test('mọi tông là tông NÓNG — đèn 2700 K là nguồn duy nhất', () => {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lanh = [];
  for (const [k, v] of Object.entries(ROOM_PROFILE_DARK)) {
    if (k === 'checkSky') continue;        // màu TRỜI, nó phải lạnh
    for (const c of Array.isArray(v) ? v : [v]) {
      const [r, , b] = rgb(c);
      if (b > r) lanh.push(`${k}=${c}`);
    }
  }
  assert.deepEqual(lanh, [],
    `${lanh.length} tông có kênh lam lớn hơn kênh đỏ (${lanh.slice(0, 3)}) — một tông`
    + ' lạnh trong bức này là một tông được chiếu bởi một nguồn sáng thứ hai không tồn tại');
  const [r, , b] = rgb(ROOM_PROFILE_DARK.checkSky);
  assert.ok(b > r, 'checkSky không lạnh — mất đối lập nhiệt độ ở hai bên mép bàn');
  // Hồ sơ nào thêm vào sau cũng phải có ĐỦ bộ khoá, không thì bộ sinh vỡ ở
  // giữa chừng với một KeyError thay vì một câu nói được chuyện gì.
  for (const [ten, p] of Object.entries(ROOM_PROFILES)) {
    if (!p) continue;
    assert.deepEqual(Object.keys(p).sort(), Object.keys(ROOM_PROFILE_DARK).sort(),
      `hồ sơ ${ten} thiếu hoặc thừa khoá so với ROOM_PROFILE_DARK`);
  }
});

/* ═══ 12 · KHUNG khớp khung trời ══════════════════════════════════════ */

test('khung tiền cảnh rộng bằng khung trời, và thấp hơn hẳn', () => {
  // Đọc BẰNG REGEX, không `import`: hai bức là hai tấm độc lập, và một bức vỡ
  // build vì một hằng của bức kia đổi là đúng kiểu ràng buộc mà `build_sky.py`
  // từ chối khi nó không import `build_map.py`. Nhưng chúng PHẢI xếp lên nhau
  // được, nên một ca test canh là đủ.
  const sm = readFileSync(join(FE, 'src', 'lib', 'star-map.ts'), 'utf8');
  const m = sm.match(/export const SKY_FRAME = \{ width: (\d+), height: (\d+) \}/);
  assert.ok(m, 'không đọc được SKY_FRAME từ star-map.ts');
  assert.equal(ROOM_FRAME.width, Number(m[1]),
    'tiền cảnh không rộng bằng khung trời — hai tấm sẽ phải co giãn để xếp lên nhau');
  assert.ok(ROOM_FRAME.height < Number(m[2]) * 0.6,
    'tiền cảnh cao quá nửa khung trời — bàn nuốt mất bầu trời');
  const vb = SVG.match(/viewBox="0 0 (\d+) (\d+)"/);
  assert.deepEqual([Number(vb[1]), Number(vb[2])], [ROOM_FRAME.width, ROOM_FRAME.height]);
  assert.match(SVG, /aria-label="[^"]{30,}"/, 'SVG thiếu nhãn aria mô tả được bức tranh');
});

/* ═══ 13 · TẤT ĐỊNH, TRẦN DUNG LƯỢNG, VÀ BẢNG SỐ ĐO ═══════════════════ */

const PYBIN = ['py', 'python3', 'python'].find((bin) => {
  const r = spawnSync(bin, ['--version'], { encoding: 'utf8' });
  return r.status === 0;
});

test('chạy script hai lần ra ĐÚNG một tệp, và khớp tệp đã commit', () => {
  assert.ok(PYBIN, 'không tìm thấy trình thông dịch Python (py / python3 / python)');
  const a = mkdtempSync(join(tmpdir(), 'room-a-'));
  const b = mkdtempSync(join(tmpdir(), 'room-b-'));
  try {
    const chay = (out) => execFileSync(PYBIN, ['-I', PY_PATH, '--out', out],
      { cwd: ROOT, encoding: 'utf8' });
    chay(a);
    chay(b);
    const ta = readFileSync(join(a, 'room-ban.svg'), 'utf8');
    assert.equal(ta, readFileSync(join(b, 'room-ban.svg'), 'utf8'),
      'tệp đổi giữa hai lần chạy — mỗi lần build sẽ là một diff vô nghĩa');
    assert.equal(ta, SVG,
      'room-ban.svg trong public/ lệch với thứ script sinh ra — hoặc ai đó sửa tay (tranh'
      + ' là tập SINH RA, sửa tay là lần chạy sau xoá sạch), hoặc quên chạy lại'
      + ' `py scripts/room/build_room.py`');
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test('tệp dưới trần dung lượng, và script TỰ CHẶN trước khi ghi', () => {
  const tran = Number(PY.match(/^MAX_KB = (\d+)/m)[1]);
  assert.ok(tran > 0 && tran <= 420, `trần ${tran} KB vô lý cho một tấm tiền cảnh`);
  const kb = statSync(join(FE, 'public', 'map', 'room', 'room-ban.svg')).size / 1024;
  assert.ok(kb < tran, `room-ban.svg nặng ${kb.toFixed(0)} KB, vượt trần ${tran} KB`);
  // …và trần phải CẮN: để lại quá nhiều khoảng trống thì nó không chặn được
  // gì cho tới lúc đã muộn.
  assert.ok(kb > tran * 0.6,
    `tệp chỉ ${kb.toFixed(0)} KB trên trần ${tran} KB — trần nới quá rộng, nó sẽ không`
    + ' chặn được lớp thừa nào');
  // Gác TRƯỚC khi ghi: một lần chạy trượt mà vẫn để lại tệp quá khổ trong
  // public/ là một tệp sẽ lên production qua commit sau.
  const than = PY.match(/^def main\(\)[\s\S]*$/m)[0];
  assert.ok(than.indexOf('vượt trần %d KB') < than.indexOf('f.write_text'),
    'build_room.py ghi tệp TRƯỚC khi kiểm trần');
});

test('bảng số đo của bộ sinh đạt mọi sàn — chữ 4,5:1, nét 3:1, không thấy dải', () => {
  assert.ok(PYBIN, 'không tìm thấy trình thông dịch Python');
  const out = execFileSync(PYBIN, ['-I', PY_PATH, '--do'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const buoc = Number(out.match(/bước dải xấu nhất\s+([\d.]+)/)[1]);
  assert.ok(buoc <= ROOM_BUDGET.bandStepMax,
    `bước dải ${buoc}/255 mã màu vượt trần ${ROOM_BUDGET.bandStepMax} — mắt đếm được`
    + ' từng đĩa ánh đèn, tức cái dốc sáng đọc ra là một dãy vòng');
  const chu = [...out.matchAll(/^\s+chữ .*?([\d.]+):1/gm)].map((m) => Number(m[1]));
  assert.ok(chu.length >= 4, `chỉ đo được ${chu.length} dòng chữ`);
  assert.ok(Math.min(...chu) >= ROOM_BUDGET.textMin,
    `dòng chữ tệ nhất ${Math.min(...chu)}:1, dưới sàn ${ROOM_BUDGET.textMin}:1 (WCAG 1.4.3)`);
  const net = [...out.matchAll(/^\s+nét .*?([\d.]+):1/gm)].map((m) => Number(m[1]));
  assert.ok(net.length >= 2, `chỉ đo được ${net.length} nhóm nét mang tin`);
  assert.ok(Math.min(...net) >= ROOM_BUDGET.inkMin,
    `nét mang tin tệ nhất ${Math.min(...net)}:1, dưới sàn ${ROOM_BUDGET.inkMin}:1 (WCAG 1.4.11)`);
  const mid = Number(out.match(/BẬC GIỮA [\d,–]+\s+([\d.]+)%/)[1]) / 100;
  assert.ok(mid >= ROOM_BUDGET.midShareMin,
    `bậc giữa ${(mid * 100).toFixed(1)}% dưới sàn ${ROOM_BUDGET.midShareMin * 100}% — một`
    + ' bức chỉ có đen sâu và mảng chói là một hàm HAI giá trị, tức sơ đồ chứ không phải'
    + ' tranh (đúng chẩn đoán của lời chê thứ năm ở bản đồ sao)');
  const tv = Number(out.match(/trung vị độ chói\s+([\d.]+)/)[1]);
  assert.ok(tv <= ROOM_BUDGET.medianMax,
    `trung vị ${tv} vượt trần — cả mặt bàn sáng đều, tức nguồn sáng duy nhất thôi là một`
    + ' nguồn sáng và mọi bóng đổ mất nghĩa');
});

/* ═══ 14 · ÁNH SÁNG LÁI MỌI TÔNG ══════════════════════════════════════ */

test('mỗi vật một cặp (base, gain) riêng, và ambient phải NHỎ', () => {
  for (const v of ['desk', 'paper', 'brass', 'ruler', 'grain']) {
    assert.ok(typeof ROOM_LIT[`${v}Base`] === 'number' && typeof ROOM_LIT[`${v}Gain`] === 'number',
      `ROOM_LIT thiếu cặp số cho ${v}`);
    assert.ok(ROOM_LIT[`${v}Base`] + ROOM_LIT[`${v}Gain`] <= 1.0001,
      `${v}: base + gain > 1, bậc tông sẽ bão hoà ở mọi chỗ có ánh sáng`);
    assert.ok(ROOM_LIT[`${v}Gain`] > 0.2,
      `${v}: gain ${ROOM_LIT[`${v}Gain`]} quá nhỏ — tông của nó gần như không theo ánh sáng`);
  }
  assert.ok(ROOM_LIT.ambient > 0 && ROOM_LIT.ambient < 0.12,
    `ambient ${ROOM_LIT.ambient}: bằng 0 thì nửa phải bức là mảng đen tuyệt đối (một hàm`
    + ' HAI giá trị), lớn quá thì cái nguồn sáng duy nhất thôi là nguồn sáng duy nhất');
  // Chỗ GẦN đèn phải sáng hơn hẳn chỗ XA — nếu không thì "ánh sáng rơi theo
  // khoảng cách" chỉ là một câu trong tài liệu.
  const gan = lampCumAlpha(60);
  const xa = lampCumAlpha(900);
  assert.ok(gan > xa * 8,
    `gần đèn ${gan.toFixed(3)} so với xa đèn ${xa.toFixed(3)} — ánh sáng gần như không rơi`);
});
