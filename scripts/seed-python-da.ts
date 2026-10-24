/**
 * seed-python-da.ts — THAY giáo trình khoá `python_advanced` bằng 172 bài
 * "Python cho Data Analyst" (PY01…, 10 module M1–M10), dạng studio-lesson/v2
 * KHÔNG chấm: bài đọc (`step_1.read`) + câu luyện tập có đáp án mẫu
 * (`step_2.practice`) + sandbox chạy tự do hoặc hướng dẫn chạy trên máy.
 *
 * NGUỒN: scripts/pe-da/out/lessons.json, sinh bởi
 *   py scripts/pe-da/build.py        (dựng 172 bài từ source/course.json)
 *   py scripts/pe-da/check.py        (kiểm hình dạng bài + chạy thử code)
 *   py scripts/pe-da/sync_curricula.py  (chép giáo trình sang frontend)
 * Hình dạng bài: scripts/pe-da/SCHEMA.md.
 *
 * Khác `scripts/seed-python-advanced-v4.ts` (bản 48 bài pe-v4, nay nghỉ):
 *  · gói mới có 172 bài, mã bài PYxx không trùng mã pe-v4, nên cập nhật theo
 *    lesson_code sẽ để lại 48 bài cũ chen giữa (trùng sort_order 1..48) —
 *    vì vậy bản này XOÁ HẲN bài cũ + tiến độ của khoá rồi nạp 172 bài mới;
 *  · bài mới KHÔNG có `step_4.tests`, không `play`, không `gate`: nguồn là
 *    giáo trình đọc, không có bộ ca chấm. Xem mục "Không khai gì nữa" trong
 *    SCHEMA.md để biết hệ quả (quiz ôn tập không còn câu hỏi, không bài cửa);
 *  · hai trường `_mode`/`_blocked` của gói CHỈ để kiểm, KHÔNG ghi vào DB.
 *
 * AN TOÀN:
 *  · Mặc định CHẠY THỬ: chỉ in sẽ xoá/nạp gì, kể cả số dòng tiến độ thật đọc
 *    từ DB.
 *  · --apply bắt buộc kèm --backup=<file.json>: ghi bản sao (khoá, bài cũ,
 *    tiến độ, ghi danh) TRƯỚC khi xoá.
 *  · Gói phải đủ 172 bài, sort_order 1..172, mã bài không trùng, mọi bài qua
 *    cả validateStudioLesson() lẫn các luật riêng của pe-da; lỗi một bài là
 *    không ghi gì.
 *  · Xoá + nạp + courses.lessons = 172 + đặt lại tiến độ ghi danh trong MỘT
 *    transaction. XP/gems/streak đã cộng ở bảng users giữ nguyên.
 *  · Không đụng khoá nào khác. Khoá python_advanced chưa có thì tạo mới (sao
 *    chép giảng viên/ngôn ngữ từ khoá `python` nếu còn, không thì từ khoá bất kỳ).
 *
 * CHẠY (từ thư mục gốc repo, cần .env có DATABASE_URL):
 *   npx ts-node scripts/seed-python-da.ts                                    # xem trước
 *   npx ts-node scripts/seed-python-da.ts --apply --backup=python-da-backup.json
 *   thêm --publish để đặt is_published = true
 *
 * Sau khi --apply: chạy `py scripts/pe-da/sync_curricula.py` rồi kiểm
 * `frontend/src/lib/curricula.json` và `frontend/src/lib/catalog.ts` có cùng số
 * bài — xem bẫy "Hai nguồn danh sách bài" trong AGENTS.md.
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

/** Một hàng của gói. `_mode`/`_blocked` là dữ liệu KIỂM, không phải nội dung bài. */
type Row = {
  lesson_code: string;
  sort_order: number;
  module: string;
  title: string;
  subtitle: string;
  estimated_minutes: number | null;
  xp_reward: number;
  content_json: StudioLesson;
  _mode?: string;
  _blocked?: { block: number; reason: string }[];
};

const COURSE_ID = 'python_advanced';
const TOTAL = 172;
const APPLY = process.argv.includes('--apply');
const PUBLISH = process.argv.includes('--publish');
const BACKUP = process.argv.find((a) => a.startsWith('--backup='))?.slice('--backup='.length);
const BUNDLE = join(__dirname, 'pe-da', 'out', 'lessons.json');

/** `step_4.packages` chỉ được dùng wheel tự lưu trong frontend/public/pyodide/v0.27.7/. */
const PACKAGES_CHO_PHEP = ['numpy', 'pandas', 'matplotlib', 'sqlite3'];
/**
 * Các loại khối hợp lệ của `step_1.read`.
 *
 * SCHEMA.md § step_1.read chỉ kể ba loại `paragraph | code | table`, nhưng gói
 * đang dựng còn phát `terminal` (lệnh shell, 21 khối) và `figure` (ảnh biểu đồ
 * do code vẽ ra, 80 khối) — scripts/pe-da/check.py:109 đã ghi nhận chỗ lệch đó.
 * Liệt kê đủ năm loại ở đây vì danh sách này là CỬA CHẶN: thiếu một loại đang
 * dùng thì script từ chối nạp cả 172 bài, còn để lọt một loại renderer không
 * biết vẽ thì học viên thấy màn trống.
 */
const READ_BLOCK_TYPES = ['paragraph', 'code', 'terminal', 'table', 'figure'];

/**
 * Tên hiển thị của khoá, phải TRÙNG `frontend/src/lib/catalog.ts` (danh mục tĩnh
 * mà trang chủ/trang chi tiết đang đọc — backend đòi JWT nên frontend không gọi
 * API danh mục được).
 *
 * 24/10/2026 đổi từ "Advanced Python" sang tên này: khoá không còn là khoá nâng
 * cao thuần. Bài đầu tiên (PY01) bắt đầu từ `print(12 + 9)` và 54/172 bài ở mức
 * "Cơ bản", nên giữ tên cũ là nói sai với người chưa biết Python — họ sẽ bỏ qua
 * đúng khoá dành cho mình. Tên cũ "Advanced Python" thuộc bộ 48 bài pe-v4 đã
 * nghỉ; `scripts/seed-python-advanced-v4.ts` và `scripts/rename-python-advanced.ts`
 * vẫn mang tên đó vì chúng là công cụ của bộ cũ — đừng chạy chúng nữa, chạy là
 * kéo cả tên lẫn 48 bài cũ trở lại.
 */
const TITLE = 'Python cho Data Analyst';
const META = {
  subtitle: '172 bài: từ phép cộng đầu tiên tới phân tích dữ liệu',
  // KHÔNG ghi số bài chạy-trong-trình-duyệt vào đây: tỉ lệ pyodide/mixed/local
  // đổi theo từng lần dựng lại — chiều 24/10/2026 nó đi 133/12/27 → 130/15/27 →
  // 128/17/27 trong vòng một giờ. Con số chính xác nằm ở phần "Yêu cầu" của
  // `curricula.json` (sync_curricula.py sinh lại mỗi lần dựng); phần chạy thử
  // của script này cũng in tỉ lệ thật của đúng gói đang nạp.
  description:
    'Học bằng cách đọc lời giảng, đọc code kèm kết quả thật rồi tự chạy lại và sửa. ' +
    'Python nền tảng, NumPy, pandas, trực quan hoá (Matplotlib, seaborn, Plotly), OOP và sqlite3, ' +
    'tiến trình và đa luồng, Tkinter — phần lớn bài chạy ngay trong trình duyệt, ' +
    'những bài cần thư viện không có sẵn thì có hướng dẫn chạy trên máy.',
  image: 'static/images/python.webp',
};

/** Kiểm các luật riêng của pe-da — những thứ validateStudioLesson() chưa biết. */
function kiemBaiPeDa(row: Row): string[] {
  const loi: string[] = [];
  const c = row.content_json as Record<string, unknown>;
  const step1 = (c.step_1 ?? {}) as Record<string, unknown>;
  const step2 = (c.step_2 ?? {}) as Record<string, unknown>;
  const step4 = (c.step_4 ?? {}) as Record<string, unknown>;

  // `_mode`/`_blocked` chỉ được nằm NGOÀI content_json. Lọt vào trong là ghi dữ
  // liệu kiểm thẳng vào DB rồi gửi ra frontend cho mọi học viên.
  for (const khoa of ['_mode', '_blocked']) {
    if (khoa in c) loi.push(`content_json còn trường kiểm "${khoa}".`);
  }

  // step_1.read — mỗi phần tử là MỘT màn, mỗi màn là mảng khối.
  const read = step1.read;
  if (!Array.isArray(read) || read.length === 0) {
    loi.push(`thiếu step_1.read (bài đọc không có màn nào).`);
  } else {
    read.forEach((man, i) => {
      if (!Array.isArray(man) || man.length === 0) {
        loi.push(`step_1.read[${i}] phải là mảng khối, không rỗng.`);
        return;
      }
      man.forEach((block, j) => {
        const at = `step_1.read[${i}][${j}]`;
        if (typeof block !== 'object' || block === null) return loi.push(`${at} sai kiểu.`);
        const b = block as Record<string, unknown>;
        const type = String(b.type ?? '');
        if (!READ_BLOCK_TYPES.includes(type)) return loi.push(`${at}.type: "${type}" không hợp lệ.`);
        if (type === 'paragraph' && !String(b.text ?? '').trim()) loi.push(`${at}.text: rỗng.`);
        if ((type === 'code' || type === 'terminal') && !String(b.code ?? '').trim())
          loi.push(`${at}.code: rỗng.`);
        if (type === 'table' && !(Array.isArray(b.headers) && Array.isArray(b.rows)))
          loi.push(`${at}: bảng thiếu headers/rows.`);
        if (type === 'figure') {
          // Ảnh phải là đường dẫn CÙNG MIỀN trong /static/da/ (CSP img-src của
          // frontend không cho miền ngoài), và phải có `alt` — thiếu alt thì
          // trình đọc màn hình đọc ra tên file. File có thật hay không thì
          // scripts/pe-da/check.py đã kiểm, ở đây chỉ chặn hình dạng.
          const src = String(b.src ?? '');
          if (!/^\/static\/da\/[\w.-]+\.(png|jpg|jpeg|webp|svg)$/.test(src))
            loi.push(`${at}.src: "${src}" không phải đường dẫn /static/da/<file ảnh>.`);
          if (!String(b.alt ?? '').trim()) loi.push(`${at}.alt: thiếu mô tả cho trình đọc màn hình.`);
        }
      });
    });
  }

  // step_2.practice — câu luyện tập KHÔNG chấm, nhưng phải có đáp án mẫu để
  // nút "Xem đáp án" hiện được cái gì.
  const practice = step2.practice;
  if (!Array.isArray(practice) || practice.length === 0) {
    loi.push(`thiếu step_2.practice.`);
  } else {
    practice.forEach((item, i) => {
      const at = `step_2.practice[${i}]`;
      if (typeof item !== 'object' || item === null) return loi.push(`${at} sai kiểu.`);
      const p = item as Record<string, unknown>;
      if (!String(p.prompt ?? '').trim()) loi.push(`${at}.prompt: thiếu đề.`);
      if (!String(p.answer ?? '').trim()) loi.push(`${at}.answer: thiếu đáp án mẫu.`);
    });
  }

  // step_4 phải khớp `_mode` mà khâu kiểm code đã quyết (SCHEMA.md § step_4):
  // lệch nghĩa là bài hiện sai giao diện — ví dụ bài seaborn mà có ô soạn mã thì
  // học viên bấm Chạy và nhận lỗi import, không hiểu vì sao.
  const starter = String(step4.starterCode ?? '').trim();
  const procedure = step4.procedure;
  if (!step4.task) loi.push(`thiếu step_4.task.`);
  const mode = row._mode;
  if (mode === 'local') {
    if (starter) loi.push(`_mode=local nhưng vẫn có starterCode (editor sẽ hiện).`);
    if (!Array.isArray(procedure) || procedure.length === 0)
      loi.push(`_mode=local mà thiếu step_4.procedure.`);
  } else if (mode === 'pyodide' || mode === 'mixed') {
    if (!starter) loi.push(`_mode=${mode} mà thiếu starterCode.`);
    if (mode === 'mixed' && !String(step4.env ?? '').trim())
      loi.push(`_mode=mixed phải có step_4.env nói khối nào chạy trên máy.`);
  } else {
    loi.push(`_mode="${String(mode)}" lạ (chờ pyodide|local|mixed).`);
  }
  const packages = step4.packages;
  if (packages !== undefined) {
    if (!Array.isArray(packages)) loi.push(`step_4.packages phải là mảng.`);
    else
      packages.forEach((p) => {
        if (!PACKAGES_CHO_PHEP.includes(String(p)))
          loi.push(`step_4.packages có "${String(p)}" — không có wheel cùng miền.`);
      });
  }
  return loi;
}

async function main() {
  const bundle = JSON.parse(readFileSync(BUNDLE, 'utf8')) as {
    course_id: string;
    partial?: boolean;
    lessons: Row[];
  };
  const rows = bundle.lessons;
  console.log(`Nguồn: ${BUNDLE}\n${rows.length} bài -> khoá "${COURSE_ID}".\n`);

  // Kiểm CẢ gói trước khi chạm DB — hoặc đủ, hoặc không ghi gì. Gói dựng thiếu
  // (`--partial`) có thể dồn sort_order, mà bài được tra theo
  // `(course_id, sort_order)`: khi đó nội dung bài này ghi đè lên bài khác.
  const invalid: string[] = [];
  if (bundle.course_id !== COURSE_ID) {
    invalid.push(`Gói dành cho khoá "${String(bundle.course_id)}", không phải "${COURSE_ID}".`);
  }
  if (bundle.partial) {
    invalid.push(`Gói là bản dựng THIẾU bài (--partial/--only) — dựng lại đủ ${TOTAL} bài.`);
  }
  if (rows.length !== TOTAL) {
    invalid.push(`Gói có ${rows.length} bài, cần đúng ${TOTAL}.`);
  }
  rows.forEach((row, i) => {
    if (row.sort_order !== i + 1) {
      invalid.push(`${row.lesson_code}: sort_order ${row.sort_order}, cần ${i + 1}.`);
    }
    if (!(typeof row.estimated_minutes === 'number' && row.estimated_minutes > 0)) {
      invalid.push(`${row.lesson_code}: thiếu estimated_minutes (thời lượng khoá sẽ hụt).`);
    }
    // validateStudioLesson() nay tự nhận ra bài ĐỌC qua `step_1.read` nên không
    // còn đòi `step_4.tests` ở bài có starterCode — trước đây script phải lọc
    // luật đó bằng cách so khớp chuỗi thông báo lỗi, cách sửa một chữ trong
    // schema là hỏng mà không ai biết.
    const errors = validateStudioLesson(row.content_json);
    errors.push(...kiemBaiPeDa(row));
    if (errors.length) invalid.push(`${row.lesson_code}: ${errors.join(' | ')}`);
  });

  if (invalid.length) {
    console.error(`${invalid.length} lỗi — không ghi gì:`);
    invalid.forEach((line) => console.error('  ' + line));
    process.exitCode = 1;
    return;
  }

  const phut = rows.reduce((s, r) => s + (r.estimated_minutes ?? 0), 0);
  const modules = [...new Set(rows.map((r) => r.module))];
  const dem = (mode: string) => rows.filter((r) => r._mode === mode).length;
  console.log(
    `✓ ${TOTAL} bài hợp lệ (validateStudioLesson + luật riêng của pe-da).`,
  );
  console.log(
    `   ${modules.length} module, ${phut} phút ≈ ${(phut / 60).toFixed(1)} giờ; ` +
      `${dem('pyodide')} bài chạy trong trình duyệt / ${dem('mixed')} hỗn hợp / ${dem('local')} chạy trên máy.`,
  );

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

    console.log('');
    console.log('================  THAO TÁC NÀY XOÁ DỮ LIỆU HỌC TẬP  ================');
    console.log(course ? `Khoá ${COURSE_ID} đã có: "${course.title}" (${oldLessons.length} bài).`
      : `Khoá ${COURSE_ID} CHƯA có: sẽ tạo mới.`);
    console.log(`  · XOÁ HẲN ${oldLessons.length} bài cũ của khoá.`);
    console.log(
      `  · XOÁ HẲN ${progress.length} dòng lesson_progress ` +
        `(${new Set(progress.map((p) => p.userId)).size} học viên) — KHÔNG phục hồi được ngoài bản sao lưu.`,
    );
    console.log(
      `  · ĐẶT LẠI ${enrollments.length} lượt ghi danh về completedLessons: 0, progress: 0 ` +
        '(không huỷ ghi danh; XP/gems/streak ở bảng users giữ nguyên).',
    );
    console.log('  Ai đang học dở khoá này sẽ mở lại từ bài 1. Chỉ chạy --apply khi khoá CÒN TRỐNG');
    console.log('  hoặc đã hẹn trước với người đang thử. Sửa vài chữ trong vài bài thì dùng');
    console.log('  scripts/update-lesson-content.ts (không đụng tiến độ) — xem AGENTS.md.');
    console.log('===================================================================');
    console.log(
      `NẠP: ${TOTAL} bài pe-da; courses.title = "${TITLE}"; courses.lessons = ${TOTAL}` +
        (PUBLISH ? '; is_published = true.' : '.'),
    );

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
        // `tag` của bộ cũ phải đi hẳn (bỏ khi gỡ ra khỏi content_meta): trang chi
        // tiết đã bỏ dòng nhãn "… · NÂNG CAO", để lại thẻ cũ trong content_meta là
        // chờ ngày một màn hình khác in nó ra.
        const { tag: theCu, ...metaCu } = (course?.contentMeta ??
          template?.contentMeta ??
          {}) as Record<string, unknown>;
        if (theCu !== undefined) console.log(`  (bỏ content_meta.tag cũ: ${JSON.stringify(theCu)})`);
        const meta = { ...metaCu, ...META };
        if (!course) {
          await tx.course.create({
            data: {
              id: COURSE_ID,
              title: TITLE,
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
            // title cũng ghi lại: khoá đang mang tên của bộ 48 bài cũ, seed phải
            // kéo về cùng tên với catalog.ts, không để DB và trang lệch nhau.
            data: { title: TITLE, lessonCount: TOTAL, contentMeta: meta, ...(PUBLISH ? { isPublished: true } : {}) },
          });
        }
        await tx.lesson.createMany({
          // Liệt kê TỪNG trường, không `...row`: gói còn `_mode`/`_blocked` chỉ
          // để kiểm, spread là ghi chúng vào DB.
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
        // Tiến độ = số bài 1..172 đã xong; vừa xoá hết tiến độ nên mọi ghi danh về 0.
        await tx.enrollment.updateMany({
          where: { courseId: COURSE_ID },
          data: { completedLessons: 0, progress: 0 },
        });
        console.log(
          `✓ Đã xoá ${deletedLessons.count} bài cũ và ${deletedProgress.count} dòng tiến độ; ` +
            `nạp ${TOTAL} bài pe-da; courses.lessons = ${TOTAL}.`,
        );
      },
      { timeout: 180_000, maxWait: 20_000 },
    );
    console.log('Bước cuối: py scripts/pe-da/sync_curricula.py (giáo trình trang khoá học đọc file tĩnh).');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
