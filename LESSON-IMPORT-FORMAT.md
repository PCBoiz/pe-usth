# Nhập bài học Python từ Markdown (và PDF, có giới hạn)

Tài liệu soạn theo mẫu dưới đây được đọc thành một bài `studio-lesson/v1` rồi ghi vào
cột `lessons.content_json`; Studio đọc trực tiếp từ đó.

File mẫu chạy được: [`samples/lesson-fstring.md`](samples/lesson-fstring.md). Các file
mẫu dùng cho bộ test nằm ở `src/course-admin/__fixtures__/` — cả bản ĐÚNG lẫn bản SAI,
mỗi bản sai minh hoạ một luật.

## CHỈ parse theo mẫu — không có AI

Nhánh Gemini dự phòng **đã gỡ hẳn**. File lệch mẫu bị **TỪ CHỐI** kèm danh sách lỗi chỉ
rõ thiếu gì ở phần nào, chứ hệ thống không đoán: nội dung bài học là thứ phải ĐÚNG, mà
một bộ suy đoán thì không nói được nó đã bịa ở chỗ nào.

Hợp đồng của bộ parse: **không có lỗi ⇒ bài đã qua `validateStudioLesson()`**, đúng cửa
mà hai đường nạp DB (`planLessonInserts`, `planContentUpdates`) đi qua.

## Hai đường vào

| Đường | Trạng thái |
|---|---|
| `scripts/import-lesson.ts` | **Dùng được hôm nay.** Xem trước → lưu, từ dòng lệnh. |
| `POST /api/admin/lessons/import` | Có sẵn, `AdminGuard` có sẵn — nhưng **chưa trang nào gọi**. Trang /admin để sau khi merge. |

```bash
# 1. Kiểm file, không cần DB
npx ts-node scripts/import-lesson.ts --file=bai.md --offline

# 2. XEM TRƯỚC (đọc DB, không ghi): bài mới hay bài đã có, đổi những gì
npx ts-node scripts/import-lesson.ts --file=bai.md --code=TH01 --sort=173

# 3. Ghi thật — bài MỚI
npx ts-node scripts/import-lesson.ts --file=bai.md --code=TH01 --sort=173 --apply

# 3'. Ghi thật — bài ĐÃ CÓ (ghi đè nội dung cũ ⇒ bắt buộc --backup)
npx ts-node scripts/import-lesson.ts --file=bai.md --code=PY01 --apply --backup=bak.json
```

Cờ khác: `--course=` (mặc định `python_advanced`), `--module=`, `--minutes=`, `--xp=`.

Script KHÔNG có đường ghi DB riêng: bài mới đi qua `planLessonInserts`
(`src/course-admin/lesson-insert.ts`), bài đã có đi qua `planContentUpdates`
(`lesson-content-update.ts`) — đúng hai hàm mà `add-lessons.ts` và
`update-lesson-content.ts` dùng, nên mọi luật an toàn của chúng áp luôn cho đường nhập.
`lesson_progress`, `enrollments`, `courses`: không đụng.

> **Bài MỚI phải có phần `## Đọc`.** Luật 6 của `planLessonInserts` đòi bài mang
> `step_1.read` (bộ pe-da) hoặc `play` (bộ pe-v4) — nó chặn "gói dựng dở". Bài chỉ có
> S1…S4 **không TẠO MỚI được**; nó chỉ CẬP NHẬT lên một bài đã tồn tại. Script nói rõ
> điều này khi gặp.

## PDF dùng được tới đâu — đo thật, không phỏng đoán

### Thụt lề: khôi phục TỪ TOẠ ĐỘ CHỮ, không còn mất

`pdf-parse.getText()` bóc văn bản PHẲNG — mọi khoảng trắng đầu dòng biến mất, thân hàm
Python về cột 0. Nhưng pdfjs trả kèm **toạ độ x, y của từng mẩu chữ**, nên trong một tài
liệu dựng bằng font ĐỀU BỀ (monospace), cột của một mẩu chữ là một phép chia chứ không
phải một phỏng đoán:

```
cột = (x của mẩu chữ − x nhỏ nhất của font đó) / bề rộng một ký tự
```

Cả hai số đều ĐO ĐƯỢC từ chính file. Đo trên `samples/lesson-fstring.pdf`: 1 294 mẩu
chữ, **1 901 phép đo bề rộng, 100% ra 4,951 pt** ⇒ một lưới chữ đều bề. Văn bản dựng
lại trùng bản `.md` gốc ở **110/114 dòng**, và cả bốn dòng lệch đều là dòng dài hơn bề
rộng trang (xem dưới).

| Phần | Kết quả |
|---|---|
| Heading `#`, `##`, `###` | **giữ nguyên** |
| Đoạn văn | giữ nguyên |
| Dòng trống giữa các đoạn | **dựng lại được** (suy từ khoảng cách dòng) |
| Bảng Markdown (`\| … \|`) | **giữ nguyên** |
| Danh sách `- [x] …` | giữ nguyên |
| **Thụt lề trong code** | **giữ nguyên** (font đều bề) / **mất** (font tỉ lệ → file bị từ chối) |
| Dòng dài | **bị cắt làm hai** theo bề rộng trang — KHÔNG chữa được |
| Rác phân trang `-- 1 of 2 --` | chỉ có ở đường dự phòng; `bocRacPdf()` dọn |

Kết quả: bài parse từ `samples/lesson-fstring.pdf` cho ra `step_1`, `step_3`, `step_4`
**y hệt** bản parse từ `samples/lesson-fstring.md` — cùng `step_4.tests`, cùng
`step_3.scaffold.slots`, cùng từng ký tự của `starterCode` / `solutionCode`. Lệch duy
nhất nằm ở `step_2.classify` và nó là lỗi CẮT DÒNG, không phải lỗi thụt lề.

### Font TỈ LỆ: nói không, chứ không đoán

Phép chia trên chỉ đúng với font đều bề. Đo không ra lưới ấy (dưới 90% phép đo trùng
nhau, hoặc dưới 20 phép đo) thì đường nhập **quay về bản bóc phẳng của `pdf-parse`** —
tức đúng hành vi cũ, và `kiemThutLe()` từ chối file như trước. Đó là cố ý: một bộ bóc
"gần đúng" đưa code sai thụt lề vào bài học TỆ HƠN một lời từ chối thẳng, vì
`IndentationError` ở tay học viên là lỗi không ai truy ngược về PDF được.

Cùng lý do, `rutLeKhoiMa()` rút lề chung của mỗi khối ```…``` về 0: một bộ xuất PDF đóng
khung khối mã cho ra cả khối thụt ĐỀU, mà thụt đều thì `kiemThutLe()` không thấy gì sai
(quan hệ giữa các dòng vẫn đúng) còn Python thì ném `IndentationError` ngay dòng đầu.

### Cắt dòng dài: vẫn chưa chữa được

Toạ độ **không** chữa được việc PDF ngắt dòng theo bề rộng trang: dòng tiếp theo của một
dòng bị cắt nằm ở đúng cột 0 như một dòng mới thật, không dấu hiệu nào phân biệt. Trong
file mẫu, thẻ phân loại `` `f"{x!r}"` `` bị cắt làm hai nên vào bài thành `f"` mà không
lỗi nào được ném. Vì vậy mọi lần nhập từ PDF vẫn kèm **một cảnh báo chung** và bắt buộc
đọc lại bản xem trước từng dòng.

**Kết luận: PDF nay nhập được cả bài CÓ code Python nhiều dòng, miễn là tài liệu dùng
font đều bề (mọi bản xuất từ Markdown đều vậy). Dòng dài vẫn là chỗ phải soi bằng mắt.**
PDF scan (chỉ có ảnh) bị từ chối thẳng — không có OCR.

## Mẫu Markdown

Mỗi bước là một heading `## S<n> <tên gì cũng được>`; thêm `## Đọc` cho phần bài đọc.
Phần nào không có thì bỏ luôn.

Studio **không** hiện mỗi bước một trang: từng phần bên dưới (mỗi màn đọc, ngữ cảnh,
giải thích, ngộ nhận, mỗi câu trắc nghiệm, phân loại, tự giải thích, khung lắp ghép,
nhật ký, sandbox) là MỘT màn riêng, cuối cùng thêm màn tổng kết. Thanh tiến độ đếm theo
số màn đó.

````markdown
# Tiêu đề bài học

## Đọc

### Tên màn đọc thứ nhất

Đoạn văn. Mỗi dòng trống mở một đoạn mới.

```python
import csv
print("code minh hoạ")
```

```output
kết quả in ra của đúng khối ngay trên
```

| Cột A | Cột B |
|---|---|
| ô 1 | ô 2 |

### Tên màn đọc thứ hai

```bash
head -3 diem.csv
```

## S1 Ngữ cảnh

Đoạn văn mô tả tình huống.

```python
print("code minh hoạ")
```

### Dự đoán
Câu hỏi đặt ra cho học viên?
- [ ] A. Tiêu đề lựa chọn — mô tả ngắn
- [x] B. Lựa chọn đúng — đánh dấu bằng [x]

### Giải thích
1. **Dòng 1**: giải thích cho dòng đó.
2. **Dòng 2**: giải thích tiếp.

### Ngộ nhận
**"Câu nói sai mà học viên hay tin"**
Giải thích vì sao sai.

### Bộ nhớ
```json
{ "heapAddr": "0x7fff892a0",
  "stack": [{ "label": "Scope Global", "name": "a", "ptr": "0x7fff892a0" }],
  "heap": { "type": "PyListObject", "refcount": 2,
            "cells": [{ "value": "85", "id": "0x1B0" }] },
  "assertion": ">>> id(a) == id(b)", "assertionResult": "True" }
```

## S2 Trắc nghiệm

Câu hỏi trắc nghiệm?
- [ ] A. Phương án sai — vì sao sai
- [x] B. Phương án đúng — vì sao đúng

### Phân loại
Câu dẫn cho phần kéo thả.
- key1 | Tên nhóm 1 | Phụ đề | Mô tả :: `thẻ A`, `thẻ B`
- key2 | Tên nhóm 2 | Phụ đề | Mô tả :: `thẻ C`

### Tự giải thích
Câu hỏi yêu cầu học viên viết lời giải thích?
- tên ý thứ nhất :: tu khoa 1, tu khoa 2
- tên ý thứ hai :: tu khoa 3

## S3 Lắp ghép

Mô tả nhiệm vụ.

```python
def ham(tham_so):
    {{slot1}}
    for x in tham_so:
        {{slot2}}
```

- slot1 = `result = []`
- slot2 = `result.append(x)`
- bank1 = `result = tham_so` (Bẫy Alias)

### Dự đoán kết quả
len(result) bằng bao nhiêu? [1 | *2 | 3]

### Nhật ký
- T0: trạng thái ban đầu
- T1: sau lệnh đầu tiên

## S4 Bài tập

Đề bài cho phần tự code.

### Code khởi tạo
```python
def solve(rows):
    return []
```

### Lời giải
```python
def solve(rows):
    return [r * 2 for r in rows]
```

### Gợi ý
- Nguyên lý :: nội dung gợi ý tầng 1
- Cấu trúc :: nội dung gợi ý tầng 2

### Test
| call | expect | name |
|------|--------|------|
| `solve([1, 2])` | `[2, 4]` | Nhân đôi |
| `solve([])` | `[]` | Danh sách rỗng |

### Cấm
- `.pop(`
- `import os`
````

## Quy ước cần nhớ

| Ký hiệu | Ý nghĩa |
|---|---|
| `- [x]` | Đáp án đúng. Mỗi phần trắc nghiệm phải có **đúng một** dấu `[x]`. |
| `—` `--` `\|` | Ngăn tiêu đề lựa chọn với phần mô tả. |
| `::` | Ngăn phần khai báo với danh sách giá trị (phân loại, rubric, gợi ý). |
| `{{slot1}}` | Chỗ trống trong khung lắp ghép. **Mỗi** `{{slotN}}` phải có một dòng `- slotN = …`. |
| `*` | Đánh dấu đáp án đúng trong `[a \| *b \| c]`. |
| Dòng văn xuôi trước danh sách | Là câu hỏi / câu dẫn của phần đó. |

### Khối trong phần `## Đọc`

Mỗi `### …` dưới `## Đọc` là **một màn**. Không có `###` nào thì cả phần là một màn.
Trong mỗi màn:

| Viết thế này | Thành khối |
|---|---|
| đoạn văn (ngăn nhau bằng dòng trống) | `paragraph` |
| ` ```python ` hoặc fence không ghi ngôn ngữ | `code` |
| ` ```bash ` `sh` `shell` `console` `terminal` `cmd` | `terminal` |
| ` ```output ` `text` `ketqua` | `expected` của khối **ngay trên** nó |
| bảng Markdown | `table` |

Màn đọc có SÁU loại khối, nhưng bộ nhập chỉ phát ra **bốn** loại trên: `figure` cần file
PNG cùng miền dưới `/static/` (tài liệu nhập vào không mang theo ảnh) và `diagram` là dữ
liệu có cấu trúc không rút được từ văn xuôi. Hai loại đó phải thêm bằng tay sau.

### Những gì bị TỪ CHỐI (và câu lỗi chỉ thẳng chỗ)

- Không có heading `## S1`…`## S4` lẫn `## Đọc` nào.
- Thiếu dòng `# <tên bài học>`.
- Heading `## S0`, `## S5`… — chỉ có S1..S4.
- Hai heading `## S<n>` trùng số.
- Trắc nghiệm / dự đoán có dưới 2 lựa chọn, không có `[x]`, hoặc có **nhiều hơn một** `[x]`.
- `{{slotN}}` không có dòng `- slotN = …`; khung lắp ghép không có `{{slot1}}` nào.
- `### Test` mà bảng không có dòng ca chấm nào.
- `### Bộ nhớ` có khối ```json hỏng.
- `### Code khởi tạo` / `### Lời giải` không có khối ```python.
- Mã Python **mất thụt lề** — lưới an toàn cuối cùng, xem phần PDF ở trên.
- Mọi lỗi của `validateStudioLesson` — cửa duy nhất vào DB.

Heading `###` mà bộ parse không hiểu thì ra **CẢNH BÁO**, không phải lỗi: phần đó không
vào bài, và nói ra vẫn hơn bỏ im lặng.

## Sau khi lưu

- `call` và `expect` trong bảng Test là **biểu thức Python chạy được**, đánh giá trong
  chính namespace của học viên (hợp đồng BIỂU THỨC). Bộ pe-da dùng hợp đồng thứ hai,
  DỮ LIỆU (`input` / `expected`) — mẫu Markdown này chưa sinh ra nó.
- `### Cấm` chặn theo chuỗi con trong mã nguồn. Viết cụ thể (`.format(` chứ đừng viết `%`,
  kẻo chặn luôn phép chia lấy dư).
- Trắc nghiệm nằm ở `step_2.mcq` nên tự động vào kho câu hỏi của quiz ôn tập
  (`QuizzesService.collectQuestions()` đọc đúng đường dẫn đó).
- **Số thứ tự bài** (`sort_order`) bắt đầu từ 1, còn đường dẫn dùng chỉ số từ 0: bài
  `sort_order = 10` mở bằng `/lesson/<khoá>?lesson=9`.
- Tạo bài mới làm ĐỔI số bài của khoá ⇒ phải chạy `py scripts/pe-da/sync_curricula.py`
  (xem bẫy "Hai nguồn danh sách bài" trong AGENTS.md).

## Kiểm thử

```bash
npx jest --ci src/course-admin/lesson-import.service.spec.ts   # 36 ca, file mẫu thật
npx ts-node scripts/import-lesson.ts --file=samples/lesson-fstring.md --offline
npx ts-node scripts/import-lesson.ts --file=samples/lesson-fstring.pdf --offline  # phải XANH
```

Nhánh ĐỌC file `.pdf` không chạy được dưới Jest: `pdfjs-dist` tự `import()` động để dựng
"fake worker", nên vm của Jest ném `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG`. Vì vậy
chia vai: `docMauChuPdf()` chỉ LẤY SỐ LIỆU ra (chạy thật bằng lệnh `--offline` ở trên),
còn mọi phép suy luận nằm ở `dungVanBanTuToaDo()` — hàm THUẦN, và Jest chấm nó bằng toạ
độ THẬT chụp từ chính file PDF. Ba bản chụp trong `__fixtures__/`:

| File | Là gì | Dùng để canh |
|---|---|---|
| `pdf-mau-chu.json` | toạ độ 1 294 mẩu chữ | phép dựng lại thụt lề |
| `pdf-boc-ra.txt` | văn bản dựng từ toạ độ (CÓ thụt lề) | bài ra giống bản `.md` |
| `pdf-boc-phang.txt` | `pdf-parse` bóc phẳng (đường dự phòng) | lưới an toàn vẫn từ chối |

Cả ba **sinh ra từ file PDF, không gõ tay** — gõ tay là tự viết dữ liệu chứng minh chính
mình. Sinh lại khi đổi phép bóc:

```bash
npx ts-node scripts/import-lesson.ts --file=samples/lesson-fstring.pdf \
  --offline --chup=src/course-admin/__fixtures__
```

`scripts/test-lesson-import.cjs` (Playwright, cần cả hai server) là bộ cũ: nó nhập
`samples/lesson-fstring.pdf` qua API và kỳ vọng thành công — nay điều đó lại ĐÚNG, nhưng
bộ ấy chưa được chạy lại từ đợt này.
