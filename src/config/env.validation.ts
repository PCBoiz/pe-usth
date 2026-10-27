import * as Joi from 'joi';

// Số lượt cho phép trong một cửa sổ throttle: phải là số nguyên >= 1. 0 nghĩa
// là chặn mọi request — không ai cố ý đặt vậy, đó là dấu hiệu biến để trống.
const throttleLimit = (mac_dinh: number) =>
  Joi.number().integer().min(1).max(10_000_000).default(mac_dinh);

// Độ dài cửa sổ throttle, tính bằng GIÂY (nơi dùng bọc seconds(...)): 1 giây
// tới 1 ngày.
const throttleTtl = (mac_dinh: number) =>
  Joi.number().integer().min(1).max(86_400).default(mac_dinh);

// MỌI biến mà code đọc bằng `config.get<number>()` PHẢI khai ở đây.
//
// Joi chạy với allowUnknown: true nên key lạ vẫn qua được, nhưng giữ nguyên dạng
// CHUỖI — và `get<number>()` chỉ là ép kiểu lúc BIÊN DỊCH, không đổi giá trị lúc
// chạy. Hậu quả thật trên production 13/10/2026: một biến timeout không khai ở
// đây, đặt "30000" trên Render, thì code tính "30000" + 10000 + 10000 = chuỗi
// "300001000010000"; `AbortSignal.timeout(<chuỗi>)` ném TypeError NGAY TRONG try
// rồi rơi vào catch và trả 503 — trong khi dịch vụ phía sau vẫn khoẻ và `fetch`
// chưa từng được gọi. Triệu chứng trỏ sai hoàn toàn sang "lệch khoá/tường lửa".
//
// Biến gây ra vụ đó (PY_RUN_QUEUE_TIMEOUT_MS) đã bị xoá cùng bộ chạy Python ở
// máy chủ, nhưng BÀI HỌC thì áp cho mọi biến số sau này.
export const envValidationSchema = Joi.object({
  PORT: Joi.number().integer().min(1).max(65535).default(5000),

  // Default 'development' khớp cách dùng hiện có (chỉ so sánh === 'production').
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  // Kill-switch rate-limit (chỉ dành cho đo tải nội bộ): optional để env cũ
  // không có biến này vẫn boot, nhưng ở production chỉ chấp nhận 'false' —
  // app TỪ CHỐI khởi động nếu công tắc đang bật.
  THROTTLE_DISABLED: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().valid('false'),
    otherwise: Joi.string().valid('true', 'false'),
  }),

  // ---- Rate limit & proxy --------------------------------------------------
  //
  // GIỚI HẠN CỦA PHẦN NÀY — đọc trước khi sửa: các biến dưới đây được đọc
  // THẲNG từ process.env ở nơi dùng, phần lớn ngay lúc nạp class
  // (`@Throttle({ limit: Number(process.env.X ?? 10) })` là decorator, chạy
  // trước khi ConfigModule validate). Vì vậy Joi KHÔNG đổi được giá trị code
  // nhìn thấy: `.default()` ở đây chỉ để ghi lại mặc định, và phải trùng với
  // `?? <số>` ở nơi dùng. Việc Joi làm được là TỪ CHỐI KHỞI ĐỘNG khi giá trị
  // sai — đúng cái cần, vì các lỗi dưới đây đều im lặng:
  //   - `THROTTLE_PY_RUN_LIMIT=` để trống → `?? 10` không áp (chuỗi rỗng không
  //     phải undefined) → Number('') = 0 → mọi lượt Chạy bị 429.
  //   - gõ "1o" thay "10" → NaN → throttler so sánh với NaN, không bao giờ chặn.
  //   - `TRUST_PROXY_HOPS=one` → NaN → `NaN > 0` là false → trust proxy TẮT,
  //     cả hệ thống chung một bucket IP của proxy mà không ai biết.
  // Không có .empty(''): chuỗi rỗng phải bị từ chối, không được coi như "chưa đặt".
  //
  // Nơi dùng: throttle.config.ts, auth.controller.ts, python-runner.controller.ts,
  // notifications.controller.ts, fixed-window-throttler.storage.ts,
  // api-gateway.setup.ts. Thêm biến THROTTLE_* mới thì khai ở đây.
  THROTTLE_IP_HOUR_LIMIT: throttleLimit(1000),
  THROTTLE_IP_DAY_LIMIT: throttleLimit(10000),
  THROTTLE_LOGIN_LIMIT: throttleLimit(20),
  THROTTLE_LOGIN_TTL_SECONDS: throttleTtl(60),
  THROTTLE_REGISTER_LIMIT: throttleLimit(10),
  THROTTLE_REGISTER_TTL_SECONDS: throttleTtl(60),
  THROTTLE_GUEST_LIMIT: throttleLimit(120),
  THROTTLE_GUEST_TTL_SECONDS: throttleTtl(3600),
  THROTTLE_BADGE_LIMIT: throttleLimit(240),
  // Ghi nhật ký lần thử (POST /api/events). Quota tính theo TÀI KHOẢN, không
  // theo IP (CustomThrottlerGuard.getTracker), nên nó không bị cả phòng máy
  // chung NAT ăn hết — xem learning-events.controller.ts để biết vì sao 600.
  THROTTLE_EVENTS_LIMIT: throttleLimit(600),
  THROTTLE_EVENTS_TTL_SECONDS: throttleTtl(3600),
  // Chu kỳ quét key hết hạn của FixedWindowThrottlerStorage; 0/NaN làm
  // setInterval chạy liên tục hoặc không bao giờ dọn.
  THROTTLE_SWEEP_INTERVAL_MS: Joi.number()
    .integer()
    .min(1000)
    .max(3_600_000)
    .default(60_000),
  THROTTLE_MAX_KEYS: Joi.number()
    .integer()
    .min(1000)
    .max(10_000_000)
    .default(200_000),

  // Số reverse proxy phía trước (Express 'trust proxy' dạng SỐ HOP). Chỉ nhận
  // số nguyên 0–3: không có hạ tầng nào của dự án có hơn 3 lớp proxy, và đặt
  // CAO hơn số proxy thật là hướng nguy hiểm — req.ip rơi vào phần
  // X-Forwarded-For do client tự bịa, vượt được mọi rate-limit theo IP. Không
  // nhận 'true' vì cùng lý do (xem api-gateway.setup.ts). Giá trị đúng cho
  // production phải ĐO, không suy luận — xem runner/README.md mục TRUST_PROXY_HOPS.
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).max(3).default(0),

  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),

  // ---- Bài hậu kiểm có trễ -------------------------------------------------
  //
  // Khoảng TRỄ tối thiểu (ngày) giữa lúc hoàn thành một bài và lúc bài đó được
  // phép xuất hiện trong đề hậu kiểm.
  //
  // 7 là QUY ƯỚC, không phải con số rút ra từ một nghiên cứu. Thứ có bằng
  // chứng là ngưỡng **≥ 1 ngày**; lý do chi tiết (và vì sao "luật 10-20%" của
  // Cepeda et al. KHÔNG nói gì về việc đặt trễ bao lâu) nằm ở
  // `SO_NGAY_TRE_MAC_DINH` trong src/quizzes/post-test.ts.
  //
  // TRẦN 30, không phải 365: phiên của tài khoản khách sống theo
  // `JWT_GUEST_REFRESH_EXPIRES` (mặc định 30d) và hết hạn là người thử nhận
  // một `userId` MỚI — hậu kiểm không ghép được với tiền kiểm nữa. Đặt trễ dài
  // hơn hạn phiên là đo được 0 người, nên đây là trần CỨNG của nền này chứ
  // không phải một con số cho đẹp. Nới nó thì phải nới hạn phiên trước.
  //
  // KHAI Ở ĐÂY LÀ BẮT BUỘC, không phải cho đẹp: `QuizzesService` đọc biến này
  // bằng `config.get<number>()`, mà `get<number>()` chỉ ép kiểu lúc BIÊN DỊCH.
  // Không khai thì giá trị đặt trên Render giữ nguyên dạng CHUỖI và
  // `Date.now() - '7' * 86400000` tuy vẫn ra số, nhưng một biến để TRỐNG thành
  // Number('') = 0 — cổng trễ mở toang mà không ai thấy. Joi áp mặc định 7 và
  // TỪ CHỐI KHỞI ĐỘNG khi giá trị sai.
  // min(0) chứ không min(1): 0 ngày là cách tắt cổng trễ khi cần thử tay, và
  // nó phải là điều người ta GÕ RA chứ không phải điều xảy ra vì để trống.
  POSTTEST_DELAY_DAYS: Joi.number().integer().min(0).max(30).default(7),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('30m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('8h'),
  // Hạn RIÊNG cho tài khoản khách. Dài hơn hẳn vì đợt thử nghiệm không bắt
  // đăng nhập: với người thử, refresh token là thứ DUY NHẤT giữ tiến độ, hết
  // hạn là họ nhận một tài khoản mới và thấy như mất sạch. Tách khỏi biến
  // trên để không nới cửa sổ của quản trị viên theo — xem
  // `RefreshTokenService.lifetimeMsFor`.
  JWT_GUEST_REFRESH_EXPIRES: Joi.string().default('30d'),

  // Cookie refresh token: 'lax' khi frontend và backend cùng site (vd
  // app.example.com + api.example.com); 'none' khi khác site (bắt buộc HTTPS).
  REFRESH_COOKIE_SAMESITE: Joi.string()
    .valid('lax', 'strict', 'none')
    .default('lax'),

  FRONTEND_URL: Joi.string().uri().required(),
  ALLOWED_ORIGINS: Joi.string().required(),

  // OAuth: optional() chứ không required() — thiếu credential thì chỉ tắt
  // đăng nhập mạng xã hội, KHÔNG chặn app khởi động.
  // .allow(''): .env.example để sẵn 4 khoá này với giá trị rỗng, mà Joi.string()
  // mặc định từ chối chuỗi rỗng — chép nguyên .env.example là app không boot được.
  // Rỗng được xử lý như thiếu (auth.module.ts: !clientId → bỏ qua đăng nhập).
  GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional(),
  FACEBOOK_CLIENT_ID: Joi.string().optional().allow(''),
  FACEBOOK_CLIENT_SECRET: Joi.string().optional().allow(''),
  FACEBOOK_CALLBACK_URL: Joi.string().uri().optional(),

  // Chatbot Gemini: optional() giống OAuth — thiếu key thì chỉ tắt trợ lý AI
  // (route trả 503), KHÔNG chặn app khởi động.
  GEMINI_API_KEY: Joi.string().optional().allow(''),
  GEMINI_MODEL: Joi.string().optional(),
  GEMINI_BASE_URL: Joi.string().uri().optional(),
  GEMINI_SYSTEM_PROMPT: Joi.string().optional(),
  GEMINI_TIMEOUT_MS: Joi.number().integer().min(1000).max(120000).optional(),
  GEMINI_MAX_CHARS: Joi.number().integer().min(100).max(20000).optional(),
  GEMINI_HOUR_LIMIT: Joi.number().integer().min(1).optional(),
});
