#!/usr/bin/env node
/**
 * CỔNG LỜI ĐÒI — mỗi khối code ở màn đọc hoặc CÓ một lời đòi, hoặc im lặng
 * CÓ KHAI LÝ DO. Không có nhóm thứ ba.
 *
 * ── VÌ SAO CÓ FILE NÀY ───────────────────────────────────────────────────
 * Màn đọc in sẵn kết quả dưới mỗi đoạn code. Bằng chứng đã dùng cho `StepTrace`
 * và cho cổng dự đoán output: Hundhausen 2002 tổng hợp 24 thực nghiệm CÓ ĐỐI
 * CHỨNG, và Gurka lặp lại thí nghiệm nhưng BỎ điều kiện "dự đoán trước" thì lợi
 * thế BIẾN MẤT. Nên "khối code có lời đòi hay không" là một tính chất của giáo
 * trình, không phải chi tiết giao diện.
 *
 * `read-guess.test.mjs` đã ghim trần, sàn phủ, phép loại vẽ hình và luật không
 * lộ đáp án. Thứ nó KHÔNG nói: 508 khối chia hết vào những nhóm nào. Một hình
 * dạng THỨ BẢY xuất hiện (gói nguồn đổi, build phát thêm trường) sẽ rơi vào
 * khoảng trống đó và im lặng — đúng lớp lỗi mà `check-duong-toi` và
 * `check-tai-nguyen-chet` sinh ra để chữa, lần này cho NỘI DUNG.
 *
 * ── KHÔNG VÒNG TRÒN ──────────────────────────────────────────────────────
 * Phép phân nhóm ở đây là bản CHÉP ngữ nghĩa của `doanDuocOutput`, và cổng ĐÒI
 * hai bên ra cùng một con số. Chép chứ không import: một bên là TS trong
 * `frontend/src`, bên này là script Node ở gốc repo. Đúng khuôn
 * `insert-gate-sync.test.mjs` — hai bản mô tả của một luật thì SẼ trôi, nên
 * phải có người so chúng. Tự chép rồi chỉ so với chính mình thì cổng rỗng,
 * đúng bài học của `da-nap-hash-sync.spec.ts`.
 *
 * KHÔNG có nhóm cho "khối thiếu `expected`", dù `doanDuocOutput` có nhánh đó:
 * đo trên bản dựng thì CẢ 508 khối đều có `expected`, và một nhóm rỗng là chỗ
 * giấu rác (luật dưới bắt đúng chuyện này — nó ĐỎ ngay lần chạy đầu khi tôi khai
 * nhóm ấy). Ngày một khối thiếu `expected` thật, nó rơi ra ngoài MỌI nhóm và cổng
 * kêu to — hai luật dưới phủ nhau, không cần nhóm rỗng.
 *
 * ── LUẬT HAI CHIỀU ───────────────────────────────────────────────────────
 *   · một khối rơi ra ngoài mọi nhóm đã khai     → LỖI
 *   · một nhóm đã khai mà KHÔNG còn khối nào     → LỖI (khai cũ, giấu rác)
 *   · tổng các nhóm ≠ tổng số khối               → LỖI
 *   · số khối "có cổng" lệch với `doanDuocOutput` → LỖI
 *
 * Chạy:  node scripts/check-doi-hoi.mjs  [--json]
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const doc = (p) => readFileSync(p, 'utf8');

const GOI = JSON.parse(doc(join(GOC, 'scripts', 'pe-da', 'out', 'lessons.json')));
const BAI = GOI.lessons ?? GOI;
const LIB = doc(join(GOC, 'frontend', 'src', 'lib', 'studio-lesson.ts'));

// ---------- đọc luật từ CHÍNH cây mã frontend, không chép con số ------------
const so = (ten) => {
  const m = LIB.match(new RegExp(`${ten}\\s*=\\s*(\\d+)`));
  if (!m) throw new Error(`không đọc được ${ten} từ studio-lesson.ts`);
  return Number(m[1]);
};
const MAX_DONG = so('DOAN_OUTPUT_MAX_DONG');
const MAX_KY_TU = so('DOAN_OUTPUT_MAX_KY_TU');
const mRe = LIB.match(/THU_VIEN_VE_HINH\s*=\s*\/(.+?)\/([gimsuy]*)/);
if (!mRe) throw new Error('không đọc được THU_VIEN_VE_HINH từ studio-lesson.ts');
const VE_HINH = new RegExp(mRe[1], mRe[2]);

const gon = (s) => s.replace(/\s+/g, '');

/**
 * Các nhóm, THEO THỨ TỰ XÉT. Mỗi nhóm phải nói VÌ SAO nó im lặng — một danh
 * sách tên trần thì sáu tháng sau không ai dám đụng vào mục nào.
 */
const NHOM = [
  {
    ma: 'vet',
    doi: true,
    hop: (b) => Boolean(b.trace),
    vi: 'CÓ BẢNG TỪNG BƯỚC. Hỏi hai câu dự đoán trên một khối là ma sát không mua gì.',
  },
  {
    ma: 've-hinh-co-figure',
    doi: true,
    hop: (b, man) => VE_HINH.test(b.code) && man.some((z) => z.type === 'figure'),
    vi:
      'GỌI THƯ VIỆN VẼ HÌNH. `expected` của chúng chỉ là mấy con số in kèm, hỏi ở đó ' +
      'là hỏi về phần PHỤ của đoạn code. Nhưng màn NÀY có khối `figure`, và ' +
      '`doanDuocHinh` dựng cổng dự đoán HÌNH ở đó — nên người học VẪN bị hỏi trước khi ' +
      'thấy kết quả. Đây là lý do con số "có lời đòi" đếm cả nhóm này.',
  },
  {
    ma: 've-hinh-khong-figure',
    doi: false,
    hop: (b) => VE_HINH.test(b.code),
    vi:
      'GỌI THƯ VIỆN VẼ HÌNH nhưng màn KHÔNG có khối `figure` — bài dựng Figure mà không ' +
      'xuất ảnh. Không có hình để hỏi, và `expected` chỉ là con số in kèm. Im lặng đúng.',
  },
  {
    ma: 'qua-dong',
    doi: false,
    hop: (b) =>
      (b.expected ?? '').trim().split('\n').filter((d) => d.trim()).length > MAX_DONG,
    vi:
      `QUÁ ${MAX_DONG} DÒNG. ĐÃ ĐO và ghi lại: trần DÒNG là một PROXY, và nó mis-fire — ` +
      '`khopDapAn` bỏ hết khoảng trắng nên thứ người học thật sự gõ là chuỗi gõ liền. ' +
      'Khối đang có cổng: trung vị 9 ký tự, max 34. Nhóm này: trung vị 20, max 40 — ' +
      'TẤT CẢ nằm trong trần ký tự hiện hành, ngắn nhất là "1\\n2\\n3" tức 3 ký tự. ' +
      'Bỏ trần dòng (giữ nguyên trần ký tự) sẽ cho 303 khối / 133 bài thay vì 262/127. ' +
      'KHÔNG tự làm: AGENTS.md ghi trần này CHỈ ĐƯỢC HẠ, và +41 cổng là thêm ma sát ' +
      'cho người học — quyết định đó của chủ dự án, không của vòng lặp.',
  },
  {
    ma: 'qua-ky-tu',
    doi: false,
    hop: (b) => (b.expected ?? '').trim().length > MAX_KY_TU,
    vi:
      `QUÁ ${MAX_KY_TU} KÝ TỰ. Từ đây "đoán output" thành "chép lại một đoạn": người ` +
      'đoán ĐÚNG vẫn hay nhận "chưa khớp" chỉ vì gõ thiếu một dấu.',
  },
  {
    ma: 'lo-dap-an',
    doi: false,
    hop: (b) => gon(b.code).includes(gon((b.expected ?? '').trim())),
    vi:
      'ĐÁP ÁN NẰM NGUYÊN VĂN TRONG CODE (`print("Xin chào")`). Cổng ở đây chỉ bắt chép ' +
      'lại một chuỗi đang nhìn — im lặng đúng. Cùng luật `gen_traces.py` đã phải đặt.',
  },
  {
    // ĐIỀU KIỆN DƯƠNG, KHÔNG PHẢI BẮT-TẤT. Bản đầu của tôi viết `hop: () => true`
    // ở đây và ablate lộ ra cổng RỖNG: bỏ nhóm `qua-dong` ra thì 54 khối lẽ ra
    // phải RƠI RA ngoài, nhưng bộ bắt-tất nuốt sạch và dán nhãn "CÓ cổng" — tức
    // cổng tự khai khống độ phủ, đúng chiều nguy hiểm. Luật "rơi ra ngoài là
    // LỖI" khi đó không bao giờ chạy tới.
    ma: 'co-cong',
    doi: true,
    hop: (b) => {
      const exp = (b.expected ?? '').trim();
      return (
        // PHẦN BÙ CHÍNH XÁC của `doanDuocOutput`, đủ CẢ SÁU nhánh. Thiếu nhánh
        // nào thì nhóm tương ứng ở trên gỡ ra mà cổng vẫn XANH — đã đo: thiếu
        // `!b.trace` và hai nhánh vẽ hình thì bỏ `vet` / `ve-hinh-*` đều ra
        // 0 đỏ, tức ba nhóm đó không được canh gì cả.
        !b.trace &&
        !VE_HINH.test(b.code) &&
        exp.length > 0 &&
        exp.length <= MAX_KY_TU &&
        exp.split('\n').filter((d) => d.trim()).length <= MAX_DONG &&
        // Phải phản chiếu ĐỦ `doanDuocOutput`, kể cả phép loại "đáp án nằm
        // nguyên văn trong code". Thiếu một nhánh là `co-cong` lại khai khống:
        // ablate bỏ nhóm `lo-dap-an` ra thì 35 khối trôi vào đây và cổng vẫn
        // XANH — tức nó nói 35 khối có cổng trong khi `doanDuocOutput` từ chối
        // cả 35. Đo được đúng 0 lỗi ở lần ablate đó.
        !gon(b.code).includes(gon(exp))
      );
    },
    vi: 'CÓ CỔNG DỰ ĐOÁN OUTPUT.',
  },
];

// ---------- phân nhóm ------------------------------------------------------
const dem = Object.fromEntries(NHOM.map((n) => [n.ma, 0]));
let tong = 0;
const roiRa = [];
for (const x of BAI) {
  const s = x.content_json ?? x;
  for (const man of s.step_1?.read ?? []) {
    for (const b of man) {
      if (b.type !== 'code') continue;
      tong += 1;
      const n = NHOM.find((z) => z.hop(b, man));
      if (!n) {
        roiRa.push(x.lesson_code);
        continue;
      }
      dem[n.ma] += 1;
    }
  }
}

const coDoi = NHOM.filter((n) => n.doi).reduce((a, n) => a + dem[n.ma], 0);
const imLang = tong - coDoi;

// ---------- đối chiếu với CHÍNH `doanDuocOutput` của frontend ---------------
// Chạy lại luật đó bằng bản chép ở trên là tự so với mình. Nên ở đây so với
// SỐ MÀ `read-guess.test.mjs` khoá: nó gọi hàm thật trên bản dựng thật.
const RG = doc(join(GOC, 'frontend', 'e2e', 'unit', 'read-guess.test.mjs'));
const mTong = RG.match(/assert\.equal\(CODE\.length,\s*(\d+)/);

/**
 * SÀN ĐỘ PHỦ — CHỈ ĐƯỢC NÂNG.
 *
 * Phép phân nhóm một mình KHÔNG bắt được một kiểu hỏng: khối trôi từ nhóm CÓ
 * lời đòi sang nhóm IM LẶNG. Ablate đã đo: gỡ nhóm `ve-hinh-co-figure` ra thì
 * 74 khối rơi sang `ve-hinh-khong-figure`, độ phủ tụt **392 → 318** và cổng
 * vẫn XANH vì mọi khối vẫn "thuộc một nhóm đã khai". Sàn là thứ duy nhất nói
 * ra chuyện đó.
 *
 * Đặt dưới số đo thật một chút (392), trên con số mà bản hỏng cho ra (318):
 * ghim đúng 392 thì thêm một bài là đỏ oan — đúng bệnh "14 ca ghi cứng" mà
 * AGENTS.md đã ghi; không ghim gì thì nó tụt dần mà không ai thấy.
 */
const SAN_CO_DOI = 380;

const loi = [];
if (coDoi < SAN_CO_DOI) {
  loi.push(
    `ĐỘ PHỦ TỤT: ${coDoi}/${tong} khối có lời đòi, dưới sàn ${SAN_CO_DOI}. Khối đã trôi ` +
      'từ nhóm CÓ lời đòi sang nhóm im lặng — phép phân nhóm một mình không thấy được.',
  );
}
if (roiRa.length) {
  loi.push(
    `${roiRa.length} khối KHÔNG thuộc nhóm nào đã khai (${[...new Set(roiRa)].slice(0, 5).join(', ')}` +
      `…) — thêm một nhóm vào NHOM kèm lý do, đừng để nó im lặng.`,
  );
}
for (const n of NHOM) {
  if (dem[n.ma] === 0) {
    loi.push(
      `NHÓM RỖNG: "${n.ma}" không còn khối nào — bỏ nó khỏi NHOM, hoặc nội dung đã đổi ` +
        `theo cách chưa ai để ý. Khai cũ để lâu thành chỗ giấu rác.`,
    );
  }
}
if (Object.values(dem).reduce((a, b) => a + b, 0) + roiRa.length !== tong) {
  loi.push('TỔNG LỆCH: các nhóm không cộng lại bằng số khối — phép phân nhóm hỏng.');
}
if (!mTong) {
  loi.push(
    'read-guess.test.mjs không còn khoá tổng số khối (`assert.equal(CODE.length, …)`) — ' +
      'mất mối nối giữa cổng này và hàm thật.',
  );
} else if (Number(mTong[1]) !== tong) {
  loi.push(
    `LỆCH VỚI read-guess.test.mjs: nó khoá ${mTong[1]} khối, cổng này đếm ${tong}. ` +
      'Một trong hai đang nhìn bản dựng cũ.',
  );
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ tong, coDoi, imLang, dem, loi }, null, 2));
} else {
  const pc = ((100 * coDoi) / tong).toFixed(1);
  console.log(`Lời đòi: ${coDoi}/${tong} khối code màn đọc có một lời đòi (${pc}%)`);
  for (const n of NHOM) {
    console.log(`   ${n.doi ? '✓' : '·'} ${n.ma.padEnd(15)} ${String(dem[n.ma]).padStart(4)}  ${n.vi.slice(0, 64)}…`);
  }
  console.log(`\nIM LẶNG: ${imLang} khối, cả ${imLang} đều có lý do đã khai ở trên.`);
  for (const m of loi) console.error(`LỖI: ${m}`);
  console.log(loi.length ? `\n${loi.length} lỗi` : '\n0 lỗi');
}
process.exit(loi.length ? 1 : 0);
