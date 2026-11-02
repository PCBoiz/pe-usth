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
import { useState } from 'react';

import CodeBlock from '@/components/lesson-chrome/exercises/CodeBlock';
import { toCodeLines } from '@/lib/py-highlight';
import { khopDapAn } from '@/lib/studio-lesson';

import type { RunResult } from '../runner/types';

import c from '../studio-chrome.module.css';
import { paragraphs, ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';

type Props = Pick<
  LessonScreenProps,
  'lesson' | 'scr' | 'metaLabel' | 'draft' | 'update' | 'chayThu' | 'running' | 'busy'
>;

export default function PracticeScreen({
  lesson,
  scr,
  metaLabel,
  draft,
  update,
  chayThu,
  running,
  busy,
}: Props) {
  // Hook phải gọi TRƯỚC mọi `return` — `if (!item) return null` ngay dưới là
  // một early return, nên hai `useState` này không được đứng sau nó.
  //
  // KHÔNG vào bản nháp: đây là kết quả của một lần chạy, không phải thứ người
  // học viết ra — và `useLessonDraft` ghi xuống localStorage, nên nhồi output
  // vào đó là lưu một thứ hết hạn ngay khi họ sửa một ký tự. Cùng lý lẽ đã
  // quyết cho `result` của màn sandbox.
  const [ketQua, setKetQua] = useState<RunResult | null>(null);
  const [daChay, setDaChay] = useState(false);

  const items = lesson.step_2?.practice ?? [];
  const at = scr.index ?? 0;
  const item = items[at];
  if (!item) return null;

  const typed = draft.practice?.[at] ?? '';
  const shown = Boolean(draft.practiceSeen?.[at]);

  /**
   * Câu này CHẠY ĐƯỢC không? 63/669 câu mang sẵn `answerCode` + `answerExpected`
   * — chương trình hoàn chỉnh, tự đủ, kèm output chính xác. Với chúng, ô viết
   * là một ô CODE có nút Chạy; 606 câu còn lại không đổi gì, vì không có gì để
   * chạy và không có gì để so.
   *
   * Luật đọc được hoàn toàn từ hình dạng dữ liệu nên nó ở ngay đây, không phải
   * một cờ do build phát — khác hẳn `tryIt`, nơi build biết thứ frontend không
   * biết (thiếu wheel, gói ẩn sau chuỗi, `sys.executable`).
   */
  const chayDuoc = Boolean(item.answerCode && item.answerExpected);


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
          {chayDuoc
            ? 'Tự viết code của bạn rồi bấm Chạy thử. Nền tảng so đầu ra với đáp án mẫu — không chấm điểm, không tính vào XP.'
            : 'Tự viết câu trả lời của bạn trước. Không ai chấm phần này — nó được lưu lại trên máy bạn để đối chiếu với đáp án mẫu.'}
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
          onChange={(e) => {
            update({ practice: { ...(draft.practice ?? {}), [at]: e.target.value } });
            // Sửa code thì kết quả cũ thôi nói về bản đang gõ. Xoá hẳn thay vì
            // làm mờ như màn sandbox: ở đây không có chip "Đạt" nào để giữ, và
            // một ô output trống đọc rõ hơn một ô mờ.
            if (ketQua) setKetQua(null);
          }}
        />
        {chayDuoc && (
          <>
            <button
              type="button"
              className={c.practiceRun}
              disabled={!typed.trim() || running || busy}
              onClick={() => {
                setDaChay(true);
                chayThu(typed, setKetQua);
              }}
            >
              {running ? 'Đang chạy…' : '▶ Chạy thử'}
            </button>
            {ketQua && (
              <div className={c.practiceResult} role="status">
                {ketQua.error ? (
                  <p className={c.practiceVerdictNo}>
                    Chương trình dừng vì lỗi — đọc dòng cuối để biết chỗ hỏng.
                  </p>
                ) : (
                  <p
                    className={
                      khopDapAn(ketQua.output ?? '', item.answerExpected ?? '')
                        ? c.practiceVerdictOk
                        : c.practiceVerdictNo
                    }
                  >
                    {khopDapAn(ketQua.output ?? '', item.answerExpected ?? '')
                      ? 'Đầu ra khớp đáp án mẫu.'
                      : 'Đầu ra chưa khớp từng ký tự. Phép so chỉ bỏ khoảng trắng, nên khác dấu nháy hay dấu ngoặc vẫn ra dòng này — đối chiếu với đáp án mẫu.'}
                  </p>
                )}
                <pre>{ketQua.error ? ketQua.error : (ketQua.output || '(không in ra gì)')}</pre>
              </div>
            )}
          </>
        )}
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
            disabled={!typed.trim() || (chayDuoc && !daChay)}
            onClick={() =>
              update({ practiceSeen: { ...(draft.practiceSeen ?? {}), [at]: true } })
            }
          >
            {/* Câu CHẠY ĐƯỢC thì cổng là "đã chạy", không phải "đã gõ": với một
                câu code, thử một lần CHÍNH LÀ việc phải làm, và một đoạn gõ ra
                mà chưa chạy thì người học chưa biết nó đúng hay sai. Câu không
                chạy được giữ nguyên cổng cũ (gõ là đủ) — ở đó không có gì để
                chạy. Giá: người viết đúng mà không bấm Chạy phải bấm một lần
                nữa; đổi lại họ thấy đầu ra thật của chính mình trước đáp án. */}
            {!typed.trim()
              ? 'Viết thử rồi mới xem được'
              : chayDuoc && !daChay
                ? 'Chạy thử rồi mới xem được'
                : 'Xem đáp án'}
          </button>
        )}
      </div>
    </ScreenShell>
  );
}
