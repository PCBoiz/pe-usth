import { createHash, randomBytes, randomUUID } from 'crypto';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

/** Parse chuỗi kiểu '8h' / '30m' / '7d' / '45s' → milliseconds. */
function parseDuration(value: string | undefined, fallbackMs: number): number {
  if (!value) return fallbackMs;
  const m = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(value.trim());
  if (!m) return fallbackMs;
  const n = Number(m[1]);
  switch (m[2].toLowerCase()) {
    case 'ms':
      return n;
    case 's':
      return n * 1000;
    case 'm':
      return n * 60_000;
    case 'h':
      return n * 3_600_000;
    case 'd':
      return n * 86_400_000;
    default:
      return fallbackMs;
  }
}

/**
 * Token đã bị rotate trong khoảng này mà bị gửi lại thì coi là race hợp lệ
 * (2 tab cùng refresh bằng một cookie) — chỉ trả 401, KHÔNG thu hồi cả family.
 * Quá khoảng này mới coi là token bị đánh cắp và dùng lại.
 */
const REUSE_GRACE_MS = 30_000;

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export interface RotatedRefreshToken {
  userId: number;
  refreshToken: string;
  /** Hạn THẬT của token vừa cấp. Đi kèm để chỗ gọi không phải đoán lại. */
  refreshExpiresInMs: number;
}

/**
 * Đuôi email của tài khoản khách. Khai ở đây vì `lifetimeMsFor` bên dưới là
 * chỗ DUY NHẤT phân biệt khách với tài khoản thật; `auth.service.ts` import
 * lại để dựng email, nên hai nơi không thể lệch nhau.
 */
export const HAU_TO_KHACH = '@guest.local';

@Injectable()
export class RefreshTokenService implements OnModuleInit, OnModuleDestroy {
  /** Hạn cho TÀI KHOẢN THẬT, đọc từ JWT_REFRESH_EXPIRES (mặc định 8h). */
  readonly lifetimeMs: number;

  /**
   * Hạn cho TÀI KHOẢN KHÁCH, đọc từ JWT_GUEST_REFRESH_EXPIRES (mặc định 30d).
   *
   * VÌ SAO TÁCH LÀM HAI. Đợt thử nghiệm cố ý KHÔNG bắt đăng nhập, nên với
   * người thử, refresh token CHÍNH LÀ thứ duy nhất giữ tiến độ của họ: hết hạn
   * là `apiFetch` rơi xuống `ensureGuest()` và cấp một tài khoản mới tinh —
   * họ thấy như mất sạch. Với hạn 24 giờ thì ai quay lại hôm sau cũng mất.
   *
   * Nhưng nâng hạn CHUNG lên 30 ngày thì kéo theo cả quản trị viên và tài
   * khoản từ bản Django, tức nới cửa sổ dùng được của một cookie bị đánh cắp
   * cho đúng những tài khoản có gì để mất. Tài khoản khách thì không: không
   * mật khẩu (không đăng nhập lại được bằng cách nào khác), không thông tin cá
   * nhân, chỉ có tiến độ bài học.
   */
  readonly guestLifetimeMs: number;

  private readonly logger = new Logger(RefreshTokenService.name);
  private pruneTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.lifetimeMs = parseDuration(
      config.get<string>('jwt.refreshExpires'),
      8 * 3_600_000,
    );
    this.guestLifetimeMs = parseDuration(
      config.get<string>('jwt.guestRefreshExpires'),
      30 * 24 * 3_600_000,
    );
  }

  /**
   * Hạn áp cho CHỦ của email này. Hàm thuần, không truy vấn — chỗ gọi đều đã
   * có sẵn email trong tay nên không được phép tốn thêm một vòng DB ở đây.
   */
  lifetimeMsFor(email: string | null | undefined): number {
    return email?.toLowerCase().endsWith(HAU_TO_KHACH)
      ? this.guestLifetimeMs
      : this.lifetimeMs;
  }

  /**
   * familyId nối các token sinh ra từ cùng một lần đăng nhập. Mỗi lần rotate
   * token mới kế thừa familyId của token cũ — nhờ đó khi phát hiện dùng lại
   * token đã thu hồi có thể thu hồi TOÀN BỘ chuỗi phiên đó.
   */
  async issue(
    userId: number,
    familyId: string = randomUUID(),
    lifetimeMs: number = this.lifetimeMs,
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + lifetimeMs);

    await this.prisma.authSession.create({
      data: {
        userId,
        token: hashToken(rawToken),
        familyId,
        expiresAt,
      },
    });

    return rawToken;
  }

  /**
   * Trả về CẢ userId (không chỉ token mới) vì AuthService.refresh() cần userId
   * để ký access token mới mà không phải tra DB thêm lần nữa.
   *
   * Chống race: bước revoke dùng updateMany có điều kiện `revokedAt: null` như
   * một compare-and-set nguyên tử — 2 request refresh cùng lúc với CÙNG token
   * thì chỉ đúng 1 request thắng (count=1), request kia nhận 401 thay vì cả 2
   * cùng được cấp cặp token mới.
   *
   * Chống dùng lại token bị đánh cắp: token đã bị thu hồi từ lâu hơn
   * REUSE_GRACE_MS mà vẫn được gửi lên nghĩa là có HAI bên cùng giữ chuỗi
   * token này (người dùng và kẻ tấn công) -> thu hồi cả family, cả hai đều
   * phải đăng nhập lại. Không làm vậy thì ai refresh trước sẽ giữ phiên mãi.
   */
  async rotateAndBlacklist(oldToken: string): Promise<RotatedRefreshToken> {
    const session = await this.prisma.authSession.findFirst({
      where: { token: hashToken(oldToken) },
      // Lấy email TRONG CHÍNH truy vấn này, không phải một vòng DB nữa:
      // `lifetimeMsFor` cần nó để biết đây là khách hay tài khoản thật, và
      // đây là đường nóng — mỗi lần refresh của mọi người đều đi qua đây.
      include: { user: { select: { email: true } } },
    });

    if (!session) {
      throw new UnauthorizedException();
    }

    if (session.revokedAt) {
      const revokedAgoMs = Date.now() - session.revokedAt.getTime();
      if (revokedAgoMs > REUSE_GRACE_MS) {
        await this.revokeFamily(session.id, session.familyId);
        this.logger.warn(
          `Phát hiện dùng lại refresh token đã thu hồi (user ${session.userId}) — đã thu hồi cả chuỗi phiên`,
        );
      }
      throw new UnauthorizedException();
    }

    if (!session.expiresAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException();
    }

    const revoked = await this.prisma.authSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count === 0) {
      // Token vừa bị request song song khác rotate — race hợp lệ, chỉ từ chối.
      throw new UnauthorizedException();
    }

    // Hạn tính lại theo CHỦ tài khoản ở mỗi lần rotate, không kế thừa từ hàng
    // cũ: bảng `auth_sessions` dùng chung với bản Django nên không có cột
    // createdAt để suy ra hạn gốc, và ràng buộc "migration chỉ được THÊM"
    // trong AGENTS.md khiến việc thêm cột chỉ để lưu hạn là không đáng.
    const refreshExpiresInMs = this.lifetimeMsFor(session.user.email);

    return {
      userId: session.userId,
      refreshToken: await this.issue(
        session.userId,
        session.familyId ?? randomUUID(),
        refreshExpiresInMs,
      ),
      refreshExpiresInMs,
    };
  }

  /**
   * Thu hồi token khi logout. KHÔNG ném lỗi nếu token sai/không tồn tại —
   * theo spec: "không lỗi nếu token không hợp lệ".
   */
  async revoke(rawToken: string): Promise<void> {
    const session = await this.prisma.authSession.findFirst({
      where: { token: hashToken(rawToken) },
      select: { id: true, familyId: true },
    });
    if (session) await this.revokeFamily(session.id, session.familyId);
  }

  /**
   * Thu hồi mọi token còn hiệu lực cùng family. Phiên cũ (tạo trước khi có
   * cột family_id) không có family -> chỉ thu hồi chính nó.
   */
  private async revokeFamily(
    sessionId: number,
    familyId: string | null,
  ): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: familyId
        ? { familyId, revokedAt: null }
        : { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Chạy dọn dẹp mỗi giờ; unref() để timer không giữ process sống khi shutdown. */
  onModuleInit(): void {
    this.pruneTimer = setInterval(() => {
      this.pruneExpired()
        .then(
          (n) => n > 0 && this.logger.log(`Đã dọn ${n} phiên refresh hết hạn`),
        )
        .catch((e) => this.logger.warn(`Dọn phiên refresh thất bại: ${e}`));
    }, 3_600_000);
    this.pruneTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.pruneTimer) clearInterval(this.pruneTimer);
  }

  /**
   * Dọn phiên hết hạn/đã thu hồi quá 24h — để bảng auth_sessions không phình
   * vô hạn theo thời gian.
   */
  async pruneExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - 86_400_000);
    const res = await this.prisma.authSession.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }],
      },
    });
    return res.count;
  }
}
