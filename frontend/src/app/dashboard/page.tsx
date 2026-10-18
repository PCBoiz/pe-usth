// /dashboard — "Bản đồ" khoá Python Advanced, dựng lại theo Figma node 60:5137:
// hero → "Học như thế nào?" → bản đồ 8 chặng / bài của chặng / bài đang chọn
// → Bàn thí nghiệm → Góp ý.
//
// Phần trên và dưới tĩnh (server). Phần giữa (DashboardMap) là client: chọn
// chặng/bài và đọc tiến độ. Bản Figma vẽ bằng nội dung mẫu (tên bài, XP, bài
// BOSS ở chặng 1, "5 mục" trong P01) — ở đây mọi tên và con số lấy từ giáo
// trình thật, xem src/lib/dashboard-plan.ts.
import type { Metadata } from 'next';
import Link from 'next/link';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { COURSES, TOOLS } from '@/lib/catalog';
import CURRICULA_JSON from '@/lib/curricula.json';
import { buildStages, type LessonMetaRow, type ModuleRow } from '@/lib/dashboard-plan';
import { feedbackFormHref } from '@/lib/feedback-link';
import { FEEDBACK } from '@/lib/home-copy';
import { REGION_NAMES } from '@/lib/world-map';

import DashboardMap from './DashboardMap';
import styles from './dashboard.module.css';

const STUDIO_CSS = [
  '/static/css/edu-fonts.css',
  '/static/css/edu-theme.css',
  '/static/css/studio-tokens.css',
];

const COURSE_ID = 'python_advanced';

export const metadata: Metadata = {
  title: 'Programming EDU — Bản đồ',
};

const STEPS = [
  { title: 'Đọc bài ngắn', text: 'Mỗi bài giải thích một ý nhỏ, dễ hiểu.' },
  { title: 'Chạy code ngay', text: 'Gõ và chạy Python trong trình duyệt.' },
  { title: 'Ôn tập', text: 'Làm lại để nhớ lâu hơn.' },
] as const;

export default function DashboardPage() {
  const course = COURSES.find((c) => c.id === COURSE_ID);
  const curricula = CURRICULA_JSON as unknown as {
    CURRICULA: Record<string, { modules?: ModuleRow[] }>;
    LESSON_META?: Record<string, LessonMetaRow[]>;
  };
  const modules = curricula.CURRICULA[COURSE_ID]?.modules ?? [];
  const stages = buildStages(modules, curricula.LESSON_META?.[COURSE_ID], REGION_NAMES);
  const total = stages.reduce((n, s) => n + s.lessons.length, 0);
  const lessonUrl = course?.lessonUrl ?? `/lesson/${COURSE_ID}`;
  const first = stages[0]?.lessons[0];
  const lab = TOOLS.find((t) => t.id === 'ide');
  const feedback = feedbackFormHref();

  return (
    <>
      <PageStyles hrefs={STUDIO_CSS} />
      <div className={styles.page}>
        <SiteHeader wide />

        <main className={styles.main}>
          <section className={styles.hero}>
            <div className={styles.heroText}>
              <p className={styles.eyebrow}>
                Python nâng cao · {stages.length} chặng · {total} bài
              </p>
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
                <p className={styles.labText}>
                  Muốn thử một ý tưởng? Viết Python và chạy thử, không cần mở bài nào. Code chạy trên
                  máy chủ, trong môi trường riêng.
                </p>
              </div>
              <Link href={lab.href} className={styles.primaryBtn}>
                Mở bàn thí nghiệm
              </Link>
            </section>
          )}

          {/* Không có địa chỉ khảo sát thì không hiện thẻ — như trang chủ. */}
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
