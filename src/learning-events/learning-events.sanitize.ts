/**
 * Lọc + cắt trần một lô sự kiện CLIENT GỬI, trước khi nó chạm tới DB.
 *
 * Toàn bộ file là HÀM THUẦN, không Nest, không Prisma — cùng lý lẽ với
 * `src/lib/lesson-load.ts` ở frontend: logic nằm trong service là logic khó
 * ablate, vì muốn gỡ một hàng rào ra để xem test có đỏ hay không thì phải dựng
 * cả module DI.
 *
 * BA NGUYÊN TẮC, và cái thứ hai dễ bị làm sai:
 *  1. Một sự kiện hỏng KHÔNG được làm mất cả lô. Người học bấm Chạy 12 lần rồi
 *     đóng tab; nếu sự kiện thứ 7 có `kind` sai thì 11 sự kiện còn lại vẫn phải
 *     vào DB. Nên hàm này BỎ từng sự kiện và ĐẾM lại, chứ không ném.
 *  2. Lô QUÁ LỚN thì ném, không cắt bớt. Cắt bớt im lặng là cách tự tạo ra một
 *     phép đo nói sai: client gửi 5 000 sự kiện, server nhận 50, và không ai
 *     biết 4 950 cái kia có hay không. Ném là để lỗi nằm ở chỗ gây ra nó.
 *  3. ĐO LẠI MỌI SỐ LƯỢNG CLIENT GỬI. Client đã đo và cắt trước khi gửi
 *     (`TRAN_BYTE_MOI_LO`), nhưng OWASP **API4:2023 Unrestricted Resource
 *     Consumption** nói thẳng là phải validate ở SERVER — một client đã bị sửa
 *     thì không còn đo hộ ai. Endpoint nhận LÔ đúng là hình dạng "GraphQL
 *     batching" mà mục đó cảnh báo: nhiều tác vụ trong một request để lách giới
 *     hạn tính theo request. Xem thêm **BLA7:2025 Resource Quota Violation**.
 */
import { BadRequestException } from '@nestjs/common';

import {
  GIOI_HAN,
  KHOA_CAM_PAYLOAD,
  RE_UUID_V4,
  laKindHopLe,
  type LearningEventKind,
} from './learning-event-kinds';

/** Một sự kiện đã được làm sạch — đúng hình dạng hàng `learning_events`. */
export type SuKienSach = {
  /** UUID v4 do client sinh. Khoá chống trùng — xem `RE_UUID_V4`. */
  eventId: string;
  kind: LearningEventKind;
  courseId: string | null;
  lessonNo: number | null;
  screenKey: string | null;
  payload: Record<string, unknown> | null;
  clientAt: Date | null;
};

/**
 * Vì sao một sự kiện bị bỏ. Đếm theo lý do (không chỉ tổng) vì mỗi lý do trỏ
 * tới một lỗi KHÁC NHAU ở phía client, và lớp này hỏng trong im lặng:
 * `kind_la` = gõ sai tên loại; `khong_phai_object` = gửi mảng chuỗi;
 * `payload_cam` = ai đó vừa thêm `code` vào payload; `eid_la` = client không
 * sinh UUID (tức lô đó không khử trùng được).
 */
export type LyDoBo =
  | 'khong_phai_object'
  | 'eid_la'
  | 'kind_la'
  | 'payload_cam'
  | 'payload_qua_nhieu_khoa';

export type KetQuaLoc = {
  events: SuKienSach[];
  /** Số sự kiện bị bỏ — đi ra response để client/CI thấy được. */
  dropped: number;
  /** Bỏ vì lý do gì, bao nhiêu cái. Chỉ chứa lý do thực sự xảy ra. */
  reasons: Partial<Record<LyDoBo, number>>;
};

const KHOA_CAM: ReadonlySet<string> = new Set(KHOA_CAM_PAYLOAD);

/** Cắt một chuỗi về `tran` ký tự, giữ dấu `…` để người đọc biết nó đã bị cắt. */
export function catChuoi(value: string, tran: number): string {
  return value.length <= tran ? value : value.slice(0, tran - 1) + '…';
}

function chuoiHoacNull(value: unknown, tran: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t ? catChuoi(t, tran) : null;
}

/**
 * `lesson_no` phải là SỐ NGUYÊN DƯƠNG hoặc null.
 *
 * Không nhận chuỗi số: `'12'` vào cột INTEGER thì Prisma ném, và một sự kiện
 * ném là cả `createMany` của lô đó thất bại — chính thứ nguyên tắc 1 cấm.
 */
function soBaiHoacNull(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value > 0 && value <= 100_000 ? value : null;
}

/**
 * Giờ client báo. Lệch quá `GIOI_HAN.lechClientAtMs` so với giờ máy chủ thì
 * trả null — BỎ CỘT, không bỏ sự kiện.
 *
 * Vì sao phải chặn cả hai chiều: một mốc năm 2097 (đồng hồ máy đặt sai, hoặc
 * client gửi giây thay vì milli giây) phá mọi câu SQL có `BETWEEN`, và nó phá
 * trong im lặng — câu truy vấn vẫn chạy, chỉ là một hàng nằm ngoài mọi khoảng
 * thời gian được hỏi.
 *
 * CHÚ Ý: việc một mốc bị null KHÔNG làm mất khả năng xếp thứ tự, vì mốc dùng
 * để so giữa người học là mốc SUY RA từ cặp `clientAt`/`clientSentAt` cùng
 * `createdAt` của máy chủ — xem khối "BA DẤU THỜI GIAN" trong
 * learning-event-kinds.ts.
 */
export function gioClientHoacNull(
  value: unknown,
  bayGio = Date.now(),
): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.abs(t - bayGio) <= GIOI_HAN.lechClientAtMs ? new Date(t) : null;
}

/**
 * Cắt trần một giá trị trong payload. Nhận: chuỗi (cắt), số hữu hạn, boolean,
 * null, và MẢNG của những thứ đó (cắt số phần tử).
 *
 * Mọi thứ khác — object lồng, hàm, NaN, Infinity, BigInt — trả `undefined`,
 * nghĩa là khoá đó bị bỏ. Vì sao KHÔNG cho object lồng: trần "số khoá" chỉ đếm
 * được một tầng, nên một object lồng sâu vẫn lách qua được mọi trần ở đây.
 * Payload phẳng là trần duy nhất đếm được.
 *
 * `NaN`/`Infinity` bị bỏ vì `JSON.stringify` của chúng ra `null`: để lọt thì
 * cột `payload` có một khoá giá trị null mà không ai biết nó đã từng là NaN.
 *
 * Kiểu trả về là `unknown` (không viết `unknown | undefined`: `unknown` đã phủ
 * `undefined`, và viết cả hai là `no-redundant-type-constituents`). Hợp đồng
 * thật nằm ở đây: `undefined` nghĩa là BỎ KHOÁ, `null` nghĩa là giữ giá trị
 * null. Hai thứ đó khác nhau, nên chỗ gọi phải so `!== undefined` chứ không
 * dùng `??`.
 */
export function catGiaTri(value: unknown): unknown {
  if (value === null) return null;
  if (typeof value === 'string') return catChuoi(value, GIOI_HAN.kyTuChuoi);
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value.slice(0, GIOI_HAN.phanTuMang)) {
      if (item === null) out.push(null);
      else if (typeof item === 'string')
        out.push(catChuoi(item, GIOI_HAN.kyTuChuoi));
      else if (typeof item === 'number' && Number.isFinite(item))
        out.push(item);
      else if (typeof item === 'boolean') out.push(item);
      // Phần tử không hợp lệ bị BỎ, mảng vẫn giữ — một ca trượt gửi sai hình
      // dạng không được làm mất danh sách ca trượt còn lại.
    }
    return out;
  }
  return undefined;
}

/**
 * Lọc một sự kiện. Trả `null` kèm lý do khi phải bỏ.
 *
 * Thứ tự kiểm CÓ Ý NGHĨA: `eid` và `kind` trước payload, vì chúng quyết định
 * sự kiện có khử trùng được và có đếm được hay không, còn payload hỏng thì
 * phần lớn vẫn cứu được.
 */
export function locSuKien(
  raw: unknown,
  bayGio = Date.now(),
): { ok: true; event: SuKienSach } | { ok: false; reason: LyDoBo } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'khong_phai_object' };
  }
  const o = raw as Record<string, unknown>;
  // Thiếu/sai `eid` là BỎ, không phải tự sinh hộ: máy chủ sinh hộ nghĩa là
  // hàng đó không khử trùng được, mà `accepted`/`duplicates` vẫn trông đáng tin.
  if (typeof o.eid !== 'string' || !RE_UUID_V4.test(o.eid)) {
    return { ok: false, reason: 'eid_la' };
  }
  if (!laKindHopLe(o.kind)) return { ok: false, reason: 'kind_la' };

  let payload: Record<string, unknown> | null = null;
  const rawPayload = o.payload;
  if (
    rawPayload &&
    typeof rawPayload === 'object' &&
    !Array.isArray(rawPayload)
  ) {
    const vao = rawPayload as Record<string, unknown>;
    const khoa = Object.keys(vao);
    // Quá nhiều khoá là BỎ CẢ SỰ KIỆN, không phải cắt bớt khoá: một payload 400
    // khoá nghĩa là phía client đang đổ một object lạ vào đây, nên giữ lại 24
    // khoá đầu chỉ tạo ra một hàng vô nghĩa mà trông như hợp lệ.
    if (khoa.length > GIOI_HAN.khoaPayload) {
      return { ok: false, reason: 'payload_qua_nhieu_khoa' };
    }
    // Khoá CẤM là BỎ CẢ SỰ KIỆN. Đây là chốt chặn cuối của luật "không bao giờ
    // ghi mã nguồn của người học, kể cả dạng hash" (xem KHOA_CAM_PAYLOAD): bỏ
    // lặng khoá đó rồi vẫn ghi hàng là để lọt một bản sửa nửa vời ở frontend mà
    // không ai thấy.
    for (const k of khoa) {
      if (KHOA_CAM.has(k)) return { ok: false, reason: 'payload_cam' };
    }
    const ra: Record<string, unknown> = {};
    for (const k of khoa) {
      const v = catGiaTri(vao[k]);
      if (v !== undefined) ra[catChuoi(k, 64)] = v;
    }
    payload = Object.keys(ra).length ? ra : null;
  }

  return {
    ok: true,
    event: {
      eventId: o.eid.toLowerCase(),
      kind: o.kind,
      courseId: chuoiHoacNull(o.courseId, GIOI_HAN.kyTuCourseId),
      lessonNo: soBaiHoacNull(o.lessonNo),
      screenKey: chuoiHoacNull(o.screenKey, GIOI_HAN.kyTuScreenKey),
      payload,
      clientAt: gioClientHoacNull(o.clientAt, bayGio),
    },
  };
}

/** Số BYTE (UTF-8) của một thứ sau khi JSON hoá. Không phải số ký tự. */
export function soByte(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');
}

/**
 * Lọc cả lô. Lô quá lớn / không phải mảng thì NÉM (BadRequestException) —
 * `throw` chứ không `res.json()` thủ công, để filter ở gateway định dạng
 * response (quy tắc 3 trong src/api-gateway/README.md).
 *
 * HAI trần, vì chúng chặn hai kiểu lạm dụng khác nhau: SỐ LƯỢNG chặn một lô
 * 5 000 sự kiện bé, BYTE chặn một lô 3 sự kiện mà mỗi cái mang 20 MB. Chỉ có
 * trần số lượng thì cái thứ hai đi qua.
 */
export function locLo(raw: unknown, bayGio = Date.now()): KetQuaLoc {
  if (!Array.isArray(raw)) {
    throw new BadRequestException('Trường `events` phải là một mảng sự kiện.');
  }
  if (raw.length > GIOI_HAN.suKienMoiLo) {
    throw new BadRequestException(
      `Một lô tối đa ${GIOI_HAN.suKienMoiLo} sự kiện, nhận được ${raw.length}.`,
    );
  }
  const byte = soByte(raw);
  if (byte > GIOI_HAN.byteMoiLo) {
    throw new BadRequestException(
      `Một lô tối đa ${GIOI_HAN.byteMoiLo} byte, nhận được ${byte}.`,
    );
  }
  const events: SuKienSach[] = [];
  const reasons: Partial<Record<LyDoBo, number>> = {};
  let dropped = 0;
  for (const item of raw) {
    const r = locSuKien(item, bayGio);
    if (r.ok) events.push(r.event);
    else {
      dropped += 1;
      reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
    }
  }
  return { events, dropped, reasons };
}
