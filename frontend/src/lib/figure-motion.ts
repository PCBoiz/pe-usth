/**
 * Nút Dừng/Chạy cho hình minh hoạ của màn lý thuyết — phần QUYẾT ĐỊNH, không có React.
 *
 * VÌ SAO PHẢI CÓ FILE NÀY: 23 hình ở `frontend/public/static/anim/*.svg` chạy
 * `animation-iteration-count: infinite` với một vòng dài 9,33–12,67 giây, và
 * `TheoryScreen.tsx` nhúng chúng bằng `<img>`. Trong `<img>`, tài liệu SVG chạy
 * như một trang riêng không script: trang bài học KHÔNG có cách nào chạm vào
 * animation bên trong, nên học viên không có cách nào dừng nó.
 *
 * Đó là trượt WCAG 2.2.2 (Pause, Stop, Hide — mức A): chuyển động tự khởi động,
 * kéo dài hơn 5 giây, chạy song song với nội dung khác thì PHẢI có cách dừng.
 * Kèm theo là giá hiệu năng đo được ngày 14/10/2026 bằng Chrome DevTools (CPU
 * chậm 4×, hai hình, trace 10,5 s): 2 007 ms main thread (19 %), trong đó
 * UpdateLayoutTree 796 ms / 1 084 lần (~103 lần/giây). Animation CSS trong SVG
 * nhúng dạng ảnh KHÔNG được đưa lên compositor, nên mỗi nhịp phải tính lại
 * style rồi vẽ lại ảnh trên main thread — đúng lúc Monaco và React cần nó. Đo
 * tiếp với hai hình đã cuộn ra ngoài khung nhìn 5 000 px: UpdateLayoutTree vẫn
 * 842 ms / 1 078 lần. Ra khỏi màn hình KHÔNG hề rẻ hơn.
 *
 * CÁCH DỪNG ĐƯỢC CHỌN: vẫn giữ `<img>` (không đổi sang `<iframe>`), nhưng khi
 * dừng thì đổi `src` sang một Blob dựng từ CHÍNH file SVG đó, có chèn thêm
 * `*{animation:none!important}`. Lý do chọn hướng này:
 *  - `<object>` không dùng được: CSP đặt `object-src 'none'` (next.config.ts).
 *  - `<iframe>` thì được phép (không có `frame-src`, nên rơi về
 *    `default-src 'self'`), và `contentDocument.getAnimations()` cho dừng/chạy
 *    đúng nghĩa. Nhưng SVG khai `width="1280" height="640"` cố định nên trong
 *    iframe nó bị cắt chứ không co theo cột; phải sửa thuộc tính sau khi tải
 *    bằng JS, cộng thêm một tab stop mới và mất được cái `<a>` mở khổ lớn.
 *  - Blob thì CSP cho qua sẵn (`img-src 'self' data: blob:`), giữ nguyên
 *    `<img>`, `<a>` và `loading="lazy"`, và trạng thái dừng là ĐỨNG YÊN THẬT
 *    (không phải "đứng ở một khung bất kỳ"): `animation:none` đưa mọi lớp về
 *    giá trị tĩnh của nó, tức đúng khung đầy đủ mà chính các hình đã thiết kế
 *    cho người bật giảm chuyển động — xem `<desc>` của mỗi file: "Khi tắt hoạt
 *    hình, hình đứng ở trạng thái đầy đủ".
 *
 * Vì sao là file riêng không import gì theo alias '@/…': bộ test chạy bằng
 * `node --test` thuần (script `test:unit`) và runner đó không phân giải alias,
 * cũng không bóc được JSX. Tiền lệ: src/lib/editor-load-gate.ts,
 * src/lib/feedback-link.ts.
 */

/**
 * Khoảng đệm của IntersectionObserver: bắt đầu/dừng hoạt hình khi hình còn cách
 * khung nhìn 400 px.
 *
 * Vì sao 400 px chứ không phải 0: lúc dừng vì ra ngoài khung nhìn, `src` đổi
 * sang Blob tĩnh — hình tĩnh hiện ĐỦ CẢ 4 BƯỚC, còn hình đang chạy thì mỗi lúc
 * chỉ hiện một bước. Hai ảnh đó khác nhau rõ rệt, nên cú đổi phải xảy ra khi
 * hình còn ở xa mắt. 400 px ≈ 2/3 chiều cao hình (hình cao 640 px ở khổ gốc) và
 * lớn hơn một cú lăn chuột (~100 px/notch).
 */
export const FIGURE_VIEW_MARGIN_PX = 400;

/** Mặc định có chạy hoạt hình hay không. */
export function initialFigurePlaying(prefersReducedMotion: boolean): boolean {
  // Người đã nói "ít chuyển động" ở mức hệ điều hành thì hình phải ĐỨNG YÊN
  // ngay từ đầu, không phải chạy rồi chờ họ đi tìm nút. Họ vẫn bấm Chạy được
  // nếu muốn — xem `animatedSvgSource`.
  return !prefersReducedMotion;
}

export type FigureMotionInput = {
  /** Ý MUỐN của người dùng (trạng thái nút Dừng/Chạy). */
  playing: boolean;
  /** Hình có đang ở trong/gần khung nhìn (IntersectionObserver). */
  inView: boolean;
  /** Người dùng bật giảm chuyển động ở mức hệ điều hành. */
  reduced: boolean;
  /** Đã dựng xong Blob TĨNH (tải file SVG + `stillSvgSource`) chưa. */
  stillReady: boolean;
  /** Đã dựng xong Blob CHẠY-ĐƯỢC-DÙ-BẬT-RM (`animatedSvgSource`) chưa. */
  motionReady: boolean;
};

/**
 * Nguồn ảnh nào được gắn vào `<img src>`:
 *  `file`   — chính file trong public/static/anim (chạy, TRỪ khi người dùng bật
 *             giảm chuyển động: lúc đó @media trong file tự tắt hoạt hình).
 *  `still`  — Blob đã chèn `animation:none!important`: đứng yên với MỌI người.
 *  `motion` — Blob đã vô hiệu hoá khối @media reduce: chạy với mọi người.
 *  `none`   — không có nguồn nào đứng yên dùng được: ẩn hình.
 */
export type FigureSourceKind = 'file' | 'still' | 'motion' | 'none';

export function figureSource(input: FigureMotionInput): FigureSourceKind {
  if (input.playing && input.inView) {
    // Người bật giảm chuyển động mà CHỦ ĐỘNG bấm Chạy: phải dùng Blob đã vô
    // hiệu hoá @media, không thì nút là nút chết. Chưa dựng xong thì tạm dùng
    // file gốc (hình vẫn hiện đủ, chỉ chưa chạy) — không ẩn hình của người ta.
    if (input.reduced) return input.motionReady ? 'motion' : 'file';
    return 'file';
  }
  // ĐANG DỪNG. Có bản tĩnh thì dùng — đây là đường đi thường gặp cho cả hai lý
  // do dừng (người dùng bấm Dừng, và hình ra ngoài khung nhìn).
  if (input.stillReady) return 'still';

  // Chưa có Blob tĩnh. Phân biệt HAI lý do dừng, vì cái giá của việc ẩn hình
  // khác hẳn nhau:
  if (input.playing) {
    // Dừng CHỈ vì hình ra ngoài khung nhìn, người dùng không hề yêu cầu. Đây
    // thuần tuý là tiết kiệm main thread, không phải đòi hỏi của WCAG 2.2.2 —
    // nên chưa dựng xong Blob thì cứ để như cũ. Ẩn hình ở đây là một lỗi khả
    // năng truy cập MỚI: trình đọc màn hình đọc cả trang chứ không cuộn, nên
    // nó sẽ gặp một ô trống thay cho `alt` của hình.
    return 'file';
  }
  // Người dùng CHỦ ĐỘNG bấm Dừng. Với người bật giảm chuyển động thì file gốc
  // đã đứng yên sẵn nhờ @media bên trong nó, nên dùng luôn.
  if (input.reduced) return 'file';
  // Còn lại: thà ẩn hình — WCAG 2.2.2 nhận cả "hide" — còn hơn để nó chạy tiếp
  // sau khi người dùng đã bấm Dừng.
  return 'none';
}

/**
 * Nguồn này có hoạt hình chạy hay không. Dùng để khẳng định bất biến WCAG 2.2.2
 * của `figureSource` (xem test): NGƯỜI DÙNG đã bấm Dừng thì không nguồn nào
 * được chạy nữa.
 */
export function sourceAnimates(kind: FigureSourceKind, reduced: boolean): boolean {
  if (kind === 'motion') return true;
  // File gốc tự tắt hoạt hình với người bật giảm chuyển động, nhờ
  // `@media (prefers-reduced-motion: reduce){*{animation:none !important}}`
  // viết sẵn trong cả 23 file (có test đếm đủ 23).
  //
  // CHƯA KIỂM ĐƯỢC: Chrome có áp media query đó cho SVG nhúng dạng `<img>` hay
  // không — `emulate` của MCP chrome-devtools không giả lập được tuỳ chọn này
  // (14/10/2026). Nếu Chrome KHÔNG áp, hậu quả bị chặn ở mức hẹp: người bật
  // giảm chuyển động thấy hình chạy cho tới khi Blob tĩnh dựng xong, tức tới
  // khi `fetch` cùng origin trả về — cùng lúc với chính lượt tải của `<img>`.
  if (kind === 'file') return !reduced;
  return false;
}

/** Nhãn cho trình đọc màn hình; đổi theo trạng thái. */
export function figureToggleLabel(playing: boolean): string {
  return playing ? 'Dừng hoạt hình của hình minh hoạ' : 'Chạy hoạt hình của hình minh hoạ';
}

/**
 * Chữ hiện trên nút.
 *
 * 15/10/2026 — gỡ hai ký tự `⏸` và `▶` khỏi nhãn. `c501f36` đã dọn sạch `▶`
 * khỏi trang khoá với lý do viết thẳng ra: trình đọc màn hình đọc TÊN KÝ TỰ
 * trước nhãn nút. Hai chỗ này sống sót vì `src/lib` nằm ngoài bề mặt quét của
 * `ds-wording.test.mjs` (nay đã nới). Nút ở `TheoryScreen` có `aria-label`
 * riêng (`figureToggleLabel`) nên đây không phải lỗi trợ năng — nhưng nó là
 * hai hệ biểu tượng trong một sản phẩm đã chốt dùng icon SVG, và `▶` vừa bị gỡ
 * ở trang ngay trước đó trên luồng của người học.
 */
export function figureToggleText(playing: boolean): string {
  return playing ? 'Dừng hình' : 'Chạy hình';
}

/** Câu thay cho hình khi không dựng được bản tĩnh (`figureSource` = 'none'). */
export const FIGURE_HIDDEN_NOTE =
  'Đã ẩn hình để dừng chuyển động — không tải được bản tĩnh của hình. Bấm Chạy hình để xem lại.';

/** Vị trí chèn thẻ <style> thêm vào: ngay trước thẻ đóng gốc. */
function insertBeforeRootClose(svgText: string, style: string): string | null {
  const at = svgText.lastIndexOf('</svg>');
  if (at < 0) return null;
  return `${svgText.slice(0, at)}${style}${svgText.slice(at)}`;
}

/**
 * Bản ĐỨNG YÊN của một hình: chèn `*{animation:none!important}` làm khai báo
 * CUỐI của tài liệu.
 *
 * Vì sao `!important` và vì sao chèn ở cuối: mỗi file đã có sẵn
 * `@media (prefers-reduced-motion: reduce){*{animation:none !important}}`. Hai
 * khai báo cùng độ ưu tiên và cùng `!important` thì cái ĐỨNG SAU thắng, nên
 * chèn ở cuối là chắc chắn thắng mọi khai báo `animation` trong file — kể cả
 * các khai báo rời (`animation-name`/`animation-duration`) ở T04-gil.svg, vì
 * `animation: none` là thuộc tính gộp, nó đặt lại cả nhóm.
 */
export function stillSvgSource(svgText: string): string | null {
  return insertBeforeRootClose(svgText, '<style>*{animation:none!important}</style>');
}

/**
 * Bản CHẠY ĐƯỢC cho người đang bật giảm chuyển động.
 *
 * Vì sao cần: `@media (prefers-reduced-motion: reduce){*{animation:none}}` nằm
 * TRONG file SVG, nên với người bật tuỳ chọn đó, bấm Chạy hình mà vẫn trỏ vào
 * file gốc thì không có gì chạy — nút thành nút chết. Ở đây vô hiệu hoá đúng
 * điều kiện media đó bằng một điều kiện không bao giờ đúng, giữ nguyên phần
 * còn lại của file.
 *
 * `(min-width: 999999px)` chứ không phải `(prefers-reduced-motion: no-preference)`:
 * nguồn này chỉ được dùng khi người dùng CHỦ ĐỘNG bấm Chạy, nên khối đó phải
 * tắt hẳn, không phụ thuộc vào tuỳ chọn hệ thống nữa.
 */
export function animatedSvgSource(svgText: string): string | null {
  const out = svgText.replace(
    /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/g,
    '@media (min-width: 999999px)',
  );
  // Không thấy khối nào để vô hiệu hoá thì trả null, để chỗ gọi biết là dùng
  // chính file gốc cũng chạy được chứ đừng dựng Blob vô ích.
  return out === svgText ? null : out;
}
