/**
 * BẢN ĐỒ THẾ GIỚI của trang chủ — ca kiểm cho `src/lib/world-map.ts`,
 * `src/app/WorldMap.tsx` và `src/app/world-map.module.css`.
 *
 * Nguồn thiết kế: `design/v3/quyet-dinh.md` mục 2–3 (phương án A "Mặt cắt lục
 * địa") và artboard `project/Main.dc.html` + `project/MapPhone.dc.html` của
 * canvas thiết kế v3.
 *
 * ── VÌ SAO BẢN ĐỒ CẦN TEST CHỨ KHÔNG CHỈ CẦN XEM ───────────────────────
 *
 *  1. KHÔNG SỐ BỊA. Trang chủ KHÔNG gọi API (nó công khai, và `apiFetch` gặp
 *     401 là TỰ TẠO tài khoản khách — bẫy trong AGENTS.md), nên mọi con số về
 *     việc học ở đây đều là số bịa. Tiến độ là giai đoạn 2, và nó chỉ được
 *     chuẩn bị bằng hai nhóm SVG ẨN.
 *  2. KHÔNG KHOÁ, VÀ KHÔNG MỘT ĐƯỜNG QUA TÁM NÚT. Không có cơ chế khoá chặng
 *     nào. Bản cũ không vẽ ổ khoá nhưng vẽ MỘT đường zig-zag qua cả tám nút —
 *     một lời hứa ngầm về thứ tự. Đường nối nay chỉ ở chỗ phụ thuộc thật.
 *  3. SỐ CHẶNG/BÀI phải ĐẾM từ `curricula.json` — bẫy "hai nguồn danh sách
 *     bài".
 *  4. MÀU MINH HOẠ PHẢI ĐO. Bảy trên tám sắc khoáng gốc dưới 3:1 trên nền dải;
 *     sắc định hình bóng phải đạt, và chữ không bao giờ đặt lên sắc khoáng.
 *  5. HOẠT ẢNH tắt khi xin giảm chuyển động, và trạng thái NGHỈ trong CSS LÀ
 *     trạng thái cuối.
 *
 * Mọi phép so dưới đây TỰ KIỂM trên chuỗi/giá trị CŨ (chuỗi của artboard, hoặc
 * một bản sai dựng tay) trước khi soi mã thật — ca xanh vì mẫu hỏng là ca vô
 * dụng. Và không có chỗ nào dựng regex bằng `new RegExp(` + template literal
 * thường: trong template literal `\b` là ký tự BACKSPACE, nên mẫu đó khớp rỗng
 * và ca xanh cả khi vi phạm còn nguyên. Cần ghép mẫu thì dùng `String.raw`.
 *
 * Import kiểu `* as WM`: thiếu một export (vd. chạy bộ ca này trên bản đồ cũ)
 * thì từng ca trượt với lời giải thích của nó, không phải cả file chết ở dòng
 * import với một câu SyntaxError.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as WM from '../../src/lib/world-map.ts';

const {
  buildRegions,
  decorStep,
  MAP_COPY,
  REGION_NAMES,
  regionStep,
} = WM;
const LAYOUT = WM.REGION_LAYOUT ?? [];
const FLOWS = WM.MAP_FLOWS ?? [];
const WELLS = WM.MAP_WELLS ?? [];
const PALETTE = WM.MAP_PALETTE ?? {};
const FRAME = WM.MAP_FRAME ?? { width: 0, height: 0 };

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

/** Bỏ chú thích: chú thích KỂ LẠI chuỗi cũ và phải được phép nhắc tới nó. */
const codeOnly = (s) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
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

/* TRANH SINH RA — `scripts/map/build_map.py`. Đọc thẳng tệp đã commit: cái mà
   trình duyệt tải về chính là cái này, nên mọi khẳng định về mật độ nét, về
   bảng màu và về ba mạch phụ thuộc đều đo trên NÓ, không trên script. */
const ART_DIR = ['public', 'map'];
const ART = read(...ART_DIR, 'world-map.svg');
const CROPS = Object.fromEntries(
  LAYOUT.map((l) => [l.key, read(...ART_DIR, `scene-${l.key}.svg`)]),
);
const artBytes = (...p) => statSync(join(FE, ...p)).size;

/** Số NÉT trong một tệp: mỗi nhóm thuộc tính là một `<path>` gộp nhiều đoạn
 *  `M…`, nên đếm lệnh `M` mới ra số nét thật, đếm `<path>` thì ra số nhóm. */
const demNet = (svg) => (svg.match(/M-?\d/g) ?? []).length;

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

/** Mọi chuỗi mà bản đồ có thể in ra màn. `silhouette` là mô tả cho người
 *  sửa code, không render — nhưng vẫn soi, phòng ai đó đem nó ra làm nhãn. */
const ALL_COPY = [
  ...Object.values(MAP_COPY),
  ...REGIONS.flatMap((r) => [r.name, r.meta, r.ariaLabel]),
  ...vietStrings(MAP_TSX),
  ...vietStrings(MAP_TS),
];

/** Độ chói tương đối và tỷ lệ tương phản WCAG 2.x — cùng công thức với
 *  `e2e/unit/ds-contrast.mjs`. */
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255]
    .map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Chuỗi dài nhất đi theo các cạnh `MAP_FLOWS` (số nút). Đồ thị nhỏ, DFS đủ. */
function longestChain(edges) {
  const next = new Map();
  for (const { from, to } of edges) {
    next.set(from, [...(next.get(from) ?? []), to]);
  }
  const walk = (node, seen) => {
    let best = seen.size;
    for (const to of next.get(node) ?? []) {
      if (!seen.has(to)) best = Math.max(best, walk(to, new Set([...seen, to])));
    }
    return best;
  };
  let best = 0;
  for (const { from } of edges) best = Math.max(best, walk(from, new Set([from])));
  return best;
}

/* ═══ 1 · số chặng/bài ĐẾM từ giáo trình ════════════════════════════════ */

test('tám vùng dựng từ curricula.json, không viết cứng con số nào', () => {
  assert.equal(REGIONS.length, MODULES.length);
  assert.equal(REGIONS.length, 8);

  // Số bài trên từng vùng là số bài THẬT của chặng đó, và tổng lại đúng 48.
  let tong = 0;
  for (let i = 0; i < REGIONS.length; i += 1) {
    const count = MODULES[i].lessons.length;
    tong += count;
    assert.ok(
      REGIONS[i].meta.includes(`${count} bài`),
      `vùng ${i + 1} không nói đúng số bài của chặng (${count}): ${REGIONS[i].meta}`,
    );
    // Và phải dẫn ra tên chặng THẬT, không chỉ cái tên ẩn dụ.
    assert.ok(
      REGIONS[i].meta.includes(MODULES[i].title.trim()),
      `vùng ${i + 1} không dẫn tên chặng thật: ${REGIONS[i].meta}`,
    );
  }
  assert.equal(tong, 48);

  // Con số 8 và 48 không được nằm trong mã: chúng phải đi ra từ giáo trình.
  // (Bảng bố cục có đúng 8 dòng, nhưng đó là toạ độ, không phải số đếm.)
  for (const [name, code] of [['WorldMap.tsx', MAP_TSX], ['world-map.ts', MAP_TS]]) {
    const hits = vietStrings(code).filter((s) => /\b(8 chặng|48 bài)\b/.test(s));
    assert.deepEqual(hits, [], `${name} viết cứng hình dạng khoá: ${hits.join(' | ')}`);
  }
});

test('giáo trình lệch số chặng thì bỏ tên ẩn dụ VÀ bỏ chỗ trên mặt cắt', () => {
  // Tên ẩn dụ và tiểu cảnh gắn với THỨ TỰ M1→M8. Giáo trình đổi số chặng mà
  // vẫn dán theo chỉ số là gọi chặng pandas là "Hoạ thất" — hay đặt chặng thứ
  // chín lên hồ của hai bài dự án.
  const ba = buildRegions(MODULES.slice(0, 3), LESSON_URL);
  assert.equal(ba.length, 3);
  for (const r of ba) {
    assert.ok(
      !REGION_NAMES.includes(r.name),
      `giáo trình 3 chặng mà vẫn dùng tên ẩn dụ: ${r.name}`,
    );
    assert.equal(r.layout, null, `giáo trình 3 chặng mà vẫn mang chỗ trên mặt cắt: ${r.name}`);
  }
  // Và vẫn phải đứng được, không in "undefined".
  for (const r of ba) {
    for (const v of [r.name, r.meta, r.ariaLabel, r.href]) {
      assert.ok(!/undefined|null|NaN/.test(String(v)), `vùng in ra giá trị rỗng: ${v}`);
    }
  }
  // Tám chặng thật thì vùng nào cũng có chỗ, đúng thứ tự M1→M8.
  assert.deepEqual(REGIONS.map((r) => r.layout?.key), LAYOUT.map((l) => l.key));
  assert.equal(LAYOUT.length, REGION_NAMES.length);
  assert.deepEqual(buildRegions(undefined, LESSON_URL), []);
  assert.deepEqual(buildRegions(null, LESSON_URL), []);
  // Component có nhánh danh sách cho trường hợp đó, không vẽ tranh dở dang.
  assert.match(MAP_TSX, /regions\.every\(\(r\) => r\.layout !== null\)/);
});

test('liên kết trỏ tới bài ĐẦU của chặng, tính trên danh sách phẳng 48 bài', () => {
  let flat = 0;
  for (let i = 0; i < REGIONS.length; i += 1) {
    assert.equal(REGIONS[i].href, `${LESSON_URL}?lesson=${flat}`);
    flat += MODULES[i].lessons.length;
  }
  const dich = new Set(REGIONS.map((r) => r.href));
  assert.equal(dich.size, REGIONS.length, 'có hai vùng dẫn tới cùng một bài');
});

/* ═══ 2 · không tiến độ bịa, không chuỗi ngày, không ổ khoá ═════════════ */

test('không vẽ tiến độ: không "đã xong N / N bài", không "BẠN Ở ĐÂY", không XP, không 0/8', () => {
  const CUA_ARTBOARD = [
    'M1 · Tiến trình · đã xong 7 / 7 bài',
    'BẠN Ở ĐÂY',
    '1.240 XP',
    'Câu đã chắc: 37',
    'M2 · Đa luồng · xong 2 / 6 bài',
    '0/8 chặng',
  ];
  const TIEN_DO =
    /đã xong \d|xong \d+ ?\/ ?\d|BẠN Ở ĐÂY|bạn đang ở đây|\bXP\b|Câu đã chắc|\d+ ?% hoàn|\b\d+ ?\/ ?\d+ chặng/i;
  for (const s of CUA_ARTBOARD) {
    assert.ok(TIEN_DO.test(chuanHoa(s)), `mẫu không bắt nổi chuỗi artboard: ${s}`);
  }

  const bad = ALL_COPY.filter((s) => TIEN_DO.test(s));
  assert.deepEqual(
    bad, [],
    'Trang chủ không gọi API nên nó KHÔNG BIẾT người xem học tới đâu. Vẽ tiến độ '
    + 'ở đây là số bịa. Tiến độ là giai đoạn 2, phủ lên qua data-lit/data-marker.\n'
    + bad.join('\n'),
  );
});

test('không chuỗi ngày, không ngọn lửa, không "Boss" trên bản đồ', () => {
  const CHUOI = /🔥|chuỗi ngày|giữ chuỗi|ngày liên tiếp|liên tiếp|\d ?\/ ?7 ?ngày|streak|\bboss\b/i;
  assert.ok(CHUOI.test('0 ngày · Học ngay để giữ chuỗi'), 'mẫu không bắt nổi huy hiệu cũ');
  assert.ok(CHUOI.test('Boss cuối chặng'), 'mẫu không bắt nổi ẩn dụ đánh trận');
  const bad = ALL_COPY.filter((s) => CHUOI.test(s));
  assert.deepEqual(
    bad, [],
    'Chuỗi ngày và ẩn dụ đánh trận đều đã bị gỡ khỏi bản thiết kế.\n' + bad.join('\n'),
  );
});

test('bản đồ không khoá gì, và không câu dẫn dắt nào dưới bản đồ', () => {
  const KHOA = /🔒|ổ khoá|ổ khóa|bị khoá|bị khóa|mở khoá|mở khóa|mở khi đủ|chưa mở/i;
  for (const s of ['🔒 Chặng 2 mở khi đủ 5 bài', 'Chặng này bị khoá', 'Đã mở khoá chặng 3']) {
    assert.ok(KHOA.test(chuanHoa(s)), `mẫu không bắt nổi vi phạm dựng tay: ${s}`);
  }
  const bad = ALL_COPY.filter((s) => KHOA.test(s));
  assert.deepEqual(
    bad, [],
    'Không có cơ chế khoá chặng nào trong frontend lẫn backend.\n' + bad.join('\n'),
  );
  /*
   * ĐỔI LUẬT ngày 15/10/2026 — ca này TỪNG đòi `MAP_COPY.caption` chứa "vào
   * được". Chủ sản phẩm quyết ngược: bản đồ kể CHỈ bằng hình (thiết kế v3 mục
   * 1). Tám vùng là liên kết thật, giếng riêng của từng vùng VẼ ra chuyện "vào
   * đâu cũng được", và `ariaLabel` kết thúc bằng "mở bài đầu chặng".
   */
  assert.ok(
    !('caption' in MAP_COPY),
    'MAP_COPY lại mọc `caption` — bản đồ không được kéo theo một câu chú thích dẫn dắt.',
  );
  const CAU_CU = 'Chặng nào cũng vào được — bấm vào một chặng là mở bài đầu của chặng đó';
  const DAN = /vào được|cứ bắt đầu|bắt đầu ở đây|bắt đầu từ/i;
  assert.ok(DAN.test(CAU_CU), 'mẫu không bắt nổi câu cũ');
  const dan = ALL_COPY.filter((s) => DAN.test(s));
  assert.deepEqual(dan, [], 'câu dẫn dắt quanh bản đồ:\n' + dan.join('\n'));
  // Chỉ MỘT tiêu đề, và không đoạn văn nào trong khối.
  assert.deepEqual(MAP_TSX.match(/<p[\s>]/g) ?? [], [], 'bản đồ dựng một <p> — câu mô tả/chú thích');
  assert.deepEqual(MAP_TSX.match(/className=\{styles\.caption\}/g) ?? [], []);
  for (const r of REGIONS) {
    assert.match(r.ariaLabel, /mở bài đầu chặng$/);
  }
});

test('câu quanh bản đồ không chú giải một thứ không có trên hình', () => {
  const CU = 'Nét đặc là đoạn bạn đã đi, nét chấm là đoạn chưa học.';
  const NET = /nét đặc|đoạn bạn đã đi|đoạn chưa học/i;
  assert.ok(NET.test(chuanHoa(CU)), 'mẫu không bắt nổi câu artboard cũ');
  const bad = ALL_COPY.filter((s) => NET.test(s));
  assert.deepEqual(bad, [], `chú giải cho một thứ không được vẽ:\n${bad.join('\n')}`);
});

test('bản đồ không chạm vào đường mạng — không có đường rơi xuống ensureGuest()', () => {
  for (const [name, code] of [['WorldMap.tsx', MAP_TSX], ['world-map.ts', MAP_TS]]) {
    for (const pattern of [/\bapiFetch\w*\b/, /ensureGuest/, /auth\/guest/, /\bfetch\s*\(/]) {
      assert.ok(
        !pattern.test(code),
        `${name} chạm vào đường mạng (${pattern}): apiFetch gặp 401 là TỰ TẠO tài `
        + 'khoản khách cho mọi con bot mở trang chủ. Kể cả apiFetchSessionOnly — '
        + 'đó là việc của giai đoạn 2, không phải đợt thử nghiệm.',
      );
    }
  }
});

/* ═══ 3 · đường nối: chỉ ở chỗ phụ thuộc thật ═══════════════════════════ */

test('KHÔNG có đường nối 1→8: không chuỗi nào đi qua cả tám vùng', () => {
  // Tự kiểm: bản đồ cũ là một đường qua M1→M2→…→M8. Mẫu phải bắt được nó.
  const keys = LAYOUT.map((l) => l.key);
  assert.equal(keys.length, 8, 'không đọc được bảng bố cục — mẫu dưới đây vô nghĩa');
  const CU = keys.slice(1).map((to, i) => ({ from: keys[i], to }));
  assert.equal(longestChain(CU), keys.length, 'mẫu không nhận ra đường zig-zag cũ');

  assert.ok(
    longestChain(FLOWS) < keys.length,
    'các đường nối ghép thành MỘT chuỗi qua cả tám vùng — đúng lời hứa ngầm về '
    + 'thứ tự mà thiết kế v3 bỏ đi',
  );
  // Bốn vùng trên (mặt đất + nông) không dính đường nối nào: vào đâu cũng được.
  const noi = new Set(FLOWS.flatMap((f) => [f.from, f.to]));
  for (const l of LAYOUT.filter((x) => x.band === 'surface' || x.band === 'shallow')) {
    assert.ok(!noi.has(l.key), `${l.key} (${l.band}) bị nối vào chuỗi`);
  }
  // Và không còn đường `route` vẽ tay nào trong component hay CSS.
  assert.doesNotMatch(MAP_TSX, /styles\.route|M100 462/, 'đường zig-zag cũ còn trong WorldMap.tsx');
  assert.doesNotMatch(CSS_CODE, /\.route\b/, 'lớp .route còn trong CSS');
});

test('đường nối CHỈ có ở M5 → M6 → M7 → M8, và vẽ từ dữ liệu', () => {
  assert.deepEqual(
    FLOWS.map((f) => `${f.from}>${f.to}`),
    ['M5>M6', 'M6>M7', 'M7>M8'],
    'đường nối phải đúng ba phụ thuộc thật (gói thư viện từng bài)',
  );
  for (const f of FLOWS) {
    const a = LAYOUT.find((l) => l.key === f.from);
    const b = LAYOUT.find((l) => l.key === f.to);
    assert.ok(a && b, `đường nối trỏ tới vùng không có: ${f.from}→${f.to}`);
    assert.ok(['deep', 'floor'].includes(a.band) && ['deep', 'floor'].includes(b.band));
  }
  // Mạch sáng dựng từ MAP_FLOWS ở CẢ hai bố cục, không vẽ tay. Bản RỘNG nay
  // nằm trong tranh sinh ra (`build_map.py` đọc `MAP_FLOWS.d` rồi trải thành
  // bó nét), nên chỗ phải soi là chính tệp SVG — xem mục 10.
  assert.deepEqual(
    [...ART.matchAll(/data-flow="([^"]+)"/g)].map((m) => m[1]),
    FLOWS.map((f) => `${f.from}-${f.to}`),
    'nhóm data-flow trong tranh không khớp MAP_FLOWS',
  );
  assert.match(MAP_TSX, /MAP_FLOWS\.find\(/, 'bản hẹp không dựng mạch dọc từ MAP_FLOWS');
  const tay = MAP_TSX.match(/data-flow="[^"]*"/g) ?? [];
  assert.deepEqual(tay, [], `data-flow viết tay, không đi qua dữ liệu: ${tay.join(' ')}`);

  // Giếng KHÔNG phải đường nối: mỗi giếng đi từ mặt đất xuống ĐÚNG một vùng
  // dưới mặt đất, và không hai giếng chung một vùng.
  const dich = WELLS.map((w) => w.to);
  assert.equal(new Set(dich).size, dich.length, 'hai giếng xuống cùng một vùng');
  for (const w of WELLS) {
    const l = LAYOUT.find((x) => x.key === w.to);
    assert.ok(l && l.band !== 'surface', `giếng xuống ${w.to} — vùng mặt đất không cần giếng`);
    assert.match(w.d, /^M\d+ 23\d L/, `giếng ${w.to} không bắt đầu từ mặt đất (y ≈ 236)`);
  }
});

/* ═══ 4 · giai đoạn 2: vẽ sẵn mà ẩn ════════════════════════════════════ */

test('mỗi vùng có nhóm data-lit và data-marker — có mặt nhưng ẨN', () => {
  // Hai nhóm nằm TRONG vòng dựng từng vùng, mang khoá M1…M8 từ dữ liệu.
  const lit = MAP_TSX.match(/<g data-lit=\{layout\.key\}[^>]*>/g) ?? [];
  const marker = MAP_TSX.match(/<g data-marker=\{layout\.key\}[^>]*>/g) ?? [];
  assert.equal(lit.length, 1, 'không thấy nhóm data-lit dựng theo từng vùng');
  assert.equal(marker.length, 1, 'không thấy nhóm data-marker dựng theo từng vùng');
  // Tự kiểm mẫu "ẩn" trên một bản sai dựng tay trước.
  const AN = /display="none"/;
  assert.ok(!AN.test('<g data-lit={layout.key}>'), 'mẫu ẩn khớp cả bản không ẩn');
  for (const g of [...lit, ...marker]) {
    assert.match(g, AN, `nhóm giai đoạn 2 đang HIỆN: ${g} — đợt thử nghiệm không đọc tiến độ`);
  }
  // Mỗi vùng một khoá, đủ tám, không trùng.
  const keys = LAYOUT.map((l) => l.key);
  assert.deepEqual(keys, ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8']);
  // Không chỗ nào khác viết data-lit/data-marker cứng (vd. bật sẵn cho M1).
  const cung = MAP_TSX.match(/data-(?:lit|marker)="[^"]*"/g) ?? [];
  assert.deepEqual(cung, [], `data-lit/data-marker viết cứng: ${cung.join(' ')}`);
  // Và CSS không bật chúng lên.
  assert.doesNotMatch(CSS_CODE, /data-lit|data-marker/, 'CSS chạm vào lớp tiến độ của giai đoạn 2');
});

/* ═══ 5 · màu: đo, tách được không cần màu, chữ không lên sắc khoáng ════ */

test('sắc định hình bóng của mỗi vùng đạt ≥ 3:1 trên nền ngay sau nó', () => {
  // Tự kiểm: tím thạch anh GỐC (#7E68B0) trên dải sâu chỉ 1,42:1 — bảng phác
  // của báo cáo. Ca phải thấy nó trượt.
  assert.ok(contrast('#7E68B0', '#5F5A6B') < 3, 'công thức tương phản sai');
  assert.ok(PALETTE.band, 'không đọc được MAP_PALETTE');

  const bad = [];
  for (const l of LAYOUT) {
    const edge = PALETTE[l.key.toLowerCase()]?.edge;
    const nen = PALETTE.band[l.backdrop];
    assert.ok(edge && nen, `${l.key} thiếu sắc edge hoặc nền ${l.backdrop}`);
    const c = contrast(edge, nen);
    if (c < 3) bad.push(`${l.key} ${edge} trên ${l.backdrop} ${nen}: ${c.toFixed(2)}:1`);
  }
  // Mạch sáng chạy trên dải sâu.
  const flow = contrast(PALETTE.flow, PALETTE.band.deep);
  if (flow < 3) bad.push(`mạch sáng ${PALETTE.flow}: ${flow.toFixed(2)}:1`);
  assert.deepEqual(bad, [], 'hình phi văn bản dưới 3:1 (WCAG 1.4.11):\n' + bad.join('\n'));
});

test('bảng minh hoạ là bảng RIÊNG — không trộn vào --ds-*, không mã màu trong CSS/TSX', () => {
  // `--ds-*` là bảng GIAO DIỆN. Bảng minh hoạ có tên trong MAP_PALETTE.
  const tokens = read('public', 'static', 'css', 'studio-tokens.css').toUpperCase();
  const tron = Object.entries(PALETTE)
    .filter(([k]) => /^m\d$/.test(k))
    .map(([, v]) => v.edge)
    .filter((hex) => tokens.includes(hex.toUpperCase()));
  assert.deepEqual(tron, [], `sắc minh hoạ bị khai lại trong studio-tokens.css: ${tron.join(' ')}`);
  assert.doesNotMatch(CSS_CODE, /--ds-(?:map|mineral|region)/);

  // CSS module: không một mã màu (lint:tokens cấm hex; ở đây cấm cả rgb/hsl
  // — viết `rgb()` để lách lint là cùng một mã màu viết cách khác).
  const mau = CSS_CODE.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|lab|color-mix)\(/g) ?? [];
  assert.deepEqual(mau, [], `mã màu viết cứng trong CSS: ${mau.join(' ')}`);
  const edu = (CSS_CODE.match(/--edu-[\w-]+/g) ?? []).filter((t) => t !== '--edu-font');
  assert.deepEqual(edu, [], `đọc token bảng cũ: ${edu.join(' ')}`);
  // Làm nhạt GIAO DIỆN bằng màu, không bằng `opacity` CSS.
  const mo = CSS_CODE.match(/opacity:\s*[\d.]+/g) ?? [];
  assert.deepEqual(mo, [], `làm nhạt bằng opacity: ${mo.join(' ')}`);
  // TSX chỉ gọi màu theo TÊN (P.m1.edge…), không viết mã.
  const hex = MAP_TSX.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  assert.deepEqual(hex, [], `mã màu trong WorldMap.tsx: ${hex.join(' ')}`);
  // Và mọi mã màu trong world-map.ts đều nằm trong MAP_PALETTE.
  const start = MAP_TS.indexOf('export const MAP_PALETTE');
  const end = MAP_TS.indexOf('} as const;', start);
  assert.ok(start > 0 && end > start, 'không tìm thấy khối MAP_PALETTE');
  const ngoai = (MAP_TS.slice(0, start) + MAP_TS.slice(end)).match(/#[0-9a-fA-F]{6}\b/g) ?? [];
  assert.deepEqual(ngoai, [], `mã màu nằm ngoài MAP_PALETTE: ${ngoai.join(' ')}`);
});

test('chữ không bao giờ đặt thẳng lên sắc khoáng: tên vùng nằm trên tấm nền token', () => {
  // Không `<text>` trong SVG — mọi chữ là HTML trên `.plate`.
  assert.doesNotMatch(MAP_TSX, /<text[\s>]/, 'chữ vẽ thẳng vào tranh minh hoạ');
  // Tên và meta nằm trong `.plate`.
  assert.match(
    MAP_TSX,
    /className=\{`\$\{styles\.plate\}[^`]*`\}>\s*<span className=\{styles\.regionName\}/,
    'tên vùng không nằm trong tấm nhãn',
  );
  // `.plate` có nền token giao diện và chữ --ds-ink.
  const plate = CSS_CODE.match(/^\.plate\s*\{([^}]*)\}/m);
  assert.ok(plate, 'CSS thiếu .plate');
  assert.match(plate[1], /background:\s*var\(--ds-(?:card|paper)\)/, '.plate không có nền token');
  assert.match(plate[1], /color:\s*var\(--ds-ink\)/, '.plate không đặt chữ --ds-ink');
  // Mọi nền đổi theo dải cũng chỉ là token giao diện.
  for (const m of CSS_CODE.matchAll(/\.plate[^{]*\{([^}]*)\}/g)) {
    for (const bg of m[1].matchAll(/background:\s*([^;]+);/g)) {
      assert.match(bg[1], /^var\(--ds-(?:card|paper)\)$/, `tấm nhãn đổi nền sang thứ không phải token: ${bg[1]}`);
    }
  }
});

test('tám vùng tách được KHÔNG cần màu: mỗi vùng một hình bóng, độ sáng đổi theo dải', () => {
  // (a) Mô tả hình bóng: tám cái, không trùng.
  const sil = LAYOUT.map((l) => l.silhouette);
  assert.equal(new Set(sil).size, LAYOUT.length, `hai vùng chung một hình bóng: ${sil.join(' | ')}`);

  // (b) Hình bóng THẬT trong tranh: tám ô crop phải khác nhau từng đôi. Hai
  // tiểu cảnh chép nhau rồi đổi màu là hai vùng chỉ tách được bằng sắc — đúng
  // thứ người mù màu không thấy. Chữ ký lấy từ HÌNH HỌC (số đoạn, số nhóm, bề
  // rộng nét dùng tới), không từ màu: đổi bảng màu không được làm ca này xanh.
  const sigOf = (svg) => {
    const widths = [...new Set([...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => m[1]))];
    return [
      (svg.match(/M-?\d/g) ?? []).length,
      (svg.match(/<path /g) ?? []).length,
      widths.sort().join(','),
    ].join('|');
  };
  const scenes = Object.fromEntries(LAYOUT.map((l) => [l.key, sigOf(CROPS[l.key])]));
  assert.deepEqual(Object.keys(scenes).sort(), LAYOUT.map((l) => l.key).sort(), 'thiếu tiểu cảnh của một vùng');
  const sigs = Object.values(scenes);
  // Tự kiểm: hai chữ ký giống hệt nhau thì Set phải co lại.
  assert.equal(new Set([sigs[0], sigs[0]]).size, 1);
  assert.equal(new Set(sigs).size, sigs.length, 'hai tiểu cảnh cùng hình:\n'
    + Object.entries(scenes).map(([k, v]) => `${k}: ${v}`).join('\n'));

  // (c) Độ sáng: trời > mặt đất > nông > sâu > đáy, rồi hồ M8 SÁNG LẠI.
  const b = PALETTE.band;
  const thang = [b.sky, b.surface, b.shallow, b.deep, b.floor].map(lum);
  for (let i = 1; i < thang.length; i += 1) {
    assert.ok(thang[i] < thang[i - 1], `dải thứ ${i + 1} không tối hơn dải trên nó`);
  }
  assert.ok(lum(PALETTE.m8.edge) > lum(b.surface) * 0.6, 'hồ M8 không sáng lại ở đáy');
  assert.ok(lum(PALETTE.m8.edge) > lum(b.deep) * 3, 'hồ M8 không sáng hơn hẳn dải sâu');
});

test('chỗ bắt đầu báo bằng ÁNH SÁNG: mặt trời trong ô M1, không mũi tên, không số to', () => {
  const sun = WM.MAP_SUN;
  assert.ok(sun, 'không có MAP_SUN');
  const m1 = LAYOUT[0];
  const [x, y, w, h] = m1.box;
  assert.ok(sun.cx >= x && sun.cx <= x + w && sun.cy >= y && sun.cy <= y + h, 'mặt trời không đứng trên M1');
  // M1 đứng trên nền SÁNG NHẤT của bản vẽ.
  const nen = LAYOUT.map((l) => lum(PALETTE.band[l.backdrop]));
  assert.equal(Math.max(...nen), nen[0], 'M1 không đứng ở chỗ sáng nhất');
  // Mũi tên DUY NHẤT là đầu mạch sáng của MAP_FLOWS; không marker mũi tên,
  // không ký tự mũi tên, không chữ "bắt đầu".
  assert.doesNotMatch(MAP_TSX, /<marker[\s>]|marker-end|markerEnd|[→⟶➜▶⬇]/u, 'mũi tên chỉ chỗ bắt đầu');
  const batDau = ALL_COPY.filter((s) => /bắt đầu|start here/i.test(s));
  assert.deepEqual(batDau, [], `chữ chỉ chỗ bắt đầu: ${batDau.join(' | ')}`);
});

/* ═══ 6 · bàn phím + trình đọc màn hình ════════════════════════════════ */

test('mỗi vùng là một <a href> thật, có nhãn thật', () => {
  assert.match(MAP_TSX, /<a\s/, 'không có liên kết nào trong bản đồ');
  assert.match(MAP_TSX, /href=\{region\.href\}/, 'liên kết không lấy đích từ dữ liệu');
  assert.match(MAP_TSX, /aria-label=\{region\.ariaLabel\}/, 'liên kết không có nhãn');
  const divClick = MAP_TSX.match(/<(div|span|svg|g|path)[^>]*onClick/g) ?? [];
  assert.deepEqual(divClick, [], `vùng bắt sự kiện trên thẻ không bấm được: ${divClick.join(' ')}`);
  assert.ok(!/role="button"/.test(MAP_TSX), 'role="button" trên một thứ thật ra là liên kết');
  // Một bộ liên kết cho cả hai bố cục: đúng MỘT chỗ dựng `<a` có vùng tranh.
  const anchors = MAP_TSX.match(/<a\s/g) ?? [];
  assert.ok(anchors.length <= 2, `quá nhiều chỗ dựng liên kết (${anchors.length}) — hai bộ cho hai bố cục?`);

  for (let i = 0; i < REGIONS.length; i += 1) {
    const r = REGIONS[i];
    assert.ok(r.ariaLabel.includes(r.name), `nhãn vùng ${i + 1} không có tên chặng`);
    assert.ok(/\d+ bài/.test(r.ariaLabel), `nhãn vùng ${i + 1} không nói số bài`);
    assert.match(r.ariaLabel, /mở bài/, `nhãn vùng ${i + 1} không nói bấm vào thì đi đâu`);
    assert.ok(!/🔒|▶|\bM\d\b.*\bM\d\b/.test(r.ariaLabel), 'ký tự trang trí lọt vào tên của liên kết');
  }
});

test('hình trang trí đều aria-hidden, nên không ai nghe tên vùng hai lần', () => {
  const svgs = MAP_TSX.match(/<svg[^>]*>/g) ?? [];
  assert.ok(svgs.length >= 3, 'không thấy hình nào trong bản đồ');
  const tran = svgs.filter((s) => !/aria-hidden="true"/.test(s));
  assert.deepEqual(tran, [], `hình trang trí chưa aria-hidden: ${tran.join(' ')}`);
  assert.match(MAP_TSX, /regionName\}\s+aria-hidden="true"/);
  assert.match(MAP_TSX, /regionMeta\}\s+aria-hidden="true"/);
  // Tiêu đề khối vẫn có thật cho trình đọc màn hình.
  assert.match(MAP_TSX, /aria-labelledby="mapTitle"/);
  assert.match(MAP_TSX, /id="mapTitle">\{MAP_COPY\.label\}/);
});

test('vòng focus thấy được trên mọi dải và cả chế độ tối', () => {
  // Bỏ outline của liên kết CHỈ khi tấm nhãn nhận vòng thay.
  assert.match(CSS_CODE, /\.region:focus-visible\s*>\s*\.plate\s*\{[^}]*outline:\s*var\(--ds-bw-3\) solid var\(--ds-violet\)/);
  // Vòng kẹp giữa hai viền --ds-card ⇒ đứng cạnh màu thẻ ở cả hai phía.
  assert.match(CSS_CODE, /\.region:focus-visible\s*>\s*\.plate\s*\{[^}]*box-shadow:\s*0 0 0 \d+px var\(--ds-card\)/);
  assert.match(CSS_CODE, /@media \(forced-colors: active\)/);
});

/* ═══ 7 · hoạt ảnh: tắt khi xin giảm chuyển động ════════════════════════ */

test('prefers-reduced-motion ⇒ KHÔNG có bước nào (không phải bước ngắn hơn)', () => {
  assert.equal(regionStep(0, true), null);
  assert.equal(regionStep(7, true), null);
  assert.equal(decorStep(true), null);
  assert.ok(regionStep(0, false), 'nhánh thường không có bước nào: hàm luôn trả null');
  assert.ok(decorStep(false));
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
          `keyframe đổi "${key}" — chỉ transform/opacity chạy được trên lớp composite.`,
        );
      }
    }
    assert.ok(
      [200, 320, 450].includes(step.options.duration),
      `thời lượng ${step.options.duration}ms không nằm trong thang 200 / 320 / 450`,
    );
    assert.notEqual(
      step.options.fill, 'forwards',
      'fill: forwards — trạng thái nghỉ của CSS phải ĐÃ LÀ trạng thái cuối.',
    );
  }
  assert.ok(regionStep(3, false).options.delay > regionStep(1, false).options.delay);
  // Gọi đúng Web Animations API, không thư viện chuyển động.
  assert.match(MAP_TSX, /\.animate\(step\.keyframes, step\.options\)/);
});

test('trạng thái nghỉ trong CSS LÀ trạng thái cuối — không opacity: 0, không transform', () => {
  const SAI = '.region { opacity: 0; transform: translateY(10px); }';
  const AN = /opacity:\s*0(\D|$)|transform:\s*translate/;
  assert.ok(AN.test(SAI), 'mẫu không bắt nổi bản sai dựng tay');
  const hits = CSS_CODE.split('\n').map((l) => l.trim()).filter((l) => AN.test(l));
  assert.deepEqual(hits, [], 'trạng thái nghỉ phải là trạng thái CUỐI (hiện rõ, không dịch).');
  // Vị trí vùng bằng left/top, KHÔNG bằng `transform`: hoạt ảnh chạy trên
  // `transform`, nên đặt chỗ bằng nó thì keyframe ĐÈ mất và vùng nhảy chỗ.
  assert.doesNotMatch(CSS_CODE, /\btransform\s*:/);
});

/* ═══ 8 · bố cục: rộng là mặt cắt, hẹp là cuộn xuống ═══════════════════ */

test('mốc gãy bố cục đo bề rộng KHỐI (@container), không bề rộng màn', () => {
  assert.match(CSS_CODE, /container-type:\s*inline-size/);
  assert.match(CSS_CODE, /@container \(max-width:\s*\d+px\)/);
  const media = CSS_CODE.match(/@media[^{]*\(\s*(?:max|min)-width[^{]*\{/g) ?? [];
  assert.deepEqual(media, [], `mốc theo bề rộng MÀN HÌNH: ${media.join(' ')}`);
});

test('bản hẹp: mỗi dải một khối, cuộn xuống = đi xuống, không pan, không phóng', () => {
  const at = CSS_CODE.indexOf('@container');
  const compact = CSS_CODE.slice(at);
  assert.match(compact, /aspect-ratio:\s*auto/, 'khung hẹp vẫn giữ tỷ lệ 1360/820 thì tám nhãn đè nhau');
  assert.match(compact, /\.band\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column/, 'dải không thành khối xếp dọc');
  assert.match(compact, /position:\s*static/, 'tấm nhãn vẫn position:absolute thì chồng lên nhau');
  assert.match(compact, /\.decor\s*\{\s*display:\s*none/, 'nền mặt cắt phải ẩn ở bản hẹp');
  assert.match(compact, /min-height:\s*44px/, 'vùng chạm dưới 44 × 44');
  // Thứ tự DOM của dải = thứ tự từ trên xuống: điện thoại cuộn theo DOM.
  assert.deepEqual([...WM.BANDS ?? []], ['surface', 'shallow', 'deep', 'floor']);
  assert.match(MAP_TSX, /BANDS\.map\(/, 'dải không dựng theo BANDS');
  // Không pan, không phóng.
  assert.doesNotMatch(CSS_CODE, /overflow(?:-x)?:\s*(?:auto|scroll)|touch-action|scroll-snap/);
  assert.doesNotMatch(MAP_TSX, /onWheel|onPointerMove|onTouchMove|onGesture|scale\(/);
});

test('hộp tám vùng trong CSS khớp REGION_LAYOUT, không lệch một con số', () => {
  // Toạ độ nằm ở CSS (không `style={{…}}` — SSR tuần tự hoá thành `style="…"`,
  // đúng thứ đang chặn việc bỏ `style-src 'unsafe-inline'`). Hai nơi thì phải
  // có người so, không thì chúng lệch im.
  assert.equal(FRAME.width, 1360);
  assert.equal(FRAME.height, 820);
  assert.match(CSS_CODE, /aspect-ratio:\s*1360 \/ 820/);
  const pct = (v) => `${+v.toFixed(2)}%`;
  for (let i = 0; i < LAYOUT.length; i += 1) {
    const [x, y, w, h] = LAYOUT[i].box;
    const [px, py] = LAYOUT[i].plate;
    const n = i + 1;
    const box = CSS_CODE.match(new RegExp(String.raw`\.spot${n}\s*\{([^}]*)\}`));
    assert.ok(box, `CSS thiếu .spot${n}`);
    for (const [prop, v] of [['left', x / FRAME.width], ['top', y / FRAME.height], ['width', w / FRAME.width], ['height', h / FRAME.height]]) {
      assert.ok(
        box[1].includes(`${prop}: ${pct(v * 100)}`),
        `.spot${n} là {${box[1].trim()}} nhưng REGION_LAYOUT cho ${prop} ${pct(v * 100)}`,
      );
    }
    const tam = CSS_CODE.match(new RegExp(String.raw`\.spot${n}\s*>\s*\.plate\s*\{([^}]*)\}`));
    assert.ok(tam, `CSS thiếu .spot${n} > .plate`);
    assert.ok(
      tam[1].includes(`left: ${pct(((px - x) / w) * 100)}`) && tam[1].includes(`top: ${pct(((py - y) / h) * 100)}`),
      `.spot${n} > .plate là {${tam[1].trim()}}, lệch REGION_LAYOUT.plate`,
    );
  }
  // TSX lấy lớp theo chỉ số, viewBox của tiểu cảnh lấy từ `box`.
  assert.match(MAP_TSX, /styles\[`spot\$\{i \+ 1\}`\]/);
  assert.match(MAP_TSX, /viewBox=\{`\$\{x\} \$\{y\} \$\{w\} \$\{h\}`\}/);
  const inline = MAP_TSX.match(/style=\{\{/g) ?? [];
  assert.deepEqual(inline, [], 'style nội tuyến trong bản đồ — thêm nợ cho style-src');
});

test('mọi cỡ chữ đi qua thang --ds-fs-*, không chỗ nào < 15px', () => {
  const SCALE = new Map(
    [...read('public', 'static', 'css', 'studio-tokens.css')
      .matchAll(/(--ds-fs-[\w-]+)\s*:\s*(\d+(?:\.\d+)?)px\s*;/g)]
      .map((m) => [m[1], Number(m[2])]),
  );
  const px = CSS_CODE.match(/font-size:\s*\d+(?:\.\d+)?(?:px|rem|em)/g) ?? [];
  assert.deepEqual(px, [], `cỡ chữ không qua thang: ${px.join(' ')}`);
  const tokens = [...CSS_CODE.matchAll(/font-size:\s*var\((--ds-fs-[\w-]+)\)/g)].map((m) => m[1]);
  assert.ok(tokens.length >= 2, 'không thấy khai báo cỡ chữ nào — đọc lại mẫu');
  for (const t of tokens) {
    assert.ok(SCALE.has(t), `${t} không phải một bậc có thật của thang`);
    assert.ok(SCALE.get(t) >= 15, `${t} = ${SCALE.get(t)}px, dưới sàn 15px`);
  }
});

/* ═══ 10 · tranh sinh ra: mật độ, bảng màu, không gradient ══════════════
 *
 * Chủ sản phẩm bác hai bản đồ trước bằng đúng bốn chữ "xấu và trẻ con", và
 * chẩn đoán sau đó chỉ ra một nguyên nhân kỹ thuật chứ không phải gu: tranh
 * được TÔ MẢNG PHẲNG bằng gradient, trong khi hai bản tham chiếu là TRANH NÉT.
 * Bốn ca dưới đây canh đúng chỗ đó — mật độ nét, cấm gradient, bảng màu một
 * nguồn, và trần dung lượng — vì cả bốn đều là thứ lặng lẽ tụt lại khi người
 * sau sửa script mà không mở ảnh ra xem.
 */

test('tranh là TRANH NÉT: hàng chục nghìn nét, và không một gradient nào', () => {
  // Tự kiểm mẫu đếm nét trên một chuỗi dựng tay trước khi tin nó.
  assert.equal(demNet('M1 2l3 4M5 6l7 8'), 2, 'mẫu đếm nét sai');

  const net = demNet(ART);
  assert.ok(
    net > 30000,
    `bản rộng chỉ còn ${net} nét. Mảng phẳng + vài chục đường viền chính là bản `
    + 'đã bị bác; mật độ là thứ duy nhất làm nó ra tranh vẽ tay.',
  );
  for (const l of LAYOUT) {
    const n = demNet(CROPS[l.key]);
    assert.ok(n > 2500, `ô crop ${l.key} chỉ có ${n} nét — bản hẹp loãng hơn hẳn bản rộng`);
  }
  // Gradient bị cấm HẲN: sắc độ phải làm bằng mật độ nét. Một `<linearGradient>`
  // lọt vào là cả bộ kỹ thuật ở trên bắt đầu bị thay bằng tô mảng.
  for (const [name, svg] of [['world-map.svg', ART], ...Object.entries(CROPS)]) {
    assert.doesNotMatch(svg, /<(?:linear|radial)Gradient|url\(#grad/i, `${name} dùng gradient`);
    assert.doesNotMatch(svg, /<filter[\s>]|feGaussianBlur/, `${name} dùng filter làm mờ`);
    assert.doesNotMatch(svg, /<image[\s>]|xlink:href|href="data:/, `${name} nhúng ảnh bitmap`);
  }
});

test('mọi mã màu trong tranh đều có tên trong MAP_PALETTE', () => {
  // Script KHÔNG được viết mã màu của riêng nó: nếu được thì bảng màu trong TS
  // (nơi ca đo tương phản chạy) và bảng màu thật của bức vẽ là hai thứ khác
  // nhau, và phép đo 3:1 ở mục 5 thành vô nghĩa.
  const bang = new Set();
  const gom = (o) => {
    for (const v of Object.values(o)) {
      if (typeof v === 'string') bang.add(v.toUpperCase());
      else if (v && typeof v === 'object') gom(v);
    }
  };
  gom(PALETTE);
  assert.ok(bang.size > 20, 'không đọc được MAP_PALETTE — các phép so dưới đây vô nghĩa');
  assert.ok(!bang.has('#123456'), 'tự kiểm: bảng không được chứa mã bịa');

  for (const [name, svg] of [['world-map.svg', ART], ...Object.entries(CROPS)]) {
    const la = [...new Set([...svg.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toUpperCase()))];
    const ngoai = la.filter((hex) => !bang.has(hex));
    assert.deepEqual(ngoai, [], `${name} dùng mã màu không có trong MAP_PALETTE: ${ngoai.join(' ')}`);
  }
});

test('tranh do script sinh, không sửa tay, và nằm dưới trần 900 KB', () => {
  // Dấu đầu tệp là bằng chứng duy nhất phân biệt "sinh ra" với "ai đó mở
  // Illustrator rồi lưu đè" — mà lưu đè thì lần chạy script sau xoá sạch.
  for (const [name, svg] of [['world-map.svg', ART], ...Object.entries(CROPS)]) {
    assert.match(svg, /SINH BỞI scripts\/map\/build_map\.py/, `${name} thiếu dấu "sinh bởi script"`);
    assert.match(svg, /aria-hidden="true"/, `${name} không tự khai là hình trang trí`);
  }
  const kb = (p) => artBytes(...ART_DIR, p) / 1024;
  const qua = ['world-map.svg', ...LAYOUT.map((l) => `scene-${l.key}.svg`)]
    .map((f) => [f, kb(f)])
    .filter(([, v]) => v > 900);
  assert.deepEqual(qua.map(([f, v]) => `${f} ${v.toFixed(0)} KB`), [],
    'vượt trần 900 KB của AGENTS.md — hạ DENSITY trong build_map.py');
  // Và script phải còn đó: tranh không sửa lại được nếu mất nguồn sinh.
  assert.ok(
    readFileSync(join(FE, '..', 'scripts', 'map', 'build_map.py'), 'utf8').includes('def build_full'),
    'mất scripts/map/build_map.py — tranh thành tệp chết, không ai sửa lại được',
  );
});

test('tranh KHÔNG vẽ đường nào nối hai vùng trên mặt đất, và ô crop đúng ô của nó', () => {
  // Ở mục 3 ca kiểm chuyện này trên DỮ LIỆU. Đây là trên chính BỨC VẼ: một
  // người sửa script có thể thêm một nét nối M1→M8 mà dữ liệu không hay biết.
  const trongTranh = [...ART.matchAll(/data-flow="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(trongTranh.length, FLOWS.length, 'số mạch trong tranh khác MAP_FLOWS');
  const tren = new Set(LAYOUT.filter((l) => l.band === 'surface' || l.band === 'shallow').map((l) => l.key));
  for (const g of trongTranh) {
    const [a, b] = g.split('-');
    assert.ok(!tren.has(a) && !tren.has(b), `tranh vẽ mạch chạm vùng trên mặt đất: ${g}`);
  }
  assert.ok(longestChain(trongTranh.map((g) => {
    const [from, to] = g.split('-');
    return { from, to };
  })) < LAYOUT.length, 'các mạch trong tranh ghép thành một chuỗi qua cả tám vùng');

  // Mỗi ô crop phải mang ĐÚNG viewBox của `REGION_LAYOUT.box` — lệch một con
  // số là ô tiểu cảnh trên điện thoại cắt nhầm chỗ, mà không ai thấy đỏ.
  for (const l of LAYOUT) {
    const [x, y, w, h] = l.box;
    assert.match(
      CROPS[l.key], new RegExp(String.raw`viewBox="${x} ${y} ${w} ${h}"`),
      `scene-${l.key}.svg không cắt đúng ô của REGION_LAYOUT (${l.box.join(' ')})`,
    );
  }
});

test('CSS nối tranh vào bằng ảnh nền, và chỉ tải phần bố cục đó cần', () => {
  // Bản rộng tải bản rộng, bản hẹp tải tám ô crop — KHÔNG máy nào tải cả hai.
  // Mẹo duy nhất giữ được điều đó là: quy tắc ảnh nền của ô crop phải nằm
  // TRONG @container. Đặt nhầm ra ngoài thì máy tính tải thêm 1,3 MB im lặng.
  const at = CSS_CODE.indexOf('@container');
  assert.ok(at > 0, 'CSS không còn mốc @container');
  const rong = CSS_CODE.slice(0, at);
  const hep = CSS_CODE.slice(at);
  assert.match(rong, /\.decor\s*\{[^}]*background-image:\s*url\('\/map\/world-map\.svg'\)/,
    '.decor không lấy tranh mặt cắt');
  assert.doesNotMatch(rong, /scene-M\d\.svg/, 'ô crop của bản hẹp bị khai ngoài @container');
  for (const l of LAYOUT) {
    assert.ok(hep.includes(`url('/map/scene-${l.key}.svg')`), `bản hẹp thiếu ô crop ${l.key}`);
  }
  assert.match(hep, /\.decor\s*\{\s*display:\s*none/, 'bản hẹp vẫn tải tranh mặt cắt');
  // Chữ trên tấm nhãn là CHỮ BẢN ĐỒ, không phải phông sans của giao diện.
  assert.match(CSS_CODE, /\.regionName\s*\{[^}]*font-family:[^;]*serif/,
    'tên vùng vẫn dùng phông giao diện — một trong sáu điểm bị bác ở bản trước');
  // Và không nạp thêm tệp phông nào cho một khối duy nhất của trang chủ.
  assert.doesNotMatch(CSS_CODE, /@font-face|fonts\.googleapis/);
});

/* ═══ 9 · trang chủ có nối bản đồ vào, và vẫn không gọi API ═════════════ */

test('trang chủ dựng bản đồ từ giáo trình, không từ con số rời', () => {
  assert.match(PAGE, /<WorldMap/, 'trang chủ không dựng bản đồ');
  assert.match(PAGE, /buildRegions\(modules, headCourse\.lessonUrl\)/);
  for (const pattern of [/\bapiFetch\b/, /ensureGuest/, /\bfetch\s*\(/]) {
    assert.ok(!pattern.test(PAGE), `trang chủ chạm vào đường mạng: ${pattern}`);
  }
});
