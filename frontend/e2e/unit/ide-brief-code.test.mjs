/**
 * Vì sao có file này: nút "Thử ngay trong IDE" ở màn đề bài từng gửi
 * `brief.code` — bản RÚT GỌN để đọc, thân hàm là `...` và dữ liệu mẫu cũng là
 * `...`. Mở IDE bấm Chạy thì xong trong 0,2 giây, không in gì, "Mã thoát: 0" —
 * người học tưởng IDE hỏng. Ảnh chụp của người dùng ngày 13/10/2026 đúng cảnh đó.
 *
 * Và một bẫy nữa, nặng hơn: bài học chạy Pyodide + studio-harness.py (có tkinter
 * MÔ PHỎNG), còn IDE chạy CPython THẬT trong Docker. Đo trên chính sandbox đang
 * phục vụ: có numpy/pandas/sqlite3/threading/multiprocessing/subprocess, KHÔNG
 * có matplotlib, và tkinter nổ "libtk8.6.so: cannot open shared object file".
 * Nên bài vẽ biểu đồ và bài GUI mà hiện nút là đẩy người học sang một traceback
 * không phải lỗi của họ.
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

test('bài cần matplotlib hoặc tkinter thì KHÔNG hiện nút', () => {
  const chet = [];
  for (const { ma, c } of BAI) {
    const starter = c.step_4?.starterCode ?? '';
    const canThuVienThieu = /^\s*(?:import|from)\s+(matplotlib|tkinter|_studio)\b/m.test(starter);
    if (canThuVienThieu && ideCodeChoDeBai(c) !== null) chet.push(ma);
  }
  assert.deepEqual(chet, [], `những bài này sẽ gửi code nổ ngay dòng import: ${chet.join(', ')}`);
});

test('bài process/thread VẪN hiện nút — ở IDE còn thật hơn trong bài học', () => {
  // Trong bài học, subprocess/threading là MÔ PHỎNG của harness; trong IDE là
  // CPython thật. Chặn nhầm nhóm này là bỏ mất phần giá trị nhất của nút.
  for (const ma of ['P01', 'T01']) {
    const b = BAI.find((x) => x.ma === ma);
    assert.ok(ideCodeChoDeBai(b.c), `${ma} phải có nút`);
  }
});

test('chayDuocTrongIde: bắt theo dòng import, không bắt theo chữ trong chú thích', () => {
  assert.equal(chayDuocTrongIde('import matplotlib.pyplot as plt'), false);
  assert.equal(chayDuocTrongIde('from tkinter import Tk'), false);
  assert.equal(chayDuocTrongIde('x = 1\nimport matplotlib'), false);
  // Chữ xuất hiện trong chú thích/chuỗi thì chương trình vẫn chạy bình thường.
  assert.equal(chayDuocTrongIde('# matplotlib vẽ biểu đồ\nprint(1)'), true);
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
// Ngày 13/10/2026 chạy starterCode của cả 48 bài qua chính sandbox đang phục vụ
// (api.programmingedu.io.vn/api/python/run): 28 bài chạy được, 20 bài chết.
//   ·  7 bài tkinter  (G01–G06, R02): ImportError libtk8.6.so
//   · 10 bài matplotlib (X04, X05, M01–M06, DA01, DA02): ModuleNotFoundError
//   ·  3 bài đọc file  (PD03, PD08, PD09): FileNotFoundError sales.csv
//
// Ba bài cuối là lý do bộ test này tồn tại: luật "bắt theo dòng import" KHÔNG
// thấy chúng — không có import nào sai cả. Đoán theo code thì sót, nên danh
// sách dưới đây chép từ SỐ ĐO, và hàm phải khớp với nó.
const DO_DUOC_LA_CHET_VI_THU_VIEN = [
  'G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'R02',
  'X04', 'X05', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'DA01', 'DA02',
];
const DO_DUOC_LA_CHET_VI_THIEU_FILE = ['PD03', 'PD08', 'PD09'];

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
  // 28 bài đo được là chạy được + 3 bài thiếu file nay đã vá = 31.
  assert.equal(conNut.length, 31, `đang có ${conNut.length} bài còn nút: ${conNut.join(', ')}`);
  for (const ma of DO_DUOC_LA_CHET_VI_THU_VIEN) {
    assert.ok(!conNut.includes(ma), `${ma} không được có nút`);
  }
});

// Bằng chứng đã chạy THẬT, không phải chỉ kiểm chuỗi (13/10/2026, sandbox live):
//   PD03 exit=0 · PD08 exit=0, in ra bảng pandas thật · PD09 exit=0 · P01 exit=0
// Trước khi thêm `_os.chdir(_tf.mkdtemp())` thì cả ba bài PD chết với
//   OSError: [Errno 30] Read-only file system: 'sales.csv'
// — tức là luật tĩnh ĐÚNG mà bản vá vẫn sai, chỉ chạy thật mới lộ ra.
