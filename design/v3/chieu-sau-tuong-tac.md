# Chiều sâu tương tác — bản đánh giá khả thi

Ghi ngày 19/10/2026. **Đây là một BẢN ĐÁNH GIÁ, không phải đặc tả.** Không một dòng code
nào được viết theo tài liệu này. Nguồn hình thái vẫn là
[`design/v3/ban-do-sao.md`](ban-do-sao.md); tài liệu này không sửa một con số nào của nó.

Câu hỏi của chủ sản phẩm, nguyên văn:

> *"có thể làm thêm hoạt ảnh / nâng cấp lên 3D hay gì đó để khiến người dùng thực sự cảm
> tưởng như mình đang nhìn ra vũ trụ không, giống cảm nhận của tôi khi chơi Opus: Echo of
> Starsong"*

Mọi con số dưới đây mang một nhãn: **[đo]** là phép đo mình tự chạy hôm nay, có nêu cách
chạy lại; **[nguồn]** là số lấy từ tài liệu bên ngoài, có đường dẫn ở §8; **[phán đoán]**
là ước lượng chưa đo được — và nó được gọi thẳng là phán đoán.

---

## 0 · Trả lời ngắn, bằng ba con số

1. **Khoảng cách giữa bản đồ của mình và khung hình Starsong là DẢI ĐỘ CHÓI, không phải
   SỐ CHIỀU.** Trên khung tham chiếu `design/tham-chieu/ban-do-sao-game.png`, **7,73% số
   điểm ảnh** có độ chói tương đối L > 0,50 và **2,20%** có L > 0,80 **[đo]**. Trên bản
   mẫu M1 đang chạy, phần "sáng" là **0,10%** diện tích ô cắt **[đo]** — và đặc tả §3.1
   **cấm** mọi điểm ảnh vượt L = 0,0748. Tỉ số là **77 lần**. Một bức tranh phẳng có 7,73%
   điểm ảnh gần trắng đọc ra "nhìn ra vũ trụ"; một bức có 0,10% thì không, dù có xoay nó
   theo chuột hay không.

2. **Và nó KHÔNG sáng hơn bản của mình nói chung.** Trung vị độ chói của khung Starsong
   là **L = 0,0284** **[đo]** — tức **thấp hơn** chính cái trần 0,0748 mà đặc tả đặt ra.
   Nửa dưới của bức tranh ấy tối hơn bản đồ của mình được phép tối. Khác biệt nằm ở
   **đuôi trên**: p90 = 0,384, p99 = 0,955. Đó là một định nghĩa đo được của chữ "chiều
   sâu" mà ba bản trước đi tìm bằng tính từ.

3. **Đường đắt nhất lại mua được ít nhất.** Một cảnh three.js tối thiểu (điểm sao, máy
   ảnh phối cảnh, bộ dựng) tree-shake xong là **122 kB brotli** **[đo]** — gấp **8,7 lần**
   toàn bộ bản đồ sao hiện tại (hai tấm SVG = **14,0 kB brotli** **[đo]**) — và nó giết
   **17 trong 23 ca test** đang canh bức tranh. Đổi lại, nó không mua được điều 1, vì
   điều 1 là một quyết định VẼ.

**Đề nghị:** đi đường **A rút gọn** — tách lớp theo độ sâu (bước này TỰ TRẢ TIỀN bằng
byte, trước khi có một pixel nào chuyển động), rồi **vẽ một nguồn sáng** và **mở tỉ lệ**,
rồi mới cân nhắc một chút parallax theo con trỏ biên độ ≤ 8 px. Chi tiết ở §5.
**Không đi đường C.**

---

## 1 · Ranh giới phải nói trước: "tự chạy" khác "do người dùng điều khiển"

Hôm nay commit `5b3d282` vừa gỡ sạch một lớp chuyển động 5 hiệu ứng tự chạy (−964 dòng),
theo đúng lời chốt của chủ sản phẩm: *"chỉ cần motion graphic khi hover"*. Và lời chốt ấy
đã đi vào code: `frontend/src/app/ban-do-sao/star-map.module.css` dòng 19–23 ghi thành
luật số 3 của file — *"Không sao nhấp nháy, không tinh vân trôi, **không parallax theo
chuột**, không hoạt ảnh lúc vào trang."*

Nên tài liệu này phải nói thẳng: **§3 dưới đây đề cập đúng cái thứ dòng CSS kia đang
cấm.** Hoà giải được, nhưng chỉ bằng cách phân biệt cho sắc:

| | hiệu ứng vừa bị gỡ | parallax theo con trỏ |
|---|---|---|
| Ai quyết khi nào nó động | **đồng hồ** | **người dùng** |
| Dừng lại khi người dùng không làm gì | không | **có — đứng yên tuyệt đối** |
| WCAG 2.2.2 (Dừng/Ngừng/Ẩn) | **áp dụng** — phải có nút tắt | **không áp dụng** — không có gì tự chạy |
| WCAG 2.3.3 (Hoạt ảnh do tương tác) | không áp dụng | **ÁP DỤNG**, và parallax được nêu đích danh |
| Tiêu tốn pin lúc người dùng ngồi đọc | có | không |

Đó là hai thứ khác nhau về bản chất, không phải hai mức độ của một thứ. Nhưng **đừng
dùng sự phân biệt ấy như một giấy phép**: WCAG 2.3.3 nói về **đúng** trường hợp này và
nêu parallax đích danh — *"Parallax scrolling occurs when backgrounds move at a different
rate to foregrounds"*, và nó là loại hoạt ảnh "thường không thiết yếu" **[nguồn]**. Tiêu
chí là mức AAA, tức không bắt buộc cho AA, nhưng lý do nó tồn tại thì không phụ thuộc vào
mức: WebKit đo được rối loạn tiền đình ảnh hưởng tới **69 triệu người riêng ở Mỹ**, và
chính Apple thêm công tắc Reduce Motion vào iOS 7 **để tắt parallax** **[nguồn]**.

**Luật rút ra, và nó chi phối cả §5:** mọi chuyển động trong bản đồ này phải (a) do người
dùng điều khiển, (b) tắt được dưới `prefers-reduced-motion: reduce`, và (c) **khi tắt thì
trạng thái vẫn đọc được trọn vẹn** — tức bức tranh ở trạng thái nghỉ phải tự nó đã đủ.
Điều (c) là điều kiện nghiệt ngã nhất, và nó cũng chính là lý do §5 đặt "vẽ đẹp hơn"
TRƯỚC "làm nó động": thứ gì phải tắt được thì không được mang tin.

---

## 2 · Cảm giác Starsong đến từ đâu — đo trên chính khung hình tham chiếu

### 2.1 · Tra được gì, và nói thẳng cái KHÔNG tra được

Đã tra lại hôm nay bằng bốn lượt tìm (tiếng Anh, tiếng Trung phồn thể, tên tiếng Nhật,
tên hãng). **Kết quả xác nhận đúng điều `ban-do-sao.md` §17 đã ghi: không tồn tại công
khai một bài phân tích mỹ thuật, một phỏng vấn hoạ sĩ, hay một bảng màu nào của *Opus:
Echo of Starsong*.** Artbook chính thức là DLC trả tiền, ra bản tiếng Trung phồn thể
trước. Mọi thứ tìm được chỉ là trang bán artbook và điểm đánh giá.

Hai thứ có nguồn thật, và chỉ hai:

- **Kotaku** tả tranh của họ dựng bằng *"những mảng màu đặc, mạnh"* — tức cấu trúc **sắc
  độ phẳng**, không phải chuyển sắc tỉa tót **[nguồn]**.
- **SIGONO tự kể quy trình** trên Medium: đọc kịch bản trước (dáng cảnh, bố cục, cảm xúc
  nhân vật đều đã ghi trong chú thích kịch bản), phác thảo — ví dụ dùng **góc nhìn ngước
  lên** để tả cảm giác nhìn rõ kẻ vừa tới sau cơn bão — rồi **đưa bản phác vào thẳng game
  engine** để thử cùng thoại, chân dung, nhịp và nhạc, **trước khi** hoàn thiện **[nguồn]**.

Chú ý cái không có trong hai nguồn đó: **không một chữ nào về 3D, về parallax, về lớp
chuyển động.** Điều họ kể là quy trình của một **bức tranh**.

Và một điều chỉnh về cách viện dẫn game này, chép lại từ §17 vì nó vẫn đúng: điểm mỹ
thuật của nó ở các bài đánh giá chỉ ở mức trung bình; hai giải nó thắng ở Asian Game
Awards 2021 là **Thiết kế** và **Âm thanh**, không phải Mỹ thuật. Nên đừng viện nó làm
chuẩn mực mỹ thuật — hãy viện nó làm chuẩn mực **không khí trên mỗi byte**.

### 2.2 · Phép đo trên khung hình, vì lời kể thì không có

Không có phỏng vấn thì đo chính khung hình. `design/tham-chieu/ban-do-sao-game.png` là
**màn hình bản đồ sao của game** — tức đúng cùng một loại màn hình với thứ mình đang
dựng, không phải một cảnh cắt. Đo bằng công thức độ chói tương đối của WCAG (tuyến tính
hoá sRGB, `0,2126 R + 0,7152 G + 0,0722 B`), trên toàn bộ 1 624 × 907 = 1,47 triệu điểm
ảnh **[đo]**:

| đại lượng | khung Starsong | ghi chú |
|---|---|---|
| trung vị L | **0,0284** | **thấp hơn trần 0,0748 của đặc tả mình** |
| p90 | 0,384 | |
| p99 | 0,955 | |
| % điểm ảnh L > 0,0748 (trần tuyệt đối của mình) | **28,6%** | |
| % điểm ảnh L > 0,50 | **7,73%** | |
| % điểm ảnh L > 0,80 | **2,20%** | |
| % điểm ảnh L < 0,01 (gần đen) | 28,6% | |
| bão hoà HSV trung bình | **0,196** (p90 = 0,375) | **gần như một bức đơn sắc** |

Và cái **tỉ lệ**, đo trên chính nguồn sáng bên phải (đã loại trừ vùng HUD):

| ngưỡng | diện tích | đường kính tương đương | so với bề rộng khung (1 624 px) |
|---|---|---|---|
| L > 0,80 (lõi cháy) | 21 281 px² | **165 px** | 10,1% |
| L > 0,50 | 80 402 px² | **320 px** | **19,7%** |
| L > 0,20 (quầng) | 122 465 px² | 395 px | 24,3% |

Cộng với ba thứ đọc được bằng mắt trên cùng khung ấy, và cả ba đều **đã nằm sẵn trong
đặc tả của mình**: vệt loé ngang qua nguồn sáng (§3.3 đã chép), những vòng quỹ đạo lớn vẽ
theo phối cảnh (§3.3 lưới cong), nhãn gắn bằng **đường dẫn mảnh** chứ không phải hộp đặc
(§8). Con tàu của người chơi là một vòng tròn **~36 px** cạnh một nguồn sáng 320 px và
một tinh vân trải hết 1 624 px — **tỉ lệ vật-trên-cảnh khoảng 1 : 45**.

### 2.3 · Đối chiếu với bản đồ của mình

Đo trên hai tệp đang chạy (`frontend/public/map/star/m1-rest.svg`, `m1-focus.svg`) bằng
cách cộng diện tích hình tròn của lớp `loi-sao` và `sao-bai` lấy thẳng từ SVG **[đo]**:

| | Starsong | bản mẫu M1 |
|---|---|---|
| % diện tích "sáng" (L > 0,5) | **7,73%** | **0,10%** (0,0140% lõi trắng + 0,0869% thân sao) |
| trung vị độ chói | 0,0284 | **bị cấm vượt 0,0748 ở MỌI điểm** (§3.1) |
| vật sáng lớn nhất | Ø 320 px = **19,7%** bề rộng | Ø 8,6 px = **1,3%** bề rộng ô cắt (0,63% nếu quy về khung đầy đủ 1 360 px) |
| tỉ lệ vật lớn nhất : vật nhỏ nhất | ~45 : 1 | **3,6 : 1** (sao bậc 1 r 4,3 px so với sao nền r 1,2 px) |
| bão hoà | trung bình 0,196 · p90 0,375 | sắc m1 `#F0B35A` = **0,625** |

Bốn dòng, bốn khoảng cách, và **không dòng nào nói về số chiều**.

Dòng cuối đáng dừng lại một nhịp, vì nó đi ngược trực giác: **tám sắc khoáng của mình bão
hoà HƠN 90% khung hình Starsong.** Chính chú thích trong `star-map.ts` đã lo đúng điều
này (`coreScale`: *"giữ cho tám sắc khoáng không biến 48 ngôi thành 48 chấm kẹo"*). Khung
Starsong giải bài toán ấy bằng cách khác: **dải độ chói rộng, bão hoà thấp.** Mình đang
làm ngược lại — dải hẹp, bão hoà cao — và đó đúng là công thức cho "chấm kẹo trên nền
xanh".

### 2.4 · Vì sao trần độ chói của mình tồn tại, và đó mới là chỗ phải sửa

Trần L ≤ 0,0748 không phải một lựa chọn thẩm mỹ. Nó là hệ quả của **§5.2**: trên nền đó,
chữ `#E8EEF7` còn 7,21:1, và dòng phụ `#AFBDD2` chỉ còn **4,42:1 — đã dưới 4,5:1**. Tức
là cả bức tranh đang bị kéo tối xuống **để giữ cho chữ đọc được ở bất cứ chỗ nào chữ rơi
vào**.

Nhưng §8 đã có một bộ máy đặt nhãn **tự đo độ chói từ chính raster nó vừa sinh** và
**trượt build** nếu không tìm được chỗ đủ tối cho hộp chữ (`textCeiling` trong
`SKY_PROFILE_DARK`). Nghĩa là ràng buộc "chữ đọc được" **đã được giải cục bộ rồi** — nó
không còn cần một cái trần toàn cục nữa.

**Đây là phát hiện quan trọng nhất của bản đánh giá này:** cái đang chặn mình tiến gần
Starsong không phải thiếu một chiều thứ ba, mà là **một cái trần toàn cục đang làm việc
mà một bộ máy cục bộ đã làm xong**. Gỡ nó đúng cách — cho phép một vùng sáng mạnh **ở nơi
không có chữ và không có bao lồi chòm** — là thay đổi rẻ nhất và lớn nhất trong cả tài
liệu này. Nó không thêm một byte runtime nào, không thêm một request nào, và không chạm
vào WCAG 2.2.2 hay 2.3.3.

### 2.5 · Phản chứng phải nêu: thứ gì 3D thật có mà tranh phẳng không có

Nếu chỉ kể một phía thì bản này thành bài biện hộ. Có đúng **một** tín hiệu chiều sâu mà
tranh phẳng không tạo ra được: **thị sai do chuyển động** (motion parallax) — sự dịch
chuyển TƯƠNG ĐỐI giữa hai vật ở hai độ sâu khi điểm nhìn đổi. Đó là tín hiệu thật, và nó
là thứ duy nhất đường A/B mua được mà đường "vẽ đẹp hơn" không mua được.

Nhưng hai điều kiện làm nó yếu đi đúng trong trường hợp này **[phán đoán có cơ sở, dựa
trên phân loại khoảng cách của Cutting & Vishton 1995 — xem §8]**:

- Trọng số của thị sai chuyển động **tụt mạnh ở không gian xa** (quá ~30 m). Một bản đồ
  sao, theo định nghĩa, là một cảnh ở vô cực: đó là nội dung **tệ nhất có thể** cho thị
  sai. Che khuất (occlusion) thì giữ nguyên hiệu lực ở mọi khoảng cách — và che khuất
  chính là tín hiệu mà §3.2 đã xếp **mạnh nhất** và đã dựng sẵn (khe bụi xoá sao nền).
- Khung hình Starsong mà chủ sản phẩm nhớ là một **màn hình bản đồ ĐỨNG YÊN**. Cảm giác
  ấy đã xảy ra **không có** thị sai nào.

Nên câu trả lời trung thực cho "3D có giúp không" là: **có, một chút, và chính cái chút
đó là thứ yếu nhất trong bảy tín hiệu chiều sâu ở §3.2** — trong khi sáu tín hiệu còn
lại đều là chuyện cầm bút.

---

## 3 · Ba đường, mỗi đường có số

Nền để so, và nó là con số dễ quên nhất: **bản đồ hiện tại chạy ở 0 khung hình/giây sau
khi nạp xong.** Trang đứng yên thì trình duyệt không vẽ lại gì cả. Mọi đường dưới đây
đều so với số 0 đó.

### 3.1 · Đường A — chia lớp theo độ sâu, dịch theo con trỏ

**Một đính chính cho đề bài trước khi cho số: "chỉ CSS" là không làm được.** CSS không
đọc được toạ độ con trỏ. Ba lối, cả ba đều có giá:

- **JavaScript ghi một biến CSS** (`--px`, `--py`) rồi `transform` đọc nó. Đây là lối
  thật, và nó tốn ~15 dòng JS. Chi phí không nằm ở `transform` (compositor lo) mà ở **mỗi
  lần ghi biến CSS là một lượt tính lại style trên luồng chính**, và nếu biến đặt ở phần
  tử CHA thì mọi con thừa kế nó đều bị tính lại. Luật: ghi thẳng vào từng lớp, và **đúng
  một lần ghi mỗi khung hình** qua `requestAnimationFrame`, không phải mỗi sự kiện
  `pointermove`.
- **Hoạt ảnh theo cuộn** (`animation-timeline: view()`) — khai báo thuần, chạy ngoài
  luồng chính. **Nhưng MDN ghi rõ nó KHÔNG phải Baseline, "Limited availability"**
  **[nguồn]**, Firefox vẫn sau một cờ. Tức là vẫn phải viết đường dự phòng bằng JS, và
  thế là quay về lối trên — cộng thêm một nhánh nữa phải nuôi.
- **Lưới vùng `:hover` vô hình** để giả toạ độ con trỏ bằng CSS thuần. Làm được, và **nên
  bỏ**: chuyển động bị lượng tử thành từng bậc nhảy, mà chuyển động giật bậc còn dễ gây
  chóng mặt hơn chuyển động mượt.

**Byte — và đây là chỗ bất ngờ.** Đo byte từng lớp trong `m1-rest.svg` **[đo]**:

| lớp | byte | nhóm độ sâu đề xuất |
|---|---|---|
| `nen` · `bui-xa` · `tinh-van` · `khe-bui` · `soi-sang` | 11 451 B | **tấm XA** |
| `quang-chan-troi` · `truong-sao` · `luoi` | 30 185 B | **tấm GIỮA** |
| `net-chom` · `quang-sao` · `sao-bai` · `loi-sao` · `nhan` | 7 302 B | **tấm GẦN** |
| tổng 13 lớp | 48 938 B | |

Hiện tại mình ship **hai tấm đầy đủ** — nghỉ 49 443 B + hover 48 340 B = **97 783 B thô /
14 013 B brotli** **[đo]**. Vì sao tấm hover nặng gần bằng tấm nghỉ? Vì `skyDim = 0,62`
làm **mờ cả bầu trời** khi hover, nên **11 trong 13 lớp khác nhau giữa hai tệp** — mình
đang gửi một bản sao thứ hai của toàn bộ tinh vân chỉ để nó mờ đi **[đo]**.

**Tách lớp chữa đúng chỗ đó.** Khi ba tấm là ba phần tử `<img>` riêng, việc làm mờ bầu
trời là một dòng `opacity` của CSS, không còn là một tệp thứ hai:

| | hôm nay | sau khi tách 3 tấm |
|---|---|---|
| tệp | 2 (nghỉ + hover) | 4 (xa, giữa, gần, **phủ-hover chỉ cho lớp gần**) |
| byte thô | 97 783 B | ≈ **56 000 B** (48 938 + ~6 900 lớp gần bản hover + ~400 đầu tệp ×2) |
| request | 2 | 4 |

**Tức tách lớp LÀM GIẢM khoảng 42% dung lượng, trước khi có một pixel nào chuyển động.**
Đây là lý do mạnh nhất để làm bước này, và nó không dính gì tới parallax.

Phần thêm vào, nói đủ:

- **Lề tràn.** Lớp dịch ±8 px thì phải vẽ rộng thêm 8 px mỗi phía, nếu không mép lòi nền.
  Diện tích tăng (676 × 406) / (660 × 390) = **+6,6%**; ở ±12 px là **+10,0%** **[đo, tính
  từ khung]**. Quy ra byte đường nét: thêm ~2,7 kB thô cho hai tấm lớn **[phán đoán]**.
- **Nén kém đi một chút** khi chia nhỏ (cửa sổ nén ngắn hơn): **[phán đoán]** +10–15%
  brotli so với cộng dồn.
- **Bộ nhớ lớp compositor.** Mỗi lớp được thăng cấp là một kết cấu RGBA = rộng × cao × 4
  byte × DPR² **[phán đoán có cơ sở — quy tắc 4 byte/điểm ảnh là ước lượng phổ biến, bài
  web.dev chỉ nói "lớp tốn bộ nhớ", không cho con số]**:

  | bối cảnh | một lớp | 3 lớp | 6 lớp |
  |---|---|---|---|
  | khung 980 × 579 CSS, DPR 2 (máy tính) | 9,1 MB | 27 MB | **54 MB** |
  | khung 390 × 230 CSS, DPR 3 (điện thoại rẻ) | 3,2 MB | 9,7 MB | **19 MB** |
  | bản đồ đầy đủ 1 360 × 820, DPR 2 | 17,8 MB | 53 MB | **107 MB** |

  **Dòng cuối là lý do con số lớp phải là 3, không phải 6.** 107 MB kết cấu GPU trên một
  máy Android 2 GB là một thẻ bị trình duyệt thu hồi, và kiểu hỏng của nó là trang trắng
  khi quay lại.

- **`transform` và `opacity` là hai thuộc tính duy nhất compositor xử lý được mà không
  kích hoạt layout hay paint** **[nguồn]** — nên **6 lớp cùng dịch không đắt hơn 1 lớp
  một cách đáng kể**: compositor dựng lại toàn khung mỗi khung hình dù sao. Chi phí thật
  nằm ở **bộ nhớ** (bảng trên) và ở **luồng chính** (lượt tính style mỗi khung). Câu
  "transform chạy trên compositor" là đúng và **không trả lời** câu hỏi về giá.

### 3.2 · Đường B — CSS 3D thật (`perspective` + trục z)

Byte thêm: **0**. Đây thuần là cách viết khác của cùng phép dịch, cộng một thuộc tính
`perspective` trên khung chứa. Nên nếu chọn A thì B gần như miễn phí về dung lượng, và
câu hỏi chỉ còn là **cảm nhận**.

**B khác A ở ba chỗ, và chỉ chỗ thứ ba là khác biệt thật về cảm nhận:**

1. **Biên độ dịch được SUY RA, không phải chọn tay.** Ở A, mình tự đặt "lớp xa dịch 2 px,
   lớp gần dịch 8 px" — bốn con số rời. Ở B, chúng đến từ một `perspective` và một toạ độ
   z cho mỗi lớp, nên cả chồng lớp tuân theo **một cái máy ảnh**. Lợi ích là kỷ luật, như
   §19 đã học: một nguồn thì không lệch được.
2. **Lớp ở xa phải phóng to lên để lấp đầy khung** (hệ số `(p − z)/p`). Tức lớp xa bị dựng
   lại ở một tỉ lệ khác — với SVG trong `<img>`, **đổi tỉ lệ là dựng lại raster**, còn
   phép tịnh tiến thuần thì không **[phán đoán]**. Đây là chi phí B có mà A không có.
3. **Xoay (`rotateX`/`rotateY`) sinh ra méo hình thang (keystone):** mép gần loe ra, mép
   xa thu lại, và vật ở rìa dịch nhiều hơn vật ở giữa. **Đó mới là thứ đọc ra "một ô cửa
   sổ nhìn vào một khối không gian"** thay vì "mấy tấm ảnh trượt lên nhau". Nếu muốn một
   cảm nhận khác hẳn A, đây là chỗ duy nhất có nó.

**Và đó cũng chính là lý do bác điểm 3.** Méo hình thang là một **phép chiếu thứ hai**
chồng lên bức tranh — trong khi §3.3 đã mua tín hiệu "đây là một mặt cầu" bằng **lưới
kinh–vĩ cong vẽ sẵn**, là phép chiếu ĐÚNG cho một bầu trời. Nghiêng khung đi thì kinh
tuyến đang cong theo luật chiếu hình trụ bị bẻ thêm một lần nữa theo một luật khác, và
hai luật ấy không khớp nhau. Kết quả là một bản đồ sao **sai về phối cảnh** theo đúng
kiểu mà một người đọc bản đồ sao nhận ra ngay, kể cả khi không gọi tên được.

**Kết luận cho B: lấy điểm 1 (suy biên độ từ một trục z duy nhất), bỏ điểm 3 (không
xoay).** Thực tế đó là "A có kỷ luật" — và nó là thứ §5 đề nghị.

### 3.3 · Đường C — WebGL / three.js

**Dung lượng, đo hôm nay 19/10/2026 [đo]:**

| | thô | nén |
|---|---|---|
| gói `three` 0.186.1 đầy đủ (bundlephobia) | 736 231 B | **184 898 B gzip** |
| cảnh tối thiểu tree-shake (Scene, PerspectiveCamera, WebGLRenderer, Points, BufferGeometry, PointsMaterial, BufferAttribute, Color — bundlejs) | 531 241 B | **122 361 B brotli** |
| **toàn bộ bản đồ sao hiện tại** (2 tấm SVG) | 97 783 B | **14 013 B brotli** |

**122 kB brotli cho cảnh tối thiểu = 8,7 lần toàn bộ bản đồ**, và đó là **trước** khi
viết một dòng cảnh nào, trước shader, trước kết cấu tinh vân.

**Và nó phải tự host.** Kho này không dùng CDN: Pyodide 13 MB và mọi wheel đều nằm cùng
origin. Thêm three.js là thêm một thứ phải tự cập nhật — và nó ra **12 bản trong 365 ngày
gần nhất** (0.181.0 ngày 31/10/2025 → 0.186.1 ngày 24/09/2026) **[đo, từ registry npm]**.
Three.js không có semver major: các bước `0.x` mang thay đổi phá vỡ. Tức **một việc bảo
trì định kỳ mới, khoảng một lần mỗi tháng, cho một trang chủ.**

**Ngân sách khung hình.** 60 Hz là 16,7 ms mỗi khung; màn 90/120 Hz là 11,1 / 8,3 ms. Vẽ
48 + 1 250 điểm thì GPU không hề vất vả — **chi phí thật không phải phép vẽ, mà là trang
KHÔNG BAO GIỜ nghỉ nữa.** Mình đi từ 0 khung/giây lên 60 khung/giây, vĩnh viễn, trên mọi
máy vào trang chủ. Trên điện thoại rẻ đó là một vòng tiêu pin liên tục cho một thứ trang
trí **[phán đoán — không đo được mức tiêu pin ở đây, nhưng cấu trúc "0 → 60" thì đo được
và đã đủ để quyết]**.

**Phải TỪ BỎ cái gì — đây mới là cái giá thật:**

1. **Bức SVG tất định sinh từ một nguồn TS.** `e2e/unit/star-map.test.mjs` có **23 ca**.
   **17 ca đọc THẲNG văn bản SVG** và chết theo: bán kính khớp số ca chấm · không
   `stroke-width` nào bằng 0 · mọi mã màu có tên trong hồ sơ · `build_sky.py` không chứa
   mã màu nào · không gradient, không `<filter>` · không `id`/`data-*` ngoài `data-lop` ·
   thứ tự lớp đúng bằng `SKY_LAYERS` · hình Chạc ≤ 12 nét, rẽ ở P02 chụm ở P07 · nét
   không chạm sao · nhãn neo ngôi sáng nhất, đường dẫn 30° · tấm hover chỉ đổi độ mờ ·
   chạy hai lần ra đúng một tệp · hai tệp dưới trần dung lượng · hồ sơ đủ cơ chế cho bản
   sáng · nhãn đóng băng ở TS · vùng bấm tính lại từ chính tranh · không hiệu ứng tự chạy.
   Trong WebGL **không có tệp nào để `grep`**: muốn giữ mức bảo vệ tương đương phải đổi
   sang so ảnh chụp màn hình — tức đổi một bất biến **văn bản, tất định, chạy trong 1 giây**
   lấy một bất biến **điểm ảnh, phụ thuộc driver GPU**. Đó là một bước lùi lớn, và AGENTS.md
   đã ghi giá của việc mất lưới an toàn test.
2. **Sự cách ly của `<img>`.** Luật "đừng thêm `id`/`data-*` vào SVG" hiện **tự thi hành**
   vì không selector nào với vào trong được. Bỏ nó là bỏ một luật tự giữ mình.
3. **Hai hồ sơ sáng/tối lái bằng dữ liệu** (§19) — phải viết lại toàn bộ trong cảnh WebGL,
   và §19.1 đã nói rõ vì sao đó là ràng buộc kỹ thuật chứ không phải sở thích.
4. **Và nó KHÔNG thay được SVG, nó CỘNG vào SVG.** Dưới `prefers-reduced-motion` vẫn phải
   có một bức tĩnh; `<a>` thật, Tab được, trình đọc màn hình đọc được vẫn phải là HTML;
   LCP vẫn nên là một `<img>` mà bộ quét tải trước nhìn thấy (§9.2.2 đo được chênh lệch
   **~620 ms** ở phân vị 75 giữa trang có LCP là `<img>` và trang không). Nên C là
   **cộng 122 kB và một vòng render vĩnh viễn LÊN TRÊN** mọi thứ đang có.

### 3.4 · Bảng so

| | A (3 lớp, dịch theo con trỏ) | B (3D thật, có xoay) | C (WebGL) |
|---|---|---|---|
| byte nén thêm | **−6 kB** (tách lớp tiết kiệm nhiều hơn phần thêm) | như A | **+122 kB** brotli |
| request | 2 → 4 | 2 → 4 | 2 → 5+ |
| bộ nhớ lớp (bản đồ đầy đủ, DPR 2) | ~53 MB | ~53 MB + dựng lại raster khi đổi tỉ lệ | kết cấu + context WebGL |
| khung hình/giây lúc người dùng ngồi yên | **0** | **0** | **60** |
| luồng chính | 1 lượt ghi style mỗi khung khi con trỏ động | như A | vòng rAF vĩnh viễn |
| ca test mất/phải viết lại | 4 (về "một tệp"/"hai tệp") | như A | **17 / 23** |
| WCAG 2.2.2 | ngoài phạm vi | ngoài phạm vi | **áp dụng** — phải có nút tắt |
| WCAG 2.3.3 | áp dụng, tắt được | áp dụng, tắt được | áp dụng |
| mua thêm được gì | thị sai chuyển động | thêm méo hình thang | như B, cộng sao là điểm trong khối thật |
| **mua được điều §0.1 không** | **không** | **không** | **không** |

Dòng cuối là dòng quan trọng nhất của cả bảng.

---

## 4 · Ba ràng buộc chéo, áp vào cả ba đường

**Không CDN.** A và B thêm **0 byte thư viện**. C thêm 122 kB phải tự host và tự bump ~12
lần/năm. Ràng buộc này một mình đã gần như quyết xong C.

**Điện thoại và pin.** A/B chỉ tiêu CPU **khi ngón tay/con trỏ đang di chuyển**; và trên
máy cảm ứng thì **không gắn handler nào cả** — `@media (hover: none)` đã là chỗ đặt luật
đó, §11.1 đã quyết trạng thái nghỉ được nâng một nấc vĩnh viễn. C tiêu pin **lúc người
dùng ngồi đọc chú giải**.

**WCAG 2.2.2 / 2.3.3 và `prefers-reduced-motion`.** Luật cho A/B, nói hết thành câu để
không ai phải đoán:

- `reduce` ⇒ **`transform: none` cho mọi lớp**, không phải "biên độ nhỏ hơn". Và lúc đó
  bức tranh phải **trùng khít** bức tranh ở trạng thái nghỉ — xem §6 điều 3, đây là chỗ
  hỏng lặng nhất.
- `reduce` ⇒ giữ nguyên phản hồi hover bằng **độ mờ** (đã đúng như vậy hôm nay, dòng
  123–125 của `star-map.module.css`). Giảm chuyển động không có nghĩa là bỏ phản hồi.
- **Biên độ ≤ 8 px.** Không có ngưỡng chuẩn nào trong WCAG cho biên độ, nên đây là con số
  của mình **[phán đoán]**, chọn theo nguyên tắc: nhỏ hơn đường kính ngôi sáng nhất
  (8,6 px) thì chuyển động không đủ lớn để đọc ra là "cảnh đang nghiêng", chỉ đủ để xác
  nhận các lớp rời nhau.
- **`<picture>`/`<img>` của lớp xa giữ `fetchpriority="high"`;** các lớp còn lại không.

---

## 5 · ĐỀ NGHỊ — một đường, bốn bước, mỗi bước một thước đo đi/dừng

**Đường A rút gọn, kỷ luật của B, không bao giờ C.** Và thứ tự quan trọng hơn nội dung:
**ba bước đầu không có một pixel nào chuyển động.**

### Bước 1 · Tách lớp theo độ sâu — KHÔNG chuyển động gì cả

Chia 13 lớp thành **3 tấm** theo bảng ở §3.1, mỗi tấm một `<img>`, cùng `viewBox`, xếp
chồng tuyệt đối. Làm mờ bầu trời lúc hover bằng `opacity` của CSS thay cho tấm hover
thứ hai.

**Đo để biết đi tiếp hay dừng:**
- Tổng byte thô phải **giảm**: 97 783 B → **≤ 60 000 B**. Không giảm ⇒ phép tách sai chỗ,
  dừng.
- Ảnh tổng hợp ở trạng thái nghỉ phải **trùng ảnh hiện tại**. Cảnh báo đã biết: `skyDim`
  hiện nhân vào **độ mờ từng phần tử**, còn `opacity` của CSS là **làm phẳng rồi mới
  mờ** — hai phép này chỉ bằng nhau khi các nét không chồng nhau, mà năm đường đồng mức
  tinh vân thì có chồng. Phải dựng cả hai và so; lệch quá ngưỡng ⇒ giữ tấm hover riêng
  cho lớp xa.
- 23 ca test: 4 ca phải viết lại ("chạy hai lần ra đúng một tệp" → bốn tệp; "hai tệp dưới
  trần" → tổng bốn tệp; thứ tự lớp → **hợp của bốn tệp** đúng bằng `SKY_LAYERS`; vùng bấm
  tính lại từ tấm gần). **19 ca còn lại phải xanh mà không sửa một chữ.** Phải sửa quá 4
  ⇒ phép tách đang làm nhiều hơn phần việc của nó, dừng.

### Bước 2 · MỘT NGUỒN SÁNG — và đây là bước đáng giá nhất

Thay trần độ chói **toàn cục** bằng trần **cục bộ** (vốn đã có): cho phép một nguồn sáng
mạnh duy nhất ở một vùng **không có chữ và không giao bao lồi chòm nào**. Bộ máy §8 đã
biết trượt build nếu không đặt được nhãn — để nó làm việc của nó.

**Đo để biết đi tiếp hay dừng:**
- `% điểm ảnh L > 0,50` đi từ **0,10% → ≥ 2,0%** (Starsong: 7,73%).
- Trung vị độ chói **giữ ≤ 0,05** (Starsong: 0,028). **Sáng thêm ở đuôi, không sáng thêm
  nói chung** — vi phạm dòng này là làm hỏng đúng thứ đang đi tìm.
- Toàn bộ bảng tương phản §5.2 vẫn đạt, build không trượt ở bước đặt nhãn.
- Phép thử nhận dạng §20 **không tụt điểm**. Nếu nguồn sáng làm người xem khó nhận ra
  hình chòm hơn, nó là trang trí và phải gỡ.

### Bước 3 · Mở TỈ LỆ

Tỉ lệ vật lớn nhất : nhỏ nhất của mình là **3,6 : 1**; của Starsong là **~45 : 1**. Đưa
vào bầu trời một vật lớn (vùng tinh vân có hình thể rõ, hoặc chính quầng của nguồn sáng
bước 2) để 48 ngôi **nhỏ lại trong tương quan** mà không đổi một bán kính nào — bán kính
vẫn phải do số ca chấm quyết (luật 4 của `star-map.ts`).

**Đo:** tỉ lệ vật lớn nhất : sao nền đạt **≥ 15 : 1**; và **không một bán kính ngôi nào
đổi** — ca test "bán kính khớp số ca chấm" vẫn xanh.

### Bước 4 · (Tuỳ chọn) Parallax theo con trỏ, biên độ ≤ 8 px

Chỉ làm **sau khi** bước 2 và 3 đã đạt, và chỉ nếu lúc đó còn thấy thiếu. Ba lớp, biên độ
suy từ **một** trục z duy nhất (kỷ luật của B), **không xoay** (§3.2 điểm 3).

**Đo để biết giữ hay gỡ:**
- Đúng **một** lượt ghi style mỗi khung hình. Hơn ⇒ viết sai.
- `reduce` ⇒ `transform: none`, và ảnh tổng hợp trùng khít trạng thái nghỉ.
- `(hover: none)` ⇒ **không gắn listener nào**.
- **Phép thử che tay:** cho ba người xem hai bản (có và không có parallax), không nói
  trước khác gì. **Không ai nêu ra được chuyển động ấy ⇒ gỡ**, vì nó đang tốn luồng chính
  và một ngoại lệ trong CSS mà không mua được gì.

### Và nếu bốn bước vẫn chưa đủ

Thì câu trả lời **vẫn không phải WebGL**. Là vẽ tiếp: thêm một nguồn sáng thứ hai lệch
sắc, hoặc đổi tấm xa từ SVG sang **raster AVIF** đúng như §9.2 đã dự trù (85 kB ở 0,27
bpp) — raster mở ra thứ mà đường nét SVG không làm được: chuyển sắc liên tục trong vùng
tối, tức đúng cái 28,6% điểm ảnh gần đen của khung Starsong. Và §9.2.1 đã viết sẵn cách
tránh vệt dải cho nó.

---

## 6 · Ba thứ sẽ hỏng, và cả ba hỏng lặng lẽ

### 6.1 · LCP: sáu tấm ảnh thì không còn đo được bằng một con số

Hôm nay LCP của trang là tấm `<img>` duy nhất. Tách thành 3–4 tấm xếp chồng, **cả ba đều
phủ kín khung và đều là ảnh**, nên ứng viên LCP trở thành "tấm nào vẽ xong sau cùng trong
số các tấm cùng kích thước" — một con số có thể tụt mà **không tệp nào to ra**. Thêm một
lớp nữa: lớp gần hầu như trong suốt nhưng vẫn tính là một lần vẽ ảnh.

**Vì sao nó lặng:** AGENTS.md ghi rõ `next build` **không có trong bảng mốc nền** vì chưa
ai đo nó thành một con số ổn định. Tức **hôm nay không có ai canh LCP cả**. Tách lớp mà
không thêm một phép đo LCP là tự gỡ một thứ chưa từng được gắn.

**Chặn bằng:** `fetchpriority="high"` **chỉ** cho tấm xa; `decoding="async"` cho các tấm
còn lại; và đo LCP **trước và sau** trên cùng một máy, ghi cả hai con số vào mô tả commit.
Không có hai con số đó thì bước 1 chưa xong.

### 6.2 · `<img>` cách ly: vùng bấm trôi khỏi chỗ các ngôi sao đang ở

`.hitM1` hiện là bao lồi chòm nở 20 px, **tính bằng % của ô cắt** và do
`build_sky.py --css` in ra; ca test tính lại từ chính SVG và so từng con số. Nó là một
**hộp HTML**, không nằm trong SVG.

Khi lớp gần dịch 8 px theo con trỏ, **các ngôi sao đi, cái hộp bấm ở lại**. Ở biên độ
8 px với một vùng bấm rộng 56% ô cắt thì không ai nhận ra bằng mắt — nhưng người đi bằng
Tab, hoặc người dùng chuột ở mép vùng, sẽ bấm vào chỗ **không có gì** hoặc trỏ vào ngôi
sao mà không có gì sáng lên. Ca test vẫn xanh, vì nó so hộp với **tệp SVG**, không với
**thứ đang hiện trên màn**.

Và cái bẫy lớn hơn nằm ngay sau đó: người sửa tiếp theo sẽ muốn parallax **bên trong một
chòm** (sao gần dịch khác sao xa), tức muốn với tay vào từng phần tử của SVG, tức muốn đặt
`id`. Lúc ấy luật "đừng thêm `id`/`data-*`" không còn tự thi hành nữa — chỉ còn **một ca
test** đứng chắn.

**Chặn bằng:** vùng bấm phải **dịch CÙNG lớp gần bằng đúng một biến CSS**, không phải hai
con số chép ở hai chỗ (đúng bài học `MAP_ABYSS` của AGENTS.md: chép một con số sang chỗ
khác là một con số sẽ lệch). Và giữ nguyên ca test "không `id` và không `data-*` nào ngoài
`data-lop`" — nó vừa đổi vai từ "ghi lại một sự thật" thành "**giữ một luật**".

### 6.3 · `reduce` cần bản riêng, và lề tràn là chỗ nó vỡ

Dưới `reduce`, `transform: none` cho cả ba lớp. Nhưng ba lớp ấy **được vẽ rộng thêm 8 px
mỗi phía** để có chỗ dịch, nên ở trạng thái nghỉ chúng phải được **lùi lại đúng 8 px** để
chồng khít nhau. Đặt sai dấu cho **một** lớp và bức tranh lệch 16 px — mà một bản đồ sao
lệch 16 px **vẫn trông y như một bản đồ sao**. Không ai thấy. Đúng kiểu hỏng đã giết bản
vực hai lần trong một ngày.

Thêm một tầng nữa: §19 bắt **bản sáng và bản tối phải giống hệt, sai số 0** ở 9 thứ, trong
đó có vị trí nhãn. Nay danh sách ấy có thêm **lề tràn và độ lệch nghỉ của từng lớp** —
bốn tệp × hai hồ sơ = **tám tệp** phải khớp nhau.

**Chặn bằng:** độ lệch nghỉ của mỗi lớp do `build_sky.py --css` **in ra**, đúng cách
`.hitM1` đang được in ra, chứ không gõ tay vào CSS; và một ca test so **ảnh tổng hợp ở
trạng thái nghỉ** của bản tách lớp với ảnh một-tấm hôm nay. Nếu không viết được ca test
ấy thì **đừng tách lớp** — vì khi đó không có gì phân biệt "tách đúng" với "tách lệch
16 px".

---

## 7 · Cách đo lại mọi con số trong tài liệu này

Ghi ra để không ai phải tin lời:

- **Độ chói ảnh:** đọc PNG bằng Pillow, tuyến tính hoá sRGB (`c ≤ 0,04045 ? c/12,92 :
  ((c+0,055)/1,055)^2,4`), `L = 0,2126 R + 0,7152 G + 0,0722 B`, rồi lấy phân vị và tỉ lệ
  điểm ảnh vượt ngưỡng. Dùng `py -I`.
- **Diện tích sáng của bản mẫu:** đọc `frontend/public/map/star/m1-rest.svg`, lấy thuộc
  tính `r=` của lớp `loi-sao` và `sao-bai`, cộng `πr²`, chia cho 660 × 390.
- **Byte từng lớp:** cắt theo `<g data-lop="…">…</g>` rồi đếm byte UTF-8.
- **Byte nén:** `gzip -9 -c <tệp> | wc -c`; brotli bằng `zlib.brotliCompressSync` của Node.
- **three.js:** `bundlephobia.com/api/size?package=three@latest` cho gói đầy đủ;
  `deno.bundlejs.com` với danh sách tree-shake ở §3.3 cho cảnh tối thiểu; `registry.npmjs.org/three`
  cho ngày phát hành từng bản.

---

## 8 · Nguồn

**Về game:**
- Kotaku, bài đánh giá *OPUS: Echo of Starsong* — *"solid, strong blocks of color"*.
  <https://kotaku.com/opus-echo-of-starsong-the-kotaku-review-1847672103>
- SIGONO, bài kể quy trình vẽ tranh trong game (Medium, tiếng Trung phồn thể) — đọc kịch
  bản trước, phác thảo theo bố cục đã ghi trong kịch bản, **đưa bản phác vào engine thử
  cùng thoại/nhạc trước khi hoàn thiện**. <https://medium.com/@sigono/e7e3a5aa3d7b>
- Khung hình tham chiếu: `design/tham-chieu/ban-do-sao-game.png` (1 624 × 907).

**Về khả năng tiếp cận:**
- W3C, *Understanding SC 2.3.3 Animation from Interactions* (**Mức AAA**) — nêu đích danh
  parallax; định nghĩa "motion animation" **loại trừ** đổi màu và đổi độ mờ.
  <https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html>
- WebKit, *Responsive Design for Motion* — rối loạn tiền đình ảnh hưởng tới **69 triệu
  người riêng ở Mỹ**; công tắc Reduce Motion của iOS 7 thêm vào **để tắt parallax**.
  <https://webkit.org/blog/7551/responsive-design-for-motion/>

**Về kỹ thuật web:**
- web.dev (Paul Lewis), *Stick to Compositor-Only Properties and Manage Layer Count* —
  `transform` và `opacity` là hai thuộc tính duy nhất compositor lo được; lớp tốn bộ nhớ,
  **đừng thăng cấp bừa**.
  <https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count>
- MDN, `animation-timeline` — **không phải Baseline, "Limited availability"**.
  <https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline>
- bundlephobia (`three@0.186.1`): 736 231 B / 184 898 B gzip · bundlejs (tree-shake cảnh
  tối thiểu): 531 241 B / **122 361 B brotli** · registry npm: 12 bản trong 365 ngày.
  Cả ba truy ngày 19/10/2026.

**Trong kho:**
- `design/v3/ban-do-sao.md` — §3 (bảy tín hiệu chiều sâu), §5.2 (bảng tương phản), §8 (bộ
  máy đặt nhãn tự đo độ chói), §9.2 (trần 900 kB, AVIF), §9.2.2 (`<img>` và LCP, chênh
  ~620 ms), §10–§11 (hover, giảm chuyển động), §17 (nguồn), §19 (hai hồ sơ), §20 (phép
  thử nhận dạng).
- `design/v3/ky-thuat-ban-do.md` §6 — hình thái liền mạch; và commit `5b3d282` gỡ lớp
  chuyển động tự chạy.
- `AGENTS.md` — bẫy "ĐỪNG THÊM `id`/`data-*` VÀO SVG", bài học `MAP_ABYSS`, luật "test
  phải chứng minh được là nó bắt lỗi".
- `frontend/src/lib/star-map.ts` · `frontend/src/app/ban-do-sao/star-map.module.css` (luật
  số 3: *"không parallax theo chuột"*) · `frontend/e2e/unit/star-map.test.mjs` (23 ca).

---

## 9 · Thứ KHÔNG tra ra được, nói thẳng

1. **Không có tài liệu kỹ thuật nào của SIGONO về cách dựng cảnh.** Không biết họ dùng
   parallax mấy lớp, hay không lớp nào. Mọi kết luận ở §2 là **đo trên khung hình**, không
   phải lời họ nói. Nếu sau này artbook bản tiếng Anh ra và nó nói ngược lại, §2 phải được
   viết lại — nhưng §0.1 (dải độ chói 7,73% so với 0,10%) thì không đổi, vì đó là phép đo
   trên chính khung hình, không phải một suy luận về quy trình.
2. **Không đo được mức tiêu pin** của một vòng rAF trên máy Android rẻ trong môi trường
   này. Lập luận về C ở §3.3 đứng trên cấu trúc "0 → 60 khung/giây", không trên một con số
   mAh.
3. **Chưa đo được LCP của bản đồ sao hiện tại** — chưa có máy và chưa có phép đo chuẩn
   trong kho (AGENTS.md: `next build` không có trong bảng mốc nền vì chưa ai đo nó thành
   một con số ổn định). Đó chính là lý do §6.1 tồn tại.
4. **Quy tắc "4 byte mỗi điểm ảnh" cho bộ nhớ lớp compositor** là ước lượng phổ biến, KHÔNG
   lấy từ bài web.dev (bài đó chỉ nói "lớp tốn bộ nhớ", không cho con số). Các con số
   54 MB / 107 MB ở §3.1 là **phép tính từ ước lượng đó**, không phải phép đo trình duyệt.
5. **Thứ hạng tín hiệu chiều sâu theo khoảng cách** ở §2.5 dựa trên phân loại không gian
   của Cutting & Vishton (1995) — *Perceiving layout and knowing distances* — mà mình chỉ
   tra được qua nguồn thứ cấp hôm nay, không đọc bản gốc. Phần "che khuất giữ hiệu lực ở
   mọi khoảng cách, thị sai chuyển động tụt mạnh ở không gian xa" vì vậy để nhãn **phán
   đoán có cơ sở**, không phải **nguồn**.
