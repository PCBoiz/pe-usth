// BẢN ĐỒ SAO — route xem thử `/ban-do-sao`.
//
// Đặc tả: `design/v3/ban-do-sao.md`; hai tỉ lệ ở `design/v3/tuong-tac-ban-do.md`.
//
// ── TỆP NÀY GẦN NHƯ RỖNG BÂY GIỜ, VÀ ĐÓ LÀ CHỦ Ý (20/10/2026) ─────────
//
// Cả bản đồ — khung tranh, mười chín tấm, lớp con trỏ, cú phóng, cột bài —
// chuyển sang `components/star-map/StarMap.tsx`, vì TRANG CHỦ nay cũng dựng
// nó. Ở đây còn lại đúng phần thuộc về một TRANG: tiêu đề, câu dẫn, chú giải,
// và việc đọc `?chang=` từ URL.
//
// ── VÌ SAO ROUTE NÀY CÒN SỐNG SAU KHI BẢN ĐỒ LÊN TRANG CHỦ ───────────
//
// Nó thôi là một "bản xem thử của thứ chưa dựng xong" — bản đồ đã lên trang
// khoá học. Nó còn lại vì hai việc, và cả hai là việc thật:
//
//  1. ĐƯỜNG QUAY LẠI. Nếu bản đồ sao có vấn đề trên production thì trang chủ
//     quay về bản đồ vực bằng một dòng `import`, và lúc ấy đây vẫn là chỗ xem
//     bản mới mà không phải dựng lại gì.
//  2. CHỖ XEM BẢN ĐỒ MỘT MÌNH, không có hai cột khoá/công cụ và thẻ góp ý
//     quanh nó — tức chỗ `<main>` được nới tới 1 560 px (`.rong`), rộng hơn
//     1 280 px của trang chủ.
//
// Nó vẫn KHÔNG có lối vào từ thanh điều hướng, và vẫn `robots: noindex`. Lý do
// đổi nhưng kết luận không: một trang nói đúng cùng một thứ với trang chủ thì
// không cần một mục trên thanh trên, và không cần Google dẫn người lạ vào.
// Danh sách ngoại lệ và ca canh nó: `XEM_THU` trong `e2e/unit/site-nav.test.mjs`.
//
// BỐN ĐIỀU GIỮ Ở ĐÂY nay nằm ở đầu `StarMap.tsx` — không gọi API, tranh vào
// bằng `<img>`, không `style={{…}}`, một cái bọc cho cả biến đổi của cú phóng.
import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import StarMap from '@/components/star-map/StarMap';
import { zoomFor, STAR_COPY } from '@/lib/star-map';

import styles from '@/components/star-map/star-map.module.css';

export const metadata: Metadata = {
  title: 'Bản đồ sao — tám chòm · Programming EDU',
  // KHÔNG cho máy tìm kiếm lập chỉ mục. Trang này cố ý không có lối vào từ
  // thanh điều hướng — xem `XEM_THU` trong `e2e/unit/site-nav.test.mjs`. Miễn
  // lối vào mà vẫn để Google dẫn người lạ vào đây thì ngoại lệ ấy vô nghĩa.
  robots: { index: false, follow: false },
};

/** Đường dẫn của CHÍNH trang này: gốc của `?chang=` và của cả ba đường ra. */
const DUONG = '/ban-do-sao';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function StarMapPreviewPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tham = sp.chang;
  // `zoomFor()` trả `null` cho mọi thứ không phải một khoá chặng. Tham số đến
  // từ URL, tức từ người lạ: `?chang=` rác phải cho ra bản đồ ở TỈ LỆ XA, chứ
  // không một trang 500 và không một chuỗi nào được ghép vào `className`.
  const chang = zoomFor(Array.isArray(tham) ? tham[0] : tham)?.key ?? null;

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

        <StarMap base={DUONG} chang={chang} />

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
