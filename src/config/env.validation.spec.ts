import { envValidationSchema } from './env.validation';

/**
 * Vì sao có file này: Joi chạy với `allowUnknown: true`, nên một biến KHÔNG
 * khai trong schema vẫn qua được validate — nhưng giữ nguyên dạng CHUỖI. Mà
 * `config.get<number>('X')` chỉ là ép kiểu lúc biên dịch, không đổi giá trị lúc
 * chạy. Nên quên khai một biến số là lỗi IM LẶNG: code cộng chuỗi với số.
 *
 * Sự cố thật ngày 13/10/2026: PY_RUN_QUEUE_TIMEOUT_MS chưa khai, đặt "30000"
 * trên Render → RemoteExecutor tính "30000" + 10000 + 10000 = chuỗi
 * "300001000010000" → AbortSignal.timeout(<chuỗi>) ném TypeError ngay trong
 * try → catch trả 503 "Bộ chạy Python đang tắt". Runner vẫn khoẻ, fetch chưa
 * từng được gọi, và triệu chứng trỏ sai sang "lệch khoá / tường lửa chặn".
 *
 * Các ca dưới đây bắt đúng lớp lỗi đó: gỡ dòng khai của bất kỳ biến số nào ra
 * khỏi env.validation.ts thì ca tương ứng trượt.
 */
const BAT_BUOC = {
  DATABASE_URL: 'postgresql://u:p@host/db',
  DIRECT_URL: 'postgresql://u:p@host/db',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  FRONTEND_URL: 'https://programmingedu.io.vn',
  ALLOWED_ORIGINS: 'https://programmingedu.io.vn',
};

const validate = (extra: Record<string, string>) =>
  envValidationSchema.validate(
    { ...BAT_BUOC, ...extra },
    { allowUnknown: true, abortEarly: false },
  );

describe('envValidationSchema — biến số phải ra SỐ, không phải chuỗi', () => {
  // Đặt qua dashboard (Render/Vercel) thì mọi giá trị đều là chuỗi.
  // Giá trị mẫu nằm trong khoảng hợp lệ của từng biến (mỗi biến một trần khác
  // nhau: đồng thời ≤ 16, hàng đợi ≤ 500, thời gian tính bằng mili giây).
  const SO: ReadonlyArray<readonly [string, string]> = [
    ['PY_RUN_TIMEOUT_MS', '12000'],
    ['PY_RUN_QUEUE_TIMEOUT_MS', '30000'],
    ['PY_RUN_MAX_CONCURRENT', '4'],
    ['PY_RUN_QUEUE_MAX', '50'],
  ];

  it.each(SO)('%s nhập dạng chuỗi được ép về number', (key, mau) => {
    const { error, value } = validate({ [key]: mau });
    expect(error).toBeUndefined();
    expect(typeof (value as Record<string, unknown>)[key]).toBe('number');
  });

  it.each(SO)('%s không đặt thì có mặc định dạng number', (key) => {
    const { error, value } = validate({});
    expect(error).toBeUndefined();
    expect(typeof (value as Record<string, unknown>)[key]).toBe('number');
  });

  it('cộng ba mốc thời gian ra SỐ, không nối chuỗi', () => {
    const { value } = validate({
      PY_RUN_QUEUE_TIMEOUT_MS: '30000',
      PY_RUN_TIMEOUT_MS: '10000',
    });
    const v = value as Record<string, number>;
    // Chính phép tính của RemoteExecutor: queue + run + 10s dự phòng.
    expect(v.PY_RUN_QUEUE_TIMEOUT_MS + v.PY_RUN_TIMEOUT_MS + 10_000).toBe(50_000);
  });

  it('PY_RUNNER_MODE chỉ nhận local/remote — chặn lỗi viết hoa im lặng', () => {
    expect(validate({ PY_RUNNER_MODE: 'remote' }).error).toBeUndefined();
    expect(validate({ PY_RUNNER_MODE: 'Remote' }).error).toBeDefined();
  });

  it('RUNNER_SECRET quá ngắn bị chặn ngay lúc khởi động', () => {
    // Runner từ chối khoá ngắn; backend phải từ chối cùng lúc, không để lệch
    // nhau rồi mới lộ ra bằng một chuỗi 401 lúc chạy.
    expect(validate({ RUNNER_SECRET: 'ngan' }).error).toBeDefined();
    expect(validate({ RUNNER_SECRET: 'x'.repeat(32) }).error).toBeUndefined();
  });
});
