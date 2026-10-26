import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RefreshTokenService } from './refresh-token.service';

/**
 * Hình dạng hàng `auth_sessions` mà service GHI xuống. Chỉ phần ĐỐI SỐ cần
 * kiểu thật, vì các ca dưới đọc lại chính nó qua `mock.calls` để chứng minh
 * "token lưu xuống là HASH" và "hạn ghi vào DB bằng hạn báo ra". Giá trị trả
 * về để `Promise<unknown>` là đủ: mỗi ca tự `mockResolvedValue()`.
 *
 * `jest.Mock` trần (bản cũ) làm cả ba dòng đó thành `any`, nên gõ sai tên
 * trường — `expires_at` thay cho `expiresAt` — vẫn biên dịch và test vẫn ĐẠT
 * trong khi chẳng kiểm gì. Đúng cách dọn mà AGENTS.md đã ghi cho `quizzes` +
 * `lessons`.
 */
type DataPhien = {
  userId: number;
  token: string;
  familyId: string;
  expiresAt: Date;
};

type AsyncMock<A extends unknown[] = unknown[]> = jest.Mock<
  Promise<unknown>,
  A
>;

const asyncMock = <A extends unknown[] = unknown[]>(): AsyncMock<A> =>
  jest.fn<Promise<unknown>, A>();

type DieuKien = Record<string, unknown>;

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let authSession: {
    create: AsyncMock<[{ data: DataPhien }]>;
    findFirst: AsyncMock<[{ where: { token: string }; include?: unknown }]>;
    updateMany: AsyncMock<[{ where: DieuKien; data: DieuKien }]>;
  };

  beforeEach(async () => {
    authSession = {
      create: asyncMock<[{ data: DataPhien }]>().mockResolvedValue({ id: 1 }),
      findFirst: asyncMock<[{ where: { token: string }; include?: unknown }]>(),
      updateMany: asyncMock<
        [{ where: DieuKien; data: DieuKien }]
      >().mockResolvedValue({ count: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: PrismaService, useValue: { authSession } },
        {
          // Mock phải phân biệt KHOÁ. Bản cũ `get: () => '8h'` trả '8h' cho mọi
          // khoá nên `jwt.guestRefreshExpires` cũng thành 8 giờ — hai hạn bằng
          // nhau thì mọi ca so "khách khác tài khoản thật" đều vô nghĩa, mà
          // vẫn XANH. Đúng kiểu fixture-không-giống-thật mà AGENTS.md ghi.
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'jwt.guestRefreshExpires' ? '30d' : '8h',
          },
        },
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
    // Hàng phiên như truy vấn THẬT trả về: từ 26/10 `rotateAndBlacklist` lấy
    // kèm email của chủ tài khoản (cùng một vòng DB, qua `include`) để biết
    // cấp hạn nào — khách 30 ngày, tài khoản thật theo JWT_REFRESH_EXPIRES.
    // Fixture thiếu `user` thì hàm ném, đúng họ bẫy "fixture không giống dữ
    // liệu thật" mà AGENTS.md đã ghi.
    const live = (email = 'nguoi-that@example.com') => ({
      id: 7,
      userId: 42,
      familyId: 'fam-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { email },
    });

    it('hạn tính lại theo CHỦ tài khoản ở mỗi lần rotate — ca bắt lỗi', async () => {
      // Cửa sổ của khách là TRƯỢT: mỗi lần refresh phải cấp lại 30 ngày mới,
      // nếu không thì người thử vẫn mất tiến độ đúng 30 ngày sau lần đầu.
      // Và tài khoản thật KHÔNG được ăn theo cửa sổ dài đó.
      authSession.findFirst.mockResolvedValue(live('ai-do@guest.local'));
      const khach = await service.rotateAndBlacklist('raw');
      expect(khach.refreshExpiresInMs).toBe(service.guestLifetimeMs);

      authSession.findFirst.mockResolvedValue(live('admin@example.com'));
      const that = await service.rotateAndBlacklist('raw');
      expect(that.refreshExpiresInMs).toBe(service.lifetimeMs);
      expect(that.refreshExpiresInMs).not.toBe(khach.refreshExpiresInMs);
    });

    it('hạn được DÙNG để ghi expires_at, không chỉ báo cáo suông', async () => {
      // Trả đúng số mà ghi hàng DB bằng hạn khác thì cookie và DB lệch nhau:
      // client tưởng còn phiên, server đã từ chối.
      authSession.findFirst.mockResolvedValue(live('ai-do@guest.local'));
      const truoc = Date.now();
      await service.rotateAndBlacklist('raw');

      const ghi = authSession.create.mock.calls.at(-1)![0].data;
      const con = ghi.expiresAt.getTime() - truoc;
      // Cho sai số 5 giây vì hai mốc thời gian lấy ở hai thời điểm khác nhau.
      expect(Math.abs(con - service.guestLifetimeMs)).toBeLessThan(5_000);
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
      expect(authSession.updateMany).toHaveBeenCalledWith({
        where: { id: 7, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
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
        data: { revokedAt: expect.any(Date) },
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
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('phiên cũ chưa có family chỉ thu hồi chính nó', async () => {
      authSession.findFirst.mockResolvedValue({ id: 7, familyId: null });

      await service.revoke('raw-token-abc');

      expect(authSession.updateMany).toHaveBeenCalledWith({
        where: { id: 7, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
