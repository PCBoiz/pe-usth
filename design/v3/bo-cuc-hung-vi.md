# Bố cục hùng vĩ — đặc tả vẽ lại bản đồ sao

> Viết 19/10/2026, sau lời chê thứ NĂM: *"Chưa, chưa hề đến. Cảnh tượng trong Echo of
> Starsong hùng vĩ hơn nhiều, với mặt trời chói loá đứng chính giữa, và các vì sao, hành
> tinh nằm rải rác xung quanh… chí ít hãy học cách vẽ bản đồ thế giới của Opus Echo of
> Starsong để làm bản world map của mình hoành tráng hơn nữa, đổ bóng các kiểu, như thể
> người học đang chơi một trò chơi vũ trụ."*

Tài liệu này **không thay** `ban-do-sao.md`. Nó thay các mục **§3.1 (lớp), §5 (bảng màu —
chỉ phần nguồn sáng), §15 (bố cục)** và thêm hai lớp vật thể mới. Nghĩa của tám chặng
(§2), luật bậc độ sáng theo số ca chấm (§6), luật nhãn (§8), luật hai hồ sơ (§19) **giữ
nguyên**.

Mọi con số dưới đây hoặc là **phép đo tôi tự chạy trong phiên này** (ghi rõ "đo"), hoặc là
**phán đoán** (ghi rõ "phán đoán"). Script đo nằm ở
`C:\Users\sonkh\AppData\Local\Temp\claude\d--pe-usth\d5bd48bc-3397-43ac-8556-b112fd0c82d3\scratchpad\`
(tạm, không commit); mọi phép đo đều lặp lại được bằng PIL + numpy trên
`design/tham-chieu/ban-do-sao-game.png` và bằng `py -I scripts/star/build_sky.py --do`.

---

## 1 · Chẩn đoán, bằng MỘT con số

Chẩn đoán của đề bài (không có điểm tụ, ba chòm chữ nhật, mọi chòm một cỡ, không che
khuất, chỉ một thể loại vật) đều đúng — tôi đo lại và xác nhận từng cái ở §2. Nhưng tất cả
năm cái đó là **triệu chứng của một cái**, và cái đó đo được bằng một bảng:

**Phân bố diện tích theo bậc độ chói** (đo: khung tham chiếu bỏ UI chrome 24% diện tích;
bản hiện tại đo bằng `do_sang_rgb` trên lưới 8 px, 17 510 mẫu):

| bậc | L | khung tham chiếu | **bản của mình** |
|---|---|---|---|
| đen sâu | < 0,01 | 20,5 % | **89,7 %** |
| nền trời | 0,01–0,03 | 23,1 % | 6,8 % |
| tinh vân mờ | 0,03–0,08 | 24,0 % | 0,23 % |
| tinh vân | 0,08–0,18 | 11,0 % | 0,25 % |
| tinh vân sáng | 0,18–0,35 | 8,0 % | 0,26 % |
| rìa quầng | 0,35–0,60 | 7,4 % | 0,21 % |
| quầng | 0,60–0,85 | 3,7 % | 2,55 % |
| lõi chói | > 0,85 | 2,5 % | **0,00 %** |

Năm bậc GIỮA (L 0,03 → 0,85) chiếm **53,9 %** khung tham chiếu và **0,95 %** bản của mình.

**Một bức tranh là phần TRUNG GIAN của nó.** Bản hiện tại là một hàm hai giá trị: 89,7 %
đen tuyệt đối, 2,55 % một mảng sáng phẳng ở 0,60–0,85, và gần như không có gì ở giữa. Đó
là định nghĩa của một SƠ ĐỒ — hình nằm trên nền, nền không phải là gì cả. Bốn lời chê
trước ("mảng phẳng tô gradient", "chưa có liên kết", "vẫn là sơ đồ") đều là người xem đang
chỉ vào cái lỗ 53 điểm phần trăm này bằng những chữ khác nhau.

Mọi thứ còn lại trong tài liệu này phục vụ một việc: **lấp phần giữa, và lấp bằng ÁNH
SÁNG CÓ HƯỚNG** chứ không bằng cách tăng độ sáng nền.

### 1.1 · Và một con số thứ hai, về nguồn sáng

Đo bản hiện tại dọc một tia từ tâm nguồn sáng (124, 104), dùng chính `do_sang_rgb`:

```
r =   0 … 90   L = 0,7996  (phẳng tuyệt đối, không đổi một phần nghìn)
r = 100        L = 0,5185
r = 110        L = 0,1409
r = 120        L = 0,0208
r = 150+       L = 0,0038  (= nền)
```

Đây **không phải một nguồn sáng**. Đây là một cái **đĩa** bán kính 90 px, viền xuyến 30 px.
Hai lý do, cả hai sửa được mà không đụng luật cấm gradient:

1. **Quầng được tô bằng một màu TỐI.** `SKY_PROFILE_DARK.glow = '#4E5468'` có L ≈ 0,095 —
   tối hơn xám trung tính. Mười trong mười sáu vòng của `ve_nguon_sang` dùng màu này. Tức
   là cái gọi là "quầng" đang **hạ** độ chói của vùng nó phủ so với một quầng thật. Quầng
   phải là *độ mờ thấp × màu sáng*, không phải *độ mờ cao × màu tối*.
2. **Đuôi quá ngắn.** `outer/core = 150/92 = 1,63`. Khung tham chiếu đo được **đuôi dài gấp
   ~3,4 lần lõi** (xem §3.2). Một quầng chỉ rộng hơn lõi 63 % thì mắt đọc ra cái lõi, không
   đọc ra ánh sáng.

Cả hai là lỗi THAM SỐ, không phải lỗi của kỹ thuật đĩa đồng tâm. Xem §8.1.

---

## 2 · Xác nhận bằng số năm chẩn đoán của đề bài

Đo bằng `scratchpad/do_chom.py`, đọc thẳng `frontend/src/lib/star-map.ts`:

| chẩn đoán | phép đo | kết quả |
|---|---|---|
| mọi chòm một cỡ | đường kính bao (max khoảng cách hai ngôi) | **3,53 : 1** — và **1,86 : 1** nếu bỏ M8 (M8 chỉ có 2 ngôi). Tức **sáu trên tám chòm nằm trong khoảng 1,86 : 1** |
| ba chòm chữ nhật | nét nằm trong 8° của trục ngang/dọc | M3 **8/8**, M5 **7/7**, M6 **12/12** (6 nét ở 3°, 6 nét ở 80°) |
| còn chòm nào cùng bệnh nhẹ hơn | — | **M7 2/5** (hai cái trục ở đúng 0° và 90°), **M8 1/1** (cặp sao đôi nằm ngang đúng 0°), **M2 2/6** (hai nét ở 4°). **M1 1/7** (một nét 90°), **M4 2/4** (hai nét 90°). Tổng cả bản đồ: **27 / 50 nét** nằm trong 8° của một trục |
| không có điểm tụ | nguồn sáng ở (124, 104) = **9,1 % bề rộng, 12,7 % bề cao** — góc trên-trái | xác nhận |
| rải gần đều | chỉ số Clark–Evans R (khoảng cách láng giềng gần nhất trung bình ÷ kỳ vọng ngẫu nhiên) | **R = 1,37**. R > 1 nghĩa là **rải đều hơn cả ngẫu nhiên** |
| không vật nào che vật nào | grep `clip`/`mask`/thứ tự vẽ chồng trong `build_sky.py` | lớp xếp chồng nhưng **không một vật thể nào cắt đường bao của vật khác** |
| chỉ một thể loại vật | lớp trong `SKY_LAYERS` | sao nền · 48 ngôi · nét chòm · tinh vân · lưới · mạch. **Không có vật thể RẮN nào** |

---

## 3 · Khung tham chiếu, đo chứ không tả

`design/tham-chieu/ban-do-sao-game.png`, 1624 × 907. Đo trên bản thu về 900 px, luminance
sRGB → tuyến tính theo BT.709.

### 3.1 · Mặt trời KHÔNG nằm chính giữa — và nói ra chỗ mình cố ý làm khác

Chủ sản phẩm nhớ là "chính giữa". **Phép đo nói khác:** blob sáng trội nhất (L > 0,6, lọc
liên thông) có tâm ở **x = 0,791 · W, y = 0,401 · H**, đường kính tương đương 0,1396 · W.
Trên khung 1360 × 820 của mình, đó là **(1 076, 329)**.

Phán đoán về việc vì sao trí nhớ và phép đo lệch nhau: thứ chiếm giữa khung tham chiếu là
**khối tinh vân**, còn mặt trời là thứ SÁNG nhất. Ở một bức có đúng một nguồn sáng, "chính
giữa" trong trí nhớ thường có nghĩa "trung tâm của sự chú ý", không phải trung tâm hình
học.

**Quyết định: đặt mặt trời ở x = 680 (chính giữa THẬT theo trục ngang), y = 313.** Lý do
ghi rõ cả hai chiều vì chúng được quyết bằng hai lý lẽ khác nhau:

* **Ngang — đi theo lời chủ sản phẩm, không theo phép đo.** Đây là lần chê thứ năm; "chính
  giữa" là một yêu cầu phát biểu rõ ràng và nó cũng là phát biểu mạnh nhất về thứ bậc:
  *cái này là trung tâm, mọi thứ còn lại quay quanh nó*. Khung 1360 × 820 rộng 1,66 : 1 nên
  một mặt trời ở giữa chia khung thành hai cánh rộng trái–phải, và §5 dùng đúng hai cánh
  ấy.
* **Dọc — theo phép đo.** y = 313 = **820 × 0,382**, mặt cắt vàng phía trên. Khung tham
  chiếu đo được y = 0,401 — **lệch mặt cắt vàng đúng 1,9 % bề cao**. Thêm một lý do vật lý:
  nguồn sáng phải cao hơn tầm mắt thì mọi bóng trong bức mới đổ XUỐNG và VỀ PHÍA người xem;
  một nguồn sáng ở đúng tâm hình học của một phong cảnh đọc ra là *một cái lỗ*, không phải
  *một mặt trời*. Và nó phải cách mép dưới đủ xa cho khối chân trời của §7.

### 3.2 · Hồ sơ độ chói theo bán kính — bảng này là thứ phải chép

Đo: lấy **phân vị 75** của L trong từng vành 5 px quanh tâm mặt trời (phân vị 75 chứ không
trung bình: chữ UI tối nằm chồng lên và kéo trung bình xuống). Quy về khung 1360 px, rồi
đổi ngược ra **độ mờ tích luỹ** cần có nếu tô bằng ngà `#F6F1E2` trên nền `#0A0C14`:

| r (px, khung 1360) | L đo được | độ mờ tích luỹ A(r) |
|---|---|---|
| 0 – 70 | 0,955 | **1,00** (bão hoà) |
| 80 | 0,773 | 0,936 |
| 90 | 0,627 | 0,847 |
| 100 – 120 | 0,63 ± 0,005 | 0,851 ± 0,002 ← **thềm phẳng** |
| 130 | 0,591 | 0,824 |
| 140 | 0,538 | 0,788 |
| 150 | 0,432 | 0,708 |
| 160 | 0,299 | 0,590 |
| 170 | 0,206 | 0,487 |
| 180 | 0,130 | 0,381 |
| 190 | 0,082 | 0,292 |
| 200 | 0,060 | 0,241 |
| 220 | 0,050 | 0,216 |
| 250 | 0,037 | 0,174 ← **đuôi KHÔNG về 0** |

Bốn điều đọc ra được, và cả bốn đều là thứ bản hiện tại đang làm ngược:

1. **Lõi phẳng và BÃO HOÀ.** L = 0,955 suốt 70 px rồi mới bắt đầu rơi. Bản của mình đạt
   đỉnh 0,7996 — vì `glowCore = '#F6F1E2'` chỉ có L ≈ 0,88 và không vòng nào đạt α = 1.
   **Ba vòng trong cùng phải tô bằng `core` (`#FFFFFF`) ở α = 1,0.**
2. **Có một THỀM** ở r = 90…125, L ≈ 0,63. Đây là vỏ trong của quầng, và nó là thứ làm mặt
   trời có *cấu trúc* thay vì một sườn trơn. Phán đoán về nguyên nhân vật lý: tán xạ trong
   lớp khí gần sao. Dù nguyên nhân là gì, nó đo được và phải chép.
3. **Đầu gối dốc** ở r = 125…200: L đi từ 0,62 xuống 0,06 — khớp luỹ thừa cho
   **A(r) ∝ r^(−2,88)**, gần đúng 1/r³ (luật của một vỏ cầu mỏng quang học). Khớp trên dải
   70…210 px cho `A(r) = 338 · r^(−1,30)`, sai ở hai đầu — nên **dùng BẢNG, đừng dùng công
   thức**.
4. **Đuôi không bao giờ về nền.** L dừng ở 0,037 ở r = 250 và hoà vào tinh vân — cao gấp
   ~10 lần nền trời tối. Bản của mình rơi về 0,0038 ở r = 150: một vách **gấp 40 lần** trong
   30 px. Đó chính là cái "mép lồi lõm như đám mây, đọc ra như một vết mực loang": không
   phải mép sai hình, mà là **mép TỒN TẠI**. Một quầng thật không có mép.

### 3.3 · Ngân sách sáng chia cho ai

Đo (bỏ UI chrome, lấy mẫu toàn khung):

| nguồn | % diện tích có L > 0,5 |
|---|---|
| đĩa mặt trời (r < 0,14 W) | **7,15 %** của vùng không-UI ≈ **5,4 %** của cả khung |
| mọi thứ còn lại (tinh vân + vật sáng phụ) | **2,71 %** của vùng không-UI ≈ **2,3 %** |
| **tổng** | **7,71 %** cả khung — khớp con số 7,73 % đã ghi trong kho mã |

→ **Mặt trời gánh ~70 % ngân sách sáng, tinh vân gánh ~30 %.** Bản của mình đo được 2,759 %
và gần như TOÀN BỘ là mặt trời. Tức phần thiếu không nằm ở mặt trời; nó nằm ở **tinh vân
chưa được chiếu sáng**. Đây là chỗ "đổ bóng các kiểu" đi vào, và nó cũng là bước 1 của §12.

Hai số nữa, đo trong vùng tinh vân:

* **Tương phản cục bộ** (ô 27 px, p90 ÷ p10): trung vị **2,49**, p90 **7,00**. Tinh vân
  tham chiếu không mịn — trong mỗi ô cỡ bằng một ngón tay có một vùng sáng gấp 2,5 lần
  vùng tối.
* **Bão hoà trung bình 0,197**, trung vị 0,177. Bản của mình: **0,387** (0,241 nếu có trọng
  số theo độ chói). Màu vẫn đang no hơn tham chiếu — xem §10.3.

### 3.4 · Vành trống quanh mặt trời

Hồ sơ bán kính cho thấy tinh vân **không chạm** mặt trời: ở r = 0,16…0,22 · W độ chói trung
bình chỉ 0,038–0,048, rồi mới tăng lên 0,25–0,30 ở r = 0,27…0,51. Tức có một **vành TỐI
rộng ~0,08 · W (≈ 110 px)** cô lập mặt trời.

Đây là thiết bị bố cục mạnh nhất của khung tham chiếu và nó miễn phí: *tương phản cục bộ
tối đa ở đúng chỗ mắt phải nhìn trước*. Bản này chép nguyên: §5 để trống đĩa r < 250 quanh
mặt trời, không một ngôi nào, không một nét nào.

---

## 4 · Học từ tranh, không chỉ từ một khung hình

Ghi rõ mức tin cậy từng dòng.

**Chesley Bonestell (1888–1986).** Có nguồn: ông đi lên từ **matte painting ở Hollywood**
(*The Hunchback of Notre Dame*, *Citizen Kane*) và mượn kỹ thuật của Scriven Bolton — **dựng
mô hình bề mặt rồi CHỤP ẢNH, sau đó vẽ sao và tiểu hành tinh thẳng lên tấm kính**
([Wikipedia](https://en.wikipedia.org/wiki/Chesley_Bonestell),
[arXiv 1703.08138](https://arxiv.org/pdf/1703.08138)). Điều rút ra, và nó rất cụ thể với bản
này: một matte painting **bắt buộc phải tách ba lớp rời** — tiền cảnh rắn và tối, trung
cảnh là chỗ xảy ra chuyện, hậu cảnh là trời — vì chúng nằm trên ba tấm kính khác nhau.
Tiền cảnh của mình hiện KHÔNG tồn tại. §7 dựng nó.

**Repoussoir và phối cảnh khí quyển.** Luật cổ điển: một khối tối, thường ở mép khung và
thường bị cắt bởi mép khung, đặt trước để đẩy trung cảnh ra xa. Tôi **không tìm được nguồn
nào trong phiên này khẳng định** Claude Lorrain đặt mặt trời ở đúng giữa khung; hồ sơ bảo
tàng của *A Seaport at Sunrise* (1674, Alte Pinakothek) chỉ xác nhận **kiến trúc đóng khung
hai bên** và ánh nắng sớm trên mặt nước
([Pinakothek](https://www.sammlung.pinakothek.de/en/artwork/Y0GR58rLRX), [mục lục Smith
1837](https://digi.ub.uni-heidelberg.de/diglit/smith1837bd8/0518)) — và hai nguồn còn mâu
thuẫn nhau về việc toà nhà nằm bên trái hay bên phải. **Nên tôi dùng repoussoir như một
luật nghề đã biết, không viện dẫn một bức cụ thể.**

**Hubble/JWST đã xử lý.** Phán đoán, từ kiến thức: ảnh công bố luôn bị kéo giãn phi tuyến
(thường asinh), và hệ quả đo được chính là cái bảng §1 — phần GIỮA được bơm phồng, đuôi
sáng bị nén. Đó là lý do một bức ảnh thiên văn "đẹp" có 54 % diện tích ở trung gian còn một
bức render thô có 90 % ở đen.

**Elite Dangerous / No Man's Sky / Outer Wilds.** Phán đoán, từ kiến thức: cả ba đều đặt
một vật thể rắn gần máy quay (buồng lái, một mặt trăng, một mảnh vỏ hành tinh) ngay cả khi
nó chẳng mang thông tin gì — để có một vật ĐÃ BIẾT CỠ làm thước. Không có thước thì không
có hùng vĩ, vì hùng vĩ là một **tỉ số**, không phải một kích thước.

**Điều rút ra chung, và nó là luật tổ chức của §5–§8:**

> Hùng vĩ = (một điểm tụ sáng) × (một thước ở tiền cảnh) × (tỉ số cỡ lớn giữa hai cái đó)
> × (một hướng sáng duy nhất mà MỌI vật tuân theo).

Bản hiện tại có 0 trên 4.

---

## 5 · Bố cục đã chốt — mọi con số

Khung **1360 × 820**. Mọi toạ độ dưới đây đã chạy qua `scratchpad/layout5.py`, tự kiểm bốn
điều: nằm trong khung, khe tới mặt trời, khe ngôi–ngôi giữa hai chòm, và không ngôi nào
chìm dưới chân trời.

### 5.1 · Mặt trời

| đại lượng | giá trị | lý do |
|---|---|---|
| tâm | **(680, 313)** | §3.1 |
| bán kính lõi | **62** | lõi = 9,1 % bề rộng; tham chiếu 70/1360 = 5,1 % nhưng tham chiếu có cả khối tinh vân chiếm giữa, bản này thì mặt trời phải tự gánh vai trò ấy |
| bán kính quầng | **210** | tỉ số quầng : lõi = **3,39 : 1** (tham chiếu đo được ~3,4 : 1; bản cũ 1,63 : 1) |
| đường kính quầng | 420 px = **30,9 % bề rộng khung** | |
| bán kính đường đẳng L = 0,5 | **≈ 120** | ⇒ diện tích L > 0,5 do mặt trời = π·120² = 45 239 px² = **4,06 % khung** |
| vùng CẤM tuyệt đối | r < **170** | không ngôi, không nét, không nhãn |
| vùng MỀM | 170 ≤ r < **250** | ngôi và nét được phép; **nhãn thì không**; mọi vệt trong vùng này đổi tông theo §9.4 |
| đĩa trống | r < 250 = **17,6 % diện tích khung, 0 ngôi** | §3.4 |

**Hồ sơ độ mờ: dùng BẢNG §3.2 nhân tỉ lệ 210/250 = 0,84**, nội suy cubic đơn điệu giữa các
mốc. Mốc sau khi nhân tỉ lệ:

| r | 0–59 | 67 | 76 | 84–101 | 109 | 118 | 126 | 134 | 143 | 151 | 160 | 168 | 185 | 210 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A(r) | 1,00 | 0,936 | 0,847 | 0,851 | 0,824 | 0,788 | 0,708 | 0,590 | 0,487 | 0,381 | 0,292 | 0,241 | 0,216 | 0,174 |

**Đuôi không kết thúc ở 210.** Từ 210 tới 340, A giảm tuyến tính 0,174 → 0,000, và trong
khoảng đó tinh vân (§8.2) đã sáng lên đủ để không ai thấy chỗ nó hết. Đây là bản sửa cho
"mép lồi lõm như vết mực loang": **mép biến mất vì nó được một lớp khác đỡ lấy, không phải
vì nó được làm mềm hơn.**

**Màu từng vòng** (khoá trong `SkyProfile`, không có mã hex nào ở Python):

| vòng | A(r) | khoá màu | ghi chú |
|---|---|---|---|
| trong cùng, A ≥ 0,97 | | **`core`** `#FFFFFF` | mới — bản cũ không dùng, nên p99 chỉ đạt 0,7996 |
| 0,55 ≤ A < 0,97 | | `glowCore` `#F6F1E2` | |
| A < 0,55 | | **`glowRim`** — khoá MỚI, đề xuất `#D8C9A8` | ngà ấm hơn, L ≈ 0,62 |
| — | | ~~`glow` `#4E5468`~~ | **BỎ khỏi nguồn sáng.** L = 0,095, tối hơn xám trung tính; đây là nguyên nhân #1 ở §1.1. Giữ khoá cho chỗ khác nếu còn ai dùng |

**Số vòng: 128** (bản cũ 16). Tính: mỗi vòng bước đều theo ĐỘ MỜ TÍCH LUỸ, nên bước sRGB
mỗi vòng = (0,95 − 0,055) / 128 = 0,00699 = **1,78 / 255 mã màu** — dưới ngưỡng thấy được
dải (ngưỡng thực hành cho một dốc 8 bit là 2 mã; 16 vòng cho **14,3 mã**, tức dải nhìn
thấy rõ). Số điểm mỗi vòng `seg(r) = clamp(40, round(r / 1,8), 128)`; dùng lệnh đường TƯƠNG
ĐỐI (`l dx dy`) nên mỗi điểm ≈ 5,5 byte. **Dung lượng thêm ≈ 59 KB** (tính: 128 vòng ×
seg trung bình 84 × 5,5 B).

**Rìa vẫn méo** như `LIGHT.warp` đang làm (ba sóng 3/5/9, biên độ tăng theo r) — giữ
nguyên, vì nó là thứ giữ cho 128 vòng khỏi đọc ra 128 vòng tròn. **Thêm** một dao động
tần số cao riêng cho từng vòng, biên độ **0,45 × khoảng cách hai vòng** — dưới một nửa nên
hai vòng **vẫn không thể cắt nhau** (ràng buộc cũ còn nguyên) nhưng biên giới thôi trùng
pha.

**Vệt loé ngang** (`LIGHT.flare`): giữ, nhưng span 3,4 × `outer` nay là 714 px mỗi bên —
tràn khung. Hạ **span = 2,6** (546 px nửa vệt, tức vệt dài 1 092 px = 80 % bề rộng, vẫn
đọc ra ngay). Thêm **vệt dọc** cùng luật, dài 0,45 × vệt ngang — hai vệt vuông góc là chữ
ký đọc-ra-ngay của "một nguồn sáng qua thấu kính", và nó là chỗ DUY NHẤT trong bản đồ được
phép có hình căn trục (§6 cấm góc vuông cho CHÒM; vệt loé không phải một chòm).

### 5.2 · Ngân sách sắc độ — bảng gác, thay cho bảng chẩn đoán §1

Mục tiêu cho hồ sơ TỐI, đo bằng `--do` trên lưới 4 px:

| bậc | L | mục tiêu | khoảng cho phép | hiện |
|---|---|---|---|---|
| đen sâu | < 0,01 | 32 % | 24–42 % | 89,7 % |
| nền trời | 0,01–0,03 | 25 % | 18–32 % | 6,8 % |
| tinh vân mờ | 0,03–0,08 | 19 % | 13–26 % | 0,23 % |
| tinh vân | 0,08–0,18 | 9,5 % | 6–14 % | 0,25 % |
| tinh vân sáng | 0,18–0,35 | 5,4 % | 3,5–8 % | 0,26 % |
| rìa quầng | 0,35–0,60 | 5,4 % | 3,5–8 % | 0,21 % |
| quầng | 0,60–0,85 | 2,6 % | 1,6–4 % | 2,55 % |
| lõi chói | > 0,85 | 1,1 % | 0,7–2,0 % | 0,00 % |

Ba cái gác suy ra từ bảng, thêm vào `SKY_BUDGET`:

* `brightShare` (L > 0,5) mục tiêu **7,0 %**, khoảng **5,5–9,0 %** (hiện 2,759 %).
* `medianMax` giữ 0,05 — nhưng **thêm `medianMin = 0,015`**. Đây là cái gác quan trọng
  nhất của tài liệu này: kiểu hỏng của bản hiện tại là *quá tối ở giữa*, mà **không một ca
  nào đang bắt được nó**. Trung vị mục tiêu **0,030** (tham chiếu 0,0284; hiện 0,0065).
* `midShareMin`: tổng ba bậc 0,03–0,35 phải **≥ 30 %** (tham chiếu 43,0 %; hiện **0,74 %**).

### 5.3 · Thang tỉ lệ — bảy nấc, không ba

| vật | đường kính (px) | nó nói gì |
|---|---|---|
| quầng mặt trời | **420** | khoá học |
| chòm lớn nhất (M1) | **400** | chặng gần người xem nhất |
| lõi mặt trời | **124** | |
| hành tinh cổng R02 | **82** | bài cửa tự kiểm tra |
| chòm nhỏ nhất (M8) | **72** | chặng xa nhất |
| quầng ngôi bậc 1 | **34,4** | bài 14+ ca chấm |
| hành tinh cổng DA01/DA02 | **28** | |
| ngôi bậc 1 | 10,7 | |
| ngôi bậc 5 | 4,4 | bài ít ca chấm nhất |
| sao nền | **2,4** | |

* **Lớn nhất : nhỏ nhất = 420 : 2,4 = 175 : 1** (hiện, theo cùng cách đo: 300 : 2,4 = 125 : 1
  — nhưng 300 ấy là một cái đĩa phẳng nằm ở góc, nên nó không được đọc ra là *xa*).
* **Giữa các HÌNH (chòm) = 400 : 72 = 5,56 : 1** (hiện **3,53 : 1**; bỏ M8 thì **1,86 : 1**).
  Đây là con số mà đề bài hỏi.
* **Giữa các vật mang nghĩa bài học = 82 : 4,4 = 18,6 : 1.**

Luật bán kính 48 ngôi theo số ca chấm (§6 đặc tả cũ) **không đổi** — tỉ lệ mới đến từ cỡ
CHÒM và từ hai lớp vật mới, không từ việc phóng to ngôi nào. Điều kiện này giữ nguyên ca
test "bán kính khớp số ca chấm".

**Vì sao được phép ép tỉ lệ mạnh thế mà không mất khả năng đọc:** commit `c1c1e0e` đã dựng
**tỉ lệ thứ hai** — bấm một chặng là phóng vào nó và tỉ lệ gần giữ lại tên bài thật. Bản đồ
nền KHÔNG còn phải đọc được ở mức BÀI. Trước khi có cú phóng, ép M8 xuống 72 px là làm hỏng
hai bài; sau khi có nó, đó chỉ là một phát biểu về khoảng cách.

### 5.4 · Tám chòm — hộp đã kiểm

| chòm | tâm hộp | hộp `x, y, w, h` | đk bao | khe tới mặt trời | cánh |
|---|---|---|---|---|---|
| **M1** Tiến trình | (235, 575) | `[71, 413, 329, 324]` | **400** | 297 | trái–dưới |
| **M4** Dữ liệu/SQL | (235, 165) | `[100, 43, 269, 243]` | **280** | 365 | trái–trên |
| **M3** GUI | (556, 600) | `[442, 467, 228, 266]` | **275** | 176 ⚠ mềm | giữa–dưới |
| **M2** Đa luồng | (1070, 650) | `[911, 566, 319, 169]` | **330** | 371 | phải–dưới |
| **M5** NumPy | (1030, 450) | `[921, 380, 217, 140]` | **225** | 289 | phải–giữa |
| **M6** pandas | (1175, 250) | `[1088, 173, 173, 155]` | **185** | 421 | phải–trên |
| **M7** Matplotlib | (985, 105) | `[917, 59, 137, 91]` | **140** | 304 | phải–trên |
| **M8** Dự án DA | (1220, 95) | `[1190, 75, 60, 40]` | **72** | 563 | góc phải–trên |

Kiểm đã chạy:

* tất cả tám hộp nằm trong khung với lề ≥ 4 px ✔
* **0 ngôi** nằm trong vùng cấm r < 170; cặp sát nhất là ngôi `G05` của M3 ở **176 px** ⚠
  **đây là chỗ hẹp nhất của cả bố cục** — xê dịch M3 mà không chạy lại kiểm là hỏng
* khe ngôi–ngôi giữa hai chòm nhỏ nhất **60,5 px** (sàn 50) ✔; cặp chật nhất là **M1–M3**
* **0 ngôi** nằm dưới đường chân trời §7 ✔

**Bốn khối, không tám chấm.** Trái–trên (M4) · trái–dưới (M1) · phải–trên chụm ba
(M6 M7 M8, láng giềng gần nhất 161–235 px) · phải–dưới (M2, M5) · và M3 đứng một mình ở
giữa–dưới làm tiền cảnh. Giữa khung là **cột ánh sáng**: từ mặt trời thẳng xuống chân trời,
không một chòm nào — đó là chỗ cho tia sáng §8.3, cho mạch §9.3 và cho nhãn mặt trời.

**Nói thẳng một chỗ KHÔNG đạt:** chỉ số Clark–Evans của bố cục mới là **R = 1,37** — y hệt
bố cục cũ (1,37). Tức xét riêng vị trí tám tâm thì bố cục mới **cũng rải đều như bố cục
cũ**, và tôi không giấu chuyện đó. Lý do nó vẫn đúng: đĩa cấm 17,6 % ở giữa cộng với sàn
khe 50 px ép tám điểm phải phân tán; R < 1 chỉ đạt được nếu cho hai chòm chồng lên nhau,
mà §9.1 cấm. **Cái chữa thật cho "rải gần đều" là CỠ (3,53 → 5,56 : 1) và cái lỗ trống ở
giữa, không phải toạ độ.** Mắt đọc "đều" chủ yếu từ việc mọi thứ bằng nhau.

### 5.5 · Phác

```
 x=0                                                                     x=1360
  ┌──────────────────────────────────────────────────────────────────────┐ y=0
  │                                                  ✦ M7            ·✦✦ │
  │   ╭────────────╮                                 Matplotlib     M8   │
  │   │  M4 Phễu   │                                              Dự án │
  │   │  SQL·tra   │          ╭─ quầng r=210 ─╮         ╭──────────╮    │
  │   ╰────────────╯        ╭─╯   ░░▓▓██▓▓░░   ╰─╮      │ M6 pandas│    │ y=250
  │                      ───┼────▓▓██░██▓▓──────┼───    ╰──────────╯    │
  │                         ╰─╮   ░░▓▓██▓▓░░   ╭─╯                       │
  │  ╭──────────╮              ╰───── ◉ ──────╯        ╭───────────╮    │ y=450
  │  │          │             vùng cấm r<170           │ M5 NumPy  │    │
  │  │ M1 Tiến  │          ╎  ╎   ╎  ╎   ╎  ╎          ╰───────────╯    │
  │  │  trình   │        tia sáng xuyên bụi                             │
  │  ╰──────────╯       ╭─────────────╮            ╭──────────────╮     │ y=600
  │                     │  M3 GUI ◍   │            │  M2 Đa luồng │     │
  │                     │   (cổng)    │            ╰──────────────╯     │
  │                     ╰─────────────╯                                 │
  │ ═══════════════ vành sáng rìa chân trời ═══════════════════════════ │ y=752
  │ ████████████ KHỐI TỐI — không một ngôi nào ████████████████████████ │
  └──────────────────────────────────────────────────────────────────────┘ y=820
```

---

## 6 · Ba chòm chữ nhật, vẽ lại

**Phân biệt hai phép chữa, vì chúng chữa hai bệnh khác nhau:**

* **XOAY** giết tính căn trục. Dùng cho chòm mà hình vốn không phải lưới: M1, M2, M4, M7,
  M8.
* **HỘI TỤ (phối cảnh)** giết tính "máy vẽ". Dùng cho ba chòm phải ĐỌC RA là lưới/bảng/khung
  — xoay một hình chữ nhật thì nó vẫn là hình chữ nhật, mắt vẫn đọc ra "đồ thị".

Sàn kiểm: **mọi nét phải cách trục ngang và trục dọc ≥ 10°.** Hiện 27/50 nét vi phạm ở sàn
8°. Sau khi sửa: **0/50 ở sàn 10°** (đã chạy).

### 6.1 · M3 · Khung cửa — khung MỞ, nhìn chếch

Giữ nghĩa: một khung cửa sổ có thanh chia và một bài cửa ở tâm. Phá hình học: nghiêng, lệch,
**bỏ hẳn cạnh trái** nên khung không khép kín, và thanh chia **không thẳng đứng**.

| mã | lưới 100 × 100 | vai |
|---|---|---|
| G01 | 10, 14 | góc trên-trái |
| G05 | 60, 0 | đầu thanh chia — **nhô CAO HƠN cạnh trên**, nên cạnh trên gãy làm hai |
| G02 | 88, 14 | góc trên-phải |
| G03 | 72, 84 | góc dưới-phải — **thụt vào**, nên cạnh phải nghiêng 103° |
| G06 | 34, 98 | chân thanh chia |
| G04 | 4, 70 | góc dưới-trái |
| R02 | 49, 47 | **bài cửa — thành HÀNH TINH, xem §7.2** |

Nét (7): `G01–G05`, `G05–G02`, `G02–G03`, `G03–G06`, `G06–G04`, `G05–R02`, `R02–G06`.
**Không có `G04–G01`** — khung mở về phía người xem.

Góc đo được: 16° 27° 103° 160° 137° 103° 106°. Nét gần trục nhất cách **16°**.

### 6.2 · M5 · Lưới trần — lưới MỘT ĐIỂM TỤ

Giữ nghĩa: 2 hàng × 3 cột, ba thanh ray nối hàng. Phá hình học: **hàng xa hẹp hơn hàng
gần** (tỉ lệ hội tụ **0,74**), hai hàng nghiêng khác nhau, ba ray không song song.

| mã | lưới (x, y·0,62) | hàng |
|---|---|---|
| N01 | 0, 68 | gần |
| N02 | 42, 86 | gần |
| N03 | 84, 104 | gần |
| N04 | 38, 0 | xa |
| N05 | 72, 12 | xa |
| N06 | 100, 24 | xa |

Nhân `y` với **0,62** trước khi ánh xạ vào hộp (hộp M5 là 217 × 140, tỉ lệ 0,645) — con số
này là một phần của hình, không phải một tham số tự do: ép `y` xuống làm góc nghiêng của
hàng giảm, và lần dựng thử đầu tiên cho ra 4/7 nét ở 7–9°. Toạ độ trên đã bù sẵn.

Nét (7): hai hàng `N01–N02`, `N02–N03`, `N04–N05`, `N05–N06`; ba ray `N01–N04`, `N02–N05`,
`N03–N06`.
Góc đo được: 15° 15° 12° 15° 48° 57° 72°. Gần trục nhất **12°**.

Hội tụ: bề rộng hàng gần 84 đơn vị, hàng xa 62 → **0,74**. Mắt đọc ra ngay "cùng một lưới,
nhìn chếch" — nghĩa `ndarray` còn nguyên.

### 6.3 · M6 · Bàn có nhãn — bàn nhìn TRỤC ĐO

Giữ nghĩa: hàng nhãn trên, cột nhãn trái (hai thứ này vẽ bằng **nét ĐẬM**, `SKY_LINK.emphasis`
— chỗ duy nhất độ dày nét mang nghĩa), bốn ô thân. Phá hình học: hàng nhãn chạy lên-phải
~15°, cột nhãn chạy xuống-phải ~70°, nên mọi ô thành hình bình hành.

| mã | lưới | vai |
|---|---|---|
| PD01 | 6, 34 | ô góc — index gặp columns |
| PD02 | 40, 24 | hàng nhãn |
| PD03 | 72, 16 | hàng nhãn |
| PD04 | 16, 62 | cột nhãn |
| PD05 | 48, 50 | thân |
| PD06 | 78, 40 | thân |
| PD07 | 28, 92 | cột nhãn |
| PD08 | 58, 78 | thân |
| PD09 | 86, 66 | thân |

Nét (12) giữ nguyên danh sách cũ, gồm 4 nét `dam`: `PD01–PD02`, `PD02–PD03`, `PD01–PD04`,
`PD04–PD07`.
Góc đo được: 15° 13° 69° 67° 19° 17° 24° 22° 72° 69° 75° 72°. Gần trục nhất **13°**.

Hội tụ: bước cột 34 → 32 (0,94), bước hàng 28 → 30. Nhẹ — đủ để không ra lưới máy, chưa đủ
để làm biến dạng cái bảng.

### 6.4 · Năm chòm còn lại — xoay

| chòm | góc xoay | góc nét trước | sau |
|---|---|---|---|
| **M1** | **+48°** | 90 154 120 15 26 60 165 (1 vi phạm ở 8°) | 42 106 72 33 22 12 117 — **0 vi phạm ở 10°** |
| **M2** | **+15°** | 35 4 31 33 4 36 (2 vi phạm) | 20 11 46 48 19 21 — 0 |
| **M4** | **+16°** | 41 90 139 90 (2 vi phạm) | 57 106 155 106 — 0 |
| **M7** | **−17°** | 90 0 36 26 30 (2 vi phạm) | 107 17 53 43 47 — 0 |
| **M8** | **+34°** | 0 (1 vi phạm) | 34 — 0 |

M1 cần tới 48° vì hình của nó có nét ở 90°, 15° và 165° cùng lúc — ba góc đó chốt gần cả
hai trục, nên mọi góc xoay nhỏ đều đẩy một nét vào trục kia. 48° là góc nhỏ nhất tôi tìm
được mà cả bảy nét đều thoát (đã thử 35°, 40°, 45°; 40° cho một nét ở đúng 10°).

**Xoay KHÔNG đổi nghĩa** — hình bảo toàn hoàn toàn, nên ca test `hình M1 "Kẹp"` (một cán,
hai càng rời rồi gặp lại) vẫn xanh. Đó là lý do xoay được ưu tiên hơn vẽ lại ở năm chòm
này: vẽ lại là phải biện hộ lại nghĩa, xoay thì không.

---

## 7 · Hai lớp vật thể MỚI — và cả hai đều phải trả lời "cái này nói gì về khoá học"

Luật của kho mã: không thêm vật trang trí. Hai lớp dưới đây không phải trang trí — chúng
VẼ RA hai sự thật mà bản đồ hiện đang nói bằng chữ hoặc không nói.

### 7.1 · Khối chân trời — tiền cảnh, repoussoir, và cái thước

Lớp hiện có `SKY_HORIZON` là một **dải 170 px gạch ngang** ở đáy khung. Nó mờ, nó không có
mép, và nó không phải một vật. Thay bằng **rìa một thiên thể**:

| đại lượng | giá trị |
|---|---|
| tâm khối | (680, **4 552**) |
| bán kính | **3 800** |
| đỉnh rìa | (680, **752**) |
| rìa tại x = 0 và x = 1360 | y = **813** |
| độ võng | **61 px** |
| diện tích khối tối | **5,8 % khung** (đo) |
| tô | `base` `#0A0C14` đặc — KHÔNG một ngôi, KHÔNG một nét tinh vân nào |
| vành sáng rìa | cung 2,2 px `glowCore`, α = 0,62 · max(0, cos θ)^1,4 với θ = góc giữa pháp tuyến rìa và hướng tới mặt trời ⇒ sáng nhất ở x = 680, còn α ≈ 0,40 ở hai mép khung |
| lớp khí | cung thứ hai, 6 px, `glowRim`, α 0,12, ngay TRÊN vành sáng |

**Nó nói gì:** bản đồ sao luôn được vẽ TỪ MỘT CHỖ. Lớp này là chỗ đó — nơi người học đang
đứng. Đặc tả cũ đã ngầm khẳng định điều ấy bằng "quầng chân trời"; bản này chỉ làm cho nó
thành một vật nhìn thấy được.

**Nó làm gì cho bức tranh:** bốn việc, và không việc nào thay được bằng thứ khác.
1. **Một mép cứng, liền, chạy hết bề rộng** — tín hiệu chiều sâu mạnh nhất có thể có với
   một nét duy nhất.
2. **Một cái thước.** 46 000 sao nền dừng lại đột ngột ở mép đó. Mắt suy ra ngay: cái này
   ở gần, kia ở xa.
3. **Một khối tối lớn** đối trọng với mặt trời chói ở giữa — luật repoussoir (§4).
4. **Hướng sáng.** Vành sáng chỉ xuất hiện ở nửa quay về mặt trời, nên nó CHỨNG MINH có một
   nguồn sáng, không chỉ hiển thị một nguồn sáng.

Diện tích chỉ 5,8 % là **cố ý**: khung tham chiếu chỉ có 20,5 % ở L < 0,01, còn bản của mình
đã 89,7 % — thứ đang thiếu là trung gian, không phải bóng tối. **Repoussoir ở đây làm việc
bằng MÉP, không bằng diện tích.**

### 7.2 · Ba hành tinh = ba bài cửa tự kiểm tra

**Nguồn dữ liệu: cờ `step_4.gate`**, đúng chỗ backend (`isSelfTestGateLesson`) và frontend
đang đọc. Hiện đếm được **ba** bài: **R02** (`sort_order` 20, trong M3), **DA01** (47) và
**DA02** (48, cả hai trong M8). Bộ sinh **đếm từ cờ, không viết cứng con số 3** — thêm một
cửa mới là bản đồ tự mọc thêm một hành tinh. (AGENTS.md: *"đừng viết test khoá cứng con số
3"*.)

**Vì sao một hành tinh chứ không phải một ngôi sáng hơn:** bài cửa là chỗ DUY NHẤT hệ thống
đổi hành vi — lời giải mẫu bị giữ lại tới khi bài được ghi nhận hoàn thành. Một bài cửa
không phải một bài sáng hơn; nó là một LOẠI KHÁC. Vẽ nó bằng một ngôi to hơn là nói sai
bằng hình. Vẽ nó bằng một vật rắn, có mặt sáng mặt tối, có vành đai mà mạch phải xuyên qua
— là nói đúng.

| đại lượng | luật | R02 | DA01 / DA02 |
|---|---|---|---|
| đường kính | `0,30 × đk bao của chòm`, kẹp [28, 110] | 0,30 × 275 = **82** | 0,30 × 72 = 21,6 → kẹp **28** |
| vị trí | đúng chỗ ngôi của bài | (546, 592) | trong hộp M8 |
| pha | φ = 170° − 140° · (r tới mặt trời ÷ 800); tỉ lệ chiếu sáng k = ½(1 + cos φ) | r = 176 ⇒ φ = 139°, **k = 0,12** — lưỡi liềm mảnh, viền sáng quay về mặt trời | r = 563 ⇒ φ = 71°, **k = 0,66** — khuyết lồi |
| mặt tối | đĩa `dustLane` `#0D101C`, α 0,92 | | |
| mặt sáng | **một `path` gồm ĐÚNG HAI cung tròn** — cung rìa hành tinh + cung đường phân giới (ellipse bán trục `r · \|cos φ\|`). Tô `hues[chòm]`, α 0,88; không clip, không mask, không gradient | | |
| vành đai | ellipse rỗng, trục lớn **1,9 × đk**, nghiêng 68° ⇒ trục nhỏ = 0,37 × trục lớn; nét 1,4 px `glowRim` α 0,50 | 156 × 58 | 53 × 20 |

**Vành đai mang nghĩa, không trang trí.** Mạch hoàng đạo (§4.2 đặc tả cũ) **đi xuyên qua
vành** của mỗi hành tinh cổng: vào ở nửa xa, ra ở nửa gần. Đó là hình của đúng một luật hệ
thống — *qua được bài này mới đi tiếp* — và nó là chỗ che khuất thuyết phục nhất trong cả
bức (nửa gần của vành phủ LÊN hành tinh, hành tinh phủ LÊN nửa xa của vành; hai lần che
trong một vật).

---

## 8 · Đổ bóng — ba việc, và một trong ba là chỗ đáng tiền nhất

### 8.1 · Chiếu sáng tinh vân (Lambert trên mặt ẩn)

Đây là **bước có giá trị cao nhất của cả tài liệu**: nó lấp phần lớn cái lỗ 53 điểm phần
trăm ở §1 VÀ nó là cái "đổ bóng" chủ sản phẩm đòi.

Hiện `ve_tinh_van` vẽ 5 đường đồng mức với độ mờ phẳng, **không biết mặt trời ở đâu**. Nhân
độ mờ của mỗi mẫu với một hệ số chiếu sáng:

```
Λ(x, y) = λ₀ + (1 − λ₀) · D(x, y) · S(x, y)

D = (R_ref / max(d, R_ref))^1,3        d = khoảng cách tới mặt trời,  R_ref = 210
S = clamp(0,25 , 1,0 , 0,5 + 2,0 · (n̂ · ŝ))
n̂ = ∇F chuẩn hoá (F = trường tinh vân đã có)
ŝ = véc-tơ đơn vị từ điểm tới mặt trời
λ₀ = 0,22
```

* `D` là suy giảm theo khoảng cách — sườn 1,3 chứ không 2,0: tinh vân là môi trường tán xạ,
  không phải một mặt nhận sáng điểm.
* `S` là **tự đổ bóng**: chỗ gradient mật độ quay về mặt trời thì sáng (S → 1), chỗ quay đi
  thì tối (S → 0,25). Đây mới là thứ cho ra "đổ bóng các kiểu" — cùng một đám mây có sườn
  sáng và sườn tối, và hai sườn ấy nhất quán với mọi vật khác trong bức.
* `λ₀ = 0,22` giữ cho góc xa nhất không đen tuyệt đối (tham chiếu: L ≈ 0,10 ở r = 0,6 · W).

Giá: **một lần tính ∇F thêm cho mỗi mẫu** — `F` đã là hàm thuần tuý tất định, nên ∇ lấy
bằng sai phân trung tâm 2 px. Không đổi dung lượng, không đổi hình học đường đồng mức.

**Chỗ luật cấm gradient ĐÚNG LÀ CẮN — nói thẳng.** Một dốc Lambert là liên tục; tô nó bằng
**5 bậc** đồng mức cho ra **5 vệt dải nhìn thấy được** (bước sRGB mỗi bậc ≈ 0,15 × 0,895 =
34 mã màu — gấp 17 lần ngưỡng). Ba cách, chọn một:

| cách | bước sRGB/bậc | dung lượng thêm | đánh giá |
|---|---|---|---|
| nâng `SKY_NEBULA.levels` 5 → **14** | 12 mã | **+38 KB** (đo gián tiếp: lớp tinh vân hiện ~31 KB, chi phí gần tuyến tính theo số mức) | vẫn thấy dải ở vùng rộng |
| 14 bậc **+ lấm tấm nhiễu-xanh ở BIÊN** mỗi bậc (dải 10 px, mật độ 28 chấm/1000 px², tông của bậc cao hơn) | hiệu dụng ~3 mã | +38 KB + **~14 KB** | **đề xuất** |
| 24 bậc, không lấm tấm | 7 mã | +88 KB | đắt, vẫn kém cách 2 |

Khuyến nghị cách 2. Nếu sau khi dựng vẫn thấy dải, **đó là chỗ duy nhất tôi sẽ đem luật cấm
gradient ra bàn lại** — và bàn chỉ cho một lớp, với một ca test khoá chặt rằng ngoài lớp ấy
ra không chữ `gradient` nào được tồn tại.

### 8.2 · Tinh vân chạy VÒNG QUANH mặt trời

Trục dải Ngân Hà (`SKY_MILKYWAY`) phải đi **chéo QUA SAU** mặt trời, từ dưới-trái lên
trên-phải, với nửa bề rộng co lại còn **0,55 lần** trong khoảng r < 300 — cái "vành trống"
đo được ở §3.4. Mép dải quay về mặt trời là mép SÁNG (Λ ≈ 1,0), mép xa là mép tối
(Λ ≈ 0,25). Mặt trời khi ấy đứng TRƯỚC một khối sáng, không đứng trên nền đen — và đó là
chỗ ngân sách sáng lấy được 2,3 điểm phần trăm còn thiếu của §3.3.

### 8.3 · Tia sáng xuyên bụi

Chín nêm từ các nút bụi dày nhất trong r < 520 của mặt trời, toả ra theo hướng xuyên tâm:

| đại lượng | giá trị |
|---|---|
| số nêm | **9** (phán đoán: dưới 6 thì đọc ra là lỗi vẽ, trên 12 thì thành hình ngôi sao đồ hoạ) |
| góc mở | 4°–9°, lấy từ bề rộng nút bụi |
| chiều dài | 180–420 px |
| tô | `dustLane`, α 0,10–0,22, **NHÂN vào** chứ không cộng |
| mép | giật ±2,5 px theo nhiễu tần số cao |
| chặn | mọi nêm bị **cắt** ở đường chân trời §7.1 |

Hai nêm chạy thẳng xuống cột ánh sáng giữa khung (§5.4) — cột ấy để trống chính là để
chúng đọc được.

**Nó nói gì:** nêm tối là bằng chứng có thứ CHẮN giữa mặt trời và người xem, tức giữa hai
vật có KHÔNG GIAN. Đây là tín hiệu "có một mặt trời ở kia" mạnh thứ hai sau vệt loé, và nó
rẻ: 9 đa giác.

### 8.4 · Vành sáng rìa — luật chung

**Mọi vật thể rắn** (khối chân trời, ba hành tinh, vành đai) nhận một cung `glowCore` dày
1,2 px, α 0,55, **chỉ trên nửa quay về mặt trời**, α giảm theo `max(0, cos θ)^1,4`. Một luật,
ba chỗ dùng, không ngoại lệ. Đó là thứ làm cả bức có MỘT hướng sáng — mục thứ tư trong công
thức §4.

---

## 9 · Che khuất — cái gì che cái gì, và nó nói quan hệ gì

| # | vật che | vật bị che | nói gì |
|---|---|---|---|
| 1 | khối chân trời | sao nền, đường đồng mức tinh vân, chín nêm tia sáng, đuôi dưới của mạch | **bạn đang đứng trên một cái gì đó.** Khoảng 2 000+ nét bị cắt — lớn nhất, rẻ nhất, hiệu quả nhất |
| 2 | hành tinh cổng R02 | hai nét của chính M3 (`G05–R02` và `R02–G06` đi khuất sau đĩa rồi hiện lại) + 3–6 sao nền | **cửa nằm GIỮA bài trước nó và bài sau nó** |
| 3 | nửa gần vành đai | hành tinh | hai vật rắn, không phải hai ký hiệu |
| 3b | hành tinh | nửa xa vành đai | |
| 4 | quầng mặt trời | mạch hoàng đạo, ở chỗ mạch băng qua r < 250 | mạch nằm TRONG không gian, mặt trời đứng trước một đoạn của nó |
| 5 | tám bao lồi chòm | tinh vân (đã có qua `hullFade`) + nay thêm sao nền | hình chòm nổi lên khỏi nền |

**Và một điều KHÔNG làm, cố ý: không chòm nào che chòm nào.** Che khuất giữa hai lớp khác
LOẠI là tín hiệu chiều sâu; che khuất trong cùng một lớp là mất thông tin. Hai hình chòm
chồng lên nhau thì người xem không còn đọc được hình nào cả — mà hình là thứ duy nhất mang
nghĩa chặng. Sàn khe 50 px giữa hai chòm (`SKY_LINK.minGap`) **giữ nguyên**.

---

## 10 · Ràng buộc kỹ thuật — trả lời từng cái

### 10.1 · Cấm gradient: có vẽ được mặt trời chói loá không?

**Được. Và luật cấm không phải là thứ đang hỏng.** Bằng chứng là chính phép đo §3.2: mặt
trời tham chiếu là một **lõi phẳng bão hoà + một đuôi ~1/r^2,9** — hai thứ mà đĩa đồng tâm
tái hiện chính xác được, vì một hồ sơ chỉ phụ thuộc bán kính thì vốn đã là một dãy vòng.

Ba con số khép lại câu hỏi:

* **Bước lượng tử:** 128 vòng chia đều theo độ mờ tích luỹ ⇒ **1,78 / 255 mã màu mỗi vòng**,
  dưới ngưỡng thấy dải (≈ 2 mã). 16 vòng hiện tại cho **14,3 mã** — thấy rõ, và đó là một
  phần của cái "mảng phẳng".
* **Dung lượng:** **+59 KB**. `sky-troi.svg` 68 KB → ~127 KB (trần tệp 420 KB), cả bộ
  198 KB → ~272 KB (trần 900 KB). Còn chỗ.
* **Chỗ thật sự cắn:** không phải mặt trời, mà **dốc Lambert trên tinh vân** (§8.1). Ở đó
  5 bậc là 34 mã màu mỗi bậc. Đã có phương án (14 bậc + lấm tấm biên, +52 KB); nếu nó vẫn
  không đủ, đó là chỗ duy nhất đáng đem luật ra bàn lại.

### 10.2 · Nhãn dưới ánh mặt trời

Hiện nhãn xấu nhất đạt **4,99 : 1** trên sàn 4,5 (M4 dòng chặng-mờ) — còn **0,49** biên.
Đặt một mặt trời chói giữa khung sẽ ăn hết biên đó. Bốn luật, theo thứ tự ưu tiên:

1. **Khoanh vùng.** Không hộp nhãn nào được cắt đĩa r < 250 (17,6 % khung). Bố cục §5.4 đặt
   mọi neo nhãn ở ≥ 289 px nên không nhãn nào CẦN vùng đó; đây là hàng rào, không phải một
   thoả hiệp.
2. **Tấm nền, cho mọi nhãn.** Dưới mỗi hộp nhãn, một hình chữ nhật `base` α **0,72** ở bất
   cứ chỗ nào nền đo được L > 0,06. Nó ghim nền hiệu dụng xuống L ≤ 0,02, nên **tương phản
   nhãn độc lập với mặt trời** — thay cho việc nới `dimOpacity` rồi lại phải đo lại sau mỗi
   lần dịch mặt trời. Giá: 8 hình chữ nhật.
3. **Nhãn mặt trời** — một dòng, `Advanced Python · 48 bài`, đặt ở **(680, 600)**, trong
   cột ánh sáng trống của §5.4. Nền ở đó r = 287 ⇒ L ≈ 0,03 ⇒ chữ `text` `#E8EEF7` cho
   **≈ 11 : 1**. Chín nêm tia sáng phải né hộp này (bộ máy va chạm nhãn đã có).
4. **`kiem_tuong_phan_nhan` giữ nguyên là một cái gác chặn build.** Thêm vào nó: đo luôn
   tương phản của **nét chòm** với nền tại mỗi đoạn (sàn 3 : 1, WCAG 1.4.11), vì luật §9.4
   dưới đây mới là thứ giữ nó.

### 10.3 · Luật đường chói — vật trong vùng mềm thành BÓNG ĐEN

Trong vùng mềm (170 ≤ r < 250) nền sáng tới L ≈ 0,06–0,30. Vẽ một nét sắc khoáng mờ 55 % ở
đó thì nó trượt sàn 3 : 1, lặng lẽ.

**Luật:** mọi vệt mà nền tại tâm nó đo được **L > 0,12** thì đổi từ tông SÁNG sang tông TỐI
(`dustLane`), chuyển tiếp **dithered qua một dải 24 px** bằng cách rắc cả hai tông.

Nó đúng về vật lý (một vật trước nền sáng đọc ra là bóng đen), nó đạt tương phản
(0,206 + 0,05) ÷ (0,0038 + 0,05) = **4,8 : 1**, và nó cho ra hiệu ứng đẹp nhất của cả bản:
phần của M3 gần mặt trời nhất **sậm lại thành bóng**, còn phần xa thì sáng. Một chòm có hai
tông vì nó nằm trong một không gian có ánh sáng.

Hàm đo đã có: `do_sang(x, y, P)`.

### 10.4 · Bão hoà

Đo: bản của mình **0,387** (có trọng số độ chói: 0,241), tham chiếu **0,197**. Tám sắc
khoáng đã hạ một lần ngày 19/10. Với mặt trời mới, lõi `#FFFFFF` (S = 0) chiếm 1,1 % diện
tích và quầng ngà chiếm thêm ~4 % — riêng điều đó đã kéo trung bình xuống. **Đo lại sau
bước 2 của §12 trước khi đụng tiếp vào sắc khoáng**; hạ thêm lúc này là hạ nhầm chỗ.

### 10.5 · Dung lượng, tổng

| mục | thêm |
|---|---|
| 128 vòng nguồn sáng | **+59 KB** |
| tinh vân 5 → 14 bậc | +38 KB |
| lấm tấm biên bậc tinh vân | +14 KB |
| khối chân trời + vành sáng + lớp khí | +3 KB |
| 3 hành tinh + 3 vành đai + mặt sáng (2 cung mỗi cái) | +2 KB |
| 9 nêm tia sáng | +1 KB |
| 8 tấm nền nhãn | +0,5 KB |
| **bỏ** dải chân trời gạch ngang cũ | **−6 KB** |
| **cộng dồn** | **≈ +111 KB** |

198 KB → **≈ 309 KB** cả bộ (trần 900). `sky-troi.svg` 68 → **≈ 179 KB** (trần 420). Đạt,
còn biên rộng.

### 10.6 · Bản SÁNG (§18 đặc tả cũ) — mọi thứ trên giấy thành gì

Luật gốc §18.1: *trên giấy, mọi thứ nhìn thấy đều là mực*; và *quầng sáng làm bằng cách BỎ
NÉT*. Bản này không phá luật nào, chỉ thêm chỗ áp dụng:

| vật ở bản tối | ở bản sáng |
|---|---|
| **lõi mặt trời** r < 62 | **giấy TRẦN tuyệt đối** — không một chấm |
| **quầng** 62 → 210 | mật độ chấm của MỌI lớp nhân `w(r) = clamp(0, 1, ((r − 62)/148)^1,1)` — từ 0 lên đầy |
| **cảm giác CHÓI** | **vượt mật độ** ở vành 210 → 300: nhân **× 1,35**, rồi giảm về 1,0 ở r = 340. Thủ pháp khắc đồng cổ điển: muốn giấy trắng đọc ra ánh sáng thì phải làm đậm vùng quanh nó. Cùng một luật §18.2 đã dùng cho vignette (× 1,22 ở mép giấy) |
| **vệt loé ngang/dọc** | một vệt **bỏ chấm**, bề rộng 3 px — nét cạo sáng |
| **mặt sáng hành tinh** | giấy trần; **mặt tối** = bậc mật độ 5 (77 chấm/1000 px²); **đường phân giới** là biên hai vùng. Tự nhất quán: cả hai bản đọc cùng một vô hướng `k` |
| **khối chân trời** | vùng đậm nhất tờ giấy — nhưng **GẠCH CHÉO −41°, giãn 1,6 px**, KHÔNG lấm tấm. Lý do là dung lượng, đo được: 5,8 % × 1 115 200 px² ở 104 chấm/1000 px² = **6 730 chấm ≈ 108 KB**; cùng sắc độ bằng gạch chéo là **~581 nét ≈ 12 KB**. `build_map.py` đã có gạch −41° |
| **vành sáng rìa** | một **nét bỏ mực** 2,2 px ngay dưới mép khối |
| **tia sáng xuyên bụi** | nêm **ĐẬM hơn** nền (mực là bụi) — cùng dấu, vì ở cả hai bản nêm là chỗ BỊ CHẮN |
| **tinh vân được chiếu sáng** | `Λ` cộng vào `F` trước khi tra bảng bậc §18.2, nên sườn quay về mặt trời rơi xuống bậc THẤP hơn (ít mực hơn) |

Luật §19.2 (*sai số bằng 0 giữa hai hồ sơ ở phần HÌNH HỌC*) giữ nguyên: toạ độ mặt trời,
bán kính, bảng A(r), tâm/bán kính khối chân trời, pha ba hành tinh — tất cả là tham số
TRƯỜNG, không hồ sơ hoá. Chỉ **cách tô** là hai.

---

## 11 · Ba rủi ro

**1. Mặt trời giữa khung ăn mất chỗ, và M3 là nạn nhân.** Đo rồi: ngôi `G05` của M3 chỉ
cách tâm mặt trời **176 px** trên sàn 170. Khung 1360 × 820 với một quầng bán kính 210 ở
giữa thật sự chật — không thứ gì khác ngoài M8 nhét vừa dải y < 103 phía trên mặt trời.
**Ai dịch M3, dịch mặt trời, hay nới `outer` đều phải chạy lại cả bốn phép kiểm §5.4.** Nếu
`outer` phải lên trên 210 thì M3 buộc phải nhỏ lại hoặc lùi sang trái — không có cách thứ
ba.

**2. Tỉ lệ 5,56 : 1 làm M8 chỉ còn 72 px.** Hai bài DA ở đó thành hai đĩa 28 px cách nhau
44 px. Đọc được ở bản đồ nền, nhưng vùng bấm nhỏ. **Nó chỉ an toàn vì cú phóng (`c1c1e0e`)
đã có.** Nếu cú phóng bị gỡ, tỉ lệ này phải lùi về ~4 : 1.

**3. "Vẫn là một cái nền vũ trụ nữa".** Rủi ro 3 của đặc tả cũ chưa mất. Phép thử: che hết
nhãn, đưa bức cho một người chưa thấy bao giờ, hỏi **"cái sáng ở giữa là gì, và bạn đang
đứng ở đâu?"**. Nếu không trả lời được câu thứ hai thì khối chân trời §7.1 đã hỏng, và đó
là thứ phải sửa trước — không phải mặt trời.

---

## 12 · Thứ tự làm

Mỗi bước có một con số đo được bằng `py -I scripts/star/build_sky.py --do` hoặc bằng ca
test. **Bước 1 là bước đổi cảm giác nhiều nhất** — và nó không đụng tới mặt trời.

### Bước 1 — TRUNG GIAN: chiếu sáng tinh vân

Làm: `Λ(x, y)` ở §8.1 + nâng `levels` 5 → 14 + lấm tấm biên + đổi trục dải §8.2.
**Đo:** ba bậc giữa (L 0,03–0,35) đi từ **0,74 %** lên **≥ 30 %**; trung vị độ chói từ
**0,0065** lên **0,020–0,040**; `brightShare` lên ≥ 4 % (chỉ nhờ tinh vân, mặt trời chưa
đụng).
**Vì sao trước tiên:** đây là 53 điểm phần trăm của bảng §1, và nó là cái duy nhất trong
danh sách biến một sơ đồ thành một bức tranh. Làm bước này rồi mà vẫn thấy "sơ đồ" thì mọi
bước sau đều sai hướng — nên nó cũng là bước RẺ NHẤT để biết mình sai.

### Bước 2 — ĐIỂM TỤ: dời và dựng lại mặt trời

Làm: tâm (680, 313), core 62 / outer 210, bảng A(r) §5.1, 128 vòng, lõi `#FFFFFF`, bỏ
`glow` khỏi nguồn sáng, thêm `glowRim`, hai vệt loé, 9 nêm tia sáng.
**Đo:** `p99 ≥ 0,93` (hiện 0,7996); `brightShare` vào **5,5–9,0 %** (hiện 2,759 %); lõi
chói (L > 0,85) từ **0,00 %** lên **0,7–2,0 %**; và một ca mới: lấy 32 tia từ tâm, bước
sRGB giữa hai mẫu bán kính liền nhau **≤ 3/255** — ca này trượt ngay nếu ai hạ số vòng.

### Bước 3 — TỈ LỆ VÀ BỐ CỤC: dời tám chòm

Làm: tám hộp §5.4.
**Đo:** tỉ lệ đk bao **≥ 5,0 : 1** (hiện 3,53); **0 ngôi** trong r < 170; khe ngôi–ngôi hai
chòm **≥ 50 px**; tám hộp trong khung; đĩa r < 250 có **0 ngôi**.

### Bước 4 — HÌNH: ba chòm vẽ lại, năm chòm xoay

Làm: §6.
**Đo:** **0 / 50 nét** nằm trong **10°** của một trục (hiện 27/50 ở sàn 8°). Gỡ bản sửa
ra ⇒ 27 ca đỏ.

### Bước 5 — VẬT RẮN: chân trời, hành tinh, vành đai, che khuất

Làm: §7, §8.4, §9.
**Đo:** số nét bị đường chân trời cắt **≥ 2 000**; **0 ngôi** nằm dưới chân trời; số hành
tinh **= số bài có `step_4.gate`** (đọc từ `out-advanced/lessons/*.json`, không viết cứng);
mỗi hành tinh có **đúng 2 cung** cho mặt sáng và **0** phần tử gradient.

### Bước 6 — CHỮ, BẢN SÁNG, chốt ngân sách

Làm: §10.2 tấm nền nhãn, §10.3 luật đường chói, §10.6 hồ sơ sáng.
**Đo:** mọi dòng nhãn **≥ 4,5 : 1** (hiện xấu nhất 4,99 — sau bước này phải **≥ 7 : 1** nhờ
tấm nền); mọi nét chòm **≥ 3 : 1** với nền tại chỗ nó; `--profile light` dựng được; cả bộ
**≤ 900 KB**, mỗi tệp **≤ 420 KB**; chạy hai lần ra đúng một tệp.

### Và cập nhật bảng mốc trong AGENTS.md trong CÙNG commit

Số tệp SVG, tổng dung lượng, số ca `star-map.test.mjs` — ba con số này đều đổi. AGENTS.md
đã trả giá một lần cho đúng chỗ này.

---

## 13 · Nguồn

**Phép đo tôi tự chạy trong phiên này** (PIL + numpy, scripts trong thư mục scratchpad nêu
ở đầu tài liệu):

* `do1.py` – `do5.py`: histogram độ chói, bão hoà, định vị blob sáng, hồ sơ bán kính, tương
  phản cục bộ, bậc sắc độ của `design/tham-chieu/ban-do-sao-game.png`.
* `fit.py`: đổi hồ sơ độ chói đo được sang **độ mờ tích luỹ** và khớp luỹ thừa — nguồn của
  bảng §3.2.
* `do_chom.py`: đo đường kính bao, góc nét so với trục, Clark–Evans trên
  `frontend/src/lib/star-map.ts`.
* `probe.py`, `hist.py`: đo bản HIỆN TẠI bằng chính `build_sky.do_sang_rgb` — nguồn của cột
  phải bảng §1 và của hồ sơ tia ở §1.1.
* `layout5.py`: kiểm bố cục §5.4 (khung, khe mặt trời, khe ngôi–ngôi, chân trời, góc nét).
* `py -I scripts/star/build_sky.py --do`.

**Nguồn ngoài:**

* [Chesley Bonestell — Wikipedia](https://en.wikipedia.org/wiki/Chesley_Bonestell) — nền
  matte painting Hollywood.
* [*Where telescopes cannot (yet) see* — arXiv 1703.08138](https://arxiv.org/pdf/1703.08138)
  — kỹ thuật dựng mô hình rồi chụp ảnh, vẽ sao lên tấm kính.
* [*A Seaport at Sunrise*, Alte Pinakothek](https://www.sammlung.pinakothek.de/en/artwork/Y0GR58rLRX)
  và [mục lục Smith 1837](https://digi.ub.uni-heidelberg.de/diglit/smith1837bd8/0518) —
  kiến trúc đóng khung hai bên; **không** xác nhận mặt trời ở chính giữa, **không** dùng
  chữ *repoussoir*.

**Nguồn trong kho mã:** `design/v3/ban-do-sao.md` (§2 nghĩa chặng, §6 bậc độ sáng, §8 nhãn,
§18 bản sáng, §19 hai hồ sơ), `design/v3/chieu-sau-tuong-tac.md`,
`design/v3/tuong-tac-ban-do.md`, `design/v3/ky-thuat-ban-do.md` §4 (quầng sáng làm bằng bỏ
nét; gạch −41°), `scripts/star/build_sky.py`, `frontend/src/lib/star-map.ts`.

**Nói thẳng những chỗ là PHÁN ĐOÁN, không phải phép đo:** số nêm tia sáng (9); tỉ lệ hành
tinh 0,30 × đk chòm; công thức pha φ; hệ số `λ₀ = 0,22` và sườn 1,3 của `D`; ngưỡng thấy
dải 2 mã màu sRGB; nhận định về việc ảnh Hubble/JWST được kéo giãn asinh; nhận định về ba
trò chơi vũ trụ ở §4. Mỗi cái trong số đó đều có một phép đo tương ứng ở §12 để xác nhận
hoặc bác sau khi dựng.
