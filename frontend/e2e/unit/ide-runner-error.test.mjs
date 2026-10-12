/**
 * Unit test cho `isRunnerDown` — frontend/src/lib/runner-error.ts.
 *
 * Vì sao phải có: hàm này là chỗ duy nhất được phép NÓI KHÁC đi một kết quả
 * HTTP 200 của `POST /api/python/run`. Rộng quá thì nó che mất lỗi thật của mã
 * người học (đúng thứ Python IDE tồn tại để cho thấy); hẹp quá thì người dùng
 * thử lại đọc được "failed to connect to the docker API at npipe://…".
 *
 * Fixture là stderr THẬT của docker CLI và của CPython, không phải chuỗi bịa —
 * bẫy đã ghi trong AGENTS.md (`quizzes.service.spec.ts` từng test trên fixture
 * sai hình dạng nên lỗ lộ đáp án sống sót qua mọi lần chạy).
 *
 * Bằng chứng bộ test này bắt được lỗi thật (quy ước AGENTS.md: gỡ bản sửa ra,
 * test phải trượt):
 *  - Bỏ hẳn phần nhận diện (`return false` ngay đầu hàm — tức hành vi CŨ, dán
 *    thông điệp docker ra màn hình) → 4/9 ca trượt.
 *  - Nới cho rộng (bỏ hai điều kiện `result.stdout` và `/code/main.py`, tức
 *    chỉ cần stderr khớp dấu hiệu docker là coi là hạ tầng) → 2/9 ca trượt,
 *    đúng hai ca mô phỏng mã người học tự in chuỗi của docker ra stderr.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isRunnerDown } from '../../src/lib/runner-error.ts';

/** Kết quả chạy mặc định: chương trình chạy xong, không có gì bất thường. */
function outcome(over) {
  return {
    stdout: '',
    stderr: '',
    exitCode: 0,
    timedOut: false,
    outputTruncated: false,
    ...over,
  };
}

// ── Hạ tầng chưa sẵn sàng: phải nhận ra ─────────────────────────────────────

test('daemon tắt trên Windows (npipe) là lỗi hạ tầng', () => {
  assert.equal(
    isRunnerDown(
      outcome({
        exitCode: 1,
        stderr:
          'error during connect: Head "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/_ping": '
          + 'open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.\n',
      }),
    ),
    true,
  );
});

test('daemon tắt trên Linux (unix socket) là lỗi hạ tầng', () => {
  assert.equal(
    isRunnerDown(
      outcome({
        exitCode: 1,
        stderr:
          'Cannot connect to the Docker daemon at unix:///var/run/docker.sock. '
          + 'Is the docker daemon running?\n',
      }),
    ),
    true,
  );
});

test('máy chủ thiếu image py-sandbox là lỗi hạ tầng', () => {
  assert.equal(
    isRunnerDown(
      outcome({
        exitCode: 125,
        stderr:
          "Unable to find image 'py-sandbox:latest' locally\n"
          + 'docker: Error response from daemon: pull access denied for py-sandbox, '
          + 'repository does not exist or may require \'docker login\'.\n',
      }),
    ),
    true,
  );
});

test('user của backend không vào được docker socket là lỗi hạ tầng', () => {
  assert.equal(
    isRunnerDown(
      outcome({
        exitCode: 1,
        stderr:
          'permission denied while trying to connect to the Docker daemon socket at '
          + 'unix:///var/run/docker.sock\n',
      }),
    ),
    true,
  );
});

// ── Lỗi của MÃ người học: tuyệt đối không được che ───────────────────────────

test('traceback của người học KHÔNG phải lỗi hạ tầng', () => {
  assert.equal(
    isRunnerDown(
      outcome({
        exitCode: 1,
        stderr:
          'Traceback (most recent call last):\n'
          + '  File "/code/main.py", line 3, in <module>\n'
          + '    print(1 / 0)\n'
          + '          ~~^~~\n'
          + 'ZeroDivisionError: division by zero\n',
      }),
    ),
    false,
  );
});

test('SyntaxError KHÔNG phải lỗi hạ tầng', () => {
  assert.equal(
    isRunnerDown(
      outcome({
        exitCode: 1,
        stderr:
          '  File "/code/main.py", line 1\n'
          + "    print('xin chao'\n"
          + '         ^\n'
          + "SyntaxError: '(' was never closed\n",
      }),
    ),
    false,
  );
});

test('hết giờ KHÔNG phải lỗi hạ tầng (đã có cảnh báo riêng)', () => {
  assert.equal(
    isRunnerDown(outcome({ exitCode: null, stderr: '', timedOut: true })),
    false,
  );
});

// ── Hai ca giữ cho phần nhận diện HẸP ───────────────────────────────────────
// Mã người học tự in chuỗi của docker ra: không được coi là hạ tầng, vì nếu coi
// là thì đầu ra thật của chương trình bị thay bằng câu "đang được dựng".

test('người học tự in chuỗi của docker nhưng chạy xong (exit 0) thì giữ nguyên đầu ra', () => {
  assert.equal(
    isRunnerDown(
      outcome({
        exitCode: 0,
        stderr: 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock\n',
      }),
    ),
    false,
  );
});

test('có stdout thì chương trình đã chạy thật — không phải hạ tầng', () => {
  assert.equal(
    isRunnerDown(
      outcome({
        exitCode: 1,
        stdout: 'dang kiem tra ket noi...\n',
        stderr: 'error during connect: ket noi that bai\n',
      }),
    ),
    false,
  );
});
