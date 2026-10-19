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
/* global importScripts, loadPyodide */

// Đường dẫn CÙNG ORIGIN tới runtime đã commit vào repo. Root-relative chứ
// không '../../pyodide/…' để khỏi phụ thuộc vào vị trí của chính file worker,
// giống fetch('/static/js/studio-harness.py') bên dưới.
const PYODIDE_DIR = '/pyodide/v0.27.7/';

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
const PACKAGES = { numpy: 'numpy', pandas: 'pandas', matplotlib: 'matplotlib', sqlite3: 'sqlite3' };
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
  importScripts(PYODIDE_DIR + 'pyodide.js');
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

// Động cơ mini-game: file Python riêng, nạp LƯỜI vào chính runtime này (không
// dựng Pyodide thứ hai — hai bản là gấp đôi ~13 MB và gấp đôi RAM của máy học
// viên). Mỗi động cơ sống trong namespace riêng để tên của nó không đè lên tên
// của bộ chấm studio-harness.py. Vì đi qua cùng worker và cùng thông điệp
// 'ready'/'result'/'idle', phía React (runner/pyodide-runner.ts) vẫn bấm 5 giây
// rồi terminate() như mọi lượt chạy: vòng lặp vô hạn mà động cơ không tự cắt
// được (một BIỂU THỨC chạy mãi) vẫn bị cắt.
const ENGINES = {
  'so-quy': { file: '/static/js/so-quy.py', main: '_so_quy_main' },
};
/** Tên động cơ → hàm main (PyProxy) đã nạp. */
const engineMains = new Map();
let pythonVersion = '';

async function engineMain(py, kind) {
  if (engineMains.has(kind)) return engineMains.get(kind);
  const spec = ENGINES[kind];
  if (!spec) throw new Error(`không có động cơ mini-game "${kind}"`);
  const res = await fetch(spec.file, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`không tải được động cơ mini-game (${res.status})`);
  const ns = py.globals.get('dict')();
  py.runPython(await res.text(), { globals: ns });
  const main = ns.get(spec.main);
  ns.destroy();
  engineMains.set(kind, main);
  return main;
}

async function runEngine(engine, code) {
  try {
    const { py, box } = await getRuntime();
    const main = await engineMain(py, String(engine.kind));
    if (!pythonVersion) pythonVersion = py.runPython('__import__("sys").version.split()[0]');
    box.stray = '';
    self.postMessage({ type: 'ready' });
    const started = performance.now();
    // Động cơ tự bắt mọi lỗi của code người học và trả vết có `loi`.
    const trace = JSON.parse(main(String(code), JSON.stringify(engine.config ?? {})));
    self.postMessage({
      type: 'result',
      tests: [],
      output: (trace.in_ra || '') + box.stray,
      trace,
      duration: Math.round(performance.now() - started),
      version: pythonVersion,
    });
    self.postMessage({ type: 'idle' });
  } catch (error) {
    self.postMessage({
      type: 'result',
      tests: [],
      output: '',
      error: `Không chạy được mini-game: ${error.message}`,
      duration: 0,
      version: '',
    });
  }
}

self.onmessage = async ({ data }) => {
  // Mini-game có động cơ riêng (bài T05 · Sổ quỹ chung): không chấm ca nào.
  if (data && data.engine && data.type !== 'warmup') {
    await runEngine(data.engine, data.code);
    return;
  }
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
    // stdin: các dòng input() sẽ đọc lần lượt. Hợp đồng với phía React —
    // tên trường này cố định, đừng đổi.
    const stdin = Array.isArray(data.stdin) ? data.stdin.map(String) : [];

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
    // Print nào lọt ra ngoài bộ chấm (hiếm) vẫn được giữ lại để hiện cho học
    // viên. Dọn trước mỗi lần chạy vì runtime nay dùng lại giữa các lần.
    box.stray = '';
    self.postMessage({ type: 'ready' });
    const started = performance.now();
    const grade = py.globals.get('_studio_main');
    const result = JSON.parse(
      grade(String(data.code), JSON.stringify(tests), JSON.stringify(files), JSON.stringify(stdin)),
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
