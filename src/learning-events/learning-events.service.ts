import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

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
