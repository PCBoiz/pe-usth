import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { REFRESH_COOKIE } from './refresh-cookie';
import { RefreshTokenService } from './refresh-token.service';

// Hợp đồng `refreshExpiresIn`: máy chủ phải NÓI RA hạn phiên, vì frontend không
// đọc được cookie httpOnly `pe_refresh` nên cách duy nhất còn lại là đoán.
//
// VÌ SAO CÓ FILE NÀY — đo trên production ngày 25/10/2026, đọc nguyên văn
// response header của POST https://api.programmingedu.io.vn/auth/refresh:
//
//   set-cookie: pe_refresh=…; Max-Age=86400; Path=/auth; HttpOnly; Secure; SameSite=Lax
//
// tức 24 GIỜ (production đặt JWT_REFRESH_EXPIRES=24h), trong khi frontend ghi
// cứng `max-age=28800` — 8 giờ — ở BỐN chỗ. Lệch 3 lần, và hệ quả thấy được:
// từ giờ thứ 8 tới giờ thứ 24 phiên vẫn sống nhưng cookie mốc `pe_has_session`
// đã hết, nên trang công khai hiện "chưa đăng nhập" và badge "Tiếp tục ở bài X"
// biến mất dù tiến độ còn nguyên.
//
// Không ca nào trong 390 ca trước đó chạm tới con số này — đó là lý do nó lệch
// được suốt mà vẫn xanh.
describe('hợp đồng refreshExpiresIn của /auth/*', () => {
  /** Response giả, chỉ nhớ lại cookie đã đặt. */
  function resGia() {
    const cookies: Array<{
      ten: string;
      gtri: string;
      opts: Record<string, unknown>;
    }> = [];
    return {
      cookies,
      cookie(ten: string, gtri: string, opts: Record<string, unknown>) {
        cookies.push({ ten, gtri, opts });
      },
    };
  }

  /**
   * `email` quyết định hạn, vì hạn nay khác nhau theo LOẠI TÀI KHOẢN: khách
   * `@guest.local` được cửa sổ dài (đợt thử nghiệm không bắt đăng nhập nên
   * refresh token là thứ duy nhất giữ tiến độ), tài khoản thật thì không.
   * Mặc định để email KHÔNG phải khách, để các ca cũ vẫn nói về đúng
   * `JWT_REFRESH_EXPIRES` như trước.
   *
   * Mock `authService.guest()` phải tự tính `refreshExpiresInMs` bằng chính
   * `lifetimeMsFor` của service thật — AuthService là chỗ quyết hạn trong sản
   * phẩm, còn controller chỉ chuyển tiếp. Trả cứng một số ở đây là mock khẳng
   * định hộ cái đang cần chứng minh.
   */
  function dungController(
    refreshExpires: string | undefined,
    email = 'that@example.com',
    guestRefreshExpires: string | undefined = '30d',
  ) {
    const config = new ConfigService({
      jwt: { refreshExpires, guestRefreshExpires },
    });
    const refreshTokens = new RefreshTokenService({} as never, config);
    const authService = {
      guest: jest.fn(() =>
        Promise.resolve({
          ok: true,
          access: 'A',
          refresh: 'R',
          refreshExpiresInMs: refreshTokens.lifetimeMsFor(email),
        }),
      ),
    };
    const controller = new AuthController(
      authService as never,
      config,
      refreshTokens,
    );
    return { controller, refreshTokens };
  }

  it('nói ra hạn THẬT theo giây, khớp cookie nó vừa đặt — ca bắt lỗi', async () => {
    const { controller, refreshTokens } = dungController('24h');
    const res = resGia();
    const body = (await controller.guest(res as never)) as {
      refreshExpiresIn?: number;
    };

    expect(body.refreshExpiresIn).toBe(86_400);
    // Và phải là CÙNG một con số với cookie: hai nguồn lệch nhau thì frontend
    // tin một đằng, trình duyệt xoá cookie một nẻo.
    const cookie = res.cookies.find((c) => c.ten === REFRESH_COOKIE);
    expect(cookie).toBeDefined();
    expect(cookie?.opts.maxAge).toBe(refreshTokens.lifetimeMs);
    expect(body.refreshExpiresIn).toBe(
      Math.floor(Number(cookie?.opts.maxAge) / 1000),
    );
  });

  it('đổi JWT_REFRESH_EXPIRES là con số gửi ra đổi theo', async () => {
    // Đây mới là điểm của bản sửa: client không phải sửa thêm chỗ nào.
    for (const [cauHinh, giay] of [
      ['8h', 28_800],
      ['24h', 86_400],
      ['30d', 2_592_000],
      ['45m', 2_700],
    ] as const) {
      const { controller } = dungController(cauHinh);
      const body = (await controller.guest(resGia() as never)) as {
        refreshExpiresIn?: number;
      };
      expect(body.refreshExpiresIn).toBe(giay);
    }
  });

  it('cấu hình rác thì về mặc định 8h, không phải NaN', async () => {
    // `refreshExpiresIn: NaN` đi qua JSON.stringify thành `null`, và phía client
    // `max-age=null` làm cookie thành cookie-phiên — mất mốc ngay khi đóng tab.
    for (const rac of [undefined, '', 'tám tiếng', '8 giờ', '8hh']) {
      const { controller } = dungController(rac);
      const body = (await controller.guest(resGia() as never)) as {
        refreshExpiresIn?: number;
      };
      expect(body.refreshExpiresIn).toBe(28_800);
    }
  });

  it('khách được cửa sổ DÀI, tài khoản thật thì không — ca bắt lỗi', async () => {
    // Đây là chỗ dễ sửa nửa vời nhất: tính đúng hạn khách ở AuthService nhưng
    // controller vẫn đặt cookie bằng hằng `lifetimeMs`. Khi đó body nói 30
    // ngày, cookie chết sau 8 giờ, và người thử mất tiến độ đúng như trước —
    // chỉ khác là lần này API khẳng định ngược lại.
    const khach = dungController('8h', 'abc123@guest.local');
    const resK = resGia();
    const bodyK = (await khach.controller.guest(resK as never)) as {
      refreshExpiresIn?: number;
    };
    expect(bodyK.refreshExpiresIn).toBe(2_592_000);
    expect(
      resK.cookies.find((c) => c.ten === REFRESH_COOKIE)?.opts.maxAge,
    ).toBe(khach.refreshTokens.guestLifetimeMs);

    const that = dungController('8h', 'admin@example.com');
    const resT = resGia();
    const bodyT = (await that.controller.guest(resT as never)) as {
      refreshExpiresIn?: number;
    };
    expect(bodyT.refreshExpiresIn).toBe(28_800);
    expect(
      resT.cookies.find((c) => c.ten === REFRESH_COOKIE)?.opts.maxAge,
    ).toBe(that.refreshTokens.lifetimeMs);
  });

  it('JWT_GUEST_REFRESH_EXPIRES rác thì về mặc định 30 ngày, không về 8 giờ', async () => {
    // Hướng lệch KHÔNG đối xứng (AGENTS.md, bẫy hạn dự phòng): đoán NGẮN hơn
    // hạn thật chỉ mất cái badge; ở đây đoán ngắn nghĩa là khách mất tiến độ,
    // tức đúng lỗi đang sửa quay lại qua đường cấu hình gõ sai.
    for (const rac of [undefined, '', 'ba mươi ngày', '30 ngày', '30dd']) {
      const { controller } = dungController('8h', 'x@guest.local', rac);
      const body = (await controller.guest(resGia() as never)) as {
        refreshExpiresIn?: number;
      };
      expect(body.refreshExpiresIn).toBe(2_592_000);
    }
  });

  it('KHÔNG để refresh token lọt vào body', async () => {
    // Lý do `moveRefreshToCookie` tồn tại; thêm field mới không được phá nó.
    const { controller } = dungController('24h');
    const body = (await controller.guest(resGia() as never)) as Record<
      string,
      unknown
    >;
    expect(body).not.toHaveProperty('refresh');
    // `refreshExpiresInMs` là chi tiết nội bộ (milliseconds): hợp đồng ra ngoài
    // là `refreshExpiresIn` tính GIÂY. Để lọt cả hai thì client sớm muộn đọc
    // nhầm đơn vị — lệch 1000 lần, theo chiều NỚI hạn, đúng chiều nguy hiểm.
    expect(body).not.toHaveProperty('refreshExpiresInMs');
    expect(body.access).toBe('A');
  });
});
