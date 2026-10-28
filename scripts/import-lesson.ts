/**
 * import-lesson.ts — NHẬP MỘT BÀI HỌC từ tài liệu (.md / .txt / .pdf) vào DB.
 * Luồng: nhập → XEM TRƯỚC → lưu.
 *
 * VÌ SAO LÀ SCRIPT, KHÔNG PHẢI TRANG /admin. Bộ parse
 * (`src/course-admin/lesson-import.service.ts`, 600+ dòng) và route
 * `POST /admin/lessons/import` đã có từ lâu, nhưng KHÔNG trang nào của frontend
 * gọi `/admin/*` — nên tính năng này chưa bao giờ có đường tới người dùng, đúng
 * hình dạng lỗi mà AGENTS.md ghi sáu lần. Chủ dự án đã chốt: đợt này chỉ làm
 * tính năng nhập, trang admin để sau khi merge. Script này là đường vào dùng
 * được HÔM NAY, và nó gọi đúng những hàm mà trang admin sau này sẽ gọi.
 *
 * AN TOÀN — cùng khuôn với `update-lesson-content.ts` và `add-lessons.ts`:
 *  · Mặc định XEM TRƯỚC: parse file, in bài sẽ tạo/cập nhật, KHÔNG ghi gì.
 *  · `--offline`: không kết nối DB, chỉ kiểm file. Dùng khi chưa có .env.
 *  · `--apply` mới ghi. Bài ĐÃ CÓ (cập nhật, ghi đè nội dung cũ) còn bắt buộc
 *    `--backup=<file.json>`; bài MỚI thì không, vì INSERT không đè gì cả —
 *    thứ cần lùi được là chính hàng vừa tạo, và script in ra câu DELETE.
 *  · KHÔNG đụng `lesson_progress`, `enrollments`, `courses`.
 *  · KHÔNG có đường ghi DB thứ ba: bài MỚI đi qua `planLessonInserts`, bài ĐÃ
 *    CÓ đi qua `planContentUpdates` — đúng hai hàm mà hai script kia dùng, nên
 *    mọi luật an toàn của chúng áp luôn cho đường nhập này.
 *
 * CHỈ PARSE THEO MẪU. Nhánh AI đã gỡ hẳn; file lệch mẫu bị TỪ CHỐI kèm danh
 * sách lỗi chỉ rõ thiếu gì ở phần nào (xem LESSON-IMPORT-FORMAT.md).
 *
 * CHẠY (từ gốc repo):
 *   npx ts-node scripts/import-lesson.ts --file=samples/lesson-fstring.md --offline
 *   npx ts-node scripts/import-lesson.ts --file=bai.md --code=TH01 --sort=173
 *   npx ts-node scripts/import-lesson.ts --file=bai.md --code=TH01 --sort=173 --apply
 *   npx ts-node scripts/import-lesson.ts --file=bai.md --code=PY01 --apply --backup=bak.json
 */
import 'dotenv/config';
import { readFileSync, statSync, writeFileSync } from 'fs';
import { basename, isAbsolute, join } from 'path';

import { PrismaNeon } from '@prisma/adapter-neon';

import { PrismaClient } from '../src/generated/prisma';
import {
  dungVanBanTuToaDo,
  FORMAT_DOC,
  LessonImportService,
  rutLeKhoiMa,
} from '../src/course-admin/lesson-import.service';
import {
  fingerprint,
  planLessonInserts,
  type ExistingLesson,
  type InsertRow,
} from '../src/course-admin/lesson-insert';
import {
  planContentUpdates,
  type BundleRow,
  type DbLessonRow,
} from '../src/course-admin/lesson-content-update';
import type { StudioLesson } from '../src/course-admin/studio-lesson.schema';

const ARGV = process.argv.slice(2);
const APPLY = ARGV.includes('--apply');
const OFFLINE = ARGV.includes('--offline');

function co(ten: string): string | undefined {
  const hit = ARGV.find((a) => a.startsWith(`--${ten}=`));
  return hit?.slice(ten.length + 3);
}

const FILE = co('file');
const CODE = co('code')?.trim().toUpperCase();
const SORT = co('sort') ? Number(co('sort')) : undefined;
const COURSE = co('course') ?? 'python_advanced';
const BACKUP = co('backup');
const MODULE = co('module');
const MINUTES = co('minutes') ? Number(co('minutes')) : undefined;
const XP = co('xp') ? Number(co('xp')) : undefined;
const CHUP = co('chup');

/**
 * `--chup=<thư mục>` — CHỤP LẠI fixture của bộ test từ chính file PDF thật.
 *
 * Bộ test Jest không đọc được file .pdf (pdfjs `import()` động để dựng "fake
 * worker", vm của Jest ném `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG`), nên
 * nó chấm phần dựng lại bằng TOẠ ĐỘ CHỤP SẴN. Hai file đó phải sinh từ file
 * PDF, không được gõ tay — gõ tay là tự viết ra dữ liệu chứng minh chính mình.
 *
 *   npx ts-node scripts/import-lesson.ts --file=samples/lesson-fstring.pdf \
 *     --offline --chup=src/course-admin/__fixtures__
 */
async function chupFixture(duongDan: string, thuMuc: string): Promise<void> {
  const svc = new LessonImportService();
  const trangs = await svc.docMauChuPdf(readFileSync(duongDan));
  if (!trangs) {
    console.error('Không đọc được toạ độ chữ — không chụp gì.');
    process.exitCode = 1;
    return;
  }
  // Nén về mảng-của-mảng: fixture 1300 mẩu chữ dạng object nặng gấp đôi mà
  // không đọc được hơn. Thứ tự trường được ghi ra trong chính file.
  const fonts: string[] = [];
  const idFont = (f: string) => {
    let i = fonts.indexOf(f);
    if (i < 0) i = fonts.push(f) - 1;
    return i;
  };
  const lam = (n: number) => Math.round(n * 100) / 100;
  const goi = {
    nguon: basename(duongDan),
    truong: ['x', 'y', 'cao', 'rong', 'font', 'chu'],
    fonts,
    trangs: trangs.map((t) =>
      t.map((m) => [
        lam(m.x),
        lam(m.y),
        lam(m.cao),
        lam(m.rong),
        idFont(m.font),
        m.chu,
      ]),
    ),
  };
  const fileToaDo = join(thuMuc, 'pdf-mau-chu.json');
  writeFileSync(fileToaDo, JSON.stringify(goi));
  const dung = dungVanBanTuToaDo(trangs);
  const fileVanBan = join(thuMuc, 'pdf-boc-ra.txt');
  writeFileSync(fileVanBan, rutLeKhoiMa(dung.text), 'utf8');
  console.log(`✓ ${fileToaDo}`);
  console.log(`✓ ${fileVanBan}`);
  console.log(`  ${dung.doDuoc}`);
  console.log(`  thụt lề khôi phục được: ${dung.deuBe ? 'CÓ' : 'KHÔNG'}`);
}

const ngan = (f: { bytes: number; sha256: string }) =>
  `${f.bytes} B, sha256 ${f.sha256.slice(0, 12)}`;

/** Đọc an toàn một nhánh của bản nháp mà không rải `as any` khắp nơi. */
const ob = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
const dem = (v: unknown): number => (Array.isArray(v) ? v.length : 0);
const coKhong = (v: unknown): string => (v ? 'có' : 'không');

function soLuong(l: StudioLesson): string[] {
  const one = ob(l.step_1);
  const two = ob(l.step_2);
  const three = ob(l.step_3);
  const four = ob(l.step_4);
  return [
    `màn đọc:            ${dem(one.read)}`,
    `câu trắc nghiệm:    ${dem(two.mcq)}` +
      (dem(two.mcq) ? '  (vào kho quiz ôn tập qua step_2.mcq)' : ''),
    `câu dự đoán:        ${one.predict ? 1 : 0}`,
    `mục giải thích:     ${dem(one.explain)}`,
    `màn phân loại:      ${two.classify ? 1 : 0}`,
    `tự giải thích:      ${two.selfExplain ? 1 : 0}`,
    `chỗ trống lắp ghép: ${dem(ob(three.scaffold).slots)}`,
    `ca chấm:            ${dem(four.tests)}`,
    `code khởi tạo: ${coKhong(four.starterCode)}   ` +
      `lời giải mẫu: ${coKhong(four.solutionCode)}`,
  ];
}

async function main(): Promise<void> {
  if (APPLY && OFFLINE) {
    console.error('--apply và --offline loại trừ nhau.');
    process.exitCode = 1;
    return;
  }
  if (!FILE) {
    console.error(
      'Thiếu --file=<đường dẫn .md|.txt|.pdf>. Xem chú thích đầu file.',
    );
    process.exitCode = 1;
    return;
  }

  const duongDan = isAbsolute(FILE) ? FILE : join(process.cwd(), FILE);
  const ten = basename(duongDan);

  if (CHUP) {
    await chupFixture(
      duongDan,
      isAbsolute(CHUP) ? CHUP : join(process.cwd(), CHUP),
    );
    return;
  }

  // `importedAt` lấy MTIME của file nguồn, không phải `new Date()`: nếu không
  // thì bản XEM TRƯỚC và bản GHI THẬT của cùng một file có sha256 khác nhau,
  // và nhập lại một file KHÔNG ĐỔI vẫn hiện là "ĐỔI" — bản in ra mất hết giá
  // trị so sánh. Cùng bài học với `update-lesson-content.ts`.
  const mtime = statSync(duongDan).mtime.toISOString();

  const svc = new LessonImportService();
  const text = await svc.extractText({
    originalname: ten,
    buffer: readFileSync(duongDan),
  });
  const { lesson, errors, warnings } = svc.parseTemplate(text, ten, mtime);

  console.log(`Nguồn: ${duongDan}`);
  console.log(`        ${text.length} ký tự, soạn lúc ${mtime}`);

  for (const w of warnings) console.warn(`  ⚠ ${w}`);

  if (errors.length || !lesson) {
    console.error(`\n${errors.length} lỗi — KHÔNG ghi gì:`);
    errors.forEach((line) => console.error('  • ' + line));
    console.error(`\nSửa file theo ${FORMAT_DOC} rồi chạy lại.`);
    process.exitCode = 1;
    return;
  }

  const fp = fingerprint(lesson);
  console.log(`\n✓ File ĐÚNG MẪU và qua được validateStudioLesson().`);
  console.log(`  Tiêu đề: ${lesson.title}`);
  console.log(`  Nội dung: ${ngan(fp)}`);
  for (const line of soLuong(lesson)) console.log(`    ${line}`);

  if (OFFLINE) {
    console.log(
      '\nCHẠY KHÔ (--offline) — không kết nối DB, không ghi gì.' +
        '\n⚠ KHÔNG kiểm được trùng mã bài hay trùng ô sort_order: hai luật đó cần đọc DB.',
    );
    return;
  }

  if (!CODE) {
    console.error(
      '\nThiếu --code=<MÃ BÀI>. Mã bài là khoá mà cả hai đường nạp tra theo ' +
        '(@@unique([courseId, lessonCode])); không có nó thì không biết đây là ' +
        'bài MỚI hay bài đang có.',
    );
    process.exitCode = 1;
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
      where: { courseId: COURSE },
      select: { sortOrder: true, lessonCode: true, contentJson: true },
    });
    const dangCo = dbRows.find((r) => r.lessonCode === CODE);
    console.log(
      `\nKhoá "${COURSE}" đang có ${dbRows.length} bài. ` +
        (dangCo
          ? `Mã ${CODE} ĐÃ CÓ ở ô ${dangCo.sortOrder} → đường CẬP NHẬT.`
          : `Mã ${CODE} chưa có → đường TẠO BÀI MỚI.`),
    );

    if (dangCo) {
      await capNhat(prisma, lesson, dangCo, dbRows);
    } else {
      await taoMoi(prisma, lesson, dbRows);
    }
  } finally {
    await prisma.$disconnect();
  }
}

/** Bài ĐÃ CÓ: chỉ đổi `content_json`, qua đúng hàm của update-lesson-content.ts. */
async function capNhat(
  prisma: PrismaClient,
  lesson: StudioLesson,
  dangCo: DbLessonRow,
  dbRows: DbLessonRow[],
): Promise<void> {
  if (SORT !== undefined && SORT !== dangCo.sortOrder) {
    console.error(
      `--sort=${SORT} khác ô thật của bài ${CODE} trong DB (${dangCo.sortOrder}). ` +
        'Script này KHÔNG dịch chỗ bài; bỏ --sort đi, hoặc sửa lại cho khớp.',
    );
    process.exitCode = 1;
    return;
  }
  const row: BundleRow = {
    lesson_code: CODE!,
    sort_order: dangCo.sortOrder,
    content_json: lesson,
  };
  const { items, errors } = planContentUpdates([row], dbRows);
  if (errors.length) {
    console.error(`${errors.length} lỗi — không ghi gì:`);
    errors.forEach((l) => console.error('  • ' + l));
    process.exitCode = 1;
    return;
  }
  const item = items[0];
  console.log(
    `  ${item.code} (ô ${item.sortOrder}): ` +
      (item.changed
        ? `ĐỔI  ${ngan(item.before)} → ${ngan(item.after)}`
        : `không đổi (${ngan(item.after)})`),
  );
  console.log(
    '  lesson_progress / enrollments / courses: không đụng. ' +
      'title, xp_reward… của bài: giữ nguyên.',
  );

  if (!APPLY) {
    console.log(
      '\nXEM TRƯỚC — chưa ghi gì. Thêm --apply --backup=<file.json> để làm thật.',
    );
    return;
  }
  if (!BACKUP) {
    console.error(
      '\nThiếu --backup=<file.json>: đường CẬP NHẬT ghi đè nội dung cũ, phải sao lưu trước.',
    );
    process.exitCode = 1;
    return;
  }
  if (!item.changed) {
    console.log('Không có gì để ghi.');
    return;
  }

  writeFileSync(
    BACKUP,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        courseId: COURSE,
        lessons: [dangCo],
      },
      null,
      1,
    ),
  );
  console.log(`✓ Đã sao lưu content_json cũ của ${item.code} vào ${BACKUP}`);

  // Hạn 120 s: canh TREO, không canh tốc độ — xem chú thích cùng chỗ trong
  // update-lesson-content.ts (một bài thì nhanh, nhưng đặt sát số đo thật là
  // tự tạo lỗi ngẫu nhiên vào ngày DB chậm hơn thường).
  await prisma.$transaction(
    async (tx) => {
      const res = await tx.lesson.updateMany({
        where: {
          courseId: COURSE,
          sortOrder: item.sortOrder,
          lessonCode: item.code,
        },
        data: { contentJson: item.content as object },
      });
      if (res.count !== 1) {
        throw new Error(
          `${item.code}: UPDATE trúng ${res.count} hàng, cần đúng 1 — huỷ toàn bộ.`,
        );
      }
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
  console.log(`\n✓ Đã cập nhật content_json của ${item.code}.`);
}

/** Bài MỚI: qua đúng sáu luật của add-lessons.ts. */
async function taoMoi(
  prisma: PrismaClient,
  lesson: StudioLesson,
  dbRows: DbLessonRow[],
): Promise<void> {
  const oLonNhat = dbRows.reduce((a, r) => Math.max(a, r.sortOrder), 0);
  if (SORT === undefined) {
    console.error(
      `Thiếu --sort=<số>. Bài mới phải NỐI TIẾP vào cuối khoá: ô lớn nhất đang ` +
        `có là ${oLonNhat}, nên ô tiếp theo là ${oLonNhat + 1}.`,
    );
    process.exitCode = 1;
    return;
  }
  const row: InsertRow = {
    lesson_code: CODE!,
    sort_order: SORT,
    module: MODULE,
    title: lesson.title,
    estimated_minutes: MINUTES ?? null,
    xp_reward: XP ?? 0,
    content_json: lesson,
  };
  const existing: ExistingLesson[] = dbRows.map((r) => ({
    sortOrder: r.sortOrder,
    lessonCode: r.lessonCode,
  }));
  const { plan, errors } = planLessonInserts([row], existing);
  if (errors.length) {
    console.error(`${errors.length} lỗi — KHÔNG tạo gì:`);
    errors.forEach((l) => console.error('  • ' + l));
    // Luật 6 của planLessonInserts đòi `step_1.read` hoặc `play`: nó được viết
    // cho hai bộ dựng sẵn (pe-da có `read`, pe-v4 có `play`). Bài nhập theo
    // mẫu S1..S4 không mang dấu nào trong hai dấu đó, nên lỗi đó KHÔNG phải
    // lỗi của file — nói ra cách đi tiếp, đừng để người chạy đoán.
    if (errors.some((l) => l.includes('dựng dở'))) {
      console.error(
        `\n→ Đường TẠO BÀI MỚI đòi bài phải có phần \`## Đọc\` (sinh ra ` +
          `\`step_1.read\`). Thêm phần đó vào tài liệu (xem ${FORMAT_DOC}), ` +
          'hoặc dùng mã của một bài ĐÃ CÓ để đi đường CẬP NHẬT.',
      );
    }
    process.exitCode = 1;
    return;
  }
  const p = plan[0];
  console.log(`  + ô ${p.sortOrder}  ${p.code}  ${ngan(p)}`);
  console.log('  lesson_progress / enrollments / courses: không đụng.');

  if (!APPLY) {
    console.log('\nXEM TRƯỚC — chưa ghi gì. Thêm --apply để tạo thật.');
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.lesson.create({
        data: {
          courseId: COURSE,
          lessonCode: p.code,
          sortOrder: p.sortOrder,
          module: p.row.module ?? null,
          title: p.row.title ?? null,
          subtitle: p.row.subtitle ?? null,
          estimatedMinutes: p.row.estimated_minutes ?? null,
          xpReward: p.row.xp_reward ?? 0,
          // `as object`: InputJsonValue của Prisma không nhận unknown.
          contentJson: p.content as object,
        },
      });
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
  console.log(`\n✓ Đã tạo bài ${p.code} ở ô ${p.sortOrder}.`);
  console.log(
    'Muốn lùi lại thì xoá đúng hàng vừa tạo:\n' +
      `  DELETE FROM lessons WHERE course_id = '${COURSE}' AND lesson_code = '${p.code}';`,
  );
  console.log(
    'Số bài của khoá ĐÃ ĐỔI — nhớ chạy `py scripts/pe-da/sync_curricula.py`, ' +
      'xem bẫy "Hai nguồn danh sách bài" trong AGENTS.md.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
