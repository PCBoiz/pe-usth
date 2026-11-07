#!/usr/bin/env node
/**
 * SỐ CA TEST trong bảng mốc nền có nói đúng không.
 *
 * Vì sao có file này: AGENTS.md từng ghi **204** ca test frontend trong khi cây
 * mã chỉ có **134** — 70 ca tưởng có mà không có. Nó sống sót vì phép đếm tay
 * dùng `grep -E "^. pass"`, mà dòng tổng kết của `node --test` mở đầu bằng `ℹ`
 * (multibyte) nên `^.` không khớp và vòng lặp trả RỖNG cho MỌI file, im lặng.
 *
 * `check-moc-nen.mjs` ĐỌC đúng dòng đó nhưng regex của nó bắt số TỆP và bỏ qua
 * số CA — chính nó khai số ca là "NGOÀI TẦM", vì cổng đó cố ý không chạy bộ test
 * nào (nó phải nhanh). Nên con số này chưa bao giờ có ai canh.
 *
 * GIỚI HẠN, phải nói ra: cổng này chỉ canh bộ FRONTEND (`npm run test:unit`).
 * Số ca backend (`npx jest`) vẫn NGOÀI TẦM — chạy nó mất lâu hơn nhiều và máy
 * dự án chạy song song việc khác. Thêm nó là một lát riêng, không phải bỏ sót.
 *
 * Và nó KHÔNG thay được sổ ngưỡng: cổng này bắt "số trong bảng SAI", còn
 * `check-nguong` bắt "ai đó HẠ số trong bảng cho khớp một bộ đã bị cắt bớt".
 * Hai lỗi khác nhau, cần cả hai.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const loi = [];

// ---- 1. con số ĐANG KHAI trong bảng mốc nền ----------------------------------
// Số trong bảng viết kiểu Việt (dấu cách ngăn nhóm nghìn, có chỗ là U+00A0), nên
// bóc xong phải bỏ mọi khoảng trắng — cùng bẫy đã ghi cho check-moc-nen.
const MD = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
const hang = MD.match(/test:unit[^|\n]*?\*\*([\d  ]+) ca\*\*/);
if (!hang) {
  loi.push(
    'AGENTS.md KHÔNG CÒN DÒNG nào khớp "test:unit … **N ca**". Đổi chữ của hàng '
    + 'đó thì phải sửa cổng này — im lặng xanh ở đây là đúng cách con số 204 sống sót.',
  );
}
const khai = hang ? Number(hang[1].replace(/[\s ]/g, '')) : null;

// ---- 2. con số THẬT, lấy bằng cách chạy chính lệnh mà CI chạy ----------------
// Một tiến trình cho cả 48 file: dòng tổng kết của nó LÀ con số, không phải một
// phép cộng do ta tự làm (phép cộng tay là chỗ bẫy multibyte đã cắn).
let that = null;
let truot = null;
if (hang) {
  // MỘT chuỗi lệnh, không phải (lệnh + mảng args) kèm `shell`: dạng thứ hai làm
  // Node ném DeprecationWarning DEP0190. Và `shell` là bắt buộc trên Windows —
  // `npm` ở đó là `npm.cmd`, spawn trực tiếp thì ENOENT và mã thoát ra `null`.
  const r = spawnSync('npm run test:unit', {
    cwd: join(ROOT, 'frontend'),
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  const ra = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  // Regex viết THẲNG, không dựng từ chuỗi: `\s` trong một template literal là
  // escape của CHỮ `s`, và lỗi đó đã làm một cổng khác ĐỎ OAN.
  const dat = [...ra.matchAll(/\bpass (\d+)[ \t\r]*$/gm)].at(-1);
  const hong = [...ra.matchAll(/\bfail (\d+)[ \t\r]*$/gm)].at(-1);
  if (!dat || !hong) {
    loi.push(
      'không đọc được dòng tổng kết `pass N` / `fail N` của `npm run test:unit` — '
      + `mã thoát ${r.status}${r.error ? ` · spawn hỏng: ${r.error.message}` : ''}. `
      + 'Mã thoát `null` nghĩa là không chạy được LỆNH, không phải bộ test hỏng.',
    );
  } else {
    that = Number(dat[1]);
    truot = Number(hong[1]);
    if (truot > 0) loi.push(`${truot} ca TRƯỢT — con số trong bảng chỉ đúng khi bộ test xanh.`);
    if (that !== khai) {
      loi.push(
        `bảng ghi ${khai} ca, bộ test chạy ra ${that}. Lệch ${that - khai > 0 ? '+' : ''}`
        + `${that - khai}. Thêm/bớt ca thì chạy lệnh, lấy số THẬT, sửa bảng TRONG CÙNG commit.`,
      );
    }
  }
}

// ---- 3. báo cáo ---------------------------------------------------------------
console.log(`Số ca test frontend: bảng ${khai ?? '?'} / chạy ra ${that ?? '?'}`
  + (truot === null ? '' : ` · ${truot} trượt`));
console.log('\nNGOÀI TẦM cổng này (phải tự đo):');
console.log('   – Số ca backend (`npx jest --ci --runInBand`, bảng ghi 501). Chạy nó lâu hơn '
  + 'nhiều và máy dự án chạy song song việc khác, nên nó là một lát riêng.');
console.log('');
if (loi.length) {
  for (const x of loi) console.log(`LỖI: ${x}`);
  console.log(`\n${loi.length} lỗi`);
  process.exitCode = 1; // KHÔNG process.exit(): nó đua với pool keep-alive và thoát 127
} else {
  console.log('0 lỗi');
}
