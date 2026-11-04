/**
 * BẢNG LỘ TRÌNH (trang chủ Góc học) — mỗi học phần THẬT một điểm, nhãn đọc được.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: `ROAD` (scene-data.js) từng có 8 điểm kèm câu "khoá
 * thật có ĐÚNG TÁM học phần" — đúng lúc viết, sai từ khi khoá thành 11. engine.js
 * dựng nút bằng `ROAD.map(…MODULES[i]…)` nên M9–M11 BIẾN MẤT không một lời báo.
 * Nhãn lại là tên ĐẦY ĐỦ (20–68 ký tự) đặt tự do, nên đè nhau và tràn mép giấy.
 * Đo trên production defcd68 (1440×900): 3 học phần thiếu điểm, 2 cặp nhãn đè,
 * 4 nhãn tràn khung, nút 7 dưới tờ ghi chú. Sau sửa, đo trong trình duyệt ở 8
 * khổ (390, 820, 1024, 1280, 1366, 1440, 1920, 2560): 0 / 0 / 0 / 0.
 *
 * Các ca dưới canh những tính chất làm nên kết quả đó, đọc từ CHÍNH dữ liệu thật
 * (curricula.json) chứ không từ một danh sách gõ tay — thêm học phần thứ 12 là
 * ca đầu đỏ ngay, thay vì học phần ấy lặng lẽ biến mất khỏi bảng lần nữa.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROAD, ROAD_DOC, nhanLoTrinh } from '../../src/components/goc-hoc/scene-data.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const CURRICULA = JSON.parse(readFileSync(join(FE, 'src', 'lib', 'curricula.json'), 'utf8')).CURRICULA;
const MODULES = CURRICULA.python_advanced.modules;
const ENGINE = readFileSync(join(FE, 'src', 'components', 'goc-hoc', 'engine.js'), 'utf8');

/** Hình học nhãn — PHẢI khớp engine.js: 36/42 lề trên/dưới, 19 cao dòng. */
const LE_TREN = 36, LE_DUOI = 42, CAO_DONG = 19, HOP_DONG = 22;
/** Đỉnh THẤP NHẤT của tờ ghi chú đo được (1280×720), toạ độ viewBox. */
const DINH_GHI_CHU = 324;
const SO_DONG = 3, TOI_DA = 15;

test('mỗi học phần THẬT có đúng một điểm trên bảng', () => {
  assert.ok(MODULES.length >= 1, 'curricula.json không còn học phần nào?');
  assert.equal(
    ROAD.length, MODULES.length,
    `ROAD có ${ROAD.length} điểm cho ${MODULES.length} học phần — engine dựng nút bằng ROAD.map nên `
      + 'học phần thừa ra BIẾN MẤT khỏi bảng, không lỗi nào được ném.',
  );
});

test('nhãn của MỌI học phần thật: không rỗng, ≤ 3 dòng, mỗi dòng ≤ 15 ký tự (+ "…")', () => {
  for (const m of MODULES) {
    const dong = nhanLoTrinh(m.title);
    assert.ok(dong.length >= 1 && dong.length <= SO_DONG, `${m.title}: ${dong.length} dòng`);
    for (const d of dong) {
      const dai = d.replace(/…$/, '').length;
      assert.ok(d.trim().length > 0, `${m.title}: có dòng rỗng`);
      // Một TỪ dài hơn trần thì vẫn phải đứng một mình — không cắt giữa từ.
      if (d.includes(' ')) assert.ok(dai <= TOI_DA, `${m.title}: dòng "${d}" dài ${dai} > ${TOI_DA}`);
    }
    assert.ok(!/^M\d+/.test(dong[0]), `${m.title}: nhãn còn mã "M…" — số đã nằm trong vòng tròn`);
  }
});

test('mọi điểm và hộp nhãn nằm trong khung 1000×600 và ở TRÊN tờ ghi chú', () => {
  for (const [i, p] of ROAD.entries()) {
    const [x, y] = p.at;
    assert.ok(x >= 75 && x <= 925, `điểm ${i + 1} ở x = ${x}: nhãn rộng ~150 sẽ tràn mép giấy`);
    if (p.nhan === 'tren') {
      const dinh = y - LE_TREN - (SO_DONG - 1) * CAO_DONG - HOP_DONG;
      assert.ok(dinh >= 0, `điểm ${i + 1}: nhãn 3 dòng tràn mép TRÊN (đỉnh ${dinh})`);
    } else {
      assert.equal(p.nhan, 'duoi', `điểm ${i + 1}: nhan phải là 'tren' hoặc 'duoi'`);
      // +18: hộp dòng của phông tay (Segoe Print) sâu hơn phần chân chữ — đo trong
      // trình duyệt: tầng dưới ở 230 vẫn chạm tờ ghi chú ở 1280×720, ở 220 thì không.
      const day = y + LE_DUOI + (SO_DONG - 1) * CAO_DONG + 18;
      assert.ok(day < DINH_GHI_CHU, `điểm ${i + 1}: nhãn 3 dòng xuống tới y ${day} — chạm tờ ghi chú (đỉnh ${DINH_GHI_CHU})`);
    }
  }
});

test('hai nhãn CÙNG TẦNG đủ xa để không chồng (≥ 150 đơn vị)', () => {
  for (const tang of ['tren', 'duoi']) {
    const xs = ROAD.filter((p) => p.nhan === tang).map((p) => p.at[0]).sort((a, b) => a - b);
    for (let k = 1; k < xs.length; k++) {
      assert.ok(xs[k] - xs[k - 1] >= 150, `tầng ${tang}: hai điểm cách ${xs[k] - xs[k - 1]} < 150`);
    }
  }
  // Tầng xen kẽ ⇒ mọi đường nối đều CHÉO giữa hai tầng, không chạy ngang qua nhãn.
  for (let k = 1; k < ROAD.length; k++) {
    assert.notEqual(ROAD[k].nhan, ROAD[k - 1].nhan, `điểm ${k} và ${k + 1} cùng tầng — đường nối sẽ cắt qua nhãn`);
  }
});

test('engine dùng nhãn ngắn và giữ TÊN ĐẦY ĐỦ trong <title>', () => {
  assert.match(ENGINE, /nhanLoTrinh\(m\.name\)/, 'engine không còn dựng nhãn bằng nhanLoTrinh.');
  assert.match(ENGINE, /<title>\$\{esc\(m\.name\)\}<\/title>/, 'thiếu <title> tên đầy đủ — người dùng mất phần bị cắt "…".');
  assert.ok(ENGINE.includes(`p.at[1] - ${LE_TREN} - (dong.length-1)*${CAO_DONG}`) && ENGINE.includes(`p.at[1] + ${LE_DUOI}`),
    'Lề nhãn trong engine đã đổi — sửa hằng LE_TREN/LE_DUOI/CAO_DONG của ca này cho khớp.');
});

// ---------------------------------------------------------------------------
// BẢNG DỌC cho điện thoại (L.mobile, ≤ 820px) — khung 600 × 1000.
//
// Khung ngang nhét vào màn dọc 390px co còn 0,30: đo trên production 87df502,
// nhãn ra 5,1px, số trong vòng 4,8px, 69% tờ giấy trống, và tờ giấy cao 564px
// thò hẳn ra khỏi bảng ghim cao 258px. Bảng dọc đo được: nhãn 13,2 / 14,4 /
// 16 / 19,3 px ở 360 / 390 / 430 / 820; giấy nằm trong bảng; 0 đè / 0 tràn.
// ---------------------------------------------------------------------------
const DOC_COT = 190, DOC_RONG = 600, DOC_CAO = 1000, DOC_KY_TU = 22, DOC_DONG = 2;
/** Bề rộng ước của một ký tự phông tay 28 đơn vị (Segoe Print ~0,55em). */
const DOC_KY_TU_RONG = 15.4;

test('bảng DỌC: mỗi học phần thật một điểm', () => {
  assert.equal(ROAD_DOC.length, MODULES.length,
    `ROAD_DOC có ${ROAD_DOC.length} điểm cho ${MODULES.length} học phần — trên điện thoại học phần thừa sẽ biến mất.`);
});

test('bảng DỌC: nhãn mọi học phần ≤ 2 dòng × 22 ký tự và vừa cột phải', () => {
  for (const m of MODULES) {
    const dong = nhanLoTrinh(m.title, DOC_KY_TU, DOC_DONG);
    assert.ok(dong.length >= 1 && dong.length <= DOC_DONG, `${m.title}: ${dong.length} dòng`);
    for (const d of dong) {
      const dai = d.length;
      assert.ok(dai <= DOC_KY_TU + 1, `${m.title}: dòng "${d}" dài ${dai}`);
      assert.ok(DOC_COT + dai * DOC_KY_TU_RONG <= DOC_RONG, `${m.title}: dòng "${d}" tràn mép phải (≈ ${Math.round(DOC_COT + dai * DOC_KY_TU_RONG)})`);
    }
  }
});

test('bảng DỌC: điểm trong khung, đi TỪ TRÊN XUỐNG, đủ chỗ hai dòng nhãn mỗi bước', () => {
  for (const [i, p] of ROAD_DOC.entries()) {
    const [x, y] = p.at;
    assert.ok(x - 36 >= 0 && x + 36 < DOC_COT, `điểm ${i + 1}: x = ${x} — vòng "đang học" (r 36) phải nằm trái cột nhãn ${DOC_COT}`);
    assert.ok(y - 36 >= 0 && y + 36 <= DOC_CAO, `điểm ${i + 1}: y = ${y} ra ngoài khung 1000`);
    if (i) assert.ok(y - ROAD_DOC[i - 1].at[1] >= 80, `điểm ${i} → ${i + 1}: bước dọc ${y - ROAD_DOC[i - 1].at[1]} < 80 — hai dòng nhãn (cao 32) sẽ chạm nhau`);
  }
});

test('engine CHỌN bảng dọc khi L.mobile, và CSS có cỡ chữ riêng cho nó', () => {
  assert.match(ENGINE, /const doc = L\.mobile, R = doc \? ROAD_DOC : ROAD;/, 'engine không còn chọn ROAD_DOC trên điện thoại.');
  assert.match(ENGINE, /viewBox="\$\{doc\?'0 0 600 1000':'0 0 1000 600'\}"/, 'khung SVG không còn đổi theo bảng dọc/ngang.');
  assert.ok(ENGINE.includes(`nhanLoTrinh(m.name, ${DOC_KY_TU}, ${DOC_DONG})`), 'nhãn bảng dọc không còn 22 ký tự × 2 dòng — sửa ca này cho khớp.');
  const css = readFileSync(join(FE, 'src', 'components', 'goc-hoc', 'scene.css'), 'utf8');
  assert.match(css, /\.paper\.doc \.node text\{font-size:28px\}/, 'thiếu cỡ chữ 28 cho nhãn bảng dọc.');
});
