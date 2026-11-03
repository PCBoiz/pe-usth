import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fingerprint } from './lesson-content-update';

/**
 * `scripts/check-da-nap.mjs` phải băm nội dung bài GIỐNG HỆT `fingerprint()`.
 *
 * Vì sao cần ca này: cổng đó chạy bằng `node` trần trong CI nên không import
 * được hàm TypeScript này — nó CHÉP phép băm. Chép thì sẽ trôi, và trôi theo
 * đúng chiều tệ nhất: lệch một ly là MỌI bài báo "chưa nạp", cổng kêu oan 179
 * lần, rồi có người tắt nó đi.
 *
 * Và đây không phải lo xa. Bản đầu của cổng dùng `JSON.stringify(v)` thẳng,
 * trong khi `fingerprint()` đi qua `canonicalJson()` — tức SẮP KHOÁ trước rồi
 * mới tuần tự hoá. Lỗi bị bắt trước khi commit, nhưng chỉ vì có người đi đọc
 * lại bản gốc; ca này làm việc đó bằng máy.
 *
 * Ca chạy trên GÓI THẬT (`scripts/pe-da/out/lessons.json`), không trên fixture
 * bịa: cùng lý do đã ghi cho `quizzes.service.spec.ts` — một fixture bịa ra
 * hình dạng dễ thì nó bỏ lọt đúng những giá trị làm hai cách băm lệch nhau
 * (khoá không theo thứ tự, số thực, ký tự ngoài ASCII).
 */

/**
 * TRÍCH phép băm THẬT ra khỏi `scripts/check-da-nap.mjs` rồi CHẠY nó.
 *
 * Bản đầu của ca này tự CHÉP lại `sapKhoa`/`dauVan` vào đây — và khi ablate
 * (sửa cổng về `JSON.stringify` trần) thì CẢ BA CA VẪN XANH, vì nó đang so
 * một bản chép với `fingerprint()` mà không đụng tới file cổng lần nào. Đúng
 * "test không có răng" mà LOOP.md đặt tên, và nó lọt qua chính tay người viết.
 * Nay ca đọc file, trích đúng hai hàm rồi `new Function` chúng — cùng khuôn
 * `forum-xss.test.mjs` dùng để lôi `escHtml` thật ra khỏi `dashboard.js`.
 */
const CONG = join(__dirname, '..', '..', 'scripts', 'check-da-nap.mjs');
const nguonCong = readFileSync(CONG, 'utf8');

/**
 * Cắt một khai báo `const <tên> = …` ra khỏi nguồn cổng.
 *
 * Phải phân biệt THÂN KHỐI với THÂN BIỂU THỨC, nếu không cắt cụt: `sapKhoa`
 * có `return v.map(sapKhoa);` nên dấu `;` ĐẦU TIÊN nằm GIỮA thân, cắt ở đó
 * thì `new Function` ném SyntaxError (đã xảy ra ở bản đầu).
 */
function trich(ten: string): string {
  const i = nguonCong.indexOf('const ' + ten + ' =');
  if (i < 0)
    throw new Error('không tìm thấy ' + ten + ' trong check-da-nap.mjs');
  const dauMui = nguonCong.indexOf('=>', i);
  const sauMui = nguonCong.slice(dauMui + 2).trimStart();
  const het = sauMui.startsWith('{')
    ? nguonCong.indexOf('\n};', i) + 3
    : nguonCong.indexOf(';\n', i) + 1;
  if (het < 3) throw new Error('không cắt được khai báo ' + ten);
  return nguonCong.slice(i, het);
}

// `new Function` là CỐ Ý, và là toàn bộ lý do ca này có răng: nó chạy
// đúng mã trong FILE CỔNG thay vì một bản chép sẽ trôi khỏi nó. Nguồn là một
// file CỦA REPO đọc từ đĩa lúc chạy test, không phải dữ liệu từ ngoài vào —
// khác hẳn tình huống mà luật no-implied-eval ra đời để chặn. Cùng khuôn
// `forum-xss.test.mjs` dùng để lôi `escHtml` thật ra khỏi `dashboard.js`.
/* eslint-disable @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call */
const dauVanCuaCong = new Function(
  'createHash',
  trich('sapKhoa') + '\n' + trich('dauVan') + '\n' + 'return dauVan;',
)(createHash) as (v: unknown) => string;
/* eslint-enable @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call */

type Bai = { lesson_code: string; content_json: unknown };
const GOI = join(
  __dirname,
  '..',
  '..',
  'scripts',
  'pe-da',
  'out',
  'lessons.json',
);
const bai: Bai[] = (JSON.parse(readFileSync(GOI, 'utf8')) as { lessons: Bai[] })
  .lessons;

describe('check-da-nap.mjs băm giống fingerprint()', () => {
  it('gói thật có bài để so (không phải xanh vì rỗng)', () => {
    expect(bai.length).toBeGreaterThan(100);
  });

  it('mọi bài trong gói cho ra CÙNG sha256 ở cả hai phép băm', () => {
    const lech = bai
      .filter(
        (l) =>
          fingerprint(l.content_json).sha256 !== dauVanCuaCong(l.content_json),
      )
      .map((l) => l.lesson_code);
    expect(lech).toEqual([]);
  });

  it('phép băm của cổng KHÔNG phải JSON.stringify trần — thứ tự khoá không được đổi kết quả', () => {
    // Nếu ai đó sửa cổng về `JSON.stringify(v)` thẳng thì ca trên vẫn có thể
    // xanh tình cờ (gói hiện tại có thể đã sắp khoá sẵn). Ca này ép đúng tính
    // chất: hai object cùng nội dung, khác THỨ TỰ khoá, phải cùng dấu vân.
    const a = { b: 1, a: { d: [1, 2], c: 'x' } };
    const b = { a: { c: 'x', d: [1, 2] }, b: 1 };
    expect(dauVanCuaCong(a)).toBe(dauVanCuaCong(b));
    expect(dauVanCuaCong(a)).toBe(fingerprint(a).sha256);
  });
});
