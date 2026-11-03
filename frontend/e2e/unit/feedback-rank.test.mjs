/**
 * THỨ BẬC CỦA PHẢN HỒI — câu nói VÌ SAO không được là hàng mờ nhất.
 *
 * ── VÌ SAO CÓ FILE NÀY ───────────────────────────────────────────────────
 * Bảng ca chấm dưới ô soạn mã có hai hàng cho mỗi ca:
 *   · NHÃN  — chỉ gọi tên đầu vào ("Mã ngắn", "hai tháng"). Đo trên bản dựng:
 *     460 nhãn, dài trung bình 14,3 ký tự, không nhãn nào nói kết quả.
 *   · DETAIL — câu duy nhất nói VÌ SAO ca trượt ("Cần có 3 nhưng nhận 0"),
 *     do `studio-harness.py` phát ra. Mọi nhánh thất bại đều có nó.
 * Nhãn từng ở 13px/`--edu-t1` (17,14:1) còn detail ở 12px/`--edu-t3`
 * (5,46:1) — phần MANG THÔNG TIN nhỏ hơn VÀ nhạt hơn phần chỉ đặt tên, ở 460
 * ca / 138 bài.
 *
 * Van der Kleij 2015 (40 nghiên cứu / 70 cỡ hiệu ứng), con số đã có sẵn trong
 * AGENTS.md: phản hồi CÓ GIẢI THÍCH **d = 0,49** · hiện đáp án đúng 0,32 ·
 * chỉ nói đúng/sai **0,05**. Đây đúng là phần 0,49, và nó đang được trình bày
 * như phần 0,05.
 *
 * Và đây là LẦN THỨ HAI cùng một lỗi: lời giải thích phương án trắc nghiệm
 * từng bị `opacity: 0.55` (xem AGENTS.md). Một lỗi lặp lại ở chỗ thứ hai là
 * lỗi cần một cổng, không cần thêm một lần sửa tay.
 *
 * ── CỔNG NÀY GHIM GÌ ─────────────────────────────────────────────────────
 * QUAN HỆ, không phải con số: detail không được NHỎ HƠN nhãn, và không được
 * NHẠT HƠN nhãn quá một bậc trong thang `--edu-t*`. Ghim "13px" và "#3a4a66"
 * thì đổi cả bảng chữ một nấc là đỏ oan; ghim quan hệ thì "cho nó mờ đi chút
 * cho đỡ rối" mới đỏ — mà đó đúng là việc dễ làm.
 *
 * ── ĐÃ ĐO VÀ BỎ, đừng dựng lại ───────────────────────────────────────────
 * Giả thuyết "detail dài 289 ký tự (JSON không khoảng trắng) tràn ngang, cần
 * `overflow-wrap: anywhere`" là SAI. Đo trong Chrome trên đúng bộ style của
 * hàng đó, khung 360px: bản có và bản không có `overflow-wrap` CÙNG ra 3
 * dòng, chữ lòi ra ngoài ô **-32px** (tức vẫn nằm trong). Chrome ngắt dòng
 * được sau dấu phẩy của JSON. 60/459 ca sinh câu > 120 ký tự và không ca nào
 * tràn.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const goc = (...p) => join(__dirname, '..', '..', ...p);

const EDITOR = readFileSync(
  goc('src', 'components', 'lesson-chrome', 'exercises', 'SandboxEditor.tsx'),
  'utf8',
);
const THEME = readFileSync(goc('public', 'static', 'css', 'edu-theme.css'), 'utf8');

/** WCAG 2.1 §1.4.3 — cùng công thức với ds-contrast.test.mjs, không gọi chéo
 *  để hai bộ không kéo nhau đổ khi một bên đổi. */
const kenh = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const sang = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * kenh(r) + 0.7152 * kenh(g) + 0.0722 * kenh(b);
};
const tiSo = (a, b) => {
  const [x, y] = [sang(a), sang(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Đọc `--edu-tN` ở khối :root của edu-theme.css (khai báo ĐẦU = ban ngày). */
const mauChu = (n) => {
  const m = THEME.match(new RegExp(`--edu-t${n}:\\s*(#[0-9a-f]{6})`, 'i'));
  assert.ok(m, `không đọc được --edu-t${n} từ edu-theme.css`);
  return m[1];
};

/**
 * Bóc cặp (cỡ chữ, token màu) của hai hàng trong bảng ca chấm. Đọc CÂY MÃ chứ
 * không giữ một bảng giá trị thứ hai — bài học của `da-nap-hash-sync.spec.ts`,
 * nơi bản đầu tự chép giá trị vào spec rồi ablate vẫn xanh.
 */
// Mốc phải neo vào ĐẦU khối JSX: `{t.detail}` nằm ở CUỐI thẻ div nên cắt
// xuôi từ đó sẽ vượt qua `fontSize` — bản đầu của tôi làm vậy và cả 3 ca ĐỎ
// trong khi mã đã đúng, tức cổng báo oan thay vì báo thật.
const MOC_NHAN = "<span style={{ color: 'var(--edu-t1)' }}>{t.label}</span>";
const MOC_VI_SAO = '{t.detail && t.status !==';

function hang(moc) {
  const i = EDITOR.indexOf(moc);
  assert.ok(i >= 0, `không tìm thấy ${moc} trong SandboxEditor.tsx — đổi cấu trúc thì sửa ca này`);
  const cua = EDITOR.slice(i, i + 400);
  const co = cua.match(/fontSize:\s*(\d+)/);
  const mau = cua.match(/color:\s*'var\(--edu-(t\d)\)'/);
  assert.ok(co && mau, `${moc}: không đọc được fontSize/color`);
  return { co: Number(co[1]), bac: Number(mau[1].slice(1)) };
}

test('câu VÌ SAO không được NHỎ HƠN nhãn chỉ-gọi-tên của cùng ca', () => {
  // NHÃN KHÔNG TỰ KHAI CỠ CHỮ — nó KẾ THỪA từ `<li>` của hàng ca. Đọc nhầm ở
  // `<span>` của nhãn thì không có `fontSize` nào để đọc, và ca ĐỎ oan (đã
  // xảy ra ở bản đầu). Nên cỡ của nhãn lấy từ chính khối `<li>`.
  const li = EDITOR.slice(EDITOR.indexOf('{tests.map('));
  const coLi = li.match(/fontSize:\s*(\d+)/);
  assert.ok(coLi, 'không đọc được fontSize của <li> hàng ca — đổi cấu trúc thì sửa ca này');
  assert.ok(
    EDITOR.includes(MOC_NHAN),
    'không còn <span> nhãn dùng --edu-t1 — đổi cấu trúc thì sửa ca này',
  );

  const nhanCo = Number(coLi[1]);
  const vi = hang(MOC_VI_SAO);
  assert.ok(
    vi.co >= nhanCo,
    `câu VÌ SAO ${vi.co}px nhỏ hơn nhãn ${nhanCo}px — phần mang thông tin ` +
      '(Van der Kleij d = 0,49) đang bị trình bày nhỏ hơn phần chỉ đặt tên (d = 0,05)',
  );
});

test('câu VÌ SAO không được NHẠT HƠN nhãn quá một bậc trong thang --edu-t*', () => {
  const vi = hang(MOC_VI_SAO);
  // Nhãn dùng --edu-t1. Một bậc là t2; t3 trở đi là hàng ghi chú, không phải
  // hàng nội dung — đúng ranh giới mà bẫy `.io dd` của AGENTS.md đã đặt.
  assert.ok(
    vi.bac <= 2,
    `câu VÌ SAO dùng --edu-t${vi.bac}, tức tụt ${vi.bac - 1} bậc so với nhãn ` +
      '(--edu-t1). t3 trở đi là thang của NHÃN và ghi chú, không phải của nội dung.',
  );
});

test('màu của câu VÌ SAO vượt AA trên nền thẻ, và được đo từ chính edu-theme.css', () => {
  const vi = hang(MOC_VI_SAO);
  const ts = tiSo(mauChu(vi.bac), '#ffffff');
  assert.ok(
    ts >= 4.5,
    `--edu-t${vi.bac} chỉ ${ts.toFixed(2)}:1 trên nền thẻ trắng — dưới AA 4,5:1`,
  );
  // SÀN riêng, thấp hơn số đo thật (8,93:1) một chút: ghim đúng số thật thì
  // đổi một mã màu là đỏ oan, không ghim gì thì nó tụt dần tới 4,51 mà không
  // ai thấy. CHỈ ĐƯỢC NÂNG.
  assert.ok(ts >= 8, `--edu-t${vi.bac} ${ts.toFixed(2)}:1 tụt dưới sàn 8:1 của hàng này`);
});
