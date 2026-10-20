// BẢN ĐỒ SAO — cả bầu trời, tám chòm, 48 ngôi = 48 bài.
//
// Đặc tả: `design/v3/ban-do-sao.md`; hai tỉ lệ ở `design/v3/tuong-tac-ban-do.md`.
//
// ── VÌ SAO NÓ RỜI `app/ban-do-sao/` RA ĐÂY (20/10/2026) ───────────────
//
// Tới hôm nay nó là một route XEM THỬ, và trang chủ (tức trang khoá học) vẫn
// dựng bản đồ vực. Chủ sản phẩm xem bản đã deploy và nói "đưa bản đồ sao lên
// khóa học luôn, vẫn là bản cũ này" — nên bản đồ nay có HAI chỗ dựng, và một
// thành phần dựng ở hai chỗ thì không được sống trong thư mục của một route.
//
// `/ban-do-sao` GIỮ LẠI, cố ý: nếu bản đồ sao có vấn đề trên production thì
// quay lại bản đồ vực phải là sửa một dòng `import` ở `app/page.tsx`, và lúc
// ấy route xem thử vẫn là chỗ xem bản mới. Bản đồ vực (`WorldMap.tsx`,
// `world-map.ts`, `scripts/map/**`, `public/map/world-map.svg`) KHÔNG xoá —
// nó chỉ thôi được dựng ở trang chủ.
//
// ── CÁI GÌ Ở TRONG, CÁI GÌ Ở NGOÀI ───────────────────────────────────
//
// TRONG: khung tranh (`.frame`) và CỘT BÀI của chặng đang xem (`.cot`), cộng
// quan hệ bố cục giữa hai thứ ấy (ở ≥ 1 200 px chúng là hai cột của một lưới).
// Ba thứ đó dính vào nhau: cột bài là chỗ DUY NHẤT đọc được chín cái tên cùng
// lúc, nên nó không được phép rơi ra ngoài màn hình đúng lúc người ta vừa
// phóng vào.
//
// NGOÀI: tiêu đề, câu dẫn, chú giải — chúng là văn của TRANG. Trang chủ không
// cần một bài giới thiệu bản đồ; route xem thử thì cần.
//
// ── BỐN ĐIỀU GIỮ Ở ĐÂY, đổi đi là đổi hành vi người dùng thấy ─────────
//
//  1. KHÔNG GỌI API. Cả hai trang dựng nó đều CÔNG KHAI, mà `apiFetch` gặp
//     401 là TỰ TẠO tài khoản khách (bẫy trong AGENTS.md) — mỗi con bot quét
//     web sinh một tài khoản `@guest.local` và ăn một suất của
//     THROTTLE_GUEST_LIMIT (120 lượt/giờ/IP). Ở đây không cần gì cả: giáo
//     trình là tĩnh (`SKY_TITLES`, `SKY_TESTS` sinh từ
//     `scripts/pe-v4/out-advanced/lessons/*.json` rồi đóng băng vào TS), và
//     bản đồ không hiện tiến độ. Cần trạng thái phiên ở một trang công khai
//     thì đường đúng là `apiFetchSessionOnly`, không phải `apiFetch`.
//
//  2. TRANH VÀO BẰNG `<img>`, KHÔNG NỘI TUYẾN. Nhờ thế tài liệu SVG bị cách
//     ly và luật "đừng thêm `id`/`data-*` thừa vào SVG" TỰ THI HÀNH: không có
//     selector nào của trang với vào trong được, nên một `id` đặt trong đó chỉ
//     là byte chết tải ở mỗi lượt vào trang. Lớp hover là HTML chồng lên.
//
//  3. KHÔNG `style={{…}}`. SSR tuần tự hoá style nội tuyến thành thuộc tính
//     `style="…"`, một trong hai nguyên nhân `style-src 'unsafe-inline'` chưa
//     bỏ được (AGENTS.md). Mọi vị trí nằm ở `star-map.module.css`, kể cả ba
//     biến của cú phóng (`.phongM<k>`, sinh bởi `build_sky.py --css`).
//
//  4. MỘT PHẦN TỬ BỌC CHO CẢ BIẾN ĐỔI CỦA CÚ PHÓNG (`.canh`), và đây là bản
//     sửa cho lời chê "hơi lag" ngày 20/10/2026.
//
//     Bản trước đặt `transform` lên TỪNG tấm trong 19 tấm CỘNG lớp con trỏ —
//     20 phần tử cùng nội suy một `transform` giống nhau, tức 20 lớp hợp thành
//     dựng lên rồi hạ xuống trong 360 ms của mỗi cú phóng. Nó không làm thế vì
//     ai thích: trạng thái hover đi qua bộ chọn ANH EM (`.hitM1:hover ~
//     .chomM1`), nên ô bấm và tấm ảnh BUỘC phải là anh em ruột, và một `<div>`
//     bọc cắt mọi quan hệ ấy.
//
//     Nay trạng thái hover đi qua `:has()` trên chính `.frame`
//     (`.frame:has(.hitM1:hover) .roM1`), thứ không quan tâm hai bên là anh em
//     hay không. Nên cái bọc dựng được, và MỘT `transform` thay cho hai mươi.
//     Hệ quả thứ hai, rẻ như cho: thứ tự DOM thôi là một hợp đồng ba chiều —
//     chỉ còn thứ tự Z giữa 16 tấm chòm (tấm rõ phải đứng sau tấm nghỉ của
//     chính nó, nếu không "rõ lên" bị tấm nghỉ vẽ phủ lại).
//
// Câu chữ ở `src/lib/star-map.ts` (`STAR_COPY`) để `node --test` đọc được;
// file này chỉ dựng DOM.
import Link from 'next/link';

import { withAssetVersion } from '@/lib/assetVersion';
import {
  stageLessons,
  SKY_CONSTELLATIONS,
  SKY_COURSE,
  SKY_FRAME,
  STAR_COPY,
} from '@/lib/star-map';

import SkyCursor from './SkyCursor';
import SkyExit from './SkyExit';
import styles from './star-map.module.css';

export type StarMapProps = {
  /**
   * Khoá chặng đang phóng (`'M1'`…`'M8'`), hoặc `null` cho tỉ lệ xa.
   *
   * Người gọi PHẢI cho nó đi qua `zoomFor()` trước: giá trị này ghép vào
   * `styles[\`phong${chang}\`]` và vào `data-phong`, mà nguồn của nó là
   * `?chang=` — tức dữ liệu của người lạ.
   */
  chang: string | null;
  /**
   * Đường dẫn của TRANG đang dựng bản đồ (`'/'` hay `'/ban-do-sao'`).
   *
   * Cú phóng là một `href` THẬT (`${base}?chang=M5`), không một `onClick`, và
   * ba thứ đi kèm miễn phí nhờ thế — cả ba đều là chỗ bản đồ web hay làm
   * hỏng: nút LÙI của trình duyệt lùi ra khỏi chặng (không văng khỏi trang),
   * đường dẫn gửi được, và không-JS vẫn phóng được.
   *
   * Nó là một THAM SỐ chứ không một hằng, vì bản đồ nay dựng ở hai trang và
   * một hằng `'/ban-do-sao'` ở đây sẽ ném người đang ở trang chủ sang route
   * xem thử ngay cú bấm đầu tiên.
   */
  base: string;
};

export default function StarMap({ chang, base }: StarMapProps) {
  const chom = chang ? SKY_CONSTELLATIONS.find((c) => c.key === chang) : null;
  const bai = chang ? stageLessons(chang) : [];
  // Cùng một đích cho cả BA đường ra (Esc · nút Thoát · bấm khoảng trời
  // trống), nên nó được tính đúng một lần ở đây.
  const ra = base;
  const vao = (key: string) => `${base}?chang=${key}`;

  return (
    /* CÁI BỌC NGOÀI CÙNG — bố cục, không trang trí. Ở ≥ 1 200 px khi đang
       phóng nó thành lưới hai cột: tranh bên trái, cột bài bên phải. Dưới mức
       đó nó trong suốt về bố cục (một `<div>` khối), nên điện thoại giữ đúng
       dòng chảy một cột.

       Nó cũng là phần tử mà `SkyCursor` uỷ quyền lên (`khung.parentElement`)
       để nối hai chiều bảng bài ↔ bầu trời — xem chú thích ở đó. */
    <div className={`${styles.khung} ${chang ? styles.khungRong : ''}`}>
      <div
        className={`${styles.frame} ${chang ? styles[`phong${chang}`] : ''}`}
        data-phong={chang ?? undefined}
      >
        {/* Ô bấm — NHÃN trước, BAO LỒI sau, và chỗ hai ô chồng nhau thuộc về
            BAO LỒI: các ngôi sao là cái người ta định trỏ vào. Ô nhãn không
            nhận Tab và không nói gì thêm cho trình đọc màn hình: nó là lối vào
            thứ hai của cùng một chặng, không phải một liên kết khác.

            Thứ tự "ô bấm trước tranh" KHÔNG còn là hợp đồng của bộ chọn kể từ
            lúc hover đi qua `:has()` (xem điều 4 ở đầu tệp). Nó ở lại vì một
            lý do khác và nhỏ hơn: thứ tự Tab. Tám chặng phải tới TRƯỚC nút
            Thoát và trước cột bài. */}
        {SKY_CONSTELLATIONS.map((c) => (
          <Link
            aria-hidden="true"
            className={`${styles.hit} ${styles[`hit${c.key}`]} ${styles[`hit${c.key}b`]}`}
            href={vao(c.key)}
            key={`${c.key}-nhan`}
            tabIndex={-1}
          />
        ))}
        {SKY_CONSTELLATIONS.map((c) => (
          <Link
            className={`${styles.hit} ${styles[`hit${c.key}`]} ${styles[`hit${c.key}a`]}`}
            data-map-region={c.key}
            href={vao(c.key)}
            key={`${c.key}-chom`}
          >
            {/* Nói ĐÚNG thứ nhãn nói, không hơn: mã chặng, tên phần, tên
                khoá, số bài — cộng ĐỘNG TỪ. Người dùng trình đọc màn hình
                không thấy bức tranh phóng vào, nên nếu nhãn chỉ nói "Chặng
                M1" thì họ không có cách nào biết cú bấm này làm gì. KHÔNG tên
                chòm ("Kẹp") — nó không trả lời "chặng nào, học gì". */}
            <span className={styles.srOnly}>
              {`Phóng vào chặng ${c.key} · ${c.subtitle} — ${SKY_COURSE.name}, ${c.stars.length} bài`}
            </span>
          </Link>
        ))}

        {/* NỀN TRỐNG = đường ra thứ ba. Chỉ có mặt khi đang phóng, và nằm
            DƯỚI cái bọc `.canh` (z 1 so với z 2) — nhưng `.canh` và cả cây
            con của nó `pointer-events: none` trừ 48 ngôi, nên bấm một ngôi
            vẫn mở bài và chỉ khoảng trời còn lại mới lùi ra.

            Thứ tự z đảo so với bản trước (nền trống từng là z 2, TRÊN tranh):
            `.canh` mang `transform` nên nó là một ngữ cảnh xếp lớp, tức mọi
            thứ bên trong vẽ cùng một mức — để nền trống lên trên `.canh` là
            để nó lên trên cả 48 ngôi, và lúc đó 48 ngôi thành vật trang trí. */}
        {chang ? (
          <Link aria-label={STAR_COPY.zoomBackdrop} className={styles.nenRa} href={ra} />
        ) : null}

        {/* ── CÁI BỌC CỦA CÚ PHÓNG ────────────────────────────────────────
            MỘT `transform` cho cả bức, thay cho hai mươi. Xem điều 4 ở đầu
            tệp để biết vì sao nó dựng được bây giờ mà trước thì không. */}
        <div className={styles.canh}>
          {/* BA tấm TRỜI, theo đúng thứ tự `SKY_TILES`. `next/image` không
              dùng được ở đây, và không phải vì lười: bộ tối ưu ảnh của Next TỪ
              CHỐI xử lý SVG (nó là vector, nó đã nhỏ sẵn, và nó phải sắc ở mọi
              tỉ lệ) — điều này còn đúng HƠN từ lúc có cú phóng, vì ở hệ số
              1,6–3,2 một bản raster sẽ nhoè.

              Chỉ tấm ĐẦU mang `alt` mô tả: cả bức là MỘT bức, và mười chín
              câu mô tả cho một bức là mười chín lần đọc lại cùng một thứ. */}
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
              149 021 byte. Trạng thái MỜ không có tấm riêng — nó là tấm nghỉ
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
          {/* TÁM tấm RÕ, sau tám tấm nghỉ trong DOM nên chúng vẽ ĐÈ lên. Đây
              là hợp đồng thứ tự DOM DUY NHẤT còn lại (xem điều 4): tấm rõ của
              chòm k phải đứng sau tấm nghỉ của chính nó. Tấm nghỉ ấy bị tắt
              hẳn cùng lúc (xem CSS): hai bản của một chòm cùng hiện là hai độ
              mờ CỘNG nhau, và "rõ lên" đọc ra thành "đậm lên một cách khác". */}
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

          {/* LỚP CON TRỎ — bước 1 của `design/v3/tuong-tac-ban-do.md`: bản đồ
              phải cho biết TAY TÔI ĐANG Ở ĐÂU, ở độ phân giải 1/48 ngôi thay
              vì 1/16 hình chữ nhật. Nó là thành phần client duy nhất dựng DOM
              trong khung, và nó KHÔNG gọi API nào — xem điều 1.

              Nó nằm TRONG `.canh` cùng mười chín tấm, và đó là bắt buộc: 48
              dấu ngôi đặt bằng % của lớp này, nên nếu tranh phóng mà lớp này
              không phóng thì mỗi dấu ngôi đứng cách ngôi thật mấy trăm pixel.
              Cùng một cái bọc là cách RẺ NHẤT giữ hai thứ dán vào nhau — bản
              trước giữ bằng cách chép cùng một `transform` vào cả hai. */}
          <SkyCursor />
        </div>

        {/* NÚT THOÁT + phím Esc. Một thành phần client vì Esc là một
            listener; nút thì là một `<Link>` thật, nên nó chạy cả khi JS chưa
            tải xong. */}
        {chang ? <SkyExit label={STAR_COPY.zoomExit} ra={ra} /> : null}
      </div>

      {/* CỘT BÀI của chặng đang xem — "cái gì bị giữ lại", viết ra bằng chữ.
          Hai thứ ở đây không có ở tỉ lệ xa: THỨ TỰ HỌC (bản đồ cố ý không vẽ
          mũi tên lộ trình, nên ở tỉ lệ xa nó không đọc được ở đâu cả) và TÊN
          BÀI THẬT (48 cái tên tiếng Việt không vẽ lên một bầu trời
          1360 × 820 được).

          Từ 20/10/2026 tên bài KHÔNG còn in trên chín thẻ neo vào chín ngôi
          (chúng chồng nhau, chữ cắt giữa chừng, một thẻ đè cả nút Thoát —
          chủ sản phẩm gửi ảnh chụp M6), nên danh sách này là chỗ DUY NHẤT còn
          đọc được 9 cái tên cùng lúc. Một chỗ như thế không được nằm ngoài
          màn hình đúng lúc người ta vừa phóng vào, nên ở ≥ 1 200 px nó là cột
          PHẢI của lưới `.khungRong`.

          Nó cũng là đường bàn phím và đường điện thoại của tỉ lệ gần: 48 dấu
          ngôi mang `tabIndex={-1}`, và tám ô bấm cả chặng thì đã tắt.

          `data-bang` và `data-bai` là HAI MÓC của liên kết hai chiều: trỏ
          (hoặc Tab) vào một dòng thì ngôi của bài ấy phát sáng, và ngược lại.
          Bộ máy ở `SkyCursor.tsx`. */}
      {chom ? (
        <div className={styles.cot}>
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
        </div>
      ) : null}
    </div>
  );
}
