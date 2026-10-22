/**
 * update-lesson-content.ts — nạp lại NỘI DUNG (`content_json`) của vài bài khoá
 * `python_advanced` từ gói scripts/pe-v4/out-advanced/lessons.json, KHÔNG đụng tiến độ.
 *
 * Vì sao cần: script nạp duy nhất trước đây là `seed-python-advanced-v4.ts --apply`,
 * và nó XOÁ HẲN 48 bài + toàn bộ `lesson_progress` của khoá rồi đặt mọi ghi danh về 0%.
 * Dùng được khi khoá còn trống, không dùng được khi tester đã học: sửa chữ ở 4 bài
 * (P01, P02, P03, G01 sau commit 7ab3a29/4352e42; T05 sau khi thêm race_demo.py và đổi
 * tên lock trong trắc nghiệm) mà xoá tiến độ của mọi người.
 * Script này chỉ chạy đúng một loại câu lệnh:
 *     UPDATE lessons SET content_json = … WHERE course_id = 'python_advanced'
 *                                          AND sort_order = … AND lesson_code = …
 *
 * AN TOÀN:
 *  · Mặc định CHẠY THỬ: đọc DB, in bài nào sẽ đổi (kích thước + sha256 cũ → mới), không ghi.
 *  · `--offline`: chạy KHÔ, không kết nối DB — chỉ kiểm gói và in nội dung mới. Dùng khi
 *    DB không vào được, hoặc để xem trước trong CI/máy không có .env.
 *  · `--apply` bắt buộc kèm `--backup=<file.json>`: ghi content_json CŨ của các bài sắp
 *    đổi ra file TRƯỚC khi ghi DB.
 *  · Kiểm cả gói (đủ 48 bài, sort_order 1..48, không partial, đúng course_id) và chạy
 *    validateStudioLesson() trên mọi bài được chọn trước khi chạm DB — giống seed v4.
 *  · Bài tra theo (course_id, sort_order) và phải mang ĐÚNG lesson_code của gói; lệch là
 *    dừng, không ghi gì (bố cục khoá trong DB khác gói thì phải xử lý bằng tay).
 *  · Mọi UPDATE trong MỘT transaction; mỗi câu phải trúng đúng 1 hàng, không thì huỷ cả.
 *  · KHÔNG đụng `lesson_progress`, `enrollments`, `courses`, không tạo/xoá bài, không đổi
 *    cột nào khác của `lessons` (title, xp_reward… giữ nguyên).
 *  Luật chọn/so sánh nằm ở src/course-admin/lesson-content-update.ts (có test Jest).
 *
 * CHẠY (từ thư mục gốc repo, cần .env có DATABASE_URL trừ khi --offline):
 *   npx ts-node scripts/update-lesson-content.ts --codes=P01,P02,P03,G01,T05 --offline
 *   npx ts-node scripts/update-lesson-content.ts --codes=P01,P02,P03,G01,T05        # xem trước
 *   npx ts-node scripts/update-lesson-content.ts --codes=P01,P02,P03,G01,T05 --apply --backup=content-backup.json
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import {
  ADVANCED_COURSE_ID,
  fingerprint,
  parseCodesArg,
  planContentUpdates,
  selectLessons,
  type Fingerprint,
} from '../src/course-admin/lesson-content-update';

const ARGV = process.argv.slice(2);
const APPLY = ARGV.includes('--apply');
const OFFLINE = ARGV.includes('--offline');
const BACKUP = ARGV.find((a) => a.startsWith('--backup='))?.slice('--backup='.length);
const BUNDLE = join(__dirname, 'pe-v4', 'out-advanced', 'lessons.json');

const short = (f: Fingerprint) => `${f.bytes} B, sha256 ${f.sha256.slice(0, 12)}`;

async function main() {
  if (APPLY && OFFLINE) {
    console.error('--apply và --offline loại trừ nhau.');
    process.exitCode = 1;
    return;
  }
  if (APPLY && !BACKUP) {
    console.error('Thiếu --backup=<file.json>: phải sao lưu content_json cũ trước khi ghi.');
    process.exitCode = 1;
    return;
  }
  let codes: string[];
  try {
    codes = parseCodesArg(ARGV);
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
    return;
  }

  // 1) Kiểm gói TRƯỚC khi chạm DB.
  const bundle: unknown = JSON.parse(readFileSync(BUNDLE, 'utf8'));
  const { rows, errors } = selectLessons(bundle, codes);
  console.log(`Nguồn: ${BUNDLE}`);
  if (errors.length) {
    console.error(`${errors.length} lỗi — không ghi gì:`);
    errors.forEach((line) => console.error('  ' + line));
    process.exitCode = 1;
    return;
  }
  console.log(`✓ Gói đủ bài; ${rows.length} bài được chọn qua validateStudioLesson().`);

  if (OFFLINE) {
    for (const row of rows) {
      console.log(`  ${row.lesson_code} (sort_order ${row.sort_order}): mới ${short(fingerprint(row.content_json))}`);
    }
    console.log('\nCHẠY KHÔ (--offline) — không kết nối DB, không ghi gì.');
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const dbRows = await prisma.lesson.findMany({
      where: { courseId: ADVANCED_COURSE_ID, sortOrder: { in: rows.map((r) => r.sort_order) } },
      select: { sortOrder: true, lessonCode: true, contentJson: true },
    });
    const plan = planContentUpdates(rows, dbRows);
    if (plan.errors.length) {
      console.error(`${plan.errors.length} lỗi — không ghi gì:`);
      plan.errors.forEach((line) => console.error('  ' + line));
      process.exitCode = 1;
      return;
    }
    for (const item of plan.items) {
      console.log(
        `  ${item.code} (sort_order ${item.sortOrder}): ` +
          (item.changed ? `ĐỔI  ${short(item.before)} → ${short(item.after)}` : `không đổi (${short(item.after)})`),
      );
    }
    const changed = plan.items.filter((i) => i.changed);
    console.log(`${changed.length}/${plan.items.length} bài sẽ đổi content_json. lesson_progress/enrollments/courses: không đụng.`);

    if (!APPLY) {
      console.log('\nCHẠY THỬ — chưa ghi gì. Thêm --apply --backup=<file.json> để làm thật.');
      return;
    }
    if (!changed.length) {
      console.log('Không có gì để ghi.');
      return;
    }

    const old = dbRows.filter((r) => changed.some((c) => c.sortOrder === r.sortOrder));
    writeFileSync(
      BACKUP!,
      JSON.stringify({ exportedAt: new Date().toISOString(), courseId: ADVANCED_COURSE_ID, lessons: old }, null, 1),
    );
    console.log(`✓ Đã sao lưu content_json cũ của ${old.length} bài vào ${BACKUP}`);

    await prisma.$transaction(async (tx) => {
      for (const item of changed) {
        // updateMany để lọc được cả lesson_code (update() chỉ nhận khoá unique). Kiểm
        // count === 1: hàng bị đổi/xoá giữa lúc đọc và lúc ghi thì huỷ cả transaction.
        const res = await tx.lesson.updateMany({
          where: { courseId: ADVANCED_COURSE_ID, sortOrder: item.sortOrder, lessonCode: item.code },
          // `as object`: InputJsonValue của Prisma không nhận unknown (cùng lý do với seed v4).
          data: { contentJson: item.content as object },
        });
        if (res.count !== 1) {
          throw new Error(`${item.code}: UPDATE trúng ${res.count} hàng, cần đúng 1 — huỷ toàn bộ.`);
        }
      }
    });
    console.log(`\n✓ Đã cập nhật content_json của ${changed.map((c) => c.code).join(', ')}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
