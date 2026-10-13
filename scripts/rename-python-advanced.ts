/**
 * rename-python-advanced.ts — đổi TÊN HIỂN THỊ của khoá `python_advanced` trong DB
 * Neon thành "Advanced Python" và gột mọi chữ "mini-game" khỏi phần giới thiệu.
 *
 * Vì sao cần script riêng: tên khoá nằm ở BA chỗ và chúng không tự đồng bộ —
 *   1. `frontend/src/lib/catalog.ts` (danh mục TĨNH mà trang chủ/trang chi tiết đọc),
 *   2. `scripts/seed-python-advanced-v4.ts` (`TITLE` + `META`, dùng khi seed lại),
 *   3. hàng `courses` trong DB (cột `title`, cùng `content_meta.subtitle/description/tag`).
 * Sửa hai chỗ đầu không chạm tới DB: API `/api/courses*` vẫn trả tên cũ, nên mọi
 * chỗ đọc tên khoá từ API (danh sách khoá của học viên, màn ghi danh) còn hiện
 * "Python Advanced — học qua mini-game". Chạy seed lại để đổi tên thì XOÁ HẲN 48
 * bài + tiến độ (xem đầu seed-python-advanced-v4.ts) — quá đắt cho một lần đổi
 * chữ. Script này chỉ UPDATE đúng một hàng `courses`, không đụng bài hay tiến độ.
 *
 * `tag` bị XOÁ khỏi `content_meta` chứ không đổi chữ: trang chi tiết đã bỏ hẳn
 * dòng nhãn "MINI-GAME · NÂNG CAO" (xem `CatalogCourse.tag` trong catalog.ts),
 * nên để lại thẻ cũ trong DB chỉ chờ ngày một màn hình khác in nó ra.
 *
 * AN TOÀN:
 *  · Mặc định CHẠY THỬ: in giá trị cũ → giá trị mới, KHÔNG ghi gì.
 *  · Chỉ ghi khi có `--apply`.
 *  · Chỉ `UPDATE` hàng id = 'python_advanced'; không bài, không tiến độ, không khoá khác.
 *  · `content_meta` được GHÉP (giữ nguyên các khoá khác như `image`), chỉ đặt lại
 *    subtitle/description và bỏ `tag`.
 *
 * CHẠY (từ thư mục gốc repo, cần .env có DATABASE_URL):
 *   npx ts-node scripts/rename-python-advanced.ts            # xem trước
 *   npx ts-node scripts/rename-python-advanced.ts --apply    # ghi thật
 */
import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma';

const COURSE_ID = 'python_advanced';
const APPLY = process.argv.includes('--apply');

// Phải TRÙNG `frontend/src/lib/catalog.ts` và `META` trong
// scripts/seed-python-advanced-v4.ts — ba nguồn của cùng một cái tên.
const TITLE = 'Advanced Python';
const SUBTITLE = '48 bài Python nâng cao, chạy ngay trong trình duyệt';
const DESCRIPTION =
  'Process và subprocess, đa luồng, GUI Tkinter, SQL, NumPy, pandas, Matplotlib và dự án phân tích dữ liệu — ' +
  'chạy Python ngay trong trình duyệt: ghép code rồi chạy thật, săn lỗi, sửa code và trận Boss cuối chặng.';

/** In "cũ → mới" cho một trường, hoặc "(không đổi)" nếu đã đúng. */
function line(field: string, before: unknown, after: unknown): string {
  const b = before === undefined ? '(không có)' : JSON.stringify(before);
  const a = after === undefined ? '(xoá)' : JSON.stringify(after);
  return `  ${field}:\n    cũ: ${b}\n    mới: ${a}${b === a ? '   (không đổi)' : ''}`;
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const course = await prisma.course.findUnique({ where: { id: COURSE_ID } });
    if (!course) {
      console.error(`Không thấy khoá ${COURSE_ID} trong DB — không đổi gì.`);
      process.exitCode = 1;
      return;
    }

    const oldMeta = (course.contentMeta ?? {}) as Record<string, unknown>;
    // Bỏ `tag` ra khỏi bản mới: spread rồi delete, không gán `tag: undefined`
    // (Prisma ghi JSON nguyên khối nên undefined sẽ thành null, không phải "mất khoá").
    const newMeta: Record<string, unknown> = {
      ...oldMeta,
      subtitle: SUBTITLE,
      description: DESCRIPTION,
    };
    delete newMeta.tag;

    console.log(`Khoá ${COURSE_ID} (lessons = ${course.lessonCount}, is_published = ${course.isPublished}):`);
    console.log(line('title', course.title ?? undefined, TITLE));
    console.log(line('content_meta.subtitle', oldMeta.subtitle, SUBTITLE));
    console.log(line('content_meta.description', oldMeta.description, DESCRIPTION));
    console.log(line('content_meta.tag', oldMeta.tag, undefined));
    const otherKeys = Object.keys(oldMeta).filter(
      (k) => !['subtitle', 'description', 'tag'].includes(k),
    );
    console.log(`  (giữ nguyên các khoá content_meta khác: ${otherKeys.join(', ') || 'không có'})`);

    if (!APPLY) {
      console.log('\nCHẠY THỬ — chưa ghi gì. Thêm --apply để làm thật.');
      return;
    }

    await prisma.course.update({
      where: { id: COURSE_ID },
      // `as object`: InputJsonValue của Prisma không nhận Record<string, unknown>
      // (cùng lý do với `contentJson: row.content_json as object` ở seed v4).
      data: { title: TITLE, contentMeta: newMeta as object },
    });
    console.log(`\n✓ Đã đổi tên khoá ${COURSE_ID} thành "${TITLE}" và cập nhật content_meta.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
