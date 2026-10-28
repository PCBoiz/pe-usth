/**
 * ĐÓNG BÀI RỒI QUAY LẠI DANH SÁCH: phải mở đúng module chứa bài vừa học.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: một người thử ngày 27/10 viết nguyên văn
 *
 *   "1 Vấn đề khó chịu là khi t chọn 1 khóa trong mục 2,3 thì khi mà t click
 *    vào dấu x để tắt hoặc về trang thì nó lại mở full list mục 1 và t lại
 *    phải tìm lại bài nếu t học mục 2,3"
 *
 * Tức nút × — đường ra DUY NHẤT của màn bài học — luôn thả người học xuống đầu
 * một khoá 172 bài chia 10 module. Nó cộng dồn với chuyện thiếu nút quay lại
 * (xem lesson-back.test.mjs): lỡ bấm Tiếp theo thì cách duy nhất để xem lại là
 * đóng bài, mà đóng bài thì mất luôn chỗ đang đứng.
 *
 * BỐN tính chất, và tính chất thứ nhất là tính chất hỏng IM LẶNG:
 *
 *  1. LỆCH MỘT ĐƠN VỊ giữa hai cách đánh số. `lessonNo` ở màn bài học là
 *     `sort_order`, đếm từ 1. Link ở trang khoá học là chỉ số PHẲNG, đếm từ 0.
 *     Quên trừ 1 thì nó vẫn mở đúng module ở hầu hết các bài, nên trông như
 *     chạy được — chỉ sai ở bài ĐẦU của mỗi module, tức đúng chỗ không ai thử.
 *     Ca ở đây kiểm RANH GIỚI của cả 10 module thật.
 *  2. KHÔNG ghim cứng module 0 làm module mở sẵn.
 *  3. CUỘN nằm ở effect RIÊNG. Bản đầu nhét `requestAnimationFrame` vào cùng
 *     effect mở module và đo được `scrollY` = 0: lúc rAF chạy thì module chứa
 *     bài còn chưa mở, nên `scrollIntoView` nhắm vào phần tử chưa có chỗ trên
 *     trang. Mở module 20 bài mà không cuộn thì bài vẫn ngoài màn hình.
 *  4. KHÔNG `useSearchParams()`. Trang khoá học là SSG và AGENTS.md ghi rõ nó
 *     KHÔNG được gọi API nào; `useSearchParams` buộc trang rời khỏi dạng tĩnh.
 *     Và setState phải HOÃN khỏi thân effect — React 19 chặn (đã làm lint đỏ
 *     một lần trong chính lần sửa này).
 *
 * ABLATION:
 *   leave() bỏ `- 1` (dùng thẳng lessonNo)     → 1 đỏ
 *   open quay về `mi === 0`                     → 1 đỏ
 *   gộp cuộn vào chung effect mở module         → 1 đỏ
 *   setState gọi thẳng trong thân effect        → 1 đỏ
 *   moduleChuaBai kẹp về 0 thay vì trả -1       → 1 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { moduleChuaBai } from '../../src/lib/curriculum-nav.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const doc = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

/**
 * Bỏ chú thích trước khi so. CẦN, không phải cho gọn: bản đầu của ca
 * "không dùng useSearchParams" đỏ ngay, vì CourseDetail.tsx có một dòng chú
 * thích GIẢI THÍCH vì sao không dùng nó — tức ca test đỏ vì nguồn nói đúng
 * điều ca test muốn. AGENTS.md đã ghi đúng họ bẫy này hai lần (`noreferrer`,
 * và dấu × của ConsentBanner).
 */
const boChuThich = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((d) => !d.trimStart().startsWith('//'))
    .join('\n');

const DETAIL = doc(join(FE, 'src', 'app', '(standalone)', 'courses', '[courseId]', 'CourseDetail.tsx'));
const SHELL = doc(join(FE, 'src', 'components', 'python-studio', 'StudioLesson.tsx'));
const CURRICULA = JSON.parse(doc(join(FE, 'src', 'lib', 'curricula.json'))).CURRICULA;

const MODULES = CURRICULA.python_advanced?.modules ?? [];

// ---------------------------------------------------------------------------
// 1. RANH GIỚI — chỗ lệch-một-đơn-vị lộ ra
// ---------------------------------------------------------------------------

test('có đủ dữ liệu thật để kiểm — 10 module, 172 bài', () => {
  // Nếu giáo trình đổi thì hai con số này đổi theo; ca này chỉ để một bản
  // curricula.json RỖNG không làm mấy ca dưới đạt vì không có gì để kiểm.
  assert.ok(MODULES.length >= 2, `Chỉ thấy ${MODULES.length} module.`);
  const tong = MODULES.reduce((a, m) => a + m.lessons.length, 0);
  assert.ok(tong > 100, `Chỉ thấy ${tong} bài.`);
});

test('bài ĐẦU và bài CUỐI của mọi module đều map về đúng module đó', () => {
  // Offset tính ĐỘC LẬP ở đây (cộng dồn trực tiếp từ dữ liệu), không gọi lại
  // moduleChuaBai — nếu không thì ca test so hàm với chính nó.
  let dau = 0;
  for (let mi = 0; mi < MODULES.length; mi += 1) {
    const n = MODULES[mi].lessons.length;
    const cuoi = dau + n - 1;
    assert.equal(moduleChuaBai(MODULES, dau), mi, `bài đầu của module ${mi} (chỉ số ${dau})`);
    assert.equal(moduleChuaBai(MODULES, cuoi), mi, `bài cuối của module ${mi} (chỉ số ${cuoi})`);
    dau += n;
  }
});

test('chỉ số ngoài khoá trả -1, KHÔNG kẹp về 0', () => {
  const tong = MODULES.reduce((a, m) => a + m.lessons.length, 0);
  // `?lesson=` đến từ URL, ai cũng gõ được. Kẹp về 0 thì một số rác lại mở
  // module 1 và cuộn lung tung, trong khi điều đúng là không làm gì cả.
  assert.equal(moduleChuaBai(MODULES, tong), -1);
  assert.equal(moduleChuaBai(MODULES, -1), -1);
  assert.equal(moduleChuaBai(MODULES, 1.5), -1);
  assert.equal(moduleChuaBai(MODULES, Number.NaN), -1);
});

test('màn bài học trừ 1 khi trả chỉ số về trang khoá học', () => {
  assert.match(
    SHELL,
    /\/courses\/\$\{courseId\}\?lesson=\$\{lessonNo - 1\}/,
    '`lessonNo` là sort_order đếm từ 1, link ở trang khoá học là chỉ số phẳng '
      + 'đếm từ 0. Thiếu `- 1` thì chỉ sai ở bài đầu mỗi module.',
  );
});

// ---------------------------------------------------------------------------
// 2–4. TRANG KHOÁ HỌC
// ---------------------------------------------------------------------------

test('module mở sẵn KHÔNG còn ghim cứng là module 0', () => {
  assert.match(DETAIL, /openModules\[mi\] \?\? mi === moduleMacDinh/);
});

test('cuộn nằm ở effect RIÊNG, phụ thuộc moduleMacDinh', () => {
  // Bản đầu nhét rAF vào cùng effect mở module và đo được scrollY = 0.
  const effects = [...DETAIL.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[([^\]]*)\]\);/g)];
  const cuon = effects.filter((m) => m[1].includes('scrollIntoView'));
  assert.equal(cuon.length, 1, 'Phải có đúng MỘT effect lo việc cuộn.');
  assert.match(cuon[0][2], /moduleMacDinh/, 'Effect cuộn phải chạy lại sau khi module mở.');
  assert.ok(
    !cuon[0][1].includes('setModuleMacDinh'),
    'Effect cuộn mà cũng mở module thì lại rơi về đúng thứ tự sai cũ.',
  );
});

test('không dùng useSearchParams — trang khoá học phải ở dạng tĩnh', () => {
  assert.ok(
    !/useSearchParams/.test(boChuThich(DETAIL)),
    'useSearchParams buộc trang rời khỏi SSG. Trang khoá học là trang CÔNG '
      + 'KHAI và AGENTS.md ghi rõ nó không được gọi API nào.',
  );
  assert.match(DETAIL, /window\.location\.search/);
});

test('setState HOÃN khỏi thân effect — React 19 chặn gọi thẳng', () => {
  const effects = [...DETAIL.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[([^\]]*)\]\);/g)];
  for (const [, than] of effects) {
    for (const m of than.matchAll(/^\s*(setModuleMacDinh|setBaiCanCuon)\(/gm)) {
      // Gọi ở đầu dòng trong thân effect, không nằm trong callback nào: đúng
      // thứ `react-hooks/set-state-in-effect` cấm. Trong setTimeout thì dòng
      // thụt sâu hơn và có `setTimeout` đứng trước nó trong cùng thân.
      const truoc = than.slice(0, m.index);
      assert.ok(
        truoc.includes('setTimeout'),
        `${m[1]} gọi thẳng trong thân effect — React 19 báo "cascading renders".`,
      );
    }
  }
});
