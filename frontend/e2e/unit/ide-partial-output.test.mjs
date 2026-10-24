// Đầu ra của một lần chạy BỊ CẮT (hết giờ hoặc bấm Dừng).
//
// VÌ SAO CÓ FILE NÀY: `terminate()` là cách duy nhất cắt được một worker đang
// bị chặn, nhưng nó cũng làm thông điệp 'result' không bao giờ tới. Hệ quả đo
// được trong Chrome 155 ngày 25/10/2026: chạy `while True: print("dong", i)`
// rồi bấm Dừng sau 2 giây thì ô kết quả hiện **"(Không có đầu ra)"** — dù
// chương trình đã in hơn 6 000 dòng. Mục chọn "In vô hạn (cắt đầu ra)" ngay
// trong trang tự hứa điều ngược lại, và đường Docker cũ làm được vì máy chủ giữ
// stdout hộ.
//
// Cả 173 ca trước đó đều ĐẠT khi lỗi này còn nguyên — không ca nào chạm tới
// đường bị-cắt. Đó là lý do nó sống sót qua cả bốn pha chuyển sang client.
//
// Cách sửa: worker gửi đầu ra về từng đợt 200 ms ('partial'), runner giữ đợt
// cuối và dùng nó khi phải cắt.
//
// ĐÃ GỠ BẢN SỬA RA VÀ CHẠY THẬT — số ca trượt ghi ở cuối file.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  IDE_OUTPUT_CAP_CHARS,
  disposeIdeRunner,
  runInBrowser,
  stopInBrowser,
} from '../../src/lib/ide-runner.ts';

/**
 * Worker giả. Nhận {type:'run'} thì gửi vài đợt 'partial' rồi IM LẶNG mãi —
 * đúng hành vi của một vòng lặp vô hạn: không bao giờ có 'result'.
 */
class WorkerGia {
  static tao = [];
  constructor() {
    this.onmessage = null;
    this.onerror = null;
    this.daTerminate = false;
    WorkerGia.tao.push(this);
  }
  postMessage(msg) {
    if (!msg || msg.type !== 'run') return; // 'warmup' thì không trả lời gì
    this.guiPartial({ stdout: 'dong 1\n', stderr: '' });
    this.guiPartial({ stdout: 'dong 1\ndong 2\n', stderr: 'canh bao\n', outputTruncated: true });
  }
  guiPartial(data) {
    this.onmessage?.({ data: { type: 'partial', ...data } });
  }
  guiResult(result) {
    this.onmessage?.({ data: { type: 'result', result } });
  }
  terminate() {
    this.daTerminate = true;
  }
}

function dungSan() {
  WorkerGia.tao = [];
  globalThis.Worker = WorkerGia;
  disposeIdeRunner();
}

test('bấm Dừng vẫn trả về phần đã in ra — đây là ca BẮT LỖI', async () => {
  dungSan();
  const dangChay = runInBrowser('while True:\n    print("dong")');
  assert.equal(stopInBrowser(), true, 'phải có lần chạy để dừng');
  const kq = await dangChay;
  assert.equal(kq.stdout, 'dong 1\ndong 2\n', 'mất đầu ra đã nhận được');
  assert.equal(kq.stderr, 'canh bao\n');
  assert.equal(kq.cutBy, 'user');
  assert.equal(kq.timedOut, true);
  assert.equal(kq.exitCode, null);
});

test('cờ "đã cắt đầu ra" của đợt cuối cũng phải đi theo', async () => {
  // Thiếu cái này thì giao diện không biết để nói "chỉ giữ 60 000 ký tự đầu".
  dungSan();
  const dangChay = runInBrowser('while True:\n    print("x")');
  stopInBrowser();
  const kq = await dangChay;
  assert.equal(kq.outputTruncated, true);
});

test('đợt sau GHI ĐÈ đợt trước, không nối thêm', async () => {
  // Worker gửi cả bộ đệm mỗi đợt, không gửi phần thêm. Nối thêm là nhân đôi
  // mọi dòng — một lỗi dễ mắc mà đọc code thì không thấy.
  dungSan();
  const dangChay = runInBrowser('x');
  stopInBrowser();
  const kq = await dangChay;
  assert.equal((kq.stdout.match(/dong 1/g) || []).length, 1);
});

test('chương trình tự xong thì KẾT QUẢ THẬT thắng mọi đợt partial', async () => {
  dungSan();
  const dangChay = runInBrowser('print("xong")');
  const w = WorkerGia.tao[0];
  w.guiResult({
    stdout: 'xong\n', stderr: '', exitCode: 0, timedOut: false,
    outputTruncated: false, durationMs: 3, queuedMs: 0,
  });
  const kq = await dangChay;
  assert.equal(kq.stdout, 'xong\n');
  assert.equal(kq.exitCode, 0);
  assert.equal(kq.timedOut, false);
  assert.equal(kq.cutBy, undefined);
});

test('lần chạy không in gì thì vẫn là chuỗi rỗng, không phải undefined', async () => {
  dungSan();
  globalThis.Worker = class extends WorkerGia {
    postMessage() {} // không gửi đợt nào
  };
  const dangChay = runInBrowser('while True:\n    pass');
  stopInBrowser();
  const kq = await dangChay;
  assert.equal(kq.stdout, '');
  assert.equal(kq.stderr, '');
  assert.equal(kq.outputTruncated, false);
});

test('worker bị cắt phải được terminate, không rò lại lần chạy sau', async () => {
  dungSan();
  const dangChay = runInBrowser('while True:\n    pass');
  const w = WorkerGia.tao[0];
  stopInBrowser();
  await dangChay;
  assert.equal(w.daTerminate, true);
});

test('trần đầu ra khai ở TS và trong worker phải trùng nhau', () => {
  // Giao diện nói con số này ra cho người học ("chỉ giữ 60.000 ký tự đầu"), mà
  // con số THẬT nằm trong ide.worker.js — worker là JS trần, không import được.
  // Hai chỗ lệch nhau là một lời nói dối không có gì làm đỏ.
  const src = readFileSync(
    new URL('../../public/static/js/ide.worker.js', import.meta.url),
    'utf8',
  );
  const so = [...src.matchAll(/box\[khoa\]\.length < (\d+)/g)].map((m) => Number(m[1]));
  assert.equal(so.length, 1, `tìm thấy ${so.length} chỗ đặt trần, phải đúng 1`);
  assert.equal(so[0], IDE_OUTPUT_CAP_CHARS);
});

test('worker phải GỌI guiDanDan từ chính hook stdout', () => {
  // Khai hàm mà không gọi thì không có đợt nào được gửi, và mọi ca ở trên vẫn
  // đạt vì chúng dùng worker giả. Ca này canh đúng chỗ đó.
  const src = readFileSync(
    new URL('../../public/static/js/ide.worker.js', import.meta.url),
    'utf8',
  );
  const hook = /const them = \(khoa\) => \(dong\) => \{([\s\S]*?)\n  \};/.exec(src);
  assert.ok(hook, 'không tìm thấy hook stdout trong ide.worker.js');
  assert.ok(
    /guiDanDan\(/.test(hook[1]),
    'hook stdout không gọi guiDanDan() — worker sẽ không gửi đầu ra nào trong lúc chạy',
  );
  assert.ok(
    /type: 'partial'/.test(src),
    "worker không gửi thông điệp 'partial' nào",
  );
});

// ── Thứ tự: tải + import sẵn thư viện TRƯỚC khi bấm giờ ──────────────────────
test('worker import sẵn thư viện trước khi bắt đầu đo thời gian', () => {
  // Đo trên /ide ngày 25/10/2026: bài vẽ biểu đồ lần chạy đầu báo "Thời gian
  // chạy: 5,62 s" — toàn bộ là `import matplotlib.pyplot` (dựng cache font,
  // chọn backend). Vì nó nằm trong mã người học nên 5,62 s đó ăn vào đúng hạn
  // 15 giây của họ: một bài vẽ nhiều hình bị cắt vì THƯ VIỆN, không vì mã mình.
  // Sau khi import sẵn, cùng đoạn mã báo 0,04 s.
  //
  // `loadPackage` MỘT MÌNH không đủ: nó chỉ bung wheel vào MEMFS, chưa chạy
  // câu import nào.
  const src = readFileSync(
    new URL('../../public/static/js/ide.worker.js', import.meta.url),
    'utf8',
  );
  const than = /async function run\(code\) \{([\s\S]*?)\n\}/.exec(src);
  assert.ok(than, 'không tìm thấy hàm run() trong ide.worker.js');
  const iLoad = than[1].indexOf('loadPackage');
  const iImport = than[1].indexOf('importlib.import_module');
  const iGio = than[1].indexOf('performance.now()');
  assert.ok(iLoad > -1, 'run() không gọi loadPackage');
  assert.ok(iImport > -1, 'run() không import sẵn thư viện nào');
  assert.ok(iGio > -1, 'run() không bấm giờ');
  assert.ok(iLoad < iGio, 'loadPackage phải nằm TRƯỚC khi bấm giờ');
  assert.ok(iImport < iGio, 'import sẵn phải nằm TRƯỚC khi bấm giờ');
});

test('làm nóng matplotlib bằng pyplot, không phải gói ngoài', () => {
  // `import matplotlib` gần như miễn phí; chỗ tốn là `matplotlib.pyplot`. Làm
  // nóng sai tên thì 5,62 s vẫn còn nguyên trong hạn của người học, mà không có
  // gì đỏ lên.
  const src = readFileSync(
    new URL('../../public/static/js/ide.worker.js', import.meta.url),
    'utf8',
  );
  const m = /const LAM_NONG = \{([^}]*)\}/.exec(src);
  assert.ok(m, 'không tìm thấy LAM_NONG');
  assert.match(m[1], /matplotlib:\s*'matplotlib\.pyplot'/);
});
