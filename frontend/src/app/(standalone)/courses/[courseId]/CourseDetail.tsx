'use client';

// Chi tiết khoá học — dữ liệu đến từ danh mục tĩnh (src/lib/catalog.ts), phần
// vẽ nằm trọn trong `CourseShell.module.css` (bảng kem --ds-* của bản thiết kế
// v2).
//
// ── 15/10/2026: BỎ HAI FILE CSS LEGACY VÀ FONT AWESOME ────────────────
// Trước bản này trang vẽ bằng lớp TOÀN CỤC `.edu-cd-*` / `.cd-block*` của
// `/static/css/edu-course-detail.css` + `/static/css/course_detail.css`, nên nó
// là bề mặt cuối cùng còn ở bảng XANH DƯƠNG kế thừa bản Django. Người dùng
// thấy được: thanh đầu trang (SiteHeader, đã kem) đứng trên thân trang xanh, và
// đi trang chủ (kem) → trang khoá (xanh) → bài học (kem) là hai cú giật màu.
//
// Vì sao chuyển sang CSS module thay vì sửa hai file legacy đó: lý lẽ đầy đủ ở
// đầu `CourseShell.module.css`. Tóm tắt: `edu-course-detail.css` còn được ba
// trang `/courses/db_design*` nạp, và tên lớp CSS module bị băm nên không
// selector legacy nào khớp được nữa — kể cả hai dòng `!important` của
// edu-theme.css đang đè `.cd-block`.
//
// Cũng bỏ `<link>` Font Awesome: trang này nay chỉ còn MỘT hệ biểu tượng là
// SVG nội tuyến. Trước đó nó dùng BA hệ cùng lúc — Font Awesome qua CDN (5
// icon ở khối "KHOÁ HỌC BAO GỒM"), SVG nội tuyến (mũi tên quay lại) và EMOJI
// (📚 📋 📌 làm icon tiêu đề mục, ▶ trong tên nút). Emoji trong tên nút là lỗi
// trợ năng thật: trình đọc màn hình đọc TÊN KÝ TỰ trước nhãn nút. Hai trang
// còn dùng Font Awesome (`CourseDbDesign.tsx`, `/card/[cardId]`) tự nạp link
// của riêng chúng nên không ảnh hưởng.
//
// Không còn nạp course_detail.js/edu-chrome.js: hai file đó chỉ phục vụ nút
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

/**
 * Biểu tượng — MỘT hệ duy nhất cho cả trang: SVG nội tuyến, nét 2 (bản thiết
 * kế §1.2 chốt "Icon SVG, chevron 18px, nét 2,4" thay cho mũi tên ký tự).
 *
 * Mọi icon ở đây đều TRANG TRÍ: ngay cạnh chúng luôn có chữ nói cùng một
 * điều, nên để `aria-hidden` là đúng — đọc thêm tên icon chỉ làm dài câu mà
 * không thêm thông tin. Icon nào MANG thông tin thì phải có nhãn chữ, không
 * được để trần ở đây.
 */
const ICON_PATHS = {
  play: 'M7 4.5v15l12-7.5z',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronRight: 'm9 18 6-6-6-6',
  // "Nội dung khoá học" — quyển sách mở
  book: 'M2 5h7a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H2zM22 5h-7a3 3 0 0 0-3 3v11a3 3 0 0 1 3-3h7z',
  // "Tổng quan khoá học" — bảng kẹp
  clipboard: 'M9 4h6v3H9zM8 5.5H6a2 2 0 0 0-2 2V20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5a2 2 0 0 0-2-2h-2',
  // "Yêu cầu" — ghim
  pin: 'M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  unlock: 'M7 11V7a5 5 0 0 1 9.9-1M5 11h14v10H5z',
  save: 'M5 3h11l3 3v15H5zM8 3v6h7V3M8 14h8v7H8z',
  device: 'M7 2h10v20H7zM11 18h2',
} as const;

function Icon({ name, size = 18 }: { name: keyof typeof ICON_PATHS; size?: number }) {
  // `fill` khác nhau theo icon: `play` là hình đặc, còn lại là nét.
  const solid = name === 'play';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={solid ? 'currentColor' : 'none'}
      stroke={solid ? 'none' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

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
      <a className={`${styles.btn} ${styles.btnPrimary} ${styles.resumeBtn}`} href={href}>
        <Icon name="play" />
        {resumeButtonLabel(plan)}
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
  // ?lesson= là chỉ số từ 0 (xem lesson/python_advanced/page.tsx); khoá khác bỏ qua tham số này.
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
      {/* Chỉ còn edu-theme.css, giống trang chủ: nó giữ `--edu-font` và vẽ các
          trang legacy. Năm file bỏ đi (style/dashboard/pages/dark-mode/
          edu-dashboard + hai file course detail) đã được ĐO trên trang thật là
          KHÔNG thắng ở bất kỳ khối nào của trang này — chúng chỉ tô `body`,
          mà `.page` dưới đây phủ kín khung nhìn nên nền body không còn lộ. */}
      <PageStyles hrefs={['/static/css/edu-theme.css']} />

      <div className={styles.page}>
        <div className={styles.shell}>
          <SiteHeader />

          <div className={styles.content}>
            {/* <a> thường: về trang chủ bằng tải lại trang, xem SiteHeader. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className={styles.back} href="/">
              <Icon name="chevronLeft" size={15} />
              <span>Tất cả khoá học</span>
            </a>

            <div className={styles.grid}>
              {/* ── Cột trái ── */}
              <div className={styles.main}>
                {/* Hero */}
                <div className={styles.hero}>
                  <div className={styles.heroInfo}>
                    {/* Dòng nhãn chỉ hiện khi khoá khai `tag`. Khoá không khai thì
                        bỏ CẢ dòng — trước đây ghép cứng `[tag, cấp độ].join(' · ')`
                        nên khoá thiếu thẻ sẽ in ra "undefined · Nâng cao", mà bỏ
                        riêng thẻ thì còn trơ " · Nâng cao" treo trên tiêu đề. */}
                    {course.tag && (
                      <span className={styles.tag}>{`${course.tag} · ${LEVEL_LABEL[course.level]}`}</span>
                    )}
                    <h1 className={styles.title}>{course.title}</h1>
                    <p className={styles.subtitle}>{course.subtitle}</p>
                    <div className={styles.heroCta}>
                      <a className={`${styles.btn} ${styles.btnPrimary}`} href={startUrl}>
                        <Icon name="play" />
                        {ctaLabel}
                      </a>
                      {feedback && (
                        <a
                          className={`${styles.btn} ${styles.btnSecondary}`}
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
                  <div className={styles.heroArt}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={course.image} alt={course.title} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                </div>

                {/* Nội dung khoá học (giáo trình) */}
                <div className={styles.block} id={curriculumAnchor}>
                  <div className={styles.blockHd}>
                    <div className={styles.blockIcon}><Icon name="book" /></div>
                    <h3 className={styles.blockTitle}>Nội dung khoá học</h3>
                    <span className={styles.blockMeta}>
                      {/* "chặng" và "bài", không phải "module"/"bài học": bảng
                          thuật ngữ ở lib/home-copy.ts chốt một việc một từ, trang
                          chủ in "8 chặng · 48 bài" và màn Thử thách ôn cũng nói
                          "chặng". Trang khoá nằm GIỮA hai màn đó trên đúng luồng
                          của người học, nên nó mà gọi tên khác là người học tưởng
                          đây là hai thứ khác nhau. */}
                      {modules.length} chặng · {total} bài
                      {/* Chỉ thêm phần "đã xong" khi thật sự biết tiến độ; khách
                          vãng lai vẫn thấy đúng dòng chữ như trước. */}
                      {plan.completedCount > 0 && ` · đã xong ${plan.completedCount}/${total}`}
                    </span>
                  </div>
                  <div className={styles.blockBody}>
                    {modules.map((module, mi) => {
                      const open = openModules[mi] ?? mi === 0;
                      const bodyId = `cd-module-body-${mi}`;
                      return (
                        <div className={styles.module} key={mi}>
                          {/* <button> chứ không <div onClick>: tiêu đề module là thứ
                              duy nhất mở được danh sách bài, để <div> thì bàn phím
                              không với tới (WCAG 2.1.1). */}
                          <button
                            type="button"
                            className={`${styles.moduleHead}${open ? ` ${styles.moduleOpen}` : ''}`}
                            aria-expanded={open}
                            aria-controls={bodyId}
                            onClick={() => setOpenModules((s) => ({ ...s, [mi]: !open }))}
                          >
                            <div className={styles.moduleArrow}><Icon name="chevronRight" size={14} /></div>
                            <div className={styles.moduleName}>{module.title}</div>
                            <div className={styles.moduleMeta}>{module.lessons.length} bài</div>
                          </button>
                          <div
                            className={`${styles.moduleBody}${open ? ` ${styles.moduleBodyOpen}` : ''}`}
                            id={bodyId}
                          >
                            <div className={styles.lessonList}>
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
                                    className={`${styles.lesson}`
                                      + `${done ? ` ${styles.lessonDone}` : ''}`
                                      + `${suggested ? ` ${styles.lessonNext}` : ''}`}
                                    key={index}
                                    data-done={done ? '1' : undefined}
                                    href={`${course.lessonUrl}?lesson=${index}`}
                                  >
                                    {/* Ô số bài đổi thành dấu ✓ khi đã xong. Dấu
                                        này aria-hidden nên tình trạng phải được
                                        nói lại bằng CHỮ ở dòng meta dưới — người
                                        dùng trình đọc màn hình không "thấy" được
                                        màu hay dấu kiểm. */}
                                    <div
                                      className={`${styles.lessonIcon}${done ? ` ${styles.lessonIconDone}` : ''}`}
                                      aria-hidden="true"
                                    >
                                      {done ? '✓' : lessonNo}
                                    </div>
                                    <div className={styles.lessonBody}>
                                      <div className={styles.lessonTitle}>{title}</div>
                                      <div className={styles.lessonMeta}>
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
                <div className={styles.block}>
                  <div className={styles.blockHd}>
                    <div className={styles.blockIcon}><Icon name="clipboard" /></div>
                    <h3 className={styles.blockTitle}>Tổng quan khoá học</h3>
                  </div>
                  <div className={styles.blockBody}>
                    <p className={styles.desc}>{course.description}</p>
                  </div>
                </div>

                {/* Yêu cầu */}
                {requirements.length > 0 && (
                  <div className={styles.block}>
                    <div className={styles.blockHd}>
                      <div className={styles.blockIcon}><Icon name="pin" /></div>
                      <h3 className={styles.blockTitle}>Yêu cầu</h3>
                    </div>
                    <div className={styles.blockBody}>
                      <ul className={styles.reqList}>
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
              <div className={styles.side}>
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

                <div className={styles.card}>
                  <div className={styles.price}>Miễn phí</div>

                  <a className={`${styles.btn} ${styles.btnPrimary} ${styles.startBtn}`} href={startUrl}>
                    <Icon name="play" />
                    {ctaLabel}
                  </a>

                  {/* KHOÁ HỌC BAO GỒM — hai dòng ở đây từng hứa thứ không có:
                      · "Chứng chỉ hoàn thành": không có endpoint, không có màn,
                        không có đường nào phát. Cột `users.certificates` là di sản
                        bản Django, chỉ được ĐỌC ở `stats.service.ts`, không nơi nào
                        tăng — nên nó đứng ở 0 với mọi người, mãi mãi.
                      · "Truy cập vĩnh viễn": frontend không còn đăng nhập, ai vào
                        cũng là tài khoản khách, mà hạn refresh mặc định là 8 giờ
                        (cửa sổ TRƯỢT — xem `RefreshTokenService.issue()`). Hết hạn
                        là mất tiến độ, ngược hẳn với "vĩnh viễn".
                      Hai dòng thay thế nói đúng thứ đo được: không có cơ chế khoá
                      bài nào trong repo, và tiến độ gắn với phiên. Cùng lý lẽ đã gỡ
                      `rating: 4.8` ở a04c3cf — hiện số liệu bịa cho người thử là tự
                      bắn vào chân mình. Canh bằng `e2e/unit/course-includes.test.mjs`. */}
                  <div className={styles.includes}>
                    <div className={styles.includesTitle}>KHOÁ HỌC BAO GỒM</div>
                    <div className={styles.incItem}><span className={styles.incIcon}><Icon name="book" /></span> {course.lessons} bài học</div>
                    <div className={styles.incItem}><span className={styles.incIcon}><Icon name="clock" /></span> {course.duration}</div>
                    <div className={styles.incItem}><span className={styles.incIcon}><Icon name="unlock" /></span> Mọi bài mở sẵn, không khoá theo thứ tự</div>
                    <div className={styles.incItem}><span className={styles.incIcon}><Icon name="save" /></span> Tiến độ lưu theo phiên của bạn</div>
                    <div className={styles.incItem}><span className={styles.incIcon}><Icon name="device" /></span> Học trên mọi thiết bị</div>
                  </div>
                </div>

                {/* Bạn sẽ học được — ẩn hẳn khi khoá không có curriculum.skills. */}
                {outcomes.length > 0 && (
                  <div className={styles.card}>
                    <div className={styles.cardTitle}>Bạn sẽ học được</div>
                    <div className={styles.outcomes}>
                      {outcomes.map((skill, i) => (
                        <div className={styles.outcome} key={i}>
                          <div className={styles.outcomeDot}></div>
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
      </div>
    </>
  );
}
