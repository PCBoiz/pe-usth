/**
 * Kiểm động cơ mini-game "Sổ quỹ chung" bằng CHÍNH Pyodide 0.27.7 — runtime nạp từ
 * frontend/public/pyodide/v0.27.7/, đúng các file trình duyệt tải.
 *
 * Không viết lại ca nào: nạp scripts/pe-v4/check_so_quy.py (bộ ca CPython) vào
 * Pyodide và gọi `chay_ca()`. Cùng một bộ ca chạy ở cả hai runtime.
 *
 * Vì sao chạy trong worker_threads có hạn giờ: giống trình duyệt — một Pyodide
 * đang chạy vòng lặp vô hạn không tự dừng được, chỉ có terminate() từ bên ngoài.
 * Ca "vòng lặp vô hạn phải bị cắt" mà hỏng thì worker treo; luồng chính giết nó
 * và báo TRƯỢT thay vì để bộ kiểm treo theo. Ngoài các ca, so dấu vết (sha256 vết
 * hai lần chạy chính) với CPython: cùng code phải ra cùng vết ở cả hai runtime.
 *
 *   npm i --no-save pyodide@0.27.7
 *   node scripts/pe-v4/check-so-quy.mjs
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Worker, isMainThread, parentPort } from 'worker_threads';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const RUNTIME = join(ROOT, 'frontend', 'public', 'pyodide', 'v0.27.7') + '/';
const ENGINE = readFileSync(join(ROOT, 'frontend', 'public', 'static', 'js', 'so-quy.py'), 'utf8');
const CASES = readFileSync(join(HERE, 'check_so_quy.py'), 'utf8');
const MAU = readFileSync(join(ROOT, 'frontend', 'e2e', 'unit', 'fixtures', 'so-quy-vet.json'), 'utf8');
const HAN_MS = 120000;

if (!isMainThread) {
  const { loadPyodide } = await import('pyodide');
  const py = await loadPyodide({ indexURL: RUNTIME });
  py.globals.set('NGUON_DONG_CO', ENGINE);
  py.globals.set('NGUON_CA', CASES);
  py.globals.set('MAU_DA_GHI', MAU);
  const out = py.runPython(`
import json
_ns = {'__name__': 'check_so_quy'}
exec(NGUON_CA, _ns)
json.dumps({'ca': _ns['chay_ca'](NGUON_DONG_CO, MAU_DA_GHI), 'dau': _ns['dau_vet'](NGUON_DONG_CO),
            'phien_ban': __import__('sys').version.split()[0]}, ensure_ascii=False)
`);
  parentPort.postMessage(out);
} else {
  const worker = new Worker(fileURLToPath(import.meta.url));
  const timer = setTimeout(() => {
    console.log(`✖ TREO: Pyodide không chạy xong các ca trong ${HAN_MS / 1000} s — có vòng lặp vô hạn không bị cắt`);
    void worker.terminate();
    process.exitCode = 1;
  }, HAN_MS);
  worker.once('error', (error) => {
    clearTimeout(timer);
    console.log(`✖ worker lỗi: ${error.message}`);
    process.exitCode = 1;
  });
  worker.once('message', (raw) => {
    clearTimeout(timer);
    void worker.terminate();
    const res = JSON.parse(raw);
    let truot = 0;
    for (const c of res.ca) {
      console.log(`${c.dat ? '✔' : '✖'} ${c.ten}  (${c.ms} ms)${c.dat ? '' : '  — ' + c.chi_tiet}`);
      if (!c.dat) truot += 1;
    }
    // Dấu vết của CPython trên cùng máy: `py` ở Windows, `python3` ở nơi khác.
    let dauCPython = null;
    for (const [cmd, args] of [['py', ['-I']], ['python3', ['-I']], ['python', ['-I']]]) {
      try {
        const code = `import sys; sys.path.insert(0, ${JSON.stringify(HERE)}); import check_so_quy as c; print(c.dau_vet(c._nguon()))`;
        dauCPython = execFileSync(cmd, [...args, '-c', code], { encoding: 'utf8' }).trim();
        break;
      } catch {
        // thử lệnh kế tiếp
      }
    }
    if (dauCPython === null) {
      console.log('✖ không gọi được CPython để so vết');
      truot += 1;
    } else {
      const giong = dauCPython === res.dau;
      console.log(`${giong ? '✔' : '✖'} cùng vết với CPython: ${res.dau.slice(0, 16)}${giong ? '' : ' ≠ ' + dauCPython.slice(0, 16)}`);
      if (!giong) truot += 1;
    }
    const tong = res.ca.length + 1;
    console.log(`\nPyodide 0.27.7 (Python ${res.phien_ban}): ${tong - truot}/${tong} ca đạt`);
    process.exitCode = truot ? 1 : 0;
  });
}
