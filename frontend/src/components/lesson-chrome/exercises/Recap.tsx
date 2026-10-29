// Dịch từ màn Stitch "3. RECAP — Tổng kết bài học & Nhận XP". Cũng là màn
// toàn thẻ, đứng độc lập như Checkpoint.
import { withInlineCode } from '@/lib/inline-code';

export interface RecapStat {
  icon: string;
  value: string;
  label: string;
}

export interface RecapProps {
  xpLabel: string;
  title: string;
  description: string;
  stats: RecapStat[];
  facts: string[];
  onFinish: () => void;
  /**
   * Thêm một ô nữa vào màn tổng kết, dựng TRƯỚC nút "Hoàn thành ✓".
   *
   * Vị trí là một yêu cầu, không phải thẩm mỹ: hôm nay người dùng duy nhất của
   * nó là ô đề ôn tập (`ReviewQuiz`), và đặt nó SAU nút kết thúc thì muốn tới
   * được phải cuộn qua đúng cái nút đưa mình ra khỏi bài. Một đường đi phải
   * đoán mới thấy thì trên thực tế nó không tồn tại — repo này đã vấp đúng hình
   * dạng lỗi đó tám lần (thanh tiến độ bấm được mà không ai biết, tracer không
   * bài nào tới, nút "Try it Yourself" không màn nào mount).
   */
  extra?: React.ReactNode;
}

export default function Recap({
  xpLabel,
  title,
  description,
  stats,
  facts,
  onFinish,
  extra,
}: RecapProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--edu-panel-bg-solid)',
          border: '1px solid var(--edu-sidebar-border)',
          borderRadius: 999,
          padding: '10px 20px',
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--edu-accent-text)',
        }}
      >
        <span aria-hidden="true">💎</span> {xpLabel} <span aria-hidden="true">✨</span>
      </span>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: '16px 0 8px', color: 'var(--edu-t1)' }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--edu-t3)', maxWidth: 460, margin: '0 auto 20px' }}>{description}</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 12, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div
            key={i}
            style={{
              background: 'var(--edu-panel-bg-solid)',
              border: '1px solid var(--edu-sidebar-border)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 22 }} aria-hidden="true">{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--edu-t1)', margin: '6px 0 2px' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--edu-t3)' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--edu-t2)', marginBottom: 8 }}>
          <span aria-hidden="true">📖</span> KIẾN THỨC CỐT LÕI ĐÃ HỌC
        </div>
        {/* Danh sách thật: trình đọc màn hình báo được "3 mục" thay vì đọc liền
            một mạch ba đoạn văn không rõ ranh giới. */}
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
          {facts.map((f, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                background: 'var(--edu-panel-bg-solid)',
                border: '1px solid var(--edu-sidebar-border)',
                borderRadius: 10,
                padding: '11px 14px',
                // 14px, không 13: ô này là "KIẾN THỨC CỐT LÕI ĐÃ HỌC", tức thứ
                // người học đọc lại khi ôn. Xem lý do đầy đủ ở .read p.
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--edu-t1)',
              }}
            >
              <span aria-hidden="true" style={{ color: 'var(--st-ok-text)' }}>✓</span>
              {/* withInlineCode, KHÔNG phải {f} trần: các ý chính ở đây lấy
                  từ đoạn văn của màn đọc, mà giáo trình 172 bài dùng backtick
                  dày đặc. Dựng trần thì học viên đọc ra cả dấu backtick —
                  ảnh người thử gửi ngày 27/10 chụp đúng dòng
                  `.venv\Scripts\python -m pip install numpy`. */}
              {withInlineCode(f)}
            </li>
          ))}
        </ul>
      </div>
      {extra}
      <button
        type="button"
        onClick={onFinish}
        style={{
          width: '100%',
          height: 52,
          borderRadius: 999,
          border: 0,
          background: 'var(--edu-accent-grad)',
          color: 'var(--edu-panel-bg-solid)',
          fontWeight: 700,
          fontSize: 15,
          cursor: 'pointer',
          marginTop: 20,
        }}
      >
        Hoàn thành <span aria-hidden="true">✓</span>
      </button>
    </div>
  );
}
