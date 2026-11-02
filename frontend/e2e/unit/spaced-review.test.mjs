// ÔN GIÃN CÁCH — hàng chờ câu đã trả lời SAI.
//
// Cepeda 2006 (184 nghiên cứu, 1,35 triệu phép đo): học giãn cách thắng học
// dồn. Lib này là phần CÓ THỂ SAI của tính năng, và nó thuần nên test gọi thẳng
// được — khác hẳn mấy bộ trước phải đọc cây mã.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  docHangCho,
  HAN_CHO_MS,
  khoaOn,
  layCauOn,
  themCauSai,
  TRAN_HANG_CHO,
  xoaCauOn,
} from '../../src/lib/spaced-review.ts';

/** Kho giả — ba hàm mà lib dùng. */
function khoGia(batDau = {}) {
  const d = { ...batDau };
  return {
    getItem: (k) => d[k] ?? null,
    setItem: (k, v) => {
      d[k] = v;
    },
    removeItem: (k) => {
      delete d[k];
    },
    _raw: d,
  };
}

const cau = (n, lessonNo, luc) => ({
  maBai: `NP${String(n).padStart(2, '0')}`,
  lessonNo,
  key: `s2-mcq-${n}`,
  question: `câu ${n}?`,
  options: [{ text: 'a', correct: true }, { text: 'b' }],
  luc,
});

test('khoá theo KHOÁ HỌC, không theo bài', () => {
  // Hàng chờ gom câu từ MỌI bài và được hỏi ở MỘT bài khác. Khoá theo bài thì
  // câu sai ở bài 3 chỉ hiện lại khi mở đúng bài 3 — tức không bao giờ.
  assert.equal(khoaOn('python_advanced'), 'pe-on-gian-cach-v1:python_advanced');
  assert.notEqual(khoaOn('a'), khoaOn('b'));
});

test('thêm câu sai, đọc lại được; trùng khoá thì KHÔNG thêm hai lần', () => {
  const kho = khoGia();
  themCauSai('c', cau(1, 3, 100), kho);
  themCauSai('c', cau(1, 3, 200), kho);
  assert.equal(docHangCho('c', kho).length, 1);
});

test('KHÔNG hỏi câu của chính bài đang mở', () => {
  // Hỏi lại ngay trong bài vừa sai là không giãn cách gì cả.
  const kho = khoGia();
  themCauSai('c', cau(1, 3, 0), kho);
  assert.equal(layCauOn('c', 3, HAN_CHO_MS + 1, kho), null);
  assert.ok(layCauOn('c', 4, HAN_CHO_MS + 1, kho));
});

test('KHÔNG hỏi câu chưa quá HAN_CHO_MS — đây là ca bắt lỗi', () => {
  // Thiếu luật này thì sai một câu ở màn 5 rồi mở bài kế tiếp sau hai phút là
  // gặp lại ngay: đó là học DỒN, đúng thứ Cepeda đo được là kém hơn.
  const kho = khoGia();
  themCauSai('c', cau(1, 3, 1000), kho);
  assert.equal(layCauOn('c', 9, 1000 + HAN_CHO_MS - 1, kho), null, 'hỏi quá sớm');
  assert.ok(layCauOn('c', 9, 1000 + HAN_CHO_MS, kho), 'đủ hạn mà vẫn không hỏi');
});

test('trả câu CŨ NHẤT trong số đủ điều kiện', () => {
  // Câu cũ nhất là câu xa lần học nhất, tức câu sắp quên nhất.
  const kho = khoGia();
  themCauSai('c', cau(1, 3, 500), kho);
  themCauSai('c', cau(2, 4, 100), kho);
  themCauSai('c', cau(3, 5, 900), kho);
  assert.equal(layCauOn('c', 9, 10_000_000, kho).key, 's2-mcq-2');
});

test('quá trần thì bỏ câu CŨ NHẤT, không bỏ câu mới', () => {
  // Câu mới sai là câu đang cần ôn nhất.
  const kho = khoGia();
  for (let i = 0; i < TRAN_HANG_CHO + 5; i += 1) themCauSai('c', cau(i, 1, i), kho);
  const ds = docHangCho('c', kho);
  assert.equal(ds.length, TRAN_HANG_CHO);
  assert.equal(ds[ds.length - 1].key, `s2-mcq-${TRAN_HANG_CHO + 4}`, 'bỏ mất câu mới nhất');
  assert.equal(ds[0].key, 's2-mcq-5', 'không bỏ đúng câu cũ nhất');
});

test('xoá sau khi hỏi xong', () => {
  const kho = khoGia();
  themCauSai('c', cau(1, 3, 0), kho);
  themCauSai('c', cau(2, 4, 0), kho);
  xoaCauOn('c', 's2-mcq-1', kho);
  assert.deepEqual(docHangCho('c', kho).map((x) => x.key), ['s2-mcq-2']);
});

test('kho hỏng / không có thì coi như hàng chờ RỖNG, không ném', () => {
  // Hỏng theo chiều LÀNH: không có câu nào để ôn thì không có màn nào hiện ra.
  // Khác hẳn chuỗi ngày (đã bác bỏ) nơi mất dữ liệu là trừng phạt người học.
  assert.deepEqual(docHangCho('c', null), []);
  assert.equal(layCauOn('c', 1, 0, null), null);
  assert.doesNotThrow(() => themCauSai('c', cau(1, 2, 0), null));
  assert.doesNotThrow(() => xoaCauOn('c', 'k', null));

  const nem = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('quota');
    },
    removeItem: () => {},
  };
  assert.deepEqual(docHangCho('c', nem), []);
  assert.doesNotThrow(() => themCauSai('c', cau(1, 2, 0), nem));
});

test('dữ liệu rác trong kho bị LỌC, không làm màn hình trắng', () => {
  // Bản nháp của một phiên bản trước có thể thiếu trường, và một
  // `undefined.options.map` là màn hình trắng — đúng họ lỗi `optionDetail`
  // từng gây ra ở màn trắc nghiệm.
  const kho = khoGia({
    [khoaOn('c')]: JSON.stringify([
      { key: 'ok', question: 'q', options: [], lessonNo: 1, luc: 0 },
      { key: 'thieu-options', question: 'q', lessonNo: 1, luc: 0 },
      { question: 'khong-co-key', options: [], lessonNo: 1, luc: 0 },
      null,
      'chuoi',
    ]),
  });
  assert.deepEqual(docHangCho('c', kho).map((x) => x.key), ['ok']);

  const hong = khoGia({ [khoaOn('c')]: '{khong-phai-json' });
  assert.deepEqual(docHangCho('c', hong), []);
  const khongPhaiMang = khoGia({ [khoaOn('c')]: '{"a":1}' });
  assert.deepEqual(docHangCho('c', khongPhaiMang), []);
});

// --- PHẦN NỐI VÀO GIAO DIỆN ------------------------------------------------
//
// `StudioLesson.tsx` / `OnGianCach.tsx` là .tsx nên `node --test` không import
// được — canh bằng phép đọc cây mã. GIỚI HẠN ĐÃ BIẾT, và nó vừa cắn một lần ở
// bộ `practice-run`: phép đọc nguồn KHÔNG thấy được lỗi vòng đời component
// (state rò giữa các câu). Ở đây rủi ro đó thấp hơn vì state của ô ôn gắn với
// `lessonNo` (đổi bài là đổi effect), nhưng đừng đọc mấy ca dưới là "đã kiểm".
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const doc = (p) => readFileSync(join(ROOT, p), 'utf8');
const SRC_SL = doc('frontend/src/components/python-studio/StudioLesson.tsx');
const SRC_LIB = doc('frontend/src/lib/studio-lesson.ts');

test('ô ôn đứng NGOÀI luồng màn — KHÔNG thêm một ScreenKind mới', () => {
  // Thêm một loại màn thì phải đi qua `buildScreens` (hàm THUẦN, không biết
  // localStorage), `sinhDuocManNao` ở cổng INSERT của backend, thanh tiến độ,
  // `screenSettled`, `firstUnfinished` — năm chỗ, cho một thẻ không thuộc về
  // nội dung bài. Và nó sẽ làm `insert-gate-sync` đỏ.
  const khoi = SRC_LIB.split('export type ScreenKind =')[1].split(';')[0];
  assert.ok(!/'spaced'|'onGianCach'/.test(khoi), 'đã thêm ScreenKind cho ô ôn');
  assert.ok(/<OnGianCach/.test(SRC_SL), 'StudioLesson không dựng ô ôn');
});

test('chỉ hiện ở MÀN ĐẦU của bài', () => {
  // Hỏi giữa chừng là cắt ngang mạch đang đọc.
  assert.ok(/d\.step === 1 && cauOn/.test(SRC_SL), 'ô ôn không khoá vào màn đầu');
});

test('chỉ ghi câu sai ở LẦN ĐẦU chấm', () => {
  // Chấm lại sau khi đã biết đáp án không nói lên điều gì về việc họ nhớ hay
  // không — ghi nó vào hàng chờ là ôn một thứ họ vừa đọc đáp án.
  assert.ok(
    /!v\.correct && d\.score\?\.firstTry\?\.\[scr\.key\] === undefined/.test(SRC_SL),
    'ghi cả lần chấm lại, không chỉ lần đầu',
  );
});

test('đọc phương án bằng optionText/optionDetail, KHÔNG đọc thẳng `.text`', () => {
  // `McqOption` là `string | {…}`. Đọc thẳng `.text` thì dạng chuỗi ra
  // undefined và ô ôn hiện ba nút TRẮNG — đúng lỗi `normalizeQuestion` đã gặp
  // ở kho quiz, nơi không ngoại lệ nào được ném và không log nào đỏ.
  const vung = SRC_SL.slice(SRC_SL.indexOf('themCauSai('), SRC_SL.indexOf('themCauSai(') + 1400);
  assert.ok(/optionText\(o\)/.test(vung) && /optionDetail\(o\)/.test(vung));
  assert.ok(!/text: o\.text/.test(vung), 'đọc thẳng o.text');
});

test('hỏi xong thì XOÁ khỏi hàng chờ', () => {
  // Không xoá thì câu đó hỏi lại mãi mãi ở mọi bài sau — và người học không có
  // cách nào thoát.
  assert.ok(/xoaCauOn\(courseId, cauOn\.key\)/.test(SRC_SL), 'không xoá sau khi hỏi xong');
});
