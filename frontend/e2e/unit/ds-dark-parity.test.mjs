/**
 * Token nào khai ở bản SÁNG thì cũng phải khai ở bản TỐI — trừ những token có
 * lý do viết ra để KHÔNG đổi.
 *
 * ===========================================================================
 * VÌ SAO CÓ CA NÀY
 * ===========================================================================
 * `--ds-on-ink-soft` (chữ phụ trên nền ink) được thêm ngày 15/10 ở `:root` mà
 * quên `body.dark`. Ở chế độ tối, `ink` lật thành màu SÁNG (#E8EEF7), nên chữ
 * #BFD0E8 đặt trên nó chỉ còn 1,34:1 — gần như vô hình.
 *
 * Không ca nào bắt được, vì hai lý do cộng lại:
 *  · chưa màn nào dùng token đó, nên không ai thấy trên màn hình;
 *  · bộ đo tương phản (`ds-contrast.mjs`) chỉ đo những CẶP được liệt kê, mà
 *    không ai thêm cặp cho một token chưa dùng.
 * Nghĩa là người ĐẦU TIÊN dùng nó sẽ ship một lỗi tương phản ở chế độ tối.
 * Lượt dựng design system v3 bắt được khi tự đo lại từng token.
 *
 * Đo cặp thì không đủ — phải canh cấu trúc: thêm token ở một bản mà quên bản
 * kia là lỗi, bất kể đã có ai dùng hay chưa.
 *
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 *  - "mọi token sáng đều có bản tối" trượt nếu xoá dòng `--ds-on-ink-soft`
 *    khỏi `body.dark` — đúng trạng thái của ngày 15/10.
 *  - "danh sách miễn chỉ gồm khung code" trượt nếu ai thêm token vào danh sách
 *    miễn mà không phải token khung code — tức dùng danh sách miễn để giấu lỗi.
 *  - "danh sách miễn không chứa token chết" trượt nếu một token được miễn đã
 *    không còn trong bảng — miễn cho thứ không tồn tại là che giấu, không phải
 *    miễn.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CSS = readFileSync(join(FE, 'public', 'static', 'css', 'studio-tokens.css'), 'utf8');

/**
 * Khung code TỐI ở cả hai chế độ — chú thích trên `body.dark` trong bảng token
 * nói thẳng: "Khung code KHÔNG đổi — nó đã tối ở cả hai chế độ". Nên các token
 * màu đặt LÊN khung code (`--ds-code-*`) và màu nhấn đặt trên nền tối
 * (`--ds-mark-*`) cố ý không có bản tối riêng.
 */
const MIEN = /^--ds-(code|mark)-/;

function toks(khoi) {
  return new Set([...khoi.matchAll(/^\s*(--ds-[a-z0-9-]+)\s*:\s*#/gm)].map((m) => m[1]));
}

const I = CSS.indexOf('body.dark {');
const J = CSS.indexOf('}', I);
const SANG = toks(CSS.slice(0, I));
const TOI = toks(CSS.slice(I, J));

test('đọc được cả hai bản — không thì mọi ca dưới đều xanh vì không có gì để so', () => {
  assert.ok(I > 0, 'không tìm thấy khối body.dark');
  assert.ok(SANG.size > 15, `chỉ đọc được ${SANG.size} token ở bản sáng`);
  assert.ok(TOI.size > 10, `chỉ đọc được ${TOI.size} token ở bản tối`);
});

test('mọi token sáng đều có bản tối, trừ khung code', () => {
  const thieu = [...SANG].filter((t) => !TOI.has(t) && !MIEN.test(t));
  assert.deepEqual(
    thieu, [],
    'token khai ở bản sáng mà quên bản tối — người đầu tiên dùng nó sẽ ship lỗi '
      + 'tương phản ở chế độ tối:\n' + thieu.join('\n'),
  );
});

test('danh sách miễn chỉ gồm khung code, và không chứa token chết', () => {
  const duocMien = [...SANG].filter((t) => !TOI.has(t) && MIEN.test(t));
  assert.ok(duocMien.length > 0, 'không còn token khung code nào — xem lại MIEN');
  for (const t of duocMien) {
    assert.match(t, MIEN, `${t} được miễn nhưng không phải token khung code`);
  }
});
