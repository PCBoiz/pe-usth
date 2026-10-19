// BẢN ĐỒ SAO — route XEM THỬ của bản mẫu chòm M1 "Chạc".
//
// Đặc tả: `design/v3/ban-do-sao.md`. Đây là một bản MẪU: một chòm trên tám,
// để xem hình có đọc ra được không trước khi dựng cả bầu trời (§20 của đặc tả
// gọi đó là "phép thử nhận dạng"). Nó chưa thay bản đồ vực ở trang chủ.
//
// BA ĐIỀU GIỮ Ở ĐÂY, đổi đi là đổi hành vi người dùng thấy:
//
//  1. KHÔNG GỌI API. Trang này công khai, mà `apiFetch` gặp 401 là TỰ TẠO tài
//     khoản khách (bẫy trong AGENTS.md) — mỗi con bot quét web sinh một tài
//     khoản `@guest.local` và ăn một suất của THROTTLE_GUEST_LIMIT. Ở đây
//     không cần gì cả: giáo trình là tĩnh, và bản đồ không hiện tiến độ.
//
//  2. TRANH VÀO BẰNG `<img>`, KHÔNG NỘI TUYẾN. Nhờ thế tài liệu SVG bị cách
//     ly và luật "đừng thêm `id`/`data-*` thừa vào SVG" TỰ THI HÀNH: không có
//     selector nào của trang với vào trong được, nên một `id` đặt trong đó chỉ
//     là byte chết tải ở mỗi lượt vào trang. Lớp hover là HTML chồng lên, bám
//     `[data-map-region]`.
//
//  3. KHÔNG `style={{…}}`. SSR tuần tự hoá style nội tuyến thành thuộc tính
//     `style="…"`, một trong hai nguyên nhân `style-src 'unsafe-inline'` chưa
//     bỏ được (AGENTS.md). Mọi vị trí nằm ở `star-map.module.css`.
//
// Câu chữ ở `src/lib/star-map.ts` (`STAR_COPY`) để `node --test` đọc được;
// file này chỉ dựng DOM.
import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { withAssetVersion } from '@/lib/assetVersion';
import { SKY_CONSTELLATIONS, STAR_COPY } from '@/lib/star-map';

import styles from './star-map.module.css';

export const metadata: Metadata = {
  title: 'Bản đồ sao — mẫu chòm M1 · Programming EDU',
  // KHÔNG cho máy tìm kiếm lập chỉ mục. Trang này là một BẢN MẪU chưa dựng
  // xong (một chòm trên tám), cố ý không có lối vào từ thanh điều hướng —
  // xem `XEM_THU` trong `e2e/unit/site-nav.test.mjs`. Miễn lối vào mà vẫn để
  // Google dẫn người lạ vào đây thì ngoại lệ ấy vô nghĩa.
  robots: { index: false, follow: false },
};

/** Bài đầu của chặng M1 trong danh sách phẳng 48 bài. M1 là chặng đầu nên bài
 *  đầu của nó là bài 1 — viết ra chứ không giấu trong một con số trần. */
const M1_LESSON = '/lesson/python_advanced/1';

export default function StarMapPreviewPage() {
  const m1 = SKY_CONSTELLATIONS[0];
  return (
    <>
      <PageStyles hrefs={['/static/css/edu-theme.css']} />
      <SiteHeader />
      <main className={styles.wrap}>
        <h1>{STAR_COPY.title}</h1>
        <p className={styles.lead}>{STAR_COPY.lead}</p>
        <p className={styles.hint}>{STAR_COPY.hint}</p>

        <div className={styles.frame}>
          {/* Tấm NGHỈ. `alt` mô tả bức, không nhắc tới "ảnh" — nó là nội dung,
              không phải trang trí.

              `next/image` không dùng được ở đây, và không phải vì lười: bộ tối
              ưu ảnh của Next TỪ CHỐI xử lý SVG (nó là vector, nó đã nhỏ sẵn —
              48 KB — và nó phải sắc ở mọi tỉ lệ), nên nó sẽ phải chạy
              `unoptimized` và thành một `<img>` có thêm một lớp bọc. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`${m1.name} — ${m1.stars.length} ngôi sao, mỗi ngôi là một bài của chặng ${m1.key}`}
            className={styles.sky}
            height={390}
            src={withAssetVersion('/map/star/m1-rest.svg')}
            width={660}
          />
          {/* Vùng bấm nằm GIỮA hai tấm: tấm hover là anh em ĐỨNG SAU nó nên
              `.hit:hover ~ .skyFocus` khớp được mà không cần `:has()`. */}
          <a className={`${styles.hit} ${styles.hitM1}`} data-map-region={m1.key} href={M1_LESSON}>
            <span className={styles.srOnly}>{STAR_COPY.regionLabel}</span>
          </a>
          {/* Tấm HOVER — cùng bức, chỉ khác ĐỘ MỜ (và thêm mã bài). Không bán
              kính nào to lên, không nét nào dày lên, nên nó an toàn với
              `prefers-reduced-motion` ngay từ lúc sinh. `aria-hidden` vì nó
              không nói thêm điều gì cho trình đọc màn hình. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            aria-hidden="true"
            className={styles.skyFocus}
            height={390}
            src={withAssetVersion('/map/star/m1-focus.svg')}
            width={660}
          />
        </div>

        <h2 className={styles.legendTitle}>{STAR_COPY.legendTitle}</h2>
        <ul className={styles.legend}>
          {STAR_COPY.legend.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </main>
    </>
  );
}
