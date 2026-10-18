/**
 * Unit test cho /dashboard (src/lib/dashboard-plan.ts + nối dây DashboardMap.tsx).
 *
 * Fixture là dữ liệu THẬT: curricula.json đang ship và gói bài pe-v4 đang seed
 * (scripts/pe-v4/out-advanced/lessons.json) — bẫy "fixture không giống dữ liệu
 * thật" trong AGENTS.md.
 *
 * Ca quan trọng nhất là ca đầu: LESSON_META (do sync_curricula.py viết bằng
 * Python) phải ra đúng từng khoá màn mà buildScreens() (TypeScript) dựng trong
 * trang bài học. Dashboard đếm "mục đã học" bằng cách so các khoá này với bản
 * nháp localStorage; lệch một khoá là đếm sai mà không ai thấy.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildStages,
  defaultSelection,
  draftDone,
  draftKey,
  lessonSteps,
  stageDoneCount,
} from '../../src/lib/dashboard-plan.ts';
import { planResume } from '../../src/lib/course-progress.ts';
import { buildScreens } from '../../src/lib/studio-lesson.ts';
import { REGION_NAMES } from '../../src/lib/world-map.ts';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CURRICULA = JSON.parse(readFileSync(join(FE, 'src', 'lib', 'curricula.json'), 'utf8'));
const BUNDLE = JSON.parse(
  readFileSync(join(FE, '..', 'scripts', 'pe-v4', 'out-advanced', 'lessons.json'), 'utf8'),
).lessons.sort((a, b) => a.sort_order - b.sort_order);
const MODULES = CURRICULA.CURRICULA.python_advanced.modules;
const META = CURRICULA.LESSON_META?.python_advanced;
const STAGES = buildStages(MODULES, META, REGION_NAMES);

test('LESSON_META khớp từng khoá màn của buildScreens() trên cả 48 bài', () => {
  assert.ok(Array.isArray(META), 'curricula.json thiếu LESSON_META — chạy py scripts/pe-v4/sync_curricula.py');
  assert.equal(META.length, BUNDLE.length);
  const lech = [];
  BUNDLE.forEach((row, i) => {
    const want = buildScreens(row.content_json).map((s) => [s.key, s.kind === 'game' ? s.gameType : s.kind]);
    const got = META[i].screens;
    if (META[i].code !== row.lesson_code || JSON.stringify(got) !== JSON.stringify(want)) {
      lech.push(`${row.lesson_code}: meta ${JSON.stringify(got)} ≠ trình duyệt ${JSON.stringify(want)}`);
    }
  });
  assert.deepEqual(lech, [], 'LESSON_META lệch buildScreens — sửa screen_keys() trong sync_curricula.py');
});

test('buildStages: 8 chặng, số bài đếm từ giáo trình, phút/XP/boss từ gói bài', () => {
  assert.equal(STAGES.length, MODULES.length);
  assert.deepEqual(
    STAGES.map((s) => s.lessons.length),
    MODULES.map((m) => m.lessons.length),
  );
  const p01 = STAGES[0].lessons[0];
  assert.equal(p01.code, 'P01');
  assert.equal(p01.title, 'Program, process và tài nguyên');
  assert.equal(p01.index, 0);
  assert.equal(p01.minutes, BUNDLE[0].estimated_minutes);
  assert.equal(p01.xp, BUNDLE[0].xp_reward);
  assert.equal(STAGES[0].code, 'M01');
  assert.equal(STAGES[0].name, REGION_NAMES[0]);
  // Chỉ số phẳng liên tục qua các chặng — đúng giá trị `?lesson=`.
  assert.deepEqual(
    STAGES.flatMap((s) => s.lessons.map((l) => l.index)),
    BUNDLE.map((_, i) => i),
  );
  // Bài boss lấy từ cờ play.boss của gói bài, không viết cứng mã bài.
  const bossCodes = BUNDLE.filter((r) => r.content_json.play?.boss).map((r) => r.lesson_code);
  assert.deepEqual(STAGES.flatMap((s) => s.lessons.filter((l) => l.boss).map((l) => l.code)), bossCodes);
});

test('buildStages: thiếu LESSON_META vẫn ra chặng/bài, chỉ không có số', () => {
  const bare = buildStages(MODULES, undefined, REGION_NAMES);
  assert.equal(bare[0].lessons[0].minutes, 0);
  assert.deepEqual(bare[0].lessons[0].screens, []);
  // Lệch số chặng thì bỏ tên ẩn dụ, dùng tên thật.
  assert.equal(buildStages(MODULES.slice(0, 3), META, REGION_NAMES)[0].name, STAGES[0].topic);
});

test('lessonSteps: mục đang học là mục đầu tiên chưa xong; bài đã xong thì xong hết', () => {
  const screens = STAGES[0].lessons[0].screens;
  const plan = lessonSteps(screens, { [screens[0][0]]: true, [screens[1][0]]: true }, false);
  assert.equal(plan.doneCount, 2);
  assert.equal(plan.current?.key, screens[2][0]);
  assert.equal(plan.current?.n, 3);
  assert.equal(plan.pct, Math.round((2 / screens.length) * 100));
  // `done` mang giá trị khác true (bản nháp hỏng) không tính là đã xong.
  assert.equal(lessonSteps(screens, { [screens[0][0]]: 'yes' }, false).doneCount, 0);
  const all = lessonSteps(screens, null, true);
  assert.equal(all.doneCount, screens.length);
  assert.equal(all.pct, 100);
  assert.equal(all.current, null);
});

test('draftDone / draftKey: cùng khoá với useLessonDraft, bản nháp hỏng thì null', () => {
  assert.equal(draftKey(7, 'python_advanced', 1), 'pe-studio-lesson-v1:7:python_advanced:1');
  assert.deepEqual(draftDone(JSON.stringify({ step: 3, done: { 's1-theory': true } })), { 's1-theory': true });
  assert.equal(draftDone('{hỏng'), null);
  assert.equal(draftDone(JSON.stringify({ done: ['x'] })), null);
  assert.equal(draftDone(null), null);
});

test('defaultSelection + stageDoneCount: chọn sẵn bài chưa xong nhỏ nhất và chặng của nó', () => {
  const m1 = STAGES[0].lessons.map((l) => l.no);
  const total = STAGES.reduce((n, s) => n + s.lessons.length, 0);
  const sel = defaultSelection(STAGES, planResume(m1, total).index);
  assert.equal(sel.stage, 1);
  assert.equal(sel.lesson, STAGES[1].lessons[0].index);
  assert.equal(stageDoneCount(STAGES[0], new Set(m1)), STAGES[0].lessons.length);
  assert.deepEqual(defaultSelection(STAGES, planResume(null, total).index), { stage: 0, lesson: 0 });
  // Chỉ số ngoài khoá (giáo trình đổi) thì về bài đầu, không chọn bài ma.
  assert.deepEqual(defaultSelection(STAGES, 999), { stage: 0, lesson: 0 });
});

test('NỐI DÂY: DashboardMap không tạo tài khoản khách và không viết style nội tuyến', () => {
  const src = readFileSync(join(FE, 'src', 'app', 'dashboard', 'DashboardMap.tsx'), 'utf8');
  // Trang công khai: apiFetch gặp 401 sẽ gọi ensureGuest() (bẫy trong AGENTS.md).
  assert.ok(!/\bapiFetch\(/.test(src), 'dùng apiFetchSessionOnly, không dùng apiFetch');
  assert.ok(/loadCompletedLessons\(/.test(src), 'mọi lời gọi API phải đi qua cổng phiên loadCompletedLessons');
  // style={{…}} bị `style-src` của CSP chặn khi SSR tuần tự hoá (AGENTS.md).
  assert.ok(!/style=\{\{/.test(src), 'style nội tuyến — dùng CSS module');
});
