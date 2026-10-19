import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RefreshTokenService } from './refresh-token.service';

/**
 * `jest.Mock` trần là `Mock<any, any>`, nên mọi phép đọc `mock.calls` dưới đây
 * mất kiểu: `stored.tokenn` vẫn biên dịch và `expect(...).not.toBe(rawToken)`
 * vẫn ĐẠT — tức ca "chỉ lưu HASH xuống DB" im lặng không kiểm gì. Bộ test này
 * sống bằng `mock.calls`, nên phần ĐỐI SỐ phải có kiểu thật; giá trị trả về để
 * `Promise<unknown>` là đủ vì mỗi ca tự `mockResolvedValue()`.
 * Cùng khuôn đã dùng ở `courses/courses.service.spec.ts`.
 */
type AsyncMock<A extends unknown[] = unknown[]> = jest.Mock<
  Promise<unknown>,
  A
>;

const asyncMock = <A extends unknown[] = unknown[]>(): AsyncMock<A> =>
  jest.fn<Promise<unknown>, A>();

/** Đúng hình dạng mà RefreshTokenService gửi xuống `authSession.create`. */
type TaoPhien = {
  data: {
    userId: number;
    token: string;
    familyId: string;
    expiresAt: Date;
  };
};

/** `findFirst` luôn tra theo HASH của token, không bao giờ theo token thô. */
type TraPhien = {
  where: { token: string };
  select?: Record<string, boolean>;
};

type ThuHoi = {
  where: Record<string, unknown>;
  data: { revokedAt: Date };
};

/** Chỉ bảng/hàm mà RefreshTokenService thật sự gọi. */
type AuthSessionMock = {
  create: AsyncMock<[TaoPhien]>;
  findFirst: AsyncMock<[TraPhien]>;
  updateMany: AsyncMock<[ThuHoi]>;
};

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let authSession: AuthSessionMock;

  beforeEach(async () => {
    authSession = {
      create: asyncMock<[TaoPhien]>().mockResolvedValue({ id: 1 }),
      findFirst: asyncMock<[TraPhien]>(),
      updateMany: asyncMock<[ThuHoi]>().mockResolvedValue({ count: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: PrismaService, useValue: { authSession } },
        { provide: ConfigService, useValue: { get: () => '8h' } },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('issue', () => {
    it('trả raw token cho client nhưng chỉ lưu HASH xuống DB', async () => {
      const rawToken = await service.issue(42);

      expect(authSession.create).toHaveBeenCalledTimes(1);
      const stored = authSession.create.mock.calls[0][0].data;

      expect(stored.userId).toBe(42);
      // Điểm dễ sai nhất: nếu lỡ lưu raw token thì dòng này fail.
      expect(stored.token).not.toBe(rawToken);
      expect(stored.token).toBe(
        createHash('sha256').update(rawToken).digest('hex'),
      );
    });

    it('đặt hạn 8 giờ kể từ lúc cấp', async () => {
      // Kẹp hai đầu bằng hai lần đọc đồng hồ, không dùng một mốc + dung sai.
      // Bản cũ so hạn với `before` chụp TRƯỚC khi gọi issue(), còn service
      // tính `Date.now() + 8h` ở BÊN TRONG: chỉ cần đồng hồ nhảy 1ms giữa hai
      // lời gọi là vượt trần (gặp thật: 28800001 > 28800000) và test đỏ ngẫu
      // nhiên dù code không sai. [before+8h, after+8h] là bất biến chính xác
      // của phép tính đó nên không cần dung sai, mà vẫn bắt được lệch TTL.
      const before = Date.now();
      await service.issue(1);
      const after = Date.now();
      const { expiresAt } = authSession.create.mock.calls[0][0].data;

      const EIGHT_HOURS = 8 * 60 * 60 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + EIGHT_HOURS);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(after + EIGHT_HOURS);
    });
  });

  describe('rotateAndBlacklist', () => {
    const live = () => ({
      id: 7,
      userId: 42,
      familyId: 'fam-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    it('tra DB bằng hash của token, không phải token thô', async () => {
      authSession.findFirst.mockResolvedValue(live());

      await service.rotateAndBlacklist('raw-token-abc');

      const where = authSession.findFirst.mock.calls[0][0].where;
      expect(where.token).toBe(
        createHash('sha256').update('raw-token-abc').digest('hex'),
      );
    });

    it('đánh dấu revokedAt cho token cũ rồi cấp token mới CÙNG family', async () => {
      authSession.findFirst.mockResolvedValue(live());

      const rotated = await service.rotateAndBlacklist('raw-token-abc');

      // CAS: điều kiện revokedAt:null bảo đảm chỉ 1 request song song thắng.
      // `expect.any()` khai kiểu trả về là `any` trong @types/jest; ép về đúng
      // kiểu của field nó so sánh để chỗ này không mở lại một lỗ `any`.
      expect(authSession.updateMany).toHaveBeenCalledWith({
        where: { id: 7, revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
      const created = authSession.create.mock.calls[0][0].data;
      expect(created.userId).toBe(42);
      expect(created.familyId).toBe('fam-1');
      expect(rotated.userId).toBe(42);
      expect(rotated.refreshToken).not.toBe('raw-token-abc');
    });

    it('ném Unauthorized và KHÔNG cấp token mới khi token không tồn tại', async () => {
      authSession.findFirst.mockResolvedValue(null);

      await expect(service.rotateAndBlacklist('token-rac')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authSession.updateMany).not.toHaveBeenCalled();
      expect(authSession.create).not.toHaveBeenCalled();
    });

    it('ném Unauthorized khi token đã hết hạn', async () => {
      authSession.findFirst.mockResolvedValue({
        ...live(),
        expiresAt: new Date(Date.now() - 1),
      });

      await expect(service.rotateAndBlacklist('raw-token-abc')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authSession.create).not.toHaveBeenCalled();
    });

    it('ném Unauthorized khi request song song đã rotate trước (count=0)', async () => {
      authSession.findFirst.mockResolvedValue(live());
      authSession.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.rotateAndBlacklist('raw-token-abc')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authSession.create).not.toHaveBeenCalled();
    });

    it('token vừa rotate trong vài giây (2 tab cùng refresh) -> 401 nhưng KHÔNG thu hồi family', async () => {
      authSession.findFirst.mockResolvedValue({
        ...live(),
        revokedAt: new Date(Date.now() - 1_000),
      });

      await expect(service.rotateAndBlacklist('raw-token-abc')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authSession.updateMany).not.toHaveBeenCalled();
    });

    it('dùng lại token đã thu hồi từ lâu -> thu hồi CẢ family', async () => {
      authSession.findFirst.mockResolvedValue({
        ...live(),
        revokedAt: new Date(Date.now() - 5 * 60_000),
      });

      await expect(service.rotateAndBlacklist('raw-token-abc')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authSession.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'fam-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
      expect(authSession.create).not.toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('logout thu hồi cả family của token', async () => {
      authSession.findFirst.mockResolvedValue({ id: 7, familyId: 'fam-1' });

      await service.revoke('raw-token-abc');

      expect(authSession.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'fam-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });

    it('phiên cũ chưa có family chỉ thu hồi chính nó', async () => {
      authSession.findFirst.mockResolvedValue({ id: 7, familyId: null });

      await service.revoke('raw-token-abc');

      expect(authSession.updateMany).toHaveBeenCalledWith({
        where: { id: 7, revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });
  });
});
