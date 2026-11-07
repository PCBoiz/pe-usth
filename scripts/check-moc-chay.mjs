#!/usr/bin/env node
/**
 * MỐC PHẢI CHẠY MỚI BIẾT — bảng mốc nền có nói đúng không.
 *
 * `check-moc-nen.mjs` đối chiếu được 18 con số vì chúng đọc ra từ cây tệp và
 * `out/lessons.json`. Nó cố ý KHÔNG chạy bộ test nào (nó phải nhanh), nên nó tự
 * khai 5 con số là "NGOÀI TẦM". File này phủ những con số đó.
 *
 * Vì sao cần: AGENTS.md từng ghi **204** ca test frontend trong khi cây mã chỉ có
 * **134** — 70 ca tưởng có mà không có. Nó sống sót vì phép đếm tay dùng
 * `grep -E "^. pass"`, mà dòng tổng kết của `node --test` mở đầu bằng `ℹ`
 * (multibyte) nên `^.` không khớp và vòng lặp trả RỖNG cho MỌI file, im lặng.
 *
 * MỘT THAM SỐ MỖI JOB, không phải một lệnh chạy hết. Ba lệnh này nằm ở BA job CI
 * khác nhau và đang chạy SONG SONG; gộp chúng vào một chỗ là tự serialize lại.
 * Gọi không tham số thì chạy hết — dùng khi đo tay.
 *
 *   node scripts/check-moc-chay.mjs            # cả ba
 *   node scripts/check-moc-chay.mjs frontend   # job frontend
 *   node scripts/check-moc-chay.mjs backend    # job backend
 *   node scripts/check-moc-chay.mjs tracer     # job tracer
 *
 * CỐ Ý KHÔNG PHỦ hai con số lint (backend 104 lỗi · frontend 146 cảnh báo), và lý
 * do không phải tiết kiệm: con số lint phải ĐI XUỐNG. Ghim bằng phép so BẰNG thì
 * mỗi đợt dọn `any` là một lần cổng đỏ, tức dạy người ta THÔI DỌN — đúng cái
 * `check-nguong` đã tránh bằng dòng `GHI SỔ`. Chiều của chúng đã có sổ canh
 * (`ci-lint-backend`, trần 115, chỉ được hạ).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MD = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
/** Số trong bảng viết kiểu Việt (dấu cách ngăn nhóm nghìn, có chỗ là U+00A0). */
const so = (s) => Number(s.replace(/[\s ]/g, ''));

/**
 * Mỗi mục: lấy số ĐANG KHAI từ bảng, chạy lệnh, lấy số THẬT, so.
 * Regex viết THẲNG — `\s` trong một template literal là escape của CHỮ `s`, và
 * lỗi đó đã làm hai cổng khác trong repo này ĐỎ OAN.
 */
const KIEM = {
  frontend: {
    nhan: 'ca test frontend',
    lenh: 'npm run test:unit',
    cwd: 'frontend',
    bang: () => {
      const m = MD.match(/test:unit[^|\n]*?\*\*([\d  ]+) ca\*\*/);
      return m ? { ca: so(m[1]) } : null;
    },
    doc: (ra) => {
      const dat = [...ra.matchAll(/\bpass (\d+)[ \t\r]*$/gm)].at(-1);
      const hong = [...ra.matchAll(/\bfail (\d+)[ \t\r]*$/gm)].at(-1);
      return dat && hong ? { ca: Number(dat[1]), truot: Number(hong[1]) } : null;
    },
  },
  backend: {
    nhan: 'ca test backend',
    // `--runInBand`: chạy song song với bộ frontend thì 15/15 bộ báo trượt với 0
    // ca chạy — tranh CPU, không phải lỗi thật (bẫy đã ghi trong AGENTS.md).
    lenh: 'npx jest --ci --runInBand',
    cwd: '.',
    bang: () => {
      const m = MD.match(/\*\*(\d+) bộ, ([\d  ]+) ca\*\*/);
      return m ? { bo: Number(m[1]), ca: so(m[2]) } : null;
    },
    doc: (ra) => {
      const b = ra.match(/Test Suites:\s+(\d+) passed, (\d+) total/);
      const c = ra.match(/Tests:\s+(\d+) passed, (\d+) total/);
      return b && c
        ? { bo: Number(b[2]), ca: Number(c[2]), truot: Number(c[2]) - Number(c[1]) }
        : null;
    },
  },
  tracer: {
    nhan: 'phép kiểm của bộ ghi vết',
    lenh: `${process.platform === 'win32' ? 'py' : 'python'}`
      + ' -I scripts/tracer/pe_tracer_test.py',
    cwd: '.',
    bang: () => {
      const m = MD.match(/\*\*(\d+) phép kiểm\*\*/);
      return m ? { ca: Number(m[1]) } : null;
    },
    doc: (ra) => {
      const m = ra.match(/Chạy (\d+) phép kiểm, trượt (\d+)/);
      return m ? { ca: Number(m[1]), truot: Number(m[2]) } : null;
    },
  },
};

const xin = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const ten = xin.length ? xin : Object.keys(KIEM);
const loi = [];
for (const k of ten) {
  const c = KIEM[k];
  if (!c) {
    loi.push(`không biết mục "${k}" — chọn một trong: ${Object.keys(KIEM).join(', ')}`);
    continue;
  }
  const khai = c.bang();
  if (!khai) {
    loi.push(
      `AGENTS.md KHÔNG CÒN DÒNG nào khớp mốc "${c.nhan}". Đổi chữ của hàng đó thì `
      + 'phải sửa cổng này — im lặng xanh ở đây là đúng cách con số 204 sống sót.',
    );
    continue;
  }
  // MỘT chuỗi lệnh, không phải (lệnh + mảng args) kèm `shell`: dạng thứ hai làm
  // Node ném DeprecationWarning DEP0190. Và `shell` là bắt buộc trên Windows —
  // `npm`/`py` ở đó là `.cmd`/`.bat`, spawn trực tiếp thì ENOENT và status ra `null`.
  const r = spawnSync(c.lenh, {
    cwd: join(ROOT, c.cwd),
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  const that = c.doc(`${r.stdout ?? ''}\n${r.stderr ?? ''}`);
  if (!that) {
    loi.push(
      `không đọc được số từ \`${c.lenh}\` — mã thoát ${r.status}`
      + `${r.error ? ` · spawn hỏng: ${r.error.message}` : ''}. Mã thoát \`null\` nghĩa `
      + 'là không chạy được LỆNH, không phải bộ test hỏng.',
    );
    continue;
  }
  const phan = Object.keys(khai).map((f) => `${f} ${khai[f]}/${that[f]}`).join(' · ');
  console.log(`${c.nhan}: bảng/chạy ra → ${phan}`
    + (that.truot ? ` · ${that.truot} TRƯỢT` : ' · 0 trượt'));
  if (that.truot) loi.push(`${c.nhan}: ${that.truot} ca TRƯỢT — con số chỉ đúng khi bộ test xanh.`);
  for (const f of Object.keys(khai)) {
    if (khai[f] !== that[f]) {
      const d = that[f] - khai[f];
      loi.push(
        `${c.nhan}: bảng ghi ${f} = ${khai[f]}, chạy ra ${that[f]} (lệch ${d > 0 ? '+' : ''}${d}). `
        + 'Thêm/bớt thì chạy lệnh, lấy số THẬT, sửa bảng TRONG CÙNG commit.',
      );
    }
  }
}

console.log('\nNGOÀI TẦM cổng này, cố ý (xem chú thích đầu file):');
console.log('   – Backend lint 104 lỗi · Frontend lint 146 cảnh báo. Hai con số đó phải ĐI '
  + 'XUỐNG, nên phép so BẰNG sẽ đỏ ở mỗi đợt dọn — chiều của chúng đã có sổ ngưỡng canh.');
console.log('');
if (loi.length) {
  for (const x of loi) console.log(`LỖI: ${x}`);
  console.log(`\n${loi.length} lỗi`);
  process.exitCode = 1; // KHÔNG process.exit(): nó đua với pool keep-alive và thoát 127
} else {
  console.log('0 lỗi');
}
