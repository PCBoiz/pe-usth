'use client';

/**
 * LỚP CHUYỂN ĐỘNG của bản đồ thế giới — phần nối dây. Mọi con số và mọi quyết
 * định nằm ở `src/lib/map-motion.ts` (kiểm được bằng `node --test`); file này
 * chỉ đo khối, đặt thuộc tính, gắn/tháo listener.
 *
 * ── VÌ SAO LÀ MỘT COMPONENT RIÊNG ─────────────────────────────────────
 * `WorldMap.tsx` thuộc về bức tranh: nó đặt tám liên kết, giữ hai nhóm tiến độ
 * của giai đoạn 2, chạy hoạt ảnh hiện ra. Lớp chuyển động là một mối quan tâm
 * khác, có vòng đời khác (nó tháo ra được mà bản đồ vẫn đủ), nên nó ở đây và
 * `WorldMap.tsx` chỉ còn một dòng gọi nó.
 *
 * ── BA ĐIỀU LÀM BẰNG CSSOM, KHÔNG BẰNG `style={{…}}` ──────────────────
 * Màu, hộp của từng lớp, và độ trễ của năm sợi đều đặt bằng
 * `el.style.setProperty(...)` trong effect, KHÔNG bằng prop `style` của React.
 * Lý do là một bẫy có thật trong `AGENTS.md`: SSR tuần tự hoá style nội tuyến
 * thành thuộc tính `style="…"` trong HTML, và 257 chỗ `style={{…}}` ở 40 file
 * React là MỘT TRONG HAI nguyên nhân `style-src 'unsafe-inline'` chưa bỏ được
 * (nguyên nhân kia là ~70 handler nội tuyến của JS legacy). Đặt bằng CSSOM lúc
 * chạy thì HTML do server dựng không mang `style=` nào — và CSP không chặn
 * CSSOM, nó chỉ chặn `setAttribute('style', …)` và `style=` trong markup.
 *
 * ── KHÔNG CÓ `useState` ───────────────────────────────────────────────
 * Chế độ chạy phụ thuộc BỀ RỘNG KHỐI, tức một giá trị đọc từ DOM. Đưa nó vào
 * state là đúng khuôn mà `react-hooks/set-state-in-effect` của repo chặn ("đọc
 * trạng thái ngoài rồi setState trong effect"), và nó còn làm component render
 * lại mỗi lần đổi khổ. Nên mọi thứ làm bằng tay trong một effect, cùng kiểu
 * `WorldMap.tsx` chạy hoạt ảnh hiện ra.
 */

import { useEffect, useRef } from 'react';

import {
  BAND_DEPTH,
  bandFootY,
  bandHeadY,
  boxToPercent,
  LAKE_REGION,
  MOTION_BANDS,
  type MotionBandId,
  type MotionBox,
  motionAnimates,
  motionMode,
  motionVars,
  motionVisible,
  nearestWellX,
  parallaxShift,
  SEEP_REGION,
  shaftBox,
  THREAD_PATH_LENGTH,
  threadDelayMs,
  veilBox,
} from '@/lib/map-motion';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';
import { MAP_SUN, MAP_WELLS, REGION_LAYOUT } from '@/lib/world-map';

/**
 * Hộp của một gian, theo % khung — đọc THẲNG từ `REGION_LAYOUT`, không qua một
 * bản sao toạ độ nào. Đây là chỗ bản đầu đã sai: nó giữ hai hộp tính sẵn trong
 * `map-motion.ts`, và agent vẽ tranh dời hộp của M4 trong cùng buổi chiều.
 * Gian biến mất khỏi giáo trình thì trả `null` và lớp nước đó đơn giản không
 * được đặt — không ném, không đặt bừa vào góc trên-trái.
 */
function regionBox(key: string): MotionBox | null {
  const found = REGION_LAYOUT.find((r) => r.key === key);
  if (!found) return null;
  const [x, y, w, h] = found.box;
  return boxToPercent(x, y, w, h);
}

import styles from './map-motion.module.css';

/** Đặt một hộp (% của khung 1360 × 820) lên phần tử bằng CSSOM. */
function placeBox(el: HTMLElement | SVGElement, box: MotionBox): void {
  el.style.setProperty('left', `${box.left}%`);
  el.style.setProperty('top', `${box.top}%`);
  el.style.setProperty('width', `${box.width}%`);
  el.style.setProperty('height', `${box.height}%`);
}

export default function MapMotion() {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    // `.motion` nằm trong `.map` — đó là KHỐI phải đo. Không đo `window`: bản đồ
    // là một khối, và `@container` của `world-map.module.css` cũng đo khối (luật
    // 5 của file đó). Đo màn hình thì khối đặt trong cột hẹp của màn rộng sẽ
    // chạy lớp chuyển động ở một bố cục nó không còn đúng.
    const map = root?.parentElement ?? null;
    if (!root || !map) return;

    const veils = Array.from(root.querySelectorAll<HTMLElement>('[data-veil]'));
    const threads = Array.from(root.querySelectorAll<SVGPathElement>('[data-thread]'));

    let frame = 0;
    let onScreen = true;

    /** Một khung parallax. Chỉ `transform`, chỉ trên bốn màn khí — ảnh nền
     *  (`.decor`) KHÔNG nằm trong vòng này, nên nó không bị vẽ lại lần nào. */
    const apply = () => {
      frame = 0;
      if (!onScreen) return;
      const rect = map.getBoundingClientRect();
      const view = { mapTop: rect.top, mapHeight: rect.height, viewHeight: window.innerHeight };
      for (const el of veils) {
        const band = el.dataset.veil as MotionBandId | undefined;
        if (!band) continue;
        const px = parallaxShift(view, BAND_DEPTH[band]);
        el.style.setProperty('transform', `translate3d(0, ${px.toFixed(2)}px, 0)`);
      }
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(apply);
    };

    /** Dọn sạch mọi thứ effect này đặt vào DOM. */
    const teardown: (() => void)[] = [];

    const setup = () => {
      const mode = motionMode({ reduced, width: map.clientWidth });

      if (!motionVisible(mode)) {
        // Bỏ hẳn thuộc tính: CSS `:not([data-map-motion])` ẩn cả lớp. Không để
        // `data-map-motion="off"` — một lớp ẩn mà vẫn mang thuộc tính là chỗ ai
        // đó sẽ viết một quy tắc cho nó.
        root.removeAttribute('data-map-motion');
        return;
      }

      for (const [name, value] of motionVars()) root.style.setProperty(name, value);

      for (const el of veils) {
        const band = el.dataset.veil as MotionBandId | undefined;
        if (band) placeBox(el, veilBox(band));
      }
      // Cột bụi: trên giếng gần mặt trời nhất — giếng duy nhất có lý do để có
      // ánh sáng rọi vào. Hai mốc y suy ra từ chính `REGION_LAYOUT`: chân ba
      // công trình mặt đất LÀ mặt đất, và đỉnh ba gian dải sâu LÀ chỗ ánh sáng
      // từ trên đã tắt. Không con số nào của tranh bị chép lại ở đây.
      const shaft = root.querySelector<HTMLElement>('[data-shaft]');
      const wellX = nearestWellX(MAP_SUN.cx, MAP_WELLS.map((w) => w.x));
      const groundY = bandFootY(REGION_LAYOUT, 'surface');
      const darkY = bandHeadY(REGION_LAYOUT, 'deep');
      if (shaft && Number.isFinite(wellX) && Number.isFinite(groundY) && Number.isFinite(darkY)) {
        placeBox(shaft, shaftBox(wellX, groundY, darkY));
      }

      for (const [attr, key] of [
        ['[data-seep]', SEEP_REGION],
        ['[data-lake]', LAKE_REGION],
      ] as const) {
        const el = root.querySelector<HTMLElement>(attr);
        const box = regionBox(key);
        if (el && box) placeBox(el, box);
      }

      threads.forEach((el, i) => {
        el.style.setProperty('--map-thread-delay', `${threadDelayMs(i)}ms`);
      });

      // Đặt thuộc tính SAU khi đã đặt hộp và màu: CSS chỉ bật hoạt ảnh ở nhánh
      // `on`, nên không có khung nào chạy trên một lớp chưa có hình.
      root.setAttribute('data-map-motion', mode);

      if (!motionAnimates(mode)) return;

      // Chỉ nhánh `on` mới gắn listener. Người xin giảm chuyển động nhận `still`
      // — lớp hiện đủ, đứng yên, và KHÔNG có listener cuộn nào.
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      teardown.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });

      // Bản đồ cuộn ra khỏi khung nhìn thì không tính khung nào nữa. Không phải
      // vi tối ưu: `getBoundingClientRect` buộc trình duyệt tính lại bố cục,
      // nên một trang chủ dài mà vẫn chạy vòng này là một lượt layout mỗi khung
      // hình cho một thứ không ai đang xem.
      if (typeof IntersectionObserver === 'function') {
        const io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) onScreen = e.isIntersecting;
            if (onScreen) onScroll();
          },
          { rootMargin: '120px' },
        );
        io.observe(map);
        teardown.push(() => io.disconnect());
      }

      apply();
    };

    setup();

    // Đổi khổ cửa sổ có thể đưa khối qua mốc 1100px theo cả hai chiều, nên chế
    // độ phải tính lại — không chỉ vị trí parallax.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver === 'function') {
      let lastWidth = map.clientWidth;
      ro = new ResizeObserver(() => {
        const w = map.clientWidth;
        // Chỉ dựng lại khi đi QUA mốc. Không thì mỗi px kéo chuột là một lượt
        // tháo/gắn listener và một lượt khởi động lại năm sợi sáng.
        const crossed =
          motionMode({ reduced, width: lastWidth }) !== motionMode({ reduced, width: w });
        lastWidth = w;
        if (!crossed) {
          onScroll();
          return;
        }
        for (const fn of teardown.splice(0)) fn();
        setup();
      });
      ro.observe(map);
    }

    return () => {
      ro?.disconnect();
      if (frame !== 0) window.cancelAnimationFrame(frame);
      for (const fn of teardown.splice(0)) fn();
      // Gỡ transform do JS đặt: khung cuối của parallax là `translate3d(0,0,0)`
      // và đó cũng là trạng thái nghỉ trong CSS, nên bỏ hẳn thuộc tính là về
      // đúng chỗ đúng.
      for (const el of veils) el.style.removeProperty('transform');
      root.removeAttribute('data-map-motion');
    };
  }, [reduced]);

  return (
    <div className={styles.motion} ref={rootRef} aria-hidden="true">
      {/* 1 · Màn khí theo dải — parallax theo độ sâu. Thứ tự DOM là thứ tự dải,
          nên màn của dải đáy vẽ sau cùng (dày nhất, nằm trên). */}
      {MOTION_BANDS.map((band) => (
        <div key={band} className={styles.veil} data-veil={band} />
      ))}

      {/* 2 · Cột bụi trong giếng dưới mặt trời. */}
      <div className={styles.shaft} data-shaft>
        <div className={styles.shaftInk} />
      </div>

      {/* 3 · Mạch rỉ vào bể của M4. */}
      <div className={styles.seep} data-seep>
        <div className={styles.seepInk} />
      </div>

      {/* 4 · Mặt hồ ở đáy vực. */}
      <div className={styles.lake} data-lake>
        <div className={styles.lakeInk} />
      </div>

      {/* 5 · Năm sợi sáng vẽ dần xuống giếng, một lượt lúc nạp.
          `viewBox` đúng khung 1360 × 820 của tranh và `d` lấy thẳng từ
          `MAP_WELLS` — cùng mảng mà `build_map.py` đọc để vẽ năm cái giếng, nên
          sợi sáng KHÔNG THỂ lệch khỏi giếng trong tranh.
          `pathLength={100}`: bề dài đường thành 100 với mọi đường, nên
          `stroke-dasharray/dashoffset` trong CSS là một cặp số cố định và hiệu
          ứng không phải đo DOM bằng `getTotalLength()`. */}
      <svg className={styles.threads} viewBox="0 0 1360 820" aria-hidden="true">
        {MAP_WELLS.map((well) => (
          <path
            key={well.to}
            className={styles.thread}
            data-thread={well.to}
            d={well.d}
            pathLength={THREAD_PATH_LENGTH}
          />
        ))}
      </svg>
    </div>
  );
}
