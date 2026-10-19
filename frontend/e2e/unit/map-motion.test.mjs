// LỚP CHUYỂN ĐỘNG của bản đồ thế giới — `src/lib/map-motion.ts`,
// `src/app/map-motion.module.css`, `src/app/MapMotion.tsx`.
//
// Bộ này canh SÁU bất biến. Mỗi bất biến có ít nhất một ca trượt khi gỡ bản
// sửa, và ghi ngay cạnh nó:
//
//  1. CỬA CHẠY. Bề rộng xét TRƯỚC `prefers-reduced-motion`. Đảo hai nhánh thì
//     người xin giảm chuyển động, trên điện thoại, nhận một lớp phủ đặt theo
//     khung 1360 × 820 đè lên bố cục dọc — tức bản đồ hỏng. Và mốc 1100 phải
//     trùng ba chỗ: hằng TS, `@container` của lớp chuyển động, `@container` của
//     `world-map.module.css`.
//  2. PARALLAX MANG THÔNG TIN. Hệ số phải GIẢM NGHIÊM NGẶT theo độ sâu (vách
//     gần đi nhanh hơn vách xa — không có điều đó thì bốn lớp dịch bằng nhau và
//     parallax không nói gì), gốc 0 phải ở GIỮA khung nhìn (trạng thái nghỉ =
//     trạng thái cuối), và biên độ phải bị chặn trần.
//  3. KHÔNG VÒNG LẶP VÔ HẠN, và mọi hoạt ảnh tự khởi động xong DƯỚI NĂM GIÂY
//     kể cả độ trễ. Đây là điều kiện (b) của WCAG 2.2.2 (Pause, Stop, Hide —
//     mức A): quá năm giây là phải có nút Dừng. Repo đã trả giá một lần cho
//     đúng điều khoản này (`figure-motion.ts`).
//  4. KHÔNG VẼ LẠI ẢNH NỀN. CSS của lớp chuyển động không được chạm `.decor`,
//     không được mang `background-image: url(...)`, và mọi thuộc tính chạy
//     trong `@keyframes` phải nằm trong {transform, opacity, stroke-dashoffset}.
//  5. KHỚP VỚI TRANH. Màu, bốn mép dải, ba hộp kết cấu và năm đường giếng đều
//     phải khớp nguồn thật — và khớp bằng cách KHÔNG chép, đọc thẳng
//     sáng ở chỗ tranh tối, hoặc sợi sáng chạy cạnh giếng chứ không trong giếng.
//  6. KHÔNG CHẮN CÚ BẤM, KHÔNG SSR INLINE STYLE. Bản đồ là lối đi chính vào
//     khoá học.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BAND_BLEED_Y,
  BAND_DEPTH,
  bandFootY,
  bandHeadY,
  LAKE_REGION,
  MAX_AUTO_MOTION_MS,
  MOTION_BANDS,
  MOTION_FRAME,
  MOTION_MIN_WIDTH_PX,
  MOTION_PALETTE,
  MOTION_VAR,
  motionAnimates,
  motionMode,
  motionVars,
  motionVisible,
  nearestWellX,
  PARALLAX_MAX_PX,
  PASS_DELAY_MS,
  PASS_MS,
  parallaxShift,
  passTotalMs,
  SEEP_REGION,
  shaftBox,
  THREAD_DURATION_MS,
  THREAD_LEAD_MS,
  THREAD_PATH_LENGTH,
  THREAD_STAGGER_MS,
  threadDelayMs,
  threadTotalMs,
  veilBox,
  veilFactor,
  viewProgress,
} from '../../src/lib/map-motion.ts';

const doc = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const CSS = doc('../../src/app/map-motion.module.css');
const TSX = doc('../../src/app/MapMotion.tsx');
const WORLD_MAP_CSS = doc('../../src/app/world-map.module.css');
const WORLD_MAP_TS = doc('../../src/lib/world-map.ts');
const WORLD_MAP_TSX = doc('../../src/app/WorldMap.tsx');

/** Một khung nhìn giả: bản đồ cao `mapHeight`, mép trên ở `mapTop`. */
function view(mapTop, mapHeight = 800, viewHeight = 900) {
  return { mapTop, mapHeight, viewHeight };
}

/**
 * Lấy thân của mọi khối `@keyframes`, cắt theo ngoặc CÂN BẰNG.
 *
 * Vì sao không dùng một regex: thân `@keyframes` có ngoặc lồng (mỗi mốc `from`/
 * `to` là một khối con), nên `\{[^}]*\}` cắt sai ở ngoặc đóng đầu tiên và bài
 * kiểm "chỉ chạy transform/opacity" sẽ bỏ qua gần hết nội dung — một ca test
 * xanh vì nó không đọc gì.
 */
function keyframeBlocks(css) {
  const out = [];
  let at = 0;
  for (;;) {
    const start = css.indexOf('@keyframes', at);
    if (start < 0) break;
    const open = css.indexOf('{', start);
    if (open < 0) break;
    let depth = 0;
    let i = open;
    for (; i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    out.push({
      name: css.slice(start + '@keyframes'.length, open).trim(),
      body: css.slice(open + 1, i),
    });
    at = i + 1;
  }
  return out;
}

/** Bỏ mọi chú thích /* … *\/ — chú thích tiếng Việt ở đây nhắc tên thuộc tính
 *  và tên lớp, nên quét trên bản còn chú thích là quét ra lỗi giả. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/**
 * Bỏ chú thích của một file TS/TSX.
 *
 * Cần hẳn một hàm vì chú thích ở đây NHẮC TÊN thứ đang bị cấm — câu "không đặt
 * bằng `style={{…}}`" nằm trong chính chú thích của `MapMotion.tsx`, nên quét
 * trên bản còn chú thích là ca test tự tố cáo bản sửa của nó. Đã trượt một lượt
 * vì đúng chuyện này.
 */
function stripTs(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

const CSS_CODE = stripComments(CSS);
const TSX_CODE = stripTs(TSX);

// ════════════════════════════════════════════════════════════════════════
// 1 · CỬA CHẠY
// ════════════════════════════════════════════════════════════════════════

test('khối hẹp + xin giảm chuyển động ⇒ off, KHÔNG phải still', () => {
  // Ca bắt lỗi của bất biến 1. Đảo hai nhánh trong `motionMode` (xét `reduced`
  // trước `width`) thì ca này trượt — và cái nó cứu là: ở bố cục hẹp, `.decor`
  // bị `display:none` và mỗi dải thành một khối ngang, nên một lớp phủ định vị
  // theo khung 1360 × 820 nằm SAI CHỖ, không chỉ là "nặng".
  assert.equal(motionMode({ reduced: true, width: 900 }), 'off');
  assert.equal(motionMode({ reduced: false, width: 900 }), 'off');
  // Và ngược lại: khối rộng + xin giảm chuyển động thì lớp vẫn HIỆN, chỉ không
  // chạy. "Bản đồ vẫn đầy đủ" là yêu cầu, không phải "bản đồ biến mất".
  assert.equal(motionMode({ reduced: true, width: 1400 }), 'still');
  assert.equal(motionMode({ reduced: false, width: 1400 }), 'on');
});

test('mốc 1100 đúng ở hai bên biên, và bề rộng rác ⇒ off', () => {
  assert.equal(motionMode({ reduced: false, width: MOTION_MIN_WIDTH_PX - 1 }), 'off');
  assert.equal(motionMode({ reduced: false, width: MOTION_MIN_WIDTH_PX }), 'on');
  // `clientWidth` của một phần tử chưa gắn vào DOM là 0; NaN thì không so sánh
  // được nên `<` trả false và nhánh dưới sẽ cho 'on' nếu thiếu `isFinite`.
  assert.equal(motionMode({ reduced: false, width: 0 }), 'off');
  assert.equal(motionMode({ reduced: false, width: Number.NaN }), 'off');
});

test('mốc gãy trùng cả BA chỗ: hằng TS, CSS lớp chuyển động, CSS bản đồ', () => {
  // Ca bắt lỗi: đổi `@container (max-width: 1099px)` ở một trong hai file CSS
  // mà quên hằng TS thì có một khoảng bề rộng mà JS gắn listener cuộn cho một
  // lớp mà CSS đang `display: none` — chuyển động vô hình, tốn một lượt layout
  // mỗi khung hình. Regex viết bằng `String.raw`: `\d` trong template literal
  // thường là một bẫy đã trả giá trong repo này.
  const q = new RegExp(String.raw`@container \(max-width: (\d+)px\)`);
  const mine = CSS_CODE.match(q);
  const theirs = WORLD_MAP_CSS.match(q);
  assert.ok(mine, 'map-motion.module.css phải tự tắt bằng @container');
  assert.ok(theirs, 'world-map.module.css phải còn mốc @container của bản hẹp');
  assert.equal(Number(mine[1]), MOTION_MIN_WIDTH_PX - 1);
  assert.equal(Number(theirs[1]), MOTION_MIN_WIDTH_PX - 1);
});

test('ba chế độ đọc ra đúng hai câu hỏi: có hiện không, có chạy không', () => {
  assert.equal(motionVisible('off'), false);
  assert.equal(motionVisible('still'), true);
  assert.equal(motionVisible('on'), true);
  // `still` HIỆN mà KHÔNG chạy — nếu `motionAnimates('still')` thành true thì
  // người xin giảm chuyển động nhận cả listener cuộn lẫn parallax.
  assert.equal(motionAnimates('still'), false);
  assert.equal(motionAnimates('on'), true);
  assert.equal(motionAnimates('off'), false);
});

test('lớp không mang data-map-motion thì CSS ẩn hẳn', () => {
  // Trạng thái lúc chưa có JS (SSR, JS lỗi, tắt JS): markup đã có 11 phần tử
  // nhưng chúng chưa có hộp nào. Thiếu quy tắc này thì chúng là mấy mảng dán ở
  // góc trên-trái bản đồ.
  assert.match(CSS_CODE, /\.motion:not\(\[data-map-motion\]\)\s*\{\s*display:\s*none/);
  assert.match(TSX, /removeAttribute\('data-map-motion'\)/);
});

// ════════════════════════════════════════════════════════════════════════
// 2 · PARALLAX MANG THÔNG TIN
// ════════════════════════════════════════════════════════════════════════

test('bốn dải có bốn độ sâu TĂNG nghiêm ngặt, mặt đất gần nhất', () => {
  // Chiều này là một khẳng định về bức tranh, không phải sở thích: người xem
  // đứng ở MIỆNG vực nhìn vào, nên mép trên của vết cắt gần mắt nhất và đáy
  // vực là điểm xa nhất trên đường ngắm.
  const depths = MOTION_BANDS.map((b) => BAND_DEPTH[b]);
  assert.equal(depths[0], 0);
  assert.equal(depths[depths.length - 1], 1);
  for (let i = 1; i < depths.length; i += 1) {
    assert.ok(depths[i] > depths[i - 1], `độ sâu phải tăng: ${MOTION_BANDS[i]}`);
  }
});

test('hệ số dịch GIẢM nghiêm ngặt theo độ sâu, và bị kẹp trong [0,1]', () => {
  // Ca bắt lỗi chính của bất biến 2. `veilFactor` trả về một hằng (ví dụ ai đó
  // "đơn giản hoá" thành `return 1`) thì bốn lớp dịch BẰNG NHAU — và bốn lớp
  // dịch bằng nhau không phải parallax, nó là cả lớp phủ bị kéo lệch. Không có
  // ca này thì lỗi đó không có cách nào lộ ra: hình vẫn chạy, chỉ không nói gì.
  const factors = MOTION_BANDS.map((b) => veilFactor(BAND_DEPTH[b]));
  for (let i = 1; i < factors.length; i += 1) {
    assert.ok(factors[i] < factors[i - 1], `hệ số phải giảm theo độ sâu ở ${MOTION_BANDS[i]}`);
  }
  assert.equal(veilFactor(0), 1);
  assert.equal(veilFactor(1), 0);
  // Kẹp hai đầu: `getBoundingClientRect` cho số lạ ở lúc đang đổi khổ.
  assert.equal(veilFactor(-5), 1);
  assert.equal(veilFactor(9), 0);
  assert.equal(veilFactor(Number.NaN), 0);
});

test('bản đồ ở GIỮA khung nhìn ⇒ dịch bằng 0 (trạng thái nghỉ = trạng thái cuối)', () => {
  // Ca bắt lỗi: bỏ phép đưa về tâm (`progress * 2 - 1`) thì ở giữa khung nhìn
  // lớp đang bị kéo lệch nửa biên độ, nên lúc người ta DỪNG CUỘN để đọc nhãn
  // thì lớp phủ đứng ở một chỗ không phải trạng thái nghỉ của CSS — và một
  // `cancel()` hay một lượt tháo component sẽ làm nó NHẢY về 0.
  // Giữa khung nhìn: mapTop sao cho progress = 0.5.
  const mapHeight = 800;
  const viewHeight = 900;
  const span = viewHeight + mapHeight;
  const mapTop = viewHeight - span * 0.5;
  assert.equal(viewProgress(view(mapTop, mapHeight, viewHeight)), 0.5);
  for (const band of MOTION_BANDS) {
    assert.equal(parallaxShift(view(mapTop, mapHeight, viewHeight), BAND_DEPTH[band]), 0);
  }
});

test('cuộn xuống ⇒ lớp GẦN đi lên nhiều hơn lớp xa, và lớp xa nhất đứng im', () => {
  // Đây là chính câu "chuyển động mang thông tin": nếu dấu bị đảo thì lớp gần
  // đi NGƯỢC chiều cuộn và mắt đọc ra một không gian LỘN NGƯỢC — cùng loại lỗi
  // với `pseudoscopic inversion` mà `ky-thuat-ban-do.md` mục 3 gọi là luật.
  const v = view(-200); // bản đồ đã trôi lên quá giữa ⇒ progress > 0.5
  assert.ok(viewProgress(v) > 0.5);
  const surface = parallaxShift(v, BAND_DEPTH.surface);
  const shallow = parallaxShift(v, BAND_DEPTH.shallow);
  const deep = parallaxShift(v, BAND_DEPTH.deep);
  const floor = parallaxShift(v, BAND_DEPTH.floor);
  assert.ok(surface < 0, 'cuộn xuống thì lớp gần phải đi LÊN (âm)');
  assert.ok(surface < shallow && shallow < deep && deep < floor, 'phải so le theo độ sâu');
  // Tranh là lớp xa nhất với hệ số 0; màn khí của dải đáy cũng 0, nên nó dán
  // vào tranh. Khác 0 là đáy vực trôi so với chính vách của nó.
  assert.equal(floor, 0);
});

test('biên độ bị chặn trần ±PARALLAX_MAX_PX ở mọi vị trí cuộn', () => {
  // Ca bắt lỗi: bỏ kẹp trong `viewProgress` thì ở đầu/cuối một trang chủ dài,
  // `mapTop` lớn hơn mọi giới hạn và biên độ chạy tới hàng trăm px — đúng thứ
  // W3C gọi là nguyên nhân choáng/nôn ở người có rối loạn tiền đình (WCAG
  // 2.3.3). 12px là trần có chủ ý, không phải một hệ quả tình cờ.
  for (const top of [-99999, -4000, -800, 0, 450, 900, 5000, 99999]) {
    for (const band of MOTION_BANDS) {
      const px = parallaxShift(view(top), BAND_DEPTH[band]);
      assert.ok(Math.abs(px) <= PARALLAX_MAX_PX + 1e-9, `|${px}| vượt trần ở ${band}/${top}`);
    }
  }
  assert.ok(PARALLAX_MAX_PX <= 16, 'biên độ parallax phải nhỏ — đây là trang để bắt đầu học');
});

test('bản đồ cao hơn khung nhìn thì tiến trình vẫn trong [0,1]', () => {
  // Mẫu số phải là `viewHeight + mapHeight`. Đổi thành `viewHeight` thì bản đồ
  // cao hơn khung nhìn cho tiến trình > 1 ngay lúc vừa hiện ra, tức lớp phủ
  // dính ở biên suốt cả lượt cuộn và parallax chết — mà không ai thấy lỗi.
  const tall = { mapTop: -100, mapHeight: 2400, viewHeight: 700 };
  const p = viewProgress(tall);
  assert.ok(p > 0 && p < 1, `tiến trình ${p} phải nằm hẳn trong khoảng`);
  // Và đúng hai đầu mút của định nghĩa.
  assert.equal(viewProgress({ mapTop: 700, mapHeight: 2400, viewHeight: 700 }), 0);
  assert.equal(viewProgress({ mapTop: -2400, mapHeight: 2400, viewHeight: 700 }), 1);
  // Khung nhìn rỗng (SSR, tab ẩn) ⇒ về giữa, tức về trạng thái nghỉ.
  assert.equal(viewProgress({ mapTop: 0, mapHeight: 0, viewHeight: 0 }), 0.5);
});

// ════════════════════════════════════════════════════════════════════════
// 3 · KHÔNG VÒNG LẶP VÔ HẠN — WCAG 2.2.2
// ════════════════════════════════════════════════════════════════════════

test('CSS không có một `infinite` nào', () => {
  // Ca bắt lỗi của bất biến 3. Thêm `infinite` cho cột bụi là nợ lại một nút
  // Dừng trên TRANG CHỦ (WCAG 2.2.2 mức A), đúng món nợ mà `figure-motion.ts`
  // đã phải trả bằng cách dựng lại 23 file SVG thành Blob.
  assert.ok(!/infinite/.test(CSS_CODE), 'lớp chuyển động không được lặp vô hạn');
  assert.ok(!/animation-iteration-count/.test(CSS_CODE));
});

test('MỌI hoạt ảnh tự khởi động xong dưới năm giây, TÍNH CẢ độ trễ', () => {
  // Tính cả độ trễ là chỗ dễ sai: WCAG 2.2.2 đo trang còn động bao lâu, nên
  // một lớp trễ 3s rồi chạy 4s là một trang còn động ở giây thứ 7. Nâng bất kỳ
  // `PASS_MS` nào lên quá mức là trượt ngay ở đây, trước khi nó thành một nút
  // Dừng phải thêm vào trang chủ.
  for (const layer of Object.keys(PASS_MS)) {
    const total = passTotalMs(layer);
    assert.equal(total, PASS_DELAY_MS[layer] + PASS_MS[layer]);
    assert.ok(total < MAX_AUTO_MOTION_MS, `${layer}: ${total}ms ≥ ${MAX_AUTO_MOTION_MS}ms`);
  }
  // Năm sợi sáng: trễ 450 + 4 × 110 + 900 = 1790ms.
  assert.ok(threadTotalMs(5) < MAX_AUTO_MOTION_MS, `năm sợi: ${threadTotalMs(5)}ms`);
  assert.equal(MAX_AUTO_MOTION_MS, 5000);
});

test('thời lượng trong CSS khớp từng con số trong TS', () => {
  // Hai nguồn sự thật cho cùng một thời lượng là chỗ chúng lệch nhau — và lệch
  // ở đây nghĩa là ca test "dưới năm giây" ở trên canh một con số mà trình
  // duyệt không dùng.
  for (const [layer, ms] of Object.entries(PASS_MS)) {
    assert.ok(
      CSS_CODE.includes(`${ms}ms`),
      `CSS phải mang thời lượng ${ms}ms của lớp ${layer}`,
    );
  }
  for (const ms of Object.values(PASS_DELAY_MS)) {
    assert.ok(CSS_CODE.includes(`${ms}ms`), `CSS phải mang độ trễ ${ms}ms`);
  }
  assert.ok(CSS_CODE.includes(`${THREAD_DURATION_MS}ms`), 'CSS phải mang thời lượng sợi sáng');
});

test('độ trễ năm sợi so le tăng dần, và vào SAU khi nền hiện xong', () => {
  const delays = [0, 1, 2, 3, 4].map(threadDelayMs);
  for (let i = 1; i < delays.length; i += 1) {
    assert.ok(delays[i] > delays[i - 1], 'sợi phải so le, không vẽ cùng lúc');
  }
  // 450ms = `decorStep` của `world-map.ts`: sợi không được vẽ trên một bức tranh
  // còn đang mờ dần vào.
  assert.equal(delays[0], THREAD_LEAD_MS);
  assert.match(WORLD_MAP_TS, /duration:\s*450/, 'decorStep vẫn phải là 450ms');
  // Đầu vào rác về mốc an toàn, không ra NaN (một `animation-delay: NaNms` là
  // một hoạt ảnh không bao giờ chạy).
  assert.equal(threadDelayMs(-1), THREAD_LEAD_MS);
  assert.equal(threadDelayMs(1.5), THREAD_LEAD_MS);
  assert.equal(threadTotalMs(0), 0);
});

test('nhánh prefers-reduced-motion trong CSS tắt hết và về trạng thái cuối', () => {
  // Lưới an toàn thứ hai. Cửa chính là `motionMode` bằng JS, nhưng nó không che
  // được hai khe: người đổi tuỳ chọn hệ điều hành GIỮA lúc hoạt ảnh một-lượt
  // đang chạy, và khoảng giữa render đầu của SSR và lúc effect kịp chạy.
  const at = CSS_CODE.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(at > 0, 'phải có nhánh giảm chuyển động');
  const block = CSS_CODE.slice(at, at + 700);
  assert.match(block, /animation:\s*none\s*!important/);
  assert.match(block, /transform:\s*translate3d\(0,\s*0,\s*0\)\s*!important/);
  assert.match(block, /stroke-dashoffset:\s*0\s*!important/);
  // Và hook sẵn có phải được dùng, không dò `matchMedia` lần nữa.
  assert.match(TSX_CODE, /usePrefersReducedMotion/);
  assert.ok(!/matchMedia/.test(TSX_CODE), 'đọc prefers-reduced-motion qua hook, không tự dò');
});

// ════════════════════════════════════════════════════════════════════════
// 4 · KHÔNG VẼ LẠI ẢNH NỀN
// ════════════════════════════════════════════════════════════════════════

test('@keyframes chỉ chạy transform / opacity / stroke-dashoffset', () => {
  // Ca bắt lỗi quan trọng nhất của bất biến 4. Đổi một `@keyframes` sang
  // `background-position` (cách "hiển nhiên" để cho bụi rơi) là buộc trình duyệt
  // VẼ LẠI vùng đó mỗi khung hình; làm thế trên một lớp phủ cỡ cả bản đồ, chồng
  // lên một ảnh nền 877 KB, là đúng cái giá mà `figure-motion.ts` đã đo được:
  // UpdateLayoutTree 796ms / 1 084 lần trong một trace 10,5 giây.
  const allow = new Set(['transform', 'opacity', 'stroke-dashoffset']);
  const blocks = keyframeBlocks(CSS_CODE);
  assert.ok(blocks.length >= 3, `phải có ít nhất 3 khối @keyframes, thấy ${blocks.length}`);
  for (const { name, body } of blocks) {
    const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
    assert.ok(props.length > 0, `@keyframes ${name} rỗng`);
    for (const p of props) {
      assert.ok(allow.has(p), `@keyframes ${name} chạy '${p}' — chỉ được ${[...allow].join('/')}`);
    }
  }
});

test('lớp chuyển động không chạm `.decor` và không tải thêm ảnh nào', () => {
  // `.decor` mang ảnh nền 877 KB. Đặt `transform` lên nó là nhấc cả texture đó
  // thành một lớp hợp ảnh riêng trên GPU; đổi `background-position` của nó là
  // vẽ lại 877 KB mỗi khung hình. Và một `url(...)` ở đây là một lượt tải nữa
  // cho một trang chủ đã mang 877 KB tranh.
  assert.ok(!/decor/.test(CSS_CODE), 'CSS lớp chuyển động không được nhắc .decor');
  assert.ok(!/\burl\(/.test(CSS_CODE), 'lớp chuyển động vẽ bằng gradient, không tải ảnh');
  assert.ok(!/decor/.test(TSX_CODE), 'MapMotion không được chạm .decor');
  // Và chính `world-map.module.css` phải còn giữ hai dòng mà hợp đồng dựa vào:
  // tranh căng đúng khung, khung đúng tỉ lệ 1360/820.
  assert.match(WORLD_MAP_CSS, /background-size:\s*100%\s*100%/);
  assert.match(WORLD_MAP_CSS, /aspect-ratio:\s*1360\s*\/\s*820/);
});

test('`will-change` chỉ đặt cho bốn màn khí, và chỉ ở nhánh đang chạy', () => {
  // Mỗi lớp được nhấc lên là một texture nữa phải giữ trên GPU. Bốn màn khí là
  // bốn phần tử DUY NHẤT bị JS đổi transform mỗi khung hình khi cuộn; khai
  // `will-change` cho cả lớp phủ là trả tiền bộ nhớ cho mười một phần tử.
  const hits = [...CSS_CODE.matchAll(/will-change:\s*([a-z-]+)/g)].map((m) => m[0]);
  for (const hit of hits) {
    const at = CSS_CODE.indexOf(hit);
    const rule = CSS_CODE.slice(Math.max(0, at - 220), at);
    assert.ok(
      /will-change:\s*auto/.test(hit) || /data-map-motion='on'/.test(rule),
      `${hit} phải nằm trong nhánh [data-map-motion='on']`,
    );
  }
  assert.ok(hits.length >= 1, 'bốn màn khí cần một khai will-change');
});

test('CSS không mang mã màu, và cũng không mang token --ds-*', () => {
  // Lý do thứ hai mới là lý do thật: bức tranh là một file SVG cố định, màu của
  // nó KHÔNG đổi theo chế độ tối (`MAP_PALETTE.paper` có chú thích đúng về việc
  // này). Lấy `--ds-paper` cho cột sáng thì ở chế độ tối cột sáng thành cột MỰC.
  assert.ok(!/#[0-9a-fA-F]{3,8}/.test(CSS_CODE), 'không mã màu hex trong *.module.css');
  assert.ok(!/--ds-/.test(CSS_CODE), 'lớp phủ tranh phải đứng NGOÀI chế độ tối, như tranh');
  // Bốn màu đi qua bốn thuộc tính tuỳ biến, và CSS phải có dự phòng vô hình để
  // lúc JS chưa chạy nó không là mấy mảng đen.
  for (const name of Object.values(MOTION_VAR)) {
    assert.ok(CSS_CODE.includes(name), `CSS phải dùng ${name}`);
    assert.ok(
      new RegExp(String.raw`${name}:\s*transparent`).test(CSS_CODE),
      `${name} phải dự phòng 'transparent'`,
    );
  }
});

// ════════════════════════════════════════════════════════════════════════
// 5 · KHỚP VỚI TRANH
// ════════════════════════════════════════════════════════════════════════

test('khung và bốn dải khớp `world-map.ts`', () => {
  assert.match(
    WORLD_MAP_TS,
    new RegExp(
      String.raw`MAP_FRAME = \{ width: ${MOTION_FRAME.width}, height: ${MOTION_FRAME.height} \}`,
    ),
  );
  const bands = WORLD_MAP_TS.match(/BANDS: readonly BandId\[\] = \[([^\]]+)\]/);
  assert.ok(bands, 'world-map.ts phải còn export BANDS');
  const theirs = [...bands[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  assert.deepEqual([...MOTION_BANDS], theirs, 'bốn dải phải cùng tên và cùng THỨ TỰ');
});

test('`map-motion.ts` KHÔNG chép một toạ độ nào của bức tranh', () => {
  // Ca bắt lỗi của bài học đắt nhất phiên này. Bản đầu giữ hai bản sao đồng bộ
  // tay — `BAND_TOP_Y` (bốn mép địa tầng, đọc từ thân `horizon()`/`y_*()` của
  // `build_map.py`) và hai hộp nước đã tính sẵn. CẢ HAI chết trong vòng hai
  // giờ: agent vẽ tranh dời địa tầng 238/390/528/710 → 128/378/508/716 và dời
  // hộp M4 `[470,370,420,130]` → `[470,362,420,150]`, ngay trong cùng buổi
  // chiều. Sửa lại bốn con số là sửa triệu chứng; bản này bỏ hẳn hai bản sao.
  //
  // Nên ca này KHÔNG so số nữa — nó canh đúng cái không được quay lại: một dãy
  // ≥ 3 chữ số trong `map-motion.ts` mà không phải một con số của chính lớp
  // chuyển động (thời lượng ms, khung 1360 × 820, mốc 1100px).
  const LIB = stripTs(doc('../../src/lib/map-motion.ts'));
  const mine = new Set([
    String(MOTION_FRAME.width),
    String(MOTION_FRAME.height),
    String(MOTION_MIN_WIDTH_PX),
    String(MOTION_MIN_WIDTH_PX - 1),
    String(MAX_AUTO_MOTION_MS),
    String(THREAD_DURATION_MS),
    String(THREAD_LEAD_MS),
    String(THREAD_STAGGER_MS),
    // `pathLength="100"` và mẫu số phần trăm — cả hai là 100.
    String(THREAD_PATH_LENGTH),
    '100',
    // Hệ số làm tròn ba chữ số thập phân của `boxToPercent`.
    '1000',
    ...Object.values(PASS_MS).map(String),
    ...Object.values(PASS_DELAY_MS).map(String),
  ]);
  const found = [...LIB.matchAll(/\b(\d{3,})\b/g)].map((m) => m[1]).filter((n) => !mine.has(n));
  assert.deepEqual(found, [], `số lạ trong map-motion.ts — có phải toạ độ của tranh? ${found}`);
  // Và hai hàm suy mốc y phải nhận MẢNG làm đối số, tức không import gì.
  assert.ok(!/world-map/.test(LIB), 'map-motion.ts không được import world-map.ts');
  assert.ok(!/^import /m.test(LIB), 'map-motion.ts phải thuần, không import gì');
});

test('hai hàm suy mốc y đọc đúng chân và đỉnh của một dải', () => {
  // `bandFootY` suy MẶT ĐẤT từ chân ba công trình mặt đất, `bandHeadY` suy chỗ
  // ánh sáng đã tắt từ đỉnh ba gian dải sâu. Nhờ hai hàm này mà cột bụi không
  // cần biết `horizon()` của Python.
  const fake = [
    { band: 'surface', box: [0, 0, 10, 100] },
    { band: 'surface', box: [20, 30, 10, 90] }, // chân = 120, cao nhất
    { band: 'deep', box: [0, 500, 10, 40] },
    { band: 'deep', box: [40, 460, 10, 40] }, // đỉnh = 460, trên nhất
  ];
  assert.equal(bandFootY(fake, 'surface'), 120);
  assert.equal(bandHeadY(fake, 'deep'), 460);
  // Dải không có gian nào ⇒ NaN, để chỗ gọi BỎ QUA chứ không đặt hộp vào y = 0.
  assert.ok(Number.isNaN(bandFootY(fake, 'floor')));
  assert.ok(Number.isNaN(bandHeadY([], 'surface')));
  // Và trên dữ liệu THẬT, mặt đất phải nằm TRÊN chỗ ánh sáng tắt.
  const real = [...WORLD_MAP_TS.matchAll(/band: '([a-z]+)'[^\n]*box: \[([^\]]+)\]/g)].map((m) => ({
    band: m[1],
    box: m[2].split(',').map((s) => Number(s.trim())),
  }));
  assert.ok(real.length >= 8, `phải đọc được tám gian, thấy ${real.length}`);
  const ground = bandFootY(real, 'surface');
  const dark = bandHeadY(real, 'deep');
  assert.ok(ground > 0 && dark > ground, `mặt đất ${ground} phải nằm trên dải sâu ${dark}`);
});

test('bốn màn khí phủ kín khung và CHỒNG nhau ở mỗi mép', () => {
  // Bỏ `BAND_BLEED_Y` thì hai màn khí giáp nhau đúng một đường — và vì chúng
  // dịch những lượng KHÁC NHAU khi cuộn, khe giữa chúng hở ra đúng bằng hiệu
  // hai độ dịch: một vạch trần chạy ngang bức tranh. Nên nới phải lớn hơn
  // trường hợp xấu nhất, là hai lớp kề nhau chạy về HAI PHÍA.
  assert.ok(
    BAND_BLEED_Y > 2 * PARALLAX_MAX_PX,
    `nới ${BAND_BLEED_Y} phải > 2 × biên độ parallax (${2 * PARALLAX_MAX_PX})`,
  );
  const boxes = MOTION_BANDS.map((b) => ({ band: b, ...veilBox(b) }));
  // Màn trên cùng chạy từ mép KHUNG, không từ mép dải: phía trên mặt đất là
  // TRỜI, và ba gian M1–M3 đứng trong khoảng trời đó (hộp của chúng bắt đầu ở
  // y = 0). Bỏ nhánh đó thì parallax không chạy ở đúng phần bản đồ mà người mới
  // vào nhìn trước nhất.
  assert.equal(boxes[0].top, 0, 'màn trên cùng phải chạm mép trên khung');
  const last = boxes[boxes.length - 1];
  assert.ok(last.top + last.height >= 100 - 1e-9, 'màn đáy phải chạm mép dưới khung');
  for (const b of boxes) {
    assert.equal(b.left, 0);
    assert.equal(b.width, 100);
    assert.ok(b.height > 0, `màn ${b.band} rỗng`);
  }
  for (let i = 1; i < boxes.length; i += 1) {
    const prevBottom = boxes[i - 1].top + boxes[i - 1].height;
    assert.ok(prevBottom > boxes[i].top, `màn ${boxes[i].band} phải chồng lên màn trên nó`);
  }
});

test('hai lớp nước bám vào MÃ GIAN, không vào một bản sao toạ độ', () => {
  // Ca bắt lỗi của một lỗi ĐÃ XẢY RA trong phiên này: bản đầu giữ hai hộp tính
  // sẵn (`SEEP_BOX = boxToPercent(470, 370, 420, 130)`) và agent vẽ tranh dời
  // hộp của M4 thành `[470, 362, 420, 150]` trong cùng buổi chiều — bản sao
  // sống được đúng hai giờ. Nay không còn con số nào để lệch, và ca này canh
  // đúng điều đó: hai mã gian phải CÒN TỒN TẠI trong `REGION_LAYOUT`, và
  // `MapMotion.tsx` phải đọc hộp từ đó chứ không mang hộp của riêng nó.
  for (const key of [SEEP_REGION, LAKE_REGION]) {
    assert.match(
      WORLD_MAP_TS,
      new RegExp(String.raw`key: '${key}'`),
      `REGION_LAYOUT phải còn gian ${key}`,
    );
  }
  assert.match(TSX_CODE, /REGION_LAYOUT\.find/, 'hộp phải đọc từ REGION_LAYOUT');
  assert.match(TSX_CODE, /boxToPercent\(/);
  // `regionBox` phải được GỌI, không chỉ được định nghĩa. Thiếu câu này thì
  // thay chỗ gọi bằng một hộp cứng (`{ left: 34, top: 44, … }`) vẫn đạt cả bộ:
  // `REGION_LAYOUT.find` còn nguyên trong thân một hàm không ai gọi nữa. Đã
  // kiểm bằng cách làm đúng thế — 34/34 xanh.
  const calls = [...TSX_CODE.matchAll(/regionBox\(/g)].length;
  assert.ok(calls >= 2, `regionBox phải vừa được khai vừa được GỌI, thấy ${calls} lượt`);
  // Và không một hộp toạ độ viết tay nào trong component.
  assert.ok(
    !/\{\s*left:\s*[\d.]+\s*,\s*top:\s*[\d.]+/.test(TSX_CODE),
    'không ghi cứng một hộp toạ độ nào trong MapMotion.tsx',
  );
  // Và map-motion.ts không được mang lại một hộp toạ độ nào.
  const LIB = stripTs(doc('../../src/lib/map-motion.ts'));
  assert.ok(
    !/boxToPercent\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/.test(LIB),
    'không ghi cứng một hộp toạ độ nào trong map-motion.ts',
  );
});

test('cột bụi đứng trên giếng gần mặt trời nhất, và dừng ở dải sâu', () => {
  // Luật, không phải thẩm mỹ: `MAP_SUN` là nguồn sáng duy nhất của bức vẽ, nên
  // giếng gần nó nhất là giếng duy nhất có lý do để có ánh sáng rọi vào. Ghi
  // cứng `x = 100` thì agent vẽ tranh dời mặt trời là cột bụi sáng trong một
  // cái giếng tối.
  const sun = WORLD_MAP_TS.match(/MAP_SUN = \{ cx: (\d+), cy: (\d+) \}/);
  assert.ok(sun, 'world-map.ts phải còn MAP_SUN');
  const wells = [...WORLD_MAP_TS.matchAll(/\{ to: '(M\d)', x: (\d+), d: '([^']+)' \}/g)];
  assert.ok(wells.length >= 2, `phải còn ít nhất hai giếng, thấy ${wells.length}`);
  const xs = wells.map((w) => Number(w[2]));
  const nearest = xs.reduce((a, b) =>
    Math.abs(b - Number(sun[1])) < Math.abs(a - Number(sun[1])) ? b : a,
  );
  assert.equal(nearestWellX(Number(sun[1]), xs), nearest);
  // Và `MapMotion.tsx` phải THẬT SỰ gọi hàm đó với `MAP_SUN.cx`. Thiếu câu
  // này thì ghi cứng `const wellX = 100` vẫn đạt cả 33 ca — đã kiểm bằng cách
  // làm đúng thế: 33/33 xanh, nên đây không phải một ca dư.
  assert.match(TSX_CODE, /nearestWellX\(\s*MAP_SUN\.cx/);
  // Hàm phải chọn ĐÚNG cái gần nhất kể cả khi mảng không có thứ tự.
  assert.equal(nearestWellX(100, [1300, 36, 905, 100, 470]), 100);
  assert.equal(nearestWellX(480, [1300, 36, 905, 100, 470]), 470);
  assert.ok(Number.isNaN(nearestWellX(100, [])), 'không có giếng nào ⇒ NaN, không phải 0');

  // Hai mốc y đến từ `REGION_LAYOUT` qua `bandFootY`/`bandHeadY`, giống đúng
  // cách `MapMotion.tsx` làm — không một con số nào của tranh ở đây.
  const real = [...WORLD_MAP_TS.matchAll(/band: '([a-z]+)'[^\n]*box: \[([^\]]+)\]/g)].map((m) => ({
    band: m[1],
    box: m[2].split(',').map((s) => Number(s.trim())),
  }));
  const groundY = bandFootY(real, 'surface');
  const darkY = bandHeadY(real, 'deep');
  assert.match(TSX_CODE, /bandFootY\(REGION_LAYOUT, 'surface'\)/);
  assert.match(TSX_CODE, /bandHeadY\(REGION_LAYOUT, 'deep'\)/);

  const box = shaftBox(nearest, groundY, darkY);
  const mid = box.left + box.width / 2;
  assert.ok(
    Math.abs(mid - (nearest / MOTION_FRAME.width) * 100) < 0.01,
    `cột bụi (${mid}%) phải đứng giữa giếng x=${nearest}`,
  );
  // Bắt đầu ở MẶT ĐẤT và tắt ở ĐỈNH DẢI SÂU. Chỗ ánh sáng tắt là một thông
  // tin; cho cột chạy tới đáy là nói ngược chính bức tranh, vốn tối dần xuống.
  const toY = (pct) => (pct * MOTION_FRAME.height) / 100;
  assert.ok(Math.abs(toY(box.top) - groundY) < 0.5, `cột bụi phải bắt đầu ở mặt đất ${groundY}`);
  assert.ok(
    Math.abs(toY(box.top + box.height) - darkY) < 0.5,
    `cột bụi phải tắt ở đỉnh dải sâu ${darkY}`,
  );
  // Hai mốc đưa vào lộn ngược thì hàm vẫn trả một hộp dương, không âm.
  const flipped = shaftBox(nearest, darkY, groundY);
  assert.ok(flipped.height > 0, 'hai mốc lộn ngược phải cho hộp dương, không âm');
  // Và nằm trong khung.
  assert.ok(box.left >= 0 && box.top >= 0, 'cột bụi ra ngoài mép trên/trái');
  assert.ok(box.left + box.width <= 100.001, 'cột bụi tràn mép phải');
  assert.ok(box.top + box.height <= 100.001, 'cột bụi tràn mép dưới');
});

test('năm sợi sáng vẽ theo chính `MAP_WELLS`, không phải một bản sao', () => {
  // Nếu ai đó chép năm chuỗi `d` vào `MapMotion.tsx` thì sợi sáng và giếng
  // trong tranh lệch nhau ngay lần sau agent vẽ tranh dời một giếng — và lệch
  // một cách im lặng, vì cả hai vẫn là năm đường dọc trông hợp lý.
  assert.match(TSX, /MAP_WELLS\.map/);
  assert.ok(!/\bM\d+ \d+ L/.test(TSX), 'không được chép chuỗi đường giếng vào TSX');
  assert.match(TSX, /viewBox="0 0 1360 820"/, 'SVG sợi sáng phải dùng đúng khung của tranh');
});

test('bốn màu của lớp phủ lấy từ `MAP_PALETTE` của chính bức tranh', () => {
  // Lớp phủ sáng hơn/khác tông tranh là một lớp dán lên, không phải ánh sáng
  // trong tranh — đúng cái làm hai bản trước bị bác bằng bốn chữ "xấu và trẻ con".
  for (const [name, hex] of Object.entries(MOTION_PALETTE)) {
    assert.ok(
      WORLD_MAP_TS.includes(hex),
      `màu '${name}' (${hex}) không có trong MAP_PALETTE — lớp phủ lệch tông tranh`,
    );
  }
});

test('`pathLength` khớp nhau ở cả ba chỗ: TS, TSX và `stroke-dasharray` trong CSS', () => {
  // Đây là một lỗi IM LẶNG hoàn hảo nếu không có ca này: để `pathLength={1}`
  // trong TSX mà `stroke-dasharray: 100` trong CSS thì vạch gạch dài gấp trăm
  // lần đường, nên sợi hiện ĐỦ ngay từ khung đầu và hiệu ứng vẽ dần biến mất —
  // không lỗi, không log, chỉ là một hiệu ứng không bao giờ chạy.
  assert.equal(THREAD_PATH_LENGTH, 100);
  assert.match(TSX, new RegExp(String.raw`pathLength=\{THREAD_PATH_LENGTH\}`));
  assert.match(
    CSS_CODE,
    new RegExp(String.raw`stroke-dasharray:\s*${THREAD_PATH_LENGTH}\s*;`),
  );
  const ink = keyframeBlocks(CSS_CODE).find((b) => /mapInk/.test(b.name));
  assert.ok(ink, 'phải có @keyframes vẽ dần sợi sáng');
  assert.match(ink.body, new RegExp(String.raw`stroke-dashoffset:\s*${THREAD_PATH_LENGTH}`));
  assert.match(ink.body, /stroke-dashoffset:\s*0/);
});

// ════════════════════════════════════════════════════════════════════════
// 6 · KHÔNG CHẮN CÚ BẤM, KHÔNG SSR INLINE STYLE
// ════════════════════════════════════════════════════════════════════════

test('lớp chuyển động không bắt chuột ở bất cứ đâu', () => {
  // Bản đồ là lối đi CHÍNH vào khoá học. Một lớp phủ trong suốt phủ kín khung
  // mà bắt chuột thì tám liên kết trở thành tám hình vẽ — và lỗi đó không lộ ra
  // ở bất cứ ảnh chụp nào.
  assert.match(CSS_CODE, /\.motion\s*\{[^}]*pointer-events:\s*none/);
  const back = [...CSS_CODE.matchAll(/pointer-events:\s*(auto|all)/g)];
  assert.equal(back.length, 0, 'không phần tử con nào được lấy lại chuột');
});

test('không `style={{…}}` nào — màu và hộp đặt bằng CSSOM lúc chạy', () => {
  // Bẫy `AGENTS.md`: SSR tuần tự hoá style nội tuyến thành `style="…"`, và 257
  // chỗ `style={{…}}` ở 40 file React là MỘT TRONG HAI nguyên nhân
  // `style-src 'unsafe-inline'` chưa bỏ được. Thêm chỗ thứ 258 là đóng thêm một
  // cái đinh vào chỉ thị đó.
  assert.ok(!/style=\{\{/.test(TSX_CODE), 'đặt bằng el.style.setProperty, không bằng prop style');
  assert.match(TSX_CODE, /setProperty\(/);
  // Và không `setAttribute('style', …)`: CSP CHẶN đúng cái đó, khác với CSSOM.
  assert.ok(!/setAttribute\(\s*'style'/.test(TSX_CODE));
});

test('mọi hình đều aria-hidden, và lớp phủ không thêm tab stop nào', () => {
  assert.match(TSX, /aria-hidden="true"/);
  // Không `<a>`, `<button>`, `tabIndex` nào: lớp này là không khí, nó không
  // được chen vào thứ tự Tab giữa tám liên kết.
  assert.ok(!/tabIndex/.test(TSX));
  assert.ok(!/<a[\s>]/.test(TSX) && !/<button/.test(TSX));
});

test('`MapMotion` đã được nối dây vào `WorldMap`, và đứng TRƯỚC tám liên kết', () => {
  // Ca bắt lỗi của bước nối dây: gỡ một dòng khỏi `WorldMap.tsx` thì cả lớp
  // chuyển động thành code chết mà mọi ca test khác ở trên vẫn xanh.
  assert.match(WORLD_MAP_TSX, /import MapMotion from '\.\/MapMotion'/);
  assert.match(WORLD_MAP_TSX, /<MapMotion \/>/);
  const at = WORLD_MAP_TSX.indexOf('<MapMotion />');
  const decorAt = WORLD_MAP_TSX.indexOf('data-map-decor');
  const bandsAt = WORLD_MAP_TSX.indexOf('{BANDS.map(');
  assert.ok(decorAt > 0 && at > decorAt, 'lớp chuyển động phải đứng SAU tranh (chồng lên)');
  assert.ok(bandsAt > 0 && at < bandsAt, 'và TRƯỚC tám liên kết (không chắn cú bấm)');
});

test('`motionVars` trả đủ bốn cặp tên → màu, không trùng tên', () => {
  const pairs = motionVars();
  assert.equal(pairs.length, Object.keys(MOTION_VAR).length);
  const names = pairs.map(([n]) => n);
  assert.equal(new Set(names).size, names.length, 'tên thuộc tính trùng là một màu bị ghi đè');
  for (const [name, value] of pairs) {
    assert.ok(name.startsWith('--map-'), `${name} phải thuộc không gian tên --map-*`);
    assert.match(value, /^#[0-9A-Fa-f]{6}$/, `${name} phải là một mã màu đủ`);
  }
});
