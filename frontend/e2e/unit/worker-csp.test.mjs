// Vì sao có file này: code Python của học viên gọi được JS qua `pyodide.ffi`,
// nên trong worker nó làm được
// `fetch(API_ORIGIN + '/auth/refresh', { credentials: 'include' })` và nhận về
// một access token THẬT — đo được trong Chrome 155 ngày 25/10/2026. Nguyên nhân
// KHÔNG phải "worker không có CSP": entry `/(.*)` trong next.config.ts khớp cả
// `/static/js/*.worker.js`, nên worker đang chạy với đúng CSP của trang — mà
// CSP đó cố ý cho phép `connect-src ... ${API_ORIGIN}`.
//
// Hai thứ phải cùng đúng mới bịt được, và file này khoá cả hai:
//   1. ba worker có CSP RIÊNG với `connect-src 'self'` (không có API_ORIGIN),
//      và entry đó phải nằm SAU `/(.*)` vì Next.js lấy entry sau khi trùng tên
//      header;
//   2. `delete self.Worker` trong chính worker — `worker-src 'none'` KHÔNG đủ,
//      đo được là nó chỉ chặn `blob:`, còn worker con từ URL cùng origin vẫn
//      tạo được, và worker con đó nhận CSP của TRANG nên lại có API_ORIGIN.
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const config = readFileSync(new URL('../../next.config.ts', import.meta.url), 'utf8');

/** Khối `const workerCsp = [...]` tách riêng khỏi `csp` của trang. */
function khoiWorkerCsp() {
  const m = /const workerCsp = \[([\s\S]*?)\]\.join/.exec(config);
  assert.ok(m, 'không tìm thấy khai báo workerCsp trong next.config.ts');
  return m[1];
}

/** Tên file worker được liệt kê trong PYTHON_WORKERS. */
function danhSachKhai() {
  const m = /const PYTHON_WORKERS = \[([\s\S]*?)\];/.exec(config);
  assert.ok(m, 'không tìm thấy PYTHON_WORKERS trong next.config.ts');
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

/** Worker thật nằm trên đĩa — nguồn sự thật, không phải danh sách viết tay. */
function workerTrenDia() {
  const dir = new URL('../../public/static/js/', import.meta.url);
  return readdirSync(dir).filter((f) => f.endsWith('.worker.js'));
}

test('CSP của worker KHÔNG mang API_ORIGIN — đây là ca bắt lỗi', () => {
  const khoi = khoiWorkerCsp();
  assert.ok(
    /connect-src 'self'/.test(khoi),
    "workerCsp phải có connect-src 'self'",
  );
  assert.ok(
    !/API_ORIGIN/.test(khoi),
    'workerCsp có API_ORIGIN — code học viên gọi được /auth/refresh kèm cookie phiên',
  );
});

test('CSP của TRANG vẫn phải có API_ORIGIN, nếu không thì apiFetch chết', () => {
  // Hai policy dễ bị sửa lẫn nhau: cắt API_ORIGIN khỏi policy của trang là
  // trang bài học không gọi được API nào.
  const m = /^const csp = \[([\s\S]*?)\]\.join/m.exec(config);
  assert.ok(m, 'không tìm thấy khai báo csp của trang');
  assert.ok(/connect-src 'self' \$\{API_ORIGIN\}/.test(m[1]), 'csp của trang mất API_ORIGIN');
});

test('entry của worker nằm SAU entry "/(.*)" — sai thứ tự là mất tác dụng', () => {
  const chung = config.indexOf('source: "/(.*)"');
  const rieng = config.indexOf('...PYTHON_WORKERS.map');
  assert.ok(chung > -1 && rieng > -1, 'thiếu một trong hai entry');
  assert.ok(
    rieng > chung,
    'entry worker phải nằm sau "/(.*)": Next.js lấy entry SAU khi hai entry cùng khớp và cùng tên header',
  );
});

test('MỌI worker trên đĩa đều được khai — thêm worker mới mà quên là trượt ở đây', () => {
  const dia = workerTrenDia();
  const khai = danhSachKhai();
  assert.ok(dia.length >= 3, `chỉ thấy ${dia.length} worker trên đĩa`);
  for (const f of dia) {
    assert.ok(khai.includes(f), `${f} chạy mã Python nhưng không có trong PYTHON_WORKERS`);
  }
});

test('không khai thừa tên file không tồn tại', () => {
  // Khai một tên sai chính tả thì entry đó vô nghĩa, và không có gì đỏ lên.
  const dia = new Set(workerTrenDia());
  for (const f of danhSachKhai()) {
    assert.ok(dia.has(f), `PYTHON_WORKERS khai "${f}" nhưng file không tồn tại`);
  }
});

test('mỗi worker tự bỏ `Worker` trước khi chạy mã học viên', () => {
  for (const f of workerTrenDia()) {
    const src = readFileSync(
      new URL(`../../public/static/js/${f}`, import.meta.url),
      'utf8',
    );
    assert.ok(
      // Neo đầu dòng: `// delete self.Worker;` KHÔNG được tính là có. Bản
      // đầu của ca này thiếu neo nên chú thích hoá dòng đó vẫn ĐẠT.
      /^delete self\.Worker;/m.test(src),
      `${f} thiếu "delete self.Worker" — học viên tạo được worker con từ file cùng origin, và worker con đó nhận CSP của trang (có API_ORIGIN)`,
    );
  }
});

test('worker không gọi ra ngoài origin — nếu có thì connect-src \'self\' sẽ chặn', () => {
  // Bản sửa chỉ đúng chừng nào ba worker thật sự không cần domain nào khác.
  // Ca này canh điều đó: thêm một fetch tới CDN là trượt ở đây chứ không phải
  // chết lặng trong trình duyệt học viên.
  for (const f of workerTrenDia()) {
    const src = readFileSync(
      new URL(`../../public/static/js/${f}`, import.meta.url),
      'utf8',
    );
    const ngoai = [...src.matchAll(/https?:\/\/[^\s'"`)]+/g)]
      .map((m) => m[0])
      // URL trong chú thích (dẫn nguồn, link tài liệu) không phải lời gọi mạng.
      .filter((u) => {
        const dong = src.slice(0, src.indexOf(u)).split('\n').pop();
        return !/^\s*(\*|\/\/)/.test(dong);
      });
    assert.deepEqual(ngoai, [], `${f} có URL khác origin: ${ngoai.join(', ')}`);
  }
});
