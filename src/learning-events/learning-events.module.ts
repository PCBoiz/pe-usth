import { Module } from '@nestjs/common';

import { LearningEventsController } from './learning-events.controller';
import { LearningEventsService } from './learning-events.service';

/**
 * Lớp ghi nhật ký lần thử. Không import module nghiệp vụ nào: nó chỉ ghi, không
 * đọc tiến độ, không cộng XP, không chấm lại gì. Giữ nó rời ra là để một lỗi ở
 * đây không bao giờ với tới được đường hoàn thành bài.
 *
 * `exports` để sau này một module khác ghi được sự kiện phía server (ví dụ
 * `lessons` ghi `lesson_complete` mà client không giả mạo được); hôm nay chưa
 * ai dùng.
 */
@Module({
  controllers: [LearningEventsController],
  providers: [LearningEventsService],
  exports: [LearningEventsService],
})
export class LearningEventsModule {}
