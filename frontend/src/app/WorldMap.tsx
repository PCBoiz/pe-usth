'use client';

/**
 * BẢN ĐỒ THẾ GIỚI — khối chính của trang chủ. Phương án A "Mặt cắt lục địa"
 * (`design/v3/quyet-dinh.md` mục 3): công trình của nhà triết học tự nhiên,
 * cắt dọc, tám gian.
 *
 * ── TRANH KHÔNG NẰM TRONG FILE NÀY, VÀ ĐÓ LÀ QUYẾT ĐỊNH CHÍNH ──────────
 *
 * Hai bản trước vẽ tiểu cảnh bằng vài chục `<path>` viết tay trong chính file
 * này và bị bác vì "xấu và trẻ con". Nguyên nhân không phải gu thẩm mỹ: hai bản
 * tham chiếu (bản đồ Vực Thẳm của *Made in Abyss*, bản đồ Runeterra) là TRANH
 * NÉT — hàng chục nghìn nét mực, màu chỉ là lớp phủ bên dưới — còn mảng phẳng
 * tô gradient thì không có mật độ ấy, và KHÔNG THỂ có nếu viết tay.
 *
 * Nên tranh do `scripts/map/build_map.py` SINH RA (≈50 000 nét, hachure theo
 * độ dốc, đường bình độ, chấm lấm tấm, nét sóng, vân giấy) và nằm ở
 * `public/map/*.svg`. Component chỉ còn ba việc: đặt tám LIÊN KẾT đúng chỗ,
 * giữ hai nhóm tiến độ của giai đoạn 2, và chạy hoạt ảnh.
 *
 * Tranh vào trang bằng `background-image` trong CSS, KHÔNG bằng `<img>` hay SVG
 * nội tuyến. Ba lý do, và lý do thứ ba là lý do thật:
 *  1. nội tuyến thì ~850 KB tranh nằm trong HTML của trang chủ, mỗi lần tải;
 *  2. `<img>` thì ở bản rộng vẫn tải tám ô crop, ở bản hẹp vẫn tải bản rộng;
 *  3. ảnh nền của một quy tắc @container KHÔNG KHỚP thì trình duyệt không tải —
 *     nên máy tính chỉ tải bản rộng, điện thoại chỉ tải ô crop của nó.
 *
 * NĂM ĐIỀU GIỮ Ở ĐÂY, đổi đi là đổi hành vi người dùng thấy:
 *
 *  1. MỖI VÙNG LÀ MỘT `<a href>` THẬT, có nhãn thật, và hộp của nó phủ CẢ
 *     TIỂU CẢNH lẫn tấm nhãn — bấm vào lò của M1 cũng là mở M1. Không `<div>`
 *     bắt sự kiện: bản đồ là lối đi chính vào khoá, nên nó phải đi được bằng
 *     Tab, mở được bằng Enter, bấm giữa chuột ra tab mới. Mọi hình `aria-hidden`.
 *  2. MỘT DOM CHO HAI BỐ CỤC. Rộng: tám liên kết định vị tuyệt đối trên khung
 *     1360 × 820, tranh là nền phía sau. Hẹp: mỗi dải thành một khối ngang hết
 *     bề rộng, cuộn xuống = đi xuống. Đổi bằng `@container` — không dựng hai bộ
 *     liên kết (hai bộ là Tab qua 16 chỗ, hoặc phải ẩn một bộ và lo nó lệch).
 *  3. ĐƯỜNG NỐI CHỈ Ở M5 → M6 → M7 → M8. Ở bản rộng chúng nằm TRONG tranh
 *     (script đọc `MAP_FLOWS` để vẽ, nên không lệch được); ở bản hẹp dựng từ
 *     `MAP_FLOWS.find`. Không nét nào nối M1 → M8: một đường duy nhất là lời
 *     hứa ngầm về thứ tự.
 *  4. KHÔNG TIẾN ĐỘ, KHÔNG KHOÁ, KHÔNG GỌI API. Hai nhóm `data-lit` và
 *     `data-marker` của mỗi vùng là chỗ GIAI ĐOẠN 2 phủ tiến độ lên — vẽ sẵn,
 *     `display="none"`. Trang chủ công khai: `apiFetch` gặp 401 là tự tạo tài
 *     khoản khách (bẫy AGENTS.md).
 *  5. MÀU ĐI QUA THUỘC TÍNH SVG (`fill=`, `stroke=`), không qua `style={{…}}`:
 *     SSR tuần tự hoá style nội tuyến thành `style="…"`, và đó là một trong hai
 *     nguyên nhân `style-src 'unsafe-inline'` chưa bỏ được. Mã màu không viết ở
 *     đây — chúng có tên trong `MAP_PALETTE`.
 */

import { Fragment, useEffect, useRef } from 'react';

import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';
import {
  BANDS,
  type BandId,
  decorStep,
  MAP_COPY,
  MAP_FLOWS,
  MAP_PALETTE as P,
  type Region,
  regionStep,
} from '@/lib/world-map';

import MapMotion from './MapMotion';
import styles from './world-map.module.css';

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
        {/* Tranh mặt cắt — `public/map/world-map.svg`, đặt bằng CSS. Một `<div>`
            trống chứ không phải `<img>`: ở bản hẹp quy tắc @container tắt nó
            nên trình duyệt không tải 850 KB mà điện thoại không bao giờ hiện. */}
        <div className={styles.decor} data-map-decor aria-hidden="true" />

        {/* LỚP CHUYỂN ĐỘNG — chồng lên tranh, dưới tám liên kết. Nó KHÔNG chạm
            `.decor`: tranh là ảnh nền 877 KB, nên nó là lớp XA NHẤT với hệ số
            parallax = 0 và không bị vẽ lại lần nào. Thứ tự ở đây là hợp đồng:
            sau tranh (để chồng lên), trước tám liên kết (để không chắn cú bấm —
            lớp còn `pointer-events: none`). Tháo một dòng này ra thì bản đồ vẫn
            đủ và vẫn bấm được. Xem `src/lib/map-motion.ts`. */}
        <MapMotion />

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
                        {/* Ô tiểu cảnh. Ở bản RỘNG nó trong suốt — tranh nền phía
                            sau đã vẽ đúng chỗ này; ở bản HẸP, CSS đổ vào nó ô
                            crop `scene-M*.svg`. viewBox lấy từ `box` nên tỉ lệ ô
                            luôn khớp phần tranh mà nó cắt ra. */}
                        <svg className={styles.scene} viewBox={`${x} ${y} ${w} ${h}`} width={w} height={h} aria-hidden="true">
                          {/* GIAI ĐOẠN 2 — tiến độ phủ lên bằng ánh sáng, vẽ sẵn mà ẩn.
                              `data-lit`: vùng "thắp đèn" khi đã học; `data-marker`:
                              đốm sáng "bạn đang ở đây" ở mép ô. Đợt thử nghiệm
                              KHÔNG đọc tiến độ nên cả hai đứng `display="none"`. */}
                          <g data-lit={layout.key} display="none">
                            <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2.4} ry={h / 2.6} fill={P.light.glow} opacity="0.35" />
                          </g>
                          <g data-marker={layout.key} display="none">
                            <circle cx={x + 18} cy={y + 18} r="9" fill={P.light.sun} stroke={P.ink.deep} strokeWidth="2" />
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
