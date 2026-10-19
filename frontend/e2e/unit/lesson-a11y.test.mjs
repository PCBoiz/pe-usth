// Khả năng tiếp cận của MÀN HỌC BÀI (`/lesson/python_advanced`) — nơi học viên
// ngồi suốt 35 phút, 48 bài × 10 màn, 16 loại màn. Ba lỗi đang chữa, cả ba đều
// chặn người dùng bàn phím / trình đọc màn hình khỏi việc LÀM BÀI:
//
//  1. KHÔNG CÓ VÒNG TIÊU ĐIỂM ở gần như mọi điều khiển trong bài.
//     Trang bài học chỉ nạp `edu-theme.css` + `studio-tokens.css`; quy tắc
//     `button:focus-visible` toàn cục nằm ở `auth.css` và `lesson_db_design.css`
//     — hai file trang này KHÔNG nạp, và layout gốc không import CSS global
//     nào. Tab đi được, nhưng không vẽ gì: thẻ token, ô trống ①②③, dòng lệnh
//     trong kho, phương án trắc nghiệm, "Đặt lại các ô"… đều vô hình với người
//     dùng bàn phím. (WCAG 2.4.7)
//
//  2. SANG MÀN MỚI THÌ TIÊU ĐIỂM ĐỨNG YÊN và không có gì được loan báo.
//     Nút "Tiếp tục" nằm ở thanh dưới, NGOÀI khối `key={step}` bị dựng lại,
//     nên bấm nó thay sạch nội dung mà tiêu điểm vẫn ở nguyên trên nút. Người
//     dùng trình đọc màn hình không biết đã sang màn khác.
//
//  3. VÙNG SỐNG CỦA KẾT QUẢ CHẤM SINH RA CÙNG LÚC VỚI NỘI DUNG.
//     Băng "Chính xác!/Chưa đúng" tự mang `role="status"` nhưng chỉ được dựng
//     khi bấm "Kiểm tra" — trình đọc màn hình theo dõi thay đổi TRONG một vùng
//     sống đã có sẵn, nên một vùng vừa chèn vào thì có máy đọc có máy im.
//
// GỠ BẢN SỬA RA THÌ TRƯỢT (đo 20/10/2026, gây lại từng mảnh rồi phục hồi):
//   · bỏ khối `:where(.chrome) … :focus-visible` khỏi LessonChrome.module.css
//     → 2 ca trượt (mục 1)
//   · bỏ `ref`/`tabIndex`/`aria-label`/`useEffect` khỏi LessonChrome.tsx
//     → 4 ca trượt (mục 2)
//   · trả `role="status"` về FeedbackBanner.tsx và bỏ vỏ `<div role="status">`
//     khỏi ScreenShell → 3 ca trượt (mục 3)
//   Tổng 9/10; ca còn lại ("tiền đề của lỗi") canh điều kiện khiến ba bản sửa
//   này cần tồn tại, nên nó ĐÚNG là phải xanh cả trước lẫn sau.
//
// BẪY `\b` TRONG TEMPLATE LITERAL: trong repo này đã hai lần một ca dùng
// `` `\bfoo` `` làm "ranh giới từ" trong khi JS hiểu đó là ký tự BACKSPACE
// (U+0008), nên ca vẫn XANH mà không kiểm gì. Mọi mẫu dưới đây viết bằng
// `String.raw` hoặc literal chính quy, và ca cuối cùng TỰ KIỂM luật so khớp
// còn phân biệt được.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { cssRules } from './ds-contrast.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const CHROME_CSS = read('src/components/lesson-chrome/LessonChrome.module.css');
const CHROME_TSX = read('src/components/lesson-chrome/LessonChrome.tsx');
const SHELL_TSX = read('src/components/python-studio/screens/chrome.tsx');
const BANNER_TSX = read('src/components/lesson-chrome/exercises/FeedbackBanner.tsx');
const LESSON_PAGE = read('src/app/(standalone)/lesson/python_advanced/page.tsx');

/** Bỏ chú thích JSX/JS để không so khớp trúng chữ trong lời giải thích. */
const code = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

// ── 1. Vòng tiêu điểm phủ hết màn học bài ────────────────────────────────

/** Mọi quy tắc `:focus-visible` trong LessonChrome.module.css. */
const focusRules = () =>
  cssRules(CHROME_CSS).filter((r) => r.prelude.includes(':focus-visible'));

test('tiền đề của lỗi: trang bài học KHÔNG nạp file CSS mang vòng tiêu điểm toàn cục', () => {
  // Nếu một ngày trang nạp thêm `auth.css`/`lesson_db_design.css` thì lưới an
  // toàn dưới đây thành thừa — ca này nói cho người sau biết vì sao nó có mặt.
  const globalRing = read('public/static/css/auth.css');
  assert.match(
    globalRing,
    new RegExp('button:focus-visible'),
    'auth.css vốn là nơi giữ vòng tiêu điểm toàn cục — nó biến mất thì ca này mất nghĩa',
  );
  for (const file of ['auth.css', 'lesson_db_design.css', 'style.css']) {
    assert.ok(
      !LESSON_PAGE.includes(file),
      `trang bài học nay có nạp ${file} — đọc lại xem lưới an toàn trong LessonChrome.module.css còn cần không`,
    );
  }
});

test('mọi điều khiển trong khung bài học đều có vòng tiêu điểm dự phòng', () => {
  const fallback = focusRules().find((r) => r.prelude.includes(':where(.chrome)'));
  assert.ok(
    fallback,
    'không còn quy tắc `:where(.chrome) … :focus-visible` — Tab khắp bài học mà không vẽ gì',
  );
  // Phải phủ ĐỦ các loại thẻ bấm được có thật trong 16 màn: nút (thẻ token,
  // phương án, dòng code), ô nhập (điền chỗ trống, bảng theo dõi biến), vùng
  // soạn mã, <summary> (các khối "Mô tả hàm"/"File trong thư mục bài").
  for (const tag of ['button', 'a', 'input', 'textarea', 'select', 'summary', '[tabindex]']) {
    assert.ok(
      fallback.prelude.includes(tag),
      `vòng tiêu điểm dự phòng bỏ sót ${tag}`,
    );
  }
  assert.match(
    fallback.body,
    new RegExp('outline:\\s*\\d+px\\s+solid'),
    'vòng tiêu điểm phải là `outline` đặc, không phải đổi màu nền',
  );
  assert.ok(
    !/outline:\s*(none|0)\b/.test(fallback.body),
    'quy tắc này mà tắt outline thì nó chính là lỗi, không phải bản sửa',
  );
});

test('lưới an toàn không đè lên vòng tiêu điểm tự khai (độ đặc hiệu thấp nhất)', () => {
  // Viết `:where(.chrome) :where(…)` để độ đặc hiệu chỉ còn (0,1,0) của
  // `:focus-visible`. Bỏ `:where` đi là quy tắc này THẮNG
  // `.closeBtn:focus-visible`, `textarea.codeBody:focus-visible`,
  // `.playBtn:focus-visible`… — tức một bản sửa a11y đi dẫm lên ba bản sửa
  // a11y trước đó.
  const fallback = focusRules().find((r) => r.prelude.includes('.chrome'));
  assert.ok(fallback, 'không tìm thấy quy tắc dự phòng để đo độ đặc hiệu');
  const selector = fallback.prelude.replace(/\s+/g, ' ');
  assert.match(
    selector,
    new RegExp(':where\\(\\s*\\.chrome\\s*\\)'),
    '`.chrome` phải nằm trong `:where()` — không thì lưới an toàn đè lên quy tắc riêng',
  );
  assert.match(
    selector,
    new RegExp(':where\\([^)]*button[^)]*\\)'),
    'danh sách thẻ phải nằm trong `:where()` — cùng lý do',
  );
});

// ── 2. Tiêu điểm khi sang màn mới ────────────────────────────────────────

test('khối nội dung của màn là một đích đến nhận được tiêu điểm', () => {
  const src = code(CHROME_TSX);
  assert.match(
    src,
    new RegExp('key=\\{step\\}[\\s\\S]{0,400}?tabIndex=\\{-1\\}'),
    'khối `key={step}` không có tabIndex={-1} — không dời tiêu điểm vào được',
  );
  assert.match(
    src,
    new RegExp('key=\\{step\\}[\\s\\S]{0,400}?ref=\\{stepRef\\}'),
    'khối `key={step}` không gắn ref — useEffect không với tới nó',
  );
});

test('đích đến có TÊN, nếu không trình đọc màn hình chỉ kêu "nhóm"', () => {
  const src = code(CHROME_TSX);
  const label = new RegExp('aria-label=\\{`Màn \\$\\{step\\} trên \\$\\{totalSteps\\}`\\}');
  assert.match(src, label, 'khối màn thiếu aria-label nói số màn hiện tại');
  assert.match(
    src,
    new RegExp('key=\\{step\\}[\\s\\S]{0,400}?aria-label='),
    'aria-label phải nằm trên chính khối `key={step}`',
  );
});

test('tiêu điểm được dời MỖI lần đổi bước', () => {
  const src = code(CHROME_TSX);
  assert.match(
    src,
    new RegExp('stepRef\\.current\\?\\.focus\\(\\)'),
    'không còn lời gọi focus() — sang màn mới là mất dấu',
  );
  // Phụ thuộc phải là [step]: để [] thì chỉ chạy một lần, để trống thì chạy
  // mỗi lần render (cướp tiêu điểm giữa lúc người học đang gõ code).
  assert.match(
    src,
    new RegExp('stepRef\\.current\\?\\.focus\\(\\)[\\s\\S]{0,80}?\\}, \\[step\\]\\)'),
    'useEffect dời tiêu điểm phải phụ thuộc đúng [step]',
  );
});

test('lần dựng ĐẦU không cướp tiêu điểm', () => {
  // Mở trang xong mà tiêu điểm nhảy vào giữa nội dung là cướp con trỏ đọc và
  // làm trình duyệt cuộn — lỗi ngược lại với lỗi đang chữa.
  const src = code(CHROME_TSX);
  assert.match(
    src,
    new RegExp('useRef\\(false\\)'),
    'thiếu cờ "đã dựng lần đầu" — hiệu ứng sẽ chạy ngay lúc mở trang',
  );
  assert.match(
    src,
    new RegExp('mounted\\.current = true;[\\s\\S]{0,40}?return;'),
    'cờ phải THOÁT SỚM ở lần chạy đầu, không chỉ được gán',
  );
});

// ── 3. Vùng sống của kết quả chấm ────────────────────────────────────────

test('vỏ vùng sống của kết quả chấm đứng sẵn, không sinh ra cùng nội dung', () => {
  const src = code(SHELL_TSX);
  // `<div role="status" …>` phải nằm TRƯỚC điều kiện `{verdict && …}`, tức vỏ
  // có mặt cả khi chưa chấm.
  assert.match(
    src,
    new RegExp('<div role="status" aria-live="polite">\\s*\\{verdict &&'),
    'FeedbackBanner không còn được bọc trong vùng sống dựng sẵn — kết quả chấm lại im lặng',
  );
});

test('chỉ MỘT vùng sống cho kết quả chấm, không lồng nhau', () => {
  const src = code(BANNER_TSX);
  assert.ok(
    !/role="status"/.test(src),
    'FeedbackBanner lại tự mang role="status" — lồng trong vỏ sống thành hai vùng chồng nhau',
  );
  assert.ok(
    !/aria-live=/.test(src),
    'FeedbackBanner lại tự khai aria-live — cùng lý do',
  );
});

// ── 4. Tự kiểm luật so khớp ──────────────────────────────────────────────

test('luật so khớp của chính file này còn phân biệt được (bẫy \\b là BACKSPACE)', () => {
  // Hai lần trong repo này một ca viết `` `\bfoo` `` tưởng là ranh giới từ,
  // trong khi template literal biến `\b` thành U+0008 — mẫu không khớp gì, ca
  // vẫn xanh. Ca này chứng minh ba điều: (a) `\b` trong template literal ĐÚNG
  // LÀ backspace; (b) các mẫu ở trên viết bằng `new RegExp('…')`/`String.raw`
  // nên `\b` giữ nghĩa ranh giới từ; (c) `code()` thật sự bóc chú thích, nên
  // một `role="status"` chỉ còn trong lời giải thích không làm ca 3 xanh oan.
  assert.equal(`\b`.charCodeAt(0), 8, '`\\b` trong template literal là BACKSPACE');
  assert.equal(String.raw`\b`.length, 2, 'String.raw mới giữ nguyên hai ký tự');
  assert.ok(new RegExp('\\brole\\b').test('role="status"'), 'ranh giới từ phải khớp');
  assert.ok(!new RegExp('\\brole\\b').test('myrole'), 'ranh giới từ phải LOẠI được');
  assert.ok(!new RegExp(`\brole`).test('role'), 'mẫu dính backspace thì không khớp gì');

  // `code()` bóc chú thích thật: FeedbackBanner.tsx hiện CÓ chữ role="status"
  // trong chú thích giải thích vì sao nó bị gỡ.
  assert.ok(
    /role="status"/.test(BANNER_TSX),
    'tiền đề: chú thích của FeedbackBanner có nhắc role="status"',
  );
  assert.ok(
    !/role="status"/.test(code(BANNER_TSX)),
    'code() không bóc được chú thích — ca "chỉ một vùng sống" sẽ xanh oan',
  );
});
