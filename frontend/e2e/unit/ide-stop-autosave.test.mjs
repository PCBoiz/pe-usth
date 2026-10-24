// Nút Dừng + tự lưu mã của /ide: phần LOGIC THUẦN trong src/lib/ide-runner.ts.
//
// VÌ SAO CÓ FILE NÀY — hai hỏng hóc im lặng, cả hai chỉ lộ ra trước mặt người
// dùng chứ không làm đỏ bất cứ thứ gì:
//
//  1. THỨ TỰ NGUỒN MÃ. Người học bấm "Thử ngay trong IDE" trên trang bài học
//     là mở `/ide#code=…`. Nếu bản tự lưu trong localStorage thắng cái hash
//     đó, họ mở link của BÀI và thấy đoạn mã cũ của chính mình — không ngoại
//     lệ nào được ném, không log nào đỏ, chỉ là một đoạn mã sai. Đó là đường
//     đi chính từ giáo trình sang IDE nên hỏng ở đây là hỏng chỗ dễ thấy nhất.
//
//  2. localStorage NÉM. Chrome ném SecurityError khi người dùng chặn "site
//     data", Safari riêng tư ném khi hết quota, và trong iframe khác origin thì
//     CHÍNH PHÉP ĐỌC thuộc tính `localStorage` đã là lỗi. Một lần ném không bắt
//     ở đường khởi tạo state là /ide trắng trang.
//
// ĐÃ GỠ TỪNG BẢN SỬA RA VÀ CHẠY THẬT (25/10/2026) — số ca trượt đo được, không
// phải đoán:
//  · đảo thứ tự trong `pickIdeOpeningCode` (cho `savedCode` thắng `hashCode`)
//    → 2 ca trượt;
//  · bỏ try/catch trong `loadIdeCode`/`saveIdeCode`/`clearIdeCode`
//    → 3 ca trượt (ngoại lệ ném thẳng ra ngoài);
//  · `countdownSeconds`: đổi `ceil` thành `floor` → 1 ca trượt; bỏ chốt chặn
//    đồng hồ rác (`Number.isFinite`) → 1 ca; bỏ `Math.max(0, …)` → 1 ca.
import { strict as assert } from 'node:assert';
import test from 'node:test';

import {
  countdownSeconds,
  ideRunnerMode,
  needsLinkConfirm,
  IDE_AUTOSAVE_KEY,
  IDE_COUNTDOWN_FROM_MS,
  IDE_RUN_TIMEOUT_MS,
  MAX_IDE_AUTOSAVE_CHARS,
  clearIdeCode,
  loadIdeCode,
  pickIdeOpeningCode,
  saveIdeCode,
} from '../../src/lib/ide-runner.ts';

const MAC_DINH = 'print("Xin chào")\n';

/** Kho giả thay localStorage: nhớ được, và không ném. */
function khoGia(banDau = {}) {
  const o = { ...banDau };
  return {
    o,
    getItem: (k) => (k in o ? o[k] : null),
    setItem: (k, v) => {
      o[k] = String(v);
    },
    removeItem: (k) => {
      delete o[k];
    },
  };
}

/** Kho NÉM ở mọi lời gọi — chế độ riêng tư, site data bị chặn. */
const khoNem = {
  getItem() {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  },
  setItem() {
    throw new DOMException('QuotaExceededError', 'QuotaExceededError');
  },
  removeItem() {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  },
};

// --- ĐẾM NGƯỢC ------------------------------------------------------------

test('đếm ngược: còn sớm thì KHÔNG hiện gì', () => {
  // Lần chạy bình thường xong dưới 1 giây; bắt nó nhìn đồng hồ tụt là làm
  // người học lo vô cớ.
  assert.equal(countdownSeconds(0), null);
  assert.equal(countdownSeconds(3_000), null);
  assert.equal(countdownSeconds(IDE_RUN_TIMEOUT_MS - IDE_COUNTDOWN_FROM_MS - 1), null);
});

test('đếm ngược: bật đúng tại mốc 5 giây cuối', () => {
  assert.equal(countdownSeconds(IDE_RUN_TIMEOUT_MS - IDE_COUNTDOWN_FROM_MS), 5);
});

test('đếm ngược: nửa giây cuối hiện 1, không hiện 0', () => {
  // `ceil`: hiện 0 trong khi chương trình còn chạy là nói sai, và người đọc sẽ
  // tưởng giao diện treo.
  assert.equal(countdownSeconds(IDE_RUN_TIMEOUT_MS - 500), 1);
  assert.equal(countdownSeconds(IDE_RUN_TIMEOUT_MS - 1), 1);
});

test('đếm ngược: quá giờ thì kẹp về 0, không bao giờ âm', () => {
  assert.equal(countdownSeconds(IDE_RUN_TIMEOUT_MS), 0);
  assert.equal(countdownSeconds(IDE_RUN_TIMEOUT_MS + 4_000), 0);
});

test('đếm ngược: đồng hồ cho số rác thì im, không đoán', () => {
  // NaN xảy ra khi mốc chưa có (startedAt = 0 trừ performance.now()); số âm
  // khi mốc lấy sai. Thà không đếm còn hơn đếm sai rồi cắt sớm.
  assert.equal(countdownSeconds(Number.NaN), null);
  assert.equal(countdownSeconds(-1), null);
  assert.equal(countdownSeconds(Number.POSITIVE_INFINITY), null);
});

test('đếm ngược: trần riêng cho người gọi vẫn được tôn trọng', () => {
  assert.equal(countdownSeconds(1_000, 5_000), 4);
  assert.equal(countdownSeconds(1_000, 30_000), null);
});

test('mốc đếm ngược phải NGẮN HƠN trần chạy, không thì đếm suốt cả lần chạy', () => {
  assert.ok(
    IDE_COUNTDOWN_FROM_MS < IDE_RUN_TIMEOUT_MS,
    `${IDE_COUNTDOWN_FROM_MS} phải nhỏ hơn ${IDE_RUN_TIMEOUT_MS}`,
  );
});

// --- THỨ TỰ NGUỒN MÃ LÚC MỞ TRANG -----------------------------------------

test('`#code=` THẮNG bản tự lưu — nút "Thử ngay trong IDE" phải cho ra mã của BÀI', () => {
  const r = pickIdeOpeningCode({
    hashCode: 'print("mã của bài học")',
    savedCode: 'print("mã cũ của tôi")',
    defaultCode: MAC_DINH,
  });
  assert.equal(r.code, 'print("mã của bài học")');
  assert.equal(r.source, 'hash');
});

test('`#code=` thắng kể cả khi bản tự lưu dài hơn / mới hơn', () => {
  const r = pickIdeOpeningCode({
    hashCode: 'x = 1',
    savedCode: 'y = 2\n'.repeat(500),
    defaultCode: MAC_DINH,
  });
  assert.equal(r.code, 'x = 1');
  assert.equal(r.source, 'hash');
});

test('hash méo (ide-handoff trả null) thì tới lượt bản tự lưu', () => {
  // `readIdeCodeFromHash` trả null cho tham số méo/quá dài — không được để nó
  // chặn luôn cả bản tự lưu.
  const r = pickIdeOpeningCode({ hashCode: null, savedCode: 'a = 1', defaultCode: MAC_DINH });
  assert.equal(r.code, 'a = 1');
  assert.equal(r.source, 'autosave');
});

test('hash rỗng / chỉ khoảng trắng KHÔNG tính là có bàn giao', () => {
  for (const h of ['', '   \n\t ']) {
    const r = pickIdeOpeningCode({ hashCode: h, savedCode: 'a = 1', defaultCode: MAC_DINH });
    assert.equal(r.source, 'autosave', `hash ${JSON.stringify(h)} lại thắng`);
  }
});

test('bản tự lưu TRÙNG ví dụ mặc định thì không phải "khôi phục"', () => {
  // Người mở /ide lần đầu cũng được lưu ngay ví dụ mặc định; báo "đã khôi phục
  // mã của bạn" cho đoạn mã họ chưa hề gõ là nói sai.
  const r = pickIdeOpeningCode({ hashCode: null, savedCode: MAC_DINH, defaultCode: MAC_DINH });
  assert.equal(r.code, MAC_DINH);
  assert.equal(r.source, 'default');
});

test('bản tự lưu rỗng / chỉ khoảng trắng → ví dụ mặc định, không mở editor trắng', () => {
  for (const s of [null, undefined, '', '  \n  ']) {
    const r = pickIdeOpeningCode({ hashCode: null, savedCode: s, defaultCode: MAC_DINH });
    assert.equal(r.code, MAC_DINH, `savedCode ${JSON.stringify(s)} ra mã rỗng`);
    assert.equal(r.source, 'default');
  }
});

// --- ĐỌC/GHI KHÔNG ĐƯỢC NÉM ----------------------------------------------

test('vòng ghi → đọc hoạt động thật (nếu ca này đạt mà ca "ném" cũng đạt thì mới có nghĩa)', () => {
  const kho = khoGia();
  saveIdeCode('for i in range(3): print(i)', kho);
  assert.equal(kho.o[IDE_AUTOSAVE_KEY], 'for i in range(3): print(i)');
  assert.equal(loadIdeCode(kho), 'for i in range(3): print(i)');
  clearIdeCode(kho);
  assert.equal(loadIdeCode(kho), null);
});

test('localStorage ném lúc ĐỌC: trả null, không ném ra ngoài', () => {
  // Đường này chạy ngay lúc khởi tạo state của IdeClient — ném ở đây là /ide
  // trắng trang, không phải "mất bản tự lưu".
  assert.equal(loadIdeCode(khoNem), null);
});

test('localStorage ném lúc GHI: im lặng, không ném ra ngoài', () => {
  assert.doesNotThrow(() => saveIdeCode('x = 1', khoNem));
});

test('localStorage ném lúc XOÁ: im lặng, không ném ra ngoài', () => {
  assert.doesNotThrow(() => clearIdeCode(khoNem));
});

test('không có localStorage (kho = null) thì trang vẫn chạy, chỉ là không nhớ', () => {
  assert.equal(loadIdeCode(null), null);
  assert.doesNotThrow(() => saveIdeCode('x = 1', null));
  assert.doesNotThrow(() => clearIdeCode(null));
});

test('mã dài quá trần: KHÔNG ghi, và XOÁ bản cũ', () => {
  // Giữ bản cũ ngắn hơn thì lần mở sau "khôi phục" một đoạn mã KHÁC thứ người
  // ta đang có trên màn hình — tệ hơn là không nhớ gì.
  const kho = khoGia({ [IDE_AUTOSAVE_KEY]: 'x = 1' });
  saveIdeCode('#'.repeat(MAX_IDE_AUTOSAVE_CHARS + 1), kho);
  assert.equal(loadIdeCode(kho), null);
  assert.equal(IDE_AUTOSAVE_KEY in kho.o, false);
});

test('bản lưu dài quá trần (do bản code khác ghi) thì không tin', () => {
  const kho = khoGia({ [IDE_AUTOSAVE_KEY]: '#'.repeat(MAX_IDE_AUTOSAVE_CHARS + 1) });
  assert.equal(loadIdeCode(kho), null);
});

test('đúng trần thì vẫn lưu được — trần là trần, không phải trần trừ một', () => {
  const kho = khoGia();
  const vuaDu = '#'.repeat(MAX_IDE_AUTOSAVE_CHARS);
  saveIdeCode(vuaDu, kho);
  assert.equal(loadIdeCode(kho), vuaDu);
});

// ---------------------------------------------------------------------------
// CHẾ ĐỘ CHẠY và LỚP CHẶN MÃ TỪ LINK
//
// Hai thứ dưới đây là quyết định BẢO MẬT, không phải tuỳ chọn giao diện, nên
// chúng phải có test ghim lại thay vì nằm trong một dòng `?:` không ai canh.
//
// Vì sao mặc định là `client`: đường backend đang trả HTTP 503 trên production
// ("Bộ chạy Python đang tắt"), nên rơi về nó là rơi vào một trang hỏng. Mọi giá
// trị KHÔNG phải `'server'` — chưa đặt, gõ sai, chuỗi rỗng — đều phải ra
// `client`; một lỗi chính tả trong biến môi trường không được âm thầm đưa học
// viên về trang chết.
//
// Vì sao `needsLinkConfirm` chỉ hỏi ở đúng một ca: mã đến từ `/ide#code=…` là
// mã của NGƯỜI KHÁC, và khi nó chạy Pyodide cùng origin thì một lời gọi
// `fetch('/auth/refresh', {credentials:'include'})` trong đó lấy được access
// token của chính người đang xem (đã đo trên bản thật). Hỏi ở ca `autosave` hay
// `default` thì chỉ làm phiền người học với mã của chính họ; KHÔNG hỏi ở ca
// `hash` thì mất lớp chặn duy nhất đang có.
//
// Gỡ bản sửa ra thì test trượt (đã chạy thật 25/10/2026):
//  · đổi mặc định về `'server'` → 1 ca trượt;
//  · cho `needsLinkConfirm` trả `true` ở mọi `source` → 2 ca trượt;
//  · cho nó bỏ qua `mode` (luôn hỏi khi source là hash) → 1 ca trượt.
test('needsLinkConfirm: chỉ hỏi khi mã đến TỪ LINK và chạy Ở CLIENT', () => {
  assert.equal(needsLinkConfirm('hash', 'client'), true);

  // Chạy ở máy chủ thì mã chạy trong container, không đụng phiên của ai.
  assert.equal(needsLinkConfirm('hash', 'server'), false);
});

test('needsLinkConfirm: KHÔNG hỏi về mã của chính người học', () => {
  for (const nguon of ['autosave', 'default']) {
    assert.equal(
      needsLinkConfirm(nguon, 'client'),
      false,
      `source=${nguon} là mã của chính họ, hỏi là làm phiền vô cớ`,
    );
  }
});

test('ideRunnerMode: chỉ đúng chữ "server" mới quay về backend', async () => {
  const luu = process.env.NEXT_PUBLIC_IDE_RUNNER;
  try {
    for (const [dat, mong] of [
      ['server', 'server'],
      ['client', 'client'],
      [undefined, 'client'],
      ['', 'client'],
      ['sever', 'client'], // gõ sai: phải rơi về client, không về trang 503
      ['SERVER', 'client'], // so khớp đúng chữ, không nới lỏng
    ]) {
      if (dat === undefined) delete process.env.NEXT_PUBLIC_IDE_RUNNER;
      else process.env.NEXT_PUBLIC_IDE_RUNNER = dat;
      assert.equal(ideRunnerMode(), mong, `NEXT_PUBLIC_IDE_RUNNER=${String(dat)}`);
    }
  } finally {
    if (luu === undefined) delete process.env.NEXT_PUBLIC_IDE_RUNNER;
    else process.env.NEXT_PUBLIC_IDE_RUNNER = luu;
  }
});
