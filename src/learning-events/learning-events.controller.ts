import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { IsArray, IsISO8601, IsOptional } from 'class-validator';
import { Throttle, seconds } from '@nestjs/throttler';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';

import { LearningEventsService } from './learning-events.service';

/**
 * Body của một LÔ.
 *
 * `unknown[]` chứ không một DTO cho từng sự kiện, có chủ đích:
 * `ValidationPipe` toàn cục có `forbidNonWhitelisted: true`, nên một DTO lồng
 * sẽ TỪ CHỐI CẢ REQUEST khi một sự kiện mang khoá lạ — ngược hẳn yêu cầu "một
 * sự kiện hỏng không được làm mất cả lô". Việc lọc từng sự kiện nằm ở
 * `learning-events.sanitize.ts`, nơi nó bỏ từng cái và đếm lại.
 */
export class RecordEventsDto {
  @IsArray({ message: 'Trường `events` phải là một mảng sự kiện.' })
  events!: unknown[];

  /**
   * Giờ CLIENT lúc nó gửi LÔ NÀY — `stm` của Snowplow. MỘT giá trị cho cả lô,
   * không phải một giá trị mỗi sự kiện: nó là mốc "gửi", và cả lô gửi một lần.
   *
   * Cùng với `clientAt` của từng sự kiện, nó cho mốc SUY RA
   * `createdAt - (clientSentAt - clientAt)` — mốc duy nhất so được giữa người
   * học, vì hai mốc client đọc từ cùng một đồng hồ nên hiệu của chúng đúng dù
   * giờ máy họ lệch. Optional vì một client cũ không gửi nó thì chỉ mất mốc suy
   * ra, không mất sự kiện.
   */
  @IsOptional()
  @IsISO8601({}, { message: '`sentAt` phải là mốc thời gian ISO 8601.' })
  sentAt?: string;
}

/**
 * `@Controller('events')` — KHÔNG `api/v1/events`. Prefix/version là tài sản
 * độc quyền của gateway (`api-gateway.setup.ts` đặt `setGlobalPrefix('api')`),
 * nên đường thật là `POST /api/events`. Xem src/api-gateway/README.md.
 */
@Controller('events')
export class LearningEventsController {
  constructor(private readonly events: LearningEventsService) {}

  /**
   * 202 Accepted, không 200: lớp này là ghi-rồi-quên. Frontend không đọc body,
   * không `await` trên đường đi chính, và một lượt ghi thất bại không được làm
   * vỡ bài học. 202 nói đúng điều đó với bất kỳ ai đọc log HTTP sau này.
   *
   * RATE LIMIT — đọc trước khi đổi con số:
   * `CustomThrottlerGuard.getTracker()` đếm theo `user:${sub}` khi đã có
   * `req.user`, và route này KHÔNG `@Public()` nên luôn có. Vì vậy quota ở đây
   * là theo TÀI KHOẢN, không theo IP — chuyện đó quan trọng với đợt thử nghiệm:
   * cả phòng máy ngồi chung một NAT thì quota theo IP sẽ hết đúng lúc 40 người
   * cùng học (đúng bẫy mà `@Post('guest')` đã phải nới lên 120).
   *
   * 600 lô/giờ/tài khoản, và con số đi ra từ một phép tính: frontend đẩy mỗi
   * 10 giây HOẶC mỗi 20 sự kiện, cái nào tới trước, và đồng hồ chỉ chạy khi có
   * sự kiện đang chờ. Ca dày nhất (học liên tục, bấm Chạy liên tục) là 360
   * lô/giờ; nhịp nghỉ (chỉ heartbeat 30 giây) là 120. 600 là ~1,7 lần ca dày
   * nhất — đủ chỗ cho lô đẩy khi họ nhảy qua lại nhiều bài, và vẫn chặn được
   * một vòng lặp gửi hỏng ở phía client.
   *
   * Vì sao phải CÓ trần dù đã có trần kích thước: OWASP API4:2023 nói endpoint
   * nhận LÔ là hình dạng write-amplifier (nhiều tác vụ trong một request để
   * lách giới hạn tính theo request), nên trần số lượng, trần byte và
   * rate-limit phải đi cùng nhau. OWASP KHÔNG nói trần bằng bao nhiêu — con số
   * 600 là quyết định kỹ thuật, phép tính ở trên là lý do.
   *
   * Ngưỡng đọc THẲNG từ `process.env`: `@Throttle` là decorator nên giá trị
   * phải tính được lúc nạp class, TRƯỚC khi ConfigModule validate. Biến vẫn
   * phải khai trong `env.validation.ts` để app từ chối khởi động khi nó sai —
   * `THROTTLE_EVENTS_LIMIT=` để trống thì `?? 600` không áp (chuỗi rỗng không
   * phải undefined), `Number('')` ra 0, và MỌI lượt ghi bị 429.
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({
    ip_hour: {
      limit: Number(process.env.THROTTLE_EVENTS_LIMIT ?? 600),
      ttl: seconds(Number(process.env.THROTTLE_EVENTS_TTL_SECONDS ?? 3600)),
    },
  })
  record(@CurrentUserId() userId: number, @Body() dto: RecordEventsDto) {
    return this.events.record(userId, dto.events, dto.sentAt);
  }
}
