import { apiFetch } from '@/lib/api';
import { datDongYGhiNhatKy } from '@/lib/learning-events';

/**
 * SỰ ĐỒNG Ý cho lớp ghi nhật ký lần thử — nửa phía client.
 *
 * ============================================================================
 * MÁY CHỦ LÀ THẨM QUYỀN, FILE NÀY CHỈ LÀ CÁI HỘP
 * ============================================================================
 * Đừng đọc file này như cổng bảo vệ. Cổng thật nằm ở `record()` trong
 * `src/learning-events/learning-events.service.ts`: nó đọc bản ghi đồng ý trong
 * DB trước khi ghi một hàng nào, nên một request gửi tay (hoặc một bản client
 * cũ) cũng không ghi được gì. `datDongYGhiNhatKy()` ở đây chỉ để KHÔNG GỬI thứ
 * máy chủ sẽ từ chối — tiết kiệm lượt mạng, không phải hàng rào.
 *
 * Nói rõ vì chú thích cũ của lớp ghi gọi `let dongY = false` là "cổng", và nếu
 * ai tin thế thì họ sẽ thấy việc thêm cổng ở máy chủ là dư.
 *
 * ============================================================================
 * BẢN MÔ TẢ NẰM Ở ĐÂY, CẠNH PHIÊN BẢN — và đó là chỗ nó phải nằm
 * ============================================================================
 * `MO_TA_PHAM_VI` là NGUYÊN VĂN người học đọc trước khi bấm. Nó phải nói đúng
 * những gì `LEARNING_EVENT_KINDS` thu thập và đúng `HAN_LUU_NGAY`. Khi phạm vi
 * đổi, ca ghim trong `learning-event-consent.spec.ts` đỏ và câu dặn ở đó nói
 * phải sửa CẢ chỗ này — vì một hộp nói "10 loại, 90 ngày" trên một hệ thống thu
 * 11 loại là một sự đồng ý lấy được bằng thông tin sai.
 *
 * Đặt nó trong mã nguồn chứ không trong DB hay CMS: nó phải đi cùng một commit
 * với thứ nó mô tả, nếu không thì hai bên lệch nhau mà không có gì đỏ.
 */

/** Hình dạng `GET /api/events/consent` trả về. Khớp `TrangThaiDongY` ở backend. */
export type TrangThaiDongY = {
  granted: boolean;
  /** Nên hiện hộp. KHÁC `!granted`: người đã từ chối thì KHÔNG hỏi lại. */
  shouldAsk: boolean;
  version: string;
};

/**
 * Mặc định khi KHÔNG đọc được trạng thái (mạng lỗi, backend ngủ đông).
 *
 * `granted: false` và `shouldAsk: false` — tức không ghi, và cũng KHÔNG hỏi.
 * Hướng lệch ở đây không đối xứng:
 *   · đoán "chưa hỏi" khi thật ra đã từ chối → hiện lại hộp cho người vừa nói
 *     không, tức làm phiền đúng người đã trả lời;
 *   · đoán "đã đồng ý" → gửi dữ liệu đi (máy chủ từ chối, nhưng ý định đã sai).
 * Cả hai đều tệ hơn việc im lặng một lượt mở bài. Người học mở bài sau là hỏi.
 */
const KHI_KHONG_DOC_DUOC: TrangThaiDongY = {
  granted: false,
  shouldAsk: false,
  version: '',
};

/**
 * Bản mô tả phạm vi, nguyên văn người học đọc.
 *
 * Viết ở ngôi thứ nhất và nói THẲNG, không dùng từ làm mờ ("nâng cao trải
 * nghiệm", "dữ liệu ẩn danh"). Hai câu cuối là hai thứ người ta thật sự muốn
 * biết: dừng được không, và mã mình viết có bị gửi đi không.
 */
export const MO_TA_PHAM_VI = {
  tieuDe: 'Cho phép ghi lại quá trình học của bạn?',
  thu: [
    'Bạn mở bài nào, ở màn nào, và bỏ dở ở đâu.',
    'Mỗi lần bấm Chạy: ca chấm nào đạt, ca nào trượt, lỗi là lỗi gì.',
    'Lần thử này có giống lần trước không, và bạn đã sửa mấy lần giữa hai lần chạy.',
    'Câu trắc nghiệm bạn chọn đáp án nào.',
  ],
  khongThu: [
    'KHÔNG gửi mã Python bạn viết — kể cả dưới dạng mã băm (hash).',
    'KHÔNG có tên, email hay thông tin cá nhân nào trong bản ghi.',
  ],
  hanLuu: 'Chúng tôi xoá toàn bộ sau 90 ngày.',
  dungDeLam:
    'Để biết bài nào đang làm người học mắc kẹt, và sửa chính bài đó. ' +
    'Không dùng để chấm điểm hay xếp hạng bạn.',
  rutLai:
    'Bạn đổi ý lúc nào cũng được — từ chối bây giờ không ảnh hưởng gì tới bài học.',
} as const;

/**
 * Đọc trạng thái đồng ý, và MỞ CỔNG client nếu đã đồng ý.
 *
 * Gọi nó SONG SONG với ba lượt nạp bài (`Promise.all` trong `useLessonData`),
 * không nối đuôi: đo trên production, ba lượt tuần tự mất 3,7 giây còn song song
 * ~1,3 giây (xem bẫy "Mở một bài học còn gọi BA lượt API TUẦN TỰ" trong
 * AGENTS.md) — thêm một lượt thứ tư nối đuôi là đi ngược bản sửa đó.
 *
 * Và không được gọi MUỘN HƠN `datBoiCanhBai`: `ghi()` BỎ sự kiện khi cổng còn
 * đóng chứ không xếp hàng, nên cổng mở sau là mất hẳn `X-Lesson.Open` của lượt
 * đó. Mất một sự kiện thì câu SQL drop-off đếm thiếu đúng lượt mở bài đầu tiên
 * của mỗi người — tức thiếu ở đúng chỗ dễ kết luận sai nhất.
 */
export async function napTrangThaiDongY(): Promise<TrangThaiDongY> {
  try {
    const res = await apiFetch('/api/events/consent');
    if (!res.ok) return KHI_KHONG_DOC_DUOC;
    const body: unknown = await res.json();
    const tt = chuanTrangThai(body);
    datDongYGhiNhatKy(tt.granted);
    return tt;
  } catch {
    // Không đọc được trạng thái thì cổng phải ĐÓNG. `datDongYGhiNhatKy(false)`
    // tường minh thay vì dựa vào giá trị khởi tạo: hàm này có thể được gọi lại
    // sau khi người học đã đồng ý ở lượt trước, và lúc đó "không làm gì" nghĩa
    // là để cổng MỞ trong khi ta vừa mất liên lạc với thẩm quyền.
    datDongYGhiNhatKy(false);
    return KHI_KHONG_DOC_DUOC;
  }
}

/**
 * Gửi quyết định của người học.
 *
 * KHÔNG gửi `version`: máy chủ đặt nó. Client gửi phiên bản nghĩa là một bản
 * client cũ ghi được "đã đồng ý với bản hiện hành" trong khi hộp nó hiện ra là
 * bản mô tả CŨ — bản ghi nói sai về điều người học thật sự đã đọc.
 *
 * Cổng client mở/đóng theo trạng thái MÁY CHỦ TRẢ VỀ, không theo `granted` vừa
 * gửi: nếu máy chủ từ chối (429, phiên bản đổi giữa lúc đó) thì tin vào giá trị
 * mình vừa gửi là mở cổng cho một sự đồng ý chưa được ghi.
 */
export async function guiQuyetDinhDongY(
  granted: boolean,
): Promise<TrangThaiDongY> {
  try {
    const res = await apiFetch('/api/events/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ granted }),
    });
    if (!res.ok) return KHI_KHONG_DOC_DUOC;
    const tt = chuanTrangThai(await res.json());
    datDongYGhiNhatKy(tt.granted);
    return tt;
  } catch {
    datDongYGhiNhatKy(false);
    return KHI_KHONG_DOC_DUOC;
  }
}

/**
 * Chuẩn hoá body thành `TrangThaiDongY`.
 *
 * Cần vì `res.json()` trả `any`: một backend cũ (hoặc một proxy chèn HTML lỗi)
 * trả `{}` thì `body.granted` là `undefined`, và `if (undefined)` tuy là false
 * nhưng `granted: undefined` lọt vào state rồi lan ra chỗ khác dưới dạng
 * `boolean | undefined`. Ép ở ĐÚNG MỘT chỗ, ngay biên.
 *
 * `=== true` chứ không `Boolean(...)`: chuỗi `"false"` là truthy, và đây là cờ
 * quyết định có thu dữ liệu nhạy cảm hay không — nó không được đi qua một phép
 * ép kiểu lỏng nào.
 */
function chuanTrangThai(body: unknown): TrangThaiDongY {
  const o = (body ?? {}) as Record<string, unknown>;
  return {
    granted: o.granted === true,
    shouldAsk: o.shouldAsk === true,
    version: typeof o.version === 'string' ? o.version : '',
  };
}
