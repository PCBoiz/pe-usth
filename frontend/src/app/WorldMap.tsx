'use client';

/**
 * BẢN ĐỒ THẾ GIỚI — khối chính của trang chủ, dựng theo khối `.map` của
 * `design/project/Main.dc.html`; thang màu/cỡ chữ/chuyển động theo
 * `design-system-v2.md`.
 *
 * File này CHỈ dựng DOM và gọi `.animate()`. Mọi quyết định (tên chặng, số bài,
 * liên kết, nhãn cho trình đọc màn hình, keyframe, thời lượng) nằm ở
 * `@/lib/world-map` để `node --test` kiểm được không cần trình duyệt — xem
 * `e2e/unit/world-map.test.mjs`.
 *
 * BỐN ĐIỀU GIỮ Ở ĐÂY, đổi đi là đổi hành vi người dùng thấy:
 *
 *  1. MỖI NÚT CHẶNG LÀ MỘT `<a href>` THẬT, có nhãn thật. Không `<div>` bắt sự
 *     kiện: bản đồ là lối đi chính vào khoá, nên nó phải đi được bằng Tab, mở
 *     được bằng Enter, bấm giữa chuột ra tab mới, và đọc được bằng trình đọc
 *     màn hình. Hình trang trí (lưới, đường đi, icon trong nút) đều
 *     `aria-hidden="true"` — chúng không thêm nghĩa nào mà nhãn chưa nói.
 *  2. KHÔNG TIẾN ĐỘ, KHÔNG KHOÁ. Không dấu tích "đã xong", không huy hiệu "BẠN
 *     Ở ĐÂY", không ổ khoá. Lý lẽ đầy đủ ở đầu `@/lib/world-map`; một câu:
 *     trang chủ không gọi API nên nó KHÔNG BIẾT người xem học tới đâu, và
 *     không có cơ chế khoá chặng nào để mà vẽ.
 *  3. VỊ TRÍ TÁM NÚT nằm trong CSS (`.spot1`…`.spot8`), không phải
 *     `style={{ left, top }}`: SSR tuần tự hoá style nội tuyến thành thuộc
 *     tính `style="…"`, và đó đúng là một trong hai nguyên nhân khiến
 *     `style-src 'unsafe-inline'` chưa bỏ được (xem `next.config.ts`). Để
 *     hai nơi không lệch nhau, test so trực tiếp `REGION_SPOTS` với CSS.
 *  4. MÀU CHƯA CHỐT. Chủ sản phẩm đang cân nhắc quay về bảng xanh–đỏ của bản
 *     gốc, trong khi artboard là nền kem. Vì vậy không có mã màu nào ở đây lẫn
 *     trong CSS — mọi màu đi qua token `--ds-*`, đổi bảng màu chỉ phải sửa
 *     `public/static/css/studio-tokens.css`.
 */

import { useEffect, useRef } from 'react';

import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';
import { decorStep, MAP_COPY, type Region, regionStep } from '@/lib/world-map';

import styles from './world-map.module.css';

/**
 * Icon của tám chặng, chép từ `.region` trong artboard theo thứ tự M1 → M8.
 * Thuần trang trí: nghĩa của nút đã nằm trong tên chặng và `aria-label`, nên
 * `<svg>` bọc ngoài mang `aria-hidden` (ở phần dựng, không ở đây).
 */
const GLYPHS: React.ReactNode[] = [
  // M1 · Tiến trình: một tiến trình chẻ thành hai.
  <>
    <circle cx="21" cy="9" r="5" />
    <circle cx="9" cy="33" r="5" />
    <circle cx="33" cy="33" r="5" />
    <path d="M18 13L11 29M24 13L31 29" />
  </>,
  // M2 · Đa luồng: ba sợi dệt song song.
  <>
    <path d="M4 11c6 0 6 8 12 8s6-8 12-8 6 8 8 8" />
    <path d="M4 23c6 0 6 8 12 8s6-8 12-8 6 8 8 8" />
    <path d="M4 33c6 0 6 4 12 4s6-4 12-4 6 4 8 4" />
  </>,
  // M3 · GUI: một cửa sổ có thanh tiêu đề.
  <>
    <rect x="5" y="8" width="32" height="26" rx="2" />
    <path d="M5 15H37" />
  </>,
  // M4 · Dữ liệu & SQL: một khối lưu trữ.
  <>
    <ellipse cx="21" cy="8" rx="12" ry="4" />
    <path d="M9 8v20c0 2.2 5.4 4 12 4s12-1.8 12-4V8" />
  </>,
  // M5 · NumPy: một ma trận.
  <>
    <rect x="7" y="7" width="26" height="26" />
    <path d="M16 7v26M24 7v26M7 16h26M7 24h26" />
  </>,
  // M6 · pandas: một bảng có cột đầu.
  <>
    <rect x="6" y="8" width="28" height="24" rx="1" />
    <path d="M6 15h28M15 15v17" />
  </>,
  // M7 · Matplotlib: hai trục và một đường.
  <>
    <path d="M7 33V7M7 33h26" />
    <path d="M11 27l7-8 5 4 9-11" />
  </>,
  // M8 · Dự án DA: bánh xe công trình.
  <>
    <circle cx="21" cy="21" r="7" />
    <path d="M21 4v6M21 32v6M4 21h6M32 21h6M9 9l4 4M29 29l4 4M33 9l-4 4M13 29l-4 4" />
  </>,
];

export type WorldMapProps = {
  /** Tám chặng dựng từ `buildRegions(curricula.modules, lessonUrl)`. */
  regions: Region[];
};

export default function WorldMap({ regions }: WorldMapProps) {
  const reduced = usePrefersReducedMotion();
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Xin giảm chuyển động ⇒ KHÔNG chạy gì, không phải "chạy nhanh hơn".
    // `regionStep`/`decorStep` trả null, nên nhánh này cũng là nhánh duy nhất
    // cần kiểm trong test.
    if (reduced) return;
    const map = mapRef.current;
    if (!map) return;
    // Hỏi NĂNG LỰC, không dò tên trình duyệt. Thiếu WAAPI thì trạng thái nghỉ
    // của CSS — vốn đã là trạng thái cuối — chính là thứ người xem thấy.
    if (typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') return;

    const anims: Animation[] = [];
    const run = (el: Element | null, step: ReturnType<typeof regionStep>) => {
      if (!el || !step) return;
      anims.push(el.animate(step.keyframes, step.options));
    };

    run(map.querySelector('[data-map-decor]'), decorStep(reduced));
    map.querySelectorAll('[data-map-region]').forEach((el, i) => {
      run(el, regionStep(i, reduced));
    });

    // Rời trang giữa lúc đang hiện ra: `cancel()` bỏ style của animation, và vì
    // khung cuối ĐÃ LÀ trạng thái nghỉ của CSS nên phần tử không nhảy về chỗ
    // tối — nó đứng luôn ở chỗ đúng.
    return () => {
      for (const anim of anims) anim.cancel();
    };
  }, [reduced]);

  if (regions.length === 0) return null;

  return (
    <section className={styles.wrap} aria-labelledby="mapTitle">
      {/* Chỉ một nhãn: "Advanced Python · 8 chặng · 48 bài" đã nằm ngay trên
          tiêu đề trang (hero), nhắc lại ở đây là nói hai lần một thứ. */}
      <h2 className={styles.label} id="mapTitle">{MAP_COPY.label}</h2>

      <div className={styles.map} ref={mapRef}>
        {/* Lưới + đường đi: trang trí, nên `aria-hidden`. Đường đi vẽ bằng NÉT
            ĐỨT đều một kiểu — artboard dùng nét đặc cho đoạn "đã đi" và nét
            chấm cho đoạn "chưa học", mà đó là tiến độ, thứ trang này không
            đọc. Vẽ nửa đặc nửa chấm ở đây là chú giải cho một thứ không có. */}
        <svg
          className={styles.decor}
          data-map-decor
          viewBox="0 0 1000 660"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g className={styles.grid} fill="none">
            <path
              d="M0 110H1000M0 220H1000M0 330H1000M0 440H1000M0 550H1000M166 0V660M333 0V660M500 0V660M666 0V660M833 0V660"
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <path
            className={styles.route}
            d="M100 462 C140 380 180 290 240 250 C300 220 340 450 400 435 C460 420 470 220 520 198 C570 176 590 420 640 410 C690 400 690 190 740 172 C790 154 820 395 860 385 C900 375 870 170 900 132"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {regions.map((region, i) => (
          <a
            key={region.name}
            className={`${styles.region} ${styles[`spot${i + 1}`] ?? ''}`}
            data-map-region
            href={region.href}
            aria-label={region.ariaLabel}
          >
            <span className={styles.disc}>
              <svg viewBox="0 0 42 42" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {GLYPHS[i] ?? GLYPHS[0]}
              </svg>
            </span>
            <span className={styles.regionLabel}>
              {/* `aria-hidden` cho cả nhãn chữ: `aria-label` của liên kết đã
                  nói đủ tên chặng + số bài + đi đâu. Không ẩn thì trình đọc
                  màn hình đọc hai lần cùng một thứ. */}
              <span className={styles.regionName} aria-hidden="true">{region.name}</span>
              <span className={styles.regionMeta} aria-hidden="true">{region.meta}</span>
            </span>
          </a>
        ))}
      </div>

      {/* Không có chú thích dưới bản đồ — lý lẽ ở MAP_COPY (lib/world-map.ts). */}
    </section>
  );
}
