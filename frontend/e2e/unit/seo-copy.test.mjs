/**
 * Câu mô tả cho máy tìm kiếm.
 *
 * ===========================================================================
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 * ===========================================================================
 *  - "không mời vào khoá đã xoá" là ca chính: nó trượt với câu cũ ở
 *    `app/layout.tsx` ("Python, Java, HTML/CSS và thiết kế cơ sở dữ liệu").
 *    Java và HTML/CSS bị xoá ở 9bc42c1, route trả 404.
 *  - "chỉ nhắc khoá còn trong danh mục" chạy theo hướng NGƯỢC LẠI: nó đọc
 *    `catalog.ts` và đỏ lên nếu danh mục đổi mà câu mô tả chưa đổi theo.
 *    Không có nó thì bản sửa này đúng hôm nay rồi mục đi y như câu cũ.
 *  - "số bài đếm từ giáo trình thật" trượt nếu ai viết cứng con số vào chuỗi —
 *    đúng bẫy "hai nguồn danh sách bài" trong AGENTS.md.
 *  - "layout gốc dùng hàm" trượt nếu câu mô tả bị viết thẳng lại vào
 *    `metadata`, tức quay về chỗ không test nào soi.
 *  - "độ dài còn nằm trong khoảng Google in ra" canh 110–165 ký tự.
 *
 * MỘT BẪY ĐÃ TRẢ GIÁ, ghi lại để không ai dựng lại: bản đầu của ca chính dựng
 * regex bằng `new RegExp(` + template literal + `)`. Trong template literal
 * thì `\b` là ký tự BACKSPACE, không phải ranh giới từ — nên regex không bao
 * giờ khớp và ca này XANH cả khi câu mô tả còn nguyên chữ "Java". Chỉ lộ ra
 * khi gỡ bản sửa để thử. Nay dùng `includes()` cho chuỗi thường: không có gì
 * để thoát thì không có gì để thoát sai. Và ca này tự kiểm trên CÂU CŨ, nên
 * một phép so hỏng sẽ tự tố giác chứ không im lặng đạt.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { seoDescription } from '../../src/lib/seo-copy.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const LAYOUT = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8');

/** Số bài thật, đọc từ chính file mà trang khoá đọc. */
function soBaiThat() {
  const cur = JSON.parse(readFileSync(join(ROOT, 'src/lib/curricula.json'), 'utf8'));
  const modules = cur.CURRICULA?.python_advanced?.modules ?? [];
  return modules.reduce((sum, m) => sum + m.lessons.length, 0);
}

const DESC = seoDescription(soBaiThat());

/** Câu cũ, giữ nguyên văn để ca chính tự kiểm phép so của nó. */
const CAU_CU = 'Programming EDU — học lập trình Python, Java, HTML/CSS và thiết kế cơ '
  + 'sở dữ liệu bằng bài tập chạy ngay trong trình duyệt, có chấm tự động và theo dõi tiến độ.';

const KHOA_DA_XOA = ['Java', 'HTML/CSS', 'HTML', 'CSS'];

test('không mời vào khoá đã xoá', () => {
  for (const ten of KHOA_DA_XOA) {
    assert.ok(
      !DESC.includes(ten),
      `câu mô tả còn nhắc "${ten}" — route đó đã 404 từ 9bc42c1`,
    );
  }
  // Tự kiểm phép so: nếu nó không bắt được chính câu cũ thì nó vô dụng.
  for (const ten of KHOA_DA_XOA) {
    assert.ok(CAU_CU.includes(ten), `phép so không bắt được "${ten}" trong câu cũ`);
  }
});

test('chỉ nhắc khoá còn trong danh mục — danh mục đổi thì ca này đỏ', () => {
  // Đọc `catalog.ts` dưới dạng VĂN BẢN: `node --test` không phân giải alias
  // `@/…` mà file đó dùng (cùng lý do `home-copy.ts` không import gì).
  const cat = readFileSync(join(ROOT, 'src/lib/catalog.ts'), 'utf8');
  const ids = [...cat.matchAll(/^\s*id:\s*'([a-z0-9_]+)',/gm)].map((m) => m[1]);
  assert.deepEqual(
    ids,
    ['python_advanced', 'ide'],
    'danh mục vừa đổi — đọc lại câu mô tả cho máy tìm kiếm ở lib/seo-copy.ts',
  );
  assert.ok(DESC.includes('Advanced Python'));
});

test('số bài đếm từ giáo trình thật, không viết cứng', () => {
  const soBai = soBaiThat();
  assert.ok(soBai > 0, 'không đếm được số bài từ curricula.json');
  assert.ok(
    DESC.includes(`${soBai} bài`),
    `câu mô tả phải mang đúng số bài của giáo trình (${soBai})`,
  );
  // Không đọc được giáo trình thì nói "nhiều bài" — không in số 0, không bịa.
  assert.ok(seoDescription(0).includes('nhiều bài'));
  const src = readFileSync(join(ROOT, 'src/lib/seo-copy.ts'), 'utf8')
    .replace(/\/\/.*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(
    !new RegExp(String.raw`\b${soBai}\b`).test(src),
    'số bài bị viết cứng trong seo-copy.ts — phải nhận từ danh mục',
  );
});

test('layout gốc dùng hàm, không viết chuỗi', () => {
  assert.match(LAYOUT, /description:\s*seoDescription\(/);
  assert.match(LAYOUT, /from '@\/lib\/seo-copy'/);
  const code = LAYOUT.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(
    !code.includes('Programming EDU — học lập trình'),
    'câu mô tả lại bị viết thẳng vào metadata',
  );
});

test('độ dài còn nằm trong khoảng Google in ra', () => {
  assert.ok(DESC.length >= 110, `quá ngắn: ${DESC.length} ký tự`);
  assert.ok(DESC.length <= 165, `quá dài, sẽ bị cắt giữa câu: ${DESC.length} ký tự`);
});
