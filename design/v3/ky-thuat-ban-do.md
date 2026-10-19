# Kỹ thuật vẽ bản đồ — phác lại từ hai bản tham chiếu, rồi rút ra luật để sinh

Ngày 19/10/2026. Viết trước khi vẽ lại bản đồ thế giới (`scripts/map/build_map.py`),
sau khi chủ sản phẩm bác hai bản trước bằng đúng bốn chữ: **"xấu và trẻ con"**.

Hai bản tham chiếu đọc kỹ: bản đồ Vực Thẳm của *Made in Abyss* và bản đồ Runeterra
(`design/tham-chieu/*.png`, KHÔNG commit — tài sản của người khác, chỉ để xem).

> Ranh giới của tài liệu này: rút **KỸ THUẬT**, không rút **TÀI SẢN**. Không một hình
> dáng, bố cục, tên vùng, biểu tượng hay khung viền nào của hai bản kia được chép.
> Công trình của mình là công trình của mình.

---

## 1 · Chẩn đoán bản hỏng — sáu điểm, và điểm nào là gốc

| # | Triệu chứng của bản bị bác | Gốc kỹ thuật |
|---|---|---|
| 1 | Mảng phẳng tô gradient | Hai bản tham chiếu là **tranh nét**; màu chỉ là lớp phủ DƯỚI mực |
| 2 | Không kỹ thuật bản đồ nào | Thiếu hachure, bình độ, chấm lấm tấm, nét sóng, nét chéo chồng |
| 3 | Thưa thớt | Vài chục `<path>` viết tay không thể ra mật độ của hàng chục nghìn nét |
| 4 | Không bộ máy chú giải | Thiếu khung, thước, đường dẫn tới nhãn, vòng phóng to |
| 5 | Chữ phông sans của giao diện | Chữ bản đồ là chữ có chân, giãn nhẹ |
| 6 | Nền phẳng | Thiếu vân giấy cũ |

Điểm 1 và 3 là **cùng một điểm**: không ai viết tay nổi 50 000 nét, nên bản viết tay
buộc phải tô mảng, nên nó buộc phải phẳng. Đó là lý do bản này là một **script sinh**
chứ không phải một file SVG vẽ tay — mọi điểm còn lại chỉ sửa được sau khi sửa điểm đó.

---

## 2 · Made in Abyss — mặt cắt dọc kể chuyện bằng tầng

**Dựng địa hình.** Một trục dọc duy nhất xuyên suốt; mọi thứ treo vào trục đó. Vách đá
là **nét dọc song song dài ngắn khác nhau** (hachure), dày lên ở chỗ dốc đứng. Chỗ
hẫng và trần hang dùng **nét chéo chồng hai lượt**. Rừng là **cụm chấm** có vài bóng
cây nhỏ nhô ra khỏi mép, mép rừng để hở chứ không khép viền. Nước đổ là **nét dọc rất
mảnh, rất dài**, gần như không ngắt.

**Mật độ theo độ sâu.** Càng xuống dưới nét càng dày và càng đậm; tầng trên để nhiều
giấy trắng. Mật độ chính là chiều sâu — không có lớp mờ nào.

**Màu.** Nền giấy ố nâu chiếm ưu thế tuyệt đối. Màu là **nước loang mỏng DƯỚI nét**:
lục nhạt ở trên, lam ngọc ở tầng giữa, hồng/đỏ ở tầng sáu, nâu ở đáy. Không mảng nào
được tô kín; nét mực luôn đọc được xuyên qua màu.

**Bộ máy chú giải** — chỗ bản của mình thiếu nhiều nhất:
- **thang độ sâu theo mét** chạy dọc lề trái, vạch nhỏ đều, vạch lớn ở mỗi mép tầng;
- **nhãn trong khung**, nối tới địa danh bằng **đường dẫn mảnh**;
- **vòng tròn phóng to**: một vòng kép, bên trong vẽ lại chi tiết ở tỉ lệ lớn hơn, có
  đường dẫn về đúng chỗ bị soi;
- chữ viết tay bên lề, ken đặc hai mép giấy.

**Mình lấy gì, bỏ gì.** Lấy: mặt cắt theo tầng, thang đo ở lề, đường dẫn tới nhãn,
vòng phóng to, mật độ đổi theo độ sâu, màu là lớp phủ dưới mực. **Bỏ: mọi con số trên
thang đo.** Bản đồ này không biết một con số nào về chiều sâu, mà `AGENTS.md` cấm số
bịa — nên thước ở lề phải chỉ có vạch, không có số. Bỏ luôn chữ bên lề: `quyet-dinh.md`
mục 1 chốt "cốt truyện chỉ bằng hình".

---

## 3 · Runeterra — phân vùng bằng ĐỊA HÌNH, không bằng màu

**Góc nhìn.** Từ trên chếch xuống, đất co ngắn dần về phía xa.

**Núi.** Mỗi dãy là một **đường sống lượn** vẽ trước; sườn bám theo sống, **dốc ở gần
đỉnh rồi thoải dần xuống chân** (nên đỉnh ra sắc, không ra tam giác). **Nguồn sáng ở
trên-trái**, sườn phải luôn tối — đảo ngược là địa hình lộn ngược (*pseudoscopic
inversion*), đây là luật chứ không phải sở thích. Bóng nặng nhất **ngay dưới sống**,
và vài đỉnh bắt sáng ngay trên chính sườn tối.

**Rừng.** Cụm tròn cho cây lá rộng, nét nhọn cho cây lá kim; kích thước cây phải khác
nhau, và rừng **chảy vòng quanh chân núi** chứ không cắt ngang.

**Nước.** Biển rất tối. Quanh bờ là **nét vọng** (*coastal vignette*): nét gần bờ sát
nhau và bám theo từng chi tiết của bờ, ra xa thì **khoảng cách tăng dần theo cấp số
nhân** và nét chỉ còn bám theo hình lớn. Luôn **chừa một khe trắng** giữa đường bờ và
nét nước đầu tiên. Khoảng cách ĐỀU là thứ tố cáo máy vẽ ngay.

**Phân vùng.** Sa mạc, đầm lầy, đỉnh tuyết, cao nguyên đá — phân biệt bằng **địa hình
và kết cấu**, màu chỉ xác nhận. Người mù màu vẫn tách được các vùng.

**Bộ máy chú giải.** Khung góc chạm trổ, hoa gió lớn với N/S, khuôn tên ở góc, tên
vùng viết giãn chữ uốn theo hình đất.

**Mình lấy gì, bỏ gì.** Lấy: luật nguồn sáng trên-trái, sống núi vẽ trước rồi mới có
sườn, nét vọng quanh nước với khoảng cách tăng dần, phân vùng bằng hình chứ không bằng
màu, khung có hoa thị bốn góc. **Bỏ hoa gió** — bản đồ này là mặt cắt dọc, một hoa gió
ở đây là đồ trang trí nói dối; thay bằng **thước độ sâu** ở lề phải.

---

## 4 · Luật đem vào script, kèm con số

Mỗi dòng dưới đây có một chỗ thực thi trong `scripts/map/build_map.py`.

**Hachure (Lehmann / Imhof).** Nét chạy **xuôi dốc**. Luật phản trực giác và phải nhớ:
**dốc ⇒ nét NGẮN và ĐẬM; thoải ⇒ nét DÀI và MẢNH** (độ dài nét = khoảng cách giữa hai
đường bình độ, mà chỗ dốc thì bình độ sát nhau). Độ dày đi theo **bậc rời rạc** (Lehmann
có 8 bậc), không phải thang liên tục. **Dưới một độ dốc tối thiểu thì không vẽ gì.** Độ
dài lấy **0,85–1,20 lần bước lưới** ("nét sát nhau nhưng hiếm khi chạm nhau"). Mỗi hàng
**lệch pha** so với hàng trên, không thì ra hình chiếc lược. Ngưỡng bỏ nét được cho
**nhiễu** ⇒ mép trường hachure lỗ chỗ như tay đặt. → `ridge_hachure`, `hatch_rect`.

**Đường bình độ.** Bình độ cái đậm gấp đôi bình độ con. Khoảng cách giữa hai đường LÀ
tín hiệu độ dốc — không có đường lùi nào. → `contour_field`.

**Chấm lấm tấm.** Sắc độ do **mật độ**; cỡ chấm chỉ là điều chỉnh phụ và biên độ của
người vẽ tay đo được là **đúng hai lần** (chấm to nhất gấp đôi chấm nhỏ nhất). Phân bố
phải là **nhiễu xanh** — ngẫu nhiên thuần thì vón cục, lưới thì ra hoa văn vải. Biên độ
đẩy chấm **co lại theo mật độ**: chỗ tối đẩy ít, chỗ sáng đẩy nhiều. → `stipple_rect`.

**Nét chéo chồng.** Ba lượt **{a, a+90, a+45}**, mỗi lượt lệch thêm vài độ và lệch pha,
vì ba lượt đúng góc tròn thì chỗ giao nhau xếp thành lưới và ra moiré. Bóng trên đá có
**mép cứng**, bóng trên đất mềm có mép tãi. → `shade_face`.

**Góc nét không được tròn.** `−41°`, không `−45°`: góc tròn trùng lưới điểm ảnh và
trùng lượt nét thứ hai. Bước nét ≈ **4 lần bề rộng nét**; nét tô bằng **nửa** bề rộng
nét viền. → `hatch_rect`, `brick`.

**Trời khắc.** Trường nét ngang đứt quãng; sắc độ là mật độ và bề rộng nét, **không có
chuyển sắc nào**. Quầng sáng làm bằng cách **bỏ nét** quanh nguồn sáng, với mép vùng bỏ
được cho nhiễu để nó không ra hình tròn. → `draw_sky`.

**Nước.** Nét sóng **giữ phương ngang**, dao động DỌC THEO chiều dài nét; gần bờ liền,
ra xa **vỡ thành đoạn ngắn hơn và thưa hơn**; khoảng cách tăng theo cấp số nhân. →
`scene_M4`, `scene_M8`.

**Giấy cũ.** Hai loại vết tách bạch: **đốm rỉ mép cứng** và **vệt ố mờ mép nhoè**. Mật
độ đốm **tăng về phía mép giấy** (mao dẫn kéo ẩm ra biên) — nên viền tối của bức vẽ có
sẵn từ chính luật đó chứ không phải một hiệu ứng riêng. → `draw_paper`.

**Nét vẽ tay.** Ba tham số: tần số, biên độ, nhiễu tần số. Tâm mỗi nét xê dịch trong
**±nửa bước lưới** — đủ phá hình chiếc lược, bị chặn nên hai nét không đổi chỗ cho nhau.
Nét **ngắn thì vẽ thẳng**: khúc cong của một nét 7 đơn vị nhỏ hơn bề rộng ngòi. →
`seg_d`, `wobble`.

**Phối cảnh không khí.** Dãy càng xa thì nét càng **nhạt và thưa**. Mật độ nét chính là
chiều sâu, không phải một lớp mờ phủ lên. → `draw_far_ranges`.

---

## 6 · MỘT CÁI VỰC LIỀN MẠCH — chữa "chưa có sự liên kết giữa các màn" (19/10/2026)

Bản sau lần dựng đầu được nhận là khá hơn hẳn, kèm đúng **một** khuyết điểm:
*"chưa có sự liên kết giữa các màn"*. Chẩn đoán kỹ thuật, viết ra được bằng hình học:
`vault()` vẽ mỗi gian bằng **một đường khép kín** (22 đỉnh, `close=True`) thả vào bốn
dải đá chạy ngang hết khung. Tám đường khép kín là tám vật thể rời; mắt gom theo luật
**khép kín** (closure) nên nó đọc ra tám cái hốc, dù chúng nằm trong cùng một mảng màu.

### 6.1 · Mười luật đã đem vào script

| # | Luật | Chỗ thực thi |
|---|---|---|
| 1 | Khối đá là **một hình có LỖ**, tô bằng `fill-rule="evenodd"`: vòng ngoài + vòng lòng vực trong CÙNG một `<path>` | `Ink.fill_rule`, `draw_rock_mass` |
| 2 | Vách vực là **một polyline liên tục** mỗi bên, ảnh của một hàm liên tục của độ sâu | `Vuc.shaft_half` (nội suy cosin), `Vuc.wall`, `draw_vach` |
| 3 | Gian là **bướu của chính đường vách ấy** (`sin(pi t)^0.35`, bằng 0 ở hai đầu), không phải hình riêng | `Vuc.bump`, `Vuc.alcoves` |
| 4 | Phía hốc mở ra lòng vực **không có nét viền** — ở đó không có đá | `vault()` mục 2 |
| 5 | Cắt bổ chỉ cắt **một phần**: chừa gờ đá che mép trên mỗi hốc | `vault()` mục 3 |
| 6 | **Một** trường nét cho cả khối đá: một góc (−41°), một pha, một hàm sắc độ theo độ sâu | `da_tone`, `draw_rock_mass` |
| 7 | Góc gạch chỉ đổi ở **ranh giới vật liệu thật**, và ranh giới ấy chạy **hết bề rộng** | vạch tầng trong `draw_gauge` |
| 8 | Khoảng **RỖNG phải THƯA NÉT** — lòng vực gạch thưa gấp đôi và nhạt một nửa so với đá | `draw_vach_sau` |
| 9 | Nét **vắt qua ranh giới** khâu hai bên lại: khe nứt xuyên tầng, rễ cây thò qua mép vực, năm sợi cáp xuyên cả bốn tầng | `draw_rock_mass` (`da-nut`), `draw_surface`, `draw_wells` |
| 10 | Một dòng **nước** và một **nêm sáng** duy nhất chạy suốt từ miệng xuống đáy | `draw_nuoc`, `draw_tia_sang` |

Hai luật nữa, học được bằng cách làm hỏng trước:

- **Gian phải NHỎ so với cái hố.** Lần dựng đầu cho mỗi gian chiếm 0,72 bề rộng hốc và
  gần trọn chiều cao; bảy cái vòm to bằng nhau xếp thành hàng, và mắt lại đọc ra bảy
  căn phòng. Nay mỗi gian 14–17% bề rộng khung (`GIAN_SIZE`).
- **Bảy cái khung giống hệt nhau cũng là "tám hốc rời" ở dạng khác** (luật tương tự:
  mắt gom những hình giống nhau). Ba kiểu khung theo cái gian ấy LÀ GÌ: `cuon` (vòm
  xây — M1, M4), `lanh` (lanh-tô phẳng — M2, M3, M6), `khe` (khe đá tự nhiên, không có
  gì xây — M5, M7, M8). Bảng ở `VAULT_KIND`.

### 6.2 · Thang độ sâu hai lề — bộ máy chú giải

Dựng theo **quy ước mặt cắt địa chất**, không phải chép bản tham chiếu (ghi chú trung
thực ở 6.4):

- trục dọc ở **cả hai lề** (`GAUGE_X = (46, W − 46)`), vạch nhỏ đều 11 đơn vị;
- tại mỗi **mốc tầng**, một vạch lớn hai đầu + một nét đứt `7 6` chạy **từ lề trái sang
  lề phải**, cắt qua cả đá lẫn lòng vực. Đường đi xuyên phía sau một cái gian là bằng
  chứng hình học rằng gian ấy nằm trong một thể liên tục;
- **đường dẫn nét đứt `5 5`** từ lề gần hơn tới từng gian, **dừng trước** khi chạm gian
  (quy ước bản đồ hang: nét của phần nằm dưới dừng trước nét của phần nằm trên, để chỗ
  giao nhau đọc ra là CHE KHUẤT — `interposition`, một trong các tín hiệu hình–nền mạnh
  nhất);
- **không một con số nào**: script không biết một con số nào về chiều sâu, và số bịa
  còn tệ hơn không có thước (mục 5 ở trên).

Hai **mực nước cổ** (`draw_muc_nuoc`, nét đứt `9 7` ở độ sâu 508 và 716) chạy hết bề
rộng. Không phải trang trí: thuỷ văn karst coi mực nước ngầm là **một mặt duy nhất**
chia đới thoáng khí với đới bão hoà, và hang hình thành theo từng tầng ứng với các mực
nước cũ khi mực nước hạ dần. Một đường thuộc về cả khối đá buộc mọi gian nó cắt qua vào
cùng một hệ — đúng thứ "liên kết giữa các màn" đang thiếu. Nó giải thích luôn hình
dáng: **trên** đường thì lòng vực hẹp và thẳng theo khe nứt (đới thoáng khí), **dưới**
thì tròn và rộng hơn cao (đới bão hoà).

### 6.3 · HỢP ĐỒNG VỚI LỚP CHUYỂN ĐỘNG — là TOẠ ĐỘ, không phải `id`

Bản đầu của mục này liệt kê một bảng `id`/`data-*` gắn vào SVG cho lớp chuyển động bám
vào. **Bảng đó sai, và đã gỡ khỏi script.** Lý do kỹ thuật, agent làm lớp chuyển động
chỉ ra:

`world-map.module.css` nạp tranh bằng `background-image: url('/map/world-map.svg')`.
Một SVG nạp bằng ảnh nền (hoặc `<img>`) là **một tài liệu riêng, không script, bị cách
ly khỏi trang**: CSS của trang không khớp được selector nào bên trong nó, JS không
`querySelector` vào được. Nên `id="vach-trai"` hay `data-nuoc="chinh"` là **byte chết**
trong một tệp 830 KB tải ở mỗi lượt vào trang chủ — mà tệp ấy đang phải nằm dưới trần
900 KB. (`src/lib/figure-motion.ts` đã trả giá cho đúng điều này: 23 hình lý thuyết
nhúng bằng `<img>` nên trang bài học không dừng được hoạt hình bên trong, phải dựng lại
tệp bằng Blob mới dừng được.)

Trong SVG sinh ra nay chỉ còn **bốn `id`, và cả bốn đều được dùng ngay trong tệp**
(`clipPath`: `da`, `long-vuc`, `zoom1`, `zoom2`). Có ca test canh: mọi `id` trong tranh
phải xuất hiện trong một `url(#…)` của chính tranh.

**Hợp đồng thật là TOẠ ĐỘ MỐC trong `frontend/src/lib/world-map.ts`** — cùng những hằng
mà `build_map.py` đọc qua `read_ts()`, nên hai bên không lệch nhau được. Lớp chuyển
động là những phần tử HTML **riêng, chồng LÊN** tranh, định vị theo % của `MAP_FRAME`.

| Hằng | Là gì | Dùng để |
|---|---|---|
| `MAP_FRAME` | `{width: 1360, height: 820}` | hệ toạ độ chung; mọi % tính từ đây |
| `MAP_ABYSS.mouthY` `.bottomY` `.cx` | miệng vực, đáy, trục | khoảng độ sâu thật của cái hố |
| `MAP_ABYSS.tiers[].bottomY` | mép dưới bốn tầng | gán độ sâu cho lớp parallax; mốc thang độ sâu |
| `MAP_ABYSS.shaft` `.rock` `.alcoves` | mặt cắt lòng vực / khối đá / tám hốc | đặt thứ gì đó đúng trong lòng vực, hoặc bám mép vách |
| `REGION_LAYOUT[].box` `.band` `.plate` | tám hộp, tầng, chỗ tấm nhãn | ô nước M4, mặt hồ M8, nhãn |
| `MAP_WELLS[].d` `.x` | năm sợi cáp | sợi sáng vẽ dần xuống; cột bụi dưới tời |
| `MAP_SUN` | `{cx, cy}` | nguồn sáng: cột bụi đặt dưới mặt trời |
| `MAP_PALETTE` | bảng màu của tranh | màu lớp chuyển động phải KHỚP tranh |

**Luật, và nó đã được trả giá hai lần trong cùng một ngày:** toạ độ nào mà cả hai bên
cùng cần thì nó nằm ở `world-map.ts`, không ở đâu khác.

- Lớp chuyển động từng chép bốn mốc địa tầng sang tệp của nó. Bản sao **chết trong hai
  giờ** khi bức tranh được vẽ lại (238/390/528/710 → 128/378/508/716). Nó đã bỏ bản sao
  và suy mốc từ `REGION_LAYOUT`.
- `world-map.test.mjs` từng khoá cứng `"giếng bắt đầu ở y ≈ 236"` — chiều cao mặt đất
  cũ — và ca ấy đỏ ngay buổi chiều hôm đó. Nay nó đọc `MAP_ABYSS.mouthY`.
- Vì vậy hình thái cái vực (mặt cắt, mốc tầng, tám hốc) KHÔNG nằm trong `build_map.py`
  nữa: script dựng `Vuc` từ `MAP_ABYSS`.

Ba điều **đừng phá**, lớp chuyển động phụ thuộc vào:

1. `.decor` giữ `background-size: 100% 100%` và `.map` giữ `aspect-ratio: 1360/820` —
   hai bên khớp chính xác nhờ đúng hai dòng đó. Đổi sang `cover`/`contain` là mọi mốc
   của lớp kia lệch.
2. Đừng đặt `z-index` hay `transform` lên `.decor`: `transform` tạo containing block
   mới và nhấc cả texture 830 KB thành một lớp hợp ảnh riêng trên GPU.
3. Mốc gãy `1099px` của `@container` là mốc chung — lớp chuyển động tự tắt ở đúng mốc
   đó (`MOTION_MIN_WIDTH_PX = 1100`, có ca test so với CSS).

Một điều nữa về chính bức tranh: **tám nhóm `data-lop="gian-M*"` mang
`transform="translate(…) scale(…)"`** vì tiểu cảnh được dựng trong khung riêng
(`ART_BOX`) rồi đặt vào hốc. Ai đọc/sửa SVG mà thêm `transform` của mình vào đúng nhóm
đó sẽ **đè mất** phép biến hình này và tiểu cảnh nhảy về góc trên-trái.

### 6.4 · Ghi chú trung thực về nguồn

Đã tra kỹ và **không tìm được nguồn dẫn được** mô tả bộ máy vạch / đường-dẫn / vòng-soi
của bản mặt cắt *in* của Made in Abyss; thứ chính thức duy nhất tra được là trang
アビスガイド của Takeshobo — một trang cuộn dọc có dải độ sâu theo tầng, không phải một
bản vẽ có thước lề. Nên: **chia tầng theo dải độ sâu** lấy từ đó, còn **thước lề, vạch
ngang, đường dẫn** dựng theo quy ước mặt cắt địa chất và bản đồ hang (nguồn ở mục
Nguồn). Chỗ nào trùng với ảnh tham chiếu thì là trùng về QUY ƯỚC, không phải chép.

---

## 5 · Hai thứ không lấy, và vì sao

- **Số trên thang đo.** Bản tham chiếu ghi độ sâu theo mét vì truyện có hệ thống độ sâu
  thật. Ở đây không có gì để đo; một con số ở đây là số bịa (`AGENTS.md`).
- **Chữ bên lề và khuôn tên kể chuyện.** `quyet-dinh.md` mục 1: bản đồ kể **chỉ bằng
  hình**. Nhãn chỉ gồm tên gian + mã chặng + tên chặng + số bài, và chúng là HTML trên
  tấm nền token giao diện — không bao giờ đặt thẳng lên vùng rậm nét.

---

## Nguồn

Hachure và địa hình
- *Hachure map* — Wikipedia · https://en.wikipedia.org/wiki/Hachure_map
- Kennelly & Kimerling, "Desktop Hachure Maps from Digital Elevation Models",
  *Cartographic Perspectives* 37 (2000) ·
  https://cartographicperspectives.org/index.php/journal/article/download/cp37-kennelly-kimerling/pdf/3966
- Magyari-Sáska, "Automatic Generation of Hachure Lines", *Geographia Technica* 12(1)
  (2017) · https://mail.technicalgeography.org/pdf/1_2017/08_magyari.pdf
- Esri, *Generate Hachures For Defined Slopes* ·
  https://doc.esri.com/en/arcgis-pro/latest/tool-reference/cartography/generate-hachures-for-defined-slopes.html
- UNBC, *Relief Representation* (2025) · https://gis.unbc.ca/wp-content/uploads/2025/02/relief2025.pdf

Chấm lấm tấm
- Deussen, Hiller, van Overveld, Strothotte, *Floating Points: A Method for Computing
  Stipple Drawings*, Eurographics 2000 ·
  https://www.cs.princeton.edu/courses/archive/fall00/cs597b/papers/stipple_deussen.pdf

Núi, rừng, bờ biển (thực hành bản đồ giả tưởng)
- Jonathan Roberts, *How to draw, shade, and colour a mountain range* ·
  https://www.fantasticmaps.com/?p=2208
- Jonathan Roberts, *4 Coast Styles for Mapmaking* · https://www.fantasticmaps.com/?p=2467
- torstan, *How to Draw Forests* ·
  https://www.deviantart.com/torstan/art/How-to-Draw-Forests-295836612
- K.M. Alexander, *Creating 18th Century Coastlines for Fantasy Maps* ·
  https://www.goodreads.com/author_blog_posts/18661617-tutorial-creating-18th-century-coastlines-for-fantasy-maps

Nét vọng quanh nước
- Esri ArcUser, *The Coastal Vignette* (Buckley & Barnes) ·
  https://www.esri.com/about/newsroom/arcuser/vignette
- Geography Realm, *Enhancing Shorelines with Vector-Based Coastal Vignettes* ·
  https://www.geographyrealm.com/coastal-vignettes/

Khắc đồng, trời khắc, chất nét
- *Steel engraving* — Wikipedia · https://en.wikipedia.org/wiki/Steel_engraving
- Science Museum Group, tiểu sử thợ khắc (máy kẻ của Wilson Lowry, hiệu quả bầu trời) ·
  https://collection.sciencemuseumgroup.org.uk/people/cp136600
- Ketterer Kunst, *Copperplate engraving* · https://www.kettererkunst.com/dict/copperplate-engraving.php

Giấy ố
- *Amid the possible causes of a very famous foxing…* (vết ố trên chân dung Leonardo) ·
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4959533/
- Heritage Preservation Atelier, *Foxing on paper…* (2025) ·
  https://heritagepreservationatelier.com/2025/08/06/foxing-on-paper-textile-and-architectural-drawings-causes-concerns-and-prevention/

Chữ và bộ máy chú giải
- Axis Maps, *Labeling* (Cartography Guide) · https://www.axismaps.com/guide/labeling
- UNBC, *Map Lettering* (2025) · https://gis.unbc.ca/wp-content/uploads/2025/01/lettering2025.pdf
- *Cartouche (cartography)* — Wikipedia · https://en.wikipedia.org/wiki/Cartouche_(cartography)

Sinh bằng thuật toán
- Martin O'Leary, `terrain.js` (hachure theo độ dốc, ngưỡng bỏ nét có nhiễu) ·
  https://github.com/mewo2/terrain/blob/master/terrain.js
- Amit Patel, *Noisy edges* · https://www.redblobgames.com/maps/noisy-edges/
- rough.js wiki (góc −41°, bước nét = 4× bề rộng, nét tô = ½ bề rộng viền) ·
  https://github.com/rough-stuff/rough/wiki
- *Sketch-effect hatching*, US patent 10 621 763 (xê dịch tâm nét trong ±nửa bước lưới) ·
  https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10621763

Về chính hai bản tham chiếu
- Royale, *Runeterra Map Teaser* (vẽ lại theo tông nâu đỏ cho ra giấy cũ) ·
  https://weareroyale.com/case-studies/runeterra-map-teaser/
- Không tìm được bài phân tích kỹ thuật nào của bản đồ Vực Thẳm. Phần mục 2 ở trên là
  **đọc từ chính bức vẽ**, không phải dẫn nguồn — ghi rõ để người sau biết độ chắc.

Thế giới dọc, cắt bổ, hình–nền, liền mạch (thêm 19/10/2026)
- Li, Ritter, Agrawala, Curless, Salesin, *Interactive Cutaway Illustrations of Complex
  3D Models*, SIGGRAPH 2007 · https://grail.cs.washington.edu/projects/cutaways —
  quy ước cắt bổ: cắt theo hình của chính vật bị cắt; cắt MỘT PHẦN để người xem tự dựng
  lại chỗ bỏ đi; vật ở XA bị cắt ít hơn vật ở GẦN. Luật 4, 5 và vách sau ở mục 6.1.
- *Figure-ground (cartography)* — Wikipedia ·
  https://en.wikipedia.org/wiki/Figure-ground_(cartography) — danh sách tín hiệu
  hình–nền: khép kín, che khuất (interposition), kết cấu (articulation), độ mạnh của
  đường biên. Luật 1, 8 và quy tắc "đường dẫn dừng trước khi chạm".
- Axis Maps, *Visual Hierarchy* · https://axismaps.com/guide/visual-hierarchy —
  phép thử nheo mắt; tương phản yếu thì hình–nền yếu. Lý do vách vực là nét đậm nhất
  của cả bức (2,4 so với 0,4–1,7).
- *Hatching* — Wikipedia · https://en.wikipedia.org/wiki/Hatching — sắc độ do số
  lượng / độ dày / khoảng cách nét; **nét gạch phải bám theo hình**; vùng kề nhau đổi
  hướng gạch để tách nhau; cảnh báo moiré. Luật 6, 7.
- Waldron & Snyder, *Geological Structures — Cross-sections and Three-point Problems* ·
  https://geo.libretexts.org/Bookshelves/Geology/Geological_Structures_-_A_Practical_Introduction_(Waldron_and_Snyder)/02%3A_Labs/2.02%3A_Lab_2_-_Cross-sections_and_Three-point_Problems
  — dựng mặt cắt: trục độ sâu ở lề, ranh giới vỉa vẽ hết bề rộng bản vẽ, phóng đại
  chiều đứng phải khai báo. Mục 6.2.
- *Karst Hydrogeology* (TRU Pressbooks) ·
  https://environmental-geol.pressbooks.tru.ca/chapter/karst-hydrogeology/ — mực nước
  ngầm là MỘT mặt chia đới thoáng khí / bão hoà; hang đới bão hoà **rộng hơn cao,
  tròn**, hang đới thoáng khí **thẳng, bám khe nứt**. Hình mặt cắt ở `Vuc.shaft_half`.
- Groundwater Project, *Water table decline and fluctuation forms interconnected
  conduits* ·
  https://books.gw-project.org/introduction-to-karst-aquifers/chapter/water-table-decline-and-fluctuation-forms-interconnected-conduits/
  — tầng hang hình thành theo các mực nước cũ khi mực nước hạ dần. Lý lẽ của hai đường
  `muc-nuoc`.
- Cavewhere, *Cave mapping — sketch projections* ·
  https://cavewhere.com/2020/12/15/cave-mapping-sketch-projections/ — bốn phép chiếu
  bản đồ hang; **running profile** giữ chiều dài thật khi hang ngoặt; nét chấm đánh dấu
  chỗ lấy mặt cắt ngang.
- Takeshobo, *DIVE INTO THE ABYSS — アビスガイド* ·
  https://www.takeshobo.co.jp/sp/made-in-abyss/abyss_guide/ — nguồn CHÍNH THỨC duy nhất
  tra được cho chuyện chia tầng theo dải độ sâu. Xem ghi chú trung thực ở mục 6.4.
- Game Informer, *The Making Of Hollow Knight* (2018) ·
  https://www.gameinformer.com/2018/10/16/the-making-of-hollow-knight — Ari Gibson vẽ
  tay rồi quét thẳng vào engine; "giữ cho đơn giản"; bản đồ phải *gợi vừa đủ*, không
  được thành "một mớ chi tiết ngộp". Lý do hạ hẳn mật độ nét trong lòng vực.
