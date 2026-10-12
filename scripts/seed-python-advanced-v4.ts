/**
 * seed-python-advanced-v4.ts — THAY giáo trình khoá `python_advanced` bằng 48 bài
 * pe-v4 (P01–P07, T01–T06, G01–G06, R02, X01–X05, N01–N06, PD01–PD09, M01–M06,
 * DA01, DA02), dạng studio-lesson/v2 có mini-game.
 *
 * NGUỒN: scripts/pe-v4/out-advanced/lessons.json, sinh bởi
 *   py scripts/pe-v4/build.py                 (đủ 48 bài, chấm thử bằng CPython)
 *   py scripts/pe-v4/build_advanced.py
 *   node scripts/pe-v4/check-pyodide.mjs      (bắt buộc đạt trước khi seed)
 *   node scripts/pe-v4/check-advanced.mjs
 *
 * Khác scripts/seed-python-advanced.ts (bản 40 bài cũ, chỉ thêm/cập nhật): mã bài
 * mới không trùng mã cũ, nên cập nhật theo lesson_code sẽ để lại 40 bài cũ chen
 * giữa (trùng sort_order 1..40). Bản này XOÁ HẲN bài cũ + tiến độ của khoá rồi nạp
 * 48 bài mới — giống `seed-pe-v3.ts --delete-old`.
 *
 * AN TOÀN:
 *  · Mặc định CHẠY THỬ: chỉ in sẽ xoá/nạp gì.
 *  · --apply bắt buộc kèm --backup=<file.json>: ghi bản sao (khoá, bài cũ, tiến
 *    độ, ghi danh) TRƯỚC khi xoá.
 *  · Gói phải đủ 48 bài, sort_order 1..48, không phải bản dựng thiếu (--partial),
 *    mọi bài qua validateStudioLesson(); lỗi một bài là không ghi gì.
 *  · Xoá + nạp + courses.lessons = 48 + đặt lại tiến độ ghi danh trong MỘT
 *    transaction. XP/gems/streak đã cộng ở bảng users giữ nguyên.
 *  · Không đụng khoá nào khác. Khoá python_advanced chưa có thì tạo mới (sao chép
 *    giảng viên/ngôn ngữ từ khoá `python` nếu còn, không thì từ khoá bất kỳ).
 *
 * CHẠY (từ thư mục gốc repo, cần .env có DATABASE_URL):
 *   npx ts-node scripts/seed-python-advanced-v4.ts                                         # xem trước
 *   npx ts-node scripts/seed-python-advanced-v4.ts --apply --backup=python-advanced-backup.json
 *   thêm --publish để đặt is_published = true
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

const COURSE_ID = 'python_advanced';
const TOTAL = 48;
const APPLY = process.argv.includes('--apply');
const PUBLISH = process.argv.includes('--publish');
const BACKUP = process.argv.find((a) => a.startsWith('--backup='))?.slice('--backup='.length);
const BUNDLE = join(__dirname, 'pe-v4', 'out-advanced', 'lessons.json');

const META = {
  subtitle: '48 bài Python nâng cao học qua mini-game',
  description:
    'Process và subprocess, đa luồng, GUI Tkinter, SQL, NumPy, pandas, Matplotlib và dự án phân tích dữ liệu — ' +
    'chạy Python ngay trong trình duyệt, học bằng game: ghép code rồi chạy thật, săn lỗi, sửa code, trận Boss cuối chặng.',
  tag: 'Mini-game',
  image: 'static/images/python.webp',
};

async function main() {
  const bundle = JSON.parse(readFileSync(BUNDLE, 'utf8')) as {
    course_id: string;
    partial?: boolean;
    lessons: Row[];
  };
  const rows = bundle.lessons;
  console.log(`Nguồn: ${BUNDLE}\n${rows.length} bài -> khoá "${COURSE_ID}".\n`);

  // 1) Kiểm nội dung TRƯỚC khi chạm DB.
  const invalid: string[] = [];
  if (bundle.course_id !== COURSE_ID) invalid.push(`Gói dành cho khoá "${bundle.course_id}".`);
  if (bundle.partial) invalid.push('Gói là bản dựng THIẾU bài (--partial/--only) — dựng lại đủ 48 bài.');
  if (rows.length !== TOTAL) invalid.push(`Gói có ${rows.length} bài, cần đúng ${TOTAL}.`);
  rows.forEach((row, i) => {
    if (row.sort_order !== i + 1) invalid.push(`${row.lesson_code}: sort_order ${row.sort_order}, cần ${i + 1}.`);
    if (!row.content_json.play) invalid.push(`${row.lesson_code}: thiếu khối play.`);
    const errors = validateStudioLesson(row.content_json);
    if (errors.length) invalid.push(`${row.lesson_code}: ${errors.join(' | ')}`);
  });
  if (new Set(rows.map((r) => r.lesson_code)).size !== rows.length) invalid.push('Trùng mã bài trong gói.');
  if (invalid.length) {
    console.error(`${invalid.length} lỗi — không ghi gì:`);
    invalid.forEach((line) => console.error('  ' + line));
    process.exitCode = 1;
    return;
  }
  console.log(`✓ ${TOTAL} bài hợp lệ theo validateStudioLesson().`);

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const course = await prisma.course.findUnique({ where: { id: COURSE_ID } });
    const oldLessons = await prisma.lesson.findMany({ where: { courseId: COURSE_ID } });
    // Tiến độ "của khoá": ghi course này HOẶC trỏ vào bài thuộc khoá này.
    const progressWhere = { OR: [{ courseId: COURSE_ID }, { lesson: { courseId: COURSE_ID } }] };
    const progress = await prisma.lessonProgress.findMany({ where: progressWhere });
    const enrollments = await prisma.enrollment.findMany({ where: { courseId: COURSE_ID } });

    console.log(course ? `Khoá ${COURSE_ID} đã có.` : `Khoá ${COURSE_ID} CHƯA có: sẽ tạo mới.`);
    console.log(`XOÁ HẲN: ${oldLessons.length} bài cũ, ${progress.length} dòng lesson_progress ` +
      `(${new Set(progress.map((p) => p.userId)).size} học viên).`);
    console.log(`${enrollments.length} lượt ghi danh: đặt lại 0 bài / 0% (không huỷ ghi danh).`);
    console.log(`NẠP: ${TOTAL} bài pe-v4; courses.lessons = ${TOTAL}` + (PUBLISH ? '; is_published = true.' : '.'));

    if (!APPLY) {
      console.log('\nCHẠY THỬ — chưa ghi gì. Thêm --apply --backup=<file.json> để làm thật.');
      return;
    }
    if (!BACKUP) {
      console.error('Thiếu --backup=<file.json>: phải sao lưu trước khi xoá.');
      process.exitCode = 1;
      return;
    }

    const template = course
      ? null
      : ((await prisma.course.findUnique({ where: { id: 'python' } })) ??
        (await prisma.course.findFirst({ orderBy: { id: 'asc' } })));
    if (!course && !template) {
      console.error('Không có khoá nào để sao chép giảng viên/ngôn ngữ — dừng.');
      process.exitCode = 1;
      return;
    }

    writeFileSync(
      BACKUP,
      JSON.stringify(
        { exportedAt: new Date().toISOString(), course, lessons: oldLessons, progress, enrollments },
        null,
        1,
      ),
    );
    console.log(`✓ Đã sao lưu ${oldLessons.length} bài, ${progress.length} dòng tiến độ vào ${BACKUP}`);

    await prisma.$transaction(
      async (tx) => {
        const deletedProgress = await tx.lessonProgress.deleteMany({ where: progressWhere });
        const deletedLessons = await tx.lesson.deleteMany({ where: { courseId: COURSE_ID } });
        const meta = { ...((course?.contentMeta ?? template?.contentMeta ?? {}) as Record<string, unknown>), ...META };
        if (!course) {
          await tx.course.create({
            data: {
              id: COURSE_ID,
              title: 'Python Advanced',
              level: template!.level,
              rating: 0,
              lessonCount: TOTAL,
              instructorId: template!.instructorId,
              xp_reward: template!.xp_reward,
              isPublished: PUBLISH,
              contentMeta: meta,
              language: template!.language ?? 'python',
              accentColor: template!.accentColor,
            },
          });
        } else {
          await tx.course.update({
            where: { id: COURSE_ID },
            data: { lessonCount: TOTAL, contentMeta: meta, ...(PUBLISH ? { isPublished: true } : {}) },
          });
        }
        await tx.lesson.createMany({
          data: rows.map((row) => ({
            courseId: COURSE_ID,
            lessonCode: row.lesson_code,
            module: row.module,
            title: row.title,
            subtitle: row.subtitle,
            sortOrder: row.sort_order,
            estimatedMinutes: row.estimated_minutes ?? null,
            xpReward: row.xp_reward,
            contentJson: row.content_json as object,
          })),
        });
        // Tiến độ = số bài 1..48 đã xong; vừa xoá hết tiến độ nên mọi ghi danh về 0.
        await tx.enrollment.updateMany({
          where: { courseId: COURSE_ID },
          data: { completedLessons: 0, progress: 0 },
        });
        console.log(
          `✓ Đã xoá ${deletedLessons.count} bài cũ và ${deletedProgress.count} dòng tiến độ; ` +
            `nạp ${TOTAL} bài pe-v4; courses.lessons = ${TOTAL}.`,
        );
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
