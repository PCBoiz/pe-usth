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
  // Câu mở đầu đổi cùng lúc với tên nút: "Thử ngay trong IDE" → "Chạy thử ở
  // Bàn thí nghiệm" (bảng thuật ngữ design-system-v2), nên nó không còn nhắc
  // "Thử ngay" nữa.
  assert.ok(gui.startsWith('# Điền thân hàm rồi bấm Chạy.'), gui.slice(0, 80));
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

/**
 * ── CHÚ THÍCH DO CODE SINH RA PHẢI ĐÚNG SỰ THẬT ─────────────────────────
 * `maTaoFile` từng coi MỌI phần tử `step_4.files` là "file dữ liệu bài cần
 * ĐỌC". Sai từ lúc T05 được thêm `race_demo.py`: bấm nút ở T05 sinh ra mã mở
 * đầu bằng "Bài này đọc file dữ liệu" trong khi T05 không `open()` gì cả —
 * không nổ, nhưng là chú thích sai do code sinh ra cho người học đọc.
 * Ba bài có file `.py` kèm theo (đếm trên 48 bài thật): P04 `sum_numbers.py`
 * (chạy làm process con), T05 `race_demo.py`, R02 `report.py` (R02 import
 * tkinter nên không có nút).
 */
const BAI_CO_FILE_MA = ['P04', 'T05'];

test('bài có file .py kèm theo KHÔNG bị nói là "đọc file dữ liệu"', () => {
  for (const ma of BAI_CO_FILE_MA) {
    const b = BAI.find((x) => x.ma === ma);
    assert.ok(b, `không thấy bài ${ma}`);
    const gui = ideCodeChoDeBai(b.c);
    assert.ok(gui, `${ma} phải có nút`);
    const py = (b.c.step_4.files ?? []).filter((f) => f.name.endsWith('.py'));
    const duLieu = (b.c.step_4.files ?? []).filter((f) => !f.name.endsWith('.py'));
    assert.equal(duLieu.length, 0, `${ma} nay có cả file dữ liệu — ca này cần viết lại`);
    assert.ok(
      !gui.includes('đọc file dữ liệu'),
      `${ma} chỉ có file mã kèm theo (${py.map((f) => f.name).join(', ')}) nhưng mã sinh ra`
      + ' vẫn nói "đọc file dữ liệu"',
    );
    assert.ok(
      gui.includes('cần file mã kèm theo'),
      `${ma}: chú thích phải nói đúng loại file`,
    );
    for (const f of py) {
      assert.ok(gui.includes(f.name), `${ma}: thiếu tên file ${f.name} trong chú thích`);
    }
  }
});

test('file .py kèm theo nằm trong sys.path, nếu không thì import nổ', () => {
  for (const ma of BAI_CO_FILE_MA) {
    const gui = ideCodeChoDeBai(BAI.find((x) => x.ma === ma).c);
    // Sau `_os.chdir(...)`, sys.path[0] vẫn là thư mục của file đang chạy.
    assert.ok(
      gui.includes('_sys.path.insert(0, _os.getcwd())'),
      `${ma}: ghi file .py ra thư mục tạm mà không đưa thư mục đó vào sys.path`,
    );
    // Thứ tự phải đúng: chdir trước, rồi mới lấy getcwd().
    assert.ok(
      gui.indexOf('_os.chdir(') < gui.indexOf('_sys.path.insert('),
      `${ma}: chèn sys.path trước khi chdir thì chèn sai thư mục`,
    );
  }
});

test('bài chỉ có file dữ liệu vẫn nói "đọc file dữ liệu", và không chèn sys.path', () => {
  for (const ma of DO_DUOC_LA_CHET_VI_THIEU_FILE) {
    const gui = ideCodeChoDeBai(BAI.find((x) => x.ma === ma).c);
    assert.ok(gui.includes('đọc file dữ liệu'), `${ma}: mất câu nói đúng việc bài làm`);
    assert.ok(gui.includes('sales.csv'), `${ma}: chú thích không nêu tên file`);
    assert.ok(
      !gui.includes('_sys.path.insert'),
      `${ma} không có file .py nào — chèn sys.path là dòng vô ích trong mã người học đọc`,
    );
  }
});

test('mọi bài còn nút: chú thích sinh ra nêu đúng tên mọi file bài cần', () => {
  const sai = [];
  for (const { ma, c } of BAI) {
    const gui = ideCodeChoDeBai(c);
    const files = c.step_4?.files ?? [];
    if (!gui || !files.length) continue;
    for (const f of files) {
      if (!gui.includes(f.name)) sai.push(`${ma}: thiếu ${f.name}`);
    }
    // Không được nói cả hai loại khi bài chỉ có một loại.
    const coPy = files.some((f) => f.name.endsWith('.py'));
    const coDuLieu = files.some((f) => !f.name.endsWith('.py'));
    if (!coDuLieu && gui.includes('đọc file dữ liệu')) sai.push(`${ma}: nói đọc dữ liệu mà không có`);
    if (!coPy && gui.includes('file mã kèm theo')) sai.push(`${ma}: nói file mã mà không có`);
  }
  assert.deepEqual(sai, [], sai.join('\n'));
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
