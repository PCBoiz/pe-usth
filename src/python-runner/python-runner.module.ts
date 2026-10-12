import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PythonRunnerAccessGuard,
  isRunnerPublic,
} from './python-runner-access.guard';
import { PythonRunnerController } from './python-runner.controller';
import { PythonRunnerService } from './python-runner.service';

@Module({
  controllers: [PythonRunnerController],
  providers: [PythonRunnerService, PythonRunnerAccessGuard],
})
export class PythonRunnerModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    // Cố ý KHÔNG chặn khởi động ở production: chủ dự án bảo vệ route bằng lớp
    // mạng (giới hạn IP / basic auth ở reverse proxy). Chỉ nói thật là nó đang mở.
    if (isRunnerPublic(this.config)) {
      new Logger('PythonRunner').warn(
        'PY_RUNNER_PUBLIC=true — POST /api/python/run đang CÔNG KHAI: ai tới được cổng này đều chạy được mã Python trên máy chủ. ' +
          'Hãy giới hạn bằng lớp mạng (IP allowlist / basic auth ở reverse proxy). ' +
          'Throttle tính theo IP: sau reverse proxy phải đặt TRUST_PROXY_HOPS, nếu không mọi người dùng chung một bộ đếm.',
      );
    }
  }
}
