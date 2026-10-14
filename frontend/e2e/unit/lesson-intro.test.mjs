/**
 * Hoạt cảnh MỞ SÁCH ở màn lý thuyết, và dấu hiệu ngắn vào màn sandbox.
 *
 * ===========================================================================
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 * ===========================================================================
 *  - "luồng thật…" đo lại tiền đề của cả quyết định phạm vi: lý thuyết là màn
 *    1, viết code là màn 10, giữa chúng TÁM màn. Nếu ai đổi buildScreens cho
 *    sandbox đứng ngay sau theory thì ca này trượt — và lúc đó cảnh "gập sách →
 *    ngẩng lên → IDE" mới có nghĩa, nên ca trượt là đúng việc nó phải làm.
 *  - "20 bài có lý thuyết / 28 bài không" canh con số mà `introMode` dựa vào.
 *  - "bài không có theory thì KHÔNG hoạt cảnh" trượt nếu gỡ nhánh `hasTheory`.
 *  - "lần hai trong phiên là bản rút gọn" trượt nếu gỡ nhánh `seen`.
 *  - "giảm chuyển động thì bỏ HẲN" trượt nếu đổi nó thành 'short'.
 *  - "không dựng được 3D thì rơi về bản rút gọn" trượt nếu gỡ nhánh `book3d`
 *    — tức là nếu ai bỏ đường thoái lui cho Safari/WebKit.
 *  - "sessionStorage ném lỗi vẫn chạy được" trượt nếu gỡ try/catch.
 *  - "bỏ qua đưa về trạng thái CUỐI, không để chữ trong suốt" là bất biến
 *    nặng nhất: nó trượt nếu `fill` đổi sang 'forwards'/'both', nếu khung cuối
 *    của lớp chữ lệch khỏi trạng thái nghỉ, hoặc nếu CSS module mọc thêm một
 *    khai báo ẩn chữ ở trạng thái nghỉ.
 *  - "finishAnimations không dừng nửa đường" trượt nếu bỏ try/catch trong vòng
 *    lặp — một animation nổ thì những cái sau không được finish, và đó đúng là
 *    cách sinh ra màn trắng.
 *  - Nhóm "đã nối dây" trượt nếu BookIntro/SandboxCue bị gỡ khỏi màn.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BOOK_3D_DECLARATIONS,
  BOOK_MIN_WIDTH_PX,
  bookStep,
  coverStep,
  EASE_MOVE,
  EASE_OUT,
  finishAnimations,
  INTRO_FILL,
  INTRO_FULL_MS,
  INTRO_SEEN_KEY,
  INTRO_SHORT_MS,
  introDurationMs,
  introMode,
  introSeen,
  keySkips,
  markIntroSeen,
  playGate,
  SANDBOX_CUE_KEY,
  SANDBOX_CUE_MS,
  sandboxCueOn,
  sandboxCueSteps,
  supportsBook3d,
  textStep,
} from '../../src/lib/lesson-intro.ts';
import { buildScreens } from '../../src/lib/studio-lesson.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const LESSON_DIR = join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons');
const STUDIO = join(ROOT, 'frontend', 'src', 'components', 'python-studio');

const LESSONS = readdirSync(LESSON_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const raw = JSON.parse(readFileSync(join(LESSON_DIR, f), 'utf8'));
    // `content_json` là đúng cột mà API trả về cho frontend.
    return { code: raw.lesson_code, lesson: raw.content_json };
  });

const read = (...parts) => readFileSync(join(...parts), 'utf8');

/**
 * Bỏ chú thích khỏi mã nguồn trước khi soi bằng regex. Cần thiết: các file này
 * NÓI VỀ những thứ chúng không được dùng ("không dò tên trình duyệt",
 * "window.sessionStorage ném SecurityError"), nên soi cả chú thích là tự bắt
 * chính chú thích của mình.
 */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const THEORY_SRC = read(STUDIO, 'screens', 'TheoryScreen.tsx');
const SANDBOX_SRC = read(STUDIO, 'screens', 'SandboxScreen.tsx');
const INTRO_SRC = read(STUDIO, 'intro', 'BookIntro.tsx');
const INTRO_CSS = read(STUDIO, 'intro', 'BookIntro.module.css');

/** Đầu vào mặc định của introMode: mọi thứ thuận lợi → bản đầy đủ. */
function input(over = {}) {
  return { hasTheory: true, reduced: false, seen: false, book3d: true, roomy: true, waapi: true, ...over };
}

/** Bộ nhớ giả. `boom` = mọi lời gọi ném lỗi (chế độ riêng tư, chặn site data). */
function fakeStorage({ boom = false, start = {} } = {}) {
  const map = new Map(Object.entries(start));
  return {
    writes: 0,
    getItem(k) {
      if (boom) throw new DOMException('blocked', 'SecurityError');
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      if (boom) throw new DOMException('blocked', 'SecurityError');
      this.writes += 1;
      map.set(k, v);
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. TIỀN ĐỀ CỦA QUYẾT ĐỊNH PHẠM VI — vì sao nửa sau của chuyển cảnh bị bỏ
   ═══════════════════════════════════════════════════════════════════════════ */

test('luồng thật: lý thuyết là màn 1, viết code là màn 10, giữa chúng TÁM màn', () => {
  const t03 = LESSONS.find((l) => l.code === 'T03');
  assert.ok(t03, 'T03 phải có trong 48 bài');
  const kinds = buildScreens(t03.lesson).map((s) => s.kind);

  assert.equal(kinds.length, 11, 'T03 có 11 màn');
  assert.equal(kinds[0], 'theory', 'lý thuyết là màn ĐẦU');
  assert.equal(kinds.indexOf('sandbox'), 9, 'sandbox là màn thứ 10 (chỉ số 9)');
  assert.equal(
    kinds.indexOf('sandbox') - kinds.indexOf('theory') - 1,
    8,
    'giữa đọc và viết code có TÁM màn — nên "gập sách rồi ngẩng lên thấy IDE" ' +
      'là một câu nhân–quả SAI và nửa sau của chuyển cảnh bị bỏ',
  );
});

test('mọi bài CÓ lý thuyết đều có ít nhất một màn giữa theory và sandbox', () => {
  // Không chỉ T03: nếu có DÙ MỘT bài mà sandbox đứng ngay sau theory thì lập
  // luận "đọc xong còn tám màn nữa" không còn đúng cho bài đó.
  for (const { code, lesson } of LESSONS) {
    const kinds = buildScreens(lesson).map((s) => s.kind);
    const t = kinds.indexOf('theory');
    const s = kinds.indexOf('sandbox');
    if (t === -1 || s === -1) continue;
    assert.ok(s - t > 1, `${code}: sandbox đứng ngay sau theory (${kinds.join(' → ')})`);
  }
});

test('20 bài CÓ step_1.theory, 28 bài KHÔNG — con số mà introMode dựa vào', () => {
  const have = LESSONS.filter((l) => (l.lesson?.step_1?.theory ?? []).length > 0).map((l) => l.code);
  const miss = LESSONS.filter((l) => !(l.lesson?.step_1?.theory ?? []).length).map((l) => l.code);

  assert.equal(LESSONS.length, 48, 'mốc AGENTS.md: khoá python_advanced có 48 bài');
  assert.equal(have.length, 20);
  assert.equal(miss.length, 28);
  assert.deepEqual(miss, [
    'X01', 'X02', 'X03', 'X04', 'X05',
    'N01', 'N02', 'N03', 'N04', 'N05', 'N06',
    'PD01', 'PD02', 'PD03', 'PD04', 'PD05', 'PD06', 'PD07', 'PD08', 'PD09',
    'M01', 'M02', 'M03', 'M04', 'M05', 'M06',
    'DA01', 'DA02',
  ]);
  // 28 bài đó: màn đầu là `brief`, không phải `theory` — không có quyển sách nào để mở.
  for (const { code, lesson } of LESSONS.filter((l) => !(l.lesson?.step_1?.theory ?? []).length)) {
    assert.notEqual(buildScreens(lesson)[0]?.kind, 'theory', `${code} không được có màn theory`);
  }
  assert.equal(have.length + miss.length, 48);
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. CHẠY HAY KHÔNG, BẢN NÀO
   ═══════════════════════════════════════════════════════════════════════════ */

test('bài CÓ lý thuyết, lần đầu trong phiên, mọi thứ thuận lợi → bản đầy đủ', () => {
  assert.equal(introMode(input()), 'full');
});

test('bài KHÔNG có step_1.theory thì KHÔNG có hoạt cảnh nào — kể cả khi mọi thứ khác thuận lợi', () => {
  assert.equal(introMode(input({ hasTheory: false })), 'off');
  // Và không có tổ hợp nào lách được: thiếu phần đọc là thiếu quyển sách.
  for (const seen of [false, true])
    for (const book3d of [false, true])
      for (const roomy of [false, true])
        assert.equal(introMode(input({ hasTheory: false, seen, book3d, roomy })), 'off');
});

test('lần thứ hai trong CÙNG phiên dùng bản rút gọn, không chạy lại bản đầy đủ', () => {
  const storage = fakeStorage();
  assert.equal(introSeen(storage), false, 'phiên mới: chưa xem');
  assert.equal(introMode(input({ seen: introSeen(storage) })), 'full');

  markIntroSeen(storage);
  assert.equal(introSeen(storage), true);
  assert.equal(introMode(input({ seen: introSeen(storage) })), 'short');

  // Nhớ theo PHIÊN, không theo bài: khoá là một hằng cố định, không ghép từ
  // mã bài, và introMode cũng không nhận tham số nào nhận dạng bài.
  assert.equal(INTRO_SEEN_KEY, 'pe.lessonIntro.v1');
  assert.ok(
    !/INTRO_SEEN_KEY\s*=\s*[`'"][^`'"]*\$\{/.test(code(read(ROOT, 'frontend', 'src', 'lib', 'lesson-intro.ts'))),
    'khoá không được ghép từ mã bài',
  );
});

test('giảm chuyển động thì bỏ HẲN hoạt cảnh, không hạ xuống bản rút gọn', () => {
  // "Rút gọn" vẫn là chuyển động. Người bật tuỳ chọn này phải được KHÔNG CÓ gì.
  assert.equal(introMode(input({ reduced: true })), 'off');
  assert.equal(introMode(input({ reduced: true, seen: true })), 'off');
  assert.equal(introDurationMs('off'), 0, 'chế độ off có thời lượng 0');
  assert.equal(sandboxCueOn({ reduced: true, seen: false, waapi: true }), false);
});

test('không dựng được cảnh 3D thì rơi về bản RÚT GỌN, không ra cảnh nửa vời', () => {
  // Đường thoái lui cho Safari/WebKit (chưa được đo): `preserve-3d` và
  // `backface-visibility` đúng là chỗ WebKit hay khác Chrome.
  assert.equal(introMode(input({ book3d: false })), 'short');
  // Màn hẹp cũng vậy (trải sách hai trang không vừa điện thoại).
  assert.equal(introMode(input({ roomy: false })), 'short');
  // Không có WAAPI thì không có cả cách bỏ qua → tắt hẳn, để trạng thái nghỉ
  // của CSS (vốn đã là trạng thái cuối) là thứ người học thấy.
  assert.equal(introMode(input({ waapi: false })), 'off');

  // Và introMode không bao giờ ra giá trị thứ tư, với MỌI tổ hợp đầu vào.
  for (const hasTheory of [false, true])
    for (const reduced of [false, true])
      for (const seen of [false, true])
        for (const book3d of [false, true])
          for (const roomy of [false, true])
            for (const waapi of [false, true]) {
              const mode = introMode({ hasTheory, reduced, seen, book3d, roomy, waapi });
              assert.ok(['off', 'short', 'full'].includes(mode));
              if (mode === 'full')
                assert.ok(hasTheory && !reduced && !seen && book3d && roomy && waapi);
            }
});

test('kiểm NĂNG LỰC, không dò tên trình duyệt', () => {
  assert.equal(supportsBook3d(() => true), true);
  assert.equal(supportsBook3d(() => false), false);
  // Thiếu DÙ MỘT khai báo là không dựng.
  for (const missing of BOOK_3D_DECLARATIONS)
    assert.equal(supportsBook3d((d) => d !== missing), false, `thiếu "${missing}" vẫn dựng`);
  // CSS.supports ném lỗi cũng là "không dựng", không phải trang nổ.
  assert.equal(
    supportsBook3d(() => {
      throw new Error('bad descriptor');
    }),
    false,
  );
  // Không có chuỗi nào trông như dò tên trình duyệt trong cả lib lẫn component
  // (soi MÃ, không soi chú thích — chú thích có nhắc tên WebKit/Safari).
  const lib = read(ROOT, 'frontend', 'src', 'lib', 'lesson-intro.ts');
  for (const src of [lib, INTRO_SRC])
    assert.ok(
      !/userAgent|navigator|isSafari|isChrome/i.test(code(src)),
      'không được dò tên trình duyệt — phải hỏi CSS.supports',
    );
  assert.ok(/CSS\.supports|css\?\.supports|css\.supports/.test(code(INTRO_SRC)), 'phải hỏi CSS.supports');
  assert.ok(BOOK_MIN_WIDTH_PX > 860, 'ngưỡng bề ngang phải trên mốc 860px của bản thiết kế');
});

/* ═══════════════════════════════════════════════════════════════════════════
   3. BỘ NHỚ PHIÊN KHÔNG ĐƯỢC LÀM TRANG NỔ
   ═══════════════════════════════════════════════════════════════════════════ */

test('sessionStorage ném lỗi (chế độ riêng tư) thì vẫn chạy được, chỉ là không nhớ', () => {
  const boom = fakeStorage({ boom: true });
  assert.equal(introSeen(boom), false, 'đọc ném lỗi → coi như chưa xem');
  assert.doesNotThrow(() => markIntroSeen(boom), 'ghi ném lỗi không được nổi lên');
  assert.equal(introMode(input({ seen: introSeen(boom) })), 'full', 'vẫn chạy được');
});

test('không có bộ nhớ nào (null) cũng không nổ', () => {
  assert.equal(introSeen(null), false);
  assert.doesNotThrow(() => markIntroSeen(null));
});

test('dấu hiệu sandbox nhớ bằng khoá RIÊNG, không dùng chung với cảnh mở sách', () => {
  // Dùng chung khoá thì mở một bài có lý thuyết là dấu hiệu sandbox không bao
  // giờ chạy nữa — hai cảnh khác nhau phải nhớ riêng.
  assert.notEqual(SANDBOX_CUE_KEY, INTRO_SEEN_KEY);
  const storage = fakeStorage();
  markIntroSeen(storage, INTRO_SEEN_KEY);
  assert.equal(introSeen(storage, SANDBOX_CUE_KEY), false);
  assert.equal(sandboxCueOn({ reduced: false, seen: false, waapi: true }), true);
  markIntroSeen(storage, SANDBOX_CUE_KEY);
  assert.equal(sandboxCueOn({ reduced: false, seen: introSeen(storage, SANDBOX_CUE_KEY), waapi: true }), false);
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. BỎ QUA PHẢI ĐƯA VỀ TRẠNG THÁI CUỐI, KHÔNG ĐỂ CHỮ TRONG SUỐT
   ═══════════════════════════════════════════════════════════════════════════ */

test('bỏ qua đưa về trạng thái CUỐI: fill là backwards và khung cuối là trạng thái nghỉ', () => {
  // Đây là bất biến chống MÀN TRẮNG. `finish()` kết thúc animation; sau khi
  // kết thúc, `fill: 'backwards'` KHÔNG ghim gì lại, nên phần tử trả về trạng
  // thái nghỉ của CSS. Trạng thái nghỉ phải trùng khung cuối, và khung cuối
  // của lớp chữ phải là CHỮ HIỆN.
  assert.equal(INTRO_FILL, 'backwards', "fill 'forwards'/'both' ghim phần tử ở khung cuối → sinh ra trạng thái kẹt");

  for (const mode of ['full', 'short']) {
    const text = textStep(mode);
    assert.equal(text.options.fill, 'backwards');
    assert.deepEqual(text.keyframes.at(-1), { opacity: '1', transform: 'none' }, `${mode}: khung cuối phải là chữ HIỆN`);
    assert.equal(text.keyframes[0].opacity, '0', `${mode}: khung đầu là chữ chưa hiện`);
  }

  // Bìa và sách kết thúc đúng ở trạng thái nghỉ của CSS module.
  assert.deepEqual(coverStep().keyframes.at(-1), { transform: 'rotateY(-172deg)' });
  assert.deepEqual(bookStep().keyframes.at(-1), { transform: 'none' });
  assert.equal(bookStep().keyframes.at(-1).transform, 'none', 'KẾT THÚC phải là transform đơn vị, không thì lớp chữ 2D lệch khỏi khổ giấy');
});

test('trạng thái NGHỈ trong CSS module không ẩn chữ: không có đường nào ra màn trắng', () => {
  // `.layer` là lớp chữ. Nếu nó mang `opacity`/`transform`/`visibility`/
  // `display: none` ở trạng thái nghỉ thì CSS không dựng được hay JS không
  // chạy = chữ biến mất. Trạng thái nghỉ PHẢI là trạng thái cuối.
  const layer = INTRO_CSS.match(/\n\.layer\s*\{([^}]*)\}/);
  assert.ok(layer, 'CSS module phải có .layer');
  for (const banned of ['opacity', 'transform', 'visibility', 'display']) {
    assert.ok(
      !new RegExp(`(^|;|\\s)${banned}\\s*:`).test(layer[1]),
      `.layer không được khai \`${banned}\` ở trạng thái nghỉ (đây là lớp chữ)`,
    );
  }
  // Và không có khai báo nào ở phạm vi gốc kéo .root/.layer về opacity 0.
  const root = INTRO_CSS.match(/\n\.root\s*\{([^}]*)\}/);
  assert.ok(root && !/opacity\s*:/.test(root[1]), '.root không được khai opacity');
});

test('bỏ qua KHÔNG dùng mẹo transition-duration: 0s — chỉ dùng finish()', () => {
  // Nguyên mẫu đã đo: đặt lại `transition-*` giữa chừng không dừng được
  // transition đang chạy, nên bìa nhảy tới nơi mà lớp chữ còn trong phần trễ
  // → bỏ qua xong là màn trắng.
  assert.ok(/\.finish\(\)/.test(read(ROOT, 'frontend', 'src', 'lib', 'lesson-intro.ts')));
  assert.ok(
    !/transition-duration\s*:\s*0s/.test(INTRO_CSS),
    'không được dùng lại mẹo transition-duration: 0s',
  );
  // Cả CSS module không có một `transition` nào: hoạt cảnh chạy bằng Web
  // Animations API, nên `finish()` điều khiển được toàn bộ.
  assert.ok(!/\btransition\s*:/.test(INTRO_CSS), 'cảnh này không dùng transition');
});

test('finishAnimations không dừng nửa đường khi một animation ném lỗi', () => {
  // Dừng nửa đường CHÍNH LÀ cách sinh ra màn trắng: bìa đã finish, lớp chữ
  // chưa, nên chữ còn đứng ở opacity 0.
  const log = [];
  const ok = (name) => ({ finish: () => log.push(name) });
  const bad = (name) => ({
    finish: () => {
      log.push(`${name}:throw`);
      throw new DOMException('not ready', 'InvalidStateError');
    },
  });

  const done = finishAnimations([bad('bìa'), ok('sách'), ok('chữ')]);
  assert.deepEqual(log, ['bìa:throw', 'sách', 'chữ'], 'cái sau vẫn phải được finish()');
  assert.equal(done, 2);

  assert.equal(finishAnimations([]), 0, 'không có gì để bỏ qua thì trả 0');
  assert.doesNotThrow(() => finishAnimations([bad('a'), bad('b')]));
});

test('bỏ qua ĐÚNG trong khung hình chờ: cú play() bị huỷ, hoạt cảnh KHÔNG diễn lại', () => {
  /* Lỗi thật đã sửa: hoạt cảnh được dựng `pause()` rồi mới `play()` trong một
     rAF (nhường một khung cho lớp GPU). `skip()` chỉ `finish()`, nên bấm phím
     đúng trong khung hình đó thì rAF vẫn gọi `play()` trên animation ĐÃ
     finished — WAAPI đặt lại currentTime về 0 và diễn lại 860ms, 560ms đầu lớp
     chữ về opacity 0. Cửa sổ rộng một khung hình nên mắt không bắt được. */
  const gate = playGate();
  assert.equal(gate.claim(), true, 'khung hình đầu được phép play()');
  assert.equal(gate.claim(), false, 'chỉ MỘT cú play: rAF rơi muộn không khởi động lại gì');

  const skipped = playGate();
  assert.equal(skipped.cancel(), true, 'còn cú chờ nên phải báo có, để huỷ rAF');
  assert.equal(skipped.claim(), false, 'ĐÃ BỎ QUA mà khung hình tới vẫn play() = diễn lại');
  assert.equal(skipped.cancel(), false, 'huỷ lần hai thì không còn gì để huỷ');

  // NỐI DÂY: skip() phải đóng cổng TRƯỚC khi finish(), và rAF phải đi qua cổng.
  const body = /const skip = useCallback\(\(\) => \{([\s\S]*?)\n {2}\}, \[/.exec(INTRO_SRC);
  assert.ok(body, 'không đọc được thân skip() của BookIntro');
  const cancelAt = body[1].indexOf('cancelPlayRef.current');
  const finishAt = body[1].indexOf('finishAnimations');
  assert.ok(cancelAt >= 0, 'skip() chỉ finish(): cú play() trong rAF sẽ diễn lại hoạt cảnh');
  assert.ok(finishAt > cancelAt, 'phải huỷ cú play đang chờ TRƯỚC khi finish()');
  assert.ok(
    /requestAnimationFrame\(\(\) => \{[\s\S]{0,160}gate\.claim\(\)/.test(code(INTRO_SRC)),
    'callback rAF phải hỏi cổng, không được play() thẳng',
  );
  // Và cổng KHÔNG được dùng lại cờ `alive`: `alive` còn canh cú settle(), tắt
  // nó trong skip() là để nút "Bỏ qua" treo lại và hình minh hoạ đóng băng.
  assert.ok(
    /if \(alive\) settle\(\)/.test(code(INTRO_SRC)),
    'cú settle() vẫn phải chạy sau khi bỏ qua',
  );
});

test('phím nào tính là bỏ qua: không chặn Tab và không chặn lệnh của trình duyệt', () => {
  assert.equal(keySkips({ key: 'a' }), true);
  assert.equal(keySkips({ key: ' ' }), true);
  assert.equal(keySkips({ key: 'Enter' }), true);
  // Người dùng bàn phím vẫn phải đi tới được nút "Bỏ qua".
  assert.equal(keySkips({ key: 'Tab' }), false);
  // Ctrl/Cmd/Alt+… là lệnh của trình duyệt, không phải cú bấm vào hoạt cảnh.
  assert.equal(keySkips({ key: 'r', metaKey: true }), false);
  assert.equal(keySkips({ key: 't', ctrlKey: true }), false);
  assert.equal(keySkips({ key: 'F4', altKey: true }), false);
});

/* ═══════════════════════════════════════════════════════════════════════════
   5. CHỈ transform/opacity, VÀ THỜI LƯỢNG TRONG NGÂN SÁCH
   ═══════════════════════════════════════════════════════════════════════════ */

test('mọi keyframe chỉ animate transform và opacity', () => {
  const cue = sandboxCueSteps();
  const steps = [coverStep(), bookStep(), textStep('full'), textStep('short'), cue.frame, cue.halo];
  for (const step of steps) {
    for (const frame of step.keyframes) {
      for (const prop of Object.keys(frame)) {
        assert.ok(
          ['transform', 'opacity', 'offset', 'easing'].includes(prop),
          `\`${prop}\` không phải thuộc tính được compositor lo — chỉ transform/opacity`,
        );
      }
    }
  }
});

test('thời lượng: đầy đủ 860ms (trần 900), rút gọn và dấu hiệu sandbox 240ms', () => {
  assert.equal(introDurationMs('full'), INTRO_FULL_MS);
  assert.equal(INTRO_FULL_MS, 860);
  assert.ok(INTRO_FULL_MS <= 900, 'trần 900ms');
  assert.equal(introDurationMs('short'), INTRO_SHORT_MS);
  assert.equal(INTRO_SHORT_MS, 240);
  assert.equal(SANDBOX_CUE_MS, 240);

  // Lớp chữ hiện ĐÚNG lúc bìa đã lật xong (560ms), không sớm hơn: sớm hơn thì
  // chữ nằm dưới bìa đang quét.
  assert.equal(coverStep().options.delay + coverStep().options.duration, 560);
  assert.equal(textStep('full').options.delay, 560);

  // Cú "nghiêng người vào" dùng ease-move, không ease-out: vật đi từ XA tới
  // GẦN. Dùng ease-out thì ở 230ms sách đã về cỡ thật mà bìa còn đang quét.
  assert.equal(bookStep().options.easing, EASE_MOVE);
  assert.equal(coverStep().options.easing, EASE_MOVE);
  assert.equal(textStep('full').options.easing, EASE_OUT);
});

test('dấu hiệu sandbox là cú RIÊNG: không sách, không 3D, trong 240ms', () => {
  const { frame, halo } = sandboxCueSteps();
  assert.equal(frame.options.duration, SANDBOX_CUE_MS);
  assert.ok(halo.options.delay + halo.options.duration <= SANDBOX_CUE_MS, 'quầng phải nằm trong 240ms');
  // Quầng nghỉ ở opacity 0 — đúng trạng thái nghỉ của `.halo` trong CSS, nên
  // vẫn giữ bất biến "khung cuối = trạng thái nghỉ".
  assert.equal(halo.keyframes.at(-1).opacity, '0');
  const haloCss = INTRO_CSS.match(/\n\.halo\s*\{([^}]*)\}/);
  assert.ok(haloCss && /opacity\s*:\s*0\b/.test(haloCss[1]), '.halo nghỉ ở opacity 0');
  // Khung soạn thảo nghỉ ở trạng thái HIỆN.
  assert.deepEqual(frame.keyframes.at(-1), { opacity: '1', transform: 'none' });
});

/* ═══════════════════════════════════════════════════════════════════════════
   6. ĐÃ NỐI DÂY VÀO MÀN THẬT
   ═══════════════════════════════════════════════════════════════════════════ */

test('TheoryScreen đã bọc nội dung trong BookIntro và truyền hasTheory', () => {
  assert.ok(/from '\.\.\/intro\/BookIntro'/.test(THEORY_SRC), 'TheoryScreen phải import BookIntro');
  assert.ok(/<BookIntro\b/.test(THEORY_SRC));
  assert.ok(/hasTheory=\{blocks\.length > 0\}/.test(THEORY_SRC), 'hasTheory phải lấy từ chính step_1.theory');
  // Nội dung lý thuyết là CHILDREN của BookIntro, tức luôn trong DOM.
  const inner = THEORY_SRC.slice(THEORY_SRC.indexOf('<BookIntro'), THEORY_SRC.indexOf('</BookIntro>'));
  assert.ok(/className=\{c\.theory\}/.test(inner), 'khối .theory phải nằm TRONG BookIntro');
});

test('hình minh hoạ bị đóng băng trong lúc hoạt cảnh chạy, mở lại khi lắng', () => {
  // Lý do là số đo trong lib/figure-motion.ts: SVG nhúng dạng <img> không được
  // đưa lên compositor, nên 860ms hoạt cảnh phải chia main thread với 2 hình.
  assert.ok(/inView: inView && !frozen/.test(THEORY_SRC), 'frozen phải cộng vào inView, không thay thế nó');
  assert.ok(/onSettled=\{onSettled\}/.test(THEORY_SRC));
  assert.ok(/frozen=\{!settled\}/.test(THEORY_SRC));
  // BookIntro gọi onSettled kể cả khi KHÔNG có hoạt cảnh nào, nếu không thì 28
  // bài (và người bật giảm chuyển động) bị kẹt ở trạng thái đóng băng.
  assert.ok(
    /mode !== 'off'\) return;[\s\S]{0,200}settledRef\.current\?\.\(\)/.test(INTRO_SRC),
    'nhánh mode === "off" vẫn phải gọi onSettled',
  );
});

test('SandboxScreen đã bọc ô soạn mã trong SandboxCue', () => {
  assert.ok(/from '\.\.\/intro\/BookIntro'/.test(SANDBOX_SRC));
  assert.ok(/<SandboxCue>[\s\S]*<SandboxEditor/.test(SANDBOX_SRC), 'SandboxCue phải bọc SandboxEditor');
  // KHÔNG được có cảnh gập sách / ngẩng lên ở màn này.
  assert.ok(!/BookIntro\b(?!')/.test(SANDBOX_SRC.replace(/from '[^']*'/g, '')), 'màn sandbox không có quyển sách nào');
});

test('quyển sách là TRANG TRÍ: aria-hidden, và cảnh 3D nằm trong @supports', () => {
  assert.ok(/className=\{s\.scene\}[^>]*aria-hidden="true"/.test(INTRO_SRC), 'cảnh sách phải aria-hidden');
  // Toàn bộ cảnh 3D phải nằm trong @supports — đó là lưới thoái lui thứ hai
  // (lưới thứ nhất là JS không render .scene).
  const supports = INTRO_CSS.match(
    /@supports \(transform-style: preserve-3d\) and \(backface-visibility: hidden\) \{([\s\S]*?)\n\}/,
  );
  assert.ok(supports, 'phải có khối @supports cho preserve-3d + backface-visibility');
  for (const sel of ['.scene', '.book', '.cover', '.face', '.spread']) {
    assert.ok(supports[1].includes(`${sel} {`) || supports[1].includes(`${sel},`), `${sel} phải ở trong @supports`);
  }
  // `will-change` hâm nóng TRƯỚC lúc chuyển động bắt đầu (data-warm nằm sẵn
  // trong JSX ở lần render đầu) và được nhả khi lắng.
  assert.ok(/data-warm=""/.test(INTRO_SRC), 'data-warm phải có từ lần render đầu của .scene');
  assert.ok(/removeAttribute\('data-warm'\)/.test(INTRO_SRC), 'phải nhả will-change khi lắng');
  assert.ok(/\[data-warm\][\s\S]{0,120}will-change/.test(INTRO_CSS));
});

test('cú lật bìa bị cắt trong cột nội dung, và chỗ cắt KHÔNG nằm trong ngữ cảnh 3D', () => {
  // Đo trong harness ở 1800px: bản lề ở cạnh TRÁI nên lúc đi qua 90° cái bìa
  // quét hẳn ra ngoài cột, phủ lên cả thanh điều hướng và thanh tiến độ.
  assert.ok(/\.root\[data-running\]\s*\{[^}]*overflow:\s*hidden/.test(INTRO_CSS), '.root phải cắt khung khi đang chạy');
  assert.ok(/data-running=\{running && mode === 'full'/.test(INTRO_SRC), 'chỉ cắt trong lúc bìa còn quét');
  // `.scene` là chỗ có `perspective`; `overflow` khác `visible` ở đó ép
  // `transform-style` về `flat` — tức làm DẸP quyển sách đúng lúc đang lật.
  const scene = INTRO_CSS.match(/\n\s*\.scene\s*\{([^}]*)\}/);
  assert.ok(scene, 'CSS module phải có .scene');
  assert.ok(/perspective:/.test(scene[1]), '.scene là chỗ đặt perspective');
  assert.ok(!/overflow:/.test(scene[1]), '.scene KHÔNG được có overflow — nó sẽ làm dẹp cảnh 3D');
  for (const sel of ['.book', '.cover'])
    assert.ok(
      !/overflow:/.test(INTRO_CSS.match(new RegExp(`\\n\\s*\\${sel}\\s*\\{([^}]*)\\}`))?.[1] ?? ''),
      `${sel} không được có overflow`,
    );
});

test('dùng lại use-reduced-motion và sessionStorageOrNull đã có, không viết bản thứ hai', () => {
  const lib = read(ROOT, 'frontend', 'src', 'lib', 'lesson-intro.ts');
  assert.ok(
    /from '@\/lib\/ide-handoff'/.test(INTRO_SRC),
    'sessionStorageOrNull phải dùng lại từ ide-handoff',
  );
  for (const src of [lib, INTRO_SRC])
    assert.ok(
      !/window\.sessionStorage/.test(code(src)),
      'không được đọc window.sessionStorage lần thứ hai',
    );
  // Phần quyết định phải sạch import để `node --test` nạp được không cần bundler.
  assert.ok(!/^import /m.test(lib), 'lib/lesson-intro.ts không được import gì');
  assert.ok(/from '@\/lib\/use-reduced-motion'/.test(INTRO_SRC), 'phải dùng lại usePrefersReducedMotion');
  assert.ok(!/matchMedia/.test(INTRO_SRC), 'không được tự đọc matchMedia');
  // Web Animations API không chịu ảnh hưởng của media query, nên bật giảm
  // chuyển động GIỮA lúc chạy phải tự kết thúc.
  assert.ok(/if \(reduced && running\) skip\(\)/.test(INTRO_SRC));
});
