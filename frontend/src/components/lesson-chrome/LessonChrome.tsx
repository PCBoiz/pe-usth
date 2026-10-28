'use client';

// Dịch từ Stitch "khung_bài_học_python_lesson_chrome_wrapper" (code.html), chỉnh
// lại theo Figma "PE Python v3 — 20 bài cơ bản B01–B20": top bar 56px trắng (đóng
// bài + tên bài + thanh tiến độ liền mảnh + 🔥 streak) — vùng nội dung đơn cột
// 680px trên nền phẳng — bottom bar 88px ("✓ Tiến độ tự lưu" + 1 nút CTA 480px).
// Dùng chung cho mọi loại bài học (không riêng Python) nên đặt ngoài
// components/python-studio; ăn theo token --edu-*/--st-* đã gom ở
// edu-theme.css + studio-tokens.css (--st-chrome-h/--st-action-h/--st-col/
// --st-card-radius được tạo sẵn từ trước, dùng ở đây).
import styles from './LessonChrome.module.css';

export interface LessonChromeProps {
  /** Bước hiện tại, 1-based. */
  step: number;
  totalSteps: number;
  streak: number;
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
  /**
   * Lùi một màn. Không truyền (hoặc đang ở màn 1) thì nút không dựng.
   *
   * Vì sao nó phải LÀ MỘT NÚT, trong khi thanh tiến độ đã bấm được: năm người
   * thử ngày 27/10 đều báo "không có nút back" / "chưa có nút return" — kể cả
   * người tự nhận làm frontend. Thanh tiến độ là một dải đoạn cao 4px, nó
   * không trông như thứ bấm được, nên trên thực tế nó không phải đường quay
   * lại của ai cả. Hai người nói thẳng cái giá: lỡ bấm Tiếp theo là phải đóng
   * bài rồi tìm lại từ đầu, và màn luyện tập thì không xem lại được đề.
   */
  onBack?: () => void;
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
  streak,
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
  onBack,
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
              const width = doneSteps?.[i] || idx < step || current ? '100%' : '0%';
              const ahead = !current && idx > step && Boolean(doneSteps?.[i]);
              const className = current
                ? `${styles.segment} ${styles.segmentCurrent}`
                : ahead
                  ? `${styles.segment} ${styles.segmentAhead}`
                  : styles.segment;
              const fill = <div className={styles.segmentFill} style={{ width }} />;
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

          {points !== undefined && (
            <div className={styles.scorePill} title="Điểm trong bài này" aria-label={`${points} điểm`}>
              <span aria-hidden="true">⭐</span>
              <span>{points}</span>
            </div>
          )}

          <div
            className={styles.streakPill}
            style={points !== undefined ? { marginLeft: 0 } : undefined}
            title={`Chuỗi ${streak} ngày học liên tiếp`}
          >
            <span aria-hidden="true">🔥</span>
            <span>{streak}</span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={wide ? `${styles.contentContainer} ${styles.contentWide}` : styles.contentContainer}>
          {/* key={step} để mỗi lần đổi bước là một lần chạy lại animation vào */}
          <div key={step} className={styles.stepEnter}>
            {children}
          </div>
        </div>
      </main>

      <footer className={styles.bottomBar}>
        <div className={styles.bottomBarInner}>
          {/* Ô trái giữ nguyên MỘT ô của lưới 3 cột, nếu không nút chính lệch
              khỏi giữa thanh. Nút quay lại đứng trước nhãn lưu vì nó là thứ
              người ta đi tìm; nhãn lưu chỉ để đọc. */}
          <span className={styles.leftSlot}>
            {onBack && step > 1 && (
              <button
                type="button"
                className={styles.backBtn}
                onClick={onBack}
                data-cta="back"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                {/* Chữ ẩn ở màn hẹp (xem .backText), nhưng PHẢI nằm trong DOM:
                    nút chỉ còn mũi tên thì trình đọc màn hình không đọc được
                    gì. aria-label trên <button> sẽ ghi đè cả chữ này nên không
                    dùng — để chữ thật làm tên luôn. */}
                <span className={styles.backText}>Quay lại</span>
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
