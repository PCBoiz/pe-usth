/**
 * HỘP XIN ĐỒNG Ý ghi nhật ký — những tính chất mà chỉ cái hộp này có.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: lớp ghi nhật ký đã dựng xong từ 28/10 và nằm im, vì
 * không có đường nào để người học nói "có" hay "không". Đây là đường đó. Nhưng
 * một hộp xin đồng ý KHÔNG phải một component bình thường: phần lớn tính chất
 * của nó là tính chất PHÁP LÝ, và chúng hỏng IM LẶNG — một hộp vẫn hiện ra, vẫn
 * bấm được, vẫn ghi vào DB, mà sự đồng ý nó thu được không hợp lệ.
 *
 * Bốn thứ được canh ở đây, và cả bốn đều là yêu cầu chứ không phải thẩm mỹ:
 *
 *  1. HAI NÚT NGANG NHAU. Luật đòi sự đồng ý TỰ NGUYỆN. Một nút "Đồng ý" to màu
 *     đậm cạnh một dòng chữ xám nhạt là lấy sự đồng ý bằng ma sát — thứ đó
 *     không phải sự đồng ý. Đây là tính chất dễ bị phá nhất, vì "làm nút chính
 *     nổi lên" là thứ ai cũng tưởng là cải thiện.
 *
 *  2. BẢN MÔ TẢ PHẢI KHỚP PHẠM VI THẬT. Hộp nói "xoá sau 90 ngày" trong khi
 *     `HAN_LUU_NGAY` ở backend là 365 thì sự đồng ý thu được bằng thông tin
 *     sai. Ca ở đây đọc CẢ HAI file và so — đó là phép so duy nhất bắt được nó.
 *
 *  3. `shouldAsk`, KHÔNG PHẢI `!granted`. Người đã TỪ CHỐI cũng là
 *     `granted: false`; hỏi lại họ mỗi lần mở bài là ép đồng ý bằng sự mệt mỏi.
 *
 *  4. LƯỢT GỌI TRẠNG THÁI NẰM TRONG `Promise.all`. Ba lượt nạp bài từng tuần tự
 *     mất 3,7 giây và đã sửa thành song song (~1,3 giây) — thêm lượt thứ tư nối
 *     đuôi là đi ngược bản sửa đó. Và nó phải xong TRƯỚC `datBoiCanhBai`, vì
 *     `ghi()` BỎ sự kiện khi cổng còn đóng chứ không xếp hàng.
 *
 * Không import `log-consent.ts` được: nó dùng alias `@/` mà `node --test` không
 * phân giải. Nên các ca dưới đây đọc NGUỒN — cùng cách `read-try-it.test.mjs`
 * canh chỗ gọi.
 *
 * ABLATION — đã gỡ từng mảnh và ĐẾM. Mười mảnh, mỗi mảnh đúng MỘT ca bắt (phủ
 * một-đối-một: không ca nào dư, không mảnh nào hở):
 *
 *   nút Đồng ý nổi hơn nút Không (thêm class riêng)      → 1 đỏ
 *   bỏ `flex: 1` — hai nút không còn chia đều             → 1 đỏ
 *   thêm nút đóng (×) cho hộp                             → 1 đỏ
 *   hộp nói 30 ngày trong khi backend giữ 90              → 1 đỏ
 *   bỏ lời hứa "không gửi mã nguồn"                       → 1 đỏ
 *   hiện hộp theo `!granted` thay vì `shouldAsk`          → 1 đỏ
 *   đọc đồng ý thành lượt thứ tư NỐI ĐUÔI                 → 1 đỏ
 *   client tự gửi `version` trong body                    → 1 đỏ
 *   tin vào `granted` vừa gửi thay vì kết quả máy chủ     → 1 đỏ
 *   `granted` ép kiểu lỏng bằng `Boolean()`               → 1 đỏ
 *
 * Nửa BACKEND của cổng này có ablation riêng, và đó là nửa chịu lực thật:
 * `learning-events.service.spec.ts` (gỡ `conHieuLuc` khỏi `record()` → 5 đỏ),
 * `learning-event-consent.spec.ts` (thôi so `version` → 3 đỏ; thôi hỏi lại khi
 * phiên bản đổi → 1 đỏ).
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const ROOT = join(FE, '..');

/** Đọc file và bỏ CR — cây mã này là CRLF và `.` của regex không khớp `\r`. */
const doc = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

/**
 * Bỏ chú thích trước khi so.
 *
 * CẦN, không phải cho gọn: bản đầu của ca "không có nút đóng (×)" tìm ký tự `×`
 * trong cả file và nó khớp vào CHÍNH DÒNG CHÚ THÍCH của ConsentBanner.tsx —
 * dòng viết "KHÔNG CÓ NÚT ĐÓNG (×)" để giải thích vì sao không có nó. Tức một
 * ca test đỏ vì file nói đúng điều ca test muốn. Cùng họ bẫy đã ghi trong
 * AGENTS.md (`noreferrer` khớp vào chú thích tiếng Việt của TryItButton).
 *
 * Giữ nguyên nội dung chuỗi: chỉ bỏ khối `/* *‌/` và dòng bắt đầu bằng `//`,
 * không bỏ `//` giữa dòng (có `https://` trong chuỗi).
 */
const boChuThich = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((d) => !d.trimStart().startsWith('//'))
    .join('\n');

const BANNER = doc(join(FE, 'src', 'components', 'python-studio', 'ConsentBanner.tsx'));
const CSS = doc(join(FE, 'src', 'components', 'python-studio', 'consent-banner.module.css'));
const LIB = doc(join(FE, 'src', 'lib', 'log-consent.ts'));
const HOOK = doc(join(FE, 'src', 'components', 'python-studio', 'useLessonData.ts'));
const SHELL = doc(join(FE, 'src', 'components', 'python-studio', 'StudioLesson.tsx'));
const KINDS = doc(join(ROOT, 'src', 'learning-events', 'learning-event-kinds.ts'));

// ---------------------------------------------------------------------------
// 1. HAI NÚT NGANG NHAU — tính chất dễ bị "cải thiện" nhất
// ---------------------------------------------------------------------------

test('hai nút dùng CÙNG MỘT class — không có nút chính nổi hơn', () => {
  // Đếm số lần class nút xuất hiện: đúng hai lần, và cả hai là `c.chon`. Nếu ai
  // thêm `c.chonChinh` cho nút Đồng ý thì ca này đỏ, và đó là lúc phải đọc lý
  // do 1 ở đầu ConsentBanner.tsx trước khi quyết.
  const soLanChon = (BANNER.match(/className=\{c\.chon\}/g) ?? []).length;
  assert.equal(soLanChon, 2, 'phải đúng hai nút, cùng class `chon`');
  assert.ok(
    !/className=\{c\.chonChinh\}|className=\{`\$\{c\.chon\}/.test(BANNER),
    'không được thêm biến thể class cho một trong hai nút',
  );
});

test('CSS của nút không có nền đậm/chữ trắng cho riêng một nút', () => {
  // `.chon` là class duy nhất của nút, nên mọi khác biệt về độ nổi phải đi qua
  // một selector thứ hai. Không có selector nào như thế là tính chất cần.
  const selectorNut = CSS.match(/^\.chon[^{]*\{/gm) ?? [];
  // `.chon`, `.chon:hover:not(:disabled)`, `.chon:disabled` — ba cái, không hơn.
  assert.equal(selectorNut.length, 3, `selector nút lạ: ${selectorNut.join(' ')}`);
  assert.ok(/\.chon\s*\{[^}]*flex:\s*1/.test(CSS), 'hai nút phải chia đều chiều ngang');
});

test('KHÔNG có nút đóng (×) và KHÔNG tự tắt sau một khoảng thời gian', () => {
  // Đóng hộp mà không trả lời là "im lặng", và Điều 9(4) nói im lặng không được
  // coi là đồng ý. Nhưng một hộp đóng được sẽ hiện lại lần sau, và hiện lại mãi
  // là ép đồng ý bằng sự mệt mỏi. Nên: phải trả lời một lần, rồi thôi.
  // So trên MÃ, không trên chú thích — xem `boChuThich` ở đầu file.
  const ma = boChuThich(BANNER);
  assert.ok(
    !/onDismiss|setTimeout|×|&times;/.test(ma),
    'hộp này không được đóng/tự tắt',
  );
  // Ba nút là quá một: chỉ "Đồng ý" và "Không, cảm ơn".
  const soNut = (ma.match(/<button/g) ?? []).length;
  assert.equal(soNut, 2);
});

test('không chặn bài học — `aria-modal` phải là false', () => {
  // Chặn bài học để lấy sự đồng ý là đúng định nghĩa của sự đồng ý bị cưỡng
  // chế. `role="dialog"` thì đúng (nó là hộp cần trả lời), nhưng modal thì sai.
  assert.ok(/role="dialog"/.test(BANNER));
  assert.ok(/aria-modal=\{false\}/.test(BANNER), 'aria-modal phải tường minh là false');
});

// ---------------------------------------------------------------------------
// 2. BẢN MÔ TẢ KHỚP PHẠM VI THẬT — phép so duy nhất bắt được sự lệch này
// ---------------------------------------------------------------------------

test('số ngày trong hộp KHỚP `HAN_LUU_NGAY` của backend', () => {
  // Hộp nói "90 ngày" trong khi backend giữ 365 là thu thập dữ liệu dưới một
  // sự đồng ý lấy bằng thông tin sai. Hai con số ở hai cây mã khác nhau nên
  // không có gì ngoài ca này ghép chúng lại.
  const mBackend = /export const HAN_LUU_NGAY = (\d+);/.exec(KINDS);
  assert.ok(mBackend, 'không đọc được HAN_LUU_NGAY ở backend');
  const ngay = Number(mBackend[1]);

  const mHop = /hanLuu:\s*'[^']*?(\d+)\s*ngày/.exec(LIB);
  assert.ok(mHop, 'không đọc được số ngày trong MO_TA_PHAM_VI.hanLuu');
  assert.equal(
    Number(mHop[1]),
    ngay,
    `hộp nói ${mHop[1]} ngày nhưng backend giữ ${ngay} ngày`,
  );
});

test('hộp nói rõ hai thứ KHÔNG bị gửi: mã nguồn (kể cả hash) và thông tin cá nhân', () => {
  // Đây là hai câu hỏi đầu tiên người ta thật sự có. Bỏ chúng đi thì người học
  // phải tự đoán, và họ đoán theo hướng xấu. Và cả hai là sự thật kiểm được:
  // `code`/`codeHash` nằm trong `KHOA_CAM_PAYLOAD` ở backend.
  assert.ok(/KHÔNG gửi mã Python/.test(LIB), 'phải nói rõ không gửi mã nguồn');
  assert.ok(/hash/i.test(LIB), 'phải nói rõ kể cả dạng hash — đó là chỗ người ta nghi');
  assert.ok(/KHÔNG có tên, email/.test(LIB));
  // Và lời hứa đó phải ĐÚNG: hai khoá thật sự bị cấm ở backend.
  assert.ok(/'codeHash'/.test(KINDS), 'codeHash phải nằm trong KHOA_CAM_PAYLOAD');
  assert.ok(/'code'/.test(KINDS), 'code phải nằm trong KHOA_CAM_PAYLOAD');
});

test('bản mô tả nằm cạnh PHIÊN BẢN, không rải trong component', () => {
  // Khi phạm vi thu thập đổi, ca ghim ở learning-event-consent.spec.ts đỏ và câu
  // dặn ở đó trỏ tới ĐÚNG MỘT chỗ phải sửa. Rải nguyên văn vào JSX là làm câu
  // dặn đó sai.
  assert.ok(/MO_TA_PHAM_VI/.test(BANNER), 'component phải đọc từ MO_TA_PHAM_VI');
  assert.ok(
    !/Chúng tôi ghi lại bạn mở bài|xoá toàn bộ sau/.test(BANNER),
    'nguyên văn mô tả không được viết trong component',
  );
});

// ---------------------------------------------------------------------------
// 3. `shouldAsk`, KHÔNG PHẢI `!granted`
// ---------------------------------------------------------------------------

test('hộp hiện theo `shouldAsk`, không theo `!granted`', () => {
  // Người đã TỪ CHỐI cũng là `granted: false`. Dùng `!granted` là hỏi lại họ ở
  // mỗi lần mở bài — và một hộp hiện lại mãi thì sự đồng ý nó thu được không
  // còn tự nguyện.
  assert.ok(
    /consent\?\.shouldAsk\s*\?\s*<ConsentBanner/.test(SHELL),
    'StudioLesson phải dựng hộp theo consent?.shouldAsk',
  );
  assert.ok(
    !/!consent\?\.granted\s*\?\s*<ConsentBanner/.test(SHELL),
    'không được dựng hộp theo !granted',
  );
});

test('`consent === null` (chưa đọc xong) KHÔNG hiện hộp', () => {
  // `consent?.shouldAsk` với `consent === null` ra `undefined` → falsy → không
  // hiện. Ca này khoá việc giữ `?.` — đổi sang `consent.shouldAsk` là vừa ném
  // lúc chưa nạp xong, vừa (nếu ai thêm giá trị khởi tạo `shouldAsk: true`)
  // làm hộp loé lên một nhịp ở MỌI lần mở bài, kể cả của người đã trả lời.
  assert.ok(/const \[consent, setConsent\] = useState<TrangThaiDongY \| null>\(null\)/.test(HOOK));
  assert.ok(/consent\?\./.test(SHELL), 'phải giữ optional chaining');
});

// ---------------------------------------------------------------------------
// 4. LƯỢT GỌI TRẠNG THÁI NẰM TRONG `Promise.all`, TRƯỚC `datBoiCanhBai`
// ---------------------------------------------------------------------------

test('`napTrangThaiDongY` nằm TRONG Promise.all, không là lượt thứ tư nối đuôi', () => {
  const m = /const \[profile, enrolledBody, contentDau, dongY\] = await Promise\.all\(\[([\s\S]*?)\]\)/.exec(
    HOOK,
  );
  assert.ok(m, 'không thấy Promise.all bốn nhánh');
  assert.ok(/napTrangThaiDongY\(\)/.test(m[1]), 'lượt đọc đồng ý phải ở trong Promise.all');
  // Và đúng BỐN nhánh — thêm nhánh thứ năm thì phải đọc lại chú thích về 3,7 s
  // trước, vì mỗi nhánh là một connection nữa trong pool của Neon.
  //
  // Đếm bằng `\w+\(` (lời gọi hàm), không bằng `\(\)`: bản đầu của ca này đếm
  // cặp ngoặc RỖNG và chỉ thấy 1, vì ba nhánh kia đều có đối số —
  // `json('/api/user')`. Một phép đếm sai làm ca test đỏ ở chỗ mã đúng.
  const soNhanh = (m[1].match(/\w+\(/g) ?? []).length;
  assert.equal(soNhanh, 4, `phải đúng 4 nhánh, đang có ${soNhanh}`);
});

test('cổng ghi mở TRƯỚC `datBoiCanhBai` — nếu không là mất `X-Lesson.Open`', () => {
  // `ghi()` BỎ sự kiện khi cổng còn đóng chứ không xếp hàng. Cổng mở sau
  // `datBoiCanhBai` là mất hẳn sự kiện mở bài của lượt đó — câu SQL drop-off
  // đếm thiếu đúng lượt mở bài ĐẦU TIÊN của mỗi người.
  const viTriNap = HOOK.indexOf('napTrangThaiDongY()');
  const viTriBoiCanh = HOOK.indexOf('datBoiCanhBai({');
  assert.ok(viTriNap > 0 && viTriBoiCanh > 0);
  assert.ok(
    viTriNap < viTriBoiCanh,
    'napTrangThaiDongY phải chạy trước datBoiCanhBai',
  );
});

test('quyết định lấy trạng thái từ MÁY CHỦ TRẢ VỀ, không từ `granted` vừa gửi', () => {
  // Máy chủ không ghi được (429, mất mạng) mà client tin vào giá trị mình vừa
  // gửi thì hộp biến mất trong khi chưa có bản ghi nào — người học tưởng đã trả
  // lời xong, và lớp ghi hoặc bật sai hoặc tắt sai.
  assert.ok(
    /const tt = await guiQuyetDinhDongY\(granted\);\s*\n\s*setConsent\(tt\);/.test(HOOK),
    'decideConsent phải setConsent bằng kết quả máy chủ trả về',
  );
  assert.ok(
    !/setConsent\(\{[^}]*granted\s*[,}]/.test(HOOK),
    'không được tự dựng trạng thái từ giá trị vừa gửi',
  );
});

test('client KHÔNG gửi `version` — máy chủ đặt nó', () => {
  // Client gửi phiên bản nghĩa là một bản client CŨ ghi được "đã đồng ý với bản
  // hiện hành" trong khi hộp nó hiện ra là bản mô tả CŨ — bản ghi nói sai về
  // điều người học thật sự đã đọc, đúng cái mà cột đó tồn tại để nói đúng.
  const m = /body: JSON\.stringify\(\{([^}]*)\}\)/.exec(LIB);
  assert.ok(m, 'không thấy body của POST consent');
  assert.ok(/granted/.test(m[1]));
  assert.ok(!/version/.test(m[1]), 'body không được mang version');
});

test('không đọc được trạng thái -> cổng ĐÓNG, và KHÔNG hỏi', () => {
  // Hướng lệch không đối xứng: đoán "đã đồng ý" là gửi dữ liệu đi; đoán "chưa
  // hỏi" là làm phiền đúng người vừa nói không. Cả hai tệ hơn việc im lặng một
  // lượt mở bài.
  const m = /const KHI_KHONG_DOC_DUOC: TrangThaiDongY = \{([\s\S]*?)\};/.exec(LIB);
  assert.ok(m, 'không thấy KHI_KHONG_DOC_DUOC');
  assert.ok(/granted: false/.test(m[1]));
  assert.ok(/shouldAsk: false/.test(m[1]));
  // Và nhánh catch phải ĐÓNG cổng tường minh, không dựa vào giá trị khởi tạo:
  // hàm có thể được gọi lại sau khi người học đã đồng ý ở lượt trước.
  assert.ok(
    (LIB.match(/datDongYGhiNhatKy\(false\)/g) ?? []).length >= 2,
    'cả hai nhánh catch phải đóng cổng tường minh',
  );
});

test('`granted` so bằng `=== true`, không qua phép ép kiểu lỏng', () => {
  // Chuỗi `"false"` là truthy. Đây là cờ quyết định có thu dữ liệu NHẠY CẢM hay
  // không, nên nó không được đi qua `Boolean(...)` hay `!!`.
  assert.ok(/granted: o\.granted === true/.test(LIB));
  assert.ok(!/Boolean\(o\.granted\)|!!o\.granted/.test(LIB));
});
