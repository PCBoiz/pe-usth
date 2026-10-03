/**
 * Chấm thử 40 bài PE v3 bằng CHÍNH Pyodide 0.27.7 và CHÍNH bộ chấm của trình
 * duyệt (frontend/public/static/js/studio-harness.py):
 *
 *   1. lời giải mẫu phải đạt MỌI ca, không lỗi;
 *   2. code khởi tạo (khung trống) phải trượt ít nhất một ca — nếu không,
 *      học viên bấm nộp ngay là qua bài;
 *   3. mỗi biến thể sai soạn trong lessons_*.py (đúng "Lỗi thường gặp" của PDF)
 *      phải trượt ít nhất một ca — đây là bằng chứng ca chấm bắt được lỗi thật.
 *
 * Pyodide không nằm trong dependencies của repo. Cài tạm rồi chạy:
 *   npm i --no-save pyodide@0.27.7
 *   python scripts/pe-v3/build.py
 *   node scripts/pe-v3/check-pyodide.mjs [MA_BAI,MA_BAI...] [--verbose]
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadPyodide } from 'pyodide';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const harness = readFileSync(join(ROOT, 'frontend', 'public', 'static', 'js', 'studio-harness.py'), 'utf8');
const qa = JSON.parse(readFileSync(join(HERE, 'out', 'qa.json'), 'utf8'));
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const onlyArg = args.find((a) => !a.startsWith('--'));
const only = onlyArg ? new Set(onlyArg.split(',')) : null;

const py = await loadPyodide();
await py.runPythonAsync(harness);
const grade = py.globals.get('_studio_main');

function run(code, lesson) {
  return JSON.parse(grade(code, JSON.stringify(lesson.tests), JSON.stringify(lesson.files)));
}

function passedAll(result, lesson) {
  return !result.error && result.tests.length === lesson.tests.length && result.tests.every((t) => t.passed);
}

const problems = [];
let lessons = 0;
let cases = 0;
let variants = 0;
const started = Date.now();

for (const lesson of qa) {
  if (only && !only.has(lesson.code)) continue;
  lessons += 1;
  cases += lesson.tests.length;

  const good = run(lesson.solution, lesson);
  if (!passedAll(good, lesson)) {
    const failed = good.tests.filter((t) => !t.passed).map((t) => `      ✗ ${t.name}: ${t.detail}`);
    problems.push(
      `${lesson.code}: LỜI GIẢI MẪU KHÔNG ĐẠT` +
        (good.error ? `\n      lỗi: ${good.error.trim()}` : '') +
        (failed.length ? '\n' + failed.join('\n') : ''),
    );
  } else if (verbose) {
    console.log(`${lesson.code}: lời giải đạt ${good.tests.length}/${lesson.tests.length}`);
    for (const note of good.notes || []) console.log(`      ${note}`);
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
if (problems.length) {
  console.log(`\n${problems.length} vấn đề:`);
  problems.forEach((p) => console.log('  ' + p));
  process.exit(1);
}
console.log('✓ Mọi lời giải mẫu đạt hết ca; mọi khung trống và biến thể sai đều bị đánh trượt.');
