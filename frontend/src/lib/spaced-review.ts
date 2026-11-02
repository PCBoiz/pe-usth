// ÔN GIÃN CÁCH — hỏi lại một câu người học ĐÃ TRẢ LỜI SAI, ở đầu một bài SAU.
//
// BẰNG CHỨNG. Cepeda 2006 — meta-analysis 184 nghiên cứu, 1,35 triệu phép đo:
// học giãn cách thắng học dồn, và khoảng giãn tối ưu tỉ lệ với khoảng cách tới
// lúc cần nhớ. Cộng Roediger & Karpicke 2006 cho phần hồi tưởng.
//
// VÌ SAO KHÔNG GỌI MÁY CHỦ. Kho 537 câu nằm ở DB và có `pickSpreadByLesson` sẵn,
// nhưng rút câu từ đó tốn MỘT LƯỢT API trên đường mở bài — mà repo vừa dồn ba
// lượt về một (`lesson-load.ts`), và lượt đầu sau lúc máy chủ nghỉ đo được
// **>25 giây**. Dữ liệu cần thiết đã nằm ở client: câu hỏi ở `content_json` của
// bài họ VỪA học, và `score.firstTry` biết họ sai câu nào.
//
// VÌ SAO CẤT CẢ NỘI DUNG CÂU HỎI, không chỉ cất mã bài: lúc mở bài 20, nội dung
// bài 3 KHÔNG có trong tay (frontend chỉ nạp content của bài đang mở). Cất mã
// bài rồi đi lấy lại chính là lượt API vừa nói ở trên.
//
// KHÔNG LỘ THÊM GÌ: cờ `correct` của trắc nghiệm vốn đã ở client — cả hệ thống
// chấm trắc nghiệm chạy trong trình duyệt (xem AGENTS.md). Cất nó vào
// localStorage không mở thêm đường nào.

/** Một câu đang chờ ôn. */
export type CauOn = {
  /** Mã bài GỐC, để nói "câu này bạn trả lời sai ở bài NP03". */
  maBai: string;
  /** `sort_order` của bài gốc — dùng để không hỏi lại ngay trong chính bài đó. */
  lessonNo: number;
  /** Khoá màn, để không thêm trùng một câu. */
  key: string;
  question: string;
  options: { text: string; detail?: string; correct?: boolean }[];
  /** Lúc câu này vào hàng chờ, ms. */
  luc: number;
};

/**
 * Câu mới, chưa có mốc thời gian — `themCauSai` tự đóng dấu.
 *
 * Mốc do LIB đặt, không do nơi gọi: `Date.now()` là hàm không thuần, và React
 * 19 chặn gọi nó trong thân render. Để mặc định ở đây thì nơi gọi sạch, mà test
 * vẫn tiêm được mốc cho cả hai chiều ghi/đọc.
 */
export type CauOnMoi = Omit<CauOn, 'luc'> & { luc?: number };

export const TIEN_TO_ON = 'pe-on-gian-cach-v1';

/**
 * Khoá theo KHOÁ HỌC, không theo bài.
 *
 * Hàng chờ gom câu từ MỌI bài đã học và được hỏi ở MỘT bài khác, nên nó không
 * thuộc về bài nào cả. Cất vào nháp BÀI thì câu sai ở bài 3 chỉ hiện lại khi mở
 * đúng bài 3 — tức không bao giờ hỏi lại được. Cùng lý lẽ đã buộc `ReviewQuiz`
 * phải cất đề đang làm theo khoá học.
 */
export function khoaOn(courseId: string): string {
  return `${TIEN_TO_ON}:${courseId}`;
}

/**
 * Chờ ít nhất bấy nhiêu rồi mới hỏi lại. 30 phút.
 *
 * Phải có một khoảng, nếu không thì sai một câu ở màn 5 rồi mở bài kế tiếp sau
 * hai phút là gặp lại ngay — đó là học DỒN, đúng thứ Cepeda đo được là kém hơn.
 * Nhưng cũng không nên dài: người học một buổi vài bài mà hạn là một ngày thì
 * hàng chờ chỉ dài ra và không ai gặp câu nào.
 */
export const HAN_CHO_MS = 30 * 60 * 1000;

/**
 * Giữ tối đa bấy nhiêu câu. Quá thì BỎ CÂU CŨ NHẤT.
 *
 * Bỏ câu cũ chứ không bỏ câu mới: câu mới sai là câu đang cần ôn nhất. Và phải
 * có trần — localStorage của một origin có hạn, mà mỗi câu mang theo cả nội
 * dung ba phương án.
 */
export const TRAN_HANG_CHO = 40;

type Kho = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function khoCucBo(): Kho | null {
  try {
    // CHÍNH việc đọc thuộc tính cũng ném được (Chrome ném SecurityError khi
    // người dùng chặn "site data"), nên try/catch bọc cả phép đọc.
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Đọc hàng chờ. KHÔNG BAO GIỜ ném: hỏng kho thì coi như chưa có câu nào. */
export function docHangCho(courseId: string, kho: Kho | null = khoCucBo()): CauOn[] {
  try {
    const raw = kho?.getItem(khoaOn(courseId));
    if (!raw) return [];
    const ds: unknown = JSON.parse(raw);
    if (!Array.isArray(ds)) return [];
    // Lọc hàng hỏng thay vì tin mảng: bản nháp cũ của một phiên bản trước có
    // thể thiếu trường, và một `undefined.options.map` là màn hình trắng.
    return ds.filter(
      (x): x is CauOn =>
        Boolean(x) &&
        typeof (x as CauOn).question === 'string' &&
        Array.isArray((x as CauOn).options) &&
        typeof (x as CauOn).key === 'string',
    );
  } catch {
    return [];
  }
}

function ghi(courseId: string, ds: CauOn[], kho: Kho | null): void {
  try {
    kho?.setItem(khoaOn(courseId), JSON.stringify(ds));
  } catch {
    // Hết quota hoặc kho bị chặn: im lặng. Mất hàng chờ hỏng theo chiều LÀNH —
    // không có câu nào để ôn thì không có màn nào hiện ra, khác hẳn chuỗi ngày
    // (đã bác bỏ) nơi mất dữ liệu là trừng phạt người học.
  }
}

/** Thêm một câu vừa trả lời SAI. Trùng khoá thì bỏ qua, không thêm hai lần. */
export function themCauSai(
  courseId: string,
  cau: CauOnMoi,
  kho: Kho | null = khoCucBo(),
  bayGio: number = Date.now(),
): void {
  const ds = docHangCho(courseId, kho);
  if (ds.some((x) => x.key === cau.key)) return;
  ds.push({ ...cau, luc: cau.luc ?? bayGio });
  // Bỏ câu CŨ NHẤT khi quá trần.
  ghi(courseId, ds.slice(Math.max(0, ds.length - TRAN_HANG_CHO)), kho);
}

/**
 * Lấy MỘT câu đáng hỏi lúc mở bài `lessonNo`, hoặc null.
 *
 * Hai phép loại, mỗi phép một lý do:
 *  · câu của CHÍNH bài đang mở — hỏi lại ngay trong bài vừa sai là không giãn
 *    cách gì cả, và người học sẽ đọc ra là lỗi;
 *  · câu mới vào hàng chờ chưa quá `HAN_CHO_MS` — xem hằng đó.
 *
 * Trả câu CŨ NHẤT trong số đủ điều kiện: nó là câu đã xa nhất khỏi lần học, tức
 * câu sắp quên nhất.
 */
export function layCauOn(
  courseId: string,
  lessonNo: number,
  bayGio: number = Date.now(),
  kho: Kho | null = khoCucBo(),
): CauOn | null {
  const duocHoi = docHangCho(courseId, kho)
    .filter((x) => x.lessonNo !== lessonNo && bayGio - x.luc >= HAN_CHO_MS)
    .sort((a, b) => a.luc - b.luc);
  return duocHoi[0] ?? null;
}

/** Bỏ một câu khỏi hàng chờ (đã hỏi xong). */
export function xoaCauOn(
  courseId: string,
  key: string,
  kho: Kho | null = khoCucBo(),
): void {
  ghi(courseId, docHangCho(courseId, kho).filter((x) => x.key !== key), kho);
}
