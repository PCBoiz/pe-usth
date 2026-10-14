/**
 * Danh sách ĐÓNG các loại màn (`LessonScreen.kind`) và các loại mini-game
 * (`PlayGame.type`) của Python Studio — nguồn sự thật cho lưới an toàn.
 *
 * VÌ SAO CÓ FILE NÀY — lỗi màn trắng không log ở đâu cả:
 * server không ràng buộc giá trị nào cả (`src/course-admin/studio-lesson.schema.ts`
 * khai `source.kind?: string`, còn loại màn thì không khai gì), nên một giá trị
 * viết sai chính tả — ví dụ `"spoterror"` thay `"spotError"` — đi qua
 * `validateStudioLesson()` sạch sẽ. Tới frontend, nó rơi vào nhánh `default` của
 * bộ phân tuyến màn (`components/python-studio/screens/index.tsx`), mà nhánh đó
 * trả `null`: người học thấy MÀN TRẮNG, không ngoại lệ, không cảnh báo, không
 * log. Cùng kiểu lỗi ở `screens/GameScreen.tsx`: switch ở đó không có nhánh
 * default nào, component trả `undefined` — cũng là màn trắng.
 *
 * ĐÂY LÀ LƯỚI AN TOÀN, CỐ Ý KHÔNG GỘP. `kind` đang khai ở ba nơi
 * (`lib/studio-lesson.ts` union `ScreenKind` + `isGraded` + `screenVerdict`,
 * `screens/index.tsx`, `screens/GameScreen.tsx`). Gộp chúng là việc lớn, rủi ro
 * cao và không bắt thêm lỗi nào. Thay vào đó:
 *   1. file này giữ danh sách,
 *   2. `SCREEN_KINDS_EXACT` / `GAME_KINDS_EXACT` dưới đây làm `npm run typecheck`
 *      đỏ ngay nếu danh sách lệch union trong `studio-lesson.ts`,
 *   3. `e2e/unit/screen-kinds.test.mjs` đối chiếu danh sách với 48 bài THẬT và
 *      với hai switch kia,
 *   4. hai nhánh `default` nay kêu lên thay vì im lặng.
 *
 * Giữ file THUẦN (không JSX, không import runtime) để `node --test` nạp trực
 * tiếp được và để không ai bị kéo thêm phụ thuộc khi chỉ cần danh sách.
 */
import type { PlayGame, ScreenKind } from './studio-lesson';

/** Mọi loại màn mà `buildScreens()` có thể sinh ra. Thứ tự theo luồng bài. */
export const SCREEN_KINDS = [
  'brief',
  'theory',
  'context',
  'explain',
  'memory',
  'misconception',
  'predict',
  'mcq',
  'classify',
  'selfExplain',
  'scaffold',
  'trace',
  'counter',
  'sandbox',
  'recap',
  'game',
] as const;

/** Mọi loại mini-game của studio-lesson/v2 (`play.games[].type`). */
export const GAME_KINDS = [
  'traceTable',
  'match',
  'trueFalse',
  'fill',
  'parsons',
  'spotError',
  'debug',
  'selfExplain',
] as const;

export type ScreenKindName = (typeof SCREEN_KINDS)[number];
export type GameKindName = (typeof GAME_KINDS)[number];

/**
 * Lưới kiểu, hai chiều: thiếu HOẶC thừa một giá trị so với union trong
 * `studio-lesson.ts` thì `true` không gán được vào `false` → typecheck đỏ.
 * Rẻ hơn nhiều so với để người học phát hiện bằng một màn trắng.
 */
export type ScreenKindsAreExact = [
  Exclude<ScreenKind, ScreenKindName>,
  Exclude<ScreenKindName, ScreenKind>,
] extends [never, never]
  ? true
  : false;
export const SCREEN_KINDS_EXACT: ScreenKindsAreExact = true;

export type GameKindsAreExact = [
  Exclude<PlayGame['type'], GameKindName>,
  Exclude<GameKindName, PlayGame['type']>,
] extends [never, never]
  ? true
  : false;
export const GAME_KINDS_EXACT: GameKindsAreExact = true;

export function isScreenKind(value: unknown): value is ScreenKindName {
  return (SCREEN_KINDS as readonly unknown[]).includes(value);
}

export function isGameKind(value: unknown): value is GameKindName {
  return (GAME_KINDS as readonly unknown[]).includes(value);
}

/**
 * Câu log cho nhánh `default`. Tách ra khỏi component để test khẳng định được
 * là nó CÓ nêu giá trị nhận được và bài nào — thiếu một trong hai thì người
 * nhận báo lỗi vẫn phải đi mò, đúng cảnh trước khi có bản sửa này.
 */
export function canhBaoManLa(
  what: 'màn' | 'mini-game',
  kind: unknown,
  lesson?: string,
): string {
  const danhSach = what === 'màn' ? SCREEN_KINDS : GAME_KINDS;
  return (
    `[python-studio] Loại ${what} không nhận ra: ${JSON.stringify(kind)}` +
    ` — bài ${lesson && lesson.trim() ? lesson : '(không rõ tên)'}.` +
    ` Nội dung bài sai giá trị, không phải lỗi của người học.` +
    ` Giá trị hợp lệ: ${danhSach.join(', ')}.`
  );
}
