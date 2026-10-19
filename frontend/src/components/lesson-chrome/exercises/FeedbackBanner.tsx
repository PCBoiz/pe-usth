// Dịch từ màn Stitch "4. FEEDBACK — Trạng thái Trả lời Đúng/Sai". Bản gốc
// hiện thành dải banner đè lên bottom bar (rộng hết màn hình); ở đây đặt
// làm 1 thẻ trong dòng nội dung để không phải sửa lại LessonChrome cho một
// trường hợp riêng — cùng thông tin (icon, tiêu đề, giải thích), khác vị trí.
import styles from './exercises.module.css';

export interface FeedbackBannerProps {
  correct: boolean;
  title: string;
  explanation: React.ReactNode;
  /** Mỗi mục một dòng riêng dưới lời giải thích — màn điền code báo từng ô. */
  lines?: string[];
}

export default function FeedbackBanner({ correct, title, explanation, lines }: FeedbackBannerProps) {
  return (
    <div
      className={styles.feedbackBanner}
      // KHÔNG đặt `role="status"` ở đây. Thẻ này là KẾT QUẢ CHẤM BÀI và phải
      // được đọc lên — nhưng nó chỉ được DỰNG RA lúc bấm "Kiểm tra", nên bản
      // thân nó làm vùng sống là vùng sống sinh ra cùng lúc với nội dung: có
      // máy đọc, có máy im. Vùng sống nay là cái vỏ RỖNG đứng sẵn quanh chỗ
      // này — xem khối chú thích ở `python-studio/screens/chrome.tsx`
      // (ScreenShell). Lồng thêm một `role="status"` vào trong nó thì thành
      // hai vùng sống chồng nhau: đọc hai lần, hoặc không lần nào.
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        background: correct ? 'var(--st-ok-bg)' : 'var(--st-err-bg)',
        border: `1px solid ${correct ? 'var(--st-ok-line)' : 'var(--st-err-line)'}`,
        borderRadius: 14,
        padding: '16px 18px',
        marginTop: 16,
      }}
    >
      {/* Dấu ✓/✕ chỉ nhắc lại điều `title` đã nói bằng chữ — ẩn khỏi trình đọc
          màn hình để không bị đọc thành "check mark" trước mỗi lần chấm. */}
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: correct ? 'var(--st-ok-text)' : 'var(--st-err-text)',
          color: 'var(--ds-on-action)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontWeight: 700,
        }}
      >
        {correct ? '✓' : '✕'}
      </span>
      <div>
        <div style={{ fontWeight: 700, color: correct ? 'var(--st-ok-text)' : 'var(--st-err-text)' }}>{title}</div>
        <div style={{ fontSize: 'var(--ds-fs-body)', color: 'var(--ds-soft)', marginTop: 4 }}>{explanation}</div>
        {lines && lines.length > 0 && (
          <ul className={styles.feedbackLines}>
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
