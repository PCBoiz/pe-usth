/**
 * MỌI LIÊN KẾT NỘI BỘ trong `src/` phải trỏ tới một trang CÓ THẬT.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: đo trên production 04/11/2026 —
 *  · mục "Ôn tập" ở thanh trên của MỌI trang dẫn tới `/practice` → 404;
 *  · màn "Ôn tập" trong cảnh Góc học, với người đã xong 2 bài, nói "Rồi… đủ
 *    để sinh một đề ôn" rồi đưa nút "Mở trang Ôn tập" → cùng trang 404.
 * Trang `/practice` bị gỡ ở 070886a (22/10). Hai liên kết quay lại ở 4d5f86d
 * (bê giao diện từ nhánh `test`): bê LỐI VÀO mà không bê TRANG.
 *
 * Đây là chiều ngược của lỗi thống trị repo này ("dựng xong mà không có đường
 * tới"): một đường tới mà không có gì dựng ở cuối. `check-duong-toi` và
 * `check-tai-nguyen-chet` đều canh chiều xuôi, nên cả hai xanh suốt lúc này.
 *
 * Phép so: route = mọi `page|route.(tsx|ts|js)` dưới `src/app` (bỏ thư mục
 * nhóm `(…)`, `[đoạn]` khớp một đoạn bất kỳ); tệp tĩnh = có trong `public/`.
 * `${…}` trong template literal tính là một đoạn động.
 *
 * GIỚI HẠN: chỉ bắt liên kết viết thành CHUỖI nằm ngay sau `href`/`push`/…;
 * một URL dựng qua biến trung gian thì phép quét không thấy. Sàn số liên kết ở
 * ca đầu chặn trường hợp phép quét hỏng rồi xanh vì không xét gì.
 *
 * ABLATION — gỡ từng mảnh rồi đếm:
 *   trả mục `/practice` vào site-nav.ts               → 1 đỏ
 *   trả nút href="/practice" vào engine.js            → 1 đỏ
 *   phép khớp route luôn trả true                     → 1 đỏ
 *   phép quét hỏng (regex không bắt gì)                → 1 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(FE, 'src');
const APP = join(SRC, 'app');
const PUBLIC = join(FE, 'public');

/** Mọi tệp dưới `goc` thoả `loc`. */
function tep(goc, loc) {
  const out = [];
  const di = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) di(p);
      else if (loc(e.name)) out.push(p);
    }
  };
  di(goc);
  return out;
}

/** Route có thật: '/', '/ide', '/courses/[courseId]'… */
const ROUTES = tep(APP, (n) => /^(page|route)\.(tsx|ts|js)$/.test(n)).map((p) => {
  const doan = relative(APP, dirname(p)).split(sep).filter((s) => s && !/^\(.*\)$/.test(s));
  return '/' + doan.join('/');
});

/** Đường dẫn `u` có khớp một route có thật không. */
function khopRoute(u, routes = ROUTES) {
  const segs = u.split('/').filter(Boolean);
  return routes.some((r) => {
    const rs = r.split('/').filter(Boolean);
    if (rs.some((s) => /^\[\.\.\..*\]$/.test(s))) {
      const dau = rs.findIndex((s) => /^\[\.\.\..*\]$/.test(s));
      return segs.length >= dau + 1 && rs.slice(0, dau).every((s, i) => /^\[.*\]$/.test(s) || s === segs[i]);
    }
    return rs.length === segs.length && rs.every((s, i) => /^\[.*\]$/.test(s) || s === segs[i]);
  });
}

/** Bỏ chú thích khối và dòng chú thích — chú thích được phép NHẮC tới trang đã gỡ. */
const boChuThich = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((d) => !/^\s*(\/\/|\*)/.test(d))
    .join('\n');

const BO_QUA = /^\/(api|static|_next|pyodide)(\/|$)/;

/** Mọi liên kết nội bộ viết thành chuỗi trong src/. */
function lienKet() {
  const out = [];
  for (const p of tep(SRC, (n) => /\.(tsx|ts|jsx|js|mjs)$/.test(n))) {
    const s = boChuThich(readFileSync(p, 'utf8').replace(/\r/g, ''));
    const re = /(?:\bhref\s*[=:]\s*\{?\s*|router\.(?:push|replace)\(\s*|location\.href\s*=\s*|location\.assign\(\s*|\bredirect\(\s*)(["'`])(\/[^"'`\s#?]*)/g;
    for (const m of s.matchAll(re)) {
      const tho = m[2];
      if (tho.startsWith('//')) continue; // //cdn… — không phải đường dẫn nội bộ
      const u = tho.replace(/\$\{[^}]*\}/g, 'x').replace(/\/$/, '') || '/';
      if (BO_QUA.test(u)) continue;
      out.push({ tep: relative(FE, p), u });
    }
  }
  return out;
}

const LK = lienKet();

test('phép quét có răng: đọc ra route và liên kết thật', () => {
  assert.ok(ROUTES.includes('/') && ROUTES.includes('/ide'), `không đọc ra route gốc — đọc được: ${ROUTES.join(' ')}`);
  // Sàn, không phải con số đúng: thêm trang thì số lớn lên là chuyện thường.
  assert.ok(LK.length >= 8, `chỉ bắt được ${LK.length} liên kết nội bộ — phép quét hỏng thì ca dưới xanh vì không xét gì.`);
});

test('phép khớp route không dễ dãi', () => {
  assert.equal(khopRoute('/'), true);
  assert.equal(khopRoute('/courses/python_advanced'), true, '`[courseId]` phải khớp một đoạn');
  assert.equal(khopRoute('/practice'), false, 'route đã gỡ lại được coi là có');
  assert.equal(khopRoute('/courses'), false, '`/courses/[courseId]` không được khớp `/courses` trần');
  assert.equal(khopRoute('/ide/thua'), false, 'thừa một đoạn mà vẫn khớp');
});

test('mọi liên kết nội bộ trong src/ trỏ tới trang có thật hoặc tệp trong public/', () => {
  const chet = LK.filter(({ u }) => !khopRoute(u) && !existsSync(join(PUBLIC, u)));
  assert.deepEqual(
    chet.map(({ tep: t, u }) => `${t} → ${u}`),
    [],
    'liên kết tới trang KHÔNG có trong src/app — người dùng bấm vào là 404.',
  );
});
