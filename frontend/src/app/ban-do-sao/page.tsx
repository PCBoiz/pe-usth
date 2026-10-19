// BẢN ĐỒ SAO — route XEM THỬ: cả bầu trời, tám chòm, 48 ngôi = 48 bài.
//
// Đặc tả: `design/v3/ban-do-sao.md`. Mở rộng từ bản mẫu một chòm (M1) ngày
// 19/10/2026, khi chủ sản phẩm xem mẫu rồi hỏi "chòm này kết nối với các chòm
// khác như nào?" — câu đó chỉ trả lời được bằng cả bầu trời. Nó vẫn chưa thay
// bản đồ vực ở trang chủ.
//
// NAY CÓ HAI TỈ LỆ. `design/v3/tuong-tac-ban-do.md` khảo bảy bản đồ game và đo
// được ba thứ mà bản đồ này thiếu cả ba: **một động từ có hậu quả · hai tỉ lệ
// trở lên · cái gì bị giữ lại**. Bấm một chặng là PHÓNG VÀO chặng ấy
// (`?chang=M1`), và ở tỉ lệ gần mỗi ngôi mang tên bài thật cùng thứ tự học —
// hai thứ không có ở tỉ lệ xa. Xem khối "TỈ LỆ THỨ HAI" trong
// `star-map.module.css`.
//
// NGÀY 19/10/2026 chủ sản phẩm xem màn phóng gần của M5 và đặt bốn việc: bỏ
// chữ "ca" khỏi thẻ bài, nối bảng bài với bầu trời bằng một quầng sáng, nới
// khung trên màn rộng, và cho cú phóng ba nhịp thay vì một bước chuyển đơn.
// Cả bốn nằm ở tệp này, `SkyCursor.tsx` và `star-map.module.css`.
//
// BỐN ĐIỀU GIỮ Ở ĐÂY, đổi đi là đổi hành vi người dùng thấy:
//
//  1. KHÔNG GỌI API. Trang này công khai, mà `apiFetch` gặp 401 là TỰ TẠO tài
//     khoản khách (bẫy trong AGENTS.md) — mỗi con bot quét web sinh một tài
//     khoản `@guest.local` và ăn một suất của THROTTLE_GUEST_LIMIT. Ở đây
//     không cần gì cả: giáo trình là tĩnh (`SKY_TITLES`, `SKY_TESTS` sinh ra
//     từ `scripts/pe-v4/out-advanced/lessons/*.json` rồi đóng băng vào TS), và
//     bản đồ không hiện tiến độ.
//
//  2. TRANH VÀO BẰNG `<img>`, KHÔNG NỘI TUYẾN. Nhờ thế tài liệu SVG bị cách
//     ly và luật "đừng thêm `id`/`data-*` thừa vào SVG" TỰ THI HÀNH: không có
//     selector nào của trang với vào trong được, nên một `id` đặt trong đó chỉ
//     là byte chết tải ở mỗi lượt vào trang. Lớp hover là HTML chồng lên, bám
//     `[data-map-region]`.
//
//  3. KHÔNG `style={{…}}`. SSR tuần tự hoá style nội tuyến thành thuộc tính
//     `style="…"`, một trong hai nguyên nhân `style-src 'unsafe-inline'` chưa
//     bỏ được (AGENTS.md). Mọi vị trí nằm ở `star-map.module.css`, kể cả ba
//     biến của cú phóng (`.phongM<k>`, sinh bởi `build_sky.py --css`).
//
//  4. THỨ TỰ DOM LÀ MỘT HỢP ĐỒNG, không phải một cách sắp cho gọn. Bốn việc
//     cùng dựa vào nó:
//      · mọi `<a>` vùng bấm phải đứng TRƯỚC mọi `<img>`, vì trạng thái hover
//        đi qua bộ chọn anh em `~` (`.hitM1:hover ~ .chomM1`) — `~` chỉ nhìn
//        về phía SAU. Chúng vẫn nằm TRÊN tranh nhờ `z-index`, không nhờ thứ
//        tự;
//      · trong số các `<a>`, ô NHÃN đứng trước ô BAO LỒI, nên chỗ hai ô chồng
//        nhau thì bao lồi thắng: các ngôi sao là cái người ta định trỏ vào;
//      · `<SkyCursor />` đứng GIỮA — sau tám ô bấm (để `.hitM1:hover ~ .lop …`
//        với tới nó) và trước mười chín tấm (để `.lop[data-chang] ~ .chomM1`
//        với tới chúng). Nó là chỗ DUY NHẤT trong khung thoả cả hai chiều,
//        nên đừng dồn nó xuống cuối cho gọn mắt;
//      · trong số các `<img>`, thứ tự LÀ thứ tự z: ba tấm TRỜI, rồi tám tấm
//        NGHỈ, rồi tám tấm RÕ. Tấm rõ phải đứng sau tấm nghỉ của chính nó,
//        nếu không "rõ lên" bị tấm nghỉ vẽ phủ lại.
//        `e2e/unit/star-map.test.mjs` so lại cả ba nhóm.
//
// Câu chữ ở `src/lib/star-map.ts` (`STAR_COPY`) để `node --test` đọc được;
// file này chỉ dựng DOM.
import type { Metadata } from 'next';
import Link from 'next/link';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { withAssetVersion } from '@/lib/assetVersion';
import {
  stageLessons,
  zoomFor,
  SKY_CONSTELLATIONS,
  SKY_COURSE,
  SKY_FRAME,
  STAR_COPY,
} from '@/lib/star-map';

import SkyCursor from './SkyCursor';
import SkyExit from './SkyExit';
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
 * ĐƯỜNG VÀO TỈ LỆ GẦN, và nó là một `href` THẬT chứ không một `onClick`.
 *
 * Ba thứ đi kèm miễn phí nhờ thế, và cả ba đều là chỗ bản đồ web hay làm hỏng:
 * nút LÙI của trình duyệt lùi ra khỏi chặng (không văng khỏi trang), đường dẫn
 * gửi được, và không-JS vẫn phóng được.
 */
function zoomHref(key: string): string {
  return `/ban-do-sao?chang=${key}`;
}

/** Đường RA. Cùng một đích cho cả ba đường ra, nên nó ở một chỗ. */
const RA = '/ban-do-sao';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function StarMapPreviewPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tham = sp.chang;
  // `zoomFor()` trả `null` cho mọi thứ không phải một khoá chặng. Tham số đến
  // từ URL, tức từ người lạ: `?chang=` rác phải cho ra bản đồ ở TỈ LỆ XA, chứ
  // không một trang 500 và không một chuỗi nào được ghép vào `className`.
  const chang = zoomFor(Array.isArray(tham) ? tham[0] : tham)?.key ?? null;
  const chom = chang ? SKY_CONSTELLATIONS.find((c) => c.key === chang) : null;
  const bai = chang ? stageLessons(chang) : [];

  return (
    <>
      {/* `sky-theme.css` SINH RA bởi `build_sky.py`: nó khai màu nền trời của
          hồ sơ cho nền khung, chín màu của lớp con trỏ, và `--sky-mo` — hệ số
          mờ của bảy chòm không được trỏ vào. Nền ấy từng là `var(--ds-page)` —
          một màu trắng xanh ở bản sáng — nên bầu trời gần đen lộ nền sáng
          xuyên qua và "mờ đi" đọc ra thành "xám đi". Màu không chép tay vào
          `*.module.css` được: lint cấm hex ở đó, và cấm đúng chỗ. */}
      <PageStyles hrefs={['/static/css/edu-theme.css', '/map/star/sky-theme.css']} />
      <SiteHeader />
      {/* KHUNG NỚI RA Ở TỈ LỆ GẦN — `.rong` chỉ gắn khi đang phóng. Ở tỉ lệ
          xa bức tranh đã vừa khung 1 100 px, nên nới thêm chỉ làm tám ô bấm
          phải với xa hơn; ở tỉ lệ gần thì chỗ rộng là chỗ cho tên bài thật.
          `max-width` tự hạ xuống bề rộng màn nên điện thoại không đổi gì. */}
      <main className={`${styles.wrap} ${chang ? styles.rong : ''}`}>
        <h1>{STAR_COPY.title}</h1>
        <p className={styles.lead}>{STAR_COPY.lead}</p>
        <p className={styles.hint}>{STAR_COPY.hint}</p>

        <div
          className={`${styles.frame} ${chang ? styles[`phong${chang}`] : ''}`}
          data-phong={chang ?? undefined}
        >
          {/* Ô bấm — NHÃN trước, BAO LỒI sau (luật 4 ở đầu tệp). Ô nhãn không
              nhận Tab và không nói gì thêm cho trình đọc màn hình: nó là lối
              vào thứ hai của cùng một chặng, không phải một liên kết khác.

              `href` nay là `?chang=M<k>` — bấm một chặng là PHÓNG VÀO nó, không
              còn là đi thẳng tới bài đầu. Đổi này người dùng thấy ngay, và nó
              là cả điểm của bước 3: một bản đồ mà bấm vào là rời khỏi bản đồ
              thì không bao giờ có tỉ lệ thứ hai. Bài vẫn mở được, từ tỉ lệ gần
              — bấm một NGÔI, hoặc một dòng của bảng dưới khung. */}
          {SKY_CONSTELLATIONS.map((c) => (
            <Link
              aria-hidden="true"
              className={`${styles.hit} ${styles[`hit${c.key}`]} ${styles[`hit${c.key}b`]}`}
              href={zoomHref(c.key)}
              key={`${c.key}-nhan`}
              tabIndex={-1}
            />
          ))}
          {SKY_CONSTELLATIONS.map((c) => (
            <Link
              className={`${styles.hit} ${styles[`hit${c.key}`]} ${styles[`hit${c.key}a`]}`}
              data-map-region={c.key}
              href={zoomHref(c.key)}
              key={`${c.key}-chom`}
            >
              {/* Nói ĐÚNG thứ nhãn nói, không hơn: mã chặng, tên phần, tên
                  khoá, số bài — cộng ĐỘNG TỪ, vì nó vừa đổi. Người dùng trình
                  đọc màn hình không thấy bức tranh phóng vào, nên nếu nhãn chỉ
                  nói "Chặng M1" thì họ không có cách nào biết cú bấm này làm
                  gì. KHÔNG tên chòm ("Kẹp") — nó đã bỏ khỏi nhãn vì không trả
                  lời "chặng nào, học gì". */}
              <span className={styles.srOnly}>
                {`Phóng vào chặng ${c.key} · ${c.subtitle} — ${SKY_COURSE.name}, ${c.stars.length} bài`}
              </span>
            </Link>
          ))}

          {/* NỀN TRỐNG = đường ra thứ ba. Chỉ có mặt khi đang phóng, và nằm
              DƯỚI lớp con trỏ (z 2 so với z 3) nên bấm một ngôi vẫn mở bài;
              chỉ khoảng trời còn lại mới lùi ra. */}
          {chang ? (
            <Link aria-label={STAR_COPY.zoomBackdrop} className={styles.nenRa} href={RA} />
          ) : null}

          {/* LỚP CON TRỎ — sau tám ô bấm, trước mười chín tấm (luật 4 ở đầu
              tệp). Đây là bước 1 của `design/v3/tuong-tac-ban-do.md`: bản đồ
              phải cho biết TAY TÔI ĐANG Ở ĐÂU, ở độ phân giải 1/48 ngôi thay
              vì 1/16 hình chữ nhật. Nó là thành phần client duy nhất dựng DOM
              trong khung, và nó KHÔNG gọi API nào — xem luật 1. */}
          <SkyCursor />

          {/* BA tấm TRỜI, theo đúng thứ tự `SKY_TILES`. `next/image` không
              dùng được ở đây, và không phải vì lười: bộ tối ưu ảnh của Next TỪ
              CHỐI xử lý SVG (nó là vector, nó đã nhỏ sẵn, và nó phải sắc ở mọi
              tỉ lệ) — điều này còn đúng HƠN từ lúc có cú phóng, vì ở hệ số
              2,4–3,2 một bản raster sẽ nhoè.

              Chỉ tấm ĐẦU mang `alt` mô tả: cả bức là MỘT bức, và mười chín câu
              mô tả cho một bức là mười chín lần đọc lại cùng một thứ. */}
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
          {/* TÁM tấm NGHỈ — mỗi chòm MỘT tấm, chỉ vẽ chòm ấy.
              Trước đây là một tấm `sky-chom-nghi.svg` vẽ đủ tám chòm cộng tám
              tấm tiêu điểm cũng vẽ đủ tám chòm: chín tệp, 446 005 byte, tám
              phần chín là bản sao của cùng 48 ngôi. Mười sáu tấm riêng cân
              109 147 byte. Trạng thái MỜ không có tấm riêng — nó là tấm nghỉ
              hạ xuống `--sky-mo`. */}
          {SKY_CONSTELLATIONS.map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              aria-hidden="true"
              className={`${styles.sky} ${styles.chomNen} ${styles[`chom${c.key}`]}`}
              height={SKY_FRAME.height}
              key={c.key}
              src={withAssetVersion(`/map/star/sky-chom-${c.key}.svg`)}
              width={SKY_FRAME.width}
            />
          ))}
          {/* TÁM tấm RÕ, sau tám tấm nghỉ trong DOM nên chúng vẽ ĐÈ lên. Tấm
              nghỉ của chính chòm được trỏ bị tắt hẳn cùng lúc (xem CSS): hai
              bản của một chòm cùng hiện là hai độ mờ CỘNG nhau, và "rõ lên"
              đọc ra thành "đậm lên một cách khác". */}
          {SKY_CONSTELLATIONS.map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              aria-hidden="true"
              className={`${styles.sky} ${styles.chomRo} ${styles[`ro${c.key}`]}`}
              height={SKY_FRAME.height}
              key={`${c.key}-ro`}
              src={withAssetVersion(`/map/star/sky-chom-${c.key}-ro.svg`)}
              width={SKY_FRAME.width}
            />
          ))}

          {/* NÚT THOÁT + phím Esc. Một thành phần client vì Esc là một
              listener; nút thì là một `<Link>` thật, nên nó chạy cả khi JS
              chưa tải xong. */}
          {chang ? <SkyExit label={STAR_COPY.zoomExit} /> : null}
        </div>

        {/* BẢNG BÀI của chặng đang xem — "cái gì bị giữ lại", viết ra bằng
            chữ. Hai thứ ở đây không có ở tỉ lệ xa: THỨ TỰ HỌC (bản đồ cố ý
            không vẽ mũi tên lộ trình, nên ở tỉ lệ xa nó không đọc được ở đâu
            cả) và TÊN BÀI THẬT (48 cái tên tiếng Việt không vẽ lên một bầu
            trời 1360 × 820 được). Thứ ba từng là SỐ CA CHẤM; nó đã bỏ ngày
            19/10/2026 cùng với chữ "ca" ở chip — bán kính ngôi vẫn mang nghĩa
            ấy, và một con số in lại cạnh cái hình đang nói nó là trả hai lần
            cho một tin.

            Nó cũng là đường bàn phím và đường điện thoại của tỉ lệ gần: 48 dấu
            ngôi mang `tabIndex={-1}`, và tám ô bấm cả chặng thì đã tắt.

            `data-bang` và `data-bai` là HAI MÓC của liên kết hai chiều: trỏ
            (hoặc Tab) vào một dòng thì ngôi của bài ấy phát sáng, và ngược
            lại. Bộ máy ở `SkyCursor.tsx` — nó phải là JS vì bảng là anh em
            ĐỨNG SAU `.frame`, và bộ chọn `~` chỉ nhìn về phía sau. */}
        {chom ? (
          <>
            <h2 className={styles.bangTitle}>
              {STAR_COPY.zoomPanelTitle
                .replace('{key}', chom.key)
                .replace('{sub}', chom.subtitle)
                .replace('{n}', String(bai.length))}
            </h2>
            <p className={styles.bangNote}>{STAR_COPY.zoomNote.replace('{key}', chom.key)}</p>
            <ol className={styles.bang} data-bang="">
              {bai.map((b) => (
                <li key={b.code}>
                  <Link
                    className={styles.hang}
                    data-bai={b.code}
                    href={`/lesson/python_advanced/${b.lesson}`}
                  >
                    {/* Con số này in Ở CẢ HAI CHỖ — ở đây và trên chính ngôi
                        (`.thuTu` trong chip) — và cả hai lấy `order` từ cùng
                        một `stageLessons()`. Nó là chỗ nối dòng ↔ ngôi dùng
                        được trên điện thoại, nơi quầng sáng không bao giờ
                        bật. */}
                    <span className={styles.hangSo}>{b.order}</span>
                    <span className={styles.hangMa}>{b.code}</span>
                    <span className={styles.hangTen}>{b.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        ) : null}

        <h2 className={styles.legendTitle}>{STAR_COPY.legendTitle}</h2>
        {/* KHÔNG CÒN CÂU THANG BÁN KÍNH ("6 ca chấm ở ngôi nhỏ nhất … tới 14
            ca…"). Nó là chú giải của một con số không còn in ra ở đâu kể từ
            khi chip bỏ chữ "ca" ngày 19/10/2026, và một chú giải cho một thứ
            không hiện là một dòng chữ dẫn người đọc đi tìm. Bán kính vẫn mang
            số ca chấm; dòng thứ tư của `legend` dưới đây vẫn nói ra nguồn ấy,
            chỉ không hứa một con số nào. */}
        <ul className={styles.legend}>
          {STAR_COPY.legend.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </main>
    </>
  );
}
