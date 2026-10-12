import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { CoursesService } from './courses.service';

/**
 * Cột courses.is_published có từ đầu nhưng chưa từng được dùng để lọc, nên khoá
 * nháp (python_advanced seed với is_published = false) vẫn hiện trên trang khám
 * phá và ai cũng đăng ký được. Bộ test này khoá lại ba hành vi:
 *   1. học viên thường KHÔNG thấy / KHÔNG ghi danh được khoá chưa phát hành,
 *   2. quản trị viên thì được (xem trước bản nháp),
 *   3. học viên ĐÃ ghi danh trước khi khoá bị ẩn vẫn học tiếp bình thường.
 */
const NHAP = {
  id: 'python_advanced',
  title: 'Python nâng cao',
  level: 'advanced',
  rating: 0,
  lessonCount: 10,
  xp_reward: 100,
  isPublished: false,
  language: 'python',
  accentColor: '#3B82F6',
  contentMeta: {},
};

const DA_PHAT_HANH = { ...NHAP, id: 'python', isPublished: true };

describe('CoursesService — cổng is_published', () => {
  let service: CoursesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'user' }) },
      course: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
      enrollment: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      lesson: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      lessonProgress: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    const mod = await Test.createTestingModule({
      providers: [CoursesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(CoursesService);
  });

  const lamAdmin = () =>
    prisma.user.findUnique.mockResolvedValue({ role: 'admin' });

  /** Điều kiện WHERE mà listCourses()/getCoursesEnrolled() thực sự gửi xuống DB. */
  const whereDaGui = (call = 0) =>
    prisma.course.findMany.mock.calls[call][0]?.where;

  // ---------- 1. Danh sách khám phá ----------
  describe('listCourses', () => {
    it('học viên thường: truy vấn BẮT BUỘC có is_published = true', async () => {
      prisma.course.findMany.mockResolvedValue([DA_PHAT_HANH]);

      const res: any = await service.listCourses(1);

      expect(whereDaGui().AND).toContainEqual({ isPublished: true });
      expect(res.courses.map((c: any) => c.id)).toEqual(['python']);
    });

    it('học viên thường + filter/search: điều kiện publish không bị filter ghi đè', async () => {
      await service.listCourses(1, 'python', 'advanced', 'python');

      expect(whereDaGui().AND).toContainEqual({ isPublished: true });
      // Các mệnh đề search/level/language vẫn còn nguyên bên cạnh.
      expect(whereDaGui().AND.length).toBe(4);
    });

    it('quản trị viên: KHÔNG lọc publish, thấy cả khoá nháp', async () => {
      lamAdmin();
      prisma.course.findMany.mockResolvedValue([DA_PHAT_HANH, NHAP]);

      const res: any = await service.listCourses(9);

      expect(JSON.stringify(whereDaGui() ?? {})).not.toContain('isPublished');
      expect(res.courses.map((c: any) => c.id)).toEqual([
        'python',
        'python_advanced',
      ]);
    });
  });

  // ---------- 2. Ghi danh mới ----------
  describe('enroll', () => {
    it('học viên thường vào khoá chưa phát hành -> 403, KHÔNG tạo enrollment', async () => {
      prisma.course.findUnique.mockResolvedValue(NHAP);

      await expect(service.enroll(1, 'python_advanced')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.enrollment.createMany).not.toHaveBeenCalled();
    });

    it('học viên thường vào khoá đã phát hành -> ghi danh bình thường', async () => {
      prisma.course.findUnique.mockResolvedValue(DA_PHAT_HANH);

      const res: any = await service.enroll(1, 'python');

      expect(res.ok).toBe(true);
      expect(prisma.enrollment.createMany).toHaveBeenCalled();
    });

    it('quản trị viên vào khoá chưa phát hành -> được ghi danh để xem trước', async () => {
      lamAdmin();
      prisma.course.findUnique.mockResolvedValue(NHAP);

      const res: any = await service.enroll(9, 'python_advanced');

      expect(res.ok).toBe(true);
      expect(prisma.enrollment.createMany).toHaveBeenCalled();
    });

    it('học viên ĐÃ ghi danh trước khi khoá bị ẩn -> vẫn đồng bộ được tiến độ', async () => {
      prisma.course.findUnique.mockResolvedValue(NHAP);
      prisma.enrollment.findUnique.mockResolvedValue({ userId: 1 });
      prisma.lessonProgress.count.mockResolvedValue(3);

      const res: any = await service.enroll(1, 'python_advanced');

      expect(res).toEqual({ ok: true, completedLessons: 3, progress: 30 });
      expect(prisma.enrollment.updateMany).toHaveBeenCalled();
    });
  });

  // ---------- 3. Người đang học không bị mất khoá ----------
  describe('học viên đang học khoá bị ẩn', () => {
    const DONG_GHI_DANH = {
      courseId: 'python_advanced',
      progress: 30,
      completedLessons: 3,
      status: 'in_progress',
      timeSpent: '2h',
      enrolledAt: new Date(),
      course: NHAP,
    };

    it('getEnrolled: không lọc is_published, khoá bị ẩn vẫn nằm trong danh sách', async () => {
      prisma.enrollment.findMany.mockResolvedValue([DONG_GHI_DANH]);

      const res: any = await service.getEnrolled(1);

      expect(res.enrolled.map((e: any) => e.id)).toEqual(['python_advanced']);
      // Truy vấn chỉ ràng buộc theo userId — không có mệnh đề publish nào.
      const where = prisma.enrollment.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ userId: 1 });
    });

    it('getCoursesEnrolled: catalog giữ lại đúng khoá user đã ghi danh', async () => {
      prisma.course.findMany.mockResolvedValue([DA_PHAT_HANH, NHAP]);
      prisma.enrollment.findMany.mockResolvedValue([DONG_GHI_DANH]);

      const res: any = await service.getCoursesEnrolled(1);

      expect(whereDaGui()).toEqual({
        OR: [{ isPublished: true }, { enrollments: { some: { userId: 1 } } }],
      });
      expect(res.enrolled.map((e: any) => e.id)).toEqual(['python_advanced']);
      expect(
        res.courses.find((c: any) => c.id === 'python_advanced').enrolled,
      ).toBe(true);
    });

    it('getCoursesEnrolled của quản trị viên: không lọc gì', async () => {
      lamAdmin();
      await service.getCoursesEnrolled(9);
      expect(whereDaGui()).toBeUndefined();
    });
  });

  // ---------- 4. Bảng kỹ năng cũng là một đường khám phá ----------
  describe('getSkills', () => {
    const MODULES = [
      { id: 1, courseId: 'python', module: 'Cơ bản', sortOrder: 1 },
      { id: 2, courseId: 'python_advanced', module: 'Decorator', sortOrder: 1 },
    ];

    it('học viên thường: module của khoá nháp không bị lộ', async () => {
      prisma.lesson.findMany.mockResolvedValue(MODULES);
      prisma.course.findMany.mockResolvedValue([{ id: 'python' }]);

      const res: any = await service.getSkills(1);

      expect(res.skills.map((s: any) => s.courseId)).toEqual(['python']);
      expect(JSON.stringify(res)).not.toContain('Decorator');
    });

    it('học viên đã ghi danh khoá bị ẩn: kỹ năng của khoá đó vẫn còn', async () => {
      prisma.lesson.findMany.mockResolvedValue(MODULES);
      // Truy vấn publish-OR-đã-ghi-danh trả về cả khoá bị ẩn.
      prisma.course.findMany.mockResolvedValue([
        { id: 'python' },
        { id: 'python_advanced' },
      ]);
      prisma.lessonProgress.findMany.mockResolvedValue([{ lessonId: 2 }]);

      const res: any = await service.getSkills(1);

      const nangCao = res.skills.find(
        (s: any) => s.courseId === 'python_advanced',
      );
      expect(nangCao.progress).toBe(100);
    });

    it('quản trị viên: thấy hết, không cần truy vấn lọc khoá', async () => {
      lamAdmin();
      prisma.lesson.findMany.mockResolvedValue(MODULES);

      const res: any = await service.getSkills(9);

      expect(res.skills.map((s: any) => s.courseId)).toEqual([
        'python',
        'python_advanced',
      ]);
      expect(prisma.course.findMany).not.toHaveBeenCalled();
    });
  });
});
