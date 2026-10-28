import { HAN_LUU_NGAY, LEARNING_EVENT_KINDS } from './learning-event-kinds';

/**
 * SỰ ĐỒNG Ý cho lớp ghi nhật ký lần thử — phần logic thuần, không chạm DB.
 *
 * ============================================================================
 * VÌ SAO FILE NÀY TỒN TẠI, VÀ VÌ SAO NÓ CHẶN ĐƯỜNG BẬT LỚP GHI
 * ============================================================================
 * Lớp ghi nhật ký đã dựng xong và đang TẮT. Cổng duy nhất của nó hôm nay là
 * `let dongY = false` trong `frontend/src/lib/learning-events.ts` — tức một cổng
 * Ở PHÍA CLIENT. Một cổng ở client KHÔNG PHẢI bằng chứng đồng ý: nó không nói
 * được ai đã đồng ý, lúc nào, và đồng ý với ĐIỀU GÌ; và nó biến mất cùng
 * localStorage. Máy chủ thì hôm nay không kiểm gì cả — `LearningEventsController`
 * nhận lô và ghi thẳng.
 *
 * Luật 91/2025 (Dữ liệu cá nhân) + Nghị định 356/2025 đưa dữ liệu THEO DÕI HÀNH
 * VI vào nhóm NHẠY CẢM, và Điều 9(4) nói nguyên văn rằng *"sự im lặng hoặc không
 * phản hồi không được coi là sự đồng ý"*. Nên hai thứ phải có trước khi bật:
 *   1. người học CHỦ ĐỘNG bấm đồng ý (không phải mặc định bật, không phải
 *      "tiếp tục nghĩa là đồng ý");
 *   2. một BẢN GHI Ở MÁY CHỦ nói ai–lúc nào–phiên bản nào, và rút lại được.
 *
 * ============================================================================
 * PHIÊN BẢN: thứ khiến "đã đồng ý" không tự động nghĩa là "đồng ý điều này"
 * ============================================================================
 * Đây là chỗ dễ làm sai nhất và nó sai IM LẶNG. Sự đồng ý luôn là đồng ý với
 * MỘT bản mô tả cụ thể: "chúng tôi ghi lại 10 loại sự kiện này, giữ 90 ngày".
 * Ngày ai đó thêm một loại sự kiện thứ 11 — hoặc nâng hạn lưu lên 365 ngày — thì
 * bản ghi đồng ý CŨ không còn phủ việc đang làm, nhưng không có gì trong hệ
 * thống báo điều đó: hàng trong DB vẫn `granted = true`, lớp ghi vẫn chạy, và
 * dự án đang thu thập thứ chưa ai đồng ý cho.
 *
 * Nên `PHIEN_BAN` là một chuỗi NGƯỜI VIẾT (đọc được, hiện ra cho người học), còn
 * `dauAnPhamVi()` là một dấu ấn MÁY TÍNH được từ chính phạm vi thu thập. Một ca
 * test ghim cặp (phiên bản, dấu ấn): thêm/bớt một `kind` hay đổi `HAN_LUU_NGAY`
 * mà không đổi `PHIEN_BAN` là test ĐỎ kèm đúng câu phải làm. Phép ghim đó là
 * thứ duy nhất làm cho "mở rộng phạm vi" không lọt qua được dưới sự đồng ý cũ.
 *
 * Dấu ấn tính trên danh sách ĐÃ SẮP, có lý do: đổi thứ tự khai trong
 * `LEARNING_EVENT_KINDS` không đổi phạm vi thu thập, nên nó không được làm người
 * học phải đồng ý lại. Thứ ĐƯỢC tính là tập hợp tên loại và con số hạn lưu.
 *
 * ============================================================================
 * KHÔNG TƯƠNG THÍCH NGƯỢC, CÓ CHỦ ĐÍCH
 * ============================================================================
 * `conHieuLuc()` trả về false khi phiên bản lệch — kể cả lệch vì bản ghi CŨ HƠN.
 * Nghĩa là mỗi lần đổi `PHIEN_BAN` thì MỌI người học phải đồng ý lại, và lớp ghi
 * tắt trong lúc chờ. Đó là cái giá đúng: hướng lệch ở đây không đối xứng — coi
 * sự đồng ý cũ là còn hiệu lực thì thu thập thứ chưa được phép (hỏng không sửa
 * được, dữ liệu đã nằm trong DB), còn hỏi lại một lần nữa thì chỉ bất tiện.
 */

/**
 * Phiên bản của BẢN MÔ TẢ mà người học đồng ý với. Đổi phạm vi thu thập (thêm
 * `kind`, đổi `HAN_LUU_NGAY`) thì PHẢI đổi chuỗi này — `learning-event-consent.spec.ts`
 * ghim cặp (phiên bản, dấu ấn) nên quên là test đỏ.
 *
 * Dạng ngày tháng chứ không `v1`/`v2`: khi đọc một hàng trong DB sáu tháng sau,
 * "2026-10-28" nói ngay bản mô tả nào, còn "v3" thì phải đi tra.
 */
export const PHIEN_BAN_DONG_Y = '2026-10-28';

/**
 * Dấu ấn của PHẠM VI thu thập: tập tên loại sự kiện (đã sắp) + hạn lưu.
 *
 * Không phải hash mật mã — nó chỉ cần ĐỔI khi phạm vi đổi và GIỮ NGUYÊN khi chỉ
 * đổi thứ tự khai. Để nguyên dạng đọc được (số loại + hạn + tên nối) thay vì một
 * chuỗi hex: khi ca test đỏ, thông điệp phải nói ĐƯỢC cái gì vừa đổi.
 */
export function dauAnPhamVi(): string {
  const ten = [...LEARNING_EVENT_KINDS].sort().join(',');
  return `${LEARNING_EVENT_KINDS.length}loai/${HAN_LUU_NGAY}ngay/${ten}`;
}

/** Một quyết định đã ghi ở DB. `null` = người học chưa được hỏi bao giờ. */
export type BanGhiDongY = {
  granted: boolean;
  version: string;
} | null;

/**
 * Bản ghi này có cho phép ghi nhật ký NGAY BÂY GIỜ không?
 *
 * Ba câu trả lời khác nhau, và chúng không được gộp:
 *   · `null`           → chưa hỏi  → PHẢI hỏi, và KHÔNG được ghi;
 *   · `granted: false` → đã từ chối → KHÔNG ghi, và cũng không hỏi lại
 *                        (hỏi lại mỗi lần mở bài là ép đồng ý bằng cách làm
 *                        phiền — xem `canHoiLai()`);
 *   · phiên bản lệch   → đã đồng ý với bản mô tả KHÁC → không ghi, phải hỏi lại.
 */
export function conHieuLuc(
  ban: BanGhiDongY,
  phienBan = PHIEN_BAN_DONG_Y,
): boolean {
  if (!ban) return false;
  if (!ban.granted) return false;
  return ban.version === phienBan;
}

/**
 * Có nên HIỆN hộp xin đồng ý không?
 *
 * Tách khỏi `conHieuLuc` vì hai câu hỏi khác nhau và "không ghi" KHÔNG đồng nghĩa
 * "phải hỏi". Người đã từ chối thì không hỏi lại ở phiên bản ĐÓ — nếu hỏi lại
 * thì mỗi lần mở bài họ lại thấy một hộp phải bấm, và một hộp xuất hiện mãi là
 * cách ép đồng ý bằng sự mệt mỏi, tức sự đồng ý đó không còn là tự nguyện.
 *
 * Nhưng phiên bản MỚI thì hỏi lại CẢ người đã từ chối: bản mô tả đã khác, nên
 * câu trả lời cũ không phải là câu trả lời cho câu hỏi mới.
 */
export function canHoiLai(
  ban: BanGhiDongY,
  phienBan = PHIEN_BAN_DONG_Y,
): boolean {
  if (!ban) return true;
  return ban.version !== phienBan;
}
