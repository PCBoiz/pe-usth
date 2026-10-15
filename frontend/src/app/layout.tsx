import type { Metadata } from 'next';

import { ALL_PRECEDENCES } from '@/components/PageStyles';
import { withAssetVersion } from '@/lib/assetVersion';
import { findCourse } from '@/lib/catalog';
import { seoDescription } from '@/lib/seo-copy';

// Root layout TỐI THIỂU — không import CSS global nào ở đây.
// Mỗi page/layout con tự import ĐÚNG tổ hợp CSS của template gốc
// (MIGRATION_PLAN.md §4) để tránh class trùng tên giữa các file đè nhau.

export const metadata: Metadata = {
  title: 'Programming EDU',
  // Lighthouse SEO trên bản triển khai chấm 90 vì THIẾU meta description —
  // không trang nào có. Đặt ở layout gốc thì mọi route thừa hưởng; route nào
  // cần câu riêng (ví dụ trang bài học) tự khai lại `description` của nó.
  //
  // 15/10/2026 — viết lại vì câu cũ quảng cáo thứ không còn: "Java, HTML/CSS"
  // là hai khoá đã bị XOÁ ở 9bc42c1 (route trả 404), và danh mục
  // (`lib/catalog.ts`) nay chỉ còn `python_advanced` + công cụ `/ide`. Đây là
  // câu Google in ra dưới MỌI liên kết của site — trang chủ không khai
  // `description` riêng nên nó thừa hưởng đúng câu này — nên nói sai ở đây là
  // nói sai ở chỗ đông người đọc nhất.
  //
  // Số bài đếm từ `curricula.json` qua danh mục, không viết cứng: bẫy "hai
  // nguồn danh sách bài" trong AGENTS.md. Viết cứng "48" thì dựng lại giáo
  // trình là câu này lệch mà không ai biết.
  description: seoDescription(findCourse('python_advanced')?.lessons ?? 0),
  icons: {
    // favicon rocket 🚀 y hệt base.html
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%9A%80%3C/text%3E%3C/svg%3E",
  },
};

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Template gốc nào cũng có meta csrf-token; course_detail.js/course_db_design.js
            đọc .content KHÔNG guard → meta phải tồn tại (rỗng — auth giờ là JWT). */}
        <meta name="csrf-token" content="" />
        {/* ── ĐƯỜNG TẢI PHÔNG ──────────────────────────────────────────────
            15/10/2026 — gỡ hai thẻ preconnect + một thẻ preload trỏ tới Google
            Fonts. Chúng tồn tại để bù cho một chuỗi phụ thuộc bốn chặng:
            edu-theme.css nạp Poppins bằng `@import url(fonts.googleapis.com/…)`,
            mà @import nằm BÊN TRONG một file tải qua <link>, nên trình duyệt
            chỉ biết tới phông sau khi đã tải + phân tích xong edu-theme.css —
            HTML → edu-theme.css → CSS của Google → .woff2, hai chặng cuối ở
            origin khác (thêm DNS + TLS cho mỗi origin).

            Nay hai họ chữ của bản thiết kế v2 (Be Vietnam Pro + JetBrains Mono)
            tự lưu trữ trong public/static/fonts/ và khai @font-face ở
            /static/css/edu-fonts.css, mà PageStyles tự thêm vào mọi trang. Chuỗi
            còn HAI chặng, CÙNG ORIGIN: HTML → edu-fonts.css → .woff2. Không còn
            origin nào để preconnect, cũng không còn file CSS trung gian để
            preload — giữ mấy thẻ đó lại là bắt mọi trang mở thêm hai kết nối
            TLS không ai dùng.

            Không thêm `rel="preload"` cho chính tệp .woff2: đoán sai nét nào
            dùng trên trang nào là tải thừa 20 KB mỗi nét, mà @font-face chia
            theo `unicode-range` nên trình duyệt đã chỉ lấy đúng phần có chữ.
            Có số đo cho thấy nhịp đổi phông còn thấy rõ thì hãy preload, và
            preload phải kèm `crossorigin` kể cả khi cùng origin (phông luôn
            được tải ở chế độ CORS).

            Cụm db_design cũ vẫn tự nạp Inter từ Google Fonts, nên hai origin
            đó CHƯA bỏ được khỏi CSP trong next.config.ts. BA chỗ, không phải
            một — ai sửa /card rồi tưởng đã đủ điều kiện siết CSP là siết vào
            hai chỗ còn sống:
              · src/app/(standalone)/card/[cardId]/page.tsx (thẻ <link>)
              · src/components/LessonDbDesign.tsx (thẻ <link>)
              · public/static/css/questionaire.css (@import ngay dòng 1)
            Đếm lại bằng `grep -rn "fonts.googleapis" frontend/src frontend/public`
            trước khi gỡ origin nào. */}
        {/* Origin backend cho pe-bridge.js — phải có TRƯỚC mọi script legacy */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__PE_API_ORIGIN=${JSON.stringify(API_ORIGIN)};`,
          }}
        />
        {/* ── GHIM THỨ TỰ CÁC NHÓM CSS ──────────────────────────────────────
            React xếp nhóm `precedence` theo THỨ TỰ LẦN ĐẦU GẶP, không theo
            tên nhóm. Layout nhóm (base) nạp theme/auth/chatbot và PageStyles
            tự thêm edu-responsive vào đó, nên hạng 50 bị ghim ngay vị trí thứ
            4 — TRƯỚC style.css (12) và edu-theme.css (40). Hậu quả đo được:
            toàn bộ lớp co giãn bị đè, ở 390px sidebar vẫn rộng 272px thay vì
            thành ngăn kéo, ở 768px vẫn 272px thay vì rail 84px.

            Mấy thẻ <style> rỗng dưới đây đăng ký TRƯỚC mọi thứ khác, đúng thứ
            tự hạng, nên về sau file nào rơi vào hạng nào cũng nằm đúng chỗ.
            Chúng không chứa quy tắc nào nên không ảnh hưởng giao diện. */}
        {ALL_PRECEDENCES.map((p) => (
          <style key={p} href={`pe-anchor-${p}`} precedence={p}>
            {`/*${p}*/`}
          </style>
        ))}
        {/* ── CSS TỐI THIỂU, NỘI TUYẾN ──────────────────────────────────────
            Mọi thứ "ẩn mặc định" trong app này đều chỉ được ẩn bởi file CSS
            ngoài (/static/css/*). Các file đó nạp qua <link> nên có một khoảng
            trước khi áp — và trong khoảng đó TẤT CẢ bung ra cùng lúc. Đo được
            khi làm chậm CSS: trang Bảng điều khiển hiện đồng thời cả 8 khối
            .page (Khóa học, Lộ trình, Diễn đàn, Xếp hạng, Kỹ năng, Cá nhân,
            Cài đặt chồng lên nhau — đúng "màn hình HTML thô"), 3 hộp thoại
            (nhắc chuỗi học, đổi mật khẩu, hủy đăng ký) và toàn bộ khung chat
            mở bung.

            Chép lại đúng những quy tắc ẩn đó ở đây: style nội tuyến đi cùng
            HTML nên áp NGAY, không chờ mạng. File ngoài nạp sau sẽ ghi đè bằng
            chính quy tắc tương đương, nên không đổi hành vi lúc đã tải xong.
            Chỉ chép phần ẩn/hiện — không chép màu sắc, bố cục. */}
        <style
          dangerouslySetInnerHTML={{
            __html: [
              /* SPA: chỉ khối .page.active được hiện (style.css:449-450).
                 PHẢI giới hạn vào các tab của SPA Bảng điều khiển — nhận diện
                 bằng id="page-*" (page-dashboard, page-courses, page-roadmap…).
                 Nếu để trần `.page` thì luật này chạm cả /login và /register:
                 hai trang đó cũng bọc nội dung trong <div class="page"> nhưng
                 KHÔNG theo quy ước .active (auth.css/login.css chỉ đặt padding,
                 không hề có display:none) → form đăng nhập bị ẩn vĩnh viễn,
                 trang trắng trơn. Trang chi tiết khóa học dùng .page active sẵn
                 nên không phụ thuộc luật này. */
              '[id^="page-"].page{display:none}[id^="page-"].page.active{display:block}',
              /* tiện ích ẩn dùng khắp nơi (dashboard.css)

                 15/10/2026 — bỏ `.chatbot-hidden` khỏi dòng này, cùng lý do đã
                 bỏ `.streak-overlay` ở dưới: hộp chat không còn được dựng ở đâu
                 nữa (Chatbot.tsx và chatbot.js xoá ở đợt dọn route chết, và
                 chatbot.css — nơi khai lớp này — vừa xoá theo khi ba trang
                 /courses/db_design* thôi nạp nó). Luật chặn FOUC cho một lớp
                 không ai dùng chỉ làm người đọc sau đi tìm chỗ bật nó. */
              '.hidden{display:none!important}',
              /* hộp thoại: ẩn bằng opacity+visibility, mở bằng .active
                 (dashboard.css .un-overlay, ChangePassword.css .cp-overlay)

                 15/10/2026 — bỏ `.streak-overlay` khỏi hai dòng này. Hộp thoại
                 chuỗi ngày không còn được dựng ở đâu nữa: không một file nào
                 trong src/** hay public/static/js/** tạo phần tử mang lớp đó
                 (chỉ còn khai báo kiểu chết trong dashboard.css). Luật chặn FOUC
                 cho một lớp không ai dùng chỉ làm người đọc sau tưởng tính năng
                 còn sống và đi tìm chỗ bật nó. */
              '.un-overlay,.cp-overlay,.edu-rq-overlay{opacity:0;visibility:hidden}',
              '.un-overlay.active,.cp-overlay.active,.edu-rq-overlay.active{opacity:1;visibility:visible}',
              /* bảng thông báo + menu người dùng, mở bằng .open (style.css:243/372) */
              '.bell-panel,.user-dropdown{opacity:0;visibility:hidden}',
              '.bell-panel.open,.user-dropdown.open{opacity:1;visibility:visible}',
            ].join(''),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {/* ── Đặt chủ đề TRƯỚC khi vẽ ────────────────────────────────────
            Trước đây script này chỉ có ở layout nhóm (base), nên mọi trang
            nhóm (standalone) — chi tiết khóa học, bài học, đăng nhập… — vào
            với body KHÔNG có class chủ đề: vẽ ra nền SÁNG rồi tới khi JS cũ
            chạy applyTheme() mới đổi sang tối. Đo được: đang để chế độ tối,
            mở /courses/* thì nháy trắng gần 1 giây (tới ~950ms).

            Đặt cả `dark` LẪN `light`: applyTheme() trong course_detail.js /
            course_db_design.js bật tắt cả hai, và course_db_design.css có 53
            quy tắc gắn với `body.light`. Chỉ 3 file CSS của khóa CSDL dùng
            `body.light` nên thêm class này ở mọi trang không đổi gì chỗ khác.

            Phải nằm trong <body> (không phải <head>) vì cần document.body. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var d=localStorage.getItem('theme')==='dark';" +
              "document.body.classList.toggle('dark',d);" +
              "document.body.classList.toggle('light',!d);}catch(e){}})();",
          }}
        />
        {children}
        {/* Hiệu ứng chuột xanh–đỏ (đèn bám con trỏ, nghiêng 3D ô khóa học). Chỉ đổi biến CSS,
            không chèn DOM nên không gây lỗi hydration; tự tắt trên cảm ứng/giảm chuyển động. */}
        <script src={withAssetVersion('/static/js/edu-fx.js')} defer />
      </body>
    </html>
  );
}
