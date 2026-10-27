import { envValidationSchema } from './env.validation';

/**
 * Vì sao có file này: Joi chạy với `allowUnknown: true`, nên một biến KHÔNG
 * khai trong schema vẫn qua được validate — nhưng giữ nguyên dạng CHUỖI. Mà
 * `config.get<number>('X')` chỉ là ép kiểu lúc biên dịch, không đổi giá trị lúc
 * chạy. Nên quên khai một biến số là lỗi IM LẶNG: code cộng chuỗi với số.
 *
 * Sự cố thật ngày 13/10/2026: PY_RUN_QUEUE_TIMEOUT_MS chưa khai, đặt "30000"
 * trên Render → code tính "30000" + 10000 + 10000 = chuỗi "300001000010000" →
 * AbortSignal.timeout(<chuỗi>) ném TypeError ngay trong try → catch trả 503 "Bộ
 * chạy Python đang tắt". Dịch vụ phía sau vẫn khoẻ, fetch chưa từng được gọi,
 * và triệu chứng trỏ sai sang "lệch khoá / tường lửa chặn".
 *
 * Biến gây ra vụ đó đã bị xoá cùng bộ chạy Python ở máy chủ (pha dọn 25/10), nên
 * các ca dưới đây chuyển sang canh những biến số CÒN LẠI — lớp lỗi thì không đổi:
 * gỡ dòng khai của bất kỳ biến số nào ra khỏi env.validation.ts thì ca tương
 * ứng trượt.
 */
const BAT_BUOC = {
  DATABASE_URL: 'postgresql://u:p@host/db',
  DIRECT_URL: 'postgresql://u:p@host/db',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  FRONTEND_URL: 'https://programmingedu.io.vn',
  ALLOWED_ORIGINS: 'https://programmingedu.io.vn',
};

// Joi.object() không mang kiểu đầu ra nên validate() trả `value: any`; đổi
// sang `unknown` ở đúng một chỗ này để các ca bên dưới phải ép kiểu tường minh
// thay vì destructure từ `any`.
const validate = (extra: Record<string, string>) => {
  const r = envValidationSchema.validate(
    { ...BAT_BUOC, ...extra },
    { allowUnknown: true, abortEarly: false },
  );
  return { error: r.error, value: r.value as unknown };
};

describe('envValidationSchema — biến số phải ra SỐ, không phải chuỗi', () => {
  // Đặt qua dashboard (Render/Vercel) thì mọi giá trị đều là chuỗi.
  // Giá trị mẫu nằm trong khoảng hợp lệ của từng biến (mỗi biến một trần khác
  // nhau: cổng ≤ 65535, số hop ≤ 3, thời gian tính bằng mili giây).
  const SO: ReadonlyArray<readonly [string, string]> = [
    ['PORT', '5000'],
    ['THROTTLE_IP_HOUR_LIMIT', '20000'],
    ['THROTTLE_IP_DAY_LIMIT', '200000'],
    ['THROTTLE_SWEEP_INTERVAL_MS', '60000'],
    ['THROTTLE_MAX_KEYS', '200000'],
    ['TRUST_PROXY_HOPS', '1'],
    // Cổng trễ của bài hậu kiểm: `QuizzesService` nhân giá trị này với
    // 86 400 000 để tính mốc "đã đủ trễ". Giữ nguyên dạng chuỗi thì '7' * số
    // vẫn ra số (JS ép ngầm) — nên lỗi ở đây không hiện ra như vụ 13/10, mà
    // hiện ra khi biến để TRỐNG: Number('') = 0, cổng mở toang, bài hậu kiểm
    // hỏi về bài vừa học hôm qua và vẫn báo ra một con số.
    ['POSTTEST_DELAY_DAYS', '7'],
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

  it('cộng hai mốc đã ép kiểu ra SỐ, không nối chuỗi', () => {
    // Chính hình dạng phép tính đã gây sự cố 13/10: cộng hai giá trị đọc từ env
    // rồi cộng thêm một hằng. Nếu Joi không ép kiểu thì đây là nối chuỗi.
    const { value } = validate({
      THROTTLE_SWEEP_INTERVAL_MS: '60000',
      THROTTLE_MAX_KEYS: '200000',
    });
    const v = value as Record<string, number>;
    expect(v.THROTTLE_SWEEP_INTERVAL_MS + v.THROTTLE_MAX_KEYS + 10_000).toBe(
      270_000,
    );
  });

  it('biến KHÔNG khai trong schema giữ nguyên dạng chuỗi — đây là lớp lỗi', () => {
    // Ca này mô tả chính cái bẫy, bằng một tên biến chắc chắn không có trong
    // schema. Nó không đỏ khi ai đó quên khai biến mới (không có cách nào biết
    // trước tên đó), nhưng nó khoá LÝ DO các ca trên tồn tại: `allowUnknown`
    // cho qua, và giá trị vẫn là chuỗi.
    const { error, value } = validate({ MOT_BIEN_KHONG_KHAI: '30000' });
    expect(error).toBeUndefined();
    expect((value as Record<string, unknown>).MOT_BIEN_KHONG_KHAI).toBe(
      '30000',
    );
  });
});

/**
 * THROTTLE_* và TRUST_PROXY_HOPS được đọc thẳng từ process.env (phần lớn trong
 * decorator @Throttle, chạy lúc nạp class), nên Joi không đổi được giá trị code
 * nhìn thấy — việc của Joi là CHẶN KHỞI ĐỘNG khi giá trị sai. Các ca dưới đây
 * kiểm đúng việc đó: trước bản sửa, mọi giá trị sau đều qua validate êm và gây
 * lỗi im lặng lúc chạy (Number('') = 0 → mọi lượt bị 429; NaN → không bao giờ
 * chặn; TRUST_PROXY_HOPS NaN → trust proxy tắt).
 */
describe('envValidationSchema — THROTTLE_* và TRUST_PROXY_HOPS', () => {
  const THROTTLE: ReadonlyArray<readonly [string, number]> = [
    ['THROTTLE_IP_HOUR_LIMIT', 1000],
    ['THROTTLE_IP_DAY_LIMIT', 10000],
    ['THROTTLE_LOGIN_LIMIT', 20],
    ['THROTTLE_LOGIN_TTL_SECONDS', 60],
    ['THROTTLE_REGISTER_LIMIT', 10],
    ['THROTTLE_REGISTER_TTL_SECONDS', 60],
    ['THROTTLE_GUEST_LIMIT', 120],
    ['THROTTLE_GUEST_TTL_SECONDS', 3600],
    ['THROTTLE_BADGE_LIMIT', 240],
    ['THROTTLE_SWEEP_INTERVAL_MS', 60_000],
    ['THROTTLE_MAX_KEYS', 200_000],
  ];

  it.each(THROTTLE)('%s để trống bị từ chối (không thành 0)', (key) => {
    expect(validate({ [key]: '' }).error).toBeDefined();
  });

  it.each(THROTTLE)('%s không phải số bị từ chối (không thành NaN)', (key) => {
    expect(validate({ [key]: '1o' }).error).toBeDefined();
  });

  it.each(THROTTLE)('%s = 0 bị từ chối', (key) => {
    expect(validate({ [key]: '0' }).error).toBeDefined();
  });

  it.each(THROTTLE)(
    '%s không đặt → mặc định %d, TRÙNG với `?? <số>` ở nơi dùng',
    (key, macDinh) => {
      const { error, value } = validate({});
      expect(error).toBeUndefined();
      expect((value as Record<string, unknown>)[key]).toBe(macDinh);
    },
  );

  it('giá trị đang đặt trên production vẫn qua (không chặn deploy)', () => {
    // Đo lại ngày 25/10/2026 trên chính production: header
    // x-ratelimit-limit-ip_hour: 20000, ip_day: 200000 (đọc từ response của
    // POST https://api.programmingedu.io.vn/auth/refresh).
    const { error } = validate({
      THROTTLE_IP_HOUR_LIMIT: '20000',
      THROTTLE_IP_DAY_LIMIT: '200000',
      TRUST_PROXY_HOPS: '1',
    });
    expect(error).toBeUndefined();
  });

  it.each(['0', '1', '2', '3'])('TRUST_PROXY_HOPS=%s được nhận', (v) => {
    const { error, value } = validate({ TRUST_PROXY_HOPS: v });
    expect(error).toBeUndefined();
    expect((value as Record<string, unknown>).TRUST_PROXY_HOPS).toBe(Number(v));
  });

  it.each(['', 'one', '1.5', '-1', '4', 'true'])(
    'TRUST_PROXY_HOPS=%p bị từ chối',
    (v) => {
      expect(validate({ TRUST_PROXY_HOPS: v }).error).toBeDefined();
    },
  );

  it('TRUST_PROXY_HOPS không đặt → 0, trùng `?? 0` trong api-gateway.setup.ts', () => {
    const { value } = validate({});
    expect((value as Record<string, unknown>).TRUST_PROXY_HOPS).toBe(0);
  });

  // Hướng lệch KHÔNG đối xứng: cổng trễ đoán ngắn hơn là mở toang (đo trí nhớ
  // ngắn hạn mà vẫn báo số), đoán dài hơn chỉ là cổng chưa mở. Nên giá trị rác
  // phải bị TỪ CHỐI ngay lúc boot, không được hiểu thành 0.
  // '31' có mặt vì trần 30 là ràng buộc CỨNG, không phải con số cho đẹp: phiên
  // khách sống 30 ngày (JWT_GUEST_REFRESH_EXPIRES), trễ dài hơn thế thì người
  // thử nhận userId mới và không ghép được hậu kiểm với tiền kiểm.
  it.each(['', 'bảy', '-1', '3.5', '31', '400'])(
    'POSTTEST_DELAY_DAYS=%p bị từ chối',
    (v) => {
      expect(validate({ POSTTEST_DELAY_DAYS: v }).error).toBeDefined();
    },
  );

  it('POSTTEST_DELAY_DAYS không đặt → 7, trùng SO_NGAY_TRE_MAC_DINH', () => {
    const { value } = validate({});
    expect((value as Record<string, unknown>).POSTTEST_DELAY_DAYS).toBe(7);
  });
});
