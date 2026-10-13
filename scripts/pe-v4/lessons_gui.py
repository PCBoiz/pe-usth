"""Python Advanced (pe-v4) — chặng M3 "GUI Tkinter và dự án": G01–G06, R02 (Boss).

Nguồn: python-learning-data.json bài G01–G06, R02 (points / examples / quiz) và handbook
trang 78–89, 149–150; gốc là slide USTH (SL 300–327) và Python GUI Programming Cookbook 2nd
ed (CB chương 1–3, tr. 157–186, 225–259). Ví dụ nguồn dùng ttk.Button/ttk.Entry; bài ở đây
dùng tk.Button/tk.Entry (cùng cách dùng) vì bản tkinter mô phỏng của Studio chắc chắn có
chúng — ttk chỉ dùng cho Combobox.

Cách chấm GUI (không có màn hình): ca chấm tìm widget bằng _studio.tk.find(type=..., text=...),
"bấm" bằng invoke(), đọc chữ bằng cget('text'), đọc bố trí qua widget.manager / widget.layout,
hộp thông báo qua _studio.tk.messages, event loop qua _studio.tk.run_after(n=...). Logic tách
khỏi GUI (G05, R02) chấm bằng gọi thẳng hàm thuần. Ca dùng _studio.run(...) luôn đặt CUỐI danh
sách để không phụ thuộc việc bản mô phỏng có làm mới sổ widget giữa các lần chạy hay không.
"""
from authoring import T, TX, out, run  # noqa: F401

try:
    from authoring import GUI_ENV
except ImportError:  # authoring cũ (pe-v3) chưa có hằng này
    GUI_ENV = ('Trình duyệt không mở được cửa sổ Tkinter, nên Studio dùng một tkinter MÔ PHỎNG: widget, biến '
               '(StringVar…), pack/grid/place, command=, bind và after() được ghi lại để chấm; mainloop() trả về '
               'ngay sau khi chạy hết các lệnh after() đang chờ. Không có màn hình nên bạn không thấy cửa sổ — '
               'bộ chấm "bấm nút" thay bạn. Chạy file trên máy (python ten_file.py) để thấy giao diện thật.')

# G06: GUI + worker. Nói rõ điều học viên dễ hiểu nhầm nhất khi xem kết quả mô phỏng.
GUI_THREAD_ENV = (GUI_ENV + ' Thread cũng là mô phỏng: worker chạy xong ngay khi start(), còn after() chỉ xếp lời '
                  'gọi vào hàng đợi — bộ chấm chạy hàng đợi đó thay cho event loop. Trên máy thật worker chạy song '
                  'song và cửa sổ vẫn bấm, kéo được trong lúc chờ; hãy thử với n lớn để thấy khác biệt.')

R02_ENV = (GUI_ENV + ' Thread và subprocess cũng là mô phỏng: worker chạy xong ngay khi start(); process con chỉ chạy '
           'được [sys.executable, "report.py"] hoặc [sys.executable, "-c", code], có stdin/stdout/stderr riêng — lệnh shell '
           '(dir, ls…) không chạy. Chạy trên máy: lưu report.py cùng thư mục với bài và chạy lệnh từ thư mục đó (đường dẫn '
           '"report.py" là tương đối); trên Windows dữ liệu qua pipe dùng bảng mã mặc định của hệ điều hành, nên thử với '
           'tên không dấu.')

# ------------------------------------------------------------------ file cấp sẵn

REPORT_PY = r'''"""Báo cáo điểm — chạy như PROCESS CON.

Đọc stdin, mỗi dòng "tên,điểm"; in báo cáo ra stdout. Không có dòng dữ liệu nào thì
in lỗi ra stderr và thoát mã 1. Chữ in ra không dấu để pipe trên Windows không vấp bảng mã.
"""
import sys

rows = []
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    name, mark = line.rsplit(",", 1)
    rows.append((name, float(mark)))

if not rows:
    print("No data", file=sys.stderr)
    sys.exit(1)

for name, mark in rows:
    print(f"{name}: {mark}")
average = sum(mark for name, mark in rows) / len(rows)
print(f"Average: {average:.2f}")
'''

SUPPORT = {'report.py': REPORT_PY}


# ------------------------------------------------------------------ G01

G01_SOLUTION = r'''import tkinter as tk

app_title = "Student system"
size = "800x600"

root = tk.Tk()
root.title(app_title)
root.geometry(size)

details = tk.Toplevel(root)
details.title("Details")
details.geometry("400x300")

root.mainloop()
'''

# ------------------------------------------------------------------ G02

G02_HEAD = r'''import tkinter as tk
from tkinter import messagebox

PASSWORD = "usth2026"

root = tk.Tk()
root.title("Đăng nhập")
frame = tk.Frame(root)
frame.pack()

tk.Label(frame, text="Tên").pack()
user_entry = tk.Entry(frame, width=24)
user_entry.pack()

tk.Label(frame, text="Mật khẩu").pack()
'''

G02_SOLUTION = G02_HEAD + r'''password_entry = tk.Entry(frame, width=24, show="*")
password_entry.pack()

status = tk.Label(frame, text="Chưa đăng nhập")
status.pack()


def login():
    user = user_entry.get().strip()
    if password_entry.get() == PASSWORD:
        status.config(text=f"Xin chào {user}")
        messagebox.showinfo("Đăng nhập", f"Chào mừng {user}!")
    else:
        status.config(text="Sai mật khẩu")


tk.Button(frame, text="Đăng nhập", command=login).pack()

root.mainloop()
'''


def _g02_login(user, password):
    """Gõ hai Entry, bấm nút, đọc status — trong MỘT biểu thức."""
    return ("(user_entry.delete(0, 'end'), user_entry.insert(0, %r), password_entry.delete(0, 'end'), "
            "password_entry.insert(0, %r), _studio.tk.find(type='Button', text='Đăng nhập').invoke(), "
            "status.cget('text'))[-1]" % (user, password))


# ------------------------------------------------------------------ G03

G03_HEAD = r'''import tkinter as tk
from tkinter import ttk, messagebox

root = tk.Tk()
root.title("Nhập điểm")

name_var = tk.StringVar()
mark_var = tk.StringVar()
exam_var = tk.StringVar(value="Giữa kỳ")
retake_var = tk.BooleanVar(value=False)

tk.Label(root, text="Họ tên").pack()
tk.Entry(root, textvariable=name_var).pack()
tk.Label(root, text="Điểm (0-10)").pack()
tk.Entry(root, textvariable=mark_var).pack()

course_box = ttk.Combobox(root, values=["Python", "Data", "Web"], state="readonly")
course_box.set("Python")
course_box.pack()
'''

G03_TAIL = r'''
tk.Checkbutton(root, text="Thi lại", variable=retake_var).pack()

marks_list = tk.Listbox(root, height=6)
marks_list.pack()
status = tk.Label(root, text="Chưa có điểm")
status.pack()
'''

G03_SOLUTION = G03_HEAD + r'''
for text in ["Giữa kỳ", "Cuối kỳ"]:
    tk.Radiobutton(root, text=text, value=text, variable=exam_var).pack()
''' + G03_TAIL + r'''

def add_mark():
    name = name_var.get().strip()
    if name == "":
        messagebox.showwarning("Thiếu họ tên", "Hãy nhập họ tên")
        return
    raw = mark_var.get().strip().replace(",", ".")
    try:
        mark = float(raw)
    except ValueError:
        messagebox.showerror("Điểm không hợp lệ", f"'{raw}' không phải là số")
        return
    if not 0 <= mark <= 10:
        messagebox.showerror("Điểm không hợp lệ", "Điểm phải trong khoảng 0..10")
        return
    line = f"{name} | {course_box.get()} | {exam_var.get()} | {mark}"
    if retake_var.get():
        line += " | thi lại"
    marks_list.insert(tk.END, line)
    status.config(text=f"Đã nhập {marks_list.size()} điểm")


tk.Button(root, text="Thêm", command=add_mark).pack()

root.mainloop()
'''


def _g03_add(name, mark, course='Python', exam='Giữa kỳ', retake=False):
    """Điền form như người dùng (biến + Radiobutton), bấm Thêm, trả dòng cuối Listbox."""
    return ("(name_var.set(%r), mark_var.set(%r), course_box.set(%r), "
            "_studio.tk.find(type='Radiobutton', text=%r).invoke(), retake_var.set(%r), "
            "_studio.tk.find(type='Button', text='Thêm').invoke(), "
            "marks_list.get(marks_list.size() - 1))[-1]" % (name, mark, course, exam, retake))


def _g03_reject(name, mark, kind):
    """(số dòng thêm vào, số hộp thông báo mới, hộp cuối đúng loại?) — mong đợi (0, 1, True)."""
    return ("(lambda n, m: (" + _g03_add(name, mark) + ", (marks_list.size() - n, len(_studio.tk.messages) - m, "
            "%r in str(_studio.tk.messages[-1][0]) if _studio.tk.messages else False))[1])"
            "(marks_list.size(), len(_studio.tk.messages))" % kind)


# ------------------------------------------------------------------ G04

G04_SOLUTION = r'''import tkinter as tk

FIELDS = ["Họ tên", "Ngày sinh", "Điểm"]


def build_form(parent, fields):
    entries = {}
    for row, text in enumerate(fields):
        tk.Label(parent, text=text).grid(row=row, column=0, sticky="w", padx=4, pady=2)
        entry = tk.Entry(parent)
        entry.grid(row=row, column=1, sticky="ew", padx=4, pady=2)
        entries[text] = entry
    tk.Button(parent, text="Lưu").grid(row=len(fields), column=0, columnspan=2, pady=4)
    return entries


root = tk.Tk()
root.title("Hồ sơ sinh viên")
root.geometry("360x220")

form = tk.Frame(root)
form.pack(fill="x", padx=8, pady=8)
entries = build_form(form, FIELDS)

toolbar = tk.Frame(root)
toolbar.pack(side="bottom", fill="x")
tk.Button(toolbar, text="Mở").pack(side="left")
tk.Button(toolbar, text="Thoát").pack(side="right")

badge = tk.Label(root, text="v1.0")
badge.place(relx=1.0, rely=0.0, anchor="ne")

root.mainloop()
'''

G04_STARTER = r'''import tkinter as tk

FIELDS = ["Họ tên", "Ngày sinh", "Điểm"]


def build_form(parent, fields):
    entries = {}
    # Mỗi field một hàng: Label ở cột 0 (sticky="w"), Entry ở cột 1 (sticky="ew").
    # Lưu Entry vào entries[tên field]. Nút "Lưu" ở hàng len(fields), chiếm 2 cột.
    return entries


root = tk.Tk()
root.title("Hồ sơ sinh viên")
root.geometry("360x220")

# form: Frame trong root, pack(fill="x"); rồi entries = build_form(form, FIELDS)
# toolbar: Frame trong root, pack(side="bottom", fill="x"); nút "Mở" bên trái, "Thoát" bên phải
# badge: Label "v1.0" đặt bằng place ở góc trên phải (relx=1.0, rely=0.0, anchor="ne")

root.mainloop()
'''

# ------------------------------------------------------------------ G05

G05_LOGIC = r'''import tkinter as tk
from tkinter import messagebox


def validate_mark(raw):
    mark = float(raw)
    if not 0 <= mark <= 10:
        raise ValueError("Outside 0..10")
    return mark


def summary(marks):
    if not marks:
        return "Chưa có điểm"
    average = sum(marks) / len(marks)
    return f"{len(marks)} điểm, trung bình {average:.2f}"
'''

G05_APP = r'''

class App:
    def __init__(self, root):
        self.root = root
        self.marks = []
        self.mark_var = tk.StringVar()
        self.create_widgets()

    def create_widgets(self):
        tk.Entry(self.root, textvariable=self.mark_var).pack()
        tk.Button(self.root, text="Thêm điểm", command=self.add_mark).pack()
        self.result = tk.Label(self.root, text=summary(self.marks))
        self.result.pack()

    def add_mark(self):
        try:
            mark = validate_mark(self.mark_var.get())
        except ValueError as error:
            messagebox.showerror("Điểm không hợp lệ", str(error))
            return
        self.marks.append(mark)
        self.result.config(text=summary(self.marks))


if __name__ == "__main__":
    root = tk.Tk()
    root.title("Điểm trung bình")
    app = App(root)
    root.mainloop()
'''

G05_SOLUTION = G05_LOGIC + G05_APP

G05_STARTER = r'''import tkinter as tk
from tkinter import messagebox


def validate_mark(raw):
    # Hàm THUẦN: chuỗi -> float trong 0..10; sai thì raise ValueError. Không đụng tới widget.
    pass


def summary(marks):
    # Hàm THUẦN: [] -> "Chưa có điểm"; [8, 7] -> "2 điểm, trung bình 7.50"
    pass


class App:
    def __init__(self, root):
        self.root = root
        self.marks = []
        self.mark_var = tk.StringVar()
        self.create_widgets()

    def create_widgets(self):
        tk.Entry(self.root, textvariable=self.mark_var).pack()
        # Nút "Thêm điểm" gọi self.add_mark; Label self.result hiện summary(self.marks).

    def add_mark(self):
        # validate_mark(self.mark_var.get()); sai -> messagebox.showerror; đúng -> append, cập nhật nhãn.
        pass


if __name__ == "__main__":
    root = tk.Tk()
    root.title("Điểm trung bình")
    app = App(root)
    root.mainloop()
'''

G05_BAD_VALIDATE = r'''def validate_mark(raw):
    try:
        mark = float(raw)
    except ValueError:
        messagebox.showerror("Lỗi", "Điểm phải là số")
        return None
    if not 0 <= mark <= 10:
        messagebox.showerror("Lỗi", "Điểm phải trong 0..10")
        return None
    return mark
'''

G05_TAP = "_studio.tk.find(type='Button', text='Thêm điểm')"

K_VALIDATE_MARK = dict(sig='validate_mark(raw)', does='Đổi chuỗi người dùng gõ thành điểm hợp lệ.',
                       takes='raw: str (có thể có khoảng trắng hai đầu)',
                       gives='float trong 0..10; không phải số hoặc ngoài khoảng → ValueError',
                       effect='Hàm thuần: không đọc/ghi widget, không bật messagebox.',
                       call='validate_mark("8.5") → 8.5; validate_mark("11") → ValueError')
K_SUMMARY = dict(sig='summary(marks)', does='Tạo chữ tóm tắt cho nhãn kết quả.',
                 takes='marks: list[float]', gives='"Chưa có điểm" nếu rỗng; ngược lại "<n> điểm, trung bình <tb 2 số lẻ>"',
                 effect='Hàm thuần, không sửa marks.', call='summary([8, 7]) → "2 điểm, trung bình 7.50"')
K_APP = dict(sig='App(root)', does='Gói giao diện: Entry gắn self.mark_var, nút "Thêm điểm", nhãn self.result.',
             takes='root: cửa sổ Tk', gives='object có self.marks (list riêng), self.mark_var, self.result',
             effect='add_mark(): hợp lệ → thêm vào self.marks và cập nhật nhãn; sai → showerror, không thêm.',
             call='App(tk.Tk()).result.cget("text") → "Chưa có điểm"')

# ------------------------------------------------------------------ G06

G06_HEAD = r'''import threading
import tkinter as tk
from queue import Queue, Empty


def slow_total(n):
    total = 0
    for number in range(1, n + 1):
        total += number
    return total


'''

G06_WORKER = r'''def worker(n, q):
    q.put(slow_total(n))
'''

G06_GUI = r'''

root = tk.Tk()
root.title("Tác vụ nền")
q = Queue()
n_var = tk.StringVar(value="1000000")
tk.Entry(root, textvariable=n_var).pack()
status = tk.Label(root, text="Sẵn sàng")
status.pack()
'''

G06_SOLUTION = G06_HEAD + G06_WORKER + G06_GUI + r'''

def poll_result():
    try:
        total = q.get_nowait()
    except Empty:
        root.after(100, poll_result)
        return
    status.config(text=f"Tổng = {total}")


def start_task():
    raw = n_var.get().strip()
    if not raw.isdigit():
        status.config(text="n phải là số nguyên không âm")
        return
    status.config(text="Đang tính...")
    threading.Thread(target=worker, args=(int(raw), q), daemon=True).start()
    root.after(100, poll_result)


tk.Button(root, text="Tính", command=start_task).pack()

root.mainloop()
'''

G06_STARTER = G06_HEAD + r'''def worker(n, q):
    # Chạy ở thread nền: tính slow_total(n) rồi gửi kết quả qua queue q. Không đụng widget.
    pass
''' + G06_GUI + r'''

def poll_result():
    # Chạy ở thread GUI (qua after): lấy kết quả bằng q.get_nowait();
    # queue rỗng -> hẹn lại root.after(100, poll_result); có kết quả -> status "Tổng = ...".
    pass


def start_task():
    # n không phải số nguyên không âm -> status "n phải là số nguyên không âm".
    # Hợp lệ -> status "Đang tính...", start Thread chạy worker (KHÔNG join), rồi hẹn poll_result.
    pass


tk.Button(root, text="Tính", command=start_task).pack()

root.mainloop()
'''

G06_TAP = "_studio.tk.find(type='Button', text='Tính')"


def _g06_click(n):
    """Đặt n, bấm Tính, ghi nhận chữ ngay sau khi bấm, chạy event loop ảo, ghi nhận chữ sau đó."""
    return ("(n_var.set(%r), %s.invoke(), status.cget('text'), _studio.tk.run_after(n=5), status.cget('text'))"
            % (n, G06_TAP))


# ------------------------------------------------------------------ R02

R02_FUNCS = r'''import gzip
import pickle
import subprocess
import sys
import threading
import tkinter as tk
from queue import Queue, Empty
from tkinter import messagebox

DATA_FILE = "marks.dat"


def validate(name, raw_mark):
    name = name.strip()
    if not name:
        raise ValueError("Tên trống")
    mark = float(raw_mark.strip().replace(",", "."))
    if not 0 <= mark <= 10:
        raise ValueError("Điểm phải trong 0..10")
    return name, mark


def save_marks(marks, path):
    with gzip.open(path, "wb") as f:
        pickle.dump(marks, f)


def load_marks(path):
    try:
        with gzip.open(path, "rb") as f:
            return pickle.load(f)
    except FileNotFoundError:
        return {}


def run_report(marks):
    lines = "".join(f"{name},{mark}\n" for name, mark in marks.items())
    result = subprocess.run([sys.executable, "report.py"], input=lines,
                            capture_output=True, text=True, timeout=10)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())
    return result.stdout


def save_worker(marks, path, done):
    try:
        save_marks(marks, path)
    except OSError as error:
        done.put(("error", str(error)))
    else:
        done.put(("ok", len(marks)))


def start_save(marks, path, done):
    saver = threading.Thread(target=save_worker, args=(dict(marks), path, done))
    saver.start()
    return saver
'''

R02_APP_HEAD = r'''

class App:
    def __init__(self, root, path=DATA_FILE):
        self.root = root
        self.path = path
        self.marks = load_marks(path)
        self.done = Queue()
        self.saver = None
        self.name_var = tk.StringVar()
        self.mark_var = tk.StringVar()
        self.create_widgets()

    def create_widgets(self):
        form = tk.Frame(self.root)
        form.pack(fill="x")
        tk.Label(form, text="Tên").grid(row=0, column=0)
        tk.Entry(form, textvariable=self.name_var).grid(row=0, column=1)
        tk.Label(form, text="Điểm").grid(row=1, column=0)
        tk.Entry(form, textvariable=self.mark_var).grid(row=1, column=1)
        buttons = tk.Frame(self.root)
        buttons.pack(fill="x")
        tk.Button(buttons, text="Thêm", command=self.add).pack(side="left")
        tk.Button(buttons, text="Lưu", command=self.save).pack(side="left")
        tk.Button(buttons, text="Báo cáo", command=self.report).pack(side="left")
        self.status = tk.Label(self.root, text=f"Đã nạp {len(self.marks)} sinh viên")
        self.status.pack()
        self.output = tk.Label(self.root, text="")
        self.output.pack()
'''

R02_MAIN = r'''

if __name__ == "__main__":
    root = tk.Tk()
    root.title("Sổ điểm mini")
    app = App(root)
    root.mainloop()
    app.wait_for_save()
'''

R02_SOLUTION = R02_FUNCS + R02_APP_HEAD + r'''
    def add(self):
        try:
            name, mark = validate(self.name_var.get(), self.mark_var.get())
        except ValueError as error:
            messagebox.showerror("Dữ liệu không hợp lệ", str(error))
            return
        self.marks[name] = mark
        self.status.config(text=f"Có {len(self.marks)} sinh viên")

    def save(self):
        self.status.config(text="Đang lưu...")
        self.saver = start_save(self.marks, self.path, self.done)
        self.root.after(100, self.poll_save)

    def poll_save(self):
        try:
            kind, info = self.done.get_nowait()
        except Empty:
            self.root.after(100, self.poll_save)
            return
        if kind == "ok":
            self.status.config(text=f"Đã lưu {info} sinh viên")
        else:
            self.status.config(text=f"Lỗi lưu: {info}")

    def report(self):
        try:
            text = run_report(self.marks)
        except (RuntimeError, subprocess.TimeoutExpired) as error:
            messagebox.showerror("Báo cáo", str(error))
            return
        self.output.config(text=text)

    def wait_for_save(self):
        if self.saver is not None:
            self.saver.join()
''' + R02_MAIN

R02_STARTER = r'''import gzip
import pickle
import subprocess
import sys
import threading
import tkinter as tk
from queue import Queue, Empty
from tkinter import messagebox

DATA_FILE = "marks.dat"


def validate(name, raw_mark):
    pass


def save_marks(marks, path):
    pass


def load_marks(path):
    pass


def run_report(marks):
    pass


def start_save(marks, path, done):
    pass
''' + R02_APP_HEAD.replace('self.marks = load_marks(path)', 'self.marks = {}  # PW5: nạp lại từ file khi khởi động') + r'''
    def add(self):
        pass

    def save(self):
        pass

    def poll_save(self):
        pass

    def report(self):
        pass

    def wait_for_save(self):
        pass
''' + R02_MAIN

R02_TAP = "_studio.tk.find(type='Button', text=%r)"


def _r02_add(name, mark):
    return ("app.name_var.set(%r), app.mark_var.set(%r), %s.invoke(), app.status.cget('text')"
            % (name, mark, R02_TAP % 'Thêm'))


K_R02 = [
    dict(sig='validate(name, raw_mark)', does='Kiểm và chuẩn hoá một dòng nhập trước khi đưa vào dữ liệu.',
         takes='name, raw_mark: str như người dùng gõ (raw_mark có thể dùng dấu phẩy "7,5")',
         gives='(tên đã strip, float 0..10); tên trống / không phải số / ngoài khoảng → ValueError',
         effect='Hàm thuần.', call='validate(" Mai ", "8.5") → ("Mai", 8.5)'),
    dict(sig='save_marks(marks, path) / load_marks(path)', does='PW5–PW6: lưu dict điểm bằng pickle, nén gzip; nạp lại.',
         takes='marks: dict tên → điểm; path: tên file', gives='load_marks: dict; file chưa có → {}',
         effect='Ghi/đọc file nhị phân nén gzip (2 byte đầu 1f 8b).',
         call='save_marks({"Lan": 9.25}, "t.dat"); load_marks("t.dat") → {"Lan": 9.25}'),
    dict(sig='run_report(marks)', does='PW7: chạy report.py trong process con, gửi dữ liệu qua stdin.',
         takes='marks: dict', gives='str — stdout của process con; con thoát mã khác 0 → RuntimeError(stderr)',
         effect='subprocess.run([sys.executable, "report.py"], input=..., capture_output=True, text=True, timeout=...)',
         call='run_report({"Mai": 8.5, "An": 7.0}) → "Mai: 8.5\\nAn: 7.0\\nAverage: 7.75\\n"'),
    dict(sig='start_save(marks, path, done)', does='PW8: lưu ở worker thread để giao diện không đứng.',
         takes='marks: dict (worker nhận BẢN SAO); path; done: Queue',
         gives='Thread đã start (KHÔNG join)',
         effect='Worker gọi save_marks; xong → done.put(("ok", số sinh viên)); OSError → done.put(("error", thông báo)).',
         call='t = start_save({"Mai": 8.0}, "t.dat", q) → q nhận ("ok", 1)'),
    dict(sig='App(root, path=DATA_FILE)', does='PW9: giao diện Tkinter gọi các hàm trên.',
         takes='root: Tk; path: file dữ liệu',
         gives='self.marks (nạp từ path), self.status, self.output, self.saver',
         effect='add: validate → self.marks; save: "Đang lưu..." + start_save + after(poll_save); poll_save: '
                '"Đã lưu <n> sinh viên"; report: self.output = run_report(...); wait_for_save: join worker trước khi thoát.',
         call='Bấm Lưu → "Đang lưu..." → (event loop) → "Đã lưu 2 sinh viên"'),
]


# Lý thuyết viết NGẮN, không phải vì thiếu chỗ mà vì đã xem người học đọc: màn `theory` là
# MỘT thẻ, bốn khối chữ dài đẩy sơ đồ xuống dưới màn hình và học viên cuộn qua luôn. Nên mỗi
# khối chỉ một định nghĩa (body tối đa 2 câu) hoặc tối đa 3 gạch đầu dòng, rồi để sơ đồ và ví
# dụ code dạy nốt; chi tiết từng dòng đã có ở `explain`. Hai thứ KHÔNG được cắt: lời nhắc
# Studio chạy tkinter GIẢ (không vẽ cửa sổ, bộ chấm soi cây widget — người dạy không biết điều
# này sẽ phán code đúng của sinh viên là sai), và ở R02 là tên bốn mảnh PW5–PW9 vì bài Boss bỏ
# màn `explain` nên lý thuyết là thứ duy nhất giới thiệu dự án. Cũng đừng viết "Slide nói
# gọn:…" — nói thẳng bằng giọng mình, nguồn slide đã nằm ở khoá `slides`.
LESSONS = [
    # ------------------------------------------------------------------ G01
    dict(
        code='G01', title='GUI, CLI và cửa sổ', minutes=25,
        goal='Tạo cửa sổ chính, cửa sổ phụ và giao quyền điều khiển cho vòng lặp sự kiện.',
        prereq=None, env=GUI_ENV,
        theory=[
            dict(h='Định nghĩa: GUI và CLI',
                 body='CLI nhận lệnh gõ trong terminal rồi in kết quả ra màn hình. GUI vẽ cửa sổ, nút, ô nhập '
                      'rồi CHỜ người dùng bấm hoặc gõ: dễ học hơn, đổi lại tốn bộ nhớ và chạy chậm hơn CLI.'),
            dict(h='Bốn phần của một app Tkinter',
                 bullets=['Cửa sổ: tk.Tk() là cửa sổ chính, tk.Toplevel(root) là cửa sổ phụ',
                          'Widget + layout: Label, Button, Entry… xếp bằng pack(), place() hoặc grid()',
                          'Event loop: mainloop() chặn tại chỗ, nhận sự kiện rồi gọi hàm xử lý']),
            dict(h='Dùng ở đâu — và Studio khác gì',
                 bullets=['Công cụ nội bộ: form nhập liệu, cửa sổ phụ cho Cài đặt hay Trợ giúp',
                          'Studio chạy tkinter GIẢ: không vẽ cửa sổ nào, bộ chấm soi cây widget thay bạn',
                          'mainloop() ở đây trả về ngay; thấy cửa sổ thật thì chạy python ten_file.py']),
            dict(h='Đọc sơ đồ',
                 body='Thanh tiêu đề mang chuỗi của title(), khung ngoài mang geometry("800x600") — rộng x cao, '
                      'chữ x thường. Cửa sổ phụ Toplevel có mũi tên trỏ về root: đóng root là nó đóng theo.',
                 figure='G01-window-anatomy'),
        ],
        figure=dict(name='G01-window-anatomy',
                    caption='Giải phẫu cửa sổ Tk: title, geometry và cửa sổ phụ Toplevel',
                    alt='Cửa sổ chính Tk với thanh tiêu đề, kích thước 800x600 và vùng nội dung rỗng; bên cạnh là cửa '
                        'sổ phụ Toplevel có mũi tên trỏ về root'),
        slides='SL 108-117',
        brief='Cho app_title = "Student system" và size = "800x600". Tạo cửa sổ chính root = tk.Tk(), đặt tiêu đề '
              'app_title và kích thước size; tạo cửa sổ phụ details bằng tk.Toplevel(root) với tiêu đề "Details", '
              'kích thước "400x300"; dòng cuối gọi root.mainloop().',
        example='app_title = "Student system" → root.title() trả "Student system"; details là Toplevel thuộc root.',
        demo=r'''import tkinter as tk

root = tk.Tk()
root.title("Máy tính bỏ túi")
root.geometry("320x200")
print("Tiêu đề:", root.title())

help_window = tk.Toplevel(root)
help_window.title("Trợ giúp")
print("Cửa sổ phụ thuộc root:", help_window.master is root)

print("Gọi mainloop...")
root.mainloop()
print("mainloop đã trả về: cửa sổ đã đóng")
''',
        explain=[
            'CLI chạy lệnh từ trên xuống rồi kết thúc; GUI vẽ cửa sổ rồi CHỜ người dùng bấm, gõ (sự kiện) để gọi hàm xử lý.',
            'Tkinter có sẵn trong Python nên các ví dụ dùng nó; PyQt, Kivy, wxPython là thư viện GUI khác cùng ý tưởng.',
            'tk.Tk() tạo cửa sổ CHÍNH (một cái cho cả chương trình); tk.Toplevel(root) tạo cửa sổ PHỤ thuộc root.',
            'title("...") và geometry("800x600") là lời gọi method: rộng x cao, chữ x thường. title() không đối số thì đọc lại tiêu đề.',
            'mainloop() là vòng lặp sự kiện: nó chặn tại chỗ và chỉ trả về khi cửa sổ chính đóng — nên đặt ở cuối chương trình.',
        ],
        predict=dict(q='Trên máy thật, dòng print đặt SAU root.mainloop() chạy khi nào?', options=[
            ('Khi người dùng đóng cửa sổ chính — mainloop chặn tới lúc đó', 'Event loop chạy bên trong mainloop().', True),
            ('Ngay lập tức, cùng lúc cửa sổ hiện ra', 'Chỉ Studio mô phỏng mới cho mainloop trả về ngay.', False),
            ('Không bao giờ chạy', 'Đóng cửa sổ thì mainloop trả về và code phía sau chạy tiếp.', False),
        ], code='root = tk.Tk()\nroot.mainloop()\nprint("Bye")'),
        myth=('"Muốn thêm cửa sổ thì gọi tk.Tk() lần nữa"',
              'Mỗi tk.Tk() khởi động một bộ thông dịch Tcl riêng: StringVar hay ảnh (PhotoImage) gắn với cửa sổ này không '
              'dùng được ở cửa sổ kia, lỗi rất khó hiểu. Cửa sổ phụ dùng tk.Toplevel(root). Cũng đừng viết root.title = "..." — đó là '
              'GHI ĐÈ method bằng một chuỗi: tiêu đề không đổi, còn root.title() sau đó nổ TypeError.'),
        mcq=[
            dict(q='Toplevel dùng để tạo gì?', options=[
                ('Một cửa sổ phụ thuộc ứng dụng Tk hiện tại', 'Đóng cửa sổ chính thì Toplevel đóng theo.', True),
                ('Cửa sổ chính thứ hai, độc lập hoàn toàn', 'Cửa sổ chính là tk.Tk(); Toplevel phụ thuộc root.', False),
                ('Một khung nằm bên trong cửa sổ', 'Đó là Frame; Toplevel là một cửa sổ riêng.', False),
            ]),
            dict(q='Khác biệt cốt lõi giữa chương trình CLI và GUI là gì?', options=[
                ('GUI chờ sự kiện trong event loop rồi gọi hàm xử lý; CLI chạy lệnh theo thứ tự', 'Vì thế GUI cần mainloop().', True),
                ('GUI luôn chạy nhanh hơn CLI', 'Tốc độ không phải khác biệt cốt lõi; GUI thường tốn bộ nhớ hơn.', False),
                ('CLI không nhận được dữ liệu từ người dùng', 'CLI nhận qua input() hoặc đối số dòng lệnh.', False),
            ]),
            dict(q='Viết root.title = "Student system" (không ngoặc) thì sao?', options=[
                ('Tiêu đề không đổi; root.title giờ là chuỗi nên root.title() nổ TypeError', 'Đó là phép gán, không gọi method.', True),
                ('Tiêu đề đổi như root.title("Student system")', 'Không có method nào được gọi.', False),
                ('SyntaxError ngay khi chạy', 'Cú pháp gán hợp lệ — lỗi chỉ lộ ra lúc dùng.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao root.mainloop() phải nằm ở cuối chương trình?',
            sample='mainloop() chặn tại chỗ để nhận và xử lý sự kiện cho tới khi cửa sổ chính đóng. Code đặt sau nó (tạo widget, '
                   'cửa sổ phụ) chỉ chạy khi người dùng đã đóng cửa sổ — quá muộn. Vì vậy tạo xong mọi cửa sổ, widget rồi mới '
                   'gọi mainloop(). Trường hợp đặc biệt: quên mainloop thì chạy bằng file, cửa sổ hiện rồi tắt ngay.'),
        scaffold=dict(
            intro='Dữ liệu mới: "Quản lý thư viện", 640x480. Lắp bốn lời gọi.',
            template=r'''import tkinter as tk

app_title = "Quản lý thư viện"
size = "640x480"

root = {{slot1}}
root.title(app_title)
{{slot2}}
details = {{slot3}}
details.title("Details")
{{slot4}}
''',
            slots=['tk.Tk()', 'root.geometry(size)', 'tk.Toplevel(root)', 'root.mainloop()'],
            traps=[('tk.Tk', 1, 'Thiếu ngoặc: root là class Tk chứ chưa phải cửa sổ.'),
                   ('root.geometry = size', 2, 'Ghi đè method bằng chuỗi; kích thước không đổi.'),
                   ('root.geometry("640*480")', 2, 'Kích thước dùng chữ x: "640x480" — dấu * làm Tk báo TclError.'),
                   ('root.mainloop', 4, 'Thiếu ngoặc: chỉ nhắc tên method, vòng lặp sự kiện không chạy.')]),
        flow=['tk.Tk() → tạo cửa sổ chính root',
              'root.title(app_title) → đặt chữ trên thanh tiêu đề',
              'tk.Toplevel(root) → tạo cửa sổ phụ thuộc root',
              'root.mainloop() → chờ sự kiện tới khi cửa sổ đóng'],
        transfer='Đổi app_title và size (vd. "Quản lý điểm", "640x480"); bộ chấm chạy lại chương trình rồi đọc tiêu đề và kích thước của cửa sổ mới.',
        counter=dict(q='Với app_title = "Quản lý điểm", root.title() trả gì?',
                     options=['Quản lý điểm', 'Student system', 'tk'], correct='Quản lý điểm'),
        practice='title và geometry là method nên phải có ngoặc và đối số; cửa sổ phụ là tk.Toplevel(root); root.mainloop() ở dòng cuối.',
        steps=['root = tk.Tk(); root.title(app_title); root.geometry(size)',
               'details = tk.Toplevel(root); details.title("Details"); details.geometry("400x300")',
               'Dòng cuối: root.mainloop()'],
        partial=r'''root = tk.Tk()
root.title(app_title)
...''',
        io=[('app_title = "Student system", size = "800x600"', 'Cửa sổ chính 800x600 tên Student system; cửa sổ phụ Details 400x300'),
            ('app_title = "Quản lý điểm", size = "640x480"', 'root.title() trả "Quản lý điểm", kích thước 640x480')],
        starter=r'''import tkinter as tk

app_title = "Student system"
size = "800x600"

# 1. Tạo cửa sổ chính root; đặt tiêu đề app_title và kích thước size.
# 2. Tạo cửa sổ phụ details: tiêu đề "Details", kích thước "400x300".
# 3. Chạy vòng lặp sự kiện ở dòng cuối.
''',
        solution=G01_SOLUTION,
        tests=[
            T('Tiêu đề cửa sổ chính', 'root.title()', 'Student system'),
            T('Kích thước 800x600', "root.geometry().split('+')[0]", '800x600'),
            T('Cửa sổ phụ là Toplevel, không phải Tk thứ hai', 'type(details).__name__', 'Toplevel'),
            T('Cửa sổ phụ thuộc root', 'details.master is root', True),
            T('Cửa sổ phụ: Details, 400x300', "(details.title(), details.geometry().split('+')[0])", ('Details', '400x300')),
            T('Đã gọi mainloop()', '_studio.tk.mainloop_called', True),
            T('Dữ liệu khác: "Quản lý điểm", 640x480',
              "(lambda w: (w.title(), w.geometry().split('+')[0]))(" + run(vars={'app_title': 'Quản lý điểm', 'size': '640x480'})
              + ".ns['root'])", ('Quản lý điểm', '640x480')),
        ],
        bad=[('gán title thay vì gọi', G01_SOLUTION.replace('root.title(app_title)', 'root.title = app_title')),
             ('cửa sổ phụ bằng tk.Tk()', G01_SOLUTION.replace('details = tk.Toplevel(root)', 'details = tk.Tk()')),
             ('quên mainloop()', G01_SOLUTION.replace('\n\nroot.mainloop()\n', '\n'))],
    ),

    # ------------------------------------------------------------------ G02
    dict(
        code='G02', title='Widget và callback', minutes=30,
        goal='Tạo widget, nối nút với hàm callback và đọc dữ liệu đúng lúc người dùng bấm.',
        prereq='G01', env=GUI_ENV,
        theory=[
            dict(h='Định nghĩa: widget và callback',
                 body='Trong Tkinter "everything is widget": Frame là khung chứa, Label hiện chữ, Entry nhập '
                      'một dòng, Button bấm được. Callback là hàm BẠN viết mà TKINTER gọi, khi sự kiện xảy ra.'),
            dict(h='Nối sự kiện: command và bind',
                 bullets=['command=login giao HÀM cho nút; thêm ngoặc là tự gọi một lần rồi giao None',
                          'widget.bind("<Return>", f): mọi widget, mọi sự kiện — Tkinter gọi f(event)',
                          'Trong callback: entry.get() đọc chữ, label.config(text=…) đổi chữ']),
            dict(h='Dùng ở đâu — và Studio khác gì',
                 bullets=['Form đăng nhập: Entry thu dữ liệu, Button xác nhận, Label báo trạng thái',
                          'messagebox.showinfo / showwarning / showerror thay cho print() của CLI',
                          'Studio không vẽ cửa sổ: bộ chấm "bấm" bằng button.invoke() rồi đọc hộp thông báo']),
            dict(h='Đọc sơ đồ',
                 body='Hình chia hai nhịp: lúc dựng giao diện, Button chỉ CẤT tên hàm; lúc bấm, Tkinter gọi '
                      'callback, callback đọc Entry rồi label.config(text=…) đổi chữ. Ô nét đứt là dữ liệu đọc '
                      'đúng lúc bấm.',
                 figure='G02-widget-callback'),
        ],
        figure=dict(name='G02-widget-callback',
                    caption='Bấm Button → Tkinter gọi callback → Label đổi chữ',
                    alt='Sơ đồ: Button giữ hàm qua command; khi bấm, Tkinter gọi hàm, hàm đọc Entry bằng get() rồi '
                        'gọi label.config(text=…) làm Label đổi chữ'),
        slides='SL 118-120',
        brief='Hoàn thành form đăng nhập (đã có root, frame, user_entry): tạo password_entry che ký tự bằng show="*", '
              'Label status với chữ "Chưa đăng nhập", và Button chữ "Đăng nhập" với command=login. Hàm login() đọc hai '
              'Entry LÚC ĐƯỢC BẤM: tên bỏ khoảng trắng hai đầu; mật khẩu bằng PASSWORD thì status.config(text="Xin chào <tên>") '
              'và messagebox.showinfo("Đăng nhập", "Chào mừng <tên>!"); sai thì status.config(text="Sai mật khẩu").',
        example='Gõ "Mai" và "usth2026", bấm Đăng nhập → status "Xin chào Mai" và hộp thông báo "Chào mừng Mai!".',
        demo=r'''import tkinter as tk
from tkinter import messagebox

root = tk.Tk()
root.title("Đếm lượt bấm")
clicks = 0

counter = tk.Label(root, text="0 lượt", width=12, bg="lightyellow")
counter.pack()


def on_click():
    global clicks
    clicks += 1
    counter.config(text=f"{clicks} lượt")
    if clicks == 3:
        messagebox.showinfo("Info", "Đã bấm 3 lần")


button = tk.Button(root, text="Bấm tôi", command=on_click)
button.pack()

button.invoke()   # "bấm" bằng code — bộ chấm cũng làm vậy
button.invoke()
print(counter.cget("text"))
root.mainloop()
''',
        explain=[
            'Frame chứa widget khác; Label hiện chữ; Entry nhập một dòng (show="*" che mật khẩu); Button gọi callback khi bấm.',
            'width, height, bg chỉnh kích thước và màu (tuỳ widget). Tạo xong phải pack() thì widget mới được xếp vào cửa sổ.',
            'pack() trả về None: viết status = tk.Label(...) rồi status.pack() ở dòng riêng để còn giữ được widget.',
            'command=login giao HÀM cho nút, Tkinter gọi login() mỗi lần bấm. command=login() gọi ngay lúc dựng giao diện.',
            'Trong callback: entry.get() đọc chữ đang gõ, label.config(text=...) đổi chữ, cget("text") đọc lại chữ hiện tại.',
            'messagebox.showinfo(tiêu đề, nội dung) bật hộp thông báo; showwarning, showerror là dạng cảnh báo và báo lỗi.',
        ],
        predict=dict(q='Bấm nút này thì chuyện gì xảy ra?', options=[
            ('Không có gì: clicked() đã chạy một lần lúc tạo nút, command nhận None', 'Dấu ngoặc là lời gọi ngay.', True),
            ('clicked chạy mỗi lần bấm như bình thường', 'Đó là command=clicked (không ngoặc).', False),
            ('Báo lỗi mỗi lần bấm', 'command rỗng thì bấm không làm gì, cũng không báo lỗi.', False),
        ], code='button = tk.Button(root, text="Open", command=clicked())'),
        myth=('"status = tk.Label(...).pack() cho gọn"',
              'pack() xếp widget rồi trả về None, nên status thành None và status.config(...) trong callback nổ AttributeError — '
              'đúng lúc người dùng bấm nút, không phải lúc chạy chương trình. Giữ widget vào biến trước, pack ở dòng sau. '
              'Tương tự, command nhận TÊN hàm: command=login, không phải login().'),
        mcq=[
            dict(q='Ở command=clicked có dùng dấu ngoặc gọi hàm không?', options=[
                ('Không — truyền tên hàm để Tkinter gọi khi bấm', 'Có ngoặc là gọi ngay lúc tạo nút.', True),
                ('Có — phải viết command=clicked()', 'Khi đó clicked chạy một lần lúc dựng giao diện.', False),
                ('Tuỳ phiên bản Python', 'Quy tắc callback không đổi theo phiên bản.', False),
            ]),
            dict(q='Entry mật khẩu cần tuỳ chọn nào để hiện dấu * thay cho ký tự?', options=[
                ('show="*"', 'Entry vẫn giữ chữ thật; get() trả đúng mật khẩu đã gõ.', True),
                ('text="*"', 'Entry không dùng text để che chữ.', False),
                ('password=True', 'Tkinter không có tuỳ chọn này.', False),
            ]),
            dict(q='entry.bind("<Return>", handler) khác command=handler ở điểm nào?', options=[
                ('bind gọi handler(event) — handler cần một tham số nhận event', 'command gọi handler() không đối số.', True),
                ('Không khác gì', 'bind luôn truyền đối tượng event vào hàm.', False),
                ('bind chỉ dùng được cho Button', 'Mọi widget đều bind được sự kiện.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao login() phải gọi user_entry.get() BÊN TRONG hàm, không đọc sẵn ở ngoài?',
            sample='Dòng ngoài hàm chạy một lần lúc dựng giao diện, khi Entry còn rỗng, nên giá trị đọc được là "". Callback chạy '
                   'mỗi lần bấm nút, lúc người dùng đã gõ xong, nên phải gọi get() trong callback để lấy chữ hiện tại. Trường '
                   'hợp đặc biệt: mật khẩu rỗng vẫn phải ra "Sai mật khẩu".'),
        scaffold=dict(
            intro='Dữ liệu mới: nút "Gửi" chào theo tên trong Entry. Lắp ba chỗ.',
            template=r'''import tkinter as tk

root = tk.Tk()
name_entry = tk.Entry(root)
name_entry.pack()
greeting = {{slot1}}
greeting.pack()


def send():
    name = {{slot2}}
    greeting.config(text="Hello " + name)


tk.Button(root, text="Gửi", command={{slot3}}).pack()
root.mainloop()
''',
            slots=['tk.Label(root, text="")', 'name_entry.get()', 'send'],
            traps=[('tk.Label(root, text="").pack()', 1, 'pack() trả về None nên greeting thành None.'),
                   ('name_entry', 2, 'Đó là widget, không phải chữ đã gõ — cần get().'),
                   ('send()', 3, 'Gọi send ngay lúc dựng giao diện; nút nhận None.')]),
        flow=['tk.Entry(frame, show="*") → ô mật khẩu che ký tự',
              'command=login → nút giữ hàm, chưa gọi',
              'Bấm nút → Tkinter gọi login()',
              'login() → get() hai Entry rồi status.config(text=...)'],
        transfer='Bộ chấm gõ tên và mật khẩu khác (đúng, sai, rỗng) vào hai Entry, bấm nút bằng invoke() rồi đọc status.cget("text") và hộp thông báo.',
        counter=dict(q='Gõ tên "An", mật khẩu "abc" rồi bấm Đăng nhập — status hiện gì?',
                     options=['Sai mật khẩu', 'Xin chào An', 'Chưa đăng nhập'], correct='Sai mật khẩu'),
        practice='login() gọi user_entry.get() và password_entry.get() ngay trong hàm, so với PASSWORD rồi đổi chữ status bằng config(text=...). Nút dùng command=login (không ngoặc).',
        steps=['password_entry = tk.Entry(frame, width=24, show="*"); password_entry.pack()',
               'status = tk.Label(frame, text="Chưa đăng nhập") rồi status.pack() ở dòng riêng.',
               'def login(): user = user_entry.get().strip(); đúng mật khẩu → status "Xin chào ..." + showinfo; sai → "Sai mật khẩu".',
               'tk.Button(frame, text="Đăng nhập", command=login).pack()'],
        partial=r'''def login():
    user = user_entry.get().strip()
    if password_entry.get() == PASSWORD:
        ...''',
        io=[('Tên "Mai", mật khẩu "usth2026"', 'status: Xin chào Mai; hộp thông báo "Chào mừng Mai!"'),
            ('Mật khẩu sai hoặc rỗng', 'status: Sai mật khẩu; không bật hộp thông báo')],
        starter=G02_HEAD + r'''# Tạo password_entry che ký tự bằng *, rồi pack.

# Tạo Label status với chữ "Chưa đăng nhập", rồi pack.


def login():
    pass


# Tạo nút "Đăng nhập" gọi login khi bấm.

root.mainloop()
''',
        solution=G02_SOLUTION,
        tests=[
            T('Chưa bấm: status "Chưa đăng nhập"', "status.cget('text')", 'Chưa đăng nhập'),
            T('Có nút "Đăng nhập"', "_studio.tk.find(type='Button', text='Đăng nhập') is not None", True),
            T('Ô mật khẩu che bằng *', "password_entry.cget('show')", '*'),
            T('Mai + mật khẩu đúng', _g02_login('Mai', 'usth2026'), 'Xin chào Mai'),
            T('Mật khẩu sai', _g02_login('Mai', 'usth'), 'Sai mật khẩu'),
            T('Tên khác có khoảng trắng " An "', _g02_login(' An ', 'usth2026'), 'Xin chào An'),
            T('Mật khẩu rỗng', _g02_login('Mai', ''), 'Sai mật khẩu'),
            T('Đúng mật khẩu → showinfo("Đăng nhập", "Chào mừng Lan!")',
              "(%s, (lambda m: ('info' in str(m[0]), m[1], m[2]))(tuple(_studio.tk.messages[-1])))[1]" % _g02_login('Lan', 'usth2026'),
              (True, 'Đăng nhập', 'Chào mừng Lan!')),
            T('Sai mật khẩu → không bật hộp thông báo',
              "(lambda n: (%s, len(_studio.tk.messages) - n)[1])(len(_studio.tk.messages))" % _g02_login('Lan', 'sai'), 0),
        ],
        bad=[('command=login() gọi ngay', G02_SOLUTION.replace('command=login)', 'command=login())')),
             ('status = Label(...).pack()', G02_SOLUTION.replace(
                 'status = tk.Label(frame, text="Chưa đăng nhập")\nstatus.pack()',
                 'status = tk.Label(frame, text="Chưa đăng nhập").pack()')),
             ('đọc mật khẩu lúc dựng giao diện', G02_SOLUTION.replace(
                 '\n\ndef login():\n    user = user_entry.get().strip()\n    if password_entry.get() == PASSWORD:',
                 '\npassword = password_entry.get()\n\n\ndef login():\n    user = user_entry.get().strip()\n    if password == PASSWORD:'))],
    ),

    # ------------------------------------------------------------------ G03
    dict(
        code='G03', title='Dữ liệu nhập và lựa chọn', minutes=35,
        goal='Đọc trạng thái Entry, Combobox, Radiobutton, Checkbutton bằng get(), đổi kiểu và kiểm tra trước khi dùng.',
        prereq='G02', env=GUI_ENV,
        theory=[
            dict(h='Định nghĩa: widget nhập và biến Tk',
                 body='Entry (show="*" cho mật khẩu), Checkbutton, Radiobutton, Listbox và ttk.Combobox là năm '
                      'widget thu dữ liệu. Chúng giữ giá trị trong biến Tk — StringVar, IntVar, BooleanVar — '
                      'đọc bằng get().'),
            dict(h='Mỗi widget một cách đọc',
                 bullets=['Entry: get() luôn trả CHUỖI — "8.5" chưa phải số, phải float() trong try/except',
                          'Hai Radiobutton cùng nhóm phải dùng CHUNG một StringVar, mỗi nút một value',
                          'Checkbutton → BooleanVar; ttk.Combobox(state="readonly") chặn gõ chữ lạ']),
            dict(h='Dùng ở đâu — và Studio khác gì',
                 bullets=['Combobox/Radiobutton thay cho gõ tay nên dữ liệu chỉ nằm trong tập hợp lệ',
                          'Kiểm TRƯỚC khi dùng: sai thì messagebox rồi return, đừng ghi dữ liệu nửa vời',
                          'Studio không vẽ cửa sổ: bộ chấm set() biến rồi invoke() nút thay cho người gõ']),
            dict(h='Đọc sơ đồ',
                 body='Mỗi widget nhập nối sang biến điều khiển của nó, rồi mũi tên get() đi ra mang CHUỖI hoặc '
                      'bool chứ chưa phải số. Hai Radiobutton chụm vào CÙNG một StringVar; cuối sơ đồ là chốt '
                      'kiểm tra.',
                 figure='G03-input-widgets'),
        ],
        figure=dict(name='G03-input-widgets',
                    caption='Widget nhập, biến điều khiển và đường đi của get()',
                    alt='Sơ đồ Entry, Checkbutton, hai Radiobutton chung một StringVar, Listbox và Combobox; mỗi cái '
                        'nối tới biến điều khiển rồi tới get() và bước kiểm tra dữ liệu'),
        slides='SL 121-124',
        brief='Form nhập điểm đã có name_var, mark_var (StringVar gắn hai Entry), course_box (ttk.Combobox), retake_var '
              '(BooleanVar của Checkbutton "Thi lại"), marks_list (Listbox) và status.\n\n(1) Tạo hai Radiobutton "Giữa kỳ", '
              '"Cuối kỳ" dùng CHUNG exam_var (value bằng đúng chữ trên nút).\n\n(2) Viết add_mark(): họ tên rỗng → '
              'messagebox.showwarning, dừng; điểm đổi sang float (chấp nhận "8,5"), không phải số hoặc ngoài 0..10 → '
              'messagebox.showerror, dừng; hợp lệ → thêm dòng "<tên> | <môn> | <kỳ thi> | <điểm>" (điểm là float vừa đổi, '
              'in thẳng: 8.5, 7.0, 9.25; thêm " | thi lại" nếu đánh dấu) vào cuối marks_list và đổi status thành '
              '"Đã nhập <số dòng> điểm".',
        example='Mai, "8.5", Python, Giữa kỳ → dòng "Mai | Python | Giữa kỳ | 8.5"; "abc" → hộp lỗi, Listbox không đổi.',
        demo=r'''import tkinter as tk
from tkinter import ttk

root = tk.Tk()
size = tk.StringVar(value="M")
for text in ["S", "M", "L"]:
    tk.Radiobutton(root, text=text, value=text, variable=size).pack()

ice = tk.IntVar(value=0)
tk.Checkbutton(root, text="Thêm đá", variable=ice).pack()

drink = ttk.Combobox(root, values=["Trà", "Cà phê"], state="readonly")
drink.set("Trà")
drink.pack()

orders = tk.Listbox(root)
orders.pack()

ice.set(1)                      # như người dùng tích ô
drink.set("Cà phê")             # như người dùng chọn mục
orders.insert(tk.END, f"{drink.get()} size {size.get()}, đá = {ice.get()}")
print(orders.get(0, tk.END))

cups = "3"                      # Entry luôn trả chuỗi
print(int(cups) * 2, cups * 2)
''',
        explain=[
            'StringVar, IntVar, DoubleVar, BooleanVar giữ giá trị gắn với widget: get() đọc, set() đặt — không đọc thẳng object.',
            'Entry luôn cho CHUỖI: "8.5" chưa phải số. float() đổi kiểu và nổ ValueError với "abc", nên bọc trong try/except.',
            'Checkbutton bật/tắt một biến; các Radiobutton cùng nhóm phải dùng CHUNG một biến, mỗi nút một value.',
            'Listbox.insert(tk.END, chuỗi) thêm cuối, size() đếm dòng; get(tk.ACTIVE) chỉ là mục active, chưa chắc là mục được chọn.',
            'ttk.Combobox(values=[...]) chứa lựa chọn, get() lấy giá trị đang chọn; state="readonly" chặn gõ chữ lạ vào.',
            'Kiểm tra trước, dùng sau: dữ liệu sai thì báo bằng messagebox và return — không thêm dòng nửa vời.',
        ],
        predict=dict(q='Entry chứa "8.5" — mark_var.get() trả gì?', options=[
            ('Chuỗi "8.5" — phải float() mới thành số 8.5', 'Entry chỉ biết chữ; đổi kiểu là việc của bạn.', True),
            ('Số thực 8.5', 'StringVar luôn trả str.', False),
            ('Số nguyên 8', 'Không có phép đổi kiểu tự động nào.', False),
        ]),
        myth=('"Viết if retake_var: là kiểm ô đã tích"',
              'retake_var là OBJECT BooleanVar — object luôn được coi là đúng, nên nhánh "thi lại" chạy cả khi ô chưa tích. '
              'Phải đọc giá trị: if retake_var.get():. Tương tự float(mark_var) nổ TypeError vì truyền object, không phải chuỗi. '
              'Và Radiobutton mỗi nút một biến riêng thì không còn là một nhóm: chọn "Cuối kỳ" không đổi exam_var.'),
        mcq=[
            dict(q='Entry chứa "8.5" có tự là float không?', options=[
                ('Không — phải chuyển kiểu và xử lý dữ liệu không hợp lệ', 'get() luôn trả chuỗi.', True),
                ('Có, Tkinter tự nhận ra số', 'Entry không biết kiểu dữ liệu.', False),
                ('Có, nếu dùng StringVar', 'StringVar cũng trả chuỗi.', False),
            ]),
            dict(q='Hai Radiobutton "Giữa kỳ", "Cuối kỳ" phải cấu hình thế nào để thành một nhóm?', options=[
                ('Cùng variable=exam_var, mỗi nút một value khác nhau', 'Chọn nút nào thì exam_var nhận value của nút đó.', True),
                ('Mỗi nút một StringVar riêng', 'Khi đó chúng độc lập, không loại trừ nhau.', False),
                ('Cùng text, khác variable', 'text chỉ là chữ hiển thị.', False),
            ]),
            dict(q='float("8,5") cho kết quả gì?', options=[
                ('ValueError — Python dùng dấu chấm thập phân', 'Thay "," bằng "." trước khi đổi kiểu.', True),
                ('8.5', 'float không hiểu dấu phẩy thập phân.', False),
                ('85.0', 'Dấu phẩy không bị bỏ qua.', False),
            ]),
            dict(q='marks_list.get(tk.ACTIVE) trả gì?', options=[
                ('Mục đang active (có con trỏ), không nhất thiết là mọi mục được chọn', 'Mục được chọn: curselection().', True),
                ('Mọi mục trong Listbox', 'Muốn hết thì get(0, tk.END).', False),
                ('Mục cuối cùng', 'Mục cuối là get(tk.END).', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao add_mark phải dừng (return) ngay khi điểm không hợp lệ, trước khi insert vào Listbox?',
            sample='Dữ liệu từ giao diện là chuỗi người dùng gõ, có thể là "abc" hoặc "11". Đổi kiểu và kiểm khoảng trước; sai thì '
                   'báo bằng messagebox rồi return để Listbox và status không nhận dòng hỏng. Trường hợp đặc biệt: "8,5" hợp lệ '
                   'sau khi thay dấu phẩy; 0 và 10 nằm trong khoảng.'),
        scaffold=dict(
            intro='Dữ liệu mới: chọn ca học bằng Radiobutton và đánh dấu "Có laptop". Lắp ba chỗ.',
            template=r'''import tkinter as tk

root = tk.Tk()
shift_var = tk.StringVar(value="Sáng")
laptop_var = tk.BooleanVar(value=False)

for text in ["Sáng", "Chiều"]:
    tk.Radiobutton(root, text=text, value=text, variable={{slot1}}).pack()
tk.Checkbutton(root, text="Có laptop", variable=laptop_var).pack()
summary = tk.Label(root, text="")
summary.pack()


def show():
    note = "mang laptop" if {{slot2}} else "không laptop"
    summary.config(text="Ca " + {{slot3}} + ", " + note)


tk.Button(root, text="Xem", command=show).pack()
root.mainloop()
''',
            slots=['shift_var', 'laptop_var.get()', 'shift_var.get()'],
            traps=[('tk.StringVar(value="Sáng")', 1, 'Mỗi nút một biến mới: hai Radiobutton không còn chung nhóm.'),
                   ('laptop_var', 2, 'Object BooleanVar luôn được coi là đúng — phải gọi get().'),
                   ('str(shift_var)', 3, 'str() của StringVar là TÊN biến Tcl (PY_VAR0), không phải giá trị.')]),
        flow=['name_var.get().strip() → họ tên đã bỏ khoảng trắng',
              'float(raw.replace(",", ".")) → "8,5" thành 8.5',
              'Không phải số hoặc ngoài 0..10 → showerror rồi return',
              'marks_list.insert(tk.END, line) → thêm dòng cuối Listbox'],
        transfer='Bộ chấm điền tên/điểm khác, chọn môn bằng course_box.set, bấm Radiobutton "Cuối kỳ", tích hoặc bỏ "Thi lại", rồi bấm Thêm và đọc dòng cuối Listbox.',
        counter=dict(q='Không thay "," bằng "." thì float("9,25") làm gì?',
                     options=['ValueError', 'Trả 9.25', 'Trả 925.0'], correct='ValueError'),
        practice='Mỗi giá trị đọc qua get(); điểm qua replace(",", ".") rồi float() trong try/except; kiểm 0..10; chỉ insert khi mọi thứ hợp lệ.',
        steps=['for text in ["Giữa kỳ", "Cuối kỳ"]: tk.Radiobutton(root, text=text, value=text, variable=exam_var).pack()',
               'name = name_var.get().strip(); rỗng → showwarning, return.',
               'mark = float(mark_var.get().strip().replace(",", ".")) trong try; ValueError hoặc ngoài 0..10 → showerror, return.',
               'line = f"{name} | {course_box.get()} | {exam_var.get()} | {mark}"; retake_var.get() → thêm " | thi lại"; insert; cập nhật status.'],
        partial=r'''    raw = mark_var.get().strip().replace(",", ".")
    try:
        mark = float(raw)
    except ValueError:
        messagebox.showerror("Điểm không hợp lệ", f"'{raw}' không phải là số")
        return''',
        io=[('Mai, "8.5", Python, Giữa kỳ, không thi lại', 'Dòng "Mai | Python | Giữa kỳ | 8.5"; status "Đã nhập 1 điểm"'),
            ('Điểm "abc" hoặc "10.5"', 'showerror; Listbox giữ nguyên'),
            ('Họ tên rỗng', 'showwarning; Listbox giữ nguyên')],
        starter=G03_HEAD + r'''
# (1) Tạo hai Radiobutton "Giữa kỳ", "Cuối kỳ" dùng chung exam_var.
''' + G03_TAIL + r'''

def add_mark():
    # (2) Đọc biến bằng get(), kiểm tra, rồi thêm dòng vào marks_list và cập nhật status.
    pass


tk.Button(root, text="Thêm", command=add_mark).pack()

root.mainloop()
''',
        solution=G03_SOLUTION,
        tests=[
            T('Chưa nhập: Listbox rỗng, status "Chưa có điểm"', "(marks_list.size(), status.cget('text'))", (0, 'Chưa có điểm')),
            T('Mai, 8.5, Python, Giữa kỳ', _g03_add('Mai', '8.5'), 'Mai | Python | Giữa kỳ | 8.5'),
            T('Radiobutton Cuối kỳ + Data + thi lại', _g03_add('An', '7', 'Data', 'Cuối kỳ', True), 'An | Data | Cuối kỳ | 7.0 | thi lại'),
            T('Dấu phẩy "9,25", tên có khoảng trắng', _g03_add(' Lan ', '9,25', 'Web'), 'Lan | Web | Giữa kỳ | 9.25'),
            T('Biên 10 và 0 hợp lệ', '[' + _g03_add('Huy', '10') + ', ' + _g03_add('Huy', '0', exam='Cuối kỳ') + ']',
              ['Huy | Python | Giữa kỳ | 10.0', 'Huy | Python | Cuối kỳ | 0.0']),
            T('"abc" → showerror, không thêm dòng', _g03_reject('Mai', 'abc', 'error'), (0, 1, True)),
            T('"10.5" ngoài 0..10 → showerror, không thêm dòng', _g03_reject('Mai', '10.5', 'error'), (0, 1, True)),
            T('Họ tên rỗng → showwarning, không thêm dòng', _g03_reject('   ', '8', 'warning'), (0, 1, True)),
            TX('status đếm đúng số dòng trong Listbox', "status.cget('text')", "'Đã nhập %d điểm' % marks_list.size()"),
        ],
        bad=[('if retake_var: (quên get())', G03_SOLUTION.replace('    if retake_var.get():', '    if retake_var:')),
             ('mỗi Radiobutton một biến riêng', G03_SOLUTION.replace(
                 'tk.Radiobutton(root, text=text, value=text, variable=exam_var)',
                 'tk.Radiobutton(root, text=text, value=text, variable=tk.StringVar(value="Giữa kỳ"))')),
             ('không bắt ValueError khi đổi kiểu', G03_SOLUTION.replace(
                 '''    try:
        mark = float(raw)
    except ValueError:
        messagebox.showerror("Điểm không hợp lệ", f"'{raw}' không phải là số")
        return
''', '''    mark = float(raw)
'''))],
    ),

    # ------------------------------------------------------------------ G04
    dict(
        code='G04', title='Layout: pack, place, grid', minutes=30,
        goal='Bố trí giao diện bằng một chiến lược rõ ràng: grid cho form, pack cho khung và thanh nút, place cho nhãn góc.',
        prereq='G03', env=GUI_ENV,
        theory=[
            dict(h='Định nghĩa: geometry manager',
                 body='Tạo widget xong nó vẫn chưa hiện: phải giao cho một geometry manager của chính widget — '
                      '.pack() xếp theo cạnh (side, fill), .place() theo toạ độ (x/y, relx), .grid() theo ô '
                      'row–column.'),
            dict(h='Trộn pack với grid là TclError',
                 body='Hai manager tính chỗ theo hai cách khác nhau, nên các con của CÙNG một parent vừa pack() '
                      'vừa grid() làm Tk báo TclError. Khác parent thì vô tư: Frame bên trong grid, Frame đó '
                      'pack ra ngoài.'),
            dict(h='Dùng ở đâu — và Studio khác gì',
                 bullets=['grid cho form nhãn–ô nhập; pack cho khung và thanh nút; place khi cần toạ độ',
                          'columnconfigure(1, weight=1) cho cột 1 nuốt phần dư khi cửa sổ to ra',
                          'Studio không vẽ cửa sổ: bộ chấm đọc widget.manager và widget.layout thay bạn']),
            dict(h='Đọc sơ đồ',
                 body='Ba cửa sổ nhỏ, CÙNG ba widget, ba manager: pack xếp chồng, place ghim theo toạ độ nên có '
                      'thể chồng nhau, grid chia lưới thẳng hàng. Dải đỏ dưới cùng là ca lỗi pack + grid cùng '
                      'parent.',
                 figure='G04-layouts'),
        ],
        figure=dict(name='G04-layouts',
                    caption='pack, place, grid: ba cách xếp cùng một bộ widget',
                    alt='Ba cửa sổ mẫu cho pack xếp chồng, place theo toạ độ x/y, grid theo hàng và cột; dưới cùng '
                        'là cảnh báo trộn pack với grid cùng parent gây TclError'),
        slides='SL 125-132',
        brief='Viết build_form(parent, fields): với field thứ row (đếm từ 0) đặt Label(text=field) ở grid(row=row, column=0, '
              'sticky="w") và một Entry ở grid(row=row, column=1, sticky="ew"); lưu Entry vào dict entries[field]; cuối cùng '
              'đặt Button "Lưu" ở grid(row=len(fields), column=0, columnspan=2); trả về entries.\n\nTrong root: form = Frame '
              'pack(fill="x") rồi entries = build_form(form, FIELDS); toolbar = Frame pack(side="bottom", fill="x") chứa nút '
              '"Mở" pack(side="left") và "Thoát" pack(side="right"); badge = Label "v1.0" đặt bằng place(relx=1.0, rely=0.0, '
              'anchor="ne").',
        example='FIELDS = ["Họ tên", "Ngày sinh", "Điểm"] → ba hàng Label/Entry, nút Lưu ở hàng 3 chiếm 2 cột.',
        demo=r'''import tkinter as tk

root = tk.Tk()
header = tk.Label(root, text="Bảng điểm", bg="lightblue")
header.pack(fill="x")                 # root: dùng pack

table = tk.Frame(root)
table.pack(padx=8, pady=8)            # Frame vẫn là con của root: pack
for row, (name, mark) in enumerate([("Mai", 8.5), ("An", 7.0)]):
    tk.Label(table, text=name).grid(row=row, column=0, sticky="w")
    tk.Label(table, text=str(mark)).grid(row=row, column=1)

corner = tk.Label(root, text="beta")
corner.place(relx=1.0, rely=1.0, anchor="se")   # place không tranh chấp với pack

try:
    tk.Label(table, text="Thêm").pack()       # table đã có con dùng grid
except tk.TclError as error:
    print("TclError:", error)
root.mainloop()
''',
        explain=[
            'pack() xếp widget theo cạnh: side="top/bottom/left/right"; fill="x" giãn ngang; expand=True chiếm phần dư.',
            'grid() đặt theo ô row, column (đếm từ 0); sticky="ew" cho widget giãn hết bề ngang ô; padx/pady chừa khoảng trống.',
            'columnspan/rowspan cho widget chiếm nhiều ô; columnconfigure(1, weight=1) cho cột 1 giãn khi cửa sổ to ra.',
            'place() đặt theo toạ độ x/y hoặc tỉ lệ relx/rely (0 tới 1); anchor="ne" chọn góc của widget bám vào điểm đó.',
            'KHÔNG dùng pack và grid cho các con của CÙNG một parent — Tk báo TclError. Khác parent (Frame khác) thì được.',
        ],
        predict=dict(q='Có thể pack frame ngoài, rồi grid các widget con BÊN TRONG frame đó không?', options=[
            ('Có — frame (con của root) và widget con của frame có parent khác nhau', 'Luật chỉ áp dụng trong cùng một parent.', True),
            ('Không — cả chương trình chỉ được dùng một kiểu', 'Mỗi parent chọn kiểu riêng cho các con của nó.', False),
            ('Được, nhưng phải dùng place cho frame', 'pack frame là bình thường.', False),
        ]),
        myth=('"Thêm một Label bằng pack() vào Frame đang dùng grid cũng chẳng sao"',
              'pack và grid cùng tính kích thước của parent và giành nhau quyền quyết định — Tk chặn bằng TclError "cannot use '
              'geometry manager pack inside ... which already has slaves managed by grid". Muốn phối hợp, tạo Frame riêng cho '
              'mỗi kiểu. Một nhầm lẫn khác: gọi grid() không có row/column và tưởng nó tự xếp như pack — Label và Entry sẽ '
              'không còn thẳng hàng.'),
        mcq=[
            dict(q='Trong cùng một Frame, đã có widget dùng grid; thêm widget dùng pack thì…', options=[
                ('Tk báo TclError: không được trộn pack và grid trong cùng parent', 'Tách sang Frame khác nếu cần pack.', True),
                ('Widget mới tự chuyển sang grid', 'Tk không tự đổi geometry manager.', False),
                ('Chạy được, chỉ lệch vị trí', 'Tk chặn hẳn bằng lỗi.', False),
            ]),
            dict(q='Entry ở cột 1 muốn giãn hết bề ngang ô thì dùng gì?', options=[
                ('grid(..., sticky="ew")', 'Bám cả cạnh trái (w) và phải (e).', True),
                ('grid(..., fill="x")', 'fill là tuỳ chọn của pack, grid không nhận.', False),
                ('grid(..., side="left")', 'side cũng là của pack.', False),
            ]),
            dict(q='place(relx=1.0, rely=0.0, anchor="ne") đặt widget ở đâu?', options=[
                ('Góc trên phải: góc ne của widget bám vào điểm (100% ngang, 0% dọc)', 'relx/rely là tỉ lệ theo parent.', True),
                ('Góc dưới trái', 'Đó là relx=0.0, rely=1.0, anchor="sw".', False),
                ('Toạ độ (1, 0) pixel', 'Pixel là x/y; relx/rely là tỉ lệ.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao form dùng grid trong một Frame riêng thay vì grid thẳng vào root?',
            sample='root còn toolbar dùng pack. Nếu grid các Label/Entry thẳng vào root thì root có con dùng cả grid lẫn pack → '
                   'TclError. Đặt form vào Frame riêng: root chỉ pack hai Frame, còn bên trong form tự do dùng grid. Trường hợp '
                   'đặc biệt: place không tranh chấp, nên badge đặt bằng place trong root vẫn được.'),
        scaffold=dict(
            intro='Dữ liệu mới: bàn phím 2×2 trong một Frame được pack. Lắp bốn chỗ.',
            template=r'''import tkinter as tk

root = tk.Tk()
pad = tk.Frame(root)
pad.{{slot1}}
for index, text in enumerate(["7", "8", "4", "5"]):
    button = tk.Button(pad, text=text, width=4)
    button.grid(row={{slot2}}, column={{slot3}})
tk.Label(root, text="Bàn phím số").{{slot4}}
root.mainloop()
''',
            slots=['pack(padx=10, pady=10)', 'index // 2', 'index % 2', 'pack(side="bottom")'],
            traps=[('grid(row=0, column=0)', 1, 'pad dùng grid nhưng Label cùng root lại pack → TclError.'),
                   ('index', 2, 'Mỗi nút một hàng: thành một cột dọc bốn nút.'),
                   ('0', 3, 'Mọi nút dồn vào cột 0.'),
                   ('grid(row=1, column=0)', 4, 'root đã có pad dùng pack → trộn với grid → TclError.')]),
        flow=['form.pack(fill="x") → khung form giãn ngang trong root',
              'enumerate(fields) → mỗi field một số hàng 0, 1, 2',
              'Label cột 0, Entry cột 1 sticky="ew" → thẳng hàng',
              'Nút Lưu grid(row=len(fields), columnspan=2) → hàng cuối'],
        transfer='Bộ chấm gọi build_form với danh sách field khác (5 field, 1 field) và đọc hàng/cột của từng widget; trộn pack với grid trong cùng parent sẽ làm chương trình dừng ngay bằng TclError.',
        counter=dict(q='build_form(frame, ["Mã SV", "Lớp", "Email", "SĐT", "Ghi chú"]) đặt nút Lưu ở hàng nào?',
                     options=['5', '4', '0'], correct='5'),
        practice='Một parent — một kiểu bố trí: form dùng grid cho con của nó, root dùng pack cho hai Frame, badge dùng place.',
        steps=['for row, text in enumerate(fields): Label grid(row=row, column=0, sticky="w"); Entry grid(row=row, column=1, sticky="ew").',
               'entries[text] = entry; sau vòng lặp: Button "Lưu" grid(row=len(fields), column=0, columnspan=2); return entries.',
               'form = tk.Frame(root); form.pack(fill="x"); entries = build_form(form, FIELDS).',
               'toolbar pack(side="bottom", fill="x"): "Mở" pack(side="left"), "Thoát" pack(side="right"); badge.place(relx=1.0, rely=0.0, anchor="ne").'],
        partial=r'''    for row, text in enumerate(fields):
        tk.Label(parent, text=text).grid(row=row, column=0, sticky="w")
        ...''',
        io=[('FIELDS = ["Họ tên", "Ngày sinh", "Điểm"]', 'Entry ở (0, 1), (1, 1), (2, 1); nút Lưu ở hàng 3, columnspan=2'),
            ('5 field', 'Entry ở hàng 0..4; nút Lưu ở hàng 5')],
        contracts=[dict(sig='build_form(parent, fields)', does='Dựng form nhập bằng grid trong parent.',
                        takes='parent: Frame chưa có con nào; fields: list[str]',
                        gives='dict tên field → Entry, theo thứ tự fields',
                        effect='Field thứ i: Label (i, 0) sticky="w", Entry (i, 1) sticky="ew"; Button "Lưu" (len(fields), 0) columnspan=2.',
                        call='build_form(form, ["Họ tên", "Điểm"]) → {"Họ tên": Entry, "Điểm": Entry}')],
        starter=G04_STARTER,
        solution=G04_SOLUTION,
        tests=[
            T('form pack(fill="x") trong root', "(form.manager, form.layout.get('fill'))", ('pack', 'x')),
            T('Mỗi Entry ở cột 1, mỗi field một hàng',
              "[(e.manager, e.layout.get('row'), e.layout.get('column')) for e in entries.values()]",
              [('grid', 0, 1), ('grid', 1, 1), ('grid', 2, 1)]),
            T('Label ở cột 0, cùng hàng với Entry',
              "[(w.manager, w.layout.get('row'), w.layout.get('column')) for w in "
              "(_studio.tk.find(type='Label', text=t) for t in ['Họ tên', 'Ngày sinh', 'Điểm'])]",
              [('grid', 0, 0), ('grid', 1, 0), ('grid', 2, 0)]),
            T('Entry giãn ngang: sticky có e và w',
              "[{'e', 'w'} <= set(''.join(e.layout.get('sticky', ''))) for e in entries.values()]", [True, True, True]),
            T('Nút Lưu: hàng 3, columnspan=2',
              "(lambda b: (b.manager, b.layout.get('row'), b.layout.get('columnspan')))(_studio.tk.find(type='Button', text='Lưu'))",
              ('grid', 3, 2)),
            T('toolbar ở đáy; Mở bên trái, Thoát bên phải',
              "(toolbar.manager, toolbar.layout.get('side'), _studio.tk.find(type='Button', text='Mở').layout.get('side'), "
              "_studio.tk.find(type='Button', text='Thoát').layout.get('side'))", ('pack', 'bottom', 'left', 'right')),
            T('badge đặt bằng place ở góc trên phải',
              "(badge.manager, badge.layout.get('relx'), badge.layout.get('rely'), badge.layout.get('anchor'))",
              ('place', 1.0, 0.0, 'ne')),
            T('5 field khác: Entry hàng 0..4, nút Lưu hàng 5',
              "(lambda es: ([(e.layout.get('row'), e.layout.get('column')) for e in es.values()], "
              "_studio.tk.find_all(type='Button', text='Lưu')[-1].layout.get('row')))"
              "(build_form(tk.Frame(root), ['Mã SV', 'Lớp', 'Email', 'SĐT', 'Ghi chú']))",
              ([(0, 1), (1, 1), (2, 1), (3, 1), (4, 1)], 5)),
            T('1 field: Label hàng 0, nút Lưu ngay hàng 1',
              "(lambda es: (list(es), _studio.tk.find(type='Label', text='Ghi chú riêng').layout.get('row'), "
              "_studio.tk.find_all(type='Button', text='Lưu')[-1].layout.get('row')))(build_form(tk.Frame(root), ['Ghi chú riêng']))",
              (['Ghi chú riêng'], 0, 1)),
        ],
        bad=[('pack thêm Label vào form đang grid', G04_SOLUTION.replace(
                 'entries = build_form(form, FIELDS)', 'tk.Label(form, text="Thông tin").pack()\nentries = build_form(form, FIELDS)')),
             ('form grid trong root, toolbar lại pack', G04_SOLUTION.replace(
                 'form.pack(fill="x", padx=8, pady=8)', 'form.grid(row=0, column=0, sticky="ew")')),
             ('grid() không row/column, tưởng tự xếp như pack', G04_SOLUTION.replace(
                 'tk.Label(parent, text=text).grid(row=row, column=0, sticky="w", padx=4, pady=2)',
                 'tk.Label(parent, text=text).grid(sticky="w")').replace(
                 'entry.grid(row=row, column=1, sticky="ew", padx=4, pady=2)', 'entry.grid(sticky="ew")'))],
    ),

    # ------------------------------------------------------------------ G05
    dict(
        code='G05', title='OOP và tách logic khỏi giao diện', minutes=35,
        goal='Gói giao diện vào class App, giữ widget trong self và tách phần tính toán thành hàm thuần dùng lại được.',
        prereq='G04', env=GUI_ENV,
        theory=[
            dict(h='Định nghĩa: hàm thuần và tầng GUI',
                 body='Hàm THUẦN nhận đối số, trả kết quả hoặc raise, và không đụng tới widget nào. Tầng giao '
                      'diện chỉ làm ba việc: đọc widget, gọi hàm thuần, hiện kết quả.'),
            dict(h='Vì sao gói giao diện vào class',
                 bullets=['self.status, self.mark_var sống cùng App; biến cục bộ trong create_widgets() mất '
                          'ngay',
                          'Callback thành method: command=self.add_mark — vẫn KHÔNG ngoặc',
                          'Hàm thuần test được bằng một lời gọi; code dính widget phải dựng cả cửa sổ']),
            dict(h='Dùng ở đâu — và Studio khác gì',
                 bullets=['Quy tắc nghiệp vụ ở hàm thuần, thông báo ở GUI: lõi dùng lại cho CLI, web, test',
                          'validate_mark(raw) raise ValueError; App bắt lỗi rồi messagebox.showerror',
                          'Studio chấm logic bằng gọi thẳng hàm thuần; tkinter ở đây là đồ giả, không vẽ gì']),
            dict(h='Đọc sơ đồ',
                 body='Bên trái là lớp App — widget, callback, messagebox; bên phải là hàm thuần: vào dữ liệu, '
                      'ra dữ liệu hoặc exception. Mũi tên chỉ đi một chiều sang phải, nối vào cả ô "test gọi '
                      'thẳng".',
                 figure='G05-logic-vs-ui'),
        ],
        figure=dict(name='G05-logic-vs-ui',
                    caption='Ranh giới một chiều giữa lớp giao diện và hàm thuần',
                    alt='Sơ đồ chia đôi: bên trái lớp App với widget, callback và messagebox; bên phải hàm thuần '
                        'nhận dữ liệu, trả kết quả hoặc raise, và được test gọi thẳng'),
        slides='SL 116, 135',
        brief='Viết hai hàm THUẦN (không đụng widget, không messagebox): validate_mark(raw) đổi chuỗi thành float, không phải số '
              'hoặc ngoài 0..10 thì raise ValueError; summary(marks) trả "Chưa có điểm" khi list rỗng, ngược lại "<n> điểm, trung '
              'bình <tb, 2 chữ số thập phân>".\n\nHoàn thành class App: __init__ tạo self.marks = [], self.mark_var rồi gọi '
              'create_widgets(); create_widgets tạo Entry gắn self.mark_var, nút "Thêm điểm" với command=self.add_mark và '
              'self.result = Label hiện summary(self.marks); add_mark gọi validate_mark — sai thì messagebox.showerror, đúng thì '
              'append vào self.marks và cập nhật self.result.',
        example='validate_mark("8.5") → 8.5; gõ 8 rồi bấm "Thêm điểm" → nhãn "1 điểm, trung bình 8.00".',
        demo=r'''import tkinter as tk


def to_grade(mark):
    """Logic thuần: dùng được từ CLI, từ test, từ GUI."""
    if mark >= 8.5:
        return "A"
    if mark >= 7:
        return "B"
    return "C"


class GradeApp:
    def __init__(self, root):
        self.mark = tk.StringVar(value="9")
        tk.Entry(root, textvariable=self.mark).pack()
        tk.Button(root, text="Xếp loại", command=self.show).pack()
        self.answer = tk.Label(root, text="?")       # self: method khác còn dùng
        self.answer.pack()

    def show(self):
        self.answer.config(text=to_grade(float(self.mark.get())))


print([to_grade(m) for m in (9, 7.5, 5)])        # chạy được không cần cửa sổ
root = tk.Tk()
app = GradeApp(root)
app.show()
print(app.answer.cget("text"))
root.mainloop()
''',
        explain=[
            'self.widget giữ tham chiếu tới widget cần cập nhật; biến cục bộ trong create_widgets mất khi hàm kết thúc.',
            '__init__ tạo trạng thái (self.marks, self.mark_var) rồi gọi create_widgets() để dựng giao diện.',
            'Callback thành method: command=self.add_mark — vẫn không có ngoặc, Tkinter gọi khi bấm.',
            'Logic tính/kiểm dữ liệu đặt trong hàm thuần: test được bằng gọi hàm, dùng lại được cho CLI hay web.',
            'Hàm thuần báo lỗi bằng raise; GUI bắt lỗi và quyết định cách hiện (messagebox). Mỗi tầng một việc.',
            'Tkinter cơ bản không bắt buộc OOP; class giúp quản lý khi ứng dụng có nhiều widget và trạng thái.',
        ],
        predict=dict(q='Ô nhập đang là "abc", người dùng bấm "Thêm điểm". Chuyện gì xảy ra?', options=[
            ('validate_mark raise ValueError; add_mark bắt lỗi, bật showerror; self.marks giữ nguyên',
             'Hàm thuần báo lỗi, tầng giao diện quyết định cách hiện.', True),
            ('Chương trình dừng hẳn với ValueError', 'add_mark bắt ValueError bằng try/except nên giao diện vẫn chạy.', False),
            ('self.marks thêm 0', 'Dữ liệu sai không bao giờ được thêm.', False),
        ]),
        myth=('"Cho validate_mark tự bật messagebox là tiện nhất"',
              'Khi đó validate_mark chỉ dùng được trong GUI: gọi từ CLI hay từ test sẽ bật hộp thoại và trả None thay vì báo lỗi '
              'rõ ràng, nơi gọi phải đoán vì sao có None. Hàm thuần raise ValueError; App (tầng giao diện) bắt lỗi và chọn cách '
              'hiển thị. Đừng quên: command=self.add_mark() vẫn là gọi ngay, và result = tk.Label(...) không có self thì method '
              'khác không thấy.'),
        mcq=[
            dict(q='self.entry giúp gì so với một biến local mất sau hàm?', options=[
                ('Giữ widget để các method khác truy cập', 'add_mark đọc self.mark_var và đổi self.result được vì chúng là thuộc tính của object.', True),
                ('Giúp widget tự lưu dữ liệu ra file', 'self chỉ là thuộc tính của object.', False),
                ('Bắt buộc để widget hiện lên', 'Widget hiện nhờ pack/grid, không nhờ self.', False),
            ]),
            dict(q='Vì sao validate_mark nên raise ValueError thay vì gọi messagebox.showerror?', options=[
                ('Để hàm dùng lại được ngoài GUI và nơi gọi tự quyết cách báo lỗi', 'Logic tách khỏi giao diện.', True),
                ('Vì messagebox không chạy trong hàm', 'messagebox gọi được ở đâu cũng được — vấn đề là phụ thuộc GUI.', False),
                ('Vì raise nhanh hơn', 'Không phải chuyện tốc độ.', False),
            ]),
            dict(q='Khai marks = [] ở thân class (không trong __init__) thì hai App khác nhau…', options=[
                ('Dùng CHUNG một list — điểm của cửa sổ này hiện ở cửa sổ kia', 'Thuộc tính class được mọi object chia sẻ.', True),
                ('Mỗi App có list riêng', 'Chỉ đúng khi tạo self.marks = [] trong __init__.', False),
                ('Báo lỗi khi chạy', 'Chạy được, chỉ sai âm thầm.', False),
            ]),
        ],
        why=dict(
            prompt='Tách validate_mark/summary khỏi class App được lợi gì khi kiểm thử và khi đổi giao diện?',
            sample='validate_mark và summary chỉ nhận dữ liệu và trả kết quả (hoặc raise), nên kiểm được bằng gọi hàm, không cần mở '
                   'cửa sổ hay bấm nút. App chỉ lo đọc widget, gọi hàm và hiện kết quả. Đổi sang giao diện khác (CLI, web) vẫn dùng '
                   'lại nguyên hai hàm. Trường hợp đặc biệt: list rỗng → "Chưa có điểm", "abc" → ValueError.'),
        scaffold=dict(
            intro='Dữ liệu mới: ứng dụng đổi °C sang °F. Hàm thuần to_fahrenheit đã có; lắp bốn chỗ trong class App.',
            template=r'''import tkinter as tk


def to_fahrenheit(raw):
    celsius = float(raw)
    return round(celsius * 9 / 5 + 32, 1)


class App:
    def __init__(self, root):
        self.celsius = tk.StringVar(value="0")
        tk.Entry(root, textvariable=self.celsius).pack()
        tk.Button(root, text="Đổi", command={{slot1}}).pack()
        {{slot2}} = tk.Label(root, text="")
        self.answer.pack()

    def convert(self):
        value = to_fahrenheit({{slot3}})
        {{slot4}}


root = tk.Tk()
app = App(root)
root.mainloop()
''',
            slots=['self.convert', 'self.answer', 'self.celsius.get()', 'self.answer.config(text=str(value) + " °F")'],
            traps=[('self.convert()', 1, 'Gọi convert ngay trong __init__; nút nhận None.'),
                   ('answer', 2, 'Biến cục bộ mất sau __init__; convert không thấy được.'),
                   ('self.celsius', 3, 'Truyền object StringVar; float() cần chuỗi → TypeError.'),
                   ('print(value)', 4, 'In ra console; nhãn trên cửa sổ không đổi.')]),
        flow=['App(root) → __init__ tạo self.marks, self.mark_var',
              'create_widgets() → Entry, nút, self.result',
              'Bấm "Thêm điểm" → add_mark() gọi validate_mark',
              'ValueError → showerror; hợp lệ → append rồi summary()'],
        transfer='Bộ chấm gọi thẳng validate_mark/summary với dữ liệu mới (biên 0 và 10, "abc", list ba điểm), rồi tạo App mới trên tk.Tk() mới để kiểm self.marks riêng và nút "Thêm điểm".',
        counter=dict(q='summary([9, 8.5, 6.25]) trả gì?',
                     options=['3 điểm, trung bình 7.92', '3 điểm, trung bình 7.91', 'Chưa có điểm'],
                     correct='3 điểm, trung bình 7.92'),
        practice='Hai hàm thuần không chạm widget; App giữ widget trong self, bắt ValueError của validate_mark trong add_mark.',
        steps=['validate_mark: mark = float(raw); ngoài 0..10 → raise ValueError(...); return mark.',
               'summary: list rỗng → "Chưa có điểm"; còn lại f"{len(marks)} điểm, trung bình {sum(marks) / len(marks):.2f}".',
               'create_widgets: tk.Button(self.root, text="Thêm điểm", command=self.add_mark); self.result = tk.Label(...).',
               'add_mark: try validate_mark(self.mark_var.get()) except ValueError → showerror, return; append; self.result.config(text=summary(self.marks)).'],
        partial=r'''    def add_mark(self):
        try:
            mark = validate_mark(self.mark_var.get())
        except ValueError as error:
            ...''',
        io=[('validate_mark("8.5") / validate_mark("11")', '8.5 / ValueError'),
            ('Gõ 8 rồi bấm "Thêm điểm"', 'self.marks = [8.0]; nhãn "1 điểm, trung bình 8.00"')],
        contracts=[K_VALIDATE_MARK, K_SUMMARY, K_APP],
        starter=G05_STARTER,
        solution=G05_SOLUTION,
        tests=[
            T('validate_mark("8.5") → 8.5', 'validate_mark("8.5")', 8.5),
            T('Biên 0 và 10, có khoảng trắng', '[validate_mark(" 0 "), validate_mark("10")]', [0.0, 10.0]),
            T('Dữ liệu sai → ValueError', "[_studio.call(validate_mark, raw).error for raw in ['abc', '10.5', '-1', '']]",
              ['ValueError'] * 4),
            T('validate_mark không tự bật messagebox',
              "(lambda n: (_studio.call(validate_mark, '11'), len(_studio.tk.messages) - n)[1])(len(_studio.tk.messages))", 0),
            T('summary([]) và summary([8, 7])', '(summary([]), summary([8, 7]))', ('Chưa có điểm', '2 điểm, trung bình 7.50')),
            T('summary làm tròn 2 chữ số', 'summary([9, 8.5, 6.25])', '3 điểm, trung bình 7.92'),
            T('App giữ nhãn trong self.result', "app.result.cget('text')", 'Chưa có điểm'),
            T('Bấm "Thêm điểm" với 8', "(app.marks.clear(), app.mark_var.set('8'), %s.invoke(), list(app.marks), "
              "app.result.cget('text'))[3:]" % G05_TAP, ([8.0], '1 điểm, trung bình 8.00')),
            T('"abc" → showerror, không thêm',
              "(lambda n, m: (app.mark_var.set('abc'), %s.invoke(), len(app.marks) - n, len(_studio.tk.messages) - m)[2:])"
              "(len(app.marks), len(_studio.tk.messages))" % G05_TAP, (0, 1)),
            T('App mới: self.marks riêng, nhãn ban đầu', "(lambda a: (a.marks, a.result.cget('text')))(App(tk.Tk()))",
              ([], 'Chưa có điểm')),
            T('add_mark gọi trực tiếp hai lần',
              "(lambda a: (a.mark_var.set('7.5'), a.add_mark(), a.mark_var.set('9'), a.add_mark(), a.result.cget('text'))[-1])(App(tk.Tk()))",
              '2 điểm, trung bình 8.25'),
        ],
        bad=[('command=self.add_mark() gọi ngay', G05_SOLUTION.replace('command=self.add_mark)', 'command=self.add_mark())')),
             ('nhãn kết quả là biến cục bộ', G05_SOLUTION.replace(
                 'self.result = tk.Label(self.root, text=summary(self.marks))\n        self.result.pack()',
                 'result = tk.Label(self.root, text=summary(self.marks))\n        result.pack()')),
             ('hàm logic tự gọi messagebox, trả None', G05_SOLUTION.replace(
                 'def validate_mark(raw):\n    mark = float(raw)\n    if not 0 <= mark <= 10:\n        raise ValueError("Outside 0..10")\n    return mark\n',
                 G05_BAD_VALIDATE)),
             ('marks khai ở thân class (dùng chung)', G05_SOLUTION.replace(
                 'class App:\n    def __init__(self, root):\n        self.root = root\n        self.marks = []\n',
                 'class App:\n    marks = []\n\n    def __init__(self, root):\n        self.root = root\n'))],
    ),

    # ------------------------------------------------------------------ G06
    dict(
        code='G06', title='Event loop và worker nền', minutes=40,
        goal='Giữ giao diện phản hồi: việc dài chạy ở worker thread, kết quả về qua queue, thread GUI đọc queue bằng after().',
        prereq='G05', env=GUI_THREAD_ENV,
        theory=[
            dict(h='Định nghĩa: mainloop là vòng chặn',
                 body='mainloop() không trả về mà quay vòng: lấy một sự kiện, gọi hàm xử lý, vẽ lại, rồi lấy '
                      'tiếp. Callback của bạn chạy BÊN TRONG vòng lặp đó, nên callback tính 5 giây là 5 giây '
                      'cửa sổ treo.'),
            dict(h='Ba luật khi ghép thread vào Tkinter',
                 bullets=['Việc dài chạy ở worker thread; callback chỉ start() rồi trả về ngay',
                          'Worker KHÔNG đụng widget — chỉ put kết quả vào queue.Queue',
                          'Thread GUI đọc queue trong hàm after(ms) hẹn: Empty thì hẹn lại, đừng join()']),
            dict(h='Dùng ở đâu — và Studio khác gì',
                 bullets=['Lưu file lớn, nén, gọi API: nút Huỷ chỉ bấm được khi event loop còn rảnh',
                          'after(ms, f) cũng làm đồng hồ, tự làm mới, hoạt ảnh nhẹ — không cần thread',
                          'Studio không vẽ cửa sổ: worker xong ngay khi start(), bộ chấm chạy hàng đợi after()']),
            dict(h='Đọc sơ đồ',
                 body='Làn trên là thread GUI: callback Tính bắt đầu worker rồi TRẢ VỀ NGAY nên mainloop quay '
                      'tiếp. Làn dưới là worker; nối hai làn chỉ có một mũi tên qua Queue, chấm tròn là các lần '
                      'after(100).',
                 figure='G06-event-loop'),
        ],
        figure=dict(name='G06-event-loop',
                    caption='Event loop rảnh tay: worker tính, Queue chuyển, after() cập nhật',
                    alt='Hai làn thời gian: thread GUI chạy mainloop và các lần after(100) đọc Queue; worker thread '
                        'tính lâu rồi put kết quả vào Queue, không chạm vào widget'),
        slides='SL 95-105, 133',
        brief='Hoàn thành ứng dụng "Tác vụ nền" (slow_total(n) cộng 1..n đã có): worker(n, q) chạy ở thread nền, tính '
              'slow_total(n) rồi q.put(kết quả) — KHÔNG đụng widget.\n\nstart_task(): n_var không phải số nguyên không âm → status '
              '"n phải là số nguyên không âm"; hợp lệ → status "Đang tính...", start một Thread(target=worker, args=(n, q)) '
              '(không join) rồi root.after(100, poll_result).\n\npoll_result(): lấy kết quả bằng q.get_nowait(); queue rỗng '
              '(Empty) → root.after(100, poll_result) hẹn lại; có kết quả → status "Tổng = <kết quả>".',
        example='n = 10, bấm Tính → "Đang tính..." → event loop chạy poll_result → "Tổng = 55".',
        demo=r'''import threading
import tkinter as tk
from queue import Queue, Empty

q = Queue()


def work():
    q.put({"status": "done", "result": 5})      # worker chỉ gửi thông điệp


root = tk.Tk()
label = tk.Label(root, text="Đang chờ...")
label.pack()


def poll_result():
    try:
        message = q.get_nowait()
    except Empty:
        root.after(100, poll_result)             # chưa có: hẹn lượt sau
        return
    label.config(text=f"Kết quả: {message['result']}")
    print("Thread GUI cập nhật Label:", label.cget("text"))


threading.Thread(target=work).start()
root.after(100, poll_result)
root.mainloop()
''',
        explain=[
            'Callback chạy TRÊN thread GUI: callback dài (vòng lặp nặng, sleep, chờ mạng) làm event loop đứng — cửa sổ treo.',
            'Việc dài giao cho worker thread; worker chỉ đưa kết quả vào queue.Queue (an toàn giữa các thread), không đụng widget.',
            'Thread GUI đọc queue bằng get_nowait() trong hàm được after() hẹn giờ: rỗng thì Empty → hẹn lại; có thì cập nhật widget.',
            'Không join() worker trong callback: join chặn thread GUI y như làm việc dài trực tiếp.',
            'Tkinter không an toàn khi nhiều thread cùng gọi widget: chỉ thread chạy mainloop được config/insert vào widget.',
        ],
        predict=dict(q='Trong mô hình worker + queue + after(), ai cập nhật Label?', options=[
            ('Thread GUI, khi poll_result được event loop gọi qua after()', 'Worker chỉ put kết quả vào queue.', True),
            ('Worker thread, ngay khi tính xong', 'Gọi widget từ thread khác là không an toàn.', False),
            ('Queue tự cập nhật Label', 'Queue chỉ chứa dữ liệu.', False),
        ]),
        myth=('"Cho worker gọi status.config(...) luôn cho nhanh"',
              'Tkinter chỉ an toàn khi widget được gọi từ thread chạy mainloop. Gọi từ worker có lúc chạy, có lúc lỗi "main thread '
              'is not in main loop" hoặc treo — tuỳ máy, rất khó tái hiện. Worker put vào queue, thread GUI poll bằng after(). '
              'Cũng đừng "chờ cho chắc" bằng join() trong callback: cửa sổ đứng tới khi worker xong, mất hết lợi ích của thread.'),
        mcq=[
            dict(q='Trong mô hình này ai cập nhật Label?', options=[
                ('Thread GUI khi callback poll_result chạy qua event loop', 'after() hẹn poll_result; event loop gọi nó trên thread GUI.', True),
                ('Worker thread', 'Worker chỉ gửi thông điệp vào queue.', False),
                ('Hệ điều hành', 'Tkinter vẽ lại widget khi thread GUI đổi cấu hình.', False),
            ]),
            dict(q='Vì sao poll_result dùng q.get_nowait() chứ không dùng q.get()?', options=[
                ('get() chặn khi queue rỗng — chặn thread GUI là cửa sổ treo', 'get_nowait() báo Empty ngay để hẹn lại.', True),
                ('get() không có trong queue.Queue', 'get() có, nhưng chặn.', False),
                ('get_nowait() nhanh hơn khi queue có dữ liệu', 'Khác biệt là hành vi khi rỗng.', False),
            ]),
            dict(q='Gọi worker_thread.join() ngay trong start_task thì…', options=[
                ('Cửa sổ đứng tới khi worker xong — như làm việc dài trong callback', 'join chặn nơi gọi, ở đây là thread GUI.', True),
                ('Không ảnh hưởng gì', 'join chặn thread GUI.', False),
                ('Worker chạy nhanh hơn', 'join không tăng tốc worker.', False),
            ]),
        ],
        why=dict(
            prompt='Mô tả đường đi của kết quả từ lúc bấm "Tính" tới lúc Label đổi chữ, và ai làm bước nào.',
            sample='Thread GUI chạy start_task: kiểm n, đổi status "Đang tính...", start worker rồi hẹn poll_result bằng after(). '
                   'Worker tính slow_total(n) rồi put kết quả vào queue. Event loop gọi poll_result trên thread GUI: queue rỗng thì '
                   'hẹn lại, có kết quả thì status.config. Trường hợp đặc biệt: n = "abc" thì không tạo thread nào.'),
        scaffold=dict(
            intro='Dữ liệu mới: worker đếm số chẵn rồi gửi về qua queue box. Lắp ba chỗ.',
            template=r'''import threading
import tkinter as tk
from queue import Queue, Empty

root = tk.Tk()
box = Queue()
label = tk.Label(root, text="...")
label.pack()


def count_even(limit):
    box.put(sum(1 for k in range(limit) if k % 2 == 0))


def check_box():
    try:
        value = {{slot1}}
    except Empty:
        {{slot2}}
        return
    label.config(text=f"Có {value} số chẵn")


def start():
    {{slot3}}
    root.after(100, check_box)


tk.Button(root, text="Đếm", command=start).pack()
root.mainloop()
''',
            slots=['box.get_nowait()', 'root.after(100, check_box)', 'threading.Thread(target=count_even, args=(1000,)).start()'],
            traps=[('box.get()', 1, 'Chặn thread GUI tới khi có dữ liệu — cửa sổ đứng hình.'),
                   ('pass', 2, 'Không hẹn lượt kiểm tra sau: kết quả đến muộn sẽ không bao giờ được hiện.'),
                   ('count_even(1000)', 3, 'Chạy việc dài ngay trong callback; giao diện đứng tới khi xong.')]),
        flow=['Bấm Tính → start_task() start worker, hẹn poll_result',
              'Worker → slow_total(n) rồi q.put(kết quả)',
              'poll_result() rỗng → after(100, poll_result) hẹn lại',
              'poll_result() có kết quả → status.config trên thread GUI'],
        transfer='Bộ chấm bấm Tính với n khác (10, 100, "abc"), đọc nhãn ngay sau khi bấm, rồi chạy hàng đợi after() thay event loop; còn gọi poll_result() khi queue rỗng để xem nó có tự hẹn lại không.',
        counter=dict(q='n = 100, bấm Tính rồi event loop chạy poll_result — status hiện gì?',
                     options=['Tổng = 5050', 'Đang tính...', 'Tổng = 100'], correct='Tổng = 5050'),
        practice='Callback chỉ làm việc ngắn: kiểm n, đổi chữ, start thread, hẹn after. Worker chỉ put vào queue. Chỉ poll_result (thread GUI) đổi widget.',
        steps=['def worker(n, q): q.put(slow_total(n))',
               'start_task: raw = n_var.get().strip(); not raw.isdigit() → báo lỗi, return; status "Đang tính..."; Thread(...).start(); root.after(100, poll_result).',
               'poll_result: try total = q.get_nowait() except Empty: root.after(100, poll_result); return — rồi status.config(text=f"Tổng = {total}").'],
        partial=r'''def poll_result():
    try:
        total = q.get_nowait()
    except Empty:
        root.after(100, poll_result)
        return
    ...''',
        io=[('n = 10, bấm Tính', 'Ngay sau khi bấm: "Đang tính..."; sau khi event loop chạy: "Tổng = 55"'),
            ('n = "abc"', '"n phải là số nguyên không âm"; không tạo thread')],
        contracts=[dict(sig='worker(n, q)', does='Việc nền: tính tổng và gửi về.', takes='n: int ≥ 0; q: Queue',
                        gives='None', effect='q.put(slow_total(n)); không đọc/ghi widget.', call='worker(4, q) → q nhận 10'),
                   dict(sig='poll_result()', does='Thread GUI kiểm queue.', takes='không', gives='None',
                        effect='Có kết quả → status "Tổng = ..."; rỗng → root.after(100, poll_result).',
                        call='q rỗng → hẹn lại; q có 42 → status "Tổng = 42"')],
        starter=G06_STARTER,
        solution=G06_SOLUTION,
        tests=[
            T('Chưa bấm: status "Sẵn sàng"', "status.cget('text')", 'Sẵn sàng'),
            T('slow_total(10) = 55', 'slow_total(10)', 55),
            T('worker đưa KẾT QUẢ vào queue', "(lambda box: (worker(4, box), box.get_nowait())[1])(__import__('queue').Queue())", 10),
            T('Bấm Tính: một thread được start, KHÔNG join trong callback',
              "(lambda r: (r.thread_count, r.threads[0].started, r.threads[0].joined, _studio.tk.run_after(n=5))[:3])"
              "((n_var.set('10'), _studio.call(%s.invoke))[1])" % G06_TAP, (1, True, False)),
            T('n = 10: "Đang tính..." rồi "Tổng = 55"', '(lambda r: (r[2], r[4]))(%s)' % _g06_click('10'),
              ('Đang tính...', 'Tổng = 55')),
            T('n = 100: "Tổng = 5050"', _g06_click('100') + '[4]', 'Tổng = 5050'),
            T('n = "abc": báo lỗi, không tạo thread',
              "(lambda r: (r.thread_count, status.cget('text')))((n_var.set('abc'), _studio.call(%s.invoke))[1])" % G06_TAP,
              (0, 'n phải là số nguyên không âm')),
            T('Queue rỗng → poll_result tự hẹn lại, nhận kết quả ở lượt sau',
              "(poll_result(), q.put(42), _studio.tk.run_after(n=5), status.cget('text'))[-1]", 'Tổng = 42'),
        ],
        bad=[('tính ngay trong callback, không thread', G06_SOLUTION.replace(
                 '    threading.Thread(target=worker, args=(int(raw), q), daemon=True).start()\n',
                 '    worker(int(raw), q)\n')),
             ('join() worker trong callback', G06_SOLUTION.replace(
                 '    threading.Thread(target=worker, args=(int(raw), q), daemon=True).start()\n',
                 '    task = threading.Thread(target=worker, args=(int(raw), q), daemon=True)\n    task.start()\n    task.join()\n')),
             ('worker cập nhật Label trực tiếp', G06_SOLUTION.replace(
                 'def worker(n, q):\n    q.put(slow_total(n))\n',
                 'def worker(n, q):\n    status.config(text=f"Tổng = {slow_total(n)}")\n')),
             ('queue rỗng thì bỏ qua, không hẹn lại', G06_SOLUTION.replace(
                 '    except Empty:\n        root.after(100, poll_result)\n        return\n',
                 '    except Empty:\n        return\n'))],
    ),

    # ------------------------------------------------------------------ R02 (Boss)
    dict(
        code='R02', title='Dự án PW5–PW9: lưu, shell, thread và GUI', minutes=60, gate=True,
        exam='PW5–PW9 · lưu, shell, thread, GUI',
        goal='Ghép lưu file nén, process con, worker thread và Tkinter thành một ứng dụng sổ điểm, logic tách khỏi giao diện.',
        prereq='G06', support=['report.py'], env=R02_ENV,
        theory=[
            dict(h='Bài cửa: bốn mảnh của PW5–PW9',
                 body='Một sổ điểm ghép bốn việc: pickle + gzip LƯU RA FILE, PROCESS CON report.py in báo cáo, '
                      'WORKER THREAD lo việc lưu, GUI Tkinter bọc tất cả. Studio chạy GIẢ cả tkinter lẫn thread: '
                      'không vẽ cửa sổ, bộ chấm gọi hàm thuần.'),
            dict(h='Hai ranh giới phải đi bằng ống',
                 bullets=['Thread: worker lưu BẢN SAO marks, báo về bằng Queue, không đụng widget',
                          'Process: [sys.executable, "report.py"], text=True, returncode khác 0 là lỗi',
                          'after(100) là thread GUI đọc Queue; join() trong nút Lưu làm cửa sổ đứng']),
            dict(h='Ví dụ: một vòng dữ liệu trọn vẹn',
                 body='Bấm Lưu → status "Đang lưu...", worker pickle + gzip rồi put ("ok", 2) vào Queue, '
                      'after(100) đổi status thành "Đã lưu 2 sinh viên". Bấm Báo cáo → report.py đọc "Mai,8.5" '
                      'từ stdin, in Average.'),
            dict(h='Đọc sơ đồ',
                 body='Đi xuống từ ô GUI: dữ liệu đã validate → worker thread → pickle + gzip → file .gz, kết '
                      'quả về qua Queue. Đi ngang: marks → stdin của report.py → stdout; nét đứt là chỗ ĐỔI '
                      'KHÔNG GIAN.',
                 figure='R02-pipeline'),
        ],
        figure=dict(name='R02-pipeline',
                    caption='Đường đi dữ liệu: GUI → thread lưu nén, GUI → process con báo cáo',
                    alt='Sơ đồ GUI ở giữa; nhánh dưới qua worker thread, pickle và gzip ra file, kết quả về qua '
                        'Queue và after(); nhánh ngang qua stdin của process con report.py rồi stdout về GUI'),
        slides='SL 54-56, 106-107, 135',
        brief='Sổ điểm mini PW5–PW9. report.py đã cấp: đọc "tên,điểm" từ stdin, in báo cáo; không có dòng dữ liệu nào '
              'thì in lỗi ra stderr và thoát mã 1. Viết lần lượt:'
              '\n\n1) validate(name, raw_mark) → (tên đã strip, float 0..10), nhận cả "7,5"; tên trống, không phải số hoặc '
              'ngoài khoảng → ValueError.'
              '\n\n2) save_marks(marks, path) lưu dict bằng pickle NÉN gzip; load_marks(path) nạp lại, file chưa có → {}.'
              '\n\n3) run_report(marks) chạy [sys.executable, "report.py"] bằng subprocess, gửi mỗi sinh viên một dòng '
              '"tên,điểm" qua stdin, trả stdout (str); con thoát mã khác 0 → RuntimeError(stderr của con).'
              '\n\n4) start_save(marks, path, done) start một Thread lưu BẢN SAO marks; xong thì put ("ok", số sinh viên) '
              'vào done (OSError → ("error", thông báo)); trả Thread, không join.'
              '\n\n5) App (giao diện đã dựng sẵn): __init__ nạp self.marks = load_marks(path); add → validate, '
              'self.marks[tên] = điểm, status "Có <n> sinh viên" (sai → showerror); save → status "Đang lưu...", '
              'self.saver = start_save(...), after(100, self.poll_save); poll_save → get_nowait, rỗng thì hẹn lại, có thì '
              'status "Đã lưu <n> sinh viên"; report → self.output hiện run_report(self.marks) (lỗi → showerror); '
              'wait_for_save → join self.saver nếu có.',
        example='Thêm Mai 8.5, An 7 → bấm Lưu → "Đang lưu..." → "Đã lưu 2 sinh viên"; Báo cáo → "Mai: 8.5 / An: 7.0 / Average: 7.75".',
        demo=r'''import gzip
import pickle
import threading

result = {}


def save():
    result["blob"] = gzip.compress(pickle.dumps({"marks": [8, 7]}))


worker = threading.Thread(target=save)
worker.start()
worker.join()

blob = result["blob"]
print(blob[:2], len(blob), "byte")
print(pickle.loads(gzip.decompress(blob)))
''',
        explain=[
            'PW5–PW6: pickle biến dict thành bytes, gzip nén lại. Mở file bằng gzip.open(path, "wb"/"rb") — chế độ nhị phân.',
            'Khởi động: nạp lại file nếu có; FileNotFoundError nghĩa là lần chạy đầu → bắt đầu với {}. Chỉ load pickle từ nguồn tin cậy.',
            'PW7: process con chạy bằng sys.executable (đúng Python đang chạy); input= đóng vai "<", capture_output như ">".',
            'text=True để stdout là str; không có thì nhận bytes. returncode khác 0 → báo lỗi bằng stderr của con.',
            'PW8: lưu ở worker thread trên BẢN SAO dữ liệu; báo kết quả qua Queue; join trước khi thoát chứ không join trong callback.',
            'PW9: App chỉ đọc widget, gọi hàm thuần và hiện kết quả; chỉ lưu dữ liệu đã qua validate.',
        ],
        predict=dict(q='Vì sao nút Lưu không được join() worker ngay trong callback?', options=[
            ('join chặn thread GUI tới khi lưu xong — cửa sổ đứng, mất ý nghĩa của worker', 'Chờ worker để lúc thoát (wait_for_save).', True),
            ('join làm file bị lưu hai lần', 'join chỉ chờ, không chạy lại target.', False),
            ('Không sao, join chạy rất nhanh', 'Lưu file lớn hoặc ổ chậm có thể mất nhiều giây.', False),
        ]),
        myth=('Bốn cái bẫy của PW5–PW9',
              'Quên text=True nên stdout là bytes (và input= str nổ TypeError); gọi "python" thay vì sys.executable nên chạy nhầm '
              'Python khác (hoặc không có); lưu pickle mà không nén dù đề yêu cầu nén; join() worker ngay trong nút Lưu làm '
              'cửa sổ đứng. Ngoài ra: worker không được tự đổi Label — chỉ put vào queue.'),
        mcq=[
            dict(q='subprocess.run([...], capture_output=True) không có text=True thì result.stdout là gì?', options=[
                ('bytes, ví dụ b"Mai: 8.5\\n..."', 'text=True mới giải mã thành str.', True),
                ('str như thường', 'Mặc định pipe trả bytes.', False),
                ('None', 'capture_output=True đã thu stdout.', False),
            ]),
            dict(q='Cần học threading trước khi tạo nút Tkinter đầu tiên không?', options=[
                ('Không; cần khi kết hợp nút với tác vụ nền dài', 'Nút đầu tiên chỉ cần callback; thread chỉ cần khi callback phải chờ lâu.', True),
                ('Có, Tkinter bắt buộc dùng thread', 'Tkinter chạy tốt trên một thread.', False),
                ('Có, mỗi nút một thread', 'Chỉ việc dài mới cần worker.', False),
            ]),
            dict(q='Vì sao gọi [sys.executable, "report.py"] thay vì ["python", "report.py"]?', options=[
                ('sys.executable là đúng file Python đang chạy chương trình; "python" có thể là bản khác hoặc không tồn tại', 'Trên Windows "python" có thể là stub của Store.', True),
                ('"python" chạy chậm hơn', 'Không phải chuyện tốc độ.', False),
                ('sys.executable chạy được lệnh shell', 'Nó chỉ là đường dẫn tới trình thông dịch.', False),
            ]),
        ],
        why=dict(
            prompt='Kể đường đi của dữ liệu từ ô nhập tới file marks.dat và tới báo cáo, nêu thread/process nào làm từng bước.',
            sample='Thread GUI: add đọc hai StringVar, validate, ghi vào self.marks. Bấm Lưu: thread GUI start worker với bản sao '
                   'marks; worker pickle + gzip ra file rồi put ("ok", n) vào queue; poll_save (thread GUI, qua after) đổi status. '
                   'Báo cáo: process con report.py nhận "tên,điểm" qua stdin, in báo cáo ra stdout cho cha hiện lên Label. '
                   'Trường hợp đặc biệt: chưa có file → {}, dữ liệu rỗng → con thoát mã 1 → RuntimeError.'),
        flow=['Ô nhập → validate() → self.marks[tên] = điểm',
              'Bấm Lưu → start_save() → worker pickle + gzip → put ("ok", n)',
              'poll_save() qua after() → status "Đã lưu n sinh viên"',
              'Bấm Báo cáo → subprocess report.py → stdout lên self.output'],
        transfer='Bộ chấm gọi thẳng các hàm thuần với dữ liệu mới, kiểm file nén gzip, chạy process con với dữ liệu rỗng, rồi bấm Thêm/Lưu/Báo cáo trên App và chạy hàng đợi after() thay event loop.',
        counter=dict(q='run_report({}) (không có sinh viên nào) cho kết quả gì?',
                     options=['RuntimeError với stderr của report.py', 'Chuỗi rỗng ""', 'Average: 0.00'],
                     correct='RuntimeError với stderr của report.py'),
        practice='Viết và thử từng hàm thuần trước (validate → save/load → run_report → start_save), rồi mới nối vào các method của App.',
        steps=['validate: strip tên, rỗng → ValueError; float(raw.strip().replace(",", ".")); ngoài 0..10 → ValueError.',
               'save_marks: with gzip.open(path, "wb") as f: pickle.dump(marks, f). load_marks: gzip.open(path, "rb") + pickle.load; FileNotFoundError → {}.',
               'run_report: subprocess.run([sys.executable, "report.py"], input=..., capture_output=True, text=True, timeout=10); returncode != 0 → RuntimeError.',
               'start_save: Thread(target=..., args=(dict(marks), path, done)).start(); return thread.',
               'App.save: status "Đang lưu..."; self.saver = start_save(...); self.root.after(100, self.poll_save). wait_for_save: join nếu có.'],
        partial=r'''def run_report(marks):
    lines = "".join(f"{name},{mark}\n" for name, mark in marks.items())
    result = subprocess.run([sys.executable, "report.py"], input=lines,
                            capture_output=True, text=True, timeout=10)
    ...''',
        io=[('validate(" Mai ", "8.5")', '("Mai", 8.5)'),
            ('run_report({"Mai": 8.5, "An": 7.0})', '"Mai: 8.5\\nAn: 7.0\\nAverage: 7.75\\n"'),
            ('Bấm Lưu với 2 sinh viên', '"Đang lưu..." rồi (event loop) "Đã lưu 2 sinh viên"; file nén gzip')],
        contracts=K_R02,
        starter=R02_STARTER,
        solution=R02_SOLUTION,
        tests=[
            T('Khởi động chưa có marks.dat → "Đã nạp 0 sinh viên"', "app.status.cget('text')", 'Đã nạp 0 sinh viên'),
            T('validate chuẩn hoá tên và điểm', '[validate(" Mai ", "8.5"), validate("An", "7,25")]', [('Mai', 8.5), ('An', 7.25)]),
            T('validate từ chối dữ liệu sai bằng ValueError',
              "[_studio.call(validate, n, m).error for n, m in [('An', 'abc'), ('  ', '7'), ('Binh', '11'), ('Chi', '-0.5')]]",
              ['ValueError'] * 4),
            T('save_marks rồi load_marks phục hồi đúng dict',
              "(save_marks({'Lan': 9.25, 'Huy': 6.0}, 't1.dat'), load_marks('t1.dat'))[1]", {'Lan': 9.25, 'Huy': 6.0}),
            T('File lưu được nén gzip (2 byte đầu 1f 8b)',
              "(save_marks({'A': 1.0}, 't2.dat'), open('t2.dat', 'rb').read(2))[1]", b'\x1f\x8b'),
            T('Chưa có file → load_marks trả {}', "load_marks('chua_co.dat')", {}),
            T('run_report: process con in báo cáo', "run_report({'Mai': 8.5, 'An': 7.0})", 'Mai: 8.5\nAn: 7.0\nAverage: 7.75\n'),
            T('Process con lỗi (không có dữ liệu) → RuntimeError', '_studio.call(run_report, {}).error', 'RuntimeError'),
            T('start_save: một worker, ghi file, gửi ("ok", 2)',
              "(lambda box: (lambda r: (r.thread_count, load_marks('t3.dat'), box.get_nowait()))"
              "(_studio.call(start_save, {'Mai': 8.0, 'An': 6.5}, 't3.dat', box)))(__import__('queue').Queue())",
              (1, {'Mai': 8.0, 'An': 6.5}, ('ok', 2))),
            T('Bấm Thêm: Mai 8.5 rồi An 7',
              "(app.marks.clear(), %s, %s, dict(app.marks))[-2:]" % (_r02_add('Mai', '8.5'), _r02_add('An', '7')),
              ('Có 2 sinh viên', {'Mai': 8.5, 'An': 7.0})),
            T('Dữ liệu sai → showerror, không thêm',
              "(lambda n, m: (%s, len(app.marks) - n, len(_studio.tk.messages) - m)[-2:])(len(app.marks), len(_studio.tk.messages))"
              % _r02_add('Binh', '12'), (0, 1)),
            T('Bấm Lưu: worker nền, không join trong callback, "Đang lưu..."',
              "(lambda r: (r.thread_count, r.threads[0].joined, app.status.cget('text'), _studio.tk.run_after(n=5))[:3])"
              "(_studio.call(%s.invoke))" % (R02_TAP % 'Lưu'), (1, False, 'Đang lưu...')),
            T('Event loop chạy poll_save → "Đã lưu 1 sinh viên", file có dữ liệu',
              "(app.marks.clear(), app.marks.update({'Kim': 9.0}), %s.invoke(), _studio.tk.run_after(n=5), "
              "app.status.cget('text'), load_marks(app.path))[-2:]" % (R02_TAP % 'Lưu'),
              ('Đã lưu 1 sinh viên', {'Kim': 9.0})),
            T('Bấm Báo cáo → hiện stdout của process con',
              "(app.marks.clear(), app.marks.update({'Lan': 9.0, 'Huy': 6.0}), %s.invoke(), app.output.cget('text'))[-1]"
              % (R02_TAP % 'Báo cáo'), 'Lan: 9.0\nHuy: 6.0\nAverage: 7.50\n'),
            T('Trước khi thoát: wait_for_save() join worker đang lưu',
              "(lambda r: (app.wait_for_save(), r.threads[0].joined, _studio.tk.run_after(n=5))[1])(_studio.call(%s.invoke))"
              % (R02_TAP % 'Lưu'), True),
            T('Khởi động lại: App mới nạp file đã lưu',
              "(save_marks({'Tam': 5.5}, 'boot.dat'), (lambda a: (a.marks, a.status.cget('text')))(App(tk.Tk(), 'boot.dat')))[1]",
              ({'Tam': 5.5}, 'Đã nạp 1 sinh viên')),
            T('Process con chạy bằng sys.executable',
              "[c['args'][0] == __import__('sys').executable for c in "
              + run(entry="run_report({'Mai': 8.0})") + ".subprocess_calls]", [True]),
        ],
        bad=[('quên text=True', R02_SOLUTION.replace('capture_output=True, text=True, timeout=10)', 'capture_output=True, timeout=10)')),
             ('join() worker ngay trong start_save', R02_SOLUTION.replace(
                 '    saver.start()\n    return saver\n', '    saver.start()\n    saver.join()\n    return saver\n')),
             ('lưu pickle không nén', R02_SOLUTION.replace(
                 '    with gzip.open(path, "wb") as f:\n        pickle.dump(marks, f)\n',
                 '    with open(path, "wb") as f:\n        pickle.dump(marks, f)\n')),
             ('gọi "python" thay vì sys.executable', R02_SOLUTION.replace(
                 '[sys.executable, "report.py"]', '["python", "report.py"]'))],
    ),
]


BRIEFS = {
    'G01': dict(
        goal='Tạo cửa sổ chính, cửa sổ phụ và chạy vòng lặp sự kiện.',
        task='Đặt tiêu đề app_title, kích thước size cho root; thêm Toplevel "Details"; gọi mainloop().',
        predict='Dòng print đặt sau root.mainloop() chạy lúc nào?',
        code=['import tkinter as tk', 'app_title = "Student system"', 'size = "800x600"',
              '# root = tk.Tk(); title(...); geometry(...)', '# details = tk.Toplevel(root)', '# root.mainloop()'],
        tests=['Mặc định → root.title() = Student system, 800x600', 'app_title = "Quản lý điểm" → tiêu đề đổi theo'],
        reflect='Vì sao cửa sổ phụ dùng Toplevel chứ không gọi tk.Tk() lần nữa?'),
    'G02': dict(
        goal='Nối nút với callback và đọc Entry đúng lúc bấm.',
        task='Hoàn thành form đăng nhập: Entry mật khẩu show="*", Label status, nút "Đăng nhập" command=login.',
        predict='command=login() khác command=login thế nào?',
        code=['password_entry = tk.Entry(frame, show="*")', 'status = tk.Label(frame, text="Chưa đăng nhập")',
              'def login():', '    # get() hai Entry, status.config(text=...)',
              'tk.Button(frame, text="Đăng nhập", command=login).pack()'],
        tests=['Mai + usth2026 → Xin chào Mai, hộp "Chào mừng Mai!"', 'Sai mật khẩu → Sai mật khẩu, không hộp thông báo'],
        reflect='Vì sao phải gọi get() bên trong login()?'),
    'G03': dict(
        goal='Đọc Entry, Combobox, Radiobutton, Checkbutton bằng get() và kiểm dữ liệu trước khi dùng.',
        task='Tạo hai Radiobutton chung exam_var; viết add_mark(): đổi điểm sang float (nhận "8,5"), sai thì messagebox.',
        predict='Entry chứa "8.5" có tự là float không?',
        code=['def add_mark():', '    name = name_var.get().strip()', '    raw = mark_var.get().strip().replace(",", ".")',
              '    # try float(raw) ... except ValueError: showerror', '    # 0..10, retake_var.get(), insert vào Listbox'],
        tests=['Mai, 8.5, Python, Giữa kỳ → "Mai | Python | Giữa kỳ | 8.5"', '"abc" → showerror, Listbox không đổi'],
        reflect='Vì sao if retake_var: luôn đúng?'),
    'G04': dict(
        goal='Bố trí form bằng grid trong Frame, khung bằng pack, nhãn góc bằng place.',
        task='Viết build_form(parent, fields) xếp Label/Entry theo hàng; pack form và toolbar; place badge.',
        predict='Có thể pack frame ngoài, grid các con trong frame không?',
        code=['def build_form(parent, fields):', '    entries = {}', '    for row, text in enumerate(fields):',
              '        # Label cột 0, Entry cột 1 sticky="ew"', '    # nút Lưu: row=len(fields), columnspan=2',
              '    return entries'],
        tests=['3 field → Entry ở (0, 1), (1, 1), (2, 1)', 'pack thêm Label vào form đang grid → TclError'],
        reflect='Vì sao không trộn pack và grid trong cùng một parent?'),
    'G05': dict(
        goal='Gói giao diện vào class App, tách logic thành hàm thuần.',
        task='Viết validate_mark, summary (thuần) và App.add_mark nối chúng với widget.',
        predict='self.result khác biến cục bộ result trong create_widgets thế nào?',
        code=['def validate_mark(raw): ...   # raise ValueError', 'def summary(marks): ...', 'class App:',
              '    def create_widgets(self): ...', '    def add_mark(self): ...'],
        tests=['validate_mark("8.5") → 8.5; "abc" → ValueError', 'Bấm "Thêm điểm" với 8 → "1 điểm, trung bình 8.00"'],
        reflect='Vì sao validate_mark không nên tự gọi messagebox?'),
    'G06': dict(
        goal='Giữ giao diện phản hồi: việc dài ở worker, kết quả về qua queue + after().',
        task='start_task start Thread (không join); poll_result đọc queue bằng get_nowait, rỗng thì after() hẹn lại.',
        predict='Trong mô hình này ai cập nhật Label?',
        code=['def worker(n, q):', '    q.put(slow_total(n))', 'def poll_result():',
              '    # get_nowait; Empty → root.after(100, poll_result)', 'def start_task():',
              '    # Thread(...).start(); root.after(100, poll_result)'],
        tests=['n = 10 → "Đang tính..." rồi "Tổng = 55"', 'Bấm Tính → 1 thread, không join trong callback'],
        reflect='Vì sao worker không được tự gọi status.config(...)?'),
    'R02': dict(
        goal='Ghép lưu file nén, process con, worker thread và Tkinter thành một ứng dụng.',
        task='Viết validate, save/load_marks (pickle + gzip), run_report (subprocess), start_save và các method của App.',
        predict='Vì sao nút Lưu không được join() worker ngay trong callback?',
        code=['def validate(name, raw_mark): ...', 'def save_marks(marks, path): ...  # gzip + pickle',
              'def run_report(marks): ...      # [sys.executable, "report.py"]',
              'def start_save(marks, path, done): ...', 'class App: add / save / poll_save / report'],
        tests=['run_report({"Mai": 8.5, "An": 7.0}) → ... Average: 7.75', 'Bấm Lưu → "Đang lưu..." rồi "Đã lưu 2 sinh viên"'],
        reflect='Dữ liệu đi từ ô nhập tới file nén qua những bước nào?'),
}
