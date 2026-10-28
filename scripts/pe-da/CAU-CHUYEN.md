# Câu chuyện xuyên suốt — hành trình mở một quán cà phê

Đặc tả BỐI CẢNH cho 172 bài của `python_advanced`. Viết cho **người soạn nội dung**.
Văn phong (câu, thuật ngữ, chú giải) nằm ở [VAN-PHONG.md](VAN-PHONG.md); file này chỉ nói
về **ví dụ của bài kể chuyện gì** và **bài này nối với bài trước ở đâu**.

Danh sách miền ví dụ mà bộ kiểm đọc nằm ở [boi-canh.json](boi-canh.json) (luật L14 và L15).
Đặc tả này là phần *vì sao*; file JSON là phần *máy đọc được*. Sửa đặc tả mà không sửa JSON
thì không có gì đỏ — đó là đúng cái bẫy "một con số cũ trong bảng không phải chú thích lỗi
thời vô hại" mà AGENTS.md đã ghi.

---

## 0. Vì sao có file này

Chủ dự án nói nguyên văn, 29/10/2026:

> *"văn phong vẫn chưa có gì thay đổi đáng kể ở các bài cả, vẫn còn quá cứng, ngoài ra cũng
> không có sự liên kết giữa các bài với nhau, như 1 hành trình để thực hiện hóa 1 cốc cà phê
> hay mở 1 quán cà phê."*

Số đo đứng sau câu đó:

| Đo | Số |
|---|---|
| Miền ví dụ đang dùng | **7 miền không liên quan** — bán hàng 39 bài · thư viện/sách 39 · cà phê 32 · file 23 · sinh viên 22 · thời tiết 6 · vé 6 |
| Bài không có bối cảnh nào | **53** |
| Chuỗi 10 bài đầu | PY01 cà phê → PY02 thư viện+file → PY03 không gì → PY04 bán hàng+sách → PY05 cà phê → PY06/PY07 không gì → PY08 sách → PY09 **điểm thi** → PY10 cà phê |

**"Cứng" KHÔNG phải chuyện chọn từ — nó là chuyện BỎ RƠI BỐI CẢNH.** PY05 mở bằng
"Bạn bán 3 cốc, mỗi cốc 15 nghìn…" rồi đoạn 3 tụt về giọng từ điển: "`/` chia thực. `//` lấy
thương làm tròn xuống… `%` lấy phần dư." Ba bài đọc thử (PY05, PY09, PY14) đều có một đoạn
là danh sách định nghĩa nối bằng dấu `;`.

Nên file này đặt ra **hai** yêu cầu, không phải một:

1. **Bài nào cũng neo vào quán cà phê** (L14 canh được).
2. **Bối cảnh phải sống tới hết bài** — mọi đoạn giảng, không chỉ đoạn mở. *Script không canh
   được điều này.* Nó là việc đọc.

---

## 1. Hình dạng của câu chuyện

Một người mở một quán cà phê nhỏ, và học Python đúng theo thứ tự các câu hỏi mà quán đặt ra:

> **cốc đầu tiên → cuốn sổ bán hàng → bảng số liệu → báo cáo cho người khác đọc →
> quán thành hệ thống → quán thành nhiều quầy → quán có người đứng bán.**

Mỗi module là một chặng. Người học không "học xong `dict` rồi học `set`"; họ **cần tra giá
theo tên món** nên gặp `dict`, rồi **cần biết món nào hôm nay chưa bán được cốc nào** nên gặp
`set`.

### Ba ràng buộc, theo thứ tự quan trọng

**R1 — Bối cảnh phải SINH RA nhu cầu kỹ thuật, không dán lên trên.**
Phép thử: xoá hết câu kể chuyện đi, phần kỹ thuật có còn tự giải thích được *vì sao* người ta
cần nó không? Nếu còn, thì bối cảnh chỉ là trang trí.
✅ `dict` xuất hiện vì khách gọi "latte" và bạn cần số của món đó ngay, không phải đi tìm nó
nằm ô thứ mấy.
❌ "Hôm nay học `dict`. Ví dụ: `menu = {...}`."

**R2 — Giữ bối cảnh tới hết bài.**
Đoạn 2, 3, 4 không được tụt về giọng từ điển. Nhưng **đừng đánh đổi độ chính xác lấy sự thân
thiện**: định nghĩa vẫn phải đúng, chỉ là nó được nói qua một việc thật.
✅ "Cuối buổi bạn còn 7 chiếc bánh và 2 khay để xếp. `7 // 2` cho 3, tức mỗi khay 3 chiếc, vì
phép này lấy thương rồi làm tròn xuống. `7 % 2` cho 1, tức phần dư."
❌ "`//` lấy thương làm tròn xuống. `%` lấy phần dư."

**R3 — Một câu nối, không phải một đoạn.**
Mỗi bài (trừ PY01) mở bằng **một** câu nói bài này tiếp vào việc vừa làm xong. Một đoạn hồi
tưởng dài là thuế người học trả ở mọi bài.
✅ PY12: "Tuple ở bài trước giữ được một dòng bán hàng. Nhưng khi khách gọi \"latte\", bạn cần
số của món đó ngay…"

---

## 2. Cái gì KHÔNG đổi

Nói ra trước, vì đây là chỗ một đợt "viết lại cho có câu chuyện" dễ phá nhất:

- **Mã bài.** `PY01`…`RD05` giữ nguyên. `lesson_code` là khoá mà
  `scripts/update-lesson-content.ts` dùng để nạp vào DB (AGENTS.md: đường nạp AN TOÀN).
- **Thứ tự bài và `sortOrder`.** Người đang học dở đứng ở `(course_id, sort_order)`.
- **Khái niệm từng bài dạy.** PY05 vẫn dạy `/ // % **` và thứ tự tính. Đổi bối cảnh, không đổi
  giáo trình.
- **`topics`, `sourceRefs`, `sourcePages`.** Chúng trỏ về slide gốc.
  **Và vì chúng trỏ về slide GỐC, chúng nay nói khác nội dung bài — có chủ đích.** Ngày
  29/10 chủ dự án cho phép đổi miền của SY25–SY28 và GU12 từ *"quản lý sinh viên, môn học
  và điểm"* sang *"quản lý món, nguyên liệu và định lượng"*; `topics` của chúng vẫn ghi
  `Student`, `Course`, `StudentMark`, `GPA`, `credits`. Đó là lý lịch ĐÚNG — bài quả thật
  dựng từ slide đó — nhưng người soạn sau đọc lướt sẽ tưởng project vẫn là quản lý sinh
  viên rồi "sửa lại cho khớp". Đừng. Khái niệm được dạy không đổi (collection, quan hệ
  nhiều–nhiều, lưu trữ), chỉ miền ví dụ đổi.
  Đã kiểm: `topics` KHÔNG được `build.py` hay `check.py` đọc một lần nào, nên nó không tới
  người học và không có phép kiểm nào canh nó.
- **Chú giải thuật ngữ lần đầu (L10).** 65 chú giải đã thêm ngày 29/10 nằm ở ĐÚNG bài mà
  `thuatngu.json` khai `baiDauTien`, và luật TB đối chiếu lại con số đó mỗi lần chạy. Viết lại
  một bài mà xoá mất cụm `lát cắt (slice)` của PY07 là L10 đỏ ở PY07 **và** TB đỏ vì lần dùng
  đầu trôi sang bài khác. Trong 18 bài của module 1 có **45 thuật ngữ** neo như vậy.
- **Số câu trắc nghiệm và câu luyện tập mỗi bài.** `check.py` so lại với nguồn.

---

## 3. Mười chặng

Cột *dữ liệu mới* là thứ đáng chú ý nhất: nó là lý do module tồn tại trong câu chuyện. Một
module không sinh ra dữ liệu mới nào thì nó chỉ là một chương sách.

### M1 · `python-core` — Python nền tảng (PY01–PY18) ✅ **đã viết lại**

| | |
|---|---|
| **Chặng của quán** | Ngày đầu mở cửa, tới lúc có một cuốn sổ bán hàng viết tay dùng được. |
| **Dữ liệu lần đầu** | Số cốc hai buổi · đơn giá · một dòng hoá đơn `(số cốc, đơn giá)` · bảng giá theo tên món · nhóm món đã bán · một ô bỏ trống trong sổ. |
| **Nối với chặng trước** | — (chặng đầu). |

Chuỗi nhu cầu, bài theo bài:

| Bài | Quán cần gì | Nên gặp |
|---|---|---|
| PY01 | biết cả ngày bán bao nhiêu | `print`, phép gán, REPL vs script |
| PY02 | sổ của quán là một dự án riêng, không lẫn bài tập cũ | `sys`, `venv`, `pip` |
| PY03 | một chỗ ngồi tính suốt buổi, giữ lại con số vừa nhập | notebook, kernel, `type` |
| PY04 | giá từ máy tính tiền về là **chữ**, không phải số | `int/float/str/bool`, kiểu động |
| PY05 | tính một hoá đơn có giảm giá; chia 7 bánh vào 2 khay | `* - / // % **`, thứ tự tính |
| PY06 | in một dòng tiêu đề cho bản báo cáo | nối chuỗi, `\n`, Unicode, chú thích |
| PY07 | đọc từng phần của tên file `doanhthu.csv` và mã đơn | chỉ số, lát cắt, chuỗi bất biến |
| PY08 | tên khách do người gõ, phải dọn về một khuôn | `strip/title/zfill/split`, f-string |
| PY09 | tự nhắc theo số cốc còn pha được trong bình | `if/elif/else`, `and/or/not` |
| PY10 | tuần thứ hai: cần cả dãy để so ngày với ngày | `list` và các thao tác tại chỗ |
| PY11 | một dòng đã chốt đơn thì không được sửa | `tuple`, chọn collection, `bytes` |
| PY12 | khách gọi "latte" thì cần số của món đó ngay | `dict`, `get`, `items`, `max(key=)` |
| PY13 | món nào hôm nay chưa bán được cốc nào | `set`, hợp/giao/hiệu, quan hệ bao |
| PY14 | một tháng thì không cộng tay được | `for`, `range`, `enumerate`, `zip` |
| PY15 | ca bán hàng chạy tới khi đóng cửa, không tới lượt thứ mấy | `while`, `break`, `continue`, sentinel |
| PY16 | cùng phép tính hoá đơn, gõ lại cả ngày | `def`, `return`, mặc định, docstring |
| PY17 | màn hình gọi món: khách bấm, thư viện gọi hộ | tham chiếu hàm, callback, scope |
| PY18 | sổ do người ghi tay, sớm muộn có ô trống | `try/except/raise/else/finally` |

### M2 · `numpy` — NumPy từ dãy số đến bảng (NP01–NP23)

| | |
|---|---|
| **Chặng** | Sổ viết tay hết chỗ. Số cốc nhiều ngày × nhiều món trở thành một **bảng số**, và quán cần tính trên cả bảng một lượt. |
| **Dữ liệu lần đầu** | Bảng `ngày × món` (array 2 chiều) · mask "ngày nào bán dưới mức" · ô `NaN` của ngày quán đóng cửa · `doanhthu.csv` đọc bằng `loadtxt` · dữ liệu thử sinh bằng `seed` để tập giá sản phẩm mới. |
| **Nối với chặng trước** | `list` số cốc của PY10 là chỗ bắt đầu: NP01 mở bằng *"dãy số cốc bạn vừa giữ trong `list`"* rồi chỉ ra điều `list` không làm được — nhân cả dãy với đơn giá trong một phép. |

Điểm phải sửa, đã đo: **4 bài NP dùng miền sinh viên/điểm** (NP15 "gắn nhãn và giới hạn điểm",
NP16 "điểm có trọng số", NP23 "bài tổng hợp: điểm kiểm tra"), **2 bài dùng thời tiết**, **3 bài
có bảng `sales` mà không chữ nào nói là quán nào**, **8 bài không bối cảnh**.
Phép đổi tự nhiên: *điểm có trọng số* → **giá bán trung bình có trọng số theo số cốc mỗi món**
(cùng công thức, `sum(w*x)/sum(w)`); *giới hạn điểm 0..10* → **kẹp số cốc về khoảng hợp lệ**;
*thời tiết* → `boi-canh.json` đã cảnh báo trước rằng `nhiệt độ` cũng là đại lượng thật của quán
(nhiệt độ nước pha) — dùng tới nó thì thêm `"nhiệt độ nước"` vào `loaiTru` của miền thời tiết,
**đừng xoá từ khoá**.

### M3 · `pandas` — từ bảng đầu tiên đến quy trình phân tích (PD01–PD32)

| | |
|---|---|
| **Chặng** | Bảng số không đủ: quán cần **cột có tên** và **hàng có nhãn**. Đây là chặng dài nhất, và nó là chặng "quán có số liệu thật": đơn hàng, khách, ngày giờ, nhiều cửa hàng. |
| **Dữ liệu lần đầu** | `don_hang.csv` (mã đơn, thời điểm, món, số cốc, tiền) · `khach.csv` để nối · lô dữ liệu của **quầy thứ hai** · mốc thời gian có múi giờ · bảng tổng hợp theo tháng. |
| **Nối với chặng trước** | Bảng NumPy của M2 không giữ được tên món khi sắp xếp — PD01 mở từ đúng chỗ đau đó (`Series` có nhãn). |

Đây là nơi L14 báo nhiều nhất: **23/32 bài** có dữ liệu đơn hàng/doanh thu mà **không một chữ
nào nói đây là quán nào**, 1 bài dùng thời tiết, 5 bài không bối cảnh. Tin tốt: đây là nhóm
**rẻ nhất** để sửa — dữ liệu đã đúng, chỉ thiếu một câu nói đây là bảng đơn hàng của quán. Đừng
đổi tên cột hàng loạt: `boi-canh.json` xếp miền bán hàng là `kemChinh` chính vì quán cà phê CÓ
đơn hàng và CÓ doanh thu.

Hai bài cuối là mốc của cả khoá, nên giữ chúng là **sản phẩm của quán**, không phải bài tập:
PD30 "một quy trình làm sạch có kiểm tra" = quy trình chốt sổ mỗi tối; PD32 "báo cáo đơn hàng
có thể đối chiếu" = bản báo cáo bạn đưa cho người đồng sở hữu quán.

### M4 · `visualization` — Matplotlib, seaborn, Plotly, dashboard (VZ01–VZ30)

| | |
|---|---|
| **Chặng** | Quán đã có số. Giờ phải **cho người khác đọc được**: người đồng sở hữu, chủ nhà, ngân hàng. |
| **Dữ liệu lần đầu** | Không có bảng mới. Cố ý: chặng này dùng lại đúng bảng của M3, và đó chính là lý do nó thuyết phục — cùng một bảng, bốn câu hỏi khác nhau, bốn loại biểu đồ. |
| **Nối với chặng trước** | VZ01 "từ câu hỏi đến loại biểu đồ" mở bằng câu hỏi mà PD31/PD32 vừa trả lời bằng bảng, và hỏi lại: bảng đó đưa cho người không đọc số thì sao? |

Đo được: **7 bài** có dữ liệu bán hàng chưa neo, 1 bài thời tiết, **4 bài không bối cảnh**
(VZ27–VZ29 là lưới 2D và trường vector — xem §4).

VZ24 "nhận ra biểu đồ gây hiểu lầm" là bài đáng giữ nguyên tinh thần nhưng đổi ví dụ: **trục y
cắt ở 90% để doanh thu quán trông như tăng gấp đôi** là ví dụ của chính câu chuyện, và nó còn
dạy được một chuyện thật — bạn sẽ bị người khác làm đúng điều đó với số của bạn.

### M5 · `python-systems` — ứng dụng, OOP và dữ liệu lưu trữ (SY01–SY28)

| | |
|---|---|
| **Chặng** | Quán thành **hệ thống**: không còn là một notebook của một người, mà là code có cấu trúc, chạy lại được, lưu được xuống đĩa và chia sẻ được. |
| **Dữ liệu lần đầu** | Một `class Don`/`class Mon` thay cho `dict` rời · file lưu trữ (`.json`, `.pkl`, `.zip`) · cây thư mục của dự án quán · một gói Python mang tên quán. |
| **Nối với chặng trước** | PY17 đã hứa "sau phần hàm, bạn sẽ gom dữ liệu và thao tác của quán vào một lớp (class)" và PY01 cũng đã hứa như vậy. SY05 là chỗ trả lời cái hứa đó. |

Đây là nhóm **nặng nhất** phải sửa: **13 bài dùng miền sinh viên**, trong đó SY25–SY28 là một
project bốn bài tên thẳng là *"quản lý sinh viên, môn học và điểm"*. Đề xuất: đổi project đó
thành **"quản lý món, nguyên liệu và đơn hàng"** — cùng ba thực thể, cùng quan hệ nhiều–nhiều,
cùng bài học về collection → object → package → persistence. Đây là **sửa nội dung**, không
phải sửa một chữ; nó nên là một đợt riêng, và `boi-canh.json` đã cố ý để L14 ở mức **LỖI** cho
đúng quy mô đó.

SY13 "làm tròn xuống và tính điểm có trọng số" đi cùng NP16: cùng đổi sang **giá trung bình có
trọng số**, và `floor` thì có việc thật ở quán — chia một bao cà phê 1 kg thành bao nhiêu phần
25 g.

### M6 · `concurrency` — hệ điều hành, tiến trình và đa luồng (CT01–CT13)

| | |
|---|---|
| **Chặng** | Quán mở quầy thứ hai. Hai quầy làm cùng lúc, dùng chung một máy xay, và đôi khi tranh nhau nó. |
| **Dữ liệu lần đầu** | Không có bảng mới. Dữ liệu của chặng này là **trạng thái của máy**. |
| **Nối với chặng trước** | Quy trình chốt sổ của M5 chạy 40 giây cho một tối; CT01 mở từ đó — khi quán có hai quầy thì 40 giây đó chạy ở đâu. |

**Đây là nhóm KHÔNG gắn tự nhiên được, và đừng ép.** Xem §4.
Nhưng **CT07, CT08, CT10, CT11, CT13 thì gắn được** và phải gắn: chúng chạy một *việc nào đó*
ở nền, và việc đó có thể là chốt sổ, nén bản sao lưu của quán, hay xuất 26 biểu đồ. CT12 "race
condition, Lock" thì bộ đếm bị tranh **là** máy xay hai quầy cùng gọi — ví dụ này không phải
trang trí, nó là đúng hình dạng của lỗi.

### M7 · `concurrency-extensions` — multiprocessing và shell (CT14, CT15, RC01)

| | |
|---|---|
| **Chặng** | Nhiều quầy đã chạy song song; giờ là chuyện **chia việc nặng ra nhiều tiến trình** và **gọi được công cụ ngoài** từ máy của quán. |
| **Dữ liệu lần đầu** | Không. |
| **Nối với chặng trước** | CT14 nối thẳng CT12: Lock giải quyết tranh chấp trong một tiến trình, còn khi mỗi quầy là một tiến trình riêng thì dữ liệu không dùng chung nữa. |

CT14 gắn được (chia việc tính báo cáo cho nhiều tiến trình). **CT15 và RC01 thì không** — xem §4.

### M8 · `gui` — Tkinter: từ form nhỏ đến quản lý điểm (GU01–GU12)

| | |
|---|---|
| **Chặng** | Quán có **người đứng bán không biết Python**. Họ cần một màn hình bấm được. |
| **Dữ liệu lần đầu** | Không có bảng mới; nhưng lần đầu có **người dùng khác bạn**, và đó là một đổi khác thật về yêu cầu. |
| **Nối với chặng trước** | PY17 đã dựng sẵn phân biệt "truyền hàm" / "gọi hàm" và nói rõ nó sẽ dùng lại ở bài GUI. GU04 là chỗ dùng. |

Đo được: **3 bài dùng miền sinh viên** (GU12 là *"PW9: ứng dụng quản lý điểm bằng Tkinter"*) và
**9 bài không bối cảnh**. Đề xuất: GU12 → **màn hình nhận đơn tại quầy** (chọn món, số cốc,
hiện tổng tiền, lưu xuống file của M5). Nó dùng đúng mọi widget mà 11 bài trước dạy: `Entry`
cho số cốc, `Radiobutton` cho size, `Combobox` cho món, `Listbox` cho đơn trong ca.
Chú ý `boi-canh.json`: `menu` **không** nằm trong từ khoá miền cà phê, cố ý — GU03 dùng `menu`
cho thanh menu Tkinter. Viết "thực đơn của quán" chứ đừng trông vào chữ `menu` để neo bài.

### M9 · `supplements` — ôn tập các chi tiết trong slide (EX01–EX08)

| | |
|---|---|
| **Chặng** | Không phải một chặng mới. Đây là **phần phụ lục**: tám chi tiết của slide gốc mà các chặng trên đi nhanh qua. |
| **Dữ liệu lần đầu** | Không. |
| **Nối với chặng trước** | Mỗi bài EX nối với **bài đã dạy khái niệm đó**, không nối với bài liền trước. Câu nối phải nói ra điều đó: "Ở M2 bạn đọc `doanhthu.csv` bằng `loadtxt`; bài này xem các tham số mà lúc đó bỏ qua." |

EX01, EX02, EX06, EX08 gắn được (đọc bảng của quán, lưu nền thật, chuẩn bị vector trước khi
vẽ). **EX03, EX04, EX05, EX07 thì không** — xem §4. Đo được 3 bài EX đang dùng miền sinh viên.

### M10 · `data-viz-review` — ôn API trực quan hóa và mở rộng NumPy (RD01–RD05)

| | |
|---|---|
| **Chặng** | Cũng là phụ lục, và nó đóng vòng: năm bài này quay về đúng bảng của M3 và biểu đồ của M4. |
| **Dữ liệu lần đầu** | Không. |
| **Nối với chặng trước** | RD01 nối với VZ09 (nhãn và chú thích), RD03 nối với M2 (sắp xếp mà giữ tên món), RD04/RD05 nối với M3 (ước lượng một đường và mô phỏng). |

Đo được: **5 bài** có dữ liệu bán hàng chưa neo, 1 bài thời tiết. RD03 "sắp xếp mà vẫn giữ đúng
tên và giá trị" là ví dụ sẵn của quán — xếp món theo doanh thu mà không mất tên món. Lưu ý
dương tính giả đã biết ghi trong `boi-canh.json`: `order = np.argsort(sales)` ở RD03 làm từ
khoá `order` khớp mà không có đơn hàng nào.

---

## 4. Những nhóm bài KHÔNG gắn tự nhiên được — nói thẳng

Ép quán cà phê vào những bài dưới đây là **thêm một lớp trang trí mà người học phải bóc ra mới
thấy cơ chế**. Chúng được miễn trừ tường minh trong `boi-canh.json` (`mienTru`), và miễn trừ đó
**hẹp có chủ đích**: 14/172 bài = 8%.

**Phép thử để quyết một bài có được miễn hay không: dữ liệu của bài CHỌN ĐƯỢC không?**

| Nhóm | Bài | Vì sao không gắn được |
|---|---|---|
| Cơ chế của hệ điều hành | CT01–CT06, CT09, CT12 | Dữ liệu của bài **là** trạng thái máy: PID, cây `fork`/`exec`, PCB và các hàng đợi, thời gian burst của FCFS/SJF/SRTF/Round Robin, stack riêng của từng luồng. Không chọn được. |
| Bộ công cụ | SY04 (Git), EX03 (`sys.executable`), EX07 (bytecode), CT15 (shell tự viết) | Dữ liệu là mốc commit, đường dẫn interpreter, bytecode, lệnh shell. Không có chỗ cho một bảng nào. |
| Cơ chế của chính Python | EX04 (cây process), EX05 (GIL, reference counting) | Cùng lý do hàng đầu. |

**Cách xử lý ba nhóm này — không phải "để trống":**

1. **Giữ dữ liệu của bài đúng như nó phải là.** Đừng đổi `PID` thành `ma_don`.
2. **Nhưng câu nối (R3) thì VẪN BẮT BUỘC.** Đây là chỗ đáng làm nhất: CT03 không cần một bảng
   đơn hàng, nhưng nó cần một câu nói *vì sao bạn — người mở quán — đang đọc về hàng đợi của
   scheduler*. Ví dụ: "Hai quầy của bạn chạy cùng lúc trên một máy; phần quyết định quầy nào
   được chạy trước là scheduler của hệ điều hành." Một câu, rồi vào cơ chế.
3. **Và câu KẾT phải trả người học về quán.** "Vì vậy khi bạn cho quy trình chốt sổ chạy ở nền,
   đừng giả định nó chạy liền một mạch." Nếu một bài được miễn mà không có cả câu mở lẫn câu
   kết thì nó đúng là một bài rời.

**Ba nhóm đang nằm ở vùng xám, và quyết định là KHÔNG miễn:**

- **VZ27–VZ29** (vùng tô, lưới 2D `pcolormesh`/`contour`, trường vector `quiver`). Dữ liệu
  **chọn được**: cơ cấu của tổng là tỷ trọng doanh thu từng món theo tháng; lưới 2D là bản đồ
  nhiệt "giờ trong ngày × ngày trong tuần" của lượng khách — một bảng mà quán nào cũng muốn có.
  Trường vector thì xa nhất, nhưng nó vẫn là một API vẽ, và bài vẫn nối được bằng R3.
- **SY19, SY20** (nén, ZIP/tar). Chúng nén **một bảng nào đó**, và hôm nay bảng đó là
  `students.txt`/`marks.txt`. Bảng của quán cũng nén được.
- **SY14** (curses). Nó vẽ **một menu nào đó**; thực đơn của quán thì có thật.

---

## 5. Cách kiểm

```bash
py -I scripts/pe-da/check_vanphong.py --luat L14,L15 --chi-tiet 0
```

- **L14 (LỖI)** — bối cảnh của bài phải thuộc danh sách đã chốt. Nó đọc `van_ban_hoc_vien()`,
  tức **cả code và đầu ra**, vì miền ví dụ sống đúng trong chỗ mà tiền xử lý backtick xoá đi
  (`cups_sold`, `marks.txt`). Ba mức: dùng miền ngoài hành trình ≥ 2 lần → lỗi; có dữ liệu
  bán hàng mà không một chữ nào neo vào quán → lỗi; không bối cảnh nào → cảnh báo.
- **L15 (CẢNH BÁO)** — đoạn mở bài phải có một cụm chỉ sự nối tiếp, hoặc nhắc lại một thuật ngữ
  mà bài liền trước cũng dùng. Danh sách cụm nối nằm trong `check_vanphong.py` (`CUM_NOI`) và nó
  **hẹp có chủ đích** — đọc docstring của `kiem_noi_bai` trước khi nới.

**Ba thứ hai luật này KHÔNG bắt được**, nên đừng coi chúng xanh là câu chuyện đã xong:

1. **R2 — bối cảnh bỏ rơi ở đoạn giữa.** Một bài mở bằng "bạn bán 3 cốc" rồi đoạn 3 là danh
   sách định nghĩa vẫn xanh L14, vì từ khoá `cốc` đã khớp ở đoạn đầu. Đây là lỗi mà chủ dự án
   nhìn ra và script không nhìn ra.
2. **Câu nối ĐÚNG hay chỉ ĐÚNG KHUÔN.** L15 chỉ tìm cụm chữ. "Ở bài trước bạn học `list`" khớp
   luật mà không nối gì về nhu cầu.
3. **Thứ tự nhu cầu có hợp lý không.** Không script nào biết `dict` nên đến sau `list`.

Và sau mọi lần sửa nội dung:

```bash
py scripts/pe-da/build.py
py scripts/pe-da/check.py --strict
node scripts/pe-da/check-pyodide.mjs <mã bài>   # nếu có đổi `code`/`expected`
```

---

## 6. Trạng thái

| Module | Bối cảnh | Ghi chú |
|---|---|---|
| M1 `python-core` | ✅ **xong** | 18/18 bài neo vào quán; 17 câu nối; L14 và L15 sạch cho cả 18 bài |
| M2 `numpy` | ⬜ | 4 bài sinh viên · 2 thời tiết · 3 chưa neo · 8 không bối cảnh |
| M3 `pandas` | ⬜ | 23 bài có dữ liệu bán hàng chưa neo — **rẻ nhất để sửa** |
| M4 `visualization` | ⬜ | 7 chưa neo · 1 thời tiết · 4 không bối cảnh |
| M5 `python-systems` | ⬜ | 13 bài sinh viên, gồm project 4 bài SY25–SY28 — **nặng nhất** |
| M6 `concurrency` | ⬜ | 8/13 bài được miễn; 5 bài còn lại phải neo; mọi bài vẫn cần câu nối |
| M7 `concurrency-extensions` | ⬜ | CT15 và RC01 được miễn |
| M8 `gui` | ⬜ | 3 bài sinh viên · 9 không bối cảnh; GU12 nên thành màn hình nhận đơn |
| M9 `supplements` | ⬜ | 4/8 bài được miễn; câu nối trỏ về bài dạy khái niệm, không về bài liền trước |
| M10 `data-viz-review` | ⬜ | 5 chưa neo · 1 thời tiết |

**Thứ tự nên làm, và nó không theo thứ tự module:** M3 trước (23 bài, mỗi bài một câu), rồi M4
và M10 (cùng dùng bảng của M3), rồi M2, rồi M8, rồi M5 cuối — vì M5 là đổi nội dung chứ không
đổi chữ.
