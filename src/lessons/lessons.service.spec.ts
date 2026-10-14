import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { StreakService } from 'src/common/streak/streak.service';
import { AchievementsService } from 'src/achievements/achievements.service';
import { CoursesService } from 'src/courses/courses.service';
import { LessonsService, scaledXp } from './lessons.service';

/**
 * Một hàm Prisma giả. `Promise<unknown>` cho giá trị TRẢ VỀ là đủ (mỗi ca tự
 * `mockResolvedValue()` hình dạng nó cần); phần ĐỐI SỐ mới là chỗ cần kiểu thật
 * vì test đọc lại `mock.calls` để chứng minh "XP do SERVER quyết".
 *
 * Trước đây `prisma` khai `any`: `mock.calls[0][0].data.xp.increment` cũng là
 * `any`, nên gõ sai đường dẫn (`.data.xp.inc`) vẫn biên dịch được và chỉ so
 * `undefined` với 50 — test đỏ ở chỗ khó hiểu, hoặc tệ hơn là xanh vô nghĩa.
 */
type AsyncMock<A extends unknown[] = unknown[]> = jest.Mock<
  Promise<unknown>,
  A
>;

const asyncMock = <A extends unknown[] = unknown[]>(): AsyncMock<A> =>
  jest.fn<Promise<unknown>, A>();

/** Đối số `prisma.user.update()` ở nhánh cộng XP. */
type UserUpdateArg = {
  data: { xp: { increment: number } };
};

type PrismaMock = {
  course: { findUnique: AsyncMock };
  enrollment: { findUnique: AsyncMock };
  lesson: { findFirst: AsyncMock; create: AsyncMock };
  lessonProgress: {
    createMany: AsyncMock;
    updateMany: AsyncMock;
    count: AsyncMock;
  };
  user: { findUnique: AsyncMock; update: AsyncMock<[UserUpdateArg]> };
  userDailyXpLog: {
    findFirst: AsyncMock;
    create: AsyncMock;
    update: AsyncMock;
  };
  $transaction: AsyncMock<[(tx: PrismaMock) => Promise<unknown>]>;
};

/** Chỉ hàm của CoursesService mà completeLesson() gọi tới. */
type CoursesMock = { recomputeProgress: AsyncMock };

describe('LessonsService.completeLesson', () => {
  let service: LessonsService;
  let prisma: PrismaMock;
  let courses: CoursesMock;

  beforeEach(async () => {
    prisma = {
      course: { findUnique: asyncMock() },
      enrollment: { findUnique: asyncMock() },
      lesson: { findFirst: asyncMock(), create: asyncMock() },
      lessonProgress: {
        createMany: asyncMock().mockResolvedValue({ count: 1 }),
        updateMany: asyncMock().mockResolvedValue({ count: 0 }),
        count: asyncMock().mockResolvedValue(1),
      },
      user: {
        findUnique: asyncMock().mockResolvedValue({
          streak: 0,
          lastStudyDate: null,
        }),
        update: asyncMock<[UserUpdateArg]>().mockResolvedValue({}),
      },
      userDailyXpLog: {
        findFirst: asyncMock().mockResolvedValue(null),
        create: asyncMock().mockResolvedValue({}),
        update: asyncMock().mockResolvedValue({}),
      },
      $transaction: jest.fn<
        Promise<unknown>,
        [(tx: PrismaMock) => Promise<unknown>]
      >((cb) => cb(prisma)),
    };

    courses = {
      recomputeProgress: asyncMock().mockResolvedValue({
        completedLessons: 1,
        progress: 5,
      }),
    };

    const mod = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: StreakService,
          useValue: { computeNewStreak: jest.fn().mockReturnValue(1) },
        },
        {
          provide: AchievementsService,
          useValue: {
            checkAndAwardAchievements: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: CoursesService, useValue: courses },
      ],
    }).compile();
    service = mod.get(LessonsService);
  });

  const COURSE = { id: 'python', lessonCount: 20 };

  // ---------- BB2-7 ----------
  describe('BẮT BUỘC ghi danh trước khi hoàn thành bài (chặn farm XP)', () => {
    it('CHƯA ghi danh -> 403 và KHÔNG cộng XP/streak, KHÔNG ghi tiến độ', async () => {
      prisma.course.findUnique.mockResolvedValue(COURSE);
      prisma.enrollment.findUnique.mockResolvedValue(null); // chưa đăng ký

      await expect(
        service.completeLesson(1, 1, { courseId: 'python' }),
      ).rejects.toThrow(ForbiddenException);

      // Không được chạm tới bất kỳ đường ghi nào.
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.lessonProgress.createMany).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.userDailyXpLog.create).not.toHaveBeenCalled();
    });

    it('ĐÃ ghi danh -> chạy bình thường, có cộng XP', async () => {
      prisma.course.findUnique.mockResolvedValue(COURSE);
      prisma.enrollment.findUnique.mockResolvedValue({
        userId: 1,
        courseId: 'python',
      });
      prisma.lesson.findFirst.mockResolvedValue({ id: 10, xpReward: 0 });

      const res = await service.completeLesson(1, 1, { courseId: 'python' });

      expect(res.ok).toBe(true);
      expect(res.xpGained).toBeGreaterThan(0);
      expect(prisma.user.update).toHaveBeenCalled();
      // XP cộng phải là giá trị SERVER quyết định, không theo client gửi lên
      const xpArg = prisma.user.update.mock.calls[0][0].data.xp.increment;
      expect(xpArg).toBe(50); // DEFAULT_XP khi lesson.xpReward = 0
    });

    it('client gửi xpEarned rất lớn -> vẫn chỉ cộng theo server', async () => {
      prisma.course.findUnique.mockResolvedValue(COURSE);
      prisma.enrollment.findUnique.mockResolvedValue({
        userId: 1,
        courseId: 'python',
      });
      prisma.lesson.findFirst.mockResolvedValue({ id: 10, xpReward: 0 });

      await service.completeLesson(1, 1, {
        courseId: 'python',
        xpEarned: 999999,
      });

      expect(prisma.user.update.mock.calls[0][0].data.xp.increment).toBe(50);
    });
  });

  // Các chốt chặn có sẵn phải còn nguyên sau khi thêm kiểm tra ghi danh —
  // và phải chặn TRƯỚC khi kiểm tra ghi danh hoặc ngay sau, miễn là vẫn chặn.
  describe('các chốt chặn khác vẫn giữ nguyên', () => {
    it('thiếu courseId -> 400', async () => {
      await expect(service.completeLesson(1, 1, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('khoá học không tồn tại -> 404', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(
        service.completeLesson(1, 1, { courseId: 'khong-co' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lessonNo vượt số bài của khoá -> 400, không tạo bài rác', async () => {
      prisma.course.findUnique.mockResolvedValue(COURSE);
      prisma.enrollment.findUnique.mockResolvedValue({
        userId: 1,
        courseId: 'python',
      });

      await expect(
        service.completeLesson(1, 999999, { courseId: 'python' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.lesson.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('khoá lessonCount = 0 -> chặn MỌI lessonNo, không còn farm XP vô hạn', async () => {
      // Khoá mới tạo mặc định 0 bài; guard cũ (lessonCount > 0 && ...) cho qua
      // hết nên gọi N=1,2,3,... là tự tạo bài rác + cộng 50 XP mỗi lần.
      prisma.course.findUnique.mockResolvedValue({ id: 'moi', lessonCount: 0 });
      prisma.enrollment.findUnique.mockResolvedValue({
        userId: 1,
        courseId: 'moi',
      });

      await expect(
        service.completeLesson(1, 1, { courseId: 'moi' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.lesson.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});

describe('scaledXp — XP theo chất lượng làm bài (khoá Python Advanced)', () => {
  it('không gửi điểm thì nhận đủ xp_reward', () => {
    expect(scaledXp(20, undefined)).toBe(20);
  });

  it('chia trong khung 50–100% theo % màn đúng ngay lần đầu', () => {
    expect(scaledXp(20, 100)).toBe(20);
    expect(scaledXp(20, 50)).toBe(15);
    expect(scaledXp(20, 0)).toBe(10);
  });

  it('client gửi điểm vượt khung cũng không vượt xp_reward', () => {
    expect(scaledXp(20, 1000)).toBe(20);
    expect(scaledXp(20, -50)).toBe(10);
    expect(scaledXp(20, Number.NaN)).toBe(20);
  });
});
