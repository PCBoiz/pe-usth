# Hệ thiết kế v3 — các quyết định gộp

Ngày 19/10/2026. Gộp ngang hàng ba nguồn: `design-system-v2.md` (nền của mình),
bản Figma của thành viên nhóm (`design/figma-member/*.png`), và ba báo cáo nghiên cứu
(bốn nền tảng học lập trình · bản đồ game và truyện · phê bình Figma).

Mỗi quyết định ghi rõ nó lấy từ đâu. Thứ gì không có ở đây thì giữ nguyên như v2.

## 1. Luật nội dung — không đổi, và áp cho MỌI màn mới

- **Không văn kể lể.** Giữ tiêu đề, bỏ câu mô tả dưới tiêu đề. Không trấn an, không
  giải thích cơ chế, không trả lời câu chưa ai hỏi, không rào đón.
  *Ngoại lệ duy nhất:* câu hiện ra lúc HỎNG — nói chuyện gì vừa xảy ra và làm gì tiếp.
- **Cốt truyện chỉ bằng hình.** Bản đồ và mini-game kể bằng địa hình, ánh sáng, độ sâu.
  Không câu bối cảnh, không lời thoại nhân vật.
- Không chuỗi ngày (dưới mọi tên — kể cả "mục tiêu tuần"), không xếp hạng, không ẩn dụ
  đánh trận, không khoá chặng, không số bịa. Chỉ tiếng Việt — không nút song ngữ.
- XP có thật và chỉ tăng, nhưng **không đặt trên thanh trên** (phê bình Figma): nó biến
  mọi màn thành bảng điểm.

## 2. Màu

- **Giao diện học: xanh–đỏ của Cao Nhân**, đúng các token `--ds-*` hiện có. 218 cặp đạt AA.
- **Bản đồ và mini-game: bảng màu minh hoạ RIÊNG**, mỗi chặng một sắc khoáng gắn với nội
  dung (báo cáo bản đồ): đồng nung · vàng tơ · kính trời · lục lam nước · tím thạch anh ·
  lục rêu · hồng lân quang · ngà. Tránh lam và đỏ của giao diện để hai lớp không lẫn.
  Bảng này **chưa đo tương phản** — phải đo trước khi đặt chữ lên nó.
- **Không lấy** nền xanh than + tím nhạt của Figma.

## 3. Bản đồ thế giới — tĩnh trong đợt thử nghiệm

Phương án A "Mặt cắt lục địa" (báo cáo bản đồ), lai Runeterra × Made in Abyss:

- **Hai trục tách nhau.** Ngang = kề nhau (vào đâu cũng được). Dọc = chất liệu đổi dần.
- **Bốn dải, không tám nấc**: mặt đất (M1 M2 M3) · nông (M4) · sâu (M5 M6 M7) · đáy (M8).
- **Đường nối chỉ ở chỗ phụ thuộc thật**: M5 → M6 → M7 → M8 (đã kiểm bằng gói thư viện
  từng bài). **Không** một nét nào nối 1→8 — một đường duy nhất là lời hứa ngầm về thứ tự,
  chính là lỗi của cả bản hiện tại lẫn bản Figma.
- **Chỗ bắt đầu báo bằng ánh sáng**: M1 trên mặt đất, sáng nhất. Không mũi tên, không số to.
- Đáy sáng lại (hồ M8) — bỏ cái nghĩa "càng sâu càng nguy hiểm".
- SVG nội tuyến, mỗi vùng một `<a href>`. Điện thoại: cuộn xuống = đi xuống.
- Giai đoạn 2 (sau thử nghiệm): tiến độ là lớp phủ. Vẽ sẵn nhóm SVG ẩn `data-lit`,
  `data-marker` ngay bây giờ.

## 4. Màn bài học

| Thứ | Lấy từ | Ghi chú |
|---|---|---|
| Đoán trước, học sau | Brilliant | Dùng `step_1.predict` sẵn có ở cả 48 bài |
| Phản hồi theo đúng đáp án sai đã chọn | Brilliant | Dùng trường `detail` sẵn có |
| Ô trống đánh số ①②③ ngay trong code | Figma | Bản mình đang hiện `···` không số |
| Đáp án gom theo ô, mỗi nhóm một nhãn | Figma | Có `bank[].slot`; thêm `slots[].hint` |
| Phản hồi từng ô, kể cả khi đúng | Figma | Bản mình chỉ báo ô sai đầu tiên |
| Đường bàn phím, thụt lề đúng, lý do bẫy | Mình | Figma kéo-thả không có bàn phím |
| **Không lộ đáp án ở lần sai đầu** | Mình | Figma lộ ngay |
| Chấm theo bậc + danh sách mục tiêu | Codédex | Gắn với `step_4.tests` |
| Lỗi gắn dòng | CodeCombat | Hộp lỗi đặt cạnh dòng sai |
| Nút "Màn trước" rõ ràng | Figma | Hiện chỉ quay được bằng thanh tiến độ |
| Bảng "Đã học / Sẽ học tiếp" trong bài | Figma | Từ `buildScreens` + bản nháp cục bộ — không cần phiên |

## 5. Mini-game mẫu — "Sổ quỹ chung" (bài T05, chặng đa luồng)

- **Triệu chứng đúng của race condition là một con số sai trong im lặng**, không phải va
  chạm (va chạm là hình của tranh chấp khoá). Hai người cùng đọc sổ ra 100, mỗi người cộng
  tiền của mình rồi ghi, người sau ghi đè — sổ ra 110 thay vì 160. Bọc hai dòng bằng
  `with khoa:` thì người sau đứng chờ ngoài cửa, sổ ra 160.
- **Động cơ: chạy → ghi vết → phát lại có thanh tua.** Bắt buộc vì Pyodide không có thread
  thật (đã đo ở T05). Bộ lập lịch mô phỏng tất định: AST biến hai hàm thành generator rồi
  chạy xen kẽ theo lịch cố định.
- Lỗi gắn dòng và thời điểm, kiểu "nhịp 4 · dòng 3".

## 6. Hạn của đợt này

- Trang chủ **không gọi API** (bẫy `apiFetch` tự tạo khách — AGENTS.md). Bản đồ tĩnh.
- Mọi tính năng cần phiên là lớp chồng lên sau, không bao giờ là điều kiện tiên quyết.
