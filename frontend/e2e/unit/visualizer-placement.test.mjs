/**
 * "Xem từng bước" nằm TRONG mục kết quả của `/ide`, và câu dẫn của nó không
 * nhắc lại tiêu đề.
 *
 * ===========================================================================
 * CA NÀO BẮT LỖI GÌ (gỡ bản sửa ra thì đúng những ca này trượt)
 * ===========================================================================
 *  - "nằm trong mục kết quả" trượt nếu `<CodeVisualizer>` bị đưa trở lại thành
 *    khối riêng dưới cả hai cột. Trước bản sửa nó đứng sau `</div>` của lưới,
 *    kéo hết chiều ngang trang, nên console bị đẩy lên và tách rời khỏi vết
 *    của chính nó.
 *  - "mốc gãy đo theo bề rộng khối" là ca quan trọng hơn: từ lúc khối vào cột
 *    kết quả, một màn 1600px vẫn chỉ cho nó ~700px. Mốc `@media` theo bề rộng
 *    MÀN HÌNH sẽ bày hai cột vào chỗ không đủ hai cột — và không ca nào thấy,
 *    vì CSS vẫn hợp lệ. Ca này trượt nếu `container-type` biến mất hoặc nếu
 *    mốc gãy bố cục quay về `@media`.
 *  - "không vẽ hộp trong hộp" trượt nếu `.panel` mọc lại nền/viền/bo góc/đổ
 *    bóng — khung chứa `.outputPane` đã có đúng bốn thứ đó.
 *  - "câu dẫn không nhắc lại tiêu đề" trượt nếu câu mở đầu bằng chính ba chữ
 *    vừa in ở `<h2>` ngay trên nó.
 *  - "không nói sandbox với người học" trượt nếu từ đó quay lại bề mặt — nó là
 *    từ của nhóm làm sản phẩm; `/ide` đã dọn ở 12643ee, đây là hai chỗ còn lại.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { TRACE_COST_NOTE } from '../../src/lib/trace.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (...p) => readFileSync(join(ROOT, ...p), 'utf8');

const IDE = read('src', 'app', 'ide', 'IdeClient.tsx');
const VIZ_CSS = read('src', 'components', 'code-visualizer', 'CodeVisualizer.module.css');
const VIZ_TSX = read('src', 'components', 'code-visualizer', 'CodeVisualizer.tsx');

/** Bỏ chú thích — chú thích ĐƯỢC nhắc lại chuyện cũ để giải thích vì sao. */
const codeOnly = (s) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*/g, '');

test('"Xem từng bước" nằm TRONG mục kết quả, không phải khối riêng dưới trang', () => {
  const code = codeOnly(IDE);
  const moMuc = code.indexOf('className={styles.outputPane}');
  assert.ok(moMuc > 0, 'không tìm thấy mục kết quả');
  const dongMuc = code.indexOf('</section>', moMuc);
  const viTriViz = code.indexOf('<CodeVisualizer', moMuc);
  assert.ok(viTriViz > 0, 'không tìm thấy <CodeVisualizer>');
  assert.ok(
    viTriViz < dongMuc,
    '<CodeVisualizer> lại nằm NGOÀI mục kết quả — người học phải nhìn xuống '
      + 'một vùng thứ ba để đọc cùng một thứ',
  );
});

test('mốc gãy bố cục đo theo bề rộng KHỐI, không theo bề rộng màn hình', () => {
  assert.match(
    VIZ_CSS,
    /container-type:\s*inline-size/,
    'mất `container-type` thì mốc gãy không còn đo được bề rộng khối',
  );
  assert.ok(
    /@container[^{]*\{[^}]*grid-template-columns/.test(VIZ_CSS.replace(/\s+/g, ' ')),
    'mốc gãy của lưới phải là @container',
  );
  // Và không được còn một @media nào đổi số cột — đó chính là lỗi cũ.
  const mediaDoiCot = VIZ_CSS
    .replace(/\s+/g, ' ')
    .match(/@media[^{]*\{[^}]*grid-template-columns[^}]*\}/g);
  assert.equal(
    mediaDoiCot,
    null,
    'còn @media đổi số cột: màn rộng mà cột hẹp vẫn sẽ bị bày hai cột',
  );
});

test('không vẽ hộp trong hộp', () => {
  // `.panel` nằm trong `.outputPane`, mà khung đó đã có đủ bốn thứ này.
  const panel = /\.panel\s*\{([^}]*)\}/.exec(VIZ_CSS);
  assert.ok(panel, 'không tìm thấy .panel');
  for (const thua of ['box-shadow', 'border-radius']) {
    assert.ok(
      !new RegExp(thua).test(panel[1]),
      `.panel còn khai ${thua} — khung chứa đã có rồi`,
    );
  }
  assert.ok(!/background:/.test(panel[1]), '.panel còn khai nền riêng');
  // Viền thì chỉ được còn MỘT đường kẻ trên, không phải khung bao quanh.
  //
  // Đọc TÊN THUỘC TÍNH ở đầu mỗi dòng khai báo, không grep cả khối: bản đầu
  // của ca này dùng /border[^:]*:/ và nó bắt trúng chữ "border" nằm trong GIÁ
  // TRỊ `var(--edu-panel-border)`, rồi báo lỗi một dòng hoàn toàn đúng. Cùng
  // họ với cái bẫy `` trong template literal đã ghi ở seo-copy.test.mjs:
  // phép so sai thì nó nói dối theo cả hai chiều.
  const vien = panel[1]
    .split(';')
    .map((d) => d.trim().split(':')[0].trim())
    .filter((ten) => ten.startsWith('border'));
  assert.deepEqual(vien, ['border-top'], '.panel chỉ được giữ đường kẻ trên');
});

test('câu dẫn không nhắc lại tiêu đề ngay trên nó', () => {
  assert.ok(
    VIZ_TSX.includes('>Xem từng bước</h2>'),
    'tiêu đề đổi rồi — đọc lại câu dẫn bên dưới nó',
  );
  assert.ok(
    !TRACE_COST_NOTE.startsWith('Xem từng bước'),
    'câu dẫn mở đầu bằng đúng ba chữ vừa in ở tiêu đề',
  );
  // Tự kiểm phép so trên câu CŨ, để nó không im lặng đạt.
  assert.ok('Xem từng bước chạy chương trình MỘT lần'.startsWith('Xem từng bước'));
});

test('không nói "sandbox" với người học', () => {
  for (const [ten, src] of [['trace.ts (câu dẫn)', TRACE_COST_NOTE], ['CodeVisualizer', codeOnly(VIZ_TSX)]]) {
    assert.ok(!src.includes('sandbox'), `${ten} còn nói "sandbox"`);
  }
});
