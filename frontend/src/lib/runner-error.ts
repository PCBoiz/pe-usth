/**
 * Phân biệt "máy chủ chưa có chỗ chạy" với "mã của người học sai".
 *
 * Vì sao tách khỏi IdeClient.tsx: đây là chỗ duy nhất quyết định một kết quả
 * trả về bị NÓI KHÁC đi, nên nó phải test được. `node --test` bóc được kiểu
 * TypeScript nhưng không bóc JSX, nên logic nằm trong `.tsx` thì không có cách
 * nào test bằng bộ test hiện có (xem e2e/unit/ide-runner-error.test.mjs).
 */

/** Phần của kết quả chạy mà hàm dưới cần đọc; `RunResult` ở IdeClient là siêu tập. */
export type RunOutcomeLike = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
};

/**
 * Câu nói với NGƯỜI HỌC khi máy chủ không có chỗ chạy mã.
 *
 * Trước đây trang dán thẳng thông điệp của backend, nên người dùng thử đọc được
 * "failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine".
 * Câu đó nói về hạ tầng của chúng ta, không giúp gì người đang học và còn làm họ
 * tưởng mình gõ sai. Nói đúng việc đang xảy ra, rồi chỉ sang chỗ VẪN chạy được.
 */
export const RUNNER_UNAVAILABLE_MESSAGE =
  'Bộ chạy Python trên máy chủ đang được dựng nên IDE chưa chạy được mã. '
  + 'Các bài học trong khóa vẫn chạy Python bình thường ngay trong trình duyệt.';

/**
 * Dấu hiệu "không có bộ chạy" trong stderr của docker CLI (viết thường để so).
 * Mỗi dòng là một thông điệp thật của docker, không phải đoán cho đủ bộ.
 */
const RUNNER_DOWN_SIGNS = [
  'error during connect', // Windows: daemon tắt → npipe:////./pipe/dockerDesktopLinuxEngine
  'failed to connect to the docker api',
  'cannot connect to the docker daemon', // Linux: không ai nghe ở /var/run/docker.sock
  'is the docker daemon running',
  'permission denied while trying to connect to the docker daemon socket',
  'docker: not found',
  'docker: command not found',
  'unable to find image', // máy chủ thiếu image py-sandbox
  'pull access denied',
  'manifest unknown',
];

/** Đường dẫn file mã bên trong sandbox: mọi traceback của mã người học đều nhắc nó. */
const USER_CODE_PATH = '/code/main.py';

/**
 * Kết quả HTTP 200 này là lỗi HẠ TẦNG chứ không phải lỗi trong chương trình?
 *
 * Vì sao phải đoán: khi docker CLI có mặt nhưng daemon không trả lời, `docker run`
 * thoát khác 0 và stderr là thông điệp của docker. Backend trả NGUYÊN nó trong
 * RunResult với HTTP 200 — src/python-runner/sandbox/docker-sandbox.ts chỉ ném
 * SandboxError (→ 503) khi THIẾU HẲN docker CLI (ENOENT) — nên ô kết quả vẽ
 * thông điệp của docker y như một traceback của người học.
 *
 * Để HẸP cho khỏi che lỗi thật: phải không hết giờ, không bị cắt đầu ra, không
 * có stdout, mã thoát khác 0, stderr KHÔNG nhắc /code/main.py (mọi traceback hay
 * SyntaxError của mã người dùng đều nhắc đúng file đó) và khớp một dấu hiệu của
 * docker. Nguyên văn stderr vẫn được giữ trong <details> ở IdeClient, không xoá.
 */
export function isRunnerDown(result: RunOutcomeLike): boolean {
  if (result.timedOut || result.outputTruncated) return false;
  if (result.exitCode === 0 || result.stdout) return false;
  const err = result.stderr.toLowerCase();
  if (!err || err.includes(USER_CODE_PATH)) return false;
  return RUNNER_DOWN_SIGNS.some((sign) => err.includes(sign));
}
