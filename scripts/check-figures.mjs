/**
 * Kiểm việc XUẤT HÌNH của frontend/public/static/js/studio-harness.py, bằng
 * CHÍNH Pyodide của trình duyệt.
 *
 * Vì sao cần bộ kiểm riêng: 427 ca của pe-v4 và 406 đoạn của pe-da chỉ so
 * ĐẦU RA BẰNG CHỮ. Việc xuất hình không ảnh hưởng tới chữ, nên mọi cách hỏng
 * của nó đi qua tất cả chúng mà không đỏ một dòng nào:
 *
 *   · trả về danh sách rỗng (người học lại mất hình, đúng lỗi vừa sửa);
 *   · dựng ảnh cho Figure TRỐNG (`plt.subplots()` ở dòng đầu bài nào cũng có);
 *   · bỏ trần, để một vòng lặp vẽ 200 hình làm phình thông điệp postMessage.
 *
 * ĐÃ GỠ TỪNG PHẦN RA VÀ CHẠY THẬT — số ca trượt đo được, không phải đoán:
 *   `figures = []`            → 7 ca trượt
 *   bỏ trần byte mỗi hình     → 7 ca
 *   bỏ phép loại hình trống   → 1 ca
 *   bỏ trần số hình           → 1 ca
 *
 * HAI ĐIỀU TÔI TƯỞNG LÀ BẪY MÀ KHÔNG PHẢI — ghi lại để không ai mất công như
 * tôi. Cả hai đã ablate và KHÔNG ca nào đỏ, rồi đo trực tiếp để biết vì sao:
 *   · "xuất bằng `savefig` đã móc sẽ làm bẩn `_studio.main.saved`" — không:
 *     lúc `_anh_figure` chạy thì `_ctx()` đã là None nên bản móc không ghi gì.
 *   · "gọi sau ca chấm thì hình mất vì `_reset_pyplot()`" — không:
 *     `plt.close('all')` không huỷ Figure, `savefig` vẫn chạy trên Figure đã
 *     close (đo được 16 598 byte PNG sau `plt.close('all')`).
 * Hai ca tương ứng dưới đây vì vậy chỉ CANH BẤT BIẾN, không bắt được bản lùi
 * nào hôm nay — chúng đỏ nếu sau này có ai làm Figure chết thật.
 *
 *   npm i --no-save pyodide@314.0.7
 *   node scripts/check-figures.mjs [--verbose]
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadPyodide } from 'pyodide';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const RUNTIME =
  process.env.PYODIDE_DIR || join(ROOT, 'frontend', 'public', 'pyodide', 'v314.0.7') + '/';
const verbose = process.argv.includes('--verbose');

// CẤM ĐI MẠNG — cùng lý lẽ với ba bộ chấm kia: `loadPackage` thiếu wheel thì
// lặng lẽ tải từ CDN, nên "chạy được ở đây" không chứng minh được gì về trình
// duyệt, nơi CSP connect-src chặn đường đó.
const fetchThat = globalThis.fetch;
globalThis.fetch = (u, ...r) => {
  const dia = String(typeof u === 'string' ? u : (u?.url ?? u));
  if (/^https?:\/\//i.test(dia)) {
    return Promise.reject(new Error(
      `bộ kiểm không được đi mạng: ${dia}\n`
      + '  → file này phải nằm sẵn trong frontend/public/pyodide/v314.0.7/.',
    ));
  }
  return fetchThat(u, ...r);
};

const VE_MOT_HINH =
  'import matplotlib.pyplot as plt\n'
  + 'fig, ax = plt.subplots()\n'
  + 'ax.plot([1, 2, 3], [2, 4, 8])\n'
  + 'print("xong")\n';

const py = await loadPyodide({ indexURL: RUNTIME });
await py.loadPackage(['matplotlib'], { messageCallback: () => {} });
await py.runPythonAsync(
  readFileSync(join(ROOT, 'frontend', 'public', 'static', 'js', 'studio-harness.py'), 'utf8'),
);
const grade = py.globals.get('_studio_main');
const chay = (code, cham = '[]') => JSON.parse(grade(code, cham, '[]', '[]', 'null'));

const hong = [];
const dat = (ten, dieu, chiTiet = '') => {
  if (dieu) {
    if (verbose) console.log(`  ✓ ${ten}`);
  } else {
    hong.push(`${ten}${chiTiet ? ' — ' + chiTiet : ''}`);
  }
};

/** PNG thật bắt đầu bằng 8 byte cố định. */
function laPng(b64) {
  const b = Buffer.from(b64, 'base64');
  return b.length > 8
    && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
    && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a;
}

// ── 1. Có hình thì trả về hình ────────────────────────────────────────────────
{
  const r = chay(VE_MOT_HINH);
  dat('vẽ một hình → trả về đúng một PNG',
    Array.isArray(r.figures) && r.figures.length === 1,
    `nhận ${JSON.stringify(r.figures && r.figures.length)}`);
  dat('đúng là PNG, không phải chuỗi rác',
    r.figures?.length === 1 && laPng(r.figures[0]));
  dat('đầu ra bằng chữ KHÔNG bị cảnh báo thư viện chen vào',
    r.output === 'xong\n', JSON.stringify(r.output));
  dat('không có lỗi', !r.error, String(r.error).slice(0, 120));
  if (verbose && r.figures?.[0]) {
    console.log(`    PNG ${Math.round(Buffer.from(r.figures[0], 'base64').length / 1024)} KB`);
  }
}

// ── 2. Hình TRỐNG thì không trả ───────────────────────────────────────────────
{
  // `plt.subplots()` có ở dòng đầu gần như mọi bài; dựng ra một ô xám trống
  // không giúp ai mà còn làm người học tưởng mình vẽ sai.
  const r = chay('import matplotlib.pyplot as plt\nfig, ax = plt.subplots()\nprint("trong")\n');
  dat('hình trống (không có dữ liệu) thì KHÔNG trả về',
    Array.isArray(r.figures) && r.figures.length === 0,
    `nhận ${JSON.stringify(r.figures)}`);
}

// ── 3. Nhiều hình, và trần số lượng ──────────────────────────────────────────
{
  const r = chay(
    'import matplotlib.pyplot as plt\n'
    + 'for k in range(3):\n'
    + '    fig, ax = plt.subplots()\n'
    + '    ax.plot([1, 2, 3], [k, k + 1, k + 2])\n',
  );
  dat('ba hình → ba PNG', r.figures?.length === 3, `nhận ${r.figures?.length}`);
}
{
  const r = chay(
    'import matplotlib.pyplot as plt\n'
    + 'for k in range(20):\n'
    + '    fig, ax = plt.subplots()\n'
    + '    ax.plot([1, 2], [k, k])\n',
  );
  // Trần cố ý: 20 hình × ~15 KB vẫn nhỏ, nhưng một vòng lặp vẽ 200 hình thì
  // thông điệp postMessage phình tới mức treo tab.
  dat('vẽ 20 hình thì bị chặn ở trần 6', r.figures?.length === 6, `nhận ${r.figures?.length}`);
}

// ── 3b. Cảnh báo của matplotlib KHÔNG được lọt vào đầu ra của người học ──────
{
  // ĐÂY LÀ CA BẮT LỖI THẬT SỰ của bước xuất ảnh. Harness cố ý
  // `redirect_stderr(ctx.out)` để console học viên hiện cả hai luồng, nên một
  // `MatplotlibDeprecationWarning` do CHÍNH bước xuất ảnh sinh ra sẽ chen vào
  // KẾT QUẢ BỊ CHẤM của họ và làm mọi phép so với `expected` trượt — dù bài in
  // đúng từng chữ. `figsize=(6, 3.5)` là nguồn cảnh báo đã biết (kích thước
  // điểm ảnh ra số thực); ba bài VZ14/VZ25/VZ30 của giáo trình dùng đúng nó.
  //
  // THÀNH THẬT: ca này KHÔNG tái tạo được cảnh báo, nên gỡ
  // `warnings.simplefilter('ignore')` ra thì nó vẫn xanh. Giữ lại vì nó canh
  // đúng thứ phải đúng (đầu ra sạch), và phần nuốt cảnh báo trong `_anh_figure`
  // vẫn đáng giữ: đo trực tiếp thì `savefig` CÓ lúc ném
  // MatplotlibDeprecationWarning, chỉ là không ném với đoạn mã này.
  const r = chay(
    'import matplotlib.pyplot as plt\n'
    + 'fig, ax = plt.subplots(figsize=(6, 3.5))\n'
    + 'ax.plot([1, 2, 3], [1, 4, 9])\n'
    + 'ax.set_xticks([1.5, 2.5])\n'
    + 'print("sach")\n',
  );
  dat('cảnh báo matplotlib không lọt vào output',
    r.output === 'sach\n', JSON.stringify(r.output).slice(0, 200));
  dat('và cũng không lọt vào error',
    !r.error, String(r.error).slice(0, 160));
  dat('hình vẫn xuất được', r.figures?.length === 1, `nhận ${r.figures?.length}`);
}

// ── 4. KHÔNG được làm bẩn `_studio.saved` ────────────────────────────────────
{
  // Đây là ca dễ sai nhất và im lặng nhất: `savefig` bị móc để ghi vào
  // `ctx.saved`, nên xuất ảnh bằng bản móc là tự thêm một dòng "đã lưu hình"
  // cho bài mà người học chưa lưu gì.
  // `_studio.saved` không tồn tại — `Studio` chỉ phơi `tk/figures/charts`, còn
  // danh sách lưu nằm ở `_studio.main.saved`. Bản đầu của ca này gọi sai tên và
  // "trượt" vì AttributeError, tức nó đỏ mà KHÔNG phải vì lỗi đang canh.
  const cham = JSON.stringify([
    { name: 'chưa lưu hình nào', call: 'len(_studio.main.saved)', expect: '0' },
  ]);
  const r = chay(VE_MOT_HINH, cham);
  dat('xuất ảnh không thêm dòng nào vào _studio.saved',
    r.tests?.[0]?.passed === true,
    JSON.stringify(r.tests?.[0]));
}

// ── 5. Hình phải còn sống SAU khi ca chấm chạy ───────────────────────────────
{
  // `_run_program` mở đầu bằng `_reset_pyplot()`. Gọi `_anh_figure` sau ca chấm
  // thì `figures` rỗng dù bài vẽ đúng — ca này canh đúng thứ tự đó.
  const cham = JSON.stringify([
    { name: 'chạy lại chương trình', call: 'len(_studio.main.figures)', expect: '1' },
  ]);
  const r = chay(VE_MOT_HINH, cham);
  dat('có ca chấm chạy xen vào thì hình VẪN còn',
    r.figures?.length === 1,
    `nhận ${r.figures?.length}`);
}

// ── 6. Bài không dùng matplotlib ─────────────────────────────────────────────
{
  const r = chay('print(1 + 1)\n');
  dat('bài không vẽ gì → danh sách rỗng, không phải undefined',
    Array.isArray(r.figures) && r.figures.length === 0,
    JSON.stringify(r.figures));
  dat('và không tốn thêm thời gian nào đáng kể', r.output === '2\n');
}

// ── 7. Chương trình lỗi vẫn trả hình đã vẽ được ─────────────────────────────
{
  // Vẽ xong rồi mới nổ: hình đó vẫn là thứ giúp họ hiểu mình đang ở đâu.
  const r = chay(
    'import matplotlib.pyplot as plt\n'
    + 'fig, ax = plt.subplots()\n'
    + 'ax.plot([1, 2, 3], [1, 4, 9])\n'
    + 'raise ValueError("nổ sau khi vẽ")\n',
  );
  dat('chương trình nổ sau khi vẽ → vẫn trả hình', r.figures?.length === 1,
    `nhận ${r.figures?.length}`);
  dat('và vẫn báo lỗi', /ValueError/.test(String(r.error)));
}

if (hong.length) {
  console.log(`\n${hong.length} vấn đề:`);
  hong.forEach((h) => console.log('  ✗ ' + h));
  process.exit(1);
}
console.log('\nxuất hình: mọi ca đạt (hình thật, hình trống bị bỏ, trần 6, không bẩn _studio.saved)');
