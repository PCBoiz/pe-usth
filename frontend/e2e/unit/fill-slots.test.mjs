/**
 * Màn điền code (game `fill`) — phần gộp từ bản Figma của thành viên,
 * design/v3/quyet-dinh.md mục 4.
 *
 * Ba thứ lấy của Figma, và một thứ GIỮ của mình:
 *  · Ô trống mang số ①②③ ngay trong code. Trước đây ô in "···" không số, trong
 *    khi lời phản hồi nói "Ô 2" — người học phải tự đếm.
 *  · Kho thẻ gom theo ô (`bank[].slot`), mỗi nhóm một nhãn `slots[].hint` —
 *    NHƯNG tới 19/10/2026 chưa bài nào khai `hint` (149 ô / 45 bài), nên nhóm
 *    không nhãn. Ca "không bịa nhãn" canh đúng chỗ này.
 *  · Phản hồi TỪNG ô, kể cả ô đúng. Bản cũ chỉ báo ô sai ĐẦU TIÊN.
 *  · GIỮ: ô sai không bao giờ nói đáp án đúng (Figma nói thẳng "ready" ngay lần
 *    sai đầu). Ca này quét MỌI thẻ sai của MỌI bài thật, không một bài mẫu.
 *
 * Fixture là JSON thật của khoá đang chạy (scripts/pe-v4/out-advanced), theo
 * bẫy "fixture không giống dữ liệu thật" trong AGENTS.md.
 *
 * ===========================================================================
 * GỠ BẢN SỬA RA THÌ TRƯỢT (đã chạy thử từng lần, 19/10/2026)
 * ===========================================================================
 *  - gameVerdict 'fill' trả lại bản cũ (chỉ ô sai đầu tiên, không `lines`):
 *    trượt 2 ca — "gameVerdict nối fillFeedback" ở đây và ca
 *    "gameVerdict/fill" của studio-lesson.test.mjs.
 *  - Assemble.tsx về bản HEAD (in "···" không số, "Hết token."): trượt 2 ca —
 *    "số trong ô: Assemble…" và "chữ mới trên màn điền code".
 *  - ScaffoldScreen.tsx về bản HEAD (kho trộn, "Đặt lại các slot"): trượt 3 ca
 *    — "số trong ô: ScaffoldScreen…", "kho gom theo ô", "chữ mới…".
 *  - fillFeedback thêm `Cần: ${slot.answer}` vào dòng ô bẫy: trượt 1 ca
 *    "KHÔNG lộ đáp án".
 *  - bankGroups bỏ qua `hint`: trượt 1 ca "không bịa nhãn nhóm".
 *
 * Chạy: cd frontend && npm run test:unit
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  bankGroups,
  fillFeedback,
  gameVerdict,
  initialLessonDraft,
  slotMark,
} from '../../src/lib/studio-lesson.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const LESSONS = join(ROOT, '..', 'scripts', 'pe-v4', 'out-advanced', 'lessons');

const ALL = readdirSync(LESSONS)
  .filter((f) => f.endsWith('.json'))
  .map((f) => [f, JSON.parse(readFileSync(join(LESSONS, f), 'utf8')).content_json]);
const WITH_FILL = ALL.filter(([, c]) => c.step_3?.scaffold?.slots?.length);

// P02: ba ô, mỗi ô một thẻ đúng + một thẻ bẫy có lý do — đúng màn Figma vẽ lại.
const P02 = ALL.find(([f]) => f === '002-P02.json')[1];
const P02_SC = P02.step_3.scaffold;
const P02_GAME = P02.play.games.find((g) => g.type === 'fill');

const src = (...p) => readFileSync(join(ROOT, ...p), 'utf8');
/** Bỏ chú thích để regex không khớp nhầm vào lời giải thích. */
const codeOnly = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const allRight = (sc) => Object.fromEntries(sc.slots.map((s) => [s.n, s.answer]));

test('tiền đề: dữ liệu thật có đủ 45 bài điền code, mỗi thẻ trỏ về một ô', () => {
  assert.equal(WITH_FILL.length, 45);
  for (const [f, c] of WITH_FILL) {
    const ns = new Set(c.step_3.scaffold.slots.map((s) => s.n));
    for (const b of c.step_3.scaffold.bank) assert.ok(ns.has(b.slot), `${f}: thẻ ${b.label} trỏ ô lạ`);
  }
});

test('slotMark: ô 1–4 là ①②③④, quá thang thì về "(n)"', () => {
  assert.deepEqual([1, 2, 3, 4].map(slotMark), ['①', '②', '③', '④']);
  assert.equal(slotMark(20), '⑳');
  assert.equal(slotMark(21), '(21)');
});

test('số trong ô: ScaffoldScreen gắn slotMark(n) cho từng ô của code', () => {
  const s = codeOnly(src('src', 'components', 'python-studio', 'screens', 'ScaffoldScreen.tsx'));
  assert.match(s, /slot:\s*\{\s*id:\s*`slot\$\{n\}`,\s*n,\s*mark:\s*slotMark\(n\)\s*\}/);
});

test('số trong ô: Assemble in số của ô ở MỌI trạng thái và đặt tên "Ô n" cho trình đọc màn hình', () => {
  const s = codeOnly(src('src', 'components', 'lesson-chrome', 'exercises', 'Assemble.tsx'));
  // Số đứng ngoài nhánh trống/đã điền: ô đã lắp vẫn còn số để khớp lời phản hồi.
  assert.match(s, /<span className=\{styles\.slotMark\}[^>]*>\{slot\.mark\}<\/span>/);
  // Ba trạng thái (đã điền / đang cầm / trống) đều mở đầu bằng "Ô ${slot.n}".
  const named = s.match(/`Ô \$\{slot\.n\}[^`]*`/g) ?? [];
  assert.equal(named.length, 3, `aria-label của ô: ${named.join(' | ')}`);
});

test('kho gom theo ô: P02 ra ba nhóm theo thứ tự ô, mỗi nhóm đúng thẻ của ô đó', () => {
  const groups = bankGroups(P02_SC.slots, P02_SC.bank, []);
  assert.deepEqual(groups.map((g) => g.mark), ['①', '②', '③']);
  for (const g of groups) {
    const want = P02_SC.bank.filter((b) => b.slot === g.n).map((b) => b.label);
    assert.deepEqual(g.labels, want);
  }
  // Và màn thật dùng bankGroups, không dùng lại một kho trộn.
  const screen = codeOnly(src('src', 'components', 'python-studio', 'screens', 'ScaffoldScreen.tsx'));
  assert.match(screen, /groups=\{bankGroups\(scaffold\.slots, scaffold\.bank, placed\)/);
});

test('kho tự bớt thẻ đã dùng, và không bài nào mất thẻ khi gom', () => {
  const placed = P02_SC.slots[0].answer;
  const g1 = bankGroups(P02_SC.slots, P02_SC.bank, [placed])[0];
  assert.ok(!g1.labels.includes(placed), 'thẻ đã đặt vẫn nằm trong kho');
  assert.equal(g1.labels.length, P02_SC.bank.filter((b) => b.slot === 1).length - 1);

  for (const [f, c] of WITH_FILL) {
    const sc = c.step_3.scaffold;
    const flat = bankGroups(sc.slots, sc.bank, []).flatMap((g) => g.labels).sort();
    assert.deepEqual(flat, sc.bank.map((b) => b.label).sort(), `${f}: kho gom theo ô làm rơi thẻ`);
  }
});

test('không bịa nhãn nhóm: dữ liệu chưa có `hint` thì nhóm KHÔNG có nhãn; có thì chép đúng', () => {
  const hinted = WITH_FILL.flatMap(([, c]) => c.step_3.scaffold.slots).filter((s) => s.hint);
  // Ngày bài đầu tiên khai `hint`, ca này trượt để người sửa đọc lại câu chữ
  // của nhãn trên màn thật — và cập nhật chú thích "chưa bài nào khai".
  assert.equal(hinted.length, 0, 'đã có bài khai slots[].hint — xem lại nhãn nhóm trên màn');
  for (const g of bankGroups(P02_SC.slots, P02_SC.bank, [])) assert.equal('hint' in g, false);

  const slots = P02_SC.slots.map((s) => (s.n === 2 ? { ...s, hint: 'Báo lỗi khi không có chuyển' } : s));
  const groups = bankGroups(slots, P02_SC.bank, []);
  assert.equal(groups[1].hint, 'Báo lỗi khi không có chuyển');
  assert.equal('hint' in groups[0], false);
});

test('mỗi ô một dòng khi đúng: đủ ba dòng ①②③, không bịa lý do khi bài chưa khai `why`', () => {
  const fb = fillFeedback(P02_SC.slots, P02_SC.bank, allRight(P02_SC));
  assert.equal(fb.correct, true);
  assert.equal(fb.lines.length, 3);
  fb.lines.forEach((line, i) => {
    assert.ok(line.startsWith(slotMark(i + 1)), line);
    assert.ok(line.endsWith('— đúng.'), line);
  });
  // Có `why` thì câu đúng mang lý do.
  const slots = P02_SC.slots.map((s) => (s.n === 3 ? { ...s, why: 'wait() chặn tới khi con xong.' } : s));
  assert.ok(fillFeedback(slots, P02_SC.bank, allRight(P02_SC)).lines[2].endsWith('wait() chặn tới khi con xong.'));
});

test('mỗi ô một dòng khi sai: ô bẫy nói lý do bẫy, ô đúng vẫn được nói là đúng', () => {
  const trap = P02_SC.bank.find((b) => b.trap && b.slot === 1);
  const fb = fillFeedback(P02_SC.slots, P02_SC.bank, { ...allRight(P02_SC), 1: trap.label });
  assert.equal(fb.correct, false);
  assert.equal(fb.summary, '2/3 ô đúng.');
  assert.equal(fb.lines.length, 3);
  assert.ok(fb.lines[0].startsWith('①') && fb.lines[0].includes(trap.trap), fb.lines[0]);
  assert.ok(fb.lines[1].endsWith('— đúng.') && fb.lines[2].endsWith('— đúng.'));
});

test('mọi ô sai đều được báo — không dừng ở ô sai đầu tiên', () => {
  const picks = Object.fromEntries(
    P02_SC.slots.map((s) => [s.n, P02_SC.bank.find((b) => b.slot === s.n && b.trap).label]),
  );
  const fb = fillFeedback(P02_SC.slots, P02_SC.bank, picks);
  assert.equal(fb.summary, '0/3 ô đúng.');
  fb.lines.forEach((line, i) => {
    const trap = P02_SC.bank.find((b) => b.slot === i + 1 && b.trap).trap;
    assert.ok(line.includes(trap), `ô ${i + 1}: ${line}`);
  });
});

test('thẻ của ô khác đặt nhầm chỗ: nói thẻ đó thuộc ô nào', () => {
  const fb = fillFeedback(P02_SC.slots, P02_SC.bank, { ...allRight(P02_SC), 2: P02_SC.slots[2].answer });
  assert.match(fb.lines[1], /^② .* — thẻ của ô ③\.$/);
});

test('KHÔNG lộ đáp án: quét mọi thẻ sai ở mọi ô của cả 45 bài', () => {
  const leaks = [];
  for (const [f, c] of WITH_FILL) {
    const sc = c.step_3.scaffold;
    for (const slot of sc.slots) {
      for (const card of sc.bank) {
        if (card.label === slot.answer) continue;
        const fb = fillFeedback(sc.slots, sc.bank, { ...allRight(sc), [slot.n]: card.label });
        const line = fb.lines[sc.slots.indexOf(slot)];
        // Bỏ phần thẻ người học vừa đặt và lý do bẫy (chữ của NGƯỜI VIẾT BÀI,
        // canh ở ca dưới) rồi mới soi phần chữ do fillFeedback tự thêm.
        const told = line
          .replace(`${slotMark(slot.n)} ${card.label}`, '')
          .replace(card.trap ?? '\u0000', '');
        if (told.includes(slot.answer)) leaks.push(`${f} ô ${slot.n} ← ${card.label}: ${line}`);
      }
    }
  }
  assert.deepEqual(leaks, []);
});

test('lý do bẫy tự nói đáp án: đã hết — mốc chỉ được hạ', () => {
  // Không phải lỗi của màn: chữ do người viết bài khai trong `traps` của
  // lessons_*.py. Mốc này từng là 3 chỗ (G02 ô3, T03 ô2, X01 ô1); nội dung đã
  // sửa nên hạ về 0.
  //
  // LUẬT SO KHỚP Ở ĐÂY YẾU HƠN THỰC TẾ, đừng tin nó là đủ: `includes(answer)`
  // so nguyên văn kể cả dấu nháy, nên nó KHÔNG thấy đáp án `"ready"` nằm trong
  // câu "…phải về ready…" — ba chỗ nữa cùng loại đã lọt qua ca này suốt. Bản
  // bỏ dấu nháy trước khi so nằm ở e2e/unit/trap-leak.test.mjs; giữ cả hai vì
  // ca này còn canh thêm đường đi qua `fillFeedback`.
  const found = [];
  for (const [f, c] of WITH_FILL) {
    const sc = c.step_3.scaffold;
    for (const card of sc.bank) {
      const answer = sc.slots.find((s) => s.n === card.slot)?.answer;
      if (card.trap && answer && card.trap.includes(answer)) found.push(`${f.slice(4, -5)} ô ${card.slot}`);
    }
  }
  assert.deepEqual(found.sort(), []);
});

test('gameVerdict nối fillFeedback: game fill thật trả `lines` từng ô', () => {
  const trap = P02_SC.bank.find((b) => b.trap);
  const d = { ...initialLessonDraft(P02), slots: { ...allRight(P02_SC), [trap.slot]: trap.label } };
  const v = gameVerdict(P02, P02_GAME, d);
  assert.equal(v.correct, false);
  assert.equal(v.lines.length, P02_SC.slots.length);
  assert.equal(v.explain, '2/3 ô đúng.');
});

test('chữ mới trên màn điền code: không "slot"/"token" tiếng Anh, không reo, không "nhé"', () => {
  const assemble = codeOnly(src('src', 'components', 'lesson-chrome', 'exercises', 'Assemble.tsx'));
  const screen = codeOnly(src('src', 'components', 'python-studio', 'screens', 'ScaffoldScreen.tsx'));
  assert.doesNotMatch(assemble, /Hết token/);
  assert.doesNotMatch(screen, /Đặt lại các slot/);
  const fb = [
    ...fillFeedback(P02_SC.slots, P02_SC.bank, allRight(P02_SC)).lines,
    fillFeedback(P02_SC.slots, P02_SC.bank, allRight(P02_SC)).summary,
    fillFeedback(P02_SC.slots, P02_SC.bank, {}).summary,
    ...fillFeedback(P02_SC.slots, P02_SC.bank, {}).lines,
  ].join('\n');
  // Không dùng `\b` quanh "nhé": ranh giới từ của regex JS chỉ hiểu ASCII, "é"
  // không phải chữ với nó nên `nhé\b` không bao giờ khớp.
  assert.doesNotMatch(fb, /nhé|Chúc mừng|Tuyệt vời|Xuất sắc|Giỏi lắm/i);
});
