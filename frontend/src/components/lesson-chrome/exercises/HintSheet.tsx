// Dịch từ màn Stitch "5. HINT SHEET — Ngăn kéo gợi ý từng bước". Bản gốc là
// một drawer nổi đè lên trên bài; ở đây trình bày như 1 thẻ nằm trong dòng
// chảy nội dung (đơn giản hoá bớt phần overlay) — vẫn giữ đủ 3 mức gợi ý mở
// khoá dần và 2 lựa chọn hành động cuối.
export interface HintLevel {
  title: string;
  body?: React.ReactNode;
  locked: boolean;
  cost?: number;
}

export interface HintSheetProps {
  levels: HintLevel[];
  openIndex: number;
  onUnlock: (index: number) => void;
  onBackToCode: () => void;
  onContinueWriting: () => void;
}

export default function HintSheet({ levels, openIndex, onUnlock, onBackToCode, onContinueWriting }: HintSheetProps) {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {levels.map((level, i) => {
          const isOpen = i === openIndex;
          const locked = level.locked && i > openIndex;
          return (
            <div
              key={i}
              style={{
                background: 'var(--edu-panel-bg-solid)',
                border: '1px solid var(--edu-sidebar-border)',
                borderRadius: 12,
                padding: '14px 16px',
              }}
            >
              {/* Trước đây chỉ mở khoá được khi có `cost`; bài học thật không
                  trừ XP nên không truyền cost, và học viên kẹt ở tầng 1. */}
              <button
                type="button"
                onClick={() => locked && onUnlock(i)}
                disabled={!locked}
                // Tên nút phải nói việc nó làm. Để trần thì trình đọc màn hình
                // đọc "lock, Gợi ý 2, Mở gợi ý này" — ba mảnh rời, mở đầu bằng
                // tên của emoji.
                aria-label={locked ? `Mở gợi ý: ${level.title}` : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 0,
                  font: 'inherit',
                  cursor: locked ? 'pointer' : 'default',
                  color: 'var(--edu-t1)',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                <span>
                  <span aria-hidden="true">{locked ? '🔒' : '💡'}</span> {level.title}
                </span>
                {locked && (
                  <span style={{ background: 'var(--edu-accent-soft)', color: 'var(--edu-accent-text)', borderRadius: 999, padding: '3px 10px', fontSize: 11 }}>
                    {level.cost != null ? `⚡ Mở khoá (-${level.cost} XP)` : 'Mở gợi ý này'}
                  </span>
                )}
              </button>
              {/* Bấm "Mở gợi ý" xong thì nội dung hiện ra ở chỗ khác với nút vừa
                  bấm — vùng sống để nó được đọc ngay, khỏi phải đi tìm. */}
              {isOpen && level.body && (
                <div role="status" style={{ fontSize: 13, color: 'var(--edu-t2)', lineHeight: 1.7, marginTop: 10 }}>{level.body}</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button
          type="button"
          onClick={onBackToCode}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 999,
            border: '1px solid var(--edu-sidebar-border)',
            background: 'var(--edu-card-bg)',
            color: 'var(--edu-t1)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ✓ Đã hiểu, quay lại làm bài
        </button>
        <button
          type="button"
          onClick={onContinueWriting}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 999,
            border: 0,
            background: 'transparent',
            color: 'var(--edu-accent-text)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Tiếp tục viết mã
        </button>
      </div>
    </div>
  );
}
