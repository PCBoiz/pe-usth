// BA PHẦN CỦA BÀI — lý thuyết / thực hành / bài tập.
//
// Người dùng muốn bài học chia rõ ba phần. Đo trên bản dựng 179 bài TRƯỚC khi
// viết một dòng nào: cả 179 bài có CÙNG MỘT dãy loại màn
// (`read | mcq | practice | sandbox | recap`) và **0 bài** có loại màn nào xuất
// hiện ở hai khối rời nhau. Tức phép chia đã nằm sẵn trong dữ liệu; thứ thiếu
// là cái TÊN. Không sắp lại màn, không đổi nội dung, KHÔNG nạp DB.
//
// Bộ này canh ba thứ, và mỗi thứ chặn một kiểu hỏng khác nhau:
//  1. `phanCuaMan` phủ hết `ScreenKind` — 12/18 loại màn không có bài nào đi
//     qua (chúng là của pe-v4 đã ẩn), nên không dữ liệu nào chạm tới chúng. Ca
//     ở đây đọc union TỪ CHÍNH CÂY MÃ, cùng khuôn `insert-gate-sync.test.mjs`.
//  2. trên bản dựng THẬT: ba phần phải LIỀN KHỐI ở cả 179 bài. Ngày ai đó đổi
//     `buildScreens` cho xen kẽ, số nhóm vọt lên và ca này đỏ.
//  3. nhãn: `eyebrowOf` phải dùng `phanCuaMan` chứ không phải `S{origin}`, và
//     phần ba phải đọc `sandboxMode` — 49/179 bài KHÔNG có ca chấm nào, dán
//     "Bài tập" lên chúng là hứa một thứ máy chấm mà bài đó không có.
//     (`chrome.tsx` là .tsx nên `node --test` không import được — canh bằng
//     phép đọc cây mã, đúng giới hạn đã ghi cho `primaryCta`.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { nhomMan, phanCuaMan, PHAN_NHAN } from '../../src/lib/studio-lesson.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const doc = (p) => readFileSync(join(ROOT, p), 'utf8');

const SRC_LIB = doc('frontend/src/lib/studio-lesson.ts');
const SRC_CHROME = doc('frontend/src/components/python-studio/screens/chrome.tsx');
const SRC_LC = doc('frontend/src/components/lesson-chrome/LessonChrome.tsx');
const SRC_CSS = doc('frontend/src/components/lesson-chrome/LessonChrome.module.css');
const SRC_SANDBOX = doc('frontend/src/components/python-studio/screens/SandboxScreen.tsx');

const BUILD = JSON.parse(doc('scripts/pe-da/out/lessons.json'));

/** Dãy loại màn của một bài — bản CHÉP tối giản của `buildScreens`. */
function loaiMan(c) {
  const ra = [];
  ra.push(...(c.step_1?.read ?? []).map(() => 'read'));
  ra.push(...(c.step_2?.mcq ?? []).map(() => 'mcq'));
  ra.push(...(c.step_2?.practice ?? []).map(() => 'practice'));
  const s4 = c.step_4 ?? {};
  if (s4.tests || s4.starterCode || s4.procedure) ra.push('sandbox');
  ra.push('recap');
  return ra;
}

test('phanCuaMan phủ HẾT ScreenKind — 12/18 loại không có bài nào đi qua', () => {
  // Đọc union từ cây mã. Nếu regex trượt hết thì `loai` rỗng và ca này vẫn
  // XANH trong khi không chứng minh gì — nên phải ghim một SÀN cho số loại
  // tìm được, cùng lý lẽ ca thứ hai của `insert-gate-sync.test.mjs`.
  const khoi = SRC_LIB.split('export type ScreenKind =')[1].split(';')[0];
  const loai = [...khoi.matchAll(/\|\s*'([a-zA-Z]+)'/g)].map((m) => m[1]);
  assert.ok(loai.length >= 18, `chỉ tìm được ${loai.length} ScreenKind — regex trượt?`);
  assert.ok(loai.includes('read') && loai.includes('sandbox') && loai.includes('recap'));

  const phan = new Set();
  for (const k of loai) {
    const p = phanCuaMan(k);
    assert.ok(
      p === null || p in PHAN_NHAN,
      `ScreenKind '${k}' trả phần lạ: ${String(p)}`,
    );
    phan.add(p);
  }
  // Cả ba phần phải có người dùng, nếu không thì bản đồ đang gộp mất một phần.
  for (const p of ['lyThuyet', 'thucHanh', 'baiTap']) assert.ok(phan.has(p), `không loại màn nào thuộc ${p}`);
});

test('mcq thuộc THỰC HÀNH, không thuộc lý thuyết — nó ĐƯỢC CHẤM', () => {
  // 3 câu mcq mỗi bài là phần DUY NHẤT được chấm của khoá này và nó quyết định
  // XP. Gộp vào "lý thuyết" là giấu chuyện người học đang bị chấm ở đó.
  assert.equal(phanCuaMan('mcq'), 'thucHanh');
  assert.equal(phanCuaMan('practice'), 'thucHanh');
  assert.equal(phanCuaMan('read'), 'lyThuyet');
  assert.equal(phanCuaMan('sandbox'), 'baiTap');
});

test('recap KHÔNG thuộc phần nào — dán nó vào "bài tập" là nói sai', () => {
  // Màn tổng kết không phải lý thuyết, không phải thực hành, cũng không phải
  // bài tập. Đây là lựa chọn có chủ đích, không phải thiếu sót.
  assert.equal(phanCuaMan('recap'), null);
});

test('bản dựng THẬT: ba phần LIỀN KHỐI ở mọi bài', () => {
  const bai = BUILD.lessons;
  assert.ok(bai.length >= 179, `bản dựng chỉ có ${bai.length} bài`);
  const xau = [];
  for (const row of bai) {
    const kinds = loaiMan(row.content_json);
    const nhom = nhomMan(kinds.map((kind) => ({ kind })));
    // 4 nhóm: lyThuyet · thucHanh · baiTap · null(recap).
    const day = nhom.map((g) => g.phan);
    if (day.join('|') !== 'lyThuyet|thucHanh|baiTap|') xau.push([row.lesson_code, day.join('|')]);
  }
  assert.deepEqual(xau, []);
});

test('nhomMan gom theo khối LIỀN NHAU, không theo phần', () => {
  // Nếu một ngày màn bị xen kẽ, hàm phải phát ra NHIỀU nhóm cùng phần thay vì
  // nói dối rằng chúng liền nhau — ca trên mới có răng nhờ tính chất này.
  const xenke = ['read', 'mcq', 'read'].map((kind) => ({ kind }));
  const nhom = nhomMan(xenke);
  assert.equal(nhom.length, 3);
  assert.deepEqual(nhom.map((g) => g.phan), ['lyThuyet', 'thucHanh', 'lyThuyet']);
  assert.deepEqual(nhom.map((g) => g.tu), [1, 2, 3]);
  // `tu` đếm từ 1, cùng gốc với `step` của LessonChrome — lệch một đơn vị ở đây
  // làm khe hở rơi sai một đoạn, và nó hỏng IM LẶNG.
  const gon = nhomMan(['read', 'read', 'mcq'].map((kind) => ({ kind })));
  assert.deepEqual(gon.map((g) => [g.tu, g.so]), [[1, 2], [3, 1]]);
});

test('nhãn thẻ dùng TÊN PHẦN, không còn S{origin}', () => {
  assert.ok(SRC_CHROME.includes('phanCuaMan('), 'eyebrowOf không gọi phanCuaMan');
  assert.ok(
    !SRC_CHROME.includes('`S${scr.origin} · '),
    'eyebrowOf vẫn dán tiền tố S1..S4 — với người học đó là tên một khoá JSON',
  );
});

test('phần BA đọc sandboxMode — 49/179 bài không có ca chấm nào', () => {
  // 24 bài `procedure` (các bước tự làm trên máy) + 25 bài `free` (chạy thử tự
  // do). Dán "Bài tập" lên chúng là hứa một thứ máy chấm mà bài đó không có.
  assert.ok(SRC_CHROME.includes("che === 'procedure'"), 'nhãn không phân biệt procedure');
  assert.ok(SRC_CHROME.includes("che === 'free'"), 'nhãn không phân biệt free');
  assert.ok(
    SRC_SANDBOX.includes('eyebrowOf(scr, mode)'),
    'SandboxScreen không truyền chế độ xuống eyebrowOf — nhãn sẽ luôn là "Bài tập"',
  );
  // Và con số phải còn đúng trên bản dựng.
  let che = { graded: 0, procedure: 0, free: 0 };
  for (const row of BUILD.lessons) {
    const s4 = row.content_json.step_4 ?? {};
    che[s4.tests ? 'graded' : s4.procedure ? 'procedure' : 'free'] += 1;
  }
  assert.ok(che.procedure > 0 && che.free > 0, `không còn bài procedure/free: ${JSON.stringify(che)}`);
  assert.ok(che.graded >= 130, `chỉ còn ${che.graded} bài có ca chấm`);
});

test('thanh tiến độ chừa khe hở ở ranh giới phần', () => {
  assert.ok(SRC_LC.includes('mocPhan'), 'LessonChrome không nhận mốc phần');
  assert.ok(
    SRC_LC.includes('idx > 1 && mocPhan?.includes(idx)'),
    'mốc đầu tiên (màn 1) phải được bỏ qua — khe hở ở đầu thanh là một khoảng trống vô nghĩa',
  );
  assert.ok(SRC_CSS.includes('.segmentDauPhan'), 'thiếu quy tắc CSS cho khe hở');
  assert.ok(
    /\.segmentDauPhan\s*\{[^}]*margin-left/.test(SRC_CSS),
    '.segmentDauPhan không chừa khoảng — khe hở không hiện ra',
  );
});
