import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { AllExceptionsFilter } from './all-exceptions.filter';

/**
 * Thân response mà bộ lọc gửi đi. Khai ở đây để `json.mock.calls[0][0]` có kiểu
 * THẬT — `jest.fn()` trần trả `Mock<any, any>`, nên mọi ca đọc lại thân response
 * đều đi qua một `any` và không phép so nào được TS kiểm.
 */
type ThanPhanHoi = {
  error: {
    status: number;
    message: unknown;
    detail: unknown;
    fields?: Record<string, string>;
  };
  request_id: string | null;
};

function createHost(requestId: unknown = 'req-123') {
  const json = jest.fn<void, [ThanPhanHoi]>();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { requestId };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter<unknown>;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('maps UnauthorizedException to 401 "Chưa đăng nhập"', () => {
    const { host, status, json } = createHost();
    filter.catch(new UnauthorizedException(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith({
      error: {
        status: HttpStatus.UNAUTHORIZED,
        message: 'Chưa đăng nhập',
        detail: null,
      },
      request_id: 'req-123',
    });
  });

  it('maps ForbiddenException to 403 "Không có quyền truy cập"', () => {
    const { host, status, json } = createHost();
    filter.catch(new ForbiddenException(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(json).toHaveBeenCalledWith({
      error: {
        status: HttpStatus.FORBIDDEN,
        message: 'Không có quyền truy cập',
        detail: null,
      },
      request_id: 'req-123',
    });
  });

  it('maps ThrottlerException to 429', () => {
    const { host, status, json } = createHost();
    filter.catch(new ThrottlerException(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(json).toHaveBeenCalledWith({
      error: {
        status: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
        detail: null,
      },
      request_id: 'req-123',
    });
  });

  it('passes through a plain HttpException with string response', () => {
    const { host, status, json } = createHost();
    filter.catch(new NotFoundException('Không tìm thấy khóa học'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      error: {
        status: HttpStatus.NOT_FOUND,
        message: 'Không tìm thấy khóa học',
        detail: null,
      },
      request_id: 'req-123',
    });
  });

  it('dùng lỗi CỤ THỂ đầu tiên làm message cho ValidationPipe (không phải câu chung chung)', () => {
    const { host, status, json } = createHost();
    filter.catch(
      new BadRequestException([
        'Mật khẩu phải có ít nhất 8 ký tự',
        'Email không hợp lệ',
      ]),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      error: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Mật khẩu phải có ít nhất 8 ký tự',
        detail: ['Mật khẩu phải có ít nhất 8 ký tự', 'Email không hợp lệ'],
      },
      request_id: 'req-123',
    });
  });

  it('chuyển tiếp map fields của validationExceptionFactory để form tô đỏ đúng ô', () => {
    const { host, json } = createHost();
    filter.catch(
      new BadRequestException({
        message: ['Email không hợp lệ'],
        fields: { email: 'Email không hợp lệ' },
      }),
      host,
    );

    expect(json).toHaveBeenCalledWith({
      error: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Email không hợp lệ',
        detail: ['Email không hợp lệ'],
        fields: { email: 'Email không hợp lệ' },
      },
      request_id: 'req-123',
    });
  });

  // ---- Payload KHÔNG đúng hình dạng -------------------------------------
  // Bộ lọc là `@Catch()` TOÀN CỤC. Hôm nay chỉ `validationExceptionFactory`
  // sinh `message` dạng mảng và nó luôn sinh `string[]`, nên ba ca dưới KHÔNG
  // tái hiện một lỗi người dùng đang gặp — chúng khoá cái biên. Trước bản này
  // `message`/`fields` nhận giá trị từ một `any`, tức hai dòng khai kiểu trong
  // bộ lọc chỉ là chữ: ai ném `HttpException` với payload khác thì nó đi thẳng
  // ra response, mà chú thích trong bộ lọc nói rõ client hiện `message` trực
  // tiếp cho người dùng.
  it('message[0] không phải chuỗi: trả câu dự phòng, KHÔNG để lọt "[object Object]"', () => {
    const { host, json } = createHost();
    filter.catch(
      new BadRequestException({ message: [{ loi: 'object lọt vào đây' }] }),
      host,
    );

    const than = json.mock.calls[0]?.[0];
    expect(than.error.message).toBe('Dữ liệu không hợp lệ');
    expect(typeof than.error.message).toBe('string');
  });

  it('message không phải mảng và không phải chuỗi: giữ câu mặc định của bộ lọc', () => {
    const { host, json } = createHost();
    filter.catch(new BadRequestException({ message: { ma: 123 } }), host);

    const than = json.mock.calls[0]?.[0];
    expect(typeof than.error.message).toBe('string');
    expect(than.error.message).not.toContain('object Object');
  });

  it('fields có giá trị không phải chuỗi: LOẠI đúng cặp đó, giữ các cặp còn lại', () => {
    const { host, json } = createHost();
    filter.catch(
      new BadRequestException({
        message: ['Email không hợp lệ'],
        // `password` lồng một object — form tô đỏ bằng "[object Object]" nếu
        // nó được chuyển tiếp nguyên.
        fields: { email: 'Email không hợp lệ', password: { nested: 'x' } },
      }),
      host,
    );

    const than = json.mock.calls[0]?.[0];
    expect(than.error.fields).toEqual({ email: 'Email không hợp lệ' });
  });

  it('fields KHÔNG còn cặp chuỗi nào: bỏ hẳn trường khỏi response', () => {
    const { host, json } = createHost();
    filter.catch(
      new BadRequestException({
        message: ['Email không hợp lệ'],
        fields: { email: { nested: 'x' } },
      }),
      host,
    );

    const than = json.mock.calls[0]?.[0];
    expect('fields' in than.error).toBe(false);
  });

  it('GIỮ message riêng của UnauthorizedException (không ép thành "Chưa đăng nhập")', () => {
    const { host, status, json } = createHost();
    filter.catch(
      new UnauthorizedException('Email/số điện thoại hoặc mật khẩu không đúng'),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith({
      error: {
        status: HttpStatus.UNAUTHORIZED,
        message: 'Email/số điện thoại hoặc mật khẩu không đúng',
        detail: null,
      },
      request_id: 'req-123',
    });
  });

  it('GIỮ message riêng của ForbiddenException', () => {
    const { host, json } = createHost();
    filter.catch(
      new ForbiddenException('Bạn phải đăng ký khoá học trước khi đánh giá'),
      host,
    );

    expect(json).toHaveBeenCalledWith({
      error: {
        status: HttpStatus.FORBIDDEN,
        message: 'Bạn phải đăng ký khoá học trước khi đánh giá',
        detail: null,
      },
      request_id: 'req-123',
    });
  });

  it('falls back to 500 generic message for a raw Error (non-HttpException)', () => {
    const { host, status, json } = createHost();
    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      error: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Đã có lỗi xảy ra, xin vui lòng thử lại sau',
        detail: null,
      },
      request_id: 'req-123',
    });
  });

  it('falls back to 500 generic message for InternalServerErrorException (default message override)', () => {
    const { host, status, json } = createHost();
    filter.catch(new InternalServerErrorException(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      error: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
        detail: null,
      },
      request_id: 'req-123',
    });
  });

  it('sets request_id to null when the request has none', () => {
    const { host, json } = createHost(null);
    filter.catch(new UnauthorizedException(), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ request_id: null }),
    );
  });
});
