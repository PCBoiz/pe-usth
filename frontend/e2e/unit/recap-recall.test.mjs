// CỔNG HỒI TƯỞNG ở màn tổng kết.
//
// Hôm nay **100% màn tổng kết là ĐỌC LẠI**: `facts` lấy đoạn văn đầu của từng
// màn đọc. Roediger & Karpicke 2006 — nhóm HỒI TƯỞNG nhớ 61% sau một tuần, nhóm
// ĐỌC LẠI 40%, mà nhóm đọc lại TỰ TIN hơn. Tức màn tổng kết đang bán đúng cái
// cảm giác nắm được mà không kèm việc nắm được.
//
// `Recap.tsx` và `RecapScreen.tsx` là .tsx nên `node --test` không import được
// (cùng giới hạn đã ghi cho `primaryCta`), nên bộ này canh bằng phép đọc cây mã
// cộng phép đếm trên bản dựng thật. Phần import được — trường nháp — thì canh
// bằng cách gọi thẳng.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { initialLessonDraft } from '../../src/lib/studio-lesson.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const doc = (p) => readFileSync(join(ROOT, p), 'utf8');

const SRC_RECAP = doc('frontend/src/components/lesson-chrome/exercises/Recap.tsx');
const SRC_MAN = doc('frontend/src/components/python-studio/screens/RecapScreen.tsx');
const SRC_LIB = doc('frontend/src/lib/studio-lesson.ts');
const BUILD = JSON.parse(doc('scripts/pe-da/out/lessons.json'));

test('`recall` là MỘT trường của bản nháp, có sẵn từ đầu', () => {
  const d = initialLessonDraft({});
  assert.equal(d.recall, '');
  // MỘT trường, không hai: chữ đang gõ mà chưa nộp để trong state component.
  // Thêm một trường thứ hai cho nó là thêm một thứ phải khớp, và nó sẽ lệch.
  assert.ok(!('recallDraft' in d) && !('recallSeen' in d), 'có trường thứ hai cho cùng việc');
});

test('CỔNG, không phải ô tuỳ chọn — nút khoá tới khi viết', () => {
  // Hundhausen 2002: Gurka lặp lại thí nghiệm nhưng BỎ điều kiện bắt buộc thì
  // lợi thế BIẾN MẤT. Một ô bỏ qua được thì cùng loại với "Thử lại" trần.
  assert.ok(
    /disabled=\{!chu\.trim\(\)\}/.test(SRC_RECAP),
    'nút "Xem tóm tắt" không khoá khi ô còn trống',
  );
  // Và ô tóm tắt phải nằm SAU cổng, không hiện song song.
  assert.ok(
    /hoiTruoc && !hoiTruoc\.daViet \?/.test(SRC_RECAP),
    'ô KIẾN THỨC CỐT LÕI không nằm sau cổng',
  );
});

test('KHÔNG chấm chữ người học viết, và nói thẳng điều đó', () => {
  // Không có đáp án máy đọc được cho "bạn nhớ được gì", nên một lời chấm ở đây
  // chỉ có thể là giả. Chữ trong ô phải nói ra điều đó để người học không ngồi
  // soạn câu cho "đúng".
  assert.ok(/không ai chấm/.test(SRC_RECAP), 'ô hồi tưởng không nói rõ là không chấm');
  assert.ok(
    !/khopDapAn|verdict|Chưa khớp/.test(SRC_RECAP),
    'Recap đang so chữ người học với một đáp án — ở đây không có đáp án',
  );
});

test('bài ĐÃ HOÀN THÀNH thì không hỏi lại', () => {
  // Người quay lại ôn đã đi qua bước này một lần; bắt viết lại để xem chính thứ
  // họ đang muốn xem là ma sát không mua thêm gì.
  assert.ok(
    /completed\s*\n?\s*\?\s*undefined/.test(SRC_MAN),
    'RecapScreen vẫn dựng cổng cho bài đã hoàn thành',
  );
});

test('`textarea` chứ không `input` — câu trả lời là một-hai CÂU', () => {
  assert.ok(/<textarea/.test(SRC_RECAP), 'ô hồi tưởng dùng input một dòng');
  assert.ok(/aria-label="Viết lại thứ bạn nhớ được/.test(SRC_RECAP), 'thiếu nhãn cho trình đọc màn hình');
});

test('phủ MỌI bài — màn tổng kết có ở 179/179', () => {
  // Cổng này không lọc bài nào, nên phép đếm là số bài có màn tổng kết. Bản
  // dựng nào cũng có đúng một màn tổng kết mỗi bài (xem `buildScreens`).
  assert.ok(BUILD.lessons.length >= 179, `chỉ còn ${BUILD.lessons.length} bài`);
  // Và `facts` thật sự lấy từ màn đọc — tức nội dung ô tóm tắt ĐÚNG LÀ thứ
  // người học vừa đọc, nên "đọc lại" là mô tả đúng chứ không phải lời chê.
  assert.ok(
    /step_1\?\.read \?\? \[\]/.test(SRC_MAN),
    'facts không còn lấy từ màn đọc — xem lại lý lẽ của cổng này',
  );
  const coDoan = BUILD.lessons.filter((l) =>
    (l.content_json.step_1?.read ?? []).some((lat) => lat.some((b) => b.type === 'paragraph')),
  ).length;
  assert.ok(coDoan >= 170, `chỉ ${coDoan} bài có đoạn văn để dựng facts`);
});

test('`recall` KHÔNG lọt vào đường chấm điểm', () => {
  // Nó là một ô không chấm; nếu nó chạm tới `isGraded`/`quizPercent` thì việc
  // viết hay không viết sẽ đổi XP, mà đó là thứ chưa ai quyết.
  const vung = SRC_LIB.slice(SRC_LIB.indexOf('export function quizPercent'));
  assert.ok(!/recall/.test(vung.slice(0, 2000)), '`recall` lọt vào quizPercent');
  assert.ok(!/recall/.test(SRC_LIB.slice(SRC_LIB.indexOf('export function isGraded'), SRC_LIB.indexOf('export function isGraded') + 600)));
});
