#!/usr/bin/env node
/**
 * CỔNG MỐC NỀN — bảng trong AGENTS.md phải nói đúng cây mã.
 *
 * ── VÌ SAO CÓ FILE NÀY ───────────────────────────────────────────────────
 * Bảng "Mốc nền" là thứ LOOP.md dùng làm TÍN HIỆU DỪNG máy-đọc-được: một vòng
 * lặp tự kiểm chỉ đáng tin bằng con số nó tự so với. Mà chính AGENTS.md đã ghi
 * lại hai lần bảng đó NÓI SAI:
 *   · nó từng ghi **204** ca test frontend trong khi cây mã chỉ có 134 — 70 ca
 *     "tưởng có mà không có", sống sót vì phép đếm bằng `grep -E "^. pass"`
 *     trả RỖNG mà không báo lỗi;
 *   · và ngày 04/11/2026 nó ghi **16** CSS module trong `src/` trong khi có
 *     **15** — con số được đo TRƯỚC khi xoá một file mồ côi, rồi cả hai cùng
 *     vào một commit. Hai vòng lặp trôi qua, không bộ kiểm nào thấy.
 *
 * Đó không phải chú thích lỗi thời vô hại. Nó là một phép kiểm tưởng có mà
 * không có — đúng lớp lỗi thống trị của repo này, lần này nằm ở tài liệu.
 *
 * ── CỔNG NÀY KIỂM ĐƯỢC GÌ, VÀ KHÔNG KIỂM ĐƯỢC GÌ ─────────────────────────
 * Chỉ các con số DẪN XUẤT ĐƯỢC rẻ: từ `scripts/pe-da/out/lessons.json` và từ
 * cây tệp. Những con số cần CHẠY một bộ (518 ca frontend, 485 ca backend, 104
 * lỗi lint, 65 phép kiểm tracer) thì nó KHÔNG kiểm — và phải KHAI RA, vì một
 * danh sách im lặng về chỗ nó không với tới được sẽ bị đọc thành "đã phủ hết".
 * Đó đúng là cách con số 204 sống sót.
 *
 * ── LUẬT HAI CHIỀU ───────────────────────────────────────────────────────
 *   · bảng ghi khác số đo  → LỖI
 *   · bảng KHÔNG còn dòng mà cổng đang tìm → cũng LỖI (đổi chữ trong bảng mà
 *     cổng im lặng cho qua thì nó rỗng, đúng bệnh đã gặp ở `check-duong-toi`)
 *
 * Chạy:  node scripts/check-moc-nen.mjs  [--json]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const doc = (p) => readFileSync(p, 'utf8');

const AGENTS = doc(join(GOC, 'AGENTS.md'));
const GOI = JSON.parse(doc(join(GOC, 'scripts', 'pe-da', 'out', 'lessons.json')));
const BAI = GOI.lessons ?? GOI;
const noiDung = (x) => x.content_json ?? x;

/** Liệt tệp theo đuôi, bỏ qua thư mục không tồn tại. */
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

// ---------- số ĐO được, tính từ nguồn sự thật ------------------------------
const dem = { manDoc: 0, tracNghiem: 0, luyenTap: 0, baiTap: 0, ca: 0, phut: 0 };
const mode = {};
const module_ = new Set();
for (const x of BAI) {
  const s = noiDung(x);
  dem.manDoc += (s.step_1?.read ?? []).length;
  dem.tracNghiem += (s.step_2?.mcq ?? []).length;
  dem.luyenTap += (s.step_2?.practice ?? []).length;
  const t = (s.step_4?.tests ?? []).length;
  if (t) {
    dem.baiTap += 1;
    dem.ca += t;
  }
  dem.phut += x.estimated_minutes ?? 0;
  if (x.module != null) module_.add(x.module);
  mode[x._mode ?? '-'] = (mode[x._mode ?? '-'] ?? 0) + 1;
}

const FE = join(GOC, 'frontend');
const doDuoc = {
  bai: BAI.length,
  module: module_.size,
  manDoc: dem.manDoc,
  tracNghiem: dem.tracNghiem,
  luyenTap: dem.luyenTap,
  baiTap: dem.baiTap,
  ca: dem.ca,
  phut: dem.phut,
  pyodide: mode.pyodide ?? 0,
  honHop: mode.mixed ?? 0,
  trenMay: mode.local ?? 0,
  tepTest: liet(join(FE, 'e2e', 'unit'), ['.test.mjs']).length,
  cssModule: liet(join(FE, 'src'), ['.module.css']).length,
};

/**
 * Mỗi mục: một BIỂU THỨC CHÍNH QUY bắt đúng con số trong bảng, và khoá của số
 * đo tương ứng. Regex phải neo vào ĐỦ chữ xung quanh để không bắt nhầm một số
 * khác trong cùng dòng — `bai` mà chỉ tìm `179` thì cũng khớp "179/179 bài" ở
 * dòng khác, và khi đó cổng xanh vì lý do sai.
 *
 * Số trong bảng viết theo kiểu Việt: dấu CÁCH ngăn nhóm nghìn ("2 441"), và đó
 * là U+00A0 hay dấu cách thường tuỳ chỗ — nên bóc xong phải bỏ mọi khoảng
 * trắng trước khi so.
 */
const DOI_CHIEU = [
  ['bai', /\*\*(\d+) bài, \d+ module\*\*/, 'số bài pe-da'],
  ['module', /\*\*\d+ bài, (\d+) module\*\*/, 'số module'],
  ['manDoc', /\*\*\d+ bài, \d+ module\*\*, ([\d\s ]+?) màn đọc/, 'số màn đọc'],
  ['tracNghiem', /\*\*([\d\s ]+?) câu trắc nghiệm\*\*/, 'số câu trắc nghiệm'],
  ['luyenTap', /([\d\s ]+?) câu luyện tập/, 'số câu luyện tập'],
  ['baiTap', /\*\*(\d+) bài tập được chấm \/ \d+ ca\*\*/, 'số bài tập được chấm'],
  ['ca', /\*\*\d+ bài tập được chấm \/ (\d+) ca\*\*/, 'số ca chấm'],
  ['phut', /ca\*\*, ([\d\s ]+?) phút;/, 'tổng thời lượng (phút)'],
  ['pyodide', /; (\d+) bài chạy trong trình duyệt/, 'số bài chạy trong trình duyệt'],
  ['honHop', /bài chạy trong trình duyệt \/ (\d+) hỗn hợp/, 'số bài hỗn hợp'],
  ['tenMayBoQua', /(\d+) trên máy/, 'số bài chạy trên máy'],
  ['tepTest', /\*\*\d+ ca\*\* \/ (\d+) tệp, tất cả đạt/, 'số tệp test frontend'],
  ['cssModule', /\*\*(\d+) CSS module trong `src\/`\*\*/, 'số CSS module trong src/'],
];
// `tenMayBoQua` dùng khoá khác để regex không đụng nhau; ánh xạ lại ở đây.
const ANH_XA = { tenMayBoQua: 'tenMay' };
doDuoc.tenMay = doDuoc.trenMay ?? doDuoc.tenMay ?? mode.local ?? 0;

const loi = [];
const bang = [];
for (const [khoa, re, ten] of DOI_CHIEU) {
  const m = AGENTS.match(re);
  if (!m) {
    loi.push(
      `KHÔNG CÒN DÒNG: không tìm thấy "${ten}" trong bảng mốc nền — bảng đã đổi ` +
        `chữ, hoặc mục này bị xoá. Sửa regex trong check-moc-nen.mjs cho khớp, ` +
        `đừng để cổng im lặng.`,
    );
    continue;
  }
  const ghi = Number(m[1].replace(/[\s ]/g, ''));
  const that = doDuoc[ANH_XA[khoa] ?? khoa];
  bang.push([ten, ghi, that]);
  if (ghi !== that) {
    loi.push(
      `LỆCH: ${ten} — bảng ghi ${ghi}, đo được ${that}. Sửa AGENTS.md (và nhớ ` +
        `rằng con số đó là TÍN HIỆU DỪNG của vòng lặp, không phải chú thích).`,
    );
  }
}

/**
 * KHAI RÕ chỗ cổng này KHÔNG với tới. Im lặng ở đây thì danh sách trên bị đọc
 * thành "bảng đã được kiểm hết", mà đó đúng là cách con số 204 sống sót.
 */
const KHONG_KIEM_DUOC = [
  'Backend test 485 ca · Backend lint 104 lỗi · Frontend lint 139 cảnh báo · ' +
    'Frontend unit 518 ca · tracer 65 phép kiểm — đều phải CHẠY một bộ mới biết, ' +
    'nên chúng nằm ngoài cổng này. Đổi chúng thì vẫn phải tự đo.',
  'Các con số của pe-v4 (48 bài / 427 ca) — gói đó không còn xuất bản và bản ' +
    'dựng của nó không nằm trong đường đi hằng ngày.',
];

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ doDuoc, bang, loi, khongKiemDuoc: KHONG_KIEM_DUOC }, null, 2));
} else {
  console.log(`Mốc nền: ${bang.length}/${DOI_CHIEU.length} mục đối chiếu được`);
  for (const [ten, ghi, that] of bang) {
    console.log(`   ${ghi === that ? '·' : '✗'} ${ten}: bảng ${ghi} / đo ${that}`);
  }
  console.log('\nNGOÀI TẦM cổng này (phải tự đo):');
  for (const m of KHONG_KIEM_DUOC) console.log(`   – ${m}`);
  for (const m of loi) console.error(`LỖI: ${m}`);
  console.log(loi.length ? `\n${loi.length} lỗi` : '\n0 lỗi');
}
process.exit(loi.length ? 1 : 0);
