#!/usr/bin/env node
/**
 * CỔNG "ĐÃ NẠP DB CHƯA" — bài nào đã DỰNG xong mà CHƯA tới người học.
 *
 * ── VÌ SAO CÓ FILE NÀY ───────────────────────────────────────────────────
 * `check-duong-toi.mjs` chứng minh được "có một màn mount tính năng này".
 * Nhưng NỘI DUNG BÀI thì đọc từ DB, không từ `out/`. Nên một bài có thể dựng
 * xong, kiểm xong, CI xanh — và vẫn không ai đọc được, chỉ vì chưa ai chạy
 * `update-lesson-content.ts --apply`.
 *
 * Đó không phải giả thuyết. Đo ngày 04/11/2026: **153 bài** đã đổi qua 10
 * commit nội dung (ô ví dụ đầu vào/đầu ra 130 bài · alt text 59/80 hình · 8
 * bài tập mới được chấm · 2 sơ đồ · 3 bài sửa lệch miền), gói đã xác minh
 * sạch, và KHÔNG chỗ nào trong CI nói ra rằng chúng chưa tới ai. Đây là lần
 * thứ MƯỜI HAI của lỗi thống trị trong repo này — chỉ khác là lần này cổ chai
 * nằm ở một bước deploy chứ không ở code.
 *
 * ── CỔNG NÀY KHÔNG ĐỌC DB, VÀ ĐÓ LÀ CỐ Ý ─────────────────────────────────
 * Nó đọc BIÊN NHẬN mà `--apply` ghi ra sau khi transaction commit
 * (`scripts/pe-da/da-nap.json`), rồi so sha256 với bản dựng hiện tại. Ba lý do:
 * CI không có (và không nên có) thông tin đăng nhập DB production; phép so
 * chạy được trên máy bất kỳ, không cần mạng; và biên nhận chỉ ra đời khi DB
 * đã nhận thật — khác hẳn file sao lưu, thứ được ghi TRƯỚC bước ghi nên sự tồn
 * tại của nó không chứng minh gì (bài học 29/10/2026).
 *
 * Giới hạn phải nói ra: biên nhận nói "lần nạp đó ĐÃ xảy ra", không nói "DB
 * HIỆN GIỜ vẫn đang giữ đúng bản đó". Ai ghi đè DB bằng đường khác thì cổng
 * này không thấy. Muốn biết chắc thì chạy `--offline` bỏ ra, bản chạy khô in
 * sha256 cũ → mới đọc thẳng từ DB. Đây là cổng chống QUÊN NẠP, không phải
 * cổng chống DB trôi.
 *
 * Chạy:  node scripts/check-da-nap.mjs  [--json]
 * Mã thoát 1 khi có bài chưa tới người học — để `--strict` của CI dùng được.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const GOI = join(GOC, 'scripts', 'pe-da', 'out', 'lessons.json');
const BIEN_NHAN = join(GOC, 'scripts', 'pe-da', 'da-nap.json');

/**
 * PHẢI khớp từng byte với `fingerprint()` trong
 * `src/course-admin/lesson-content-update.ts`, nếu không mọi bài đều báo lệch.
 * Chép chứ không import được: bên kia là TypeScript chạy qua ts-node, bên này
 * là ESM chạy bằng `node` trần trong CI. Chép thì SẼ TRÔI, nên ca cuối của
 * `lesson-content-update.spec.ts` ghim hai bên phải cho cùng một chuỗi.
 */
const sapKhoa = (v) => {
  if (Array.isArray(v)) return v.map(sapKhoa);
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const ra = {};
    for (const k of Object.keys(v).sort()) ra[k] = sapKhoa(v[k]);
    return ra;
  }
  return v;
};
const dauVan = (v) =>
  createHash('sha256').update(JSON.stringify(sapKhoa(v)) ?? 'null').digest('hex');

const goi = JSON.parse(readFileSync(GOI, 'utf8'));
const bai = goi.lessons ?? goi;

if (!existsSync(BIEN_NHAN)) {
  const m =
    `CHƯA CÓ BIÊN NHẬN NẠP (${BIEN_NHAN}).\n` +
    `  Không biết được bài nào trong ${bai.length} bài đã tới người học.\n` +
    '  Đó là trạng thái THẬT, không phải lỗi của cổng: biên nhận chỉ ra đời ở\n' +
    '  lần `--apply` đầu tiên sau khi tính năng này tồn tại.\n' +
    '  Chạy:  npx ts-node scripts/update-lesson-content.ts --all --apply --backup=<file.json>\n' +
    '  rồi COMMIT scripts/pe-da/da-nap.json.';
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ coBienNhan: false, tong: bai.length }, null, 2));
  } else {
    console.log(m);
  }
  // CẢNH BÁO, KHÔNG ĐỎ. Đỏ ở đây là bắt CI đứng vì một việc chỉ chủ dự án làm
  // được (ghi DB production), và một CI đỏ vĩnh viễn thì dạy người ta quen với
  // màu đỏ — đúng bài học đã ghi cho DAP_AN_MAU_KHONG_CHAY. Cổng chuyển sang
  // ĐỎ CỨNG ngay khi biên nhận đầu tiên tồn tại: từ đó, mọi lệch là lỗi thật.
  process.exit(0);
}

const bn = JSON.parse(readFileSync(BIEN_NHAN, 'utf8'));
const daNap = bn.bai ?? {};

const chuaNap = [];
const chuaTungNap = [];
for (const l of bai) {
  const ma = l.lesson_code;
  const nay = dauVan(l.content_json);
  if (!(ma in daNap)) chuaTungNap.push(ma);
  else if (daNap[ma] !== nay) chuaNap.push(ma);
}
// Bài có trong biên nhận mà gói KHÔNG còn: mã bài đã bỏ. Không phải lỗi, nhưng
// để lại thì biên nhận lớn dần thành chỗ giấu rác — cùng lý do `GIU_DU_CHET`
// của cổng tài nguyên chết phải kiểm hai chiều.
const coTrongGoi = new Set(bai.map((l) => l.lesson_code));
const moCoi = Object.keys(daNap).filter((m) => !coTrongGoi.has(m));

const tong = chuaNap.length + chuaTungNap.length;
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(
    { coBienNhan: true, napLuc: bn.napLuc, tong: bai.length, chuaNap, chuaTungNap, moCoi },
    null, 2,
  ));
} else {
  console.log(`Biên nhận nạp lúc ${bn.napLuc ?? '(không ghi)'} · gói ${bai.length} bài`);
  if (chuaTungNap.length) {
    console.error(`\nCHƯA BAO GIỜ NẠP (${chuaTungNap.length}): ${chuaTungNap.join(', ')}`);
  }
  if (chuaNap.length) {
    console.error(`\nĐÃ ĐỔI TỪ LẦN NẠP CUỐI — người học vẫn đang đọc bản CŨ (${chuaNap.length}):`);
    console.error(`  ${chuaNap.join(', ')}`);
  }
  if (moCoi.length) {
    console.error(`\nMỒ CÔI — có trong biên nhận mà gói không còn (${moCoi.length}): ${moCoi.join(', ')}`);
    console.error('  Bỏ chúng khỏi da-nap.json, không thì biên nhận thành chỗ giấu rác.');
  }
  console.log(tong || moCoi.length
    ? `\n${tong} bài chưa tới người học${moCoi.length ? `, ${moCoi.length} mục mồ côi` : ''}`
    : '\n0 lỗi — mọi bài trong gói đều đã nạp đúng bản đang dựng');
}
process.exit(tong || moCoi.length ? 1 : 0);
