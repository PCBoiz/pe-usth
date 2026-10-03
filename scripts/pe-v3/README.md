# Giáo trình Python v3 — 40 bài PE (B01–B20, I01–I12, N01–N08)

Khoá `python` dùng đúng 40 nhiệm vụ bắt buộc của **PE_Python_v3_Toan_bo_40_bai_code.pdf**
(30.09.2026), theo roadmap 9 chặng: Cơ bản 20 bài → Trung cấp 12 → Nâng cao 8, với 5 cửa
tự kiểm tra B20, I07, I12, N04, N08 (Ex1–Ex5 của final-2026).

Không có gói JSON bàn giao nên không có bộ chuyển đổi tự động như v2: nội dung được soạn
tay từ PDF thành dữ liệu Python, rồi dựng ra `content_json` (schema `studio-lesson/v1`).

## Chạy

```bash
# 1. Dựng nội dung -> out/
python scripts/pe-v3/build.py

# 2. Chấm thử bằng CHÍNH Pyodide + bộ chấm của trình duyệt (bắt buộc đạt)
npm i --no-save pyodide@0.27.7        # nếu chưa có
node scripts/pe-v3/check-pyodide.mjs  # thêm --verbose hoặc B07,N06 để xem chi tiết

# 3. Nạp vào DB (mặc định CHẠY THỬ, --apply mới ghi)
npx ts-node scripts/seed-pe-v3.ts
npx ts-node scripts/seed-pe-v3.ts --apply
```

`check-pyodide.mjs` kiểm ba điều cho mỗi bài: lời giải mẫu đạt mọi ca; code khởi tạo
(khung trống) trượt ít nhất một ca; mỗi **biến thể sai** soạn kèm bài (đúng mục "Lỗi
thường gặp" của PDF: `strip()` thay `rstrip("\r\n")`, mode `"a"`, `return` trong `for`,
list dùng chung, `str(self)` đệ quy, `target=obj.compile()`, start/join cùng vòng, child
quên `_exit`, đo thời gian trước khi chờ…) đều bị bắt. Hiện tại: 233 ca, 110 biến thể.

## File

| File | Nội dung |
|---|---|
| `lessons_b1.py`, `lessons_b2.py` | B01–B10, B11–B20 |
| `lessons_i.py`, `lessons_n.py` | I01–I12, N01–N08 |
| `briefs.py` | Màn mở đầu "một màn" của 40 bài (B01–B20 theo Figma) |
| `support.py` | 4 file cấp sẵn của phụ lục (`language_base.py`, `c_language.py`, `thread_language.py`, `process_tools.py`) |
| `authoring.py` | Hàm viết tắt khi soạn ca chấm |
| `build.py` | Dựng `out/lessons.json`, `out/lessons/*.json`, `out/curriculum-python.json`, `out/qa.json` |
| `check-pyodide.mjs` | Chấm thử như trên |

Giáo trình hiển thị ở trang khoá học (`frontend/src/lib/curricula.json`, khối
`CURRICULA.python`) lấy từ `out/curriculum-python.json`.

## Màn mở đầu theo Figma

Màn đầu tiên của mỗi bài là `step_1.brief`, dựng bằng `LessonBrief`
(`frontend/src/components/lesson-chrome/`) theo Figma **"PE Python v3 — 20 bài cơ bản
B01–B20"** (file `Jvo3QKBu6VvtWutLL8UUT8`): nhãn `M1 / BÀI TẬP CƠ BẢN / B01` → tiêu đề →
mục tiêu → thẻ NHIỆM VỤ → DỰ ĐOÁN → khung `main.py` → CA KIỂM TRA CÔNG KHAI → GIẢI THÍCH
TRƯỚC KHI XEM ĐÁP ÁN. Chữ của B01–B20 chép nguyên văn từ 20 frame Figma (`briefs.py`);
I01–N08 chưa có trong Figma nên soạn cùng văn phong. Khung `LessonChrome` (thanh trên,
thanh tiến độ liền mảnh, 🔥 streak, nền `--st-page-bg`, thanh đáy "✓ Tiến độ tự lưu" + nút
480px) cũng theo frame đó. Khác Figma có chủ đích: số trên thanh tiến độ đếm **màn trong
bài** (vd. `1/12`), không phải vị trí bài trong khoá (`1/20`), vì thanh này còn dùng để bấm
quay lại màn đã qua; tên chặng `M1 · Dữ liệu và điều kiện` lấy từ frame "00 · Tổng quan".

## Ánh xạ PDF → màn Studio

| Studio | Lấy từ PDF |
|---|---|
| S1 Ngữ cảnh | Mục tiêu, Đề và ví dụ, Học trước, file cấp sẵn |
| S1 Giải thích | **Ví dụ minh hoạ soạn thêm** (cùng cơ chế, KHÁC dữ liệu đề — `code.kind = 'demo'`) + "Các bước chính" |
| S1 Ngộ nhận | "Lỗi thường gặp" ở phần đáp án dành cho dev |
| S1 Dự đoán | Câu "Dự đoán" của đề (phương án soạn thêm) |
| S2 Trắc nghiệm | "Ca riêng" và câu hỏi khái niệm — vào kho quiz ôn tập (`step_2.mcq`) |
| S2 Tự giải thích | "Giải thích trước khi xem đáp án"; lời giải thích mẫu (mức 2/2) chỉ hiện SAU khi học viên viết |
| S3 Lắp ghép | "Phần tự viết" + mồi nhử từ lỗi thường gặp. Cửa tự kiểm tra **không** có khung lắp ghép |
| S3 Nhật ký / Tái dự đoán | "Luồng dữ liệu" và "Dữ liệu mới" |
| S4 Sandbox | Đề + Thực hành, Ca công khai (`io`), "Giải thích từng hàm" → `contracts`, gợi ý 3 tầng, ca chấm = ca công khai + ca riêng |

Cửa tự kiểm tra (`step_4.gate`): nút "Xem lời giải mẫu" chỉ hiện sau lần nộp đầu; mở gợi ý
được ghi nhận "có hỗ trợ" (hiện ở màn tổng kết), đúng quy tắc "ghi assisted" của PDF.

## Bộ chấm trong trình duyệt

`frontend/public/static/js/studio-harness.py` chạy trong Pyodide (worker
`studio-lesson.worker.js` tải nó). Ca chấm vẫn là cặp biểu thức `call`/`expect` đánh giá
trong namespace của học viên, nhưng có thêm đối tượng `_studio`:

| Biểu thức | Ý nghĩa |
|---|---|
| `_studio.run(vars={'year': 2026})` | Chạy lại CẢ chương trình, thay vế phải của dòng gán cấp ngoài cùng `year = …` (qua cây cú pháp — `year=1991` hay `year = 1991` đều được). Bài cơ bản là script nên phải chấm kiểu này |
| `_studio.run(files={'data.txt': '…'})` | Thư mục chạy mới với fixture riêng; `.file('palindromes.txt')` đọc file kết quả, `.var('lines')` đọc biến, `.stdout` |
| `_studio.run(entry='main(3)')` | Nạp file như module (không chạy khối `__main__`) rồi gọi `entry`; `.value` là kết quả |
| `_studio.call(fn, *args)` | Gọi hàm, ghi lại `.value`, `.stdout`, `.error`, thread tạo ra |
| `_studio.write(name, text)` / `_studio.read(name)` | Tạo / đọc file trong thư mục của lần chạy chính |
| `_studio.check('assert …')` | Chạy khối lệnh trên bản sao namespace, đạt thì `True` |
| `_studio.expr('C("C", 1972, [], "C23")')` | Giá trị thay vào `vars` dưới dạng biểu thức |

**Thread**: Pyodide không mở được thread thật, nên `threading.Thread` được thay bằng bản
mô phỏng chạy target ngay khi `start()` và ghi thứ tự tạo/start/join. Ca chấm kiểm hợp đồng:
`thread_count`, `targets_callable`, `starts_before_joins`, `all_joined`, `threads[i].output`.

**fork**: mô phỏng bằng cách chạy lại chương trình — lần chạy thứ k nhận 0 ở lời gọi fork thứ
k (thành child), các lời gọi trước nhận PID như parent. Nhờ vậy bắt được child quên `_exit`
(chạy tiếp code của parent, sinh process cháu), parent không `waitpid`, chờ trong vòng tạo.
`child_exit={1: 1}` ép child thứ 2 thoát mã 1; `fail_fork_at=1` làm fork lần 2 báo `OSError`.
Đồng hồ `time.time` cộng thêm thời gian ảo mỗi lần fork/chờ để chấm "đo bao trùm vòng đời
child" (`measured_lifecycle`) mà không chấm một con số cố định.

Đây là **mô phỏng để luyện tập**: bài N05–N08 vẫn cần nghiệm thu thật bằng script trên
Linux/WSL (màn sandbox nói rõ điều này). Bộ chấm chạy trong trình duyệt của học viên nên
không phải hệ thống chấm thi chống gian lận.

## Nạp vào DB — chuyện gì xảy ra với giáo trình cũ

Mặc định `seed-pe-v3.ts` **không xoá gì**: bài cũ được dời sang `sort_order = 1000 + số cũ`
cùng `lesson_progress`, và tiến độ khoá / `syncLessonCount` chỉ tính bài có `sort_order < 1000`.

Thêm `--delete-old` thì **xoá hẳn** mọi bài cũ của khoá python và mọi dòng `lesson_progress`
của khoá, đặt lại tiến độ ghi danh về 0 (XP/gems/streak đã cộng ở bảng `users` giữ nguyên).
`--apply` bắt buộc kèm `--backup=<file.json>` — bản sao được ghi trước khi xoá:

```bash
npx ts-node scripts/seed-pe-v3.ts --delete-old                                   # xem trước
npx ts-node scripts/seed-pe-v3.ts --delete-old --apply --backup=python-backup.json
```

Ngày 03.10.2026 đã chạy chế độ này: xoá 120 dòng bài cũ (92 bài v2, bài dựng tay và các
dòng cũ hơn) cùng 131 dòng tiến độ của 3 học viên; khoá python giờ đúng 40 bài v3.

Bài dựng tay List & Mutability (PythonStudio.tsx) không thuộc v3: chỉ mở bằng
`/lesson/python?demo=list` (lối tắt cho admin ở trang khoá học) và không ghi tiến độ.
