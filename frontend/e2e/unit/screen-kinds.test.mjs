/**
 * Lưới an toàn cho `kind`: không để một giá trị sai chính tả thành MÀN TRẮNG.
 *
 * LỖI ĐANG CHẶN. Loại màn (`LessonScreen.kind`) và loại mini-game
 * (`PlayGame.type`) được khai ở BA nơi khác nhau và không nơi nào kiểm nơi nào:
 *   - frontend/src/lib/studio-lesson.ts   (union `ScreenKind`, `isGraded`, `screenVerdict`)
 *   - frontend/src/components/python-studio/screens/index.tsx      (switch 16 case)
 *   - frontend/src/components/python-studio/screens/GameScreen.tsx (switch 8 case)
 * Server thì không ràng buộc giá trị nào cả (src/course-admin/studio-lesson.schema.ts
 * khai `source.kind?: string`, loại màn không khai gì), nên nội dung mang
 * `"spoterror"` thay `"spotError"` đi qua `validateStudioLesson()` sạch sẽ, rồi
 * ở trình duyệt rơi vào nhánh `default` trả `null` → người học thấy màn trắng,
 * không ngoại lệ, không cảnh báo, không log.
 *
 * Người đánh giá đã chốt: KHÔNG gộp ba nơi đó (2–3 ngày, rủi ro cao), chỉ thêm
 * lưới an toàn. Lưới gồm ba lớp, file này là lớp thứ ba:
 *   1. `frontend/src/lib/screen-kinds.ts` giữ danh sách đóng,
 *   2. hai hằng `*_EXACT` trong file đó làm `npm run typecheck` đỏ nếu danh sách
 *      lệch union của studio-lesson.ts,
 *   3. các ca dưới đây đối chiếu danh sách với 48 bài THẬT và với mã nguồn của
 *      hai switch, cộng với ca đòi nhánh `default` phải kêu lên.
 *
 * VÌ SAO ĐỌC FILE JSON THẬT, KHÔNG VIẾT FIXTURE TAY: bẫy số 1 trong AGENTS.md —
 * `quizzes.service.spec.ts` từng khẳng định "không bao giờ lộ đáp án" trên
 * fixture `options: ['a','b']` trong khi dữ liệu thật là mảng object mang cờ
 * `correct`, nên lỗ lộ đáp án sống sót qua mọi lần chạy test. Ở đây mọi `kind`
 * đều lấy từ scripts/pe-v4/out-advanced/lessons/*.json — đúng bản đang seed vào
 * `lessons.content_json`.
 *
 * BẰNG CHỨNG BỘ NÀY BẮT ĐƯỢC LỖI THẬT (quy ước AGENTS.md: gỡ bản sửa ra, test
 * phải trượt). Trả nhánh `default` của screens/index.tsx về `return null` như cũ
 * → 1 ca trượt:
 *     ✖ screens/index.tsx: nhánh default phải kêu lên, không được trả null
 * Bỏ nhánh `default` mới thêm của GameScreen.tsx → 1 ca trượt:
 *     ✖ GameScreen.tsx: switch phải có nhánh default, không im lặng trả undefined
 * Viết sai một giá trị trong SCREEN_KINDS ('selfExplain' → 'selfexplain') → 2 ca
 * trượt, và `npm run typecheck` cũng đỏ nhờ `SCREEN_KINDS_EXACT`:
 *     ✖ screens/index.tsx xử lý ĐÚNG danh sách SCREEN_KINDS, không thiếu không thừa
 *     ✖ isScreenKind / isGameKind chặn đúng kiểu sai chính tả đã gặp
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildScreens } from '../../src/lib/studio-lesson.ts';
import {
  GAME_KINDS,
  SCREEN_KINDS,
  canhBaoManLa,
  isGameKind,
  isScreenKind,
} from '../../src/lib/screen-kinds.ts';

// ─────────────────────────────────────────────────── nạp 48 bài THẬT của pe-v4

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const LESSON_DIR = join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons');
const STUDIO_DIR = join(ROOT, 'frontend', 'src', 'components', 'python-studio', 'screens');

const LESSONS = readdirSync(LESSON_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const raw = JSON.parse(readFileSync(join(LESSON_DIR, f), 'utf8'));
    // `content_json` là đúng cột mà API trả về cho frontend.
    return { file: f, code: raw.lesson_code, lesson: raw.content_json };
  });

/** Các `case 'x':` của một switch trong file nguồn — lưới chỉ cần đọc tĩnh. */
function switchCases(source) {
  return new Set([...source.matchAll(/^\s*case '([^']+)':/gm)].map((m) => m[1]));
}

/** Thân nhánh `default:` cuối cùng của file, để xem nó có im lặng hay không. */
function defaultBody(source) {
  const at = source.lastIndexOf('default:');
  return at < 0 ? null : source.slice(at + 'default:'.length);
}

const indexSrc = readFileSync(join(STUDIO_DIR, 'index.tsx'), 'utf8');
const gameSrc = readFileSync(join(STUDIO_DIR, 'GameScreen.tsx'), 'utf8');
const chromeSrc = readFileSync(join(STUDIO_DIR, 'chrome.tsx'), 'utf8');

// ─────────────────────────────────────────────────────── dữ liệu thật ⊆ danh sách

test('48 bài thật: không bài nào sinh ra `kind` ngoài danh sách', () => {
  assert.equal(LESSONS.length, 48, 'mốc AGENTS.md: khoá python_advanced có 48 bài');
  const seen = new Set();
  for (const { file, lesson } of LESSONS) {
    for (const scr of buildScreens(lesson)) {
      assert.ok(
        isScreenKind(scr.kind),
        `${file}: màn ${scr.key} mang kind "${scr.kind}" không có trong SCREEN_KINDS`,
      );
      seen.add(scr.kind);
    }
  }
  // Danh sách không được chứa giá trị KHÔNG bài nào dùng mà cũng không ai dựng
  // nổi — nhưng vài kind chỉ có ở khoá cũ (pe-v3), nên chỉ ghi lại, không đòi
  // phủ hết. Đòi phủ hết sẽ làm test đỏ khi giáo trình đổi, không bắt được lỗi.
  assert.ok(seen.size >= 6, `dữ liệu thật dùng quá ít loại màn (${seen.size}) — fixture sai?`);
});

test('48 bài thật: `play.games[].type` đều nằm trong GAME_KINDS', () => {
  let games = 0;
  for (const { file, lesson } of LESSONS) {
    for (const g of lesson.play?.games ?? []) {
      assert.ok(
        isGameKind(g.type),
        `${file}: game ${g.id} mang type "${g.type}" không có trong GAME_KINDS`,
      );
      games += 1;
    }
  }
  assert.ok(games >= 200, `chỉ thấy ${games} mini-game trong dữ liệu thật — đọc sai file?`);
});

test('48 bài thật: màn `game` nào cũng có gameType hợp lệ và trỏ tới game có thật', () => {
  for (const { file, lesson } of LESSONS) {
    const ids = new Set((lesson.play?.games ?? []).map((g) => g.id));
    for (const scr of buildScreens(lesson)) {
      if (scr.kind !== 'game') continue;
      assert.ok(isGameKind(scr.gameType), `${file}: ${scr.key} gameType "${scr.gameType}" lạ`);
      assert.ok(ids.has(scr.gameId), `${file}: ${scr.key} trỏ tới gameId "${scr.gameId}" không có`);
    }
  }
});

// ──────────────────────────────────────────── danh sách ⊆ bộ dựng màn (không default)

test('screens/index.tsx xử lý ĐÚNG danh sách SCREEN_KINDS, không thiếu không thừa', () => {
  const cases = switchCases(indexSrc);
  for (const kind of SCREEN_KINDS) {
    assert.ok(cases.has(kind), `index.tsx thiếu case '${kind}' → rơi vào default, màn trắng`);
  }
  for (const kind of cases) {
    assert.ok(isScreenKind(kind), `index.tsx có case '${kind}' lạ, không có trong SCREEN_KINDS`);
  }
});

test('GameScreen.tsx xử lý ĐÚNG danh sách GAME_KINDS, không thiếu không thừa', () => {
  const cases = switchCases(gameSrc);
  for (const kind of GAME_KINDS) {
    assert.ok(cases.has(kind), `GameScreen.tsx thiếu case '${kind}' → không dựng được game`);
  }
  for (const kind of cases) {
    assert.ok(isGameKind(kind), `GameScreen.tsx có case '${kind}' lạ, không có trong GAME_KINDS`);
  }
});

test('chrome.tsx: bảng nhãn game phủ hết GAME_KINDS', () => {
  // `eyebrowOf()` tra `games[scr.gameType]` KHÔNG có giá trị mặc định, rồi
  // ScreenShell đọc `eyebrow.icon` — thiếu một khoá là TypeError, cũng ra màn
  // trắng. File đó đang có agent khác sửa nên ở đây chỉ canh bằng test.
  const block = chromeSrc.slice(chromeSrc.indexOf('const games: Record<'));
  const keys = new Set([...block.matchAll(/^\s{4}(\w+): \{/gm)].map((m) => m[1]));
  for (const kind of GAME_KINDS) {
    assert.ok(keys.has(kind), `chrome.tsx: bảng nhãn game thiếu "${kind}" → eyebrow undefined`);
  }
});

// ───────────────────────────────────────────────── nhánh default phải kêu lên

test('screens/index.tsx: nhánh default phải kêu lên, không được trả null', () => {
  const body = defaultBody(indexSrc);
  assert.ok(body, 'index.tsx không còn nhánh default — switch chưa phủ hết là lỗi runtime');
  assert.ok(
    !/^\s*(?:\/\/[^\n]*\n|\s)*return null;/m.test(body),
    'nhánh default trả null = màn trắng im lặng, đúng lỗi đang chặn',
  );
  assert.match(body, /notice\(|UnknownScreenNotice/, 'nhánh default phải hiện khối báo lỗi');
});

test('GameScreen.tsx: switch phải có nhánh default, không im lặng trả undefined', () => {
  const body = defaultBody(gameSrc);
  assert.ok(body, 'GameScreen.tsx thiếu nhánh default → type lạ làm component trả undefined');
  assert.match(body, /UnknownScreenNotice/, 'nhánh default phải hiện khối báo lỗi');
});

// ───────────────────────────────────────────────────── chính các hàm của lưới

test('isScreenKind / isGameKind chặn đúng kiểu sai chính tả đã gặp', () => {
  assert.equal(isGameKind('spotError'), true);
  assert.equal(isGameKind('spoterror'), false, 'sai hoa/thường là ca gây lỗi thật');
  assert.equal(isGameKind('SpotError'), false);
  assert.equal(isScreenKind('selfExplain'), true);
  assert.equal(isScreenKind('selfexplain'), false);
  assert.equal(isScreenKind(''), false);
  assert.equal(isScreenKind(undefined), false);
  assert.equal(isScreenKind(null), false);
  // Không bị lừa bởi thuộc tính của Array.prototype.
  assert.equal(isScreenKind('length'), false);
});

test('canhBaoManLa nêu đủ giá trị nhận được, tên bài và danh sách hợp lệ', () => {
  const msg = canhBaoManLa('mini-game', 'spoterror', 'P07');
  assert.match(msg, /spoterror/, 'không in giá trị thật thì người sửa nội dung vẫn phải mò');
  assert.match(msg, /P07/, 'không in bài nào thì không biết sửa bài nào');
  assert.match(msg, /spotError/, 'phải liệt kê giá trị hợp lệ để thấy ngay chỗ sai chính tả');
  // Thiếu tên bài vẫn phải ra câu đọc được, không in "undefined".
  const noName = canhBaoManLa('màn', 'theorie');
  assert.doesNotMatch(noName, /undefined/);
  assert.match(noName, /theorie/);
});
