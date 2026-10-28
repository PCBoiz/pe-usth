/**
 * `code nội tuyến` phải được bóc khỏi dấu backtick ở MỌI nơi dựng văn bản
 * giáo trình.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: ngày 27/10/2026 một người thử gửi ảnh ô "KIẾN THỨC
 * CỐT LÕI ĐÃ HỌC" ở màn tổng kết, trong đó có nguyên văn
 *
 *     `.venv\Scripts\python -m pip install numpy`
 *
 * — kể cả hai dấu backtick. Họ viết: "Có thể render markdown lại để nó ra mono
 * font, tránh bị để dấu ` nhìn hơi khó".
 *
 * NGUYÊN NHÂN đáng ghi hơn triệu chứng: hàm bóc backtick ĐÃ CÓ và màn đọc ĐÃ
 * dùng nó. Ô tổng kết lấy ĐOẠN VĂN ĐẦU của từng màn đọc làm ý chính
 * (`RecapScreen.facts`) rồi dựng thẳng `{f}`. Tức cùng MỘT câu chữ, đi hai
 * đường, ra hai kết quả — và đường hỏng là đường không ai nghĩ tới vì nó chỉ
 * mượn lại dữ liệu của đường kia.
 *
 * Đó là lý do ca test ở đây canh "hai nơi dùng CHUNG một hàm" chứ không canh
 * "Recap có gọi bóc backtick". Nơi thứ ba mượn lại cùng dữ liệu sẽ lại hỏng
 * đúng kiểu này; thứ chặn được là hàm chỉ có MỘT bản.
 *
 * ABLATION:
 *   Recap dựng {f} trần trở lại               → 1 đỏ
 *   mỗi nhánh giữ một bản withInlineCode riêng → 1 đỏ
 *   regex nuốt qua xuống dòng ([^`] thay vì [^`\n]) → 1 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const doc = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

const LIB = doc(join(FE, 'src', 'lib', 'inline-code.tsx'));
const RECAP = doc(join(FE, 'src', 'components', 'lesson-chrome', 'exercises', 'Recap.tsx'));
const CHROME = doc(join(FE, 'src', 'components', 'python-studio', 'screens', 'chrome.tsx'));

test('ô tổng kết bóc backtick, không dựng chuỗi trần', () => {
  assert.match(
    RECAP,
    /\{withInlineCode\(f\)\}/,
    'Ý chính ở màn tổng kết lấy từ đoạn văn của màn đọc, mà giáo trình 172 bài '
      + 'dùng backtick dày đặc. Dựng trần thì học viên đọc ra cả dấu backtick.',
  );
});

test('CẢ HAI nhánh import cùng một hàm, không mỗi nơi một bản', () => {
  // Đây mới là ca chịu lực: lỗi gốc không phải "Recap quên bóc", mà là "có hai
  // đường dựng cùng một câu chữ". Hai bản hàm thì sớm muộn chúng lệch nhau.
  for (const [ten, ma] of [['Recap.tsx', RECAP], ['screens/chrome.tsx', CHROME]]) {
    assert.match(
      ma,
      /import \{ withInlineCode \} from '@\/lib\/inline-code'/,
      `${ten} phải dùng bản dùng chung ở src/lib/inline-code.tsx.`,
    );
  }
  // Và chỉ một nơi ĐỊNH NGHĨA nó.
  for (const [ten, ma] of [['Recap.tsx', RECAP], ['screens/chrome.tsx', CHROME]]) {
    assert.ok(
      !/function withInlineCode/.test(ma),
      `${ten} định nghĩa lại withInlineCode — phải import, không chép.`,
    );
  }
  assert.match(LIB, /export function withInlineCode/);
});

test('regex chỉ nhận cặp backtick TRONG MỘT DÒNG', () => {
  // Lấy chính regex trong nguồn ra chạy, không chép tay một bản thứ hai vào
  // đây — chép tay thì ca test chứng minh bản chép, không chứng minh bản chạy.
  const m = /const INLINE_CODE = (\/.+\/g);/.exec(LIB);
  assert.ok(m, 'Không tìm thấy hằng INLINE_CODE trong nguồn.');
  const re = eval(m[1]);

  const motDong = 'gõ `pip install numpy` vào terminal';
  assert.deepEqual([...motDong.matchAll(re)].map((x) => x[1]), ['pip install numpy']);

  // Backtick LẺ ở hai dòng khác nhau không được nuốt cả đoạn giữa: giáo trình
  // có đoạn dùng backtick đơn trong văn xuôi, và nuốt nhầm thì cả một đoạn văn
  // biến thành một khối <code>.
  re.lastIndex = 0;
  const haiDong = 'dòng đầu có một ` lẻ\ndòng sau cũng có ` lẻ';
  assert.deepEqual([...haiDong.matchAll(re)], [], 'Regex đã vắt qua xuống dòng.');
});
