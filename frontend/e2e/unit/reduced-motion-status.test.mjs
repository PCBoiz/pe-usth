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
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { statusPopPlan, STATUS_POP_REDUCED_MS } from '../../src/lib/status-pop-life.ts';

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

/** Lấy phần thân của một at-rule (`@media …`, `@keyframes …`) bằng cách đếm ngoặc. */
function atRuleBody(css, headerRe) {
  const m = headerRe.exec(css);
  if (!m) return null;
  const open = css.indexOf('{', m.index + m[0].length - 1);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  return null;
}

/** Cắt một thân CSS thành [{ selector, body }]. Không xử lý at-rule lồng nhau. */
function rules(body) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(body))) out.push({ selector: m[1].trim(), body: m[2] });
  return out;
}

/** Gom mọi khai báo áp lên một selector trong một thân CSS. */
function declsFor(body, selector) {
  return rules(body)
    .filter((r) =>
      r.selector
        .split(',')
        .map((s) => s.trim())
        .includes(selector),
    )
    .map((r) => r.body)
    .join(';');
}

test('keyframe pe-pop KẾT THÚC ở opacity:0 — đây là lý do không được rút thời lượng của nó', () => {
  const body = atRuleBody(CSS, /@keyframes\s+pe-pop\b/);
  assert.ok(body, 'không tìm thấy @keyframes pe-pop');
  const last = rules(body).at(-1);
  assert.equal(last.selector, '100%');
  assert.match(last.body, /opacity:\s*0\b/, 'khung cuối của pe-pop phải là opacity:0');
});

test('nhánh giảm chuyển động: .pop và .burst strong ĐỨNG YÊN và HIỆN RÕ, không phải chạy 0,01ms', () => {
  const rm = atRuleBody(CSS, /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/);
  assert.ok(rm, 'studio-chrome.module.css không còn nhánh prefers-reduced-motion');

  for (const sel of ['.pop', '.burst strong']) {
    const decls = declsFor(rm, sel);
    assert.notEqual(decls, '', `${sel} không được khai trong nhánh giảm chuyển động`);
    // Đây là ca bắt lỗi: `animation-duration: 0.01ms` trên một animation tắt
    // dần = thông báo biến mất.
    assert.doesNotMatch(
      decls,
      /animation-duration/,
      `${sel}: rút thời lượng của pe-pop làm thông báo nhảy tới khung opacity:0`,
    );
    assert.match(decls, /animation:\s*none/, `${sel} phải tắt hẳn animation`);
    assert.match(decls, /opacity:\s*1\b/, `${sel} phải hiện rõ (opacity 1)`);
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
