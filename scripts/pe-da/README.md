# pe-da — 172 bài "Python cho Data Analyst"

Nội dung của khoá `python_advanced` đang chạy. Nguồn là gói giáo trình python-da
(biên soạn riêng, ngoài repo này); `source/course.json` là bản đã bỏ trường `html`
của gói đó — bản HTML dựng lại được từ `reading`, giữ lại chỉ làm file phình gấp đôi.

Hình dạng bài đích: [SCHEMA.md](SCHEMA.md). Khoá cũ 48 bài vẫn nằm ở
[../pe-v4/](../pe-v4/), giữ lại nhưng không còn xuất bản — xem AGENTS.md.

## Dựng và kiểm

```bash
py scripts/pe-da/build.py              # course.json -> out/ + chép 80 ảnh sang public/static/da/
py scripts/pe-da/check.py --strict     # cấu trúc (CI chạy bản này)
py scripts/pe-da/sync_curricula.py     # -> frontend/src/lib/curricula.json

npm i --no-save pyodide@0.27.7
node scripts/pe-da/check-pyodide.mjs            # cả 145 bài chạy được
node scripts/pe-da/check-pyodide.mjs NP02,VZ01 --verbose   # vài bài, in chi tiết
```

Số hiện tại: 172 bài · 10 module · 544 màn đọc · 655 câu luyện tập · 1 836 phút.
`check-pyodide.mjs`: 145 bài · 402 đoạn code · 0 hỏng · ~13 giây.

## Ba lớp kiểm, mỗi lớp bắt một loại lỗi

Bộ này là giáo trình ĐỌC, không có ca chấm đúng/sai của học viên. Nhưng nó có một
thứ kiểm được và quan trọng hơn: **mỗi đoạn code trong bài đều khai sẵn kết quả nó
in ra**. Lời giảng viết "Kết quả: 21" mà chạy thật ra 23 thì không ngoại lệ nào
được ném, không log nào đỏ — chỉ có học viên ngồi tự hỏi mình sai ở đâu.

1. **Dựng lại rồi so với bản đã commit.** `out/` là thứ được nạp vào DB. Sửa
   `build.py` mà quên commit bản dựng là hai nguồn nói hai chuyện.
2. **`check.py` — cấu trúc.** `sort_order` liên tục 1…172 (bài tra theo
   `(course_id, sort_order)`, một lỗ hổng là một bài không mở được); số câu luyện
   tập khớp nguồn; hình trỏ tới file có thật và là PNG; loại khối nằm trong năm
   loại renderer dựng được; nút Chạy chỉ hiện ở bài chạy được.
3. **`check-pyodide.mjs` — nội dung.** Chạy code từng bài trong CHÍNH Pyodide
   0.27.7 và CHÍNH `frontend/public/static/js/studio-harness.py` của trình duyệt,
   so kết quả in ra với `expected`.

Chạy **dồn theo bài**, không rời từng đoạn: bản code người học đọc (`displayCode`)
viết để chạy nối tiếp — đoạn 2 của NP02 dùng `np` mà chỉ đoạn 1 mới
`import numpy as np`. Chạy rời là tự tạo ra lỗi không có thật.

## Vì sao lớp 3 không thừa

Gói gốc kiểm nội dung trên **matplotlib 3.11.2 / numpy 2.5.4 / pandas 3.1.0**
(`requirements-tested.txt` của nó), còn nền tảng chạy **3.8.4 / 2.0.2 / 2.2.3** —
lệch một major ở pandas. Dòng "641 đoạn đạt, 0 lỗi" trong README của gói đúng với
nền của họ, không nói gì về nền này.

Lớp 3 tìm ra hai chỗ khoảng lệch đó cắn: VZ07 (`ax.boxplot(tick_labels=…)` cần
matplotlib ≥ 3.9) và VZ03 (`fig.autofmt_xdate()` xung đột `layout="constrained"`
ở 3.8.4, in UserWarning chen vào giữa kết quả bài ghi). Chúng nằm trong hằng
`LECH_PHIEN_BAN` của `build.py` kèm lý do — **sửa nội dung xong thì xoá dòng tương
ứng**, đừng để nó thành danh sách bỏ qua cho yên chuyện.

## Nạp vào DB

`scripts/seed-python-da.ts` — chạy thử trước, `--apply` phải kèm `--backup`. Nó
XOÁ `lesson_progress` của khoá: đúng khi thay cả khoá, sai khi chỉ sửa vài chữ.
Sửa nội dung vài bài thì dùng `scripts/update-lesson-content.ts` (đường nạp an
toàn, không đụng tiến độ). Sau MỌI lần nạp vẫn phải chạy `sync_curricula.py`.

## Những gì bộ này KHÔNG có

Không trắc nghiệm, không scaffold, không ca chấm code học viên — nguồn không có
và build **không tự sinh**. Hệ quả phải nhớ:

- **Quiz ôn tập không còn kho câu hỏi.** `QuizzesService.collectQuestions()` đọc
  `content_json.step_2.mcq`; không bài nào có thì kho luôn dưới `MIN_POOL = 5`.
- **Không có bài cửa tự kiểm tra** (`step_4.gate`) — không có lời giải nào để giữ.
- 10 "hình" của VZ20–VZ22/VZ26 là file HTML Plotly 4,7 MB mỗi cái, không chép sang
  repo; lời giảng bốn bài đó mô tả biểu đồ bằng chữ, và chúng vốn thuộc nhóm phải
  chạy trên máy vì plotly không có wheel.
