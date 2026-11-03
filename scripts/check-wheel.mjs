#!/usr/bin/env node
/**
 * CỔNG WHEEL — mỗi wheel vendored phải có bài dùng tới, và mỗi gói bài cần
 * phải có wheel trên đĩa.
 *
 * ── VÌ SAO CÓ FILE NÀY, HAI CHIỀU HAI LÝ DO ─────────────────────────────
 *
 * CHIỀU 1 — wheel KHÔNG ai với tới = **megabyte chết**. Đây là lỗi thống trị
 * của repo ở dạng nặng cân nhất, và nó vừa xảy ra ngay trong lúc đo: một phép
 * thử gọi `loadPackage('h5py')` với `indexURL` trỏ vào CHÍNH thư mục vendored,
 * và Pyodide **ghi wheel vào đó** (dòng log nói "caching in node_modules" —
 * nó nói thiếu). Kết quả: **3,5 MB** trong `frontend/public/pyodide/` mà không
 * bài nào khai, và nếu tôi `git add -A` thì nó vào repo im lặng.
 *
 * CHIỀU 2 — gói bài CẦN mà THIẾU wheel = hỏng cứng với học viên, CI vẫn xanh.
 * AGENTS.md đã ghi: `loadPackage` KHÔNG ném khi thiếu wheel, nó lặng lẽ tải từ
 * `cdn.jsdelivr.net`. Ba bộ chấm vá `fetch` để chặn đường đó, nhưng chúng chỉ
 * chạy những bài CÓ mã chạy được — một gói khai trong `step_4.packages` của
 * một bài mà bộ chấm bỏ qua thì không ai phát hiện. Trong trình duyệt thì CSP
 * `connect-src 'self'` chặn CDN, nên cùng một wheel thiếu là màn hình hỏng.
 *
 * ── PHẠM VI: ĐÓNG BAO PHỤ THUỘC, không chỉ gói được khai ────────────────
 * Bài khai `numpy, pandas, tzdata, matplotlib` — bốn cái. Nhưng chúng kéo theo
 * Pillow, contourpy, cycler, fonttools, kiwisolver, packaging, pyparsing,
 * python-dateutil, pytz, six: **đúng 14 gói**, khớp đúng 14 wheel đang có.
 * So theo danh sách khai mà không đóng bao phụ thuộc thì 10 wheel hợp lệ bị
 * kêu oan — mà một cổng kêu oan thì sẽ bị tắt.
 *
 * Chạy:  node scripts/check-wheel.mjs  [--json]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const RUNTIME = join(GOC, 'frontend', 'public', 'pyodide', 'v314.0.7');

/** Tên gói trong `pyodide-lock.json` lẫn lộn `-` và `_`; chuẩn hoá cả hai. */
const chuan = (s) => s.toLowerCase().replace(/_/g, '-');

const lock = JSON.parse(readFileSync(join(RUNTIME, 'pyodide-lock.json'), 'utf8')).packages;
const khoaLock = new Map(Object.keys(lock).map((k) => [chuan(k), k]));

const GOI = JSON.parse(readFileSync(join(GOC, 'scripts', 'pe-da', 'out', 'lessons.json'), 'utf8'));
const BAI = GOI.lessons ?? GOI;

// ---------- 1. gói mà BÀI khai ---------------------------------------------
const khai = new Map(); // tên chuẩn -> mã bài đầu tiên khai nó
for (const x of BAI) {
  for (const g of (x.content_json ?? x).step_4?.packages ?? []) {
    if (!khai.has(chuan(g))) khai.set(chuan(g), x.lesson_code);
  }
}

// ---------- 2. ĐÓNG BAO phụ thuộc -------------------------------------------
const can = new Set();
const thieuTrongLock = [];
const them = (ten) => {
  const k = khoaLock.get(chuan(ten));
  if (!k) {
    thieuTrongLock.push(ten);
    return;
  }
  if (can.has(chuan(k))) return;
  can.add(chuan(k));
  for (const d of lock[k].depends ?? []) them(d);
};
for (const g of khai.keys()) them(g);

// ---------- 3. đối chiếu hai chiều với đĩa ----------------------------------
const tren_dia = readdirSync(RUNTIME).filter((f) => f.endsWith('.whl'));
const tenCuaFile = new Map(tren_dia.map((f) => [chuan(f.split('-')[0]), f]));

const loi = [];

// chiều 1: wheel không ai với tới
for (const [ten, f] of tenCuaFile) {
  if (!can.has(ten)) {
    const kb = Math.round(statSync(join(RUNTIME, f)).size / 1024);
    loi.push(
      `WHEEL KHÔNG AI DÙNG: ${f} (${kb} KB) — không bài nào khai ` +
        `${ten} trong step_4.packages, và nó cũng không là phụ thuộc của gói nào được khai. ` +
        `Xoá nó, hoặc nối một bài vào nó. (Một phép thử gọi loadPackage với indexURL trỏ vào ` +
        `thư mục này SẼ tự thả wheel vào đây — đó là cách 3,5 MB từng lọt vào.)`,
    );
  }
}

// chiều 2: gói cần mà thiếu wheel — `loadPackage` sẽ lặng lẽ rơi về CDN
for (const ten of can) {
  const k = khoaLock.get(ten);
  const p = lock[k];
  // gói stdlib của Pyodide không có file wheel riêng
  if (!p.file_name || !p.file_name.endsWith('.whl')) continue;
  if (!tren_dia.includes(p.file_name)) {
    loi.push(
      `THIẾU WHEEL: ${p.file_name} — cần cho ${khai.get(ten) ? `bài ${khai.get(ten)}` : 'một phụ thuộc'}, ` +
        `nhưng không có trên đĩa. loadPackage KHÔNG ném: nó lặng lẽ tải từ cdn.jsdelivr.net, ` +
        `nên CI vẫn xanh — còn trong trình duyệt thì CSP connect-src 'self' chặn, tức hỏng cứng.`,
    );
  }
}

for (const ten of thieuTrongLock) {
  loi.push(`KHÔNG CÓ TRONG LOCK: "${ten}" được một bài khai nhưng Pyodide 314 không biết gói này.`);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ khai: [...khai], can: [...can], tren_dia, loi }, null, 2));
} else {
  console.log(
    `Wheel: ${tren_dia.length} trên đĩa · ${khai.size} gói bài khai · ` +
      `${can.size} gói sau khi đóng bao phụ thuộc`,
  );
  console.log(`   bài khai: ${[...khai.keys()].join(', ')}`);
  for (const m of loi) console.error(`LỖI: ${m}`);
  console.log(loi.length ? `\n${loi.length} lỗi` : '\n0 lỗi');
}
process.exitCode = loi.length ? 1 : 0;
