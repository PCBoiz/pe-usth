"""Python Advanced (pe-v4) — M2 Đa luồng: T01–T06.

Nguồn: python-learning-data.json (T01–T06: points, examples, quiz) và handbook trang 66–77.
Không bài nào trong nguồn có `exercise`, nên nhiệm vụ chấm được soạn mới, bám `points`.

Vì sao các nhiệm vụ trông như thế này (đọc trước khi sửa):

* Trình duyệt không có thread thật. Bộ chấm (studio-harness.py) thay threading.Thread
  bằng bản mô phỏng: target chạy NGAY khi start(), lần lượt, không xen kẽ. Vì vậy:
  - race condition không bao giờ xảy ra khi chấm → T05 không chấm "kết quả sai do
    race" mà chấm CẤU TRÚC: mọi lần đọc/ghi balance phải nằm trong lúc giữ khoá (đo
    bằng một Lock giả + property ghi nhật ký, chạy trong _studio.check);
  - một lệnh chờ không ai đáp (Queue.get() trên queue rỗng, jobs.join() khi thiếu
    task_done, khoá lại Lock đang giữ) treo mãi trên CPython thật; harness pe-v4 đổi
    nó thành lỗi deadlock, harness cũ thì treo cả worker Pyodide (check-pyodide.mjs
    không có hạn giờ). Không lời giải, khung trống hay biến thể sai nào đi vào đường
    đó, để kết quả chấm không phụ thuộc phiên bản mô phỏng. T06 vì thế xả queue bằng
    get_nowait() tới queue.Empty, và kiểm "đủ task_done" bằng cách gọi thêm
    task_done() phải ra ValueError (API công khai) — không gọi jobs.join() và không
    đọc unfinished_tasks (thuộc tính nội bộ).
* Kết quả phải giống nhau trên CPython thật (thread chạy song song): kết quả ghi vào
  dict theo khoá, list theo chỉ số, hoặc một consumer duy nhất (FIFO xác định).
* Tên thread mặc định khác nhau giữa mô phỏng ("Thread-1") và CPython ≥ 3.10
  ("Thread-1 (worker)") → ca chấm chỉ so tên khi đã đặt name= tường minh.
* T04 không đo thời gian thật: chấm hàm ước lượng trên đồng hồ ảo (giây ghi trong task).
"""
from authoring import T, TX, out, run  # noqa: F401  (out/run: quy ước chung của các file bài)

try:
    from authoring import THREAD_ENV
except ImportError:  # authoring.py của pe-v4 chưa có hằng này
    THREAD_ENV = ('Trình duyệt không chạy được thread thật, nên Studio MÔ PHỎNG threading.Thread: target chạy lần '
                  'lượt ngay khi start() và bộ chấm ghi lại thứ tự tạo / start / join. Hãy chạy thêm file trên máy '
                  '(Windows hoặc Linux) để thấy thread thật — thứ tự dòng in có thể khác mỗi lần.')

GIL_ENV = ('Bài này không chạy thread: bộ chấm dùng ĐỒNG HỒ ẢO (số giây ghi trong từng task), vì trình duyệt chạy '
           'Python trong một luồng duy nhất và thời gian đo thật thì mỗi lần một khác. Muốn thấy GIL thật, chạy trên '
           'máy: hai thread cùng tính sum(range(10**7)) rồi so với hai thread cùng time.sleep(1), đo bằng '
           'time.perf_counter().')

LOCK_ENV = THREAD_ENV + (' Vì các thread không bao giờ xen kẽ ở đây, race condition không tái hiện được: bộ chấm thay '
                         'self.lock bằng một khoá "ghi nhật ký" để kiểm mọi lần đọc/ghi balance đều nằm trong lúc giữ '
                         'khoá. Khoá lại một Lock đang giữ thì trên máy thật chương trình treo mãi.')

# THREAD_ENV khuyên "chạy thêm file trên máy". Với T05 lời khuyên đó dắt sai: đo trên
# CPython 3.12.15, 2 thread × 1 triệu lần `n += 1` ra đúng 2.000.000 cả 3 lần — từ 3.10
# trình thông dịch chỉ đổi thread ở một số điểm (gọi hàm, cuối vòng lặp…), không phải
# giữa mọi bytecode, nên học viên làm theo sẽ "chứng minh" được += an toàn. Đọc →
# time.sleep(0) → ghi thì ra 200·150·150, bọc `with lock:` thì 200 (CPython 3.14.4 cũng thế:
# += trần 2.000.000 cả 3 lần; race_demo.py ra 100·167·200·142·144, có lock thì 200 cả 5).
# Nên chỉ thẳng cách
# làm race lộ ra, bằng file race_demo.py hiện ở mục "File trong thư mục bài" (env là
# chuỗi trơn, xuống dòng bị gộp — code để ở đây thì không đọc được).
LOCK_ENV += (' Trên máy cũng đừng chờ n += 1 trần lộ race: từ CPython 3.10 thread chỉ bị đổi ở một số điểm '
             '(gọi hàm, cuối vòng lặp…), nên 2 thread × 1 triệu lần += thường vẫn ra đúng 2.000.000 — hiếm lộ, '
             'KHÔNG phải nguyên tử. Muốn thấy race thật, chạy python race_demo.py (mục "File trong thư mục bài"): '
             'file chèn time.sleep(0) giữa đọc và ghi nên thường ra dưới 200; bọc ba dòng đó trong with lock: thì '
             'luôn 200.')

QUEUE_ENV = THREAD_ENV + (' Vì worker chạy ngay lúc start(), bài này cho nơi gọi submit HẾT việc rồi mới flush, và worker '
                          'xả queue bằng get_nowait() — không bao giờ phải chờ. Trên máy thật, worker chạy suốt thường dùng '
                          'get() + sentinel None như ví dụ minh hoạ.')


def block(code):
    """Ca chấm dạng khối lệnh: _studio.check chạy trên bản sao namespace, đạt thì True."""
    return '_studio.check(' + repr(code) + ')'


# ===================================================================== T01

T01_SOLUTION = r'''import threading

SHARED = ("code", "global", "heap", "file")
PER_THREAD = ("stack", "pc", "registers")


def scope_of(part):
    if part in SHARED:
        return "shared"
    if part in PER_THREAD:
        return "per-thread"
    raise ValueError("unknown part: " + str(part))


def who_am_i():
    return threading.current_thread().name


if __name__ == "__main__":
    print(scope_of("heap"))
    print(who_am_i())
'''

T01_STARTER = r'''import threading


def scope_of(part):
    # "shared": mọi thread trong process dùng chung; "per-thread": mỗi thread có riêng.
    # Tên khác -> ValueError.
    pass


def who_am_i():
    # Trả tên của thread ĐANG chạy dòng lệnh này.
    pass


if __name__ == "__main__":
    print(scope_of("heap"))
    print(who_am_i())
'''


def names_in_threads(*names):
    """Biểu thức: gọi who_am_i() trong từng thread đặt tên sẵn, trả list tên nhận được.

    Bọc trong _studio.call: thread tạo thẳng trong biểu thức ca chấm (ngoài mọi lần chạy)
    thì bản mô phỏng không biết "thread hiện tại" là ai — current_thread() sẽ ra MainThread.
    """
    return ('_studio.call(lambda box: [(lambda w: (w.start(), w.join()))(__import__("threading").Thread('
            'target=lambda: box.append(who_am_i()), name=n)) for n in %r] and box, []).value' % (list(names),))


# ===================================================================== T02

PAGES = r'''PAGES = {
    "home.html": "<h1>Hi</h1>",
    "news.html": "<p>Python</p>",
    "empty.html": "",
}


def download(url, sizes):
    # Giả lập tải trang (cấp sẵn): ngoài đời đây là lúc chờ mạng.
    sizes[url] = len(PAGES.get(url, ""))
'''

T02_SOLUTION = 'import threading\n\n' + PAGES + r'''

def download_all(urls):
    sizes = {}
    threads = []
    for url in urls:
        worker = threading.Thread(target=download, args=(url, sizes))
        threads.append(worker)
    for worker in threads:
        worker.start()
    for worker in threads:
        worker.join()
    return sizes


if __name__ == "__main__":
    print(download_all(["home.html", "news.html"]))
'''

T02_STARTER = 'import threading\n\n' + PAGES + r'''

def download_all(urls):
    sizes = {}
    # Mỗi url một Thread(target=download, args=(url, sizes)).
    # Vòng thứ nhất start hết, vòng thứ hai join hết.
    return sizes


if __name__ == "__main__":
    print(download_all(["home.html", "news.html"]))
'''

T02_SAME_LOOP = T02_SOLUTION.replace(r'''        worker = threading.Thread(target=download, args=(url, sizes))
        threads.append(worker)
    for worker in threads:
        worker.start()
    for worker in threads:
        worker.join()
''', r'''        worker = threading.Thread(target=download, args=(url, sizes))
        threads.append(worker)
        worker.start()
        worker.join()
''')


# ===================================================================== T03

T03_SOLUTION = r'''import threading


class SumWorker(threading.Thread):
    def __init__(self, numbers):
        super().__init__()
        self.numbers = list(numbers)
        self.total = None

    def run(self):
        self.total = sum(self.numbers)


def parallel_sum(chunks):
    workers = [SumWorker(chunk) for chunk in chunks]
    for worker in workers:
        worker.start()
    for worker in workers:
        worker.join()
    return sum(worker.total for worker in workers)


if __name__ == "__main__":
    print(parallel_sum([[1, 2, 3], [10, 20]]))
'''

T03_STARTER = r'''import threading


class SumWorker(threading.Thread):
    def __init__(self, numbers):
        # Gọi khởi tạo của Thread, rồi lưu numbers và total = None.
        pass

    # Override run(): tính tổng numbers vào self.total.


def parallel_sum(chunks):
    # Mỗi khối một SumWorker; start hết, join hết, cộng các total.
    return 0


if __name__ == "__main__":
    print(parallel_sum([[1, 2, 3], [10, 20]]))
'''

K_SUMWORKER = dict(sig='SumWorker(numbers)  — class con của threading.Thread',
                   does='Một worker tự giữ dữ liệu và kết quả của nó.',
                   takes='numbers: iterable các số (list, tuple, range…)',
                   gives='object Thread; total = None tới khi run() chạy xong',
                   effect='run() gán self.total = sum(numbers); không in.',
                   call='w = SumWorker([4, 5]); w.start(); w.join(); w.total → 9')
K_PARALLEL_SUM = dict(sig='parallel_sum(chunks)', does='Cộng nhiều khối số, mỗi khối một SumWorker.',
                      takes='chunks: list các khối số (có thể rỗng)', gives='int: tổng mọi total',
                      effect='Tạo len(chunks) worker, start hết rồi join hết.',
                      call='parallel_sum([[1, 2, 3], [10, 20]]) → 36')


# ===================================================================== T04

T04_SOLUTION = r'''def wall_time(tasks, strategy):
    cpu = [seconds for kind, seconds in tasks if kind == "cpu"]
    io = [seconds for kind, seconds in tasks if kind == "io"]
    if strategy == "serial":
        return sum(cpu) + sum(io)
    if strategy == "thread":
        return max(sum(cpu), max(io, default=0))
    if strategy == "process":
        return max(cpu + io, default=0)
    raise ValueError("unknown strategy: " + str(strategy))


def best_strategy(tasks):
    best = "serial"
    for strategy in ("thread", "process"):
        if wall_time(tasks, strategy) < wall_time(tasks, best):
            best = strategy
    return best


if __name__ == "__main__":
    work = [("io", 2), ("io", 3), ("cpu", 4)]
    print(wall_time(work, "serial"), wall_time(work, "thread"), wall_time(work, "process"))
    print(best_strategy(work))
'''

T04_STARTER = r'''def wall_time(tasks, strategy):
    # tasks: list các (kind, seconds) — kind là "cpu" hoặc "io".
    # strategy: "serial" | "thread" | "process"; khác -> ValueError.
    pass


def best_strategy(tasks):
    # Nhanh nhất trong serial / thread / process; bằng nhau thì chọn cách đứng trước.
    pass


if __name__ == "__main__":
    work = [("io", 2), ("io", 3), ("cpu", 4)]
    print(wall_time(work, "serial"), wall_time(work, "thread"), wall_time(work, "process"))
    print(best_strategy(work))
'''

K_WALL = dict(sig='wall_time(tasks, strategy)', does='Ước lượng thời gian chạy lý tưởng của một workload.',
              takes='tasks: list (kind, seconds), kind "cpu"/"io"; strategy: "serial" | "thread" | "process"',
              gives='số giây (int/float); strategy lạ → ValueError',
              effect='Không chạy gì thật, không in. Mô hình: mỗi task một worker, đủ lõi, bỏ qua chi phí tạo.',
              call='wall_time([("io", 2), ("io", 3), ("cpu", 4)], "thread") → 4')
K_BEST = dict(sig='best_strategy(tasks)', does='Chọn cách chạy nhanh nhất; bằng nhau thì chọn cách đơn giản hơn.',
              takes='tasks: như wall_time', gives='"serial" | "thread" | "process"',
              effect='So lần lượt serial → thread → process; chỉ đổi khi NHANH HƠN hẳn.',
              call='best_strategy([("cpu", 2), ("cpu", 2)]) → "process"')


# ===================================================================== T05

T05_CLASS_HEAD = r'''import threading


class Account:
    def __init__(self, balance=0):
        self.balance = balance
        self.lock = threading.Lock()
'''

T05_RUN_DEPOSITS = r'''

def run_deposits(account, amounts):
    threads = [threading.Thread(target=account.deposit, args=(amount,)) for amount in amounts]
    for worker in threads:
        worker.start()
    for worker in threads:
        worker.join()
    return account.balance
'''

T05_MAIN = r'''

if __name__ == "__main__":
    account = Account(100)
    print(run_deposits(account, [10, 20, 30]))
    print(safe_plan(["db", "log"], ["db", "cache", "log"]))
'''

T05_SOLUTION = T05_CLASS_HEAD + r'''
    def deposit(self, amount):
        with self.lock:
            self.balance += amount

    def withdraw(self, amount):
        with self.lock:
            if amount > self.balance:
                raise ValueError("insufficient funds")
            self.balance -= amount
''' + T05_RUN_DEPOSITS + r'''

def safe_plan(plan, order):
    positions = [order.index(name) for name in plan]
    for i in range(1, len(positions)):
        if positions[i] <= positions[i - 1]:
            return False
    return True
''' + T05_MAIN

T05_STARTER = T05_CLASS_HEAD + r'''
    def deposit(self, amount):
        # Đọc-cộng-ghi balance phải nằm trong critical section.
        self.balance += amount

    def withdraw(self, amount):
        # Thiếu tiền -> ValueError("insufficient funds"); đủ thì trừ. Cả hai bước trong lock.
        pass
''' + T05_RUN_DEPOSITS + r'''

def safe_plan(plan, order):
    # True nếu plan khoá theo đúng thứ tự trong order (tăng dần, không lặp lại).
    # Tên lock không có trong order -> ValueError.
    pass
''' + T05_MAIN

WITHDRAW_WITH = r'''        with self.lock:
            if amount > self.balance:
                raise ValueError("insufficient funds")
            self.balance -= amount
'''

# Lock giả + property ghi nhật ký: mỗi lần đọc/ghi balance ghi lại "lúc đó có đang giữ
# self.lock không". Chạy tuần tự, không thread nào — nên không bao giờ treo, kể cả khi
# học viên viết sai.
PROBE = r'''class Probe:
    def __init__(self):
        self.held = False

    def acquire(self, blocking=True, timeout=-1):
        assert not self.held, "khoá lại self.lock khi đang giữ nó — Lock thật sẽ treo ở đây"
        self.held = True
        return True

    def release(self):
        self.held = False

    def locked(self):
        return self.held

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, *exc):
        self.release()
        return False


class Spy(Account):
    log = None

    @property
    def balance(self):
        if self.log is not None:
            self.log.append(self.lock.held)
        return self._value

    @balance.setter
    def balance(self, value):
        if self.log is not None:
            self.log.append(self.lock.held)
        self._value = value


a = Spy(10)
a.lock = Probe()
a.log = []
'''

T05_SPY_DEPOSIT = PROBE + r'''a.deposit(5)
assert a.log, "deposit không đọc/ghi self.balance"
assert all(a.log), "deposit đọc hoặc ghi balance khi CHƯA giữ self.lock"
assert not a.lock.held, "deposit xong mà chưa nhả self.lock"
assert a._value == 15, "balance sau deposit(5) phải là 15"
'''

T05_SPY_WITHDRAW = PROBE + r'''a.withdraw(4)
assert len(a.log) >= 2, "withdraw phải đọc balance để kiểm tra rồi ghi lại"
assert all(a.log), "phép KIỂM TRA số dư và phép TRỪ phải cùng nằm trong with self.lock"
assert not a.lock.held, "withdraw xong mà chưa nhả self.lock"
assert a._value == 6, "balance sau withdraw(4) phải là 6"
'''

K_DEPOSIT = dict(sig='Account.deposit(self, amount)', does='Nạp tiền an toàn khi nhiều thread cùng gọi.',
                 takes='self; amount: số cần cộng', gives='None',
                 effect='Đọc-cộng-ghi self.balance trong with self.lock; lỗi giữa chừng vẫn nhả khoá.',
                 call='Account(10).deposit(5) → balance 15')
K_WITHDRAW = dict(sig='Account.withdraw(self, amount)', does='Rút tiền: kiểm tra rồi trừ như MỘT bước.',
                  takes='self; amount: số cần trừ', gives='None; amount > balance → ValueError("insufficient funds")',
                  effect='Kiểm tra và trừ trong cùng một with self.lock; rút đúng bằng số dư là hợp lệ.',
                  call='Account(5).withdraw(9) → ValueError, balance vẫn 5, khoá đã nhả')
K_SAFE = dict(sig='safe_plan(plan, order)', does='Kiểm một thread có khoá theo đúng thứ tự đã thống nhất không.',
              takes='plan: list tên lock theo thứ tự thread khoá; order: list tên lock theo thứ tự chung',
              gives='bool; tên lock không có trong order → ValueError',
              effect='Không khoá gì thật, không in.',
              call='safe_plan(["log", "db"], ["db", "cache", "log"]) → False')


# ===================================================================== T06

T06_SOLUTION = r'''import queue
import threading


class BackgroundSaver:
    def __init__(self):
        self.jobs = queue.Queue()
        self.lines = []

    def submit(self, record):
        self.jobs.put(dict(record))

    def _work(self):
        while True:
            try:
                record = self.jobs.get_nowait()
            except queue.Empty:
                return
            self.lines.append(f"{record['name']},{record['mark']}")
            self.jobs.task_done()

    def flush(self):
        worker = threading.Thread(target=self._work)
        worker.start()
        worker.join()
        return len(self.lines)


if __name__ == "__main__":
    saver = BackgroundSaver()
    saver.submit({"name": "An", "mark": 8})
    saver.submit({"name": "Binh", "mark": 7})
    print(saver.flush(), saver.lines)
'''

T06_STARTER = r'''import queue
import threading


class BackgroundSaver:
    def __init__(self):
        self.jobs = queue.Queue()
        self.lines = []

    def submit(self, record):
        # Đưa BẢN SAO record vào self.jobs.
        pass

    def _work(self):
        # Lấy từng job bằng get_nowait() tới khi gặp queue.Empty;
        # mỗi job: thêm "name,mark" vào self.lines rồi task_done().
        pass

    def flush(self):
        # Tạo Thread chạy self._work, start, join; trả tổng số dòng đã lưu.
        pass


if __name__ == "__main__":
    saver = BackgroundSaver()
    saver.submit({"name": "An", "mark": 8})
    saver.submit({"name": "Binh", "mark": 7})
    print(saver.flush(), saver.lines)
'''


def saver(*steps):
    """Biểu thức: tạo BackgroundSaver s, chạy lần lượt các bước (chuỗi dùng s), trả giá trị bước cuối."""
    return '(lambda s: (' + ', '.join(steps) + ',)[-1])(BackgroundSaver())'


def rec(name, mark):
    return 's.submit({"name": %r, "mark": %r})' % (name, mark)


K_SUBMIT = dict(sig='BackgroundSaver.submit(self, record)', does='Giao một bản ghi cho worker nền.',
                takes='record: dict có "name", "mark"', gives='None',
                effect='put BẢN SAO vào self.jobs; chưa lưu gì — việc lưu là của worker.',
                call='s.submit({"name": "An", "mark": 8})')
K_FLUSH = dict(sig='BackgroundSaver.flush(self)', does='Chạy worker nền xả hết việc trong queue.',
               takes='self', gives='int: tổng số dòng trong self.lines',
               effect='Tạo Thread MỚI (target=self._work), start, join. Worker lấy bằng get_nowait() tới queue.Empty, '
                      'mỗi job thêm "name,mark" vào self.lines rồi task_done().',
               call='submit An 8, Binh 7 → flush() → 2; lines = ["An,8", "Binh,7"]')


# ===================================================================== bài

LESSONS = [
    # ------------------------------------------------------------------ T01
    dict(
        code='T01', title='Thread, tài nguyên và concurrency', minutes=25,
        goal='Phân biệt phần các thread trong một process dùng chung với phần mỗi thread có riêng.',
        prereq=None, env=THREAD_ENV,
        theory=[
            dict(h='Định nghĩa: thread là gì',
                 body='Thread là MỘT dòng thực thi nằm trong một process; mặc định mỗi process chỉ có một thread. '
                      'Multi-thread là nhiều dòng thực thi cùng chạy trong một process, dùng chung đúng một PCB.',
                 bullets=['Chung: heap, biến toàn cục, code, file descriptor',
                          'Riêng từng thread: stack và stack pointer, program counter, registers',
                          'Heap chung nên trao đổi dữ liệu không cần IPC như giữa hai process']),
            dict(h='Ví dụ: cùng mục tiêu, khác cách chia',
                 body='Multi-process và multi-thread cùng nhắm ba đích: làm nhiều việc một lúc, tăng mức dùng CPU, '
                      'tăng responsiveness. Khác ở cách chia tài nguyên — fork() nhân bản (con nhận bản sao vùng '
                      'nhớ), còn thread thì dùng chung.'),
            dict(h='Dùng ở đâu',
                 bullets=['Apache prefork: mỗi HTTP request một child process — cách ly tốt, tốn bộ nhớ',
                          'Apache worker: ít process hơn, mỗi process nhiều thread, mỗi thread một request',
                          'Chrome: mỗi tab một process; trong đó có main thread, render thread, I/O thread']),
            dict(h='Cái giá và giới hạn',
                 bullets=['Nondeterministic: cùng một code, mỗi lần chạy thứ tự dòng in có thể khác',
                          'Phải tự đồng bộ: race condition (T05), deadlock, code khó đọc hơn',
                          'Studio chạy các target lần lượt; chạy file trên máy mới thấy thứ tự thật']),
            dict(h='Đọc sơ đồ', figure='T01-thread-vs-process',
                 body='Khung lớn là MỘT process: hàng trên — code, data, heap, file descs — vẽ một lần vì là phần dùng '
                      'chung. Mỗi cột dưới là một thread có stack và registers riêng; bên phần multi-process, mỗi '
                      'process có đủ một bộ ô riêng.'),
        ],
        figure=dict(name='T01-thread-vs-process',
                    caption='Một process nhiều thread: cái gì chung, cái gì riêng',
                    alt='Process chứa code, data, heap, file descriptor dùng chung; ba thread mỗi thread một stack và '
                        'registers riêng; bên cạnh là hai process tách rời, không chia gì'),
        slides='SL 61-72',
        brief='Một process có thể chạy nhiều thread. Viết scope_of(part): trả "shared" cho phần mọi thread trong '
              'process dùng chung ("code", "global", "heap", "file") và "per-thread" cho phần mỗi thread có riêng '
              '("stack", "pc" — program counter, "registers"); tên khác → ValueError. Viết thêm who_am_i() trả tên '
              'của thread ĐANG chạy dòng lệnh đó (threading.current_thread().name).',
        example='scope_of("heap") → "shared"; who_am_i() gọi ở chương trình chính → "MainThread", gọi trong '
                'Thread(..., name="saver") → "saver".',
        demo=r'''import threading

shared_log = []

def worker():
    step = "worker"
    shared_log.append(threading.current_thread().name)

t = threading.Thread(target=worker, name="worker-1")
t.start()
t.join()
shared_log.append(threading.current_thread().name)
print(shared_log)
''',
        explain=[
            'Process là chương trình đang chạy, có vùng nhớ riêng. Thread là một DÒNG THỰC THI bên trong process: '
            'process nào cũng có ít nhất main thread (tên "MainThread"); multi-thread là nhiều dòng thực thi trong '
            'cùng một process.',
            'Mỗi thread có stack (biến cục bộ của các lời gọi hàm đang chạy), program counter (đang ở lệnh nào) và '
            'thanh ghi riêng. Hai thread chạy cùng một hàm vẫn không lẫn biến cục bộ của nhau.',
            'Code, biến toàn cục, heap (mọi object: list, dict…) và file đang mở thì DÙNG CHUNG: trong ví dụ, worker '
            'append vào shared_log và main thread thấy ngay, không cần gửi lại.',
            'current_thread() trả về thread đang chạy dòng lệnh gọi nó. Cùng một code, chạy trong worker thì ra '
            '"worker-1", chạy ở main thì ra "MainThread".',
            'Process nhấn mạnh CÁCH LY, thread nhấn mạnh CHIA SẺ. Lợi: chương trình phản hồi nhanh (giao diện không '
            'đứng), chạy tác vụ nền, chia sẻ dữ liệu rẻ, tận dụng nhiều việc chờ cùng lúc. Giá phải trả: thứ tự chạy '
            'không xác định, race condition, deadlock, chi phí đồng bộ.',
        ],
        predict=dict(q='Worker thread append vào list toàn cục shared_log rồi kết thúc. Sau join(), main thread in '
                       'shared_log thấy gì?', options=[
            ('Thấy phần tử worker vừa thêm — hai thread dùng chung heap của process',
             'List là object trên heap; mọi thread trong process cùng trỏ tới nó.', True),
            ('Không thấy — worker sửa trên bản sao của riêng nó',
             'Đó là process con: nó có vùng nhớ riêng. Thread thì không.', False),
            ('Lúc thấy lúc không, tuỳ máy',
             'Thứ tự chạy không xác định, nhưng sau join() worker chắc chắn đã xong.', False),
        ]),
        myth=('"Mỗi thread có bản sao heap và biến toàn cục riêng, giống process con"',
              'Đó là hành vi của process: process con làm việc trên vùng nhớ riêng nên sửa list không ảnh hưởng cha. '
              'Thread trong cùng process dùng chung code, biến toàn cục, heap và file đang mở; chỉ stack, program '
              'counter và thanh ghi là của riêng từng thread. Vì dùng chung nên trao đổi dữ liệu rẻ — và cũng vì dùng '
              'chung mà sinh ra race condition (T05).'),
        mcq=[
            dict(q='Hai thread trong cùng process có nhất thiết copy toàn bộ heap không?', options=[
                ('Không — chúng dùng chung heap của process', 'Chỉ stack, program counter và thanh ghi là riêng.', True),
                ('Có — mỗi thread một bản heap', 'Đó là process con, không phải thread.', False),
                ('Chỉ copy khi thread ghi vào heap', 'Copy-on-write là chuyện của fork process.', False),
            ]),
            dict(q='Hai thread cùng chạy hàm f; trong f có biến cục bộ total. Hai biến total đó…', options=[
                ('Là hai biến khác nhau — mỗi lời gọi nằm trên stack của thread mình', 'Biến cục bộ sống trên stack.', True),
                ('Là một biến dùng chung', 'Chỉ biến toàn cục và object trên heap mới dùng chung.', False),
                ('Gây NameError ở thread thứ hai', 'Mỗi thread có lời gọi f riêng, không lỗi gì.', False),
            ]),
            dict(q='Cái giá nào đi kèm multi-thread?', options=[
                ('Thứ tự chạy không xác định, race condition, deadlock — phải tự đồng bộ',
                 'Cái giá của việc dùng chung bộ nhớ.', True),
                ('Mỗi thread tốn một bản sao bộ nhớ của process', 'Thread dùng chung bộ nhớ của process.', False),
                ('Các thread không chia sẻ được dữ liệu', 'Ngược lại: chia sẻ là điểm mạnh của thread.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao cùng một hàm who_am_i lại trả hai tên khác nhau ở hai thread, trong khi hai thread cùng '
                   'thấy một list toàn cục?',
            sample='Code của hàm dùng chung, nhưng mỗi thread là một dòng thực thi riêng với stack và program counter '
                   'riêng; current_thread() trả về thread ĐANG chạy lệnh đó, nên worker "saver" nhận "saver", main '
                   'nhận "MainThread". List toàn cục là object trên heap dùng chung, nên thay đổi của thread này thread '
                   'kia thấy được. Trường hợp đặc biệt: tên lạ như "gpu" không thuộc nhóm nào → ValueError.'),
        scaffold=dict(
            intro='Lắp hai nhóm tài nguyên và lời gọi đọc tên thread hiện tại.',
            template=r'''import threading

SHARED = {{slot1}}
PER_THREAD = {{slot2}}


def scope_of(part):
    if part in SHARED:
        return "shared"
    if part in PER_THREAD:
        return "per-thread"
    raise ValueError("unknown part: " + str(part))


def who_am_i():
    return {{slot3}}
''',
            slots=['("code", "global", "heap", "file")', '("stack", "pc", "registers")',
                   'threading.current_thread().name'],
            traps=[('("code", "global", "file")', 1, 'Thiếu heap: các thread dùng chung heap, không copy.'),
                   ('("stack", "pc", "registers", "global")', 2,
                    'Biến toàn cục dùng chung — chỉ process con mới có bản riêng.'),
                   ('"MainThread"', 3, 'Viết cứng: gọi trong worker vẫn trả MainThread.'),
                   ('threading.main_thread().name', 3, 'Luôn là main thread, không phải thread đang chạy.')]),
        flow=['scope_of("heap") → "shared": mọi thread thấy cùng object',
              'scope_of("stack") → "per-thread": biến cục bộ không lẫn',
              'who_am_i() ở chương trình chính → "MainThread"',
              'who_am_i() trong Thread(name="saver") → "saver"'],
        transfer='Gọi who_am_i trong hai thread đặt tên khác nhau; thử một tên tài nguyên lạ để thấy ValueError.',
        counter=dict(q='Thread(target=lambda: print(who_am_i()), name="bg") được start — dòng in ra là gì?',
                     options=['bg', 'MainThread', 'Thread-1'], correct='bg'),
        practice='Gom tên tài nguyên vào hai tuple, scope_of chỉ việc tra; who_am_i đọc tên thread LÚC ĐƯỢC GỌI, '
                 'không viết cứng.',
        steps=['SHARED = ("code", "global", "heap", "file"); PER_THREAD = ("stack", "pc", "registers").',
               'scope_of: thuộc SHARED → "shared"; thuộc PER_THREAD → "per-thread"; còn lại raise ValueError.',
               'who_am_i trả threading.current_thread().name.'],
        partial=r'''def scope_of(part):
    if part in SHARED:
        return "shared"
    ...''',
        io=[('scope_of("heap")', '"shared"'), ('scope_of("stack")', '"per-thread"'),
            ('who_am_i() trong Thread(name="saver")', '"saver"'), ('scope_of("gpu")', 'ValueError')],
        starter=T01_STARTER,
        solution=T01_SOLUTION,
        tests=[
            T('heap → "shared" (thread không copy heap)', 'scope_of("heap")', 'shared'),
            T('stack → "per-thread"', 'scope_of("stack")', 'per-thread'),
            T('global và file dùng chung', '[scope_of("global"), scope_of("file")]', ['shared', 'shared']),
            T('code dùng chung; pc, registers riêng', '[scope_of("code"), scope_of("pc"), scope_of("registers")]',
              ['shared', 'per-thread', 'per-thread']),
            T('Tên lạ → ValueError', '_studio.call(scope_of, "gpu").error', 'ValueError'),
            T('Gọi ở chương trình chính → "MainThread"', 'who_am_i()', 'MainThread'),
            T('Gọi trong Thread(name="saver") → "saver"', names_in_threads('saver'), ['saver']),
            T('Hai thread khác tên → hai kết quả', names_in_threads('a', 'b'), ['a', 'b']),
        ],
        bad=[('heap riêng cho từng thread', T01_SOLUTION.replace(
                 'SHARED = ("code", "global", "heap", "file")\nPER_THREAD = ("stack", "pc", "registers")',
                 'SHARED = ("code", "global", "file")\nPER_THREAD = ("stack", "pc", "registers", "heap")')),
             ('viết cứng tên thread', T01_SOLUTION.replace('return threading.current_thread().name',
                                                           'return "MainThread"')),
             ('biến toàn cục copy cho mỗi thread (nhầm với process)', T01_SOLUTION.replace(
                 'SHARED = ("code", "global", "heap", "file")\nPER_THREAD = ("stack", "pc", "registers")',
                 'SHARED = ("code", "heap", "file")\nPER_THREAD = ("stack", "pc", "registers", "global")'))],
    ),

    # ------------------------------------------------------------------ T02
    dict(
        code='T02', title='Thread target, start và join', minutes=30,
        goal='Tạo nhiều Thread với target/args, start hết rồi join hết.',
        prereq='T01', env=THREAD_ENV,
        theory=[
            dict(h='Năm bước dùng thread',
                 body='Cách dùng thread gọn lại thành năm bước. Bài này đi đúng năm bước đó, chỉ khác là cho nhiều '
                      'worker một lúc chứ không phải một.',
                 bullets=['1–2. import threading, rồi Thread(target=hàm, args=…) mô tả việc',
                          '3–4. Tạo instance (chưa có dòng thực thi nào), start() mới sinh thread',
                          '5. [tuỳ chọn] join(): chờ thread kết thúc rồi mới đi tiếp']),
            dict(h='start() chứ không phải run()',
                 body='start() là chỗ DUY NHẤT sinh ra thread, và nó không nhận đối số — đối số đã đưa lúc tạo object. '
                      'Gọi run() hay gọi thẳng hàm target chỉ là một lời gọi hàm bình thường trong thread hiện tại: '
                      'kết quả vẫn đúng nhưng tuần tự.',
                 bullets=['Một Thread chỉ start() được MỘT lần; muốn chạy lại phải tạo object mới']),
            dict(h='Dùng ở đâu',
                 bullets=['Tải nhiều URL, đọc nhiều file: phần lớn thời gian là chờ nên các lần chờ chồng lên nhau',
                          'Máy chủ: mỗi kết nối một thread, đúng mô hình Apache worker ở T01',
                          'Chỉ đáng dùng khi CHỜ là chính — tính Python thuần thì vướng GIL (T04)']),
            dict(h='Đọc sơ đồ', figure='T02-start-join',
                 body='Mỗi start() rẽ ra một đường mới ngay tại thời điểm đó, nên hai worker CHỒNG LÊN nhau; join() là '
                      'đoạn main đứng chờ. Start hết rồi join hết thì song song; start–join từng cái thì nối đuôi — '
                      'Studio luôn cho kiểu nối đuôi.'),
        ],
        figure=dict(name='T02-start-join',
                    caption='start() rẽ nhánh, join() chờ nhánh về',
                    alt='Dòng thời gian: main thread gọi start() hai lần tạo hai đường worker chạy chồng lên nhau, rồi '
                        'join() chờ cả hai kết thúc trước khi main đi tiếp'),
        slides='SL 95-102',
        brief='download(url, sizes) đã cấp: "tải" một trang trong PAGES và ghi số ký tự vào dict sizes. Viết '
              'download_all(urls): mỗi url một threading.Thread(target=download, args=(url, sizes)); vòng thứ nhất '
              'start TẤT CẢ, vòng thứ hai join TẤT CẢ, rồi mới trả sizes. urls rỗng → {} và không tạo thread nào.',
        example='download_all(["home.html", "news.html"]) → {"home.html": 11, "news.html": 13}, hai thread.',
        demo=r'''import threading

def greet(name, punctuation):
    print("Hello " + name + punctuation)

worker = threading.Thread(target=greet, args=("Mai",), kwargs={"punctuation": "!"})
print("Trước start:", worker.is_alive())
worker.start()
worker.join()
print("Sau join:", worker.is_alive())
''',
        explain=[
            'Thread(target=greet, args=("Mai",)) chỉ TẠO đối tượng mô tả công việc, chưa chạy gì. target là tên hàm '
            '(không ngoặc); args là tuple đối số — một phần tử thì cần dấu phẩy ("Mai",); kwargs là dict đối số theo tên.',
            'start() tạo dòng thực thi mới và cho target chạy trong đó; chương trình chính đi tiếp ngay. Gọi '
            'worker.run() thì target chạy NGAY trong thread hiện tại — không có thread mới nào.',
            'join() CHỜ thread kết thúc; nó không khởi động thread (join khi chưa start → RuntimeError). Muốn nhiều '
            'worker chạy chồng lấp: vòng thứ nhất start hết, vòng thứ hai join hết.',
            'time.sleep(x) chỉ tạm dừng thread gọi nó — các thread khác vẫn chạy. Đó là lý do nhiều thread cùng "chờ '
            'mạng" thì tổng thời gian gần bằng lần chờ lâu nhất.',
            'Thread daemon=True bị bỏ dở khi chương trình chính thoát. Đừng giao việc phải hoàn tất (lưu dữ liệu) cho '
            'daemon thread mà không join.',
        ],
        predict=dict(q='Ba trang, mỗi trang chờ mạng 1 giây. Viết "start rồi join ngay" trong CÙNG một vòng lặp thì '
                       'tổng thời gian khoảng bao nhiêu?', options=[
            ('Khoảng 3 giây — join chặn nên worker sau chỉ start khi worker trước xong',
             'Thành chạy lần lượt; start hết rồi mới join thì khoảng 1 giây.', True),
            ('Khoảng 1 giây', 'Chỉ đúng khi start hết rồi mới join.', False),
            ('Gần 0 giây vì thread chạy nền', 'join vẫn chờ từng worker xong.', False),
        ]),
        myth=('"join() là lệnh cho thread chạy"',
              'join chỉ CHỜ. Thread chỉ chạy khi start(); join một thread chưa start → RuntimeError: cannot join thread '
              'before it is started. Ngược lại, gọi run() trực tiếp thì target có chạy nhưng ở thread hiện tại — không '
              'có thread mới, không chồng lấp gì cả.'),
        mcq=[
            dict(q='Gọi t.run() có tạo thread mới không?', options=[
                ('Không — target chạy ngay trong thread đang gọi; muốn thread mới phải t.start()',
                 'run() chỉ là hàm gọi target.', True),
                ('Có, run() và start() như nhau', 'Chỉ start() tạo dòng thực thi mới.', False),
                ('Có, nhưng không join được', 'Không có thread mới nào để join.', False),
            ]),
            dict(q='Thread(target=save, args=("data.pkl")) — chuyện gì xảy ra khi start?', options=[
                ('Lỗi TypeError trong thread: args là chuỗi nên bị tách thành 8 ký tự',
                 '("data.pkl") chỉ là chuỗi trong ngoặc; cần ("data.pkl",).', True),
                ('Chạy bình thường', 'Thread gọi save(*args) = save("d", "a", "t", …).', False),
                ('Lỗi ngay lúc tạo Thread', 'Thread chỉ gọi target(*args) khi chạy.', False),
            ]),
            dict(q='Worker daemon=True đang ghi file thì chương trình chính kết thúc. Điều gì có thể xảy ra?', options=[
                ('Worker bị dừng giữa chừng, file ghi dở', 'Daemon không giữ chương trình sống; cần join nếu việc phải xong.', True),
                ('Chương trình chờ worker ghi xong', 'Đó là thread thường (daemon=False).', False),
                ('Python báo lỗi DaemonError', 'Không có lỗi nào như vậy.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao download_all phải start hết rồi mới join hết, và vì sao chỉ trả sizes sau vòng join?',
            sample='start hết trước để các worker cùng chờ mạng chồng lấp nhau; join ngay sau từng start biến chúng '
                   'thành chạy lần lượt. sizes là dict dùng chung mà các worker ghi vào; chỉ sau khi join hết mới chắc '
                   'mọi worker đã ghi xong. Trường hợp đặc biệt: urls rỗng → không tạo thread nào, trả {}.'),
        scaffold=dict(
            intro='Lắp ba chỗ: tạo Thread đúng target/args, start, join.',
            template=r'''def download_all(urls):
    sizes = {}
    threads = []
    for url in urls:
        worker = {{slot1}}
        threads.append(worker)
    for worker in threads:
        {{slot2}}
    for worker in threads:
        {{slot3}}
    return sizes
''',
            slots=['threading.Thread(target=download, args=(url, sizes))', 'worker.start()', 'worker.join()'],
            traps=[('threading.Thread(target=download(url, sizes))', 1,
                    'Gọi download ngay ở thread chính; Thread nhận target=None.'),
                   ('threading.Thread(target=download, args=url)', 1, 'args phải là tuple đủ hai đối số (url, sizes).'),
                   ('worker.run()', 2, 'run() chạy target trong thread hiện tại, không tạo thread mới.'),
                   ('time.sleep(1)', 3, 'Ngủ không phải chờ: không biết worker đã xong chưa.')]),
        flow=['Thread(target=download, args=(url, sizes)) → mô tả việc, chưa chạy',
              'worker.start() → download chạy trong thread mới',
              'worker.join() → main chờ worker đó xong',
              'return sizes → đọc kết quả sau khi join hết'],
        transfer='Đổi danh sách trang (có trang không tồn tại, có list rỗng); kiểm số thread bằng số url và kết quả '
                 'chỉ đọc sau join.',
        counter=dict(q='download_all(["a.html", "b.html", "a.html"]) tạo mấy Thread?', options=['3', '2', '1'],
                     correct='3'),
        practice='Mỗi url một Thread MỚI (target=download, args=(url, sizes)); vòng thứ nhất start hết, vòng thứ hai '
                 'join hết, rồi mới return sizes.',
        steps=['Tạo dict sizes và list threads rỗng.',
               'Mỗi url: threading.Thread(target=download, args=(url, sizes)) rồi append vào threads.',
               'Vòng thứ nhất start từng worker; vòng thứ hai join từng worker; cuối cùng return sizes.'],
        partial=r'''    for url in urls:
        worker = threading.Thread(target=download, args=(url, sizes))
        threads.append(worker)
    ...''',
        io=[('["home.html", "news.html"]', '{"home.html": 11, "news.html": 13} — hai thread'),
            ('["home.html", "missing.html"]', '{"home.html": 11, "missing.html": 0}'),
            ('[]', '{} — không tạo thread nào')],
        contracts=[dict(sig='download_all(urls)', does='Tải nhiều trang, mỗi trang một thread.',
                        takes='urls: list tên trang (có thể rỗng, có thể trùng)', gives='dict {url: số ký tự}',
                        effect='Tạo len(urls) Thread, start hết rồi join hết; không in.',
                        call='download_all(["home.html", "news.html"]) → {"home.html": 11, "news.html": 13}')],
        starter=T02_STARTER,
        solution=T02_SOLUTION,
        tests=[
            T('Hai trang → đúng kích thước', 'download_all(["home.html", "news.html"])',
              {'home.html': 11, 'news.html': 13}),
            T('Trang rỗng và trang không có → 0', 'download_all(["empty.html", "missing.html"])',
              {'empty.html': 0, 'missing.html': 0}),
            T('Mỗi url một Thread (kể cả url trùng)',
              '_studio.call(download_all, ["home.html", "news.html", "home.html"]).thread_count', 3),
            T('target là hàm download, không gọi sẵn',
              '(lambda r: (r.targets_callable, [t.target_name for t in r.threads]))'
              '(_studio.call(download_all, ["home.html", "news.html"]))', (True, ['download', 'download'])),
            T('Start hết rồi mới join', '_studio.call(download_all, ["home.html", "news.html"]).starts_before_joins',
              True),
            T('Join đủ mọi worker', '_studio.call(download_all, ["home.html", "news.html", "empty.html"]).all_joined',
              True),
            T('urls rỗng → {} và không tạo thread',
              '(lambda r: (r.value, r.thread_count))(_studio.call(download_all, []))', ({}, 0)),
            T('Dữ liệu khác (PAGES khác)', run(vars={'PAGES': {'x.html': 'abc', 'y.html': 'hello'}},
                                               entry='download_all(["x.html", "y.html", "z.html"])') + '.value',
              {'x.html': 3, 'y.html': 5, 'z.html': 0}),
        ],
        bad=[('gọi sẵn target', T02_SOLUTION.replace('threading.Thread(target=download, args=(url, sizes))',
                                                     'threading.Thread(target=download(url, sizes))')),
             ('run() thay vì start()', T02_SOLUTION.replace('        worker.start()\n', '        worker.run()\n')),
             ('start và join trong cùng một vòng', T02_SAME_LOOP)],
    ),

    # ------------------------------------------------------------------ T03
    dict(
        code='T03', title='Subclass Thread', minutes=30,
        goal='Tạo worker có trạng thái riêng bằng class con của threading.Thread.',
        prereq='T02', env=THREAD_ENV,
        theory=[
            dict(h='Định nghĩa: hai cách tạo thread',
                 body='Cách OOP: định nghĩa class con của threading.Thread và override run() — run() chính là việc sẽ '
                      'chạy trong thread. Cách Thread(target=hàm) tương đương; chọn subclass khi worker cần mang '
                      'dữ liệu và kết quả riêng.'),
            dict(h='Ví dụ: worker có tham số riêng',
                 body='class BackgroundThread(threading.Thread): __init__(self, sleepTime) gọi khởi tạo lớp cha rồi lưu '
                      'self.__sleepTime; run() ngủ đúng chừng ấy giây rồi in. Nơi gọi viết BackgroundThread(10), rồi '
                      '.start(), rồi .join().',
                 bullets=['threading.Thread.__init__(self) và super().__init__() là cùng một việc',
                          'Bỏ lời gọi đó thì start() hỏng: trạng thái nội bộ của Thread chưa được dựng']),
            dict(h='Dùng ở đâu',
                 bullets=['Worker có cấu hình riêng: đường dẫn file, phần dữ liệu được chia, bộ đếm',
                          'Cần lấy kết quả: run() ghi vào self.<thuộc tính>, nơi gọi đọc SAU join()',
                          'Thread không trả giá trị — không chỗ nào nhận được return của run()']),
            dict(h='Đọc sơ đồ', figure='T03-subclass-thread',
                 body='Bên trái là class: __init__ gọi super().__init__() rồi gán self.<thuộc tính>, run() đọc chúng '
                      'và ghi kết quả vào self. Mũi tên giữa hình là chỗ dễ nhầm: nơi gọi bấm start(), nhưng chạy '
                      'trong thread con lại là run().'),
        ],
        figure=dict(name='T03-subclass-thread',
                    caption='Subclass Thread: __init__ nhận dữ liệu, run() là việc của thread',
                    alt='Class con của Thread với __init__ gọi super().__init__() và run() ghi kết quả vào self; '
                        'start() ở thread cha kích hoạt run() chạy trong thread con'),
        slides='SL 97-102',
        brief='Viết class SumWorker(threading.Thread): __init__(self, numbers) gọi super().__init__() TRƯỚC, rồi lưu '
              'self.numbers (list) và self.total = None; override run(self) để gán self.total = sum(self.numbers). '
              'Viết parallel_sum(chunks): mỗi khối một SumWorker, start hết, join hết, trả tổng các total. Không có '
              'khối nào → 0.',
        example='parallel_sum([[1, 2, 3], [10, 20]]) → 36 (hai worker: 6 và 30). SumWorker([1, 2]).total trước khi '
                'chạy → None.',
        demo=r'''import threading

class Greeter(threading.Thread):
    def __init__(self, who):
        super().__init__()
        self.who = who
        self.message = None

    def run(self):
        self.message = "Hello " + self.who

worker = Greeter("Mai")
print(worker.message)
worker.start()
worker.join()
print(worker.message)
''',
        explain=[
            'Cách thứ hai để tạo thread: viết class con của threading.Thread và override run() — run() là "việc của '
            'thread". Vẫn gọi start() để chạy: start() tạo thread mới rồi tự gọi run() trong thread đó.',
            '__init__ của class con nhận tham số riêng (who, numbers) nhưng phải gọi super().__init__() trước khi '
            'dùng thread: phần khởi tạo của Thread tạo ra trạng thái mà start()/join() cần. Quên → start() báo lỗi '
            '(máy thật: RuntimeError: thread.__init__() not called; Studio mô phỏng báo AttributeError về '
            'thuộc tính started — cùng một nguyên nhân).',
            'Trạng thái của worker nằm trong self: run() ghi kết quả vào self.message / self.total, nơi gọi đọc nó '
            'SAU join(). Trước khi chạy, ví dụ in None.',
            '__init__ chạy ở thread TẠO object (thường là main thread); chỉ run() mới chạy trong thread mới. Việc '
            'nặng đặt trong __init__ là làm ở main thread.',
            'Không bắt buộc dùng cách này: target=hàm đủ cho việc đơn giản. Subclass hợp khi worker mang dữ liệu và '
            'kết quả của riêng nó.',
        ],
        predict=dict(q='class W(threading.Thread) override run(). Chạy w = W(); w.start(); w.join() — run() chạy mấy '
                       'lần, ở thread nào?', options=[
            ('Một lần, trong thread mới do start() tạo', 'start() gọi run() trong thread con.', True),
            ('Không lần nào — phải tự gọi w.run()', 'Gọi run() trực tiếp thì chạy ở thread hiện tại.', False),
            ('Hai lần: ở start và ở join', 'join chỉ chờ, không chạy lại gì.', False),
        ]),
        myth=('"Override start() cho tiện, vì start mới là thứ chạy thread"',
              'start() là của Thread: nó dựng thread mới rồi gọi run(). Override start() thì không còn thread nào được '
              'tạo, và join() sau đó báo RuntimeError: cannot join thread before it is started. Việc của worker đặt '
              'trong run(); nơi dùng gọi start().'),
        mcq=[
            dict(q='Method nào được override, method nào được gọi để khởi chạy?', options=[
                ('Override run(); gọi start()', 'start() tạo thread rồi gọi run() bên trong nó.', True),
                ('Override start(); gọi run()', 'Như vậy không có thread mới nào.', False),
                ('Override __init__; gọi join()', 'join chỉ chờ thread đã start.', False),
            ]),
            dict(q='class W(Thread) có __init__ riêng nhưng quên super().__init__(). Gọi W(...).start() thì…', options=[
                ('RuntimeError: thread.__init__() not called',
                 'Phần khởi tạo của Thread chưa chạy (Studio mô phỏng báo AttributeError … started — cùng nguyên nhân).',
                 True),
                ('Chạy bình thường', 'Thread kiểm tra và từ chối start.', False),
                ('run() chạy ở main thread', 'Không chạy gì cả — start() báo lỗi trước.', False),
            ]),
            dict(q='Đọc w.total ngay sau w.start(), chưa join, thì…', options=[
                ('Có thể vẫn là None — worker chưa chắc đã chạy xong', 'Đọc kết quả sau join().', True),
                ('Luôn đã có kết quả', 'start() không chờ worker.', False),
                ('Lỗi AttributeError', 'total đã gán None trong __init__.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao total khởi tạo None trong __init__ và chỉ được tính trong run()?',
            sample='__init__ chạy ở thread tạo object (main thread), còn run() chạy trong thread mới sau start(). Tính '
                   'tổng trong __init__ là làm việc ở main thread, worker không còn gì để làm. Để None tới khi run() '
                   'xong giúp phân biệt "chưa chạy" với "tổng bằng 0"; nơi gọi đọc total sau join. Trường hợp đặc '
                   'biệt: khối rỗng → total = 0, không phải None.'),
        scaffold=dict(
            intro='Lắp lớp cha, lời gọi khởi tạo của Thread, tên method được override và lệnh khởi chạy.',
            template=r'''import threading


class SumWorker({{slot1}}):
    def __init__(self, numbers):
        {{slot2}}
        self.numbers = list(numbers)
        self.total = None

    def {{slot3}}(self):
        self.total = sum(self.numbers)


def parallel_sum(chunks):
    workers = [SumWorker(chunk) for chunk in chunks]
    for worker in workers:
        {{slot4}}
    for worker in workers:
        worker.join()
    return sum(worker.total for worker in workers)
''',
            slots=['threading.Thread', 'super().__init__()', 'run', 'worker.start()'],
            traps=[('threading.Thread()', 1, 'Kế thừa CLASS Thread, không phải một object Thread.'),
                   ('self.total = sum(self.numbers)', 2, 'Tính ở __init__ = làm việc ở main thread; lại thiếu '
                                                         'super().__init__().'),
                   ('start', 3, 'Override start thì không còn thread nào được tạo.'),
                   ('worker.run()', 4, 'Chạy run() ngay trong main thread.')]),
        flow=['SumWorker([1, 2]) → __init__: lưu numbers, total = None',
              'worker.start() → Thread gọi run() trong thread mới',
              'run() → self.total = 3',
              'worker.join() → đọc total an toàn'],
        transfer='Thử khối rỗng, nhiều khối, và đọc total trước khi start để thấy None.',
        counter=dict(q='parallel_sum([[2, 3], [], [5]]) trả về?', options=['10', '5', 'None'], correct='10'),
        practice='Kế thừa threading.Thread, gọi super().__init__() đầu tiên, lưu trạng thái vào self; việc tính đặt '
                 'trong run(). parallel_sum tạo worker, start hết, join hết rồi cộng total.',
        steps=['class SumWorker(threading.Thread); __init__ gọi super().__init__() rồi gán self.numbers, self.total = None.',
               'def run(self): self.total = sum(self.numbers).',
               'parallel_sum: một SumWorker cho mỗi khối; start hết; join hết; trả sum các worker.total.'],
        partial=r'''class SumWorker(threading.Thread):
    def __init__(self, numbers):
        super().__init__()
        ...''',
        io=[('parallel_sum([[1, 2, 3], [10, 20]])', '36'), ('SumWorker([1, 2]).total trước start', 'None'),
            ('parallel_sum([])', '0 — không tạo worker')],
        contracts=[K_SUMWORKER, K_PARALLEL_SUM],
        starter=T03_STARTER,
        solution=T03_SOLUTION,
        tests=[
            T('SumWorker là một Thread', 'isinstance(SumWorker([1]), __import__("threading").Thread)', True),
            T('Chưa start → total là None', 'SumWorker([1, 2]).total', None),
            T('start + join → total đúng', '(lambda w: (w.start(), w.join(), w.total)[2])(SumWorker([4, 5, 6]))', 15),
            T('parallel_sum ba khối', 'parallel_sum([[1, 2], [3], [4, 5, 6]])', 21),
            T('Mỗi khối một worker, start hết rồi join hết',
              '(lambda r: (r.thread_count, r.starts_before_joins, r.all_joined))'
              '(_studio.call(parallel_sum, [[1], [2], [3]]))', (3, True, True)),
            T('Khối rỗng góp 0; nhận cả range/tuple', 'parallel_sum([[], range(5), (1, 1)])', 12),
            T('Không có khối → 0, không tạo worker',
              '(lambda r: (r.value, r.thread_count))(_studio.call(parallel_sum, []))', (0, 0)),
        ],
        bad=[('override start() thay vì run()', T03_SOLUTION.replace('    def run(self):', '    def start(self):')),
             ('quên super().__init__()', T03_SOLUTION.replace('        super().__init__()\n', '')),
             ('tính tổng ngay trong __init__', T03_SOLUTION.replace('        self.total = None',
                                                                    '        self.total = sum(self.numbers)')),
             ('gọi run() thay vì start()', T03_SOLUTION.replace('        worker.start()', '        worker.run()'))],
    ),

    # ------------------------------------------------------------------ T04
    dict(
        code='T04', title='GIL, CPU-bound và I/O-bound', minutes=30,
        goal='Ước lượng thời gian theo loại workload và chọn chạy tuần tự, bằng thread hay bằng process.',
        prereq='T03', env=GIL_ENV,
        theory=[
            dict(h='Định nghĩa: GIL',
                 body='GIL (Global Interpreter Lock) là một mutex bên trong CPython: tại một thời điểm chỉ MỘT thread '
                      'được chạy bytecode Python. Đây là chi tiết của bản CPython, không phải quy định của ngôn ngữ.',
                 bullets=['Thắt cổ chai với code Python tính toán thuần (CPU-bound)',
                          'Không thành vấn đề với chương trình chờ I/O',
                          'Không thành vấn đề với phần gọi xuống thư viện native, ví dụ NumPy']),
            dict(h='Vì sao có GIL, bỏ đi thì mất gì',
                 body='GIL không phải lỗi mà là một đánh đổi có chủ ý. Nó cũng KHÔNG thay Lock: trạng thái của ứng '
                      'dụng vẫn phải tự bảo vệ (T05).',
                 bullets=['Có: reference counting và garbage collector cần được bảo vệ',
                          'Có: một mutex trên interpreter thay cho mutex trên từng object',
                          'Bỏ: single-thread chậm đi, nguy cơ deadlock, kém tương thích extension cũ']),
            dict(h='Dùng ở đâu',
                 bullets=['Chờ mạng, đĩa, cơ sở dữ liệu, sleep → thread là đúng chỗ',
                          'Tính Python thuần mà muốn nhiều lõi → process: mỗi process một GIL',
                          'Đo bằng time.perf_counter() trước khi chọn, đừng đoán theo số thread']),
            dict(h='Đọc sơ đồ', figure='T04-gil',
                 body='Một lõi: các lát T1, T2, T3… nối nhau trên một hàng — concurrency là LUÂN PHIÊN, không phải '
                      'cùng lúc. GIL ép phần tính toán về dáng đó dù máy bao nhiêu lõi; ô nhạt là lúc thread chờ '
                      'I/O, nhả GIL cho thread khác lấp vào.'),
        ],
        figure=dict(name='T04-gil',
                    caption='Một GIL, nhiều thread: CPU thì luân phiên, I/O thì chồng lên nhau',
                    alt='Dải thời gian một lõi với các lát thread nối nhau, so với nhiều lõi chạy song song; phần chờ '
                        'I/O được tô nhạt để chỉ lúc thread nhả GIL cho thread khác chạy'),
        slides='SL 85-94',
        brief='Mỗi task là (kind, seconds): "cpu" = tính Python thuần, "io" = chờ (mạng, đĩa). Viết wall_time(tasks, '
              'strategy) theo mô hình lý tưởng (mỗi task một worker, đủ lõi, bỏ qua chi phí tạo): "serial" = cộng mọi '
              'task; "thread" (CPython có GIL) = max(tổng giây CPU, task I/O dài nhất); "process" = task dài nhất; '
              'strategy khác → ValueError; không có task → 0. Viết best_strategy(tasks): cách có wall_time nhỏ nhất, '
              'bằng nhau thì chọn cách đứng trước trong serial → thread → process (rẻ hơn).',
        example='[("io", 2), ("io", 3), ("cpu", 4)]: serial 9, thread max(4, 3) = 4, process 4 → best_strategy = '
                '"thread".',
        demo=r'''tasks = [("io", 2), ("io", 3), ("cpu", 4)]
cpu_total = sum(s for kind, s in tasks if kind == "cpu")
io_longest = max(s for kind, s in tasks if kind == "io")
serial = sum(s for kind, s in tasks)
threads = max(cpu_total, io_longest)
processes = max(s for kind, s in tasks)
print("serial:", serial, "| thread:", threads, "| process:", processes)
''',
        explain=[
            'CPython có GIL (Global Interpreter Lock): tại một thời điểm chỉ MỘT thread được chạy bytecode Python. '
            'GIL giúp interpreter quản lý bộ nhớ an toàn (reference counting, garbage collector).',
            'CPU-bound = thời gian đi vào tính toán. Nhiều thread tính Python thuần phải thay nhau giữ GIL nên phần '
            'CPU CỘNG DỒN: 2 + 3 giây vẫn ≈ 5 giây — thêm thread không nhanh hơn.',
            'I/O-bound = thời gian đi vào chờ (mạng, đĩa, sleep). Thread đang chờ I/O nhả GIL, nên các lần chờ CHỒNG '
            'LÊN NHAU và chồng lên cả lúc thread khác tính: thread = max(tổng CPU, lần chờ dài nhất).',
            'Mỗi process có interpreter và GIL riêng nên phần CPU chạy song song được trên nhiều lõi — đổi lại tốn chi '
            'phí tạo process và chép dữ liệu. Vì vậy khi bằng thời gian, chọn cách rẻ hơn.',
            'Ngoại lệ cần nhớ: một số thư viện native (vd. phần lõi của NumPy) nhả GIL khi tính, nhưng không thể suy '
            'ra mọi code dùng NumPy đều song song; bản CPython free-threaded (3.13+) có thể tắt GIL. Và GIL KHÔNG thay '
            'Lock: race condition của ứng dụng vẫn còn (T05).',
        ],
        predict=dict(q='Hai task tính Python thuần, mỗi task 3 giây, chạy bằng 2 thread trên máy 4 lõi (CPython có '
                       'GIL). Tổng thời gian khoảng bao nhiêu?', options=[
            ('≈ 6 giây — hai thread thay nhau giữ GIL', 'Phần CPU cộng dồn; muốn ≈ 3 giây phải dùng 2 process.', True),
            ('≈ 3 giây — mỗi thread một lõi', 'Đúng với 2 process, không đúng với thread khi có GIL.', False),
            ('≈ 1.5 giây', 'Không có cơ chế nào chia đôi một task.', False),
        ]),
        myth=('"Thêm thread thì chương trình Python nào cũng nhanh hơn"',
              'Chỉ đúng khi thời gian chủ yếu là CHỜ (I/O). Với tính toán Python thuần, GIL cho mỗi lúc một thread chạy '
              'bytecode nên thêm thread không giảm thời gian, có khi còn chậm hơn vì chuyển ngữ cảnh. Chọn theo loại '
              'workload, không theo số thread.'),
        mcq=[
            dict(q='Có GIL thì race condition của ứng dụng có tự biến mất không?', options=[
                ('Không — GIL bảo vệ interpreter, không bảo vệ các bước đọc-sửa-ghi của bạn',
                 'counter += 1 vẫn có thể bị xen giữa; cần Lock (T05).', True),
                ('Có — mỗi lúc chỉ một thread chạy', 'Thread có thể bị đổi giữa hai bytecode của cùng một câu lệnh.', False),
                ('Chỉ biến mất khi dùng list', 'List không có cơ chế khoá nào cho bạn.', False),
            ]),
            dict(q='Tải 50 trang web, mỗi trang chủ yếu chờ mạng. Lựa chọn hợp lý?', options=[
                ('Thread — các lần chờ mạng chồng lên nhau', 'Thread đang chờ I/O nhả GIL.', True),
                ('Process — vì thread bị GIL', 'GIL được nhả trong lúc chờ I/O; process tốn hơn mà không nhanh hơn.', False),
                ('Không nên song song', 'Chờ tuần tự 50 trang là lãng phí.', False),
            ]),
            dict(q='Phát biểu nào về NumPy đúng?', options=[
                ('Một số phép tính native nhả GIL, nhưng không suy ra được mọi code dùng NumPy đều chạy song song',
                 'Phải xét từng thao tác, đo thật trên máy.', True),
                ('NumPy luôn bỏ qua GIL', 'Code Python bao quanh lời gọi NumPy vẫn cần GIL.', False),
                ('NumPy không dùng được trong thread', 'Dùng được bình thường.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao wall_time(..., "thread") cộng phần CPU nhưng lấy max phần I/O?',
            sample='Với GIL, mỗi lúc chỉ một thread chạy bytecode nên các task CPU phải thay nhau: thời gian cộng dồn. '
                   'Thread đang chờ I/O nhả GIL nên các lần chờ diễn ra cùng lúc và chồng lên cả lúc thread khác tính; '
                   'vì vậy thời gian là max(tổng CPU, lần chờ dài nhất). Trường hợp đặc biệt: không có task nào → 0.'),
        scaffold=dict(
            intro='Lắp công thức của ba cách chạy theo mô hình GIL.',
            template=r'''def wall_time(tasks, strategy):
    cpu = [seconds for kind, seconds in tasks if kind == "cpu"]
    io = [seconds for kind, seconds in tasks if kind == "io"]
    if strategy == "serial":
        return {{slot1}}
    if strategy == "thread":
        return {{slot2}}
    if strategy == "process":
        return {{slot3}}
    raise ValueError("unknown strategy: " + str(strategy))
''',
            slots=['sum(cpu) + sum(io)', 'max(sum(cpu), max(io, default=0))', 'max(cpu + io, default=0)'],
            traps=[('max(sum(cpu), sum(io))', 2, 'Các lần chờ I/O chồng lên nhau: lấy lần dài nhất, không cộng.'),
                   ('sum(cpu) + max(io, default=0)', 2,
                    'Lúc thread này chờ I/O, thread khác vẫn tính được — không nối tiếp.'),
                   ('sum(cpu + io) / len(tasks)', 3, 'Không có phép chia đều: mỗi task chạy trọn thời gian của nó.')]),
        flow=['serial → cộng mọi task: 2 + 3 + 4 = 9',
              'thread → max(tổng CPU, I/O dài nhất) = max(4, 3) = 4',
              'process → task dài nhất = 4',
              'best_strategy → nhanh nhất; bằng nhau chọn cách rẻ hơn'],
        transfer='Thử workload toàn CPU, toàn I/O và trộn; xem khi nào thread thắng, khi nào cần process.',
        counter=dict(q='best_strategy([("cpu", 2), ("cpu", 2), ("io", 1)]) trả về?',
                     options=['process', 'thread', 'serial'], correct='process'),
        practice='Tách giây CPU và giây I/O; serial cộng hết, thread lấy max(tổng CPU, I/O dài nhất), process lấy task '
                 'dài nhất. best_strategy so lần lượt serial → thread → process, chỉ đổi khi NHANH HƠN hẳn.',
        steps=['cpu = các seconds có kind "cpu"; io = các seconds có kind "io".',
               'serial: sum(cpu) + sum(io); thread: max(sum(cpu), max(io, default=0)); process: max(cpu + io, default=0).',
               'strategy lạ → raise ValueError.',
               'best_strategy: best = "serial"; với "thread" rồi "process", nếu wall_time nhỏ hơn hẳn thì đổi best.'],
        partial=r'''    if strategy == "thread":
        return max(sum(cpu), max(io, default=0))
    ...''',
        io=[('wall_time([("io", 2), ("io", 3), ("io", 1)], "thread")', '3'),
            ('wall_time([("cpu", 2), ("cpu", 3)], "thread")', '5 — GIL, không nhanh hơn tuần tự'),
            ('wall_time([("cpu", 2), ("cpu", 3)], "process")', '3'),
            ('best_strategy([("cpu", 1)])', '"serial" — bằng nhau thì chọn cách đơn giản')],
        contracts=[K_WALL, K_BEST],
        starter=T04_STARTER,
        solution=T04_SOLUTION,
        tests=[
            T('Toàn I/O, thread → lần chờ dài nhất', 'wall_time([("io", 2), ("io", 3), ("io", 1)], "thread")', 3),
            T('Toàn CPU, thread → cộng dồn (GIL)', 'wall_time([("cpu", 2), ("cpu", 3)], "thread")', 5),
            T('Toàn CPU, process → task dài nhất', 'wall_time([("cpu", 2), ("cpu", 3)], "process")', 3),
            T('Trộn: serial và thread', '[wall_time([("cpu", 4), ("io", 3), ("io", 5)], s) for s in ("serial", "thread")]',
              [12, 5]),
            TX('Số thực: CPU 0.1 + 0.2 với I/O 0.25',
               '[round(wall_time([("cpu", 0.1), ("cpu", 0.2), ("io", 0.25)], s), 6) for s in ("serial", "thread", "process")]',
               '[0.55, 0.3, 0.25]'),
            T('Không có task → 0', '[wall_time([], s) for s in ("serial", "thread", "process")]', [0, 0, 0]),
            T('strategy lạ → ValueError', '_studio.call(wall_time, [("io", 1)], "gpu").error', 'ValueError'),
            T('best_strategy theo workload',
              '[best_strategy(t) for t in ([("io", 2), ("io", 2)], [("cpu", 2), ("cpu", 2)], '
              '[("cpu", 3), ("io", 2), ("io", 2)], [("cpu", 2), ("cpu", 2), ("io", 1)])]',
              ['thread', 'process', 'thread', 'process']),
            T('Bằng nhau → chọn cách đơn giản hơn', '[best_strategy([("cpu", 1)]), best_strategy([])]',
              ['serial', 'serial']),
        ],
        bad=[('quên GIL: coi thread chạy song song cả phần CPU',
              T04_SOLUTION.replace('return max(sum(cpu), max(io, default=0))', 'return max(cpu + io, default=0)')),
             ('tưởng GIL chặn cả lúc chờ I/O',
              T04_SOLUTION.replace('return max(sum(cpu), max(io, default=0))', 'return sum(cpu) + sum(io)')),
             ('bằng nhau vẫn đổi sang cách tốn hơn',
              T04_SOLUTION.replace('if wall_time(tasks, strategy) < wall_time(tasks, best):',
                                   'if wall_time(tasks, strategy) <= wall_time(tasks, best):'))],
    ),

    # ------------------------------------------------------------------ T05
    dict(
        code='T05', title='Lock, race condition và deadlock', minutes=40,
        goal='Bảo vệ dữ liệu dùng chung bằng Lock và tránh deadlock bằng thứ tự khoá thống nhất.',
        prereq='T04', env=LOCK_ENV, support=['race_demo.py'],
        theory=[
            dict(h='Định nghĩa: race condition',
                 body='Race condition là khi kết quả phụ thuộc THỨ TỰ các thread chạm vào dữ liệu chung: lần này ra '
                      'đúng, lần sau ra sai, và không lần nào báo lỗi. Đoạn code chạm dữ liệu chung và phải chạy trọn '
                      'vẹn gọi là critical section.'),
            dict(h='Lock: một thread một lúc',
                 bullets=['threading.Lock(), còn gọi là mutex: mỗi lúc chỉ một thread giữ được',
                          'with lock: acquire/release tự động, kể cả khi khối ném exception',
                          'Có Lock vẫn race nếu đặt sai chỗ — khoá phải trùm cả đoạn đọc-sửa-ghi']),
            dict(h='Dùng ở đâu',
                 bullets=['Số dư, bộ đếm, tồn kho: mọi lần đọc-sửa-ghi một giá trị dùng chung',
                          'Kiểm tra rồi hành động (đủ tiền thì trừ) phải nằm TRỌN trong một lần giữ khoá',
                          'Không cần Lock khi đã dùng queue.Queue (T06) — bên trong đã khoá sẵn']),
            dict(h='Deadlock: vì sao và tránh thế nào',
                 body='Deadlock là khi các bên chờ nhau mãi, không ai tiến được: thread 1 giữ A chờ B, thread 2 giữ B '
                      'chờ A.',
                 bullets=['Thống nhất một thứ tự khoá chung, mọi thread khoá theo đúng thứ tự đó',
                          'Giữ khoá càng ngắn càng tốt; đừng ghi file hay in trong critical section',
                          'Đừng join một worker trong lúc đang giữ lock mà worker đó cần']),
            dict(h='Đọc sơ đồ', figure='T05-race-lock',
                 body='Nửa trên KHÔNG khoá: hai mũi tên đọc cùng ô balance = 100, hai mũi tên ghi cùng đặt 101 — mất '
                      'một lần cộng. Nửa dưới có Lock nên thread sau đọc 101, ghi 102; trong Studio nửa trên không '
                      'xảy ra vì thread chạy lần lượt.'),
        ],
        figure=dict(name='T05-race-lock',
                    caption='Mất cập nhật khi không khoá, và hàng rào Lock sửa nó thế nào',
                    alt='Hai thread cùng đọc balance 100 rồi cùng ghi 101 nên mất một lần cộng; bên dưới, with lock '
                        'buộc thread thứ hai chờ nên kết quả là 102'),
        slides='SL 103-105',
        brief='Account có self.balance và self.lock = threading.Lock(); run_deposits (cấp sẵn) cho mỗi khoản nạp một '
              'thread. Viết deposit(amount): đọc-cộng-ghi balance trong with self.lock. Viết withdraw(amount): trong '
              'CÙNG một with self.lock, nếu amount > balance thì raise ValueError("insufficient funds"), ngược lại trừ. '
              'Viết safe_plan(plan, order): True nếu plan (các lock một thread khoá lồng nhau, theo thứ tự) đi đúng '
              'thứ tự chung order — tăng dần, không khoá lại lock đang giữ; tên không có trong order → ValueError.',
        example='run_deposits(Account(0), [10, 20, 30]) → 60. Account(5).withdraw(9) → ValueError, balance vẫn 5. '
                'safe_plan(["log", "db"], ["db", "cache", "log"]) → False.',
        demo=r'''balance = 100
read_a = balance
read_b = balance
balance = read_a + 50
balance = read_b + 50
print("Mong đợi 200, thực tế", balance)
''',
        explain=[
            'balance += amount không phải một bước: đọc balance → cộng → ghi lại. Ví dụ minh hoạ xen kẽ bằng tay hai '
            'thread A, B cùng nạp 50: cả hai đọc 100 trước khi ai kịp ghi, nên một lần nạp bị mất. Kết quả phụ thuộc '
            'thứ tự truy cập = race condition.',
            'Lock (mutex) chỉ cho MỘT thread giữ tại một thời điểm. Đoạn đọc-sửa-ghi đặt trong with self.lock: là '
            'critical section — thread khác tới đó phải chờ khối kết thúc. Lock phải DÙNG CHUNG (self.lock), tạo Lock '
            'mới mỗi lần gọi thì không ai phải chờ ai.',
            'with lock tự release khi rời khối, kể cả khi có exception. acquire()/release() viết rời nhau thì một '
            'lỗi ở giữa làm lock kẹt mãi — mọi thread sau chờ vô hạn.',
            'Kiểm tra rồi hành động (if amount > balance … balance -= amount) phải nằm TRỌN trong cùng một lần giữ '
            'khoá. Giữ khoá càng ngắn càng tốt: đừng đặt việc chậm (in, ghi file) vào trong.',
            'Deadlock: các bên chờ nhau mãi. Thread 1 giữ A chờ B, thread 2 giữ B chờ A. Cách phòng: mọi thread khoá '
            'theo CÙNG một thứ tự đã thống nhất; Lock thường không khoá lại được khi chính mình đang giữ; đừng join một '
            'worker khi đang giữ lock mà worker đó cần.',
        ],
        predict=dict(q='Hai thread cùng chạy deposit(50) trên balance = 100, KHÔNG có lock. Kết quả có thể là?', options=[
            ('150 hoặc 200 — tuỳ hai thread xen nhau thế nào', 'Đọc-sửa-ghi bị xen giữa thì mất một lần nạp.', True),
            ('Luôn 200', 'Không có gì bảo đảm hai lần đọc-sửa-ghi không xen nhau.', False),
            ('Luôn 150', 'Có lúc mỗi thread chạy trọn phần của mình thì ra 200.', False),
        ]),
        myth=('"Có GIL rồi nên balance += amount đã an toàn"',
              'GIL chỉ bảo đảm mỗi lúc một thread chạy bytecode; += gồm nhiều bytecode (đọc, cộng, ghi) và thread có '
              'thể bị đổi giữa chúng. Trạng thái của ứng dụng phải tự bảo vệ bằng Lock. Lưu ý: Studio chạy thread lần '
              'lượt nên không tái hiện được race — bộ chấm kiểm cấu trúc: mọi lần đọc/ghi balance phải nằm trong lúc '
              'giữ self.lock.'),
        mcq=[
            dict(q='Vì sao with lock dễ quản lý hơn acquire/release rời nhau?', options=[
                ('Tự release khi rời khối, kể cả khi có exception', 'Không bao giờ để lock kẹt vì quên release.', True),
                ('Chạy nhanh hơn', 'Tốc độ như nhau; khác ở chỗ an toàn khi có lỗi.', False),
                ('Cho nhiều thread cùng giữ khoá', 'Lock luôn chỉ cho một thread giữ.', False),
            ]),
            # Tên lock là lock_a/lock_b chứ không phải "A"/"B": màn trắc nghiệm gắn nhãn A/B/C
            # cho các lựa chọn, nên "khoá A rồi B" đọc nhầm thành lựa chọn A, B.
            dict(q='Thread 1 khoá lock_a rồi lock_b; thread 2 khoá lock_b rồi lock_a. Rủi ro gì?', options=[
                ('Deadlock — mỗi bên giữ một lock và chờ lock kia',
                 'Sửa: cả hai khoá theo cùng thứ tự lock_a rồi lock_b.', True),
                ('Không sao vì cuối cùng đều release', 'Có thể không bên nào tới được lệnh release.', False),
                ('Chỉ chậm hơn một chút', 'Hai bên chờ nhau mãi, không tiến triển.', False),
            ]),
            dict(q='Nên đặt gì vào critical section?', options=[
                ('Chỉ các bước đọc-sửa-ghi dữ liệu dùng chung — giữ khoá ngắn nhất có thể',
                 'Thread khác phải chờ suốt lúc bạn giữ khoá.', True),
                ('Cả hàm, kể cả in và ghi file, cho chắc', 'Giữ lâu làm các thread khác chờ vô ích.', False),
                ('Không cần, vì GIL đã khoá', 'GIL không bảo vệ trạng thái của ứng dụng.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao withdraw phải đặt cả phép kiểm tra lẫn phép trừ trong cùng một with self.lock?',
            sample='Nếu kiểm tra ngoài khoá, hai thread có thể cùng thấy đủ tiền rồi lần lượt trừ, số dư âm. Đặt kiểm '
                   'tra và trừ trong một lần giữ khoá thì thread kia chỉ kiểm tra sau khi lần trừ trước đã xong. with '
                   'còn tự nhả khoá khi raise ValueError. Trường hợp đặc biệt: rút đúng bằng số dư thì được, số dư về 0.'),
        scaffold=dict(
            intro='Lắp critical section của deposit, điều kiện của withdraw và phép so vị trí của safe_plan.',
            template=r'''class Account:
    def __init__(self, balance=0):
        self.balance = balance
        self.lock = threading.Lock()

    def deposit(self, amount):
        {{slot1}}
            self.balance += amount

    def withdraw(self, amount):
        with self.lock:
            if {{slot2}}:
                raise ValueError("insufficient funds")
            self.balance -= amount


def safe_plan(plan, order):
    positions = [order.index(name) for name in plan]
    for i in range(1, len(positions)):
        if {{slot3}}:
            return False
    return True
''',
            slots=['with self.lock:', 'amount > self.balance', 'positions[i] <= positions[i - 1]'],
            traps=[('with threading.Lock():', 1, 'Mỗi lần gọi một Lock MỚI — không thread nào phải chờ ai.'),
                   ('self.lock.acquire()', 1, 'Không có release đi kèm: khoá kẹt ngay sau lần gọi đầu.'),
                   ('amount >= self.balance', 2, 'Rút đúng bằng số dư là hợp lệ.'),
                   ('positions[i] < positions[i - 1]', 3,
                    'Cho qua ["db", "db"]: Lock thường không khoá lại được khi đang giữ.')]),
        flow=['deposit(5) → with self.lock: đọc, cộng, ghi balance',
              'withdraw(9) khi balance = 5 → ValueError, with nhả khoá',
              'run_deposits(Account(0), [10, 20, 30]) → 60',
              'safe_plan(["log", "db"], ["db", "cache", "log"]) → False'],
        transfer='Thử rút quá số dư, nạp dữ liệu sai kiểu, và một kế hoạch khoá ngược thứ tự; sau mỗi lỗi khoá phải '
                 'được nhả.',
        counter=dict(q='safe_plan(["cache", "log"], ["db", "cache", "log"]) trả về?',
                     options=['True', 'False', 'ValueError'], correct='True'),
        practice='Mọi lần đọc/ghi self.balance nằm trong with self.lock; withdraw kiểm tra và trừ trong CÙNG một khối. '
                 'safe_plan đổi tên lock thành vị trí trong order rồi kiểm dãy vị trí tăng hẳn.',
        steps=['deposit: with self.lock: self.balance += amount.',
               'withdraw: with self.lock: nếu amount > self.balance → raise ValueError("insufficient funds"); '
               'ngược lại self.balance -= amount.',
               'safe_plan: positions = [order.index(name) for name in plan]; có vị trí nào ≤ vị trí trước nó → False; '
               'còn lại True.'],
        partial=r'''    def deposit(self, amount):
        with self.lock:
            self.balance += amount
    ...''',
        io=[('run_deposits(Account(0), [10, 20, 30])', '60'),
            ('Account(5).withdraw(9)', 'ValueError; balance vẫn 5; khoá đã nhả'),
            ('safe_plan(["db", "log"], ["db", "cache", "log"])', 'True'),
            ('safe_plan(["log", "db"], ["db", "cache", "log"])', 'False — ngược thứ tự chung')],
        contracts=[K_DEPOSIT, K_WITHDRAW, K_SAFE],
        starter=T05_STARTER,
        solution=T05_SOLUTION,
        tests=[
            T('Ba thread nạp 10, 20, 30 → 60', 'run_deposits(Account(0), [10, 20, 30])', 60),
            T('Không có khoản nạp → giữ số dư đầu', 'run_deposits(Account(7), [])', 7),
            T('deposit đọc và ghi balance khi đang giữ self.lock', block(T05_SPY_DEPOSIT), True),
            T('withdraw: kiểm tra VÀ trừ cùng trong self.lock', block(T05_SPY_WITHDRAW), True),
            T('Rút quá số dư → ValueError, số dư không đổi',
              '(lambda a: (_studio.call(a.withdraw, 9).error, a.balance))(Account(5))', ('ValueError', 5)),
            T('Sau ValueError, khoá đã được nhả',
              '(lambda a: (_studio.call(a.withdraw, 9).error, a.lock.locked()))(Account(5))', ('ValueError', False)),
            T('Nạp sai kiểu → TypeError, khoá vẫn được nhả',
              '(lambda a: (_studio.call(a.deposit, "10").error, a.lock.locked()))(Account(0))', ('TypeError', False)),
            T('Rút đúng bằng số dư → 0', '(lambda a: (a.withdraw(5), a.balance)[1])(Account(5))', 0),
            T('safe_plan: đúng thứ tự (kể cả bỏ qua lock giữa, plan rỗng)',
              '[safe_plan(["db", "log"], ["db", "cache", "log"]), safe_plan(["cache"], ["db", "cache"]), '
              'safe_plan([], ["db"])]', [True, True, True]),
            T('safe_plan: ngược thứ tự → False',
              '[safe_plan(["log", "db"], ["db", "cache", "log"]), safe_plan(["db", "log", "cache"], ["db", "cache", "log"])]',
              [False, False]),
            T('safe_plan: khoá lại lock đang giữ → False', 'safe_plan(["db", "db"], ["db", "log"])', False),
            T('safe_plan theo order đã thống nhất, không theo bảng chữ cái',
              'safe_plan(["log", "cache"], ["log", "cache", "db"])', True),
            T('safe_plan: lock lạ → ValueError', '_studio.call(safe_plan, ["db", "x"], ["db", "log"]).error',
              'ValueError'),
        ],
        bad=[('tạo Lock mới mỗi lần gọi', T05_SOLUTION.replace(
                 '        with self.lock:\n            self.balance += amount',
                 '        with threading.Lock():\n            self.balance += amount')),
             ('acquire/release rời nhau: lỗi thì khoá kẹt', T05_SOLUTION.replace(WITHDRAW_WITH, r'''        self.lock.acquire()
        if amount > self.balance:
            raise ValueError("insufficient funds")
        self.balance -= amount
        self.lock.release()
''')),
             ('không khoá — tin GIL làm += an toàn', T05_SOLUTION.replace(
                 '        with self.lock:\n            self.balance += amount', '        self.balance += amount')),
             ('kiểm tra số dư ngoài khoá', T05_SOLUTION.replace(WITHDRAW_WITH, r'''        if amount > self.balance:
            raise ValueError("insufficient funds")
        with self.lock:
            self.balance -= amount
''')),
             ('cho khoá lại lock đang giữ', T05_SOLUTION.replace('if positions[i] <= positions[i - 1]:',
                                                                 'if positions[i] < positions[i - 1]:'))],
    ),

    # ------------------------------------------------------------------ T06
    dict(
        code='T06', title='Queue và tác vụ lưu nền', minutes=40,
        goal='Giao việc lưu cho một worker nền qua queue.Queue, không để nơi gọi phải chờ từng lần lưu.',
        prereq='T05', env=QUEUE_ENV,
        theory=[
            dict(h='Định nghĩa: queue.Queue',
                 body='queue.Queue là hàng đợi FIFO đã khoá sẵn bên trong, dựng riêng cho việc trao đổi giữa các '
                      'thread: put() bỏ việc vào cuối, get() lấy ở đầu. Nhờ khoá nằm sẵn mà hai bên không phải tự '
                      'dựng Lock như T05.',
                 bullets=['get() mặc định CHỜ khi rỗng; get_nowait() không chờ, rỗng thì raise queue.Empty',
                          'Mỗi get() thành công đi với đúng một task_done(); join() chờ mọi việc xong']),
            dict(h='Producer và consumer',
                 body='Producer tạo việc, put vào queue rồi đi tiếp ngay; consumer lấy việc ra và làm phần chậm. '
                      'Queue là ranh giới duy nhất giữa hai bên, nên thêm worker chỉ là chạy thêm một thread cùng đọc '
                      'một queue.'),
            dict(h='Dùng ở đâu',
                 bullets=['Giao diện: nút bấm chỉ submit, worker làm việc nặng, kết quả về qua queue khác (G06)',
                          'Máy chủ: một queue việc, vài worker cùng rút ra làm — thêm worker là tăng thông lượng',
                          'put BẢN SAO, đừng put chính object còn đang sửa — dữ liệu worker nhận phải ổn định']),
            dict(h='Đọc sơ đồ', figure='T06-queue-worker',
                 body='Giữa hình là queue, một hàng ô xếp theo thứ tự vào: producer put thêm vào cuối rồi quay về việc '
                      'của mình ngay, worker lấy ở đầu rồi task_done(). Hai mũi tên không bao giờ chạm nhau — hai bên '
                      'chỉ gặp nhau qua queue.'),
        ],
        figure=dict(name='T06-queue-worker',
                    caption='Producer đẩy việc vào queue, worker nền rút ra làm',
                    alt='Producer gọi put() thêm job vào cuối hàng đợi; worker thread gọi get() lấy ở đầu hàng, xử lý '
                        'rồi task_done(); hai bên chỉ gặp nhau qua queue'),
        slides='SL 106-107',
        brief='Hoàn thành class BackgroundSaver (self.jobs = queue.Queue(), self.lines = [] đã có). submit(record): '
              'put BẢN SAO record (dict(record)) vào self.jobs — chưa lưu gì. _work(): lấy từng job bằng '
              'self.jobs.get_nowait() tới khi gặp queue.Empty thì return; mỗi job thêm dòng "name,mark" vào '
              'self.lines rồi gọi self.jobs.task_done(). flush(): tạo Thread MỚI với target=self._work, start, join, '
              'trả len(self.lines).',
        example='submit({"name": "An", "mark": 8}), submit({"name": "Binh", "mark": 7}) → flush() trả 2, lines = '
                '["An,8", "Binh,7"] (đúng thứ tự FIFO).',
        demo=r'''import queue
import threading

jobs = queue.Queue()
for mark in [8, 6, 9]:
    jobs.put(mark)
jobs.put(None)

def consumer():
    while True:
        mark = jobs.get()
        if mark is None:
            jobs.task_done()
            break
        print("saved", mark)
        jobs.task_done()

worker = threading.Thread(target=consumer)
worker.start()
jobs.join()
worker.join()
print("queue rỗng:", jobs.empty())
''',
        explain=[
            'queue.Queue là hàng đợi an toàn cho nhiều thread: put() thêm vào cuối, get() lấy ở đầu (FIFO). Bên '
            'trong Queue đã có khoá nên producer và consumer không cần tự dùng Lock.',
            'get() mặc định CHỜ khi queue rỗng — không trả None. get_nowait() không chờ: rỗng thì raise queue.Empty. '
            'Chọn cách chờ theo tình huống: worker chạy suốt (ví dụ minh hoạ) dùng get() + một sentinel None để báo '
            'dừng; xả hết việc đã có sẵn (bài này) dùng get_nowait() tới queue.Empty.',
            'Mỗi get() thành công đi với đúng một task_done(); jobs.join() chờ tới khi mọi việc đã task_done. Quên '
            'task_done thì jobs.join() chờ mãi; gọi task_done nhiều hơn số việc → ValueError.',
            'Tác vụ lưu nền: nơi gọi chỉ submit rồi đi tiếp, worker làm việc chậm (ghi file, pickle, nén — như bài '
            'thực hành lưu nền). Dữ liệu giao cho worker phải ổn định: put BẢN SAO dict(record), để nơi gọi sửa '
            'record sau đó không làm sai thứ sẽ được lưu.',
            'Queue để trong self (self.jobs) để mọi method của object dùng chung. Mỗi lần flush tạo Thread MỚI — một '
            'Thread chỉ start được một lần.',
        ],
        predict=dict(q='Đoạn code sau in gì?', code=r'''import queue

q = queue.Queue()
q.put("a")
q.put("b")
print(q.get(), q.get())
''', options=[
            ('a b — vào trước ra trước (FIFO)', 'Queue lấy phần tử ở đầu hàng đợi.', True),
            ('b a', 'Đó là LifoQueue (ngăn xếp), không phải Queue.', False),
            ('a a', 'get() lấy phần tử RA khỏi queue.', False),
        ]),
        myth=('"q.get() khi queue rỗng sẽ trả None"',
              'get() mặc định CHỜ tới khi có phần tử — với queue không ai put thêm, chương trình treo. Muốn không chờ '
              'thì dùng get_nowait() và bắt queue.Empty; muốn worker dừng thì gửi một sentinel (None) có chủ đích.'),
        mcq=[
            dict(q='q.get() khi queue rỗng có mặc định trả None ngay không?', options=[
                ('Không; mặc định nó chờ', 'Chờ tới khi có thread khác put.', True),
                ('Có', 'Đó là hiểu nhầm phổ biến — None chỉ có khi ai đó put None.', False),
                ('Có, raise queue.Empty', 'Đó là get_nowait() (hoặc get(block=False)).', False),
            ]),
            dict(q='Worker get() 3 việc nhưng chỉ gọi task_done() 2 lần. jobs.join() sẽ…', options=[
                ('Chờ mãi — vẫn còn một việc chưa báo xong', 'Mỗi get() cần đúng một task_done().', True),
                ('Trả về ngay', 'join chờ tới khi mọi việc đã task_done.', False),
                ('Raise ValueError', 'ValueError chỉ khi task_done nhiều hơn số việc.', False),
            ]),
            dict(q='Vì sao submit đưa dict(record) chứ không đưa record?', options=[
                ('Nơi gọi có thể sửa record trước khi worker lưu; bản sao giữ đúng dữ liệu lúc giao',
                 'Queue chỉ giữ tham chiếu tới object.', True),
                ('Queue không nhận dict', 'Queue nhận mọi object.', False),
                ('Để chạy nhanh hơn', 'Sao chép còn tốn thêm một chút.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao _work dùng get_nowait() và dừng ở queue.Empty, còn worker chạy suốt lại cần get() và sentinel?',
            sample='flush chỉ start worker khi mọi job đã được submit, nên queue rỗng nghĩa là hết việc: get_nowait() '
                   'raise queue.Empty và worker kết thúc, không bao giờ phải chờ. Worker chạy suốt thì queue rỗng chỉ là '
                   '"tạm chưa có việc", nên dùng get() để chờ và một sentinel None để biết khi nào dừng. Trường hợp '
                   'đặc biệt: flush khi chưa submit gì → Empty ngay, trả 0.'),
        scaffold=dict(
            intro='Lắp bản sao khi submit, cách lấy việc không chờ, lời báo xong việc và Thread của flush.',
            template=r'''    def submit(self, record):
        self.jobs.put({{slot1}})

    def _work(self):
        while True:
            try:
                record = {{slot2}}
            except queue.Empty:
                return
            self.lines.append(f"{record['name']},{record['mark']}")
            {{slot3}}

    def flush(self):
        worker = {{slot4}}
        worker.start()
        worker.join()
        return len(self.lines)
''',
            slots=['dict(record)', 'self.jobs.get_nowait()', 'self.jobs.task_done()',
                   'threading.Thread(target=self._work)'],
            traps=[('record', 1, 'Giao chính object của nơi gọi — sửa sau đó là đổi luôn dữ liệu sắp lưu.'),
                   ('self.jobs.get()', 2, 'Queue rỗng thì get() chờ mãi, không bao giờ tới queue.Empty.'),
                   ('self.jobs.join()', 3, 'join chờ các task_done — gọi trong worker là tự chờ chính mình.'),
                   ('threading.Thread(target=self._work())', 4, 'Gọi _work ngay ở thread chính.')]),
        flow=['submit(record) → put bản sao vào self.jobs',
              'flush() → Thread(target=self._work).start()',
              'get_nowait() → lấy theo FIFO, lưu, task_done()',
              'queue.Empty → worker kết thúc, join xong'],
        transfer='Thử flush khi chưa submit gì, flush hai lần liên tiếp, và sửa record sau khi submit.',
        counter=dict(q='Submit 2 record rồi flush; submit thêm 1 record rồi flush lần nữa. flush lần hai trả?',
                     options=['3', '1', 'RuntimeError'], correct='3'),
        practice='submit chỉ put bản sao; mọi việc lưu nằm trong _work chạy ở worker. Lấy bằng get_nowait() trong '
                 'try/except queue.Empty; mỗi job xong gọi task_done(). flush tạo Thread mới mỗi lần.',
        steps=['submit: self.jobs.put(dict(record)).',
               '_work: while True → try get_nowait() / except queue.Empty: return → append f"{name},{mark}" → task_done().',
               'flush: worker = threading.Thread(target=self._work); start; join; return len(self.lines).'],
        partial=r'''    def _work(self):
        while True:
            try:
                record = self.jobs.get_nowait()
            except queue.Empty:
                return
            ...''',
        io=[('submit An 8, Binh 7; flush()', '2; lines = ["An,8", "Binh,7"]'),
            ('flush() khi chưa submit', '0'),
            ('sửa record sau submit rồi flush', 'dòng đã lưu vẫn là giá trị lúc submit')],
        contracts=[K_SUBMIT, K_FLUSH],
        starter=T06_STARTER,
        solution=T06_SOLUTION,
        tests=[
            T('Lưu đúng thứ tự FIFO', saver(rec('Lan', 9), rec('Minh', 6), rec('Nga', 10), 's.flush()', 's.lines'),
              ['Lan,9', 'Minh,6', 'Nga,10']),
            T('flush trả số dòng đã lưu', saver(rec('Lan', 9), rec('Minh', 6), rec('Nga', 10), 's.flush()'), 3),
            T('Chưa flush thì chưa lưu (việc nằm ở worker)', saver(rec('Lan', 9), rec('Minh', 6), '(s.lines, s.jobs.qsize())'),
              ([], 2)),
            T('Sửa record sau submit không đổi dữ liệu đã giao',
              '(lambda s, r: (s.submit(r), r.update(mark=0), s.flush(), s.lines)[-1])'
              '(BackgroundSaver(), {"name": "Oanh", "mark": 8})', ['Oanh,8']),
            T('Chưa submit gì → flush trả 0', saver('s.flush()', '(s.lines, s.jobs.empty())'), ([], True)),
            T('Mỗi get có đúng một task_done (gọi thêm → ValueError)',
              saver(rec('Lan', 9), rec('Minh', 6), 's.flush()', '_studio.call(s.jobs.task_done).error'), 'ValueError'),
            T('flush dùng một worker thread: start, join, target là method',
              '(lambda r: (r.thread_count, r.all_joined, r.targets_callable, r.value))'
              '(' + saver(rec('Phu', 5), '_studio.call(s.flush)') + ')', (1, True, True, 1)),
            T('flush hai lần: mỗi lần một Thread mới',
              saver(rec('An', 1), 's.flush()', rec('Binh', 2), 's.flush()', 's.lines'), ['An,1', 'Binh,2']),
        ],
        bad=[('đưa thẳng record, không sao chép', T06_SOLUTION.replace('self.jobs.put(dict(record))',
                                                                        'self.jobs.put(record)')),
             ('quên task_done()', T06_SOLUTION.replace('            self.jobs.task_done()\n', '')),
             ('tạo Thread một lần trong __init__', T06_SOLUTION.replace(
                 '        self.lines = []\n',
                 '        self.lines = []\n        self.worker = threading.Thread(target=self._work)\n').replace(
                 '        worker = threading.Thread(target=self._work)\n        worker.start()\n        worker.join()\n',
                 '        self.worker.start()\n        self.worker.join()\n')),
             ('lưu ngay trong submit, không qua worker', T06_SOLUTION.replace(
                 '        self.jobs.put(dict(record))',
                 '        self.lines.append(f"{record[\'name\']},{record[\'mark\']}")'))],
    ),
]


BRIEFS = {
    'T01': dict(
        goal='Phân biệt phần thread dùng chung và phần mỗi thread có riêng.',
        task='Viết scope_of(part) → "shared" / "per-thread"; who_am_i() trả tên thread đang chạy.',
        predict='Worker append vào list toàn cục — main thread có thấy không?',
        code=['import threading', '', 'def scope_of(part):', '    pass', '', 'def who_am_i():', '    pass'],
        tests=['"heap" → "shared"', 'who_am_i() trong thread "saver" → "saver"'],
        reflect='Vì sao cùng một hàm lại trả hai tên thread khác nhau?'),
    'T02': dict(
        goal='Tạo nhiều Thread với target/args, start hết rồi join hết.',
        task='Viết download_all(urls): mỗi url một Thread(target=download, args=(url, sizes)).',
        predict='Start rồi join ngay từng trang 1 giây — 3 trang mất bao lâu?',
        code=['def download_all(urls):', '    sizes = {}', '    # mỗi url một Thread(target=download, args=(url, sizes))',
              '    # vòng 1: start hết · vòng 2: join hết', '    return sizes'],
        tests=['["home.html", "news.html"] → {"home.html": 11, "news.html": 13}', '[] → {} và không tạo thread'],
        reflect='Vì sao chỉ đọc sizes sau vòng join?'),
    'T03': dict(
        goal='Tạo worker có trạng thái bằng class con của Thread.',
        task='Viết SumWorker(Thread): super().__init__(), run() tính self.total; rồi parallel_sum(chunks).',
        predict='Override run() hay start()? Gọi cái nào để chạy?',
        code=['class SumWorker(threading.Thread):', '    def __init__(self, numbers): ...', '    def run(self): ...',
              '', 'def parallel_sum(chunks): ...'],
        tests=['SumWorker([1, 2]).total trước start → None', 'parallel_sum([[1, 2, 3], [10, 20]]) → 36'],
        reflect='Vì sao không tính tổng ngay trong __init__?'),
    'T04': dict(
        goal='Ước lượng thời gian theo workload, chọn thread hay process.',
        task='Viết wall_time(tasks, strategy) theo mô hình GIL và best_strategy(tasks).',
        predict='Hai task CPU 3 giây chạy bằng 2 thread — mất bao lâu?',
        code=['def wall_time(tasks, strategy):', '    # serial: cộng hết', '    # thread: max(tổng CPU, I/O dài nhất)',
              '    # process: task dài nhất', '', 'def best_strategy(tasks): ...'],
        tests=['[("io", 2), ("io", 3)], "thread" → 3', '[("cpu", 2), ("cpu", 3)], "thread" → 5'],
        reflect='Vì sao thread giúp được việc chờ I/O mà không giúp được tính toán?'),
    'T05': dict(
        goal='Bảo vệ dữ liệu chung bằng Lock và tránh deadlock.',
        task='Viết deposit/withdraw trong with self.lock và safe_plan(plan, order).',
        predict='Hai thread cùng nạp 50 không có lock — số dư có thể là bao nhiêu?',
        code=['def deposit(self, amount):', '    with self.lock:', '        ...', 'def withdraw(self, amount):',
              '    # kiểm tra + trừ trong CÙNG một with', 'def safe_plan(plan, order): ...'],
        tests=['run_deposits(Account(0), [10, 20, 30]) → 60', 'withdraw quá số dư → ValueError, khoá đã nhả'],
        reflect='Vì sao with lock an toàn hơn acquire/release rời nhau?'),
    'T06': dict(
        goal='Giao việc lưu cho worker nền qua queue.Queue.',
        task='Viết BackgroundSaver: submit bản sao, _work xả queue bằng get_nowait, flush chạy worker.',
        predict='q.get() khi queue rỗng trả None hay chờ?',
        code=['def submit(self, record):', '    self.jobs.put(...)  # bản sao', 'def _work(self):',
              '    # get_nowait() tới queue.Empty; task_done()', 'def flush(self):',
              '    # Thread mới → start → join → len(self.lines)'],
        tests=['submit An 8, Binh 7 → flush() = 2, đúng thứ tự', 'sửa record sau submit → dòng đã lưu không đổi'],
        reflect='Vì sao phải đưa bản sao record vào queue?'),
}

# Chỉ để học viên ĐỌC và chạy trên máy (xem LOCK_ENV) — không lời giải hay ca chấm nào
# import nó. Có `if __name__ == "__main__":` để lỡ bị import trong Studio cũng không chạy.
RACE_DEMO_PY = r'''# Chạy trên MÁY: python race_demo.py — Studio chạy thread lần lượt nên không thấy race.
import threading
import time

balance = 0


def deposit_100():
    global balance
    for _ in range(100):
        seen = balance       # đọc
        time.sleep(0)        # nhường lượt: thread kia chen vào ĐÚNG giữa đọc và ghi
        balance = seen + 1   # ghi: đè mất phần thread kia vừa cộng


if __name__ == "__main__":
    workers = [threading.Thread(target=deposit_100) for _ in range(2)]
    for worker in workers:
        worker.start()
    for worker in workers:
        worker.join()
    print("Mong đợi 200, thực tế", balance)
'''

SUPPORT = {'race_demo.py': RACE_DEMO_PY}
