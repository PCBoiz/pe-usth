# Lược đồ bộ dữ liệu xuyên suốt — "Sổ của Quán Hạt Rang"

Đặc tả BỐN BẢNG dùng chung cho cả 172 bài của `python_advanced`. Câu chuyện nằm ở
[CAU-CHUYEN.md](CAU-CHUYEN.md); miền ví dụ máy đọc được nằm ở
[boi-canh.json](boi-canh.json); file này chỉ nói **bảng nào có cột gì, kiểu gì, đơn vị gì,
bài nào dùng nó**.

Dữ liệu do [`gen_dulieu.py`](gen_dulieu.py) sinh, seed cố định, chạy hai lần ra file
**giống hệt từng byte**. Số đo của từng đặc tính: `py -I scripts/pe-da/gen_dulieu.py --kiem`.

---

## 0. Vì sao chốt lược đồ TRƯỚC mọi thứ khác

**32 bài pandas là nơi tên cột được VIẾT RA.** Viết `store`/`amount` xong rồi đổi sang
`quay`/`tong_tien` là làm lại 32 bài. Đó là lý do file này phải có trước khi ai đó sửa
một dòng nội dung nào của M3.

Và hôm nay ba chỗ đang nói ba thứ tiếng khác nhau — đo trên corpus:

| Chỗ | Đang dùng |
|---|---|
| Màn đọc (literal `{'x': [...]}`) | `amount` 38 · `store` 22 · `order` 15 · `qty` 12 · `customer_id` 11 · `city` 9 |
| Ca chấm PD14 | `region` / `qty`, nhãn nhóm `E` / `W` / `N` |
| Tên món | `latte` 45 · `espresso` 31 · `mocha` 5 · `americano` 3 · `cappuccino` **0** |

Cùng một khái niệm, ba bộ tên. Thống nhất chúng là phần **rẻ nhất và có lãi nhất** của cả
đợt này — nó không tốn một byte dữ liệu nào.

> Tên món của bảng `mon` chọn theo CORPUS chứ không theo sở thích: lấy `mocha` thay
> `cappuccino` vì `cappuccino` không xuất hiện lần nào còn `mocha` đã có 5 lần, nên 48 chỗ
> đang viết tên món trong giáo trình không phải sửa.

---

## 1. LUẬT TÊN CỘT — đã chốt

**M1–M4 dùng tiếng Việt KHÔNG DẤU.** `so_coc`, `don_gia`, `tong_tien`, `quay`, `mon`,
`thoi_diem`.

**PD12 là bài BẢN LỀ, có chủ đích.** Nó đọc file CC0 **thật** với cột tiếng Anh
(`coffee_name`, `money`, `cash_type`) rồi dạy `read_csv(..., names=...)` để đổi về tên
mình hiểu.

**M5 trở đi dùng tiếng Anh**, vì từ đó là code có cấu trúc (`class`, package, API).

Lý do, nói cho đủ hai chiều — đây là một đánh đổi, không phải một sự thật hiển nhiên:

- Cột tiếng Anh ở M1–M4 bắt người mới **trả hai lần thuế nhận thức cùng lúc**: học
  `groupby` *và* dịch `amount`. Nó còn phá R2 của CAU-CHUYEN.md — một đoạn văn tiếng Việt
  kể chuyện quán rồi tới code toàn `store`/`amount` thì bối cảnh bị bỏ rơi ngay tại chỗ
  chuyển.
- Nhưng cột tiếng Việt một mạch cả khoá là **dạy một thứ không tồn tại ngoài đời**: mọi
  dataset, mọi `df.columns`, mọi StackOverflow họ gặp sau khi học xong đều tiếng Anh.

Nên phép "đổi tên cột của người khác về tên mình" được biến thành **một bài học** thay vì
một lựa chọn phải chịu.

**KHÔNG DẤU, không phải có dấu**: `df.so_côc` gõ sai thì lỗi khó đọc, và `check.py` phải
canh thêm một chuyện. Dấu tiếng Việt sống ở **giá trị** (`ten_mon`, `nhom`, `ten`,
`khu_vuc`) — ở đó nó đúng chỗ, và PY06 dạy Unicode trên chính những giá trị ấy.

### ⚠️ Đơn vị tiền là **VNĐ**

Ghi vào mọi nhãn, mọi tiêu đề biểu đồ, mọi dòng báo cáo. PD32 dạy nguyên văn *"khi giao
báo cáo, ghi đơn vị tiền"* — bộ dữ liệu của chính khoá không được là chỗ đầu tiên phạm
luật đó. `don_gia`, `tong_tien`, `gia_niem_yet` đều là **số nguyên VNĐ**, không phải nghìn
đồng, không phải float.

Ngược lại, cột `money` của bộ CC0 **không có đơn vị xác định** và bài học phải NÓI RA điều
đó, không được đoán. Xem [NOTICE](../../frontend/public/static/da-dulieu/NOTICE.md).

---

## 2. `don_hang` — bảng chính

17 938 hàng · 1 năm (01/01/2025 → 31/12/2025) · 2 quầy.
Một hàng = một đơn, một món.

| Cột | Kiểu | Đơn vị | Thiếu? | Bài dùng nó |
|---|---|---|---|---|
| `ma_don` | `str`, khuôn `DH-2025-000001` | — | không | **PY07** lát cắt chuỗi · **SY03** regex · **PD10/PD30** khoá của bảng (`is_unique` → `False`, có chủ đích) |
| `thoi_diem` | `str` ISO `YYYY-MM-DD HH:MM:SS` → `datetime64` | giây | không | **PD21–PD24** thời gian · **PD22** `reindex`/`asfreq` · **VZ03** line · **VZ08/VZ28** heatmap `giờ × thứ` · **SY01** datetime |
| `quay` | `str`, `Q1` · `Q2` · `QH` | — | không | **PD14/PD15** groupby 2 khoá · **PD16/PD17** merge + `indicator` · **PD19/PD20** pivot · **NP17** NaN = chưa mở |
| `mon` | `str` slug ASCII (`ca-phe-sua`) | — | không (nhưng **bẩn**) | **PY12** dict tra giá · **PD09** làm sạch chữ · **PD14** groupby · **PD26** categorical · **VZ04/RD03** xếp theo doanh thu |
| `so_coc` | `int` | cốc | không | **PY05/PY11** hoá đơn · **M2** bảng số · **PD31** IQR outlier · **VZ07** boxplot · **VZ13** errorbar |
| `don_gia` | `int` | **VNĐ**/cốc | không | **PY05** phép tính hoá đơn · **PD30/PD32** đối chiếu với `mon.gia_niem_yet` |
| `tong_tien` | `int` | **VNĐ** | không | **PD14** tổng hợp · **PD30** `assert tong_tien == so_coc*don_gia` · **PD31/PD32** báo cáo · **VZ06/VZ07** phân bố |
| `thanh_toan` | `str`, `tien_mat` · `the` · `vi_dien_tu` | — | **CÓ, ~2% rỗng** | **PY18** `try/except` ô trống · **PD07** `Int64`/nullable · **PD08** phát hiện thiếu · **PD12** `na_values` |
| `ma_the_tich_diem` | `str`, `TD00001`, **phần lớn RỖNG** | — | **CÓ, ~82% rỗng** | **PD16/PD17** merge với khoá CÓ THỂ THIẾU — bài học khác với merge vào bảng tra, nơi khoá luôn có |

### ⚠️ `ma_the_tich_diem` — và vì sao nó bị chặn ở 8 lượt

Bộ CC0 có cột `card`: 1 038 thẻ, thẻ nhiều nhất xuất hiện **122 lần**. Mã đã được thay
nhưng **tính liên kết còn nguyên** — bảng đó nói *"người này mua 122 lần, vào những giờ
này"*. Đó là định nghĩa của dữ liệu giả danh **theo hành vi**, tức dữ liệu **NHẠY CẢM**
theo Luật 91/2025 + Nghị định 356/2025 (cùng lý lẽ đã buộc lớp `learning-events` của repo
này phải có cổng đồng ý ở máy chủ). Nên cột `card` **đã bị bỏ** khi chép bộ CC0 vào repo.

`ma_the_tich_diem` là mã thẻ **của quán**, sinh ngẫu nhiên, không nối được với người nào,
và **≤ 8 lượt mỗi thẻ** để không dựng lại được một hồ sơ hành vi. Đo được: 1 298 thẻ /
3 252 lượt, nhiều nhất **8**.

**Trần 8 từng bị phá bởi một bước hoàn toàn khác, và đó là một lỗi thật đã sửa.** Bản đầu
gán thẻ TRƯỚC khi tiêm dòng trùng; bước nhân bản chép luôn mã thẻ sang bản sao, nên một thẻ
đã dùng hết 8 lượt thành **9**. Nay thẻ được gán SAU, và hai dòng trùng toàn phần được gom
thành MỘT đơn vị tiêu hai lượt của cùng một thẻ. Phép đếm nằm trong `--kiem`; nó là chỗ duy
nhất nhìn thấy được chuyện này.

**KHÔNG có một định danh người nào khác.** Không tên, không tuổi, không giới tính, không
điện thoại, không `customer_id`.

> **Việc nội dung còn lại:** PD16 hiện mang tên *"Merge: nối đơn hàng với bảng khách"*. Bộ
> này **không có bảng khách** — chủ đích. Đích merge của PD16/PD17 là `quay` và `mon`; nếu
> bài muốn giữ một khoá "khách" thì đó là `ma_the_tich_diem`, và tiêu đề phải đổi theo.

---

## 3. `quay` — bảng tra quầy

3 hàng. `quay` là khoá, duy nhất ⇒ `validate='many_to_one'` của PD17 **đạt** (đã kiểm).

| Cột | Kiểu | Đơn vị | Thiếu? | Bài dùng nó |
|---|---|---|---|---|
| `quay` | `str` khoá | — | không | **PD16/PD17** merge |
| `ten` | `str` có dấu | — | không | **PD16** nhãn sau khi nối · **VZ04** nhãn cột |
| `khu_vuc` | `str` có dấu | — | không | **PD14/PD15** groupby chiều thứ hai · **PD32** doanh thu theo khu vực |
| `ngay_mo` | `str` ISO `YYYY-MM-DD` | ngày | không | **NP17/PD08** giải thích vì sao có NaN |

| `quay` | `ten` | `khu_vuc` | `ngay_mo` |
|---|---|---|---|
| Q1 | Quầy mặt phố | Trung tâm | 2025-01-01 |
| Q2 | Quầy toà nhà Sao Mai | Phía Tây | 2025-05-05 |
| Q3 | Quầy xe đẩy chợ đêm | Phía Nam | 2026-03-01 |

**Chỉ 2/3 quầy danh mục có đơn, và `don_hang` có một mã KHÔNG nằm trong danh mục.** Hai
chiều, có chủ đích — thiếu một chiều thì `indicator=True` chỉ là một tham số được nhắc tên:

```
don_hang ⟕ quay   →  both 17 924 · left_only 14   (14 đơn mã QH — hai ngày hội chợ,
                                                    người bán ghi tay, chưa ai thêm
                                                    quầy đó vào danh mục)
quay ⟕ don_hang   →  left_only ['Q3']             (quầy đã có trong danh mục mà chưa
                                                    có đơn nào — mở 03/2026)
```

14 đơn `QH` dồn vào **đúng hai ngày** (08–09/11/2025) có lý do: rải mỏng suốt năm thì
`pivot` theo `quay` sinh một cột gần như toàn NaN và **làm nhoè bài học "NaN nghĩa là CHƯA
MỞ"** của NP17/PD08/PD17/PD20. Một sự kiện hai ngày thì giải thích được bằng một câu.

---

## 4. `mon` — thực đơn

12 hàng, 4 nhóm. `mon` là khoá slug ASCII; `ten_mon` mới là tên hiện cho người đọc.

| Cột | Kiểu | Đơn vị | Thiếu? | Bài dùng nó |
|---|---|---|---|---|
| `mon` | `str` khoá slug | — | không | **PY12** dict · **PD16** merge vào `don_hang` |
| `ten_mon` | `str` có dấu | — | không | **PY06** Unicode · **PY08** dọn chữ · **RD03** giữ tên khi `argsort` · **GU03** Combobox |
| `nhom` | `str` có dấu, 4 giá trị | — | không | **PD26** categorical có thứ tự · **VZ27** cơ cấu của tổng · **VZ19** facet |
| `gia_niem_yet` | `int` | **VNĐ** | không | **PY12** tra giá · **PD30/PD32** đối chiếu với `don_gia` thực thu |

| `mon` | `ten_mon` | `nhom` | `gia_niem_yet` (VNĐ) |
|---|---|---|---|
| ca-phe-den | Cà phê đen đá | Cà phê | 20 000 |
| ca-phe-sua | Cà phê sữa đá | Cà phê | 25 000 |
| bac-xiu | Bạc xỉu | Cà phê | 29 000 |
| espresso | Espresso | Cà phê | 35 000 |
| americano | Americano | Cà phê | 39 000 |
| latte | Latte | Cà phê | 45 000 |
| mocha | Mocha | Cà phê | 49 000 |
| tra-sen | Trà sen vàng | Trà | 39 000 |
| tra-dao | Trà đào cam sả | Trà | 42 000 |
| ca-phe-da-xay | Cà phê đá xay | Đá xay | 49 000 |
| banh-mi-pate | Bánh mì pa-tê | Bánh | 25 000 |
| croissant | Bánh sừng bò | Bánh | 32 000 |

**`mon` là slug chứ không phải tên có dấu, vì ba lý do cùng lúc:** `don_hang` giữ được
ASCII thuần (cần cho `np.loadtxt` ở NP21 và structured array ở EX02); chữ hoa/chữ thường
trở thành một khiếm khuyết **tự nhiên** để PD09 làm sạch; và `df.mon` gõ được mà không cần
bộ gõ.

**`don_gia` ≠ `gia_niem_yet` ở 146 dòng, và đó KHÔNG phải lỗi:** giờ vàng 14–16h giảm
5 000 đ/cốc. PD32 phải đối chiếu rồi **giải thích**, không chỉ báo lỗi — đó là chênh lệch
giữa một báo cáo đúng và một báo cáo chỉ biết kêu.

---

## 5. `nguyen_lieu` — quan hệ nhiều–nhiều

38 hàng · 12 món · 15 nguyên liệu. Không có khoá đơn; khoá là cặp `(mon, nguyen_lieu)`.

| Cột | Kiểu | Đơn vị | Thiếu? | Bài dùng nó |
|---|---|---|---|---|
| `mon` | `str` slug, khoá ngoài → `mon.mon` | — | không | **SY25–SY28** · **SY13** chia bao 1 kg thành phần 25 g |
| `nguyen_lieu` | `str` slug | — | không | **SY25–SY28** · **PD14** groupby trên bảng không có khoá đơn |
| `luong` | `int` | theo `don_vi` | không | **SY13** `floor` · **NP16** trung bình có trọng số |
| `don_vi` | `str`, `g` · `ml` | — | không | **PD26** categorical · nhắc lại luật "ghi đơn vị" |

**Bảng này tồn tại CHỈ VÌ SY25–SY28.** Project bốn bài đó đổi từ *"quản lý sinh viên, môn
học và điểm"* sang *"quản lý món, nguyên liệu và đơn hàng"* — cùng ba thực thể, cùng quan
hệ nhiều–nhiều, cùng bài học collection → object → package → persistence. GU12 đổi từ
*"PW9: ứng dụng quản lý điểm"* sang **màn hình nhận đơn tại quầy**, ghi xuống đúng file mà
SY27 đọc.

Quan hệ **thật sự** là nhiều–nhiều, đã đo: **9/15 nguyên liệu dùng ở hơn một món**
(`ca-phe-hat` ở 8 món, `da` ở 7, `sua-tuoi` ở 4, `duong` ở 3). Nếu mỗi món có nguyên liệu
riêng thì quan hệ chỉ là một–nhiều và project mất nội dung.

---

## 6. Đặc tính cố ý nhúng — mỗi dòng là một bài học đang chờ

Số đo thật, in bởi `--kiem`. **Thêm/bớt một đặc tính ⇒ chạy lại lệnh, lấy số thật, sửa
bảng TRONG CÙNG commit** — một con số cũ trong bảng không phải chú thích lỗi thời vô hại.

| Đặc tính | Số đo | Bài cần nó |
|---|---|---|
| Đỉnh sáng 8h + bướu tối 18–19h, **hiệu chuẩn theo bộ CC0** | CV giờ 0,306 (CC0: 0,265); đỉnh 08h | VZ08, VZ28, PD22, VZ03 |
| Cuối tuần khác ngày thường | **CV theo thứ = 0,186** (đòi ≥ 0,15; `dirty_cafe_sales` = 0,019) | VZ04, PD24 |
| Mùa trong năm | CV tháng 0,162 (riêng Q1 = mùa thuần); đá xay tháng 7 / tháng 1 = **16,4×** | VZ03, VZ19, PD24 |
| **Quầy 2 mở sau 4 tháng ⇒ NaN = CHƯA MỞ, không phải BÁN 0** | **116 ngày** không có hàng nào của Q2 | **NP17, PD08, PD17, PD20** |
| Ngày đóng cửa ⇒ mốc thời gian khuyết thật | **11 mốc** (Tết 28/01–02/02, lễ 30/04–01/05, 16–17/06, 02/09) | PD22 `reindex`/`asfreq` |
| `thanh_toan` rỗng | **358 dòng = 2,00 %** | PD07, PD08, PD12 |
| `mon` lệch hoa/thường + khoảng trắng | **179 dòng tiêm = 1,00 %** (đếm lại trên bảng cuối: **180** — một dòng bẩn rơi vào cặp trùng); `nunique` 56 → 12 sau khi dọn | PD09, PD12 |
| Dòng **trùng toàn phần** (kể cả `ma_don`) | **54 dòng = 0,30 %**; `ma_don.is_unique` → `False` | PD10, PD30 |
| **`tong_tien ≠ so_coc × don_gia`** | **36 dòng = 0,201 %** | **PD30** `assert`, **PD32** đối chiếu |
| Ngoại lai `so_coc` (đơn hội thảo) | **9 đơn**: 40 · 36 · 30 · 28 · 25 · 24 · 22 · 20 · 18 cốc | PD31, VZ07 |
| Bảng `quay` chỉ 2/3 khớp, **cả hai chiều** | `left_only` 14 dòng `QH` ⇄ `left_only` `['Q3']` | PD16, PD17 |
| `don_gia` lệch `gia_niem_yet` một cách HỢP LỆ | 146 dòng (giờ vàng 14–16h) | PD32 |
| Quan hệ nhiều–nhiều Món ↔ Nguyên liệu | 9/15 nguyên liệu dùng chung | SY25–SY28 |
| Không một định danh người nào | 0 cột; thẻ tích điểm ≤ 8 lượt | Luật 91/2025 + NĐ 356/2025 |

### ⚠️ Một chỗ phải nói trước, kẻo người soạn bài tưởng dữ liệu hỏng

**`1,5 × IQR` trên `tong_tien` cờ 1 867 dòng (10,4 %), không phải 9 đơn hội thảo.** Trên
`so_coc` nó cờ 599 dòng (3,3 %) — tức toàn bộ 590 đơn 4 cốc, cộng 9 đơn thật.

Đây **không phải khiếm khuyết của dữ liệu, và đừng "sửa"**: doanh thu là một đại lượng lệch
phải, và 1,5×IQR trên đại lượng lệch phải thì cờ cả cái đuôi — đó là hành vi THẬT của
phương pháp. Một bộ dữ liệu mà 1,5×IQR tách ra đúng 9 điểm đã cắm sẵn là một bộ được nắn
cho phương pháp trông như không bao giờ sai, tức **dạy một điều không đúng**.

Khoảng cách vẫn rất rõ: đơn thường tối đa **4 cốc / 196 000 đ**, đơn hội thảo **18–40 cốc /
420 000 – 1 000 000 đ**. Boxplot của VZ07 ra một hộp đặc và vài điểm bay rất xa — đúng thứ
VZ07 cần. Còn PD31 thì có hẳn một bài học tốt hơn bài nó định dạy: **ngoại lai ≠ lỗi, phải
nhìn vào mới biết.**

---

## 7. Hiệu chuẩn — bằng chứng bộ tự sinh không vô lý

Phân bố giờ **không phải một phân bố nghĩ ra**. `TRONG_SO_GIO` là **một PHÉP HOÁN VỊ** của
vector tỉ lệ giờ đo trên 2 623 hàng thật của `tablegpt/CoffeeSales` (CC0 1.0), nên trung
bình · phương sai · CV · min · max **giữ nguyên từng giá trị** — chỉ thứ tự các giờ đổi.
`--kiem` in ra `trọng số là HOÁN VỊ của vector CC0: True`, và CV hai cột bằng nhau
(0,265 = 0,265). Đó là phép kiểm, không phải lời hứa.

Thứ tự đổi vì **một lý do nói ra được**: bộ CC0 là một **máy bán cà phê tự động trong toà
nhà**, nên đỉnh của nó ở 10h (giờ nghỉ giữa buổi). Quán cà phê mặt phố Việt Nam bán mạnh
nhất lúc 7–9h, trước giờ vào làm. Hoán vị dời đúng cái đỉnh đó sớm hai giờ, giữ bướu tối,
và đặt giá trị NHỎ NHẤT của bộ thật vào 22h — giờ cuối trước khi đóng cửa. Từng giờ được
ghi lại nó lấy giá trị của giờ nào (cột `lấy từ` trong `--kiem`, và `GIO_LAY_TU` trong mã).

---

## 8. Ba tầng — cái nào tới học viên bằng cách nào

| Tầng | Nội dung | Ở đâu | Dung lượng |
|---|---|---|---|
| **0** | Bảng nhỏ 5–20 hàng, nhúng thẳng vào khối code của bài | `scripts/pe-da/dulieu/tang0.{py,md,json}` | 20,7 KB |
| **1** | Một tuần liền mạch (08–14/09/2025), **395 hàng** | `scripts/pe-da/dulieu/tang1/` | 29,9 KB |
| **2** | Bảng đầy 17 938 hàng + 3 bảng tra | `frontend/public/static/da-dulieu/` | 1,29 MB (gzip 181 KB) |
| **R** | Bộ CC0 thật, **đã bỏ cột `card`** | `frontend/public/static/da-dulieu/coffee-sales-cc0.csv` | 150 KB (gzip 24 KB) |

**Tầng 0 và tầng 1 KHÔNG cần việc nền tảng nào** — chúng chép-dán vào khối code như hôm nay.
Tầng 2 và tầng R **cần một cơ chế nạp file vào worker chưa có** (xem §9).

**Tầng 1 là MỘT TUẦN LIỀN MẠCH, không phải 400 hàng bốc ngẫu nhiên:** bốc ngẫu nhiên thì
mất cấu trúc ngày/giờ, mà đó đúng là thứ tầng 1 tồn tại để có. 395 hàng, cả hai quầy, ≥ 200
giá trị cho histogram/boxplot.

**Và tầng 1 được bảo đảm chứa ít nhất một ca của MỖI khiếm khuyết** (đo được: `thanh_toan`
rỗng 4 · `mon` bẩn 4 · trùng 2 · lệch tổng 2). Theo tỉ lệ tự nhiên, một tuần ~400 hàng chỉ
gặp 0,8 dòng lệch tổng — tức phần lớn các tuần KHÔNG có ca nào, và PD09/PD10/PD30 chạy trên
tầng 1 sẽ "sạch" một cách giả tạo. Hạn mức tối thiểu đó nằm ở `TANG1_TOI_THIEU`.

### ⚠️ Vì sao tầng 2 KHÔNG nằm trong `frontend/public/static/da/`

Đã đọc mã: `chep_anh()` trong `build.py` làm

```python
for cu in ANH_DICH.iterdir():
    if cu.name not in can:
        cu.unlink()
```

tức nó **XOÁ mọi file trong `static/da/` mà không bài nào khai là ảnh**. Một `.csv` đặt ở
đó bị xoá IM LẶNG ở lần `py scripts/pe-da/build.py` kế tiếp; một THƯ MỤC CON thì làm
`Path.unlink()` ném `PermissionError` trên Windows và **build.py chết**. Nhánh đó chỉ chạy
khi gói ảnh gốc có trên máy — và nó **có** trên máy người soạn (`ANH_NGUON` tồn tại, đã
kiểm).

Nên tầng 2 đi sang thư mục **anh em** `static/da-dulieu/`: cùng origin, nên CSP
`connect-src 'self'` của ba worker (`next.config.ts`) vẫn phủ được, và `check.py` chỉ
`ANH.glob('*.png')` không đệ quy nên nó không thấy gì lạ.

---

## 9. Việc CHƯA làm — đừng tưởng là đã xong

**Chưa có đường nào để một file dữ liệu tới được worker.** Đo được: `studio-lesson.worker.js`
và `studio-harness.py` không có `FS.writeFile`, không có cơ chế nạp file; worker chỉ biết
`step_4.packages` → `loadPackage`. Nên **tầng 2 và tầng R hôm nay là file nằm trên đĩa, chưa
bài nào đọc được.** Tầng 0 và tầng 1 thì dùng được ngay.

Cơ chế đó chạm **năm chỗ**, và đợt này cố ý KHÔNG động vào chỗ nào:

1. `build.py` phát trường mới (ví dụ `step_4.dataFiles`);
2. `src/course-admin/studio-lesson.schema.ts` — **cửa duy nhất vào DB**; không nới schema
   thì một cơ chế chạy đúng trong trình duyệt vẫn không có đường tới học viên (đúng lỗi đã
   xảy ra với 124 bài tập được chấm);
3. `studio-lesson.worker.js` + `python-studio.worker.js` fetch rồi `FS.writeFile`;
4. `check.py` chặn khai file không tồn tại;
5. **và đây là cái bẫy**: cả ba bộ chấm đã vá `globalThis.fetch` để **TỪ CHỐI mọi địa chỉ
   `http(s)://`** — chính hàng rào mà AGENTS.md nói "đừng gỡ". Dưới Node, worker sẽ không
   fetch được bộ dữ liệu, nên bộ chấm phải có nhánh **đọc thẳng từ đĩa**. Làm sai chỗ này
   thì hai môi trường thôi nói cùng một chuyện — đúng điều hàng rào đó ra đời để ngăn.

Việc nội dung còn lại, cũng chưa làm:

- Thống nhất từ vựng của **415 ca chấm** (`region`/`qty`/`E`/`W` → `quay`/`so_coc`/mã quầy
  thật) trong `source/practice.json` + `build.py`.
- Đổi tiêu đề **PD16** (*"nối đơn hàng với bảng khách"*) — bộ này không có bảng khách.
- Đổi project **SY25–SY28** và **GU12** sang món/nguyên liệu/đơn.
- Nếu dùng `nhiet_do_nuoc` cho scatter VZ05: thêm `"nhiệt độ nước"` vào `loaiTru` của miền
  thời tiết trong `boi-canh.json` — **đừng xoá từ khoá**, xoá là mất luôn phép dò bảng dữ
  liệu thời tiết.

---

## 10. Cách kiểm

```bash
py -I scripts/pe-da/gen_dulieu.py --kiem            # sinh + in toàn bộ số đo
py -I scripts/pe-da/gen_dulieu.py --kiem --cc0 <index.csv>   # đo lại bộ CC0 và so
py -I scripts/pe-da/gen_dulieu.py --chep-cc0 <index.csv>     # chép bộ CC0, bỏ cột card
```

**Dựng hai lần phải ra file giống hệt từng byte.** Đó là điều kiện để
`update-lesson-content.ts` (in sha256 cũ → mới) còn so được, và để một lần dựng lại không
đổi dữ liệu dưới chân người đang học dở:

```bash
py -I scripts/pe-da/gen_dulieu.py && sha256sum frontend/public/static/da-dulieu/don_hang.csv
py -I scripts/pe-da/gen_dulieu.py && sha256sum frontend/public/static/da-dulieu/don_hang.csv
```

**Và nó phải ổn định cả khi `PYTHONHASHSEED` đổi** — đây là bẫy đã cắn repo này một lần:
`random.Random(hash(chuoi))` băm theo `PYTHONHASHSEED` ngẫu nhiên mỗi tiến trình, nên mỗi
lần dựng ra một bộ khác. Mọi luồng ở đây là `random.Random(f'{SEED_GOC}/<tên luồng>')`, và
`random.seed()` với `str` đi qua **sha512** chứ không qua `hash()`:

```bash
for s in 0 1 999999; do PYTHONHASHSEED=$s py -R scripts/pe-da/gen_dulieu.py >/dev/null; \
  sha256sum frontend/public/static/da-dulieu/don_hang.csv; done   # ba dòng phải GIỐNG NHAU
```
