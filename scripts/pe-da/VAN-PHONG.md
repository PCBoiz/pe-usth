# Văn phong giáo trình — đặc tả và luật kiểm

Viết cho **người soạn nội dung** và **dev dựng bộ kiểm**. Không phải tài liệu cho người học đọc.

Mỗi luật ở đây có ba phần: *vì sao* (kèm số đo thật), *ngưỡng*, và *cách kiểm bằng script*.
Luật nào không kiểm được bằng script thì nói rõ là không.

---

## 0. Đích, và nó đến từ đâu

| Trục | Đích | Nghĩa cụ thể trong tiếng Việt |
|---|---|---|
| Viết cho ai | Explainer | Giải thích một việc, không trình bày một hệ thống |
| Giọng | Neutral | Không hô hào, không xin lỗi, không đùa |
| Ngôi | "You" → **"bạn"** | Xem §5 |
| Trang trọng | Balanced | Không "quý vị", không "tụi mình" |
| Mức đọc | Plain | Người chưa từng viết dòng code nào đọc được |
| Độ dài câu | Auto | Không ép ngắn đều; xem §2 |

**Trạng thái bằng chứng của đích này:** đây là lựa chọn của chủ dự án, không phải kết luận
nghiên cứu. Phần có nghiên cứu đỡ là ngôi "bạn" (§5); phần còn lại là quy ước.

---

## 1. Luật lớn nhất: một màn đọc chỉ được mang một lượng khái niệm mới

Bốn luật L3, L8, L9, L10 dưới đây **cùng nói một chuyện**, và chúng là phần đáng làm trước
mọi thứ khác. Hai phép đo độc lập — một trên gói bàn giao, một trên khoá đang chạy — đều
dừng lại ở cùng chỗ này:

| Đo | Gói bàn giao | Khoá đang chạy |
|---|---|---|
| Mật độ thuật ngữ | 1 từ tiếng Anh / **8,6 từ** | trung vị 15/1000 tiếng, **p90 46, max 96** |
| Thuật ngữ không bao giờ được định nghĩa | **23/40** từ thông dụng nhất | **~17** thuật ngữ |
| Khoảng cách dùng-trước-định-nghĩa-sau | `value` **+164 bài** · `thread` **+136** · `process` **+118** | CT01: **4 thuật ngữ mới trong 2 câu** |

Đây là lời giải thích đo được cho phản hồi *"người chưa từng tiếp xúc Python thấy khó hiểu"*.
Nó **không phải** vì câu dài — xem §2.

### L10 · Thuật ngữ lần đầu toàn khoá phải có chú giải — **LỖI**

Lần một thuật ngữ xuất hiện đầu tiên **theo thứ tự chương**, nó phải được chú giải ngay tại
chỗ. Không chú giải ở bài sau, không để người đọc tra.

Dự án đã biết làm đúng, chỉ chưa làm đều:

> ✅ NP02 — "Một **index (chỉ số)** đại diện cho một vị trí trong array."
> ✅ SY17 — "**Bộ đệm (buffer)** gom dữ liệu…"
> ✅ NP13 — "Array True/False dùng để đánh dấu các vị trí như vậy được gọi là **mask**."
> ❌ CT01 — "Stack giữ khung lời gọi hàm; data section…; heap phục vụ cấp phát động.
>   File descriptor là…" — bốn thuật ngữ mới, không chú giải cái nào.

**Kiểm:** đọc `thuatngu.json`, duyệt bài theo thứ tự chương, lần xuất hiện đầu phải khớp một
trong ba khuôn: `Thuật ngữ (tiếng Anh)`, `tiếng Anh (thuật ngữ)`, hoặc câu chứa `… gọi là X`.

**Giới hạn:** script chỉ kiểm **có mặt** chú giải, không kiểm chú giải đúng hay đủ. Cùng họ
bẫy "so bản dựng với chính nó" mà AGENTS.md đã ghi cho bộ trắc nghiệm.

### L8 · Mật độ thuật ngữ ≤ 40/1000 tiếng (lỗi > 60)

⚠️ **Số tuyệt đối của L8 và L10 tỉ lệ với ĐỘ LỚN TERMBANK**, nên đừng so thẳng hai
phép đo dùng hai danh sách khác nhau. Các con số ở §1 đo bằng danh sách **40 từ
thông dụng nhất**; `thuatngu.json` khai **110 mục**, nên mọi con số xấp xỉ gấp đôi.

Giới hạn lại cho so được thì chúng **khớp**: với đúng 40 thuật ngữ thông dụng nhất,
bộ kiểm báo **27/31** thuật ngữ thiếu chú giải, so với "23/40" của §1 — cùng hiện
tượng, cùng cỡ.

Đo bằng termbank 110 mục: trung vị 32 · p90 **90** · max **166** (RC01).

### L9 · ≤ 3 thuật ngữ MỚI mỗi màn đọc (lỗi > 5) — **HÀNG RÀO, không phải việc phải làm**

Đo lại trên 544 màn bằng **termbank**: trung vị 0, **max 3, 0 ca vi phạm**.

Con số "max 13" ghi ở §1 **không thuộc luật này** — nó đếm TỪ TIẾNG ANH trong văn
xuôi, tức một thống kê của **L8**. L9 đếm **mục termbank**. Hai phép đếm khác bản
chất, và gộp chúng làm một là lỗi của bản đặc tả đầu.

Nên L9 xếp cùng nhóm L4–L7: corpus đã đạt, luật ở đây để **chống tụt**. Nó vẫn có
răng — ablate (dồn 6 thuật ngữ chưa gặp vào màn đầu PY01) làm nó đỏ ngay.

### Phép chẻ câu — định nghĩa MỘT lần, ở đây

Mọi luật đếm câu (L1, L2, L3, L12) chẻ câu ở **`.` `!` `?` `…`**, và **chỉ** ở đó.

Phải nói ra vì bản đầu của đặc tả này không nói, và nó mang **ba** con số câu từ
**ba** phép chẻ khác nhau — 2 182 (`.!?…`) · 2 750 (thêm `;` và `:`) · 3 059 (§2).
Bộ kiểm đã bắt được chuyện đó.

Vì sao chọn `.!?…`: thêm `;` vào phép chẻ thì **L3 không còn chạy được**, vì `;`
chính là thứ L3 phải đếm BÊN TRONG một câu.

⚠️ Và con số 59 của L3 dưới đây có lẽ **đo khi chưa áp tiền xử lý số 1 của §10**
(thay backtick bằng token trơ): đo lại có bỏ backtick ra **48**, không bỏ ra
**57** — rất gần 59. Con số phải tin là con số của bộ kiểm, vì nó áp đủ tiền xử lý.

### L3 · Câu ≥ 3 dấu `,`/`;` và ≥ 20 tiếng phải thành bullet hoặc bảng — **LỖI**

**59 câu (2,6%)** đang vi phạm, và cả ba ca nặng nhất (CT01, CT03, GU01) là cùng một lỗi:
*một bảng định nghĩa bị nén thành một câu*.

> ❌ CT03 (49 tiếng) — "job queue… ready queue… device queue…"
> ✅ Cùng nội dung, dạng bảng: ba hàng, hai cột `Hàng đợi` / `Chứa gì`.

**Kiểm:** đếm trên câu đã bỏ nội dung trong backtick.

---

## 2. Độ dài câu KHÔNG phải vấn đề của bộ này

Đo thật trên 3 059 câu phần giảng:

| | |
|---|---|
| Trung vị | **13 từ** |
| p90 | 22 từ |
| Dài nhất cả bộ | 49 từ |
| Câu > 30 từ | **1,2%** |

**Đừng mở một đợt "chẻ câu cho ngắn".** Nó sẽ sửa đúng thứ không hỏng. Cái sai ở 20 câu dài
nhất là dấu `;` nhồi mệnh đề (15/20) — đã là L3 ở trên.

### L1 · Câu > 25 tiếng cảnh báo, > 30 tiếng lỗi
### L2 · Đoạn > 90 tiếng hoặc > 6 câu cảnh báo (lỗi: 110 tiếng / 8 câu)

Hai luật này là **hàng rào chống tụt**, không phải việc phải làm. Corpus hiện chỉ 14 câu và
vài đoạn vi phạm.

---

## 3. Không có chỉ số độ khó đọc cho tiếng Việt — đừng đi tìm

Đã tra, và đây là kết quả đo chứ không phải "tìm không thấy":

- Công thức **Nguyen & Henkin (1982/1985)** chạy lại trên sách giáo khoa hiện hành cho
  **r = 0,51–0,58**. Đó là tiếng ồn.
- **Luong và cộng sự (2020)** đạt r = 0,95 nhưng cần parser, corpus tần suất và từ điển Hoàng
  Phê, huấn luyện trên **văn học lớp 1–11**, đầu ra là **mức lớp** — vô nghĩa với sinh viên
  đọc tài liệu lập trình.
- **Flesch/FKGL/SMOG không có bản tiếng Việt**, và lý do sâu hơn "hằng số sai": số hạng lõi
  `âm tiết/từ` **không định nghĩa được** khi chưa tách từ. Khi tách rồi thì dấu **đảo ngược**
  trực giác tiếng Anh — tỷ lệ từ một tiếng có **r = −0,867**, tức càng nhiều từ ngắn càng DỄ.

**Hệ quả:** đặc tả này **không sinh ra một điểm số tổng hợp**. Nó chỉ dùng ba đặc trưng
chuyển được (đều về độ dài/độ phức tạp câu, r ≈ 0,8) cộng một **termbank tường minh** thay
cho đặc trưng mạnh nhất (độ hiếm của từ, r = 0,911) vốn không đếm trực tiếp được.

Cũng **không có** chuẩn plain-language chính thức nào của Việt Nam để dựa vào.

---

## 4. Termbank — `scripts/pe-da/thuatngu.json`

L8, L9, L10, L11, L13 **cùng đọc một file này**, nên chúng không lệch nhau được. Cùng lý lẽ
với `HAU_TO_KHACH` export từ một chỗ (AGENTS.md).

Ba nhóm:

| Nhóm | Xử lý | Ví dụ |
|---|---|---|
| **A** — định danh trong code | Giữ nguyên, **luôn trong backtick** | `list`, `DataFrame`, `print` |
| **B** — đã có từ Việt đứng được | Dùng tiếng Việt, chú giải tiếng Anh **một lần** | thread → luồng, buffer → bộ đệm |
| **C** — chưa có từ Việt | Giữ tiếng Anh, chú giải **mô tả** một lần | `heap`, `callback`, `deadlock` |

**Nhóm C: đừng dịch cố.** Một bản dịch tự chế còn khó hơn từ gốc.

### L11 · Một thuật ngữ một cách gọi — khoá là **(thuật ngữ, ngữ cảnh)**

Không phải khoá một trường. Corpus đã có `stack` mang **hai nghĩa không liên quan**:
CT01 là *call stack*, PD20 là `DataFrame.stack()`. Khoá một trường sẽ ép hai thứ đó thành một.

---

## 5. Xưng hô: dùng **"bạn"**

**Luật L7:** chỉ `bạn`. Cấm `chúng ta`, `ta`, `quý vị`, `các em`. `người dùng` chỉ cảnh báo
(nó có nghĩa thứ hai hợp lệ: người dùng của chương trình học viên viết).

**Trạng thái bằng chứng — đọc trước khi đổi:**

Có nghiên cứu đỡ: **Ginns, Martin & Marsh (2013)**, *Educational Psychology Review*, n = 3 312
— giọng hội thoại cho **d = 0,30** ở ghi nhớ và **d = 0,54** ở vận dụng. Biên quan trọng: hiệu
ứng **nhỏ và không ý nghĩa** ở bài dài hơn 35 phút, mạnh nhất ở **người kiến thức nền thấp** và
**bài ngắn** — khớp đúng profile dự án (thời lượng bài trung vị 13 phút, đối tượng người mới).

**Nhưng không có nghiên cứu nào trên người học tiếng Việt**, và các bản nhân rộng ngoài tiếng
Anh không đồng nhất (Kurt 2011 khác ở tải nhận thức nhưng không ở điểm; Yeşildağ & Sadık 2021
không khác biệt). Nên: **quyết định có cơ sở, không phải đã được chứng minh.**

Lý do riêng của tiếng Việt: không có đại từ ngôi hai trung tính. `em` ấn định người đọc là
người dưới (sai với Neutral/Balanced đã chốt, và sai với sinh viên lớn tuổi); `anh/chị` tạo
khoảng cách; `chúng ta` là **lối không ngôi đội lốt ngôi** — "chúng ta sẽ chạy đoạn code này"
thì ai chạy?

---

## 6. Hàng rào chống tụt

Corpus hiện **đã gần đích** ở mấy mục này (`tiến hành`/`đối với`/`thông qua`/`nhằm`/`vui lòng`
= **0 lần**; danh-từ-hoá đầu đoạn 1/738; câu có ≥2 hedge 6/2791). Các luật dưới đây giữ cho nó
không tụt, chứ không phải việc phải làm bây giờ.

### L4 · Không mở câu bằng `Việc/Sự/Quá trình/Khả năng…` + động từ — LỖI

⚠️ **Bẫy script:** đừng dò bằng `\bviệc\s+\w`. Nó ra 76 kết quả với **~95% dương tính giả**
(`làm việc`, `công việc`, `việc này`, `khỏi việc`). **Phải neo vào đầu câu.**

### L5 · Cấm khuôn sao phỏng `được/bị + V + bởi` — LỖI

⚠️ **Đừng viết bộ dò câu bị động cho tiếng Việt.** Giới ngôn ngữ học chưa thống nhất tiếng Việt
có bị động hay không (Cao Xuân Hạo 2003; Nguyễn Kim Thản; Nguyễn Minh Thuyết coi `bị/được` là
động từ thực). Corpus có **230 `được+V` + 45 `bị+V`**, gần hết vô tội. Chỉ cấm khuôn có `bởi`
— hiện có **1**.

### L6 · Từ cấm hành chính — LỖI

`thực hiện` (khi thay được bằng động từ thật), `đối với`, `nhằm`, `thông qua việc`,
`một cách` + tính từ, `tiến hành`, `vui lòng`.

⚠️ **Ít nhất 4 trong 11 ca hiện tại là DƯƠNG TÍNH GIẢ** — đọc trước khi "sửa":
"một cách truy cập", "một cách gom", "một cách nêu" là **danh ngữ** ("một cách
để…"), không phải trạng ngữ `một cách + tính từ` mà luật cấm. Phân biệt được cần từ
loại của từ đứng sau, tức cần tách từ — thứ §10 nói rõ là đừng cài. Nên L6 là luật
phải **đọc từng ca**, không phải luật sửa hàng loạt.

### L12 · ≤ 1 hedge mỗi câu — LỖI

**Không cấm `có thể`.** Nhiều chỗ nó đúng và cần. Cấm là **chồng**: hiện có 10 câu chồng ≥ 3
hedge, nặng nhất 4.

> ❌ PD04 — "Chỉ điền 0 nếu thiếu thực sự có nghĩa là không phát sinh; nếu chưa nhận được báo
>   cáo, điền 0 có thể làm sai doanh thu."

Số nền: **703 hedge / 16,95 trên 1000 từ** — một lần mỗi 4,4 câu. Trong đó **67 lần** là
phủ-định-gấp-đôi nói về điều **không** xảy ra (`không tự`, `không có nghĩa`, `chưa phải`).

⚠️ **Bản đầu của đặc tả này TỰ MÂU THUẪN ở L12** và bộ kiểm bắt được: §6 ghi "câu có
≥2 hedge: 6/2791", §11 ghi "10 câu" cho ngưỡng ≥3. Không thể có 10 câu ≥3 hedge mà
chỉ 6 câu ≥2 — tập sau chứa tập trước. Số đo lại, bằng một danh sách hedge hẹp hơn:
**447 hedge · 47 câu ≥2 · 4 câu ≥3**. Ngưỡng: **lỗi ở ≥3**, cảnh báo ở ≥2.

### L13 · Ưu tiên từ thuần Việt theo danh sách cặp tường minh — CẢNH BÁO

Danh sách hữu hạn, nằm trong `thuatngu.json` nhóm B.

---

## 7. Tách người nghe: cái gì là bài học, cái gì là ghi chú

Đây là lỗi của **bản `.md`/PDF bàn giao**, không phải của sản phẩm. Đã kiểm: `data/course.json`
— nguồn thật để tích hợp — **không chứa một câu nào** trong số này.

Nhưng nó ảnh hưởng người đọc bản bàn giao (chủ dự án, giáo viên, dev), và nó là lý do bộ này
"đọc thấy khô":

| | Số |
|---|---|
| Phần giảng thật | **8,0%** của 521 502 từ |
| Ngân hàng luyện + đáp án | 63,3% |
| **Câu khuôn mẫu lặp ở ≥ 20 file** | **91 câu = 17,6%** |
| Từ người học đi qua **trước** câu giảng đầu tiên | **202,5** (phần giảng chỉ có 230,4) |

Năm câu xuất hiện ở **đủ 180/180 file**, cả năm là câu quy trình cho dev:

```
"Xem kết quả mẫu hoặc đánh dấu checklist không tự xác nhận bài đã chạy."
"Bộ chọn xét kỹ năng/tiên quyết/mức hỗ trợ; đây không phải chuỗi bắt buộc."
"Nếu chưa biết bắt đầu, mở gợi ý thứ nhất; sau khi thử mới đọc kết quả mẫu."
"Luôn có đường tự viết, giải thích quyết định hoặc thực hành thật khi mục tiêu đòi hỏi."
"Với câu tự viết, lưu đầu vào, code/version, ca kiểm và điều kiện thực hiện."
```

**Luật:** mỗi mục trong file bài phải khai nó viết cho ai. Mục cho dev gom xuống cuối, hoặc
ra file riêng. Mục `Kết quả ví dụ đã chuẩn bị:` (176/180 file) **chen vào giữa phần giảng** —
đó là nhãn giao diện, không phải câu văn.

---

## 8. Trắc nghiệm

Phần này dựa trên bằng chứng ngoài, không phải quy ước. Số đo của ngân hàng hiện tại:
**1 032 câu, tất cả đúng 3 phương án, 50,3% đáp án ở vị trí 1, 172 câu cùng tiêu đề,
124 câu cùng câu dẫn, một dạng câu hỏi duy nhất.**

### M1 · Giữ **3 phương án** làm mặc định

| Nguồn | Số |
|---|---|
| Rodriguez 2005 (27 nghiên cứu / 56 phép thử) | 4→3: độ phân biệt **+.031**, độ tin cậy **+.019**. 5→3: không khác. 3→2: độ tin cậy **−.065** |
| Gierl 2017, *Review of Educational Research* | *"evidence and consensus that using two distractors and a correct response option is optimal"* |
| Tarrant 2009 (514 câu / 1 542 nhiễu) | chỉ **52,2%** nhiễu hoạt động; **12,3%** câu có **0** nhiễu hoạt động |

Con số cuối là con số quyết định: ngân hàng "4 phương án" do người soạn viết, trên thực tế là
ngân hàng **~2,5 phương án**.

**Luật:** 3 là mặc định. Phương án thứ 4 **chỉ khi** nó là một ngộ nhận có tài liệu thật.
**Không bao giờ 2.**

### M2 · Trộn vị trí đáp án — **ngẫu nhiên CÓ PHÂN TẦNG, ở khâu build, seed cố định**

Không xoay theo công thức (bệnh hiện tại), không ngẫu nhiên thuần: với đề 3 câu, xác suất cả 3
cùng vị trí là 1/9, tức ~19/172 bài sẽ trông y như bệnh cũ.

Với đề **lập trình**, thiên lệch đi theo hướng **vị trí đầu** (Tellinghuisen & Sulikowski, 676
sinh viên; Bresnoc 1989) — nên 50,3% đáp án ở vị trí 1 làm cả ngân hàng **dễ hơn và phân biệt
kém hơn**, không chỉ cho mẹo đoán.

Bốn bẫy: không trộn phương án là **dãy số/thứ tự**; **cấm hẳn** "tất cả đều đúng"; nhiễu giống
đáp án nhất không được luôn đứng liền trước đáp án; độ dài các phương án phải đều.

### M3 · Mỗi phương án nhiễu phải có **lý do lưu kèm**

Hoặc **(A)** là đầu ra THẬT của một chương trình sai thật, hoặc **(B)** một ngộ nhận có tên
trỏ về nguồn (progmiscon.org có 247 bản ghi, có Python, trường *Incorrect Statement* dùng thẳng
được).

Dự án có sẵn Pyodide + 556 biến thể sai trong `check-practice.mjs`: viết biến thể sai có chủ
đích (lệch chỉ số 1, `=` vs `==`, biên `range`, `append` trả `None`), **chạy thật**, lấy đầu ra
thật làm nhiễu. Kiểm được trong CI.

⚠️ **Sadler 1998:** nhiễu nào có tỉ lệ chọn **đạt đỉnh ở nhóm năng lực giữa** là nhiễu **TỐT**.
Đừng loại nó như câu lỗi.

**Lý do phải LƯU lý do:** nó là nguyên liệu cho phản hồi có giải thích ở M5 — chênh lệch
d = 0,49 so với d = 0,05. Không lưu lúc build thì M5 không làm được.

### M4 · Phủ dạng câu hỏi theo **Block Model**

Lưới 3 × 4: cột *Text surface* / *Program execution* / *Function-Purpose*, hàng *Atom* /
*Block* / *Relations* / *Macro*. Ngân hàng hiện tại nằm **100% trong một ô**:
`Macro × Program execution` ("đoạn này in gì"). Ba cột là ba thứ **khác bản chất**, không phải
ba mức khó.

**Luật kiểm được:** không bài nào được có cả 3 câu trong cùng một ô.

⚠️ **Yêu cầu thiết kế, không phải tuỳ chọn:** dạng "dự đoán kết quả" có tác dụng qua cơ chế
*đoán sai → ngạc nhiên → chú ý dồn vào đáp án đúng* (Brod 2021). **Nếu không hiện đầu ra THẬT
ngay sau khi người học đoán thì dạng này mất phần lớn giá trị.**

⚠️ **Đừng dùng** giả thuyết "trace trước, viết code sau" làm lý lẽ: nó **đã không nhân bản
được** (Fowler 2022, 600+ sinh viên, SEM).

### M5 · Bỏ bắt-làm-lại-tới-khi-đúng

Van der Kleij 2015 (**40 nghiên cứu / 70 cỡ hiệu ứng**):

| Loại phản hồi | d |
|---|---|
| Có **giải thích** | **0,49** |
| Hiện đáp án đúng | 0,32 |
| Chỉ nói đúng/sai | **0,05** |

Nút "Thử lại" không kèm giải thích **chính là loại d = 0,05**. Butler 2007: bắt-làm-lại
**tương đương** hiện thẳng đáp án, không hơn. Và với 3 phương án, làm lại vô hạn đảm bảo đúng
sau tối đa 3 lần bấm — câu hỏi **không còn mang thông tin nào**.

**Luồng đúng:** trả lời MỘT lần (tính điểm) → hiện đáp án + vì sao từng phương án sai + đầu ra
thật → **cho đi tiếp bất kể đúng sai** → hỏi lại cùng ngộ nhận bằng câu **khác**, muộn hơn.

**Bằng chứng mục này HỖN HỢP** (vài nghiên cứu ủng hộ multiple-try). Phát biểu mạnh nhất được
phép: *bắt làm lại không mua thêm gì so với hiện đáp án, và trên 3 phương án nó phá giá trị đo
lường.*

⚠️ Giữ 3 phương án **mà vẫn** cho làm lại vô hạn là kết hợp tệ nhất: sàn đoán mò 33,3% chỉ
chấp nhận được khi mỗi câu chỉ được trả lời một lần.

---

## 9. Ba thứ script KHÔNG làm được

Nói ra để không ai tưởng bộ kiểm xanh là văn phong đã đạt:

1. **Không đếm được "ý"** — nên L2 chỉ là xấp xỉ.
2. **Không dò được giọng Neutral** — L6 là danh sách hữu hạn nên **sẽ bỏ sót**.
3. **L10 chỉ kiểm có mặt chú giải**, không kiểm chú giải đúng hay đủ.

---

## 10. Nơi đặt bộ kiểm

`scripts/pe-da/check_vanphong.py`, gọi từ `check.py --strict` (bản CI chạy).

Hai tiền xử lý **bắt buộc**:

1. Thay nội dung trong `` ` `` bằng token trơ **trước khi đếm** — nếu không, mọi phép đếm
   thuật ngữ và độ dài câu đều sai.
2. `.replace('\r', '')` — cây mã là CRLF và `.` của regex không khớp `\r`. Bẫy này đã ghi
   trong AGENTS.md và đã cắn hai lần.

**Đơn vị đếm là TIẾNG (âm tiết), không phải "từ".** Tách từ tiếng Việt cần underthesea hoặc
VnCoreNLP (F1 ~97%, nhiễu ~3%), và mọi ngưỡng ở trên đã hiệu chuẩn theo tiếng.

---

## 11. Bảng tra nhanh

| | Luật | Mức | Corpus hiện trượt |
|---|---|---|---|
| L1 | Câu > 25 tiếng cảnh báo, > 30 lỗi | CB/LỖI | 25 lỗi · 94 cb |
| L2 | Đoạn > 90 tiếng hoặc > 6 câu | CB/LỖI | 7 lỗi · 19 cb |
| **L3** | **Câu ≥ 3 dấu `,`/`;` và ≥ 20 tiếng → bảng** | **LỖI** | **48 câu** |
| L4 | Không mở câu bằng danh-từ-hoá | LỖI | 6 |
| L5 | Cấm `được/bị + V + bởi` | LỖI | 2 |
| L6 | Từ cấm hành chính (≥4/11 là dương tính giả) | LỖI | 11 |
| L7 | Chỉ "bạn" | LỖI | 0 lỗi · 19 cb |
| **L8** | **Mật độ thuật ngữ ≤ 40/1000 tiếng** | CB/LỖI | **43 lỗi · 30 cb** |
| L9 | ≤ 3 thuật ngữ mới mỗi màn — *hàng rào* | CB/LỖI | **0** (max đo được 3) |
| **L10** | **Thuật ngữ lần đầu phải có chú giải** | **LỖI** | **65** |
| L11 | Một thuật ngữ một cách gọi, khoá (thuật ngữ, ngữ cảnh) | LỖI | 16 |
| L12 | ≤ 1 hedge/câu (lỗi ở ≥3) | LỖI | 4 lỗi · 43 cb |
| L13 | Ưu tiên thuần Việt theo danh sách | CẢNH BÁO | 0 lỗi · 247 cb |
| TB | Bất biến termbank: `baiDauTien` khớp corpus | LỖI | 0 |
| §4-A | Định danh nhóm A phải nằm trong backtick | CẢNH BÁO | 266 |
| **M1** | **3 phương án mặc định** | **LỖI** | 0 (đang đúng) |
| **M2** | **Trộn vị trí có phân tầng** | **LỖI** | **1 032/1 032** |
| M3 | Nhiễu phải có lý do lưu kèm | LỖI | 1 032 |
| M4 | Không bài nào 3 câu cùng một ô Block Model | LỖI | 172/172 |
| M5 | Một lần trả lời, rồi đi tiếp | LỖI | toàn bộ |

**Tổng trên corpus thật: 227 lỗi · 718 cảnh báo.**

**Nếu chỉ làm được một việc:** L10. Cụ thể: `py -I scripts/pe-da/check_vanphong.py
--luat L10 --chi-tiet 0` in ra đúng danh sách bài + câu phải sửa.
**Nếu làm được hai:** thêm M2 (trộn vị trí — 46 bài đang cho 5/6 điểm cho người chọn "a").

---

## 12. Đừng bật `--strict` trong CI ngày đầu

`check_vanphong.py` hôm nay cho **227 lỗi**. Nối thẳng vào `check.py --strict` là
làm CI đỏ ngay, và một CI đỏ thường trực thì không ai đọc nữa.

Dùng đúng khuôn mà repo đã có cho lint backend: **một mốc trần, CHỈ ĐƯỢC HẠ**
(AGENTS.md: "mốc trần trong CI là 245, chỉ được hạ"). Đặt trần ở 227, hạ dần theo
từng đợt sửa.
