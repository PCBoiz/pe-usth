import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuizzesService } from './quizzes.service';
import { KHOA_SO_NGAY_TRE, POST_TEST_KIND } from './post-test';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Câu trắc nghiệm của khoá 172 bài, ĐỌC TỪ BẢN DỰNG THẬT.
 *
 * Không bịa fixture ở đây, vì chính file này đã bị cắn một lần theo đúng kiểu
 * đó: ca "không bao giờ lộ đáp án" từng dùng `options: ['a','b']`, trong khi
 * dữ liệu thật là mảng object mang cờ `correct` — lỗ lộ đáp án sống sót qua
 * mọi lần chạy test. Xem AGENTS.md, bẫy "fixture không giống dữ liệu thật".
 *
 * Và lần này có thêm một lý do: nguồn câu hỏi dùng `prompt`/`correctOption`,
 * còn `normalizeQuestion` đòi `question` + `options[].correct`. Phép đổi tên
 * nằm ở `scripts/pe-da/build.py`; đọc bản dựng là cách duy nhất chứng minh nó
 * khớp. Lệch một tên là `normalizeQuestion` trả null cho MỌI câu, kho quiz
 * rỗng, và KHÔNG ngoại lệ nào được ném.
 */
const PE_DA = JSON.parse(
  readFileSync(
    join(__dirname, '..', '..', 'scripts', 'pe-da', 'out', 'lessons.json'),
    'utf8',
  ),
) as {
  lessons: Array<{
    lesson_code: string;
    content_json: { step_2?: { mcq?: unknown[] } };
  }>;
};

/** `content_json` của một bài pe-da theo mã bài. */
function peDa(code: string): unknown {
  const found = PE_DA.lessons.find((l) => l.lesson_code === code);
  if (!found) throw new Error(`không có bài ${code} trong bản dựng`);
  return found.content_json;
}

/** Câu trắc nghiệm ĐANG PHÁT trong bài (những câu người học ĐÃ thấy). */
function mcqTrongBai(code: string): Array<{ question?: string }> {
  const found = PE_DA.lessons.find((l) => l.lesson_code === code);
  return (found?.content_json.step_2?.mcq ?? []) as Array<{
    question?: string;
  }>;
}

/**
 * KHO ĐỀ HẬU KIỂM, đọc từ file THẬT mà service nạp lúc chạy.
 *
 * Cùng lý do như `PE_DA` ở trên: fixture bịa ở đây thì phép kiểm "không trùng
 * câu đã phát trong bài" chứng minh được số 0 — nó là TOÀN BỘ giá trị của bộ
 * giữ lại, và nó chỉ có thật nếu hai file thật sự rời nhau.
 */
const HAU_KIEM = JSON.parse(
  readFileSync(join(__dirname, 'post-test-bank.json'), 'utf8'),
) as {
  course_id: string;
  held_back_from: number;
  lessons: Array<{
    lesson_code: string;
    source_ids: string[];
    questions: Array<{
      question: string;
      options: Array<{ text?: string; detail?: string; correct?: boolean }>;
      explanation?: string;
    }>;
  }>;
};

const SNAPSHOT = [
  { question: 'Q1', options: ['a', 'b'], correct: 0, explanation: 'vì a' },
  { question: 'Q2', options: ['x', 'y'], correct: 1 },
];

/**
 * Hình dạng THẬT của câu hỏi trong content_json của 40 bài PE v3: `correct` nằm
 * ở cấp câu hỏi (nên rơi vào nhánh "dạng 1") NHƯNG mỗi lựa chọn vẫn là object
 * mang theo cờ `correct` và `detail`. Fixture cũ chỉ có chuỗi nên không bao giờ
 * chạm tới đường đi này — đó là lý do lỗ lộ đáp án sống sót qua mọi bài test.
 */
const PE_V3_MCQ = {
  question: 'File "a\\r\\nb\\r\\n" cho lines là gì?',
  options: [
    { text: '["a", "b"]', detail: 'rstrip bỏ cả \\r lẫn \\n.', correct: true },
    { text: '["a\\r", "b\\r"]', detail: 'CR cũng bị bỏ.', correct: false },
    {
      text: '["a", "", "b", ""]',
      detail: 'Mỗi dòng đọc một lần.',
      correct: false,
    },
  ],
  correct: 0,
  explanation: 'rstrip("\\r\\n") bỏ cả \\r lẫn \\n ở cuối.',
};

/**
 * Hình dạng câu hỏi trong SNAPSHOT lưu DB (`quiz.questionsJson`) — bản ĐẦY ĐỦ,
 * còn `correct`/`explanation` để chấm ở server, còn `lessonId`/`courseId` để
 * tính trọng số cho những lần ôn sau.
 *
 * Vì sao khai ở đây: nhiều ca trong file này đọc chính đối số mà service truyền
 * cho `prisma.quiz.create()` để chứng minh "FE không thấy đáp án nhưng DB vẫn
 * còn". Trước đây `prisma` khai `any` nên `mock.calls[0][0].data.questionsJson`
 * là `any`: assert sai tên field (`.questionJson`, `.lesson_id`…) vẫn biên dịch
 * được và chỉ lặng lẽ so `undefined`. Đặt kiểu ở đúng ranh giới này thì lỗi gõ
 * sai field là lỗi biên dịch.
 */
type SavedQuestion = {
  question: string;
  options: string[];
  correct: number | string;
  explanation?: string | null;
  lessonId?: number;
  courseId?: string;
};

/** Đối số `prisma.quiz.create({ data })` mà `persistQuiz()` dựng. */
type QuizCreateArg = {
  data: {
    userId: number;
    courseId: string;
    status: string;
    /**
     * Nhãn loại đề. `undefined` cho mọi đề ôn tập (cột `kind` giữ NULL),
     * `'post_test'` cho bài hậu kiểm. Khai ở đây để ca test gõ sai tên field
     * là lỗi biên dịch, không phải một `undefined` lặng lẽ.
     */
    kind?: string;
    questionsJson: SavedQuestion[];
  };
};

/** Đối số `prisma.lesson.findMany({ where: { id: { in } } })`. */
type LessonFindManyArg = {
  where: { id: { in: number[] } };
};

/**
 * Đối số `prisma.lessonProgress.findMany({ where })`.
 *
 * Khai kiểu để ca test đọc lại ĐƯỢC mệnh đề WHERE. Đây là ngoại lệ có lý do
 * cho luật "đừng kiểm đã gọi mấy truy vấn": `status: 'completed'` và
 * `courseId` KHÔNG phải chi tiết hiệu năng — chúng LÀ hành vi ("chỉ hỏi về bài
 * đã hoàn thành, trong đúng khoá này"), và mock Prisma không thực thi WHERE hộ,
 * nên nếu không đọc lại mệnh đề thì gỡ nó ra mọi ca vẫn XANH.
 */
type LessonProgressFindManyArg = {
  where: {
    userId?: number;
    courseId?: string;
    status?: string;
    completedAt?: { gte?: Date; lte?: Date };
  };
};

/**
 * Một hàm Prisma giả. `Promise<unknown>` cho phần giá trị TRẢ VỀ là đủ — mỗi ca
 * tự `mockResolvedValue()` hình dạng nó cần; phần ĐỐI SỐ mới là chỗ cần kiểu
 * thật, vì test đọc lại `mock.calls`.
 */
type AsyncMock<A extends unknown[] = unknown[]> = jest.Mock<
  Promise<unknown>,
  A
>;

/**
 * `jest.fn()` trần trả `Mock<any, any>`: gán vào một field đã khai kiểu là gán
 * `any`, và `no-unsafe-assignment` bắt đúng chỗ đó. Bọc lại để mỗi mock sinh ra
 * đã mang sẵn kiểu đối số.
 */
const asyncMock = <A extends unknown[] = unknown[]>(): AsyncMock<A> =>
  jest.fn<Promise<unknown>, A>();

/** Chỉ những bảng/hàm mà QuizzesService thật sự gọi. */
type PrismaMock = {
  lessonProgress: { findMany: AsyncMock<[LessonProgressFindManyArg]> };
  lesson: { findMany: AsyncMock<[LessonFindManyArg]> };
  quiz: {
    create: AsyncMock<[QuizCreateArg]>;
    findFirst: AsyncMock;
    findUnique: AsyncMock;
    update: AsyncMock;
    updateMany: AsyncMock;
  };
  reviewQuizResult: {
    findFirst: AsyncMock;
    findMany: AsyncMock;
    create: AsyncMock;
  };
  $transaction: AsyncMock<[(tx: PrismaMock) => Promise<unknown>]>;
};

describe('QuizzesService', () => {
  let service: QuizzesService;
  let prisma: PrismaMock;
  /**
   * Giá trị thô mà ConfigService trả về CHO ĐÚNG khoá `POSTTEST_DELAY_DAYS`.
   * Ca test đổi biến này thay vì dựng lại module.
   */
  let soNgayTreCauHinh: unknown;

  beforeEach(async () => {
    soNgayTreCauHinh = 7;
    prisma = {
      lessonProgress: { findMany: asyncMock<[LessonProgressFindManyArg]>() },
      lesson: { findMany: asyncMock<[LessonFindManyArg]>() },
      quiz: {
        create: asyncMock<[QuizCreateArg]>(),
        // Cổng một-lần của bài hậu kiểm; mặc định CHƯA phát đề nào.
        findFirst: asyncMock().mockResolvedValue(null),
        findUnique: asyncMock(),
        update: asyncMock(),
        // CAS generated -> submitted trong submitQuiz; mặc định giành được quyền.
        updateMany: asyncMock().mockResolvedValue({ count: 1 }),
      },
      reviewQuizResult: {
        findFirst: asyncMock(),
        findMany: asyncMock(),
        create: asyncMock(),
      },
      $transaction: jest.fn<
        Promise<unknown>,
        [(tx: PrismaMock) => Promise<unknown>]
      >((cb) => cb(prisma)),
    };

    const mod = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          // PHÂN BIỆT KHOÁ, không phải `{ get: () => 7 }`. Bài học của
          // `refresh-token.service.spec.ts`: một mock trả cùng giá trị cho mọi
          // khoá làm MỌI ca so sánh theo khoá trở nên vô nghĩa mà vẫn XANH.
          // Khoá lạ trả một chuỗi RÁC để ca test bắt được nếu service đọc sai
          // tên biến — `soNgayTre()` sẽ rơi về mặc định 7 chứ không về 0.
          useValue: {
            get: (key: string): unknown =>
              key === KHOA_SO_NGAY_TRE ? soNgayTreCauHinh : 'khoa-khac',
          },
        },
      ],
    }).compile();
    service = mod.get(QuizzesService);
  });

  // ---------- Task 135 ----------
  describe('KHÔNG BAO GIỜ lộ đáp án ở mọi nhánh', () => {
    it('generateQuiz: response không chứa correct/explanation, nhưng DB có', async () => {
      prisma.lessonProgress.findMany.mockResolvedValue([{ lessonId: 1 }]);
      prisma.lesson.findMany.mockResolvedValue([
        {
          contentJson: {
            step_2: { mcq: [...SNAPSHOT, ...SNAPSHOT, ...SNAPSHOT] },
          },
        },
      ]);
      prisma.quiz.create.mockResolvedValue({ id: 9 });

      const res = await service.generateQuiz(1, 'c1');

      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain('correct');
      expect(serialized).not.toContain('explanation');
      // Nhưng snapshot lưu DB PHẢI còn đáp án để chấm điểm server-side.
      const saved = JSON.stringify(
        prisma.quiz.create.mock.calls[0][0].data.questionsJson,
      );
      expect(saved).toContain('correct');
    });

    it('câu hỏi PE v3 (correct ở cấp câu hỏi + cờ trong từng lựa chọn) không lộ gì', async () => {
      prisma.lessonProgress.findMany.mockResolvedValue([{ lessonId: 1 }]);
      prisma.lesson.findMany.mockResolvedValue([
        {
          id: 1,
          courseId: 'python',
          contentJson: {
            step_2: {
              mcq: [PE_V3_MCQ, PE_V3_MCQ, PE_V3_MCQ, PE_V3_MCQ, PE_V3_MCQ],
            },
          },
        },
      ]);
      prisma.quiz.create.mockResolvedValue({ id: 9 });

      const res = await service.generateQuiz(1, 'python');

      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain('correct');
      expect(serialized).not.toContain('detail');
      expect(serialized).not.toContain('explanation');
      // Lựa chọn phải tới FE dưới dạng chuỗi thuần, giữ nguyên thứ tự.
      expect(res.questions[0].options).toEqual([
        '["a", "b"]',
        '["a\\r", "b\\r"]',
        '["a", "", "b", ""]',
      ]);
      // Bản lưu DB vẫn phải đủ đáp án để chấm điểm ở server.
      const saved = prisma.quiz.create.mock.calls[0][0].data.questionsJson;
      expect(saved[0].correct).toBe(0);
    });

    it('getQuiz khi CHƯA nộp: vẫn giấu đáp án', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        id: 9,
        userId: 1,
        status: 'generated',
        questionsJson: SNAPSHOT,
      });

      const res = await service.getQuiz(1, 9);
      expect(JSON.stringify(res)).not.toContain('correct');
    });
  });

  describe('submitQuiz', () => {
    it('chấm theo SNAPSHOT trong DB, bỏ qua điểm client gửi', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        id: 9,
        userId: 1,
        status: 'generated',
        questionsJson: SNAPSHOT,
      });

      // Client trả lời: câu 1 đúng (0), câu 2 sai (0 thay vì 1).
      const res = await service.submitQuiz(1, 9, [0, 0]);

      expect(res.score).toBe(1);
      expect(res.total).toBe(2);
      expect(prisma.reviewQuizResult.create).toHaveBeenCalled();
    });

    it('quiz của người khác -> 403', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        id: 9,
        userId: 999,
        status: 'generated',
        questionsJson: SNAPSHOT,
      });
      await expect(service.submitQuiz(1, 9, [])).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('hai request song song cùng nộp -> request thua CAS nhận 409, không ghi kết quả', async () => {
      // Cả hai đều đọc ra status 'generated' (race), nhưng CAS trong
      // transaction chỉ cho MỘT request đổi được trạng thái.
      prisma.quiz.findUnique.mockResolvedValue({
        id: 9,
        userId: 1,
        status: 'generated',
        questionsJson: SNAPSHOT,
      });
      prisma.quiz.updateMany.mockResolvedValue({ count: 0 }); // thua CAS

      await expect(service.submitQuiz(1, 9, [0, 1])).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.reviewQuizResult.create).not.toHaveBeenCalled();
    });

    it('đã nộp rồi -> 409, không ghi kết quả lần 2', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        id: 9,
        userId: 1,
        status: 'submitted',
        questionsJson: SNAPSHOT,
      });
      await expect(service.submitQuiz(1, 9, [])).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.reviewQuizResult.create).not.toHaveBeenCalled();
    });
  });

  // ---------- Task 136 ----------
  describe('generateReviewQuiz (đề ôn tập có trọng số)', () => {
    // Pool 2 bài: bài 1 (hay sai) 6 câu, bài 2 (luôn đúng) 6 câu — đủ vượt
    // MIN_POOL để không rơi vào nhánh "chưa đủ câu hỏi".
    const q = (n: string) => ({
      question: n,
      options: ['a', 'b'],
      correct: 0,
      explanation: 'vì a',
    });
    const mockPool = () => {
      prisma.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 1 },
        { lessonId: 2 },
      ]);
      prisma.lesson.findMany.mockResolvedValue([
        {
          id: 1,
          contentJson: {
            step_2: {
              mcq: [q('L1a'), q('L1b'), q('L1c'), q('L1d'), q('L1e'), q('L1f')],
            },
          },
        },
        {
          id: 2,
          contentJson: {
            step_2: {
              mcq: [q('L2a'), q('L2b'), q('L2c'), q('L2d'), q('L2e'), q('L2f')],
            },
          },
        },
      ]);
      prisma.quiz.create.mockResolvedValue({ id: 21 });
    };

    it('không lộ đáp án, cũng không lộ lessonId; snapshot DB vẫn đủ dữ liệu', async () => {
      mockPool();
      // Bài 1 sai 2/2, bài 2 đúng 2/2.
      prisma.reviewQuizResult.findMany.mockResolvedValue([
        {
          answersJson: [
            { lesson_id: 1, is_correct: false },
            { lesson_id: 1, is_correct: false },
            { lesson_id: 2, is_correct: true },
            { lesson_id: 2, is_correct: true },
          ],
        },
      ]);

      const res = await service.generateReviewQuiz(1, 'c1');

      expect(res.ok).toBe(true);
      expect(res.quiz_id).toBe(21);
      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain('correct');
      expect(serialized).not.toContain('explanation');
      // lessonId chỉ để tính trọng số ở backend, không được lộ ra FE.
      expect(serialized).not.toContain('lessonId');
      // Giữ đúng hợp đồng với FE: {index, question, options}.
      // `expect.any()` khai kiểu trả về là `any` trong @types/jest; ép về đúng
      // kiểu của field nó so sánh để chỗ này không mở lại một lỗ `any`.
      expect(res.questions[0]).toEqual({
        index: 0,
        question: expect.any(String) as string,
        options: ['a', 'b'],
      });

      // Snapshot lưu DB PHẢI còn đáp án + lessonId để chấm và để tính trọng số
      // cho những lần ôn sau.
      const saved = JSON.stringify(
        prisma.quiz.create.mock.calls[0][0].data.questionsJson,
      );
      expect(saved).toContain('correct');
      expect(saved).toContain('lessonId');
    });

    it('chưa có lịch sử làm bài -> không chia cho 0, vẫn ra đề bình thường', async () => {
      mockPool();
      prisma.reviewQuizResult.findMany.mockResolvedValue([]);

      const res = await service.generateReviewQuiz(1, 'c1');

      expect(res.ok).toBe(true);
      expect(res.questions).toHaveLength(10); // SAMPLE_MAX, pool 12 câu
      expect(res.questions.every((x) => Number.isFinite(x.index))).toBe(true);
    });

    it('bỏ qua bản ghi cũ thiếu lesson_id thay vì tính nhầm', async () => {
      mockPool();
      prisma.reviewQuizResult.findMany.mockResolvedValue([
        // dữ liệu từ trước khi có lesson_id
        { answersJson: [{ is_correct: false }, { is_correct: false }] },
        { answersJson: 'không phải mảng' },
        { answersJson: [{ lesson_id: 1, is_correct: false }] },
      ]);

      const res = await service.generateReviewQuiz(1, 'c1');
      expect(res.ok).toBe(true);
      expect(res.questions).toHaveLength(10);
    });

    it('nghiêng về bài hay sai (đo trên nhiều lần chạy)', async () => {
      // Trọng số bài 1 = 2, bài 2 = 1 -> kỳ vọng bài 1 chiếm nhiều hơn.
      // Chạy 200 lần rồi so tổng, tránh phụ thuộc một lần random may rủi.
      let fromL1 = 0;
      let fromL2 = 0;
      for (let i = 0; i < 200; i++) {
        mockPool();
        prisma.reviewQuizResult.findMany.mockResolvedValue([
          {
            answersJson: [
              { lesson_id: 1, is_correct: false },
              { lesson_id: 2, is_correct: true },
            ],
          },
        ]);
        await service.generateReviewQuiz(1, 'c1');
        const saved =
          prisma.quiz.create.mock.calls.at(-1)![0].data.questionsJson;
        // Đề 10 câu trên pool 12 câu nên chênh lệch bị nén lại, nhưng hướng
        // nghiêng vẫn phải thấy được: đếm câu bài 1 lọt vào đề.
        fromL1 += saved.filter((x) => x.lessonId === 1).length;
        fromL2 += saved.filter((x) => x.lessonId === 2).length;
      }
      expect(fromL1).toBeGreaterThan(fromL2);
    });
  });

  // ---------- Task 138 ----------
  describe('generateDailyReviewQuiz (đề ôn hằng ngày, gộp mọi khoá)', () => {
    const q = (n: string) => ({
      question: n,
      options: ['a', 'b'],
      correct: 0,
      explanation: 'vì a',
    });
    // Khoá 'python' 8 câu, khoá 'cpp' 4 câu -> python là khoá áp đảo.
    const mockPool = () => {
      prisma.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 1 },
        { lessonId: 2 },
      ]);
      prisma.lesson.findMany.mockResolvedValue([
        {
          id: 1,
          courseId: 'python',
          contentJson: {
            step_2: {
              mcq: [
                q('P1'),
                q('P2'),
                q('P3'),
                q('P4'),
                q('P5'),
                q('P6'),
                q('P7'),
                q('P8'),
              ],
            },
          },
        },
        {
          id: 2,
          courseId: 'cpp',
          contentJson: {
            step_2: { mcq: [q('C1'), q('C2'), q('C3'), q('C4')] },
          },
        },
      ]);
      prisma.quiz.create.mockResolvedValue({ id: 31 });
    };

    it('chưa ôn hôm nay -> ra đề, trộn câu từ NHIỀU khoá', async () => {
      mockPool();
      // Lần nộp gần nhất là hôm kia -> không chặn.
      prisma.reviewQuizResult.findFirst.mockResolvedValue({
        submittedAt: new Date(Date.now() - 2 * 86_400_000),
      });
      prisma.reviewQuizResult.findMany.mockResolvedValue([]);

      const res = await service.generateDailyReviewQuiz(1);

      expect(res.ok).toBe(true);
      expect(res.quiz_id).toBe(31);
      expect(res.questions).toHaveLength(10);

      const saved = prisma.quiz.create.mock.calls[0][0].data.questionsJson;
      const courses = new Set(saved.map((x) => x.courseId));
      expect(courses.size).toBeGreaterThan(1); // thật sự gộp khoá

      // Không lộ gì thừa ra FE.
      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain('correct');
      expect(serialized).not.toContain('courseId');
      expect(serialized).not.toContain('lessonId');
    });

    it('đề trộn khoá vẫn ghi vào khoá đóng góp nhiều câu nhất', async () => {
      mockPool();
      prisma.reviewQuizResult.findFirst.mockResolvedValue(null);
      prisma.reviewQuizResult.findMany.mockResolvedValue([]);

      await service.generateDailyReviewQuiz(1);

      // Pool 12 câu (8 python / 4 cpp), lấy 10 -> python luôn chiếm đa số.
      expect(prisma.quiz.create.mock.calls[0][0].data.courseId).toBe('python');
    });

    it('đã nộp trong ngày hôm nay -> chặn, không tạo đề mới', async () => {
      mockPool();
      prisma.reviewQuizResult.findFirst.mockResolvedValue({
        submittedAt: new Date(),
      });

      await expect(service.generateDailyReviewQuiz(1)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.quiz.create).not.toHaveBeenCalled();
    });

    it('chưa từng ôn lần nào -> vẫn ra đề bình thường', async () => {
      mockPool();
      prisma.reviewQuizResult.findFirst.mockResolvedValue(null);
      prisma.reviewQuizResult.findMany.mockResolvedValue([]);

      const res = await service.generateDailyReviewQuiz(1);
      expect(res.ok).toBe(true);
      expect(res.questions).toHaveLength(10);
    });
  });

  // ---------- Task 139-140 ----------
  describe('Bộ đếm + đề "bài học hôm nay"', () => {
    const q = (n: string) => ({
      question: n,
      options: ['a', 'b'],
      correct: 0,
      explanation: 'vì a',
    });
    const HOM_NAY = new Date();
    const HOM_KIA = new Date(Date.now() - 2 * 86_400_000);

    /** 2 bài xong HÔM NAY (6 câu) + 1 bài xong hôm kia (phải bị loại). */
    const mockToday = () => {
      prisma.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 1, completedAt: HOM_NAY },
        { lessonId: 2, completedAt: HOM_NAY },
        { lessonId: 9, completedAt: HOM_KIA },
      ]);
      prisma.lesson.findMany.mockResolvedValue([
        {
          id: 1,
          courseId: 'python',
          title: 'Vòng lặp for',
          module: 'M1',
          course: { title: 'Python' },
          contentJson: { step_2: { mcq: [q('A1'), q('A2'), q('A3')] } },
        },
        {
          id: 2,
          courseId: 'cpp',
          title: 'Con trỏ',
          module: 'M1',
          course: { title: 'C/C++' },
          contentJson: { step_2: { mcq: [q('B1'), q('B2'), q('B3')] } },
        },
      ]);
      prisma.quiz.create.mockResolvedValue({ id: 41 });
    };

    it('chỉ đếm bài hoàn thành HÔM NAY, bỏ bài hôm kia', async () => {
      mockToday();
      const res = await service.getTodayLessons(1);

      // lessonProgress trả 3 dòng nhưng chỉ 2 dòng là của hôm nay -> chỉ 2
      // lessonId được đưa vào truy vấn lesson.
      const ids = prisma.lesson.findMany.mock.calls[0][0].where.id.in;
      expect(ids.sort()).toEqual([1, 2]);

      expect(res.count).toBe(2);
      expect(res.questions_available).toBe(6);
      expect(res.can_quiz).toBe(true);
      expect(res.lessons.map((l) => l.title).sort()).toEqual([
        'Con trỏ',
        'Vòng lặp for',
      ]);
      expect(res.lessons[0].course_title).toBeTruthy();
      expect(res.lessons[0].question_count).toBe(3);
    });

    it('chưa học bài nào hôm nay -> đếm 0, không gọi tới bảng lessons', async () => {
      prisma.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 9, completedAt: HOM_KIA },
      ]);

      const res = await service.getTodayLessons(1);
      expect(res.count).toBe(0);
      expect(res.can_quiz).toBe(false);
      expect(prisma.lesson.findMany).not.toHaveBeenCalled();
    });

    it('sinh đề chỉ từ bài hôm nay, không lộ đáp án', async () => {
      mockToday();
      const res = await service.generateTodayQuiz(1);

      expect(res.ok).toBe(true);
      expect(res.quiz_id).toBe(41);
      // pool 6 câu, sampleSize kẹp trong [5,10] -> lấy trọn cả 6
      expect(res.questions).toHaveLength(6);

      const saved = prisma.quiz.create.mock.calls[0][0].data.questionsJson;
      // Không câu nào được lấy từ bài học hôm kia.
      expect(saved.every((x) => x.lessonId === 1 || x.lessonId === 2)).toBe(
        true,
      );

      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain('correct');
      expect(serialized).not.toContain('lessonId');
    });

    it('hôm nay chưa học bài nào -> 400 với lời nhắc riêng', async () => {
      prisma.lessonProgress.findMany.mockResolvedValue([]);
      await expect(service.generateTodayQuiz(1)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.quiz.create).not.toHaveBeenCalled();
    });

    it('bài hôm nay có nhưng chưa đủ câu -> 400, không tạo đề', async () => {
      prisma.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 1, completedAt: HOM_NAY },
      ]);
      prisma.lesson.findMany.mockResolvedValue([
        {
          id: 1,
          courseId: 'python',
          contentJson: { step_2: { mcq: [q('A1'), q('A2')] } }, // 2 < MIN_POOL
        },
      ]);

      await expect(service.generateTodayQuiz(1)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.quiz.create).not.toHaveBeenCalled();
    });
  });

  // ---------- Task 144 ----------
  describe('Đọc được câu hỏi dạng "correct nằm ở từng lựa chọn"', () => {
    // Đây là dạng của TOÀN BỘ nội dung bài học có sẵn trong dự án
    // (lesson_content*.js): mỗi option tự mang cờ correct + explanation,
    // KHÔNG có `correct` ở cấp câu hỏi.
    const qOptLevel = (n: string, dungO: number) => ({
      question: n,
      options: ['A', 'B', 'C', 'D'].map((t, i) => ({
        id: t.toLowerCase(),
        text: t + ' — ' + n,
        correct: i === dungO,
        explanation: i === dungO ? 'vì đây đúng' : 'sai vì...',
      })),
    });

    it('quy đổi sang dạng chuẩn: options thành chuỗi, correct thành vị trí', async () => {
      prisma.lessonProgress.findMany.mockResolvedValue([{ lessonId: 1 }]);
      prisma.lesson.findMany.mockResolvedValue([
        {
          id: 1,
          courseId: 'db_design',
          contentJson: {
            step_2: {
              mcq: [
                qOptLevel('C1', 1),
                qOptLevel('C2', 0),
                qOptLevel('C3', 3),
                qOptLevel('C4', 2),
                qOptLevel('C5', 1),
              ],
            },
          },
        },
      ]);
      prisma.quiz.create.mockResolvedValue({ id: 55 });

      const res = await service.generateQuiz(1, 'db_design');
      expect(res.questions).toHaveLength(5);

      // FE nhận options là mảng CHUỖI, không phải object.
      expect(res.questions[0].options.every((o) => typeof o === 'string')).toBe(
        true,
      );

      const saved = prisma.quiz.create.mock.calls[0][0].data.questionsJson;
      // Snapshot lưu DB có `correct` là VỊ TRÍ lựa chọn đúng.
      for (const q of saved) {
        expect(typeof q.correct).toBe('number');
        expect(q.options[q.correct]).toContain(q.question);
      }
      // Không rò cờ correct/explanation của từng lựa chọn ra FE.
      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain('correct');
      expect(serialized).not.toContain('explanation');
    });

    it('chấm điểm khớp: gửi vị trí lựa chọn đúng -> tính điểm', async () => {
      const snapshot = [
        { question: 'C1', options: ['A', 'B'], correct: 1, lessonId: 1 },
        { question: 'C2', options: ['A', 'B'], correct: 0, lessonId: 1 },
      ];
      prisma.quiz.findUnique.mockResolvedValue({
        id: 7,
        userId: 1,
        status: 'generated',
        questionsJson: snapshot,
      });

      const res = await service.submitQuiz(1, 7, [1, 1]);
      expect(res.score).toBe(1); // câu 1 đúng, câu 2 sai
      expect(res.total).toBe(2);
    });

    it('câu không có lựa chọn nào đánh dấu đúng -> bỏ qua, không nhận bừa', async () => {
      prisma.lessonProgress.findMany.mockResolvedValue([{ lessonId: 1 }]);
      prisma.lesson.findMany.mockResolvedValue([
        {
          id: 1,
          courseId: 'db_design',
          contentJson: {
            step_2: {
              mcq: [
                { question: 'Hỏng', options: [{ text: 'A' }, { text: 'B' }] },
              ],
            },
          },
        },
      ]);

      await expect(service.generateQuiz(1, 'db_design')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('kho quiz đọc được câu trắc nghiệm của khoá 172 bài', () => {
    /** Dựng pool từ n bài pe-da đầu tiên có trắc nghiệm. */
    function dungPool(codes: string[]) {
      prisma.lessonProgress.findMany.mockResolvedValue(
        codes.map((_, i) => ({ lessonId: i + 1 })),
      );
      prisma.lesson.findMany.mockResolvedValue(
        codes.map((c, i) => ({
          id: i + 1,
          courseId: 'python_advanced',
          contentJson: peDa(c),
        })),
      );
    }

    it('bản dựng có đúng 3 câu mỗi bài và mỗi câu đúng MỘT đáp án', () => {
      // Chốt ở đây vì mọi ca dưới dựa vào nó: 0 đáp án đúng thì
      // `normalizeQuestion` trả null (pool rỗng), 2 đáp án thì `findIndex` lấy
      // cái đầu và câu đó chấm sai một nửa học viên.
      const coMcq = PE_DA.lessons.filter(
        (l) => (l.content_json.step_2?.mcq ?? []).length,
      );
      // MỌI bài phải có trắc nghiệm — so với tổng số bài của gói, KHÔNG ghi
      // cứng. Con số 172 ở đây từng làm cả bộ đỏ khi thêm module 11, mà thứ
      // ca này muốn nói là "không bài nào thiếu câu hỏi", không phải "khoá
      // dài đúng bằng này".
      expect(coMcq.length).toBe(PE_DA.lessons.length);
      for (const l of coMcq) {
        const mcq = l.content_json.step_2!.mcq as Array<{
          question?: string;
          options?: Array<{ text?: string; correct?: boolean }>;
        }>;
        expect(mcq.length).toBe(3);
        for (const q of mcq) {
          expect(typeof q.question).toBe('string');
          expect(q.question!.length).toBeGreaterThan(0);
          expect((q.options ?? []).length).toBeGreaterThanOrEqual(2);
          expect(
            (q.options ?? []).filter((o) => o.correct === true).length,
          ).toBe(1);
        }
      }
    });

    it('MỘT bài đã xong là đủ 3 câu, nhưng chưa đủ MIN_POOL=5', async () => {
      // AGENTS.md ghi hệ quả này cho pe-v4 và nó vẫn đúng: thông báo gửi FE nói
      // theo SỐ CÂU (min_questions: 5) nên dễ đọc nhầm thành "xong 1 bài là đủ".
      dungPool(['PY01']);
      await expect(service.generateQuiz(1, 'python_advanced')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('HAI bài đã xong -> ra đề, và đáp án KHÔNG đi ra client', async () => {
      dungPool(['PY01', 'PY02']);
      prisma.quiz.create.mockResolvedValue({ id: 7 });
      const res = (await service.generateQuiz(1, 'python_advanced')) as {
        questions: Array<Record<string, unknown>>;
      };

      expect(res.questions.length).toBeGreaterThanOrEqual(5);
      for (const q of res.questions) {
        expect(q).not.toHaveProperty('correct');
        expect(q).not.toHaveProperty('explanation');
        // Lựa chọn phải là CHUỖI: giữ nguyên object là gửi thẳng cờ `correct`
        // của từng lựa chọn về trình duyệt — stripAnswers chỉ bỏ field ở cấp
        // câu hỏi.
        for (const o of q.options as unknown[]) expect(typeof o).toBe('string');
      }

      // Nhưng SNAPSHOT trong DB phải còn đáp án để chấm ở server.
      const luu = prisma.quiz.create.mock.calls[0][0].data.questionsJson;
      expect(luu.length).toBe(res.questions.length);
      for (const q of luu) {
        expect(typeof q.correct).not.toBe('undefined');
        expect(typeof q.question).toBe('string');
      }
    });

    it('`correct` trong snapshot là VỊ TRÍ, trỏ đúng lựa chọn mang cờ', async () => {
      // `correctOption: '<id>'` của gói -> `correct: true` trên một lựa chọn
      // (build.py) -> `correct: <vị trí>` trong snapshot (normalizeQuestion).
      // Ba hình dạng nối nhau; lệch một bước là chấm sai mà không ai biết.
      dungPool(['PY01', 'PY02']);
      prisma.quiz.create.mockResolvedValue({ id: 7 });
      await service.generateQuiz(1, 'python_advanced');

      const luu = prisma.quiz.create.mock.calls[0][0].data.questionsJson;
      const nguon = [
        ...(peDa('PY01') as { step_2: { mcq: unknown[] } }).step_2.mcq,
        ...(peDa('PY02') as { step_2: { mcq: unknown[] } }).step_2.mcq,
      ] as Array<{
        question: string;
        options: Array<{ text: string; correct?: boolean }>;
      }>;

      for (const q of luu) {
        const goc = nguon.find((n) => n.question === q.question);
        expect(goc).toBeDefined();
        const viTri = goc!.options.findIndex((o) => o.correct === true);
        expect(q.correct).toBe(viTri);
        // Và `options[correct]` phải là chữ của đúng lựa chọn đó.
        expect(q.options[q.correct as number]).toBe(goc!.options[viTri].text);
      }
    });

    it('đề KHÔNG lấy hai câu cùng một bài khi còn bài khác — ca bắt lỗi', async () => {
      // Mỗi bài chỉ có MỘT gốc câu hỏi: 3 câu của một bài là 3 biến thể cùng
      // gốc. Bốc đều trên pool thì học viên dễ gặp 3 câu hỏi cùng một chuyện,
      // và họ đọc ra điều đó là "đề bị lặp".
      //
      // Phải cấp NHIỀU HƠN 10 bài: một đề lấy tối đa SAMPLE_MAX = 10 câu, nên
      // 7 bài thì trùng là bắt buộc chứ không phải lỗi. Bản đầu của ca này
      // dùng 7 bài và đỏ oan — đúng tiền đề sai, không phải code sai.
      const codes = [
        'PY01',
        'PY02',
        'PY03',
        'PY04',
        'PY05',
        'PY06',
        'PY07',
        'PY08',
        'PY09',
        'PY10',
        'PY11',
        'PY12',
      ];
      dungPool(codes);
      prisma.quiz.create.mockResolvedValue({ id: 7 });

      // Chạy nhiều lượt: luật này về xác suất, một lượt may mắn không chứng
      // minh được gì.
      for (let lan = 0; lan < 40; lan += 1) {
        prisma.quiz.create.mockClear();
        await service.generateQuiz(1, 'python_advanced');
        const luu = prisma.quiz.create.mock.calls[0][0].data.questionsJson;
        const bai = luu.map((q) => q.lessonId);
        expect(new Set(bai).size).toBe(bai.length);
      }
    });

    it('nhưng vẫn RA ĐỀ khi số bài ÍT HƠN số câu mỗi đề', async () => {
      // Siết thành luật cứng thì đề 5 câu cần 5 bài, trong khi MIN_POOL chỉ hứa
      // 5 CÂU (2 bài) — hứa một đằng chặn một nẻo. Vòng hai lấy tiếp từ phần
      // còn lại, nên 2 bài vẫn ra được đề đủ câu.
      dungPool(['PY01', 'PY02']);
      prisma.quiz.create.mockResolvedValue({ id: 7 });
      await service.generateQuiz(1, 'python_advanced');
      const luu = prisma.quiz.create.mock.calls[0][0].data.questionsJson;
      expect(luu.length).toBeGreaterThanOrEqual(5);
      expect(new Set(luu.map((q) => q.lessonId)).size).toBe(2);
    });
  });

  /**
   * CỔNG "mở được đề ôn chưa" của MỘT KHOÁ.
   *
   * Vì sao route này phải tồn tại: `buildQuestionPool()` ném
   * `BadRequestException('Chưa đủ câu hỏi để tạo quiz, hãy hoàn thành thêm bài
   * học')`, mà `AllExceptionsFilter` chỉ giữ `message` — mọi con số kèm theo bị
   * BỎ. Nên không có đường nào để giao diện biết TRƯỚC là có ôn được không, và
   * cũng không có đường nào để nó nói "còn thiếu mấy BÀI" (ngưỡng đếm theo CÂU:
   * 5 câu = 2 bài với khoá 172 bài — đúng chỗ dễ nói sai nhất).
   */
  describe('getCourseQuizStatus (cổng của đề ôn)', () => {
    it('chưa học bài nào -> trả 200 kèm số 0, KHÔNG ném', async () => {
      // Một route TRẠNG THÁI mà ném thì nó lại đúng là cái màn hình cụt nó ra
      // đời để xoá: giao diện không phân biệt được "chưa đủ bài" với "API chết".
      prisma.lessonProgress.findMany.mockResolvedValue([]);
      const res = await service.getCourseQuizStatus(1, 'python_advanced');
      expect(res).toEqual({
        ok: true,
        lessons_completed: 0,
        lessons_counted: 0,
        questions_available: 0,
        min_questions: 5,
        can_quiz: false,
      });
      // Không đi tiếp vòng DB thứ hai khi chưa có bài nào.
      expect(prisma.lesson.findMany).not.toHaveBeenCalled();
    });

    it('MỘT bài pe-da -> 3 câu / 1 bài, chưa mở (đây là ca "5 câu = 2 bài")', async () => {
      prisma.lessonProgress.findMany.mockResolvedValue([{ lessonId: 1 }]);
      prisma.lesson.findMany.mockResolvedValue([
        { id: 1, courseId: 'python_advanced', contentJson: peDa('PY01') },
      ]);
      const res = await service.getCourseQuizStatus(1, 'python_advanced');
      expect(res).toMatchObject({
        lessons_completed: 1,
        lessons_counted: 1,
        questions_available: 3,
        min_questions: 5,
        can_quiz: false,
      });
      // Và nó phải khớp với điều `generateQuiz` thật sự làm ở cùng pool đó —
      // hai con số lệch nhau là cổng mời người học bấm một nút sẽ 400.
      await expect(service.generateQuiz(1, 'python_advanced')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('HAI bài pe-da -> 6 câu / 2 bài, can_quiz = true và đề ra được thật', async () => {
      prisma.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 1 },
        { lessonId: 2 },
      ]);
      prisma.lesson.findMany.mockResolvedValue([
        { id: 1, courseId: 'python_advanced', contentJson: peDa('PY01') },
        { id: 2, courseId: 'python_advanced', contentJson: peDa('PY02') },
      ]);
      const res = await service.getCourseQuizStatus(1, 'python_advanced');
      expect(res).toMatchObject({
        lessons_counted: 2,
        questions_available: 6,
        can_quiz: true,
      });

      prisma.quiz.create.mockResolvedValue({ id: 7 });
      await expect(
        service.generateQuiz(1, 'python_advanced'),
      ).resolves.toMatchObject({ ok: true });
    });

    it('lessons_counted đếm bài THỰC SỰ góp câu, không phải bài đã xong', async () => {
      // Hai con số này lệch nhau ở bài chưa có trắc nghiệm, và chính chỗ lệch
      // đó là chỗ một phép đoán "3 câu mỗi bài" ở frontend sẽ nói sai số bài
      // còn thiếu.
      prisma.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 1 },
        { lessonId: 2 },
      ]);
      prisma.lesson.findMany.mockResolvedValue([
        { id: 1, courseId: 'python_advanced', contentJson: peDa('PY01') },
        { id: 2, courseId: 'python_advanced', contentJson: { step_1: {} } },
      ]);
      const res = await service.getCourseQuizStatus(1, 'python_advanced');
      expect(res).toMatchObject({
        lessons_completed: 2,
        lessons_counted: 1,
        questions_available: 3,
      });
    });

    it('chỉ hỏi bài ĐÃ HOÀN THÀNH, trong ĐÚNG khoá này', async () => {
      // Mock Prisma không thực thi WHERE hộ, nên không đọc lại mệnh đề thì gỡ
      // nó ra mọi ca vẫn XANH.
      prisma.lessonProgress.findMany.mockResolvedValue([{ lessonId: 1 }]);
      prisma.lesson.findMany.mockResolvedValue([
        { id: 1, courseId: 'python_advanced', contentJson: peDa('PY01') },
      ]);
      await service.getCourseQuizStatus(42, 'python_advanced');
      expect(
        prisma.lessonProgress.findMany.mock.calls[0][0].where,
      ).toMatchObject({
        userId: 42,
        courseId: 'python_advanced',
        status: 'completed',
      });
    });

    it('KHÔNG lộ một câu hỏi nào — route này chỉ trả SỐ', async () => {
      prisma.lessonProgress.findMany.mockResolvedValue([{ lessonId: 1 }]);
      prisma.lesson.findMany.mockResolvedValue([
        { id: 1, courseId: 'python_advanced', contentJson: peDa('PY01') },
      ]);
      const res = await service.getCourseQuizStatus(1, 'python_advanced');
      const chu = JSON.stringify(res);
      expect(res).not.toHaveProperty('questions');
      expect(chu).not.toContain('correct');
      // Đề bài câu đầu của PY01 không được xuất hiện ở đâu trong response.
      expect(chu).not.toContain(mcqTrongBai('PY01')[0].question);
    });
  });

  // ---------- Bài hậu kiểm CÓ TRỄ ----------
  describe('Bài hậu kiểm CÓ TRỄ', () => {
    const NGAY = 86_400_000;

    /**
     * Dựng tiến độ + hàng lesson cho luồng hậu kiểm.
     *
     * `lesson.findMany` chạy theo ĐÚNG `where.id.in` mà service truyền, không
     * trả bừa cả danh sách: cổng trễ được thực thi bằng chính bộ lọc đó, nên
     * một mock bỏ qua nó sẽ làm ca "bài học hôm qua không bị hỏi" ĐẠT vì lý do
     * sai — đúng họ bẫy fixture mà file này đã ghi ở đầu.
     */
    function dungTienDo(bai: Array<{ code: string; ngayTruoc: number }>) {
      const hang = bai.map((b, i) => ({
        id: i + 1,
        courseId: 'python_advanced',
        lessonCode: b.code,
      }));
      prisma.lessonProgress.findMany.mockResolvedValue(
        bai.map((b, i) => ({
          lessonId: i + 1,
          completedAt: new Date(Date.now() - b.ngayTruoc * NGAY),
        })),
      );
      prisma.lesson.findMany.mockImplementation((args) => {
        const duoc = new Set(args.where.id.in);
        return Promise.resolve(hang.filter((h) => duoc.has(h.id)));
      });
      prisma.quiz.create.mockResolvedValue({ id: 77 });
      return hang;
    }

    /** 5 bài pe-da, tất cả hoàn thành 10 ngày trước -> cổng mở. */
    const DU_TRE = ['PY01', 'PY02', 'PY03', 'PY04', 'PY05'].map((code) => ({
      code,
      ngayTruoc: 10,
    }));

    // ---- Kho đề: không trùng một câu nào với 516 câu đang phát -------------
    it('516 câu hậu kiểm, và KHÔNG câu nào trùng câu đang phát trong bài', () => {
      // Đây là ca quan trọng nhất của cả khối. Trùng một câu là đo lại đúng
      // thứ người học vừa đọc lời giải thích — bộ giữ lại mất hết giá trị.
      expect(HAU_KIEM.course_id).toBe('python_advanced');
      expect(HAU_KIEM.lessons.length).toBe(172);
      const tongCau = HAU_KIEM.lessons.reduce(
        (n, m) => n + m.questions.length,
        0,
      );
      expect(tongCau).toBe(516);

      let soSanh = 0;
      for (const muc of HAU_KIEM.lessons) {
        const trongBai = mcqTrongBai(muc.lesson_code);
        // Mỗi bài phát ĐÚNG 3 câu; so bằng `length` chứ không bằng `Set.size`
        // vì VZ20 có HAI câu trùng nguyên văn trong bài (hai biến thể dùng
        // chung câu dẫn "Đoạn code dưới đây in gì?" và `cau_trac_nghiem()` bỏ
        // trường `code` phân biệt chúng — khiếm khuyết của bộ 516 câu đang
        // phát, không phải của kho này).
        expect(trongBai.length).toBe(3);
        const daThay = new Set(trongBai.map((q) => q.question));
        for (const q of muc.questions) {
          expect(daThay.has(q.question)).toBe(false);
          soSanh += 1;
        }
      }
      // Chứng minh vòng lặp đã chạy: một `for` trên danh sách rỗng cũng "đạt".
      expect(soSanh).toBe(516);
    });

    it('mỗi câu hậu kiểm đúng MỘT đáp án, và đề bài TỰ ĐỦ (có code khi cần)', () => {
      // 471/1032 câu của gói mang `code` ở một trường RIÊNG mà
      // `cau_trac_nghiem()` bỏ đi; nếu kho này đi nguyên theo thì 257/516 câu
      // là "Kết quả ở lệnh print cuối có giá trị nào?" mà không có code nào —
      // câu không trả lời được, và bài đo gồm câu như vậy cho ra số vô nghĩa.
      const noiToiCode = /[Dd]oạn code|lệnh print cuối|code dưới đây|dưới đây/;
      let coCode = 0;
      for (const muc of HAU_KIEM.lessons) {
        expect(muc.questions.length).toBeGreaterThan(0);
        for (const q of muc.questions) {
          expect(q.options.filter((o) => o.correct === true).length).toBe(1);
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          if (noiToiCode.test(q.question)) {
            expect(q.question).toContain('\n');
            coCode += 1;
          }
        }
      }
      expect(coCode).toBeGreaterThan(200);
    });

    // ---- Cổng TRỄ ----------------------------------------------------------
    it('bài học HÔM QUA chưa được hỏi -> 400, không tạo đề', async () => {
      dungTienDo(
        ['PY01', 'PY02', 'PY03', 'PY04', 'PY05'].map((code) => ({
          code,
          ngayTruoc: 1,
        })),
      );
      await expect(
        service.generatePostTest(1, 'python_advanced'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.quiz.create).not.toHaveBeenCalled();
    });

    it('đúng mốc 7 ngày là ranh giới: 6 ngày chặn, 8 ngày cho qua', async () => {
      dungTienDo(
        ['PY01', 'PY02', 'PY03', 'PY04', 'PY05'].map((code) => ({
          code,
          ngayTruoc: 6,
        })),
      );
      await expect(
        service.generatePostTest(1, 'python_advanced'),
      ).rejects.toThrow(BadRequestException);

      dungTienDo(
        ['PY01', 'PY02', 'PY03', 'PY04', 'PY05'].map((code) => ({
          code,
          ngayTruoc: 8,
        })),
      );
      const res = await service.generatePostTest(1, 'python_advanced');
      expect(res.questions.length).toBeGreaterThanOrEqual(5);
    });

    it('CHỈ bài đã đủ trễ được hỏi, bài vừa học xong thì không', async () => {
      // Hai bài cũ (đủ trễ) + ba bài mới. Pool phải chỉ gồm câu của hai bài
      // cũ, nên đề 5 câu không được chứa lessonId của ba bài mới.
      dungTienDo([
        { code: 'PY01', ngayTruoc: 30 },
        { code: 'PY02', ngayTruoc: 30 },
        { code: 'PY03', ngayTruoc: 0 },
        { code: 'PY04', ngayTruoc: 0 },
        { code: 'PY05', ngayTruoc: 0 },
      ]);
      await service.generatePostTest(1, 'python_advanced');
      const luu = prisma.quiz.create.mock.calls[0][0].data.questionsJson;
      expect(new Set(luu.map((q) => q.lessonId))).toEqual(new Set([1, 2]));
    });

    it('biến môi trường rác KHÔNG làm cổng trễ về 0 ngày', async () => {
      // Hướng lệch không đối xứng: đoán NGẮN hơn là mở toang cổng và đo trí
      // nhớ ngắn hạn mà vẫn báo ra một con số. Rác -> mặc định 7, không -> 0.
      soNgayTreCauHinh = 'bảy';
      dungTienDo(
        ['PY01', 'PY02', 'PY03', 'PY04', 'PY05'].map((code) => ({
          code,
          ngayTruoc: 2,
        })),
      );
      await expect(
        service.generatePostTest(1, 'python_advanced'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.quiz.create).not.toHaveBeenCalled();
    });

    it('POSTTEST_DELAY_DAYS=0 tắt được cổng (phải GÕ RA mới có)', async () => {
      soNgayTreCauHinh = 0;
      dungTienDo(
        ['PY01', 'PY02', 'PY03', 'PY04', 'PY05'].map((code) => ({
          code,
          ngayTruoc: 0,
        })),
      );
      const res = await service.generatePostTest(1, 'python_advanced');
      expect(res.questions.length).toBeGreaterThanOrEqual(5);
    });

    it('CHỈ hỏi bài ĐÃ HOÀN THÀNH, và chỉ trong khoá này', async () => {
      // Mock Prisma không thực thi WHERE hộ, nên phải đọc lại mệnh đề: gỡ
      // `status: 'completed'` ra thì bài đang học dở (hoặc bài của khoá khác)
      // cũng vào pool — hỏi điều chưa học thì không đo gì cả, mà mọi ca khác
      // vẫn XANH.
      dungTienDo(DU_TRE);
      await service.generatePostTest(1, 'python_advanced');
      const where = prisma.lessonProgress.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('completed');
      expect(where.courseId).toBe('python_advanced');
      expect(where.userId).toBe(1);
    });

    it('chưa hoàn thành bài nào -> 400 với lời nhắc riêng', async () => {
      dungTienDo([]);
      await expect(
        service.generatePostTest(1, 'python_advanced'),
      ).rejects.toThrow(/hoàn thành ít nhất một bài học/);
    });

    // ---- Không lộ đáp án ----------------------------------------------------
    it('response KHÔNG chứa đáp án, snapshot DB thì CÒN để chấm ở server', async () => {
      dungTienDo(DU_TRE);
      const res = await service.generatePostTest(1, 'python_advanced');

      const raNgoai = JSON.stringify(res);
      expect(raNgoai).not.toContain('correct');
      expect(raNgoai).not.toContain('explanation');
      // `detail` là lời phản hồi của từng lựa chọn — cũng là đáp án gián tiếp.
      expect(raNgoai).not.toContain('detail');
      // `source_ids` chỉ để truy vết; lọt ra là chỉ đường về gói nguồn.
      expect(raNgoai).not.toContain('practice-1-v');

      const luu = prisma.quiz.create.mock.calls[0][0].data.questionsJson;
      expect(typeof luu[0].correct).toBe('number');
      expect(JSON.stringify(luu)).toContain('correct');
    });

    it('getPostTestStatus không trả một đề bài nào', async () => {
      dungTienDo(DU_TRE);
      const res = await service.getPostTestStatus(1, 'python_advanced');
      expect(res.state).toBe('ready');
      const raNgoai = JSON.stringify(res);
      for (const q of HAU_KIEM.lessons[0].questions) {
        expect(raNgoai).not.toContain(q.question.slice(0, 20));
      }
      expect(prisma.quiz.create).not.toHaveBeenCalled();
    });

    // ---- MỘT LẦN -----------------------------------------------------------
    it('đã phát đề rồi -> 409, không phát đề thứ hai', async () => {
      dungTienDo(DU_TRE);
      prisma.quiz.findFirst.mockResolvedValue({ id: 5, status: 'generated' });
      await expect(
        service.generatePostTest(1, 'python_advanced'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.quiz.create).not.toHaveBeenCalled();
    });

    it('bấm đúp: P2002 từ unique index một-phần -> 409 chứ không phải 500', async () => {
      // Hai request đều đọc ra "chưa phát" rồi cả hai INSERT; chặn thật nằm ở
      // `uq_quizzes_one_post_test` trong DB, không ở phép kiểm phía trên.
      dungTienDo(DU_TRE);
      prisma.quiz.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('trùng', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(
        service.generatePostTest(1, 'python_advanced'),
      ).rejects.toThrow(ConflictException);
    });

    it('đã phát nhưng CHƯA nộp -> status "issued", không phải "ready"', async () => {
      // Phân biệt này quan trọng vì giao diện dùng 'ready' để MỜI làm bài: để
      // 'ready' khi đề đã phát là mời làm lần hai, rồi generate trả 409 — người
      // học thấy một nút bấm vào là lỗi.
      dungTienDo(DU_TRE);
      prisma.quiz.findFirst.mockResolvedValue({ id: 5, status: 'generated' });
      const res = await service.getPostTestStatus(1, 'python_advanced');
      expect(res.state).toBe('issued');
      expect(res.quiz_id).toBe(5);
    });

    it('đã nộp -> status "done" kèm điểm, không mời làm lại', async () => {
      dungTienDo(DU_TRE);
      prisma.quiz.findFirst.mockResolvedValue({ id: 5, status: 'submitted' });
      prisma.reviewQuizResult.findFirst.mockResolvedValue({
        score: 7,
        total: 10,
        submittedAt: new Date('2026-11-05T00:00:00Z'),
      });
      const res = await service.getPostTestStatus(1, 'python_advanced');
      expect(res.state).toBe('done');
      expect(res.score).toBe(7);
      expect(res.total).toBe(10);
    });

    // ---- Nhãn `kind` -------------------------------------------------------
    it('ghi kind="post_test"; đề ôn tập thường vẫn để kind NULL', async () => {
      dungTienDo(DU_TRE);
      await service.generatePostTest(1, 'python_advanced');
      expect(prisma.quiz.create.mock.calls[0][0].data.kind).toBe(
        POST_TEST_KIND,
      );

      // Đề ôn thường: nếu nó cũng mang nhãn thì cổng một-lần sẽ coi lần ôn đầu
      // là "đã làm hậu kiểm" và không ai được làm bài đo.
      prisma.quiz.create.mockClear();
      prisma.lessonProgress.findMany.mockResolvedValue([
        { lessonId: 1 },
        { lessonId: 2 },
      ]);
      prisma.lesson.findMany.mockImplementation(() =>
        Promise.resolve([
          { id: 1, courseId: 'python_advanced', contentJson: peDa('PY01') },
          { id: 2, courseId: 'python_advanced', contentJson: peDa('PY02') },
        ]),
      );
      await service.generateQuiz(1, 'python_advanced');
      expect(prisma.quiz.create.mock.calls[0][0].data.kind).toBeUndefined();
    });

    // ---- Bốc đều theo bài --------------------------------------------------
    it('không lấy hai câu cùng một bài khi còn bài khác', async () => {
      const ma = [
        'PY01',
        'PY02',
        'PY03',
        'PY04',
        'PY05',
        'PY06',
        'PY07',
        'PY08',
        'PY09',
        'PY10',
        'PY11',
        'PY12',
      ];
      dungTienDo(ma.map((code) => ({ code, ngayTruoc: 10 })));
      // Luật này về xác suất; một lượt may mắn không chứng minh được gì.
      for (let lan = 0; lan < 30; lan += 1) {
        prisma.quiz.create.mockClear();
        await service.generatePostTest(1, 'python_advanced');
        const bai = prisma.quiz.create.mock.calls[0][0].data.questionsJson.map(
          (q) => q.lessonId,
        );
        expect(new Set(bai).size).toBe(bai.length);
      }
    });

    it('bài tự tạo lúc hoàn thành (lesson_code NULL) không làm vỡ pool', async () => {
      // `resolveLesson()` tạo bản ghi lesson với lesson_code NULL — không tra
      // được kho, phải BỎ chứ không được ném.
      prisma.lessonProgress.findMany.mockResolvedValue(
        [1, 2, 3].map((id) => ({
          lessonId: id,
          completedAt: new Date(Date.now() - 10 * NGAY),
        })),
      );
      prisma.lesson.findMany.mockImplementation(() =>
        Promise.resolve([
          { id: 1, courseId: 'python_advanced', lessonCode: 'PY01' },
          { id: 2, courseId: 'python_advanced', lessonCode: null },
          { id: 3, courseId: 'python_advanced', lessonCode: 'PY02' },
        ]),
      );
      prisma.quiz.create.mockResolvedValue({ id: 77 });
      const res = await service.generatePostTest(1, 'python_advanced');
      expect(res.questions.length).toBeGreaterThanOrEqual(5);
    });

    it('khoá KHÁC không có kho hậu kiểm -> 400, không phải 500', async () => {
      prisma.lessonProgress.findMany.mockResolvedValue(
        [1, 2].map((id) => ({
          lessonId: id,
          completedAt: new Date(Date.now() - 10 * NGAY),
        })),
      );
      prisma.lesson.findMany.mockImplementation(() =>
        Promise.resolve([
          { id: 1, courseId: 'python', lessonCode: 'PY01' },
          { id: 2, courseId: 'python', lessonCode: 'PY02' },
        ]),
      );
      await expect(service.generatePostTest(1, 'python')).rejects.toThrow(
        BadRequestException,
      );
    });

    // ---- Nộp: dùng lại ĐÚNG submitQuiz -------------------------------------
    it('nộp đề hậu kiểm chấm ở server và lần nộp thứ hai nhận 409', async () => {
      // Snapshot thật của một đề hậu kiểm: lấy câu từ kho, qua service.
      dungTienDo(DU_TRE);
      await service.generatePostTest(1, 'python_advanced');
      const snapshot = prisma.quiz.create.mock.calls[0][0].data.questionsJson;

      prisma.quiz.findUnique.mockResolvedValue({
        id: 77,
        userId: 1,
        status: 'generated',
        questionsJson: snapshot,
      });
      // Trả lời đúng hết -> điểm phải bằng số câu, và điểm do SERVER tính.
      const dung = snapshot.map((q) => q.correct);
      const kq = await service.submitQuiz(1, 77, dung);
      expect(kq.score).toBe(snapshot.length);

      prisma.quiz.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.submitQuiz(1, 77, dung)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  it('getQuiz của người khác -> 404 (không tiết lộ quiz tồn tại)', async () => {
    prisma.quiz.findUnique.mockResolvedValue({
      id: 9,
      userId: 999,
      status: 'generated',
      questionsJson: SNAPSHOT,
    });
    await expect(service.getQuiz(1, 9)).rejects.toThrow(NotFoundException);
  });
});
