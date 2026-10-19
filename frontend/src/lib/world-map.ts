/**
 * BẢN ĐỒ THẾ GIỚI của trang chủ — dữ liệu, bảng màu minh hoạ, câu chữ và các
 * bước hoạt ảnh.
 *
 * Nguồn thiết kế: `design/v3/quyet-dinh.md` mục 2–3 (phương án A "Mặt cắt lục
 * địa") và hai artboard của canvas thiết kế v3: `project/Main.dc.html` (máy tính,
 * khung 1360 × 820) và `project/MapPhone.dc.html` (điện thoại, 390 rộng). Mọi
 * toạ độ dưới đây chép từ hai artboard đó, trong hệ toạ độ 1360 × 820.
 *
 * Vì sao là file riêng, không nằm trong component — cùng lý lẽ với
 * `home-copy.ts`:
 *  1. `node --test` KHÔNG phân giải alias `@/…`, nên file này cố ý KHÔNG import
 *     gì cả; mọi dữ liệu thật (giáo trình 8 chặng · 48 bài) được TRUYỀN VÀO.
 *  2. Mọi quyết định kiểm được bằng `node --test` thì nằm ở đây (tên chặng, số
 *     bài, liên kết, nhãn, dải, đường nối, bảng màu, keyframe); phần phải có
 *     DOM (`.animate()`) thì ở `app/WorldMap.tsx`.
 *
 * ── KHÔNG TIẾN ĐỘ, KHÔNG KHOÁ ─────────────────────────────────────────
 * Trang chủ KHÔNG gọi API nào (xem `app/page.tsx`): nó công khai, và `apiFetch`
 * gặp 401 sẽ TỰ TẠO tài khoản khách (bẫy trong AGENTS.md), tức mỗi con bot quét
 * web sinh một tài khoản `@guest.local`. Nên ở đây hệ thống thật sự KHÔNG BIẾT
 * người xem học tới đâu — một bản đồ vẽ "đã xong 7/7" cho người chưa học bài
 * nào thì không chỉ sai, nó làm mất đáng tin cả những con số thật. Tiến độ là
 * GIAI ĐOẠN 2 (sau thử nghiệm), đọc bằng `apiFetchSessionOnly`, và nó PHỦ LÊN
 * qua hai nhóm SVG đã vẽ sẵn mà ẩn: `data-lit` và `data-marker` (xem
 * `WorldMap.tsx`).
 *
 * Không ổ khoá, không "mở khi đủ N bài". Grep cả frontend lẫn backend không
 * thấy cơ chế khoá chặng nào. Tám vùng là tám LIÊN KẾT THẬT, vào được ngay từ
 * vùng thứ tám.
 */

/** Một chặng trong `curricula.json`: `{ title, lessons[] }`. */
export type ModuleLike = { title: string; lessons: string[] };

/**
 * Tên ẩn dụ của tám chặng theo đúng thứ tự M1 → M8.
 *
 * Đây là CÂU CHỮ của bản thiết kế, không phải dữ liệu đo được — nên nó được
 * phép viết thẳng ở đây. Nhưng nó gắn với THỨ TỰ chặng, nên nếu giáo trình đổi
 * số chặng thì `buildRegions` bỏ hẳn tên ẩn dụ (xem dưới): thà thiếu một cái
 * tên thơ còn hơn gọi chặng pandas là "Hoạ thất".
 */
export const REGION_NAMES = [
  'Xưởng phân thân',
  'Khung cửi song song',
  'Ô cửa quan sát',
  'Thư khố',
  'Cỗ máy ma trận',
  'Bàn sổ cái',
  'Hoạ thất',
  'Đại công trình',
] as const;

/* ═══ MỘT CÁI VỰC: bốn tầng độ sâu, tám gian ═══════════════════════════
 *
 * HAI TRỤC TÁCH NHAU. Ngang = kề nhau, vào đâu cũng được. Dọc = độ sâu, và nó
 * đổi chất liệu dần: miệng vực (M1 M2 M3) · chỗ thắt (M4) · gallery (M5 M6 M7)
 * · hồ đáy (M8). Bốn TẦNG chứ không tám nấc — tám nấc là một cầu thang, mà cầu
 * thang thì bắt đi từ bậc một.
 *
 * ── VÌ SAO TOẠ ĐỘ Ở ĐÂY ĐỔI (19/10/2026) ──────────────────────────────
 * Bản trước bị bác bằng đúng một câu: "chưa có sự liên kết giữa các màn" — tám
 * gian là tám hốc RỜI trôi trong đá. Bản này có đúng MỘT cái hố: vách vực chạy
 * liền từ miệng xuống đáy, nở ra ở miệng, thắt lại ở giữa, phình ra thành
 * gallery, rồi loe ra thành lòng hồ; tám gian là chỗ vách ấy PHÌNH RA, không
 * phải tám hình khép kín. Hình thái nằm ở `scripts/map/build_map.py` mục 3
 * (`Vuc`); dưới đây chỉ là tám cái HỘP — ô crop cho điện thoại và hộp liên kết
 * — nên chúng phải trùng với chỗ hốc thật, và `world-map.test.mjs` so lại.
 *
 * Hộp đổi ⇒ `.spot1…8` trong `world-map.module.css` PHẢI đổi theo. Đừng tính
 * tay: `py scripts/map/build_map.py --css` in ra đúng khối ấy.
 */

/** Khung toạ độ của artboard máy tính. CSS đặt `aspect-ratio` theo đúng nó. */
export const MAP_FRAME = { width: 1360, height: 820 } as const;

export type BandId = 'surface' | 'shallow' | 'deep' | 'floor';

/** Thứ tự dải từ trên xuống — điện thoại cuộn theo đúng thứ tự này. */
export const BANDS: readonly BandId[] = ['surface', 'shallow', 'deep', 'floor'];

/**
 * BẢNG MÀU MINH HOẠ — riêng của bản đồ, KHÔNG phải bảng giao diện `--ds-*`.
 *
 * Vì sao nằm ở đây chứ không phải biến CSS trong `world-map.module.css`:
 * `npm run lint:tokens` cấm mã hex trong mọi `*.module.css` (để giao diện chỉ
 * đi qua token), còn `style={{…}}` thì thêm nợ cho `style-src 'unsafe-inline'`.
 * Nên bảng này vẽ bằng THUỘC TÍNH `fill=`/`stroke=` của SVG — thuộc tính trình
 * bày, không phải `style=`, CSP không chặn — và nhờ nằm trong một file TS mà
 * `e2e/unit/world-map.test.mjs` ĐO tương phản thẳng trên chính các giá trị này.
 *
 * Sắc khoáng GỐC của báo cáo bản đồ (đồng nung #C27A3E, vàng tơ #C9A646, kính
 * trời #86B4C4, lục lam #4F9A8C, tím thạch anh #7E68B0, lục rêu #7A8F44, hồng
 * lân quang #C76BA8, ngà #E6DFC8) thì bảy trên tám dưới 3:1 trên nền dải của
 * nó. Nên chúng ở lại đúng chỗ của màu trong hai bản tham chiếu — LỚP PHỦ dưới
 * mực (`wash`) — còn sắc ĐỊNH HÌNH BÓNG (`edge`) được chọn riêng để đạt ≥ 3:1
 * (WCAG 1.4.11, hình phi văn bản).
 *
 * `scripts/map/build_map.py` ĐỌC CHÍNH BẢNG NÀY để sinh tranh: không một mã màu
 * nào được viết trong script, và ca test so lại từng mã trong SVG sinh ra với
 * bảng này. Đổi một dòng ở đây rồi chạy lại script là đổi cả bức vẽ.
 *
 * VÀ KHÔNG CHỮ NÀO ĐẶT LÊN SẮC KHOÁNG. Tên vùng nằm trên tấm nền dùng token
 * giao diện (`--ds-card`/`--ds-paper` + chữ `--ds-ink`) — xem CSS.
 */
export const MAP_PALETTE = {
  /**
   * Nền giấy — giấy CŨ, không phải giấy trắng. Vẽ trong tranh, không lấy
   * `--ds-paper`: ở chế độ tối token đó thành xanh than và mỗi khe giữa hai
   * dải thành một vệt đen cắt ngang bản đồ.
   */
  paper: '#F1E7D0',
  /**
   * BỐN TÔNG MỰC. Toàn bộ sắc độ của bức vẽ làm bằng MẬT ĐỘ NÉT ở bốn tông này
   * — không một gradient nào (`build_map.py` cấm, và có ca test). Đó là điểm
   * khác duy nhất giữa một bản đồ vẽ tay và một hình tô mảng phẳng.
   */
  ink: { deep: '#2A2118', mid: '#4C3C2B', soft: '#6E5B45', pale: '#9A8468', wash: '#C4B394' },
  band: {
    sky: '#E9DCBE',
    surface: '#CFBD96',
    shallow: '#A28C68',
    deep: '#544D41',
    floor: '#2E2B24',
  },
  /** Ánh sáng: mặt trời đứng trên M1 — chỗ bắt đầu báo bằng ánh sáng. */
  light: { halo: '#FBF3DA', glow: '#F6E7B6', sun: '#E8B445', ray: '#F3E2B0' },
  ground: '#A8906C',
  /** Đá: vân, khe nứt, bóng, màn phủ nhạt ở xa. */
  rock: { grain: '#8A7657', crack: '#5B4A34', shade: '#43382A', veil: '#D3C3A1' },
  /** Lòng gian đã khoét — sáng hơn đá quanh nó, nên gian đọc ra là MỘT KHOẢNG RỖNG. */
  room: { lit: '#CDBC98', dim: '#7C7363', dark: '#4A463C' },
  well: { head: '#5C4A33', shaft: '#7A6647', rope: '#A89070' },
  /** Mạch sáng chỉ ở chỗ phụ thuộc thật. 4,76:1 trên dải sâu. */
  flow: '#E7D9F3',
  /*
   * Tám sắc khoáng của `quyet-dinh.md` mục 2 nằm ở `wash` — chúng là LỚP PHỦ
   * dưới mực, đúng cách hai bản tham chiếu làm màu. `edge` là tông ĐỊNH HÌNH
   * BÓNG, thứ duy nhất phải đạt ≥ 3:1 trên nền dải của nó (WCAG 1.4.11); `glow`
   * là chỗ sáng nhất trong gian; `ink` là nét đậm nhất của riêng gian đó.
   */
  m1: { edge: '#5E3F22', wash: '#C27A3E', glow: '#F0B35A', ink: '#3A2410' },
  m2: { edge: '#574B1E', wash: '#C9A646', glow: '#E3C877', ink: '#3A3113' },
  m3: { edge: '#2F444E', wash: '#86B4C4', glow: '#CFE3EA', ink: '#1E2E36' },
  m4: { edge: '#16382F', wash: '#4F9A8C', glow: '#9ACFC3', ink: '#0D241D' },
  m5: { edge: '#D7D0EE', wash: '#7E68B0', glow: '#EDE7FA', ink: '#3B3357' },
  m6: { edge: '#CBD9A2', wash: '#7A8F44', glow: '#E4EDC6', ink: '#3C4620' },
  m7: { edge: '#ECC4DC', wash: '#C76BA8', glow: '#F7E2EE', ink: '#4A2340' },
  m8: { edge: '#F2E9CE', wash: '#E6DFC8', glow: '#FBF6E6', ink: '#4A4433' },
} as const;

/** Nền ngay sau hình bóng của vùng — chỗ đo tương phản của `edge`. */
export type Backdrop = keyof typeof MAP_PALETTE.band;

/** Bố cục một vùng trên khung 1360 × 820. */
export type RegionLayout = {
  /** "M1"…"M8" — khoá của `data-lit`/`data-marker` ở giai đoạn 2. */
  key: string;
  band: BandId;
  /** Hình bóng địa danh — thứ tách vùng KHÔNG cần màu. Mỗi vùng một hình. */
  silhouette: string;
  /** Nền sau hình bóng (M1–M3 đứng trên nền TRỜI, không phải dải đất). */
  backdrop: Backdrop;
  /**
   * Ô tiểu cảnh `[x, y, w, h]` — viewBox của SVG trong liên kết, chép từ ô
   * crop của artboard điện thoại. Ở bản rộng chính ô này là hộp của liên kết
   * (định vị theo %), nên cả tiểu cảnh bấm được chứ không chỉ tấm nhãn.
   */
  box: readonly [number, number, number, number];
  /** Góc trên-trái tấm nhãn trên khung, chép từ artboard máy tính. */
  plate: readonly [number, number];
};

/**
 * Tám vùng. Đây là TOẠ ĐỘ của bản vẽ, không phải số đếm giáo trình: số chặng,
 * số bài và liên kết đều đếm từ `curricula.json` trong `buildRegions`.
 */
export const REGION_LAYOUT: readonly RegionLayout[] = [
  { key: 'M1', band: 'surface', silhouette: 'hốc vách trái miệng vực: xưởng có lò, hai ống khói, ống đồng rẽ nhánh', backdrop: 'sky', box: [150, 10, 360, 330], plate: [186, 350] },
  { key: 'M2', band: 'surface', silhouette: 'hõm vách sau miệng vực: khung cửi nhiều sợi song song, một nút thắt', backdrop: 'surface', box: [520, 40, 320, 300], plate: [556, 350] },
  { key: 'M3', band: 'surface', silhouette: 'hốc vách phải miệng vực: mặt tiền lưới ô kính', backdrop: 'surface', box: [850, 10, 360, 330], plate: [898, 350] },
  { key: 'M4', band: 'shallow', silhouette: 'công trình chắn ngang chỗ thắt: nhiều mạch rỉ vào một bể', backdrop: 'shallow', box: [470, 362, 420, 150], plate: [926, 424] },
  { key: 'M5', band: 'deep', silhouette: 'hốc vách trái gallery: cụm tinh thể lưới đều', backdrop: 'deep', box: [180, 518, 320, 176], plate: [190, 702] },
  { key: 'M6', band: 'deep', silhouette: 'hõm vách sau gallery: giá sổ cái kẻ hàng và cột', backdrop: 'deep', box: [520, 518, 330, 176], plate: [556, 702] },
  { key: 'M7', band: 'deep', silhouette: 'hốc vách phải gallery: vòm sao và bàn vẽ có trục', backdrop: 'deep', box: [860, 518, 320, 176], plate: [896, 702] },
  { key: 'M8', band: 'floor', silhouette: 'lòng hồ ở đáy vực, phản chiếu bảy sắc', backdrop: 'floor', box: [430, 690, 500, 130], plate: [962, 766] },
];

/**
 * HÌNH THÁI CỦA CÁI VỰC — mặt cắt theo độ sâu, mốc tầng, và tám cái hốc.
 *
 * Vì sao nằm ở ĐÂY chứ không trong `build_map.py`: hai bên phải đọc CÙNG một
 * nguồn. `build_map.py` đọc khối này qua `read_ts()` để vẽ; lớp chuyển động
 * (`map-motion.ts`, phần tử HTML chồng LÊN tranh) đọc nó để đặt mốc. Đã trả
 * giá một lần cho chuyện chép: lớp chuyển động từng giữ bản sao bốn mốc địa
 * tầng, và bản sao chết trong hai giờ khi bức tranh được vẽ lại
 * (238/390/528/710 → 128/378/508/716). Toạ độ nào mà cả hai bên cùng cần thì
 * nó ở đây, không ở đâu khác.
 *
 * KHÔNG phải mọi nét của bức vẽ đều ở đây — nhiễu, hachure, chấm lấm tấm là
 * việc của script. Ở đây chỉ có những con số mà một người khác có thể cần để
 * đặt một thứ gì đó ĐÚNG CHỖ trên khung 1360 × 820.
 */
export const MAP_ABYSS = {
  /** Trục của vực trên khung 1360 rộng. */
  cx: 680,
  /** Miệng vực — chỗ mặt đất bị cắt đứt. Mặt đất nằm ngay trên độ sâu này. */
  mouthY: 120,
  /** Đáy khung vẽ của vực. */
  bottomY: 830,
  /**
   * Mép dưới của bốn tầng độ sâu. Tên trùng `BandId`, và `REGION_LAYOUT[].band`
   * nói gian nào ở tầng nào. `build_map.py` lấy chính mảng này làm mốc cho
   * thang độ sâu ở hai lề và cho vạch tầng cắt ngang bức vẽ.
   */
  tiers: [
    { band: 'surface', bottomY: 378 },
    { band: 'shallow', bottomY: 508 },
    { band: 'deep', bottomY: 716 },
    { band: 'floor', bottomY: 830 },
  ],
  /**
   * MẶT CẮT: `[độ sâu, nửa bề rộng]`, nội suy cosin giữa hai mốc liền nhau.
   * Đọc từ trên xuống là đọc được dáng cả cái vực — nở ra ở miệng, thắt lại ở
   * 438, phình thành gallery ở 626, thắt lần hai, rồi loe ra thành lòng hồ.
   * `shaft` là LÒNG vực (chỗ rỗng), `rock` là hình bóng KHỐI ĐÁ trên giấy.
   */
  shaft: [
    [120, 318], [176, 334], [240, 352], [300, 346], [362, 268],
    [438, 150], [502, 206], [562, 300], [626, 392],
    [690, 352], [746, 212], [794, 250], [830, 240],
  ],
  rock: [
    [120, 700], [185, 640], [260, 596], [340, 566], [438, 462],
    [502, 494], [562, 528], [626, 566], [690, 546],
    [746, 442], [794, 394], [830, 368],
  ],
  /**
   * TÁM CÁI HỐC: `[gian, bên, y bắt đầu, y kết thúc, chiều sâu]`. Mỗi hốc cộng
   * vào `shaft` một bướu `sin(πt)^0.35` ở bên của nó — bằng 0 ở hai đầu, nên
   * đường vách vẫn LIỀN, chỉ là nó đi vòng ra ngoài chỗ có gian. Đó là toàn bộ
   * mẹo "tám gian thuộc cùng một cái hố"; tám hình khép kín rời nhau chính là
   * khuyết điểm mà bản 19/10/2026 sinh ra để chữa.
   */
  alcoves: [
    ['M1', 'trai', 196, 344, 130],
    ['M3', 'phai', 196, 344, 130],
    ['M4', 'trai', 372, 498, 52], ['M4', 'phai', 372, 498, 52],
    ['M5', 'trai', 530, 700, 104],
    ['M7', 'phai', 530, 700, 104],
    ['M8', 'trai', 734, 830, 94], ['M8', 'phai', 734, 830, 94],
  ],
} as const;

/**
 * Mặt trời — nơi sáng nhất của bản vẽ, đứng trong ô của M1. Chỗ bắt đầu báo
 * bằng ÁNH SÁNG: không mũi tên, không số to, không câu "bắt đầu ở đây".
 */
export const MAP_SUN = { cx: 300, cy: 56 } as const;

/**
 * ĐƯỜNG NỐI — CHỈ ở chỗ phụ thuộc thật: M5 → M6 → M7 → M8 (đã kiểm bằng gói
 * thư viện từng bài: pandas đứng trên NumPy, Matplotlib vẽ DataFrame, hai bài
 * dự án dùng cả ba).
 *
 * KHÔNG có nét nào nối M1 → M8. Bản cũ vẽ MỘT đường zig-zag qua cả tám nút, và
 * một đường duy nhất là lời hứa ngầm về thứ tự — đúng điều mà "vào đâu cũng
 * được" phủ nhận. Thêm một phần tử vào mảng này là khẳng định một phụ thuộc
 * mới giữa hai chặng; test đòi đúng ba cạnh này.
 *
 * `d` là đường tim của mạch ở bản RỘNG: `build_map.py` đọc nó, bám theo rồi
 * trải thành một bó nét lệch nhau cộng đầu mũi tên — nên hình mạch sáng trong
 * tranh và ba cạnh phụ thuộc này KHÔNG THỂ lệch nhau. Bản HẸP vẽ một đoạn dọc
 * giữa hai ô, dựng từ chính mảng này (`MAP_FLOWS.find` trong `WorldMap.tsx`).
 */
export const MAP_FLOWS = [
  { from: 'M5', to: 'M6', d: 'M408 620 C 460 600 510 642 580 618' },
  { from: 'M6', to: 'M7', d: 'M790 618 C 840 598 900 642 952 620' },
  { from: 'M7', to: 'M8', d: 'M1050 684 C 980 700 850 714 752 742' },
] as const;

/**
 * CÁP THẢ — mỗi gian dưới miệng vực có lối RIÊNG từ vành miệng xuống thẳng nó.
 * Cáp không nối gian với gian: nó nói "từ mặt đất xuống thẳng chỗ này được",
 * tức chính trục "vào đâu cũng được" vẽ thành hình. `x` là chỗ đặt tời trên
 * vành miệng.
 *
 * Trước 19/10/2026 đây là năm cái GIẾNG đào thẳng qua đá. Hình thái mới không
 * chứa được chúng: khối đá thắt lại còn x ∈ [218, 1142] ở độ sâu 438, nên một
 * trục dọc ở x = 100 chui ra ngoài hình bóng và treo lơ lửng trên giấy. Năm
 * sợi cáp cùng luồn qua chỗ thắt rồi xoè ra nói thêm được một điều mà năm cái
 * giếng song song không nói được: năm gian ở dưới nằm trong CÙNG một cái hố.
 */
export const MAP_WELLS = [
  { to: 'M8', x: 1180, d: 'M1180 122 L1040 200 L900 320 L830 420 L800 520 L740 640 L690 730 L666 764' },
  { to: 'M5', x: 198, d: 'M198 118 L300 170 L430 260 L470 360 L480 440 L430 540 L330 606' },
  { to: 'M4', x: 1118, d: 'M1118 120 L1010 180 L880 280 L780 370 L716 400' },
  { to: 'M6', x: 240, d: 'M240 124 L380 190 L540 290 L600 380 L640 470 L672 540 L686 602' },
  { to: 'M7', x: 1150, d: 'M1150 120 L1000 190 L900 300 L840 400 L900 500 L1012 606' },
] as const;

/** Một vùng trên bản đồ. */
export type Region = {
  /** Tên ẩn dụ, hoặc tên chặng nếu giáo trình lệch số chặng. */
  name: string;
  /** "M1 · Tiến trình và subprocess · 7 bài" — đếm từ giáo trình. */
  meta: string;
  /** Liên kết THẬT tới bài đầu chặng. */
  href: string;
  /** Nhãn đầy đủ cho trình đọc màn hình. */
  ariaLabel: string;
  /**
   * Chỗ của vùng trên mặt cắt, hoặc `null` khi giáo trình không còn đúng hình
   * tám chặng của bản vẽ — khi đó component chỉ dựng danh sách liên kết.
   */
  layout: RegionLayout | null;
};

/**
 * Dựng các vùng từ chính giáo trình đang render.
 *
 * Số bài ĐẾM từ `modules[i].lessons.length`, không viết cứng — bẫy "hai nguồn
 * danh sách bài" trong AGENTS.md: `catalog.ts` là bản chép tay từ seed, còn
 * danh sách bài thật nằm ở `curricula.json`.
 *
 * `?lesson=` đếm từ 0 trên DANH SÁCH PHẲNG 48 bài (xem
 * `courses/[courseId]/CourseDetail.tsx` và `lesson/python_advanced/page.tsx`),
 * nên chỉ số bài đầu chặng là tổng số bài của các chặng trước nó.
 */
export function buildRegions(modules: ModuleLike[] | null | undefined, lessonUrl: string): Region[] {
  const list = modules ?? [];
  // Tên ẩn dụ VÀ chỗ trên mặt cắt chỉ dùng khi giáo trình còn ĐÚNG tám chặng
  // theo đúng thứ tự: hồ M8 vẽ cho hai bài dự án, không cho chặng thứ chín.
  const drawn = list.length === REGION_NAMES.length && list.length === REGION_LAYOUT.length;
  const out: Region[] = [];
  let flat = 0;
  for (let i = 0; i < list.length; i += 1) {
    const stage = list[i];
    const count = stage.lessons.length;
    const title = stage.title.trim();
    const name = drawn ? REGION_NAMES[i] : title;
    const meta = drawn ? `${title} · ${count} bài` : `${count} bài`;
    out.push({
      name,
      meta,
      href: `${lessonUrl}?lesson=${flat}`,
      // Nhãn nói rõ BẤM VÀO THÌ ĐI ĐÂU. "mở bài đầu chặng" là phần mà người
      // dùng chuột đọc được bằng hình, còn trình đọc màn hình thì không.
      ariaLabel: `${name} — ${meta}, mở bài đầu chặng`,
      layout: drawn ? REGION_LAYOUT[i] : null,
    });
    flat += count;
  }
  return out;
}

/** Câu chữ quanh bản đồ. */
export const MAP_COPY = {
  /** Tiêu đề của khối — ẩn khỏi mắt (artboard), trình đọc màn hình vẫn đọc. */
  label: 'Bản đồ thế giới',
} as const;

/*
 * KHÔNG CÓ `caption`, và đây là chỗ dễ thêm lại nhất nên phải nói rõ vì sao.
 *
 * Bản đồ kể CHỈ bằng hình (quyet-dinh.md mục 1): không câu bối cảnh, không chú
 * giải dưới hình. Câu cũ "Chặng nào cũng vào được — bấm vào một chặng là mở bài
 * đầu của chặng đó" đúng sự thật, nhưng tám vùng đều là liên kết thực, giếng
 * riêng của từng vùng đã VẼ ra điều đó, và mọi liên kết mang `ariaLabel` kết
 * thúc bằng "mở bài đầu chặng". Một dòng chữ lặp lại điều hình đã nói là văn
 * kể lể, không phải khả năng tiếp cận.
 */

/* ═══ Hoạt ảnh ═════════════════════════════════════════════════════════
 *
 * Luật, theo design-system-v2 (thang chuyển động 3 bậc 200 / 320 / 450 ms):
 *  · CHỈ `transform` và `opacity` — hai thứ trình duyệt chạy được trên lớp
 *    composite, không phải tính lại layout.
 *  · TRẠNG THÁI NGHỈ TRONG CSS LÀ TRẠNG THÁI CUỐI (hiện rõ, không dịch). Mọi
 *    đường hỏng — không có WAAPI, animation bị cancel, JS lỗi, người dùng xin
 *    giảm chuyển động — đều dừng ở chỗ an toàn: bản đồ hiện đủ.
 *  · `prefers-reduced-motion: reduce` ⇒ KHÔNG có bước nào, không phải "bước
 *    ngắn hơn".
 */

/** Một bước cho `Element.animate(keyframes, options)`. */
export type MapStep = {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
};

/** Giãn cách giữa hai vùng liền nhau (ms). */
export const REGION_STAGGER_MS = 60;

/**
 * Bước hiện ra của vùng thứ `index`, hoặc `null` nếu không được chạy.
 *
 * Vùng nổi lên TỪ DƯỚI (dịch 10px). `fill: 'backwards'` để lúc animation còn
 * chờ thì vùng đứng ở khung ĐẦU, không chớp một nhịp; không dùng `forwards` vì
 * khung cuối ĐÃ LÀ trạng thái nghỉ của CSS.
 */
export function regionStep(index: number, reduced: boolean): MapStep | null {
  if (reduced) return null;
  return {
    keyframes: [
      { opacity: 0, transform: 'translate3d(0, 10px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    ],
    options: {
      // 320ms = bậc "hiện ra: thẻ, callout, khối gợi ý" của thang.
      duration: 320,
      delay: index * REGION_STAGGER_MS,
      easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      fill: 'backwards',
    },
  };
}

/**
 * Bước hiện ra của nền (trời, bốn dải, giếng, mạch sáng).
 *
 * Chỉ `opacity`: vẽ dần mạch sáng phải chạy `stroke-dashoffset` — thuộc tính đó
 * buộc trình duyệt vẽ lại từng khung hình, và nó không nằm trong hai thuộc
 * tính được phép.
 */
export function decorStep(reduced: boolean): MapStep | null {
  if (reduced) return null;
  return {
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    options: { duration: 450, easing: 'ease-out', fill: 'backwards' },
  };
}
