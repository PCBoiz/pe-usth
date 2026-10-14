import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuizzesService } from './quizzes.service';

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
    questionsJson: SavedQuestion[];
  };
};

/** Đối số `prisma.lesson.findMany({ where: { id: { in } } })`. */
type LessonFindManyArg = {
  where: { id: { in: number[] } };
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
  lessonProgress: { findMany: AsyncMock };
  lesson: { findMany: AsyncMock<[LessonFindManyArg]> };
  quiz: {
    create: AsyncMock<[QuizCreateArg]>;
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

  beforeEach(async () => {
    prisma = {
      lessonProgress: { findMany: asyncMock() },
      lesson: { findMany: asyncMock<[LessonFindManyArg]>() },
      quiz: {
        create: asyncMock<[QuizCreateArg]>(),
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
      providers: [QuizzesService, { provide: PrismaService, useValue: prisma }],
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
