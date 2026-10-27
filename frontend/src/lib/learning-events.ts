// GHI NHẬT KÝ LẦN THỬ — nửa trình duyệt. Gom sự kiện rồi đẩy thành LÔ.
//
// =============================================================================
// VẤN ĐỀ ĐANG SỬA
// =============================================================================
// `lesson_progress` có đúng 4 cột dữ liệu và hàng chỉ sinh ra trong
// `completeLesson`, nên: người mở bài rồi bỏ không để lại dấu vết nào; hoàn
// thành sau 1 lần thử và sau 20 lần thử là hai hàng giống hệt nhau; `quizScore`
// do client báo nên là tự thuật. Bộ chấm trong trình duyệt đã biết CHÍNH XÁC ca
// nào trượt — file này là chỗ thông tin đó được giữ lại thay vì bị bỏ ngay sau
// khi hiện lên màn hình.
//
// Tên `kind`, cổng đồng ý, hai hằng thời gian và lý do không dùng vendor
// analytics: xem `learning-event-kinds.ts`. File này là phần CƠ CHẾ.
//
// =============================================================================
// BỐN LUẬT. Cả bốn đều từng có một bản sai rõ ràng, ba trong số đó ở dự án này.
// =============================================================================
// 1. CHƯA ĐỒNG Ý THÌ KHÔNG GOM, KHÔNG LƯU, KHÔNG GỬI.
//    Mặc định là TẮT: `ghi()` trả về ngay nếu chưa ai gọi `datDongY(true)`.
//    Không xếp vào hàng chờ (gom trước rồi "chờ đồng ý" vẫn là thu thập), không
//    ghi localStorage, không gọi mạng. Rút lại thì XOÁ hàng chờ, không đẩy nốt.
//    Và không một đường nào trong bài học đọc cờ này — từ chối thì vẫn học y
//    nguyên. HÔM NAY CHƯA CHỖ NÀO GỌI `datDongY(true)` nên lớp này nằm im; đó
//    là trạng thái đúng, thứ còn thiếu là giao diện xin đồng ý + bản ghi đồng ý
//    ở máy chủ.
// 2. CHỈ `apiFetch`, và CHỈ ở trang bài học.
//    `apiFetch` gặp 401 là tự gọi `ensureGuest()`. Gọi nó ở một trang công khai
//    nghĩa là MỖI BOT QUÉT WEB sinh một tài khoản khách, ăn hết
//    `THROTTLE_GUEST_LIMIT` và nhồi rác `@guest.local` vào bảng users (bẫy đã
//    ghi trong AGENTS.md). Ở đây luật đó KHÔNG phải một dòng chú thích mà là
//    hàng rào thứ hai: `ghi()` cũng không làm gì cho tới khi có `datBoiCanh()`
//    với một bài học cụ thể — và chỗ duy nhất gọi nó là `useLessonData`. Trang
//    chủ, `/courses/*`, `/ide` không kích được một lượt gửi kể cả gọi `ghi()`.
// 3. HỎNG LÀ IM LẶNG. Ghi log không bao giờ được làm vỡ bài học hay chặn người
//    học: không `await` trên đường đi chính, không `throw` ra ngoài, không
//    hiện thông báo nào. Mọi lời gọi `gui` nằm trong try/catch, promise của nó
//    bị `catch(() => {})` nuốt.
// 4. KHÔNG gửi mã nguồn của người học — kể cả dưới dạng HASH.
//    Thứ máy chủ nhận là KẾT LUẬN (`sameAsPrev` một bit, `repeatStreak` một số
//    đếm), không phải dấu vân tay để nó tự so. Phép so chạy ở đây, nơi mã gốc
//    vẫn còn trong tay — xem "QUYẾT ĐỊNH 2" trong learning-event-kinds.ts. Hash
//    vẫn được tính (`bamMa`) nhưng CHỈ sống trong bộ nhớ của tab này.
//
// =============================================================================
// ĐƯỜNG GỬI: `visibilitychange`→hidden là đường CHÍNH. `pagehide` chỉ là lưới.
// =============================================================================
// Không phải lựa chọn phong cách — đường "đẩy nốt lúc đóng tab" KHÔNG CHẠY
// ĐƯỢC ở đây, và nó có post-mortem có ngày tháng:
//
//  · `navigator.sendBeacon` bị loại BỞI ĐẶC TẢ: W3C Beacon (CR Draft
//    03/08/2022) nói API "does not provide ability to customize the request
//    method, provide custom request headers" và chỉ thẳng sang `fetch` +
//    `keepalive`. API của mình chỉ nhận `Bearer`, còn refresh token nằm trong
//    cookie httpOnly `Path=/auth` nên `/api/events` không bao giờ thấy cookie
//    nào. Beacon ở đây là 401 đều đặn — mà 401 thì `apiFetch` CẤP MỘT TÀI KHOẢN
//    KHÁCH MỚI, tức bản "đúng chuẩn" lại rơi thẳng vào luật 2.
//  · `application/json` KHÔNG nằm trong danh sách CORS-safelisted nên nó buộc
//    PREFLIGHT, và preflight KHÔNG hoàn thành được trong lúc trang đang unload.
//    posthog-js 1.399.4 (13/07/2026, PR #4139) gặp đúng chuyện này: "a preflight
//    cannot complete while the page unloads, so on cross-origin hosts the
//    browser silently dropped the POST and the final batch of events was lost."
//    Điểm quyết định: header `Authorization` TỰ NÓ cũng không safelisted, nên
//    một request khác origin CÓ XÁC THỰC thì không bao giờ tránh được preflight.
//    Production của mình là `www.programmingedu.io.vn` gọi
//    `api.programmingedu.io.vn` — KHÁC ORIGIN. Nên không có cách nào làm cho
//    "đẩy lúc unload" chạy đúng, dù viết thế nào.
//
// Vì vậy: đẩy ở `visibilitychange` → `hidden`. Tài liệu page-lifecycle của
// Chrome gọi `hidden` là "the last reliable time to save app and user data", và
// ở thời điểm đó TRANG CÒN SỐNG nên preflight hoàn thành bình thường. `pagehide`
// vẫn được gắn làm lưới phụ, nhưng không được coi là đường chính.
// Một đường SAME-ORIGIN (rewrite ở Next.js) sẽ bỏ hẳn preflight — đó là quyết
// định về hạ tầng, nên nó nằm trong BÁO CÁO chứ không tự dựng ở đây.
//
// =============================================================================
// MẤT SỰ KIỆN LÀ CÓ CẤU TRÚC, KHÔNG PHẢI LỖI — và không ai lượng hoá được
// =============================================================================
// `unload` đã chết: Chrome gỡ nó đạt 100% số lần tải trang ở Chrome 155
// (06/10/2026), và web.dev viết "never use the `unload` event. Ever!". Nên
// KHÔNG dùng `unload`, và cũng không dùng `beforeunload` (nó làm trang mất
// quyền vào bfcache, tức đổi hành vi người học thấy được để lấy một lô log).
// `pagehide` cũng không chắc: WebKit bug 199854 (vẫn NEW) báo pagehide,
// beforeunload VÀ unload đều KHÔNG fire khi đóng tab trên iOS; bảng trạng thái
// của Chrome ghi "(no events fired)" cho hidden→terminated và
// hidden/frozen→discarded.
// Hệ quả phải chịu, không phải phải sửa: một phần sự kiện sẽ mất. Và KHÔNG
// nguồn nào lượng hoá được tỉ lệ mất. Vì vậy mọi câu phân tích phải đọc được
// trên dữ liệu THIẾU — đó chính là lý do báo cáo chọn tín hiệu NHỊ PHÂN "có
// người đâm tường ở đây" và cấm đọc theo tỉ lệ ở n = 20–40: một lần xảy ra là
// một phát hiện thật, còn KHÔNG lần nào xảy ra là bằng chứng YẾU về sự vắng mặt.
// Đừng viết ở đâu rằng lớp này không mất sự kiện.
//
// Sàn hỗ trợ `fetch(keepalive)`: Chrome 66 / Edge 15 / Safari 13 /
// **Firefox 133** (26/11/2024) — Firefox là bên đến muộn, không phải Safari.
import { apiFetch } from './api.ts';
import {
  GIOI_HAN,
  NGUONG_PHIEN_MS,
  TRAN_BYTE_MOI_LO,
  TRAN_DEM,
  TRAN_KHOANG_CACH_MS,
  type LearningEventKind,
  type MoiTruongChay,
} from './learning-event-kinds.ts';

/** Bài học đang mở. Không có nó thì không sự kiện nào được gửi (luật 2). */
export type BoiCanhBai = {
  courseId: string;
  /** `lessons.sort_order` — khoá mà cả hệ thống dùng để tra bài. */
  lessonNo: number;
  /**
   * Mã của bài chạy ở đâu. Đi vào payload của MỌI sự kiện vì mọi phép gộp thời
   * gian phải tách theo nó: với 27 bài chạy trên máy người học, `machineMs` của
   * worker không đo cái gì cả.
   */
  env?: MoiTruongChay;
};

export type SuKienGui = {
  /** UUID v4, trên MỌI sự kiện, vô điều kiện — khoá chống trùng ở máy chủ. */
  eid: string;
  kind: LearningEventKind;
  courseId: string | null;
  lessonNo: number | null;
  screenKey: string | null;
  payload: Record<string, unknown> | null;
  clientAt: string;
};

/**
 * Nhịp đẩy: 10 giây HOẶC 20 sự kiện, cái nào tới trước. Đồng hồ chỉ chạy khi
 * có sự kiện đang chờ.
 *
 * Hai con số đặt trong dải của các SDK đã đọc, để chúng có chỗ so: PostHog
 * 3000 ms (kẹp 250–5000) và KHÔNG có trần số sự kiện; OpenTelemetry 5000 ms /
 * 2048; Segment 5000 ms / 10; RudderStack 100 (XHR) hoặc 10 (beacon);
 * Snowplow v4 `maxPostBytes` 40000. Chọn 10 giây chứ không 3–5 giây vì mỗi lô
 * là một request có PREFLIGHT (khác origin + Bearer): 3 giây làm số request
 * tăng gấp ba cho cùng một lượng dữ liệu, và vì mất sự kiện ở đây là có cấu
 * trúc chứ không phụ thuộc nhịp, nhịp ngắn không mua lại được gì.
 */
export const NHIP_DAY_MS = 10_000;
export const NGUONG_SO_LUONG = 20;

/**
 * Gộp các lần gõ liên tiếp trong cùng khoảng này thành MỘT "lần sửa".
 *
 * Vì sao không đếm từng lần gõ: `onCodeChange` của Monaco bắn mỗi ký tự, nên
 * đếm thẳng thì `editsSinceLastRun` là "số ký tự đã gõ" — một con số đo tốc độ
 * đánh máy, không đo số lần người học QUYẾT ĐỊNH đổi mã. Nhóm Blackbox cố ý
 * chọn mức DÒNG thay vì click-stream vì "data-cleaning proved to be a
 * significant problem", và đây là bản tương đương: một "lần sửa" là một đợt gõ.
 *
 * 1,5 giây là một QUYẾT ĐỊNH, không dẫn được từ nguồn nào: đủ dài để gõ xong
 * một biểu thức mà không bị tách, đủ ngắn để hai lần nghĩ khác nhau không bị
 * gộp. Nó chỉ cần ỔN ĐỊNH, vì tín hiệu là một TỈ SỐ sửa/chạy chứ không phải
 * một con số tuyệt đối.
 */
export const NGUONG_GOP_SUA_MS = 1_500;

/**
 * UUID v4 cho `eid`. `crypto.randomUUID` có ở mọi trình duyệt trong sàn hỗ trợ,
 * nhưng CHỈ trong secure context — localhost và https thì có, một bản xem qua
 * `http://<ip>` thì không. Nên có đường dự phòng: thiếu nó thì `eid` rỗng và
 * máy chủ BỎ sự kiện (`eid_la`), tức mất dữ liệu ở đúng môi trường thử nghiệm.
 */
export function sinhEid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Dự phòng: 16 byte ngẫu nhiên, đặt đúng bit phiên bản/variant của v4 để nó
  // qua được `RE_UUID_V4` ở máy chủ.
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Số BYTE (UTF-8) của một thứ sau khi JSON hoá — không phải số ký tự. */
export function soByte(value: unknown): number {
  const s = JSON.stringify(value) ?? '';
  // TextEncoder có ở mọi trình duyệt trong sàn hỗ trợ và cả trong Node (bộ test
  // chạy ở Node thuần). `s.length` thì sai: nó đếm UTF-16 code unit, nên mọi
  // chữ có dấu — tức gần hết chuỗi tiếng Việt — bị đếm thiếu, và trần byte trở
  // thành một trần lỏng hơn mình nghĩ theo đúng chiều nguy hiểm.
  return new TextEncoder().encode(s).length;
}

/**
 * Hash mã của người học — FNV-1a 32 bit, hex 8 ký tự.
 *
 * CHỈ DÙNG TRONG BỘ NHỚ CỦA TAB NÀY. Nó không bao giờ đi vào payload: `codeHash`
 * nằm trong `KHOA_CAM_PAYLOAD` nên nếu ai đó thêm lại thì máy chủ BỎ CẢ SỰ KIỆN
 * và `dropped` nhảy lên — hỏng ồn ào, không hỏng im lặng.
 *
 * Vì sao KHÔNG `crypto.subtle.digest`: nó bất đồng bộ, và chỗ gọi nằm trên
 * đường đi của một lượt Chạy. Thêm một `await` ở đó là thêm một chỗ để lớp ghi
 * log làm chậm thứ người học đang chờ — ngược luật 3.
 *
 * Trùng hash có xảy ra được, và nó KHÔNG hệ trọng: hash chỉ trả lời "mã có đổi
 * so với lượt trước của CHÍNH người này trên CHÍNH bài này hay không" — vài
 * chục chuỗi, không phải vài tỉ.
 */
export function bamMa(code: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    // Math.imul: nhân 32-bit có dấu. `h * 16777619` vượt 2^53 và mất bit thấp,
    // nên hash sẽ đụng nhau hàng loạt — lỗi im lặng kiểu tệ nhất.
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Lỗi của lượt chạy là lỗi HẠ TẦNG hay lỗi của người học?
 *
 * Trộn hai thứ này là biến một sự cố của mình thành "bài này khó": nếu worker
 * không nạp được thì 40 người thử đều "trượt" bài đó, và dữ liệu sẽ nói bài đó
 * cần viết lại.
 *
 * Nhận diện theo CÂU DO MÌNH SINH RA, không theo heuristic: ba chuỗi dưới đây
 * là hằng của `runner/pyodide-runner.ts` (`NO_RUNTIME`, `TOO_SLOW_LOAD`, và câu
 * "đang chạy một lượt khác"). Mọi thứ khác là traceback của Python, tức lỗi
 * trong mã người học. Đổi câu ở pyodide-runner.ts thì phải đổi ở đây — có ca
 * test đọc file đó và đòi ba chuỗi này còn nằm trong nó.
 */
export const CAU_LOI_HA_TANG = [
  'Không tải được bộ chạy Python',
  'Tải Python quá lâu',
  'Đang chạy một lượt khác',
] as const;

export function laLoiHaTang(error?: string): boolean {
  if (!error) return false;
  return CAU_LOI_HA_TANG.some((cau) => error.includes(cau));
}

/** Câu `TOO_SLOW_EXEC` của pyodide-runner.ts — lượt bị CẮT vì quá 5 giây. */
export const CAU_QUA_HAN = 'vượt giới hạn 5 giây';

export function laQuaHan(error?: string): boolean {
  return Boolean(error && error.includes(CAU_QUA_HAN));
}

/**
 * Tách loại + nội dung exception từ traceback.
 *
 * Lấy DÒNG CUỐI có dạng `TênLỗi: nội dung` — đó là dòng duy nhất người học đọc,
 * và là dòng duy nhất ổn định: phần giữa của traceback mang số dòng và đường
 * dẫn file tạm, nên dùng nó thì hai lượt giống nhau lại ra hai chữ ký khác nhau
 * và phép "trượt y hệt lặp lại" không bao giờ bắt được gì.
 */
export function loaiLoi(error?: string): { errorType: string | null; errorMessage: string | null } {
  if (!error) return { errorType: null, errorMessage: null };
  const dong = error
    .split('\n')
    .map((d) => d.trim())
    .filter(Boolean);
  for (let i = dong.length - 1; i >= 0; i--) {
    const m = /^([A-Za-z_][A-Za-z0-9_.]*(?:Error|Exception|Warning|Exit|Interrupt))\b:?\s*(.*)$/.exec(
      dong[i],
    );
    if (m) return { errorType: m[1], errorMessage: dong[i] };
  }
  return { errorType: null, errorMessage: dong[dong.length - 1] ?? null };
}

/**
 * Chữ ký của một lượt TRƯỢT. Hai lượt cùng chữ ký = "đâm tường".
 *
 * Gồm hash mã + tập ca trượt (ĐÃ SẮP XẾP) + loại lỗi. Sắp xếp là bắt buộc: bộ
 * chấm không hứa thứ tự ca trượt, nên không sắp thì cùng một lỗi lại ra hai chữ
 * ký và bộ đếm không bao giờ lên.
 *
 * Chữ ký này KHÔNG RA KHỎI TAB NÀY (luật 4) — nó chỉ là khoá so sánh trong bộ
 * nhớ. Thứ đi lên máy chủ là `sameAsPrev`/`repeatStreak`.
 */
export function dauVetTruot(d: {
  codeHash: string;
  failed: string[];
  errorType: string | null;
}): string {
  return `${d.codeHash}|${[...d.failed].sort().join('\u0001')}|${d.errorType ?? ''}`;
}

/**
 * Khoảng cách tới hành động trước, theo luật của PSLC DataShop: `null` khi vượt
 * `TRAN_KHOANG_CACH_MS`.
 *
 * `null` chứ KHÔNG phải con số thật: quá 10 phút thì nó không còn đo "người này
 * nghĩ bao lâu" mà đo "người này đi đâu đó", và một con số 40 phút nằm trong
 * phép tính trung bình sẽ kéo lệch đúng thứ mình muốn đọc. Lượt ĐẦU cũng là
 * `null`, không phải 0 — 0 nghĩa là "bấm lại ngay lập tức", một chuyện khác hẳn
 * "chưa có lượt nào".
 */
export function khoangCach(truoc: number | undefined, bayGio: number): number | null {
  if (truoc === undefined) return null;
  const d = bayGio - truoc;
  return d >= 0 && d <= TRAN_KHOANG_CACH_MS ? d : null;
}

/** Lượt này có mở một PHIÊN MỚI không — ngưỡng 5 phút của Jadud. */
export function laPhienMoi(truoc: number | undefined, bayGio: number): boolean {
  return truoc === undefined || bayGio - truoc > NGUONG_PHIEN_MS;
}

/** Một lượt chạy đã xong, đúng những gì `useLessonRun` có trong tay. */
export type LuotChay = {
  /** Bấm "Nộp & Chấm điểm" (true) hay "Chạy thử" (false). */
  submit: boolean;
  code: string;
  tests: { name: string; passed: boolean }[];
  /** Số ca chấm của bài — `tests.length` của kết quả có thể ít hơn khi lỗi. */
  total: number;
  error?: string;
  /**
   * Thời gian MÁY: `RunResult.duration` của worker. KHÔNG phải thời gian người
   * học ngồi trước màn hình — cái đó là `sincePrevMs`. Hai thứ không được gộp:
   * 26 bài biểu đồ trả thêm ~0,8 s chỉ để xuất PNG, lần `import
   * matplotlib.pyplot` đầu từng đo được 5,62 s, và 27 bài chạy trên máy người
   * học nên con số này không đo gì cả ở đó (vì vậy payload mang cả `env`).
   */
  machineMs: number;
};

/**
 * Một lô đã sẵn sàng gửi. `sentAt` là `stm` của Snowplow — giờ client lúc GỬI,
 * MỘT giá trị cho cả lô (cả lô gửi một lần). Cùng `clientAt` của từng sự kiện,
 * nó cho mốc suy ra ở máy chủ mà không phụ thuộc đồng hồ máy người học.
 */
type Lo = { events: SuKienGui[]; sentAt: string };

type Gui = (lo: Lo) => void;

export type BoGhi = {
  /**
   * Bật/tắt theo sự đồng ý của người học. Mặc định TẮT. `false` xoá hàng chờ.
   * Gọi `datDongY(true)` là việc của giao diện xin đồng ý — chưa dựng.
   */
  datDongY: (co: boolean) => void;
  daDongY: () => boolean;
  datBoiCanh: (ctx: BoiCanhBai | null) => void;
  boiCanh: () => BoiCanhBai | null;
  ghi: (kind: LearningEventKind, them?: { screenKey?: string; payload?: Record<string, unknown> }) => void;
  /**
   * Người học vừa sửa mã. KHÔNG phát sự kiện nào — chỉ tăng một bộ đếm mà lượt
   * chạy sau sẽ mang theo (`editsSinceLastRun`). Xem "KHÔNG THI HÀNH Error
   * Quotient" trong learning-event-kinds.ts: tín hiệu cần là TỈ SỐ sửa/chạy, và
   * một sự kiện mỗi lần gõ là click-stream — nhân số hàng lên hàng trăm lần mà
   * cho ra đúng con số một bộ đếm cho ra.
   */
  ghiSuaMa: () => void;
  ghiLuotChay: (luot: LuotChay, screenKey?: string) => void;
  day: () => void;
  dangCho: () => number;
  /** Người học bấm Dừng: lượt chạy không trả kết quả nào nên phải ghi riêng. */
  ghiBamDung: (screenKey?: string) => void;
};

/**
 * Dựng một bộ ghi. `gui`/`now`/`hen` tiêm vào được để
 * `frontend/e2e/unit/learning-events.test.mjs` chạy được trong Node thuần —
 * không DOM, không fetch, không đồng hồ thật. Logic nằm trong hook là logic
 * không có test (cùng lý lẽ với `src/lib/lesson-load.ts`).
 */
export function taoBoGhi(opts: {
  gui: Gui;
  now?: () => number;
  /** Đặt hẹn giờ; trả hàm huỷ. Mặc định `setTimeout`. */
  hen?: (fn: () => void, ms: number) => () => void;
  nhipMs?: number;
  nguongSoLuong?: number;
}): BoGhi {
  const now = opts.now ?? (() => Date.now());
  const hen =
    opts.hen ??
    ((fn, ms) => {
      const id = setTimeout(fn, ms);
      return () => clearTimeout(id);
    });
  const nhipMs = opts.nhipMs ?? NHIP_DAY_MS;
  const nguong = opts.nguongSoLuong ?? NGUONG_SO_LUONG;

  // MẶC ĐỊNH TẮT — không phải một tuỳ chọn cấu hình, là luật 1. Không đọc env,
  // không đọc localStorage ở đây: một cờ đọc từ đĩa là một cờ có thể bị bật bởi
  // dữ liệu cũ, và "đồng ý từ lần trước" là chuyện của bản ghi đồng ý ở máy
  // chủ, không phải của biến này.
  let dongY = false;
  let ctx: BoiCanhBai | null = null;
  let hangCho: SuKienGui[] = [];
  let huyHen: (() => void) | null = null;
  /** Chữ ký lượt trượt gần nhất, theo bài — nền của "trượt y hệt lặp lại". */
  const vetTruoc = new Map<string, { dauVet: string; lan: number }>();
  /** Thời điểm lượt chạy trước, theo bài — cho `sincePrevMs`/`newSession`. */
  const lucTruoc = new Map<string, number>();
  /** Lượt chạy thứ mấy trên bài này — cho `attemptNo`. */
  const soLuot = new Map<string, number>();
  /** Số lần sửa mã kể từ lượt chạy trước, theo bài — tín hiệu sửa/chạy. */
  const soSua = new Map<string, number>();
  /** Lần gõ gần nhất, theo bài — dùng để GỘP một đợt gõ thành một lần sửa. */
  const lucSuaTruoc = new Map<string, number>();

  function khoaBai(): string {
    return ctx ? `${ctx.courseId}#${ctx.lessonNo}` : '';
  }

  function thoiHen() {
    huyHen?.();
    huyHen = null;
  }

  function datHen() {
    if (huyHen) return;
    huyHen = hen(() => {
      huyHen = null;
      day();
    }, nhipMs);
  }

  /**
   * Gom một lô theo CẢ HAI trần: số lượng và BYTE.
   *
   * Phải đo byte trước khi gửi, không được để nó tự nổ: WHATWG Fetch nói trần
   * 64 KiB của `keepalive` là ngân sách GỘP của cả fetch group, và vượt trần
   * trả về `network error` — KHÔNG phân biệt được với mất mạng, và máy chủ
   * không bao giờ thấy request. Tức "để nó tự nổ" nghĩa là mất im lặng.
   *
   * Luôn lấy ÍT NHẤT MỘT sự kiện, dù nó một mình đã vượt trần: giữ nó lại thì
   * hàng chờ tắc vĩnh viễn và mọi sự kiện sau nó cũng không bao giờ đi. Một sự
   * kiện quá to sẽ bị máy chủ từ chối (400) — hỏng ồn ào, đúng chiều cần.
   */
  function gomLo(): SuKienGui[] {
    const lo: SuKienGui[] = [];
    let byte = 2; // dấu `[` và `]`
    for (const e of hangCho) {
      if (lo.length >= GIOI_HAN.suKienMoiLo) break;
      const them = soByte(e) + 1; // +1 cho dấu phẩy
      if (lo.length && byte + them > TRAN_BYTE_MOI_LO) break;
      lo.push(e);
      byte += them;
    }
    return lo;
  }

  function day() {
    thoiHen();
    // Rút lại sự đồng ý giữa lúc còn hàng chờ: hàng chờ đã bị xoá ở `datDongY`,
    // nhưng chốt thêm ở đây để không có đường nào gửi khi cờ đang tắt.
    if (!dongY) {
      hangCho = [];
      return;
    }
    if (!hangCho.length) return;
    // Phần dư KHÔNG bị bỏ — nó ở lại hàng chờ và được đẩy ở lô sau. Bỏ im lặng
    // là tự tạo một phép đo nói sai.
    const lo = gomLo();
    hangCho = hangCho.slice(lo.length);
    try {
      opts.gui({ events: lo, sentAt: new Date(now()).toISOString() });
    } catch {
      /* luật 3: hỏng là im lặng. Lô này mất, bài học không việc gì. */
    }
    if (hangCho.length) datHen();
  }

  function ghi(
    kind: LearningEventKind,
    them?: { screenKey?: string; payload?: Record<string, unknown> },
  ) {
    // HAI HÀNG RÀO, và thứ tự có ý nghĩa.
    //  · luật 1: chưa đồng ý thì KHÔNG GOM. Xếp vào hàng chờ rồi "đợi đồng ý"
    //    vẫn là thu thập — và nếu người học không bao giờ đồng ý thì ta đã giữ
    //    một bản ghi hành vi của họ trong bộ nhớ suốt phiên mà không được phép.
    //  · luật 2: chưa có bài học nào đang mở thì không ghi, không gửi, không
    //    tạo tài khoản khách. Đây là lý do một trang công khai gọi `ghi()` cũng
    //    vô hại.
    if (!dongY || !ctx) return;
    // `env` đính vào MỌI sự kiện, không chỉ sự kiện chạy: câu SQL gộp thời gian
    // phải nhóm theo nó, kể cả khi gộp thời gian ĐỌC bài.
    const payload =
      ctx.env && them?.payload
        ? { env: ctx.env, ...them.payload }
        : ctx.env
          ? { env: ctx.env }
          : (them?.payload ?? null);
    hangCho.push({
      eid: sinhEid(),
      kind,
      courseId: ctx.courseId,
      lessonNo: ctx.lessonNo,
      screenKey: them?.screenKey ?? null,
      payload,
      clientAt: new Date(now()).toISOString(),
    });
    // Đệm có trần, bỏ CÁI CŨ NHẤT — chính sách của Snowplow, và là chính sách
    // duy nhất được tài liệu hoá rõ trong 6 SDK đã soát (PostHog để trong bộ
    // nhớ và KHÔNG có trần). Thứ đáng giữ khi đệm phình là trạng thái GẦN ĐÂY
    // của người học, không phải lịch sử đầu phiên.
    //
    // NÓI THẲNG: ở cấu hình mặc định dòng này KHÔNG VỚI TỚI ĐƯỢC. Hai dòng
    // dưới gọi `day()` ngay khi hàng chờ đạt `nguong` (20), mà `day()` luôn lấy
    // ra ít nhất một sự kiện — nên hàng chờ dao động quanh 20 và không bao giờ
    // tới 1000. Giữ nó làm CHẶN TRÊN phòng xa cho ngày chính sách đẩy đổi (ví
    // dụ thêm phép "đang có lô bay thì chưa gửi lô mới", lúc đó hàng chờ phình
    // thật). Gỡ nó ra thì ca test tương ứng đỏ, nhưng ca đó phải tự dựng lại
    // tình huống "không có lượt đẩy nào" — xem chú thích trong
    // `learning-events.test.mjs`. Đừng xoá rồi tưởng đã dọn xong.
    while (hangCho.length > TRAN_DEM) hangCho.shift();
    if (hangCho.length >= nguong) day();
    else datHen();
  }

  function ghiSuaMa() {
    if (!dongY || !ctx) return;
    const khoa = khoaBai();
    const bayGio = now();
    // Gộp một ĐỢT gõ thành một lần sửa — xem `NGUONG_GOP_SUA_MS`.
    if (bayGio - (lucSuaTruoc.get(khoa) ?? -Infinity) < NGUONG_GOP_SUA_MS) return;
    lucSuaTruoc.set(khoa, bayGio);
    soSua.set(khoa, (soSua.get(khoa) ?? 0) + 1);
  }

  /**
   * MỘT lượt chạy sinh ĐÚNG MỘT loại sự kiện. Phân nhánh ở đây, không ở phía
   * SQL, vì ba trường hợp dưới đây trả lời ba câu hỏi khác nhau:
   *
   *  · lỗi HẠ TẦNG   -> `X-Runtime.Failure`. Không phải một lần thử: người học
   *    không nhận được thông tin nào về mã của mình.
   *  · QUÁ HẠN 5 giây -> `X-Run.Interrupted` (reason `timeout`). Cũng không
   *    phải một lần thử, và đây là chỗ dễ làm sai nhất: đếm nó vào "số lần thử
   *    tới khi đạt" thì một vòng lặp vô hạn làm phồng con số của một bài mà
   *    người học giải xong ở lượt thứ hai — một lượt bị cắt không có chẩn đoán
   *    nào để người học đọc.
   *  · còn lại        -> `Run.Test` hoặc `Submit`, kèm `X-Repeat.Fail` khi chữ
   *    ký trùng lượt trước. Đây là chỗ DUY NHẤT một cú bấm sinh hai hàng, và nó
   *    có chủ đích: "đâm tường" phải đọc được bằng một câu `WHERE kind = ...`.
   */
  function ghiLuotChay(luot: LuotChay, screenKey?: string) {
    if (!dongY || !ctx) return;
    const khoa = khoaBai();
    const truoc = lucTruoc.get(khoa);
    const bayGio = now();
    lucTruoc.set(khoa, bayGio);

    if (laLoiHaTang(luot.error)) {
      ghi('X-Runtime.Failure', {
        screenKey,
        payload: {
          submit: luot.submit,
          // Câu hạ tầng do mình sinh ra nên ghi nguyên văn được; nó không phải
          // nội dung người học viết.
          reason: luot.error,
          machineMs: luot.machineMs,
        },
      });
      return;
    }

    if (laQuaHan(luot.error)) {
      ghi('X-Run.Interrupted', {
        screenKey,
        payload: { reason: 'timeout', submit: luot.submit, machineMs: luot.machineMs },
      });
      return;
    }

    const lan = (soLuot.get(khoa) ?? 0) + 1;
    soLuot.set(khoa, lan);
    const sua = soSua.get(khoa) ?? 0;
    soSua.set(khoa, 0);
    const codeHash = bamMa(luot.code);
    const truot = luot.tests.filter((t) => !t.passed).map((t) => t.name);
    const { errorType, errorMessage } = loaiLoi(luot.error);
    const passed =
      !luot.error && luot.total > 0 && luot.tests.length === luot.total && !truot.length;
    const dauVet = dauVetTruot({ codeHash, failed: truot, errorType });
    const cu = vetTruoc.get(khoa);
    // KẾT LUẬN, không phải dấu vân tay (luật 4): máy chủ chỉ cần biết lượt này
    // có giống lượt trước hay không. Phép so dùng hash, nhưng hash ở lại đây.
    const sameAsPrev = Boolean(cu && cu.dauVet === dauVet);

    ghi(luot.submit ? 'Submit' : 'Run.Test', {
      screenKey,
      payload: {
        passed,
        total: luot.total,
        failed: truot,
        errorType,
        errorMessage,
        sameAsPrev,
        // Tín hiệu sửa/chạy: nhiều SỬA + ít CHẠY = tắc ở ngữ nghĩa; nhiều SỬA +
        // nhiều CHẠY = tắc ở cú pháp. Một bộ đếm, không phải một dòng click-stream.
        editsSinceLastRun: sua,
        machineMs: luot.machineMs,
        attemptNo: lan,
        sincePrevMs: khoangCach(truoc, bayGio),
        newSession: laPhienMoi(truoc, bayGio),
      },
    });

    if (passed) {
      // Đạt rồi thì chuỗi "đâm tường" kết thúc — không xoá thì lần trượt sau
      // nối tiếp chuỗi cũ và `repeatStreak` nói sai.
      vetTruoc.delete(khoa);
      return;
    }
    const chuoi = sameAsPrev && cu ? cu.lan + 1 : 1;
    vetTruoc.set(khoa, { dauVet, lan: chuoi });
    if (chuoi >= 2) {
      ghi('X-Repeat.Fail', {
        screenKey,
        payload: { repeatStreak: chuoi, failed: truot, errorType, attemptNo: lan },
      });
    }
  }

  function ghiBamDung(screenKey?: string) {
    ghi('X-Run.Interrupted', { screenKey, payload: { reason: 'stop' } });
  }

  return {
    datDongY: (co) => {
      dongY = co === true;
      if (!dongY) {
        // XOÁ, không đẩy nốt. Đẩy nốt "cho khỏi mất dữ liệu" là gửi đúng thứ
        // người ta vừa nói đừng gửi.
        thoiHen();
        hangCho = [];
        vetTruoc.clear();
        lucTruoc.clear();
        soLuot.clear();
        soSua.clear();
        lucSuaTruoc.clear();
      }
    },
    daDongY: () => dongY,
    datBoiCanh: (next) => {
      // Đổi bài là đẩy hết sự kiện của bài CŨ trước — để một lô không trộn hai
      // bài, và để chúng tới máy chủ trước lượt mở bài mới.
      if (ctx && next && (ctx.courseId !== next.courseId || ctx.lessonNo !== next.lessonNo)) {
        day();
      }
      ctx = next;
      if (!next) day();
    },
    boiCanh: () => ctx,
    ghi,
    ghiSuaMa,
    ghiLuotChay,
    ghiBamDung,
    day,
    dangCho: () => hangCho.length,
  };
}

/**
 * Gửi thật. `keepalive: true` để lô cuối sống qua lúc trang đóng; `void` +
 * `catch` để không có chỗ nào `await` được (luật 3).
 */
function guiThat(lo: Lo): void {
  void apiFetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lo),
    keepalive: true,
  }).catch(() => undefined);
}

/** Bộ ghi dùng chung của cả trang bài học. TẮT cho tới khi có sự đồng ý. */
const BO_GHI = taoBoGhi({ gui: guiThat });

export const datDongYGhiNhatKy = BO_GHI.datDongY;
export const daDongYGhiNhatKy = BO_GHI.daDongY;
export const datBoiCanhBai = BO_GHI.datBoiCanh;
export const ghiSuKien = BO_GHI.ghi;
export const ghiSuaMa = BO_GHI.ghiSuaMa;
export const ghiLuotChay = BO_GHI.ghiLuotChay;
export const ghiBamDung = BO_GHI.ghiBamDung;
export const dayNgay = BO_GHI.day;

let daGanNghe = false;

/**
 * Gắn chỗ đẩy. Gọi được nhiều lần (idempotent) vì React StrictMode gắn/tháo/
 * gắn lại component ở dev.
 *
 * Gắn listener KHÔNG phải là thu thập: `day()` không gửi gì khi cờ đồng ý đang
 * tắt (hàng chờ luôn rỗng trong trạng thái đó). Nên hàm này an toàn để gọi vô
 * điều kiện, và nhờ vậy việc bật/tắt log không phải một nhánh trong component.
 *
 * ĐƯỜNG CHÍNH là `visibilitychange` → `hidden`: chuyển tab, khoá máy, thu nhỏ,
 * và trên điện thoại là cả lúc rời app. Lý do nó phải là đường chính nằm ở đầu
 * file — ở thời điểm `hidden` trang CÒN SỐNG nên preflight của một request khác
 * origin có `Authorization` hoàn thành được, còn trong lúc unload thì không.
 *
 * `pagehide` là LƯỚI PHỤ, không phải đường thứ hai ngang hàng: nó bắt ca điều
 * hướng đi mà `visibilitychange` không kịp bắn, nhưng chính nó cũng không chắc
 * (WebKit bug 199854: pagehide/beforeunload/unload đều không fire khi đóng tab
 * trên iOS) VÀ nó chạy trong lúc unload nên lô gửi ở đó có thể bị trình duyệt
 * âm thầm bỏ. Giữ nó vì nó miễn phí, không vì nó đáng tin.
 *
 * KHÔNG `unload` (Chrome gỡ nó đạt 100% số lần tải trang ở Chrome 155,
 * 06/10/2026) và KHÔNG `beforeunload` (làm trang mất quyền vào bfcache — đổi
 * hành vi người học thấy được để lấy một lô log).
 */
export function batDauGhi(): void {
  if (daGanNghe || typeof document === 'undefined') return;
  daGanNghe = true;
  const khiAn = () => {
    if (document.visibilityState === 'hidden') BO_GHI.day();
  };
  document.addEventListener('visibilitychange', khiAn);
  window.addEventListener('pagehide', () => BO_GHI.day());
}
