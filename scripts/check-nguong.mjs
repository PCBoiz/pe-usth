#!/usr/bin/env node
/**
 * CỔNG NGƯỠNG MỘT CHIỀU — con số nào đã quyết "chỉ được hạ" / "chỉ được nâng"
 * thì phải thật sự đi đúng hướng đó.
 *
 * ── VÌ SAO CÓ FILE NÀY ───────────────────────────────────────────────────
 * Repo có 16 con số như vậy, rải khắp 7 file, và mỗi cái được khai bằng MỘT
 * CÂU TIẾNG VIỆT trong chú thích bên cạnh. Không gì canh chiều. Một vòng lặp
 * muốn xanh chỉ cần hạ con số rồi sửa câu chú thích — hai dòng, và không bộ
 * kiểm nào đỏ.
 *
 * Đây không phải lo xa. LOOP.md đã đặt tên nó là cách thứ nhất một vòng lặp
 * nói dối ("nới phép kiểm cho xanh"), và ImpossibleBench đo được các mô hình
 * Claude **>79% số lần là SỬA TEST** khi nhiệm vụ không làm được. Repo có đúng
 * bề mặt để chuyện đó xảy ra mà không ai thấy.
 *
 * ── GIỚI HẠN, PHẢI NÓI RA ────────────────────────────────────────────────
 * Sổ `nguong-mot-chieu.json` được COMMIT, nên ai cố tình nới vẫn sửa được cả
 * hai. Cổng này làm việc nới trở nên TO TIẾNG — một dòng diff trong sổ, kèm
 * câu hỏi "vì sao" — chứ KHÔNG làm nó bất khả. Cùng mức trung thực với
 * `check-da-nap.mjs`: nó chống QUÊN NẠP, không chống DB trôi.
 *
 * ── LUẬT HAI CHIỀU ───────────────────────────────────────────────────────
 *   · giá trị đi SAI hướng so với sổ            → LỖI
 *   · regex không còn khớp (đổi tên hằng/xoá)   → LỖI, không im lặng cho qua
 *   · giá trị đi ĐÚNG hướng                      → nhắc GHI SỔ LẠI, không đỏ
 *
 * Nhánh thứ ba là chủ ý: siết một ngưỡng là việc TỐT, bắt nó đỏ thì người ta
 * sẽ thôi siết. Nhưng sổ phải theo kịp, nếu không nó dần mô tả một quá khứ xa
 * và mất hết sức canh.
 *
 * Chạy:  node scripts/check-nguong.mjs  [--json] [--ghi-so]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SO = join(GOC, 'scripts', 'nguong-mot-chieu.json');
const so = JSON.parse(readFileSync(SO, 'utf8'));

const loi = [];
const nhac = [];
const bang = [];

for (const n of so.nguong) {
  let van;
  try {
    van = readFileSync(join(GOC, n.tep), 'utf8');
  } catch {
    loi.push(`KHÔNG ĐỌC ĐƯỢC TỆP: ${n.ten} trỏ tới ${n.tep} — tệp đã bị dời hoặc xoá.`);
    continue;
  }
  const m = van.match(new RegExp(n.re));
  if (!m) {
    loi.push(
      `KHÔNG CÒN KHỚP: ${n.ten} — không tìm thấy /${n.re}/ trong ${n.tep}. Hằng đã đổi ` +
        `tên hoặc bị xoá. Sửa sổ cho khớp, đừng để cổng im lặng bỏ qua một ngưỡng.`,
    );
    continue;
  }
  // MỘT REGEX MƠ HỒ LÀ MỘT CỔNG HỎNG, và nó hỏng theo CẢ HAI chiều. Lần đầu
  // chạy, `san-mau-chu-giai-thich` dùng `ts >= (\d+)` và khớp trúng dòng AA
  // `ts >= 4.5` đứng TRƯỚC — bắt được 4, báo oan một ngưỡng đang đúng. Cùng
  // lỗi ấy mà khớp nhầm một con số KHÔNG BAO GIỜ đổi thì cổng XANH vĩnh viễn
  // trong khi ngưỡng thật đã bị nới. Nên đòi khớp ĐÚNG MỘT LẦN: "nhiều chỗ
  // khớp" nghĩa là sổ không chỉ được vào đúng con số nào.
  const soLanKhop = (van.match(new RegExp(n.re, 'g')) ?? []).length;
  if (soLanKhop !== 1) {
    loi.push(
      `REGEX MƠ HỒ: ${n.ten} — /${n.re}/ khớp ${soLanKhop} chỗ trong ${n.tep}, cổng không ` +
        `biết con số nào là ngưỡng. Neo thêm chữ xung quanh cho duy nhất.`,
    );
    continue;
  }
  const nay = Number(m[1]);
  const moc = Number(n.moc);
  const saiHuong = n.chieu === 'ha' ? nay > moc : nay < moc;
  const dungHuong = n.chieu === 'ha' ? nay < moc : nay > moc;
  bang.push([n.ten, n.chieu, moc, nay]);

  if (saiHuong) {
    loi.push(
      `NỚI NGƯỢC CHIỀU: ${n.ten} (${n.tep}) ${n.chieu === 'ha' ? 'là TRẦN' : 'là SÀN'}, ` +
        `sổ ghi ${moc}, nay là ${nay}. ${n.vi} ` +
        `Muốn nới thật thì phải là một quyết định CÓ NGƯỜI ĐỌC: sửa sổ trong cùng ` +
        `commit và nói vì sao trong mô tả commit.`,
    );
  } else if (dungHuong) {
    nhac.push(`${n.ten}: ${moc} → ${nay} (siết lại, tốt) — chạy \`--ghi-so\` để cập nhật sổ.`);
  }
}

if (process.argv.includes('--ghi-so')) {
  // Chỉ ghi khi KHÔNG có lỗi: nếu không thì `--ghi-so` thành cái nút tắt cổng.
  if (loi.length) {
    console.error('Có lỗi — KHÔNG ghi sổ. Sửa trước đã.');
    for (const m of loi) console.error(`LỖI: ${m}`);
    process.exit(1);
  }
  const doiMuc = [];
  for (const n of so.nguong) {
    const h = bang.find((b) => b[0] === n.ten);
    if (h && h[3] !== Number(n.moc)) doiMuc.push([n.ten, n.moc, h[3]]);
  }
  const doi = doiMuc.length;
  // KHÔNG GHI KHI KHÔNG CÓ GÌ ĐỔI. Cả giá trị của sổ này nằm ở chỗ "một dòng
  // diff ở đây là một câu hỏi to tiếng" — nên một lần ghi vô ích làm hỏng đúng
  // tín hiệu đó. Đo được ngay lần chạy ĐẦU TIÊN của cờ này (tôi giao nó ở vòng
  // trước mà chưa chạy lần nào): nó in "0 ngưỡng cập nhật" rồi vẫn sửa 4 dòng,
  // vì `JSON.stringify` chuẩn hoá `12.0` thành `12`. Vô hại về SỐ, có hại về
  // TÍN HIỆU.
  if (doi === 0) {
    console.log('Sổ đã đúng — không ghi gì.');
    process.exit(0);
  }
  // GHI TỪNG DÒNG `moc`, KHÔNG stringify lại cả sổ. Bản trước ghi lại cả file,
  // nên một lần cập nhật ĐÚNG MỘT ngưỡng vẫn làm bẩn 4 dòng khác —
  // `JSON.stringify` chuẩn hoá `12.0` thành `12`. Nhánh `doi === 0` ở trên chỉ
  // chặn trường hợp KHÔNG có gì đổi; chỗ này chặn trường hợp CÓ, và nó là
  // trường hợp đã xảy ra: 07/11/2026, lần đầu cờ này có việc thật để ghi (sàn
  // ca test frontend 573 → 574), `git diff --stat` ra **5 thêm / 5 xoá** cho
  // một ngưỡng. Vô hại về SỐ, có hại về đúng thứ sổ này bán — "một dòng diff ở
  // đây là một câu hỏi to tiếng".
  //
  // Phép thay neo vào `"ten"` rồi lấy `"moc"` ĐẦU TIÊN sau nó (phần giữa là
  // lazy nên nó không vượt sang mục sau), và nó ĐÒI giá trị cũ khớp — thiếu
  // phép đòi đó thì một sổ đã đổi định dạng sẽ bị ghi sai trong im lặng.
  let van = readFileSync(SO, 'utf8');
  for (const [ten, truoc, nay] of doiMuc) {
    const re = new RegExp(
      '("ten":\\s*"' +
        ten.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '"[\\s\\S]*?"moc":\\s*)(-?[\\d.]+)',
    );
    const m = van.match(re);
    if (!m || Number(m[2]) !== Number(truoc)) {
      console.error(
        `LỖI: không đặt được \`moc\` mới cho "${ten}" — sổ không còn hình dạng ` +
          'mà phép thay này biết đọc. Sửa bằng tay rồi chạy lại.',
      );
      process.exit(1);
    }
    van = van.replace(re, `$1${nay}`);
  }
  writeFileSync(SO, van, 'utf8');
  console.log(`Đã ghi sổ: ${doi} ngưỡng cập nhật.`);
  process.exit(0);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ bang, loi, nhac }, null, 2));
} else {
  console.log(`Ngưỡng một chiều: ${bang.length}/${so.nguong.length} mục đọc được`);
  for (const [ten, chieu, moc, nay] of bang) {
    const dau = nay === moc ? '·' : (chieu === 'ha' ? nay < moc : nay > moc) ? '↑' : '✗';
    console.log(
      `   ${dau} ${ten.padEnd(26)} ${chieu === 'ha' ? 'trần' : 'sàn '} ` +
        `sổ ${String(moc).padStart(5)} / nay ${String(nay).padStart(5)}`,
    );
  }
  for (const m of nhac) console.log(`GHI SỔ: ${m}`);
  for (const m of loi) console.error(`LỖI: ${m}`);
  console.log(loi.length ? `\n${loi.length} lỗi` : '\n0 lỗi');
}
process.exit(loi.length ? 1 : 0);
