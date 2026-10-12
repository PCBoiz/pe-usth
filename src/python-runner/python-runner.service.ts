import { Inject, Injectable } from '@nestjs/common';
import { PYTHON_EXECUTOR, type PythonExecutor } from './python-executor';
import type { RunResult } from './sandbox/docker-sandbox';

/**
 * Cửa vào của controller. Không biết mã chạy ở đâu — việc đó thuộc về executor
 * được chọn theo PY_RUNNER_MODE (xem python-runner.module.ts).
 */
@Injectable()
export class PythonRunnerService {
  constructor(
    @Inject(PYTHON_EXECUTOR) private readonly executor: PythonExecutor,
  ) {}

  run(code: string, signal?: AbortSignal): Promise<RunResult> {
    return this.executor.run(code, signal);
  }
}
