/**
 * Vì sao có file này: nút "Thử ngay trong IDE" ở màn đề bài từng gửi
 * `brief.code` — bản RÚT GỌN để đọc, thân hàm là `...` và dữ liệu mẫu cũng là
 * `...`. Mở IDE bấm Chạy thì xong trong 0,2 giây, không in gì, "Mã thoát: 0" —
 * người học tưởng IDE hỏng. Ảnh chụp của người dùng ngày 13/10/2026 đúng cảnh đó.
 *
 * Và một bẫy nữa, nặng hơn: hai môi trường chạy khác nhau, nên nút có thể đẩy
 * người học sang một traceback không phải lỗi của họ.
 *
 * DANH SÁCH THƯ VIỆN TRONG FILE NÀY ĐÃ ĐẢO CHIỀU ngày 25/10/2026. Bản cũ đo
 * trên sandbox Docker (`python:3.12-slim`): có threading/multiprocessing/
 * subprocess thật, KHÔNG có matplotlib. Nhưng /ide nay chạy Pyodide trong trình
 * duyệt, và đo lại trên chính trang đó (Chrome 155) thì đúng ngược lại —
 * matplotlib 3.10.8 dựng được Figure, còn `threading.Thread.start()` ném
 * "RuntimeError: can't start new thread", `multiprocessing` thiếu
 * `_multiprocessing`, `subprocess` ném OSError 138 "emscripten does not support
 * processes".
 *
 * PHẠM VI: cả hai hàm chỉ được gọi từ màn `brief` và màn `explain`, mà bộ 172
 * bài đang xuất bản không có màn nào trong hai màn đó (đếm được 0/172). Fixture
 * dưới đây vì vậy vẫn là 48 bài pe-v4 — bộ duy nhất có `step_1.brief`.
 *
 * Fixture là bài THẬT từ scripts/pe-v4/out-advanced/lessons/*.json — đúng cái
 * seed đẩy vào `lessons.content_json`. Bẫy đã ghi trong AGENTS.md: fixture tự
 * bịa thì test vô dụng.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import {
  chayDuocTrongIde,
  ideCodeChoDeBai,
} from '../../src/lib/ide-brief-code.ts';

const DIR = new URL('../../../scripts/pe-v4/out-advanced/lessons/', import.meta.url);
const BAI = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => {
    const raw = JSON.parse(readFileSync(new URL(f, DIR), 'utf8'));
    const c = raw.content_json ?? raw;
    return { ma: raw.lesson_code ?? c.lesson_code ?? f, c };
  });

test('đủ 48 bài để kết luận có nghĩa', () => {
  assert.equal(BAI.length, 48);
});

test('KHÔNG gửi brief.code — bản rút gọn chạy ra ô trống', () => {
  // Ca bắt lỗi chính: `brief.code` của P01 có "..." thay cho thân hàm.
  const p01 = BAI.find((b) => b.ma === 'P01');
  assert.ok(p01, 'không thấy bài P01');
  const gui = ideCodeChoDeBai(p01.c);
  assert.ok(gui, 'P01 phải có mã gửi đi');
  assert.notEqual(gui, p01.c.step_1.brief.code);
  assert.ok(gui.includes('def count_processes(table, program):'));
  // Dấu hiệu rõ nhất của bản đầy đủ: có dữ liệu mẫu thật và khối __main__.
  assert.ok(gui.includes('(410, 305, "python")'), 'thiếu dữ liệu mẫu thật');
  assert.ok(gui.includes("if __name__ ==") , 'thiếu khối __main__ nên chạy không in gì');
});

test('kèm chú thích nói rõ cần in ra gì, lấy từ bộ test chấm bài', () => {
  const p01 = BAI.find((b) => b.ma === 'P01');
  const gui = ideCodeChoDeBai(p01.c);
  const ca = p01.c.step_4.tests[0];
  assert.ok(gui.startsWith('# Thử ngay:'));
  assert.ok(gui.includes(`${ca.call}  →  ${ca.expect}`), 'không thấy ca kiểm tra đầu tiên');
});

test('bài cần thư viện WASM không có thì KHÔNG hiện nút', () => {
  const chet = [];
  for (const { ma, c } of BAI) {
    const starter = c.step_4?.starterCode ?? '';
    const canThuVienThieu =
      /^\s*(?:import|from)\s+(tkinter|_studio|threading|multiprocessing|subprocess)\b/m.test(starter);
    if (canThuVienThieu && ideCodeChoDeBai(c) !== null) chet.push(ma);
  }
  assert.deepEqual(chet, [], `những bài này sẽ gửi code nổ ngay dòng import: ${chet.join(', ')}`);
});

test('bài vẽ biểu đồ NAY hiện nút — Pyodide của /ide có matplotlib', () => {
  // Đảo chiều so với bản Docker. Đo trên /ide: `import matplotlib.pyplot` rồi
  // `plt.subplots()` cho ra Figure, matplotlib 3.10.8.
  const veBieuDo = BAI.filter(({ c }) =>
    /^\s*(?:import|from)\s+matplotlib\b/m.test(c.step_4?.starterCode ?? ''));
  assert.ok(veBieuDo.length >= 8, `chỉ thấy ${veBieuDo.length} bài matplotlib`);
  // Vẫn có bài mất nút vì lý do KHÁC (kèm cả tkinter, hoặc mã quá dài), nên chỉ
  // đòi rằng matplotlib MỘT MÌNH không còn là lý do chặn.
  const matNut = veBieuDo.filter(({ c }) => ideCodeChoDeBai(c) === null).map((b) => b.ma);
  for (const ma of matNut) {
    const starter = BAI.find((x) => x.ma === ma).c.step_4.starterCode;
    assert.ok(
      /^\s*(?:import|from)\s+(tkinter|_studio|threading|multiprocessing|subprocess)\b/m.test(starter),
      `${ma} mất nút mà không phải vì thư viện WASM thiếu — matplotlib không còn là lý do chặn`,
    );
  }
});

test('bài process/thread KHÔNG còn nút — trong WASM chúng nổ', () => {
  // Bản cũ đòi NGƯỢC LẠI ("ở IDE còn thật hơn trong bài học"), và nó đúng với
  // Docker. Pyodide thì `Thread.start()` ném RuntimeError còn `multiprocessing`
  // không import được, nên để nút là đẩy người học vào một traceback.
  //
  // T01 = `import threading`, P07 = `import multiprocessing`, P02 =
  // `import subprocess` (đếm bằng chính starterCode, không chọn theo tên bài —
  // bản đầu của ca này chọn P01 vì tưởng tiền tố "P" là process, nhưng P01 chỉ
  // `import os` nên nó CHẠY ĐƯỢC và phải giữ nút).
  for (const ma of ['T01', 'P07', 'P02']) {
    const b = BAI.find((x) => x.ma === ma);
    assert.ok(b, `không thấy bài ${ma}`);
    assert.equal(ideCodeChoDeBai(b.c), null, `${ma} vẫn còn nút`);
  }
  const p01 = BAI.find((x) => x.ma === 'P01');
  assert.ok(ideCodeChoDeBai(p01.c), 'P01 chỉ import os — không được chặn lây');
});

test('chayDuocTrongIde: bắt theo dòng import, không bắt theo chữ trong chú thích', () => {
  assert.equal(chayDuocTrongIde('from tkinter import Tk'), false);
  assert.equal(chayDuocTrongIde('x = 1\nimport threading'), false);
  assert.equal(chayDuocTrongIde('import multiprocessing'), false);
  assert.equal(chayDuocTrongIde('import subprocess'), false);
  // matplotlib ĐẢO CHIỀU: Pyodide của /ide có nó, nên không chặn nữa.
  assert.equal(chayDuocTrongIde('import matplotlib.pyplot as plt'), true);
  assert.equal(chayDuocTrongIde('x = 1\nimport matplotlib'), true);
  // Chữ xuất hiện trong chú thích/chuỗi thì chương trình vẫn chạy bình thường.
  assert.equal(chayDuocTrongIde('# tkinter dựng cửa sổ\nprint(1)'), true);
  assert.equal(chayDuocTrongIde('ten = "tkinter"\nprint(ten)'), true);
  assert.equal(chayDuocTrongIde(''), false);
  assert.equal(chayDuocTrongIde(undefined), false);
});

test('bài không có starterCode thì trả null, không ném lỗi', () => {
  assert.equal(ideCodeChoDeBai(null), null);
  assert.equal(ideCodeChoDeBai({}), null);
  assert.equal(ideCodeChoDeBai({ step_4: {} }), null);
});

test('mã gửi đi vẫn vừa trần bàn giao của mọi bài còn hiện nút', async () => {
  const { ideCodeHref } = await import('../../src/lib/ide-handoff.ts');
  for (const { ma, c } of BAI) {
    const gui = ideCodeChoDeBai(c);
    if (!gui) continue;
    assert.ok(ideCodeHref(gui), `${ma}: mã quá dài, nút sẽ im lặng biến mất`);
  }
});

// ── Đối chiếu với KẾT QUẢ ĐO THẬT ───────────────────────────────────────────
// ĐO LẠI 25/10/2026 trên /ide (Pyodide 314.0.7 trong Chrome 155), vì nền chạy
// đã đổi. Số cũ — đo 13/10/2026 trên sandbox Docker — giữ lại ở đây để thấy nó
// đảo chiều chứ không phải để dùng:
//
//   CŨ (Docker python:3.12-slim): 7 bài tkinter chết (libtk8.6.so) + 10 bài
//   matplotlib chết (ModuleNotFoundError) + 3 bài đọc file chết (sales.csv).
//
//   NAY (Pyodide): matplotlib CHẠY ĐƯỢC (3.10.8, dựng được Figure), nhưng
//   threading/multiprocessing/subprocess thì KHÔNG — `Thread.start()` ném
//   "RuntimeError: can't start new thread", thiếu `_multiprocessing`, và
//   subprocess ném OSError 138 "emscripten does not support processes".
//
// Ba bài đọc file vẫn là lý do bộ test này tồn tại: luật "bắt theo dòng import"
// KHÔNG thấy chúng — không có import nào sai cả. Đoán theo code thì sót, nên
// danh sách dưới đây chép từ SỐ ĐO, và hàm phải khớp với nó.
//
// Nhóm theo MODULE mà starterCode thật sự import (đếm trên 48 bài), không theo
// tiền tố mã bài: P01 mang chữ "P" nhưng chỉ `import os`.
const DO_DUOC_LA_CHET_VI_THU_VIEN = [
  // tkinter — giới hạn WASM, không có màn hình
  'G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'R02',
  // threading — import được, nhưng Thread.start() ném
  'T01', 'T02', 'T03', 'T05', 'T06',
  // multiprocessing — thiếu _multiprocessing
  'P07',
  // subprocess — emscripten không có tiến trình
  'P02', 'P04', 'P05', 'P06',
];
const DO_DUOC_LA_CHET_VI_THIEU_FILE = ['PD03', 'PD08', 'PD09'];
// 10 bài vẽ biểu đồ, TRƯỚC bị chặn và NAY chạy được — chính chỗ đảo chiều.
const DO_DUOC_LA_VE_BIEU_DO_CHAY_DUOC = [
  'X04', 'X05', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'DA01', 'DA02',
];

test('mọi bài ĐO ĐƯỢC là chết vì thiếu thư viện đều KHÔNG hiện nút', () => {
  const sai = DO_DUOC_LA_CHET_VI_THIEU_FILE.length ? [] : [];
  for (const ma of DO_DUOC_LA_CHET_VI_THU_VIEN) {
    const b = BAI.find((x) => x.ma === ma);
    assert.ok(b, `không thấy bài ${ma}`);
    if (ideCodeChoDeBai(b.c) !== null) sai.push(ma);
  }
  assert.deepEqual(sai, [], `sẽ gửi code chết: ${sai.join(', ')}`);
});

test('ba bài thiếu file được VÁ bằng đoạn tự tạo file, không bị giấu nút', () => {
  for (const ma of DO_DUOC_LA_CHET_VI_THIEU_FILE) {
    const b = BAI.find((x) => x.ma === ma);
    const gui = ideCodeChoDeBai(b.c);
    assert.ok(gui, `${ma} mất nút — lẽ ra phải vá được`);
    assert.ok(gui.includes('write_text('), `${ma} thiếu đoạn tạo file`);
    assert.ok(gui.includes('sales.csv'), `${ma} không tạo đúng file bài cần`);
    // CRLF của dữ liệu bẩn phải giữ nguyên: bài dạy đúng chuyện đó.
    assert.ok(gui.includes('newline=""'), `${ma} để Python tự dịch dòng, hỏng dữ liệu CRLF`);
    // Container chạy --read-only: ghi thẳng vào thư mục làm việc là
    // OSError [Errno 30]. Đã đo trên sandbox thật, không phải suy đoán.
    assert.ok(gui.includes('_os.chdir(_tf.mkdtemp())'), `${ma} ghi file vào nơi không ghi được`);
  }
});

test('số bài còn nút khớp số ĐO ĐƯỢC là chạy được, cộng ba bài vừa vá', () => {
  const conNut = BAI.filter((b) => ideCodeChoDeBai(b.c) !== null).map((b) => b.ma);
  // 48 bài − 17 bài chết vì thư viện WASM = 31, và không bài nào mất nút vì lý
  // do khác (đã đếm: 0). Con số 31 trùng với mốc cũ chỉ là ngẫu nhiên — THÀNH
  // PHẦN đổi hẳn, nên hai vòng kiểm dưới mới là phần có nghĩa.
  assert.equal(conNut.length, 31, `đang có ${conNut.length} bài còn nút: ${conNut.join(', ')}`);
  for (const ma of DO_DUOC_LA_CHET_VI_THU_VIEN) {
    assert.ok(!conNut.includes(ma), `${ma} không được có nút`);
  }
  for (const ma of DO_DUOC_LA_VE_BIEU_DO_CHAY_DUOC) {
    assert.ok(conNut.includes(ma), `${ma} vẽ biểu đồ và nay chạy được — phải có nút`);
  }
});

// Bằng chứng đã chạy THẬT, không phải chỉ kiểm chuỗi (13/10/2026, sandbox live):
//   PD03 exit=0 · PD08 exit=0, in ra bảng pandas thật · PD09 exit=0 · P01 exit=0
// Trước khi thêm `_os.chdir(_tf.mkdtemp())` thì cả ba bài PD chết với
//   OSError: [Errno 30] Read-only file system: 'sales.csv'
// — tức là luật tĩnh ĐÚNG mà bản vá vẫn sai, chỉ chạy thật mới lộ ra.
