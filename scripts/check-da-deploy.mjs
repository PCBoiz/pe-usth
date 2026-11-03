#!/usr/bin/env node
/**
 * CỔNG "ĐÃ DEPLOY CHƯA" — bản trên `main` có thật sự tới được trình duyệt không.
 *
 * ── VÌ SAO CÓ FILE NÀY ───────────────────────────────────────────────────
 * Repo đã có hai cổng cho hai lớp của cùng một lỗi:
 *   · `check-duong-toi.mjs` — tính năng này có màn nào MOUNT không?
 *   · `check-da-nap.mjs`    — bài này đã vào DB chưa?
 * Và không có gì cho lớp NGOÀI CÙNG: bản đã build có tới được người học không.
 *
 * Sự cố 04/11/2026 cho thấy khoảng trống đó đắt bao nhiêu: production chạy
 * build ngày 29/10, **sau lưng `main` 66 commit**, suốt sáu ngày — trong khi CI
 * xanh, `git push` thành công, và mọi cổng khác đều 0 lỗi. Bốn bề mặt giao diện
 * và một bản sửa phản hồi nằm im trên `main`. Người duy nhất phát hiện là chủ
 * dự án, bằng mắt.
 *
 * ── VÌ SAO KHÔNG DÙNG `ASSET_VERSION` ───────────────────────────────────
 * Luật bump của nó chỉ áp cho `public/`. Đo trên đúng khoảng lệch ấy: 67 commit,
 * **28 chạm `frontend/src/`**, mà `ASSET_VERSION` đổi **2 lần**. Dùng nó làm cổng
 * là cho XANH GIẢ khi production thiếu hàng chục commit chỉ-src — sai theo đúng
 * chiều nguy hiểm. Nên dấu là COMMIT SHA, nhúng ở `<meta name="pe-build">`.
 *
 * ── CẢNH BÁO, KHÔNG ĐỎ — và đây là một lựa chọn ─────────────────────────
 * Deploy là việc của chủ dự án, và một commit vừa push thì ĐÚNG RA là chưa live.
 * Bắt đỏ ở đây là dạy người ta quen với màu đỏ — cùng bài học `DAP_AN_MAU_KHONG_CHAY`
 * và `check-da-nap`. Nó chỉ ĐỎ khi được gọi với `--doi-hoi-moi-nhat`, tức khi
 * người chạy nói rõ "tôi vừa deploy xong, kiểm giúp".
 *
 * Chạy:  node scripts/check-da-deploy.mjs  [--json] [--doi-hoi-moi-nhat]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const TRANG = process.env.PE_PROD_URL || 'https://www.programmingedu.io.vn/';
const NHANH = process.env.PE_PROD_BRANCH || 'tester/main';

const git = (...a) => execFileSync('git', a, { cwd: GOC, encoding: 'utf8' }).trim();

/** `main` cục bộ chỉ là ý kiến của máy này; nhánh mà production theo mới là mốc. */
function mocSo() {
  try {
    return { ref: NHANH, sha: git('rev-parse', '--short', NHANH) };
  } catch {
    return { ref: 'HEAD', sha: git('rev-parse', '--short', 'HEAD') };
  }
}

async function docLive() {
  // `connection: close` — KHÔNG phải trang trí. Không có nó, undici giữ socket
  // trong pool và tiến trình không thoát ngay; đo được: gọi cổng này từ một
  // script khác bằng `execFileSync` thì nó TREO. Một cổng treo là một cổng sẽ
  // bị gỡ khỏi CI.
  const res = await fetch(TRANG, { redirect: 'follow', headers: { connection: 'close' } });
  const html = await res.text();
  const m = html.match(/<meta\s+name="pe-build"\s+content="([^"]*)"/);
  return {
    sha: m ? m[1] : null,
    // `ASSET_VERSION` giữ lại làm dấu PHỤ: nó yếu (chỉ đổi khi `public/` đổi)
    // nhưng nó có mặt trên những bản dựng CŨ HƠN cái thẻ meta này, nên trong
    // giai đoạn chuyển tiếp nó là thứ duy nhất nói được gì đó.
    asset: (html.match(/edu-theme\.css\?v=([0-9a-z-]+)/) ?? [])[1] ?? null,
  };
}

const assetCucBo = (() => {
  const v = readFileSync(join(GOC, 'frontend', 'src', 'lib', 'assetVersion.ts'), 'utf8');
  return (v.match(/ASSET_VERSION = '([^']+)'/) ?? [])[1] ?? null;
})();

const doiHoi = process.argv.includes('--doi-hoi-moi-nhat');
const moc = mocSo();
const loi = [];
const nhac = [];
let live = null;

try {
  live = await docLive();
} catch (e) {
  nhac.push(`Không gọi được ${TRANG} (${e.message}). Cổng này cần mạng — offline thì bỏ qua.`);
}

let sauLung = null;
if (live?.sha && /^[0-9a-f]{7}$/.test(live.sha)) {
  if (live.sha === moc.sha) {
    nhac.push(`Production ĐANG chạy đúng ${moc.ref} (${moc.sha}).`);
  } else {
    try {
      sauLung = Number(git('rev-list', '--count', `${live.sha}..${moc.ref}`));
    } catch {
      sauLung = null;
    }
    const cau =
      `Production chạy ${live.sha}, còn ${moc.ref} ở ${moc.sha}` +
      (sauLung === null ? '' : ` — sau lưng ${sauLung} commit`) +
      '. Deploy là việc của chủ dự án; đây chỉ là phép đo.';
    (doiHoi ? loi : nhac).push(cau);
  }
} else if (live) {
  // Bản dựng cũ hơn thẻ meta này thì không có gì để so — nói thẳng, đừng im.
  nhac.push(
    `Production KHÔNG có thẻ <meta name="pe-build"> — nó đang chạy một bản dựng CŨ HƠN ` +
      `commit thêm thẻ này. Dấu phụ: ASSET_VERSION live ${live.asset ?? '(không đọc được)'} ` +
      `so với ${assetCucBo} ở cây mã.`,
  );
  if (doiHoi) loi.push('Chưa thấy dấu build trên production — chưa deploy bản có thẻ meta.');
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ moc, live, assetCucBo, sauLung, loi, nhac }, null, 2));
} else {
  console.log('ĐÃ DEPLOY CHƯA');
  console.log(`   mốc so     : ${moc.ref} = ${moc.sha}`);
  console.log(`   production : ${live?.sha ?? '(không đọc được)'}  ·  asset ${live?.asset ?? '—'}`);
  console.log(`   cây mã     : asset ${assetCucBo}`);
  for (const m of nhac) console.log(`\n   ${m}`);
  console.log(
    '\nGIỚI HẠN: cổng này so SHA trên dây với một NHÁNH, không chứng minh ' +
      'bản dựng đó đúng với cây mã (ai build tay từ chỗ khác thì nó mù). Và nó ' +
      'CẢNH BÁO chứ không đỏ, trừ khi gọi kèm --doi-hoi-moi-nhat.',
  );
  for (const m of loi) console.error(`LỖI: ${m}`);
  if (loi.length) console.log(`\n${loi.length} lỗi`);
}

// `process.exitCode`, KHÔNG `process.exit()`. Bản đầu gọi `process.exit()` và
// nó đua với pool keep-alive mà `fetch` còn mở: Node trên Windows ném
// `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` rồi thoát với **127**
// — một mã thoát không nói gì về kết quả kiểm, tức cổng vô dụng đúng ở chỗ CI
// đọc nó. Đặt `exitCode` rồi để Node tự đóng handle là hết.
process.exitCode = loi.length ? 1 : 0;
