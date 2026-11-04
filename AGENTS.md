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
py scripts/pe-da/gen_traces.py         # SINH LẠI traces.json (bảng từng bước) — ~20 phút,
                                       # chỉ chạy khi code bài ĐỔI; cần numpy/pandas/matplotlib
                                       # trên máy, nên KHÔNG chạy được trên CI (xem bẫy dưới)
npm i --no-save pyodide@314.0.7
node scripts/pe-da/check-pyodide.mjs   # chạy code từng bài trong Pyodide, so với `expected`
node scripts/pe-da/check-practice.mjs  # chấm 415 ca BÀI TẬP + đòi 556 biến thể sai trượt
# 516 câu trắc nghiệm: check.py đối chiếu với nguồn (kiem_trac_nghiem), không có bộ riêng
node scripts/check-perf.mjs            # kiểm BỘ ĐO ĐỘ HIỆU QUẢ trong studio-harness.py
node scripts/check-figures.mjs         # kiểm việc XUẤT HÌNH của studio-harness.py
node scripts/check-duong-toi.mjs       # BẢN ĐỒ TÍNH NĂNG: tính năng nào có người đi qua
node scripts/check-duong-toi.mjs --json  # bản máy đọc
node scripts/check-tai-nguyen-chet.mjs  # TỆP/COMPONENT nào KHÔNG ai tới được
node scripts/check-da-nap.mjs           # BÀI nào đã dựng mà CHƯA nạp vào DB
node scripts/check-moc-nen.mjs          # BẢNG MỐC NỀN dưới đây có nói đúng không
node scripts/check-doi-hoi.mjs          # KHỐI CODE màn đọc nào chưa có lời đòi
node scripts/check-nguong.mjs           # NGƯỠNG một chiều có ai nới ngược không
node scripts/check-wheel.mjs            # WHEEL vendored: thừa megabyte chết / thiếu gói bài cần
npx ts-node scripts/pheu-tien-do.ts    # PHỄU tiến độ theo sort_order (CHỈ ĐỌC, cần DATABASE_URL)
node scripts/check-da-deploy.mjs       # bản trên main ĐÃ LÊN production chưa (cần mạng)

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

**Đo lại ngày 04/11/2026 — MỌI hàng, bằng cách tự chạy từng lệnh.** Đừng để tụt xuống
dưới mức này.

Ngày ở đây là thứ DUY NHẤT trong bảng mà `check-moc-nen.mjs` không kiểm được: nó đối
chiếu CON SỐ với cây mã, còn "lệnh này chạy lúc nào" thì không có dấu vết nào trong
cây mã để đối chiếu. Nên nó trôi được, và đã trôi — tiêu đề giữ 28/10 suốt một tuần
trong khi các hàng bên dưới đổi nhiều lần. Đổi một con số thì sửa luôn ngày.

Hai hàng KHÔNG xác minh được bằng cách chạy lệnh, và phải đọc đúng như thế:
"Đã nạp DB chưa" đọc một BIÊN NHẬN (nó nói lần nạp ĐÃ xảy ra, không nói DB hiện giờ
còn giữ đúng bản đó), và "Giáo trình pe-v4" là gói đã ẩn — chạy được nhưng không ai
học nó.

| Hạng mục | Mốc |
|---|---|
| Backend typecheck | sạch — nay phủ **cả `scripts/**/*.ts`** (10 script, 0 lỗi) |
| Backend test | **35 bộ, 501 ca**, tất cả đạt (chạy RIÊNG — xem bẫy tranh CPU) |
| Backend lint | 104 lỗi, 2 cảnh báo — **mốc trần trong CI là 115, chỉ được hạ** |
| Frontend typecheck | sạch |
| Frontend lint | 0 lỗi, **146 cảnh báo** (+7 = `goc-hoc/engine.js`, vào cùng 4d5f86d) |
| Frontend unit test | `cd frontend && npm run test:unit` → **566 ca** / 48 tệp, tất cả đạt |
| Bộ ghi vết | `py -I scripts/tracer/pe_tracer_test.py` → **65 phép kiểm**, trượt 0 |
| Giáo trình pe-v4 (ẩn) | 48 bài, 427 ca chấm, 176 biến thể sai + 48 khung trống đều trượt |
| Giáo trình pe-da (đang chạy) | **179 bài, 11 module**, 565 màn đọc, **537 câu trắc nghiệm**, 669 câu luyện tập, **139 bài tập được chấm / 463 ca**, 2 441 phút; 139 bài chạy trong trình duyệt / 15 hỗn hợp / 25 trên máy |
| pe-da chấm nội dung | `node scripts/pe-da/check-pyodide.mjs` → 154 bài, 420 đoạn code, **0 hỏng**, **0 cảnh báo**, ~32 s; **pha 2: 52/53 đáp án mẫu màn luyện tập chạy đúng, 1 ngoại lệ đã khai, 10 câu bỏ qua (bài chạy trên máy)** |
| pe-da chấm BÀI TẬP | `node scripts/pe-da/check-practice.mjs` → 139 bài, **463 ca đạt**, 752 biến thể sai đều trượt, **pha 3 cổng file dữ liệu 7 bài / 0 lỗi**, **pha 4: 2 288 ca trượt / 0 ca im lặng / 7 nhánh phản hồi**, ~12 s |
| pe-da bảng từng bước | `py scripts/pe-da/gen_traces.py` → **56 vết / 356 khối đủ điều kiện** (300 bỏ qua, phần lớn vì không ra được câu dự đoán nào ĐÁNG hỏi); build.py `return 1` nếu lệch |
| Bộ đo độ hiệu quả | `node scripts/check-perf.mjs` → 9 ca, **0 hỏng** |
| Xuất hình cho người học | `node scripts/check-figures.mjs` → 16 ca, **0 hỏng** |
| Bản đồ tính năng | `node scripts/check-duong-toi.mjs` → **17 mục, 14 có đường tới, 3 còn tối (đã khai lý do)**, 0 lỗi |
| Tài nguyên chết | `node scripts/check-tai-nguyen-chet.mjs` → **1 mục chết, 1 khai giữ, 0 chưa khai**, 0 lỗi; quét JS/CSS tĩnh + component + **14 CSS module trong `src/`** |
| Đã nạp DB chưa | `node scripts/check-da-nap.mjs` → **179/179 bài khớp bản dựng**, 0 lỗi (biên nhận 04/11/2026) |
| Lời đòi ở màn đọc | `node scripts/check-doi-hoi.mjs` → **392/508 khối (77,2%) có một lời đòi**, 116 im lặng đều đã khai lý do, 0 lỗi |
| Ngưỡng một chiều | `node scripts/check-nguong.mjs` → **18 ngưỡng**, 0 nới ngược chiều, 0 lỗi |
| Đã deploy chưa | `node scripts/check-da-deploy.mjs` → cảnh báo nếu production lệch `tester/main`; đỏ khi gọi kèm `--doi-hoi-moi-nhat` |
| Wheel vendored | `node scripts/check-wheel.mjs` → **16 wheel · 5 gói bài khai · 16 sau đóng bao phụ thuộc**, 0 lỗi |
| Bảng mốc nền | `node scripts/check-moc-nen.mjs` → **17 mục đối chiếu được**, 0 lỗi; 2 nhóm khai NGOÀI TẦM |
| Runtime | Pyodide **314.0.7** (Python 3.14.2 · numpy 2.4.6 · pandas 3.0.2 · matplotlib 3.10.8), 30 MB |

**pe-v4 còn trong repo nhưng không còn xuất bản.** Khoá `python_advanced` nay là bộ 179
bài. `scripts/pe-v4/**`, 427 ca chấm và job CI của nó được GIỮ NGUYÊN, vì bộ chấm
input/output đó là thứ cố vấn dự án gọi là tính năng lõi — xoá đi là mất đường quay đầu
và mất bộ kiểm duy nhất chấm được code học viên. `frontend/public/static/js/studio-harness.py`
thì bộ 172 bài dùng lại NGUYÊN VẸN: chính nó đặt `MPLBACKEND=Agg` và móc `Figure`, nên
26 bài biểu đồ chạy được trong worker. Đừng dọn "cho gọn".

**Con số 507 phải đo lại mỗi lần thêm/bớt ca, không được đoán.** Phân rã hiện tại:
catalog-duration 2 · catalog-naming 3 · consent-banner 15 · course-resume 9 ·
data-files 18 · editor-load-gate 14 · feedback-link 9 · forum-xss 1 ·
ide-brief-code 12 · ide-handoff 6 · ide-partial-output 10 · ide-stop-autosave 27 ·
ide-trace 38 · inline-code 3 · insert-gate-sync 2 · label-version 2 ·
learning-events 48 · lesson-back 12 · lesson-load 7 · mcq-code 9 ·
mcq-next-after-wrong 23 · phan-bai 8 · practice-contract 15 · practice-run 9 · prewarm-gate 5 ·
read-diagram 12 ·
read-guess 19 · read-trace 15 · recap-recall 7 · read-try-it 20 · review-quiz 34 · run-stale 15 ·
session-marker 5 · spaced-review 14 · studio-lesson 44 · tracer-limits 7 · tracer-web-sync 5 · trap-leak 3 ·
worker-csp 7 · ds-contrast 13 · feedback-rank 3 · goc-hoc-khung-cho 6 · goc-hoc-lo-trinh 9 · goc-hoc-man-con 3 · o-nhap-nhieu-dong 2 · ide-output-scroll 6 · lien-ket-noi-bo 3 · goc-hoc-cho-so 7 = 566.
Mốc trước là 559; thêm goc-hoc-cho-so 7 (SỐ VỀ MUỘN BỊ VỨT: /api/enrolled 3 087 ms > trần 3 000 ⇒ trang chủ nói "chưa có phiên học" cả phiên với người đã xong 2 bài).
Trước đó 556 → 559; thêm lien-ket-noi-bo 3 (LIÊN KẾT TỚI TRANG KHÔNG CÓ: "Ôn tập" ở thanh trên và nút trong cảnh Góc học cùng dẫn tới `/practice` → 404).
Trước đó 550 → 556; thêm ide-output-scroll 6 (/ide TRÊN ĐIỆN THOẠI: bấm Chạy xong ô kết quả vẫn dưới mép màn — 0px thấy ở 390×844 có băng khôi phục, 6px ở 375×667).
Trước đó 548 → 550; thêm o-nhap-nhieu-dong 2 (Ô NHẬP NHIỀU DÒNG: `width: 100%` + padding trên content-box — ô soạn mã bài tập bị cắt 32px, ô luyện tập thò 30px).
Trước đó 545 → 548; lesson-back 9 → 12 (ĐOẠN THANH TIẾN ĐỘ: vùng bấm thật 13×7px vì `overflow: hidden` cắt `::after` nới vùng chạm).
Trước đó 542 → 545; thêm goc-hoc-man-con 3 (LƯỚI `1fr` TRẦN cắt nội dung màn Học tiếp trên điện thoại).
Trước đó 538 → 542; goc-hoc-lo-trinh 5 → 9 (BẢNG DỌC cho điện thoại: khung ngang co còn 0,30, nhãn 5px).
Trước đó 533 → 538; thêm goc-hoc-lo-trinh 5 (BẢNG LỘ TRÌNH: mỗi học phần thật một điểm — từng có 8 điểm cho 11
học phần nên M9–M11 biến mất; nhãn ngắn ≤ 3 dòng, hai tầng xen kẽ, ở trên tờ ghi chú). Trước đó 527 → 533; thêm goc-hoc-khung-cho 6 (KHUNG GIỮ CHỖ trang chủ: vị trí ảnh là bản CHÉP layout()
sang CSS — ca đọc hằng thật từ engine.js và tính lại từng hệ số). Trước đó 525 → 527; lesson-back 7 → 9 (KHÔNG NHẢY BỐ CỤC khi nội dung bài về: ô trái giữ chỗ
cho nút Quay lại ở mọi khổ màn, rãnh thanh cuộn chỉ ở trang bài học). Trước đó 524 → 525; bê giao diện từ nhánh `test` (4d5f86d) làm đỏ 6 ca — sửa: ds-contrast 14 → 13
(gỡ ca chip: hai chip nó canh chỉ sống trong `home.module.css`, file đã xoá), course-resume
8 → 9 (hàng bài phải mang id mà effect cuộn tìm), review-quiz 33 → 34 (trang công khai chỉ
gọi API sau `hasStoredSession`). Trước đó 523 → 524; ds-contrast 13 → 14 (TRANG CHỦ bỏ token brand xanh–đỏ).
Trước đó 522 → 523; ds-contrast 12 → 13 (CHIP TRANG CHỦ: nền alpha làm chữ chìm).
Trước đó 520 → 522; ds-contrast 10 → 12 (NỀN TRANG bỏ mesh xanh–đỏ + quầng bám chuột).
Trước đó 518 → 520; ds-contrast 8 → 10 (VIỀN THẺ TRANG CÔNG KHAI + BÓNG MẶT NỔI).
Trước đó 515 → 518; thêm feedback-rank 3 (THỨ BẬC CỦA PHẢN HỒI).
Trước đó 514 → 515; ds-contrast 7 → 8 (HAI THANH STICKY phải có cạnh).
Trước đó 511 → 514; ds-contrast 4 → 7 (VIỀN THẺ: lớp lỗi "shorthand chỉ có màu",
cộng hai chiều của đường kẻ ngày/đêm).
Trước đó 510 → 511; ds-contrast 3 → 4 (BÓNG THẺ phải ấm và bám sát).
Trước đó 507 → 510; thêm ds-contrast 3 (TƯƠNG PHẢN KHỐI CODE — tính từ chính file CSS).
Trước đó 504 → 507; read-guess 16 → 19 (CỔNG DỰ ĐOÁN HÌNH cho 71 màn có biểu đồ).
Trước đó 490 → 504; thêm spaced-review 14 (ÔN GIÃN CÁCH — hỏi lại câu đã sai).
Trước đó 481 → 490; thêm practice-run 9 (Ô CHẠY THỬ ở màn luyện tập).
Trước đó 474 → 481; thêm recap-recall 7 (CỔNG HỒI TƯỞNG ở màn tổng kết).
Trước đó 466 → 474; thêm phan-bai 8 (BA PHẦN: lý thuyết / thực hành / bài tập).
Trước đó 463 → 466; thêm studio-lesson 41 → 44 (Ô VÍ DỤ ĐẦU VÀO/ĐẦU RA).
Trước đó 435 → 463; thêm read-guess 16 (CỔNG DỰ ĐOÁN ở màn đọc — 262 khối code in sẵn
kết quả nay đòi gõ dự đoán trước khi mở) và review-quiz 21 → 33 (tải lại trang giữa đề
không còn mất đề — `GET quizzes/:id` nay có người gọi, xem bẫy cuối file).
Trước đó 434 → 435 là practice-contract 14 → 15 (CỔNG LUYỆN TẬP).
Trước đó 413 → 434 là review-quiz 21 — đề ôn tập chấm ở MÁY CHỦ nay có đường tới
người học (xem bẫy cuối file).
Trước đó 393 → 413 là data-files 18 (CƠ CHẾ NẠP FILE DỮ LIỆU — xem bẫy dưới) và
insert-gate-sync 2 (cổng INSERT của backend phải biết đúng mọi nguồn màn mà
`buildScreens` dựng — xem bẫy "Luật 6 của cổng INSERT" dưới).
Trước đó 378 → 393 là read-trace 15 (BẢNG TỪNG BƯỚC của màn đọc — xem bẫy cuối file).
Trước đó 351 → 378 là run-stale 15 ("kết quả này của bản code trước") và
read-diagram 12 (sơ đồ bằng DOM) — xem hai bẫy cuối file.
Trước đó 328 → 351 là mcq-next-after-wrong 23.
Trước đó 310 → 328 là lesson-back 7, course-resume 8 và inline-code 3 — cả ba đến từ
đợt phản hồi của người thử ngày 27/10 (xem bẫy "Năm người thử cùng báo thiếu nút quay
lại" ở dưới).
Trước đó 295 → 310 là consent-banner 15.
Trước đó 231 → 295 là learning-events 48, mcq-code 9 và tracer-limits 7.
Trước đó 211 → 231 là read-try-it 20 (nút "Try it Yourself" ở màn đọc — xem bẫy dưới),
và 196 → 211 là practice-contract 14 và studio-lesson 40 → 41.

**Đếm phân rã bằng `sed`, đừng bằng `grep -E "^. pass"`** — dòng tổng kết của
`node --test` mở đầu bằng `ℹ` (multibyte), nên `^.` không khớp và vòng lặp trả về RỖNG
cho mọi file mà không báo lỗi. Cùng họ bẫy CRLF ghi ở `label-version` dưới đây:

```bash
cd frontend && for f in e2e/unit/*.test.mjs; do
  node --test --experimental-strip-types "$f" 2>&1 \
    | sed -n 's/.*[[:space:]]pass \([0-9]\+\)[[:space:]]*$/\1/p' | tail -1
done
```

Dòng này từng ghi **204** trong khi cây mã chỉ có 134 — một con số cũ trong bảng không phải
chú thích lỗi thời vô hại, nó là 70 ca test tưởng có mà không có. Thêm/bớt ca ⇒ chạy lệnh,
lấy số thật, sửa bảng TRONG CÙNG commit.

Backend chạy riêng mới ra số đúng: chạy `npx jest --ci` song song với bộ test frontend thì
15/15 bộ báo trượt với 0 ca chạy — tranh CPU, không phải lỗi thật (xem bẫy "Test
`python-runner` trượt khi chạy CẢ BỘ" ở dưới).

**Và có một cách thứ HAI để ra số sai, khác hẳn tranh CPU: FIXTURE DÙNG CHUNG.** Ba bộ
backend đọc thẳng `scripts/pe-da/out/lessons.json` — `lesson-insert.spec.ts`,
`lesson-content-update.spec.ts`, `quizzes.service.spec.ts` — và frontend thì
`studio-lesson.test.mjs`. Chạy test trong lúc có ai đó `build.py` là đọc một file đang bị
ghi dở: đo được **10/470 ca đỏ** ngày 30/10/2026, cả 10 ở đúng ba bộ đó, và chạy lại sau khi
build xong thì xanh hết. Đọc gói THẬT là CỐ Ý (fixture bịa làm test nói dối — xem bẫy
`quizzes.service.spec.ts` ở dưới), nên cái giá là: **dựng xong rồi mới đo**, đừng đo song song.

Số lỗi lint backend phải đo bằng ĐÚNG lệnh CI dùng, KHÔNG bằng `npm run lint` (script đó mang
`--fix` nên vừa sửa file vừa làm con số lệch). Đo khác lệnh là lý do mốc này từng bị ghi 551
trong khi thực tế là 557:

```bash
npx eslint "{src,apps,libs,test}/**/*.ts" --ignore-pattern "src/generated/**"
```

## Vòng lặp tự kiểm

**Hàng đợi việc nằm ở Kanzo** (`http://localhost:4242`, project `pe-usth`), không ở
file markdown — xem mục đầu của LOOP.md để biết nếp dùng và vì sao đổi.

Agent chạy việc trong repo này đi theo [LOOP.md](LOOP.md): bậc thang lệnh nói đúng/sai mà
không cần người đọc, ba luật dừng, và bốn cách một vòng lặp nói dối (nới phép kiểm cho
xanh · đo song song lúc đang build · xanh vì không ai đi qua · test không có răng). Mục
tiêu là chạy tới xanh rồi mới bàn giao, không hỏi giữa chừng.

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

- **508 khối code màn đọc chia vào nhóm nào — nay KHAI RA, và bộ bắt-tất từng làm
  cổng RỖNG.** `read-guess.test.mjs` đã ghim trần 2/40, sàn phủ, phép loại vẽ hình
  và luật không lộ đáp án. Thứ nó KHÔNG nói: 508 khối chia hết vào NHỮNG NHÓM NÀO —
  nên một hình dạng thứ bảy (gói nguồn đổi, build phát thêm trường) rơi vào khoảng
  trống đó và im lặng. `node scripts/check-doi-hoi.mjs` (có trong CI) chia hết 508
  khối: **392 có một lời đòi (77,2%)** — 262 cổng dự đoán output · 56 bảng từng bước ·
  74 cổng dự đoán HÌNH — và **116 im lặng, mỗi nhóm kèm lý do**.
  **Con số 74/7 là một phép so chéo tự xác nhận:** 81 khối gọi thư viện vẽ hình, 74
  có khối `figure` trên cùng màn (nên `doanDuocHinh` dựng cổng) và 7 thì không —
  khớp đúng ghi chép độc lập "7 khối dựng Figure mà bài không xuất ảnh" ở mục cổng
  dự đoán. Báo cáo xếp hạng ghi 399 vì đếm cả 81; **392 mới đúng**.
  **CỔNG NÀY RỖNG BA LẦN TRƯỚC KHI CÓ RĂNG, và cả ba chỉ lộ ra nhờ ablate:**
  · nhóm cuối viết `hop: () => true` (bắt-tất) ⇒ gỡ nhóm `qua-dong` ra thì 54 khối
    lẽ ra RƠI RA ngoài lại bị nuốt và dán nhãn "CÓ cổng" — cổng **tự khai khống độ
    phủ**, và luật "rơi ra ngoài là LỖI" không bao giờ chạy tới. Đo: **0 đỏ**;
  · sửa thành điều kiện dương nhưng THIẾU nhánh "lộ đáp án" ⇒ gỡ `lo-dap-an` vẫn
    **0 đỏ**; thiếu tiếp `!trace` và hai nhánh vẽ hình ⇒ gỡ ba nhóm đó đều 0 đỏ.
    Nhóm "có cổng" phải là PHẦN BÙ CHÍNH XÁC của `doanDuocOutput`, đủ cả sáu nhánh;
  · và phân nhóm MỘT MÌNH vẫn không bắt được khối TRÔI từ nhóm có-lời-đòi sang nhóm
    im lặng: gỡ `ve-hinh-co-figure` thì 74 khối rơi sang nhóm vẽ-hình kia, độ phủ
    tụt **392 → 318** mà mọi khối vẫn "thuộc một nhóm đã khai" ⇒ 0 đỏ. Phải thêm
    `SAN_CO_DOI` (380, CHỈ ĐƯỢC NÂNG). Ablate lại: 8/8 chiều đều đỏ.
  **PHÁT HIỆN CHƯA LÀM, và nó là quyết định của CHỦ DỰ ÁN chứ không của vòng lặp:**
  trần DÒNG là một PROXY, và nó mis-fire. `khopDapAn` bỏ HẾT khoảng trắng, nên thứ
  người học thật sự gõ là chuỗi gõ liền. Đo trên bản dựng: khối ĐANG có cổng dài
  **trung vị 9 ký tự, max 34**; 41 khối bị trần dòng từ chối dài **trung vị 20, max
  40** — TẤT CẢ nằm trong trần 40 ký tự hiện hành, và ngắn nhất là `"1\n2\n3"` tức
  **3 ký tự**. Bỏ trần dòng mà giữ nguyên trần ký tự → **303 khối / 133 bài** thay vì
  262/127. Lý lẽ viết trong `studio-lesson.ts` ("từ 3 dòng trở lên thì chép lại cả
  một đoạn") nói về SỐ KÝ TỰ PHẢI GÕ, mà trần dòng không đo thứ đó. KHÔNG tự đổi:
  file này ghi trần "chỉ được HẠ", và +41 cổng là thêm ma sát cho người học —
  Hundhausen đo được một cổng không đáng bấm là đúng điều kiện KHÔNG có tác dụng.

- **PHỄU TIẾN ĐỘ: `lesson_progress` KHÔNG phải mẫu số, và `scripts/` chưa bao giờ
  được typecheck.** Mục 2 của báo cáo xếp hạng đặc tả *"`lesson_progress` tra theo
  (course_id, sort_order) là đủ"*. **Đo trước khi dựng thì nó KHÔNG đủ:**
  · `lesson_progress` chỉ được ghi trong `completeLesson`
    (`src/lessons/lessons.service.ts`) ⇒ nó đo HOÀN THÀNH, không đo MỞ. Người mở
    bài 1 rồi bỏ KHÔNG để lại hàng nào;
  · nhưng mở bài là TỰ GHI DANH (`useLessonData.ts`) ⇒ `enrollments` mới là dấu
    "đã đến".
  Lấy `lesson_progress` làm mẫu số thì **ô 1 luôn = 100% THEO CẤU TẠO**, tức giấu
  đúng ô rơi lớn nhất. Ablate: đổi mẫu số về `lesson_progress` → **3 ca đỏ**.
  **ĐƠN VỊ LÀ "TÀI KHOẢN KHÁCH", và cổng từ chối mọi tên khác.** Refresh token khách
  sống 30 ngày, hết hạn là cấp tài khoản MỚI ⇒ một người quay lại đếm thành HAI tài
  khoản, nên mọi tỉ lệ "còn lại" là GIỚI HẠN DƯỚI. `kiemTenChiSo` cấm "người dùng" /
  "user" / "học viên" trong tên chỉ số và đòi chữ "tài khoản".
  **LUẬT BẮT ĐÚNG TÁC GIẢ CỦA NÓ:** một trong bốn chỉ số tôi khai trước là *"tỉ lệ còn
  lại ở bài thứ N so với số đã ghi danh"* — không có chữ "tài khoản" ⇒ **9/14 ca đỏ**
  ngay lần chạy đầu. Sửa TÊN, không nới luật.
  **CA TEST CỦA CHÍNH LUẬT ẤY TỪNG KHÔNG CÓ RĂNG:** nó assert
  `expect(loi).toContain("người dùng")`, mà thông điệp "không nói ra đơn vị" NHẮC LẠI
  chính tên bị kiểm — nên phép so đạt vì LẶP LẠI ĐẦU VÀO. Ablate làm rỗng danh sách từ
  cấm → **0 đỏ**. Nay so với câu nói ra LÝ DO, và tên mẫu đều CÓ chữ "tài khoản" để
  nhánh "thiếu đơn vị" không che mất nhánh "từ cấm" → **4 đỏ**.
  **GIỚI HẠN in CÙNG bảng, không để ở file khác** — một bảng số đi một mình sẽ bị
  trích một mình. Năm câu, và một ca test đòi chúng có mặt (ablate bỏ một câu → 1 đỏ).
  Ablate 7 chiều: mẫu số sai → 3 · đếm HÀNG thay vì TÀI KHOẢN → 1 · in % cho ô đã che
  → 1 · bỏ ngưỡng che → 2 · bỏ lọc khách → 1 · bỏ một câu giới hạn → 1 · nới từ cấm → 4.
  **VÀ ĐÂY LÀ PHÁT HIỆN KÈM, lớn hơn chính việc đang làm:** `tsconfig.json` chỉ
  `include` `src/**/*` và `test/**/*` — **10 script TypeScript chưa bao giờ đi qua
  `npm run typecheck`**, GỒM CẢ `update-lesson-content.ts`, thứ chính file này gọi là
  "đường nạp AN TOÀN" vào DB production. Đo trước khi thêm: **0 lỗi**, nên việc này
  miễn phí. Ablate: gieo một lỗi kiểu vào `update-lesson-content.ts` → typecheck **1
  lỗi**; trước bản này nó im lặng xanh.
  **Và nó bắt được ngay một lỗi chí tử trong script tôi vừa viết:** Prisma 7 ĐÒI một
  driver adapter — `new PrismaClient()` trần ném `PrismaClientInitializationError`
  ở dòng đầu, tức script **không chạy được lần nào**. Dùng cùng `PrismaNeon` với
  `update-lesson-content.ts`, đừng nghĩ ra cách thứ hai.
  **GIỚI HẠN PHẢI NÓI RA:** đường DB **chưa chạy với dữ liệu thật** — không có
  `DATABASE_URL` trong vòng lặp. Thứ ĐÃ được chứng minh là phép tính (16 ca Jest) và
  hình dạng truy vấn Prisma (tsc, nhờ chính thay đổi tsconfig này). Thứ CHƯA: hành vi
  trên hàng thật. Chủ dự án chạy `npx ts-node scripts/pheu-tien-do.ts` là biết.

- **16 NGƯỠNG MỘT CHIỀU chỉ được khai bằng VĂN XUÔI — nay có cổng canh chiều.**
  Repo có 16 con số đã quyết "chỉ được hạ" (trần) hoặc "chỉ được nâng" (sàn), rải
  khắp **7 file**: trần lint CI 115 · `TRAN_ALT_KHUON` 21 · `TRAN_LECH_DO_DAI` 21 ·
  `DOAN_OUTPUT_MAX_DONG/KY_TU` 2/40 · `SAN_CO_DOI` 380 · hai sàn của
  `read-guess` (200/110) · sàn màu của `feedback-rank` (8) ·
  `ADVANCED_LESSON_MIN` 172 · sáu sàn tương phản của `ds-contrast`. Mỗi cái
  khai bằng MỘT CÂU trong chú thích bên cạnh, và **không gì canh chiều** — một vòng
  lặp muốn xanh chỉ cần hạ con số rồi sửa câu chú thích: hai dòng, không bộ kiểm nào đỏ.
  Đây không phải lo xa: LOOP.md đã đặt tên nó là cách THỨ NHẤT một vòng lặp nói dối
  ("nới phép kiểm cho xanh"), và ImpossibleBench đo được các mô hình Claude **>79% số
  lần là SỬA TEST** khi nhiệm vụ không làm được.
  Nay `node scripts/check-nguong.mjs` (có trong CI) đọc sổ `scripts/nguong-mot-chieu.json`
  và so từng con số với cây mã.
  **SIẾT ĐÚNG CHIỀU THÌ KHÔNG ĐỎ**, chỉ in một dòng `GHI SỔ` nhắc chạy `--ghi-so`.
  Bắt nó đỏ là dạy người ta THÔI SIẾT — mà siết là việc tốt. Và `--ghi-so` từ chối
  chạy khi đang có lỗi, nếu không nó thành cái nút TẮT cổng.
  **GIỚI HẠN PHẢI NÓI RA:** sổ được COMMIT, nên ai cố tình nới vẫn sửa được cả hai.
  Cổng làm việc nới trở nên TO TIẾNG (một dòng diff trong sổ, kèm câu hỏi "vì sao"),
  KHÔNG làm nó bất khả — cùng mức trung thực với `check-da-nap` ("chống QUÊN NẠP,
  không chống DB trôi").
  **`--ghi-so` TỪNG LÀM BẨN CHÍNH CÁI SỔ NÓ CANH — và tôi giao nó mà chưa chạy lần
  nào.** Lần chạy ĐẦU TIÊN của cờ này (một vòng SAU khi commit): nó in "0 ngưỡng cập
  nhật" rồi vẫn **sửa 4 dòng**, vì `JSON.stringify` chuẩn hoá `12.0` thành `12`.
  Vô hại về SỐ, có hại về TÍN HIỆU: cả giá trị của sổ nằm ở chỗ "một dòng diff ở đây
  là một câu hỏi to tiếng", nên một lần ghi vô ích làm hỏng đúng thứ đó. Nay `doi === 0`
  thì in "Sổ đã đúng — không ghi gì" và KHÔNG chạm file.
  Ba nhánh của cờ nay đều đã chạy thật: không có gì đổi → file SẠCH · siết thật một
  ngưỡng (5 → 8) → ghi đúng 1 mục rồi xanh lại · ĐANG CÓ LỖI → từ chối ghi, **exit 1**,
  sổ không bị chạm (nếu không thì `--ghi-so` là cái nút TẮT cổng).
  **Bài học rộng hơn:** một CỜ chưa ai chạy cũng là "dựng xong mà không có đường tới",
  chỉ khác là đường đó dành cho người bảo trì chứ không cho người học. Giao một cờ thì
  phải chạy cả ba nhánh của nó TRONG CÙNG vòng.

  **MỘT REGEX MƠ HỒ LÀ MỘT CỔNG HỎNG, và nó hỏng theo CẢ HAI chiều.** Lần chạy đầu,
  `san-mau-chu-giai-thich` dùng `ts >= (\d+)` và khớp trúng dòng AA `ts >= 4.5`
  đứng TRƯỚC — bắt được 4, **báo oan một ngưỡng đang đúng**. Cùng lỗi ấy mà khớp nhầm
  một con số KHÔNG BAO GIỜ đổi thì cổng XANH vĩnh viễn trong khi ngưỡng thật đã bị nới.
  Nên cổng nay đòi mỗi regex khớp **ĐÚNG MỘT LẦN** trong tệp của nó; "nhiều chỗ khớp"
  là LỖI, không phải lấy chỗ đầu tiên.
  Ablate 7 chiều: nới trần lint CI 115 → 150 → **1 lỗi** · hạ `SAN_CO_DOI` 380 → 300
  → 1 · nới trần dự đoán 2 → 3 dòng → 1 · hạ sàn tương phản chú thích 5,5 → 4,6 → 1 ·
  đổi TÊN hằng (regex hết khớp) → 1 · trả regex về bản lỏng → 1 (REGEX MƠ HỒ).
  Chiều NGƯỢC: siết trần lint 115 → 104 → **0 đỏ**, kèm dòng `GHI SỔ`.
  **Và phép đo bắt được một trích dẫn cũ:** `scripts/pe-da/VAN-PHONG.md` trích
  AGENTS.md là *"mốc trần trong CI là 245"* trong khi trần thật là **115** — đã hạ qua
  bốn đợt dọn `any`. `check-moc-nen` chỉ đọc AGENTS.md nên nó mù với chỗ này; đã sửa
  bằng tay, và đó là một nhắc nhở rằng con số CÒN SỐNG Ở NHIỀU FILE hơn bảng mốc nền.

- **`check-figures.mjs` KHÔNG in số ca — nên "16 ca" trong bảng không gì sinh ra được.**
  `check-perf.mjs` cạnh nó in `9 ca · 0 hỏng` từ đầu; `check-figures.mjs` chỉ in
  một câu văn xuôi ("mọi ca đạt"). Con số 16 ĐÚNG — đếm tay ra đúng 16 lời gọi
  `dat(` — nhưng nó chỉ xác nhận được bằng cách đọc mã nguồn, và `check-moc-nen`
  không có gì để đối chiếu. Một con số trong bảng mà không công cụ nào phát ra là
  một con số sẽ trôi. Nay `dat()` tự đếm và in `N ca · M hỏng`, và
  `check-moc-nen` canh CẢ HAI hàng (15 → 17 mục).
  **GIỚI HẠN, phải nói ra:** cổng đối chiếu con số với MÃ NGUỒN (đếm lời gọi
  `dat(`), không đối chiếu với thứ công cụ IN RA. Ablate: đổi "16 ca" trong bảng
  → **1 lỗi** · thêm một ca thật mà không sửa bảng → **1 lỗi** · nhưng gỡ phép đếm
  `soCa` đi (công cụ thôi in số) → **0 lỗi**. Phần được canh là CON SỐ, phần in ra
  là tiện cho người đọc.

- **LỖI THỐNG TRỊ Ở LỚP NGOÀI CÙNG: push xong, CI xanh, và KHÔNG LÊN production.**
  Sự cố 04/11/2026 — chủ dự án nhìn ra bằng mắt, không bộ kiểm nào báo: production
  chạy bản dựng từ **03/11** (`9567490`), **sau lưng `main` 15 commit**. Bốn bề mặt lofi
  và bản sửa thứ bậc phản hồi nằm im trên `main`. (Con số này TỪNG bị tôi ghi sai thành
  "29/10, 66 commit" — xem đoạn đính chính ở cuối mục.) Repo đã có cổng cho hai lớp trong
  (`check-duong-toi`: có màn nào MOUNT không · `check-da-nap`: bài vào DB chưa) và
  KHÔNG có gì cho lớp ngoài cùng.
  **`ASSET_VERSION` KHÔNG dùng làm dấu được — đã đo.** Luật bump chỉ áp cho `public/`:
  trên đúng khoảng lệch ấy có 67 commit, **28 chạm `frontend/src/`**, mà `ASSET_VERSION`
  đổi **2 lần**. Lấy nó làm cổng là cho XANH GIẢ khi production thiếu hàng chục commit
  chỉ-src. Build id của Next cũng không xài được: HTML production không phơi ra
  (app router không nhúng `__NEXT_DATA__`, URL chunk chỉ là `/_next/static/chunks/`).
  Nên dấu là COMMIT SHA ở `<meta name="pe-build">` (layout gốc, đọc
  `VERCEL_GIT_COMMIT_SHA` — Vercel đặt sẵn, không phải biến ta khai).
  **CẢNH BÁO, KHÔNG ĐỎ:** deploy là việc của chủ dự án, và một commit vừa push thì
  ĐÚNG RA là chưa live — bắt đỏ ở đây là dạy người ta quen với màu đỏ. Chỉ
  `--doi-hoi-moi-nhat` mới đỏ, tức khi người chạy nói "tôi vừa deploy xong".
  **HAI LỖI CỦA CHÍNH CỔNG NÀY, cả hai chỉ lộ khi CHẠY THẬT:**
  · `process.exit()` đua với pool keep-alive của `fetch` ⇒ Node trên Windows ném
    `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` rồi thoát **127** — một mã
    thoát không nói gì về kết quả kiểm, tức cổng vô dụng đúng ở chỗ CI đọc nó. Dùng
    `process.exitCode`;
  · thiếu header `connection: close` ⇒ undici giữ socket trong pool và tiến trình
    không thoát ngay; gọi cổng từ một script khác bằng `execFileSync` thì nó **TREO**.
    Một cổng treo là một cổng sẽ bị gỡ khỏi CI.
  Ablate bằng máy chủ giả, 3 chiều: SHA trùng `tester/main` → nói "ĐANG chạy đúng" ·
  SHA lùi 5 commit → đếm **đúng 5** · không có thẻ meta → nói thẳng "bản dựng CŨ HƠN
  commit thêm thẻ này", không im lặng.
  **GIỚI HẠN:** cổng so SHA trên dây với một NHÁNH; nó không chứng minh bản dựng đó
  khớp cây mã (ai build tay từ chỗ khác thì nó mù), và nó cần MẠNG.
  **SỬA LẠI MỘT CON SỐ TÔI ĐÃ KHẲNG ĐỊNH SAI — và cách tôi sai là bài học chính.**
  Tôi viết "production chạy build **29/10**, sau lưng `main` **66 commit**" như một số ĐO.
  Nó là một SUY LUẬN từ `ASSET_VERSION=2026-10-29a`: tôi lấy commit đã ĐƯA VÀO chuỗi đó
  (`f447d1e`) rồi gọi nó là bản đang chạy. Mà chính đoạn trên vừa chứng minh
  `ASSET_VERSION` là tín hiệu YẾU — nó chỉ đổi khi `public/` đổi, nên nó chỉ nói
  "production MỚI BẰNG HOẶC MỚI HƠN `f447d1e`", không nói nó ở đâu.
  **Số đúng, lấy từ dashboard Vercel: `9567490`, 03/11/2026 04:53, sau lưng 15 commit.**
  `ASSET_VERSION` của `9567490` ĐÚNG LÀ `2026-10-29a` (lần bump kế tiếp ở `bf44293`), nên
  phép đo không sai — chỉ có cách tôi đọc nó mới sai.
  **PHÉP THỬ ĐỘC LẬP, rẻ và dùng lại được, không cần dashboard:** chọn một tệp mà một
  commit đã XOÁ và một tệp cùng commit đó cố ý GIỮ, rồi gọi HEAD cả hai. Đo được:
  `/static/js/login.inline.js` → **404** (xoá ở `9567490`), `/static/js/dashboard.js` →
  **200** (giữ ở chính commit đó). Hai chiều cùng khớp ⇒ production ở `9567490` trở lên.
  Một dấu NỘI DUNG như vậy mạnh hơn bất kỳ chuỗi phiên bản nào, vì không ai phải nhớ bump nó.
  **VÌ SAO NÓ DỪNG — bằng chứng loại trừ, không phải phỏng đoán:**
  · **16/16 commit ngày 03/11 đều deploy**, `9567490` là cái cuối; **15/15 commit ngày
    04/11 KHÔNG cái nào** được tạo. Ranh giới là NGÀY, không phải một commit hỏng;
  · danh sách deployment **không có mục Error nào** sau `9567490` ⇒ Vercel chưa từng TẠO
    chúng ⇒ **không phải lỗi build** (và `npm run build` ở máy vẫn sạch);
  · `9567490` LÀ tổ tiên của `tester/main`, không nhánh nào đứng ở đó ⇒ nối ĐÚNG repo/nhánh;
  · cả 15 commit chưa deploy cùng tác giả `sonkh <sonthaiha07@gmail.com>` với commit ĐÃ
    deploy ⇒ không phải bộ lọc Author trong giao diện che đi.
  **NGUYÊN NHÂN THẬT, chủ dự án nói ra: repo ĐÃ CHUYỂN sang một GitHub org mới.**
  `PCBoiz/pe-usth` nay trả **HTTP 301** về `ProgrammingEdu-USTH/pe-usth`. Git push vẫn
  chạy qua redirect nên không ai thấy gì lạ, nhưng GitHub App của Vercel cài theo TỪNG
  ORG — org mới chưa có nó, nên **webhook không tới Vercel và không deployment nào được
  TẠO**. Khớp mọi mảnh bằng chứng: đúng nhánh, đúng tác giả, không có bản Error nào, và
  ranh giới là một NGÀY chứ không phải một commit hỏng.
  **VÀ BẰNG CHỨNG ĐÃ IN RA NGAY LẦN PUSH ĐẦU TIÊN của phiên — tôi nhìn mà không đọc:**

      remote:   https://github.com/ProgrammingEdu-USTH/pe-usth.git
      To https://github.com/PCBoiz/pe-usth.git
         6fb8264..828d33b  main -> main

  GitHub in dòng `remote:` đó để báo repo đã dời. Tôi đọc nó như tiếng ồn của lệnh push,
  rồi hai vòng sau đi dựng cả một cổng để trả lời câu hỏi mà dòng ấy đã trả lời.
  **Luật rút ra: đầu ra của `git push` là một PHÉP ĐO, không phải tiếng ồn.** Dòng
  `remote:` chỉ xuất hiện khi máy chủ có điều muốn nói.
  Việc còn lại là của chủ dự án: trỏ Vercel sang org mới (và `git remote set-url tester https://github.com/ProgrammingEdu-USTH/pe-usth.git` ở máy).

- **"153 bài chưa nạp DB" là một câu tôi LẶP LẠI trong khi cổng của chính mình đã trả
  lời ngược.** Suốt nhiều vòng tôi bàn giao câu *"còn 153 bài đã dựng xong chưa nạp"*.
  Nhưng `node scripts/check-da-nap.mjs` — mà tôi chạy gần như MỖI vòng — in nguyên văn:
  *"Biên nhận nạp lúc 2026-11-03T18:48 · gói 179 bài / 0 lỗi — mọi bài trong gói đều đã
  nạp đúng bản đang dựng."* Chủ dự án chạy `update-lesson-content.ts --all` và bản chạy
  khô xác nhận: **0/179 bài sẽ đổi `content_json`**.
  Tôi đã đọc dòng "0 lỗi" như "cổng này PASS" chứ không như "đây là CÂU TRẢ LỜI cho
  việc tôi đang bàn giao". Một cổng chỉ hữu ích bằng mức người ta đọc thứ nó NÓI, không
  phải thứ nó TÔ MÀU. **Trước khi bàn giao một việc cho người khác, chạy đúng cái cổng
  canh việc đó và đọc CÂU, không đọc màu.**

- **"Pyodide 314 không có wheel" — SAI với 10/21 gói, và một phép ĐO đã tự thả 3,5 MB
  vào repo.** Hằng `THIEU_WHEEL` trong `build.py` tự ghi đúng ("không có wheel TRONG
  REPO"), nhưng AGENTS.md diễn lại thành "Pyodide 314 không có". Đo trên chính
  `pyodide-lock.json` trong repo (357 gói): **10 gói CÓ** — scipy 1.18.0 · sklearn 1.8.0 ·
  statsmodels 0.14.6 · requests 2.33.1 · bs4 4.14.3 · xlrd 2.0.2 · pyarrow 22.0.0 ·
  IPython 9.12.0 · sqlalchemy 2.0.48 · h5py 3.13.0 — và **11 không có thật** (seaborn,
  plotly, openpyxl, dash, ipywidgets, notebook, jupyter, sas7bdat, pandasql, psutil,
  PySimpleGUI). Đã chạy thật dưới WASM: `h5py` ghi/đọc lại một dataset, `sqlalchemy`
  tạo bảng/chèn/truy vấn — **cả hai chạy được**.
  **Nhưng cơ hội chỉ là 2 BÀI, không phải 10.** Đọc `_blocked` của bản dựng (chính xác
  hơn tự quét `import` — SY23 viết `import tempfile, h5py` nên regex một-gói-một-dòng
  trượt): chỉ **SY23** (h5py + scipy) và **SY24** (sqlalchemy) bị chặn vì gói CÓ sẵn.
  Tám gói còn lại không bài nào dùng. **SY24 đã mở khoá 04/11** — chỉ cần vendor sqlalchemy
  1 937 KB + typing-extensions 43 KB, vì **3 ca chấm đã nằm sẵn trong gói nguồn**
  và bị chính cổng `THIEU_WHEEL` vứt đi; **SY23 thì KHÔNG đáng** — h5py kéo
  theo scipy **13,7 MB**, tức +46% kích thước runtime cho ĐÚNG MỘT bài. Đó là quyết định
  của chủ dự án, không của vòng lặp.
  **BẪY NẶNG CÂN: `loadPackage` GHI WHEEL VÀO THƯ MỤC VENDORED.** Một phép thử gọi
  `loadPackage('h5py')` với `indexURL` trỏ vào `frontend/public/pyodide/v314.0.7/`
  đã thả **3,5 MB** (h5py · sqlalchemy · pkgconfig · typing-extensions) vào đó. Dòng log
  nói *"caching the wheel in node_modules"* — **nó nói thiếu**. Một `git add -A` là
  megabyte vào repo mà không ai quyết.
  Nay `node scripts/check-wheel.mjs` (có trong CI) canh **hai chiều**:
  · wheel không ai với tới → ĐỎ (bắt đúng tai nạn trên);
  · gói bài CẦN mà thiếu wheel → ĐỎ, vì `loadPackage` KHÔNG ném mà lặng lẽ tải từ
    CDN — CI xanh, còn trong trình duyệt thì CSP `connect-src 'self'` chặn, tức hỏng
    cứng với học viên.
  **PHẢI ĐÓNG BAO PHỤ THUỘC, không so theo danh sách khai.** Bài chỉ khai `numpy,
  pandas, tzdata, matplotlib` — bốn cái — nhưng chúng kéo theo Pillow, contourpy,
  cycler, fonttools, kiwisolver, packaging, pyparsing, python-dateutil, pytz, six:
  **đúng 14**, khớp 14 wheel đang có. So theo danh sách khai thì 10 wheel hợp lệ bị kêu
  oan, mà cổng kêu oan sẽ bị tắt.
  Ablate 3 chiều: thả một wheel không ai dùng → **1 lỗi** · giấu wheel `pandas` (bài có
  khai) → 1 · giấu `pillow` (PHỤ THUỘC, không bài nào khai trực tiếp) → 1 — chiều
  thứ ba là thứ chứng minh phép đóng bao không thừa.

- **CÙNG MỘT DANH SÁCH WHEEL sống ở BỐN chỗ, và chỗ thứ tư làm cổng BÁO OAN.**
  Mở khoá SY24 (vendor `sqlalchemy`) phải sửa `THIEU_WHEEL` và `VENDORED` trong
  `build.py`, và `check-wheel.mjs` thì tự đọc đĩa nên không phải sửa. Chỗ thứ TƯ —
  `hop_le = {'numpy', 'pandas', 'matplotlib', 'tzdata'}` trong `kiem_sandbox()` của
  `check.py` — không ai nhớ, nên `check.py --strict` đỏ với *"SY24: khai gói không có
  wheel"* trong khi wheel ĐANG nằm trên đĩa. Một lỗi GIẢ, và lối thoát trông hợp lý nhất
  lúc đó là gỡ gói ra khỏi bài — tức sửa NỘI DUNG để chiều một phép kiểm sai, đúng bệnh
  đã ghi ở "Luật 6 của cổng INSERT".
  Nay `hop_le` ĐỌC TỪ ĐĨA (`glob('*.whl')` trên chính thư mục vendored), và RỖNG là
  LỖI — một tập rỗng làm luật im lặng cho qua mọi gói, tức cổng tự tắt mình.
  Ablate: giấu wheel `sqlalchemy` → **1 lỗi**, đúng tên bài và đúng tên gói.
  **Và cơ hội chỉ là MỘT bài, không phải hai:** SY23 cần h5py, mà h5py kéo theo scipy
  **13,7 MB** — +46% runtime cho một bài. Đo rồi mới bỏ, đừng dựng lại phép tính này.
  **MỘT KHẲNG ĐỊNH NỮA CỦA TÔI SAI, và nó sai theo chiều tự khen:** tôi viết "soạn 3 ca
  chấm tại repo" rồi mới đi đọc gói nguồn — "SY24" ở đó CÓ ĐỦ 3 ca, `referenceSolution`,
  `hints`, `starter`. Thứ chặn nó suốt từ đầu chỉ là MỘT dòng trong `THIEU_WHEEL`.
  Chú thích ở `bai_tap_cua` (build.py) cũng mang đúng niềm tin sai đó ("chưa ai soạn ca
  chấm") và đã viết lại. Đọc gói nguồn TRƯỚC khi nói ai phải soạn gì.
  **VÀ MỘT LỖI THẬT ĐI KÈM, lớn hơn chính việc mở khoá:** `goi_can_tai` trước đây chỉ
  quét LỜI GIẢI + KHUNG của bài tập, không quét mã BÀI ĐỌC — mà ô "Chạy thử" nối mọi
  khối đọc thành một chương trình. Đo được **4 bài khai thiếu**: VZ24 và EX01 đọc
  `pandas` mà chỉ khai `numpy`; SY26 và EX08 không khai gói nào. Nay `bai_tap_cua` nhận
  thêm `code_doc`. Thiếu khai thì `loadPackage` KHÔNG ném — nó rơi về CDN, và CSP
  `connect-src 'self'` chặn đường đó trong trình duyệt.

- **CÂU NÓI VÌ SAO: 1 nhánh phản hồi quan trọng nhất chưa ca nào đi qua — và nó là
  câu người MỚI gặp nhiều nhất.** Pha 1 chứng minh lời giải đúng ĐẠT, pha 2 chứng minh
  lời giải sai TRƯỢT. Cả hai chỉ đọc cờ `passed`, nên cả hai vẫn XANH khi `detail` rỗng
  sạch — tức khi học viên trượt mà không biết vì sao. Van der Kleij 2015: phản hồi CÓ
  GIẢI THÍCH **d = 0,49**, chỉ nói đúng/sai **0,05**.
  Đo trước khi dựng, trên 1 869 ca trượt của pha 2: **0 ca im lặng** (nội dung lành,
  1 654 câu KHÁC NHAU / trung vị 59 ký tự — không phải chữ mẫu), nhưng phân theo NHÁNH
  thì **"Chưa có hàm solve(data)" đi qua 0 lần**. Lý do: mọi biến thể cũ đều ĐỊNH NGHĨA
  `solve` — kể cả khung trống, vì starter có `def solve(data): pass`. Mà đó đúng là ca
  người mới gặp nhiều nhất: xoá hàm, đổi tên hàm, viết thẳng mã ở mức module.
  Nay có biến thể **"đổi tên hàm solve"** (đổi ở CẢ `def` lẫn mọi lời gọi — đổi mỗi `def`
  thì lời giải đệ quy ném NameError và ca trượt vì nhánh KHÁC, tức phép đo nói dối theo
  chiều "đã phủ") và **pha 4**: mọi ca trượt phải có câu nói vì sao, và mọi nhánh đã khai
  phải có người đi qua. 625 → **752 biến thể**; nhánh `thiếu hàm solve` 0 → **418 lượt**.
  **CỔNG NÀY BẮT ĐƯỢC HAI LỖI CỦA CHÍNH NÓ, cả hai nhờ chạy thật:**
  · `NHANH_CHUA_DI_QUA` khai "mô phỏng dừng" trong khi `NHANH_PHAN_HOI` không có nhánh
    nào tên đó — một ngoại lệ trỏ vào hư không, và nếu không kiểm thì nó im lặng mãi;
  · nhánh ngoại lệ viết `c.includes(': ')` — **bắt-tất**, đúng lỗi đã ghi ở cổng lời
    đòi. Nó nuốt luôn "Mô phỏng dừng", nên nhánh ấy vĩnh viễn 0 lượt mà bảng vẫn trông
    đủ. Nay là phép thử DƯƠNG, và **câu không khớp nhánh nào là LỖI** — chính luật đó
    lộ ra nhánh thứ bảy: hợp đồng BIỂU THỨC có câu so sánh RIÊNG ("Mong đợi … nhưng
    nhận …"), không phải "Cần có … nhưng nhận …". Hai hợp đồng, hai câu.
  Ablate 4 chiều: làm RỖNG câu của nhánh thiếu-solve → **418 ca im lặng** · gỡ biến thể
  mới → **2 nhánh** báo "không ca nào đi qua" (nó cũng là thứ DUY NHẤT chạm nhánh ngoại
  lệ) · khai khống một nhánh đang sáng là tối → **1 lỗi** "NGOẠI LỆ ĐÃ LỖI THỜI".
  **Chiều thứ tư ra 0 đỏ, và phải nói ra:** trả nhánh ngoại lệ về bắt-tất → **0 lỗi**,
  vì thứ nó nuốt ("mô phỏng dừng") đang được khai là tối sẵn. Tác hại của bắt-tất ở đây
  là TIỀM ẨN — nó hiện ra đúng vào ngày ai đó xoá dòng khai ấy. Đừng đọc "0 đỏ" thành
  "bắt-tất vô hại".
  **GIỚI HẠN:** pha 4 kiểm câu KHÔNG RỖNG và đúng NHÁNH; nó không kiểm câu đó có HỮU ÍCH
  không. Thứ đo được cho việc ấy là 1 656 câu khác nhau / 2 288 ca — một con số mô tả,
  không phải một hàng rào.

- **Một dữ kiện ĐÚNG mà im lặng về giới hạn của nó thì MỜI người đọc suy sai.**
  Khi production chưa có thẻ `pe-build`, `check-da-deploy.mjs` chỉ in hai chuỗi
  `ASSET_VERSION` rồi dừng. Không sai một chữ — và người đọc (là tôi) đã suy:
  *"2026-10-29a được đưa vào ở `f447d1e` ⇒ production đang chạy `f447d1e`"*, rồi ghi
  "sau lưng 66 commit" vào chính file này như một SỐ ĐO. Số thật: `9567490`, **sau
  lưng 15**.
  Nay cổng in ra cái KHOẢNG: *"production nằm ĐÂU ĐÓ trong 55 commit của
  [`f447d1e` … `bf44293`); `f447d1e` chỉ là CẬN DƯỚI, KHÔNG phải bản đang chạy."*
  Đó đúng là câu sẽ chặn tôi lại.
  **BẪY KHI TÍNH KHOẢNG — lịch sử KHÔNG đơn điệu theo giá trị.** `070886a` (22/10, commit
  revert) đặt `ASSET_VERSION` **LÙI** về `2026-10-13g`. Nên phải đi theo THỨ TỰ GIT
  (`--reverse`) và lấy **LẦN CUỐI** một giá trị được đặt; sắp theo ngày trong chuỗi là
  ra sai. Ablate 5 chiều: giá trị đang live → `[f447d1e … bf44293)` 55 commit (CÓ chứa
  `9567490`) · giá trị mới nhất → cận trên là `main` · `2026-10-13g` → `[070886a …`
  (ĐÚNG commit revert, không phải `79c0aaf` ngày 13/10) · `2026-10-13a` → một khoảng
  KHÁC hẳn · giá trị không có trong lịch sử → nói thẳng "không tính được".
  **Hai lỗi Windows của chính hàm đó, chỉ lộ khi chạy thật:** `join()` sinh `\` mà
  `git show <sha>:<đường dẫn>` đòi `/` ⇒ **14/14 lời gọi ném `fatal:`** và khoảng ra
  rỗng; và `execFileSync` không chặn stderr ⇒ 14 dòng `fatal:` nhổ thẳng ra màn hình
  trong khi cổng vẫn báo 0 lỗi — một cổng như thế thì không ai tin nữa.

- **BẢNG MỐC NỀN LÀ TÍN HIỆU DỪNG, và nó đã nói sai HAI LẦN mà không gì bắt.**
  LOOP.md dùng bảng ở trên làm thước đo máy-đọc-được cho "đã xong chưa". Nhưng
  bảng là CHỮ, và chữ thì trôi:
  · nó từng ghi **204** ca test frontend trong khi cây mã chỉ có **134** — 70 ca
    tưởng có mà không có, sống sót vì phép đếm bằng `grep -E "^. pass"` trả RỖNG
    mà không báo lỗi (bẫy multibyte ghi ở mục đếm phân rã);
  · và **04/11/2026**: bảng ghi **16** CSS module trong `src/` trong khi có **15**.
    Con số được đo TRƯỚC khi xoá `ShellA.module.css`, rồi cả hai vào CÙNG commit
    828d33b. **Hai vòng lặp trôi qua, không bộ kiểm nào thấy** — và chính commit đó
    là commit dựng cổng chống tài nguyên chết.
  Nay `node scripts/check-moc-nen.mjs` (có trong CI) tính lại **13 mục** từ
  `out/lessons.json` và cây tệp rồi đối chiếu với bảng. Nó bắt được con số 15/16
  **ngay lần chạy đầu tiên**.
  **PHẢI KHAI CHỖ NÓ KHÔNG VỚI TỚI, và đó là nửa quan trọng hơn.** 518 ca frontend,
  485 ca backend, 104 lỗi lint, 65 phép kiểm tracer đều cần CHẠY một bộ mới biết, nên
  cổng in ra hai dòng "NGOÀI TẦM". Im lặng ở đó thì danh sách 13 mục bị đọc thành
  "bảng đã được kiểm hết" — mà đó đúng là cách con số 204 sống sót.
  **Regex phải neo vào ĐỦ CHỮ xung quanh:** tìm trần `179` thì cũng khớp "179/179
  bài" ở hàng "Đã nạp DB chưa", và khi đó cổng xanh vì lý do sai. Và số trong bảng
  viết kiểu Việt — dấu cách ngăn nhóm nghìn ("2 441"), có chỗ là U+00A0 — nên bóc
  xong phải bỏ mọi khoảng trắng trước khi so.
  Ablate 4 chiều: đổi một con số trong bảng → **1 lỗi** · đổi con số có dấu cách
  nhóm nghìn → 1 · đổi CHỮ của một hàng → 1 (cổng kêu "KHÔNG CÒN DÒNG" thay vì im
  lặng xanh — thiếu chiều này thì đổi tên một hàng là vô hiệu hoá nó) · thêm một tệp
  test thật mà không sửa bảng → 1.

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
- **Màn đọc có SÁU loại khối, và BỐN chỗ phải đổi cùng lúc.** `paragraph · code ·
  terminal · figure · table · diagram`. Chúng được khai ở `ReadBlock`
  (`frontend/src/lib/studio-lesson.ts`), dựng ở `ReadScreen.tsx`, phát ra ở
  `scripts/pe-da/build.py`, và `LOAI_KHOI` trong `scripts/pe-da/check.py` chặn loại lạ.
  Bản đặc tả đầu chỉ ghi ba loại, build thêm `figure`/`terminal` sau — 26 bài có hình ném
  TypeError ngay màn đọc và không ai thấy cho tới khi mở đúng bài đó. `ReadScreen` phải
  `switch` có nhánh `default` ép `never`.
  Loại thứ sáu (`diagram`, thêm 29/10/2026) là PHÉP THỬ, hôm nay đúng MỘT bài — xem bẫy
  "Chữ TRONG sơ đồ không phóng to được" ở dưới.
  **`trace` (bảng từng bước) KHÔNG phải loại khối thứ bảy — nó là một TRƯỜNG của khối
  `code`**, và đó là một lựa chọn: bảng nói về đúng một đoạn mã (số dòng trong bảng là số
  dòng của `block.code` ngay trên nó), nên để nó thành khối riêng là tạo thêm một thứ có
  thể trôi lệch khỏi khối nó nói về — đúng cái bệnh mà `kiem_so_do` phải sinh ra để chữa
  cho `diagram`. BỐN chỗ vẫn là bốn: `ReadBlock.trace` + `ReadTrace`, `StepTrace.tsx` dựng
  từ `ReadScreen`, `vet_cua_bai()` trong build.py, `kiem_vet()` trong check.py.
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

- **Vị trí đáp án trắc nghiệm từng được XOAY THEO CÔNG THỨC, không trộn — và nó làm 46 bài
  không đo được gì.** Đo trên `source/practice.json`: 1 032 câu, tất cả đúng 3 phương án, mà
  **519 câu (50,3%) có đáp án ở vị trí 1** (ngẫu nhiên phải ~33%); cả 172 bài chỉ sinh ra
  **8 dãy vị trí khác nhau**, câu đầu mỗi bài chạy đúng chu kỳ 1→3→2. Hệ quả: bấm "a" cho mọi
  câu đúng **6/6 ở 16 bài, 5/6 ở 30 bài**. Nay `tron_vi_tri_dap_an()` trong build.py trộn
  NGẪU NHIÊN CÓ PHÂN TẦNG: 516 câu đang phát về **32,8 / 34,1 / 33,1 %**, 0 bài bấm "a" được
  ≥2/3, số dãy 8 → 11. Kho hậu kiểm (`src/quizzes/post-test-bank.json`) có cùng bệnh và cùng
  thuốc: 51,2% → 32,4 / 35,1 / 32,6 %, 46 bài → 0.
  **ĐỔI HÀNH VI NGƯỜI HỌC THẤY ĐƯỢC:** điểm trắc nghiệm sẽ GIẢM, vì mẹo "luôn bấm phương án
  đầu" mất tác dụng. Đó là mục đích, không phải tác dụng phụ.
  **PHÂN TẦNG chứ không ngẫu nhiên thuần, và đã ablate:** với đề 3 câu, xác suất cả 3 cùng vị
  trí là 1/9 — đổi sang `rng.randrange()` thì **23/172 bài** có cả 3 câu cùng một vị trí, tức
  23 bài trông y như bệnh cũ với người học mà không ai biết là tình cờ.
  **Seed phải CỐ ĐỊNH và KHÔNG được là `hash()` dựng sẵn.** Với chuỗi, `hash()` băm theo
  PYTHONHASHSEED ngẫu nhiên mỗi tiến trình, nên `random.Random(hash(ma_bai))` ra kết quả KHÁC
  mỗi lần dựng — mỗi lần build lại là một lần đổi đáp án của học viên đang học dở, và
  `update-lesson-content.ts` (in sha256 cũ → mới) hết so được. Nay seed là
  `f'{SEED_TRON}/{ma_bai}'`; kiểm bằng cách dựng hai lần và so md5 `out/lessons.json`.
  **`feedback` phải đi THEO phương án, không theo vị trí** — lỗi im lặng tệ nhất ở khâu này:
  học viên chọn sai rồi đọc lời giải thích của một phương án khác, không gì đỏ. Ablate (giữ
  `feedback` theo vị trí): check.py **900 lỗi**, build_posttest **826**.
  **Phương án là DÃY SỐ thì SẮP TĂNG, không trộn** (`la_day_so()`): với `12 / 11 / 1` thì thứ
  tự là manh mối hợp lệ, và thứ tự của một dãy số do con số quyết định chứ không do người
  soạn. 98/1032 câu rơi vào nhóm này, và chỉ 24 trong số đó đang được trình bày theo thứ tự.
  Giá: vị trí của chúng dồn về GIỮA (10/62/26) vì nhiễu hay kẹp hai bên đáp án — đó là tính
  chất của NỘI DUNG, nên luật "không bài nào có cả 3 câu cùng vị trí" MIỄN TRỪ bài mà MỌI câu
  là dãy số. Hôm nay đúng **1 bài** (NP16); một câu không phải dãy số là hết miễn trừ.
  **Hai phép so với nguồn phải chuyển từ VỊ TRÍ sang CHỮ, ở hai file.** `kiem_trac_nghiem()`
  (check.py) và `kiem_dap_an()` (build_posttest.py) so `options[i].text` theo chỉ số — để
  nguyên thì 1 531 lỗi GIẢ nổi lên và không lỗi thật nào bị bắt. Nới đúng MỘT bậc: tập chữ
  phải khớp (sửa/thêm/bớt một phương án vẫn đỏ), còn đáp án thì so bằng CHỮ của phương án mà
  `correctOption` trỏ tới — nên phép so vẫn chạm tới NGUỒN.
  **`kiem_khong_trung()` phải so bộ lựa chọn KHÔNG theo thứ tự** (frozenset), vì hai kho trộn
  bằng hai seed; nhưng bộ TOÀN SỐ được miễn — NP07 có bốn câu khác nhau (`a.size`, `a.shape`,
  `len(a)`, đếm số đo) trên cùng mảng 3×2 nên cả bốn đều có phương án {2, 3, 6}. Luật cũ bỏ
  qua chúng nhờ thứ tự khác nhau, tức nhờ tình cờ.
  Ablate phép trộn hẳn: `check.py --strict` **17 lỗi** (15 bài dồn một vị trí + 2 luật phân
  bố). Ba bẫy còn lại của VAN-PHONG.md §8 M2 nằm ở `kiem_phuong_an()`: cấm "tất cả đều đúng"
  (nguồn có 0 câu — luật canh gói SAU), trần 21 câu có đáp án dài hơn hẳn mọi nhiễu (khiếm
  khuyết NỘI DUNG, phép trộn không chữa được — **chỉ được hạ**), và tỉ lệ nhiễu-giống-nhất
  đứng liền trước đáp án: 24,8% trước (THẤP hơn tình cờ vì đáp án hay ở vị trí 1, nơi không
  có "liền trước") → **32,6%**, đúng mức tình cờ 33,3%.

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
  **13 bài không chấm được:** openpyxl (PD13), seaborn (VZ16-19), plotly (VZ20-22),
  ipywidgets (VZ23), h5py (SY23) — chưa vendor wheel (SY24 đã mở khoá 04/11);
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
- **`build-tracer-source.mjs` HỎNG từ 25/10 tới 28/10, và bộ canh lệch không thấy được.**
  Nó ghi `src/python-runner/tracer/tracer-source.ts` TRƯỚC rồi mới ghi bản cho trình duyệt,
  mà thư mục đó bị xoá cùng bộ chạy máy chủ — `mkdirSync` chỉ chạy cho đích WEB và chạy
  SAU, nên script chết `ENOENT` trước khi ghi được gì. Hệ quả: suốt ba ngày **không ai
  sinh lại được `pe_tracer.min.py`** — tức sửa `scripts/tracer/pe_tracer.py` là sửa vào
  một file không có đường nào tới trình duyệt. `tracer-web-sync.test.mjs` bắt được "hai
  bản LỆCH" nhưng không bắt được "không có cách nào làm cho khớp": nó so hai file, và hai
  file đó vẫn khớp nhau ở bản cũ. Nay chỉ còn MỘT đích (bản nhúng TS không còn ai import,
  đã grep). Kiểm lại: `node scripts/build-tracer-source.mjs` phải in ra số byte, và chạy
  hai lần phải ra file giống nhau từng byte.
- **Hai trần của tracer từng được biện minh bằng hạ tầng ĐÃ XOÁ — và một trong hai làm
  MẤT HẲN vết.** `maxBytes` 700 KB vì *"Node giữ tối đa 1 MB mỗi luồng (MAX_BUFFER trong
  `docker-sandbox.ts`)"*, `timeBudgetMs` 6 500 vì *"container bị giết ở 10 s"*. Không còn
  luồng Node nào, không còn container nào. Và cái giá không phải một chú thích lỗi thời vô
  hại: **6 500 > trần 5 000 ms của bài học** (`DEFAULT_LIMITS.execMs` trong
  `runner/types.ts`), nên trên đường đó tracer KHÔNG BAO GIỜ tới được trần của chính mình
  — `terminate()` tới trước, và `terminate()` thì không có thông điệp `result` nào mang
  vết về. Người học nhận **ô TRỐNG** thay vì vết một phần. Đúng họ bẫy "`terminate()` giết
  luôn thông điệp 'result'" ghi ở trên, lần này ở đường ghi vết.
  Nay `maxBytes` **1 536 KB** và `timeBudgetMs` **4 000** — đo trong module worker THẬT
  (`node scripts/tracer/do-settrace.mjs`, Pyodide 314.0.7, trung vị 8 lượt):
  · ca chậm nhất của 8 đoạn mẫu là **230–290 ms**, nên 4 000 ms là hơn 13 lần biên;
  · 1,5 MB tốn ~290 ms và **4,54 MB** heap main thread (CDP `Runtime.getHeapUsage` sau
    `collectGarbage`; `performance.memory` VÔ DỤNG — Chrome làm tròn về đúng 10 000 000),
    và nó MUA được thứ 700 KB đang lấy đi: `rows.append({...})` 400 lần đi từ bước
    **150 → 223**, ma trận 60×60 từ **350 → 524**. **Trần BYTE, không phải trần bước, mới
    quyết định người học xem được bao nhiêu** — mỗi bước chụp lại cả collection nên JSON
    phình bình phương. Đừng coi 1,5 MB là bậc thang đầu của một dãy: gấp đôi byte chỉ thêm
    ~50% bước, muốn hơn thì phải sửa CÁCH CHỤP (`maxItems`, chụp vi phân), chưa làm.
  **`timeBudgetMs` là trần MỀM, và chỗ này là chỗ duy nhất nói ra.** Trong Pyodide
  `hasattr(signal, "setitimer")` là **False** (Emscripten-5.0.3-wasm32) — `SIGALRM` thì CÓ
  và `signal.signal` chạy không lỗi, nên **suy từ `SIGALRM` là suy sai**. Vậy
  `st["watchdog"]` không bao giờ True ⇒ `_stop_tracing()` GIỮ callback ⇒ hai hệ quả đã đo:
  · trần thời gian chỉ được kiểm TRONG callback, nên `time.sleep(8)` sau trần bước làm
    tracer về ở **8 044 ms** chứ không ở 4 000 — vì vậy hạn 20 s của `ide-trace.ts` PHẢI
    ở lại, nó là đường cắt duy nhất còn sống;
  · **hạ `maxSteps` KHÔNG cứu được ca xấu** nên nó giữ 1 000: `while True: i += 1` đi qua
    **4 055 730 lượt gọi callback** (~1,6 µs/lượt) để ghi đúng 1 000 bước. Chi phí trội
    nằm ở SỐ SỰ KIỆN, không ở số bước ghi. Và hệ số chậm cao nhất (57×) đến từ việc TUẦN
    TỰ HOÁ GIÁ TRỊ, không từ chi phí callback — nên "hệ số cao" ở đây KHÔNG đồng nghĩa
    "phải hạ trần bước".
  Hệ số `sys.settrace` dưới WASM (không nguồn nào trên thế giới lượng hoá): mã vô
  hướng/điều khiển luồng **5,6×–57×**, mã dữ liệu (`df.groupby().agg()`, numpy) chỉ
  **1,1×–1,3×** vì tracer lọc theo `co_filename` nên ruột thư viện không sinh sự kiện.
  Tham chiếu desktop gần nhất là ~5× (benchmark của coverage.py) — nhớ điều đó nếu có
  ngày tính sẵn vết tại build cho cả 172 bài.
  `tracer-limits.test.mjs` (7 ca) canh QUAN HỆ giữa trần của tracer và trần của các lớp sẽ
  cắt nó, chứ không canh "con số bằng mấy", và nó đọc trần 5 giây từ chính `runner/types.ts`
  thay vì chép thành hằng thứ hai. Ablate: trả nguyên khối `PE_LIMITS` cũ → 3 đỏ; chạm
  trần bước mà `return None` (cắt im lặng) → 1; `do-settrace.mjs` thôi tạo module worker →
  1; sửa `.py` mà quên sinh lại `.min.py` → 1.
  **Fixture của `ide-trace.test.mjs` CỐ Ý không khớp hằng thật** (`timeBudgetMs: 6500`):
  đó là thứ duy nhất chứng minh `stopNotice` lấy số từ `doc.limits`. Fixture trùng hằng
  thật thì một bản ghi cứng "4 giây" cũng ĐẠT. Đừng "sửa cho khớp".
- **Lớp ghi nhật ký lần thử: cổng duy nhất của nó từng ở CLIENT, và cổng ở client không
  phải bằng chứng đồng ý.** `let dongY = false` trong `frontend/src/lib/learning-events.ts`
  không nói được ai đã đồng ý / lúc nào / với ĐIỀU GÌ, nó mất cùng localStorage, và nó
  không chặn được một request gửi tay — trong khi `record()` ở máy chủ nhận lô nào cũng
  ghi. Dữ liệu theo dõi hành vi là dữ liệu **NHẠY CẢM** theo Luật 91/2025 + Nghị định
  356/2025, và Điều 9(4) nói nguyên văn *"sự im lặng hoặc không phản hồi không được coi là
  sự đồng ý"*. Nay cổng thật nằm ở `record()`: nó đọc `learning_event_consents` trước khi
  ghi một hàng nào, và trả **202 kèm `refused: 'no-consent'`** chứ không 403 — lớp này là
  ghi-rồi-quên, frontend `.catch()` nuốt mọi lỗi nên một 403 biến mất không dấu vết, còn
  một trường trong body thì log HTTP và bộ test còn đọc được.
  **Cột `version` là thứ dễ bỏ nhất, và bỏ nó thì sai IM LẶNG.** Sự đồng ý luôn là đồng ý
  với MỘT bản mô tả ("ghi 10 loại sự kiện này, giữ 90 ngày"). Ngày ai đó thêm loại thứ 11
  hoặc nâng `HAN_LUU_NGAY`, bản ghi cũ không còn phủ việc đang làm — nhưng hàng vẫn
  `granted = true`, lớp ghi vẫn chạy, và dự án thu thập thứ chưa ai đồng ý cho. Không
  ngoại lệ nào được ném. Nên `conHieuLuc()` trả false khi phiên bản lệch **theo CẢ HAI
  chiều** (kể cả phiên bản MỚI hơn — một hàng mang phiên bản mã này chưa biết nghĩa là DB
  đã bị một bản deploy khác ghi vào), và một ca GHIM cặp (`PHIEN_BAN_DONG_Y`,
  `dauAnPhamVi()`) đỏ kèm câu dặn khi phạm vi đổi. Dấu ấn tính trên danh sách ĐÃ SẮP, nên
  đổi thứ tự khai không bắt người học đồng ý lại.
  **`canHoiLai()` KHÁC `!conHieuLuc()`, và gộp chúng là một lỗi về luật.** Người đã TỪ CHỐI
  thì không ghi, nhưng cũng **không hỏi lại** — một hộp hiện lại mỗi lần mở bài là ép đồng ý
  bằng sự mệt mỏi, tức sự đồng ý đó không còn tự nguyện. Nhưng phiên bản MỚI thì hỏi lại cả
  người đã từ chối, vì câu trả lời cũ không phải câu trả lời cho câu hỏi mới.
  **Ba thứ trong `ConsentBanner.tsx` là YÊU CẦU, không phải thẩm mỹ**, và `consent-banner.test.mjs`
  khoá cả ba: hai nút CÙNG class/cùng cỡ (`flex: 1`) — làm nút "Đồng ý" nổi hơn là lấy sự
  đồng ý bằng ma sát; KHÔNG có nút đóng và không tự tắt; `aria-modal={false}` — chặn bài học
  để lấy đồng ý là cưỡng chế. Nguyên văn nằm ở `MO_TA_PHAM_VI` trong `log-consent.ts`,
  CẠNH phiên bản nó mô tả, và một ca đọc cả hai cây mã để so số ngày trong hộp với
  `HAN_LUU_NGAY` ở backend — hộp nói 90 mà backend giữ 365 là sự đồng ý lấy bằng thông tin
  sai, và đó là phép so duy nhất bắt được nó.
  **Lượt đọc trạng thái phải nằm TRONG `Promise.all` của `useLessonData`, không muộn hơn
  `datBoiCanhBai`.** `ghi()` **BỎ** sự kiện khi cổng còn đóng chứ không xếp hàng, nên cổng
  mở sau là mất hẳn `X-Lesson.Open` của lượt đó — câu SQL drop-off đếm thiếu đúng lượt mở
  bài ĐẦU TIÊN của mỗi người. Ca cũ `lesson-load.test.mjs` ghim ĐÚNG BA nhánh đã bắt được
  nhánh thứ tư này; nó được sửa thành ghim BỐN, **không** nới thành "bao nhiêu cũng được".
  Ablate: gỡ `conHieuLuc` khỏi `record()` → 5 đỏ; thôi so `version` → 3; thôi hỏi lại khi
  phiên bản đổi → 1; mười mảnh phía frontend mỗi mảnh 1 đỏ.
  **Lớp này vẫn TẮT cho tới khi người học bấm.** Mặc định là không ghi gì, và không có biến
  môi trường nào bật được — đừng thêm một cái.
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
  bỏ qua.
  **14 cảnh báo ở VZ14/VZ25/VZ30 TỪNG bị quy cho `figsize=(6, 3.5)` và giao cho NGƯỜI
  SOẠN GIÁO TRÌNH — quy kết SAI cả hai vế, nay đã đo lại và sửa.** Thử
  `(6,3.5)/130 · (6,3.5)/100 · (6,3)/130 · (6,3)/100 · (6,3.5)/120` → **đều 36 cảnh
  báo**, `figsize` và `dpi` không đổi một con số. Tách tiếp: chỉ vẽ không render → **0**
  · `canvas.draw()` → **24** · `savefig` PNG → **24** · `savefig` SVG → **0**. Thủ phạm
  là khâu RASTER HOÁ của backend Agg trong matplotlib 3.10 — ruột thư viện, không dòng
  nào của người học gây ra, và **không sửa được bằng cách đổi figsize**.
  **Và nó KHÔNG chỉ ở 3 bài:** đường xuất hình của chính `_anh_figure` sinh 24 cảnh
  báo, tức MỌI bài biểu đồ dính; ba bài kia chỉ là nơi nó lọt qua phép dedupe.
  Nay `_install()` lọc theo ĐÚNG THÔNG ĐIỆP (`The [xy] parameter as float was
  deprecated`), **không theo category** — lọc theo `MatplotlibDeprecationWarning` sẽ
  nuốt luôn cảnh báo về API mà BÀI HỌC gọi sai, tức giấu đi thứ người học cần đọc.
  Đã đo bộ lọc: cảnh báo nội bộ **24 → 0**, trong khi một `RuntimeWarning`, một
  `DeprecationWarning` và **một `MatplotlibDeprecationWarning` KHÁC** đều VẪN hiện.
  Chú thích `dpi=96` trong `_anh_figure` cũng mang đúng niềm tin sai đó và đã viết lại.
  Ablate: gỡ bộ lọc → cảnh báo quay lại ngay ở VZ14/VZ25/VZ30.
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
  **Lần thứ ba, 03/11/2026 — `courses.service.spec.ts`: 222 → 134 lỗi (−88), 40% tổng
  số lỗi backend nằm trong MỘT file.** Công thức bốn bước ở trên chạy nguyên không đổi.
  Hai điều học thêm, và cả hai đều ở bước 3:
  · **`(c: any) => c.id` trong `.map()` cũng là một dòng `: any` tự tạo ra `any`.** Tám chỗ
    như vậy sinh 16 lỗi `no-unsafe-return`/`no-unsafe-member-access`. `listCourses` và
    `getSkills` đều ĐỂ TS TỰ SUY return type (`mapCourse` khai kiểu tham số đầy đủ), nên bỏ
    hẳn chú thích là hết — thêm một kiểu tay vào đó là mô tả lại thứ TS đã biết.
  · **Một helper đọc `mock.calls` KHÔNG được gộp "chưa gọi lần nào" với "gọi mà không kèm
    `where`".** Bản đầu của tôi cho `whereDaGui()` NÉM khi không có `where`, để kiểu trả về
    xác định và khỏi rải `?.` — và nó làm **1/478 ca ĐỎ**: ca "getCoursesEnrolled của quản
    trị viên: không lọc gì" khẳng định đúng cái `undefined` đó. "Không lọc gì" là một KẾT
    QUẢ hợp lệ của service, không phải một ca hỏng. Nay helper ném khi `calls[call]` không
    tồn tại (service chưa chạm tới DB — đọc `.AND` ở đó chỉ báo "undefined không chứa
    {isPublished:true}", không nói được nguyên nhân) và trả `undefined` khi có lời gọi mà
    không kèm điều kiện. Ba chỗ đọc `.AND` dùng `?.`, và chúng KHÔNG mất răng:
    `expect(undefined).toContainEqual(...)` là TRƯỢT, không phải đạt rỗng.
  Ablate: gõ `prisma.course.findMayn` → typecheck ĐỎ kèm "Did you mean 'findMany'?". Với
  `let prisma: any` thì đúng dòng đó biên dịch sạch và ca test im lặng chạy trên một mock
  không ai gọi — đó là cái giá thật của `any` ở spec, không phải con số lint.
  **Lần thứ tư, cùng ngày — và lần này là CODE CHẠY THẬT, không phải spec.**
  `all-exceptions.filter.ts` (bộ lọc mà AGENTS.md bắt MỌI lỗi phải đi qua) có 26 lỗi, tất
  cả từ MỘT nguồn: `ctx.getResponse()` / `ctx.getRequest()` gọi không kèm tham số kiểu nên
  trả `any` — trong khi `Request`/`Response` của Express **đã được import ở đầu file và
  không dùng lần nào**. Hệ quả không phải con số: `let message` (khai `string`) và
  `let fields: Record<string, string> | null` đều nhận giá trị từ `any`, nên hai dòng khai
  kiểu đó CHỈ LÀ CHỮ.
  **Nói cho đúng: lỗ KIỂU, không phải bug sống.** Đã đo — chỉ MỘT `ValidationPipe` toàn cục
  và nó dùng `validationExceptionFactory` của ta, nên hôm nay `message` luôn là `string[]`
  và `fields` luôn `Record<string, string>`. Đừng viết như vừa chữa một lỗi người dùng gặp.
  Cái bộ lọc này KHÔNG bảo đảm được là: nó `@Catch()` TOÀN CỤC, nên bất kỳ ai ném
  `HttpException` với payload hình dạng khác cũng rơi vào đây, và chú thích ngay trong file
  nói rõ client hiện `message` TRỰC TIẾP cho người dùng — tức một object lọt vào là người
  dùng đọc được chữ "[object Object]". Nay hai hàm ép kiểu ở BIÊN (`chuoiHoac`, `mapChuoi`)
  biến lỗ kiểu thành một bất biến được canh; `mapChuoi` lọc từng cặp và trả `null` khi
  không còn cặp chuỗi nào, để `...(fields ? …)` bỏ hẳn trường — đúng hành vi cũ.
  **`requestId` từng có BỐN bản mô tả của CÙNG một hợp đồng**, mỗi chỗ một cách:
  `(req as any).requestId = …` (bên GHI, `request-id.middleware.ts`) · `request.requestId`
  trên một `any` (`all-exceptions.filter.ts`) · `(request as any).requestId`
  (`prisma-exception.filter.ts`) · `(req as unknown as { requestId?: string })`
  (`overload-protection.middleware.ts`). Bốn bản mô tả là bốn thứ TRÔI ĐƯỢC: đổi tên trường
  ở middleware thì ba bên đọc vẫn biên dịch sạch và lặng lẽ trả `request_id: null` trên MỌI
  response lỗi — không exception nào ném. Nay một module augmentation duy nhất
  (`src/common/types/express.d.ts`) khai `requestId?: string` trên `Express.Request`; `?`
  chứ không bắt buộc, vì middleware chỉ chạy trên đường HTTP đã đăng ký.
  **Ablate, số đã đếm:** xoá `express.d.ts` → **4 lỗi typecheck**, đúng bốn chỗ, GỒM CẢ bên
  ghi · `chuoiHoac` trả thẳng không kiểm → **2 ca đỏ** · `mapChuoi` ép kiểu thay vì lọc →
  **2 ca đỏ**. Bốn ca mới của `all-exceptions.filter.spec.ts` (12 → 16) khoá đúng cái biên
  đó, và chúng KHÔNG tái hiện lỗi người dùng đang gặp — mục đó phải nói ra.
  **Và chính bộ test ấy cũng đang nói dối ở chỗ nhỏ:** `const json = jest.fn()` trần nên
  `json.mock.calls[0][0]` là `any`, tức mọi phép so trên thân response đều không được TS
  kiểm. `jest.fn<void, [ThanPhanHoi]>()` sửa ở GỐC, thay cho việc ép kiểu ở từng ca.
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
  **Câu ở đây từng ghi "`login.inline.js` vẫn dùng hạn dự phòng…" — file đó KHÔNG trang nào
  nạp, và nay đã xoá (03/11/2026).** Cùng họ bẫy `apiFetchSessionOnly`: đặt tên một cơ chế
  không tồn tại thì nó không chặn được gì, mà người đọc lại tưởng đang có một lớp bảo vệ.
  Luật về hạn dự phòng vẫn đúng nguyên vẹn cho `pe-bridge.js` — chỗ THẬT đang dán cookie mốc.
- **`apiFetch` gặp 401 là TỰ TẠO tài khoản khách — đừng gọi nó ở trang công khai.**
  `apiFetch` (`frontend/src/lib/api.ts`) khi refresh không được sẽ rơi xuống `ensureGuest()`.
  Gọi nó trên một trang ai cũng vào được nghĩa là **mỗi bot quét web sinh một tài khoản khách**,
  ăn hết hạn mức `THROTTLE_GUEST_LIMIT` (mặc định 120 lượt/giờ/IP, `src/auth/auth.controller.ts`)
  và nhồi rác `@guest.local` vào bảng users. Hạn mức tính theo IP nên cả phòng máy chung một
  NAT sẽ nhận 429 đúng lúc có người cần tài khoản thật. Luật dùng:
  · trang BÀI HỌC (`/lesson/*`) — nơi học viên thật sự cần một danh tính để lưu tiến độ — dùng
    `apiFetch`. Hôm nay đúng ba chỗ gọi nó, và cả ba đều ở bài học: `useLessonData.ts`,
    `PythonStudio.tsx`, `LessonDbDesign.tsx` (cộng `learning-events.ts` khi lớp log được bật);
  · **trang công khai CHỈ gọi API khi máy ĐÃ có phiên** — câu này từng là "không gọi API
    nào cả", và nó KHÔNG còn đúng từ 4d5f86d (bê trang chủ Góc học + trang khoá từ nhánh
    `test`): cả hai lấy tiến độ qua `apiFetch`, sau phép `hasStoredSession` (`laySo()`
    trong `StudyRoom.tsx`, `loadCompletedLessons()` trong `course-progress.ts`). Bot không
    có phiên đã lưu nên dừng ở đó — 0 lời gọi. `review-quiz.test.mjs` canh phép chặn ấy
    (ablate gỡ chặn ở mỗi trang → 1 đỏ). Lớp thứ hai của nhánh `test`
    (`apiFetchSessionOnly`) CHƯA áp, theo quyết định của chủ dự án 04/11, nên người có cờ
    phiên đã chết mở trang chủ là nhận MỘT tài khoản khách mới.
  **Dòng này từng ghi "mọi trang công khai dùng `apiFetchSessionOnly`" — hàm đó CHƯA BAO GIỜ
  được viết.** `grep -rn apiFetchSessionOnly frontend/ src/` ra 0 kết quả; `api.ts` chỉ export
  `apiFetch`, `danhDauPhien`, `asList`, `findEnrollment`, `HAN_DU_PHONG_GIAY`. Luật đúng về tinh
  thần nhưng nó đặt tên một cơ chế không tồn tại, nên nó không chặn được gì — đúng họ bẫy mà
  chính file này cảnh báo ở mục mốc nền ("một con số cũ trong bảng không phải chú thích lỗi thời
  vô hại"). Ngày nào một trang công khai THẬT SỰ cần gọi API thì ĐÓ là lúc phải viết
  `apiFetchSessionOnly` (chỉ gửi kèm phiên đang có; 401 thì trả 401 và để UI hiện "chưa đăng
  nhập"; KHÔNG gọi `ensureGuest()`) — đừng cho rằng nó đã có.

- **Câu nói VÌ SAO một ca chấm trượt từng là hàng NHỎ NHẤT và NHẠT NHẤT của bảng.**
  Bảng ca chấm có hai hàng mỗi ca: NHÃN chỉ gọi tên đầu vào ("Mã ngắn", "hai tháng"
  — đo trên bản dựng: 460 nhãn, dài trung bình 14,3 ký tự, **không nhãn nào nói kết
  quả**), và DETAIL là câu duy nhất nói vì sao ("Cần có 3 nhưng nhận 0"). Nhãn ở
  13px/`--edu-t1` (17,14:1), detail ở **12px/`--edu-t3` (5,46:1)** — phần MANG
  THÔNG TIN nhỏ hơn VÀ nhạt hơn phần chỉ đặt tên, ở **460 ca / 138 bài**.
  Van der Kleij (con số đã có sẵn trong file này): phản hồi CÓ GIẢI THÍCH **d = 0,49**,
  chỉ nói đúng/sai **0,05**. Phần 0,49 đang được trình bày như phần 0,05.
  **LẦN THỨ HAI cùng một lỗi** — lời giải thích phương án trắc nghiệm từng bị
  `opacity: 0.55` (mục ở dưới). Lỗi lặp ở chỗ thứ hai thì cần một CỔNG, không
  phải thêm một lần sửa tay. Nay `feedback-rank.test.mjs` (3 ca) ghim QUAN HỆ:
  detail không được nhỏ hơn nhãn, không được tụt quá MỘT bậc `--edu-t*`, và màu đó
  phải vượt AA cộng một sàn 8:1 tính từ chính `edu-theme.css`.
  **CHỨC NĂNG thì KHÔNG thiếu — đã kiểm trước khi sửa:** `studio-harness.py` phát
  detail ở MỌI nhánh thất bại (so sánh, ngoại lệ, thiếu `solve`, mô phỏng dừng) và
  `SandboxEditor` CÓ dựng nó ra. Mục 5 của báo cáo xếp hạng ("phản hồi có giải
  thích") vì vậy đã xong phần nội dung; thứ sai chỉ là thứ bậc trình bày.
  **ĐÃ ĐO VÀ BÁC, đừng dựng lại:** giả thuyết "detail dài tới 289 ký tự, JSON không
  khoảng trắng nên tràn ngang, cần `overflow-wrap: anywhere`" là SAI. Đo trong
  Chrome trên đúng bộ style của hàng đó, khung 360px: bản CÓ và bản KHÔNG có
  `overflow-wrap` **cùng ra 3 dòng**, mép phải chữ còn cách mép ô 32px. Chrome ngắt
  được sau dấu phẩy của JSON. 60/459 ca sinh câu > 120 ký tự và không ca nào tràn.
  **Bẫy khi viết ca:** nhãn KHÔNG tự khai `fontSize`, nó KẾ THỪA từ `<li>` của hàng;
  và `{t.detail}` nằm ở CUỐI thẻ div nên neo mốc vào đó rồi cắt xuôi sẽ vượt qua
  `fontSize`. Cả hai làm ca ĐỎ OAN ở bản đầu — một cổng báo oan còn tệ hơn không có,
  vì nó sẽ bị tắt. Ablate 6 chiều: trả về 12px/t3 → **3 đỏ** · chỉ hạ cỡ → 1 · chỉ làm
  nhạt → 2 · hạ `--edu-t2` xuống dưới sàn 8:1 → 1 · xoá span nhãn → 1 (ca nói thẳng
  "đổi cấu trúc thì sửa ca này"). Chiều NGƯỢC: nâng lên 14px/t1 → **0 đỏ**.

- **NĂM người thử cùng báo "không có nút back" — mà cơ chế quay lại ĐÃ CÓ.** Đợt thử
  nghiệm 27/10/2026: "không có nút back", "chưa có nút return", "sao không cho quay lại
  lỡ bấm nhầm nút tiếp theo", một người trong đó tự nhận làm frontend. Nhưng `goTo()`
  nhận số màn bất kỳ từ lâu, và thanh tiến độ trên đỉnh đã dựng mỗi đoạn đã đi qua thành
  một `<button>` gọi `onSeek`. Thứ thiếu là cái TRÔNG NHƯ bấm được: thanh tiến độ là một
  dải đoạn cao 4px, không viền, không nhãn. Nguyên văn một người: "ko có nút back mà bấm
  trên thanh tiến độ để chuyển à" — họ phải ĐOÁN ra. **Một đường đi mà người dùng phải
  đoán thì trên thực tế nó không tồn tại**, và đây là lần thứ ba cùng một hình dạng lỗi
  trong repo này (tracer không bài nào tới, nút "Try it Yourself" không màn nào mount).
  Nay có nút "← Quay lại" ở ô TRÁI thanh dưới. Nó gọi lại CHÍNH `goTo` — `goTo` xoá kết
  quả chấm màn cũ, đóng gợi ý và cuộn lên đầu, bỏ sót một trong ba thì màn mới mở ra kèm
  băng "Chưa đúng" của màn trước. KHÔNG `history.back()`: bài học là một trang đổi
  `d.step`, nó sẽ rời hẳn bài. Bốn khung không có nội dung (đang tải, lỗi nạp, chưa ghi
  danh, bài rỗng) dựng cùng `frame()` nên thừa hưởng mọi prop — phải `onBack: undefined`
  cả bốn, quên một cái là có nút Quay lại trên màn "Đang tải bài học…".
  **Đi kèm, và phải sửa cùng lúc:** nút × đóng bài thả người học về `/courses/<id>` trần,
  mà `CourseDetail` ghim cứng module 0 mở sẵn — nên đường ra duy nhất của màn bài học
  luôn đổ người ta xuống đầu một khoá 172 bài chia 10 module. Nay `leave()` mang theo
  `?lesson=`. **Lệch một đơn vị ở đây hỏng IM LẶNG**: `lessonNo` là `sort_order` đếm từ
  1, link ở trang khoá học là chỉ số PHẲNG đếm từ 0 — quên `- 1` thì vẫn mở đúng module
  ở hầu hết các bài, chỉ sai ở bài ĐẦU của mỗi module. Phép ánh xạ nằm ở
  `src/lib/curriculum-nav.ts` (hàm thuần, không import gì) để ca test gọi thẳng được với
  cả 10 module thật.
  **Cuộn phải là effect RIÊNG**: bản đầu nhét `requestAnimationFrame` vào cùng effect mở
  module và đo được `scrollY` vẫn bằng 0 — lúc đó module còn chưa mở nên `scrollIntoView`
  nhắm vào phần tử chưa có chỗ trên trang. Và `setState` phải HOÃN khỏi thân effect
  (React 19 chặn, đã làm lint đỏ ngay trong lần sửa đó). KHÔNG dùng `useSearchParams()`:
  nó buộc trang khoá học rời khỏi dạng tĩnh, mà đó là trang CÔNG KHAI không được gọi API.
- **Phản hồi "chữ quá nhỏ" có nguyên nhân là FONT, không phải `font-size`.** Ba trên bốn
  người trả lời khảo sát chọn "Nhiều chỗ chữ quá nhỏ, phải phóng to mới đọc được"; hai
  người khác báo "lỗi font chữ" / "chữ cao chữ thấp". Poppins có x-height THẤP so với
  chiều cao chữ hoa, nên cùng một `font-size` nó TRÔNG nhỏ hơn con số px nói, và vì là
  font hình học, chữ thường gần như tròn đều nên dòng chữ thiếu mốc cho mắt bám. Đổi sang
  **Montserrat** (người thử đề xuất đích danh) xử lý cả hai lời phàn nàn tưởng khác nhau.
  KHÔNG chọn Helvetica — lựa chọn còn lại họ nêu — vì nó không có trên Windows, ở đó rơi
  về Arial, tức hai máy hiện hai font khác nhau.
  **SÁU chỗ khai font phải đi cùng nhau**, bỏ sót một là lệch font giữa các trang:
  `edu-theme.css` (@import + biến `--edu-font`), `layout.tsx` (thẻ preload — trỏ sai là
  tải THỪA hẳn một font), `roadmap.css` (chuỗi dự phòng riêng), và ba `*.tailwind.js`.
  **Và phải bump `ASSET_VERSION`**: file trong `public/` không đi qua bundler nên URL
  không đổi theo nội dung — không bump thì người đã mở trang vẫn giữ CSS cũ trong cache,
  tức bản sửa không tới được đúng những người đã báo lỗi. Chính `assetVersion.ts` đã dặn
  điều đó.
  Đo tương phản trước khi đổi màu chữ, **và kết quả là KHÔNG có lỗi WCAG nào** — đừng
  "sửa" lại vì tưởng có: t1 #0f1b33 = 17,14:1 · t2 #3a4a66 = 8,93:1 · t3 #5b6a85 =
  5,46:1 trên nền trắng, cả ba vượt AA. Vấn đề là chỗ NÀO dùng cái gì: `.read p` (thân
  bài của 145 bài đọc) và `ShellB .description` (đề bài của MỌI màn) đang dùng tổ hợp nhỏ
  nhất và nhạt nhất trên màn hình. Nới đúng hai chỗ đó cộng ô tổng kết; KHÔNG nới tràn
  mọi `font-size` nhỏ — nhãn và chip ở cỡ nhỏ là đúng, nới hết thì mất thứ bậc.
- **Favicon là bản MẶC ĐỊNH của Vercel, và `metadata.icons` không cứu được.** Người thử
  nhận ra ngay ("Favicon hình như là default của Vercel"). `frontend/src/app/favicon.ico`
  đúng là file create-next-app sinh ra (25 931 byte, tam giác Vercel). Mà `layout.tsx` ĐÃ
  khai `metadata.icons` một tên lửa 🚀 từ lâu — trong App Router quy ước FILE thắng
  `metadata.icons`, nên dòng khai đó chưa bao giờ hiện ra lần nào. Nay là
  `src/app/icon.svg` (cũng quy ước file, không còn lớp nào đè) và `metadata.icons` đã
  XOÁ: khai lại ở đó là dựng lại đúng lớp đè đã gây ra chuyện này.
- **`withInlineCode` phải dùng CHUNG một bản — ô tổng kết từng in nguyên dấu backtick.**
  Người thử gửi ảnh ô "KIẾN THỨC CỐT LÕI ĐÃ HỌC" hiện `` `.venv\Scripts\python -m pip
  install numpy` `` kèm cả hai backtick. Hàm bóc backtick ĐÃ CÓ và màn đọc ĐÃ dùng; ô
  tổng kết lấy ĐOẠN VĂN ĐẦU của từng màn đọc làm ý chính (`RecapScreen.facts`) rồi dựng
  thẳng `{f}`. Cùng MỘT câu chữ, hai đường, hai kết quả — và đường hỏng là đường không ai
  nghĩ tới vì nó chỉ MƯỢN LẠI dữ liệu của đường kia. Hàm nay ở `src/lib/inline-code.tsx`;
  ô tổng kết nằm ở `lesson-chrome/exercises/` (dùng chung cho mọi loại bài) nên nó không
  được import ngược vào `components/python-studio/`. Ca test canh "hai nơi dùng CHUNG một
  hàm", không canh "Recap có gọi bóc backtick": nơi thứ ba mượn lại cùng dữ liệu sẽ lại
  hỏng đúng kiểu này.
- **Trắc nghiệm sai từng KHÔNG có đường đi tiếp — ĐÃ sửa, và trạng thái thứ ba không
  phải một trường mới.** Người thử: *"nếu sai rồi thì cho next luôn vì thử lại ở đây cũng
  ko làm đc gì. căn bản là người dùng chỉ cần nhớ đáp án rồi chọn lại là được."* Họ đúng cả
  về cấu trúc lẫn về bằng chứng: với 3 phương án, làm lại vô hạn đảm bảo đúng sau tối đa 3
  lần bấm, nên câu hỏi KHÔNG CÒN MANG THÔNG TIN NÀO. Van der Kleij 2015 (40 nghiên cứu / 70
  cỡ hiệu ứng): phản hồi có giải thích **d = 0,49** · hiện đáp án đúng **0,32** · chỉ nói
  đúng/sai **0,05** — nút "Thử lại" trần chính là loại 0,05, dạng yếu nhất, và nó còn chặn
  người học lại.
  **Trạng thái thứ ba = "có `score.firstTry[key]` nhưng không có `done[key]`"**, đọc qua
  `screenAnswered` / `screenSettled` / `isChoiceScreen` trong `studio-lesson.ts`. KHÔNG thêm
  một trường `reviewed` vào bản nháp: đó là thứ thứ hai phải khớp với `firstTry`, và nó sẽ
  lệch — đúng họ bẫy fixture mà file này đã ghi nhiều lần.
  **Giá phải trả, có chủ đích:** `award()` trước đây `return` ngay khi khoá không có
  mini-game, nên với khoá 172 bài `score.firstTry` **RỖNG HOÀN TOÀN**. Nay nó ghi cho MỌI
  khoá; chỉ hiệu ứng "+10 điểm" mới còn gắn với `scored`.
  **Chỉ nới cho `mcq` và `predict`.** Các màn chấm khác (`classify`/`scaffold`/`counter`/
  `selfExplain`/`game`) giữ "Thử lại" làm nút chính, vì ở đó làm lại là làm lại VIỆC (xếp
  lại dòng code, sửa hàm) chứ không phải chọn lại một phương án.
  **ĐỔI HÀNH VI NGƯỜI HỌC THẤY ĐƯỢC, và chỗ này mới là chỗ đắt:** `complete()` trước đây gửi
  `play ? quizPercent(…) : 100`, tức khoá 172 bài LUÔN gửi **100** kể cả sai cả 3 câu — vì
  `firstTry` của nó rỗng. Nay cả hai chỗ gọi dùng chung `diemBai()`. Mà `scaledXp` ở backend
  là `xp_reward × (50% + 50% × quizScore)` và `SCORED_XP_COURSES` CÓ `python_advanced`, nên
  **sai cả 3 câu = 50% XP của bài**; trước bản này mọi người đều nhận 100%.
  **Một hệ quả KÉO THEO, chưa ai quyết riêng:** trần "có hỗ trợ" của `quizPercent` (mở gợi ý
  → tối đa 80) nay cũng áp cho khoá bài đọc.
  **Ô thống kê phải đếm `firstTry`, KHÔNG đếm `done`** — đếm `done` thì bấm "Chọn lại" rồi
  chọn phương án vừa đọc được là về 3/3, tức mẹo người thử nói ra sống lại nguyên vẹn.
  **Lời giải thích của phương án KHÔNG được làm mờ nhất.** Phương án không-được-chọn-và-
  không-phải-đáp-án từng bị `opacity: 0.55`, tức đúng phần d = 0,49 bị làm mờ hơn cả.
  **Nhãn nút phải ≤ 20 ký tự** (có ca test): dưới 560px thanh dưới là flex với nút chính
  `flex:1; min-width:132px`, nên "Đã xem đáp án — tiếp tục →" (26 ký tự) tràn ngang.
  Và sửa kèm một lỗi dữ liệu: `X-Quiz.Answer` suy "lần đầu" bằng `firstTry[key] === undefined`
  nên ở khoá bài đọc MỌI lần chấm đều bị ghi là lần đầu.
  Ablate 13 mảnh: `screenSettled` về `done` thuần → **5 đỏ**; `isChoiceScreen` nới ra mọi màn
  có chấm → 3; `markDoneOnNext` luôn markDone → 2; bỏ `secondaryCta` → 2; chín mảnh còn lại
  mỗi mảnh 1. `mcq-next-after-wrong.test.mjs`, 23 ca.
  **Giới hạn đã nói ra:** `primaryCta` không import được vào `node --test` (`cta.ts` import
  một `.tsx`), nên nhánh nút chính chỉ canh được bằng phép đọc cây mã.

- **Ô kết quả từng không nói nổi nó là kết quả của BẢN CODE NÀO.** Bài PY01 có một câu
  tự vấn viết sẵn trong nguồn — *"Nếu không bấm chạy lại, output đang nhìn thuộc bản code
  nào?"* — và nền tảng không trả lời được. Người học sửa một dòng, không bấm Chạy, rồi đọc
  tiếp console bên dưới như thể nó là kết quả của bản vừa sửa: console nguyên màu, chip
  "✓ Đạt" của lượt trước vẫn xanh, dòng "123 ms" vẫn đứng đó. Nay sửa mà chưa chạy thì ô
  kết quả tự làm mờ và nói thẳng *"Kết quả này của bản code trước — bấm Chạy để cập nhật."*
  Rẻ, và đúng với **cả 172 bài** chứ không riêng bài nào: nó chỉ cần hai chuỗi.
  **So MÃ, không so cờ "đã gõ phím".** Cờ đó bật ở lần `onChange` đầu và không có đường
  tắt lại, nên người gõ rồi xoá về đúng như cũ sẽ bị dán nhãn "kết quả cũ" trong khi kết
  quả vẫn ĐÚNG. Luật ở `ketQuaLaCu` (`frontend/src/lib/run-freshness.ts`, hàm thuần — logic
  trong hook là logic không có test).
  **Xuất xứ phải CHỤP lúc gửi, không đọc lại `draft.code` trong callback:** gõ tiếp trong
  lúc worker đang chạy là chuyện thường, và lúc kết quả về thì `draft.code` đã là bản khác
  — ghi nó làm xuất xứ thì một kết quả CŨ lại được đóng dấu "của bản đang gõ", tức bug sống
  lại ở đúng ca người học sốt ruột nhất. `setRanCode(maDaGui)` đứng ngay cạnh
  `setResult(data)` trong `useLessonRun`.
  **Cổng `coKetQua` không phải phòng xa:** bấm Chạy rồi bấm Dừng thì `result` về null nhưng
  xuất xứ vẫn giữ mã lượt TRƯỚC — thiếu cổng thì một console RỖNG lại đeo băng "kết quả của
  bản code trước".
  **Băng chữ ở tương phản ĐẦY ĐỦ, phần làm mờ mới là lớp phụ.** Làm ngược (chỉ mờ, không
  chữ) thì với người dùng trình đọc màn hình không có gì xảy ra cả. `opacity` 0,62 kèm
  `saturate(.45)`: thứ nói dối to nhất ở đây là MÀU — chip xanh của lượt trước nằm ngay
  dưới một bản code chưa ai chạy — còn chữ thì vẫn phải đọc được, vì đối chiếu output cũ
  với code mới chính là việc họ đang làm.
  Ablate 11 mảnh (`run-stale.test.mjs`, 15 ca): so bằng cờ "đã gõ phím" → **3 đỏ**; chuẩn
  hoá khoảng trắng trước khi so → 2; chín mảnh còn lại mỗi mảnh 1 (bỏ cổng `coKetQua`,
  callback đọc `draft.code`, thôi trả `ranCode`, thôi truyền `resultStale`/`stale`, ghi lại
  chuỗi thay vì dùng hằng chung, bỏ lớp bọc mờ, bỏ `role="status"`, bỏ quy tắc CSS).
  **Phạm vi đã nói ra:** `DebugGame` cũng dùng `SandboxEditor` nhưng KHÔNG truyền `stale`
  (prop tuỳ chọn) — `gameRun` không giữ mã đã chạy, và khoá 172 bài không có game nào.

- **Chữ TRONG sơ đồ không phóng to được, và đó là lỗi VẬT LIỆU chứ không phải `font-size`.**
  Ba trên bốn người trả lời khảo sát ngày 29/10/2026 chọn *"Chữ và nhãn TRONG sơ đồ quá nhỏ,
  phải phóng to mới đọc được"*. Chữ đó nằm trong PNG 780×455: chữ của TRANG reflow, chữ
  trong ẢNH thì scale — trên màn 360px ảnh bị bóp 0,46× nên nhãn 10pt hiện ra 4–5px. Không
  quy tắc CSS nào với tới pixel trong ảnh, và **SVG chỉ chữa một nửa** (ở cỡ hiển thị mặc
  định nó có đúng cỡ chữ như PNG). Nay có loại khối đọc thứ SÁU — `diagram` — dựng sơ đồ
  bằng DOM: `<p>`/`<code>` thật, kế thừa `--edu-font` và cỡ chữ của trang, reflow, trình
  đọc màn hình đọc được, dịch được. Không thêm thư viện nào.
  **PHÉP THỬ, đúng một bài: PY05** (thứ tự phép tính) — hai cột `3*15-5 → 45-5 → 40` cạnh
  `3*(15-5) → 3*10 → 30`, cộng một hàng `/` so với `//`. Đo lại trước khi bỏ công cho cả bộ.
  **HÌNH TĨNH, KHÔNG animation — kết luận có bằng chứng, không phải để tiết kiệm công:**
  toàn bộ giá trị nằm ở việc SO HAI LÀN, mà so sánh cần cả hai cùng có mặt. Animation chạy
  lần lượt phá đúng cái nó định dạy (Tversky 2002: *"clever schematization of static
  diagrams may be just as effective as animation"*). Có ca test ghim chuyện này, vì "thêm
  một animation nhỏ cho sinh động" là việc rất dễ làm.
  **Dữ liệu nằm ở `SO_DO_DOC` trong `scripts/pe-da/build.py`, KHÔNG thành trường mới của
  `source/course.json`:** gói nguồn là của người soạn giáo trình và còn được giao lại nhiều
  lần nữa, còn một dict 20 dòng thì rút lại được trong một commit. Ngày bộ này lớn hơn chục
  bài thì chuyển sang gói nguồn, đừng nuôi bảng thành danh bạ.
  **Vì nó là chữ người viết đặt, nó TRÔI ĐƯỢC** — nguồn sửa `3 * 15 - 5` thành con số khác
  thì bài dạy một chuyện và sơ đồ dạy chuyện khác ngay cạnh nó, không exception nào ném.
  `kiem_so_do()` (check.py) đòi bước ĐẦU của mỗi làn là biểu thức có thật trong code bài và
  bước CUỐI có thật trong `expected`. Các bước GIỮA cố ý không bị đòi: đó chính là phần sơ
  đồ thêm vào.
  **Số làn phải CHẴN:** grid là `repeat(auto-fit, minmax(245px, 1fr))`, nên một làn lẻ đứng
  một mình ở hàng cuối là mất phép so sánh, tức mất đúng thứ duy nhất khối này mang lại.
  245px là SỐ ĐO (Chrome, sơ đồ PY05): dãy dài nhất rộng 212px + 29px padding/viền của
  làn. Thấp hơn thì hai cột vẫn dựng nhưng mỗi dãy gãy làm hai dòng — mất đúng cái nhịp
  nó bán. Đổi nội dung sơ đồ thì ĐO LẠI.
  **Và một khoá `SO_DO_DOC` gõ sai thì sơ đồ lặng lẽ không được phát:** build.py đếm lại và
  trả về 1 nếu số sơ đồ phát ra khác số khai — đúng họ lỗi "built but unreachable".
  **KHÔNG khai `font-family` cho phần chữ của sơ đồ** (ngoại lệ duy nhất: biểu thức Python
  dùng mono): mục đích của khối này là kế thừa font trang, ghi font ở đây là dựng lại cái
  tường nó ra đời để phá — và sẽ lệch ở lần đổi font sau (Poppins → Montserrat đã phải đi
  sáu chỗ). Cả ba chỗ có chữ (`title`, `label`, `note`) đi qua CÙNG `paragraphs`, tức cùng
  `withInlineCode` — chỗ nào dựng chuỗi trần là chỗ in ra nguyên hai dấu backtick.
  Ablate 12 mảnh (`read-diagram.test.mjs`, 12 ca): `SO_DO_DOC` rỗng → 1 đỏ ở đây **cộng
  2 đỏ ở `studio-lesson.test.mjs`** (đếm khối + "không khai loại build không phát"); gỡ
  nhánh `case 'diagram'` → 2 đỏ và typecheck đỏ; mười mảnh còn lại mỗi mảnh 1 (trong đó
  bỏ `max-width` của grid, tức bỏ trần hai cột).
  **Chưa tới người học cho tới khi nạp DB:** `scripts/pe-da/out/lessons.json` đã có sơ đồ,
  nhưng nội dung bài thì đọc từ DB — cần
  `npx ts-node scripts/update-lesson-content.ts --codes=PY05 --apply --backup=<file.json>`.

- **BẢNG TỪNG BƯỚC của màn đọc: vết TÍNH SẴN, và nó KHÔNG sinh được trong build.py.**
  Màn đọc hôm qua chỉ có khối code rồi một ô "KẾT QUẢ:" với toàn bộ đầu ra — không thấy
  được gì xảy ra ở giữa. Nay mỗi khối code đủ điều kiện mang thêm trường `trace`
  (`ReadBlock.trace` → `StepTrace.tsx`): nút "Xem từng bước" ẩn sẵn, bấm thì HỎI DỰ ĐOÁN
  trước, trả lời xong mới mở bảng.
  **VÌ SAO KHÔNG SINH TRONG `build.py`, dù `SO_DO_DOC` đã ở đó.** CI chạy
  `python scripts/pe-da/build.py` rồi ĐÒI bản dựng trùng TỪNG BYTE với bản đã commit, trên
  runner **Python 3.12 không có numpy/pandas/matplotlib** — mà 90/154 bài từ module 2 trở
  đi import chúng. Build mà tự chạy tracer thì máy người soạn ghi vết, CI bỏ qua, hai bản
  dựng khác nhau, CI đỏ mãi mà không ai sửa được. Thêm nữa `repr` đổi theo phiên bản
  Python, nên cả bài stdlib thuần cũng không chắc dựng giống nhau. Vết vì vậy sinh bằng
  `py scripts/pe-da/gen_traces.py` và COMMIT vào `scripts/pe-da/traces.json`; build chỉ
  ĐỌC. Đúng khuôn `chep_anh()` đã dùng cho 80 ảnh: gói nguồn chỉ có trên máy người soạn.
  **DÙNG LẠI tracer của `/ide`, không viết tracer thứ hai:** `gen_traces.py` dựng đúng file
  mà worker dựng (`scripts/tracer/pe_tracer.py` + `_pe_run(<mã đã nén>)`) rồi chạy bằng một
  tiến trình riêng — y hệt `pe_tracer_test.py`.
  **MỘT lần chạy MỖI BÀI, không mỗi khối.** Nguồn viết các đoạn để chạy NỐI TIẾP (đoạn 3
  dùng `df` của đoạn 1), nên trace riêng đoạn 3 là trace một chương trình chết ở NameError.
  Cả bài được nối bằng CHÍNH `noi_code()` rồi cắt theo khoảng dòng của từng đoạn và đánh số
  lại về 1. **Và phép cắt KHÔNG được chỉ lọc theo DÒNG:** bài định nghĩa hàm ở đoạn 1 rồi
  gọi ở đoạn 3 thì thân hàm chạy ở đoạn 3 nhưng số dòng vẫn thuộc đoạn 1 — lọc theo dòng là
  nhét mấy bước đó vào cuối bảng của đoạn 1 kèm tham số mà đoạn 1 chưa có biến nào mang.
  Bảng của đoạn j dừng ở lần đầu luồng chạy sang một đoạn SAU nó.
  **HAI con số của tracer phải đổi ở khâu build, và chỉ một trong hai:** `timeBudgetMs`
  4 000 được chọn để nhỏ hơn hạn 5 giây CỦA BÀI HỌC, mà ở build không có hạn nào như thế —
  để nguyên thì **44 khối** bị bỏ với `time-limit` và **15 khối** quá timeout, gần hết là
  bài matplotlib (riêng `import matplotlib.pyplot` đã vài giây và nó nằm TRONG mã người
  học). Nâng lên 60 000 ở khâu sinh. `maxSteps`/`maxBytes` thì GIỮ: chúng bó cái BẢNG.
  **`MPLBACKEND=Agg` là bắt buộc:** `code_hoc_vien()` trả bản `displayCode` có `plt.show()`,
  và trên máy người soạn matplotlib chọn backend Tk — `plt.show()` MỞ CỬA SỔ rồi CHẶN tới
  khi có người đóng. Đo được: 30 bài VZ mỗi bài treo tới hết timeout. Đây đúng là việc
  `studio-harness.py` làm cho đường trình duyệt.
  **CÂU DỰ ĐOÁN KHÔNG ĐƯỢC BỎ CHO GỌN — có bằng chứng.** Hundhausen 2002 tổng hợp 24 thực
  nghiệm CÓ ĐỐI CHỨNG: chỉ 46% cho kết quả có ý nghĩa, 42% KHÔNG, và Gurka lặp lại thí
  nghiệm nhưng BỎ điều kiện "dự đoán" thì lợi thế BIẾN MẤT. Brod 2021 nói ra cơ chế: đoán
  sai → ngạc nhiên → chú ý dồn vào đáp án đúng. Nên nút "Mở bảng" chỉ bật khi đã gõ câu trả
  lời (`disabled={!doan.trim()}` — một dòng, và là toàn bộ phần có bằng chứng của tính
  năng), và khâu sinh **BỎ QUA và ĐẾM** mọi khối không ra được câu hỏi nào bảng trả lời
  được, thay vì phát một cái bảng không ai phải đoán gì.
  **BỐN luật làm nên một câu dự đoán THẬT, và `kiem_vet()` của check.py bắt được cả bốn
  trên bản dựng thật — đây là số ĐÃ ĐO, không phải lý thuyết:**
  · đáp án không được có trong ô "Kết quả:" ngay phía trên (bản sinh đầu quên áp luật này
    cho câu `count`) → **3 lỗi**: PD29, VZ02, CT06 — vòng lặp chạy 3 lần và bài in ra một
    dòng có chữ số 3, nên đọc ô Kết quả là đoán trúng;
  · đáp án không được nằm nguyên văn trong CHÍNH ĐOẠN CODE khi biến chỉ gán một lần
    (EX02 `raw = "name,mark\nMai,8.5\nAn,7.0\n"`), và câu `count` chỉ được hỏi về một dòng
    THÂN vòng lặp — hỏi chính dòng `for` thì đáp án là n+1, còn hỏi một dòng có
    comprehension thì con số là chi tiết nội tuyến hoá của Python 3.12 (PEP 709): SY13
    `print([s["id"] for s in students])` ra "4 lần" → hai luật này **46 lỗi**;
  · đáp án phải GÕ LẠI ĐƯỢC — `ndarray: array([1, 2, 3])`, `<thư viện numpy>`,
    `property: <property object>`, hay 31 chữ số của `2 ** 100` thì không ai gõ, mà gõ lại
    chính là hành động cam kết cả bước này tồn tại để lấy → **9 lỗi**.
  **Hai thứ nữa mà `f_locals` mức module bịa ra, và cả hai đã cắn:** biến chạy của
  comprehension (`s` trong `[s["id"] for s in ranked]`) hiện ra LÚC comprehension chạy rồi
  biến mất, nên "sau khi chạy xong `s` bằng mấy" hỏi về một biến không còn tồn tại; và biến
  của ĐOẠN TRƯỚC trông như vừa đổi (SY13 hiện `credits = ndarray…` giữa hai dòng `print`
  của một đoạn không nhắc tới nó). Luật chữa: ứng viên phải CÒN trong locals ở bước cuối,
  và bảng của một đoạn chỉ hiện biến mà ĐOẠN ĐÓ nhắc tới.
  **Coverage là 56 vết / 356 khối đủ điều kiện**, 300 bỏ qua — và hình dạng của
  phần bỏ nói đúng một chuyện: **277 khối không ra được câu dự đoán nào đáng hỏi**, gần hết
  là bài pandas/numpy/matplotlib, vì ở đó mọi biến là đối tượng mờ (DataFrame, ndarray,
  Figure) và thứ duy nhất đọc được thì bài đã `print` ra sẵn. Nó khớp số đo đã có trong
  repo: tracer lọc theo `co_filename` nên mã dữ liệu chỉ 1,1×–1,3× — tức gần như KHÔNG sinh
  sự kiện nào, tức bảng chẳng có gì để hiện. Bảng từng bước là công cụ cho mã ĐIỀU KHIỂN
  LUỒNG (SY 28 · CT 9 · VZ 7 · EX 5 · GU 3 · PD 3 · RC 2), và nó tự dồn về đúng chỗ đó.
  **Đừng "nâng coverage" bằng cách nới luật:** mỗi lần nới là một cái bảng mà người học
  cuộn qua, và đó đúng là điều kiện mà Hundhausen đo được là KHÔNG có tác dụng.
  **Module 1 KHÔNG có bảng** (quyết định đã chốt): ở đó code còn là `print(2 + 3)`, bảng
  không nói thêm gì mà lại dạy người học bỏ qua cái nút đúng lúc nó chưa đáng bấm.
  **Cổng chống "built but unreachable" nằm ở `vet_cua_bai()` + `main()`:** vết sinh ở MỘT
  LẦN CHẠY KHÁC nên nó có thể cũ, mồ côi hoặc lệch chỉ số. build.py `return 1` khi số vết
  phát ra ≠ số khối đủ điều kiện trừ số bỏ qua, khi traces.json có mục cho bài không được
  có vết, và khi **`codeHash` lệch** — lệch nguy hiểm nhất, vì bảng vẫn mở ra, vẫn đẹp, và
  dạy một đoạn code không còn tồn tại (cùng họ "sơ đồ đã trôi khỏi bài"). Hash tính trên
  CHƯƠNG TRÌNH ĐÃ NỐI, không trên từng khối rời: sửa khối 1 làm vết của khối 3 sai.
  **MÀN ĐỌC KHÔNG CÓ Ô SOẠN MÃ** — khối `code` dựng `CodeBlock`, chỉ đọc. Nên phần "sửa
  code rồi chạy lại" KHÔNG áp dụng ở đây: chỗ đó là `/ide`, và nút "Thử ngay trong IDE"
  ngay trên nút này đã bàn giao đúng tiền tố mã sang đó. Dựng thêm một ô soạn mã ở màn đọc
  là dựng lại `/ide` trong một cái accordion.

- **CƠ CHẾ NẠP FILE DỮ LIỆU: `step_4.dataFiles`, cấp BÀI, chỉ TÊN — và NĂM chỗ phải đi
  cùng lúc.** Trước bản này không có đường nào để một file dữ liệu tới được Pyodide: không
  `FS.writeFile` ở worker nào, và 499 khối code đều tự dựng dữ liệu tại chỗ (`tempfile` 36 ·
  `StringIO` 19 · `open()` 18 · `read_csv` đúng **7**). Năm chỗ: `build.py` (bảng `KHOI_DU_LIEU`
  + cổng ở `main()`), `studio-lesson.schema.ts` (**cửa duy nhất vào DB**), hai worker,
  `check.py`, và `check-pyodide.mjs`.
  **Cấp BÀI chứ không cấp KHỐI, có lý do:** `_prepare_dir()` tạo MỘT thư mục rồi `chdir` cho
  cả lần chạy, mà ô "Chạy thử" nối mọi khối thành một chương trình — "file này chỉ có ở khối
  3" là lời hứa hệ tệp không giữ được.
  **Chỉ TÊN, không nội dung.** Nhúng `don_hang.csv` (1,29 MB) vào `content_json` như
  `step_4.files` là nhồi nó vào DB và bắt mọi lượt mở bài tải nó qua API. Worker tải theo tên
  rồi gộp vào CHÍNH tham số `files` của `_studio_main`, nên `studio-harness.py` **không phải
  sửa một dòng nào**.
  **KHÔNG gzip, và đã đo:** Next.js đã trả `Content-Encoding: gzip` — 185 075 byte thay cho
  1 289 915 (14,3%). Nén tay chỉ mua thêm một bản `.gz` thứ hai phải giữ đồng bộ.
  **Nhánh Node và nhánh trình duyệt là HAI, và đó là điều kiện để hàng rào sống.** Trình
  duyệt `fetch('/static/da-dulieu/<tên>')` cùng origin; Node `readFileSync`. Ba bộ chấm vẫn
  vá `globalThis.fetch` để từ chối mọi `http(s)://` — **không gỡ một dòng nào**. Kiểm lại:
  giấu `mon.csv` đi rồi `node scripts/pe-da/check-pyodide.mjs PD13` phải ĐỎ với "thiếu file
  dữ liệu". Đã thử: đỏ. Nếu nó XANH thì cơ chế đang lặng lẽ rơi về CDN.
  **Bài mẫu là PD13, không phải PD12** — PD12 hợp chủ đề hơn nhưng có BÀI TẬP ĐƯỢC CHẤM, nên
  `step_4` của nó là bài tập và mã bài đọc không còn ai bấm Chạy; khối dữ liệu ở đó lại thành
  một thứ không có đường tới người học.
  **`check-practice.mjs` nay nạp được, cổng cấm đã gỡ ở BA chỗ** (`build.py`, luật 8 của
  `check.py`, và một ca trong `data-files.test.mjs`). Cổng đó ra đời vì bộ chấm chưa làm
  được, nên nó mất lý do tồn tại đúng lúc bộ chấm xong — nhưng **gỡ nó mà không đặt gì vào
  chỗ nó đứng là mở cửa cho một bài tập không ai chấm**. Thay nó là PHA 3 ("cổng file dữ
  liệu"): với mỗi bài tập khai `dataFiles`, chạy một chương trình đọc từng file ở TẦM MODULE
  qua hai thứ tự khác nhau (để "trả hằng" không đạt cả hai); và pha 3 cũng ĐỎ khi chạy cả bộ
  mà KHÔNG bài tập nào khai `dataFiles` — gỡ cổng rồi không ai đi qua chỗ nó từng đứng thì
  nhánh mới lại là "dựng rồi không ai tới được".
  **Phải truyền `files` ở CẢ BA lời gọi `grade()`**: `_execute` gọi `_prepare_dir(files)` ở
  MỖI lần chạy lại, nên truyền một lần ở pha 1 là không đủ.
  **GIỚI HẠN ĐÃ ĐO, và nó quyết định sức nặng của bằng chứng:** bỏ `files` khỏi cả ba lời gọi
  thì pha 1 (415 ca) và pha 2 (556 biến thể) VẪN XANH, chỉ pha 3 đỏ với `FileNotFoundError`.
  Vì chưa bài tập nào THẬT SỰ đọc file — PD16 chỉ có file nằm sẵn trong thư mục chạy, còn ca
  chấm của nó đến từ `source/practice.json` và không đọc file. Ngày module thực hành có bài
  tập đọc file thật thì pha 1 sẽ tự đỏ và pha 3 thành lớp thứ hai. Đừng đọc "pha 3 xanh" là
  "cơ chế đã được chứng minh bằng một bài tập thật".
  **`check-pyodide.mjs` nay đọc BẢN DỰNG, không đọc `source/course.json`** — nếu không thì nó
  mù với mọi khối do build phát ra (dữ liệu, sơ đồ).

- **Luật 6 của cổng INSERT từng TỪ CHỐI OAN, và lối thoát duy nhất là bịa nội dung.**
  `planLessonInserts` đòi bài phải có `step_1.read` HOẶC `play`. Hai khoá đó đúng là thứ
  172 + 48 bài đang có nên nó trông đủ — nhưng `buildScreens()` dựng màn từ `step_1.memory`,
  `step_2.mcq`, `step_3.trace`, `step_4.tests` mà KHÔNG cần hai khoá ấy. Bài nhập từ tài liệu
  theo mẫu `## S1..## S4` rơi đúng vào khe đó: dựng đủ màn trong trình duyệt, mà cổng bảo
  "gói dựng dở". Khi một cổng sai, cách đi tiếp luôn trông hợp lý — ở đây là thêm một phần
  `## Đọc` cho qua cửa, tức bắt người soạn đổi NỘI DUNG để chiều một phép kiểm sai. **Sửa
  cổng, đừng sửa nội dung.**
  Luật 6 nay là `sinhDuocManNao()` — bản CHÉP điều kiện của `buildScreens`. Chép chứ không
  import được (một bên `src/` chạy Jest, một bên `frontend/src/` chạy `node --test`), nên nó
  SẼ TRÔI, và trôi im lặng theo đúng chiều nguy hiểm. `insert-gate-sync.test.mjs` đọc cả hai
  cây mã và bắt hai danh sách khoá phải khớp — cùng khuôn `tracer-web-sync.test.mjs`. Ca thứ
  hai của bộ đó kiểm chính phép quét tìm được khoá, vì regex trượt hết thì hai tập cùng RỖNG
  và ca thứ nhất vẫn XANH trong khi không còn chứng minh gì.
  Ablate: trả luật 6 về bản cũ → 1 đỏ ở `lesson-insert.spec.ts`; gỡ một nhánh của bản chép →
  1 đỏ ở đó **và** 1 đỏ ở `insert-gate-sync` kèm đúng tên khoá còn thiếu.

- **Đường nhập tài liệu đã bỏ nhánh AI, nhưng 7 biến `GEMINI_*` phải Ở LẠI.**
  `lesson-import.service.ts` không còn `parseWithGemini()`: file không khớp mẫu thì báo lỗi
  nói rõ sai ở đâu, không đoán. **Nhưng đừng dọn biến môi trường theo.** Có **7** biến
  `GEMINI_*` (không phải 4) và cả 7 đang được `ChatbotModule` đọc — module còn đăng ký ở
  `app.module.ts`. Gỡ chúng khỏi `env.validation.ts` là làm Joi TỪ CHỐI một `.env` production
  đang chạy, và `config.get<number>('GEMINI_TIMEOUT_MS')` quay lại dạng CHUỖI — đúng sự cố
  13/10/2026, chỉ theo chiều ngược.
  **PDF: thụt lề DỰNG LẠI từ toạ độ chữ, không đọc văn bản phẳng.** `pdf-parse` trả văn bản
  phẳng và thụt lề mất sạch — thân hàm Python về cột 0. `validateStudioLesson` KHÔNG đọc nội
  dung mã nên không chặn được: lọt là bài vào DB rồi ném `IndentationError` ở tay học viên,
  một lỗi không ai truy ngược về PDF. Đo trên file mẫu: 1 294 mẩu chữ, 1 901 phép đo bề rộng
  ký tự, **100,0% ra 4,951 pt** ⇒ lưới chữ đều bề, nên `cột = (x − lề trái) / bề rộng`. Dựng
  lại trùng TỪNG BYTE **110/114 dòng** so với bản `.md` gốc.
  **Đo không ra lưới đều bề thì QUAY VỀ đường phẳng, không đoán** (ngưỡng: ≥90% phép đo trùng
  trong sai số 2%, ≥20 phép đo) — và `kiemThutLe()` ở lại làm lưới an toàn, **đừng nới nó cho
  một file qua được**.
  **Cắt dòng theo bề rộng trang thì KHÔNG chữa được**, kể cả bằng toạ độ: dòng tiếp theo của
  một dòng bị cắt nằm ở đúng cột 0 như một dòng mới thật. `f"{x!r}"` thành `f"`. Vì vậy mọi
  nguồn PDF vẫn kèm một cảnh báo bắt đọc lại bản xem trước.
  **`pdf-parse` KHÔNG chạy được dưới Jest** (`pdfjs-dist` `import()` động, vm của Jest ném
  `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG`). Cách chia vai: phần đọc file chạy thật qua
  `scripts/import-lesson.ts`, còn toàn bộ phần CÓ THỂ SAI là hàm thuần và Jest chấm nó bằng
  toạ độ THẬT chụp từ PDF (`__fixtures__/pdf-mau-chu.json`). Chụp lại bằng cờ `--chup`, đừng
  gõ tay — và có một ca bắt bản chụp phải BẰNG thứ phép dựng hôm nay sinh ra, vì không có nó
  thì sửa phép bóc mà quên chụp lại vẫn xanh trên dữ liệu cũ.

- **32 bài đã đổi miền sang quán cà phê, và `topics` CỐ Ý không đổi theo.** SY25–SY28 và GU12
  đổi từ "quản lý sinh viên, môn học và điểm" sang "quản lý món, nguyên liệu và định lượng"
  (chủ dự án cho phép 29/10); NP06/NP11/NP23 từ điểm kiểm tra sang số cốc; NP13/NP14 từ lượng
  mưa sang lượng sữa; PD08/VZ28/RD05 từ nhiệt độ sang doanh thu/số cốc. `topics`, `sourceRefs`,
  `sourcePages` vẫn trỏ về slide gốc — đó là lý lịch ĐÚNG, không phải chú thích lỗi thời; đã
  kiểm `topics` không được `build.py` hay `check.py` đọc một lần nào. Lý do ghi ở
  `scripts/pe-da/CAU-CHUYEN.md`.
  **PD16 đã đổi từ bảng KHÁCH sang bảng MÓN.** Bài dạy `merge` bằng một bảng khách
  (`customer_id`, `name`), mà lược đồ CỐ Ý không có bảng khách — dữ liệu khách là dữ liệu cá
  nhân, cùng lý lẽ đã buộc bỏ cột thẻ khỏi bộ CC0 (xem `NOTICE.md`). Tiêu đề và cả ba ví dụ
  hứa một bảng mà không bộ dữ liệu nào trong khoá có. Cấu trúc ba phép join giữ nguyên nên
  bài vẫn dạy đúng left/inner/outer; `expected` ĐO LẠI bằng `check-pyodide.mjs`, không gõ
  tay. Đổi tiêu đề thì `check.py` đỏ cho tới khi chạy `sync_curricula.py` — hai nguồn danh
  sách bài, xem bẫy riêng.
  **Còn hai chỗ nói tiếng cũ:** ba ảnh `VZ28-*.png` mang nhãn `Temperature (arbitrary units)`
  TRONG PIXEL (ảnh xuất sẵn trong gói nguồn, `chep_anh()` chỉ chép — sửa phải xuất lại từ gói
  nguồn, mà gói đó nằm ngoài repo), và `source/practice.json` vẫn dùng `region`/`qty`/`E`/`W`.

- **MỘT KÝ TỰ VÔ HÌNH CHẶN ĐƯỢC CẢ KHOÁ: Postgres `jsonb` không lưu được U+0000.**
  Sự cố 30/10/2026: nạp 172 bài, **122 câu UPDATE chạy xong**, câu thứ 123 ném
  `22P05 unsupported Unicode escape sequence` và transaction rollback ⇒ KHÔNG bài nào
  được ghi. Thủ phạm là một **KHOÁ** JSON của SY20: `students.csv\x00.exe` trong ca chấm
  "tên kèm byte null bị zipfile cắt khi ghi". Người chạy thử ba lần, mỗi lần nhận một
  đối tượng Prisma không nói tên bài, và file sao lưu thì vẫn ghi ra đầy đủ nên nhìn vào
  thư mục backup lại tưởng đã nạp.
  **DUYỆT CẢ KHOÁ, KHÔNG CHỈ GIÁ TRỊ.** Bản quét đầu của tôi chỉ duyệt giá trị chuỗi và
  báo "0 chỗ" trên đúng cái file đang hỏng — khoá của dict cũng là chuỗi trong JSON và
  Postgres cũng từ chối ở đó. Surrogate lẻ cũng vậy; cặp surrogate hợp lệ (emoji) thì KHÔNG
  được chặn nhầm.
  **HAI LỚP, cố ý:** `kiem_ky_tu_db()` trong `check.py` bắt ở khâu dựng (người soạn thấy
  sớm), và `validateStudioLesson` bắt ở **CỬA DUY NHẤT vào DB** — cả đường cập nhật lẫn
  đường tạo mới đều qua nó, nên một chỗ là đủ và không có chỗ thứ hai để trôi lệch.
  **Ca đó KHÔNG xoá được, và cũng không viết lại được bằng tên khác.** Đã đo trong chính
  Pyodide của repo: `/abs/x.txt`, `a//b.txt`, `dir/../x.txt`, `C:\\x.txt`, dấu cách
  thừa, tổ hợp Unicode, tên rỗng — **12 tên đều đi qua zipfile NGUYÊN VẸN**, vì dưới
  Emscripten `os.sep == "/"` nên nhánh đổi dấu phân cách không chạy và `writestr` không
  cắt dấu `/` đầu như `write`. Cắt ở NUL là phép biến đổi DUY NHẤT, tức thứ duy nhất làm
  `return data` trượt ở một bài round-trip. Nên ca đó chuyển sang **hợp đồng BIỂU THỨC**:
  NUL nằm trong MÃ NGUỒN Python (`\x00`, bốn ký tự thường) và `eval` dựng nó lúc chạy.
  **BA chỗ cùng vứt `call`/`expect` đi, và mỗi chỗ làm hỏng theo kiểu riêng:**
  · `build.py` chuẩn hoá mọi ca về `{name,input,expected}` ⇒ thay đổi ở nguồn KHÔNG BAO GIỜ
    tới bản dựng (sửa nguồn xong chạy bộ chấm vẫn thấy y nguyên — mất khá lâu mới nhận ra);
  · `check-practice.mjs` dựng lại ca thành `input: null` ⇒ chương trình chạy lại với
    `solve(None)`: lời giải ĐÚNG ném AttributeError, còn `return data` trả None và khớp
    `expected: null` nên ĐƯỢC CHO ĐẠT. Bộ chấm đảo ngược đúng/sai;
  · `studio-harness.py` thì ĐÃ phân nhánh đúng theo trường có mặt từ đầu — khả năng có
    sẵn, thiếu là đường đi tới nó. Đúng họ "dựng xong mà không có đường tới".
  **Luật "cấm trộn hai hợp đồng" đã THU HẸP về đúng lý do của nó, ở BỐN chỗ.** Tác hại
  thật là: `contract` (mode/inputVariable/resultVariable/returnType) chỉ áp cho ca DỮ
  LIỆU, nên ca biểu thức lặng lẽ bỏ qua nó. Bài KHÔNG khai `contract` thì không có gì để
  bỏ qua — **81/124 bài tập** ở diện đó. Luật cũ cấm MỌI bài trộn, tức rộng hơn chính lý
  do của nó, và nó chặn đúng cách duy nhất cứu được ca này. Bốn chỗ: `kiem_bai_tap()`
  (check.py), `studio-lesson.schema.ts` (luật này là THEO TỪNG CA — một ca có cả hai —
  nên không đụng), `practice-contract.test.mjs`, `studio-lesson.test.mjs`. Hai bộ test
  giữ TRẦN cho ngoại lệ (danh sách tên bài, và "không quá 2 bài trộn"): nới luật mà không
  đặt trần là mở cửa cho "bài nào khó thì viết một ca biểu thức cho xong".
  **Số không đổi sau cả đợt:** 415 ca chấm, 556 biến thể sai đều trượt — tấm chắn chống
  lời giải tầm thường của SY20 còn nguyên (`return data` đạt 3/4, trượt đúng ca NUL).
  Ablate: bỏ `kiemKyTuDb` khỏi schema → **3 ca đỏ**; bỏ `kiem_ky_tu_db` khỏi check.py →
  1 lỗi (bắt đúng SY20, đúng đường dẫn tới khoá).
  **Và đường nạp nay in tiến độ TỪNG BÀI kèm mốc ms**, rồi khi hỏng thì nói "0 câu nào
  chạy ⇒ hỏng ở bước lấy kết nối" hay "có câu đã chạy ⇒ hỏng giữa chừng". Chính dòng
  `[122/172] SY19 ghi xong` là thứ chỉ thẳng ra bài 123.

- **CẢ HỆ THỐNG QUIZ CHẤM Ở MÁY CHỦ từng không có đường tới người học — nay có MỘT.**
  `src/quizzes/quizzes.controller.ts` có 11 route đang chạy và `grep` trên `frontend/src`
  ra **0 lời gọi**. Ba file JS di sản Django (`edu-review-quiz.js`, `review_quiz.js`,
  `edu-dashboard.js`) biết gọi chúng, nhưng KHÔNG page.tsx nào nạp chúng. Đây là lần thứ
  TÁM cùng hình dạng lỗi, và đắt nhất: đó là **đường chấm DUY NHẤT client không giả mạo
  được** (`submitQuiz` chấm theo SNAPSHOT trong DB, `stripAnswers` không gửi
  `correct`/`explanation` ra ngoài, mỗi đề nộp được một lần) — và kho 516 câu đã được đổ
  đầy ở một đợt trước mà không ai kiểm xem có cửa nào không.
  **Đường đã nối: màn TỔNG KẾT, chỉ khi `completed === true`.** Không đặt ở trang khoá
  học: `apiFetch` gặp 401 là TỰ TẠO tài khoản khách, nên một nút gọi API trên trang công
  khai là mở đường cho bot. Và `buildQuestionPool` chỉ gom câu từ bài đã `completed`, nên
  hỏi sớm hơn là đếm thiếu đúng bài họ vừa học xong. Ô nằm **TRƯỚC** nút "Hoàn thành":
  đặt sau thì muốn tới phải cuộn qua đúng cái nút đưa mình ra khỏi bài.
  **Route `GET courses/:id/quiz/status` là route MỚI, và nó không né được.** Yêu cầu "nói
  rõ còn phải xong mấy BÀI" không đi qua được lỗi 400, vì `AllExceptionsFilter` chỉ giữ
  `message` và BỎ mọi field kèm theo — nhồi số vào payload lỗi là hỏng im lặng.
  **`MIN_POOL` đếm CÂU, người học đếm BÀI.** 5 câu ÷ 3 câu mỗi bài = 2 bài. Câu hiển thị
  phải nói cả hai đơn vị, và số bài tính từ dữ liệu thật của chính người học.
  **8/11 route vẫn CHƯA có đường tới**, và hai hệ quả phải biết: `GET quizzes/:id` không
  được dùng ⇒ tải lại trang giữa chừng là MẤT đề (hàng `quizzes` kẹt ở `generated` vĩnh
  viễn); và mỗi lần nộp ở đây tạo một `review_quiz_results`, nên nó SẼ chặn đề ôn hằng
  ngày trong ngày đó nếu sau này có giao diện cho route ấy.
  **Chưa ai đi đường này với DB THẬT** — agent chắn `window.fetch` để xem giao diện. Hợp
  đồng với dữ liệu thật chỉ được chứng minh bằng test backend chạy trên bản dựng pe-da.

- **MODULE 11 là module đầu tiên có bài tập THẬT SỰ ĐỌC FILE, và đó là bằng chứng thiếu.**
  7 bài (TH01–TH07, ô 173–179) trên `coffee-sales-cc0.csv` — 2 623 hàng, CC0 1.0, dữ liệu
  THẬT của một quán khác. Trước nó, bỏ `files` khỏi cả ba lời gọi `grade()` thì pha 1 và
  pha 2 VẪN XANH; sau nó, **18 ca TRƯỢT** (6 bài × 3 ca, `FileNotFoundError`). Cơ chế
  `step_4.dataFiles` từ nay có hai lớp canh chứ không chỉ pha 3 tự dựng.
  **`don_vi` là một KHOÁ của ca chấm, không phải một câu dặn.** `NOTICE.md` ghi đơn vị
  tiền của cột `money` KHÔNG XÁC ĐỊNH, và PD32 dạy "khi giao báo cáo, ghi đơn vị tiền" —
  TH05 bắt lời giải trả hẳn `don_vi = "không xác định"`. Đó là cách duy nhất biến lời dặn
  thành thứ máy chấm được. Đừng quy đổi sang VNĐ ở bất kỳ bài nào: quy đổi từ một đơn vị
  không biết là bịa.
  **TH03 chấm đúng chỗ dữ liệu thật có TIE** (Espresso 11h và 12h cùng 13 lượt), nên hợp
  đồng trả DANH SÁCH giờ — một lời giải dùng `idxmax` trượt 2/3 ca.
  **Mỗi bài ĐÚNG MỘT màn đọc**, và đó là quyết định kỹ thuật: thêm khối code thứ hai vào
  `reading` là bắt chạy `gen_traces.py` (~20 phút, cần numpy/pandas/matplotlib trên máy,
  không chạy được trên CI).
  **`sync_curricula.py` có `if len(bai) != 172` GHI CỨNG** và từ chối với câu "bản dựng
  thiếu" — nay so với số bài của `source/course.json`. Cùng họ với `ADVANCED_LESSON_MIN`
  dưới đây: một hằng ghi cứng số bài hỏng theo chiều CHẶN HẾT.
  **Ngưỡng đã ghi vào `build.py` và `SCHEMA.md`:** 9 mục là chỗ `KHOI_DU_LIEU` bắt đầu
  thành danh bạ. Module dùng dữ liệu thật tiếp theo thì chuyển khai báo sang gói nguồn.

- **Thêm một module làm ĐỎ 14 ca ở 6 file, và cả 14 đều là con số ghi cứng.**
  Backend: `ADVANCED_LESSON_TOTAL = 172` trong `lesson-content-update.ts` — nó từng là 48
  (pe-v4), và mỗi lần khoá đổi số bài mà quên sửa thì `selectLessons()` từ chối MỌI gói,
  tức **mất hẳn đường nạp an toàn**. Lần thứ BA này Jest bắt được; hai lần trước thì
  không. Nay là `ADVANCED_LESSON_MIN` — SÀN, CHỈ ĐƯỢC NÂNG: phép kiểm `sort_order === i+1`
  ngay dưới đã đòi dãy liên tục từ 1, nên con số này chỉ còn bắt phần đuôi bị cắt.
  `quizzes.service.spec.ts` thì so với `PE_DA.lessons.length` thay vì 172.
  **Và `lesson-insert.spec.ts` mượn mã TH01/TH02 làm bài-mới-giả — module 11 lấy đúng hai
  mã đó.** Luật "mã đã có trong DB" bắn đúng, cả bộ đỏ. Nay mã và ô suy từ gói (`MA_MOI`
  tiền tố `ZZ`, `O_MOI` = max + 1). Một ca test mượn mã trông-như-chưa-ai-dùng là mìn hẹn
  giờ.
  Frontend: `catalog.ts` (172 → 179, "~39 giờ" → "~41 giờ" — ca test cho lệch tối đa 1
  giờ nên giữ 39 là TRƯỢT), `catalog-duration`, `mcq-code` (516 → 537, 214 → 219),
  `practice-contract` (124 → 130, 415 → 433), `studio-lesson` (172 → 179, và bảng đếm
  khối `paragraph` 775 → 811 · `code` 501 → 508 · `table` 1 → 2).

- **508/508 khối code ở màn đọc đều IN SẴN đáp án ngay dưới — nay 262 khối hỏi trước.**
  Đo trên bản dựng 179 bài: 508 khối `code` ở màn đọc, **cả 508 đều có `expected`**, và
  chỉ 56 có bảng từng bước ⇒ **4/5 khối code của khoá không đòi người học nghĩ gì**. Người
  thử 1/11/2026 nói *"nên đặt trọng tâm vào practice"* kèm ảnh một màn ĐỌC dày chữ — nhưng
  số đo nói ngược với cách đọc hiển nhiên: luyện tập ĐÃ là khối lớn nhất (669 màn = 31%,
  hơn cả 565 màn đọc). Thiếu không phải khối lượng mà là **lời đòi**.
  Cùng bằng chứng đã dùng cho `StepTrace` và nút "Xem đáp án" của `PracticeScreen`:
  Hundhausen 2002 — Gurka lặp lại thí nghiệm nhưng BỎ điều kiện "dự đoán trước" thì lợi
  thế BIẾN MẤT; Brod 2021 nói ra cơ chế (đoán sai → ngạc nhiên → chú ý dồn vào đáp án
  đúng). Nên phần có bằng chứng của tính năng này gọn vào `disabled={!doan.trim()}`.
  **Luật chọn khối đặt ở FRONTEND, và đó KHÔNG mâu thuẫn với cờ `tryIt`.** `doanDuocOutput`
  (`lib/studio-lesson.ts`, hàm thuần) đọc được HOÀN TOÀN từ hình dạng `expected` + chữ
  trong `code`. Cờ `tryIt` thì phải ở build vì ở đó build biết thứ frontend không biết
  (thiếu wheel, `engine="openpyxl"`, `sys.executable`). **Đừng suy từ cái này sang cái kia.**
  Và vì luật ở frontend nên **KHÔNG CẦN NẠP DB** — đó là lý do mục này đi trước `task.io`
  trong hàng đợi.
  **NĂM phép loại, mỗi phép một lý do riêng** (số đã đo ở trần đang dùng): đã có `trace`
  (56 — hỏi hai câu trên cùng một khối là ma sát không mua gì) · code gọi thư viện vẽ hình
  (87, trong đó 80 có khối `figure` ngay sau — **phép loại đọc CODE chứ không đọc "có
  figure phía sau"**, vì 7 khối dựng Figure mà bài không xuất ảnh; VZ01 có
  `expected: "36"` cho một đoạn vẽ cả một hình, hỏi ở đó là hỏi về phần phụ) · quá trần ·
  đáp án nằm NGUYÊN VĂN trong chính đoạn code (35 — `print("Xin chào")` thì cổng chỉ bắt
  chép lại một chuỗi đang nhìn; cùng luật `gen_traces.py` đã phải đặt).
  **Trần 2 dòng / 40 ký tự CHỈ ĐƯỢC HẠ.** Đã đo cả ba bậc: ≤1/≤24 → 99 khối/58 bài ·
  **≤2/≤40 → 262 khối/127 bài** · ≤3/≤80 → 322/137. Ô gõ là MỘT dòng và `khopDapAn` bỏ hết
  khoảng trắng nên hai dòng gõ liền vẫn khớp, nhưng từ 3 dòng trở lên "đoán output" thành
  "chép lại một đoạn", tức người đoán ĐÚNG vẫn hay nhận "chưa khớp" vì thiếu một dấu.
  **Ô "Kết quả:" MỞ RA dù đoán đúng hay sai** — giấu output của người đoán sai là lấy đi
  đúng thứ họ cần nhất lúc đó. Đây là bước CAM KẾT, không phải bài thi.
  **Và verdict phải NÓI RA giới hạn của phép so:** `khopDapAn` chỉ bỏ khoảng trắng, KHÔNG
  bỏ dấu nháy hay dấu ngoặc (cố ý — `2` và `'2'` là hai giá trị khác nhau, phân biệt được
  chúng là thứ giáo trình này dạy), nên `[ 6  8 10]` đòi đúng ngoặc và người đoán đúng ý mà
  viết `6 8 10` vẫn nhận "chưa khớp". Vì vậy chữ là **"chưa khớp từng ký tự"**, không phải
  "sai", và câu sau nói thẳng điều đó.
  **`readGuess` phải ở trong NHÁP, không trong state component như `daNop` của `StepTrace`:**
  màn đọc là màn người học đi qua lại nhiều lần (nút "← Quay lại"), bắt đoán LẠI cùng một
  câu là ma sát không mua gì — lần đó họ đã biết đáp án. Nhưng **MỘT trường, không hai**:
  chữ ĐANG GÕ mà chưa nộp để trong state; thêm trường thứ hai cho nó là thêm một thứ phải
  khớp, và nó sẽ lệch.
  **Khoá nháp mang CẢ chỉ số màn** (`"<màn>-<khối>"`): `i` một mình trùng nhau giữa các màn
  đọc của cùng một bài, nên đoán ở màn 1 sẽ mở sẵn đáp án của khối cùng vị trí ở màn 2.
  **KHÔNG animation lúc mở đáp án** — cùng kết luận đã ghim cho khối `diagram` (Tversky
  2002): giá trị nằm ở việc SO hai thứ cạnh nhau, mà so sánh cần cả hai cùng có mặt. Ô
  "Kết quả:" dùng lại NGUYÊN class `readExpected`, nên nó hiện ra giống hệt khối không cổng.
  `read-guess.test.mjs` (16 ca) — và các hàng rào của nó là **SÀN, không phải con số đúng**
  (`CODE.length === 508`, `bai.size >= 110`): ghim con số chính xác thì thêm một module là
  đỏ oan, đúng bệnh 14 ca ghi cứng ở bẫy trên.

- **Tải lại trang giữa lúc làm đề ôn là MẤT ĐỀ VĨNH VIỄN — đã sửa, lần thứ CHÍN.**
  `quiz_id` chỉ sống trong state React, nên một lần F5 làm hàng `quizzes` kẹt ở `generated`
  MÃI MÃI (`submitQuiz` đòi đúng id đó) và người học chỉ còn đường phát một đề khác. Route
  `GET quizzes/:id` đã tồn tại và trả đúng đề đã `stripAnswers`, mà `grep` trên
  `frontend/src` ra **0 lời gọi** — đúng hình dạng "dựng xong mà không có đường tới", lần
  thứ chín. Nay `ReviewQuiz` gọi nó TRONG CÙNG `Promise.all` với `status`.
  **Cất ở `localStorage` theo KHOÁ HỌC, không trong nháp BÀI.** Nháp có khoá
  `…:<khoá>:<bài>`, còn đề ôn rút câu từ MỌI bài đã hoàn thành và ô đề ôn mount ở màn tổng
  kết của BẤT KỲ bài nào — cất vào nháp bài 12 thì làm xong bài 13 là màn tổng kết bài 13
  phát một đề THỨ HAI, và một trong hai chắc chắn kẹt lại mãi.
  **Khoá KHÔNG mang `userId`, và đó là an toàn:** phép chặn theo chủ sở hữu ở MÁY CHỦ —
  `getQuiz` trả **404** cho quiz người khác (không 403, để không tiết lộ nó tồn tại). Nên
  một id sót lại của tài khoản khách cũ chỉ ra 404 và ô này xoá nó đi.
  **"ĐÃ NỘP" KHÁC "ĐANG LÀM", và đọc từ máy chủ.** Nộp lần hai là 409 (compare-and-set
  `generated → submitted`), nên khôi phục một đề ĐÃ NỘP thành "đang làm" là mời người học
  chọn lại đủ 10 câu rồi nhận một câu lỗi. `docDeKhoiPhuc` không bao giờ trả nhánh `dangLam`
  cho đề `submitted`, kể cả khi response có kèm `questions`.
  **Quá `HAN_GIU_DE_MS` (7 ngày) thì bỏ IM LẶNG** — người học không nhớ mình có đề mở dở
  nên một câu nói về nó chỉ gây hoang mang. Hạn tính từ lúc PHÁT đề, không từ lần bấm cuối:
  nó bó TUỔI của đề (pool lớn dần theo số bài xong) chứ không bó độ rảnh của người học.
  `review-quiz.test.mjs` 21 → 33 ca.
  **8/11 route của `quizzes.controller.ts` vẫn CHƯA có đường tới.**

- **130 bài có ca chấm, 0 bài có một VÍ DỤ ĐÃ CHẠY — nay cả 130 đều có.**
  `SandboxScreen.tsx` dựng `<dl className={c.io}>` từ `step_4.task.io` và **0/130 bài phát
  ra khoá đó**: renderer dựng sẵn, không ai đi qua. Lần thứ MƯỜI của hình dạng lỗi này.
  Nay `vi_du_io()` trong build.py sinh ô ví dụ từ **ca chấm ĐẦU TIÊN**: 130/130 bài, 0 bị bỏ.
  **LÝ LẼ ĐẦU CỦA TÔI SAI, VÀ ĐÂY LÀ SỐ ĐÃ ĐO.** Tôi viết commit với câu "SÁU tên khoá mà
  không câu văn nào nói ra hết" (lấy PD01 làm ví dụ) rồi mới đi đo: **80 bài có `input` dạng
  dict, 77 bài ĐÃ nói đủ mọi tên khoá ngay trong `task.body`**. Chỉ 3 bài thiếu (PY12,
  SY18, SY20) và ở cả ba thì "khoá" là TÊN FILE, tức dữ liệu chứ không phải lược đồ. Đề của
  PD01 nói nguyên văn *"data gồm values, labels và pick … trả dictionary có selected
  (số vé của nhãn pick), total (tổng vé), count (số ca)"* — đủ sáu tên.
  **Vậy ô này mua được gì, nói cho đúng:** một VÍ DỤ ĐÃ CHẠY. Văn xuôi nói TÊN khoá nhưng
  không nói KIỂU, không nói độ lồng, và không nói ra một cặp vào→ra cụ thể để đối chiếu —
  `{'values': [7, 12, 5], …}` cho biết `values` là list số nguyên song song với `labels`,
  còn `{'selected': 5, 'total': 24, 'count': 3}` cho biết `total` là TỔNG chứ không phải số
  phần tử. Với 50 bài mà `input` KHÔNG phải dict (list/chuỗi/số) thì nó nói thẳng ra kiểu.
  Đó là giá trị thật, nhỏ hơn câu tôi viết lúc đầu — đừng chép lại câu cũ.
  **`repr` CỦA PYTHON, KHÔNG `json.dumps`.** Hai thứ khác nhau ở đúng chỗ người học sẽ gõ
  lại: JSON viết `true/false/null` và bắt buộc nháy kép. Dán một giá trị JSON vào ô đề của
  bài Python là dạy sai cú pháp ngay trong đề bài. Và vì harness nạp ca chấm từ JSON rồi
  truyền thẳng vào namespace, `repr` của giá trị ĐÃ NẠP chính là thứ `print(data)` in ra —
  không phải một bản mô tả gần đúng. Có ca test quét cả 260 giá trị tìm ba từ khoá JSON.
  **NHÃN LẤY TỪ HỢP ĐỒNG.** Bài `mode: "script"` (12 bài) thì người học phải ĐỌC một biến và
  GÁN một biến, nên nhãn là chính tên hai biến đó (`raw =` / `total =`, đo được 6 tên khác
  nhau). Nhãn "Đầu vào"/"Kết quả" bắt họ tra lại đề để biết gán vào đâu — đúng việc ô này ra
  đời để khỏi phải làm. `kiem_vi_du_io` đối chiếu nhãn với `contract.inputVariable`.
  **GIÁ PHẢI TRẢ, CÓ CHỦ ĐÍCH, VÀ NÓ ĐÃ ĐƯỢC CANH SẴN:** ô này công bố luôn `expected` của
  ca 1, nên `return <hằng của ca 1>` đạt đúng 1 ca. Đó KHÔNG phải lỗ mới mở — `traHang()` ở
  pha 2 của `check-practice.mjs` đã sinh đúng biến thể ấy từ trước và đòi nó TRƯỢT mọi ca có
  `expected` khác. Đã đo: **0/130 bài có mọi ca cùng một `expected`** (89 bài 3 ca, 39 bài
  4 ca, 2 bài 5 ca), nên hằng của ca 1 luôn trượt ít nhất 2 ca. Người học chưa viết gì vẫn
  thấy 1 ca xanh, đúng như file này đã ghi nhận cho khung trống.
  **Ô ví dụ là chữ sinh ra từ dữ liệu, nên nó TRÔI ĐƯỢC** — cùng họ với "sơ đồ đã trôi khỏi
  bài" và `codeHash` của bảng từng bước. Hình dạng hỏng: nguồn đổi ca chấm 1 mà ô ví dụ giữ
  giá trị cũ, và người học viết code theo một đầu vào bộ chấm không bao giờ truyền; không
  exception nào ném, bảng ca chấm chỉ nói "Chưa đúng". `kiem_vi_du_io()` so `value` với
  `repr` của CHÍNH ca chấm trong bản dựng.
  **NHÃN PHẢI DUY NHẤT, và lý do là React:** renderer dùng `row.label` làm key, nên hai nhãn
  giống nhau là một hàng biến mất lặng lẽ. Canh ở CẢ BA chỗ (build, check.py, schema).
  **BA CHỖ, và ablate cho thấy vì sao phải cả ba.** Gỡ `vi_du_io` ra: build chỉ in một dòng
  LƯU Ý rồi **exit 0**, `check.py` **im lặng hoàn toàn** (luật của nó mở đầu bằng "không có
  io thì bỏ qua"), và chỉ bộ test frontend đỏ. Một cổng in lưu ý rồi đi tiếp không phải cổng,
  nó là chú thích. Nên `vi_du_io` nay trả **(hàng, LÝ DO)** — đúng khuôn `bai_tap_cua` đã
  dùng trong cùng file — và `main()` `return 1` khi một bài thiếu ô ví dụ mà KHÔNG nói được
  vì sao. Hai bên của cổng đều đã đo: ablate hàm → build exit **1**; hạ `IO_MAX_KY_TU` xuống
  20 → 100 bài bỏ kèm lý do, build exit **0**.
  `_ly_do_io` là chỉ dấu của khâu dựng, KHÔNG phải nội dung bài — `main()` bóc nó ra trước
  khi ghi, và có phép đếm xác nhận 0 lần sót trong `out/lessons.json`.
  **Trần `IO_MAX_KY_TU = 320` hôm nay KHÔNG loại bài nào** (dài nhất là PD32, 280 ký tự —
  ba đơn hàng lồng trong một bảng tra, và đó đúng là bài khó đoán nhất nên bỏ nó là bỏ sai
  chỗ). Vậy nó canh gì: `.io code` có `overflow-wrap: anywhere` nên giá trị dài chỉ NGẮT
  DÒNG, không tràn ngang — tức một fixture 5 000 ký tự không làm vỡ layout, nó chỉ đẩy ô
  soạn mã xuống dưới ba màn cuộn, và đó là kiểu hỏng không ai báo.
  **`.io dd` nới 12px → 13px, và đây KHÔNG phải "nới tràn mọi cỡ nhỏ".** Khối này rỗng ở cả
  130 bài từ đầu, nên cỡ chữ của nó chưa bao giờ được xem cùng nội dung thật — mà nội dung
  thật là một dict lồng 280 ký tự phải đọc đúng từng tên khoá. Đó là NỘI DUNG. `dt` giữ 12px
  vì nó là nhãn, đúng luật đã ghi ở bẫy "chữ quá nhỏ".
  **Ablate:** đổi một `value` → 1 lỗi check.py nói rõ đã trôi · nhãn trùng → 1 · hàng thiếu
  `value` → 1 · còn 1 hàng → 1 · bỏ luật ở schema → **4 ca Jest đỏ** · gỡ `vi_du_io` →
  2 ca frontend đỏ + build exit 1.
  **CHƯA TỚI NGƯỜI HỌC cho tới khi nạp DB** — nội dung bài đọc từ DB, không từ `out/`.
  `--all --offline` đã sạch: 179 bài, 0 từ chối.

- **BA bài có màn ĐỌC ở quán cà phê nhưng ĐỀ BÀI TẬP ở miền cũ — ĐÃ sửa, 0 bài còn lệch.**
  Nhìn thấy khi xem ô ví dụ mới trên production: PD01 mở đầu bằng *"Một quán cà phê ghi số
  cốc bán được trong ba ngày"* rồi đề bài tập ngay dưới nói *"Một rạp ghi số vé theo ca"*.
  Hai miền trong một bài, cách nhau vài màn. Đo được đúng **3 bài** — PD01 (rạp/vé), NP13
  và NP14 (nhiệt độ, trong khi màn đọc của chúng đã đổi sang lượng sữa).
  **KHÔNG phải nguyên nhân mới:** mục bẫy ở trên đã ghi `source/practice.json` vẫn dùng
  `region`/`qty`/`E`/`W` — bài TẬP đến từ gói practice, màn ĐỌC đến từ `course.json`, và
  đợt đổi miền chỉ đi qua `course.json`. Cùng một khe hở, lần này đo được bao nhiêu bài lọt.
  **Chỉ đổi DANH TỪ, KHÔNG đụng một con số nào** — mọi `expected` giữ nguyên, nên
  `check-practice.mjs` chạy lời giải mẫu trên ca chấm THẬT là chứng minh được ngay (433 ca
  vẫn đạt). Ngưỡng 30 và khoảng 20–35 đọc tự nhiên với "số cốc" đúng như với "°C", và chính
  màn đọc của NP13 đã dùng ví dụ *"đánh dấu những món bán được từ 5 cốc trở lên"*.
  **Phải đi cả phần TRẮC NGHIỆM, không chỉ đề bài tập:** MCQ của NP13 cũng hỏi về
  `temps > 30`. Sửa mỗi đề thì bài vẫn lệch, chỉ là lệch ở màn khác — đúng kiểu bản sửa
  nửa vời mà file này đã gặp ở PD06 (`'price'` đổi, `"price"` khoá JSON thì không).
  **Và `temps` trong GỢI Ý phải đổi cùng lời giải mẫu:** gợi ý nói *"Tạo (temps >= 20) &
  (temps <= 35)"* trong khi lời giải mẫu đặt tên biến khác là gợi ý trỏ vào một biến không
  có trong đoạn mã người học vừa mở ra.
  Phép đo để kiểm lại (màn đọc nói miền quán, đề bài tập nói miền khác): nay **0 bài**.

- **BẢN ĐỒ TÍNH NĂNG: biến "dựng xong mà không có đường tới" từ lỗi IM LẶNG thành một
  dòng khai báo.** Mười lần rồi, và mỗi lần bộ kiểm vẫn XANH — vì test chứng minh code
  chạy đúng, không chứng minh có ai đi qua nó. `LOOP.md` đã đặt đúng câu hỏi (*"ai bấm vào
  nó, ở màn nào"*) nhưng để nó trong văn xuôi, mà một câu hỏi trong văn xuôi thì không
  chặn được ai bỏ qua. Nay `scripts/ban-do-tinh-nang.mjs` giữ CÂU TRẢ LỜI và
  `scripts/check-duong-toi.mjs` bắt nó phải đúng.
  **Phép đếm chạy trên BẢN DỰNG THẬT, không phải hằng gõ tay** — một con số gõ tay là thứ
  sẽ trôi, đúng bệnh mục mốc nền đã cảnh báo. Và nó đọc hai hằng `DOAN_OUTPUT_MAX_*` từ
  chính cây mã thay vì chép lại, nên hạ trần ở frontend là con số ở đây đổi theo.
  **LUẬT HAI CHIỀU, và chiều thứ hai mới là chiều hay bị quên:** đếm 0 thì bắt buộc khai
  `chuaCoDuongToi` kèm lý do; NHƯNG khai "chưa có đường tới" mà đếm > 0 cũng ĐỎ. Thiếu
  chiều sau thì bản đồ chỉ trôi một phía rồi thành một danh sách than thở mà không ai dọn.
  **Ba mục đang khai TỐI, và chúng là tài sản chứ không phải nợ:** nút "Thử ngay trong
  IDE" ở màn brief/explain (0/179 bài có hai màn đó) · 8/11 route của
  `quizzes.controller.ts` · ô nhập `stdin` (0/508 khối code dùng `input(`). Trước đây ba
  thứ này tối mà không chỗ nào nói ra.
  **Ablate 5 mảnh, cả 5 đỏ:** build thôi phát `task.io` → 1 · mount trỏ file không liên
  quan → 1 · tối mà không khai lý do → 2 · ký hiệu đổi tên → 1 · khai "tối" mà thật ra đã
  sáng → 1.
  **Và chính ablate bắt được một lỗi trong bộ kiểm này:** bản đầu, khi cả đường `task?.io`
  không khớp thì nó rơi về MẢNH CUỐI `io` — hai ký tự, có trong `version`, `option`,
  `programmingedu.io.vn` — nên mount trỏ vào `api.ts` vẫn qua cửa, tức bậc quan trọng nhất
  của bộ RỖNG trong khi mọi thứ vẫn xanh. Nay so bằng phép chuẩn hoá (bỏ `?` và khoảng
  trắng ở cả hai vế) chứ không bằng mảnh cuối. **Một cổng chỉ chứng minh được là có răng
  bằng cách gỡ bản sửa ra và đếm số đỏ** — không ablate thì tôi đã commit một cái cổng
  rỗng và tin là mình vừa chữa được lỗi thống trị của repo.
  **Cảnh báo phải thôi kêu oan, nếu không nó sẽ bị tắt:** cặp Python→TSX (build phát dữ
  liệu, renderer dựng) không bao giờ nhắc tên hàm của nhau, nên phép so theo ký hiệu ở đó
  sai 100% số lần. Với cặp đó, thứ NỐI hai nửa là KHOÁ DỮ LIỆU (`duLieu`: `trace`,
  `task?.io`, `tests`, `dataFiles`, `diagram`).

- **63 đáp án mẫu của màn LUYỆN TẬP chưa bộ kiểm nào từng chạy — nay chạy, và một cái
  hỏng.** `step_2.practice` có 63 câu mang sẵn `answerCode` + `answerExpected` (chương
  trình hoàn chỉnh, tự đủ, kèm output chính xác), và `PracticeScreen` ĐÃ dựng chúng khi
  người học bấm "Xem đáp án" — tức 63 đoạn code đang hiện ra cho người học mà không ai
  biết chúng còn chạy được không. Vòng lặp của `check-pyodide.mjs` chỉ đi qua
  `step_1.read`, nên chúng nằm ngoài mọi bộ kiểm. Pha 2 chạy chúng bằng CHÍNH bộ máy đã
  có (chặn mạng, nạp wheel, hâm nóng, harness) — viết bộ chạy thứ hai là tạo một thứ sẽ
  trôi khỏi thứ nhất.
  **Bắt được ngay một cái:** PD13 luyện tập #3 `import openpyxl` — Pyodide 314 không có
  wheel đó. Không phải lỗi nội dung mới (AGENTS.md đã ghi PD13 không chấm được vì đúng lý
  do này); nó là một giới hạn đã biết vừa lộ ra ở chỗ chưa ai nhìn.
  **Xử lý bằng NGOẠI LỆ CÓ TÊN, kiểm theo CẢ HAI CHIỀU.** Để đỏ mãi thì CI đỏ vĩnh viễn vì
  một thứ không sửa được, rồi người ta quen với màu đỏ; bỏ qua im lặng thì đúng "nới phép
  kiểm cho xanh". `DAP_AN_MAU_KHONG_CHAY` khai tên + lý do, và **một mục nay chạy được
  cũng là LỖI** — thiếu chiều đó thì danh sách chỉ dài ra rồi thành chỗ giấu rác.
  Ablate: xoá ngoại lệ → 1 đỏ (`đáp án mẫu NỔ`); bịa một ngoại lệ cho câu đang chạy được →
  1 đỏ (`ngoại lệ đã lỗi thời`).
  **63 nhưng chỉ chạy 53, và con số bị bỏ phải NÓI RA:** 10 câu nằm trong bài
  `_mode: 'local'` (GU* Tkinter) — cùng lý do pha 1 bỏ chúng. Im lặng thì "52/53" đọc như
  đã phủ hết, mà thật ra còn 10 đoạn chưa ai chạy.
  **Khoá ngoại lệ là `<mã>#<thứ tự trong step_2.practice>`, KHÔNG phải thứ tự trong số câu
  có answerCode** — NP02 có answerCode ở câu thứ 3 nên khoá là `NP02#3`. Lần ablate đầu
  tôi gõ `NP02#1` và phép kiểm không bắn, trông y như nó không có răng; bịa khoá sai là
  một cách tự lừa mình rằng bộ kiểm hỏng.

- **TÁM bài `free` cuối cùng còn chấm được nay đã có ca chấm — và cái giá là chúng bị KHOÁ.**
  CT03–CT06, SY25–SY28. Con số thật là **8, không phải 49**: trong 49 bài không có ca chấm
  thì 24 là `procedure` (không có mã Python nào chạy) và 17 thiếu wheel hoặc đụng
  `sys.executable`. Gói nguồn có **0 bài tập** cho cả tám, nên chúng được soạn tại repo.
  **ĐỔI HÀNH VI NGƯỜI HỌC THẤY ĐƯỢC:** `primaryCta` ở màn tổng kết trả "Nộp bài ở màn trước"
  khi `step_4.tests` không rỗng, nên tám bài này đổi từ "tự đánh dấu hoàn thành" sang "phải
  nộp đạt mới xong". **Nhưng đó là cách 130/179 bài còn lại ĐÃ hoạt động** — tám bài này là
  những bài `free` duy nhất còn chấm được mà chưa chấm, nên đây là làm cho NHẤT QUÁN chứ
  không phải siết thêm. `isGraded` KHÔNG gồm `sandbox`, nên `firstUnfinished` không chặn —
  đường khoá nằm ở `cta.ts`, không ở `firstUnfinished`; kiểm nhầm chỗ là kết luận sai.
  **Bộ chấm bắt hai lỗi của chính tôi, và đó là lý do nó tồn tại:**
  · CT04 — tôi gõ `expected` sai: jobs `[1,2,3]` thì thời gian chờ là 0,1,3 ⇒ 1.33, tôi viết
    1.0. Lời giải mẫu ĐÚNG, con số tôi tính nhẩm thì sai.
  · SY26 — ca "rỗng → None" làm biến thể "thừa một khoá dict" lọt 1/3, vì thêm khoá vào
    `None` không làm gì cả. Bộ chấm gọi đúng tên: *"bộ chấm CHO ĐẠT bài sai"*. Sửa HỢP ĐỒNG
    (mọi ca trả cùng hình dạng dict, ca rỗng trả `{"amounts": [], "mean": None}`), KHÔNG nới
    bộ chấm — `mean` của list rỗng là KHÔNG CÓ, nên `None` ở đó trung thực hơn `0.0`.
  **Mỗi bài tối thiểu ba ca và `expected` của chúng phải KHÁC NHAU**, nếu không thì "trả hằng
  của ca 1" đạt hết; và tránh `expected` BẰNG `input` (biến thể "dội nguyên đầu vào ra").
  130 → 138 bài · 433 → 460 ca · 585 → 621 biến thể sai, tất cả vẫn trượt.

- **417 KB TÀI NGUYÊN CHẾT đang được PHỤC VỤ RA INTERNET — đã xoá, và chỗ nó từng
  đứng nay có một cổng.** Đo ngày 03/11/2026 bằng phép khả đạt từ điểm vào THẬT:
  **13 tệp JS (234 KB) · 13 tệp CSS (164 KB) · 9 component React** không trang nào tới
  được. Trong đó có `login.inline.js` và `register.inline.js` của một luồng đăng nhập ĐÃ
  BỎ — `public/` được phục vụ nguyên, nên bất kỳ ai cũng tải được chúng.
  **Và nó làm TÀI LIỆU NÓI SAI.** AGENTS.md khi đó viết *"`login.inline.js` vẫn dùng hạn
  dự phòng…"* — mô tả một cơ chế mà không trang nào nạp, đúng họ bẫy `apiFetchSessionOnly`
  (đặt tên một thứ không tồn tại thì nó không chặn được gì). Câu đó đã sửa.
  **ĐẾM THAM CHIẾU THÔ LÀ SAI, và sai theo chiều NGUY HIỂM.** Bản quét đầu của tôi báo chỉ
  4 tệp chết, vì hai lỗi: · nó quét cả `e2e/` và cả CHÚ THÍCH — `edu-dashboard.js` chỉ được
  NHẮC TÊN trong một chú thích ở `assetVersion.ts`, còn `main.js` (còn sống) thì nhắc
  `edu-chrome.js`/`course_detail.js` cũng chỉ trong chú thích; · một tệp được một tệp ĐÃ
  CHẾT trỏ tới thì vẫn chết, nên phải lan truyền từ điểm vào chứ không đếm tổng số lần
  xuất hiện.
  **Hạt giống phải là ĐƯỜNG DẪN ĐẦY ĐỦ, không phải tên trần.** Bản thứ hai vẫn chỉ tìm ra
  **5/13** tệp CSS chết, vì bảng `RANK` trong `PageStyles.tsx` liệt kê `'theme.css': 10`
  làm khoá sắp thứ tự — mà một hàng trong bảng thứ tự KHÔNG phải một lời nạp. So bằng
  `/static/css/theme.css` mới ra đủ 13. Xoá CSS thì phải xoá hàng `RANK` của nó cùng lúc.
  **NGOẠI LỆ, phải KHAI chứ không xoá:** `dashboard.js` (105 KB) — `forum-xss.test.mjs`
  ĐỌC file này từ đĩa để chứng minh `escHtml` trung hoà payload XSS. Chết với người dùng,
  sống với một phép kiểm, y như pe-v4. Nói thẳng giới hạn: forum KHÔNG có trang nào nạp
  `dashboard.js`, nên ca đó đang canh một đường **không ai đi qua** — nó chống hồi quy cho
  ngày forum quay lại, không chứng minh hôm nay có ai được bảo vệ.
  **Thứ bền không phải lần xoá mà là CỔNG:** `scripts/check-tai-nguyen-chet.mjs` tính lại
  khả đạt mỗi lần chạy, có trong CI, và kiểm **hai chiều** — không ai tới được mà chưa khai
  thì ĐỎ, khai "giữ dù chết" mà hoá ra đã sống cũng ĐỎ (thiếu chiều sau thì danh sách ngoại
  lệ chỉ dài ra rồi thành chỗ giấu rác, đúng bài học `DAP_AN_MAU_KHONG_CHAY`).
  Ablate: thêm một tệp `public/static/js` không ai nạp → **1 lỗi**; khai `js/main.js` là
  "giữ dù chết" → **1 lỗi** kèm câu "ngoại lệ đã lỗi thời".
  **Cổng này CỐ Ý dễ dãi một chỗ, và phải biết:** phép so component dùng `\b<Tên>\b` trên
  văn bản đã bỏ chú thích, nên một `<title>Concept Card</title>` trong trang khác đủ làm
  `Concept.tsx` trông như còn sống (tôi kiểm tay rồi mới xoá nó). Dễ dãi là chiều AN TOÀN
  — cổng kêu oan sẽ bị tắt — nhưng đừng đọc "0 lỗi" thành "không còn gì chết".
  **ĐIỂM MÙ ĐÃ ĐỂ LỌT CHÍNH SAI SÓT CỦA CỔNG NÀY — CSS module trong `src/`.**
  Mục 1 của cổng chỉ quét `public/static/{js,css}`, mục 2 chỉ quét `.tsx`.
  Nên khi chính đợt dọn 03/11 xoá `ShellA.tsx`, file `ShellA.module.css`
  (74 dòng, 1 349 byte) ở lại — không ai import, không cổng nào thấy, và **commit mang
  tên "xoá tài nguyên chết" để nó lại**. Thấy nó bằng tay khi liệt kê 61 chỗ dùng
  `--edu-card-border` cho việc khác, không phải nhờ bộ kiểm nào.
  Mục 2b nay quét `.module.css` và so bằng TÊN FILE — import CSS module luôn viết
  nguyên tên file nên phép so không phải đoán, khác hẳn phép so `\b<Tên>\b` dễ dãi
  của mục 2. Đo được: **16 CSS module trong `src/`, đúng 1 mồ côi**.
  Ablate: thêm một `.module.css` không ai import → **1 lỗi**; 15 module còn lại
  không mục nào kêu oan (chính lần chạy xanh là phép kiểm chiều đó).
  **Bài học rộng hơn con số:** một cổng chống "dựng xong mà không ai tới" cũng có
  vùng không quét, và vùng đó im lặng đúng như thứ nó ra đời để bắt. Thêm một LOẠI
  tệp vào `src/` (hôm nay là `.module.css`; ngày mai có thể là `.worker.ts`,
  `.json` dữ liệu) thì phải hỏi NGAY: mục nào của cổng này quét nó?

  **Và `app/` được MIỄN:** ở đó `page`/`layout`/`route` không ai import là quy ước định
  tuyến của Next, không phải lỗi.

- **LẦN THỨ MƯỜI HAI của lỗi thống trị, và lần này cổ chai KHÔNG ở code: 153 bài dựng
  xong mà chưa ai nạp.** `check-duong-toi.mjs` chứng minh được "có một màn MOUNT tính
  năng này". Nhưng NỘI DUNG BÀI đọc từ **DB**, không từ `out/` — nên một bài có thể dựng
  xong, kiểm xong, CI xanh, và vẫn không ai đọc được. Đo ngày 04/11/2026: 153 bài đã đổi
  qua 10 commit nội dung (ô ví dụ đầu vào/đầu ra 130 bài · alt text 59/80 hình · 8 bài tập
  mới được chấm · 2 sơ đồ · 3 bài sửa lệch miền), `--all --offline` sạch (179 bài, 0 từ
  chối), và **không chỗ nào trong CI nói ra rằng chúng chưa tới ai**.
  **BIÊN NHẬN, KHÔNG PHẢI FILE SAO LƯU.** `--apply` nay ghi `scripts/pe-da/da-nap.json`
  (mã bài → sha256) **SAU khi transaction commit**. Phân biệt này là cả vấn đề: file sao
  lưu được ghi **TRƯỚC** bước ghi DB, nên sự tồn tại của nó không chứng minh gì — đúng sự
  cố 29/10/2026, khi transaction rollback mà thư mục backup vẫn đầy đủ và người chạy kết
  luận là đã nạp. Biên nhận chỉ ra đời khi DB đã nhận thật. **Commit nó.**
  **Cổng KHÔNG đọc DB, và đó là cố ý:** CI không có (và không nên có) thông tin đăng nhập
  production; phép so chạy được trên máy bất kỳ. Giới hạn phải nói ra: biên nhận nói "lần
  nạp đó ĐÃ xảy ra", **không** nói "DB hiện giờ vẫn đang giữ đúng bản đó" — ai ghi đè bằng
  đường khác thì cổng này mù. Đây là cổng chống QUÊN NẠP, không phải chống DB trôi.
  **Chưa có biên nhận thì CẢNH BÁO, không đỏ.** Đỏ vĩnh viễn vì một việc chỉ chủ dự án làm
  được là dạy người ta quen với màu đỏ — cùng bài học `DAP_AN_MAU_KHONG_CHAY`. Có biên nhận
  rồi thì lệch là đỏ cứng, và mục MỒ CÔI (có trong biên nhận mà gói không còn) cũng đỏ, để
  nó không lớn dần thành chỗ giấu rác.
  **BIỆN MINH ĐÃ ĐỔI, có chủ đích — đừng viết lại lý lẽ cũ.** KHÔNG dùng "lỗi phát hiện
  muộn đắt gấp 100 lần": truy nguồn cho thấy con số đó không đứng (Bossavit), và Menzies
  cùng cộng sự trên **171 dự án** không tìm thấy hiệu ứng nào. Lý do đúng là **ĐIỀU KHIỂN**
  — một tín hiệu dừng máy đọc được — cho một vòng lặp mà người chạy nó tự tin sai: RCT duy
  nhất về năng suất (METR, 16 lập trình viên, 246 issue thật) đo được **chậm hơn 19%** khi
  có AI trong khi chính họ tin là nhanh hơn 20%, lệch **39 điểm**.
  **Và nó thuộc lớp hiếm, không trùng lint/typecheck/review:** Wagner và Mehrpour cho thấy
  ba kỹ thuật đó bắt các lớp lỗi khác nhau nhưng **cả ba đều mù** với tính chất toàn hệ
  thống; Eder (ICSE 2012) đo được ~1/4 tính năng không ai dùng trong hai năm, **>70% trong
  số đó làm chính người làm ra bất ngờ**; và **không kỹ thuật công bố nào chứng minh được
  một tính năng TỚI ĐƯỢC NGƯỜI DÙNG**. Phép thử trước khi dựng cổng thứ chín: cùng lớp với
  lint/typecheck thì TRÙNG, đừng dựng; tính chất toàn hệ thống thì đáng.
  **CA TEST CỦA CHÍNH CỔNG NÀY TỪNG KHÔNG CÓ RĂNG, và đó là phần đáng nhớ nhất.** Bản đầu
  của `da-nap-hash-sync.spec.ts` tự CHÉP `sapKhoa`/`dauVan` vào trong spec rồi so với
  `fingerprint()`. Ablate (sửa cổng về `JSON.stringify` trần) → **cả 3 ca VẪN XANH**, vì nó
  không đụng tới file cổng lần nào. Nay spec ĐỌC `scripts/check-da-nap.mjs`, trích đúng hai
  hàm và `new Function` chúng — cùng khuôn `forum-xss.test.mjs` lôi `escHtml` ra khỏi
  `dashboard.js`. Ablate lại: `JSON.stringify` trần → **2 đỏ**; đổi tên hàm trong cổng → bộ
  **không nạp được**, ném đúng câu chỉ tên.
  Bẫy nhỏ khi trích: phải phân biệt thân KHỐI với thân BIỂU THỨC — `sapKhoa` có
  `return v.map(sapKhoa);` nên dấu `;` ĐẦU TIÊN nằm giữa thân, cắt ở đó là `new Function`
  ném SyntaxError (đã xảy ra).

- **KHỐI CODE ĐỔI SANG BẢNG NÂU ẤM — theme lofi chill, và production từng bị lùi khỏi
  nó có chủ đích.** Đọc commit `070886a` trước khi đụng vào giao diện: *"main đang mang
  bản đồ sao + bản đồ thế giới + tiền cảnh bàn quan trắc làm trang chủ, trong khi **nhóm
  đã chốt đi theo theme lofi chill**. Hai hướng thiết kế nằm chung một nhánh thì không ai
  test được hướng nào cho ra hồn."* Cách sửa khi đó là MỘT commit đưa main về `2c12049` —
  **bản trước toàn bộ việc thiết kế**, bố cục xanh–đỏ hai cột — và 95 commit thiết kế bị
  gỡ theo (bản chiêm tinh giữ ở nhánh `chiem-tinh`). Nên production "không đẹp" KHÔNG phải
  chuyện bỏ quên, và lofi chill KHÔNG phải một hướng mới: nó là hướng đã chốt, chưa ai
  dựng lại sau lần lùi.
  **Thứ đáng port nằm ở nhánh `test`, và nó không phải một cảm giác:** 65 token `--ds-*`
  trong `studio-tokens.css`, **mỗi token ghi kèm tỉ số tương phản**. Đã TÍNH LẠI năm con
  số của nhóm code bằng công thức WCAG 2.1 §1.4.3: **5/5 khớp từng số**. Đừng chép một con
  số vì nó được viết cạnh màu — nhưng lần này nó đúng, và điều đó nói lên chất lượng bảng.
  **LOFI Ở ĐÂY LÀ SÁNG, KHÔNG PHẢI TỐI** — chỗ dễ hiểu nhầm nhất. Trang là giấy xanh xám
  `#EAEFF6` + thẻ trắng; thứ tạo ra cảm giác là **khối code NÂU ẤM** `#221a13` với chữ kem
  `#efe6d2` và cú pháp ĐẤT (hổ phách `#f2b880` 9,75:1 · xanh rêu `#c8dda0` 11,68:1) thay
  cho neon. Nền lạnh + cú pháp neon đọc ra "công cụ"; nền nâu + chữ kem đọc ra "trang
  giấy". Khối code có ở **508 chỗ / 145 bài**, nên nó quyết định cảm giác của cả khoá hơn
  bất cứ bề mặt nào khác.
  **Màu SỐ phải tự đo:** bảng `--ds-*` không có token cho số. Chọn `#e8a0a0` (**8,14:1**,
  đất nung) để số không lẫn với từ khoá (hổ phách) lẫn chuỗi (xanh rêu) — đo rồi mới chọn,
  không chọn rồi mới biện minh.
  **Và `body.dark` phải đi theo CÙNG bảng.** Bỏ sót nó là ban ngày nâu còn ban đêm vẫn
  xanh — đúng họ lỗi "`--st-*` kẹt bảng ngày" đã ghi ở trên, chỉ khác chiều. Ban đêm hạ nền
  một nấc xuống `#1a130d` (chữ kem ở đó: 15,55:1).
  **Cổng: `ds-contrast.test.mjs` TÍNH tương phản từ chính file CSS, không giữ bảng giá trị
  thứ hai** — bài học vừa học ở `da-nap-hash-sync.spec.ts`, nơi bản đầu tự chép hàm băm
  vào spec rồi ablate vẫn xanh cả ba ca. Ngưỡng là AA 4,5:1 CỘNG một SÀN riêng thấp hơn số
  đo thật một chút: ghim đúng số thật thì đổi một màu là đỏ oan, không ghim gì thì nó tụt
  dần tới 4,51:1 mà không ai thấy. **Sàn chỉ được NÂNG.**
  Ca thứ ba ghim chính QUYẾT ĐỊNH chứ không ghim mã màu: nền code phải có kênh **đỏ ≥ xanh
  dương**. Một bản "chỉnh lại cho hợp tông xanh của trang" sẽ qua hết mọi phép kiểm tương
  phản mà vẫn phá đúng thứ theme này mang lại.
  Ablate 3 chiều, mỗi chiều **2 ca đỏ**: chú thích nhạt xuống dưới AA · chuỗi vẫn trên AA
  nhưng dưới sàn · nền quay về xanh `#1c2536`.
  **`ASSET_VERSION` phải bump cùng commit** (nay `2026-11-04a`): file trong `public/` không
  qua bundler nên URL không đổi theo nội dung, không bump thì người đã mở trang giữ CSS cũ
  — tức bản đổi không tới được đúng những người đang dùng.
  **BỀ MẶT THẺ: bảng MÀU đã trùng sẵn, chỉ còn ba chi tiết — đo rồi mới biết.**
  Vòng hai định port màu bề mặt của `ShellB` và phép đo nói ĐỪNG: `--edu-bg-solid`
  `#eaeff6` = `--ds-page`, `--edu-t1` `#0f1b33` = `--ds-ink`, `--edu-t2` `#3a4a66`
  = `--ds-soft`, `--edu-panel-bg-solid` `#ffffff` = `--ds-card`. **Trùng từng mã màu.**
  Thứ còn lệch thật chỉ là: BÓNG (`0 10px 30px rgba(113,132,167,.10)` xanh lạnh toả
  rộng → `0 6px 22px rgba(42,32,23,.08)` nâu ấm bám sát, **31 chỗ dùng**), BÁN KÍNH
  (`--st-card-radius` 22 → 16, thang lofi là 4/8/12/16/pill, 3 chỗ dùng), và VIỀN THẺ.
  **Viền CỐ Ý không đụng:** `--edu-card-border: rgba(255,255,255,.85)` dùng ở **61
  chỗ**, và viền trắng là viền SÁNG có chủ đích trên nền không-trắng — đổi mù 61 chỗ
  sang `#CFD9E8` là liều, phải xem từng chỗ.
  Cổng cho bóng ghim TÍNH CHẤT chứ không ghim chuỗi CSS: ngày thì R ≥ B (ấm), và cả
  hai chế độ toả ≤ 24px (bám sát). Ghim nguyên chuỗi thì đổi 6px thành 7px là đỏ oan.
  Ablate: bóng về xanh → 1 đỏ; bóng toả rộng lại → 1 đỏ.

  **VIỀN THẺ: khai báo CSS SAI CÚ PHÁP bị trình duyệt DROP, và không gì ném ra.**
  `ShellB.module.css` — vỏ của MỌI màn bài học, 179 bài — viết
  `border: var(--edu-card-border)`. Token đó là một MÀU, còn shorthand `border`
  đặt lại mọi longhand bị bỏ về giá trị đầu, tức `border-style: none`. **Đo trong
  Chrome: `border-top-width` 0px, `border-top-style` none** — thẻ chỉ có bóng,
  không có cạnh. Không exception, không cảnh báo lint: CSS sai cú pháp chỉ bị bỏ.
  **VÀ MÀU CŨNG VÔ HÌNH, kể cả khi khai báo đúng:** `--edu-card-border` là
  `rgba(255,255,255,.85)` — viền SÁNG có chủ đích trên nền KHÔNG-trắng của các
  trang di sản — mà nền thẻ bài học là `--edu-panel-bg` `rgba(255,255,255,.96)`.
  Trắng trên trắng. Nên bản sửa là token MỚI `--edu-card-line` (`--ds-line` của
  bảng lofi: `#CFD9E8` ngày / `#233049` đêm), KHÔNG sửa `--edu-card-border`.
  **VÌ SAO KHÔNG ĐỔI 61 CHỖ: phép đo nói chỉ có 1 chỗ đáng đổi.** Trang bài học nạp
  đúng HAI file CSS (`edu-theme.css` + `studio-tokens.css`), và trong 16 chỗ dùng
  ở `edu-theme.css` thì **đúng 1 lớp (`.cd-block`) có component React phát ra** — 15
  lớp còn lại (`.dash-hero`, `.lb-card`, `.forum-post-card`, `.sk-set`,
  `.rmv-toolbar`…) là selector của dashboard/leaderboard/forum/roadmap di sản
  Django, không trang nào render. 44 chỗ còn lại nằm trên các trang `(standalone)`
  ngoài khoá 179 bài. **"61 chỗ" là con số của grep, không phải con số của người học.**
  **CỔNG — và nó RỖNG ở bản đầu, ablate mới lộ ra.** Ca quét neo regex vào cả DÒNG
  đã trim; gieo `.ablate-x { outline: var(--edu-card-border); }` vào `edu-lesson.css`
  thì **0 ca đỏ**, vì CSS repo này viết một rule MỘT DÒNG
  (`.cal-day { border-radius: 14px !important; }`) nên khai báo gần như không bao giờ
  đứng riêng một dòng. Nay cắt theo `;` sau khi bỏ chú thích, và bỏ phần selector
  đứng trước `{`/`}` trên cùng dòng.
  Ablate 6 chiều: trả `.card` về khai báo hỏng → **2 đỏ** · gieo lớp lỗi inline ở một
  file CSS tĩnh khác → 1 · gieo inline trong một CSS module → 1 · gieo trên nhiều dòng
  → 1 · đường kẻ ngày sáng gần bằng nền thẻ → 1 · đường kẻ đêm tối hơn nền thẻ → 1.
  Chiều NGƯỢC cũng đo: `:root { --ablate-vien: var(--edu-card-line); }` → **0 đỏ**, vì
  gán màu vào một custom property là hợp lệ và repo có 5 chỗ làm vậy.
  **Hai chiều ngày/đêm phải kiểm RIÊNG:** ngày thì đường kẻ phải TỐI hơn nền thẻ
  trắng, đêm thì phải SÁNG hơn nền thẻ `#1d232d`. Một phép kiểm "khác nền" gộp
  chung sẽ cho qua một đường kẻ còn tối hơn cả nền tối.
  **KHÔNG đòi 3:1 cho đường kẻ này:** chú thích gốc của `--ds-line` ghi 1,36:1 trên
  thẻ và dặn KHÔNG dùng nó làm viền của thứ bấm được. WCAG 1.4.11 đòi 3:1 cho thành
  phần giao diện, còn đường bao một thẻ nội dung là TRANG TRÍ — đòi 3:1 ở đây là biến
  một cổng đúng thành một cổng kêu oan.
  **ĐỔI HÀNH VI NGƯỜI HỌC THẤY ĐƯỢC:** thẻ của mọi màn bài học nay CÓ cạnh.
  `ASSET_VERSION` bump theo (`2026-11-04b`).

  **HAI THANH STICKY của vỏ bài học không có cạnh — và tầng "paper" KHÔNG chữa được.**
  `.topBar` / `.bottomBar` của `LessonChrome` (vỏ mà `StudioLesson` dựng cho MỌI
  màn của 179 bài) dùng nền `--edu-panel-bg-solid` `#ffffff`, mà thẻ nội dung cũng
  `#ffffff` — đo được **1,000:1**, tức CÙNG MỘT MÀU. Cả hai sticky, nội dung cuộn LỌT
  xuống dưới chúng, và không thanh nào có `border` lẫn `box-shadow`: chữ trôi vào
  thanh rồi biến mất, không gì nói ranh giới ở đâu.
  **ĐÃ ĐO VÀ BỎ cách sửa hiển nhiên, đừng dựng lại:** chuyển thanh sang tầng
  `--ds-paper` `#F7FAFD` của bảng lofi chỉ cho **1,048:1** so với thẻ — vẫn không ai
  thấy. Ở khoảng sáng này MÀU NỀN không tách được hai mặt phẳng; chỉ ĐƯỜNG KẺ mới
  tách. Nay hai thanh dùng `--edu-card-line` (1,42:1 trên nền trắng — mức của một
  đường chia quiet, không phải của một viền nhấn).
  Cổng ghim TÍNH CHẤT: một mặt phẳng STICKY mà nền trùng với mặt dưới nó thì PHẢI có
  cạnh HOẶC bóng. Ablate 5 chiều: bỏ cạnh thanh trên → **1 đỏ** · bỏ cạnh thanh dưới
  → 1 · bỏ cả hai → 1 · đổi tên `.topBar` → 1 (ca nói thẳng "đổi tên thì sửa ca này",
  không im lặng xanh). Chiều NGƯỢC: thay cạnh bằng `box-shadow: 0 1px 0 …` →
  **0 đỏ**, vì đó cũng là một cách tách hợp lệ — cổng không ép một mã CSS cụ thể.
  **Bẫy khi viết chính ca đó:** `new RegExp(`${canh}:\\s*1px…`)` là một lớp thoát nữa
  phải đếm đúng, và tôi đếm sai — pattern thành `border-bottom:s*1px…`, ca ĐỎ trong
  khi CSS đã đúng. Viết regex THẲNG, đừng dựng từ chuỗi.
  **KHÔNG bump `ASSET_VERSION` cho vòng này:** `LessonChrome.module.css` nằm trong
  `src/` nên đi qua bundler, URL đã đổi theo nội dung. Luật bump chỉ áp cho `public/`.

  **LẦN THỨ HAI CÙNG MỘT LỖI, ở TRANG CHỦ và TRANG KHOÁ HỌC — và nó là lý do chủ
  dự án hỏi "sao vẫn giao diện cũ".** Production ĐANG chạy đúng HEAD (thẻ `pe-build`
  khớp SHA, `check-da-deploy` xanh). Hai trang đó y nguyên vì **không commit nào đụng
  vào chúng**: cả hai commit lofi trước chỉ chạm `studio-tokens.css` và bề mặt BÊN
  TRONG `/lesson/*`. Đo trang chủ thì ra đúng lỗi đã sửa ở `ShellB`:
  `--edu-panel-border: rgba(255,255,255,.9)` phủ lên thẻ `#ffffff` ra **ĐÚNG**
  `#ffffff` — **1,000:1**, cùng MỘT màu, thẻ chỉ có bóng. 7 chỗ dùng token đó
  (home.module.css 2 · ide.module.css · CodeVisualizer.module.css · edu-theme.css 3).
  **CHIỀU ĐÊM ĐI NGƯỢC, và "dùng token mới ở mọi nơi" là HẠ tương phản.** Viền panel
  ban đêm đang là `rgba(255,255,255,.10)` = **1,359** trên thẻ `#1d232d`, còn
  `--edu-card-line` ban đêm là `#233049` = **1,195**. Gán thẳng token mới vào là làm
  TỆ ĐI một bề mặt đang đúng. Nên `--edu-card-line` ban đêm NÂNG `#233049` → `#303c4e`
  (**1,414**), rồi cả hai mới dùng chung. Đo trước khi gán, đừng gán rồi mới đo.
  **Bóng MẶT NỔI bị bỏ sót hai vòng:** `--edu-panel-shadow` vẫn là
  `rgba(83,102,137,.24)` xanh lạnh, vì ca cũ chỉ canh `--edu-card-shadow`. Nay
  `rgba(42,32,23,.19)` — GIỮ hình dạng 20/50 (đây là mặt NỔI: dropdown, thẻ hover,
  không phải thẻ nằm trên giấy, nên trần toả 24px KHÔNG áp ở đây), alpha hạ theo đúng
  tỉ lệ lần đổi `--edu-card-shadow` (.10 → .08) vì nâu đọc nặng hơn xanh xám.
  Bán kính `home.module.css` 20px → 16px, 4 chỗ (thang lofi là 4/8/12/16/pill).
  Ca mới ghim CẤU TRÚC, không ghim mã màu: `--edu-panel-border` phải LÀ
  `var(--edu-card-line)`. Phép chứng minh "đường kẻ có thấy được không" đã nằm ở ca
  card-line và kiểm cả hai chiều ngày/đêm — nuôi một màu thứ hai ở đây là nuôi một
  thứ sẽ trôi khỏi nó.
  Ablate 4 chiều, mỗi chiều **1 đỏ**: viền ngày về trắng · viền đêm về `rgba` · bóng
  nổi về xanh lạnh · hạ `--edu-card-line` đêm xuống dưới nền thẻ.
  **GIỚI HẠN PHẢI NÓI RA:** ca card-line kiểm CHIỀU (sáng hơn / tối hơn nền), không
  kiểm ĐỘ LỚN — nên bản nâng 1,195 → 1,414 KHÔNG được ghim bằng một sàn. Hạ ngược về
  `#233049` vẫn xanh. Đặt sàn ở đây thì phải thêm một mục vào
  `scripts/nguong-mot-chieu.json`; chưa làm, và đó là lựa chọn chứ không phải bỏ sót.
  `ASSET_VERSION` bump theo (`2026-11-04d`) vì `edu-theme.css` nằm trong `public/`.

  **NỀN TRANG CÒN VẼ MESH XANH–ĐỎ — bề mặt LỚN NHẤT, và là thứ chủ dự án thật sự
  đang nhìn thấy.** Sau khi viền thẻ xong, tôi mở production bằng Chrome (đúng cái
  tôi đã khai là "chưa làm" vòng trước) và chụp ảnh: thẻ CÓ cạnh, nhưng trang vẫn
  hồng/tím. Đo ra ngay: `body` vẽ `rgba(255,90,110,.20)` đỏ góc trên-phải +
  `rgba(79,141,255,.30)` xanh góc dưới-trái + một đốm xanh nhạt giữa, ĐÈ lên
  `#eaeff6`. Đó là bảng xanh–đỏ của bố cục TRƯỚC việc thiết kế (commit `070886a`).
  **BÀI HỌC VỀ PHÉP ĐO, không phải về CSS:** hai vòng trước tôi chứng minh bằng công
  thức WCAG tính từ chính file CSS — đúng từng số, và cả hai lần đều BỎ SÓT thứ to
  nhất, vì tôi chỉ tính những token mình đang sửa. Một ảnh chụp 30 giây trả lời câu
  "trang đọc ra cái gì" mà không phép tính nào trong repo trả lời được.
  **NỬA CÒN LẠI của cùng lỗi, và bỏ sót nó là bản sửa trông như xong:** hai QUẦNG
  SÁNG BÁM CHUỘT (`html.edu-fx::before/::after`) tô `rgba(37,99,235,.22)` +
  `rgba(229,51,75,.17)` lên MỌI trang — `edu-fx.js` nạp ở layout gốc nên chúng
  đang sống. Sửa mỗi nền thì hai đốm brand vẫn chạy theo con trỏ.
  **XOÁ, không tô lại:** trên giấy sáng `#EAEFF6` một quầng trung tính là một vệt mờ
  bẩn, và một đốm sáng chạy theo con trỏ ngược hẳn với "chill". `edu-fx.js` vẫn nạp và
  vẫn làm đốm sáng cho THẺ (`data-fx`); nó chỉ ghi `--ax/--ay/--bx/--by` nên không
  lời gọi nào hỏng.
  Giữ NGUYÊN dốc `160deg` ba mốc để không đổi nhịp bố cục; chỉ bỏ ba radial và đưa
  màu về giấy trung tính (ngày `#f7fafd → #eaeff6 → #e4eaf4`).
  **Cổng ghim TÍNH CHẤT bằng |R − B|:** giấy lofi lệch 6–16, đỏ brand lệch **145**,
  xanh brand lệch **176**. Ghim nguyên chuỗi CSS thì đổi một mốc dốc là đỏ oan.
  Ablate 4 chiều: trả mesh đỏ vào nền ngày → **1 đỏ** · trả mesh xanh vào nền đêm →
  1 · dựng lại quầng bám chuột → 1 · **nới trần `TRAN_LECH_KENH_NEN` 24 → 200 rồi
  trả mesh đỏ vào → 0 đỏ**. Chiều thứ tư đúng là "nới phép kiểm cho xanh" mà LOOP.md
  gọi tên, nên con số ấy nay có một mục trong `scripts/nguong-mot-chieu.json`
  (17 → 18 ngưỡng); ablate lại qua sổ: nới 24 → 200 thì `check-nguong` **1 lỗi**.
  `ASSET_VERSION` → `2026-11-04e`.

- **BẢNG 74 TOKEN `--ds-*` LẤY NGUYÊN TỪ NHÁNH `test` — và câu "bê cả nhánh" là câu
  tôi đóng khung SAI.** Chủ dự án hỏi *"cần gì bê nhánh, chỉ lấy phần frontend thôi"*,
  và đúng: tôi phản đối việc MERGE, mà không ai đề xuất merge. Số đo cho cả hai vế:
  · `main` đi TRƯỚC `tester/test` **170 commit**; `test` đi trước main **10**; commit
    cuối của `test` là **22/10**. Merge cả nhánh thì **45 file** main đã xoá sống lại
    (417 KB tài nguyên chết + font Be Vietnam Pro đã bỏ), và **7/10 commit** là
    dashboard / Góc học / minigame — thứ chủ dự án đã loại khỏi phạm vi;
  · nhưng `studio-tokens.css` của `test` là một file **CHỈ KHAI BIẾN, không một quy
    tắc nào áp lên phần tử** (chính đầu file nói vậy), nên lấy nguyên là an toàn và
    rẻ. Đó là cách port đúng, và tôi đã port TAY từng token suốt bốn vòng trước.
  **ĐO TRƯỚC KHI LẤY, và phép đo quyết định cách làm:** 40/41 `--st-*` trùng tên; đúng
  **MỘT** token mất — `--st-streak-bg`, có **đúng một** chỗ dùng
  (`LessonChrome.module.css:177`). Trả nó về trỏ `--ds-violet-tint`. Thiếu bước này là
  một bề mặt MẤT NỀN mà không gì ném ra: CSS chỉ lặng lẽ bỏ qua một `var` không có.
  **CỔNG BẮT ĐƯỢC THỨ ĐÁNG GIÁ NHẤT — nhưng vì lý do SAI, và đó là bài học.**
  Vừa thay file thì `ds-contrast` **3 ca ĐỎ**: *":root không có --st-code-bg"*. Đọc
  như "bảng mới xoá mất bảng code NÂU". Đo lại: `--ds-code-bg` của `test` là
  **`#221A13`**, trùng TỪNG KÝ TỰ với bảng đang chạy. Bảng v2 chia HAI TẦNG — `:root`
  giữ mã màu `--ds-*`, `body` giữ `--st-*` làm BÍ DANH — còn cổng chỉ đọc `:root` và
  chỉ nhận mã màu TRỰC TIẾP. Tức **cổng BÁO OAN**, và lối thoát trông hợp lý nhất lúc
  đó là bỏ bảng mới đi. Sửa CỔNG, đừng bỏ bảng.
  **MỘT NẤC bí danh, cố ý** — hai nấc là bảng tự vòng vo và cổng phải ĐỎ chứ không
  đoán tiếp. **Và bản đầu của luật ấy KHÔNG CÓ RĂNG:** `token()` trả `null`, chỗ gọi
  nuốt bằng `??`, ablate bí danh hai nấc ra **0 đỏ** — cổng im lặng đúng lúc nó không
  đọc nổi bảng. Nay "chưa khai" vẫn trả null (chỗ gọi cần rơi về bảng ngày) nhưng "ĐÃ
  KHAI mà không giải ra mã màu" thì `assert.match` ĐỎ. Ablate lại: **2 đỏ**.
  **HAI PHÉP ABLATE ĐẦU CỦA TÔI TRƯỢT, và "0 đỏ" của chúng vô nghĩa** — một cái lệch
  escaping, một cái đếm thiếu dấu cách (`--ds-code-str:` có BỐN space). Đúng bẫy
  `NP02#1` đã ghi ở trên: bịa khoá sai là tự lừa mình rằng bộ kiểm hỏng. Nay mỗi phép
  ablate kiểm chuỗi ĐÃ vào file rồi mới chạy.
  Ablate 4 chiều: trả cổng về chỉ-đọc-`:root` → **3 đỏ** · cổng thôi giải bí danh → 3 ·
  đổi `--ds-code-bg` sang xanh `#1c2536` → 3 · hạ `--ds-code-str` xuống dưới sàn → 2.
  **~~ĐỔI HÀNH VI NGƯỜI HỌC THẤY ĐƯỢC~~ — CÂU NÀY TÔI VIẾT SAI, xem mục đính chính
  ngay dưới.** Tôi ghi "bảng v2 KHÔNG có màu xanh lá, `--st-ok-*` nay là hổ phách" vì
  chép CHÚ THÍCH đầu file. Đo giá trị thật thì `--ds-ochre` = `#047857`, **một màu
  XANH LÁ**. Thay đổi thật nhỏ hơn hẳn: ok `#1f9d59` → `#047857`, err `#d0344b` →
  `#CF2338`. Điều kiện WCAG 1.4.1 (icon + chữ kèm màu) vẫn đạt và pha 4 đã đo:
  **2 288 ca trượt / 0 ca im lặng**.
  `ASSET_VERSION` → `2026-11-04f`.
  **CÒN LẠI, nói cho đúng:** 74 token nay CÓ MẶT trên main, nhưng mới `--st-*` (41 bí
  danh) là có người dùng. Nhóm `violet/sanguine/ochre/action` và thang bán kính vẫn
  chưa bề mặt nào gọi tới — **đó là token suông, đúng thứ luật dưới đây cấm**, và nó
  được chấp nhận ĐÚNG MỘT VÒNG này vì file là một khối không tách được. Vòng sau phải
  nối bề mặt, không thêm token.

- **TÔI CHÉP MỘT CÂU THAY VÌ ĐỌC MỘT GIÁ TRỊ — và câu đó sai với chính file chứa nó.**
  Chú thích đầu `studio-tokens.css` khai *"Bảng v2 không có màu xanh lá… `--st-ok-*` nay
  là ochre… chứ không còn là xanh lá"*. Tôi đưa nguyên câu ấy vào mô tả commit và vào
  file này như một phần "ĐỔI HÀNH VI NGƯỜI HỌC THẤY ĐƯỢC". Đo trong trình duyệt ở vòng
  sau: `--ds-ochre` = **`#047857`**, một màu **XANH LÁ** đậm — chỉ `--ds-mark-ochre`
  `#E0B062` mới là hổ phách. Token mang TÊN ochre nhưng GIÁ TRỊ là xanh lá, và chú
  thích không ai sửa theo. Thay đổi thật: ok `#1f9d59` → `#047857` (xanh đậm hơn),
  err `#d0344b` → `#CF2338` (đỏ, gần như cũ) — nhỏ hơn hẳn câu tôi viết.
  Đúng họ lỗi file này đã gọi tên hai lần ("đọc CÂU, không đọc MÀU"; "đừng chép một con
  số vì nó được viết cạnh màu"), lần này tôi là người vấp. **Một chú thích là lời KHAI,
  giá trị mới là sự THẬT** — và khi hai cái lệch nhau thì chú thích luôn là cái sai.
  Đã sửa cả hai chỗ; chú thích trong file nay mang đoạn đính chính để không ai chép lại.

- **HAI CHIP CỦA TRANG CHỦ TRƯỢT AA, và nguyên nhân là một KHUÔN chứ không phải hai
  dòng CSS.** Đo trên production 04/11 bằng phép hợp thành alpha THẬT (đi ngược cây tổ
  tiên, KHÔNG lấy nền `body`): "Cơ bản" `#e5334b` trên `rgba(229,51,75,.10)` =
  **3,20:1**, "Sẵn sàng sử dụng" `#059669` trên `rgba(5,150,105,.20)` = **2,95:1**.
  Cả hai 13px/500, tức chữ THƯỜNG, ngưỡng 4,5.
  Khuôn gây lỗi: **tô 10–20% CHÍNH màu chữ lên nền rồi đặt màu đó lên trên**. Nền càng
  đậm thì chữ càng chìm, mà nó vẫn "hợp tông" nên không ai nghi. Bảng lofi có sẵn cặp
  tint ĐỤC cho đúng hai vai này: `#CF2338` trên `#FFF1F3` = **4,84** · `#047857`
  trên `#E7F6F0` = **4,92**. Đây cũng là lần đầu nhóm sanguine/ochre có bề mặt dùng.
  **PHÉP ĐO ĐẦU CỦA TÔI BÁO OAN BA CHỖ, và cả ba vì cùng một thiếu sót:** nó lấy nền
  `body` thay vì nền tổ tiên đã hợp thành, nên một chip `rgba(x,.1)` ra tương phản
  **1,00** (màu chữ so với chính nó). Và nó không xét CỠ/ĐỘ ĐẬM: chữ logo 20px **bold**
  là chữ LỚN (≥18,66px + bold), ngưỡng **3:1**, đo được 4,47 và 3,70 ⇒ **ĐẠT**. Tôi suýt
  báo cáo ba lỗi không có thật. Phép đo tương phản phải hợp thành alpha VÀ đọc
  `fontSize`/`fontWeight`, nếu không nó vừa báo oan vừa bỏ sót.
  **CA TEST CỦA CHÍNH NÓ ĐỎ OAN NGAY LẦN ĐẦU:** regex dựng từ template literal —
  ``\.${ten}\s*\{`` trong template là escape của ký tự thường, ra `.tagReds*{`. Đúng
  bẫy "viết regex THẲNG, đừng dựng từ chuỗi" đã ghi ở ca thanh sticky. Nay dùng
  `indexOf` + `split`, không regex.
  Ablate 4 chiều, mỗi chiều **1 đỏ**: trả `.tagRed` về nền alpha · trả `.tagOk` về cặp
  cũ · đổi TÊN lớp (ca nói thẳng "đổi tên thì sửa ca này") · hạ `--ds-ochre` xuống dưới
  AA. **Cả bốn đều kiểm chuỗi ĐÃ vào file rồi mới chạy** — hai vòng trước tôi có hai phép
  ablate trượt mà vẫn đọc "0 đỏ" như một kết quả.
  **GIỚI HẠN:** ca đọc CSS TĨNH, nên nó mù với chip tô màu bằng `style={{…}}` trong TSX.

- **TRANG KHOÁ HỌC: grep nói 128 chỗ brand, trình duyệt nói 22 — và chỉ 22 mới đáng sửa.**
  Trang này nạp **8 file CSS tĩnh** cộng `CourseShell.module.css`. Đếm bằng grep các
  token brand ra **128** (edu-theme 84 · edu-dashboard 29 · edu-course-detail 10 ·
  course_detail 3 · CourseShell 2). Quét MỌI phần tử đang **VẼ RA** màu brand trong
  trình duyệt thì chỉ **22**, vì phần lớn selector của edu-theme/edu-dashboard là
  dashboard/forum/roadmap di sản Django mà không trang nào render — đúng bài học
  "61 chỗ là con số của grep, không phải con số của người học", lần này tỉ lệ là 6:1.
  22 chỗ đó: nút **"Bắt đầu học"** (gradient `#1f5fe0→#4f8dff` + bóng xanh) · 5 biểu
  tượng `#2563eb` · 8 chấm mục tiêu · 4 thẻ dính `--edu-sheen` · 3 chữ logo.
  **CHỮ LOGO GIỮ NGUYÊN, có chủ đích:** đó là BẢN SẮC, không phải bảng giao diện. Đổi
  nó là đổi thương hiệu, một quyết định của chủ dự án chứ không của vòng lặp.
  **Và nó KHÔNG trượt AA như phép đo đầu của tôi báo:** 20px **bold** là chữ LỚN
  (≥18,66px + bold ⇒ ngưỡng 3:1), đo được 4,47 và 3,70 — đạt.
  `--edu-sheen` thì brand NHẠT vẫn là brand: hai radial `rgba(37,99,235,.06)` +
  `rgba(229,51,75,.04)` phủ lên 4 thẻ LỚN (thẻ cao nhất **2 296px**). Giữ vệt sáng
  trắng góc trên-trái (nó tạo chiều sâu, không mang màu), bỏ hai radial màu.
  **MỘT THỨ ĐÃ ĐO VÀ BÁC, đừng đi tìm lại:** nhìn ảnh chụp thì trang như còn một dải
  hồng/xanh. Quét mọi mảng > 40 000 px² và cả pseudo-element: **không có mesh nào** —
  `body` đã là dốc trung tính `#f7fafd → #eaeff6 → #e4eaf4`. Cái mắt thấy là vệt
  sáng của `--edu-sheen` trên bốn thẻ cộng thanh đầu trang, không phải nền.
  **Cổng nay là một DANH SÁCH CHỈ ĐƯỢC DÀI THÊM** (`DA_SANG_LOFI`): mỗi vòng chuyển
  xong một bề mặt thì thêm một dòng, không bao giờ bớt. Ca cũ chỉ canh trang chủ, nên
  nó im lặng với đúng trang mà người học bấm vào tiếp theo.
  Ablate 3 chiều, mỗi chiều **1 đỏ**: trả gradient brand vào nút "Bắt đầu học" · trả
  chấm mục tiêu về `--edu-accent` · trả outline của `CourseShell` về `--edu-accent`.
  Số ca KHÔNG đổi (524) vì đây là mở rộng ca sẵn có, không phải ca mới — một vòng
  thêm phạm vi mà không thêm con số là chuyện bình thường, đừng bịa một ca để bảng đẹp.

  **Còn lại của hệ `--ds-*`:** main mới chỉ lấy nhóm CODE. 58 token còn lại (giấy, thẻ,
  nút, tím/đỏ/lục, bán kính, bóng) vẫn ở nhánh `test`. Port tiếp thì theo đúng luật này:
  **mỗi vòng token + nối ít nhất một bề mặt THẬT**, không thêm token suông — thêm token mà
  chưa mặt nào dùng là đúng lỗi thống trị của repo, lần thứ mười ba.

- **BÊ GIAO DIỆN TỪ NHÁNH KHÁC LÀ BÊ CẢ NHỮNG BẢN SỬA MÀ NHÁNH ĐÓ CHƯA CÓ — và tôi
  push mà không chạy bậc thang.** 4d5f86d chép nguyên trang chủ Góc học + `CourseDetail`
  + `CourseShell` từ `tester/test` (commit cuối 22/10). Main đi trước nhánh đó 170 commit,
  nên bản chép VIẾT ĐÈ những bản sửa main đã có sau ngày ấy. Bộ test frontend đỏ **6 ca ở 4
  file**, cổng tài nguyên chết **2 lỗi**, và không cái nào được chạy trước khi push:
  · `course-resume` 3 đỏ — `CourseDetail` của `test` ghim lại module 0: đóng bài là rơi về
    đầu khoá 179 bài, đúng lỗi NĂM người thử báo ngày 27/10. Khối đọc `?lesson=` + effect
    cuộn RIÊNG đã đưa về; và một ca mới đòi hàng bài mang id mà effect tìm — bản chép mất
    đúng cái id đó mà không ca nào đỏ (ablate trước khi có ca: **0 đỏ**);
  · `feedback-link` 1 đỏ — trang chủ mới KHÔNG có đường tới form góp ý, tức cửa vào của
    người thử mất kênh góp ý. Nay link nằm dưới thẻ "Khoá đang học";
  · `review-quiz` 1 đỏ, và đỏ vì lý do SAI: regex khớp chữ `apiFetch` trong một CHÚ THÍCH.
    Nhưng tính chất ca ấy khẳng định ("trang công khai không có đường tới API") thì đúng là
    đã sai — nên viết lại theo hợp đồng mới chứ không chỉ bóc chú thích;
  · `ds-contrast` 1 đỏ — `home.module.css` thành file chết (chỉ `CatalogTile.tsx` import, mà
    `CatalogTile` không ai dùng; cổng tài nguyên chết MIỄN `app/` nên không thấy). Xoá cả
    hai cùng `skeleton.css` + `course_detail.css` (2 lỗi của cổng). Ca chip gỡ theo, dòng
    `DA_SANG_LOFI` trỏ sang `goc-hoc/scene.css` để danh sách không ngắn lại.
  **Và phép thay chữ hàng loạt làm hỏng CHÚ THÍCH:** `s/apiFetchSessionOnly/apiFetch/g` biến
  câu giải thích thành *"Dùng `apiFetch`, không dùng `apiFetch`"* ở hai file. Thay tên một
  hàm thì đọc lại mọi câu văn chứa nó.
  **Luật rút ra: bê từ nhánh khác thì chạy CẢ bộ unit + bốn cổng TRƯỚC khi push**, vì thứ bị
  viết đè là thứ bên kia không biết là có.

- **ĐO ĐỘ GIẬT CỦA TRANG CHỦ: ba cách đo đã nói dối, và một cách thì không.**
  Trang chủ Góc học bận 98% luồng chính khi ĐỨNG YÊN trên điện thoại giả lập (390×844,
  CPU 4×); 2059211 hạ còn ~62%. Ba bẫy của chính phép đo, đều đã cắn trong vòng đó:
  · **Đếm fps bằng rAF tự làm hỏng phép đo**: rAF ép luồng chính dựng một khung MỖI
    vsync, mà khung nào luồng chính dựng thì nó tính lại style cho MỌI phần tử đang
    chạy hoạt ảnh (~147 ở đây). Đầu dò đúng: đếm nhịp trống bằng vòng `MessageChannel`
    trong 2 giây, so với sàn "dừng hết hoạt ảnh" (`dau-do.js` của vòng đó).
  · **`tom.mjs` chọn renderer BẬN NHẤT, và đó có thể là tab khác.** Một tab cũ của
    agent còn mở trang chủ production chạy vòng rAF, nên phép đo "sau sửa" đọc ra rAF
    142 ms/s trong khi trang đang đo có 0. Lọc theo pid có URL đúng, hoặc đóng tab lạ.
  · **Vết cũ không có cờ `compositeFailed`** cho hoạt ảnh bắt đầu TRƯỚC khi ghi vết.
    Muốn biết hoạt ảnh nào không lên compositor: ghi vết rồi `cancel()`+`play()` mọi
    hoạt ảnh. Kết quả: chỉ mưa SVG (`fall`, mã 1024) hỏng.
  **Hai giả thuyết đã BÁC bằng số, đừng dựng lại:** (1) sự kiện `animationiteration`
  nổi lên React ép khung — đổi cả 145 hoạt ảnh sang WAAPI thì style còn TĂNG; (2) một
  nhóm là thủ phạm — dừng từng nhóm không nhóm nào hạ dưới 85%, mỗi nhóm CHẠY RIÊNG
  đều ăn nhịp tỉ lệ theo số phần tử. Nên luật thật là: **mọi hoạt ảnh đang chạy đều có
  giá, kể cả trên compositor** — dừng cái vô hình (sao ban ngày, mưa khi tạnh, bụi 2,7px
  trên điện thoại), và đừng để vòng rAF chạy khi không có gì đổi.
  **Còn lại là quyết định thiết kế:** 39 quầng sáng `breathe` + 54 bóng đèn `twk` là
  chính cảnh; mỗi nhóm một mình vẫn ăn ~45–60% nhịp trống.

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
  # Nạp CẢ KHOÁ: dùng --all. Dựng chuỗi 172 mã bằng shell là câu lệnh chỉ chạy
  # được trên bash, mà người nạp dùng PowerShell — đã hỏng hai lần vì chuyện đó.
  npx ts-node scripts/update-lesson-content.ts --all --apply --backup=bak.json
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
