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

/** `x[k]` khi x là object, còn lại `undefined` — `content_json` vào đây là `unknown`. */
function truong(value: unknown, key: string): unknown {
  return isObject(value) ? value[key] : undefined;
}

function dai(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

/**
 * Bài này có dựng ra được màn nào không?
 *
 * VÌ SAO HÀM NÀY TỒN TẠI, và vì sao luật cũ SAI. Luật 6 trước đây đòi
 * `step_1.read` (khoá bài đọc) HOẶC `play` (khoá mini-game) — hai khoá đó đúng
 * là thứ 172 + 48 bài đang có, nên nó trông như một phép kiểm đủ. Nhưng nó
 * KHÔNG phải điều kiện để bài dựng được màn: `buildScreens()` ở
 * `frontend/src/lib/studio-lesson.ts` dựng màn từ `step_1.memory`,
 * `step_2.mcq`, `step_3.trace`, `step_4.tests`… mà không cần `read` lẫn `play`.
 * Hệ quả đo được: một bài nhập từ tài liệu theo mẫu `## S1..## S4` dựng ra đủ
 * màn trong trình duyệt nhưng bị cổng INSERT TỪ CHỐI với câu "gói dựng dở" —
 * cổng nói sai về chính thứ nó đang canh, và cách duy nhất đi tiếp là bịa thêm
 * một phần `## Đọc` chỉ để qua cửa.
 *
 * NGUỒN SỰ THẬT là `buildScreens()`; hàm này CHÉP lại điều kiện của nó. Chép
 * chứ không import được: đây là backend, nó là frontend. Nên có một ca test ở
 * `frontend/e2e/unit/` đọc CẢ HAI cây mã và bắt hai danh sách khoá phải khớp —
 * nếu không thì thêm một loại màn mới ở frontend sẽ làm cổng này từ chối oan
 * đúng những bài chỉ có loại màn đó, im lặng, đúng một lần nữa.
 */
export function sinhDuocManNao(content: unknown): boolean {
  if (dai(truong(truong(content, 'play'), 'games'))) return true;

  const one = truong(content, 'step_1');
  if (dai(truong(one, 'read'))) return true;
  if (dai(truong(one, 'theory'))) return true;
  if (truong(truong(one, 'brief'), 'task')) return true;
  if (truong(truong(one, 'context'), 'body')) return true;
  if (truong(truong(one, 'code'), 'source')) return true;
  if (dai(truong(one, 'explain'))) return true;
  if (truong(one, 'memory')) return true;
  if (truong(truong(one, 'misconception'), 'body')) return true;
  if (dai(truong(truong(one, 'predict'), 'options')) >= 2) return true;

  const two = truong(content, 'step_2');
  const mcq = truong(two, 'mcq');
  // Chỉ câu có từ 2 phương án mới thành màn — khớp buildScreens, và đó là phép
  // lọc thật: một câu 0 phương án lọt qua thì bài vẫn trắng ở đúng màn đó.
  if (Array.isArray(mcq) && mcq.some((q) => dai(truong(q, 'options')) >= 2)) {
    return true;
  }
  if (dai(truong(truong(two, 'classify'), 'tokens'))) return true;
  if (dai(truong(two, 'practice'))) return true;
  if (truong(truong(two, 'selfExplain'), 'prompt')) return true;

  const three = truong(content, 'step_3');
  if (dai(truong(truong(three, 'scaffold'), 'slots'))) return true;
  if (dai(truong(truong(three, 'trace'), 'steps'))) return true;
  if (truong(truong(three, 'task'), 'body') && !truong(three, 'scaffold')) {
    return true;
  }
  if (dai(truong(truong(three, 'counter'), 'options'))) return true;

  const four = truong(content, 'step_4');
  if (truong(truong(four, 'task'), 'body')) return true;
  if (truong(four, 'starterCode')) return true;
  if (dai(truong(four, 'tests'))) return true;
  if (truong(four, 'solutionCode')) return true;

  return false;
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
 *  6. Bài phải sinh ra ÍT NHẤT MỘT màn. Gói dựng dở không ném lỗi nào cả, nó
 *     chỉ tạo ra một bài mở lên trống trơn — xem `sinhDuocManNao`.
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

    // 6 — gói dựng dở: bài KHÔNG sinh ra màn nào.
    if (!sinhDuocManNao(row.content_json)) {
      errors.push(
        `${ma}: không nội dung nào dựng được thành màn học — gói dựng dở?`,
      );
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
