'use client';

/**
 * BẢN ĐỒ THẾ GIỚI — khối chính của trang chủ. Phương án A "Mặt cắt lục địa"
 * (`design/v3/quyet-dinh.md` mục 3), dựng theo hai artboard của canvas v3:
 * `project/Main.dc.html` (máy tính) và `project/MapPhone.dc.html` (điện thoại).
 *
 * File này CHỈ dựng DOM và gọi `.animate()`. Mọi quyết định (tên chặng, số bài,
 * liên kết, nhãn, dải, đường nối, bảng màu, keyframe) nằm ở `@/lib/world-map`
 * để `node --test` kiểm được không cần trình duyệt — xem
 * `e2e/unit/world-map.test.mjs`.
 *
 * NĂM ĐIỀU GIỮ Ở ĐÂY, đổi đi là đổi hành vi người dùng thấy:
 *
 *  1. MỖI VÙNG LÀ MỘT `<a href>` THẬT, có nhãn thật, BỌC CẢ TIỂU CẢNH lẫn tấm
 *     nhãn — bấm vào lò của M1 cũng là mở M1. Không `<div>` bắt sự kiện: bản đồ
 *     là lối đi chính vào khoá, nên nó phải đi được bằng Tab, mở được bằng
 *     Enter, bấm giữa chuột ra tab mới. Mọi `<svg>` đều `aria-hidden`.
 *  2. MỘT DOM CHO HAI BỐ CỤC. Rộng: tám liên kết định vị tuyệt đối trên khung
 *     1360 × 820 của artboard, nền (trời, bốn dải, giếng, mạch sáng) là một SVG
 *     phía sau. Hẹp: mỗi dải thành một khối ngang hết bề rộng, cuộn xuống = đi
 *     xuống; không pan, không phóng. Đổi bằng `@container` trong CSS — không
 *     dựng hai bộ liên kết (hai bộ là Tab qua 16 chỗ, hoặc phải ẩn một bộ và
 *     lo nó lệch nhau).
 *  3. ĐƯỜNG NỐI CHỈ Ở M5 → M6 → M7 → M8, dựng từ `MAP_FLOWS`. Không nét nào
 *     nối M1 → M8: một đường duy nhất là lời hứa ngầm về thứ tự.
 *  4. KHÔNG TIẾN ĐỘ, KHÔNG KHOÁ, KHÔNG GỌI API. Hai nhóm `data-lit` và
 *     `data-marker` của mỗi vùng là chỗ GIAI ĐOẠN 2 phủ tiến độ lên — vẽ sẵn,
 *     `display="none"`. Trang chủ công khai: `apiFetch` gặp 401 là tự tạo tài
 *     khoản khách (bẫy AGENTS.md).
 *  5. MÀU MINH HOẠ ĐI QUA THUỘC TÍNH SVG (`fill=`, `stroke=`), không qua
 *     `style={{…}}`: SSR tuần tự hoá style nội tuyến thành `style="…"`, và đó
 *     là một trong hai nguyên nhân `style-src 'unsafe-inline'` chưa bỏ được. Mã
 *     màu không viết ở đây — chúng có tên trong `MAP_PALETTE`.
 */

import { Fragment, useEffect, useRef } from 'react';

import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';
import {
  BANDS,
  type BandId,
  decorStep,
  MAP_COPY,
  MAP_FLOWS,
  MAP_FRAME,
  MAP_PALETTE as P,
  MAP_SUN,
  MAP_WELLS,
  type Region,
  regionStep,
} from '@/lib/world-map';

import styles from './world-map.module.css';

type Scene = {
  /**
   * Nền riêng của ô — CHỈ hiện ở bản hẹp (`.phoneOnly`). Ở bản rộng nền chung
   * phía sau đã vẽ đúng chỗ đó; vẽ hai lần thì mép đất thẳng của ô đè lên mép
   * đất lượn của dải.
   */
  back: React.ReactNode;
  /** Hình bóng địa danh. */
  body: React.ReactNode;
};

/** Ô kính phản chiếu trời trong lưới 4 × 4 của M3 (đánh số theo hàng). */
const GLASS_SKY = new Set([1, 3, 4, 10, 13]);

/**
 * Tám tiểu cảnh, toạ độ chép từ artboard (hệ 1360 × 820). Mỗi vùng một HÌNH
 * BÓNG khác hẳn nhau — xưởng, khung cửi, mặt tiền kính, bể, tinh thể, vỉa tầng,
 * hang, hồ — để người không phân biệt được sắc vẫn tách được tám vùng.
 */
const SCENES: Record<string, Scene> = {
  M1: {
    back: (
      <>
        <rect x="0" y="0" width="460" height="260" fill={P.band.sky} />
        <circle cx={MAP_SUN.cx} cy={MAP_SUN.cy} r="190" fill={P.light.halo} opacity="0.75" />
        <circle cx={MAP_SUN.cx} cy={MAP_SUN.cy} r="110" fill={P.light.glow} opacity="0.8" />
        <circle cx={MAP_SUN.cx} cy={MAP_SUN.cy} r="26" fill={P.light.sun} />
        <polygon points="96,72 128,72 400,234 132,234" fill={P.light.ray} opacity="0.7" />
        <rect x="0" y="234" width="460" height="30" fill={P.band.surface} />
        <line x1="0" y1="235" x2="460" y2="235" stroke={P.ground} strokeWidth="3" />
      </>
    ),
    body: (
      <g data-scene="M1">
        <circle cx="184" cy="74" r="10" fill={P.m1.smoke} />
        <circle cx="196" cy="56" r="14" fill={P.m1.smokeLight} />
        <circle cx="279" cy="52" r="11" fill={P.m1.smoke} />
        <circle cx="293" cy="32" r="15" fill={P.m1.smokeLight} />
        <rect x="175" y="88" width="18" height="52" fill={P.m1.chimney} />
        <rect x="270" y="68" width="18" height="72" fill={P.m1.chimney} />
        <polygon points="142,152 234,112 328,152" fill={P.m1.roof} stroke={P.m1.ink} strokeWidth="2" />
        <rect x="150" y="150" width="172" height="84" fill={P.m1.edge} stroke={P.m1.ink} strokeWidth="2" />
        <rect x="166" y="174" width="26" height="30" rx="3" fill={P.m1.window} stroke={P.m1.ink} strokeWidth="1.5" />
        <rect x="202" y="174" width="26" height="30" rx="3" fill={P.m1.window} stroke={P.m1.ink} strokeWidth="1.5" />
        <rect x="238" y="174" width="26" height="30" rx="3" fill={P.m1.window} stroke={P.m1.ink} strokeWidth="1.5" />
        <rect x="282" y="196" width="26" height="38" fill={P.m1.ink} />
        <polyline points="322,196 354,196 354,170 392,170" fill="none" stroke={P.m1.chimney} strokeWidth="6" />
        <polyline points="354,196 354,222 392,222" fill="none" stroke={P.m1.chimney} strokeWidth="6" />
        <rect x="390" y="158" width="24" height="24" rx="4" fill={P.m1.edge} stroke={P.m1.ink} strokeWidth="2" />
        <rect x="390" y="210" width="24" height="24" rx="4" fill={P.m1.edge} stroke={P.m1.ink} strokeWidth="2" />
      </g>
    ),
  },
  M2: {
    back: (
      <>
        <rect x="480" y="20" width="400" height="230" fill={P.band.sky} />
        <rect x="480" y="234" width="400" height="20" fill={P.band.surface} />
        <line x1="480" y1="235" x2="880" y2="235" stroke={P.ground} strokeWidth="3" />
      </>
    ),
    body: (
      <g data-scene="M2" opacity="0.92">
        <rect x="552" y="112" width="238" height="14" fill={P.m2.edge} />
        <rect x="560" y="120" width="12" height="114" fill={P.m2.edge} />
        <rect x="770" y="120" width="12" height="114" fill={P.m2.edge} />
        <rect x="560" y="206" width="222" height="12" fill={P.m2.edge} />
        <path
          d="M586 126V206M598 126V206M610 126V206M622 126V206M634 126V206M646 126V206M658 126V206M670 126L682 206M682 126L670 206M694 126V206M706 126V206M718 126V206M730 126V206M742 126V206M754 126V206"
          stroke={P.m2.thread}
          strokeWidth="2.5"
        />
        <circle cx="676" cy="166" r="8" fill={P.m2.knot} />
        <ellipse cx="814" cy="216" rx="14" ry="18" fill={P.m2.thread} stroke={P.m2.knot} strokeWidth="2" />
        <path d="M782 200 C 796 196 804 204 812 206" fill="none" stroke={P.m2.thread} strokeWidth="2" />
      </g>
    ),
  },
  M3: {
    back: (
      <>
        <rect x="930" y="20" width="400" height="230" fill={P.band.sky} />
        <rect x="930" y="234" width="400" height="20" fill={P.band.surface} />
        <line x1="930" y1="235" x2="1330" y2="235" stroke={P.ground} strokeWidth="3" />
      </>
    ),
    body: (
      <g data-scene="M3" opacity="0.9">
        <rect x="1010" y="92" width="200" height="142" fill={P.m3.edge} />
        {/* Lưới 4 × 4 ô kính; ô phản chiếu trời xen kẽ như artboard. */}
        {[104, 136, 168, 200].map((y, row) =>
          [1022, 1068, 1114, 1160].map((x, col) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="38"
              height="24"
              fill={GLASS_SKY.has(row * 4 + col) ? P.m3.sky : P.m3.glass}
            />
          )),
        )}
        <rect x="1210" y="150" width="44" height="84" fill={P.m3.side} />
        <rect x="1220" y="162" width="24" height="22" fill={P.m3.glass} />
        <rect x="1220" y="194" width="24" height="22" fill={P.m3.sky} />
      </g>
    ),
  },
  M4: {
    back: <rect x="460" y="360" width="440" height="150" fill={P.band.shallow} />,
    body: (
      <g data-scene="M4">
        <g fill="none" stroke={P.m4.edge} strokeWidth="3" strokeLinecap="round">
          <path d="M540 392 C 560 420 570 440 596 462" />
          <path d="M610 388 C 616 412 628 436 642 458" />
          <path d="M752 388 C 748 414 734 436 720 458" />
          <path d="M846 394 C 820 420 796 444 768 464" />
          <path d="M886 420 C 850 440 820 456 790 468" />
        </g>
        <g fill={P.m4.edge}>
          <circle cx="574" cy="440" r="3.5" />
          <circle cx="630" cy="430" r="3.5" />
          <circle cx="742" cy="428" r="3.5" />
          <circle cx="816" cy="440" r="3.5" />
        </g>
        <ellipse cx="680" cy="474" rx="124" ry="26" fill={P.m4.rim} />
        <ellipse cx="680" cy="470" rx="104" ry="17" fill={P.m4.water} />
        <ellipse cx="664" cy="467" rx="46" ry="6" fill={P.m4.shine} />
      </g>
    ),
  },
  M5: {
    back: <rect x="110" y="520" width="340" height="160" fill={P.band.deep} />,
    body: (
      <g data-scene="M5">
        <rect x="140" y="640" width="280" height="14" rx="6" fill={P.m5.base} />
        <g fill={P.m5.edge} stroke={P.m5.facet} strokeWidth="1.5">
          {[160, 206, 252, 298, 344].map((x) => (
            <polygon key={x} points={`${x},640 ${x},590 ${x + 16},570 ${x + 32},590 ${x + 32},640`} />
          ))}
        </g>
        <g fill={P.m5.front} stroke={P.m5.facet} strokeWidth="1.5">
          {[183, 229, 275, 321].map((x) => (
            <polygon key={x} points={`${x},600 ${x},566 ${x + 16},548 ${x + 32},566 ${x + 32},600`} />
          ))}
        </g>
      </g>
    ),
  },
  M6: {
    back: <rect x="510" y="520" width="350" height="160" fill={P.band.deep} />,
    body: (
      <g data-scene="M6">
        <rect x="540" y="566" width="290" height="16" fill={P.m6.top} />
        <rect x="540" y="582" width="290" height="16" fill={P.m6.edge} />
        <rect x="540" y="598" width="290" height="16" fill={P.m6.low} />
        <rect x="540" y="614" width="290" height="16" fill={P.m6.edge} />
        <rect x="540" y="630" width="290" height="16" fill={P.m6.low} />
        <path d="M598 566V646M656 566V646M714 566V646M772 566V646" stroke={P.m6.grid} strokeWidth="1.5" />
        <g fill={P.m6.moss}>
          <circle cx="552" cy="565" r="7" />
          <circle cx="572" cy="562" r="9" />
          <circle cx="600" cy="565" r="6" />
          <circle cx="648" cy="563" r="8" />
          <circle cx="700" cy="565" r="6" />
          <circle cx="742" cy="562" r="9" />
          <circle cx="790" cy="564" r="7" />
          <circle cx="816" cy="562" r="8" />
        </g>
      </g>
    ),
  },
  M7: {
    back: <rect x="920" y="520" width="350" height="160" fill={P.band.deep} />,
    body: (
      <g data-scene="M7">
        <path d="M948 652 L948 604 Q 1092 520 1236 604 L1236 652 Z" fill={P.m7.cave} stroke={P.m7.edge} strokeWidth="2" />
        <g fill={P.m7.halo} opacity="0.3">
          <rect x="988" y="608" width="36" height="48" rx="6" />
          <rect x="1028" y="584" width="36" height="72" rx="6" />
          <rect x="1068" y="596" width="36" height="60" rx="6" />
          <rect x="1108" y="566" width="36" height="90" rx="6" />
          <rect x="1148" y="590" width="36" height="66" rx="6" />
        </g>
        <g fill={P.m7.glow}>
          <rect x="996" y="618" width="20" height="34" rx="3" />
          <rect x="1036" y="594" width="20" height="58" rx="3" />
          <rect x="1076" y="606" width="20" height="46" rx="3" />
          <rect x="1116" y="576" width="20" height="76" rx="3" />
          <rect x="1156" y="600" width="20" height="52" rx="3" />
        </g>
      </g>
    ),
  },
  M8: {
    back: (
      <>
        <rect x="430" y="690" width="500" height="190" fill={P.band.floor} />
        <ellipse cx="680" cy="772" rx="240" ry="80" fill={P.m8.edge} opacity="0.16" />
        <ellipse cx="680" cy="772" rx="200" ry="54" fill={P.m8.edge} opacity="0.24" />
      </>
    ),
    body: (
      <g data-scene="M8">
        <ellipse cx="680" cy="772" rx="164" ry="28" fill={P.m8.edge} />
        <ellipse cx="680" cy="770" rx="140" ry="20" fill={P.m8.water} />
        {/* Hồ hợp lưu phản chiếu bảy sắc phía trên — hai bài dự án dùng mọi
            thứ của bảy chặng kia. */}
        <g strokeWidth="3" strokeLinecap="round">
          <line x1="592" y1="766" x2="616" y2="766" stroke={P.m1.edge} />
          <line x1="626" y1="774" x2="652" y2="774" stroke={P.m2.thread} />
          <line x1="660" y1="764" x2="684" y2="764" stroke={P.m3.glass} />
          <line x1="694" y1="776" x2="718" y2="776" stroke={P.m4.water} />
          <line x1="726" y1="766" x2="750" y2="766" stroke={P.m5.edge} />
          <line x1="636" y1="782" x2="660" y2="782" stroke={P.m6.edge} />
          <line x1="702" y1="784" x2="726" y2="784" stroke={P.m7.halo} />
        </g>
      </g>
    ),
  },
};

/** Nền chung của bản rộng: trời, mặt trời, bốn dải, giếng, mạch sáng. */
function Backdrop() {
  return (
    <svg
      className={styles.decor}
      data-map-decor
      viewBox={`0 0 ${MAP_FRAME.width} ${MAP_FRAME.height}`}
      aria-hidden="true"
    >
      <rect x="0" y="0" width={MAP_FRAME.width} height={MAP_FRAME.height} fill={P.paper} />
      <rect x="0" y="0" width={MAP_FRAME.width} height="260" fill={P.band.sky} />
      {/* Chỗ bắt đầu báo bằng ÁNH SÁNG: mặt trời đứng trên M1, quầng của nó
          là chỗ sáng nhất bản vẽ. Không mũi tên, không số, không chữ. */}
      <circle cx={MAP_SUN.cx} cy={MAP_SUN.cy} r="190" fill={P.light.halo} opacity="0.75" />
      <circle cx={MAP_SUN.cx} cy={MAP_SUN.cy} r="110" fill={P.light.glow} opacity="0.8" />
      <circle cx={MAP_SUN.cx} cy={MAP_SUN.cy} r="26" fill={P.light.sun} />
      <polygon points="96,72 128,72 400,234 132,234" fill={P.light.ray} opacity="0.7" />

      <path d="M0 236 C 180 226 360 242 560 234 C 760 226 980 240 1160 232 C 1260 228 1320 234 1360 236 L1360 380 L0 380 Z" fill={P.band.surface} />
      <path d="M0 236 C 180 226 360 242 560 234 C 760 226 980 240 1160 232 C 1260 228 1320 234 1360 236" fill="none" stroke={P.ground} strokeWidth="3" />
      <path d="M0 384 C 220 374 420 392 680 382 C 920 374 1140 390 1360 380 L1360 524 L0 524 Z" fill={P.band.shallow} />
      <path d="M0 526 C 240 516 460 534 700 522 C 940 512 1160 532 1360 520 L1360 706 L0 706 Z" fill={P.band.deep} />
      {/* Đáy SÁNG LẠI quanh hồ — bỏ cái nghĩa "càng sâu càng nguy hiểm". */}
      <path d="M0 704 C 260 696 480 712 700 702 C 940 694 1160 710 1360 700 L1360 820 L0 820 Z" fill={P.band.floor} />
      <ellipse cx="680" cy="772" rx="420" ry="86" fill={P.m8.edge} opacity="0.14" />
      <ellipse cx="680" cy="772" rx="260" ry="56" fill={P.m8.edge} opacity="0.22" />

      {/* Giếng riêng của từng vùng dưới mặt đất: giá đầu giếng + trục xuống. */}
      <g fill="none" stroke={P.well.head} strokeWidth="2">
        {MAP_WELLS.map((w) => (
          <Fragment key={w.to}>
            <path d={`M${w.x - 14} 236 L${w.x} 206 L${w.x + 14} 236`} />
            <circle cx={w.x} cy="206" r="6" />
          </Fragment>
        ))}
      </g>
      <g fill="none" stroke={P.well.shaft} strokeWidth="8" opacity="0.4">
        {MAP_WELLS.map((w) => <path key={w.to} d={w.d} />)}
      </g>
      <g fill="none" stroke={P.well.rope} strokeWidth="2" strokeDasharray="4 6">
        {MAP_WELLS.map((w) => <path key={w.to} d={w.d} />)}
      </g>

      {/* Mạch sáng: CHỈ nơi phụ thuộc thật, dựng từ MAP_FLOWS. */}
      <g fill="none" stroke={P.flow} strokeLinecap="round">
        {MAP_FLOWS.map((f) => (
          <g key={`${f.from}-${f.to}`} data-flow={`${f.from}-${f.to}`}>
            <path d={f.d} strokeWidth="10" opacity="0.22" />
            <path d={f.d} strokeWidth="3" />
            <polygon points={f.head} fill={P.flow} stroke="none" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Mạch sáng ở bản hẹp: một đoạn dọc giữa hai vùng, chảy theo hướng cuộn. */
function FlowDown({ from, to }: { from: string; to: string }) {
  return (
    <svg className={styles.flowDown} data-flow={`${from}-${to}`} viewBox="0 0 346 40" aria-hidden="true">
      <line x1="173" y1="0" x2="173" y2="40" stroke={P.flow} strokeWidth="10" opacity="0.22" />
      <line x1="173" y1="0" x2="173" y2="40" stroke={P.flow} strokeWidth="3" />
      <polygon points="166,16 180,16 173,28" fill={P.flow} />
    </svg>
  );
}

/** Đường lượn giữa hai dải ở bản hẹp. */
const SEAMS: Partial<Record<BandId, { d: string; from: string; to: string }>> = {
  shallow: { d: 'M0 10 C 90 2 180 18 270 8 C 320 4 360 12 390 8 L390 20 L0 20 Z', from: P.band.surface, to: P.band.shallow },
  deep: { d: 'M0 8 C 100 16 200 2 300 10 C 340 13 370 8 390 10 L390 20 L0 20 Z', from: P.band.shallow, to: P.band.deep },
  floor: { d: 'M0 12 C 110 4 220 18 330 8 C 360 6 380 10 390 9 L390 20 L0 20 Z', from: P.band.deep, to: P.band.floor },
};

const BAND_FILL: Record<BandId, string> = {
  surface: P.band.surface,
  shallow: P.band.shallow,
  deep: P.band.deep,
  floor: P.band.floor,
};

export type WorldMapProps = {
  /** Các vùng dựng từ `buildRegions(curricula.modules, lessonUrl)`. */
  regions: Region[];
};

export default function WorldMap({ regions }: WorldMapProps) {
  const reduced = usePrefersReducedMotion();
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Xin giảm chuyển động ⇒ KHÔNG chạy gì, không phải "chạy nhanh hơn".
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
    // khung cuối ĐÃ LÀ trạng thái nghỉ của CSS nên phần tử đứng luôn ở chỗ đúng.
    return () => {
      for (const anim of anims) anim.cancel();
    };
  }, [reduced]);

  if (regions.length === 0) return null;

  // Giáo trình không còn đúng tám chặng của bản vẽ ⇒ chỉ còn danh sách liên
  // kết. Thà mất tranh còn hơn dán hồ của hai bài dự án lên chặng thứ chín.
  const drawn = regions.every((r) => r.layout !== null);

  const plate = (region: Region, i: number) => (
    <span className={`${styles.plate} ${i === 0 ? styles.plateLead : ''}`}>
      {/* `aria-hidden` cho cả chữ: `aria-label` của liên kết đã nói đủ tên
          chặng + số bài + đi đâu. Không ẩn thì trình đọc màn hình đọc hai lần. */}
      <span className={styles.regionName} aria-hidden="true">{region.name}</span>
      <span className={styles.regionMeta} aria-hidden="true">{region.meta}</span>
    </span>
  );

  if (!drawn) {
    return (
      <section className={styles.wrap} aria-labelledby="mapTitle">
        <h2 className={styles.label} id="mapTitle">{MAP_COPY.label}</h2>
        <div className={styles.plain} ref={mapRef}>
          {regions.map((region, i) => (
            <a key={region.href} className={styles.plainRegion} data-map-region href={region.href} aria-label={region.ariaLabel}>
              {plate(region, i)}
            </a>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.wrap} aria-labelledby="mapTitle">
      <h2 className={styles.label} id="mapTitle">{MAP_COPY.label}</h2>

      <div className={styles.map} ref={mapRef}>
        <Backdrop />

        {BANDS.map((band) => {
          const seam = SEAMS[band];
          return (
            <Fragment key={band}>
              {seam && (
                <svg className={styles.seam} viewBox="0 0 390 20" preserveAspectRatio="none" aria-hidden="true">
                  <rect width="390" height="20" fill={seam.from} />
                  <path d={seam.d} fill={seam.to} />
                </svg>
              )}
              <div className={styles.band} data-band={band}>
                <svg className={styles.bandFill} viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true">
                  <rect width="10" height="10" fill={BAND_FILL[band]} />
                </svg>
                {regions.map((region, i) => {
                  const layout = region.layout;
                  if (!layout || layout.band !== band) return null;
                  const [x, y, w, h] = layout.box;
                  const scene = SCENES[layout.key];
                  const flow = MAP_FLOWS.find((f) => f.from === layout.key);
                  return (
                    <Fragment key={layout.key}>
                      <a
                        className={`${styles.region} ${styles[`spot${i + 1}`] ?? ''}`}
                        data-map-region
                        data-band={band}
                        href={region.href}
                        aria-label={region.ariaLabel}
                      >
                        <svg className={styles.scene} viewBox={`${x} ${y} ${w} ${h}`} width={w} height={h} aria-hidden="true">
                          <g className={styles.phoneOnly}>{scene?.back}</g>
                          {scene?.body}
                          {/* GIAI ĐOẠN 2 — tiến độ phủ lên bằng ánh sáng, vẽ sẵn mà ẩn.
                              `data-lit`: vùng "thắp đèn" khi đã học; `data-marker`:
                              đốm sáng "bạn đang ở đây" ở mép ô. Đợt thử nghiệm
                              KHÔNG đọc tiến độ nên cả hai đứng `display="none"`. */}
                          <g data-lit={layout.key} display="none">
                            <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2.4} ry={h / 2.6} fill={P.light.glow} opacity="0.35" />
                          </g>
                          <g data-marker={layout.key} display="none">
                            <circle cx={x + 18} cy={y + 18} r="9" fill={P.light.sun} stroke={P.m1.ink} strokeWidth="2" />
                          </g>
                        </svg>
                        {plate(region, i)}
                      </a>
                      {flow && <FlowDown from={flow.from} to={flow.to} />}
                    </Fragment>
                  );
                })}
              </div>
            </Fragment>
          );
        })}
        {/* Giếng ở bản hẹp: một trục mảnh ở mép trái chạy suốt từ mặt đất xuống
            đáy, vắt qua cả các đường lượn giữa hai dải. */}
        <svg className={styles.wellPhone} viewBox="0 0 2 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="1" y1="0" x2="1" y2="100" stroke={P.well.shaft} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      {/* Không có chú thích dưới bản đồ — lý lẽ ở MAP_COPY (lib/world-map.ts). */}
    </section>
  );
}
