# Programming EDU — Hệ thống thiết kế v2 + Hướng dẫn câu chữ cho người tự học

Rà ngày 14/10/2026 trên 9 màn: `Main`, `Path`, `Tokens`, `Theory`, `Theory2`, `TheoryBook`, `Unlock`, `Lab`, `Review` (`Review.dc.html` xuất hiện lúc 15:57 trong khi đang rà, đã gộp vào). Đối chiếu câu chữ với app đang chạy ở `d:\pe_usth\frontend\src\components\python-studio\` và dữ liệu bài ở `scripts\pe-v4\out-advanced\lessons\*.json`.

**Cách làm.** Đã nạp skill `design:design-system` (khung audit token/thành phần) và `design:ux-copy` (khung CTA/lỗi/trạng thái trống). Không có skill tên `design` riêng, nên phần đó làm tay. Kiểm kê giá trị bằng script `scratchpad/ds-audit/inventory.py`. Tương phản tính bằng công thức độ chói tương đối WCAG 2.x, script ở `scratchpad/ds-audit/contrast.py`. Màu trong suốt được trộn lên nền thật rồi mới đo.

---

## 0. Mười chỗ lệch quan trọng nhất

1. **Còn dấu vết thi đua và chuỗi ngày, ngược với triết lý đã chốt.** Ba chỗ cụ thể:
   - Thanh trên `Main` và `Review` vẫn có mục **"Đấu trường"**. Hai link lại trỏ hai file khác nhau (`Arena.dc.html` và `ArenaHost.dc.html`), và cả hai file đều không có.
   - Biểu tượng **ngọn lửa + "5/7 ngày"** xuất hiện ở `Main`, `Path`, `Review`, `Unlock`. Đây là một kiểu chuỗi ngày trá hình: nghỉ hai hôm là con số tụt.
   - `Tokens` ghi màu hoàng thổ dùng cho "ngày nghỉ an toàn". Đó là khái niệm "đóng băng chuỗi", tức là đang mặc định có chuỗi.
2. **Hứa "đo thật" với thread, nhưng trình duyệt chỉ mô phỏng.** `Lab` ghi "CPython 3.12 thật". `Unlock` ghi "Trang 4 sẽ cho bạn đo thật". `Main` ghi "trang sẽ cho bạn đo thật". Trong khi chính dữ liệu bài nói khác:
   - T03 `step_4.env`: "Trình duyệt không chạy được thread thật, nên Studio MÔ PHỎNG threading".
   - T04 dùng "ĐỒNG HỒ ẢO".

   Mấy câu đó là sai sự thật, cần khối ghi chú trung thực.
3. **Màn này nói không khoá, màn kia vẽ ổ khoá.**
   - `Main` ghi "chưa học không có nghĩa là bị khoá".
   - `Path` vẽ ổ khoá ở T04–T06 và ghi "Mở khi đủ 6 trang".
   - `Tokens` định nghĩa trạng thái "Chưa mở = nét đứt + ổ khoá".
   - App có câu "Chặng tiếp theo đã mở khoá" (`RecapScreen.tsx:58`). Grep frontend và backend không thấy cơ chế khoá chặng nào.
4. **"Trang" mang ba nghĩa cùng lúc:**
   - bài học (T03 = "Trang 3");
   - trang giấy trong sổ lý thuyết (`TheoryBook` đánh số trang 1–6, có nút "Trang trước/Trang sau");
   - cỡ chữ "56 / 800 · trang" trong `Tokens`.

   App và DB đều gọi là **bài**. Một màn còn trộn "màn", "phần", "bước", "trang" để chỉ cùng một thứ.
5. **Dữ liệu lệch giữa các màn:**
   - T03 ghi "~25 phút" ở `Main`, nhưng dữ liệu bài và `TheoryBook` đều là 30 phút.
   - Thanh tiến độ trong bài có 12 màn, nhưng `Unlock` ghi "7 / 9 màn".
   - Thẻ ôn: `Main` ghi "3 câu · 2 phút", `Review` ghi "5 thẻ · khoảng 6 phút".
   - Tên T01, T02, T05, T06 ở `Path` bị rút gọn khác tên bài thật.
6. **Màu trong thực tế nhiều gấp tám lần bảng Tokens.** Tokens khai 8 màu. Các màn thực tế dùng **66 mã hex + 26 giá trị rgba**, chưa có tên. Trong đó:
   - 3 biến thể tím nhạt;
   - 3 biến thể đỏ nhạt;
   - 3 biến thể vàng nhạt;
   - 4 biến thể "đỏ trên nền tối";
   - 2 biến thể số dòng code.
7. **Chế độ Ban đêm của `Main` hỏng tương phản** vì màu tím bị code cứng:
   - `a{color:#6E2BA8}` trên `#16120E` chỉ đạt **2,28:1**. Link "Góp ý" trượt AA.
   - Viền vòng "Bạn ở đây" trên nền `here` tối chỉ đạt **1,84:1**.
   - `Review` có tím đêm `#C99BEF`, còn `Main` thì không có.
8. **Thang chữ và khoảng cách vỡ:**
   - Có **21 cỡ chữ** khác nhau (13 → 56px).
   - 12 chỗ dùng 13px. Nhãn 14px dùng 84 lần, trong khi Tokens chốt nhãn 15px.
   - Nhiều câu văn đầy đủ chỉ 16px, dưới mức thân ≥ 17px đã chốt.
   - Khoảng một nửa số lần dùng `gap` (≈130/260) không nằm trên lưới 4px.
9. **Một màu đang gánh nhiều vai đối nghịch.**
   - Phấn đỏ `#9C3B22` dùng đồng thời cho: lời mời đoán, ghi chú bên lề, cảnh báo, "chưa đúng", "Boss", và bộ đếm ngày.
   - Trong hình động, `run()` màu đỏ ở `Theory` nhưng màu tím ở `TheoryBook`.
10. **Lộ thuật ngữ của nhóm thiết kế ra câu chữ người học đọc.** Ví dụ: "khung phấn đỏ" (`Lab`), "Màn hình in ra", "Boss", "IDE" lẫn với "Bàn thí nghiệm". Nút hình động ghi "Chạy" lại trùng với nút chạy code.

---

## 1. Hệ thống thiết kế

### 1.1 Kiểm kê thực tế (đếm bằng script)

| Hạng mục | Tokens khai | Thực tế dùng | Nhận xét |
|---|---|---|---|
| Màu hex | 8 màu chính, 3 bộ nền | **66 mã** + 26 rgba | Nền kem có 7 sắc gần như trùng nhau (`#FBF7EE #FFFDF8 #FFFCF5 #F6EFE1 #F4ECDD #EFE6D3 #EFE4CC`) |
| Cỡ chữ | 56/32/22/18/15 + mono 16 | **21 cỡ**: 13 14 15 16 17 18 19 20 21 22 24 28 30 32 36 38 40 44 46 52 56 | 14px dùng 84 lần, 13px dùng 12 lần |
| Độ đậm | 400/600/700/800 | 400 500 600 700 800 | 500 chỉ dùng 2 lần, bỏ được |
| Bo góc | chưa khai | 2 4 6 8 9 10 12 14 16 18 999 50% | Thẻ dùng lẫn 12/14/16 |
| Nét viền | chưa khai | 1 · 1,5 · 2 · 2,5 · 3 · 3,5 · 4 · 5 px | 8 độ dày |
| Khoảng cách `gap` | chưa khai | 21 giá trị (1 → 52) | 1, 2, 3, 5, 6, 7, 10, 14, 18, 22, 30 nằm ngoài lưới 4 |
| Giãn chữ nhãn | 0.1em | 0.06 / 0.08 / 0.1em | |
| Line-height | chưa khai | 19 giá trị | |

### 1.2 Bảng lệch (file · giá trị · nên là)

| File | Giá trị đang dùng | Nên là | Vì sao |
|---|---|---|---|
| Main, Path, Review, Unlock | Ngọn lửa + `5/7 ngày` màu `sanguine` | Bỏ khỏi thanh trên và Unlock. Ở Main thay bằng con số chỉ cộng dồn (xem 2.3) | Là chuỗi ngày trá hình, và còn dùng phấn đỏ, vốn là màu "chú ý" |
| Main, Review | Mục nav "Đấu trường" → `Arena.dc.html` / `ArenaHost.dc.html` | Bỏ. Nav chuẩn: Bản đồ · Ôn tập · Bàn thí nghiệm | Thi đua; link hỏng; canvas ghi "đấu trường đang nghiên cứu lại" |
| Tokens | "Hoàng thổ — … ngày nghỉ an toàn" | "Hoàng thổ — đã xong, phần thưởng" | Không có chuỗi thì không cần ngày nghỉ an toàn |
| Tokens, Path | Trạng thái "Chưa mở = nét đứt + ổ khoá" | "Chưa học = nét đứt + số bài", vẫn bấm được | Trái với Main và với quyền tự chọn |
| Tokens | Trạng thái "Boss — vòng kép phấn đỏ" | "Bài tổng hợp chặng — vòng kép" | "Boss" mang nghĩa đánh trận |
| Main | Nút "Xong" trên bản đồ: nền `#EFE4CC` + huy hiệu tròn `#8A5A0F` có dấu tích | Nền `ink`, dấu tích `page` như Tokens; hoặc sửa Tokens cho khớp | Một trạng thái hiện ra hai hình |
| Path | Nhãn 13px (11 chỗ), tab dưới 13px | Nhãn ≥ 15px, tab 15px/700 | Dưới mức nhãn đã chốt |
| Path | `#E2CFA8`, `#DCCBAA`, `#4A3B2C` trên thẻ tối | `on-ink-soft` `#E2CFA8`, `on-ink-line` `#4A3B2C` | Gộp 2 sắc kem gần trùng |
| Main (BẠN Ở ĐÂY) | 13px/800, giãn 0.06em | Chip 15px/700, giãn 0.08em | Thang nhãn |
| Theory, Theory2 | Code nội dòng nền `#F4ECDD` | `tint` `#F6EFE1` (TheoryBook đã dùng) | Hai sắc gần trùng |
| Theory | Viền nhấn `#F3E9FB`, `#F8F1FD` | `violet-tint` `#F5EAFB` | Gộp |
| Theory, Review | `#FDF5F1`, `#FBF0EB` | `sanguine-tint` `#FBF1EC` | Gộp |
| Theory, Review | `#FBF3E2`, `#FAF3E3` | `ochre-tint` `#FBF4E4` | Gộp |
| Theory2, TheoryBook, Lab, Review | Đỏ trên nền code `#F0A58C`, `#E08A6B`, `#F0C9A8`, `#EC9277` | Một màu: `sanguine-on-dark` `#EC9277` (7,3:1 trên code, 6,8:1 trên ink) | 4 sắc cho cùng một vai |
| Lab, TheoryBook, Review | Tím trên nền code `#C98BF0`, `#E3C4FA` | `violet-on-dark` `#C99BEF` (7,7:1) | Gộp |
| Theory2 | Số dòng `#A8957A` | `code-num` `#A8977F` | Gộp |
| Main (đêm) | `a{color:#6E2BA8}`, viền "here" `#6E2BA8`, chip `#6E2BA8`, huy hiệu `#8A5A0F` code cứng | Đọc từ bảng theo nền: `violet` đêm `#C99BEF`, `ochre` đêm `#E0B062` | Trượt AA (2,28:1 và 1,84:1) |
| Main | Đầu đề "Trang tiếp theo · ~25 phút" | "Bài tiếp theo · khoảng 30 phút" | Dữ liệu bài: `estimated_minutes = 30` |
| Theory, TheoryBook | `run()` đỏ (Theory) / tím (TheoryBook) | Quy ước: **nơi gọi = tím, thread con = đỏ**, kết quả in = hoàng thổ | Màu mã hoá khái niệm phải giống nhau giữa các màn |
| Lab | Nút bước dùng `button:disabled{opacity:.4}` | Trạng thái tắt: viền `sketch`, chữ `soft`, không dùng opacity | Opacity 0,4 cho 2,42:1 |
| Review | Phương án không chọn bị mờ `opacity: 0.6` | Giữ nguyên màu chữ, đổi viền sang `line` và bỏ đậm | Còn 4,29:1, trượt AA |
| Lab | Số dòng `#A8977F` trên dòng tô tím | Khi dòng được tô, số dòng chuyển sang `code-meta` `#C9B48C` (6,19:1) | Hiện 4,41:1, trượt |
| Mọi màn | Nút chính: `15/26`, `15/30`, `0/26 min-h 50`, `0/28 min-h 52`, `13/22` | `btn-primary`: cao tối thiểu 52, đệm ngang 28, chữ 17/800 | 5 biến thể |
| Mọi màn | Nút phụ: viền ink 2px / viền tím 2px / nền tím nhạt + chữ `#4F1D7A` / viền `line` 1,5px | `btn-secondary` = viền ink 2px. Bỏ hai biến thể tím. "Xem lại" dùng `btn-quiet` | 4 biến thể |
| Mọi màn | Bo thẻ 12 / 14 / 16 / 18 | Thẻ 16, khối con 12, ô/dòng 8, code nội dòng 4 | |
| Mọi màn | Eyebrow 13/14/15px, 700/800, 0.06–0.1em | `label` 15/700/0.08em, in hoa, màu `soft` | |
| Mọi màn | Mũi tên ký tự `→ ← ↗ ▶︎` trong nút | Icon SVG (chevron 18px, nét 2,4) | Đã chốt dùng SVG; TheoryBook vừa dùng SVG vừa dùng `↗` |
| TheoryBook | Đầu trang "Sổ tay nhà phát minh"; Main viết "Sổ tay **của** nhà phát minh" | Một tên: "Sổ tay nhà phát minh" | |

### 1.3 Bộ token đề xuất

#### Màu: nền và mực (3 bộ nền)

| Token | Kem (mặc định) | Trắng ấm | Ban đêm | Dùng cho |
|---|---|---|---|---|
| `page` | `#FBF7EE` | `#FFFFFF` | `#16120E` | Nền trang |
| `card` | `#FFFFFF` | `#FAF8F4` | `#221C16` | Thẻ, ô nhập |
| `paper` | `#FFFCF5` | `#FFFFFF` | `#1B1611` | Thanh trên, bản đồ, mặt giấy sổ, nút chưa học (thay `#FFFDF8`) |
| `tint` | `#F6EFE1` | `#F0ECE4` | `#2A231C` | Khối ghi chú nhẹ, code nội dòng (thay `#F4ECDD`) |
| `desk` | `#EFE6D3` | `#EDE8DE` | `#3A2F25` | Nền bàn quanh sổ, lưới bản đồ, nền nút "đã xong" (thay `#EFE4CC`) |
| `line` | `#E7DCC6` | `#E8E2D6` | `#3A2F25` | Viền trang trí, đường kẻ. Không dùng làm ranh giới thành phần cần nhận ra |
| `sketch` | `#8E7652` | `#8A8378` | `#A99272` | Nét đứt "chưa học", viền nút đang tắt, rãnh thanh tiến độ (≥ 3:1) |
| `ink` | `#2A2017` | `#22201C` | `#F2EBDD` | Chữ chính |
| `soft` | `#5E4630` | `#55504A` | `#CDBFA6` | Chữ phụ, nhãn |

#### Màu: nhấn

Nhấn chỉ có 4 họ. Mỗi họ gồm: màu đậm, màu nhạt (`-tint`) và màu dùng trên nền tối (`-on-dark`).

| Token | Nền sáng | `-tint` (nền nhạt) | `-on-dark` / bộ Ban đêm | Vai trò ngữ nghĩa (duy nhất) |
|---|---|---|---|---|
| `violet` | `#6E2BA8` | `#F5EAFB` | `#C99BEF` | **Vị trí và lựa chọn**: Bạn ở đây, đang chọn, liên kết, nơi gọi trong hình |
| `violet-deep` | `#4F1D7A` | – | – | Hover/nhấn của link và nút chính, chữ trên `violet-tint` |
| `action` | `#7A2BB8` (chữ trắng 7,33:1) | – | Nền `#C99BEF` + chữ `#16120E` (8,36:1) | **Chỉ** nền nút chính |
| `glow` | `#B93FF0` | – | – | Chỉ quầng sáng (rgba 0,2). **Không** đặt chữ lên trên (4,17:1) |
| `sanguine` | `#9C3B22` | `#FBF1EC` | `#EC9277` | **Chú ý**: đoán trước, ngộ nhận, cẩn thận, chưa đúng, thread con trong hình |
| `ochre` | `#8A5A0F` | `#FBF4E4` | `#E0B062` | **Đã có**: đúng, đã xong, XP, kết quả in ra |

**Quy tắc kèm theo.**
- Đúng và chưa đúng phải luôn có **icon + chữ** ("Đúng" / "Chưa đúng"), không phân biệt chỉ bằng màu, vì palette không có xanh lá.
- Bộ đếm ngày không được dùng màu nào trong bảng trên, vì đã bỏ hẳn bộ đếm ngày.

#### Màu: khung code (dùng chung mọi màn)

| Token | Giá trị | Trên `#221A13` |
|---|---|---|
| `code-bg` | `#221A13` | – |
| `code-line` | `#3D3127` | (đường kẻ) |
| `code-fg` | `#EFE6D2` | 13,81:1 |
| `code-meta` | `#C9B48C` | 8,48:1 |
| `code-num` | `#A8977F` | 6,04:1 (trên dòng tô tím phải đổi sang `code-meta`) |
| `code-kw` | `#F2B880` | 9,75:1 |
| `code-str` | `#C8DDA0` | 11,68:1 |
| `code-mark-violet` | `#C99BEF` + nền `rgba(185,63,240,.28)` | 7,69:1 (chữ `code-fg` trên dòng tô: 10,08:1) |
| `code-mark-sanguine` | `#EC9277` | 7,30:1 |
| `code-mark-ochre` | `#E0B062` | 8,62:1 |
| `on-ink-soft` | `#E2CFA8` | 10,42:1 trên `ink` |
| `on-ink-line` | `#4A3B2C` hoặc `rgba(page, .25)` | (đường kẻ) |

#### Chữ: một họ Be Vietnam Pro, code dùng JetBrains Mono

| Token | Cỡ / đậm / line-height | Điện thoại | Dùng cho | Thay cho |
|---|---|---|---|---|
| `display` | 56 / 800 / 1.05, giãn −0.02em | 40 | Tiêu đề màn tổng: Main, Review, Unlock | 52, 56 |
| `h1` | 44 / 800 / 1.08 | 36 | Tiêu đề màn trong: Theory, Lab, TheoryBook | 44, 46, 52 |
| `key` | 38 / 800 / 1.2 | 30 | Câu "Ý chính" | 38, 40 |
| `h2` | 28 / 800 / 1.2 | 26 | Thẻ gợi ý, tiêu đề mục | 24, 28, 32, 36 |
| `h3` | 22 / 700 / 1.3 | 20 | Câu hỏi, tiêu đề thẻ | 20, 21, 22, 24 |
| `lead` | 20 / 600 / 1.45 | 19 | Câu dẫn, trích dẫn, dòng phụ đề hình | 19, 20 |
| `body` | 18 / 400 / 1.55 | 18 | **Mọi câu văn đầy đủ** | 16 (khi là câu), 17, 18, 19 |
| `ui` | 17 / 600–800 / 1.4 | 17 | Nút, chip lớn, nav, phương án | 16, 17 |
| `label` | 15 / 700 / 1.3, in hoa, giãn 0.08em | 15 | Eyebrow, tiêu đề nhỏ, tab dưới | 13, 14, 15 |
| `meta` | 15 / 500 / 1.45 | 15 | Ngày, số trang, ghi chú nguồn (không phải câu hướng dẫn) | 14, 15 |
| `code` | JetBrains Mono 16 / 400–600 / 1.6–1.9 | 16 | Khối code. Code nội dòng: 0.9em, tối thiểu 16px | 0.85/0.86/0.9em, 15–17 |

**Quy tắc.** Không có chữ nào nhỏ hơn 15px. Câu nào người học cần đọc để biết phải làm gì thì từ 17px trở lên.

#### Khoảng cách: lưới 4, bước chính 8

`space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 20 · `space-6` 24 · `space-8` 32 · `space-10` 40 · `space-12` 48 · `space-16` 64.

Quy đổi:
- 1–3 → 4
- 5–7 → 8, hoặc 4 nếu là cặp nhãn/giá trị
- 10 → 8 hoặc 12
- 14 → 12 hoặc 16
- 18 → 16 hoặc 20
- 22 → 24
- 26–30 → 24 hoặc 32
- 36 → 32 hoặc 40

Lề trang: `gutter` 44 trên máy tính (giữ lại vì dùng thống nhất ở mọi màn, và 44 vẫn nằm trên lưới 4), 16 trên điện thoại. Vùng chạm tối thiểu 44 × 44.

#### Bo góc, nét viền, độ nổi, chuyển động

| Token | Giá trị | Dùng cho |
|---|---|---|
| `r-xs` | 4 | Code nội dòng, ô trống trong code |
| `r-sm` | 8 | Dòng code, ô biến, chip vuông |
| `r-md` | 12 | Khối con, callout, phương án trắc nghiệm, khung code nhỏ |
| `r-lg` | 16 | Thẻ, panel, khung code lớn, bìa sổ |
| `r-pill` | 999 | Nút, chip |
| `r-round` | 50% | Nút trạng thái bài, nút icon tròn |
| `bw-1` | 1px | Viền thẻ, đường chia |
| `bw-2` | 2px | Viền thành phần bấm được, nét đứt trạng thái, thẻ đang mở |
| `bw-3` | 3px | Vòng nhấn trong hình động, focus ring (`outline 3px violet, offset 3px`) |
| `bw-rail` | 4px | Thanh nhấn trái/trên của callout |
| `shadow-open` | `0 6px 22px rgba(42,32,23,.08)` | Thẻ đang mở. Chỉ một mức nổi |
| `halo` | `0 0 0 8px rgba(185,63,240,.2)` | "Bạn ở đây" |
| `dur-fast` / `dur-base` / `dur-page` | 200 / 320 / 450 ms | Phản hồi / hiện ra / lật trang. Chỉ đổi transform và opacity, tắt hết khi người dùng bật `prefers-reduced-motion` |

```css
:root{
  --page:#FBF7EE;--card:#FFFFFF;--paper:#FFFCF5;--tint:#F6EFE1;--desk:#EFE6D3;
  --line:#E7DCC6;--sketch:#8E7652;--ink:#2A2017;--soft:#5E4630;
  --violet:#6E2BA8;--violet-deep:#4F1D7A;--violet-tint:#F5EAFB;--action:#7A2BB8;--on-action:#FFFFFF;
  --sanguine:#9C3B22;--sanguine-tint:#FBF1EC;--ochre:#8A5A0F;--ochre-tint:#FBF4E4;
  --code-bg:#221A13;--code-line:#3D3127;--code-fg:#EFE6D2;--code-meta:#C9B48C;--code-num:#A8977F;
  --code-kw:#F2B880;--code-str:#C8DDA0;--mark-violet:#C99BEF;--mark-sanguine:#EC9277;--mark-ochre:#E0B062;
  --on-ink-soft:#E2CFA8;
}
:root[data-theme="dark"]{
  --page:#16120E;--card:#221C16;--paper:#1B1611;--tint:#2A231C;--desk:#3A2F25;
  --line:#3A2F25;--sketch:#A99272;--ink:#F2EBDD;--soft:#CDBFA6;
  --violet:#C99BEF;--violet-tint:#2E2238;--action:#C99BEF;--on-action:#16120E;
  --sanguine:#EC9277;--sanguine-tint:#33201A;--ochre:#E0B062;--ochre-tint:#2B2416;
}
```

### 1.4 Thành phần lặp lại

| Thành phần | Cấu trúc chuẩn | Lệch hiện tại cần gom |
|---|---|---|
| **Thanh trên (màn tổng)** | Logo + tên · nav 3 mục **Bản đồ · Ôn tập · Bàn thí nghiệm** (pill; mục đang ở có nền `ink`, chữ `page`, kèm `aria-current`) · bên phải chỉ một lối vào "Sổ của tôi". Không có bộ đếm | Main: 3 mục có Đấu trường; Review: 4 mục; Path (điện thoại): 4 tab khác tên. Bộ đếm lửa và XP nằm ở thanh trên |
| **Thanh trên (trong bài)** | Nút đóng tròn 48 (`aria-label="Đóng bài, về lộ trình"`) · thanh tiến độ theo màn · **chữ hiện "Màn 2 / 12"** · mã + tên bài | Theory/Theory2 chỉ có số trong `aria-valuetext`; rãnh `#E7DCC6` chỉ đạt 1,34:1 |
| **Tab dưới (điện thoại)** | 3–4 tab, icon 24 + nhãn 15/700, cao ≥ 64 | Path: nhãn 13px; tab "Sổ tay" có icon người, nghĩa mơ hồ |
| **Thẻ bài (lesson card)** | Nút trạng thái tròn 52 · `label` "T04 · chưa học" · tiêu đề `ui` 17/600 · bấm được ở **mọi** trạng thái | Path: 13px, có ổ khoá, tên bài rút gọn |
| **Nút trạng thái bài** | Đã xong (nền `ink` + dấu tích) · Bạn ở đây (`violet` + halo + icon chạy) · Chưa học (nét đứt `sketch` + số bài) · Bài tổng hợp chặng (vòng kép `sanguine`) | Bản đồ Main dùng hình khác cho "đã xong"; Path dùng ổ khoá |
| **Nút chính** | Nền `action`, chữ trắng 17/800, pill, cao 52, đệm ngang 28, chevron SVG 18 | 5 biến thể kích thước |
| **Nút phụ** | Viền `ink` 2px, nền trong suốt, 17/700, cao 48 | Thêm biến thể viền tím, nền tím nhạt, viền `line` |
| **Nút yên (quiet)** | Chữ `violet` 17/700 có gạch chân, không viền: "Tự chọn bài", "Bỏ qua" | Review dùng đúng kiểu này; nên dùng cho mọi lựa chọn thay thế |
| **Nút icon** | 48 × 48, `r-round`, viền `ink` 2px; nút bước chính của Lab thêm nhãn chữ "Bước sau" | Path 44 không viền; Lab vuông bo 10; TheoryBook 52 |
| **Chip trạng thái** | 15/700, cao 32, đệm ngang 12, pill. Biến thể: *đặc* (nền màu ngữ nghĩa + chữ trắng) và *viền* (viền 2px + nền `card`) | 13/14/17px; viền 1,5px |
| **Khối "hệ thống gợi ý"** | Nền `ink`, chữ `page`. Bốn phần theo thứ tự: (1) `label` "Gợi ý bước tiếp · hệ thống chọn"; (2) tiêu đề `h2`; (3) **"Vì sao:"** + lý do trích từ dữ liệu của chính người học; (4) nút chính, rồi đường kẻ, rồi "Đây là gợi ý, không phải lệnh" + 1–2 nút yên cho lựa chọn khác | Review làm đủ. **Main thiếu "Vì sao" và thiếu lựa chọn khác** |
| **Khối ghi chú trung thực** | Nền `paper`, viền nét đứt `sketch` 2px, `r-md`, icon "i" SVG 18. Mở đầu bằng câu in đậm nói **cái gì là thật, cái gì không**, sau đó nêu nguồn | Review (chân trang) là mẫu tốt. Thiếu ở Lab, Theory2, TheoryBook (thread mô phỏng) và Unlock (đồng hồ ảo) |
| **Callout** | Thanh nhấn trái 4px, nền `-tint`, `r-md`, đệm 16/20, `label` có icon. Biến thể: `note` (sanguine, lead in nghiêng) · `caution` (sanguine, icon tam giác, tiêu đề "Cẩn thận") · `misconception` (sanguine, icon tròn, "Ngộ nhận hay gặp") · `key` (rail sanguine, chữ `key`) | Theory2: viền đủ 4 cạnh 2px; TheoryBook: rail; Unlock/Lab: viền 2px. Ba kiểu cho cùng một vai |
| **Khối dự đoán** | Callout `note` + radiogroup phương án (cao ≥ 54, viền `ink` 1,5→2px, đang chọn = nền `violet` chữ trắng). Dưới cùng có dòng "Chưa có đáp án ở đây…" | Path: bong bóng nghiêng; Lab: hộp viền đỏ |
| **Phản hồi sau trả lời** | Rail 5px `ochre`/`sanguine` + nền `-tint`. Đầu đề "Đúng" / "Chưa đúng" kèm icon. Câu giải thích lấy từ `detail`. Nếu sai thì thêm "Đáp án đúng: …" | Review chuẩn. Áp lại cho game trong app |
| **Khung code** | `code-bg`, `r-lg`; thanh đầu cao 48 gồm tên file + "Python 3.12 · chạy trong trình duyệt"; dòng tô có rail 4px | Đầu khung chỉ ghi "Python 3.12" |
| **Thanh tiến độ** | Rãnh `sketch` viền 1,5px hoặc nền `desk` + chữ hiện "x / n". Phần đã xong `ink`, đang ở `violet` | Rãnh `line` 1,34:1, không có chữ |

### 1.5 Tương phản WCAG AA: số đo trên cặp chữ/nền thật

Chuẩn đạt: chữ thường ≥ 4,5:1; thành phần giao diện và đồ hoạ cần nhận ra ≥ 3:1. Các số trong `Tokens.dc.html` đã được kiểm lại và **đều đúng** (14,9 · 8,2 · 6,4 · 5,5 · 7,6 · 7,3 · 4,2 · 4,0).

| Cặp (màn) | Tỉ lệ | Kết quả |
|---|---|---|
| ink / page · card · paper · desk · sanguine-tint | 14,91 · 15,94 · 15,56 · 12,85 · 14,34 | Đạt (AAA) |
| soft / page · card · tint `#F6EFE1` · desk | 8,20 · 8,77 · 7,66 · 7,07 | Đạt (AAA) |
| sanguine / page · card · sanguine-tint · tint | 6,41 · 6,86 · 6,17 · 5,99 | Đạt |
| ochre / page · card · ochre-tint · paper | 5,53 · 5,92 · 5,40 · 5,77 | Đạt (sát ngưỡng; không dùng cho chữ < 15px) |
| violet / page · card · violet-tint · tint | 7,63 · 8,16 · 7,01 · 7,13 | Đạt (AAA) |
| `#4F1D7A` / violet-tint (Lab "Xem từng bước") | 10,09 | Đạt |
| trắng / action `#7A2BB8` · violet · sanguine · ochre · ink | 7,33 · 8,16 · 6,86 · 5,92 · 15,94 | Đạt |
| **trắng / `#B93FF0`** | **4,17** | **Trượt**. Đúng như Tokens ghi: chỉ dùng cho quầng sáng |
| page / ink (thẻ tối); page 80% · 85% / ink | 14,91; 9,97 · 11,12 | Đạt |
| `#E2CFA8` · `#DCCBAA` / ink (Path) | 10,42 · 9,99 | Đạt (gộp còn một màu) |
| `#E3C4FA` / ink (link trong khối gợi ý của Review) | 10,28 | Đạt |
| code-fg · meta · num · kw · str / code-bg | 13,81 · 8,48 · 6,04 · 9,75 · 11,68 | Đạt |
| code-fg / dòng tô tím (Lab) | 10,08 | Đạt |
| **code-num `#A8977F` / dòng tô tím (Lab)** | **4,41** | **Trượt**. Đổi sang `#C9B48C`: 6,19 |
| **ink mờ 60% / card (Review, phương án không chọn)** | **4,29** | **Trượt** |
| **ink mờ 40% / card (nút tắt ở Lab, TheoryBook)** | **2,42** | Được miễn vì là nút tắt, nhưng nên dùng `soft` + viền `sketch` |
| sketch / paper · page (nét đứt "chưa học") | 4,21 · 4,04 | Đạt (≥ 3:1) |
| **line `#E7DCC6` / bar (rãnh tiến độ Theory)** | **1,34** | **Trượt** 1.4.11 nếu rãnh là thông tin "còn bao nhiêu màn". Cần chữ "x / 12" hoặc rãnh `sketch` |
| line / card (viền thẻ, nút "Xem lại" của Review) | 1,36 | Trang trí thì được. **Nút "Xem lại" chỉ có viền `line`** → nên dùng `btn-secondary` |
| quầng tím 20% / page | 1,30 | Chấp nhận được vì vòng "Bạn ở đây" có viền violet 3,5px (7,63) và chip chữ |
| Trắng ấm: ink · soft · sketch | 16,26 · 7,52 · 3,75 | Đạt |
| Đêm: ink / page · card; soft / card | 15,71 · 14,21; 9,31 | Đạt |
| Đêm: sanguine · ochre · violet `#C99BEF` | 7,94 · 8,47 · 7,56 | Đạt |
| **Đêm: `a{#6E2BA8}` / page (link "Góp ý" ở Main)** | **2,28** | **Trượt** |
| **Đêm: viền "here" `#6E2BA8` / `#2E2238` (Main)** | **1,84** | **Trượt** 1.4.11. Dùng `#C99BEF`: 6,72 |
| Đêm: nền nút `#7A2BB8` / page | 2,54 | Chữ trên nút vẫn đọc tốt (7,33), nhưng nút chìm vào nền. Nên dùng nền `#C99BEF` + chữ `#16120E`: 8,36 |
| Đêm: link `#6E2BA8` trên thẻ ink sáng `#F2EBDD` (Review) | 6,88 | Đạt |
| Đêm: line / page | 1,43 | Chỉ trang trí |

---

## 2. Câu chữ cho người tự học

### 2.1 Hướng dẫn câu chữ (1 trang)

**Giọng.** Hệ thống là người dẫn đường kiên nhẫn đi cạnh người học, không phải thầy chấm bài.
- Xưng **"bạn"**. Hệ thống tự gọi mình là "hệ thống" khi cần nói rõ ai đề xuất.
- Mỗi lời gợi ý phải có **"Vì sao"** lấy từ dữ liệu của chính người học.
- Mỗi lời gợi ý phải **chừa lối khác** ("hoặc…", "Bỏ qua", "Tự chọn bài").
- Không thúc ép, không gây áy náy ("quá hạn", "còn thiếu", "phải"), không so sánh với ai.

**Năm luật.**
1. **Chỉ cộng dồn, không lấy lịch làm mẫu số.** Viết "Bạn đã xong 3 bài tuần này", không viết "5/7 ngày". Nghỉ thì không có gì tụt.
2. **Nói thật về máy chạy.** Trình duyệt mô phỏng thread và dùng đồng hồ ảo, nên không bao giờ viết "đo thật" hay "CPython thật". Hướng người học sang máy tính của họ nếu cần số đo thật.
3. **Sai là dữ liệu, không phải lỗi của người.** Viết "Chưa đúng", không viết "Sai rồi". Luôn kèm lời giải thích của phương án vừa chọn.
4. **Một việc, một từ.** Dùng đúng bảng thuật ngữ bên dưới. Từ kỹ thuật Python (thread, override, class con) giữ nguyên như trong bài.
5. **Ngắn trước, chi tiết sau.** Nút: động từ + đích, ≤ 4 từ. Câu hướng dẫn: ≤ 25 từ. Câu nào dài hơn thì tách.

**Thuật ngữ chuẩn**

| Dùng | Nghĩa | Không dùng |
|---|---|---|
| **khoá** | Advanced Python | khóa (viết thống nhất kiểu hoá/khoá/hoạ) |
| **chặng** (M1…M8) | Một nhóm bài. Mỗi chặng có tên cỗ máy, ví dụ "Khung cửi song song" | module, vùng; "8 cỗ máy" khi dùng làm đơn vị đếm |
| **bài** (T03) | Một bài học, gọi bằng mã + tên: "T03 · Subclass Thread" | trang, trang 3 |
| **màn** | Một bước trong bài (12 màn/bài), giống app | phần, trang |
| **trang** | **Chỉ** trang giấy trong sổ lý thuyết | – |
| **bước** | Một bước chạy trong Bàn thí nghiệm | màn |
| **Bàn thí nghiệm** | Trình soạn và chạy Python | IDE, Python IDE, Thí nghiệm |
| **Ôn tập / thẻ ôn / hộp** | Lặp lại ngắt quãng | câu đến hạn, quá hạn |
| **bài tổng hợp chặng** | Bài cuối chặng ("Bản vẽ cỗ máy") | Boss, trận Boss, hạ Boss |
| **dự đoán** (tên màn) / **đoán** (động từ) | – | – |
| **ngộ nhận hay gặp** | – | ngộ nhận thường gặp |
| **cẩn thận** | – | cảnh báo |
| **đã xong** | – | hoàn thành (trong nhãn trạng thái), xong (đứng một mình) |
| **chưa học** | – | chưa mở, bị khoá |
| **kết quả in ra** | – | màn hình in ra, đầu ra (trong cùng một màn) |
| **Python trên máy tính của bạn** | – | máy thật, máy lab |

**Mẫu câu**

| Tình huống | Mẫu | Ví dụ |
|---|---|---|
| Gợi ý bước tiếp | **[Việc]** · Vì sao: [dữ kiện của bạn]. + Đây là gợi ý, không phải lệnh. + [Lối khác] | "Ôn 2 thẻ rồi mở T03. Vì sao: T03 dựng tiếp trên `start()`/`join()` của T02, mà thẻ T02 đang chờ bạn ôn. — Bỏ qua ôn, mở T03 luôn · Tự chọn bài" |
| Lỗi chạy code | Chuyện gì xảy ra + vì sao (nếu biết) + làm gì tiếp | "Chương trình dừng ở dòng 14: `RuntimeError: thread.__init__() not called`. `__init__` chưa gọi `super().__init__()`. Thêm dòng đó rồi chạy lại." |
| Trả lời chưa đúng | Chưa đúng + giải thích phương án bạn chọn + đáp án đúng + bước tiếp không phạt | "Chưa đúng. Đó là hành vi của `run(timeout=…)`, không phải `communicate`. Đáp án: …. Thẻ này sẽ gặp lại bạn ngày mai." |
| Lỗi hệ thống | Cái gì không chạy + dữ liệu có an toàn không + lối khác | "Chưa tải được Python trong trình duyệt. Bài làm của bạn vẫn được giữ. Thử tải lại, hoặc đọc tiếp phần lý thuyết trong lúc chờ." |
| Trạng thái trống | Đây là gì + vì sao trống + bắt đầu thế nào (không có lời trách) | "Chưa có thẻ ôn. Thẻ ôn được tạo từ câu bạn trả lời trong bài. Học xong một bài là có thẻ đầu tiên." / "Hôm nay hết thẻ ôn. Thẻ tiếp theo gặp bạn thứ Sáu 16/10." |
| Quay lại sau thời gian nghỉ | Chào ấm, không đếm ngày vắng + bạn đang ở đâu + bước nhẹ để vào lại + lối khác | "Chào bạn quay lại. Lần trước bạn dừng ở T03, màn 4/12. Muốn khởi động bằng 3 thẻ ôn ngắn (khoảng 3 phút), hay mở tiếp T03?" (tuyệt đối không viết "Bạn đã vắng 12 ngày") |
| Thẻ ôn để lâu | Thẻ chờ, không bị phạt | "Thẻ này đã chờ bạn từ thứ Hai. Không có gì bị trừ." |
| Ghi chú dữ liệu mẫu (thiết kế/bản demo) | **In đậm cái giả**, sau đó nêu cái thật và nguồn | "**Dữ liệu mẫu để minh hoạ.** Số lần vấp và lịch 14 ngày là số giả. Câu hỏi và phản hồi chép nguyên từ bài P02, P05, P06, T01, T02." |
| Ghi chú môi trường chạy | Cái được mô phỏng + hệ quả + cách xem bản thật | "Trong trình duyệt, thread được **mô phỏng**: `run()` chạy ngay khi `start()`. Thứ tự in có thể khác khi chạy bằng Python trên máy tính của bạn." |
| Xong bài | Bạn vừa làm được gì + bạn giữ lại gì + 2 lối đi | "Xong T03. Khung cửi có thêm một bánh răng. — Nghỉ ở đây · Mở T04" |

**Chính tả.**
- Thập phân dùng dấu phẩy (1,5 giây), hàng nghìn dùng dấu chấm (1.240).
- Dấu "≈" dính liền số.
- Giờ/ngày viết "thứ Tư 14/10".
- Tên code để trong `code`, không dịch.
- Dấu ngoặc kép kiểu “…”.

### 2.2 Bảng sửa chữ (file · cũ · mới · lý do)

| File | Chuỗi cũ | Chuỗi mới | Lý do |
|---|---|---|---|
| Main | Nav "Đấu trường" | (bỏ) | Thi đua; link hỏng |
| Main, Review, Path | "5/7 ngày" + icon lửa; tooltip "Số ngày học trong 7 ngày qua" | (bỏ khỏi thanh trên) | Chuỗi trá hình |
| Main, Review | "1.240 XP" ở thanh trên | Chuyển vào "Sổ của tôi". Màn xong bài vẫn hiện "+20 XP" | Phần thưởng nên là chuyện riêng, không treo thường trực |
| Main | "Advanced Python · 8 cỗ máy · 48 trang" | "Advanced Python · 8 chặng · 48 bài" | Thuật ngữ |
| Main | "Nét mực đặc là đoạn đã đi; nét chấm là đoạn còn phác. Chặng chưa học vẫn mở được — chưa học không có nghĩa là bị khoá." | "Nét đặc là đoạn bạn đã đi, nét chấm là đoạn chưa học. Chặng nào cũng mở được, cứ bắt đầu từ chỗ bạn muốn." | Ngắn hơn, nói thẳng quyền chọn; 16 → 18px |
| Main | aria "…bạn đang ở đây, 2 trên 6 trang" | "…bạn đang ở đây, xong 2 trên 6 bài" | Thuật ngữ |
| Main | "Trang tiếp theo · ~25 phút" | "Gợi ý bước tiếp · khoảng 30 phút" | Dữ liệu bài là 30 phút; đóng khung là gợi ý |
| Main | "Đoán trước khi mở trang. Đoán sai cũng được — trang sẽ cho bạn đo thật." | "Vì sao bài này: bạn vừa xong T02, và T03 dùng tiếp `start()`/`join()`. Đoán trước rồi mở bài, đoán sai cũng là cách học." | Thêm "Vì sao"; bỏ "đo thật" |
| Main | "Mở trang 3 →" | "Mở T03" + chevron SVG; thêm nút yên "Tự chọn bài" | Thuật ngữ, có lối khác |
| Main | "Nhịp tuần này" + 7 chấm, ngày nghỉ là chấm đứt | "Tuần này" · "Bạn đã xong 2 bài và ôn 9 thẻ." (bỏ 7 chấm) | Chấm đứt làm nổi ngày vắng |
| Main | "5 trên 7 ngày. Nghỉ một ngày không làm mất gì — ở đây không có chuỗi để đứt." | "Nghỉ bao lâu cũng không mất gì: tiến độ và thẻ ôn đợi bạn." | Câu cũ phủ nhận chuỗi ngay sau khi đếm chuỗi |
| Main | "Đến hạn ôn" · "3 câu từ Xưởng phân thân" · "Ôn 2 phút" | "Thẻ ôn đang chờ" · "5 thẻ · khoảng 6 phút" · "Ôn ngay" | "Đến hạn" mang áp lực; số liệu khớp với Review |
| Main | "Góp ý cho chúng tôi — khảo sát 3 phút" | "Góp ý cho nhóm làm khoá (khoảng 3 phút)" | Rõ ai nhận góp ý |
| Path | "2 / 6 trang · cỗ máy còn thiếu 4 bánh răng" | "Xong 2 / 6 bài · đã lắp 2 bánh răng" | Cộng dồn, không nói "thiếu" |
| Path | "T01 · xong" / "Thread và tài nguyên" | "T01 · đã xong" / "Thread, tài nguyên và concurrency" | Thuật ngữ; giữ tên bài thật |
| Path | "start và join" · "Lock, race và deadlock" · "Queue và việc chạy nền" | "Thread target, start và join" · "Lock, race condition và deadlock" · "Queue và tác vụ lưu nền" | Khớp tên bài ở app và DB |
| Path | "GIL: CPU-bound và I/O-bound" + ổ khoá | "T04 · chưa học" / "GIL, CPU-bound và I/O-bound" + nút nét đứt có số | Không khoá |
| Path | "BẢN VẼ CỖ MÁY" / "Mở khi đủ 6 trang" | "Bản vẽ cỗ máy · bài tổng hợp" / "Nên làm sau 6 bài, nhưng bạn có thể thử bất cứ lúc nào" | Gợi ý, không chặn |
| Path | Tab "Sổ tay" (icon người) | "Sổ của tôi" (icon sổ) | Tránh trùng tên với "Sổ tay nhà phát minh" (bản đồ) |
| Path | Tab "Thí nghiệm" | "Bàn thí nghiệm" (hoặc "Thí nghiệm" nếu thiếu chỗ, nhưng desktop phải dùng cùng tên) | Nhất quán |
| Tokens | "Câu hỏi bỏ ngỏ, Boss, ghi chú" | "Đoán trước, ngộ nhận, cẩn thận, chưa đúng" | Bỏ Boss; khai đúng vai |
| Tokens | "Phần thưởng, XP, ngày nghỉ an toàn" | "Đúng, đã xong, phần thưởng" | Không có chuỗi |
| Tokens | "Trạng thái trang" · "Chưa mở — nét đứt + ổ khoá" · "Boss — vòng kép" | "Trạng thái bài" · "Chưa học — nét đứt + số bài" · "Bài tổng hợp — vòng kép" | Thuật ngữ, không khoá |
| Tokens | Mẫu nhãn "Trang tiếp theo" | "Bài tiếp theo" | Thuật ngữ |
| Theory | Footer "Lý thuyết · phần 1 / 2" | "Màn 1 / 12 · Lý thuyết" (đưa chữ này lên thanh trên) | "phần" là đơn vị thứ tư |
| Theory, Theory2 | `<title>` "Trang 3a · Ý chính" / eyebrow "Trang 3 · Khung cửi song song" | "T03 · Ý chính" / "M2 · Khung cửi song song" | Thuật ngữ |
| Theory | aria "Đóng trang, về lộ trình" | "Đóng bài, về lộ trình. Tiến độ đã lưu" | Bớt lo mất bài |
| Theory | Nút hình động "Dừng" / "Chạy" | "Tạm dừng hình" / "Phát tiếp" | "Chạy" trùng nút chạy code |
| Theory, TheoryBook | "Mũi tên … là chỗ dễ nhầm: nơi gọi **bấm** `start()`, nhưng chạy trong thread con lại là `run()`." | "Chỗ dễ nhầm: nơi gọi **viết** `start()`, nhưng thứ chạy trong thread con là `run()`." | Sai động từ (không ai "bấm" một lời gọi hàm) |
| Theory2 | "Máy thật báo: RuntimeError…" | "Chạy bằng Python trên máy tính, bạn sẽ gặp: RuntimeError…" | Ngầm ý trình duyệt "không thật" mà không giải thích |
| Theory2, TheoryBook | "Thử ngay trong IDE ↗" | "Chạy thử ở Bàn thí nghiệm" + icon SVG | Thuật ngữ, bỏ ký tự mũi tên |
| Theory2 | "Mở sẵn vi_du.py. Chạy, rồi so hai dòng in ra." | "Mở sẵn `vi_du.py`. Chạy rồi so hai dòng in ra. *Trong trình duyệt, thread được mô phỏng: `run()` chạy ngay khi `start()`.*" | Khối ghi chú trung thực (theo `step_4.env` của T03) |
| Theory2 | "Thread không trả giá trị — không chỗ nào nhận được `return` của `run()`" | "`run()` có `return` thì giá trị đó cũng bị bỏ: không có chỗ nào nhận nó." | Câu cũ dễ hiểu nhầm là `run()` không được viết `return` |
| TheoryBook | "Lý thuyết · 30 phút" | "Bài · khoảng 30 phút" | 30 phút là của cả bài |
| TheoryBook | "Đọc hình bên phải" | "Đọc hình động" | Trên điện thoại hình nằm bên dưới |
| TheoryBook | "Cảnh báo" | "Cẩn thận" | Thuật ngữ, bớt báo động |
| TheoryBook | "Ví dụ chạy được" | "Ví dụ chạy thử được" | Trong trình duyệt là mô phỏng |
| TheoryBook | "Màn hình in ra" | "Kết quả in ra" | Thuật ngữ ("màn" đã có nghĩa khác) |
| TheoryBook | "Mang theo sang bài tập" | "Giữ câu này khi tự viết code" | "bài tập" là thuật ngữ thứ năm |
| TheoryBook | Bộ đếm "1 / 3" (số trải trang) trong khi trang ghi số 1…6 | "Trang 1–2 / 6" | Hai hệ đếm trên cùng một màn |
| TheoryBook | aria "Tạm dừng hình động" / "Chạy tiếp hình động" | "Tạm dừng hình" / "Phát tiếp hình" | Đồng bộ với Theory |
| Unlock | "Trang 3 hoàn thành" | "Đã xong T03" | Thuật ngữ |
| Unlock | Chip "Đúng ngay lần đầu 7 / 9 màn" | "Đúng ngay lần đầu: 7 / 9 câu" | Có 12 màn, nhưng chỉ 9 câu có chấm |
| Unlock | Chip "5 / 7 ngày tuần này" | (bỏ) | Chuỗi trá hình |
| Unlock | "Ghi vào sổ — viết lại bằng lời của bạn" / "Ba ý trang này để lại. Che đi rồi tự nói lại được thì mới tính là đã học." | "Ba ý mang theo" / "Thử che danh sách rồi tự nói lại. Nói được là bạn đã nắm; chưa được thì mở lại lý thuyết." | Không có ô để "viết"; câu cũ phán xét ("mới tính là") |
| Unlock | "Trang sau · T04 · GIL — đoán trước khi mở" | "Bài tiếp · T04 · GIL — đoán trước khi mở" | Thuật ngữ |
| Unlock | "Hai việc tính toán Python thuần … trên máy 4 lõi." | "… trên máy 4 lõi (CPython có GIL)." | Khớp đề trong `011-T04.json` |
| Unlock | "Đã ghi dự đoán vào sổ. Trang 4 sẽ cho bạn đo thật — rồi so với cái bạn vừa đoán." | "Đã lưu dự đoán. Ở T04 bạn sẽ chạy thử với đồng hồ mô phỏng rồi so lại; muốn số đo thật, chạy lại trên máy tính của bạn." | T04 dùng đồng hồ ảo |
| Unlock | "Không có đáp án ở đây. Chọn một, rồi mở trang 4 để đo thật." | "Chưa có đáp án ở đây; T04 sẽ giúp bạn tự kiểm. Chọn một phương án, hoặc bỏ qua cũng được." | Trung thực, có lối khác |
| Unlock | "Mở trang 4 →" | "Mở T04" | Thuật ngữ |
| Lab | "Bàn thí nghiệm · CPython 3.12 thật" / H1 "Python IDE" | "Python 3.12 · chạy trong trình duyệt" / H1 "Bàn thí nghiệm" | Không đúng sự thật; tên không thống nhất |
| Lab | "Chưa chạy dòng nào. Bấm ▶︎ để đi từng bước." | "Chưa chạy dòng nào. Bấm **Bước sau** để chạy dòng 1." | Nút không có nhãn chữ; ký tự ▶︎ |
| Lab | "Dừng lại — đoán trước" | "Đoán trước khi bấm tiếp" | Bỏ giọng ra lệnh |
| Lab | "Mũi tên tím là mũi tên vừa đổi ở bước này; khung phấn đỏ là object vừa bị sửa. Hai biến chung một đích mũi tên là hai tên cho cùng một object — đó là chỗ mà sơ đồ cho thấy, còn bảng biến thì không." | "Mũi tên tím: vừa đổi ở bước này. Khung viền đỏ: object vừa bị sửa. Hai mũi tên chung một đích nghĩa là hai tên cho cùng một object." | Lộ thuật ngữ nội bộ ("phấn đỏ"); câu dài 44 từ |
| Lab | "dòng đang tô = dòng vừa chạy" | "Dòng tô tím: dòng vừa chạy" | Ký tự "=" trong câu văn |
| Review | Nav "Đấu trường"; "5/7 ngày"; XP | Như ở Main | |
| Review | "Hôm nay nên ôn" | "Gợi ý ôn hôm nay" | "nên" nghe như bổn phận |
| Review | "…đã quá hạn 2 ngày. Không sao, nó chỉ đợi bạn." | "…thẻ này đã chờ bạn 2 ngày. Không có gì bị trừ." | "quá hạn" gây áy náy |
| Review | "Đến hạn hộp 2 — 3 ngày." | "Tới lượt gặp lại (hộp 2, mỗi 3 ngày)." | "đến hạn" |
| Review | "Chưa đúng — không sao, đây là lúc để sai" | "Chưa đúng. Ôn là để gặp lại chỗ này." | Gọn; không phải trấn an liên tục |
| Review | "Hôm nay không còn gì phải ôn." | "Hôm nay hết thẻ ôn." | "phải" |
| Review | "Ngộ nhận · hạng 1" | "Vấp nhiều nhất · số 1" | "hạng" mang nghĩa xếp hạng |
| Review | "…thường nhanh hơn làm thêm mười câu." | "…thường gỡ nhanh hơn làm thêm câu." | "mười câu" là con số không có nguồn |
| Review | "Ngày “nghỉ” là nghỉ thật — … thẻ quá hạn chỉ đợi bạn, không bị phạt." | "Ngày “nghỉ” là nghỉ thật. Thẻ để lâu chỉ đợi bạn, không bị phạt." | Bỏ "quá hạn" và câu thanh minh về chuỗi |
| Review | Nút "Xem lại" (viền `line`) | Giữ chữ, đổi sang `btn-secondary` | Tương phản 1,36 |

### 2.3 Câu chữ app đang chạy lệch triết lý (chỉ tham chiếu, không sửa repo)

| File:dòng | Chuỗi | Đề xuất | Lý do |
|---|---|---|---|
| `components/lesson-chrome/LessonChrome.tsx:148` | 🔥 + "Chuỗi ${streak} ngày học liên tiếp" | Bỏ | Chuỗi dễ đứt; emoji |
| `python-studio/screens/RecapScreen.tsx:53,58` | "⚔️ Đã hạ Boss của chặng!" · "Chặng tiếp theo đã mở khoá." | "Đã xong bài tổng hợp chặng." · (bỏ câu mở khoá nếu không có cơ chế khoá thật) | Thi đua; grep không thấy logic khoá chặng |
| `RecapScreen.tsx:68` | 🔥 "Combo cao nhất" | Bỏ chỉ số; giữ "Đúng ngay lần đầu" | Combo là áp lực tốc độ |
| `screens/games/ParsonsGame.tsx:79` | "Bẫy! Dòng này sai vì: … Chuỗi combo bị ngắt." | "Dòng này chưa hợp: …" | Phạt; dùng từ "chuỗi" |
| `screens/SandboxScreen.tsx:99` | "⚔️ Trận Boss của chặng." | "Bài tổng hợp chặng." | Thi đua |
| `lesson-chrome/exercises/HintSheet.tsx:66` | "⚡ Mở khoá (-${cost} XP)" | "Mở gợi ý này" (không trừ XP) | Phạt người xin giúp đỡ, đi ngược tinh thần tự học |
| `cta.ts:116`, `PythonStudio.tsx:1458` | "Nộp & Chấm điểm" | "Nộp để kiểm" | Mùi thi cử |
| `RecapScreen.tsx:93`, `SandboxScreen.tsx:209`, `SandboxEditor.tsx:161` | "…thực hành trên máy lab…" / "chấm trên máy lab" | "…thực hành trên máy tính của bạn…" | "máy lab" gợi phòng máy của lớp học |
| `cta.ts:83,90`, `PythonStudio.tsx:1612`, `StudioLesson.tsx:336` | "Về khóa học" | "Về khoá học" | Thống nhất chính tả với "khoá" ở chỗ khác |
| `RecapScreen.tsx` (stats) | ⭐ 🔥 🎯 🧪 📚 | Icon SVG | Đã chốt không dùng emoji |

---

## 3. Việc cần chủ sản phẩm chốt trước khi vẽ lại

1. **XP có hiện thường trực không?** Đề xuất: chỉ hiện ở màn xong bài và trong "Sổ của tôi", vì XP vẫn có trong DB (`xp_reward`).
2. **Có khoá gì không?** Đề xuất: không khoá. "Bài tổng hợp chặng" chỉ được *gợi ý* sau 6 bài. Nếu giữ khoá thì phải bỏ câu "chưa học không có nghĩa là bị khoá" ở `Main`.
3. **Ẩn dụ "trang".** Đề xuất: giữ "Sổ tay nhà phát minh" làm tên bản đồ, nhưng đơn vị đếm là **bài**. "Trang" chỉ còn dùng trong sổ lý thuyết.
4. **Màu khái niệm trong hình động.** Đề xuất: nơi gọi = tím, thread con = đỏ, kết quả = hoàng thổ. Áp cho cả `Theory` và `TheoryBook`.
5. **Ban đêm.** Hiện chỉ `Main` và `Review` có công tắc nền. Nếu giữ chế độ này, mọi màn phải đọc màu từ token ở mục 1.3 thay vì code cứng.
6. **Tab "Sổ của tôi" chứa gì?** Đề xuất: tiến độ, XP, ghi chép "Ba ý mang theo", mã khôi phục tài khoản khách (`Review` đã nêu là đề xuất chưa có).
