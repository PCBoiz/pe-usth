'use client';

// Dịch từ Stitch "khung_bài_học_python_lesson_chrome_wrapper" (code.html), chỉnh
// lại theo Figma "PE Python v3 — 20 bài cơ bản B01–B20": top bar 56px trắng (đóng
// bài + tên bài + thanh tiến độ liền mảnh + số bước) — vùng nội dung đơn cột
// 680px trên nền phẳng — bottom bar 88px ("✓ Tiến độ tự lưu" + 1 nút CTA 480px).
// Dùng chung cho mọi loại bài học (không riêng Python) nên đặt ngoài
// components/python-studio; ăn theo token --edu-*/--st-* đã gom ở
// edu-theme.css + studio-tokens.css (--st-chrome-h/--st-action-h/--st-col/
// --st-card-radius được tạo sẵn từ trước, dùng ở đây).
import { useEffect, useRef } from 'react';

import { PREV_LABEL } from '@/lib/lesson-nav';

import styles from './LessonChrome.module.css';

export interface LessonChromeProps {
  /** Bước hiện tại, 1-based. */
  step: number;
  totalSteps: number;
  // KHÔNG có prop `streak` nữa: chuỗi ngày học đã bị gỡ khỏi thanh trên cùng.
  // Chủ sản phẩm chốt triết lý "tự học + hệ thống dẫn đường + thích ứng", trong
  // đó chuỗi bị ĐỨT là thứ đẩy người học bỏ cuộc (Silverman & Barasch 2023) nên
  // nằm trong danh sách "đừng làm"; chỉ số hiển thị phải là loại CHỈ TĂNG.
  // Backend vẫn tính và lưu chuỗi (src/common/streak/) để bật lại được sau này
  // — đây chỉ là gỡ phần HIỂN THỊ.
  /** Điểm trong bài (khoá có mini-game). Không truyền thì không hiện ô điểm. */
  points?: number;
  courseLabel?: string;
  saveLabel?: string;
  onClose?: () => void;
  primaryLabel: string;
  onPrimaryClick?: () => void;
  primaryDisabled?: boolean;
  /** Đổi màu nút chính theo kết quả chấm bài. */
  primaryTone?: 'accent' | 'ok' | 'err';
  /** Nút phụ bên trái nút chính (ví dụ "Gợi ý"). */
  secondaryLabel?: React.ReactNode;
  onSecondaryClick?: () => void;
  /** Lùi một màn. Không truyền (màn đầu, màn tải/lỗi) thì không có nút.
   *  Gộp từ Figma: trước đây chỉ lùi được bằng cách bấm đúng một đoạn trên
   *  thanh tiến độ mảnh ở trên cùng — không chữ, không ai đoán ra. */
  onPrev?: () => void;
  /** Cho quay lại màn đã qua bằng cách bấm vào đoạn tương ứng trên thanh tiến
   *  độ. Không truyền thì thanh chỉ để xem (đúng như bản Stitch gốc). */
  onSeek?: (step: number) => void;
  /** Đoạn xa nhất được phép bấm tới; mặc định là bước hiện tại. */
  seekMax?: number;
  /** Màn nào đã xong (theo chỉ số 0-based), để tô ĐẦY đúng những đoạn đó dù
   *  đang xem lại một màn cũ. Màn đang mở luôn tô đầy bất kể done hay chưa;
   *  màn đã xong nằm SAU màn đang mở tô nhạt hơn để vẫn thấy mình đang ở đâu.
   *  Không truyền thì mọi đoạn trước bước hiện tại cũng coi như đầy. */
  doneSteps?: boolean[];
  /**
   * Nới cột nội dung từ 680px lên --st-col-wide cho MỘT màn. Dùng ở màn lý
   * thuyết của khoá Python Advanced: hình minh hoạ vẽ khổ 1280×640, trong cột
   * 680px thì chữ trong sơ đồ chỉ còn 6–7px. Không truyền thì mọi màn giữ đúng
   * cột 680px của Figma.
   */
  wide?: boolean;
  children: React.ReactNode;
}

export default function LessonChrome({
  step,
  totalSteps,
  points,
  courseLabel = 'Python Studio',
  saveLabel = '✓ Tiến độ tự lưu',
  onClose,
  primaryLabel,
  onPrimaryClick,
  primaryDisabled,
  primaryTone = 'accent',
  secondaryLabel,
  onSecondaryClick,
  onPrev,
  onSeek,
  seekMax,
  doneSteps,
  wide,
  children,
}: LessonChromeProps) {
  const primaryClass =
    primaryTone === 'ok'
      ? styles.primaryBtnOk
      : primaryTone === 'err'
        ? styles.primaryBtnErr
        : styles.primaryBtn;

  // ── TIÊU ĐIỂM KHI SANG MÀN MỚI ────────────────────────────────────────
  // Lỗi đang chữa: bấm "Tiếp tục" thay TOÀN BỘ nội dung thẻ (div `key={step}`
  // bên dưới bị dựng lại), nhưng nút CTA nằm ở THANH DƯỚI — ngoài vùng bị
  // dựng lại — nên tiêu điểm đứng nguyên trên nút đó và KHÔNG có gì được loan
  // báo. Với người dùng trình đọc màn hình, bấm "Tiếp tục" là im lặng tuyệt
  // đối: không biết đã sang màn khác, không biết màn mới nói gì, phải tự mò
  // ngược lên. Với người dùng bàn phím, muốn đọc nội dung mới phải Shift+Tab
  // qua một số điều khiển không đoán trước được. Cả 10 màn mỗi bài, 48 bài.
  //
  // Cách chữa là mẫu chuẩn của điều hướng trong ứng dụng một trang: dời tiêu
  // điểm vào chính khối nội dung (tabIndex -1, có TÊN) — trình đọc màn hình
  // đọc tên khối rồi đọc tiếp nội dung, con trỏ đọc nằm đúng chỗ.
  const stepRef = useRef<HTMLDivElement | null>(null);
  // Lần dựng ĐẦU không được cướp tiêu điểm: lúc đó người học vừa mở trang,
  // chưa thao tác gì, kéo tiêu điểm vào giữa trang là cướp con trỏ đọc và làm
  // trình duyệt cuộn trang.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    stepRef.current?.focus();
  }, [step]);

  return (
    <div className={styles.chrome}>
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <button
            type="button"
            aria-label="Đóng bài học"
            className={styles.closeBtn}
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className={styles.lessonContext} title={courseLabel}>{courseLabel}</div>

          <div className={styles.track} title={`Tiến độ bài học: ${step}/${totalSteps}`}>
            {Array.from({ length: totalSteps }, (_, i) => {
              const idx = i + 1;
              const current = idx === step;
              // Đoạn đầy khi màn đó đã xong (doneSteps), khi màn đứng trước
              // bước hiện tại (fallback lúc không có doneSteps, hoặc phòng khi
              // done thiếu mục), hoặc khi đó là màn đang mở — kể cả chưa làm
              // xong: dừng ở nửa đoạn trông như treo/lỗi. Thanh liền mảnh theo
              // Figma nên không có viền đánh dấu: đoạn đã xong nằm SAU màn đang
              // mở (khi xem lại) tô nhạt hơn để vẫn thấy mình đang ở đâu.
              const filled = Boolean(doneSteps?.[i]) || idx < step || current;
              const ahead = !current && idx > step && Boolean(doneSteps?.[i]);
              const className = current
                ? `${styles.segment} ${styles.segmentCurrent}`
                : ahead
                  ? `${styles.segment} ${styles.segmentAhead}`
                  : styles.segment;
              // Bằng CLASS, không bằng `style={{ width }}`: thuộc tính style nội
              // tuyến do SSR sinh ra cũng bị `style-src` của CSP chặn khi bỏ
              // 'unsafe-inline' (xem AGENTS.md), và scaleX thì không cần số.
              const fill = (
                <div className={filled ? `${styles.segmentFill} ${styles.segmentFillOn}` : styles.segmentFill} />
              );
              // Chỉ những màn đã đi qua mới bấm được: thanh tiến độ không phải
              // đường tắt bỏ qua phần chưa làm.
              if (onSeek && idx <= (seekMax ?? step))
                return (
                  <button
                    key={idx}
                    type="button"
                    className={className}
                    aria-label={`Xem lại màn ${idx}`}
                    aria-current={current ? 'step' : undefined}
                    onClick={() => onSeek(idx)}
                  >
                    {fill}
                  </button>
                );
              return (
                <div key={idx} className={className} aria-current={current ? 'step' : undefined}>
                  {fill}
                </div>
              );
            })}
          </div>

          <span className={styles.stepLabel}>{step}/{totalSteps}</span>

          {/* Pill chuỗi ngày (🔥) từng đứng ở đây và là mục neo mép phải. Gỡ rồi
              thì `.stepLabel` nhận `margin-left: auto` để "3/8" (và ⭐ điểm nếu
              có) về đúng chỗ đó — thanh không bị hụt một bên. Nhờ vậy cũng bỏ
              được `style={{ marginLeft: 0 }}` nội tuyến của pill cũ, thứ mà CSP
              không còn 'unsafe-inline' sẽ chặn (xem AGENTS.md). */}
          {points !== undefined && (
            <div className={styles.scorePill} title="Điểm trong bài này" aria-label={`${points} điểm`}>
              <span aria-hidden="true">⭐</span>
              <span>{points}</span>
            </div>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <div className={wide ? `${styles.contentContainer} ${styles.contentWide}` : styles.contentContainer}>
          {/* key={step} để mỗi lần đổi bước là một lần chạy lại animation vào.
              `tabIndex={-1}` + `aria-label`: đích đến của tiêu điểm sau mỗi lần
              sang màn (xem khối chú thích ở đầu hàm). Nhãn nói SỐ MÀN vì tiêu
              đề bên trong mới nói nội dung — nghe liền nhau thành "Màn 4 trên
              10 … Dự đoán kết quả". */}
          <div
            key={step}
            ref={stepRef}
            tabIndex={-1}
            role="group"
            aria-label={`Màn ${step} trên ${totalSteps}`}
            className={styles.stepEnter}
          >
            {children}
          </div>
        </div>
      </main>

      <footer className={styles.bottomBar}>
        <div className={styles.bottomBarInner}>
          <span className={styles.leftSlot}>
            {onPrev && (
              <button
                type="button"
                className={styles.prevBtn}
                onClick={onPrev}
                aria-label={PREV_LABEL}
                data-cta="prev"
              >
                <span aria-hidden="true">←</span>
                <span className={styles.prevText}>{PREV_LABEL}</span>
              </button>
            )}
            <span className={styles.saveLabel} role="status">{saveLabel}</span>
          </span>
          <button
            type="button"
            className={primaryClass}
            onClick={onPrimaryClick}
            disabled={primaryDisabled}
            data-cta="primary"
          >
            {primaryLabel}
          </button>
          {/* Cột phải: nút phụ (vd. Gợi ý). Luôn render ô trống để nút chính
              đứng đúng giữa thanh như Figma. */}
          <span className={styles.secondarySlot}>
            {secondaryLabel && (
              <button type="button" className={styles.secondaryBtn} onClick={onSecondaryClick}>
                {secondaryLabel}
              </button>
            )}
          </span>
        </div>
      </footer>
    </div>
  );
}
