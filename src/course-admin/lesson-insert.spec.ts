/**
 * Đường TẠO bài mới — sáu luật của `planLessonInserts`.
 *
 * VÌ SAO BỘ NÀY TỒN TẠI: cho tới hôm nay, muốn thêm một chặng mới vào khoá thì
 * đường DUY NHẤT là `seed-python-advanced-v4.ts --apply`, mà nó `deleteMany`
 * toàn bộ `lesson_progress` của khoá. Tức "thêm module 11" và "xoá tiến độ của
 * mọi người đang học" là CÙNG MỘT thao tác. Bộ này canh đường thay thế.
 *
 * Fixture lấy từ GÓI THẬT (`scripts/pe-da/out/lessons.json`) — AGENTS.md ghi rõ
 * fixture không giống dữ liệu thật thì test vô dụng, và chính repo này đã dính
 * một lần: `quizzes.service.spec.ts` từng khẳng định "không bao giờ lộ đáp án"
 * bằng fixture `options: ['a','b']` trong khi dữ liệu thật là mảng object mang
 * cờ `correct`, nên lỗ lộ đáp án sống sót qua mọi lần chạy test.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  fingerprint,
  planLessonInserts,
  type ExistingLesson,
  type InsertRow,
} from './lesson-insert';

const BUNDLE_PATH = join(
  __dirname,
  '..',
  '..',
  'scripts',
  'pe-da',
  'out',
  'lessons.json',
);
const REAL = JSON.parse(readFileSync(BUNDLE_PATH, 'utf8')) as {
  lessons: InsertRow[];
};

/** Một bài THẬT, đổi mã và ô để đóng vai bài mới của module 11. */
function baiMoi(code: string, sortOrder: number): InsertRow {
  const mau = structuredClone(REAL.lessons[0]);
  return { ...mau, lesson_code: code, sort_order: sortOrder };
}

/** DB đang có đúng 172 bài, ô 1..172 — trạng thái thật hôm nay. */
const DB_172: ExistingLesson[] = REAL.lessons.map((r) => ({
  sortOrder: r.sort_order,
  lessonCode: r.lesson_code,
}));

describe('planLessonInserts', () => {
  it('cho tạo bài NỐI TIẾP sau ô lớn nhất', () => {
    const { plan, errors } = planLessonInserts(
      [baiMoi('TH01', 173), baiMoi('TH02', 174)],
      DB_172,
    );
    expect(errors).toEqual([]);
    expect(plan.map((p) => p.code)).toEqual(['TH01', 'TH02']);
    expect(plan.map((p) => p.sortOrder)).toEqual([173, 174]);
  });

  it('xếp kế hoạch theo ô, dù gói đưa vào lộn xộn', () => {
    // INSERT đi tuần tự thì bản in ra đọc được, và nếu transaction hỏng giữa
    // chừng thì chỗ dừng là một mốc liền mạch chứ không phải một tập rời rạc.
    const { plan } = planLessonInserts(
      [baiMoi('TH03', 175), baiMoi('TH01', 173), baiMoi('TH02', 174)],
      DB_172,
    );
    expect(plan.map((p) => p.sortOrder)).toEqual([173, 174, 175]);
  });

  // ── Luật 1: mã đã có ⇒ người gọi nhầm script ───────────────────────────────
  it('TỪ CHỐI mã bài đã có trong DB, và chỉ sang đường cập nhật', () => {
    const { plan, errors } = planLessonInserts([baiMoi('PY01', 173)], DB_172);
    expect(plan).toEqual([]);
    expect(errors.join(' ')).toContain('update-lesson-content.ts');
  });

  // ── Luật 2: ô đã có chủ. ĐỘC LẬP với luật 1 ────────────────────────────────
  it('TỪ CHỐI ô sort_order đã có bài khác, dù mã bài là mã mới', () => {
    // Hai @@unique là hai ràng buộc riêng: một bài mang mã mới mà trùng ô vẫn
    // vỡ. Gộp hai luật này làm một là bỏ sót đúng ca này.
    const { plan, errors } = planLessonInserts([baiMoi('TH01', 5)], DB_172);
    expect(plan).toEqual([]);
    expect(errors.join(' ')).toContain('đã có bài khác');
  });

  // ── Luật 3: chỉ nối tiếp, không chen giữa ──────────────────────────────────
  it('TỪ CHỐI chen vào giữa, kể cả khi ô đó đang TRỐNG', () => {
    // DB thiếu ô 50: ô trống nên luật 2 không bắt. Nhưng chen vào giữa vẫn sai
    // — mọi bài sau nó sẽ phải dịch chỗ, mà `sort_order` không UPDATE tuần tự
    // được (hai @@unique chặn mọi bước trung gian). Dịch chỗ là việc của một
    // script khác; đường này phải thật sự chỉ là INSERT.
    const thieuO50 = DB_172.filter((r) => r.sortOrder !== 50);
    const { plan, errors } = planLessonInserts([baiMoi('TH01', 50)], thieuO50);
    expect(plan).toEqual([]);
    expect(errors.join(' ')).toContain('NỐI TIẾP');
  });

  // ── Luật 4: trùng ngay trong gói ───────────────────────────────────────────
  it('bắt trùng mã và trùng ô NGAY TRONG gói', () => {
    const trungMa = planLessonInserts(
      [baiMoi('TH01', 173), baiMoi('TH01', 174)],
      DB_172,
    );
    expect(trungMa.errors.join(' ')).toContain('Trùng mã');

    const trungO = planLessonInserts(
      [baiMoi('TH01', 173), baiMoi('TH02', 173)],
      DB_172,
    );
    expect(trungO.errors.join(' ')).toContain('Trùng ô');
  });

  // ── Luật 5: cửa duy nhất vào DB ────────────────────────────────────────────
  it('TỪ CHỐI nội dung không qua được validateStudioLesson', () => {
    const hong = baiMoi('TH01', 173);
    const noiDung = hong.content_json as Record<string, unknown>;
    // `step_4.tests` phải là mảng ca chấm; đưa vào một chuỗi thì schema đỏ.
    (noiDung.step_4 as Record<string, unknown>).tests = 'không phải mảng';
    const { plan, errors } = planLessonInserts([hong], DB_172);
    expect(plan).toEqual([]);
    expect(errors.length).toBeGreaterThan(0);
  });

  /**
   * KHIẾM KHUYẾT ĐÃ BIẾT — ca này khoá hành vi SAI, có chủ đích.
   *
   * `validateStudioLesson` là CỬA DUY NHẤT vào DB, nhưng nó chỉ dùng
   * `step_1.read` làm DẤU NHẬN BIẾT bài đọc (`laBaiDoc`) và KHÔNG kiểm loại
   * khối bên trong. Một gói mang loại khối không tồn tại đi qua cửa này trót
   * lọt, vào DB, rồi `ReadScreen` rơi vào nhánh `default` và khối đó BIẾN MẤT
   * IM LẶNG — không lỗi, không log, chỉ thiếu nội dung.
   *
   * Hôm nay `scripts/pe-da/check.py` chặn loại khối lạ, nhưng nó là một lệnh
   * RIÊNG: không gì bắt nó phải chạy trước đường nạp. Nạp một bản dựng chưa
   * qua check.py là lọt.
   *
   * CHƯA VÁ vì một đợt khác đang thêm một loại khối mới cho màn đọc; vá lúc
   * này là chặn luôn loại đó. Khi vá: liệt kê loại khối từ MỘT nguồn dùng
   * chung với `READ_BLOCK_TYPES` của frontend (đừng chép thành danh sách thứ
   * hai — nó sẽ lệch), rồi ĐỔI ca này thành `expect(plan).toEqual([])`.
   */
  it('KHIẾM KHUYẾT: loại khối đọc lạ vẫn LỌT qua cửa vào DB', () => {
    const hong = baiMoi('TH01', 173);
    const step1 = (hong.content_json as Record<string, unknown>)
      .step_1 as Record<string, unknown>;
    (step1.read as unknown[][])[0] = [{ type: 'loai-khong-co-that' }];
    const { plan, errors } = planLessonInserts([hong], DB_172);
    expect(errors).toEqual([]);
    expect(plan).toHaveLength(1);
  });

  // ── Luật 6: gói dựng dở không ném lỗi nào cả ───────────────────────────────
  it('TỪ CHỐI bài không có step_1.read lẫn play', () => {
    const rong = baiMoi('TH01', 173);
    rong.content_json = { step_4: { task: 'còn mỗi đề bài' } };
    const { plan, errors } = planLessonInserts([rong], DB_172);
    expect(plan).toEqual([]);
    expect(errors.join(' ')).toContain('dựng dở');
  });

  it('TỪ CHỐI gói rỗng', () => {
    const { errors } = planLessonInserts([], DB_172);
    expect(errors.join(' ')).toContain('Chưa chọn bài nào');
  });

  it('gom HẾT lỗi một lượt, không dừng ở lỗi đầu', () => {
    // In từng lỗi một bắt người chạy sửa rồi chạy lại nhiều vòng trên một DB
    // đang phục vụ người học. Gom hết là quyết định, không phải tiện tay.
    const { errors } = planLessonInserts(
      [baiMoi('PY01', 5), baiMoi('PY02', 6)],
      DB_172,
    );
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe('fingerprint', () => {
  it('KHÔNG đổi khi thứ tự khoá đổi', () => {
    // Postgres `jsonb` không giữ thứ tự khoá, nên dấu vân tay phải tính trên
    // bản đã sắp khoá — nếu không thì lần chạy sau in ra "đổi" cho một nội
    // dung y hệt, và người chạy mất lòng tin vào chính bản in đó.
    const a = fingerprint({ b: 1, a: { d: 2, c: 3 } });
    const b = fingerprint({ a: { c: 3, d: 2 }, b: 1 });
    expect(a.sha256).toBe(b.sha256);
  });

  it('ĐỔI khi giá trị đổi', () => {
    expect(fingerprint({ a: 1 }).sha256).not.toBe(fingerprint({ a: 2 }).sha256);
  });
});
