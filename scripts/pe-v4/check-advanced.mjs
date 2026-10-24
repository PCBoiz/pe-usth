/**
 * pe-v4: chấm thử các mini-game CHẠY CODE của khoá Python Advanced (48 bài) bằng
 * CHÍNH Pyodide 314.0.7 + thư viện tự lưu trữ trong frontend/public/pyodide/v314.0.7/
 * và CHÍNH bộ chấm của trình duyệt (studio-harness.py). Bài có step_4.packages được
 * tải + import sẵn trước, như worker làm:
 *
 *   parsons  ghép đúng thứ tự (đầu cố định + các dòng + đuôi cố định, đúng cách
 *            StudioLesson ghép) phải đạt MỌI ca; ghép theo thứ tự xáo trộn ban đầu
 *            phải trượt — nếu không, bấm bừa cũng qua.
 *   debug    code sai đưa vào editor phải trượt ít nhất một ca (còn gì để sửa).
 *
 *   npm i --no-save pyodide@0.27.7
 *   py scripts/pe-v4/build_advanced.py
 *   node scripts/pe-v4/check-advanced.mjs [MA,MA...]
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadPyodide } from 'pyodide';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const harness = readFileSync(join(ROOT, 'frontend', 'public', 'static', 'js', 'studio-harness.py'), 'utf8');
const bundle = JSON.parse(readFileSync(join(HERE, 'out-advanced', 'lessons.json'), 'utf8'));
const onlyArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const only = onlyArg ? new Set(onlyArg.split(',')) : null;

const RUNTIME = join(ROOT, 'frontend', 'public', 'pyodide', 'v314.0.7') + '/';
// Gói runtime này THẬT SỰ tải được. `sqlite3` là wheel riêng ở Pyodide 0.27.7
// nhưng vào stdlib ở 314, nên loadPackage(['sqlite3']) ném "No known package" và
// giết cả bộ chấm ngay bài đầu — lọc trước, để `import` tự nói có hay không.
const coTrongLock = new Set(
  Object.keys(JSON.parse(readFileSync(join(RUNTIME, 'pyodide-lock.json'), 'utf8')).packages),
);
const py = await loadPyodide({ indexURL: RUNTIME });
await py.runPythonAsync(harness);
const grade = py.globals.get('_studio_main');
const preload = py.globals.get('_studio_preload');
const warmed = new Set();

/** Đúng cách frontend ghép (frontend/src/lib/studio-lesson.ts#parsonsCode). */
function parsonsCode(game, ids) {
  const byId = new Map(game.lines.map((l) => [l.id, l.text]));
  const body = ids.map((id) => byId.get(id)).join('\n');
  return [game.head, body, game.tail].filter((part) => part !== '').join('\n') + '\n';
}

function passes(code, four) {
  const res = JSON.parse(grade(code, JSON.stringify(four.tests ?? []), JSON.stringify(four.files ?? [])));
  return !res.error && res.tests.length === (four.tests ?? []).length && res.tests.every((t) => t.passed);
}

const problems = [];
let checked = 0;
let lessons = 0;
for (const row of bundle.lessons) {
  if (only && !only.has(row.lesson_code)) continue;
  lessons += 1;
  const content = row.content_json;
  const four = content.step_4;
  const missing = (four.packages || []).filter((p) => coTrongLock.has(p) && !warmed.has(p));
  if (missing.length) {
    await py.loadPackage(missing, { messageCallback: () => {} });
    preload(JSON.stringify(missing));
    missing.forEach((p) => warmed.add(p));
  }
  if (!content.play?.games?.length) problems.push(`${row.lesson_code}: không có mini-game nào`);
  for (const game of content.play?.games ?? []) {
    if (game.type === 'parsons') {
      checked += 1;
      const right = game.lines.map((l) => l.id);
      if (!passes(parsonsCode(game, right), four))
        problems.push(`${row.lesson_code}: parsons ghép đúng thứ tự mà KHÔNG đạt test`);
      const naive = game.order.filter((id) => !id.startsWith('D'));
      if (naive.join() !== right.join() && passes(parsonsCode(game, naive), four))
        problems.push(`${row.lesson_code}: parsons ghép theo thứ tự xáo trộn vẫn ĐẠT — game quá dễ`);
    }
    if (game.type === 'debug') {
      checked += 1;
      if (passes(game.code, four)) problems.push(`${row.lesson_code}: debug — code sai vẫn đạt hết test`);
      if (!passes(four.solutionCode, four)) problems.push(`${row.lesson_code}: debug — lời giải không đạt`);
    }
  }
}

console.log(`Pyodide ${py.version}: kiểm ${checked} game chạy code của ${lessons} bài.`);
if (problems.length) {
  console.log(`\n${problems.length} vấn đề:`);
  problems.forEach((p) => console.log('  ' + p));
  process.exit(1);
}
console.log('✓ Ghép đúng thì code chạy đạt test; thứ tự xáo trộn và code cần sửa đều bị đánh trượt.');
