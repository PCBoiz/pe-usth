# Bản đồ: từ một cái vực thành một thế giới

Ghi ngày 19/10/2026, theo ý chủ sản phẩm. ĐÂY LÀ KIẾN TRÚC, CHƯA DỰNG.

## Hiện tại — một khoá, một cái vực

Chỉ có `python_advanced`. Bản đồ là mặt cắt dọc MỘT cái vực: tám gian khoét vào
vách của cùng một cái hố, thang độ sâu chạy dọc lề. Chiều sâu là thứ kể chuyện,
và nó kể đúng: các chặng sau khó hơn, nhưng vẫn vào thẳng được.

## Sau này — nhiều khoá, nhiều vùng đất

Khi có thêm khoá (Frontend, Backend, AI Engineer…), mỗi khoá thành MỘT VÙNG ĐẤT
trên một bản đồ thế giới rộng hơn. Cái vực Python nâng cao là một trong số đó.

Người học thấy hai tầng bản đồ:
- **Thế giới** — các vùng đất kề nhau, mỗi vùng một ngành. Chọn ngành muốn đi.
- **Vùng** — bổ dọc vùng đó ra, thành cái vực như bản hiện tại. Chọn chặng.

## Điều đó ràng buộc gì vào CÁCH DỰNG hôm nay

1. `scripts/map/build_map.py` phải sinh được NHIỀU vực, không chỉ một. Hình thái
   (độ sâu, số tầng, bảng màu, hình bóng từng gian) là THAM SỐ, không viết cứng.
2. `lib/world-map.ts` giữ vai nguồn sự thật, nhưng phải mở rộng được thành danh
   sách vùng, mỗi vùng một danh sách gian — đừng khoá cứng con số 8.
3. Tên tệp SVG mang mã vùng: `python-advanced/world-map.svg`, không phải
   `world-map.svg` ở gốc. Đổi sau tốn hơn đổi bây giờ.
4. Hình bóng mỗi gian phải RÚT RA ĐƯỢC từ nội dung chặng, vì vùng mới sẽ cần
   hình bóng mới mà không ai vẽ tay kịp.

## Điều KHÔNG được làm

- Không khoá vùng. Luật "vào đâu cũng được" áp cho cả hai tầng bản đồ.
- Không xếp hạng vùng theo độ khó bằng số. Độ khó kể bằng hình, như độ sâu.
- Không vẽ vùng cho khoá CHƯA CÓ. Bản đồ thế giới với sáu vùng xám "sắp có" là
  hứa một thứ không tồn tại — đúng loại lỗi đã dọn khắp sản phẩm hôm 15/10.
