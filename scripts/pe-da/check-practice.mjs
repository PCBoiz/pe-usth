/**
 * Chấm thử 419 ca của 138 bài TỰ LÀM bằng CHÍNH bộ chấm của trình duyệt
 * (frontend/public/static/js/studio-harness.py) và CHÍNH runtime trong repo
 * (frontend/public/pyodide/v314.0.7/).
 *
 * Vì sao cần bộ này, tách khỏi `check-pyodide.mjs`: hai bộ kiểm hai thứ khác
 * nhau. `check-pyodide.mjs` chạy các đoạn code TRONG BÀI ĐỌC và so với dòng
 * "Kết quả:" mà tác giả ghi. Bộ này chạy LỜI GIẢI MẪU của bài tự làm qua
 * HỢP ĐỒNG DỮ LIỆU (`{name, input, expected}`) — tức kiểm đúng cái mà học viên
 * sẽ bị chấm bằng. Một ca chấm viết sai không làm bài đọc đỏ ở đâu cả; nó chỉ
 * đánh trượt một lời giải đúng, và người học không có cách nào biết mình đúng.
 *
 * Lời giải mẫu của gói là THƯỚC ĐO ở đây: nó phải ĐẠT 100% ca của bài nó.
 * Không đạt thì một trong hai sai — ca chấm, hoặc lời giải — và cả hai đều là
 * lỗi phải sửa trước khi bài tới tay người học.
 *
 * BA PHA: (1) lời giải mẫu phải ĐẠT; (2) lời giải SAI phải TRƯỢT; (3) cổng
 * FILE DỮ LIỆU — file bài khai (`step_4.dataFiles`) phải có mặt ở MỌI lần chạy,
 * kể cả những lần chạy lại mà từng ca chấm sinh ra. Pha 3 thay cho cổng cấm cũ
 * ("bài có `tests` thì không được khai `dataFiles`"), xem chú thích của nó.
 *
 *   npm i --no-save pyodide@314.0.7
 *   py scripts/pe-da/build.py            # bộ này đọc BẢN DỰNG, nên dựng trước
 *   node scripts/pe-da/check-practice.mjs [MA,MA...] [--verbose]
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadPyodide } from 'pyodide';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
// Cùng biến môi trường với hai bộ chấm kia: thử một bản Pyodide khác TRƯỚC khi
// chép 30 MB vào cây mã.
const RUNTIME =
  process.env.PYODIDE_DIR || join(ROOT, 'frontend', 'public', 'pyodide', 'v314.0.7') + '/';

/**
 * Trần thời gian MỖI BÀI, khớp `worker.terminate()` ở phía React.
 *
 * Khác với bài đọc: hợp đồng dữ liệu chạy LẠI cả chương trình cho từng ca (như
 * worker.py của gói), nên một bài 3 ca là 3 lần chạy. Trần vẫn là 5 giây vì đó
 * là thứ học viên gặp, nhưng con số đáng theo là bài CHẬM NHẤT — hết biên là
 * người học thấy "quá thời gian" trên một lời giải đúng.
 */
const LIMIT_MS = 5000;

const harness = readFileSync(
  join(ROOT, 'frontend', 'public', 'static', 'js', 'studio-harness.py'), 'utf8');
/**
 * Đọc BẢN DỰNG, không đọc `source/practice.json`.
 *
 * Giữa gói và học viên có một cổng lọc (`bai_tap_cua` trong build.py) và một
 * phép chuyển hình dạng. Kiểm nguồn thì một lỗi của build.py — chuyển sai
 * `contract`, mất `starterCode`, phát bài tập cho bài mà thư viện thiếu —
 * không làm đỏ ở đâu cả. Kiểm bản dựng thì mới là kiểm thứ sẽ chạy.
 */
const bundle = JSON.parse(readFileSync(join(HERE, 'out', 'lessons.json'), 'utf8'));
const goi = {
  lessons: bundle.lessons
    .filter((b) => (b.content_json?.step_4?.tests ?? []).length)
    .map((b) => ({
      id: b.lesson_code,
      title: b.title,
      exercises: [{
        id: `${b.lesson_code}-step4`,
        starter: b.content_json.step_4.starterCode ?? '',
        referenceSolution: b.content_json.step_4.solutionCode ?? '',
        tests: b.content_json.step_4.tests,
        packages: b.content_json.step_4.packages ?? [],
        // TÊN file dữ liệu bài khai. Nội dung đọc từ đĩa ngay dưới — xem
        // `fileDuLieu`.
        dataFiles: b.content_json.step_4.dataFiles ?? [],
        ...(b.content_json.step_4.contract ?? {}),
      }],
    })),
};

/**
 * Thư mục FILE DỮ LIỆU — nhánh ĐỌC-TỪ-ĐĨA, CHÉP ngữ nghĩa từ `fileDuLieu()`
 * trong `check-pyodide.mjs` (cùng thư mục, cùng regex tên, cùng cache).
 *
 * Trong trình duyệt `studio-lesson.worker.js` lấy các file này bằng
 * `fetch('/static/da-dulieu/<tên>')`. Ở đây KHÔNG được fetch: bộ chấm đã cố ý
 * vá `globalThis.fetch` để từ chối mọi địa chỉ http(s) (xem khối "CẤM ĐI MẠNG"
 * ngay dưới). Đọc thẳng từ đĩa cũng đúng hơn về mặt bằng chứng: nó chứng minh
 * CHÍNH file trong repo dùng được, không phải một bản nào đó trên mạng.
 *
 * VÌ SAO CHÉP chứ không import từ check-pyodide.mjs: file đó chạy ngay khi
 * được nạp (nó dựng Pyodide và chấm cả 172 bài ở tầm module), nên một dòng
 * `import` ở đây là chạy cả bộ chấm nội dung trước khi bộ này bắt đầu. Hai bản
 * giống nhau được canh bằng một ca trong `frontend/e2e/unit/data-files.test.mjs`.
 */
const DU_LIEU = join(ROOT, 'frontend', 'public', 'static', 'da-dulieu');
/** Khớp TEN_FILE_DU_LIEU của build.py và TEN_DU_LIEU của worker. */
const TEN_DU_LIEU = /^[a-z0-9_-]+\.csv$/;
/** Đọc một lần rồi giữ: nhiều bài có thể cùng khai `don_hang.csv` (1,29 MB). */
const daDoc = new Map();

/**
 * `files` cho `_studio_main` — cùng hợp đồng mà worker gửi đi:
 * [{ name, content }] được `_prepare_dir` ghi vào thư mục chạy, nên mã học viên
 * đọc bằng TÊN TRƠN (`pd.read_csv('mon.csv')`).
 */
function fileDuLieu(ten_list) {
  return (ten_list || []).map((raw) => {
    const ten = String(raw);
    if (!TEN_DU_LIEU.test(ten)) throw new Error(`tên file dữ liệu không hợp lệ: ${ten}`);
    if (!daDoc.has(ten)) daDoc.set(ten, readFileSync(join(DU_LIEU, ten), 'utf8'));
    return { name: ten, content: daDoc.get(ten) };
  });
}

const lock = JSON.parse(readFileSync(join(RUNTIME, 'pyodide-lock.json'), 'utf8'));
const coTrongLock = new Set(Object.keys(lock.packages));

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const onlyArg = args.find((a) => !a.startsWith('--'));
const only = onlyArg ? new Set(onlyArg.split(',')) : null;

/**
 * CẤM ĐI MẠNG — xem chú thích dài ở scripts/pe-da/check-pyodide.mjs.
 *
 * Nhắc lại phần cốt: `loadPackage` KHÔNG ném khi thiếu wheel, nó lặng lẽ tải
 * từ cdn.jsdelivr.net. Trình duyệt thì bị CSP `connect-src` chặn đúng đường
 * đó, nên thiếu wheel là hỏng cứng với học viên mà CI không hề biết.
 */
const fetchThat = globalThis.fetch;
globalThis.fetch = (u, ...r) => {
  const dia = String(typeof u === 'string' ? u : (u?.url ?? u));
  if (/^https?:\/\//i.test(dia)) {
    return Promise.reject(
      new Error(
        `bộ chấm không được đi mạng: ${dia}\n`
        + `  → file này phải nằm sẵn trong ${RUNTIME}\n`
        + '  → trình duyệt cũng chặn (CSP connect-src), nên tải được ở đây là ảo.',
      ),
    );
  }
  return fetchThat(u, ...r);
};

/**
 * Thư viện một bài cần, lấy từ import THẬT trong lời giải mẫu.
 *
 * Kèm ba kiểu phụ thuộc mà quét `import` KHÔNG thấy — cả ba đều đã cắn ít nhất
 * một lần, xem AGENTS.md:
 *   · gọi qua chuỗi: `df.to_excel(..., engine="openpyxl")`;
 *   · gói dữ liệu ẩn sau stdlib: `ZoneInfo('Asia/Ho_Chi_Minh')` cần `tzdata`
 *     vì `zoneinfo` trong Pyodide là stdlib RỖNG.
 */
const CHUOI_GOI_THU_VIEN = [[/engine\s*=\s*['"]openpyxl['"]/, 'openpyxl']];
const GOI_AN = [[/\bZoneInfo\s*\(|\btz_convert\s*\(|\btz_localize\s*\(/, 'tzdata']];

function thuVienCan(code) {
  const ra = new Set();
  for (const m of code.match(/^\s*(?:import|from)\s+([A-Za-z_][\w.]*)/gm) || []) {
    ra.add(m.trim().split(/\s+/)[1].split('.')[0]);
  }
  for (const [re, ten] of [...CHUOI_GOI_THU_VIEN, ...GOI_AN]) {
    if (re.test(code)) ra.add(ten);
  }
  // Tên module -> tên GÓI Pyodide: khác nhau ở vài chỗ, và khai sai tên gói
  // làm `loadPackage` ném "No known package" rồi giết cả lần chạy.
  const BAN_DO = { mpl_toolkits: 'matplotlib', PIL: 'pillow', dateutil: 'python-dateutil',
                   sklearn: 'scikit-learn', cv2: 'opencv-python' };
  return [...ra].map((t) => BAN_DO[t] || t);
}

const py = await loadPyodide({ indexURL: RUNTIME });
await py.runPythonAsync(harness);
const grade = py.globals.get('_studio_main');
const preload = py.globals.get('_studio_preload');
const warmed = new Set();

/** Bài cần thư viện mà RUNTIME NÀY không có — không chấm được, phải báo riêng. */
const khongChayDuoc = [];
const hong = [];
/** Bài đã chạy được ở pha 1 — pha 2 chỉ thử biến thể sai trên đúng những bài
 *  này, vì bài thiếu thư viện thì mã nào cũng nổ và không nói lên điều gì. */
const chamDuoc = new Set();
let soBai = 0;
let soCa = 0;
let soDat = 0;
let chamNhat = { ms: 0, ten: '' };
const batDau = Date.now();

for (const bai of goi.lessons) {
  if (only && !only.has(bai.id)) continue;
  for (const bt of bai.exercises) {
    // FILE DỮ LIỆU của bài. Đọc TRƯỚC khi chạy, và để lỗi nổ thành một mục
    // `hong` mang tên file — thiếu file là lỗi của bản dựng, không phải lỗi
    // của bài tập. `continue` ở đây giữ bài ra khỏi `chamDuoc`, nên pha 2 cũng
    // không chạy nó: chấm một bài tập đọc file mà không có file thì mọi biến
    // thể sai đều "trượt" vì FileNotFoundError, tức pha 2 xanh vì lý do sai.
    let fileCuaBai;
    try {
      fileCuaBai = fileDuLieu(bt.dataFiles);
    } catch (e) {
      hong.push({ ma: bai.id, id: bt.id, loai: 'thiếu file dữ liệu',
        chiTiet: String(e.message) });
      continue;
    }

    // Dùng `packages` mà BẢN DỰNG khai, hợp nhất với phép quét. Dùng bản dựng
    // là để kiểm chính nó: build.py khai thiếu một gói thì import nổ ở đây,
    // đúng như nó sẽ nổ trong trình duyệt.
    const can = [...new Set([...(bt.packages || []), ...thuVienCan(bt.referenceSolution || '')])];
    // Gói nào runtime không biết thì bài đó không chấm được ở đây — và cũng
    // không chấm được trong trình duyệt, vì cùng một thư mục wheel.
    const thieu = can.filter((p) => !coTrongLock.has(p) && !laStdlib(p));
    if (thieu.length) {
      khongChayDuoc.push({ ma: bai.id, id: bt.id, vi: thieu.join(', ') });
      continue;
    }
    soBai += 1;

    const canNap = can.filter((p) => coTrongLock.has(p) && !warmed.has(p));
    if (canNap.length) {
      try {
        await py.loadPackage(canNap, { messageCallback: () => {} });
      } catch (e) {
        khongChayDuoc.push({ ma: bai.id, id: bt.id, vi: `${canNap.join(', ')} (${e})` });
        soBai -= 1;
        continue;
      }
      // `loadPackage` resolve dù wheel không nạp được, nên phải THỬ IMPORT.
      const loi = JSON.parse(preload(JSON.stringify(canNap)));
      if (loi.length) {
        khongChayDuoc.push({ ma: bai.id, id: bt.id, vi: `${loi.join(', ')} không import được` });
        soBai -= 1;
        continue;
      }
      canNap.forEach((p) => warmed.add(p));
    }

    const hopDong = {};
    for (const k of ['mode', 'inputVariable', 'resultVariable', 'returnType']) {
      if (bt[k] !== undefined) hopDong[k] = bt[k];
    }
    // Phân nhánh theo TRƯỜNG CÓ MẶT, y như studio-harness.py: ca biểu thức
    // (`call`/`expect`) phải đi qua NGUYÊN VẸN. Ép nó thành ca dữ liệu —
    // `input: null` — là bắt chương trình chạy lại với `solve(None)`: lời giải
    // ĐÚNG ném AttributeError còn `return data` trả None khớp `expected: null`
    // và được cho ĐẠT. Đảo ngược đúng/sai, đã gặp 30/10/2026 ở SY20.
    const cases = (bt.tests || []).map((t) => ('call' in t
      ? { name: t.name, call: t.call, expect: t.expect }
      : { name: t.name, input: t.input ?? null, expected: t.expected ?? null }));

    const t0 = Date.now();
    let res;
    try {
      res = JSON.parse(grade(bt.referenceSolution, JSON.stringify(cases),
        JSON.stringify(fileCuaBai), '[]', 'null', JSON.stringify(hopDong)));
    } catch (e) {
      hong.push({ ma: bai.id, id: bt.id, loai: 'bộ chấm nổ', chiTiet: String(e).slice(0, 240) });
      continue;
    }
    const ms = Date.now() - t0;
    if (ms > chamNhat.ms) chamNhat = { ms, ten: `${bai.id} ${bt.id}` };

    if (res.error) {
      const thieuRT = /No module named '([\w.]+)'/.exec(res.error);
      if (thieuRT) {
        khongChayDuoc.push({ ma: bai.id, id: bt.id, vi: `${thieuRT[1]} (lộ ra lúc CHẠY)` });
        soBai -= 1;
        continue;
      }
      hong.push({
        ma: bai.id, id: bt.id, loai: 'lời giải mẫu NỔ',
        chiTiet: String(res.error).split('\n').slice(-2).join(' | ').slice(0, 240),
      });
      continue;
    }
    if (ms > LIMIT_MS) {
      hong.push({
        ma: bai.id, id: bt.id, loai: 'quá hạn 5 giây',
        chiTiet: `${ms} ms cho ${cases.length} ca — học viên sẽ thấy "quá thời gian" trên lời giải ĐÚNG`,
      });
    }
    chamDuoc.add(bt.id);
    for (const r of res.tests) {
      soCa += 1;
      if (r.passed) {
        soDat += 1;
        if (verbose) console.log(`  ✓ ${bai.id} · ${r.name}`);
        continue;
      }
      const thieuRT = /No module named '([\w.]+)'/.exec(r.detail || '');
      if (thieuRT) {
        khongChayDuoc.push({ ma: bai.id, id: bt.id, vi: `${thieuRT[1]} (lộ ra trong CA CHẤM)` });
        soCa -= 1;
        continue;
      }
      hong.push({
        ma: bai.id, id: bt.id, loai: 'ca TRƯỢT', ca: r.name,
        chiTiet: (r.detail || '').slice(0, 240),
      });
    }
  }
}

/** Module stdlib thì không phải gói Pyodide — khai nó vào loadPackage là lỗi. */
function laStdlib(ten) {
  return [
    'json', 'math', 'os', 'sys', 're', 'csv', 'io', 'time', 'datetime', 'random',
    'collections', 'itertools', 'functools', 'pathlib', 'statistics', 'decimal',
    'fractions', 'string', 'textwrap', 'unicodedata', 'copy', 'pprint', 'typing',
    'dataclasses', 'enum', 'abc', 'contextlib', 'operator', 'heapq', 'bisect',
    'array', 'struct', 'hashlib', 'hmac', 'base64', 'binascii', 'zlib', 'gzip',
    'bz2', 'lzma', 'tarfile', 'zipfile', 'shutil', 'glob', 'fnmatch', 'tempfile',
    'sqlite3', 'urllib', 'http', 'email', 'html', 'xml', 'argparse', 'logging',
    'warnings', 'traceback', 'inspect', 'importlib', 'types', 'weakref', 'gc',
    'ast', 'dis', 'tokenize', 'keyword', 'unittest', 'doctest', 'pickle', 'shelve',
    'copyreg', 'calendar', 'zoneinfo', 'locale', 'gettext', 'secrets', 'uuid',
    'difflib', 'cmath', 'numbers', 'queue', 'sched', 'platform', 'getpass',
    'tracemalloc', 'timeit', 'cProfile', 'pstats', 'atexit', 'signal', 'subprocess',
    'threading', 'multiprocessing', 'concurrent', 'asyncio', 'socket', 'ssl',
    'configparser', 'netrc', 'mimetypes', 'stat', 'filecmp', 'linecache',
  ].includes(ten);
}

const giay = ((Date.now() - batDau) / 1000).toFixed(1);
console.log(`\n${soBai} bài tự làm · ${soCa} ca chấm · ${soDat} đạt · ${giay} s`);
console.log(`bài chậm nhất: ${chamNhat.ms} ms (${chamNhat.ten}) — trần ${LIMIT_MS} ms`);
console.log(`không chấm được vì runtime thiếu thư viện: ${khongChayDuoc.length} bài`);

for (const nhom of ['thiếu file dữ liệu', 'bộ chấm nổ', 'lời giải mẫu NỔ',
  'quá hạn 5 giây', 'ca TRƯỢT']) {
  const ds = hong.filter((h) => h.loai === nhom);
  if (!ds.length) continue;
  console.log(`\n=== ${nhom} (${ds.length}) ===`);
  for (const h of ds.slice(0, 30)) {
    console.log(`  ${h.ma} ${h.id}${h.ca ? ` · ${h.ca}` : ''}\n      ${h.chiTiet}`);
  }
  if (ds.length > 30) console.log(`  … còn ${ds.length - 30}`);
}

if (khongChayDuoc.length) {
  console.log(`\n=== không chấm được trong trình duyệt (${khongChayDuoc.length}) ===`);
  console.log('  Những bài này KHÔNG phải lỗi: Pyodide không có wheel cho chúng.');
  console.log('  Chúng phải được đánh dấu là bài làm trên MÁY, không chấm tự động.');
  for (const b of khongChayDuoc) console.log(`  ${b.ma} ${b.id} — cần ${b.vi}`);
}

/* ------------------------------------------------------------------ PHA 2
 *
 * Lời giải SAI phải TRƯỢT.
 *
 * VÌ SAO PHA 1 MỘT MÌNH LÀ KHÔNG ĐỦ, và đây không phải lo xa. Đã ablate 7 mảnh
 * của hợp đồng dữ liệu: 5 mảnh gỡ ra làm pha 1 đỏ, nhưng 2 mảnh — `returnType`
 * và "dict thừa khoá cũng là sai" — gỡ ra pha 1 VẪN XANH. Lý do hiển nhiên khi
 * nói ra: lời giải ĐÚNG không bao giờ trả sai kiểu hay thừa khoá, nên không ca
 * nào của pha 1 đi qua hai nhánh đó. Một bộ chấm chỉ được kiểm bằng lời giải
 * đúng thì chứng minh được nó CHO ĐẠT, không chứng minh được nó BIẾT TỪ CHỐI —
 * mà từ chối mới là việc của nó.
 *
 * Hai biến thể sai, mỗi cái bắt một loại lỗi khác nhau:
 *
 *   KHUNG TRỐNG — đúng cái starter mà học viên nhận. Không được đạt ca nào có
 *   `expected` KHÁC null, và không được đạt hết.
 *
 *   Luật đầu tiên tôi viết là "phải trượt HẾT", và nó cho 5 dương tính giả:
 *   PY16, NP17, VZ30, SY03, SY13 mỗi bài có một ca "đầu vào rỗng -> null", mà
 *   `pass` trả đúng None. Ca đó KHÔNG sai — đáp án đúng cho "chưa có số đo"
 *   thật là không có kết quả. Nên luật phải nói chính xác hơn: khung trống đạt
 *   một ca `null` là tự nhiên, đạt một ca có giá trị thì mới là lộ đáp án.
 *   (Vẫn ĐẾM và BÁO số ca kiểu đó: học viên chưa viết gì vẫn thấy "1/3 ca đạt",
 *   và người soạn bài nên biết điều đó.)
 *
 *   TRẢ HẰNG — hàm trả đúng `expected` của ca ĐẦU rồi thôi. Phải trượt ÍT NHẤT
 *   MỘT ca. Đạt hết nghĩa là mọi ca của bài hỏi cùng một câu: bài đó chấm được
 *   cả lời giải chỉ thuộc lòng ví dụ, tức không chấm gì.
 *
 * Nhóm thứ ba (`traNguyen`/`traRong`, luật `tamthuong`) nối tiếp đúng phát hiện
 * của 5 dương tính giả trên: "khung trống" chỉ là MỘT hình dạng của "chưa làm
 * gì", nên nó bỏ sót ca mà đáp án TRÙNG đầu vào hoặc đáp án đúng bằng rỗng.
 * Xem chú thích ngay trên hai hàm đó.
 */
const choPhepSai = [];
/** Bài mà khung trống vẫn đạt một ca `expected: null` — không phải lỗi, nhưng
 *  học viên chưa viết gì đã thấy "1/3 ca đạt", nên người soạn bài cần biết. */
const datKhungTrong = [];
/** Bài mà một lời giải TẦM THƯỜNG (dội lại đầu vào / trả rỗng) đạt đúng ca có
 *  đáp án bằng chính giá trị đó — cùng họ với `datKhungTrong`: không phải lỗi
 *  của bộ chấm, nhưng là một ca xanh mà học viên chưa làm gì đã nhận. */
const datTamThuong = [];
let soBienThe = 0;
let soTruot = 0;

function khungTrong(bt) {
  return bt.starter || '';
}

/** Hàm trả hằng = expected của ca đầu, viết bằng repr Python của giá trị JSON. */
function pyRepr(v) {
  if (v === null) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'number' || typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(', ')}]`;
  if (typeof v === 'object') {
    return `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${pyRepr(x)}`).join(', ')}}`;
  }
  return 'None';
}

/**
 * Hai biến thể BỌC QUANH lời giải mẫu: giá trị trả về giữ nguyên, chỉ HÌNH DẠNG
 * đổi. Chúng tồn tại vì hai mảnh của bộ chấm không mảnh nào khác bắt được.
 *
 * Đã ablate để chắc: gỡ "dict thừa khoá cũng là sai" hoặc gỡ `returnType` ra
 * thì khung trống và trả-hằng VẪN trượt như cũ, bộ kiểm VẪN xanh. Hai nhánh đó
 * chỉ phân biệt được một lời giải gần đúng — mà đó mới là lời giải học viên
 * thật sẽ gửi.
 */
function themKhoa(bt) {
  // Chỉ có nghĩa với bài trả dict: thêm một khoá lạ mà giữ nguyên mọi khoá cũ.
  if (bt.mode === 'script') return null;
  const dict = (bt.tests || []).some((t) => t.expected
    && typeof t.expected === 'object' && !Array.isArray(t.expected));
  if (!dict) return null;
  return `${bt.referenceSolution}
_goc_them = solve


def solve(data):
    kq = _goc_them(data)
    if isinstance(kq, dict):
        kq = dict(kq)
        kq["_khoa_la"] = 1
    return kq
`;
}

function haKieu(bt) {
  // Chỉ có nghĩa với bài ghim `returnType`: hạ tuple/ndarray xuống list thuần.
  // Sau chuẩn hoá hai bên GIỐNG NHAU từng giá trị, nên chỉ phép kiểm kiểu bắt
  // được — đúng chỗ cần canh.
  if (bt.mode === 'script' || !bt.returnType) return null;
  return `${bt.referenceSolution}
_goc_kieu = solve


def solve(data):
    kq = _goc_kieu(data)
    try:
        return list(kq)
    except TypeError:
        return kq
`;
}

function traHang(bt) {
  const dau = (bt.tests || [])[0];
  if (!dau) return null;
  const hang = pyRepr(dau.expected ?? null);
  if (bt.mode === 'script') {
    return `${bt.resultVariable || 'result'} = ${hang}\n`;
  }
  return `def solve(data):\n    return ${hang}\n`;
}

/* --------------------------------------------------- LỜI GIẢI TẦM THƯỜNG
 *
 * Mã KHÔNG đọc đầu vào, hoặc chỉ dội nguyên đầu vào ra.
 *
 * Vì sao cần thêm, dù đã có khung trống và trả hằng: hai biến thể đó chỉ bắt
 * được hai hình dạng "không làm gì" cụ thể (None, và hằng của ca ĐẦU). Một ca
 * chấm còn yếu theo những cách khác — ca mà đáp án TRÙNG đầu vào, ca mà đáp án
 * đúng bằng rỗng (`[]`/`{}`/`0`/`''`) — và học viên chưa viết dòng nào vẫn thấy
 * ca đó xanh. Chính phát hiện "khung trống đã đạt 1 ca" ở 5 bài (PY16, NP17,
 * VZ30, SY03, SY13) là một trường hợp RIÊNG của họ lỗi này; nhóm biến thể dưới
 * đây tìm cho hết họ đó thay vì chỉ sửa 5 bài đã biết.
 *
 * Luật đánh giá y như khung trống, không nới một li: đạt một ca mà `expected`
 * KHÁC giá trị tầm thường ấy là LỘ ĐÁP ÁN (lỗi); đạt đúng ca mà `expected` BẰNG
 * chính giá trị đó là tự nhiên — ghi nhận để người soạn bài biết, không báo lỗi.
 */
function traNguyen(bt) {
  if (bt.mode === 'script') {
    const vao = bt.inputVariable || 'data';
    const ra = bt.resultVariable || 'result';
    // Cùng một tên thì `x = x` không còn là "dội lại đầu vào", nó chỉ là mã vô
    // nghĩa — và kết quả không nói lên điều gì về ca chấm.
    if (vao === ra) return null;
    return `${ra} = ${vao}\n`;
  }
  return 'def solve(data):\n    return data\n';
}

/** Giá trị RỖNG cùng kiểu với `v` — đúng thứ một lời giải "chưa làm gì" trả. */
/** Ca hợp đồng BIỂU THỨC (`{name, call, expect}`) hay hợp đồng DỮ LIỆU? */
function laBieuThuc(ca) {
  return Boolean(ca) && 'call' in ca;
}

function rongCungKieu(v) {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return [];
  if (typeof v === 'boolean') return false;
  if (typeof v === 'number') return 0;
  if (typeof v === 'string') return '';
  if (typeof v === 'object') return {};
  return null;
}

function traRong(bt, hang) {
  if (bt.mode === 'script') return `${bt.resultVariable || 'result'} = ${pyRepr(hang)}\n`;
  return `def solve(data):\n    return ${pyRepr(hang)}\n`;
}

/**
 * So hai giá trị như `_bang_du_lieu` của harness (studio-harness.py).
 *
 * Phải CÙNG phép so mà bộ chấm đã dùng, nếu không thì luật "tự nhiên hay lộ
 * đáp án" nói khác bộ chấm. Cụ thể: số so theo sai số như bên đó, vì với
 * `JSON.stringify` thì 0.30000000000000004 khác 0.3 và một ca tự nhiên sẽ bị
 * báo thành lỗi; dict so theo TẬP KHOÁ, không theo thứ tự khoá.
 */
function bangDuLieu(a, b) {
  if (typeof a === 'boolean' || typeof b === 'boolean') return a === b;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= 1e-6 + 1e-6 * Math.abs(b);
  }
  if (Array.isArray(b)) {
    return Array.isArray(a) && a.length === b.length
      && a.every((x, i) => bangDuLieu(x, b[i]));
  }
  if (b && typeof b === 'object') {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return false;
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && kb.every((k) => k in a && bangDuLieu(a[k], b[k]));
  }
  return (a ?? null) === (b ?? null);
}

for (const bai of goi.lessons) {
  if (only && !only.has(bai.id)) continue;
  for (const bt of bai.exercises) {
    if (!chamDuoc.has(bt.id)) continue;
    const hopDong = {};
    for (const k of ['mode', 'inputVariable', 'resultVariable', 'returnType']) {
      if (bt[k] !== undefined) hopDong[k] = bt[k];
    }
    // Phân nhánh theo TRƯỜNG CÓ MẶT, y như studio-harness.py: ca biểu thức
    // (`call`/`expect`) phải đi qua NGUYÊN VẸN. Ép nó thành ca dữ liệu —
    // `input: null` — là bắt chương trình chạy lại với `solve(None)`: lời giải
    // ĐÚNG ném AttributeError còn `return data` trả None khớp `expected: null`
    // và được cho ĐẠT. Đảo ngược đúng/sai, đã gặp 30/10/2026 ở SY20.
    const cases = (bt.tests || []).map((t) => ('call' in t
      ? { name: t.name, call: t.call, expect: t.expect }
      : { name: t.name, input: t.input ?? null, expected: t.expected ?? null }));
    // Pha 2 cũng phải có file dữ liệu, và đây là chỗ dễ bỏ quên nhất: mỗi ca
    // chạy LẠI cả chương trình trên một thư mục mới, nên một biến thể sai mà
    // thiếu file sẽ trượt vì FileNotFoundError — tức "lời giải sai bị đánh
    // trượt" trở thành một câu đúng vì lý do sai, và phép ablate của pha 2
    // không còn chứng minh được gì. Không ném: pha 1 đã đọc các file này rồi.
    const fileCuaBai = fileDuLieu(bt.dataFiles);

    // Mỗi KIỂU đáp án mà bài có sinh ra một biến thể "trả rỗng" riêng, dedupe
    // theo repr: bài trả list thì thử `[]`, bài trả dict thì `{}`, bài có ca
    // `null` thì `None` — và bài trộn nhiều kiểu thì thử cả mấy cái.
    const rong = [];
    for (const t of bt.tests || []) {
      // Ca biểu thức không mang `expected` dạng JSON nên không suy ra được
      // "giá trị rỗng cùng kiểu"; lấy bừa `null` là thêm một biến thể `None`
      // mà luật tầm thường bên dưới không chấm nổi.
      if ('call' in t) continue;
      const r = rongCungKieu(t.expected ?? null);
      if (!rong.some((x) => pyRepr(x) === pyRepr(r))) rong.push(r);
    }

    for (const [loai, code, luat, tri] of [
      ['khung trống', khungTrong(bt), 'het', null],
      ['trả hằng', traHang(bt), 'motca', null],
      ['thừa một khoá dict', themKhoa(bt), 'hetsai', null],
      ['hạ tuple/ndarray xuống list', haKieu(bt), 'hetsai', null],
      ['trả nguyên đầu vào', traNguyen(bt), 'tamthuong', (i) => cases[i]?.input ?? null],
      ...rong.map((h) => [`trả rỗng ${pyRepr(h)}`, traRong(bt, h), 'tamthuong', () => h]),
    ]) {
      if (code === null) continue;
      soBienThe += 1;
      let res;
      try {
        res = JSON.parse(grade(code, JSON.stringify(cases),
          JSON.stringify(fileCuaBai), '[]', 'null', JSON.stringify(hopDong)));
      } catch (e) {
        // Bộ chấm nổ trên mã sai là một lỗi riêng: học viên nào gửi mã sai kiểu
        // đó cũng không nhận được phản hồi nào.
        choPhepSai.push({ ma: bai.id, id: bt.id, loai, vi: `bộ chấm nổ: ${String(e).slice(0, 120)}` });
        continue;
      }
      // Mã sai NỔ là chuyện bình thường (khung trống thiếu hàm solve) và tính
      // là trượt — miễn nó không được báo ĐẠT.
      const ketQua = res.tests || [];
      const dat = ketQua.filter((r) => r.passed).length;
      const tong = ketQua.length || cases.length;
      if (luat === 'het') {
        // Ca mà khung trống đạt NHƯNG `expected` không phải null = lộ đáp án.
        const lo = ketQua.filter((r, i) => r.passed
          && (laBieuThuc(cases[i]) || (cases[i]?.expected ?? null) !== null));
        if (lo.length) {
          choPhepSai.push({
            ma: bai.id, id: bt.id, loai,
            vi: `khung trống ĐẠT ${lo.length} ca có đáp án thật (${lo.map((r) => r.name).join('; ')})`
              + ' — starter đang chứa lời giải',
          });
        } else if (dat === tong && tong > 0) {
          choPhepSai.push({
            ma: bai.id, id: bt.id, loai,
            vi: `khung trống ĐẠT ${tong}/${tong} ca — bài này không hỏi gì`,
          });
        } else {
          soTruot += 1;
          if (dat > 0) datKhungTrong.push({ ma: bai.id, id: bt.id, dat, tong });
        }
      } else if (luat === 'tamthuong') {
        // Cùng luật với khung trống, chỉ khác "giá trị tầm thường" không phải
        // None mà là thứ biến thể này trả về cho ca đó.
        const lo = ketQua.filter((r, i) => r.passed
          && (laBieuThuc(cases[i]) || !bangDuLieu(cases[i]?.expected ?? null, tri(i))));
        if (lo.length) {
          choPhepSai.push({
            ma: bai.id, id: bt.id, loai,
            vi: `ĐẠT ${lo.length} ca mà đáp án KHÁC giá trị tầm thường đó `
              + `(${lo.map((r) => r.name).join('; ')}) — ca đó không hỏi gì mà vẫn cho điểm`,
          });
        } else if (dat === tong && tong > 0) {
          choPhepSai.push({
            ma: bai.id, id: bt.id, loai,
            vi: `ĐẠT ${tong}/${tong} ca — mọi đáp án của bài đúng bằng giá trị tầm thường`,
          });
        } else {
          soTruot += 1;
          if (dat > 0) {
            datTamThuong.push({
              ma: bai.id, id: bt.id, loai, dat, tong,
              ca: ketQua.filter((r) => r.passed).map((r) => r.name).join('; '),
            });
          }
        }
      } else if (luat === 'motca' && dat === tong && tong > 0) {
        choPhepSai.push({
          ma: bai.id, id: bt.id, loai,
          vi: `${tong}/${tong} ca ĐẠT khi chỉ trả hằng của ca đầu — mọi ca hỏi cùng một câu`,
        });
      } else if (luat === 'hetsai' && dat > 0) {
        // Biến thể bọc giữ NGUYÊN giá trị, nên đạt một ca nghĩa là phép kiểm
        // tương ứng (thừa khoá / returnType) đang không chạy.
        choPhepSai.push({
          ma: bai.id, id: bt.id, loai,
          vi: `${dat}/${tong} ca ĐẠT dù giá trị đã bị đổi hình dạng`,
        });
      } else {
        soTruot += 1;
      }
    }
  }
}

console.log(`\npha 2 — lời giải SAI: ${soBienThe} biến thể · ${soTruot} bị đánh trượt đúng`);
if (datKhungTrong.length) {
  console.log(`\nghi nhận: ${datKhungTrong.length} bài có ca "đầu vào rỗng -> null", nên khung`);
  console.log('  trống vẫn đạt đúng ca đó. Không phải lỗi; chỉ là học viên chưa viết gì đã');
  console.log('  thấy một ca xanh:');
  for (const b of datKhungTrong) console.log(`    ${b.ma} ${b.id} — ${b.dat}/${b.tong}`);
}
if (datTamThuong.length) {
  console.log(`\nghi nhận: ${datTamThuong.length} lần một lời giải TẦM THƯỜNG đạt đúng ca mà đáp`);
  console.log('  án bằng chính giá trị tầm thường đó. Không phải lỗi bộ chấm; chỉ là ca đó');
  console.log('  không phân biệt được "đã làm" với "chưa làm":');
  for (const b of datTamThuong) {
    console.log(`    ${b.ma} ${b.id} · ${b.loai} — ${b.dat}/${b.tong} (${b.ca})`);
  }
}
if (choPhepSai.length) {
  console.log(`\n=== bộ chấm CHO ĐẠT bài sai (${choPhepSai.length}) ===`);
  for (const h of choPhepSai.slice(0, 30)) {
    console.log(`  ${h.ma} ${h.id} · ${h.loai}\n      ${h.vi}`);
  }
  if (choPhepSai.length > 30) console.log(`  … còn ${choPhepSai.length - 30}`);
}

/* ------------------------------------------------------------------ PHA 3
 *
 * CỔNG FILE DỮ LIỆU — file có mặt ở MỌI lần chạy, không chỉ lần đầu.
 *
 * Đây là thứ THAY cho cổng cấm cũ. Trước bản này `build.py` và `check.py` cùng
 * chặn một bài vừa có `step_4.tests` vừa khai `step_4.dataFiles`, vì bộ chấm
 * này chưa nạp được file — chặn là đúng lúc đó, nhưng nó cũng có nghĩa là
 * KHÔNG bài tập nào được chấm trên dữ liệu thật. Cổng đó mất lý do tồn tại khi
 * nhánh đọc-từ-đĩa ở trên chạy; cái phải thay vào chỗ nó là một phép kiểm nói
 * được rằng nhánh ấy THẬT SỰ đưa file tới nơi mã học viên đọc.
 *
 * Vì sao pha 1 và pha 2 KHÔNG đủ, và đây là số ĐÃ ĐO chứ không phải lo xa: hôm
 * nay đúng một bài khai `dataFiles` kèm ca chấm (PD16), và bài tập của nó —
 * lấy từ `source/practice.json` — KHÔNG đọc file đó; file chỉ nằm sẵn trong
 * thư mục chạy. Thử bỏ tham số `files` ở cả pha 1 và pha 2: **cả hai pha vẫn
 * XANH**, chỉ pha này đỏ (`FileNotFoundError: 'mon.csv'`). Nghĩa là không có
 * pha này thì nhánh đọc-từ-đĩa có thể bị gỡ ra mà CI không biết — và ngày
 * module thực hành đưa vào một bài tập ĐỌC file thật, nó sẽ đỏ ở chỗ khác hẳn.
 *
 * Thêm nữa, hợp đồng dữ liệu chạy LẠI cả chương trình cho TỪNG ca và `_execute`
 * gọi `_prepare_dir(files)` mỗi lần — tức mỗi ca là một thư mục MỚI phải được
 * ghi lại file. Đó là thứ hai ca dưới đây đo, chứ không phải "file có trên đĩa".
 *
 * Chương trình dưới đây đọc file ở TẦM MODULE (nên nó chạy lại ở mỗi ca, trong
 * thư mục của chính ca đó) và trả lại dòng đầu từng file. Hai ca, hai thứ tự
 * khác nhau, để một lời giải "trả hằng" cũng không đạt được cả hai.
 */
const cuaDuLieu = [];
let soBaiDuLieu = 0;
for (const bai of goi.lessons) {
  if (only && !only.has(bai.id)) continue;
  for (const bt of bai.exercises) {
    const ten = bt.dataFiles || [];
    if (!ten.length || !chamDuoc.has(bt.id)) continue;
    soBaiDuLieu += 1;
    const file = fileDuLieu(ten);
    const dauDong = Object.fromEntries(
      file.map((f) => [f.name, f.content.replace(/\r\n/g, '\n').split('\n')[0]]));
    const code = 'from pathlib import Path\n\n'
      + '_dau = {t: Path(t).read_text(encoding="utf-8").splitlines()[0]\n'
      + `        for t in ${JSON.stringify(ten)}}\n\n\n`
      + 'def solve(data):\n    return [_dau[t] for t in data]\n';
    const dao = [...ten].reverse();
    const cases = [
      { name: 'đọc được mọi file đã khai', input: ten, expected: ten.map((t) => dauDong[t]) },
      { name: 'và đọc lại được ở lần chạy sau', input: dao, expected: dao.map((t) => dauDong[t]) },
    ];
    let res;
    try {
      res = JSON.parse(grade(code, JSON.stringify(cases), JSON.stringify(file),
        '[]', 'null', 'null'));
    } catch (e) {
      cuaDuLieu.push({ ma: bai.id, vi: `bộ chấm nổ: ${String(e).slice(0, 160)}` });
      continue;
    }
    if (res.error) {
      cuaDuLieu.push({ ma: bai.id, vi: String(res.error).split('\n').slice(-2).join(' | ').slice(0, 200) });
      continue;
    }
    for (const r of res.tests || []) {
      if (!r.passed) {
        cuaDuLieu.push({ ma: bai.id, vi: `${r.name}: ${(r.detail || '').slice(0, 160)}` });
      }
    }
  }
}
// Không có bài nào thì pha 3 không chứng minh gì — và đó đúng là tình trạng
// trước bản này, chỉ khác là hồi đó có một cổng cấm nói ra. Chỉ đòi khi chạy
// CẢ BỘ: lọc theo mã bài là chuyện của lúc gỡ lỗi.
if (!only && soBaiDuLieu === 0) {
  cuaDuLieu.push({
    ma: '(cả bộ)',
    vi: 'không bài tập nào khai step_4.dataFiles — nhánh nạp file ở bộ chấm này '
      + 'không được gọi lần nào, tức nó lại là mã dựng rồi không ai tới được',
  });
}
console.log(`\npha 3 — cổng file dữ liệu: ${soBaiDuLieu} bài tập khai dataFiles `
  + `· ${cuaDuLieu.length} lỗi`);
if (cuaDuLieu.length) {
  console.log('\n=== file dữ liệu KHÔNG tới được mã học viên ===');
  for (const c of cuaDuLieu) console.log(`  ${c.ma} — ${c.vi}`);
}

const tongVanDe = hong.length + choPhepSai.length + cuaDuLieu.length;
if (tongVanDe) {
  console.log(`\n✗ ${tongVanDe} vấn đề phải sửa.`);
  process.exit(1);
}
console.log('\n✓ lời giải mẫu ĐẠT hết, lời giải sai TRƯỢT hết.');
