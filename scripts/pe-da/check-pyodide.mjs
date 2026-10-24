/**
 * Chấm NỘI DUNG khoá 172 bài (pe-da) bằng CHÍNH Pyodide 0.27.7 và CHÍNH bộ chấm
 * của trình duyệt (frontend/public/static/js/studio-harness.py), nạp runtime và
 * wheel từ frontend/public/pyodide/v0.27.7/ — đúng các file trình duyệt sẽ tải.
 *
 * Bộ đọc không có ca chấm đúng/sai của học viên, nhưng nó có một thứ kiểm được
 * và quan trọng hơn: MỖI đoạn code trong bài đều khai sẵn kết quả nó in ra. Nếu
 * lời giảng viết "Kết quả: 21" mà chạy thật ra 23, không ngoại lệ nào được ném,
 * không log nào đỏ — chỉ có học viên ngồi tự hỏi mình sai ở đâu. Đây là bộ bắt
 * đúng loại lỗi đó.
 *
 * Chạy DỒN theo bài, không chạy rời từng đoạn: bản code người học đọc
 * (`displayCode`) viết để chạy nối tiếp nhau — đoạn 2 của NP02 dùng `np` mà chỉ
 * đoạn 1 mới `import numpy as np`. Chạy rời là tự tạo ra lỗi không có thật.
 *
 *   npm i --no-save pyodide@0.27.7
 *   py scripts/pe-da/build.py
 *   node scripts/pe-da/check-pyodide.mjs [MA,MA...] [--verbose]
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadPyodide } from 'pyodide';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const RUNTIME = join(ROOT, 'frontend', 'public', 'pyodide', 'v0.27.7') + '/';
/** Cùng giới hạn với trình duyệt: worker.terminate() cắt sau 5 giây. */
const LIMIT_MS = 5000;

const harness = readFileSync(
  join(ROOT, 'frontend', 'public', 'static', 'js', 'studio-harness.py'), 'utf8');
const bundle = JSON.parse(readFileSync(join(HERE, 'out', 'lessons.json'), 'utf8'));
const source = JSON.parse(readFileSync(join(HERE, 'source', 'course.json'), 'utf8'));
const byId = new Map(source.lessons.map((l) => [l.id, l]));

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const onlyArg = args.find((a) => !a.startsWith('--'));
const only = onlyArg ? new Set(onlyArg.split(',')) : null;

const py = await loadPyodide({ indexURL: RUNTIME });
await py.runPythonAsync(harness);
const grade = py.globals.get('_studio_main');
const preload = py.globals.get('_studio_preload');
const warmed = new Set();

/** Bản code NGƯỜI HỌC đọc — khớp code_hoc_vien() trong build.py. */
function hocVien(block) {
  return {
    code: block.displayCode || block.code,
    expected: block.displayExpected !== undefined ? block.displayExpected : block.expected,
    terminal: block.kind === 'terminal' || block.mode === 'manual' || block.displayMode === 'manual',
  };
}

/** Bỏ khoảng trắng cuối dòng và dòng trống cuối — khác biệt đó không dạy gì. */
function chuanHoa(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

const hong = [];
const chamQua = [];
let daChay = 0;
let soDoan = 0;
const batDau = Date.now();

for (const lesson of bundle.lessons) {
  const ma = lesson.lesson_code;
  if (only && !only.has(ma)) continue;
  // Bài phải chạy trên máy (Tkinter, fork, seaborn…) không có gì để chấm ở đây.
  if (lesson._mode === 'local') continue;

  const goc = byId.get(ma);
  const chan = new Set((lesson._blocked || []).map((b) => b.block));
  const khoi = [];
  let chiSo = -1;
  for (const b of goc.reading) {
    if (b.type !== 'code') continue;
    const hv = hocVien(b);
    if (hv.terminal) continue;
    chiSo += 1;
    if (chan.has(chiSo)) continue;   // đoạn này bài đã khai là phải chạy trên máy
    khoi.push(hv);
  }
  if (!khoi.length) continue;

  // Như worker: tải wheel + import sẵn TRƯỚC khi bấm giờ.
  const can = (lesson.content_json.step_4?.packages || []).filter((p) => !warmed.has(p));
  if (can.length) {
    await py.loadPackage(can, { messageCallback: () => {} });
    const loi = JSON.parse(preload(JSON.stringify(can)));
    if (loi.length) hong.push({ ma, loai: 'nạp gói', chiTiet: loi.join('; ') });
    can.forEach((p) => warmed.add(p));
  }

  const code = khoi.map((k) => k.code).join('\n');
  const mongDoi = chuanHoa(khoi.map((k) => k.expected).filter((e) => e).join('\n'));

  const t0 = performance.now();
  const res = JSON.parse(grade(code, '[]', '[]'));
  const ms = Math.round(performance.now() - t0);
  daChay += 1;
  soDoan += khoi.length;

  if (res.error) {
    hong.push({ ma, loai: 'nổ khi chạy', chiTiet: String(res.error).split('\n').slice(-3).join(' | ') });
    continue;
  }
  const thuc = chuanHoa(res.output);
  if (thuc !== mongDoi) {
    hong.push({ ma, loai: 'kết quả lệch', chiTiet: lech(mongDoi, thuc) });
    continue;
  }
  if (ms > LIMIT_MS) {
    hong.push({ ma, loai: 'quá 5 giây', chiTiet: `${ms} ms — trình duyệt sẽ cắt giữa chừng` });
    continue;
  }
  chamQua.push(ma);
  if (verbose) console.log(`  ✓ ${ma} · ${khoi.length} đoạn · ${ms} ms`);
}

function lech(mongDoi, thuc) {
  const a = mongDoi.split('\n');
  const b = thuc.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) {
      return `dòng ${i + 1}: bài ghi ${JSON.stringify(a[i] ?? '(không có)')} ` +
             `nhưng chạy ra ${JSON.stringify(b[i] ?? '(không có)')}`;
    }
  }
  return 'khác nhau ở độ dài';
}

const giay = ((Date.now() - batDau) / 1000).toFixed(1);
console.log(`\n${daChay} bài · ${soDoan} đoạn code · ${chamQua.length} đạt · ${hong.length} hỏng · ${giay}s`);
if (hong.length) {
  console.log('\nHỎNG:');
  for (const h of hong) console.log(`  ✗ ${h.ma} [${h.loai}] ${h.chiTiet}`);
}
process.exit(hong.length ? 1 : 0);
