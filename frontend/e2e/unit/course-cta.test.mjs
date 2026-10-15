/**
 * Trang khoá học — ĐÚNG MỘT nút chính trên một màn.
 *
 * Bản thiết kế §1.4 khai một `btn-primary` duy nhất (và liệt "5 biến thể kích
 * thước" là lỗi cần GỘP, không phải giấy phép nhân bản). Trước bản sửa, trang
 * có BA nút nền `--ds-action` cùng khung nhìn — hero, thẻ giá, thẻ gợi ý — và
 * cả ba trỏ cùng một `startUrl`, hai trong số đó trùng cả nhãn lẫn icon.
 *
 * `ds-tokens.test.mjs` (khối WIRING) chốt `.btnPrimary` dùng đúng token màu,
 * nhưng không hỏi có BAO NHIÊU nút chính được dựng cùng lúc — đó là lỗ T6 của
 * báo cáo soát, và file này lấp nó.
 *
 * ===========================================================================
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 * ===========================================================================
 *  - "chỉ một nút chính dựng vô điều kiện": trượt với bản cũ (hero và thẻ giá
 *    đều `styles.btnPrimary` thẳng, không điều kiện nào).
 *  - "thẻ giá không mang nút nào": trượt với nút `.startBtn` trong thẻ giá.
 *  - "không hai nút nào cùng trỏ startUrl mà không loại trừ nhau": trượt với
 *    ba nút cùng `href={startUrl}` của bản cũ.
 *  - "`.startBtn` không còn là CSS chết": trượt nếu lớp đó quay lại
 *    CourseShell.module.css mà không ai dùng (hoặc ngược lại, bị dùng mà
 *    không khai).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const DETAIL = 'src/app/(standalone)/courses/[courseId]/CourseDetail.tsx';
const SHELL = 'src/components/CourseShell.module.css';

/** Bỏ chú thích: chú thích ĐƯỢC nhắc lại cấu hình sai cũ để giải thích vì sao sai. */
const codeOnly = (s) => s
  .replace(/\/\/.*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const detail = codeOnly(readFileSync(join(ROOT, DETAIL), 'utf8'));
const shellCss = readFileSync(join(ROOT, SHELL), 'utf8');

/**
 * Mọi `className={…}` có mang `styles.btnPrimary`, cùng thông tin nó có nằm
 * trong một biểu thức ba ngôi (tức có thể KHÔNG dựng) hay không.
 */
function nutChinh() {
  const out = [];
  // `className` ở đây luôn là template literal: lấy nội dung giữa hai dấu `
  // (không bắt theo dấu } được — chính `${…}` đã có dấu đó).
  for (const m of detail.matchAll(/className=\{`([^`]*styles\.btnPrimary[^`]*)`\}/g)) {
    const bieuThuc = m[1];
    out.push({
      bieuThuc,
      coDieuKien: bieuThuc.includes('?') && bieuThuc.includes('styles.btnSecondary'),
    });
  }
  return out;
}

test('chỉ một nút chính dựng vô điều kiện', () => {
  const nut = nutChinh();
  assert.ok(nut.length > 0, 'không tìm thấy nút chính nào — trang mất lối đi tiếp');
  const voDieuKien = nut.filter((n) => !n.coDieuKien);
  assert.equal(
    voDieuKien.length,
    1,
    `có ${voDieuKien.length} nút chính dựng vô điều kiện (bản thiết kế §1.4: đúng một)`
      + `: ${voDieuKien.map((n) => n.bieuThuc.trim()).join(' | ')}`,
  );
});

test('nút chính thứ hai, nếu có, phải loại trừ nhau với thẻ gợi ý', () => {
  // Hero là nút chính KHI KHÔNG có thẻ gợi ý, và hạ xuống `btnSecondary` khi có.
  // Hai nhánh phải đọc CÙNG một cờ, không thì cả hai dựng cùng lúc trở lại.
  const co = /const (\w+) = plan\.kind !== 'start';/.exec(detail);
  assert.ok(co, 'không tìm thấy cờ quyết định thẻ gợi ý có mặt hay không');
  const ten = co[1];
  assert.ok(
    new RegExp(`\\{\\s*${ten}\\s*&&`).test(detail),
    `thẻ gợi ý không còn dựng theo cờ \`${ten}\``,
  );
  for (const n of nutChinh().filter((x) => x.coDieuKien)) {
    assert.ok(
      n.bieuThuc.includes(ten),
      `nút chính có điều kiện nhưng không đọc cờ \`${ten}\`: ${n.bieuThuc.trim()}`,
    );
  }
});

test('thẻ giá không mang nút nào', () => {
  // Thẻ giá = từ dòng "Miễn phí" tới hết khối "KHOÁ HỌC BAO GỒM".
  const the = /styles\.price\}>Miễn phí[\s\S]*?styles\.includesTitle/.exec(detail);
  assert.ok(the, 'không tìm thấy thẻ giá');
  assert.ok(
    !/styles\.btn\b/.test(the[0]),
    'thẻ giá lại mang nút — nó trùng nhãn, icon và href với nút hero',
  );
});

test('không hai nút nào cùng trỏ startUrl mà không loại trừ nhau', () => {
  // Đếm chỗ dùng `startUrl`: khai nó một lần, hero một lần, và truyền vào
  // ResumeCard một lần. Ba nút cùng href của bản cũ cho 4 chỗ.
  const lan = (detail.match(/startUrl/g) ?? []).length;
  assert.ok(
    lan <= 3,
    `${lan} chỗ dùng startUrl — nhiều hơn một nút chính + một lối hero thì lại là nhân bản CTA`,
  );
});

test('`.startBtn` không còn là CSS chết', () => {
  const trongCss = /\.startBtn\b/.test(shellCss);
  const trongTsx = /styles\.startBtn\b/.test(detail);
  assert.equal(
    trongCss,
    trongTsx,
    trongCss
      ? '.startBtn còn khai trong CourseShell.module.css mà không ai dùng'
      : '.startBtn được dùng trong TSX mà không khai trong CSS',
  );
});
