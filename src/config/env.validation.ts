import * as Joi from 'joi';

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

  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('30m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('8h'),

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

  // Python IDE (src/python-runner): chạy code người dùng trong container Docker.
  //
  // MỌI biến PY_*/RUNNER_* mà code đọc bằng `config.get<number>()` PHẢI khai ở
  // đây. Joi chạy với allowUnknown: true nên key lạ vẫn qua được, nhưng giữ
  // nguyên dạng CHUỖI — và `get<number>()` chỉ là ép kiểu lúc biên dịch, không
  // đổi giá trị lúc chạy. Hậu quả thật đã gặp trên production 13/10/2026:
  // PY_RUN_QUEUE_TIMEOUT_MS không khai ở đây, đặt "30000" trên Render thì
  // RemoteExecutor tính "30000" + 10000 + 10000 = chuỗi "300001000010000",
  // AbortSignal.timeout(<chuỗi>) ném TypeError NGAY TRONG try, rơi vào catch và
  // trả 503 "Bộ chạy Python đang tắt" — trong khi runner vẫn khoẻ và fetch chưa
  // từng được gọi. Triệu chứng trỏ sai hoàn toàn sang "lệch khoá/tường lửa".
  PY_SANDBOX_IMAGE: Joi.string().default('py-sandbox'),
  PY_RUN_TIMEOUT_MS: Joi.number().integer().min(1000).max(60000).default(10000),
  // Số container chạy ĐỒNG THỜI tối đa; vượt thì xếp hàng, hàng đầy thì 429.
  PY_RUN_MAX_CONCURRENT: Joi.number().integer().min(1).max(16).default(2),
  // Chờ tối đa trong hàng trước khi bỏ cuộc. Phải KHỚP với runner, nếu không
  // backend bỏ cuộc trước hoặc sau runner và thông điệp lỗi sai lệch.
  PY_RUN_QUEUE_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(120000)
    .default(30000),
  // Số bài được xếp hàng chờ; vượt thì 429 ngay thay vì để chờ vô vọng.
  PY_RUN_QUEUE_MAX: Joi.number().integer().min(1).max(500).default(50),
  // Trần RAM mỗi container, dạng docker ('512m', '1g'). Chuỗi nên không dính
  // bẫy ở trên, nhưng khai ra để một chỗ duy nhất liệt kê đủ biến.
  PY_RUN_MEMORY: Joi.string().default('512m'),
  // 'remote' → gọi runner qua HTTP; giá trị khác (kể cả 'Remote' viết hoa) rơi
  // về chạy docker ngay trên máy backend.
  PY_RUNNER_MODE: Joi.string().valid('local', 'remote').default('local'),
  // Chỉ bắt buộc khi PY_RUNNER_MODE=remote — module tự getOrThrow lúc khởi động.
  RUNNER_URL: Joi.string().uri().optional(),
  RUNNER_SECRET: Joi.string().min(16).optional(),
  // true → POST /api/python/run KHÔNG đòi JWT (lúc khởi động có cảnh báo). Mặc định
  // false. KHÔNG chặn khởi động ở production: route được bảo vệ bằng lớp mạng ở
  // reverse proxy. .empty(''): `PY_RUNNER_PUBLIC=` để trống coi như chưa đặt.
  PY_RUNNER_PUBLIC: Joi.boolean().empty('').default(false),
});
