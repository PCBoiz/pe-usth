# Tương tác với bản đồ — người chơi làm gì BẰNG TAY

Ghi ngày 19/10/2026. **Đây là một BẢN NGHIÊN CỨU, không phải đặc tả. Không một dòng code
nào được viết theo tài liệu này trước khi chủ sản phẩm gật.**

Nguồn hình thái vẫn là [`ban-do-sao.md`](ban-do-sao.md); tài liệu này không sửa một con số
nào của nó. Nó đứng sau [`chieu-sau-tuong-tac.md`](chieu-sau-tuong-tac.md) và **đụng vào
đúng hai kết luận của bản đó** — nói thẳng ở §5.3 và §6.

Lời chê, nguyên văn, lần thứ **tư**:

> *"chưa có tí animation, motion graphic gì cả, hoàn toàn chưa mang lại được cho tôi cảm
> xúc như tôi nhìn world map của Echo of Starsong. Xem các videos world map nữa để hiểu
> cách người dùng có thể tương tác với thế giới để nâng cao UX lẫn UI lên, bản thiết kế
> này vẫn chưa đạt."*

Bốn lần chê, bốn lỗi KHÁC NHAU — đây là chỗ phải giữ cho thẳng, vì chữa lỗi thứ tư bằng
cách của lỗi thứ nhất là lại trượt lần thứ năm:

| lần | lỗi | đã chữa bằng |
|---|---|---|
| 1 | mảng phẳng tô gradient | nét thật, cấm gradient (`ky-thuat-ban-do.md`) |
| 2 | tám gian rời rạc | một thể liên tục xuyên cả bức (§6.2 cùng tệp) |
| 3 | ẩn dụ không đọc ra | đổi sang bầu trời của người thợ (`ban-do-sao.md` §1) |
| **4** | **đọc ra được rồi nhưng CHẾT CỨNG** | tài liệu này |

Nhãn con số, giữ nguyên quy ước của `chieu-sau-tuong-tac.md`: **[đo]** là phép đo mình tự
chạy hôm nay, có cách chạy lại ở §10; **[đo-kho]** là phép đo người khác đã chạy và ghi lại
trong kho, có dẫn tệp; **[nguồn]** là số/câu lấy từ tài liệu ngoài, đường dẫn ở §11;
**[phán đoán]** là ước lượng chưa đo được — và nó được gọi thẳng là phán đoán.

---

## 0 · Trả lời ngắn

**1. Bản đồ của mình thiếu một VERB, không thiếu hiệu ứng.** Bảy bản đồ ở §2 đều cho người
chơi **một động từ** để làm với thế giới: Starsong *rê rồi dò*, Stellarium *kéo rồi phóng*,
Outer Wilds *chọn rồi đặt mốc*, Slay the Spire *đọc cả bàn rồi chọn nhánh*. Bản đồ của mình
cho đúng một động từ, và nó là động từ nghèo nhất có thể: **đưa chuột vào một trong 16 hình
chữ nhật** **[đo, từ `star-map.module.css`]**. Trỏ vào không phải một hành động — nó là cái
xảy ra trên đường đi tới một hành động.

**2. Đường dễ nhất để "thêm animation" đã bị chính kho này đo và loại.** `figure-motion.ts`
ghi phép đo ngày 14/10/2026: animation CSS **bên trong** một SVG nhúng bằng `<img>` **không
được đưa lên compositor** — hai hình, Chrome DevTools, CPU chậm 4×, trace 10,5 s:
**2 007 ms main thread (19%)**, `UpdateLayoutTree` **796 ms / 1 084 lần (~103 lần/giây)**;
cuộn ra ngoài khung nhìn 5 000 px **vẫn 842 ms / 1 078 lần** **[đo-kho]**. Tức viết
`@keyframes` vào mười hai tấm SVG là cách **đắt nhất và không tắt được**. Mọi chuyển động
phải nằm ở **lớp HTML chồng lên** (`transform`/`opacity`, compositor lo **[nguồn]**), hoặc
không tồn tại.

**3. Cảm giác "nhìn ra vũ trụ" đến từ TỈ LỆ ĐỔI DO CHÍNH TAY NGƯỜI XEM, không từ parallax
theo con trỏ.** Giả thuyết của đề bài (parallax là thứ đầu tiên, không phải xa xỉ cuối
danh sách) **đúng về cơ chế và sai về liều**: cơ chế là thị sai chuyển động, nhưng liều
đúng không phải ±8 px theo con trỏ — mà là **một cú phóng vào một chòm**, nơi tấm trời gần
như không to ra trong khi chòm to ra gấp bội. Lập luận và bằng chứng ở §5.

**Ba bước đầu, theo thứ tự đổi-cảm-giác-trên-mỗi-giờ-công** (đủ năm bước ở §8):

1. **Con trỏ phải có mặt trong bức tranh** — vòng dò bám con trỏ + thang toạ độ ở lề sáng
   lên + mã bài của ngôi gần nhất. Lớp HTML, không chạm SVG, không phải chuyển động cảnh.
2. **Phóng vào một chòm** — tám tấm chòm ĐÃ TỒN TẠI; một phép `scale`+`translate` trên cả
   chồng tấm là đủ, 0 byte SVG mới.
3. **Hover thành một cú TIẾT LỘ có thứ tự**, không phải năm lớp cùng mờ-dần một nhịp.

---

## 1 · Trạng thái hôm nay, đo lại — vì hai bước của bản trước ĐÃ LÀM XONG

Phải nói điều này trước, vì nó đổi hẳn chỗ phải sửa: **bước 2 và bước 3 của
`chieu-sau-tuong-tac.md` §5 đã đi vào code rồi.** Bản đồ hiện tại không còn là bản mẫu M1
hai tấm mà bản đó đo.

| | `chieu-sau-tuong-tac.md` đo (bản mẫu M1) | hôm nay **[đo]** |
|---|---|---|
| số tấm SVG | 2 | **12** (trời · sao nền · mạch · 9 tấm chòm) |
| byte thô | 97 783 B | **543 343 B** |
| byte brotli (cộng từng tệp) | 14 013 B | **57 399 B** |
| điểm sáng nhất trong tranh | bị cấm vượt L = 0,0748 | **`#F6F1E2`, L = 0,8799** |
| vật sáng lớn nhất | Ø 8,6 px | lớp `nguon-sang` + vệt loé `loe-ngang` **rộng ~367 px ≈ 27% khung** |
| tỉ lệ bán kính sao lớn nhất : nhỏ nhất | 3,6 : 1 | **6,1 : 1** (r 5,37 so với r 0,88) |
| ca test canh bức tranh | 23 | **31** |

Nghĩa là: **trần độ chói toàn cục đã được gỡ, một nguồn sáng đã được vẽ, tỉ lệ đã mở.**
Hai thứ mà bản trước gọi là "thay đổi rẻ nhất và lớn nhất" đã xảy ra — **và chủ sản phẩm
vẫn chê.** Đó là dữ kiện quan trọng nhất của tài liệu này, vì nó loại bỏ hẳn một giả
thuyết: khoảng cách còn lại **không** phải dải độ chói nữa.

Cái còn lại, đo trên code đang chạy:

- **Bề mặt tương tác = 16 hình chữ nhật và một thuộc tính.** `star-map.module.css` có
  `.hit*a` (bao lồi chòm) và `.hit*b` (hộp nhãn) cho tám chặng; hover/focus đổi đúng ba
  thứ: tấm chòm-đang-trỏ `opacity: 0 → 1`, tấm chòm-lúc-nghỉ `1 → 0`, tấm trời `1 → 0,62`.
  Hết. Không có trạng thái nào giữa "ngoài chòm" và "trong chòm" **[đo]**.
- **Trang đứng yên tuyệt đối sau khi nạp**: không `@keyframes`, không listener, 0 khung
  hình/giây **[đo, từ CSS và `page.tsx`]**. Đây là một thành tựu có chủ ý (`map-motion.ts`
  ghi rõ), và nó cũng chính là lời chê.
- **Chín tấm chòm là chín bản sao của cùng 48 ngôi.** Chúng khác nhau **83,54% số ký tự**
  **[đo]** nhưng chỉ khác nhau về ĐỘ MỜ. Trong một tấm, lớp `quang-sao` chiếm **39 463 B
  trên 49 445 B = 79,8%** **[đo]**. Chín tấm = **450 701 B thô / 42 154 B brotli** **[đo]**
  cho một thứ mà CSS làm được bằng một dòng `opacity`. Nén dồn cả 12 tệp vào một luồng ra
  **21 723 B** so với 57 399 B cộng từng tệp **[đo]** — tức **~35,7 kB brotli là trùng lặp
  mà brotli không với qua được ranh giới tệp**.

Chỗ cuối là một món quà, không phải một món nợ: **việc phải làm để có chuyển động (tách
mỗi chòm thành một tấm riêng) cũng là việc phải làm để giảm byte.** Đúng cấu trúc mà
`chieu-sau-tuong-tac.md` §3.1 đã tìm ra ở quy mô 2 tệp, nay lặp lại ở quy mô 9 tệp.

---

## 2 · Bảy bản đồ — tay làm gì · bản đồ đáp lại ra sao · cái gì tiết lộ dần

Mỗi mục đúng ba câu đó, không thêm tính từ. Thiếu nguồn ở chỗ nào thì ghi ra.

### 2.1 · OPUS: Echo of Starsong — thứ chủ sản phẩm nêu đích danh

**Tay làm gì:** rê một **vòng ngắm (crosshair)** trên một bản đồ nhìn-từ-trên của Thousand
Peaks, đặt nó đè lên một tín hiệu, **bấm để DÒ (analyse)**, rồi bấm lần nữa **cùng một
nút** để bay tới **[nguồn: Wikipedia, TheGamer, RPGFan]**. Mỗi chuyến tốn **nhiên liệu** và
có **tầm bay**, nên thao tác thật là *"chỗ này tới được trong một nhịp, hay phải ghé giữa
đường?"* **[nguồn: TheGamer]**.

**Bản đồ đáp lại ra sao:** nó trả lời câu hỏi *tới được không* trước khi bạn đi — tầm bay
và nhiên liệu là hai con số hiện ra quanh vòng ngắm. Và **nó trả lời bằng ÂM THANH**: mô tả
chính thức của game là *"Find the fabled asteroids by listening for the right sound on the
star map"*; witch dùng một máy quét để **cộng hưởng** với tiếng hát của hang, qua một trò
nhỏ **gióng một vệt sáng khớp với một giọng** **[nguồn: Nintendo store, Neoseeker]**.

**Cái gì tiết lộ dần:** **sự TỒN TẠI của địa điểm.** *"Some locations, such as lumen caves,
are hidden until players find its starsong"* **[nguồn: Wikipedia]**. Bản đồ không fog theo
tiến độ — nó fog theo **việc bạn đã nghe ra chưa**.

**Bài học, và nó là bài học quan trọng nhất của cả §2:** cảm xúc mà chủ sản phẩm nhớ KHÔNG
sinh ra từ animation. Màn bản đồ sao của Starsong là một bức tranh **đứng yên** (`chieu-sau`
§2.5 đã ghi điều này, và nó vẫn đúng) mà người chơi **vận hành như một thiết bị**: rê, dò,
gióng, nghe, quyết. Cảm giác "nhìn ra vũ trụ" ở đó là cảm giác **đang dùng một khí cụ để
với vào một cái gì rất xa**. Mình đang thiếu đúng cái khí cụ ấy, không thiếu hiệu ứng.

Một chỉnh lại cho chính mình, chép từ `chieu-sau` §2.1 vì nó vẫn đúng: không tồn tại công
khai bài phân tích mỹ thuật hay phỏng vấn hoạ sĩ nào của game này; hai giải Asian Game
Awards 2021 của nó là **Thiết kế** và **Âm thanh**, không phải Mỹ thuật. Nên viện nó làm
chuẩn **cách vận hành**, đúng như mục này làm, mới là viện đúng.

### 2.2 · Outer Wilds — gần việc này nhất, vì bản đồ của nó là một MẠNG LIÊN KẾT

**Tay làm gì:** mở máy tính trên tàu, chuyển giữa **Map Mode** (xếp theo hành tinh, chọn
đích) và **Rumor Mode** (xếp theo **cái gì liên quan tới cái gì**), chọn một mục rồi **đặt
một mốc (waypoint) lên HUD** **[nguồn: Outer Wilds wiki, UX critique]**.

**Bản đồ đáp lại ra sao:** nó **không nói sẽ nối vào đâu**. Một bài phê UX viết thẳng rằng
chuyện đó *"is for the best as it maintains a high mystery"* **[nguồn]**. Và nó đáp lại
bằng cách **đổi hình**: *"the layout of Rumor Mode can be different for each player"* vì
liên kết phụ thuộc thứ tự khám phá **[nguồn]**.

**Cái gì tiết lộ dần:** **các NÉT NỐI.** Mỗi mục mới không chỉ thêm một điểm, nó thêm một
sợi — và một dấu hoa thị đánh dấu chỗ còn dở **[nguồn: thảo luận Steam]**.

**Bài học:** bản đồ sao của mình đã chọn đúng vật thể cho việc này. 50 nét nối trong chòm +
một mạch hoàng đạo (`ban-do-sao.md` §4) **LÀ** Rumor Mode, vẽ bằng quy ước 400 năm tuổi.
Nhưng mình **vẽ sẵn cả 50 nét từ giây đầu**, nên cái mà Outer Wilds dùng làm phần thưởng
thì mình dùng làm hình nền. Đây là chỗ mất mát lớn nhất mà không ai nhìn ra, vì bức tranh
vẫn đẹp.

### 2.3 · Stellarium Web — bản đồ sao THẬT, và là phép thử kỳ vọng

**Tay làm gì:** **kéo** để quay hướng nhìn theo mọi phương; **lăn chuột** (hoặc hai ngón
trên trackpad) để **phóng, tức đổi trường nhìn (FOV)**; bấm chuột trái **chọn** một vật,
chuột phải **bỏ chọn**; mũi tên bàn phím thay cho kéo **[nguồn: hướng dẫn ĐH Iowa, UWA]**.

**Bản đồ đáp lại ra sao:** phóng không phải là "ảnh to ra" — nó là **trường nhìn hẹp lại**,
nên **số sao hiện ra TĂNG** khi bạn phóng vào. Đó là phản hồi mang tin, không phải trang
trí.

**Cái gì tiết lộ dần:** **bậc độ sáng tới hạn.** Càng phóng càng thấy sao mờ hơn.

**Bài học, và nó là một cảnh báo:** bất kỳ ai từng dùng một bản đồ sao đều **mang sẵn kỳ
vọng kéo-và-phóng** vào trang của mình. Một tờ bản đồ sao không kéo được, không phóng được,
chỉ sáng lên khi trỏ chuột — nó **trượt một kỳ vọng mà chính thể loại nó chọn đã dựng lên**.
Đó là một cách giải thích rất gọn cho câu "chết cứng" mà không cần nói tới animation.

### 2.4 · Slay the Spire — bản đồ KHÔNG phóng, không kéo, và vẫn là bản đồ được bàn nhiều nhất

**Tay làm gì:** **đọc cả bàn một lượt** rồi bấm **một nút kề mình**. Chỉ đi được tới node
nối trực tiếp với node đang đứng **[nguồn: Ludo.guide]**. Hướng dẫn dạy người chơi **đếm
elite trên từng nhánh và xem chúng nằm sớm hay muộn** trước khi bước bước đầu **[nguồn]**.

**Bản đồ đáp lại ra sao:** nó **không đáp lại gì cả** trước khi bạn chọn — và đó là điểm
mạnh. Một nghiên cứu 20 000 lượt chơi (Bazzaz & Cooper, 2025) kết luận bản đồ **giao quyền
điều chỉnh độ khó cho người chơi**, và các lượt thắng gắn với **entropy chuẩn hoá CAO hơn**,
tức người thắng chọn nhánh mạo hiểm hơn **[nguồn]**.

**Cái gì tiết lộ dần:** **không gì cả — và đó là một lời chê có thật.** Một thớt Steam nói
thẳng *"a huge part of the decision making is just... pure luck"* vì không thấy được trong
node có gì **[nguồn]**. Cái đọc được là **bố cục và LOẠI node**, không phải nội dung.

**Bài học:** đây là bản đồ gần nhất với bản đồ của mình về hình thái (xem hết một lượt,
không phóng) và nó chứng minh **một bản đồ tĩnh VẪN đáng khám phá — nếu mỗi điểm trên đó
mang một con số người xem phải cân.** Bản đồ của mình có sẵn con số ấy và đang vẽ nó rồi:
bán kính ngôi = **số ca chấm của bài** (`ban-do-sao.md` §6.1). Nhưng **không chỗ nào trên
trang nói ra điều đó**, nên 48 con số nằm trong tranh mà không ai đọc được.

### 2.5 · Hades — cái gì được cho biết TRƯỚC khi bạn cam kết

**Tay làm gì:** đi tới một trong hai–ba cửa. Trên mỗi cửa có **một biểu tượng = phần
thưởng của phòng SAU cửa đó** **[nguồn]**.

**Bản đồ đáp lại ra sao:** nó **cho biết giá và thưởng trước**, không cho biết nội dung:
biểu tượng đầu lâu = miniboss/elite, và thưởng ở đó **phẩm cấp cao hơn** **[nguồn]**.

**Cái gì tiết lộ dần:** **phòng, không phải phần thưởng.** Một bài phân tích gọi đúng cái
hiếm: *"players can see the reward before entering each room. This is rarely seen in
rogue-lite games, and the active choosing also enhances player's interactivity"* **[nguồn]**.

**Bài học — và nó cho mình một luật dùng được ngay:** *cho biết HÌNH DẠNG của lựa chọn,
giữ lại NỘI DUNG của nó.* Dịch sang bản đồ sao: ở tỉ lệ cả-bầu-trời hiện **hình chòm + số
bài + độ nặng**; **tên 48 bài chỉ hiện ở tỉ lệ một-chòm**. Điều này **vừa là tiết lộ dần,
vừa chữa một lỗi tay nghề thật**: 8 nhãn chòm cộng 48 mã bài trên một khung 1 360 px là
chật, và `ban-do-sao.md` §8 đã phải dựng cả một bộ máy đặt nhãn **trượt build** khi không
tìm được chỗ. Bớt chữ ở tỉ lệ xa làm bộ máy ấy dễ sống hơn.

### 2.6 · Elden Ring — fog, và lý do nó không dùng được ở đây

**Tay làm gì:** đi trong thế giới; mở bản đồ; **ghép mảnh** (19–20 mảnh, tuỳ nguồn).

**Bản đồ đáp lại ra sao:** **sương tan dần theo bước chân** — *"the fog covering it on the
map will begin to clear up and a drawing of a Guide Stele may be revealed"* **[nguồn]**. Và
có một đường lùi: ngay cả khi chưa có mảnh, *"if you explore enough, its location should
appear on your blank map as a tiny glowing pillar"* **[nguồn]**.

**Cái gì tiết lộ dần:** **bản thân tấm giấy.**

**Bài học, và đây là một chỗ PHẢI NÓI KHÔNG:** fog theo tiến độ là cách tiết lộ mạnh nhất
trong cả bảy bản đồ, và mình **không được dùng nó**, vì hai ràng buộc đã chốt từ trước:
`ban-do-sao.md` §1 — *"Không khoá chặng. Trời không khoá."*; và bản thử Advanced-only chạy
**không có đăng nhập ở trang công khai**, nên trang bản đồ *"KHÔNG GỌI API"* (chú thích đầu
`page.tsx`) — gọi là mỗi con bot sinh một tài khoản khách. Không có phiên thì **không có
tiến độ để fog theo**. Nên cái tiết lộ dần của mình buộc phải là **tiết lộ theo TỈ LỆ và
theo CHÚ Ý**, không theo tiến độ. §7 nói đủ.

### 2.7 · Explore Runeterra (Riot) — và một lời thú nhận đáng giá hơn cả bản đồ

**Tay làm gì:** **kéo để lướt** quanh bản đồ; **bấm vào một node** → mở một **panel nội
dung** bên cạnh; **bấm vào một vùng** → mở champion/địa danh/truyện của vùng đó **[nguồn:
Riot FAQ, We Are Royale, tylerlahaie]**.

**Bản đồ đáp lại ra sao:** bằng **máy ảnh**. Người thiết kế viết *"The camera choreography
and rich animations fill the whole map"* **[nguồn]**. Dựng bằng **WebGL** — React + WebGL,
hệ thống chia ô ảnh (image tiling), height map động, shader riêng **[nguồn]**; và Riot phải
ghi cảnh báo rằng hiệu năng *"heavily dependent on your internet connection, browser
settings, and phone specs"* **[nguồn]**.

**Cái gì tiết lộ dần:** không gì theo thời gian; tiết lộ theo **việc bấm vào đâu**.

**Bài học — hai cái, và cái thứ hai đắt hơn:**
1. Giá trị lớn nhất họ kể được không phải hiệu ứng, mà là **chỗ đứng**: *"For the first
   time, every piece of art had a place in the world of Runeterra, which gave it context in
   players' minds"* **[nguồn]**. Đó đúng là việc bản đồ sao đang làm cho 48 bài.
2. Và studio dựng teaser cho nó **tự kể đã phải gỡ bỏ hiệu ứng đẹp nhất của mình**: ý đầu
   là cho những mép năng lượng phát sáng *"burn"* bản đồ hiện ra dần, nhưng *"this became
   **too distracting to the map itself**"* nên họ hạ nó xuống để giữ tiêu điểm ở **nội dung
   bản đồ** **[nguồn: We Are Royale]**. Một studio mỹ thuật chuyên nghiệp, trên đúng bài
   toán này, đã đi đúng con đường chủ sản phẩm đi hôm nay khi ra lệnh gỡ `5b3d282`.

### 2.8 · Cái gì có ở CẢ BẢY

Ba thứ, và bản đồ của mình thiếu cả ba:

| | bảy bản đồ kia | bản đồ sao hôm nay |
|---|---|---|
| **một động từ có hậu quả** | rê+dò · kéo+phóng · chọn+đặt mốc · đọc+chọn nhánh · bước qua cửa · ghép mảnh · kéo+bấm vùng | **trỏ** (không hậu quả) |
| **HAI tỉ lệ trở lên** | cả bản đồ ⇄ một vùng/một hệ/một panel | **một tỉ lệ duy nhất** |
| **cái gì bị giữ lại** | tồn tại (Starsong) · nét nối (OW) · sao mờ (Stellarium) · nội dung node (StS) · phòng (Hades) · tấm giấy (ER) · truyện của vùng (Runeterra) | **không giữ lại gì — 48 ngôi và 8 nhãn hiện hết từ giây đầu** |

Cả ba dòng đều **không nói tới animation**. Đó là phát hiện trung tâm của §2.

---

## 3 · Tách bạch ba thứ hay bị gộp

Gộp chúng là lý do người ta thêm hiệu ứng mà vẫn thấy chết. Định nghĩa, cộng cái phân biệt
chúng về mặt **ai bấm nút bắt đầu** — vì đó mới là thứ WCAG quan tâm.

| nhóm | định nghĩa | ai khởi động | kéo dài | WCAG 2.2.2 (Dừng/Ngừng/Ẩn) | WCAG 2.3.3 (Hoạt ảnh do tương tác) |
|---|---|---|---|---|---|
| **A · Phản hồi** | bản đồ cho biết TAY TÔI ĐANG Ở ĐÂU | người dùng, liên tục | bằng đúng thời gian ngón tay ở đó | không áp dụng | **loại trừ nếu chỉ đổi màu/độ mờ** **[nguồn]** |
| **B · Chuyển cảnh** | đi từ trạng thái này sang trạng thái kia | người dùng, một lần | có điểm đầu và điểm cuối | không áp dụng | **ÁP DỤNG** (đổi vị trí/kích thước) |
| **C · Sự sống nền** | bản đồ động đậy khi tôi không làm gì | **đồng hồ** | vô hạn, hoặc tới khi tắt | **ÁP DỤNG nếu > 5 giây** | không áp dụng |

Ba chẩn đoán, mỗi cái một dòng:

- **Nhóm A của mình tồn tại ở dạng nghèo nhất.** Có phản hồi, nhưng độ phân giải của nó là
  **1/16 khung hình**: con trỏ ở đâu trong một bao lồi rộng 8–18% khung cũng cho ra đúng
  một trạng thái **[đo, từ `.hitM*a` trong CSS]**. Trong khi đó bản đồ **có sẵn 48 toạ độ**
  để đáp lại tinh hơn.
- **Nhóm B của mình KHÔNG tồn tại.** `transition: opacity var(--ds-dur-base) ease` với
  `--ds-dur-base = 320ms` **[đo]** trên năm lớp **cùng một nhịp, cùng một đường cong, không
  độ trễ nào** — đó không phải một chuyển cảnh, đó là một **cái công tắc có bóng đèn chậm**.
  Đây là chỗ nhiều cảm giác nhất đang bị bỏ trên bàn, và nó tốn **0 byte mới** để lấy.
- **Nhóm C bị gỡ hôm nay, có chủ ý, và lý do gỡ vẫn đúng.** §4.

**Luật rút ra, và nó chi phối cả §6:** *"thêm animation" gần như luôn được hiểu là nhóm C,
trong khi gần như toàn bộ cảm giác thiếu nằm ở nhóm A và B.* Nhóm C là nhóm duy nhất đòi
một nút Dừng, tốn pin khi người ta ngồi đọc, và **không mua được một tin nào** — vì thứ gì
phải tắt được thì không được mang tin (`chieu-sau` §1 điều (c)).

---

## 4 · Giải cái mâu thuẫn: hôm nay họ bắt GỠ, hôm nay họ đòi THÊM

Mâu thuẫn là có thật, cùng một ngày, cùng một người:

- commit `5b3d282` gỡ **năm hiệu ứng tự chạy, −964 dòng**, theo lệnh *"chỉ cần motion
  graphic khi hover nào thôi"*; và lệnh ấy đã thành **luật số 3** của
  `star-map.module.css`: *"Không sao nhấp nháy, không tinh vân trôi, không parallax theo
  chuột, không hoạt ảnh lúc vào trang."*
- rồi: *"chưa có tí animation, motion graphic gì cả."*

Không tránh được bằng cách chọn một trong hai. Phải giải.

### 4.1 · Cái bị gỡ là cái gì — và vì sao nó đọc ra "nhiễu"

Năm hiệu ứng ấy, theo `map-motion.ts`: bốn màn khí parallax **theo cuộn**, cột bụi rơi
trong giếng, mạch rỉ vào bể M4, mặt hồ M8 trôi ngang, năm sợi sáng vẽ dần bằng
`stroke-dashoffset`. Ba tính chất chung, và cả ba là lý do chúng thành nhiễu:

1. **Vô hạn và đều nhịp.** Nhóm C thuần. Một chu kỳ đều, lặp mãi, là thứ mắt học xong trong
   hai vòng rồi bắt đầu thấy khó chịu.
2. **Chạy song song với việc đọc.** Năm chỗ động cùng lúc trên một trang có chữ.
3. **VÀ — quan trọng nhất — chúng động trên một bức tranh mà chính chủ sản phẩm vừa nói là
   không đọc ra nghĩa gì.** Lời chê lần 3 (*"tôi đang chưa hiểu hình vẽ này biểu trưng cho
   điều gì"*) và lệnh gỡ chuyển động xảy ra trong cùng một mạch. Bụi rơi trong một cái
   giếng mà người ta không nhận ra là giếng thì không phải "sự sống", nó là **nhiễu trên
   một tín hiệu đã yếu**.

Nên hai câu của chủ sản phẩm không chống nhau. Câu đầu nghĩa là *"đừng động vì động"*. Câu
sau nghĩa là *"tôi không có gì để LÀM với bản đồ này"*. Cả hai cùng trỏ về §2.8.

### 4.2 · Cái gì khiến một chuyển động nền thành "sống" thay vì "nhiễu"

Giả thuyết của đề bài — **biên độ cực nhỏ, chu kỳ không đều, chuyển động phải có NGHĨA** —
tra được nguồn cho cả ba, và phải thêm điều kiện thứ tư.

- **Biên độ cực nhỏ: đúng.** Hướng dẫn nghề mocap nói idle tốt nhất là thứ *"nearly
  invisible, with players sensing life without consciously noticing the cause"*, với biên
  độ thở cỡ **1–2 cm** trên một người cao 170 cm, tức **~1%** **[nguồn]**. Andy Clarke
  (Smashing) cho số thật của một bức ambient đang chạy: lông chim **±3°**, nhân vật
  **20 px**, lắc cả nhóm **±2°** **[nguồn]**. Và luật kiểm: *nếu một chuyển động kéo được
  chú ý, nó đang quá mạnh* **[nguồn]**.
- **Chu kỳ không đều: đúng, và có cách dựng.** Clarke: đổi *"rhythm, tone, and timing"*,
  dùng `animation-delay` và các quãng so le để **giả ngẫu nhiên** — mi mắt nảy ở *"what
  look like random intervals"*, lấp lánh ở quãng khác nhau **[nguồn]**. Chu kỳ dài:
  **3–6 giây** cho từng lớp **[nguồn]**. Và vòng lặp phải **khép kín** (khớp khung đầu với
  khung cuối, hoặc `alternate`) — *"Sudden resets break the mood"* **[nguồn]**.
- **Phải có NGHĨA: đúng, và có một phép thử một câu.** Clarke đặt câu hỏi chọn-cái-gì-động
  thành: *vật này ngoài đời có động không — nó có khối lượng không, nó mềm không?* **[nguồn]**
  Áp vào bầu trời thì câu trả lời rất sắc, và nó loại bỏ phần lớn ý tưởng:
  **sao KHÔNG tự nhấp nháy; KHÍ QUYỂN làm chúng nhấp nháy.** Nên nếu có lấp lánh thì nó
  **chỉ được xảy ra ở dải sát chân trời**, nơi `ban-do-sao.md` §3.2 đã vẽ sẵn lớp khí dày
  (*"sao nền ở dải chân trời: độ mờ × 0,62, bán kính × 1,15"*), và **tuyệt đối không ở
  thiên đỉnh**, nơi hai ngôi M8 nằm vì đó là chỗ *"trời tối nhất và trong nhất"*. Một bầu
  trời mà sao ở đỉnh lấp lánh mạnh bằng sao ở chân trời là một bầu trời **sai**, theo đúng
  kiểu một người đọc bản đồ sao nhận ra ngay mà không gọi tên được — cùng loại lỗi mà
  `chieu-sau` §3.2 đã dùng để bác phép xoay keystone.
- **Điều kiện thứ tư, đề bài không nêu, và nó là điều kiện cứng nhất: PHẢI KẾT THÚC.**
  WCAG 2.2.2 áp dụng cho mọi chuyển động tự khởi động **kéo dài hơn 5 giây** và chạy song
  song với nội dung khác. `map-motion.ts` ghi rằng kho này từng có đúng một hằng số cho
  việc đó — `MAX_AUTO_MOTION_MS = 5000` — dựng ra để **không phải làm nút Dừng**, rồi nó
  mất việc khi lớp chuyển động bị gỡ. **Hằng số đó phải quay lại nếu nhóm C quay lại.**
  Và nó tự nhiên loại bỏ dạng tệ nhất: vòng lặp vô hạn.

### 4.3 · Và đây là chỗ cái dễ nhất bị loại — phép đo đắt nhất trong kho

Cách hiển nhiên để làm 12 tấm SVG sống lại là viết `@keyframes` **vào trong** chúng. Nó
chạy thật: `<img>` tắt JavaScript **[nguồn: MDN]** nhưng CSS và SMIL bên trong vẫn chạy
**[nguồn: Smashing, Practical SVG]**, và kho này đã dùng đúng cách đó cho **23 hình minh
hoạ bài học** ở `frontend/public/static/anim/*.svg`.

Rồi nó bị đo. `figure-motion.ts`, ghi ngày 14/10/2026, Chrome DevTools, CPU chậm 4×, **hai**
hình, trace 10,5 s **[đo-kho]**:

| | con số |
|---|---|
| main thread | **2 007 ms = 19% của trace** |
| `UpdateLayoutTree` | **796 ms / 1 084 lần ≈ 103 lần/giây** |
| cùng phép đo, hình đã cuộn ra ngoài khung nhìn 5 000 px | **842 ms / 1 078 lần** |

Và câu giải thích, chép nguyên vì nó là câu quyết định: *"Animation CSS trong SVG nhúng
dạng ảnh KHÔNG được đưa lên compositor, nên mỗi nhịp phải tính lại style rồi vẽ lại ảnh
trên main thread."* Cộng thêm: **ra khỏi màn hình không hề rẻ hơn.**

Ba hệ quả, tất cả đều là luật cho §6:

1. **Không một `@keyframes` nào được viết vào `scripts/star/build_sky.py`.** Hai hình đã
   ngốn 19% main thread; bản đồ có **12 tấm** phủ kín khung.
2. **Và không tắt được.** Trang không với vào trong `<img>` được, nên cách duy nhất để dừng
   là thủ thuật của `figure-motion.ts`: đổi `src` sang một **Blob dựng lại từ chính file
   SVG** có chèn `*{animation:none!important}` (`<object>` bị CSP chặn — `object-src
   'none'`; `<iframe>` được phép nhưng SVG khai `width`/`height` cố định nên bị cắt, cộng
   một tab stop mới). Đó là **một bộ máy cả một file** cho một hiệu ứng trang trí.
3. **Vậy mọi chuyển động phải ở LỚP HTML CHỒNG LÊN**, nơi `transform` và `opacity` là hai
   thuộc tính duy nhất compositor lo được mà không kích hoạt layout hay paint **[nguồn:
   web.dev]**, nơi trang **tắt được** chúng, và nơi `prefers-reduced-motion` đọc được bằng
   `@media` thật. Ranh giới này đã được viết sẵn thành luật 2 của `star-map.module.css`:
   *"không với vào TRONG tài liệu SVG, nhưng với được cái thẻ chứa nó."*

**Và đây là mắt nối với §1:** cái thẻ chứa nó hiện chỉ có **bốn** loại (trời · sao nền ·
mạch · chòm). Muốn một chòm động riêng thì chòm phải là **một thẻ riêng**. Tức việc tách
9 tấm-48-ngôi thành 8 tấm-một-chòm **không phải một bước tối ưu byte có thể hoãn — nó là
điều kiện tiên quyết của mọi chuyển động theo chòm.** Một việc, hai lý do, và lý do byte
thì tự trả tiền (§1: 450 701 B thô cho chín bản sao).

---

## 5 · Câu khó nhất: cảm giác "nhìn ra vũ trụ" đến từ TƯƠNG TÁC nào?

Nghi vấn của đề bài: *phần lớn đến từ **tỉ lệ được tiết lộ qua chuyển động** — khi bạn rê
và các lớp trôi khác tốc độ, não mới hiểu cái gì xa cái gì gần; hình tĩnh không bao giờ nói
được điều đó. Nếu đúng thì parallax theo con trỏ không phải thứ xa xỉ cuối danh sách, nó là
thứ đầu tiên.*

**Phán quyết: cơ chế ĐÚNG, liều SAI, và chỗ đứng trong danh sách thì đúng — nhưng không
phải cho parallax theo con trỏ.** Ba mảnh bằng chứng.

### 5.1 · Phần đúng: tỉ lệ chỉ đọc được qua chuyển động tương đối

Đây là thị sai chuyển động, và nó là một cơ chế thật, không phải một hiệu ứng: *"Motion
parallax is another monocular depth cue that is experienced through the relative motion of
the near and far objects"* **[nguồn]**. Họ hàng của nó — hiệu ứng chiều sâu động (kinetic
depth effect) — mạnh tới mức *"the three-dimensional structural form of an object can be
perceived when the object is moving"*, chứng minh từ Wallach & O'Connell bằng **cái bóng
2D của một khung dây đang quay** **[nguồn]**. Và nó không cần nhiều dữ liệu: *"the motion
cue can be experienced from just two photographs taken from different views"* **[nguồn]**.

Nên câu "hình tĩnh không bao giờ nói được điều đó" là đúng, và `chieu-sau` §2.5 đã thừa
nhận: thị sai chuyển động là **tín hiệu duy nhất** mà tranh phẳng không tạo ra được.

### 5.2 · Phần sai: ±8 px theo con trỏ là liều dưới ngưỡng, trên nội dung tệ nhất có thể

Ba chỗ cùng chống lại cái liều đó:

- **Trọng số của thị sai dồn về KHÔNG GIAN GẦN.** Cutting & Vishton xếp tín hiệu cho vùng
  với-tay-tới được: *occlusion, binocular disparity, motion perspective, relative size…*
  theo thứ tự giảm **[nguồn]**; một báo cáo NASA nói các tín hiệu này *"most effective in
  … 'Personal Space' and 'Action Space', up to 10 meters"* **[nguồn]**; một bài về buồng
  tập lái nói thị sai hai mắt chỉ chạy trong **~30 m** **[nguồn]**. Một bản đồ sao, theo
  định nghĩa, là cảnh ở **vô cực** — nội dung tệ nhất có thể cho thị sai. Ngược lại,
  **che khuất giữ hiệu lực ở mọi khoảng cách** nhưng chỉ cho **thứ tự**, không cho khoảng
  **[nguồn]** — và che khuất là tín hiệu mà `ban-do-sao.md` §3.2 xếp **mạnh nhất** và đã
  vẽ sẵn (khe bụi xoá sao nền).
  · **Phải nói rõ chỗ mình KHÔNG tra ra được:** không tìm được nguồn cho trọng số thị sai
  ở **không gian xa** (quá ~30 m) nói riêng. Nên câu "parallax yếu ở vô cực" vẫn ở nhãn
  **[phán đoán có cơ sở]**, đúng như `chieu-sau` §9 điều 5 đã dán nhãn.
- **Mô hình cấu trúc-từ-chuyển-động gán độ sâu **tỉ lệ với tốc độ cục bộ** **[nguồn]**. Ở
  ±8 px, tốc độ cục bộ **giữa hai lớp** còn nhỏ hơn thế nữa — và `chieu-sau` §4 đã tự chọn
  8 px theo nguyên tắc *"nhỏ hơn đường kính ngôi sáng nhất thì chuyển động không đủ lớn để
  đọc ra là 'cảnh đang nghiêng'"*. Đó là mô tả chính xác của **một liều cố ý dưới ngưỡng
  đọc**. Và nó đi kèm một **phép thử che tay** tự huỷ: *"không ai nêu ra được chuyển động
  ấy ⇒ gỡ"*.
- **Nó là thứ bị nêu đích danh trong WCAG 2.3.3**, và lý do nó bị nêu không phụ thuộc vào
  việc tiêu chí ấy ở mức AAA: WebKit đo rối loạn tiền đình ảnh hưởng **69 triệu người riêng
  ở Mỹ**, và công tắc Reduce Motion của iOS 7 thêm vào **để tắt parallax** **[nguồn, qua
  `chieu-sau` §8]**. Tức mình trả toàn bộ giá đạo đức của parallax để lấy một liều mình tự
  đặt dưới ngưỡng nhận ra.

### 5.3 · Câu trả lời: tỉ lệ ĐỔI, do chính tay người xem, một lần, có điểm dừng

Cùng một cơ chế, liều gấp hai chục lần, và không một trong ba chỗ chống trên còn áp dụng:
**một cú phóng từ cả-bầu-trời vào một-chòm.**

Vì sao đây là thị sai chuyển động **thật** chứ không phải "ảnh to ra": trong một cú phóng
lấy một chòm làm tâm, bốn tầng độ sâu đi **bốn tốc độ khác nhau** — tấm trời (tinh vân,
nguồn sáng) gần như đứng, trường sao nền nhích, mạch hoàng đạo trượt, tấm chòm nở ra nhiều
nhất và dịch nhiều nhất vì nó lệch tâm. Đó **chính xác** là *"relative motion of the near
and far objects"*, chỉ khác là biên độ đo bằng **trăm pixel**, không phải tám.

Và nó thắng ở cả năm chỗ mà parallax-theo-con-trỏ thua:

| | parallax ±8 px theo con trỏ | phóng vào một chòm |
|---|---|---|
| nhóm (§3) | **C ở lốt A** — động liên tục suốt lúc tay ở trên bản đồ | **B** — có điểm đầu, điểm cuối |
| biên độ | dưới ngưỡng, cố ý | trên ngưỡng, hiển nhiên |
| kết thúc? | không, tới khi chuột ra khỏi khung | **có, ~450 ms** (`--ds-dur-page`) |
| để lại gì khi xong | **không gì** — bức tranh về đúng chỗ cũ | **một trạng thái mới đọc được**: một chòm, 7 nhãn bài |
| `reduce` ⇒ `transform: none` | **mất hẳn hiệu ứng, không mất tin** (vì nó không mang tin) | **vẫn tới đúng trạng thái đó, không có quãng tween** — không mất một tin nào |

Dòng cuối là dòng quyết định, và nó giải một điều kiện mà `chieu-sau` §1 gọi là *"nghiệt
ngã nhất"*: **thứ gì phải tắt được thì không được mang tin.** Một chuyển cảnh thoả điều
kiện ấy một cách tầm thường — tắt tween đi thì vẫn tới đích. Một hiệu ứng nền thì không
bao giờ thoả nó theo cách nào khác ngoài "nó vô nghĩa".

**Nên câu trả lời cho mục 3 của đề bài:** vâng, cảm giác vũ trụ đến từ tỉ lệ được tiết lộ
qua chuyển động — và vì thế **điều phải đưa lên đầu danh sách không phải parallax, mà là
một phép ĐỔI TỈ LỆ do người dùng gây ra.** Parallax theo con trỏ là **phiên bản teo đi của
cùng ý tưởng**: cùng cơ chế, một phần hai mươi liều, không điểm dừng, không để lại gì. Nó
đứng cuối danh sách không phải vì nó xa xỉ, mà vì nó là **hàng thay thế kém** cho thứ đứng
đầu. Và đáng để nói thẳng: Starsong — bằng chứng duy nhất mà chủ sản phẩm thực sự nêu —
cho cảm giác ấy trên một màn bản đồ **đứng yên**, bằng một vòng ngắm và một tiếng hát.

---

## 6 · Mười đề xuất

Mỗi cái: **nhóm** (§3) · **dựng bằng gì** · **byte** · **`prefers-reduced-motion`**. Byte
có nhãn; cái nào chưa đo thì nói là phán đoán và nói cả căn cứ.

### 6.0 · Việc nền: tám tấm một-chòm thay chín tấm bốn-tám-ngôi

**Không phải một đề xuất về cảm giác — là điều kiện tiên quyết của 6.2, 6.3, 6.5, 6.8.**

- **nhóm:** không, đây là hạ tầng.
- **dựng bằng gì:** `build_sky.py` sinh `sky-chom-M1…M8.svg`, mỗi tấm **chỉ** chòm của nó.
  Làm mờ bảy chòm còn lại bằng CSS: `.hit:hover ~ .chom { opacity: .35 }` cộng
  `.hitM1:hover ~ .chomM1 { opacity: 1 }`. Tấm `nghi` biến mất.
- **byte:** hôm nay **450 701 B thô / 42 154 B brotli** cho chín tấm **[đo]**. Sau khi
  tách: **~50–65 kB thô, ~12–16 kB brotli** **[phán đoán, dựa trên đo]** — căn cứ:
  `quang-sao` chiếm 79,8% một tấm và nó tỉ lệ với số ngôi được vẽ quầng, nên một chòm 2–9
  ngôi mang khoảng 1/8 tải của tấm 48 ngôi. **Giảm ~85% byte thô của phần chòm**, trước khi
  có một pixel nào chuyển động.
- **`reduce`:** không liên quan — không có chuyển động nào ở bước này.
- **cái gì mua được:** mỗi chòm thành **một thẻ HTML riêng**, tức một vật mà CSS dịch được,
  mờ được, phóng được. Không có bước này thì 6.2/6.3/6.5/6.8 đều phải chạm vào trong SVG,
  tức vi phạm §4.3.
- **rủi ro:** 31 ca test hiện canh *"thứ tự lớp đúng bằng `SKY_LAYERS`"*, *"chạy hai lần ra
  đúng một tệp"*, *"hai tệp dưới trần dung lượng"*. Sẽ phải viết lại một số; `chieu-sau`
  §5 bước 1 đặt ngưỡng **sửa quá 4 ca ⇒ phép tách đang làm nhiều hơn phần việc của nó**.
  Ngưỡng ấy giữ nguyên ở đây.

### 6.1 · Vòng dò bám con trỏ + thang toạ độ ở lề sáng lên ★ bước 1

- **nhóm:** **A**.
- **dựng bằng gì:** một `<div>` phủ, `pointer-events: none`, mang hai biến CSS `--cx/--cy`;
  **một** lượt ghi mỗi khung hình qua `requestAnimationFrame`, ghi **thẳng vào phần tử đó**
  (không vào cha, để không kéo cả cây vào lượt tính lại style — `chieu-sau` §3.1). Hình:
  hai vạch mảnh chữ thập + một vòng tròn mảnh, cộng hai vạch nhỏ trượt trên lề trên và lề
  trái = **thang toạ độ**. Thang này là thứ `ban-do-sao.md` §3.3 đã vẽ sẵn lưới kinh–vĩ
  cho, nhưng chưa ai đọc được.
- **byte:** ~25 dòng JS + ~40 dòng CSS ≈ **1,2 kB thô / ~0,5 kB brotli** **[phán đoán]**.
  SVG: **0 byte mới.**
- **`reduce`:** **GIỮ NGUYÊN.** Một vòng dò bám con trỏ không phải hoạt ảnh cảnh — nó là
  con trỏ. Nhưng hai luật cứng: (a) **KHÔNG `cursor: none`** — con trỏ hệ điều hành là cái
  duy nhất tôn trọng cỡ con trỏ phóng to, tương phản cao và "lắc để tìm" của macOS
  **[nguồn]**; vòng dò là một lớp **chồng thêm**, không phải lớp thay thế; (b) dưới `reduce`
  thì vòng dò **nhảy thẳng tới toạ độ con trỏ**, không có `transition` đuổi theo (lerp) —
  cái đuôi trễ là chuyển động, cái vị trí thì không.
- **`(hover: none)`:** **không gắn listener nào.** Trên máy chạm không có con trỏ để dò.
- **vì sao nó là bước 1:** nó là thứ duy nhất trong cả tài liệu đổi **mọi điểm ảnh của
  khung** từ "một tấm ảnh" sang "một thiết bị đang bật", với 0 byte SVG, 0 rủi ro test, và
  0 nợ khả năng truy cập. Và nó là động từ của Starsong, gần như nguyên văn: *rê một vòng
  ngắm trên bản đồ*.

### 6.2 · Ngôi sao gần con trỏ nhất tự nhận mình ★ bước 1 (đi cùng 6.1)

- **nhóm:** **A**.
- **dựng bằng gì:** 48 `<span>` tuyệt đối, toạ độ **do `build_sky.py --css` IN RA** đúng
  cách `.hitM1a` đang được in ra — tuyệt đối không gõ tay (bài học `MAP_ABYSS` trong
  AGENTS.md: chép một con số sang chỗ khác là một con số sẽ lệch). Mỗi `<span>` chứa mã bài
  (`P01`…) ẩn; `:hover` trên chính nó hiện mã + một quầng mảnh. Vùng chạm ~22 px đường kính
  để đạt mức chạm tối thiểu, dù ngôi chỉ vẽ Ø 10,7 px.
- **byte:** 48 phần tử + CSS toạ độ ≈ **3,5 kB thô / ~0,9 kB brotli** **[phán đoán]**.
- **`reduce`:** giữ nguyên — WCAG 2.3.3 **loại trừ** đổi màu và đổi độ mờ khỏi định nghĩa
  "motion animation" **[nguồn]**, và `star-map.module.css` đã chép đúng điều này vào chú
  thích `@media (prefers-reduced-motion)`.
- **cái gì mua được:** độ phân giải phản hồi đi từ **1/16 khung** lên **1/48 ngôi**. Và nó
  là chỗ duy nhất nói ra được rằng **bán kính ngôi = số ca chấm của bài** — con số mà
  `ban-do-sao.md` §6.1 đã lấy từ dữ liệu thật và hiện không ai đọc được (xem bài học
  Slay the Spire, §2.4).

### 6.3 · Phóng vào một chòm ★ bước 2 — đổi nhiều cảm giác nhất

- **nhóm:** **B**.
- **dựng bằng gì:** `transform: scale(S) translate(…)` trên **phần tử bọc cả chồng tấm**,
  với tâm phóng là tâm bao lồi chòm. Trạng thái do URL giữ (`/ban-do-sao#M3` qua `:target`,
  hoặc một route con) — **không phải `useState`**, để nút Back của trình duyệt là nút
  "lùi ra" và để trạng thái chia sẻ được. Tỉ lệ: `S ≈ 2,6` cho một chòm vừa khung
  **[phán đoán, từ bao lồi ~15% × 25% khung]**.
- **byte:** **0 byte ảnh mới** (tám tấm chòm đã có sau 6.0). CSS + ~15 dòng JSX ≈ **1 kB**
  **[phán đoán]**.
- **`reduce`:** `transition: none` trên phép biến đổi ⇒ **nhảy thẳng tới trạng thái đã
  phóng**. Không mất một tin nào — đây là lý do §5.3 xếp nó trên parallax.
- **cái lo thật, và nó là cái lo nghiêm trọng nhất của cả tài liệu:** `<img>` + `scale` là
  **dựng lại raster**, không phải tịnh tiến thuần (`chieu-sau` §3.2 điểm 2 đã nêu). Với
  **năm** tấm phủ kín khung, phóng 2,6× trên điện thoại DPR 3 là một lượng raster đáng kể.
  **Chặn bằng:** phóng bằng `transform` (compositor nội suy kết cấu đang có, mờ một nhịp
  rồi nét lại) chứ không bằng `width`/`height`; và `will-change: transform` **chỉ đặt lúc
  đang phóng rồi gỡ ngay** (web.dev: lớp tốn bộ nhớ, đừng thăng cấp bừa **[nguồn]**). Đo
  trước/sau là điều kiện đi tiếp (§8).
- **cái gì mua được:** hai tỉ lệ — thứ mà **cả bảy** bản đồ ở §2 đều có và mình không có
  (§2.8). Và thị sai chuyển động ở liều đọc được (§5.3).

### 6.4 · Hover thành một cú TIẾT LỘ CÓ THỨ TỰ ★ bước 3

- **nhóm:** **B**.
- **dựng bằng gì:** CSS thuần, chỉ bằng `transition-delay` trên những thẻ `<img>` đã có.
  Hôm nay năm lớp cùng chạy 320 ms một nhịp. Thay bằng một trình tự có **nguyên nhân**:
  trời mờ đi trước (0 ms, 200 ms = `--ds-dur-fast`) → tấm chòm hiện (**trễ 80 ms**, 320 ms)
  → tấm nhãn hiện sau cùng (**trễ 200 ms**). Mắt đọc ra *"trời lùi ra, chòm bước tới, rồi
  nó tự giới thiệu"* thay vì *"đèn bật"*.
- **byte:** **~0,2 kB** CSS **[phán đoán]**. Không byte ảnh.
- **`reduce`:** `transition: none` ⇒ đổi tức thì, như hôm nay. Trạng thái cuối y nguyên.
- **vì sao đáng làm sớm:** nó là **thay đổi rẻ nhất trong cả danh sách** (một thuộc tính
  CSS, không tệp mới, không JS, không ca test nào phải sửa) và nó đánh trúng đúng chữ
  "motion graphic khi hover" mà chủ sản phẩm đã CHỐT là thứ họ muốn.

### 6.5 · Nét nối vẽ dần khi chòm hiện ra

- **nhóm:** **B**.
- **dựng bằng gì:** **đây là chỗ bẫy.** `stroke-dashoffset` nằm **trong** SVG ⇒ rơi vào
  đúng phép đo §4.3 (không composited, 103 lượt tính style/giây, không tắt được từ trang).
  **Loại.** Cách hợp luật: `clip-path` **trên thẻ `<img>` của tấm chòm**, một dải mở ra từ
  gốc chòm; hoặc `mask-image` với một gradient trượt. Cả hai là thuộc tính của **thẻ**, trang
  tắt được, và chạy một lần ~450 ms.
  · Thành thật: `clip-path` **không** nằm trong hai thuộc tính composited của web.dev
  **[nguồn]**, nên đây là một lượt vẽ lại thật, một lần, trên một phần tử. Chấp nhận được
  cho một chuyển cảnh **450 ms có điểm dừng**; không chấp nhận được cho một vòng lặp.
- **byte:** ~0,4 kB CSS **[phán đoán]**.
- **`reduce`:** `clip-path: none` ⇒ chòm hiện đủ ngay.
- **cái gì mua được:** đúng cái Outer Wilds dùng làm phần thưởng (§2.2): **nét nối là thứ
  được TIẾT LỘ, không phải thứ có sẵn.** 50 nét của `ban-do-sao.md` §4.1 cuối cùng được
  dùng như một sự kiện.

### 6.6 · Lấp lánh — CHỈ ở dải chân trời, ≤ 5 giây, không lặp

- **nhóm:** **C** — nhóm duy nhất trong danh sách, và nó ở đây **có điều kiện**.
- **dựng bằng gì:** lớp HTML của 6.2 (48 `<span>`), `@keyframes` đổi **`opacity`** trên
  quầng — composited **[nguồn]**. **Chỉ** những ngôi trong 170 px dưới cùng, nơi
  `ban-do-sao.md` §3.2 đã vẽ lớp khí dày; **không ngôi nào ở nửa trên**, và **tuyệt đối
  không hai ngôi M8 ở thiên đỉnh**. Biên độ `opacity` **≤ 0,12**; chu kỳ **3–6 s** so le
  bằng `animation-delay` lấy từ một hạt giống cố định trong `star-map.ts` (giả ngẫu nhiên
  theo cách Clarke mô tả **[nguồn]**).
- **byte:** ~0,6 kB CSS **[phán đoán]**; 0 byte ảnh.
- **`reduce`:** bọc toàn bộ trong `@media (prefers-reduced-motion: no-preference)`
  **[nguồn: Clarke]** ⇒ không tồn tại dưới `reduce`. Vì nó không mang tin, không mất gì.
- **ĐIỀU KIỆN CỨNG:** **`animation-iteration-count` hữu hạn, tổng thời lượng ≤ 5 000 ms,
  không `infinite`.** Đó là WCAG 2.2.2 (§4.2 điều kiện thứ tư) và nó khôi phục đúng hằng số
  `MAX_AUTO_MOTION_MS = 5000` mà `map-motion.ts` ghi là đã mất việc. Một bầu trời lấp lánh
  trong 5 giây đầu rồi đứng im là một bầu trời **có khí quyển**; một bầu trời lấp lánh mãi
  là một tab mở cả ngày đang tiêu pin.
- **phép thử giữ-hay-gỡ:** luật của Clarke, nguyên văn — *nếu một chuyển động kéo được chú
  ý, nó đang quá mạnh* **[nguồn]**. Hạ biên độ tới khi chỉ thấy *"nếu thật sự để ý"*.

### 6.7 · Mạch hoàng đạo trả lời câu "các chòm nối với nhau thế nào"

- **nhóm:** **A**.
- **dựng bằng gì:** `sky-mach.svg` đã tồn tại và chỉ nặng **1 509 B / 575 B brotli**
  **[đo]** — rẻ nhất trong 12 tấm. Hôm nay nó luôn hiện ở một độ mờ. Cho nó **hai nấc**:
  mờ lúc nghỉ, rõ lên khi con trỏ ở trong M5–M8, bằng `opacity` trên thẻ.
- **byte:** ~0,2 kB CSS, **0 byte ảnh mới** **[phán đoán]**.
- **`reduce`:** giữ (đổi độ mờ, không phải chuyển động **[nguồn]**).
- **cái gì mua được:** đây đúng là câu hỏi chủ sản phẩm đã hỏi ở lần duyệt trước (*"chòm
  này kết nối với các chòm khác như nào?"*, chép trong `page.tsx`), và câu trả lời hiện
  đang nằm trong một tấm 1,5 kB mà không ai chỉ vào.

### 6.8 · Parallax theo con trỏ, biên độ ≤ 8 px — giữ ở CUỐI, có thể không bao giờ

- **nhóm:** **C đeo lốt A** (§5.3).
- **dựng bằng gì:** tái dùng `--cx/--cy` của 6.1 (đã có, không thêm listener); biên độ suy
  từ **một** trục z duy nhất cho năm tấm, **không xoay** (`chieu-sau` §3.2 điểm 3 bác phép
  xoay vì nó chồng một phép chiếu thứ hai lên lưới kinh–vĩ đã cong theo luật khác).
- **byte:** ~0,4 kB CSS + lề tràn 8 px mỗi phía trên các tấm ⇒ diện tích +6,6%
  **[đo-kho, `chieu-sau` §3.1]**, ước thêm ~2,7 kB thô **[phán đoán]**.
- **`reduce`:** `transform: none` cho **mọi** lớp — không phải "biên độ nhỏ hơn". Và đây là
  chỗ hỏng lặng nhất của cả tài liệu: năm tấm được vẽ rộng thêm 8 px mỗi phía, nên ở trạng
  thái nghỉ chúng phải **lùi lại đúng 8 px**; đặt sai dấu cho **một** tấm là bức tranh lệch
  16 px, mà **một bản đồ sao lệch 16 px vẫn trông y như một bản đồ sao** (`chieu-sau` §6.3).
- **phép thử:** giữ nguyên phép che tay của `chieu-sau` §5 bước 4 — ba người, hai bản,
  không nói trước; **không ai nêu ra được ⇒ gỡ**.

### 6.9 · Những thứ ĐÃ CÂN VÀ LOẠI — ghi ra để không ai đề xuất lại

| ý | vì sao loại |
|---|---|
| `@keyframes`/SMIL **trong** 12 tấm SVG | §4.3: không composited, **2 007 ms/19% main thread cho HAI hình** **[đo-kho]**, không tắt được từ trang, và SMIL *"not affected by `prefers-reduced-motion`"* **[nguồn]** |
| three.js / WebGL | `chieu-sau` §3.3: **+122 kB brotli**, 0 → 60 khung/giây vĩnh viễn, **17/23 ca test chết**, tự host + ~12 bản/năm. Hôm nay con số test là **31** **[đo]** nên cái giá ấy chỉ cao thêm. Không có bằng chứng mới nào phản bác được, và §2.1 còn làm nó yếu hơn: chính Starsong không cần 3D |
| kéo để lướt bầu trời (như Stellarium/Runeterra) | Bầu trời của mình là **MỘT khung 1360×820 vừa đúng màn**, không phải một mặt cầu vô hạn. Kéo một thứ không có gì ở ngoài mép là một cử chỉ **nói dối**. 6.3 (phóng) cho cùng cảm giác hai-tỉ-lệ mà không nói dối |
| `cursor: none` + con trỏ tự vẽ | §6.1: xoá đi cái duy nhất tôn trọng thiết lập con trỏ của hệ điều hành **[nguồn]** |
| `animation-timeline: view()` (hoạt ảnh theo cuộn, khai báo thuần) | MDN: **không Baseline, "Limited availability"** **[nguồn, qua `chieu-sau` §8]** ⇒ vẫn phải viết nhánh JS dự phòng, tức thêm một nhánh phải nuôi |
| lưới vùng `:hover` vô hình để giả toạ độ con trỏ bằng CSS thuần | `chieu-sau` §3.1: chuyển động bị lượng tử thành bậc nhảy, mà giật bậc **dễ gây chóng mặt hơn** mượt |
| fog theo tiến độ học (Elden Ring) | §2.6: `ban-do-sao.md` §1 cấm khoá chặng, và trang công khai **không được gọi API** (`page.tsx` luật 1 — mỗi bot một tài khoản khách) ⇒ không có tiến độ để fog theo |

---

## 7 · Cái gì được tiết lộ dần — khi không được quyền khoá gì

Đây là chỗ bản đồ của mình hiện yếu nhất (§2.8 dòng 3: **không giữ lại gì**) và cũng là chỗ
bị bó nhất (§2.6: không khoá chặng, không có phiên). Ba cách tiết lộ còn hợp luật, xếp theo
độ mạnh:

1. **Theo TỈ LỆ.** Ở cả-bầu-trời: tám hình chòm, tám nhãn chặng, 48 ngôi với bán kính mang
   tin. Ở một-chòm: thêm **tên 7 bài, số ca chấm, cờ bài cửa**. Đây là luật của Hades
   (§2.5): *cho biết hình dạng của lựa chọn, giữ lại nội dung của nó.* Và nó **chữa một lỗi
   tay nghề thật** — bớt chữ ở tỉ lệ xa làm bộ máy đặt-nhãn-hoặc-trượt-build của
   `ban-do-sao.md` §8 dễ sống hơn.
2. **Theo CHÚ Ý.** 6.2: mã bài chỉ hiện ở ngôi con trỏ đang gần. 6.7: mạch phụ thuộc chỉ rõ
   lên khi tay ở trong nửa liên quan. Không giấu sự tồn tại, chỉ giấu **chi tiết**.
3. **Theo THỨ TỰ THỜI GIAN TRONG MỘT CHUYỂN CẢNH.** 6.4 và 6.5: nét nối và nhãn **đến sau**
   chòm. Cùng một thông tin, nhưng đến như một sự kiện.

Và cái **không** làm được, nói thẳng để không ai đi tìm: Starsong giấu **sự tồn tại** của
địa điểm tới khi bạn nghe ra tiếng hát của nó (§2.1). Giấu sự tồn tại của một bài học trên
một trang công khai của một khoá tự học là **giấu mục lục** — đi ngược triết lý đã chốt
(tự học, hệ thống dẫn đường) và đi ngược chính câu *"Trời không khoá. Nhìn chòm nào trước
là việc của người nhìn."*

---

## 8 · THỨ TỰ LÀM

Năm bước. Mỗi bước: làm gì · vì sao bước này trước bước kia · dấu hiệu đi tiếp hay dừng.
**Ba bước đầu không thêm một byte ảnh nào.**

### Bước 1 · Con trỏ có mặt trong bức tranh — 6.1 + 6.2

**Vì sao trước mọi thứ khác:** đây là bước duy nhất đổi **toàn khung** từ "một tấm ảnh"
sang "một thiết bị đang bật, có một vòng dò và một thang toạ độ", với **0 byte ảnh mới,
0 ca test phải sửa, 0 nợ khả năng truy cập** — và nó là động từ của chính game chủ sản phẩm
nêu tên (§2.1). Nó cũng phải đứng trước 6.8 vì 6.8 tái dùng đúng `--cx/--cy` của nó.

**Đi tiếp hay dừng:**
- Đúng **một** lượt ghi style mỗi khung hình, đo bằng DevTools Performance. Hơn một ⇒ viết
  sai, sửa trước khi đi tiếp.
- `(hover: none)` ⇒ **0 listener gắn.** Kiểm bằng cách đếm trong DevTools.
- Cho **ba người** xem hai bản, không nói trước khác gì, và hỏi một câu: *"bản đồ này làm
  được gì?"* **Nếu không ai nói ra một động từ ⇒ DỪNG CẢ TÀI LIỆU NÀY.** Khi đó khoảng
  cách còn lại không phải tương tác, và mọi bước sau là tiền đổ vào một giả thuyết sai.
  Phép thử này đặt ở bước 1 đúng vì nó rẻ nhất để chạy và đắt nhất để bỏ qua.
- Không có mã màu mới nào trong `*.module.css` (`npm run lint:tokens` cấm hex) và 31 ca
  test xanh **mà không sửa một chữ**.

### Bước 2 · Hover thành một cú tiết lộ có thứ tự — 6.4 + 6.7

**Vì sao trước bước 3:** hai cái này cộng lại **~0,4 kB CSS, không tệp mới, không JS, không
ca test nào phải sửa** — tức tỉ số cảm-giác-trên-giờ-công cao nhất trong cả tài liệu sau
bước 1, và chúng đánh trúng đúng chữ mà chủ sản phẩm đã CHỐT muốn ("motion graphic khi
hover"). Làm chúng trước bước 3 còn vì một lý do thứ hai: nếu bước 2 đã đủ làm chủ sản phẩm
gật, thì **không phải mạo hiểm với 6.0** — việc nặng nhất và nhiều rủi ro test nhất.

**Đi tiếp hay dừng:**
- Trạng thái **cuối** của hover phải trùng khít hôm nay. Chỉ nhịp đến của các lớp đổi.
- `reduce` ⇒ `transition: none`, đổi tức thì, như hôm nay.
- **Cho chủ sản phẩm xem ngay tại đây.** Nếu gật ⇒ dừng, ghi lại rằng bước 3–5 chưa cần.
  Bốn lần chê rồi: một bản đạt ở bước 2 đáng hơn một bản hoàn hảo ở bước 5 sau hai tuần.

### Bước 3 · Tách tám tấm một-chòm — 6.0

**Vì sao sau bước 2 mà trước bước 4:** nó là **điều kiện tiên quyết** của phóng (6.3), vẽ
dần nét nối (6.5) và lấp lánh theo chòm — nhưng nó cũng là bước duy nhất đụng vào
`build_sky.py` và vào các ca test, nên nó không được đứng trước những bước rẻ. Và nó **tự
trả tiền**: ~450 kB thô → ~50–65 kB thô cho phần chòm **[đo + phán đoán]**.

**Đi tiếp hay dừng:**
- Byte thô **phải giảm**: 543 343 B → **≤ 160 000 B** **[đo làm mốc]**. Không giảm ⇒ phép
  tách sai chỗ, dừng.
- Ảnh tổng hợp ở trạng thái nghỉ **trùng ảnh hiện tại**. Cảnh báo đã biết, chép từ
  `chieu-sau` §5 bước 1 vì nó vẫn đúng: `skyDim` hiện nhân vào **độ mờ từng phần tử**, còn
  `opacity` của CSS **làm phẳng rồi mới mờ** — hai phép chỉ bằng nhau khi nét không chồng
  nhau. Phải dựng cả hai và so.
- **Sửa quá 4 ca test ⇒ phép tách đang làm nhiều hơn phần việc của nó, dừng.**
- Đo **LCP trước và sau trên cùng một máy, ghi cả hai con số vào mô tả commit** — `next
  build` không có trong bảng mốc nền của AGENTS.md vì chưa ai đo nó thành một con số ổn
  định, tức hôm nay **không ai đang canh LCP**. Tách 12 tấm thành 11 mà không thêm phép đo
  ấy là tự gỡ một thứ chưa từng được gắn (`chieu-sau` §6.1).

### Bước 4 · Phóng vào một chòm — 6.3 (+ 6.5 nếu còn hơi)

**Vì sao đây là bước có cảm giác lớn nhất mà lại không đứng đầu:** vì nó đòi bước 3, nó
đòi một quyết định về URL/route, và nó mang **rủi ro hiệu năng thật duy nhất** trong cả
danh sách (dựng lại raster của năm tấm phủ kín khung khi `scale`).

**Đi tiếp hay dừng:**
- Khung hình trong lúc phóng, đo DevTools **có CPU chậm 4×** (cùng cách `figure-motion.ts`
  đo, để hai con số so được với nhau): **không khung nào quá 16,7 ms**. Quá ⇒ hạ `S`, hoặc
  phóng chỉ tấm chòm còn trời đứng (mất một phần thị sai, giữ được cả hai tỉ lệ).
- `reduce` ⇒ nhảy thẳng tới trạng thái đã phóng, **không tween**, và trạng thái đó đọc được
  trọn vẹn.
- Nút Back của trình duyệt lùi ra khỏi chòm. Không thì trạng thái đang nằm sai chỗ.
- **Phép thử nhận dạng của `ban-do-sao.md` §20 không tụt điểm.** Nếu phóng làm người xem
  khó nhận ra hình chòm hơn, nó là trang trí và phải gỡ.

### Bước 5 · (Tuỳ chọn) Lấp lánh ở chân trời — 6.6; rồi parallax — 6.8

Chỉ làm **sau khi** bốn bước trên đã đạt **và** lúc đó vẫn còn thấy thiếu. Thứ tự trong
bước này là 6.6 trước 6.8, vì 6.6 có một cái neo vật lý (khí quyển dày ở chân trời) còn
6.8 thì không có gì ngoài "đẹp".

**Đi tiếp hay dừng:** hai phép thử, cả hai đều tự huỷ.
- 6.6: hạ biên độ tới khi chỉ thấy *"nếu thật sự để ý"* **[nguồn]**. Và tổng thời lượng
  **≤ 5 000 ms, không `infinite`** — nếu không thì phải làm nút Dừng, và lúc đó giá đã vượt
  giá trị.
- 6.8: ba người, hai bản, không nói trước. **Không ai nêu ra được chuyển động ấy ⇒ gỡ.**

---

## 9 · Bốn chỗ sẽ hỏng, và cả bốn hỏng lặng lẽ

1. **48 toạ độ chép ra HTML là 48 con số sẽ lệch.** 6.2 đặt 48 `<span>` lên đúng chỗ 48
   ngôi vẽ trong SVG. Nếu toạ độ ấy không do `build_sky.py --css` **in ra** thì lần sau đổi
   hình chòm là 48 chỗ bấm trôi khỏi 48 ngôi — và **ca test vẫn xanh**, vì nó so hộp với
   **tệp SVG** chứ không với thứ đang hiện trên màn (`chieu-sau` §6.2). Đúng bài học
   `MAP_ABYSS` của AGENTS.md, nhân lên 48 lần.
2. **Vùng bấm hiện có tính bằng % của khung; phóng 2,6× làm chúng đi, lớp hover ở lại** —
   trừ khi vùng bấm nằm **trong cùng phần tử bọc** được phóng. Một biến CSS, không hai con
   số ở hai chỗ.
3. **Bước 3 nhân đôi số tệp phải khớp nhau giữa hai hồ sơ sáng/tối.** `ban-do-sao.md` §19
   bắt bản sáng và bản tối giống hệt **sai số 0** ở 9 thứ, trong đó có vị trí nhãn. Mười một
   tấm × hai hồ sơ = **22 tệp**. Không có một ca test so **ảnh tổng hợp** thì không có gì
   phân biệt "tách đúng" với "tách lệch".
4. **Luật "đừng thêm `id`/`data-*` vào SVG" sắp mất tính tự-thi-hành.** Hôm nay nó tự giữ
   mình vì không selector nào với vào trong `<img>` được. Sau bước 1, người sửa tiếp theo
   sẽ muốn chuyển động **bên trong** một chòm (ngôi gần dịch khác ngôi xa), tức muốn đặt
   `id`. Lúc ấy chỉ còn **một ca test** đứng chắn — và `chieu-sau` §6.2 đã nêu đúng điều
   này. Ca test đó vừa đổi vai từ *ghi lại một sự thật* thành **giữ một luật**; phải viết
   lại chú thích của nó cho đúng vai mới.

---

## 10 · Cách đo lại mọi con số [đo] trong tài liệu này

- **Byte từng tệp và brotli:** `node` + `zlib.brotliCompressSync` trên
  `frontend/public/map/star/*.svg`; so với brotli của **một luồng nối cả 12 tệp** để lấy
  phần trùng lặp xuyên tệp.
- **Byte từng lớp trong một tấm:** cắt theo `<g data-lop="…">…</g>` (regex dotAll) rồi đếm
  byte UTF-8.
- **Độ khác nhau giữa hai tấm chòm:** so từng ký tự giữa `sky-chom-M1.svg` và
  `sky-chom-M2.svg`.
- **Điểm sáng nhất trong tranh:** lấy mọi `#RRGGBB` trong `sky-troi.svg`, tuyến tính hoá
  sRGB (`c ≤ 0,04045 ? c/12,92 : ((c+0,055)/1,055)^2,4`), `L = 0,2126R + 0,7152G +
  0,0722B`, sắp giảm.
- **Bán kính sao:** `grep -o 'r="[0-9.]*"'` trên `sky-chom-nghi.svg` và `sky-sao-nen.svg`.
- **Bề rộng vệt loé:** cộng dồn các đoạn tương đối trong `d=` của lớp `loe-ngang`. **Cảnh
  báo:** bộ đọc đường dẫn mình viết hôm nay **sai** với các `d` nhiều đoạn con có `M` tuyệt
  đối giữa đường — nên con số ~367 px cho `loe-ngang` (một đoạn con) dùng được, còn mọi bao
  hình của `nguon-sang`/`tinh-van`/`quang-sao` thì **không đo được bằng cách này** và không
  được ghi vào tài liệu này.
- **Số ca test:** `grep -c "test('"` trên `frontend/e2e/unit/star-map.test.mjs`.
- **Token thời lượng:** `frontend/public/static/css/studio-tokens.css` dòng 146–148.
- **[đo-kho]:** phép đo DevTools không chạy lại được ở đây (không có trình duyệt trong môi
  trường này); mọi con số nhãn `[đo-kho]` dẫn tới chú thích đầu
  `frontend/src/lib/figure-motion.ts`, ghi ngày 14/10/2026.

---

## 11 · Nguồn

**Bảy bản đồ (§2):**
- Wikipedia, *Opus: Echo of Starsong* — vòng ngắm trên bản đồ nhìn-từ-trên; nhiên liệu;
  *"Some locations, such as lumen caves, are hidden until players find its starsong"*.
  <https://en.wikipedia.org/wiki/Opus:_Echo_of_Starsong>
- TheGamer, *Tips And Tricks For Beginners Playing Opus: Echo Of Starsong* — tầm bay, ghé
  giữa đường, nạp nhiên liệu ở trading post.
  <https://www.thegamer.com/opus-echo-of-starsong-beginner-tips-tricks-guide/>
- RPGFan, bài đánh giá — *"you select a signal, move your cursor there, press a button to
  analyse it and then press the same button to make the trip"*.
  <https://www.rpgfan.com/review/opus-echo-of-starsong/>
- Adrian Hon, *Have You Played?* — *"an exercise in navigating an interface"*; *"a brilliant
  exercise in building a believable world with a strong visual identity from scratch"*.
  <https://adrianhon.substack.com/p/opus-echo-of-starsong>
- Nintendo store, *OPUS: Echo of Starsong – Full Bloom Edition* — *"Find the fabled
  asteroids by listening for the right sound on the star map"*.
  <https://www.nintendo.com/us/store/products/opus-echo-of-starsong-full-bloom-edition-switch/>
- Neoseeker, walkthrough chương 2–3 — máy quét cộng hưởng với tiếng hát của hang, trò nhỏ
  gióng vệt sáng với giọng. <https://www.neoseeker.com/opus-echo-of-starsong/walkthrough/Chapter_2>
- Outer Wilds wiki, *Computer* — Map Mode xếp theo nơi, Rumor Mode xếp theo liên quan; đặt
  waypoint lên HUD; layout Rumor Mode khác nhau theo người chơi.
  <https://outerwilds.fandom.com/wiki/Computer>
- Ankit Passi, *UX Critique: The Outer Wilds* (SUPERJUMP) — *"maintains a high mystery"*;
  Map Mode là chỗ chọn đích.
  <https://medium.com/super-jump/outer-wilds-a-ux-critique-part-2-146abcb9a5a1>
- ĐH Iowa, *Resources: Stellarium Web*; UWA *Stellarium quick guide* — kéo để quay hướng
  nhìn, lăn/hai ngón để phóng (đổi FOV), chuột trái chọn / phải bỏ chọn, mũi tên bàn phím.
  <https://itu.physics.uiowa.edu/node/776> ·
  <https://www.uwa.edu.au/study/-/media/faculties/science/docs/stellarium-quick-guide.pdf>
- Ludo.guide, *Map Generation and Branching — Slay the Spire* — chỉ đi được tới node nối
  trực tiếp; biểu tượng loại phòng.
  <https://www.ludo.guide/guide/slay-the-spire/pathing-risk-assessment/map-generation-and-branching>
- Bazzaz & Cooper (2025), *Analysis of Uncertainty in Procedural Maps in Slay the Spire* —
  20 000 lượt chơi; bản đồ giao quyền điều chỉnh độ khó; lượt thắng gắn với entropy chuẩn
  hoá cao hơn. <https://arxiv.org/html/2504.03918v1>
- Thảo luận Steam, *Slay the Spire* — *"a huge part of the decision making is just... pure
  luck"*. <https://steamcommunity.com/app/646570/discussions/0/1752400068282195356>
- Shacknews, *Door symbol meanings (Hades)*; PCInvasion, *All Hades 2 door icons explained*
  — biểu tượng cửa = phần thưởng phòng sau; đầu lâu = elite/miniboss, phẩm cấp cao hơn.
  <https://shacknews.com/article/122186/door-symbol-meanings-hades> ·
  <https://www.pcinvasion.com/all-hades-2-door-icons-explained/>
- Windows Central, *Elden Ring: All Map Fragment locations* — *"the fog covering it on the
  map will begin to clear up"*.
  <https://www.windowscentral.com/elden-ring-all-map-fragment-locations>
- Inverse, *Where to find all 20 map fragments in Elden Ring* — chưa có mảnh mà đi đủ thì
  địa điểm hiện ra như một cột sáng nhỏ. <https://www.inverse.com/gaming/elden-ring-map-fragments>
- Riot Games Support, *Explore Runeterra FAQ* — dựng bằng WebGL; hiệu năng *"heavily
  dependent on your internet connection, browser settings, and phone specs"*.
  <https://support-leagueoflegends.riotgames.com/hc/en-us/articles/360001672968-Explore-Runeterra-FAQ>
- Tyler LaHaie, *Mapping the world of Runeterra for 100m fans* — *"The camera choreography
  and rich animations fill the whole map"*; *"For the first time, every piece of art had a
  place in the world of Runeterra"*; bấm vào một vùng mở champion/địa danh/truyện.
  <https://www.tylerlahaie.com/content/mapping-the-world-of-runeterra-for-100m-fans>
- We Are Royale, *Riot Runeterra Map Teaser* — ý mép năng lượng phát sáng *"burn"* bản đồ
  hiện ra đã bị hạ xuống vì *"too distracting to the map itself"*.
  <https://weareroyale.com/case-studies/runeterra-map-teaser/>
- Craig Parkinson / portfolio bản 2018 — React + WebGL, image tiling, height map động,
  shader riêng. <https://craig-parkinson.com/project/runeterra>

**Chuyển động nền, sống hay nhiễu (§4.2):**
- Andy Clarke, *Ambient Animations In Web Design: Principles And Implementation* (Smashing,
  09/2025) — *"subtle, slow-moving details that add atmosphere without stealing the show"*;
  *"Ambient animations aren't about signalling to someone where they should look; they're
  about creating a mood"*; số thật: 3–6 s, ±3°, 20 px, ±2°; đổi *"rhythm, tone, and
  timing"*; *"Sudden resets break the mood"*; bọc trong
  `@media (prefers-reduced-motion: no-preference)`; `aria-hidden="true"` cho SVG trang trí;
  filter mờ và đổ bóng *"tax lower-powered devices"*.
  <https://www.smashingmagazine.com/2025/09/ambient-animations-web-design-principles-implementation/>
- MoCap Online, *Idle Animation for Games: Design Guide* — idle tốt nhất *"nearly
  invisible"*; biên độ thở ~1–2 cm; tư thế đứng tĩnh đọc ra "tượng đá".
  <https://mocaponline.com/blogs/mocap-news/idle-animation-game-dev-guide>
- Genius Crate, *The Science of Idle Animations* — chuyển động thừa giành chú ý, thiếu thì
  đọc ra vô hồn. <https://www.geniuscrate.com/the-science-of-idle-animations-and-why-they-matter-in-modern-games>
- Game Developer, *What makes a great idle animation? Devs share their favorites*.
  <https://www.gamedeveloper.com/art/what-makes-a-great-idle-animation-devs-share-their-favorites>

**SVG nhúng dạng ảnh (§4.3):**
- MDN, *SVG as an image* — bốn hạn chế, gồm *"JavaScript is disabled"* và *"External
  resources … cannot be loaded"*; các hạn chế ấy **không** áp dụng cho `<iframe>`/`<object>`
  /`<embed>`. **MDN KHÔNG nói gì về animation CSS/SMIL** — khoảng trống ấy là lý do §4.3
  phải dựa vào phép đo trong kho.
  <https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image>
- Smashing Magazine, *Timing Charts: A Blueprint For SMIL Animations* — *"Any embedded
  JavaScript unfortunately won't run if you load an SVG file with an `img` tag, but CSS
  animations work perfectly fine"*; SMIL cũng chạy trong `<img>`.
  <https://www.smashingmagazine.com/2026/08/timing-charts-blueprint-smil-animations/>
- CSS-Tricks, *A Guide to SVG Animations (SMIL)* — *"SMIL animations embedded in the SVG are
  **not affected by `prefers-reduced-motion`**"*. <https://css-tricks.com/guide-svg-animations-smil/>
- web.dev (Paul Lewis), *Stick to Compositor-Only Properties and Manage Layer Count* —
  `transform` và `opacity` là hai thuộc tính duy nhất compositor lo được; lớp tốn bộ nhớ,
  đừng thăng cấp bừa.
  <https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count>

**Thị sai và chiều sâu (§5):**
- Wikipedia, *Kinetic depth effect* — *"the three-dimensional structural form of an object
  can be perceived when the object is moving"*; Wallach & O'Connell với bóng 2D của khung
  dây quay. <https://en.wikipedia.org/wiki/Kinetic_depth_effect>
- ScienceDirect, *The contributions of pictorial, motion, and binocular cues to the
  perception of depth and distance* — Cutting & Vishton mô hình hoá độ nhạy thị sai chuyển
  động cao hơn chênh lệch hai mắt **ở khoảng gần**; thứ tự tín hiệu trong vùng với-tay-tới.
  <https://www.sciencedirect.com/science/article/pii/S0042698925001142>
- NASA, *Depth Perception, Cueing, and Control* — các tín hiệu này hiệu lực nhất trong
  Personal/Action Space, *"up to 10 meters"*; tín hiệu được **kết hợp** chứ không chọn một
  cái trội. <https://ntrs.nasa.gov/api/citations/20180007277/downloads/20180007277.pdf>
- *Depth perception in driving simulators* (DiVA) — chênh lệch hai mắt chạy trong khoảng
  ~30 m. <https://www.diva-portal.org/smash/get/diva2:648964/FULLTEXT01.pdf>
- *Kinetic Depth Images* (UC Irvine) — mô hình gán độ sâu **tỉ lệ với tốc độ cục bộ**.
  <https://ics.uci.edu/~majumder/vispercep/KDIPrePrint.pdf>

**Con trỏ tự vẽ (§6.1):**
- 21st.dev, *Custom cursor in React* — con trỏ hệ điều hành là cái tôn trọng cỡ phóng to,
  tương phản cao, "lắc để tìm" của macOS; chỉ đặt `cursor: none` sau khi lớp theo sau đã
  mount và xác nhận chạy; trả lại con trỏ thật ở chỗ cần ngắm chính xác; `pointer-events:
  none` để không ăn mất cú bấm. <https://21st.dev/blog/custom-cursor-react>

**Trong kho:**
- `design/v3/ban-do-sao.md` — §1 (không khoá chặng), §3.2 (bảy tín hiệu chiều sâu; dải khí
  dày ở chân trời), §3.3 (lưới kinh–vĩ cong, vệt loé), §4 (50 nét + mạch hoàng đạo), §6.1
  (bán kính = số ca chấm), §8 (đặt nhãn hoặc trượt build), §19 (hai hồ sơ, sai số 0), §20
  (phép thử nhận dạng).
- `design/v3/chieu-sau-tuong-tac.md` — §1 (tự chạy khác do người dùng; điều kiện (c)), §2.5
  (thị sai là tín hiệu duy nhất tranh phẳng không có), §3.1 (ghi biến CSS; lưới `:hover` bị
  loại; lề tràn +6,6%), §3.2 (bác phép xoay keystone), §3.3 (three.js 122 kB, 17/23 ca),
  §5 (bốn bước, ngưỡng "sửa quá 4 ca"), §6.1 (LCP), §6.2 (vùng bấm trôi), §6.3 (lề tràn và
  lệch 16 px).
- `frontend/src/lib/figure-motion.ts` — **phép đo quyết định cả tài liệu này**: animation
  CSS trong SVG nhúng dạng ảnh không composited; 2 007 ms / 19% main thread cho hai hình;
  ra khỏi màn hình không rẻ hơn; `<object>` bị CSP chặn, `<iframe>` phải sửa kích thước,
  nên phải đổi `src` sang Blob.
- `frontend/src/lib/map-motion.ts` — commit `5b3d282` gỡ năm hiệu ứng tự chạy (−964 dòng);
  `MAX_AUTO_MOTION_MS = 5000` và vì sao nó từng tồn tại.
- `frontend/src/app/ban-do-sao/star-map.module.css` — năm luật, trong đó luật 2 (ranh giới
  "không với vào TRONG tài liệu SVG, nhưng với được cái thẻ chứa nó") và luật 3 (*"không
  parallax theo chuột"*).
- `frontend/src/app/ban-do-sao/page.tsx` — luật 1 (**không gọi API ở trang công khai**) và
  câu hỏi của chủ sản phẩm *"chòm này kết nối với các chòm khác như nào?"*.
- `frontend/src/lib/use-reduced-motion.ts` — một chỗ duy nhất đọc `prefers-reduced-motion`
  cho phần React, và vì sao phải theo dõi `change` chứ không đọc một lần.
- `AGENTS.md` — bẫy "`<img>` là tài liệu SVG RIÊNG, bị cách ly"; bài học `MAP_ABYSS`; luật
  "test phải chứng minh được là nó bắt lỗi".

---

## 12 · Thứ KHÔNG tra ra được, nói thẳng

1. **Không tìm được một video phân tích gameplay nào của màn bản đồ sao Starsong**, cũng
   không tìm được bài phân tích mỹ thuật/phỏng vấn hoạ sĩ nào (xác nhận lại đúng điều
   `ban-do-sao.md` §17 và `chieu-sau` §2.1 đã ghi). Toàn bộ §2.1 dựng từ **mô tả cơ chế**
   trong Wikipedia, trang bán của Nintendo, hướng dẫn TheGamer/Neoseeker và hai bài đánh
   giá. Nếu artbook bản tiếng Anh ra và nói ngược lại, §2.1 phải viết lại — nhưng §2.8
   (ba thứ có ở cả bảy bản đồ) thì không đổi, vì nó không dựa vào một bản đồ nào.
2. **Không có nguồn cho trọng số thị sai chuyển động ở KHÔNG GIAN XA** (quá ~30 m). Tra
   được thứ tự tín hiệu ở vùng gần và các giới hạn ~10 m / ~30 m, không tra được phần xa.
   Nên §5.2 giữ nhãn **[phán đoán có cơ sở]** đúng như `chieu-sau` §9 điều 5 đã làm, và
   lập luận của §5.3 **không dựa vào** mảnh thiếu đó: nó dựa vào liều, vào điểm dừng, và
   vào việc chuyển cảnh để lại một trạng thái đọc được.
3. **Không tìm được nghiên cứu có kiểm soát** nào về việc người xem cảm nhận chuyển động
   nền thế nào, cũng không có hướng dẫn chuẩn về biên độ. Mọi con số ở §4.2 và §6.6 là
   **thực hành được ghi lại** (Clarke, MoCap Online), không phải chuẩn. Phép thử cuối cùng
   vẫn phải là xem bằng mắt — và đó là lý do mỗi bước ở §8 có một phép thử người thật.
4. **Không chạy lại được phép đo DevTools trong môi trường này** (không có trình duyệt).
   Con số 2 007 ms / 19% / 103 lượt tính style mỗi giây là **[đo-kho]**, chép từ chú thích
   `figure-motion.ts` ngày 14/10/2026 — hai hình, không phải mười hai tấm. Ước lượng cho
   mười hai tấm là **[phán đoán]**, và cấu trúc của nó ("không composited, không rẻ hơn khi
   ra khỏi màn hình") thì đã đủ để quyết mà không cần một con số mới.
5. **Bộ đọc đường dẫn SVG mình viết hôm nay sai** với `d` nhiều đoạn con (xem §10), nên
   mọi bao hình của `nguon-sang`, `tinh-van`, `quang-sao` **không** có trong tài liệu này.
   Con số duy nhất lấy từ hình học là bề rộng vệt loé `loe-ngang` ~367 px. Tỉ lệ
   vật-lớn-nhất : sao-nhỏ-nhất mà `chieu-sau` §5 bước 3 đặt mốc ≥ 15 : 1 vì vậy **chưa được
   kiểm lại ở đây** — phải đo bằng một bộ đọc đường dẫn đúng trước khi khẳng định bước 3
   của bản đó đã đạt.
