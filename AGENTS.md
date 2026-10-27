# pe_usth — hướng dẫn làm việc trong repo này

Nền tảng học lập trình: NestJS 11 + Prisma 7 + PostgreSQL (Neon), Next.js 16 + React 19,
giáo trình Python chạy trong trình duyệt bằng Pyodide. Chi tiết kiến trúc: [README.md](README.md).
**Vì sao chọn từng công nghệ, và nó đổi lấy gì** — kèm giá đã tra và so với các cách khác:
[docs/cong-nghe-va-ha-tang.md](docs/cong-nghe-va-ha-tang.md).

## Lệnh hay dùng

```bash
# Backend (từ thư mục gốc)
npm run typecheck          # phải sạch
npx jest --ci              # phải xanh
npm run start:dev          # cổng 5000

# Frontend
cd frontend && npm run typecheck && npm run lint && npm run build
cd frontend && npm run dev # cổng 3000

# Giáo trình đang chạy: python_advanced = 172 bài "Python cho Data Analyst" (pe-da)
py scripts/pe-da/build.py              # course.json -> scripts/pe-da/out/ + chép 80 ảnh
py scripts/pe-da/check.py --strict     # kiểm cấu trúc (CI chạy bản này)
py scripts/pe-da/sync_curricula.py     # chép giáo trình sang frontend/src/lib/curricula.json
npm i --no-save pyodide@314.0.7
node scripts/pe-da/check-pyodide.mjs   # chạy code từng bài trong Pyodide, so với `expected`
node scripts/pe-da/check-practice.mjs  # chấm 415 ca BÀI TẬP + đòi 556 biến thể sai trượt
# 516 câu trắc nghiệm: check.py đối chiếu với nguồn (kiem_trac_nghiem), không có bộ riêng
node scripts/check-perf.mjs            # kiểm BỘ ĐO ĐỘ HIỆU QUẢ trong studio-harness.py
node scripts/check-figures.mjs         # kiểm việc XUẤT HÌNH của studio-harness.py

# pe-v4 (48 bài, 427 ca chấm) — GIỮ LẠI nhưng KHÔNG còn xuất bản; xem mục dưới
py scripts/pe-v4/build.py              # dựng lại 48 bài -> scripts/pe-v4/out/
py scripts/pe-v4/build_advanced.py     # sinh mini-game -> scripts/pe-v4/out-advanced/
py scripts/pe-v4/sync_curricula.py     # chép giáo trình sang frontend/src/lib/curricula.json
py scripts/pe-v4/anim/check.py         # kiểm 23 hình SVG + đếm hình được bài dùng
py scripts/pe-v4/anim/check.py --strict # thêm: hình chưa bài nào khai cũng là lỗi (CI chạy bản này)
npm i --no-save pyodide@314.0.7         # CẢ HAI lệnh dưới đều import pyodide
node scripts/pe-v4/check-advanced.mjs  # chấm thử game chạy code trong Pyodide
node scripts/pe-v4/check-pyodide.mjs   # chấm thử 427 ca bằng chính bộ chấm của trình duyệt
```

Trên Windows dùng `py`, không dùng `python` — `python` là stub của Microsoft Store.

## Mốc nền

Đo lại ngày 24/10/2026, bằng cách tự chạy từng lệnh. Đừng để tụt xuống dưới mức này:

| Hạng mục | Mốc |
|---|---|
| Backend typecheck | sạch |
| Backend test | 27 bộ, 283 ca, tất cả đạt |
| Backend lint | 225 lỗi, 2 cảnh báo — **mốc trần trong CI là 245, chỉ được hạ** |
| Frontend typecheck | sạch |
| Frontend lint | 0 lỗi, 178 cảnh báo |
| Frontend unit test | `cd frontend && npm run test:unit` → **231 ca** / 20 tệp, tất cả đạt |
| Giáo trình pe-v4 (ẩn) | 48 bài, 427 ca chấm, 176 biến thể sai + 48 khung trống đều trượt |
| Giáo trình pe-da (đang chạy) | 172 bài, 10 module, 544 màn đọc, **516 câu trắc nghiệm**, 655 câu luyện tập, **124 bài tập được chấm / 415 ca**, 2 352 phút; 131 bài chạy trong trình duyệt / 14 hỗn hợp / 27 trên máy |
| pe-da chấm nội dung | `node scripts/pe-da/check-pyodide.mjs` → 145 bài, 406 đoạn code, **0 hỏng**, 14 cảnh báo, ~33 s |
| pe-da chấm BÀI TẬP | `node scripts/pe-da/check-practice.mjs` → 124 bài, **415 ca đạt**, 556 biến thể sai đều trượt, ~15 s (pha 1 ~10 s) |
| Bộ đo độ hiệu quả | `node scripts/check-perf.mjs` → 9 ca, **0 hỏng** |
| Xuất hình cho người học | `node scripts/check-figures.mjs` → 16 ca, **0 hỏng** |
| Runtime | Pyodide **314.0.7** (Python 3.14.2 · numpy 2.4.6 · pandas 3.0.2 · matplotlib 3.10.8), 30 MB |

**pe-v4 còn trong repo nhưng không còn xuất bản.** Khoá `python_advanced` nay là bộ 172
bài. `scripts/pe-v4/**`, 427 ca chấm và job CI của nó được GIỮ NGUYÊN, vì bộ chấm
input/output đó là thứ cố vấn dự án gọi là tính năng lõi — xoá đi là mất đường quay đầu
và mất bộ kiểm duy nhất chấm được code học viên. `frontend/public/static/js/studio-harness.py`
thì bộ 172 bài dùng lại NGUYÊN VẸN: chính nó đặt `MPLBACKEND=Agg` và móc `Figure`, nên
26 bài biểu đồ chạy được trong worker. Đừng dọn "cho gọn".

**Con số 231 phải đo lại mỗi lần thêm/bớt ca, không được đoán.** Phân rã hiện tại:
catalog-duration 2 · catalog-naming 3 · editor-load-gate 14 · feedback-link 9 · forum-xss 1 ·
ide-brief-code 12 · ide-handoff 6 · ide-partial-output 10 · ide-stop-autosave 27 ·
ide-trace 38 · label-version 2 · lesson-load 7 · practice-contract 14 · prewarm-gate 5 ·
read-try-it 20 · session-marker 5 · studio-lesson 41 · tracer-web-sync 5 · trap-leak 3 ·
worker-csp 7 = 231.
Mốc trước là 211; thêm read-try-it 20 (nút "Try it Yourself" ở màn đọc — xem bẫy dưới).
Trước đó 196 → 211 là practice-contract 14 và studio-lesson 40 → 41.

Dòng này từng ghi **204** trong khi cây mã chỉ có 134 — một con số cũ trong bảng không phải
chú thích lỗi thời vô hại, nó là 70 ca test tưởng có mà không có. Thêm/bớt ca ⇒ chạy lệnh,
lấy số thật, sửa bảng TRONG CÙNG commit.

Backend chạy riêng mới ra số đúng: chạy `npx jest --ci` song song với bộ test frontend thì
15/15 bộ báo trượt với 0 ca chạy — tranh CPU, không phải lỗi thật (xem bẫy "Test
`python-runner` trượt khi chạy CẢ BỘ" ở dưới).

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

- **Nền tảng phải đuổi kịp thư viện mà giáo trình được kiểm trên đó — ĐÃ nâng, giữ thế.**
  `requirements-tested.txt` của gói gốc ghi matplotlib **3.11.2**, numpy **2.5.4**, pandas
  **3.1.0**. Pyodide 0.27.7 cũ mang 3.8.4 / 2.0.2 / **2.2.3** — lệch một MAJOR ở pandas, mà
  pandas 3 đổi cả mặc định chuỗi sang PyArrow. Nâng lên **314.0.7** (Python 3.14.2,
  matplotlib 3.10.8, numpy 2.4.6, pandas **3.0.2**) đóng khoảng đó, và còn NHẸ hơn: 30 MB so
  với 32 MB. Hai lỗi do lệch bản — VZ07 (`ax.boxplot(tick_labels=…)` cần matplotlib ≥ 3.9) và
  VZ03 (`fig.autofmt_xdate()` xung đột `layout="constrained"`) — tự hết.
  Đừng tin dòng "641 đoạn đạt, 0 lỗi" trong README của gói: nó đúng với nền CỦA HỌ. Thứ nói
  được sự thật trên nền NÀY là `node scripts/pe-da/check-pyodide.mjs`.
  Hằng `LECH_PHIEN_BAN` trong `scripts/pe-da/build.py` nay TRỐNG — giữ cái móc lại, lần nâng
  sau sẽ lại có thứ lệch theo chiều ngược lại. Muốn thử một bản Pyodide khác TRƯỚC khi chép
  30 MB vào cây mã: `PYODIDE_DIR=<đường dẫn> node scripts/pe-da/check-pyodide.mjs` (cả hai bộ
  chấm đều nhận biến này), nhớ `npm i --no-save pyodide@<bản>` cho khớp API.
- **`course.json` có HAI biến thể code cho cùng một khối, lấy nhầm là dạy sai.** `code` là
  bản đầy đủ dùng để XUẤT HÌNH (`matplotlib.use("Agg")`, `fig.savefig(gettempdir()/…)`),
  `displayCode` mới là bản gọn viết cho người học (`plt.show()`). 83 khối có cả hai.
  `code_hoc_vien()` trong build.py chọn đúng bản; bản dựng đầu lấy nhầm `code` và suýt dạy
  người mới học thói quen lưu hình vào thư mục tạm. Tương tự: `displayExpected`,
  `displayMode`, và `kind: "terminal"` / `mode: "manual"` đánh dấu khối là LỆNH SHELL —
  `git clone`, `python -m venv` — không được đưa vào sandbox Python.
- **Màn đọc có NĂM loại khối, và ba chỗ phải đổi cùng lúc.** `paragraph · code · terminal ·
  figure · table`. Chúng được khai ở `ReadBlock` (`frontend/src/lib/studio-lesson.ts`),
  dựng ở `ReadScreen.tsx`, và phát ra ở `scripts/pe-da/build.py`. Bản đặc tả đầu chỉ ghi ba
  loại, build thêm `figure`/`terminal` sau — 26 bài có hình ném TypeError ngay màn đọc và
  không ai thấy cho tới khi mở đúng bài đó. `ReadScreen` phải `switch` có nhánh `default`
  ép `never`, và `check.py` chặn loại khối lạ.
- **"Hình" của bốn bài Plotly là file HTML 4,7 MB, không phải ảnh.** VZ20–VZ22 và VZ26 khai
  `figure` trỏ tới `.html` do Plotly xuất, mỗi file nhúng sẵn cả plotly.js. Chép theo tên
  file làm `frontend/public/static/da/` phình từ 2,3 MB lên **49 MB**, lại còn vào thẻ
  `<img>` nên cũng không hiện. `chep_anh()` nay chỉ nhận `.png` và check.py chặn `figure`
  không phải PNG.
- **Danh sách module đổi theo bản Pyodide, và đổi theo CẢ HAI chiều.** Đo bằng `importlib`
  trên chính runtime trong repo, không suy từ tài liệu. 0.27.7 thiếu `lzma`, `ssl`,
  `sqlite3`; **314.0.7 có cả ba** (bài SY19 dạy nén lzma nhờ đó chạy được). Nhưng `sqlite3`
  đi ngược: ở 0.27.7 nó là WHEEL phải khai `packages`, ở 314 nó là stdlib — khai nó làm
  `loadPackage` ném "No known package" và giết cả lần chạy. Nay chỉ `curses` và `tkinter` là
  thiếu thật, và đó là giới hạn WASM chứ không phải thiếu wheel.
  **Ba kiểu phụ thuộc mà quét `import` KHÔNG thấy**, đều đã cắn ít nhất một lần:
  · gọi qua chuỗi — `df.to_excel(..., engine="openpyxl")` (PD13), xem `CHUOI_GOI_THU_VIEN`;
  · gói dữ liệu ẩn sau stdlib — `tz_convert('Asia/Ho_Chi_Minh')` cần `tzdata` vì `zoneinfo`
    trong Pyodide là stdlib RỖNG (PD23), xem `GOI_AN`;
  · thuộc tính phơi ra máy thật — `Path(sys.executable).is_file()` chạy đúng, không ném gì,
    và trả SAI trong trình duyệt (EX03), xem `THUOC_TINH_MAY`.
  Cả ba chỉ lộ ra khi CHẠY THẬT. Đó là việc của `check-pyodide.mjs`.
- **`loadPackage` KHÔNG ném khi thiếu wheel — nó lặng lẽ tải từ CDN.** Giấu thử
  `pandas-3.0.2-….whl` đi rồi chạy bộ chấm: `loadPackage` resolve bình thường,
  `loadedPackages` báo có pandas, `import pandas` ra `3.0.2` — vì Pyodide rơi về
  `cdn.jsdelivr.net`. Nghĩa là ba bộ chấm chưa bao giờ chứng minh được các wheel
  trong `frontend/public/pyodide/` dùng được: xoá nhầm một cái vẫn xanh CI.
  Trong trình duyệt thì NGƯỢC LẠI — CSP `connect-src 'self' ${API_ORIGIN}`
  (`frontend/next.config.ts`) chặn đường CDN đó, nên cùng một wheel thiếu là
  hỏng cứng với học viên mà CI không hề biết. Cả ba bộ chấm
  (`pe-da/check-pyodide.mjs`, `pe-v4/check-pyodide.mjs`, `pe-v4/check-advanced.mjs`)
  nay vá `globalThis.fetch` để TỪ CHỐI mọi địa chỉ `http(s)://`. Đừng gỡ: nó là
  thứ duy nhất làm hai môi trường nói cùng một chuyện. Kiểm lại bằng cách đổi tên
  một wheel rồi chạy `node scripts/pe-da/check-pyodide.mjs PD01` — phải ĐỎ.
- **Lần chạy BỊ CẮT từng trả về đầu ra RỖNG — `terminate()` giết luôn thông điệp 'result'.**
  Chạy `while True: print("dong", i)` rồi bấm Dừng sau 2 giây: ô kết quả hiện "(Không có đầu
  ra)" dù chương trình đã in hơn 6 000 dòng, và mục chọn "In vô hạn (cắt đầu ra)" ngay trong
  trang thì hứa điều ngược lại. Đường Docker cũ không có lỗi này vì máy chủ giữ stdout hộ.
  Cách sửa: hook stdout của worker `postMessage({type:'partial'})` theo nhịp 200 ms — gửi được
  dù worker đang bị chặn, vì `postMessage` chỉ xếp hàng còn main thread thì không bị chặn — và
  `cat()` trong `ide-runner.ts` resolve bằng đợt cuối nhận được thay vì `stdout: ''`.
  **Cả 173 ca test trước đó đều ĐẠT khi lỗi này còn nguyên**: không ca nào chạm tới đường
  bị-cắt. Nay có `ide-partial-output.test.mjs` (10 ca).
  Hai nhãn đi kèm cũng sai và đã sửa: thông báo cắt đầu ra ghi "vượt 1 MB nên bị cắt và chương
  trình đã bị dừng" — trần thật của worker là 60 000 ký tự MỖI LUỒNG và chương trình VẪN chạy;
  còn câu "phần đã in ra của lần chạy này mất theo" thì nay không còn đúng. Hằng
  `IDE_OUTPUT_CAP_CHARS` xuất từ `ide-runner.ts`, và test so nó với con số thật trong worker.
- **`loadPackage` KHÔNG import, nên 5,62 s của matplotlib từng ăn vào hạn 15 giây.** Đo trên
  /ide: bài vẽ biểu đồ lần chạy đầu báo "Thời gian chạy: 5,62 s", toàn bộ là
  `import matplotlib.pyplot` (dựng cache font, chọn backend) — nằm trong mã người học nên tính
  vào hạn của họ, và một bài vẽ nhiều hình bị cắt vì THƯ VIỆN chứ không vì mã mình. Nay worker
  import sẵn ngay sau `loadPackage`, TRƯỚC khi bấm giờ: cùng đoạn mã báo **0,04 s**. Phải làm
  nóng đúng `matplotlib.pyplot` (`LAM_NONG`), vì `import matplotlib` gần như miễn phí.
- **Cổng ẩn/hiện nút "Thử ngay trong IDE" từng ghi lại kiến trúc ĐÃ BỎ, và nó ngược hẳn.**
  `ide-brief-code.ts` chặn `matplotlib` và cho qua `threading`/`multiprocessing`/`subprocess`
  — đúng với ảnh Docker `python:3.12-slim`, sai với Pyodide. Đo lại trên /ide: matplotlib
  3.10.8 dựng được Figure; `Thread.start()` ném "RuntimeError: can't start new thread";
  `multiprocessing` thiếu `_multiprocessing`; `subprocess` ném OSError 138. Đã đảo danh sách
  (17 bài bị chặn, 31 bài còn nút, trong đó có cả 10 bài biểu đồ).
  **Chọn bài theo IMPORT THẬT, đừng theo tiền tố mã bài**: bản đầu của ca test này dùng P01 vì
  tưởng "P" là process, nhưng P01 chỉ `import os` nên nó chạy được và phải giữ nút.
  Phạm vi: hai hàm này chỉ được gọi từ màn `brief` và màn `explain`, mà bộ 172 bài đang xuất
  bản không có màn nào trong hai màn đó (0/172) — nên hôm nay luật này không ẩn/hiện nút cho
  người học nào. Vẫn sửa, vì nó sẽ âm thầm sai vào ngày pe-v4 bật lại.
- **Nhãn phiên bản Python trong giao diện từng ghi cứng 3.12, và nó là nhãn MẶC ĐỊNH.** Màn
  "Thử thách độc lập" hiện "CPython 3.12" trước lần chạy đầu rồi đổi sang "CPython 3.14.2";
  trang chủ dán "Python 3.12" lên mọi ô khoá học; một màn còn ghi "CPython 3.11". Luật nay:
  nhãn nào chỉ MÔ TẢ runtime thì KHÔNG ghi số — số thật đến từ `runtimeStatus` lúc chạy, nhãn
  dự phòng không có số thì không bao giờ lệch sau một lần nâng Pyodide.
  `label-version.test.mjs` quét cả `frontend/src` (bỏ chú thích) nên không ghi lại được.
  Bẫy nhỏ trong chính ca test đó: file trong repo là CRLF, mà `.` của regex không khớp `
`
  nên `//.*$` không bóc được chú thích cuối dòng — phải `.replace(/
/g, '')` trước.
- **Ô kết quả của bài học hứa chạy `solution.py` trong khi đầu ô ghi `main.py`.** Placeholder
  trong `SandboxEditor.tsx` ghi cứng tên file thay vì dùng prop `filename`, mà màn "Thử thách
  độc lập" truyền `main.py` — hai tên cho một file, cạnh nhau trên cùng màn hình.
- **Mở một bài học còn gọi BA lượt API TUẦN TỰ ở phía client — 3,7 giây trước khi có chữ.**
  Đo trên production bằng Resource Timing (API đã nóng): `/api/user` 1198 ms → `/api/enrolled`
  1286 ms → `/content` 1239 ms, nối đuôi nhau. Nay cả ba trong một `Promise.all` → còn một
  lượt, ~1,3 giây. Đo lại ở máy: ba lượt bắt đầu cách nhau **1 ms**.
  **Chú thích cũ nói phải gọi tuần tự, và lý do đó KHÔNG đứng:** nó viết "với người mới,
  request đầu tiên là request tạo tài khoản khách". Nhưng `apiFetch` gặp 401 thì gọi
  `refreshAccess()` rồi `ensureGuest()` — CẢ HAI dedupe bằng promise ở tầm module — rồi GỬI
  LẠI request. Đã kiểm trong một ngữ cảnh trình duyệt sạch: ba lượt 401 → đúng **MỘT**
  `/auth/guest` → cả ba tự gửi lại. Một tài khoản, không ba.
  `/content` được phép 403 (người mới chưa ghi danh): nhánh ghi danh lo, rồi gọi lại content.
  Người MỚI trả thêm một lượt, người ĐANG HỌC — ca thường — tiết kiệm hai lượt.
  **Phép nhận diện 403 phải có HAI dấu hiệu**, vì mỗi cái một mình đều mong manh: `json()`
  dựng Error từ *thông điệp* backend, nên khi backend có message thì chuỗi "403" KHÔNG xuất
  hiện, còn khi không có message thì nó mới ghép `(403)`. Và phải `403` chứ không
  `includes('403')` — nếu không thì một lỗi 500 của bài sortOrder 4030 cũng bị nuốt.
  Hàm nằm ở `frontend/src/lib/lesson-load.ts` (không trong hook: logic trong hook là logic
  không có test), `lesson-load.test.mjs` 7 ca.
- **Mở một bài học từng đi BA vòng DB tuần tự — và `.env.example` hứa một bộ cache KHÔNG tồn
  tại.** `getLessonContent` gọi lần lượt `enrollment` → `lesson` → `lessonProgress`. Đo trên
  chính DB đang dùng (trung vị 9 lượt): **150 ms**. Nay `enrollment` chạy SONG SONG với
  `lesson`, và tiến độ gộp vào truy vấn lesson bằng quan hệ `Lesson.lessonProgress` → **99 ms,
  nhanh hơn 34%**. Mỗi lượt mở bài đi qua đây đúng một lần, nên đây là 51 ms mà MỌI học viên
  trả ở MỌI bài.
  **`$transaction([...])` CHẬM HƠN, đừng dùng nó để gộp truy vấn đọc:** đo được 251 ms, tức
  +101 ms so với bản cũ, vì transaction tương tác thêm vòng BEGIN/COMMIT.
  **Giá phải trả, có chủ đích:** người CHƯA ghi danh cũng làm tốn một truy vấn lesson rồi mới
  bị 403. Không lộ gì vì hàm throw trước khi dùng tới nó — và ca test tương ứng đã viết lại cho
  đúng tính chất: nó kiểm "KHÔNG trả nội dung ra", không kiểm "đã gọi mấy truy vấn" (một chi
  tiết hiệu năng mà mỗi lần tối ưu lại phải sửa test).
  **Phải tách `lessonProgress` khỏi `lesson` trước khi trả về:** hàm return `{ ok, lesson,
  completed }` với `lesson` nguyên đối tượng, để nguyên là bê một mảng `[{lessonId}]` vào
  response và đổi hình dạng API mà không ai yêu cầu.
  **Và fixture test phải mang hình dạng MỚI:** `lessonProgress` nằm TRONG hàng lesson. Để nó
  ra ngoài như truy vấn cũ thì `completed` luôn false, và ca "đã hoàn thành → được xem lời
  giải" vẫn ĐẠT vì lý do sai — đúng họ bẫy fixture mà file này đã ghi ở trên.
  `LESSON_CACHE_TTL_MS` / `LESSON_CACHE_DISABLED` đã bỏ khỏi `.env.example`: không mã nào đọc
  chúng và `git log -S` trên `src/` không có commit nào — bộ cache đó chưa bao giờ được làm,
  nên dòng hứa "giảm ~550 ms mỗi lần mở bài" là tài liệu nói sai suốt từ đầu.
- **Kho quiz chấm Ở SERVER từng RỖNG HOÀN TOÀN — 0/172 bài có câu hỏi.** Đây là phần duy
  nhất của hệ thống chấm mà client không giả mạo được: `submitQuiz` chấm theo SNAPSHOT trong
  DB, `stripAnswers` không gửi `correct`/`explanation` ra ngoài, và mỗi đề chỉ nộp được một
  lần. Vậy mà nó không có câu nào để ra đề. Nay 516 câu (3 mỗi bài) lấy từ 1032 câu NGƯỜI VIẾT
  của gói practice.
  **Lệch ở ĐÚNG ba tên, và lệch IM LẶNG.** Gói dùng `prompt` / `correctOption: '<id>'` /
  `feedback`; `normalizeQuestion` đòi `question` và tìm `options[].correct === true`, frontend
  thì đọc `text` + `detail`. `normalizeQuestion` trả `null` cho mọi câu thiếu `question`, nên
  đưa nguyên hình dạng của gói vào là kho quiz CỨ RỖNG — không ngoại lệ nào được ném, không
  log nào đỏ. Phép đổi tên nằm ở `cau_trac_nghiem()` trong build.py, KHÔNG phải thêm nhánh
  vào service: service đã đọc đúng hình dạng mà cả dự án dùng.
  **`correct: False` không được phát ra**, chỉ `correct: True` trên đúng một lựa chọn —
  `findIndex(o => o.correct === true)` chạy đúng khi lựa chọn sai không có khoá đó.
  **3 câu mỗi bài, không phải 6.** Gói có 6 (1 gốc + 5 biến thể). Phát hết là thêm 6 màn vào
  mỗi bài; và vì mỗi bài chỉ có MỘT gốc câu hỏi, câu thứ 4–6 vẫn hỏi cùng một thứ. Con số 3
  khớp pe-v4, nên hệ quả "phải xong 2 bài mới mở được quiz ôn" (MIN_POOL = 5 CÂU) vẫn đúng.
  Ba biến thể còn lại GIỮ trong `source/practice.json` có chủ đích: bài thi vượt module sau
  này phải dùng câu người học CHƯA thấy trong bài.
  **Đề ôn không được lấy hai câu CÙNG MỘT BÀI khi còn bài khác** (`pickSpreadByLesson`): 3 câu
  của một bài là 3 biến thể cùng gốc, nên bốc đều trên pool thì học viên xong 2 bài nhận đề 5
  câu rất dễ gặp 3 câu hỏi cùng một chuyện — và họ đọc ra điều đó là "đề bị lặp". ƯU TIÊN chứ
  KHÔNG bắt buộc: siết thành luật cứng thì đề 5 câu cần 5 bài, trong khi `MIN_POOL` chỉ hứa 5
  CÂU. Ablate: bỏ luật → 2 ca đỏ; siết thành luật cứng → 9 ca đỏ. `sample()` (Fisher-Yates) đã
  xoá vì không còn chỗ nào gọi.
  **Ca test backend KHÔNG chứng minh được build.py chọn đúng đáp án** — nó so `correct` của
  snapshot với vị trí lựa chọn mang cờ trong BẢN DỰNG, tức so bản dựng với chính nó. Đã ablate:
  đổi build.py sang đánh dấu lựa chọn ĐẦU TIÊN là đúng thì cả 30 ca backend vẫn XANH. Thẩm
  quyền về đáp án nằm ở `correctOption` của nguồn, nên phép so đó ở `kiem_trac_nghiem()` trong
  check.py (4 luật, ablate cả 4 đều đỏ).
  **ĐỔI HÀNH VI NGƯỜI HỌC THẤY ĐƯỢC:** trước đây pe-da không có màn nào được chấm nên điểm bài
  luôn 100% và XP được trả bất kể hiểu hay không. Nay 3 câu được chấm mỗi bài, nên trả lời sai
  là điểm dưới 100 và XP ít hơn. Thời lượng khoá 1 836 → 2 352 phút (1 phút/câu), và
  `catalog.ts` phải đi theo — `catalog-duration.test.mjs` cộng từ bản dựng thật nên nó bắt.
  **Một lỗi màn-hình-trắng có thật đã sửa nhân dịp này.** `screenVerdict` dùng
  `Number.isInteger(picked)` để chặn index xấu, mà `keyIndex('')` trả **-1** và
  `Number.isInteger(-1)` là TRUE — nên nó gọi `optionDetail(q.options[-1])` và ném TypeError.
  Bộ test đã GHI NHẬN đây là "KHIẾM KHUYẾT ĐÃ BIẾT" và khoá đúng hành vi ném đó, kèm câu dặn
  phải đổi assert khi sửa. Hàng rào duy nhất trước đây là nút "Kiểm tra" bị disable bởi
  `answered()`, và nó KHÔNG chặn được nháp cũ trong localStorage giữ khoá của bản bài có nhiều
  lựa chọn hơn — học viên đó mở bài là crash, mãi mãi. Nay `picked >= 0` và `optionDetail` nhận
  `undefined`.

- **Khoá 172 bài từng KHÔNG có một ca chấm nào, và bốn chỗ cùng ghi lại giả định đó.**
  Đếm trên bản dựng ngày 26/10: 172/172 bài có `step_4.task`, 145 bài có `starterCode`, và
  **0 bài** có `step_4.tests`. `step_2.practice` chỉ hiện đáp án mẫu. Người thử viết code rồi
  tự so bằng mắt — đúng thứ cố vấn dự án gọi là tính năng lõi thì không có. Gói nội dung mới
  mang 138 bài tự làm kèm 419 ca chấm thật và lời giải tham khảo cho từng bài.
  **Hai hợp đồng ca chấm nay cùng tồn tại, và chúng KHÔNG thay nhau được:**
  · BIỂU THỨC (`{name, call, expect}`) — hai chuỗi eval trong namespace học viên rồi so `==`.
    pe-v4 cần nó để gọi `_studio.run(...)`, dựng fixture, đọc timeline thread/process. 427 ca.
  · DỮ LIỆU (`{name, input, expected}`) — giá trị JSON thuần, mỗi ca chạy LẠI chương trình
    trên namespace mới. 415 ca của 124 bài pe-da.
  Bộ chấm phân nhánh theo **TRƯỜNG CÓ MẶT** (`'call' in case`), không theo một cờ riêng: một
  cờ riêng là thứ thứ hai phải khớp, và nó sẽ lệch.
  **Vì sao không quy hết về `==`:** đã đo, 65/389 ca trượt OAN, cả 65 vì hai chuyện máy móc.
  JSON không có tuple nên `(8,3) == [8,3]` là False (8 ca: NP07/PY11/RD01); và
  `np.array([1,2]) == [1,2]` trả về MẢNG, rồi `bool()` của nó ném "truth value of an array
  with more than one element is ambiguous" (19 ca, 8 bài NP*) — học viên viết đúng mà nhận
  lỗi numpy. Nên `_chuan_gia_tri`/`_bang_du_lieu` là bản CHÉP ngữ nghĩa từ
  `practice/worker.py` của gói: 419 `expected` được VIẾT theo chúng, nghĩ ra cách chuẩn hoá
  khác là tự tạo lệch. Giữ cả nhánh trông như dư (NAType/NaTType, float không hữu hạn).
  **`_execute(inject=...)` là thứ thứ ba, khác cả `vars` lẫn `setup`:** `vars` thay VẾ PHẢI
  một dòng gán đã có, `setup` chạy SAU mã học viên, `inject` đặt tên vào namespace TRƯỚC.
  Cần cho 12 bài `mode: "script"` (đề cấp `raw`, học viên gán `total` — mã họ không có dòng
  gán `raw` nào). Lần chạy CHÍNH cũng phải được tiêm: thiếu là 12/12 bài chết ở NameError
  trước khi ca nào kịp chạy, vì vòng chấm nằm sau `if error is None`.
  **BỐN chỗ ghi lại giả định "bộ đọc không có ca chấm", và mỗi chỗ chặn một kiểu:**
  `scripts/pe-da/check.py` (128 lỗi), `frontend/e2e/unit/studio-lesson.test.mjs` (một
  `assert.equal(l.step_4?.tests, undefined)` cho cả 172 bài),
  `src/course-admin/studio-lesson.schema.ts` (từ chối cả 124 bài với "thiếu biểu thức gọi
  hàm" — đây là CỬA DUY NHẤT vào DB, nên một bộ chấm chạy đúng trong trình duyệt mà không có
  đường nào tới học viên), và `ide-brief-code.ts`/`answer-key.ts`/`chrome.tsx` (`t.call`
  không còn chắc chắn tồn tại). Thêm hợp đồng mới thì phải đi hết bốn chỗ.
  **Cổng của bài TẬP nới hơn cổng của bài ĐỌC, có lý do:** `phan_loai_khoi(cho_mo_phong=True)`
  cho qua `threading`/`subprocess`/`multiprocessing` vì harness MÔ PHỎNG chúng và ca chấm chỉ
  hỏi GIÁ TRỊ TRẢ VỀ. Bài đọc phải nghiêm hơn vì nó so đầu ra với dòng "Kết quả:" tác giả
  ghi, mà mô phỏng in khác bản thật ở PID và thứ tự thread. Nới quá tay thì
  `check-practice.mjs` đỏ — nó chạy đúng những bài tập build phát ra.
  **14 bài không chấm được và đó KHÔNG phải lỗi:** openpyxl (PD13), seaborn (VZ16-19), plotly
  (VZ20-22), ipywidgets (VZ23), h5py (SY23), sqlalchemy (SY24) — Pyodide 314 không có wheel;
  CT07/CT08/EX04 vì `sys.executable` (bẫy "thuộc tính phơi ra máy thật" ở trên). Chúng giữ ô
  chạy thử như cũ. CT10/CT11 thì ngược: code bài đọc phải chạy trên máy nhưng bài tập chấm
  được tại đây, nên chúng PHẢI mang `env` nói rõ — không thì mất hẳn hướng dẫn "chạy trên
  máy" mà nhánh `local` của `dung_sandbox` vốn in ra.
  **Giá phải trả, có chủ đích:** 124 bài MẤT ô "sửa số liệu rồi chạy lại". Mọi đoạn code của
  bài đã hiện kèm kết quả ở màn đọc, muốn thử tự do thì có `/ide`, còn chấm thì không chỗ nào
  khác làm được.
  **Pha "lời giải SAI phải trượt" không phải cho đủ bộ.** Ablate 7 mảnh của hợp đồng: 5 mảnh
  gỡ ra làm pha 1 đỏ, nhưng `returnType` và "dict thừa khoá cũng là sai" gỡ ra pha 1 VẪN
  XANH — lời giải ĐÚNG không bao giờ trả sai kiểu hay thừa khoá. Thêm hai biến thể BỌC quanh
  lời giải mẫu (giữ nguyên giá trị, chỉ đổi hình dạng) thì cả 7 mảnh đều đỏ: 9 / 60 / 1 / 27
  / 54 / 12 / 2 vấn đề.
  **Luật "khung trống phải trượt HẾT" là SAI** và đã viết lại sau 5 dương tính giả: PY16,
  NP17, VZ30, SY03, SY13 mỗi bài có một ca "đầu vào rỗng → null" mà `pass` trả đúng None. Ca
  đó không sai — đáp án đúng cho "chưa có số đo" thật là không có kết quả. Luật đúng: khung
  trống không được đạt ca có `expected` KHÁC null, và không được đạt hết. Cùng lý do,
  `studio-lesson.schema.ts` phải kiểm KHOÁ CÓ MẶT chứ không kiểm giá trị khác null.
  **Khung trống chỉ là MỘT hình dạng của "chưa làm gì", và họ đó cắn 38 bài.** Pha 2 nay thử
  thêm hai nhóm biến thể TẦM THƯỜNG: dội nguyên đầu vào ra (`return data`, hoặc
  `total = raw` với bài `mode: "script"`) và trả giá trị RỖNG theo đúng kiểu của đáp án
  (`[]`, `{}`, `0`, `''`, `False`, `None`). Luật giữ nguyên, không nới một li: đạt ca có
  `expected` KHÁC giá trị tầm thường ấy là LỘ ĐÁP ÁN; đạt đúng ca mà `expected` BẰNG chính nó
  là tự nhiên, chỉ ghi nhận. Đo được: **50 lần** ở **38 bài**, và một bài — SY20 — bị
  `return data` đạt **3/3** vì bài là round-trip qua ZIP nên đáp án đúng BẰNG đầu vào. Mỗi
  bài trong 38 bài đó nhận THÊM một ca mà lời giải tầm thường trượt (377 → 415 ca).
  **Bốn ca mới bắt được lời giải mà CẢ BỘ CŨ cho đạt** — đây là phần đáng giá, không phải con
  số: · VZ30 `if event.xdata and event.ydata` (truthiness thay cho `is not None`) đạt 4/4 ca
  cũ, trượt ca "tọa độ 0 vẫn là lựa chọn hợp lệ"; · SY16 `line.rstrip('\n')` đạt 3/3, trượt
  ca "dòng kết thúc kiểu Windows" (còn lại một `\r`); · SY18 trả `found` mà không `sorted`
  đạt 3/3, trượt ca "nhiều file cùng cấp phải xếp theo tên" — `os.walk` trả theo thứ tự TẠO
  file, hai ca cũ tình cờ đã đúng thứ tự; · SY20 `return data` đạt 3/3, trượt ca "tên kèm
  byte null bị zipfile cắt khi ghi" (`ZipInfo.__init__` cắt tên ở byte NUL — đo trong chính
  Pyodide 314), và ở một bài round-trip thì đó là thứ DUY NHẤT phân biệt được "đã đi qua
  zipfile" với "dội lại đầu vào".
  34 bài còn lại chỉ đổi mẫu số (1/3 → 1/4): ca mới làm lời giải tầm thường trượt thêm một
  ca, không bắt thêm lỗi nào khác. Và ca "đầu vào rỗng → null/[]/0" thì KHÔNG xoá được — đáp
  án đúng cho "chưa có số đo" thật là không có kết quả — nên người học chưa viết gì vẫn thấy
  1 ca xanh. Muốn hết thì phải sửa Ô KẾT QUẢ (đừng tô xanh khi chưa có hàm `solve`/biến kết
  quả), không phải sửa dữ liệu ca chấm.
  **`check-practice.mjs` đọc BẢN DỰNG, không đọc `source/practice.json`:** giữa gói và học
  viên có một cổng lọc (`bai_tap_cua`) và một phép chuyển hình dạng, nên kiểm nguồn thì một
  lỗi của build.py không làm đỏ ở đâu cả.
  **Đã xem thật trong Chrome,** không chỉ chạy bằng Node: module worker nạp được, CSP của file
  worker không chặn, `contract` sống qua `postMessage` (bài script tiêm được `raw`, đọc được
  `total`), tuple/numpy/isclose đều đúng, lời giải sai bị đánh trượt, 2–6 ms mỗi lượt. Chính
  lần xem đó bắt được hai chuỗi người học đọc bị MẤT DẤU ("Dat:", "Can co 15 nhung nhan 7.5")
  — thứ không bộ test nào canh vì chúng chỉ là chuỗi hiển thị.

- **Hạn phiên nay KHÁC NHAU theo loại tài khoản, và đó là một lựa chọn an ninh có chủ đích.**
  Đợt thử nghiệm cố ý không bắt đăng nhập, nên với người thử, refresh token CHÍNH LÀ thứ duy
  nhất giữ tiến độ: hết hạn là `apiFetch` rơi xuống `ensureGuest()` và cấp một tài khoản MỚI —
  họ thấy như mất sạch. Production đặt `JWT_REFRESH_EXPIRES=24h`, nên ai quay lại hôm sau cũng
  mất. Nay khách `@guest.local` đi theo `JWT_GUEST_REFRESH_EXPIRES` (mặc định **30d**), tài
  khoản thật giữ nguyên `JWT_REFRESH_EXPIRES`.
  **Vì sao KHÔNG nâng hạn chung lên 30 ngày:** làm vậy là nới cửa sổ dùng được của một cookie
  bị đánh cắp cho đúng những tài khoản CÓ GÌ ĐỂ MẤT — quản trị viên và tài khoản mang hash
  Werkzeug từ bản Django. Tài khoản khách không mật khẩu (không đăng nhập lại bằng cách khác
  được), không thông tin cá nhân, chỉ có tiến độ bài học.
  **Chỗ duy nhất phân biệt là `lifetimeMsFor(email)`** trong `refresh-token.service.ts`; hằng
  `HAU_TO_KHACH` export từ đó và `auth.service.ts` import lại để dựng email, nên hai nơi không
  lệch nhau được. Hàm THUẦN, không truy vấn: mọi chỗ gọi đều đã có email trong tay, nên
  `rotateAndBlacklist` lấy email bằng `include` trong CÙNG vòng DB đang có, không thêm vòng mới.
  **Cửa sổ là TRƯỢT nên hạn phải tính lại ở MỖI lần rotate**, không chỉ lúc cấp đầu — nếu
  không thì người thử vẫn mất tiến độ, chỉ là đúng 30 ngày sau thay vì 24 giờ.
  **Bản sửa nửa vời dễ trông như xong:** tính đúng hạn ở `AuthService` nhưng để controller đặt
  cookie bằng hằng `lifetimeMs`. Khi đó body nói 30 ngày, cookie chết sau 8 giờ, và API khẳng
  định ngược lại điều đang xảy ra. `moveRefreshToCookie` phải lấy CẢ cookie lẫn
  `refreshExpiresIn` từ cùng `refreshExpiresInMs` của chính lần cấp đó — đúng bài học của vụ
  lệch 8h/24h ngày 25/10, chỉ khác là lần này lệch theo LOẠI TÀI KHOẢN nên còn khó thấy hơn.
  `refreshExpiresInMs` (milliseconds) là chi tiết nội bộ, hợp đồng ra ngoài là `refreshExpiresIn`
  tính GIÂY; để lọt cả hai thì sớm muộn client đọc nhầm đơn vị — lệch 1000 lần theo chiều NỚI
  hạn, tức đúng chiều nguy hiểm.
  **Mock ConfigService phải phân biệt KHOÁ.** `refresh-token.service.spec.ts` từng dùng
  `{ get: () => '8h' }` — trả '8h' cho mọi khoá, nên `jwt.guestRefreshExpires` cũng thành 8 giờ
  và MỌI ca so "khách khác tài khoản thật" đều vô nghĩa mà vẫn XANH. Cùng họ bẫy fixture ghi ở
  trên. 5 ca canh chỗ này (`refresh-token.service.spec.ts` 2, `refresh-expires-contract.spec.ts`
  2, `auth.guest.spec.ts` 1); ablate `lifetimeMsFor` → 2 đỏ, ablate cookie → 1 đỏ.

- **Bộ chạy Python ở MÁY CHỦ đã bị xoá (25/10) — và chỗ duy nhất không được xoá cùng.**
  `src/python-runner/`, `runner/`, `docker/py-sandbox/` đi hết; `/ide` nay chạy Pyodide trong
  trình duyệt. Xác nhận trên production TRƯỚC khi xoá: `/ide` chạy `print(sys.version)` ra
  `3.14.2 … emscripten` trong 0,01 s, ghi vết 17 bước, và DevTools cho thấy **0 request nào
  tới `/api/python/*`**.
  **Chỗ phải cứu trước khi xoá:** `src/python-runner/tracer/pe_tracer.py` là NGUỒN sinh ra
  `frontend/public/static/py/pe_tracer.min.py` — file worker `/ide` fetch mỗi lần bấm "Xem
  từng bước". Nay nằm ở `scripts/tracer/`, cạnh `build-tracer-source.mjs`. Nếu có ai dời nó
  nữa thì `frontend/e2e/unit/tracer-web-sync.test.mjs` đỏ kèm đúng câu phải làm (nó nằm ở bộ
  test FRONTEND có chủ ý — bộ canh cũ `tracer-source.spec.ts` đã bị xoá cùng module).
  Bẫy kèm theo khi dời: `pe_tracer_test.py` tính ROOT bằng BA lần `..` (đúng cho
  `src/python-runner/tracer/`), dời lên một tầng mà không sửa thì nó trỏ ra ngoài repo và chết
  với `CalledProcessError`. Nay hai lần.
  **Biến môi trường đã bỏ, 14 cái:** `PY_SANDBOX_IMAGE`, `PY_RUN_TIMEOUT_MS`,
  `PY_RUN_MAX_CONCURRENT`, `PY_RUN_QUEUE_TIMEOUT_MS`, `PY_RUN_QUEUE_MAX`, `PY_RUN_MEMORY`,
  `PY_RUNNER_MODE`, `PY_RUNNER_PUBLIC`, `RUNNER_URL`, `RUNNER_SECRET`, và bốn biến throttle
  của hai route đó (`THROTTLE_PY_RUN_LIMIT/TTL_SECONDS`, `THROTTLE_PY_TRACE_LIMIT/TTL_SECONDS`
  — chúng chỉ còn được validate, `throttle.config.ts` không hề đọc).
  **Bài học KHÔNG được xoá theo:** `config.get<number>()` chỉ ép kiểu lúc BIÊN DỊCH, nên biến
  số không khai trong `env.validation.ts` giữ nguyên dạng CHUỖI và code đi cộng chuỗi. Sự cố
  13/10/2026 do đúng chuyện đó (`"30000" + 10000 + 10000` → `"300001000010000"` →
  `AbortSignal.timeout` ném TypeError → 503 trong khi dịch vụ phía sau vẫn khoẻ). Biến gây ra
  nó đã xoá, bài học thì chuyển lên đầu schema và `env.validation.spec.ts` chuyển sang canh
  các biến số CÒN LẠI.
  **Nửa FRONTEND cũng đã dọn:** không còn `ideRunnerMode()`, không còn cờ
  `NEXT_PUBLIC_IDE_RUNNER` lẫn `?runner=server`, `runner-error.ts` (`isRunnerDown`) và bộ test
  10 ca của nó đi cùng. `needsLinkConfirm` nay nhận `(source, referrer?)` — tham số `mode` đã
  bỏ. Union `kind` của lỗi thu hẹp: `IdeClient` còn `unavailable | other` (hai loại cũ
  `private` cho 401 và `busy` cho 429 không còn nguồn nào sinh ra), `CodeVisualizer` còn
  `infra | other`.
  Một chi tiết tưởng là lỗi mà không phải: nhánh client KHÔNG gọi `setIndex(0)` trong khi
  nhánh máy chủ có — nhưng dòng đầu của chính hàm đó đã `setIndex(0)` rồi, nên lời gọi ở nhánh
  máy chủ là DƯ, không phải thứ bên client bị thiếu. Kiểm trước khi "sửa".
  **Dọn tới đây mới hết:** `@ThrottleMessage` nay KHÔNG controller nào dùng (route cũ là chỗ
  duy nhất) — nhánh đọc decorator trong `custom-throttler.guard.ts` đang ngủ, giữ lại vì nó là
  cách duy nhất để một route nói câu 429 riêng. `docs/azure-runner-plan.md` (909 dòng) được
  ĐÁNH DẤU lỗi thời chứ không xoá: phần nghiên cứu chi phí còn giá trị cho ngày cần chạy mã ở
  máy chủ thật. Mục 6 của `docs/deploy-runbook.md` đã viết lại.
- **Request API ĐẦU TIÊN sau lúc máy chủ nghỉ mất hơn 25 giây, và trang không nói gì.**
  Đo trên production 25/10/2026: lượt đầu >25 s (Render + Neon thức dậy), các lượt sau 300 ms.
  Suốt quãng đó `StudioLesson` chỉ hiện "Đang tải bài học…" — không một chữ nào nói vì sao,
  nên người học ĐẦU TIÊN trong ngày kết luận là trang hỏng. Nay quá 6 giây thì đổi sang câu
  nói thẳng rằng máy chủ đang khởi động lại và tiến độ vẫn còn. Mốc 6 giây: dài hơn mọi lần
  tải bình thường (300 ms – 3 s) nên không ai thấy nó oan, ngắn hơn ngưỡng mất kiên nhẫn.
  **Phần dễ vướng:** React 19 chặn `setState` ĐỒNG BỘ trong thân effect
  (`react-hooks/set-state-in-effect`), nên chỗ dọn cờ phải nằm trong CLEANUP của effect, không
  phải nhánh `if (!loading)`. Đã kiểm trong trình duyệt bằng giả lập Slow 3G và hạ tạm mốc
  xuống 300 ms: thấy "Chờ một chút…" rồi chuyển sang câu cold start đúng lúc quá mốc.
  Đây CHỈ là lớp giải thích, không phải sửa cold start. Muốn hết chờ thì phải chạm tới hạ tầng
  (giữ máy chủ thức, hoặc Neon không autosuspend) — việc đó chưa làm.
- **Nút "Try it Yourself" đã dựng từ lâu và KHÔNG có đường tới người học — nay đã nối.**
  `TryItButton` + `ideCodeHref` + `/ide#code=…` có đủ, nhưng nút chỉ được MOUNT ở màn `brief`
  và màn `explain`, mà bộ 172 bài có **0/172** màn nào trong hai màn đó. Một tính năng có nút,
  có cổng (`ide-brief-code.ts`), có test (`ide-brief-code.test.mjs` 12 ca vẫn xanh vì nó test
  trên dữ liệu pe-v4 đã ẩn) — và không một người dùng nào. Chú thích trong `ide-brief-code.ts`
  đã ghi đúng điều đó từ trước; cái thiếu là ai đi nối.
  Nay khâu build phát cờ `tryIt` lên từng khối code của màn đọc và `ReadScreen` dựng nút dưới ô
  "Kết quả:" — **406 nút / 145 bài**, 27 bài `local` không có nút nào.
  **Phép phân loại phải nằm ở BUILD, không ở frontend.** `chayDuocTrongIde` là một regex trên
  dòng `import`: nó bắt đúng giới hạn WASM (tkinter/threading/subprocess) nhưng KHÔNG biết thứ
  thật sự chặn bài của khoá này — THIẾU WHEEL (seaborn, plotly, openpyxl, h5py, sqlalchemy,
  ipywidgets), gói ẩn sau chuỗi (`engine="openpyxl"`), và thuộc tính phơi ra máy thật
  (`sys.executable`). Chỉ `phan_loai_khoi()` biết cả ba, và nó đã tính sẵn phép phân loại đó
  từ trước — chỉ thiếu đường đi tới từng khối (`thu_duoc` khoá theo `id()` của dict nguồn;
  `chia_man` chia lại chính các dict trong `reading` nên id còn đúng).
  **Mã bàn giao là TIỀN TỐ, không phải một khối — và đây là chỗ bản sửa nửa vời trông như
  xong.** Nguồn viết các đoạn để chạy NỐI TIẾP nhau: đoạn 3 dùng `df` và `import pandas` của
  đoạn 1. Bàn giao một mình đoạn 3 là mở tab mới rồi để người học đọc `NameError: name 'df' is
  not defined` — đúng cái nút này ra đời để tránh. `maDeThu()` gộp mọi khối `tryIt` từ đầu bài
  tới khối được bấm, **vắt qua ranh giới màn** (build đã chia bài thành màn nên đoạn 1 thường ở
  màn trước). Nhãn nút đổi khi mã gồm cả đoạn trước.
  **406 không phải con số tự chọn:** đó đúng là số đoạn `check-pyodide.mjs` chạy thật rồi so
  với `expected`. Hai con số lệch nhau = nút trỏ vào đoạn chưa ai chạy thử.
  **Phép nối phải khớp từng ký tự ở BA chỗ:** `noi_code()` (build.py), `_noi_nhu_build()`
  (check.py — cố ý CHÉP chứ không import: import thì lỗi xuất hiện ở cả hai phía phép so và
  luật không chứng minh gì), `maDeThu()` (studio-lesson.ts).
  Luật "nối đầy đủ == `step_4.starterCode`" phải LOẠI bài có `tests`: `starterCode` của chúng
  là KHUNG TRỐNG của bài tập, không phải mã bài đọc — lẫn hai thứ cho đúng 122 lỗi sai, đã gặp.
  Ablation: không phát cờ → 145 lỗi check.py; lệch bản đồ `id()` → 7 lỗi; cờ lên cả khối
  `terminal` → 88 lỗi. Phía frontend: không vắt qua màn → 3 ca đỏ; bỏ khối trước trong cùng màn
  → 4; bỏ lọc `tryIt` → 4; bỏ mốc `# ── Đoạn i ──` → 3.
- **Dải "mã đến từ link" từng hỏi cả khi link đến TỪ trang bài học.** Nút "Thử ngay trong
  IDE" cũng đi qua `/ide#code=…`, nên đường đi CHÍNH của sản phẩm cũng bị chặn một lần hỏi —
  và một lần hỏi xuất hiện ở mọi lần dùng bình thường thì người ta bấm qua nó theo phản xạ,
  rồi đúng lần đáng chú ý cũng bị bấm qua. `needsLinkConfirm` nay bỏ qua link mà
  `document.referrer` trỏ về CÙNG origin.
  **Vì sao tín hiệu này đủ vững:** `referrerpolicy` chỉ CẮT BỚT referrer, không bịa ra được
  một origin khác; muốn referrer là origin này thì phải có trang chạy TRÊN origin này, tức đã
  có XSS — mà có XSS rồi thì không cần đi đường link. Referrer rỗng (gõ tay, bookmark, trang
  gửi đặt `no-referrer`) tính là KHÔNG tin nên vẫn hỏi.
  **Hai chỗ phải đi cùng nhau:** `TryItButton` phải là `rel="noopener"`, KHÔNG
  `rel="noopener noreferrer"` — `noreferrer` xoá đúng tín hiệu đang cần, và khi đó bản sửa
  trông như xong mà thực tế vẫn hỏi mọi link. Có ca test khoá chuỗi `rel` đó.
  So bằng `new URL(raw).origin === here`, KHÔNG bằng `startsWith`: với `startsWith` thì
  `programmingedu.io.vn.ke-tan-cong.com` cũng khớp. Và dùng `globalThis.location`, không
  `window.location` — ngoài trình duyệt thì `window` không có, ReferenceError bị `catch` nuốt
  rồi trả "khác origin", làm ca test cho origin của chính mình đỏ oan.
  Phạm vi: `TryItButton` chỉ được dựng ở `LessonBrief` (màn `brief`) và `ExplainScreen`
  (màn `explain`) — đếm được hai chỗ gọi. Bộ 172 bài đang xuất bản không có màn nào trong hai
  màn đó, nên hôm nay nó chưa đỡ phiền cho người học nào, đúng như chính cổng xác nhận.
- **Học viên từng không thấy hình do CHÍNH MÌNH vẽ — nay thấy, và đây là giá của nó.**
  Chạy một bài biểu đồ chỉ nhận lại MỘT DÒNG CHỮ "[matplotlib] 3 Figure được tạo"; hình trên
  màn đọc là PNG người soạn giáo trình xuất sẵn, nên sửa một dòng code rồi chạy lại thì không
  thấy gì đổi — với khoá Data Analyst có 26+ bài biểu đồ thì đó là mất gần hết giá trị của
  việc tự chạy. Nay `studio-harness.py` xuất PNG base64 vào trường `figures` (trần 6 hình /
  600 KB mỗi hình / 1,5 MB tổng), worker chuyển nguyên qua `...result`, và `SandboxEditor`
  dựng thẻ `<img src="data:image/png;base64,…">` dưới console.
  **Giá đã đo**, cho 10 bài biểu đồ (≈30 hình): không xuất ảnh 5,7 s · xuất không
  `bbox_inches` 11,5 s · có `bbox_inches='tight'` 14,0 s — tức ~0,8 s mỗi bài. Nó NẰM TRONG
  trần 5 giây của bài học, nên phải canh: ca chậm nhất của pe-v4 sau bản này là 949/1085 ms,
  còn 4× biên, và `pe-v4/check-pyodide.mjs` vốn đã đánh trượt mọi lần chạy quá 5 s.
  **Hai thứ dễ tưởng là bẫy mà KHÔNG phải** — đã ablate, không ca nào đỏ, rồi đo trực tiếp:
  · "xuất bằng `savefig` đã móc sẽ làm bẩn `_studio.main.saved`" → không, vì lúc `_anh_figure`
    chạy thì `_ctx()` đã là None nên bản móc không ghi gì (đường `_studio_original` giữ lại
    thuần phòng xa);
  · "gọi sau ca chấm thì hình mất vì `_reset_pyplot()`" → không, `plt.close('all')` không huỷ
    Figure và `savefig` vẫn chạy trên Figure đã close (đo được 16 598 byte PNG sau khi close).
  Thứ CÓ canh được: `figures = []` → 7 ca trượt; bỏ trần byte → 7; bỏ phép loại hình trống →
  1; bỏ trần số hình → 1 (`scripts/check-figures.mjs`, 16 ca, có trong CI).
  `<img>` phải kèm `// eslint-disable-next-line @next/next/no-img-element` NGAY TRÊN thẻ —
  `next/image` vô dụng với `data:` URI, và để chỉ thị trên một khối chú thích thì nó trỏ vào
  dòng comment, thành "unused directive" mà cảnh báo cũ vẫn còn (lint 178 → 180).
- **Code Python của học viên gọi được API kèm cookie phiên — đã bịt, và `worker-src` KHÔNG
  phải thứ bịt được.** `pyodide.ffi` cho code Python với tới JS, nên trong worker nó làm được
  `fetch(API_ORIGIN + '/auth/refresh', { credentials: 'include' })` và nhận về access token
  THẬT (đo trong Chrome 155, 25/10/2026). Nguyên nhân KHÔNG phải "worker không có CSP": entry
  `/(.*)` trong `frontend/next.config.ts` khớp cả `/static/js/*.worker.js`, nên ba worker vẫn
  đang chạy với đúng CSP của trang — mà CSP đó **cố ý** cho phép `connect-src … ${API_ORIGIN}`.
  Theo CSP3 §4.2 worker nhận policy từ response CỦA NÓ, nên cách bịt là một entry RIÊNG cho
  ba file worker với `connect-src 'self'`. Entry đó phải nằm **sau** `/(.*)`: trùng tên header
  thì Next.js lấy entry sau (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md`).
  Đo lại được: cùng một URL, server có mở CORS hết cỡ — gọi từ TRANG thì 200, gọi từ WORKER
  thì bị chặn, mà khác biệt duy nhất là header CSP trên file worker.
  **Phần dễ tưởng xong mà chưa xong:** `worker-src 'none'` KHÔNG chặn
  `js.Worker.new('/static/js/pe-bridge.js')` — đo được là nó chỉ chặn `blob:`, còn worker con
  từ URL cùng origin vẫn tạo được, vì Chrome xét worker con lồng trong worker theo
  `script-src`, mà `script-src` buộc phải có `'self'` để `import()` được `pyodide.mjs`. Và
  worker con đó nhận CSP của TRANG, tức có lại `API_ORIGIN` — bản sửa thành vô nghĩa. Nên mỗi
  worker còn phải tự `delete self.Worker` trước khi chạy mã học viên. Cả hai nửa bị khoá bởi
  `frontend/e2e/unit/worker-csp.test.mjs` (7 ca; gỡ từng nửa ra thì trượt đúng nửa đó, đã thử).
  Thêm worker Python mới thì phải khai vào `PYTHON_WORKERS` — ca "MỌI worker trên đĩa đều được
  khai" bắt chỗ này.
- **Worker Python là MODULE worker từ khi nâng lên Pyodide 314 — đừng quay về classic.**
  314 bỏ hẳn hỗ trợ classic worker và không còn phát hành `pyodide.js`, chỉ có `.mjs`. Cả hai
  worker (`studio-lesson.worker.js`, `python-studio.worker.js`) nay nạp runtime bằng
  `await import(PYODIDE_DIR + 'pyodide.mjs')`, và CẢ HAI chỗ tạo worker phải truyền
  `{ type: 'module' }` (`runner/pyodide-runner.ts`, `PythonStudio.tsx`). Thiếu một trong hai
  thì worker chết lặng lẽ, giao diện chỉ hiện "không chạy được Python".
- **Cảnh báo thư viện đổ CHUNG vào stdout.** `studio-harness.py` cố ý
  `redirect_stderr(ctx.out)` để console của học viên hiện cả hai. Hệ quả: một
  `MatplotlibDeprecationWarning` chen vào giữa và làm mọi phép so với `expected` trượt dù bài
  in đúng từng chữ. `check-pyodide.mjs` tách chúng ra và BÁO riêng (`tachCanhBao`) thay vì
  bỏ qua — hiện có 14 cảnh báo ở VZ14/VZ25/VZ30 do `figsize=(6, 3.5)` sinh kích thước điểm
  ảnh là số thực; đó là việc người soạn giáo trình phải sửa, không phải lỗi nền tảng.
- **Câu ôn tập nằm ở trường RIÊNG, đếm thiếu là tưởng mất 21% bài tập.** `course.json` có
  `drills` (516) VÀ `reviewExercises` (139) = 655 câu. Một lượt audit từng báo động "gói chỉ
  giữ 3 câu/bài, mất 139 câu" vì chỉ đếm `drills`. Bản dựng ra đúng 655, và `check.py` so
  số câu của từng bài với nguồn nên lỗi kiểu này không sống sót im lặng được.
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
- **Hạn của tài khoản khách là cửa sổ TRƯỢT, và frontend từng ghi cứng 8 giờ — ĐÃ sửa.**
  `JWT_REFRESH_EXPIRES` mặc định `'8h'` (`src/config/env.validation.ts`), nhưng
  `RefreshTokenService.lifetimeMs` là hằng đọc MỘT LẦN trong constructor và `expiresAt` được
  tính trong `issue()` — mà `rotateAndBlacklist()` gọi lại `issue()`, nên mỗi lần refresh là
  một hạn MỚI. Hệ quả vẫn đúng: muốn đổi luật hết hạn (ví dụ "khách giữ tiến độ 30 ngày") thì
  phải quyết ở `issue()`, đặt ở controller là vô ích.
  **Phần đã sửa, và vì sao nó là lỗi thật:** production đặt `JWT_REFRESH_EXPIRES=24h` — đọc
  nguyên văn header của `POST https://api.programmingedu.io.vn/auth/refresh` ngày 25/10/2026:
  `set-cookie: pe_refresh=…; Max-Age=86400; Path=/auth; HttpOnly; Secure; SameSite=Lax` —
  trong khi cookie mốc `pe_has_session` ghi cứng `max-age=28800` ở BỐN chỗ. Lệch 3 lần: từ giờ
  thứ 8 tới giờ thứ 24 phiên còn sống nhưng cookie mốc đã hết, nên trang công khai hiện "chưa
  đăng nhập" và badge "Tiếp tục ở bài X" biến mất dù tiến độ còn nguyên.
  Nay `/auth/*` trả thêm `refreshExpiresIn` (giây, lấy từ chính `lifetimeMs` dùng để đặt
  cookie) và client ghi cookie mốc theo con số đó — `danhDauPhien()` trong `api.ts`,
  `setSessionCookie(giay)` trong `pe-bridge.js`. Đổi `JWT_REFRESH_EXPIRES` là client đi theo,
  không phải sửa thêm chỗ nào.
  **Hướng lệch của hạn dự phòng KHÔNG đối xứng — đừng nâng `HAN_DU_PHONG_GIAY` lên "cho khớp
  production".** Đoán NGẮN hơn hạn thật thì chỉ mất cái badge, tiến độ còn. Đoán DÀI hơn thì
  trang công khai mời người học vào một phiên đã chết; `apiFetch` refresh không được, rơi xuống
  `ensureGuest()` và cấp một tài khoản khách MỚI — người học thấy như mất sạch tiến độ. Hai ca
  test canh đúng chỗ này (`session-marker.test.mjs`, `refresh-expires-contract.spec.ts`).
  `login.inline.js` vẫn dùng hạn dự phòng vì nó chỉ dán lại cookie cho phiên đã có, không gọi
  `/auth/*`; lần refresh kế tiếp (≤ 15 phút, bằng tuổi access token) ghi lại bằng số thật.
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

  **Hạn transaction phải NÓI RA — mặc định 5 giây không nạp nổi cả khoá.** Lần đầu nạp 124
  bài (27/10/2026): 124 câu UPDATE trong một transaction tương tác chạy 5 140 ms trên Neon,
  Prisma huỷ ở mốc 5 000 ms. Transaction rollback nên DB không hỏng — nhưng file sao lưu ĐÃ
  ghi xong trước đó, nên nhìn vào thư mục backup thì tưởng đã nạp, và lỗi in ra chỉ là một
  đối tượng Prisma có `timeout: 5000`, không câu nào nói phải làm gì. Nay
  `$transaction(..., { timeout: 120_000, maxWait: 20_000 })`. 120 giây là 24× biên so với số
  đo thật (~5 s): hạn này canh TREO, không canh tốc độ, nên đặt sát số đo là tự tạo lỗi ngẫu
  nhiên vào ngày DB chậm hơn thường. `maxWait` là thời gian chờ LẤY kết nối từ pool, chuyện
  khác hẳn.

Sau MỌI lần nạp, vẫn phải chạy `py scripts/pe-v4/sync_curricula.py` — xem bẫy "Hai nguồn
danh sách bài" ở trên.

## Quy ước khi sửa

- Chú thích bằng tiếng Việt, giải thích **vì sao**, thường dẫn ra lỗi đang sửa. Đọc code quanh
  chỗ sắp sửa và viết cùng giọng.
- Test phải chứng minh được là nó bắt lỗi: gỡ bản sửa ra, test phải trượt. Ghi số ca trượt vào
  mô tả commit.
- Mỗi commit một việc, mô tả nói rõ triệu chứng → nguyên nhân → cách sửa.
- Thay đổi làm đổi hành vi người dùng thấy được thì nói thẳng trong mô tả commit.
