/**
 * Unit test NỐI DÂY: câu chữ của trang bài học theo bảng thuật ngữ và giọng
 * đã chốt trong design-system-v2 mục 2.
 *
 * Vì sao phải có. Triết lý đã chốt là "tự học + hệ thống dẫn đường + thích
 * ứng": hệ thống là người dẫn đường kiên nhẫn, không phải thầy chấm bài. Câu
 * chữ là chỗ triết lý đó hiện ra, và cũng là chỗ dễ trượt nhất — một chuỗi
 * đổi đi là không ai thấy trong diff của một tính năng khác. Những chuỗi
 * dưới đây đều là chuỗi THẬT đã có trong sản phẩm và đã sửa trong lần này;
 * test giữ chúng không quay lại.
 *
 * Bốn nhóm, theo đúng bốn lý do bản thiết kế nêu:
 *   1. THI ĐUA / ĐÁNH TRẬN — "Boss", "⚔️", "combo", chuỗi ngày.
 *   2. PHẠT NGƯỜI XIN GIÚP ĐỠ — trừ XP khi mở gợi ý.
 *   3. MÙI THI CỬ / THÚC ÉP — "Chấm điểm", "phải", "Hãy…".
 *   4. MỘT VIỆC MỘT TỪ — khoá / chặng / bài / màn, "Bàn thí nghiệm",
 *      "đã xong", "máy tính của bạn".
 *   5. (không phải nhóm chuỗi) DÒNG MIỄN KHÔNG ĐƯỢC MỤC — mỗi dòng trong
 *      bảng EXEMPT phải còn che một chỗ vi phạm thật, nếu không thì gỡ.
 *
 * Cách kiểm: đọc mã nguồn, BỎ CHÚ THÍCH trước khi tìm — chính các chú thích
 * giải thích "vì sao bỏ Boss / bỏ trừ XP" lại chứa những từ bị cấm, và đó là
 * thứ phải giữ lại (AGENTS.md: chú thích nói VÌ SAO, dẫn ra lỗi đang sửa).
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

/** Bỏ chú thích /* … *\/, // … và {/* … *\/} của JSX. */
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/[ \t]+\/\/.*$/gm, '');
}

/**
 * Bề mặt quét: TOÀN BỘ `src/app/**` + `src/components/**`, đệ quy.
 *
 * 15/10/2026 — trước đó danh sách này chỉ có `lesson-chrome/**` và
 * `python-studio/**`, tức đúng trang bài học. Hậu quả đo được: trang khoá in
 * "8 module · 48 bài học" trong khi trang chủ in "8 chặng · 48 bài" và màn Thử
 * thách ôn nói "chặng" 9 lần — mà trang khoá nằm GIỮA hai màn đó trên đúng
 * luồng của người học (trang chủ → trang khoá → bài / ôn tập). Ca nào cũng
 * xanh, vì trang khoá nằm NGOÀI bề mặt được kiểm. Bảng thuật ngữ nói về sản
 * phẩm, không nói về một thư mục, nên bề mặt phải là cả sản phẩm.
 */
/*
 * 15/10/2026 (lượt hai) — thêm `src/lib`. Lý do đo được, và nó đúng là cái bẫy
 * mà bề mặt cũ tự dựng ra: cách sửa quen tay trong repo này là TÁCH một chuỗi
 * khỏi `.tsx` sang `src/lib` "cho `node --test` soi được" — nhưng `ROOTS` lại
 * không có `src/lib`, nên tách ra là ra khỏi tầm của chính bảng thuật ngữ. Ba
 * chỗ sống sót đúng theo cách đó, và cả ba đã sửa cùng lượt này:
 *   · `runner-error.ts` — 'nên IDE chưa chạy được mã. … trong khóa …', là bản
 *     được dùng ở BỐN chỗ gọi, nhiều hơn bản viết đúng trong `IdeClient.tsx`;
 *   · `gate-notice.ts` — "hoàn thành" ×2 (xem ghi chú ở ca "đã xong");
 *   · `figure-motion.ts` — '▶ Chạy hình' / '⏸ Dừng hình'.
 * Đếm chuỗi có dấu tiếng Việt trong `src/lib`: ~180 chuỗi trên 13 file, tức
 * đây không phải một góc nhỏ — nó là lượng chữ ngang `src/app`.
 */
const ROOTS = [
  ['src', 'app'],
  ['src', 'components'],
  ['src', 'lib'],
];

function walk(dir, out = []) {
  for (const name of readdirSync(join(FE, ...dir), { withFileTypes: true })) {
    if (name.isDirectory()) walk([...dir, name.name], out);
    else if (/\.tsx?$/.test(name.name)) out.push([...dir, name.name]);
  }
  return out;
}

/**
 * MIỄN, mỗi dòng nêu lý do — và `hits()` dưới đây vẫn ĐẾM chúng, nên dòng miễn
 * nào không còn chỗ vi phạm nào là test đỏ. Không có đường bỏ qua im lặng.
 *
 * Cụm `db_design` cũ (bản chuyển nguyên văn từ Django, 3 trang khoá +
 * `/card/[cardId]`) dùng một bảng thuật ngữ KHÁC và một bảng màu khác: nó không
 * nằm trong danh mục (`lib/catalog.ts` chỉ còn `python_advanced` + `ide`) nên
 * không ai đi từ trang chủ tới đó, và nó là nợ của một đợt riêng — xem ghi chú
 * "NỢ CÒN LẠI: TRANG KHOÁ" ở cuối ds-tokens.test.mjs. Sửa câu chữ ở đó mà chưa
 * sửa bảng màu/CSS legacy là làm dở nửa vời.
 */
const EXEMPT = [
  ['src/components/CourseDbDesign.tsx',
    'Trang khoá db_design cũ: "Khóa Cơ bản: 20 bài · 3 module", "Boss Battle", '
    + '"khóa ngoại" (thuật ngữ CSDL, không phải "khoá học"). Cả cụm này chờ một đợt '
    + 'chuyển riêng cùng CSS legacy edu-course-detail.css.'],
  ['src/app/(standalone)/card/[cardId]/page.tsx',
    '"Về roadmap khóa học" — cùng cụm db_design cũ, cùng đợt chuyển.'],
  ['src/components/python-studio/useLessonProgress.ts',
    'Ô "+10 điểm · Combo x3 🔥" bật lên TRONG lượt làm bài. Bảng sửa chuỗi chỉ đích '
    + 'danh chỉ số "Combo cao nhất" ở màn tổng kết (đã bỏ); bỏ emoji nói chung thì '
    + 'chủ sản phẩm CHƯA CHỐT.'],
];

/** [đường dẫn tương đối để báo lỗi, mã đã bỏ chú thích] cho cả bề mặt. */
const SOURCES = ROOTS.flatMap((root) => walk(root)
  .map((p) => [p.join('/'), codeOnly(read(...p))]));

const EXEMPT_PATHS = EXEMPT.map(([p]) => p);

/** Dòng miễn nào đã THẬT SỰ che một chỗ vi phạm — xem ca cuối file. */
const exemptUsed = new Set();

/**
 * Tìm một mẫu trên toàn bề mặt; trả về danh sách "file: dòng".
 *
 * `allow(line)` xét trên DÒNG NGUYÊN (chưa cắt ngắn) — dùng cho những luật mà
 * điều kiện hợp lệ nằm ngay cạnh mẫu, ví dụ ký tự trang trí đã `aria-hidden`.
 */
function hits(pattern, allow = () => false) {
  const out = [];
  for (const [path, code] of SOURCES) {
    code.split('\n').forEach((raw, i) => {
      // CHUẨN HOÁ trước khi so. Hai thứ từng lọt qua MỌI luật của file này, đo
      // được bằng cách tự nhồi vi phạm rồi chạy lại:
      //  · NFD — "khoá" gõ bằng dấu TỔ HỢP (k-h-o-a + U+0301) là dãy ký tự
      //    khác hẳn "khoá" dựng sẵn, nên /bị khoá/ không khớp. Trình soạn thảo
      //    trên macOS và chữ dán từ web sinh ra NFD mà nhìn trên màn hình
      //    không ai phân biệt được.
      //  · Khoảng trắng không ngắt (U+00A0) và hai dấu cách liền nhau —
      //    "8  module" và "8 module" đều lọt mẫu /8 module/.
      // `allow()` vẫn nhận dòng NGUYÊN vì vài luật xét ký tự ngay cạnh mẫu.
      const line = raw.normalize('NFC').replace(/[^\S\n]+/g, ' ');
      if (!pattern.test(line) || allow(raw)) return;
      if (EXEMPT_PATHS.includes(path)) {
        exemptUsed.add(path);
        return;
      }
      out.push(`${path}:${i + 1}  ${line.trim().slice(0, 110)}`);
    });
  }
  return out;
}

function assertAbsent(pattern, why, allow) {
  const found = hits(pattern, allow);
  assert.deepEqual(found, [], `${why}\n${found.join('\n')}`);
}

/* ── 1 · không thi đua, không đánh trận ───────────────────────────────── */

test('không còn "Boss" hay ⚔️ — bài cuối chặng gọi là "bài tổng hợp chặng"', () => {
  assertAbsent(
    /⚔️|\bBoss\b|\bBOSS\b/,
    'Bảng thuật ngữ chốt: "bài tổng hợp chặng", không dùng "Boss / trận Boss / '
    + 'hạ Boss" — đó là ẩn dụ đánh trận, trái triết lý tự học.',
  );
});

test('không hiện chỉ số "Combo cao nhất" ở màn tổng kết', () => {
  assertAbsent(
    /label:\s*['"`]Combo/,
    'Combo đo TỐC ĐỘ trả lời liên tiếp — một con số TỤT khi người học dừng lại '
    + 'suy nghĩ. Chỉ số hiện ra phải là loại chỉ tăng.',
  );
});

test('không nói "chuỗi combo bị ngắt" khi người học chọn sai', () => {
  assertAbsent(
    /Chuỗi combo|combo bị ngắt|\bBẫy!/,
    'Giọng đã chốt: sai là dữ liệu, không phải lỗi của người. Không thông báo '
    + 'mất mát khi trả lời chưa đúng.',
  );
});

test('không còn pill chuỗi ngày 🔥 ở khung bài học', () => {
  // Chốt lại ở đây vì nó dễ bò về cùng lúc với bất kỳ chỉ số mới nào; ca này
  // nhìn CẢ bề mặt, còn lesson-chrome-no-streak.test.mjs soi riêng LessonChrome.
  // Chỗ MIỄN duy nhất (`useLessonProgress.ts`) nằm ở bảng EXEMPT đầu file, và
  // ca cuối file canh cho nó không mục đi.
  assertAbsent(
    /🔥/,
    'Chuỗi bị ĐỨT là thứ đẩy người học bỏ cuộc; bản thiết kế đã gỡ.',
  );
});

test('không nói "chặng tiếp theo đã mở khoá" — không có cơ chế khoá chặng nào', () => {
  // Mẫu nói về NỘI DUNG bị khoá (chặng/bài/màn), không phải mọi chữ "bị khoá":
  // màn Thử thách ôn khoá đúng phương án người học vừa thử — cái khoá ĐÓ có
  // thật, nằm trong `lockedOptionIndex()` và có test riêng. Bản trước cấm trần
  // "bị khoá", nên mở rộng bề mặt quét là nó bắt oan đúng câu nói sự thật.
  assertAbsent(
    /đã mở khoá|đã mở khóa|(?:chặng|bài|màn|chương)\b[^.\n]{0,24}bị kho[áa]/,
    'Grep cả frontend và backend không thấy cơ chế khoá chặng. Câu đó hứa một '
    + 'cánh cửa không tồn tại, và trái với quyền tự chọn bài.',
  );
});

/* ── 2 · không phạt người xin giúp đỡ ─────────────────────────────────── */

test('mở gợi ý KHÔNG trừ XP', () => {
  assertAbsent(
    /Mở gợi ý.*XP|XP.*Mở gợi ý|-\$\{.*cost.*\}\s*XP|⚡ Mở/,
    'Trừ XP của người đi xin giúp đỡ là phạt đúng lúc họ cần giúp nhất.',
  );
  const hint = codeOnly(read('src', 'components', 'lesson-chrome', 'exercises', 'HintSheet.tsx'));
  assert.ok(!/\bcost\b/.test(hint), 'HintSheet còn trường `cost` — để lại là mời bật lại việc trừ XP');
  assert.ok(hint.includes('Mở gợi ý này'), 'nhãn nút mở gợi ý phải là "Mở gợi ý này"');
});

/* ── 3 · không mùi thi cử, không thúc ép ──────────────────────────────── */

test('nút nộp bài là "Nộp để kiểm", không phải "Nộp & Chấm điểm"', () => {
  assertAbsent(
    /Chấm điểm/,
    'Bảng sửa chuỗi: "Nộp & Chấm điểm" → "Nộp để kiểm". Việc ở đây là tự kiểm, '
    + 'không phải thi.',
  );
  const cta = codeOnly(read('src', 'components', 'python-studio', 'cta.ts'));
  assert.ok(cta.includes('Nộp để kiểm'), 'cta.ts phải dùng nhãn "Nộp để kiểm"');
});

test('không câu nào thúc ép bằng "phải" hay mở đầu bằng "Hãy"', () => {
  // Chỉ soi CHUỖI HIỂN THỊ: `'…'`, `"…"`, hoặc nội dung template.
  const offenders = [];
  for (const [path, code] of SOURCES) {
    if (EXEMPT_PATHS.includes(path)) continue;
    for (const m of code.matchAll(/(['"`])((?:[^\\\n]|\\.)*?)\1/g)) {
      const s = m[2];
      if (!/[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩậắằẳẵặẹẻẽếềểệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(s)) continue;
      if (/\bCòn phải làm\b|^Hãy |[.;] Hãy |\bbạn phải\b|\bphải nộp\b/.test(s)) {
        offenders.push(`${path}: ${s.slice(0, 110)}`);
      }
    }
  }
  assert.deepEqual(
    offenders, [],
    'Giọng đã chốt: không thúc ép, không gây áy náy, luôn chừa lối khác.\n'
    + offenders.join('\n'),
  );
});

test('không dỗ dành bằng hạt "nhé", không nhắc "Đừng sai"', () => {
  /* Giọng đã chốt là người dẫn đường BÌNH THẢN. Hạt "nhé" kéo câu về kiểu
     người lớn dỗ trẻ, và nó bám đúng vào những câu KHÔNG phải lỗi của người
     học — năm trong tám chỗ là thông báo mạng chập chờn hoặc server chưa tạo
     được đề ("Mạng đang chập chờn… Thử lại nhé."). Thêm một hạt an ủi vào một
     lỗi hạ tầng là ngầm nói lỗi ở người đang đọc.

     Chỗ nặng nhất là `LessonDbDesign.tsx`: nhãn bước 2/4 ghi "Kiểm tra nhanh —
     Đừng sai nhé!" — vừa dỗ dành vừa đặt cược lên một câu trắc nghiệm mà trả
     lời sai KHÔNG mất gì (không trừ XP, làm lại được). Lời nhắc đó dựng ra một
     cái giá không có thật.

     Mẫu: "nhé" KHÔNG đi liền một chữ cái nào nữa — để "nhét" (nhét mã vào địa
     chỉ, ở `ide-handoff`/`IdeClient`) không bị tính. Tự kiểm cả hai phía: */
  // Cờ `i`: "Nhé" đầu câu từng lọt — mẫu cũ chỉ bắt chữ thường.
  const HAT = /nhé(?!\p{L})/iu;
  assert.ok(HAT.test('Chưa đúng — thử lại nhé'), 'mẫu không bắt nổi chuỗi cũ');
  assert.ok(HAT.test('Đừng sai nhé!'), 'mẫu không bắt nổi nhãn cũ của LessonDbDesign');
  assert.ok(!HAT.test('nhét mã vào địa chỉ'), 'mẫu bắt lầm "nhét"');
  assert.ok(HAT.test('Nhé, thử lại'), 'mẫu bỏ sót chữ hoa đầu câu');

  assertAbsent(
    HAT,
    'Giọng đã chốt: dẫn đường bình thản, không dỗ dành. Bỏ hẳn hạt "nhé" — câu '
    + 'còn lại ("Thử lại.") nói đúng việc cần làm mà không an ủi hộ ai.',
  );
  assertAbsent(
    /Đừng sai|đừng sai/,
    'Trả lời sai một câu trắc nghiệm trong bài KHÔNG mất gì: không trừ XP, làm '
    + 'lại được. Nhắc "Đừng sai" là dựng ra một cái giá không có thật — đúng loại '
    + 'áp lực mà triết lý tự học đã gạt ra.',
  );
});

test('không rào đón, không nhãn kể cơ chế — đợt gỡ văn kể lể 15/10/2026', () => {
  /*
   * Chủ sản phẩm, nguyên văn: "những phần như này thì bỏ đi, trông tởm lợm
   * kinh khủng AI slop, bỏ luôn đi, làm 1 cái button là được, đừng cho
   * narrative gì cả, các phần khác cũng thế" — rồi siết thêm: "Bỏ hết, giữ
   * title thôi, thêm phần narrative/description đấy làm gì".
   *
   * Ba chuỗi dưới đây là phần của đợt gỡ đó nằm NGOÀI màn Thử thách ôn (màn
   * đó có hàng rào riêng trong `challenge-run.test.mjs`), nên không ca nào
   * khác che chúng:
   *
   *  · `lesson-chrome/exercises/FillBlank.tsx` — "Chạy thử trước khi nộp —
   *    không trừ điểm." Chạy thử KHÔNG tính điểm ở bất cứ đâu, nên nửa sau
   *    trả lời một nỗi lo không có; cùng họ với "Đừng sai nhé!" ở ca trên,
   *    chỉ ngược dấu (ca trên dựng ra một cái giá, câu này đi phủ nhận nó).
   *  · `python-studio/screens/RecapScreen.tsx` — "Bạn có thể quay lại luyện
   *    tập bất cứ lúc nào." Không có gì chặn người học quay lại, nên đây là
   *    lời trấn an cho một quyền không ai lấy đi.
   *  · `LessonDbDesign.tsx` — nhãn "AI Hint:". Nó kể rằng gợi ý do AI sinh ra:
   *    một chi tiết về CƠ CHẾ BÊN TRONG, lại bằng tiếng Anh, và nó không đổi
   *    được gì ở việc đọc gợi ý.
   */
  /*
   * Vế "lúc nào cũng được" có trong mẫu vì nó từng là chỗ thứ TƯ, ở `/practice`
   * ("lúc nào cũng được; để lâu cũng không có gì bị trừ") — đã gỡ ở d2d4b65.
   * Ba chuỗi tự kiểm dưới đây không gồm nó, nên thêm luôn một dòng tự kiểm cho
   * chính nó: một vế mẫu không ai thử là một vế có thể gõ sai mà vẫn báo đạt.
   */
  const RAO = /không trừ điểm|bất cứ lúc nào|lúc nào cũng được/;
  assert.ok(RAO.test('lúc nào cũng được; để lâu cũng không có gì bị trừ'));
  const CO_CHE = /\bAI Hint\b|\bAI hint\b|do AI (?:sinh|gợi|chọn)/;
  // TỰ KIỂM trên chính ba chuỗi CŨ. Một hàng rào không bắt nổi bản cũ là hàng
  // rào chết mà vẫn báo đạt.
  for (const [re, cu] of [
    [RAO, 'Chạy thử trước khi nộp — không trừ điểm.'],
    [RAO, 'Tiến độ và XP đã được lưu. Bạn có thể quay lại luyện tập bất cứ lúc nào.'],
    [CO_CHE, '<strong>AI Hint:</strong>'],
  ]) {
    assert.ok(re.test(cu.normalize('NFC')), `mẫu không bắt nổi chuỗi cũ: ${cu}`);
  }
  assertAbsent(
    RAO,
    'Lời rào đón: câu nói về thứ KHÔNG xảy ra, cho một nỗi lo người học chưa có. '
    + 'Bỏ hẳn — phần còn lại ("Chạy thử trước khi nộp.") đã nói đúng việc.',
  );
  assertAbsent(
    CO_CHE,
    'Nhãn không được kể về cơ chế bên trong. Người đọc một gợi ý không cần biết '
    + 'ai sinh ra nó; biết thêm cũng không đổi được gì họ làm.',
  );
});

/* ── 4 · một việc, một từ ─────────────────────────────────────────────── */

test('trình soạn và chạy Python gọi là "Bàn thí nghiệm", không phải IDE', () => {
  const found = hits(/\bIDE\b/);
  assert.deepEqual(
    found, [],
    'Bảng thuật ngữ: "Bàn thí nghiệm" — không dùng "IDE / Python IDE / Sandbox IDE".\n'
    + found.join('\n'),
  );
  const tryIt = codeOnly(read('src', 'components', 'lesson-chrome', 'TryItButton.tsx'));
  assert.ok(
    tryIt.includes('Bàn thí nghiệm'),
    'nhãn nút phải là "Chạy thử ở Bàn thí nghiệm"',
  );
});

test('nhãn nút nói VIỆC nút làm, không reo lên thay cho lời giải thích', () => {
  /* Lỗi thật đã sửa: nút duy nhất của hộp "THÀNH TÍCH MỚI"
     (`python-studio/LessonOverlays.tsx`) ghi "Tuyệt vời!". Hộp đó là `role=
     "dialog" aria-modal`, tức nó CHẶN cả màn bài học — và nhãn không nói bấm
     vào thì mất danh sách huy hiệu hay đi sang bài sau. Đã đọc: `onDismissAwards`
     ở `StudioLesson.tsx:288` chỉ `setAwards([])`, nên việc nó làm là ĐÓNG.
     Trình đọc màn hình đọc đúng nhãn này làm tên của nút, nên "Tuyệt vời!" là
     một cái nút không có tên.

     Tự kiểm phép so trên chuỗi cũ, để ca này không xanh trong khi lời reo còn
     nguyên: */
  const REO = /Tuyệt vời|Xuất sắc|Giỏi lắm|Hoan hô|Quá đỉnh|Cố lên/i;
  assert.ok(REO.test('Tuyệt vời!'), 'phép so không bắt nổi nhãn cũ');

  assertAbsent(
    REO,
    'Giọng đã chốt: hệ thống là người dẫn đường bình thản, không reo hộ người '
    + 'học. Nhãn nút phải nói việc nó làm ("Đóng", "Bài sau"…) — đó cũng là tên '
    + 'mà trình đọc màn hình đọc ra.',
  );

  // Và nút đóng hộp thành tích phải thật sự mang một nhãn nói việc.
  const OVER = codeOnly(read('src', 'components', 'python-studio', 'LessonOverlays.tsx'));
  const m = /onClick=\{onDismissAwards\}>\s*([^<\n]+?)\s*</.exec(OVER);
  assert.ok(m, 'không đọc được nhãn nút đóng hộp thành tích');
  assert.match(m[1], /^(Đóng|Bài sau|Quay lại bài)$/);
});

test('"Bàn thí nghiệm" là CÔNG CỤ /ide, không phải một màn trong bài', () => {
  /* Lỗi thật đã sửa: màn Tổng kết (`screens/RecapScreen.tsx`) viết "Nộp ở màn
     Bàn thí nghiệm để ghi nhận là đã xong" ở CẢ HAI bản (khoá có mini-game và
     khoá thường). Người học làm theo thì sang `/ide` — nơi không có nút nộp,
     không có ca chấm của bài, không ghi tiến độ, và mã còn chạy trên MÁY CHỦ
     chứ không phải trong trình duyệt như bài học. Tức câu dẫn đẩy người ta ra
     khỏi đúng chỗ cần tới. Màn nộp bài tên "Thử thách độc lập". */
  assertAbsent(
    /màn Bàn thí nghiệm|màn "Bàn thí nghiệm"/,
    'Bàn thí nghiệm là tên của /ide (một công cụ riêng, chạy trên máy chủ), '
    + 'không phải một màn trong bài. Màn nộp bài là "Thử thách độc lập".',
  );

  // Nhãn là NGUỒN THẬT: đọc lại từ chrome.tsx thay vì chép tay, để đổi tên màn
  // ở đó mà quên câu ở Tổng kết thì ca này đỏ chứ không trôi đi.
  const CHROME = codeOnly(read('src', 'components', 'python-studio', 'screens', 'chrome.tsx'));
  const m = /sandbox:\s*\{[^}]*label:\s*'([^']+)'/.exec(CHROME);
  assert.ok(m, 'không đọc được nhãn của màn sandbox trong chrome.tsx');
  const label = m[1];
  assert.equal(label, 'Thử thách độc lập');

  const RECAP = codeOnly(read('src', 'components', 'python-studio', 'screens', 'RecapScreen.tsx'));
  const dan = RECAP.split('\n').filter((l) => /nộp ở màn/i.test(l));
  assert.equal(dan.length, 2, 'Tổng kết có hai bản (mini-game / thường), cả hai phải có câu dẫn');
  for (const l of dan) {
    assert.ok(l.includes(label), `câu dẫn không gọi đúng tên màn "${label}": ${l.trim()}`);
  }
});

test('chính tả thống nhất "khoá", không lẫn "khóa"', () => {
  assertAbsent(
    /khóa|Khóa/,
    'Bảng thuật ngữ chốt viết "khoá" (cùng kiểu hoá/hoạ). "Về khóa học" lẫn với '
    + '"khoá" ở chỗ khác là hai cách viết trong một màn.',
  );
});

test('nhãn trạng thái dùng "đã xong", không dùng "hoàn thành"', () => {
  /* Chỉ soi chuỗi hiển thị, vì tên biến/prop `completed` vẫn đúng.

     MỘT chuỗi được miễn, và miễn ở mức CHUỖI chứ không mức file (bảng EXEMPT
     đầu file miễn cả file cho mọi luật — quá rộng cho việc này):
     `practice-plan.ts` so chuỗi của BACKEND để nhận ra lỗi 400 nào là lỗi
     "kho câu chưa đủ". Nó không hiện ra cho ai; nó là một khoá để so. Sửa nó
     theo bảng thuật ngữ là làm hỏng phép so, vì chữ nằm ở
     `src/quizzes/quizzes.service.ts` phía backend.

     Dòng miễn vẫn phải CÒN KHỚP: nếu backend đổi câu kia thì chuỗi này thành
     rác và ca dưới cùng (`exemptUsed`-kiểu) sẽ đỏ. */
  const MIEN_CHUOI = [
    ['src/lib/practice-plan.ts', 'hoàn thành ít nhất một bài'],
  ];
  const mienDung = new Set();
  const offenders = [];
  for (const [path, code] of SOURCES) {
    if (EXEMPT_PATHS.includes(path)) continue;
    for (const m of code.matchAll(/(['"`])((?:[^\\\n]|\\.)*?)\1/g)) {
      const s = m[2].normalize('NFC');
      if (!/hoàn thành/i.test(s)) continue;
      const mien = MIEN_CHUOI.find(([p, lit]) => p === path && s.includes(lit));
      if (mien) { mienDung.add(mien.join('|')); continue; }
      offenders.push(`${path}: ${s.slice(0, 110)}`);
    }
  }
  for (const mien of MIEN_CHUOI) {
    assert.ok(
      mienDung.has(mien.join('|')),
      `dòng miễn chuỗi ${mien[0]} → "${mien[1]}" không còn khớp gì — gỡ nó đi `
      + '(hoặc backend vừa đổi thông điệp và phép so ở đó đã chết)',
    );
  }
  assert.deepEqual(
    offenders, [],
    'Bảng thuật ngữ: "đã xong"; "hoàn thành" chỉ dùng cho tên trường dữ liệu.\n'
    + offenders.join('\n'),
  );
});

test('Bàn thí nghiệm không nói "sandbox" với người học', () => {
  /* Lỗi thật đã sửa, hai chỗ trên trang `/ide`:
       · `app/ide/IdeClient.tsx` — dòng chờ "Đang chạy trong sandbox…";
       · `app/ide/page.tsx` — `metadata.description` "chạy trong sandbox cách ly
         trên máy chủ", tức câu Google in dưới liên kết.
     "sandbox" là từ của người viết code. Nó còn trượt luôn câu người học đang
     thắc mắc lúc chờ — mã chạy Ở ĐÂU — mà đó mới là chỗ `/ide` khác bài học:
     trang này gửi mã lên MÁY CHỦ (`POST /api/python/run`), bài học chạy Pyodide
     trong trình duyệt. "môi trường cách ly" + "trên máy chủ" nói cùng một việc
     bằng tiếng Việt, và trùng câu của thẻ công cụ trang chủ
     (`lib/home-copy.ts`, LAB_TILE.description).

     VÌ SAO CA NÀY CHỈ SOI HAI FILE, chưa phải cả bề mặt: `sandbox` còn là TÊN
     TRONG MÃ ở rất nhiều chỗ đúng (`kind: 'sandbox'`, `SandboxEditor`,
     `SandboxTest`), nên luật phải tách "chữ người đọc" khỏi "tên của lập
     trình viên"; và chữ đó HIỆN CÒN hiện ra ở hai chỗ trong cụm Xem-từng-bước
     (`components/code-visualizer/CodeVisualizer.tsx` và `lib/trace.ts`) đang
     được sửa trong một đợt riêng. Nới thành `assertAbsent` trên cả bề mặt khi
     hai chỗ đó xong — lúc này nới là làm đỏ việc của người khác. */
  const SOI = [
    ['src', 'app', 'ide', 'page.tsx'],
    ['src', 'app', 'ide', 'IdeClient.tsx'],
  ];
  // Tự kiểm phép so trên đúng hai chuỗi cũ trước khi đem soi chuỗi mới.
  const CU = [
    'Đang chạy trong sandbox…',
    'Viết và chạy thử mã Python ngay trên trang, chạy trong sandbox cách ly trên máy chủ.',
  ];
  for (const s of CU) assert.ok(s.includes('sandbox'), `phép so không bắt nổi: ${s}`);

  const offenders = [];
  for (const p of SOI) {
    const code = codeOnly(read(...p));
    code.split('\n').forEach((line, i) => {
      // Chỉ những dòng có CHỮ TIẾNG VIỆT mới là chữ người đọc; `kind:
      // 'sandbox'` và `SandboxEditor` không có dấu nào nên không bị tính.
      const viet = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩậắằẳẵặẹẻẽếềểệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
      if (viet.test(line) && /sandbox/i.test(line)) {
        offenders.push(`${p.join('/')}:${i + 1}  ${line.trim().slice(0, 110)}`);
      }
    });
  }
  assert.deepEqual(
    offenders, [],
    'Bảng thuật ngữ là tiếng Việt (khoá · chặng · bài · màn). Nói "môi trường '
    + 'cách ly" và nói thẳng mã chạy trên máy chủ.\n' + offenders.join('\n'),
  );

  // Và dòng chờ phải nói NƠI CHẠY, không chỉ "đang chạy".
  const IDE = codeOnly(read('src', 'app', 'ide', 'IdeClient.tsx'));
  assert.match(IDE, /Đang chạy trên máy chủ/);
  assert.match(codeOnly(read('src', 'app', 'ide', 'page.tsx')), /môi trường cách ly/);
});

test('không gọi máy của người học là "máy lab" hay "máy thật"', () => {
  assertAbsent(
    /máy lab|máy thật/,
    'Bảng thuật ngữ: "Python trên máy tính của bạn". "máy lab" gợi phòng máy '
    + 'của lớp học — nền tảng này không có lớp học; "máy thật" ngầm nói trình '
    + 'duyệt là giả mà không giải thích gì.',
  );
});

test('một nhóm bài gọi là "chặng", không gọi là "module"', () => {
  // Lỗi thật đã sửa 15/10/2026: trang khoá in "{modules.length} module · {total}
  // bài học" trong khi trang chủ in "8 chặng · 48 bài" và màn Thử thách ôn nói
  // "chặng" 9 lần — ba trang liền nhau trên một luồng, hai cách gọi.
  // Mẫu bắt đúng chỗ NGƯỜI DÙNG ĐỌC: một con số (hoặc một biểu thức JSX vừa
  // đóng ngoặc) rồi tới chữ "module". Tên lớp CSS `edu-cd-module` và biến
  // `modules.map` không khớp, và chúng vẫn đúng.
  /* 15/10/2026 (lượt hai) — mẫu nới thêm "bài học", vì mẫu cũ chỉ cấm "module"
     mà bỏ đúng nửa còn lại của cùng một lỗi. Đo được trên trang khoá: cột TRÁI
     in "{modules.length} chặng · {total} bài" (có sáu dòng chú thích bảo vệ),
     rồi 150 dòng sau cột PHẢI in "{course.lessons} bài học" — hai cách gọi nằm
     cạnh nhau trong MỘT khung nhìn, nên đây không phải lệch giữa hai trang mà
     lệch trong một cái nhìn.

     Mẫu đòi một con số (hoặc một biểu thức JSX vừa đóng ngoặc) ngay trước, nên
     câu văn kể chuyện ("trang bài học", "các bài học trong khoá") không bị
     tính — chữ "bài học" ở đó là danh từ chung, không phải ĐƠN VỊ ĐẾM. */
  const DEM = /(?:\d|\}) (?:module|bài học)\b/;
  assert.ok(DEM.test('{modules.length} module · {total} bài học'), 'mẫu không bắt nổi dòng cũ');
  assert.ok(DEM.test('{course.lessons} bài học'), 'mẫu không bắt nổi đơn vị "bài học"');
  assert.ok(!DEM.test('Các bài học trong khoá vẫn chạy Python'), 'mẫu bắt lầm danh từ chung');

  assertAbsent(
    DEM,
    'Bảng thuật ngữ (lib/home-copy.ts): khoá → chặng → bài → màn. "module" là từ '
    + 'của người viết code; "bài học" làm đơn vị đếm thì cùng một trang có hai '
    + 'cách gọi cho cùng một thứ.',
  );
});

test('không dùng ký tự ▶ thay cho icon trong nhãn nút', () => {
  assertAbsent(
    /▶/,
    'Bản thiết kế chốt dùng icon SVG; ký tự mũi tên trong nhãn nút bị trình đọc '
    + 'màn hình đọc thành tên ký tự. Còn cần ký tự thì bọc trong '
    + '<span aria-hidden="true"> — lúc đó nó không vào tên của nút nữa.',
    // Siết theo CẤU TRÚC: cái sai là ký tự nằm TRONG TÊN của nút/liên kết, nên
    // dòng đã nói thẳng "đây là trang trí" thì không còn là lỗi.
    (line) => /aria-hidden/.test(line),
  );
});

test('không dùng ký tự ↗ thay cho icon trong tên liên kết', () => {
  /* Cùng luật với ca ▶ ở trên, nhưng ca đó CHỈ bắt ▶ nên ↗ đi qua được — đo
     ngày 15/10/2026: `TheoryScreen.tsx` có liên kết tên là "Xem khổ lớn ↗",
     trình đọc màn hình đọc thành "Xem khổ lớn north east arrow". Bản thiết kế
     §1.2 ("Mũi tên ký tự → ← ↗ ▶︎ trong nút → Icon SVG") kể ↗ ngang với ▶, nên
     thiếu ca này là thiếu nửa luật. `TryItButton.tsx:43` giữ ký tự nhưng đã
     bọc aria-hidden, nên nó hợp lệ và chính nó chứng minh `allow` còn sống. */
  assertAbsent(
    /↗/,
    'Bản thiết kế §1.2 chốt mũi tên là icon SVG. Ký tự ↗ trong tên nút/liên kết '
    + 'bị trình đọc màn hình đọc thành tên ký tự; còn cần ký tự thì bọc trong '
    + '<span aria-hidden="true">.',
    (line) => /aria-hidden/.test(line),
  );
});

/* ── 5 · dòng MIỄN không được mục đi ──────────────────────────────────── */

test('mỗi dòng MIỄN phải còn che một chỗ vi phạm THẬT, và nêu lý do', () => {
  /* Vì sao có ca này: đã xảy ra đúng một lần ở ds-tokens.test.mjs — file
     `studio.module.css` bị xoá nhưng dòng miễn trỏ vào nó thì ở lại, thành một
     khoá không bao giờ khớp kèm một câu chú thích khẳng định sai về hiện
     trạng. Dòng miễn chết thì không ai kiểm lại, và nó làm bảng miễn trông
     đắt hơn thực tế. Ca này PHẢI đứng cuối file: `exemptUsed` được điền bởi
     chính các ca ở trên. */
  for (const [path, reason] of EXEMPT) {
    assert.ok(
      typeof reason === 'string' && reason.length >= 60,
      `dòng miễn ${path} không nêu lý do đủ rõ — miễn phải đắt`,
    );
    assert.ok(
      exemptUsed.has(path),
      `${path} không còn chỗ nào vi phạm (hoặc đã bị xoá) — gỡ dòng miễn này đi, `
      + 'đừng để nó mục lại trong bảng',
    );
  }
});

/**
 * ── BẰNG CHỨNG BẮT ĐƯỢC LỖI THẬT ──────────────────────────────────────
 * Đã CHẠY THẬT ba lượt gỡ-rồi-trả (15/10/2026), con số là đo được:
 *   · trả '⚔️ Đã hạ Boss của chặng!' + 'Đã hoàn thành bài học!' + ô
 *     "🔥 Combo cao nhất" vào RecapScreen → **4 ca trượt**: "Boss / ⚔️",
 *     "Combo cao nhất", "pill chuỗi ngày 🔥", "đã xong / hoàn thành".
 *   · trả '⚡ Mở khoá (-10 XP)' vào HintSheet → **1 ca**: "mở gợi ý KHÔNG
 *     trừ XP".
 *   · trả 'Nộp & Chấm điểm' + 'Còn phải làm: …' vào cta.ts → **2 ca**:
 *     "Nộp để kiểm" và "không thúc ép".
 *   · trả 'Thử ngay trong IDE' vào TryItButton → **1 ca**: "Bàn thí nghiệm".
 *
 * Phần còn lại ánh xạ theo cấu tạo — mỗi ca nêu thẳng mẫu nó tìm, nên chuỗi
 * cũ nào quay lại cũng rơi vào đúng ca tương ứng dưới đây:
 *   · '⚔️ Đã hạ Boss của chặng!' (RecapScreen), '⚔️ Trận Boss của chặng.'
 *     (SandboxScreen), "⚔️ BOSS · " (StudioLesson)  → ca "Boss / ⚔️" (3 dòng)
 *   · "🔥 Combo cao nhất" (RecapScreen)             → ca "Combo cao nhất" + ca 🔥
 *   · 'Bẫy! Dòng này sai vì: … Chuỗi combo bị ngắt.' (ParsonsGame)
 *                                                    → ca "chuỗi combo bị ngắt"
 *   · 'Chặng tiếp theo đã mở khoá. ' (RecapScreen)  → ca "mở khoá"
 *   · '⚡ Mở khoá (-N XP)' (HintSheet)              → ca "mở gợi ý KHÔNG trừ XP"
 *   · 'Nộp & Chấm điểm' (cta.ts, PythonStudio)      → ca "Nộp để kiểm" (2 dòng)
 *   · 'Còn phải làm: …' (cta.ts), 'Hãy hoàn thành các màn…' (useCodeRunner)
 *                                                    → ca "không thúc ép"
 *   · 'Thử ngay trong IDE' (TryItButton), 'S4: Sandbox IDE' (studio-ui),
 *     'sandbox của IDE' (ExplainScreen)              → ca "Bàn thí nghiệm"
 *   · 'Về khóa học' ×3, 'Đăng ký khóa học…'          → ca "khoá"
 *   · 'Đã hoàn thành bài học!', 'Đánh dấu đã hoàn thành ✓', 'Đã lưu hoàn
 *     thành bài học.', …                             → ca "đã xong" (8 dòng)
 *   · 'thực hành trên máy lab' ×2, 'chấm trên máy lab' → ca "máy lab"
 *   · '▶ Chạy & kiểm tra' (cta.ts) + 7 nhãn nút khác → ca "▶"
 * Lần sửa này đổi 54 chuỗi; danh sách trên là chỗ mỗi nhóm bị bắt lại.
 *
 * ── ĐỢT 15/10/2026: MỞ BỀ MẶT RA CẢ src/app + src/components ───────────
 * Bề mặt từ 5 thư mục (29 file) lên 98 file. Chỗ sai lộ ra và đã sửa:
 *   · trang khoá in "{modules.length} module · {total} bài học"   → ca "chặng"
 *     (mới) — đây là lỗi đi tìm: trang chủ và màn Thử thách ôn đều nói "chặng"
 *   · meta description của /lesson/python_advanced: "trận Boss cuối chặng"
 *     → ca "Boss" (chuỗi này vào cả kết quả tìm kiếm)
 *   · CodeVisualizer: 'Lúc này IDE chưa chạy được mã… trong khóa'
 *     → ca "Bàn thí nghiệm" + ca "khoá"
 *   · 4 ký tự ▶ nằm TRONG tên nút/liên kết (CourseDetail ×3, IdeClient ×1)
 *     → ca "▶"; đã bọc <span aria-hidden="true">, và luật nay xét theo cấu
 *     trúc đó thay vì cấm trần ký tự
 * Hai luật phải siết lại cho đúng ý nghĩa, không phải nới cho test xanh:
 *   · "bị khoá" → chỉ tính khi nói CHẶNG/BÀI/MÀN bị khoá. Màn Thử thách ôn
 *     khoá đúng phương án vừa thử; cái khoá đó CÓ THẬT (lockedOptionIndex).
 *   · "▶" → chỉ tính khi ký tự nằm trong tên của nút (chưa aria-hidden).
 * Còn MIỄN, nêu rõ trong bảng EXEMPT và có ca canh không cho mục: cụm
 * `db_design` cũ (CourseDbDesign.tsx 14 dòng + card/[cardId] 1 dòng) — nó
 * ngoài danh mục, dùng bảng thuật ngữ và CSS legacy riêng, chờ một đợt chuyển
 * cùng edu-course-detail.css.
 *
 * ĐÃ CHẠY THẬT (15/10/2026), mỗi lần gỡ rồi trả lại ngay:
 *   · trả "{modules.length} module · {total} bài học" vào CourseDetail
 *     → 1 ca trượt ("chặng")
 *   · thêm một dòng EXEMPT trỏ vào file KHÔNG vi phạm (SiteHeader.tsx)
 *     → 1 ca trượt ("dòng MIỄN phải còn che một chỗ vi phạm THẬT")
 */
