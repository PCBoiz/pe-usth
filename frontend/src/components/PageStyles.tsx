// Nạp CSS byte-nguyên-xi từ /public/static/css qua <link> — đúng cơ chế Flask cũ:
// mỗi trang chỉ load ĐÚNG tổ hợp CSS của nó, đúng thứ tự; không qua bundler
// (CSS gốc có vài đoạn non-strict mà parser của Next từ chối, trình duyệt thì không).
//
// ── VÌ SAO DÙNG `precedence` ─────────────────────────────────────────────
// Đã thử hai cách trước, cách nào cũng hỏng một đầu:
//
//  1. <link> thuần trong JSX: SSR có sẵn thẻ nên lần tải đầu KHÔNG nhấp nháy,
//     nhưng khi đi client-side routing React gỡ HẾT thẻ của trang cũ rồi tạo
//     lại thẻ của trang mới — kể cả 6 file cả hai trang đều dùng. Thẻ mới phải
//     tải/parse lại nên có một nhịp không stylesheet nào được áp.
//
//  2. Tự tạo thẻ bằng JS trong useLayoutEffect: đi client-side thì mượt, nhưng
//     thẻ chỉ sinh ra SAU khi React chạy nên HTML máy chủ trả về KHÔNG có thẻ
//     CSS nào. Đo được: khung hình đầu vẽ lúc 368ms hoàn toàn trần, tới 786ms
//     style.css mới áp — gần 0,8 giây HTML thô mỗi lần tải trang.
//
// `precedence` (React 19) giải quyết cả hai: thẻ vẫn nằm trong JSX nên SSR có
// và chặn vẽ như thường; đồng thời React quản lý chúng như TÀI NGUYÊN TOÀN CỤC
// — gộp theo href và GIỮ LẠI khi component unmount, nên đổi trang không gỡ rồi
// tạo lại file dùng chung.
//
// Thứ tự trong <head> đi theo thứ tự các nhóm precedence được đăng ký. Nếu để
// tên nhóm theo từng trang thì trang nào nạp trước sẽ ghim thứ tự của nó, trang
// sau chèn lung tung. Nên dùng BẢNG HẠNG CỐ ĐỊNH dưới đây — hạng của một file
// là như nhau ở mọi trang, và mọi hạng đều được "ghim" sẵn trong layout gốc.
//
// Tem ?v= dùng chung với LegacyScripts — xem src/lib/assetVersion.ts.
import { withAssetVersion } from '@/lib/assetVersion';

/**
 * Thứ tự nạp toàn cục. Ràng buộc thật sự cần giữ:
 *   · theme/auth/style/dashboard/pages/dark-mode  TRƯỚC  edu-theme
 *   · edu-theme  TRƯỚC  mọi file edu-* còn lại (chúng đè lên token của nó)
 *   · course_db_design, lesson_db_design  TRƯỚC  edu-db
 * Những file không liệt kê ở đây rơi vào hạng mặc định (giữa nhóm gốc và nhóm
 * edu-*), đủ an toàn vì chúng đều là CSS riêng của một trang.
 */
const RANK: Record<string, number> = {
  // @font-face của Be Vietnam Pro + JetBrains Mono. Hạng 9 — TRƯỚC mọi file
  // khác: @font-face vốn không phụ thuộc thứ tự, nhưng đặt đầu thì yêu cầu
  // .woff2 nổ sớm nhất có thể, bớt một nhịp đổi phông.
  'edu-fonts.css': 9,
  'theme.css': 10,
  'auth.css': 11,
  'style.css': 12,
  'dashboard.css': 13,
  'pages.css': 14,
  'ChangePassword.css': 15,
  'skeleton.css': 16,
  'dark-mode.css': 17,
  'roadmap.css': 18,
  'login.css': 19,
  'register.css': 20,
  'questionaire.css': 21,
  // Hạng 22 từng là 'lesson.css' (và 44 là 'edu-lesson.css'). Hai file đó chỉ
  // được nạp bởi /lesson/java, /lesson/htmlcss và /interface — ba trang đã xoá
  // 15/10/2026 — nên file cũng đã xoá khỏi public/static/css. Để lại tên trong
  // bảng thì hạng vẫn được ghim ở layout gốc cho một file không còn tồn tại.
  'lesson_db_design.css': 23,
  // Hạng 24 từng là 'chatbot.css'. Ba trang /courses/db_design* là chỗ cuối cùng
  // nạp nó; bỏ dòng nạp ở đó (15/10/2026) thì không trang nào còn nạp, nên file
  // CSS cũng xoá — cùng lý lẽ với 'lesson.css' ở trên: giữ tên trong bảng là ghim
  // một hạng cho file không còn tồn tại.
  'course_detail.css': 25,
  'course_db_design.css': 26,
  // các file pages/*.inline.css → 30 (mặc định)
  'edu-theme.css': 40,
  'edu-dashboard.css': 41,
  'edu-course-detail.css': 42,
  'edu-db.css': 43,
  'edu-auth.css': 45,
  'edu-forms.css': 46,
  'edu-card.css': 47,
  'edu-landing.css': 48,
  // hộp thoại bài ôn tập — sau edu-dashboard.css vì dùng lại token/nút của nó
  'edu-review-quiz.css': 49,
  // token riêng của Python Studio — sau edu-theme, trước lớp co giãn
  'studio-tokens.css': 50,
  // lớp co giãn điện thoại/tablet — PHẢI cuối cùng, xem RESPONSIVE_CSS bên dưới
  'edu-responsive.css': 60,
};
const DEFAULT_RANK = 30;

/**
 * Lớp co giãn dùng chung, tự thêm vào MỌI trang.
 *
 * Không liệt kê trong `hrefs` của từng trang vì đây là quy tắc toàn cục: bỏ
 * sót một trang là trang đó vỡ trên điện thoại, mà 18 chỗ gọi PageStyles thì
 * rất dễ sót khi thêm trang mới. Gom về một chỗ để không thể quên.
 */
const RESPONSIVE_CSS = '/static/css/edu-responsive.css';

/**
 * Khai báo @font-face, cũng tự thêm vào MỌI trang và cùng một lý lẽ: sót một
 * trang là trang đó vẽ bằng phông dự phòng của hệ điều hành trong khi `--edu-font`
 * vẫn nói 'Be Vietnam Pro'. Không gộp vào edu-theme.css để bản thân phông có
 * một tệp riêng cache được độc lập (phông gần như không bao giờ đổi, còn
 * edu-theme.css thì đổi theo mỗi đợt sửa giao diện).
 */
const FONTS_CSS = '/static/css/edu-fonts.css';

/**
 * Bảng token --ds-* của bản thiết kế v2, cũng toàn cục kể từ 15/10/2026.
 *
 * Vì sao không chỉ nạp ở những trang đã chuyển: `SiteHeader` dùng --ds-* và nó
 * có mặt ở trang chủ, trang khoá, /ide và /practice. Một trang quên nạp là
 * header ở đó vẽ bằng biến không tồn tại — `color: var(--ds-ink)` không có giá
 * trị thì thuộc tính bị bỏ, chữ rơi về màu thừa hưởng, nền mất hẳn. Đó là loại
 * lỗi chỉ hiện ra ở đúng một trang nên rất dễ lọt. File chỉ khai biến (không
 * một quy tắc nào áp lên phần tử) nên nạp ở trang chưa chuyển là vô hại.
 */
const TOKENS_CSS = '/static/css/studio-tokens.css';

/** Tên nhóm precedence — React xếp <head> theo thứ tự nhóm được đăng ký. */
export function cssPrecedence(href: string): string {
  const file = href.split('/').pop() || href;
  const rank = RANK[file] ?? DEFAULT_RANK;
  return `pe${String(rank).padStart(3, '0')}`;
}

/** Mọi hạng có thể có — layout gốc ghim sẵn theo đúng thứ tự này. */
export const ALL_PRECEDENCES: string[] = Array.from(
  new Set([...Object.values(RANK), DEFAULT_RANK]),
)
  .sort((a, b) => a - b)
  .map((r) => `pe${String(r).padStart(3, '0')}`);

export default function PageStyles({ hrefs }: { hrefs: string[] }) {
  // Lọc trùng phòng khi một trang đã tự liệt kê các file toàn cục (trang bài
  // học vẫn liệt kê studio-tokens.css trong tổ hợp của nó — thứ tự ở đó là
  // phần của hợp đồng, nên giữ chỗ cũ chứ không để Set đẩy lên đầu).
  const all = [...new Set([FONTS_CSS, ...hrefs, TOKENS_CSS, RESPONSIVE_CSS])];
  return (
    <>
      {all.map((href) => (
        <link
          key={href}
          rel="stylesheet"
          href={withAssetVersion(href)}
          precedence={cssPrecedence(href)}
        />
      ))}
    </>
  );
}
