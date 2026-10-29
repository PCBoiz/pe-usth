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
  sinhDuocManNao,
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

/**
 * DB đang có đúng những bài của gói, ô 1..N — trạng thái thật hôm nay.
 *
 * Tên biến và các con số bên dưới CỐ Ý suy ra từ gói, không ghi cứng: bản đầu
 * ghi "DB_172" và dùng mã TH01/TH02 làm bài mới, rồi module 11 lấy đúng hai mã
 * đó cho bài thật — cả bộ đỏ vì luật "mã đã có trong DB" bắn đúng. Một ca test
 * mượn mã trông-như-chưa-ai-dùng là một quả mìn hẹn giờ.
 */
const DB_THAT: ExistingLesson[] = REAL.lessons.map((r) => ({
  sortOrder: r.sort_order,
  lessonCode: r.lesson_code,
}));
/** Ô trống đầu tiên sau bài cuối cùng của gói. */
const O_MOI = Math.max(...REAL.lessons.map((r) => r.sort_order)) + 1;
/** Mã KHÔNG có trong gói — dùng tiền tố không thuộc bảng mã nào của giáo trình. */
const MA_MOI = ['ZZ01', 'ZZ02', 'ZZ03'];

describe('planLessonInserts', () => {
  it('cho tạo bài NỐI TIẾP sau ô lớn nhất', () => {
    const { plan, errors } = planLessonInserts(
      [baiMoi(MA_MOI[0], O_MOI + 0), baiMoi(MA_MOI[1], O_MOI + 1)],
      DB_THAT,
    );
    expect(errors).toEqual([]);
    expect(plan.map((p) => p.code)).toEqual([MA_MOI[0], MA_MOI[1]]);
    expect(plan.map((p) => p.sortOrder)).toEqual([O_MOI, O_MOI + 1]);
  });

  it('xếp kế hoạch theo ô, dù gói đưa vào lộn xộn', () => {
    // INSERT đi tuần tự thì bản in ra đọc được, và nếu transaction hỏng giữa
    // chừng thì chỗ dừng là một mốc liền mạch chứ không phải một tập rời rạc.
    const { plan } = planLessonInserts(
      [baiMoi(MA_MOI[2], O_MOI + 2), baiMoi(MA_MOI[0], O_MOI + 0), baiMoi(MA_MOI[1], O_MOI + 1)],
      DB_THAT,
    );
    expect(plan.map((p) => p.sortOrder)).toEqual([O_MOI, O_MOI + 1, O_MOI + 2]);
  });

  // ── Luật 1: mã đã có ⇒ người gọi nhầm script ───────────────────────────────
  it('TỪ CHỐI mã bài đã có trong DB, và chỉ sang đường cập nhật', () => {
    const { plan, errors } = planLessonInserts([baiMoi('PY01', O_MOI)], DB_THAT);
    expect(plan).toEqual([]);
    expect(errors.join(' ')).toContain('update-lesson-content.ts');
  });

  // ── Luật 2: ô đã có chủ. ĐỘC LẬP với luật 1 ────────────────────────────────
  it('TỪ CHỐI ô sort_order đã có bài khác, dù mã bài là mã mới', () => {
    // Hai @@unique là hai ràng buộc riêng: một bài mang mã mới mà trùng ô vẫn
    // vỡ. Gộp hai luật này làm một là bỏ sót đúng ca này.
    const { plan, errors } = planLessonInserts([baiMoi(MA_MOI[0], 5)], DB_THAT);
    expect(plan).toEqual([]);
    expect(errors.join(' ')).toContain('đã có bài khác');
  });

  // ── Luật 3: chỉ nối tiếp, không chen giữa ──────────────────────────────────
  it('TỪ CHỐI chen vào giữa, kể cả khi ô đó đang TRỐNG', () => {
    // DB thiếu ô 50: ô trống nên luật 2 không bắt. Nhưng chen vào giữa vẫn sai
    // — mọi bài sau nó sẽ phải dịch chỗ, mà `sort_order` không UPDATE tuần tự
    // được (hai @@unique chặn mọi bước trung gian). Dịch chỗ là việc của một
    // script khác; đường này phải thật sự chỉ là INSERT.
    const thieuO50 = DB_THAT.filter((r) => r.sortOrder !== 50);
    const { plan, errors } = planLessonInserts([baiMoi(MA_MOI[0], 50)], thieuO50);
    expect(plan).toEqual([]);
    expect(errors.join(' ')).toContain('NỐI TIẾP');
  });

  // ── Luật 4: trùng ngay trong gói ───────────────────────────────────────────
  it('bắt trùng mã và trùng ô NGAY TRONG gói', () => {
    const trungMa = planLessonInserts(
      [baiMoi(MA_MOI[0], O_MOI + 0), baiMoi(MA_MOI[0], O_MOI + 1)],
      DB_THAT,
    );
    expect(trungMa.errors.join(' ')).toContain('Trùng mã');

    const trungO = planLessonInserts(
      [baiMoi(MA_MOI[0], O_MOI + 0), baiMoi(MA_MOI[1], O_MOI)],
      DB_THAT,
    );
    expect(trungO.errors.join(' ')).toContain('Trùng ô');
  });

  // ── Luật 5: cửa duy nhất vào DB ────────────────────────────────────────────
  it('TỪ CHỐI nội dung không qua được validateStudioLesson', () => {
    const hong = baiMoi(MA_MOI[0], O_MOI + 0);
    const noiDung = hong.content_json as Record<string, unknown>;
    // `step_4.tests` phải là mảng ca chấm; đưa vào một chuỗi thì schema đỏ.
    (noiDung.step_4 as Record<string, unknown>).tests = 'không phải mảng';
    const { plan, errors } = planLessonInserts([hong], DB_THAT);
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
    const hong = baiMoi(MA_MOI[0], O_MOI + 0);
    const step1 = (hong.content_json as Record<string, unknown>)
      .step_1 as Record<string, unknown>;
    (step1.read as unknown[][])[0] = [{ type: 'loai-khong-co-that' }];
    const { plan, errors } = planLessonInserts([hong], DB_THAT);
    expect(errors).toEqual([]);
    expect(plan).toHaveLength(1);
  });

  // ── Luật 6: gói dựng dở không ném lỗi nào cả ───────────────────────────────

  /**
   * LUẬT 6 TỪNG TỪ CHỐI OAN, và ca này khoá bản sửa.
   *
   * Luật cũ đòi `step_1.read` HOẶC `play`. Hai khoá đó đúng là thứ 172 + 48 bài
   * đang có, nên nó trông đủ — nhưng `buildScreens()` ở frontend dựng màn từ
   * `step_1.memory`, `step_2.mcq`, `step_3.trace`, `step_4.tests` mà KHÔNG cần
   * read lẫn play. Bài nhập từ tài liệu theo mẫu `## S1..## S4` rơi đúng vào
   * khe đó: dựng ra đủ màn trong trình duyệt, mà cổng INSERT bảo "gói dựng dở".
   * Cách duy nhất đi tiếp khi đó là bịa thêm một phần `## Đọc` chỉ để qua cửa —
   * tức cổng bắt người soạn đổi NỘI DUNG để chiều một phép kiểm sai.
   */
  it('NHẬN bài không có read lẫn play, miễn là nó dựng ra màn', () => {
    // Lấy một bài THẬT CÓ ca chấm: bài nhập theo mẫu mang cả `starterCode` lẫn
    // phần Test, và `validateStudioLesson` đòi đúng cặp đó khi bài không phải
    // bài đọc. Lấy nhầm bài chỉ có `starterCode` là ca đỏ vì lý do khác hẳn.
    const coCaCham = REAL.lessons.find((r) => {
      const four = (r.content_json as Record<string, Record<string, unknown>>)
        ?.step_4;
      return Array.isArray(four?.tests) && four.tests.length > 0;
    });
    if (!coCaCham) throw new Error('Gói không còn bài nào có ca chấm.');

    const baiNhap: InsertRow = {
      ...structuredClone(coCaCham),
      lesson_code: MA_MOI[0],
      sort_order: O_MOI,
    };
    const noiDung = baiNhap.content_json as Record<string, unknown>;
    const mcq = (noiDung.step_2 as Record<string, unknown>).mcq;
    // Hình dạng của một bài nhập theo mẫu S1..S4: có bộ nhớ, có trắc nghiệm,
    // có bài tập chấm — không có màn đọc nào.
    noiDung.step_1 = { memory: { title: 'Nhớ', items: ['f-string'] } };
    expect(Array.isArray(mcq) && mcq.length).toBeTruthy();

    const { plan, errors } = planLessonInserts([baiNhap], DB_THAT);
    expect(errors).toEqual([]);
    expect(plan).toHaveLength(1);
  });

  it('TỪ CHỐI bài không dựng ra màn nào', () => {
    const rong = baiMoi(MA_MOI[0], O_MOI + 0);
    rong.content_json = { step_4: { task: 'còn mỗi đề bài' } };
    const { plan, errors } = planLessonInserts([rong], DB_THAT);
    expect(plan).toEqual([]);
    expect(errors.join(' ')).toContain('dựng dở');
  });

  /**
   * NGUỒN SỰ THẬT của luật 6 là `buildScreens()` ở frontend; `sinhDuocManNao`
   * chép lại điều kiện của nó (chép chứ không import được — hai cây mã khác
   * nhau). Ca này kiểm từng nhánh của bản chép, để một nhánh gõ sai không nằm
   * im: nó sẽ từ chối oan đúng những bài chỉ có loại nội dung đó.
   */
  it.each([
    ['play.games', { play: { games: [{ id: 'g1' }] } }],
    ['step_1.read', { step_1: { read: [[]] } }],
    ['step_1.theory', { step_1: { theory: ['a'] } }],
    ['step_1.brief', { step_1: { brief: { task: 'x' } } }],
    ['step_1.context', { step_1: { context: { body: 'x' } } }],
    ['step_1.code', { step_1: { code: { source: 'x' } } }],
    ['step_1.explain', { step_1: { explain: ['a'] } }],
    ['step_1.memory', { step_1: { memory: { items: [] } } }],
    ['step_1.misconception', { step_1: { misconception: { body: 'x' } } }],
    ['step_1.predict', { step_1: { predict: { options: [1, 2] } } }],
    ['step_2.mcq', { step_2: { mcq: [{ options: [1, 2] }] } }],
    ['step_2.classify', { step_2: { classify: { tokens: ['t'] } } }],
    ['step_2.practice', { step_2: { practice: [{}] } }],
    ['step_2.selfExplain', { step_2: { selfExplain: { prompt: 'x' } } }],
    ['step_3.scaffold', { step_3: { scaffold: { slots: [{}] } } }],
    ['step_3.trace', { step_3: { trace: { steps: [{}] } } }],
    ['step_3.task', { step_3: { task: { body: 'x' } } }],
    ['step_3.counter', { step_3: { counter: { options: [{}] } } }],
    ['step_4.task', { step_4: { task: { body: 'x' } } }],
    ['step_4.starterCode', { step_4: { starterCode: 'x' } }],
    ['step_4.tests', { step_4: { tests: [{}] } }],
    ['step_4.solutionCode', { step_4: { solutionCode: 'x' } }],
  ])('sinhDuocManNao: %s một mình đã đủ dựng màn', (_ten, noiDung) => {
    expect(sinhDuocManNao(noiDung)).toBe(true);
  });

  it.each([
    ['rỗng', {}],
    ['không phải object', 'chuỗi'],
    ['mcq 1 phương án — buildScreens bỏ qua', { step_2: { mcq: [{ options: [1] }] } }],
    ['task của S3 kèm scaffold rỗng — buildScreens bỏ qua', { step_3: { task: { body: 'x' }, scaffold: { slots: [] } } }],
  ])('sinhDuocManNao: %s KHÔNG dựng được màn', (_ten, noiDung) => {
    expect(sinhDuocManNao(noiDung)).toBe(false);
  });

  it('TỪ CHỐI gói rỗng', () => {
    const { errors } = planLessonInserts([], DB_THAT);
    expect(errors.join(' ')).toContain('Chưa chọn bài nào');
  });

  it('gom HẾT lỗi một lượt, không dừng ở lỗi đầu', () => {
    // In từng lỗi một bắt người chạy sửa rồi chạy lại nhiều vòng trên một DB
    // đang phục vụ người học. Gom hết là quyết định, không phải tiện tay.
    const { errors } = planLessonInserts(
      [baiMoi('PY01', 5), baiMoi('PY02', 6)],
      DB_THAT,
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
