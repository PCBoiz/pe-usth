/**
 * Phần THUẦN (không DB) của `scripts/add-lessons.ts`: lập kế hoạch TẠO bài mới
 * cho một khoá đã có người học.
 *
 * VÌ SAO FILE NÀY TỒN TẠI. Hôm nay repo có đúng hai đường nạp, và không đường
 * nào tạo được bài:
 *
 *   · `scripts/seed-python-advanced-v4.ts --apply` — `deleteMany` cả bài VÀ
 *     toàn bộ `lesson_progress` của khoá. Thêm một bài mới mà chạy cái này là
 *     xoá tiến độ của mọi người đang học.
 *   · `scripts/update-lesson-content.ts` — an toàn, nhưng nó nói thẳng trong
 *     `planContentUpdates`: "script này chỉ CẬP NHẬT, không tạo bài".
 *
 * Nghĩa là: muốn thêm một chặng mới vào khoá thì đường duy nhất đang có là
 * đường xoá sạch. Đó là lý do file này ra đời — và nó là lần thứ NĂM repo này
 * suýt dựng một thứ không có đường tới người học (AGENTS.md: tracer không bài
 * nào tới, nút "Try it Yourself" không màn nào mount, kho quiz rỗng, 13 màn
 * tối). Nội dung module 11 viết xong mà không có đường INSERT thì nó nằm trong
 * `out/` mãi mãi.
 *
 * Luật nằm ở đây chứ không trong script để Jest kiểm được mà không cần DB —
 * `npm run typecheck` và `npx jest` chỉ quét `src/`.
 */
import { createHash } from 'crypto';

import { validateStudioLesson } from './studio-lesson.schema';

/** Một hàng của gói cần tạo. Cùng hình dạng `BundleRow` của đường cập nhật. */
export interface InsertRow {
  lesson_code: string;
  sort_order: number;
  module?: string;
  title?: string;
  subtitle?: string;
  estimated_minutes?: number | null;
  xp_reward?: number;
  content_json: unknown;
}

/** Hàng `lessons` đang có trong DB — chỉ hai cột phép kiểm cần đọc. */
export interface ExistingLesson {
  sortOrder: number;
  lessonCode: string | null;
}

export interface InsertPlanItem {
  code: string;
  sortOrder: number;
  bytes: number;
  sha256: string;
  content: unknown;
  row: InsertRow;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (isObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort())
      out[key] = sortKeys(value[key]);
    return out;
  }
  return value;
}

/** Dấu vân tay nội dung, để bản in ra so được giữa hai lần chạy. */
export function fingerprint(content: unknown): {
  bytes: number;
  sha256: string;
} {
  const text = JSON.stringify(sortKeys(content));
  return {
    bytes: Buffer.byteLength(text, 'utf8'),
    sha256: createHash('sha256').update(text).digest('hex'),
  };
}

/**
 * Lập kế hoạch INSERT. Trả lỗi thay vì ném, để script in hết một lượt rồi dừng
 * — in từng lỗi một bắt người chạy sửa rồi chạy lại nhiều vòng.
 *
 * SÁU LUẬT, và mỗi luật chặn một kiểu hỏng KHÁC NHAU. Đừng gộp chúng:
 *
 *  1. Mã bài CHƯA CÓ trong DB. Đây là luật phân biệt "tạo" với "cập nhật": mã
 *     đã có nghĩa là người gọi nhầm script, và `@@unique([courseId, lessonCode])`
 *     sẽ ném P2002 ở giữa transaction — muộn hơn và khó đọc hơn nhiều.
 *  2. `sort_order` CHƯA CÓ trong DB. `@@unique([courseId, sortOrder])` là ràng
 *     buộc THỨ HAI và nó độc lập với mã bài: một bài mang mã mới mà trùng ô
 *     sort_order vẫn vỡ.
 *  3. Các ô mới phải NỐI TIẾP sau ô lớn nhất đang có, không chen vào giữa.
 *     Chen vào giữa thì mọi bài sau nó phải dịch chỗ, mà dịch chỗ là việc của
 *     một script khác (`sort_order` không UPDATE tuần tự được — hai @@unique
 *     chặn mọi bước trung gian). Luật này giữ cho đường INSERT thật sự chỉ là
 *     INSERT.
 *  4. Không trùng mã và không trùng ô NGAY TRONG gói.
 *  5. Nội dung phải qua `validateStudioLesson` — cùng cửa mà đường cập nhật đi
 *     qua. Đây là CỬA DUY NHẤT vào DB; bỏ nó là nạp được một bài mà frontend
 *     dựng ra màn trắng.
 *  6. Bài phải có `step_1.read` hoặc `play`. Gói dựng dở không ném lỗi nào cả,
 *     nó chỉ tạo ra một bài mở lên trống trơn.
 */
export function planLessonInserts(
  rows: readonly InsertRow[],
  existing: readonly ExistingLesson[],
): { plan: InsertPlanItem[]; errors: string[] } {
  const errors: string[] = [];

  if (!rows.length) return { plan: [], errors: ['Chưa chọn bài nào để tạo.'] };

  const maCoSan = new Set(
    existing.map((r) => r.lessonCode).filter((c): c is string => Boolean(c)),
  );
  const oCoSan = new Set(existing.map((r) => r.sortOrder));
  const oLonNhat = existing.reduce((a, r) => Math.max(a, r.sortOrder), 0);

  const maTrongGoi = new Set<string>();
  const oTrongGoi = new Set<number>();

  for (const row of rows) {
    const ma = row.lesson_code;

    // 1 — đã có mã này rồi: người gọi cần update, không phải insert.
    if (maCoSan.has(ma)) {
      errors.push(
        `${ma}: DB đã có bài mang mã này — dùng scripts/update-lesson-content.ts để sửa nội dung.`,
      );
    }
    // 2 — ô đã có chủ.
    if (oCoSan.has(row.sort_order)) {
      errors.push(
        `${ma}: ô sort_order ${row.sort_order} đã có bài khác — script này không dịch chỗ bài cũ.`,
      );
    }
    // 3 — phải nối tiếp, không chen giữa.
    if (row.sort_order <= oLonNhat) {
      errors.push(
        `${ma}: sort_order ${row.sort_order} nằm TRƯỚC ô lớn nhất đang có (${oLonNhat}). ` +
          'Đường này chỉ NỐI TIẾP vào cuối; chen vào giữa phải dịch chỗ mọi bài sau nó.',
      );
    }
    // 4 — trùng ngay trong gói.
    if (maTrongGoi.has(ma)) errors.push(`Trùng mã ${ma} ngay trong gói.`);
    if (oTrongGoi.has(row.sort_order)) {
      errors.push(`Trùng ô sort_order ${row.sort_order} ngay trong gói.`);
    }
    maTrongGoi.add(ma);
    oTrongGoi.add(row.sort_order);

    // 6 — gói dựng dở.
    const noiDung = isObject(row.content_json) ? row.content_json : null;
    const coPlay = Boolean(noiDung?.play);
    const coBaiDoc =
      isObject(noiDung?.step_1) && Array.isArray(noiDung.step_1.read);
    if (!coPlay && !coBaiDoc) {
      errors.push(`${ma}: không có khối play lẫn step_1.read — gói dựng dở?`);
    }
    // 5 — cửa duy nhất vào DB.
    const invalid = validateStudioLesson(row.content_json);
    if (invalid.length) errors.push(`${ma}: ${invalid.join(' | ')}`);
  }

  if (errors.length) return { plan: [], errors };

  // Xếp theo ô để INSERT đi tuần tự — bản in ra đọc được, và nếu transaction
  // hỏng giữa chừng thì chỗ dừng là một mốc liền mạch.
  const plan = [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => {
      const fp = fingerprint(row.content_json);
      return {
        code: row.lesson_code,
        sortOrder: row.sort_order,
        bytes: fp.bytes,
        sha256: fp.sha256,
        content: row.content_json,
        row,
      };
    });

  return { plan, errors: [] };
}
