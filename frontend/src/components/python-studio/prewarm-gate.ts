// Tách riêng khỏi useCodeRunner.ts để test chạy được bằng `node --test`:
// file hook import theo alias '@/…' mà runner node thuần không phân giải
// được, còn file này không import gì cả.

/** Chỉ cần đúng phần quyết định: bài có phần chấm (step_4) hay không. */
type PrewarmLesson = { step_4?: unknown };

/**
 * Có nên nạp sẵn runtime cho màn bài học này chưa?
 *
 * Vì sao là hàm riêng chứ không viết thẳng vào chỗ gọi: chỗ gọi cũ ghi
 * `enabled: Boolean(lesson?.step_4)` — mà `lesson` chỉ có SAU khi cả chuỗi gọi
 * API xong (user → enrolled → [enroll] → content). Nên 13 MB Pyodide chỉ bắt
 * đầu tải khi API đã trả về: hai lần chờ NỐI TIẾP nhau thay vì chồng lên nhau.
 * Đo ngày 13/10/2026: chuỗi API 1,0 s (học viên quay lại) đến 3,0 s (lần đầu,
 * phải tạo tài khoản khách + ghi danh), prewarm 2,7 s — mất không 1,0–1,5 s mỗi
 * lần mở bài, nhân 20 bài là ~25 s chờ suông mỗi buổi.
 *
 * Trả true khi CHƯA có nội dung (`lesson === null`) chính là mở nhánh mà
 * `PyodideRunner.prewarm()` đã viết sẵn cho đúng tình huống này — chú thích ở
 * đó ghi "Nội dung bài về SAU khi runtime đã nạp sẵn (thường gặp)" — nhưng
 * trước bản sửa này không bao giờ chạy tới: effect bên dưới khoá theo
 * `packageKey`, nên khi nội dung về mang theo numpy/pandas thì prewarm được gọi
 * lần hai để tải thêm thư viện vào worker đang rỗi.
 */
export function shouldPrewarm(lesson: PrewarmLesson | null): boolean {
  return lesson === null || Boolean(lesson.step_4);
}
