/**
 * Đi tới / lùi lại giữa các màn — frontend/src/lib/lesson-nav.ts.
 * Gộp từ bản Figma của thành viên (design/v3/quyet-dinh.md mục 4).
 *
 *  · "Màn trước" rõ ràng ở thanh dưới. Trước đây chỉ lùi được bằng cách bấm
 *    một đoạn trên thanh tiến độ mảnh ở trên cùng.
 *  · Nút đi tiếp BẬT ngay khi đã làm đúng (Figma để "Next" mờ cả sau khi
 *    đúng). Bản mình vốn đã bật sau lần chấm đúng; lỗ còn lại là quay lại một
 *    màn ĐÃ XONG: goTo() xoá `checkedKey`, nên nút trở về "Kiểm tra" và bắt chấm
 *    lại mới cho đi. Có nút "Màn trước" thì lỗ này thành chuyện thường ngày.
 *
 * ===========================================================================
 * GỠ BẢN SỬA RA THÌ TRƯỢT (đã chạy thử, 19/10/2026)
 * ===========================================================================
 *  - Bỏ nhánh `if (s.done)` trong gradedCta: trượt 1 ca "màn đã xong".
 *  - cta.ts quay về luật viết tại chỗ (không gọi gradedCta): trượt 1 ca "nối dây".
 *  - LessonChrome.tsx về bản HEAD (không nút lùi): trượt 1 ca "nối dây".
 *  - StudioLesson.tsx về bản HEAD (không truyền onPrev): trượt 1 ca "nối dây".
 *
 * Chạy: cd frontend && npm run test:unit
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PREV_LABEL, gradedCta, prevStep } from '../../src/lib/lesson-nav.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = (...p) => readFileSync(join(ROOT, ...p), 'utf8');
const codeOnly = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const base = { runnable: false, running: false, checked: false, answered: true, correct: null, done: false };

test('prevStep: màn đầu và bài một màn thì không có màn trước', () => {
  assert.equal(prevStep(1, 10), null);
  assert.equal(prevStep(5, 1), null);
  assert.equal(prevStep(0, 10), null);
  assert.equal(prevStep(2, 10), 1);
  assert.equal(prevStep(10, 10), 9);
  // Bản nháp cũ có thể mang bước lớn hơn số màn hiện tại (bài bị rút màn).
  assert.equal(prevStep(14, 10), 9);
});

test('nhãn nút lùi theo thuật ngữ "màn", một ngôn ngữ', () => {
  assert.equal(PREV_LABEL, 'Màn trước');
  assert.doesNotMatch(PREV_LABEL, /Back|\//);
});

test('đúng rồi thì nút đi tiếp BẬT — không có bản "Next mờ" như Figma', () => {
  const cta = gradedCta({ ...base, checked: true, correct: true, done: true });
  assert.equal(cta.action, 'next');
  assert.notEqual(cta.disabled, true);
  assert.equal(cta.tone, 'ok');
});

test('màn đã xong, quay lại bằng "Màn trước" rồi đi tiếp: vẫn là "Tiếp tục", không bắt chấm lại', () => {
  const cta = gradedCta({ ...base, checked: false, done: true });
  assert.equal(cta.action, 'next');
  assert.notEqual(cta.disabled, true);
});

test('chưa xong: chưa trả lời thì "Kiểm tra" tắt; sai thì "Thử lại"; đang chạy code thì tắt', () => {
  assert.equal(gradedCta({ ...base, answered: false }).disabled, true);
  assert.equal(gradedCta({ ...base }).action, 'check');
  assert.equal(gradedCta({ ...base, runnable: true }).label, 'Chạy & kiểm tra');
  assert.equal(gradedCta({ ...base, checked: true, correct: false }).action, 'retry');
  const run = gradedCta({ ...base, runnable: true, running: true, done: true });
  assert.equal(run.disabled, true);
  // Game chạy code chưa có kết quả (correct = null) — luật cũ: cho đi tiếp.
  assert.equal(gradedCta({ ...base, checked: true, correct: null }).action, 'next');
});

test('nối dây: cta.ts dùng gradedCta, thanh dưới có nút "Màn trước", bài học truyền onPrev', () => {
  const cta = codeOnly(src('src', 'components', 'python-studio', 'cta.ts'));
  assert.match(cta, /if \(isGraded\(scr\.kind\)\)\s*return gradedCta\(\{/);
  assert.match(cta, /done:\s*Boolean\(draft\.done\[scr\.key\]\)/);

  const chrome = codeOnly(src('src', 'components', 'lesson-chrome', 'LessonChrome.tsx'));
  assert.match(chrome, /\{onPrev && \(\s*<button[\s\S]*?onClick=\{onPrev\}[\s\S]*?\{PREV_LABEL\}/);

  const lesson = codeOnly(src('src', 'components', 'python-studio', 'StudioLesson.tsx'));
  assert.match(lesson, /const prevAt = prevStep\(d\.step, screens\.length\)/);
  assert.match(lesson, /onPrev=\{prevAt \? \(\) => goTo\(prevAt\) : undefined\}/);
});
