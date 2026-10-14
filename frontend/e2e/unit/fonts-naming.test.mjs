/**
 * Canh bốn việc lẻ của đợt "khớp bản thiết kế" ngày 15/10/2026.
 *
 * ── 1 · HỌ CHỮ ───────────────────────────────────────────────────────────
 * Bản thiết kế v2 chốt đúng hai họ: **Be Vietnam Pro** cho chữ thường,
 * **JetBrains Mono** cho code. App thật trước đó dùng Poppins (nạp bằng
 * `@import url(fonts.googleapis.com/…)` trong edu-theme.css), còn 'JetBrains
 * Mono' thì được 30 chỗ CSS GỌI TÊN mà không trang nào nạp — mọi khối code rơi
 * về `monospace` mặc định của hệ điều hành.
 *
 * Ca test ở đây không chỉ hỏi "có khai không" mà hỏi ba điều dễ sai nhất và
 * đều lặng lẽ:
 *   · mỗi `src: url(…)` trỏ tới một tệp CÓ THẬT trong repo — khai sai đường
 *     dẫn thì trình duyệt im lặng dùng phông dự phòng, nhìn vẫn "có chữ";
 *   · mọi @font-face có `font-display: swap` — thiếu nó là chữ TRỐNG trong lúc
 *     tải (tới 3 giây trên mạng chậm);
 *   · chuỗi dự phòng kết thúc bằng một họ chữ CHUNG (`sans-serif`/`monospace`)
 *     — hỏng phông thì bố cục không được vỡ.
 *
 * ── 2 · CHÍNH TẢ VÀ TÊN GỌI ─────────────────────────────────────────────
 * "khoá" (không phải "khóa") và một tên duy nhất cho trình soạn code: "Bàn thí
 * nghiệm". Chỉ soi những file đã dọn — danh sách nằm ở `CLEANED` để mở rộng
 * dần, chứ không quét cả repo rồi phải miễn trừ hàng loạt.
 *
 * ── 3 · curricula.json KHÔNG CÒN KHOÁ ĐÃ XOÁ ────────────────────────────
 * Và quan trọng hơn: `sync_curricula.py` phải là nơi dọn. File JSON do script
 * sinh ra, nên sửa tay nó thì lần sync sau kéo dữ liệu chết về.
 *
 * ── 4 · CHÚ THÍCH BÀI CỬA NÊU ĐÚNG MÃ BÀI ──────────────────────────────
 * Danh sách mã lấy từ CHÍNH dữ liệu bài đang seed, không chép tay — đúng bẫy
 * "fixture không giống dữ liệu thật thì test vô dụng" trong AGENTS.md.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOT = join(FE, '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

/** Bỏ chú thích khối + chú thích `//` (giữ `https://` nguyên vẹn). */
const stripJs = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ');

/* ═══ 1 · họ chữ ═══════════════════════════════════════════════════════ */

const FONTS_CSS_PATH = ['public', 'static', 'css', 'edu-fonts.css'];
const FONTS_CSS = stripCss(read(...FONTS_CSS_PATH));

/** Cắt từng khối @font-face thành map thuộc tính → giá trị. */
function faces(css) {
  const out = [];
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const decls = new Map();
    for (const d of m[1].matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)) decls.set(d[1], d[2].trim());
    out.push(decls);
  }
  return out;
}

const FACES = faces(FONTS_CSS);

/**
 * Nét PHẢI có, và vì sao đúng bộ này:
 *   Be Vietnam Pro 400–800 là ĐÚNG bộ nét mà `@import` Poppins đang nạp, nên
 *   đổi họ chữ không kéo theo lệch độ đậm ở chỗ nào (đếm trong src/ +
 *   public/static/css: 700 · 349 lần, 600 · 205, 800 · 156, 500 · 45, 400 · 9).
 *   JetBrains Mono chỉ cần 400 và 700 — 700 là code nội dòng in đậm của phương
 *   án trắc nghiệm (`.optionMain code`).
 */
const NEED_WEIGHTS = {
  'Be Vietnam Pro': ['400', '500', '600', '700', '800'],
  'JetBrains Mono': ['400', '700'],
};

test('edu-fonts.css khai đúng hai họ chữ của bản thiết kế, đủ nét', () => {
  assert.ok(FACES.length > 0, 'không có @font-face nào — phông không được nạp');
  const seen = new Map();
  for (const f of FACES) {
    const family = (f.get('font-family') ?? '').replace(/['"]/g, '');
    if (!seen.has(family)) seen.set(family, new Set());
    seen.get(family).add(f.get('font-weight'));
  }
  assert.deepEqual(
    [...seen.keys()].sort(), Object.keys(NEED_WEIGHTS).sort(),
    'họ chữ khai ở edu-fonts.css phải đúng hai họ bản thiết kế chốt',
  );
  for (const [family, weights] of Object.entries(NEED_WEIGHTS)) {
    assert.deepEqual(
      [...seen.get(family)].sort(), weights,
      `${family} phải có đúng các nét ${weights.join(', ')}`,
    );
  }
});

test('mọi @font-face có font-display: swap — không có khoảng chữ trống khi tải', () => {
  const bad = FACES
    .filter((f) => f.get('font-display') !== 'swap')
    .map((f) => `${f.get('font-family')} ${f.get('font-weight')}: ${f.get('font-display') ?? 'không khai'}`);
  assert.deepEqual(bad, [], `thiếu font-display: swap:\n${bad.join('\n')}`);
});

test('mọi @font-face trỏ tới tệp .woff2 CÓ THẬT trong repo (tự lưu trữ)', () => {
  const missing = [];
  let bytes = 0;
  const files = new Set();
  for (const f of FACES) {
    const src = f.get('src') ?? '';
    assert.ok(
      !/https?:/i.test(src),
      `src còn trỏ ra ngoài repo: ${src} — phông đã chốt là tự lưu trữ`,
    );
    const url = src.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    assert.ok(url, `không đọc được src: ${src}`);
    assert.match(src, /format\('woff2'\)/, `phải khai format('woff2'): ${src}`);
    // url là tương đối với /static/css/, ví dụ ../fonts/<thư mục>/<tệp>.woff2
    assert.ok(url[1].startsWith('../fonts/'), `đường dẫn phải nằm trong /static/fonts/: ${url[1]}`);
    const abs = join(FE, 'public', 'static', url[1].replace('../', ''));
    if (!existsSync(abs)) { missing.push(url[1]); continue; }
    if (!files.has(abs)) { files.add(abs); bytes += statSync(abs).size; }
  }
  assert.deepEqual(missing, [], `tệp phông khai trong CSS mà không có trong repo:\n${missing.join('\n')}`);
  // Phanh cho chiều ngược lại: tệp nằm trong repo mà không @font-face nào dùng
  // là 20 KB chết — và dễ xảy ra khi bỏ một nét mà quên xoá tệp.
  const onDisk = [];
  for (const dir of readdirSync(join(FE, 'public', 'static', 'fonts'))) {
    for (const name of readdirSync(join(FE, 'public', 'static', 'fonts', dir))) {
      onDisk.push(join(FE, 'public', 'static', 'fonts', dir, name));
    }
  }
  assert.deepEqual(
    onDisk.filter((f) => !files.has(f)).map((f) => f.replace(FE, '')), [],
    'tệp phông trong repo mà không @font-face nào trỏ tới',
  );
  // Số đo ngày 15/10/2026: 18 tệp, 287 076 byte. Chốt một trần để không ai
  // thêm cả bộ nét chữ nghiêng (×2) mà không ai thấy.
  assert.ok(
    bytes < 420_000,
    `phông tự lưu trữ đã phình lên ${bytes} byte — bản thiết kế đòi chỉ nạp nét THẬT SỰ dùng`,
  );
});

test('--edu-font / --edu-mono đặt đúng họ chữ và CÓ chuỗi dự phòng', () => {
  const theme = stripCss(read('public', 'static', 'css', 'edu-theme.css'));
  const grab = (name) => {
    const m = theme.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
    assert.ok(m, `${name} chưa khai trong edu-theme.css`);
    return m[1].split(',').map((x) => x.trim().replace(/['"]/g, ''));
  };

  const body = grab('--edu-font');
  assert.equal(body[0], 'Be Vietnam Pro', 'họ chữ thường phải là Be Vietnam Pro');
  assert.ok(body.length >= 3, `chuỗi dự phòng của --edu-font quá ngắn: ${body.join(', ')}`);
  assert.equal(body.at(-1), 'sans-serif', '--edu-font phải kết thúc bằng họ chữ CHUNG sans-serif');

  const mono = grab('--edu-mono');
  assert.equal(mono[0], 'JetBrains Mono', 'họ chữ code phải là JetBrains Mono');
  assert.ok(mono.length >= 3, `chuỗi dự phòng của --edu-mono quá ngắn: ${mono.join(', ')}`);
  assert.equal(mono.at(-1), 'monospace', '--edu-mono phải kết thúc bằng họ chữ CHUNG monospace');

  // Poppins đã đi hẳn, và không @import phông từ Google Fonts nữa.
  assert.ok(!/Poppins/i.test(theme), 'edu-theme.css còn nhắc Poppins trong mã chạy');
  assert.ok(
    !/@import[^;]*fonts\.googleapis\.com/.test(theme),
    'edu-theme.css còn @import phông từ Google Fonts — chuỗi phụ thuộc 4 chặng đã bỏ',
  );
});

test('NỐI DÂY: PageStyles tự thêm edu-fonts.css vào MỌI trang', () => {
  const code = stripJs(read('src', 'components', 'PageStyles.tsx'));
  assert.match(
    code, /const FONTS_CSS = '\/static\/css\/edu-fonts\.css'/,
    'PageStyles không còn biết tới edu-fonts.css',
  );
  assert.match(
    code, /new Set\(\[FONTS_CSS,[\s\S]*?\]\)/,
    'edu-fonts.css phải nằm trong danh sách DÙNG CHUNG của PageStyles; liệt kê '
    + 'theo từng trang thì sót một trang là trang đó mất phông',
  );
  // Và không trang nào tự liệt kê lại — tự liệt kê nghĩa là người sau tưởng
  // phải thêm tay cho trang mới của mình.
  const offenders = [];
  for (const [path, raw] of sources()) {
    if (path.endsWith('components/PageStyles.tsx')) continue;
    if (stripJs(raw).includes('/static/css/edu-fonts.css')) offenders.push(path);
  }
  assert.deepEqual(offenders, [], `trang tự nạp edu-fonts.css (đã có ở PageStyles): ${offenders.join(', ')}`);
});

test('/ide không còn chuỗi monospace viết tay — code dùng var(--edu-mono)', () => {
  const css = stripCss(read('src', 'app', 'ide', 'ide.module.css'));
  assert.ok(
    !/font-family:\s*ui-monospace/.test(css),
    'ide.module.css còn chuỗi mono viết tay; phải đọc var(--edu-mono) để có JetBrains Mono',
  );
  assert.ok(css.includes('var(--edu-mono)'), 'ide.module.css phải dùng var(--edu-mono)');
});

/* ═══ 2 · chính tả và tên gọi ══════════════════════════════════════════ */

/**
 * File đã dọn. Thêm file vào đây khi dọn tiếp — danh sách mở rộng dần, không
 * quét cả repo: `CourseDbDesign.tsx` và các trang db_design còn "khóa chính /
 * khóa ngoại" (thuật ngữ CSDL, viết thế nào là chuyện của khoá đó).
 */
const CLEANED = [
  ['src', 'app', '(standalone)', 'courses', '[courseId]', 'CourseDetail.tsx'],
  ['src', 'app', 'ide', 'page.tsx'],
  ['src', 'app', 'ide', 'IdeClient.tsx'],
  ['src', 'app', 'home.module.css'],
  ['src', 'components', 'SiteHeader.module.css'],
];

test('file đã dọn không còn "khóa" — thống nhất một kiểu viết "khoá"', () => {
  const offenders = [];
  for (const p of CLEANED) {
    const raw = read(...p);
    for (const m of raw.matchAll(/[Kk]hóa|KHÓA/g)) {
      const line = raw.slice(0, m.index).split('\n').length;
      offenders.push(`${p.join('/')}:${line} "${m[0]}"`);
    }
  }
  assert.deepEqual(
    offenders, [],
    'bảng thuật ngữ chốt viết "khoá" (cùng kiểu với hoá/hoạ); chú thích cũng '
    + `phải theo, vì người đọc sau chép chữ từ chú thích:\n${offenders.join('\n')}`,
  );
});

test('trang khoá dùng đúng ba chuỗi đã sửa chính tả', () => {
  const cd = read('src', 'app', '(standalone)', 'courses', '[courseId]', 'CourseDetail.tsx');
  for (const s of ['Tất cả khoá học', 'Nội dung khoá học', 'Tổng quan khoá học', 'KHOÁ HỌC BAO GỒM']) {
    assert.ok(cd.includes(s), `không thấy chuỗi "${s}" — đổi chữ thì sửa cả ca test này`);
  }
});

test('trình soạn code có MỘT tên: "Bàn thí nghiệm" (kể cả tiêu đề tab)', () => {
  const page = read('src', 'app', 'ide', 'page.tsx');
  assert.match(
    page, /title:\s*'Bàn thí nghiệm – Programming EDU'/,
    'tiêu đề tab của /ide phải là "Bàn thí nghiệm" — đó là chỗ người học đọc '
    + 'tên này nhiều nhất (tab, bookmark, lịch sử)',
  );
  const offenders = [];
  for (const p of [['src', 'app', 'ide', 'page.tsx'], ['src', 'app', 'ide', 'IdeClient.tsx']]) {
    const code = stripJs(read(...p));
    // Chỉ soi CHỮ HIỆN RA: `IDE_EXAMPLES`, `/ide`, `IDE_CODE_PARAM` là định
    // danh kỹ thuật, bản thiết kế nói rõ chúng GIỮ NGUYÊN.
    for (const m of code.matchAll(/'[^']*\bIDE\b[^']*'/g)) {
      if (/^'IDE_|_IDE/.test(m[0])) continue;
      offenders.push(`${p.join('/')}: ${m[0]}`);
    }
  }
  assert.deepEqual(offenders, [], `chuỗi hiện ra còn gọi "IDE":\n${offenders.join('\n')}`);
  assert.ok(
    !stripJs(read('src', 'app', 'ide', 'IdeClient.tsx')).includes('Python IDE'),
    'IdeClient còn dựng tiêu đề "Python IDE"',
  );
});

/* ═══ 3 · curricula.json không còn khoá đã xoá ═════════════════════════ */

/**
 * Khoá đã gỡ khỏi sản phẩm. `db_design` KHÔNG có trong danh sách: cụm
 * /courses/db_design* → /lesson/db_design* → /card/<id> vẫn mở được.
 */
const GONE_COURSES = ['python', 'cpp', 'java', 'htmlcss'];

test('curricula.json không còn giáo trình/địa chỉ của khoá đã xoá', () => {
  const data = JSON.parse(read('src', 'lib', 'curricula.json'));
  const offenders = [];
  for (const id of GONE_COURSES) {
    if (data.CURRICULA[id]) offenders.push(`CURRICULA.${id}`);
    if (data.LESSON_URLS[id]) offenders.push(`LESSON_URLS.${id}`);
  }
  assert.deepEqual(
    offenders, [],
    'khoá này đã gỡ khỏi danh mục và route của nó cũng đã xoá; để lại trong '
    + `curricula.json là LESSON_URLS trỏ tới trang 404:\n${offenders.join('\n')}`,
  );
  // Phanh: khoá đang chạy và cụm db_design phải còn.
  assert.ok(data.CURRICULA.python_advanced, 'mất giáo trình python_advanced');
  assert.equal(data.LESSON_URLS.python_advanced, '/lesson/python_advanced');
  assert.ok(data.CURRICULA.db_design, 'db_design vẫn còn trang nên phải còn giáo trình');
});

test('việc dọn nằm Ở SCRIPT sinh file, không phải sửa tay JSON', () => {
  const py = readFileSync(join(ROOT, 'scripts', 'pe-v4', 'sync_curricula.py'), 'utf8');
  const m = py.match(/DROPPED_COURSES\s*=\s*\(([^)]*)\)/);
  assert.ok(m, 'sync_curricula.py không còn danh sách khoá cần dọn');
  const listed = [...m[1].matchAll(/'([\w-]+)'/g)].map((x) => x[1]);
  assert.deepEqual(
    listed.sort(), [...GONE_COURSES].sort(),
    'curricula.json do script sinh ra: dọn ở JSON mà không dọn ở script thì '
    + 'lần `py scripts/pe-v4/sync_curricula.py` sau kéo dữ liệu chết về',
  );
});

/* ═══ 4 · chú thích bài cửa nêu đúng mã bài ════════════════════════════ */

/** Mã bài có cửa tự kiểm tra, đọc từ CHÍNH dữ liệu đang seed vào DB. */
function gateCodes() {
  const dir = join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons');
  const out = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const lesson = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    if (lesson.content_json?.step_4?.gate) out.push(lesson.lesson_code);
  }
  return out;
}

test('chú thích `gate` nêu đúng các bài cửa của khoá ĐANG CHẠY', () => {
  const codes = gateCodes();
  // Chốt con số: nếu bản dựng pe-v4 đổi số bài cửa thì ca này phải trượt để
  // người sửa đi cập nhật chú thích, không âm thầm đi qua.
  assert.deepEqual(
    codes, ['R02', 'DA01', 'DA02'],
    'số bài cửa trong scripts/pe-v4/out-advanced đã đổi — sửa cả chú thích ở '
    + 'src/lib/studio-lesson.ts',
  );

  const src = read('src', 'lib', 'studio-lesson.ts');
  const at = src.indexOf('gate?: boolean');
  assert.ok(at > 0, 'không còn trường `gate` trong Step4');
  // Chú thích của trường `gate` là khối ngay TRƯỚC khai báo.
  const docStart = src.lastIndexOf('/**', at);
  const doc = src.slice(docStart, at);
  for (const code of codes) {
    assert.ok(doc.includes(code), `chú thích của trường gate không nêu bài cửa ${code}`);
  }
  // Năm mã của khoá `python` CƠ BẢN (đã xoá) không được còn ở đây: danh sách
  // mã không trỏ tới bài nào khiến người đọc sau đi tìm nhầm chỗ.
  for (const old of ['B20', 'I07', 'I12', 'N04', 'N08']) {
    assert.ok(
      !doc.includes(old),
      `chú thích của trường gate còn mã ${old} của khoá python cơ bản đã xoá`,
    );
  }
});

/* ── tiện ích dùng chung ───────────────────────────────────────────────── */

/** Mọi file nguồn của frontend (ts/tsx/css). */
function sources(dir = join(FE, 'src'), out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { sources(full, out); continue; }
    if (/\.(ts|tsx|css)$/.test(name)) {
      out.push([full.replace(FE, '').replace(/\\/g, '/').replace(/^\//, ''), readFileSync(full, 'utf8')]);
    }
  }
  return out;
}

/**
 * ── BẰNG CHỨNG BẮT ĐƯỢC LỖI THẬT ──────────────────────────────────────
 * Đo ngày 15/10/2026. KHÔNG dùng `git stash` / `git checkout <thư mục>`: có
 * agent khác làm trong cùng cây làm việc. Cách đo: sao lưu từng tệp ra ngoài,
 * `git show HEAD:<tệp> > <tệp>` cho đúng tệp đó, chạy `npm run test:unit`, rồi
 * đưa bản sửa về chỗ. Con số là số CA trượt trên tổng 366 ca.
 *
 *   gỡ bản sửa                                                 → ca trượt
 *   ───────────────────────────────────────────────────────────────────────
 *   edu-theme.css về HEAD (Poppins + @import Google Fonts,
 *   không có --edu-mono)                                        → 1
 *     "--edu-font / --edu-mono đặt đúng họ chữ và CÓ chuỗi dự phòng"
 *
 *   xoá hẳn public/static/css/edu-fonts.css                     → 1
 *     Cả FILE test này không nạp được (read() ném ENOENT ở mức module), nên
 *     12 ca ở đây không chạy. Ồn hơn một ca trượt gọn, nhưng không im lặng.
 *
 *   PageStyles.tsx về HEAD (không nạp edu-fonts.css toàn cục)   → 1
 *     "NỐI DÂY: PageStyles tự thêm edu-fonts.css vào MỌI trang"
 *
 *   home.module.css + SiteHeader.module.css về HEAD
 *   (bảng xanh dương --edu-*)                                   → 5
 *     "không còn đọc token màu của bảng cũ" · "NỐI DÂY … load-bearing" ·
 *     "không hạ ĐỘ ĐỤC" (vạch chân header cũ dùng `opacity: .35`) ·
 *     "tương phản AA — bản ngày của trang chủ" · "… bản Ban đêm"
 *
 *   CourseDetail.tsx + ide/page.tsx + ide.module.css +
 *   studio-lesson.ts về HEAD                                    → 5
 *     "/ide không còn chuỗi monospace viết tay" · 'không còn "khóa"' ·
 *     "ba chuỗi đã sửa chính tả" · '"Bàn thí nghiệm" kể cả tiêu đề tab' ·
 *     "chú thích gate nêu đúng các bài cửa"
 *
 *   curricula.json + sync_curricula.py về HEAD                  → 2
 *     "curricula.json không còn … khoá đã xoá" · "việc dọn nằm Ở SCRIPT"
 *
 *   dựng lại chatbot.css + ba dòng nạp nó                       → 2
 *     (ca của dead-routes.test.mjs) "file JS/CSS legacy không còn trang nào
 *     nạp đã xoá" · "src/** không còn nạp … asset đã xoá"
 *
 * Hai điều học được từ lượt đo, ghi lại vì chúng là lý do danh sách ca có
 * hình dạng hiện tại:
 *  1. Ca "tệp .woff2 CÓ THẬT trong repo" là ca duy nhất bắt được lỗi khai sai
 *     ĐƯỜNG DẪN — và đó là lỗi nguy hiểm nhất của phông tự lưu trữ, vì trình
 *     duyệt im lặng dùng phông dự phòng và trang vẫn "có chữ".
 *  2. Ca chính tả phải soi CẢ CHÚ THÍCH, không chỉ chuỗi hiện ra: lượt đo đầu
 *     trượt ở `IdeClient.tsx:8` ("KHÔNG phải khóa học" trong chú thích đầu
 *     file). Người đọc sau chép chữ từ chú thích, nên sai ở đó thì lan ra.
 */
