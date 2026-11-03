#!/usr/bin/env ts-node
/**
 * PHỄU TIẾN ĐỘ theo `sort_order` — CHỈ ĐỌC, không ghi một dòng nào vào DB.
 *
 * Đây là chỉ số sức khoẻ DUY NHẤT mà sản phẩm có đủ dữ liệu để tính hôm nay:
 * không cần lớp ghi vết, không cần sự đồng ý (nó chỉ đọc `enrollments` +
 * `lesson_progress`, hai bảng vốn phải có để sản phẩm chạy).
 *
 * Mọi phép tính nằm ở `src/course-admin/pheu-tien-do.ts` và có Jest chấm; file
 * này chỉ đi lấy hàng rồi in. Lý do tách: phần CÓ THỂ SAI phải kiểm được mà
 * không cần `DATABASE_URL` — cùng khuôn `update-lesson-content.ts`.
 *
 *   npx ts-node scripts/pheu-tien-do.ts                     # khoá mặc định
 *   npx ts-node scripts/pheu-tien-do.ts --course=python_advanced
 *   npx ts-node scripts/pheu-tien-do.ts --tat-ca-tai-khoan  # gồm cả tài khoản thật
 *   npx ts-node scripts/pheu-tien-do.ts --json
 */
import { PrismaClient } from '../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import {
  CHI_SO_KHAI_TRUOC,
  dungPheu,
  type HangGhiDanh,
  type HangHoanThanh,
} from '../src/course-admin/pheu-tien-do';

const KHOA_MAC_DINH = 'python_advanced';

function doiSo(ten: string, mac: string): string {
  const v = process.argv.find((a) => a.startsWith(`--${ten}=`));
  return v ? v.slice(ten.length + 3) : mac;
}

async function main(): Promise<number> {
  const courseId = doiSo('course', KHOA_MAC_DINH);
  const chiKhach = !process.argv.includes('--tat-ca-tai-khoan');

  if (!process.env.DATABASE_URL) {
    console.error(
      'Thiếu DATABASE_URL. Script này CHỈ ĐỌC (enrollments + lesson_progress), ' +
        'không ghi một dòng nào — nhưng nó vẫn cần chuỗi kết nối.',
    );
    return 1;
  }
  // Prisma 7 ĐÒI một driver adapter: `new PrismaClient()` trần ném
  // PrismaClientInitializationError ngay dòng đầu, tức script không chạy được
  // lần nào. Bản đầu của tôi viết đúng như vậy — "dựng xong mà không có đường
  // tới", ở dạng trực tiếp nhất. Dùng cùng adapter với
  // `update-lesson-content.ts`, đừng nghĩ ra cách thứ hai.
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const bai = await prisma.lesson.findMany({
      where: { courseId },
      select: { id: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (!bai.length) {
      console.error(`Khoá "${courseId}" không có bài nào — sai mã khoá?`);
      return 1;
    }
    const oTheoId = new Map(bai.map((b) => [b.id, b.sortOrder]));

    const ghiDanhTho = await prisma.enrollment.findMany({
      where: { courseId },
      select: { userId: true, user: { select: { email: true } } },
    });
    const ghiDanh: HangGhiDanh[] = ghiDanhTho.map((g) => ({
      userId: g.userId,
      email: g.user.email,
    }));

    const tienDoTho = await prisma.lessonProgress.findMany({
      where: { courseId },
      select: { userId: true, lessonId: true },
    });
    // Bỏ hàng trỏ tới bài không còn thuộc khoá (gói cũ) thay vì gán ô 0 — một
    // ô 0 bịa ra sẽ nằm im trong bảng và không ai truy được nó từ đâu.
    const hoanThanh: HangHoanThanh[] = [];
    let moCoi = 0;
    for (const t of tienDoTho) {
      const o = oTheoId.get(t.lessonId);
      if (o === undefined) {
        moCoi += 1;
        continue;
      }
      hoanThanh.push({ userId: t.userId, sortOrder: o });
    }

    const ra = dungPheu(ghiDanh, hoanThanh, bai.length, chiKhach);

    if (process.argv.includes('--json')) {
      console.log(JSON.stringify({ courseId, chiKhach, moCoi, ...ra }, null, 2));
      return 0;
    }

    console.log(`PHỄU TIẾN ĐỘ — khoá ${courseId}`);
    console.log(`Đơn vị: ${ra.donVi}${chiKhach ? '' : ' + tài khoản thật'}\n`);
    console.log('CHỈ SỐ ĐÃ KHAI TRƯỚC (bảng này không in gì ngoài danh sách sau):');
    for (const c of CHI_SO_KHAI_TRUOC) console.log(`   · ${c}`);
    console.log();
    console.log(`Đã ghi danh:                 ${ra.daGhiDanh}`);
    console.log(
      `Ghi danh, hoàn thành 0 bài:  ${ra.ghiDanhKhongHoanThanh ?? '·'}` +
        '   ← ô rơi lớn nhất, và nó KHÔNG nằm trong lesson_progress',
    );
    console.log();
    for (const o of ra.o) {
      const n = o.cheVìÍt ? '·' : String(o.soTaiKhoan);
      const pc = o.phanTram === null ? '·' : `${o.phanTram.toFixed(1)}%`;
      const thanh = o.phanTram === null ? '' : '█'.repeat(Math.round(o.phanTram / 2));
      console.log(`  bài ${String(o.sortOrder).padStart(3)}  ${n.padStart(6)}  ${pc.padStart(6)}  ${thanh}`);
    }
    if (moCoi) console.log(`\n(${moCoi} hàng tiến độ trỏ tới bài không còn thuộc khoá — đã bỏ)`);
    console.log('\nGIỚI HẠN — đọc bảng trên mà bỏ phần này là đọc sai:');
    for (const g of ra.gioiHan) console.log(`   – ${g}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((ma) => process.exit(ma))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
