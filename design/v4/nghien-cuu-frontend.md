# Nghiên cứu kiến trúc frontend — tách repo + theme "lofi chill"

Đo ngày 22/10/2026. Cây làm việc: `D:\pe_usth` ở nhánh `main`, commit `070886a`
("revert(giao diện): main về bản 2c12049"). Nguồn lofi: `C:\Users\sonkh\Downloads\study-room-next\goc-hoc-pe`.
CHỈ ĐỌC — không sửa, không chạy git ghi, không nối DB.

---

## 0. Cảnh báo trước khi đọc: cây làm việc KHÔNG phải cái mà AGENTS.md trong context đang mô tả

Đây là điều đầu tiên phải biết, vì nó làm sai lệch mọi phỏng đoán dựa trên tài liệu.

- `070886a` là một revert nội dung đưa `main` về đúng cây của `2c12049` (14/10/2026). Nó
  revert **cả `AGENTS.md`**: `AGENTS.md:33-43` trên đĩa ghi mốc "Đo ngày 14/10/2026 … Backend
  lint 263 lỗi … Frontend unit test 204 ca", trong khi bản AGENTS.md nằm trong context của
  phiên này là bản 20/10 (lint 2 lỗi, 759 ca, bản đồ sao, tiền cảnh bàn quan trắc).
  **Bản trên đĩa là bản đang có hiệu lực.** Bản 20/10 còn nguyên ở nhánh `chiem-tinh`.
- Hệ quả cụ thể, đã kiểm: **`apiFetchSessionOnly` KHÔNG tồn tại trong mã nguồn.**
  `frontend/src/lib/api.ts` (193 dòng) chỉ export `apiFetch`, `asList`, `findEnrollment`; ngoài
  ra chỉ còn `frontend/.next/dev/server/chunks/**` (sản phẩm build cũ còn sót).
  **Sửa 22/10 — một chỗ của bản đầu nói quá:** cái tên ấy *có* trong tệp được theo dõi, ở
  `AGENTS.md:185` ngay trên `main`. Tức bản revert KHÔNG gỡ bẫy này khỏi tài liệu (AGENTS.md của
  `main` giống hệt của `2c12049`, 221 dòng; chỉ có bảng mốc là bản 14/10). Kết luận vì vậy còn
  mạnh hơn: luật "trang công khai dùng `apiFetchSessionOnly`" được GHI trong AGENTS.md đang có
  hiệu lực mà **không có một dòng code nào thi hành** — ai làm theo nó sẽ phải tự viết hàm đó.
- Tương tự: `frontend/src/lib/api.ts:72` có chú thích "Xoá cookie cờ phiên để **proxy.ts** chặn
  từ server", nhưng `find frontend/src -name "proxy*"` không ra gì. Không có consumer phía
  server nào của `pe_has_session` trong cây này; nó chỉ được đọc bởi JS trên trang
  (`api.ts:59`, `pe-bridge.js:75`).

---

## 1. Tách frontend khỏi backend thì vỡ những gì

### 1.1 Token đi bằng đường nào

| Thứ | Vận chuyển | Nơi quy định |
|---|---|---|
| Access token (JWT ngắn hạn) | Header `Authorization: Bearer`, giá trị lấy từ `localStorage['pe_access']` | `frontend/src/lib/api.ts:16`, `:147`; `frontend/public/static/js/pe-bridge.js:23`, `:133-135` |
| Refresh token | Cookie `httpOnly` tên **`pe_refresh`**, `path=/auth` | `src/auth/refresh-cookie.ts:11-12`, đặt ở `:37` |
| Cờ "có phiên" (không chứa token) | Cookie **`pe_has_session=1`** do JS phía frontend tự đặt | `api.ts:90`, `:130`; `pe-bridge.js:36`; `login.inline.js:19` |
| State của OAuth | Cookie `pe_oauth_state_<provider>`, `httpOnly`, `sameSite` **cố định `lax`** | `src/auth/oauth-state.ts:58-73` |

Chi tiết đáng chú ý:

- `path=/auth` (`refresh-cookie.ts:12`) là một quyết định tốt cho việc tách: trình duyệt chỉ
  đính cookie refresh vào `/auth/refresh` và `/auth/logout`, không vào mọi `/api/*`. Đó cũng là
  lý do `apiFetch` **không** truyền `credentials: 'include'` ở lời gọi chính
  (`api.ts:148` — `fetch(base + path, { ...opts, headers })`), chỉ truyền ở
  `callRefresh()` (`api.ts:45`) và `ensureGuest()` (`api.ts:116`). Chỗ này **đã đúng** cho
  kiến trúc hai domain, không cần sửa.
- Access token được nhận qua **fragment** sau OAuth: `${FRONTEND_URL}/auth/callback#access=…`
  (`src/auth/auth.controller.ts:190-192`, `:226-228`).
  **Nhưng frontend hiện KHÔNG có route `/auth/callback` và cũng không có `/login`** — liệt kê
  `frontend/src/app/**/page.tsx` chỉ ra **13** trang (đếm lại 22/10; bản đầu ghi 14), không có
  hai trang đó. Nghĩa là OAuth
  Google/Facebook hiện là một nhánh backend chạy được nhưng **không có đầu nhận ở frontend**.
  Tách repo không làm nó tệ hơn, nhưng nếu phòng lofi có "Điện thoại · hồ sơ" thì phải quyết
  xem có dựng lại trang nhận callback không.

### 1.2 Hai domain khác nhau cần gì — kiểm lại `REFRESH_COOKIE_SAMESITE=none`

**AGENTS.md nói đúng, nhưng chưa đủ.** Danh sách đầy đủ, mỗi mục có chỗ dẫn:

1. **`REFRESH_COOKIE_SAMESITE=none`** — ĐÚNG, và nó là biến duy nhất điều khiển việc này:
   `src/auth/refresh-cookie.ts:16-19` đọc `process.env.REFRESH_COOKIE_SAMESITE`, chỉ nhận
   `strict`/`none`, mọi giá trị khác về `lax`. Joi chặn giá trị lạ ngay lúc boot
   (`src/config/env.validation.ts:29-31`).
2. **`Secure` TỰ ĐỘNG đi kèm** — không phải thêm biến: `refresh-cookie.ts:26` đặt
   `secure: process.env.NODE_ENV === 'production' || site === 'none'`. Tức là ngay cả ở
   `NODE_ENV=development`, đặt `none` cũng bật `Secure`. Hệ quả **ngược mà dễ vấp**: dev local
   qua `http://localhost` mà đặt `none` thì trình duyệt **từ chối** cookie → refresh không bao
   giờ hoạt động ở máy dev. Dev local phải để `lax`.
3. **CORS allowlist ở gateway** — `ALLOWED_ORIGINS` là biến **bắt buộc**
   (`env.validation.ts:34`), đọc thành mảng ở `src/config/app.config.ts:5-6` (tách theo dấu
   phẩy, trim), nạp vào `cors({origin: …, credentials: true})` ở
   `src/common/middleware/cors/cors.middleware.ts:21-23`. `credentials: true` đã có sẵn.
   Origin mới của frontend phải được **thêm vào `ALLOWED_ORIGINS`**, không có wildcard.
4. **Phạm vi CORS chỉ `/api` và `/auth`** — `cors.middleware.ts:6` (`CORS_SCOPED_PATHS`) và
   `:50`. Route nào không nằm dưới hai prefix đó (ví dụ `/health`) **không có header CORS**.
   Nếu frontend mới muốn ping `/health` từ trình duyệt thì sẽ bị chặn.
5. **`FRONTEND_URL`** bắt buộc (`env.validation.ts:33`) và dùng cho redirect OAuth
   (`auth.controller.ts:168-169`, `:210-211`). Tách repo + deploy domain mới ⇒ phải đổi, nếu
   không OAuth đẩy người dùng về domain cũ.
6. **`credentials: 'include'`** — đã có ở đúng ba chỗ cần
   (`api.ts:45`, `:116`; `pe-bridge.js:62`, và `pe-bridge.js:138-140` tự gắn cho mọi URL
   `/auth/*`). Nhưng còn **bốn file legacy dùng `credentials: 'same-origin'`**:
   `frontend/public/static/js/course_db_design.js:421`,
   `frontend/public/static/js/pages/login.inline.js:102`,
   `frontend/public/static/js/pages/register.inline.js:69`,
   `frontend/public/static/js/questionaire.js:278`.
   Ba trong bốn chỗ đó gọi `/auth/*` hoặc `/api/*` qua `fetch` tương đối, nên **pe-bridge ghi
   đè `opts.credentials = 'include'`** ở `pe-bridge.js:139` — nhưng chỉ cho URL bắt đầu bằng
   `/auth/`. `course_db_design.js:421` gọi `/api/courses-enrolled` với `same-origin`: không
   cần cookie (access đi bằng header) nên vẫn chạy; đừng "sửa cho đều" vì đổi nó thành
   `include` sẽ bắt đầu gửi cookie cross-site không cần thiết.
7. **Domain của cookie**: `baseOptions()` (`refresh-cookie.ts:21-30`) **không** đặt `domain`,
   nên `pe_refresh` là host-only cookie của domain API. Đúng cho `SameSite=None`. Đừng thêm
   `domain=.example.com` để "chia sẻ" — nó mở cookie cho mọi subdomain mà không cần thiết.
8. **Safari / ITP**: README.md:75 đã ghi "Safari chặn cookie bên thứ ba". Với `SameSite=None`
   cross-site, Safari và Firefox (ETP strict) có thể **không giữ `pe_refresh`**. Hệ quả thực
   tế: hết hạn access token (`JWT_ACCESS_EXPIRES` mặc định `30m`, `env.validation.ts:24`) là
   khách **mất phiên và nhận tài khoản khách mới** qua `ensureGuest()` (`api.ts:155`) — mất
   tiến độ, đúng cái AGENTS.md cảnh báo. **Chưa kiểm trên thiết bị thật.**
9. **CSP `connect-src`** — `frontend/next.config.ts:34`:
   `connect-src 'self' ${API_ORIGIN}` với `API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ||
   "http://localhost:5000"` (`next.config.ts:4`). Biến này đọc **lúc build**, không lúc chạy.
   Deploy frontend mà quên đặt `NEXT_PUBLIC_API_URL` ở bước build ⇒ CSP cho phép đúng
   `localhost:5000`, và mọi `fetch` tới API thật bị trình duyệt chặn ở tầng CSP — lỗi này
   **không hiện ở server log nào**, chỉ hiện trong console.
10. **`TRUST_PROXY_HOPS`** (`src/api-gateway/api-gateway.setup.ts:50-57`) — không phải chuyện
    tách repo, nhưng tách deploy thì số hop proxy đổi; đặt sai thì rate-limit theo IP gộp cả
    phòng máy vào một bucket. Chú thích ở `:47-49` nói rõ không được dùng `true`.

### 1.3 Bốn chỗ ghi cứng `max-age=28800` — tách repo thì chúng thành vấn đề gì

Đã kiểm, đúng bốn chỗ ghi + hai chỗ đọc:

- ghi: `frontend/src/lib/api.ts:90` (sau refresh), `frontend/src/lib/api.ts:130` (sau
  `/auth/guest`), `frontend/public/static/js/pe-bridge.js:36` (`setSessionCookie()`),
  `frontend/public/static/js/pages/login.inline.js:19`
- xoá: `api.ts:74`, `pe-bridge.js:39`
- đọc: `api.ts:59`, `pe-bridge.js:75` — cả hai chỉ để quyết định "có đáng gọi `/auth/refresh`
  không"

Nguồn sự thật đối ứng nằm ở backend: `JWT_REFRESH_EXPIRES` mặc định `'8h'`
(`src/config/env.validation.ts:25`), parse một lần trong constructor thành
`RefreshTokenService.lifetimeMs` (`src/auth/refresh-token.service.ts:51-63`), và `28800` giây
= 8 giờ là bản chép tay của con số đó.

**Tách repo đổi bản chất của vấn đề này từ "dễ quên" sang "không thể biết".** Hiện tại, một
người sửa `JWT_REFRESH_EXPIRES` còn `grep 28800` được trong CÙNG cây mã và thấy ngay bốn chỗ.
Sau khi tách:

- bốn chỗ ấy nằm ở repo frontend, biến `JWT_REFRESH_EXPIRES` nằm ở repo backend. Không công cụ
  nào (typecheck, lint, test, CI) đi qua được ranh giới đó. Đổi 8h → 30 ngày ở backend là một
  commit xanh hoàn toàn ở cả hai repo, và hậu quả chỉ lộ ra ở người dùng: FE tưởng hết phiên
  trong khi token còn sống (hoặc ngược lại — xem `api.ts:58-60`: không thấy cờ thì **không gọi
  refresh**, nên người dùng còn token hợp lệ vẫn bị coi là khách mới).
- `pe-bridge.js:32-34` còn một chú thích nói cờ này tồn tại "để **proxy.ts** của Next đọc được
  trạng thái từ server". `proxy.ts` không còn trong cây (kiểm ở §0). Nên hiện cờ này **chỉ là
  một phép tối ưu để không gọi mạng vô ích**, không phải một cổng bảo mật. Biết điều đó thì
  cách xử lý rẻ hơn hẳn: đừng chép hạn sang frontend nữa — hoặc để backend trả hạn trong body
  của `/auth/refresh` và `/auth/guest` (hiện body chỉ có `access`, `auth.controller.ts:50-53`
  bóc `refresh` ra), hoặc bỏ `max-age` để cờ thành session cookie.
- Cả bốn chỗ đặt cookie **không có `Secure`**. Trên HTTPS thì vẫn chấp nhận được (cờ không
  chứa token), nhưng nếu đã sửa thì sửa luôn.

### 1.4 Những ràng buộc khác chỉ vỡ KHI tách, đã kiểm được bằng grep

Đây là phần mà `api.ts` + `src/auth` + `src/api-gateway` không nói ra:

- **Hai test unit của frontend đọc file nằm NGOÀI `frontend/`:**
  `frontend/e2e/unit/ide-brief-code.test.mjs:27` →
  `new URL('../../../scripts/pe-v4/out-advanced/lessons/', import.meta.url)`, và
  `frontend/e2e/unit/prewarm-gate.test.mjs:34` →
  `'../../../scripts/pe-v4/out-advanced/lessons.json'`.
  Tách repo là **hai test này hỏng ngay** (thư mục `scripts/` ở lại repo backend).
- **Đường ống giáo trình đi qua ranh giới repo:** `frontend/src/lib/curricula.json` được sinh
  bởi `py scripts/pe-v4/sync_curricula.py` (AGENTS.md:21, 94-98), và
  `frontend/src/lib/catalog.ts:32` `import CURRICULA_JSON from '@/lib/curricula.json'`. Sau khi
  tách, bộ sinh ở repo A, đích ở repo B. Bẫy "hai nguồn danh sách bài" nay thành "hai nguồn ở
  hai repo".
- **Cách chạy Playwright giả định hai phần cùng cây:** `frontend/e2e/playwright.config.ts`
  `webServer.cwd: '..'` và `command: 'npm run build && npm run start'` — cwd `..` tính từ
  `e2e/`, tức `frontend/`. Cái này còn đúng sau khi tách (nó chỉ đi lên một cấp trong repo
  frontend). Nhưng nhóm spec thứ hai (`pe-run-sql`, `drag-regression`) cần backend đang chạy —
  chú thích ở `playwright.config.ts:10-15` còn nói "cần backend **Django** (cổng 9000)", tức
  chú thích đã lỗi thời từ trước, không phải do tách.
- **`next.config.ts:43-52`** ghim `turbopack.root = __dirname` với lý do rõ ràng: thư mục cha
  (backend NestJS) có `package-lock.json` nên Turbopack có thể chọn nhầm gốc. **Tách repo làm
  cái workaround này hết cần thiết** — nhưng đừng bỏ nó trong cùng commit tách: nếu bỏ sai thì
  triệu chứng là `/dashboard` trả 500 "Could not find the module … in the React Client
  Manifest", đúng như chú thích ở `:49-50`.
- **CI đang là một workflow cho cả hai:** `.github/workflows/ci.yml` có job `backend`
  (dòng 12-71, gồm mốc trần lint `TRAN = 283` ở `:58`) và job `frontend` (`:73`, với
  `working-directory: frontend`). Tách repo là phải cắt file này làm hai, và **mốc trần lint
  283 là một con số chỉ có nghĩa trong repo backend** — đừng mang sang.

---

## 2. Sáu màn của phòng lofi vs endpoint thật

Tất cả đường dẫn dưới đây mang prefix `/api` do `app.setGlobalPrefix(API_PREFIX)` với
`API_PREFIX = 'api'` (`src/api-gateway/api-gateway.setup.ts:14`, `:77`). Chỉ `/health`,
`/health/ready` và nhóm `/auth/*` được loại trừ (`:22-38`).

**Về JWT:** `JwtAuthGuard` là `APP_GUARD` toàn cục (`src/api-gateway/api-gateway.module.ts:83`),
và nó chỉ bước sang bên khi có `@Public()` (`src/common/guards/jwt-auth/jwt-auth.guard.ts:13-18`).
Không controller nào trong bảng dưới mang `@Public()` ⇒ **cả bảy endpoint đều đòi
`Authorization: Bearer`**, và `@CurrentUserId()` đọc `req.user.sub` không kiểm null
(`src/common/decorators/current-user.decorator.ts:18-22`).

| Endpoint (đầy đủ) | JWT | Controller | Service | Hình dạng trả về (đọc từ service) |
|---|---|---|---|---|
| `GET /api/stats` | có | `src/stats/stats.controller.ts:46` | `stats.service.ts:53-97` | `{ok, xp, gems, streak, certificates, lastStudyDate, coursesEnrolled, avgProgress, totalHours, streakActive}` |
| `GET /api/achievements` | có | `src/achievements/achievements.controller.ts:10` | `achievements.service.ts:100-134` | `{ok, achievements: [{id, code, name, description, icon, unlocked, awardedAt, progress, current, target}]}` |
| `GET /api/leaderboard?type=` | có | `src/leaderboard/leaderboard.controller.ts:9` | `leaderboard.service.ts:143-168` | `{ok, entries: [{id, name, avatar, value, rank, is_me}], me}`; `type=friends` thêm `type:'friends'` (`:136`) |
| `GET /api/me/roadmap` | có | `src/roadmap/roadmap.controller.ts:36` | `roadmap.service.ts:54-74` | `{ok, mermaid_def, title, icon: null, color: null, nodes, edges, roadmap}` |
| `GET /api/courses-enrolled` | có | `src/courses/courses.controller.ts:48` | `courses.service.ts:181-209` | `{ok, courses: [mapCourse…], enrolled: [mapEnrollment…]}` |
| `GET /api/quiz/today` | có | `src/quizzes/quizzes.controller.ts:33` | `quizzes.service.ts:167-221` | `{ok, count, questions_available, min_questions, can_quiz, lessons: [{id, title, course_id, course_title, completed_at, question_count}]}` |
| `GET /api/streak/review-quiz-status` | có | `src/stats/stats.controller.ts:72` | `stats.service.ts:222-270` | `{ok, streak, is_unlocked, lessons_completed, lessons_required, lessons_remaining, done_today}` |

`mapCourse` (`courses.service.ts`, khối `private mapCourse`) trả
`{id, title, level, rating, totalLessons, xpReward, isPublished, language, accentColor, icon,
enrolled, subtitle, description, duration, tag, image, color, students:'0', lessons}`.
`mapEnrollment` trả `{id, courseId, title, subtitle, duration, color, accentColor, image,
progress, completedLessons, totalLessons, timeSpent, status, icon, lastLesson, nextLesson,
enrolledAt}`. Chú ý `students: '0'` là **hằng ghi cứng**, không phải số thật.

### Đối chiếu từng màn

**Lộ trình** (`corkboard` → route `roadmap`). Phòng lofi vẽ 10 chặng với toạ độ cứng:
`lib/studyroom/data.js:53` `STAGES` (10 tên), `:54` `NODES` (10 toạ độ), `:55` `LBL`.
`GET /api/me/roadmap` trả `mermaid_def` + `nodes`/`edges` dạng JSON tự do
(`prisma/schema.prisma` `RoadMap.nodesJson/edgesJson`). **Không đủ ngay**: phòng cần toạ độ
hình học trên một bảng ghim, API trả một đồ thị Mermaid. Và `roadmap.service.ts:55-57` chỉ tìm
roadmap `source ∈ {generated, custom}` của chính user — khách mới **không có** ⇒ trả
`mermaid_def: ''`, `nodes: []`. Thêm nữa, `POST /api/me/roadmap` **ném 400** nếu user chưa làm
khảo sát (`roadmap.service.ts:88-92`), mà phòng lofi không có màn khảo sát và tài khoản khách
được đặt `questionnaireCompleted: true` (`src/auth/auth.service.ts:160`) để bỏ qua khảo sát —
tức là khách **không bao giờ có `Survey`**, nên nhánh lưu lộ trình cá nhân là đường chết.

**Khóa học** (`courses`). Phòng lofi mô hình hoá ba kệ sách, mỗi kệ một khoá, mỗi cuốn sách một
bài: `data.js:5-11` — 9 + 11 + 8 = 28 cuốn, và `data.js:12` `DATA.meta` khai đúng 28 hình
cut-out (`book0..8`, `pb0..10`, `tb0..7`) với toạ độ + vùng chạm riêng từng cuốn.
Thực tế: `frontend/src/lib/catalog.ts` chỉ còn **một** khoá (`id: 'python_advanced'`, dòng 85),
48 bài. **Đây là mismatch cấu trúc, không phải thiếu field**: `GET /api/courses-enrolled` trả
đủ dữ liệu (`courses` + `enrolled` với `totalLessons`, `completedLessons`, `progress`), nhưng
"một cuốn sách = một bài" với 48 bài thì không có 48 hình sách. Và `getEnrolled()` (chứ không
phải `getCoursesEnrolled()`) mới là endpoint trả `completedLessonNumbers` — mảng `sortOrder`
của các bài đã xong, tức đúng thứ cần để tô "đã học / đang học / chưa mở" từng cuốn
(`courses.service.ts:143-178`, phần `completedLessonNumbers` ở `:169-174`, chỉ áp cho khoá
trong `STUDIO_COURSES`). **Màn Khóa học nên gọi
`GET /api/enrolled`, không phải `/api/courses-enrolled`.**

**Học tiếp** (`laptop` → route `learn`). Phòng cần: tên bài kế tiếp + mã nguồn mẫu.
`mapEnrollment` đã có `nextLesson` và `lastLesson` (tra từ `fetchLessonTitles`), đủ cho nhãn
"Học tiếp bài 4". Nội dung code thì phòng lofi đang ghi cứng ở `data.js:14-27` (`SCODE`, C++) và
`data.js:60-69` (`LESSON_BODY`). Nội dung bài thật đọc từ
`GET /api/courses/:courseId/lessons/:lessonNo/content` (`src/lessons/lessons.controller.ts:36`)
— endpoint này **không nằm trong bảy endpoint được hỏi**, nhưng nó là cái duy nhất nuôi được
màn này. Lưu ý: khoá thật là Python, phòng lofi gõ C++ trên màn laptop.

**Luyện tập** (`notebook` → route `practice`). `GET /api/quiz/today` đủ và đúng việc: nó trả
`can_quiz` để UI biết TRƯỚC là có ôn được không (chú thích `quizzes.service.ts:163-166` nói
đúng mục đích đó). Một cái bẫy số đã ghi trong AGENTS.md và kiểm lại đúng: `MIN_POOL = 5`
(`quizzes.service.ts:28`) mà mỗi bài Advanced có 3 câu ⇒ phải xong **2 bài** mới mở được, trong
khi thông báo gửi FE là `min_questions: 5` (`:175`, `:219`) — một con số nói theo CÂU, dễ bị
UI diễn dịch thành "xong 1 bài là đủ".
`GET /api/streak/review-quiz-status` bổ sung `lessons_remaining` + `done_today`, đủ cho thẻ
"Nhiệm vụ hôm nay" (`data.js:43`).

**Thành tựu** (kệ cúp → route `achievements`). Phòng lofi có **24 huy hiệu ghi cứng**:
`data.js:56-58` `BADGES` — mỗi phần tử `[nhãn, tên, bậc]` với bậc ∈ `bronze|silver|gold|soon`.
`GET /api/achievements` trả `{id, code, name, description, icon, unlocked, awardedAt, progress,
current, target}`. **Thiếu đúng một thứ: BẬC.** Không có cột `tier`/`rarity` nào trong
`prisma/schema.prisma:464-476` (`Achievement` chỉ có `id, code, name, description, icon,
conditionType, conditionValue`). Bù lại, API có `progress`/`current`/`target` mà phòng lofi
chưa dùng. Và vấn đề lớn hơn nằm ở §3.

**Điện thoại** (`phone` → route `phone`, hai tab `me` + `rank`).
- tab `me`: `GET /api/stats` + `GET /api/user` (`src/user/user.controller.ts:24`, service
  `user.service.ts:23-34` trả toàn bộ hàng `users` trừ `password`, thêm `needs_questionnaire`,
  `first_login`). Đủ.
- tab `rank`: `GET /api/leaderboard` — xem §3.

**Chuông thông báo / giấy nhớ** (không nằm trong sáu màn nhưng engine có): phòng lofi ghi cứng
6 mẩu ở `data.js:40-47` (`NOTE_POOL`). Backend có
`GET /api/notifications/feed` → `{ok, unread, items}` (`src/notifications/notifications.service.ts:118`)
và `GET /api/notifications/badge` → `{ok, unread, latest}` (`:131`), route badge có quota riêng
240 lượt/giờ (`notifications.controller.ts:49-57`) vì client poll ~45 s/lần. Hình dạng
`NOTE_POOL` (có `act`, `go`, `c`, `ic`, `sh`, `l3`) **phong phú hơn** `Notification` trong DB
(`title, body, refType, refId, isRead, coalesceCount`) — ánh xạ được nhưng mất màu/nhãn.

---

## 3. Chỗ KHÔNG có dữ liệu thật

### 3.1 Thành tựu — bảng danh mục rỗng, và nó rỗng một cách IM LẶNG

Đây là phát hiện nặng nhất của phần này.

- `achievements` là một bảng **cấu hình** (`prisma/schema.prisma:464-476`); `user_achievements`
  là bảng trao (`:478-488`).
- **Không có một dòng code nào trong repo ghi vào `achievements`.** Đã grep
  `insert into achievements`, `achievement.create`, `achievement.upsert` trên
  `prisma/`, `scripts/`, `src/` (loại `src/generated/`): chỉ ra một kết quả duy nhất là
  `src/achievements/achievements.service.ts:89` — và đó là `db.userAchievement.createMany`,
  tức ghi bảng TRAO, không phải bảng danh mục.
  `prisma/migrations/0_init/migration.sql:324` chỉ `CREATE TABLE`.
  `prisma/seed-courses.js` không chạm tới nó (grep `achievement|badge` trên các file seed: 0
  kết quả).
- Hệ quả đo được từ code: `checkAndAwardAchievements` (`:63`) mở đầu bằng
  `if (all.length === 0) return [];` (`achievements.service.ts:68`) — **catalog rỗng thì không
  ai được trao gì, vĩnh viễn, không log, không lỗi**. Và `listForUser` (`:100`) trả
  `{ok: true, achievements: []}` (`:109-133`) — một response 200 hoàn toàn hợp lệ.
  Màn Thành tựu sẽ là một kệ cúp trống với HTTP 200.
- Dữ liệu NGUỒN để tính thì có đủ: `getMetrics` (`achievements.service.ts:20-39`) dựng bốn chỉ
  số `lesson_count`, `streak_days`, `xp_total`, `course_complete` từ `lessonProgress`, `users`,
  `enrollments`. Tức **thiếu đúng phần định nghĩa huy hiệu**, không thiếu phần đo.
- `Badge` / `UserBadge` (`schema.prisma:341-363`) là một hệ **thứ hai, song song, và chết hẳn**:
  grep `userBadge|badges` trên `src/` (trừ `src/generated/`) ra **0 kết quả**. Không service
  nào đọc hay ghi. Đừng nhầm hai bảng này với `achievements`.
- **Chưa kiểm**: có bao nhiêu dòng đang thật sự nằm trong `achievements` trên DB Neon — tôi
  không nối DB theo yêu cầu. Nhưng vì không có code nào ghi vào đó, nguồn duy nhất có thể là
  bản Django cũ hoặc một lần `INSERT` tay. **Phải chạy `SELECT count(*) FROM achievements;`
  trước khi quyết.**

### 3.2 Bảng xếp hạng — có dữ liệu thật, nhưng ba vấn đề hình dạng

Dữ liệu nguồn **có thật**, khác với thành tựu:

- `GET /api/leaderboard` mặc định (không `type`) → `fetchTopBy(userId, 'xp')` đọc thẳng
  `users.xp` (`leaderboard.service.ts:54-103`). Dữ liệu này được ghi mỗi lần hoàn thành bài
  (`src/lessons/lessons.service.ts:444`) và mỗi lần hoàn thành nhiệm vụ
  (`src/stats/stats.service.ts:171`).
- `type=weekly` → `fetchTopWeekly` (`:20-51`) chạy SQL thô trên `user_daily_xp_logs` với
  `log_date >= date_trunc('week', CURRENT_DATE)`. Bảng này **được ghi thật**:
  `lessons.service.ts:452-463` (log XP theo ngày khi hoàn thành bài lần đầu) và
  `stats.service.ts:180-192`. Có index `idx_daily_xp_user_date` (`schema.prisma:337`).
- `type=streak` → `users.streak`, cũng được ghi thật qua `StreakService.computeNewStreak`
  (`src/common/streak/streak.service.ts:52-70`), mốc ngày chốt theo múi giờ nghiệp vụ
  `Asia/Ho_Chi_Minh` (`:16`) chứ không theo giờ máy chủ — đây là phần làm đúng.
- `type=friends` → cần `user_follows`, mà frontend hiện không có UI theo dõi ai
  (`src/user/user.controller.ts:48-68` có route, nhưng không trang nào gọi). Nhánh này sẽ chỉ
  trả về chính mình.

Ba vấn đề hình dạng, mỗi cái dẫn được:

1. **Bảng xếp hạng sẽ toàn "Khách ####".** `auth.service.ts:155` đặt
   `name: 'Khách ' + id.slice(0,4).toUpperCase()` (trong khối `user.create` mở ở `:153`). `displayNameFor`
   (`src/leaderboard/leaderboard.helpers.ts:62-67`) chỉ ẩn danh những tên khớp
   `looksLikeTestName` (`:40-59`: `^test`, `^demo`, `^user\d*$`, `^abc`, …). `"Khách A1B2"`
   **không khớp mẫu nào**, nên nó hiện nguyên văn. Phòng lofi thì vẽ 10 tên người thật ở
   `data.js:59` (`LB`). Nối dữ liệu thật vào là có một bảng 20 dòng "Khách 7F3A".
2. **Avatar là emoji theo chữ cái đầu**, không phải ảnh: `avatarForName`
   (`leaderboard.helpers.ts:31-34`) map `a→🦊 … z→🦓`, mặc định `🙂`. Mọi khách tên "Khách …"
   đều nhận `🐱` (chữ `k`). Phòng lofi dùng **màu** cho mỗi dòng (`data.js:59`, phần tử thứ 3
   là mã màu), không dùng emoji.
3. **`entries` không kèm `streak`** ở nhánh xp/weekly/streak: `buildResponse` (`:150-168`) chỉ
   map `{id, name, avatar, value, rank, is_me}`. Chỉ `buildFriends` (`:106-140`) có thêm
   `streak` (`:129`). Nếu màn "rank" muốn hiện cả XP và chuỗi ngày cùng lúc thì phải gọi hai
   lần (`?type=xp` + `?type=streak`) và ghép ở client — hoặc sửa `buildResponse`.
   Thêm một bất đối xứng nhỏ: `buildFriends` trả `type: 'friends'` (`:136`) còn ba nhánh kia
   **không trả field `type`** — client không phân biệt được response của `?type=xp` với
   `?type=weekly`.

### 3.3 Chuỗi ngày — đủ dữ liệu, một chỗ cần quyết

`GET /api/stats` trả `streak` + `streakActive` (`stats.service.ts:87-96`), và
`GET /api/streak/review-quiz-status` trả `streak` + `lessons_completed` của hôm nay. Đủ cho thẻ
"chuỗi N ngày" ở `calNote` của phòng lofi.

Nhưng **lịch tường của phòng lofi cần hơn thế**: `engine.js:74` `const STREAK = 12` ghi cứng,
và `monthCells()` (`engine.js:77-80`) khoanh đỏ các ngày `d < today && d >= today - STREAK` —
tức nó **giả định chuỗi là một dải liền không ngắt** ngược từ hôm nay. API chỉ cho một con số
`streak`, không cho **tập hợp ngày đã học**. Dữ liệu ấy có trong DB
(`user_daily_xp_logs.log_date`) nhưng **không endpoint nào trả nó ra**:
`GET /api/stats/xp-by-course` (`stats.controller.ts:52`) nhóm theo `courseId`, không theo ngày.
Vậy: vẽ lịch đúng cần một endpoint mới (hoặc một field mới) trả danh sách `log_date` của ~35
ngày gần nhất.

---

## 4. Rủi ro nhúng `engine.js` vào Next 16 + React 19

Trước hết, **chỉnh lại một con số trong đề bài**: `lib/studyroom/engine.js` không phải "~trăm
dòng" mà là **976 dòng** (`wc -l`). Cùng thư mục: `shell.js` 136 dòng (markup tĩnh),
`data.js` 72 dòng (nhưng dòng 12 và 13 là hai object JSON một dòng, chứa toàn bộ toạ độ 28 cuốn
sách + vùng chạm + hình học lịch), `app/globals.css` 543 dòng. `components/StudyRoom.tsx` chỉ
31 dòng.

### 4.1 StrictMode chạy effect hai lần — ĐÃ ĐƯỢC LƯỜNG, nhưng còn một lỗ

`next.config.mjs:5` bật `reactStrictMode: true` **có chủ ý**, chú thích `:3-4` nói rõ
"StudyRoom mounts/unmounts the engine cleanly". Và nó làm thật:

- `StudyRoom.tsx:19-28`: effect `[]` → `host.innerHTML = SHELL_HTML`, `initStudyRoom(host)`,
  cleanup `dispose(); host.innerHTML = ""`.
- `engine.js:12-20` dựng một **tầng lifecycle đầy đủ**: biến `dead`, bốn tập theo dõi
  (`offs`, `timers`, `rafs`, `spines`), và **shadow các global** — `const setTimeout`,
  `setInterval`, `requestAnimationFrame` được khai lại ở `:15-19` để mọi lời gọi bên trong
  engine tự vào tập theo dõi VÀ tự kiểm `dead` trước khi chạy callback. Đây là cách làm đúng,
  đáng giữ nguyên.
- `dispose()` (`:968-975`) xoá timer, huỷ rAF, gọi mọi `off()`, xoá các `spine` đã
  `document.body.appendChild` (`:692` — **chỗ duy nhất** engine ghi DOM ngoài `host`), và trả
  `--side` trên `documentElement` về (`:974`, đặt ở `:230`).
- Listener gắn trực tiếp vào node **bên trong** `host` (`:302-307` các vùng chạm, `:313-316`
  menu, `:941-954` bảng cài đặt) không qua `on()` — nhưng chúng chết cùng `host.innerHTML = ""`
  nên không rò. Listener trên `window`/`document` thì **đều** qua `on()`:
  `:479` keydown, `:942` click, `:955` visibilitychange, `:963` resize. Kiểm được bằng grep: ba
  lời gọi `document.addEventListener`/`window.addEventListener` trần — không có.

**Lỗ còn lại, một chỗ:** `engine.js:965-967`

```js
const img = $('#roomImg');
const start = () => { layout(); const h = location.hash.slice(1); if (ROUTES.includes(h)){ … go(h); } else runIntro(); };
if (img.complete) start(); else img.addEventListener('load', start, {once:true});
```

`start` **không kiểm `dead`**. Ở lần mount thứ nhất của StrictMode, nếu `room.webp` (173,7 KB)
chưa tải xong lúc effect bị cleanup, `img` bị bỏ khỏi DOM nhưng node vẫn còn tham chiếu và sự
kiện `load` của một ảnh đã tách khỏi tài liệu **vẫn có thể bắn**. Khi đó `start()` chạy trên
cảnh đã chết: `layout()` đọc `app.clientWidth` = 0 (node detached) rồi `focusCam` chia cho 0, và
`runIntro()` khởi động một chuỗi animation trên node không còn trong tài liệu. Không nổ ngoại
lệ, chỉ là một lượt chạy rác — nhưng nó cũng gọi `$('#tod').value = hh` v.v. Bản sửa rẻ:
`const start = () => { if (dead) return; … }`. **Chưa kiểm bằng cách chạy thật** (không có
browser trong phiên này); đây là suy luận từ code, nhưng cái `if (dead) return` thì đúng vô
điều kiện vì mọi nhánh khác của engine đã có nó.

Một chỗ nữa nên biết: `engine.js:18` `const clearInterval = clearTimeout`, và `clearTimeout`
(`:17`) gọi `window.clearTimeout(id)`. Trong trình duyệt hai hàm này dùng chung bảng timer nên
huỷ interval bằng `clearTimeout` vẫn đúng — nhưng `dispose()` cũng chỉ gọi
`window.clearTimeout` cho mọi id trong `timers` (`:970`), nên ba interval (`:211` đồng hồ 30 s,
`:958` đếm ngược 60 s, và `leafTimer`) vẫn được huỷ. Đúng, chỉ là khó đọc.

### 4.2 Hydration mismatch vì bầu trời đổi theo giờ thật — KHÔNG XẢY RA, vì một lý do có giá

`StudyRoom.tsx:30` trả về `<div ref={hostRef} />` — **rỗng**. Toàn bộ markup vào DOM trong
`useEffect` (`:22`). Server render ra một `<div></div>`, client render ra một `<div></div>`.
Không có gì để lệch. Mọi nguồn phi tất định đều nằm sau hàng rào effect:

- `engine.js:27` `matchMedia('(prefers-reduced-motion: reduce)')`
- `engine.js:77` `new Date()` cho lịch tháng, `:200` `nowH()` cho giờ bầu trời, `:961` boot
- `engine.js:146-166` — `Math.random()` cho 26 ngôi sao, 140 hạt mưa (2 × 70), 16 hạt bụi, 54
  bóng đèn; `:362-364` cho giấy nhớ; `:957` `Date.now()` cho đếm ngược
- `engine.js:966` `location.hash`

**Nhưng cái giá là thật và phải nói rõ:** trang chủ gửi về **không một byte nội dung nào**.
Không SEO, không LCP từ HTML, không có gì khi JS lỗi hoặc chặn. Repo hiện tại đi hướng ngược
lại: `frontend/src/lib/catalog.ts` tồn tại **chính vì** muốn trang chủ và `/courses/*` render
được nội dung mà không gọi API (chú thích `catalog.ts:4-8`). Nhúng phòng lofi làm trang chủ là
bỏ cái tính chất đó. Nếu muốn giữ, phải render một lớp nội dung tĩnh (tên khoá, số bài, nút
vào học) **bên ngoài** `hostRef` và để engine phủ lên — chứ không phải đưa engine lên server.

### 4.3 `prefers-reduced-motion`

- Đọc **một lần** lúc init: `engine.js:27` `let RM = matchMedia(…).matches`, rồi `:28`
  `app.classList.add('rm')`.
- **Không có listener `change`** trên MediaQueryList (grep `matchMedia` ra đúng một kết quả).
  Người dùng bật "giảm chuyển động" giữa phiên thì cảnh không đổi cho tới khi tải lại trang.
- `RM` được tôn trọng rất kỹ ở chỗ nó được đọc: `setTOD` (`:204`), `tweenCam` (`:265`),
  `typeS` (`:114`), `clouds` (`:217`), và ~60 lời gọi `.animate(…, {duration: RM?1:…})`. Tức
  logic đúng, chỉ thiếu phần phản ứng động.
- Có **một toggle trong UI** ghi đè được: `:949` `tog(tRm, v => { RM = v; … })`. README.md của
  bản port nói đúng điều này ("Respects `prefers-reduced-motion`; there is also a toggle").
- Lưu ý nhỏ nhưng dễ bỏ sót: `duration: 1` (ms) thay vì `0` — animation vẫn chạy, chỉ là trong
  một frame. Với `prefers-reduced-motion`, một lượt animate 1 ms là chấp nhận được; nhưng
  `app.classList.add('rm')` mới là thứ tắt các animation CSS (`globals.css`), và nó chỉ được
  thêm **nếu** `RM` đúng lúc init.

### 4.4 Dọn dẹp khi chuyển trang

- Trong một SPA Next, rời khỏi `/` sang `/lesson/...` ⇒ `StudyRoom` unmount ⇒ effect cleanup ⇒
  `dispose()`. Đường này sạch (xem §4.1).
- **Nhưng engine không hợp tác với router của Next chút nào.** Nó có hệ route RIÊNG:
  `engine.js:141` `const ROUTES = [...]`, `:604` `async function go(r, o)`, `:624`
  `async function back()`, và `:966` đọc `location.hash` **đúng một lần lúc boot**.
  Grep `hashchange|popstate|pushState|replaceState|history.` trên 976 dòng: **0 kết quả**.
  Hệ quả cụ thể:
  - URL **không đổi** khi người dùng mở màn "Thành tựu". Reload = về phòng.
  - Nút Back của trình duyệt **không** đóng màn đang mở; nó rời khỏi trang.
  - `/#courses` chỉ hoạt động khi đó là **lần tải trang đầu**. Điều hướng bằng `<Link href="/#courses">`
    từ một trang Next khác sẽ mount `StudyRoom` và lúc đó `location.hash` đã là `#courses` nên
    may là vẫn chạy — nhưng `<Link href="/#courses">` từ **chính** `/` thì chỉ đổi hash, không
    remount, và không listener nào nghe.
  - `Escape` được bắt (`:479`) để đóng màn/huỷ intro — tốt, nhưng nó là `on(window, 'keydown')`,
    nghĩa là **khi phòng lofi đang mount, nó ăn `Escape` của cả trang**. Nếu sau này trên cùng
    trang có modal của React, hai thứ sẽ tranh nhau.
- Một chi tiết hạ tầng: `:692` `document.body.appendChild(sp)` — các "spine" (gáy sách bay) sống
  **ngoài** `host`. `dispose()` xoá chúng (`:973`), nhưng chúng cũng nằm ngoài mọi stacking
  context mà React quản. Nếu trang có header/overlay riêng, z-index sẽ cần canh tay.

### 4.5 Ba thứ nữa, không thuộc bốn câu hỏi nhưng sẽ chặn merge

1. **Phiên bản lệch.** Bản port khai `next: ^15.0.0` (`package.json`), repo đang
   `next: 16.2.10` + `react 19.2.4` (`frontend/package.json:17-19`). React 19 thì khớp; Next
   15 → 16 cần kiểm lại `next/font/google` (bản port dùng 4 họ font ở `app/layout.tsx:7-30`).
   **Chưa kiểm** bằng build thật.
2. **CSP `style-src`.** Engine chèn markup có **thuộc tính `style=` nội tuyến** qua
   `insertAdjacentHTML`/`innerHTML`: `engine.js:60` (lớp `shine` của cúp, mask-image),
   `engine.js:90-91` (thẻ `calNote` + `calSvg`), và `shell.js` có 4 chỗ `style=`. Những chỗ
   này **cần `style-src 'unsafe-inline'`** — repo đang có (`next.config.ts:30`), nên chạy được
   ngay. Nhưng nó **thêm một nguyên nhân thứ ba** vào bẫy đã ghi trong AGENTS.md ("còn hai
   nguyên nhân, không phải một"): sau khi dọn 70 handler legacy và 257 `style={{…}}`, vẫn còn
   engine. Lưu ý phân biệt: ~200 chỗ engine gán `el.style.x = …` hoặc
   `Object.assign(el.style, …)` (CSSOM) **không** bị CSP chặn; chỉ `style=` trong chuỗi HTML
   mới bị.
3. **Không dùng `next/image`.** `shell.js` có 7 thẻ `<img>` thô, `engine.js:60`/`:64` sinh
   thêm 2 × 28 = 56 thẻ `<img>` cho sách/vật + lớp phát sáng. Tất cả URL **gốc tuyệt đối**
   (`/items/…`, `/room.webp`) — README.md của bản port cảnh báo: deploy dưới `basePath` thì
   phải prefix. Không có `basePath` trong `frontend/next.config.ts` hiện tại, nên tạm ổn.

---

## 5. Cân nặng tài sản — số đo thật

`public/` của `C:\Users\sonkh\Downloads\study-room-next\goc-hoc-pe`:

| Hạng mục | Số đo |
|---|---|
| **Tổng** | **1 941 770 byte = 1,85 MB**, **102 tệp** |
| Định dạng | 97 `.webp` + 5 `.png` |
| Tệp nặng nhất | `public/items/page/board-empty.webp` — **289,4 KB** |
| Thứ hai | `public/room.webp` — **173,7 KB** |
| Thứ ba | `public/items/page/notebook-open.webp` — 74,4 KB |
| Thứ tư | `public/swag.png` — 69,3 KB (PNG, không phải WebP) |
| Thứ năm | `public/cloud-body.png` — 53,4 KB (PNG) |
| Theo thư mục | `items/` **1 477 KiB** (77,9 % tổng), 419 KiB còn lại ở gốc (trong `items/`: `page/` 529 KiB, `held/` 187 KiB, 761 KiB ở gốc `items/`) |

Năm tệp `.png` (`swag.png` 69,3 KB, `cloud-body.png` 53,4 KB, `cloud-light.png` 41,4 KB,
`sky-mask.png`, `items/page/book-cover-mask.png`) là ứng viên rõ ràng để chuyển sang WebP — hai
cái đầu một mình đã 122,7 KB.

### So với trần mà repo tự đặt

**Phải nói thẳng: trong cây làm việc hiện tại (`main` @ `070886a`), repo KHÔNG tự đặt trần nào
cho ảnh.** Đã kiểm: `frontend/e2e/unit/` chỉ có 10 tệp test
(`catalog-naming`, `editor-load-gate`, `feedback-link`, `forum-xss`, `ide-brief-code`,
`ide-handoff`, `ide-runner-error`, `ide-trace`, `prewarm-gate`, `studio-lesson`) — không có
`world-map.test.mjs`, `star-map.test.mjs`, `room-art.test.mjs`, và không có ca nào đo dung
lượng tệp. Những trần được AGENTS.md (bản 20/10, trong context) nhắc tới đều thuộc nhánh
`chiem-tinh`:

| Trần (nhánh `chiem-tinh`) | Giá trị | Đo được lúc đó |
|---|---|---|
| Bản đồ thế giới, mỗi tệp SVG | 900 KB | 830 KB |
| Bản đồ sao, tổng 20 tệp | 900 KB (và 420 KB mỗi tệp) | 450,7 KB |
| Tiền cảnh `room-ban.svg` † | 380 KB | 378,4 KB |
| Tiền cảnh `room-ban-doc.svg` † | 200 KB | 192,1 KB |

† **Sửa 22/10: hai dòng này KHÔNG thuộc `chiem-tinh`.** `scripts/room/`,
`frontend/src/lib/room-art.ts`, `frontend/public/map/room/*.svg` và `room-art.test.mjs` chỉ
có ở nhánh **local** `fix/danh-gia-toan-ven` (`cf4ff42`), chưa đẩy lên remote nào — kiểm bằng
`git ls-tree` trên cả bốn nhánh local. AGENTS.md của `chiem-tinh` nhắc tới chúng, cây mã của
`chiem-tinh` thì không có.

Đối chiếu:

- **Từng tệp thì phòng lofi lọt thoải mái**: 289,4 KB của `board-empty.webp` nằm dưới cả trần
  380 KB khắt khe nhất, và dưới trần 420 KB/tệp của bản đồ sao.
- **Tổng thì vượt gấp đôi**: 1,85 MB so với mốc "900 KB tổng" từng áp cho cả một bản đồ 19–20
  tệp. Nhưng so sánh này **không công bằng về bản chất** và đừng dùng nó để ra quyết định: 900
  KB kia là trần cho **SVG sinh ra bằng script** (nén được, mỗi KB là nét vẽ, và script tự
  chặn), còn 1,85 MB đây là **ảnh bitmap đã nén WebP** — không có `DENSITY` nào để hạ.
- Mốc so sánh **đúng hơn** là chính `frontend/public` hiện tại: bỏ `pyodide/` ra thì nó là
  **346 tệp / 13 801 534 byte = 13,16 MiB**, trong đó `monaco/` **8 938 KiB** và `static/`
  **4 537 KiB** (hai cái cộng lại đã gần hết tổng). Ảnh nặng nhất đang có là
  `public/static/images/python-logo.png` — **242,7 KiB**. Tức **repo đã chứa một ảnh PNG 242,7
  KiB**, nên 289,4 KiB của `board-empty.webp` không phải một bước nhảy về thể loại.
  (Sửa 22/10: bản đầu ghi `monaco/` 9 458 KB + `static/` 5 585 KB, hai số ấy cộng lại
  **vượt** cái tổng 13,23 MB của chính nó. Số trên đây đo bằng kích thước blob trong git của
  `main`, nên không bị CRLF của cây làm việc làm phồng.)
- Thứ cần canh không phải tổng, mà là **bao nhiêu byte vào trang ở lần tải đầu**: `room.webp`
  (173,7 KiB) là ảnh nền duy nhất bắt buộc; 56 thẻ `<img>` của sách/vật (`engine.js:60`, `:64`)
  **được tạo ngay lúc init, tất cả cùng lúc**, không lazy-load — đó là `items/` = **1 477 KiB**
  vào thẳng đường nạp trang chủ. `items/page/` (board-empty, notebook-open, book-open,
  phone-frame, calendar, note, book-cover…) chỉ cần khi mở một màn, nhưng
  `board-empty.webp` 289,4 KB có khả năng được nạp trước — **chưa kiểm** (cần đọc kỹ chỗ engine
  dựng các "page prop", hoặc đo bằng Network panel).

---

## Quyết định cần người chốt

1. **Nhánh nào là nền của frontend mới?** `main` hiện ở `070886a` (cây 14/10). Nhánh
   `chiem-tinh` giữ 95 commit thiết kế **cộng với** những thứ không phải thiết kế mà commit
   revert liệt kê là "lùi theo, cần thì cherry-pick": dọn lint backend 155 → 2 (trần CI 10),
   149 gợi ý ô điền chỗ trống, bản vá bẫy phát đáp án, mini-game "Sổ quỹ chung" (T05), nút
   "Màn trước", đánh số ô ①②③, bản vá tương phản 1,34:1. **Và `apiFetchSessionOnly` nằm trong
   số đó** — luật "trang công khai không được tự tạo tài khoản khách" hiện **không có code thi
   hành** ở `main`. Phải chốt: cherry-pick những gì sang trước khi dựng frontend mới? Tôi không
   tự quyết được vì nó là quyết định về sản phẩm + tiến độ, không phải kỹ thuật.
2. **Repo frontend mới có mang theo `scripts/pe-v4/` hay không?** Hai test
   (`ide-brief-code.test.mjs:27`, `prewarm-gate.test.mjs:34`) đọc
   `scripts/pe-v4/out-advanced/`, và `curricula.json` được sinh từ đó. Ba đường: (a) chép
   `out-advanced/` thành tài sản đã commit trong repo frontend; (b) publish nó thành một package
   npm; (c) để hai test đó ở lại repo backend. Mỗi đường đổi một thứ khác nhau (ai chạy
   `sync_curricula.py`, ai chịu trách nhiệm khi hai nguồn lệch).
3. **Chuỗi 8 giờ: bỏ bản chép ở frontend, hay để backend công bố hạn?** Hai cách đã nêu ở
   §1.3 (backend trả hạn trong body `/auth/refresh` + `/auth/guest`; hoặc bỏ `max-age` cho cờ
   thành session cookie). Cách hai rẻ hơn nhưng làm cờ mất hiệu lực khi đóng tab — cần biết có
   ai dựa vào việc nó sống qua phiên không.
4. **Thành tựu: ai viết 24 định nghĩa huy hiệu, và viết vào đâu?** Bảng `achievements` không có
   code nào ghi vào (§3.1). Phải quyết: (a) thêm một seed `prisma/seed-achievements.js`;
   (b) giữ danh mục ở file tĩnh phía frontend như `catalog.ts` và chỉ lấy `unlocked` từ API;
   (c) `INSERT` tay. Kèm theo: **`Achievement` không có cột bậc** (bronze/silver/gold/soon) mà
   phòng lofi cần — thêm cột nullable là hợp lệ với ràng buộc migration (AGENTS.md:55-56),
   nhưng cũng có thể suy ra bậc từ `conditionValue`. Và **phải chạy
   `SELECT count(*) FROM achievements;` trước khi quyết** — tôi không nối DB.
5. **`Badge`/`UserBadge` (`schema.prisma:341-363`) tính sao?** Hai bảng này không có một dòng
   code nào đọc/ghi. Xoá không được (DB dùng chung với Django, AGENTS.md:55-56). Chốt: coi
   `achievements` là hệ duy nhất và ghi điều đó vào AGENTS.md, hay định dùng `badges` cho
   "huy hiệu" còn `achievements` cho "thành tựu"?
6. **Bảng xếp hạng với toàn khách ẩn danh: hiện gì?** Mọi tài khoản thử nghiệm tên
   `Khách XXXX` (`auth.service.ts:155`) và `looksLikeTestName` không nhận ra chúng. Ba đường:
   (a) thêm `^khách` vào `looksLikeTestName:45-57` để ẩn danh thành `Học viên #id`;
   (b) cho khách tự đặt tên ở màn Điện thoại (cần `PUT /api/user`, đã có ở
   `user.controller.ts:30`); (c) lọc hẳn `@guest.local` khỏi bảng xếp hạng. Đây là quyết định
   sản phẩm về buổi thử nghiệm.
7. **`entries` của bảng xếp hạng có thêm `streak` không?** Hiện chỉ nhánh `friends` có
   (`leaderboard.service.ts:129`, trong `buildFriends` `:106-140`, so với `buildResponse`
   `:150-168`). Nếu màn "rank" muốn một bảng vừa XP vừa chuỗi,
   phải chọn: sửa `buildResponse` (đổi hợp đồng API), hay client gọi hai lần.
8. **Lịch tường của phòng lofi lấy ngày học ở đâu?** `engine.js:74-80` cần một **tập ngày**,
   API chỉ có một **con số** `streak`. Dữ liệu có trong `user_daily_xp_logs` nhưng không
   endpoint nào trả. Chốt: thêm field vào `/api/stats`, thêm endpoint mới, hay chấp nhận vẽ
   lịch bằng dải liền suy ra từ `streak` (sẽ sai khi người học ngắt rồi học lại)?
9. **"Khóa học" = ba kệ 28 cuốn, nhưng thực tế một khoá 48 bài.** Ánh xạ thế nào: một cuốn =
   một **module** của giáo trình (`curricula.json` có `modules[].lessons[]`), hay một cuốn =
   một bài và phải vẽ thêm hình? Và nếu dùng module thì vùng chạm trong `data.js:12`
   (`DATA.hits`) phải vẽ lại — đó là công việc thiết kế, không phải code.
10. **Trang chủ có cần nội dung render từ server không?** Phòng lofi gửi về một `<div>` rỗng
    (§4.2), trong khi `catalog.ts:4-8` tồn tại chính vì muốn ngược lại. Chốt: chấp nhận mất
    SEO/LCP của trang chủ, hay dựng một lớp nội dung tĩnh bên ngoài `hostRef`?
11. **Routing: engine giữ hệ route riêng, hay nối vào Next router?** Hiện 0 lời gọi
    `history`/`hashchange` (§4.4): URL không đổi, Back không đóng màn, `Escape` bị engine ăn
    toàn trang. Nối vào router là sửa `go()`/`back()` — việc không nhỏ và đổi hành vi người
    dùng thấy được.
12. **OAuth: dựng lại `/auth/callback` + `/login`, hay giữ nguyên chế độ chỉ-khách?** Backend
    có đủ hai luồng Google/Facebook (`auth.controller.ts:152-229`) nhưng frontend không có
    trang nhận. Nếu màn "Điện thoại · hồ sơ" có nghĩa thật thì phải quyết.
13. **`prefers-reduced-motion`: thêm listener `change` hay giữ đọc-một-lần?** `engine.js:27`
    đọc một lần; có toggle tay ở `:949`. Thêm listener là ba dòng, nhưng phải quyết nó ghi đè
    hay bị ghi đè bởi toggle tay.
14. **Ngân sách tài sản cho frontend mới.** Hiện **không có trần nào** trong cây làm việc
    (§5); mọi trần trong AGENTS.md là của SVG sinh ra, ở nhánh khác, và không áp được cho ảnh
    bitmap. Nếu muốn một lưới an toàn thì phải tự đặt con số và viết một ca test — và con số
    nên là **byte vào trang ở lần tải đầu**, không phải tổng `public/`. Tôi không tự đặt được
    vì nó phụ thuộc vào đường truyền của phòng máy USTH, thứ tôi không đo được.

---

## Ghi chú soát lại (22/10/2026, lúc commit vào `design/v4`)

Đã đối chiếu từng `tệp:dòng` với cây `main` @ `070886a` — đúng cái cây mà tài liệu khai ở đầu
(và `git diff 2c12049 main` rỗng, nên §0 nói đúng về việc revert là một commit đắp lên). Phần
lớn khớp nguyên văn. Năm nhóm đã sửa:

1. **`achievements.service.ts` lệch đúng −14 dòng ở MỌI chỗ dẫn.** Tệp chỉ có 135 dòng, nên
   `:114-148` còn không tồn tại được. Sửa: `:34-53`→`:20-39`, `:82`→`:68`, `:103`→`:89`,
   `:114-148`→`:100-134`, `:123-147`→`:109-133`.
2. **`leaderboard.service.ts` lệch −13.** Sửa: `:33-64`→`:20-51`, `:67-116`→`:54-103`,
   `:137-145`→`:106-140`, `:149`→`:136`, `:156-181`→`:143-168`, `:167-174`→`:150-168`.
3. **§0 nói quá về `apiFetchSessionOnly`** — tên ấy có trong `AGENTS.md:185` của chính `main`,
   không chỉ trong `.next/`. Kết luận giữ nguyên và còn mạnh hơn.
4. **Số đo tài sản**: `items/` là **1 477 KiB (77,9 %)**, không phải 1 672 KB (86 %); gốc
   `public/` 419 KiB, không phải 270 KB. Hai con số `monaco/` + `static/` của bản đầu cộng lại
   vượt cái tổng của chính nó — đã đo lại bằng blob git.
5. **Bốn thứ khác**: 13 trang `page.tsx` (không phải 14); `auth.service.ts:159`→`:160`;
   `auth.service.ts:153-162`→`:155`; `courses.service.ts:151-176`→`:143-178`; và hai dòng
   "tiền cảnh" trong bảng trần §5 không thuộc nhánh `chiem-tinh`.

Đã kiểm và ĐÚNG nguyên văn (không sửa): toàn bộ `api.ts`, `pe-bridge.js`, bốn tệp JS legacy,
`refresh-cookie.ts`, `oauth-state.ts`, `auth.controller.ts`, `env.validation.ts`,
`app.config.ts`, `cors.middleware.ts`, `api-gateway.setup.ts`/`.module.ts`,
`jwt-auth.guard.ts`, `current-user.decorator.ts`, `refresh-token.service.ts`,
`stats.*`, `quizzes.service.ts`, `roadmap.*`, `courses.controller.ts`, `lessons.*`,
`user.*`, `notifications.*`, `streak.service.ts`, `schema.prisma`, `migration.sql:324`,
`catalog.ts`, `next.config.ts` (kể cả `:49-50`), `playwright.config.ts`, `README.md:75`,
`AGENTS.md` (mốc 14/10 ở `:33-43`), `ci.yml` (job `backend` 12-71, `TRAN = 283` ở `:58`, job
`frontend` ở `:73`), 10 tệp test trong `frontend/e2e/unit/`, cả hai phép grep "0 kết quả",
`engine.js` 976 dòng / `shell.js` 136 / `data.js` 72 / `globals.css` 543 /
`StudyRoom.tsx` 31, `next.config.mjs:5`, và tổng `public/` của bản port
(1 941 770 byte, 102 tệp, 97 webp + 5 png, năm tệp nặng nhất).
