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
const ROOTS = [
  ['src', 'app'],
  ['src', 'components'],
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
    code.split('\n').forEach((line, i) => {
      if (!pattern.test(line) || allow(line)) return;
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
  // Chỉ soi chuỗi hiển thị, vì tên biến/prop `completed` vẫn đúng.
  const offenders = [];
  for (const [path, code] of SOURCES) {
    if (EXEMPT_PATHS.includes(path)) continue;
    for (const m of code.matchAll(/(['"`])((?:[^\\\n]|\\.)*?)\1/g)) {
      if (/hoàn thành/i.test(m[2])) offenders.push(`${path}: ${m[2].slice(0, 110)}`);
    }
  }
  assert.deepEqual(
    offenders, [],
    'Bảng thuật ngữ: "đã xong"; "hoàn thành" chỉ dùng cho tên trường dữ liệu.\n'
    + offenders.join('\n'),
  );
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
  assertAbsent(
    /(?:\d|\}) module\b/,
    'Bảng thuật ngữ (lib/home-copy.ts): khoá → chặng → bài → màn. "module" là từ '
    + 'của người viết code, không phải từ của người học.',
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
