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
        ...(b.content_json.step_4.contract ?? {}),
      }],
    })),
};

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
    const cases = (bt.tests || []).map((t) => ({
      name: t.name, input: t.input ?? null, expected: t.expected ?? null,
    }));

    const t0 = Date.now();
    let res;
    try {
      res = JSON.parse(grade(bt.referenceSolution, JSON.stringify(cases), '[]', '[]',
        'null', JSON.stringify(hopDong)));
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

for (const nhom of ['bộ chấm nổ', 'lời giải mẫu NỔ', 'quá hạn 5 giây', 'ca TRƯỢT']) {
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
 */
const choPhepSai = [];
/** Bài mà khung trống vẫn đạt một ca `expected: null` — không phải lỗi, nhưng
 *  học viên chưa viết gì đã thấy "1/3 ca đạt", nên người soạn bài cần biết. */
const datKhungTrong = [];
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

for (const bai of goi.lessons) {
  if (only && !only.has(bai.id)) continue;
  for (const bt of bai.exercises) {
    if (!chamDuoc.has(bt.id)) continue;
    const hopDong = {};
    for (const k of ['mode', 'inputVariable', 'resultVariable', 'returnType']) {
      if (bt[k] !== undefined) hopDong[k] = bt[k];
    }
    const cases = (bt.tests || []).map((t) => ({
      name: t.name, input: t.input ?? null, expected: t.expected ?? null,
    }));

    for (const [loai, code, luat] of [
      ['khung trống', khungTrong(bt), 'het'],
      ['trả hằng', traHang(bt), 'motca'],
      ['thừa một khoá dict', themKhoa(bt), 'hetsai'],
      ['hạ tuple/ndarray xuống list', haKieu(bt), 'hetsai'],
    ]) {
      if (code === null) continue;
      soBienThe += 1;
      let res;
      try {
        res = JSON.parse(grade(code, JSON.stringify(cases), '[]', '[]', 'null',
          JSON.stringify(hopDong)));
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
        const lo = ketQua.filter((r, i) => r.passed && (cases[i]?.expected ?? null) !== null);
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
if (choPhepSai.length) {
  console.log(`\n=== bộ chấm CHO ĐẠT bài sai (${choPhepSai.length}) ===`);
  for (const h of choPhepSai.slice(0, 30)) {
    console.log(`  ${h.ma} ${h.id} · ${h.loai}\n      ${h.vi}`);
  }
  if (choPhepSai.length > 30) console.log(`  … còn ${choPhepSai.length - 30}`);
}

const tongVanDe = hong.length + choPhepSai.length;
if (tongVanDe) {
  console.log(`\n✗ ${tongVanDe} vấn đề phải sửa.`);
  process.exit(1);
}
console.log('\n✓ lời giải mẫu ĐẠT hết, lời giải sai TRƯỢT hết.');
