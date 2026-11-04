/**
 * /ide trên điện thoại: KẾT QUẢ VỪA VỀ PHẢI NẰM TRONG MÀN.
 *
 * Khổ < 900px xếp dọc: nút Chạy ở TRÊN, editor cao cố định 55vh ở giữa, ô kết
 * quả ở DƯỚI. Đo trên production (04/11/2026):
 *   · 390×844 có băng "Đã khôi phục…": ô kết quả bắt đầu ở y = 888, tức nằm
 *     hẳn dưới mép màn. Chạy xong 4,9 s mà ảnh chụp GIỐNG HỆT trước khi bấm;
 *   · 390×844 không băng: thấy 85px của ô; 375×667: thấy 6px.
 * Và 55vh tính theo khung nhìn LỚN (thanh trình duyệt ẩn), nên trên máy thật
 * — khi thanh địa chỉ còn hiện — ô kết quả còn lọt xuống thấp hơn nữa.
 *
 * Hàm thuần, không đụng DOM, để ca test gọi thẳng được.
 */

/** Ô kết quả phải lọt trong màn ít nhất ngần này px — đủ dòng trạng thái và một hai dòng in ra. */
export const KET_QUA_THAY_TOI_THIEU_PX = 120;

/**
 * Có cần kéo ô kết quả vào màn không?
 *
 * Đo phần ô ĐANG lọt trong khung nhìn [0, caoMan], và đòi tối thiểu
 * min(ngưỡng, chiều cao ô) — ô thấp hơn ngưỡng thì thấy trọn là đủ. Không kéo
 * khi ô đã đủ trong màn: máy tính xếp ngang (ô kết quả bên phải editor) không
 * bao giờ bị cuộn, và người học đã tự cuộn xuống thì không bị giật thêm.
 */
export function canKeoKetQua(
  top: number,
  bottom: number,
  caoMan: number,
  nguong: number = KET_QUA_THAY_TOI_THIEU_PX,
): boolean {
  const dangThay = Math.min(bottom, caoMan) - Math.max(top, 0);
  const canThay = Math.min(nguong, bottom - top);
  return dangThay < canThay;
}
