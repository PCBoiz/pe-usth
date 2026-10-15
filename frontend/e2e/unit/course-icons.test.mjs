/**
 * Trang khoá học — HÌNH phải nói cùng một điều với CHỮ đứng cạnh nó.
 *
 * `ds-wording.test.mjs` canh câu chữ, nhưng không gì canh biểu tượng. Lỗ đó
 * để lọt hai thứ cùng lúc trên một màn:
 *   · một ổ KHOÁ (`unlock`) vẽ ngay cạnh dòng "Mọi bài mở sẵn, không khoá theo
 *     thứ tự" — hình phủ định chính câu nó minh hoạ;
 *   · một tam giác PHÁT (`play`) trên ba nút mở TRANG CHỮ, trong khi tam giác
 *     phát đã có nghĩa khác trong chính sản phẩm này (nút chạy code ở Bàn thí
 *     nghiệm), và bản thiết kế §1.4 chốt icon của nút chính là chevron 18.
 *
 * ===========================================================================
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 * ===========================================================================
 *  - "không vẽ ổ khoá cạnh câu nói không có khoá": trượt với
 *    `<Icon name="unlock" />` (CourseDetail) và `fa-unlock` (CourseDbDesign).
 *  - "không icon nào thuộc nhóm bản thiết kế đã bác": trượt với khoá `unlock`
 *    còn trong bảng `ICON_PATHS`, tức bắt cả trường hợp icon chưa ai dùng
 *    nhưng vẫn nằm sẵn đó để người sau bốc lên.
 *  - "nút mở trang chữ dùng chevron, không dùng tam giác phát": trượt với
 *    `play: 'M7 4.5v15l12-7.5z'` và với mọi `<Icon name="play" />`.
 *  - "ký tự mũi tên/tam giác không nằm trong nhãn nút": trượt với "▶ Bắt đầu
 *    học" ở CourseDbDesign.
 *  - "mọi icon một cỡ 18": trượt với `size={15}` / `size={14}`.
 *  - "icon trang trí phải aria-hidden": trượt nếu ai gỡ thuộc tính đó khỏi
 *    `<svg>` dùng chung — trình đọc màn hình sẽ đọc thêm một hình không mang
 *    tin nào, ngay trước nhãn chữ nói đúng điều đó.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const DETAIL = 'src/app/(standalone)/courses/[courseId]/CourseDetail.tsx';
const DBDESIGN = 'src/components/CourseDbDesign.tsx';

/** Bỏ chú thích: chú thích ĐƯỢC nhắc lại icon sai cũ để giải thích vì sao sai. */
const codeOnly = (s) => s
  .replace(/\/\/.*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const read = (rel) => codeOnly(readFileSync(join(ROOT, rel), 'utf8'));
const RAW_DETAIL = readFileSync(join(ROOT, DETAIL), 'utf8');

/** Hai bề mặt mang cùng dòng chữ "không khoá theo thứ tự". */
const SURFACES = [DETAIL, DBDESIGN].map((rel) => [rel, read(rel)]);

test('không vẽ ổ khoá cạnh câu nói không có khoá', () => {
  for (const [rel, code] of SURFACES) {
    const dong = code.split(/\r?\n/).filter((l) => /không khoá theo thứ tự/.test(l));
    assert.equal(dong.length, 1, `${rel}: không tìm thấy dòng "không khoá theo thứ tự"`);
    assert.ok(
      !/\b(?:un)?lock\b/i.test(dong[0]),
      `${rel}: còn icon khoá đứng cạnh câu nói không có khoá — ${dong[0].trim()}`,
    );
  }
});

test('không icon nào thuộc nhóm bản thiết kế đã bác', () => {
  // Năm hình này mang nghĩa "bị chặn" hoặc "thi đua" — hai thứ triết lý đã bỏ.
  // Chặn ở BẢNG icon, không chỉ ở chỗ dùng: icon nằm sẵn trong bảng là icon
  // người sau sẽ bốc lên mà không đọc lại bản thiết kế.
  const [, detail] = SURFACES[0];
  const bang = /const ICON_PATHS = \{([\s\S]*?)\n\} as const;/.exec(detail);
  assert.ok(bang, 'không đọc được bảng ICON_PATHS');
  for (const ten of ['lock', 'unlock', 'trophy', 'fire', 'crown']) {
    assert.ok(
      !new RegExp(`(?:^|\\s)${ten}\\s*:`, 'm').test(bang[1]),
      `ICON_PATHS còn khai \`${ten}\` — xem bản thiết kế §0.3 và §2.2`,
    );
  }
});

test('nút mở trang chữ dùng chevron, không dùng tam giác phát', () => {
  const [, detail] = SURFACES[0];
  assert.ok(!/\bplay\s*:/.test(detail), 'ICON_PATHS còn khai icon `play`');
  assert.ok(!/name="play"/.test(detail), 'còn nút mở trang chữ mang tam giác phát');
  // Và nút chính vẫn PHẢI có icon — bỏ tam giác không được thành bỏ luôn hình.
  assert.ok(/name="chevronRight"/.test(detail), 'nút chính mất icon chevron');
});

test('ký tự mũi tên/tam giác không nằm trong nhãn nút', () => {
  // Chỉ soi NHÃN NÚT, không soi câu văn: bản thiết kế §1.2 chốt "Mũi tên ký tự
  // `→ ← ↗ ▶︎` TRONG NÚT → Icon SVG". Dấu `→` giữa hai danh từ ("Cơ bản →
  // Nâng cao") là liên từ trong câu, không phải hình vẽ thay icon.
  for (const [rel, code] of SURFACES) {
    for (const dong of code.split(/\r?\n/)) {
      if (!/<(?:button|a)\b/.test(dong)) continue;
      const xau = dong.match(/[▶►▸→←↗]/g) ?? [];
      assert.deepEqual(xau, [], `${rel}: còn ký tự hình trong nhãn nút — ${dong.trim()}`);
    }
  }
});

test('mọi icon một cỡ 18', () => {
  const [, detail] = SURFACES[0];
  assert.ok(!/<Icon[^>]*\bsize=/.test(detail), 'còn chỗ gọi Icon với cỡ riêng');
  assert.ok(
    !/function Icon\(\{[^}]*\bsize\b/.test(detail),
    'Icon vẫn nhận tham số `size` — cỡ thứ tư sẽ mọc lại',
  );
  assert.ok(
    /width=\{18\}/.test(detail) && /height=\{18\}/.test(detail),
    'cỡ icon không còn là 18',
  );
});

test('icon trang trí phải aria-hidden', () => {
  // Đọc bản CHƯA bỏ chú thích: thuộc tính này nằm trong markup, không phải chú thích.
  const svg = /<svg([\s\S]*?)>/.exec(RAW_DETAIL);
  assert.ok(svg, 'không tìm thấy <svg> dùng chung');
  assert.match(svg[1], /aria-hidden="true"/, 'icon trang trí thiếu aria-hidden');
  assert.match(svg[1], /focusable="false"/, 'icon trang trí vẫn nhận được tiêu điểm');
});
