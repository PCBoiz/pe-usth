/**
 * course-progress.ts — quyết định "người này đang học tới đâu" cho trang khoá.
 *
 * Vì sao tách ra file riêng, không import gì theo alias '@/…': bộ test chạy
 * bằng `node --test` thuần (script `test:unit` trong package.json) và runner đó
 * không phân giải alias — cùng lý do đã ghi ở src/lib/feedback-link.ts.
 *
 * Vì sao phải có logic riêng chứ không chỉ đọc số: trang khoá là trang CÔNG
 * KHAI. Hai quyết định ở đây đều đã từng là lỗ hổng thật nếu làm sai, nên tách
 * thành hàm thuần để chốt bằng test thay vì tin vào mắt khi xem trang:
 *
 *  1. CÓ ĐƯỢC GỌI API HAY KHÔNG (hasStoredSession). `apiFetch` gặp 401 sẽ thử
 *     refresh rồi RƠI XUỐNG `ensureGuest()` (api.ts) — tức mọi khách vãng lai
 *     và mọi con bot mở /courses/python_advanced đều tạo một tài khoản khách:
 *     bảng `users` phình, và ăn hết quota THROTTLE_GUEST_LIMIT (mặc định 120
 *     lượt/giờ/IP) nên cả phòng máy chung NAT bị 429 đúng lúc cần tài khoản
 *     thật. Nên trang khoá chỉ được gọi API khi ĐÃ CÓ phiên trong máy, và phải
 *     gọi qua đường chỉ-refresh (apiFetchSessionOnly).
 *
 *  2. GỢI Ý BÀI NÀO (planResume). Chỉ đề xuất, không khoá: mọi bài vẫn bấm vào
 *     được, nên hàm này không bao giờ trả "không được học bài X".
 */

/** Khoá localStorage chứa access token — cùng khoá với api.ts và pe-bridge.js. */
export const LS_ACCESS = 'pe_access';
/** Khoá refresh token kiểu cũ; api.ts vẫn đọc nó một lần để chuyển phiên sang cookie. */
export const LS_LEGACY_REFRESH = 'pe_refresh';

/**
 * Trong máy này đã có phiên học chưa?
 *
 * Hàm thuần, nhận nguyên liệu từ ngoài để test được: `access` là
 * localStorage['pe_access'], `legacyRefresh` là localStorage['pe_refresh'],
 * `cookie` là document.cookie.
 *
 * VÌ SAO LẤY `pe_access` LÀM CỜ CHÍNH, KHÔNG LẤY COOKIE `pe_has_session`:
 * cookie đó được đặt với `max-age=28800` (8 giờ, xem api.ts) trong khi cookie
 * refresh của khách sống lâu hơn nhiều. Nếu dựa vào cookie cờ thì người quay
 * lại SAU 2 NGÀY bị coi là chưa có phiên và lại thấy "Bắt đầu học" — đúng cái
 * lỗ "không biết mình học tới đâu" mà tính năng này sinh ra để lấp. Còn
 * `pe_access` trong localStorage KHÔNG CÓ HẠN: nó chỉ bị xoá khi
 * `/auth/refresh` trả 401/403 (api.ts), tức khi phiên thật sự đã chết. Chọn
 * cách này thay vì nâng max-age của cookie để không phải sửa cả ba chỗ đang
 * ghi cờ (api.ts hai chỗ, pe-bridge.js một chỗ) — token hết hạn cũng không sao
 * vì đường chỉ-refresh tự đổi token mới.
 *
 * Vẫn chấp nhận cookie và `pe_refresh` làm cờ phụ: ở chế độ riêng tư
 * `localStorage.setItem` ném lỗi và api.ts bỏ qua, nên `pe_access` không bao
 * giờ được ghi dù người đó đang có phiên thật. Ba điều kiện OR này cố ý khớp
 * đúng `maybeLoggedIn` của api.ts: nếu ở đây nói "có phiên" thì refresh bên
 * trong api.ts cũng sẽ thật sự thử, và ngược lại.
 */
export function hasStoredSession(input: {
  access?: string | null;
  legacyRefresh?: string | null;
  cookie?: string | null;
}): boolean {
  const nonEmpty = (v: unknown) => typeof v === 'string' && v.trim() !== '';
  if (nonEmpty(input.access) || nonEmpty(input.legacyRefresh)) return true;
  return typeof input.cookie === 'string' && input.cookie.includes('pe_has_session=1');
}

/**
 * Cổng "có được gọi API hay không" của trang khoá.
 *
 * Vì sao cái cổng này là một hàm riêng, nhận `fetchCompleted` từ ngoài thay vì
 * tự gọi: đây là chỗ duy nhất quyết định trang CÔNG KHAI có đập vào backend
 * hay không, và nếu quyết định sai thì hậu quả (mỗi con bot một tài khoản
 * khách, hết quota 120 lượt/giờ/IP) chỉ lộ ra trên production. Tiêm lời gọi
 * vào làm nó đếm được bằng test: chưa có phiên thì `fetchCompleted` phải được
 * gọi ĐÚNG 0 LẦN.
 *
 * Chưa có phiên → trả null và KHÔNG gọi gì. Lỗi mạng / phiên đã chết → cũng
 * trả null, tức "chưa biết tiến độ", và trang hiện y như bản tĩnh.
 */
export async function loadCompletedLessons(input: {
  session: { access?: string | null; legacyRefresh?: string | null; cookie?: string | null };
  /** Phải đi đường chỉ-refresh (apiFetchSessionOnly) — không bao giờ tạo khách. */
  fetchCompleted: () => Promise<number[] | null>;
}): Promise<number[] | null> {
  if (!hasStoredSession(input.session)) return null;
  try {
    return await input.fetchCompleted();
  } catch {
    return null;
  }
}

/**
 * Lọc danh sách bài đã xong về tập số bài (1-based, khớp `lessons.sort_order`).
 *
 * Phải lọc chứ không dùng thẳng mảng từ API: `/enrolled` trả
 * `completedLessonNumbers` lấy từ DB dùng chung với bản Django cũ, nên có thể
 * lẫn số ngoài khoảng (bài đã gỡ khỏi giáo trình nhưng tiến độ còn), số trùng,
 * hoặc null. Số rác lọt vào sẽ làm bộ đếm "đã xong n/48" vượt 48 và làm
 * planResume tưởng đã học hết.
 */
export function completedLessonSet(raw: unknown, total: number): Set<number> {
  const out = new Set<number>();
  if (!Array.isArray(raw) || !Number.isInteger(total) || total <= 0) return out;
  for (const item of raw) {
    const n = typeof item === 'number' ? item : Number(item);
    if (Number.isInteger(n) && n >= 1 && n <= total) out.add(n);
  }
  return out;
}

export type ResumePlan = {
  /**
   * 'start'    — chưa xong bài nào: trang giữ nguyên chữ "Bắt đầu học".
   * 'continue' — đang học dở: đổi thành "Tiếp tục ở bài X".
   * 'done'     — đã xong cả khoá: mời xem lại, không mời bài mới.
   */
  kind: 'start' | 'continue' | 'done';
  /** Chỉ số 0-based để ghép vào `?lesson=` (xem lesson/python_advanced/page.tsx). */
  index: number;
  /** Số bài 1-based, khớp `sort_order` — dùng cho câu chữ "bài X". */
  lessonNo: number;
  /** Đã xong bao nhiêu bài (sau khi lọc), để in "đã xong n/total". */
  completedCount: number;
  total: number;
};

/**
 * Chọn bài để GỢI Ý tiếp.
 *
 * Luật: bài CHƯA XONG NHỎ NHẤT trong 1..total — không phải "bài lớn nhất đã
 * xong + 1". Vì sao: mọi bài đều bấm vào được (chỉ đề xuất, không khoá), nên
 * người học hoàn toàn có thể nhảy xuống bài 20 trước. Nếu lấy max+1 thì hệ
 * thống sẽ mời họ sang bài 21 và 18 bài còn trống ở giữa sẽ không bao giờ được
 * nhắc lại — tiến độ rời rạc im lặng trở thành tiến độ bị bỏ quên. Lấy bài
 * trống đầu tiên thì thứ tự giáo trình được giữ, mà người học vẫn có lối ra
 * "Tự chọn bài".
 *
 * Xong hết thì KHÔNG trả chỉ số vượt khỏi khoá (total, tức bài 49 không tồn
 * tại — link `?lesson=48` sẽ mở ra một bài trống). Trả kind 'done' kèm bài
 * cuối để trang mời xem lại.
 */
export function planResume(rawCompleted: unknown, total: number): ResumePlan {
  const safeTotal = Number.isInteger(total) && total > 0 ? total : 0;
  const done = completedLessonSet(rawCompleted, safeTotal);
  const completedCount = done.size;

  if (completedCount === 0) {
    return { kind: 'start', index: 0, lessonNo: 1, completedCount: 0, total: safeTotal };
  }

  for (let n = 1; n <= safeTotal; n += 1) {
    if (!done.has(n)) {
      return { kind: 'continue', index: n - 1, lessonNo: n, completedCount, total: safeTotal };
    }
  }

  return {
    kind: 'done',
    index: safeTotal - 1,
    lessonNo: safeTotal,
    completedCount,
    total: safeTotal,
  };
}

/** Nhãn nút chính. Chưa có tiến độ thì giữ NGUYÊN chữ cũ ("Bắt đầu học"). */
export function resumeButtonLabel(plan: ResumePlan): string {
  if (plan.kind === 'continue') return `Tiếp tục ở bài ${plan.lessonNo}`;
  if (plan.kind === 'done') return `Xem lại bài ${plan.lessonNo}`;
  return 'Bắt đầu học';
}

/**
 * Câu "Vì sao bài này" của thẻ gợi ý (xem bản thiết kế Main.dc.html).
 *
 * Nói rõ lý do chọn chứ không chỉ ra lệnh: thẻ này là GỢI Ý, nên người học phải
 * đọc được căn cứ để tự quyết định có theo hay không. Ca tiến độ rời rạc được
 * nói thẳng ("bài trống đầu tiên"), nếu không người từng nhảy bài sẽ tưởng hệ
 * thống đếm sai và mất tin vào mọi con số còn lại trên trang.
 */
export function resumeReason(plan: ResumePlan): string {
  const { completedCount, total, lessonNo } = plan;
  if (plan.kind === 'done') {
    return `Bạn đã xong cả ${total} bài. Không còn bài mới, nhưng xem lại bài cũ sau vài ngày là cách nhớ lâu nhất.`;
  }
  if (plan.kind === 'start') {
    return `Khoá có ${total} bài, đi từ đầu là vừa. Bài nào cũng mở được, không cần xong bài trước.`;
  }
  // Rời rạc: số bài đã xong không bằng (số bài gợi ý − 1).
  if (completedCount !== lessonNo - 1) {
    return `Bạn đã xong ${completedCount}/${total} bài nhưng không liền mạch — bài ${lessonNo} là bài còn trống đầu tiên theo thứ tự giáo trình.`;
  }
  return `Bạn đã xong ${completedCount}/${total} bài; bài ${lessonNo} là bài kế tiếp theo thứ tự giáo trình.`;
}
