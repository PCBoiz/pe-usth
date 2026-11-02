import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerException, throttlerMessage } from '@nestjs/throttler';

/**
 * Nhận diện lỗi hạ tầng DB tạm thời (cạn pool, mất kết nối, Neon đang ngủ dậy).
 * Phải so theo THÔNG ĐIỆP vì driver adapter Neon ném Error thường, không phải
 * PrismaClientKnownRequestError có mã lỗi.
 */
const DB_UNAVAILABLE_PATTERNS = [
  'timeout exceeded when trying to connect',
  'Connection terminated',
  "Can't reach database server",
  'Connection pool timeout',
  'ECONNREFUSED',
  'ETIMEDOUT',
];

function isDbUnavailable(exception: unknown): boolean {
  if (!(exception instanceof Error)) return false;
  const msg = exception.message ?? '';
  return DB_UNAVAILABLE_PATTERNS.some((p) => msg.includes(p));
}

/**
 * Phần payload của một `HttpException` mà bộ lọc này THẬT SỰ đọc. Khai hẹp đúng
 * bằng thứ dùng tới, và để `unknown` chứ không `string[]`/`Record<string,string>`:
 * đây là dữ liệu từ NGOÀI vào (bất kỳ ai cũng ném được `HttpException`), nên
 * khai kiểu đẹp ở đây là tự hứa hộ người khác — hai hàm dưới mới là chỗ kiểm.
 */
type ThanLoiHttp = { message?: unknown; fields?: unknown };

/** Giữ nguyên nếu là chuỗi, nếu không thì dùng câu dự phòng. */
function chuoiHoac(v: unknown, duPhong: string): string {
  return typeof v === 'string' && v ? v : duPhong;
}

/**
 * Chỉ giữ các cặp mà CẢ khoá lẫn giá trị là chuỗi; không còn cặp nào thì trả
 * `null` để `...(fields ? …)` ở dưới bỏ hẳn trường này khỏi response — đúng
 * hành vi cũ khi không có `fields`.
 */
function mapChuoi(v: unknown): Record<string, string> | null {
  if (typeof v !== 'object' || v === null) return null;
  const ra: Record<string, string> = {};
  for (const [k, giaTri] of Object.entries(v)) {
    if (typeof giaTri === 'string') ra[k] = giaTri;
  }
  return Object.keys(ra).length ? ra : null;
}

@Catch()
export class AllExceptionsFilter<T> implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    // Tham số kiểu là GỐC của mọi `any` từng chảy qua file này: không có nó,
    // `getResponse()`/`getRequest()` trả `any`, nên `message` (khai `string`) và
    // `fields` (khai `Record<string, string>`) nhận giá trị mà TS KHÔNG kiểm —
    // hai dòng khai kiểu ở dưới trước đây chỉ là chữ. Hai kiểu này đã được
    // import ở đầu file từ lâu và chưa dùng lần nào.
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã có lỗi xảy ra, xin vui lòng thử lại sau';
    // `unknown` chứ không `any`: `detail` chỉ được ĐƯA VÀO response, không ai
    // đọc thuộc tính của nó ở đây, nên `unknown` đủ và nó không rò ra tiếp.
    let detail: unknown = null;
    let fields: Record<string, string> | null = null;

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      // Route nào khai @ThrottleMessage thì CustomThrottlerGuard đã đặt câu
      // riêng; chỉ thay bằng câu chung khi vẫn là mặc định tiếng Anh của thư
      // viện ('ThrottlerException: Too Many Requests'). Không phân biệt chỗ này
      // thì /python/run luôn nói "bạn bấm quá nhiều" kể cả khi thật ra hàng đợi
      // của máy chủ đầy — hai việc khác nhau, cách xử lý khác nhau.
      message =
        exception.message && exception.message !== throttlerMessage
          ? exception.message
          : 'Quá nhiều yêu cầu, vui lòng thử lại sau';
    } else if (isDbUnavailable(exception)) {
      // Cạn pool / mất kết nối DB là tình trạng TẠM THỜI của hạ tầng, không
      // phải lỗi lập trình -> 503 (kèm Retry-After) đúng ngữ nghĩa hơn 500.
      // Đo tải thực tế cho thấy khi 10.000 người đăng nhập cùng lúc, hàng đợi
      // xin connection vượt 30 giây và ném "timeout exceeded when trying to
      // connect"; trước đây tất cả rơi vào nhánh 500 "Đã có lỗi xảy ra" khiến
      // người dùng chờ rất lâu rồi nhận thông báo vô nghĩa.
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Hệ thống đang quá tải, vui lòng thử lại sau ít phút';
      response.setHeader?.('Retry-After', '10');
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res != null) {
        const resObj = res as ThanLoiHttp;
        if (Array.isArray(resObj.message)) {
          // Nói RÕ sai ở đâu thay vì câu chung chung 'Dữ liệu không hợp lệ':
          // client hiển thị message này trực tiếp cho người dùng.
          // `chuoiHoac` vì bộ lọc này là `@Catch()` TOÀN CỤC: hôm nay chỉ
          // `validationExceptionFactory` sinh mảng và nó luôn sinh `string[]`,
          // nhưng bất kỳ ai ném `HttpException` với payload khác cũng rơi vào
          // đây — và một object lọt vào `message` thì người dùng đọc được đúng
          // chữ "[object Object]".
          message = chuoiHoac(resObj.message[0], 'Dữ liệu không hợp lệ');
          detail = resObj.message;
          // Map field -> message (do validationExceptionFactory sinh ra) giúp
          // form tô đỏ đúng ô nhập. LỌC lại thay vì gán thẳng: trước đây
          // `fields` khai `Record<string, string>` mà nhận từ `any`, nên một
          // map lồng sẽ được gửi nguyên và form tô đỏ bằng "[object Object]".
          fields = mapChuoi(resObj.fields);
        } else {
          message = chuoiHoac(resObj.message, message);
        }
      }

      // Message tiếng Việt mặc định CHỈ áp khi exception không mang message
      // riêng (guard/passport ném ra 'Unauthorized'/'Forbidden' trống nghĩa).
      // Trước đây ép cứng nên mọi lỗi 401 đều thành 'Chưa đăng nhập' — kể cả
      // 'Email/số điện thoại hoặc mật khẩu không đúng' do AuthService ném ra,
      // khiến người dùng nhập sai mật khẩu không biết mình sai ở đâu.
      if (
        exception instanceof UnauthorizedException &&
        message === 'Unauthorized'
      ) {
        message = 'Chưa đăng nhập';
      } else if (
        exception instanceof ForbiddenException &&
        message === 'Forbidden'
      ) {
        message = 'Không có quyền truy cập';
      }
    }

    const requestId = request.requestId || null;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${request.method} ${request.url} -> ${status} ${message}`,
        stack,
      );
    }

    response.status(status).json({
      error: {
        status,
        message,
        detail,
        ...(fields ? { fields } : {}),
      },
      request_id: requestId,
    });
  }
}
