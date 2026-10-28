// Giao diện "bộ chạy bài" — chỗ duy nhất phần React biết về việc chấm code.
//
// Vì sao tách ra: hôm nay Python chạy trong Worker + Pyodide ngay trên máy học
// viên (xem runner/pyodide-runner.ts). Kế hoạch sắp tới là có thêm một bộ chấm
// chạy trong Docker ở server. Mọi thứ phía trên chỉ được gọi qua `Runner` dưới
// đây, nên thay bộ chấm là viết một lớp mới cùng hợp đồng này, không phải sửa
// lại màn sandbox và các game chạy code.
import type {
  LessonContractCall,
  LessonFile,
  LessonTest,
  StudioPackage,
} from '@/lib/studio-lesson';

export type TestResult = { name: string; passed: boolean; detail: string };

export type RunResult = {
  tests: TestResult[];
  output: string;
  error?: string;
  /** Tóm tắt của bộ chấm về thread/process mô phỏng — hiện mờ dưới console. */
  notes?: string[];
  /**
   * PNG (base64) của những Figure chương trình vừa dựng ra, do
   * `studio-harness.py` xuất. Trần 6 hình / 1,5 MB đặt ở phía harness.
   */
  figures?: string[];
  duration: number;
  version: string;
};

/**
 * Một lượt chạy. Các trường này cũng chính là HỢP ĐỒNG THÔNG ĐIỆP với
 * public/static/js/studio-lesson.worker.js — tên trường cố định, đừng đổi:
 *   { code, tests, forbid, files, dataFiles, stdin, packages, contract }
 */
export type RunRequest = {
  code: string;
  tests: LessonTest[];
  /** Token bị cấm trong bài (worker chặn trước khi nạp runtime cho đỡ tốn). */
  forbid: string[];
  /** File đặt sẵn cạnh main.py mỗi lần chạy (chỉ đọc). */
  files: LessonFile[];
  /**
   * TÊN các file của bộ dữ liệu quán bài cần (`step_4.dataFiles`). Chỉ tên:
   * worker tải nội dung từ `/static/da-dulieu/` (cùng origin) rồi gộp vào
   * `files` trước khi chấm. Nội dung không đi qua đây — xem chú thích ở
   * studio-lesson.worker.js để biết vì sao (1,29 MB cho một file).
   */
  dataFiles?: string[];
  /**
   * Các dòng `input()` sẽ đọc lần lượt. Chưa có UI để học viên tự nhập ở lượt
   * này, nhưng bộ chấm trong worker đã nhận trường này — giữ nguyên để khi
   * thêm ô "dữ liệu vào" thì chỉ cần truyền mảng vào đây.
   */
  stdin?: string[];
  /**
   * Thư viện ngoài (numpy, pandas…) của bài. Worker tải + import sẵn rồi mới
   * báo 'ready', nên thời gian tải không bị tính vào 5 giây chạy code.
   */
  packages?: StudioPackage[];
  /**
   * Hợp đồng gọi khi `tests` là ca dạng DỮ LIỆU (`input`/`expected`).
   *
   * Phải đi CÙNG lượt chạy, không đọc từ đâu khác: bộ chấm cần nó TRƯỚC cả lần
   * chạy chính — bài `mode: "script"` có đề cấp sẵn một biến mà mã học viên
   * không gán, nên thiếu hợp đồng là NameError ngay dòng đầu.
   */
  contract?: LessonContractCall;
};

/** Hai mốc thời gian chờ, tách ra để lớp gọi đọc được chứ không chôn số. */
export type RunLimits = {
  /** Chờ runtime nạp xong (lần chạy nguội). */
  readyMs: number;
  /** Chờ code của học viên chạy xong — đây là cái cắt vòng lặp vô hạn. */
  execMs: number;
};

export const DEFAULT_LIMITS: RunLimits = { readyMs: 60000, execMs: 5000 };

export interface Runner {
  /** Nạp sẵn runtime (và thư viện của bài) khi học viên mới mở bài, trước khi họ bấm Chạy. */
  prewarm(packages?: StudioPackage[]): void;
  /**
   * Chạy một lượt. KHÔNG bao giờ reject: quá hạn hay lỗi hạ tầng đều trả về
   * RunResult có `error`, để phía UI chỉ phải xử lý một đường. Trả `null`
   * nghĩa là lượt chạy bị bỏ (người học bấm Dừng, hoặc rời trang) — khi đó
   * không có gì để hiện, giống nếp cũ.
   */
  run(request: RunRequest, onStatus?: (status: string) => void): Promise<RunResult | null>;
  /** Người học bấm Dừng. */
  cancel(): void;
  /** Rời trang. */
  dispose(): void;
}
