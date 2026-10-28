// Nút CTA dưới đáy LessonChrome: nhãn, màu và HÀNH ĐỘNG của màn đang mở.
//
// Toàn bộ là hàm thuần (không state, không ref, không gọi API): đưa vào đây để
// quy tắc "khi nào được bấm Tiếp tục / Nộp bài / Thử lại" đọc được một mạch.
// Nó trả về TÊN hành động chứ không trả closure, vì nó chạy ngay trong lúc
// render — closure lại chạm tới bộ chạy code, mà React cấm đọc ref lúc render.
// Bấm nút mới gọi doAction() trong StudioLesson.tsx.
import {
  firstUnfinished,
  gameAnswered,
  isChoiceScreen,
  isGraded,
  isRunnableGame,
  type LessonDraft,
  type LessonScreen,
  type PlayGame,
  type StudioLesson as Lesson,
} from '@/lib/studio-lesson';

import type { RunResult } from './runner/types';
import { eyebrowOf, type ScreenVerdict } from './screens/chrome';

export type Action =
  | 'leave'
  | 'nextLesson'
  | 'toSandbox'
  | 'toBlocked'
  | 'complete'
  | 'submit'
  | 'check'
  | 'retry'
  | 'next';

export type Cta = {
  label: string;
  tone: 'accent' | 'ok' | 'err';
  disabled?: boolean;
  action: Action;
};

export type CtaContext = {
  lesson: Lesson | null;
  scr?: LessonScreen;
  screens: LessonScreen[];
  draft: LessonDraft;
  game?: PlayGame;
  checked: boolean;
  verdict: ScreenVerdict | null;
  completed: boolean;
  /** Còn bài sau trong khoá hay không (để đổi nhãn ở màn tổng kết). */
  hasNextLesson: boolean;
  lessonNo: number;
  running: boolean;
  busy: boolean;
  result: RunResult | null;
};

/** Đã có câu trả lời để bấm "Kiểm tra" chưa. */
export function isAnswered({ lesson, scr, draft, game }: CtaContext): boolean {
  if (!scr || !lesson) return false;
  if (scr.kind === 'predict') return Boolean(draft.predict);
  if (scr.kind === 'mcq') return draft.mcq[scr.index ?? 0] !== undefined;
  if (scr.kind === 'classify')
    return (lesson.step_2?.classify?.tokens ?? []).every((t) => draft.bins[t.label]);
  if (scr.kind === 'selfExplain') return draft.explanation.trim().length > 0;
  if (scr.kind === 'scaffold')
    return (lesson.step_3?.scaffold?.slots ?? []).every((slot) => draft.slots[slot.n]);
  if (scr.kind === 'counter') return Boolean(draft.counter);
  if (scr.kind === 'game') return game ? gameAnswered(lesson, game, draft) : false;
  return true;
}

export function primaryCta(ctx: CtaContext): Cta {
  const { scr, screens, draft, game, checked, verdict, completed, busy, running, result } = ctx;
  const tests = ctx.lesson?.step_4?.tests ?? [];

  if (!scr) return { label: 'Về khóa học', tone: 'accent', action: 'leave' };

  if (scr.kind === 'recap') {
    // Học xong thì đi thẳng sang bài kế tiếp, không bắt quay về danh sách.
    if (completed)
      return ctx.hasNextLesson
        ? { label: `Bài ${ctx.lessonNo + 1} →`, tone: 'ok', action: 'nextLesson' }
        : { label: 'Về khóa học →', tone: 'ok', action: 'leave' };
    // Chưa làm xong màn nào đó thì không cho kết thúc bài — kể cả khi mở lại
    // từ bản nháp cũ và nhảy thẳng tới đây.
    const missing = firstUnfinished(screens, draft);
    if (missing)
      return {
        label: `Còn phải làm: ${eyebrowOf(missing).label}`,
        tone: 'err',
        action: 'toBlocked',
      };
    if (tests.length)
      return { label: 'Nộp bài ở màn trước', tone: 'accent', action: 'toSandbox' };
    // Bài lab desktop / bài quy trình không có ca chấm nào chạy được trong
    // trình duyệt, nên hoàn thành do người học tự xác nhận ở đây.
    return {
      label: busy ? 'Đang lưu…' : 'Đánh dấu đã hoàn thành ✓',
      tone: 'accent',
      disabled: busy,
      action: 'complete',
    };
  }

  if (scr.kind === 'sandbox') {
    // KHÔNG có ca kiểm thử nào thì nút KHÔNG được nói "Nộp & Chấm điểm": không
    // có gì để chấm, và bấm nó chỉ chạy code rồi báo đạt 0/0. Đúng trường hợp
    // của khoá 172 bài đọc (không bài nào phát ra `step_4.tests`) và của bài
    // quy trình làm trên máy. Chạy thử là việc của nút "▶ Chạy thử" trong ô
    // soạn mã, nên nút dưới đáy chỉ còn việc đi tiếp — và nó nói đúng thế.
    // Bảng ca kiểm thử cũng tự ẩn khi rỗng (xem SandboxEditor).
    if (!tests.length) return { label: 'Xong — tiếp tục →', tone: 'accent', action: 'next' };
    if (draft.done[scr.key]) return { label: 'Tiếp tục →', tone: 'ok', action: 'next' };
    return {
      label: running ? 'Đang chấm…' : 'Nộp & Chấm điểm',
      tone: result && result.tests.some((t) => !t.passed) ? 'err' : 'accent',
      disabled: running || busy,
      action: 'submit',
    };
  }

  if (isGraded(scr.kind)) {
    if (isRunnableGame(game) && running)
      return { label: 'Đang chạy code…', tone: 'accent', disabled: true, action: 'check' };
    if (!checked)
      return {
        label: isRunnableGame(game) ? '▶ Chạy & kiểm tra' : 'Kiểm tra',
        tone: 'accent',
        disabled: !isAnswered(ctx),
        action: 'check',
      };
    if (verdict && !verdict.correct) {
      // TRẢ LỜI SAI Ở CÂU CHỌN PHƯƠNG ÁN: nút CHÍNH cho ĐI TIẾP, không bắt làm
      // lại. Lý lẽ đầy đủ (Van der Kleij 2015, Butler 2007, và vì sao nó không
      // sửa được bằng một dòng) nằm ở khối "ba trạng thái của một màn" trong
      // lib/studio-lesson.ts.
      //
      // `tone: 'err'` chứ không 'ok': nút vẫn ĐỎ và nhãn vẫn nói ra rằng đây là
      // đường đi tiếp SAU KHI xem đáp án. Yêu cầu thiết kế là "vẫn phải thấy rõ
      // mình sai" — nếu nút này giống nút của câu đúng ('Tiếp tục →' xanh) thì
      // đúng và sai trông như nhau, và đó là đổi một lỗi lấy một lỗi khác.
      //
      // Nhãn NGẮN, và đó là ràng buộc của thanh dưới ở màn hẹp: dưới 560px
      // thanh này là flex với nút chính `flex: 1; min-width: 132px` và nút phụ
      // `flex-shrink: 0`, nên một nhãn 26 ký tự ở hai nút cùng lúc đẩy thanh
      // tràn ngang trên điện thoại. "Đã xem đáp án →" nói đủ việc nó làm.
      if (isChoiceScreen(scr.kind))
        return { label: 'Đã xem đáp án →', tone: 'err', action: 'next' };
      // Các màn có chấm KHÁC (xếp dòng code, sửa hàm, phân loại): làm lại ở đó
      // là làm lại VIỆC, không phải bấm nốt hai phương án còn lại.
      return { label: 'Thử lại', tone: 'err', action: 'retry' };
    }
    return { label: 'Tiếp tục →', tone: 'ok', action: 'next' };
  }

  return { label: 'Tiếp tục →', tone: 'accent', action: 'next' };
}

/**
 * Nút PHỤ của màn đang mở — hôm nay chỉ có một: "Thử lại" sau khi trả lời sai
 * một câu chọn phương án.
 *
 * GIỮ "Thử lại", nhưng làm nút PHỤ, và đây là lý do: bằng chứng của M5 là
 * HỖN HỢP — vài nghiên cứu ghi nhận lợi ích về ĐỘNG LỰC khi được thử lại — nên
 * bỏ hẳn nó là đi xa hơn bằng chứng cho phép. Thứ phá giá trị đo lường không
 * phải bản thân nút thử lại, mà là việc nó là đường đi DUY NHẤT và việc điểm
 * được tính lại sau mỗi lần bấm. Cả hai đã bỏ: `score.firstTry` khoá kết quả ở
 * lần chấm ĐẦU, nên chọn lại sau khi đọc đáp án không mua lại được điểm nào.
 *
 * Trả về null ở mọi màn khác, để ô nút phụ còn dành cho "💡 Gợi ý" của màn
 * sandbox (hai thứ này không bao giờ cùng xuất hiện: màn sandbox không có chấm
 * phương án).
 */
export function secondaryCta(ctx: CtaContext): { label: string; action: Action } | null {
  const { scr, checked, verdict } = ctx;
  if (!scr || !checked || !verdict || verdict.correct) return null;
  if (!isChoiceScreen(scr.kind)) return null;
  // "Chọn lại", không "Chọn lại (không tính điểm)": nhãn nút phụ ở màn hẹp
  // không co được (`flex-shrink: 0`). Việc điểm đã chốt ở lần trả lời đầu được
  // nói ở màn tổng kết, chỗ con số đó hiện ra.
  return { label: 'Chọn lại', action: 'retry' };
}
