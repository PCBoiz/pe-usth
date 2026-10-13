/**
 * Quyết định xem thẻ "Góp ý cho chúng tôi" ở trang chủ có hiện hay không.
 *
 * Vì sao tách thành file riêng, không import gì theo alias '@/…': bộ test chạy
 * bằng `node --test` thuần (xem script `test:unit` trong package.json) và runner
 * đó không phân giải alias — cùng lý do đã ghi ở
 * src/components/python-studio/prewarm-gate.ts.
 *
 * Vì sao phải có hàm chứ không viết `href={process.env.NEXT_PUBLIC_FEEDBACK_URL}`:
 * link form khảo sát đến SAU (đặt biến trên Vercel ngay trước buổi thử nghiệm
 * 14/10/2026). Chưa đặt biến thì chuỗi là `undefined`, mà React bỏ luôn thuộc
 * tính href — thành một thẻ <a> không dẫn đi đâu, bấm vào không có gì xảy ra.
 * Thà không có thẻ còn hơn có nút chết (cùng lập luận với thẻ "Python IDE"
 * trong catalog.ts). Nên: không có link hợp lệ → trả null → trang chủ không
 * dựng thẻ.
 */

/**
 * Trả về địa chỉ form góp ý đã kiểm, hoặc null nếu chưa đặt / không dùng được.
 *
 * Chỉ nhận http và https. Lọc giao thức chứ không chỉ kiểm chuỗi rỗng vì giá
 * trị này đi thẳng vào `href`: `javascript:alert(1)` là một URL hợp lệ với
 * `new URL`, và trình duyệt sẽ CHẠY nó khi người dùng bấm. Biến môi trường do
 * người đặt tay trên bảng điều khiển Vercel nên dán sai là có thật.
 *
 * Trả `url.href` (bản đã chuẩn hoá) chứ không trả chuỗi gốc: `new URL` lược bỏ
 * tab/xuống dòng giữa chuỗi theo chuẩn WHATWG, nên "java\nscript:…" vào đây bị
 * nhận ra là giao thức javascript và chặn — còn nếu trả chuỗi gốc thì chuỗi vẫn
 * mang ký tự lạ và chính trình duyệt sẽ lược bỏ lần nữa, ra đúng cái đã chặn.
 */
export function feedbackHref(raw: string | undefined | null): string | null {
  if (typeof raw !== 'string') return null;
  // .trim() ở đây KHÔNG dư dù `new URL` tự lược khoảng trắng: nó chỉ lược
  // khoảng trắng ASCII, còn dấu cách không ngắt dòng (U+00A0) và BOM (U+FEFF)
  // thì không — hai ký tự hay đi kèm khi chép link từ trang web rồi dán vào ô
  // giá trị trên bảng điều khiển. Thiếu dòng này thì link đúng mà thẻ vẫn
  // không hiện, và không ai nhìn ra vì sao (xem ca U+00A0 trong test).
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    // Không phải URL tuyệt đối (đường dẫn tương đối, chuỗi rác, thiếu lược đồ).
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return url.href;
}

/**
 * Form khảo sát tester (buổi thử nghiệm USTH 14/10/2026).
 *
 * Vì sao để thẳng trong mã chứ không chỉ đặt biến trên Vercel: đây là địa chỉ
 * CÔNG KHAI — chính nó được phát cho người đến thử — nên không có gì phải giấu,
 * mà biến NEXT_PUBLIC_* lại bị Next thay vào mã lúc BUILD, nên đặt trên bảng
 * điều khiển vẫn phải deploy lại mới có tác dụng. Để trong mã thì thêm một thứ
 * được typecheck và test canh, bớt một bước làm tay dễ quên.
 */
export const FEEDBACK_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSf_wcVJLeKO9DnNE8UipvRZlhCvJLpmuKihnpX49DVsSv6KJA/viewform';

/**
 * Địa chỉ form để gắn vào nút — dùng chung cho trang chủ và trang khoá học, để
 * hai nơi không thể trỏ về hai form khác nhau.
 *
 * `??` chứ không `||`: đặt biến thành chuỗi RỖNG là cố ý tắt nút (ví dụ sau
 * buổi thử nghiệm), phải tôn trọng ý đó thay vì rơi về hằng.
 *
 * Next thay `process.env.NEXT_PUBLIC_*` vào mã lúc dựng ở BẤT KỲ module nào
 * được gói, kể cả file lib như file này — miễn là viết nguyên dạng như dưới
 * đây, không ghép chuỗi, không đọc động.
 */
export function feedbackFormHref(): string | null {
  return feedbackHref(process.env.NEXT_PUBLIC_FEEDBACK_URL ?? FEEDBACK_FORM_URL);
}
