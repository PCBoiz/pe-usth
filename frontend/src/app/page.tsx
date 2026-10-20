// Trang chủ — và nó LÀ trang khoá học. Dựng lại theo bản thiết kế
// `design/project/Main.dc.html` và `design-system-v2.md`.
//
// Bố cục: hero (nhãn · tiêu đề) → BẢN ĐỒ SAO → cột trái "Khoá đang mở" +
// "Công cụ" → cột phải thẻ gợi ý bước tiếp → thẻ góp ý.
//
// Bản đồ ở giữa ĐÃ ĐỔI ngày 20/10/2026: bản đồ sao (tám chòm, 48 ngôi) thay
// bản đồ vực (mặt cắt lục địa). Lý lẽ, con số tải về và đường quay lại nằm ở
// khối `<StarMap>` dưới đây; `WorldMap` không xoá, chỉ thôi được dựng ở đây.
//
// BỐN ĐIỀU BẢN THIẾT KẾ CHỐT, GIỮ Ở ĐÂY (đổi đi là đổi hành vi người dùng thấy):
//
//  1. KHÔNG GỌI API, nên cũng không có chỉ số nào. Trang này công khai: gọi
//     `apiFetch` mà gặp 401 thì nó rơi xuống `ensureGuest()` (src/lib/api.ts) —
//     mỗi con bot quét web sinh một tài khoản `@guest.local` và ăn một suất của
//     THROTTLE_GUEST_LIMIT (120 lượt/giờ/IP). Cần đọc phiên ở trang công khai
//     thì dùng `apiFetchSessionOnly`; ở ĐÂY thì không cần gì cả, vì danh mục là
//     tĩnh. Hệ quả cố ý: trang chủ không biết người xem học tới đâu, nên nó
//     KHÔNG hiện tiến độ — và cũng không bịa ra chỉ số nào để lấp chỗ trống.
//     Bản đồ sao không đổi điều này: 48 bài của nó là `SKY_TITLES`/`SKY_TESTS`,
//     đóng băng ở TS từ `scripts/pe-v4/out-advanced/lessons/*.json`.
//  2. KHÔNG CHUỖI NGÀY, không ngọn lửa, không "5/7 ngày". Chỉ số nào hiện ra
//     cũng phải là loại CHỈ TĂNG; chuỗi bị đứt là thứ đẩy người học bỏ cuộc.
//  3. KHÔNG KHOÁ GÌ: không ổ khoá, không "mở khi đủ N bài" — và không câu nào
//     nói ra điều đó nữa. Bản đồ tám chặng bấm được là bằng chứng đủ; một câu
//     dẫn đi kèm chỉ để trấn an là văn kể lể.
//  4. MỘT TIÊU ĐỀ KHÔNG KÉO THEO MỘT ĐOẠN MÔ TẢ. Thẻ bắt đầu chỉ có tên bài
//     + một nút; hero chỉ có nhãn + tiêu đề. Bản cũ có "hệ thống chọn", "Vì sao
//     bài này", "Đây là gợi ý, không phải lệnh" và một lối ra thứ hai — bỏ cả bốn.
//     Bản đồ sao cũng không mang một câu dẫn nào vào đây: tiêu đề và chú giải
//     của nó thuộc về route xem thử `/ban-do-sao`, không về trang này.
//
// Câu chữ và các quyết định nằm ở `src/lib/home-copy.ts` (có test:
// `e2e/unit/home-page.test.mjs`); file này chỉ dựng DOM.
import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import StarMap from '@/components/star-map/StarMap';
import { COURSES, LEVEL_LABEL, TOOLS } from '@/lib/catalog';
import CURRICULA_JSON from '@/lib/curricula.json';
import { feedbackFormHref } from '@/lib/feedback-link';
import {
  courseEyebrow,
  courseShape,
  courseTileTags,
  FEEDBACK,
  footerLine,
  INTRO,
  LAB_TILE,
  nextStep,
  SECTIONS,
  type ModuleLike,
} from '@/lib/home-copy';
import { zoomFor } from '@/lib/star-map';

import CatalogTile from './CatalogTile';
import styles from './home.module.css';

const CURRICULA = CURRICULA_JSON.CURRICULA as Record<string, { modules?: ModuleLike[] }>;

export const metadata: Metadata = {
  title: 'Programming EDU — Khoá học',
};

/** Đường dẫn của CHÍNH trang này: gốc của `?chang=` và của cả ba đường ra. */
const DUONG = '/';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function HomePage({ searchParams }: Props) {
  const feedback = feedbackFormHref();
  // CÚ PHÓNG CỦA BẢN ĐỒ SAO NẰM TRONG URL (`/?chang=M5`), không trong một
  // `useState`. Ba hệ quả, và cả ba đều là chỗ bản đồ web hay làm hỏng: nút
  // LÙI lùi ra khỏi chặng chứ không văng khỏi trang, đường dẫn gửi được, và
  // không-JS vẫn phóng được.
  //
  // GIÁ PHẢI TRẢ, nói thẳng vì nó là một đánh đổi thật: đọc `searchParams` ở
  // server làm route này thành ĐỘNG (`ƒ` trong `next build`) — trước 20/10/2026
  // nó là tĩnh (`○`), tức HTML dựng sẵn lúc build và phát từ CDN. Nay mỗi lượt
  // vào trang chủ là một lượt render ở server. Nó không đọc gì ngoài hai tệp
  // tĩnh (`catalog.ts`, `curricula.json`) và không gọi API nào, nên lượt render
  // ấy không có I/O; đổi lại, bản đồ sao nhẹ hơn bản đồ vực 114 KB (gzip) trên
  // máy tính và 315 KB trên điện thoại — xem chú thích ở khối bản đồ dưới.
  const tham = (await searchParams).chang;
  // `zoomFor()` trả `null` cho mọi thứ không phải một khoá chặng. Tham số đến
  // từ URL, tức từ người lạ: `?chang=` rác phải cho ra bản đồ ở TỈ LỆ XA, chứ
  // không một trang 500 và không một chuỗi nào được ghép vào `className`.
  const chang = zoomFor(Array.isArray(tham) ? tham[0] : tham)?.key ?? null;
  // Khoá dẫn đầu danh mục; 13/10/2026 danh mục chỉ còn Advanced Python.
  const headCourse = COURSES[0];
  const modules = headCourse ? CURRICULA[headCourse.id]?.modules ?? [] : [];
  const shape = courseShape(modules);
  const step = headCourse
    ? nextStep({
      courseId: headCourse.id,
      lessonUrl: headCourse.lessonUrl,
      firstLesson: modules[0]?.lessons[0],
    })
    : null;

  return (
    <>
      {/* `sky-theme.css` LÀ BẮT BUỘC từ lúc bản đồ sao lên đây, và nó hỏng
          IM LẶNG nếu quên: tệp ấy do `build_sky.py` sinh và nó khai `--sky-base`
          (nền khung), chín màu chặng, `--sky-ink`/`--sky-chip`/`--sky-dim`/
          `--sky-code` và `--sky-mo`. Một `background: var(--sky-base)` không
          có giá trị thì thuộc tính bị BỎ — nền rơi về trong suốt và bầu trời
          gần đen nằm trên nền trắng xanh của trang, đúng cái lỗi "hover thì nó
          XÁM đi chứ không MỜ đi" mà `.frame` sinh ra để chữa. Không có ngoại
          lệ hay cảnh báo nào ở giữa. */}
      <PageStyles hrefs={['/static/css/edu-theme.css', '/map/star/sky-theme.css']} />
      {/* .page cao tối thiểu bằng khung nhìn: style.css (đặt min-height cho body)
          không nạp ở trang này, body co theo nội dung thì nền gradient bị đứt
          một đường ngang ở đáy khối nội dung. */}
      <div className={styles.page}>
        <SiteHeader wide />
        <main className={styles.main}>
          <header className={styles.hero}>
            {headCourse && (
              <p className={styles.eyebrow}>{courseEyebrow(headCourse.label, shape)}</p>
            )}
            {/* Chỉ tiêu đề. Câu dẫn dưới nó đã bỏ — xem INTRO ở home-copy.ts. */}
            <h1 className={styles.title}>{INTRO.title}</h1>
          </header>

          {/* BẢN ĐỒ SAO — tám chòm, 48 ngôi = 48 bài. Nằm NGOÀI lưới hai cột:
              khung artboard rộng 1360 px, cột trái của trang này ~812px —
              tám tấm nhãn không vừa cột đó mà không đè lên nhau. Thành phần
              và mọi điều phải giữ: `components/star-map/StarMap.tsx`.

              ── NÓ THAY BẢN ĐỒ VỰC Ở ĐÂY NGÀY 20/10/2026 ─────────────────

              Chủ sản phẩm xem bản deploy và nói "đưa bản đồ sao lên khóa học
              luôn, vẫn là bản cũ này". `WorldMap` KHÔNG xoá — `WorldMap.tsx`,
              `world-map.ts`, `scripts/map/**`, `public/map/world-map.svg`,
              `map-motion.*` và mọi ca test của chúng còn nguyên tại chỗ, chỉ
              thôi được dựng ở đây. Lý do: nhiều ngày công, và nếu bản đồ sao
              có vấn đề trên production thì quay lại phải là sửa MỘT dòng
              `import` chứ không phải dựng lại một tính năng.

              ── TRANG CHỦ NHẸ ĐI, và con số đi theo chiều ngược với dự đoán ─

              Bản đồ vực vào trang bằng `background-image`, và nó tải hai bộ
              khác nhau theo bề rộng (quy tắc ngoài/trong `@container`):
                · máy tính: `world-map.svg` 850 525 B (229 047 gzip)
                · điện thoại: tám ô crop `scene-M*.svg` 1 624 396 B (438 341)
              Bản đồ sao vào bằng 19 thẻ `<img>`, cùng một bộ cho mọi thiết bị:
              460 776 B (115 349 gzip).
              ⇒ máy tính NHẸ đi 114 KB gzip, điện thoại NHẸ đi 315 KB gzip.
              Nên 19 tệp không cần nạp lười: cái bị thay còn nặng hơn.

              `?chang=` làm route này thành ĐỘNG — xem chú thích ở `searchParams`
              phía trên, chỗ nói ra giá của việc đó. */}
          <StarMap base={DUONG} chang={chang} />

          <div className={styles.cols}>
            <div className={styles.col}>
              <section aria-labelledby="programTitle">
                <h2 className={styles.pill} id="programTitle">
                  {SECTIONS.course}
                </h2>
                <ul className={styles.list}>
                  {COURSES.map((course) => (
                    <CatalogTile
                      key={course.id}
                      href={`/courses/${course.id}`}
                      label={course.label}
                      description={course.subtitle}
                      tags={courseTileTags(
                        course.id === headCourse?.id ? shape : courseShape(CURRICULA[course.id]?.modules),
                        LEVEL_LABEL[course.level],
                      )}
                      color={course.color}
                      accent={course.accent}
                      mark={course.mark}
                      icon={course.icon}
                    />
                  ))}
                </ul>
              </section>

              {/* Công cụ nằm NGOÀI cột khoá: không phải khoá, không ảnh hưởng
                  tiến độ/XP/ghi danh. Mặc định có đúng một mục (Bàn thí nghiệm);
                  tắt bằng NEXT_PUBLIC_IDE_ENABLED=off thì danh sách rỗng, và khi
                  rỗng phải bỏ luôn cả khối — không để một mục "Công cụ" trống
                  trơ trên trang. */}
              {TOOLS.length > 0 && (
                <section aria-labelledby="toolsTitle">
                  <div className={styles.colHead}>
                    <h2 className={styles.pill} id="toolsTitle">
                      {SECTIONS.tool}
                    </h2>
                  </div>
                  <ul className={styles.list}>
                    {TOOLS.map((tool) => (
                      <CatalogTile
                        key={tool.id}
                        href={tool.href}
                        label={tool.label}
                        description={LAB_TILE.description}
                        tags={[...LAB_TILE.tags]}
                        color={tool.color}
                        accent={tool.accent}
                        mark={tool.mark}
                        icon={tool.icon}
                        external
                      />
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className={styles.aside} aria-label="Việc tiếp theo">
              {step && (
                <section className={styles.next} aria-labelledby="nextTitle">
                  {/* Tên bài, rồi nút. Bản cũ có thêm bốn lớp chú giải
                      quanh đúng cái nút này — xem lý lẽ cắt bỏ ở đầu khối
                      `nextStep` trong `lib/home-copy.ts`. */}
                  <h2 className={styles.nextTitle} id="nextTitle">{step.title}</h2>
                  <a className={styles.nextCta} href={step.ctaHref}>
                    {step.ctaLabel}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
                  </a>
                </section>
              )}

            </aside>
          </div>

          {/* Lối góp ý cho buổi thử nghiệm với giảng viên và sinh viên USTH
              (14/10/2026). CHỈ đặt ở trang chủ — gắn ở cuối bài hay trong khung
              bài học thì chen ngang lúc người ta đang học.

              Ẩn hẳn khi chưa đặt NEXT_PUBLIC_FEEDBACK_URL hoặc giá trị không
              phải URL http/https: xem feedbackHref() để biết vì sao thà không
              có thẻ còn hơn có nút bấm vào không đi đâu. */}
          {feedback && (
            <section className={styles.feedback} aria-labelledby="feedbackTitle">
              <div className={styles.feedbackBody}>
                <h2 className={styles.feedbackTitle} id="feedbackTitle">
                  <span className={styles.feedbackIcon} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /><path d="M8 9h8M8 13h5" /></svg>
                  </span>
                  {FEEDBACK.title}
                </h2>
                <p className={styles.feedbackText}>{FEEDBACK.text}</p>
              </div>
              {/* Tab mới để người đang học không mất chỗ; rel="noopener
                  noreferrer" vì đây là tên miền ngoài (Google Forms). */}
              <a
                className={styles.feedbackButton}
                href={feedback}
                target="_blank"
                rel="noopener noreferrer"
              >
                {FEEDBACK.cta}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" /></svg>
              </a>
            </section>
          )}
        </main>
        {/* Câu chân trang ở `home-copy.ts` (có test), và NĂM lấy từ đồng hồ chứ
            không viết cứng "2026" như bản cũ. Trang này là trang tĩnh render ở
            server, nên `getFullYear()` chạy lúc DỰNG, không phải lúc người xem
            mở — tức năm đi theo mỗi lần deploy. Vẫn đúng hơn một con số chép
            tay, vốn chỉ đổi khi có ai nhớ ra mà sửa. */}
        <footer className={styles.footer}>
          {footerLine(new Date().getFullYear(), headCourse?.label)}
        </footer>
      </div>
    </>
  );
}
