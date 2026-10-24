/**
 * Unit test cho TÊN KHOÁ `python_advanced` — ba nguồn phải khớp nhau và không
 * nguồn nào được mang lại chữ "mini-game".
 *
 * Vì sao phải có: cùng một cái tên nằm ở hai chỗ không tự đồng bộ —
 *   1. `frontend/src/lib/catalog.ts` (danh mục TĨNH mà trang chủ và trang chi
 *      tiết đọc; backend đòi JWT nên frontend không gọi API danh mục được),
 *   2. `scripts/seed-python-da.ts` (`TITLE`, dùng mỗi lần seed lại).
 * 13/10/2026 đổi tên thành "Advanced Python" và bỏ chữ "mini-game" khỏi phần
 * giới thiệu khoá. Sửa thiếu một nguồn thì không ai thấy ngay: seed lại là DB
 * kéo tên cũ về, còn trang vẫn in tên mới — lệch âm thầm. Test canh đúng chỗ đó.
 *
 * 24/10/2026 — khoá đổi ruột (48 bài pe-v4 ra, 172 bài pe-da vào) nên đổi luôn
 * tên thành "Python cho Data Analyst": bài đầu bắt đầu từ `print(12 + 9)`, gọi
 * là "Advanced" thì người chưa biết Python bỏ qua đúng khoá dành cho mình.
 * Nguồn thứ ba trước đây (`scripts/rename-python-advanced.ts`) và seed pe-v4
 * (`scripts/seed-python-advanced-v4.ts`) KHÔNG còn bị canh ở đây: cả hai là
 * công cụ của bộ 48 bài đã nghỉ và vẫn mang tên cũ. Đòi chúng khớp tên mới chỉ
 * khiến chúng trông như còn dùng được, trong khi chạy chúng là kéo cả 48 bài cũ
 * trở lại — chú thích đầu `catalog.ts` nói rõ đừng chạy.
 *
 * Đây là test ĐỌC MÃ NGUỒN dạng văn bản, cố ý: `catalog.ts` import
 * `@/lib/curricula.json` nên `node --test` không import trực tiếp được (alias
 * `@/` chỉ Next/tsconfig hiểu).
 *
 * Bằng chứng bắt được lỗi thật: xem khối chú thích cuối file.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (...p) => readFileSync(join(ROOT, ...p), 'utf8');

const CATALOG = read('frontend', 'src', 'lib', 'catalog.ts');
const COURSE_DETAIL = read(
  'frontend', 'src', 'app', '(standalone)', 'courses', '[courseId]', 'CourseDetail.tsx',
);
const SEED = read('scripts', 'seed-python-da.ts');
const SEEDS = [['seed-python-da.ts', SEED]];
const EXPECTED_TITLE = 'Python cho Data Analyst';

/**
 * Bỏ các dòng chú thích. Chú thích VẪN ĐƯỢC nhắc tên cũ — nó kể lại vì sao đổi
 * tên, và đó là thứ phải giữ; chỉ chuỗi hiển thị mới không được mang tên cũ.
 */
function codeOnly(src) {
  const comment = /^\s*(\/\/|\/\*|\*)/;
  return src.split('\n').filter((l) => !comment.test(l)).join('\n');
}

/** Khối khai báo khoá `python_advanced` trong catalog.ts. */
function advancedEntry() {
  const start = CATALOG.indexOf("id: 'python_advanced'");
  assert.notEqual(start, -1, 'catalog.ts phải còn khoá python_advanced');
  const end = CATALOG.indexOf('},', start);
  return CATALOG.slice(start, end);
}

test('catalog.ts: khoá python_advanced tên "Python cho Data Analyst", không còn chữ mini-game', () => {
  const entry = advancedEntry();
  for (const field of ['label', 'title']) {
    assert.match(
      entry,
      new RegExp(`${field}: '${EXPECTED_TITLE}'`),
      `catalog.ts: ${field} phải là "${EXPECTED_TITLE}"`,
    );
  }
  // Quét cả file (trừ chú thích): nhãn, tiêu đề, phụ đề, mô tả và thẻ đều từng
  // mang chữ này — bỏ sót một trường là người dùng vẫn đọc thấy.
  assert.doesNotMatch(
    codeOnly(CATALOG),
    /mini-?game/i,
    'catalog.ts không được còn chữ "mini-game" trong chuỗi hiển thị',
  );
});

test('catalog.ts: python_advanced không khai `tag` (trang chi tiết bỏ hẳn dòng nhãn)', () => {
  assert.doesNotMatch(advancedEntry(), /^\s*tag:/m, 'khoá này phải KHÔNG có trường tag');
  // Thiếu nửa sau thì "MINI-GAME" biến mất nhưng " · NÂNG CAO" vẫn trơ ra.
  assert.match(CATALOG, /tag\?: string/, 'CatalogCourse.tag phải là trường không bắt buộc');
  assert.match(
    COURSE_DETAIL,
    /\{course\.tag &&/,
    'CourseDetail phải bỏ CẢ dòng nhãn khi khoá không khai tag',
  );
});

test('seed dùng cùng một tên khoá với catalog.ts', () => {
  for (const [name, src] of SEEDS) {
    assert.match(
      src,
      new RegExp(`const TITLE = '${EXPECTED_TITLE}';`),
      `${name}: TITLE phải khớp catalog.ts`,
    );
    // Chuỗi GHI VÀO DB cũng không được mang chữ "mini-game" (xem codeOnly).
    const literals = codeOnly(src).match(/'[^'\n]*'/g) ?? [];
    assert.deepEqual(
      literals.filter((s) => /mini-?game/i.test(s)),
      [],
      `${name}: chuỗi ghi vào DB không được còn chữ "mini-game"`,
    );
  }
});

/*
 * ĐÃ THỬ GỠ BẢN SỬA RA (quy ước AGENTS.md) — 4 ca trượt:
 *  · trả `label`/`title` về 'Python Mini-game' / 'Python Advanced — học qua
 *    mini-game' → ca 1 trượt;
 *  · trả `tag: 'MINI-GAME'` vào catalog.ts → ca 1 và ca 2 trượt;
 *  · bỏ điều kiện `{course.tag && …}` ở CourseDetail → ca 2 trượt;
 *  · để `TITLE` của seed lệch khỏi catalog.ts, hoặc trả `tag: 'Mini-game'`/phụ
 *    đề cũ vào `META` của seed → ca 3 trượt.
 *
 * 24/10/2026 thử lại sau khi đổi tên: để `label`/`title` của catalog.ts ở
 * 'Advanced Python' trong khi `TITLE` của `scripts/seed-python-da.ts` đã là
 * 'Python cho Data Analyst' ⇒ ca 1 và ca 3 trượt (2 ca) — đúng cảnh lệch mà
 * test này sinh ra để bắt.
 */
