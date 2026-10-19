// BẢN ĐỒ SAO — route XEM THỬ: cả bầu trời, tám chòm, 48 ngôi = 48 bài.
//
// Đặc tả: `design/v3/ban-do-sao.md`. Mở rộng từ bản mẫu một chòm (M1) ngày
// 19/10/2026, khi chủ sản phẩm xem mẫu rồi hỏi "chòm này kết nối với các chòm
// khác như nào?" — câu đó chỉ trả lời được bằng cả bầu trời. Nó vẫn chưa thay
// bản đồ vực ở trang chủ.
//
// BỐN ĐIỀU GIỮ Ở ĐÂY, đổi đi là đổi hành vi người dùng thấy:
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
//  4. THỨ TỰ DOM LÀ MỘT HỢP ĐỒNG, không phải một cách sắp cho gọn. Ba việc
//     cùng dựa vào nó:
//      · mọi `<a>` vùng bấm phải đứng TRƯỚC mọi `<img>`, vì trạng thái hover
//        đi qua bộ chọn anh em `~` (`.hitM1:hover ~ .chomM1`) — `~` chỉ nhìn
//        về phía SAU. Chúng vẫn nằm TRÊN tranh nhờ `z-index`, không nhờ thứ
//        tự;
//      · trong số các `<a>`, ô NHÃN đứng trước ô BAO LỒI, nên chỗ hai ô chồng
//        nhau thì bao lồi thắng: các ngôi sao là cái người ta định trỏ vào;
//      · trong số các `<img>`, thứ tự LÀ thứ tự z, và nó phải khớp `SKY_TILES`
//        → `SKY_LAYERS`. `e2e/unit/star-map.test.mjs` so lại.
//
// Câu chữ ở `src/lib/star-map.ts` (`STAR_COPY`) để `node --test` đọc được;
// file này chỉ dựng DOM.
import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { withAssetVersion } from '@/lib/assetVersion';
import { SKY_CONSTELLATIONS, SKY_COURSE, SKY_FRAME, STAR_COPY } from '@/lib/star-map';

import styles from './star-map.module.css';

export const metadata: Metadata = {
  title: 'Bản đồ sao — tám chòm · Programming EDU',
  // KHÔNG cho máy tìm kiếm lập chỉ mục. Trang này là một BẢN XEM THỬ chưa
  // thay bản đồ vực ở trang chủ, cố ý không có lối vào từ thanh điều hướng —
  // xem `XEM_THU` trong `e2e/unit/site-nav.test.mjs`. Miễn lối vào mà vẫn để
  // Google dẫn người lạ vào đây thì ngoại lệ ấy vô nghĩa.
  robots: { index: false, follow: false },
};

/**
 * Bài đầu của mỗi chặng trong danh sách phẳng 48 bài — cộng dồn số bài của
 * các chặng trước, KHÔNG viết cứng tám con số. Thêm một bài vào M2 là liên
 * kết của M3…M8 tự dịch theo; chép tám con số ra đây là tám con số sẽ lệch.
 */
function lessonHref(index: number): string {
  let n = 1;
  for (let i = 0; i < index; i += 1) n += SKY_CONSTELLATIONS[i].stars.length;
  return `/lesson/python_advanced/${n}`;
}

export default function StarMapPreviewPage() {
  return (
    <>
      {/* `sky-theme.css` SINH RA bởi `build_sky.py`: nó khai đúng một biến,
          `--sky-base` = màu nền trời của hồ sơ, cho nền của khung bản đồ.
          Nền ấy từng là `var(--ds-page)` — một màu trắng xanh ở bản sáng —
          nên bầu trời gần đen lộ nền sáng xuyên qua và "mờ đi" đọc ra thành
          "xám đi". Màu không chép tay vào `*.module.css` được: lint cấm hex ở
          đó, và cấm đúng chỗ. */}
      <PageStyles hrefs={['/static/css/edu-theme.css', '/map/star/sky-theme.css']} />
      <SiteHeader />
      <main className={styles.wrap}>
        <h1>{STAR_COPY.title}</h1>
        <p className={styles.lead}>{STAR_COPY.lead}</p>
        <p className={styles.hint}>{STAR_COPY.hint}</p>

        <div className={styles.frame}>
          {/* Ô bấm — NHÃN trước, BAO LỒI sau (luật 4 ở đầu tệp). Ô nhãn không
              nhận Tab và không nói gì thêm cho trình đọc màn hình: nó là lối
              vào thứ hai của cùng một chặng, không phải một liên kết khác. */}
          {SKY_CONSTELLATIONS.map((c, i) => (
            <a
              aria-hidden="true"
              className={`${styles.hit} ${styles[`hit${c.key}`]} ${styles[`hit${c.key}b`]}`}
              href={lessonHref(i)}
              key={`${c.key}-nhan`}
              tabIndex={-1}
            />
          ))}
          {SKY_CONSTELLATIONS.map((c, i) => (
            <a
              className={`${styles.hit} ${styles[`hit${c.key}`]} ${styles[`hit${c.key}a`]}`}
              data-map-region={c.key}
              href={lessonHref(i)}
              key={`${c.key}-chom`}
            >
              {/* Nói ĐÚNG thứ nhãn nói, không hơn: mã chặng, tên phần, tên
                  khoá, số bài. KHÔNG tên chòm ("Kẹp") — nó đã bỏ khỏi nhãn
                  vì không trả lời "chặng nào, học gì", và một cái tên vô ích
                  đọc lên bằng giọng máy thì càng vô ích. */}
              <span className={styles.srOnly}>
                {`Chặng ${c.key} · ${c.subtitle} — ${SKY_COURSE.name}, ${c.stars.length} bài`}
              </span>
            </a>
          ))}

          {/* Bốn TẤM nền, theo đúng thứ tự `SKY_TILES`. `next/image` không
              dùng được ở đây, và không phải vì lười: bộ tối ưu ảnh của Next TỪ
              CHỐI xử lý SVG (nó là vector, nó đã nhỏ sẵn, và nó phải sắc ở mọi
              tỉ lệ), nên nó sẽ phải chạy `unoptimized` và thành một `<img>` có
              thêm một lớp bọc.

              Chỉ tấm ĐẦU mang `alt` mô tả: cả bốn tấm là MỘT bức, và bốn câu
              mô tả cho một bức là bốn lần đọc lại cùng một thứ. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={STAR_COPY.alt}
            className={`${styles.sky} ${styles.troi}`}
            height={SKY_FRAME.height}
            src={withAssetVersion('/map/star/sky-troi.svg')}
            width={SKY_FRAME.width}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            aria-hidden="true"
            className={`${styles.sky} ${styles.troi}`}
            height={SKY_FRAME.height}
            src={withAssetVersion('/map/star/sky-sao-nen.svg')}
            width={SKY_FRAME.width}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            aria-hidden="true"
            className={`${styles.sky} ${styles.troi}`}
            height={SKY_FRAME.height}
            src={withAssetVersion('/map/star/sky-mach.svg')}
            width={SKY_FRAME.width}
          />
          {/* Tấm CHÒM lúc nghỉ: tám chòm cùng một độ mờ. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            aria-hidden="true"
            className={`${styles.sky} ${styles.chomNghi}`}
            height={SKY_FRAME.height}
            src={withAssetVersion('/map/star/sky-chom-nghi.svg')}
            width={SKY_FRAME.width}
          />
          {/* Tám tấm CHÒM lúc trỏ vào: mỗi tấm vẽ ĐỦ tám chòm, một chòm rõ và
              bảy chòm mờ. Vẽ đủ tám để đúng MỘT tấm chòm hiện ở mỗi lúc —
              nếu mỗi tấm chỉ vẽ một chòm thì tấm nghỉ phải nằm dưới và hai
              bản của cùng một chòm cộng độ mờ với nhau. */}
          {SKY_CONSTELLATIONS.map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              aria-hidden="true"
              className={`${styles.sky} ${styles.chomRo} ${styles[`chom${c.key}`]}`}
              height={SKY_FRAME.height}
              key={c.key}
              src={withAssetVersion(`/map/star/sky-chom-${c.key}.svg`)}
              width={SKY_FRAME.width}
            />
          ))}
        </div>

        <h2 className={styles.legendTitle}>{STAR_COPY.legendTitle}</h2>
        <ul className={styles.legend}>
          {STAR_COPY.legend.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </main>
    </>
  );
}
