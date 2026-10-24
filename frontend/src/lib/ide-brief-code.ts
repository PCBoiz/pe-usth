// Chọn đoạn mã mà nút "Thử ngay trong IDE" ở màn ĐỀ BÀI gửi sang /ide.
//
// Vì sao cần hẳn một file: hai môi trường chạy KHÁC NHAU, và chỗ nào quên điều
// đó là người học nhận một IDE chết.
//
//   · Bài học chạy Pyodide trong trình duyệt + studio-harness.py — có tkinter
//     MÔ PHỎNG, subprocess/threading mô phỏng, numpy/pandas/matplotlib tải sẵn.
//   · IDE nay CŨNG chạy Pyodide trong trình duyệt, KHÔNG còn Docker. Khác biệt
//     còn lại chỉ là: IDE không có studio-harness.py, nên không có phần MÔ PHỎNG.
//
// DANH SÁCH NÀY TỪNG NGƯỢC HẲN, và đó là hậu quả của lần chuyển sang client:
// bản cũ viết theo ảnh Docker `python:3.12-slim` (có threading/multiprocessing/
// subprocess thật, không có matplotlib). Đo lại trong Chrome 155 ngày
// 25/10/2026 trên chính /ide:
//
//   matplotlib 3.10.8  CHẠY ĐƯỢC (dựng được Figure)   ← trước đây bị CHẶN
//   numpy 2.4.6        CHẠY ĐƯỢC
//   pandas 3.0.2       CHẠY ĐƯỢC
//   sqlite3            CHẠY ĐƯỢC (bản 314 đưa vào stdlib)
//   threading          RuntimeError: can't start new thread   ← trước đây CHO QUA
//   multiprocessing    ModuleNotFoundError: _multiprocessing  ← trước đây CHO QUA
//   subprocess         OSError 138: emscripten does not support processes
//   os.fork            OSError 52: Function not implemented
//   tkinter            ModuleNotFoundError (giới hạn WASM, không phải thiếu wheel)
//
// Nên bài GUI và bài process/thread KHÔNG hiện nút: thà thiếu nút còn hơn mở
// tab mới rồi để người học đọc một traceback không phải lỗi của họ. Bài vẽ biểu
// đồ thì NGƯỢC LẠI — nay chạy được, nên không còn lý do chặn.
//
// PHẠM VI THẬT, đừng phóng to: hai hàm trong file này chỉ được gọi từ màn
// `brief` (screens/index.tsx) và màn `explain` (ExplainScreen.tsx), mà bộ 172
// bài đang xuất bản KHÔNG có màn nào trong hai màn đó — đếm được: 0/172 bài có
// `step_1.brief`, 0/172 có `step_2.one.code.source`; chúng dùng
// `step_1:{read,context}` · `step_2:{practice}` · `step_4:{task,starterCode}`.
// Nên hôm nay luật này không ẩn/hiện nút cho một người học nào. Vẫn sửa, vì một
// luật ghi lại kiến trúc ĐÃ BỎ chính là thứ sẽ âm thầm sai vào ngày pe-v4 được
// bật lại, hoặc ngày bộ 172 bài thêm một màn đề bài.

/**
 * Thư viện sandbox của IDE không chạy được. Nhận ra bằng chính dòng import.
 *
 * `_studio` là API của studio-harness.py, chỉ có trong bài học. Ba cái còn lại
 * là giới hạn WASM, không phải thiếu wheel — xem bảng đo ở đầu file. `threading`
 * nằm trong danh sách dù IMPORT ĐƯỢC: `Thread.start()` mới ném, mà một bài dạy
 * thread thì chắc chắn gọi `start()`.
 */
const KHONG_CHAY_DUOC =
  /^\s*(?:import|from)\s+(tkinter|_studio|threading|multiprocessing|subprocess)\b/m;

/**
 * Mã CHẠY ĐƯỢC trong sandbox của IDE hay không.
 *
 * Bắt theo dòng `import` chứ không bắt theo tên xuất hiện đâu đó trong file:
 * chú thích hay chuỗi có chữ "matplotlib" thì không làm chương trình chết.
 */
export function chayDuocTrongIde(code: string | undefined): boolean {
  return Boolean(code?.trim()) && !KHONG_CHAY_DUOC.test(code as string);
}

/** Đúng phần của bài mà hàm dưới cần — không buộc phải là cả StudioLesson. */
export type BriefCodeLesson = {
  step_1?: { brief?: { code?: string; tests?: string[] } };
  step_4?: {
    starterCode?: string;
    tests?: { call?: string; expect?: string }[];
    files?: { name?: string; content?: string }[];
  };
};

/**
 * Trần cho phần mã tự tạo file dữ liệu. File lớn nhất của bài hiện nay là 385
 * byte (sales.csv), nên 8000 là rất rộng — có trần ở đây để một bài về sau mang
 * bộ dữ liệu lớn không âm thầm thổi địa chỉ bàn giao vượt giới hạn rồi làm nút
 * biến mất mà không ai hiểu vì sao.
 */
const TRAN_FILE_KEM_THEO = 8000;

/**
 * Mã Python tự ghi ra các file dữ liệu mà bài cần đọc.
 *
 * Vì sao phải có: đo ngày 13/10/2026 bằng cách chạy THẬT starterCode của cả 48
 * bài qua sandbox — PD03, PD08, PD09 chết với FileNotFoundError: sales.csv.
 * Luật tĩnh "bắt theo dòng import" KHÔNG thấy được lỗi này vì không có import
 * nào sai cả: trong bài học, file do harness của Studio tạo sẵn
 * (`step_4.files`), còn sandbox của IDE chỉ có đúng file mã của người học. Đây
 * chính là lý do phải ĐO chứ không đọc code mà đoán.
 *
 * Nội dung nhúng bằng JSON.stringify: chuỗi JSON cũng là chuỗi Python hợp lệ
 * (cùng cách thoát xuống dòng, dấu nháy kép, dấu chéo ngược), nên không phải tự
 * viết bộ thoát ký tự. Và `newline=""` là BẮT BUỘC — sales.csv cố ý dùng CRLF
 * để dạy chuyện dữ liệu bẩn; để Python tự dịch dòng là làm hỏng đúng thứ bài
 * đang dạy.
 */
function maTaoFile(files: { name?: string; content?: string }[]): string | null {
  const dung = files.filter((f) => f.name && typeof f.content === 'string');
  if (!dung.length) return null;
  const tong = dung.reduce((n, f) => n + (f.content as string).length, 0);
  if (tong > TRAN_FILE_KEM_THEO) return null;
  return [
    '# Bài này đọc file dữ liệu. Trong bài học file đó do Studio tạo sẵn; ở IDE',
    '# thì mấy dòng dưới đây tự ghi ra, để chạy được y như vậy.',
    '#',
    '# Phải chuyển sang /tmp trước: container chạy --read-only nên thư mục làm',
    '# việc (/code) KHÔNG ghi được — đã đo, ghi thẳng ra đó là OSError [Errno 30]',
    '# "Read-only file system". Chuyển cwd thay vì ghi đường dẫn tuyệt đối để',
    '# open("<tên file>") trong bài vẫn đúng y như khi chạy ở Studio.',
    'import os as _os, tempfile as _tf',
    '_os.chdir(_tf.mkdtemp())',
    'from pathlib import Path as _P',
    ...dung.map(
      (f) =>
        `_P(${JSON.stringify(f.name)}).write_text(${JSON.stringify(f.content)}, encoding="utf-8", newline="")`,
    ),
    '',
  ].join('\n');
}

/**
 * Mã bàn giao cho màn đề bài, hoặc null nếu không nên hiện nút.
 *
 * KHÔNG gửi `brief.code`: đó là bản RÚT GỌN để đọc — thân hàm là `...` và dữ
 * liệu mẫu cũng là `...`, nên mở trong IDE bấm Chạy thì xong trong 0,2 giây và
 * không in gì. Người học tưởng IDE hỏng.
 *
 * Gửi `step_4.starterCode`: cùng một bài, nhưng là chương trình ĐẦY ĐỦ — dữ
 * liệu mẫu thật, thân hàm `pass` kèm chú thích gợi ý, và khối `__main__` gọi cả
 * ba hàm. Chạy ngay được, in ra `None` cho tới khi người học điền vào — tức là
 * đầu ra THAY ĐỔI theo việc họ làm, đúng vòng lặp mà W3Schools "Try it Yourself"
 * tạo ra.
 *
 * Phần chú thích đầu nói rõ cần in ra gì, lấy từ chính bộ test chấm bài, để họ
 * biết đích mà không phải quay lại tab bài học.
 */
export function ideCodeChoDeBai(lesson: BriefCodeLesson | null | undefined): string | null {
  const starter = lesson?.step_4?.starterCode;
  if (!chayDuocTrongIde(starter)) return null;

  const ca = (lesson?.step_4?.tests ?? [])
    .filter((t) => t.call && t.expect)
    .slice(0, 4)
    .map((t) => `#   ${t.call}  →  ${t.expect}`);
  if (!ca.length) return starter as string;

  // File dữ liệu kèm theo: không dựng được đoạn tạo file (quá lớn) thì THÀ
  // KHÔNG hiện nút, chứ đừng gửi chương trình chắc chắn chết vì thiếu file.
  const taoFile = maTaoFile(lesson?.step_4?.files ?? []);
  if ((lesson?.step_4?.files ?? []).length && !taoFile) return null;

  return [
    '# Thử ngay: điền thân hàm rồi bấm Chạy. Cần ra đúng những kết quả này:',
    ...ca,
    '',
    ...(taoFile ? [taoFile] : []),
    starter as string,
  ].join('\n');
}
