/**
 * Bảng thuật ngữ áp cho NỘI DUNG 48 BÀI, không chỉ cho code giao diện.
 *
 * ===========================================================================
 * VÌ SAO CÓ FILE NÀY
 * ===========================================================================
 * Cả repo đã dọn ẩn dụ đánh trận: `ds-wording` cấm "Boss" ở ca ĐẦU TIÊN,
 * `gate-notice.test.mjs` có một ca riêng cấm chữ "trận". Nhưng mọi ca đó quét
 * `src/app` + `src/components` — còn CHỮ NGƯỜI HỌC ĐỌC NHIỀU NHẤT nằm trong
 * 48 file JSON của giáo trình, và không ca nào mở chúng ra. 427 ca chấm thì
 * chấm CODE, không đọc câu chữ.
 *
 * Đo được trước bản sửa: 21 chuỗi "Boss" sống trong nội dung ba bài
 * R02/DA01/DA02, hiện ra ở bốn đường — tiêu đề màn nộp bài (`step_4.task.title`
 * → SandboxScreen), tiêu đề mini-game (`play.games[].title` → GameScreen),
 * nhãn `brief.eyebrow`, và `context.body`.
 *
 * Tệ hơn cả ẩn dụ: tiêu đề đó còn ghi "nộp lần đầu trước khi xem lời giải" —
 * ĐÚNG lời hứa sai mà commit afecee1 vừa gỡ khỏi lời nhắc ngay bên dưới nó.
 * Hai câu cạnh nhau trên cùng một màn, nói ngược nhau.
 *
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 *  - "không ẩn dụ đánh trận" trượt với bản nội dung cũ (21 chuỗi).
 *  - "không hứa mở lời giải sau LẦN NỘP" trượt với tiêu đề cũ — cùng luật mà
 *    `gate-notice.test.mjs` áp cho giao diện, nay áp cho cả nội dung.
 *  - "giáo trình tĩnh khớp gói bài" bắt đúng bẫy "hai nguồn danh sách bài"
 *    trong AGENTS.md: sửa nội dung mà quên `sync_curricula.py` thì trang khoá
 *    hiện chữ cũ.
 *  - "quét đúng 48 bài" là chốt chặn: nếu đường dẫn gói đổi và hàm đọc ra 0
 *    file, mọi ca trên sẽ xanh vì không có gì để soi. Vòng lặp rỗng là cách
 *    một bộ test chết mà vẫn báo đạt.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const GOI = join(REPO, 'scripts', 'pe-v4', 'out-advanced', 'lessons');

/** Chuẩn hoá như `ds-wording.hits()`: NFC + gộp khoảng trắng. */
const chuanHoa = (s) => s.normalize('NFC').replace(/\s+/g, ' ');

/** Mọi chuỗi trong một cây JSON, kèm đường dẫn khoá để báo lỗi cho đúng chỗ. */
function moiChuoi(o, duong = '', ra = []) {
  if (typeof o === 'string') ra.push([duong, chuanHoa(o)]);
  else if (Array.isArray(o)) o.forEach((v, i) => moiChuoi(v, `${duong}[${i}]`, ra));
  else if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) moiChuoi(v, duong ? `${duong}.${k}` : k, ra);
  }
  return ra;
}

const FILES = readdirSync(GOI).filter((f) => f.endsWith('.json'));
const BAI = FILES.map((f) => [f, JSON.parse(readFileSync(join(GOI, f), 'utf8')).content_json ?? {}]);

/** Tìm mẫu trên toàn bộ nội dung; trả "file · khoá · chuỗi". */
function tim(mau) {
  const ra = [];
  for (const [ten, noiDung] of BAI) {
    for (const [duong, s] of moiChuoi(noiDung)) {
      if (mau.test(s)) ra.push(`${ten} · ${duong}: ${s.slice(0, 90)}`);
    }
  }
  return ra;
}

test('quét đúng 48 bài — vòng lặp rỗng là bộ test chết mà vẫn báo đạt', () => {
  assert.equal(FILES.length, 48, `đọc được ${FILES.length} file, không phải 48`);
  const tong = BAI.reduce((n, [, c]) => n + moiChuoi(c).length, 0);
  assert.ok(tong > 1000, `chỉ bóc được ${tong} chuỗi — hàm đọc nội dung hỏng rồi`);
});

test('không ẩn dụ đánh trận trong nội dung bài', () => {
  // Chữ thường cũng tính: ở JSON không có tên lớp CSS nào tên "boss", nên
  // không có lý do chừa như bên `ds-wording` (ở đó `c.boss` là lớp có thật).
  // "ma trận" là MA TRẬN, không phải đánh trận — mẫu phải chừa nó, nếu
  // không ca này đỏ oan hơn 30 chỗ trong chặng numpy. Đúng loại dương tính
  // giả làm người ta gỡ bỏ cả ca test thay vì sửa nó.
  const mau = /\bboss\b|(?<!ma )trận\b|⚔️|hạ gục|đánh bại/i;
  assert.ok(!mau.test('Với ma trận vuông (2, 2)'), 'mẫu bắt lầm "ma trận"');
  assert.ok(mau.test('Khởi động trận Boss: mỗi đáp án đúng hay sai?'), 'mẫu không bắt nổi chuỗi cũ');
  assert.deepEqual(
    tim(mau), [],
    'Bảng thuật ngữ chốt "bài tổng hợp chặng". Sửa ở NGUỒN SINH '
    + '(scripts/pe-v4/*.py) rồi dựng lại, đừng sửa file JSON sinh ra.',
  );
});

test('nội dung không hứa mở lời giải sau LẦN NỘP', () => {
  // Luật thật: lời giải mở khi bài HOÀN THÀNH (lessons.service.ts
  // `gated && !completed`). Xem frontend/src/lib/gate-notice.ts.
  const mau = /nộp lần đầu|sau lần nộp/i;
  assert.ok(mau.test('Boss — tự viết, nộp lần đầu trước khi xem lời giải'));
  assert.deepEqual(tim(mau), [], 'nội dung bài hứa ngược với luật của server');
});

test('giáo trình tĩnh khớp gói bài — bẫy "hai nguồn danh sách bài"', () => {
  const cur = JSON.parse(
    readFileSync(join(REPO, 'frontend', 'src', 'lib', 'curricula.json'), 'utf8'),
  ).CURRICULA.python_advanced;
  const soBai = cur.modules.reduce((n, m) => n + m.lessons.length, 0);
  assert.equal(soBai, 48, 'curricula.json lệch số bài so với gói');
  const chuoiCur = moiChuoi(cur).map(([, s]) => s).join('\n');
  assert.ok(
    !/\bboss\b|trận\b/i.test(chuoiCur),
    'curricula.json còn ẩn dụ đánh trận — chạy py scripts/pe-v4/sync_curricula.py',
  );
});
