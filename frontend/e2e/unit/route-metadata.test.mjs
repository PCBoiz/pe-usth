/**
 * Unit test NỐI DÂY: `metadata` của MỌI route, không chỉ của layout gốc.
 *
 * Vì sao phải có, và nó không phải một ca "cho đủ bộ". Một chuỗi sai trong
 * `metadata` là chuỗi KHÓ THẤY NHẤT trong cả sản phẩm: nó không làm vỡ build,
 * không đỏ test nào, không hiện ra khi mở trang, và chỗ nó hiện ra — dòng
 * Google in dưới liên kết — là chỗ lâu nhất mới sửa được (phải chờ Google quét
 * lại). Repo này đã trả giá đúng một lần: câu "Python, Java, HTML/CSS và thiết
 * kế cơ sở dữ liệu" ở `app/layout.tsx` quảng cáo hai khoá bị XOÁ ở `9bc42c1`
 * (route trả 404) và sống qua cả đợt xoá 124 file.
 *
 * Bản sửa lần đó tách câu sang `lib/seo-copy.ts` và viết `seo-copy.test.mjs`.
 * Nhưng lượt kiểm chính phần kiểm tra (15/10/2026) chứng minh lưới đó chỉ phủ
 * MỘT route: đổi `description` của `/lesson/python_advanced` thành "Advanced
 * Python, Java, HTML/CSS: 40 bài" → **mọi ca vẫn XANH**. Tức lỗi cũ chỉ cần
 * đổi chỗ trú sang một `page.tsx` khác là đi qua được toàn bộ bộ test. Ca này
 * lấy BỀ MẶT là tất cả `page.tsx`/`layout.tsx`, và áp đúng bảng cấm của
 * `ds-wording.test.mjs`, cộng một luật riêng của `metadata`: KHÔNG viết cứng
 * số bài — số bài phải đếm từ `curricula.json`.
 *
 * Mọi phép so dưới đây TỰ KIỂM trên chuỗi THẬT đã từng ở trong repo (hoặc
 * trên chuỗi mà lượt kiểm đã nhồi vào và thấy lọt), để không có ca nào xanh
 * trong khi câu sai còn nguyên.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lessonSeoDescription, seoDescription } from '../../src/lib/seo-copy.ts';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

/** Bỏ chú thích: chính các chú thích giải thích "vì sao bỏ Boss" chứa từ cấm. */
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/[ \t]+\/\/.*$/gm, '');
}

function walk(dir, out = []) {
  for (const e of readdirSync(join(FE, ...dir), { withFileTypes: true })) {
    if (e.isDirectory()) walk([...dir, e.name], out);
    else if (/^(page|layout)\.tsx$/.test(e.name)) out.push([...dir, e.name]);
  }
  return out;
}

/**
 * Bóc khối `metadata` ra khỏi một file.
 *
 * Hai dạng Next hỗ trợ, cả hai đều phải soi: `export const metadata = {…}` và
 * `export [async] function generateMetadata(…) {…}` (trang khoá dùng dạng sau
 * vì tên khoá chỉ biết sau khi có `params`). Cắt theo dấu đóng ở CỘT 0 — cả
 * repo đi qua eslint nên thân cấp trên cùng luôn đóng ở đó; nếu một ngày không
 * còn vậy, ca "bề mặt" dưới đây đỏ trước khi ca nào xanh oan.
 */
function metadataBlocks(code) {
  const out = [];
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const mo = /^export (?:const metadata\b|(?:async )?function generateMetadata\b)/.exec(lines[i]);
    if (!mo) continue;
    const dong = /^export const metadata\b/.test(lines[i]) ? '};' : '}';
    let j = i + 1;
    while (j < lines.length && lines[j] !== dong) j += 1;
    out.push(lines.slice(i, Math.min(j + 1, lines.length)).join('\n'));
    i = j;
  }
  return out;
}

/** Mọi chuỗi trong một khối, đã chuẩn hoá NFC + gộp khoảng trắng. */
function literals(block) {
  const out = [];
  for (const m of block.matchAll(/(['"`])((?:[^\\\n]|\\.)*?)\1/g)) {
    const s = m[2].normalize('NFC').replace(/[^\S\n]+/g, ' ');
    if (s.trim()) out.push(s);
  }
  return out;
}

/** [đường dẫn, khối, chuỗi trong khối] cho cả bề mặt. */
const ROUTES = walk(['src', 'app'])
  .map((p) => [p.join('/'), metadataBlocks(codeOnly(read(...p)))])
  .filter(([, blocks]) => blocks.length > 0)
  .map(([path, blocks]) => [path, blocks.join('\n'), blocks.flatMap(literals)]);

/** Giáo trình THẬT — cùng file mà trang khoá và danh mục đọc. */
const CURRICULA = JSON.parse(read('src', 'lib', 'curricula.json')).CURRICULA;
const TONG_BAI = CURRICULA.python_advanced.modules
  .reduce((n, m) => n + m.lessons.length, 0);

/* ── 0 · bề mặt phải còn đó ───────────────────────────────────────────── */

test('bề mặt quét là MỌI route có metadata, không phải riêng layout gốc', () => {
  /* Ca này đứng trước mọi ca khác vì nó canh chính cái lưới: một ca "không tìm
     thấy chuỗi cấm" trên bề mặt RỖNG cũng xanh, và đó là cách lưới chết mà
     không ai biết. Bảy route hiện có, đếm bằng
     `grep -rln "export const metadata\|generateMetadata" src/app`. */
  const paths = ROUTES.map(([p]) => p).sort();
  assert.ok(paths.length >= 7, `chỉ bóc được ${paths.length} route có metadata: ${paths.join(', ')}`);
  for (const must of [
    'src/app/layout.tsx',
    'src/app/(standalone)/lesson/python_advanced/page.tsx',
    'src/app/(standalone)/courses/[courseId]/page.tsx',
    'src/app/ide/page.tsx',
    'src/app/(standalone)/practice/page.tsx',
    'src/app/(standalone)/practice/challenge/page.tsx',
  ]) {
    assert.ok(paths.includes(must), `không bóc được metadata của ${must}`);
  }
  // Và mỗi khối phải thật sự có chữ, không phải một khối rỗng bóc lỗi.
  for (const [path, , lits] of ROUTES) {
    assert.ok(lits.length > 0, `bóc được khối metadata của ${path} mà không có chuỗi nào`);
  }
});

/* ── 1 · bảng cấm, đúng bảng của ds-wording ───────────────────────────── */

/**
 * Mỗi dòng: [mẫu, vì sao, chuỗi THẬT dùng để tự kiểm phép so].
 *
 * Chuỗi tự kiểm lấy từ lịch sử repo hoặc từ lượt kiểm đã nhồi vào và thấy
 * LỌT — không bịa ra một chuỗi dễ bắt.
 */
const CAM = [
  [/⚔️|\bBoss\b|\bBOSS\b/,
    'Bảng thuật ngữ chốt "bài tổng hợp chặng"; ẩn dụ đánh trận trái triết lý tự học.',
    'Advanced Python: 48 bài — ghép cặp, dò lỗi và trận Boss cuối chặng.'],
  [/\btrận\b/i,
    'Cùng lý do: không đánh trận. Chuỗi này vào cả kết quả tìm kiếm.',
    'ghép cặp, dò lỗi và trận Boss cuối chặng'],
  [/🔥|chuỗi ngày|ngày liên tiếp/i,
    'Chuỗi bị ĐỨT là thứ đẩy người học bỏ cuộc; bản thiết kế đã gỡ.',
    'Giữ chuỗi 7 ngày liên tiếp để không mất tiến độ 🔥'],
  [/hoàn thành/i,
    'Bảng thuật ngữ: "đã xong"; "hoàn thành" chỉ dùng cho tên trường dữ liệu.',
    'Nhận chứng chỉ hoàn thành khoá học'],
  [/khóa|Khóa/,
    'Chính tả thống nhất "khoá" (cùng kiểu hoá/hoạ).',
    'Khóa học Python online'],
  [/nhé(?!\p{L})/iu,
    'Giọng đã chốt: dẫn đường bình thản, không dỗ dành.',
    'Vào học thử nhé!'],
  [/\bIDE\b/,
    'Bảng thuật ngữ: "Bàn thí nghiệm", không dùng "IDE / Python IDE / Sandbox IDE".',
    'Python IDE trực tuyến – Programming EDU'],
  [/sandbox/i,
    '"sandbox" là từ của người viết code; nói "môi trường cách ly" và nói thẳng '
    + 'mã chạy trên máy chủ. Đây là CHUỖI ĐÃ SỬA THẬT ở `/ide` (12643ee).',
    'Viết và chạy thử mã Python ngay trên trang, chạy trong sandbox cách ly trên máy chủ.'],
  [/\bJava\b|HTML\s*\/\s*CSS|thiết kế cơ sở dữ liệu/i,
    'Java, HTML/CSS và db_design KHÔNG nằm trong danh mục (lib/catalog.ts chỉ còn '
    + 'python_advanced + công cụ /ide); route của chúng trả 404. Mời người ta vào '
    + 'một thứ không tồn tại, ở chỗ đông người đọc nhất.',
    'Học Python, Java, HTML/CSS và thiết kế cơ sở dữ liệu'],
  [/(?:\d|\}) (?:module|bài học)\b/,
    'Bảng thuật ngữ: khoá → chặng → bài → màn. "module" là từ của người viết code, '
    + 'và "bài học" làm đơn vị đếm là cách gọi thứ hai cho cùng một thứ.',
    'Advanced Python: 8 module · 48 bài học'],
  [/\bChấm điểm\b|\bĐừng sai\b|Tuyệt vời|Xuất sắc/i,
    'Không mùi thi cử, không reo hộ người học.',
    'Nộp & Chấm điểm — Tuyệt vời!'],
  [/\b\d(?:[.,]\d)?\s*\/\s*5\b|\b\d[.,]\d\s*(?:sao|⭐)/,
    'Điểm sao viết cứng là số liệu bịa — `rating: 4.8` đã gỡ ở a04c3cf.',
    'Khoá được học viên chấm 4.8/5'],
];

for (const [mau, viSao, tuKiem] of CAM) {
  test(`metadata của mọi route: ${viSao.slice(0, 56)}…`, () => {
    // (a) phép so có bắt được chuỗi thật không — tự kiểm TRƯỚC.
    assert.ok(
      mau.test(tuKiem.normalize('NFC')),
      `phép so không bắt nổi chuỗi cũ: ${tuKiem}`,
    );
    // (b) rồi mới đem soi bề mặt.
    const found = [];
    for (const [path, , lits] of ROUTES) {
      for (const s of lits) if (mau.test(s)) found.push(`${path}: ${s.slice(0, 110)}`);
    }
    assert.deepEqual(found, [], `${viSao}\n${found.join('\n')}`);
  });
}

/* ── 2 · số bài KHÔNG viết cứng, phải đếm từ curricula.json ───────────── */

test('metadata không viết cứng số bài — đếm từ curricula.json', () => {
  /* Lỗi thật đã sửa 15/10/2026: `/lesson/python_advanced/page.tsx` ghi
     'Advanced Python: 48 bài luyện tập…' thẳng trong `metadata`. Lượt kiểm đo
     được: đổi "48" thành "40" (đúng con số CŨ của pe-v3) → mọi ca XANH. Đây là
     bẫy "hai nguồn danh sách bài" trong AGENTS.md, ở chỗ im lặng nhất.

     Mẫu chỉ tính CON SỐ đứng ngay trước chữ "bài" — "khoảng 3 phút" hay
     "sai lần đầu được nghĩ lại một lần" không bị tính. */
  const CUNG = /\b\d+\s*bài\b/;
  assert.ok(CUNG.test('Advanced Python: 48 bài luyện tập — ghép cặp'), 'mẫu không bắt nổi chuỗi cũ');
  assert.ok(!CUNG.test('Ôn lại những câu bạn đã làm trong khoá'), 'mẫu bắt lầm câu không có số');

  const found = [];
  for (const [path, , lits] of ROUTES) {
    for (const s of lits) if (CUNG.test(s)) found.push(`${path}: ${s.slice(0, 110)}`);
  }
  assert.deepEqual(
    found, [],
    'Số bài phải TRUYỀN VÀO từ danh mục (vốn đếm từ curricula.json), không gõ '
    + `vào metadata. Giáo trình hiện có ${TONG_BAI} bài.\n${found.join('\n')}`,
  );
});

test('con số thật sự tới metadata là con số của curricula.json', () => {
  /* Không viết cứng là một nửa; nửa còn lại là con số CHẠY RA có đúng không.
     Hai route in số bài, cả hai đi qua `lib/seo-copy.ts` với số lấy từ danh
     mục. Ca này đọc giáo trình, gọi chính hai hàm đó, và đòi con số hiện ra. */
  assert.equal(TONG_BAI, 48, `giáo trình nay có ${TONG_BAI} bài — đọc lại AGENTS.md rồi sửa mốc`);
  for (const f of [seoDescription, lessonSeoDescription]) {
    assert.ok(f(TONG_BAI).includes(`${TONG_BAI} bài`), 'câu mô tả không in ra số bài');
    // Danh mục chưa đọc được ⇒ "nhiều bài", KHÔNG in "0 bài" và không bịa số.
    assert.ok(f(0).includes('nhiều bài'), 'lessonCount ≤ 0 phải thành "nhiều bài"');
    assert.ok(!/\d/.test(f(0)), `vẫn còn một con số khi chưa đọc được giáo trình: ${f(0)}`);
  }
  // Và hai route phải LẤY từ danh mục, không gọi hàm với một số gõ tay.
  for (const p of [
    ['src', 'app', 'layout.tsx'],
    ['src', 'app', '(standalone)', 'lesson', 'python_advanced', 'page.tsx'],
  ]) {
    const code = codeOnly(read(...p));
    assert.match(
      code,
      /SeoDescription\(findCourse\('python_advanced'\)\?\.lessons \?\? 0\)|seoDescription\(findCourse\('python_advanced'\)\?\.lessons \?\? 0\)/,
      `${p.join('/')} không lấy số bài từ danh mục`,
    );
  }
});

/**
 * ── BẰNG CHỨNG BẮT ĐƯỢC LỖI THẬT ──────────────────────────────────────
 * Đo ngày 15/10/2026, dựng lại NGUYÊN VĂN chuỗi cũ rồi chạy
 * `node --test e2e/unit/route-metadata.test.mjs`, phục hồi ngay sau đó.
 *
 * Phép thử là đúng chuỗi mà lượt kiểm trước đã nhồi vào và thấy LỌT qua cả 9
 * file test: `description` của `/lesson/python_advanced` đổi thành
 *   'Advanced Python, Java, HTML/CSS: 40 bài luyện tập — ghép cặp, đúng/sai,
 *    dò lỗi và trận Boss cuối chặng, chạy trong sandbox trên máy chủ.'
 * → **6 ca TRƯỢT**: "Boss", "trận", "sandbox", "Java / HTML/CSS / db_design",
 *   "không viết cứng số bài", và "con số thật sự tới metadata".
 *
 * Và dựng lại riêng câu cũ đúng nguyên văn trước commit này
 *   'Advanced Python: 48 bài luyện tập — ghép cặp, đúng/sai, dò lỗi và bài
 *    tổng hợp cuối chặng, chấm ngay trong trình duyệt.'
 * → **2 ca TRƯỢT**: "không viết cứng số bài" và "con số thật sự tới metadata".
 *   Con số trong câu đó ĐÚNG — nhưng nó là bản chép tay của một con số có
 *   nguồn, đúng bẫy "hai nguồn danh sách bài", nên ca vẫn phải đỏ.
 *
 * ── CHỖ CA NÀY KHÔNG VỚI TỚI ──────────────────────────────────────────
 * `generateMetadata` của `/courses/[courseId]` trả `description:
 * course.description`, tức một BIẾN — không có chuỗi nào ở đây để soi. Chuỗi
 * thật nằm ở `lib/catalog.ts` và được `home-page.test.mjs` +
 * `catalog-naming.test.mjs` canh. Nếu một ngày route đó quay về viết chuỗi
 * thẳng vào `metadata` thì bảng cấm trên đây bắt được ngay; còn đổi NGUỒN thì
 * phải đỏ ở hai file kia.
 */
