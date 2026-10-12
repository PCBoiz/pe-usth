# Programming EDU

Nền tảng học lập trình: khoá học, bài học tương tác, Python Studio (chạy Python
ngay trên trình duyệt bằng Pyodide), diễn đàn, bảng xếp hạng và trợ lý AI (Gemini).

| Phần | Công nghệ | Thư mục |
|---|---|---|
| Backend API | NestJS 11, Prisma 7, PostgreSQL (Neon) | `src/`, `prisma/` |
| Frontend | Next.js 16, React 19 (bọc một phần JS legacy chuyển từ bản Flask/Django) | `frontend/` |
| Nội dung giáo trình Python | Python + Pyodide | `scripts/pe-v3/` |

## Cấu trúc

```
src/
  api-gateway/     middleware, guard, filter, pipe dùng chung (auth, rate limit, CORS, header bảo mật)
  auth/            đăng nhập, đăng ký, refresh token (cookie httpOnly), OAuth Google/Facebook
  <module>/        mỗi module nghiệp vụ: *.controller.ts, *.service.ts, dto/, *.module.ts
  common/          decorator, guard, filter, middleware, tiện ích bảo mật
  config/          cấu hình đọc từ env + Joi schema (env.validation.ts)
prisma/
  schema.prisma    schema DB
  migrations/      lịch sử thay đổi DB (Prisma Migrate)
frontend/
  src/app/         các trang (App Router)
  src/components/  component React (lesson-chrome, python-studio là code React mới)
  public/static/   JS/CSS legacy, nạp qua <LegacyScripts>; pe-bridge.js nối legacy với API
scripts/           seed, đo tải, giáo trình pe-v3
```

## Chạy local

Yêu cầu: Node 22+, npm.

```bash
# Backend (cổng 5000)
cp .env.example .env          # điền DATABASE_URL, DIRECT_URL, JWT_ACCESS_SECRET (>= 32 ký tự)...
npm install
npx prisma generate
npm run start:dev

# Frontend (cổng 3000) — terminal khác
cd frontend
npm install
npm run dev
```

Frontend gọi backend qua `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:5000`).

## Biến môi trường chính

Danh sách đầy đủ và giá trị hợp lệ nằm ở [src/config/env.validation.ts](src/config/env.validation.ts);
app từ chối khởi động nếu thiếu biến bắt buộc.

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Chuỗi kết nối pooled (app) / direct (Prisma CLI) |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES` | Ký access token; hạn access/refresh (vd `30m`, `8h`) |
| `FRONTEND_URL`, `ALLOWED_ORIGINS` | Redirect sau OAuth; danh sách origin được CORS |
| `REFRESH_COOKIE_SAMESITE` | `lax` (mặc định) khi frontend và backend **cùng site**; `none` khi khác site (bắt buộc HTTPS) |
| `TRUST_PROXY_HOPS` | Số reverse proxy phía trước, để rate limit lấy đúng IP người dùng |
| `GOOGLE_*`, `FACEBOOK_*` | OAuth (không bắt buộc) |
| `GEMINI_API_KEY` | Trợ lý AI và nhập bài học bằng AI (không bắt buộc) |

## Xác thực

- **Access token** (JWT, ngắn hạn) gửi qua header `Authorization: Bearer`.
- **Refresh token** nằm trong cookie `pe_refresh` (`httpOnly`, `path=/auth`). JavaScript
  không đọc được, nên lỗ XSS không lấy được phiên dài hạn. Phía DB chỉ lưu hash SHA-256.
- Mỗi lần refresh, token cũ bị thu hồi và token mới được cấp **cùng family**. Nếu một
  token đã thu hồi bị gửi lại (quá 30 giây sau khi rotate), toàn bộ family bị thu hồi:
  token bị đánh cắp không dùng tiếp được.
- Frontend và backend phải dùng chung site (vd `app.example.com` + `api.example.com`) để
  cookie `SameSite=Lax` hoạt động. Nếu buộc phải khác site thì đặt
  `REFRESH_COOKIE_SAMESITE=none`. Lưu ý Safari chặn cookie bên thứ ba.

## Database và migration

Schema được quản lý bằng Prisma Migrate (`prisma/migrations/`). Migration `0_init` là
baseline: nó mô tả đúng cấu trúc DB đang chạy và **không được chạy lại** trên DB đã có dữ liệu.

**Lần đầu trên một DB đã tồn tại** (chỉ làm một lần cho mỗi môi trường):

```bash
npx prisma migrate resolve --applied 0_init   # đánh dấu baseline là đã áp dụng
npm run migrate:deploy                        # chạy các migration sau baseline
```

**Về sau**, sửa `schema.prisma`, rồi:

```bash
npx prisma migrate dev --name <ten-thay-doi>  # trên DB dev: sinh và chạy migration
npm run migrate:deploy                        # trên staging/production
```

DB đang dùng chung với bản Django trong giai đoạn chuyển tiếp, nên mọi migration phải
tương thích ngược: chỉ thêm cột nullable hoặc có default, không đổi tên hay xoá cột.
Ràng buộc duy nhất `lessons(course_id, sort_order)` và các index nóng nằm trong migration
`20261012000000_critical_indexes_and_lesson_sort_unique`, được `migrate:deploy` áp tự động.
**Trước khi deploy migration đó**, kiểm tra dữ liệu trùng — câu lệnh phải trả về 0 dòng:

```sql
SELECT course_id, sort_order, count(*) FROM lessons GROUP BY 1,2 HAVING count(*) > 1;
```

[prisma/optional-indexes.sql](prisma/optional-indexes.sql) giữ lại bản `CONCURRENTLY` của
đúng các index đó, cùng tên: chạy tay file này trước khi deploy nếu bảng đã lớn tới mức
không được chặn ghi trong lúc tạo index.

## Kiểm thử và CI

```bash
npm run typecheck && npx jest          # backend
cd frontend && npm run typecheck && npm run lint && npm run build
cd frontend && npx playwright test -c e2e/playwright.config.ts   # e2e (cần backend + frontend đang chạy)
```

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) chạy typecheck, unit
test và build cho cả hai phần trên mỗi pull request.

## Tài liệu khác

- [LESSON-IMPORT-FORMAT.md](LESSON-IMPORT-FORMAT.md): định dạng nhập bài học từ PDF/Markdown
- [PYTHON-STUDIO-TEST.md](PYTHON-STUDIO-TEST.md): kiểm thử Python Studio
- [scripts/pe-v3/README.md](scripts/pe-v3/README.md): dựng và nạp giáo trình Python v3
- Khoá **Python Advanced** (cùng 40 bài, học bằng mini-game): mục cuối của [scripts/pe-v3/README.md](scripts/pe-v3/README.md)
- [src/api-gateway/README.md](src/api-gateway/README.md): ranh giới gateway ↔ module nghiệp vụ
