# NOTICE — nguồn và giấy phép của dữ liệu trong thư mục này

## `coffee-sales-cc0.csv` — DỮ LIỆU CỦA NGƯỜI KHÁC

| | |
|---|---|
| Nguồn | `tablegpt/CoffeeSales` trên Hugging Face |
| Địa chỉ tải | https://huggingface.co/datasets/tablegpt/CoffeeSales/resolve/main/index.csv |
| Gốc xa hơn | Kaggle `ihelon/coffee-sales` |
| Giấy phép | **CC0 1.0 Universal (Public Domain Dedication)** — khớp ở CẢ HAI nơi (HF `cardData.license` và JSON-LD của trang Kaggle). Không cần ghi công, được phát hành lại, được sửa. |
| Ngày tải | 2026-10-29 |
| Bản gốc | 2623 hàng, 6 cột, 201 113 byte |

### Đã SỬA gì so với bản gốc, và vì sao

**Cột `card` đã bị BỎ.** Bản gốc có 1 038 mã thẻ, và thẻ nhiều nhất xuất hiện
**122 lần**. Mã đã được thay (`ANON-0000-0000-0012`) nhưng TÍNH LIÊN KẾT còn
nguyên: bảng đó nói "người này mua 122 lần, vào những giờ này". Đó là định
nghĩa của dữ liệu giả danh theo hành vi, và dữ liệu theo dõi hành vi là dữ liệu
**NHẠY CẢM** theo Luật 91/2025 + Nghị định 356/2025 — cùng lý lẽ đã buộc lớp
`learning-events` của repo này phải có cổng đồng ý ở máy chủ. Khoá học gửi file
này tới trình duyệt của học viên thật, nên cột đó không đi cùng.

Không sửa gì khác: hàng, thứ tự, giá trị, tên năm cột còn lại giữ nguyên.

### ⚠️ ĐƠN VỊ TIỀN CỦA CỘT `money` KHÔNG XÁC ĐỊNH

Giá trị chạy từ 18,12 đến 40,00. **README của bộ gốc không nói đây là tiền gì,
và vòng tra ngày 2026-10-29 không tìm ra câu trả lời.** Tác giả người Ukraine
nên UAH là khả năng — nhưng đó là SUY ĐOÁN, không phải số liệu, và nó không
được viết vào bài học như một sự thật.

Đây không phải một khiếm khuyết phải giấu: PD32 dạy nguyên văn *"khi giao báo
cáo, ghi đơn vị tiền"*, nên **việc đầu tiên phải làm với số liệu của người khác
là đi hỏi đơn vị** — và bài học nói ra đúng điều đó. Đừng quy đổi sang VNĐ: quy
đổi từ một đơn vị không biết là bịa.

Bộ dữ liệu TỰ SINH (`don_hang.csv` và ba bảng tra) thì ngược lại: đơn vị là
**VNĐ**, ghi rõ trong [LUOC-DO.md](../../../../scripts/pe-da/LUOC-DO.md).

## `don_hang.csv` · `quay.csv` · `mon.csv` · `nguyen_lieu.csv` — TỰ SINH

Sinh bởi `scripts/pe-da/gen_dulieu.py` (seed cố định 20261029), thuộc về
chính dự án này. Không mang giấy phép của bên thứ ba nào. Phân bố giờ được
HIỆU CHUẨN theo bộ CC0 ở trên — xem `--kiem` của script.
