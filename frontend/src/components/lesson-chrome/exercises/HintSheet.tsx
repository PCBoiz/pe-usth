// Dịch từ màn Stitch "5. HINT SHEET — Ngăn kéo gợi ý từng bước". Bản gốc là
// một drawer nổi đè lên trên bài; ở đây trình bày như 1 thẻ nằm trong dòng
// chảy nội dung (đơn giản hoá bớt phần overlay) — vẫn giữ đủ 3 mức gợi ý mở
// khoá dần và 2 lựa chọn hành động cuối.
export interface HintLevel {
  title: string;
  body?: React.ReactNode;
  locked: boolean;
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
                background: 'var(--ds-card)',
                border: '1px solid var(--ds-line)',
                borderRadius: 12,
                padding: '14px 16px',
              }}
            >
              {/* Nhãn nút từng là "⚡ Mở khoá (-N XP)" khi mức gợi ý có `cost`.
                  Bỏ hẳn cả nhãn và trường `cost`: trừ XP của người đi xin giúp
                  đỡ là phạt đúng lúc họ cần giúp nhất, ngược hẳn tinh thần tự
                  học đã chốt (design-system-v2 §2.3). Không ai truyền `cost`
                  nữa, nên để trường đó lại chỉ mời người sau bật lại. */}
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
                  color: 'var(--ds-ink)',
                  fontWeight: 700,
                  fontSize: 'var(--ds-fs-ui)',
                }}
              >
                <span>
                  <span aria-hidden="true">{locked ? '🔒' : '💡'}</span> {level.title}
                </span>
                {locked && (
                  <span style={{ background: 'var(--ds-violet-tint)', color: 'var(--ds-violet-deep)', borderRadius: 999, padding: '3px 10px', fontSize: 'var(--ds-fs-label)' }}>
                    Mở gợi ý này
                  </span>
                )}
              </button>
              {/* Bấm "Mở gợi ý" xong thì nội dung hiện ra ở chỗ khác với nút vừa
                  bấm — vùng sống để nó được đọc ngay, khỏi phải đi tìm. */}
              {isOpen && level.body && (
                <div role="status" style={{ fontSize: 'var(--ds-fs-body)', color: 'var(--ds-soft)', lineHeight: 1.7, marginTop: 10 }}>{level.body}</div>
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
            // `line` chỉ 1,2:1 trên nền `tint` — không nhận ra là nút
            // (WCAG 1.4.11). `sketch` cho 3,4:1 trên nền đó.
            border: '2px solid var(--ds-sketch)',
            background: 'var(--ds-tint)',
            color: 'var(--ds-ink)',
            fontSize: 'var(--ds-fs-ui)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Đã hiểu, quay lại làm bài
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
            color: 'var(--ds-violet-deep)',
            fontSize: 'var(--ds-fs-ui)',
            fontWeight: 700,
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Tiếp tục viết mã
        </button>
      </div>
    </div>
  );
}
