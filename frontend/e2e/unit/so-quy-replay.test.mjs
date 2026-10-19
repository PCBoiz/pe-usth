/**
 * Phát lại vết của mini-game "Sổ quỹ chung" (src/lib/so-quy-replay.ts).
 *
 * VẾT THẬT, KHÔNG VIẾT TAY: `fixtures/so-quy-vet.json` do chính động cơ
 * (public/static/js/so-quy.py) sinh bằng `py -I scripts/pe-v4/check_so_quy.py --ghi-mau`,
 * và bộ kiểm CPython/Pyodide có ca "vết mẫu khớp động cơ" — động cơ đổi mà quên
 * sinh lại thì bên đó đỏ. Bẫy số 1 của AGENTS.md: fixture không giống dữ liệu
 * thật thì test vô dụng.
 *
 * BẰNG CHỨNG BỘ NÀY BẮT LỖI (gỡ từng chỗ trong so-quy-replay.ts, đếm ca trượt):
 *   - bỏ điều kiện `nhip >= mocLoi` (lỗi hiện ngay từ nhịp 0)        → 2 ca
 *   - `nhipCuaLoi` không kẹp về số nhịp đã ghi                      → 1 ca
 *   - `docVet` bỏ kiểm `raw.dat && loi`                             → 1 ca
 *   - `docNhip` bỏ kiểm `v.n !== i + 1` (nhịp lệch thứ tự vẫn nhận)  → 1 ca
 *   - `kepNhip` bỏ nhánh NaN                                         → 1 ca
 *   - `nhipKe` phát tới cuối vết thay vì dừng ở nhịp hỏng            → 1 ca
 *     (lần đo đầu ca này KHÔNG trượt: mọi vết mẫu khi ấy đều hỏng ở
 *     đúng nhịp cuối. Thêm vết `doc_lai` — hỏng ở 4, dài 6 — mới bắt được.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  cauCham,
  docVet,
  kepNhip,
  moTaNhip,
  nhanLoi,
  nhanMucTieu,
  nhipCuaLoi,
  nhipDung,
  nhipKe,
  trangThaiTai,
} from '../../src/lib/so-quy-replay.ts';

const MAU = JSON.parse(readFileSync(new URL('./fixtures/so-quy-vet.json', import.meta.url), 'utf8'));
const sao = (x) => JSON.parse(JSON.stringify(x));
const vet = (ten) => {
  const v = docVet(sao(MAU[ten]));
  assert.ok(v, `vết thật "${ten}" bị docVet từ chối`);
  return v;
};

test('docVet nhận cả năm vết thật của động cơ', () => {
  for (const ten of Object.keys(MAU)) assert.match(vet(ten).ma, /^def nap\(so_quy, khoa, so_tien\):/);
  assert.equal(Object.keys(MAU).length, 5, 'thiếu vết mẫu — sinh lại bằng --ghi-mau');
});

test('docVet từ chối vết sai hình thay vì để màn chấm vào trường không có', () => {
  const hong = [
    ['phiên bản lạ', (v) => { v.phien_ban = 2; }],
    ['thiếu biến của một người', (v) => { delete v.nhip[1].nguoi[0].bien; }],
    ['nhịp lệch thứ tự', (v) => { v.nhip[1].n = 7; }],
    ['người ngoài danh sách', (v) => { v.nhip[0].ai = 5; }],
    ['việc lạ', (v) => { v.nhip[0].viec = 'xoa'; }],
    ['đạt mà vẫn mang lỗi', (v) => { v.dat = true; }],
    ['chỉ một người', (v) => { v.nguoi = v.nguoi.slice(0, 1); }],
  ];
  for (const [ten, sua] of hong) {
    const v = sao(MAU.khong_khoa);
    sua(v);
    assert.equal(docVet(v), null, `${ten}: phải trả null`);
  }
  assert.equal(docVet(null), null);
  assert.equal(docVet('{"phien_ban":1}'), null);
});

test('nhịp 0: sổ 100, chưa ai vào, không khoá, chưa lỗi', () => {
  const s = trangThaiTai(vet('khong_khoa'), 0);
  assert.equal(s.so_du, 100);
  assert.equal(s.khoa, null);
  assert.equal(s.suKien, null);
  assert.equal(s.loi, null);
  assert.deepEqual(s.nguoi.map((p) => p.o), ['chua', 'chua']);
});

test('chưa khoá: cả hai cầm 100, sổ ra 110, lỗi chỉ hiện từ nhịp ghi đè', () => {
  const v = vet('khong_khoa');
  assert.equal(v.nhip.length, 4);
  const n2 = trangThaiTai(v, 2);
  assert.deepEqual(n2.nguoi.map((p) => p.cam), [100, 100]);
  const n3 = trangThaiTai(v, 3);
  assert.equal(n3.so_du, 150);
  assert.equal(n3.loi, null, 'tua về nhịp 3 (trước khi B ghi đè) thì chưa được hiện lỗi');
  const n4 = trangThaiTai(v, 4);
  assert.equal(n4.so_du, 110);
  assert.ok(n4.loi, 'nhịp 4 phải mang lỗi');
  assert.equal(nhanLoi(n4.loi), 'Nhịp 4 · dòng 3');
  assert.equal(nhipDung(v), 4);
});

test('đã khoá: B đứng chờ khi A giữ khoá, cửa mở ở nhịp 7, sổ ra 160', () => {
  const v = vet('co_khoa');
  assert.equal(v.dat, true);
  const n2 = trangThaiTai(v, 2);
  assert.equal(n2.khoa, 0);
  assert.equal(n2.nguoi[1].o, 'cho');
  assert.equal(trangThaiTai(v, 7).khoa, null);
  assert.equal(trangThaiTai(v, 8).khoa, 1);
  assert.equal(trangThaiTai(v, 9).nguoi[1].bien.x, 150);
  const cuoi = trangThaiTai(v, v.nhip.length);
  assert.equal(cuoi.so_du, 160);
  assert.equal(cuoi.loi, null);
  assert.equal(nhipDung(v), v.nhip.length);
});

test('lỗi Python giữa nhịp chưa ghi: kẹp về nhịp cuối có thật, vẫn hiện được', () => {
  const v = vet('go_sai_ten');
  assert.equal(v.nhip.length, 0);
  assert.equal(v.loi.nhip, 1);
  assert.equal(nhipCuaLoi(v), 0);
  assert.equal(nhipDung(v), 0);
  assert.ok(trangThaiTai(v, 0).loi, 'không kẹp thì lỗi ở "nhịp 1" không bao giờ hiện ra');
  assert.match(cauCham(v), /^Nhịp 1 · dòng 3: NameError/);
});

test('kepNhip: ngoài khoảng và NaN (ô range rỗng) đều về trong vết', () => {
  const v = vet('co_khoa');
  assert.equal(kepNhip(v, -5), 0);
  assert.equal(kepNhip(v, 999), v.nhip.length);
  assert.equal(kepNhip(v, Number.NaN), 0);
  assert.equal(kepNhip(v, 2.7), 2);
});

test('phát tự động dừng đúng ở nhịp hỏng, không chạy quá', () => {
  const v = vet('khong_khoa');
  const di = [];
  for (let n = 0, ke = nhipKe(v, n); ke !== null; n = ke, ke = nhipKe(v, n)) di.push(ke);
  assert.deepEqual(di, [1, 2, 3, 4]);
  // Lịch dò ra lỗi ở nhịp 8 của 8 nhịp: dừng ở 8.
  const v2 = vet('khoa_chi_luc_doc');
  assert.equal(nhipDung(v2), 8);
  assert.equal(nhipKe(v2, 8), null);
  // Ghi đè ở nhịp 4 trong vết dài 6: dừng ở 4 — người học thấy ngay chỗ hỏng,
  // không phải tự tua ngược từ cuối về.
  const v3 = vet('doc_lai');
  assert.equal(v3.nhip.length, 6);
  assert.equal(nhipDung(v3), 4);
  assert.equal(nhipKe(v3, 4), null);
});

test('tua tới lui bao nhiêu lần cũng ra đúng một trạng thái (không trạng thái ẩn)', () => {
  const v = vet('co_khoa');
  const mot = JSON.stringify(trangThaiTai(v, 5));
  for (const n of [0, 11, 3, 9, 1, 7, 2, 10, 4, 6, 8]) trangThaiTai(v, n);
  assert.equal(JSON.stringify(trangThaiTai(v, 5)), mot);
});

test('câu đọc lên cho thanh tua và câu chấm: chỉ dữ kiện', () => {
  const v = vet('khong_khoa');
  assert.equal(moTaNhip(v, 0), 'Nhịp 0/4 · sổ quỹ 100');
  assert.equal(moTaNhip(v, 4), 'Nhịp 4/4 · B ghi sổ 110 · dòng 3 · sổ quỹ 110');
  assert.equal(nhanMucTieu(v), 'Sổ quỹ = 160');
  assert.match(cauCham(v), /^Nhịp 4 · dòng 3: B ghi 110 đè lên 150/);
  assert.match(cauCham(vet('co_khoa')), /^Sổ quỹ ra 160/);
  // Luật nội dung: không lời reo, không hạt "nhé".
  for (const ten of Object.keys(MAU)) {
    const cau = cauCham(vet(ten));
    assert.doesNotMatch(cau, /Chúc mừng|nhé|!/, `câu chấm của ${ten} phạm luật nội dung: ${cau}`);
  }
});
