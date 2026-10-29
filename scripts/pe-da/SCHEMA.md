# pe-da — đặc tả bài ĐỌC-HIỂU trong studio-lesson/v2

Khoá `python_advanced` đổi ruột: 48 bài pe-v4 (luồng bốn bước có chấm) ra, 172 bài
"Python cho Data Analyst" vào. Bộ mới là giáo trình ĐỌC: nguồn không có câu trắc
nghiệm, không có scaffold, không có bộ ca kiểm thử — nó có lời giảng, code kèm
kết quả in ra, và câu luyện tập kèm đáp án mẫu.

Từ 29/10/2026 khoá có **179** bài: 172 bài của gói nội dung, cộng **module 11
(TH01–TH07)** — module THỰC HÀNH viết trong repo này, trên bộ dữ liệu CC0 thật
`coffee-sales-cc0.csv`. Bối cảnh của nó ở [CAU-CHUYEN.md](CAU-CHUYEN.md) §3 M11;
nó là chỗ đầu tiên mà mã học viên ĐỌC file dữ liệu, xem `step_4.dataFiles` dưới.

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
  | { type: 'table'; headers: string[]; rows: string[][] }
  /**
   * SƠ ĐỒ bằng DOM — chữ là `<p>`/`<code>`, không phải pixel trong ảnh. `lanes`
   * luôn CHẴN (grid hai cột; một làn lẻ là mất phép so sánh).
   */
  | {
      type: 'diagram';
      title: string;
      lanes: { label: string; steps: string[]; note: string }[];
    };

/** Mỗi phần tử là MỘT màn `read`; khâu build đã chia, renderer không chia lại. */
read?: ReadBlock[][];
```

Số khối thật trong bản dựng 179 bài: `paragraph` 811 · `code` 508 · `figure` 80
(27 bài) · `terminal` 17 (8 bài) · `table` 2 · `diagram` 1 (PY05).

**Sáu loại, không phải ba.** Bản đặc tả đầu chỉ khai ba, build phát thêm
`terminal` và `figure` sau đó mà không ai sửa lại chỗ này — renderer viết theo
đặc tả nên 26 bài có hình sẽ ném TypeError ngay màn đọc. Vì vậy `ReadScreen`
phải phân nhánh bằng `switch (block.type)` có nhánh `default` ép kiểu `never`:
thêm loại khối mà quên renderer thì typecheck đỏ, chứ không phải trang trắng
trước mặt người học. `check.py` cũng chặn loại khối lạ.

`diagram` là PHÉP THỬ, hôm nay đúng **một** bài. Ba trên bốn người trả lời khảo
sát ngày 29/10/2026 chọn *"Chữ và nhãn TRONG sơ đồ quá nhỏ, phải phóng to mới
đọc được"* — chữ đó nằm trong PNG 780×455, và chữ của TRANG reflow còn chữ
trong ẢNH thì scale (trên màn 360px ảnh bị bóp 0,46× nên nhãn 10pt hiện ra
4–5px). SVG chỉ chữa một nửa: ở cỡ hiển thị mặc định nó có đúng cỡ chữ như PNG.
Nên sơ đồ là DOM, kế thừa `--edu-font` và cỡ chữ của trang.

Dữ liệu sơ đồ nằm ở `SO_DO_DOC` trong `build.py`, **không** phải trường mới của
`source/course.json`: đây là phép thử trước khi bỏ công cho cả bộ, và gói nguồn
còn được giao lại nhiều lần nữa. Ngày bộ này lớn hơn chục bài thì chuyển nó
sang gói nguồn. `kiem_so_do()` trong check.py canh việc sơ đồ còn nối với bài:
bước ĐẦU của mỗi làn phải là biểu thức có thật trong code bài, bước CUỐI phải
có thật trong `expected`.

**HÌNH TĨNH, không animation** — kết luận có bằng chứng: toàn bộ giá trị nằm ở
việc SO HAI LÀN cạnh nhau, mà so sánh cần cả hai cùng có mặt. Animation chạy
lần lượt phá đúng cái nó định dạy (Tversky 2002: *"clever schematization of
static diagrams may be just as effective as animation"*).

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
lưu trữ trong `frontend/public/pyodide/v314.0.7/`. seaborn và plotly KHÔNG có
wheel ở đó, nên bài dùng chúng là `local`, không phải `pyodide`.

### `step_4.dataFiles` — file dữ liệu nạp vào hệ tệp ảo của Pyodide

```ts
/** TÊN file trong frontend/public/static/da-dulieu/ — không phải nội dung. */
dataFiles?: string[];   // vd ['mon.csv', 'quay.csv']
```

Trước 29/10/2026 **không có đường nào** để một file dữ liệu tới được Pyodide:
worker chỉ biết `step_4.packages` → `loadPackage`, nên cả 499 khối code của bản
dựng đều tự dựng dữ liệu tại chỗ (`StringIO` 19 · `BytesIO` 9 · `tempfile` 36 ·
`open()` 18) và `read_csv` một file thật đếm được đúng **7** lần — không lần nào
đọc được gì. Bộ dữ liệu quán (`gen_dulieu.py`, tầng 2) nằm sẵn trên đĩa mà không
bài nào chạm tới được.

**Khai ở cấp BÀI, không ở cấp khối.** Thư mục làm việc là của CẢ LẦN CHẠY:
`_prepare_dir()` trong `studio-harness.py` tạo một thư mục rồi `chdir` vào đó cho
toàn bộ chương trình, mà ô "Chạy thử" nối MỌI khối chạy được thành một chương
trình. "File này chỉ có ở khối 3" là một lời hứa hệ tệp không giữ được. `packages`
cũng ở cấp bài với cùng một nghĩa — "mọi lần chạy Python của bài này có sẵn thứ
này" — và hai cơ chế cùng nghĩa mà khác cấp là thứ sẽ lệch.

**Chỉ TÊN, nội dung ở trên đĩa.** `don_hang.csv` là 1,29 MB: nhúng vào
`content_json` như `step_4.files` (hợp đồng cũ của pe-v4, dành cho fixture vài
dòng) là nhồi nó vào DB và bắt mọi lượt mở bài tải nó qua API. Tham chiếu theo
tên thì chỉ bài nào khai mới tải, và tải một lần cho cả phiên.

**Hai nhánh, một kết quả.** Cả hai đều nạp vào CHÍNH tham số `files` của
`_studio_main` — không thêm hợp đồng thứ hai cho bộ chấm:

| nơi chạy | lấy file bằng | vì sao không dùng cách kia |
|---|---|---|
| trình duyệt (`studio-lesson.worker.js`) | `fetch('/static/da-dulieu/<tên>')` | Node không có server nào để fetch |
| Node (`check-pyodide.mjs`, `check-practice.mjs`) | `readFileSync` | ba bộ chấm đã vá `fetch` để TỪ CHỐI mọi địa chỉ `http(s)` — xem AGENTS.md |

Hàm `fileDuLieu()` ở hai bộ chấm Node là hai bản CHÉP, không phải một import:
`check-pyodide.mjs` dựng Pyodide và chấm cả 179 bài ngay ở tầm module, nên một
dòng `import` từ nó là chạy cả bộ chấm nội dung. Hai bản được ghim giống nhau
từng ký tự bởi `frontend/e2e/unit/data-files.test.mjs`.

CSP không phải sửa: `frontend/next.config.ts` đã có entry riêng cho ba file
worker với `connect-src 'self'`, nên fetch cùng origin được phép (và một địa chỉ
CDN thì bị chặn — đúng điều phép vá `fetch` ở Node đang mô phỏng).

**Không gzip.** 1,29 MB → 181 KB là hấp dẫn, nhưng `_prepare_dir()` ghi file ở
chế độ TEXT, nên giải nén phải nằm trong `studio-harness.py` — file dùng chung
với pe-v4 và với ba bộ chấm. Đổi lấy: một bản `.gz` thứ hai trên đĩa phải giữ
đồng bộ với bản gốc. Mà phần thắng thì đã có sẵn và đã ĐO: Next.js nén response
tĩnh (`compress` mặc định `true`) —
`curl -H 'Accept-Encoding: gzip' /static/da-dulieu/don_hang.csv` trả
`Content-Encoding: gzip` và **185 075 byte** thay cho 1 289 915 (14,3%).

**Danh sách trắng, ba bản, mỗi bản có lý do riêng:** thư mục
`frontend/public/static/da-dulieu/` là nguồn sự thật; `build.py`/`check.py` so
thẳng với nó; `DU_LIEU_HOP_LE` trong `src/course-admin/studio-lesson.schema.ts`
là bản literal vì backend chạy ở nơi KHÔNG có `frontend/public/`. Bản literal
được ghim vào thư mục thật bởi `frontend/e2e/unit/data-files.test.mjs`.

**Khối đọc file dữ liệu KHÔNG có nút "Thử ngay trong IDE" và KHÔNG có bảng từng
bước**, và cả bài cũng mất nút từ khối đó trở đi: /ide chưa có cơ chế nạp file
(bàn giao sang đó là `FileNotFoundError` trước mặt người học), còn vết thì sinh
bằng CPython ở `gen_traces.py` trong một thư mục tạm không có file nào. Mã bàn
giao là TIỀN TỐ, nên một khối cần dữ liệu làm mọi khối SAU nó cũng không bàn
giao được.

**Bài có `tests` (bài tập được chấm) khai được `dataFiles`, từ 29/10/2026.**
Trước đó `build.py` dừng hẳn và `check.py` báo lỗi, vì `check-practice.mjs` chưa
có nhánh nạp file — hệ quả thật của cổng đó là KHÔNG bài tập nào được chấm trên
dữ liệu thật, đúng thứ chặn module thực hành. Nay bộ chấm ấy đọc file từ đĩa
bằng cùng `fileDuLieu()` và truyền vào CẢ BA lời gọi bộ chấm (pha 1 lời giải
mẫu, pha 2 lời giải sai, pha 3 cổng dữ liệu).

**Thay cho cổng cấm là pha 3 của `check-practice.mjs`.** Hợp đồng dữ liệu chạy
LẠI cả chương trình cho TỪNG ca (`_execute` gọi `_prepare_dir(files)` mỗi lần),
nên file phải được ghi lại ở MỌI thư mục chạy, không chỉ lần đầu. Pha 3 chạy một
chương trình đọc từng file đã khai ở tầm module và trả lại dòng đầu của chúng,
qua hai ca — đo được: bỏ tham số `files` ở pha 1 và pha 2 thì cả hai pha vẫn
XANH (hôm nay không bài tập nào ĐỌC file) và chỉ pha 3 đỏ. Pha 3 cũng đỏ khi
chạy cả bộ mà KHÔNG bài tập nào khai `dataFiles`: gỡ một cổng rồi không ai đi
qua chỗ nó từng đứng thì nhánh mới không được gọi lần nào.

Hôm nay **chín** bài dùng, khai báo ở `KHOI_DU_LIEU` trong `build.py` (không phải
trường mới của `source/course.json` — cùng lý lẽ với `SO_DO_DOC`):

| bài | file | `step_4` là gì | vì sao bài này |
|---|---|---|---|
| PD13 · JSON và Excel: chọn đúng bảng cần đọc | `mon.csv` + `quay.csv` | ô "Chạy thử" | bài pandas duy nhất mà bài tập của gói không chấm được (openpyxl thiếu wheel), nên khối dữ liệu CÓ người bấm Chạy |
| PD16 · Merge: nối đơn hàng với bảng danh mục | `mon.csv` | bài tập được chấm (3 ca) | bài đầu tiên có CẢ HAI — thứ cổng cấm cũ không cho phép. Giá phải trả: học viên tải `mon.csv` (479 byte) rồi chỉ ĐỌC khối dữ liệu chứ không chạy lại được nó; đổi lại file nằm sẵn trong thư mục chạy của bài tập |
| TH01–TH06 · module 11 (thực hành) | `coffee-sales-cc0.csv` | bài tập được chấm (3 ca mỗi bài) | **sáu bài đầu tiên mà MÃ HỌC VIÊN thật sự ĐỌC file.** Trước chúng, pha 1 của `check-practice.mjs` không chứng minh được gì về cơ chế này: bỏ tham số `files` đi thì 415 ca vẫn xanh. Nay bỏ nó đi là **18 ca đỏ** |
| TH07 · dự án cuối khoá | `coffee-sales-cc0.csv` | ô "Chạy thử" | bài mở, không chấm, nên khối dữ liệu lại là thứ học viên sửa rồi chạy lại |

⚠️ **Chín mục là chỗ bảng `KHOI_DU_LIEU` bắt đầu thành danh bạ.** Thêm một module
dùng dữ liệu thật nữa thì chuyển khai báo sang gói nguồn
(`lessons[].dataFiles` + khối đọc trong `reading`), đừng thêm hàng vào đây.

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
