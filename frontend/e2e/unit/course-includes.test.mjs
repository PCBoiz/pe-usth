/**
 * Khối "KHOÁ HỌC BAO GỒM" ở trang khoá — và luật chung: không hứa thứ repo
 * không làm được.
 *
 * ===========================================================================
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 * ===========================================================================
 *  - "không hứa chứng chỉ" trượt với bản cũ (`Chứng chỉ hoàn thành` ở
 *    CourseDetail:413 và bản sao ở CourseDbDesign:366).
 *  - "chưa có đường phát chứng chỉ" là ca canh TIỀN ĐỀ, và nó chạy theo hướng
 *    NGƯỢC LẠI: nếu sau này ai đó viết code tăng `users.certificates` thì ca
 *    này đỏ, nhắc rằng lời hứa kia nay CÓ THỂ nói lại trên trang khoá. Không
 *    có nó thì bản sửa này biến thành một lệnh cấm vĩnh viễn, mà lý do cấm chỉ
 *    đúng ở thời điểm hôm nay.
 *  - "không hứa truy cập vĩnh viễn" trượt với `Truy cập vĩnh viễn`; ca kèm
 *    theo đọc lại `JWT_REFRESH_EXPIRES` ở backend để chắc hạn khách vẫn còn
 *    hữu hạn — nếu ai đặt nó thành vô hạn thì lời hứa cũ lại thành thật và ca
 *    này đỏ để người sửa biết.
 *  - "không nói Miễn phí hai lần" trượt nếu dòng "🎉 Hoàn toàn không mất phí"
 *    quay lại đứng cạnh "Miễn phí".
 *  - Hai dòng thay thế phải NÓI ĐƯỢC điều đo được, nên có ca đòi chúng xuất
 *    hiện: thiếu chúng thì khối chỉ còn đếm bài và giờ, mất phần nói thật về
 *    giới hạn của phiên.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const REPO = join(ROOT, '..');

/** Hai bề mặt cùng mang khối "KHOÁ HỌC BAO GỒM" — bản sao trước đây lệch nhau. */
const SURFACES = [
  'src/app/(standalone)/courses/[courseId]/CourseDetail.tsx',
  'src/components/CourseDbDesign.tsx',
];

/** Bỏ chú thích: chú thích ĐƯỢC nhắc lại câu sai cũ để giải thích vì sao sai. */
const codeOnly = (s) => s.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const SRC = SURFACES.map((rel) => [rel, codeOnly(readFileSync(join(ROOT, rel), 'utf8'))]);

test('không hứa chứng chỉ ở bất kỳ bề mặt nào', () => {
  for (const [rel, code] of SRC) {
    assert.ok(!/Chứng chỉ/i.test(code), `${rel} còn hứa chứng chỉ`);
    assert.ok(!/fa-certificate/.test(code), `${rel} còn icon chứng chỉ`);
  }
});

test('chưa có đường phát chứng chỉ — nếu có thì ca này đỏ để nói lại lời hứa', () => {
  const files = [
    'src/stats/stats.service.ts',
    'src/lessons/lessons.service.ts',
    'src/courses/courses.service.ts',
  ];
  for (const rel of files) {
    let src;
    try {
      src = readFileSync(join(REPO, rel), 'utf8');
    } catch {
      continue; // file đổi tên là việc của ca khác
    }
    // Chỉ ĐỌC thì được (`certificates: true` trong select, trả ra trong stats).
    // Mọi dạng GHI đều làm ca này đỏ.
    assert.ok(
      !/certificates:\s*\{?\s*(increment|decrement|set)\b/.test(src),
      `${rel} nay có ghi vào users.certificates — trang khoá có thể nói lại lời hứa`,
    );
  }
});

test('không hứa truy cập vĩnh viễn', () => {
  for (const [rel, code] of SRC) {
    assert.ok(!/vĩnh viễn/i.test(code), `${rel} còn hứa truy cập vĩnh viễn`);
    assert.ok(!/fa-infinity/.test(code), `${rel} còn icon vô hạn`);
  }
});

test('hạn phiên khách vẫn hữu hạn — tiền đề của bản sửa trên', () => {
  const env = readFileSync(join(REPO, 'src/config/env.validation.ts'), 'utf8');
  const m = /JWT_REFRESH_EXPIRES[\s\S]{0,200}?default\(\s*'([^']+)'\s*\)/.exec(env);
  assert.ok(m, 'không đọc được mặc định JWT_REFRESH_EXPIRES');
  assert.match(
    m[1],
    /^\d+[smhd]$/,
    'hạn refresh không còn là một khoảng hữu hạn — đọc lại câu chữ ở trang khoá',
  );
});

test('không nói "Miễn phí" hai lần, và không confetti', () => {
  const [, detail] = SRC[0];
  // 15/10/2026 — lớp đổi từ `edu-cd-price` (toàn cục, CSS legacy) sang
  // `styles.price` của CourseShell.module.css khi trang chuyển sang bảng kem.
  assert.ok(/styles\.price\}>Miễn phí/.test(detail), 'vẫn phải nói giá một lần');
  assert.ok(
    !/Hoàn toàn không mất phí/.test(detail),
    'dòng nhắc lại "miễn phí" kèm 🎉 đã quay lại',
  );
});

test('không hứa "mọi thiết bị" — chính repo bác lại', () => {
  // Dòng CUỐI của khối brochure, và là dòng duy nhất fe2bffa bỏ sót: commit đó
  // gỡ "Chứng chỉ hoàn thành" + "Truy cập vĩnh viễn", viết 12 dòng chú thích
  // "không hứa thứ repo không làm được", rồi để nguyên dòng này — mà chính
  // repo bác nó: `lib/lesson-intro.ts` khai `BOOK_MIN_WIDTH_PX = 861`, tức
  // dưới 861px hoạt cảnh mở sổ KHÔNG dựng được và bài học rơi về bản rút gọn.
  // Ca cũ canh 4 trong 5 dòng và bỏ đúng dòng sai — nên bài học ở đây không
  // phải "thêm một chuỗi cấm", mà là: ca canh một KHỐI thì phải canh CẢ khối.
  const intro = readFileSync(join(ROOT, 'src/lib/lesson-intro.ts'), 'utf8');
  assert.match(
    intro,
    /BOOK_MIN_WIDTH_PX\s*=\s*\d+/,
    'mốc bề rộng tối thiểu biến mất — đọc lại lời hứa về thiết bị ở trang khoá',
  );
  for (const [rel, code] of SRC) {
    assert.ok(!/mọi thiết bị/i.test(code), `${rel} còn hứa "mọi thiết bị"`);
  }
});

test('mọi dòng của khối "KHOÁ HỌC BAO GỒM" đều được một ca nào đó soi', () => {
  // Chốt chặn cho đúng lỗi trên: nếu khối mọc thêm dòng mà không ai thêm ca,
  // ca này đỏ. Số dòng là thứ đếm được; nội dung từng dòng thì các ca khác lo.
  const [, detail] = SRC[0];
  const khoi = /edu-cd-includes[\s\S]*?<\/div>\s*<\/div>/.exec(detail)
    ?? /incItem[\s\S]*$/.exec(detail);
  assert.ok(khoi, 'không tìm thấy khối "KHOÁ HỌC BAO GỒM"');
  const soDong = (detail.match(/className=\{styles\.incItem\}/g) ?? []).length;
  assert.equal(
    soDong,
    5,
    'số dòng trong khối đổi rồi — mỗi dòng phải có một ca soi nội dung của nó',
  );
});

test('hai dòng thay thế nói đúng thứ đo được', () => {
  for (const [rel, code] of SRC) {
    assert.ok(/không khoá theo thứ tự/.test(code), `${rel} thiếu dòng "mọi bài mở sẵn"`);
    assert.ok(/lưu theo phiên/.test(code), `${rel} thiếu dòng nói thật về phiên`);
  }
});
