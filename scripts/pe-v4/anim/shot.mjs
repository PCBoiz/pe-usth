#!/usr/bin/env node
/**
 * Chụp PNG từng hình SVG của khoá pe-v4 để sổ tay PDF (handbook.py) nhúng được.
 *
 * Vì sao phải qua Chromium: hình là SVG có animation bằng CSS, và CSS animation
 * KHÔNG được các thư viện chuyển SVG→PNG thuần (cairosvg, rsvg) hiểu — chúng vẽ
 * khung hình gốc, nhiều khi là trạng thái "chưa chạy" nên thiếu nhãn. Ở đây ta mở
 * hình trong Chromium với `prefers-reduced-motion: reduce`: theo chuẩn vẽ của
 * CONTRACT-THEORY.md, mọi hình phải tắt animation ở chế độ này và đứng ở TRẠNG
 * THÁI HOÀN CHỈNH — đúng cái cần in ra giấy.
 *
 * Chạy (từ thư mục gốc repo):
 *     node scripts/pe-v4/anim/shot.mjs                 # chụp hình đã đổi
 *     node scripts/pe-v4/anim/shot.mjs --force         # chụp lại tất cả
 *     node scripts/pe-v4/anim/shot.mjs P02-lifecycle   # chỉ vài hình
 *
 * Vào:  frontend/public/static/anim/*.svg
 * Ra:   scripts/pe-v4/out/figures/<name>.png  (1280x640 @2x = 2560x1280)
 *
 * Chạy lại được: PNG mới hơn SVG thì bỏ qua (in "giữ"), nên gọi nhiều lần rẻ.
 */
import { createRequire } from 'node:module';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const ANIM_DIR = path.join(ROOT, 'frontend', 'public', 'static', 'anim');
const OUT_DIR = path.join(ROOT, 'scripts', 'pe-v4', 'out', 'figures');
const WIDTH = 1280;
const HEIGHT = 640;
const SCALE = 2;
// Hình đứng im ở reduced-motion, nhưng vẫn chờ một nhịp cho font và layout xong.
const SETTLE_MS = 250;

/** Playwright nằm ở frontend/node_modules (repo không cài ở gốc). */
function loadPlaywright() {
  const require = createRequire(path.join(ROOT, 'frontend', 'package.json'));
  try {
    return require('playwright');
  } catch {
    fail(
      'Không nạp được `playwright` từ frontend/node_modules.\n' +
        '  Cài: cd frontend && npm install',
    );
  }
}

function fail(message) {
  console.error('LỖI: ' + message);
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const names = args.filter((a) => !a.startsWith('--')).map((a) => path.basename(a, '.svg'));

let entries;
try {
  entries = (await readdir(ANIM_DIR)).filter((f) => f.endsWith('.svg')).sort();
} catch {
  fail(`Không mở được ${path.relative(ROOT, ANIM_DIR)} — chưa có hình nào thì chưa có gì để chụp.`);
}
if (names.length) {
  const missing = names.filter((n) => !entries.includes(`${n}.svg`));
  if (missing.length) fail(`không có hình: ${missing.join(', ')}`);
  entries = names.map((n) => `${n}.svg`);
}
if (!entries.length) {
  console.log(`Không có hình .svg nào trong ${path.relative(ROOT, ANIM_DIR)} — bỏ qua.`);
  process.exit(0);
}

const { chromium } = loadPlaywright();
await mkdir(OUT_DIR, { recursive: true });

/** Chỉ chụp lại khi SVG mới hơn PNG — chạy lại cả bộ không tốn thời gian. */
async function needsShot(svg, png) {
  if (force) return true;
  try {
    const [a, b] = await Promise.all([stat(svg), stat(png)]);
    return a.mtimeMs > b.mtimeMs;
  } catch {
    return true;
  }
}

const todo = [];
let kept = 0;
for (const file of entries) {
  const svg = path.join(ANIM_DIR, file);
  const png = path.join(OUT_DIR, file.replace(/\.svg$/, '.png'));
  if (await needsShot(svg, png)) todo.push({ file, svg, png });
  else kept++;
}

if (!todo.length) {
  console.log(`Hình PNG: ${kept} giữ nguyên (không có SVG nào đổi), 0 chụp mới.`);
  process.exit(0);
}

let browser;
try {
  browser = await chromium.launch();
} catch (err) {
  fail(
    'Không mở được Chromium của Playwright.\n' +
      `  ${String(err.message || err).split('\n')[0]}\n` +
      '  Cài trình duyệt: cd frontend && npx playwright install chromium\n' +
      '  (shot.mjs chỉ chụp PNG cho sổ tay; build.py và frontend không cần Chromium.)',
  );
}

const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: SCALE,
  // Hợp đồng: ở reduced-motion hình phải đứng ở trạng thái hoàn chỉnh. Chụp đúng
  // chế độ này nên PNG trong sổ tay không bao giờ là một khung hình giữa animation.
  reducedMotion: 'reduce',
});
const page = await context.newPage();

const failures = [];
let shot = 0;
for (const { file, svg, png } of todo) {
  try {
    // Mở SVG như một tài liệu riêng (đúng cách `<img>` nạp nó): nếu hình phụ thuộc
    // vào script hay tài nguyên ngoài thì ở đây cũng hỏng, giống học viên gặp.
    await page.goto(pathToFileURL(svg).href, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(SETTLE_MS);
    const buffer = await page.screenshot({
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
      type: 'png',
    });
    await writeFile(png, buffer);
    shot++;
  } catch (err) {
    failures.push(`${file}: ${String(err.message || err).split('\n')[0]}`);
  }
}

await browser.close();

console.log(
  `Hình PNG -> ${path.relative(ROOT, OUT_DIR)}: ${shot} chụp mới, ${kept} giữ nguyên` +
    (failures.length ? `, ${failures.length} LỖI` : '') +
    ` (${WIDTH}x${HEIGHT} @${SCALE}x, reduced-motion).`,
);
for (const f of failures) console.error('  ✗ ' + f);
process.exit(failures.length ? 1 : 0);
