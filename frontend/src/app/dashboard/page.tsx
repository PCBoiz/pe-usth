import Link from 'next/link';
import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import styles from './dashboard.module.css';

const STUDIO_CSS = [
  '/static/css/edu-fonts.css',
  '/static/css/edu-theme.css',
  '/static/css/studio-tokens.css',
];

export default function DashboardPage() {
  const trackRow1 = [
    { n: 1, title: 'Xưởng phác thảo', active: true, href: '/demo-minigame' },
    { n: 2, title: 'Khung cửi song song', active: false, href: '/courses/python_advanced' },
    { n: 3, title: 'Ô cửa quan sát', active: false, href: '/courses/python_advanced' },
    { n: 4, title: 'Thư viện', active: false, href: '/courses/python_advanced' },
  ];

  const trackRow2 = [
    { n: 8, title: 'Đại công trình', active: false, href: '/courses/python_advanced' },
    { n: 7, title: 'Hợp nhất', active: false, href: '/courses/python_advanced' },
    { n: 6, title: 'Bản đồ cái', active: false, href: '/courses/python_advanced' },
    { n: 5, title: 'Cỗ máy ma trận', active: false, href: '/courses/python_advanced' },
  ];

  return (
    <>
      <PageStyles hrefs={STUDIO_CSS} />
      <div className={styles.container}>
        {/* Thanh header chuẩn hệ thống */}
        <SiteHeader wide />

        {/* ── MAIN DASHBOARD ── */}
        <main className={styles.main}>
          {/* HERO GRID */}
          <section className={styles.heroGrid}>
            <div>
              <div className={styles.eyebrow}>PYTHON NÂNG CAO · 8 CHẶNG · 48 BÀI</div>
              <h1 className={styles.heroTitle}>Học Python từng bước, ngay trên trình duyệt</h1>
              <p className={styles.heroDesc}>
                Không cần cài đặt gì cả. Mở bài, đọc, gõ code và bấm chạy để thấy kết quả liền.
              </p>
              <Link href="/demo-minigame" className={styles.ctaBtn}>
                Bắt đầu bài đầu tiên &rarr;
              </Link>
            </div>

            <div className={styles.previewCard}>
              <div className={styles.previewBadge}>Bài đầu tiên</div>
              <h3 className={styles.previewTitle}>P01 · Program, process và tài nguyên</h3>
              <div className={styles.previewCodeSnippet}>
                <code>print(&quot;xin chào, python!&quot;)</code>
              </div>
            </div>
          </section>

          {/* 3 LEARNING STEPS */}
          <section className={styles.stepsContainer}>
            <h2 className={styles.stepsTitle}>Học như thế nào?</h2>
            <div className={styles.stepsGrid}>
              <div className={styles.stepItem}>
                <div className={styles.stepBadge}>1</div>
                <div>
                  <div className={styles.stepHeading}>Đọc bài ngắn</div>
                  <div className={styles.stepText}>Mỗi bài giải thích một ý nhỏ, dễ hiểu.</div>
                </div>
              </div>

              <div className={styles.stepItem}>
                <div className={styles.stepBadge}>2</div>
                <div>
                  <div className={styles.stepHeading}>Chạy code ngay</div>
                  <div className={styles.stepText}>Có sẵn máy Python trong trình duyệt.</div>
                </div>
              </div>

              <div className={styles.stepItem}>
                <div className={styles.stepBadge}>3</div>
                <div>
                  <div className={styles.stepHeading}>Ôn tập</div>
                  <div className={styles.stepText}>Làm sơ đồ nhớ lâu hơn.</div>
                </div>
              </div>
            </div>
          </section>

          {/* ROADMAP 8 CHẶNG */}
          <section className={styles.roadmapSection}>
            <h2 className={styles.roadmapTitle}>Lộ trình 8 chặng</h2>
            <p className={styles.roadmapDesc}>
              Đi lần lượt từ chặng 1 đến chặng 8. Mỗi chặng mở ra một kỹ năng mới.
            </p>

            <div className={styles.roadmapCard}>
              {/* Row 1: 1 -> 4 */}
              <div className={styles.trackRow}>
                {trackRow1.map((item) => (
                  <Link key={item.n} href={item.href} className={styles.trackNode}>
                    <div className={`${styles.nodeCircle} ${item.active ? styles.nodeCircleActive : ''}`}>
                      {item.n}
                    </div>
                    <div className={styles.nodeLabel}>{item.title}</div>
                  </Link>
                ))}
              </div>

              {/* Row 2: 8 <- 5 */}
              <div className={styles.trackRowReverse}>
                {trackRow2.map((item) => (
                  <Link key={item.n} href={item.href} className={styles.trackNode}>
                    <div className={styles.nodeCircle}>
                      {item.n}
                    </div>
                    <div className={styles.nodeLabel}>{item.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* LAB BANNER */}
          <section className={styles.bannerCard}>
            <div>
              <div className={styles.bannerLabel}>CÔNG CỤ</div>
              <h3 className={styles.bannerTitle}>Bàn thí nghiệm</h3>
              <p className={styles.bannerDesc}>
                Muốn thử một ý tưởng? Viết Python và chạy thử, không cần mở bài nào. Code chạy trên máy chủ, trong môi trường riêng.
              </p>
            </div>
            <Link href="/ide" className={styles.bannerBtn}>
              Mở bàn thí nghiệm
            </Link>
          </section>

          {/* FEEDBACK BANNER */}
          <section className={styles.bannerCard}>
            <div>
              <h3 className={styles.bannerTitle}>Góp ý cho nhóm làm khoá</h3>
              <p className={styles.bannerDesc}>Khảo sát ẩn danh, khoảng 2 phút.</p>
            </div>
            <a
              href="https://forms.gle"
              target="_blank"
              rel="noreferrer"
              className={styles.bannerBtn}
            >
              Mở khảo sát
            </a>
          </section>
        </main>
      </div>
    </>
  );
}
