import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { IsArray, IsBoolean, IsISO8601, IsOptional } from 'class-validator';
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
 * Quyết định của người học về việc ghi nhật ký.
 *
 * CHỈ có `granted`. Phiên bản bản mô tả do MÁY CHỦ đặt — xem `ghiDongY()`: nhận
 * phiên bản từ body nghĩa là một client cũ ghi được "đã đồng ý với bản hiện
 * hành" trong khi hộp nó hiện ra là bản CŨ, tức bản ghi nói sai về điều người
 * học thật sự đã đọc.
 *
 * `@IsBoolean()` chứ không nhận chuỗi `'true'`: `granted` quyết định có được thu
 * thập dữ liệu nhạy cảm hay không, nên nó không được đi qua một phép ép kiểu
 * nào. `ValidationPipe` toàn cục có `forbidNonWhitelisted: true` nên một body
 * mang khoá lạ (ví dụ `version`) bị TỪ CHỐI thẳng — ở route này thì đó là hành
 * vi đúng, ngược với route nhận lô.
 */
export class SetConsentDto {
  @IsBoolean({ message: '`granted` phải là true hoặc false.' })
  granted!: boolean;
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

  /**
   * Trạng thái đồng ý. Client gọi nó khi mở bài học để biết có phải hiện hộp
   * xin đồng ý không — và để KHÔNG hỏi lại người đã từ chối.
   *
   * KHÔNG `@Public()`: trạng thái gắn với một tài khoản, và trang bài học vốn
   * đã có JWT (khách tự nhận tài khoản qua `ensureGuest`). Đặt `@Public()` ở đây
   * là mở một route cho mọi bot — và vì nó không đọc được ai thì nó cũng không
   * trả lời được gì.
   */
  @Get('consent')
  consent(@CurrentUserId() userId: number) {
    return this.events.trangThaiDongY(userId);
  }

  /**
   * Người học quyết: đồng ý, hoặc từ chối/rút lại.
   *
   * 200 chứ không 202: khác hẳn route ghi lô, đây là một hành động mà client
   * PHẢI biết kết quả — nó quyết định lớp ghi có bật hay không và hộp có còn
   * hiện nữa hay không. Response trả lại CHÍNH trạng thái vừa ghi, nên client
   * không phải tự suy ra (tự suy ra là tạo nguồn sự thật thứ hai, và nó sẽ lệch
   * đúng vào lúc phiên bản bản mô tả đổi).
   *
   * RATE LIMIT riêng và CHẶT: 20 lượt/giờ/tài khoản. Nó là một hành động của
   * người thật bấm nút — không ai quyết 20 lần trong một giờ — nhưng nó GHI vào
   * DB không có khoá unique nào (append-only, có chủ đích), nên một vòng lặp
   * hỏng ở client sẽ nhồi hàng vô hạn. Đây là chỗ duy nhất chặn chuyện đó.
   */
  @Post('consent')
  @Throttle({
    ip_hour: {
      limit: Number(process.env.THROTTLE_CONSENT_LIMIT ?? 20),
      ttl: seconds(Number(process.env.THROTTLE_CONSENT_TTL_SECONDS ?? 3600)),
    },
  })
  setConsent(@CurrentUserId() userId: number, @Body() dto: SetConsentDto) {
    return this.events.ghiDongY(userId, dto.granted);
  }
}
