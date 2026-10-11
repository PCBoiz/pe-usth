/**
 * seed-python-advanced.ts — tạo khoá `python_advanced` (Python Advanced): 40 bài
 * PE v3 dạng studio-lesson/v2 có mini-game (ghép code chạy thật, săn lỗi, nối
 * cặp, theo dõi biến, Boss chặng).
 *
 * NGUỒN: scripts/pe-v3/out-advanced/lessons.json, sinh bởi
 *   python scripts/pe-v3/build_advanced.py
 *   node scripts/pe-v3/check-advanced.mjs     (bắt buộc đạt trước khi seed)
 *
 * AN TOÀN:
 *  · Mặc định CHẠY THỬ, không ghi gì. Thêm --apply mới thực sự ghi.
 *  · Chỉ THÊM/CẬP NHẬT dữ liệu của khoá python_advanced — không đụng khoá
 *    python hay bất kỳ khoá nào khác, không xoá dòng nào.
 *  · Khoá mới sao chép thông tin hiển thị (giảng viên, ngôn ngữ, màu, cấp độ)
 *    từ khoá `python`; mặc định is_published = false (chỉ admin thấy). Thêm
 *    --publish để hiện cho mọi học viên.
 *  · Mọi bài đi qua validateStudioLesson() (kể cả khối play) trước; còn lỗi
 *    thì KHÔNG ghi bài nào. Ghi theo (course_id, lesson_code) trong MỘT
 *    transaction: chạy lại là cập nhật, không nhân bản.
 *
 * CHẠY (từ thư mục gốc repo, cần .env có DATABASE_URL):
 *   npx ts-node scripts/seed-python-advanced.ts                    # xem trước
 *   npx ts-node scripts/seed-python-advanced.ts --apply            # ghi, chưa công khai
 *   npx ts-node scripts/seed-python-advanced.ts --apply --publish  # ghi và công khai
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
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
const TEMPLATE_COURSE = 'python';
const APPLY = process.argv.includes('--apply');
const PUBLISH = process.argv.includes('--publish');
const BUNDLE = join(__dirname, 'pe-v3', 'out-advanced', 'lessons.json');

const META = {
  subtitle: '40 bài PE Python học qua mini-game',
  description:
    'Cùng giáo trình 40 bài PE Python v3 nhưng học bằng game: ghép code rồi chạy thật, săn lỗi, ' +
    'nối lệnh với ý nghĩa, theo dõi biến, combo điểm và trận Boss cuối mỗi chặng.',
  tag: 'Mini-game',
  image: 'static/images/python.webp',
};

async function main() {
  const bundle = JSON.parse(readFileSync(BUNDLE, 'utf8')) as { course_id: string; lessons: Row[] };
  const rows = bundle.lessons;
  const total = rows.length;
  console.log(`Nguồn: ${BUNDLE}\n${total} bài -> khoá "${COURSE_ID}", bài 1..${total}.\n`);

  const invalid: string[] = [];
  if (bundle.course_id !== COURSE_ID) invalid.push(`Gói dành cho khoá "${bundle.course_id}", không phải ${COURSE_ID}.`);
  rows.forEach((row, i) => {
    if (row.sort_order !== i + 1) invalid.push(`${row.lesson_code}: sort_order ${row.sort_order}, cần ${i + 1}.`);
    if (!row.content_json.play) invalid.push(`${row.lesson_code}: thiếu khối play.`);
    const errors = validateStudioLesson(row.content_json);
    if (errors.length) invalid.push(`${row.lesson_code}: ${errors.join(' | ')}`);
  });
  if (new Set(rows.map((r) => r.lesson_code)).size !== total) invalid.push('Trùng mã bài trong gói.');
  if (invalid.length) {
    console.error(`${invalid.length} lỗi — không ghi gì:`);
    invalid.forEach((line) => console.error('  ' + line));
    process.exitCode = 1;
    return;
  }
  const games = rows.reduce((n, r) => n + (r.content_json.play?.games as unknown[]).length, 0);
  console.log(`✓ ${total} bài hợp lệ (${games} mini-game).`);

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const template = await prisma.course.findUnique({ where: { id: TEMPLATE_COURSE } });
    if (!template) {
      console.error(`Không thấy khoá mẫu "${TEMPLATE_COURSE}" để sao chép giảng viên/ngôn ngữ — dừng.`);
      process.exitCode = 1;
      return;
    }
    const course = await prisma.course.findUnique({ where: { id: COURSE_ID } });
    const existing = await prisma.lesson.findMany({
      where: { courseId: COURSE_ID },
      select: { id: true, lessonCode: true },
    });
    const byCode = new Map(existing.filter((l) => l.lessonCode).map((l) => [l.lessonCode!, l.id]));
    const toCreate = rows.filter((r) => !byCode.has(r.lesson_code)).length;

    console.log(
      course
        ? `Khoá ${COURSE_ID} đã có (${existing.length} bài): cập nhật nội dung.`
        : `Khoá ${COURSE_ID} chưa có: tạo mới, sao chép thông tin từ khoá "${TEMPLATE_COURSE}".`,
    );
    console.log(`  Thêm ${toCreate} bài, cập nhật ${total - toCreate} bài; courses.lessons = ${total}.`);
    console.log(
      `  is_published = ${PUBLISH ? 'true (công khai)' : course ? `${course.isPublished} (giữ nguyên)` : 'false (chỉ admin thấy)'}`,
    );

    if (!APPLY) {
      console.log('\nCHẠY THỬ — chưa ghi gì. Thêm --apply để ghi thật.');
      return;
    }

    await prisma.$transaction(
      async (tx) => {
        const meta = {
          ...((template.contentMeta ?? {}) as Record<string, unknown>),
          ...META,
        };
        if (!course) {
          await tx.course.create({
            data: {
              id: COURSE_ID,
              title: 'Python Advanced',
              level: template.level,
              rating: 0,
              lessonCount: total,
              instructorId: template.instructorId,
              xp_reward: template.xp_reward,
              isPublished: PUBLISH,
              contentMeta: meta,
              language: template.language ?? 'python',
              accentColor: template.accentColor,
            },
          });
        } else {
          await tx.course.update({
            where: { id: COURSE_ID },
            data: { lessonCount: total, contentMeta: meta, ...(PUBLISH ? { isPublished: true } : {}) },
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
          const id = byCode.get(row.lesson_code);
          if (id) await tx.lesson.update({ where: { id }, data });
          else await tx.lesson.create({ data: { courseId: COURSE_ID, lessonCode: row.lesson_code, ...data } });
        }
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
    console.log(`\n✓ Đã ghi khoá ${COURSE_ID}: ${toCreate} bài mới, ${total - toCreate} bài cập nhật.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
