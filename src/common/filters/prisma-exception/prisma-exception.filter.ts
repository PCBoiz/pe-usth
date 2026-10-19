import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from 'src/generated/prisma';

// Key = tên CỘT DB (snake_case), nối bằng ',' theo đúng thứ tự Postgres trả về
const UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  email: 'Email này đã được sử dụng',
  code: 'Mã này đã tồn tại',
  'course_id,lesson_code': 'Mã bài học đã tồn tại trong khoá học này',
  'user_id,course_id': 'Bạn đã đăng ký khoá học này rồi',
  'user_id,lesson_id': 'Bài học này đã được ghi nhận tiến độ',
  'user_id,post_id': 'Bạn đã thích bài viết này rồi',
  'user_id,badge_id': 'Huy hiệu này đã được trao rồi',
  'user_id,roadmap_id,item_id': 'Mục lộ trình này đã được ghi nhận',
  user_id: 'Dữ liệu của người dùng này đã tồn tại',
};

/**
 * `exception.meta` là `unknown` (Prisma không hứa shape nào), nên bản cũ ép
 * `as any` rồi đào thẳng `meta?.driverAdapterError?.cause?.constraint?.fields`.
 * Cái giá: gõ sai một chặng (`driverAdaptorError`) vẫn biên dịch, `extractFields`
 * trả `[]`, và mọi lỗi trùng dữ liệu rơi về câu chung "Dữ liệu đã tồn tại" —
 * không ngoại lệ nào, không log nào đỏ. Một helper có kiểu đích thật (cùng
 * khuôn `asRecord()` ở `quizzes/quizzes.service.ts`) bắt TS kiểm từng chặng.
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

/** Đào `meta.driverAdapterError.cause.constraint` — shape của @prisma/adapter-neon. */
function adapterConstraint(
  exception: Prisma.PrismaClientKnownRequestError,
): Record<string, unknown> | null {
  const meta = asRecord(exception.meta);
  const cause = asRecord(asRecord(meta?.driverAdapterError)?.cause);
  return asRecord(cause?.constraint);
}

function extractFields(
  exception: Prisma.PrismaClientKnownRequestError,
): string[] {
  // Prisma 7 + driver adapter (@prisma/adapter-neon): shape thực tế của project này
  const fields = adapterConstraint(exception)?.fields;
  if (Array.isArray(fields)) return fields as string[];

  // Fallback: shape cũ meta.target, phòng khi đổi adapter/engine sau này
  const target = asRecord(exception.meta)?.target;
  if (Array.isArray(target)) return target as string[];
  if (typeof target === 'string') return [target];

  return [];
}

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã có lỗi xảy ra, xin vui lòng thử lại sau';
    // `detail` chỉ từng mang danh sách tên cột vi phạm, nên khai đúng kiểu đó
    // thay cho `any`: FE đọc `error.detail` như một mảng chuỗi.
    let detail: string[] | null = null;

    if (exception.code === 'P2002') {
      status = HttpStatus.BAD_REQUEST;
      const fields = extractFields(exception);
      message =
        UNIQUE_FIELD_MESSAGES[fields.join(',')] ??
        'Dữ liệu đã tồn tại, vui lòng kiểm tra lại';
      detail = fields.length ? fields : null;
    } else if (exception.code === 'P2003') {
      // Vi phạm khoá ngoại. Lá chắn thứ 2 (JwtStrategy đã chặn user bị xoá
      // ngay từ cổng vào) — phòng trường hợp bản ghi tham chiếu (khoá học,
      // bài học...) bị xoá đúng lúc request đang xử lý (race hiếm gặp).
      status = HttpStatus.BAD_REQUEST;
      const ten =
        adapterConstraint(exception)?.name ??
        asRecord(exception.meta)?.field_name;
      const constraint = typeof ten === 'string' ? ten : undefined;
      message = constraint?.includes('user_id')
        ? 'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại'
        : 'Dữ liệu liên quan không còn tồn tại, vui lòng tải lại trang';
    }

    // Giữ `||` (không đổi sang `??`): chuỗi rỗng cũng phải ra null như trước.
    const requestId = request.requestId || null;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} Prisma ${exception.code}: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      error: { status, message, detail },
      request_id: requestId,
    });
  }
}
