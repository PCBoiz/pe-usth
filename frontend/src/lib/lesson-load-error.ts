/**
 * Nói đúng NGUYÊN NHÂN khi trang bài học không mở được.
 *
 * ===========================================================================
 * SỰ VIỆC THẬT (đo trên API production 15/10/2026)
 * ===========================================================================
 *   GET  /health          → {"status":200,"message":"ok","db":"down"}
 *   POST /auth/guest      → 500
 *   POST /api/v1/auth/guest → 404   (bản deploy phục vụ ở GỐC, không có /v1)
 *
 * Người học mở bài thì đọc được: "Chưa kết nối được bài học — Bài học này cần
 * phiên đăng nhập hợp lệ từ API." Câu đó đổ lỗi cho PHIÊN của người đang đọc,
 * trong khi sự thật là máy chủ không nối được cơ sở dữ liệu. Nên họ bấm "Thử
 * lại" mãi, hoặc tưởng mình làm sai.
 *
 * ĐƯỜNG ĐI của câu nói sai đó, đọc từ mã:
 *   1. `useLessonData.load()` gọi `json('/api/user')` → `apiFetch`.
 *   2. `request()` nhận 401 ⇒ `refreshAccess()` (khách chưa có cookie ⇒ null)
 *      ⇒ `ensureGuest()` ⇒ `POST {origin}/auth/guest`.
 *   3. DB chết ⇒ lượt đó trả 500. Nhưng `ensureGuest` chỉ `if (!r.ok) return
 *      null` — mã 500 BỊ ĐÁNH RƠI tại đây.
 *   4. `request()` trả về nguyên response 401 của lượt ĐẦU.
 *   5. `json()` thấy 401 ⇒ ném 'Bài học này cần phiên đăng nhập hợp lệ từ API.'
 * Tức 401 ở bước 5 là 401 của một request đi KHÔNG MANG token — nó chỉ chứng
 * minh "chưa có phiên", không chứng minh "phiên sai". Lý do thật nằm ở mã trả
 * về của `/auth/guest`, và mã đó đã bị bỏ mất hai bước trước đó.
 *
 * ===========================================================================
 * VÌ SAO DÒ /health, VÀ DÒ HAI ĐƯỜNG
 * ===========================================================================
 * Mã lỗi của chính lượt gọi hỏng là KHÔNG ĐỦ để phân biệt — 401 ở trên đã là
 * ví dụ. Nên khi một lượt gọi hỏng, hỏi thêm `/health` (đường công khai, không
 * cần token) và đọc `db`.
 *
 * Dò HAI đường trong một lượt, và đây là chỗ cứu được nhiều giờ dò lỗi:
 *   · `{origin}/health` — đúng cái gốc API mà `apiFetch` đang dùng;
 *   · `{host}/health`   — gốc của HOST, bỏ hết phần đường của origin.
 * 404 ở đường một mà 200 ở đường hai ⇒ gốc API cấu hình sai (bản deploy thiếu
 * prefix, hoặc `NEXT_PUBLIC_API_URL` mang thêm một đoạn đường không có thật).
 * Triệu chứng của nó TRƯỚC ĐÂY giống hệt "mất phiên", nên không ai chẩn được.
 *
 * Vì sao không chỉ xét "404 từ lượt gọi bài": bài học tra theo
 * `(course_id, sort_order)` nên mở `/lesson/python_advanced/999` cũng 404 một
 * cách hợp lệ. Lấy 404 làm bằng chứng lệch prefix sẽ nói sai cho đúng trường
 * hợp đó. Phép so ở đây không dính tới đường của bài: nó so HAI cách gọi CÙNG
 * một endpoint luôn tồn tại, nên một bài không tồn tại không làm nó dương tính.
 *
 * File này KHÔNG import gì để `node --test` đọc trực tiếp được (alias `@/…`
 * không phân giải trong bộ test) — cùng khuôn với `home-copy.ts`,
 * `gate-notice.ts`, `seo-copy.ts`, `runner-error.ts`.
 */

/** Kết quả dò `/health`; `null` nghĩa là không gọi tới được (mạng/CORS). */
export type HealthProbe = {
  /** Mã HTTP khi gọi `{origin}/health` — tức ĐÚNG gốc API mà trang đang dùng. */
  originStatus: number;
  /** Mã HTTP khi gọi `{host}/health` — gốc của host, bỏ phần đường của origin. */
  rootStatus: number;
  /** `db` trong body của lượt dò nào trả lời được; 'unknown' nếu không đọc được. */
  db: 'up' | 'down' | 'unknown';
};

export type LoadFailureKind =
  /** Máy chủ còn trả lời nhưng không đọc được cơ sở dữ liệu. */
  | 'db-down'
  /** Máy chủ trả 5xx cho lượt gọi của bài. */
  | 'server-error'
  /** 429 — chạm hạn mức (THROTTLE_GUEST_LIMIT tính theo IP, cả phòng máy chung một NAT). */
  | 'overloaded'
  /** Gốc API không có thật: bản backend đang chạy không khớp bản frontend. */
  | 'api-path-missing'
  /** Không nhận được câu trả lời nào. */
  | 'unreachable'
  /** 401 thật — hiếm, vì frontend không còn trang đăng nhập. */
  | 'no-session'
  /** Không đủ bằng chứng để nói gì chắc chắn: dùng nguyên thông điệp gốc. */
  | 'unknown';

export type LoadFailureCopy = {
  /** Nhan đề màn hỏng — nói CÁI GÌ hỏng, không nói "chưa kết nối được". */
  title: string;
  body: string;
};

/** Câu cũ, giữ nguyên cho đúng MỘT trường hợp nó nói thật: 401 thật. */
export const NO_SESSION_MESSAGE = 'Bài học này cần phiên đăng nhập hợp lệ từ API.';

/**
 * Đường dò sức khoẻ, suy từ gốc API đang dùng.
 *
 * `origin` có thể mang thêm đường (bản deploy từng đặt
 * `NEXT_PUBLIC_API_URL=https://api.…/api/v1`), nên hai giá trị trả về là KHÁC
 * nhau đúng trong trường hợp cần phát hiện. Gốc đặt đúng ⇒ hai đường trùng
 * nhau ⇒ chỉ một lượt gọi và không có cách nào dương tính giả.
 */
export function healthProbeUrls(origin: string): { originUrl: string; rootUrl: string } {
  const trimmed = origin.replace(/\/+$/, '');
  let rootUrl = `${trimmed}/health`;
  try {
    rootUrl = `${new URL(trimmed).origin}/health`;
  } catch {
    /* origin không phải URL tuyệt đối: giữ nguyên, hai đường trùng nhau */
  }
  return { originUrl: `${trimmed}/health`, rootUrl };
}

/** Đọc `db` ra khỏi body của `/health` mà không tin body có hình dạng nào. */
export function readProbeDb(body: unknown): 'up' | 'down' | 'unknown' {
  if (body && typeof body === 'object') {
    const db = (body as Record<string, unknown>).db;
    if (db === 'up' || db === 'down') return db;
  }
  return 'unknown';
}

/**
 * Chọn tên cho sự cố.
 *
 * THỨ TỰ LÀ MỘT QUYẾT ĐỊNH, không phải tình cờ:
 *  1. Lệch gốc API xét TRƯỚC `db-down`, vì câu của `db-down` bảo người ta CHỜ
 *     — lời khuyên đó sai khi lỗi là cấu hình: chờ bao lâu cũng không có
 *     đường API nào mọc ra. Nhánh này CHƯA từng xảy ra thật: bản đầu của chú
 *     thích ghi "hôm 15/10 cả hai cùng xảy ra", nhưng đó là một chẩn đoán
 *     hỏng — người dò đã tự gõ `/api/v1/auth/guest`, nhận 404 (đúng, vì
 *     `enableVersioning` KHÔNG bật và `/auth/*` cố ý nằm ngoài prefix — xem
 *     `src/api-gateway/api-gateway.setup.ts:10`) rồi coi đó là bằng chứng.
 *     Đo lại trên production: `/api/courses` trả 401 và `/health` trả 200,
 *     tức định tuyến vẫn đúng. Giữ nhánh này vì nó rẻ và lưới an toàn thật,
 *     nhưng ĐỪNG đọc nó như một sự cố đã có.
 *  2. `db-down` xét trước 401, vì 401 ở đây chính là 401 bị `ensureGuest` làm
 *     mất mã 500 (xem đầu file).
 *  3. 429 xét trước 5xx để không gộp "quá tải" vào "sự cố".
 */
export function classifyLoadFailure(input: {
  /** Mã HTTP của lượt gọi hỏng; 0 khi `fetch` ném (không có response nào). */
  status: number;
  probe: HealthProbe | null;
}): LoadFailureKind {
  const { status, probe } = input;
  if (probe && probe.originStatus === 404 && probe.rootStatus === 200) return 'api-path-missing';
  if (probe && probe.db === 'down') return 'db-down';
  if (status === 429) return 'overloaded';
  if (status >= 500) return 'server-error';
  if (!probe && status === 0) return 'unreachable';
  if (status === 401) return 'no-session';
  return 'unknown';
}

/**
 * Câu nói với NGƯỜI HỌC. Luật viết, theo giọng đã chốt:
 *  · nói cái gì đang xảy ra TRƯỚC, rồi mới nói nên làm gì;
 *  · lỗi của máy chủ thì nói thẳng là của máy chủ — không để người đọc tự hỏi
 *    mình vừa làm sai gì;
 *  · không mời đi `/ide`: Bàn thí nghiệm gửi mã lên MÁY CHỦ (`POST
 *    /api/python/run`), nên máy chủ hỏng là nó cũng hỏng. Chỉ nhánh lệch
 *    prefix là đã lưu tiến độ cũ an toàn nên nói được điều đó.
 *
 * `detail` là thông điệp gốc đã ném ra, chỉ dùng cho nhánh `unknown` — chỗ duy
 * nhất mà không nói gì chắc chắn còn thật thà hơn là đoán.
 */
export function loadFailureCopy(kind: LoadFailureKind, detail = ''): LoadFailureCopy {
  switch (kind) {
    case 'db-down':
      return {
        title: 'Máy chủ đang không đọc được dữ liệu',
        body:
          'Máy chủ còn chạy nhưng mất kết nối tới cơ sở dữ liệu, nên nó không'
          + ' lấy được nội dung bài và cũng chưa lưu được tiến độ. Đây là sự cố'
          + ' bên chúng tôi, không phải phiên học của bạn. Chờ vài phút rồi bấm'
          + ' Thử lại; tiến độ đã lưu trước đó vẫn còn nguyên.',
      };
    case 'server-error':
      return {
        title: 'Máy chủ đang có sự cố',
        body:
          'Máy chủ trả về lỗi khi mở bài này. Lỗi nằm ở phía chúng tôi, không'
          + ' phải ở phiên học hay ở mã bạn vừa viết. Chờ vài phút rồi bấm Thử'
          + ' lại; tiến độ đã lưu trước đó vẫn còn nguyên.',
      };
    case 'overloaded':
      return {
        title: 'Máy chủ đang quá tải',
        body:
          'Có quá nhiều lượt mở bài từ cùng một mạng trong một giờ, nên máy chủ'
          + ' tạm chối thêm lượt mới — cả một phòng máy dùng chung đường mạng là'
          + ' đủ để chạm ngưỡng này. Đợi vài phút rồi bấm Thử lại.',
      };
    case 'api-path-missing':
      return {
        title: 'Bản máy chủ không khớp bản trang web',
        body:
          'Máy chủ vẫn trả lời, nhưng nó trả 404 cho mọi đường dữ liệu mà trang'
          + ' này gọi — tức bản backend đang chạy không khớp với bản trang web.'
          + ' Đây là lỗi cấu hình khi triển khai, không phải lỗi của bạn, và bấm'
          + ' Thử lại cũng chưa đổi được gì cho tới khi người vận hành so lại'
          + ' đường gốc API. Tiến độ đã lưu trước đó không mất.',
      };
    case 'unreachable':
      return {
        title: 'Không gọi được tới máy chủ',
        body:
          'Trang không nhận được câu trả lời nào từ máy chủ. Có thể mạng của bạn'
          + ' vừa mất, hoặc máy chủ đang khởi động lại. Kiểm tra mạng rồi bấm'
          + ' Thử lại.',
      };
    case 'no-session':
      return { title: 'Chưa kết nối được bài học', body: NO_SESSION_MESSAGE };
    default:
      return {
        title: 'Chưa mở được bài học',
        body:
          detail
          || 'Chưa lấy được nội dung bài từ máy chủ. Bấm Thử lại; nếu vẫn vậy'
            + ' thì sự cố nằm ở phía chúng tôi.',
      };
  }
}
