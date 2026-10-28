/**
 * Khối `diagram` của màn đọc: SƠ ĐỒ BẰNG DOM, không phải ảnh.
 *
 * VÌ SAO FILE NÀY TỒN TẠI. Ba trên bốn người trả lời khảo sát ngày 29/10/2026
 * chọn *"Chữ và nhãn TRONG sơ đồ quá nhỏ, phải phóng to mới đọc được"*. Chữ đó
 * nằm trong PNG 780×455 nên CSS không với tới được: chữ của TRANG reflow, chữ
 * trong ẢNH thì scale — trên màn 360px ảnh bị bóp 0,46× và nhãn 10pt hiện ra
 * 4–5px. SVG chỉ chữa một nửa, vì ở cỡ hiển thị mặc định nó có đúng cỡ chữ như
 * PNG. Cách duy nhất là để chữ LÀ CHỮ.
 *
 * PHÉP THỬ: hôm nay đúng MỘT bài (PY05 · thứ tự phép tính). File này canh cả
 * hai nửa của nó — dữ liệu build phát ra, và renderer dựng nó bằng gì.
 *
 * HAI quyết định được GHIM ở đây, không phải thẩm mỹ:
 *   · HÌNH TĨNH, không animation. Toàn bộ giá trị nằm ở việc SO HAI LÀN cạnh
 *     nhau, mà so sánh thì cần cả hai cùng có mặt; một animation chạy lần lượt
 *     phá đúng cái nó định dạy (Tversky 2002: "clever schematization of static
 *     diagrams may be just as effective as animation").
 *   · KHÔNG khai font-family cho phần chữ. Mục đích của khối này là kế thừa
 *     --edu-font và cỡ chữ của trang; ghi font ở đây là dựng lại đúng cái
 *     tường nó ra đời để phá, và sẽ lệch với Montserrat ở lần đổi font sau.
 *
 * ABLATION (đo ngày 29/10/2026) — 12 mảnh:
 *   build.py thôi phát sơ đồ (SO_DO_DOC rỗng)           → 1 đỏ ở đây
 *                                                       + 2 đỏ ở studio-lesson
 *   gỡ `case 'diagram'` khỏi ReadScreen                 → 2 đỏ (+ typecheck đỏ)
 *   dựng `{block.title}` trần thay cho `paragraphs(...)` → 1 đỏ
 *   đổi <ol>/<li> thành chuỗi <span>                    → 1 đỏ
 *   mũi tên → đưa vào DOM thay vì CSS                   → 1 đỏ
 *   grid cố định `repeat(2, 1fr)` thay auto-fit          → 1 đỏ
 *   bỏ `max-width` (trần hai cột) khỏi grid              → 1 đỏ
 *   khai font-family cho .readDiagramNote               → 1 đỏ
 *   thêm `animation`/`transition` vào khối sơ đồ         → 1 đỏ
 *   hạ font-size của làn về 13px                        → 1 đỏ
 *   bước đầu của một làn đổi thành biểu thức không có trong bài → 1 đỏ
 *   bỏ một làn (còn 3 → số lẻ)                          → 1 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const doc = (...p) => readFileSync(join(ROOT, ...p), 'utf8').replace(/\r/g, '');

const SCREEN = doc('frontend', 'src', 'components', 'python-studio', 'screens', 'ReadScreen.tsx');
const CSS = doc('frontend', 'src', 'components', 'python-studio', 'studio-chrome.module.css');
// Bản ĐÃ BÓC CHÚ THÍCH của ReadScreen. Cần nó cho các phép "không được có X
// trong DOM": chú thích của khối `code` ngay trên dùng dấu → để tả nhịp đọc
// ("người học đọc code → đọc kết quả"), nên quét cả file thì ca đó đỏ oan.
// `doc()` đã bỏ ký tự CR vì file trong repo là CRLF.
const SCREEN_CODE = SCREEN.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');
const BUILD = doc('scripts', 'pe-da', 'build.py');
const CHECK = doc('scripts', 'pe-da', 'check.py');

const DA = JSON.parse(doc('scripts', 'pe-da', 'out', 'lessons.json')).lessons;

/** Mọi khối `diagram` của bản dựng, kèm bài và màn chứa nó. */
const soDo = DA.flatMap((b) =>
  (b.content_json.step_1?.read ?? []).flatMap((lat, man) =>
    lat
      .map((k, i) => ({ ma: b.lesson_code, man, i, lat, k }))
      .filter((x) => x.k.type === 'diagram'),
  ),
);

/** Một quy tắc CSS theo selector, trả phần thân trong {…}. */
function rule(selector) {
  const esc = selector.replace(/[.+*()[\]]/g, (ch) => `\\${ch}`);
  const m = CSS.match(new RegExp(`${esc}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `thiếu quy tắc CSS ${selector}`);
  return m[1];
}

// ───────────────────────────── dữ liệu build phát ra

test('sơ đồ CÓ ĐƯỜNG TỚI người học — đúng một bài, đúng chỗ', () => {
  // Lỗi hay gặp nhất của repo này không phải "làm sai" mà là "làm rồi không ai
  // nối" (AGENTS.md: tracer không bài nào tới, nút Try-it không màn nào mount).
  // Một loại khối khai trong ReadBlock mà build không bao giờ phát thì với
  // người học nó không tồn tại.
  assert.equal(soDo.length, 1, 'bản dựng không có khối diagram nào');
  assert.equal(soDo[0].ma, 'PY05');
  // Và nó phải đứng SAU khối code nó gộp lại: đọc sơ đồ trước code là đọc đáp
  // án trước đề.
  const truoc = soDo[0].lat.slice(0, soDo[0].i).map((k) => k.type);
  assert.ok(truoc.includes('code'), `sơ đồ đứng sau ${truoc.join(' ')} — thiếu code`);
});

test('hình dạng: chữ thật ở cả ba chỗ, làn CHẴN, bước ≥ 2', () => {
  for (const { ma, k } of soDo) {
    assert.equal(typeof k.title, 'string');
    assert.ok(k.title.trim().length > 0, `${ma}: sơ đồ không có tiêu đề`);
    assert.ok(Array.isArray(k.lanes) && k.lanes.length >= 2, `${ma}: cần ≥ 2 làn`);
    // SỐ CHẴN: grid dựng hai cột, một làn lẻ đứng một mình ở hàng cuối là mất
    // phép so sánh — đúng thứ duy nhất khối này mang lại.
    assert.equal(k.lanes.length % 2, 0, `${ma}: ${k.lanes.length} làn, phải chẵn`);
    for (const lane of k.lanes) {
      assert.ok(lane.label?.trim(), `${ma}: làn thiếu nhãn`);
      assert.ok(lane.note?.trim(), `${ma}: làn thiếu lời chú`);
      assert.ok(Array.isArray(lane.steps) && lane.steps.length >= 2, `${ma}: làn < 2 bước`);
      for (const s of lane.steps) assert.ok(String(s).trim(), `${ma}: bước rỗng`);
      // Backtick phải đi theo CẶP: `withInlineCode` chỉ bóc được cặp, một dấu
      // lẻ hiện ra nguyên văn trước mặt người học.
      for (const chu of [lane.label, lane.note, k.title]) {
        assert.equal((chu.match(/`/g) ?? []).length % 2, 0, `${ma}: backtick lẻ trong "${chu}"`);
      }
    }
  }
});

test('sơ đồ còn NỐI VỚI bài: bước đầu trong code, bước cuối trong kết quả', () => {
  // Dữ liệu sơ đồ là chữ người viết đặt (SO_DO_DOC trong build.py), KHÔNG suy
  // ra từ nguồn — nên nó có thể trôi: nguồn sửa `3 * 15 - 5` thành con số
  // khác, bài dạy một chuyện và sơ đồ dạy chuyện khác ngay cạnh nó, không log
  // nào đỏ. Phép so này là thứ duy nhất chạm tới bài.
  const gon = (t) => String(t).replace(/\s+/g, '');
  for (const { ma, k } of soDo) {
    const bai = DA.find((b) => b.lesson_code === ma);
    const khoi = bai.content_json.step_1.read.flat();
    const code = gon(
      khoi
        .filter((x) => x.type === 'code')
        .map((x) => x.code)
        .join(''),
    );
    const kq = gon(
      khoi
        .filter((x) => x.type === 'code')
        .map((x) => x.expected ?? '')
        .join(''),
    );
    for (const lane of k.lanes) {
      assert.ok(
        code.includes(gon(lane.steps[0])),
        `${ma}: biểu thức "${lane.steps[0]}" không có trong code của bài`,
      );
      assert.ok(
        kq.includes(gon(lane.steps.at(-1))),
        `${ma}: kết quả "${lane.steps.at(-1)}" không có trong expected của bài`,
      );
    }
  }
});

// ───────────────────────────── renderer

test('ReadScreen có nhánh diagram, và `default` vẫn ép never', () => {
  // Không render được JSX trong runner này (node --test chỉ bóc kiểu), nên
  // kiểm ở mức NGUỒN — vẫn bắt đúng hồi quy cần chặn.
  assert.match(SCREEN, /case 'diagram':/);
  assert.match(SCREEN, /const unhandled: never = block;/);
});

test('CẢ BA chỗ có chữ đi qua CÙNG một hàm bóc backtick', () => {
  // Bẫy `withInlineCode` của AGENTS.md: cùng một câu chữ đi hai đường thì
  // đường không ai nghĩ tới sẽ in ra nguyên hai dấu backtick. Ô tổng kết đã
  // hỏng đúng kiểu này ngày 27/10 và người thử gửi ảnh.
  for (const chu of ['paragraphs(block.title)', 'paragraphs(lane.label)', 'paragraphs(lane.note)']) {
    assert.ok(SCREEN.includes(chu), `thiếu ${chu}`);
  }
  for (const tran of ['{block.title}', '{lane.label}', '{lane.note}']) {
    assert.ok(!SCREEN_CODE.includes(tran), `${tran} dựng trần — backtick sẽ lọt ra`);
  }
});

test('các bước là DÃY CÓ THỨ TỰ (<ol>), mũi tên do CSS vẽ', () => {
  // <ol> nói ra "đây là một chuỗi" cho trình đọc màn hình mà không cần thêm
  // chữ nào ("mục 1 trên 3"). Mũi tên thì là TRANG TRÍ: để nó trong DOM là bắt
  // trình đọc màn hình đọc "right arrow" giữa mỗi bước.
  assert.match(SCREEN, /<ol className=\{c\.readDiagramSteps\}>/);
  assert.match(SCREEN, /<li key=\{j\}>/);
  assert.ok(!SCREEN_CODE.includes('→'), 'mũi tên nằm trong DOM — phải để CSS vẽ');
  assert.match(rule('.readDiagramSteps li + li::before'), /content: '→'/);
});

test('hai cột khi còn chỗ, một cột khi hẹp — KHÔNG ghim cứng 2 cột', () => {
  // Trên màn 360px, hai làn 165px thì biểu thức tự xuống dòng giữa toán tử:
  // chữ vẫn đọc được nhưng SƠ ĐỒ thì hết là sơ đồ. Đó là lý do auto-fit.
  const grid = rule('.readDiagramGrid');
  assert.match(grid, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(/);
  assert.ok(!/repeat\(2,/.test(grid), 'ghim cứng 2 cột — hỏng ở màn hẹp');
  // Và TRẦN HAI CỘT: `auto-fit` nhồi được bao nhiêu cột thì nhồi, nên ở cột
  // rộng của màn đọc desktop cả BỐN làn nằm trên MỘT hàng — lúc đó "hai làn
  // cạnh nhau" không còn là một cặp và phép so sánh tan ra. Đo trong Chrome:
  // không có max-width thì ở khung 1 100px grid cho 4 cột; có nó thì luôn 2.
  const min = Number(grid.match(/minmax\((\d+)px/)[1]);
  const max = Number(grid.match(/max-width:\s*(\d+)px/)[1]);
  assert.ok(max >= 2 * min + 10, `max-width ${max}px không đủ cho hai cột ${min}px`);
  assert.ok(max < 3 * min + 20, `max-width ${max}px lọt được cột thứ BA`);
});

test('chữ của sơ đồ KẾ THỪA font của trang', () => {
  // Đây là toàn bộ lý do khối này tồn tại. Khai font-family ở đây là dựng lại
  // đúng cái tường nó ra đời để phá — và sẽ lệch ở lần đổi font sau (Poppins →
  // Montserrat ngày 29/10 đã phải đi sáu chỗ).
  for (const sel of ['.readDiagram', '.readDiagramTitle', '.readDiagramLabel', '.readDiagramNote']) {
    assert.ok(!/font-family/.test(rule(sel)), `${sel} khai font-family`);
  }
  // Ngoại lệ duy nhất, có chủ đích: biểu thức Python là CODE nên dùng mono.
  assert.match(rule('.readDiagramSteps code'), /font-family:\s*'JetBrains Mono'/);
});

test('cỡ chữ trong sơ đồ không nhỏ hơn 14px — đây chính là lời phàn nàn', () => {
  for (const sel of ['.readDiagramSteps code', '.readDiagramLabel', '.readDiagramNote']) {
    const px = Number(rule(sel).match(/font-size:\s*(\d+)px/)?.[1]);
    assert.ok(px >= 14, `${sel} có font-size ${px}px — nhỏ hơn thân bài`);
  }
});

test('HÌNH TĨNH: không animation, không transition trên khối sơ đồ', () => {
  // Quyết định có bằng chứng, không phải để tiết kiệm công — xem đầu file.
  // Ghim ở đây vì "thêm một animation nhỏ cho sinh động" là việc rất dễ làm.
  for (const sel of [
    '.readDiagram',
    '.readDiagramGrid',
    '.readDiagramLane',
    '.readDiagramTitle',
    '.readDiagramLabel',
    '.readDiagramNote',
    '.readDiagramSteps',
  ]) {
    assert.ok(!/animation|transition/.test(rule(sel)), `${sel} có animation/transition`);
  }
});

// ───────────────────────────── bốn chỗ phải đổi cùng lúc

test('cả BỐN chỗ biết loại khối mới', () => {
  // AGENTS.md: "Màn đọc có NĂM loại khối, và ba chỗ phải đổi cùng lúc" — cộng
  // check.py là bốn. Bỏ sót một chỗ thì hoặc trang trắng (renderer), hoặc loại
  // khối lạ trôi vào DB mà không ai chặn (check.py).
  assert.match(doc('frontend', 'src', 'lib', 'studio-lesson.ts'), /type: 'diagram';/);
  assert.match(SCREEN, /case 'diagram':/);
  assert.match(BUILD, /^SO_DO_DOC: dict\[tuple\[str, int\], dict\] = \{/m);
  assert.match(CHECK, /LOAI_KHOI = \{[^}]*'diagram'/);
  assert.match(CHECK, /def kiem_so_do\(/);
});

test('build.py đỏ khi một khoá SO_DO_DOC không trúng khối nào', () => {
  // Gõ sai mã bài hay lệch chỉ số khối thì sơ đồ lặng lẽ không được phát ra —
  // và một sơ đồ không ai thấy thì không có log nào đỏ. Cổng này là chỗ duy
  // nhất bắt được.
  assert.match(BUILD, /if so_do_phat != len\(SO_DO_DOC\):/);
  assert.match(BUILD, /so_do_phat != len\(SO_DO_DOC\)[\s\S]{0,400}return 1/);
});
