/**
 * LỚP CHUYỂN ĐỘNG của bản đồ thế giới — phần QUYẾT ĐỊNH, không có React, không
 * có DOM. `MapMotion.tsx` chỉ đọc kết quả của các hàm ở đây rồi gắn vào style.
 *
 * ── VẤN ĐỀ GỐC: KHÔNG CHẠM ĐƯỢC VÀO TRANH ─────────────────────────────
 *
 * Bức mặt cắt (~50 000 nét) vào trang bằng
 * `background-image: url('/map/world-map.svg')` trong `world-map.module.css`.
 * Một SVG nạp kiểu đó là MỘT TÀI LIỆU RIÊNG, không script, bị cách ly: CSS của
 * trang không khớp được selector nào bên trong, JS không `querySelector` vào
 * được. Nên lớp chuyển động KHÔNG THỂ làm nét vách lay, không thể cho dòng nước
 * trong tranh chảy. (Cùng một bức tường đã trả giá ở `figure-motion.ts`: 23
 * hình lý thuyết nhúng bằng `<img>` nên trang bài học không có cách nào dừng
 * hoạt hình bên trong, phải dựng lại cả file bằng Blob mới dừng được.)
 *
 * Nên lớp chuyển động là NHỮNG PHẦN TỬ RIÊNG CHỒNG LÊN tranh, định vị theo % của
 * cùng khung 1360 × 820. Hệ quả hiệu năng, và là lý do chọn hình này: tranh
 * KHÔNG BAO GIỜ được vẽ lại. Nó là lớp XA NHẤT, hệ số parallax = 0 — và đó
 * không phải thoả hiệp, đó chính là cái làm parallax đọc ra chiều sâu: vách ở
 * xa đứng yên, lớp khí trước nó trôi.
 *
 * ── BỐN HIỆU ỨNG, VÀ MỖI CÁI MANG THÔNG TIN GÌ ────────────────────────
 *
 *  1. `veil` × 4 — màn khí mỏng có hạt, một cái cho mỗi dải, dịch theo CUỘN với
 *     hệ số giảm dần theo độ sâu. THÔNG TIN: không gian ba chiều. Dải mặt đất ở
 *     gần mắt (ta đứng ở miệng vực nhìn vào) nên đi nhanh nhất; đáy vực là điểm
 *     xa nhất trên đường ngắm nên gần như đứng. Đứng yên khi không cuộn ⇒ giá
 *     bằng 0 lúc nghỉ.
 *  2. `shaft` — cột bụi rơi trong giếng nằm dưới mặt trời (`MAP_SUN.cx = 110`,
 *     giếng `x = 100`). THÔNG TIN: cột sáng trở thành một KHỐI KHÍ chứ không
 *     phải vệt phẳng (chiều sâu), và hướng trôi nói đường đi là XUỐNG.
 *  3. `seep` — các mạch rỉ dọc trôi xuống bể của M4. THÔNG TIN: hình bóng của
 *     M4 là "nhiều mạch rỉ vào một bể"; chuyển động nói ra cái NHIỀU → MỘT đó,
 *     và nói nước đi xuống.
 *  4. `lake` — nét sóng ngang trên mặt hồ M8 trôi ngang rất chậm. THÔNG TIN:
 *     chỗ này là CHẤT LỎNG, không phải đá — thứ duy nhất phân biệt đáy vực với
 *     vách, mà tranh nét đơn sắc rất khó nói.
 *  5. `thread` — MỘT LẦN lúc nạp: sợi sáng vẽ dần xuống năm giếng bằng
 *     `stroke-dashoffset`, so le từ trái sang. THÔNG TIN: năm lối đi THẲNG từ
 *     mặt đất xuống năm gian (đúng nghĩa `MAP_WELLS`: "vào đâu cũng được"), và
 *     hướng vẽ từ trên xuống nói thứ tự của hành trình.
 *
 * KHÔNG CÓ: lấp lánh ngẫu nhiên, đèn nhấp nháy, nét vách rung. Đó là trang trí.
 *
 * ── VÌ SAO LÀ FILE RIÊNG KHÔNG IMPORT GÌ ──────────────────────────────
 * Bộ test chạy `node --test` thuần (`npm run test:unit`) và runner đó không
 * phân giải alias `@/…`, cũng không bóc JSX. Tiền lệ: `figure-motion.ts`,
 * `editor-load-gate.ts`, `so-quy-replay.ts`.
 */

/** Bốn dải của mặt cắt. Bản sao của `BandId` ở `world-map.ts` — xem chú thích
 *  "không import gì" ở trên; `map-motion.test.mjs` so hai danh sách, lệch là đỏ. */
export type MotionBandId = 'surface' | 'shallow' | 'deep' | 'floor';

export const MOTION_BANDS: readonly MotionBandId[] = ['surface', 'shallow', 'deep', 'floor'];

/**
 * Khung của bức vẽ. Phải KHỚP `MAP_FRAME` ở `world-map.ts`: lớp chuyển động đặt
 * mọi phần tử bằng % của khung này, mà tranh được căng đúng `100% 100%` vào một
 * hộp `aspect-ratio: 1360/820` — nên hai bên khớp CHÍNH XÁC, không phải gần đúng.
 */
export const MOTION_FRAME = { width: 1360, height: 820 } as const;

/**
 * ── KHÔNG MỘT TOẠ ĐỘ NÀO CỦA BỨC TRANH ĐƯỢC CHÉP VÀO FILE NÀY ─────────
 *
 * Bản đầu giữ một `BAND_TOP_Y = {surface: 238, shallow: 390, …}` — bản sao
 * ĐỒNG BỘ TAY của bốn con số nằm trong thân `horizon()/y_shallow()/y_deep()/
 * y_floor()` của `build_map.py`, kèm một ca test đọc ngược file Python để chặn
 * hai bên lệch. Ca test đã bắt được ngay: bức tranh được vẽ lại trong CÙNG buổi
 * chiều và địa tầng dời thành 128/378/508/716, còn hộp của M4 dời từ
 * `[470, 370, 420, 130]` sang `[470, 362, 420, 150]`. Bản sao sống được đúng
 * hai giờ.
 *
 * Nên bản này BỎ HẲN cách đó, chứ không chỉ sửa bốn con số. Bài học không phải
 * "nhớ đồng bộ": nó là một bản sao KHÔNG CẦN THIẾT, vì lớp chuyển động không
 * thật sự cần biết địa tầng nằm ở đâu. Hai chỗ từng cần nó, nay lấy từ nguồn
 * dùng chung:
 *  · Màn khí chia khung thành BỐN PHẦN ĐỀU (`veilBox`), không theo mép dải.
 *    Parallax cần bốn lớp XẾP TỪ TRÊN XUỐNG để mắt đọc ra chiều sâu; nó không
 *    cần mép lớp trùng mép đá. Lệch vài chục đơn vị là không thấy được: độ mờ
 *    bốn lớp chỉ cách nhau 0,04 và mép lớp nào cũng trùm qua lớp kế 30 đơn vị.
 *  · Cột bụi nhận hai mốc y làm ĐỐI SỐ (`shaftBox`), và `MapMotion.tsx` tính
 *    chúng từ `REGION_LAYOUT` — mảng mà `build_map.py` CŨNG đọc (`read_ts()`),
 *    nên hai bên không thể lệch nhau nữa.
 *
 * Giá phải trả, ghi rõ: lớp chuyển động giờ không biết mép đá ở đâu, nên nếu
 * sau này có hiệu ứng THẬT SỰ phải bám mép đá (ví dụ nét vách lay theo đúng
 * đường lượn) thì phải xin `BAND_TOP_Y` trong `world-map.ts` cho cả Python đọc
 * — xem `hop-dong-motion.md` mục 1. Đừng chép lại bốn con số.
 */

/**
 * ĐỘ SÂU QUY CHUẨN của mỗi dải: 0 = gần mắt nhất, 1 = xa nhất.
 *
 * Vì sao mặt đất là 0 chứ không phải 1: người xem đứng ở MIỆNG vực nhìn vào,
 * nên mép trên của vết cắt là chỗ gần mắt nhất, còn đáy vực là điểm xa nhất
 * trên đường ngắm. Đây cũng đúng chiều với cách chính bức tranh nói chiều sâu
 * (`ky-thuat-ban-do.md` mục 4: "dãy càng xa thì nét càng nhạt và thưa" — mật độ
 * nét tăng dần xuống đáy vì đáy ở xa).
 */
export const BAND_DEPTH: Record<MotionBandId, number> = {
  surface: 0,
  shallow: 1 / 3,
  deep: 2 / 3,
  floor: 1,
};

/**
 * Biên độ parallax lớn nhất của lớp gần nhất, tính bằng px.
 *
 * 12px chứ không phải 60px: WCAG 2.3.3 (Animation from Interactions) gọi thẳng
 * tên parallax scrolling là hoạt ảnh thường KHÔNG thiết yếu, và W3C ghi phản ứng
 * của người có rối loạn tiền đình là choáng, nôn, đau đầu. Biên độ ở đây phải đủ
 * để MẮT đọc ra chiều sâu mà không đủ để thành một chuyến tàu. 12px ≈ 1,5% chiều
 * cao của khung 820 — dưới một dòng chữ.
 */
export const PARALLAX_MAX_PX = 12;

/**
 * Hệ số dịch của một lớp theo độ sâu: 1 ở lớp gần nhất, 0 ở lớp xa nhất.
 *
 * Tuyến tính, không bình phương: parallax ở đây có BỐN lớp rời nhau, nên thứ
 * mắt đọc là THỨ TỰ bốn hệ số, không phải hình dáng đường cong. Tuyến tính cho
 * bốn khoảng cách đều nhau, tức thứ tự rõ nhất trên một biên độ chỉ 12px.
 */
export function veilFactor(depth: number): number {
  if (!Number.isFinite(depth)) return 0;
  const d = depth < 0 ? 0 : depth > 1 ? 1 : depth;
  return 1 - d;
}

export type ParallaxView = {
  /** `getBoundingClientRect().top` của khung bản đồ. */
  mapTop: number;
  /** Chiều cao khung bản đồ (px). */
  mapHeight: number;
  /** Chiều cao khung nhìn (`innerHeight`). */
  viewHeight: number;
};

/**
 * Tiến trình của bản đồ qua khung nhìn: 0 lúc mép TRÊN của bản đồ vừa chạm mép
 * DƯỚI khung nhìn (bản đồ còn ở dưới, chưa thấy), 1 lúc mép DƯỚI của bản đồ vừa
 * rời mép TRÊN khung nhìn (đã trôi qua hết).
 *
 * Mẫu số là `viewHeight + mapHeight` chứ không phải `viewHeight`: đó là tổng
 * đường mà bản đồ đi từ "chưa thấy" tới "không thấy nữa". Dùng `viewHeight` thì
 * bản đồ cao hơn khung nhìn sẽ cho tiến trình > 1 ngay lúc vừa hiện ra.
 */
export function viewProgress(view: ParallaxView): number {
  const span = view.viewHeight + view.mapHeight;
  if (!(span > 0) || !Number.isFinite(view.mapTop)) return 0.5;
  const raw = (view.viewHeight - view.mapTop) / span;
  return raw < 0 ? 0 : raw > 1 ? 1 : raw;
}

/**
 * Độ dịch dọc (px) của màn khí ở độ sâu `depth`, âm là đi LÊN.
 *
 * DẤU: cuộn xuống ⇒ nội dung đi lên ⇒ lớp GẦN phải đi lên NHIỀU HƠN lớp xa (đó
 * là định nghĩa của parallax chuyển động). Tranh là lớp xa nhất và hệ số 0, nên
 * mọi màn khí đi lên nhiều hơn tranh.
 *
 * GỐC 0 Ở GIỮA: `progress = 0.5` (bản đồ ở giữa khung nhìn) cho dịch bằng 0 —
 * đúng trạng thái NGHỈ của CSS. Nên mọi đường hỏng (JS không chạy, animation bị
 * huỷ, xin giảm chuyển động) đều dừng ở một bản đồ các lớp đặt đúng chỗ, không
 * phải ở một bản đồ bị kéo lệch 12px.
 */
export function parallaxShift(view: ParallaxView, depth: number): number {
  const centered = viewProgress(view) * 2 - 1;
  const px = -centered * PARALLAX_MAX_PX * veilFactor(depth);
  // Chuẩn hoá `-0` về `0`. Không phải chuyện mỹ học: `Object.is(-0, 0)` là
  // false nên `assert.equal` của mọi ca "trạng thái nghỉ phải bằng 0" sẽ trượt
  // trên một giá trị ĐÚNG; và chuỗi `translate3d(0, -0.00px, 0)` gửi vào CSSOM
  // là một chuỗi khác với trạng thái nghỉ, đủ để trình duyệt giữ lớp hợp ảnh.
  return px === 0 ? 0 : px;
}

/**
 * Bề rộng KHỐI nhỏ nhất còn chạy lớp chuyển động.
 *
 * 1100 = đúng mốc gãy `@container (max-width: 1099px)` của
 * `world-map.module.css`. Dưới mốc đó bản đồ KHÔNG còn là bức mặt cắt: `.decor`
 * bị `display: none`, mỗi dải thành một khối ngang và mỗi gian tải ô crop
 * riêng. Lớp chuyển động định vị theo khung 1360 × 820 nên ở bố cục đó nó không
 * chỉ "nặng" — nó SAI CHỖ. Vì vậy điện thoại không giảm hiệu ứng, nó tắt hẳn.
 * `map-motion.test.mjs` đọc con số từ CSS và so, đổi một bên là đỏ.
 */
export const MOTION_MIN_WIDTH_PX = 1100;

/**
 * Ba trạng thái của lớp chuyển động:
 *  `off`   — không dựng gì, không gắn listener nào. Người xem thấy đúng bức tranh.
 *  `still` — các lớp HIỆN nhưng không có gì chạy: bản đồ đầy đủ, đứng yên.
 *  `on`    — chạy.
 */
export type MotionMode = 'off' | 'still' | 'on';

export type MotionInput = {
  /** Người dùng bật giảm chuyển động ở mức hệ điều hành. */
  reduced: boolean;
  /** Bề rộng của KHỐI bản đồ (không phải của màn hình — xem luật 5 của CSS). */
  width: number;
};

/**
 * Lớp chuyển động chạy hay không.
 *
 * THỨ TỰ HAI ĐIỀU KIỆN LÀ CÓ CHỦ Ý, và đây là chỗ dễ viết sai: bề rộng xét
 * TRƯỚC. Khối hẹp + xin giảm chuyển động phải cho `off`, KHÔNG phải `still` —
 * vì ở bố cục hẹp các lớp đặt theo khung 1360 × 820 sẽ nằm sai chỗ, nên "hiện
 * mà đứng yên" là hiện một lớp rác đè lên tám liên kết. Đảo hai nhánh thì chính
 * người xin giảm chuyển động, trên điện thoại, nhận bản đồ hỏng.
 */
export function motionMode(input: MotionInput): MotionMode {
  if (!Number.isFinite(input.width) || input.width < MOTION_MIN_WIDTH_PX) return 'off';
  if (input.reduced) return 'still';
  return 'on';
}

/** Lớp chuyển động có phần tử nào trong DOM hay không. */
export function motionVisible(mode: MotionMode): boolean {
  return mode !== 'off';
}

/** Có cái gì đang chạy liên tục hay không — tức có đáng gắn listener cuộn không. */
export function motionAnimates(mode: MotionMode): boolean {
  return mode === 'on';
}

/**
 * MÀU của lớp chuyển động. Ở TS, không ở CSS — hai lý do, cả hai là bẫy đã có
 * trong repo:
 *  1. `npm run lint:tokens` cấm mã màu trong mọi `*.module.css`.
 *  2. Quan trọng hơn: KHÔNG được dùng token `--ds-*`. Bức tranh là một file SVG
 *     cố định, màu của nó KHÔNG đổi theo chế độ tối — chính `MAP_PALETTE.paper`
 *     có chú thích "không lấy `--ds-paper`: ở chế độ tối token đó thành xanh
 *     than và mỗi khe giữa hai dải thành một vệt đen cắt ngang bản đồ". Lớp
 *     chuyển động chồng lên tranh đó nên nó phải đứng NGOÀI chế độ tối y như
 *     tranh. Lấy `--ds-paper` cho cột sáng là ở chế độ tối cột sáng thành cột
 *     MỰC.
 *
 * Bốn giá trị lấy từ `MAP_PALETTE` (`world-map.ts`) để lớp phủ và tranh là một
 * thứ ánh sáng: `light.ray`, `light.halo`, `flow`, `rock.veil`.
 */
export const MOTION_PALETTE = {
  /** Hạt bụi trong màn khí — `MAP_PALETTE.rock.veil`, màn phủ nhạt ở xa. */
  mote: '#D3C3A1',
  /** Cột sáng dưới mặt trời — `MAP_PALETTE.light.ray`. */
  beam: '#F3E2B0',
  /** Nước: mạch rỉ của M4 và mặt hồ M8 — `MAP_PALETTE.light.halo`, sáng nhất. */
  water: '#FBF3DA',
  /** Sợi sáng xuống giếng — `MAP_PALETTE.flow`, cùng tông mạch sáng của tranh. */
  thread: '#E7D9F3',
} as const;

/**
 * Tên các thuộc tính CSS tuỳ biến mà `MapMotion.tsx` ĐẶT BẰNG JS lúc chạy.
 *
 * Vì sao đặt bằng JS mà không viết thẳng vào `map-motion.module.css`: xem
 * `MOTION_PALETTE`. Vì sao không dùng `style={{…}}` trong TSX: SSR tuần tự hoá
 * style nội tuyến thành thuộc tính `style="…"`, và đó là một trong hai nguyên
 * nhân `style-src 'unsafe-inline'` chưa bỏ được (bẫy trong `AGENTS.md`). Đặt
 * bằng CSSOM (`el.style.setProperty`) lúc chạy thì HTML do server dựng không
 * mang `style=` nào, và CSP không chặn CSSOM.
 */
export const MOTION_VAR = {
  mote: '--map-mote',
  beam: '--map-beam',
  water: '--map-water',
  thread: '--map-thread',
} as const;

/** Cặp (tên thuộc tính, giá trị) để `setProperty` lần lượt. */
export function motionVars(): readonly (readonly [string, string])[] {
  return [
    [MOTION_VAR.mote, MOTION_PALETTE.mote],
    [MOTION_VAR.beam, MOTION_PALETTE.beam],
    [MOTION_VAR.water, MOTION_PALETTE.water],
    [MOTION_VAR.thread, MOTION_PALETTE.thread],
  ];
}

/**
 * ── SỢI SÁNG VẼ DẦN XUỐNG GIẾNG (chạy MỘT LẦN) ────────────────────────
 *
 * `stroke-dashoffset` là thuộc tính duy nhất ở đây KHÔNG phải `transform`/
 * `opacity`, nên nó buộc trình duyệt vẽ lại từng khung. Chấp nhận được vì:
 * chạy MỘT lần lúc nạp, trên đúng NĂM `<path>` mảnh của một SVG rỗng chồng lên
 * tranh — không phải trên 877 KB ảnh nền, và không lặp.
 *
 * Mẹo `pathLength="100"`: khai bề dài đường là 100 thì `stroke-dasharray: 100`
 * và `stroke-dashoffset: 100 → 0` đúng cho MỌI đường, không cần
 * `getTotalLength()`. Nên hiệu ứng này không cần đo DOM, và nó kiểm được bằng
 * `node --test`.
 */
export const THREAD_PATH_LENGTH = 100;

/** Thời gian vẽ một sợi (ms). 900ms cho một nét dài ~500 đơn vị: đủ chậm để đọc
 *  ra HƯỚNG đi xuống, đủ nhanh để xong trước khi người ta kịp chọn một gian. */
export const THREAD_DURATION_MS = 900;

/** Giãn cách giữa hai sợi liền nhau (ms). 110ms — nhịp gấp đôi
 *  `REGION_STAGGER_MS` (60ms) của tám tấm nhãn, để hai lượt hiện ra không bị
 *  đọc thành một. */
export const THREAD_STAGGER_MS = 110;

/**
 * Độ trễ của sợi thứ `index`. Cộng thêm `decorStep` (450ms, nền hiện ra xong)
 * để sợi không vẽ trên một bức tranh còn đang mờ dần vào.
 */
export const THREAD_LEAD_MS = 450;

export function threadDelayMs(index: number): number {
  if (!Number.isInteger(index) || index < 0) return THREAD_LEAD_MS;
  return THREAD_LEAD_MS + index * THREAD_STAGGER_MS;
}

/** Tổng thời gian cả năm sợi vẽ xong — dùng để khẳng định "không quá 2 giây". */
export function threadTotalMs(count: number): number {
  if (!Number.isInteger(count) || count <= 0) return 0;
  return threadDelayMs(count - 1) + THREAD_DURATION_MS;
}

/**
 * ── HÌNH HỌC CỦA BA LỚP CÓ KẾT CẤU ───────────────────────────────────
 *
 * Hộp của mỗi lớp theo % của khung 1360 × 820, để `map-motion.module.css` không
 * phải mang một con số nào tự nghĩ ra. Mọi số nguồn đều đọc từ `world-map.ts`
 * (`MAP_WELLS`, `REGION_LAYOUT.box`, `MAP_SUN`) — xem `hop-dong-motion.md`.
 */
export type MotionBox = { left: number; top: number; width: number; height: number };

/** Đổi một hộp trong hệ 1360 × 820 thành % của khung. */
export function boxToPercent(x: number, y: number, w: number, h: number): MotionBox {
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return {
    left: round((x / MOTION_FRAME.width) * 100),
    top: round((y / MOTION_FRAME.height) * 100),
    width: round((w / MOTION_FRAME.width) * 100),
    height: round((h / MOTION_FRAME.height) * 100),
  };
}

/**
 * Hộp của màn khí ở một dải: từ mép trên của dải tới mép trên của dải dưới (dải
 * đáy chạy hết khung): KHUNG CHIA ĐỀU theo số dải, nới thêm `bleed` ở mép giữa
 * hai lớp.
 *
 * Vì sao chia ĐỀU chứ không theo mép dải trong tranh — xem khối "không một toạ
 * độ nào của bức tranh được chép vào file này" ở đầu file. Ngắn gọn: parallax
 * cần bốn lớp XẾP TỪ TRÊN XUỐNG, không cần mép lớp trùng mép đá; còn một bản
 * sao toạ độ của địa tầng thì sống được đúng hai giờ.
 *
 * `bleed` vẫn cần, và cần vì một lý do KHÁC lý do ban đầu (trùm qua mép lượn):
 * hai màn khí kề nhau dịch những lượng KHÁC NHAU khi cuộn, nên nếu chúng giáp
 * nhau đúng một đường thì khe giữa chúng hở ra đúng bằng hiệu hai độ dịch —
 * một vạch trần chạy ngang bức tranh. 30 > 2 × PARALLAX_MAX_PX (24), nên khe
 * không bao giờ hở, kể cả khi hai lớp kề nhau chạy về hai phía.
 */
export const BAND_BLEED_Y = 30;

export function veilBox(band: MotionBandId): MotionBox {
  const i = MOTION_BANDS.indexOf(band);
  if (i < 0) return boxToPercent(0, 0, MOTION_FRAME.width, 0);
  const step = MOTION_FRAME.height / MOTION_BANDS.length;
  // Hai lượt kẹp này LÀ cái làm lớp đầu chạm mép trên khung và lớp cuối chạm
  // mép dưới: nới của lớp đầu chạy âm, nới của lớp cuối chạy quá khung, và kẹp
  // cắt đúng về mép. (Bản trước còn thêm hai nhánh `i === 0 ? 0 : …` cho việc
  // này — gỡ ra vì chúng là nhánh CHẾT: ca test "phủ kín khung" vẫn xanh khi
  // gỡ, nên chúng chỉ là hai nhánh không ai kiểm.)
  const y0 = Math.max(0, i * step - BAND_BLEED_Y);
  const y1 = Math.min(MOTION_FRAME.height, (i + 1) * step + BAND_BLEED_Y);
  return boxToPercent(0, y0, MOTION_FRAME.width, y1 - y0);
}

/**
 * HAI LỚP NƯỚC BÁM VÀO MÃ GIAN, KHÔNG VÀO TOẠ ĐỘ.
 *
 * Bản đầu của file này giữ hẳn hai hộp đã tính sẵn
 * (`SEEP_BOX = boxToPercent(470, 370, 420, 130)`). Đã bỏ, vì trong CHÍNH buổi
 * chiều dựng nó, agent vẽ tranh dời hộp của M4 thành `[470, 362, 420, 150]` —
 * tức một bản sao toạ độ sống được đúng hai giờ. Nay `MapMotion.tsx` đọc
 * `REGION_LAYOUT.find(r => r.key === SEEP_REGION).box` rồi đưa qua
 * `boxToPercent`, nên KHÔNG CÒN con số nào để lệch: dời gian là lớp nước dời
 * theo, không cần ai nhớ.
 *
 * Còn lại ở đây là hai khẳng định không phải toạ độ, và chúng mới là thứ đáng
 * viết ra: nước rỉ thuộc về gian "nhiều mạch rỉ vào một bể", mặt hồ thuộc về
 * gian "hang hồ ngầm" (xem `silhouette` của chúng trong `REGION_LAYOUT`).
 */
export const SEEP_REGION = 'M4';
export const LAKE_REGION = 'M8';

/**
 * Bề rộng cột bụi (đơn vị khung). 52 chứ không phải 2 (bề rộng nét giếng): cột
 * sáng phải rộng đủ để đọc ra là một KHỐI KHÍ chứ không phải một vệt kẻ, nhưng
 * không rộng tới mức chạm hộp của gian bên cạnh.
 */
export const SHAFT_WIDTH = 52;

/**
 * Giếng nào mang cột bụi: giếng có đầu GẦN MẶT TRỜI NHẤT.
 *
 * Đây là một luật, không phải một lựa chọn thẩm mỹ: `MAP_SUN` là nguồn sáng duy
 * nhất của bức vẽ, nên giếng gần nó nhất là giếng duy nhất có lý do để có ánh
 * sáng rọi vào. Tính bằng hàm chứ không ghi cứng `x = 100` để agent vẽ tranh
 * dời mặt trời hay dời giếng thì cột bụi đi theo.
 */
export function nearestWellX(sunCx: number, wellXs: readonly number[]): number {
  let best = Number.NaN;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const x of wellXs) {
    const gap = Math.abs(x - sunCx);
    if (gap < bestGap) {
      bestGap = gap;
      best = x;
    }
  }
  return best;
}

/**
 * Mốc `y` dưới cùng của những gian thuộc một dải — tức CHÂN của chúng.
 *
 * Dùng để suy ra mặt đất mà không cần biết `horizon()` của `build_map.py`: ba
 * gian mặt đất là ba công trình ĐỨNG TRÊN đất, nên chân của chúng LÀ mặt đất.
 * Nhận mảng làm đối số (không import `REGION_LAYOUT`) để hàm kiểm được bằng
 * `node --test` — xem chú thích "không import gì" ở đầu file.
 */
export type BandedBox = { band: MotionBandId; box: readonly [number, number, number, number] };

export function bandFootY(entries: readonly BandedBox[], band: MotionBandId): number {
  let y = Number.NaN;
  for (const e of entries) {
    if (e.band !== band) continue;
    const foot = e.box[1] + e.box[3];
    if (Number.isNaN(y) || foot > y) y = foot;
  }
  return y;
}

/** Mốc `y` trên cùng của những gian thuộc một dải — tức ĐỈNH của dải đó. */
export function bandHeadY(entries: readonly BandedBox[], band: MotionBandId): number {
  let y = Number.NaN;
  for (const e of entries) {
    if (e.band !== band) continue;
    if (Number.isNaN(y) || e.box[1] < y) y = e.box[1];
  }
  return y;
}

/**
 * Hộp của cột bụi: từ `topY` (mặt đất) xuống `bottomY`.
 *
 * Hai mốc là ĐỐI SỐ, không phải hằng trong file này — `MapMotion.tsx` tính
 * chúng từ `REGION_LAYOUT` bằng `bandFootY`/`bandHeadY`. Đó là mảng mà
 * `build_map.py` CŨNG đọc (`read_ts()`), nên cột bụi không thể lệch khỏi tranh.
 *
 * Vì sao dừng ở đỉnh dải SÂU chứ không chạy tới đáy: ánh sáng từ miệng vực TẮT
 * DẦN theo độ sâu, và chỗ nó tắt là một thông tin — nó nói "dưới nữa thì không
 * còn ánh sáng nào từ trên xuống". Cho nó chạy tới đáy là nói ngược chính bức
 * tranh, vốn tối dần xuống đáy bằng mật độ nét.
 */
export function shaftBox(wellX: number, topY: number, bottomY: number): MotionBox {
  const y0 = Math.max(0, Math.min(topY, bottomY));
  const y1 = Math.min(MOTION_FRAME.height, Math.max(topY, bottomY));
  return boxToPercent(wellX - SHAFT_WIDTH / 2, y0, SHAFT_WIDTH, y1 - y0);
}

/**
 * ── KHÔNG VÒNG LẶP VÔ HẠN NÀO. MỘT LƯỢT, DƯỚI NĂM GIÂY, RỒI ĐỨNG ─────
 *
 * Bản thiết kế đầu của file này cho ba lớp kết cấu chạy `infinite` với chu kỳ
 * 19/23/31 giây. Đã bỏ, vì hai lý do, và lý do thứ hai mới là lý do thật:
 *
 * 1. WCAG 2.2.2 (Pause, Stop, Hide — mức A) đòi CÓ CÁCH DỪNG cho chuyển động
 *    (a) tự khởi động, (b) dài hơn năm giây, (c) chạy song song với nội dung
 *    khác. Một lớp bụi chạy vô hạn trúng cả ba, và điều khoản miễn duy nhất là
 *    "chuyển động thiết yếu cho hoạt động" — bụi không thiết yếu. Repo này đã
 *    trả giá đúng một lần cho điều khoản đó (`figure-motion.ts`: 23 hình lý
 *    thuyết lặp vô hạn trong `<img>`, phải dựng Blob mới dừng được). Giữ
 *    `infinite` ở đây là nợ lại một nút Dừng trên TRANG CHỦ.
 *    Cắt xuống dưới năm giây thì điều kiện (b) không còn, nên KHÔNG CẦN nút —
 *    rẻ hơn hẳn việc thêm một nút vào trang chủ.
 * 2. "Người học vào trang chủ để BẮT ĐẦU HỌC, không để xem phim." Chuyển động
 *    vô hạn nói ngược lại điều đó. Một lượt rồi đứng thì sau ~5 giây trang chủ
 *    có ĐÚNG KHÔNG animation nào đang chạy: không nhịp hợp ảnh, không giữ lớp
 *    GPU, không tốn pin ở một tab mở cả ngày.
 *
 * Và một lượt vẫn đủ MANG THÔNG TIN, vì mỗi lớp chỉ phải nói một câu: bụi rơi
 * một lượt xuống giếng là đã nói "cột này là khối khí, và đường đi là xuống";
 * nói lại câu đó mỗi 19 giây không thêm gì.
 *
 * `parallax` KHÔNG nằm trong giới hạn này: nó không tự khởi động, nó chạy theo
 * tay người cuộn. Nó thuộc WCAG 2.3.3 (Animation from Interactions, mức AAA),
 * và cửa `prefers-reduced-motion` ở `motionMode` là đúng cách W3C nêu để đạt.
 */
export const PASS_MS = { shaft: 3600, seep: 3800, lake: 4000 } as const;

/**
 * Trần cho MỌI hoạt ảnh TỰ KHỞI ĐỘNG của lớp này, tính CẢ độ trễ.
 *
 * Tính cả độ trễ là chỗ dễ sai: WCAG 2.2.2 đo "chuyển động kéo dài bao lâu" từ
 * lúc trang bắt đầu động, nên một lớp trễ 3 giây rồi chạy 4 giây là một trang
 * còn động ở giây thứ 7. `map-motion.test.mjs` cộng `delay + duration` cho từng
 * lớp và đòi mọi tổng phải DƯỚI con số này.
 *
 * Ba con số của `PASS_MS` đã phải HẠ một lượt vì chính ca test đó: bản đầu đặt
 * 3800/4200/4600 và lớp mặt hồ cộng độ trễ 670ms ra 5 270ms — vượt trần mà tôi
 * vừa tự viết ở ngay trên. Ghi lại để thấy cái trần này không phải trang trí:
 * nó bắt được người đặt ra nó.
 */
export const MAX_AUTO_MOTION_MS = 5000;

/** Độ trễ của ba lớp kết cấu: vào sau khi nền hiện xong (`decorStep` = 450ms),
 *  so le để ba lớp không kết thúc cùng một nhịp. */
export const PASS_DELAY_MS = { shaft: 450, seep: 560, lake: 670 } as const;

/** Tổng thời gian một lớp kết cấu còn động, tính từ lúc bắt đầu nạp. */
export function passTotalMs(layer: keyof typeof PASS_MS): number {
  return PASS_DELAY_MS[layer] + PASS_MS[layer];
}
