import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CachedUserService } from 'src/auth/cached-user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from './user.service';

/**
 * `let prisma: any` cũ làm cả bộ test này mất kiểm tra kiểu. Hai hậu quả thật:
 * gõ sai tên bảng/hàm (`prisma.usr.findUnique`) vẫn biên dịch, và ca
 * "getProfile không bao giờ trả field password" đọc `res.needs_questionnaire`
 * trên một `any` — đổi tên field ở service thì ca test vẫn xanh.
 * Cùng khuôn `courses/courses.service.spec.ts`.
 */
type AsyncMock<A extends unknown[] = unknown[]> = jest.Mock<
  Promise<unknown>,
  A
>;

const asyncMock = <A extends unknown[] = unknown[]>(): AsyncMock<A> =>
  jest.fn<Promise<unknown>, A>();

/**
 * Đối số của các lời gọi mà bộ test này đọc lại qua `mock.calls` — phần where
 * phải có kiểu thật vì ca "chặn email đã thuộc về NGƯỜI KHÁC" chứng minh mình
 * bằng chính mệnh đề `id: { not: userId }` trong đó.
 */
type TruyVan = { where?: Record<string, unknown>; data?: unknown };

/** Chỉ bảng/hàm mà UserService thật sự gọi. */
type PrismaMock = {
  user: {
    findUnique: AsyncMock<[TruyVan]>;
    findFirst: AsyncMock<[TruyVan]>;
    update: AsyncMock<[TruyVan]>;
  };
  userFollow: {
    findUnique: AsyncMock<[TruyVan]>;
    create: AsyncMock<[TruyVan]>;
    deleteMany: AsyncMock<[TruyVan]>;
    findMany: AsyncMock<[TruyVan]>;
  };
};

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaMock;
  let cachedUsers: { invalidate: jest.Mock<void, [number]> };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: asyncMock<[TruyVan]>(),
        findFirst: asyncMock<[TruyVan]>(),
        update: asyncMock<[TruyVan]>(),
      },
      userFollow: {
        findUnique: asyncMock<[TruyVan]>(),
        create: asyncMock<[TruyVan]>(),
        deleteMany: asyncMock<[TruyVan]>(),
        findMany: asyncMock<[TruyVan]>(),
      },
    };
    cachedUsers = { invalidate: jest.fn<void, [number]>() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: CachedUserService, useValue: cachedUsers },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getProfile không bao giờ trả field password ra ngoài', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'A',
      password: 'scrypt:32768:8:1$salt$hash',
      questionnaireCompleted: false,
    });

    // KHÔNG khai `: any`: `getProfile` để TS tự suy return type, nên chính
    // dòng `const res: any` cũ mới là chỗ tạo ra `any`. Bỏ nó đi thì
    // `res.needs_questionnaire` được tsc kiểm theo kiểu thật của service.
    const res = await service.getProfile(1);
    expect(res).not.toHaveProperty('password');
    expect(res.needs_questionnaire).toBe(true);
  });

  it('updateProfile chặn email đã thuộc về NGƯỜI KHÁC', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 999 });

    await expect(
      service.updateProfile(1, { email: 'taken@x.com' }),
    ).rejects.toThrow(BadRequestException);

    // Điều kiện loại trừ chính mình phải có mặt, nếu không user tự submit lại
    // email của chính mình cũng bị chặn nhầm.
    //
    // Hai khẳng định, KHÔNG dùng `!`: `where` có thể thiếu là một khả năng thật
    // mà `any` đang che. Nếu service ngừng gửi `where` thì thứ vừa mất là CÁI
    // CỔNG lọc — `!` sẽ ném TypeError vô nghĩa ở dòng dưới thay vì nói ra điều
    // đó.
    const where = prisma.user.findFirst.mock.calls[0][0].where;
    expect(where).toBeDefined();
    expect(where?.id).toEqual({ not: 1 });
  });

  it('followUser từ chối tự theo dõi chính mình', async () => {
    await expect(service.followUser(7, 7)).rejects.toThrow(BadRequestException);
    expect(prisma.userFollow.create).not.toHaveBeenCalled();
  });

  it('followUser bỏ qua (không lỗi) khi đã follow trước đó', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 2 });
    prisma.userFollow.findUnique.mockResolvedValue({
      followerId: 1,
      followeeId: 2,
    });

    await expect(service.followUser(1, 2)).resolves.toEqual({ ok: true });
    expect(prisma.userFollow.create).not.toHaveBeenCalled();
  });
});
