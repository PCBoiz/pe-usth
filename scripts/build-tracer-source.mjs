/**
 * Nhúng tracer Python vào một module TypeScript để backend gửi đi được.
 *
 * Vì sao phải nhúng: backend dán tracer + mã người học thành MỘT file Python rồi
 * gửi qua POST /run như một lượt chạy bình thường (xem trace-program.ts). Nên
 * tracer phải có mặt ngay trong tiến trình Node — `nest build` không chép file
 * .py sang dist/, và đọc theo đường dẫn tương đối thì chạy được ở src/ rồi chết
 * ở dist/ trên Render. Nhúng thành chuỗi là cách không có bước deploy nào làm sai.
 *
 * Vì sao nhúng bản RÚT GỌN: POST /run chặn mã nguồn ở 20 KB (MAX_CODE_BYTES);
 * pe_tracer.py với chú thích tiếng Việt đã ~26 KB, tự nó đã vượt trần. Bản rút
 * gọn (bỏ chú thích + docstring, bằng ast.unparse — xem scripts/pe-tracer-strip.py)
 * còn ~12,8 KB. File .py vẫn là NGUỒN DUY NHẤT: nó chạy được, test được bằng
 * `py src/python-runner/tracer/pe_tracer_test.py`.
 *
 * Canh lệch: file sinh ra mang luôn SHA-256 của bản .py, và
 * `tracer-source.spec.ts` băm lại file .py rồi so — sửa .py mà quên sinh lại là
 * `npx jest` đỏ ngay, không phải phát hiện khi người học bấm nút.
 *
 * Chạy (Windows dùng `py`, không dùng `python`):
 *   node scripts/build-tracer-source.mjs
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pySource = join(root, 'src/python-runner/tracer/pe_tracer.py');
const stripper = join(root, 'scripts/pe-tracer-strip.py');
const tsTarget = join(root, 'src/python-runner/tracer/tracer-source.ts');

// Chuẩn hoá về \n: bản nhúng phải giống nhau trên Windows và Linux, nếu không
// cùng một commit lại gửi hai đoạn Python khác nhau tuỳ máy nào build.
const original = readFileSync(pySource, 'utf8').replace(/\r\n/g, '\n');
const sha = createHash('sha256').update(original, 'utf8').digest('hex');

/** `py` trên Windows (AGENTS.md: `python` là stub của Microsoft Store), `python3` ở nơi khác. */
function runStripper() {
  for (const exe of ['py', 'python3', 'python']) {
    const out = spawnSync(exe, [stripper, pySource], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    if (out.error || out.status !== 0) continue;
    return out.stdout.replace(/\r\n/g, '\n');
  }
  throw new Error(
    'Không chạy được scripts/pe-tracer-strip.py: cần Python trên PATH (py / python3).',
  );
}

const stripped = runStripper();
if (!stripped.includes('def _pe_run(')) {
  throw new Error('Bản rút gọn không còn _pe_run — bước rút gọn đã làm hỏng mã.');
}

/** Ba thứ phải escape trong template literal: dấu chéo ngược, dấu huyền, và mở ngoặc nội suy. */
const escaped = stripped
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

const out = `/**
 * TỆP SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.
 *
 * Nguồn: src/python-runner/tracer/pe_tracer.py (bản rút gọn, bỏ chú thích)
 * Sinh lại: node scripts/build-tracer-source.mjs
 * Canh lệch: src/python-runner/tracer/tracer-source.spec.ts
 */

/** SHA-256 của pe_tracer.py lúc sinh file này. Lệch nghĩa là quên sinh lại. */
export const TRACER_SOURCE_SHA256 =
  '${sha}';

/** Tracer Python đã bỏ chú thích/docstring — đúng chuỗi được gửi vào sandbox. */
export const TRACER_SOURCE = \`${escaped}\`;
`;

writeFileSync(tsTarget, out, 'utf8');
process.stdout.write(
  `Đã nhúng ${Buffer.byteLength(stripped, 'utf8')} byte Python (rút gọn từ ` +
    `${Buffer.byteLength(original, 'utf8')} byte) vào ${tsTarget}\n`,
);
