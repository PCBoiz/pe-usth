// Hạn của cookie mốc `pe_has_session` — nửa FRONTEND của hợp đồng
// `refreshExpiresIn` (nửa backend: src/auth/refresh-expires-contract.spec.ts).
//
// VÌ SAO CÓ FILE NÀY: cookie mốc từng ghi cứng `max-age=28800` (8 giờ) ở BỐN
// chỗ, trong khi production đặt `JWT_REFRESH_EXPIRES=24h` — đọc nguyên văn
// response header của production ngày 25/10/2026:
//   set-cookie: pe_refresh=…; Max-Age=86400; Path=/auth; HttpOnly; Secure; SameSite=Lax
// Lệch 3 lần. Từ giờ thứ 8 tới giờ thứ 24, phiên còn sống nhưng cookie mốc đã
// hết, nên trang công khai hiện "chưa đăng nhập" và badge "Tiếp tục ở bài X"
// biến mất dù tiến độ còn nguyên.
//
// Hướng lệch có hậu quả KHÁC NHAU, nên hằng dự phòng cố ý chọn NGẮN:
//  · đoán ngắn hơn hạn thật → mất cái badge, tiến độ còn;
//  · đoán DÀI hơn → trang công khai mời vào một phiên đã chết, `apiFetch`
//    refresh không được rồi rơi xuống `ensureGuest()` và cấp tài khoản khách
//    MỚI — người học thấy như mất sạch tiến độ.
import { strict as assert } from 'node:assert';
import test from 'node:test';

/** Thay `document` bằng bản ghi lại mọi chuỗi cookie được gán. */
function dungDocumentGia() {
  const daGhi = [];
  globalThis.document = {
    set cookie(v) { daGhi.push(String(v)); },
    get cookie() { return ''; },
  };
  return daGhi;
}

const { danhDauPhien, HAN_DU_PHONG_GIAY } = await (async () => {
  dungDocumentGia();
  return import('../../src/lib/api.ts');
})();

function maxAge(dong) {
  const m = /max-age=(-?\d+)/.exec(dong);
  return m ? Number(m[1]) : null;
}

test('dùng ĐÚNG con số máy chủ nói, không phải 28800 — ca bắt lỗi', () => {
  const ghi = dungDocumentGia();
  danhDauPhien(86_400);
  assert.equal(ghi.length, 1);
  assert.equal(maxAge(ghi[0]), 86_400);
  assert.match(ghi[0], /^pe_has_session=1;/);
  assert.match(ghi[0], /path=\/;/);
  assert.match(ghi[0], /SameSite=Lax/);
});

test('máy chủ không nói thì về hạn dự phòng', () => {
  for (const xau of [undefined, null, '86400', NaN, Infinity, 0, -5, {}]) {
    const ghi = dungDocumentGia();
    danhDauPhien(xau);
    assert.equal(maxAge(ghi[0]), HAN_DU_PHONG_GIAY, `với ${String(xau)}`);
  }
});

test('hạn dự phòng phải NGẮN, không được dài hơn mặc định 8h của máy chủ', () => {
  // Nếu ai đó nâng nó lên "cho khớp production 24h" thì đổi luôn hướng lệch
  // sang hướng làm mất tiến độ. Ca này canh đúng chỗ đó.
  assert.equal(HAN_DU_PHONG_GIAY, 8 * 3600);
});

test('số lẻ bị làm tròn xuống, cookie không nhận số thực', () => {
  const ghi = dungDocumentGia();
  danhDauPhien(86_400.9);
  assert.equal(maxAge(ghi[0]), 86_400);
});

test('document ném thì không làm sập cả lần refresh', () => {
  // Chrome ném SecurityError khi người dùng chặn "site data".
  globalThis.document = {
    set cookie(_v) { throw new Error('SecurityError'); },
    get cookie() { return ''; },
  };
  assert.doesNotThrow(() => danhDauPhien(86_400));
});
