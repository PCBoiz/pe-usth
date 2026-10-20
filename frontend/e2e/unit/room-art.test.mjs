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
 *  8. Và cái im lặng nhất, bắt được ngày 20/10/2026: một khổ có thể ĐẠT MỌI
 *     CON SỐ Ở TRÊN mà vẫn là một khung gần như trống. Bản dọc đo 5 634 nét,
 *     197,5/200 KB, bậc giữa 43,3 % (sàn 30), tương phản vượt sàn — với HAI
 *     PHẦN BA DƯỚI chìm hẳn thành đen. Không phép đo nào kêu vì mọi phép đo
 *     ở trên hoặc lấy TRUNG BÌNH trên cả khung, hoặc ĐẾM NÉT (ba nghìn vệt
 *     thớ vẫn nằm trong tệp, tất cả đều vô hình), hoặc chỉ đo ở chỗ CÓ VẬT.
 *     Xem mục 13b.
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
  ROOM_FORMATS,
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
const KHO_NGANG = ROOM_FORMATS.find((k) => k.key === 'ngang');
const KHO_DOC = ROOM_FORMATS.find((k) => k.key === 'doc');
const SVG_DOC = readFileSync(join(FE, 'public', 'map', 'room', KHO_DOC.file), 'utf8');

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
  // CẢ HAI tệp: khổ dọc có những vật khổ ngang không vẽ (bút chì, lõi chì,
  // cục tẩy), nên chỉ soi tệp ngang là bốn tông mới chưa từng được kiểm —
  // và một tông lạ lọt vào tệp mà nửa số người xem thấy thì không ai hay.
  const dung = new Set([SVG, SVG_DOC].flatMap(
    (s) => [...s.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase())));
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
        const d = [0, 1, 2].map((i) => B[i] - A[i]);
        const dd = d.reduce((s, v) => s + v * v, 0);
        if (!dd) continue;
        // CHIẾU VUÔNG GÓC lên đoạn, không giải `t` từ MỘT kênh. Bản đầu lấy
        // kênh đầu tiên có hiệu khác 0, và với thang bóng đèn
        // (#E3B257 → #FFEEC4) kênh đỏ chỉ đổi 28 mã trong khi kênh lam đổi
        // 109: làm tròn kênh đỏ nửa mã làm `t` lệch 1,8 %, tức kênh lam lệch
        // 2 mã — và hai màu NẰM ĐÚNG trên đoạn bị báo là màu lạ. Phép chiếu
        // không chặt hơn hay lỏng hơn, nó chỉ đặt `t` vào đúng chỗ.
        const t = [0, 1, 2].reduce((s, i) => s + (p[i] - A[i]) * d[i], 0) / dd;
        if (t < -0.02 || t > 1.02) continue;
        if (p.every((v, i) => Math.abs(v - (A[i] + d[i] * t)) <= 1.5)) return true;
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

/**
 * Lớp nào CHỈ có mặt khi khổ ấy vẽ vật tương ứng (`ROOM_FORMATS[].draw`), và
 * `null` = lớp nền, khổ nào cũng có.
 *
 * Bảng này có vì bản dọc không vẽ sổ, thẻ đồng và đèn: so thẳng danh sách lớp
 * của MỘT tệp với cả `ROOM_LAYERS` chỉ đúng với khổ vẽ đủ mọi vật, nên nó
 * KHÔNG kiểm được tệp thứ hai — và tệp thứ hai là tệp mà nửa số người xem
 * thấy. Viết ra tập phụ thuộc rồi lọc là cách kiểm được CẢ HAI tệp bằng cùng
 * một danh sách thứ tự z duy nhất.
 */
const LOP_CAN = {
  'bong-xa': ['the-dong', 'thuoc', 'but-chi'],
  'the-dong': ['the-dong'],
  thuoc: ['thuoc'],
  'but-chi': ['but-chi'],
  'bong-giua': ['so-tay', 'den'],
  'so-tay': ['so-tay'],
  'bong-gan': ['com-pa'],
  'com-pa': ['com-pa'],
  den: ['den'],
  chu: ['the-dong'],
};
const lop_cua_kho = (kho) => ROOM_LAYERS.filter(
  (l) => !LOP_CAN[l] || LOP_CAN[l].some((v) => kho.draw.includes(v)));

test('lớp trong SVG đúng tập và đúng THỨ TỰ của ROOM_LAYERS', () => {
  for (const [kho, svg] of [[KHO_NGANG, SVG], [KHO_DOC, SVG_DOC]]) {
    const co = [...svg.matchAll(/<g data-lop="([^"]+)">/g)].map((m) => m[1]);
    assert.deepEqual(co, lop_cua_kho(kho),
      `khổ ${kho.key}: thứ tự lớp trong tệp lệch với ROOM_LAYERS — thứ tự đăng ký LÀ`
      + ' thứ tự z, LÀ thứ tự vẽ, và chép nó ở chỗ thứ hai là hai chỗ sẽ lệch');
  }
  // HỢP của hai khổ phải phủ TRỌN `ROOM_LAYERS`: một lớp không khổ nào sinh
  // ra là một dòng chết trong danh sách thứ tự z, và nó sẽ lặng lẽ đẩy sai
  // chỗ của mọi lớp dưới nó trong `che_boi` (hàm ấy đọc CHỈ SỐ trong danh
  // sách, không đọc tên).
  const phu = new Set(ROOM_FORMATS.flatMap((k) => lop_cua_kho(k)));
  assert.deepEqual([...ROOM_LAYERS].filter((l) => !phu.has(l)), [],
    'có lớp trong ROOM_LAYERS mà không khổ nào vẽ ra — một dòng chết trong danh sách'
    + ' thứ tự z');
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
    // CẢ HAI KHỔ: một lượt chạy sinh ra hai tệp, và cả hai phải tất định —
    // `dung_kho` gán lại hàng chục hằng dẫn xuất, nên một hằng quên rebind là
    // khổ thứ hai dựng bằng phối cảnh của khổ thứ nhất.
    for (const kho of ROOM_FORMATS) {
      const ta = readFileSync(join(a, kho.file), 'utf8');
      assert.equal(ta, readFileSync(join(b, kho.file), 'utf8'),
        `${kho.file} đổi giữa hai lần chạy — mỗi lần build sẽ là một diff vô nghĩa`);
      assert.equal(ta, kho.key === 'doc' ? SVG_DOC : SVG,
        `${kho.file} trong public/ lệch với thứ script sinh ra — hoặc ai đó sửa tay`
        + ' (tranh là tập SINH RA, sửa tay là lần chạy sau xoá sạch), hoặc quên chạy'
        + ' lại `py scripts/room/build_room.py`');
    }
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test('MỖI KHỔ một trần dung lượng, và script TỰ CHẶN trước khi ghi', () => {
  for (const kho of ROOM_FORMATS) {
    const tran = kho.maxKb;
    assert.ok(tran > 0 && tran <= 420, `trần ${tran} KB vô lý cho một tấm tiền cảnh`);
    const kb = statSync(join(FE, 'public', 'map', 'room', kho.file)).size / 1024;
    assert.ok(kb < tran, `${kho.file} nặng ${kb.toFixed(0)} KB, vượt trần ${tran} KB`);
    // …và trần phải CẮN: để lại quá nhiều khoảng trống thì nó không chặn được
    // gì cho tới lúc đã muộn.
    assert.ok(kb > tran * 0.6,
      `${kho.file} chỉ ${kb.toFixed(0)} KB trên trần ${tran} KB — trần nới quá rộng, nó`
      + ' sẽ không chặn được lớp thừa nào');
  }
  // Bản DỌC phải nhẹ hơn hẳn: nó tải trên mạng điện thoại và hiển thị ở 1 px
  // mỗi đơn vị (bản ngang: 1,73), nên cùng một mật độ nét ở đó là chi tiết
  // dưới một điểm ảnh, tức byte chết.
  assert.ok(KHO_DOC.maxKb <= KHO_NGANG.maxKb * 0.6,
    'trần bản dọc không nhỏ hơn hẳn bản ngang — bản điện thoại đang được cấp ngân sách'
    + ' của bản máy tính');
  // Gác TRƯỚC khi ghi: một lần chạy trượt mà vẫn để lại tệp quá khổ trong
  // public/ là một tệp sẽ lên production qua commit sau.
  const than = PY.match(/^def mot_kho\([\s\S]*$/m)[0];
  assert.ok(than.indexOf('vượt trần %d KB') < than.indexOf('f.write_text'),
    'build_room.py ghi tệp TRƯỚC khi kiểm trần');
});

/** Bảng `--do` của MỘT khổ. Bộ sinh in một khối mỗi khổ, mở đầu bằng `══ KHỔ`. */
let _DO = null;
function bangDo(key) {
  if (_DO === null) {
    const out = execFileSync(PYBIN, ['-I', PY_PATH, '--do'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    _DO = {};
    for (const k of out.split('══ KHỔ ').slice(1)) _DO[k.split(' ')[0].toLowerCase()] = k;
  }
  assert.ok(_DO[key], `bảng --do không có khối cho khổ ${key}`);
  return _DO[key];
}

test('bảng số đo của bộ sinh đạt mọi sàn — chữ 4,5:1, nét 3:1, không thấy dải', () => {
  assert.ok(PYBIN, 'không tìm thấy trình thông dịch Python');
  const out = bangDo('ngang');
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

test('BẢN DỌC đi qua CÙNG bộ sàn — một khổ không được gác là nửa số người xem', () => {
  assert.ok(PYBIN, 'không tìm thấy trình thông dịch Python');
  const out = bangDo('doc');
  const buoc = Number(out.match(/bước dải xấu nhất\s+([\d.]+)/)[1]);
  assert.ok(buoc <= ROOM_BUDGET.bandStepMax, `bản dọc: bước dải ${buoc}/255 vượt trần`);
  const mid = Number(out.match(/BẬC GIỮA [\d,–]+\s+([\d.]+)%/)[1]) / 100;
  assert.ok(mid >= ROOM_BUDGET.midShareMin,
    `bản dọc: bậc giữa ${(mid * 100).toFixed(1)}% dưới sàn — một dải chỉ có đen sâu và`
    + ' một mảng chói là một hàm HAI giá trị, tức lại là gradient');
  const tv = Number(out.match(/trung vị độ chói\s+([\d.]+)/)[1]);
  assert.ok(tv <= ROOM_BUDGET.medianMax, `bản dọc: trung vị ${tv} vượt trần`);
  // VẠCH THƯỚC vẫn phải đọc được — và đây là ca đã CHẶN một bản dựng thật:
  // bản đầu đặt thước ở đáy dải (y ≈ 800), cách tâm vũng sáng 820 đơn vị, và
  // vạch chia đo 1,05 : 1 ở 14 điểm. Cách duy nhất làm con số ấy đạt mà giữ
  // chỗ ấy là bôi sáng một vật nằm trong bóng tối, tức dựng một nguồn sáng
  // thứ hai không có.
  const net = [...out.matchAll(/^\s+nét .*?([\d.]+):1/gm)].map((m) => Number(m[1]));
  assert.ok(net.length >= 1, 'bản dọc không đo được nét mang tin nào — mất cái thước?');
  assert.ok(Math.min(...net) >= ROOM_BUDGET.inkMin,
    `bản dọc: nét mang tin tệ nhất ${Math.min(...net)}:1, dưới sàn ${ROOM_BUDGET.inkMin}:1`);
});

/* ═══ 13b · DIỆN TÍCH MANG NỘI DUNG — cái sàn đã THIẾU ════════════════
 *
 * Lượt nhìn thứ ba (20/10/2026) chỉ ra một khuyết tật mà MỌI con số ở trên
 * đều nói là ĐẠT: bản dọc đo **5 634 nét, 197,5/200 KB, bậc giữa 43,3 %
 * (sàn 30), bước dải 1,87 (trần 2), vạch thước 4,41 : 1 (sàn 3)** — và nhìn
 * vào thì nó là một mảng gỗ gần như trống, với HAI PHẦN BA DƯỚI chìm hẳn
 * thành đen.
 *
 * Vì sao không phép đo nào kêu, và đây mới là chỗ đáng học:
 *
 *  · `midShareMin` đếm bậc GIỮA trên CẢ mặt bàn. Nó cộng một phần ba rất
 *    sáng với hai phần ba đen rồi báo 43 % — một con số lành nói về một bức
 *    không lành. Mọi phép gác trung bình trên cả khung đều mù theo kiểu này.
 *  · ĐẾM NÉT cũng không bắt được: bản hỏng có ~3 000 vệt thớ rải ĐỀU khắp
 *    dải, kể cả ở đáy. Chúng có trong tệp, chúng tốn byte, và chúng vô
 *    hình. "Có nét" không đồng nghĩa với "mang nội dung".
 *  · Tương phản chỉ đo ở chỗ có VẬT. Đáy dải không có vật nào, nên không
 *    một phép đo tương phản nào đi qua đó.
 *
 * Nên phép đo phải hỏi: ở TỪNG TẦNG của bức, bao nhiêu phần diện tích tối
 * tới mức không nét nào còn đọc được? Dưới L = 0,01 thì thớ gỗ, khe ván,
 * mắt gỗ và mọi phản chiếu khẽ đều nằm dưới ngưỡng thấy — một băng như vậy
 * là một băng TRỐNG dù tệp có bao nhiêu nét.
 */

test('mỗi BĂNG của mặt bàn phải còn diện tích mang nội dung — không băng nào chìm hẳn', () => {
  assert.ok(PYBIN, 'không tìm thấy trình thông dịch Python');
  assert.ok(ROOM_BUDGET.deepBands >= 4,
    `chia ${ROOM_BUDGET.deepBands} băng là quá thô — với 2 băng, "hai phần ba dưới đen"`
    + ' lại tan vào một con số trung bình, đúng cái lỗ mà phép đo này sinh ra để bịt');
  for (const kho of ROOM_FORMATS) {
    const out = bangDo(kho.key);
    const dong = out.match(/PHẦN ĐEN mỗi băng\s+([\d% ]+?)\s+\(trần/);
    assert.ok(dong, `khổ ${kho.key}: bảng --do không in "PHẦN ĐEN mỗi băng" — phép đo`
      + ' diện tích mang nội dung đã bị gỡ khỏi bộ sinh');
    const bang = dong[1].trim().split(/\s+/).map((s) => Number(s.replace('%', '')) / 100);
    assert.equal(bang.length, ROOM_BUDGET.deepBands,
      `khổ ${kho.key}: đo được ${bang.length} băng, khai ${ROOM_BUDGET.deepBands} —`
      + ' một phép đo gộp về ÍT băng hơn là một phép đo lại bắt đầu lấy trung bình');
    const te = bang.map((v, i) => [i, v]).filter(([, v]) => v > ROOM_BUDGET.deepShareMax);
    assert.deepEqual(te, [],
      `khổ ${kho.key}: băng ${te.map(([i, v]) => `${i + 1} (${(v * 100).toFixed(0)}%)`)}`
      + ` vượt trần ${(ROOM_BUDGET.deepShareMax * 100).toFixed(0)}% diện tích ở L<`
      + `${ROOM_BUDGET.bands[0]} — chỗ ấy không nét nào đọc được, nên nó là diện tích`
      + ' TRỐNG. Bản dọc hỏng đo `0% 0% 4% 23% 97% 100%`; khổ ngang đạt với'
      + ' `14% 9% 6% 13% 19% 31%`.');
  }
  // …và phép gác phải CHẶN BUILD, không chỉ in ra. Một con số được in mà
  // không ai đọc là đúng cái đã để lọt bản dọc: bảng `--do` lúc ấy vẫn in
  // "đen sâu 37,27 %" ngay trên dòng "BẬC GIỮA 43,32 % (sàn 30 %)".
  assert.match(PY, /den_bang/,
    'build_room.py không còn đo phần đen theo băng — phép đo đã bị gỡ');
  assert.match(PY, /BUDGET\["deepShareMax"\]/,
    'build_room.py không còn đọc deepShareMax — phép đo còn đó nhưng không chặn gì');
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

/* ═══ 15 · BA VẬT ĐÃ ĐỌC RA "HÌNH KỸ THUẬT", và phép đo của từng cái ═══
 *
 * Lượt nhìn thứ hai (20/10/2026) chỉ ra ba vật mà mọi bảng số ở trên đều
 * nói là ĐẠT trong khi mắt nói là chưa vẽ xong:
 *
 *  · CÁI ĐÈN — "một hình nón đen kẻ sọc, dưới có một thanh trắng mảnh", tức
 *    vật PHÁT RA toàn bộ ánh sáng của bức là vật trông ít giống thật nhất.
 *  · TẤM THẺ ĐỒNG — "một hình chữ nhật gạch chéo", đúng họ với chín tấm nền
 *    nhãn đã phải gỡ khỏi bản đồ sao.
 *  · THỚ GỖ — "kim loại chải": vệt dài, song song, cách đều, không mắt gỗ.
 *
 * Không một ca nào trong mười bốn mục trên bắt được cả ba, vì cả ba là
 * khuyết tật HÌNH HỌC còn mọi ca đều đo ĐỘ CHÓI và TƯƠNG PHẢN. Sáu ca dưới
 * đây đo hình: hướng nét, độ cong nét, số bậc tông, thứ tự sáng-tối, và một
 * câu hỏi mà phép đo tương phản không thể hỏi — chữ có nằm TRÊN tấm thẻ
 * không.
 */

/** Mọi subpath của một lớp, đã giải `M l h v Z` → [[x, y], …]. */
const duong = (than) => {
  const ra = [];
  for (const m of than.matchAll(/\sd="([^"]*)"/g)) {
    let x = 0; let y = 0; let cur = null;
    for (const t of m[1].matchAll(/([MlhvZ])\s*(-?[\d.]+)?(?:[ ,]+(-?[\d.]+))?/g)) {
      const c = t[1];
      if (c === 'M') {
        if (cur && cur.length > 1) ra.push(cur);
        x = +t[2]; y = +t[3]; cur = [[x, y]];
      } else if (!cur) continue;
      else if (c === 'l') { x += +t[2]; y += +t[3]; cur.push([x, y]); }
      else if (c === 'h') { x += +t[2]; cur.push([x, y]); }
      else if (c === 'v') { y += +t[2]; cur.push([x, y]); }
      else if (c === 'Z') { if (cur.length > 1) ra.push(cur); cur = null; }
    }
    if (cur && cur.length > 1) ra.push(cur);
  }
  return ra;
};
const trung_vi = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1];
const hop = (p) => ({
  x0: Math.min(...p.map((q) => q[0])), x1: Math.max(...p.map((q) => q[0])),
  y0: Math.min(...p.map((q) => q[1])), y1: Math.max(...p.map((q) => q[1])),
});
/** Khoảng cách tới tâm một mắt gỗ, TRONG HỆ CỦA MẮT (bỏ xoay và nén). */
const xa_mat = (x, y, kn) => {
  const ca = Math.cos(kn.tilt); const sa = Math.sin(kn.tilt);
  const dx = x - kn.x; const dy = y - kn.y;
  return Math.hypot(dx * ca + dy * sa, (-dx * sa + dy * ca) / kn.squash);
};
const do_choi = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((s) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

test('chữ khắc nằm TRỌN trên tấm thẻ đồng, không lơ lửng ra ngoài trên gỗ', () => {
  // ── PHÉP ĐO MÀ `do_tuong_phan_chu` KHÔNG THỂ LÀ ──────────────────────
  // Với `lead` 19 và `y` 199 của bản đầu, dòng thứ tư rơi xuống baseline
  // 258 trong khi mép dưới tấm ở y ≈ 247: cả dòng nằm trên GỖ. Phép đo
  // tương phản không kêu — nó đo nền tại đúng chỗ chữ nằm, và gỗ ở đó TỐI
  // HƠN đồng nên tỉ số còn tốt hơn (8,59 : 1). Một dòng chữ lơ lửng ngoài
  // vật mang nó, với một bảng số đạt mọi sàn.
  // Nó sống sót thêm một vòng nữa vì `raster_room.py` bỏ qua thẻ `<text>`,
  // nên chữ khắc chưa từng lọt vào một lượt NHÌN nào.
  const q = ROOM_PLATE.quad;
  const trong = (x, y) => {
    let k = false;
    for (let i = 0; i < q.length; i += 1) {
      const j = (i + q.length - 1) % q.length;
      if ((q[i][1] > y) !== (q[j][1] > y)
        && x < q[j][0] + ((y - q[i][1]) / (q[j][1] - q[i][1])) * (q[i][0] - q[j][0])) k = !k;
    }
    return k;
  };
  const t = ROOM_PLATE.text;
  const dong = [[t.x, t.y, ROOM_COPY.title, t.titleSize]];
  ROOM_COPY.rows.forEach((s, i) => dong.push([t.x, t.y + t.lead * (i + 1) + 2, s, t.size]));
  for (const [x, y, s, size] of dong) {
    // Cùng công thức bề rộng mà `do_tuong_phan_chu` dùng (0,52 em + tracking):
    // hai ước lượng là hai con số sẽ lệch, và lệch ở đây nghĩa là ca này canh
    // một hộp chữ khác với hộp mà phép đo tương phản đọc.
    const w = s.length * size * (0.52 + t.tracking);
    for (const [px, py] of [[x, y], [x + w, y], [x, y - size * 0.7], [x + w, y - size * 0.7]]) {
      assert.ok(trong(px, py),
        `dòng "${s}" có góc (${px.toFixed(0)}, ${py.toFixed(0)}) NGOÀI tấm thẻ đồng —`
        + ' chú giải khắc trên một tấm đồng không được rơi xuống mặt bàn. Hạ'
        + ' `ROOM_PLATE.text.lead` hay `size`, đừng nới `quad`.');
    }
  }
  // Và đường viền chìm phải ôm được cả khối chữ, không cắt ngang nó.
  const day = dong[dong.length - 1][1];
  const vien_duoi = q[3][1] + (q[2][1] - q[3][1]) * 0.5
    - (q[3][1] - q[0][1]) * ROOM_PLATE.groove.v;
  assert.ok(day < vien_duoi,
    `dòng cuối (baseline ${day}) nằm DƯỚI đường viền chìm (${vien_duoi.toFixed(0)}) — cái`
    + ' viền cắt ngang chữ thay vì đóng khung nó');
});

test('vân trên thẻ đồng là vệt CHẢI dọc trục tấm, và phép dò cụm thật sự lọc', () => {
  // Bản đầu rải 3 400 vệt ở −41° và 2 180 vệt (64 %) sống sót, vì phép dò
  // cụm viết `rnd() > 0,18 + 1,5 × cum` mà `cum` là fbm chuẩn hoá quanh 0,5:
  // ngưỡng ≈ 0,93, tức nó không lọc gì cả. Kết quả là một ô bị bôi chéo.
  const sc = ROOM_PLATE.scratch;
  const vach = duong(lop('the-dong')).filter((p) => p.length === 2)
    .map((p) => ({
      L: Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]),
      a: Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]),
    }))
    .filter((o) => o.L > 12 && o.L < 100);
  assert.ok(vach.length > 150, `chỉ ${vach.length} vệt chải — mặt đồng mất chất liệu`);
  assert.ok(vach.length < sc.count * 0.45,
    `${vach.length}/${sc.count} vệt sống sót (${(vach.length / sc.count * 100).toFixed(0)} %)`
    + ' — phép dò cụm không lọc, nên vân rải ĐỀU và mặt đồng đọc ra một ô bị gạch');
  // MỘT HƯỚNG, và hướng ấy là trục dài của tấm. Kim loại được CHẢI; vệt chéo
  // cắt qua cả hai mép nên mắt đọc ra hoa văn chồng lên vật.
  const doc = Math.atan2(ROOM_PLATE.quad[1][1] - ROOM_PLATE.quad[0][1],
    ROOM_PLATE.quad[1][0] - ROOM_PLATE.quad[0][0]);
  assert.ok(Math.abs(sc.angle - doc) < 0.06,
    `góc vân ${sc.angle} lệch ${Math.abs(sc.angle - doc).toFixed(3)} rad khỏi trục dài của`
    + ` tấm (${doc.toFixed(4)}) — vân chải phải song song với tấm, không với khung ảnh`);
  const lech = vach.filter((o) => Math.abs(o.a - sc.angle) > 0.2);
  assert.equal(lech.length, 0,
    `${lech.length} vệt lệch quá 0,2 rad khỏi hướng chải — hai hướng trên một mặt kim`
    + ' loại là gạch chéo, không phải vết đánh bóng');
  assert.ok(Math.abs(trung_vi(vach.map((o) => o.a))) < 0.1,
    'hướng trung vị của vân không nằm ngang theo tấm');
});

test('thớ gỗ ĐI VÒNG quanh mắt gỗ, không đi xuyên qua', () => {
  // Ba cái mắt đã có từ bản đầu, nhưng thớ đi XUYÊN chúng — nên chúng đọc ra
  // ba vết bẩn hình ê-líp nằm trên một mặt chải. Đo bằng ĐỘ CONG: độ lệch lớn
  // nhất của vệt khỏi dây cung nối hai đầu, chia cho chiều dài vệt.
  //
  // Gỡ `uon_quanh_mat` ra thì tỉ số tụt từ 9,8 về 0,83 — tức thớ gần mắt cong
  // BẰNG thớ ở giữa mặt bàn, vì cả hai chỉ còn cái rung của `wobble`.
  const cong = (p) => {
    const [ax, ay] = p[0];
    const [bx, by] = p[p.length - 1];
    const L = Math.hypot(bx - ax, by - ay) || 1;
    let m = 0;
    for (const [x, y] of p) {
      m = Math.max(m, Math.abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / L);
    }
    return { L, c: m / L };
  };
  const gan = []; const xa = [];
  for (const p of duong(lop('tho-go'))) {
    if (p.length < 3) continue;
    const o = cong(p);
    if (o.L < 40) continue;
    // "GẦN" = trong 1,6 lần bán kính mắt, tức chỗ phép đẩy thật sự lớn. Lấy
    // cả vùng ảnh hưởng (3,4 lần) là pha loãng phép đo bằng những vệt mà bản
    // sửa cố tình gần như không đụng tới.
    (p.some(([x, y]) => ROOM_DESK.knots.some((kn) => xa_mat(x, y, kn) < kn.r * 1.6))
      ? gan : xa).push(o.c);
  }
  assert.ok(gan.length > 30, `chỉ ${gan.length} vệt thớ đi gần mắt gỗ — mắt nằm chỗ khuất?`);
  const tg = trung_vi(gan);
  const tx = trung_vi(xa);
  assert.ok(tg > tx * 4,
    `thớ gần mắt cong ${tg.toFixed(4)} so với thớ xa ${tx.toFixed(4)} (tỉ số`
    + ` ${(tg / tx).toFixed(2)}) — thớ đang đi XUYÊN qua mắt gỗ, nên ba cái mắt đọc ra ba`
    + ' vết bẩn trên một mặt chải, không ra gỗ');
  // Và sóng vân lớn phải được các hàng KỀ NHAU cùng đọc, không thì nó triệt
  // tiêu ở cỡ cả mặt bàn và còn lại đúng những vệt song song cách đều.
  assert.ok(ROOM_DESK.grain.waveRow < 0.15 && ROOM_DESK.grain.wave > 8,
    'vân sóng lớn lấy nhiễu theo hàng quá nhanh (hay biên độ quá nhỏ) — mỗi hàng uốn một'
    + ' kiểu thì ở cỡ cả mặt bàn chúng triệt tiêu nhau và gỗ lại thành kim loại chải');
  // Vệt sẫm cắt ngang là PHƯƠNG THỨ HAI của mặt gỗ.
  assert.ok(ROOM_DESK.checks.count > 100
    && Math.abs(ROOM_DESK.checks.tilt) > ROOM_DESK.grain.tilt * 8,
  'vệt cắt ngang quá ít hay quá thoải — một mặt chỉ có MỘT phương là một mặt chải');
});

test('cái đèn không phải hình nón phẳng: dốc dọc, miệng Ê-LÍP, bóng đèn có QUẦNG', () => {
  const den = lop('den');
  const sh = ROOM_LAMP.shade;
  // 1 · DỐC DỌC: mỗi dải một mảng tô riêng. Bản đầu có ĐÚNG MỘT mảng
  // `shadeDark` phẳng cho cả cái chao.
  const mang = [...den.matchAll(/<path fill="#/g)].length;
  assert.ok(mang >= sh.bands + sh.mouthLevels + sh.bulb.levels,
    `lớp đèn chỉ có ${mang} mảng tô — cần ít nhất ${sh.bands} dải chao +`
    + ` ${sh.mouthLevels} vòng miệng + ${sh.bulb.levels} đĩa bóng đèn. Một mảng phẳng cho`
    + ' cả cái chao là thứ làm nó đọc ra "hình nón đen kẻ sọc".');
  const kin = duong(den).filter((p) => p.length > 8);
  // 2 · MIỆNG LÀ Ê-LÍP. Miệng ở y = 118, dưới chân trời ảo (y = 80), nên
  // người xem nhìn XUỐNG vào trong chao. Hai nét THẲNG nằm ngang ở đó là một
  // cái chao không có bề dày — và chính chúng đọc ra "một thanh trắng mảnh".
  const ry = sh.mouthHalf * sh.mouthSquash;
  assert.ok(sh.mouthSquash > 0.05, 'miệng chao gần như dẹt — nó lại thành một đoạn thẳng');
  const mieng = kin.filter((p) => {
    const b = hop(p);
    return Math.abs((b.x1 - b.x0) - 2 * sh.mouthHalf) < 5
      && b.y1 - b.y0 > 2 * ry * 0.7
      && Math.abs((b.y0 + b.y1) / 2 - ROOM_LAMP.at.y) < 5;
  });
  assert.ok(mieng.length >= 1,
    'không tìm thấy mảng tô nào có bề ngang bằng miệng chao và bề cao của một ê-líp —'
    + ' miệng đèn đang là một đoạn thẳng');
  // 3 · BÓNG ĐÈN CÓ QUẦNG: đĩa lồng nhau, không ba cạnh sắc.
  const by = ROOM_LAMP.at.y + sh.bulb.drop;
  const bong = kin.filter((p) => {
    const b = hop(p);
    return Math.abs((b.x0 + b.x1) / 2 - ROOM_LAMP.at.x) < 4
      && Math.abs((b.y0 + b.y1) / 2 - by) < 4
      && b.x1 - b.x0 <= 2 * sh.bulb.r + 3;
  });
  assert.ok(bong.length >= sh.bulb.levels - 3,
    `bóng đèn chỉ có ${bong.length} đĩa (khai ${sh.bulb.levels}) — ba đĩa cho ba cạnh sắc`
    + ' đếm được bằng mắt, mà một bóng đèn thật có quầng');
  // 4 · NAN CHAO phải DÀY và MỜ, không thưa và đục: 26 nan đục đọc ra SỌC.
  assert.ok(sh.ribs >= 60, `chỉ ${sh.ribs} nan chao — thưa thế thì chúng là sọc kẻ`);
});

test('đế đèn sáng ở TÂM — một cái hố ngay dưới nguồn sáng là một cái hố', () => {
  // Bản đầu cho vòng NGOÀI `shadeLit` và vòng trong `shadeDark`, nên cái đế
  // đọc ra một cái hố có vành sáng — ngay dưới nguồn sáng duy nhất của bức.
  const sh = ROOM_LAMP.shade;
  const vong = [];
  for (const m of lop('den').matchAll(/<path fill="(#[0-9A-Fa-f]{6})"[^>]*d="([^"]*)"/g)) {
    for (const p of duong(` d="${m[2]}"`)) {
      const b = hop(p);
      if (Math.abs((b.x0 + b.x1) / 2 - ROOM_LAMP.at.x) < 4
        && Math.abs((b.y0 + b.y1) / 2 - sh.base.y) < sh.base.ry
        && b.x1 - b.x0 > sh.base.rx) vong.push([b.x1 - b.x0, do_choi(m[1])]);
    }
  }
  assert.ok(vong.length >= 4, `chỉ thấy ${vong.length} vòng của đế đèn`);
  vong.sort((a, b) => b[0] - a[0]);
  assert.ok(vong[vong.length - 1][1] > vong[0][1] * 3,
    `đế đèn: vòng trong L = ${vong[vong.length - 1][1].toFixed(4)} so với vòng ngoài`
    + ` L = ${vong[0][1].toFixed(4)} — tâm không sáng hơn vành, tức cái đế là một CÁI HỐ`);
  // Và vòng trong không được suy biến: `nf()` làm tròn toạ độ về số nguyên,
  // nên một ê-líp cao 0,8 đơn vị biến mất và cái dốc dừng giữa chừng.
  assert.ok(sh.base.rings >= 12, 'quá ít vòng, cái dốc của đế sẽ thấy bậc');
});

test('raster_room.py vẽ được <text> — không thì chú giải chưa ai NHÌN thấy', () => {
  // `raster.ve` chỉ bắt `path|g|circle|/g`. Bầu trời không có chữ nào nên ở
  // đó không ai thấy thiếu; bức này có CHÚ GIẢI KHẮC, tức đúng thứ MANG TIN,
  // và nó chỉ được canh bằng một phép đo tương phản — cùng loại thước đã nói
  // 47,3 % trong khi tranh thật là 4,3 %.
  const RAS = readFileSync(join(ROOT, 'scripts', 'room', 'raster_room.py'), 'utf8');
  assert.match(RAS, /def chu_thanh_net/,
    'raster_room.py không có bước đổi <text> thành nét — lớp `chu` vô hình trong mọi'
    + ' lượt nhìn, và ba câu mà chỉ mắt trả lời được (chữ có tràn khỏi tấm không, có đè'
    + ' lên đinh tán không, bốn dòng có chồng nhau không) không ai hỏi');
  assert.match(RAS, /tam\.write_text\(chu_thanh_net\(/,
    'chu_thanh_net có mà không được gọi trước `ve` — một hàm không ai chạy');
  assert.ok(PYBIN, 'không tìm thấy trình thông dịch Python');
  // Và nó phải THẬT SỰ ra nét: một `<g font-…>` với hai chữ cái → một `<path>`
  // mang đủ hai khung chữ.
  const mau = '<g fill="#FFFFFF" font-family="serif" font-size="12">'
    + '<text x="10" y="20">AB</text></g>';
  const r = spawnSync(PYBIN, ['-I', '-c',
    'import sys; sys.path.insert(0, "scripts/room"); import raster_room as rr;'
    + ' print(rr.chu_thanh_net(sys.argv[1]))', mau],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(r.status, 0, `chu_thanh_net ném lỗi:\n${r.stderr}`);
  assert.match(r.stdout, /<path fill="none" stroke="#FFFFFF"/,
    `chu_thanh_net không ra nét nào: ${r.stdout.slice(0, 200)}`);
  assert.equal((r.stdout.match(/M/g) || []).length, 2,
    'hai chữ cái phải cho HAI khung — một khung cho cả dòng thì không trả lời được câu'
    + ' "chữ tràn khỏi tấm ở chữ thứ mấy"');
});

/* ═══ 19 · BẢN DỌC CHO ĐIỆN THOẠI — bố cục lại, không cắt từ bản ngang ══ */

test('hai khổ, và bản dọc là một BỐ CỤC KHÁC chứ một ô cắt ra từ bản ngang', () => {
  // Lời chê đã nhận: dải điện thoại cao gấp đôi mà hẹp bằng một phần tư, nên
  // mọi cách căn bản ngang đều đẩy CUỐN SỔ VẼ xuống dưới CUỐN SỔ UI — hai
  // cuốn sổ chồng nghĩa lên nhau, và bản 390 phải quay lại ba mảng gradient.
  assert.equal(ROOM_FORMATS.length, 2, 'mất một khổ — hoặc ai đó thêm khổ mà quên ca này');
  assert.ok(KHO_DOC.frame.height > KHO_DOC.frame.width * 2,
    'khổ "dọc" không dọc — nó phải cao hơn gấp đôi bề ngang, như dải của điện thoại');
  assert.ok(KHO_DOC.frame.width <= KHO_NGANG.frame.width / 3,
    'khổ dọc rộng ngang tầm bản máy tính — vậy thì nó không giải việc gì cả');
  assert.notEqual(KHO_DOC.file, KHO_NGANG.file, 'hai khổ ghi đè lên nhau một tệp');
  // Hai thứ bản dọc KHÔNG được vẽ, và đây là cả lý do nó tồn tại: giao diện
  // điện thoại ĐÃ CÓ một thẻ "Sổ quan trắc" và một thẻ "Chú giải".
  for (const v of ['so-tay', 'the-dong']) {
    assert.ok(!KHO_DOC.draw.includes(v),
      `bản dọc vẽ "${v}" — nó nằm ngay dưới chính nó ở lớp giao diện, tức nói cùng một`
      + ' điều hai lần bằng hai thứ không khớp nhau');
  }
  // …và tệp sinh ra phải THẬT SỰ không có lớp ấy, không chỉ hồ sơ nói thế.
  for (const v of ['so-tay', 'the-dong', 'chu']) {
    assert.ok(!SVG_DOC.includes(`<g data-lop="${v}">`),
      `room-ban-doc.svg vẫn có lớp ${v} — build() không đọc ROOM_FORMATS[].draw`);
  }
  // ĐÈN NGOÀI KHUNG: cái chao cao 160 đơn vị, trên một dải rộng 390 nó chiếm
  // gần nửa bề ngang. Thứ phải giữ là ÁNH SÁNG, không phải cái vật phát ra nó.
  assert.ok(!KHO_DOC.draw.includes('den'), 'bản dọc vẽ cả cái đèn — nó nuốt mất dải');
  assert.ok(KHO_DOC.over.lamp.at.y < 0,
    'đèn của bản dọc không ở ngoài khung — nếu nó ở trong mà không được vẽ thì bóng đổ'
    + ' chỉ về một chỗ trống, và mắt đọc ra ngay là sai');
  assert.ok(KHO_DOC.over.lamp.pool.y > 0
    && KHO_DOC.over.lamp.pool.y < KHO_DOC.frame.height / 3,
    'vũng sáng của bản dọc không nằm ở ĐẦU dải — chỗ duy nhất giao diện chừa trống');
  // PHỐI CẢNH PHẲNG HƠN: cùng độ xiên với bản ngang thì 90 % chiều sâu dồn
  // vào 10 % trên cùng, và 850 đơn vị dưới cùng thành một mảng không thớ.
  assert.ok(KHO_DOC.over.desk.horizonLift > ROOM_DESK.horizonLift * 5,
    'bản dọc dùng lại độ xiên của bản ngang — đáy dải sẽ là một mảng gần như trống');
  const vb = SVG_DOC.match(/viewBox="0 0 (\d+) (\d+)"/);
  assert.deepEqual([Number(vb[1]), Number(vb[2])],
    [KHO_DOC.frame.width, KHO_DOC.frame.height]);
  assert.match(SVG_DOC, /aria-label="[^"]{30,}"/, 'bản dọc thiếu nhãn aria');
  assert.notEqual(SVG_DOC.match(/aria-label="([^"]*)"/)[1],
    SVG.match(/aria-label="([^"]*)"/)[1],
    'hai khổ dùng chung một nhãn aria — bản dọc không có sổ và thẻ đồng, nên nhãn ấy'
    + ' mô tả hai vật không có trong tranh');
  // Khổ ngang KHÔNG được trôi khỏi `ROOM_FRAME`: ca "khung khớp khung trời"
  // đọc `ROOM_FRAME`, còn bộ sinh đọc `ROOM_FORMATS` — hai chỗ là hai con số
  // sẽ lệch.
  assert.deepEqual({ ...KHO_NGANG.frame }, { ...ROOM_FRAME },
    'ROOM_FORMATS.ngang.frame lệch ROOM_FRAME — bộ sinh và ca test đang đọc hai khung');
});

test('bản dọc KHÔNG dùng lại hằng dẫn xuất của bản ngang', () => {
  // `HORIZON`, `_UA`, `TRANG_TRAI`, `THUOC`, chồng vòng ánh đèn `_STACK`… đều
  // tính MỘT LẦN lúc nạp module. Quên rebind một trong số chúng thì khổ dọc
  // vẽ bằng phối cảnh (hay bằng vũng sáng) của khổ ngang — ra một tệp hợp lệ,
  // đúng kích thước, không ngoại lệ nào, và sai ở đúng thứ không ai đi tìm.
  // Khoảng giữa hai hàm trong kho này xuống dòng bằng CR-LF, nên phép so phải
  // nhận cả CR — không thì nó trả về null và ca này "trượt" vì ném TypeError,
  // tức một thông báo nói về đúng chỗ nó không hỏng.
  const than = PY.match(/def dung_kho\([\s\S]*?[\r\n]{2,}def /)[0];
  for (const ten of ['HORIZON', '_UA', '_UB', 'TRANG_TRAI', 'TRANG_PHAI', 'THE_DONG',
    'THUOC', 'THUOC_CANH', 'THUOC_KHOI', '_STACK', 'DENSITY', 'VE', 'BRIGHT_AT']) {
    assert.ok(new RegExp(`\\b${ten}\\b`).test(than),
      `dung_kho không gán lại ${ten} — khổ sau sẽ dựng bằng hằng của khổ trước`);
  }
  // Hình của vật KHÔNG được vẽ phải về RỖNG: `che_boi` và `nen_rgb` đọc chúng,
  // nên một cuốn sổ "vô hình" ở toạ độ khổ ngang che mất một vùng của khổ dọc
  // trong MỌI phép đo.
  assert.match(than, /TRANG_TRAI, TRANG_PHAI = \[\], \[\]/,
    'sổ không được vẽ mà hình của nó vẫn giữ toạ độ cũ');
  // `_STACK` phải được XOÁ, không chỉ khai `global`: chồng 152 vòng ánh đèn
  // tính một lần rồi nhớ lại. Hôm nay hai khổ dùng chung `ROOM_LAMP.profile`
  // nên cái cache ấy tình cờ đúng cho cả hai — tức gỡ dòng xoá ra KHÔNG đổi
  // một byte nào của tệp, và đó chính là lý do phải gác bằng cấu trúc: ngày
  // một khổ khai `profile` hay `levels` riêng, khổ thứ hai sẽ lặng lẽ dùng
  // vũng sáng của khổ thứ nhất và MỌI phép đo cũng đọc đúng cái cache ấy.
  assert.match(than, /_STACK = None/,
    'dung_kho chỉ khai `global _STACK` mà không xoá nó');
  assert.match(than, /_GOC\["desk"\]/,
    'dung_kho trộn từ hồ sơ đã trộn lần trước, không từ hồ sơ GỐC — thứ tự sinh tệp sẽ'
    + ' đổi được bức tranh');
});

/* ═══ 20 · MÔ HÌNH ‖ RASTER — hai cái trần, và cái chặt mới là cái gác ══ */

test('mô hình và tranh ĐÃ GHI RA không trôi xa nhau — đo bằng raster', () => {
  assert.ok(PYBIN, 'không tìm thấy trình thông dịch Python');
  const RAS = join(ROOT, 'scripts', 'room', 'raster_room.py');
  const SRC = readFileSync(RAS, 'utf8');
  const tran = Number(SRC.match(/^TRAN_LECH = ([\d.]+)/m)[1]);
  const tranSang = Number(SRC.match(/^TRAN_LECH_SANG = ([\d.]+)/m)[1]);
  assert.ok(tranSang < tran / 3,
    'hai cái trần gần bằng nhau — cái chặt mất nghĩa, và nó mới là cái gác được');
  const d = mkdtempSync(join(tmpdir(), 'room-ras-'));
  try {
    for (const kho of ROOM_FORMATS) {
      const f = join(d, `${kho.key}.json`);
      execFileSync(PYBIN, ['-I', RAS, '--kho', kho.key, '--buoc', '2', '--json', f],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
      const r = JSON.parse(readFileSync(f, 'utf8'));
      assert.ok(r.o > 40000, `${kho.key}: raster chỉ lấy ${r.o} ô mẫu — bước lấy mẫu sai`);
      // TRẦN RỘNG, và nó rộng vì một lý do đã truy ra chứ vì chịu thua: khoảng
      // lệch tổng của bức này là THỚ GỖ. `nen_rgb` dựng lại MÀU NỀN và không
      // có một nét nào, còn tranh có bảy nghìn vệt thớ; mốc dưới của bậc giữa
      // (L = 0,03) cắt ngang đúng giữa `deskRamp` (bốn bậc đầu đều dưới 0,03),
      // nên ở vành vũng sáng mỗi vệt sẫm là một điểm ảnh rơi khỏi bậc giữa.
      // Bóc theo lớp, đo 20/10/2026: nền+vòng sáng +0,15 · thêm thớ +3,09 ·
      // thêm khe ván +2,65 · thêm ba lớp bóng +6,36 · đủ lớp +4,64.
      // Và lời giải thích sẵn có ("chữ khắc raster thành khung chữ nhật đặc")
      // SAI: bóc riêng lớp `chu` ra chỉ đổi 0,36 điểm.
      assert.ok(Math.abs(r.lech) <= tran,
        `${kho.key}: lệch bậc giữa mô hình ‖ raster ${r.lech.toFixed(2)} điểm, vượt trần`
        + ` ${tran}. Mô hình là MỤC TIÊU, raster là SỰ THẬT: lệch lớn nghĩa là thứ ghi`
        + ' ra tệp khác thứ hồ sơ đòi. Chạy `py -I scripts/room/raster_room.py` để xem'
        + ' bảng hai cột.');
      // TRẦN CHẶT — chỗ mô hình KHẲNG ĐỊNH nó dựng lại được bức tranh: nền mặt
      // bàn cộng 152 đĩa ánh đèn, trên gỗ không vật nào che. Đây là chỗ cả ba
      // lỗi im lặng của bản đồ sao đã nằm (hình lồng nhau bị `evenodd` XOR,
      // lõi suy biến, một lớp sai thứ tự z). Đo được +0,15 và +0,17; gỡ
      // `solo=True` của 152 đĩa ra thì nó nhảy lên −19,97.
      assert.ok(Math.abs(r.lech_anh_sang) <= tranSang,
        `${kho.key}: NỀN + VÒNG SÁNG trên gỗ trần lệch ${r.lech_anh_sang.toFixed(2)} điểm,`
        + ` vượt trần ${tranSang}. Đây là chỗ mô hình nói nó dựng lại được bức tranh —`
        + ' lệch ở đây là <path> không khép, fill-rule XOR mất bậc trong cùng, hay hình'
        + ' lồng nhau bị gộp nhóm.');
    }
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

/* ═══ 21 · BA VẬT PHẢI ĐỌC RA VẬT, KHÔNG RA HÌNH KỸ THUẬT ═════════════ */

test('CHỮ VIẾT TAY có đường nền, chữ cao thấp, khoảng trắng không đều, nhấc bút', () => {
  const hd = ROOM_BOOK.hand;
  // Bản trước rải mỗi dòng `per` = 13 VỆT RUNG rời nhau: nó chữa được độ đậm
  // của bản đầu, nhưng hình thì vẫn là mười ba gạch nằm ngang cách nhau, tức
  // một mã vạch THƯA. Bốn thứ dưới đây là bốn thứ chữ tay có mà một hàng gạch
  // không có, và cả bốn là hình học.
  assert.ok(!('per' in hd),
    'ROOM_BOOK.hand còn `per` — mô hình "mỗi dòng N vệt rung" quay lại, và nó đọc ra'
    + ' một mã vạch thưa');
  for (const k of ['words', 'wordLen', 'gap', 'gapJitter', 'xHeight', 'ascend',
    'descend', 'riseAt', 'dropAt', 'lift', 'slant', 'drift', 'step']) {
    assert.ok(typeof hd[k] === 'number', `ROOM_BOOK.hand thiếu \`${k}\``);
  }
  assert.ok(hd.gapJitter > 1,
    `gapJitter ${hd.gapJitter} ≤ 1 — khoảng cách giữa các từ không bao giờ xuống dưới`
    + ' một nửa, tức vẫn là một dãy gạch cách đều');
  assert.ok(hd.ascend > 0 && hd.descend > 0 && hd.riseAt > 0 && hd.dropAt > 0,
    'không có nét lên / nét xuống — cả dòng cao đều một mức, tức không có chữ cái nào');
  assert.ok(hd.lift > 0, 'không bao giờ nhấc bút — chữ thảo thật cũng không liền một mạch');
  assert.ok(hd.drift > 0 && hd.drift < 2,
    'đường nền trôi quá mạnh hay không trôi — giấy này CÓ kẻ, nên chữ bám đường kẻ');
  // ĐƯỜNG NỀN: bản trước đặt vệt ở `v − 0,012`, tức lơ lửng GIỮA hai dòng kẻ.
  assert.match(PY, /v = \(r \+ 1\) \/ \(ru\["count"\] \+ 1\)/,
    've_chu_tay không đặt chữ trên ĐÚNG đường kẻ của dòng');
  assert.ok(!/v - 0\.012/.test(PY), 'chữ lại lơ lửng giữa hai dòng kẻ');
  // Nhấc bút phải cắt ở MỐC CHẴN — ranh giữa hai chữ cái. Cắt giữa một nét
  // cho ra hai nửa chữ lơ lửng, đọc ra một vệt đứt chứ không ra một lần nhấc.
  assert.match(PY, /cat = 2 \* int\(/, 'nhấc bút cắt giữa một nét chứ ở ranh chữ cái');
  // Và hình học phải đổi THẬT trong tệp: một từ là một nét GẤP KHÚC nhiều
  // đoạn, không một vệt hai đầu. Đếm số `l` trên mỗi `M` của lớp sổ tay.
  const than = lop('so-tay');
  const duong = [...than.matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
  const khuc = duong.join('').split('M').slice(1)
    .map((d) => (d.match(/l/g) || []).length);
  const dai = khuc.filter((n) => n >= 8).length;
  assert.ok(dai >= 40,
    `chỉ ${dai} nét dài ≥ 8 khúc trong lớp sổ tay — chữ tay là những nét GẤP KHÚC, một`
    + ' hàng vệt hai đầu là cái mã vạch quay lại');
});

test('COM-PA có KHỐI: thân thon, hai cạnh khác chất, vệt loé, khớp có bóng riêng', () => {
  const d = ROOM_TOOLS.divider;
  assert.ok(d.taperHi > d.taperLo * 1.5,
    `thân com-pa không thon (${d.taperHi} → ${d.taperLo}) — một thanh đều bề rộng là`
    + ' một cái que, và ba nét song song thì luôn đều bề rộng');
  assert.ok(d.hingeShadowH > ROOM_SHADOW.height.divider,
    'khớp xoay không cao hơn thân — nó dày gấp đôi, và dùng chung một độ cao biểu kiến'
    + ' cho hai vật dày khác nhau là chép một con số sang chỗ nó sai');
  assert.ok(d.specLen > 0 && d.specLen < 1, 'vệt loé phải NGẮN hơn thân, không chạy hết');
  // Thân là một HÌNH TÔ, không ba nét: lớp com-pa phải có `<path fill=` đủ
  // nhiều (thân + 6 dải dốc dọc mỗi chân + đĩa khớp).
  const than = lop('com-pa');
  const to = (than.match(/<path fill="#/g) || []).length;
  assert.ok(to >= 14,
    `lớp com-pa chỉ có ${to} mảng tô — thân thon và dốc dọc của nó là hình TÔ; ba nét`
    + ' song song đã là lời chê "hình kỹ thuật"');
  // …và bóng của com-pa phải có BA vật, không hai: hai chân + đĩa khớp.
  assert.match(PY, /VAT_BONG\.append\(\("com-pa khớp"/,
    'khớp xoay không đổ bóng riêng — một cái đĩa không có bóng của chính nó đọc ra là'
    + ' một chấm sơn trên giấy');
  // Hình CHE phải là ĐÚNG hình được vẽ: `che_boi` đọc `com_pa_quads`, nên một
  // hình che rộng hơn thân thật là một phép đo bỏ qua những nét không hề bị che.
  assert.match(PY, /def com_pa_quads\(\):[\s\S]*?com_pa_than\(a, b\)/,
    'com_pa_quads vẫn dựng hình chữ nhật xấp xỉ thay cho thân thon đã vẽ');
});

test('THƯỚC có BỀ DÀY — một mặt bên, và mô hình cũng biết nó là gỗ hoàng dương', () => {
  const r = ROOM_TOOLS.ruler;
  assert.ok(r.thick > 3, `bề dày ${r.thick} quá mỏng để đọc ra một thanh`);
  assert.ok(r.sideGain > 0 && r.sideGain < 0.6,
    'mặt bên sáng ngang mặt trên — nó quay XUỐNG-TRƯỚC, nó không nhận gì từ một ngọn'
    + ' đèn ở trên-trái');
  // MÉP GẦN LÀ `[0] → [1]`, và chỗ này đã sai một lần: lấy nhầm `[3] → [2]`
  // thì mặt bên tụt xuống từ mép TRÊN, tức nằm ĐÈ LÊN mặt trên của chính cái
  // thước — một dải tối chạy dọc giữa thanh, mà diện tích, tông và bề rộng
  // đều hợp lệ nên không một con số nào kêu.
  assert.match(PY, /a, b = THUOC\[0\], THUOC\[1\]/,
    'mặt bên của thước lại dựng từ mép TRÊN — nó sẽ đè lên mặt trên của chính nó');
  // MÔ HÌNH phải biết mặt bên: nếu chỉ lượt VẼ biết thì `nen_rgb` gọi chỗ ấy
  // là GỖ BÀN trong khi tranh vẽ gỗ hoàng dương — đúng kiểu lệch mô hình ‖
  // tranh mà cả bộ sinh này tồn tại để không mắc.
  assert.match(PY, /elif trong_da_giac\(x, y, THUOC_CANH\)/,
    'nen_rgb không biết mặt bên của thước — mô hình và tranh đang nói hai vật khác nhau');
  assert.match(PY, /z < tt\["thuoc"\] and trong_da_giac\(x, y, THUOC_KHOI\)/,
    'che_boi chỉ biết mặt TRÊN của thước');
  // Và bóng của thước phải tách hai vai: hình ĐỔ BÓNG là mặt trên, hình CHE
  // là cả khối. Gộp một đa giác thì `bong_phu` dìm chính mặt bên — chiều sai
  // ấy đã có tiền lệ: nó kéo một phép đo tương phản từ 5,13 xuống 1,08 : 1.
  assert.match(PY, /\("thước", THUOC, h\["ruler"\], "bong-xa", \(2, 3\), THUOC_KHOI\)/,
    'bóng thước không tách hình ĐỔ BÓNG khỏi hình CHE');
  // Mặt bên phải THẬT SỰ có trong tệp: lớp thước có ít nhất 10 dải tô của nó.
  const than = lop('thuoc');
  const to = (than.match(/<path fill="#/g) || []).length;
  assert.ok(to >= 34,
    `lớp thước chỉ có ${to} mảng tô — 24 dải mặt trên + 10 dải mặt bên là mốc; ít hơn`
    + ' nghĩa là mặt bên lại biến mất');
});

test('số CHẤM lấm tấm của bóng theo CHU VI, không theo số đỉnh khai hình', () => {
  // Bản trước nhân với `len(poly)`, nên một đĩa nhỏ khai bằng 16 đỉnh (khớp
  // com-pa, rộng 8 đơn vị) nhận GẤP BỐN số chấm của cả một trang sổ rộng 250
  // đơn vị. Số đỉnh là một chi tiết DỰNG HÌNH, không một thuộc tính của vật —
  // cùng một vật khai bằng 4 hay 16 đỉnh phải ra cùng một cái bóng. Nó đẩy
  // tệp vượt trần 380 KB ngay lần đầu có một bóng tròn.
  assert.ok(!/stipple"\]\["per"\] \* len\(poly\)/.test(PY),
    'số chấm lấm tấm lại tính theo số ĐỈNH — một bóng tròn sẽ nổ ngân sách');
  assert.match(PY, /cv = sum\(math\.hypot/,
    've_bong không còn tính chu vi hình bóng');
});
