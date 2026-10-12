import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';
import { Public } from 'src/common/decorators/public.decorators';
import { PythonRunnerAccessGuard } from './python-runner-access.guard';
import { RunCodeDto } from './dto/run-code.dto';
import { PythonRunnerService } from './python-runner.service';

// @Public() để JwtAuthGuard TOÀN CỤC bước sang bên; việc công khai hay đòi JWT do
// PythonRunnerAccessGuard quyết định theo PY_RUNNER_PUBLIC (mặc định tắt → vẫn
// đòi JWT). Chạy mã tuỳ ý trên máy chủ không được mở ngầm.
@Controller('python')
@Public()
@UseGuards(PythonRunnerAccessGuard)
export class PythonRunnerController {
  constructor(private readonly runner: PythonRunnerService) {}

  // Đè tier 'ip_hour' RIÊNG cho route này (cùng cách auth/login): 10 lượt/phút
  // mỗi IP (guard JWT cục bộ chạy SAU throttler toàn cục nên req.user chưa có,
  // CustomThrottlerGuard rơi về tracker theo IP — đúng ý khi route công khai). Giới hạn
  // đồng thời nằm ở service — throttle chỉ đếm số lần gọi, không đếm số
  // container đang sống.
  @Post('run')
  @HttpCode(HttpStatus.OK)
  @Throttle({ ip_hour: { limit: 10, ttl: seconds(60) } })
  run(@Body() dto: RunCodeDto) {
    return this.runner.run(dto.code);
  }
}
