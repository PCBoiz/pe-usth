/**
 * "Kết quả này của bản code trước" — XUẤT XỨ của ô kết quả.
 *
 * VÌ SAO FILE NÀY TỒN TẠI. Bài PY01 của khoá 172 bài có một câu tự vấn viết
 * sẵn trong nguồn: *"Nếu không bấm chạy lại, output đang nhìn thuộc bản code
 * nào?"* — và nền tảng KHÔNG trả lời được câu đó. Người học sửa một dòng,
 * không bấm Chạy, rồi đọc tiếp ô kết quả bên dưới như thể nó là kết quả của
 * bản vừa sửa. Không một pixel nào nói ngược lại: console nguyên màu, chip
 * "✓ Đạt" của lượt trước vẫn xanh, dòng "123 ms" vẫn đứng đó.
 *
 * Nó không cần sơ đồ nào: hai chuỗi là đủ, và nó đúng với CẢ 172 bài.
 *
 * NHÓM CA chia làm hai nửa, cố ý:
 *   (a) LUẬT — gọi thẳng `ketQuaLaCu`. Nửa này canh phép so, nhất là ca "gõ
 *       rồi xoá về như cũ" mà một cờ "đã gõ phím" sẽ nói sai.
 *   (b) ĐƯỜNG ĐI — đọc NGUỒN của bốn file trên đường từ worker tới mắt người
 *       học. Nửa này tồn tại vì lỗi thường gặp nhất của repo này không phải
 *       "luật sai" mà là "luật đúng, không ai nối" (AGENTS.md: tracer không
 *       bài nào tới, nút Try-it không màn nào mount). Một hằng đúng trong
 *       lib/ mà SandboxEditor không dựng thì với người học nó không tồn tại.
 *
 * ABLATION (đo ngày 29/10/2026):
 *   bỏ cổng `coKetQua`                                  → 1 đỏ
 *   so bằng cờ "đã gõ phím" (daChay !== null là cũ)      → 3 đỏ
 *   chuẩn hoá khoảng trắng trước khi so (trim)           → 2 đỏ
 *   callback đọc `draft.code` thay cho mã đã chụp         → 1 đỏ
 *   `useLessonRun` thôi trả `ranCode`                    → 1 đỏ
 *   StudioLesson thôi truyền `resultStale`               → 1 đỏ
 *   SandboxScreen thôi truyền `stale`                    → 1 đỏ
 *   SandboxEditor ghi lại chuỗi thay vì dùng hằng chung  → 1 đỏ
 *   bỏ lớp `staleResult` quanh Console/hình/ca kiểm thử  → 1 đỏ
 *   bỏ `role="status"` khỏi băng chữ                     → 1 đỏ
 *   bỏ quy tắc CSS `.staleResult`                        → 1 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NHAN_KET_QUA_CU, ketQuaLaCu } from '../../src/lib/run-freshness.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
// File trong repo là CRLF: `.` của regex không khớp \r nên `//.*$` không bóc
// được chú thích cuối dòng. Cùng bẫy mà label-version.test.mjs đã ghi.
const doc = (...p) => readFileSync(join(FE, ...p), 'utf8').replace(/\r/g, '');

const RUNNER = doc('src', 'components', 'python-studio', 'useCodeRunner.ts');
const STUDIO = doc('src', 'components', 'python-studio', 'StudioLesson.tsx');
const SANDBOX = doc('src', 'components', 'python-studio', 'screens', 'SandboxScreen.tsx');
const EDITOR = doc('src', 'components', 'lesson-chrome', 'exercises', 'SandboxEditor.tsx');
const CSS = doc('src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css');

// ───────────────────────────────── (a) LUẬT

test('chưa chạy lần nào thì không có xuất xứ nào để nói', () => {
  assert.equal(ketQuaLaCu({ daChay: null, dangGo: 'print(1)', coKetQua: false }), false);
  // Và cả khi vì lý do nào đó có kết quả mà chưa ghi được mã: không đoán.
  assert.equal(ketQuaLaCu({ daChay: null, dangGo: 'print(1)', coKetQua: true }), false);
});

test('chạy rồi, không sửa gì → kết quả vẫn là của bản đang gõ', () => {
  assert.equal(ketQuaLaCu({ daChay: 'print(1)', dangGo: 'print(1)', coKetQua: true }), false);
});

test('sửa một ký tự mà chưa chạy lại → kết quả là CŨ', () => {
  assert.equal(ketQuaLaCu({ daChay: 'print(1)', dangGo: 'print(2)', coKetQua: true }), true);
});

test('gõ rồi XOÁ VỀ ĐÚNG NHƯ CŨ → kết quả vẫn đúng', () => {
  // Đây là ca một cờ "đã gõ phím" nói sai: cờ đó bật ở lần onChange đầu và
  // không có đường tắt lại, nên ô kết quả sẽ đeo băng "bản code trước" trong
  // khi mã đúng từng ký tự với mã đã chạy. So chuỗi thì chuyện này tự xử lý.
  const goc = 'total = 10\nprint(total)';
  const daGo = 'total = 10\nprint(total) ';
  assert.equal(ketQuaLaCu({ daChay: goc, dangGo: daGo, coKetQua: true }), true);
  assert.equal(ketQuaLaCu({ daChay: goc, dangGo: goc, coKetQua: true }), false);
});

test('bấm Chạy rồi bấm Dừng: console rỗng thì KHÔNG đeo băng', () => {
  // `result` về null nhưng `ranCode` vẫn giữ mã của lượt TRƯỚC. Thiếu cổng
  // `coKetQua` thì một ô kết quả trống lại mang câu "kết quả này của bản code
  // trước" — nói về một kết quả không có trên màn hình.
  assert.equal(ketQuaLaCu({ daChay: 'while True: pass', dangGo: 'print(1)', coKetQua: false }), false);
});

test('khác nhau CHỈ ở khoảng trắng vẫn tính là cũ — chiều lệch có chủ đích', () => {
  // Thêm một dấu cách cuối dòng thật ra không đổi đầu ra, nên ở đây phép so
  // nói "cũ" oan một lần. Chấp nhận: chiều kia (bỏ sót một thay đổi CÓ đổi đầu
  // ra) là nói với người học rằng kết quả cũ vẫn đúng — đúng cái lỗi đang sửa.
  // Và khoảng trắng trong Python không vô hại: thụt lề là cú pháp.
  assert.equal(ketQuaLaCu({ daChay: 'x=1', dangGo: 'x=1\n', coKetQua: true }), true);
  assert.equal(ketQuaLaCu({ daChay: 'if x:\n  y=1', dangGo: 'if x:\n    y=1', coKetQua: true }), true);
});

test('ô soạn mã RỖNG khác hẳn "chưa chạy lần nào"', () => {
  // Chuỗi rỗng là một mã đã chạy thật (và kết quả của nó là "chưa có lệnh nào
  // để chạy"). Kiểm bằng `=== null`, không bằng truthiness — `if (!daChay)`
  // thì bài chạy mã rỗng rồi gõ vào sẽ không bao giờ đeo được băng.
  assert.equal(ketQuaLaCu({ daChay: '', dangGo: '', coKetQua: true }), false);
  assert.equal(ketQuaLaCu({ daChay: '', dangGo: 'print(1)', coKetQua: true }), true);
});

// ───────────────────────────────── (b) ĐƯỜNG ĐI

test('xuất xứ được CHỤP lúc gửi, không đọc lại draft.code trong callback', () => {
  // Người học gõ tiếp trong lúc worker đang chạy là chuyện thường. Lúc kết quả
  // về, `draft.code` đã là bản khác hẳn bản worker nhận — ghi nó làm xuất xứ
  // thì một kết quả CŨ lại được đóng dấu "của bản đang gõ", tức bug này sống
  // lại ở đúng ca người học sốt ruột nhất.
  assert.match(RUNNER, /const maDaGui = draft\.code;/);
  assert.match(RUNNER, /execute\(maDaGui, \(data\) => \{/);
  // Và phải đặt CÙNG LÚC với `result`: hai thứ lệch nhau một nhịp là một nhịp
  // màn hình nói sai.
  assert.match(RUNNER, /setResult\(data\);\s*\n\s*setRanCode\(maDaGui\);/);
  assert.doesNotMatch(RUNNER, /setRanCode\(draft\.code\)/);
});

test('useLessonRun phơi `ranCode` ra ngoài', () => {
  assert.match(RUNNER, /^\s{4}ranCode,$/m);
});

test('StudioLesson dùng hàm thuần, không tự so trong component', () => {
  assert.match(STUDIO, /import \{ ketQuaLaCu \} from '@\/lib\/run-freshness';/);
  assert.match(STUDIO, /ketQuaLaCu\(\{\s*\n\s*daChay: lessonRun\.ranCode,/);
  assert.match(STUDIO, /dangGo: d\.code,/);
  assert.match(STUDIO, /coKetQua: result !== null,/);
  // Và nó phải ĐI XUỐNG màn hình, không dừng lại ở một biến cục bộ.
  assert.match(STUDIO, /resultStale=\{resultStale\}/);
});

test('SandboxScreen nối cờ đó vào ô kết quả', () => {
  assert.match(SANDBOX, /\|\s*'resultStale'/);
  assert.match(SANDBOX, /stale=\{resultStale\}/);
});

test('SandboxEditor dựng ĐÚNG hằng chung, không ghi lại câu chữ', () => {
  // Hai bản của cùng một câu là hai bản sẽ lệch nhau: ca test sửa một bên, UI
  // hiện bên kia. Đúng họ bẫy `withInlineCode` đã ghi trong AGENTS.md.
  assert.match(EDITOR, /import \{ NHAN_KET_QUA_CU \} from '@\/lib\/run-freshness';/);
  assert.match(EDITOR, /\{NHAN_KET_QUA_CU\}/);
  assert.doesNotMatch(EDITOR, /'Kết quả này của bản code trước/);
  // Băng chữ phải được ĐỌC LÊN. Nó là thứ chở thông tin ở đây — phần làm mờ
  // chỉ là lớp nhắc lại bằng thị giác, với người dùng trình đọc màn hình nó
  // không tồn tại.
  assert.match(EDITOR, /className=\{styles\.staleNotice\} role="status"/);
});

test('cả BA phần của ô kết quả cùng mờ, và băng chữ đứng TRƯỚC chúng', () => {
  // Console, hình vừa vẽ và bảng ca kiểm thử đều là của lượt chạy cũ. Mờ một
  // phần rồi để chip "✓ Đạt" xanh nguyên bên dưới là tệ hơn không mờ gì: nó
  // nói "output cũ nhưng điểm thì mới".
  const boc = EDITOR.indexOf('className={stale ? styles.staleResult : undefined}');
  const bang = EDITOR.indexOf('styles.staleNotice');
  assert.ok(boc > 0, 'không có lớp bọc staleResult quanh vùng kết quả');
  assert.ok(bang > 0 && bang < boc, 'băng chữ phải đứng trước vùng bị làm mờ');
  for (const phan of ['<Console', 'HÌNH VỪA VẼ', 'Kiểm thử']) {
    assert.ok(EDITOR.indexOf(phan) > boc, `${phan} phải nằm TRONG lớp bọc staleResult`);
  }
});

test('CSS làm mờ có thật, và không mờ tới mức không đọc nổi', () => {
  const rule = CSS.match(/\.staleResult \{([^}]*)\}/);
  assert.ok(rule, 'thiếu quy tắc .staleResult');
  const opacity = Number(rule[1].match(/opacity:\s*([\d.]+)/)?.[1]);
  // Người học vẫn phải đối chiếu được output cũ với bản code mới — đó chính là
  // việc họ đang làm khi băng chữ hiện ra.
  assert.ok(opacity >= 0.5 && opacity < 1, `opacity ${opacity} ngoài khoảng dùng được`);
  assert.match(CSS, /\.staleNotice \{/);
  // Dùng bộ màu CẢNH BÁO, không phải màu lỗi: kết quả cũ không phải một lỗi.
  assert.match(CSS, /\.staleNotice \{[^}]*--st-warn-/s);
});

test('câu nói ra xuất xứ nói đúng việc phải làm', () => {
  // Nó phải kể cả HAI nửa: kết quả thuộc bản nào, và làm gì để hết. Một câu
  // chỉ có nửa đầu ("kết quả đã cũ") để người học tự đoán — mà AGENTS.md ghi
  // rõ: một đường đi người dùng phải đoán thì trên thực tế nó không tồn tại.
  assert.match(NHAN_KET_QUA_CU, /bản code trước/);
  assert.match(NHAN_KET_QUA_CU, /bấm Chạy/);
});
