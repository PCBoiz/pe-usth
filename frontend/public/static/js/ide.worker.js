/*
 * Chạy mã của /ide bằng Pyodide NGAY TRONG TRÌNH DUYỆT, thay cho đường
 * POST /api/python/run → container Docker ở backend.
 *
 * VÌ SAO: sản phẩm đang có HAI đường chạy mã ngược nhau — trang bài học chạy
 * Pyodide ở client, /ide gửi lên máy chủ — và hai đường còn chạy hai Python
 * khác nhau (ảnh sandbox là python:3.12-slim, bài học là 3.14.2). Cố vấn dự án
 * cũng đã chốt: đừng chạy mã học viên ở backend. Thêm nữa, máy chạy hiện tại
 * phục vụ ĐÚNG HAI lượt song song; ở client thì bằng số máy học viên.
 *
 * ĐÂY LÀ MODULE WORKER. Pyodide 314 bỏ hẳn hỗ trợ classic worker và không còn
 * phát hành `pyodide.js`, nên runtime nạp bằng `await import(... '.mjs')` và
 * phía React phải tạo bằng `new Worker(url, { type: 'module' })`.
 *
 * KHÔNG tự cắt được vòng lặp vô hạn: `runPythonAsync` chặn luôn vòng lặp sự
 * kiện của worker nên worker không nghe được thông điệp nào trong lúc chạy.
 * Phía React đếm giờ rồi `terminate()` từ bên ngoài — giống hệt cách
 * studio-lesson.worker.js đang làm. Đừng bỏ worker để chạy ở main thread:
 * `window.prompt` có vẻ giải quyết được stdin, nhưng README của replit/jsrepl
 * ghi lại đúng cái giá của nó — mất Web Worker, tức mất luôn cách duy nhất cắt
 * được vòng lặp vô hạn.
 */

const PYODIDE_DIR = '/pyodide/v314.0.7/';

/** Runtime được GIỮ LẠI giữa các lần chạy: nạp lại ~13 MB mỗi lần bấm Chạy là vô lý. */
let runtime = null;

/** Gói tự lưu trữ trong PYODIDE_DIR. `sqlite3` KHÔNG có ở đây: từ bản 314 nó là
 *  stdlib, và khai nó làm `loadPackage` ném "No known package" rồi giết cả lần chạy. */
const PACKAGES = { numpy: 'numpy', pandas: 'pandas', matplotlib: 'matplotlib', tzdata: 'zoneinfo' };

async function getRuntime() {
  if (runtime) return runtime;
  // import() động chứ không tĩnh ở đầu file: runtime chỉ nạp khi thật sự cần.
  const { loadPyodide } = await import(PYODIDE_DIR + 'pyodide.mjs');
  const box = { out: '', err: '' };
  const them = (khoa) => (dong) => {
    // Trần 60 000 ký tự mỗi luồng: đủ cho mọi bài, và chặn một vòng lặp print
    // làm phình thông điệp postMessage tới mức treo tab.
    if (box[khoa].length < 60000) box[khoa] += dong.slice(0, 60000 - box[khoa].length) + '\n';
    else box.cat = true;
  };
  const py = await loadPyodide({ indexURL: PYODIDE_DIR, stdout: them('out'), stderr: them('err') });
  // matplotlib trong worker KHÔNG có DOM: backend mặc định của Pyodide là
  // matplotlib_pyodide, nó `from js import document` và nổ ngay lúc import.
  // Agg vẽ ra bộ nhớ, `plt.show()` thành không-làm-gì kèm một cảnh báo.
  py.runPython('import os; os.environ["MPLBACKEND"] = "Agg"');
  runtime = { py, box };
  return runtime;
}

/** Gói bài cần: dò `import` trong chính mã sắp chạy. */
function packagesFor(code) {
  const can = new Set();
  for (const [goi, mod] of Object.entries(PACKAGES)) {
    // Bắt cả `import numpy`, `import numpy as np`, `from numpy import ...`,
    // và `zoneinfo` (ẩn sau pandas tz_convert) — dò thô là đủ, nhầm thừa chỉ
    // tốn một lần tải, nhầm thiếu thì mã nổ.
    const re = new RegExp(`(^|\\n)\\s*(import|from)\\s+${mod}\\b`);
    if (re.test(code) || (mod === 'zoneinfo' && /tz_convert|tz_localize|ZoneInfo\(/.test(code))) {
      can.add(goi);
    }
  }
  return [...can];
}

const warmed = new Set();

async function run(code) {
  const { py, box } = await getRuntime();
  box.out = '';
  box.err = '';
  box.cat = false;

  // Tải gói TRƯỚC khi bấm giờ: `import pandas` lần đầu tốn vài giây, tính vào
  // thời gian chạy thì người học tưởng mã của mình chậm.
  const can = packagesFor(code).filter((p) => !warmed.has(p));
  if (can.length) {
    await py.loadPackage(can, { messageCallback: () => {} });
    can.forEach((p) => warmed.add(p));
  }

  const t0 = performance.now();
  let exitCode = 0;
  try {
    // Tên file 'main.py' là hằng số CHUNG của dự án: pe_tracer.py lọc sự kiện
    // theo `co_filename == "main.py"`, studio-harness.py compile mã học viên
    // với đúng tên đó, và bộ đo độ hiệu quả cũng lọc theo nó. Đừng đổi lẻ.
    py.globals.set('__ide_src', code);
    await py.runPythonAsync(
      'import sys\n'
      + 'try:\n'
      + '    exec(compile(__ide_src, "main.py", "exec"), {"__name__": "__main__"})\n'
      + 'except SystemExit as e:\n'
      // CPython: `sys.exit("lời nhắn")` IN lời nhắn ra stderr rồi thoát 1. Bắt
      // SystemExit mà quên in thì người học gọi sys.exit("thiếu dữ liệu") sẽ
      // thấy một ô console trống và không hiểu vì sao chương trình dừng.
      + '    if e.code is None:\n'
      + '        sys.__ide_exit = 0\n'
      + '    elif isinstance(e.code, int):\n'
      + '        sys.__ide_exit = e.code\n'
      + '    else:\n'
      + '        print(e.code, file=sys.stderr)\n'
      + '        sys.__ide_exit = 1\n'
      + 'else:\n'
      + '    sys.__ide_exit = 0\n',
    );
    exitCode = py.runPython('import sys; getattr(sys, "__ide_exit", 0)');
  } catch (error) {
    // Traceback của mã người học đã ra stderr qua stdout/stderr hook; ở đây chỉ
    // còn việc nói rằng chương trình kết thúc bằng lỗi. Mã thoát 1 là quy ước
    // của CPython khi một ngoại lệ không được bắt thoát ra tới đỉnh.
    exitCode = 1;
    const text = String(error && error.message ? error.message : error);
    if (!box.err.includes(text.slice(0, 40))) box.err += text + '\n';
  } finally {
    py.globals.delete('__ide_src');
  }

  return {
    stdout: box.out,
    stderr: box.err,
    exitCode,
    // Hết giờ KHÔNG bao giờ được báo từ đây: worker đang bị chặn thì không gửi
    // được gì cả. Phía React đặt cờ này khi chính nó terminate() worker.
    timedOut: false,
    outputTruncated: Boolean(box.cat),
    durationMs: Math.round(performance.now() - t0),
    queuedMs: 0,
  };
}

/**
 * "Xem từng bước": chạy CHÍNH `pe_tracer.py` của backend, nhưng trong worker.
 *
 * Tracer được sinh ra cùng một lượt với bản nhúng cho backend
 * (`node scripts/build-tracer-source.mjs` ghi cả `tracer-source.ts` lẫn
 * `/static/py/pe_tracer.min.py`), nên hai đường cho ra CÙNG một vết. Đừng chép
 * tay bản thứ hai: hai bản lệch nhau thì cùng một đoạn mã cho hai kết quả khác
 * nhau tuỳ đường nào chạy, và không ai thấy cho tới khi so bằng mắt.
 *
 * Đo trước khi làm: tracer chạy trong Pyodide chậm hơn CPython native 2,1–3,3×,
 * ca xấu nhất 86 ms — trong khi thứ nó thay thế là 200–600 ms khởi động
 * container. Vết sinh ra giống hệt từng byte.
 *
 * HAI CHỖ PHẢI VÁ, và cả hai đều vì ở đây không có tiến trình con:
 *  · `_pe_write(fd, doc)` ghi JSON ra file descriptor, kẹp giữa hai mốc, để
 *    backend tách khỏi stdout của subprocess. Trong worker thì không có
 *    subprocess nào — giữ thẳng `doc` lại, vừa đúng hơn vừa khỏi đẩy 2 MB JSON
 *    qua đường stdout.
 *  · `_finish_and_exit` gọi `os._exit(0)` để mã người học không chen được vào
 *    giữa "đã in vết" và "đã thoát". Trong worker, `os._exit` giết luôn runtime
 *    đang được giữ lại — đổi thành ném một ngoại lệ riêng, bắt ngay bên dưới.
 */
let tracerSrc = null;

async function trace(code) {
  const { py, box } = await getRuntime();
  box.out = '';
  box.err = '';
  if (tracerSrc === null) {
    // no-cache: vẫn dùng bản trong cache nhưng hỏi lại server (ETag), để vết
    // luôn khớp với tracer vừa được sinh lại.
    const r = await fetch('/static/py/pe_tracer.min.py', { cache: 'no-cache' });
    if (!r.ok) throw new Error(`không tải được bộ ghi vết (${r.status})`);
    tracerSrc = await r.text();
  }
  await py.runPythonAsync(tracerSrc);
  py.globals.set('__ide_src', code);
  const t0 = performance.now();
  const raw = await py.runPythonAsync(
    'import base64, json, os, zlib\n'
    + 'class _IdeExit(BaseException):\n'
    + '    pass\n'
    + '_ide_doc = {}\n'
    + 'def _ide_write(fd, doc):\n'
    + '    _ide_doc["d"] = doc\n'
    + 'def _ide_exit(code=0):\n'
    + '    raise _IdeExit()\n'
    + '_ide_saved_write, _ide_saved_exit = _pe_write, os._exit\n'
    + 'globals()["_pe_write"], os._exit = _ide_write, _ide_exit\n'
    + 'try:\n'
    + '    _pe_run(base64.b64encode(zlib.compress(__ide_src.encode("utf-8"))).decode("ascii"))\n'
    + 'except (_IdeExit, SystemExit):\n'
    + '    pass\n'
    + 'finally:\n'
    + '    globals()["_pe_write"], os._exit = _ide_saved_write, _ide_saved_exit\n'
    + 'json.dumps(_ide_doc.get("d") or {}, ensure_ascii=False)\n',
  );
  py.globals.delete('__ide_src');
  const doc = JSON.parse(raw);
  return {
    trace: doc,
    run: {
      // Tracer luôn in được vết rồi mới dừng, kể cả khi chạm trần — nên "thoát
      // 0" ở đây nói về LƯỢT GHI VẾT, không phải về chương trình của người học.
      // Lý do dừng thật nằm trong `doc.stopReason`.
      exitCode: 0,
      timedOut: doc.stopReason === 'time-limit',
      outputTruncated: Boolean(doc.stdoutTruncated || doc.stderrTruncated),
      durationMs: Math.round(performance.now() - t0),
      queuedMs: 0,
    },
  };
}

self.onmessage = async ({ data }) => {
  if (data && data.type === 'warmup') {
    try {
      await getRuntime();
      self.postMessage({ type: 'ready' });
    } catch (error) {
      self.postMessage({ type: 'fatal', message: String(error && error.message ? error.message : error) });
    }
    return;
  }
  if (!data || (data.type !== 'run' && data.type !== 'trace')) return;
  try {
    const result = data.type === 'trace'
      ? await trace(String(data.code ?? ''))
      : await run(String(data.code ?? ''));
    self.postMessage({ type: 'result', result });
  } catch (error) {
    // Lỗi của HẠ TẦNG (không nạp được runtime, không tải được gói) — khác hẳn
    // lỗi trong chương trình của người học, vốn nằm trong result.stderr.
    self.postMessage({ type: 'fatal', message: String(error && error.message ? error.message : error) });
  }
};
