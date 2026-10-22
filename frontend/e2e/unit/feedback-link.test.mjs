/**
 * Unit test cho cổng hiện/ẩn thẻ góp ý ở trang chủ: src/lib/feedback-link.ts.
 *
 * Vì sao phải có: thẻ "Góp ý cho chúng tôi" dựng cho buổi thử nghiệm với giảng
 * viên và sinh viên USTH (14/10/2026), nhưng link Google Form đến SAU — đặt
 * NEXT_PUBLIC_FEEDBACK_URL trên Vercel ngay trước buổi. Hai hỏng hóc đều KHÔNG
 * thấy được bằng mắt khi xem trang lúc này:
 *  1. chưa đặt biến mà thẻ vẫn hiện → một nút bấm vào không đi đâu, đúng vào
 *     buổi đang muốn gây lòng tin;
 *  2. giá trị dán sai (chuỗi rỗng, khoảng trắng, `javascript:…`) mà vẫn lọt vào
 *     `href` → nút chết, hoặc tệ hơn là trình duyệt CHẠY đoạn javascript đó.
 * Cả hai chỉ lộ ra khi đã deploy, nên phải chốt bằng test.
 *
 * Chạy bằng `node --test` + `.mjs` vì cùng lý do đã ghi ở ide-handoff.test.mjs
 * (frontend cố ý không có runner test; Node tự bóc kiểu TypeScript). Chính vì
 * runner đó không phân giải alias '@/…' mà hàm phải nằm ở file riêng không
 * import gì — tiền lệ: src/components/python-studio/prewarm-gate.ts.
 *
 * Bằng chứng bộ ca này bắt được lỗi thật — xem khối chú thích cuối file.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FEEDBACK_FORM_URL, feedbackFormHref, feedbackHref } from '../../src/lib/feedback-link.ts';

test('chưa đặt biến môi trường thì KHÔNG hiện thẻ', () => {
  // Đây là trạng thái hôm nay (13/10/2026): form chưa tạo, biến chưa đặt.
  // `process.env.X` không tồn tại trả về undefined, và Next thay biến
  // NEXT_PUBLIC_* chưa đặt thành `undefined` ngay trong mã lúc build.
  assert.equal(feedbackHref(undefined), null);
  assert.equal(feedbackHref(null), null);
  // Phòng trường hợp chỗ gọi đưa vào thứ không phải chuỗi.
  assert.equal(feedbackHref(123), null);
  assert.equal(feedbackHref({}), null);
});

test('chuỗi rỗng hoặc chỉ có khoảng trắng cũng là chưa đặt', () => {
  // Ô giá trị trên bảng điều khiển Vercel bỏ trống, hay dán lẫn khoảng trắng
  // rồi xoá mất phần link — biến vẫn TỒN TẠI nên không bắt được bằng
  // `process.env.X ? … : …` kiểu thường.
  for (const raw of ['', ' ', '   ', '\t', '\n', ' \t\n ']) {
    assert.equal(feedbackHref(raw), null, JSON.stringify(raw));
  }
});

test('javascript: không bao giờ được vào href', () => {
  // `new URL('javascript:alert(1)')` KHÔNG ném lỗi — nó là URL hợp lệ với lược
  // đồ javascript. Nên kiểm được-hay-không-parse là chưa đủ, phải lọc lược đồ.
  const bad = [
    'javascript:alert(1)',
    'JavaScript:alert(1)', // lược đồ không phân biệt hoa thường
    '  javascript:alert(document.cookie)  ',
    'java\nscript:alert(1)', // new URL lược bỏ xuống dòng giữa chuỗi
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ];
  for (const raw of bad) assert.equal(feedbackHref(raw), null, JSON.stringify(raw));
});

test('chuỗi rác không phải URL thì không hiện, KHÔNG ném lỗi (trang phải còn sống)', () => {
  // Trang chủ là server component: hàm này ném lỗi là cả trang 500.
  const bad = [
    'chưa có link',
    'docs.google.com/forms/d/e/abc/viewform', // thiếu lược đồ
    '/forms/viewform', // đường dẫn tương đối
    '//docs.google.com/forms', // protocol-relative: new URL không có base
    'https://', // lược đồ đúng nhưng không có host
    'http://',
    '<đặt link form ở đây>',
  ];
  for (const raw of bad) assert.equal(feedbackHref(raw), null, JSON.stringify(raw));
});

test('URL Google Form thật thì hiện thẻ, giữ nguyên địa chỉ', () => {
  // Dạng thật của link chia sẻ Google Form (phần id đã rút ngắn).
  const url =
    'https://docs.google.com/forms/d/e/1FAIpQLSd8kXqB7mN2pZvR4tYw9uE3gHjL6cA0sVnKx1QbTfO5iMdUeW/viewform';
  assert.equal(feedbackHref(url), url);
  // Khoảng trắng hai đầu do dán tay thì cắt đi, vẫn hiện.
  assert.equal(feedbackHref(`  ${url}  `), url);
  assert.equal(feedbackHref(`\n${url}\n`), url);
  // Khoảng trắng "vô hình" khi chép link từ trang web rồi dán vào ô giá trị
  // trên Vercel: dấu cách không ngắt dòng (U+00A0) và BOM (U+FEFF). `new URL`
  // KHÔNG lược hai ký tự này (nó chỉ lược khoảng trắng ASCII), nên không có
  // .trim() thì link đúng mà thẻ vẫn không hiện — và không ai đoán ra vì sao.
  assert.equal(feedbackHref(` ${url}`), url);
  assert.equal(feedbackHref(`﻿${url} `), url);
  // Có tham số đi kèm (usp=sf_link, hay prefill) cũng không được làm mất.
  const withQuery = `${url}?usp=sf_link`;
  assert.equal(feedbackHref(withQuery), withQuery);
  // Dạng rút gọn forms.gle và http trần cũng chấp nhận.
  assert.equal(feedbackHref('https://forms.gle/aBcDeFgHiJkLmNoP'), 'https://forms.gle/aBcDeFgHiJkLmNoP');
  assert.equal(feedbackHref('http://example.test/form'), 'http://example.test/form');
});

/*
 * BẰNG CHỨNG BẮT ĐƯỢC LỖI (quy ước AGENTS.md: gỡ bản sửa ra, test phải trượt).
 * Đã chạy thật, số ca trượt trên tổng 5 ca của file này:
 *
 * 1. Gỡ HẲN bản sửa — tức trang chủ ghi thẳng
 *    `href={process.env.NEXT_PUBLIC_FEEDBACK_URL}`, hàm còn lại là
 *    `return raw ?? null`:
 *      → 5/5 ca trượt. Mọi thứ hàm này tồn tại để chặn đều lọt: `javascript:`
 *        vào thẳng href, chuỗi rác thành nút chết, giá trị không phải chuỗi
 *        trả về nguyên dạng.
 *
 * 2. Bỏ hàng rào lược đồ:
 *      -  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
 *      → 1/5 trượt: 'javascript: không bao giờ được vào href'.
 *
 * 3. Bỏ .trim() (`const trimmed = raw;`):
 *      → 1/5 trượt: 'URL Google Form thật…' — đúng hai assert U+00A0/U+FEFF.
 *        Ghi lại vì lần đầu đo mutation này KHÔNG có ca nào trượt: `new URL`
 *        tự lược khoảng trắng ASCII nên .trim() trông như dòng vô dụng. Phải
 *        thêm ca khoảng trắng vô hình mới thấy nó có việc thật.
 *
 * 4. Bỏ try/catch quanh `new URL` (`const url = new URL(trimmed);`):
 *      → 1/5 trượt: 'chuỗi rác không phải URL…' nổ `TypeError: Invalid URL`
 *        thay vì trả null. Trang chủ là server component nên lỗi này là cả
 *        trang 500 — đúng cái sẽ xảy ra nếu dán sai giá trị trên Vercel.
 */

// ── Link form THẬT dùng cho buổi thử nghiệm 14/10/2026 ───────────────────────
// FEEDBACK_FORM_URL là mặc định khi không đặt biến môi trường, và feedbackFormHref()
// là thứ CẢ trang chủ lẫn trang khoá học gọi — gom về một chỗ để hai nơi không
// thể trỏ về hai form khác nhau. Ca dưới canh ba thứ dễ hỏng mà không ai nhìn
// ra: hằng bị sửa thành chuỗi mà feedbackHref() loại bỏ (nút im lặng biến mất),
// `??` bị đổi thành `||` (đặt biến rỗng để tắt nút lại rơi về hằng), và một
// trong hai trang quay về tự đọc env thay vì gọi hàm chung.
test('FEEDBACK_FORM_URL qua được feedbackHref', () => {
  const href = feedbackHref(FEEDBACK_FORM_URL);
  assert.ok(href, `hằng không qua được feedbackHref: ${FEEDBACK_FORM_URL}`);
  assert.match(href, /^https:\/\/(docs\.google\.com\/forms|forms\.gle)\//);
});

test('không đặt biến môi trường thì feedbackFormHref() trả về hằng', () => {
  delete process.env.NEXT_PUBLIC_FEEDBACK_URL;
  assert.equal(feedbackFormHref(), feedbackHref(FEEDBACK_FORM_URL));
});

test('biến đặt chuỗi rỗng là CỐ Ý tắt nút, không rơi về hằng', () => {
  process.env.NEXT_PUBLIC_FEEDBACK_URL = '';
  assert.equal(feedbackFormHref(), null);
  delete process.env.NEXT_PUBLIC_FEEDBACK_URL;
});

test('cả trang chủ lẫn trang khoá học đều gọi feedbackFormHref(), không tự đọc env', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of [
    '../../src/app/dashboard/page.tsx',
    '../../src/app/(standalone)/courses/[courseId]/CourseDetail.tsx',
  ]) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.match(src, /feedbackFormHref\(\)/, `${f} không gọi feedbackFormHref()`);
    assert.doesNotMatch(
      src,
      /process\.env\.NEXT_PUBLIC_FEEDBACK_URL/,
      `${f} tự đọc env — hai trang sẽ lệch nhau khi luật đổi`,
    );
  }
});
