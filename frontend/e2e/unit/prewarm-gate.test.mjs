// Vì sao có file này: Pyodide (13,2 MB) từng chỉ bắt đầu tải SAU khi chuỗi gọi
// API trả nội dung bài, vì cổng nạp sẵn ghi `Boolean(lesson?.step_4)` mà
// `lesson` lúc mở màn còn là null. Hai lần chờ nối tiếp nhau: đo ngày
// 13/10/2026 là 1,0–3,0 s (API) + 2,7 s (prewarm) thay vì chồng lên nhau.
//
// Ca đầu dưới đây là ca BẮT LỖI: trả cổng về `Boolean(lesson?.step_4)` thì nó
// trượt (đã thử: 1/5 ca trượt, đúng ca "chưa có nội dung").
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { shouldPrewarm } from '../../src/components/python-studio/prewarm-gate.ts';

test('chưa có nội dung bài (lesson === null) vẫn nạp sẵn runtime', () => {
  // Đây chính là trạng thái lúc màn vừa mở ra và chuỗi API đang chạy.
  assert.equal(shouldPrewarm(null), true);
});

test('bài có step_4 thì nạp sẵn', () => {
  assert.equal(shouldPrewarm({ step_4: { tests: [] } }), true);
});

test('bài không có phần chấm thì KHÔNG tải 13 MB', () => {
  assert.equal(shouldPrewarm({ step_1: {} }), false);
});

test('step_4 là undefined cũng tính là không có', () => {
  assert.equal(shouldPrewarm({ step_4: undefined }), false);
});

test('mọi bài pe-v4 đều có step_4 — nên cổng này không chặn bài nào', () => {
  const bundle = JSON.parse(
    readFileSync(
      new URL('../../../scripts/pe-v4/out-advanced/lessons.json', import.meta.url),
      'utf8',
    ),
  );
  const bai = bundle.lessons ?? bundle;
  assert.ok(bai.length >= 48, `chỉ thấy ${bai.length} bài`);
  for (const b of bai) {
    const c = b.content_json ?? b.contentJson ?? b;
    assert.equal(shouldPrewarm(c), true, `${b.lesson_code ?? c.title} thiếu step_4`);
  }
});
