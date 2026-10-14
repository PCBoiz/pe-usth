/**
 * Mọi chú thích dẫn tới bản thiết kế phải dẫn tới một file CÓ THẬT.
 *
 * ===========================================================================
 * VÌ SAO CÓ CA NÀY
 * ===========================================================================
 * Trong repo có 19 chỗ chú thích viện dẫn `design/project/*.dc.html` và
 * `design-system-v2.md` như thể mở ra là đọc được. Suốt một thời gian thì
 * KHÔNG: hai thứ đó nằm trong thư mục tạm của phiên làm việc, không được
 * commit, nên ai clone repo về cũng không tìm thấy — và thư mục tạm thì bị
 * dọn.
 *
 * Một lượt soát đã kết luận từ đó rằng chú thích "giả vờ có nguồn". Kết luận
 * đó SAI, và cái sai đắt: vì tin nó, suýt có bản sửa hạ cỡ tiêu đề 44 → 36px
 * cho "đúng thang", trong khi 44 LÀ token `h1` của chính bản thiết kế
 * (`design-system-v2.md:161`) — sửa thế là đi XA bản thiết kế hơn hiện trạng.
 *
 * Nên bản sửa không phải gỡ chú thích, mà là commit tài liệu vào repo. Ca này
 * giữ cho hai thứ đi cùng nhau: thêm một chú thích dẫn tới artboard chưa
 * commit ⇒ đỏ; xoá tài liệu mà bỏ sót chú thích ⇒ cũng đỏ.
 *
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 *  - "mọi đường dẫn thiết kế đều phân giải được" trượt nếu `design/` hoặc
 *    `design-system-v2.md` lại biến khỏi repo, hoặc nếu ai dẫn tới một
 *    artboard không tồn tại.
 *  - "có chú thích nào dẫn thì mới cần tài liệu" giữ chiều ngược: nếu không
 *    còn chú thích nào dẫn tới bản thiết kế thì ca này nhắc rằng bộ tài liệu
 *    đang nằm đó mà không ai nối vào — lúc đó quyết định giữ hay bỏ là của
 *    chủ sản phẩm, nhưng không được im lặng.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');

const SCAN_ROOTS = [
  join(REPO, 'frontend', 'src'),
  join(REPO, 'frontend', 'e2e'),
  join(REPO, 'scripts'),
];
const EXTS = /\.(ts|tsx|css|mjs|js|py)$/;
const SKIP = new Set(['node_modules', '.next', 'out', 'out-advanced', '__pycache__', 'generated']);

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (EXTS.test(name)) acc.push(p);
  }
  return acc;
}

const FILES = SCAN_ROOTS.flatMap((r) => walk(r));

/** Mọi lượt dẫn: [file dẫn, đường dẫn được dẫn]. */
const REFS = [];
for (const f of FILES) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/design\/project\/[A-Za-z0-9_-]+\.dc\.html/g)) {
    REFS.push([relative(REPO, f), m[0]]);
  }
  if (/design-system-v2\.md/.test(src)) REFS.push([relative(REPO, f), 'design-system-v2.md']);
}

test('mọi đường dẫn thiết kế trong chú thích đều phân giải được', () => {
  const thieu = [];
  for (const [from, ref] of REFS) {
    if (!existsSync(join(REPO, ref))) thieu.push(`${from} → ${ref}`);
  }
  assert.deepEqual(
    thieu,
    [],
    'chú thích dẫn tới tài liệu thiết kế không có trong repo:\n  ' + thieu.join('\n  '),
  );
});

test('có chú thích nào dẫn thì mới cần bộ tài liệu nằm đây', () => {
  assert.ok(REFS.length > 0, 'không còn chú thích nào dẫn tới bản thiết kế — bộ tài liệu '
    + 'trong design/ đang không được nối vào code, quyết định giữ hay bỏ là của chủ sản phẩm');
  // Hai thứ bắt buộc, vì chúng là nguồn của các thang token.
  assert.ok(existsSync(join(REPO, 'design-system-v2.md')));
  assert.ok(existsSync(join(REPO, 'design/project/Main.dc.html')));
});

test('design-system-v2.md còn mang các thang mà code viện dẫn', () => {
  const doc = readFileSync(join(REPO, 'design-system-v2.md'), 'utf8');
  // Thang bo góc 6 bậc, thang chuyển động 3 bậc, và token h1 = 44px: đúng ba
  // thứ mà một lượt soát từng tưởng là số bịa trong CSS.
  for (const token of ['`r-xs`', '`r-sm`', '`r-md`', '`r-lg`', '`r-pill`', '`r-round`']) {
    assert.ok(doc.includes(token), `thiếu ${token} trong thang bo góc`);
  }
  assert.match(doc, /200 \/ 320 \/ 450 ms/, 'thiếu thang chuyển động 3 bậc');
  assert.match(doc, /\|\s*`h1`\s*\|\s*44\b/, 'token h1 không còn là 44px — đọc lại mọi cỡ tiêu đề');
});
