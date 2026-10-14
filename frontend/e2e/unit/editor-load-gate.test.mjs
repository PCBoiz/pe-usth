/**
 * Unit test cho cổng "coi là không nạp được trình soạn thảo": src/lib/editor-load-gate.ts.
 *
 * Vì sao phải có: audit ngày 14/10/2026 đo được /ide đứng mãi ở chữ "Loading…"
 * khi không tải được Monaco — `next/dynamic` không có nhánh lỗi, còn
 * `@monaco-editor/react` chỉ `console.error`. Hỏng hóc đó KHÔNG thấy được bằng
 * mắt trên máy người sửa (mạng tốt thì editor luôn lên), chỉ lộ ra ở phòng máy
 * USTH — nơi không sửa lại được nữa. Nên phải chốt bằng test.
 *
 * Bốn ca ở nhóm "ca bắt lỗi" cuối file là lý do bộ này tồn tại: bỏ phần sửa ra
 * (xem khối chú thích cuối file) thì chúng trượt.
 *
 * Chạy bằng `node --test` + `.mjs` vì cùng lý do đã ghi ở ide-handoff.test.mjs
 * (frontend cố ý không có runner test; Node tự bóc kiểu TypeScript).
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';

import { EDITOR_LOAD_TIMEOUT_MS, editorLoadPhase } from '../../src/lib/editor-load-gate.ts';

/** Trạng thái lúc trang vừa mở: chưa mount, chưa lỗi, chưa chờ được bao lâu. */
const fresh = { mounted: false, rejected: false, elapsedMs: 0 };

test('vừa mở trang thì còn đang tải, chưa kết luận gì', () => {
  assert.equal(editorLoadPhase(fresh), 'loading');
});

test('Monaco mount được thì sẵn sàng', () => {
  assert.equal(editorLoadPhase({ ...fresh, mounted: true, elapsedMs: 800 }), 'ready');
});

test('chờ chưa tới trần thì vẫn là đang tải', () => {
  // Mạng chậm thật: 11,9 s vẫn phải để nó chạy tiếp.
  assert.equal(editorLoadPhase({ ...fresh, elapsedMs: EDITOR_LOAD_TIMEOUT_MS - 100 }), 'loading');
});

test('chờ đúng tới trần là hỏng (so sánh >=, không phải >)', () => {
  // Bộ đếm setTimeout bắn đúng mốc; nếu dùng `>` thì cú bắn đó không kết luận
  // gì và trang lại đứng im — đúng lỗi đang sửa.
  assert.equal(editorLoadPhase({ ...fresh, elapsedMs: EDITOR_LOAD_TIMEOUT_MS }), 'failed');
});

test('chờ quá trần là hỏng', () => {
  assert.equal(editorLoadPhase({ ...fresh, elapsedMs: 60_000 }), 'failed');
});

test('loader.init() từ chối thì hỏng NGAY, không chờ hết trần', () => {
  // Chặn/404 nguồn Monaco: script bắn onerror trong vài trăm ms. Bắt người
  // trình bày đứng nhìn thêm 12 giây là vô nghĩa.
  assert.equal(editorLoadPhase({ ...fresh, rejected: true, elapsedMs: 300 }), 'failed');
});

test('đã mount rồi thì lời từ chối muộn KHÔNG giật editor khỏi tay người dùng', () => {
  // Với nối dây hiện tại hai cờ không cùng bật được (cùng một promise của
  // loader) — ca này ghim phần PHÒNG THỦ, xem chú thích trong editorLoadPhase().
  // Editor đã nằm trong DOM thì đừng che.
  assert.equal(editorLoadPhase({ mounted: true, rejected: true, elapsedMs: 300 }), 'ready');
});

test('đã mount rồi thì chờ quá trần cũng vẫn sẵn sàng', () => {
  assert.equal(editorLoadPhase({ mounted: true, rejected: false, elapsedMs: 99_999 }), 'ready');
});

test('trần riêng được tôn trọng', () => {
  assert.equal(editorLoadPhase({ ...fresh, elapsedMs: 2_000, timeoutMs: 1_000 }), 'failed');
  assert.equal(editorLoadPhase({ ...fresh, elapsedMs: 2_000, timeoutMs: 5_000 }), 'loading');
});

// --- ĐỒNG HỒ TƯỜNG KHÔNG TIN ĐƯỢC -----------------------------------------
// elapsedMs từng tính bằng Date.now() - mốc bắt đầu (nay IdeClient dùng
// performance.now()). Đồng hồ tường bị đồng bộ NTP/chỉnh giờ giữa lúc chờ là
// ra số âm; một phép tính hụt mốc ra NaN. Cả hai phải
// nghiêng về "còn chờ": kết luận oan nghĩa là che Monaco đang chạy tốt bằng
// <textarea> ngay giữa buổi demo.

test('đồng hồ chạy lùi (elapsed âm) thì KHÔNG kết luận hỏng', () => {
  assert.equal(editorLoadPhase({ ...fresh, elapsedMs: -5_000 }), 'loading');
});

test('elapsed là NaN thì KHÔNG kết luận hỏng', () => {
  assert.equal(editorLoadPhase({ ...fresh, elapsedMs: Number.NaN }), 'loading');
});

test('elapsed là Infinity thì KHÔNG kết luận hỏng', () => {
  // Infinity >= trần là true, nên nếu không chặn thì đây là "hỏng" — mà
  // Infinity chỉ nói đồng hồ sai, không nói gì về Monaco.
  assert.equal(editorLoadPhase({ ...fresh, elapsedMs: Number.POSITIVE_INFINITY }), 'loading');
});

test('trần rác (0, âm, NaN, Infinity) rơi về trần mặc định thay vì hỏng ngay', () => {
  // timeoutMs = 0 mà để nguyên thì `0 >= 0` đúng ngay lần render đầu: người
  // dùng thấy <textarea> trong khi Monaco đang nạp bình thường.
  for (const timeoutMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(editorLoadPhase({ ...fresh, elapsedMs: 0, timeoutMs }), 'loading');
    assert.equal(
      editorLoadPhase({ ...fresh, elapsedMs: EDITOR_LOAD_TIMEOUT_MS, timeoutMs }),
      'failed',
    );
  }
});

test('trần là 12 giây — đổi số thì phải đổi cả chú thích giải thích vì sao', () => {
  // Ghim con số vì nó là đánh đổi có số đo (xem chú thích trong gate), không
  // phải chi tiết cài đặt tự do đổi.
  assert.equal(EDITOR_LOAD_TIMEOUT_MS, 12_000);
});

/*
 * BẰNG CHỨNG BỘ CA NÀY BẮT ĐƯỢC LỖI THẬT — đã chạy thử, số đo ghi lại:
 *
 * 1. Gỡ HẲN cổng (trả 'loading' khi chưa mount, tức đúng hành vi của /ide
 *    TRƯỚC bản sửa — đứng im vĩnh viễn):
 *        if (signals.mounted) return 'ready';
 *        return 'loading';
 *    → 5 ca trượt: "chờ đúng tới trần", "chờ quá trần", "loader.init() từ
 *      chối", "trần riêng được tôn trọng", "trần rác … thay vì hỏng ngay".
 *
 * 2. Đổi `>=` thành `>` (lỗi lệch một đơn vị đúng ở mốc setTimeout bắn):
 *    → 2 ca trượt: "chờ đúng tới trần là hỏng", "trần rác … thay vì hỏng ngay".
 *
 * 3. Bỏ hai lớp chặn số rác (`Number.isFinite`):
 *    → 2 ca trượt: "elapsed là Infinity", "trần rác … thay vì hỏng ngay".
 *
 * 4. Bỏ dòng `if (signals.mounted) return 'ready'` đứng TRƯỚC `rejected`:
 *    → 1 ca trượt: "đã mount rồi thì lời từ chối muộn KHÔNG giật editor".
 */
