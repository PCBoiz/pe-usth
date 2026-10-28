/**
 * Cổng INSERT của backend phải biết ĐÚNG những nguồn màn mà frontend dựng.
 *
 * VÌ SAO BỘ NÀY TỒN TẠI. Luật 6 của `planLessonInserts` từng đòi `step_1.read`
 * HOẶC `play`. Hai khoá đó đúng là thứ 172 + 48 bài đang có nên nó trông đủ,
 * nhưng `buildScreens()` dựng màn từ `step_1.memory`, `step_2.mcq`,
 * `step_3.trace`, `step_4.tests`… mà không cần hai khoá ấy. Hệ quả đo được:
 * bài nhập từ tài liệu theo mẫu `## S1..## S4` dựng đủ màn trong trình duyệt
 * nhưng bị cổng INSERT từ chối với câu "gói dựng dở" — cổng nói sai về chính
 * thứ nó đang canh, và lối thoát duy nhất là bịa thêm một phần `## Đọc` cho
 * qua cửa, tức bắt người soạn đổi NỘI DUNG để chiều một phép kiểm sai.
 *
 * Bản sửa là `sinhDuocManNao()` — một bản CHÉP điều kiện của `buildScreens`.
 * Chép chứ không import được: một bên là `src/` (Nest, Jest), một bên là
 * `frontend/src/` (node --test). Nên bản chép SẼ TRÔI, và nó trôi IM LẶNG theo
 * đúng chiều nguy hiểm: thêm một loại màn mới ở frontend thì cổng từ chối oan
 * đúng những bài chỉ có loại màn đó, không exception nào ném.
 *
 * Bộ này đọc CẢ HAI cây mã và bắt hai danh sách khoá phải khớp — cùng khuôn
 * `tracer-web-sync.test.mjs` đang dùng cho hai bản tracer.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FE = join(GOC, 'frontend', 'src', 'lib', 'studio-lesson.ts');
const BE = join(GOC, 'src', 'course-admin', 'lesson-insert.ts');

/**
 * Bóc chú thích TRƯỚC khi quét. Bẫy đã gặp trong repo này: file là CRLF, mà
 * `.` của regex không khớp `\r`, nên `//.*$` không bóc được chú thích cuối
 * dòng — phải bỏ `\r` trước. Và cả hai hàm đều có chú thích NHẮC TÊN khoá, nên
 * không bóc là quét trúng chính lời giải thích.
 */
function boChuThich(src) {
  return src
    .replace(/\r/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function than(src, ten) {
  const i = src.indexOf(ten);
  assert.notEqual(i, -1, `không tìm thấy ${ten} — ai đó đã đổi tên hàm?`);
  // Tới dấu `}` ở cột 0 đầu tiên: cả hai hàm đều ở tầm module.
  const j = src.indexOf('\n}', i);
  return src.slice(i, j);
}

/** Khoá cấp MỘT mà buildScreens đọc, dạng `step_1.memory`. */
function nguonManFrontend() {
  const s = than(boChuThich(readFileSync(FE, 'utf8')), 'export function buildScreens');
  const buoc = { one: 'step_1', two: 'step_2', three: 'step_3', four: 'step_4' };
  const ra = new Set();
  for (const m of s.matchAll(/\b(one|two|three|four)\?\.(\w+)/g)) {
    ra.add(`${buoc[m[1]]}.${m[2]}`);
  }
  if (/\blesson\.play\?\./.test(s)) ra.add('play');
  return ra;
}

/** Khoá cấp MỘT mà bản chép ở backend đọc. */
function nguonManBackend() {
  const s = than(boChuThich(readFileSync(BE, 'utf8')), 'export function sinhDuocManNao');
  const buoc = { one: 'step_1', two: 'step_2', three: 'step_3', four: 'step_4' };
  const ra = new Set();
  for (const m of s.matchAll(/truong\((one|two|three|four), '(\w+)'\)/g)) {
    ra.add(`${buoc[m[1]]}.${m[2]}`);
  }
  if (/truong\(content, 'play'\)/.test(s)) ra.add('play');
  return ra;
}

test('cổng INSERT biết ĐÚNG mọi nguồn màn mà buildScreens dựng', () => {
  const fe = nguonManFrontend();
  const be = nguonManBackend();

  // Chiều NGUY HIỂM: frontend dựng được màn từ một khoá mà cổng không biết ⇒
  // cổng TỪ CHỐI OAN đúng những bài chỉ có khoá đó. Đây là lỗi đã xảy ra.
  const thieu = [...fe].filter((k) => !be.has(k)).sort();
  assert.deepEqual(
    thieu,
    [],
    'buildScreens dựng màn từ những khoá này mà sinhDuocManNao() KHÔNG biết:\n'
      + `  ${thieu.join(', ')}\n`
      + '  → thêm nhánh tương ứng vào src/course-admin/lesson-insert.ts,\n'
      + '    kèm một ca trong lesson-insert.spec.ts (it.each "một mình đã đủ dựng màn").',
  );

  // Chiều kia nhẹ hơn nhưng vẫn là nói dối: cổng cho qua một khoá đã bị gỡ
  // khỏi frontend ⇒ nó nhận một bài dựng ra màn trắng.
  const thua = [...be].filter((k) => !fe.has(k)).sort();
  assert.deepEqual(
    thua,
    [],
    'sinhDuocManNao() còn nhận những khoá mà buildScreens không còn dựng:\n'
      + `  ${thua.join(', ')}\n`
      + '  → gỡ nhánh đó khỏi lesson-insert.ts và ca tương ứng.',
  );
});

test('phép quét thật sự tìm thấy khoá — không phải so hai tập RỖNG', () => {
  // Nếu ai đó đổi tên biến trong buildScreens thì regex trượt hết, hai tập
  // cùng rỗng, và ca trên vẫn XANH trong khi nó không còn chứng minh gì.
  const fe = nguonManFrontend();
  assert.ok(fe.size >= 15, `chỉ quét ra ${fe.size} khoá ở frontend — regex đã trượt?`);
  assert.ok(fe.has('step_1.memory'), 'thiếu step_1.memory — chính khoá gây ra lỗi cũ');
  assert.ok(fe.has('play'), 'thiếu play');
});
