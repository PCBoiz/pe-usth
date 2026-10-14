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
// Cũng không còn nạp course_detail.js/edu-chrome.js: hai file đó chỉ phục vụ nút
// Đăng ký, goLesson() và chuông thông báo của Sidebar/HeaderBar đã gỡ.

import { useEffect, useState } from 'react';

import PageStyles from '@/components/PageStyles';
import SiteHeader from '@/components/SiteHeader';
import { apiFetchSessionOnly, asList, findEnrollment } from '@/lib/api';
import { findCourse, LEVEL_LABEL } from '@/lib/catalog';
import {
  completedLessonSet,
  loadCompletedLessons,
  LS_ACCESS,
  LS_LEGACY_REFRESH,
  planResume,
  resumeButtonLabel,
  resumeReason,
  type ResumePlan,
} from '@/lib/course-progress';
import CURRICULA_JSON from '@/lib/curricula.json';

import styles from '@/components/CourseShell.module.css';
import { feedbackFormHref } from '@/lib/feedback-link';

type Curriculum = {
  requirements?: string[];
  skills?: string[];
  modules?: { title: string; lessons: string[] }[];
};
const CURRICULA = CURRICULA_JSON.CURRICULA as Record<string, Curriculum>;

/**
 * 15/10/2026 — GỠ HẲN khối "Đánh giá của học viên".
 *
 * Nó gồm hai thứ giả, và cả hai đều giả theo kiểu tệ nhất là người xem không
 * nhận ra:
 *  · 4,8 sao "đánh giá trung bình" — con số viết cứng trong `src/lib/catalog.ts`
 *    (`rating: 4.8`), không có một đánh giá nào ở sau nó. Trường đó cũng đã gỡ.
 *  · ô chấm sao của người xem (`StarRating`, `RATE_LABELS`) — bấm vào thì sao
 *    sáng lên rồi mất khi tải lại trang: điểm không gửi đi đâu, không lưu đâu,
 *    đúng như ghi chú "tính năng đang được phát triển" ngay dưới nó.
 * Buổi dùng thử với giảng viên và sinh viên: thấy một con số bịa là mất lòng
 * tin vào mọi con số khác trên trang (48 bài, tiến độ, "đã xong"). Có bảng đánh
 * giá thật trong DB thì dựng lại; tới lúc đó, không có khối này là trung thực.
 */

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // chế độ riêng tư
  }
}

/**
 * Nạp danh sách bài đã xong của người đang xem — hoặc KHÔNG nạp gì cả.
 *
 * Trả `null` nghĩa là "chưa biết" (chưa có phiên, hoặc API chưa trả về / lỗi):
 * trang phải hiện y như trang tĩnh hiện nay. Chỉ khi trả về một mảng thì mới
 * đổi nhãn nút và đánh dấu bài đã xong — tức thông tin tiến độ chỉ CỘNG THÊM,
 * không bao giờ làm trang tệ hơn bản tĩnh.
 *
 * HAI ĐIỀU TUYỆT ĐỐI KHÔNG ĐƯỢC PHÁ ở đây:
 *
 *  1. Chưa có phiên trong máy thì KHÔNG gọi API — thoát trước cả lời gọi đầu
 *     tiên. Nếu gọi, `/api/enrolled` trả 401 cho khách, và nếu lại dùng
 *     `apiFetch` thì nó rơi xuống `ensureGuest()`: mọi khách vãng lai và mọi
 *     con bot mở trang khoá (trang CÔNG KHAI, có trong sitemap) đều sinh một
 *     tài khoản khách trong bảng `users` và ăn một suất của
 *     THROTTLE_GUEST_LIMIT (mặc định 120 lượt/giờ/IP) — cả phòng máy chung một
 *     NAT sẽ bị 429 đúng lúc có người cần tài khoản thật.
 *  2. Dùng `apiFetchSessionOnly`, không dùng `apiFetch`: ngay cả khi cờ phiên
 *     nói sai (token cũ đã bị thu hồi), đường này cùng lắm là trả 401 chứ
 *     không tạo tài khoản mới.
 */
function useCompletedLessons(courseId: string): number[] | null {
  const [completed, setCompleted] = useState<number[] | null>(null);

  useEffect(() => {
    // Lượt render đầu trên server không có localStorage/document.cookie.
    if (typeof window === 'undefined') return;

    let alive = true;
    void loadCompletedLessons({
      session: {
        access: lsGet(LS_ACCESS),
        legacyRefresh: lsGet(LS_LEGACY_REFRESH),
        cookie: typeof document === 'undefined' ? null : document.cookie,
      },
      // Hàm này CHỈ chạy khi cổng ở loadCompletedLessons xác nhận đã có phiên;
      // khách vãng lai/bot không đi tới đây, nên không một lời gọi mạng nào.
      fetchCompleted: async () => {
        const res = await apiFetchSessionOnly('/api/enrolled');
        if (!res.ok) return null; // 401 (phiên đã chết) / 5xx: coi như chưa biết
        const data = (await res.json()) as unknown;
        const row = findEnrollment(asList(data, 'enrolled'), courseId);
        const raw = row?.completedLessonNumbers;
        // Chưa ghi danh khoá này thì không có hàng nào -> vẫn là "chưa biết".
        if (!Array.isArray(raw)) return null;
        return raw.filter((n): n is number => typeof n === 'number');
      },
    }).then((list) => {
      if (alive && list) setCompleted(list);
    });

    return () => {
      alive = false;
    };
  }, [courseId]);

  return completed;
}

/**
 * Thẻ gợi ý bước tiếp (bản thiết kế Main.dc.html): nhãn · tiêu đề · "Vì sao bài
 * này" · nút chính, rồi "Đây là gợi ý, không phải lệnh" + lối ra "Tự chọn bài".
 *
 * Vì sao phải có lối ra, không chỉ có nút chính: hệ thống chỉ ĐỀ XUẤT, mọi bài
 * trong danh sách 48 bài vẫn bấm vào được. Thẻ gợi ý mà không nói điều đó thì
 * người học tưởng mình bị dẫn theo một đường duy nhất và bỏ hẳn ý định tự chọn.
 */
function ResumeCard({
  plan,
  title,
  href,
  pickHref,
}: {
  plan: ResumePlan;
  title: string;
  href: string;
  pickHref: string;
}) {
  return (
    <section className={styles.resumeCard} aria-labelledby="cd-resume-title">
      <p className={styles.resumeKicker}>
        {plan.kind === 'done' ? 'Đã xong cả khoá · mời xem lại' : 'Gợi ý bước tiếp · hệ thống chọn'}
      </p>
      <h2 className={styles.resumeTitle} id="cd-resume-title">
        {`Bài ${plan.lessonNo}`}
        {title ? ` · ${title}` : ''}
      </h2>
      <p className={styles.resumeWhy}>
        <strong>Vì sao bài này: </strong>
        {resumeReason(plan)}
      </p>
      <a className={`edu-cd-btn primary ${styles.resumeBtn}`} href={href}>
        ▶ {resumeButtonLabel(plan)}
      </a>
      <div className={styles.resumeFoot}>
        <span>Đây là gợi ý, không phải lệnh.</span>
        <a className={styles.resumePick} href={pickHref}>
          Tự chọn bài
        </a>
      </div>
    </section>
  );
}

export default function CourseDetail({ courseId }: { courseId: string }) {
  const course = findCourse(courseId);
  /**
   * Accordion module mở/đóng, do React giữ để <button aria-expanded> luôn nói
   * đúng. Khoá theo chỉ số module; module đầu mở sẵn.
   */
  const [openModules, setOpenModules] = useState<Record<number, boolean>>({});
  // Phải gọi TRƯỚC nhánh `if (!course)` — hook không được nằm sau return.
  const completedRaw = useCompletedLessons(courseId);

  // Trang cha đã trả 404 cho mã lạ; nhánh này chỉ để thu hẹp kiểu.
  if (!course) return null;

  const curriculum = CURRICULA[courseId] || {};
  const modules = curriculum.modules || [];
  const outcomes = curriculum.skills || [];
  const requirements = curriculum.requirements || [];
  /**
   * Tổng số bài lấy từ chính danh sách đang render, không từ `course.lessons`:
   * hai nguồn này đã từng lệch (xem bẫy "hai nguồn danh sách bài" trong
   * AGENTS.md) và nếu lệch thì "đã xong 48/40" là con số vô nghĩa.
   */
  const flatTitles = modules.flatMap((m) => m.lessons);
  const total = flatTitles.length || course.lessons;
  const plan = planResume(completedRaw, total);
  const doneSet = completedLessonSet(completedRaw, total);
  // ?lesson= là chỉ số từ 0 (xem lesson/python_advanced/page.tsx); khóa khác bỏ qua tham số này.
  const startUrl = `${course.lessonUrl}?lesson=${plan.index}`;
  // Chưa có tiến độ (hoặc chưa biết) thì nhãn giữ NGUYÊN chữ cũ "Bắt đầu học".
  const ctaLabel = resumeButtonLabel(plan);
  // Neo tới danh sách 48 bài — đích của lối ra "Tự chọn bài".
  const curriculumAnchor = 'cd-curriculum';
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
                    <a className={`edu-cd-btn primary ${styles.lessonLink}`} href={startUrl}>▶ {ctaLabel}</a>
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
              <div className="cd-block" id={curriculumAnchor}>
                <div className="cd-block-hd">
                  <div className="cd-block-icon">📚</div>
                  <h3>Nội dung khóa học</h3>
                  <span className={styles.blockMeta}>
                    {modules.length} module · {total} bài học
                    {/* Chỉ thêm phần "đã xong" khi thật sự biết tiến độ; khách
                        vãng lai vẫn thấy đúng dòng chữ như trước. */}
                    {plan.completedCount > 0 && ` · đã xong ${plan.completedCount}/${total}`}
                  </span>
                </div>
                <div className="cd-block-body" style={{ paddingTop: 10 }}>
                  {modules.map((module, mi) => {
                    const open = openModules[mi] ?? mi === 0;
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
                              const lessonNo = index + 1;
                              const done = doneSet.has(lessonNo);
                              // Bài được gợi ý — chỉ ĐÁNH DẤU, không khoá bài nào.
                              const suggested = plan.kind === 'continue' && plan.lessonNo === lessonNo;
                              // <a href> chứ không <div onClick>: cú bấm này điều
                              // hướng, để trình duyệt lo Tab/Enter/chuột giữa.
                              return (
                                <a
                                  className={`edu-cd-lesson ${styles.lessonLink}`
                                    + `${done ? ` ${styles.lessonDone}` : ''}`
                                    + `${suggested ? ` ${styles.lessonNext}` : ''}`}
                                  key={index}
                                  data-clickable="1"
                                  data-done={done ? '1' : undefined}
                                  href={`${course.lessonUrl}?lesson=${index}`}
                                >
                                  {/* Ô số bài đổi thành dấu ✓ khi đã xong. Dấu
                                      này aria-hidden nên tình trạng phải được
                                      nói lại bằng CHỮ ở dòng meta dưới — người
                                      dùng trình đọc màn hình không "thấy" được
                                      màu hay dấu kiểm. */}
                                  <div className={`edu-cd-lesson-icon${done ? ` ${styles.lessonIconDone}` : ''}`} aria-hidden="true">
                                    {done ? '✓' : lessonNo}
                                  </div>
                                  <div className="edu-cd-lesson-body">
                                    <div className="edu-cd-lesson-title">{title}</div>
                                    <div className="edu-cd-lesson-meta">
                                      Bài {lessonNo}
                                      {done && ' · đã xong'}
                                      {suggested && ' · gợi ý học tiếp'}
                                    </div>
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

              {/* Khối "Đánh giá của học viên" đã gỡ — xem chú thích đầu file. */}
            </div>

            {/* ── Cột phải ── */}
            <div className="edu-cd-side">
              {/* Thẻ gợi ý chỉ dựng khi ĐÃ BIẾT tiến độ (kind !== 'start').
                  Khách vãng lai không có thẻ này — và cũng không có lời gọi API
                  nào để biết, xem useCompletedLessons. */}
              {plan.kind !== 'start' && (
                <ResumeCard
                  plan={plan}
                  title={flatTitles[plan.index] ?? ''}
                  href={startUrl}
                  pickHref={`#${curriculumAnchor}`}
                />
              )}

              <div className="edu-cd-card">
                <div className="edu-cd-price">Miễn phí</div>
                <div className="edu-cd-price-free">🎉 Hoàn toàn không mất phí</div>

                <a className={`edu-cd-btn primary ${styles.startBtn}`} href={startUrl}>▶ {ctaLabel}</a>

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
