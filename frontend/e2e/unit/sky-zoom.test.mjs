/**
 * BẢN ĐỒ SAO — CÚ PHÓNG GIỮ LẠI ĐƯỢC CÁI GÌ, và trang có còn giật không.
 *
 * Bốn lời chê của chủ sản phẩm ngày 20/10/2026, sau khi xem thật. Tệp này canh
 * ba cái đã sửa; cái thứ tư (cho hành tinh chuyển động) còn mở — xem cuối tệp.
 *
 *  (1) *"khi hover đã hiện luôn các bài của phần đấy rồi, sao không phải khi
 *      tôi bấm vào M1-M8 thì nó sẽ zoom vào hành tinh/chòm sao đấy rồi lúc đấy
 *      mới hiện lên các khóa"* — trỏ vào một chặng bật MỌI thẻ mã bài của chặng
 *      ấy, nên bấm vào rồi thì không còn gì chưa thấy. Đúng cột "không giữ lại
 *      gì" mà `design/v3/tuong-tac-ban-do.md` §2.8 xếp bản đồ này vào, và đúng
 *      luật §2.5 (Hades) bị làm ngược: *cho biết HÌNH DẠNG của lựa chọn, giữ
 *      lại NỘI DUNG của nó.*
 *
 *  (A) *"cả cái này nữa cũng hơi xấu/bó lại với nhau"* — ảnh chụp M6 (pandas,
 *      CHÍN bài): chín thẻ mang tên bài neo vào chín ngôi, đè lên nhau, chữ
 *      cắt giữa chừng, một thẻ đè cả nút "Thoát khỏi chặng".
 *
 *  (B) *"Và hơi lag"* — lỗi chặn.
 *
 * ===========================================================================
 * GỠ BẢN SỬA RA THÌ TRƯỢT (đã chạy thử, 20/10/2026)
 * ===========================================================================
 * Đo thật: sao lưu ba tệp, đột biến từng cái một, chạy `node --test` trên
 * CHÍNH tệp này, rồi phục hồi. Sáu đột biến, mỗi cái trượt ĐÚNG MỘT ca — tức
 * sáu bản sửa độc lập có sáu cái lưới riêng, không một ca nào đang canh hai
 * việc cùng lúc:
 *
 *  - Trả lại 8 quy tắc `.hitM<k>:hover ~ .lop .cumM<k> .chip { opacity: 1 }`
 *    (cú phát-hết-lúc-hover):                                      TRƯỢT 1 ca
 *  - Bỏ khối `.cum .sao[data-gan] .chip { --bac: 0ms }`:            TRƯỢT 1 ca
 *  - Bỏ quy tắc `.frame[data-phong] .sao:not(...) .tenBai`:         TRƯỢT 1 ca
 *  - Bỏ `.cot` khỏi `page.tsx` + khối lưới hai cột:                 TRƯỢT 1 ca
 *  - Bỏ `will-change: transform` khỏi `.troi`:                      TRƯỢT 1 ca
 *  - Trả `ve()` về `khung.getBoundingClientRect()` mỗi khung hình:  TRƯỢT 1 ca
 *                                                            ───────────────
 *                                                                   6 ca
 *
 * Chạy: cd frontend && npm run test:unit
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { SKY_CONSTELLATIONS } from '../../src/lib/star-map.ts';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

const CSS = read('src', 'app', 'ban-do-sao', 'star-map.module.css');
/** CSS đã bỏ chú thích. Tệp này giải thích rất nhiều bằng tiếng Việt, và một
 *  bộ chọn nằm trong chú thích ("tám quy tắc từng nằm ở đây…") sẽ làm mọi phép
 *  kiểm "không còn quy tắc X" báo xanh trong khi quy tắc ấy vẫn sống, hoặc báo
 *  đỏ trong khi nó đã chết. Cùng một mẹo với `star-map.test.mjs`. */
const CSS_CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
const boChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
const TSX = boChuThich(read('src', 'app', 'ban-do-sao', 'page.tsx'));
const CUR = boChuThich(read('src', 'app', 'ban-do-sao', 'SkyCursor.tsx'));
const doc = (f) => read('public', 'map', 'star', f);

/** Mọi dòng chữ của một tấm SVG, theo thứ tự. */
const chu = (svg) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

/* ─────────────────────────────────────────────────────────────────────────
   (1) · TRỎ VÀO THÌ CHO HÌNH DẠNG, GIỮ LẠI NỘI DUNG
   ───────────────────────────────────────────────────────────────────────── */

test('TRỎ vào một chặng KHÔNG mở một thẻ mã bài nào — cú phóng mới được quyền đó', () => {
  // Cơ chế cũ: ô bấm của chặng với tới lớp con trỏ bằng bộ chọn anh em, rồi
  // bật `opacity` cho MỌI `.chip` của cụm ấy. Sáu tới chín thẻ cùng lúc trên
  // một khung 1 360 px — ở ba chòm chặt nhất chúng chồng lên nhau thành một
  // mớ, và quan trọng hơn: bấm vào rồi thì KHÔNG CÒN GÌ để tiết lộ.
  for (const c of SKY_CONSTELLATIONS) {
    for (const trang_thai of ['hover', 'focus-visible']) {
      const re = new RegExp(`\\.hit${c.key}:${trang_thai} ~ \\.lop[^{]*\\.chip`);
      assert.ok(!re.test(CSS_CODE),
        `${c.key}: trỏ (hoặc Tab tới) ô bấm cả chặng vẫn bật thẻ mã bài của cả chặng —`
        + ' đó là cú phát hết nội dung mà chủ sản phẩm gửi ảnh chụp, và nó làm cú phóng'
        + ' mất hẳn thứ để tiết lộ');
    }
  }
  // Và không một đường nào khác đi từ một ô bấm tới một cái thẻ: bộ chọn `~`
  // là đường DUY NHẤT từ `.hit*` vào trong lớp phủ, nên kiểm cả hình chung.
  assert.ok(!/\.hit[^,{]*~[^,{]*\.chip/.test(CSS_CODE),
    'còn một đường từ ô bấm cả chặng tới thẻ mã bài');

  // BÀN PHÍM KHÔNG BỊ BỎ RƠI, và đây là chỗ dễ sửa quá tay: `.lop[data-chang]`
  // do `SkyCursor.vao()` đặt khi tiêu điểm rơi vào một NGÔI (mũi tên đi vào
  // trong chòm), KHÔNG khi Tab tới ô bấm cả chặng. Tức Tab = trạng thái trỏ,
  // mũi tên đi vào = đã vào, nên tám quy tắc ấy PHẢI còn.
  for (const c of SKY_CONSTELLATIONS) {
    assert.match(CSS_CODE, new RegExp(`\\.lop\\[data-chang='${c.key}'\\] \\.cum${c.key} \\.chip`),
      `${c.key}: đi bằng mũi tên vào trong chòm mà không thẻ nào mở — người dùng bàn phím`
      + ' nhận một bản đồ nghèo hơn người dùng chuột, đúng thứ luật 5 của SkyCursor cấm');
  }
});

test('…nhưng TRỎ VÀO vẫn phải nói ra CHẶNG NÀO và BAO NHIÊU BÀI', () => {
  // "Giữ lại nội dung" không được đọc thành "giữ lại tất cả". Luật Hades cho
  // biết HÌNH DẠNG của lựa chọn: ở đây là nhãn chặng cộng SỐ bài — đủ để cân
  // một chặng mà không tiết lộ 48 cái tên.
  //
  // Cả hai đã nằm sẵn trong tranh, nên bản sửa (1) không thêm một byte nào:
  // tấm NGHỈ in một dòng (`M5 · NumPy`), tấm RÕ — thứ hiện lên đúng lúc trỏ
  // vào — in THÊM dòng `Advanced Python · 6 bài`. Ca này là thứ giữ cho cú
  // bớt chữ ở trên không biến thành "trỏ vào chẳng biết gì".
  for (const c of SKY_CONSTELLATIONS) {
    const nghi = chu(doc(`sky-chom-${c.key}.svg`));
    const ro = chu(doc(`sky-chom-${c.key}-ro.svg`));
    assert.ok(nghi.some((t) => t.startsWith(`${c.key} ·`)),
      `${c.key}: tấm nghỉ không in nhãn chặng — ở tỉ lệ xa thì chặng này vô danh`);
    assert.ok(ro.length > nghi.length,
      `${c.key}: tấm RÕ không nói thêm gì so với tấm nghỉ, nên trỏ vào không MUA được tin nào`);
    assert.ok(ro.some((t) => t.includes(`${c.stars.length} bài`)),
      `${c.key}: trỏ vào không cho biết chặng có bao nhiêu bài (chờ "${c.stars.length} bài") —`
      + ' đó là con số duy nhất còn lại để cân một chặng trước khi phóng vào');
    assert.ok(!nghi.some((t) => t.includes('bài')),
      `${c.key}: tấm NGHỈ đã in số bài rồi, nên trỏ vào thôi tiết lộ gì — tám con số ấy`
      + ' hiện hết từ giây đầu là quay về đúng cột "không giữ lại gì" của §2.8');
  }
});

test('thẻ của ngôi ĐANG ĐƯỢC NHẬN không chịu bậc thang 150–510 ms', () => {
  // MỘT LỖI CHỈ LỘ RA KHI BỎ CÚ PHÁT HẾT. Độ đặc trưng:
  //   bậc thang   `.cum .sao:nth-child(n) .chip` → 4 mức lớp
  //   ngôi nhận   `.sao[data-gan] .chip`         → 3 mức lớp
  // nên bậc thang THẮNG, và `--bac: 0ms` viết trong khối ngôi-được-nhận chưa
  // bao giờ có hiệu lực. Trước đây không ai thấy: cú hover đã bật sẵn cả chín
  // thẻ nên thẻ của ngôi được nhận đã nằm đó. Bỏ cú hover đi thì nó thành thứ
  // DUY NHẤT còn hiện khi trỏ vào bầu trời, và trễ tới nửa giây đọc ra thành
  // "chuột không ăn".
  const mucLop = (bo) => (bo.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) ?? []).length;
  assert.equal(mucLop('.cum .sao:nth-child(1) .chip'), 4);
  assert.equal(mucLop('.sao[data-gan] .chip'), 3);

  const iBac = CSS_CODE.search(/\.cum \.sao:nth-child\(1\) \.chip \{ --bac:/);
  assert.ok(iBac > 0, 'không tìm thấy bậc thang của tỉ lệ xa');

  const khoi = CSS_CODE.match(
    /\.cum \.sao\[data-gan\] \.chip,\s*\n\.cum \.sao\[data-sang\] \.chip,\s*\n\.cum \.sao:focus-visible \.chip \{([^}]*)\}/,
  );
  assert.ok(khoi,
    'không còn khối nào cân bằng độ đặc trưng với bậc thang cho BA đường tới ngôi được nhận'
    + ' — thẻ của ngôi con trỏ đang chỉ vào sẽ đến sau 150–510 ms tuỳ nó là ngôi thứ mấy');
  assert.match(khoi[1], /--bac:\s*0ms/, 'khối ấy không đưa độ trễ về 0');
  assert.equal(mucLop(khoi[0].slice(0, khoi[0].indexOf('{'))) / 3, 4,
    'ba bộ chọn ấy không cùng 4 mức lớp như bậc thang — chúng phải CÂN BẰNG rồi thắng bằng'
    + ' thứ tự, không thắng bằng `!important` (nhánh reduce còn phải tắt được transition)');
  assert.ok(CSS_CODE.indexOf(khoi[0]) > iBac,
    'khối ấy đứng TRƯỚC bậc thang — cùng độ đặc trưng thì chỉ thứ tự quyết, nên đứng trước'
    + ' là thua');
});

/* ─────────────────────────────────────────────────────────────────────────
   (A) · CHÍN THẺ KHÔNG CÒN TRANH CHỖ
   ───────────────────────────────────────────────────────────────────────── */

test('ở TỈ LỆ GẦN chỉ MỘT tên bài mở ra, không chín', () => {
  // Chín thẻ hai dòng neo vào chín ngôi trong một chòm đã co vào ~112–161 px
  // giữa hai ngôi gần nhau nhất: một cách xếp sạch có thể KHÔNG TỒN TẠI, nên
  // bản sửa không mượn luật nhường §8 của `build_sky.py` (nó còn được quyền
  // trượt build; một bộ máy chạy lúc chạy thì không). Thay vào đó tên bài theo
  // CHÚ Ý — `design/v3/tuong-tac-ban-do.md` §7 mục 2 — nên chỉ một thẻ mở một
  // lúc và không còn gì để chồng.
  const re = /\.frame\[data-phong\] \.sao:not\(\[data-gan\]\):not\(\[data-sang\]\):not\(:focus-visible\) \.tenBai \{([^}]*)\}/;
  const m = CSS_CODE.match(re);
  assert.ok(m,
    'ở tỉ lệ gần MỌI ngôi của chặng vẫn in tên bài thật — chín thẻ hai dòng neo vào chín'
    + ' ngôi, đúng ảnh chụp M6 mà chủ sản phẩm gửi (chữ cắt giữa chừng, một thẻ đè nút Thoát)');
  assert.match(m[1], /display:\s*none/);

  // BA ĐƯỜNG, KHÔNG HAI: cùng ba đường mà quầng sáng và viền ngôi đã dùng
  // (`[data-gan]` con trỏ · `[data-sang]` một dòng của cột bài · `:focus-visible`
  // bàn phím). Ba chỗ liệt kê ba đường là ba chỗ sẽ trôi xa nhau, và triệu
  // chứng là "đi bằng Tab thấy một bản đồ khác đi bằng chuột".
  for (const duong of ['\\[data-gan\\]', '\\[data-sang\\]', ':focus-visible']) {
    assert.match(CSS_CODE, new RegExp(`\\.sao${duong} \\.quang`),
      `đường \`${duong}\` không bật quầng sáng, nhưng nó lại được dùng để mở tên bài`);
  }

  // …và thẻ còn lại phải VẪN nói ngôi này là bài nào: bỏ nốt `thuTu` + `ma` là
  // quay về đúng bản đồ mà bấm vào chẳng tiết lộ gì — chỗ mà lời chê (1) đang
  // chỉ vào. Chúng là MỘT DÒNG (`6 PD03`), nên chúng không với tới thẻ bên
  // cạnh ở bất kỳ bề rộng nào.
  assert.match(CSS_CODE, /\.frame\[data-phong\] \.thuTu \{[^}]*display:\s*inline/);
  assert.match(CUR, /className=\{styles\.ma\}>\{s\.code\}/,
    'thẻ bài thôi in mã bài — ngôi thành một chấm vô danh ở cả hai tỉ lệ');
});

test('tên 48 bài có một chỗ ở ĐỌC ĐƯỢC: cột đứng CẠNH bản đồ, không nằm dưới', () => {
  // Gỡ chín cái tên ra khỏi chín cái thẻ chồng nhau chỉ là nửa bản sửa. Nửa
  // kia phải cho chúng một chỗ ở, nếu không bản sửa kia là một vụ xoá thông
  // tin. Danh sách đã tồn tại và đã nối hai chiều với bầu trời từ 19/10 —
  // nó chỉ đang nằm DƯỚI khung, tức ngoài màn hình ở hầu hết màn laptop đúng
  // lúc người ta vừa phóng vào và cần nó nhất.
  assert.match(TSX, /<div className=\{styles\.cot\}>/,
    'bảng bài không còn được bọc — không có gì để đặt vào cột thứ hai của lưới');
  assert.ok(TSX.indexOf('styles.cot') > TSX.lastIndexOf('<img'),
    'cái bọc đứng TRƯỚC tranh — nó phải là anh em ĐỨNG SAU `.frame`, nếu không nó chen vào'
    + ' giữa hợp đồng thứ tự DOM (luật 4 của page.tsx)');
  assert.ok(TSX.indexOf('data-bang=""') > TSX.indexOf('styles.cot'),
    'bảng bài nằm ngoài cái bọc');

  // Lưới chỉ bật ở màn ĐỦ RỘNG: dưới 1 200 px một cột 22rem ăn hết chỗ của
  // bức tranh, và `max-width` của `.rong` tự hạ xuống bề rộng màn nên điện
  // thoại phải giữ nguyên bố cục một cột.
  const mq = [...CSS_CODE.matchAll(/@media \(min-width: (\d+)px\)\s*\{([\s\S]*?)\n\}/g)]
    .find((m) => /\.rong\s*\{[^}]*display:\s*grid/.test(m[2]));
  assert.ok(mq, '`.rong` không thành lưới trong một `@media (min-width: …)` nào — cột bài sẽ'
    + ' hiện ở cả màn 390 px, nơi nó ăn hết chỗ của bức tranh');
  assert.ok(+mq[1] >= 1200, `ngưỡng lưới hai cột chỉ ${mq[1]}px`);
  assert.match(mq[2], /grid-template-columns:\s*minmax\(0, 1fr\) \d+rem/,
    'cột chứa khung không dùng `minmax(0, 1fr)` — `.frame` có `aspect-ratio`, nên một `1fr`'
    + ' trần lấy `min-width: auto` và khung đẩy lưới rộng hơn cả `main`');
  assert.match(mq[2], /\.rong > \* \{[^}]*grid-column:\s*1 \/ -1/,
    'không có luật mặc định "chiếm cả hai cột" — tiêu đề và chú giải sẽ rơi vào cột hẹp');
  assert.match(mq[2], /\.rong > \.frame \{[^}]*grid-column:\s*1/);
  assert.match(mq[2], /\.rong > \.cot \{[^}]*grid-column:\s*2/);
  // `.cot` phải có một quy tắc RIÊNG ngoài khối media: CSS module chỉ xuất lớp
  // nào xuất hiện trong tệp, và `styles.cot` là `undefined` thì React lặng lẽ
  // dựng `class="undefined"`.
  assert.match(CSS_CODE, /\n\.cot \{/,
    '`.cot` chỉ tồn tại trong khối media — gỡ khối đó ra là `styles.cot` thành `undefined`');
});

/* ─────────────────────────────────────────────────────────────────────────
   (B) · "VÀ HƠI LAG"
   ───────────────────────────────────────────────────────────────────────── */

test('ba tấm TRỜI nằm trong lớp hợp thành riêng — và hai con số nói vì sao', () => {
  // ĐO ĐƯỢC, không đoán — và đo THEO TỈ LỆ, không theo con số tuyệt đối: tấm
  // trời do `build_sky.py` sinh và nó đang được sửa từng ngày (đo 20/10/2026:
  // 269 420 byte, 259 nét, 172 vùng tô mờ; sáng cùng ngày là 284 613 / 325 /
  // 238). Một ngưỡng tuyệt đối ở đây là một ca sẽ đỏ vì người khác làm tranh
  // đẹp hơn. Cái PHẢI đúng là quan hệ: tấm trời nặng hơn CẢ MƯỜI TÁM tấm còn
  // lại cộng lại, nên nó là tấm duy nhất đáng một lớp riêng.
  const troi = doc('sky-troi.svg');
  const kia = ['sky-sao-nen.svg', 'sky-mach.svg',
    ...SKY_CONSTELLATIONS.flatMap((c) => [`sky-chom-${c.key}.svg`, `sky-chom-${c.key}-ro.svg`])]
    .map((f) => doc(f));
  const tongKia = kia.reduce((n, s) => n + s.length, 0);
  assert.ok(troi.length > tongKia,
    `tấm trời ${troi.length} byte, mười tám tấm kia cộng lại ${tongKia} byte — nó thôi là tấm`
    + ' đắt nhất, nên đọc lại chú thích ở `.troi` trước khi tin bản nâng lớp này còn đúng');
  // …và nó đắt vì số vùng tô BÁN TRONG SUỐT, không vì số nét: đó là lý do một
  // lượt vẽ lại nó đắt bằng lượt đầu (vùng mờ phải HOÀ, không ghi đè).
  const mo = (troi.match(/fill-opacity/g) ?? []).length;
  assert.ok(mo > 100,
    `tấm trời chỉ còn ${mo} vùng tô mờ — nếu tinh vân thôi vẽ bằng vùng mờ thì 13,4 MB bộ nhớ`
    + ' hình của ba lớp riêng không còn đáng, và bản sửa này phải đo lại');

  // Mười sáu tấm chòm đổi `opacity` bằng `transition`, nên Chrome NÂNG tấm
  // đang đổi lên một lớp riêng rồi HẠ xuống khi xong; mỗi lần nâng/hạ, vùng
  // tấm ấy vừa chiếm trong lớp chung phải vẽ lại — mà tấm nào ở đây cũng
  // `inset: 0`, tức vùng ấy LÀ CẢ KHUNG, tức cả 238 vùng tô mờ của tinh vân.
  // Chín tấm đổi mỗi lượt hover. Đẩy ba tấm trời sang lớp của chúng là lấy
  // phần đắt ra khỏi đường vẽ lại.
  assert.match(CSS_CODE, /\.troi \{[^}]*will-change:\s*transform/,
    'ba tấm trời không có lớp riêng — tinh vân 285 KB raster lại mỗi lượt con trỏ vào/ra'
    + ' một ô bấm');

  // …VÀ KHÔNG RẢI THÊM. Ba lớp 1360×820×4 B ≈ 13,4 MB; mười sáu tấm chòm cũng
  // nâng được, nhưng 16 × 4,4 MB ≈ 71 MB thì chính "máy rẻ" mà ràng buộc nhắc
  // tới là chỗ vỡ đầu tiên. `will-change` đúng MỘT lần trong cả tệp.
  assert.equal((CSS_CODE.match(/will-change/g) ?? []).length, 1,
    '`will-change` xuất hiện nhiều hơn một lần — nó là bộ nhớ hình, không phải một lời chúc'
    + ' may mắn rải lên thứ nào trông chậm');
});

test('vòng dò KHÔNG đo lại hộp khung mỗi khung hình', () => {
  // `getBoundingClientRect()` trông như một phép ĐỌC vô hại, và nó vô hại chỉ
  // khi bố cục đang SẠCH. Ở đây không bao giờ sạch: cuối mỗi khung hình
  // `nhan()`/`sangHang()` đặt `data-gan`/`data-sang`, mà `.sao[data-gan]` đổi
  // `border-color`, `outline` VÀ `z-index`. Nên lời gọi của khung hình SAU
  // buộc trình duyệt tính lại style và bố cục ngay tại chỗ, trên một cây có 19
  // tấm ảnh phủ kín khung, 48 thẻ neo và 48 quầng sáng — một lượt như thế mỗi
  // khung hình, suốt thời gian con trỏ còn di chuyển.
  const ve = CUR.slice(CUR.indexOf('const ve ='), CUR.indexOf('const diChuyen'));
  assert.ok(ve.length > 100, 'không tìm thấy hàm vẽ một khung của lớp con trỏ');
  assert.ok(!/getBoundingClientRect/.test(ve),
    'hàm vẽ một khung vẫn tự đo hộp khung — đó là một lượt bố cục cưỡng bức mỗi khung hình');
  assert.match(ve, /layHop\(\)/, 'hàm vẽ không đọc hộp đã đệm');

  // Hộp đổi vì ĐÚNG BA nguyên nhân, nên phải có đúng ba chỗ xoá nó. Thiếu cái
  // đầu là thiếu cái quan trọng nhất: cú phóng là điều hướng phía client, nên
  // KHÔNG sự kiện `resize` nào xảy ra, mà `.rong` thì nới `main` từ 1 100 lên
  // 1 560 px và lưới hai cột chia lại chỗ. Một hộp cũ ở đó nghĩa là vòng dò
  // nhận ngôi cách đó mấy trăm pixel — đúng triệu chứng "chuột hơi lệch" mà
  // `zoomToFrame()` sinh ra để chữa.
  assert.match(CUR, /new ResizeObserver\(xoaHop\)/,
    'không có `ResizeObserver` — cú phóng đổi cỡ khung mà không sự kiện nào báo');
  assert.match(CUR, /doCo\.observe\(khung\)/, '`ResizeObserver` không quan sát chính khung');
  assert.match(CUR, /addEventListener\('scroll', xoaHop, \{ capture: true, passive: true \}\)/,
    'cuộn trang không xoá hộp — `getBoundingClientRect()` tính theo khung nhìn, nên cuộn một'
    + ' pixel là hộp sai một pixel. `capture` để cuộn trong tổ tiên nào cũng tới');
  assert.match(CUR, /addEventListener\('pointerenter', xoaHop\)/,
    'không đo lại lúc con trỏ vào khung — phông hay ảnh tải xong xê dịch trang mà không có'
    + ' sự kiện nào cho việc đó');

  // Và cả ba phải tháo được: trang này điều hướng bằng `<Link>`, nên một
  // listener sót lại là một listener trên một cây DOM đã bỏ.
  assert.match(CUR, /doCo\.disconnect\(\)/, '`ResizeObserver` không được ngắt');
  for (const sk of ['pointerenter', 'scroll']) {
    assert.match(CUR, new RegExp(`removeEventListener\\('${sk}'`), `listener \`${sk}\` không tháo`);
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   LỜI CHÊ THỨ TƯ CÒN MỞ — và nó mở vì một ca test, không vì hết thời gian
   ───────────────────────────────────────────────────────────────────────── */

test('CHO HÀNH TINH CHUYỂN ĐỘNG vẫn bị một ca test của tệp khác chặn', () => {
  // *"nếu cho được các hành tinh nhỏ chuyển động, như thể người dùng đang thực
  // sự ngắm các chòm sao/hành tinh di chuyển thì càng tuyệt vời"* — lần thứ ba
  // chủ sản phẩm đòi sự sống.
  //
  // Nó CHƯA làm, và ca này là chỗ ghi lại vì sao, để không ai mở lại cuộc điều
  // tra từ đầu: `e2e/unit/star-map.test.mjs` có ca "không hiệu ứng TỰ CHẠY
  // nào: trang nạp xong là bản đồ đứng yên", và ca ấy cấm `@keyframes` lẫn
  // `animation:` trong `star-map.module.css`, cấm `setInterval` và cấm một
  // lượt rAF tự hẹn lượt sau trong `SkyCursor.tsx`. Lý do nó ghi ra là
  // *"chủ sản phẩm đã chốt chỉ hover mới động"* — một quyết định mà chính chủ
  // sản phẩm vừa ĐẢO NGƯỢC.
  //
  // Tức việc này không chặn vì kỹ thuật (lớp HTML chồng lên, chỉ
  // `transform`/`opacity`, `element.animate()` nên không một vòng đồng hồ nào
  // trong mã; dừng theo `prefers-reduced-motion` + `visibilitychange` +
  // `IntersectionObserver`). Nó chặn vì ca test kia phải được VIẾT LẠI cho
  // đúng quyết định mới, và tệp đó đang do một agent khác giữ. Lách bằng cách
  // đặt `@keyframes` vào một tệp CSS module khác thì ca kia vẫn xanh trong khi
  // câu nó khẳng định ("trang nạp xong là bản đồ đứng yên") thành sai — đúng
  // kiểu test nói dối mà AGENTS.md đã trả giá để học.
  const sm = read('e2e', 'unit', 'star-map.test.mjs');
  assert.match(sm, /!\/@keyframes\|animation:\/\.test\(CSS_CODE\)/,
    'ca "không hiệu ứng TỰ CHẠY nào" đã được viết lại — nếu nó thôi cấm hoạt ảnh tự chạy thì'
    + ' lời chê thứ tư làm được ngay, và ca test NÀY phải xoá đi cùng commit đó');
  assert.ok(!/@keyframes|animation:/.test(CSS_CODE),
    'CSS đã có hoạt ảnh tự chạy trong khi ca ở `star-map.test.mjs` vẫn cấm — hai tệp test'
    + ' đang nói hai điều trái nhau, và một trong hai đang nói dối');
});
