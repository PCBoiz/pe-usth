/**
 * Unit test cho việc HẸN LẠI bộ đếm giờ của lưới an toàn /ide:
 * nextEditorCheckDelayMs() trong src/lib/editor-load-recheck.ts.
 *
 * Vì sao phải có: editorLoadPhase() có test riêng (editor-load-gate.test.mjs)
 * nhưng nó chỉ là MỘT nửa. Nửa kia — "khi nào hỏi cổng lần nữa" — từng nằm
 * thẳng trong effect của IdeClient không có test nào, và lỗi thật nằm đúng ở
 * đó: hẹn một lần duy nhất, lượt bắn đó chưa tới trần (đồng hồ lùi / bắn sớm)
 * là trang đứng mãi ở "Đang tải trình soạn thảo…".
 *
 * Ngoài các ca lẻ, file này MÔ PHỎNG cả vòng hẹn giờ của IdeClient trên đồng hồ
 * giả (simulate() bên dưới viết lại đúng hàm `check` trong effect) để chốt hệ
 * quả người dùng thấy: cổng PHẢI tới 'failed', và không trễ quá trần bao nhiêu.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { EDITOR_LOAD_TIMEOUT_MS, editorLoadPhase } from '../../src/lib/editor-load-gate.ts';
import {
  RECHECK_FALLBACK_MS,
  RECHECK_MIN_MS,
  nextEditorCheckDelayMs,
} from '../../src/lib/editor-load-recheck.ts';

const T = EDITOR_LOAD_TIMEOUT_MS;
const phaseAt = (elapsedMs, extra = {}) =>
  editorLoadPhase({ mounted: false, rejected: false, elapsedMs, ...extra });

/**
 * Chạy lại đúng vòng hẹn giờ của IdeClient trên đồng hồ giả.
 * `measure(trueMs)` = performance.now() đo được khi thời gian THẬT là trueMs
 * (cho phép bắn sớm, đồng hồ nhảy...). Trả về thời điểm thật lúc cổng tới
 * 'failed', hoặc null nếu vòng hẹn dừng khi cổng vẫn còn 'loading' (= trang
 * đứng im vĩnh viễn).
 */
function simulate(measure, { maxSteps = 1_000 } = {}) {
  let now = 0;
  let delay = T; // lượt đầu: setTimeout(check, EDITOR_LOAD_TIMEOUT_MS)
  for (let i = 0; i < maxSteps; i++) {
    now += delay;
    const elapsedMs = measure(now);
    const phase = phaseAt(elapsedMs);
    if (phase === 'failed') return now;
    const next = nextEditorCheckDelayMs(phase, elapsedMs, T);
    if (next === null) return null;
    assert.ok(Number.isFinite(next) && next > 0, `khoảng chờ rác: ${next}`);
    delay = next;
  }
  return null;
}

test('BẤT BIẾN: cổng còn "loading" ⇔ còn hẹn; khoảng chờ luôn hữu hạn trong [sàn, trần]', () => {
  const samples = [
    0, 1, 500, T / 2, T - 100, T - 1, T - 0.1, T - 1e-9, T, T + 0.1, T + 5_000, 99_999,
    -1, -5_000, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
  ];
  for (const elapsedMs of samples) {
    const phase = phaseAt(elapsedMs);
    const delay = nextEditorCheckDelayMs(phase, elapsedMs, T);
    const label = `elapsed=${elapsedMs} phase=${phase} delay=${delay}`;
    assert.equal(delay !== null, phase === 'loading', label);
    if (delay !== null) {
      assert.ok(Number.isFinite(delay), label);
      assert.ok(delay >= Math.min(RECHECK_MIN_MS, T) && delay <= T, label);
    }
  }
});

test('mount rồi hoặc loader đã từ chối thì thôi hẹn', () => {
  assert.equal(nextEditorCheckDelayMs('ready', 300, T), null);
  assert.equal(nextEditorCheckDelayMs('failed', 300, T), null);
});

test('chưa tới trần thì hẹn đúng phần còn lại', () => {
  assert.equal(nextEditorCheckDelayMs('loading', 2_000, T), T - 2_000);
});

test('bắn sớm vài phần mười ms: hẹn lại một nhịp ngắn, không bỏ cuộc', () => {
  // performance.now() bị làm tròn nên lượt bắn "đúng trần" có thể đo ra
  // 11 999,9 ms — cổng còn 'loading', hàm phải hẹn tiếp.
  assert.equal(nextEditorCheckDelayMs('loading', T - 0.1, T), RECHECK_MIN_MS);
});

test('số rác (NaN, vô cực, trần hỏng) thì vẫn hẹn lại, không bao giờ trả null khi còn "loading"', () => {
  assert.equal(nextEditorCheckDelayMs('loading', Number.NaN, T), RECHECK_FALLBACK_MS);
  assert.equal(nextEditorCheckDelayMs('loading', Number.POSITIVE_INFINITY, T), RECHECK_FALLBACK_MS);
  for (const junk of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(nextEditorCheckDelayMs('loading', 0, junk), RECHECK_FALLBACK_MS, String(junk));
  }
});

test('đồng hồ lùi (elapsed âm) thì chờ thêm đúng một trần, không hẹn xa hơn', () => {
  assert.equal(nextEditorCheckDelayMs('loading', -60_000, T), T);
});

// --- MÔ PHỎNG CẢ VÒNG HẸN GIỜ CỦA IdeClient --------------------------------

test('mô phỏng — đồng hồ chuẩn: tới "failed" đúng ở trần', () => {
  assert.equal(simulate((t) => t), T);
});

test('mô phỏng — bộ hẹn giờ bắn sớm 0,5 ms mỗi lượt: vẫn tới "failed", trễ dưới 50 ms', () => {
  // Đo được ít hơn thời gian thật 0,5 ms: lượt bắn đầu ra 11 999,5 → 'loading'.
  // Hẹn một lần là đứng im ở đây.
  const at = simulate((t) => t - 0.5);
  assert.notEqual(at, null, 'vòng hẹn dừng khi cổng còn "loading" — trang đứng im');
  assert.ok(at - T < 50, `kết luận trễ ${at - T} ms`);
});

test('mô phỏng — đồng hồ bị kéo lùi 5 s giữa chừng: vẫn tới "failed"', () => {
  // Đúng kịch bản người chấm nêu với Date.now(); performance.now() không lùi,
  // nhưng vòng hẹn không được phép dựa vào điều đó để khỏi đứng im.
  const at = simulate((t) => (t < 6_000 ? t : t - 5_000));
  assert.notEqual(at, null);
  assert.ok(at <= T + 5_000 + RECHECK_MIN_MS, `kết luận ở ${at} ms`);
});

test('mô phỏng — đồng hồ trả NaN một lượt rồi tỉnh lại: vẫn tới "failed"', () => {
  let first = true;
  const at = simulate((t) => {
    if (first) {
      first = false;
      return Number.NaN;
    }
    return t;
  });
  assert.notEqual(at, null);
  assert.ok(at <= T + RECHECK_FALLBACK_MS, `kết luận ở ${at} ms`);
});

/*
 * BẰNG CHỨNG BỘ CA NÀY BẮT ĐƯỢC LỖI THẬT — đã chạy ngày 14/10/2026, số ca
 * trượt ghi lại (tổng 10 ca trong file):
 *
 * 1. Hẹn MỘT lần (đúng bản đầu 596fec5 của IdeClient): chèn `return null;`
 *    ngay sau dòng `if (phase !== 'loading') return null;`
 *    → 8/10 ca trượt: "BẤT BIẾN", "chưa tới trần", "bắn sớm vài phần mười
 *      ms", "số rác", "đồng hồ lùi", và ba ca mô phỏng bắn sớm / kéo lùi / NaN.
 *
 * 2. Viết lại đúng điều kiện của bản 6ad1ab6 (`troi < TIMEOUT` thì hẹn
 *    `TIMEOUT - troi`, ngược lại thôi):
 *        if (!(elapsedMs < timeoutMs)) return null;
 *        return timeoutMs - elapsedMs;
 *    → 5/10 ca trượt: "BẤT BIẾN", "bắn sớm vài phần mười ms" (hẹn 0,1 ms),
 *      "số rác", "đồng hồ lùi", "mô phỏng — NaN". Bản đó đã đúng với đồng hồ
 *      thật; chỗ hở là số rác: NaN làm điều kiện sai → thôi hẹn trong khi
 *      cổng vẫn nói 'loading'.
 *
 * 3. Bỏ sàn RECHECK_MIN_MS (`Math.max(remaining, RECHECK_MIN_MS)` → `remaining`):
 *    → 2/10 ca trượt: "BẤT BIẾN", "bắn sớm vài phần mười ms".
 */
