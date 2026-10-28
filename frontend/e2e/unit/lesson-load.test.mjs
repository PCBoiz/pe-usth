// Lượt NẠP BÀI HỌC: ba lượt gọi API phải SONG SONG, và 403 của `/content` phải
// được phân biệt với lỗi thật.
//
// VÌ SAO CÓ FILE NÀY. Đo trên production ngày 25/10/2026 bằng Resource Timing,
// API đã nóng: ba lượt nối đuôi nhau — `/api/user` 1198 ms → `/api/enrolled`
// 1286 ms → `/content` 1239 ms — tức **3,7 giây** trước khi chữ đầu tiên của
// bài hiện ra. Chạy song song thì còn một lượt, ~1,3 giây.
//
// Chú thích cũ trong `useLessonData.ts` nói phải gọi TUẦN TỰ vì "với người mới,
// request đầu tiên là request tạo tài khoản khách". Lý do đó không đứng: đọc
// `apiFetch` thì gặp 401 nó gọi `refreshAccess()` rồi `ensureGuest()` — cả hai
// dedupe bằng promise ở tầm module — rồi GỬI LẠI request. Đã kiểm trong trình
// duyệt với một ngữ cảnh sạch: ba lượt 401 → đúng **MỘT** `/auth/guest` → cả ba
// tự gửi lại. Một tài khoản, không ba.
//
// Hai thứ file này canh, vì cả hai hỏng trong im lặng:
//  1. quay về tuần tự — không có gì đỏ, chỉ là bài mở chậm hơn 2,4 giây;
//  2. nuốt 403 sai cách — nới quá thì một 500 thật cũng bị nuốt và người học
//     nhìn màn hình trống, hẹp quá thì người mới không mở được bài nào.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { la403ChuaGhiDanh } from '../../src/lib/lesson-load.ts';

const NGUON = readFileSync(
  new URL('../../src/components/python-studio/useLessonData.ts', import.meta.url),
  'utf8',
);

test('nhận 403 theo SỐ — ca backend không kèm message', () => {
  // `json()` ghép `Không thể kết nối (403).` khi backend không trả message.
  assert.equal(la403ChuaGhiDanh(new Error('Không thể kết nối (403).')), true);
});

test('nhận 403 theo CÂU của backend — ca có message', () => {
  // Đây là câu thật trong lessons.service.ts; lúc đó chuỗi "403" KHÔNG xuất
  // hiện trong Error, nên thiếu nhánh này là người mới không mở được bài nào.
  assert.equal(la403ChuaGhiDanh(new Error('Bạn chưa đăng ký khóa học này')), true);
  assert.equal(la403ChuaGhiDanh(new Error('BẠN CHƯA ĐĂNG KÝ KHÓA HỌC NÀY')), true);
});

test('KHÔNG nuốt lỗi thật — đây là ca bắt lỗi', () => {
  for (const msg of [
    'Không thể kết nối (500).',
    'Không thể kết nối (404).',
    'Bài học này cần phiên đăng nhập hợp lệ từ API.',
    'Failed to fetch',
    'Không tìm thấy bài học',
  ]) {
    assert.equal(la403ChuaGhiDanh(new Error(msg)), false, msg);
  }
});

test('không khớp 403 nằm trong một con số khác', () => {
  // `includes('403')` sẽ nuốt cả hai câu dưới đây — và câu thứ hai là một lỗi
  // 500 thật của bài có sortOrder 4030.
  assert.equal(la403ChuaGhiDanh(new Error('Không thể kết nối (4030).')), false);
  assert.equal(la403ChuaGhiDanh(new Error('lesson 4031 lỗi (500)')), false);
});

test('thứ không phải Error thì trả false, không ném', () => {
  for (const x of [null, undefined, '403', 403, {}, { message: '403' }]) {
    assert.equal(la403ChuaGhiDanh(x), false, String(x));
  }
});

test('BỐN lượt gọi lúc mở bài nằm trong MỘT Promise.all', () => {
  // Quay về `await` nối đuôi nhau là mất 2,4 giây mà không có gì đỏ.
  //
  // Ca này từng ghim ĐÚNG BA nhánh, và nó đã làm việc của nó: lượt thứ tư
  // (`napTrangThaiDongY` — trạng thái đồng ý ghi nhật ký, 28/10) làm nó ĐỎ. Nên
  // nó được sửa thành ghim BỐN, không nới thành "bao nhiêu cũng được" — một ca
  // chấp nhận mọi số nhánh thì không còn chặn được việc quay về tuần tự, tức là
  // xoá chính thứ nó tồn tại để canh.
  //
  // Thêm nhánh thứ NĂM thì ca này lại đỏ, và đó là hành vi muốn có: mỗi nhánh là
  // một connection nữa lấy từ pool của Neon trong cùng một khoảnh khắc, nên việc
  // đó phải là một quyết định có người đọc chú thích này, không phải một dòng
  // thêm vào cho tiện.
  const m = /const \[profile, enrolledBody, contentDau, dongY\] = await Promise\.all\(\[([\s\S]*?)\]\);/
    .exec(NGUON);
  assert.ok(m, 'không thấy bốn lượt gọi trong một Promise.all — đã quay về tuần tự?');
  for (const can of [
    "json('/api/user')",
    "json('/api/enrolled')",
    'jsonChoPhep403(duongContent)',
    'napTrangThaiDongY()',
  ]) {
    assert.ok(m[1].includes(can), `thiếu ${can} trong Promise.all`);
  }
});

test('lượt content song song được DÙNG LẠI, không gọi lần hai vô cớ', () => {
  // `contentDau ?? await json(...)`: gọi lại chỉ khi lượt đầu bị 403. Bỏ phần
  // `contentDau ??` thì mọi lượt mở bài tốn thêm một vòng — đúng thứ vừa bỏ.
  assert.match(NGUON, /const payload = contentDau \?\? \(await json\(duongContent\)\);/);
});
