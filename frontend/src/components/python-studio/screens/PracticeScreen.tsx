'use client';

// S2 · Luyện tập: một câu của `step_2.practice` (khoá 172 bài đọc — xem
// scripts/pe-da/SCHEMA.md).
//
// KHÔNG CHẤM, và đó là quyết định về nội dung chứ không phải phần làm chưa
// xong: 516 câu trong nguồn đều là câu hỏi MỞ kèm lời giải mẫu, không có phương
// án sai nào để so. Bịa ra một bộ chấm (so chuỗi, đếm từ khoá) thì nó sẽ báo
// "chưa đúng" cho những câu trả lời đúng — tệ hơn là không chấm. Vì vậy
// isGraded('practice') trả false và màn này không có băng phản hồi đúng/sai.
//
// Thứ tự dựng là có ý: ô viết ĐỨNG TRƯỚC nút "Xem đáp án". Mở sẵn đáp án thì
// câu luyện tập thành câu đọc, mà khoá này đã có 172 bài đọc rồi.
//
// VÀ THỨ TỰ THÔI LÀ CHƯA ĐỦ — nút phải KHOÁ tới khi có chữ. Đo trên bản dựng:
// 669 màn luyện tập = 31% toàn khoá, nhiều hơn cả màn đọc (565) — mà không màn
// nào đòi người học làm gì trước khi hiện đáp án. Người thử ngày 1/11/2026 nói
// đúng một câu: "nên đặt trọng tâm vào practice". Khối lượng thì đã là trọng
// tâm rồi; thứ thiếu là lời đòi.
// Cùng bằng chứng với nút "Mở bảng" của StepTrace (`disabled={!doan.trim()}`):
// Hundhausen 2002 — Gurka lặp lại thí nghiệm nhưng BỎ điều kiện "dự đoán" thì
// lợi thế BIẾN MẤT; Brod 2021 nói ra cơ chế (đoán sai → ngạc nhiên → chú ý dồn
// vào đáp án đúng). Một dòng `disabled`, và nó là toàn bộ phần có bằng chứng.
// Không chấm chữ họ gõ: 516 câu nguồn là câu MỞ, bịa bộ chấm ra là báo sai cho
// câu trả lời đúng (xem đoạn trên).
import CodeBlock from '@/components/lesson-chrome/exercises/CodeBlock';
import { toCodeLines } from '@/lib/py-highlight';

import c from '../studio-chrome.module.css';
import { paragraphs, ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';

type Props = Pick<
  LessonScreenProps,
  'lesson' | 'scr' | 'metaLabel' | 'draft' | 'update'
>;

export default function PracticeScreen({ lesson, scr, metaLabel, draft, update }: Props) {
  const items = lesson.step_2?.practice ?? [];
  const at = scr.index ?? 0;
  const item = items[at];
  if (!item) return null;

  const typed = draft.practice?.[at] ?? '';
  const shown = Boolean(draft.practiceSeen?.[at]);

  return (
    <ScreenShell
      scr={scr}
      metaLabel={metaLabel}
      title={
        items.length > 1
          ? `Câu ${at + 1}/${items.length}`
          : 'Câu luyện tập'
      }
      description={paragraphs(item.prompt)}
    >
      <div className={c.practice}>
        <label className={c.practiceNote} htmlFor={`practice-${at}`}>
          Tự viết câu trả lời của bạn trước. Không ai chấm phần này — nó được lưu lại trên
          máy bạn để đối chiếu với đáp án mẫu.
        </label>
        <textarea
          id={`practice-${at}`}
          className={c.practiceInput}
          value={typed}
          spellCheck={false}
          placeholder="Viết câu trả lời (hoặc đoạn code) của bạn…"
          // Lưu vào bản nháp như mọi màn khác (useLessonDraft tự ghi xuống
          // localStorage sau 400 ms). Không gọi clearChecked(): màn này không
          // có kết quả chấm nào để xoá.
          onChange={(e) => update({ practice: { ...(draft.practice ?? {}), [at]: e.target.value } })}
        />
        {shown ? (
          <div className={c.practiceAnswer}>
            <h4>Đáp án mẫu</h4>
            <p>{paragraphs(item.answer)}</p>
            {item.answerCode && (
              <div className={c.readCode}>
                <CodeBlock
                  filename="python"
                  langTag="đáp án mẫu"
                  lines={toCodeLines(item.answerCode)}
                />
              </div>
            )}
            {/* Cùng khối "Kết quả:" của màn đọc: output phải tách khỏi code. */}
            {item.answerExpected && (
              <div className={c.readExpected}>
                <span className={c.readExpectedLabel}>Kết quả:</span>
                <pre>{item.answerExpected}</pre>
              </div>
            )}
            <p className={c.practiceNote}>
              Đáp án mẫu là MỘT cách làm đúng, không phải cách duy nhất. Khác mà ra cùng kết
              quả thì vẫn đúng.
            </p>
          </div>
        ) : (
          <button
            type="button"
            className={c.practiceReveal}
            disabled={!typed.trim()}
            onClick={() =>
              update({ practiceSeen: { ...(draft.practiceSeen ?? {}), [at]: true } })
            }
          >
            {typed.trim() ? 'Xem đáp án' : 'Viết thử rồi mới xem được'}
          </button>
        )}
      </div>
    </ScreenShell>
  );
}
