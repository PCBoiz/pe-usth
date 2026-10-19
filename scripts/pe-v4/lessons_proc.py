"""Khoá Python Advanced (pe-v4) — chặng M1 "Tiến trình và subprocess" (P01–P07).

Nguồn: python-learning-data.json, bài P01–P07 (points + examples), sổ tay trang 54–65.
Bài nguồn P01–P03 chủ yếu là khái niệm hệ điều hành (ví dụ "không phải Python"), nên phần
chấm được dựng thành MÔ HÌNH Python thuần (bảng process, sơ đồ trạng thái, Round Robin) cộng
một mảnh dùng os/subprocess thật; P04–P07 chấm hành vi subprocess/multiprocessing qua bản
mô phỏng của Studio (xem SUBPROCESS_ENV / MP_ENV trong authoring.py).

Quy ước lệnh con: CHỈ [sys.executable, "-c", code] hoặc [sys.executable, "ten_file.py", ...]
— trình duyệt không có shell, và sys.executable là đúng Python đang chạy trên máy thật.
"""
try:
    from authoring import T, TX, out, run, SUBPROCESS_ENV, MP_ENV  # noqa: F401
except ImportError:  # authoring.py của pe-v4 chưa có hằng env: tự khai bản tối thiểu
    from authoring import T, TX, out, run  # noqa: F401
    SUBPROCESS_ENV = ('Trình duyệt không tạo được process thật, nên Studio MÔ PHỎNG subprocess: lệnh '
                      '[sys.executable, "-c", code] chạy trong một vùng nhớ riêng, có stdin/stdout/stderr riêng; '
                      'time.sleep() của con chỉ đẩy đồng hồ ảo. Hãy chạy lại file trên máy để thấy process thật.')
    MP_ENV = ('Trình duyệt không tạo được process thật, nên Studio MÔ PHỎNG multiprocessing: target chạy khi '
              'start() trên bản sao dữ liệu; Queue là kênh dùng chung. Chạy thật trên máy để thấy khác biệt.')

PID_ENV = ('PID trong Studio là số GIẢ nhưng ổn định (process con luôn có PID khác cha); trên máy thật mỗi lần '
           'chạy là một số khác. ' + SUBPROCESS_ENV)


# ======================================================================== P01

P01_TABLE = r'''# Mô phỏng kết quả lệnh ps: mỗi dòng (pid, ppid, program)
TABLE = [
    (1, 0, "init"),
    (120, 1, "bash"),
    (305, 120, "python"),
    (306, 120, "python"),
    (410, 305, "python"),
]
'''

P01_SOLUTION = r'''import os

''' + P01_TABLE + r'''

def count_processes(table, program):
    count = 0
    for pid, ppid, name in table:
        if name == program:
            count += 1
    return count


def ancestors(table, pid):
    parent_of = {}
    for row_pid, row_ppid, program in table:
        parent_of[row_pid] = row_ppid
    if pid not in parent_of:
        raise ValueError(f"không có process {pid} trong bảng")
    chain = [pid]
    while parent_of[pid] in parent_of:
        pid = parent_of[pid]
        chain.append(pid)
    return chain


def current_identity():
    return os.getpid(), os.getppid()


if __name__ == "__main__":
    print(count_processes(TABLE, "python"))
    print(ancestors(TABLE, 410))
    print(current_identity())
'''

P01_STARTER = r'''import os

''' + P01_TABLE + r'''

def count_processes(table, program):
    # Mỗi DÒNG là một process; đếm số dòng chạy program.
    pass


def ancestors(table, pid):
    # [pid, cha, ông, ...] đi theo ppid tới gốc; pid lạ -> ValueError.
    pass


def current_identity():
    # (PID, PPID) của chính process đang chạy dòng này.
    pass


if __name__ == "__main__":
    print(count_processes(TABLE, "python"))
    print(ancestors(TABLE, 410))
    print(current_identity())
'''

P01_OTHER = '[(1, 0, "systemd"), (900, 1, "sshd"), (77, 900, "bash"), (5000, 77, "python")]'


# ======================================================================== P02

P02_HEAD = r'''import subprocess
import sys

# Sơ đồ 5 trạng thái (sự kiện ghi trên mũi tên):
#   new --admit--> ready --dispatch--> running --exit--> terminated
#   running --interrupt--> ready     (hết time slice, bị ngắt)
#   running --io_wait--> waiting     (chờ đọc đĩa, chờ mạng...)
#   waiting --io_done--> ready       (I/O xong: xếp hàng lại)
'''

P02_LIFECYCLE = r'''

def lifecycle(events):
    states = ["new"]
    for event in events:
        states.append(next_state(states[-1], event))
    return states
'''

P02_MAIN = r'''

if __name__ == "__main__":
    print(lifecycle(["admit", "dispatch", "io_wait", "io_done", "dispatch", "exit"]))
    print(run_child("raise SystemExit(3)"))
'''

P02_SOLUTION = P02_HEAD + r'''
TRANSITIONS = {
    ("new", "admit"): "ready",
    ("ready", "dispatch"): "running",
    ("running", "interrupt"): "ready",
    ("running", "io_wait"): "waiting",
    ("waiting", "io_done"): "ready",
    ("running", "exit"): "terminated",
}


def next_state(state, event):
    if (state, event) not in TRANSITIONS:
        raise ValueError(f"không có chuyển {state} --{event}-->")
    return TRANSITIONS[(state, event)]
''' + P02_LIFECYCLE + r'''

def run_child(code):
    child = subprocess.Popen([sys.executable, "-c", code])
    return child.wait()
''' + P02_MAIN

P02_STARTER = P02_HEAD + r'''

def next_state(state, event):
    # Trả trạng thái mới theo sơ đồ; cặp (state, event) không có -> ValueError.
    pass
''' + P02_LIFECYCLE + r'''

def run_child(code):
    # Tạo con bằng subprocess.Popen([sys.executable, "-c", code]),
    # chờ con kết thúc rồi trả exit code.
    pass
''' + P02_MAIN


# ======================================================================== P03

P03_RR = r'''from collections import deque


def round_robin(jobs, quantum, switch=0):
    if quantum <= 0:
        raise ValueError("quantum must be positive")
    ready = deque(jobs)
    clock = 0
    last = None
    timeline = []
    while ready:
        name, left = ready.popleft()
        if last is not None and name != last:
            clock += switch
        run = min(quantum, left)
        timeline.append((name, clock, clock + run))
        clock += run
        last = name
        if left > run:
            ready.append((name, left - run))
    return timeline
'''

P03_SOLUTION = P03_RR + r'''

def waiting_times(jobs, timeline):
    finish = {}
    for name, start, end in timeline:
        finish[name] = end
    return {name: finish[name] - burst for name, burst in jobs}


if __name__ == "__main__":
    jobs = [("P1", 5), ("P2", 3), ("P3", 1)]
    timeline = round_robin(jobs, 2)
    print(timeline)
    print(waiting_times(jobs, timeline))
'''

P03_STARTER = r'''from collections import deque


def round_robin(jobs, quantum, switch=0):
    # jobs: list (tên, burst) cùng đến lúc 0. Trả list (tên, bắt đầu, kết thúc).
    # Hết quantum mà chưa xong -> về CUỐI hàng; đổi sang process khác -> clock += switch.
    pass


def waiting_times(jobs, timeline):
    # {tên: lúc hoàn thành - burst}
    pass


if __name__ == "__main__":
    jobs = [("P1", 5), ("P2", 3), ("P3", 1)]
    timeline = round_robin(jobs, 2)
    print(timeline)
    print(waiting_times(jobs, timeline))
'''


# ======================================================================== P04

SUM_NUMBERS = r'''import sys

# Đọc số nguyên từ stdin (mỗi dòng một số), in TỔNG ra stdout.
# Dòng không phải số nguyên: báo "skip: <dòng>" ra stderr.
total = 0
for line in sys.stdin:
    text = line.strip()
    if text == "":
        continue
    try:
        total += int(text)
    except ValueError:
        print("skip:", text, file=sys.stderr)
print(total)
'''

P04_SOLUTION = r'''import subprocess
import sys


def read_scores():
    scores = []
    for line in sys.stdin:
        text = line.strip()
        if text == "":
            continue
        try:
            scores.append(int(text))
        except ValueError:
            print("skip:", text, file=sys.stderr)
    return scores


def run_sum(lines):
    data = "".join(line + "\n" for line in lines)
    result = subprocess.run([sys.executable, "sum_numbers.py"],
                            input=data, capture_output=True, text=True)
    return int(result.stdout), result.stderr.splitlines()


if __name__ == "__main__":
    print(run_sum(["10", "x", "20"]))
'''

P04_STARTER = r'''import subprocess
import sys


def read_scores():
    # Đọc mọi dòng của sys.stdin: số nguyên -> giữ; dòng rỗng -> bỏ;
    # dòng khác -> in "skip: <dòng>" ra STDERR.
    pass


def run_sum(lines):
    # Chạy sum_numbers.py làm process con, đưa lines vào stdin của con,
    # thu riêng stdout và stderr; trả (tổng, list dòng cảnh báo).
    pass


if __name__ == "__main__":
    print(run_sum(["10", "x", "20"]))
'''

# Bắt riêng stderr NGAY TRONG lần chạy có stdin cấp sẵn: nếu học viên in cảnh báo ra
# stdout thì _err rỗng còn r.stdout có chữ "skip".
P04_STDERR_ENTRY = ('import io, contextlib\n_err = io.StringIO()\n'
                    'with contextlib.redirect_stderr(_err):\n    _got = read_scores()')


# ======================================================================== P05

P05_SOLUTION = r'''import subprocess
import sys


def exit_code(code):
    return subprocess.run([sys.executable, "-c", code]).returncode


def output_of(code):
    return subprocess.check_output([sys.executable, "-c", code], text=True)


def grade(code, expected, limit=2):
    try:
        result = subprocess.run([sys.executable, "-c", code],
                                capture_output=True, text=True, timeout=limit)
    except subprocess.TimeoutExpired:
        return "TIMEOUT"
    if result.returncode != 0:
        return f"ERROR {result.returncode}"
    if result.stdout.strip() == expected:
        return "PASS"
    return "FAIL"


if __name__ == "__main__":
    print(grade("print(2+3)", "5"))
'''

P05_STARTER = r'''import subprocess
import sys


def exit_code(code):
    # Exit code (int) của process con chạy code.
    pass


def output_of(code):
    # stdout (str) của con, dùng subprocess.check_output.
    pass


def grade(code, expected, limit=2):
    # "TIMEOUT" / "ERROR <mã>" / "PASS" / "FAIL"
    pass


if __name__ == "__main__":
    print(grade("print(2+3)", "5"))
'''


# ======================================================================== P06

P06_SOLUTION = r'''import subprocess
import sys


def talk(code, data, limit=2):
    proc = subprocess.Popen([sys.executable, "-c", code],
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True)
    try:
        out, err = proc.communicate(data, timeout=limit)
    except subprocess.TimeoutExpired:
        proc.kill()
        out, err = proc.communicate()
        return "timeout", out, proc.returncode
    return "ok", out, proc.returncode


if __name__ == "__main__":
    print(talk("print(input().upper())", "hello\n"))
'''

P06_STARTER = r'''import subprocess
import sys


def talk(code, data, limit=2):
    # Popen với stdin/stdout/stderr = PIPE và text=True;
    # communicate(data, timeout=limit); quá giờ -> kill() rồi communicate() lại.
    pass


if __name__ == "__main__":
    print(talk("print(input().upper())", "hello\n"))
'''

P06_SLEEPER = 'import time; time.sleep(10)'
P06_CHATTY = "import time; print('start', flush=True); time.sleep(10)"


# ======================================================================== P07

P07_SOLUTION = r'''from multiprocessing import Process, Queue


def square(n, results):
    results.put((n, n * n))


def run_workers(numbers):
    results = Queue()
    workers = [Process(target=square, args=(n, results)) for n in numbers]
    for worker in workers:
        worker.start()
    squares = {}
    for _ in numbers:
        n, value = results.get()
        squares[n] = value
    for worker in workers:
        worker.join()
    return squares


if __name__ == "__main__":
    print(run_workers([2, 3, 4]))
'''

P07_STARTER = r'''from multiprocessing import Process, Queue


def square(n, results):
    # Gửi cặp (n, n * n) về cha qua Queue results.
    pass


def run_workers(numbers):
    # Một Process cho mỗi số; start hết, get đủ kết quả, join hết; trả dict.
    pass


if __name__ == "__main__":
    print(run_workers([2, 3, 4]))
'''

P07_GLOBAL = r'''from multiprocessing import Process, Queue

SQUARES = {}


def square(n, results):
    SQUARES[n] = n * n


def run_workers(numbers):
    results = Queue()
    workers = [Process(target=square, args=(n, results)) for n in numbers]
    for worker in workers:
        worker.start()
    for worker in workers:
        worker.join()
    return dict(SQUARES)


if __name__ == "__main__":
    print(run_workers([2, 3, 4]))
'''


# ======================================================================== bài

LESSONS = [
    # ------------------------------------------------------------------ P01
    dict(
        code='P01', title='Program, process và tài nguyên', minutes=25,
        goal='Phân biệt program với process, đọc PID/PPID và đi ngược cây process.',
        prereq=None, env=PID_ENV,
        brief='TABLE mô phỏng kết quả lệnh ps: mỗi dòng (pid, ppid, program). Viết count_processes(table, program) '
              'đếm số PROCESS đang chạy program đó (mỗi dòng là một process); ancestors(table, pid) trả list PID đi '
              'ngược theo ppid: [pid, cha, ông, …] tới khi ppid không còn trong bảng (pid không có trong bảng → '
              'ValueError); current_identity() trả (os.getpid(), os.getppid()) của chính process đang chạy.',
        example='Với TABLE mẫu: count_processes(TABLE, "python") → 3 (một program, ba process); '
                'ancestors(TABLE, 410) → [410, 305, 120, 1].',
        demo=r'''import os
import subprocess
import sys

print("Tôi là process", os.getpid(), "- cha của tôi là", os.getppid())

cmd = [sys.executable, "-c", "import os; print(os.getpid(), os.getppid())"]
for run in range(2):
    child_pid, child_ppid = subprocess.check_output(cmd, text=True).split()
    print("Lần", run + 1, "- con", child_pid, "có cha", child_ppid)
''',
        explain=[
            'Program là mã nằm yên trên đĩa (file .py). Process là MỘT LẦN chạy program đó — có PID, bộ nhớ và '
            'trạng thái riêng.',
            'Chạy cùng một file hai lần → hai process, hai PID. Một program có thể có nhiều process cùng lúc.',
            'os.getpid() trả PID của process đang chạy dòng code đó; os.getppid() trả PID của process CHA. Nối '
            'ppid → pid ta được cây process.',
            'Tài nguyên riêng của process: context (program counter, thanh ghi), stack, data, heap và file '
            'descriptor — 0, 1, 2 là stdin, stdout, stderr.',
            'Process thường KHÔNG chung không gian địa chỉ: con sửa list của nó, list của cha không đổi. Trao dữ '
            'liệu phải qua pipe, file, queue (P04, P07).',
        ],
        theory=[
            dict(h='Program trên đĩa, process là lần chạy',
                 body='Program là mã thụ động nằm trên đĩa; process là MỘT lần chạy program đó, đang hoạt động. Cùng '
                      'một program có thể đang ứng với nhiều process một lúc.',
                 bullets=['PID: số hệ điều hành cấp cho từng process, không cấp cho file .py',
                          'PPID: PID của process cha đã tạo ra nó',
                          'Mỗi process có vùng nhớ riêng: process stack, data section, heap']),
            dict(h='Ba dòng python là ba process', figure='P01-process-tree',
                 body='pstree -A in ra init-+-cron, |-sshd---bash---pstree: bash tạo python, python tạo con thì thành '
                      'cháu. TABLE của bài là một lát cắt như vậy — ba dòng "python" là ba process của cùng một program.'),
            dict(h='Log kèm PID mới truy được lần chạy',
                 bullets=['ps / pstree / Task Manager: xem process nào đang chạy và là con của ai',
                          'Ghi log kèm os.getpid() để biết dòng log đến từ lần chạy nào',
                          'Studio cho PID GIẢ (ổn định, con khác cha); máy thật mỗi lần một số']),
            dict(h='Một file, hai process, hai vùng nhớ', figure='P01-program-vs-process',
                 body='Bên trái là file .py nằm yên trên đĩa — đó là program. Hai khối bên phải là hai process sinh ra '
                      'từ nó: PID riêng, vùng nhớ riêng (text, data, heap, stack), ba file descriptor 0/1/2 ở đáy.'),
        ],
        # Hai hình: phần tử ĐẦU là hình chính (màn explain và sổ tay dùng nó). Hình thứ hai
        # vẽ cùng đợt nhưng trước đây không khai được vì schema chỉ nhận một hình — nó nằm
        # trong public/static/anim mà không bài nào nối vào.
        figure=[dict(name='P01-program-vs-process',
                     caption='Một file .py sinh hai process, mỗi process có PID và vùng nhớ riêng',
                     alt='Bên trái file .py trên đĩa; bên phải hai hộp process PID khác nhau, mỗi hộp có text/data/heap/'
                         'stack và ba file descriptor 0, 1, 2'),
                dict(name='P01-process-tree',
                     caption='Cây process: PPID của con luôn bằng PID của cha, init là gốc',
                     alt='Cây process từ init PID 1 xuống cron, bash, python3 app.py và ls -l do subprocess tạo; mỗi '
                         'hộp ghi PID và PPID, kèm kết xuất pstree và bảng ps')],
        slides='SL 4-18',
        predict=dict(q='Chạy cùng một script hai lần liên tiếp. Hai lần đó có nhất thiết cùng PID không?', options=[
            ('Không — mỗi lần chạy là một process mới, hệ điều hành cấp PID mới',
             'PID định danh process (một lần thực thi), không định danh file .py.', True),
            ('Có — cùng file thì cùng PID', 'PID gắn với process đang chạy, không gắn với program.', False),
            ('Có, nếu chạy trên cùng một máy', 'Cùng máy vẫn là hai lần thực thi khác nhau.', False),
        ]),
        myth=('"Program và process là một"',
              'Program là mã thụ động; process là một lần thực thi đang hoạt động. Một program có thể có nhiều '
              'process cùng lúc (mở ba cửa sổ python là ba process), mỗi process có PID, stack, heap, file '
              'descriptor riêng. Vì vậy đếm process phải đếm từng DÒNG trong bảng ps, không đếm tên program.'),
        mcq=[
            dict(q='os.getppid() trả về gì?', options=[
                ('PID của process cha đã tạo ra process hiện tại', 'Nối ppid → pid ta đi ngược được cây process.', True),
                ('PID của chính process hiện tại', 'Đó là os.getpid().', False),
                ('Số process con đang chạy', 'Không hàm os nào đếm con theo kiểu này.', False),
            ]),
            dict(q='File descriptor 0, 1, 2 của một process thường là gì?', options=[
                ('stdin, stdout, stderr', 'Ba luồng chuẩn mỗi process có sẵn khi khởi động.', True),
                ('Ba process đầu tiên của hệ thống', 'Đó là PID, không phải file descriptor.', False),
                ('Ba vùng nhớ stack, data, heap', 'File descriptor tham chiếu tài nguyên I/O, không phải vùng nhớ.', False),
            ]),
            dict(q='Object tạo trong lúc chạy (vd. list(range(5))) nằm ở vùng nhớ nào của process?', options=[
                ('Heap — vùng cấp phát động', 'Stack chỉ giữ khung lời gọi hàm và tham chiếu tới object.', True),
                ('Program counter', 'PC chỉ là vị trí lệnh đang chạy.', False),
                ('File descriptor', 'File descriptor tham chiếu file, pipe, terminal.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao count_processes(TABLE, "python") là 3 chứ không phải 1?',
            sample='Ba dòng có program "python" là ba lần thực thi khác nhau với ba PID 305, 306, 410 — tức ba '
                   'process, dù chỉ có một program "python". Đếm tên program khác nhau sẽ ra 1 và bỏ mất hai process '
                   'đang chạy. Trường hợp đặc biệt: program không có dòng nào thì trả 0.'),
        scaffold=dict(
            intro='Lắp chỗ so sánh khi đếm, chỗ dựng bảng cha và bước đi lên cây.',
            template=r'''def count_processes(table, program):
    count = 0
    for pid, ppid, name in table:
        if {{slot1}}:
            count += 1
    return count


def ancestors(table, pid):
    parent_of = {}
    for row_pid, row_ppid, program in table:
        {{slot2}}
    if pid not in parent_of:
        raise ValueError(f"không có process {pid} trong bảng")
    chain = [pid]
    while parent_of[pid] in parent_of:
        pid = {{slot3}}
        chain.append(pid)
    return chain
''',
            slots=['name == program', 'parent_of[row_pid] = row_ppid', 'parent_of[pid]'],
            traps=[('name in program', 1, '"py" in "python" là True — đếm nhầm program khác tên.'),
                   ('parent_of[row_ppid] = row_pid', 2, 'Ngược chiều: một cha nhiều con thì con sau ghi đè con trước.'),
                   ('row_ppid', 3, 'Biến của vòng for đã xong — chỉ là ppid của dòng cuối bảng.')]),
        flow=['ancestors(TABLE, 410) → chain = [410]',
              'parent_of[410] là 305 → thêm 305',
              'parent_of[305] là 120, parent_of[120] là 1 → thêm 120 rồi 1',
              'parent_of[1] là 0, không có trong bảng → dừng, trả [410, 305, 120, 1]'],
        transfer='Đổi sang bảng của máy khác (PID không tăng dần, dòng con đứng trước dòng cha) và một program '
                 'không có process nào; thử cả PID không có trong bảng.',
        counter=dict(q='Bảng [(1, 0, "init"), (7, 1, "code"), (8, 1, "code")]: count_processes(bảng, "code") là?',
                     options=['2', '1', '3'], correct='2'),
        practice='Đếm theo DÒNG (mỗi dòng một process). Dựng dict pid → ppid một lần, rồi đi ngược theo ppid tới '
                 'khi ppid không còn trong bảng.',
        steps=['count_processes: duyệt từng dòng (pid, ppid, name), cộng 1 khi name == program.',
               'ancestors: dựng parent_of = {pid: ppid}; pid không có trong dict → raise ValueError.',
               'chain = [pid]; khi parent_of[pid] còn trong bảng: pid = parent_of[pid], append.',
               'current_identity: return os.getpid(), os.getppid() — không viết cứng số nào.'],
        partial=r'''    parent_of = {}
    for row_pid, row_ppid, program in table:
        parent_of[row_pid] = row_ppid
    ...''',
        io=[('count_processes(TABLE, "python")', '3'),
            ('ancestors(TABLE, 410)', '[410, 305, 120, 1]'),
            ('ancestors(TABLE, 999)', 'ValueError')],
        contracts=[
            dict(sig='count_processes(table, program)', does='Đếm số process đang chạy một program.',
                 takes='table: list (pid, ppid, program); program: str', gives='int (0 nếu không có)',
                 effect='Không in, không sửa table.', call='count_processes(TABLE, "python") → 3'),
            dict(sig='ancestors(table, pid)', does='Đi ngược cây process theo ppid.',
                 takes='table như trên; pid: int', gives='list[int] bắt đầu bằng pid; pid lạ → ValueError',
                 effect='Không phụ thuộc thứ tự dòng trong table.', call='ancestors(TABLE, 410) → [410, 305, 120, 1]'),
            dict(sig='current_identity()', does='Cho biết process hiện tại là ai, cha là ai.',
                 takes='không', gives='tuple (os.getpid(), os.getppid())', effect='Không in.',
                 call='current_identity() → (PID, PPID)'),
        ],
        starter=P01_STARTER,
        solution=P01_SOLUTION,
        tests=[
            T('TABLE: "python" có 3 process', 'count_processes(TABLE, "python")', 3),
            T('Bảng khác: "sshd" có 1, "vim" có 0',
              f'(count_processes({P01_OTHER}, "sshd"), count_processes({P01_OTHER}, "vim"))', (1, 0)),
            T('Một program, hai process', 'count_processes([(1, 0, "init"), (7, 1, "code"), (8, 1, "code")], "code")', 2),
            T('ancestors(TABLE, 410)', 'ancestors(TABLE, 410)', [410, 305, 120, 1]),
            T('Gốc cây: ancestors(TABLE, 1) → [1]', 'ancestors(TABLE, 1)', [1]),
            T('PID không tăng dần', f'ancestors({P01_OTHER}, 5000)', [5000, 77, 900, 1]),
            T('Dòng con đứng trước dòng cha', 'ancestors([(50, 7, "python"), (7, 1, "bash"), (1, 0, "init")], 50)',
              [50, 7, 1]),
            T('PID không có trong bảng → ValueError', '_studio.call(ancestors, TABLE, 999).error', 'ValueError'),
            TX('current_identity() = (os.getpid(), os.getppid())', 'current_identity()',
               '(__import__("os").getpid(), __import__("os").getppid())'),
        ],
        bad=[('đếm program (có/không) thay vì đếm process',
              P01_SOLUTION.replace('            count += 1\n', '            count = 1\n')),
             ('nhầm chiều pid ↔ ppid',
              P01_SOLUTION.replace('parent_of[row_pid] = row_ppid', 'parent_of[row_ppid] = row_pid')),
             ('nhầm getpid với getppid',
              P01_SOLUTION.replace('return os.getpid(), os.getppid()', 'return os.getpid(), os.getpid()'))],
    ),

    # ------------------------------------------------------------------ P02
    dict(
        code='P02', title='Vòng đời, fork, exec và wait', minutes=35,
        goal='Theo dõi vòng đời process và chờ process con để lấy exit code.',
        prereq='P01', env=SUBPROCESS_ENV,
        brief='Viết next_state(state, event) theo sơ đồ 5 trạng thái: new –admit→ ready, ready –dispatch→ running, '
              'running –interrupt→ ready, running –io_wait→ waiting, waiting –io_done→ ready, running –exit→ '
              'terminated; cặp (state, event) khác → ValueError. lifecycle(events) đã cấp, dùng next_state. Rồi viết '
              'run_child(code): tạo process con bằng subprocess.Popen([sys.executable, "-c", code]), chờ con kết thúc '
              'bằng wait() và trả exit code.',
        example='next_state("waiting", "io_done") → "ready"; run_child("raise SystemExit(3)") → 3; run_child("pass") → 0.',
        demo=r'''import subprocess
import sys

child = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(0.5)"])
print("Vừa tạo con; returncode =", child.returncode)
code = child.wait()
print("wait() trả", code, "- returncode =", child.returncode, "- poll() =", child.poll())
''',
        explain=[
            'Vòng đời: new → ready (chờ tới lượt CPU) → running → terminated. Đang chạy mà phải chờ I/O thì sang waiting.',
            'I/O xong → về ready, KHÔNG nhảy thẳng vào running: CPU có thể đang chạy process khác, scheduler mới '
            'quyết định ai chạy.',
            'UNIX fork() nhân bản process: cha nhận PID của con, con nhận 0. exec() THAY chương trình trong chính '
            'process đó — PID giữ nguyên.',
            'wait() cho cha chờ con kết thúc và thu exit code (con xong mà chưa được thu là zombie). Windows không '
            'có fork; nó tạo process bằng CreateProcess.',
            'subprocess.Popen(...) tạo con rồi trả object NGAY, returncode còn None. wait() chặn tới khi con xong '
            'và trả exit code: 0, n của SystemExit(n), 1 nếu có ngoại lệ.',
        ],
        theory=[
            dict(h='Sự kiện mới làm process đi tiếp',
                 body='Trạng thái là chỗ process đang đứng; sự kiện là cái làm nó đi tiếp. Sơ đồ chỉ có sáu đường '
                      'chuyển — mọi cặp (trạng thái, sự kiện) khác đều không có nghĩa.',
                 bullets=['new: vừa được tạo — ready: chờ scheduler giao cho một processor',
                          'running: đang thực thi lệnh — waiting: đang chờ một sự kiện I/O',
                          'terminated: đã chạy xong']),
            dict(h='Cha nhận PID con, con nhận 0', figure='P02-fork-exec-wait',
                 body='fork() nhân bản process đang chạy, mọi thứ giống TRỪ process id: cha nhận PID của con, con nhận '
                      '0, nên if (pid == 0) tách được hai nhánh. Con gọi exec() thay chương trình (PID giữ nguyên), '
                      'cha gọi wait() thu kết quả.'),
            dict(h='Thiếu wait(), con xong thành zombie',
                 bullets=['subprocess trên Linux làm đúng việc đó: fork rồi exec trong process con',
                          'wait() để lấy exit code, và để con đã xong không nằm lại thành zombie',
                          'Windows không có fork (dùng CreateProcess); Studio chỉ mô phỏng subprocess']),
            dict(h='Rời running luôn quay về ready', figure='P02-lifecycle',
                 body='Ô là TRẠNG THÁI, chữ trên mũi tên là SỰ KIỆN; chấm đen là lúc process ra đời, vòng tròn viền là '
                      'lúc nó biến mất. Hai mũi tên rời running — interrupt và io_wait — đều quay về ready, không về '
                      'thẳng running.'),
        ],
        figure=[dict(name='P02-lifecycle',
                     caption='Vòng đời process: 5 trạng thái và sự kiện chuyển giữa chúng',
                     alt='Sơ đồ new → ready → running; running → ready khi interrupt; running → waiting khi chờ I/O; '
                         'waiting → ready khi I/O xong; running → terminated khi exit'),
                dict(name='P02-fork-exec-wait',
                     caption='fork nhân bản, exec thay chương trình, exit rồi wait thu mã thoát',
                     alt='Hai làn cha và con: fork() tách nhánh (cha nhận PID con, con nhận 0), con exec() rồi exit(0), '
                         'mã thoát đi ngược lên lời gọi wait() của cha')],
        slides='SL 15-16, 22-29',
        predict=dict(q='Ngay sau child = subprocess.Popen([...]) (chưa gọi wait/poll), child.returncode là gì?', options=[
            ('None — Popen trả object ngay, chưa ai thu trạng thái kết thúc của con',
             'returncode chỉ được điền khi poll()/wait()/communicate() thấy con đã kết thúc.', True),
            ('0', '0 chỉ có sau khi con đã kết thúc thành công VÀ đã được thu.', False),
            ('PID của con', 'PID nằm ở child.pid.', False),
        ]),
        myth=('"exec() tạo ra một process mới"',
              'exec() thay image chương trình của CHÍNH process đang chạy; PID không đổi. Tạo process mới là việc '
              'của fork() (UNIX) hay CreateProcess (Windows); subprocess trên Linux fork rồi exec trong con. Ngộ nhận '
              'đi kèm: đọc child.returncode ngay sau Popen để lấy exit code — lúc đó nó còn là None, phải wait() trước.'),
        mcq=[
            dict(q='Sau os.fork() thành công, giá trị trả về trong process CON là?', options=[
                ('0', 'Cha nhận PID của con, con nhận 0 — nhờ vậy if pid == 0 tách được hai nhánh.', True),
                ('PID của con', 'Đó là giá trị cha nhận.', False),
                ('PID của cha', 'Con muốn biết cha thì gọi os.getppid().', False),
            ]),
            dict(q='Process đang waiting (chờ đọc đĩa) và I/O vừa xong. Nó chuyển sang…', options=[
                ('ready — xếp hàng chờ scheduler cho chạy tiếp', 'CPU có thể đang chạy process khác; I/O xong chỉ có nghĩa là SẴN SÀNG.', True),
                ('running ngay lập tức', 'Phải qua ready và được scheduler chọn (dispatch).', False),
                ('terminated', 'Chờ I/O xong không có nghĩa là kết thúc.', False),
            ]),
            dict(q='exec() có luôn tạo PID mới không?', options=[
                ('Không — nó thay chương trình của process hiện tại, PID giữ nguyên', 'Tạo process mới là fork()/CreateProcess.', True),
                ('Có', 'exec không tạo thêm process.', False),
                ('Chỉ trên Windows', 'Windows không có exec theo nghĩa UNIX; tạo process bằng CreateProcess.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao I/O xong thì process về ready chứ không về running?',
            sample='Trong lúc process chờ I/O, scheduler đã giao CPU cho process khác. Khi I/O xong, process chỉ SẴN '
                   'SÀNG chạy tiếp nên phải xếp vào hàng ready chờ scheduler chọn lại (dispatch). Nhảy thẳng sang '
                   'running là cướp CPU của process đang chạy — chỉ scheduler quyết định việc đó. Trường hợp đặc biệt: '
                   'cặp không có trong sơ đồ (vd. waiting + dispatch) thì báo ValueError.'),
        scaffold=dict(
            intro='Lắp chuyển trạng thái hay nhầm, cách báo lỗi và lệnh chờ con.',
            template=r'''TRANSITIONS = {
    ("new", "admit"): "ready",
    ("ready", "dispatch"): "running",
    ("running", "interrupt"): "ready",
    ("running", "io_wait"): "waiting",
    ("waiting", "io_done"): {{slot1}},
    ("running", "exit"): "terminated",
}


def next_state(state, event):
    if (state, event) not in TRANSITIONS:
        {{slot2}}
    return TRANSITIONS[(state, event)]


def run_child(code):
    child = subprocess.Popen([sys.executable, "-c", code])
    return {{slot3}}
''',
            slots=['"ready"', 'raise ValueError("invalid transition")', 'child.wait()'],
            traps=[('"running"', 1, 'I/O xong chưa chắc được CPU ngay: còn phải qua một bước dispatch nữa.'),
                   ('return None', 2, 'Âm thầm trả None — lỗi chuyển trạng thái bị che mất.'),
                   ('child.returncode', 3, 'Đọc ngay sau Popen là None: chưa ai chờ con.')]),
        flow=['Popen([sys.executable, "-c", code]) → con được tạo, cha chạy tiếp ngay',
              'child.returncode lúc này → None: chưa ai thu trạng thái',
              'child.wait() → cha chặn tới khi con terminated',
              'wait() trả về → exit code: 0, n của SystemExit(n), 1 nếu lỗi'],
        transfer='Thử chuỗi sự kiện có hai lần bị ngắt và một lần chờ I/O; thử con thoát bằng SystemExit(7) và con '
                 'ném ZeroDivisionError.',
        counter=dict(q='run_child("import sys; sys.exit(7)") trả gì?', options=['7', '0', 'None'], correct='7'),
        practice='Viết sơ đồ thành dict {(state, event): trạng thái mới}; cặp không có trong dict thì raise '
                 'ValueError. Với process con: Popen → wait() → trả giá trị của wait().',
        steps=['Liệt kê đủ 6 cặp (state, event) hợp lệ vào dict TRANSITIONS.',
               'next_state: cặp không có trong dict → raise ValueError; có thì trả trạng thái mới.',
               'run_child: child = subprocess.Popen([sys.executable, "-c", code]).',
               'return child.wait() — không đọc child.returncode trước khi chờ.'],
        partial=r'''def run_child(code):
    child = subprocess.Popen([sys.executable, "-c", code])
    ...''',
        io=[('next_state("waiting", "io_done")', '"ready"'),
            ('next_state("new", "dispatch")', 'ValueError'),
            ('run_child("raise SystemExit(3)")', '3')],
        contracts=[
            dict(sig='next_state(state, event)', does='Một bước trong sơ đồ 5 trạng thái.',
                 takes='state, event: str', gives='str trạng thái mới; cặp không hợp lệ → ValueError',
                 effect='Không in.', call='next_state("running", "io_wait") → "waiting"'),
            dict(sig='run_child(code)', does='Tạo process con chạy code bằng Python hiện tại và chờ nó.',
                 takes='code: str (mã Python)', gives='int exit code của con',
                 effect='Con in gì thì in thẳng ra màn hình (không thu).', call='run_child("pass") → 0'),
        ],
        starter=P02_STARTER,
        solution=P02_SOLUTION,
        tests=[
            T('new --admit--> ready', 'next_state("new", "admit")', 'ready'),
            T('I/O xong → ready, không phải running', 'next_state("waiting", "io_done")', 'ready'),
            T('Bị ngắt (hết time slice) → ready', 'next_state("running", "interrupt")', 'ready'),
            T('Vòng đời có chờ I/O và bị ngắt',
              'lifecycle(["admit", "dispatch", "interrupt", "dispatch", "io_wait", "io_done", "dispatch", "exit"])',
              ['new', 'ready', 'running', 'ready', 'running', 'waiting', 'ready', 'running', 'terminated']),
            TX('Chuyển không hợp lệ → ValueError',
               '[_studio.call(next_state, s, e).error for s, e in [("new", "dispatch"), ("waiting", "dispatch"), '
               '("terminated", "admit"), ("ready", "exit")]]', "['ValueError'] * 4"),
            T('run_child("pass") → 0', 'run_child("pass")', 0),
            T('SystemExit(3) → 3, sys.exit(7) → 7',
              '(run_child("raise SystemExit(3)"), run_child("import sys; sys.exit(7)"))', (3, 7)),
            T('Ngoại lệ không bắt trong con → 1', 'run_child("1/0")', 1),
            T('Dùng Popen rồi tự chờ (không gọi run)',
              '[c["kind"] for c in _studio.call(run_child, "pass").subprocess_calls]', ['Popen']),
        ],
        bad=[('đọc returncode trước khi chờ',
              P02_SOLUTION.replace('    return child.wait()\n', '    return child.returncode\n')),
             ('I/O xong nhảy thẳng vào running',
              P02_SOLUTION.replace('("waiting", "io_done"): "ready"', '("waiting", "io_done"): "running"'))],
    ),

    # ------------------------------------------------------------------ P03
    dict(
        code='P03', title='Scheduling và context switch', minutes=35,
        goal='Mô phỏng Round Robin có time slice, tính thời gian chờ và chi phí context switch.',
        prereq='P02',
        brief='Viết round_robin(jobs, quantum, switch=0): jobs là list (tên, burst) — burst nguyên dương, mọi job '
              'đến lúc 0, hàng ready theo đúng thứ tự list. Mỗi lượt lấy process đầu hàng, cho chạy min(quantum, '
              'phần còn lại) đơn vị và ghi (tên, bắt đầu, kết thúc) vào timeline; chưa xong thì về CUỐI hàng. Mỗi khi '
              'CPU chuyển sang một process KHÁC process vừa chạy, đồng hồ cộng thêm switch đơn vị (context switch, '
              'không ai làm việc). quantum <= 0 → ValueError; không sửa list jobs. Rồi viết waiting_times(jobs, '
              'timeline): dict tên → lúc hoàn thành − burst.',
        example='jobs = [("P1", 5), ("P2", 3), ("P3", 1)], quantum = 2 → P1 0–2, P2 2–4, P3 4–5, P1 5–7, P2 7–8, '
                'P1 8–9; thời gian chờ {"P1": 4, "P2": 5, "P3": 4}.',
        demo=r'''ready = ["A", "B", "C"]
clock = 0
quantum = 3
for turn in range(4):
    current = ready.pop(0)
    clock = clock + quantum
    print(current, "chạy tới thời điểm", clock)
    ready.append(current)
''',
        explain=[
            'Một lõi CPU chỉ chạy một process tại một thời điểm. Xen kẽ đủ nhanh thì nhiều tác vụ cùng tiến triển '
            '(concurrency); nhiều lõi mới chạy song song thật.',
            'Round Robin là preemptive: mỗi process được tối đa quantum (time slice); hết lượt mà chưa xong thì bị '
            'NGẮT và về CUỐI hàng ready.',
            'FCFS là non-preemptive: process đầu hàng chạy tới hết rồi mới tới process sau.',
            'Context switch lưu ngữ cảnh (program counter, thanh ghi — trong PCB) của process cũ, nạp của process '
            'mới. Lúc đó không ai làm việc: đó là overhead.',
            'Thời gian chờ = lúc hoàn thành − burst (mọi job đến lúc 0). deque.popleft() lấy đầu hàng nhanh; '
            'list.pop(0) như ví dụ cũng đúng.',
        ],
        theory=[
            dict(h='Scheduler chọn ai chạy, và bao lâu',
                 body='Scheduler trả lời hai câu: chạy process nào tiếp theo, và cho nó chạy bao lâu. Nó dựa vào trạng '
                      'thái và số liệu thống kê của từng process rồi chọn theo độ ưu tiên.',
                 bullets=['Preemption: hệ điều hành CƯỠNG BỨC dừng process đang chạy (Round Robin)',
                          'Non-preemption: process tự nguyện nhường CPU',
                          'CPU-bound chủ yếu tính toán; I/O-bound chủ yếu chờ đĩa, mạng, máy in']),
            # KHÔNG gắn P03-round-robin vào đây: hình vẽ P3 cần 2 đơn vị (P3 xong ở
            # t=6, P2 t=9, P1 t=10), còn bài dùng ("P3", 1) nên lịch thật là
            # P1 0–2, P2 2–4, P3 4–5, P1 5–7, P2 7–8, P1 8–9 và đáp án câu dự
            # đoán ngay bên dưới là "P3, lúc 5". Gắn vào là đặt một hình phản
            # chứng ngay TRƯỚC câu hỏi. Vẽ lại hình cho khớp ("P3", 1) rồi mới
            # gắn — xem scripts/pe-v4/anim/ALLOW_ORPHAN.
            dict(h='Đổi trạng thái là chuyển hàng đợi',
                 body='Process xếp theo hàng đợi: job queue (vừa vào, còn trên đĩa), ready queue (ở bộ nhớ chính, chờ '
                      'CPU), device queue (chờ thiết bị I/O) — đổi trạng thái là chuyển hàng. FCFS và SJF không '
                      'preempt; SRTF và Round Robin có.'),
            dict(h='Phản hồi nhanh thì switch nhiều',
                 bullets=['Vì sao máy chạy hàng trăm process trên vài lõi mà giao diện vẫn mượt',
                          'Chọn quantum: nhỏ thì phản hồi nhanh nhưng tốn nhiều lần switch',
                          'round_robin của bài là MÔ PHỎNG, không đụng scheduler thật của máy']),
            dict(h='Overhead: không ai làm được việc gì', figure='P03-context-switch',
                 body='Hai cột ngoài là hai process, cột giữa là hệ điều hành: có interrupt thì CPU lưu ngữ cảnh A vào '
                      'PCB0, nạp ngữ cảnh B từ PCB1, rồi B mới chạy. Khoảng tô đậm nhãn "overhead" là lúc không '
                      'process nào làm được việc của mình.'),
        ],
        figure=[dict(name='P03-context-switch',
                     caption='Context switch: lưu PCB của process cũ, nạp PCB của process mới',
                     alt='Process A chạy, có interrupt, hệ điều hành lưu PCB0 rồi nạp PCB1, sau đó process B chạy; '
                         'khoảng giữa ghi nhãn overhead'),
        ],
        slides='SL 30-43',
        predict=dict(q='jobs = [("P1", 5), ("P2", 3), ("P3", 1)], quantum = 2. Process nào XONG ĐẦU TIÊN?', options=[
            ('P3, lúc 5 — nó chỉ cần 1 đơn vị, tới lượt ở lần thứ ba', 'P1 0–2, P2 2–4, P3 4–5: P3 xong ngay trong lượt đầu của nó.', True),
            ('P1 — nó đứng đầu hàng', 'Đứng đầu chỉ được chạy trước 2 đơn vị rồi bị ngắt.', False),
            ('P2', 'P2 cần 3 > quantum nên lượt đầu chưa xong.', False),
        ]),
        myth=('"Hết quantum thì process vẫn chạy tiếp tới xong"',
              'Đó là FCFS (non-preemptive). Round Robin là preemptive: hết time slice, scheduler NGẮT process, lưu '
              'ngữ cảnh và đưa nó về cuối hàng ready. Ngộ nhận thứ hai: context switch "miễn phí" — mỗi lần đổi '
              'process tốn thời gian lưu/nạp PCB mà không làm việc của ứng dụng, nên quantum quá nhỏ làm mọi job xong muộn hơn.'),
        mcq=[
            dict(q='Concurrency có bắt buộc CPU nhiều lõi không?', options=[
                ('Không — một lõi xen kẽ các tác vụ cũng tạo concurrency; nhiều lõi mới chạy song song thật',
                 'Concurrency là cùng tiến triển; parallelism là cùng chạy một lúc.', True),
                ('Có', 'Một lõi + time slice vẫn cho nhiều tác vụ cùng tiến triển.', False),
                ('Có, ít nhất bằng số process', 'Hệ điều hành chạy hàng trăm process trên vài lõi.', False),
            ]),
            dict(q='Trong lúc context switch, CPU đang làm gì?', options=[
                ('Lưu ngữ cảnh process cũ, nạp ngữ cảnh process mới (PCB) — không chạy code ứng dụng',
                 'Vì thế switch là overhead.', True),
                ('Chạy tiếp process cũ', 'Process cũ vừa bị ngắt.', False),
                ('Chạy cả hai process cùng lúc', 'Một lõi chỉ chạy một luồng lệnh tại một thời điểm.', False),
            ]),
            dict(q='Process phần lớn thời gian chờ đĩa/mạng gọi là gì?', options=[
                ('I/O-bound', 'Nó nằm trong waiting nhiều hơn running.', True),
                ('CPU-bound', 'CPU-bound chủ yếu tính toán.', False),
                ('Preemptive', 'Preemptive là kiểu scheduler, không phải kiểu process.', False),
            ]),
        ],
        why=dict(
            prompt='Khi switch > 0, vì sao giảm quantum làm các job xong MUỘN hơn?',
            sample='Quantum nhỏ cắt mỗi job thành nhiều lượt hơn nên CPU đổi process nhiều lần hơn; mỗi lần đổi tốn '
                   'switch đơn vị không làm việc của ai. Tổng burst giữ nguyên nhưng cộng thêm nhiều overhead, nên lúc '
                   'hoàn thành và thời gian chờ đều tăng. Trường hợp đặc biệt: chỉ còn một process thì nó chạy các '
                   'lượt liền nhau, không tốn switch.'),
        scaffold=dict(
            intro='Lắp ba chỗ của vòng Round Robin.',
            template=r'''from collections import deque


def round_robin(jobs, quantum, switch=0):
    if quantum <= 0:
        raise ValueError("quantum must be positive")
    ready = deque(jobs)
    clock = 0
    last = None
    timeline = []
    while ready:
        name, left = ready.popleft()
        if last is not None and name != last:
            {{slot1}}
        run = {{slot2}}
        timeline.append((name, clock, clock + run))
        clock += run
        last = name
        if left > run:
            {{slot3}}
    return timeline
''',
            slots=['clock += switch', 'min(quantum, left)', 'ready.append((name, left - run))'],
            traps=[('clock += 1', 1, 'Chi phí switch là tham số, không cố định 1.'),
                   ('left', 2, 'Chạy tới hết — thành FCFS, không còn preemptive.'),
                   ('ready.appendleft((name, left - run))', 3, 'Về ĐẦU hàng: process vừa bị ngắt lại chạy tiếp, process khác phải chờ mãi.')]),
        flow=['ready.popleft() → lấy process đầu hàng ready',
              'đổi sang process khác → clock += switch (overhead)',
              'run = min(quantum, left) → chạy tối đa một time slice',
              'left > run → về cuối hàng với phần còn lại left - run'],
        transfer='Thử quantum lớn hơn mọi burst (thành FCFS), quantum = 1, và switch = 1 khi một process phải chạy '
                 'hai lượt liền nhau ở cuối.',
        counter=dict(q='[("A", 4), ("B", 4)], quantum = 4: timeline là?',
                     options=['A 0–4, B 4–8', 'A 0–2, B 2–4, A 4–6, B 6–8', 'B 0–4, A 4–8'], correct='A 0–4, B 4–8'),
        practice='Hàng ready là deque các cặp (tên, phần còn lại). Mỗi lượt: popleft, cộng switch nếu đổi process, '
                 'chạy min(quantum, phần còn lại), chưa xong thì append về cuối.',
        steps=['quantum <= 0 → raise ValueError trước khi chạy.',
               'ready = deque(jobs) (bản sao, không sửa jobs); clock = 0; last = None; timeline = [].',
               'Trong while ready: popleft; last khác None và khác tên hiện tại → clock += switch.',
               'run = min(quantum, left); ghi (tên, clock, clock + run); clock += run; còn dư thì append về cuối.',
               'waiting_times: lúc hoàn thành = kết thúc của lát CUỐI mang tên đó; chờ = hoàn thành − burst.'],
        partial=r'''    while ready:
        name, left = ready.popleft()
        ...
        run = min(quantum, left)
        timeline.append((name, clock, clock + run))''',
        io=[('round_robin([("P1", 5), ("P2", 3), ("P3", 1)], 2)', 'P1 0–2, P2 2–4, P3 4–5, P1 5–7, P2 7–8, P1 8–9'),
            ('round_robin([("P1", 3), ("P2", 2)], 2, switch=1)', 'P1 0–2, P2 3–5, P1 6–7'),
            ('round_robin([("A", 1)], 0)', 'ValueError')],
        contracts=[
            dict(sig='round_robin(jobs, quantum, switch=0)', does='Mô phỏng Round Robin trên một lõi.',
                 takes='jobs: list (tên, burst > 0); quantum: int > 0; switch: int >= 0',
                 gives='list (tên, bắt đầu, kết thúc) theo thứ tự chạy; quantum <= 0 → ValueError',
                 effect='Không sửa jobs, không in.', call='round_robin([("A", 4), ("B", 4)], 4) → [("A", 0, 4), ("B", 4, 8)]'),
            dict(sig='waiting_times(jobs, timeline)', does='Thời gian chờ của từng job.',
                 takes='jobs như trên; timeline do round_robin trả', gives='dict tên → lúc hoàn thành − burst',
                 effect='Không in.', call='waiting_times(jobs, round_robin(jobs, 2)) → {"P1": 4, ...}'),
        ],
        starter=P03_STARTER,
        solution=P03_SOLUTION,
        tests=[
            T('Ví dụ đề: quantum = 2', 'round_robin([("P1", 5), ("P2", 3), ("P3", 1)], 2)',
              [('P1', 0, 2), ('P2', 2, 4), ('P3', 4, 5), ('P1', 5, 7), ('P2', 7, 8), ('P1', 8, 9)]),
            T('quantum ≥ burst → như FCFS', 'round_robin([("A", 4), ("B", 4)], 4)', [('A', 0, 4), ('B', 4, 8)]),
            T('quantum = 1, ba job', 'round_robin([("X", 2), ("Y", 1), ("Z", 2)], 1)',
              [('X', 0, 1), ('Y', 1, 2), ('Z', 2, 3), ('X', 3, 4), ('Z', 4, 5)]),
            T('switch = 1 mỗi lần đổi process', 'round_robin([("P1", 3), ("P2", 2)], 2, switch=1)',
              [('P1', 0, 2), ('P2', 3, 5), ('P1', 6, 7)]),
            T('Cùng một process chạy liền hai lượt: không tốn switch', 'round_robin([("P1", 5), ("P2", 1)], 2, switch=1)',
              [('P1', 0, 2), ('P2', 3, 4), ('P1', 5, 7), ('P1', 7, 8)]),
            T('Thời gian chờ (ví dụ đề)',
              'waiting_times([("P1", 5), ("P2", 3), ("P3", 1)], round_robin([("P1", 5), ("P2", 3), ("P3", 1)], 2))',
              {'P1': 4, 'P2': 5, 'P3': 4}),
            T('Thời gian chờ tính cả overhead switch',
              'waiting_times([("P1", 3), ("P2", 2)], round_robin([("P1", 3), ("P2", 2)], 2, switch=1))',
              {'P1': 4, 'P2': 3}),
            T('Không có job → []', 'round_robin([], 3)', []),
            TX('quantum <= 0 → ValueError', '[_studio.call(round_robin, [("A", 1)], q).error for q in (0, -2)]',
               "['ValueError', 'ValueError']"),
            TX('Không sửa list jobs',
               "_studio.check('j = [(\"A\", 3), (\"B\", 1)]\\nround_robin(j, 1)\\n"
               "assert j == [(\"A\", 3), (\"B\", 1)], \"round_robin không được sửa jobs\"')", 'True'),
        ],
        bad=[('không ngắt khi hết quantum (thành FCFS)',
              P03_SOLUTION.replace('        run = min(quantum, left)\n', '        run = left\n')),
             ('coi context switch là miễn phí',
              P03_SOLUTION.replace('        if last is not None and name != last:\n            clock += switch\n', '')),
             ('nhầm thời gian chờ với lúc hoàn thành',
              P03_SOLUTION.replace('finish[name] - burst for', 'finish[name] for'))],
    ),

    # ------------------------------------------------------------------ P04
    dict(
        code='P04', title='stdin, stdout, stderr và pipe', minutes=35,
        goal='Phân biệt stdin, stdout, stderr và nối chúng với process con qua pipe.',
        prereq='P03', support=['sum_numbers.py'], env=SUBPROCESS_ENV,
        brief='Hai phía của một process. (1) read_scores(): đọc HẾT các dòng từ stdin (sys.stdin); dòng rỗng bỏ qua, '
              'dòng là số nguyên thì giữ (int), dòng khác thì in "skip: <dòng đã strip>" ra STDERR — không ra stdout; '
              'trả list số. (2) run_sum(lines): chạy sum_numbers.py (đã cấp) làm process con bằng [sys.executable, '
              '"sum_numbers.py"], đưa các dòng vào stdin của con qua input= (mỗi dòng kết thúc bằng "\\n"), thu riêng '
              'stdout và stderr dạng chuỗi; trả (tổng: int, list các dòng cảnh báo).',
        example='stdin 5 / abc / -2 → read_scores() trả [5, -2] và stderr nhận "skip: abc". '
                'run_sum(["10", "x", "20"]) → (30, ["skip: x"]).',
        demo=r'''import subprocess
import sys

program = "import sys; print(5, flush=True); print('warn', file=sys.stderr)"
r = subprocess.run([sys.executable, "-c", program],
                   capture_output=True, text=True)
print("stdout:", repr(r.stdout))
print("stderr:", repr(r.stderr))

merged = subprocess.run([sys.executable, "-c", program],
                        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
print("gộp:", repr(merged.stdout))
''',
        explain=[
            'Mỗi process có ba luồng chuẩn: stdin (fd 0) — đầu vào, stdout (fd 1) — kết quả, stderr (fd 2) — báo '
            'lỗi. Trên terminal chúng trông lẫn vào nhau nhưng là ba luồng riêng.',
            'input() và sys.stdin đọc fd 0; print(x) ghi stdout; print(x, file=sys.stderr) ghi stderr.',
            'for line in sys.stdin đọc tới hết dữ liệu (EOF); mỗi dòng còn "\\n" ở cuối nên phải strip().',
            'Shell: < file làm stdin, > file nhận stdout, a | b nối stdout của a vào stdin của b bằng một pipe.',
            'subprocess: input= đưa chuỗi vào stdin của con; capture_output=True tạo hai PIPE riêng; '
            'stderr=subprocess.STDOUT mới gộp. Thiếu text=True thì nhận bytes.',
        ],
        theory=[
            dict(h='Trông như một, thật ra ba đường riêng',
                 body='Mỗi process khi khởi động đã có sẵn ba luồng, mang đúng ba file descriptor đầu tiên. Mặc định '
                      'cả ba nối với terminal nên trông như một, nhưng là ba đường riêng, đổi đích được độc lập.',
                 bullets=['stdin (0): đầu vào — input() và sys.stdin đọc từ đây',
                          'stdout (1): KẾT QUẢ — print(x) ghi vào đây',
                          'stderr (2): báo lỗi và cảnh báo — print(x, file=sys.stderr)']),
            dict(h='Pipe nối stdout vào stdin bên kia',
                 body='bc < input.txt đổi stdin sang file; ls -la > out.txt đổi stdout sang file mà stderr vẫn ra màn '
                      'hình. ps aux | grep term nối stdout của process 1 vào stdin của process 2 qua một pipe.'),
            dict(h='Log lỗi không trộn vào dữ liệu',
                 bullets=['Pipeline shell và CI: mỗi công cụ đọc stdin, ghi ra stdout nên ghép được',
                          'Giữ stderr riêng để log lỗi không trộn vào dữ liệu chuyển cho bước sau',
                          'Studio không có shell nên không viết được | hay >; nó mô phỏng ba luồng']),
            dict(h='stderr tách riêng dù stdout đã sang file', figure='P04-io-redirection',
                 body='Hộp giữa là process: mũi tên vào là stdin (0), hai mũi tên ra là stdout (1) và stderr (2) — '
                      'stderr luôn tách riêng, kể cả khi stdout đã đổi sang file. Phần dưới là biến thể pipe: dữ liệu '
                      'chảy qua bộ nhớ, không qua đĩa.'),
        ],
        figure=dict(name='P04-io-redirection',
                    caption='stdin/stdout/stderr: từ terminal, sang file, rồi thành pipe giữa hai process',
                    alt='Hộp process với stdin 0 vào, stdout 1 và stderr 2 ra; các biến thể nối tới bàn phím, màn '
                        'hình, file và một pipe nối hai process'),
        slides='SL 44-48',
        predict=dict(q='Con chạy print(5) rồi print("warn", file=sys.stderr). Với capture_output=True, text=True, '
                       'r.stdout là gì?', options=[
            ('"5\\n" — "warn" nằm riêng trong r.stderr', 'Hai luồng được thu bằng hai pipe khác nhau.', True),
            ('"5\\nwarn\\n"', 'Chỉ gộp khi đặt stderr=subprocess.STDOUT.', False),
            ('b"5\\n"', 'text=True đã đổi bytes thành str.', False),
        ]),
        myth=('"stderr cũng là stdout, in đâu cũng được"',
              'stderr là luồng RIÊNG (fd 2). In cảnh báo ra stdout làm hỏng kết quả: chương trình đọc stdout của bạn '
              '(qua pipe, > out.txt, hay r.stdout) sẽ nhận cả "skip: abc" lẫn con số. Chỉ khi cấu hình gộp — 2>&1 '
              'trong shell, stderr=subprocess.STDOUT trong Python — hai luồng mới đi chung một đường.'),
        mcq=[
            dict(q='Lệnh shell ps aux | grep term làm gì với stdout của ps?', options=[
                ('Nối nó vào stdin của grep qua một pipe', '| là pipe giữa hai process.', True),
                ('Ghi vào file tên grep', 'Ghi ra file là >.', False),
                ('Gộp vào stderr', 'Pipe không đụng tới stderr.', False),
            ]),
            dict(q='subprocess.run(..., capture_output=True) KHÔNG có text=True. r.stdout có kiểu gì?', options=[
                ('bytes', 'Mặc định dữ liệu qua pipe là bytes; text=True (hoặc encoding=) mới cho str.', True),
                ('str', 'Cần text=True.', False),
                ('list các dòng', 'Muốn list thì tự splitlines().', False),
            ]),
            dict(q='for line in sys.stdin dừng khi nào?', options=[
                ('Khi hết dữ liệu (EOF): input= đã đọc hết, hoặc Ctrl+D (Linux) / Ctrl+Z rồi Enter (Windows)',
                 'Dòng rỗng giữa chừng vẫn là một dòng "\\n", không làm dừng vòng lặp.', True),
                ('Ở dòng rỗng đầu tiên', 'Dòng rỗng vẫn là một dòng.', False),
                ('Sau đúng một dòng', 'Vòng for đọc tới EOF.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao "skip: abc" phải ra stderr chứ không ra stdout?',
            sample='stdout là KẾT QUẢ mà bên khác đọc tiếp (qua pipe, > file, hay r.stdout trong subprocess). Nếu cảnh '
                   'báo lẫn vào stdout, bên đọc gặp "skip: abc" thay vì con số và int() báo lỗi. Đặt cảnh báo ở stderr '
                   'giữ stdout sạch mà người dùng vẫn thấy cảnh báo. Trường hợp đặc biệt: không có dòng hỏng thì stderr rỗng.'),
        scaffold=dict(
            intro='Lắp chỗ in cảnh báo và hai tham số của subprocess.run.',
            template=r'''def read_scores():
    scores = []
    for line in sys.stdin:
        text = line.strip()
        if text == "":
            continue
        try:
            scores.append(int(text))
        except ValueError:
            {{slot1}}
    return scores


def run_sum(lines):
    data = "".join(line + "\n" for line in lines)
    result = subprocess.run([sys.executable, "sum_numbers.py"],
                            {{slot2}}, capture_output=True, {{slot3}})
    return int(result.stdout), result.stderr.splitlines()
''',
            slots=['print("skip:", text, file=sys.stderr)', 'input=data', 'text=True'],
            traps=[('print("skip:", text)', 1, 'Ra stdout — lẫn vào kết quả.'),
                   ('stdin=data', 2, 'stdin= nhận PIPE hoặc file object; chuỗi phải đi qua input=.'),
                   ('stderr=subprocess.STDOUT', 3, 'Không dùng chung với capture_output — và gộp thì int() gặp chữ.')]),
        flow=['input=data → các dòng đi vào stdin (fd 0) của con',
              'con print(total) → con số đi vào pipe stdout',
              'con print("skip: x", file=sys.stderr) → đi vào pipe stderr riêng',
              'text=True → r.stdout và r.stderr là str, không phải bytes'],
        transfer='Thử list rỗng, toàn dòng hỏng, số âm và dòng có khoảng trắng hai đầu; kiểm stdout chỉ chứa con số.',
        counter=dict(q='run_sum(["4", "", "y", "6"]) trả gì?',
                     options=['(10, ["skip: y"])', '(10, [])', '(4, ["skip: y"])'], correct='(10, ["skip: y"])'),
        practice='Phía con: đọc sys.stdin, cảnh báo ra sys.stderr. Phía cha: input= đưa dữ liệu vào, '
                 'capture_output=True tách hai pipe, text=True để có str.',
        steps=['read_scores: for line in sys.stdin; text = line.strip(); bỏ dòng rỗng.',
               'int(text) trong try; ValueError → print("skip:", text, file=sys.stderr).',
               'run_sum: data = mỗi dòng + "\\n"; subprocess.run([sys.executable, "sum_numbers.py"], input=data, '
               'capture_output=True, text=True).',
               'Trả int(result.stdout) và result.stderr.splitlines().'],
        partial=r'''        except ValueError:
            print("skip:", text, file=sys.stderr)
    ...''',
        io=[('stdin: 5 / abc / -2', 'read_scores() → [5, -2]; stderr: skip: abc'),
            ('run_sum(["10", "x", "20"])', '(30, ["skip: x"])'),
            ('run_sum([])', '(0, [])')],
        contracts=[
            dict(sig='read_scores()', does='Đọc số nguyên từ stdin của chính process.',
                 takes='không (đọc sys.stdin tới EOF)', gives='list[int]',
                 effect='Dòng không phải số → "skip: <dòng>" ra stderr; stdout không in gì.',
                 call='stdin "5\\nabc\\n" → [5], stderr "skip: abc"'),
            dict(sig='run_sum(lines)', does='Chạy sum_numbers.py làm process con và đọc kết quả.',
                 takes='lines: list[str] — mỗi phần tử một dòng', gives='tuple (int tổng, list[str] cảnh báo)',
                 effect='Lệnh con: [sys.executable, "sum_numbers.py"]; dữ liệu qua input=.',
                 call='run_sum(["10", "x", "20"]) → (30, ["skip: x"])'),
        ],
        starter=P04_STARTER,
        solution=P04_SOLUTION,
        tests=[
            T('stdin 7, 8 → [7, 8]', "_studio.run(stdin=['7', '8'], entry='read_scores()').value", [7, 8]),
            T('Bỏ dòng rỗng, giữ số âm, strip khoảng trắng',
              "_studio.run(stdin=['5', '', ' -2 ', '40'], entry='read_scores()').value", [5, -2, 40]),
            T('Cảnh báo ra stderr, stdout sạch',
              f"(lambda r: (r.ns['_got'], r.ns['_err'].getvalue(), r.stdout))"
              f"(_studio.run(stdin=['5', 'abc', '3.5'], entry={P04_STDERR_ENTRY!r}))",
              ([5], 'skip: abc\nskip: 3.5\n', '')),
            T('stdin rỗng → []', "_studio.run(stdin=[], entry='read_scores()').value", []),
            T('run_sum: 10, x, 20', 'run_sum(["10", "x", "20"])', (30, ['skip: x'])),
            T('run_sum: số âm, nhiều dòng hỏng, dòng rỗng', 'run_sum(["-4", "a", "b", "9", ""])', (5, ['skip: a', 'skip: b'])),
            T('run_sum([]) → (0, [])', 'run_sum([])', (0, [])),
            TX('Lệnh con là list [sys.executable, "sum_numbers.py"]',
               '[list(c["args"]) for c in _studio.call(run_sum, ["1"]).subprocess_calls]',
               '[[__import__("sys").executable, "sum_numbers.py"]]'),
        ],
        bad=[('cảnh báo in ra stdout',
              P04_SOLUTION.replace('print("skip:", text, file=sys.stderr)', 'print("skip:", text)')),
             ('quên text=True',
              P04_SOLUTION.replace('input=data, capture_output=True, text=True)', 'input=data, capture_output=True)')),
             ('gộp stderr vào stdout',
              P04_SOLUTION.replace('input=data, capture_output=True, text=True)',
                                   'input=data, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)'))],
    ),

    # ------------------------------------------------------------------ P05
    dict(
        code='P05', title='subprocess.run và kết quả', minutes=40,
        goal='Chạy process con bằng subprocess.run và đọc đúng returncode, stdout, lỗi và timeout.',
        prereq='P04', env=SUBPROCESS_ENV,
        brief='Viết ba hàm, mỗi hàm chạy code Python trong một process con bằng [sys.executable, "-c", code]. '
              'exit_code(code) trả exit code (int) của con. output_of(code) trả stdout của con dạng str bằng '
              'subprocess.check_output (con thoát mã khác 0 thì để CalledProcessError bay ra). grade(code, expected, '
              'limit=2) là máy chấm mini: chạy con với capture_output=True, text=True, timeout=limit — quá giờ trả '
              '"TIMEOUT"; exit code khác 0 trả "ERROR <mã>"; stdout bỏ khoảng trắng hai đầu bằng expected trả "PASS"; '
              'còn lại "FAIL".',
        example='grade("print(2+3)", "5") → "PASS"; grade("raise SystemExit(2)", "") → "ERROR 2"; '
                'output_of("print(7)") → "7\\n"; exit_code("pass") → 0.',
        demo=r'''import subprocess
import sys

result = subprocess.run([sys.executable, "-c", "print(2+3)"],
                        capture_output=True, text=True, check=True)
print(repr(result.stdout), result.returncode)

try:
    subprocess.run([sys.executable, "-c", "raise SystemExit(2)"], check=True)
except subprocess.CalledProcessError as error:
    print("exit code:", error.returncode)

print(repr(subprocess.check_output([sys.executable, "-c", "print('hi')"], text=True)))
''',
        explain=[
            'subprocess.run(args, ...) chạy con và CHỜ nó xong, trả CompletedProcess có returncode, stdout, stderr.',
            'args là LIST: phần tử đầu là chương trình — sys.executable là đúng Python đang chạy, không phụ thuộc '
            '"python" trên PATH — rồi tới từng đối số.',
            'Mặc định con in thẳng ra màn hình và result.stdout là None. capture_output=True mới thu; text=True để '
            'nhận str thay vì bytes.',
            'Exit code khác 0 KHÔNG tự thành exception: tự kiểm returncode, hoặc check=True để nhận '
            'CalledProcessError (có .returncode). timeout= quá giờ → TimeoutExpired.',
            'check_output(args, text=True) trả STDOUT của con, không phải exit code, và tự check: mã khác 0 → '
            'CalledProcessError.',
        ],
        theory=[
            dict(h='run() chặn cha tới khi con xong',
                 body='Gọi run(args) là cha dừng lại tới khi con kết thúc, rồi nhận về một CompletedProcess. Đây là '
                      'cách đơn giản nhất để chạy một chương trình khác từ trong Python.',
                 bullets=['args là LIST: phần tử đầu là chương trình, các phần sau là từng đối số',
                          'CompletedProcess mang returncode, stdout, stderr; capture_output=True mới thu',
                          'check=True biến exit code khác 0 thành CalledProcessError; timeout= đặt hạn chờ']),
            dict(h='Traceback nằm ở stderr, cha chỉ nhận số',
                 body='Quy ước: 0 là thành công, khác 0 là có chuyện — Python thoát mã n khi gặp SystemExit(n) và mã 1 '
                      'khi có ngoại lệ không bắt. Cha chỉ nhận con số đó, còn traceback nằm trong stderr của con.'),
            dict(h='Quá timeout, run() tự kill con',
                 bullets=['Gọi công cụ ngoài: git, ffmpeg, hay chính Python qua sys.executable',
                          'timeout= chặn lặp vô hạn — run() tự kill con rồi mới ném TimeoutExpired',
                          'Studio mô phỏng subprocess; sleep của con chỉ đẩy đồng hồ ảo']),
            dict(h='Nét đứt là lúc cha bị chặn', figure='P05-run-timeline',
                 body='Cha ở đường trên, con ở đường dưới. Lúc gọi run(), đường của cha chuyển sang nét đứt — cha bị '
                      'CHẶN; khi con exit, mũi tên quay lên mang hộp CompletedProcess rồi cha mới chạy tiếp.'),
        ],
        figure=dict(name='P05-run-timeline',
                    caption='run() chặn process cha cho tới khi con xong và trả CompletedProcess',
                    alt='Đường thời gian: cha bị chặn trong khi con chạy; con exit thì cha nhận CompletedProcess gồm '
                        'returncode, stdout, stderr'),
        slides='SL 51-53; DOC subprocess',
        predict=dict(q='subprocess.check_output([sys.executable, "-c", "print(1)"], text=True) trả về gì?', options=[
            ('"1\\n" — stdout của con', 'check_output trả đầu ra; exit code nằm ở run().returncode hoặc trong exception.', True),
            ('0 — exit code', 'Đó là ngộ nhận phổ biến nhất về check_output.', False),
            ('Một CompletedProcess', 'Đó là kiểu trả về của run().', False),
        ]),
        myth=('"check_output trả exit code"',
              'check_output trả STDOUT của con. Viết if subprocess.check_output(...) == 0 là so chuỗi/bytes với 0 — '
              'luôn False; còn khi con thoát mã khác 0, check_output ném CalledProcessError chứ không trả mã. Lấy exit '
              'code bằng run(...).returncode, hoặc error.returncode trong except. Ngộ nhận anh em: tưởng exit code '
              'khác 0 tự thành lỗi — run() không ném gì nếu thiếu check=True.'),
        mcq=[
            dict(q='subprocess.run([sys.executable, "-c", "raise SystemExit(3)"]) (không có check) thì…', options=[
                ('Trả CompletedProcess với returncode = 3, không ném lỗi', 'Chỉ check=True mới biến mã khác 0 thành CalledProcessError.', True),
                ('Ném CalledProcessError', 'Cần check=True.', False),
                ('Ném SystemExit trong process cha', 'SystemExit xảy ra trong process CON; cha chỉ thấy exit code.', False),
            ]),
            dict(q='Vì sao viết [sys.executable, "-c", code] thay vì chuỗi "python -c " + code?', options=[
                ('List giao từng đối số nguyên vẹn, không cần shell tách chuỗi; sys.executable chắc chắn là Python đang chạy',
                 'Chuỗi không có shell=True bị coi là TÊN chương trình trên Linux; "python" có thể là bản khác, hoặc stub của Microsoft Store trên Windows.', True),
                ('Chuỗi chạy chậm hơn', 'Không phải chuyện tốc độ.', False),
                ('Hai cách như nhau', 'Code có dấu cách hay dấu ngoặc kép sẽ bị tách sai.', False),
            ]),
            dict(q='Con chạy 1/0 (không bắt lỗi). returncode là?', options=[
                ('1 — ngoại lệ không bắt làm Python thoát mã 1, traceback ra stderr', 'Traceback nằm trong result.stderr nếu có capture.', True),
                ('0', 'Có lỗi thì không phải 0.', False),
                ('ZeroDivisionError', 'Cha không nhận object exception của con, chỉ nhận mã thoát.', False),
            ]),
        ],
        why=dict(
            prompt='grade kiểm returncode TRƯỚC khi so stdout. Vì sao?',
            sample='Con có thể in đúng "5" rồi mới gặp lỗi và thoát mã khác 0 — chỉ so stdout sẽ chấm PASS một chương '
                   'trình hỏng. Exit code là tín hiệu thành công/thất bại chính thức của process; chỉ khi nó bằng 0 mới '
                   'so đầu ra. Trường hợp đặc biệt: chạy quá limit thì không có exit code bình thường, trả TIMEOUT.'),
        scaffold=dict(
            intro='Lắp máy chấm mini.',
            template=r'''def grade(code, expected, limit=2):
    try:
        result = subprocess.run([sys.executable, "-c", code],
                                capture_output=True, text=True, {{slot1}})
    except {{slot2}}:
        return "TIMEOUT"
    if {{slot3}}:
        return f"ERROR {result.returncode}"
    if result.stdout.strip() == expected:
        return "PASS"
    return "FAIL"
''',
            slots=['timeout=limit', 'subprocess.TimeoutExpired', 'result.returncode != 0'],
            traps=[('check=True', 1, 'Mã khác 0 thành CalledProcessError — không ai bắt, và mất timeout.'),
                   ('subprocess.CalledProcessError', 2, 'Không có check=True thì run() không ném lỗi này; quá giờ là TimeoutExpired.'),
                   ('result.stderr', 3, 'Có chữ trong stderr chưa chắc là lỗi; tín hiệu chính thức là returncode.')]),
        flow=['run([sys.executable, "-c", code]) → cha chờ con kết thúc',
              'quá limit giây → TimeoutExpired → "TIMEOUT"',
              'returncode != 0 → "ERROR <mã>"',
              'stdout.strip() == expected → "PASS", khác thì "FAIL"'],
        transfer='Thử code in nhiều dòng, code in đúng rồi mới thoát mã 3, và code ngủ time.sleep(5) với limit = 1.',
        counter=dict(q='grade("print(5); raise SystemExit(3)", "5") trả gì?', options=['ERROR 3', 'PASS', 'FAIL'],
                     correct='ERROR 3'),
        practice='Một lần run() là đủ cho grade: capture_output=True, text=True, timeout=limit. Bắt TimeoutExpired, '
                 'rồi kiểm returncode, cuối cùng mới so stdout.',
        steps=['exit_code: return subprocess.run([sys.executable, "-c", code]).returncode.',
               'output_of: return subprocess.check_output([sys.executable, "-c", code], text=True).',
               'grade: try run(..., capture_output=True, text=True, timeout=limit); except subprocess.TimeoutExpired → "TIMEOUT".',
               'returncode != 0 → f"ERROR {result.returncode}"; stdout.strip() == expected → "PASS"; còn lại "FAIL".'],
        partial=r'''def exit_code(code):
    return subprocess.run([sys.executable, "-c", code]).returncode
...''',
        io=[('grade("print(2+3)", "5")', '"PASS"'),
            ('grade("raise SystemExit(2)", "")', '"ERROR 2"'),
            ('grade("import time; time.sleep(5)", "", 1)', '"TIMEOUT"')],
        contracts=[
            dict(sig='exit_code(code)', does='Exit code của process con chạy code.', takes='code: str',
                 gives='int', effect='Con in thẳng ra màn hình (không thu).', call='exit_code("raise SystemExit(4)") → 4'),
            dict(sig='output_of(code)', does='stdout của process con.', takes='code: str',
                 gives='str; con thoát mã khác 0 → CalledProcessError', effect='Dùng subprocess.check_output(..., text=True).',
                 call='output_of("print(6 * 7)") → "42\\n"'),
            dict(sig='grade(code, expected, limit=2)', does='Máy chấm mini: chạy con, so đầu ra.',
                 takes='code, expected: str; limit: giây', gives='"TIMEOUT" | "ERROR <mã>" | "PASS" | "FAIL"',
                 effect='Một lần subprocess.run(capture_output=True, text=True, timeout=limit).',
                 call='grade("print(2+3)", "5") → "PASS"'),
        ],
        starter=P05_STARTER,
        solution=P05_SOLUTION,
        tests=[
            T('exit_code("pass") → 0', 'exit_code("pass")', 0),
            T('exit_code: SystemExit(4) → 4, 1/0 → 1', '(exit_code("raise SystemExit(4)"), exit_code("1/0"))', (4, 1)),
            T('output_of trả stdout (str)', 'output_of("print(6 * 7)")', '42\n'),
            T('output_of: nhiều dòng', 'output_of("for i in range(3): print(i)")', '0\n1\n2\n'),
            T('output_of: con thoát mã 5 → CalledProcessError',
              '_studio.call(output_of, "raise SystemExit(5)").error', 'CalledProcessError'),
            T('grade: PASS và FAIL', '(grade("print(2+3)", "5"), grade("print(6)", "5"))', ('PASS', 'FAIL')),
            T('grade: in đúng rồi thoát mã 3 → ERROR 3', 'grade("print(5); raise SystemExit(3)", "5")', 'ERROR 3'),
            T('grade: ngoại lệ trong con → ERROR 1', 'grade("1/0", "x")', 'ERROR 1'),
            T('grade: quá giờ → TIMEOUT', 'grade("import time; time.sleep(5)", "", 1)', 'TIMEOUT'),
            T('grade: ngủ ít hơn limit mặc định vẫn chấm', 'grade("import time; time.sleep(1); print(\'ok\')", "ok")', 'PASS'),
            T('grade: nhiều dòng, chỉ bỏ khoảng trắng hai đầu', 'grade("print(1); print(2)", "1\\n2")', 'PASS'),
            TX('Lệnh con là list [sys.executable, "-c", code], không phải chuỗi',
               '(lambda a: (isinstance(a, (list, tuple)), list(a)))'
               '(_studio.call(exit_code, "raise SystemExit(4)").subprocess_calls[0]["args"])',
               '(True, [__import__("sys").executable, "-c", "raise SystemExit(4)"])'),
        ],
        bad=[('check_output tưởng trả exit code',
              P05_SOLUTION.replace('    return subprocess.run([sys.executable, "-c", code]).returncode\n',
                                   '    return subprocess.check_output([sys.executable, "-c", code])\n')),
             ('ghép lệnh thành một chuỗi thay vì list',
              P05_SOLUTION.replace('    return subprocess.run([sys.executable, "-c", code]).returncode\n',
                                   '    return subprocess.run(sys.executable + " -c " + code).returncode\n')),
             ('quên text=True',
              P05_SOLUTION.replace('capture_output=True, text=True, timeout=limit)', 'capture_output=True, timeout=limit)')),
             ('đoán lỗi qua stdout thay vì returncode',
              P05_SOLUTION.replace('    if result.returncode != 0:\n', '    if result.stdout == "":\n'))],
    ),

    # ------------------------------------------------------------------ P06
    dict(
        code='P06', title='Popen, communicate và timeout', minutes=40,
        goal='Điều khiển process con bằng Popen: gửi input, chờ có giới hạn và dọn dẹp khi quá giờ.',
        prereq='P05', env=SUBPROCESS_ENV,
        brief='Viết talk(code, data, limit=2): mở process con bằng subprocess.Popen([sys.executable, "-c", code]) '
              'với stdin, stdout, stderr đều là subprocess.PIPE và text=True; gửi data vào stdin và chờ bằng '
              'communicate(data, timeout=limit). Xong kịp thì trả ("ok", stdout, returncode). Quá giờ '
              '(TimeoutExpired) thì KHÔNG bỏ mặc con: kill() rồi communicate() thêm một lần để thu nốt phần đã in và '
              'thu hồi con; trả ("timeout", phần stdout thu được, returncode).',
        example='talk("print(input().upper())", "hello\\n") → ("ok", "HELLO\\n", 0). Con in "start" rồi ngủ 10 giây, '
                'limit = 1 → ("timeout", "start\\n", mã khác 0).',
        demo=r'''import subprocess
import sys

p = subprocess.Popen([sys.executable, "-c", "print(input()[::-1])"],
                     stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
print("Popen trả ngay, poll() =", p.poll())
out, err = p.communicate("hello\n", timeout=5)
print(repr(out), err, p.returncode)

slow = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(10)"])
try:
    slow.communicate(timeout=0.5)
except subprocess.TimeoutExpired:
    slow.kill()
    slow.communicate()
    print("Quá giờ, đã kill; returncode =", slow.returncode)
''',
        explain=[
            'Popen(args, ...) khởi động con rồi trả object NGAY — con chạy song song với cha. run() = Popen + '
            'communicate + chờ, gói sẵn.',
            'communicate(input, timeout) gửi input vào stdin, đóng stdin, đọc hết stdout/stderr tới khi con xong, '
            'trả (stdout, stderr). Luồng không đặt PIPE → None.',
            'poll() hỏi "xong chưa?" mà không chặn (None = còn chạy); wait() chặn tới khi xong; terminate()/kill() '
            'yêu cầu hệ điều hành dừng con.',
            'Bị kill thì returncode khác 0 nhưng tuỳ hệ điều hành: -9 trên Linux (Studio cũng vậy), 1 trên Windows.',
            'communicate(timeout=…) ném TimeoutExpired nhưng KHÔNG giết con. Mẫu chuẩn trong tài liệu Python: kill() '
            'rồi communicate() lần nữa để thu nốt dữ liệu.',
            'run(timeout=…) thì tự kill và chờ con trước khi ném TimeoutExpired — Popen để bạn tự làm việc đó.',
        ],
        theory=[
            dict(h='Popen trả object ngay, cha không chờ',
                 body='Popen khởi động con rồi trả object NGAY, cha không chờ. run() được xây trên Popen — gói sẵn '
                      'phần giao tiếp và chờ, nên tiện nhưng không cho bạn xen vào giữa.',
                 bullets=['stdin/stdout/stderr=PIPE mở đường nói chuyện; không khai thì nhận None',
                          'communicate(input, timeout): gửi input, đọc hết hai luồng, chờ con xong',
                          'poll() hỏi "xong chưa" không chặn; terminate() xin dừng, kill() ép dừng']),
            dict(h='TimeoutExpired không đụng tới con',
                 body='communicate(timeout=…) ném TimeoutExpired nhưng KHÔNG đụng tới process con — con vẫn chạy, vẫn '
                      'giữ pipe. Mẫu chuẩn là bắt lỗi, kill(), rồi communicate() lần hai để đọc nốt và thu hồi con.'),
            dict(h='Quá hạn phải kill, không thì rò process',
                 bullets=['Chạy việc dài ở nền, cha làm việc khác và thỉnh thoảng poll() xem xong chưa',
                          'Đặt hạn giờ cho mã lạ: quá hạn thì kill để không rò process, không kẹt pipe',
                          'Mã thoát khi bị kill tuỳ hệ: -9 trên Linux (và Studio), 1 trên Windows']),
            dict(h='Đường con kéo qua vạch hạn giờ', figure='P06-popen-timeout',
                 body='Popen trả về ngay ở mốc đầu nên hai đường cha và con chạy song song. Hộp communicate(timeout) '
                      'có vạch hạn giờ: chạm vạch là TimeoutExpired, nhưng đường con VẪN kéo dài qua vạch — chỉ sau '
                      'kill() nó mới dứt.'),
        ],
        figure=dict(name='P06-popen-timeout',
                    caption='Popen trả ngay; communicate quá giờ thì phải kill rồi communicate lần hai',
                    alt='Trục thời gian: Popen trả ngay, communicate(timeout) ném TimeoutExpired nhưng con vẫn chạy, '
                        'kill() dừng con, communicate() lần hai thu nốt stdout'),
        slides='SL 51-53; DOC subprocess',
        predict=dict(q='p.communicate(timeout=1) ném TimeoutExpired. Lúc đó process con thế nào?', options=[
            ('Vẫn đang chạy — phải tự kill() rồi communicate() lại', 'TimeoutExpired chỉ báo cha đã chờ hết giờ; nó không đụng vào con.', True),
            ('Đã bị kill tự động', 'Đó là hành vi của run(timeout=...), không phải Popen.communicate.', False),
            ('Đã kết thúc bình thường', 'Nếu đã kết thúc thì communicate trả kết quả chứ không ném.', False),
        ]),
        myth=('"Bắt TimeoutExpired là xong việc"',
              'Với Popen.communicate(timeout=…), TimeoutExpired không tự kill process: con vẫn chạy, vẫn giữ pipe và '
              'CPU; bỏ mặc nó là rò process. Phải kill() (hoặc terminate()) rồi gọi communicate() thêm một lần để '
              'thu phần output còn lại và thu hồi con — lúc đó returncode mới có giá trị.'),
        mcq=[
            dict(q='Popen() và run() khác nhau chính ở đâu?', options=[
                ('run chờ xong rồi trả kết quả; Popen trả object ngay để bạn tự điều khiển (gửi input, poll, kill…)',
                 'run được xây trên Popen.', True),
                ('Popen không chạy được Python', 'Cả hai nhận cùng kiểu args.', False),
                ('run chạy song song, Popen chạy tuần tự', 'Ngược lại: Popen không chờ.', False),
            ]),
            dict(q='Ngay sau proc = Popen(...) (con đang chờ input), proc.poll() trả?', options=[
                ('None — con còn chạy', 'poll không chặn; None nghĩa là chưa kết thúc.', True),
                ('0', '0 chỉ có khi con đã kết thúc thành công.', False),
                ('Chặn tới khi con xong', 'Đó là wait().', False),
            ]),
            dict(q='Muốn communicate trả stdout dạng str (không phải bytes) cần gì?', options=[
                ('stdout=subprocess.PIPE và text=True khi tạo Popen', 'Thiếu PIPE thì phần stdout là None; thiếu text=True thì là bytes.', True),
                ('Gọi communicate(text=True)', 'communicate không có tham số text.', False),
                ('Không cần gì', 'Mặc định stdout không bị thu và pipe là bytes.', False),
            ]),
        ],
        why=dict(
            prompt='Sau TimeoutExpired, vì sao phải gọi communicate() THÊM một lần sau kill()?',
            sample='kill() chỉ yêu cầu hệ điều hành dừng con. communicate() lần hai đọc nốt dữ liệu còn trong pipe (vd. '
                   '"start" con đã in trước khi bị giết) và chờ con thật sự kết thúc để thu hồi, nhờ đó returncode có '
                   'giá trị và không còn process mồ côi. Trường hợp đặc biệt: con xong kịp thì không vào nhánh này.'),
        scaffold=dict(
            intro='Lắp mẫu chuẩn "timeout → kill → communicate".',
            template=r'''def talk(code, data, limit=2):
    proc = subprocess.Popen([sys.executable, "-c", code],
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True)
    try:
        out, err = {{slot1}}
    except subprocess.TimeoutExpired:
        {{slot2}}
        out, err = {{slot3}}
        return "timeout", out, proc.returncode
    return "ok", out, proc.returncode
''',
            slots=['proc.communicate(data, timeout=limit)', 'proc.kill()', 'proc.communicate()'],
            traps=[('proc.wait(timeout=limit)', 1, 'wait() không gửi data, không đọc pipe; nó trả exit code chứ không phải (out, err).'),
                   ('pass', 2, 'Con vẫn chạy — TimeoutExpired không tự kill.'),
                   ('proc.communicate(data)', 3, 'Không được gửi input lần hai sau khi đã bắt đầu giao tiếp (ValueError).')]),
        flow=['Popen(...) → con chạy, cha nhận proc ngay',
              'communicate(data, timeout=limit) → gửi data, đọc tới khi con xong',
              'quá limit → TimeoutExpired, con VẪN chạy',
              'kill() rồi communicate() → thu nốt output, returncode có giá trị'],
        transfer='Thử con đọc nhiều dòng từ stdin, con in một dòng rồi ngủ lâu, và con ngủ ngắn hơn limit.',
        counter=dict(q='talk("import sys; print(len(sys.stdin.read().split()))", "a b c\\n") trả gì?',
                     options=['("ok", "3\\n", 0)', '("ok", "1\\n", 0)', '("timeout", "", 1)'], correct='("ok", "3\\n", 0)'),
        practice='Popen với ba PIPE + text=True; communicate(data, timeout=limit) trong try; except TimeoutExpired: '
                 'kill(), communicate() lần hai, trả "timeout".',
        steps=['proc = subprocess.Popen([sys.executable, "-c", code], stdin=PIPE, stdout=PIPE, stderr=PIPE, text=True).',
               'try: out, err = proc.communicate(data, timeout=limit).',
               'except subprocess.TimeoutExpired: proc.kill(); out, err = proc.communicate(); return "timeout", out, proc.returncode.',
               'Xong kịp: return "ok", out, proc.returncode.'],
        partial=r'''    try:
        out, err = proc.communicate(data, timeout=limit)
    except subprocess.TimeoutExpired:
        ...''',
        io=[('talk("print(input().upper())", "hello\\n")', '("ok", "HELLO\\n", 0)'),
            ('Con in "start" rồi ngủ 10 giây, limit = 1', '("timeout", "start\\n", mã khác 0)')],
        contracts=[
            dict(sig='talk(code, data, limit=2)', does='Gửi data cho process con, chờ có giới hạn, dọn dẹp khi quá giờ.',
                 takes='code, data: str; limit: giây', gives='("ok" | "timeout", stdout: str, returncode: int)',
                 effect='Quá giờ: kill() rồi communicate() lần hai — không để con chạy tiếp.',
                 call='talk("print(input().upper())", "hello\\n") → ("ok", "HELLO\\n", 0)'),
        ],
        starter=P06_STARTER,
        solution=P06_SOLUTION,
        tests=[
            T('Gửi stdin, nhận stdout', 'talk("print(input().upper())", "hello\\n")', ('ok', 'HELLO\n', 0)),
            T('Con đọc nhiều dòng stdin', 'talk("import sys; print(sum(int(x) for x in sys.stdin))", "1\\n2\\n39\\n")',
              ('ok', '42\n', 0)),
            T('Trả đúng exit code của con', 'talk("import sys; print(\'bye\'); sys.exit(3)", "")', ('ok', 'bye\n', 3)),
            T('Quá giờ → "timeout"', f'talk({P06_SLEEPER!r}, "", 1)[0]', 'timeout'),
            T('Thu nốt phần con đã in trước khi bị kill', f'talk({P06_CHATTY!r}, "", 1)[:2]', ('timeout', 'start\n')),
            T('Sau kill, con đã kết thúc (returncode khác None và khác 0)',
              f'(lambda rc: rc is not None and rc != 0)(talk({P06_SLEEPER!r}, "", 1)[2])', True),
            T('Ngủ ngắn hơn limit thì vẫn "ok"', 'talk("import time; time.sleep(1); print(\'done\')", "", 3)',
              ('ok', 'done\n', 0)),
        ],
        bad=[('quên text=True',
              P06_SOLUTION.replace('                            stderr=subprocess.PIPE, text=True)',
                                   '                            stderr=subprocess.PIPE)')),
             ('tưởng TimeoutExpired đã kill con',
              P06_SOLUTION.replace('        proc.kill()\n        out, err = proc.communicate()\n        return "timeout", out, proc.returncode\n',
                                   '        return "timeout", "", proc.returncode\n')),
             ('không bắt TimeoutExpired',
              P06_SOLUTION.replace('''    try:
        out, err = proc.communicate(data, timeout=limit)
    except subprocess.TimeoutExpired:
        proc.kill()
        out, err = proc.communicate()
        return "timeout", out, proc.returncode
''', '''    out, err = proc.communicate(data, timeout=limit)
'''))],
    ),

    # ------------------------------------------------------------------ P07
    dict(
        code='P07', title='multiprocessing: Process và Queue', minutes=35,
        goal='Chạy hàm Python ở process riêng bằng multiprocessing và gửi kết quả về qua Queue.',
        prereq='P06', env=MP_ENV,
        brief='Viết square(n, results): tính n * n và put cặp (n, n * n) vào Queue results. Viết run_workers(numbers): '
              'tạo một Queue, tạo một Process cho MỖI số (target=square, args=(n, results)), start hết, lấy đủ '
              'len(numbers) kết quả bằng results.get(), join hết, trả dict {n: n * n}. Lời gọi tạo process ở cấp '
              'ngoài cùng của file phải nằm trong if __name__ == "__main__":.',
        example='run_workers([2, 3, 4]) → {2: 4, 3: 9, 4: 16} — ba process, mỗi process gửi một cặp qua Queue.',
        demo=r'''from multiprocessing import Process, Queue

counter = 0


def worker(value, box):
    global counter
    counter += 1
    box.put(value * 2)


if __name__ == "__main__":
    box = Queue()
    p = Process(target=worker, args=(4, box))
    p.start()
    print("Con gửi về:", box.get())
    p.join()
    print("counter của cha vẫn là", counter)
''',
        explain=[
            'subprocess chạy một CHƯƠNG TRÌNH khác và nói chuyện qua stdin/stdout; multiprocessing chạy một HÀM '
            'Python của bạn ở process riêng.',
            'Process(target=hàm, args=(…)) dùng giống Thread: target là tên hàm (không ngoặc), args là tuple, '
            'start() rồi join().',
            'Worker phải là hàm def ở CẤP MODULE (không lambda, không hàm lồng): process con phải tìm lại được nó theo tên.',
            'Process con có bộ nhớ riêng: sửa biến toàn cục trong con KHÔNG đổi bản của cha. Gửi kết quả qua Queue: '
            'con put(), cha get(); dữ liệu được pickle.',
            'Trên Windows/macOS con khởi động bằng cách import lại file của bạn, nên code tạo process phải nằm trong '
            'if __name__ == "__main__":. Lấy hết kết quả từ Queue rồi mới join.',
        ],
        theory=[
            dict(h='multiprocessing chạy hàm của chính bạn',
                 body='subprocess chạy một CHƯƠNG TRÌNH khác rồi nói chuyện qua stdin/stdout. multiprocessing là cửa '
                      'còn lại: chạy một HÀM Python của chính bạn ở một process riêng — hai module, hai bộ API.',
                 bullets=['Process(target=hàm, args=(…)) rồi start(), join() — dùng y như Thread',
                          'Worker phải là def ở cấp module: con tìm hàm theo tên nên lambda không được',
                          'Queue là kênh IPC: con put(), cha get(); dữ liệu được pickle khi đi qua']),
            dict(h='Worker cộng vào bản sao của nó',
                 body='fork() tạo một BẢN SAO của process cha, nên worker chạy counter += 1 hay ghi dict toàn cục chỉ '
                      'sửa bản của nó — cha đọc lại vẫn thấy số cũ. Đây là chỗ process khác thread: thread cùng '
                      'process thì dùng chung bộ nhớ.'),
            dict(h='Mọi thứ gửi qua Queue phải pickle được',
                 bullets=['Việc CPU-bound: nhiều process chạy trên nhiều lõi thật, không bị GIL chặn',
                          'Giá phải trả: tạo process đắt hơn thread, mọi thứ gửi đi phải pickle được',
                          'Studio mô phỏng multiprocessing: target chạy khi start(), Queue là kênh chung']),
            dict(h='Chỉ Queue đi qua, vùng nhớ thì không', figure='P07-process-queue',
                 body='Cha ở giữa, hai con hai bên, mỗi hộp có vùng nhớ riêng vẽ tách hẳn — không mũi tên nào nối vùng '
                      'nhớ con sang vùng nhớ cha. Đường duy nhất đi qua là Queue, và thứ tự lấy ra không nhất thiết '
                      'theo thứ tự start.'),
        ],
        figure=dict(name='P07-process-queue',
                    caption='Hai process con gửi kết quả về cha qua Queue; bộ nhớ không dùng chung',
                    alt='Cha và hai process con, mỗi process có vùng nhớ riêng tách biệt; chỉ một Queue nối con put() '
                        'với cha get()'),
        slides='SL 22-26, 49-53; DOC multiprocessing',
        predict=dict(q='Worker chạy counter += 1 trong process con (counter là biến toàn cục bằng 0). Sau join, cha in '
                       'counter được mấy?', options=[
            ('0 — con sửa bản sao của nó, cha không thấy', 'Process có không gian địa chỉ riêng; gửi về phải qua Queue/Pipe.', True),
            ('1', 'Đó là hành vi của thread (chung bộ nhớ), không phải process.', False),
            ('Báo lỗi', 'Không lỗi — chỉ là hai bản biến khác nhau.', False),
        ]),
        myth=('"Process cũng chia sẻ biến như thread"',
              'Các thread trong cùng một process dùng chung bộ nhớ; các process thì không. Worker ghi vào dict toàn cục '
              'hay append vào list của cha chỉ sửa BẢN SAO trong con — cha nhận dict rỗng. Kết quả phải đi qua IPC: '
              'Queue, Pipe, Value/Manager. Và subprocess với multiprocessing không phải hai tên của cùng một API.'),
        mcq=[
            dict(q='subprocess và multiprocessing có phải hai tên cho cùng một API không?', options=[
                ('Không — subprocess chạy chương trình khác; multiprocessing chạy hàm Python ở process riêng',
                 'Cả hai liên quan process nhưng mục đích và API khác nhau.', True),
                ('Có', 'Hai module, hai bộ API.', False),
                ('multiprocessing là bản cũ của subprocess', 'Không có quan hệ cũ/mới.', False),
            ]),
            dict(q='Vì sao không dùng target=lambda n: n * n cho Process?', options=[
                ('Process con phải tìm/pickle lại target theo tên ở cấp module; lambda không có tên như vậy',
                 'Định nghĩa worker bằng def ở cấp module.', True),
                ('lambda chạy chậm hơn', 'Không phải chuyện tốc độ.', False),
                ('Process không nhận hàm', 'Process nhận hàm qua target.', False),
            ]),
            dict(q='Bỏ if __name__ == "__main__": trên Windows thì…', options=[
                ('Process con import lại file và chạy lại đoạn tạo process — Python báo RuntimeError (bootstrapping)',
                 'Main guard chặn code tạo process chạy lại khi file bị import.', True),
                ('Chạy bình thường', 'Trên Windows (spawn) thì không.', False),
                ('Chỉ chạy chậm hơn', 'Không phải chuyện tốc độ.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao worker phải put kết quả vào Queue thay vì ghi vào dict toàn cục?',
            sample='Mỗi process con có bộ nhớ riêng (bản sao), nên ghi vào dict toàn cục chỉ sửa bản của con; cha vẫn '
                   'thấy dict rỗng. Queue là kênh IPC: con put cặp (n, n * n), dữ liệu được pickle chuyển sang cha, cha '
                   'get đủ len(numbers) lần. Trường hợp đặc biệt: numbers rỗng thì không tạo process nào và trả {}.'),
        scaffold=dict(
            intro='Lắp ba chỗ: gửi kết quả, tạo Process, nhận kết quả.',
            template=r'''from multiprocessing import Process, Queue


def square(n, results):
    {{slot1}}


def run_workers(numbers):
    results = Queue()
    workers = [{{slot2}} for n in numbers]
    for worker in workers:
        worker.start()
    squares = {}
    for _ in numbers:
        n, value = {{slot3}}
        squares[n] = value
    for worker in workers:
        worker.join()
    return squares
''',
            slots=['results.put((n, n * n))', 'Process(target=square, args=(n, results))', 'results.get()'],
            traps=[('return n * n', 1, 'Giá trị return của target bị bỏ đi — cha không nhận được.'),
                   ('Process(target=square(n, results))', 2, 'Gọi square ngay trong cha; Process nhận target=None.'),
                   ('results', 3, 'Queue là kênh, không phải kết quả — phải get() từng cặp.')]),
        flow=['Queue() → kênh IPC dùng chung giữa cha và con',
              'Process(target=square, args=(n, results)) → mô tả process, chưa chạy',
              'start() → square chạy ở process con, put (n, n * n)',
              'cha get() đủ len(numbers) lần → join hết → dict'],
        transfer='Thử một số, list rỗng và số âm; thử cho worker ghi vào biến toàn cục để thấy cha không nhận được gì.',
        counter=dict(q='run_workers([-3, 5]) trả gì?', options=['{-3: 9, 5: 25}', '{}', '{-3: -9, 5: 25}'],
                     correct='{-3: 9, 5: 25}'),
        practice='Worker cấp module chỉ tính rồi put vào Queue; cha tạo Process cho từng số, start hết, get đủ, join hết. '
                 'Lời gọi tạo process ở cấp ngoài cùng nằm dưới main guard.',
        steps=['def square(n, results): results.put((n, n * n)).',
               'results = Queue(); workers = [Process(target=square, args=(n, results)) for n in numbers].',
               'start từng worker; lặp len(numbers) lần results.get() và ghi vào dict.',
               'join từng worker rồi trả dict; print(run_workers(...)) ở cuối file đặt trong if __name__ == "__main__":.'],
        partial=r'''def square(n, results):
    results.put((n, n * n))
...''',
        io=[('run_workers([2, 3, 4])', '{2: 4, 3: 9, 4: 16}'), ('run_workers([])', '{}')],
        contracts=[
            dict(sig='square(n, results)', does='Worker chạy trong process con.', takes='n: int; results: Queue',
                 gives='None (kết quả đi qua Queue)', effect='results.put((n, n * n)).', call='square(6, q) → q nhận (6, 36)'),
            dict(sig='run_workers(numbers)', does='Mỗi số một process, gom kết quả qua Queue.',
                 takes='numbers: list[int]', gives='dict {n: n * n}',
                 effect='Tạo len(numbers) Process, start hết, get đủ, join hết.', call='run_workers([2, 3]) → {2: 4, 3: 9}'),
        ],
        starter=P07_STARTER,
        solution=P07_SOLUTION,
        tests=[
            T('run_workers([2, 3, 4])', 'run_workers([2, 3, 4])', {2: 4, 3: 9, 4: 16}),
            T('Dữ liệu khác, có số âm', 'run_workers([7, -3, 10])', {7: 49, -3: 9, 10: 100}),
            T('List rỗng → {}', 'run_workers([])', {}),
            TX('square gửi đúng một cặp qua Queue',
               "_studio.check('from multiprocessing import Queue\\nq = Queue()\\nsquare(6, q)\\n"
               "assert q.get() == (6, 36), \"square phải put cặp (n, n * n)\"')", 'True'),
            T('Mỗi số một Process; target là hàm; start hết rồi join hết',
              '(lambda r: (r.process_count, r.process_targets_callable, r.process_starts_before_joins, '
              'r.all_processes_joined))(_studio.call(run_workers, [1, 2, 3]))', (3, True, True, True)),
            T('Import file không tự tạo process (main guard)',
              "(lambda r: (r.stdout, r.process_count))(_studio.run(entry='None'))", ('', 0)),
        ],
        bad=[('thiếu main guard',
              P07_SOLUTION.replace('if __name__ == "__main__":\n    print(run_workers([2, 3, 4]))\n',
                                   'print(run_workers([2, 3, 4]))\n')),
             ('ghi vào dict toàn cục thay vì Queue', P07_GLOBAL),
             ('gọi sẵn target trong process cha',
              P07_SOLUTION.replace('Process(target=square, args=(n, results))', 'Process(target=square(n, results))'))],
    ),
]


BRIEFS = {
    'P01': dict(
        goal='Phân biệt program với process; đọc PID và đi ngược cây process.',
        task='Viết count_processes, ancestors (đi theo ppid) và current_identity.',
        predict='Chạy cùng một script hai lần có nhất thiết cùng PID không?',
        code=['TABLE = [(1, 0, "init"), (120, 1, "bash"), (305, 120, "python"), ...]',
              'def count_processes(table, program): ...',
              'def ancestors(table, pid): ...       # [pid, cha, ông, ...]',
              'def current_identity(): ...         # (os.getpid(), os.getppid())'],
        tests=['count_processes(TABLE, "python") → 3', 'ancestors(TABLE, 410) → [410, 305, 120, 1]'],
        reflect='Vì sao một program có thể ứng với nhiều process?'),
    'P02': dict(
        goal='Theo dõi vòng đời process; chờ con để lấy exit code.',
        task='Viết next_state theo sơ đồ 5 trạng thái và run_child bằng Popen + wait().',
        predict='Ngay sau Popen, child.returncode là gì?',
        code=['def next_state(state, event):',
              '    # cặp không có trong sơ đồ → ValueError',
              'def run_child(code):',
              '    child = subprocess.Popen([sys.executable, "-c", code])',
              '    # chờ con rồi trả exit code'],
        tests=['next_state("waiting", "io_done") → "ready"', 'run_child("raise SystemExit(3)") → 3'],
        reflect='Vì sao I/O xong thì process về ready chứ không về running?'),
    'P03': dict(
        goal='Mô phỏng Round Robin và tính thời gian chờ.',
        task='Viết round_robin(jobs, quantum, switch=0) và waiting_times(jobs, timeline).',
        predict='Quantum 2, burst 5/3/1: process nào xong đầu tiên?',
        code=['def round_robin(jobs, quantum, switch=0):',
              '    # popleft → chạy min(quantum, còn lại) → chưa xong thì về cuối',
              '    # đổi sang process khác → clock += switch',
              'def waiting_times(jobs, timeline): ...'],
        tests=['P1 5, P2 3, P3 1, quantum 2 → P1 0–2, P2 2–4, P3 4–5, …', 'switch = 1 → P1 0–2, P2 3–5, P1 6–7'],
        reflect='Vì sao quantum quá nhỏ làm mọi job xong muộn hơn?'),
    'P04': dict(
        goal='Phân biệt stdin, stdout, stderr và nối chúng với process con.',
        task='Viết read_scores (đọc sys.stdin, cảnh báo ra stderr) và run_sum (input= + capture_output).',
        predict='Con in 5 ra stdout và warn ra stderr: r.stdout là gì?',
        code=['def read_scores():',
              '    # for line in sys.stdin ... "skip: ..." → sys.stderr',
              'def run_sum(lines):',
              '    # subprocess.run([sys.executable, "sum_numbers.py"], input=...,',
              '    #                capture_output=True, text=True)'],
        tests=['stdin 5 / abc / -2 → [5, -2]; stderr: skip: abc', 'run_sum(["10", "x", "20"]) → (30, ["skip: x"])'],
        reflect='Vì sao cảnh báo phải ra stderr chứ không ra stdout?'),
    'P05': dict(
        goal='Chạy process con bằng subprocess.run và đọc đúng kết quả.',
        task='Viết exit_code, output_of (check_output) và máy chấm grade có timeout.',
        predict='check_output trả exit code hay đầu ra?',
        code=['def exit_code(code): ...     # run(...).returncode',
              'def output_of(code): ...     # check_output(..., text=True)',
              'def grade(code, expected, limit=2):',
              '    # "TIMEOUT" / "ERROR <mã>" / "PASS" / "FAIL"'],
        tests=['grade("print(2+3)", "5") → PASS', 'grade("raise SystemExit(2)", "") → ERROR 2'],
        reflect='Vì sao phải kiểm returncode trước khi so stdout?'),
    'P06': dict(
        goal='Điều khiển process con bằng Popen: gửi input, chờ có giới hạn, dọn dẹp khi quá giờ.',
        task='Viết talk(code, data, limit): communicate có timeout; quá giờ thì kill rồi communicate lại.',
        predict='TimeoutExpired có tự kill process con không?',
        code=['proc = subprocess.Popen([...], stdin=PIPE, stdout=PIPE, stderr=PIPE, text=True)',
              'try:',
              '    out, err = proc.communicate(data, timeout=limit)',
              'except subprocess.TimeoutExpired:',
              '    # kill() rồi communicate() lại'],
        tests=['print(input().upper()) với "hello" → ("ok", "HELLO↵", 0)', 'In "start" rồi ngủ 10 s, limit 1 → ("timeout", "start↵", mã ≠ 0)'],
        reflect='Vì sao sau kill() phải communicate() thêm một lần?'),
    'P07': dict(
        goal='Chạy hàm ở process riêng và gửi kết quả về qua Queue.',
        task='Viết square (put vào Queue) và run_workers: mỗi số một Process, get đủ, join hết.',
        predict='Con sửa biến toàn cục, cha có thấy không?',
        code=['def square(n, results):',
              '    # gửi (n, n * n) về cha qua Queue',
              'def run_workers(numbers): ...   # Queue, Process, start, get, join',
              'if __name__ == "__main__":',
              '    print(run_workers([2, 3, 4]))'],
        tests=['run_workers([2, 3, 4]) → {2: 4, 3: 9, 4: 16}', 'run_workers([]) → {}'],
        reflect='Vì sao kết quả phải đi qua Queue chứ không qua biến toàn cục?'),
}


SUPPORT = {
    'sum_numbers.py': SUM_NUMBERS,
}
