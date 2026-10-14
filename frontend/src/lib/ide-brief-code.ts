// Chọn đoạn mã mà nút "Chạy thử ở Bàn thí nghiệm" ở màn ĐỀ BÀI gửi sang /ide.
//
// Vì sao cần hẳn một file: hai môi trường chạy KHÁC NHAU, và chỗ nào quên điều
// đó là người học nhận một IDE chết.
//
//   · Bài học chạy Pyodide trong trình duyệt + studio-harness.py — có tkinter
//     MÔ PHỎNG, subprocess/threading mô phỏng, numpy/pandas/matplotlib tải sẵn.
//   · IDE chạy CPython 3.12 THẬT trong Docker. Đo ngày 13/10/2026 trên chính
//     sandbox đang phục vụ: có numpy, pandas, sqlite3, threading, multiprocessing,
//     subprocess — nhưng KHÔNG có matplotlib, và tkinter thì import được tên
//     nhưng nổ "libtk8.6.so: cannot open shared object file" vì container không
//     có thư viện Tk lẫn màn hình.
//
// Nên bài vẽ biểu đồ và bài GUI KHÔNG hiện nút: thà thiếu nút còn hơn mở tab
// mới rồi để người học đọc một traceback không phải lỗi của họ. Ngược lại, bài
// process/thread chạy trong IDE còn ĐÚNG HƠN trong bài học — ở đó là mô phỏng,
// ở đây là PID và thread thật.

/** Thư viện sandbox của IDE không chạy được. Nhận ra bằng chính dòng import. */
const KHONG_CHAY_DUOC = /^\s*(?:import|from)\s+(matplotlib|tkinter|_studio)\b/m;

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
 * Mã Python tự ghi ra các file mà bài cần có sẵn bên cạnh chương trình.
 *
 * Vì sao phải có: đo ngày 13/10/2026 bằng cách chạy THẬT starterCode của cả 48
 * bài qua sandbox — PD03, PD08, PD09 chết với FileNotFoundError: sales.csv.
 * Luật tĩnh "bắt theo dòng import" KHÔNG thấy được lỗi này vì không có import
 * nào sai cả: trong bài học, file do harness của Studio tạo sẵn
 * (`step_4.files`), còn sandbox của IDE chỉ có đúng file mã của người học. Đây
 * chính là lý do phải ĐO chứ không đọc code mà đoán.
 *
 * HAI LOẠI FILE, và chú thích phải nói đúng loại. Bản trước coi MỌI phần tử
 * `step_4.files` là "file dữ liệu bài cần ĐỌC". Sai từ lúc T05 được thêm
 * `race_demo.py`: bấm nút ở T05 sinh ra mã mở đầu bằng câu "Bài này đọc file
 * dữ liệu" trong khi T05 không `open()` gì cả. Chú thích sai do CODE sinh ra
 * cho người học đọc còn tệ hơn không có chú thích. Nay phân biệt:
 *   · không phải `.py` → file DỮ LIỆU, bài sẽ `open()` nó (sales.csv…);
 *   · đuôi `.py`       → file MÃ kèm theo, bài chạy nó làm process con hoặc
 *     import nó (P04 `sum_numbers.py`, T05 `race_demo.py`).
 * Cả hai loại vẫn cần `chdir` — đó KHÔNG phải chuyện đọc dữ liệu mà là chuyện
 * có chỗ GHI (xem chú thích trong mã sinh ra). Riêng file `.py` còn cần thư
 * mục đó nằm trong `sys.path`, vì sau `chdir` thì `sys.path[0]` vẫn là thư mục
 * của file đang chạy, không phải thư mục làm việc — thiếu dòng đó là
 * `import race_demo` nổ ModuleNotFoundError.
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

  const laMa = (f: { name?: string }) => /\.py$/i.test(f.name ?? '');
  const fileMa = dung.filter(laMa);
  const fileDuLieu = dung.filter((f) => !laMa(f));
  const ten = (fs: { name?: string }[]) => fs.map((f) => f.name).join(', ');

  // Một câu, nói đúng thứ bài thật sự cần — không hứa "đọc dữ liệu" khi bài
  // chỉ có file mã kèm theo.
  const moTa = fileDuLieu.length && fileMa.length
    ? `đọc file dữ liệu (${ten(fileDuLieu)}) và cần file mã kèm theo (${ten(fileMa)})`
    : fileMa.length
      ? `cần file mã kèm theo (${ten(fileMa)})`
      : `đọc file dữ liệu (${ten(fileDuLieu)})`;

  return [
    `# Bài này ${moTa}. Trong bài học, Studio tạo sẵn mấy file đó; ở Bàn thí`,
    '# nghiệm thì mấy dòng dưới đây tự ghi ra, để chạy được y như vậy.',
    '#',
    '# Phải chuyển sang /tmp trước: container chạy --read-only nên thư mục làm',
    '# việc (/code) KHÔNG ghi được — đã đo, ghi thẳng ra đó là OSError [Errno 30]',
    '# "Read-only file system". Chuyển cwd thay vì ghi đường dẫn tuyệt đối để',
    '# open("<tên file>") trong bài vẫn đúng y như khi chạy ở Studio.',
    'import os as _os, tempfile as _tf',
    '_os.chdir(_tf.mkdtemp())',
    // Sau chdir, sys.path[0] vẫn là thư mục của file đang chạy; thiếu dòng này
    // thì `import <file kèm theo>` nổ ModuleNotFoundError.
    ...(fileMa.length
      ? [
        '# Thư mục vừa chuyển tới phải nằm trong sys.path để import được file',
        '# mã kèm theo: sau chdir, sys.path[0] vẫn là thư mục của file đang chạy.',
        'import sys as _sys',
        '_sys.path.insert(0, _os.getcwd())',
      ]
      : []),
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
    '# Điền thân hàm rồi bấm Chạy. Cần ra đúng những kết quả này:',
    ...ca,
    '',
    ...(taoFile ? [taoFile] : []),
    starter as string,
  ].join('\n');
}
