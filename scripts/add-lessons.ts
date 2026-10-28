/**
 * add-lessons.ts — TẠO bài mới cho khoá `python_advanced`, KHÔNG đụng tiến độ.
 *
 * VÌ SAO CẦN. Trước script này, repo có đúng hai đường nạp và không đường nào
 * tạo được bài:
 *
 *   · `seed-python-advanced-v4.ts --apply` — `deleteMany` cả bài VÀ toàn bộ
 *     `lesson_progress` của khoá, rồi đặt mọi ghi danh về 0. Tức "thêm một
 *     chặng mới" và "xoá tiến độ của mọi người đang học" là CÙNG MỘT thao tác.
 *   · `update-lesson-content.ts` — an toàn, nhưng nó nói thẳng: "script này
 *     chỉ CẬP NHẬT, không tạo bài".
 *
 * Nên một module mới viết xong là nằm trong `out/` mãi mãi. Đây là đúng hình
 * dạng lỗi mà AGENTS.md ghi bốn lần (tracer không bài nào tới, nút "Try it
 * Yourself" không màn nào mount, kho quiz rỗng, 13 màn tối): thứ được dựng tử
 * tế mà không có đường tới người học.
 *
 * AN TOÀN — cùng khuôn với update-lesson-content.ts, đừng nới:
 *  · Mặc định CHẠY THỬ: đọc DB, in bài nào sẽ tạo (ô, mã, kích thước, sha256),
 *    KHÔNG ghi.
 *  · `--offline`: không kết nối DB, chỉ kiểm gói. Dùng khi chưa có .env.
 *  · `--apply` tạo thật. KHÔNG đòi `--backup` như đường cập nhật, và đó là
 *    quyết định có lý do: INSERT không ghi đè gì cả, nên không có nội dung cũ
 *    nào để sao lưu. Thứ cần lùi được là chính các hàng vừa tạo, và script in
 *    ra danh sách mã bài + câu lệnh xoá đúng chúng.
 *  · Mọi INSERT trong MỘT transaction, `timeout` 120 s (nạp 172 bài đo được
 *    ~5 s trên Neon; đây là 24× biên, và hạn này canh TREO chứ không canh tốc
 *    độ — đặt sát số đo thật là tự tạo lỗi ngẫu nhiên vào ngày DB chậm hơn).
 *  · KHÔNG đụng `lesson_progress`, `enrollments`, `courses`. KHÔNG sửa bài đã
 *    có. KHÔNG dịch `sort_order` của bài nào.
 *
 * Sáu luật chọn/kiểm nằm ở `src/course-admin/lesson-insert.ts` (13 ca Jest).
 *
 * CHẠY (từ gốc repo):
 *   npx ts-node scripts/add-lessons.ts --codes=TH01,TH02 --offline
 *   npx ts-node scripts/add-lessons.ts --codes=TH01,TH02            # xem trước
 *   npx ts-node scripts/add-lessons.ts --codes=TH01,TH02 --apply
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';

import { PrismaNeon } from '@prisma/adapter-neon';

import { PrismaClient } from '../src/generated/prisma';
import {
  planLessonInserts,
  type ExistingLesson,
  type InsertRow,
} from '../src/course-admin/lesson-insert';

const COURSE_ID = 'python_advanced';
const GOI = join(__dirname, 'pe-da', 'out', 'lessons.json');

function doc(co: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${co}=`));
  return hit?.slice(co.length + 3);
}
const CO_APPLY = process.argv.includes('--apply');
const CO_OFFLINE = process.argv.includes('--offline');

function main_sync(): InsertRow[] {
  const codes = (doc('codes') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!codes.length) {
    console.error('Thiếu --codes=MA1,MA2. Xem chú thích đầu file.');
    process.exit(1);
  }
  const goi = JSON.parse(readFileSync(GOI, 'utf8')) as {
    course_id?: string;
    lessons: InsertRow[];
  };
  if (goi.course_id !== COURSE_ID) {
    console.error(`Gói dành cho khoá "${goi.course_id}", không phải "${COURSE_ID}".`);
    process.exit(1);
  }
  const theoMa = new Map(goi.lessons.map((r) => [r.lesson_code, r]));
  const thieu = codes.filter((c) => !theoMa.has(c));
  if (thieu.length) {
    console.error(`Mã không có trong gói: ${thieu.join(', ')}.`);
    process.exit(1);
  }
  return codes.map((c) => theoMa.get(c)!);
}

async function main(): Promise<void> {
  const rows = main_sync();

  // CHẠY KHÔ: không có DB thì coi như khoá chưa có bài nào — chỉ đủ để kiểm
  // hình dạng gói và nội dung, KHÔNG kiểm được trùng mã/trùng ô. Nói rõ điều
  // đó ra, vì một bản "offline sạch" không chứng minh được là nạp sẽ thành.
  if (CO_OFFLINE) {
    const { plan, errors } = planLessonInserts(rows, []);
    if (errors.length) {
      console.error('GÓI HỎNG:\n  ' + errors.join('\n  '));
      process.exit(1);
    }
    for (const p of plan) {
      console.log(`  ${p.code} (ô ${p.sortOrder}): ${p.bytes} B, sha256 ${p.sha256.slice(0, 12)}`);
    }
    console.log(
      `\nCHẠY KHÔ (--offline) — không kết nối DB. ${plan.length} bài qua được phép kiểm nội dung.`
        + '\n⚠ KHÔNG kiểm được trùng mã hay trùng ô sort_order: hai luật đó cần đọc DB.',
    );
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({
      connectionString: process.env.DATABASE_URL!,
      connectionTimeoutMillis: 30_000,
    }),
  });
  try {
    const dbRows = await prisma.lesson.findMany({
      where: { courseId: COURSE_ID },
      select: { sortOrder: true, lessonCode: true },
    });
    const existing: ExistingLesson[] = dbRows;

    const { plan, errors } = planLessonInserts(rows, existing);
    if (errors.length) {
      console.error('KHÔNG TẠO ĐƯỢC:\n  ' + errors.join('\n  '));
      process.exit(1);
    }

    console.log(`Khoá đang có ${existing.length} bài. Sẽ TẠO ${plan.length} bài:`);
    for (const p of plan) {
      console.log(`  + ô ${p.sortOrder}  ${p.code}  ${p.bytes} B  sha256 ${p.sha256.slice(0, 12)}`);
    }

    if (!CO_APPLY) {
      console.log('\nCHẠY THỬ — chưa ghi gì. Thêm --apply để tạo thật.');
      return;
    }

    await prisma.$transaction(
      async (tx) => {
        for (const p of plan) {
          await tx.lesson.create({
            data: {
              courseId: COURSE_ID,
              lessonCode: p.code,
              sortOrder: p.sortOrder,
              module: p.row.module ?? null,
              title: p.row.title ?? null,
              subtitle: p.row.subtitle ?? null,
              estimatedMinutes: p.row.estimated_minutes ?? null,
              xpReward: p.row.xp_reward ?? 0,
              // `as object`: InputJsonValue của Prisma không nhận unknown —
              // cùng lý do với seed v4 và đường cập nhật.
              contentJson: p.content as object,
            },
          });
        }
      },
      { timeout: 120_000, maxWait: 20_000 },
    );

    const ma = plan.map((p) => p.code);
    console.log(`\n✓ Đã tạo ${plan.length} bài: ${ma.join(', ')}.`);
    console.log(
      'Muốn lùi lại thì xoá đúng các hàng vừa tạo:\n'
        + `  DELETE FROM lessons WHERE course_id = '${COURSE_ID}' `
        + `AND lesson_code IN (${ma.map((m) => `'${m}'`).join(', ')});`,
    );
    console.log('Nhớ chạy `py scripts/pe-da/sync_curricula.py` — xem bẫy "Hai nguồn danh sách bài".');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
