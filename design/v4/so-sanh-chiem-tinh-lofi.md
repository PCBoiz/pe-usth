# Chiêm tinh ‖ Lofi chill — hai hướng giao diện, và vì sao lofi thắng

Viết ngày 22/10/2026, sau khi nhóm chốt đi theo lofi chill.
Đây là bản ghi lý do, không phải bản vận động đổi quyết định.

Con số nào trong bài này cũng đo được, và chỗ nào chưa đo thì ghi thẳng là chưa đo.

---

## 1. Hai thứ này khác nhau ở GỐC, không phải ở màu

| | Chiêm tinh | Lofi chill |
|---|---|---|
| Hình từ đâu ra | **Sinh bằng mã** — Python đọc toạ độ trong `star-map.ts` rồi ghi SVG | **Vẽ sẵn** — ảnh raster do mô hình tạo ảnh vẽ, cắt rời từng vật |
| Sửa một chi tiết | Sửa số trong TS → chạy lại bộ sinh | Vẽ lại ảnh → cắt nền lại |
| Nghề cần có | Lập trình | Mỹ thuật (hoặc biết ra lệnh cho mô hình vẽ) |
| Hỏng kiểu gì | Hỏng ồn ào: build trượt, test đỏ | Hỏng lặng lẽ: ảnh vẫn hiện, chỉ là xấu hoặc sai |

Mọi khác biệt bên dưới đều chảy ra từ dòng đầu tiên này.

---

## 2. Chỗ chiêm tinh hơn thật

### 2.1. Nó KHÔNG nói dối được về dữ liệu

48 ngôi sao **là** 48 bài. 8 chòm **là** 8 chặng. Không phải "vẽ cho giống", mà là bộ sinh đọc giáo trình rồi đặt sao.

Thêm một bài vào khoá → chạy lại bộ sinh → bản đồ có thêm một ngôi, đúng chặng, đúng chỗ.

Đối chiếu với một lỗi THẬT đã xảy ra trong chính dự án này: trang danh mục quảng cáo khoá học dài "~48 giờ" trong khi cộng `estimated_minutes` của 48 bài lại chỉ ra 28,8 giờ — **phóng đại 67 %, trên trang ai cũng vào**. Con số đó sai được vì nó là chữ viết tay, không phải số tính ra. Căn phòng lofi có đúng kiểu rủi ro ấy ở mọi chỗ: giá sách vẽ 9 cuốn thì nó vẫn là 9 cuốn kể cả khi hệ thống có 12 khoá.

### 2.2. Trợ năng đã được ĐO, không phải được hy vọng

Bản chiêm tinh có số thật:

- nhãn chòm thấp nhất **5,67:1** (24 phép đo đều ≥ 4,5)
- nét chòm **5,74:1** lúc nghỉ
- mạch hoàng đạo **4,59:1**
- **16/16** ô bấm ≥ 44 px ở bề rộng khung thật — chín ô từng dưới mức đó và đã sửa
- có nhánh `prefers-reduced-motion`

Bản lofi: **chưa ai đo cái nào trong số này.** Vật bấm được là vùng hit-area vẽ tay đè lên tranh; chúng không có nhãn văn bản, nên người dùng trình đọc màn hình hiện chưa rõ nghe được gì.

Đây không phải lỗi của lofi — chỉ là nó chưa đi qua vòng đo nào. Nhưng nếu có người khiếm thị trong nhóm thử, đây là chỗ vỡ đầu tiên.

### 2.3. Thêm khoá thì có sẵn chỗ để lớn ra

Bộ từ vựng đã dựng: một khoá = một hệ sao; nhiều khoá = nhiều hệ trong một vũ trụ; chặng = chòm; bài = ngôi; màn trong bài = thiên thể quay quanh. Bốn tầng phóng, mỗi tầng có nghĩa riêng.

Căn phòng lofi lớn ra bằng cách… thêm gáy sách lên giá. Giá có hạn, và một giá 30 cuốn thì không còn là góc học ấm cúng nữa.

### 2.4. Nhẹ

Bản SVG sinh ra: **450,7 KB** cho cả 20 tệp, mà đó là bầu trời có 1 250 sao nền, tinh vân 22 bậc và mặt trời 128 vòng.

---

## 3. Chỗ lofi hơn — và vì sao nó thắng

### 3.1. Đọc được ngay, không cần ai dạy

Bàn, đèn, sách, cửa sổ. Không ai phải học quy ước nào.

"Chòm sao này là chặng Đa luồng" thì PHẢI dạy. Mà một sản phẩm tự học — không có giáo viên đứng cạnh giải thích — thì mỗi quy ước phải dạy là một chỗ rơi người dùng.

### 3.2. Nó ấm, và chỗ học thì nên ấm

Vũ trụ đẹp theo kiểu **lạnh và rộng**. Góc học đẹp theo kiểu **có người vừa ngồi đây**: cốc trà còn bốc hơi, sách mở dở, đèn vàng.

Với một người sắp ngồi học Python hai tiếng, cái thứ hai mời gọi hơn. Đây là lý do mạnh nhất và nó không cần con số nào chống lưng.

### 3.3. Tranh vẽ tay thắng tranh sinh ra ở CÁI NHÌN ĐẦU

Đây là phát hiện đắt nhất của cả đợt làm, nên ghi thẳng:

Bản chiêm tinh đi qua **năm vòng** vặn số — bậc giữa, phân bố sắc độ, tương phản nét, mật độ sao — và mọi phép đo đều đạt. Nhưng lần đầu xuất ra ảnh để NHÌN thì có bốn khuyết tật mà **không con số nào bắt được**: tám mảng tối hình bao lồi khoét thủng tinh vân, chín tia bụi là chín vạch kẻ thẳng, tám tấm nền nhãn là tám vệt bôi đen, lõi mặt trời là một đa giác méo.

Rồi cả khi đã sửa hết, đặt cạnh bản lofi thì chủ sản phẩm vẫn nói: **"bản vũ trụ của mình trông vẫn xấu hơn nhiều so với bản lofi"**. Ba lần, ở ba vòng cải tiến khác nhau.

Khoảng cách còn lại không phải dải động, không phải độ tương phản, không phải mật độ nét. Nó là **chất liệu**: một bộ sinh nét Python không vẽ được cái mà một hoạ sĩ (hay một mô hình vẽ tranh) vẽ được trong một lần.

### 3.4. Đổi hình nhanh hơn nhiều

Sửa màu bản đồ sao = sửa TS → chạy `build_sky.py` → chạy `--place-nhan` → chép toạ độ → chạy `--css` → chạy raster đo lại → xuất PNG nhìn. Sửa sai một bước là một toạ độ lệch.

Sửa căn phòng lofi = bảo mô hình vẽ lại cái đèn.

---

## 4. Bảng gọn

| Tiêu chí | Chiêm tinh | Lofi |
|---|---|---|
| Hiểu ngay không cần dạy | ✗ | **✓** |
| Cảm giác mời ngồi học | ✗ | **✓** |
| Đẹp ở cái nhìn đầu | ✗ | **✓** |
| Số liệu không thể nói dối | **✓** | ✗ |
| Trợ năng đã đo | **✓** | chưa đo |
| Nhẹ | **✓** | chưa đo |
| Chỗ để lớn ra khi thêm khoá | **✓** | hẹp |
| Đổi hình nhanh | ✗ | **✓** |
| Chi phí duy trì | cao, nghề lập trình | thấp, nghề mỹ thuật |

Lofi thắng ba dòng đầu. Ba dòng đầu là ba dòng người dùng gặp trong **hai giây đầu tiên**, còn các dòng chiêm tinh thắng thì người dùng chỉ gặp sau khi đã ở lại.

Một sản phẩm chưa có ai ở lại thì phải thắng hai giây đầu trước. Quyết định của nhóm đúng.

---

## 5. Nên mang gì từ chiêm tinh sang lofi

Ba thứ không dính gì tới vũ trụ, mất thì tiếc:

1. **Luật "số trên màn phải tính ra, không viết tay".** Lý do cụ thể: lỗi "~48 giờ" ở trên. Căn phòng có XP, huy hiệu, tiến độ, xếp hạng — mỗi con số là một chỗ có thể nói dối. Nên có ca test cộng lại từ giáo trình thật. Bản vá cho chính lỗi ấy
   (`catalog-duration.test.mjs` + `duration: '~29 giờ'`) nằm ở nhánh **local**
   `fix/danh-gia-toan-ven`, CHƯA đẩy lên `tester` và KHÔNG có trên `chiem-tinh`: ở nhánh
   này `frontend/src/lib/catalog.ts:114` vẫn ghi `duration: '~48 giờ'`, tức lỗi vẫn sống.
   (Đã kiểm 22/10: cộng `estimated_minutes` của 48 tệp trong
   `scripts/pe-v4/out-advanced/lessons/` ra đúng **1 725 phút = 28,8 giờ**.)

2. **Sàn trợ năng đã đo được.** Tương phản ≥ 4,5:1 cho chữ, ô bấm ≥ 44 px, nhánh `prefers-reduced-motion`. Căn phòng chưa qua vòng nào; nên đo trước khi mời người ngoài thử.

3. **"Đo không phải là nhìn".** Bài học đắt nhất của đợt chiêm tinh: năm vòng đánh giá liên tiếp không ai mở bức tranh ra xem, mọi agent dừng ở câu "tôi chưa chạy được trình duyệt" rồi vặn số theo bảng. Với lofi thì cạm bẫy đổi chiều — tranh đẹp sẵn nên dễ tin là xong, trong khi thứ chưa ai nhìn là **trạng thái trống**: phòng trông thế nào khi người học chưa làm bài nào, chưa có huy hiệu nào, chưa có ai trên bảng xếp hạng.

---

## 6. Bản chiêm tinh đang nằm ở đâu

Không xoá. Nhánh `chiem-tinh` trên `PCBoiz/pe-usth` giữ nguyên toàn bộ, đúng commit `3e6cc99`:

- bộ sinh bản đồ sao (`scripts/star/`) và bản đồ thế giới (`scripts/map/`)
- các đặc tả trong `design/v3/`
- 79 ca test của `star-map.test.mjs` (đã đếm lại 22/10: đúng 79)

**Hai thứ AGENTS.md của nhánh này nhắc tới nhưng KHÔNG nằm trong nhánh này** — đã kiểm
bằng `git ls-tree` trên cả bốn nhánh local: tiền cảnh bàn quan trắc (`scripts/room/`,
`frontend/src/lib/room-art.ts`, `frontend/public/map/room/*.svg`, 33 ca của
`room-art.test.mjs`) và `catalog-duration.test.mjs` chỉ có ở nhánh **local**
`fix/danh-gia-toan-ven` (`cf4ff42`), chưa đẩy lên remote nào. Ai cần phần tiền cảnh thì
lấy ở đó, đừng tìm trong `chiem-tinh`. Đây đúng là cái bẫy mà AGENTS.md tự cảnh báo ở
mục "CẬP NHẬT BẢNG NÀY": bảng mốc ghi công việc mà cây mã không có.

`main` đã lùi về bản tối giản `2c12049` bằng MỘT commit đắp lên trên, không viết lại lịch sử — nên 95 commit cũ vẫn tra cứu được, lấy lại lúc nào cũng được.

---

## Ghi chú soát lại (22/10/2026, lúc commit vào `design/v4`)

Hai chỗ đã sửa, cả hai cùng một nguyên nhân: tài liệu tin bảng mốc trong AGENTS.md của
nhánh `chiem-tinh`, mà bảng ấy ghi cả phần việc nằm ở nhánh khác.

- §5 mục 1 — `catalog-duration.test.mjs` được viết như thể đang chạy ("đang làm"); thực tế nó
  ở nhánh local `fix/danh-gia-toan-ven`, và `catalog.ts:114` của `chiem-tinh` vẫn ghi
  `'~48 giờ'`. Lỗi được nêu làm ví dụ ở §2.1 vẫn chưa được chữa trên nhánh này.
- §6 — `scripts/room/` và 33 ca `room-art.test.mjs` không có trong `chiem-tinh`.

Đã kiểm và đúng: 1 725 phút = 28,8 giờ (phóng đại 67 % so với "~48 giờ"); 20 tệp SVG trong
`frontend/public/map/star/`; 79 ca trong `star-map.test.mjs`; `main` @ `070886a` có cây
**giống hệt** `2c12049` (`git diff` rỗng) bằng một commit revert duy nhất, và 95 commit giữa
`2c12049` và `chiem-tinh` vẫn tra cứu được.
