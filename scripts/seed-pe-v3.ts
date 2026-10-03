/**
 * seed-pe-v3.ts — thay giáo trình khoá `python` bằng 40 bài PE Python v3
 * (B01–B20, I01–I12, N01–N08).
 *
 * NGUỒN: scripts/pe-v3/out/lessons.json, sinh bởi
 *   python scripts/pe-v3/build.py
 *   node scripts/pe-v3/check-pyodide.mjs     (bắt buộc đạt trước khi seed)
 *
 * AN TOÀN:
 *  · Mặc định CHẠY THỬ, không ghi gì. Thêm --apply mới thực sự ghi.
 *  · Mọi bài đi qua validateStudioLesson() của backend trước; còn lỗi thì
 *    KHÔNG ghi bài nào.
 *  · KHÔNG XOÁ dòng nào. Bài cũ của khoá python (92 bài PE v2 + bài dựng tay
 *    List & Mutability) được LƯU TRỮ: sort_order dời sang 1000 + số cũ, module
 *    đổi thành "Lưu trữ · …". lesson_progress của học viên giữ nguyên (lịch sử,
 *    XP đã nhận, quiz ôn tập). Muốn trả lại giáo trình cũ: dời sort_order về
 *    (sort_order - 1000) và đặt courses.lessons = 93.
 *  · Bài v3 ghi theo (course_id, lesson_code): chạy lại script là CẬP NHẬT,
 *    không nhân bản, và không đụng tiến độ đã có trên bài v3.
 *  · courses.lessons = 40, rồi tính lại enrollments.progress/completed_lessons
 *    của khoá python theo đúng quy tắc CoursesService.recomputeProgress (chỉ
 *    đếm bài có sort_order 1..40) — học viên cũ không "hoàn thành sẵn" bài mới.
 *  · Tất cả trong MỘT transaction: lỗi giữa chừng là không có gì thay đổi.
 *
 * CHẠY (từ thư mục gốc repo, cần .env có DATABASE_URL):
 *   npx ts-node scripts/seed-pe-v3.ts              # xem trước
 *   npx ts-node scripts/seed-pe-v3.ts --apply      # ghi thật
 *
 * Giáo trình hiển thị ở trang khoá học nằm ở frontend/src/lib/curricula.json
 * (khối CURRICULA.python), lấy từ scripts/pe-v3/out/curriculum-python.json.
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import {
  validateStudioLesson,
  type StudioLesson,
} from '../src/course-admin/studio-lesson.schema';

type Row = {
  lesson_code: string;
  sort_order: number;
  module: string;
  title: string;
  subtitle: string;
  estimated_minutes: number | null;
  xp_reward: number;
  content_json: StudioLesson;
};

const COURSE_ID = 'python';
const ARCHIVE_OFFSET = 1000;
const APPLY = process.argv.includes('--apply');
/** Xoá hẳn bài cũ + MỌI tiến độ học của khoá python thay vì lưu trữ. */
const DELETE_OLD = process.argv.includes('--delete-old');
const BACKUP = process.argv.find((a) => a.startsWith('--backup='))?.slice('--backup='.length);
const BUNDLE = join(__dirname, 'pe-v3', 'out', 'lessons.json');

async function main() {
  const bundle = JSON.parse(readFileSync(BUNDLE, 'utf8')) as {
    course_id: string;
    lessons: Row[];
  };
  const rows = bundle.lessons;
  const total = rows.length;
  const codes = new Set(rows.map((r) => r.lesson_code));
  console.log(`Nguồn: ${BUNDLE}\n${total} bài PE v3 -> khoá "${COURSE_ID}", bài 1..${total}.\n`);

  // 1) Kiểm tra nội dung TRƯỚC khi chạm vào DB.
  const invalid: string[] = [];
  rows.forEach((row, i) => {
    if (row.sort_order !== i + 1) invalid.push(`${row.lesson_code}: sort_order ${row.sort_order}, cần ${i + 1}.`);
    const errors = validateStudioLesson(row.content_json);
    if (errors.length) invalid.push(`${row.lesson_code}: ${errors.join(' | ')}`);
  });
  if (codes.size !== total) invalid.push('Trùng mã bài trong gói.');
  if (invalid.length) {
    console.error(`${invalid.length} lỗi — không ghi gì:`);
    invalid.forEach((line) => console.error('  ' + line));
    process.exitCode = 1;
    return;
  }
  console.log(`✓ ${total} bài hợp lệ theo validateStudioLesson().`);

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const existing = await prisma.lesson.findMany({
      where: { courseId: COURSE_ID },
      select: { id: true, sortOrder: true, lessonCode: true, title: true, module: true },
      orderBy: { sortOrder: 'asc' },
    });
    const byCode = new Map(existing.filter((l) => l.lessonCode).map((l) => [l.lessonCode!, l]));
    const toArchive = existing.filter(
      (l) => !codes.has(l.lessonCode ?? '') && l.sortOrder < ARCHIVE_OFFSET,
    );
    const toUpdate = rows.filter((r) => byCode.has(r.lesson_code));
    const toCreate = rows.filter((r) => !byCode.has(r.lesson_code));
    const enrollments = await prisma.enrollment.count({ where: { courseId: COURSE_ID } });

    if (DELETE_OLD) {
      await deleteOldAndSeed(prisma, rows, existing, codes, byCode);
      return;
    }

    console.log(`Khoá ${COURSE_ID} đang có ${existing.length} bài trong DB.`);
    console.log(`  Lưu trữ: ${toArchive.length} bài cũ -> sort_order ${ARCHIVE_OFFSET}+ (giữ tiến độ của học viên)`);
    toArchive.slice(0, 5).forEach((l) => console.log(`    ${l.sortOrder} -> ${ARCHIVE_OFFSET + l.sortOrder}: ${l.title}`));
    if (toArchive.length > 5) console.log(`    … và ${toArchive.length - 5} bài nữa`);
    console.log(`  Cập nhật: ${toUpdate.length} bài v3 đã có; thêm mới: ${toCreate.length} bài`);
    console.log(`  courses.lessons = ${total}; tính lại tiến độ cho ${enrollments} học viên đã ghi danh`);

    if (!APPLY) {
      console.log('\nCHẠY THỬ — chưa ghi gì. Thêm --apply để ghi thật.');
      return;
    }

    await prisma.$transaction(
      async (tx) => {
        for (const l of toArchive) {
          await tx.lesson.update({
            where: { id: l.id },
            data: {
              sortOrder: ARCHIVE_OFFSET + l.sortOrder,
              module: `Lưu trữ · ${l.module ?? 'giáo trình cũ'}`,
            },
          });
        }
        for (const row of rows) {
          const data = {
            module: row.module,
            title: row.title,
            subtitle: row.subtitle,
            sortOrder: row.sort_order,
            estimatedMinutes: row.estimated_minutes ?? null,
            xpReward: row.xp_reward,
            contentJson: row.content_json as object,
          };
          const current = byCode.get(row.lesson_code);
          if (current) await tx.lesson.update({ where: { id: current.id }, data });
          else await tx.lesson.create({ data: { courseId: COURSE_ID, lessonCode: row.lesson_code, ...data } });
        }
        await tx.course.update({ where: { id: COURSE_ID }, data: { lessonCount: total } });

        // Tiến độ = số bài 1..total đã hoàn thành (khớp recomputeProgress).
        await tx.enrollment.updateMany({
          where: { courseId: COURSE_ID },
          data: { completedLessons: 0, progress: 0 },
        });
        const done = await tx.lessonProgress.groupBy({
          by: ['userId'],
          where: {
            courseId: COURSE_ID,
            status: 'completed',
            lesson: { sortOrder: { gte: 1, lte: total } },
          },
          _count: { _all: true },
        });
        for (const g of done) {
          const completed = g._count._all;
          await tx.enrollment.updateMany({
            where: { userId: g.userId, courseId: COURSE_ID },
            data: {
              completedLessons: completed,
              progress: Math.min(100, Math.round((completed / total) * 100)),
            },
          });
        }
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
    console.log(
      `\n✓ Đã ghi: lưu trữ ${toArchive.length}, cập nhật ${toUpdate.length}, thêm ${toCreate.length}; ` +
        `courses.lessons = ${total}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

type ExistingLesson = { id: number; sortOrder: number; lessonCode: string | null; title: string | null };

/**
 * --delete-old: XOÁ HẲN mọi bài cũ của khoá python và MỌI dòng lesson_progress
 * của khoá (không lưu trữ), rồi nạp 40 bài v3. Không hoàn tác được nên:
 *  · chạy thử chỉ in số dòng sẽ xoá;
 *  · --apply bắt buộc kèm --backup=<file.json>: ghi bản sao đầy đủ (bài, tiến
 *    độ, ghi danh) TRƯỚC khi xoá;
 *  · tất cả trong một transaction.
 * XP, gems, streak đã cộng cho học viên nằm ở bảng users — KHÔNG bị trừ lại.
 */
async function deleteOldAndSeed(
  prisma: PrismaClient,
  rows: Row[],
  existing: ExistingLesson[],
  codes: Set<string>,
  byCode: Map<string, ExistingLesson>,
) {
  const total = rows.length;
  const oldLessons = existing.filter((l) => !codes.has(l.lessonCode ?? ''));
  // Tiến độ "của khoá python": ghi course python HOẶC trỏ vào bài thuộc khoá python.
  const progressWhere = {
    OR: [{ courseId: COURSE_ID }, { lesson: { courseId: COURSE_ID } }],
  };
  const progress = await prisma.lessonProgress.findMany({ where: progressWhere });
  const users = new Set(progress.map((p) => p.userId));
  const enrollments = await prisma.enrollment.findMany({ where: { courseId: COURSE_ID } });

  console.log(`XOÁ HẲN (không lưu trữ):`);
  console.log(`  ${oldLessons.length} bài cũ của khoá ${COURSE_ID} (giữ lại ${existing.length - oldLessons.length} bài v3 đã có)`);
  console.log(`  ${progress.length} dòng lesson_progress của ${users.size} học viên`);
  console.log(`  ${enrollments.length} lượt ghi danh: đặt lại 0 bài / 0% (không huỷ ghi danh)`);
  console.log(`Sau đó: thêm ${rows.filter((r) => !byCode.has(r.lesson_code)).length} bài v3, courses.lessons = ${total}.`);

  if (!APPLY) {
    console.log('\nCHẠY THỬ — chưa xoá gì. Thêm --apply --backup=<file.json> để làm thật.');
    return;
  }
  if (!BACKUP) {
    console.error('Thiếu --backup=<file.json>: phải sao lưu trước khi xoá.');
    process.exitCode = 1;
    return;
  }

  const full = await prisma.lesson.findMany({ where: { id: { in: oldLessons.map((l) => l.id) } } });
  const course = await prisma.course.findUnique({ where: { id: COURSE_ID } });
  writeFileSync(
    BACKUP,
    JSON.stringify({ exportedAt: new Date().toISOString(), course, lessons: full, progress, enrollments }, null, 1),
  );
  console.log(`✓ Đã sao lưu ${full.length} bài, ${progress.length} dòng tiến độ vào ${BACKUP}`);

  await prisma.$transaction(
    async (tx) => {
      const deletedProgress = await tx.lessonProgress.deleteMany({ where: progressWhere });
      const deletedLessons = await tx.lesson.deleteMany({
        where: { id: { in: oldLessons.map((l) => l.id) } },
      });
      for (const row of rows) {
        const data = {
          module: row.module,
          title: row.title,
          subtitle: row.subtitle,
          sortOrder: row.sort_order,
          estimatedMinutes: row.estimated_minutes ?? null,
          xpReward: row.xp_reward,
          contentJson: row.content_json as object,
        };
        const current = byCode.get(row.lesson_code);
        if (current) await tx.lesson.update({ where: { id: current.id }, data });
        else await tx.lesson.create({ data: { courseId: COURSE_ID, lessonCode: row.lesson_code, ...data } });
      }
      await tx.course.update({ where: { id: COURSE_ID }, data: { lessonCount: total } });
      await tx.enrollment.updateMany({
        where: { courseId: COURSE_ID },
        data: { completedLessons: 0, progress: 0 },
      });
      console.log(
        `✓ Đã xoá ${deletedLessons.count} bài cũ và ${deletedProgress.count} dòng tiến độ; ` +
          `nạp ${total} bài v3; courses.lessons = ${total}.`,
      );
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
