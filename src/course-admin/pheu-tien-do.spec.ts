/**
 * Phễu tiến độ — chấm phần THUẦN, không cần `DATABASE_URL`.
 *
 * Bốn thứ đáng canh, và mỗi thứ là một cách bảng này NÓI DỐI mà không ai thấy:
 *   1. lấy `lesson_progress` làm mẫu số ⇒ ô 1 = 100% theo cấu tạo;
 *   2. đếm HÀNG thay vì đếm TÀI KHOẢN ⇒ thổi phồng khi khoá chính đổi;
 *   3. in % cho một ô đã che ⇒ trả lại đúng con số vừa giấu;
 *   4. tên chỉ số nói "người dùng" ⇒ cả đội tin vào một tỉ lệ cao hơn sự thật.
 */
import {
  CHI_SO_KHAI_TRUOC,
  dungPheu,
  GIOI_HAN,
  kiemTenChiSo,
  O_TOI_THIEU,
  type HangGhiDanh,
  type HangHoanThanh,
} from './pheu-tien-do';

const khach = (n: number): HangGhiDanh[] =>
  Array.from({ length: n }, (_, i) => ({
    userId: i + 1,
    email: `k${i + 1}@guest.local`,
  }));

const xong = (userIds: number[], sortOrder: number): HangHoanThanh[] =>
  userIds.map((userId) => ({ userId, sortOrder }));

describe('dungPheu', () => {
  it('MẪU SỐ là số đã GHI DANH, nên ô 1 KHÔNG mặc nhiên bằng 100%', () => {
    // 20 ghi danh, chỉ 6 hoàn thành bài 1. Nếu mẫu số lấy từ lesson_progress
    // thì ô 1 sẽ ra 100% và 14 tài khoản rơi ngay cửa biến mất khỏi bảng —
    // đúng ô rơi lớn nhất mà đặc tả ban đầu bỏ sót.
    const ra = dungPheu(khach(20), xong([1, 2, 3, 4, 5, 6], 1), 3);
    expect(ra.daGhiDanh).toBe(20);
    expect(ra.o[0].soTaiKhoan).toBe(6);
    expect(ra.o[0].phanTram).toBe(30);
    expect(ra.ghiDanhKhongHoanThanh).toBe(14);
  });

  it('ô "ghi danh, hoàn thành 0 bài" CŨNG bị che khi nhỏ — nó cũng là một ô', () => {
    // Bản đầu của fixture trên dùng 10 ghi danh / 6 xong ⇒ ô này bằng 4 và bị
    // che, làm ca kia đỏ. Code đúng, fixture sai — và đúng ra thì ô này phải
    // theo cùng một luật: nó cũng là một đếm tài khoản.
    const ra = dungPheu(khach(10), xong([1, 2, 3, 4, 5, 6], 1), 2);
    expect(ra.ghiDanhKhongHoanThanh).toBeNull();
  });

  it('đếm TÀI KHOẢN, không đếm HÀNG — hàng trùng không được thổi phồng ô', () => {
    const trung = [...xong([1, 2, 3, 4, 5], 1), ...xong([1, 2, 3], 1)];
    const ra = dungPheu(khach(10), trung, 2);
    expect(ra.o[0].soTaiKhoan).toBe(5);
  });

  it('bài không ai hoàn thành vẫn có một ô 0 — dãy đứt quãng giấu chỗ người ta dừng', () => {
    const ra = dungPheu(khach(10), xong([1, 2, 3, 4, 5, 6], 1), 4);
    expect(ra.o.map((o) => o.sortOrder)).toEqual([1, 2, 3, 4]);
    expect(ra.o[1].soTaiKhoan).toBe(0);
    expect(ra.o[1].cheVìÍt).toBe(false); // 0 là 0, không phải "ít quá nên che"
  });

  it(`ô dưới ${O_TOI_THIEU} tài khoản bị CHE, và % cũng bị che theo`, () => {
    const ra = dungPheu(khach(100), xong([1, 2, 3], 2), 3);
    const o2 = ra.o[1];
    expect(o2.cheVìÍt).toBe(true);
    expect(o2.soTaiKhoan).toBeNull();
    // Nếu % vẫn in thì "3,0%" trên 100 tài khoản nói lại đúng con số 3 vừa giấu.
    expect(o2.phanTram).toBeNull();
  });

  it('chỉ đếm tài khoản KHÁCH theo mặc định, và --tat-ca-tai-khoan mở rộng ra', () => {
    const tron: HangGhiDanh[] = [
      ...khach(5),
      { userId: 99, email: 'thay@truong.edu.vn' },
    ];
    const ht = xong([1, 2, 3, 4, 5, 99], 1);
    expect(dungPheu(tron, ht, 1).daGhiDanh).toBe(5);
    expect(dungPheu(tron, ht, 1).o[0].soTaiKhoan).toBe(5);
    expect(dungPheu(tron, ht, 1, false).daGhiDanh).toBe(6);
    expect(dungPheu(tron, ht, 1, false).o[0].soTaiKhoan).toBe(6);
  });

  it('hoàn thành của tài khoản KHÔNG ghi danh không lọt vào ô nào', () => {
    // Hàng mồ côi (ghi danh đã bị xoá) không được làm ô lớn hơn mẫu số.
    const ra = dungPheu(khach(5), xong([1, 2, 3, 4, 5, 777], 1), 1);
    expect(ra.o[0].soTaiKhoan).toBe(5);
  });

  it('BẢNG LUÔN mang theo GIỚI HẠN — một bảng số đi một mình sẽ bị trích một mình', () => {
    const ra = dungPheu(khach(10), xong([1, 2, 3, 4, 5, 6], 1), 2);
    expect(ra.gioiHan).toBe(GIOI_HAN);
    expect(ra.gioiHan.length).toBeGreaterThanOrEqual(5);
    const het = ra.gioiHan.join(' ');
    expect(het).toContain('30 ngày');
    expect(het).toContain('ĐỪNG gọi nó là tỉ lệ bỏ học');
    expect(het).toContain('HOÀN THÀNH, KHÔNG PHẢI MỞ');
  });

  it('đơn vị in ra là "tài khoản khách", không phải một từ chỉ người', () => {
    expect(dungPheu(khach(10), [], 1).donVi).toBe('tài khoản khách');
  });
});

describe('kiemTenChiSo', () => {
  it('mọi chỉ số KHAI TRƯỚC đều hợp lệ', () => {
    for (const c of CHI_SO_KHAI_TRUOC) expect(kiemTenChiSo(c)).toBeNull();
  });

  // KHÔNG assert `toContain(<từ cấm>)`: thông điệp "không nói ra đơn vị" NHẮC
  // LẠI chính tên bị kiểm, nên phép so đó đạt vì LẶP LẠI ĐẦU VÀO chứ không vì
  // luật. Ablate đã đo: làm rỗng `CAM` → **0 đỏ**. Nay so với câu nói ra LÝ DO
  // của luật, và tên mẫu đều CÓ chữ "tài khoản" để nhánh "thiếu đơn vị" không
  // che mất nhánh "từ cấm".
  const LY_DO_TU_CAM = 'đơn vị thật là TÀI KHOẢN';

  it.each([
    ['số tài khoản người dùng hoàn thành bài 1'],
    ['số tài khoản active users per lesson'],
    ['số tài khoản học viên còn lại'],
  ])('TỪ CHỐI "%s" vì nó mang một từ chỉ NGƯỜI', (ten) => {
    expect(kiemTenChiSo(ten)).toContain(LY_DO_TU_CAM);
  });

  it('hai nhánh từ chối là HAI, không che nhau', () => {
    // thiếu đơn vị, không có từ cấm
    expect(kiemTenChiSo('tỉ lệ còn lại ở bài thứ N')).toContain(
      'không nói ra đơn vị',
    );
    // có đơn vị, nhưng mang từ cấm
    expect(kiemTenChiSo('số tài khoản người dùng')).toContain(LY_DO_TU_CAM);
  });

  it('TỪ CHỐI một tên không nói ra đơn vị', () => {
    expect(kiemTenChiSo('tỉ lệ còn lại ở bài thứ N')).toContain(
      'không nói ra đơn vị',
    );
  });

  it('dungPheu NÉM nếu một chỉ số khai trước bị đổi thành tên cấm', () => {
    // Canh chính danh sách: thêm "số người dùng …" vào CHI_SO_KHAI_TRUOC phải
    // làm cả bảng không in được, chứ không phải in ra kèm một nhãn sai.
    const loi = kiemTenChiSo('số người dùng hoàn thành bài thứ N');
    expect(loi).not.toBeNull();
  });
});
