/**
 * Chấm thử khoá Python Advanced (pe-v4) bằng CHÍNH Pyodide 0.27.7 và CHÍNH bộ chấm
 * của trình duyệt (frontend/public/static/js/studio-harness.py), nạp runtime VÀ thư
 * viện từ thư mục tự lưu trữ frontend/public/pyodide/v314.0.7/ — đúng các file
 * trình duyệt sẽ tải, không đi CDN.
 *
 * Cùng ba luật với scripts/pe-v3/check-pyodide.mjs:
 *   1. lời giải mẫu đạt MỌI ca;
 *   2. code khởi tạo trượt ít nhất một ca;
 *   3. mỗi biến thể sai trượt ít nhất một ca.
 * Thêm: đi đúng thứ tự của worker — loadPackage + _studio_preload (import sẵn) TRƯỚC
 * khi đo — rồi in thời gian lần chạy đầu / lần hai của lời giải. Lần chạy nào vượt
 * 5 giây (giới hạn của trình duyệt) là lỗi.
 *
 *   npm i --no-save pyodide@0.27.7
 *   py scripts/pe-v4/build.py            (hoặc --partial khi đang soạn)
 *   node scripts/pe-v4/check-pyodide.mjs [MA,MA...] [--verbose]
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadPyodide } from 'pyodide';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
// PYODIDE_DIR: thử bản Pyodide khác trước khi đưa vào repo. Nâng runtime là đổi
// Python/numpy/pandas dưới chân 427 ca chấm, nên phải đo được thiệt hại trước.
const RUNTIME =
  process.env.PYODIDE_DIR || join(ROOT, 'frontend', 'public', 'pyodide', 'v314.0.7') + '/';
const LIMIT_MS = 5000;
const harness = readFileSync(join(ROOT, 'frontend', 'public', 'static', 'js', 'studio-harness.py'), 'utf8');
const qa = JSON.parse(readFileSync(join(HERE, 'out', 'qa.json'), 'utf8'));
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const onlyArg = args.find((a) => !a.startsWith('--'));
const only = onlyArg ? new Set(onlyArg.split(',')) : null;

// Gói runtime này THẬT SỰ tải được. `sqlite3` là wheel riêng ở 0.27.7 nhưng vào
// stdlib ở 314.0.7, nên loadPackage(['sqlite3']) ở bản mới ném "No known
// package" và giết cả bộ chấm — lọc trước rồi để `import` tự nói có hay không.
const coTrongLock = new Set(
  Object.keys(JSON.parse(readFileSync(join(RUNTIME, 'pyodide-lock.json'), 'utf8')).packages),
);

const py = await loadPyodide({ indexURL: RUNTIME });
await py.runPythonAsync(harness);
const grade = py.globals.get('_studio_main');
const preload = py.globals.get('_studio_preload');
const warmed = new Set();

function run(code, lesson) {
  const t0 = performance.now();
  const res = JSON.parse(grade(code, JSON.stringify(lesson.tests), JSON.stringify(lesson.files)));
  res.ms = Math.round(performance.now() - t0);
  return res;
}

function passedAll(result, lesson) {
  return !result.error && result.tests.length === lesson.tests.length && result.tests.every((t) => t.passed);
}

const problems = [];
const timings = [];
let lessons = 0;
let cases = 0;
let variants = 0;
const started = Date.now();

for (const lesson of qa) {
  if (only && !only.has(lesson.code)) continue;
  lessons += 1;
  cases += lesson.tests.length;

  // Như worker: tải gói còn thiếu rồi import sẵn, KHÔNG tính vào thời gian chạy.
  const missing = (lesson.packages || []).filter((p) => coTrongLock.has(p) && !warmed.has(p));
  let loadMs = 0;
  if (missing.length) {
    const t0 = performance.now();
    await py.loadPackage(missing, { messageCallback: () => {} });
    const errors = JSON.parse(preload(JSON.stringify(missing)));
    if (errors.length) problems.push(`${lesson.code}: import sẵn lỗi: ${errors.join('; ')}`);
    missing.forEach((p) => warmed.add(p));
    loadMs = Math.round(performance.now() - t0);
  }

  const good = run(lesson.solution, lesson);
  const again = run(lesson.solution, lesson);
  if (lesson.packages?.length || good.ms > 1000)
    timings.push(`${lesson.code} [${(lesson.packages || []).join(',') || '-'}]: tải+import ${loadMs} ms (ngoài 5 s), ` +
      `chạy lần 1 ${good.ms} ms, lần 2 ${again.ms} ms`);
  if (good.ms > LIMIT_MS || again.ms > LIMIT_MS)
    problems.push(`${lesson.code}: lời giải chạy ${Math.max(good.ms, again.ms)} ms — vượt giới hạn 5 s của trình duyệt`);
  if (!passedAll(good, lesson)) {
    const failed = good.tests.filter((t) => !t.passed).map((t) => `      ✗ ${t.name}: ${t.detail}`);
    problems.push(
      `${lesson.code}: LỜI GIẢI MẪU KHÔNG ĐẠT` +
        (good.error ? `\n      lỗi: ${good.error.trim()}` : '') +
        (failed.length ? '\n' + failed.join('\n') : ''),
    );
  } else if (verbose) {
    console.log(`${lesson.code}: lời giải đạt ${good.tests.length}/${lesson.tests.length} (${good.ms} ms)`);
  }

  const shells = [{ label: 'code khởi tạo', code: lesson.starter }, ...lesson.bad];
  for (const variant of shells) {
    variants += 1;
    const res = run(variant.code, lesson);
    if (passedAll(res, lesson)) {
      problems.push(`${lesson.code}: "${variant.label}" vẫn QUA hết ${lesson.tests.length} ca — ca chấm chưa bắt được lỗi này`);
    } else if (verbose) {
      const caught = res.error ? 'lỗi chạy' : res.tests.filter((t) => !t.passed).map((t) => t.name).join('; ');
      console.log(`   ${variant.label}: bị bắt (${caught.slice(0, 160)})`);
    }
  }
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(`Pyodide ${py.version}: ${lessons} bài, ${cases} ca, ${variants} biến thể sai/khung trống — ${seconds}s.`);
if (timings.length) {
  console.log('\nThời gian (lời giải mẫu):');
  timings.forEach((t) => console.log('  ' + t));
}
if (problems.length) {
  console.log(`\n${problems.length} vấn đề:`);
  problems.forEach((p) => console.log('  ' + p));
  process.exit(1);
}
console.log('✓ Mọi lời giải mẫu đạt hết ca; mọi khung trống và biến thể sai đều bị đánh trượt.');
