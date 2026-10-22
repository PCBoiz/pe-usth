/**
 * Thời lượng quảng cáo của khoá phải khớp tổng thời lượng các bài THẬT.
 *
 * LỖI ĐANG CHẶN. `frontend/src/lib/catalog.ts` từng ghi `duration: '~48 giờ'`
 * cho Advanced Python, trong khi tổng `estimated_minutes` của đủ 48 bài là
 * 1 725 phút ≈ 28,8 giờ — phóng đại khoảng 67%, trên trang khoá học công khai.
 * Con số trông như lấy "48 bài × 1 giờ" rồi ghi cứng, nên nó không theo dữ
 * liệu: thêm một bài, bớt một bài, hay soạn lại thời lượng một bài thì chuỗi
 * kia vẫn đứng yên và vẫn sai.
 *
 * VÌ SAO ĐỌC JSON THẬT: bẫy số 1 trong AGENTS.md — test trên fixture tay không
 * bắt được lỗi trong dữ liệu thật. Ở đây cộng `estimated_minutes` từ đúng
 * `scripts/pe-v4/out-advanced/lessons/*.json`, bản đang seed vào DB.
 *
 * BẰNG CHỨNG BẮT ĐƯỢC LỖI: trả `duration` về '~48 giờ' ⇒ ca "khớp tổng thời
 * lượng" trượt, nêu cả hai con số.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const LESSON_DIR = join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons');
const CATALOG = readFileSync(join(ROOT, 'frontend', 'src', 'lib', 'catalog.ts'), 'utf8');

const phut = readdirSync(LESSON_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(LESSON_DIR, f), 'utf8')))
  .map((d) => d.estimated_minutes ?? (d.content_json ?? d).estimated_minutes);

/** Lấy chuỗi `duration` của khoá python_advanced từ mã nguồn catalog. */
function durationCuaKhoa() {
  const khoi = CATALOG.slice(CATALOG.indexOf("id: 'python_advanced'"));
  const m = khoi.match(/duration:\s*'([^']+)'/);
  assert.ok(m, 'không tìm thấy `duration` của python_advanced trong catalog.ts');
  return m[1];
}

test('mọi bài đều khai thời lượng — tổng không bị hụt một bài nào', () => {
  assert.equal(phut.length, 48);
  const thieu = phut.filter((m) => typeof m !== 'number' || !(m > 0));
  assert.deepEqual(thieu, [], 'có bài không khai estimated_minutes — tổng sẽ thấp hơn thật');
});

test('thời lượng quảng cáo khớp tổng thời lượng 48 bài', () => {
  const tongGio = phut.reduce((s, m) => s + m, 0) / 60;
  const ghi = durationCuaKhoa();
  const so = Number(ghi.replace(/[^\d.,]/g, '').replace(',', '.'));
  assert.ok(Number.isFinite(so), `không đọc được số trong "${ghi}"`);
  // Chuỗi là con số làm tròn ("~29 giờ") nên cho lệch tối đa 1 giờ — đủ chặn
  // "~48 giờ" (lệch 19 giờ) mà không bắt bẻ chuyện làm tròn.
  assert.ok(Math.abs(so - tongGio) <= 1,
    `catalog ghi "${ghi}" nhưng 48 bài cộng lại là ${tongGio.toFixed(1)} giờ`);
});
