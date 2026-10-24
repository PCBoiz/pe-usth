# pe-da — đặc tả bài ĐỌC-HIỂU trong studio-lesson/v2

Khoá `python_advanced` đổi ruột: 48 bài pe-v4 (luồng bốn bước có chấm) ra, 172 bài
"Python cho Data Analyst" vào. Bộ mới là giáo trình ĐỌC: nguồn không có câu trắc
nghiệm, không có scaffold, không có bộ ca kiểm thử — nó có lời giảng, code kèm
kết quả in ra, và câu luyện tập kèm đáp án mẫu.

Nguyên tắc: **không bịa thêm gì vào nội dung**. Thiếu trắc nghiệm thì không tự
sinh trắc nghiệm; thiếu ca chấm thì sandbox chạy tự do, không giả vờ chấm.

## Hai khối mới

`buildScreens()` đã dựng màn theo điều kiện, nên chỉ cần khai thêm hai trường.

### `step_1.read` — bài đọc, chia sẵn thành màn

```ts
type ReadBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'code'; code: string; expected?: string }
  /** Lệnh gõ trong terminal (`python -m venv .venv`) — KHÔNG phải Python. */
  | { type: 'terminal'; code: string; expected?: string }
  /** Biểu đồ do chính đoạn code ngay trên vẽ ra. Luôn là PNG cùng miền. */
  | { type: 'figure'; src: string; alt: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

/** Mỗi phần tử là MỘT màn `read`; khâu build đã chia, renderer không chia lại. */
read?: ReadBlock[][];
```

Số khối thật trong bản dựng 172 bài: `paragraph` 738 · `code` 495 · `figure` 80
(26 bài) · `terminal` 21 (10 bài) · `table` 1.

**Năm loại, không phải ba.** Bản đặc tả đầu chỉ khai ba, build phát thêm
`terminal` và `figure` sau đó mà không ai sửa lại chỗ này — renderer viết theo
đặc tả nên 26 bài có hình sẽ ném TypeError ngay màn đọc. Vì vậy `ReadScreen`
phải phân nhánh bằng `switch (block.type)` có nhánh `default` ép kiểu `never`:
thêm loại khối mà quên renderer thì typecheck đỏ, chứ không phải trang trắng
trước mặt người học. `check.py` cũng chặn loại khối lạ.

`figure.src` **chỉ nhận `.png`**. Mười "hình" của VZ20–VZ22 và VZ26 là file
`.html` do Plotly xuất ra, mỗi file nhúng sẵn cả plotly.js (4,7 MB/hình, 46 MB
cho bốn bài) — vừa không hiện được trong `<img>`, vừa phình repo. Bốn bài đó
dùng plotly nên vốn đã thuộc nhóm phải chạy trên máy.

Vì sao chia ở khâu build chứ không ở renderer: luật chia là luật NỘI DUNG (một
màn = một ý được một đoạn code chứng minh), kiểm bằng Python dễ hơn kiểm trong
React, và chia cố định thì khoá `read-<i>` của bản nháp không đổi khi sửa CSS.

**Luật chia:** cắt một màn mới ngay TRƯỚC khối paragraph nào đứng sau một khối
code, nếu màn đang dựng đã có code. Hệ quả: mỗi màn có nhiều nhất một khối code,
kèm các đoạn dẫn trước nó và đoạn giải thích sau nó. Bảng đi cùng màn đang dựng.
Màn cuối gộp phần dư nếu nó chỉ còn một khối.

### `step_2.practice` — câu luyện tập có đáp án mẫu

```ts
type PracticeItem = {
  prompt: string;
  answer: string;
  answerCode?: string;
  answerExpected?: string;
};
practice?: PracticeItem[];
```

Mỗi câu một màn. KHÔNG chấm (`isGraded` trả false): học viên tự viết rồi bấm
"Xem đáp án". Đây là đúng hình dạng của nguồn — 516 câu đều là câu hỏi mở có lời
giải mẫu, không phải trắc nghiệm có phương án sai.

## `step_4` — sandbox hay hướng dẫn chạy trên máy

Quyết định theo `runnable.json` (do khâu kiểm code sinh ra), mỗi bài một trong ba:

| mode | step_4 phát ra | Giao diện |
|---|---|---|
| `pyodide` | `task` + `starterCode` (+ `packages`) | ô soạn mã + nút Chạy |
| `local` | `task` + `procedure[]` (KHÔNG có starterCode) | khối các bước, `showEditorOf` tự ẩn editor |
| `mixed` | như `pyodide`, nhưng `starterCode` chỉ lấy các khối chạy được; `env` ghi rõ khối nào phải chạy trên máy | ô soạn mã + dòng cảnh báo |

`packages` chỉ nhận `numpy | pandas | matplotlib | sqlite3` — đúng các wheel tự
lưu trữ trong `frontend/public/pyodide/v0.27.7/`. seaborn và plotly KHÔNG có
wheel ở đó, nên bài dùng chúng là `local`, không phải `pyodide`.

## Không khai gì nữa

`step_1.brief`, `step_1.theory`, `step_2.mcq`, `step_3.*`, `play`, `step_4.tests`,
`solutionCode`, `gate` đều KHÔNG phát ra. Hệ quả phải xử lý, không được lờ đi:

- **Quiz ôn tập chết.** `QuizzesService.collectQuestions()` đọc `step_2.mcq`;
  không bài nào có thì kho câu hỏi luôn dưới `MIN_POOL = 5` và người học mãi
  thấy "hoàn thành thêm bài đi". Giao diện phải nói đúng sự thật thay vì treo
  một lời hứa không tới.
- **Không có bài cửa tự kiểm tra.** Không còn `gate`, nên `isSelfTestGateLesson`
  không khoá bài nào — đúng, vì không có lời giải nào để giữ lại.
- **XP không còn gắn với chấm đúng/sai.** `POST /lessons/:n/complete` vẫn chặn
  trần bằng `lessons.xp_reward`; bài đọc thì "hoàn thành" nghĩa là đã đọc hết màn.

## Ánh xạ từ `course.json`

| nguồn | đích |
|---|---|
| `lessons[].id` | `lesson_code` |
| `lessons[].title` | `title` = `"<id> · <title>"` |
| `lessons[].level` | phần đầu `subtitle`; `estimated_minutes` theo mức |
| `lessons[].reading[]` | `step_1.read` (chia màn theo luật trên) |
| `lessons[].drills[]` | `step_2.practice` |
| `lessons[].reviewExercises[]` | nối tiếp vào `step_2.practice` |
| `lessons[].before[]` | `step_1.context.prereq` |
| `lessons[].sources[]` + `sourceRefs` | `source.slides` (in cuối màn) |
| `groups[]` | module, và `curricula.json` của trang khoá học |

`sort_order` chạy 1…172 theo đúng thứ tự `groups[].ids` nối lại.
