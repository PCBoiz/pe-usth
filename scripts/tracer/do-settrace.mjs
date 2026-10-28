/**
 * ĐO hệ số chậm của `sys.settrace` dưới Pyodide — TRONG MODULE WORKER THẬT.
 *
 * VÌ SAO TỒN TẠI: hai hằng `maxBytes`/`timeBudgetMs` trong `scripts/tracer/pe_tracer.py`
 * từng được biện minh bằng hạ tầng đã bị xoá ngày 25/10/2026 (MAX_BUFFER 1 MB của
 * `docker-sandbox.ts`, container bị giết ở 10 s). Hiệu chỉnh lại chúng cần số đo,
 * và KHÔNG có nguồn nào trên thế giới lượng hoá chi phí `sys.settrace` dưới WASM —
 * không bài báo, không benchmark, không issue. Tham chiếu desktop duy nhất là ~5×
 * (hook trace viết bằng Python, benchmark của coverage.py) và 1,19×
 * (`sys.monitoring` tự báo), mà WASM không có JIT-tier như CPython desktop nên hệ
 * số có thể khác hẳn. Nên phép đo phải tự làm — và giữ lại để lần sau khỏi đoán.
 *
 * VÌ SAO KHÔNG ĐO BẰNG NODE: Node chạy Pyodide trên V8 có JIT đầy đủ và không có
 * worker + postMessage + structured clone. Thứ cần biết là giá mà NGƯỜI HỌC trả,
 * nên phép đo phải diễn ra ở đúng chỗ mã của họ chạy: `ide.worker.js` (module
 * worker), tải cùng origin, với `/static/py/pe_tracer.min.py` thật.
 *
 * CÁCH LÀM: dựng một máy chủ tĩnh trên `frontend/public` (nên worker, runtime
 * Pyodide và bản tracer rút gọn đều CÙNG ORIGIN như trên production), mở
 * Chromium bằng Playwright (đã có trong frontend/node_modules), rồi điều khiển
 * `ide.worker.js` bằng đúng ba thông điệp mà giao diện dùng: `warmup`, `run`,
 * `trace`. Mỗi đoạn mẫu chạy nhiều lượt, BỎ LƯỢT ĐẦU (nó gồm chi phí làm nóng:
 * nạp wheel, import pandas/numpy, định nghĩa lại tracer) và báo TRUNG VỊ.
 *
 * Chạy:
 *   node scripts/tracer/do-settrace.mjs
 *   node scripts/tracer/do-settrace.mjs --runs=9 --sample=pandas --headed
 *   node scripts/tracer/do-settrace.mjs --cham            # thêm 3 ca chậm (vòng lặp
 *                                                         # vô hạn, sleep sau trần
 *                                                         # bước) — tốn ~25 giây
 *
 * Số đo ngày 28/10/2026 nằm trong `ghi-chu-local/reports/` và trong chú thích
 * của `PE_LIMITS`. Đo lại sau mỗi lần nâng Pyodide: cả hệ số lẫn trần đều treo
 * vào runtime, không vào mã này.
 */
import { createRequire } from 'node:module';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC = join(ROOT, 'frontend', 'public');

const argv = process.argv.slice(2);
const soLuot = Number(/^--runs=(\d+)$/.exec(argv.find((a) => a.startsWith('--runs=')) ?? '')?.[1] ?? 7);
const locTen = /^--sample=(.+)$/.exec(argv.find((a) => a.startsWith('--sample=')) ?? '')?.[1] ?? '';
const coDauDau = argv.includes('--headed');
const themCham = argv.includes('--cham');

/*
 * Đoạn mẫu chọn theo HAI DÂN SỐ MÃ của khoá 172 bài, vì bằng chứng của dân số
 * này không chuyển sang được dân số kia:
 *   · 82 bài mã vô hướng/điều khiển luồng (PY·SY·CT·GU·EX·RC) — nhiều sự kiện
 *     `line`, `call`, `return`, đúng thứ bộ ghi vết sinh ra để hiện;
 *   · 90 bài mã dữ liệu (NP·PD·VZ·RD) — `df.groupby().agg()` là MỘT bước, một
 *     object mờ, vì tracer lọc theo `co_filename` nên ruột pandas bị bỏ hết.
 * Thiếu nhóm thứ hai thì hệ số đo được sẽ bị thổi lên cho cả khoá.
 */
const MAU = {
  'a-vong-lap-300': [
    'total = 0',
    'for i in range(300):',
    '    total += i * 2',
    'print(total)',
  ].join('\n'),
  'b-de-quy-fib10': [
    'def fib(n):',
    '    if n < 2:',
    '        return n',
    '    return fib(n - 1) + fib(n - 2)',
    '',
    'print(fib(10))',
  ].join('\n'),
  'c-chuoi-va-list': [
    'words = []',
    'for i in range(120):',
    '    words.append("so-" + str(i))',
    'joined = ",".join(words)',
    'print(len(joined), words[-1])',
  ].join('\n'),
  'd-pandas-groupby': [
    'import pandas as pd',
    '',
    'df = pd.DataFrame({',
    '    "nhom": ["a", "b", "a", "c", "b", "a"] * 500,',
    '    "diem": list(range(3000)),',
    '})',
    'tong = df.groupby("nhom").agg({"diem": ["sum", "mean", "count"]})',
    'print(tong.shape)',
    'print(tong.to_string()[:80])',
  ].join('\n'),
  'e-numpy-vector': [
    'import numpy as np',
    '',
    'a = np.arange(100000, dtype=float)',
    'b = np.sin(a) + np.cos(a) * 2',
    'print(round(float(b.sum()), 3), b.shape)',
  ].join('\n'),
  // Vượt TRẦN BƯỚC: 40 005 sự kiện, chỉ 1 000 được ghi. Đo chi phí của 39 005 sự
  // kiện CÒN LẠI — vì `watchdog` là False trong Pyodide nên callback KHÔNG được
  // tắt sau khi chạm trần, mỗi sự kiện vẫn phải đi qua một lời gọi Python.
  'f-vuot-tran-buoc': [
    'total = 0',
    'for i in range(20000):',
    '    total += i % 7',
    'print(total)',
  ].join('\n'),
  // Vượt TRẦN BYTE: 400 dict trong một list, mỗi bước chụp lại cả list nên JSON
  // phình bình phương. Đây là ca cho thấy trần BYTE mới là trần cắn thật, không
  // phải trần bước.
  'g-vuot-tran-byte': [
    'rows = []',
    'for i in range(400):',
    '    rows.append({"id": i, "ten": "hoc-vien-" + str(i)})',
    'print(len(rows))',
  ].join('\n'),
  'h-ma-tran-60x60': [
    'm = []',
    'for i in range(60):',
    '    hang = []',
    '    for j in range(60):',
    '        hang.append(i * j)',
    '    m.append(hang)',
    'print(len(m), m[-1][-1])',
  ].join('\n'),
};

/*
 * Ca chậm: mỗi ca tốn gần hết trần thời gian, nên chỉ chạy khi có --cham.
 *
 * CHỈ GHI VẾT, không có dãy đối chứng "chạy không trace": `while True` không
 * trace thì không bao giờ trả lời (worker bị chặn, chỉ `terminate()` từ ngoài
 * cắt được), nên một dãy đối chứng ở đây là treo cả phép đo 90 giây rồi chết.
 * Thứ cần biết ở hai ca này không phải hệ số mà là LÝ DO DỪNG và thời điểm dừng.
 */
const MAU_CHAM = {
  'x-vong-lap-vo-han': 'i = 0\nwhile True:\n    i += 1',
  // Chạm trần BƯỚC rồi RỜI khỏi main.py: không còn sự kiện nào để callback đo
  // giờ. Không có SIGALRM trong Pyodide nên không ai cắt được — ca này chứng
  // minh `timeBudgetMs` chỉ là trần MỀM.
  'y-tran-buoc-roi-ngu': [
    'import time',
    'for i in range(600):',
    '    pass',
    'time.sleep(8)',
    'print("xong", i)',
  ].join('\n'),
};
const CHI_GHI_VET = new Set(Object.keys(MAU_CHAM));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.py': 'text/plain; charset=utf-8',
  '.zip': 'application/zip',
  '.whl': 'application/octet-stream',
  '.data': 'application/octet-stream',
  '.ts': 'application/octet-stream',
};

// Trang chủ RỖNG, chỉ để worker có một origin để sinh ra từ. Cố ý không nạp
// Next.js: thứ đang đo là worker, không phải giao diện.
const TRANG = '<!doctype html><meta charset="utf-8"><title>do-settrace</title><body>';

function dungMayChu() {
  const server = createServer((req, res) => {
    const duong = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (duong === '/' || duong === '/index.html') {
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(TRANG);
      return;
    }
    // normalize + chặn `..`: máy chủ này chỉ phục vụ frontend/public.
    const tuongDoi = normalize(duong).replace(/^[\\/]+/, '');
    const tep = join(PUBLIC, tuongDoi);
    if (!tep.startsWith(PUBLIC) || !existsSync(tep) || !statSync(tep).isFile()) {
      res.writeHead(404).end('404');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[extname(tep).toLowerCase()] ?? 'application/octet-stream',
      'content-length': String(statSync(tep).size),
    });
    createReadStream(tep).pipe(res);
  });
  return new Promise((res) => server.listen(0, '127.0.0.1', () => res(server)));
}

/*
 * Bộ điều khiển worker, CHẠY TRONG TRANG. Viết thành một chuỗi hàm vì nó phải
 * được `page.evaluate` đưa vào ngữ cảnh trình duyệt — không chia sẻ được biến
 * nào với tiến trình Node này.
 */
const TRONG_TRANG = async ({ mau, soLuot, chiGhiVet }) => {
  const w = new Worker('/static/js/ide.worker.js', { type: 'module' });
  // Hướng SỰ KIỆN, không poll: poll 25 ms cộng tới 25 ms rác vào mỗi phép đo,
  // đủ để dìm hẳn chi phí postMessage của một tài liệu 700 KB (~18 ms).
  const hoi = (msg, ms = 120000) => new Promise((res, rej) => {
    const hen = setTimeout(() => rej(new Error('worker không trả lời trong ' + ms + ' ms')), ms);
    w.onmessage = (e) => {
      if (!e.data || e.data.type === 'partial') return;
      clearTimeout(hen);
      w.onmessage = null;
      res(e.data);
    };
    w.postMessage(msg);
  });
  const med = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };

  const ready = await hoi({ type: 'warmup' });
  if (ready.type !== 'ready') return { loi: 'warmup thất bại: ' + JSON.stringify(ready) };

  // `watchdog` của tracer bật được hay không quyết định hệ số chậm ở vòng lặp
  // dài: bật thì callback bị TẮT sau khi chạm trần bước, tắt thì nó còn nguyên.
  // Đo bằng chính runtime, không suy từ tài liệu.
  const probe = await hoi({
    type: 'run',
    code: [
      'import signal',
      'print("setitimer", hasattr(signal, "setitimer"))',
      'print("SIGALRM", hasattr(signal, "SIGALRM"))',
      'import sys; print("version", sys.version.split()[0])',
      'import platform; print("platform", platform.platform())',
    ].join('\n'),
  });

  const bang = [];
  for (const [ten, code] of Object.entries(mau)) {
    const chay = [];
    const vet = [];
    const noiBo = [];
    const vong = [];
    let meta = null;
    let loi = null;
    // CHẠY TRƯỚC, GHI VẾT SAU — bắt buộc: `trace()` trong ide.worker.js KHÔNG
    // gọi loadPackage, nên bài pandas/numpy chỉ chạy được nếu một lượt `run`
    // trước đó đã nạp wheel và import sẵn.
    const luotChay = chiGhiVet.includes(ten) ? 0 : soLuot;
    for (let i = 0; i < luotChay; i++) {
      const r = await hoi({ type: 'run', code }, 90000);
      if (r.type !== 'result') { loi = JSON.stringify(r).slice(0, 300); break; }
      if (r.result.stderr) { loi = 'stderr: ' + r.result.stderr.slice(0, 300); break; }
      chay.push(r.result.durationMs);
    }
    if (!loi) {
      for (let i = 0; i < soLuot; i++) {
        const t0 = performance.now();
        const r = await hoi({ type: 'trace', code }, 90000);
        if (r.type !== 'result') { loi = JSON.stringify(r).slice(0, 300); break; }
        vong.push(performance.now() - t0);
        vet.push(r.result.run.durationMs);
        noiBo.push(r.result.trace.stats.elapsedMs);
        meta = {
          buoc: r.result.trace.stats.steps,
          suKien: r.result.trace.stats.events,
          lyDoDung: r.result.trace.stopReason,
          loiTrongMa: r.result.trace.error && r.result.trace.error.type,
          jsonKB: Math.round(JSON.stringify(r.result.trace).length / 1024),
        };
      }
    }
    if (loi) { bang.push({ ten, loi }); continue; }
    // Bỏ lượt ĐẦU của mỗi dãy: nó gồm chi phí làm nóng (nạp wheel + import ở
    // dãy `run`, định nghĩa lại tracer ở dãy `trace`).
    const bo = (xs) => (xs.length > 1 ? xs.slice(1) : xs);
    const cMed = chay.length ? med(bo(chay)) : null;
    const vMed = med(bo(vet));
    bang.push({
      ten,
      chayMed: cMed,
      vetMed: vMed,
      noiBoMed: med(bo(noiBo)),
      vongMed: Math.round(med(bo(vong))),
      heSo: cMed === null ? null : +(vMed / Math.max(cMed, 0.001)).toFixed(2),
      ...meta,
      chayRaw: chay,
      vetRaw: vet,
    });
  }
  w.terminate();
  return { probe: probe.result ? probe.result.stdout : String(probe.type), bang };
};

const require = createRequire(join(ROOT, 'frontend', 'package.json'));
const { chromium } = require('playwright');

const server = await dungMayChu();
const cong = server.address().port;
const browser = await chromium.launch({ headless: !coDauDau });
let ketQua;
try {
  const page = await browser.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') process.stderr.write(`[console] ${m.text()}\n`);
  });
  page.on('pageerror', (e) => process.stderr.write(`[pageerror] ${e.message}\n`));
  await page.goto(`http://127.0.0.1:${cong}/`);
  const mau = Object.fromEntries(
    Object.entries({ ...MAU, ...(themCham ? MAU_CHAM : {}) })
      .filter(([ten]) => !locTen || ten.includes(locTen)),
  );
  if (!Object.keys(mau).length) throw new Error(`--sample=${locTen} không khớp đoạn mẫu nào`);
  ketQua = await page.evaluate(TRONG_TRANG, { mau, soLuot, chiGhiVet: [...CHI_GHI_VET] });
} finally {
  await browser.close();
  server.close();
}

if (ketQua.loi) {
  process.stderr.write(ketQua.loi + '\n');
  process.exit(1);
}

process.stdout.write(`\nRuntime trong worker:\n${ketQua.probe.replace(/^/gm, '  ')}\n`);
process.stdout.write(
  `  => setitimer KHÔNG có nghĩa là st["watchdog"] = False: callback KHÔNG bị tắt\n`
  + `     sau khi chạm trần bước, và timeBudgetMs chỉ còn được canh bởi chính callback.\n\n`,
);
process.stdout.write(`Trung vị của ${soLuot - 1} lượt (đã bỏ lượt làm nóng đầu tiên):\n\n`);
process.stdout.write(
  '| đoạn mẫu | chạy (ms) | ghi vết (ms) | trong tracer (ms) | hệ số | bước/sự kiện | lý do dừng | JSON |\n'
  + '|---|---:|---:|---:|---:|---:|---|---:|\n',
);
for (const r of ketQua.bang) {
  if (r.loi) {
    process.stdout.write(`| ${r.ten} | — | — | — | — | — | LỖI: ${r.loi} | — |\n`);
    continue;
  }
  process.stdout.write(
    `| ${r.ten} | ${r.chayMed ?? '— (vô hạn)'} | ${r.vetMed} | ${r.noiBoMed} | `
    + `${r.heSo === null ? '—' : `**${r.heSo}×**`} | `
    + `${r.buoc}/${r.suKien} | ${r.lyDoDung} | ${r.jsonKB} KB |\n`,
  );
}
const heSo = ketQua.bang.filter((r) => !r.loi && r.heSo !== null && r.suKien > 20).map((r) => r.heSo);
if (heSo.length) {
  process.stdout.write(
    `\nMã vô hướng/điều khiển luồng (>20 sự kiện): hệ số ${Math.min(...heSo)}×–${Math.max(...heSo)}×.\n`
    + 'Mã dữ liệu (pandas/numpy một câu lệnh) ở quanh 1× vì tracer lọc theo co_filename\n'
    + 'nên ruột thư viện không sinh sự kiện nào.\n',
  );
}
