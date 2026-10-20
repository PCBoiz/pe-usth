// ĐƯỜNG RA KHỎI TỈ LỆ GẦN — bước 3 của `design/v3/tuong-tac-ban-do.md`.
//
// Luật của tệp này nằm trong một câu: **đường ra phải chắc chắn hơn đường
// vào**. Vào thì có một đường (bấm một chặng). Ra thì có ba, và cả ba đi tới
// CÙNG một URL:
//
//   1. nút Thoát THẤY ĐƯỢC, dựng ở đây;
//   2. phím Esc, listener ở đây;
//   3. bấm vào khoảng trời trống (`.nenRa` ở `StarMap.tsx`).
//
// ── BỐN ĐIỀU GIỮ Ở ĐÂY ────────────────────────────────────────────────
//
//  1. NÚT LÀ MỘT `<Link>` THẬT, không một `<button onClick>`. Nhờ thế nó chạy
//     khi JS chưa tải xong, mở được ở tab mới, và nó đi qua đúng bộ máy điều
//     hướng mà hai đường kia dùng. Chỉ phím Esc cần JS — và một người không có
//     JS thì vẫn còn hai đường.
//
//  2. `push`, KHÔNG `back()`. `router.back()` nghe tự nhiên hơn nhưng nó sai ở
//     đúng trường hợp cú phóng được dựng ra để phục vụ: một người mở ĐƯỜNG DẪN
//     ĐƯỢC GỬI (`/?chang=M6`) chưa có lịch sử nào trong tab, nên `back()` đưa
//     họ ra khỏi trang — tức "thoát khỏi chặng" thành "thoát khỏi bản đồ".
//     `push` thì luôn tới bản đồ ở tỉ lệ xa, và nó giữ cho phím Lùi của trình
//     duyệt vẫn quay được vào chặng vừa xem.
//
//  3. `scroll: false`. Bảng bài biến mất khi lùi ra, nên trang ngắn lại; để
//     Next tự cuộn lên đầu là giật một cái ở giữa cú phóng ra. Khung bản đồ
//     không đổi chỗ, nên không có gì phải cuộn tới.
//
//  4. LISTENER TRÊN `window`, KHÔNG TRÊN KHUNG. Esc phải chạy dù tiêu điểm
//     đang ở đâu — kể cả ở một dòng của bảng bài DƯỚI khung, nơi
//     `SkyCursor.tsx` không nghe tới. `SkyCursor` cũng xử lý Esc, nhưng cho
//     một việc KHÁC (từ một ngôi lùi về ô bấm cả chặng) và nó `preventDefault`
//     ca đó, nên hai chỗ không giành nhau: nó chỉ nhận Esc khi tiêu điểm đang
//     ở một ngôi, còn ở tỉ lệ gần thì 48 ngôi không nhận tiêu điểm nữa (tám ô
//     bấm cả chặng đã tắt, nên không có gì đưa tiêu điểm vào chúng).
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import styles from './star-map.module.css';

/**
 * ĐÍCH LÀ MỘT THAM SỐ, KHÔNG MỘT HẰNG — và đó là một bản sửa, không một kiểu
 * viết. Tới 20/10/2026 tệp này ghi cứng `'/ban-do-sao'`, đúng khi bản đồ chỉ
 * dựng ở route xem thử. Từ lúc trang chủ cũng dựng nó, một hằng ở đây là nút
 * "Thoát khỏi chặng" NÉM người đang ở trang chủ sang route xem thử — tức một
 * đường ra đưa họ ra khỏi cả trang, đúng cái mà điều 2 dưới đây cấm.
 *
 * `StarMap.tsx` tính nó MỘT lần cho cả ba đường ra, nên không có hai chuỗi để
 * trôi xa nhau.
 */
export default function SkyExit({ label, ra }: { label: string; ra: string }) {
  const router = useRouter();

  useEffect(() => {
    const bam = (e: KeyboardEvent) => {
      // `defaultPrevented`: `SkyCursor.tsx` đã nhận Esc cho việc "từ một ngôi
      // lùi về ô bấm cả chặng" và nó gọi `preventDefault()`. Không kiểm cờ này
      // thì một cú Esc làm CẢ HAI việc, và người dùng bàn phím mất một bậc
      // trong cái thang mà bước 1 vừa dựng.
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      router.push(ra, { scroll: false });
    };
    window.addEventListener('keydown', bam);
    return () => window.removeEventListener('keydown', bam);
  }, [ra, router]);

  return (
    <Link className={styles.thoat} href={ra} scroll={false}>
      {label}
    </Link>
  );
}
