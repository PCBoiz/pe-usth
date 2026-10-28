'use client';

// Chi tiết khóa học — giữ khung/class của bản cũ (edu-course-detail.css,
// course_detail.css) để màu sắc và bố cục không đổi, nhưng dữ liệu nay đến từ
// danh mục tĩnh (src/lib/catalog.ts) thay vì API.
//
// Đã bỏ cùng với trang đăng nhập: thẻ tiến độ, nút Đăng ký/Hủy đăng ký, quiz ôn
// tập (cần ≥ 5 bài đã hoàn thành) và bài demo dành cho quản trị. Cả bốn đều đọc
// /api/enrolled hoặc /api/user — route đòi JWT, khách không có để gửi — nên nếu
// giữ thì khách nào cũng thấy trạng thái "chưa đăng ký" sai sự thật.
//
// LỐI VÀO QUIZ ÔN TẬP PHẢI GIỮ NGUYÊN TRẠNG "KHÔNG CÓ", kể cả khi trang này có
// lại phiên đăng nhập. `QuizzesService.collectQuestions()` dựng kho câu hỏi từ
// `content_json.step_2.mcq` và đòi `MIN_POOL = 5`; khoá python_advanced nay là
// 172 bài ĐỌC (scripts/pe-da/SCHEMA.md) và KHÔNG bài nào phát ra `step_2.mcq`,
// nên kho câu hỏi của khoá đó mãi bằng 0. Dựng lại lối vào là treo một lời hứa
// không bao giờ tới: học viên đọc "hoàn thành thêm bài để mở quiz ôn tập" rồi
// học hết 172 bài mà nó vẫn không mở. Khoá nào có mcq trở lại thì mới mở, và
// phải mở theo SỐ CÂU thật của khoá đó, không mở cho mọi khoá.
//
// Cũng không còn nạp course_detail.js/edu-chrome.js: hai file đó chỉ phục vụ nút
// Đăng ký, goLesson() và chuông thông báo của Sidebar/HeaderBar đã gỡ.

import { useEffect, useState } from 'react';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { findCourse, LEVEL_LABEL } from '@/lib/catalog';
import { moduleChuaBai } from '@/lib/curriculum-nav';
import CURRICULA_JSON from '@/lib/curricula.json';

import styles from '@/components/CourseShell.module.css';
import { feedbackFormHref } from '@/lib/feedback-link';

type Curriculum = {
  requirements?: string[];
  skills?: string[];
  modules?: { title: string; lessons: string[] }[];
};
const CURRICULA = CURRICULA_JSON.CURRICULA as Record<string, Curriculum>;

const RATE_LABELS: Record<number, string> = {
  0.5: 'Quá tệ', 1: 'Rất tệ', 1.5: 'Tệ', 2: 'Không tốt',
  2.5: 'Tạm được', 3: 'Bình thường', 3.5: 'Khá ổn',
  4: 'Tốt', 4.5: 'Rất tốt', 5: 'Xuất sắc! 🎉',
};

/**
 * Ô chấm sao — do React giữ, không do course_detail.js (file legacy gắn sự kiện
 * một lần lúc nạp nên đổi khóa bằng client-side routing là các sao thành trơ).
 * Điểm chỉ nằm trong trang này, chưa lưu đi đâu (đúng ghi chú "đang phát triển").
 */
function StarRating() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;
  // Nửa trái ngôi sao = nửa điểm (giữ đúng hành vi cũ)
  const half = (e: React.MouseEvent<HTMLDivElement>, i: number) => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientX - r.left < r.width / 2 ? i - 0.5 : i;
  };
  return (
    <>
      <div className="star-interactive" id="starInteractive" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            className={`si-star${shown >= i ? ' star-full' : shown >= i - 0.5 ? ' star-half' : ''}`}
            data-star={i}
            key={i}
            onMouseMove={(e) => setHover(half(e, i))}
            onClick={(e) => setRating(half(e, i))}
          >★</div>
        ))}
      </div>
      <div className="user-rate-val" id="userRateVal">
        {rating ? `${rating} ★  ${RATE_LABELS[rating] || ''}` : '—'}
      </div>
    </>
  );
}

export default function CourseDetail({ courseId }: { courseId: string }) {
  const course = findCourse(courseId);
  /**
   * Accordion module mở/đóng, do React giữ để <button aria-expanded> luôn nói
   * đúng. Khoá theo chỉ số module; module đầu mở sẵn.
   */
  const [openModules, setOpenModules] = useState<Record<number, boolean>>({});
  /**
   * Module mở SẴN khi chưa ai bấm gì. Trước đây ghim cứng là module 0, và một
   * người thử ngày 27/10 nêu đúng cái giá của nó:
   *
   *   "khi mà t click vào dấu x để tắt hoặc về trang thì nó lại mở full list
   *    mục 1 và t lại phải tìm lại bài nếu t học mục 2,3"
   *
   * Tức nút đóng bài — đường ra duy nhất của màn bài học — luôn thả người học
   * xuống đầu khoá 172 bài. Nay bài học mang theo `?lesson=` khi đóng, và
   * effect dưới đây mở đúng module chứa bài đó.
   */
  const [moduleMacDinh, setModuleMacDinh] = useState(0);

  /** Bài cần cuộn tới, suy từ `?lesson=`. -1 = không có yêu cầu nào. */
  const [baiCanCuon, setBaiCanCuon] = useState(-1);

  /**
   * Đọc `?lesson=` sau khi đã hydrate, KHÔNG trong `useState(() => ...)`:
   * trang này là SSG, máy chủ dựng HTML với module 0 mở — khởi tạo state từ
   * `window` làm hai bên lệch nhau và React cảnh báo hydration mismatch. Và
   * KHÔNG dùng `useSearchParams()`: nó buộc trang rời khỏi dạng tĩnh.
   */
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('lesson');
    const idx = Number(raw);
    if (raw === null) return;
    const mi = moduleChuaBai(CURRICULA[courseId]?.modules ?? [], idx);
    if (mi < 0) return;
    // setState trong một timer, KHÔNG gọi thẳng trong thân effect: React 19
    // chặn chuyện đó (`react-hooks/set-state-in-effect` — "cascading renders"),
    // và đây là khuôn mà chỗ khác trong repo đã dùng cho cùng loại việc (cờ
    // cold-start ở StudioLesson). Nhịp trễ không thêm nháy nào: trang này là
    // SSG nên máy chủ KHÔNG biết `?lesson=`, một nhịp module 1 mở trước là
    // không tránh được dù viết cách nào.
    const t = setTimeout(() => {
      setModuleMacDinh(mi);
      setBaiCanCuon(idx);
    }, 0);
    return () => clearTimeout(t);
  }, [courseId]);

  /**
   * Cuộn tới bài — effect RIÊNG, phụ thuộc `moduleMacDinh`, không phải một
   * `requestAnimationFrame` nhét trong effect ở trên. Đã thử cách đó và đo
   * được `scrollY` vẫn bằng 0: lúc rAF chạy thì module chứa bài còn chưa mở,
   * nên `scrollIntoView` nhắm vào một phần tử chưa có chỗ trên trang và không
   * cuộn đi đâu cả. Tách ra thì effect này chỉ chạy SAU khi React đã áp
   * `moduleMacDinh` và dựng lại danh sách bài.
   *
   * Mở module thôi chưa đủ: module dài nhất của khoá này có 20 bài, nên bài
   * vừa học vẫn có thể nằm ngoài màn hình. `block: 'center'` chứ không
   * 'start' — 'start' nhét bài lên sát mép trên và mất ngữ cảnh module.
   */
  useEffect(() => {
    if (baiCanCuon < 0) return;
    const el = document.getElementById(`cd-lesson-${baiCanCuon}`);
    if (!el) return;
    // Hoãn một nhịp: App Router khôi phục vị trí cuộn sau khi hydrate, nên
    // cuộn ngay trong effect sẽ bị nó ghi đè về đầu trang.
    const t = setTimeout(
      () => el.scrollIntoView({ block: 'center', behavior: 'smooth' }),
      0,
    );
    return () => clearTimeout(t);
  }, [baiCanCuon, moduleMacDinh]);

  // Trang cha đã trả 404 cho mã lạ; nhánh này chỉ để thu hẹp kiểu.
  if (!course) return null;

  const curriculum = CURRICULA[courseId] || {};
  const modules = curriculum.modules || [];
  const outcomes = curriculum.skills || [];
  const requirements = curriculum.requirements || [];
  const ratingFill = Math.round((course.rating / 5) * 1000) / 10;
  // ?lesson= là chỉ số từ 0 (xem lesson/python/page.tsx); khóa khác bỏ qua tham số này.
  const startUrl = `${course.lessonUrl}?lesson=0`;
  // Nút góp ý đứng ngay cạnh "Bắt đầu học" vì đây là trang người thử quay lại
  // nhiều nhất; để tận trang chủ thì học xong phải lần ngược ra mới tìm thấy.
  // Không có link hợp lệ thì không dựng nút — xem feedbackHref().
  const feedback = feedbackFormHref();

  let flatIdx = 0;
  return (
    <>
      <PageStyles hrefs={[
        '/static/css/style.css',
        '/static/css/dashboard.css',
        '/static/css/pages.css',
        '/static/css/dark-mode.css',
        '/static/css/course_detail.css',
        '/static/css/edu-theme.css',
        '/static/css/edu-dashboard.css',
        '/static/css/edu-course-detail.css',
      ]} />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <div className={styles.shell}>
        <SiteHeader />

        <div className={styles.content}>
          {/* <a> thường: về trang chủ bằng tải lại trang, xem SiteHeader. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className={styles.back} href="/">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            <span>Tất cả khóa học</span>
          </a>

          <div className="edu-cd-grid">
            {/* ── Cột trái ── */}
            <div className="edu-cd-main">
              {/* Hero */}
              <div className="edu-cd-hero">
                <div className="edu-cd-hero-info">
                  {/* Dòng nhãn chỉ hiện khi khoá khai `tag`. Khoá không khai thì
                      bỏ CẢ dòng — trước đây ghép cứng `[tag, cấp độ].join(' · ')`
                      nên khoá thiếu thẻ sẽ in ra "undefined · Nâng cao", mà bỏ
                      riêng thẻ thì còn trơ " · Nâng cao" treo trên tiêu đề. */}
                  {course.tag && (
                    <span className="edu-cd-tag">{`${course.tag} · ${LEVEL_LABEL[course.level]}`}</span>
                  )}
                  <h1 className="edu-cd-title">{course.title}</h1>
                  <p className="edu-cd-subtitle">{course.subtitle}</p>
                  <div className="edu-cd-hero-cta">
                    <a className={`edu-cd-btn primary ${styles.lessonLink}`} href={startUrl}>▶ Bắt đầu học</a>
                    {feedback && (
                      <a
                        className={`edu-cd-btn ${styles.feedbackBtn}`}
                        href={feedback}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Khảo sát ẩn danh về khoá học, mở ở tab mới"
                      >
                        Góp ý cho chúng tôi
                      </a>
                    )}
                  </div>
                </div>
                <div className="edu-cd-hero-art">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={course.image} alt={course.title} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
              </div>

              {/* Nội dung khóa học (giáo trình) */}
              <div className="cd-block">
                <div className="cd-block-hd">
                  <div className="cd-block-icon">📚</div>
                  <h3>Nội dung khóa học</h3>
                  <span className={styles.blockMeta}>
                    {modules.length} module · {course.lessons} bài học
                  </span>
                </div>
                <div className="cd-block-body" style={{ paddingTop: 10 }}>
                  {modules.map((module, mi) => {
                    const open = openModules[mi] ?? mi === moduleMacDinh;
                    const bodyId = `cd-module-body-${mi}`;
                    return (
                      <div className="edu-cd-module" key={mi}>
                        {/* <button> chứ không <div onClick>: tiêu đề module là thứ
                            duy nhất mở được danh sách bài, để <div> thì bàn phím
                            không với tới (WCAG 2.1.1). */}
                        <button
                          type="button"
                          className={`edu-cd-module-hd ${styles.moduleHead} ${open ? 'open' : ''}`}
                          aria-expanded={open}
                          aria-controls={bodyId}
                          onClick={() => setOpenModules((s) => ({ ...s, [mi]: !open }))}
                        >
                          <div className="edu-cd-module-arrow" aria-hidden="true">▶</div>
                          <div className="edu-cd-module-name">{module.title}</div>
                          <div className="edu-cd-module-meta">{module.lessons.length} bài</div>
                        </button>
                        <div className={`edu-cd-module-body ${open ? 'open' : ''}`} id={bodyId}>
                          <div className="edu-cd-lesson-list">
                            {module.lessons.map((title) => {
                              const index = flatIdx++;
                              // <a href> chứ không <div onClick>: cú bấm này điều
                              // hướng, để trình duyệt lo Tab/Enter/chuột giữa.
                              return (
                                <a
                                  className={`edu-cd-lesson ${styles.lessonLink}`}
                                  key={index}
                                  id={`cd-lesson-${index}`}
                                  data-clickable="1"
                                  href={`${course.lessonUrl}?lesson=${index}`}
                                >
                                  <div className="edu-cd-lesson-icon" aria-hidden="true">{index + 1}</div>
                                  <div className="edu-cd-lesson-body">
                                    <div className="edu-cd-lesson-title">{title}</div>
                                    <div className="edu-cd-lesson-meta">Bài {index + 1}</div>
                                  </div>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tổng quan */}
              <div className="cd-block">
                <div className="cd-block-hd">
                  <div className="cd-block-icon">📋</div>
                  <h3>Tổng quan khóa học</h3>
                </div>
                <div className="cd-block-body">
                  <p className="cd-desc">{course.description}</p>
                </div>
              </div>

              {/* Yêu cầu */}
              {requirements.length > 0 && (
                <div className="cd-block">
                  <div className="cd-block-hd">
                    <div className="cd-block-icon">📌</div>
                    <h3>Yêu cầu</h3>
                  </div>
                  <div className="cd-block-body">
                    <ul className="cd-req-list">
                      {requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Đánh giá */}
              <div className="cd-block">
                <div className="cd-block-hd">
                  <div className="cd-block-icon">⭐</div>
                  <h3>Đánh giá của học viên</h3>
                </div>
                <div className="cd-block-body">
                  <div className="cd-reviews-stub">
                    <div className="star-avg-wrap">
                      <div className="star-avg">
                        <div className="star-avg-bg">★★★★★</div>
                        <div className="star-avg-fill" style={{ width: `${ratingFill}%` }}>★★★★★</div>
                      </div>
                    </div>
                    <div className="score">{course.rating}</div>
                    <div className="avg-label">Đánh giá trung bình</div>

                    <div className="user-rate-section">
                      <div className="user-rate-label">Đánh giá của bạn:</div>
                      <StarRating key={courseId} />
                    </div>

                    <div className="coming-soon-note">Tính năng lưu đánh giá đang được phát triển. Hãy quay lại sau!</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Cột phải ── */}
            <div className="edu-cd-side">
              <div className="edu-cd-card">
                <div className="edu-cd-price">Miễn phí</div>
                <div className="edu-cd-price-free">🎉 Hoàn toàn không mất phí</div>

                <a className={`edu-cd-btn primary ${styles.startBtn}`} href={startUrl}>▶ Bắt đầu học</a>

                <div className="edu-cd-includes">
                  <div className="edu-cd-includes-title">KHÓA HỌC BAO GỒM</div>
                  <div className="edu-cd-inc-item"><i className="fas fa-book-open"></i> {course.lessons} bài học</div>
                  <div className="edu-cd-inc-item"><i className="fas fa-clock"></i> {course.duration}</div>
                  <div className="edu-cd-inc-item"><i className="fas fa-infinity"></i> Truy cập vĩnh viễn</div>
                  <div className="edu-cd-inc-item"><i className="fas fa-certificate"></i> Chứng chỉ hoàn thành</div>
                  <div className="edu-cd-inc-item"><i className="fas fa-mobile-alt"></i> Học trên mọi thiết bị</div>
                </div>
              </div>

              {/* Bạn sẽ học được — ẩn hẳn khi khóa không có curriculum.skills. */}
              {outcomes.length > 0 && (
                <div className="edu-cd-card">
                  <div className="edu-cd-card-title">Bạn sẽ học được</div>
                  <div className="edu-cd-outcomes">
                    {outcomes.map((skill, i) => (
                      <div className="edu-cd-outcome" key={i}>
                        <div className="edu-cd-outcome-dot"></div>
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
