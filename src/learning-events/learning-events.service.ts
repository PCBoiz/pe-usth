import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  canHoiLai,
  conHieuLuc,
  PHIEN_BAN_DONG_Y,
  type BanGhiDongY,
} from './learning-event-consent';
import {
  gioClientHoacNull,
  locLo,
  type KetQuaLoc,
  type SuKienSach,
} from './learning-events.sanitize';

export type KetQuaGhi = {
  ok: true;
  /** Số sự kiện THẬT SỰ được chèn (đã trừ bản trùng). */
  accepted: number;
  /** Số sự kiện bị bỏ vì sai hình dạng — lô vẫn được nhận. */
  dropped: number;
  /**
   * Số sự kiện đã có trong DB nên không chèn lại. Đây là một SỐ ĐO, không phải
   * một lỗi: nó bằng số lần client gửi lại một lô mà nó không biết là đã tới.
   */
  duplicates: number;
  reasons: KetQuaLoc['reasons'];
  /**
   * Cả lô bị bỏ vì người học CHƯA đồng ý (hoặc đã rút lại, hoặc đồng ý với một
   * phiên bản khác). Chỉ có mặt khi điều đó xảy ra, nên client phân biệt được
   * "đã ghi 0 sự kiện vì lô rỗng" với "không được ghi".
   */
  refused?: 'no-consent';
};

export type TrangThaiDongY = {
  /** Lớp ghi được phép chạy ngay bây giờ. */
  granted: boolean;
  /** Nên hiện hộp xin đồng ý. KHÁC `!granted` — xem `canHoiLai()`. */
  shouldAsk: boolean;
  /** Phiên bản bản mô tả hiện hành; client hiện nó ra và gửi lại khi quyết. */
  version: string;
};

/**
 * Ghi nhật ký lần thử.
 *
 * MỘT câu `createMany` cho cả lô, không vòng lặp insert. Lý do là số đo của
 * chính dự án này: mỗi truy vấn tới Neon mất ~237 ms round-trip (xem
 * `prisma.service.ts`), nên 20 sự kiện ghi từng cái là ~4,7 giây giữ một
 * connection trong pool — cho một việc mà người học không chờ kết quả.
 * `createMany` là MỘT round-trip.
 *
 * `skipDuplicates: true` là CẦN, không phải cho đẹp: nó dịch thành
 * `ON CONFLICT DO NOTHING` trên `uq_learning_events_event_id`. Một lô gửi lúc
 * trang ẩn có thể TỚI máy chủ nhưng phản hồi không về kịp, nên client gửi lại
 * — không có nó thì lần hai ném lỗi khoá trùng và CẢ LÔ mất, có nó thì lần hai
 * là no-op. Và `count` nó trả về là số hàng THẬT SỰ chèn, nên hiệu số cho ra
 * `duplicates` miễn phí.
 */
@Injectable()
export class LearningEventsService {
  private readonly logger = new Logger(LearningEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param sentAt `clientSentAt` — giờ CLIENT lúc nó gửi LÔ này (một giá trị
   * cho cả lô, đúng như `stm` của Snowplow). Cùng với `clientAt` của từng sự
   * kiện, nó cho phép tính mốc suy ra mà không phụ thuộc đồng hồ máy người học.
   */
  async record(
    userId: number,
    raw: unknown,
    sentAt?: unknown,
  ): Promise<KetQuaGhi> {
    // Lọc TRƯỚC khi chạm DB: lô quá lớn thì ném ở đây, không tốn một vòng DB.
    const { events, dropped, reasons } = locLo(raw);
    const clientSentAt = gioClientHoacNull(sentAt);

    // CỔNG ĐỒNG Ý, và nó phải ở ĐÂY chứ không chỉ ở client.
    //
    // Cổng duy nhất trước bản này là `let dongY = false` trong
    // frontend/src/lib/learning-events.ts — một cổng ở client, nên nó không nói
    // được ai đã đồng ý/lúc nào/với điều gì, nó mất cùng localStorage, và nó
    // không chặn được một request gửi tay. Dữ liệu theo dõi hành vi là dữ liệu
    // NHẠY CẢM theo Luật 91/2025, nên chỗ quyết định phải là chỗ KHÔNG giả mạo
    // được — đúng lý lẽ đã dùng cho kho quiz chấm ở server.
    //
    // Trả về 202 kèm `refused`, KHÔNG ném 403: lớp này là ghi-rồi-quên, frontend
    // không đọc body trên đường đi chính và `.catch()` nuốt mọi lỗi — nên một
    // 403 sẽ biến mất không dấu vết, trong khi một trường trong body còn đọc
    // được từ log HTTP và từ bộ test. Và đây KHÔNG phải lỗi của client: lô có
    // thể đang trên đường khi người học bấm rút lại.
    //
    // Giá phải trả, có chủ đích: MỘT vòng DB thêm cho mỗi lô. Ở nhịp dày nhất
    // (360 lô/giờ/người, xem chú thích rate-limit ở controller) đó là 360 truy
    // vấn index-only trên một bảng vài chục hàng — nhỏ hơn hẳn cái giá của việc
    // ghi một sự kiện không được phép ghi.
    if (!conHieuLuc(await this.banGhiDongY(userId))) {
      // KHÔNG log warn: "chưa đồng ý" là trạng thái BÌNH THƯỜNG của mọi người
      // học chưa trả lời hộp xin đồng ý, nên log nó là tự tạo một dòng warn mỗi
      // 10 giây cho mỗi người — rồi warn thật chìm trong đó.
      return {
        ok: true,
        accepted: 0,
        dropped: dropped + events.length,
        duplicates: 0,
        reasons,
        refused: 'no-consent',
      };
    }

    let accepted = 0;
    if (events.length) {
      const res = await this.prisma.learningEvent.createMany({
        data: events.map((e) => this.hang(userId, e, clientSentAt)),
        skipDuplicates: true,
      });
      accepted = res.count;
    }
    const duplicates = events.length - accepted;

    // Có sự kiện bị bỏ là dấu hiệu frontend đang gửi sai hình dạng, và lớp này
    // hỏng trong IM LẶNG (người học không thấy gì, API vẫn 202). Nên log một
    // dòng warn — đây là chỗ duy nhất chuyện đó lộ ra khi chạy thật.
    if (dropped) {
      this.logger.warn(
        `Bỏ ${dropped}/${dropped + events.length} sự kiện của user ${userId}: ` +
          JSON.stringify(reasons),
      );
    }

    return { ok: true, accepted, dropped, duplicates, reasons };
  }

  /**
   * Quyết định MỚI NHẤT của người học, hoặc `null` nếu chưa bao giờ được hỏi.
   *
   * `orderBy: { createdAt: 'desc' }` chứ không `{ id: 'desc' }`: hai hàng của
   * cùng một người có thể vào trong cùng một millisecond (bấm đúp), nhưng thứ
   * tự phải theo THỜI ĐIỂM QUYẾT — đó là thứ `created_at` nói, và là thứ index
   * `idx_log_consents_user_created` phủ. `id` tình cờ cùng thứ tự hôm nay, và
   * "tình cờ đúng" là thứ sẽ lệch ngày ai đó nhập dữ liệu cũ vào bảng.
   */
  private async banGhiDongY(userId: number): Promise<BanGhiDongY> {
    const ban = await this.prisma.learningEventConsent.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { granted: true, version: true },
    });
    return ban ?? null;
  }

  /** Trạng thái để client biết có phải hiện hộp xin đồng ý không. */
  async trangThaiDongY(userId: number): Promise<TrangThaiDongY> {
    const ban = await this.banGhiDongY(userId);
    return {
      granted: conHieuLuc(ban),
      shouldAsk: canHoiLai(ban),
      version: PHIEN_BAN_DONG_Y,
    };
  }

  /**
   * Ghi một quyết định. Luôn THÊM hàng, không bao giờ cập nhật — xem chú thích
   * append-only ở migration 20261028020000.
   *
   * `version` do MÁY CHỦ đặt, không nhận từ body. Nếu client gửi phiên bản thì
   * một client cũ (hoặc một request gửi tay) sẽ ghi được "đã đồng ý với phiên
   * bản hiện hành" trong khi hộp nó hiện ra là bản mô tả CŨ — tức bản ghi nói
   * sai về điều người học thật sự đã đọc, và đó đúng là thứ cột này tồn tại để
   * nói đúng.
   */
  async ghiDongY(userId: number, granted: boolean): Promise<TrangThaiDongY> {
    await this.prisma.learningEventConsent.create({
      data: { userId, granted, version: PHIEN_BAN_DONG_Y },
    });
    return this.trangThaiDongY(userId);
  }

  /**
   * Một hàng `learning_events`. `userId` lấy từ JWT, KHÔNG từ body — client
   * không được tự khai mình là ai, nếu không thì một tài khoản khách ghi được
   * log mang tên người khác và mọi phép đếm "số người riêng biệt" thành vô
   * nghĩa.
   */
  private hang(
    userId: number,
    e: SuKienSach,
    clientSentAt: Date | null,
  ): Prisma.LearningEventCreateManyInput {
    return {
      eventId: e.eventId,
      userId,
      kind: e.kind,
      courseId: e.courseId,
      lessonNo: e.lessonNo,
      screenKey: e.screenKey,
      // `?? Prisma.DbNull` chứ không `?? undefined`: với cột JSONB nullable,
      // `undefined` nghĩa là "không đặt cột này" còn `Prisma.DbNull` là NULL
      // thật trong DB. Để `undefined` thì cột nhận giá trị mặc định, và ở đây
      // không có mặc định nào — hàng vẫn NULL, nhưng vì một lý do khác, nên khi
      // ai đó thêm DEFAULT cho cột thì hành vi đổi mà không có gì đỏ.
      payload: (e.payload as Prisma.InputJsonValue) ?? Prisma.DbNull,
      clientAt: e.clientAt,
      clientSentAt,
    };
  }
}
