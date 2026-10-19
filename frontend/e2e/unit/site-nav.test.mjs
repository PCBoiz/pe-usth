/**
 * Thanh điều hướng — và luật chống TRANG MỒ CÔI.
 *
 * ===========================================================================
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 * ===========================================================================
 *  - "mọi route đứng một mình đều có lối vào" là ca chính, và nó canh đúng
 *    cái lỗ đã để `/practice` + `/practice/challenge` sống mồ côi: dựng xong,
 *    hơn 30 ca test, mà grep cả `src` lẫn `public` thì mọi liên kết tới
 *    `/practice` đều xuất phát từ CHÍNH `/practice`. Mọi ca cũ kiểm NỘI DUNG
 *    của màn; không ca nào hỏi "có đường nào tới màn không".
 *  - "ẩn Bàn thí nghiệm cùng lúc với thẻ công cụ" trượt nếu hai chỗ lệch cờ —
 *    thanh trên dẫn tới một trang mà trang chủ bảo là không có.
 *  - "mục đang mở nói được cho trình đọc màn hình" trượt nếu `aria-current`
 *    bị gỡ: tô đậm bằng CSS chỉ nói cho người NHÌN THẤY.
 *  - "`/` không khớp mọi đường" trượt nếu `isCurrent` đổi sang `startsWith`
 *    cho mục trang chủ — lúc đó mục nào cũng sáng.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { isCurrent, navItems } from '../../src/lib/site-nav.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

const HEADER = read('src', 'components', 'SiteHeader.tsx');

/** Mọi route có `page.tsx`, quy về đường dẫn URL. */
function routes(dir, prefix = '', out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    // `(nhóm)` không tạo phân đoạn URL; `[tham số]` là route động.
    const seg = /^\(.*\)$/.test(name) ? '' : `/${name}`;
    const url = `${prefix}${seg}`;
    if (readdirSync(p).includes('page.tsx')) out.push(url || '/');
    routes(p, url, out);
  }
  return out;
}

const ROUTES = routes(join(FE, 'src', 'app'));

/**
 * Route XEM THỬ của một bản thiết kế chưa dựng xong — cố ý KHÔNG có lối vào.
 *
 * Luật chống trang mồ côi tồn tại vì "một tính năng không có đường vào thì
 * bằng không". Ở đây ngược lại: đưa một bản MẪU chưa xong lên thanh điều
 * hướng là đẩy nó cho người học xem như thể nó đã là sản phẩm. Nên ngoại lệ
 * phải (a) có tên viết ra ở đây kèm lý do, và (b) khai `robots: noindex` —
 * ca dưới canh điều kiện (b), để một trang lọt vào danh sách này không đồng
 * thời lọt vào Google.
 *
 * Dựng xong tám chòm thì bản đồ sao THAY bản đồ vực ở trang chủ, và dòng này
 * bị xoá chứ không được đổi thành một mục trên thanh trên.
 */
const XEM_THU = ['/ban-do-sao'];

test('mọi route đứng một mình đều có lối vào từ thanh trên', () => {
  // Route động (`[courseId]`) tới từ danh sách bài/khoá, không cần mục riêng.
  // `/practice/challenge` tới từ `/practice`, nên chỉ cần gốc có lối vào.
  const canLoiVao = ROUTES.filter(
    (r) => r !== '/' && !r.includes('[') && !r.split('/').slice(2).length
      && !XEM_THU.includes(r),
  );
  assert.ok(canLoiVao.length > 0, 'không đọc được route nào — hàm quét hỏng');

  const coTrenThanh = new Set(navItems(true).map((i) => i.href));
  const moCoi = canLoiVao.filter((r) => !coTrenThanh.has(r));
  assert.deepEqual(
    moCoi,
    [],
    'route không có lối vào nào từ thanh trên — một tính năng không có đường '
      + 'vào thì bằng không:\n' + moCoi.join('\n'),
  );
});

test('route xem thử phải tự khai `noindex` — miễn lối vào thì cũng miễn Google', () => {
  assert.ok(XEM_THU.length > 0, 'danh sách rỗng mà ca này vẫn xanh thì nó vô dụng');
  for (const r of XEM_THU) {
    assert.ok(ROUTES.includes(r), `${r} không còn tồn tại — xoá nó khỏi XEM_THU`);
    const src = read('src', 'app', ...r.slice(1).split('/'), 'page.tsx');
    assert.match(
      src,
      /robots:\s*\{[^}]*index:\s*false/,
      `${r} được miễn lối vào từ thanh trên nhưng không khai \`robots: { index: false }\` —`
      + ' một bản mẫu chưa xong lọt vào kết quả tìm kiếm là đúng thứ ngoại lệ này né',
    );
  }
});

test('ẩn "Bàn thí nghiệm" cùng lúc với thẻ công cụ ở trang chủ', () => {
  assert.ok(navItems(true).some((i) => i.href === '/ide'));
  assert.ok(!navItems(false).some((i) => i.href === '/ide'));
  // Và thanh trên phải đọc CHÍNH cờ mà `catalog.TOOLS` đọc.
  const co = /NEXT_PUBLIC_IDE_ENABLED/;
  assert.match(HEADER, co, 'thanh trên không đọc cờ bật/tắt Bàn thí nghiệm');
  assert.match(read('src', 'lib', 'catalog.ts'), co);
});

test('mục đang mở nói được cho trình đọc màn hình, không chỉ cho mắt', () => {
  assert.match(HEADER, /aria-current=\{current \? 'page' : undefined\}/);
});

test('"/" chỉ khớp đúng trang chủ, không khớp mọi đường', () => {
  const [home, practice] = navItems(true);
  assert.equal(isCurrent(home, '/'), true);
  assert.equal(isCurrent(home, '/practice'), false);
  assert.equal(isCurrent(practice, '/practice'), true);
  // Màn con vẫn sáng mục cha — người học đang ở trong khu vực đó.
  assert.equal(isCurrent(practice, '/practice/challenge'), true);
  // Nhưng không được khớp một route chỉ TRÙNG TIỀN TỐ chữ.
  assert.equal(isCurrent(practice, '/practice-abc'), false);
});
