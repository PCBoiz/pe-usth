/**
 * LỚP HOVER của bản đồ thế giới — bản ĐẶC TẢ bằng số.
 *
 * ── 19/10/2026: LỚP CHUYỂN ĐỘNG TỰ CHẠY ĐÃ BỊ BỎ HẾT ──────────────────
 *
 * Bản trước của file này (commit `d7b31e7`, 525 dòng) mang năm hiệu ứng TỰ KHỞI
 * ĐỘNG: bốn màn khí parallax theo cuộn, cột bụi rơi trong giếng, mạch rỉ vào bể
 * M4, mặt hồ M8 trôi ngang, năm sợi sáng vẽ dần bằng `stroke-dashoffset`. Chủ
 * sản phẩm chốt lại một câu: "chỉ cần motion graphic khi hover nào thôi".
 *
 * Nên cả năm bị bỏ, cùng 11 phần tử phủ và cả component `MapMotion.tsx` mà
 * chúng cần (effect đo khối, listener cuộn + `requestAnimationFrame`,
 * `IntersectionObserver`, `ResizeObserver`, bốn màu đặt bằng CSSOM). KHÔNG giữ
 * lại cái nào ở dạng "tắt bằng cờ": một hiệu ứng tắt bằng cờ vẫn phải đọc, vẫn
 * phải kiểm, và vẫn sẽ có người bật lại.
 *
 * Thu được, và đây là điều đáng ghi nhất: sau khi trang nạp xong, bản đồ ĐỨNG
 * YÊN TUYỆT ĐỐI. Không `@keyframes` nào, không listener nào, không nhịp hợp ảnh
 * nào, không lớp nào phải giữ trên GPU ở một tab mở cả ngày. Cả cái trần
 * `MAX_AUTO_MOTION_MS = 5000` (dựng ra để WCAG 2.2.2 không đòi nút Dừng) cũng
 * không còn việc gì làm: thứ duy nhất còn động là thứ do chính tay người xem
 * khởi động, tức WCAG 2.2.2 không áp dụng.
 * (Hoạt ảnh hiện-ra lúc nạp — `decorStep`/`regionStep` trong `WorldMap.tsx` —
 * KHÔNG thuộc lớp này; nó thuộc về bức tranh và xong trong khoảng một giây.)
 *
 * ── LỚP HOVER KHÔNG CÓ MỘT DÒNG JS NÀO ────────────────────────────────
 *
 * Nó là CSS thuần: `src/app/map-motion.module.css`, một class `.spotlight` đặt
 * lên phần tử BỌC các vùng. Vì sao không JS: một hiệu ứng hover cần JS là một
 * hiệu ứng hỏng trong khoảng giữa lúc HTML tới và lúc hydrate xong — mà đó đúng
 * là lúc người ta vừa thấy bản đồ và đưa chuột vào.
 *
 * Nên file này KHÔNG được import bởi code chạy; nó được import bởi
 * `e2e/unit/map-motion.test.mjs`. Nó tồn tại vì các con số trong CSS phải có
 * MỘT nguồn kiểm được bằng `node --test`, và vì hai luật dưới đây là luật thật,
 * không phải hệ quả của cách viết CSS: `regionEmphasis` (ba trạng thái) và
 * `transitionOk` (chuyển tiếp ngắn, chỉ hai thuộc tính). Bộ test GỌI cả hai.
 *
 * ── HỢP ĐỒNG DUY NHẤT: `[data-map-region]` ────────────────────────────
 *
 * Lớp hover bám vào CẤU TRÚC — "mỗi vùng là một `<a>` có vùng chạm" — chứ không
 * vào hình thái: không toạ độ hang hốc, không mã gian (`M4`, `M8`), không tên
 * dải, không khung 1360 × 820. Đó là chủ ý: `design/v3/ban-do-sao.md` đang
 * nghiên cứu thay hẳn bản đồ sang BẢN ĐỒ SAO (8 chòm, 48 ngôi), và một lớp bám
 * toạ độ thì chết theo. Bản trước đã trả giá đúng chuyện này ở quy mô nhỏ hơn:
 * nó giữ một bản sao bốn mốc địa tầng và bản sao sống được đúng hai giờ.
 *
 * HAI CON SỐ PHẢI XEM LẠI KHI BẢN ĐỒ ĐỔI HÌNH, ghi ra để không ai phải đoán:
 *  · `REGION_DIM_OPACITY` — làm mờ 7 trên 8 tấm nhãn là một tín hiệu nhẹ; làm
 *    mờ 47 trên 48 ngôi sao là cả bầu trời tối đi. Khi đó có lẽ phải mờ trong
 *    CHÒM đang trỏ thôi, tức `.spotlight` chuyển xuống mức chòm.
 *  · `REGION_LIFT_PX` — nhấc 3px đọc ra được trên một tấm nhãn cao 44px; trên
 *    một ngôi sao 6px nó là một cú nhảy.
 */

/**
 * Thuộc tính DOM mà mỗi vùng phải mang, và là thứ duy nhất lớp hover bám vào.
 * `WorldMap.tsx` đã đặt nó trên cả hai bố cục (bản vẽ và danh sách dự phòng) từ
 * trước, cho hoạt ảnh hiện ra — lớp hover dùng lại chính nó, không thêm một
 * thuộc tính đánh dấu thứ hai.
 */
export const REGION_HOOK = '[data-map-region]';

/**
 * Thời lượng chuyển tiếp (ms). 180 nằm giữa khoảng 150–250 mà bản thiết kế
 * chốt: đủ dài để mắt đọc ra là một thay đổi có chủ ý (dưới ~120ms thì nó đọc
 * thành một cú nháy), đủ ngắn để rê chuột qua ba vùng liền nhau không để lại
 * ba vết mờ đuổi theo nhau.
 */
export const HOVER_MS = 180;

/** Hai đầu của khoảng được phép. Trần 250 là trần cho một chuyển tiếp THEO Ý
 *  NGƯỜI DÙNG: quá đó thì tín hiệu "con trỏ đang ở đây" tới sau con trỏ. */
export const HOVER_MIN_MS = 150;
export const HOVER_MAX_MS = 250;

/**
 * Hai thuộc tính DUY NHẤT được phép chuyển tiếp.
 *
 * Không phải để con số đẹp: `opacity` và `transform` đi thẳng lên compositor,
 * nên tám tấm nhãn đổi cùng lúc vẫn không tốn một lượt layout nào. Thêm
 * `background`/`border-color`/`filter` vào đây là mời trình duyệt vẽ lại — và
 * vùng bị vẽ lại nằm NGAY TRÊN ảnh nền 877 KB (`.decor`), nên nó kéo cả tranh
 * vào lượt vẽ đó.
 */
export const HOVER_PROPS: readonly string[] = ['opacity', 'transform'];

/** Độ đậm của vùng đang được trỏ / Tab tới, và của vùng lúc nghỉ. */
export const REGION_LIT_OPACITY = 1;

/**
 * Độ đậm của BẢY vùng còn lại khi có một vùng đang được trỏ.
 *
 * 0,55 chứ không phải 0,2: mấy vùng kia LÙI LẠI, không biến mất. Chúng vẫn là
 * tám lối vào khoá học, và người đang so sánh hai chặng phải còn đọc được tên
 * chặng kia. (`--ds-soft` của bộ token là chữ phụ, tức đã nhạt hơn `--ds-ink`;
 * 0,55 trên nền giấy vẫn giữ tên chặng ở mức đọc được, không phải mức đoán.)
 */
export const REGION_DIM_OPACITY = 0.55;

/**
 * Cú nhấc của vùng đang được trỏ (px, đi LÊN).
 *
 * 3px là một gợi ý chiều sâu, không phải một chuyển động: nó nói "cái này đang
 * ở trước" mà không làm tấm nhãn rời khỏi chỗ của nó trên tranh. Lớn hơn thì ở
 * bản rộng tấm nhãn sẽ tách khỏi tiểu cảnh mà nó đang chú thích.
 */
export const REGION_LIFT_PX = 3;

/**
 * Ba trạng thái của một vùng. `rest` và `lit` là HAI TÊN cho cùng một độ đậm —
 * xem `emphasisOpacity`.
 */
export type RegionEmphasis = 'rest' | 'lit' | 'dim';

/**
 * Luật thông tin của cả lớp, viết ra thành một hàm vì nó là một LUẬT chứ không
 * phải một hệ quả của cách viết CSS: chỉ khi CÓ một vùng đang được trỏ thì mấy
 * vùng kia mới lùi lại. Không ai chạm vào ⇒ cả tám đứng nguyên, không vùng nào
 * mờ.
 *
 * `active` mà `anyActive` sai là một trạng thái không tồn tại (vùng này đang
 * được trỏ thì tất nhiên CÓ vùng đang được trỏ); hàm vẫn trả `lit` để không ai
 * phải đoán, nhưng đừng xây gì trên nhánh đó.
 */
export function regionEmphasis(input: { anyActive: boolean; active: boolean }): RegionEmphasis {
  if (input.active) return 'lit';
  return input.anyActive ? 'dim' : 'rest';
}

/**
 * Độ đậm của một trạng thái.
 *
 * `rest` và `lit` CÙNG giá trị, và đó là khẳng định quan trọng nhất của file
 * này: nó có nghĩa là quy tắc NGHỈ trong CSS không được mang `opacity` nào cả.
 * Viết `opacity: 0.55` cho trạng thái nghỉ rồi để `:hover` nâng về 1 cho ra
 * đúng cùng một hình khi có chuột — nhưng lúc không ai chạm vào thì bản đồ MỜ
 * SẴN, tám tấm nhãn nhạt đi mà không ai nói gì. `map-motion.test.mjs` canh cả
 * hai phía: hàm này, và quy tắc nghỉ trong CSS.
 */
export function emphasisOpacity(emphasis: RegionEmphasis): number {
  return emphasis === 'dim' ? REGION_DIM_OPACITY : REGION_LIT_OPACITY;
}

export type TransitionSpec = {
  /** Thời lượng, ms. */
  ms: number;
  /** Các thuộc tính được liệt kê trong `transition`. */
  props: readonly string[];
};

/**
 * Một `transition` có hợp luật của lớp này hay không: trong khoảng 150–250ms,
 * và chỉ chuyển tiếp những thuộc tính trong `HOVER_PROPS`.
 *
 * Bộ test bóc TỪNG khai báo `transition` ra khỏi CSS rồi đưa qua đây, nên hai
 * luật chỉ viết một lần. Rỗng là SAI: một quy tắc `transition` không liệt kê
 * thuộc tính nào (hoặc liệt kê `all`) là một quy tắc chuyển tiếp mọi thứ, kể cả
 * `background-image`.
 */
export function transitionOk(spec: TransitionSpec): boolean {
  if (!Number.isFinite(spec.ms) || spec.ms < HOVER_MIN_MS || spec.ms > HOVER_MAX_MS) return false;
  if (spec.props.length === 0) return false;
  return spec.props.every((p) => HOVER_PROPS.includes(p));
}
