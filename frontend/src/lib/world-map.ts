/**
 * BẢN ĐỒ THẾ GIỚI của trang chủ — dữ liệu, câu chữ và các bước hoạt ảnh.
 *
 * Nguồn thiết kế: `design/project/Main.dc.html` (artboard "bản đồ thế giới",
 * khối `.map` với tám `.region`) và `design-system-v2.md` (thang màu/cỡ
 * chữ/bo góc/chuyển động). Màn chặng liên quan: `design/project/Path.dc.html`.
 *
 * Vì sao là file riêng, không nằm trong component — cùng lý lẽ với
 * `home-copy.ts`:
 *  1. `node --test` KHÔNG phân giải alias `@/…`, nên file này cố ý KHÔNG import
 *     gì cả; mọi dữ liệu thật (giáo trình 8 chặng · 48 bài) được TRUYỀN VÀO.
 *  2. Mọi quyết định kiểm được bằng `node --test` thì nằm ở đây (tên chặng, số
 *     bài, liên kết, nhãn cho trình đọc màn hình, keyframe, thời lượng); phần
 *     phải có DOM (`.animate()`) thì ở `app/WorldMap.tsx`.
 *
 * ── BA ĐIỀU ARTBOARD CÓ MÀ Ở ĐÂY CỐ Ý KHÔNG DỰNG ────────────────────────
 * Artboard vẽ tiến độ ở ba chỗ: nút "đã xong" có dấu tích, huy hiệu "BẠN Ở
 * ĐÂY" quầng tím, và dòng "đã xong 7 / 7 bài" / "chưa học" dưới mỗi nút. Cộng
 * thêm chuyện nét ĐẶC là đoạn đã đi còn nét CHẤM là đoạn chưa học.
 *
 * Trang chủ KHÔNG gọi API nào (xem `app/page.tsx`): nó công khai, và `apiFetch`
 * gặp 401 sẽ TỰ TẠO tài khoản khách (bẫy trong AGENTS.md), tức mỗi con bot quét
 * web sinh một tài khoản `@guest.local`. Nên ở đây hệ thống thật sự KHÔNG BIẾT
 * người xem học tới đâu — và một bản đồ vẽ "đã xong 7/7" cho người chưa học bài
 * nào thì không chỉ sai, nó làm mất đáng tin cả những con số thật (8 chặng ·
 * 48 bài). Muốn có tiến độ thật thì phải đọc bằng `apiFetchSessionOnly` (xem
 * `lib/course-progress.ts`), và đó là một việc khác.
 *
 * ── VÀ KHÔNG KHOÁ GÌ ───────────────────────────────────────────────────
 * Không ổ khoá, không "mở khi đủ N bài". Grep cả frontend lẫn backend không
 * thấy cơ chế khoá chặng nào; một ổ khoá vừa bị gỡ ở dc3620d vì nó nằm cạnh
 * đúng câu "không khoá theo thứ tự". Tám nút là tám LIÊN KẾT THẬT, vào được
 * ngay từ nút thứ tám.
 */

/** Một chặng trong `curricula.json`: `{ title, lessons[] }`. */
export type ModuleLike = { title: string; lessons: string[] };

/**
 * Tên ẩn dụ của tám chặng, chép từ artboard (`.region-label` trong
 * `Main.dc.html`) theo đúng thứ tự M1 → M8.
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

/**
 * Vị trí tám nút trên khung 1000 × 660 của artboard, đổi sang phần trăm (chính
 * artboard cũng đặt bằng `left: %` / `top: %`).
 *
 * Đừng "sửa cho đều": đường đi zig-zag là thứ giữ cho nhãn hai nút cạnh nhau
 * không đè lên nhau — M7 (86%) và M8 (90%) chỉ lệch 4% ngang nhưng lệch 38%
 * dọc. Nhúc một con số dọc là hai nhãn chồng nhau ở bản rộng.
 */
export const REGION_SPOTS = [
  { left: 10, top: 70 },
  { left: 24, top: 38 },
  { left: 40, top: 66 },
  { left: 52, top: 30 },
  { left: 64, top: 62 },
  { left: 74, top: 26 },
  { left: 86, top: 58 },
  { left: 90, top: 20 },
] as const;

/** Một nút chặng trên bản đồ. */
export type Region = {
  /** Tên ẩn dụ của artboard, hoặc tên chặng nếu giáo trình lệch số chặng. */
  name: string;
  /** "M1 · Tiến trình và subprocess · 7 bài" — đếm từ giáo trình. */
  meta: string;
  /** Liên kết THẬT tới bài đầu chặng. */
  href: string;
  /** Nhãn đầy đủ cho trình đọc màn hình. */
  ariaLabel: string;
  left: number;
  top: number;
};

/**
 * Dựng tám nút từ chính giáo trình đang render.
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
  // Tên ẩn dụ chỉ dùng khi giáo trình còn ĐÚNG tám chặng theo đúng thứ tự.
  const poetic = list.length === REGION_NAMES.length;
  const out: Region[] = [];
  let flat = 0;
  for (let i = 0; i < list.length; i += 1) {
    const stage = list[i];
    const count = stage.lessons.length;
    const title = stage.title.trim();
    const name = poetic ? REGION_NAMES[i] : title;
    const meta = poetic ? `${title} · ${count} bài` : `${count} bài`;
    // Giáo trình dài hơn bảng vị trí thì rải nốt theo bước đều, đừng ném.
    const spot = REGION_SPOTS[i] ?? {
      left: Math.round(((i + 0.5) / Math.max(list.length, 1)) * 100),
      top: i % 2 === 0 ? 66 : 30,
    };
    out.push({
      name,
      meta,
      href: `${lessonUrl}?lesson=${flat}`,
      // Nhãn nói rõ BẤM VÀO THÌ ĐI ĐÂU. "mở bài đầu chặng" là phần mà người
      // dùng chuột đọc được bằng vị trí nút, còn trình đọc màn hình thì không.
      ariaLabel: `${name} — ${meta}, mở bài đầu chặng`,
      left: spot.left,
      top: spot.top,
    });
    flat += count;
  }
  return out;
}

/** Câu chữ quanh bản đồ. */
export const MAP_COPY = {
  /** Nhãn nhỏ trên khung bản đồ. */
  label: 'Bản đồ thế giới',
} as const;

/*
 * KHÔNG CÓ `caption`, và đây là chỗ dễ thêm lại nhất nên phải nói rõ vì sao.
 *
 * Artboard viết "Nét đặc là đoạn bạn đã đi, nét chấm là đoạn chưa học. Chặng nào
 * cũng mở được, cứ bắt đầu từ chỗ bạn muốn." Nửa ĐẦU đã bỏ từ trước: trang này
 * không đọc tiến độ của ai nên đó là chú giải cho một thứ không có trên hình. Nửa
 * SAU ("Chặng nào cũng vào được — bấm vào một chặng là mở bài đầu của chặng đó")
 * nay cũng bỏ: nó đúng sự thật, nhưng tám nút trên hình đều là liên kết thực và mọi
 * nút đã mang `ariaLabel` kết thúc bằng "mở bài đầu chặng" — ngưệi dùng chuột thấy
 * con trỏ đổi, trình đọc màn hình đọc được nhãn. Một dòng chữ lặp lại điều cả hai
 * đã biết là văn kể lể, không phải khả năng tiếp cận.
 */

/* ═══ Hoạt ảnh ═════════════════════════════════════════════════════════
 *
 * Luật, theo design-system-v2 (thang chuyển động 3 bậc 200 / 320 / 450 ms):
 *  · CHỈ `transform` và `opacity` — hai thứ trình duyệt chạy được trên lớp
 *    composite, không phải tính lại layout.
 *  · TRẠNG THÁI NGHỈ TRONG CSS LÀ TRẠNG THÁI CUỐI (hiện rõ, không dịch). Mọi
 *    đường hỏng — không có WAAPI, animation bị cancel, JS lỗi, người dùng xin
 *    giảm chuyển động — đều dừng ở chỗ an toàn: bản đồ hiện đủ. Khuôn này lấy
 *    từ `components/python-studio/intro/BookIntro.tsx`.
 *  · `prefers-reduced-motion: reduce` ⇒ KHÔNG có bước nào, không phải "bước
 *    ngắn hơn".
 */

/** Một bước cho `Element.animate(keyframes, options)`. */
export type MapStep = {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
};

/** Giãn cách giữa hai nút liền nhau (ms). */
export const REGION_STAGGER_MS = 60;

/**
 * Bước hiện ra của nút chặng thứ `index`, hoặc `null` nếu không được chạy.
 *
 * `fill: 'backwards'` để lúc animation còn đang chờ `play()` thì nút đứng ở
 * khung ĐẦU, không chớp một nhịp; không dùng `forwards` vì khung cuối ĐÃ LÀ
 * trạng thái nghỉ của CSS, giữ thêm chỉ để lại một style thừa trên phần tử.
 */
export function regionStep(index: number, reduced: boolean): MapStep | null {
  if (reduced) return null;
  return {
    keyframes: [
      { opacity: 0, transform: 'translate3d(0, 10px, 0) scale(0.96)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
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
 * Bước hiện ra của phần trang trí (lưới + đường đi).
 *
 * Chỉ `opacity`: đường đi là một `path` SVG, vẽ dần nó phải chạy
 * `stroke-dashoffset` — thuộc tính đó buộc trình duyệt vẽ lại từng khung hình,
 * và nó không nằm trong hai thuộc tính được phép.
 */
export function decorStep(reduced: boolean): MapStep | null {
  if (reduced) return null;
  return {
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    options: { duration: 450, easing: 'ease-out', fill: 'backwards' },
  };
}
