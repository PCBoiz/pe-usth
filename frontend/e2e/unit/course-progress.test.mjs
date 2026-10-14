/**
 * Unit test cho "Tiếp tục ở bài X" + đánh dấu bài đã xong: src/lib/course-progress.ts.
 *
 * Vì sao phải có, và vì sao không kiểm được bằng mắt:
 *
 *  1. CỔNG GỌI API. Trang /courses/:id là trang CÔNG KHAI. `apiFetch` gặp 401
 *     sẽ thử refresh rồi RƠI XUỐNG `ensureGuest()` (src/lib/api.ts) — nên nếu
 *     trang khoá gọi API vô điều kiện thì mọi khách vãng lai và mọi con bot mở
 *     trang đều sinh một tài khoản khách trong bảng `users` và ăn một suất của
 *     THROTTLE_GUEST_LIMIT (mặc định 120 lượt/giờ/IP): cả phòng máy chung một
 *     NAT bị 429 đúng lúc có người cần tài khoản thật. Mở trang bằng mắt thì
 *     KHÔNG thấy gì cả — người xem thường đã có phiên, và tài khoản khách sinh
 *     ra im lặng ở phía server. Nên phải đếm số lời gọi bằng test.
 *
 *  2. CHỌN BÀI GỢI Ý. Tiến độ rời rạc (người học nhảy xuống bài 20 trước) chỉ
 *     xảy ra với tài khoản đã học một lúc, không dựng lại được bằng cách mở
 *     trang; mà đúng ca đó mới phân biệt được hai luật "bài trống đầu tiên" và
 *     "bài lớn nhất + 1". Chọn sai luật thì 18 bài trống ở giữa không bao giờ
 *     được nhắc lại.
 *
 *  3. CỜ PHIÊN. `pe_access` (không có hạn) phải đủ để nhận ra phiên, kể cả khi
 *     cookie `pe_has_session` đã hết 8 giờ — nếu không thì người quay lại sau
 *     2 ngày lại thấy "Bắt đầu học", đúng cái lỗ tính năng này sinh ra để lấp.
 *     Chờ 8 giờ để thử bằng tay là không khả thi.
 *
 * Chạy bằng `node --test` + `.mjs` vì cùng lý do đã ghi ở feedback-link.test.mjs
 * (frontend cố ý không có runner test; Node tự bóc kiểu TypeScript). Chính vì
 * runner đó không phân giải alias '@/…' mà hàm phải nằm ở file riêng không
 * import gì.
 *
 * Bằng chứng bộ ca này bắt được lỗi thật — xem khối chú thích cuối file.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  completedLessonSet,
  hasStoredSession,
  loadCompletedLessons,
  planResume,
  resumeButtonLabel,
  resumeReason,
} from '../../src/lib/course-progress.ts';

const TOTAL = 48; // giáo trình Advanced Python đang chạy (pe-v4)
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// ───────────────────────── 1. Chọn "bài tiếp theo" ─────────────────────────

test('chưa xong bài nào: giữ NGUYÊN chữ "Bắt đầu học", mở bài 1', () => {
  for (const raw of [[], null, undefined]) {
    const plan = planResume(raw, TOTAL);
    assert.equal(plan.kind, 'start');
    assert.equal(plan.index, 0, '?lesson=0 → sort_order 1');
    assert.equal(plan.lessonNo, 1);
    assert.equal(plan.completedCount, 0);
    // Người chưa học không được thấy chữ "Tiếp tục" — họ chưa có gì để tiếp.
    assert.equal(resumeButtonLabel(plan), 'Bắt đầu học');
  }
});

test('tiến độ liền mạch: gợi ý bài kế tiếp', () => {
  const plan = planResume(range(1, 7), TOTAL);
  assert.equal(plan.kind, 'continue');
  assert.equal(plan.lessonNo, 8);
  assert.equal(plan.index, 7);
  assert.equal(plan.completedCount, 7);
  assert.equal(resumeButtonLabel(plan), 'Tiếp tục ở bài 8');
});

test('xong đúng bài 1: gợi ý bài 2 (không phải bài 1 lần nữa)', () => {
  // Ca biên hay sai nhất: vòng tìm bắt đầu từ 0 thay vì 1 sẽ mời lại bài 1.
  const plan = planResume([1], TOTAL);
  assert.equal(plan.lessonNo, 2);
  assert.equal(plan.index, 1);
});

test('tiến độ RỜI RẠC: gợi ý bài trống ĐẦU TIÊN, không phải bài lớn nhất + 1', () => {
  // Người học nhảy xuống bài 20 trước (mọi bài đều bấm vào được). Nếu lấy
  // max+1 thì hệ thống mời sang bài 21 và 17 bài trống ở giữa biến mất khỏi
  // mọi lời nhắc.
  const plan = planResume([1, 2, 20], TOTAL);
  assert.equal(plan.kind, 'continue');
  assert.equal(plan.lessonNo, 3, 'bài trống đầu tiên là 3');
  assert.equal(plan.index, 2);
  assert.equal(plan.completedCount, 3);
  // Câu "Vì sao bài này" phải nói thẳng là tiến độ không liền mạch, nếu không
  // người học tưởng trang đếm sai và mất tin vào mọi con số còn lại.
  assert.match(resumeReason(plan), /không liền mạch/);
});

test('rời rạc ngay từ đầu: chưa xong bài 1 thì gợi ý vẫn là bài 1', () => {
  const plan = planResume([5, 6], TOTAL);
  assert.equal(plan.kind, 'continue');
  assert.equal(plan.lessonNo, 1);
  assert.equal(plan.index, 0);
  // Nhưng nhãn KHÔNG còn là "Bắt đầu học": người này đã có tiến độ.
  assert.equal(resumeButtonLabel(plan), 'Tiếp tục ở bài 1');
});

test('xong hết 48 bài: không trả chỉ số vượt khỏi khoá', () => {
  const plan = planResume(range(1, TOTAL), TOTAL);
  assert.equal(plan.kind, 'done');
  assert.equal(plan.completedCount, TOTAL);
  // ?lesson=48 sẽ mở sort_order 49 — một bài KHÔNG TỒN TẠI; phải là 47.
  assert.equal(plan.index, TOTAL - 1);
  assert.equal(plan.lessonNo, TOTAL);
  assert.equal(resumeButtonLabel(plan), 'Xem lại bài 48');
  assert.match(resumeReason(plan), /xong cả 48 bài/);
});

test('thứ tự đến từ API không ảnh hưởng kết quả', () => {
  // `/enrolled` trả `completedLessonNumbers` theo thứ tự Postgres chọn, không
  // sắp xếp; dựa vào thứ tự là lỗi chờ xảy ra.
  assert.equal(planResume([3, 1, 2], TOTAL).lessonNo, 4);
  assert.equal(planResume([20, 2, 1], TOTAL).lessonNo, 3);
});

// ───────────────────── 2. Lọc dữ liệu từ DB dùng chung ─────────────────────

test('số rác từ DB cũ bị loại, không làm bộ đếm vượt tổng số bài', () => {
  // DB dùng chung với bản Django cũ: tiến độ của bài đã gỡ khỏi giáo trình vẫn
  // còn hàng. Lọt vào thì in ra "đã xong 51/48" và planResume tưởng xong hết.
  const set = completedLessonSet([1, 2, 2, 0, -3, 99, null, 'x', 4.5, '3'], TOTAL);
  assert.deepEqual([...set].sort((a, b) => a - b), [1, 2, 3]);
  const plan = planResume([1, 2, 99, 99], TOTAL);
  assert.equal(plan.completedCount, 2);
  assert.ok(plan.completedCount <= TOTAL);
  assert.equal(plan.lessonNo, 3);
});

test('dữ liệu không phải mảng / tổng số bài vô nghĩa đều không làm nổ', () => {
  assert.equal(completedLessonSet('nope', TOTAL).size, 0);
  assert.equal(completedLessonSet([1, 2], 0).size, 0);
  const plan = planResume([1, 2], 0);
  assert.equal(plan.kind, 'start');
  assert.equal(plan.index, 0);
});

// ──────────────── 3. Cổng gọi API: KHÔNG tạo tài khoản khách ────────────────

test('CHƯA CÓ PHIÊN: không gọi API lần nào', async () => {
  let calls = 0;
  const got = await loadCompletedLessons({
    session: { access: null, legacyRefresh: null, cookie: '' },
    fetchCompleted: async () => {
      calls += 1;
      return [1, 2, 3];
    },
  });
  // Đây là ca chặn "mọi bot mở trang khoá sinh một tài khoản khách".
  assert.equal(calls, 0, 'khách vãng lai/bot KHÔNG được sinh ra lời gọi nào');
  assert.equal(got, null, 'chưa biết tiến độ → trang hiện y như bản tĩnh');
  // Và trang phải quay về đúng chữ cũ.
  assert.equal(resumeButtonLabel(planResume(got, TOTAL)), 'Bắt đầu học');
});

test('cookie rác / cờ phiên đã bị xoá cũng là CHƯA CÓ PHIÊN', async () => {
  let calls = 0;
  const bump = async () => {
    calls += 1;
    return [1];
  };
  const noSessions = [
    { access: '', legacyRefresh: '', cookie: 'theme=dark' },
    { access: '   ', legacyRefresh: null, cookie: 'pe_has_session=' },
    // api.ts xoá cờ bằng `pe_has_session=; max-age=0`; khớp chuỗi lỏng tay
    // (chỉ tìm 'pe_has_session') sẽ nhận nhầm đây là có phiên.
    { cookie: 'pe_has_session=; other=1' },
    {},
  ];
  for (const session of noSessions) {
    assert.equal(hasStoredSession(session), false, JSON.stringify(session));
    assert.equal(await loadCompletedLessons({ session, fetchCompleted: bump }), null);
  }
  assert.equal(calls, 0);
});

test('CÓ pe_access thì nhận ra phiên dù cookie cờ 8 giờ đã hết', async () => {
  // Cốt lõi của quyết định chọn cờ: cookie `pe_has_session` đặt max-age=28800
  // (8 giờ) nên người quay lại sau 2 ngày không còn cookie, nhưng `pe_access`
  // trong localStorage KHÔNG CÓ HẠN (chỉ bị xoá khi /auth/refresh trả 401/403).
  // Nếu chỉ nhìn cookie thì đúng người cần "Tiếp tục ở bài X" nhất lại thấy
  // "Bắt đầu học".
  const session = { access: 'jwt.cu.hai.ngay', legacyRefresh: null, cookie: 'theme=dark' };
  assert.equal(hasStoredSession(session), true);

  let calls = 0;
  const got = await loadCompletedLessons({
    session,
    fetchCompleted: async () => {
      calls += 1;
      return range(1, 7);
    },
  });
  assert.equal(calls, 1);
  assert.equal(resumeButtonLabel(planResume(got, TOTAL)), 'Tiếp tục ở bài 8');
});

test('chế độ riêng tư: không ghi được localStorage nhưng cookie cờ còn', async () => {
  // api.ts bắt lỗi setItem rồi đi tiếp, nên pe_access không bao giờ được ghi.
  // Cookie là cờ phụ đúng cho ca này.
  assert.equal(hasStoredSession({ access: null, cookie: 'a=1; pe_has_session=1; b=2' }), true);
  assert.equal(hasStoredSession({ legacyRefresh: 'refresh-cu', cookie: '' }), true);
});

test('API lỗi hoặc phiên đã chết: trả "chưa biết", không ném lỗi ra trang', async () => {
  const session = { access: 'jwt', cookie: '' };
  // fetchCompleted trả null khi res 401/5xx.
  assert.equal(await loadCompletedLessons({ session, fetchCompleted: async () => null }), null);
  // Mất mạng → fetch reject. Để lọt ra ngoài là unhandled rejection trong
  // useEffect, trang khoá vẫn render nhưng console đầy lỗi ở buổi thử nghiệm.
  assert.equal(
    await loadCompletedLessons({
      session,
      fetchCompleted: async () => {
        throw new Error('Failed to fetch');
      },
    }),
    null,
  );
});

/**
 * ─── Bằng chứng bộ ca này bắt được lỗi thật ───
 * Gỡ từng phần của bản sửa ra thì số ca TRƯỢT:
 *
 *  - Bỏ cổng phiên (gọi API vô điều kiện, tức `if (!hasStoredSession…) return null;`
 *    trong loadCompletedLessons): 2 ca trượt —
 *    "CHƯA CÓ PHIÊN: không gọi API lần nào", "cookie rác / cờ phiên đã bị xoá…".
 *  - Chỉ nhìn cookie `pe_has_session` làm cờ (bỏ nhánh `pe_access`/`pe_refresh`):
 *    2 ca trượt — "CÓ pe_access thì nhận ra phiên dù cookie cờ 8 giờ đã hết",
 *    "chế độ riêng tư: không ghi được localStorage nhưng cookie cờ còn".
 *  - Đổi luật chọn bài sang "bài lớn nhất đã xong + 1": 3 ca trượt —
 *    "tiến độ RỜI RẠC…", "rời rạc ngay từ đầu…", "thứ tự đến từ API…".
 *  - Bỏ nhánh 'done' (trả index = total): 1 ca trượt — "xong hết 48 bài…".
 *  - Bỏ lọc trong completedLessonSet: 1 ca trượt — "số rác từ DB cũ bị loại…".
 *  - Bỏ try/catch trong loadCompletedLessons: 1 ca trượt — "API lỗi hoặc phiên
 *    đã chết…".
 */
