/**
 * ĐO TƯƠNG PHẢN THẬT của trang bài học — hàm thuần, không phụ thuộc DOM.
 *
 * Vì sao là module riêng chứ không nằm trong file test: bộ test `node --test`
 * cần nó, mà người sửa giao diện cũng cần chạy tay để xem mình vừa làm trượt
 * cặp nào (`node e2e/unit/ds-contrast.mjs`). Đặt ở `e2e/unit/` thay vì
 * `src/lib/` vì đây là công cụ kiểm, không có mã nào của sản phẩm gọi tới.
 *
 * Cách làm:
 *   1. Đọc BẢNG TOKEN từ `public/static/css/studio-tokens.css` — nguồn sự
 *      thật duy nhất của màu ở trang bài học. Cả bản ngày và bản Ban đêm
 *      (`body.dark`), vì cả hai đều hiện ra với người dùng.
 *   2. Giải var() lồng nhau (--st-* nay chỉ là bí danh của --ds-*).
 *   3. Chấm danh sách CẶP CHỮ/NỀN LẤY TỪ CHÍNH CSS/TSX đang chạy (xem
 *      `PAIRS` ở dưới — mỗi dòng ghi rõ file và lớp nó đến từ đâu).
 *
 * Ngưỡng WCAG 2.2 AA: chữ thường ≥ 4,5:1; chữ lớn (≥ 24px, hoặc ≥ 18,66px khi
 * in đậm) ≥ 3:1; thành phần giao diện và đồ hoạ cần nhận ra ≥ 3:1 (1.4.11).
 *
 * Hai loại được MIỄN, và đã miễn thì phải viết lý do ngay trên dòng đó —
 * `ds-tokens.test.mjs` trượt nếu có dòng miễn mà không kèm lý do. Đó là chỗ
 * duy nhất một cặp dưới ngưỡng được đi qua, nên nó phải đắt:
 *   'decor'    — đường kẻ/hình THUẦN trang trí, gỡ đi không mất thông tin nào
 *                (WCAG 1.4.11 loại trừ rõ: "purely decorative").
 *   'inactive' — thành phần đang TẮT (1.4.11 loại trừ "inactive user interface
 *                components"). Chữ bên trong vẫn phải đạt đủ, và danh sách
 *                dưới đây đo nó thành một dòng riêng.
 */
import { readFileSync } from 'node:fs';

const TOKENS_CSS = new URL('../../public/static/css/studio-tokens.css', import.meta.url);

/* ── số học WCAG ──────────────────────────────────────────────────────── */

export function parseHex(hex) {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`mã màu không đọc được: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

/** Độ chói tương đối theo WCAG 2.x. */
export function luminance(hex) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Trộn `fg` ở độ đục `alpha` lên `bg` — để đo được cả màu trong suốt. */
export function blend(fg, alpha, bg) {
  const f = parseHex(fg);
  const b = parseHex(bg);
  const mix = f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)));
  return `#${mix.map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

/* ── đọc bảng token ───────────────────────────────────────────────────── */

/**
 * Cắt một khối `selector { … }` ở mức ngoặc ngoài cùng. Không dùng regex
 * `\{([^}]*)\}` được: file token có `rgba(…)` nhưng cũng có chú thích nhiều
 * dòng; đếm ngoặc là cách chắc chắn.
 */
function block(css, selector) {
  const at = css.indexOf(selector);
  if (at < 0) throw new Error(`không thấy selector ${selector} trong studio-tokens.css`);
  const open = css.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`khối ${selector} không đóng ngoặc`);
}

function declarations(text) {
  const out = new Map();
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out.set(m[1], m[2].trim());
  }
  return out;
}

/** Giải var(--x) lồng nhau cho tới khi còn một giá trị cụ thể. */
function resolve(map, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`token vòng tròn: ${name}`);
  seen.add(name);
  const raw = map.get(name);
  if (raw === undefined) throw new Error(`token chưa khai: ${name}`);
  const alias = raw.match(/^var\((--[\w-]+)\)$/);
  return alias ? resolve(map, alias[1], seen) : raw;
}

/**
 * Trả về { light, dark }: mỗi cái là một object tên-token → giá trị cụ thể.
 * Bản Ban đêm thừa hưởng mọi token của bản ngày rồi ghi đè phần khai lại.
 */
export function readTokens(cssText) {
  const css = cssText ?? readFileSync(TOKENS_CSS, 'utf8');
  const root = declarations(block(css, ':root'));
  const darkRaw = declarations(block(css, 'body.dark'));
  const darkMap = new Map([...root, ...darkRaw]);
  const flatten = (map) => {
    const out = {};
    for (const key of map.keys()) {
      const value = resolve(map, key);
      if (/^#[0-9a-fA-F]{3,6}$/.test(value)) out[key] = value;
    }
    return out;
  };
  return { light: flatten(root), dark: flatten(darkMap) };
}

/* ── danh sách cặp chữ/nền THẬT ───────────────────────────────────────────
   Mỗi dòng: [mô tả kèm nơi dùng, token chữ, token nền, loại].
   Loại: 'text' (≥4,5), 'large' (≥3, chữ ≥24px hoặc ≥18,66px in đậm),
         'ui' (≥3, viền/ranh giới/đồ hoạ mang thông tin),
         'decor'/'inactive' (được miễn — phần tử thứ 5 PHẢI là lý do).
   `fg`/`bg` có thể là ['token', alpha, 'nền'] để đo màu trong suốt. */
export const PAIRS = [
  // ── khung bài (LessonChrome.module.css)
  ['chrome: chữ chính / nền trang', '--ds-ink', '--ds-page', 'text'],
  ['topBar: tên khoá · tên bài (.lessonContext)', '--ds-soft', '--ds-paper', 'text'],
  ['topBar: nhãn bước (.stepLabel)', '--ds-soft', '--ds-paper', 'text'],
  ['bottomBar: trạng thái lưu (.saveLabel)', '--ds-soft', '--ds-paper', 'text'],
  ['topBar: ô điểm (.scorePill)', '--ds-violet-deep', '--ds-violet-tint', 'text'],
  ['nút chính (.primaryBtn)', '--ds-on-action', '--ds-action', 'text'],
  ['nút chính · chấm đúng (.primaryBtnOk)', '--ds-on-action', '--ds-ochre', 'text'],
  ['nút chính · chấm sai (.primaryBtnErr)', '--ds-on-action', '--ds-sanguine', 'text'],
  ['nút chính đang tắt (.primaryBtn:disabled)', '--ds-soft', '--ds-desk', 'text'],
  ['nút chính đang tắt · viền', '--ds-sketch', '--ds-desk', 'ui'],
  ['nút phụ (.secondaryBtn)', '--ds-ink', '--ds-paper', 'text'],
  ['nút phụ · viền 2px', '--ds-ink', '--ds-paper', 'ui'],
  ['nút phụ · rê chuột', '--ds-violet-deep', '--ds-violet-tint', 'text'],
  ['thanh tiến độ: đoạn đã xong / rãnh', '--ds-ink', '--ds-desk', 'ui'],
  ['thanh tiến độ: đoạn đang ở / rãnh', '--ds-violet', '--ds-desk', 'ui'],
  ['thanh tiến độ: đoạn vượt trước / rãnh', '--ds-soft', '--ds-desk', 'ui'],
  ['vòng focus / nền trang', '--ds-violet', '--ds-page', 'ui'],

  // ── màn mở đầu bài (LessonBrief.module.css)
  ['brief: eyebrow mã bài', '--ds-violet-deep', '--ds-page', 'text'],
  ['brief: tiêu đề bài (.title 36px)', '--ds-ink', '--ds-page', 'large'],
  ['brief: câu mục tiêu (.goal)', '--ds-soft', '--ds-page', 'text'],
  ['brief: nhiệm vụ (.taskText trên thẻ)', '--ds-ink', '--ds-card', 'text'],
  ['brief: thanh nhấn thẻ nhiệm vụ', '--ds-violet', '--ds-card', 'ui'],
  ['brief: nhãn DỰ ĐOÁN', '--ds-violet-deep', '--ds-sanguine-tint', 'text'],
  ['brief: câu dự đoán (.predictText)', '--ds-soft', '--ds-sanguine-tint', 'text'],
  ['brief: nhãn thẻ GIẢI THÍCH', '--ds-violet-deep', '--ds-violet-tint', 'text'],
  ['brief: chữ thẻ GIẢI THÍCH', '--ds-violet-deep', '--ds-violet-tint', 'text'],
  ['brief: tên file trên khung code (.codeBar)', '--ds-code-meta', '--ds-code-line', 'text'],
  ['brief: thân code (.codeBody)', '--ds-code-fg', '--ds-code-bg', 'text'],
  ['brief: danh sách ca kiểm (.testList)', '--ds-ink', '--ds-card', 'text'],
  ['brief: nhãn ca kiểm (.testsLabel)', '--ds-soft', '--ds-card', 'text'],

  // ── vỏ màn (ShellA/ShellB.module.css)
  ['shell: tiêu đề màn', '--ds-ink', '--ds-card', 'text'],
  ['shell: câu dẫn (.description)', '--ds-soft', '--ds-card', 'text'],
  ['shell: eyebrow', '--ds-violet-deep', '--ds-violet-tint', 'text'],
  ['shell: meta (.meta)', '--ds-soft', '--ds-card', 'text'],
  ['shell: nút gợi ý (.hintToggle)', '--ds-violet-deep', '--ds-card', 'text'],
  ['shell: nút gợi ý · viền', '--ds-sketch', '--ds-card', 'ui'],
  ['shell: nhãn gợi ý (.hintLabel trên .hintBox)', '--ds-ink', '--ds-tint', 'text'],
  ['shell: chữ gợi ý (.hintText)', '--ds-soft', '--ds-tint', 'text'],
  ['shell: code trong gợi ý', '--ds-violet-deep', '--ds-tint', 'text'],
  ['shell: chấm tiến độ đang ở (.dotActive)', '--ds-action', '--ds-card', 'ui'],
  ['shell: chấm tiến độ chưa tới (.dot)', '--ds-sketch', '--ds-card', 'ui'],

  // ── bài tập (exercises.module.css)
  ['bài tập: phương án (.optionCard)', '--ds-ink', '--ds-card', 'text'],
  ['bài tập: phương án · viền 2px', '--ds-sketch', '--ds-card', 'ui'],
  ['bài tập: phương án · viền khi lùi về sau (.optionDim)', '--ds-line', '--ds-card', 'inactive',
    'Phương án sau khi chấm mang thuộc tính `disabled`; bản thiết kế chốt đúng '
    + 'viền `line` cho trạng thái này. Chữ bên trong KHÔNG hạ cấp — xem dòng '
    + '"chữ phương án khi lùi về sau" ngay dưới, 15,94:1.'],
  ['bài tập: chữ phương án khi lùi về sau (.optionDim)', '--ds-ink', '--ds-card', 'text'],
  ['bài tập: phương án đang chọn', '--ds-ink', '--ds-violet-tint', 'text'],
  ['bài tập: phương án đúng', '--ds-ink', '--ds-ochre-tint', 'text'],
  ['bài tập: phương án chưa đúng', '--ds-ink', '--ds-sanguine-tint', 'text'],
  ['bài tập: dấu ✓ trên ô đúng (.markCorrect)', '--ds-on-action', '--ds-ochre', 'text'],
  ['bài tập: dấu ✕ trên ô sai (.markWrong)', '--ds-on-action', '--ds-sanguine', 'text'],
  ['bài tập: câu phụ phương án (.optionSub)', '--ds-soft', '--ds-card', 'text'],
  ['bài tập: ô tròn chọn (.optionRadio viền)', '--ds-sketch', '--ds-card', 'ui'],
  ['bài tập: Đúng/Sai (.toggleBtn)', '--ds-ink', '--ds-card', 'text'],
  ['bài tập: Đúng/Sai · viền', '--ds-sketch', '--ds-card', 'ui'],
  ['bài tập: Đúng/Sai lùi về sau · viền (.toggleDim)', '--ds-line', '--ds-card', 'inactive',
    'Cùng lý do với .optionDim: nút đã `disabled` sau khi chấm, chữ vẫn nguyên màu.'],
  ['bài tập: biểu tượng Đúng/Sai (.toggleIcon)', '--ds-on-action', '--ds-soft', 'text'],
  ['bài tập: chip gợi ý từ (.chip)', '--ds-ink', '--ds-card', 'text'],
  ['bài tập: chip · viền', '--ds-sketch', '--ds-card', 'ui'],
  ['bài tập: chip đang tắt (.chipOff)', '--ds-soft', '--ds-desk', 'text'],
  ['bài tập: câu dẫn ô trống (.suggestions)', '--ds-soft', '--ds-card', 'text'],
  ['bài tập: nút Chạy (.runBtn)', '--ds-on-action', '--ds-action', 'text'],
  ['bài tập: nút Chạy đang chạy (.runBtn:disabled)', '--ds-soft', '--ds-desk', 'text'],
  ['bài tập: ghi chú nút Chạy (.runHint)', '--ds-soft', '--ds-card', 'text'],

  // ── khung code (dùng ở mọi màn)
  ['code: thân (.codeText)', '--ds-code-fg', '--ds-code-bg', 'text'],
  ['code: số dòng (.lineNum)', '--ds-code-num', '--ds-code-bg', 'text'],
  ['code: dòng cho sẵn ở bài lắp ghép (Parsons)', '--ds-code-num', '--ds-code-bg', 'text'],
  ['code: tên file (.codeHeader)', '--ds-code-fg', '--ds-code-bg', 'text'],
  ['code: nhãn ngôn ngữ (.langTag)', '--ds-code-num', '--ds-code-bg', 'text'],
  ['code: từ khoá', '--ds-code-kw', '--ds-code-bg', 'text'],
  ['code: chuỗi', '--ds-code-str', '--ds-code-bg', 'text'],
  ['code: số', '--ds-mark-sanguine', '--ds-code-bg', 'text'],
  ['code: chú thích', '--ds-code-num', '--ds-code-bg', 'text'],
  ['code: đường kẻ trong khung', '--ds-code-line', '--ds-code-bg', 'decor',
    'Đường kẻ dưới thanh tên file. Gỡ nó đi thì tên file và thân code vẫn '
    + 'phân biệt được bằng khoảng cách và màu chữ — không mang thông tin nào.'],
  ['code: ô trống đã lắp (.blank)', '--ds-code-fg', '--ds-code-line', 'text'],
  ['code: ô trống · viền nét đứt (.blank, Assemble)', '--ds-mark-violet', '--ds-code-bg', 'ui'],
  ['console: dòng thường (.consoleRow)', '--ds-code-fg', '--ds-code-bg', 'text'],
  ['console: dòng đạt (.consoleRowOk)', '--ds-mark-ochre', '--ds-code-bg', 'text'],
  ['console: dòng lỗi (.consoleRowErr)', '--ds-mark-sanguine', '--ds-code-bg', 'text'],
  ['console: dòng lặng (.consoleRowMuted)', '--ds-code-num', '--ds-code-bg', 'text'],
  ['console: đầu bảng (.consoleHead)', '--ds-code-num', '--ds-code-bg', 'text'],
  ['console: con trỏ nháy (.caret)', '--ds-code-str', '--ds-code-bg', 'ui'],
  ['code: vòng focus ô soạn mã', '--ds-mark-violet', '--ds-code-bg', 'ui'],

  // ── màn bài học dựng từ content_json (studio-chrome.module.css)
  ['studio: dải ghi chú (.note)', '--ds-soft', '--ds-tint', 'text'],
  ['studio: ghi chú đã xong (.noteOk)', '--ds-ochre', '--ds-ochre-tint', 'text'],
  ['studio: ghi chú cẩn thận (.noteWarn)', '--ds-sanguine', '--ds-sanguine-tint', 'text'],
  ['studio: thông báo (.toast)', '--ds-soft', '--ds-card', 'text'],
  ['studio: nút đóng thông báo', '--ds-soft', '--ds-card', 'text'],
  ['studio: link làm lại (.resetLink)', '--ds-soft', '--ds-card', 'text'],
  ['studio: nhật ký biến đổi (.trace li)', '--ds-ink', '--ds-card', 'text'],
  ['studio: mã bước trong nhật ký (.trace b)', '--ds-violet-deep', '--ds-tint', 'text'],
  ['studio: nhãn ví dụ I/O (.io dt)', '--ds-soft', '--ds-card', 'text'],
  ['studio: chip mức độ (.tag)', '--ds-violet-deep', '--ds-violet-tint', 'text'],
  ['studio: chip cửa kiểm (.tagGate)', '--ds-sanguine', '--ds-sanguine-tint', 'text'],
  ['studio: bảng dữ kiện (.facts dd)', '--ds-ink', '--ds-tint', 'text'],
  ['studio: nhãn bảng dữ kiện (.facts dt)', '--ds-soft', '--ds-tint', 'text'],
  ['studio: code nội dòng (.facts code)', '--ds-ink', '--ds-tint', 'text'],
  ['studio: tiêu đề khối gập (.panel summary)', '--ds-ink', '--ds-tint', 'text'],
  ['studio: chữ phụ khối gập (.panel summary span)', '--ds-soft', '--ds-tint', 'text'],
  ['studio: ghi chú khối gập (.panelNote)', '--ds-soft', '--ds-tint', 'text'],
  ['studio: chữ hợp đồng hàm (.contracts p)', '--ds-soft', '--ds-card', 'text'],
  ['studio: chữ ký hàm (.contracts .sig)', '--ds-violet-deep', '--ds-card', 'text'],
  ['studio: khối code gợi ý (.hintCode)', '--ds-code-fg', '--ds-code-bg', 'text'],
  ['studio: viền thẻ (trang trí, .panel/.tfList li)', '--ds-line', '--ds-tint', 'decor',
    'Viền của thẻ KHÔNG bấm được. Ranh giới thẻ do NỀN và phần đệm 12–14px nói; '
    + 'bảng thiết kế ghi rõ về token `line`: "không dùng làm ranh giới thành '
    + 'phần cần nhận ra". Mọi chỗ cần nhận ra đã đổi sang `sketch`.'],
  ['studio: nhãn admin (.adminTag)', '--ds-on-action', '--ds-violet', 'text'],
  ['studio: bảng đáp án · viền nét đứt', '--ds-violet', '--ds-card', 'ui'],
  ['studio: câu đúng/sai (.tfList p)', '--ds-ink', '--ds-tint', 'text'],
  ['studio: nút công cụ game đang tắt', '--ds-soft', '--ds-desk', 'text'],
  ['studio: điểm bật lên (.pop)', '--ds-on-action', '--ds-violet', 'text'],
  ['studio: dải "code chạy đúng" (.burst strong)', '--ds-ochre', '--ds-ochre-tint', 'text'],
  ['studio: eyebrow hộp thành tích', '--ds-violet-deep', '--ds-card', 'text'],
  ['studio: chữ thành tích (.award p)', '--ds-soft', '--ds-tint', 'text'],
  ['studio: nút hộp thành tích', '--ds-on-action', '--ds-action', 'text'],
  ['studio: ca kiểm đạt (.runPass)', '--ds-ochre', '--ds-ochre-tint', 'text'],
  ['studio: ca kiểm trượt (.runFail)', '--ds-sanguine', '--ds-sanguine-tint', 'text'],
  ['studio: dải Boss/bài tổng hợp (.boss)', '--ds-violet-deep', '--ds-violet-tint', 'text'],

  // ── màn lý thuyết — chữ người học đọc lâu nhất
  ['lý thuyết: tiêu đề khối (.theoryBlock h4)', '--ds-ink', '--ds-card', 'text'],
  ['lý thuyết: đoạn văn (.theoryBlock p)', '--ds-soft', '--ds-card', 'text'],
  ['lý thuyết: gạch đầu dòng (.theoryBlock li)', '--ds-soft', '--ds-card', 'text'],
  ['lý thuyết: chú thích hình (figcaption)', '--ds-soft', '--ds-card', 'text'],
  ['lý thuyết: link xem khổ lớn', '--ds-violet-deep', '--ds-card', 'text'],
  ['lý thuyết: nút tạm dừng hình', '--ds-violet-deep', '--ds-card', 'text'],
  ['lý thuyết: nút tạm dừng hình · viền', '--ds-sketch', '--ds-card', 'ui'],
  ['lý thuyết: chỗ đứng hình đã tắt', '--ds-soft', '--ds-tint', 'text'],
  ['lý thuyết: chỗ đứng hình đã tắt · nét đứt', '--ds-sketch', '--ds-tint', 'ui'],
  ['lý thuyết: nguồn hình (.theorySource)', '--ds-soft', '--ds-page', 'text'],

  // ── nút "Chạy thử ở Bàn thí nghiệm" (TryItButton.module.css)
  ['bàn thí nghiệm: nút', '--ds-violet-deep', '--ds-violet-tint', 'text'],
  ['bàn thí nghiệm: nút · viền', '--ds-violet', '--ds-violet-tint', 'ui'],

  // ── thanh đầu trang (SiteHeader.module.css) — có ở trang chủ, trang khoá,
  //    /ide và /practice, nên một cặp trượt ở đây là trượt ở bốn trang
  ['header: tên sản phẩm (.brandName)', '--ds-ink', '--ds-paper', 'text'],
  ['header: phần nhấn của tên (.brandAccent)', '--ds-violet', '--ds-paper', 'text'],
  ['header: nút đổi sáng/tối (.theme icon)', '--ds-ink', '--ds-card', 'text'],
  ['header: nút đổi sáng/tối · viền 2px', '--ds-ink', '--ds-card', 'ui'],
  ['header: nút đổi sáng/tối · rê chuột', '--ds-violet-deep', '--ds-violet-tint', 'text'],
  ['header: vòng focus nút / nền thanh', '--ds-violet', '--ds-paper', 'ui'],
  ['header: vạch chân thanh (.bar::after)', '--ds-line', '--ds-paper', 'decor',
    'Đường kẻ dưới thanh đầu trang. Thanh đã tách khỏi nội dung bằng 18–20px '
    + 'đệm và bằng nền `paper` riêng, nên gỡ đường kẻ đi không mất thông tin '
    + 'nào — đúng vai mà bảng thiết kế dành cho token `line`.'],

  // ── TRANG CHỦ (home.module.css) ─────────────────────────────────────────
  ['trang chủ: nhãn hero (.eyebrow)', '--ds-soft', '--ds-page', 'text'],
  ['trang chủ: tiêu đề 44px (.title)', '--ds-ink', '--ds-page', 'large'],
  ['trang chủ: câu dẫn (.lead)', '--ds-soft', '--ds-page', 'text'],
  ['trang chủ: ghi chú cột (.colNote)', '--ds-soft', '--ds-page', 'text'],
  ['trang chủ: nhãn khối (.pill)', '--ds-violet-deep', '--ds-violet-tint', 'text'],
  ['trang chủ: nhãn khối · viền', '--ds-violet', '--ds-violet-tint', 'ui'],
  ['trang chủ: thẻ khoá (.card)', '--ds-ink', '--ds-card', 'text'],
  ['trang chủ: thẻ khoá · viền (thẻ BẤM ĐƯỢC nên dùng sketch)', '--ds-sketch', '--ds-card', 'ui'],
  ['trang chủ: vòng focus thẻ / nền trang', '--ds-violet', '--ds-page', 'ui'],
  ['trang chủ: viền tím hiện khi rê thẻ (.card::before)', '--ds-violet', '--ds-card', 'ui'],
  ['trang chủ: tên khoá (.label 22px/700)', '--ds-ink', '--ds-card', 'large'],
  ['trang chủ: tên khoá khi rê chuột', '--ds-violet-deep', '--ds-card', 'text'],
  ['trang chủ: câu mô tả khoá (.desc)', '--ds-soft', '--ds-card', 'text'],
  ['trang chủ: nhãn nhỏ trên thẻ (.tag)', '--ds-soft', '--ds-tint', 'text'],
  ['trang chủ: nhãn nhỏ · viền', '--ds-sketch', '--ds-tint', 'ui'],
  ['trang chủ: ô logo trên thẻ · viền (.icon)', '--ds-sketch', '--ds-tint', 'ui'],
  ['trang chủ: mũi tên góc thẻ (.go)', '--ds-soft', '--ds-tint', 'text'],
  ['trang chủ: mũi tên góc thẻ · viền', '--ds-sketch', '--ds-tint', 'ui'],
  ['trang chủ: mũi tên khi rê thẻ (nền action)', '--ds-on-action', '--ds-action', 'text'],
  // Thẻ gợi ý: nền `ink`, chữ `page` — cặp tự đảo theo bản nền.
  ['trang chủ: thẻ gợi ý · chữ (.next)', '--ds-page', '--ds-ink', 'text'],
  ['trang chủ: thẻ gợi ý · nút chính (.nextCta)', '--ds-on-action', '--ds-action', 'text'],
  ['trang chủ: thẻ gợi ý · nút chính khi rê', '--ds-on-action', '--ds-violet', 'text'],
  ['trang chủ: thẻ gợi ý · vòng focus nút / nền thẻ', '--ds-page', '--ds-ink', 'ui'],
  ['trang chủ: thẻ gợi ý · vạch ngăn lối ra (.nextFoot)', '--ds-desk', '--ds-ink', 'ui'],
  ['trang chủ: thẻ gợi ý · lối ra yên tĩnh (.nextExit)', '--ds-page', '--ds-ink', 'text'],
  ['trang chủ: ghi chú trung thực · tiêu đề (.noteTitle)', '--ds-ink', '--ds-paper', 'text'],
  ['trang chủ: ghi chú trung thực · chữ (.noteText)', '--ds-soft', '--ds-paper', 'text'],
  ['trang chủ: ghi chú trung thực · icon', '--ds-soft', '--ds-paper', 'text'],
  ['trang chủ: ghi chú trung thực · nét đứt 2px', '--ds-sketch', '--ds-paper', 'ui'],
  ['trang chủ: thẻ góp ý · tiêu đề', '--ds-ink', '--ds-card', 'text'],
  ['trang chủ: thẻ góp ý · chữ', '--ds-soft', '--ds-card', 'text'],
  ['trang chủ: thẻ góp ý · ô icon', '--ds-violet-deep', '--ds-violet-tint', 'text'],
  ['trang chủ: thẻ góp ý · viền thẻ (KHÔNG bấm được)', '--ds-line', '--ds-card', 'decor',
    'Thẻ góp ý không phải thành phần bấm được — nút nằm BÊN TRONG nó. Ranh giới '
    + 'thẻ do nền `card` và phần đệm 32px nói, nên viền thuần trang trí; bảng '
    + 'thiết kế dành đúng vai này cho token `line`.'],
  ['trang chủ: nút góp ý (nút phụ, viền ink 2px)', '--ds-ink', '--ds-card', 'text'],
  ['trang chủ: nút góp ý · viền 2px', '--ds-ink', '--ds-card', 'ui'],
  ['trang chủ: nút góp ý · nền khi rê chuột', '--ds-ink', '--ds-tint', 'text'],
  ['trang chủ: chữ chân trang (.footer)', '--ds-soft', '--ds-page', 'text'],
  ['trang chủ: vạch chân trang', '--ds-line', '--ds-page', 'decor',
    'Chân trang đã tách khỏi nội dung bằng 22px đệm và nằm sau cả khối cuối; '
    + 'đường kẻ chỉ để mắt nghỉ. Gỡ đi không mất thông tin nào.'],

  // ── trang khoá /courses/[courseId] (CourseShell.module.css) ───────────
  // Bề mặt cuối cùng rời bảng xanh dương. Trước đợt này mọi cặp dưới đây đọc
  // token --edu-* và chưa từng được đo bằng bộ này.
  ['trang khoá: lối về (.back)', '--ds-soft', '--ds-page', 'text'],
  ['trang khoá: lối về khi rê chuột', '--ds-violet', '--ds-page', 'text'],
  ['trang khoá: hero · nhãn cấp độ (.tag)', '--ds-soft', '--ds-card', 'text'],
  ['trang khoá: hero · tiêu đề 36px (.title)', '--ds-ink', '--ds-card', 'large'],
  ['trang khoá: hero · câu mô tả (.subtitle)', '--ds-soft', '--ds-card', 'text'],
  ['trang khoá: hero · viền thẻ (KHÔNG bấm được)', '--ds-line', '--ds-card', 'decor',
    'Hero không phải thành phần bấm được — hai nút nằm BÊN TRONG nó. Ranh giới '
    + 'do nền `card` trên nền `page` và phần đệm 30/34px nói, nên viền thuần '
    + 'trang trí; bảng thiết kế dành đúng vai này cho token `line`.'],
  ['trang khoá: nút chính (.btnPrimary)', '--ds-on-action', '--ds-action', 'text'],
  ['trang khoá: nút chính khi rê chuột', '--ds-on-action', '--ds-violet', 'text'],
  ['trang khoá: nút phụ (.btnSecondary)', '--ds-ink', '--ds-card', 'text'],
  ['trang khoá: nút phụ · viền 2px', '--ds-ink', '--ds-card', 'ui'],
  ['trang khoá: nút phụ · nền khi rê chuột', '--ds-on-action', '--ds-ink', 'text'],
  ['trang khoá: vòng focus / nền trang', '--ds-violet', '--ds-page', 'ui'],
  ['trang khoá: khối nội dung · viền (KHÔNG bấm được)', '--ds-line', '--ds-card', 'decor',
    'Khối "Nội dung khoá học"/"Tổng quan"/"Yêu cầu" là hộp chứa, không bấm '
    + 'được; thứ bấm được bên trong (tiêu đề chặng, từng bài) tự mang viền '
    + '`sketch`. Cùng vai với viền hero ở trên.'],
  ['trang khoá: khối nội dung · đường chia đầu khối', '--ds-line', '--ds-card', 'decor',
    'Đường kẻ dưới hàng tiêu đề mục: hàng đó đã tách khỏi thân bằng đệm 20/22px '
    + 'và bằng cỡ chữ 22px/700. Gỡ đường kẻ không mất thông tin nào.'],
  ['trang khoá: tiêu đề mục 22px (.blockTitle)', '--ds-ink', '--ds-card', 'large'],
  ['trang khoá: số chặng/bài (.blockMeta)', '--ds-soft', '--ds-card', 'text'],
  ['trang khoá: ô icon tiêu đề mục (.blockIcon)', '--ds-violet', '--ds-violet-tint', 'text'],
  ['trang khoá: tên chặng (.moduleName)', '--ds-ink', '--ds-card', 'text'],
  ['trang khoá: số bài của chặng (.moduleMeta)', '--ds-soft', '--ds-card', 'text'],
  ['trang khoá: mũi tên mở chặng (.moduleArrow)', '--ds-soft', '--ds-tint', 'text'],
  ['trang khoá: tên bài (.lessonTitle)', '--ds-ink', '--ds-paper', 'text'],
  ['trang khoá: dòng "Bài n · đã xong" (.lessonMeta)', '--ds-soft', '--ds-paper', 'text'],
  ['trang khoá: viền bài (thẻ BẤM ĐƯỢC nên dùng sketch)', '--ds-sketch', '--ds-paper', 'ui'],
  ['trang khoá: ô số bài · số (.lessonIcon)', '--ds-soft', '--ds-paper', 'text'],
  ['trang khoá: ô số bài · nét đứt', '--ds-sketch', '--ds-paper', 'ui'],
  ['trang khoá: bài khi rê chuột · chữ', '--ds-ink', '--ds-violet-tint', 'text'],
  ['trang khoá: bài khi rê chuột · viền', '--ds-violet', '--ds-violet-tint', 'ui'],
  ['trang khoá: bài ĐÃ XONG · tên bài', '--ds-ink', '--ds-ochre-tint', 'text'],
  ['trang khoá: bài ĐÃ XONG · dòng meta', '--ds-soft', '--ds-ochre-tint', 'text'],
  ['trang khoá: bài ĐÃ XONG · viền', '--ds-ochre', '--ds-ochre-tint', 'ui'],
  ['trang khoá: bài ĐÃ XONG · dấu tích trên nền ink', '--ds-page', '--ds-ink', 'text'],
  ['trang khoá: bài GỢI Ý · tên bài', '--ds-ink', '--ds-violet-tint', 'text'],
  ['trang khoá: bài GỢI Ý · dòng meta', '--ds-soft', '--ds-violet-tint', 'text'],
  ['trang khoá: bài GỢI Ý · viền', '--ds-violet', '--ds-violet-tint', 'ui'],
  ['trang khoá: đoạn mô tả khoá (.desc)', '--ds-ink', '--ds-card', 'text'],
  ['trang khoá: dòng yêu cầu (.reqList li)', '--ds-ink', '--ds-card', 'text'],
  ['trang khoá: dấu ◆ đầu dòng yêu cầu', '--ds-violet', '--ds-card', 'ui'],
  ['trang khoá: giá "Miễn phí" (.price)', '--ds-ink', '--ds-card', 'large'],
  ['trang khoá: nhãn KHOÁ HỌC BAO GỒM', '--ds-soft', '--ds-card', 'text'],
  ['trang khoá: dòng "khoá học bao gồm" (.incItem)', '--ds-ink', '--ds-card', 'text'],
  ['trang khoá: icon dòng "bao gồm"', '--ds-violet', '--ds-card', 'ui'],
  ['trang khoá: vạch trên khối "bao gồm"', '--ds-line', '--ds-card', 'decor',
    'Vạch ngăn giữa nút "Bắt đầu học" và danh sách "KHOÁ HỌC BAO GỒM" trong '
    + 'cùng một thẻ: nhãn in hoa ngay dưới nó đã nói đây là khối mới, nên vạch '
    + 'chỉ để mắt nghỉ.'],
  ['trang khoá: tiêu đề "Bạn sẽ học được" (.cardTitle)', '--ds-ink', '--ds-card', 'large'],
  ['trang khoá: một kỹ năng (.outcome span)', '--ds-ink', '--ds-card', 'text'],
  ['trang khoá: chấm đầu dòng kỹ năng', '--ds-violet', '--ds-card', 'ui'],
  // Thẻ gợi ý: nền `ink`, chữ `page` — cặp tự đảo theo bản nền, như trang chủ.
  ['trang khoá: thẻ gợi ý · chữ (.resumeCard)', '--ds-page', '--ds-ink', 'text'],
  ['trang khoá: thẻ gợi ý · vạch ngăn lối ra', '--ds-desk', '--ds-ink', 'ui'],
  ['trang khoá: thẻ gợi ý · lối ra yên tĩnh (.resumePick)', '--ds-page', '--ds-ink', 'text'],
  ['trang khoá: thẻ gợi ý · vòng focus nút / nền thẻ', '--ds-page', '--ds-ink', 'ui'],
];

const NEED = { text: 4.5, large: 3, ui: 3, decor: 0, inactive: 0 };
export const EXEMPT = ['decor', 'inactive'];

/** Chấm toàn bộ PAIRS cho một bộ token. Trả về danh sách có tỉ lệ + đạt/trượt. */
export function audit(tokens, pairs = PAIRS) {
  return pairs.map(([label, fg, bg, kind, reason]) => {
    const pick = (t) => (Array.isArray(t) ? blend(tokens[t[0]], t[1], tokens[t[2]]) : tokens[t]);
    const fgHex = pick(fg);
    const bgHex = pick(bg);
    if (!fgHex) throw new Error(`token chữ chưa có giá trị: ${fg} (${label})`);
    if (!bgHex) throw new Error(`token nền chưa có giá trị: ${bg} (${label})`);
    const ratio = contrast(fgHex, bgHex);
    if (NEED[kind] === undefined) throw new Error(`loại cặp không biết: ${kind} (${label})`);
    return {
      label, kind, reason, fg: fgHex, bg: bgHex, ratio,
      need: NEED[kind], pass: ratio >= NEED[kind],
    };
  });
}

export function failures(tokens, pairs = PAIRS) {
  return audit(tokens, pairs).filter((r) => !r.pass);
}

/* Chạy tay: node e2e/unit/ds-contrast.mjs */
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`
  || process.argv[1]?.endsWith('ds-contrast.mjs')) {
  const { light, dark } = readTokens();
  for (const [name, tokens] of [['NGÀY', light], ['ĐÊM', dark]]) {
    const rows = audit(tokens);
    const bad = rows.filter((r) => !r.pass);
    const exempt = rows.filter((r) => EXEMPT.includes(r.kind));
    console.log(
      `\n═══ ${name} — ${rows.length} cặp, ${bad.length} trượt, `
      + `${exempt.length} được miễn (đều có lý do viết kèm)`,
    );
    for (const r of rows) {
      const mark = r.pass ? (EXEMPT.includes(r.kind) ? '· ' : '  ') : '!!';
      console.log(`${mark} ${r.ratio.toFixed(2).padStart(6)} / ${r.need}  ${r.fg} trên ${r.bg}  ${r.label}`);
    }
  }
}
