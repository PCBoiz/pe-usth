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

/* ═══ Mặt cắt: bốn dải, tám vùng ═══════════════════════════════════════
 *
 * HAI TRỤC TÁCH NHAU. Ngang = kề nhau, vào đâu cũng được. Dọc = chất liệu đổi
 * dần: mặt đất (M1 M2 M3) · nông (M4) · sâu (M5 M6 M7) · đáy (M8). Bốn dải chứ
 * không tám nấc — tám nấc là một cầu thang, mà cầu thang thì bắt đi từ bậc một.
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
 * Giá trị chép đúng từ artboard v3. Sắc khoáng GỐC của báo cáo bản đồ (đồng
 * nung #C27A3E, vàng tơ #C9A646, kính trời #86B4C4, lục lam #4F9A8C, tím thạch
 * anh #7E68B0, lục rêu #7A8F44, hồng lân quang #C76BA8, ngà #E6DFC8) thì bảy
 * trên tám dưới 3:1 trên nền dải của nó; người vẽ artboard đã chỉnh để sắc
 * ĐỊNH HÌNH BÓNG (`edge`) của mỗi vùng đạt ≥ 3:1 (WCAG 1.4.11, hình phi văn
 * bản). Sắc gốc vẫn còn, nhưng chỉ ở những mảng nằm TRONG hình bóng đã có viền.
 *
 * VÀ KHÔNG CHỮ NÀO ĐẶT LÊN SẮC KHOÁNG. Tên vùng nằm trên tấm nền dùng token
 * giao diện (`--ds-card`/`--ds-paper` + chữ `--ds-ink`) — xem CSS.
 */
export const MAP_PALETTE = {
  /**
   * Nền giấy của artboard — lộ ra ở khe giữa hai mép dải lượn. Vẽ trong tranh,
   * không lấy `--ds-paper`: ở chế độ tối token đó thành xanh than và mỗi khe
   * thành một vệt đen cắt ngang bản đồ.
   */
  paper: '#FBF7EE',
  band: {
    sky: '#F6F1E6',
    surface: '#F3EBDD',
    shallow: '#D9D2C3',
    deep: '#5F5A6B',
    floor: '#3A3646',
  },
  /** Ánh sáng: mặt trời đứng trên M1 — chỗ bắt đầu báo bằng ánh sáng. */
  light: { halo: '#FFF3D1', glow: '#FFEDB8', sun: '#F2BE4E', ray: '#FFF0C4' },
  ground: '#CDBB9C',
  well: { head: '#7D6F5A', shaft: '#9A8C74', rope: '#B9AD98' },
  /** Mạch sáng chỉ ở chỗ phụ thuộc thật. 5,08:1 trên dải sâu. */
  flow: '#EADCF5',
  m1: {
    edge: '#C27A3E',
    roof: '#A8622C',
    chimney: '#7A4520',
    ink: '#5A2E10',
    window: '#FFD27A',
    smoke: '#E9DDCB',
    smokeLight: '#EFE5D6',
  },
  m2: { edge: '#9C8231', thread: '#C9A646', knot: '#7A6420' },
  m3: { edge: '#56737E', glass: '#86B4C4', sky: '#CFE3EA', side: '#6F929E' },
  m4: { edge: '#2F7366', rim: '#3F7F73', water: '#4F9A8C', shine: '#86C2B5' },
  m5: { edge: '#BEB0EA', front: '#CFC3F2', facet: '#E6DFF8', base: '#4A4556' },
  m6: { edge: '#B4C978', top: '#C2D68A', low: '#A6BC68', grid: '#4A5A26', moss: '#D4E59E' },
  m7: { edge: '#F2BDE0', cave: '#1A1722', halo: '#C76BA8', glow: '#E58FC8' },
  m8: { edge: '#E6DFC8', water: '#F4EFE0' },
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
  { key: 'M1', band: 'surface', silhouette: 'xưởng có lò, hai ống khói, ống đồng rẽ nhánh', backdrop: 'sky', box: [20, 0, 420, 250], plate: [146, 262] },
  { key: 'M2', band: 'surface', silhouette: 'khung cửi nhiều sợi song song, một nút thắt', backdrop: 'sky', box: [490, 30, 380, 210], plate: [556, 262] },
  { key: 'M3', band: 'surface', silhouette: 'mặt tiền lưới ô kính', backdrop: 'sky', box: [940, 30, 380, 210], plate: [1000, 262] },
  { key: 'M4', band: 'shallow', silhouette: 'nhiều mạch rỉ vào một bể', backdrop: 'shallow', box: [470, 370, 420, 130], plate: [940, 412] },
  { key: 'M5', band: 'deep', silhouette: 'cụm tinh thể lưới đều', backdrop: 'deep', box: [120, 530, 320, 140], plate: [146, 658] },
  { key: 'M6', band: 'deep', silhouette: 'vách vỉa tầng kẻ hàng, rêu trên đỉnh', backdrop: 'deep', box: [520, 530, 330, 140], plate: [556, 658] },
  { key: 'M7', band: 'deep', silhouette: 'hang tối có tinh thể phát sáng thành cột', backdrop: 'deep', box: [930, 530, 330, 140], plate: [1010, 658] },
  { key: 'M8', band: 'floor', silhouette: 'hồ ngầm phản chiếu bảy sắc', backdrop: 'floor', box: [440, 700, 480, 166], plate: [870, 756] },
];

/**
 * Mặt trời — nơi sáng nhất của bản vẽ, đứng trong ô của M1. Chỗ bắt đầu báo
 * bằng ÁNH SÁNG: không mũi tên, không số to, không câu "bắt đầu ở đây".
 */
export const MAP_SUN = { cx: 110, cy: 58 } as const;

/**
 * ĐƯỜNG NỐI — CHỈ ở chỗ phụ thuộc thật: M5 → M6 → M7 → M8 (đã kiểm bằng gói
 * thư viện từng bài: pandas đứng trên NumPy, Matplotlib vẽ DataFrame, hai bài
 * dự án dùng cả ba).
 *
 * KHÔNG có nét nào nối M1 → M8. Bản cũ vẽ MỘT đường zig-zag qua cả tám nút, và
 * một đường duy nhất là lời hứa ngầm về thứ tự — đúng điều mà "vào đâu cũng
 * được" phủ nhận. Thêm một phần tử vào mảng này là khẳng định một phụ thuộc
 * mới giữa hai chặng; test đòi đúng ba cạnh này.
 */
export const MAP_FLOWS = [
  { from: 'M5', to: 'M6', d: 'M384 612 C 440 592 478 632 536 610', head: '456,606 468,612 456,618' },
  { from: 'M6', to: 'M7', d: 'M834 610 C 870 590 900 632 946 612', head: '884,606 896,612 884,618' },
  { from: 'M7', to: 'M8', d: 'M1094 656 C 1084 724 950 764 842 770', head: '972,746 960,756 974,758' },
] as const;

/**
 * GIẾNG — mỗi vùng dưới mặt đất có giếng RIÊNG đi thẳng từ mặt đất xuống nó.
 * Giếng không nối vùng với vùng: nó nói "từ mặt đất xuống thẳng chỗ này được",
 * tức chính trục "vào đâu cũng được" vẽ thành hình. `x` là chỗ đầu giếng trên
 * mặt đất.
 */
export const MAP_WELLS = [
  { to: 'M8', x: 36, d: 'M36 238 L36 780 L520 780' },
  { to: 'M5', x: 100, d: 'M100 238 L100 604 L132 604' },
  { to: 'M4', x: 470, d: 'M470 238 L470 472 L556 472' },
  { to: 'M6', x: 905, d: 'M905 238 L905 560 L838 560' },
  { to: 'M7', x: 1300, d: 'M1300 236 L1300 604 L1246 604' },
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
