// Ô CHẠY THỬ ở màn LUYỆN TẬP — 63 câu có `answerCode`.
//
// Màn `practice` là khối LỚN NHẤT của khoá (669 màn = 31%), và tới hôm nay nó
// chỉ là một `<textarea>` + nút "Xem đáp án": không chạy được, không so được,
// không phản hồi. Nhưng 63 câu mang sẵn `answerCode` + `answerExpected` —
// chương trình hoàn chỉnh kèm output chính xác — tức dữ liệu đủ để CHẠY và SO
// đã nằm trong DB từ lâu.
//
// Bộ này canh ba thứ, và thứ đầu là thứ dễ hỏng nhất:
//  1. đường chạy phải là đường KHÔNG CA CHẤM. `execute()` ghim cứng
//     `tests: four.tests`, nên dùng nhầm nó là màn luyện tập bị chấm bằng ca
//     chấm của BÀI TẬP cuối bài — người học nhận "0/3 ca đạt" cho code đúng;
//  2. cổng: câu chạy được thì phải CHẠY mới mở đáp án, không chỉ gõ;
//  3. số liệu trên bản dựng thật, để một đợt build cắt mất `answerCode` thì đỏ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { khopDapAn } from '../../src/lib/studio-lesson.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const doc = (p) => readFileSync(join(ROOT, p), 'utf8');

const SRC_MAN = doc('frontend/src/components/python-studio/screens/PracticeScreen.tsx');
const SRC_RUN = doc('frontend/src/components/python-studio/useCodeRunner.ts');
const BUILD = JSON.parse(doc('scripts/pe-da/out/lessons.json'));

/** Thân hàm `chayThu` — để kiểm nó truyền gì cho worker. */
const THAN_CHAY_THU = (() => {
  const i = SRC_RUN.indexOf('function chayThu(');
  assert.ok(i > 0, 'không tìm thấy chayThu trong useCodeRunner');
  return SRC_RUN.slice(i, SRC_RUN.indexOf('function passedAll', i));
})();

test('bản dựng: đủ câu luyện tập CHẠY ĐƯỢC để tính năng có nghĩa', () => {
  let co = 0;
  const bai = new Set();
  for (const l of BUILD.lessons) {
    for (const p of l.content_json.step_2?.practice ?? []) {
      if (p.answerCode && p.answerExpected) {
        co += 1;
        bai.add(l.lesson_code);
      }
    }
  }
  // SÀN, không phải con số đúng — thêm module là con số tăng.
  assert.ok(co >= 60, `chỉ còn ${co} câu luyện tập chạy được`);
  assert.ok(bai.size >= 55, `chỉ còn ${bai.size} bài`);
});

test('chayThu chạy KHÔNG kèm ca chấm — đây là ca bắt lỗi', () => {
  // Dùng nhầm `execute()` thì màn luyện tập bị chấm bằng ca chấm của bài tập
  // cuối bài: một bộ ca hỏi về hàm `solve` mà câu luyện tập không có.
  assert.ok(/tests:\s*\[\]/.test(THAN_CHAY_THU), 'chayThu không truyền `tests: []`');
  assert.ok(
    !/four\.tests/.test(THAN_CHAY_THU),
    'chayThu vẫn lấy ca chấm của bài — đó chính là lỗi nó ra đời để tránh',
  );
});

test('chayThu KHÔNG truyền `contract` và KHÔNG ghi nhật ký', () => {
  // `contract` chỉ có nghĩa với ca chấm dạng dữ liệu (tiêm `inputVariable` vào
  // namespace). Không ca nào thì nó chỉ là một biến lạ trong chương trình.
  assert.ok(!/contract/.test(THAN_CHAY_THU), 'chayThu truyền contract');
  // `ghiLuotChay` gắn với ca chấm ("trượt ca nào", "trượt y hệt lần trước").
  // Trộn lượt không-ca-chấm vào đó là làm hỏng hai câu SQL đang đếm theo nó.
  assert.ok(!/ghiLuotChay|ghiBamDung/.test(THAN_CHAY_THU), 'chayThu ghi nhật ký lần thử');
  // Nhưng PHẢI giữ gói và file dữ liệu của bài: `answerCode` import numpy/pandas
  // y như bài, và đã đo 0/63 câu thiếu gói.
  assert.ok(/packages:/.test(THAN_CHAY_THU) && /dataFiles:/.test(THAN_CHAY_THU));
});

test('màn luyện tập gọi `chayThu`, KHÔNG gọi `onRun`', () => {
  assert.ok(/chayThu\(typed, setKetQua\)/.test(SRC_MAN), 'không gọi chayThu với mã người học');
  assert.ok(!/onRun/.test(SRC_MAN), 'màn luyện tập gọi onRun — đó là đường của bài tập');
});

test('CỔNG: câu chạy được thì phải CHẠY mới mở đáp án', () => {
  assert.ok(
    /disabled=\{!typed\.trim\(\) \|\| \(chayDuoc && !daChay\)\}/.test(SRC_MAN),
    'nút "Xem đáp án" không đòi đã chạy',
  );
  // Câu KHÔNG chạy được giữ nguyên cổng cũ (gõ là đủ) — ở đó không có gì để
  // chạy, nên đòi chạy là khoá vĩnh viễn 606 câu.
  assert.ok(/Chạy thử rồi mới xem được/.test(SRC_MAN));
  assert.ok(/Viết thử rồi mới xem được/.test(SRC_MAN), 'mất nhãn cổng cũ của 606 câu kia');
});

test('sửa code thì kết quả cũ bị XOÁ', () => {
  // Không làm mờ như màn sandbox: ở đây không có chip "Đạt" nào để giữ, và một
  // ô output trống đọc rõ hơn một ô mờ. Nhưng KHÔNG được để nguyên — một đầu ra
  // của bản code trước nằm dưới một bản đang gõ là thứ nói dối to nhất ở đây.
  assert.ok(/if \(ketQua\) setKetQua\(null\)/.test(SRC_MAN), 'kết quả cũ không bị xoá khi sửa code');
});

test('verdict dùng `khopDapAn` và NÓI RA giới hạn của phép so', () => {
  assert.ok(/khopDapAn\(/.test(SRC_MAN), 'không dùng khopDapAn');
  assert.ok(
    /chưa khớp từng ký tự/.test(SRC_MAN),
    'verdict viết "sai" thay vì "chưa khớp từng ký tự"',
  );
  // Phép so chỉ bỏ khoảng trắng — người đoán đúng ý mà khác dấu nháy vẫn nhận
  // dòng đó, nên chữ phải nói ra điều ấy. Kiểm luôn chính `khopDapAn`:
  assert.equal(khopDapAn('25', '25\n'), true);
  assert.equal(khopDapAn("'25'", '25'), false, 'khopDapAn bỏ qua dấu nháy — hai giá trị khác nhau');
  assert.equal(khopDapAn('', '25'), false, 'chuỗi rỗng không được tính là khớp');
});

test('606 câu KHÔNG có answerCode giữ nguyên ô văn bản', () => {
  assert.ok(
    /const chayDuoc = Boolean\(item\.answerCode && item\.answerExpected\)/.test(SRC_MAN),
    'điều kiện chạy được không đọc cả hai trường',
  );
  // Thiếu `answerExpected` thì không có gì để so — hiện nút Chạy ở đó là mời
  // người học chạy rồi không nói được gì về kết quả.
  let thieuMotNua = 0;
  for (const l of BUILD.lessons)
    for (const p of l.content_json.step_2?.practice ?? [])
      if (Boolean(p.answerCode) !== Boolean(p.answerExpected)) thieuMotNua += 1;
  assert.equal(thieuMotNua, 0, 'có câu chỉ có một trong hai trường');
});
