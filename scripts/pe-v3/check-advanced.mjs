/**
 * Chấm thử các mini-game CHẠY CODE của khoá Python Advanced bằng CHÍNH Pyodide
 * 0.27.7 và CHÍNH bộ chấm của trình duyệt (studio-harness.py):
 *
 *   parsons  ghép đúng thứ tự (đầu cố định + các dòng + đuôi cố định, đúng cách
 *            StudioLesson ghép) phải đạt MỌI ca; ghép theo thứ tự xáo trộn ban đầu
 *            phải trượt — nếu không, bấm bừa cũng qua.
 *   debug    code sai đưa vào editor phải trượt ít nhất một ca (còn gì để sửa).
 *
 *   npm i --no-save pyodide@0.27.7
 *   python scripts/pe-v3/build_advanced.py
 *   node scripts/pe-v3/check-advanced.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadPyodide } from 'pyodide';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const harness = readFileSync(join(ROOT, 'frontend', 'public', 'static', 'js', 'studio-harness.py'), 'utf8');
const bundle = JSON.parse(readFileSync(join(HERE, 'out-advanced', 'lessons.json'), 'utf8'));

const py = await loadPyodide();
await py.runPythonAsync(harness);
const grade = py.globals.get('_studio_main');

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
for (const row of bundle.lessons) {
  const content = row.content_json;
  const four = content.step_4;
  for (const game of content.play.games) {
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

console.log(`Pyodide ${py.version}: kiểm ${checked} game chạy code của ${bundle.lessons.length} bài.`);
if (problems.length) {
  console.log(`\n${problems.length} vấn đề:`);
  problems.forEach((p) => console.log('  ' + p));
  process.exit(1);
}
console.log('✓ Ghép đúng thì code chạy đạt test; thứ tự xáo trộn và code cần sửa đều bị đánh trượt.');
