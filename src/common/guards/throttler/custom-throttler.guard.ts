import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import { THROTTLE_MESSAGE_KEY } from 'src/common/decorators/throttle-message.decorator';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  // `name` bắt buộc phải nằm trong key: ThrottlerStorageService lưu totalHits theo
  // Map<throttlerName> nhưng chỉ khởi tạo entry cho tier chạy đầu tiên, nên nếu 2 tier
  // dùng chung key thì tier sau đọc ra undefined và totalHits thành NaN (không bao giờ chặn).
  protected generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const controller = context.getClass().name;
    const route = context.getHandler().name;
    return `${controller}.${route}:${suffix}:${name}`;
  }

  /**
   * Người đã đăng nhập bị đếm theo user id, khách theo IP. Đếm thuần theo IP
   * làm cả một lớp học/trường dùng chung NAT chia nhau một quota (vd chatbot
   * 60 lượt/giờ cho cả phòng máy). Cần JwtAuthGuard chạy TRƯỚC guard này để
   * req.user đã có — xem thứ tự APP_GUARD trong ApiGatewayModule.
   */
  protected getTracker(req: Record<string, any>): Promise<string> {
    const userId = (req.user as { sub?: number } | undefined)?.sub;
    return Promise.resolve(userId ? `user:${userId}` : `ip:${String(req.ip)}`);
  }

  /**
   * Cho phép tắt hoàn toàn rate limit qua env THROTTLE_DISABLED=true.
   *
   * Mục đích DUY NHẤT: đo sức chịu tải thật của server trong môi trường nội bộ.
   * Nếu không có công tắc này, mọi bài đo tải từ một máy đều chỉ đo được cơ chế
   * chặn (429 sau 20 request/phút) chứ không biết server chịu được bao nhiêu.
   * TUYỆT ĐỐI không bật ở production — mất lớp chống dò mật khẩu và chống DoS.
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Chốt chặn 2 lớp: ngoài Joi schema (từ chối boot khi THROTTLE_DISABLED=true
    // ở production), guard cũng tự kiểm tra NODE_ENV — kill-switch chỉ có tác
    // dụng ngoài production kể cả khi validation bị bỏ qua.
    if (
      process.env.THROTTLE_DISABLED === 'true' &&
      process.env.NODE_ENV !== 'production'
    ) {
      return true;
    }
    return super.shouldSkip(context);
  }

  /**
   * Route nào khai @ThrottleMessage thì dùng câu của route đó cho lỗi 429.
   *
   * Mặc định của thư viện là "ThrottlerException: Too Many Requests" — tiếng
   * Anh và không nói được người dùng nên làm gì tiếp. Trước đây /python/run có
   * hai kiểu 429 phải phân biệt (bấm quá nhiều, và hàng đợi máy chủ đầy); route
   * đó đã bỏ cùng bộ chạy Python ở máy chủ.
   *
   * Nói thẳng hiện trạng: sau khi bỏ route đó, KHÔNG còn controller nào gắn
   * `@ThrottleMessage`, nên nhánh đọc decorator dưới đây chưa có ai dùng. Giữ
   * lại vì nó là cách duy nhất để một route nói câu 429 của riêng mình, và câu
   * mặc định tiếng Việt bên dưới vẫn áp cho mọi route — đừng xoá nhánh này rồi
   * tưởng đã dọn xong, nó chỉ đang ngủ.
   */
  protected async getErrorMessage(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<string> {
    const custom = this.reflector.getAllAndOverride<string | undefined>(
      THROTTLE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (custom) return custom;
    return super.getErrorMessage(context, throttlerLimitDetail);
  }
}
