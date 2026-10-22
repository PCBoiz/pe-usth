// `/dashboard` — bản dashboard dựng theo Figma node 60:5137 (19/10/2026):
// ĐÂY TỪNG LÀ TRANG CHỦ `/`. Ngày 22/10/2026 trang chủ đổi thành cảnh "Góc
// học" (căn phòng lofi, src/components/goc-hoc/) theo quyết định sản phẩm, và
// trang này DỌN SANG ĐÂY chứ không xoá: nhóm còn muốn đối chiếu hai bản cạnh
// nhau. Mọi chú thích dưới đây nói "trang chủ" là nói về bản này lúc nó còn
// ở `/`.
// hero → "Học như thế nào?" → bản đồ 8 chặng / bài của chặng / bài đang chọn
// → Bàn thí nghiệm → Góp ý.
//
// ĐỔI QUYẾT ĐỊNH SẢN PHẨM (19/10/2026). Trang chủ cũ (bản đồ thế giới + thẻ
// khoá, `design/project/Main.dc.html`) chốt bốn điều mà trang này bỏ, theo
// thiết kế mới:
//  1. Trang chủ từng KHÔNG gọi API nào. Nay nó đọc tiến độ — nhưng CHỈ khi máy
//     đã có phiên, qua `loadCompletedLessons` + `apiFetchSessionOnly`
//     (DashboardMap.tsx). Khách vãng lai và bot: 0 lời gọi mạng, và không bao
//     giờ tạo tài khoản khách — luật đó vẫn giữ nguyên (home-page.test.mjs).
//  2. Trang chủ từng không hiện XP / "đã xong N bài". Nay có, vì số đó là THẬT:
//     XP và phút từ gói bài (LESSON_META), bài đã xong từ server.
//  3. Hero từng chỉ có nhãn + tiêu đề. Nay có một câu dẫn và khối "Học như thế
//     nào?" như Figma.
//  4. Chân trang (footerLine) bỏ — Figma không có.
// Những luật KHÔNG đổi (không chuỗi ngày, không ổ khoá, không "Boss", một việc
// một từ, cỡ chữ ≥ 15px, tương phản AA) vẫn canh trang này trong
// home-page.test.mjs.
//
// Phần trên và dưới tĩnh (server). Phần giữa (DashboardMap) là client: chọn
// chặng/bài và đọc tiến độ. Mọi tên và con số lấy từ giáo trình thật — xem
// src/lib/dashboard-plan.ts.
import type { Metadata } from 'next';
import Link from 'next/link';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { COURSES, TOOLS } from '@/lib/catalog';
import CURRICULA_JSON from '@/lib/curricula.json';
import { buildStages, REGION_NAMES, type LessonMetaRow, type ModuleRow } from '@/lib/dashboard-plan';
import { feedbackFormHref } from '@/lib/feedback-link';
import { courseEyebrow, courseShape, FEEDBACK, LAB_TILE } from '@/lib/home-copy';

import DashboardMap from '../DashboardMap';
import styles from '../home.module.css';

// edu-fonts.css và studio-tokens.css KHÔNG khai ở đây: PageStyles tự thêm vào
// mọi trang (ds-fonts test "NỐI DÂY: PageStyles tự thêm edu-fonts.css").
const PAGE_CSS = ['/static/css/edu-theme.css'];

const COURSE_ID = 'python_advanced';

export const metadata: Metadata = {
  title: 'Programming EDU — Bảng điều khiển (bản Figma)',
};

const STEPS = [
  { title: 'Đọc bài ngắn', text: 'Mỗi bài giải thích một ý nhỏ, dễ hiểu.' },
  { title: 'Chạy code ngay', text: 'Gõ và chạy Python trong trình duyệt.' },
  { title: 'Ôn tập', text: 'Làm lại để nhớ lâu hơn.' },
] as const;

export default function HomePage() {
  const course = COURSES.find((c) => c.id === COURSE_ID);
  const curricula = CURRICULA_JSON as unknown as {
    CURRICULA: Record<string, { modules?: ModuleRow[] }>;
    LESSON_META?: Record<string, LessonMetaRow[]>;
  };
  const modules = curricula.CURRICULA[COURSE_ID]?.modules ?? [];
  const stages = buildStages(modules, curricula.LESSON_META?.[COURSE_ID], REGION_NAMES);
  const lessonUrl = course?.lessonUrl ?? `/lesson/${COURSE_ID}`;
  const first = stages[0]?.lessons[0];
  const lab = TOOLS.find((t) => t.id === 'ide');
  const feedback = feedbackFormHref();

  return (
    <>
      <PageStyles hrefs={PAGE_CSS} />
      <div className={styles.page}>
        <SiteHeader wide />

        <main className={styles.main}>
          <section className={styles.hero}>
            <div className={styles.heroText}>
              <p className={styles.eyebrow}>{courseEyebrow('Python nâng cao', courseShape(modules))}</p>
              <h1 className={styles.heroTitle}>Học Python từng bước, ngay trên trình duyệt</h1>
              <p className={styles.heroDesc}>
                Không cần cài đặt gì cả. Mở bài, đọc, gõ code và bấm chạy để thấy kết quả liền.
              </p>
              <Link href={`${lessonUrl}?lesson=0`} className={styles.primaryBtn}>
                Bắt đầu bài đầu tiên →
              </Link>
            </div>
            {first && (
              <Link href={`${lessonUrl}?lesson=0`} className={styles.previewCard}>
                <span className={styles.previewEyebrow}>Bài đầu tiên</span>
                <span className={styles.previewTitle}>
                  {first.code} · {first.title}
                </span>
                <code className={styles.previewCode}>print(&quot;Xin chào, Python!&quot;)</code>
              </Link>
            )}
          </section>

          <section className={styles.howCard}>
            <h2 className={styles.howTitle}>Học như thế nào?</h2>
            <ol className={styles.howGrid}>
              {STEPS.map((s, i) => (
                <li key={s.title} className={styles.howItem}>
                  <span className={styles.howBadge}>{i + 1}</span>
                  <span>
                    <strong>{s.title}</strong>
                    <small>{s.text}</small>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {stages.length > 0 && <DashboardMap stages={stages} lessonUrl={lessonUrl} />}

          {lab && (
            <section className={styles.labCard}>
              <div>
                <p className={styles.eyebrow}>Công cụ</p>
                <h2 className={styles.labTitle}>{lab.label}</h2>
                <p className={styles.labText}>{LAB_TILE.description}</p>
              </div>
              <Link href={lab.href} className={styles.primaryBtn}>
                Mở bàn thí nghiệm
              </Link>
            </section>
          )}

          {/* Không có địa chỉ khảo sát thì không hiện thẻ. */}
          {feedback && (
            <section className={styles.feedbackCard}>
              <div>
                <h2 className={styles.feedbackTitle}>{FEEDBACK.title}</h2>
                <p className={styles.feedbackText}>{FEEDBACK.text}</p>
              </div>
              <a href={feedback} target="_blank" rel="noreferrer" className={styles.outlineBtn}>
                {FEEDBACK.cta}
              </a>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
