// Lỗi đang chặn: người bật "giảm chuyển động" KHÔNG THẤY hai thông báo nổi
// "+10 điểm · Combo x3" (`.pop`, role="status") và "▶ Code chạy đúng!"
// (`.burst strong`).
//
// Cơ chế hỏng, đo ngày 14/10/2026 bằng Chrome DevTools:
//  1. Cả hai chạy keyframe `pe-pop`, mà `pe-pop` kết thúc ở `opacity: 0` (nó là
//     animation vào-rồi-RA, cộng `forwards`). Nhánh
//     `@media (prefers-reduced-motion: reduce)` của studio-chrome.module.css chỉ
//     đặt `animation-duration: 0.01ms` — rút thời lượng một animation TẮT DẦN
//     không làm nó đứng yên, nó nhảy thẳng tới khung cuối, tức vô hình.
//  2. LessonOverlays.tsx gỡ phần tử ở `onAnimationEnd`, mà với 0,01ms thì sự
//     kiện đó bắn ngay — phần tử role="status" rời DOM trước khi trình đọc màn
//     hình kịp đọc.
//
// Hai ca ĐẦU là ca bắt lỗi theo đúng hai mảnh đó: trả CSS về
// `animation-duration: 0.01ms` thì ca 1 trượt; bỏ `statusPopPlan` để lại
// `onAnimationEnd` vô điều kiện thì ca 2 và 3 trượt.
//
// KIỂM ĐỘT BIẾN 15/10/2026 — hai phép từng ĐI QUA, nay cả hai ĐỎ (đã gây lại
// rồi phục hồi):
//   nhánh `@media (prefers-reduced-motion: reduce)` THỨ HAI ở cuối file mang
//     `.pop{animation-duration:0.01ms}` → 1 ca. Nguyên nhân cũ: `atRuleBody`
//     dùng `headerRe.exec` nên chỉ đọc nhánh ĐẦU, trong khi nhánh sau là nhánh
//     THẮNG — tức thông báo "+10 điểm" lại biến mất đúng như lỗi đang sửa.
//   `.pop { opacity: 0 !important }` thêm vào ĐẦU nhánh reduce → 1 ca. Nguyên
//     nhân cũ: ca chỉ hỏi "có TỒN TẠI `opacity: 1`" chứ không hỏi giá trị
//     THẮNG. Nay dùng `winningDecl` (ds-contrast.mjs).
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { statusPopPlan, STATUS_POP_REDUCED_MS } from '../../src/lib/status-pop-life.ts';
import { atRuleBodies, cssBlocks, winningDecl } from './ds-contrast.mjs';

// Bỏ chú thích trước khi phân tích: chú thích trong file có cả dấu phẩy, mà bộ
// cắt thô dưới đây tách selector theo dấu phẩy.
const CSS = readFileSync(
  new URL('../../src/components/python-studio/studio-chrome.module.css', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');
const OVERLAYS = readFileSync(
  new URL('../../src/components/python-studio/LessonOverlays.tsx', import.meta.url),
  'utf8',
);

/**
 * Thân của MỌI at-rule khớp `headerRe`, nối lại theo thứ tự xuất hiện.
 *
 * 15/10/2026 — bản cũ (`headerRe.exec(css)`) chỉ lấy khối ĐẦU TIÊN, và đột
 * biến F6 đã đo: nối thêm một `@media (prefers-reduced-motion: reduce)` thứ
 * hai ở cuối file với `.pop{animation-duration:0.01ms}` → cả 7 ca vẫn xanh,
 * trong khi trên trình duyệt khối sau là khối THẮNG, tức thông báo "+10 điểm"
 * lại biến mất đúng như lỗi đang sửa. Hàm dùng chung nằm ở ds-contrast.mjs
 * (xem khối chú thích "BỘ ĐỌC CSS DÙNG CHUNG" ở đó).
 */
const reduceBodies = () =>
  atRuleBodies(CSS, /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/);

/** Gom mọi khai báo áp lên một selector trong nhiều thân CSS, theo thứ tự. */
const declsFor = (bodies, selector) =>
  (Array.isArray(bodies) ? bodies : [bodies]).flatMap((b) => cssBlocks(b, selector)).join(';');

test('keyframe pe-pop KẾT THÚC ở opacity:0 — đây là lý do không được rút thời lượng của nó', () => {
  // MỌI khai báo `@keyframes pe-pop`, không chỉ cái đầu: khai lại cùng tên ở
  // cuối file là khai báo THẮNG, và lúc đó khung cuối có thể không còn là
  // opacity:0 — tức tiền đề của cả ca dưới sụp mà không ai biết.
  // `\b` sau "pe-pop" cũng khớp `pe-pop-in` (dấu `-` là ranh giới từ), nên
  // phải chặn bằng `(?![-\w])` — nếu không, ca đếm lẫn animation của `.awards`.
  const bodies = atRuleBodies(CSS, /@keyframes\s+pe-pop(?![-\w])/);
  assert.equal(bodies.length, 1, 'pe-pop phải được khai ĐÚNG MỘT LẦN');
  const last = cssBlocks(bodies[0], '100%');
  assert.equal(last.length, 1, 'pe-pop phải có đúng một khung 100%');
  assert.equal(winningDecl(last, 'opacity')?.value, '0', 'khung cuối của pe-pop phải là opacity:0');
});

test('nhánh giảm chuyển động: .pop và .burst strong ĐỨNG YÊN và HIỆN RÕ, không phải chạy 0,01ms', () => {
  const rm = reduceBodies();
  assert.ok(rm.length, 'studio-chrome.module.css không còn nhánh prefers-reduced-motion');

  for (const sel of ['.pop', '.burst strong']) {
    const bodies = rm.flatMap((b) => cssBlocks(b, sel));
    assert.ok(bodies.length, `${sel} không được khai trong nhánh giảm chuyển động`);
    // Đây là ca bắt lỗi: `animation-duration: 0.01ms` trên một animation tắt
    // dần = thông báo biến mất. Hỏi ở MỌI nhánh reduce (F6).
    assert.doesNotMatch(
      bodies.join(';'),
      /animation-duration/,
      `${sel}: rút thời lượng của pe-pop làm thông báo nhảy tới khung opacity:0`,
    );
    // Giá trị THẮNG, không phải "có tồn tại một khai báo đúng": đột biến F7
    // thêm `.pop { opacity: 0 !important }` vào ĐẦU nhánh reduce và ca cũ vẫn
    // xanh vì `opacity: 1` vẫn còn ở đó — nhưng cái thắng là 0, tức thông báo
    // vô hình, đúng lỗi đang sửa.
    assert.equal(
      winningDecl(bodies, 'animation')?.value, 'none', `${sel} phải tắt hẳn animation`,
    );
    const op = winningDecl(bodies, 'opacity');
    assert.equal(op?.value, '1', `${sel} phải hiện rõ (opacity 1) — quy tắc THẮNG là ${op?.value}`);
  }

  // Ngược lại: `.awards` chạy `pe-pop-in` kết thúc ở opacity 1 nên rút thời
  // lượng là đúng — giữ nguyên, để test này không biến thành "cấm 0.01ms".
  assert.match(declsFor(rm, '.awards'), /animation-duration:\s*0\.01ms/);
});

test('nhánh giảm chuyển động gỡ phần tử bằng HẸN GIỜ, không bằng animationend', () => {
  const plan = statusPopPlan(true);
  assert.equal(plan.dismissOnAnimationEnd, false, 'không còn animation nào thì animationend không bắn');
  assert.equal(plan.dismissAfterMs, STATUS_POP_REDUCED_MS);
  assert.ok(plan.dismissAfterMs >= 4000, 'phải đủ lâu để đọc một câu ngắn');
});

test('bản thường giữ NGUYÊN hành vi cũ: animationend gỡ, không hẹn giờ', () => {
  const plan = statusPopPlan(false);
  assert.deepEqual(plan, { dismissOnAnimationEnd: true, dismissAfterMs: null });
});

test('luôn có ĐÚNG MỘT cơ chế gỡ — không có cơ chế nào thì thông báo đứng mãi, hai thì tranh nhau', () => {
  for (const reduced of [false, true]) {
    const plan = statusPopPlan(reduced);
    const cach = [plan.dismissOnAnimationEnd, plan.dismissAfterMs !== null].filter(Boolean);
    assert.equal(cach.length, 1, `reduced=${reduced} có ${cach.length} cơ chế gỡ`);
  }
});

test('số hẹn giờ rác không làm thông báo bị gỡ tức thì', () => {
  for (const rac of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(statusPopPlan(true, rac).dismissAfterMs, STATUS_POP_REDUCED_MS);
  }
});

test('LessonOverlays đã nối dây: onAnimationEnd CÓ ĐIỀU KIỆN + hẹn giờ', () => {
  // Kiểm trên mã nguồn vì bộ test này không dựng React. Gỡ bản sửa ra (trả
  // `onAnimationEnd={onPopEnd}` vô điều kiện) là ca này trượt.
  assert.match(OVERLAYS, /statusPopPlan/, 'LessonOverlays phải hỏi statusPopPlan');
  assert.match(
    OVERLAYS,
    /onAnimationEnd=\{plan\.dismissOnAnimationEnd\s*\?/,
    'onAnimationEnd phải phụ thuộc vào plan.dismissOnAnimationEnd',
  );
  assert.match(OVERLAYS, /setTimeout\(/, 'phải có hẹn giờ cho nhánh giảm chuyển động');
  assert.doesNotMatch(OVERLAYS, /onAnimationEnd=\{onPopEnd\}/, 'gắn vô điều kiện là trở lại lỗi cũ');
});
