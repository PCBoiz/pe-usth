// Canh BA TRẦN của bộ ghi vết (`PE_LIMITS` trong `scripts/tracer/pe_tracer.py`).
//
// VÌ SAO FILE NÀY TỒN TẠI: hai trong ba trần từng được biện minh bằng hạ tầng ĐÃ
// BỊ XOÁ ngày 25/10/2026 — `maxBytes` 700 KB vì "Node giữ tối đa 1 MB mỗi luồng
// (MAX_BUFFER trong docker-sandbox.ts)" và `timeBudgetMs` 6 500 vì "container bị
// giết ở 10 s". Không còn luồng Node nào, không còn container nào. Và cái giá
// không phải là một chú thích lỗi thời vô hại: 6 500 ms LỚN HƠN trần 5 giây mà
// bài học áp bằng `worker.terminate()`, nên trên đường đó tracer không bao giờ
// tới được trần của chính mình — người học nhận một ô TRỐNG thay vì vết một phần,
// và `terminate()` thì không có thông điệp 'result' nào để mang vết về.
//
// Nên ba ca đầu không kiểm "con số bằng mấy" mà kiểm QUAN HỆ giữa trần của tracer
// và trần của những lớp sẽ cắt nó. Số đo dựng nên các con số này nằm trong
// `scripts/tracer/do-settrace.mjs` (chạy lại được) và trong chú thích của
// `PE_LIMITS`.
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const NGUON = new URL('../../../scripts/tracer/pe_tracer.py', import.meta.url);
const MIN = new URL('../../public/static/py/pe_tracer.min.py', import.meta.url);
const IDE_TRACE = new URL('../../src/lib/ide-trace.ts', import.meta.url);
// Trần 5 giây của BÀI HỌC. Đọc từ chính chỗ khai nó, không chép thành hằng thứ
// hai trong file test — chép là tạo đúng cái lệch mà file này được viết để chặn.
const RUNNER_TYPES = new URL(
  '../../src/components/python-studio/runner/types.ts',
  import.meta.url,
);
const DO = new URL('../../../scripts/tracer/do-settrace.mjs', import.meta.url);

/** Đọc file và bỏ CR: `.` của regex không khớp `\r`, mà cây mã này là CRLF. */
function doc(url) {
  return readFileSync(url, 'utf8').replace(/\r/g, '');
}

/**
 * Lấy một trần ra khỏi `PE_LIMITS`.
 *
 * Nhận cả `1536 * 1024` lẫn `1572864`: nguồn viết dạng nhân cho dễ đọc, còn
 * `ast.unparse` của bước rút gọn giữ nguyên biểu thức — nhưng đừng tin điều đó,
 * một bản Python khác có thể gộp hằng lại.
 */
function tran(text, khoa) {
  const m = new RegExp(`['"]${khoa}['"]\\s*:\\s*(\\d+)(?:\\s*\\*\\s*(\\d+))?`).exec(text);
  assert.ok(m, `không thấy trần ${khoa} trong PE_LIMITS`);
  return Number(m[1]) * (m[2] ? Number(m[2]) : 1);
}

const nguon = doc(NGUON);

test('trần thời gian của tracer phải THẮNG trần 5 giây của bài học, còn chỗ gửi vết về', () => {
  const execMs = Number(/execMs:\s*(\d+)/.exec(doc(RUNNER_TYPES))?.[1]);
  assert.ok(Number.isFinite(execMs), 'không đọc được execMs trong runner/types.ts');
  const budget = tran(nguon, 'timeBudgetMs');
  // 1 giây biên: đo được một tài liệu 1 533 KB tốn ~290 ms để dựng, tuần tự hoá
  // và qua postMessage. Sát quá thì vết bị cắt đúng lúc nó vừa ghi xong.
  assert.ok(
    budget <= execMs - 1000,
    `timeBudgetMs=${budget} không thắng được trần ${execMs} ms của bài học `
      + '(cần nhỏ hơn ít nhất 1 giây để kịp tuần tự hoá và gửi vết). '
      + 'Hạ timeBudgetMs trong scripts/tracer/pe_tracer.py, đừng nâng execMs.',
  );
});

test('và cũng phải thắng hạn của ide-trace.ts — hạn đó cố ý phải THUA', () => {
  const timeout = Number(/const TIMEOUT_MS = ([\d_]+)/.exec(doc(IDE_TRACE))?.[1].replace(/_/g, ''));
  assert.ok(Number.isFinite(timeout), 'không đọc được TIMEOUT_MS trong ide-trace.ts');
  const budget = tran(nguon, 'timeBudgetMs');
  assert.ok(
    budget < timeout,
    `timeBudgetMs=${budget} >= TIMEOUT_MS=${timeout}: lớp ngoài sẽ terminate() `
      + 'trước khi tracer kịp trả vết, và người học nhận một ô trống.',
  );
});

test('chú thích của hai trần phải biện minh bằng TRÌNH DUYỆT, không bằng hạ tầng đã xoá', () => {
  const khoi = /PE_LIMITS = \{[\s\S]*?\n\}/.exec(nguon);
  assert.ok(khoi, 'không thấy khối PE_LIMITS');
  // Kiểm theo chiều DƯƠNG, không theo danh sách tên bị cấm: nhắc `docker-sandbox.ts`
  // ĐỂ NÓI nó đã chết là chú thích tốt, còn lấy nó LÀM LÝ LẼ thì không — và hai
  // chuyện đó không phân biệt được bằng `includes`. Thứ phân biệt được là khối
  // này có hay không có lý lẽ của môi trường hiện tại.
  for (const can of ['postMessage', 'do-settrace.mjs', 'terminate()', 'đã bị xoá']) {
    assert.ok(
      khoi[0].includes(can),
      `chú thích của PE_LIMITS không nhắc "${can}". Hai trần maxBytes/timeBudgetMs `
        + 'từng được biện minh bằng MAX_BUFFER 1 MB của docker-sandbox.ts và '
        + 'container-10-giây — cả hai đã bị xoá ngày 25/10/2026. Lý lẽ phải đến từ '
        + 'môi trường trình duyệt (postMessage, trần của lớp gọi terminate()) và từ '
        + 'số đo chạy lại được trong scripts/tracer/do-settrace.mjs.',
    );
  }
});

test('trần byte không được tụt về mức cắt một chương trình tầm thường ở bước 150', () => {
  // Đo 28/10/2026 trong module worker thật: với 700 KB, `rows.append({...})`
  // 400 lần chạm trần byte ở bước 150 trong 805 sự kiện. Trần BYTE, không phải
  // trần bước, mới là thứ quyết định người học xem được bao nhiêu.
  const bytes = tran(nguon, 'maxBytes');
  assert.ok(
    bytes >= 1024 * 1024,
    `maxBytes=${bytes} byte: dưới 1 MB thì vết của một chương trình có list/dict `
      + 'bị cắt sau trăm bước đầu. Trần cũ 700 KB là dấu vết của stdout 1 MB '
      + 'bên Node, không phải giới hạn của trình duyệt.',
  );
});

test('bản .min.py mà trình duyệt tải mang ĐÚNG ba trần của nguồn', () => {
  // Khác với ca sha256 trong tracer-web-sync.test.mjs: ca kia bắt "quên sinh
  // lại", ca này nói ra NGAY con số nào lệch — thứ duy nhất người học thật sự
  // chạy là bản .min.py.
  assert.ok(existsSync(MIN), 'không thấy pe_tracer.min.py');
  const min = doc(MIN);
  for (const khoa of ['maxSteps', 'maxBytes', 'timeBudgetMs']) {
    assert.equal(
      tran(min, khoa), tran(nguon, khoa),
      `${khoa} lệch giữa nguồn và bản .min.py — chạy: node scripts/build-tracer-source.mjs`,
    );
  }
});

test('maxSteps giữ 1000, và chạm trần thì NGỪNG GHI chứ không cắt chương trình', () => {
  // Guo (Python Tutor, SIGCSE 2013) chọn 300 và nói thẳng rằng trần đó là ĐỊNH
  // NGHĨA PHẠM VI của công cụ, không phải lỗi cần lách. Và đo được rằng hạ con
  // số này không cứu được ca xấu: `while True` đi qua 4 055 730 sự kiện để ghi
  // 1 000 bước, vì trong Pyodide không có báo thức nên callback không bị tắt.
  assert.equal(tran(nguon, 'maxSteps'), 1000);
  assert.match(
    nguon,
    /if len\(st\["steps"\]\) >= lim\["maxSteps"\]:\n\s+st\["stop"\] = "step-limit"\n(?:\s+#[^\n]*\n)*\s+return _stop_tracing\(\)/,
    'nhánh chạm trần bước không còn trả về _stop_tracing(): trả None là CẮT vết '
      + 'im lặng ở một chương trình vẫn đang chạy, trả tracer là mất cả chỗ ngừng ghi.',
  );
  assert.match(
    nguon,
    /if st\["watchdog"\]:\n\s+st\["off"\] = True\n\s+sys\.settrace\(None\)\n\s+return None\n\s+return tracer/,
    '_stop_tracing không còn GIỮ callback khi thiếu báo thức. Trong Pyodide '
      + 'signal.setitimer không tồn tại, nên bỏ nhánh này là bỏ chỗ DUY NHẤT '
      + 'còn canh được timeBudgetMs.',
  );
});

test('bộ đo hệ số chậm còn đo trong module worker THẬT, không trong Node', () => {
  // Báo cáo đòi đúng chỗ này: Node chạy Pyodide trên V8 có JIT đầy đủ và không
  // có worker/postMessage, nên một phép đo trong Node không nói gì về cái giá
  // người học trả. Viết lại nó thành benchmark Node là làm con số thành vô
  // nghĩa mà trông vẫn như đã đo.
  assert.ok(existsSync(DO), 'không thấy scripts/tracer/do-settrace.mjs');
  const d = doc(DO);
  assert.match(
    d,
    /new Worker\('\/static\/js\/ide\.worker\.js', \{ type: 'module' \}\)/,
    'do-settrace.mjs không còn tạo module worker từ /static/js/ide.worker.js',
  );
  for (const can of ["type: 'warmup'", "type: 'run'", "type: 'trace'"]) {
    assert.ok(d.includes(can), `do-settrace.mjs không còn gửi ${can}`);
  }
});
