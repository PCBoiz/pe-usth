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

const DIRS = [
  ['src', 'components', 'lesson-chrome'],
  ['src', 'components', 'lesson-chrome', 'exercises'],
  ['src', 'components', 'python-studio'],
  ['src', 'components', 'python-studio', 'screens'],
  ['src', 'components', 'python-studio', 'screens', 'games'],
];

/** [đường dẫn tương đối để báo lỗi, mã đã bỏ chú thích] cho cả bề mặt. */
const SOURCES = DIRS.flatMap((dir) => readdirSync(join(FE, ...dir))
  .filter((n) => /\.tsx?$/.test(n))
  .map((n) => [[...dir, n].join('/'), codeOnly(read(...dir, n))]));

/** Tìm một mẫu trên toàn bề mặt; trả về danh sách "file: dòng". */
function hits(pattern) {
  const out = [];
  for (const [path, code] of SOURCES) {
    code.split('\n').forEach((line, i) => {
      if (pattern.test(line)) out.push(`${path}:${i + 1}  ${line.trim().slice(0, 110)}`);
    });
  }
  return out;
}

function assertAbsent(pattern, why) {
  const found = hits(pattern);
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
  //
  // MIỄN đúng một chỗ, nói rõ để không ai tưởng là sót: `useLessonProgress.ts`
  // còn gắn ' 🔥' vào ô "+10 điểm · Combo x3" bật lên TRONG lượt làm bài. Bảng
  // sửa chuỗi chỉ chỉ đích danh chỉ số "Combo cao nhất" ở màn tổng kết (đã bỏ),
  // còn việc bỏ emoji nói chung thì chủ sản phẩm CHƯA CHỐT ("bỏ pháo hoa emoji
  // — chưa chốt"). Chốt xong thì gỡ dòng filter này, không phải gỡ cả ca.
  const MIEN = 'useLessonProgress.ts';
  assert.ok(
    hits(/🔥/).some((l) => l.includes(MIEN)),
    `${MIEN} không còn 🔥 nữa — gỡ luôn dòng miễn ở ca này`,
  );
  const found = hits(/🔥/).filter((l) => !l.includes(MIEN));
  assert.deepEqual(
    found, [],
    `Chuỗi bị ĐỨT là thứ đẩy người học bỏ cuộc; bản thiết kế đã gỡ.\n${found.join('\n')}`,
  );
});

test('không nói "chặng tiếp theo đã mở khoá" — không có cơ chế khoá chặng nào', () => {
  assertAbsent(
    /đã mở khoá|đã mở khóa|bị khoá|bị khóa/,
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

test('không dùng ký tự ▶ thay cho icon trong nhãn nút', () => {
  assertAbsent(
    /▶/,
    'Bản thiết kế chốt dùng icon SVG; ký tự mũi tên trong nhãn nút bị trình đọc '
    + 'màn hình đọc thành tên ký tự.',
  );
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
 */
