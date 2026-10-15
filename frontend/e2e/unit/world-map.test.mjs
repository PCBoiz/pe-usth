/**
 * BẢN ĐỒ THẾ GIỚI của trang chủ — ca kiểm cho `src/lib/world-map.ts`,
 * `src/app/WorldMap.tsx` và `src/app/world-map.module.css`.
 *
 * Nguồn thiết kế: `design/project/Main.dc.html` (artboard, khối `.map`) và
 * `design-system-v2.md`.
 *
 * ── VÌ SAO BẢN ĐỒ CẦN TEST CHỨ KHÔNG CHỈ CẦN XEM ───────────────────────
 *
 *  1. ARTBOARD VẼ BỐN THỨ KHÔNG CÓ DỮ LIỆU THẬT: dấu tích "đã xong 7 / 7 bài",
 *     huy hiệu "BẠN Ở ĐÂY" quầng tím, "1.240 XP" trên thanh trên, và chú giải
 *     "nét đặc là đoạn bạn đã đi". Trang chủ KHÔNG gọi API (nó công khai, và
 *     `apiFetch` gặp 401 là TỰ TẠO tài khoản khách — bẫy trong AGENTS.md), nên
 *     mọi con số về việc học ở đây đều là số bịa. Dựng theo artboard mà không
 *     có lưới này thì bốn thứ đó bò vào từng chút một, và trên màn chúng trông
 *     y như tính năng chạy được.
 *  2. KHÔNG CÓ CƠ CHẾ KHOÁ NÀO. Grep cả frontend lẫn backend: không có khoá
 *     chặng. Một ổ khoá vừa bị gỡ ở dc3620d vì nó nằm cạnh đúng câu "không
 *     khoá theo thứ tự". Bản đồ là chỗ dễ vẽ ổ khoá nhất.
 *  3. SỐ CHẶNG/BÀI phải ĐẾM từ `curricula.json` — bẫy "hai nguồn danh sách
 *     bài": `catalog.ts` là bản chép tay từ seed, giáo trình thật ở
 *     curricula.json. Viết cứng "8" ở đây thì dựng lại pe-v4 là bản đồ nói sai.
 *  4. HOẠT ẢNH phải tắt khi người dùng xin giảm chuyển động, và trạng thái NGHỈ
 *     trong CSS phải LÀ trạng thái cuối — nếu không thì mỗi đường hỏng (thiếu
 *     WAAPI, animation bị cancel, JS không chạy) để lại một bản đồ TRẮNG.
 *
 * Mọi phép so dưới đây TỰ KIỂM trên chuỗi/giá trị CŨ (chuỗi của artboard, hoặc
 * một bản sai dựng tay) trước khi soi mã thật — ca xanh vì mẫu hỏng là ca vô
 * dụng. Và không có chỗ nào dựng regex bằng `new RegExp(` + template literal:
 * trong template literal `\b` là ký tự BACKSPACE, nên mẫu đó khớp rỗng và ca
 * xanh cả khi vi phạm còn nguyên.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildRegions,
  decorStep,
  MAP_COPY,
  REGION_NAMES,
  REGION_SPOTS,
  regionStep,
} from '../../src/lib/world-map.ts';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

/** Bỏ chú thích: chú thích KỂ LẠI chuỗi cũ và phải được phép nhắc tới nó. */
const codeOnly = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');

/**
 * Chuẩn hoá TRƯỚC khi so — hai thứ từng lọt qua mọi luật của repo này:
 *  · NFD: "khoá" gõ bằng dấu TỔ HỢP là dãy ký tự khác hẳn bản dựng sẵn;
 *  · khoảng trắng không ngắt (U+00A0) và hai dấu cách liền nhau.
 */
const chuanHoa = (s) => s.normalize('NFC').replace(/\s+/g, ' ').trim();

const MAP_TSX = codeOnly(read('src', 'app', 'WorldMap.tsx'));
const MAP_TS = codeOnly(read('src', 'lib', 'world-map.ts'));
const MAP_CSS = read('src', 'app', 'world-map.module.css');
/** CSS đã bỏ chú thích — chú thích KỂ LẠI cái sai ("@media đo màn hình") nên mọi
 *  phép so về CẤU TRÚC phải chạy trên bản này, không thì nó bắt chính lời giải
 *  thích làm vi phạm. */
const CSS_CODE = MAP_CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
const PAGE = codeOnly(read('src', 'app', 'page.tsx'));

/** Giáo trình thật — cùng file mà trang khoá đọc để vẽ 48 bài. */
const MODULES = JSON.parse(read('src', 'lib', 'curricula.json')).CURRICULA.python_advanced.modules;
const LESSON_URL = '/lesson/python_advanced';
const REGIONS = buildRegions(MODULES, LESSON_URL);

const CO_DAU_VIET =
  /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩậắằẳẵặẹẻẽếềểệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;

/** Mọi chuỗi HIỂN THỊ của một file: trong nháy LẪN chữ thẳng giữa hai thẻ JSX. */
function vietStrings(code) {
  const out = [];
  for (const m of code.matchAll(/(['"`])((?:[^\\\n]|\\.)*?)\1/g)) {
    if (CO_DAU_VIET.test(m[2].normalize('NFC'))) out.push(chuanHoa(m[2]));
  }
  for (const m of code.matchAll(/>([^<>{}]+)</g)) {
    const s = chuanHoa(m[1]);
    if (s && (CO_DAU_VIET.test(s) || /[🔥🔒\d]/u.test(s))) out.push(s);
  }
  return out;
}

/** Mọi chuỗi mà bản đồ có thể in ra màn. */
const ALL_COPY = [
  ...Object.values(MAP_COPY),
  ...REGIONS.flatMap((r) => [r.name, r.meta, r.ariaLabel]),
  ...vietStrings(MAP_TSX),
  ...vietStrings(MAP_TS),
];

/* ═══ 1 · số chặng/bài ĐẾM từ giáo trình ════════════════════════════════ */

test('tám nút chặng dựng từ curricula.json, không viết cứng con số nào', () => {
  assert.equal(REGIONS.length, MODULES.length);
  assert.equal(REGIONS.length, 8);

  // Số bài trên từng nút là số bài THẬT của chặng đó, và tổng lại đúng 48.
  let tong = 0;
  for (let i = 0; i < REGIONS.length; i += 1) {
    const count = MODULES[i].lessons.length;
    tong += count;
    assert.ok(
      REGIONS[i].meta.includes(`${count} bài`),
      `nút ${i + 1} không nói đúng số bài của chặng (${count}): ${REGIONS[i].meta}`,
    );
    // Và phải dẫn ra tên chặng THẬT, không chỉ cái tên ẩn dụ của artboard.
    assert.ok(
      REGIONS[i].meta.includes(MODULES[i].title.trim()),
      `nút ${i + 1} không dẫn tên chặng thật: ${REGIONS[i].meta}`,
    );
  }
  assert.equal(tong, 48);

  // Con số 8 và 48 không được nằm trong mã: chúng phải đi ra từ giáo trình.
  // (Bảng vị trí có đúng 8 dòng, nhưng đó là toạ độ, không phải số đếm.)
  for (const [name, code] of [['WorldMap.tsx', MAP_TSX], ['world-map.ts', MAP_TS]]) {
    const hits = vietStrings(code).filter((s) => /\b(8 chặng|48 bài)\b/.test(s));
    assert.deepEqual(hits, [], `${name} viết cứng hình dạng khoá: ${hits.join(' | ')}`);
  }
});

test('giáo trình lệch số chặng thì bỏ tên ẩn dụ, không gọi sai tên chặng', () => {
  // Tên ẩn dụ ("Hoạ thất", "Thư khố") gắn với THỨ TỰ M1→M8. Giáo trình đổi số
  // chặng mà vẫn dán tên theo chỉ số là gọi chặng pandas là "Hoạ thất".
  const ba = buildRegions(MODULES.slice(0, 3), LESSON_URL);
  assert.equal(ba.length, 3);
  for (const r of ba) {
    assert.ok(
      !REGION_NAMES.includes(r.name),
      `giáo trình 3 chặng mà vẫn dùng tên ẩn dụ của artboard: ${r.name}`,
    );
  }
  // Và vẫn phải đứng được, không in "undefined".
  for (const r of ba) {
    for (const v of [r.name, r.meta, r.ariaLabel, r.href]) {
      assert.ok(!/undefined|null|NaN/.test(String(v)), `nút in ra giá trị rỗng: ${v}`);
    }
  }
  assert.deepEqual(buildRegions(undefined, LESSON_URL), []);
  assert.deepEqual(buildRegions(null, LESSON_URL), []);
});

test('liên kết trỏ tới bài ĐẦU của chặng, tính trên danh sách phẳng 48 bài', () => {
  // `?lesson=` đếm từ 0 trên danh sách phẳng (CourseDetail.tsx dùng cùng cách),
  // nên chỉ số bài đầu chặng là tổng số bài của các chặng TRƯỚC nó.
  let flat = 0;
  for (let i = 0; i < REGIONS.length; i += 1) {
    assert.equal(REGIONS[i].href, `${LESSON_URL}?lesson=${flat}`);
    flat += MODULES[i].lessons.length;
  }
  // Nút cuối không được trỏ về bài 0 — đó là lỗi "mọi nút dẫn về một chỗ".
  const dich = new Set(REGIONS.map((r) => r.href));
  assert.equal(dich.size, REGIONS.length, 'có hai nút chặng dẫn tới cùng một bài');
});

/* ═══ 2 · không tiến độ bịa, không chuỗi ngày, không ổ khoá ═════════════ */

test('không vẽ tiến độ: không "đã xong N / N bài", không "BẠN Ở ĐÂY", không XP', () => {
  // Bốn chuỗi CỦA ARTBOARD — tự kiểm mẫu trên chính chúng trước.
  const CUA_ARTBOARD = [
    'M1 · Tiến trình · đã xong 7 / 7 bài',
    'BẠN Ở ĐÂY',
    '1.240 XP',
    'Câu đã chắc: 37',
    'M2 · Đa luồng · xong 2 / 6 bài',
  ];
  const TIEN_DO =
    /đã xong \d|xong \d+ ?\/ ?\d|BẠN Ở ĐÂY|bạn đang ở đây|\bXP\b|Câu đã chắc|\d+ ?% hoàn/i;
  for (const s of CUA_ARTBOARD) {
    assert.ok(TIEN_DO.test(chuanHoa(s)), `mẫu không bắt nổi chuỗi artboard: ${s}`);
  }

  const bad = ALL_COPY.filter((s) => TIEN_DO.test(s));
  assert.deepEqual(
    bad, [],
    'Trang chủ không gọi API nên nó KHÔNG BIẾT người xem học tới đâu. Vẽ tiến độ '
    + 'ở đây là số bịa, và nó làm mất đáng tin cả những con số thật (8 chặng · 48 '
    + 'bài). Muốn có tiến độ thật thì đọc bằng apiFetchSessionOnly.\n' + bad.join('\n'),
  );
});

test('không chuỗi ngày, không ngọn lửa trên bản đồ', () => {
  const CHUOI = /🔥|chuỗi ngày|giữ chuỗi|ngày liên tiếp|liên tiếp|\d ?\/ ?7 ?ngày|streak/i;
  assert.ok(CHUOI.test('0 ngày · Học ngay để giữ chuỗi'), 'mẫu không bắt nổi huy hiệu cũ');
  const bad = ALL_COPY.filter((s) => CHUOI.test(s));
  assert.deepEqual(
    bad, [],
    'Chuỗi ngày là chỉ số TỤT khi người học nghỉ; bản thiết kế đã gỡ hẳn.\n' + bad.join('\n'),
  );
});

test('bản đồ không khoá gì: không ổ khoá, không "mở khi đủ N bài"', () => {
  const KHOA = /🔒|ổ khoá|ổ khóa|bị khoá|bị khóa|mở khoá|mở khóa|mở khi đủ|chưa mở/i;
  for (const s of ['🔒 Chặng 2 mở khi đủ 5 bài', 'Chặng này bị khoá', 'Đã mở khoá chặng 3']) {
    assert.ok(KHOA.test(chuanHoa(s)), `mẫu không bắt nổi vi phạm dựng tay: ${s}`);
  }
  const bad = ALL_COPY.filter((s) => KHOA.test(s));
  assert.deepEqual(
    bad, [],
    'Không có cơ chế khoá chặng nào trong frontend lẫn backend. Vẽ ổ khoá là hứa '
    + 'một cánh cửa không tồn tại và lấy đi quyền tự chọn bài.\n' + bad.join('\n'),
  );
  /*
   * ĐỔI LUẬT ngày 15/10/2026 — ca này TỪNG đòi điều ngược lại:
   *
   *     assert.match(MAP_COPY.caption, /vào được/);
   *
   * Lý lẽ cũ: gỡ ổ khoá mà không nói thì người học vẫn tưởng phải đi tuần tự.
   * Chủ sản phẩm quyết ngược — bỏ hẳn câu dưới bản đồ. Tám nút trên hình đều
   * là liên kết thật và `ariaLabel` của mỗi nút kết thúc bằng "mở bài đầu
   * chặng", nên cả người dùng chuột và trình đọc màn hình đều biết bấm vào thì
   * đi đâu. Một dòng chữ lặp lại điều đó là văn kể lể, không phải khả năng
   * tiếp cận.
   */
  assert.ok(
    !('caption' in MAP_COPY),
    'MAP_COPY lại mọc `caption` — bản đồ không được kéo theo một câu chú thích dẫn dắt.',
  );
  const dan = MAP_TSX.match(/className=\{styles\.caption\}/g) ?? [];
  assert.deepEqual(dan, [], 'WorldMap lại dựng một <p> chú thích: ' + dan.join(' '));
  // Phần aria vẫn phải còn — đó là chỗ THẬT nói "bấm vào thì đi đâu".
  for (const r of REGIONS) {
    assert.match(r.ariaLabel, /mở bài đầu chặng$/);
  }
});

test('câu dưới bản đồ không chú giải một thứ không có trên hình', () => {
  // Artboard: "Nét đặc là đoạn bạn đã đi, nét chấm là đoạn chưa học." Nửa câu
  // đó nói về TIẾN ĐỘ, mà bản đồ này vẽ một đường nét đứt đều một kiểu.
  const CU = 'Nét đặc là đoạn bạn đã đi, nét chấm là đoạn chưa học.';
  const NET = /nét đặc|đoạn bạn đã đi|đoạn chưa học/i;
  assert.ok(NET.test(chuanHoa(CU)), 'mẫu không bắt nổi câu artboard');
  const bad = ALL_COPY.filter((s) => NET.test(s));
  assert.deepEqual(bad, [], `chú giải cho một thứ không được vẽ:\n${bad.join('\n')}`);
});

test('bản đồ không chạm vào đường mạng — không có đường rơi xuống ensureGuest()', () => {
  for (const [name, code] of [['WorldMap.tsx', MAP_TSX], ['world-map.ts', MAP_TS]]) {
    for (const pattern of [/\bapiFetch\b/, /ensureGuest/, /auth\/guest/, /\bfetch\s*\(/]) {
      assert.ok(
        !pattern.test(code),
        `${name} chạm vào đường mạng (${pattern}): apiFetch gặp 401 là TỰ TẠO tài `
        + 'khoản khách cho mọi con bot mở trang chủ.',
      );
    }
  }
});

/* ═══ 3 · bàn phím + trình đọc màn hình ════════════════════════════════ */

test('mỗi nút chặng là một <a href> thật, có nhãn thật', () => {
  // `<a href>` chứ không `<div onClick>`: bản đồ là lối đi chính vào khoá nên
  // nó phải đi được bằng Tab, mở được bằng Enter và bấm giữa chuột ra tab mới.
  assert.match(MAP_TSX, /<a\s/, 'không có liên kết nào trong bản đồ');
  assert.match(MAP_TSX, /href=\{region\.href\}/, 'liên kết không lấy đích từ dữ liệu');
  assert.match(MAP_TSX, /aria-label=\{region\.ariaLabel\}/, 'liên kết không có nhãn');
  const divClick = MAP_TSX.match(/<(div|span)[^>]*onClick/g) ?? [];
  assert.deepEqual(divClick, [], `nút bắt sự kiện trên thẻ không bấm được: ${divClick.join(' ')}`);
  assert.ok(!/role="button"/.test(MAP_TSX), 'role="button" trên một thứ thật ra là liên kết');

  // Nhãn phải nói đủ: tên chặng + số bài + bấm vào thì đi đâu.
  for (let i = 0; i < REGIONS.length; i += 1) {
    const r = REGIONS[i];
    assert.ok(r.ariaLabel.includes(r.name), `nhãn nút ${i + 1} không có tên chặng`);
    assert.ok(/\d+ bài/.test(r.ariaLabel), `nhãn nút ${i + 1} không nói số bài`);
    assert.match(r.ariaLabel, /mở bài/, `nhãn nút ${i + 1} không nói bấm vào thì đi đâu`);
    assert.ok(!/🔒|▶/.test(r.ariaLabel), 'ký tự trang trí lọt vào tên của liên kết');
  }
});

test('hình trang trí đều aria-hidden, nên không ai nghe tên chặng hai lần', () => {
  // Mỗi `<svg>` trong bản đồ là trang trí: nghĩa đã nằm trong `aria-label` của
  // liên kết. Thiếu `aria-hidden` thì trình đọc màn hình đọc cả đống path.
  const svgs = MAP_TSX.match(/<svg[^>]*>/g) ?? [];
  assert.ok(svgs.length >= 2, 'không thấy hình nào trong bản đồ');
  const tran = svgs.filter((s) => !/aria-hidden/.test(s));
  assert.deepEqual(tran, [], `hình trang trí chưa aria-hidden: ${tran.join(' ')}`);
  // Nhãn chữ trong nút cũng ẩn với trình đọc màn hình, vì `aria-label` của
  // liên kết đã nói y nguyên nội dung đó.
  assert.match(MAP_TSX, /regionName\}\s+aria-hidden="true"/);
  assert.match(MAP_TSX, /regionMeta\}\s+aria-hidden="true"/);
});

/* ═══ 4 · hoạt ảnh: tắt khi xin giảm chuyển động ════════════════════════ */

test('prefers-reduced-motion ⇒ KHÔNG có bước nào (không phải bước ngắn hơn)', () => {
  assert.equal(regionStep(0, true), null);
  assert.equal(regionStep(7, true), null);
  assert.equal(decorStep(true), null);
  // Và nhánh thường thì phải có thật — nếu không, ca trên xanh vì hàm luôn null.
  assert.ok(regionStep(0, false), 'nhánh thường không có bước nào: hàm luôn trả null');
  assert.ok(decorStep(false));

  // Component phải ĐỌC tuỳ chọn đó và thoát sớm, chứ không chỉ gọi hàm lib.
  assert.match(MAP_TSX, /usePrefersReducedMotion\(\)/);
  assert.match(MAP_TSX, /if \(reduced\) return;/);
});

test('hoạt ảnh chỉ đổi transform/opacity, và theo thang 200/320/450ms', () => {
  const steps = [regionStep(0, false), regionStep(3, false), decorStep(false)];
  const CHO_PHEP = new Set(['opacity', 'transform', 'offset', 'easing', 'composite']);
  for (const step of steps) {
    for (const frame of step.keyframes) {
      for (const key of Object.keys(frame)) {
        assert.ok(
          CHO_PHEP.has(key),
          `keyframe đổi "${key}" — chỉ transform/opacity chạy được trên lớp `
          + 'composite; mọi thuộc tính khác buộc trình duyệt tính lại layout.',
        );
      }
    }
    assert.ok(
      [200, 320, 450].includes(step.options.duration),
      `thời lượng ${step.options.duration}ms không nằm trong thang 3 bậc của `
      + 'design-system-v2 (200 / 320 / 450)',
    );
    // `forwards` là mùi của "trạng thái nghỉ chưa phải trạng thái cuối".
    assert.notEqual(
      step.options.fill, 'forwards',
      'fill: forwards giữ style của animation lại trên phần tử — trạng thái nghỉ '
      + 'của CSS phải ĐÃ LÀ trạng thái cuối, không cần ai giữ hộ.',
    );
  }
  // Giãn cách tăng theo chỉ số, nên tám nút hiện lần lượt, không hiện một cục.
  assert.ok(regionStep(3, false).options.delay > regionStep(1, false).options.delay);
});

test('trạng thái nghỉ trong CSS LÀ trạng thái cuối — không có opacity: 0', () => {
  // Nếu `.region` nghỉ ở `opacity: 0` thì mọi đường hỏng (JS không chạy, thiếu
  // WAAPI, animation bị cancel, người dùng xin giảm chuyển động) để lại một bản
  // đồ TRẮNG. Tự kiểm mẫu trên một bản sai dựng tay trước.
  const SAI = '.region { opacity: 0; transform: translateY(10px); }';
  const AN = /opacity:\s*0(\D|$)|transform:\s*translate/;
  assert.ok(AN.test(SAI), 'mẫu không bắt nổi bản sai dựng tay');
  // Chạy trên bản ĐÃ BỎ CHÚ THÍCH: chú thích ở đầu file giải thích đúng cái sai
  // này ("đặt `opacity: 0` ở đây là một bản đồ TRẮNG"), nên soi cả chú thích thì
  // ca trượt vì chính lời giải thích.
  const hits = CSS_CODE.split('\n').map((l) => l.trim()).filter((l) => AN.test(l));
  assert.deepEqual(
    hits, [],
    'trạng thái nghỉ phải là trạng thái CUỐI (hiện rõ, không dịch).',
  );
  // Và chỗ căn giữa nút dùng thuộc tính `translate` riêng, KHÔNG dùng
  // `transform`: hoạt ảnh chạy trên `transform`, nên nếu căn giữa cũng nằm
  // trong `transform` thì keyframe ĐÈ mất nó và tám nút nhảy chỗ ở khung đầu.
  assert.match(CSS_CODE, /translate:\s*-50% -48px/);
});

/* ═══ 5 · bố cục: hẹp thì rút gọn, và đo KHỐI không đo màn ══════════════ */

test('mốc gãy bố cục đo bề rộng KHỐI (@container), không bề rộng màn', () => {
  // Bản đồ là một khối và nó có thể bị đặt vào một cột hẹp trên màn hình rộng:
  // `@media (max-width: …)` đo màn nên trong trường hợp đó nó vẫn giữ bố cục
  // rộng và tám nhãn đè lên nhau.
  assert.match(CSS_CODE, /container-type:\s*inline-size/);
  assert.match(CSS_CODE, /@container \(max-width:\s*\d+px\)/);
  const media = CSS_CODE.match(/@media[^{]*\(\s*(?:max|min)-width[^{]*\{/g) ?? [];
  assert.deepEqual(media, [], `mốc theo bề rộng MÀN HÌNH: ${media.join(' ')}`);
});

test('dạng rút gọn: xếp dọc, bỏ hình trang trí, không tràn ngang', () => {
  const at = CSS_CODE.indexOf('@container');
  const compact = CSS_CODE.slice(at);
  assert.match(compact, /aspect-ratio:\s*auto/, 'khung hẹp vẫn giữ tỷ lệ 1000/660 thì tràn');
  assert.match(compact, /flex-direction:\s*column/, 'dạng hẹp phải xếp dọc');
  assert.match(compact, /position:\s*static/, 'nút vẫn position:absolute thì chồng lên nhau');
  assert.match(compact, /\.decor\s*\{\s*display:\s*none/, 'lưới/đường đi phải ẩn ở dạng danh sách');
  // Vùng chạm tối thiểu 44 × 44 của bản thiết kế.
  assert.match(compact, /min-height:\s*44px/);
});

test('vị trí tám nút trong CSS khớp REGION_SPOTS, không lệch một con số', () => {
  // Toạ độ nằm ở CSS (không `style={{ left, top }}`: SSR tuần tự hoá style nội
  // tuyến thành `style="…"`, đúng thứ đang chặn việc bỏ `style-src
  // 'unsafe-inline'`). Hai nơi thì phải có người so, không thì chúng lệch im.
  assert.equal(REGION_SPOTS.length, 8);
  for (let i = 0; i < REGION_SPOTS.length; i += 1) {
    const { left, top } = REGION_SPOTS[i];
    const block = CSS_CODE.match(new RegExp('\\.spot' + (i + 1) + '\\s*\\{([^}]*)\\}'));
    assert.ok(block, `CSS thiếu .spot${i + 1}`);
    assert.ok(
      block[1].includes(`left: ${left}%`) && block[1].includes(`top: ${top}%`),
      `.spot${i + 1} là {${block[1].trim()}} nhưng REGION_SPOTS nói ${left}% / ${top}%`,
    );
  }
  // Và TSX phải lấy lớp theo chỉ số, không gán tay tám lần.
  assert.match(MAP_TSX, /styles\[`spot\$\{i \+ 1\}`\]/);
  const inline = MAP_TSX.match(/style=\{\{/g) ?? [];
  assert.deepEqual(inline, [], 'style nội tuyến trong bản đồ — thêm nợ cho style-src');
});

/* ═══ 6 · token: màu CHƯA CHỐT nên không mã màu nào ═════════════════════ */

test('không mã màu nào trong CSS bản đồ — mọi màu đi qua token --ds-*', () => {
  // Không chỉ vì lint:tokens: BẢNG MÀU CHƯA CHỐT (chủ sản phẩm đang cân nhắc
  // quay về bảng xanh–đỏ của bản gốc, artboard thì nền kem). Mọi màu đi qua
  // token thì đổi bảng màu chỉ phải sửa studio-tokens.css.
  const body = MAP_CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const mau = body.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|lab|color-mix)\(/g) ?? [];
  assert.deepEqual(mau, [], `mã màu viết cứng: ${mau.join(' ')}`);
  // `--edu-*` là bảng xanh kế thừa từ bản Django; trang chủ đã chuyển sang
  // --ds-*, chỉ `--edu-font` còn được đọc.
  const edu = (body.match(/--edu-[\w-]+/g) ?? []).filter((t) => t !== '--edu-font');
  assert.deepEqual(edu, [], `đọc token bảng cũ: ${edu.join(' ')}`);
  // Và làm nhạt bằng MÀU, không bằng `opacity` — hạ độ đục làm cả chữ lẫn viền
  // tụt theo và không đo được bằng token.
  const mo = (body.match(/opacity:\s*[\d.]+/g) ?? []);
  assert.deepEqual(mo, [], `làm nhạt bằng opacity: ${mo.join(' ')}`);
  // TSX cũng vậy.
  const hex = MAP_TSX.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  assert.deepEqual(hex, [], `mã màu trong WorldMap.tsx: ${hex.join(' ')}`);
});

test('mọi cỡ chữ đi qua thang --ds-fs-*, không chỗ nào < 15px', () => {
  const SCALE = new Map(
    [...read('public', 'static', 'css', 'studio-tokens.css')
      .matchAll(/(--ds-fs-[\w-]+)\s*:\s*(\d+(?:\.\d+)?)px\s*;/g)]
      .map((m) => [m[1], Number(m[2])]),
  );
  const body = MAP_CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const px = body.match(/font-size:\s*\d+(?:\.\d+)?px/g) ?? [];
  assert.deepEqual(px, [], `cỡ chữ không qua thang: ${px.join(' ')}`);
  const tokens = [...body.matchAll(/font-size:\s*var\((--ds-fs-[\w-]+)\)/g)].map((m) => m[1]);
  assert.ok(tokens.length >= 4, 'không thấy khai báo cỡ chữ nào — đọc lại mẫu');
  for (const t of tokens) {
    assert.ok(SCALE.has(t), `${t} không phải một bậc có thật của thang`);
    assert.ok(SCALE.get(t) >= 15, `${t} = ${SCALE.get(t)}px, dưới sàn 15px`);
  }
  // Câu dưới bản đồ là CÂU VĂN người học đọc để biết làm gì tiếp ⇒ cỡ thân.
  const caption = body.match(/\.caption\s*\{[^}]*font-size:\s*var\((--ds-fs-[\w-]+)\)/);
  assert.ok(caption, '.caption không khai cỡ chữ');
  assert.ok(
    SCALE.get(caption[1]) >= 17,
    `.caption là câu văn nhưng chỉ ${SCALE.get(caption[1])}px (cỡ thân ≥ 17px)`,
  );
});

/* ═══ 7 · trang chủ có nối bản đồ vào, và vẫn không gọi API ═════════════ */

test('trang chủ dựng bản đồ từ giáo trình, không từ con số rời', () => {
  assert.match(PAGE, /<WorldMap/, 'trang chủ không dựng bản đồ');
  assert.match(PAGE, /buildRegions\(modules, headCourse\.lessonUrl\)/);
  // Và trang chủ vẫn phải là trang tĩnh.
  for (const pattern of [/\bapiFetch\b/, /ensureGuest/, /\bfetch\s*\(/]) {
    assert.ok(!pattern.test(PAGE), `trang chủ chạm vào đường mạng: ${pattern}`);
  }
});

/* ───────────────────────────────────────────────────────────────────────
 * BẰNG CHỨNG CA NÀY BẮT ĐƯỢC LỖI THẬT — 12 phép đột biến chạy ngày 15/10/2026,
 * mỗi phép gây lại rồi phục hồi, KHÔNG phép nào đi qua được (tổng 14 ca đỏ):
 *
 *  1. Thêm lại dòng tiến độ của artboard vào `buildRegions`
 *     ("đã xong 0 / 7 bài")                                      → 1 ca đỏ
 *  2. Thêm huy hiệu "BẠN Ở ĐÂY" vào nhãn nút                      → 1 ca đỏ
 *  3. Dán ổ khoá 🔒 + "mở khi đủ 5 bài" vào nhãn nút              → 1 ca đỏ
 *  4. Đổi `<a href>` thành `<div role="button" onClick>`          → 1 ca đỏ
 *  5. Bỏ `if (reduced) return;` trong component                   → 1 ca đỏ
 *  6. Cho `regionStep` vẫn trả bước khi `reduced`                 → 1 ca đỏ
 *  7. Đặt `.region { opacity: 0 }` làm trạng thái nghỉ            → 2 ca đỏ
 *  8. Đổi `@container` thành `@media`                             → 2 ca đỏ
 *  9. Sửa `.spot7` thành `left: 80%`, lệch REGION_SPOTS           → 1 ca đỏ
 * 10. Viết mã màu `#8E7652` thay `var(--ds-sketch)`               → 1 ca đỏ
 * 11. Hạ `.caption` xuống `var(--ds-fs-label)` (15px)             → 1 ca đỏ
 * 12. Lặp cứng 8 chặng thay vì đếm từ giáo trình                  → 1 ca đỏ
 * ─────────────────────────────────────────────────────────────────────── */
