# design/v4 — sổ ghi của đợt chọn giao diện (22/10/2026)

Thư mục này không phải đặc tả. Nó là ba tài liệu của một phiên làm việc đã kết thúc, cứu ra
khỏi thư mục tạm trước khi phiên bị xoá. Giữ ở nhánh `chiem-tinh` vì đây là nhánh lưu bản
chiêm tinh, và hai trong ba tài liệu nói về nó.

## Ba tài liệu

| Tệp | Nội dung | Người đọc |
|---|---|---|
| `so-sanh-chiem-tinh-lofi.md` | So hai hướng giao diện (bản đồ sao sinh bằng mã ‖ góc học lofi vẽ sẵn) và vì sao nhóm chọn lofi. Bản ghi lý do, không phải bản vận động đổi quyết định. | ai muốn biết quyết định dựa trên gì |
| `nghien-cuu-frontend.md` | Nghiên cứu kiến trúc frontend khi tách backend sang repo riêng: token đi đường nào, hai domain cần gì, sáu màn của phòng lofi so với endpoint thật, rủi ro nhúng engine vào Next 16, cân nặng tài sản. Kết bằng 14 quyết định cần người chốt. | ai dựng frontend mới |
| `backend-can-cap.md` | Danh sách bàn giao cho nhóm backend: thứ gì chặn người test ngay buổi đầu, sai endpoint, và những gì vỡ khi tách hai repo. | nhóm backend ở repo cũ |

Hai tài liệu sau dẫn `tệp:dòng`. **Đã soát lại từng chỗ dẫn ngày 22/10** trước khi commit;
chỗ nào sai đã sửa và ghi ở mục "Ghi chú soát lại" cuối mỗi tệp. Hai cụm lệch có hệ thống:
`achievements.service.ts` lệch −14 dòng và `leaderboard.service.ts` lệch −13 ở mọi chỗ dẫn.

## Ba nhánh, hiện ở đâu

| Nhánh | Đầu nhánh | Mang gì |
|---|---|---|
| `main` | `070886a` | Đã **lùi về bản tối giản `2c12049`** (14/10) bằng MỘT commit đắp lên trên — không viết lại lịch sử, nên 95 commit cũ vẫn tra cứu và cherry-pick được. Cây mã giống hệt `2c12049` (`git diff` rỗng). |
| `chiem-tinh` | `3e6cc99` | Giữ nguyên bản chiêm tinh: bộ sinh bản đồ sao (`scripts/star/`), bản đồ thế giới (`scripts/map/`), các đặc tả `design/v3/`, 79 ca `star-map.test.mjs`, và phần dọn lint backend về 2 lỗi. |
| `test` | `fa42c05` | Nhánh frontend đang đi tiếp: dashboard dựng theo Figma + mini-game. |

Hai chỗ dễ hiểu nhầm, đã kiểm bằng `git ls-tree`:

- **Bản port "góc học lofi" chưa nằm trong git.** Nó ở
  `C:\Users\sonkh\Downloads\study-room-next\goc-hoc-pe` và chưa được commit vào nhánh nào của
  `PCBoiz/pe-usth` tính tới 22/10. Nhánh `test` mang dashboard Figma, không phải phòng lofi.
- **Tiền cảnh bàn quan trắc KHÔNG ở `chiem-tinh`.** `scripts/room/`, `room-art.ts`,
  `public/map/room/*.svg` và `room-art.test.mjs` — cùng `catalog-duration.test.mjs` — chỉ có ở
  nhánh **local** `fix/danh-gia-toan-ven` (`cf4ff42`), chưa đẩy lên remote nào, dù AGENTS.md của
  `chiem-tinh` có nhắc tới chúng.
