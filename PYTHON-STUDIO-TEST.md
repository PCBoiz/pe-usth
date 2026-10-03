# Python Studio — kiểm thử local

Mở http://localhost:3000/lesson/python sau khi đăng nhập.

Tài khoản test riêng đã tạo: `python.studio.20260918@example.com` / `PythonStudio!2026`.
Tài khoản này đã hoàn thành bài trong lượt kiểm thử. Dùng tài khoản khác để kiểm tra lần hoàn thành đầu tiên.

## Chạy ứng dụng

Backend, tại `D:\EDU\demo_web`: `npm run build`, sau đó `npm run start:prod`.
Frontend, tại `D:\EDU\demo_web\frontend`: `npm run dev`.
Frontend mặc định gọi backend http://localhost:5000; đổi bằng `NEXT_PUBLIC_API_URL` nếu cần.
Giữ cấu hình database và JWT hiện có trong `.env`. Không cần migration hay seed lại dữ liệu.

## Phạm vi

- Bài demo dựng tay (List & Mutability, mở bằng `/lesson/python?demo=list`, chỉ admin thấy lối tắt ở trang khoá học, **không ghi tiến độ**): 4 màn hình S1–S4 trong Figma cũ — dự đoán, câu hỏi/phân loại, lắp ghép và mô phỏng bộ nhớ, sandbox Python. Nhãn theo Figma: S1 `Python 3.12`, S2 `CPython 3.11` (hổ phách), S3 `Python 3.12.2`, S4 `CPython 3.12` (Pyodide 0.27.7 chạy CPython 3.12). S2 có `Bước 1 đã xong • FACT Stage II`; S3 có thanh stepper S1–S4, thu gọn còn ô đánh dấu khi màn hình dưới 900px.
- Bài đọc từ `content_json`: dùng khung **LessonChrome** (xem trước đủ 27 dạng màn ở `/admin/lesson-chrome-demo`) — thanh tiến độ trên đầu, mỗi phần của bài là MỘT màn, một nút CTA dưới đáy đổi theo ngữ cảnh: `Tiếp tục` cho màn đọc, `Kiểm tra` → `Tiếp tục`/`Thử lại` cho màn có chấm, `Nộp & Chấm điểm` ở sandbox, rồi màn tổng kết. Bấm vào đoạn đã đi qua trên thanh tiến độ để xem lại màn cũ.
- Khoá `python` có **40 bài PE Python v3** (B01–B20 cơ bản, I01–I12 trung cấp, N01–N08 nâng cao; 9 chặng), soạn từ PDF trong `scripts/pe-v3` và nạp bằng `scripts/seed-pe-v3.ts` (xem `scripts/pe-v3/README.md`). Đường dẫn dùng chỉ số từ 0: bài B01 là `?lesson=0`, N08 là `?lesson=39`; `/lesson/python` không tham số mở bài 1. Mọi bài render từ `lessons.content_json`, hoàn thành ghi đúng `sort_order` của bài đang học. Bài cũ (v2) và toàn bộ tiến độ học python cũ đã bị xoá ngày 03.10.2026 (`seed-pe-v3.ts --delete-old`). Bài chưa có nội dung hiện trạng thái "Đang biên soạn".
- `/courses/python` có nút mở Studio riêng để tiện test, kể cả khi chưa học đủ các bài trước.
- Bài demo dựng tay: tài khoản `role = 'admin'` thấy nút "Gợi ý + đáp án (admin)" ở footer; popup kèm bảng đáp án đủ 4 bước. Bài đọc từ `content_json` có nút "💡 Gợi ý" ở thanh dưới của màn sandbox, mở bảng gợi ý 3 tầng (`step_4.hints`) — bấm từng tầng để mở. Với admin, mọi màn có chấm (dự đoán, trắc nghiệm, phân loại, tự giải thích, lắp ghép, tái dự đoán, sandbox) có thêm khung "ADMIN · Đáp án màn này" (thu gọn sẵn) dưới thẻ, kèm nút "Điền sẵn đáp án vào màn này" để đi nhanh qua bài. Bài v3 có lời giải thích mẫu cho ô tự giải thích; học viên chỉ thấy nó sau khi đã viết và bấm Kiểm tra.
- **Bài PE v3**: màn đầu là màn tổng quan "một màn" theo Figma PE Python v3 (nhãn `M1 / BÀI TẬP CƠ BẢN / B01`, NHIỆM VỤ, DỰ ĐOÁN, khung `main.py`, 2 ca công khai, câu giải thích) — bấm "Tiếp tục →" để vào các màn luyện; màn sandbox có thêm "Hợp đồng hàm" và "File trong thư mục bài" (gập sẵn, chỉ đọc — `language_base.py`, `data.txt`…). Bài thread (N01–N04) và fork (N05–N08) chạy bản **mô phỏng** trong trình duyệt và ghi chú rõ điều đó; console in thêm dòng `[mô phỏng thread]`/`[mô phỏng fork]`. Năm **cửa tự kiểm tra** (B20, I07, I12, N04, N08): không có khung lắp ghép, nút "Xem lời giải mẫu" chỉ hiện sau lần nộp đầu, mở gợi ý thì màn tổng kết ghi "có hỗ trợ".
- **Bài quy trình** (dựng môi trường, Git, MySQL… — `step_4.procedure`) không có mã Python để chạy nên màn S4 hiện khối "Quy trình tham chiếu" (ẩn sẵn, bấm mới mở) thay cho ô soạn mã và console.
- Màn tổng kết: bài đã hoàn thành thì nút chính là **"Bài N+1 →"** (bài cuối khoá thì "Về khóa học"); chưa xong thì nút chỉ ra màn còn thiếu và không cho kết thúc bài. Nộp bài đạt ở sandbox sẽ tự chuyển sang màn tổng kết.
- Ô **tự giải thích**: bài có rubric từ khoá thì phải khớp đủ các ý; bài không khai rubric (phần lớn bài PE) yêu cầu tối thiểu 12 từ / 60 ký tự để không gõ cho có — ngưỡng ở `SELF_EXPLAIN_MIN` (`frontend/src/lib/studio-lesson.ts`).
- Bài render từ `content_json` mà **không có `step_4.tests`** (bài lab desktop hoặc bài quy trình) không chấm được trong trình duyệt, nên màn tổng kết có nút "Đánh dấu đã hoàn thành"; bài có test vẫn chỉ hoàn thành qua đường Nộp & Chấm điểm (chạy thử đạt hết KHÔNG tính là nộp).
- Bản nháp lưu trên trình duyệt theo tài khoản, bao gồm bước học, đáp án và code. Hoàn thành, điểm quiz, XP và streak lưu trên backend hiện có. Không đồng bộ bản nháp giữa các thiết bị.
- XP lấy theo cấu hình bài trên backend; không dùng số +80/−30 minh họa trong Figma. Xem lời giải mẫu không tự ý trừ XP. Nộp lại không cộng XP lần hai.
- S3 dùng `result = []` để lọc đúng. `copy()` và `list(data)` tạo bản sao nhưng giữ cả dữ liệu dưới ngưỡng; có phản hồi riêng. Địa chỉ heap là nhãn mô phỏng để minh họa.
- S4 chạy Python thật bằng Pyodide 0.27.7 trong Web Worker, lần đầu cần mạng để tải runtime. Giới hạn tải 60 giây, thực thi 5 giây, có nút dừng. Không chạy mã học viên trong tiến trình backend.
- Chấm bài ở trình duyệt phục vụ thực hành; API hoàn thành dùng cơ chế hiện có, chưa phải hệ thống chấm thi chống gian lận phía server.

## Checklist

Kiểm thử tự động: chạy `node scripts/test-python-studio.cjs` từ thư mục project khi hai server đang chạy. Bộ test dùng Edge headless và tài khoản test riêng ở trên, lưu ảnh vào `python-studio-qa/`.

1. Mở Studio, đăng ký Python nếu chưa đăng ký. Dự đoán ở S1 rồi xác nhận để mở giải thích.
2. S2 chọn B; đưa append/extend/sort/pop vào In-place, còn lại vào Pure; giải thích đủ ý tham chiếu và mutable.
3. S3 chọn `result = []`, `if val >= threshold:`, `result.append(val)`; chạy từng bước hoặc chạy hết; dự đoán 2 phần tử.
4. S4 thử lời giải sai, code lỗi cú pháp, vòng lặp vô hạn, rồi viết lời giải đúng. Chạy thử chỉ kiểm tra; Nộp & Chấm điểm kiểm tra 5 trường hợp và lưu khi tất cả đạt.
5. Tải lại: code và bước học còn nguyên, trạng thái hoàn thành lấy lại từ backend. Nộp lại: XP không tăng.
6. Về trang khóa học: đúng bài vừa học được đánh dấu hoàn thành; không đánh dấu nhầm bài 1. Bài demo dựng tay không ghi tiến độ.

Lời giải tham khảo:

```python
def clean_and_boost_scores(raw_scores, bonus):
    return [round(x + bonus, 2) for x in raw_scores if x >= 0]
```
