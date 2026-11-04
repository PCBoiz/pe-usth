/**
 * NÚT "QUAY LẠI" ở thanh dưới của bài học.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: đợt thử nghiệm 27/10/2026, NĂM người thử độc lập
 * nhau cùng báo một chuyện — "không có nút back", "chưa có nút return", "sao
 * không cho quay lại lỡ bấm nhầm nút tiếp theo". Một người trong đó tự nhận
 * làm frontend.
 *
 * Mà cái cơ chế quay lại thì ĐÃ CÓ từ lâu: `goTo()` nhận số màn bất kỳ, và
 * thanh tiến độ trên đỉnh dựng mỗi đoạn đã đi qua thành một <button> gọi
 * `onSeek`. Nghĩa là lỗi KHÔNG phải thiếu chức năng — nó là thiếu thứ trông
 * như bấm được. Thanh tiến độ là một dải đoạn cao 4px không viền không nhãn;
 * một người thử viết nguyên văn "ko có nút back mà bấm trên thanh tiến độ để
 * chuyển à", tức họ phải ĐOÁN ra. Đó là lý do ca test ở đây canh CÁI NÚT, chứ
 * `onSeek` có tồn tại hay không thì nó đã tồn tại sẵn rồi.
 *
 * Cái giá người thử trả khi không tìm ra: đóng bài rồi mở lại từ danh sách —
 * và một người báo tiếp rằng mở lại thì danh sách bung về module 1, phải dò
 * lại bài đang học.
 *
 * Năm tính chất được canh, mỗi cái vì một cách hỏng CỤ THỂ:
 *
 *  1. NÚT CÓ THẬT, và nó gọi `goTo` chứ không `history.back()`. Bài học là một
 *     trang duy nhất đổi `d.step`, nên `history.back()` sẽ RỜI bài.
 *  2. ẨN Ở MÀN 1. Không có màn trước để lùi về; một nút bấm vào không làm gì
 *     là tệ hơn không có nút.
 *  3. TẮT Ở CÁC KHUNG KHÔNG CÓ NỘI DUNG (đang tải, lỗi, chưa ghi danh, bài
 *     rỗng). Mấy khung đó dựng cùng `frame()` nên thừa hưởng mọi prop — quên
 *     một cái là có nút quay lại trên màn "Đang tải bài học…".
 *  4. DÙNG LẠI `goTo`, không viết đường đi thứ hai. `goTo` xoá kết quả chấm
 *     của màn cũ, đóng gợi ý và cuộn lên đầu. Tự `setDraft({step: ...})` là bỏ
 *     cả ba, và màn mới mở ra kèm băng "Chưa đúng" của màn trước đó.
 *  5. CHỮ "Quay lại" CÒN TRONG DOM ở màn hẹp. Nút co về còn mũi tên là đúng
 *     chỗ hẹp, nhưng `display: none` thì trình đọc màn hình mất tên nút.
 *
 * ABLATION — gỡ từng mảnh rồi đếm:
 *   bỏ hẳn <button> trong LessonChrome              → 3 đỏ
 *   bỏ điều kiện `step > 1`                         → 1 đỏ
 *   `onBack` gọi history.back()                     → 1 đỏ
 *   quên `onBack: undefined` ở một khung lỗi         → 1 đỏ
 *   `.backText { display: none }` ở @media          → 1 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');

/** Đọc file và bỏ CR — cây mã này là CRLF và `.` của regex không khớp `\r`. */
const doc = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

/**
 * Bỏ chú thích trước khi so. CẦN, không phải cho gọn: chính file này giải
 * thích vì sao không dùng `history.back()`, nên một ca tìm chuỗi đó trong cả
 * file sẽ đỏ vì nguồn NÓI ĐÚNG điều ca test muốn. Cùng họ bẫy đã ghi trong
 * AGENTS.md (`noreferrer` khớp vào chú thích tiếng Việt của TryItButton).
 */
const boChuThich = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((d) => !d.trimStart().startsWith('//'))
    .join('\n');

const CHROME = doc(join(FE, 'src', 'components', 'lesson-chrome', 'LessonChrome.tsx'));
const CSS = doc(join(FE, 'src', 'components', 'lesson-chrome', 'LessonChrome.module.css'));
const SHELL = doc(join(FE, 'src', 'components', 'python-studio', 'StudioLesson.tsx'));

// ---------------------------------------------------------------------------
// 1. NÚT CÓ THẬT
// ---------------------------------------------------------------------------

test('LessonChrome dựng một <button> gọi onBack', () => {
  const ma = boChuThich(CHROME);
  assert.match(
    ma,
    /<button[\s\S]{0,400}?onClick=\{onBack\}/,
    'Không thấy nút nào gọi onBack. Năm người thử ngày 27/10 đều báo thiếu nút '
      + 'quay lại — đọc lý do ở đầu LessonChrome.tsx trước khi gỡ.',
  );
});

test('nút mang chữ "Quay lại" — không chỉ một mũi tên', () => {
  // Mũi tên một mình thì trình đọc màn hình đọc ra "button", và người nhìn
  // cũng phải đoán. Chữ là thứ làm nó thành nút quay lại.
  assert.match(boChuThich(CHROME), />Quay lại</);
});

test('onBack là prop tuỳ chọn — khung nào không có màn thì không truyền', () => {
  assert.match(CHROME, /onBack\?: \(\) => void;/);
});

// ---------------------------------------------------------------------------
// 2. ẨN Ở MÀN 1
// ---------------------------------------------------------------------------

test('nút chỉ dựng khi step > 1', () => {
  const ma = boChuThich(CHROME);
  assert.match(
    ma,
    /\{onBack && step > 1 &&/,
    'Ở màn đầu không có màn nào để lùi về. Một nút bấm vào không làm gì tệ hơn '
      + 'không có nút.',
  );
});

// ---------------------------------------------------------------------------
// 3 + 4. NỐI ĐÚNG Ở StudioLesson
// ---------------------------------------------------------------------------

test('onBack dùng lại goTo, KHÔNG dùng history.back()', () => {
  const ma = boChuThich(SHELL);
  assert.match(
    ma,
    /onBack=\{\(\) => goTo\(d\.step - 1\)\}/,
    'Phải đi qua goTo: nó xoá kết quả chấm của màn cũ, đóng gợi ý và cuộn lên '
      + 'đầu. Thiếu một trong ba thì màn mới mở kèm băng "Chưa đúng" của màn cũ.',
  );
  assert.ok(
    !/history\.back\(\)/.test(ma),
    'Bài học là MỘT trang đổi d.step, nên history.back() sẽ rời hẳn bài học.',
  );
});

test('mọi khung không có nội dung bài đều tắt onBack', () => {
  const ma = boChuThich(SHELL);
  // Bốn khung dựng bằng `frame()` mà không có màn nào: đang tải, lỗi nạp, chưa
  // ghi danh, bài rỗng. Chúng thừa hưởng MỌI prop mặc định của frame(), nên
  // quên một cái là có nút "Quay lại" trên màn "Đang tải bài học…".
  const tat = ma.match(/onSeek: undefined/g) ?? [];
  const tatBack = ma.match(/onBack: undefined/g) ?? [];
  assert.equal(
    tatBack.length,
    tat.length,
    `Có ${tat.length} khung tắt onSeek nhưng chỉ ${tatBack.length} khung tắt `
      + 'onBack. Hai thứ này đi cùng nhau: khung nào không có màn để nhảy tới '
      + 'thì cũng không có màn để lùi về.',
  );
  assert.ok(tat.length >= 4, 'Phải còn đủ bốn khung không-có-nội-dung.');
});

// ---------------------------------------------------------------------------
// 5. MÀN HẸP: co nút, KHÔNG xoá tên nút
// ---------------------------------------------------------------------------

test('.backText ẩn bằng clip, không bằng display:none', () => {
  const khoi = /\.backText \{([^}]*)\}/.exec(CSS);
  assert.ok(khoi, 'Không còn quy tắc .backText nào — chữ nút đi đâu?');
  assert.ok(
    !/display:\s*none/.test(khoi[1]),
    'display:none bỏ phần tử khỏi cây hỗ trợ tiếp cận, nút mất tên. Dùng '
      + 'clip-path: inset(50%) như hiện tại.',
  );
  assert.match(khoi[1], /clip-path/);
});

// ---------------------------------------------------------------------------
// 4. KHÔNG NHẢY BỐ CỤC KHI NỘI DUNG BÀI VỀ
// ---------------------------------------------------------------------------
//
// Khung "Đang tải bài học…" dựng TRƯỚC, nội dung bài về SAU. Đo trên production
// (1440×900, phiên đang học dở ở màn 12/13) cú chuyển đó là MỘT layout shift
// 0,0424, ghép từ hai thứ:
//   · thanh cuộn hiện ra (khung tải ngắn hơn màn, nội dung thì không) ⇒ cả
//     trang dời trái: cột 360 → 352, pill 1230 → 1215 — đúng 15px rãnh cuộn;
//   · nút "Quay lại" chỉ dựng khi nội dung đã về và step > 1 ⇒ ô trái cao
//     17 → 40px, nhãn "Tiến độ tự lưu" nhảy lên 12px.
// Sửa cả hai thì đo còn 0,0057 — và 0,0048 trong đó là do chính phép thử chèn
// CSS sau khi trang đã vẽ, tức bản thật còn khoảng 0,0009.

/** Tách CSS thành phạm vi: '' (gốc) và từng `@media (…)`, theo dấu ngoặc. */
function phamVi(css) {
  const sach = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = { '': '' };
  let i = 0;
  while (i < sach.length) {
    const m = sach.indexOf('@media', i);
    if (m < 0) { out[''] += sach.slice(i); break; }
    out[''] += sach.slice(i, m);
    const mo = sach.indexOf('{', m);
    let sau = 1, j = mo + 1;
    while (j < sach.length && sau > 0) { if (sach[j] === '{') sau++; else if (sach[j] === '}') sau--; j++; }
    const ten = sach.slice(m, mo).trim();
    out[ten] = (out[ten] || '') + sach.slice(mo + 1, j - 1);
    i = j;
  }
  return out;
}
/** Giá trị px của `thuoc` trong khối `.lop {…}` của một phạm vi, hoặc null. */
function px(khoi, lop, thuoc) {
  const dau = khoi.indexOf(`.${lop} {`);
  if (dau < 0) return null;
  const than = khoi.slice(dau, khoi.indexOf('}', dau));
  const d = than.split(/[;{]/).map((x) => x.trim()).find((x) => x.startsWith(`${thuoc}:`));
  if (!d) return null;
  const so = /^(\d+(?:\.\d+)?)px$/.exec(d.slice(thuoc.length + 1).trim());
  return so ? Number(so[1]) : null;
}

test('ô trái GIỮ CHỖ cho nút "Quay lại" ở MỌI khổ màn — nhãn lưu không nhảy khi bài về', () => {
  const pv = phamVi(CSS);
  const gocNut = px(pv[''], 'backBtn', 'height');
  const gocO = px(pv[''], 'leftSlot', 'min-height');
  assert.ok(gocNut, 'Không đọc được height của .backBtn gốc — đổi cấu trúc thì sửa ca này.');
  for (const [ten, khoi] of Object.entries(pv)) {
    const nut = px(khoi, 'backBtn', 'height') ?? gocNut;
    const o = px(khoi, 'leftSlot', 'min-height') ?? gocO;
    assert.ok(
      o !== null && o >= nut,
      `${ten || 'gốc'}: .leftSlot min-height ${o ?? 'không khai'} < nút Quay lại ${nut}px — `
        + 'nút chỉ dựng khi nội dung đã về, nên ô nở ra đúng lúc bài hiện và nhãn lưu nhảy.',
    );
  }
});

test('rãnh thanh cuộn giữ ở trang bài học — và CHỈ ở đó', () => {
  const sach = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(
    sach,
    /:global\(html\):has\(\.chrome\)\s*\{\s*scrollbar-gutter:\s*stable;/,
    'Thiếu rãnh thanh cuộn: khung tải không có thanh cuộn, nội dung thì có ⇒ cả '
      + 'trang dời 15px sang trái mỗi lần mở bài (đo: cột 360 → 352).',
  );
  // Đặt trên `html` trần thì trang chủ Góc học (cảnh tràn màn, overflow:hidden)
  // nhận một dải trống 15px dọc mép phải — rãnh vẫn được chừa khi overflow là
  // hidden. Quét MỌI file CSS: khai báo nào cũng phải nằm trong selector :has(.
  const tep = [];
  const di = (thuMuc) => {
    for (const e of readdirSync(thuMuc, { withFileTypes: true })) {
      const p = join(thuMuc, e.name);
      if (e.isDirectory()) di(p);
      else if (e.name.endsWith('.css')) tep.push(p);
    }
  };
  di(join(FE, 'src'));
  di(join(FE, 'public', 'static', 'css'));
  for (const p of tep) {
    const s = doc(p).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of s.matchAll(/scrollbar-gutter\s*:/g)) {
      const selector = s.slice(s.lastIndexOf('}', m.index) + 1, s.lastIndexOf('{', m.index));
      assert.ok(
        selector.includes(':has('),
        `${p.slice(FE.length + 1)}: scrollbar-gutter trên "${selector.trim()}" — không giới hạn `
          + 'bằng :has(...) thì nó chạm cả trang chủ.',
      );
    }
  }
});
