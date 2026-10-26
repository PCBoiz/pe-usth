import { ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { checkPassword } from 'src/common/security/check-password';

// Tài khoản khách cho buổi thử nghiệm: thứ phải giữ là (1) không ai đăng nhập
// được vào tài khoản khách bằng mật khẩu, (2) mỗi lần gọi là một user riêng,
// (3) tắt được bằng env.
describe('AuthService.guest', () => {
  const created: Array<Record<string, unknown>> = [];
  const prisma = {
    user: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const user = { id: created.length + 1, ...data };
        created.push(user);
        return Promise.resolve(user);
      }),
    },
  };
  const jwt = { signAsync: jest.fn(() => Promise.resolve('access-token')) };
  // `lifetimeMsFor` phải có trong mock: từ 26/10 `issueTokens` hỏi nó để biết
  // cấp hạn nào — khách 30 ngày, tài khoản thật 8 giờ.
  const GIO = 3_600_000;
  const refresh = {
    issue: jest.fn(() => Promise.resolve('refresh-token')),
    lifetimeMsFor: jest.fn((email: string) =>
      email.endsWith('@guest.local') ? 30 * 24 * GIO : 8 * GIO,
    ),
  };
  const service = new AuthService(prisma as never, jwt as never, refresh as never, {} as never);

  afterEach(() => {
    delete process.env.GUEST_LOGIN;
    created.length = 0;
  });

  it('tạo user riêng cho mỗi lần gọi, có cặp token, bỏ bảng hỏi', async () => {
    const a = await service.guest();
    const b = await service.guest();
    expect(a).toMatchObject({ ok: true, guest: true, needs_questionnaire: false, access: 'access-token', refresh: 'refresh-token' });
    expect(b.access).toBe('access-token');
    expect(created).toHaveLength(2);
    expect(created[0].email).not.toBe(created[1].email);
    expect(String(created[0].email)).toMatch(/^guest_[0-9a-f-]{36}@guest\.local$/);
    expect(created[0].questionnaireCompleted).toBe(true);
    expect(created[0].role).toBe('Học viên');
  });

  it('khách nhận hạn 30 ngày, và hạn đó đi THEO cặp token', async () => {
    // Vì sao quan trọng: đợt thử nghiệm không bắt đăng nhập, nên refresh token
    // là thứ DUY NHẤT giữ tiến độ của người thử. Hạn 24 giờ nghĩa là ai quay
    // lại hôm sau cũng nhận một tài khoản mới và thấy như mất sạch.
    const a = await service.guest();

    expect(a.refreshExpiresInMs).toBe(30 * 24 * GIO);
    // Và hạn đó phải được DÙNG để cấp token, không chỉ báo cáo suông.
    expect(refresh.issue).toHaveBeenCalledWith(
      expect.any(Number),
      undefined,
      30 * 24 * GIO,
    );
  });

  it('không thể đăng nhập vào tài khoản khách bằng mật khẩu nào', async () => {
    await service.guest();
    const stored = String(created[0].password);
    for (const guess of ['', '!', 'guest', 'admin']) {
      expect(await checkPassword(stored, guess)).toBe(false);
    }
  });

  it('GUEST_LOGIN=off thì từ chối, không tạo user', async () => {
    process.env.GUEST_LOGIN = 'off';
    await expect(service.guest()).rejects.toBeInstanceOf(ForbiddenException);
    expect(created).toHaveLength(0);
  });
});
