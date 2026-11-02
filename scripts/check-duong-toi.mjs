// Kiểm BẢN ĐỒ TÍNH NĂNG: mỗi tính năng có đường tới người học không?
//
//   node scripts/check-duong-toi.mjs            # bảng cho người đọc
//   node scripts/check-duong-toi.mjs --json     # máy đọc
//
// Bộ này KHÔNG kiểm code chạy đúng — bảy bộ kiểm khác đã làm việc đó. Nó kiểm
// đúng một thứ mà không bộ nào khác kiểm: **có ai đi qua không.** Repo này đã
// mười lần dựng xong một tính năng rồi để nó tối, và mỗi lần bộ kiểm vẫn xanh.
//
// BỐN LUẬT, mỗi luật chặn một kiểu hỏng khác nhau:
//
//  1. `thucHien` phải TRỎ TRÚNG: file có thật, và nếu khai `file:kýHiệu` thì ký
//     hiệu đó phải có trong file. Đổi tên hàm mà quên sửa bản đồ ⇒ bản đồ nói
//     về một thứ không còn tồn tại, đúng họ "sơ đồ đã trôi khỏi bài".
//  2. `mount` phải có thật VÀ phải nhắc tới `thucHien` (hoặc tới một ký hiệu
//     của nó). Đây là luật quan trọng nhất: nó là phép kiểm "ai bấm vào nó".
//  3. `dem()` chạy trên BẢN DỰNG THẬT phải ≥ `toiThieu`. Con số tụt xuống nghĩa
//     là một đợt build vừa cắt mất đường tới mà không ai thấy.
//  4. `toiThieu: 0` BẮT BUỘC kèm `chuaCoDuongToi`. "Chưa ai đi qua" được phép
//     tồn tại — im lặng thì không.
//
// Và luật thứ năm, ngược chiều: `chuaCoDuongToi` mà `dem()` > 0 cũng là LỖI —
// lời khai đã lỗi thời, tính năng nay CÓ người đi qua rồi. Không có luật này
// thì bản đồ chỉ trôi theo một chiều và dần thành một danh sách than thở.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BAN_DO } from './ban-do-tinh-nang.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_RA = process.argv.includes('--json');
const loi = [];
const canhBao = [];

const doc = (p) => readFileSync(join(ROOT, p), 'utf8');

/** Tách "file.ts:kýHiệu" thành [file, kýHiệu|null]. */
function tach(ref) {
  // Cẩn thận ổ đĩa Windows (C:\...) — chỉ tách dấu hai chấm CUỐI, và chỉ khi
  // phần sau không chứa dấu phân cách đường dẫn.
  const i = ref.lastIndexOf(':');
  if (i <= 0) return [ref, null];
  const sau = ref.slice(i + 1);
  if (!sau || /[\\/]/.test(sau)) return [ref, null];
  return [ref.slice(0, i), sau];
}

const bai = JSON.parse(doc('scripts/pe-da/out/lessons.json')).lessons;

// `doanDuocOutput` là luật của frontend (TypeScript) — bộ này chạy bằng Node
// thuần nên không import .ts được. Chép phép lọc ở đây thì nó sẽ TRÔI, nên thay
// vì chép, đọc hai hằng trần từ chính cây mã và dựng lại phép lọc từ chúng:
// lệch trần là bộ này đếm khác ngay.
const SRC_SL = doc('frontend/src/lib/studio-lesson.ts');
const soTu = (ten) => {
  const m = SRC_SL.match(new RegExp(`${ten}\\s*=\\s*(\\d+)`));
  if (!m) loi.push(`không đọc được hằng ${ten} từ studio-lesson.ts`);
  return m ? Number(m[1]) : 0;
};
const MAX_DONG = soTu('DOAN_OUTPUT_MAX_DONG');
const MAX_KY_TU = soTu('DOAN_OUTPUT_MAX_KY_TU');
const VE_HINH = /\bplt\.|matplotlib|\bsns\.|plotly|ipywidgets|\.savefig\(/;

function doanDuocOutput(b) {
  if (b.type !== 'code') return false;
  const exp = (b.expected ?? '').trim();
  if (!exp || b.trace) return false;
  if (VE_HINH.test(b.code)) return false;
  if (exp.split('\n').filter((d) => d.trim()).length > MAX_DONG) return false;
  if (exp.length > MAX_KY_TU) return false;
  const gon = (s) => s.replace(/\s+/g, '');
  return !gon(b.code).includes(gon(exp));
}

const ctx = { bai, doanDuocOutput };
const ra = [];

for (const tn of BAN_DO) {
  const [fThuc, kyHieu] = tach(tn.thucHien);
  // 1. thực hiện trỏ trúng
  if (!existsSync(join(ROOT, fThuc))) {
    loi.push(`${tn.id}: thucHien trỏ vào file không có — ${fThuc}`);
  } else if (kyHieu && !doc(fThuc).includes(kyHieu)) {
    loi.push(`${tn.id}: ${fThuc} không còn ký hiệu '${kyHieu}' — bản đồ đã trôi`);
  }

  // 2. mount có thật và NHẮC TỚI phần thực hiện
  if (tn.mount) {
    if (!existsSync(join(ROOT, tn.mount))) {
      loi.push(`${tn.id}: mount trỏ vào file không có — ${tn.mount}`);
    } else if (tn.mount !== fThuc) {
      const src = doc(tn.mount);
      // Hai nửa viết bằng HAI ngôn ngữ (build Python → renderer TSX) thì không
      // bao giờ nhắc tên hàm của nhau — cảnh báo theo ký hiệu ở đó đúng 0% số
      // lần, và một cổng kêu oan là một cổng sẽ bị tắt. Với cặp đó, thứ NỐI hai
      // nửa là KHOÁ DỮ LIỆU, nên `duLieu` mới là cái phải khớp.
      const moc = tn.duLieu ?? kyHieu;
      const ten = fThuc.split(/[\\/]/).pop().replace(/\.\w+$/, '');
      // So bằng phép CHUẨN HOÁ, không bằng regex: bỏ `?` và mọi khoảng
      // trắng ở CẢ hai vế rồi `includes`. `four?.task?.io` thành
      // `four.task.io`, chứa `task.io`; một file không liên quan thì không.
      //
      // Bản đầu rơi về MẢNH CUỐI khi cả đường không khớp — và ablate bắt
      // được ngay: mảnh cuối của `task?.io` là `io`, HAI ký tự, có mặt
      // trong `version`/`option`/`programmingedu.io.vn`, nên một mount trỏ
      // vào `api.ts` vẫn qua cửa. Bậc "ai bấm vào nó" là bậc quan trọng
      // nhất của bộ này; nới nó là bỏ luôn lý do bộ này tồn tại.
      const chuan = (x) => x.replace(/[?]/g, "").replace(/\s+/g, "");
      if (moc && !chuan(src).includes(chuan(moc)) && !src.includes(ten))
        loi.push(
          `${tn.id}: ${tn.mount} không nhắc tới '${moc}' lẫn '${ten}' — ` +
            `không có dấu hiệu nào cho thấy nó dựng tính năng này`,
        );
    }
  } else if (!tn.chuaCoDuongToi) {
    loi.push(`${tn.id}: không có mount và cũng không khai chuaCoDuongToi`);
  }

  // 3 + 4 + 5. phép đếm trên dữ liệu thật
  let n = 0;
  try {
    n = tn.dem(ctx);
  } catch (e) {
    loi.push(`${tn.id}: dem() ném lỗi — ${e.message}`);
  }
  if (tn.toiThieu === 0 && !tn.chuaCoDuongToi)
    loi.push(`${tn.id}: toiThieu 0 thì PHẢI khai chuaCoDuongToi kèm lý do`);
  if (n < tn.toiThieu)
    loi.push(
      `${tn.id}: chỉ ${n} chỗ người học tới được, sàn là ${tn.toiThieu} — ` +
        `một đợt dựng vừa cắt mất đường tới`,
    );
  if (tn.chuaCoDuongToi && n > 0)
    loi.push(
      `${tn.id}: khai "chưa có đường tới" nhưng đếm được ${n} chỗ — ` +
        `lời khai đã lỗi thời, xoá chuaCoDuongToi và đặt lại toiThieu`,
    );

  ra.push({ id: tn.id, ten: tn.ten, man: tn.manHinh, dem: n, san: tn.toiThieu, toi: !tn.chuaCoDuongToi });
}

if (JSON_RA) {
  console.log(JSON.stringify({ tinhNang: ra, loi, canhBao }, null, 2));
} else {
  const sang = ra.filter((x) => x.toi);
  const toi = ra.filter((x) => !x.toi);
  console.log(`BẢN ĐỒ TÍNH NĂNG — ${ra.length} mục trên bản dựng ${bai.length} bài\n`);
  console.log('CÓ ĐƯỜNG TỚI NGƯỜI HỌC:');
  for (const x of sang)
    console.log(`  ${String(x.dem).padStart(5)} chỗ · ${x.man.padEnd(10)} · ${x.ten}`);
  console.log('\nCHƯA CÓ ĐƯỜNG TỚI (đã khai lý do):');
  for (const x of toi) console.log(`  ${String(x.dem).padStart(5)} chỗ · ${x.ten}`);
  for (const c of canhBao) console.log(`\n! ${c}`);
  console.log(`\n${ra.length} tính năng · ${sang.length} có đường tới · ${toi.length} còn tối · ${loi.length} lỗi`);
}

for (const l of loi) console.error(`LỖI: ${l}`);
process.exit(loi.length ? 1 : 0);
