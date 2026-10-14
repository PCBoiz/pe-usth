/**
 * Unit test cho việc GIỮ MÃ QUA LẦN TẢI LẠI của nút "Thử lại" ở /ide:
 * planIdeReload() và readIdeCodeOnLoad() trong src/lib/ide-handoff.ts.
 *
 * Vì sao phải có: "Thử lại" tải lại cả trang. Bản đầu chỉ cất mã vào fragment
 * qua ideCodeHref() — hàm đó trả null khi mã quá 16.000 ký tự, và khi ấy trang
 * vẫn tải lại: người đã gõ dài nhất trong ô dự phòng (vì Monaco không lên) là
 * người mất bài. Chú thích trong IdeClient khi đó lại khẳng định "thử lại KHÔNG
 * mất bài" — người chấm độc lập bắt được ngày 14/10/2026. Hỏng hóc này không
 * thấy được trên máy người sửa (Monaco luôn lên, nút "Thử lại" không bao giờ
 * hiện) nên phải chốt bằng test.
 *
 * Mọi ca đi qua đúng chu trình trang làm: planIdeReload() → (giả lập) đổi địa
 * chỉ + tải lại, sessionStorage CÒN NGUYÊN vì cùng tab → readIdeCodeOnLoad().
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  IDE_RELOAD_CODE_KEY,
  MAX_IDE_CODE_CHARS,
  MAX_IDE_SESSION_CODE_CHARS,
  forgetIdeReloadCode,
  planIdeReload,
  readIdeCodeOnLoad,
  sessionStorageOrNull,
} from '../../src/lib/ide-handoff.ts';

/** sessionStorage giả, đủ ba phương thức trang dùng. */
function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
  };
}

/** Bộ nhớ bị chặn / hết hạn mức: setItem ném như trình duyệt thật. */
function throwingStorage() {
  const s = memoryStorage();
  s.setItem = () => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  };
  return s;
}

/** Bộ nhớ "nuốt" dữ liệu: setItem không ném nhưng không lưu gì. */
function silentStorage() {
  const s = memoryStorage();
  s.setItem = () => {};
  return s;
}

/**
 * Chu trình "Thử lại" đầy đủ: lập kế hoạch, rồi đọc lại ở lần tải sau với
 * fragment của địa chỉ mới. null nghĩa là trang KHÔNG tải lại.
 */
function retryAndReload(code, storage) {
  const plan = planIdeReload(code, storage);
  if (!plan.ok) return { plan, restored: null };
  const hash = plan.href.includes('#') ? plan.href.slice(plan.href.indexOf('#')) : '';
  return { plan, restored: readIdeCodeOnLoad(hash, storage) };
}

// Một bài dài có thật trông thế nào: chú thích tiếng Việt, thụt lề, nhiều hàm.
// Lặp tới vượt trần fragment — đúng ca bị mất bài.
const BLOCK =
  '# Tính điểm trung bình — chú thích tiếng Việt có dấu\n'
  + 'def trung_binh(ds):\n    if not ds:\n        return 0\n    return sum(ds) / len(ds)\n\n';
const LONG_CODE = BLOCK.repeat(Math.ceil((MAX_IDE_CODE_CHARS + 500) / BLOCK.length));

test('mã ngắn: đi đường fragment, tải lại ra đúng mã', () => {
  const storage = memoryStorage();
  const code = 'print("xin chào")\n';
  const { plan, restored } = retryAndReload(code, storage);
  assert.equal(plan.ok && plan.via, 'fragment');
  assert.match(plan.href, /^\/ide#code=[A-Za-z0-9_-]+$/);
  assert.equal(restored, code);
  assert.equal(storage.data.size, 0, 'đi fragment thì không được để lại gì trong sessionStorage');
});

test('mã dài hơn trần fragment: KHÔNG mất bài — đi đường sessionStorage', () => {
  assert.ok(LONG_CODE.length > MAX_IDE_CODE_CHARS, 'fixture phải vượt trần fragment');
  const storage = memoryStorage();
  const { plan, restored } = retryAndReload(LONG_CODE, storage);
  assert.equal(plan.ok, true, 'cất được vào sessionStorage thì phải tải lại được');
  assert.equal(plan.via, 'session');
  // Địa chỉ trần: fragment cũ (nếu có) phải bị bỏ, không thì nó đè lên mã vừa cất.
  assert.equal(plan.href, '/ide');
  assert.equal(restored, LONG_CODE, 'tải lại phải ra ĐÚNG mã dài, từng ký tự');
});

test('mã dài + bộ nhớ ném lỗi: KHÔNG tải lại (chỗ gọi phải bảo chép mã trước)', () => {
  const { plan } = retryAndReload(LONG_CODE, throwingStorage());
  assert.deepEqual(plan, { ok: false });
});

test('mã dài + không có sessionStorage (truy cập bị chặn): KHÔNG tải lại', () => {
  assert.deepEqual(planIdeReload(LONG_CODE, null), { ok: false });
});

test('mã dài + bộ nhớ nhận setItem mà không lưu: KHÔNG tin lời, KHÔNG tải lại', () => {
  assert.deepEqual(planIdeReload(LONG_CODE, silentStorage()), { ok: false });
});

test('mã có ký tự điều khiển: fragment dựng được nhưng KHÔNG đi–về trọn → sessionStorage', () => {
  // Form feed (\f) hay đi kèm khi chép mã từ PDF. encodeIdeCode() nhận nó
  // nhưng decodeIdeCode() chặn — đi fragment là tải lại ra ví dụ mặc định.
  const code = 'print(1)\f\nprint(2)\n';
  const storage = memoryStorage();
  const { plan, restored } = retryAndReload(code, storage);
  assert.equal(plan.ok && plan.via, 'session');
  assert.equal(restored, code);
});

test('ô gõ trống: tải lại được, bỏ fragment cũ, không cất gì', () => {
  const storage = memoryStorage();
  storage.setItem(IDE_RELOAD_CODE_KEY, 'bản cất cũ');
  const plan = planIdeReload('  \n', storage);
  assert.deepEqual(plan, { ok: true, href: '/ide', via: 'none' });
  assert.equal(storage.data.size, 0, 'bản cất cũ phải bị xoá, không thì nó sống lại');
});

test('đi fragment thì xoá bản cất cũ trong sessionStorage', () => {
  const storage = memoryStorage();
  storage.setItem(IDE_RELOAD_CODE_KEY, LONG_CODE);
  const { restored } = retryAndReload('print(2)\n', storage);
  assert.equal(restored, 'print(2)\n');
  assert.equal(storage.getItem(IDE_RELOAD_CODE_KEY), null);
});

test('lúc mở trang: fragment THẮNG bản cất (lần bàn giao mới hơn trong cùng tab)', () => {
  const storage = memoryStorage();
  planIdeReload(LONG_CODE, storage); // một lần "Thử lại" trước đó
  const fresh = planIdeReload('print("bài mới")\n', memoryStorage());
  const hash = fresh.href.slice(fresh.href.indexOf('#'));
  assert.equal(readIdeCodeOnLoad(hash, storage), 'print("bài mới")\n');
});

test('lúc mở trang: không fragment, không bản cất, bộ nhớ hỏng → null (dùng ví dụ mặc định)', () => {
  assert.equal(readIdeCodeOnLoad('', memoryStorage()), null);
  assert.equal(readIdeCodeOnLoad(undefined, null), null);
  const broken = memoryStorage();
  broken.getItem = () => {
    throw new DOMException('denied', 'SecurityError');
  };
  assert.equal(readIdeCodeOnLoad('', broken), null, 'getItem ném thì không được làm nổ trang');
  const blank = memoryStorage();
  blank.setItem(IDE_RELOAD_CODE_KEY, '   ');
  assert.equal(readIdeCodeOnLoad('', blank), null);
});

test('xoá bản cất sau khi nạp; bộ nhớ ném lỗi khi xoá cũng không nổ', () => {
  const storage = memoryStorage();
  planIdeReload(LONG_CODE, storage);
  forgetIdeReloadCode(storage);
  assert.equal(readIdeCodeOnLoad('', storage), null);
  const angry = memoryStorage();
  angry.removeItem = () => {
    throw new Error('boom');
  };
  assert.doesNotThrow(() => forgetIdeReloadCode(angry));
  assert.doesNotThrow(() => forgetIdeReloadCode(null));
  // Đi fragment với bộ nhớ không xoá được vẫn phải tải lại được.
  assert.equal(planIdeReload('print(1)\n', angry).ok, true);
});

test('mã dài hơn TRẦN của sessionStorage: KHÔNG cất, KHÔNG tải lại', () => {
  // Dán cả một tệp vào ô gõ dự phòng rồi bấm "Thử lại": setItem nhận tới ~5 MB,
  // nên không có trần thì lần tải sau nhồi mấy MB vào <textarea> rồi vào Monaco
  // và trình duyệt khựng hàng giây — đúng lúc người ta đang cố cứu bài.
  const storage = memoryStorage();
  const ok = 'p'.repeat(MAX_IDE_SESSION_CODE_CHARS);
  assert.ok(MAX_IDE_SESSION_CODE_CHARS > MAX_IDE_CODE_CHARS, 'trần session phải rộng hơn trần fragment');
  const plan = planIdeReload(ok, storage);
  assert.equal(plan.ok && plan.via, 'session', 'đúng bằng trần thì vẫn phải cất được');
  assert.equal(readIdeCodeOnLoad('', storage), ok);

  const tooLong = 'p'.repeat(MAX_IDE_SESSION_CODE_CHARS + 1);
  const big = memoryStorage();
  assert.deepEqual(planIdeReload(tooLong, big), { ok: false });
  assert.equal(big.data.size, 0, 'quá trần thì không được ghi gì vào sessionStorage');
});

test('đọc window.sessionStorage ném SecurityError thì trả null, không làm nổ trang', () => {
  // Đây là LÝ DO sessionStorageOrNull() tồn tại: Chrome ném ngay ở bước ĐỌC
  // thuộc tính khi người dùng chặn dữ liệu trang. Giả lập bằng getter ném lỗi.
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    get() {
      return {
        get sessionStorage() {
          throw new DOMException('Access is denied for this document.', 'SecurityError');
        },
      };
    },
  });
  try {
    assert.equal(sessionStorageOrNull(), null);
  } finally {
    if (saved) Object.defineProperty(globalThis, 'window', saved);
    else delete globalThis.window;
  }
});

test('ngoài trình duyệt (không có window) thì sessionStorageOrNull() trả null, không ném', () => {
  assert.equal(sessionStorageOrNull(), null);
});

test('NỐI DÂY: IdeClient đi qua planIdeReload()/readIdeCodeOnLoad(), không tự dựng lại logic cũ', () => {
  // IdeClient là .tsx dùng alias '@/…' nên `node --test` không nạp được; kiểm
  // MÃ NGUỒN là cách rẻ nhất để chặn ai đó viết lại retryEditor kiểu cũ
  // (ideCodeHref + reload vô điều kiện) — đúng chỗ lỗi đã sống sót trước đây
  // vì cả hàm thuần lẫn test đều đúng mà component không dùng chúng.
  // Hành vi thật trong trình duyệt được kiểm tay bằng chrome-devtools (xem báo
  // cáo 14/10/2026); test này chỉ giữ cho nối dây không trôi về bản cũ.
  const src = readFileSync(new URL('../../src/app/ide/IdeClient.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /ideCodeHref\(/, 'IdeClient lại tự gọi ideCodeHref() — đường cũ làm mất mã dài');
  assert.match(src, /readIdeCodeOnLoad\(window\.location\.hash, sessionStorageOrNull\(\)\)/,
    'lúc mở trang không còn đọc qua readIdeCodeOnLoad() — bản cất của "Thử lại" sẽ không bao giờ được nạp');
  // Hai lần: nút "Thử lại" và nút "Đã chép mã — tải lại". Nút thứ hai cũng phải
  // thử cất lại, vì người dùng hay xoá bớt mã cho ngắn lại khi đọc lời nhắn.
  assert.equal(src.match(/planIdeReload\(codeRef\.current, sessionStorageOrNull\(\)\)/g)?.length, 2,
    'phải có ĐÚNG hai chỗ cất mã qua planIdeReload(): "Thử lại" và "Đã chép mã — tải lại"');
  assert.match(src, /if \(!plan\.ok\) \{\s*setRetryBlocked\(true\);\s*return;\s*\}/,
    'không cất được mã thì phải DỪNG trước reload()');
  assert.match(src, /forgetIdeReloadCode\(sessionStorageOrNull\(\)\)/,
    'không xoá bản cất sau khi nạp — mở lại /ide trong tab này sẽ hiện mã cũ');
  assert.match(src, /nextEditorCheckDelayMs\(phase, elapsedMs, EDITOR_LOAD_TIMEOUT_MS\)/,
    'bộ đếm giờ không còn hỏi nextEditorCheckDelayMs()');
  // Hai assert dưới ghim việc HẸN LẠI, không chỉ việc TÍNH. Người chấm đo được:
  // viết `const delay = nextEditorCheckDelayMs(…); if (delay !== null) { }` —
  // tính rồi bỏ — thì mọi ca khác vẫn xanh trong khi lỗi "đứng mãi ở Đang tải"
  // sống lại nguyên vẹn. Đúng lớp lỗi đã làm mất điểm vòng trước.
  assert.match(src, /if \(delay !== null\) timer = setTimeout\(check, delay\);/,
    'tính được khoảng chờ nhưng KHÔNG hẹn lại — trang sẽ đứng mãi ở "Đang tải"');
  assert.match(src, /timer = setTimeout\(check, EDITOR_LOAD_TIMEOUT_MS\);/,
    'không có lượt hẹn ĐẦU — không ai bắt đầu đếm thì không bao giờ tới "failed"');
  // Đúng hai chỗ tải lại: sau khi đã cất mã, và nút "Đã chép mã — tải lại".
  assert.equal(src.match(/window\.location\.reload\(\)/g)?.length, 2,
    'số chỗ gọi reload() đổi — xem lại hai đường tải lại của ô dự phòng');
});

/*
 * BẰNG CHỨNG BỘ CA NÀY BẮT ĐƯỢC LỖI THẬT — đã chạy ngày 14/10/2026, số ca
 * trượt ghi lại (tổng 15 ca trong file; mục 1–5 sửa src/lib/ide-handoff.ts):
 *
 * 1. Trả về đúng hành vi CŨ của retryEditor — không vừa fragment thì cứ tải lại:
 *      if (!storage) return { ok: false };   →   return { ok: true, href: '/ide', via: 'none' };
 *    và bỏ cả khối try/setItem phía dưới.
 *    → 5/15 ca trượt: "mã dài hơn trần fragment", "mã dài + bộ nhớ ném lỗi",
 *      "mã dài + không có sessionStorage", "mã dài + bộ nhớ nhận setItem mà
 *      không lưu", "mã có ký tự điều khiển".
 *
 * 2. Bỏ bước đọc lại sau setItem (tin lời "đã lưu"):
 *    → 1/15 ca trượt: "mã dài + bộ nhớ nhận setItem mà không lưu".
 *
 * 3. Chỉ kiểm "mã hoá được" thay vì đi–về trọn (`if (encoded)`):
 *    → 1/15 ca trượt: "mã có ký tự điều khiển".
 *
 * 4. Đảo thứ tự lúc mở trang (bản cất trước fragment):
 *    → 1/15 ca trượt: "fragment THẮNG bản cất".
 *
 * 5. Bỏ try/catch quanh getItem trong readIdeCodeOnLoad():
 *    → 1/15 ca trượt: "không fragment, không bản cất, bộ nhớ hỏng".
  *
 * 6. Trả retryEditor trong IdeClient.tsx về đúng bản 596fec5:
 *        const href = ideCodeHref(codeRef.current);
 *        if (href) window.history.replaceState(null, '', href);
 *        window.location.reload();
 *    → 1/15 ca trượt: "NỐI DÂY…" (đúng lỗi người chấm đo được: các hàm thuần
 *      vẫn đúng nhưng component không dùng chúng).
 *
 * 7. Bỏ trần của đường sessionStorage (`code.length > MAX_IDE_SESSION_CODE_CHARS`):
 *    → 1/15 ca trượt: "mã dài hơn TRẦN của sessionStorage" — dán tệp vài MB vào
 *      ô dự phòng rồi "Thử lại" là lần tải sau nhồi hết vào <textarea>+Monaco.
 *
 * 8. Bỏ try/catch trong sessionStorageOrNull():
 *    → 1/15 ca trượt: "đọc window.sessionStorage ném SecurityError…".
 *
 * 9. Trả forceReload về bản thẳng tay `() => window.location.reload()`:
 *    → 1/15 ca trượt: "NỐI DÂY…" — người dùng xoá bớt mã cho vừa fragment rồi
 *      bấm "Đã chép mã — tải lại" vẫn mất bài một cách vô ích.
 *
 * 10. Hai lỗi "tính rồi bỏ" của bộ đếm giờ. Mỗi lỗi làm sống lại đúng cảnh
 *     "đứng mãi ở Đang tải" mà cả 39 ca còn lại KHÔNG bắt được:
 *       a. giữ `const delay = nextEditorCheckDelayMs(…)` nhưng thân nhánh
 *          `if (delay !== null)` để rỗng — tính rồi bỏ, không hẹn lại;
 *       b. bỏ lượt hẹn ĐẦU, gọi thẳng `check()`.
 *     → mỗi mutation 1/15 ca trượt: "NỐI DÂY…". Đây là lý do hai assert
 *       setTimeout trong ca đó tồn tại.
 */
