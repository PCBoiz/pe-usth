# Backend cần cấp gì cho frontend lofi — danh sách bàn giao

Viết 22/10/2026. Người đọc: nhóm làm **backend ở repo cũ**.
Frontend "góc học lofi": bản port đang nằm ngoài git
(`C:\Users\sonkh\Downloads\study-room-next\goc-hoc-pe`) và **chưa được commit vào nhánh
nào** của `PCBoiz/pe-usth` tính tới 22/10/2026. Nhánh `test` (`fa42c05`, 20/10) mang một
**dashboard dựng theo Figma** cộng mini-game, không phải phòng lofi — `git ls-tree test`
không ra một tệp `studyroom`/`room.webp` nào.

Mọi khẳng định dưới đây đọc ra từ code, kèm `tệp:dòng`. Chỗ chưa kiểm được thì ghi thẳng.

---

## A. Chặn người test ngay buổi đầu

### A1. Kệ cúp rỗng vĩnh viễn — và nó rỗng IM LẶNG

**Không một dòng code nào ghi vào bảng danh mục thành tựu.** Tìm `achievement.create`, `achievement.upsert`, `insert into achievements` trên `src/`, `scripts/`, `prisma/` (trừ `src/generated/`): **0 kết quả**.

`achievements.service.ts:68` có `if (all.length === 0) return []`. Nên khi danh mục rỗng:
- `/api/achievements` trả **HTTP 200** với `{ok: true, achievements: []}`
- không ngoại lệ, không log đỏ, không ai được trao gì — vĩnh viễn

Phần tính toán thì **đã đủ**: `getMetrics` dựng được 4 chỉ số thật. Thiếu đúng phần **định nghĩa** huy hiệu.

Cần: khoảng 24 định nghĩa huy hiệu (điều kiện + tên + mô tả), và quyết định ghi chúng vào đâu (seed? migration? bảng cấu hình?).

Thêm: model `Achievement` **không có cột bậc** (đồng/bạc/vàng) mà căn phòng cần để xếp cúp lên kệ.

> **Chưa kiểm:** bảng `achievements` trên Neon hiện có bao nhiêu dòng. Cần chạy `SELECT count(*) FROM achievements;` trước khi quyết — mình không nối DB.

### A2. `Badge` / `UserBadge` là hệ thứ hai đã chết

**0 lời gọi trong `src/`.** Nhưng DB dùng chung với bản Django nên **không được xoá cột/bảng** (ràng buộc trong AGENTS.md: migration chỉ được THÊM).

Cần quyết: bỏ qua hẳn, hay gộp về một hệ?

### A3. Bảng xếp hạng sẽ toàn "Khách 7F3A"

Dữ liệu XP là **thật** — `user_daily_xp_logs` được ghi ở `lessons.service.ts:452-463` và `stats.service.ts:180-192`.

Nhưng `auth.service.ts:155` đặt tên tài khoản khách là `Khách XXXX`, và frontend đã gỡ đăng nhập nên **ai vào cũng là khách**. Avatar sinh theo chữ cái đầu ⇒ mọi người cùng một 🐱.

**Chủ sản phẩm đã chốt hướng xử lý:** cho người test tự đặt **tên hiển thị**, lưu ở máy, gửi kèm khi ghi XP.

Cần ở backend:
- nhận thêm một trường tên hiển thị khi ghi XP / hoàn thành bài
- lưu nó, và trả nó ra ở `/api/leaderboard`
- giới hạn độ dài + lọc bậy (trường này do client gửi, không tin được)

### A4. `entries` của bảng xếp hạng thiếu `streak`

Chỉ nhánh `friends` có `streak`; ba nhánh `xp` / `weekly` / `streak` thì không.

Cần quyết: thêm vào hợp đồng API, hay để client gọi hai lần?

### A5. Lịch tường cần TẬP NGÀY, API chỉ có MỘT SỐ

Căn phòng vẽ một tờ lịch có đánh dấu từng ngày đã học. API hiện chỉ trả con số `streak`.

Dữ liệu **đã có** trong `user_daily_xp_logs`, chỉ là **không endpoint nào trả ra**.

Cần: một endpoint trả danh sách ngày có học trong khoảng (ví dụ 90 ngày gần nhất).

---

## B. Sai endpoint — sửa ở frontend, nhưng backend cần biết

### B1. Màn "Khóa học" phải gọi `GET /api/enrolled`, không phải `/api/courses-enrolled`

Chỉ `getEnrolled()` trả `completedLessonNumbers` — thứ cần để tô từng cuốn sách theo tiến độ.

### B2. Phòng mô hình 3 kệ / 28 cuốn, thực tế còn 1 khoá

`catalog.ts` hiện chỉ còn `python_advanced` (48 bài). Đây là việc **thiết kế**, không phải backend — ghi ở đây để hai bên không hiểu nhầm là thiếu dữ liệu.

---

## C. Tách hai repo thì vỡ những gì

### C1. `NEXT_PUBLIC_API_URL` phải có LÚC BUILD — hỏng kiểu khó tìm nhất

`next.config.ts:34` **nướng** biến này vào CSP `connect-src`. Quên đặt lúc build ⇒ **mọi lời gọi mạng bị chặn ở tầng CSP**, và **không log server nào thấy** vì request không bao giờ rời trình duyệt.

Đây là thứ sẽ tốn nửa ngày nếu không ai biết trước.

### C2. `REFRESH_COOKIE_SAMESITE=none` đúng, nhưng có bẫy ngược ở dev

`refresh-cookie.ts:26`: `secure: NODE_ENV==='production' || site==='none'`.

Nên đặt `none` ở **dev local chạy HTTP** ⇒ trình duyệt **từ chối cookie** ⇒ refresh không bao giờ chạy, và triệu chứng là "tự nhiên mất phiên".

### C3. Còn thiếu, ngoài SameSite

- thêm origin của frontend vào `ALLOWED_ORIGINS` — **bắt buộc, không nhận wildcard**
- `FRONTEND_URL` cho redirect sau OAuth
- CORS hiện chỉ phủ `/api` + `/auth` (`cors.middleware.ts:6`)
- `credentials: 'include'` đã đúng sẵn ở 3 chỗ cần

### C4. Hạn 8 giờ bị chép ở 4 chỗ trong frontend — sau khi tách thì không ai kiểm được

`JWT_REFRESH_EXPIRES` ở repo backend, bốn bản chép `max-age=28800` ở repo frontend. **Không typecheck / lint / test / CI nào đi qua ranh giới hai repo.**

Đề nghị: **backend công bố hạn trong body của `/auth/refresh`**, frontend đọc theo. Một nguồn thay vì năm.

Tin tốt: cờ `pe_has_session` giờ **chỉ là phép tối ưu để khỏi gọi mạng vô ích**, không phải cổng bảo mật — nên sửa chỗ này rẻ.

### C5. `curricula.json` sinh ở repo backend, dùng ở repo frontend

`scripts/pe-v4/sync_curricula.py` sinh ra nó. Bộ sinh ở repo A, đích ở repo B.

Thêm: hai ca test của frontend đọc ngược ra ngoài thư mục `frontend/` —
`frontend/e2e/unit/ide-brief-code.test.mjs:27` và `prewarm-gate.test.mjs:34` đọc `../../../scripts/pe-v4/out-advanced/`. Tách repo là **hai ca này trượt**.

Cần quyết: repo frontend có mang `scripts/pe-v4/` theo không, hay `curricula.json` được publish như một gói?

---

## Tóm tắt việc cho backend, xếp theo mức chặn

| # | Việc | Chặn gì |
|---|---|---|
| 1 | Viết + nạp ~24 định nghĩa huy hiệu (+ cột bậc) | Màn Thành tựu rỗng hoàn toàn |
| 2 | Nhận + lưu + trả **tên hiển thị** | Bảng xếp hạng toàn "Khách 7F3A" |
| 3 | Endpoint trả **tập ngày đã học** | Lịch tường không vẽ được |
| 4 | Đặt `ALLOWED_ORIGINS`, `FRONTEND_URL`, `REFRESH_COOKIE_SAMESITE` | Frontend không gọi được gì |
| 5 | Công bố hạn phiên trong body `/auth/refresh` | Cookie và token lệch nhau, không ai phát hiện |
| 6 | Thêm `streak` vào `entries` | Phải gọi hai lần |
| 7 | Quyết `Badge`/`UserBadge` | Nợ kỹ thuật, chưa chặn gì |

---

## Chưa kiểm, cần người có quyền truy cập xác nhận

- số dòng thật trong bảng `achievements` trên Neon
- Safari/ITP có giữ cookie `pe_refresh` cross-site không
- `next` 15 → 16 có làm vỡ `next/font/google` của bản port phòng học không

---

## Ghi chú soát lại (22/10/2026, lúc commit vào `design/v4`)

Đã đối chiếu từng `tệp:dòng` của tài liệu này với cây mã `main` @ `070886a` (cây này giống
hệt `2c12049` — `git diff 2c12049 main` rỗng) và với `chiem-tinh` @ `3e6cc99`; hai nhánh
không khác nhau ở các tệp backend được dẫn. Ba chỗ đã sửa:

- `achievements.service.ts:82` → **`:68`**. Tệp chỉ có 135 dòng, và dòng 82 là
  `if (ownedIds.has(a.id)) continue;`. Khẳng định không đổi, chỉ số dòng sai.
- `auth.service.ts:153` → **`:155`** (dòng 153 là `const user = await this.prisma.user.create({`).
- nhánh mang frontend lofi: **chưa có** — xem đầu tài liệu.

Các mục còn lại đã kiểm và đúng nguyên văn: `lessons.service.ts:452-463`,
`stats.service.ts:180-192`, `next.config.ts:34`, `refresh-cookie.ts:26`,
`cors.middleware.ts:6`, `ide-brief-code.test.mjs:27`, `prewarm-gate.test.mjs:34`,
`catalog.ts` chỉ còn `python_advanced` (dòng 85), `GET /api/enrolled` có thật
(`courses.controller.ts:42`), `Achievement` không có cột bậc (`schema.prisma:464-476`),
và cả hai phép grep "0 kết quả" (không mã nào ghi vào bảng `achievements`; không mã nào
đọc hay ghi `Badge`/`UserBadge`).
