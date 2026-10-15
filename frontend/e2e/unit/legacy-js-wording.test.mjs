/**
 * Unit test NỐI DÂY: câu chữ của JS legacy trong `public/static/js/**`.
 *
 * VÌ SAO CÓ FILE NÀY. Đã đo (15/10/2026): KHÔNG ca test nào soi bề mặt này.
 * Nhồi một câu vi phạm đủ mười luật của `ds-wording.test.mjs` vào `edu-fx.js`
 * (nạp ở MỌI trang qua `app/layout.tsx`), `pe-bridge.js` và
 * `studio-lesson.worker.js` → cả 9 file test đều XANH. Mà đây không phải mã
 * chết: 8 file trong số đó còn chạy thật trên `/lesson/db_design*`,
 * `/courses/db_design*`, `/card/*` và trên mọi trang.
 *
 * `ds-wording.test.mjs` quét `src/app/**` + `src/components/**`, tức chỉ chữ
 * nằm trong TSX. Chữ do JS legacy ghi vào DOM bằng `innerHTML`/`textContent`
 * ra đúng cùng một màn hình, nên nó phải chịu cùng bảng thuật ngữ.
 *
 * File này còn giữ MỘT việc nữa mà ds-wording không làm nổi: **kiểm NỐI DÂY**.
 * 22 file JS ở đây nhưng chỉ 8 file được `src/**` nạp; 14 file còn lại không
 * trang nào nạp (xem `DEAD`). Phân đôi đó phải được khẳng định bằng test, vì
 * cả hai chiều đều là lỗi thật:
 *   · thêm một file legacy mới mà không ai nạp → rác, và ai đọc cũng tưởng nó
 *     đang chạy (đúng chuyện đã xảy ra: báo cáo trước file này ghi
 *     "edu-chrome.js được SiteHeader nạp nên ra mọi trang", trong khi
 *     `CourseDetail.tsx:28` và `CourseDbDesign.tsx` đều nói "Không còn nạp
 *     edu-chrome.js" — `SiteHeader.tsx` chỉ NHẮC TÊN nó trong chú thích);
 *   · bật lại một file trong `DEAD` → nó mang theo đúng những vi phạm mà bảng
 *     `DEAD` đang cho phép bỏ qua, nên phải buộc người bật lại dọn trước.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const JS_DIR = join(FE, 'public', 'static', 'js');

/** Bỏ chú thích `/* … *\/` và `// …` — chú thích giải thích "vì sao bỏ Boss"
 *  thì chính nó chứa từ bị cấm, và đó là thứ phải giữ (AGENTS.md). */
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/[ \t]+\/\/.*$/gm, '');
}

/** Mọi .js dưới `public/static/js`, đệ quy; đường dẫn dùng `/` để so cho gọn. */
function walkJs(sub = '') {
  const out = [];
  for (const e of readdirSync(join(JS_DIR, sub), { withFileTypes: true })) {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walkJs(rel));
    else if (e.name.endsWith('.js')) out.push(rel);
  }
  return out;
}

/**
 * MÃ CHẾT — không `src/**` nào nạp (đã truy ngược từng chuỗi `'/static/js/…'`).
 * Câu chữ trong này không ra màn hình nào, nên không bắt nó theo bảng thuật
 * ngữ; đổi lại ca "mã chết phải THẬT là mã chết" dưới đây canh không ai nạp
 * lại nó trong im lặng. ĐỀ XUẤT XOÁ cả 14 file (3721 dòng).
 */
const DEAD = [
  'course_detail.js',
  'dashboard.js',
  'edu-chrome.js',
  'edu-dashboard.js',
  'edu-review-quiz.js',
  'icons.js',
  'questionaire.js',
  'review_quiz.js',
  'roadmap.js',
  'roadmapData.js',
  'pages/admin.inline.js',
  'pages/landing.inline.js',
  'pages/login.inline.js',
  'pages/register.inline.js',
];

/** File CÒN CHẠY: bề mặt chịu bảng thuật ngữ. */
const LIVE = walkJs().filter((f) => !DEAD.includes(f));

/** [đường dẫn, mã đã bỏ chú thích] */
const SOURCES = LIVE.map((f) => [f, codeOnly(readFileSync(join(JS_DIR, f), 'utf8'))]);

/**
 * MIỄN theo CẶP (file, luật) — không miễn trọn file cho mọi luật như
 * ds-wording, vì ở đây một file vừa chứa giọng của hệ thống (phải sửa) vừa
 * chứa tên bài của khoá db_design (nợ đã khai). `'*'` nghĩa là cả file.
 *
 * Cụm `db_design` cũ dùng một bảng thuật ngữ KHÁC và một bảng màu khác; nó
 * không nằm trong `lib/catalog.ts` nên không ai đi từ trang chủ tới đó, và
 * `ds-wording.test.mjs` đã miễn trọn lớp React của nó (`CourseDbDesign.tsx`,
 * `card/[cardId]`) chờ một đợt chuyển riêng cùng `edu-course-detail.css`. Các
 * dòng dưới đây là ĐÚNG cụm đó, nhìn từ phía JS.
 */
const EXEMPT = [
  ['lesson_content.js', '*',
    'Dữ liệu GIÁO TRÌNH của khoá db_design (20 bài, 5349 dòng): tên bài '
    + '"Boss Battle — …", văn dạy "Hãy nghĩ JSONB như tủ đồ", "khóa chính/ngoại". '
    + 'Sửa câu chữ ở đây là sửa NỘI DUNG một khoá ngoài danh mục — cùng đợt với '
    + 'CourseDbDesign.tsx, không phải đợt dọn giọng hệ thống này.'],
  ['lesson_content_tc.js', '*',
    'Dữ liệu giáo trình db_design_tc (25 bài). Ba chỗ "nhé" là DỮ LIỆU MẪU — '
    + 'dòng bình luận giả "Admin GuildBoard là bạn tôi đấy nhé" trong bảng ví dụ '
    + 'của bài SQL injection, tức lời của một nhân vật, không phải giọng hệ thống.'],
  ['lesson_content_nc.js', '*',
    'Dữ liệu giáo trình db_design_nc (25 bài, 6504 dòng). Hai lưu ý đã đo: 🔥 ở '
    + 'đây gắn với "BOSS BATTLE — Engine Under Fire" và nhãn sự cố "🔥 P0 · '
    + 'LATENCY" (lửa = đám cháy, không phải chuỗi ngày); 11 chỗ "vĩnh viễn" là '
    + 'văn kỹ thuật đúng ("hai giao dịch chờ nhau vĩnh viễn" — deadlock), KHÔNG '
    + 'phải lời hứa trọn đời, nên không có luật nào bắt chúng.'],
  ['course_db_design.js', ['khoá', 'module'],
    'Nhãn giáo trình "Khóa Cơ bản: 20 bài · 3 module" (và bản Nâng cao) — ĐÚNG '
    + 'chuỗi mà ds-wording trích trong dòng miễn của CourseDbDesign.tsx: JS này '
    + 'ghi đè bản mặc định trong JSX đó, nên đổi một phía là hai lớp lệch chính '
    + 'tả nhau. Phải đổi cùng lúc với CourseDbDesign.tsx.'],
  ['course_db_design.js', ['Boss'],
    'TÊN BÀI của khoá db_design: "Boss Battle — Social Graph Detective", '
    + '"Boss Battle — Engine Under Fire", "Boss Battle — Diễn đàn GuildBoard". '
    + 'Đổi tên bài là việc của đợt chuyển cụm đó, không phải của đợt dọn giọng.'],
  ['lesson_db_design.js', ['Boss', '⚔️', '🔥'],
    'Vỏ BOSS/SEV-1 của khoá db_design: cờ `l.boss`, hàm `applyBossSkin`, tiêu đề '
    + 'SVG "⚔ BOSS: AUDIT DIỄN ĐÀN GUILDBOARD ⚔" và "🔥 BOSS — ENGINE UNDER FIRE", '
    + 'biên bản sự cố "🔥 <đám cháy>". Gắn '
    + 'với TÊN BÀI nên thuộc nợ đã khai; giọng hệ thống trong file này (dỗ dành, '
    + 'reo hộ, "hoàn thành", ▶ trong tên nút) đã dọn trong đợt này.'],
  ['decomp_game.js', ['Boss'],
    'Chú dẫn mini-game cho bài cuối chặng của khoá db_design, nhãn nút "Xong Boss '
    + 'Battle!" lấy đúng TÊN BÀI. Phần "Hoàn thành" đã đổi thành "Xong" trong đợt '
    + 'này; còn chữ "Boss" thì chờ đổi tên bài.'],
];

/** Cặp (file, luật) nào đã THẬT SỰ che một vi phạm — xem ca cuối file. */
const exemptUsed = new Set();

function isExempt(path, ruleId) {
  for (const [file, rules] of EXEMPT) {
    if (file !== path) continue;
    if (rules === '*' || rules.includes(ruleId)) {
      exemptUsed.add(`${file}|${rules === '*' ? '*' : ruleId}`);
      return true;
    }
  }
  return false;
}

/**
 * Tìm một mẫu trên cả bề mặt; trả về "file:dòng  nội dung".
 *
 * CHUẨN HOÁ trước khi so — hai bẫy đã trả giá ở ds-wording:
 *  · NFC: "khoá" gõ bằng dấu TỔ HỢP là dãy ký tự khác hẳn bản dựng sẵn, lọt
 *    mọi mẫu mà nhìn trên màn hình không ai phân biệt được;
 *  · gộp khoảng trắng: nbsp (U+00A0) và hai dấu cách liền nhau làm
 *    "3  module" lọt mẫu /3 module/.
 * `allow()` nhận dòng NGUYÊN vì vài luật xét ký tự ngay cạnh mẫu.
 */
function hits(pattern, ruleId, allow = () => false) {
  const out = [];
  for (const [path, code] of SOURCES) {
    code.split('\n').forEach((raw, i) => {
      const line = raw.normalize('NFC').replace(/[^\S\n]+/g, ' ');
      if (!pattern.test(line) || allow(raw)) return;
      if (isExempt(path, ruleId)) return;
      out.push(`${path}:${i + 1}  ${line.trim().slice(0, 110)}`);
    });
  }
  return out;
}

function assertAbsent(ruleId, pattern, why, allow) {
  const found = hits(pattern, ruleId, allow);
  assert.deepEqual(found, [], `[${ruleId}] ${why}\n${found.join('\n')}`);
}

/* ── 0 · chốt chặn: bề mặt không được RỖNG ────────────────────────────── */

test('bề mặt quét không rỗng — vòng lặp rỗng là cách một bộ test chết mà vẫn xanh', () => {
  /* Đã bắt được ĐÚNG lỗi này một lần ở `ds-tokens.test.mjs:511`: hàm đọc file
     trả về mảng rỗng (đổi thư mục, đổi phần mở rộng) nên mọi `for` bên dưới
     chạy 0 lượt và mọi `assert.deepEqual(found, [])` đều đạt. Ca này phải
     đứng TRƯỚC các ca luật, và phải nói con số, không chỉ "> 0". */
  const all = walkJs();
  assert.ok(all.length >= 22, `chỉ đọc ra ${all.length} file .js trong public/static/js`);
  assert.ok(LIVE.length >= 8, `chỉ còn ${LIVE.length} file CÒN CHẠY trong bề mặt`);
  assert.equal(all.length, LIVE.length + DEAD.length,
    'có file .js không nằm trong LIVE lẫn DEAD — phân loại nó trước đã');
  // Và mỗi file phải đọc ra mã thật, không phải chuỗi rỗng.
  for (const [path, code] of SOURCES) {
    assert.ok(code.trim().length > 0, `${path} đọc ra rỗng sau khi bỏ chú thích`);
  }
});

/* ── 1 · nối dây: ai nạp file nào ─────────────────────────────────────── */

/** Toàn bộ `src/**` gộp làm một chuỗi — để tra `'/static/js/<tên>'`. */
function readSrcAll() {
  const parts = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|mjs|js)$/.test(e.name)) parts.push(readFileSync(p, 'utf8'));
    }
  })(join(FE, 'src'));
  return parts.join('\n');
}

test('mỗi file CÒN CHẠY phải có một chỗ nạp thật trong src/**', () => {
  const src = readSrcAll();
  const orphan = LIVE.filter((f) => !src.includes(`/static/js/${f}`));
  assert.deepEqual(
    orphan, [],
    'File legacy không ai nạp thì là rác, và ai đọc cũng tưởng nó đang chạy. '
    + 'Đưa nó vào bảng DEAD (kèm đề xuất xoá) hoặc nối dây cho nó.',
  );
});

test('mã chết phải THẬT là mã chết — nạp lại thì phải dọn câu chữ trước', () => {
  const src = readSrcAll();
  const revived = DEAD.filter((f) => src.includes(`/static/js/${f}`));
  assert.deepEqual(
    revived, [],
    'File trong bảng DEAD đang được nạp lại. Nó mang theo đúng những vi phạm mà '
    + 'bảng DEAD cho phép bỏ qua (edu-chrome.js 13 chỗ "khóa", dashboard.js 13 '
    + '"khóa" + 3 "nhé" + 6 "hoàn thành"…). Gỡ nó khỏi DEAD và dọn, hoặc đừng nạp.',
  );
});

/* ── 2 · giọng: không dỗ dành, không reo hộ, không thúc ép ────────────── */

test('không dỗ dành bằng hạt "nhé"', () => {
  // Cờ `i` (hoa đầu câu) + chặn "nhét" — hai chỗ ds-wording từng trượt.
  const HAT = /nhé(?!\p{L})/iu;
  assert.ok(HAT.test('Đọc kỹ rồi tiếp tục nhé!'), 'mẫu không bắt nổi chuỗi cũ của lesson_db_design');
  assert.ok(HAT.test('Kéo thả — không tự động đặt nhé'), 'mẫu không bắt nổi nhãn cũ');
  assert.ok(HAT.test('Nhé, thử lại'), 'mẫu bỏ sót chữ hoa đầu câu');
  assert.ok(!HAT.test('KHÔNG nhét 1 ô, phải TÁCH BẢNG'), 'mẫu bắt lầm "nhét"');

  assertAbsent('nhé', HAT,
    'Giọng đã chốt: dẫn đường bình thản. Ba chỗ cũ trong lesson_db_design.js đều '
    + 'bám vào câu KHÔNG phải lỗi của người học ("Chưa đúng rồi… tiếp tục nhé!").');
});

test('không reo hộ người học', () => {
  /* Lỗi thật đã sửa: `showMCQExplain('Chính xác! Tuyệt vời 🎉')` và
     `flashTerminal('✓ Tuyệt vời! Bạn đã điền đúng N/M ô.')` trong
     lesson_db_design.js. Câu thứ hai đã có SỰ THẬT ("đúng N/M ô") — lời reo chỉ
     che nó đi.

     "Xuất sắc" KHÔNG nằm trong mẫu này, khác ds-wording: trên bề mặt legacy nó
     là nhãn bậc 5 của thang đánh giá KHOÁ (`5: 'Xuất sắc! 🎉'`,
     course_db_design.js) — nói về khoá học, không reo vào mặt người học — và là
     `success_message` do tác giả bài viết trong lesson_content.js (nợ đã khai). */
  const REO = /Tuyệt vời|Giỏi lắm|Hoan hô|Quá đỉnh|Cố lên/i;
  assert.ok(REO.test('Chính xác! Tuyệt vời 🎉'), 'phép so không bắt nổi chuỗi cũ');
  assert.ok(REO.test('✓ Tuyệt vời! Bạn đã điền đúng 3/4 ô.'), 'phép so không bắt nổi chuỗi cũ thứ hai');

  assertAbsent('reo', REO,
    'Hệ thống là người dẫn đường bình thản, không reo hộ. Nói thẳng việc vừa xảy '
    + 'ra ("Đã điền đúng 3/4 ô.") là đủ.');
});

test('không thúc ép bằng "Hãy…" hay "bạn phải"', () => {
  const EP = /(?:^|[.;:>] )Hãy |\bbạn phải\b/;
  assert.ok(EP.test('Nội dung bài học này đang được cập nhật. Hãy thử bài khác trong roadmap.'),
    'mẫu không bắt nổi câu cũ của lesson_db_design');
  assert.ok(EP.test('[!] Bạn chưa nhập query nào. Hãy thử gõ SELECT ... và nhấn Run.'),
    'mẫu không bắt nổi câu cũ thứ hai');

  assertAbsent('thúc ép', EP,
    'Giọng đã chốt: không thúc ép, luôn chừa lối khác. "Thử bài khác trong '
    + 'roadmap." nói đúng việc cần làm mà không ra lệnh.');
});

/* ── 3 · một việc, một từ ─────────────────────────────────────────────── */

test('chính tả "khoá" cho KHOÁ HỌC — và không đụng "khóa chính/khóa ngoại"', () => {
  /* ĐÂY LÀ LUẬT DỄ LÀM HỎNG NỘI DUNG NHẤT trên bề mặt này. Đã đếm theo từ đứng
     sau: tuyệt đại đa số "khóa" ở đây là THUẬT NGỮ CSDL và phải giữ nguyên —
     `khóa chính` 26, `khóa ngoại` 11, `khóa X`/`khóa S` 67 (lock của 2PL),
     `khóa ghép`, `khóa dòng`, `khóa bảng`, `khóa lá`, `(khóa, 1)` của
     MapReduce… Nghĩa KHOÁ HỌC chỉ là một tập nhỏ đếm được, nên mẫu đòi đúng
     những từ đi sau đó thay vì cấm trần chữ "khóa". */
  const KH = /khóa (?:học|Cơ bản|Nâng cao|Trung cấp)/i;
  assert.ok(KH.test('hủy đăng ký khóa học Database Design'), 'mẫu không bắt nổi chuỗi cũ');
  assert.ok(KH.test('audit ở <strong>khóa Cơ bản</strong> (Ticket #14)'), 'mẫu không bắt nổi chuỗi cũ thứ hai');
  assert.ok(KH.test('Bạn đã hoàn thành toàn bộ khóa học! 🎓'), 'mẫu không bắt nổi chuỗi cũ thứ ba');
  // Và phải THẬT SỰ bỏ qua thuật ngữ CSDL — sửa nhầm là làm hỏng bài dạy.
  for (const ok of [
    'Hiểu khóa chính/khóa ngoại & chuẩn hóa cơ bản (1NF–3NF)',
    'PK, FK, khóa ghép — chốt đúng 1 dòng trong mọi tình huống',
    'GROWING chỉ được XIN khóa, SHRINKING chỉ được NHẢ khóa',
    'Mỗi máy đọc phần dữ liệu của mình, phát cặp (khóa, 1).',
  ]) assert.ok(!KH.test(ok), `mẫu bắt lầm thuật ngữ CSDL: ${ok}`);

  assertAbsent('khoá', KH,
    'Bảng thuật ngữ chốt viết "khoá" (cùng kiểu hoá/hoạ) cho KHOÁ HỌC. Thuật ngữ '
    + 'CSDL ("khóa chính", "khóa ngoại") giữ nguyên — đừng thay hàng loạt.');
});

test('nhãn trạng thái dùng "đã xong", không dùng "hoàn thành"', () => {
  const XONG = /hoàn thành/i;
  assert.ok(XONG.test("'Bạn đã hoàn thành bài học!'"), 'mẫu không bắt nổi chuỗi cũ');
  assert.ok(XONG.test('Đang chờ bạn hoàn thành thử thách...'), 'mẫu không bắt nổi chuỗi cũ thứ hai');

  assertAbsent('đã xong', XONG,
    'Bảng thuật ngữ: "đã xong"; "hoàn thành" chỉ dùng cho tên trường dữ liệu — mà '
    + 'ở bề mặt này mọi chỗ còn lại đều là chữ người học đọc.');
});

test('không còn pill chuỗi ngày 🔥', () => {
  assertAbsent('🔥', /\u{1F525}/u,
    'Chuỗi bị ĐỨT là thứ đẩy người học bỏ cuộc; bản thiết kế đã gỡ khỏi cả sản '
    + 'phẩm (commit 8be27b2 gỡ 21 chuỗi "Boss" khỏi nội dung 48 bài).');
});

test('không còn chữ "Boss" trong giọng của hệ thống', () => {
  const BOSS = /\bboss\b/i;
  assert.ok(BOSS.test("'Hoàn thành Boss Battle! 🎉'"), 'mẫu không bắt nổi nhãn cũ');
  assert.ok(!BOSS.test('bossa nova'), 'mẫu phải bám biên từ');

  assertAbsent('Boss', BOSS,
    'Ẩn dụ đánh trận trái triết lý tự học. Chỗ còn lại là TÊN BÀI của khoá '
    + 'db_design — đã khai trong bảng EXEMPT, không tự đổi tên bài ở đợt này.');
});

test('ký tự ⚔️ không được nằm trong tên của phần tử', () => {
  /* Tách khỏi luật "Boss" có chủ đích: `decomp_game.js` được MIỄN luật "Boss"
     (nhãn nút lấy đúng tên bài), nên nếu gộp hai thứ vào một luật thì thẻ
     `<span class="decomp-rule-icon">⚔️</span>` cũng được miễn theo — và bản sửa
     aria-hidden ở đó hoá ra không có ai canh. Đo được: gộp luật thì gỡ
     `aria-hidden` ra vẫn 0 ca trượt; tách luật thì 1 ca trượt. */
  assertAbsent('⚔️', /⚔/u,
    'Ẩn dụ đánh trận đã gỡ khỏi sản phẩm. Còn cần ký tự để trang trí thì bọc '
    + 'trong <span aria-hidden="true"> — lúc đó nó không vào tên của phần tử nữa.',
    // Dòng đã nói thẳng "đây là trang trí" thì không còn là lỗi.
    (line) => /aria-hidden/.test(line));
});

test('không mùi thi cử: không "Chấm điểm", không "máy lab"', () => {
  assertAbsent('Chấm điểm', /chấm điểm/i,
    'Việc ở đây là tự kiểm, không phải thi. (edu-review-quiz.js còn 1 chỗ, nhưng '
    + 'file đó là mã chết — xem bảng DEAD.)');
  assertAbsent('máy lab', /máy lab|máy thật/i,
    'Nền tảng này không có lớp học, nên không có "máy lab"; "máy thật" ngầm nói '
    + 'trình duyệt là giả mà không giải thích gì.');
});

test('không đo tốc độ trả lời bằng "combo"', () => {
  assertAbsent('combo', /\bcombo\b/i,
    'Combo là con số TỤT khi người học dừng lại suy nghĩ — chỉ số hiện ra phải '
    + 'là loại chỉ tăng.');
});

test('ký tự ▶ không được nằm trong TÊN của nút', () => {
  /* Trình đọc màn hình đọc nhãn nút làm tên của nút, nên "▶ Chạy Query" được
     đọc thành tên ký tự mũi tên rồi mới tới việc nút làm. Đã sửa 8 nhãn trong
     drag_game.js / lesson_db_design.js / course_db_design.js: bọc
     <span aria-hidden="true"> ở chỗ dựng bằng innerHTML, và BỎ HẲN ký tự ở chỗ
     nhãn bị `setBtn()` ghi lại bằng textContent (span không sống nổi ở đó).

     Luật xét theo CẤU TRÚC chứ không cấm trần ký tự — và chỉ xét ▶, không xét
     ↻/↺: năm chỗ ↻ còn lại là nhãn trong SVG sơ đồ recovery ("↻ REDO — T0")
     và dòng readout, không phải tên nút. */
  assertAbsent('▶', /▶/,
    'Bọc trong <span aria-hidden="true"> (dựng bằng innerHTML) hoặc bỏ ký tự '
    + '(nhãn đặt bằng textContent).',
    (line) => /aria-hidden/.test(line));
});

test('một nhóm bài gọi là "chặng", không gọi là "module"', () => {
  const MOD = /(?:\d|\}) module\b/;
  assert.ok(MOD.test('Khóa Cơ bản: 20 bài · 3 module'), 'mẫu không bắt nổi nhãn cũ');
  assert.ok(!MOD.test('COURSE_LESSONS (mỗi khoá có phân bố module khác nhau)'),
    'mẫu bắt lầm chữ module không đi sau một con số');

  assertAbsent('module', MOD,
    'Bảng thuật ngữ (lib/home-copy.ts): khoá → chặng → bài → màn. Chỗ còn lại là '
    + 'nhãn giáo trình của cụm db_design, phải đổi cùng CourseDbDesign.tsx.');
});

/* ── 4 · dòng MIỄN không được mục đi ──────────────────────────────────── */

test('mỗi cặp MIỄN phải còn che một vi phạm THẬT, và nêu lý do', () => {
  /* Đã xảy ra đúng một lần ở ds-tokens.test.mjs: file bị xoá nhưng dòng miễn
     trỏ vào nó thì ở lại — một khoá không bao giờ khớp kèm một câu chú thích
     khẳng định sai về hiện trạng. Ca này PHẢI đứng cuối file: `exemptUsed`
     được điền bởi chính các ca ở trên. */
  for (const [file, rules, reason] of EXEMPT) {
    assert.ok(
      typeof reason === 'string' && reason.length >= 60,
      `dòng miễn ${file} không nêu lý do đủ rõ — miễn phải đắt`,
    );
    assert.ok(LIVE.includes(file), `${file} không còn trong bề mặt — gỡ dòng miễn này đi`);
    const keys = rules === '*' ? ['*'] : rules;
    for (const k of keys) {
      assert.ok(
        exemptUsed.has(`${file}|${k}`),
        `${file} · luật "${k}" không còn chỗ nào vi phạm — gỡ nó khỏi dòng miễn, `
        + 'đừng để nó mục lại trong bảng',
      );
    }
  }
});

/**
 * ── BẰNG CHỨNG BẮT ĐƯỢC LỖI THẬT ──────────────────────────────────────
 * Đã CHẠY THẬT bảy lượt gỡ-rồi-trả (15/10/2026), chạy riêng file này sau mỗi
 * lượt; con số là đo được, nền là 16/16 đạt:
 *   · trả 4 chuỗi cũ vào `lesson_db_design.js` — 'Chính xác! Tuyệt vời 🎉',
 *     'Đọc kỹ rồi tiếp tục nhé!', 'Bạn đã hoàn thành toàn bộ khóa học! 🎓',
 *     'Hãy thử bài khác trong roadmap.' → **5 ca trượt**: "nhé", "reo hộ",
 *     "thúc ép", "khoá", "đã xong" (một chuỗi vi phạm hai luật cùng lúc).
 *   · trả '▶ Chạy Query' vào `drag_game.js` → **1 ca**: "▶ trong tên nút".
 *   · gỡ `aria-hidden` khỏi '<span class="decomp-rule-icon">⚔️</span>' trong
 *     `decomp_game.js` → **1 ca**: "⚔️ trong tên của phần tử". ĐÂY là lượt đã
 *     sửa chính bộ luật: khi ⚔️ còn gộp trong luật "Boss", lượt này ra **0 ca**
 *     vì `decomp_game.js` được miễn luật "Boss" — tách hai luật mới có người canh.
 *   · nạp `edu-chrome.js` lại từ một file `src/**` → **1 ca**: "mã chết phải
 *     THẬT là mã chết".
 *   · thêm `public/static/js/tmp.js` không ai nạp → **1 ca**: "mỗi file CÒN CHẠY
 *     phải có chỗ nạp".
 *   · cho `walkJs()` lọc `.mjs` (bề mặt thành RỖNG) → **2 ca**: chốt chặn mục 0
 *     và ca MIỄN — còn 10 ca luật vẫn XANH, đúng cách một bộ test chết mà vẫn
 *     báo đạt (đã bắt đúng lỗi này ở `ds-tokens.test.mjs:511`).
 *   · thêm một cặp MIỄN trỏ vào `table_explorer.js` (file sạch) → **1 ca**:
 *     "mỗi cặp MIỄN phải còn che một vi phạm THẬT".
 */
