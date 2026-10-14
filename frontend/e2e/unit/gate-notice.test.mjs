/**
 * Lời nhắc ở màn "Thử thách độc lập" của ba bài cửa tự kiểm tra.
 *
 * ===========================================================================
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 * ===========================================================================
 *  - "không hứa mở lời giải sau LẦN NỘP" là ca chính: nó trượt với câu chữ cũ
 *    ("Lời giải mẫu chỉ mở sau lần nộp đầu"), vì luật thật ở server là
 *    `gated && !completed` — nộp mà chưa đạt thì lời giải vẫn đóng.
 *  - "nói đúng mốc mở lời giải" đòi câu chữ phải nhắc tới HOÀN THÀNH; đổi lại
 *    thành bất kỳ mốc nào khác là trượt.
 *  - "trần điểm khớp quizPercent" đọc lại chính `studio-lesson.ts` bằng regex
 *    thay vì chép tay con số. Ba lần trong repo này một bảng tham chiếu chép
 *    tay đã làm test tưởng mình canh nguồn thật mà không canh gì; nếu ai đổi
 *    `boss ? 60 : 80` thì ca này trượt chứ không im lặng trôi qua.
 *  - "boss và gate đi liền nhau trong giáo trình" canh TIỀN ĐỀ của nhánh thứ
 *    hai: hiện cả ba bài cửa đều là bài tổng hợp nên nhánh `gate` một mình
 *    chưa bao giờ hiện ra. Tách hai cờ ⇒ ca trượt, để người sửa biết nhánh đó
 *    vừa sống lại và phải đọc lại câu chữ của nó trước khi nó đập vào mắt ai.
 *  - "không còn ẩn dụ đánh trận" trượt nếu chữ "trận" quay lại — `9bc42c1` đã
 *    gỡ nó khỏi phần giữ lại, bảng thuật ngữ chỉ có khoá · chặng · bài · màn.
 *  - "màn sandbox không còn câu nào viết cứng" trượt nếu ai viết thẳng lời
 *    nhắc vào JSX lần nữa — đó chính là cách câu sai sống được lâu thế: nó
 *    không nằm ở file nào có test.
 *  - "bài thường không có lời nhắc" trượt nếu điều kiện nới ra cho 45 bài còn
 *    lại.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { ASSIST_CAP_PCT, gateNotice } from '../../src/lib/gate-notice.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const REPO = join(ROOT, '..');

const SANDBOX_SRC = readFileSync(
  join(ROOT, 'src/components/python-studio/screens/SandboxScreen.tsx'),
  'utf8',
);
const STUDIO_SRC = readFileSync(join(ROOT, 'src/lib/studio-lesson.ts'), 'utf8');
const SERVICE_SRC = readFileSync(join(REPO, 'src/lessons/lessons.service.ts'), 'utf8');

/** Toàn bộ chữ của một lời nhắc, để soi bằng regex. */
const textOf = (n) => `${n.strong} ${n.rest}`;

const BOSS = gateNotice({ boss: true, gate: true, submitted: false });
const GATE_ONLY = gateNotice({ boss: false, gate: true, submitted: false });

test('bài thường không có lời nhắc nào', () => {
  assert.equal(gateNotice({ boss: false, gate: false, submitted: false }), null);
  assert.equal(gateNotice({ boss: false, gate: false, submitted: true }), null);
  // Cửa đã nộp rồi thì lời nhắc rút đi, nhường chỗ cho kết quả chấm.
  assert.equal(gateNotice({ boss: false, gate: true, submitted: true }), null);
});

test('không hứa mở lời giải sau LẦN NỘP — đó là câu sai của bản cũ', () => {
  for (const n of [BOSS, GATE_ONLY]) {
    const t = textOf(n);
    assert.ok(
      !/mở\s+sau\s+lần\s+nộp/i.test(t.replace(/\s+/g, ' ')),
      `vẫn còn lời hứa theo lần nộp: ${t}`,
    );
    assert.ok(
      !/chỉ\s+mở\s+sau\s+lần\s+nộp\s+(đầu|đó)/i.test(t.replace(/\s+/g, ' ')),
      `vẫn còn nguyên câu cũ: ${t}`,
    );
  }
});

test('nói đúng mốc mở lời giải: bài được tính HOÀN THÀNH', () => {
  // Mốc thật ở server, đọc lại để chắc là nó chưa đổi.
  assert.ok(
    /gated\s*&&\s*!completed/.test(SERVICE_SRC),
    'server đã đổi điều kiện giữ lời giải — phải đọc lại câu chữ trên màn',
  );
  for (const n of [BOSS, GATE_ONLY]) {
    assert.match(textOf(n), /hoàn thành/i);
  }
  // Bài tổng hợp nói thẳng hệ quả của việc nộp mà chưa đạt.
  assert.match(textOf(BOSS), /chưa đạt/i);
});

test('trần điểm khớp quizPercent, đọc lại từ nguồn chứ không chép tay', () => {
  const m = /d\.assisted\)\s*pct\s*=\s*Math\.min\(pct,\s*boss\s*\?\s*(\d+)\s*:\s*(\d+)\)/.exec(
    STUDIO_SRC,
  );
  assert.ok(m, 'không tìm thấy trần điểm trong quizPercent — regex hay code đã đổi');
  assert.equal(ASSIST_CAP_PCT.boss, Number(m[1]));
  assert.equal(ASSIST_CAP_PCT.normal, Number(m[2]));
  // Con số phải hiện ra cho người đọc, không chỉ nằm trong hằng.
  assert.ok(textOf(BOSS).includes(`${ASSIST_CAP_PCT.boss}%`));
  assert.ok(textOf(GATE_ONLY).includes(`${ASSIST_CAP_PCT.normal}%`));
});

test('không còn ẩn dụ đánh trận', () => {
  for (const n of [BOSS, GATE_ONLY]) {
    assert.ok(!/\btrận\b/i.test(textOf(n)), `còn chữ "trận": ${textOf(n)}`);
  }
});

test('boss và gate đi liền nhau trong giáo trình — nhánh gate một mình chưa sống', () => {
  const dir = join(REPO, 'scripts/pe-v4/out-advanced/lessons');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 48);
  const lech = [];
  let soCua = 0;
  for (const f of files) {
    const c = JSON.parse(readFileSync(join(dir, f), 'utf8')).content_json ?? {};
    const boss = Boolean(c.play?.boss);
    const gate = Boolean(c.step_4?.gate);
    if (gate) soCua += 1;
    if (boss !== gate) lech.push(f);
  }
  assert.equal(soCua, 3, 'AGENTS.md: khoá Advanced có ĐÚNG 3 bài cửa');
  assert.deepEqual(
    lech,
    [],
    'boss và gate vừa tách nhau ⇒ nhánh "Cửa tự kiểm tra" bắt đầu hiện ra thật, '
      + 'đọc lại câu chữ của nó trong lib/gate-notice.ts',
  );
});

test('màn sandbox không còn câu nào viết cứng', () => {
  assert.match(SANDBOX_SRC, /from '@\/lib\/gate-notice'/);
  // Bỏ chú thích trước khi soi: chú thích ĐƯỢC nhắc lại câu sai cũ để giải
  // thích vì sao nó sai, chỉ JSX là không được mang câu nào.
  const code = SANDBOX_SRC.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(
    !/Bài tổng hợp chặng|Cửa tự kiểm tra|mở sau lần nộp/i.test(code),
    'lời nhắc lại bị viết thẳng vào JSX — chỗ không có test nào soi',
  );
});
