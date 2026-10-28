import {
  canHoiLai,
  conHieuLuc,
  dauAnPhamVi,
  PHIEN_BAN_DONG_Y,
} from './learning-event-consent';

/**
 * SỰ ĐỒNG Ý — phần logic thuần.
 *
 * Ca quan trọng nhất ở đây KHÔNG phải một trong các ca `conHieuLuc`, mà là ca
 * GHIM CẶP (phiên bản, dấu ấn phạm vi) ở cuối file. Lý do: ba ca đầu kiểm một
 * hàm ba dòng, còn ca ghim kiểm một thứ không có hàm nào kiểm được — rằng người
 * sắp mở rộng phạm vi thu thập PHẢI đi qua việc đổi phiên bản đồng ý.
 *
 * Không có ca đó thì chuỗi lỗi là: ai đó thêm `kind` thứ 11 (hoặc nâng
 * `HAN_LUU_NGAY` lên 365), `PHIEN_BAN_DONG_Y` không đổi, mọi hàng trong
 * `learning_event_consents` vẫn `granted = true` và khớp phiên bản, `conHieuLuc`
 * trả về true, lớp ghi tiếp tục chạy — và dự án thu thập một loại dữ liệu chưa
 * ai đồng ý cho. Không ngoại lệ nào được ném, không log nào đỏ.
 */

describe('conHieuLuc', () => {
  it('chưa có bản ghi nào -> KHÔNG được ghi', () => {
    // `null` là người học chưa bao giờ được hỏi. Điều 9(4) của Luật 91/2025 nói
    // "sự im lặng hoặc không phản hồi không được coi là sự đồng ý", nên mặc
    // định phải là KHÔNG — và nó phải là mặc định của HÀM, không phải một nhánh
    // mà người gọi nhớ kiểm.
    expect(conHieuLuc(null)).toBe(false);
  });

  it('đã từ chối -> KHÔNG được ghi', () => {
    expect(conHieuLuc({ granted: false, version: PHIEN_BAN_DONG_Y })).toBe(
      false,
    );
  });

  it('đồng ý ĐÚNG phiên bản hiện hành -> được ghi', () => {
    expect(conHieuLuc({ granted: true, version: PHIEN_BAN_DONG_Y })).toBe(true);
  });

  it('đồng ý với phiên bản KHÁC -> KHÔNG được ghi, dù granted = true', () => {
    // Đây là cả lý do cột `version` tồn tại. Người này đã bấm đồng ý thật, với
    // một bản mô tả thật — chỉ là bản mô tả ĐÓ, không phải bản hiện hành.
    expect(conHieuLuc({ granted: true, version: '2026-01-01' })).toBe(false);
  });

  it('không tương thích ngược theo CẢ HAI chiều — kể cả phiên bản MỚI HƠN', () => {
    // Nghe lạ nhưng đúng: một hàng mang phiên bản mà mã này không biết nghĩa là
    // DB đã được một bản deploy khác ghi vào. Coi nó là hợp lệ là tin một bản
    // mô tả mình chưa đọc. Hướng lệch ở đây không đối xứng — hỏi lại thì bất
    // tiện, còn thu thập sai thì không sửa được vì dữ liệu đã nằm trong DB.
    expect(conHieuLuc({ granted: true, version: '2099-12-31' })).toBe(false);
  });
});

describe('canHoiLai', () => {
  it('chưa hỏi bao giờ -> hỏi', () => {
    expect(canHoiLai(null)).toBe(true);
  });

  it('đã TỪ CHỐI ở phiên bản này -> KHÔNG hỏi lại', () => {
    // Tách khỏi `conHieuLuc` chính là vì ca này: "không được ghi" KHÔNG đồng
    // nghĩa "phải hỏi". Hiện lại hộp mỗi lần mở bài là ép đồng ý bằng sự mệt
    // mỏi, và một sự đồng ý lấy được như thế thì không còn là tự nguyện — tức
    // nó không phải sự đồng ý theo nghĩa của luật.
    expect(canHoiLai({ granted: false, version: PHIEN_BAN_DONG_Y })).toBe(
      false,
    );
    expect(conHieuLuc({ granted: false, version: PHIEN_BAN_DONG_Y })).toBe(
      false,
    );
  });

  it('đã ĐỒNG Ý ở phiên bản này -> KHÔNG hỏi lại', () => {
    expect(canHoiLai({ granted: true, version: PHIEN_BAN_DONG_Y })).toBe(false);
  });

  it('phiên bản đã đổi -> hỏi lại CẢ người đã từ chối', () => {
    // Bản mô tả đã khác, nên câu trả lời cũ không phải câu trả lời cho câu hỏi
    // mới. Đây là nửa thứ hai của luật phiên bản: nửa đầu tắt lớp ghi, nửa này
    // mở lại đường để người học trả lời.
    expect(canHoiLai({ granted: false, version: '2026-01-01' })).toBe(true);
    expect(canHoiLai({ granted: true, version: '2026-01-01' })).toBe(true);
  });
});

describe('dauAnPhamVi', () => {
  it('KHÔNG đổi khi chỉ đổi thứ tự khai', () => {
    // Dấu ấn tính trên danh sách ĐÃ SẮP, có lý do: đổi thứ tự khai trong
    // LEARNING_EVENT_KINDS không đổi phạm vi thu thập, nên nó không được làm
    // mọi người học phải đồng ý lại. Ca này khoá tính chất đó bằng cách gọi hai
    // lần — nếu ai bỏ `.sort()` thì ca GHIM ở dưới sẽ đỏ ngay khi danh sách
    // được sắp lại, một kiểu đỏ oan rất khó hiểu.
    expect(dauAnPhamVi()).toBe(dauAnPhamVi());
    expect(dauAnPhamVi()).toMatch(/^10loai\/90ngay\/Resource\.View,/);
  });

  it('GHIM: đổi phạm vi thu thập mà quên đổi PHIEN_BAN_DONG_Y là ĐỎ ở đây', () => {
    // ĐỌC TRƯỚC KHI SỬA. Ca này đỏ nghĩa là phạm vi thu thập vừa đổi — thêm/bớt
    // một `kind`, hoặc đổi `HAN_LUU_NGAY`. Việc phải làm KHÔNG phải cập nhật
    // chuỗi dưới đây cho khớp, mà là:
    //   1. đổi `PHIEN_BAN_DONG_Y` sang ngày hôm nay;
    //   2. sửa BẢN MÔ TẢ mà người học đọc (`ConsentBanner.tsx`) cho đúng phạm
    //      vi mới — nếu không thì hộp nói một chuyện và hệ thống làm chuyện khác;
    //   3. RỒI cập nhật hai chuỗi dưới đây.
    // Bỏ qua bước 2 là chuyện ca test này không bắt được, nên nó phải nằm ở đây
    // dưới dạng một câu dặn.
    //
    // Cập nhật cả hai cùng lúc là có chủ đích: chúng là một CẶP, và ghim một cái
    // thì không chứng minh được gì.
    expect(dauAnPhamVi()).toBe(
      '10loai/90ngay/Resource.View,Run.Test,Submit,X-Lesson.Abandon,' +
        'X-Lesson.Heartbeat,X-Lesson.Open,X-Quiz.Answer,X-Repeat.Fail,' +
        'X-Run.Interrupted,X-Runtime.Failure',
    );
    expect(PHIEN_BAN_DONG_Y).toBe('2026-10-28');
  });

  it('phiên bản có dạng ngày, không phải v1/v2', () => {
    // Khi đọc một hàng trong DB sáu tháng sau, "2026-10-28" nói ngay bản mô tả
    // nào; "v3" thì phải đi tra. Ca này giữ quy ước đó khỏi trôi.
    expect(PHIEN_BAN_DONG_Y).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
