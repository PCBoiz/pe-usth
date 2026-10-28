/**
 * CƠ CHẾ NẠP FILE DỮ LIỆU vào Pyodide — bộ dữ liệu quán tới được mã học viên.
 *
 * Vì sao có file này. Trước bản này KHÔNG có đường nào để một file dữ liệu tới
 * được Pyodide: worker chỉ biết `step_4.packages` → `loadPackage`, và cả 499
 * khối code của bản dựng đều tự dựng dữ liệu tại chỗ (`StringIO`, `tempfile`),
 * còn `read_csv` một file thật thì đếm được đúng 7 lần và không lần nào đọc
 * được gì. Cơ chế mới đi qua NĂM chỗ, và bỏ sót một chỗ thì nó hỏng IM LẶNG:
 *
 *   1. `scripts/pe-da/build.py` phát `step_4.dataFiles` (KHOI_DU_LIEU);
 *   2. `src/course-admin/studio-lesson.schema.ts` — CỬA DUY NHẤT vào DB: một
 *      trường không qua đây thì bài chạy đúng trong trình duyệt vẫn không có
 *      đường tới học viên (đã xảy ra với 124 bài tập được chấm);
 *   3. `frontend/public/static/js/studio-lesson.worker.js` tải file rồi ghép
 *      vào tham số `files` của bộ chấm;
 *   4. `scripts/pe-da/check.py` chặn khai báo trỏ vào file không có;
 *   5. `scripts/pe-da/check-pyodide.mjs` đọc CHÍNH file đó từ đĩa khi chạy
 *      dưới Node (bộ chấm cấm đi mạng, nên fetch không dùng được ở đó).
 *
 * Ca cuối cùng là ca đáng giá nhất: nó đòi có ÍT NHẤT một bài THẬT dùng cơ
 * chế, và bài đó phải là bài học viên bấm Chạy được. Repo này đã bốn lần dựng
 * xong một tính năng không ai tới được (bộ ghi vết, nút Try-it, 13 màn tối,
 * kho quiz rỗng) — mỗi lần đều có mã, có test, không có người dùng.
 *
 * BẰNG CHỨNG BẮT ĐƯỢC LỖI: xem phần "Ablate" trong báo cáo kèm commit.
 */
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  DU_LIEU_HOP_LE,
  validateStudioLesson,
} from '../../../src/course-admin/studio-lesson.schema.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const DU_LIEU_DIR = join(ROOT, 'frontend', 'public', 'static', 'da-dulieu');
const WORKER = readFileSync(
  join(ROOT, 'frontend', 'public', 'static', 'js', 'studio-lesson.worker.js'), 'utf8');
const BUILD_PY = readFileSync(join(ROOT, 'scripts', 'pe-da', 'build.py'), 'utf8');
const CHECK_PY = readFileSync(join(ROOT, 'scripts', 'pe-da', 'check.py'), 'utf8');
const SCHEMA = readFileSync(
  join(ROOT, 'src', 'course-admin', 'studio-lesson.schema.ts'), 'utf8');
const RUNNER = readFileSync(
  join(ROOT, 'frontend', 'src', 'components', 'python-studio', 'runner',
    'pyodide-runner.ts'), 'utf8');
const USE_RUNNER = readFileSync(
  join(ROOT, 'frontend', 'src', 'components', 'python-studio', 'useCodeRunner.ts'), 'utf8');

/** Bài có `dataFiles`, đọc từ chính bản dựng sẽ vào DB. */
function baiDungDuLieu() {
  const duong = join(ROOT, 'scripts', 'pe-da', 'out', 'lessons.json');
  if (!existsSync(duong)) return null;
  const bundle = JSON.parse(readFileSync(duong, 'utf8'));
  return bundle.lessons.filter((b) => (b.content_json?.step_4?.dataFiles || []).length);
}

// ─────────────────────────── Danh sách trắng ───────────────────────────

test('danh sách trắng ở schema KHỚP thư mục được phục vụ', () => {
  // Backend chạy ở nơi KHÔNG có frontend/public (Render chỉ deploy NestJS), nên
  // schema buộc phải mang bản literal. Ca này là thứ ghim bản literal đó vào
  // thư mục thật: thêm/bớt một file mà quên sửa schema là đỏ ngay đây.
  const tren_dia = readdirSync(DU_LIEU_DIR).filter((f) => f.endsWith('.csv')).sort();
  assert.deepEqual([...DU_LIEU_HOP_LE].sort(), tren_dia,
    'DU_LIEU_HOP_LE trong studio-lesson.schema.ts lệch với static/da-dulieu/');
  assert.ok(tren_dia.length > 0, 'không có file dữ liệu nào — cơ chế không có gì để nạp');
});

test('BỐN bản regex tên file giống nhau từng ký tự', () => {
  // build.py chặn ở khâu dựng, check.py là phía đối chứng, schema là cửa vào
  // DB, worker là chỗ ghép tên vào một URL. Lệch một bản là một tên lọt qua ba
  // chỗ rồi bị chặn (hoặc tệ hơn: KHÔNG bị chặn) ở chỗ thứ tư.
  const mau = String.raw`^[a-z0-9_-]+\.csv$`;
  assert.ok(BUILD_PY.includes(`re.compile(r'${mau}')`), 'build.py: TEN_FILE_DU_LIEU lệch');
  assert.ok(CHECK_PY.includes(`re.compile(r'${mau}')`), 'check.py: TEN_FILE_DU_LIEU lệch');
  assert.ok(SCHEMA.includes(`const TEN_DU_LIEU = /${mau}/;`), 'schema: TEN_DU_LIEU lệch');
  assert.ok(WORKER.includes(`const TEN_DU_LIEU = /${mau}/;`), 'worker: TEN_DU_LIEU lệch');
});

test('mọi file trong danh sách trắng khớp chính regex đó', () => {
  const re = /^[a-z0-9_-]+\.csv$/;
  for (const ten of DU_LIEU_HOP_LE)
    assert.ok(re.test(ten), `"${ten}" trong danh sách trắng mà không khớp regex`);
});

// ───────────────────────────── Cửa vào DB ─────────────────────────────

/**
 * Bài đọc HỢP LỆ tối thiểu, để mọi lỗi trả về là lỗi của `dataFiles`.
 * `step_1.read` là dấu phân biệt bài ĐỌC với bài có chấm (xem validate).
 */
function bai(step4) {
  return {
    schema: 'studio-lesson/v2',
    title: 'PD13 · JSON và Excel',
    step_1: { read: [[]] },
    step_4: { task: { title: 'Chạy thử', body: 'Ô này chạy Python.' }, ...step4 },
  };
}

test('schema CHẤP NHẬN tên file có trong bộ dữ liệu', () => {
  assert.deepEqual(validateStudioLesson(bai({ dataFiles: ['mon.csv', 'quay.csv'] })), []);
});

test('schema TỪ CHỐI file không có trong bộ dữ liệu', () => {
  const loi = validateStudioLesson(bai({ dataFiles: ['luong_nhan_vien.csv'] }));
  assert.equal(loi.length, 1);
  assert.match(loi[0], /không có trong bộ dữ liệu/);
});

test('schema TỪ CHỐI đường dẫn, không chỉ tên lạ', () => {
  // Worker ghép thẳng tên vào '/static/da-dulieu/' rồi fetch. Một tên mang
  // `../` hay `/` là một request đi chỗ khác trong public — và nó sẽ THÀNH
  // CÔNG, nên không có gì đỏ lên để biết.
  for (const xau of ['../../pyodide/v314.0.7/pyodide-lock.json', '/etc/passwd',
    'da-dulieu/mon.csv', 'MON.CSV', 'mon.csv ']) {
    const loi = validateStudioLesson(bai({ dataFiles: [xau] }));
    assert.equal(loi.length, 1, `"${xau}" đi lọt qua cửa vào DB`);
  }
});

test('schema TỪ CHỐI khai trùng tên', () => {
  const loi = validateStudioLesson(bai({ dataFiles: ['mon.csv', 'mon.csv'] }));
  assert.equal(loi.length, 1);
  assert.match(loi[0], /khai trùng/);
});

test('schema TỪ CHỐI dataFiles không phải mảng', () => {
  assert.equal(validateStudioLesson(bai({ dataFiles: 'mon.csv' })).length, 1);
});

// ───────────────────────────── Worker ─────────────────────────────

test('worker lấy file ở CÙNG ORIGIN, không CDN', () => {
  assert.ok(WORKER.includes("const DU_LIEU_DIR = '/static/da-dulieu/';"),
    'worker không còn trỏ vào /static/da-dulieu/');
  const fetchDuLieu = /fetch\(DU_LIEU_DIR \+ ten/.test(WORKER);
  assert.ok(fetchDuLieu, 'worker không fetch theo DU_LIEU_DIR + tên file');
  // CSP riêng của file worker là `connect-src 'self'` (next.config.ts), nên
  // một địa chỉ tuyệt đối sẽ bị chặn TRONG TRÌNH DUYỆT mà vẫn chạy dưới Node.
  assert.ok(!/fetch\(\s*['"`]https?:/.test(WORKER), 'worker fetch một địa chỉ tuyệt đối');
});

test('file dữ liệu tải XONG trước khi worker báo "ready"', () => {
  // Phía React bắt đầu đếm 5 giây của học viên từ lúc nhận 'ready'. Tải một
  // file 1,29 MB sau mốc đó là lấy thời gian chạy của họ để tải dữ liệu của
  // bài — đúng lỗi mà `loadPackage` đã mắc một lần (5,62 s của matplotlib).
  const tai = WORKER.indexOf('await taiDuLieu(dataFiles)');
  const ready = WORKER.indexOf("self.postMessage({ type: 'ready' })", tai);
  assert.ok(tai > 0, 'worker không còn gọi taiDuLieu');
  assert.ok(ready > tai, "taiDuLieu phải chạy TRƯỚC postMessage('ready')");
});

test('thiếu file là NỔ, không phải chạy tiếp với thư mục rỗng', () => {
  assert.match(WORKER, /if \(!r\.ok\) throw new Error\(`không tải được dữ liệu/,
    'worker nuốt lỗi tải file — mã học viên sẽ nhận FileNotFoundError thay vì câu thật');
});

test('file dữ liệu được GỘP vào tham số `files` của bộ chấm', () => {
  // Không có tham số thứ hai nào cho file: `_studio_main(source, cases, files)`
  // là hợp đồng có sẵn, và `_prepare_dir` ghi chúng vào thư mục chạy rồi chdir
  // vào đó — nhờ vậy mã học viên đọc bằng TÊN TRƠN.
  assert.match(WORKER, /JSON\.stringify\(\[\.\.\.fileDuLieu, \.\.\.files\]\)/,
    'worker không gộp file dữ liệu vào `files`');
});

// ───────────────────────── Đường từ bài tới worker ─────────────────────────

test('React chuyển `dataFiles` từ bài xuống worker', () => {
  // Hai mắt xích, và đứt một mắt là worker không bao giờ nhận được tên file —
  // không ngoại lệ nào được ném, chỉ có FileNotFoundError trong console.
  assert.match(RUNNER, /dataFiles: request\.dataFiles \?\? \[\]/,
    'pyodide-runner không gửi dataFiles trong postMessage');
  assert.match(USE_RUNNER, /dataFiles: four\.dataFiles \?\? \[\]/,
    'useCodeRunner không lấy dataFiles từ step_4');
});

// ───────────────────────── Bản dựng thật ─────────────────────────

test('bản dựng: cơ chế CÓ NGƯỜI DÙNG, và họ bấm Chạy được', () => {
  const dung = baiDungDuLieu();
  if (dung === null) return;  // chưa dựng — build.py là chỗ chặn, không phải đây
  assert.ok(dung.length >= 1,
    'không bài nào khai step_4.dataFiles — cơ chế nạp file không có đường tới người học');
  for (const b of dung) {
    const bon = b.content_json.step_4;
    // Bài có BÀI TẬP ĐƯỢC CHẤM thì step_4 là bài tập, và mã BÀI ĐỌC không còn
    // được học viên chạy trong trình duyệt — khai file dữ liệu ở đó là chỉ bộ
    // chấm dưới Node dùng tới. Có `starterCode` nghĩa là ô "Chạy thử" thật.
    assert.ok(bon.starterCode && !bon.tests,
      `${b.lesson_code}: khai dataFiles nhưng step_4 không phải ô Chạy thử`);
    const doc = bon.dataFiles.every((t) => bon.starterCode.includes(`'${t}'`));
    assert.ok(doc, `${b.lesson_code}: starterCode không đọc file đã khai`);
  }
});

test('bản dựng: mọi file được khai đều có thật trên đĩa', () => {
  const dung = baiDungDuLieu();
  if (dung === null) return;
  for (const b of dung)
    for (const ten of b.content_json.step_4.dataFiles) {
      assert.ok([...DU_LIEU_HOP_LE].includes(ten),
        `${b.lesson_code} khai "${ten}" — không có trong danh sách trắng của schema`);
      assert.ok(existsSync(join(DU_LIEU_DIR, ten)),
        `${b.lesson_code} khai "${ten}" nhưng file không có — worker sẽ nhận 404`);
    }
});
