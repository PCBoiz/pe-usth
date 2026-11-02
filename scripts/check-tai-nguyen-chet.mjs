#!/usr/bin/env node
/**
 * CỔNG TÀI NGUYÊN CHẾT — tệp tĩnh / component nào KHÔNG ai tới được.
 *
 * ── VÌ SAO CÓ FILE NÀY ───────────────────────────────────────────────────
 * `check-duong-toi.mjs` hỏi "tính năng này có ai đi qua không". Đây là câu hỏi
 * NGƯỢC LẠI, và nó cũng là một lỗi im lặng: một tệp trong `public/` không trang
 * nào nạp vẫn được PHỤC VỤ ra Internet, vẫn nằm trong repo, và vẫn làm người
 * đọc tưởng cụm chức năng đó còn sống.
 *
 * Đo lần đầu (03/11/2026): 13 tệp JS (234 KB) + 13 tệp CSS (164 KB) + 9
 * component React không có đường nào tới. Trong đó có `login.inline.js` và
 * `register.inline.js` của một luồng đăng nhập ĐÃ BỎ — mà AGENTS.md thì vẫn
 * đang mô tả `login.inline.js` như một cơ chế đang chạy.
 *
 * Xoá là việc MỘT LẦN. File này là thứ giữ cho nó đúng: thêm một tệp vào
 * `public/static` mà quên nối, hoặc gỡ chỗ nạp cuối cùng của một tệp, là ĐỎ.
 *
 * ── LUẬT HAI CHIỀU ───────────────────────────────────────────────────────
 * Thiếu chiều thứ hai thì danh sách ngoại lệ chỉ dài ra rồi thành chỗ giấu rác
 * — đúng bài học của `DAP_AN_MAU_KHONG_CHAY`. Nên:
 *   · không ai tới được mà KHÔNG khai  → LỖI
 *   · khai "giữ dù chết" mà thật ra ĐÃ CÓ đường tới → cũng LỖI
 *
 * Chạy:  node scripts/check-tai-nguyen-chet.mjs  [--json]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const FE = join(GOC, 'frontend');

/**
 * Tệp không ai tới được nhưng CỐ Ý giữ. Mỗi mục phải nói VÌ SAO — một danh
 * sách tên trần thì sáu tháng sau không ai dám xoá mục nào.
 */
const GIU_DU_CHET = {
  'js/dashboard.js':
    'e2e/unit/forum-xss.test.mjs ĐỌC file này từ đĩa để chứng minh escHtml ' +
    'trung hoà payload XSS (test `forum-xss`, 1 ca). Xoá file là bộ test đỏ. ' +
    'NÓI THẲNG giới hạn: forum không có trang nào nạp dashboard.js, nên ca đó ' +
    'đang canh một đường KHÔNG AI ĐI QUA — nó chống hồi quy cho ngày forum ' +
    'quay lại, không chứng minh hôm nay có ai được bảo vệ.',
};

const boChuThich = (v) =>
  v.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(\/\/|\*)\s.*$/gm, '');

function liet(thuMuc, duoi) {
  const ra = [];
  const di = (d) => {
    let muc;
    try {
      muc = readdirSync(d);
    } catch {
      return;
    }
    for (const m of muc) {
      const p = join(d, m);
      if (statSync(p).isDirectory()) di(p);
      else if (duoi.some((e) => m.endsWith(e))) ra.push(p);
    }
  };
  di(thuMuc);
  return ra;
}

const doc = (p) => readFileSync(p, 'utf8');
const duongUrl = (p, goc) => relative(goc, p).split(sep).join('/');

/**
 * Khả đạt = được `src/` (ứng dụng Next) gọi tên, HOẶC được một tệp đã khả đạt
 * gọi tên. Lan truyền là BẮT BUỘC: `main.js` nạp `pe-bridge.js`, nên chỉ nhìn
 * `src/` thôi sẽ báo oan cho tầng thứ hai.
 *
 * Và phải BỎ CHÚ THÍCH ở cả hai phía. Đây là chỗ bản quét đầu của tôi sai, sai
 * theo chiều nguy hiểm (báo "còn sống" cho thứ đã chết): `edu-dashboard.js`
 * chỉ được NHẮC TÊN trong một chú thích ở `assetVersion.ts`, còn `main.js` thì
 * nhắc `edu-chrome.js`/`course_detail.js` cũng chỉ trong chú thích.
 */
function khaDat(tepTinh, tenCuaTep, vanNguon, tienTo) {
  // HẠT GIỐNG LÀ ĐƯỜNG DẪN ĐẦY ĐỦ (`/static/css/theme.css`), KHÔNG phải tên
  // trần. Bản đầu của tôi so bằng tên trần và nó chỉ tìm ra 5/13 tệp CSS chết —
  // vì bảng `RANK` trong `PageStyles.tsx` liệt kê `'theme.css': 10` làm khoá
  // sắp thứ tự, và một hàng trong bảng thứ tự KHÔNG phải một lời nạp. Âm tính
  // giả, tức đúng chiều nguy hiểm: cổng im lặng cho qua thứ đã chết.
  const dat = new Set(
    tepTinh.filter((p) => vanNguon.includes(`${tienTo}${tenCuaTep.get(p)}`)),
  );
  const doi = [...dat];
  while (doi.length) {
    const v = boChuThich(doc(doi.pop()));
    for (const p of tepTinh) {
      if (!dat.has(p) && v.includes(tenCuaTep.get(p))) {
        dat.add(p);
        doi.push(p);
      }
    }
  }
  return dat;
}

const loi = [];
const chet = [];

// ---------- nguồn: chỉ code THẬT của ứng dụng, không test, không chú thích ----
const nguon = liet(join(FE, 'src'), ['.ts', '.tsx']).filter(
  (p) => !p.includes('.test.'),
);
const vanNguon = boChuThich(nguon.map(doc).join('\n'));

// ---------- 1. JS và CSS tĩnh ---------------------------------------------
for (const [thuMuc, nhan] of [
  ['js', 'js'],
  ['css', 'css'],
]) {
  const goc = join(FE, 'public', 'static', thuMuc);
  const tep = liet(goc, [`.${nhan === 'js' ? 'js' : 'css'}`]);
  const ten = new Map(tep.map((p) => [p, duongUrl(p, goc)]));
  const dat = khaDat(tep, ten, vanNguon, `/static/${thuMuc}/`);
  for (const p of tep) {
    if (!dat.has(p)) chet.push([`${thuMuc}/${ten.get(p)}`, statSync(p).size]);
  }
}

// ---------- 2. component React không ai import ----------------------------
// Chỉ xét `components/`: `app/` đi theo quy ước định tuyến của Next (page,
// layout, route…), ở đó "không ai import" là chuyện BÌNH THƯỜNG chứ không phải
// lỗi — kiểm nhầm chỗ là một cổng kêu oan, mà cổng kêu oan thì sẽ bị tắt.
const comp = liet(join(FE, 'src', 'components'), ['.tsx']).filter(
  (p) => !p.includes('.test.'),
);
for (const p of comp) {
  const ten = p.split(sep).pop().replace(/\.tsx$/, '');
  const khac = nguon.filter((q) => q !== p).map(doc).join('\n');
  // So trên bản ĐÃ BỎ CHÚ THÍCH: chín component dưới đây từng trông như còn
  // sống đúng vì tên chúng xuất hiện trong chú thích của component bên cạnh.
  if (!new RegExp(`\\b${ten}\\b`).test(boChuThich(khac))) {
    chet.push([`component/${ten}.tsx`, statSync(p).size]);
  }
}

// ---------- 3. đối chiếu hai chiều với danh sách ngoại lệ ------------------
const tenChet = new Set(chet.map(([t]) => t));
const chuaKhai = chet.filter(([t]) => !(t in GIU_DU_CHET));
for (const [t, kb] of chuaKhai) {
  loi.push(
    `KHÔNG AI TỚI ĐƯỢC: ${t} (${kb} byte) — xoá nó, hoặc nối nó vào một trang, ` +
      `hoặc khai vào GIU_DU_CHET kèm lý do.`,
  );
}
for (const t of Object.keys(GIU_DU_CHET)) {
  if (!tenChet.has(t)) {
    loi.push(
      `NGOẠI LỆ ĐÃ LỖI THỜI: ${t} nay ĐÃ có đường tới — bỏ nó khỏi GIU_DU_CHET.`,
    );
  }
}

const tongByte = chuaKhai.reduce((a, [, b]) => a + b, 0);
if (process.argv.includes('--json')) {
  console.log(
    JSON.stringify({ chet, chuaKhai, giuDuChet: GIU_DU_CHET, loi }, null, 2),
  );
} else {
  console.log(
    `Tài nguyên chết: ${chet.length} mục · ${Object.keys(GIU_DU_CHET).length} ` +
      `khai giữ · ${chuaKhai.length} chưa khai (${(tongByte / 1024).toFixed(0)} KB)`,
  );
  for (const [t, kb] of chuaKhai) console.log(`   ${t}  ${kb} B`);
  for (const m of loi) console.error(`LỖI: ${m}`);
  console.log(loi.length ? `\n${loi.length} lỗi` : '\n0 lỗi');
}
process.exit(loi.length ? 1 : 0);
