import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// CSP cho các trang frontend (CSP của NestJS chỉ áp lên response API, không
// bảo vệ được trang nơi JS thực sự chạy).
//
// script-src còn 'unsafe-inline' vì JS legacy dùng ~70 handler nội tuyến
// (onclick=...) trong chuỗi innerHTML — nonce không áp được cho thuộc tính
// handler. Dù vậy policy này vẫn chặn: nạp script từ domain lạ, gửi dữ liệu
// (fetch/XHR) tới domain lạ, <base> injection, plugin, và bị nhúng iframe.
// Khi JS legacy đã chuyển hết sang React thì bỏ 'unsafe-inline' và dùng nonce.
//
// 'wasm-unsafe-eval': Pyodide (Python Studio) biên dịch WebAssembly.
//
// connect-src KHÔNG còn cdn.jsdelivr.net: runtime Pyodide đã nằm trong repo
// (frontend/public/pyodide/v314.0.7/) nên hai worker Python nạp .wasm +
// python_stdlib.zip bằng fetch CÙNG ORIGIN. Domain này vẫn phải ở lại
// script-src và style-src vì lớp legacy còn nạp mermaid, svg-pan-zoom,
// canvas-confetti và CodeMirror 5 (js + css) từ đó — xem dashboard/page.tsx,
// interface/page.tsx, lesson/{htmlcss,java}/page.tsx, LessonDbDesign.tsx.
//
// /ide thì KHÔNG còn cần jsdelivr nữa: Monaco đã tự host ở
// public/monaco/v0.57.0/ (14/10/2026). Nhưng chưa bỏ được domain khỏi CSP —
// chừng nào còn một trang legacy nạp từ đó thì bỏ là trang đó trắng.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.tailwindcss.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  // Avatar OAuth (Google/Facebook) là URL https bất kỳ.
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${API_ORIGIN}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    // Ghim gốc dự án vào chính thư mục frontend/.
    // Turbopack tự dò gốc bằng cách đi ngược lên tìm lockfile; ở repo này thư
    // mục cha (backend NestJS) có package-lock.json nên nó có thể chọn nhầm
    // D:\EDU\PE_nest_next_js làm gốc. Khi đó id module thành
    // "[project]/frontend/src/app/..." lệch với React Client Manifest →
    // /dashboard trả 500 "Could not find the module ... in the React Client
    // Manifest". Ghim cứng ở đây thì id luôn là "[project]/src/app/...".
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // Runtime Pyodide (~32 MB: wasm + stdlib + wheel numpy/pandas/matplotlib)
        // nằm trong thư mục ĐÃ GHIM PHIÊN BẢN, nên nội dung không bao giờ đổi:
        // muốn nâng cấp là đổi sang /pyodide/v0.28.x/, không ghi đè file cũ.
        // Mặc định `public/` được phục vụ với cache ngắn — cả lớp mở bài là mỗi
        // máy tải lại 32 MB, chưa kể mỗi lần vào lại. immutable cắt hẳn việc đó.
        source: "/pyodide/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Monaco Editor của /ide (~9,3 MB trên đĩa; một phiên python tải ~3 MB).
        // Cùng lý lẽ với /pyodide ở trên: thư mục ĐÃ GHIM PHIÊN BẢN
        // (public/monaco/v0.57.0/) nên nội dung không bao giờ đổi, nâng cấp là
        // chép sang thư mục mới chứ không ghi đè.
        //
        // Trước bản này Monaco tải từ cdn.jsdelivr.net (12 script mỗi lần mở
        // /ide) và KHÔNG có bản dự phòng: phòng máy chặn jsdelivr là khung soạn
        // thảo đứng mãi ở chữ "Loading…". Xem MONACO_VS_PATH trong
        // src/app/ide/IdeClient.tsx.
        source: "/monaco/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Hình minh hoạ lý thuyết (SVG động) cũng là tài nguyên tĩnh, nhưng tên
        // file KHÔNG ghim phiên bản — sửa hình là ghi đè. Cho cache một ngày và
        // bắt kiểm lại bằng revalidate để bản sửa tới được người học trong ngày.
        source: "/static/anim/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, must-revalidate" },
        ],
      },
      {
        // CSS legacy: cache CỨNG được vì mọi thẻ <link> đều đi qua PageStyles →
        // withAssetVersion() gắn `?v=ASSET_VERSION`, nên sửa file là đổi URL.
        // Trước bản này `public/` trả max-age=0, must-revalidate: đo 13/10/2026,
        // mỗi lần mở bài là 3 lượt 304 cho 3 file CSS, mỗi lượt 132–143 ms.
        //
        // KHÔNG thêm /static/js/:path* vào đây: pyodide-runner.ts dùng
        // WORKER_URL = '/static/js/studio-lesson.worker.js' TRẦN (không qua
        // withAssetVersion), và worker tự fetch studio-harness.py cũng trần —
        // cache cứng hai file đó là ghim học viên vào bộ chấm cũ. Muốn cache thì
        // phải gắn tem cho chúng trước.
        source: "/static/css/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
