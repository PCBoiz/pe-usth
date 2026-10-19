# pe_usth — hướng dẫn làm việc trong repo này

Nền tảng học lập trình: NestJS 11 + Prisma 7 + PostgreSQL (Neon), Next.js 16 + React 19,
giáo trình Python chạy trong trình duyệt bằng Pyodide. Chi tiết kiến trúc: [README.md](README.md).

## Lệnh hay dùng

```bash
# Backend (từ thư mục gốc)
npm run typecheck          # phải sạch
npx jest --ci              # phải xanh
npm run start:dev          # cổng 5000

# Frontend
cd frontend && npm run typecheck && npm run lint && npm run build
cd frontend && npm run dev # cổng 3000

# Giáo trình Python (khoá đang chạy: Advanced Python, 48 bài — pe-v4)
py scripts/pe-v4/build.py              # dựng lại 48 bài -> scripts/pe-v4/out/
py scripts/pe-v4/build_advanced.py     # sinh mini-game -> scripts/pe-v4/out-advanced/
py scripts/pe-v4/sync_curricula.py     # chép giáo trình sang frontend/src/lib/curricula.json
py scripts/pe-v4/anim/check.py         # kiểm 23 hình SVG + đếm hình được bài dùng
py scripts/pe-v4/anim/check.py --strict # thêm: hình chưa bài nào khai cũng là lỗi (CI chạy bản này)
py -I scripts/pe-v4/check_so_quy.py    # động cơ mini-game "Sổ quỹ chung" dưới CPython (CI chạy)
py -I scripts/pe-v4/check_so_quy.py --ghi-mau  # sinh lại vết mẫu cho test phía React sau khi sửa động cơ
npm i --no-save pyodide@0.27.7         # CẢ BA lệnh dưới đều import pyodide
node scripts/pe-v4/check-advanced.mjs  # chấm thử game chạy code trong Pyodide
node scripts/pe-v4/check-pyodide.mjs   # chấm thử 427 ca bằng chính bộ chấm của trình duyệt
node scripts/pe-v4/check-so-quy.mjs    # cùng bộ ca của check_so_quy.py, chạy trong Pyodide thật

# Bản đồ sao (route xem thử /ban-do-sao — 8 chòm, 48 ngôi = 48 bài)
py scripts/star/build_sky.py           # sinh 12 tệp SVG -> frontend/public/map/star/
py scripts/star/build_sky.py --do      # bảng SỐ ĐO: độ chói, bão hoà, tỉ lệ, khe giữa hai chòm
py scripts/star/build_sky.py --place-nhan  # chạy bộ đặt nhãn, in khối SKY_LABEL_PLACED để chép vào TS
py scripts/star/build_sky.py --css     # in 16 ô bấm .hit* cho star-map.module.css
```

Trên Windows dùng `py`, không dùng `python` — `python` là stub của Microsoft Store.

## Mốc nền

Đo lại ngày 15/10/2026. Đừng để tụt xuống dưới
mức này:

| Hạng mục | Mốc | Đo ngày |
|---|---|---|
| Backend typecheck | sạch | 15/10/2026 |
| Backend test | 35 bộ, 392 ca, tất cả đạt | 19/10/2026 |
| Backend lint | 155 lỗi, 2 cảnh báo — **mốc trần trong CI là 170, chỉ được hạ** | 15/10/2026 |
| Frontend typecheck | sạch | 19/10/2026 |
| Frontend lint | 0 lỗi, 118 cảnh báo | 19/10/2026 |
| Frontend unit test | `cd frontend && npm run test:unit` → 684 ca, tất cả đạt | 19/10/2026 |
| Bản đồ thế giới | `py scripts/map/build_map.py` → 9 tệp SVG, bản rộng 46 197 nét / 830 KB (**trần 900 KB**), chạy hai lần ra đúng một tệp | 19/10/2026 |
| Bản đồ sao (xem thử) | `py scripts/star/build_sky.py` → 20 tệp, 198 KB tổng (**trần 900 KB tổng · 420 KB mỗi tệp**); mười sáu tấm chòm cân 109 KB (**trần 160 KB** trong test) | 19/10/2026 |
| Bản đồ sao | `py scripts/star/build_sky.py` → 12 tệp SVG + `sky-theme.css`, 526,4 KB cả bộ (**trần 420 KB mỗi tệp · 900 KB tổng**), chạy hai lần ra đúng một bộ. `--do` → 2,76% diện tích L > 0,5 (sàn 2,0%), trung vị độ chói 0,0065 (trần 0,05) | 19/10/2026 |
| Bản đồ sao · vùng chạm | 16 ô bấm đều ≥ 44 px ở bề rộng khung thật (1 068 × 643,9 px) — **chín ô từng dưới mức đó** (tám ô nhãn 34,2 px, bao lồi M8 31,4 px), nay có `min-height` | 19/10/2026 |
| Bản đồ sao · tương phản | chip lớp con trỏ trên nền ĐẶC: chữ 16,74:1 · mã bài 8,39:1 · chữ phụ 10,26:1. Nhãn trong tranh: thấp nhất **4,83:1** (dòng chặng lúc mờ, 24 phép đo đều ≥ 4,5). Vòng dò hai nét: ≥ 3:1 trên MỌI độ chói nền — nét sáng chỉ trượt khi nền L > 0,250, nét tối chỉ trượt khi nền L < 0,111 | 19/10/2026 |
| Giáo trình pe-v4 | 48 bài, 427 ca chấm, 176 biến thể sai + 48 khung trống đều trượt | 19/10/2026 |

**CẬP NHẬT BẢNG NÀY MỖI KHI SỐ ĐO ĐỔI ĐÁNG KỂ, không chỉ ở commit đầu phiên.**
Đã trả giá một lần: phiên 15/10 sửa bảng ở commit ĐẦU rồi 14 commit sau thêm
test và dọn 124 file mà không sửa lại, nên bảng ghi "204 ca / 178 cảnh báo"
trong khi thực đo là "390 ca / 118 cảnh báo". Bảng này nói "đừng để tụt xuống
dưới mức này", nên một con số cũ KHÔNG phải chú thích lỗi thời vô hại: nó là
mất lưới an toàn cho 186 ca test, và là giấy phép thêm 60 cảnh báo mới mà vẫn
tưởng đang đạt mốc. Thêm/bớt ca test, dọn lint, xoá file ⇒ đo lại rồi sửa bảng
TRONG CÙNG commit đó.

Con số frontend TỤT từ 637 xuống 622 ngày 19/10 là tụt CÓ LÝ DO, không phải mất lưới an
toàn: lớp chuyển động tự chạy của bản đồ bị bỏ theo quyết định sản phẩm ("chỉ cần motion
graphic khi hover"), nên 34 ca canh parallax/bụi/mạch rỉ/sợi sáng được thay bằng 19 ca canh
lớp hover. Bớt ca test vì BỚT TÍNH NĂNG thì ghi thẳng lý do ở đây; bớt vì "test khó sửa" thì
không.

`next build` KHÔNG có trong bảng vì chưa ai đo nó thành một con số ổn định;
đừng thêm dòng nào vào bảng mà không tự chạy lệnh để lấy số.

Số lỗi lint backend phải đo bằng ĐÚNG lệnh CI dùng, KHÔNG bằng `npm run lint` (script đó mang
`--fix` nên vừa sửa file vừa làm con số lệch). Đo khác lệnh là lý do mốc này từng bị ghi 551
trong khi thực tế là 557:

```bash
npx eslint "{src,apps,libs,test}/**/*.ts" --ignore-pattern "src/generated/**"
```

## Ràng buộc không được phá

- **DB dùng chung với bản Django cũ.** Migration chỉ được THÊM: thêm cột nullable hoặc có
  default, thêm index. Không đổi tên, không xoá cột, không đổi kiểu.
- **Mật khẩu giữ định dạng hash của Werkzeug** (`scrypt:…`, `pbkdf2:sha256:…`) để bản Django
  vẫn đăng nhập được. Xem `src/common/security/`.
- **Gateway giữ độc quyền prefix/version/CORS/rate-limit.** Module nghiệp vụ viết
  `@Controller('courses')`, không viết `@Controller('api/v1/courses')`. Xem
  [src/api-gateway/README.md](src/api-gateway/README.md).
- **Không `res.json()` thủ công khi lỗi** — `throw` để filter ở gateway định dạng response.

## Những cái bẫy đã gặp

Ghi lại để không ai vấp lại. Mỗi dòng là một lỗi có thật đã sửa hoặc còn mở.

- **Fixture test không giống dữ liệu thật thì test vô dụng.** `quizzes.service.spec.ts` từng
  khẳng định "không bao giờ lộ đáp án" bằng fixture `options: ['a','b']`, trong khi dữ liệu
  thật là mảng object mang cờ `correct` — lỗ lộ đáp án sống sót qua mọi lần chạy test. Khi
  viết test cho dữ liệu đọc từ `content_json`, lấy hình dạng thật từ
  `scripts/pe-v4/out-advanced/lessons/*.json` (đúng bản đang seed vào DB).
- **Chấm bài nằm ở trình duyệt.** Server không chấm lại gì; `POST /lessons/:n/complete` tin
  `quizScore` do client gửi. XP bị chặn trần bằng `lessons.xp_reward` nên không farm vô hạn
  được, nhưng đừng nhầm đây là hệ thống chống gian lận.
- **Bài tra theo `(course_id, sort_order)`, không theo `id`.** Lỗ hổng trùng bài từng tồn tại
  vì `lesson_code` NULL làm ràng buộc unique cũ vô hiệu. Ràng buộc đúng nay nằm trong
  migration `20261012000000_…`; chạy câu kiểm tra dữ liệu trùng trong README trước khi deploy.
- **`style-src 'unsafe-inline'` còn hai nguyên nhân, không phải một.** Chú thích trong
  `frontend/next.config.ts` chỉ nói tới ~70 handler nội tuyến của JS legacy. Nhưng còn 257 chỗ
  dùng `style={{…}}` trong 40 file React — SSR tuần tự hoá chúng thành thuộc tính `style="…"`,
  cũng bị `style-src` chặn. Phải dọn cả hai mới bỏ được chỉ thị này.
- **Pyodide KHÔNG còn tải lại mỗi lần chạy, và không lấy từ CDN.** Mô tả cũ ("mỗi lần bấm Chạy
  tạo Worker mới và nạp lại ~10 MB từ CDN") đã lỗi thời.
  `frontend/public/static/js/studio-lesson.worker.js:19-33` nạp runtime từ CÙNG ORIGIN
  `/pyodide/v0.27.7/` (đã commit vào repo) và GIỮ LẠI runtime giữa các lần chạy — trước đây
  worker nạp Pyodide bên trong `onmessage` nên mỗi lần bấm Chạy là nạp lại ~13 MB. Wheel của
  numpy/pandas/matplotlib/sqlite3 cũng nằm cùng origin và chỉ tải cho bài nào khai
  `step_4.packages`.
  **Phần còn đúng:** giới hạn 5 giây VẪN dựa vào `worker.terminate()` ở phía React, không phải
  worker tự cắt — `runPythonAsync` chặn luôn vòng lặp sự kiện nên worker treo thì không tự ngắt
  mình được. Sau khi terminate, React nạp sẵn một worker thay thế ở nền. Đổi cách dùng lại
  worker thì phải giữ được khả năng cắt vòng lặp vô hạn này.
- **Hai nguồn danh sách bài.** Trang khoá học đọc `frontend/src/lib/curricula.json` (file tĩnh,
  chép từ `scripts/pe-v4/out-advanced/curriculum-python-advanced.json` bằng
  `py scripts/pe-v4/sync_curricula.py`), còn nội dung bài đọc từ DB. Dựng lại pe-v4 mà quên
  chạy bước chép thì trang khoá học hiện giáo trình cũ; sau mỗi lần seed phải kiểm hai nguồn
  có lệch không.
- **Frontend không còn đăng nhập, nhưng backend vẫn đòi JWT.** Trang chủ `/` và `/courses/*` đọc
  danh mục tĩnh `frontend/src/lib/catalog.ts` (chép từ `prisma/seed-courses.js`, số bài lấy từ
  `curricula.json`) chứ không gọi `/api/courses` — gọi thì khách nhận 401. Sửa seed khoá học thì
  sửa cả file này. Trang bài học (`/lesson/*`) vẫn gọi API có JWT: `apiFetch` gặp 401 mà không
  refresh được thì gọi `POST /auth/guest` để nhận tài khoản khách (email `@guest.local`, mật
  khẩu rỗng nên không đăng nhập bằng mật khẩu được), rồi bài học tự ghi danh. Tắt bằng
  `GUEST_LOGIN=off`. Deploy khác domain thì phải đặt `REFRESH_COOKIE_SAMESITE=none`, không thì
  hết hạn access token là khách mất phiên và nhận tài khoản mới (mất tiến độ).
- **`prisma/seed-courses.js` nay tạo khoá `python` RỖNG, không phải 40 bài.** Nó đọc
  `curricula[def.id]`, mà `sync_curricula.py` đã bỏ hẳn khối `python` khỏi `curricula.json`,
  nên vòng sinh bài không chạy lần nào. Bẫy cũ (sinh `python-1…python-40` trùng sort_order)
  không còn, nhưng chạy nhầm vẫn dựng lại một khoá rỗng trong danh mục.
- **Lỗi lint backend KHÔNG phải lỗi định dạng, và nguồn gần như luôn là MỘT dòng `: any`.**
  Đã đo (lúc còn 527 lỗi): chỉ 6% chạy `--fix` là xong; 89% là nhóm `no-unsafe-*` — `any` chảy
  xuyên qua code ở các trang chuyển từ bản Django. Đã dọn `quizzes` + `lessons` ngày 14/10/2026:
  **553 → 263 lỗi** (`-290`), và toàn bộ 290 lỗi đó đến từ đúng hai khuôn trong file spec:
  `let prisma: any` và `const res: any = await service.…`. Cách dọn, lặp lại được cho module
  sau:
  1. `let prisma: any` → một type `PrismaMock` chỉ khai những bảng/hàm service thật sự gọi, mỗi
     hàm là `jest.Mock<Promise<unknown>, [ĐốiSố]>`. Chỉ cần kiểu thật ở phần ĐỐI SỐ (test đọc
     lại `mock.calls` để chứng minh "XP/đáp án do SERVER quyết"); giá trị trả về để
     `Promise<unknown>` là đủ vì mỗi ca tự `mockResolvedValue()`.
  2. `jest.fn()` trần trả `Mock<any, any>` nên gán vào field đã khai kiểu lại thành
     `no-unsafe-assignment`. Dùng một helper `asyncMock<[ĐốiSố]>()` bọc `jest.fn<…>()`.
  3. `const res: any = await service.X()` → bỏ hẳn `: any`. Các method public của service đều
     để TS TỰ SUY return type, nên chính dòng `: any` mới là chỗ tạo ra `any`.
  4. Dữ liệu `content_json` (`Prisma.JsonValue`) không chấm thẳng `.step_4` được — đó là lý do
     người ta ép `any`. Thay bằng MỘT helper có tên và kiểu đích thật (`asRecord()` trong
     service, `asContent()` trong spec), đừng rải `as any`.
  **Vì sao đáng làm, chứ không chỉ để con số đẹp:** `any` ở spec làm test nói dối. Gõ
  `solution_code` thay cho `solutionCode` vẫn biên dịch, `toBeUndefined()` vẫn ĐẠT, và lỗ lộ
  lời giải vẫn còn nguyên. Làm dần từng module rồi hạ mốc trần trong `ci.yml` (chỉ được hạ).

  Đã dọn `courses` ngày 15/10/2026: **263 → 175 lỗi** (`-88`), một file duy nhất
  (`courses.service.spec.ts`) chiếm cả 88. Hai số đo của lần đó, ghi lại vì chúng chỉnh lại
  câu "test nói dối" cho chính xác hơn:
  · Gõ sai TÊN HÀM MOCK (`createMnay`) thì bản `any` VẪN trượt — nhưng trượt lúc chạy, với
    thông báo của Jest về "received value must be a mock", không phải một câu nói rằng service
    vừa bỏ mất cái cổng. Bản có kiểu trượt ngay ở `tsc` kèm "Did you mean 'createMany'?".
  · Gõ sai TÊN FIELD trên kết quả (`res.okk`) kèm matcher phủ định thì bản `any` **im lặng
    đạt 13/13**, còn bản có kiểu báo "Property 'okk' does not exist". Đây mới là trường hợp
    test nói dối thật sự — và nó chỉ xảy ra khi matcher phủ định, nên đừng tin rằng mọi lỗi
    gõ sai đều tự lộ ra.
  Một thứ nữa đáng biết trước khi làm module sau: bỏ `: any` khỏi `const res` làm lộ ra
  những lỗi `strictNullChecks` thật mà `any` đang che (`whereDaGui()` có thể `undefined`,
  `Array.find()` có thể `undefined`). Đừng dập chúng bằng `!` — ở đây mỗi chỗ đó là một
  khẳng định riêng (`expect(where).toBeDefined()`), vì nếu service ngừng gửi `where` thì `!`
  sẽ ném TypeError vô nghĩa trong khi bản chất là cái cổng `is_published` vừa mất.
- **Khoá Advanced có ĐÚNG 3 bài cửa tự kiểm tra, không phải 5.** Danh sách 5 bài
  (B20, I07, I12, N04, N08) là của khoá cơ bản pe-v3 ĐÃ XOÁ; chú thích nào còn ghi nó là chú
  thích cũ. Ba bài hiện tại: **R02** (`sort_order` 20), **DA01** (47), **DA02** (48) — đếm bằng
  `grep '"gate": true' scripts/pe-v4/out-advanced/lessons/*.json`. Cả backend
  (`isSelfTestGateLesson`) và frontend đều nhận diện theo CỜ `step_4.gate` chứ không hard-code
  mã bài, nên đừng viết test khoá cứng con số 3 — thêm cửa mới là server tự khoá theo.
- **Server biết "đã hoàn thành", không biết "đã nộp".** Ở bài cửa tự kiểm tra, lời giải mẫu
  bị giữ lại tới khi bài được ghi nhận hoàn thành. Frontend từng chỉ nạp nội dung một lần lúc
  mở bài nên phải tải lại trang mới thấy lời giải; nay `useLessonData.complete` thấy cờ
  `solutionWithheld` thì nạp lại nội dung ngay sau `POST /lessons/:n/complete`. Lời giải vẫn
  chỉ mở khi đã HOÀN THÀNH, không phải khi vừa nộp lần đầu.
- **Test `python-runner` trượt khi chạy CẢ BỘ nhưng chạy riêng thì đạt — là ĐỒNG HỒ, không
  phải rò trạng thái giữa các file.** Đã kiểm: `npx jest --ci --runInBand` (tất cả 29 file
  trong một tiến trình, tức mức rò `process.env`/singleton cao nhất) luôn xanh, nên nguyên
  nhân là tranh CPU. Hai chỗ đã sửa, đừng dựng lại: (1) `python-runner.controller.spec.ts`
  dựng app Nest thật rồi gọi 11 lượt HTTP trong MỘT ca — 0,3 s khi chạy riêng nhưng đo được
  2,96 s khi chạy cả bộ với cache ts-jest nguội, có lần vượt 5 s rồi báo "Exceeded timeout of
  5000 ms"; vì vậy `jest.testTimeout` trong `package.json` đặt 30 s (đồng hồ canh treo, không
  phải khẳng định về tốc độ). (2) `local-executor.spec.ts` từng ngủ cố định 50 ms để chờ
  executor đi tới `execFile`, trong khi trước đó còn `mkdtemp`+`writeFile` thật — nay chờ theo
  ĐIỀU KIỆN (`spawned`/`killed`). Chờ theo đồng hồ còn làm lời gọi muộn rơi vào mock của ca
  SAU và lệch bộ đếm của nó.
- **Lý do bẫy ở màn điền chỗ trống từng NÓI RA đáp án của chính ô đó.** `step_3.scaffold.bank[].trap`
  là câu hiện ra khi kéo mảnh SAI vào ô, nên nó phải nói vì sao LỰA CHỌN VỪA RỒI sai — vậy mà sáu
  câu viết thẳng đáp án đúng ra (`"…phải về ready chờ dispatch"` trong khi đáp án ô đó đúng là
  `"ready"`). Ô chỉ có 2–3 ứng viên nên chọn bừa một mảnh sai là ĐƯỢC PHÁT đáp án; server không
  chấm lại gì nên không chỗ nào khác chặn. Đã sửa cả sáu trong `lessons_{proc,thread,gui,data}.py`
  (19/10/2026), lưới ở `frontend/e2e/unit/trap-leak.test.mjs`.
  **Hai điều đáng biết trước khi thêm trap mới:** (1) ca cũ trong `fill-slots.test.mjs` so nguyên
  văn bằng `includes(answer)` nên chỉ thấy 3/6 — ba chỗ kia lọt vì đáp án có dấu nháy
  (`"ready"`) mà câu trap thì không; muốn bắt được phải bỏ nháy ở CẢ HAI phía trước khi so.
  (2) Ngay cả khi bỏ nháy, luật vẫn mù với đáp án là biểu thức bọc quanh một giá trị: `["-"]` so
  với câu trap ghi `"-"` là không khớp — chỗ X01 ô3 phải tìm bằng mắt. Test này chỉ đỡ phần
  nguyên văn, thêm trap mới vẫn phải tự đọc lại.
- **Kho quiz chỉ đọc khoá `text`/`label` của lựa chọn — câu "dự đoán" dùng `title`.**
  `normalizeQuestion` (`src/quizzes/quizzes.service.ts`, nhánh quy đổi `options`) làm
  `String(o.text ?? o.label ?? '')`, trong khi `predict_block()` ở `scripts/pe-v4/build.py:210`
  sinh lựa chọn với khoá `{id, title, detail, correct}`. Đưa câu dự đoán vào kho quiz mà không
  thêm `?? o.title` thì MỌI lựa chọn thành **chuỗi rỗng** và gửi thẳng ra frontend — không ngoại
  lệ nào được ném, không log nào đỏ, chỉ là 4 nút trắng. Hiện kho quiz chỉ lấy `step_2.mcq` nên
  chưa vỡ; đổi nguồn câu hỏi thì phải đổi `normalizeQuestion` CÙNG LÚC.
- **Muốn ôn tập phải xong 2 bài, không phải 1.** `buildQuestionPool` đòi `MIN_POOL = 5` câu mới
  cho ra đề, mà mỗi bài Advanced chỉ có **3** câu trắc nghiệm (46/48 bài có 3 câu, 2 bài có 4 —
  đếm `step_2.mcq`). Nên thực tế học viên phải hoàn thành 2 bài mới mở được quiz ôn. Thông báo
  gửi FE (`min_questions: 5`) nói theo SỐ CÂU nên dễ đọc nhầm thành "xong 1 bài là đủ"; sửa
  `MIN_POOL` là đổi hành vi người dùng thấy được.
- **Hạn của tài khoản khách là cửa sổ TRƯỢT, và frontend đang ghi cứng 8 giờ ở nhiều chỗ.**
  `JWT_REFRESH_EXPIRES` mặc định `'8h'` (`src/config/env.validation.ts`), nhưng
  `RefreshTokenService.lifetimeMs` là hằng đọc MỘT LẦN trong constructor và `expiresAt` được
  tính trong `issue()` — mà `rotateAndBlacklist()` gọi lại `issue()`, nên mỗi lần refresh là
  một hạn 8 giờ MỚI. Hệ quả: muốn đổi luật hết hạn (ví dụ "khách giữ tiến độ 30 ngày") thì
  phải quyết ở `issue()`, đặt ở controller là vô ích. Phía frontend, cookie mốc
  `pe_has_session` đang ghi cứng `max-age=28800` ở **bốn** chỗ — `frontend/src/lib/api.ts:90`
  và `:130`, `frontend/public/static/js/pe-bridge.js:36`, `frontend/public/static/js/pages/login.inline.js:19`
  (thêm một chú thích nhắc tới 8 giờ ở `frontend/src/lib/course-progress.ts`). Đổi
  `JWT_REFRESH_EXPIRES` mà quên bốn chỗ này thì cookie và token lệch nhau: FE tưởng còn phiên
  trong khi token đã hết, hoặc ngược lại.
- **Bản đồ thế giới ở trang chủ là TRANH SINH RA, không phải SVG vẽ tay — đừng sửa tệp.**
  `frontend/public/map/world-map.svg` (46 197 nét, 830 KB) và tám ô crop `scene-M*.svg`
  do `scripts/map/build_map.py` sinh; sửa tay chúng thì lần chạy script sau xoá sạch.
  Script ĐỌC `frontend/src/lib/world-map.ts` (`MAP_PALETTE`, `REGION_LAYOUT`, `MAP_FLOWS`,
  `MAP_WELLS`, `MAP_SUN`, `MAP_FRAME`, `MAP_ABYSS`) nên muốn đổi màu/toạ độ/hình thái cái
  vực thì sửa ở TS rồi chạy lại `py scripts/map/build_map.py` (và `--css` để lấy khối
  `.spot1…8`). Năm thứ dễ vấp, cả năm đều lặng lẽ:
  · **`stroke-width` KHÔNG được đi qua `nf()`** — `nf` làm tròn toạ độ về số nguyên, đúng
    cho toạ độ nhưng biến mọi nét 0,45 đơn vị thành `stroke-width="0"`. Đã xảy ra một lần:
    cả bức render với năm chục nghìn nét vô hình và nhìn ra đúng "mảng phẳng tô gradient",
    tức chính cái lỗi mà bản này sinh ra để chữa.
  · **Trần 900 KB** là thật (script tự chặn). Thêm chi tiết thì hạ `DENSITY`, đừng bỏ kỹ thuật.
  · **Ảnh nền của ô crop phải nằm TRONG `@container`** ở `world-map.module.css`. Đặt ra
    ngoài thì máy tính tải thêm 1,3 MB mà không ai thấy gì khác.
  · **ĐỪNG THÊM `id`/`data-*` VÀO SVG cho lớp chuyển động.** Tranh vào trang bằng
    `background-image`, tức một tài liệu SVG RIÊNG, bị cách ly: CSS của trang không khớp
    được selector nào bên trong, JS không `querySelector` vào được. Mọi `id` đặt cho tầng
    vách / dòng nước / trục tia sáng là byte chết trong một tệp tải ở mỗi lượt vào trang
    chủ. Đã thử và đã gỡ ngày 19/10/2026. Hợp đồng với `map-motion.ts` là TOẠ ĐỘ trong
    `world-map.ts`, xem `design/v3/ky-thuat-ban-do.md` mục 6.3.
  · **HÌNH THÁI CÁI VỰC Ở TS, không ở Python.** `MAP_ABYSS` (mặt cắt lòng vực, mặt cắt
    khối đá, mốc bốn tầng, tám cái hốc) là nguồn cho CẢ bức tranh LẪN lớp chuyển
    động. Chép một con số của nó sang chỗ khác là một con số sẽ lệch — đã xảy ra hai
    lần trong cùng một ngày (lớp chuyển động chép bốn mốc địa tầng, ca test khoá cứng
    độ cao mặt đất `y ≈ 236`; cả hai chết trong hai giờ khi bức tranh được vẽ lại).
  `e2e/unit/world-map.test.mjs` canh cả năm: mục 10 lo mật độ nét, cấm gradient, mọi mã
  màu trong SVG phải có tên trong `MAP_PALETTE`, tập `data-flow` phải khớp `MAP_FLOWS`;
  mục 11 lo TÍNH LIỀN MẠCH — vách vực là MỘT đường liền mỗi bên, không nét khép kín
  nào trong lớp vách, tám gian đều thuộc cùng cái hố, nước và ánh sáng chạy xuyên
  suốt, thang độ sâu ở cả hai lề. **Gỡ bản sửa ra thì sáu ca trượt** (đo 19/10/2026
  bằng cách `git checkout` lại chín tệp SVG cũ). Kỹ thuật và nguồn:
  `design/v3/ky-thuat-ban-do.md` (mục 6 cho hình thái liền mạch).
- **Bản đồ SAO cũng là TRANH SINH RA, và nó chia làm 12 tệp theo LỚP — đừng sửa tệp.**
  `frontend/public/map/star/sky-*.svg` do `scripts/star/build_sky.py` sinh; script ĐỌC
  `frontend/src/lib/star-map.ts` (toạ độ tám chòm, mạch hoàng đạo, nguồn sáng, bảng màu,
  ngân sách độ chói) nên muốn đổi gì thì sửa ở TS rồi chạy lại. Năm thứ đã trả giá, cả năm
  đều lặng lẽ:
  · **Một TẤM = một NHÓM LỚP, không phải cả bức.** Bản mẫu một chòm xuất hai tấm đủ mười
    ba lớp; nhân cách đó lên tám chòm là chín tấm, mỗi tấm cõng lại cả tinh vân và 1 250
    sao nền — ~1,4 MB cho một trang. Hợp của `SKY_TILES` phải phủ ĐÚNG `SKY_LAYERS` theo
    đúng thứ tự (thứ tự tệp trong DOM LÀ thứ tự z); một lớp bị bỏ quên biến mất khỏi bức
    mà không có gì đỏ lên. Script tự chặn.
  · **Nguồn sáng trội dựng bằng ĐA GIÁC LỒNG NHAU, không bằng đường đồng mức.** Hai bản
    trước đều dùng đường đồng mức và cả hai hỏng nhìn thấy được: bản 1 có vùng phẳng ở tâm
    nên chín mức rơi cùng một chỗ ⇒ một cái đĩa xám viền mấy vòng tròn; bản 2 nhân trường
    với kết cấu fBm nên mỗi mức sinh ra cả đảo bên trong, và `fill-rule="evenodd"` biến
    tâm nguồn sáng thành một LỖ TỐI.
  · **Trần độ chói TOÀN CỤC đã bị bỏ, thay bằng NGÂN SÁCH DIỆN TÍCH** (`SKY_BUDGET`:
    ≥ 2,0% diện tích trên L > 0,5, trung vị ≤ 0,05). Lý do đo được ở
    `design/v3/chieu-sau-tuong-tac.md` §2.4. Hai trần CỤC BỘ (`hullCeiling`,
    `textCeiling`) thì GIỮ — chúng là ràng buộc tiếp cận ở đúng chỗ có nét mang tin và có
    chữ. Thêm nguồn sáng ⇒ phải đo lại cả tám nhãn, đừng tin số đo cũ.
  · **Ba lớp liên kết phải phân biệt được BẰNG MẮT** (nét chòm liền · mạch hoàng đạo đứt,
    sắc riêng · dải Ngân Hà). Mạch đổi thành nét liền, hay dùng chung sắc với một chặng,
    hay chạm vào một ngôi, thì nó đọc ra là "nét của chòm" và câu trả lời cho "các chòm
    kết nối với nhau như nào" biến mất — trong khi tệp vẫn ra bình thường.
  · **Bảng hộp §15 của đặc tả CHỒNG NHAU.** Đặt đúng theo nó thì PD07 (M6) và X03 (M4)
    cách nhau 21 px và mắt đọc ra một cặp sao đôi không ai định vẽ. `SKY_LINK.minGap` giữ
    cho lần sau; script trượt build.
  `frontend/e2e/unit/star-map.test.mjs` canh cả năm (31 ca).

- **`apiFetch` gặp 401 là TỰ TẠO tài khoản khách — đừng gọi nó ở trang công khai.**
  `apiFetch` (`frontend/src/lib/api.ts`) khi refresh không được sẽ rơi xuống `ensureGuest()`.
  Gọi nó trên một trang ai cũng vào được nghĩa là **mỗi bot quét web sinh một tài khoản khách**,
  ăn hết hạn mức `THROTTLE_GUEST_LIMIT` (mặc định 120 lượt/giờ/IP, `src/auth/auth.controller.ts`)
  và nhồi rác `@guest.local` vào bảng users. Hạn mức tính theo IP nên cả phòng máy chung một
  NAT sẽ nhận 429 đúng lúc có người cần tài khoản thật. Luật dùng:
  · trang BÀI HỌC (`/lesson/*`) — nơi học viên thật sự cần một danh tính để lưu tiến độ — dùng
    `apiFetch`;
  · mọi trang công khai (trang chủ, `/courses/*`, badge "Tiếp tục ở bài X"…) dùng
    **`apiFetchSessionOnly`**: nó chỉ gửi kèm phiên đang có, 401 thì trả về 401 và để UI hiện
    trạng thái "chưa đăng nhập", KHÔNG tạo tài khoản.

- **Mini-game "Sổ quỹ chung" (T05): một NHỊP là một lần đụng thứ dùng chung, không phải một
  câu lệnh.** Động cơ `frontend/public/static/js/so-quy.py` biến hàm của người học thành
  generator dừng TRƯỚC mỗi `so_quy.doc()`/`so_quy.ghi()`/lấy-trả khoá. Cắt theo câu lệnh
  (như đề xuất ban đầu) thì `so_quy.ghi(so_quy.doc() + so_tien)` viết gộp một dòng đọc-rồi-ghi
  trong cùng nhịp và lịch luân phiên ra 160 KHÔNG cần khoá — đã đo bằng đột biến: 6/14 ca
  trượt. Luân phiên đạt cũng CHƯA đủ: động cơ dò thêm mọi lịch chen ngang ≤ 2 lần; bỏ bước dò
  thì bản "chỉ khoá lúc đọc" được chấm đạt. Sửa động cơ ⇒ chạy `check_so_quy.py` (CPython) VÀ
  `check-so-quy.mjs` (Pyodide), rồi `--ghi-mau` nếu vết đổi — test phía React phát lại đúng
  file vết đó.

## Nạp dữ liệu vào DB — đừng mặc định dùng seed

Hai đường, chọn sai là xoá tiến độ của người đang học:

- **`scripts/seed-python-advanced-v4.ts --apply` — chỉ khi khoá CÒN TRỐNG.** Nó `deleteMany`
  cả 48 bài VÀ toàn bộ `lesson_progress` của khoá, rồi đặt mọi ghi danh về
  `completedLessons: 0, progress: 0`. Có sao lưu trước khi xoá, nhưng "sao lưu" không cứu được
  tester đang học dở. Sửa vài chữ trong 4 bài mà chạy cái này là xoá tiến độ của mọi người.
- **`scripts/update-lesson-content.ts` — đường nạp AN TOÀN khi đã có người học.** Chỉ chạy
  `UPDATE lessons SET content_json = …` theo `(course_id, sort_order)` và phải trùng
  `lesson_code` của gói; KHÔNG đụng `lesson_progress`, `enrollments`, `courses`, không tạo/xoá
  bài, không đổi cột khác của `lessons`. Mặc định CHẠY THỬ (in sha256 cũ → mới, không ghi);
  `--apply` bắt buộc kèm `--backup=<file.json>`; `--offline` xem trước mà không cần DB. Mọi
  UPDATE trong một transaction, mỗi câu phải trúng đúng 1 hàng.

  ```bash
  npx ts-node scripts/update-lesson-content.ts --codes=P01,P02,P03 --offline   # kiểm gói
  npx ts-node scripts/update-lesson-content.ts --codes=P01,P02,P03             # xem trước
  npx ts-node scripts/update-lesson-content.ts --codes=P01,P02,P03 --apply --backup=bak.json
  ```

  Luật chọn/so sánh nằm ở `src/course-admin/lesson-content-update.ts` (có test Jest).

Sau MỌI lần nạp, vẫn phải chạy `py scripts/pe-v4/sync_curricula.py` — xem bẫy "Hai nguồn
danh sách bài" ở trên.

## Quy ước khi sửa

- Chú thích bằng tiếng Việt, giải thích **vì sao**, thường dẫn ra lỗi đang sửa. Đọc code quanh
  chỗ sắp sửa và viết cùng giọng.
- Test phải chứng minh được là nó bắt lỗi: gỡ bản sửa ra, test phải trượt. Ghi số ca trượt vào
  mô tả commit.
- Mỗi commit một việc, mô tả nói rõ triệu chứng → nguyên nhân → cách sửa.
- Thay đổi làm đổi hành vi người dùng thấy được thì nói thẳng trong mô tả commit.
