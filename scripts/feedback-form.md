# Khảo sát thử nghiệm khoá Advanced Python — bảng câu hỏi

Bộ câu hỏi cho buổi thử ngày 14/10/2026 với giảng viên/cố vấn USTH và sinh viên.
File này để soát lại nội dung mà không phải đọc code; bản dựng form thật nằm ở
[`scripts/feedback-form.gs`](feedback-form.gs) (chạy `taoForm` trên script.google.com).

- **21 câu**: 20 câu nội dung + 1 ô liên hệ tuỳ chọn.
- **12 câu bắt buộc**, trong đó 11 câu chỉ cần một lần bấm; câu bắt buộc duy nhất phải viết
  là câu 20 ("sửa MỘT thứ").
- **Thời gian điền ước tính 3–5 phút** (khoảng 1,5–2 phút cho 18 câu chọn/thang, 1,5–3 phút cho
  3 câu tự luận).
- **Ẩn danh**: `setCollectEmail(false)`, không hỏi tên hay email bắt buộc.
- Chia 4 trang (`addPageBreakItem`) để chỉ bấm "Tiếp" 3 lần: gộp 5 phần nội dung vào 4 trang.
- Lấy xong **LINK ĐIỀN** thì đặt vào biến `NEXT_PUBLIC_FEEDBACK_URL` (trang chủ chỉ dựng thẻ
  "Góp ý cho chúng tôi" khi biến này là một URL http/https hợp lệ — xem
  `frontend/src/lib/feedback-link.ts`).

## Bảng câu hỏi

| # | Câu hỏi | Loại | Lựa chọn / nhãn thang | Bắt buộc |
|---|---|---|---|---|
| — | **Phần 1 · Về bạn** (tiêu đề mục) | — | Chỉ để tách nhóm khi đọc kết quả | — |
| 1 | Bạn thử khoá học với vai trò nào? | Một lựa chọn | Giảng viên USTH / Cố vấn – chuyên gia được mời / Sinh viên USTH / Sinh viên trường khác / Khác (tự ghi) | **Có** |
| 2 | Hôm nay bạn học được tới bài thứ mấy? | Một lựa chọn | Chưa xong bài 1 / Bài 1–2 / Bài 3–5 / Bài 6–10 / Bài 11–20 / Hơn 20 bài | **Có** |
| — | **Phần 2 · Cảm nhận chung** (tiêu đề mục) | — | — | — |
| 3 | Mức độ hài lòng tổng thể với khoá học? | Thang 1–5 | 1 = rất không hài lòng … 5 = rất hài lòng | **Có** |
| 4 | Chất lượng nội dung (đúng kiến thức, đủ sâu, sát giáo trình USTH)? | Thang 1–5 | 1 = rất kém … 5 = rất tốt | **Có** |
| 5 | Sẵn sàng giới thiệu cho đồng nghiệp / sinh viên khác đến mức nào? | Thang 1–5 | 1 = chắc chắn không giới thiệu … 5 = chắc chắn sẽ giới thiệu | **Có** |
| — | **Phần 3 · Quy trình học và độ khó** (sang trang) | — | Mô tả nhắc lại thứ tự một bài: lý thuyết → đề bài → giải thích → dự đoán → ngộ nhận → viết code → mini-game | — |
| 6 | Thứ tự lý thuyết → đề bài → giải thích → làm bài → mini-game có hợp lý không? | Thang 1–5 | 1 = rất rối, sai thứ tự … 5 = rất hợp lý, đi đúng mạch | **Có** |
| 7 | ĐỘ KHÓ của phần **lý thuyết**? | Thang 1–5 (điểm giữa là lý tưởng) | 1 = quá dễ … 3 = vừa sức … 5 = quá khó | **Có** |
| 8 | ĐỘ KHÓ của phần **viết code** (tự viết hàm rồi chạy test)? | Thang 1–5 (điểm giữa là lý tưởng) | 1 = quá dễ … 3 = vừa sức … 5 = quá khó | **Có** |
| 9 | Cách diễn đạt (câu chữ, thuật ngữ, ví dụ) dễ hiểu đến đâu? | Thang 1–5 | 1 = rất khó hiểu … 5 = rất dễ hiểu (mô tả ghi rõ: 1 = phải đọc lại nhiều lần, 5 = đọc một lượt là nắm) | **Có** |
| — | **Phần 4 · Sơ đồ, trắc nghiệm và mini-game** (sang trang) | — | Mô tả: bỏ qua ba câu đầu nếu chưa gặp sơ đồ nào | — |
| 10 | Sơ đồ / đồ thị động có giúp bạn hiểu bài hơn không? | Thang 1–5 | 1 = không giúp gì … 5 = giúp rất nhiều | Không |
| 11 | Sơ đồ có dễ hình dung / dễ theo dõi không? | Thang 1–5 | 1 = rất khó hình dung … 5 = rất dễ hình dung | Không |
| 12 | Chữ và nhãn TRONG sơ đồ có đọc được không? | Một lựa chọn | Đọc rõ ở mọi chỗ / Đa số rõ, vài chỗ chữ nhỏ / Nhiều chỗ chữ quá nhỏ, phải phóng to / Chữ bị tràn hoặc đè lên nhau / Chưa thấy sơ đồ nào / Khác | Không |
| 13 | SỐ LƯỢNG câu trắc nghiệm trong một bài (≈5 câu/bài)? | Một lựa chọn | Quá ít / Hơi ít / Vừa đủ / Hơi nhiều / Quá nhiều, thấy mệt | **Có** |
| 14 | SỐ LƯỢNG mini-game trong một bài (≈4–5 game/bài)? | Một lựa chọn | Quá ít / Hơi ít / Vừa đủ / Hơi nhiều / Quá nhiều, thấy mệt | **Có** |
| 15 | Nếu phải BỎ hoặc GIẢM, bạn bỏ loại nào? | Nhiều lựa chọn | Ghép cặp / Điền chỗ trống / Sắp xếp dòng code (parsons) / Săn lỗi / Bảng lần vết biến / Sửa code sai / Tự giải thích bằng lời / Đúng–sai / Trận Boss cuối chặng / Câu hỏi dự đoán trước khi làm bài / Không bỏ loại nào / Khác | Không |
| — | **Phần 5 · Tốc độ, sự cố và ý kiến** (sang trang) | — | Mô tả: lần đầu phải nạp bộ chạy Python ~10 MB | — |
| 16 | Lần ĐẦU bấm Chạy, phải chờ Python nạp khoảng bao lâu? | Một lựa chọn | Gần như không phải chờ / Dưới 5 giây / 5–15 giây / 15–30 giây / Hơn 30 giây / Chờ mãi không xong – báo lỗi | Không |
| 17 | Sau khi nạp xong, các lần bấm Chạy / Nộp sau có mượt không? | Thang 1–5 | 1 = rất chậm … 5 = rất mượt (mô tả ghi rõ: 1 = giật, phải chờ lâu; 5 = có kết quả gần như ngay) | Không |
| 18 | Bạn gặp lỗi hay sự cố gì? | Tự luận dài | Gợi ý ghi: bài nào, đang làm gì, màn hình báo gì, trình duyệt/máy nào | Không |
| 19 | Điều bạn THÍCH NHẤT ở khoá học này? | Tự luận dài | — | Không |
| 20 | Nếu chỉ được sửa MỘT thứ trước khi dạy thật, bạn sửa gì? | Tự luận dài | Gợi ý: nêu một thứ cụ thể, không cần dài | **Có** |
| 21 | (Tuỳ chọn) Email hoặc tên nếu đồng ý để hỏi thêm | Tự luận ngắn | Bỏ trống hoàn toàn được | Không |

## Vì sao thang độ khó đi ngược hướng các thang khác

Hầu hết câu thang trong form này là thang **một chiều**: càng cao càng tốt (5 = rất hài lòng,
5 = rất dễ hiểu, 5 = rất mượt). Cộng trung bình các câu đó rồi đọc "điểm càng cao càng ổn" là
đúng.

Hai câu 7 và 8 — độ khó lý thuyết và độ khó code — **không** như vậy. Khoá học hỏng theo hai
hướng trái ngược: quá khó thì sinh viên bỏ giữa bài, mà quá dễ thì giảng viên thấy nhạt và
không ai học được gì. Nếu đặt thang "càng cao càng tốt" thì không có cách nào phân biệt hai lỗi
đó: một khoá nhạt toẹt và một khoá vừa sức đều có thể cho điểm cao. Nên thang độ khó lấy
**điểm giữa (3) là lý tưởng**: 1 = quá dễ, 3 = vừa sức, 5 = quá khó. Khi đọc kết quả thì nhìn
**phân bố và độ lệch khỏi 3**, không nhìn trung bình đơn thuần — trung bình 3,0 có thể là "mọi
người thấy vừa" mà cũng có thể là "một nửa thấy quá dễ, một nửa thấy quá khó", và hai tình
huống đó cần hai cách sửa khác nhau.

Vì dễ hiểu nhầm thành "5 điểm mới là tốt", mô tả của cả hai câu đều ghi thẳng rằng thang này
khác các thang trên và điểm giữa mới là tốt, kèm nghĩa từng mức (1 = quá dễ, 2 = hơi dễ,
3 = vừa sức, 4 = hơi khó, 5 = quá khó).

Hai câu 13 và 14 (số lượng trắc nghiệm / mini-game) cũng là thang "điểm giữa là lý tưởng",
nhưng để dạng **một lựa chọn có nhãn chữ** (Quá ít … Vừa đủ … Quá nhiều) chứ không phải thang
số — với câu hỏi về số lượng thì nhãn chữ đọc là hiểu ngay, không cần giải thích hướng thang.

## Khi đọc kết quả

- Tách theo câu 1 (giảng viên/cố vấn so với sinh viên): hai nhóm này thường lệch nhau ở độ khó.
- Đọc câu 7, 8, 13, 14 cùng với câu 2 (học tới bài thứ mấy). Người mới xong bài 1–2 chỉ thấy
  phần đầu chặng "Tiến trình và subprocess", chưa gặp pandas/Matplotlib.
- Các câu về sơ đồ (10, 11, 12) hiện chỉ áp dụng cho những bài đã có hình minh hoạ động; ai
  chưa gặp hình thì bỏ trống, nên số câu trả lời của ba câu này sẽ ít hơn các câu khác.
