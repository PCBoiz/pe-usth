"""Hàm viết tắt + hằng môi trường khi soạn bài pe-v4 (khoá Python Advanced, 48 bài).

Giữ nguyên quy ước của scripts/pe-v3/authoring.py:

* Mã nguồn (demo, starter, solution, bad) viết bằng chuỗi THÔ r'''...''' để
  `"\n"` trong code giữ nguyên là hai ký tự, không thành xuống dòng thật.
* Ca chấm: T(tên, biểu thức gọi, GIÁ TRỊ Python mong đợi) — giá trị được
  repr() thành biểu thức `expect`. TX(...) khi muốn tự viết biểu thức expect.
* Biểu thức gọi chạy trong namespace của học viên, có sẵn `_studio` (xem
  frontend/public/static/js/studio-harness.py — phần đầu file liệt kê đủ API).

Các hằng *_ENV dưới đây là chữ hiện ở màn sandbox (`env=`) cho bài chạy bằng
bản MÔ PHỎNG trong trình duyệt. Viết chung một chỗ để 48 bài nói cùng một
giọng và để khi bộ mô phỏng đổi hành vi thì chỉ sửa một nơi.
"""


def T(name, call, value):
    return (name, call, repr(value))


def TX(name, call, expr):
    return (name, call, expr)


def out(*lines):
    """stdout gồm các dòng, mỗi dòng kết thúc bằng xuống dòng."""
    return ''.join(f'{line}\n' for line in lines)


def run(**kwargs):
    """Viết tắt `_studio.run(...)` cho ca chấm: run(vars={'n': 3})."""
    parts = [f'{key}={value!r}' for key, value in kwargs.items()]
    return '_studio.run(' + ', '.join(parts) + ')'


# ---------------------------------------------------------------- môi trường

SUBPROCESS_ENV = (
    'Trình duyệt không tạo được process thật, nên Studio MÔ PHỎNG subprocess: lệnh '
    '[sys.executable, "-c", code] hoặc [sys.executable, "ten_file.py", ...] chạy chương trình con trong '
    'một vùng nhớ riêng, có stdin/stdout/stderr riêng, returncode lấy từ sys.exit()/ngoại lệ, và '
    'time.sleep() của con chỉ đẩy một đồng hồ ảo (timeout vẫn được tính đúng). Lệnh shell khác '
    '(ls, dir, ping…) không chạy được ở đây. Hãy chạy lại file trên máy (Windows/Linux) để thấy process thật.'
)

MP_ENV = (
    'Trình duyệt không tạo được process thật, nên Studio MÔ PHỎNG multiprocessing: target của mỗi Process '
    'chạy ngay khi start() trên một BẢN SAO dữ liệu (đổi biến toàn cục trong con không ảnh hưởng cha, đúng '
    'như process thật); Queue/Value/Manager là kênh dùng chung. Thời gian đo bằng đồng hồ ảo: các process '
    'chạy song song nên tổng thời gian ≈ process lâu nhất. Trên Windows nhớ đặt code tạo process trong '
    'if __name__ == "__main__": — chạy thật trên máy để thấy khác biệt.'
)

THREAD_ENV = (
    'Trình duyệt không chạy được thread thật, nên Studio MÔ PHỎNG threading: target chạy lần lượt ngay khi '
    'start() và bộ chấm ghi lại thứ tự tạo / start / join. time.sleep() là đồng hồ ảo: các thread "ngủ" '
    'song song nên đo thời gian vẫn thấy lợi ích của thread với việc chờ I/O. Vì chạy lần lượt, '
    'producer phải start TRƯỚC consumer; một lệnh chờ không bao giờ được đáp (get() trên Queue rỗng, '
    'Event.wait() không ai set) sẽ dừng với thông báo deadlock thay vì treo. Hãy chạy thêm file trên máy '
    '— thứ tự dòng in của thread thật có thể khác mỗi lần.'
)

GUI_ENV = (
    'Trình duyệt không mở được cửa sổ Tkinter, nên Studio dùng một tkinter MÔ PHỎNG: widget, biến '
    '(StringVar…), pack/grid/place, command=, bind và after() được ghi lại để chấm; mainloop() trả về '
    'ngay sau khi chạy hết các lệnh after() đang chờ. Không có màn hình nên bạn không thấy cửa sổ — '
    'bộ chấm "bấm nút" thay bạn. Chạy file trên máy (python ten_file.py) để thấy giao diện thật.'
)

DA_ENV = (
    'Bài này dùng numpy / pandas / matplotlib chạy ngay trong trình duyệt (Pyodide). Lần đầu mở bài, '
    'trình duyệt tải thêm thư viện (vài MB) nên chờ lâu hơn một chút. Biểu đồ vẽ bằng backend Agg: '
    'plt.show() không mở cửa sổ, bộ chấm đọc thẳng tiêu đề, nhãn trục và dữ liệu của Figure. '
    'Chạy trên máy để xem hình.'
)

SQL_ENV = (
    'sqlite3 chạy thật trong trình duyệt (Pyodide): database ":memory:" hoặc file .db nằm trong thư mục '
    'tạm của lần chạy và mất khi chạy lại. Lần đầu dùng, trình duyệt tải thêm module sqlite3.'
)
