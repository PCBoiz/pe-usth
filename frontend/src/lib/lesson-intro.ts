/**
 * Hoạt cảnh MỞ SÁCH ở màn lý thuyết — phần QUYẾT ĐỊNH, không có React.
 *
 * ===========================================================================
 * VÌ SAO CHỈ CÓ NỬA ĐẦU CỦA CHUYỂN CẢNH (mở sách), KHÔNG CÓ NỬA SAU (gập sách
 * → ngẩng lên → hiện IDE)
 * ===========================================================================
 * Nguyên mẫu dựng đủ bốn pha: mở sách → đọc → gập sách → ngẩng lên nhìn màn
 * hình. Đếm lại luồng màn THẬT của một bài có lý thuyết (T03) bằng chính
 * `buildScreens` trong lib/studio-lesson.ts:
 *
 *   theory → brief → explain → predict → match → fill → spotError → debug
 *          → selfExplain → sandbox → recap            (11 màn)
 *
 * Lý thuyết là màn 1. Viết code (`sandbox`) là màn 10. GIỮA chúng có TÁM màn
 * khác: đề bài, giải thích từng dòng, dự đoán, bốn mini-game, tự giải thích.
 * Nối "gập sách" với "ngẩng lên thấy IDE" là kể một câu nhân–quả SAI — nó nói
 * "đọc xong là viết code", trong khi đọc xong là còn tám màn nữa. Tách đôi ra
 * (gập lúc rời màn 1, ngẩng lúc vào màn 10) thì mất luôn phần nhân–quả: còn
 * lại hai cú 400ms chẳng liên quan gì nhau, tức chuyển động trang trí thuần.
 * Sản phẩm không được nói dối về chính luồng của nó, nên nửa sau bị bỏ.
 *
 * Cái nửa đầu làm được, và làm thật, là ĐÁNH DẤU CHẾ ĐỘ: màn lý thuyết là màn
 * DUY NHẤT trong bài không đòi thao tác — mười màn còn lại đều đòi. Mở quyển
 * sách ra là câu "chỗ này bạn chỉ đọc" nói bằng hình, và nó khớp với quyết định
 * đã có trong repo là cho riêng màn lý thuyết chạy ở cột rộng (`wide` trong
 * StudioLesson).
 *
 * Lúc vào màn `sandbox` vẫn có một dấu hiệu, nhưng là dấu hiệu RIÊNG và ngắn
 * (240ms, xem SANDBOX_CUE_*): khung soạn thảo sáng lên. Không sách, không 3D —
 * lúc đó trong tay người học không còn quyển sách nào để gập.
 *
 * ===========================================================================
 * VÌ SAO LÀ FILE RIÊNG, KHÔNG IMPORT GÌ THEO ALIAS '@/…'
 * ===========================================================================
 * Bộ test chạy bằng `node --test` thuần (script `test:unit`); runner đó không
 * phân giải alias và không bóc được JSX. Tiền lệ: lib/figure-motion.ts,
 * lib/editor-load-gate.ts, lib/feedback-link.ts.
 */

// File này KHÔNG import gì, kể cả theo đường dẫn tương đối: `node --test` chạy
// ESM thật nên nó đòi phần mở rộng `.ts` trong đường dẫn, mà `.ts` trong import
// lại cần bật `allowImportingTsExtensions` trong tsconfig dùng chung. Vì vậy
// `sessionStorageOrNull` (đã có trong lib/ide-handoff.ts, và KHÔNG được viết
// bản thứ hai — lý do nó tồn tại là chỉ ĐỌC window.sessionStorage cũng ném
// SecurityError khi trình duyệt chặn dữ liệu trang) được chỗ gọi lấy trực tiếp
// từ '@/lib/ide-handoff'; ở đây chỉ nhận `storage` qua tham số.

/** Phần của Storage mà ở đây cần — để test truyền được bộ nhớ giả. */
export type IntroStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Khoá ghi nhớ "đã xem hoạt cảnh mở sách trong phiên này".
 *
 * `sessionStorage` chứ không `localStorage`: "mỗi phiên một lần" là đúng liều.
 * Với `localStorage` thì người học chỉ thấy hoạt cảnh đúng một lần trong đời.
 *
 * ĐỔI KHOÁ (v2, v3…) khi đổi thiết kế, đừng xoá khoá cũ.
 */
export const INTRO_SEEN_KEY = 'pe.lessonIntro.v1';

/** Khoá riêng cho dấu hiệu vào màn sandbox — nó là cảnh KHÁC, nhớ riêng. */
export const SANDBOX_CUE_KEY = 'pe.sandboxCue.v1';

/**
 * Bề ngang tối thiểu để dựng trải sách hai trang.
 *
 * Đo trong nguyên mẫu ở 390×844: trải hai trang còn 342×193 px, mỗi trang rộng
 * 142 px, chữ 12 px, nội dung 1066 px cuộn trong ô cao 161 px — không đọc nổi.
 * Trải sách hai trang không có cách nào thu nhỏ cho vừa điện thoại, nên dưới
 * mức này KHÔNG dựng sách; rơi về bản rút gọn.
 */
export const BOOK_MIN_WIDTH_PX = 861;

/**
 * Ba khai báo CSS mà cảnh sách KHÔNG chạy được nếu thiếu.
 *
 * Kiểm NĂNG LỰC chứ không dò tên trình duyệt: Safari/WebKit là vùng hay khác
 * Chrome ở đúng hai thứ `preserve-3d` và `backface-visibility`, mà bản này
 * CHƯA được đo trên Safari. Dò tên trình duyệt thì sai cả hai chiều (Safari
 * mới có thể đã đúng; một engine lạ có thể vẫn sai) — hỏi thẳng trình duyệt là
 * câu hỏi đúng.
 */
export const BOOK_3D_DECLARATIONS = [
  'transform-style: preserve-3d',
  'backface-visibility: hidden',
  'perspective: 2400px',
] as const;

/** Trình duyệt dựng được cảnh 3D hay không. `probe` = CSS.supports. */
export function supportsBook3d(probe: (declaration: string) => boolean): boolean {
  try {
    return BOOK_3D_DECLARATIONS.every((d) => probe(d) === true);
  } catch {
    // CSS.supports ném lỗi (đối số không hợp lệ với engine đó) = coi như không
    // dựng được. Thoái lui bao giờ cũng an toàn hơn đoán.
    return false;
  }
}

/**
 * `full`  — chuỗi mở sách đầy đủ (860ms).
 * `short` — bản rút gọn: một cú opacity + translateY 240ms, không sách, không 3D.
 * `off`   — KHÔNG hoạt cảnh nào. Vào thẳng trạng thái cuối, không chớp.
 */
export type IntroMode = 'off' | 'short' | 'full';

export type IntroInput = {
  /** Bài có `step_1.theory` hay không. 28/48 bài KHÔNG có (X01…DA02). */
  hasTheory: boolean;
  /** `prefers-reduced-motion: reduce`. */
  reduced: boolean;
  /** Đã xem hoạt cảnh trong phiên này. */
  seen: boolean;
  /** Dựng được cảnh 3D (supportsBook3d). */
  book3d: boolean;
  /** Bề ngang khung nhìn đủ cho trải sách hai trang. */
  roomy: boolean;
  /** Có Web Animations API (`Element.prototype.animate`). */
  waapi: boolean;
};

/**
 * Quyết định MỘT LẦN lúc mount. Đổi tuỳ chọn hệ thống hay đổi cỡ màn giữa
 * chừng KHÔNG được làm hoạt cảnh đang chạy tự đổi chế độ.
 *
 * Thứ tự các nhánh là thứ tự ưu tiên, và mọi nhánh thoái lui đều đi XUỐNG
 * (full → short → off), không bao giờ ra một trạng thái thứ tư.
 */
export function introMode(input: IntroInput): IntroMode {
  // 28 bài không có `step_1.theory` thì không có quyển sách nào để mở. Ẩn dụ
  // "đọc sách" chỉ có nghĩa khi thật sự có phần đọc; dựng cảnh cho bài không
  // có lý thuyết là chuyển động trang trí thuần.
  if (!input.hasTheory) return 'off';

  // Giảm chuyển động: bỏ HẲN, không đổi sang bản rút gọn. "Rút gọn" vẫn là
  // chuyển động.
  if (input.reduced) return 'off';

  // Không có WAAPI thì không có hoạt cảnh nào chạy được — và quan trọng hơn:
  // không có `getAnimations().finish()` để bỏ qua. Trạng thái NGHỈ trong CSS
  // module đã là trạng thái cuối (sách không được dựng, chữ hiện bình thường),
  // nên 'off' ở đây không mất gì cả.
  if (!input.waapi) return 'off';

  // Lần thứ hai trở đi trong phiên: bản rút gọn. Cũng là đường thoái lui khi
  // trình duyệt không dựng được 3D, hoặc màn hẹp — hai trường hợp đó rơi về
  // ĐÚNG bản rút gọn đã có, không rơi về một cảnh nửa vời.
  if (input.seen || !input.book3d || !input.roomy) return 'short';

  return 'full';
}

export function introSeen(storage: IntroStorage | null, key = INTRO_SEEN_KEY): boolean {
  try {
    return storage?.getItem(key) === '1';
  } catch {
    // Chế độ riêng tư / chặn dữ liệu trang. Coi như chưa xem: thà chạy hoạt
    // cảnh một lần nữa còn hơn để trang nổ.
    return false;
  }
}

export function markIntroSeen(storage: IntroStorage | null, key = INTRO_SEEN_KEY): void {
  try {
    storage?.setItem(key, '1');
  } catch {
    // Không ghi được thì lần sau lại thấy bản đầy đủ. Không sao.
  }
}

/* ===========================================================================
   BẢNG THỜI LƯỢNG
   ===========================================================================
   Lấy nguyên từ nguyên mẫu đã đo (pha 1–2). Easing lấy từ bảng chuẩn
   motion-v2.md §3.2, không tự nắn lại.

   Cú "nghiêng người vào" dùng --ease-move chứ không --ease-out: đó là vật đi
   từ XA tới GẦN, không phải phần tử vào màn. Dùng ease-out (dồn hết về đầu)
   thì ở 230ms quyển sách đã về cỡ thật trong khi bìa còn đang quét, và phối
   cảnh phóng bìa to chiếm hết khung.
   =========================================================================== */

export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
export const EASE_MOVE = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** Mở sách — tổng 860ms (trần 900). Đo được 866–895ms ở CPU 1×/4×/6×. */
export const INTRO_FULL_MS = 860;

/** Bản rút gọn, và dấu hiệu vào màn sandbox. */
export const INTRO_SHORT_MS = 240;
export const SANDBOX_CUE_MS = 240;

/**
 * `fill` của MỌI animation ở đây là `'backwards'`, và đó là quyết định an
 * toàn quan trọng nhất trong file.
 *
 *  - `'backwards'` giữ khung ĐẦU trong lúc còn trong phần trễ (lớp chữ trễ
 *    560ms), nên không có cú chớp "chữ hiện rồi tắt rồi hiện lại".
 *  - Nhưng nó KHÔNG giữ gì sau khi xong: hết animation là phần tử trả về đúng
 *    trạng thái NGHỈ của CSS, tức trạng thái CUỐI. Vì vậy `finish()`,
 *    `cancel()`, animation bị trình duyệt bỏ, hay JS chết giữa chừng đều cho
 *    ra MỘT kết quả: chữ hiện, sách mở. Không có đường nào dẫn tới màn trắng
 *    hay bìa sách kẹt giữa chừng.
 *
 * `'forwards'`/`'both'` thì ngược lại: phần tử bị ghim ở khung CUỐI của
 * animation, nên nếu sau này ai sửa khung cuối lệch khỏi trạng thái nghỉ là
 * sinh ra đúng cái trạng thái kẹt đó. Test giữ cả hai điều kiện này.
 */
export const INTRO_FILL = 'backwards' as const;

export type IntroStep = {
  /** Khung đầu → khung cuối. Khung cuối PHẢI là trạng thái nghỉ của CSS. */
  keyframes: Keyframe[];
  options: { duration: number; delay: number; easing: string; fill: typeof INTRO_FILL };
};

function step(
  from: Keyframe,
  duration: number,
  delay: number,
  easing: string,
  to: Keyframe,
): IntroStep {
  return { keyframes: [from, to], options: { duration, delay, easing, fill: INTRO_FILL } };
}

/**
 * Bìa lật: bản lề ở cạnh TRÁI nên bìa mở hẳn sang trái và ra khỏi khung, để
 * trống hai trang cho nội dung. 560ms, trễ 0 → 560.
 */
export function coverStep(): IntroStep {
  return step({ transform: 'rotateY(0deg)' }, 560, 0, EASE_MOVE, { transform: 'rotateY(-172deg)' });
}

/**
 * Nghiêng người vào: quyển sách từ xa trên bàn dựng lên trước mặt. 680ms, trễ
 * 80 → 760. Bắt đầu ở scale .74 (không phải .86) vì lý do easing ở trên; KẾT
 * THÚC phải đúng `none` — lớp chữ 2D nằm ngoài khối 3D và căn theo khổ giấy,
 * hai lớp chỉ khớp khi transform cuối là đơn vị.
 */
export function bookStep(): IntroStep {
  return step(
    { transform: 'translateY(34px) scale(0.74) rotateX(26deg)' },
    680,
    80,
    EASE_MOVE,
    { transform: 'none' },
  );
}

/**
 * Lớp chữ hiện. Ở bản đầy đủ: 300ms, trễ 560 → 860 (đúng lúc bìa đã lật xong).
 * Ở bản rút gọn: 240ms, trễ 0 — không có bìa nào để chờ.
 */
export function textStep(mode: Exclude<IntroMode, 'off'>): IntroStep {
  const full = mode === 'full';
  return step(
    { opacity: '0', transform: 'translateY(8px)' },
    full ? 300 : INTRO_SHORT_MS,
    full ? 560 : 0,
    EASE_OUT,
    { opacity: '1', transform: 'none' },
  );
}

/** Tổng thời lượng của một chế độ, tính từ chính bảng trên. */
export function introDurationMs(mode: IntroMode): number {
  if (mode === 'off') return 0;
  const steps = mode === 'full' ? [coverStep(), bookStep(), textStep('full')] : [textStep('short')];
  return Math.max(...steps.map((s) => s.options.delay + s.options.duration));
}

/* ===========================================================================
   DẤU HIỆU VÀO MÀN SANDBOX — 240ms, chỉ opacity/transform
   ===========================================================================
   Không sách, không 3D, không "ngẩng đầu". Hai phần tử:
     - khung soạn thảo nhấc lên và hiện (opacity + translateY), 240ms;
     - một quầng viền quanh khung sáng lên rồi tắt (CHỈ opacity), 160ms trễ 80.

   Vì sao KHÔNG vẽ con trỏ nhảy vào dòng đầu như nguyên mẫu gợi ý: con trỏ thật
   nằm trong Monaco, và một con trỏ GIẢ đặt đè lên phải tự tìm toạ độ dòng 1 —
   toạ độ đó đổi theo cỡ chữ, theo thanh công cụ, và theo cả việc Monaco đã lên
   hay còn ở ô gõ dự phòng. Một dấu hiệu phải tìm toạ độ của thứ khác là dấu
   hiệu sẽ lệch. Quầng viền chỉ cần `inset` nên không bao giờ lệch.
   =========================================================================== */

export function sandboxCueSteps(): { frame: IntroStep; halo: IntroStep } {
  return {
    frame: step({ opacity: '0', transform: 'translateY(8px)' }, SANDBOX_CUE_MS, 0, EASE_OUT, {
      opacity: '1',
      transform: 'none',
    }),
    // Khung cuối là `opacity: 0` — ĐÚNG trạng thái nghỉ của quầng (nó là thứ
    // chỉ loé lên rồi biến mất), nên vẫn giữ bất biến "khung cuối = trạng thái
    // nghỉ". Quầng là trang trí aria-hidden; không có chữ nào trong nó.
    halo: {
      keyframes: [{ opacity: '0' }, { opacity: '0.9', offset: 0.45 }, { opacity: '0' }],
      options: { duration: 160, delay: 80, easing: EASE_OUT, fill: INTRO_FILL },
    },
  };
}

/** Dấu hiệu sandbox bật hay không. Cùng luật thoái lui, trừ phần 3D/bề ngang. */
export function sandboxCueOn(input: {
  reduced: boolean;
  seen: boolean;
  waapi: boolean;
}): boolean {
  return !input.reduced && !input.seen && input.waapi;
}

/* ===========================================================================
   BỎ QUA
   =========================================================================== */

/** Thứ tối thiểu mà `finishAnimations` cần — để test truyền animation giả. */
export type FinishableAnimation = { finish: () => void };

export type PlayGate = {
  /**
   * Khung hình đã tới: trả true nếu CÒN được `play()`. Đúng một lần — lượt sau
   * luôn false, nên một cú rAF rơi muộn không khởi động lại được gì.
   */
  claim: () => boolean;
  /**
   * Bỏ qua / dọn dẹp: đóng cổng vĩnh viễn. Trả true nếu lúc đó còn một cú
   * `play()` đang chờ, để chỗ gọi biết có cần `cancelAnimationFrame` không.
   */
  cancel: () => boolean;
};

/**
 * Cổng của cú `play()` bị nhường một khung hình.
 *
 * BookIntro dựng animation ở trạng thái `pause()` rồi mới `play()` trong một
 * `requestAnimationFrame` — cố ý, để lớp GPU của `will-change` kịp hình thành
 * (xem chú thích tại chỗ). Lỗi đã có thật từ đó: `skip()` chỉ gọi
 * `finishAnimations()`, nên nếu người học bấm phím/chạm ĐÚNG trong khung hình
 * đang chờ thì callback rAF vẫn chạy và gọi `play()` trên animation ĐÃ
 * finished — mà theo WAAPI, `play()` ở trạng thái finished đặt lại
 * `currentTime` về 0 và DIỄN LẠI. Người học vừa nói "cho tôi xem nội dung" thì
 * phải xem lại 860ms hoạt cảnh, 560ms đầu lớp chữ còn ở `opacity: 0`.
 *
 * Cửa sổ chỉ rộng một khung hình nên mở trang bằng mắt gần như không bắt được;
 * vì vậy câu trả lời "còn được play() không" nằm ở MỘT chỗ có test, chứ không
 * nằm trong một biến cục bộ của effect.
 */
export function playGate(): PlayGate {
  let pending = true;
  return {
    claim() {
      const allowed = pending;
      pending = false;
      return allowed;
    },
    cancel() {
      const had = pending;
      pending = false;
      return had;
    },
  };
}

/**
 * BỎ QUA = `finish()` từng animation.
 *
 * KHÔNG dùng mẹo đặt `transition-duration: 0s` giữa chừng. Nguyên mẫu đã thử
 * và đo: theo spec, transition ĐÃ KHỞI ĐỘNG không chịu ảnh hưởng của thay đổi
 * về sau trên các thuộc tính `transition-*`. Hậu quả đo được: bìa sách nhảy
 * tới nơi, nhưng lớp chữ (trễ 560ms, lúc bấm mới ở 200ms nên còn đang trong
 * phần trễ) vẫn đứng ở `opacity: 0` — bỏ qua xong là MÀN TRẮNG.
 *
 * `finish()` kết thúc đúng cả animation đang chạy lẫn animation còn trong phần
 * trễ, và vì `fill` là `'backwards'` (xem INTRO_FILL) nên kết thúc là trả về
 * trạng thái nghỉ = trạng thái cuối.
 *
 * Trả về số animation đã kết thúc được: 0 nghĩa là không có gì để bỏ qua.
 */
export function finishAnimations(list: readonly FinishableAnimation[]): number {
  let done = 0;
  for (const anim of list) {
    try {
      anim.finish();
      done += 1;
    } catch {
      // Animation chưa sẵn sàng (InvalidStateError khi duration là vô hạn, hay
      // animation đã bị cancel). Bỏ qua CÁI ĐÓ thôi, vẫn phải finish() những
      // cái còn lại — dừng nửa đường chính là cách sinh ra màn trắng.
    }
  }
  return done;
}

/**
 * Phím nào tính là "bỏ qua". Tab và các tổ hợp có phím điều khiển thì KHÔNG:
 * người dùng bàn phím vẫn phải đi tới được nút "Bỏ qua", và Ctrl/Cmd+… là lệnh
 * của trình duyệt, không phải cú bấm vào hoạt cảnh.
 */
export function keySkips(event: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}): boolean {
  if (event.key === 'Tab') return false;
  return !event.metaKey && !event.ctrlKey && !event.altKey;
}
