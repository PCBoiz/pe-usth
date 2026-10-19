// LỚP HOVER của bản đồ thế giới — `src/lib/map-motion.ts`,
// `src/app/map-motion.module.css`, và hai dòng nối dây trong `src/app/WorldMap.tsx`.
//
// ── 19/10/2026: BỘ NÀY VỪA ĐƯỢC VIẾT LẠI ────────────────────────────────
//
// Bản trước canh một lớp chuyển động TỰ CHẠY (parallax theo cuộn, cột bụi rơi,
// mạch rỉ, mặt hồ trôi, năm sợi sáng vẽ dần) bằng 34 ca. Chủ sản phẩm chốt lại
// "chỉ cần motion graphic khi hover nào thôi", nên cả năm hiệu ứng, 11 phần tử
// phủ và component `MapMotion.tsx` đã bị bỏ — và phần lớn 34 ca đó canh những
// thứ không còn tồn tại. Những ca GIỮ LẠI vì vẫn đúng: chặn `@keyframes` chạy
// thứ ngoài transform/opacity, chặn `url(`, chặn chạm `.decor`, nhánh
// `prefers-reduced-motion`.
//
// Bộ này canh SÁU bất biến. Mỗi bất biến có ít nhất một ca trượt khi gỡ bản
// sửa, ghi ngay cạnh nó:
//
//  1. KHÔNG CÓ GÌ CHẠY KHI KHÔNG AI CHẠM VÀO. Không `@keyframes`, không
//     `animation`, không `will-change`, không một phần tử phủ nào, không một
//     dòng JS nào. Sau khi trang nạp xong bản đồ đứng yên tuyệt đối.
//  2. `:focus-visible` CHO ĐÚNG HIỆU ỨNG CỦA `:hover`. CSS không chia sẻ được
//     một khối khai báo giữa hai selector nên hai cặp khối là chép tay; bộ này
//     so cả hình dáng selector lẫn thân khối, ký tự với ký tự.
//  3. CHUỘT GÁC SAU `@media (hover: hover)`, BÀN PHÍM KHÔNG. Bàn phím tồn tại
//     trên cả thiết bị cảm ứng. Và lớp hover không đổi vùng chạm của vùng nào.
//  4. CHUYỂN TIẾP NGẮN, CHỈ `transform`/`opacity`, 150–250ms. Thêm một thuộc
//     tính màu vào `transition` là mời trình duyệt vẽ lại NGAY TRÊN ảnh nền
//     877 KB.
//  5. XIN GIẢM CHUYỂN ĐỘNG THÌ MẤT CHUYỂN ĐỘNG, KHÔNG MẤT TÍN HIỆU. Cách làm
//     sai (`opacity: 1 !important` cho tất cả) trông rất giống cách làm đúng.
//  6. BÁM CẤU TRÚC, KHÔNG BÁM HÌNH THÁI. Hợp đồng duy nhất là
//     `[data-map-region]`: bản đồ sắp đổi sang hướng bản đồ sao (8 chòm, 48
//     ngôi) và một lớp bám toạ độ thì chết theo.
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  emphasisOpacity,
  HOVER_MAX_MS,
  HOVER_MIN_MS,
  HOVER_MS,
  HOVER_PROPS,
  REGION_DIM_OPACITY,
  REGION_HOOK,
  REGION_LIFT_PX,
  REGION_LIT_OPACITY,
  regionEmphasis,
  transitionOk,
} from '../../src/lib/map-motion.ts';

const doc = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const here = (p) => new URL(p, import.meta.url);

const CSS = doc('../../src/app/map-motion.module.css');
const LIB = doc('../../src/lib/map-motion.ts');
const WORLD_MAP_TSX = doc('../../src/app/WorldMap.tsx');
const WORLD_MAP_CSS = doc('../../src/app/world-map.module.css');

/** Bỏ mọi chú thích /* … *\/ — chú thích tiếng Việt ở đây NHẮC TÊN thứ đang bị
 *  cấm (`@keyframes`, `background-position`, `M4`, `pointer-events`), nên quét
 *  trên bản còn chú thích là quét ra lỗi giả. Bản trước đã trượt vì đúng chuyện
 *  này. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** Bỏ chú thích của một file TS/TSX, cả `/* *\/` lẫn `//`. */
function stripTs(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

const CSS_CODE = stripComments(CSS);
const LIB_CODE = stripTs(LIB);
const WORLD_MAP_CODE = stripTs(WORLD_MAP_TSX);

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
    out.push({ name: css.slice(start + '@keyframes'.length, open).trim(), body: css.slice(open + 1, i) });
    at = i + 1;
  }
  return out;
}

/**
 * Mọi quy tắc của một đoạn CSS: `{ head, body, at }` — `at` là chuỗi at-rule
 * BAO NGOÀI nó ('' nếu ở mức trên cùng).
 *
 * Cũng cắt theo ngoặc cân bằng và cũng vì một lý do có thật: `@media` của file
 * này bọc hai quy tắc, nên bất cứ cách cắt nào theo `}` đầu tiên sẽ đọc
 * `@media (hover: hover)` thành một quy tắc có selector là cả câu media và thân
 * là quy tắc đầu — tức ba ca dưới đây sẽ canh một cấu trúc không tồn tại.
 */
function cssRules(css, at = '') {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    let depth = 0;
    let j = open;
    for (; j < css.length; j += 1) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const body = css.slice(open + 1, j);
    if (head.startsWith('@keyframes')) {
      // Đã có `keyframeBlocks` lo; ở đây không đi vào trong.
    } else if (head.startsWith('@')) {
      out.push(...cssRules(body, at ? `${at} ${head}` : head));
    } else {
      out.push({ head, body, at });
    }
    i = j + 1;
  }
  return out;
}

/** Các khai báo `prop: value` của một thân quy tắc. */
function decls(body) {
  return body
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.includes(':'))
    .map((s) => {
      const at = s.indexOf(':');
      return { prop: s.slice(0, at).trim(), value: s.slice(at + 1).trim() };
    });
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const RULES = cssRules(CSS_CODE);
/** Thời lượng thật của `var(--map-hover-ms)`. */
const HOVER_VAR_MS = Number((CSS_CODE.match(/--map-hover-ms:\s*(\d+)ms/) ?? [])[1]);

/** Quy tắc có head khớp CHÍNH XÁC (sau khi chuẩn hoá khoảng trắng). */
const ruleWithHead = (head) => RULES.find((r) => norm(r.head) === head);
const rulesWhereHead = (re) => RULES.filter((r) => re.test(norm(r.head)));

// ════════════════════════════════════════════════════════════════════════
// 1 · KHÔNG CÓ GÌ CHẠY KHI KHÔNG AI CHẠM VÀO
// ════════════════════════════════════════════════════════════════════════

test('không một `@keyframes` nào, và không một khai báo `animation` nào', () => {
  // Ca bắt lỗi chính của bất biến 1, và là chính cái chủ sản phẩm vừa chốt:
  // "chỉ cần motion graphic khi hover". Một `@keyframes` + `animation` ở đây là
  // chuyển động TỰ KHỞI ĐỘNG quay lại, và nó quay lại rất dễ — nó là cách
  // "hiển nhiên" để cho một thứ gì đó động.
  assert.ok(!/@keyframes/.test(CSS_CODE), 'lớp hover không được có @keyframes');
  assert.ok(
    !/\banimation(-[a-z]+)?\s*:/.test(CSS_CODE),
    'không khai báo animation nào — thứ duy nhất còn động là `transition`',
  );
  // Và không `will-change`: không có gì chạy khi nghỉ thì không lớp nào đáng
  // giữ trên GPU của một tab mở cả ngày.
  assert.ok(!/will-change/.test(CSS_CODE), 'không giữ lớp nào trên GPU khi bản đồ đứng yên');
});

test('nếu sau này có `@keyframes` thì nó chỉ được chạy transform/opacity', () => {
  // Lưới an toàn cho người SAU, không cho hiện trạng: hiện tại không có khối
  // nào (ca trên canh điều đó). Nhưng một hoạt ảnh treo vào `:hover` là hợp lệ
  // về sau, và lúc đó đây là chỗ chặn `background-position` — cách "hiển nhiên"
  // để cho một lớp trôi, và cũng là cách buộc trình duyệt vẽ lại vùng đó mỗi
  // khung hình NGAY TRÊN ảnh nền 877 KB. `figure-motion.ts` đã đo giá của nó:
  // UpdateLayoutTree 796ms / 1 084 lần trong một trace 10,5 giây.
  const allow = new Set(HOVER_PROPS);
  for (const { name, body } of keyframeBlocks(CSS_CODE)) {
    const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
    assert.ok(props.length > 0, `@keyframes ${name} rỗng`);
    for (const p of props) {
      assert.ok(allow.has(p), `@keyframes ${name} chạy '${p}' — chỉ được ${[...allow].join('/')}`);
    }
  }
});

test('`MapMotion.tsx` và 11 phần tử phủ đã bị xoá hẳn, không còn JS nào', () => {
  // Ca bắt lỗi: để lại component thì 11 phần tử phủ vẫn được dựng, vẫn gắn
  // listener cuộn, vẫn chạy `getBoundingClientRect` mỗi khung hình — một lớp
  // chuyển động "đã bỏ" mà vẫn chạy, chỉ là không ai đọc CSS của nó nữa.
  assert.ok(!existsSync(here('../../src/app/MapMotion.tsx')), 'MapMotion.tsx phải bị xoá');
  assert.ok(!/MapMotion/.test(WORLD_MAP_CODE), 'WorldMap không được nhắc MapMotion nữa');
  // Và lớp hover không dựng phần tử nào: không lớp phủ, không `position`, không
  // `inset`. Nhờ thế nó KHÔNG THỂ chắn một cú bấm — bản trước phải cần hẳn một
  // dòng `pointer-events: none` để không chắn tám liên kết.
  for (const bad of ['position', 'inset', 'pointer-events', 'z-index', 'content']) {
    assert.ok(
      !new RegExp(String.raw`(^|[\s;{])${bad}\s*:`).test(CSS_CODE),
      `lớp hover không dựng phần tử nào, nên nó không cần '${bad}'`,
    );
  }
  // Mọi thuộc tính đánh dấu của bản cũ phải biến mất khỏi cả hai file.
  for (const attr of ['data-map-motion', 'data-veil', 'data-shaft', 'data-seep', 'data-lake', 'data-thread']) {
    assert.ok(!CSS_CODE.includes(attr), `CSS còn sót ${attr}`);
    assert.ok(!WORLD_MAP_CODE.includes(attr), `WorldMap còn sót ${attr}`);
  }
});

test('MỌI khai báo transform/opacity đều treo vào `:hover` hoặc `:focus-visible`', () => {
  // Ca bắt lỗi dạng tổng: đây là câu "sau khi trang nạp xong, bản đồ đứng yên
  // hoàn toàn" viết thành một bài kiểm. Một `transform` hay `opacity` trong một
  // quy tắc KHÔNG có điều kiện tương tác là một thay đổi hình ở trạng thái
  // nghỉ, tức một thứ người ta thấy mà không làm gì để thấy nó.
  for (const rule of RULES) {
    const head = norm(rule.head);
    if (/:hover|:focus-visible/.test(head)) continue;
    for (const { prop } of decls(rule.body)) {
      assert.ok(
        prop !== 'opacity' && prop !== 'transform',
        `'${prop}' trong quy tắc không-tương-tác '${head}' — nó đổi hình lúc nghỉ`,
      );
    }
  }
});

test('quy tắc NGHỈ chỉ mang `transition`, không mang `opacity`', () => {
  // Ca bắt lỗi của một lỗi IM LẶNG hoàn hảo: viết `opacity: 0.55` cho trạng
  // thái nghỉ rồi để `:hover` nâng về 1 cho ra ĐÚNG cùng một hình khi có
  // chuột — nhưng lúc không ai chạm vào thì bản đồ MỜ SẴN, tám tấm nhãn nhạt đi
  // mà không ai nói gì. Và nó không lộ ra ở ảnh chụp lúc đang hover.
  const rest = ruleWithHead(`.spotlight ${REGION_HOOK}`);
  assert.ok(rest, `phải có quy tắc nghỉ '.spotlight ${REGION_HOOK}'`);
  const props = decls(rest.body).map((d) => d.prop);
  assert.deepEqual(props, ['transition'], `quy tắc nghỉ chỉ được mang transition, thấy ${props}`);
  // Phía TS nói đúng cùng một điều: nghỉ và sáng CÙNG độ đậm.
  assert.equal(emphasisOpacity('rest'), emphasisOpacity('lit'));
});

// ════════════════════════════════════════════════════════════════════════
// 2 · `:focus-visible` CHO ĐÚNG HIỆU ỨNG CỦA `:hover`
// ════════════════════════════════════════════════════════════════════════

/** Bốn quy tắc làm nên cả lớp. Tìm theo HÌNH DÁNG selector, không theo thứ tự
 *  trong file: thứ tự là chuyện của người viết, hình dáng là hợp đồng. */
const litHover = ruleWithHead(`.spotlight ${REGION_HOOK}:hover`);
const litFocus = ruleWithHead(`.spotlight ${REGION_HOOK}:focus-visible`);
const dimHover = rulesWhereHead(/:has\(\[data-map-region\]:hover\)/)[0];
const dimFocus = rulesWhereHead(/:has\(\[data-map-region\]:focus-visible\)/)[0];

test('`:focus-visible` có ĐÚNG hai khối khai báo của `:hover`', () => {
  // Bắt buộc, không tuỳ chọn: thông tin ở đây là "con trỏ đang ở đâu", và người
  // dùng bàn phím không được mất nó. Ca bắt lỗi: bỏ một trong hai quy tắc
  // `:focus-visible` thì Tab qua bản đồ không còn nói vùng nào đang được chọn —
  // và đó là bố cục mà MỘT SỐ người dùng chỉ có bố cục đó.
  for (const [name, r] of [['lit:hover', litHover], ['lit:focus', litFocus], ['dim:hover', dimHover], ['dim:focus', dimFocus]]) {
    assert.ok(r, `thiếu quy tắc ${name}`);
  }
  // Thân khối giống nhau KÝ TỰ VỚI KÝ TỰ. CSS không chia sẻ được một khối khai
  // báo giữa hai selector nên đây là bản chép tay, và bản chép tay là chỗ sẽ
  // lệch: ai đó nâng cú nhấc của hover lên 5px mà quên bản focus.
  assert.equal(norm(litFocus.body), norm(litHover.body), 'khối focus phải y hệt khối hover');
  assert.equal(norm(dimFocus.body), norm(dimHover.body), 'khối "lùi lại" phải y hệt ở hai nhánh');
  // Và hình dáng SELECTOR cũng phải là một bản chép: đổi `:hover` thành
  // `:focus-visible` ở đúng chỗ kích hoạt, giữ nguyên phần còn lại.
  assert.equal(norm(litHover.head).replace(/:hover$/, ':focus-visible'), norm(litFocus.head));
  assert.equal(
    norm(dimHover.head).replace(':has([data-map-region]:hover)', ':has([data-map-region]:focus-visible)'),
    norm(dimFocus.head),
  );
});

test('quy tắc "lùi lại" loại trừ chính vùng đang được trỏ / đang focus', () => {
  // Ca bắt lỗi: `:has()` làm quy tắc "lùi lại" MẠNH HƠN quy tắc "sáng lên"
  // (`.spotlight:has(X) [data-map-region]` cộng độ cụ thể của X vào), nên bỏ
  // `:not(:hover)` thì chính vùng đang được trỏ cũng bị làm mờ — hover thành
  // "cả tám vùng mờ đi", đúng ngược thông tin cần nói.
  for (const [name, r] of [['hover', dimHover], ['focus', dimFocus]]) {
    assert.ok(norm(r.head).includes(':not(:hover)'), `quy tắc lùi lại (${name}) phải loại trừ :hover`);
    assert.ok(
      norm(r.head).includes(':not(:focus-visible)'),
      `quy tắc lùi lại (${name}) phải loại trừ :focus-visible — chuột rê sang vùng khác không được làm mờ vùng đang Tab tới`,
    );
  }
});

test('độ đậm và cú nhấc trong CSS khớp từng con số trong `map-motion.ts`', () => {
  // Hai nguồn sự thật cho cùng một con số là chỗ chúng lệch nhau, và lệch ở đây
  // nghĩa là mọi ca ở trên canh những con số mà trình duyệt không dùng.
  assert.equal(norm(dimHover.body), `opacity: ${REGION_DIM_OPACITY};`);
  assert.equal(
    norm(litHover.body),
    `opacity: ${REGION_LIT_OPACITY}; transform: translateY(-${REGION_LIFT_PX}px);`,
  );
  // Và luật đằng sau hai con số: vùng khác LÙI LẠI, không biến mất.
  assert.ok(REGION_DIM_OPACITY < REGION_LIT_OPACITY, 'vùng khác phải nhạt hơn vùng đang trỏ');
  assert.ok(REGION_DIM_OPACITY >= 0.4, 'lùi lại, không biến mất: tên chặng kia phải còn đọc được');
  assert.ok(REGION_LIFT_PX > 0 && REGION_LIFT_PX <= 6, 'cú nhấc là một gợi ý chiều sâu, không phải một cú nhảy');
});

test('ba trạng thái: không ai chạm vào ⇒ KHÔNG vùng nào mờ', () => {
  // Luật thông tin của cả lớp, và ca này canh đúng cái dễ viết sai nhất: "làm
  // mờ các vùng khác" chỉ có nghĩa khi CÓ một vùng đang được trỏ.
  assert.equal(regionEmphasis({ anyActive: false, active: false }), 'rest');
  assert.equal(regionEmphasis({ anyActive: true, active: true }), 'lit');
  assert.equal(regionEmphasis({ anyActive: true, active: false }), 'dim');
  assert.equal(emphasisOpacity('rest'), REGION_LIT_OPACITY);
  assert.equal(emphasisOpacity('dim'), REGION_DIM_OPACITY);
  assert.ok(emphasisOpacity('dim') < emphasisOpacity('rest'), 'mờ phải nhạt hơn nghỉ');
});

// ════════════════════════════════════════════════════════════════════════
// 3 · CHUỘT GÁC SAU `@media (hover: hover)`, BÀN PHÍM KHÔNG
// ════════════════════════════════════════════════════════════════════════

test('hai quy tắc của CHUỘT nằm trong `@media (hover: hover)`', () => {
  // Ca bắt lỗi: WebKit trên iOS GIỮ `:hover` sau khi ngón tay rời đi. Không gác
  // thì một cú chạm trượt để lại một vùng sáng và bảy vùng mờ, DÍNH CỨNG cho
  // tới khi người ta chạm vào chỗ khác — tức bản đồ nói sai chỗ con trỏ đang ở,
  // trên đúng thiết bị không có con trỏ.
  assert.equal(norm(litHover.at), '@media (hover: hover)');
  assert.equal(norm(dimHover.at), '@media (hover: hover)');
});

test('hai quy tắc của BÀN PHÍM nằm NGOÀI `@media (hover: hover)`', () => {
  // Ca bắt lỗi ngược lại, và là lỗi tệ hơn: đưa `:focus-visible` vào trong
  // `@media (hover: hover)` thì người điều khiển bằng bàn phím hoặc công tắc
  // TRÊN thiết bị cảm ứng mất hẳn tín hiệu "đang ở vùng nào" — đúng những người
  // không có cách nào khác để biết.
  assert.ok(!/hover: hover/.test(litFocus.at), ':focus-visible không được gác sau hover: hover');
  assert.ok(!/hover: hover/.test(dimFocus.at), 'quy tắc lùi lại của bàn phím cũng vậy');
  // `:focus-visible`, không `:focus`: bấm chuột vào một liên kết cũng đặt focus,
  // nên `:focus` để lại một vùng sáng sau mỗi cú bấm và sau mỗi lần quay lại
  // trang chủ từ bài học.
  assert.ok(!/:focus(?!-visible)/.test(CSS_CODE), 'dùng :focus-visible, không :focus trần');
});

test('lớp hover không đổi vùng chạm, không ẩn/hiện gì', () => {
  // Trên thiết bị cảm ứng không có hover, nên điều phải bảo đảm là vùng VẪN
  // bấm được và vẫn rõ ràng — cách chắc chắn nhất là lớp này không đụng tới
  // hộp, tới `display`, tới `visibility` của vùng nào. Ca bắt lỗi: một
  // `display: none` theo `@media (hover: none)` (cách "hợp lý" để tắt lớp trên
  // cảm ứng) sẽ ẩn luôn tám liên kết.
  for (const bad of ['display', 'visibility', 'width', 'height', 'left', 'top', 'margin', 'padding']) {
    assert.ok(
      !new RegExp(String.raw`(^|[\s;{])${bad}\s*:`).test(CSS_CODE),
      `lớp hover không được đổi '${bad}' của vùng nào`,
    );
  }
  // Và `world-map.module.css` phải còn giữ vùng chạm tối thiểu của bản hẹp —
  // đó là cái bảo đảm "vẫn bấm được" trên cảm ứng, và nó không ở file của tôi.
  assert.match(WORLD_MAP_CSS, /min-height:\s*44px/, 'vùng chạm 44px của bản hẹp phải còn');
});

// ════════════════════════════════════════════════════════════════════════
// 4 · CHUYỂN TIẾP NGẮN, CHỈ `transform`/`opacity`
// ════════════════════════════════════════════════════════════════════════

test('MỌI `transition` đều ngắn (150–250ms) và chỉ chuyển tiếp transform/opacity', () => {
  // Ca bắt lỗi: `transition: all 180ms` hoặc thêm `background-color` vào danh
  // sách là mời trình duyệt VẼ LẠI tấm nhãn mỗi khung hình — và vùng bị vẽ lại
  // nằm ngay trên ảnh nền 877 KB của `.decor`, nên nó kéo cả tranh vào lượt vẽ.
  // Luật chỉ viết một lần, ở `transitionOk` trong `map-motion.ts`.
  assert.ok(Number.isFinite(HOVER_VAR_MS), 'CSS phải khai --map-hover-ms');
  let seen = 0;
  for (const rule of RULES) {
    for (const { prop, value } of decls(rule.body)) {
      if (prop !== 'transition') continue;
      // `transition: none` của nhánh giảm chuyển động không phải một chuyển
      // tiếp — nó là chỗ BỎ chuyển tiếp, và ca riêng ở mục 5 canh nó.
      if (/^none/.test(value)) continue;
      seen += 1;
      const parts = value.split(',').map((s) => s.trim().split(/\s+/));
      const props = parts.map((t) => t[0]);
      const times = parts.map((t) => (t[1] === 'var(--map-hover-ms)' ? HOVER_VAR_MS : Number((t[1] ?? '').replace('ms', ''))));
      for (const ms of times) {
        assert.ok(
          transitionOk({ ms, props }),
          `transition '${value}' trong '${norm(rule.head)}' sai luật: ${ms}ms, [${props}]`,
        );
      }
    }
  }
  assert.ok(seen >= 1, 'phải có đúng một chuyển tiếp, ở quy tắc nghỉ');
  // Và `transitionOk` thật sự bắt được hai cách sai, không chỉ chấp nhận cách đúng.
  assert.equal(transitionOk({ ms: HOVER_MS, props: ['opacity', 'transform'] }), true);
  assert.equal(transitionOk({ ms: 400, props: ['opacity'] }), false);
  assert.equal(transitionOk({ ms: HOVER_MS, props: ['all'] }), false);
  assert.equal(transitionOk({ ms: HOVER_MS, props: [] }), false);
});

test('thời lượng khớp `HOVER_MS`, và không một `ms` nào ngoài khoảng 150–250', () => {
  assert.equal(HOVER_VAR_MS, HOVER_MS, 'CSS và TS phải cùng một thời lượng');
  assert.ok(HOVER_MS >= HOVER_MIN_MS && HOVER_MS <= HOVER_MAX_MS);
  // Quét cả file: một `350ms` lọt vào một quy tắc mà ca trên không đọc tới vẫn
  // là một tín hiệu tới SAU con trỏ.
  for (const [, ms] of CSS_CODE.matchAll(/(\d+)ms/g)) {
    const n = Number(ms);
    assert.ok(n >= HOVER_MIN_MS && n <= HOVER_MAX_MS, `${n}ms ngoài khoảng ${HOVER_MIN_MS}–${HOVER_MAX_MS}`);
  }
});

// ════════════════════════════════════════════════════════════════════════
// 5 · GIẢM CHUYỂN ĐỘNG: MẤT CHUYỂN ĐỘNG, KHÔNG MẤT TÍN HIỆU
// ════════════════════════════════════════════════════════════════════════

test('nhánh `prefers-reduced-motion` bỏ chuyển động mà KHÔNG chạm độ đậm', () => {
  // Ca bắt lỗi quan trọng nhất của phiên này, vì cách làm SAI trông rất giống
  // cách làm đúng: `.spotlight * { transition: none; opacity: 1 !important }`
  // đọc như "đã tôn trọng tuỳ chọn", nhưng nó tắt luôn cả THÔNG TIN — người xin
  // giảm chuyển động mất hẳn tín hiệu "con trỏ đang ở đâu". Họ không muốn thấy
  // thứ gì DI CHUYỂN, không phải không muốn biết mình đang ở đâu.
  const reduced = RULES.filter((r) => /prefers-reduced-motion/.test(r.at));
  assert.ok(reduced.length >= 2, 'phải có nhánh giảm chuyển động');
  const props = new Set();
  for (const r of reduced) for (const d of decls(r.body)) props.add(d.prop);
  assert.ok(props.has('transition'), 'phải bỏ chuyển tiếp (đổi độ đậm TỨC THÌ)');
  assert.ok(props.has('transform'), 'phải bỏ cú nhấc 3px');
  assert.ok(!props.has('opacity'), 'KHÔNG được chạm opacity — tương phản 1 vs 0,55 là tín hiệu, không phải chuyển động');
  // Và cả hai phải là `none`, không phải một giá trị nhỏ hơn.
  for (const r of reduced) {
    for (const { prop, value } of decls(r.body)) {
      assert.match(value, /^none\s*!important$/, `${prop} trong nhánh giảm chuyển động phải là 'none !important'`);
    }
  }
  // Nhánh này phải phủ CẢ hover LẪN focus: người xin giảm chuyển động cũng dùng
  // bàn phím.
  const heads = reduced.map((r) => norm(r.head)).join(' ');
  assert.ok(/:hover/.test(heads) && /:focus-visible/.test(heads));
});

// ════════════════════════════════════════════════════════════════════════
// 6 · BÁM CẤU TRÚC, KHÔNG BÁM HÌNH THÁI
// ════════════════════════════════════════════════════════════════════════

test('mọi selector của lớp hover chỉ gồm `.spotlight` và `[data-map-region]`', () => {
  // Ca bắt lỗi của bất biến 6, và đây là ca đáng nhất trong bộ: bản đồ đang
  // được nghiên cứu để thay hẳn sang hướng BẢN ĐỒ SAO (8 chòm, 48 ngôi —
  // `design/v3/ban-do-sao.md`). Một `.spot4` hay một `[data-band='deep']` lọt
  // vào đây là một dòng sẽ chết im lặng lúc đó: selector không khớp gì nữa,
  // không lỗi, không log, chỉ là một hiệu ứng không bao giờ chạy.
  // Bản trước đã trả giá đúng chuyện này ở quy mô nhỏ hơn — nó giữ bản sao bốn
  // mốc địa tầng, và bản sao sống được đúng hai giờ.
  assert.ok(RULES.length >= 5, `phải đọc được các quy tắc, thấy ${RULES.length}`);
  for (const rule of RULES) {
    const rest = norm(rule.head)
      .split(/\s*,\s*/)
      .join(' ')
      .replaceAll('.spotlight', '')
      .replaceAll(REGION_HOOK, '');
    assert.ok(
      !/[.[]/.test(rest),
      `selector '${norm(rule.head)}' bám vào hình thái cụ thể — chỉ được .spotlight và ${REGION_HOOK}`,
    );
  }
  // Và không một toạ độ nào: dãy ≥ 3 chữ số duy nhất được phép là thời lượng.
  const stray = [...CSS_CODE.matchAll(/\b(\d{3,})\b/g)].map((m) => m[1]).filter((n) => Number(n) !== HOVER_MS);
  assert.deepEqual(stray, [], `số lạ trong CSS — có phải toạ độ của tranh? ${stray}`);
});

test('`map-motion.ts` thuần: không import, không DOM, không toạ độ', () => {
  // Bộ test chạy `node --test` và import thẳng file `.ts` (Node bóc kiểu), nên
  // một `import` ở đó là cả bộ này đỏ. Và "không DOM" là cách nói khác của "lớp
  // hover không có JS": nếu file này chạm `window` thì ở đâu đó có một effect.
  assert.ok(!/^import /m.test(LIB_CODE), 'map-motion.ts phải thuần, không import gì');
  for (const bad of ['document', 'window', 'addEventListener', 'querySelector', 'useEffect', 'setProperty']) {
    assert.ok(!LIB_CODE.includes(bad), `map-motion.ts không được chạm '${bad}' — lớp hover không có JS`);
  }
  const allow = new Set([String(HOVER_MS), String(HOVER_MIN_MS), String(HOVER_MAX_MS)]);
  const stray = [...LIB_CODE.matchAll(/\b(\d{3,})\b/g)].map((m) => m[1]).filter((n) => !allow.has(n));
  assert.deepEqual(stray, [], `số lạ trong map-motion.ts ${stray}`);
  // Và hợp đồng phải là ĐÚNG thuộc tính mà `WorldMap.tsx` đang đặt.
  assert.equal(REGION_HOOK, '[data-map-region]');
});

test('lớp hover không chạm `.decor`, không tải thêm ảnh, không một thuộc tính màu nào', () => {
  // Hai ca giữ lại từ bản trước, vẫn đúng từng chữ: `.decor` mang ảnh nền
  // 877 KB, nên đặt `transform` lên nó là nhấc cả texture đó lên GPU và đổi màu
  // ngay trên nó là vẽ lại 877 KB. Một `url(...)` ở đây là một lượt tải nữa cho
  // một trang chủ đã mang 877 KB tranh.
  assert.ok(!/decor/.test(CSS_CODE), 'CSS lớp hover không được nhắc .decor');
  assert.ok(!/\burl\(/.test(CSS_CODE), 'lớp hover không tải ảnh nào');
  assert.ok(!/#[0-9a-fA-F]{3,8}/.test(CSS_CODE), 'không mã màu hex trong *.module.css');
  // KHÔNG MỘT THUỘC TÍNH MÀU NÀO, và đây là điều mới so với bản trước: lớp này
  // nói hết bằng `opacity`/`transform`, nên nó đứng ngoài cả chuyện chế độ tối
  // lẫn `forced-colors` — bản trước phải xử lý cả hai bằng hai quy tắc riêng.
  const colorish = ['color', 'background', 'background-image', 'background-color', 'border', 'border-color', 'box-shadow', 'filter', 'fill', 'stroke', 'outline', 'mask-image'];
  for (const rule of RULES) {
    for (const { prop } of decls(rule.body)) {
      assert.ok(!colorish.includes(prop), `'${prop}' trong '${norm(rule.head)}' — lớp hover không dùng màu`);
    }
  }
  // Và `world-map.module.css` phải còn giữ hai dòng mà bản đồ dựa vào.
  assert.match(WORLD_MAP_CSS, /background-size:\s*100%\s*100%/);
  assert.match(WORLD_MAP_CSS, /aspect-ratio:\s*1360\s*\/\s*820/);
});

test('lớp hover nối vào CẢ HAI bố cục của `WorldMap`, trên phần tử bọc', () => {
  // Ca bắt lỗi của bước nối dây, hai nửa:
  //  · gỡ class khỏi `.map` thì cả lớp thành CSS chết mà mọi ca trên vẫn xanh;
  //  · gỡ khỏi `.plain` thì bố cục dự phòng (hiện khi giáo trình không còn đúng
  //    tám chặng) mất hẳn tín hiệu hover — đúng lúc không nên mất thêm gì.
  assert.match(WORLD_MAP_CODE, /import hoverStyles from '\.\/map-motion\.module\.css'/);
  assert.match(WORLD_MAP_CODE, /\$\{styles\.map\} \$\{hoverStyles\.spotlight\}/);
  assert.match(WORLD_MAP_CODE, /\$\{styles\.plain\} \$\{hoverStyles\.spotlight\}/);
  // `:has()` cần một TỔ TIÊN chung, nên class phải ở phần tử bọc — không ở
  // chính tám liên kết.
  assert.ok(
    !/data-map-region[^>]*hoverStyles\.spotlight/.test(WORLD_MAP_CODE),
    'class phải ở phần tử bọc, không trên từng vùng',
  );
  // Và hợp đồng phía DOM phải còn: mỗi vùng là một `<a href>` mang
  // `data-map-region`, ở cả hai bố cục.
  const hooks = [...WORLD_MAP_CODE.matchAll(/data-map-region/g)].length;
  assert.ok(hooks >= 2, `mỗi bố cục phải có một vùng mang data-map-region, thấy ${hooks}`);
  assert.ok(!/tabIndex/.test(WORLD_MAP_CODE), 'lớp hover không thêm tab stop nào');
});
