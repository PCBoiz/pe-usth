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
 * ── KIỂM ĐỘT BIẾN 15/10/2026 ─────────────────────────────────────────────
 * Ba phép nữa đã gây lại thật, rồi phục hồi:
 *   giữ `case 'theory':` nhưng THÂN `return null` (đúng màn trắng) → 1 ca
 *     (TRƯỚC: xanh — ca chỉ kiểm `case` CÓ TỒN TẠI, không kiểm nó dựng ra gì)
 *   `default: if (1) return null;` rồi mới tới UnknownScreenNotice → 1 ca
 *     (TRƯỚC: xanh — `defaultBody()` cắt tới HẾT FILE nên regex khớp khối báo
 *     lỗi nằm ở bất kỳ chỗ nào phía sau)
 *   `/* x *​/ case 'theory':` (chú thích chen trước case) → KHÔNG ca nào đỏ
 *     (TRƯỚC: đỏ oan — đột biến không đổi hành vi gì; nay bỏ chú thích trước
 *     khi soi, nên đây là dương tính giả ĐÃ GỠ, không phải lỗ mới)
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

/**
 * Bỏ chú thích trước khi soi switch. Lý do đo được: đột biến H3 chèn
 * `/* x *​/ case 'selfExplain':` và ca "xử lý ĐÚNG danh sách" đỏ oan — chú
 * thích chen trước `case` không đổi hành vi gì, nên đó là DƯƠNG TÍNH GIẢ.
 */
const jsCode = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');

/** Các `case 'x':` của một switch trong file nguồn — lưới chỉ cần đọc tĩnh. */
function switchCases(source) {
  return new Set([...jsCode(source).matchAll(/\bcase '([^']+)':/g)].map((m) => m[1]));
}

/**
 * THÂN của một `case 'x':` — tới `case` kế tiếp, `default:`, hoặc hết switch.
 *
 * Vì sao cần: ca cũ chỉ kiểm SỰ TỒN TẠI của `case '<kind>':`. Đột biến H4 giữ
 * nguyên `case 'theory':` nhưng cho thân `return null` — tức ĐÚNG màn trắng mà
 * cả file này ra đời để chặn — và cả 10 ca vẫn xanh.
 */
function caseBody(source, kind) {
  const src = jsCode(source);
  const at = src.search(new RegExp(`\\bcase '${kind}':`));
  if (at < 0) return null;
  const rest = src.slice(at);
  const next = rest.slice(1).search(/\bcase '|\bdefault:/);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

/**
 * Thân nhánh `default:` cuối cùng — CHỈ tới hết switch, không tới hết file.
 *
 * Bản cũ `source.slice(at)` cắt tới HẾT FILE, nên `assert.match(body,
 * /UnknownScreenNotice/)` khớp bất kỳ chỗ nào phía sau: đột biến H5
 * (`default: if (1) return null;` rồi mới tới khối báo lỗi) đi qua sạch sẽ.
 */
function defaultBody(source) {
  const src = jsCode(source);
  const at = src.lastIndexOf('default:');
  if (at < 0) return null;
  const from = at + 'default:'.length;
  let depth = 0;
  for (let i = from; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      if (depth === 0) return src.slice(from, i); // dấu `}` đóng switch
      depth -= 1;
    }
  }
  return src.slice(from);
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
    // …và nhánh đó phải DỰNG RA cái gì. `case 'theory': return null;` cũng là
    // màn trắng, chỉ là màn trắng có `case` (đột biến H4). Chấp nhận cả
    // `return cond ? <X…/> : null` — `brief` cố ý làm vậy khi bài không có
    // step_1.brief — nên luật là "phải có một phần tử để dựng", không phải
    // "không được xuất hiện chữ null".
    const body = caseBody(indexSrc, kind);
    assert.match(
      body, /<[A-Z]\w+|notice\(/,
      `index.tsx: case '${kind}' không dựng ra màn nào (thân: ${body.trim().slice(0, 80)}…)`,
    );
  }
  for (const kind of cases) {
    assert.ok(isScreenKind(kind), `index.tsx có case '${kind}' lạ, không có trong SCREEN_KINDS`);
  }
});

test('GameScreen.tsx xử lý ĐÚNG danh sách GAME_KINDS, không thiếu không thừa', () => {
  const cases = switchCases(gameSrc);
  for (const kind of GAME_KINDS) {
    assert.ok(cases.has(kind), `GameScreen.tsx thiếu case '${kind}' → không dựng được game`);
    const body = caseBody(gameSrc, kind);
    assert.match(
      body, /<[A-Z]\w+/,
      `GameScreen.tsx: case '${kind}' không dựng ra game nào (thân: ${body.trim().slice(0, 80)}…)`,
    );
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
  // KHÔNG được có `return null` ở BẤT KỲ đâu trong nhánh default, không chỉ ở
  // câu lệnh đầu: đột biến H5 viết `default: if (1) return null;` rồi mới tới
  // khối báo lỗi, và ca cũ (chỉ chặn câu lệnh đầu, lại cắt tới hết file) xanh.
  assert.doesNotMatch(
    body, /return\s+(?:null|undefined)\b|return\s*;/,
    'nhánh default trả null = màn trắng im lặng, đúng lỗi đang chặn',
  );
  assert.match(body, /notice\(|UnknownScreenNotice/, 'nhánh default phải hiện khối báo lỗi');
});

test('GameScreen.tsx: switch phải có nhánh default, không im lặng trả undefined', () => {
  const body = defaultBody(gameSrc);
  assert.ok(body, 'GameScreen.tsx thiếu nhánh default → type lạ làm component trả undefined');
  assert.doesNotMatch(
    body, /return\s+(?:null|undefined)\b|return\s*;/,
    'nhánh default trả null/undefined = màn trắng im lặng (cùng đột biến H5 ở index.tsx)',
  );
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
