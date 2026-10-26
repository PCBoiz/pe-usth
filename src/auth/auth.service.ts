import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { User } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { checkPassword } from 'src/common/security/check-password';
import { WerkzeugScryptHasher } from 'src/common/security/werkzeug-scrypt-hasher';
import { CachedUserService } from './cached-user.service';
import { LoginDto } from './dto/login.dto';
import { PHONE_REGEX, RegisterDto } from './dto/register.dto';
import { RefreshTokenService } from './refresh-token.service';

/** Khớp default của Django: backend/accounts/models.py -> role = 'Học viên'. */
const DEFAULT_ROLE = 'Học viên';

/**
 * Chuẩn hoá email về chữ thường + trim.
 * Cột users.email là text @unique (case-SENSITIVE trong Postgres), trong khi
 * Google luôn trả claim email ở dạng chữ thường. Không chuẩn hoá thì
 * 'Victim@Gmail.com' và 'victim@gmail.com' thành 2 tài khoản khác nhau.
 */
function normalizeEmail(email?: string | null): string | undefined {
  const v = email?.trim().toLowerCase();
  return v ? v : undefined;
}

export interface OAuthProfile {
  provider: string;
  providerId: string;
  email?: string;
  /** Chỉ true khi provider XÁC NHẬN email đã verify. Gate cho nhánh auto-link. */
  emailVerified?: boolean;
  name?: string;
  avatar?: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
  /**
   * Hạn THẬT của refresh token vừa cấp, tính bằng ms.
   *
   * Đi kèm vì hạn nay khác nhau giữa khách và tài khoản thật (xem
   * `RefreshTokenService.lifetimeMsFor`). Controller phải đặt cookie VÀ báo
   * `refreshExpiresIn` cho client từ CHÍNH con số này — đọc lại một hằng toàn
   * cục là tái tạo đúng lỗi lệch 8h/24h đã sửa ngày 25/10.
   */
  refreshExpiresInMs: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly cachedUsers: CachedUserService,
  ) {}

  // ---------- Task 43-45: login ----------

  async login(dto: LoginDto) {
    // Bước 1: tìm user theo email HOẶC phone.
    // Form đăng nhập chỉ có MỘT ô "Email hoặc số điện thoại" và FE gửi giá trị
    // đó vào field email. Nếu giá trị khớp định dạng SĐT thì phải tra cột phone
    // — không thì người đăng ký bằng SĐT không bao giờ đăng nhập được (email
    // của họ trong DB là placeholder '<sđt>@phone.local').
    const identifier = dto.email?.trim();
    const identifierIsPhone = !!identifier && PHONE_REGEX.test(identifier);

    const user = await this.findByEmailOrPhone(
      identifierIsPhone ? undefined : normalizeEmail(identifier),
      dto.phone?.trim() || (identifierIsPhone ? identifier : undefined),
    );

    // Bước 2: verify password. Cùng một message cho "không tìm thấy user" và
    // "sai mật khẩu" — tránh để lộ email/sđt nào đã tồn tại trong hệ thống.
    if (!user || !(await checkPassword(user.password, dto.password))) {
      throw new UnauthorizedException(
        'Email/số điện thoại hoặc mật khẩu không đúng',
      );
    }

    // Bước 3: build response.
    const tokens = await this.issueTokens(user);
    return {
      ok: true,
      name: user.name,
      needs_questionnaire: !user.questionnaireCompleted,
      ...tokens,
    };
  }

  // ---------- Task 46-47: register ----------

  async register(dto: RegisterDto) {
    // Bước 1: validate trùng TRƯỚC khi insert, message riêng từng field.
    // Nếu để DB tự ném unique-constraint thì client nhận 500 khó hiểu.
    const email = normalizeEmail(dto.email);
    if (email) {
      const existed = await this.prisma.user.findFirst({
        where: { email },
        select: { id: true },
      });
      if (existed) throw new BadRequestException('Email đã được sử dụng');
    }

    if (dto.phone) {
      const existed = await this.prisma.user.findFirst({
        where: { phone: dto.phone },
        select: { id: true },
      });
      if (existed) {
        throw new BadRequestException('Số điện thoại đã được sử dụng');
      }
    }

    // Bước 2: hash password + insert + sinh cặp JWT.
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        // Cột email NOT NULL + UNIQUE: user đăng ký bằng sđt vẫn phải có giá trị
        // duy nhất, dùng placeholder theo phone thay vì để trống.
        email: email ?? `${dto.phone}@phone.local`,
        phone: dto.phone ?? null,
        password: await WerkzeugScryptHasher.encode(dto.password),
        // Django User.role default='Học viên' — KHÔNG phải 'user'.
        role: DEFAULT_ROLE,
      },
    });

    const tokens = await this.issueTokens(user);
    return {
      ok: true,
      needs_questionnaire: !user.questionnaireCompleted,
      ...tokens,
    };
  }

  // ---------- Tài khoản khách (buổi thử nghiệm với giảng viên/sinh viên) ----------
  // Frontend đã gỡ trang đăng nhập/đăng ký, nhưng mọi API bài học vẫn đòi JWT
  // (tiến độ, XP, chấm bài đều gắn user_id). Thay vì mở từng route cho người
  // lạ, mỗi trình duyệt tự nhận một tài khoản ẩn danh: tiến độ vẫn lưu trên
  // server như học viên thật và đội dự án đọc lại được số liệu buổi test.
  //
  // An toàn:
  //  · password = '' — checkPassword() trả false cho chuỗi rỗng, nên không ai
  //    đăng nhập vào tài khoản khách bằng mật khẩu, kể cả qua bản Django.
  //  · email @guest.local là duy nhất (randomUUID) và nhận diện được để lọc
  //    hoặc dọn sau buổi test: DELETE ... WHERE email LIKE '%@guest.local'.
  //  · Tắt bằng GUEST_LOGIN=off khi không còn cần (route trả 403).
  async guest() {
    if ((process.env.GUEST_LOGIN ?? 'on').toLowerCase() === 'off') {
      throw new ForbiddenException('Chế độ khách đã tắt');
    }
    const id = randomUUID();
    const user = await this.prisma.user.create({
      data: {
        name: `Khách ${id.slice(0, 4).toUpperCase()}`,
        email: `guest_${id}@guest.local`,
        password: '',
        role: DEFAULT_ROLE,
        // Bỏ bảng hỏi đầu vào: người thử vào thẳng khoá học.
        questionnaireCompleted: true,
      },
    });
    const tokens = await this.issueTokens(user);
    return { ok: true, guest: true, needs_questionnaire: false, ...tokens };
  }

  // ---------- Task 48: logout ----------

  async logout(refresh?: string) {
    if (refresh) {
      // Không try/catch vì revoke() đã được thiết kế không ném lỗi khi token sai.
      await this.refreshTokenService.revoke(refresh);
    }
    return { ok: true };
  }

  // ---------- Task 49-50: refresh ----------

  async refresh(refreshToken: string): Promise<TokenPair> {
    // rotateAndBlacklist đã bao gồm: verify còn hạn + chưa bị thu hồi (bước 1),
    // rồi đánh dấu revokedAt + cấp token mới (bước 2).
    const {
      userId,
      refreshToken: newRefresh,
      refreshExpiresInMs,
    } = await this.refreshTokenService.rotateAndBlacklist(refreshToken);

    const user = await this.cachedUsers.findById(userId);
    if (!user) throw new UnauthorizedException();

    return {
      access: await this.signAccessToken(user),
      refresh: newRefresh,
      refreshExpiresInMs,
    };
  }

  // ---------- Task 55-57: OAuth ----------

  async validateOAuthLogin(profile: OAuthProfile): Promise<User> {
    // Bước 1: đã liên kết trước đó -> đăng nhập luôn.
    const linked = await this.prisma.user.findFirst({
      where: {
        oauthProvider: profile.provider,
        oauthProviderId: profile.providerId,
      },
    });
    if (linked) return linked;

    // Bước 2: email trùng tài khoản thường (chưa liên kết OAuth) -> tự động liên kết.
    // CHỈ khi provider đã xác minh email. Thiếu gate này, kẻ tấn công đăng ký
    // trước bằng email nạn nhân rồi chờ nạn nhân đăng nhập Google là chiếm được
    // tài khoản (OAuth pre-hijacking).
    if (profile.email && profile.emailVerified === true) {
      const sameEmail = await this.prisma.user.findFirst({
        where: { email: profile.email, oauthProvider: null },
      });
      if (sameEmail) {
        // Chống account pre-hijacking: register() KHÔNG xác minh email, nên
        // tài khoản trùng email hoàn toàn có thể do kẻ tấn công đăng ký trước
        // bằng email nạn nhân + mật khẩu của hắn. Tài khoản có mật khẩu thật
        // -> TỪ CHỐI tự liên kết (nếu link, danh tính Google của nạn nhân rơi
        // vào tài khoản kẻ tấn công kiểm soát). Chỉ auto-link khi password
        // rỗng — quy ước của tài khoản tạo qua OAuth (bước 3 bên dưới).
        if (sameEmail.password !== '') {
          throw new UnauthorizedException(
            'Email này đã được đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng mật khẩu của bạn.',
          );
        }
        const updated = await this.prisma.user.update({
          where: { id: sameEmail.id },
          data: {
            oauthProvider: profile.provider,
            oauthProviderId: profile.providerId,
            avatar: sameEmail.avatar ?? profile.avatar ?? null,
          },
        });
        this.cachedUsers.invalidate(updated.id);
        return updated;
      }
    }

    // Bước 3: chưa có gì -> tạo user mới.
    return this.prisma.user.create({
      data: {
        name: profile.name?.trim() || 'Người dùng',
        email:
          profile.email ??
          `${profile.provider}_${profile.providerId}@oauth.local`,
        password: '',
        role: DEFAULT_ROLE,
        oauthProvider: profile.provider,
        oauthProviderId: profile.providerId,
        avatar: profile.avatar ?? null,
        isVerified: true,
      },
    });
  }

  async issueTokens(user: User): Promise<TokenPair> {
    const refreshExpiresInMs = this.refreshTokenService.lifetimeMsFor(
      user.email,
    );
    return {
      access: await this.signAccessToken(user),
      refresh: await this.refreshTokenService.issue(
        user.id,
        undefined,
        refreshExpiresInMs,
      ),
      refreshExpiresInMs,
    };
  }

  // ---------- helpers ----------

  private async signAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private async findByEmailOrPhone(email?: string, phone?: string) {
    const or: Array<Record<string, string>> = [];
    if (email) or.push({ email });
    if (phone) or.push({ phone });
    if (or.length === 0) return null;

    return this.prisma.user.findFirst({ where: { OR: or } });
  }
}
