/**
 * Sinh bản tracer Python mà TRÌNH DUYỆT tải về khi bấm "Xem từng bước".
 *
 * Nguồn duy nhất là `scripts/tracer/pe_tracer.py`; đích là
 * `frontend/public/static/py/pe_tracer.min.py`, phục vụ tĩnh cùng origin để
 * `ide.worker.js` fetch được (CSP của file worker chỉ cho `connect-src 'self'`).
 *
 * Vì sao sinh bản RÚT GỌN chứ không chép nguyên: pe_tracer.py với chú thích
 * tiếng Việt là ~30 KB và người học phải tải nó mỗi phiên. Bản rút gọn (bỏ chú
 * thích + docstring bằng ast.unparse — xem scripts/pe-tracer-strip.py) còn
 * ~13 KB. File .py vẫn là NGUỒN DUY NHẤT: nó chạy được, test được bằng
 * `py scripts/tracer/pe_tracer_test.py`.
 *
 * KHÔNG CÒN SINH `src/python-runner/tracer/tracer-source.ts`. Bản nhúng đó tồn
 * tại vì backend dán tracer + mã người học thành một file rồi gửi qua POST /run;
 * cả module đó đã bị xoá ngày 25/10/2026. Và vì thư mục đích không còn, script
 * này CHẾT với ENOENT ở `writeFileSync` TRƯỚC khi ghi được bản cho trình duyệt —
 * tức từ hôm đó tới 28/10/2026 không ai sinh lại được bản .min.py. Phát hiện ra
 * vì không ghi được bản mới sau khi hiệu chỉnh PE_LIMITS.
 *
 * Canh lệch: bản sinh ra mang SHA-256 của file .py, và
 * `frontend/e2e/unit/tracer-web-sync.test.mjs` băm lại file .py rồi so — sửa .py
 * mà quên sinh lại là bộ test frontend đỏ ngay, không phải phát hiện khi người
 * học bấm nút.
 *
 * Chạy (Windows dùng `py`, không dùng `python`):
 *   node scripts/build-tracer-source.mjs
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Nguồn nằm cạnh script này, KHÔNG trong src/python-runner: từ khi `/ide`
// chạy Pyodide ở trình duyệt, tracer chỉ còn là nguồn sinh ra một asset của
// frontend. Để nó trong module backend là mời người dọn pha 4 xoá cả cụm —
// và xoá cả cụm là giết nút "Xem từng bước".
const pySource = join(root, 'scripts/tracer/pe_tracer.py');
const stripper = join(root, 'scripts/pe-tracer-strip.py');
// Đích DUY NHẤT, phục vụ tĩnh cho trình duyệt: khi "Xem từng bước" chạy bằng
// Pyodide trong worker, tracer phải tải được qua HTTP cùng origin.
const webTarget = join(root, 'frontend/public/static/py/pe_tracer.min.py');

// Chuẩn hoá về \n: bản sinh ra phải giống nhau trên Windows và Linux, nếu không
// cùng một commit lại gửi hai đoạn Python khác nhau tuỳ máy nào build — và
// `tracer-web-sync.test.mjs` băm nguồn theo \n nên lệch là đỏ.
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

mkdirSync(dirname(webTarget), { recursive: true });
writeFileSync(
  webTarget,
  [
    '# TỆP SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.',
    '# Nguồn: scripts/tracer/pe_tracer.py (bản rút gọn, bỏ chú thích)',
    '# Sinh lại: node scripts/build-tracer-source.mjs',
    // Dòng này là thứ `tracer-web-sync.test.mjs` đọc để biết bản .min.py có cũ
    // hơn nguồn không. Đổi định dạng dòng thì phải đổi regex trong ca test đó.
    `# sha256 của nguồn: ${sha}`,
    stripped,
    '',
  ].join('\n'),
  'utf8',
);

process.stdout.write(
  `Đã ghi ${Buffer.byteLength(stripped, 'utf8')} byte Python (rút gọn từ `
    + `${Buffer.byteLength(original, 'utf8')} byte) vào ${webTarget}\n`,
);
