/*
 * Generic grader for imported lessons (studio-lesson/v1).
 *
 * Unlike python-studio.worker.js — which hard-codes the List & Mutability
 * cases — this one takes its cases from the lesson's content_json:
 *   { code, tests: [{ name, call, expect }], forbid: ["...", ...], files: [{ name, content }] }
 * `call` and `expect` are both Python expressions evaluated in the learner's
 * own namespace, so a lesson can assert on anything it can express.
 *
 * The grading loop itself lives in studio-harness.py (same folder) so that
 * scripts/pe-v3/check-pyodide.mjs can run the very same code under Node. It
 * adds what PE v3 needs: re-running a whole script with other data, fixture
 * files (data.txt…), and simulated threading / os.fork — Pyodide has neither.
 *
 * Python still runs in a disposable browser worker, never in the NestJS process.
 */
// Đường dẫn CÙNG ORIGIN tới runtime đã commit vào repo. Root-relative chứ
// không '../../pyodide/…' để khỏi phụ thuộc vào vị trí của chính file worker,
// giống fetch('/static/js/studio-harness.py') bên dưới.
//
// Đây là MODULE worker (React tạo bằng `new Worker(url, { type: 'module' })`).
// Không phải lựa chọn về phong cách: Pyodide 314 bỏ hẳn hỗ trợ classic worker,
// nên `importScripts(PYODIDE_DIR + 'pyodide.js')` của bản 0.27.7 không còn
// đường chạy — bản 314 cũng không phát hành `pyodide.js` nữa, chỉ có `.mjs`.
const PYODIDE_DIR = '/pyodide/v314.0.7/';

// Bỏ hẳn `Worker` khỏi worker này TRƯỚC khi chạy mã học viên.
//
// Code Python gọi được JS qua `pyodide.ffi`, nên một đoạn mã dán từ link lạ có
// thể làm `js.Worker.new('/static/js/pe-bridge.js')`. Worker CON đó nhận policy
// từ response của CHÍNH file đó — tức CSP chung của trang, trong đó
// `connect-src` có `API_ORIGIN` — nên nó lại gọi được API kèm cookie phiên.
//
// `worker-src 'none'` trong CSP riêng của file worker (frontend/next.config.ts)
// KHÔNG đủ: đo trong Chrome 155 thì nó chỉ chặn `blob:`, còn worker con từ URL
// cùng origin vẫn tạo được — Chrome xét worker con lồng trong worker theo
// `script-src`, mà `script-src` buộc phải có `'self'` để `import()` được
// pyodide.mjs. Nên chặn bằng JS là cách duy nhất khép được đường này.
//
// Không có đường lấy lại: worker không có DOM nên không tạo được realm mới.
delete self.Worker;


// Runtime và bộ chấm được GIỮ LẠI giữa các lần chạy. Trước đây worker nạp
// Pyodide bên trong onmessage nên mỗi lần bấm Chạy là nạp lại ~13 MB; phía
// React vì thế phải tạo worker mới cho từng lần. Nay nạp một lần rồi dùng lại.
//
// Vì sao vẫn an toàn với vòng lặp vô hạn: giới hạn 5 giây KHÔNG do worker tự
// cắt — runPythonAsync chặn luôn vòng lặp sự kiện nên worker không tự ngắt
// mình được. Phía React vẫn terminate() worker khi hết giờ, rồi nạp sẵn một
// worker thay thế ở nền. Học viên chỉ chờ lại khi code của chính họ treo.
let runtime = null;

// Thư viện ngoài (khoá Python Advanced) — wheel lấy nguyên bản từ bản phân phối
// Pyodide 0.27.7, lưu CÙNG ORIGIN trong PYODIDE_DIR (đúng sha256 của
// pyodide-lock.json; loadPackage tự kéo theo phụ thuộc). Chỉ tải cho bài cần:
// bài không dùng thì lần chạy đầu không chậm thêm byte nào.
// Khoá = tên gói (step_4.packages), giá trị = tên module khi `import`.
// `sqlite3` KHÔNG còn ở đây: nó là wheel riêng ở Pyodide 0.27.7 nhưng vào thẳng
// stdlib ở 314, và khai nó làm `loadPackage` ném "No known package" rồi giết cả
// lần chạy. `tzdata` thì ngược lại — `zoneinfo` là stdlib nhưng RỖNG dữ liệu
// múi giờ, phải tải gói mới tra được "Asia/Ho_Chi_Minh".
const PACKAGES = { numpy: 'numpy', pandas: 'pandas', matplotlib: 'matplotlib', tzdata: 'zoneinfo' };

// ───────────────────────────── FILE DỮ LIỆU ─────────────────────────────
//
// Bộ dữ liệu quán (frontend/public/static/da-dulieu/) phục vụ ở CÙNG ORIGIN.
// Bài khai `step_4.dataFiles: ["mon.csv", …]`; worker tải chúng rồi gộp vào
// CHÍNH trường `files` mà bộ chấm đã nhận từ trước — `_prepare_dir` trong
// studio-harness.py ghi mỗi file vào thư mục chạy rồi `chdir` vào đó, nên mã
// học viên đọc bằng TÊN TRƠN: `pd.read_csv('mon.csv')`.
//
// Vì sao KHÔNG nhúng nội dung vào `content_json` như `step_4.files` của pe-v4:
// `don_hang.csv` là 1,29 MB. Nhúng là bắt MỌI lượt mở bài tải nó qua API và
// nằm trong DB; tham chiếu theo tên thì chỉ bài nào khai mới tải, và tải một
// lần cho cả phiên (`daTaiDuLieu`).
//
// CSP: file worker có entry riêng trong frontend/next.config.ts với
// `connect-src 'self'`, nên fetch cùng origin đã được phép — KHÔNG phải mở
// thêm gì. Đừng đổi sang một origin khác (CDN): nó sẽ bị chặn ở trình duyệt
// trong khi vẫn chạy được dưới Node, đúng cái bẫy mà ba bộ chấm vá `fetch` để
// khỏi mắc lại.
const DU_LIEU_DIR = '/static/da-dulieu/';
// Tên file TRƠN, chữ thường, chỉ .csv. Khớp TEN_FILE_DU_LIEU của
// scripts/pe-da/build.py và DU_LIEU_HOP_LE của studio-lesson.schema.ts. Cổng
// thật là danh sách trắng ở schema (cửa duy nhất vào DB); regex ở đây chặn
// đường `../` nếu có ai nhồi được một tên lạ vào thông điệp.
const TEN_DU_LIEU = /^[a-z0-9_-]+\.csv$/;
/** Nội dung đã tải, GIỮ LẠI giữa các lần chạy như `warmed` của gói. */
const daTaiDuLieu = new Map();

/** [{name, content}] cho bộ chấm. Ném nếu thiếu file — KHÔNG chạy tiếp lặng lẽ. */
async function taiDuLieu(names) {
  const ra = [];
  for (const raw of names) {
    const ten = String(raw);
    if (!TEN_DU_LIEU.test(ten)) throw new Error(`tên file dữ liệu không hợp lệ: ${ten}`);
    if (!daTaiDuLieu.has(ten)) {
      const r = await fetch(DU_LIEU_DIR + ten, { cache: 'force-cache' });
      // Thiếu file thì PHẢI nổ ở đây. Để nó chạy tiếp là mã học viên nhận
      // FileNotFoundError ở giữa bài và họ đi tìm lỗi trong code của mình.
      if (!r.ok) throw new Error(`không tải được dữ liệu ${ten} (${r.status})`);
      daTaiDuLieu.set(ten, await r.text());
    }
    ra.push({ name: ten, content: daTaiDuLieu.get(ten), kind: 'data' });
  }
  return ra;
}
const IMPORT_TO_PACKAGE = Object.fromEntries(Object.entries(PACKAGES).map(([pkg, mod]) => [mod, pkg]));
/** Gói đã tải VÀ đã import sẵn trong runtime đang giữ. */
const warmed = new Set();

/** Gói bài cần: khai trong bài + dò `import` trong chính code sẽ chạy. */
function packagesFor(py, declared, code) {
  const wanted = new Set(declared.filter((name) => name in PACKAGES));
  let found = null;
  try {
    found = py.pyodide_py.code.find_imports(String(code));
    for (const name of found.toJs()) {
      const pkg = IMPORT_TO_PACKAGE[String(name).split('.')[0]];
      if (pkg) wanted.add(pkg);
    }
  } catch {
    // Code lỗi cú pháp: để lần chạy thật báo lỗi cho học viên.
  } finally {
    found?.destroy?.();
  }
  return [...wanted].filter((name) => !warmed.has(name));
}

/**
 * Tải gói rồi import sẵn (_studio_preload) TRƯỚC khi báo 'ready'. Vì sao phải
 * import luôn: `import pandas` / `matplotlib.pyplot` tốn vài giây trong Pyodide —
 * nếu để rơi vào cửa sổ 5 giây của lần chạy, bài đúng cũng bị cắt ở lần bấm đầu.
 */
async function warmPackages(py, names) {
  if (!names.length) return;
  await py.loadPackage(names, { messageCallback: () => {}, errorCallback: () => {} });
  const preload = py.globals.get('_studio_preload');
  try {
    preload(JSON.stringify(names));
  } finally {
    preload.destroy();
  }
  names.forEach((name) => warmed.add(name));
}

async function getRuntime() {
  if (runtime) return runtime;
  // import() động chứ không import tĩnh ở đầu file: runtime ~13 MB chỉ được nạp
  // khi thật sự cần chạy code, không phải lúc worker vừa sinh ra.
  const { loadPyodide } = await import(PYODIDE_DIR + 'pyodide.mjs');
  const box = { stray: '' };
  const write = (line) => {
    if (box.stray.length < 4000) box.stray += line.slice(0, 4000 - box.stray.length) + '\n';
  };
  const [py, harness] = await Promise.all([
    loadPyodide({ indexURL: PYODIDE_DIR, stdout: write, stderr: write }),
    // no-cache = vẫn dùng bản trong cache nhưng hỏi lại server (ETag), để bộ
    // chấm luôn khớp với ca kiểm thử vừa nạp vào bài.
    fetch('/static/js/studio-harness.py', { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`không tải được bộ chấm (${r.status})`);
      return r.text();
    }),
  ]);
  await py.runPythonAsync(harness);
  runtime = { py, box };
  return runtime;
}

self.onmessage = async ({ data }) => {
  // Làm ấm: nạp runtime rồi báo rảnh, KHÔNG chấm gì. Phía React gửi tin này
  // lúc học viên vừa mở bài, trong khi họ còn đang đọc các màn đầu.
  if (data && data.type === 'warmup') {
    try {
      const { py } = await getRuntime();
      // Bài có khai packages: tải + import luôn lúc học viên còn đọc các màn đầu.
      if (Array.isArray(data.packages)) await warmPackages(py, packagesFor(py, data.packages.map(String), ''));
      self.postMessage({ type: 'ready' });
      self.postMessage({ type: 'idle' });
    } catch (error) {
      self.postMessage({
        type: 'result',
        tests: [],
        output: '',
        error: `Không chạy được Python: ${error.message}`,
        duration: 0,
        version: '',
      });
    }
    return;
  }

  try {
    const tests = Array.isArray(data.tests) ? data.tests : [];
    const forbid = Array.isArray(data.forbid) ? data.forbid : [];
    const files = Array.isArray(data.files) ? data.files : [];
    // Tên file dữ liệu bài khai (step_4.dataFiles) — nội dung tải ở dưới.
    const dataFiles = Array.isArray(data.dataFiles) ? data.dataFiles : [];
    // stdin: các dòng input() sẽ đọc lần lượt. Hợp đồng với phía React —
    // tên trường này cố định, đừng đổi.
    const stdin = Array.isArray(data.stdin) ? data.stdin.map(String) : [];
    // Hợp đồng gọi cho ca chấm dạng DỮ LIỆU (`input`/`expected`). `null` khi
    // bài dùng ca dạng biểu thức của pe-v4 — bộ chấm phân nhánh theo trường có
    // mặt trong từng ca, nên hai dạng dùng chung một đường thông điệp.
    const contract = data.contract && typeof data.contract === 'object' ? data.contract : null;

    // Cheap source check first: no point booting a 10 MB runtime to reject this.
    const banned = forbid.filter((token) => String(data.code).includes(token));
    if (banned.length) {
      self.postMessage({
        type: 'result',
        tests: [],
        output: '',
        error: `Bài này không cho phép dùng: ${banned.join(', ')}`,
        duration: 0,
        version: '',
      });
      return;
    }

    // Runtime Pyodide nằm trong repo (frontend/public/pyodide/v0.27.7/, ~13 MB:
    // pyodide.js + asm.js + asm.wasm + python_stdlib.zip + pyodide-lock.json).
    // Trước đây nạp từ cdn.jsdelivr.net: hai khoá Python chết theo một CDN bên
    // thứ ba, và CSP phải mở connect-src ra domain đó. Cùng origin thì bỏ được
    // cả hai, và bản runtime luôn khớp với bộ chấm trong cùng commit.
    const { py, box } = await getRuntime();
    // Chỉ phía React mới (gửi trường `packages`) hiểu thông điệp 'loading';
    // React cũ coi mọi thông điệp lạ là kết quả, nên với nó thì im lặng.
    if (Array.isArray(data.packages)) {
      const missing = packagesFor(py, data.packages.map(String), data.code);
      if (missing.length) {
        self.postMessage({ type: 'loading', packages: missing });
        await warmPackages(py, missing);
      }
    }
    // FILE DỮ LIỆU: tải TRƯỚC khi báo 'ready'. Vì sao đúng chỗ này — phía React
    // bắt đầu đếm 5 giây của học viên từ lúc nhận 'ready' (DEFAULT_LIMITS.execMs),
    // nên một file 1,29 MB tải sau đó sẽ ăn vào hạn chạy của họ. Trước 'ready'
    // thì nó nằm trong hạn NẠP (readyMs 60 s), đúng chỗ của việc tải thư viện —
    // cùng bài học mà `loadPackage` đã học được (xem warmPackages).
    const fileDuLieu = dataFiles.length ? await taiDuLieu(dataFiles) : [];
    // Print nào lọt ra ngoài bộ chấm (hiếm) vẫn được giữ lại để hiện cho học
    // viên. Dọn trước mỗi lần chạy vì runtime nay dùng lại giữa các lần.
    box.stray = '';
    self.postMessage({ type: 'ready' });
    const started = performance.now();
    const grade = py.globals.get('_studio_main');
    const result = JSON.parse(
      // File dữ liệu đứng TRƯỚC `files` của bài: bộ chấm dựng một dict theo tên
      // nên mục sau ghi đè mục trước, và nội dung do tác giả viết thẳng trong
      // bài là thứ cụ thể hơn — nó phải thắng.
      grade(String(data.code), JSON.stringify(tests),
        JSON.stringify([...fileDuLieu, ...files]), JSON.stringify(stdin),
        'null', JSON.stringify(contract)),
    );
    grade.destroy();
    self.postMessage({
      type: 'result',
      ...result,
      output: (result.output || '') + box.stray,
      duration: Math.round(performance.now() - started),
    });
    // Báo rảnh để phía React biết worker này dùng lại được cho lần chạy sau.
    self.postMessage({ type: 'idle' });
  } catch (error) {
    self.postMessage({
      type: 'result',
      tests: [],
      output: '',
      error: `Không chạy được Python: ${error.message}`,
      duration: 0,
      version: '',
    });
  }
};
