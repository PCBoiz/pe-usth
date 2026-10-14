/**
 * Unit test NỐI DÂY: chuỗi ngày học (streak) KHÔNG còn hiện trên trang bài học.
 *
 * Vì sao phải có: chủ sản phẩm đã chốt triết lý "tự học + hệ thống dẫn đường +
 * thích ứng", trong đó chuỗi bị ĐỨT là thứ đẩy người học bỏ cuộc (Silverman &
 * Barasch 2023) — "mất chuỗi" nằm trong danh sách "đừng làm", chỉ số hiển thị
 * phải là loại CHỈ TĂNG. Bản thiết kế mới đã gỡ chuỗi, nên nếu sản phẩm thật
 * còn pill 🔥 thì hai bên nói ngược nhau. Chuỗi rất dễ "bò" trở lại: nó chỉ là
 * một prop và một pill, ai thêm lại cũng không ai thấy sai. Test này chốt lại.
 *
 * Phạm vi: chỉ phần HIỂN THỊ ở đường /lesson/* (LessonChrome + python-studio).
 * Backend vẫn tính và lưu chuỗi (src/common/streak/) để bật lại được sau này —
 * test này KHÔNG kiểm backend.
 *
 * Cách kiểm: đọc mã nguồn (như các ca NỐI DÂY trong ide-reload.test.mjs). Không
 * dựng được DOM thật ở đây vì bộ test là node:test thuần, không có React
 * renderer; mà cái cần chốt là "mã nguồn không còn chỗ nào vẽ chuỗi" — đọc
 * nguồn là đúng mức đó. Mọi ca đều BỎ CHÚ THÍCH trước khi tìm, vì chính các
 * chú thích giải thích "vì sao gỡ" có chứa chữ streak/chuỗi.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CHROME_TSX = 'src/components/lesson-chrome/LessonChrome.tsx';
const CHROME_CSS = 'src/components/lesson-chrome/LessonChrome.module.css';
const STUDIO_TSX = 'src/components/python-studio/StudioLesson.tsx';
const DATA_TS = 'src/components/python-studio/useLessonData.ts';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

/**
 * Bỏ chú thích /* … *\/ và // … để chỉ còn MÃ CHẠY THẬT.
 * Không cần đúng tới mức trình biên dịch: các file này không có chuỗi nào chứa
 * `//` hay `/*` (đã kiểm), nên cách thô này đủ và không ăn mất mã.
 */
function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/[ \t]+\/\/.*$/gm, '');
}

test('LessonChromeProps không còn khai báo prop streak', () => {
  const code = codeOnly(read(CHROME_TSX));
  assert.ok(
    !/\bstreak\b\s*\??\s*:/.test(code),
    'LessonChrome vẫn nhận prop `streak` — chuỗi ngày đã bị gỡ khỏi trang bài học',
  );
});

test('LessonChrome không vẽ pill chuỗi ngày: không 🔥, không streakPill, không tooltip "Chuỗi … ngày"', () => {
  const code = codeOnly(read(CHROME_TSX));
  assert.ok(!code.includes('🔥'), 'vẫn còn ngọn lửa 🔥 trên thanh trên cùng');
  assert.ok(!code.includes('streakPill'), 'vẫn còn gắn lớp .streakPill');
  assert.ok(
    !/Chuỗi\s*\$?\{?/.test(code),
    'vẫn còn tooltip "Chuỗi N ngày học liên tiếp"',
  );
  assert.ok(!/\bstreak\b/i.test(code), 'vẫn còn dùng biến streak khi render');
});

test('LessonChrome.module.css không còn lớp .streakPill (kể cả trong media query)', () => {
  const css = read(CHROME_CSS).replace(/\/\*[\s\S]*?\*\//g, ' ');
  assert.ok(!css.includes('streakPill'), 'CSS vẫn định nghĩa .streakPill');
  assert.ok(
    !css.includes('--st-streak-bg'),
    'CSS vẫn dùng token màu riêng của pill chuỗi (--st-streak-bg)',
  );
});

test('StudioLesson không truyền streak xuống LessonChrome', () => {
  const code = codeOnly(read(STUDIO_TSX));
  assert.ok(!/streak\s*=\s*\{/.test(code), 'vẫn truyền prop streak={…} vào LessonChrome');
  assert.ok(!/\bstreak\b/i.test(code), 'vẫn lấy `streak` ra khỏi useLessonData');
});

test('useLessonData không còn trường streak và không gọi /api/stats cho nó', () => {
  const code = codeOnly(read(DATA_TS));
  assert.ok(!/\bstreak\b/i.test(code), 'hook vẫn giữ state/trường `streak`');
  assert.ok(
    !code.includes('/api/stats'),
    'hook vẫn gọi /api/stats — lời gọi đó chỉ để lấy số chuỗi ngày',
  );
});

/**
 * Chỗ TRỐNG để lại: pill chuỗi từng là mục neo mép phải của thanh (nó mang
 * `margin-left: auto`). Gỡ mà không chuyển việc đó cho ai thì mọi mục dồn sang
 * trái, chừa một khoảng trống ~230px bên phải — thanh lệch hẳn. Hai mục cùng
 * `auto` thì khoảng trống bị CHIA ĐÔI, "3/8" rơi vào giữa thanh; nên đúng MỘT
 * mục được giữ `auto`, và đó là nhãn bước (luôn có mặt, khác ô điểm ⭐ chỉ hiện
 * ở khoá có mini-game).
 */
test('thanh đầu trang không hụt một bên: đúng một mục neo mép phải, là nhãn bước', () => {
  const css = read(CHROME_CSS).replace(/\/\*[\s\S]*?\*\//g, ' ');
  const rule = (name) => {
    const m = css.match(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`));
    assert.ok(m, `không tìm thấy lớp .${name} trong CSS`);
    return m[1];
  };
  assert.match(
    rule('stepLabel'),
    /margin-left:\s*auto/,
    '.stepLabel phải mang margin-left:auto để giữ chỗ pill chuỗi vừa bỏ trống',
  );
  assert.ok(
    !/margin-left:\s*auto/.test(rule('scorePill')),
    '.scorePill cũng mang margin-left:auto thì khoảng trống bị chia đôi, nhãn bước rơi vào giữa thanh',
  );
});
