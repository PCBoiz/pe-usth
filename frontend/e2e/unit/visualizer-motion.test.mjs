// Chuyển động của bộ "Xem từng bước" (code visualizer).
//
// HAI LỖI ĐANG SỬA, cả hai đã đo bằng Chrome trên vết thật của chương trình
// fib/tong (159 bước, độ sâu 5):
//
//  1. DÒNG ĐANG CHẠY KHÔNG CÓ ĐƯỜNG ĐI. Nó chỉ hiện dần tại chỗ mới, nên bước
//     nhảy vào hàm, bước trả về và bước nhảy xa trông y hệt bước xuống dòng kế
//     tiếp — trong khi `stepMotion` đã phân loại sẵn cả bốn. Chỗ đứt là bước
//     CUỐI: nhịp bị dịch sang một trong bốn tên lớp CSS tĩnh, nên "call 220ms"
//     và "jump 199ms" rơi vào cùng một lớp. Nay nhịp đi thẳng tới DOM qua
//     `cursorPlacement`, và mỗi khung stack chưa xong để lại một dấu ở dòng gọi
//     (`callSiteLines`) — đường về, thấy bằng mắt.
//
//  2. CALL STACK ĐI NGƯỢC HÌNH ẢNH CÁI CHỒNG. Khung vừa bật ra trôi XUỐNG
//     trong khi nó nằm `absolute top: 0`, đúng chỗ khung trên cùng MỚI. Đo ở
//     bước 31 của vết: hai hàng cách nhau 2,05px — "fib dòng 3" in chồng lên
//     "fib dòng 4" suốt 200ms. Nay `stackMove` phát MỘT luật dùng chung cho cả
//     bóng lẫn các hàng còn lại, nên khoảng cách giữa chúng là đúng một hàng ở
//     MỌI thời điểm (đo lại sau khi sửa: gap = 0,00px ở cả 7 mốc thời gian).
//
// Bằng chứng bộ test này bắt được lỗi thật (quy ước AGENTS.md: gỡ bản sửa ra,
// test phải trượt) — xem con số ở cuối file.
//
// Chạy: cd frontend && npm run test:unit
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  AUTOPLAY_INTERVAL_MS,
  callSiteLines,
  CURSOR_INDENT_PX,
  CURSOR_MAX_INDENT_LEVELS,
  cursorPlacement,
  EASE_MOVE,
  EASE_OUT,
  MAX_CALL_SITES,
  rowsTransform,
  stackDelta,
  stackMove,
  stepMotion,
} from '../../src/lib/trace.ts';

/* ── Fixture: hình dạng THẬT do src/python-runner/tracer/pe_tracer.py sinh ra
      cho chương trình fib/tong (chạy `py src/python-runner/tracer/pe_tracer_test.py`
      để xem bản đầy đủ), không phải hình dạng tự bịa. ─────────────────────── */

const frame = (name, line, locals = []) => ({ name, line, locals });

function step(over = {}) {
  return { i: 0, line: 1, event: 'line', frames: [frame('<module>', 1)], out: 0, err: 0, ...over };
}

/** Bốn cặp bước điển hình, lấy từ chính vết fib/tong. */
const CASES = {
  // dòng 8 -> dòng 9 trong `tong`
  step: [
    step({ line: 8, frames: [frame('<module>', 14), frame('tong', 8)] }),
    step({ line: 9, frames: [frame('<module>', 14), frame('tong', 9)] }),
  ],
  // cuối thân vòng lặp (dòng 10) quay lại đầu vòng (dòng 9)
  back: [
    step({ line: 10, frames: [frame('<module>', 14), frame('tong', 10)] }),
    step({ line: 9, frames: [frame('<module>', 14), frame('tong', 9)] }),
  ],
  // `if n < 2` sai -> nhảy xuống dòng 4
  jump: [
    step({ line: 2, frames: [frame('<module>', 14), frame('tong', 10), frame('fib', 2)] }),
    step({ line: 4, frames: [frame('<module>', 14), frame('tong', 10), frame('fib', 4)] }),
  ],
  // dòng 10 gọi fib() -> vào thân hàm ở dòng 1
  call: [
    step({ line: 10, frames: [frame('<module>', 14), frame('tong', 10)] }),
    step({
      line: 1,
      event: 'call',
      frames: [frame('<module>', 14), frame('tong', 10), frame('fib', 1)],
    }),
  ],
  // fib() xong -> về `tong` ở dòng 10
  return: [
    step({
      line: 4,
      event: 'return',
      frames: [frame('<module>', 14), frame('tong', 10), frame('fib', 4)],
    }),
    step({ line: 10, frames: [frame('<module>', 14), frame('tong', 10)] }),
  ],
};

const motionOf = (name, opts) => stepMotion(CASES[name][0], CASES[name][1], opts);

/* ══ 1 · BỐN LOẠI BƯỚC PHẢI ĐỌC RA BỐN THỨ KHÁC NHAU ══════════════════════ */

test('vào hàm / trả về / nhảy xa / bước thường: KHÁC kiểu, KHÁC cách vẽ, KHÁC thời lượng', () => {
  const kinds = ['step', 'back', 'jump', 'return', 'call'];
  const seen = kinds.map((k) => ({ k, m: motionOf(k) }));

  // Phân loại của Python.
  assert.deepEqual(seen.map((s) => s.m.kind), kinds);

  // Cách vẽ: bốn giá trị khác nhau cho bốn việc khác nhau. Bản cũ chỉ có cờ
  // `travel` nhị phân nên call, return và jump dùng CHUNG một cách vẽ — đúng
  // chỗ người học mất dấu luồng điều khiển thì lại không phân biệt được gì.
  const styles = seen.map((s) => s.m.cursorStyle);
  assert.deepEqual(styles, ['near', 'travel', 'travel', 'leave', 'enter']);
  assert.equal(new Set(styles).size, 4);

  // Thời lượng: năm băng KHÔNG chồng nhau, và thứ tự mang nghĩa — càng lâu thì
  // càng "đi xa khỏi chỗ đang đứng".
  const ms = seen.map((s) => s.m.durationMs);
  assert.equal(new Set(ms).size, 5, `thời lượng trùng nhau: ${JSON.stringify(ms)}`);
  for (let i = 1; i < ms.length; i += 1) {
    assert.ok(ms[i] > ms[i - 1], `${kinds[i]}=${ms[i]} phải lâu hơn ${kinds[i - 1]}=${ms[i - 1]}`);
  }
});

test('thời lượng nằm trong băng của bảng motion-v2, và luôn xong trước bước tự chạy sau', () => {
  for (const k of Object.keys(CASES)) {
    const m = motionOf(k);
    assert.ok(m.durationMs >= 60 && m.durationMs <= 220, `${k}: ${m.durationMs}ms`);
    // Nhịp tự chạy 460ms: hiệu ứng dài nhất vẫn phải xong trước bước kế tiếp,
    // nếu không hai bước chồng chuyển động lên nhau.
    assert.ok(m.durationMs < AUTOPLAY_INTERVAL_MS, `${k}: ${m.durationMs}ms`);
  }
  // Bước thường là chuyện xảy ra hàng trăm lần mỗi phiên: phải ở hạng "vi mô".
  assert.ok(motionOf('step').durationMs <= 160);
});

test('đường cong: đi gần thì phanh dần, đi xa thì tăng tốc rồi phanh', () => {
  assert.equal(motionOf('step').easing, EASE_OUT);
  for (const k of ['back', 'jump', 'call', 'return']) {
    assert.equal(motionOf(k).easing, EASE_MOVE, k);
  }
});

/* ══ 2 · NHỊP PHẢI THỰC SỰ TỚI ĐƯỢC DOM ═══════════════════════════════════ */

test('cursorPlacement mang ĐÚNG thời lượng và đường cong của từng loại bước xuống DOM', () => {
  const geom = { topForLine: 120, lineHeight: 19 };
  const seen = new Set();
  for (const k of Object.keys(CASES)) {
    const m = motionOf(k);
    const p = cursorPlacement(CASES[k][1], m, geom);
    assert.equal(p.transition, `transform ${m.durationMs}ms ${m.easing}`, k);
    assert.equal(p.topPx, 120);
    assert.equal(p.heightPx, 19);
    seen.add(p.transition);
  }
  // Đây là ca bắt lỗi của bản cũ: nó dịch nhịp sang một trong BA lớp CSS tĩnh
  // nên năm loại bước chỉ còn ba cách chạy. Ở đây phải còn đủ năm.
  assert.equal(seen.size, 5, `chỉ còn ${seen.size} nhịp khác nhau`);
});

test('con trỏ thụt vào theo độ sâu stack, và có trần', () => {
  const geom = { topForLine: 0, lineHeight: 19 };
  const at = (depth) => {
    const frames = [];
    for (let i = 0; i < depth; i += 1) frames.push(frame(i ? 'fib' : '<module>', 1));
    const s = step({ frames });
    return cursorPlacement(s, stepMotion(undefined, s), geom).indentPx;
  };
  assert.equal(at(1), 0); // ngoài cùng: không thụt
  assert.equal(at(2), CURSOR_INDENT_PX);
  assert.equal(at(4), 3 * CURSOR_INDENT_PX);
  // Đệ quy 20 tầng không được đẩy con trỏ ra khỏi khung.
  assert.equal(at(20), CURSOR_MAX_INDENT_LEVELS * CURSOR_INDENT_PX);
  assert.ok(at(20) < 40);
});

/* ══ 3 · DẤU CHỖ GỌI = ĐƯỜNG VỀ ═══════════════════════════════════════════ */

test('mỗi khung chưa chạy xong để lại dấu ở dòng gọi của nó; gần nhất xếp trước', () => {
  const inside = CASES.call[1];
  assert.deepEqual(callSiteLines(inside), [10, 14]); // tong đang ở dòng 10, module ở 14
  // Ngoài cùng thì chẳng có chỗ gọi nào để đánh dấu.
  assert.deepEqual(callSiteLines(step({ frames: [frame('<module>', 3)] })), []);
  assert.deepEqual(callSiteLines(undefined), []);
});

test('dấu chỗ gọi TỰ MẤT khi hàm trả về — không cần ai đi dọn', () => {
  const [, inside] = CASES.call;
  const [, after] = CASES.return;
  assert.ok(callSiteLines(inside).includes(10));
  // Khung `fib` không còn trong vết nữa, nên dòng 10 thôi là "chỗ đang chờ".
  assert.deepEqual(callSiteLines(after), [14]);
});

test('đệ quy sâu: số dấu có trần, và dòng 0 (sự kiện call đầu của <module>) không bị đánh dấu', () => {
  const frames = [frame('<module>', 0)];
  for (let i = 0; i < 20; i += 1) frames.push(frame('fib', 4));
  const sites = callSiteLines(step({ frames }));
  assert.equal(sites.length, MAX_CALL_SITES);
  assert.ok(!sites.includes(0), 'dòng 0 không có thật trên màn, đánh dấu là vẽ sai chỗ');
});

/* ══ 4 · CHỒNG KHUNG: BÓNG BẬT RA KHÔNG THỂ ĐÈ KHUNG MỚI ══════════════════ */

const POP = stackDelta(CASES.return[0], CASES.return[1]);
const PUSH = stackDelta(CASES.call[0], CASES.call[1]);

test('bật ra: cả chồng đi LÊN (đỉnh ở trên cùng thì bỏ khung là đi lên)', () => {
  const m = stackMove(POP);
  assert.equal(m.popped, 1);
  assert.equal(m.ghost, true);
  // Hàng còn lại đi từ hàng +1 (chỗ cũ) về hàng 0: tức LÊN một hàng.
  assert.ok(m.rowToRows - m.rowFromRows < 0, 'hàng còn lại phải đi lên');
  assert.ok(m.ghostToRows - m.ghostFromRows < 0, 'bóng phải bay lên, không trôi xuống');
});

test('đẩy vào: khung mới RƠI XUỐNG từ trên, cả chồng trượt xuống theo', () => {
  const m = stackMove(PUSH);
  assert.equal(m.pushed, 1);
  assert.equal(m.ghost, false);
  assert.ok(m.rowToRows - m.rowFromRows > 0, 'cả chồng phải đi xuống một hàng');
});

test('BẤT BIẾN: bóng khung bật ra luôn cách khung trên cùng ĐÚNG một hàng, ở mọi thời điểm', () => {
  for (const [ten, delta] of [['bật ra', POP], ['đẩy vào', PUSH]]) {
    const m = stackMove(delta);
    // (a) cùng thời lượng và cùng đường cong -> cùng một hàm tiến độ p(t).
    //     Hai con số này ra từ MỘT lời gọi nên không có đường nào để lệch.
    assert.equal(typeof m.durationMs, 'number');
    assert.ok(m.durationMs > 0 && m.durationMs <= 220, `${ten}: ${m.durationMs}ms`);
    // (b) cùng QUÃNG ĐƯỜNG.
    const diHang = m.rowToRows - m.rowFromRows;
    const diBong = m.ghostToRows - m.ghostFromRows;
    assert.equal(diBong, diHang, `${ten}: bóng đi ${diBong} hàng, hàng đi ${diHang} hàng`);
    // (c) bóng luôn ở TRÊN đúng một hàng. (a)+(b)+(c) => ở mọi t, vị trí bóng
    //     = vị trí hàng trên cùng − 1 hàng. Không phải "ít khi chồng" — là
    //     không chồng được. Đây chính là lỗi "fib dòng 3" đè "fib dòng 4".
    assert.equal(m.ghostFromRows, m.rowFromRows - 1, ten);
    assert.equal(m.ghostToRows, m.rowToRows - 1, ten);
    // (d) kiểm bằng chính phép nội suy tuyến tính trên p ∈ [0, 1].
    for (let i = 0; i <= 10; i += 1) {
      const p = i / 10;
      const hang = m.rowFromRows + (m.rowToRows - m.rowFromRows) * p;
      const bong = m.ghostFromRows + (m.ghostToRows - m.ghostFromRows) * p;
      assert.ok(bong + 1 <= hang + 1e-9, `${ten}: p=${p} bóng ${bong} chạm hàng ${hang}`);
    }
  }
});

test('không đổi độ sâu thì không có gì động — và không có bóng nào được dựng', () => {
  assert.equal(stackMove(stackDelta(...CASES.step)), null);
  assert.equal(stackMove({ pushed: [], popped: [] }), null);
});

test('rowsTransform: 0 hàng là đứng yên, ±1 hàng là ±100% CHÍNH hàng đó (không phải đo px)', () => {
  assert.equal(rowsTransform(0), 'none');
  assert.equal(rowsTransform(1), 'translateY(100%)');
  assert.equal(rowsTransform(-1), 'translateY(-100%)');
});

/* ══ 5 · GIẢM CHUYỂN ĐỘNG: BỎ CHUYỂN ĐỘNG, KHÔNG BỎ THÔNG TIN ═════════════ */

test('giảm chuyển động: thời lượng về 0 nhưng PHÂN LOẠI và ĐÍCH ĐẾN vẫn còn nguyên', () => {
  const geom = { topForLine: 120, lineHeight: 19 };
  for (const k of Object.keys(CASES)) {
    const binh = motionOf(k);
    const giam = motionOf(k, { reduced: true });
    assert.equal(giam.durationMs, 0, k);
    // Không mất thông tin: vẫn biết đây là bước loại gì và vẽ kiểu gì.
    assert.equal(giam.kind, binh.kind, k);
    assert.equal(giam.cursorStyle, binh.cursorStyle, k);

    const p = cursorPlacement(CASES[k][1], giam, geom);
    // 'none' chứ KHÔNG phải 'transform 0ms …': một transition 0ms vẫn là một
    // transition đang chạy, và đổi transition-* về sau không dừng được nó.
    assert.equal(p.transition, 'none', k);
    assert.ok(!/0ms/.test(p.transition), k);
    // Con trỏ vẫn tới ĐÚNG dòng, vẫn thụt đúng độ sâu.
    assert.equal(p.topPx, 120, k);
    assert.equal(p.heightPx, 19, k);
    assert.equal(p.indentPx, cursorPlacement(CASES[k][1], binh, geom).indentPx, k);
  }
});

test('giảm chuyển động: dấu chỗ gọi và chồng khung vẫn đầy đủ, chỉ là không trượt', () => {
  // Đường về vẫn hiện — đây là thứ MANG THÔNG TIN, không phải trang trí.
  assert.deepEqual(callSiteLines(CASES.call[1]), [10, 14]);
  // Không animation nào chạy; danh sách khung đã ở đúng chỗ ngay từ lần vẽ đầu
  // (và bóng khung bật ra nghỉ ở opacity 0, xem ca CSS bên dưới) nên không có
  // gì đè lên khung trên cùng.
  assert.equal(stackMove(POP, { reduced: true }), null);
  assert.equal(stackMove(PUSH, { reduced: true }), null);
});

/* ══ 6 · BẤM NHANH THÌ HIỆU ỨNG RÚT LẠI ═══════════════════════════════════ */

test('giữ phím →: cả con trỏ lẫn chồng khung đều rút lại, không xếp hàng chờ', () => {
  const nhanh = motionOf('call', { paceMs: 40 });
  assert.ok(nhanh.durationMs <= 60, `${nhanh.durationMs}ms`);
  const chong = stackMove(POP, { paceMs: 40 });
  assert.ok(chong.durationMs <= 60, `${chong.durationMs}ms`);
  // Nhưng không bao giờ về 0 ở nhánh thường: 0ms là "nhảy", mà nhảy thì mất
  // đúng cái đường đi mà bản sửa này dựng ra.
  assert.ok(nhanh.durationMs >= 60 && chong.durationMs >= 60);
});

/* ══ 7 · CSS: NHỮNG BẤT BIẾN KHÔNG VIẾT ĐƯỢC BẰNG HÀM THUẦN ═══════════════ */

const CSS_RAW = readFileSync(
  new URL('../../src/components/code-visualizer/CodeVisualizer.module.css', import.meta.url),
  'utf8',
);
// Bỏ chú thích trước khi phân tích: chú thích có cả dấu ngoặc và tên thuộc tính.
const CSS = CSS_RAW.replace(/\/\*[\s\S]*?\*\//g, '');

/** Lấy thân của một at-rule bằng cách đếm ngoặc. */
function atRuleBody(css, headerRe) {
  const m = headerRe.exec(css);
  if (!m) return null;
  const open = css.indexOf('{', m.index + m[0].length - 1);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}' && (depth -= 1) === 0) return css.slice(open + 1, i);
  }
  return null;
}

/** Gom khai báo của một selector (khớp chính xác, không khớp selector khác chứa nó). */
function declsFor(body, selector) {
  const out = [];
  for (const m of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sels = m[1].split(',').map((s) => s.trim());
    if (sels.some((s) => s === selector)) out.push(m[2]);
  }
  return out.join(' ');
}

test('chỉ animate transform và opacity — không có thuộc tính nào bắt layout hay tô lại', () => {
  const CAM = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding',
    'box-shadow', 'filter', 'background', 'border-width', 'inset'];
  // (a) mọi khai báo transition
  for (const m of CSS.matchAll(/transition:\s*([^;]+);/g)) {
    const v = m[1];
    assert.ok(!/\ball\b/.test(v), `transition: all — ${v}`);
    for (const p of CAM) {
      assert.ok(!new RegExp(`(^|[\\s,])${p}\\b`).test(v), `transition động ${p}: ${v}`);
    }
  }
  // (b) mọi keyframes
  for (const m of CSS.matchAll(/@keyframes\s+[\w-]+\s*\{/g)) {
    const body = atRuleBody(CSS.slice(m.index), /@keyframes\s+[\w-]+/);
    for (const p of CAM) {
      assert.ok(!new RegExp(`(^|[\\s;{])${p}\\s*:`).test(body), `keyframe động ${p}`);
    }
  }
});

test('bóng khung bật ra NGHỈ ở opacity 0 — mọi đường hỏng đều ra "vô hình", không ra "đè chữ"', () => {
  const d = declsFor(CSS, '.framePopped');
  assert.ok(d, 'không thấy .framePopped');
  assert.match(d, /opacity:\s*0\b/, 'trạng thái nghỉ phải là vô hình');
  assert.match(d, /position:\s*absolute/, 'phải nằm ngoài luồng, không chiếm chỗ của ai');
  // Không keyframe CSS: hai cú đẩy vào liên tiếp không đổi tên lớp nên
  // animation CSS sẽ KHÔNG chạy lại — cú thứ hai im lặng. Chuyển động do
  // CodeVisualizer.tsx chạy bằng el.animate() với luật ở stackMove().
  assert.ok(!/animation/.test(d), '.framePopped không được tự chạy animation CSS');
});

test('mọi hàng của chồng cao đúng MỘT dòng — nếu không thì ±100% không còn là một hàng', () => {
  // Đây không phải chuyện thẩm mỹ: bất biến "bóng cách khung mới đúng một hàng"
  // dựa vào việc 100% chiều cao của hàng = một hàng. Một tên hàm dài xuống dòng
  // là mất bất biến đó.
  assert.match(declsFor(CSS, '.frame'), /line-height:\s*18px/);
  assert.match(declsFor(CSS, '.stackElided'), /line-height:\s*18px/);
  assert.match(declsFor(CSS, '.frameName'), /white-space:\s*nowrap/);
  assert.match(declsFor(CSS, '.frameName'), /text-overflow:\s*ellipsis/);
});

test('nhánh giảm chuyển động không giấu con trỏ, không giấu dấu chỗ gọi, không dùng mẹo 0,01ms', () => {
  const body = atRuleBody(CSS, /@media\s*\(prefers-reduced-motion:\s*reduce\)/g);
  assert.ok(body, 'không thấy nhánh prefers-reduced-motion');
  const all = CSS_RAW.match(/@media\s*\(prefers-reduced-motion[\s\S]*$/)[0];
  // Lỗi đã có thật ở studio-chrome.module.css: rút thời lượng của một animation
  // TẮT DẦN không làm nó đứng yên — nó nhảy thẳng tới khung cuối, tức biến mất.
  assert.ok(!/0\.01ms/.test(all), 'đừng rút thời lượng để "tắt" animation');
  for (const sel of ['.lineCursor', '.callSite', '.monacoLine']) {
    const d = declsFor(all, sel);
    assert.ok(!/display:\s*none/.test(d), `${sel} bị giấu ở nhánh giảm chuyển động`);
    assert.ok(!/opacity:\s*0\b/.test(d), `${sel} bị làm vô hình ở nhánh giảm chuyển động`);
  }
});

/* ══ 8 · COMPONENT: ĐÃ NỐI DÂY ĐÚNG ═══════════════════════════════════════ */

const TSX = readFileSync(
  new URL('../../src/components/code-visualizer/CodeVisualizer.tsx', import.meta.url),
  'utf8',
);
// Bỏ chú thích: file này giải thích VÌ SAO không dùng matchMedia và không dùng
// `style={{…}}`, nên chính câu giải thích lại khớp với phép tìm bên dưới.
const CODE = TSX.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('component dùng hook giảm chuyển động DÙNG CHUNG, không tự đọc matchMedia', () => {
  // Bản cũ tự gọi matchMedia một lần: đổi tuỳ chọn giữa phiên (Windows, macOS,
  // và cả DevTools → Rendering) thì trạng thái bị đóng băng sai.
  assert.match(TSX, /usePrefersReducedMotion\(\)/);
  assert.ok(!/matchMedia/.test(CODE), 'đã có lib/use-reduced-motion.ts rồi, đừng viết bản thứ hai');
});

test('nhịp đi từ stepMotion tới DOM qua cursorPlacement, không qua tên lớp CSS tĩnh', () => {
  assert.match(TSX, /cursorPlacement\(/);
  assert.match(TSX, /callSiteLines\(/);
  assert.match(TSX, /stackMove\(/);
  // Bốn lớp nhịp cũ (.stepNear/.stepFar/.stepInstant/.monacoLineTravel) là chỗ
  // phân loại rơi mất; chúng phải biến hẳn, cả ở CSS lẫn ở TSX.
  for (const dead of ['stepNear', 'stepFar', 'stepInstant', 'monacoLineTravel', 'framePushed']) {
    assert.ok(!TSX.includes(dead), `${dead} còn sót trong TSX`);
    assert.ok(!CSS.includes(`.${dead}`), `.${dead} còn sót trong CSS`);
  }
});

test('lớp phủ ghi vị trí bằng CSSOM, không thêm nợ cho việc bỏ style-src unsafe-inline', () => {
  // `style={{…}}` của React bị SSR tuần tự hoá thành thuộc tính style="…" trong
  // MÃ NGUỒN — đúng thứ đang phải dọn. Ghi qua el.style thì CSP không chặn.
  assert.ok(!/style=\{\{/.test(CODE), 'không được thêm style={{…}} vào file này');
  assert.match(CODE, /\.style\.transform\s*=/);
});

test('tự chạy dài hơn 5 giây nên PHẢI dừng được (WCAG 2.2.2)', () => {
  // 59 bước × 460ms ≈ 27 giây chuyển động tự khởi động.
  assert.ok(AUTOPLAY_INTERVAL_MS * 12 > 5000);
  assert.match(TSX, /aria-pressed=\{autoRunning\}/);
  assert.match(TSX, /autoRunning \? 'Dừng tự chạy' : 'Tự chạy'/);
});

/*
 * BẰNG CHỨNG BỘ TEST NÀY BẮT ĐƯỢC LỖI THẬT — mỗi dòng là một lần gỡ bản sửa ra
 * rồi chạy lại, số ca trượt đo được ngày 15/10/2026:
 *
 *  1. Dựng lại ĐÚNG lỗi cũ: bóng khung bật ra đứng ở hàng 0 rồi trôi XUỐNG
 *     (`ghostToRows: 1`) trong khi các hàng còn lại đi lên → 2 ca trượt.
 *  2. Bỏ `cursorStyle`, cho call/return/jump dùng chung một cách vẽ như cờ
 *     `travel` nhị phân của bản cũ → 1 ca trượt.
 *  3. Trả bảng thời lượng về công thức cũ (110 + 14 × số dòng, sàn 170 cho
 *     call/return) nên call và return ra cùng một số → 1 ca trượt.
 *  4. Bỏ `callSiteLines` (không còn dấu đường về) → 4 ca trượt.
 *  5. `cursorPlacement` trả `transform 0ms …` thay cho `'none'` ở nhánh giảm
 *     chuyển động → 1 ca trượt.
 *  6. Để `.framePopped` nghỉ ở `opacity: 1` như bản cũ → 1 ca trượt.
 *  7. Bỏ `white-space: nowrap` của `.frameName` (tên hàm dài được xuống dòng,
 *     hàng cao gấp đôi, ±100% không còn là một hàng) → 1 ca trượt.
 *  8. Thêm `width` vào một khai báo transition → 1 ca trượt.
 *  9. Giấu `.lineCursor` ở nhánh giảm chuyển động (`display: none`) → 1 ca trượt.
 * 10. Quay lại đọc `matchMedia` ngay trong component thay cho hook dùng chung
 *     → 1 ca trượt.
 */
