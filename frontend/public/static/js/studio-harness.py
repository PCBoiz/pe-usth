"""Bộ chấm studio-lesson/v1 — chạy BÊN TRONG Pyodide (Web Worker của trình duyệt).

studio-lesson.worker.js tải file này, exec một lần rồi gọi
`_studio_main(source, cases_json, files_json)`. scripts/pe-v3/check-pyodide.mjs
và scripts/pe-v4/check-pyodide.mjs nạp CHÍNH file này để kiểm bài bằng đúng
runtime của trình duyệt; scripts/pe-v4/harness_cpython.py chạy nó dưới CPython
lúc dựng bài — sửa ở đây là sửa cho cả ba.

Vì sao cần nhiều hơn `eval(call) == eval(expect)`:

* Bài PE v3 cơ bản là SCRIPT (chưa có hàm): mỗi ca chấm phải chạy lại cả
  chương trình với dữ liệu khác. `_studio.run(vars={...})` thay vế phải của
  dòng gán cấp ngoài cùng (`year = 1991` -> `year = 2026`) bằng cây cú pháp,
  không đụng chuỗi nên học viên viết `year=1991` hay `year = 1991` đều được.
* Bài file đọc/ghi `data.txt`, `palindromes.txt`: mỗi lần chạy có thư mục
  riêng, fixture ghi sẵn, đọc lại file kết quả sau khi chạy.
* Pyodide KHÔNG có stdin: `input()` nổ ngay, nên mọi bài dạy nhập liệu đều
  chết. Thay bằng stdin CẤP SẴN (cách Python Tutor làm): client gửi
  `stdin: ["Hoa", "20"]`, mỗi lần chạy nhận một bản sao các dòng đó và
  `input()` đọc lần lượt. Hết dòng thì `EOFError` — đúng như CPython khi
  `python main.py < input.txt` mà file hết dòng. Không dùng
  SharedArrayBuffer + Atomics.wait để hỏi người dùng giữa lúc chạy: cách đó
  buộc bật COOP/COEP cho cả site và làm vỡ lớp JS legacy.
* Pyodide KHÔNG mở được thread thật (`can't start new thread`) và không có
  fork. Thread được thay bằng bản mô phỏng chạy target ngay lúc start() và ghi
  lại thứ tự tạo/start/join — đủ để chấm hợp đồng "start hết rồi join hết".
* fork được mô phỏng bằng cách CHẠY LẠI chương trình từ đầu: lần chạy thứ k
  nhận 0 ở lời gọi fork thứ k (thành child), các lời gọi trước nhận PID như
  parent. Nhờ vậy bắt được đúng các lỗi bài dạy: child quên `_exit` (chạy
  tiếp code của parent, fork thêm process cháu), parent không waitpid, đo
  thời gian trước khi chờ đủ. Đồng hồ `time.time` được cộng thêm thời gian
  ảo mỗi lần fork/chờ để chấm được "đo bao trùm vòng đời child".

Khoá Python Advanced (pe-v4) cần thêm — vẫn là MÔ PHỎNG, không phải hệ điều hành:

* ĐỒNG HỒ ẢO: `time.sleep(s)` không chờ thật mà cộng `s` vào đồng hồ ảo
  (`time.time/perf_counter/monotonic` = giờ thật + phần ảo). Thread "ngủ" song
  song: mỗi thread có đồng hồ riêng từ lúc start(), join() kéo đồng hồ chính tới
  lúc thread xong — nên 3 thread mỗi cái sleep(1) đo được ≈1 s, còn start+join
  cùng vòng ≈3 s. Thời gian CPU thật của thread vẫn cộng dồn (GIL); process
  (multiprocessing, pool) thì song song cả CPU. Tổng giây ảo của một lần chạy
  vượt RUN_SLEEP_CAP là dừng (vòng lặp vô hạn có sleep).
* Khoá/đồng bộ: threading.Lock/RLock/Condition (kéo theo Event, Semaphore,
  queue.Queue) là bản đơn luồng. Thread chạy LẦN LƯỢT nên một lệnh chờ không
  ai đáp được (get() Queue rỗng, Event.wait() chưa set, Lock đang giữ) dừng
  chương trình với thông báo deadlock thay vì treo tới khi worker bị giết; có
  timeout thì đồng hồ ảo trôi hết timeout rồi trả Empty/False như thật.
  Queue có maxsize đầy thì put() vẫn cho vào (không có consumer song song để
  nhả chỗ) — thứ tự lấy ra vẫn FIFO như thật.
* subprocess: run/Popen/call/check_call/check_output/getoutput chạy chương
  trình con `[sys.executable, "-c", code]` / `[sys.executable, "file.py", ...]`
  / `-m module` trong namespace mới, stdin/stdout/stderr riêng, returncode từ
  sys.exit()/ngoại lệ (1 + traceback ra stderr), text/bytes, check, timeout
  theo đồng hồ ảo (con bị cắt tại lần sleep vượt hạn), Popen.poll/wait/
  communicate/terminate/kill, nối stdout của Popen này vào stdin Popen khác.
  `echo` chạy được; lệnh khác: FileNotFoundError (shell=True: mã 127).
  sys.executable cố định '/usr/bin/python3' để mọi môi trường in giống nhau.
* multiprocessing (module GIẢ): Process chạy target ngay khi start() trên BẢN
  SAO biến toàn cục/đối số (đổi trong con không thấy ở cha, như process thật);
  Queue/Pipe/Value/Array/Manager là kênh dùng chung; Pool, cpu_count() = 4.
  concurrent.futures ThreadPoolExecutor/ProcessPoolExecutor chạy việc ngay lúc
  submit, xếp lịch trên max_workers worker theo đồng hồ ảo.
* tkinter (module GIẢ, chỉ nạp khi import): widget, biến, pack/grid/place
  (trộn pack và grid trong cùng master -> TclError như Tk thật), command=,
  bind/event_generate, after (hàng đợi ảo), mainloop() trả về ngay sau khi xả
  hàng đợi after (tối đa AFTER_CAP lệnh), messagebox ghi lại.
* matplotlib: backend Agg, plt.show() không làm gì; mọi Figure tạo trong lần
  chạy được giữ lại để chấm (kể cả khi học viên plt.close()).

API cho ca chấm — đối tượng `_studio` (namespace của học viên, sau lần chạy chính):

  _studio.run(vars=, files=, entry=, setup=, stdin=, fail_fork_at=, child_exit=) -> Result
  _studio.call(fn, *args, **kw) -> Result      _studio.stdout(fn, ...) -> str
  _studio.check('assert ...') -> True          _studio.expr('biểu thức')
  _studio.write(name, text) / _studio.read(name) / _studio.exists(name)
  _studio.main                    Result của lần chạy chính
  _studio.tk                      = _studio.main.tk (TkState, xem dưới)
  _studio.figures / _studio.charts = _studio.main.figures / .charts
  _studio.subprocess_calls        = _studio.main.subprocess_calls

  Result: .stdout .value .error .message .exit_code .file(name) .exists(name) .var(name)
    thread  : .threads[i] (.output .target_name ._args .joined .is_alive()) .thread_count
              .targets_callable .starts_before_joins .all_joined
    fork    : .children .reaped_all .unreaped .grandchildren .forks_before_waits
              .after_waits(text) .measured_lifecycle .threads_before_fork
    subprocess: .subprocess_calls = [{kind, args, returncode, stdout, stderr, input, timeout,
              timed_out, killed, check, text, pid}] (stdout/stderr = chữ con đã ghi, luôn là str)
    multiprocessing: .processes[i] (.name .pid .exitcode .output .target_name .joined .error)
              .process_count .process_targets_callable .process_starts_before_joins
              .all_processes_joined .pools = [{kind, workers, tasks}]
    tkinter : .tk -> TkState
    matplotlib: .figures (list Figure theo thứ tự tạo) .charts (tóm tắt từng Axes) .show_calls
              .saved = [{file, figure, axes, empty}] mỗi lần savefig (figure nào vào file nào)
    .elapsed  giây (ảo + thật) từ đầu tới cuối lần chạy

  TkState: .windows .widgets .root .messages [(kind, title, message)] .mainloop_called
    .find(type=None, text=None, **options) -> widget đầu tiên khớp hoặc None
    .find_all(...) -> list    .run_after(n=None) -> số lệnh after đã chạy
    .after_pending  .answers (list: câu trả lời cho askyesno/askstring… lấy lần lượt)
  Widget: .invoke() .cget(opt) .text .manager ('pack'|'grid'|'place'|None) .layout (dict)
    .get() .insert() .delete() (Entry/Text/Listbox/Combobox) .fill(text) (gõ vào ô)
    .event_generate('<Return>') .master .children .destroyed .widget_type .ttk

Không có gì ở đây là sandbox bảo mật: mã học viên chạy trong worker dùng một
lần của chính trình duyệt học viên.
"""

import ast
import builtins
import copy
import errno
import importlib
import importlib.machinery
import importlib.util
import io
import json
import linecache
import os
import queue
import re
import shlex
import subprocess
import sys
import threading
import time
import traceback
import types
from contextlib import redirect_stderr, redirect_stdout

WORK_ROOT = '/tmp/studio'
PARENT_PID = 4000
CHILD_BASE = 4001
SUB_BASE = 5000    # PID của process con mô phỏng (subprocess, multiprocessing, pool)
FORK_COST = 0.2   # giây ảo cộng vào đồng hồ mỗi lần fork
WAIT_COST = 0.5   # giây ảo mỗi lần parent chờ một child
MAX_DEPTH = 6
MAX_CHILDREN = 32
CPU_COUNT = 4
CHILD_TIME_CAP = 600.0    # giây ảo tối đa một process con "chạy" trước khi coi là chạy mãi
RUN_SLEEP_CAP = 3600.0    # tổng giây ảo time.sleep() của một lần chạy
AFTER_CAP = 200           # số lệnh after() tối đa mainloop() xả trong một lần chạy
FAKE_EXECUTABLE = '/usr/bin/python3'
SIGTERM, SIGKILL = 15, 9


class _Abort(BaseException):
    """Dừng một lần chạy mô phỏng vì vi phạm (vd. child fork thêm)."""


class _Deadlock(_Abort):
    """Một lệnh chờ không bao giờ được đáp trong mô phỏng chạy lần lượt."""


class _Cut(BaseException):
    """Process con bị cắt vì vượt timeout của cha (đồng hồ ảo)."""


class _Exit(BaseException):
    """os._exit() trong mô phỏng — kết thúc process hiện tại ngay."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


class StudioSetupError(Exception):
    """Ca chấm không dựng được vì mã học viên lệch khung đề (đổi tên biến…)."""


class Expr(str):
    """Giá trị thay vào phép gán dưới dạng BIỂU THỨC Python, không phải literal.

    `_studio.run(vars={'language': _studio.expr('ProgrammingLanguage("C", 1972, [])')})`
    """


# ---------------------------------------------------------------- trạng thái

_ORIG = sys.modules.get('__studio_orig__')
if _ORIG is None:
    _ORIG = types.ModuleType('__studio_orig__')
    _ORIG.time = time.time
    _ORIG.perf_counter = time.perf_counter
    _ORIG.monotonic = time.monotonic
    _ORIG.sleep = time.sleep
    _ORIG.Thread = threading.Thread
    _ORIG.current_thread = threading.current_thread
    _ORIG.get_ident = threading.get_ident
    _ORIG.executable = sys.executable
    _ORIG.queue_put = queue.Queue.put
    sys.modules['__studio_orig__'] = _ORIG


class _Clock:
    offset = 0.0


_STACK = []          # Ctx đang chạy, lồng nhau khi mô phỏng child
_RUN_SEQ = [0]
_SUPPORT_MODULES = set()
_PIDS = [SUB_BASE]   # PID cấp cho process con mô phỏng — đặt lại mỗi lần chạy chương trình
_MP_SEQ = [0]        # số thứ tự Process-N
_TK_FALLBACK = [None]   # TkState của lần chạy chính — callback gọi từ ca chấm ghi vào đây
_LOOSE_TK = [None]


def _ctx():
    return _STACK[-1] if _STACK else None


def _next_pid():
    _PIDS[0] += 1
    return _PIDS[0]


class Ctx:
    """Trạng thái của MỘT process mô phỏng (một lần chạy chương trình)."""

    def __init__(self, depth=0, plan=None, memo=None, options=None, can_fork=True, kind='program'):
        self.depth = depth
        self.plan = plan            # lời gọi fork thứ mấy thì thành child
        self.role = 'parent'
        self.kind = kind            # program | call | subprocess | process
        self.pid = PARENT_PID
        self.ppid = None
        self.memo = {} if memo is None else memo
        self.options = options or {}
        self.can_fork = can_fork
        self.fork_calls = 0
        self.children = []
        self.reaped = set()         # PID child mà CHÍNH process này đã chờ
        self.waited = []
        self.timeline = []          # (loại, dữ liệu, vị trí trong out)
        self.threads = []
        self.out = io.StringIO()
        # stdin riêng của process mô phỏng này, đọc lại từ dòng đầu.
        self.stdin = _new_stdin()
        self.mark = 0              # child: vị trí out lúc tách khỏi parent
        self.exit_code = None
        self.violation = None
        self.current_thread = None
        self.clock_first_fork = None
        self.clock_last_wait = None
        self.threads_before_fork = None
        # pe-v4
        self.deadline = None        # process con: đồng hồ ảo vượt mốc này thì bị cắt (_Cut)
        self.slept = 0.0
        self.subprocess_calls = []
        self.open_popens = []
        self.processes = []
        self.process_obj = None     # SimProcess đang chạy trong ctx này (multiprocessing)
        self.pools = []
        self.timers = []
        self.tk = None
        self.figures = []
        self.saved = []
        self.show_calls = 0
        self.started_at = _time()

    def pos(self):
        return len(self.out.getvalue())

    def log(self, kind, data=None):
        self.timeline.append((kind, data, self.pos()))

    def get_tk(self):
        if self.tk is None:
            self.tk = _TkState()
        return self.tk


# ---------------------------------------------------------------- đồng hồ

def _time():
    return _ORIG.time() + _Clock.offset


def _perf_counter():
    return _ORIG.perf_counter() + _Clock.offset


def _monotonic():
    return _ORIG.monotonic() + _Clock.offset


def _advance(secs):
    """Đồng hồ ảo trôi `secs` giây (không chờ thật)."""
    if secs > 0:
        _Clock.offset += secs


def _advance_to(moment):
    """Đồng hồ (theo _time()) trôi tới `moment` nếu còn ở trước nó."""
    _advance(moment - _time())


def _sleep(secs):
    # Kiểm kiểu giống time.sleep thật để lỗi của học viên vẫn hiện như trên máy.
    if isinstance(secs, bool) or not isinstance(secs, (int, float)):
        raise TypeError("'%s' object cannot be interpreted as an integer" % type(secs).__name__)
    if secs < 0:
        raise ValueError('sleep length must be non-negative')
    ctx = _ctx()
    _Clock.offset += secs
    if ctx is None:
        return
    if ctx.deadline is not None and _Clock.offset > ctx.deadline:
        # Process con vượt timeout của cha: dừng NGAY tại lần sleep này, như bị kill.
        _Clock.offset = ctx.deadline
        raise _Cut()
    root = next((c for c in reversed(_STACK) if c.kind == 'program'), ctx)
    root.slept += secs
    if root.slept > RUN_SLEEP_CAP:
        raise _Abort('Chương trình đã "ngủ" quá %d giây ảo — có vòng lặp vô hạn chứa time.sleep()?'
                     % RUN_SLEEP_CAP)
    if ctx.current_thread is None and ctx.timers:
        _run_due_timers(ctx, _time())


# ---------------------------------------------------------------- stdin cấp sẵn

# Các dòng stdin của CẢ bài (client gửi kèm lần chạy). `_JOB['stdin']` ghi đè
# khi một ca chấm muốn chạy lại chương trình với bộ input khác
# (`_studio.run(stdin=[...])`).
_STDIN = {'lines': [], 'loose': None}


def _stdin_text(lines):
    # Client gửi MẢNG DÒNG, không phải một chuỗi: tự thêm '\n' và bỏ ký tự
    # xuống dòng lẫn trong dòng để '\r\n' của Windows không dính vào giá trị
    # input() trả về.
    return ''.join(str(line).rstrip('\r\n') + '\n' for line in lines)


def _new_stdin():
    """Luồng stdin RIÊNG cho một lần chạy.

    Mỗi lần chạy (kể cả lần chạy lại để mô phỏng fork, và mỗi `_studio.run`)
    đọc stdin từ đầu — giống như chạy lại `python main.py < input.txt`, chứ
    không phải chia nhau một con trỏ đọc duy nhất.
    """
    lines = _JOB.get('stdin')
    if lines is None:
        lines = _STDIN['lines']
    return io.StringIO(_stdin_text(lines))


def _loose_stdin():
    # Ca chấm gọi input() TRỰC TIẾP trong `call`/`expect` thì không có lần chạy
    # nào bọc ngoài; cấp một luồng dùng chung cho cả bài để nó vẫn đọc được.
    if _STDIN['loose'] is None:
        _STDIN['loose'] = io.StringIO(_stdin_text(_STDIN['lines']))
    return _STDIN['loose']


def _input(prompt=''):
    ctx = _ctx()
    stream = ctx.stdin if ctx is not None else _loose_stdin()
    # Prompt ra stdout TRƯỚC khi đọc — và vẫn ra cả khi sắp EOFError — để
    # console hiện đúng thứ tự "Nhập tên: Hoa" như terminal thật. Ghi qua
    # sys.stdout (đang bị redirect_stdout trỏ vào ctx.out) chứ không qua
    # print() để không tự thêm '\n'.
    sys.stdout.write(str(prompt))
    line = stream.readline()
    if line == '':
        # Đúng hành vi CPython khi stdin cạn. Cố ý KHÔNG trả '' hay treo máy:
        # trả '' thì chương trình sai âm thầm, còn treo thì worker bị
        # terminate() sau 5 giây và học viên không hiểu vì sao.
        raise EOFError('EOF when reading a line')
    return line[:-1] if line.endswith('\n') else line


class _redirect_stdin:
    """contextlib không có redirect_stdin, tự làm cho gọn."""

    def __init__(self, stream):
        self._stream = stream
        self._saved = None

    def __enter__(self):
        self._saved = sys.stdin
        sys.stdin = self._stream
        return self._stream

    def __exit__(self, *exc):
        sys.stdin = self._saved
        return False


# ---------------------------------------------------------------- khoá / đồng bộ (đơn luồng)

_WAIT_HELP = ('Studio chạy thread/process LẦN LƯỢT (target chạy hết ngay khi start()), nên không còn ai '
              'đáp lệnh chờ này. Hãy start producer TRƯỚC consumer, gửi giá trị kết thúc (sentinel), '
              'hoặc dùng timeout=. Chạy trên máy thật để thấy thread song song.')


def _deadlock(what):
    raise _Deadlock('%s sẽ chờ mãi (deadlock). %s' % (what, _WAIT_HELP))


class SimLock:
    """threading.Lock đơn luồng: lấy khoá đang bị giữ = không ai nhả được nữa."""

    def __init__(self):
        self._locked = False

    def acquire(self, blocking=True, timeout=-1):
        if not self._locked:
            self._locked = True
            return True
        if not blocking:
            return False
        if timeout is not None and timeout >= 0:
            _advance(timeout)
            return False
        _deadlock('Lock.acquire() trên khoá đang bị giữ')

    def release(self):
        if not self._locked:
            raise RuntimeError('release unlocked lock')
        self._locked = False

    def locked(self):
        return self._locked

    def __enter__(self):
        return self.acquire()

    def __exit__(self, *exc):
        self.release()

    def _at_fork_reinit(self):
        self._locked = False

    def __repr__(self):
        return '<%s %s object>' % ('locked' if self._locked else 'unlocked', type(self).__name__)


class SimRLock:
    def __init__(self):
        self._owner = None
        self._count = 0

    def acquire(self, blocking=True, timeout=-1):
        me = _current_thread()
        if self._count == 0 or self._owner is me:
            self._owner = me
            self._count += 1
            return True
        if not blocking:
            return False
        if timeout is not None and timeout >= 0:
            _advance(timeout)
            return False
        _deadlock('RLock.acquire() trên khoá thread khác đang giữ')

    def release(self):
        if self._count == 0 or self._owner is not _current_thread():
            raise RuntimeError('cannot release un-acquired lock')
        self._count -= 1
        if self._count == 0:
            self._owner = None

    def locked(self):
        return self._count > 0

    __enter__ = acquire

    def __exit__(self, *exc):
        self.release()

    def _is_owned(self):
        return self._count > 0 and self._owner is _current_thread()

    def _release_save(self):
        state = (self._count, self._owner)
        self._count, self._owner = 0, None
        return state

    def _acquire_restore(self, state):
        self._count, self._owner = state

    def _at_fork_reinit(self):
        self._owner, self._count = None, 0


class SimCondition:
    """threading.Condition đơn luồng — kéo theo Event, Semaphore, Barrier, queue.Queue."""

    def __init__(self, lock=None):
        self._lock = SimRLock() if lock is None else lock
        self.acquire = self._lock.acquire
        self.release = self._lock.release

    def __enter__(self):
        return self._lock.__enter__()

    def __exit__(self, *exc):
        return self._lock.__exit__(*exc)

    def wait(self, timeout=None):
        if timeout is None:
            _deadlock('Một lệnh chờ (Queue.get(), Event.wait(), Condition.wait(), Semaphore/Barrier…)')
        _advance(max(0.0, timeout))
        return False

    def wait_for(self, predicate, timeout=None):
        result = predicate()
        if result:
            return result
        if timeout is None:
            _deadlock('Condition.wait_for()')
        _advance(max(0.0, timeout))
        return predicate()

    def notify(self, n=1):
        pass

    def notify_all(self):
        pass

    notifyAll = notify_all

    def _is_owned(self):
        return getattr(self._lock, '_is_owned', lambda: True)()


def _queue_put(self, item, block=True, timeout=None):
    # Queue có maxsize đầy: trên máy thật producer chờ consumer nhả chỗ. Ở đây
    # consumer không chạy song song được, nên cho vượt maxsize thay vì treo —
    # thứ tự lấy ra (FIFO) vẫn y như thật.
    if block and self.maxsize > 0 and _STACK and self._qsize() >= self.maxsize:
        with self.mutex:
            self._put(item)
            self.unfinished_tasks += 1
            self.not_empty.notify()
        return
    return _ORIG.queue_put(self, item, block, timeout)


# ---------------------------------------------------------------- thread mô phỏng

class _MainThreadStub:
    name = 'MainThread'
    ident = 1
    native_id = 1
    daemon = False

    def is_alive(self):
        return True

    def getName(self):
        return self.name


_MAIN_THREAD = _MainThreadStub()
_THREAD_IDS = [100]
# Thread được start NGAY trong biểu thức ca chấm (không có lần chạy nào bọc ngoài):
# current_thread() bên trong target vẫn phải trả về chính thread đó.
_LOOSE_THREAD = [None]


class SimThread:
    """Thay threading.Thread: target chạy NGAY khi start(), ghi lại vòng đời.

    Trình duyệt không có thread thật, nên thứ được chấm là HỢP ĐỒNG: tạo
    Thread với target là hàm (không gọi sẵn), start mỗi worker đúng một lần,
    start hết trước khi join, join đủ.

    Đồng hồ (pe-v4): thread có đồng hồ riêng bắt đầu từ lúc start(); sleep
    trong thread chỉ đẩy đồng hồ của nó, join() kéo đồng hồ chính tới lúc
    thread xong — nên nhiều thread cùng chờ I/O đo ra thời gian song song.
    """

    def __init__(self, group=None, target=None, name=None, args=(), kwargs=None, *, daemon=None):
        ctx = _ctx()
        self._target = target
        # Giữ NGUYÊN như threading.Thread: args=n (thiếu dấu phẩy) chỉ hỏng khi
        # thread chạy, đúng như học viên sẽ gặp trên máy thật.
        self._args = args
        self._kwargs = {} if kwargs is None else kwargs
        self.index = len(ctx.threads) if ctx else 0
        self.name = name or 'Thread-%d' % (self.index + 1)
        self.daemon = bool(daemon)
        self.ident = None
        self.native_id = None
        self.started = False
        self.finished = False
        self.joined = False
        self.output = ''
        self.error = None
        self._end = None
        self.pid = ctx.pid if ctx else PARENT_PID
        # Lớp con tự viết run() thì không cần target: coi như "callable" để bộ chấm
        # và ghi chú console không báo nhầm "target=None".
        self.target_callable = callable(target) or type(self).run is not SimThread.run
        self.target_name = getattr(target, '__name__', None) if target is not None else None
        if ctx is not None:
            ctx.threads.append(self)
            ctx.log('thread', self.index)

    def start(self):
        # Lớp con quên super().__init__(): CPython báo đúng câu này, đừng để lộ
        # AttributeError của bản mô phỏng.
        if '_target' not in self.__dict__:
            raise RuntimeError('thread.__init__() not called')
        if self.started:
            raise RuntimeError('threads can only be started once')
        ctx = _ctx()
        self.started = True
        _THREAD_IDS[0] += 1
        self.ident = self.native_id = _THREAD_IDS[0]
        if ctx is not None:
            ctx.log('start', self.index)
        self._launch(ctx)

    def _launch(self, ctx):
        prev = ctx.current_thread if ctx else _LOOSE_THREAD[0]
        if ctx is not None:
            ctx.current_thread = self
        else:
            _LOOSE_THREAD[0] = self
        mark = ctx.pos() if ctx else 0
        clock = _Clock.offset
        try:
            self.run()
        except (_Exit, _Abort, _Cut):
            raise
        except BaseException as exc:  # thread lỗi không làm sập thread chính
            self.error = exc
            print('Exception in thread %s:' % self.name, file=sys.stderr)
            print(_format_exc(exc), file=sys.stderr, end='')
        finally:
            if ctx is not None:
                ctx.current_thread = prev
                self.output = ctx.out.getvalue()[mark:]
            else:
                _LOOSE_THREAD[0] = prev
            self.finished = True
            # Đồng hồ riêng của thread dừng ở đây; thread chính quay về lúc start()
            # (cộng thời gian CPU thật đã trôi — GIL bắt thread chạy nối tiếp).
            self._end = _time()
            _Clock.offset = clock

    def run(self):
        if self._target is not None:
            self._target(*self._args, **self._kwargs)

    def join(self, timeout=None):
        if '_target' not in self.__dict__:
            raise RuntimeError('Thread.__init__() not called')
        if not self.started:
            raise RuntimeError('cannot join thread before it is started')
        ctx = _ctx()
        if ctx is not None and ctx.current_thread is self:
            raise RuntimeError('cannot join current thread')
        if ctx is not None:
            ctx.log('join', self.index)
        if self._end is None and isinstance(self, SimTimer):
            self._fire()
        if self._end is not None:
            if timeout is None:
                _advance_to(self._end)
            else:
                _advance(min(max(0.0, timeout), self._end - _time()))
        self.joined = True

    def is_alive(self):
        if not self.started:
            return False
        if not self.finished:
            return True
        return self._end is not None and _time() < self._end - 1e-9

    def getName(self):
        return self.name

    def setName(self, name):
        self.name = name

    def isDaemon(self):
        return self.daemon

    def setDaemon(self, flag):
        self.daemon = bool(flag)

    def __repr__(self):
        state = 'stopped' if self.finished else ('started' if self.started else 'initial')
        return '<Thread(%s, %s)>' % (self.name, state)


class SimTimer(SimThread):
    """threading.Timer: hàm chạy khi đồng hồ ảo tới hạn (sleep/join của thread chính,
    hoặc lúc chương trình kết thúc), trừ khi đã cancel()."""

    def __init__(self, interval, function, args=None, kwargs=None):
        super().__init__(target=function, args=args if args is not None else (), kwargs=kwargs)
        self.interval = interval
        self.cancelled = False
        self._due = None

    def cancel(self):
        self.cancelled = True

    def start(self):
        if self.started:
            raise RuntimeError('threads can only be started once')
        ctx = _ctx()
        self.started = True
        _THREAD_IDS[0] += 1
        self.ident = self.native_id = _THREAD_IDS[0]
        self._due = _time() + float(self.interval)
        if ctx is not None:
            ctx.log('start', self.index)
            ctx.timers.append(self)

    def _fire(self):
        ctx = _ctx()
        if ctx is not None and self in ctx.timers:
            ctx.timers.remove(self)
        if self.cancelled:
            self.finished = True
            self._end = self._due
            return
        clock = _Clock.offset
        _advance_to(self._due)
        inner = _Clock.offset
        try:
            self._launch(ctx)
        finally:
            # _launch đã trả đồng hồ về `inner`; thread chính không chờ timer.
            _Clock.offset = clock + (_Clock.offset - inner)


def _run_due_timers(ctx, until=None):
    for timer in sorted(list(ctx.timers), key=lambda t: t._due):
        if until is None or timer._due <= until + 1e-9:
            if until is None and timer.daemon:
                continue
            timer._fire()


def _current_thread():
    ctx = _ctx()
    if ctx is not None:
        return ctx.current_thread if ctx.current_thread is not None else _MAIN_THREAD
    return _LOOSE_THREAD[0] or _MAIN_THREAD


def _get_ident():
    return _current_thread().ident


def _active_threads():
    ctx = _ctx()
    alive = [t for t in (ctx.threads if ctx else []) if t.is_alive()]
    return [_MAIN_THREAD] + alive


# ---------------------------------------------------------------- pool / executor (thread và process)

def _copy_for_child(value, memo):
    """Bản sao "như pickle" để process con không đụng bộ nhớ của cha."""
    if isinstance(value, (types.ModuleType, type, types.FunctionType, types.BuiltinFunctionType,
                          Ctx, Studio, Result)):
        return value
    try:
        return copy.deepcopy(value, memo)
    except Exception:
        return value


def _rebind(fn, globs):
    new = types.FunctionType(fn.__code__, globs, fn.__name__, fn.__defaults__, fn.__closure__)
    new.__kwdefaults__ = fn.__kwdefaults__
    new.__dict__.update(fn.__dict__)
    new.__qualname__ = fn.__qualname__
    new.__module__ = fn.__module__
    return new


def _isolate(target, args, kwargs):
    """(hàm, args, kwargs) chạy trên BẢN SAO biến toàn cục của chương trình học viên.

    Process thật nhận một bản sao bộ nhớ (fork) hoặc chạy lại module (spawn):
    `counter += 1` trong con không làm đổi `counter` của cha. Queue, Value,
    Manager… của bộ mô phỏng tự trả CHÍNH NÓ khi bị sao chép nên vẫn dùng chung.
    """
    memo = {}
    fn, bound = target, None
    if isinstance(target, types.MethodType):
        fn, bound = target.__func__, target.__self__
    if isinstance(fn, types.FunctionType) and fn.__globals__.get('__name__') in ('__main__', 'solution'):
        globs = fn.__globals__
        copied = {}
        memo[id(globs)] = copied
        for key, value in globs.items():
            copied[key] = value if key in ('__builtins__', '_studio') else _copy_for_child(value, memo)
        for key, value in list(copied.items()):
            if isinstance(value, types.FunctionType) and value.__globals__ is globs:
                copied[key] = _rebind(value, copied)
        fn = _rebind(fn, copied)
    if bound is not None:
        fn = types.MethodType(fn, _copy_for_child(bound, memo))
    args = tuple(_copy_for_child(a, memo) for a in args)
    kwargs = {k: _copy_for_child(v, memo) for k, v in (kwargs or {}).items()}
    return fn, args, kwargs


class _PoolThread:
    """threading.current_thread() bên trong một việc của ThreadPoolExecutor."""

    def __init__(self, name, ident):
        self.name = name
        self.ident = self.native_id = ident
        self.daemon = True

    def is_alive(self):
        return True

    def getName(self):
        return self.name


class _Workers:
    """Lịch chạy của một pool: việc rơi vào worker rảnh sớm nhất (đồng hồ ảo)."""

    def __init__(self, kind, workers, processes, prefix):
        ctx = _ctx()
        self.kind = kind
        self.workers = max(1, int(workers))
        self.processes = processes
        self.free = [None] * self.workers
        self.pids = [_next_pid() for _ in range(self.workers)] if processes else []
        self.names = ['%s_%d' % (prefix, i) for i in range(self.workers)]
        self.record = {'kind': kind, 'workers': self.workers, 'tasks': 0}
        if ctx is not None:
            ctx.pools.append(self.record)

    def run(self, fn, args, kwargs):
        """Chạy MỘT việc ngay bây giờ; trả (ok, giá trị/ngoại lệ, thời điểm xong)."""
        parent = _ctx()
        now = _time()
        k = min(range(self.workers), key=lambda i: (self.free[i] or now))
        start = max(now, self.free[k] or now)
        clock = _Clock.offset
        real0 = _ORIG.perf_counter()
        _Clock.offset += start - now
        self.record['tasks'] += 1
        pushed = False
        prev_thread = parent.current_thread if parent else None
        try:
            if self.processes:
                fn, args, kwargs = _isolate(fn, args, kwargs)
                child = Ctx(depth=(parent.depth + 1) if parent else 1, can_fork=False, kind='process')
                child.pid = self.pids[k]
                child.ppid = parent.pid if parent else PARENT_PID
                child.out = parent.out if parent else io.StringIO()
                child.stdin = io.StringIO('')
                child.process_obj = _ProcessInfo('SpawnPoolWorker-%d' % (k + 1), child.pid)
                _STACK.append(child)
                pushed = True
            elif parent is not None:
                _THREAD_IDS[0] += 1
                parent.current_thread = _PoolThread(self.names[k], _THREAD_IDS[0])
            try:
                value, ok = fn(*args, **kwargs), True
            except (_Exit, _Abort, _Cut):
                raise
            except BaseException as exc:
                value, ok = exc, False
        finally:
            if pushed:
                _STACK.pop()
            elif parent is not None:
                parent.current_thread = prev_thread
            end = _time()
            real = _ORIG.perf_counter() - real0
            # Process song song cả CPU: cha không phải chờ phần CPU thật đó.
            _Clock.offset = clock - (real if self.processes else 0.0)
        self.free[k] = end
        if self.processes:
            value = _copy_for_child(value, {})   # kết quả đi qua pickle về cha
        return ok, value, end


try:
    import concurrent.futures as _cf
    import concurrent.futures.thread  # noqa: F401  (để còn thay được lớp gốc)
except Exception:  # pragma: no cover
    _cf = None


if _cf is not None:
    class SimFuture(_cf.Future):
        """Future đã có kết quả từ lúc submit; result() kéo đồng hồ tới lúc việc xong."""

        _end = 0.0
        _seq = 0

        def done(self):
            return _time() >= self._end - 1e-9

        def running(self):
            return not self.done()

        def result(self, timeout=None):
            if timeout is not None and self._end - _time() > timeout:
                _advance(timeout)
                raise _cf.TimeoutError()
            _advance_to(self._end)
            return super().result(0)

        def exception(self, timeout=None):
            if timeout is not None and self._end - _time() > timeout:
                _advance(timeout)
                raise _cf.TimeoutError()
            _advance_to(self._end)
            return super().exception(0)

    class SimExecutor(_cf.Executor):
        _processes = False
        _kind = 'ThreadPoolExecutor'

        def __init__(self, max_workers=None, thread_name_prefix='', initializer=None, initargs=(), **_):
            if max_workers is None:
                max_workers = CPU_COUNT if self._processes else min(32, CPU_COUNT + 4)
            if max_workers <= 0:
                raise ValueError('max_workers must be greater than 0')
            prefix = thread_name_prefix or ('ThreadPoolExecutor-%d' % len(_ctx().pools if _ctx() else []))
            self._pool = _Workers(self._kind, max_workers, self._processes, prefix)
            self._max_workers = max_workers
            self._futures = []
            self._shutdown = False
            if initializer is not None:
                initializer(*initargs)

        def submit(self, fn, /, *args, **kwargs):
            if self._shutdown:
                raise RuntimeError('cannot schedule new futures after shutdown')
            ok, value, end = self._pool.run(fn, args, kwargs)
            fut = SimFuture()
            fut._end = end
            fut._seq = len(self._futures)
            if ok:
                fut.set_result(value)
            else:
                fut.set_exception(value)
            self._futures.append(fut)
            return fut

        def map(self, fn, *iterables, timeout=None, chunksize=1):
            futures = [self.submit(fn, *args) for args in zip(*iterables)]

            def results():
                for fut in futures:
                    yield fut.result(timeout)
            return results()

        def shutdown(self, wait=True, *, cancel_futures=False):
            self._shutdown = True
            if wait and self._futures:
                _advance_to(max(f._end for f in self._futures))

    class SimThreadPoolExecutor(SimExecutor):
        _processes = False
        _kind = 'ThreadPoolExecutor'

    class SimProcessPoolExecutor(SimExecutor):
        _processes = True
        _kind = 'ProcessPoolExecutor'

    def _as_completed(fs, timeout=None):
        started = _time()
        items = list(dict.fromkeys(fs))
        items.sort(key=lambda f: (getattr(f, '_end', 0.0), getattr(f, '_seq', 0)))
        for i, fut in enumerate(items):
            end = getattr(fut, '_end', None)
            if end is not None:
                if timeout is not None and end - started > timeout:
                    _advance_to(started + timeout)
                    raise _cf.TimeoutError('%d (of %d) futures unfinished' % (len(items) - i, len(items)))
                _advance_to(end)
            yield fut

    def _cf_wait(fs, timeout=None, return_when=_cf.ALL_COMPLETED):
        items = list(dict.fromkeys(fs))
        ends = [getattr(f, '_end', 0.0) for f in items]
        if items:
            target = min(ends) if return_when == _cf.FIRST_COMPLETED else max(ends)
            if timeout is not None:
                target = min(target, _time() + timeout)
            _advance_to(target)
        now = _time()
        done = {f for f in items if getattr(f, '_end', 0.0) <= now + 1e-9}
        return _cf._base.DoneAndNotDoneFutures(done, set(items) - done)


# ---------------------------------------------------------------- process mô phỏng

class ChildRecord:
    def __init__(self, k):
        self.k = k
        self.pid = CHILD_BASE + k
        self.exit_code = None
        self.exited = False         # thoát bằng os._exit / sys.exit
        self.leaked = False         # chạy hết chương trình mà không _exit
        self.error = None
        self.violation = None
        self.forced = False
        self.stdout = ''
        self.threads = []
        self.timeline = []

    # Cùng bộ câu hỏi với Result để ca chấm viết gọn.
    @property
    def thread_count(self):
        return len(self.threads)

    @property
    def starts_before_joins(self):
        return _starts_before_joins(self.timeline)

    @property
    def all_joined(self):
        return bool(self.threads) and all(t.joined for t in self.threads)

    def __repr__(self):
        return '<child pid=%s exit=%s>' % (self.pid, self.exit_code)


def _fork():
    ctx = _ctx()
    if ctx is None or not ctx.can_fork:
        raise StudioSetupError('os.fork() chỉ mô phỏng được khi chạy cả chương trình (_studio.run).')
    k = ctx.fork_calls
    ctx.fork_calls += 1
    if ctx.role == 'child':
        ctx.violation = 'grandchild'
        raise _Abort('Process con gọi os.fork() lần nữa nên sinh ra process cháu — '
                     'child phải os._exit() ngay sau khi làm xong việc.')
    if k >= MAX_CHILDREN:
        raise _Abort('Quá %d lần fork — kiểm tra vòng lặp tạo process.' % MAX_CHILDREN)
    if ctx.options.get('fail_fork_at') == k:
        raise OSError(errno.ENOMEM, 'Cannot allocate memory (fork lỗi mô phỏng)')
    if ctx.plan == k:
        ctx.role = 'child'
        ctx.pid = CHILD_BASE + k
        ctx.mark = ctx.pos()
        # Process con mới sinh: chưa có thread nào, chưa có con nào để chờ.
        ctx.threads = []
        ctx.timeline = []
        ctx.children = []
        ctx.reaped = set()
        ctx.waited = []
        return 0
    if ctx.clock_first_fork is None:
        ctx.clock_first_fork = _Clock.offset
        ctx.threads_before_fork = sum(1 for t in ctx.threads if t.started)
    rec = ctx.memo.get(k)
    if rec is None:
        rec = _simulate_child(k, ctx)
        ctx.memo[k] = rec
    ctx.children.append(rec)
    _Clock.offset += FORK_COST
    ctx.log('fork', rec.pid)
    # Child coi như chạy xong ngay sau khi tách ra: output của nó xen vào đây.
    ctx.out.write(rec.stdout)
    return rec.pid


def _simulate_child(k, parent):
    rec = ChildRecord(k)
    if parent.depth + 1 > MAX_DEPTH:
        rec.violation = 'depth'
        rec.exit_code = 1
        return rec
    sub = Ctx(depth=parent.depth + 1, plan=k, memo=parent.memo, options=parent.options)
    saved = _Clock.offset
    try:
        outcome = _execute(sub, _JOB['source'], _JOB['files'], _JOB.get('vars'), _JOB.get('entry'),
                           _JOB.get('setup'))
    finally:
        _Clock.offset = saved
    rec.threads = sub.threads
    rec.timeline = sub.timeline
    if sub.role != 'child':
        rec.violation = 'replay'
        rec.exit_code = 1
        rec.error = 'Không tái hiện được nhánh child (chương trình chạy khác nhau giữa các lần).'
        return rec
    rec.stdout = sub.out.getvalue()[sub.mark:]
    rec.violation = sub.violation
    if outcome['exit'] is not None:
        rec.exited = True
        rec.exit_code = outcome['exit']
    elif outcome['error']:
        rec.error = outcome['error']
        rec.exit_code = 1
    else:
        rec.leaked = True
        rec.exit_code = 0
    if sub.violation:
        rec.exit_code = 1
    forced = (parent.options.get('child_exit') or {}).get(k)
    if forced is not None:
        rec.exit_code = forced
        rec.forced = True
    return rec


def _waitpid(pid, options=0):
    ctx = _ctx()
    if ctx is None:
        raise ChildProcessError(errno.ECHILD, 'No child processes')
    pending = [c for c in ctx.children if c.pid not in ctx.reaped]
    if pid in (-1, 0):
        rec = pending[0] if pending else None
    else:
        rec = next((c for c in pending if c.pid == pid), None)
    if rec is None:
        raise ChildProcessError(errno.ECHILD, 'No child processes')
    ctx.reaped.add(rec.pid)
    ctx.waited.append(rec.pid)
    _Clock.offset += WAIT_COST
    ctx.clock_last_wait = _Clock.offset
    ctx.log('wait', rec.pid)
    return rec.pid, (int(rec.exit_code or 0) & 0xFF) << 8


def _wait():
    return _waitpid(-1, 0)


def _exit_now(code=0):
    ctx = _ctx()
    if ctx is not None:
        ctx.exit_code = code
    raise _Exit(code)


def _getpid():
    ctx = _ctx()
    return ctx.pid if ctx else PARENT_PID


def _getppid():
    ctx = _ctx()
    if ctx is not None and ctx.ppid is not None:
        return ctx.ppid
    return PARENT_PID if ctx and ctx.role == 'child' else 1


# ---------------------------------------------------------------- subprocess mô phỏng

class _TimedText(io.StringIO):
    """stdout/stderr của process con, nhớ đồng hồ ảo lúc ghi từng đoạn — để cắt
    đúng phần đã in khi con bị kill giữa chừng (timeout, terminate)."""

    def __init__(self):
        super().__init__()
        self.marks = []

    def write(self, s):
        n = super().write(s)
        self.marks.append((_Clock.offset, self.tell()))
        return n

    def upto(self, offset):
        pos = 0
        for at, p in self.marks:
            if at <= offset + 1e-9:
                pos = p
            else:
                break
        return self.getvalue()[:pos]


_PY_NAME = re.compile(r'^(python[\d.]*|py|pythonw)(\.exe)?$', re.I)
_PY_FLAGS = {'-u', '-B', '-E', '-I', '-s', '-S', '-q', '-O', '-OO', '-b', '-bb', '-d', '-v', '-x', '-P', '-i'}
_PY_USAGE = ('usage: python3 [option] ... [-c cmd | -m mod | file | -] [arg] ...\n'
             "Try `python -h' for more information.\n")


def _is_python(prog):
    if prog in (sys.executable, _ORIG.executable, FAKE_EXECUTABLE):
        return True
    return bool(_PY_NAME.match(prog.replace('\\', '/').rsplit('/', 1)[-1]))


class _Command:
    """Lệnh đã phân tích: chạy Python (-c / file / -m / stdin), echo, hay không có."""

    def __init__(self, args, shell=False, executable=None):
        if isinstance(args, (str, bytes, os.PathLike)):
            words = shlex.split(os.fsdecode(args))
        else:
            words = []
            for a in args:
                if not isinstance(a, (str, bytes, os.PathLike)):
                    raise TypeError('expected str, bytes or os.PathLike object, not %s' % type(a).__name__)
                words.append(os.fsdecode(a))
            if shell and words:
                words = shlex.split(words[0]) + words[1:]
        if not words:
            raise IndexError('list index out of range')
        self.words = words
        self.shell = shell
        self.prog = os.fsdecode(executable) if executable else words[0]
        self.kind = 'missing'
        self.code = None
        self.script = None
        self.module = None
        self.argv = []
        self.error = None          # (returncode, stderr) khi Python từ chối dòng lệnh
        base = self.prog.replace('\\', '/').rsplit('/', 1)[-1]
        if _is_python(self.prog):
            self.kind = 'python'
            self._parse_python(words[1:])
        elif base == 'echo':
            self.kind = 'echo'
        elif not shell:
            raise FileNotFoundError(errno.ENOENT, 'No such file or directory', self.prog)

    def _parse_python(self, rest):
        i = 0
        while i < len(rest):
            w = rest[i]
            if w == '-c':
                if i + 1 >= len(rest):
                    self.error = (2, 'Argument expected for the -c option\n' + _PY_USAGE)
                    return
                self.code = rest[i + 1]
                self.argv = ['-c'] + rest[i + 2:]
                return
            if w == '-m':
                if i + 1 >= len(rest):
                    self.error = (2, 'Argument expected for the -m option\n' + _PY_USAGE)
                    return
                self.module = rest[i + 1]
                self.argv = [rest[i + 1]] + rest[i + 2:]
                return
            if w in _PY_FLAGS or re.match(r'^-\d', w):
                i += 1
                continue
            if w in ('-W', '-X'):
                i += 2
                continue
            if w.startswith(('-W', '-X')):
                i += 1
                continue
            if w == '-':
                self.argv = ['-'] + rest[i + 1:]
                return
            if w.startswith('-'):
                self.error = (2, 'unknown option %s\n%s' % (w, _PY_USAGE))
                return
            self.script = w
            self.argv = rest[i:]
            return
        self.argv = ['']    # không có chương trình: python đọc code từ stdin

    def describe(self):
        return ' '.join(self.words)


class _ChildRun:
    def __init__(self):
        self.pid = None
        self.returncode = 0
        self.out = _TimedText()
        self.err = _TimedText()
        self.vstart = 0.0
        self.vdur = 0.0          # giây ảo con đã chạy
        self.real = 0.0          # giây CPU thật con đã chạy
        self.finished = True     # False = bị cắt (timeout) hoặc chạy mãi quá CHILD_TIME_CAP
        self.merged = False


def _child_traceback(exc, names):
    frames = [f for f in traceback.extract_tb(exc.__traceback__)
              if f.filename in names or (not f.filename.startswith('<') and '/lib/' not in f.filename
                                         and 'studio-harness' not in f.filename
                                         and 'site-packages' not in f.filename)]
    lines = ['Traceback (most recent call last):\n'] if frames else []
    for f in frames:
        lines.append('  File "%s", line %s, in %s\n' % (f.filename, f.lineno, f.name))
        if f.line and f.filename != '<string>':
            lines.append('    %s\n' % f.line)
    lines.extend(traceback.format_exception_only(type(exc), exc))
    return ''.join(lines)


def _spawn(cmd, stdin_text, cwd=None, env=None, timeout=None, merge=False):
    """Chạy chương trình con NGAY (đồng bộ). Trả _ChildRun; đồng hồ ảo được trả về như cũ."""
    parent = _ctx()
    run = _ChildRun()
    run.pid = _next_pid()
    run.merged = merge
    if merge:
        run.err = run.out
    run.vstart = _Clock.offset
    if cmd.kind == 'echo':
        run.out.write(' '.join(cmd.words[1:]) + '\n')
        return run
    if cmd.kind == 'missing':
        run.err.write('/bin/sh: 1: %s: not found\n' % cmd.prog)
        run.returncode = 127
        return run
    if cmd.error:
        run.returncode, message = cmd.error
        run.err.write(message)
        return run

    ctx = Ctx(depth=(parent.depth + 1) if parent else 1, can_fork=False, kind='subprocess')
    ctx.role = 'subprocess'
    ctx.pid = run.pid
    ctx.ppid = parent.pid if parent else PARENT_PID
    ctx.stdin = stdin_text if hasattr(stdin_text, 'readline') else io.StringIO(stdin_text or '')
    ctx.out = run.out
    limit = CHILD_TIME_CAP if timeout is None else min(float(timeout), CHILD_TIME_CAP)
    ctx.deadline = _Clock.offset + max(0.0, limit)

    saved_argv = list(sys.argv)
    saved_cwd = os.getcwd()
    saved_env = None
    real0 = _ORIG.perf_counter()
    _STACK.append(ctx)
    names = {'<string>', '<stdin>'}
    try:
        with redirect_stdout(run.out), redirect_stderr(run.err), _redirect_stdin(ctx.stdin):
            try:
                if cwd is not None:
                    os.chdir(os.fsdecode(cwd))
                if env is not None:
                    saved_env = dict(os.environ)
                    os.environ.clear()
                    os.environ.update({str(k): str(v) for k, v in env.items()})
                ns = {'__name__': '__main__', '__builtins__': builtins}
                if cmd.code is not None:
                    source, filename = cmd.code, '<string>'
                elif cmd.script is not None:
                    path = os.path.abspath(cmd.script)
                    if not os.path.isfile(path):
                        run.err.write("python3: can't open file %r: [Errno 2] No such file or directory\n" % path)
                        run.returncode = 2
                        return run
                    with open(path, encoding='utf-8') as fh:
                        source = fh.read()
                    filename = cmd.script
                    names.add(filename)
                    ns['__file__'] = path
                    linecache.cache[filename] = (len(source), None, source.splitlines(True), filename)
                elif cmd.module is not None:
                    path = os.path.abspath(cmd.module.replace('.', '/') + '.py')
                    if os.path.isfile(path):
                        with open(path, encoding='utf-8') as fh:
                            source = fh.read()
                        filename = os.path.basename(path)
                        names.add(filename)
                        ns['__file__'] = path
                    else:
                        import runpy
                        sys.argv = list(cmd.argv)
                        source, filename = None, None
                        try:
                            runpy.run_module(cmd.module, run_name='__main__', alter_sys=False)
                        except ImportError:
                            run.err.write('/usr/bin/python3: No module named %s\n' % cmd.module)
                            run.returncode = 1
                            return run
                else:
                    source, filename = ctx.stdin.read(), '<stdin>'
                if source is not None:
                    sys.argv = list(cmd.argv)
                    exec(compile(source, filename, 'exec'), ns)
                if ctx.timers:
                    _run_due_timers(ctx)
            except _Cut:
                run.finished = False
                run.returncode = -SIGKILL
            except _Exit as stop:
                run.returncode = stop.code if isinstance(stop.code, int) else 1
            except SystemExit as stop:
                code = stop.code
                if code is None:
                    run.returncode = 0
                elif isinstance(code, int):
                    run.returncode = code
                else:
                    print(code, file=sys.stderr)
                    run.returncode = 1
            except _Deadlock as exc:
                run.err.write('[mô phỏng] %s\n' % exc)
                run.returncode = 1
            except BaseException as exc:
                if isinstance(exc, _Abort):
                    raise
                run.err.write(_child_traceback(exc, names))
                run.returncode = 1
    finally:
        _STACK.pop()
        sys.argv = saved_argv
        os.chdir(saved_cwd)
        if saved_env is not None:
            os.environ.clear()
            os.environ.update(saved_env)
        run.real = _ORIG.perf_counter() - real0
        run.vdur = _Clock.offset - run.vstart
        _Clock.offset = run.vstart
    return run


def _is_text(text, universal_newlines, encoding, errors):
    return bool(text or universal_newlines or encoding or errors)


def _as_mode(value, text_mode):
    if value is None:
        return None
    return value if text_mode else value.encode('utf-8')


def _input_text(data, text_mode):
    """input= của run()/communicate() -> chuỗi stdin cho con (kiểm kiểu như CPython)."""
    if data is None:
        return ''
    if text_mode:
        if not isinstance(data, str):
            raise TypeError('write() argument must be str, not %s' % type(data).__name__)
        return data
    if isinstance(data, str):
        raise TypeError("memoryview: a bytes-like object is required, not 'str'")
    return bytes(data).decode('utf-8', 'replace')


def _stdin_source(stdin):
    """Nguồn stdin của con: None = dùng chung stdin của cha."""
    if stdin is None:
        ctx = _ctx()
        return ctx.stdin if ctx is not None else _loose_stdin()
    if stdin == subprocess.DEVNULL:
        return ''
    if isinstance(stdin, _PipeReader):
        data = stdin.read()
        return data if isinstance(data, str) else data.decode('utf-8', 'replace')
    if hasattr(stdin, 'read'):
        data = stdin.read()
        return data if isinstance(data, str) else data.decode('utf-8', 'replace')
    return ''


def _emit(target, text, text_mode, is_err):
    """Đưa output của con tới nơi cha chỉ định (thừa kế / DEVNULL / file)."""
    if not text or target in (subprocess.PIPE, subprocess.DEVNULL):
        return
    if target is None or target == subprocess.STDOUT:
        (sys.stderr if is_err else sys.stdout).write(text)
        return
    if hasattr(target, 'write'):
        try:
            target.write(text)
        except TypeError:
            target.write(text.encode('utf-8'))


def _record(kind, args, **fields):
    ctx = _ctx()
    entry = {'kind': kind, 'args': args, 'returncode': None, 'stdout': '', 'stderr': '', 'input': None,
             'timeout': None, 'timed_out': False, 'killed': False, 'check': False, 'text': False, 'pid': None}
    entry.update(fields)
    if ctx is not None:
        ctx.subprocess_calls.append(entry)
    return entry


def _sp_run(*popenargs, input=None, capture_output=False, timeout=None, check=False, _kind='run', **kwargs):
    if not popenargs and 'args' in kwargs:
        popenargs = (kwargs.pop('args'),)
    args = popenargs[0] if popenargs else None
    if args is None:
        raise TypeError("run() missing 1 required positional argument: 'args'")
    if input is not None and kwargs.get('stdin') is not None:
        raise ValueError('stdin and input arguments may not both be used.')
    if capture_output:
        if kwargs.get('stdout') is not None or kwargs.get('stderr') is not None:
            raise ValueError('stdout and stderr arguments may not be used with capture_output.')
        kwargs['stdout'] = subprocess.PIPE
        kwargs['stderr'] = subprocess.PIPE
    stdout, stderr = kwargs.get('stdout'), kwargs.get('stderr')
    text_mode = _is_text(kwargs.get('text'), kwargs.get('universal_newlines'), kwargs.get('encoding'),
                         kwargs.get('errors'))
    cmd = _Command(args, kwargs.get('shell', False), kwargs.get('executable'))
    stdin_text = _input_text(input, text_mode) if input is not None else _stdin_source(kwargs.get('stdin'))
    merge = stderr == subprocess.STDOUT
    run = _spawn(cmd, stdin_text, kwargs.get('cwd'), kwargs.get('env'), timeout, merge)
    entry = _record(_kind, args, input=stdin_text if isinstance(stdin_text, str) else None,
                    timeout=timeout, check=bool(check), text=text_mode, pid=run.pid)
    timed_out = timeout is not None and (not run.finished or run.vdur > timeout + 1e-9)
    if timed_out:
        cut = run.vstart + float(timeout)
        out_text, err_text = run.out.upto(cut), ('' if merge else run.err.upto(cut))
        _advance(float(timeout))
        _emit(stdout, out_text, text_mode, False)
        if not merge:
            _emit(stderr, err_text, text_mode, True)
        entry.update(returncode=-SIGKILL, stdout=out_text, stderr=err_text, timed_out=True, killed=True)
        raise subprocess.TimeoutExpired(args, timeout,
                                        output=_as_mode(out_text, text_mode) if stdout == subprocess.PIPE else None,
                                        stderr=_as_mode(err_text, text_mode) if stderr == subprocess.PIPE else None)
    if not run.finished:
        raise _Deadlock('Chương trình con chạy quá %d giây ảo mà chưa xong — run() không có timeout= '
                        'sẽ chờ mãi' % CHILD_TIME_CAP)
    _advance(run.vdur)
    out_text = run.out.getvalue()
    err_text = '' if merge else run.err.getvalue()
    _emit(stdout, out_text, text_mode, False)
    if not merge:
        _emit(stderr, err_text, text_mode, True)
    entry.update(returncode=run.returncode, stdout=out_text, stderr=err_text)
    result = subprocess.CompletedProcess(
        args, run.returncode,
        _as_mode(out_text, text_mode) if stdout == subprocess.PIPE else None,
        _as_mode(err_text, text_mode) if stderr == subprocess.PIPE else None)
    if check and run.returncode:
        raise subprocess.CalledProcessError(run.returncode, args, output=result.stdout, stderr=result.stderr)
    return result


def _sp_check_output(*popenargs, timeout=None, **kwargs):
    if 'stdout' in kwargs:
        raise ValueError('stdout argument not allowed, it will be overridden.')
    return _sp_run(*popenargs, stdout=subprocess.PIPE, timeout=timeout, check=True, _kind='check_output',
                   **kwargs).stdout


def _sp_call(*popenargs, timeout=None, **kwargs):
    return _sp_run(*popenargs, timeout=timeout, _kind='call', **kwargs).returncode


def _sp_check_call(*popenargs, timeout=None, **kwargs):
    _sp_run(*popenargs, timeout=timeout, check=True, _kind='check_call', **kwargs)
    return 0


def _sp_getstatusoutput(cmd, *, encoding=None, errors=None):
    try:
        res = _sp_run(cmd, shell=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                      _kind='getstatusoutput')
        data, code = res.stdout, res.returncode
    except subprocess.CalledProcessError as exc:
        data, code = exc.output, exc.returncode
    if data[-1:] == '\n':
        data = data[:-1]
    return code, data


def _sp_getoutput(cmd, *, encoding=None, errors=None):
    return _sp_getstatusoutput(cmd)[1]


def _os_system(command):
    res = _sp_run(command, shell=True, _kind='os.system')
    return (res.returncode & 0xFF) << 8


class _PipeReader:
    """Popen.stdout / Popen.stderr khi là PIPE. Đọc tới EOF = chờ con kết thúc."""

    def __init__(self, proc, which, text_mode):
        self._proc = proc
        self._which = which
        self._text = text_mode
        self._pos = 0
        self.closed = False

    def _data(self):
        self._proc._finish_for_read()
        text = self._proc._stream_text(self._which)
        return text if self._text else text.encode('utf-8')

    def read(self, size=-1):
        if self.closed:
            raise ValueError('I/O operation on closed file.')
        data = self._data()
        chunk = data[self._pos:] if size is None or size < 0 else data[self._pos:self._pos + size]
        self._pos += len(chunk)
        return chunk

    def readline(self, size=-1):
        data = self._data()
        nl = '\n' if self._text else b'\n'
        end = data.find(nl, self._pos)
        end = len(data) if end < 0 else end + 1
        chunk = data[self._pos:end]
        self._pos = end
        return chunk

    def readlines(self, hint=-1):
        lines = []
        while True:
            line = self.readline()
            if not line:
                return lines
            lines.append(line)

    def __iter__(self):
        while True:
            line = self.readline()
            if not line:
                return
            yield line

    def close(self):
        self.closed = True

    def readable(self):
        return True

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()


class _PipeWriter:
    """Popen.stdin khi là PIPE: gom dữ liệu, đóng lại thì con mới chạy."""

    def __init__(self, proc, text_mode):
        self._proc = proc
        self._text = text_mode
        self._parts = []
        self.closed = False

    def write(self, data):
        if self.closed:
            raise ValueError('I/O operation on closed file.')
        if self._text and not isinstance(data, str):
            raise TypeError('write() argument must be str, not %s' % type(data).__name__)
        if not self._text and isinstance(data, str):
            raise TypeError("a bytes-like object is required, not 'str'")
        self._parts.append(data if isinstance(data, str) else bytes(data).decode('utf-8', 'replace'))
        return len(data)

    def writelines(self, lines):
        for line in lines:
            self.write(line)

    def flush(self):
        pass

    def writable(self):
        return True

    def text(self):
        return ''.join(self._parts)

    def close(self):
        if not self.closed:
            self.closed = True
            self._proc._launch(self.text())

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()


class SimPopen:
    """subprocess.Popen mô phỏng.

    Con chạy ngay lúc tạo (hoặc lúc stdin PIPE được đóng / communicate()), xong
    xuôi trong một lần, nhưng thời điểm nó "kết thúc" theo đồng hồ ảo được giữ
    lại: poll() trả None cho tới khi đồng hồ của cha vượt mốc đó, wait()/
    communicate() kéo đồng hồ tới mốc, terminate()/kill() cắt output tại lúc gọi.
    communicate(timeout=) hết hạn KHÔNG giết con — giống CPython.
    """

    def __init__(self, args, bufsize=-1, executable=None, stdin=None, stdout=None, stderr=None,
                 preexec_fn=None, close_fds=True, shell=False, cwd=None, env=None, universal_newlines=None,
                 startupinfo=None, creationflags=0, restore_signals=True, start_new_session=False,
                 pass_fds=(), *, user=None, group=None, extra_groups=None, encoding=None, errors=None,
                 text=None, umask=-1, pipesize=-1, process_group=None):
        self.args = args
        self._cmd = _Command(args, shell, executable)
        self.text_mode = _is_text(text, universal_newlines, encoding, errors)
        self.universal_newlines = self.text_mode
        self._targets = (stdout, stderr)
        self._cwd, self._env = cwd, env
        self._merge = stderr == subprocess.STDOUT
        self.returncode = None
        self._run = None
        self._launched = False
        self._start_T = _time()
        self._end_T = None
        self._kill_code = None
        self._cut = None
        self._flushed = False
        self.stdin = _PipeWriter(self, self.text_mode) if stdin == subprocess.PIPE else None
        self.stdout = _PipeReader(self, 'stdout', self.text_mode) if stdout == subprocess.PIPE else None
        self.stderr = _PipeReader(self, 'stderr', self.text_mode) if stderr == subprocess.PIPE else None
        self.pid = None
        self._entry = _record('Popen', args, text=self.text_mode)
        ctx = _ctx()
        if ctx is not None:
            ctx.open_popens.append(self)
        if stdin != subprocess.PIPE:
            self._launch(_stdin_source(stdin))

    # ---- bên trong
    def _launch(self, stdin_text):
        if self._launched:
            return
        self._launched = True
        self._entry['input'] = stdin_text if isinstance(stdin_text, str) else None
        self._start_T = _time()
        clock = _Clock.offset
        run = _spawn(self._cmd, stdin_text, self._cwd, self._env, None, self._merge)
        # Popen không chặn: cha không đứng chờ con chạy, kể cả phần CPU thật.
        _Clock.offset = clock - run.real
        self._run = run
        self.pid = run.pid
        self._entry['pid'] = run.pid
        self._end_T = self._start_T + run.real + run.vdur if run.finished else float('inf')

    def _stream_text(self, which):
        run = self._run
        if run is None:
            return ''
        stream = run.out if which == 'stdout' else run.err
        if which == 'stderr' and self._merge:
            return ''
        return stream.upto(self._cut) if self._cut is not None else stream.getvalue()

    def _settle(self):
        """Con đã kết thúc (theo đồng hồ của cha): chốt returncode, xả output thừa kế."""
        if self.returncode is not None:
            return
        if self._kill_code is not None:
            self.returncode = self._kill_code
        else:
            self.returncode = self._run.returncode if self._run is not None else 0
        out, err = self._stream_text('stdout'), self._stream_text('stderr')
        if not self._flushed:
            self._flushed = True
            _emit(self._targets[0], out, self.text_mode, False)
            if not self._merge:
                _emit(self._targets[1], err, self.text_mode, True)
        self._entry.update(returncode=self.returncode, stdout=out, stderr=err,
                           killed=self._kill_code is not None)
        ctx = _ctx()
        if ctx is not None and self in ctx.open_popens:
            ctx.open_popens.remove(self)

    def _ensure_launched(self):
        if not self._launched:
            self._launch(self.stdin.text() if self.stdin is not None else '')
            if self.stdin is not None:
                self.stdin.closed = True

    def _wait_until_end(self, timeout, what):
        self._ensure_launched()
        if self.returncode is not None:
            return
        if self._end_T == float('inf') and timeout is None:
            raise _Deadlock('%s: chương trình con chạy quá %d giây ảo mà chưa xong (vòng lặp vô hạn?) — '
                            'dùng timeout= rồi kill()' % (what, CHILD_TIME_CAP))
        if timeout is not None and self._end_T - _time() > timeout + 1e-9:
            _advance(timeout)
            raise subprocess.TimeoutExpired(self.args, timeout)
        _advance_to(self._end_T)
        self._settle()

    def _finish_for_read(self):
        self._wait_until_end(None, 'Đọc stdout/stderr tới hết')

    # ---- API
    def poll(self):
        if not self._launched or self.returncode is not None:
            return self.returncode
        if _time() >= self._end_T - 1e-9:
            self._settle()
        return self.returncode

    def wait(self, timeout=None):
        self._wait_until_end(timeout, 'wait()')
        return self.returncode

    def communicate(self, input=None, timeout=None):
        if not self._launched and self.stdin is not None:
            extra = _input_text(input, self.text_mode) if input is not None else ''
            self.stdin.closed = True
            self._launch(self.stdin.text() + extra)
        self._wait_until_end(timeout, 'communicate()')
        out = self.stdout.read() if self.stdout is not None and not self.stdout.closed else None
        err = self.stderr.read() if self.stderr is not None and not self.stderr.closed else None
        return out, err

    def send_signal(self, sig):
        if self.returncode is not None:
            return
        now = _time()
        if not self._launched:
            self._launched = True
            self._run = None
            self._end_T = now
            self._kill_code = -int(sig)
            return
        if now < self._end_T - 1e-9:
            elapsed = now - self._start_T
            self._cut = self._run.vstart + max(0.0, elapsed - self._run.real)
            self._end_T = now
            self._kill_code = -int(sig)

    def terminate(self):
        self.send_signal(SIGTERM)

    def kill(self):
        self.send_signal(SIGKILL)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        for pipe in (self.stdout, self.stderr):
            if pipe is not None:
                pipe.close()
        if self.stdin is not None and not self.stdin.closed:
            self.stdin.close()
        if exc_type is None or issubclass(exc_type, Exception):
            try:
                self.wait()
            except _Deadlock:
                if exc_type is None:
                    raise

    def __repr__(self):
        return '<Popen: returncode: %s args: %r>' % (self.returncode, self.args)


def _flush_popens(ctx):
    """Hết chương trình: con chưa ai chờ vẫn in ra (nó chạy song song với cha)."""
    for proc in list(ctx.open_popens):
        if proc._launched and proc._run is not None and not proc._flushed:
            proc._flushed = True
            _emit(proc._targets[0], proc._stream_text('stdout'), proc.text_mode, False)
            if not proc._merge:
                _emit(proc._targets[1], proc._stream_text('stderr'), proc.text_mode, True)


# ---------------------------------------------------------------- multiprocessing (module giả)

class _ProcessInfo:
    def __init__(self, name, pid):
        self.name = name
        self.pid = self.ident = pid
        self.daemon = False

    def is_alive(self):
        return True

    def __repr__(self):
        return '<_MainProcess name=%r>' % self.name if self.name == 'MainProcess' else '<%s>' % self.name


class _Shared:
    """Đối tượng DÙNG CHUNG giữa các process: sao chép (deepcopy) trả lại chính nó."""

    def __deepcopy__(self, memo):
        return self

    def __copy__(self):
        return self

    def __reduce_ex__(self, protocol):  # pickle trong con cũng giữ nguyên tham chiếu
        raise TypeError('đối tượng multiprocessing mô phỏng không pickle được')


class SimProcess:
    """multiprocessing.Process: target chạy ngay khi start() trên bản sao bộ nhớ."""

    def __init__(self, group=None, target=None, name=None, args=(), kwargs=None, *, daemon=None):
        ctx = _ctx()
        _MP_SEQ[0] += 1
        self._name = name or 'Process-%d' % _MP_SEQ[0]
        self._target = target
        self._args = tuple(args)
        self._kwargs = dict(kwargs or {})
        self.daemon = bool(daemon)
        self.index = len(ctx.processes) if ctx else 0
        self._pid = None
        self.started = False
        self.joined = False
        self.output = ''
        self.error = None
        self.threads = []
        self._code = None
        self._end = None
        self._killed = None
        self.target_callable = callable(target)
        self.target_name = getattr(target, '__name__', None) if target is not None else None
        if ctx is not None:
            ctx.processes.append(self)
            ctx.log('process', self.index)

    name = property(lambda self: self._name, lambda self, v: setattr(self, '_name', v))
    pid = property(lambda self: self._pid)
    ident = pid

    def run(self):
        if self._target is not None:
            self._target(*self._args, **self._kwargs)

    def start(self):
        if self.started:
            raise AssertionError('cannot start a process twice')
        parent = _ctx()
        self.started = True
        self._pid = _next_pid()
        if parent is not None:
            parent.log('pstart', self.index)
        if type(self).run is SimProcess.run:
            fn, args, kwargs = _isolate(self._target, self._args, self._kwargs) if self._target else (None, (), {})

            def body():
                if fn is not None:
                    fn(*args, **kwargs)
        else:
            body = _copy_for_child(self, {}).run
        child = Ctx(depth=(parent.depth + 1) if parent else 1, can_fork=False, kind='process')
        child.pid = self._pid
        child.ppid = parent.pid if parent else PARENT_PID
        child.out = parent.out if parent else io.StringIO()
        child.stdin = io.StringIO('')      # stdin của process con là /dev/null
        child.process_obj = self
        mark = child.pos()
        start = _time()
        clock = _Clock.offset
        real0 = _ORIG.perf_counter()
        code = 0
        _STACK.append(child)
        try:
            try:
                body()
                if child.timers:
                    _run_due_timers(child)
            except _Exit as stop:
                code = stop.code if isinstance(stop.code, int) else 1
            except SystemExit as stop:
                if stop.code is None:
                    code = 0
                elif isinstance(stop.code, int):
                    code = stop.code
                else:
                    print(stop.code, file=sys.stderr)
                    code = 1
            except (_Abort, _Cut):
                raise
            except BaseException as exc:
                code = 1
                self.error = exc
                sys.stderr.write('Process %s:\n%s' % (self._name, _format_exc(exc)))
        finally:
            _STACK.pop()
            real = _ORIG.perf_counter() - real0
            self._end = start + real + (_Clock.offset - clock)
            # Cha không chờ con (kể cả CPU thật): process chạy song song.
            _Clock.offset = clock - real
        self._code = code
        self.threads = child.threads
        self.output = child.out.getvalue()[mark:]

    def join(self, timeout=None):
        if not self.started:
            raise AssertionError('can only join a started process')
        ctx = _ctx()
        if ctx is not None:
            ctx.log('pjoin', self.index)
        if timeout is None:
            _advance_to(self._end)
        else:
            _advance(min(max(0.0, timeout), self._end - _time()))
        self.joined = True

    def is_alive(self):
        return self.started and self._killed is None and _time() < self._end - 1e-9

    @property
    def exitcode(self):
        if not self.started or self.is_alive():
            return None
        return self._killed if self._killed is not None else self._code

    def terminate(self):
        if self.is_alive():
            self._killed = -SIGTERM
            self._end = _time()

    def kill(self):
        if self.is_alive():
            self._killed = -SIGKILL
            self._end = _time()

    def close(self):
        pass

    def __deepcopy__(self, memo):
        clone = copy.copy(self)
        memo[id(self)] = clone
        for key, value in self.__dict__.items():
            clone.__dict__[key] = _copy_for_child(value, memo)
        return clone

    def __repr__(self):
        if not self.started:
            state = 'initial'
        elif self.is_alive():
            state = 'started'
        else:
            state = 'stopped exitcode=%s' % self.exitcode
        return '<Process name=%r pid=%s parent=%s %s>' % (self._name, self._pid, PARENT_PID, state)


class SimMPQueue(_Shared):
    """multiprocessing.Queue: dữ liệu đi qua "pickle" (bản sao), dùng chung giữa các process."""

    def __init__(self, maxsize=0, *, ctx=None):
        self._items = []
        self.maxsize = maxsize
        self._unfinished = 0
        self._closed = False

    def put(self, obj, block=True, timeout=None):
        if self._closed:
            raise ValueError('Queue %r is closed' % self)
        self._items.append(copy.deepcopy(obj))
        self._unfinished += 1

    def put_nowait(self, obj):
        self.put(obj, False)

    def get(self, block=True, timeout=None):
        if self._items:
            return self._items.pop(0)
        if not block:
            raise queue.Empty
        if timeout is not None:
            _advance(max(0.0, timeout))
            raise queue.Empty
        _deadlock('multiprocessing.Queue.get() trên hàng đợi rỗng')

    def get_nowait(self):
        return self.get(False)

    def qsize(self):
        return len(self._items)

    def empty(self):
        return not self._items

    def full(self):
        return self.maxsize > 0 and len(self._items) >= self.maxsize

    def close(self):
        self._closed = True

    def join_thread(self):
        pass

    def cancel_join_thread(self):
        pass

    def task_done(self):
        if self._unfinished <= 0:
            raise ValueError('task_done() called too many times')
        self._unfinished -= 1

    def join(self):
        if self._unfinished > 0:
            _deadlock('JoinableQueue.join() khi còn %d việc chưa task_done()' % self._unfinished)


class _SimConnection(_Shared):
    def __init__(self, inbox, outbox):
        self._inbox, self._outbox = inbox, outbox
        self.closed = False

    def send(self, obj):
        self._outbox.append(copy.deepcopy(obj))

    def recv(self):
        if self._inbox:
            return self._inbox.pop(0)
        _deadlock('Connection.recv() khi đầu kia chưa gửi gì')

    def poll(self, timeout=0.0):
        if not self._inbox and timeout:
            _advance(timeout or 0.0)
        return bool(self._inbox)

    def send_bytes(self, data):
        self.send(bytes(data))

    def recv_bytes(self):
        return self.recv()

    def close(self):
        self.closed = True


def _sim_pipe(duplex=True):
    a, b = [], []
    return _SimConnection(a, b), _SimConnection(b, a)


class SimValue(_Shared):
    def __init__(self, typecode_or_type, *args, lock=True):
        self.typecode = typecode_or_type
        self.value = args[0] if args else (0.0 if typecode_or_type in ('d', 'f') else 0)
        self._lock = SimRLock()

    def get_lock(self):
        return self._lock

    def get_obj(self):
        return self

    def acquire(self, *a):
        return self._lock.acquire(*a)

    def release(self):
        return self._lock.release()

    def __enter__(self):
        return self._lock.__enter__()

    def __exit__(self, *exc):
        return self._lock.__exit__(*exc)

    def __repr__(self):
        return '<Synchronized wrapper for c_%s(%r)>' % (self.typecode, self.value)


class SimArray(_Shared):
    def __init__(self, typecode_or_type, size_or_initializer, *, lock=True):
        self.typecode = typecode_or_type
        if isinstance(size_or_initializer, int):
            self._data = [0.0 if typecode_or_type in ('d', 'f') else 0] * size_or_initializer
        else:
            self._data = list(size_or_initializer)
        self._lock = SimRLock()

    def __getitem__(self, i):
        return self._data[i]

    def __setitem__(self, i, v):
        self._data[i] = v

    def __len__(self):
        return len(self._data)

    def __iter__(self):
        return iter(list(self._data))

    def get_lock(self):
        return self._lock

    def get_obj(self):
        return self

    def __enter__(self):
        return self._lock.__enter__()

    def __exit__(self, *exc):
        return self._lock.__exit__(*exc)

    def __repr__(self):
        return '<SynchronizedArray wrapper for %r>' % (self._data,)


class _SharedList(list):
    def __deepcopy__(self, memo):
        return self


class _SharedDict(dict):
    def __deepcopy__(self, memo):
        return self


class _SharedNamespace(_Shared):
    pass


class _SharedLock(SimLock, _Shared):
    pass


class _SharedRLock(SimRLock, _Shared):
    pass


class _SharedEvent(_Shared):
    def __init__(self):
        self._flag = False

    def set(self):
        self._flag = True

    def clear(self):
        self._flag = False

    def is_set(self):
        return self._flag

    def wait(self, timeout=None):
        if self._flag:
            return True
        if timeout is None:
            _deadlock('Event.wait() khi chưa ai set()')
        _advance(timeout)
        return False


class _SharedSemaphore(_Shared):
    def __init__(self, value=1):
        self._value = value

    def acquire(self, blocking=True, timeout=None):
        if self._value > 0:
            self._value -= 1
            return True
        if not blocking:
            return False
        if timeout is not None:
            _advance(timeout)
            return False
        _deadlock('Semaphore.acquire() khi không còn chỗ')

    def release(self, n=1):
        self._value += n

    __enter__ = acquire

    def __exit__(self, *exc):
        self.release()

    def get_value(self):
        return self._value


class SimManager:
    def __init__(self, *a, **k):
        pass

    def start(self, *a, **k):
        return None

    def shutdown(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.shutdown()

    def list(self, seq=()):
        return _SharedList(seq)

    def dict(self, *a, **k):
        return _SharedDict(*a, **k)

    def Value(self, typecode, value, lock=True):
        return SimValue(typecode, value)

    def Array(self, typecode, seq, lock=True):
        return SimArray(typecode, seq)

    def Queue(self, maxsize=0):
        return SimMPQueue(maxsize)

    JoinableQueue = Queue

    def Lock(self):
        return _SharedLock()

    def RLock(self):
        return _SharedRLock()

    def Event(self):
        return _SharedEvent()

    def Semaphore(self, value=1):
        return _SharedSemaphore(value)

    def Namespace(self, **kw):
        ns = _SharedNamespace()
        ns.__dict__.update(kw)
        return ns


class _AsyncResult:
    def __init__(self, futures, single, callback=None, error_callback=None):
        self._futures = futures
        self._single = single
        failed = next((f for f in futures if not f[0]), None)
        if failed is None and callback is not None:
            callback(futures[0][1] if single else [f[1] for f in futures])
        if failed is not None and error_callback is not None:
            error_callback(failed[1])

    def _end(self):
        return max((f[2] for f in self._futures), default=_time())

    def ready(self):
        return _time() >= self._end() - 1e-9

    def successful(self):
        if not self.ready():
            raise ValueError('%r not ready' % self)
        return all(f[0] for f in self._futures)

    def wait(self, timeout=None):
        _advance_to(self._end() if timeout is None else min(self._end(), _time() + timeout))

    def get(self, timeout=None):
        if timeout is not None and self._end() - _time() > timeout:
            _advance(timeout)
            raise _MP_TIMEOUT()
        _advance_to(self._end())
        for ok, value, _ in self._futures:
            if not ok:
                raise value
        values = [f[1] for f in self._futures]
        return values[0] if self._single else values


class _MP_TIMEOUT(Exception):
    pass


_MP_TIMEOUT.__name__ = 'TimeoutError'


class SimPool:
    """multiprocessing.Pool / pool.ThreadPool: việc chạy ngay, xếp lịch trên `processes` worker."""

    _isolate = True
    _kind = 'Pool'

    def __init__(self, processes=None, initializer=None, initargs=(), maxtasksperchild=None, context=None):
        if processes is not None and processes < 1:
            raise ValueError('Number of processes must be at least 1')
        self._workers = _Workers(self._kind, processes or CPU_COUNT, self._isolate,
                                 'ForkPoolWorker' if self._isolate else 'Thread')
        self._processes = self._workers.workers
        self._state = 'RUN'
        self._results = []
        if initializer is not None:
            initializer(*initargs)

    def _check(self):
        if self._state != 'RUN':
            raise ValueError('Pool not running')

    def _submit(self, func, args=(), kwds=None):
        self._check()
        res = self._workers.run(func, tuple(args), dict(kwds or {}))
        self._results.append(res)
        return res

    def apply(self, func, args=(), kwds=None):
        return self.apply_async(func, args, kwds).get()

    def apply_async(self, func, args=(), kwds=None, callback=None, error_callback=None):
        return _AsyncResult([self._submit(func, args, kwds)], True, callback, error_callback)

    def map_async(self, func, iterable, chunksize=None, callback=None, error_callback=None):
        return _AsyncResult([self._submit(func, (x,)) for x in iterable], False, callback, error_callback)

    def map(self, func, iterable, chunksize=None):
        return self.map_async(func, iterable).get()

    def starmap_async(self, func, iterable, chunksize=None, callback=None, error_callback=None):
        return _AsyncResult([self._submit(func, tuple(a)) for a in iterable], False, callback, error_callback)

    def starmap(self, func, iterable, chunksize=None):
        return self.starmap_async(func, iterable).get()

    def imap(self, func, iterable, chunksize=1):
        results = [self._submit(func, (x,)) for x in iterable]

        def gen():
            for ok, value, end in results:
                _advance_to(end)
                if not ok:
                    raise value
                yield value
        return gen()

    def imap_unordered(self, func, iterable, chunksize=1):
        results = [self._submit(func, (x,)) for x in iterable]

        def gen():
            for ok, value, end in sorted(results, key=lambda r: r[2]):
                _advance_to(end)
                if not ok:
                    raise value
                yield value
        return gen()

    def close(self):
        if self._state == 'RUN':
            self._state = 'CLOSE'

    def terminate(self):
        self._state = 'TERMINATE'

    def join(self):
        if self._state == 'RUN':
            raise ValueError('Pool is still running')
        if self._results:
            _advance_to(max(r[2] for r in self._results))

    def __enter__(self):
        self._check()
        return self

    def __exit__(self, *exc):
        self.terminate()


class SimThreadPool(SimPool):
    _isolate = False
    _kind = 'ThreadPool'


def _mp_current_process():
    ctx = _ctx()
    while ctx is not None:
        if ctx.process_obj is not None:
            return ctx.process_obj
        break
    return _ProcessInfo('MainProcess', _getpid())


def _mp_parent_process():
    ctx = _ctx()
    if ctx is not None and ctx.process_obj is not None:
        return _ProcessInfo('MainProcess', ctx.ppid or PARENT_PID)
    return None


def _mp_active_children():
    ctx = _ctx()
    return [p for p in (ctx.processes if ctx else []) if p.is_alive()]


def _build_multiprocessing():
    mp = types.ModuleType('multiprocessing')
    mp.__doc__ = 'multiprocessing MÔ PHỎNG của Python Studio (studio-harness.py).'
    names = {
        'Process': SimProcess, 'Queue': SimMPQueue, 'JoinableQueue': SimMPQueue, 'SimpleQueue': SimMPQueue,
        'Pipe': _sim_pipe, 'Pool': SimPool, 'Value': SimValue, 'Array': SimArray, 'RawValue': SimValue,
        'RawArray': SimArray, 'Manager': SimManager, 'Lock': _SharedLock, 'RLock': _SharedRLock,
        'Event': _SharedEvent, 'Semaphore': _SharedSemaphore, 'BoundedSemaphore': _SharedSemaphore,
        'Condition': SimCondition, 'Barrier': threading.Barrier,
        'cpu_count': lambda: CPU_COUNT, 'current_process': _mp_current_process,
        'parent_process': _mp_parent_process, 'active_children': _mp_active_children,
        'freeze_support': lambda: None, 'set_start_method': lambda method, force=False: None,
        'get_start_method': lambda allow_none=False: 'spawn', 'get_all_start_methods': lambda: ['spawn', 'fork'],
        'set_executable': lambda path: None,
        'TimeoutError': _MP_TIMEOUT, 'ProcessError': type('ProcessError', (Exception,), {}),
        'AuthenticationError': type('AuthenticationError', (Exception,), {}),
        'BufferTooShort': type('BufferTooShort', (Exception,), {}),
    }
    mp.__dict__.update(names)
    mp.get_context = lambda method=None: mp
    pool = types.ModuleType('multiprocessing.pool')
    pool.Pool, pool.ThreadPool, pool.AsyncResult = SimPool, SimThreadPool, _AsyncResult
    dummy = types.ModuleType('multiprocessing.dummy')
    dummy.Pool, dummy.Process, dummy.Queue = SimThreadPool, SimThread, queue.Queue
    dummy.Lock, dummy.RLock, dummy.Event = SimLock, SimRLock, threading.Event
    dummy.current_process = _current_thread
    dummy.cpu_count = lambda: CPU_COUNT
    managers = types.ModuleType('multiprocessing.managers')
    managers.SyncManager = managers.BaseManager = SimManager
    queues = types.ModuleType('multiprocessing.queues')
    queues.Queue = queues.JoinableQueue = queues.SimpleQueue = SimMPQueue
    mp.pool, mp.dummy, mp.managers, mp.queues = pool, dummy, managers, queues
    return {'multiprocessing': mp, 'multiprocessing.pool': pool, 'multiprocessing.dummy': dummy,
            'multiprocessing.managers': managers, 'multiprocessing.queues': queues}


# ---------------------------------------------------------------- tkinter (module giả)

class TclError(Exception):
    pass


class _TkState:
    """Mọi thứ tkinter mô phỏng của một lần chạy — ca chấm đọc qua `_studio.tk`."""

    def __init__(self):
        self.objects = []          # cửa sổ + widget theo thứ tự tạo
        self.messages = []         # (loại, tiêu đề, nội dung) của messagebox / hộp thoại
        self.answers = []          # câu trả lời cấp sẵn cho askyesno/askstring/askopenfilename…
        self.mainloop_called = False
        self.mainloop_count = 0
        self.root = None
        self.clipboard = ''
        self._after = []           # [hạn, số thứ tự, id, hàm, args]
        self._after_seq = 0
        self._quit = False
        self._var_seq = 0
        self._in_update = False

    @property
    def windows(self):
        return [o for o in self.objects if isinstance(o, _Wm)]

    @property
    def widgets(self):
        return [o for o in self.objects if not isinstance(o, _Wm)]

    @staticmethod
    def _match(w, kind, text, opts):
        if w.destroyed:
            return False
        if kind is not None:
            if isinstance(kind, str):
                if type(w).__name__ != kind and w.widget_type != kind:
                    return False
            elif not isinstance(w, kind):
                return False
        if text is not None and w.text != text:
            return False
        for key, value in opts.items():
            if w._options.get(_opt(key)) != value and str(w.cget(key)) != str(value):
                return False
        return True

    def find(self, type=None, text=None, **options):
        return next((o for o in self.objects if self._match(o, type, text, options)), None)

    def find_all(self, type=None, text=None, **options):
        return [o for o in self.objects if self._match(o, type, text, options)]

    @property
    def after_pending(self):
        return len(self._after)

    def _schedule(self, ms, func, args):
        self._after_seq += 1
        ident = 'after#%d' % self._after_seq
        self._after.append([_time() + max(0, ms) / 1000.0, self._after_seq, ident, func, args])
        return ident

    def _cancel(self, ident):
        self._after = [a for a in self._after if a[2] != ident]

    def _pop_next(self):
        self._after.sort(key=lambda a: (a[0], a[1]))
        return self._after.pop(0)

    def _call(self, func, args, report=True):
        try:
            return func(*args)
        except (_Exit, _Abort, _Cut, SystemExit):
            raise
        except BaseException as exc:
            if not report:
                raise
            # Đúng nếp Tk: lỗi trong callback in ra rồi vòng lặp sự kiện chạy tiếp.
            sys.stderr.write('Exception in Tkinter callback\n' + _format_exc(exc))

    def run_after(self, n=None):
        """Chạy tối đa n lệnh after() đang chờ (theo hạn); trả số lệnh đã chạy."""
        limit = AFTER_CAP if n is None else n
        ran = 0
        while self._after and ran < limit:
            due, _, _, func, args = self._pop_next()
            _advance_to(due)
            self._call(func, args)
            ran += 1
        return ran

    def mainloop(self):
        self.mainloop_called = True
        self.mainloop_count += 1
        self._quit = False
        ran = 0
        while self._after and ran < AFTER_CAP and not self._quit:
            if self.root is not None and self.root.destroyed:
                break
            due, _, _, func, args = self._pop_next()
            _advance_to(due)
            self._call(func, args)
            ran += 1

    def update(self):
        if self._in_update:
            return
        self._in_update = True
        try:
            ran = 0
            while self._after and ran < AFTER_CAP:
                self._after.sort(key=lambda a: (a[0], a[1]))
                if self._after[0][0] > _time() + 1e-9:
                    break
                _, _, _, func, args = self._after.pop(0)
                self._call(func, args)
                ran += 1
        finally:
            self._in_update = False

    def default_root(self, create):
        if self.root is not None and not self.root.destroyed:
            return self.root
        return Tk() if create else None

    def __repr__(self):
        return '<TkState %d cửa sổ, %d widget, %d messagebox, mainloop=%s>' % (
            len(self.windows), len(self.widgets), len(self.messages), self.mainloop_called)


def _tk_state():
    ctx = _ctx()
    if ctx is not None and (ctx.kind != 'call' or ctx.tk is not None or _TK_FALLBACK[0] is None):
        return ctx.get_tk()
    if _TK_FALLBACK[0] is not None:
        return _TK_FALLBACK[0]
    if _LOOSE_TK[0] is None:
        _LOOSE_TK[0] = _TkState()
    return _LOOSE_TK[0]


def _opt(key):
    key = str(key).lstrip('-')
    return key[:-1] if key.endswith('_') else key


class _TkEvent:
    def __init__(self, widget, **kw):
        self.widget = widget
        self.x = self.y = self.x_root = self.y_root = 0
        self.char = ''
        self.keysym = ''
        self.keycode = 0
        self.num = 1
        self.delta = 0
        self.width = self.height = 0
        self.state = 0
        self.time = 0
        self.type = ''
        self.__dict__.update(kw)

    def __repr__(self):
        return '<Event widget=%s>' % (self.widget,)


def _tk_index(value, size, default=None):
    """Chỉ số kiểu Tk ('end', 0, '3') của Entry/Listbox -> số nguyên."""
    if value is None:
        return default
    if isinstance(value, int):
        return max(0, min(value, size))
    text = str(value)
    if text in ('end', 'insert'):
        return size
    try:
        return max(0, min(int(text), size))
    except ValueError:
        raise TclError('bad entry index "%s"' % text)


class _Misc:
    """Gốc của mọi widget/cửa sổ mô phỏng."""

    _defaults = {}
    _ttk = False

    def _setup(self, master, state, name, opts):
        self.master = master
        self._state = state
        self.children = {}
        self._last_child_ids = {}
        self._options = dict(self._defaults)
        self._bindings = {}
        self.manager = None
        self.layout = {}
        self.destroyed = False
        self.grid_config = {}
        self._name = name
        state.objects.append(self)
        self.configure(**opts)

    @property
    def widget_type(self):
        return type(self).__name__

    @property
    def ttk(self):
        return self._ttk

    @property
    def text(self):
        """Chữ ĐANG HIỂN THỊ: giá trị textvariable nếu có, nếu không là option text."""
        var = self._options.get('textvariable')
        if isinstance(var, _Variable):
            return str(var._value)
        return str(self._options.get('text', ''))

    # ---- option
    def configure(self, cnf=None, **kw):
        if cnf is None and not kw:
            return {k: (k, v) for k, v in self._options.items()}
        if isinstance(cnf, str):
            return (cnf, self.cget(cnf))
        opts = dict(cnf or {})
        opts.update(kw)
        for key, value in opts.items():
            self._set_option(_opt(key), value)

    config = configure

    def _set_option(self, key, value):
        self._options[key] = value

    def cget(self, key):
        key = _opt(key)
        if key == 'text':
            return self.text
        return self._options.get(key, '')

    def __getitem__(self, key):
        return self.cget(key)

    def __setitem__(self, key, value):
        self.configure(**{_opt(key): value})

    def keys(self):
        return list(self._options)

    # ---- sự kiện
    def bind(self, sequence=None, func=None, add=None):
        if sequence is None:
            return tuple(self._bindings)
        if func is None:
            return self._bindings.get(sequence, [])
        handlers = self._bindings.setdefault(sequence, [])
        if not add:
            handlers.clear()
        handlers.append(func)
        return 'bind%d' % id(func)

    def unbind(self, sequence, funcid=None):
        self._bindings.pop(sequence, None)

    def bind_all(self, sequence=None, func=None, add=None):
        root = self._state.default_root(create=False) or self
        return _Misc.bind(root, sequence, func, add)

    bind_class = lambda self, classname, sequence=None, func=None, add=None: self.bind_all(sequence, func, add)

    def event_generate(self, sequence, **kw):
        event = _TkEvent(self, **kw)
        for func in list(self._bindings.get(sequence, [])):
            if func(event) == 'break':
                return
        root = self._state.root
        if root is not None and root is not self:
            for func in list(root._bindings.get(sequence, [])):
                if func(event) == 'break':
                    return

    # ---- after / vòng lặp sự kiện
    def after(self, ms, func=None, *args):
        if func is None:
            _advance(ms / 1000.0)   # after(ms) không có hàm = ngủ ms
            return None
        return self._state._schedule(ms, func, args)

    def after_idle(self, func, *args):
        return self._state._schedule(0, func, args)

    def after_cancel(self, ident):
        self._state._cancel(ident)

    def update(self):
        self._state.update()

    def update_idletasks(self):
        pass

    def mainloop(self, n=0):
        self._state.mainloop()

    def quit(self):
        self._state._quit = True

    def destroy(self):
        for child in list(self.children.values()):
            child.destroy()
        self.destroyed = True
        if self.master is not None:
            self.master.children.pop(self._name, None)
        if self is self._state.root:
            self._state._quit = True

    # ---- quản lý hình học
    def _manage(self, kind, cnf, kw):
        opts = {_opt(k): v for k, v in dict(cnf or {}, **kw).items()}
        master = opts.pop('in', None) or self.master
        if master is None:
            raise TclError("can't pack a toplevel window")
        if kind in ('pack', 'grid'):
            other = 'grid' if kind == 'pack' else 'pack'
            for sibling in master.children.values():
                if sibling is not self and sibling.manager == other and not sibling.destroyed:
                    raise TclError('cannot use geometry manager %s inside %s which already has slaves '
                                   'managed by %s' % (kind, master, other))
        if kind == 'pack':
            side = opts.get('side')
            if side is not None and side not in ('top', 'bottom', 'left', 'right'):
                raise TclError('bad side "%s": must be top, bottom, left, or right' % side)
            fill = opts.get('fill')
            if fill is not None and fill not in ('none', 'x', 'y', 'both'):
                raise TclError('bad fill style "%s": must be none, x, y, or both' % fill)
        if kind == 'grid':
            for key in ('row', 'column', 'rowspan', 'columnspan'):
                if key in opts:
                    try:
                        ok = int(opts[key]) >= (1 if key.endswith('span') else 0)
                    except (TypeError, ValueError):
                        ok = False
                    if not ok:
                        raise TclError('bad %s value "%s": must be a non-negative integer' % (key, opts[key]))
            sticky = opts.get('sticky')
            if sticky is not None and not set(str(sticky).lower()) <= set('nsew, '):
                raise TclError('bad stickyness value "%s": must be a string containing n, e, s, and/or w' % sticky)
        if self.manager == kind:
            merged = dict(self.layout)
            merged.update(opts)
            opts = merged
        self.manager = kind
        self.layout = opts

    def pack(self, cnf=None, **kw):
        self._manage('pack', cnf, kw)

    def grid(self, cnf=None, **kw):
        self._manage('grid', cnf, kw)

    def place(self, cnf=None, **kw):
        self._manage('place', cnf, kw)

    pack_configure, grid_configure, place_configure = pack, grid, place

    def _forget(self):
        self.manager = None
        self.layout = {}

    pack_forget = grid_forget = grid_remove = place_forget = forget = _forget

    def pack_info(self):
        return dict(self.layout) if self.manager == 'pack' else {}

    def grid_info(self):
        return dict(self.layout) if self.manager == 'grid' else {}

    def place_info(self):
        return dict(self.layout) if self.manager == 'place' else {}

    info = pack_info

    def winfo_manager(self):
        return self.manager or ''

    def pack_slaves(self):
        return [c for c in self.children.values() if c.manager == 'pack']

    def grid_slaves(self, row=None, column=None):
        return [c for c in self.children.values() if c.manager == 'grid'
                and (row is None or int(c.layout.get('row', 0)) == row)
                and (column is None or int(c.layout.get('column', 0)) == column)]

    def place_slaves(self):
        return [c for c in self.children.values() if c.manager == 'place']

    slaves = pack_slaves

    def grid_size(self):
        cells = [(int(c.layout.get('column', 0)), int(c.layout.get('row', 0))) for c in self.grid_slaves()]
        return (max((x for x, _ in cells), default=-1) + 1, max((y for _, y in cells), default=-1) + 1)

    def columnconfigure(self, index, cnf=None, **kw):
        self.grid_config[('column', index)] = dict(cnf or {}, **kw)

    def rowconfigure(self, index, cnf=None, **kw):
        self.grid_config[('row', index)] = dict(cnf or {}, **kw)

    grid_columnconfigure, grid_rowconfigure = columnconfigure, rowconfigure

    def grid_propagate(self, flag=None):
        return True

    pack_propagate = grid_propagate

    # ---- winfo & linh tinh
    def winfo_children(self):
        return [c for c in self.children.values() if not c.destroyed]

    def winfo_exists(self):
        return 0 if self.destroyed else 1

    def winfo_ismapped(self):
        return 1 if (self.manager or isinstance(self, _Wm)) and not self.destroyed else 0

    winfo_viewable = winfo_ismapped

    def winfo_toplevel(self):
        w = self
        while w.master is not None and not isinstance(w, _Wm):
            w = w.master
        return w

    def winfo_class(self):
        return type(self).__name__

    def winfo_name(self):
        return self._name

    def winfo_parent(self):
        return str(self.master) if self.master is not None else ''

    def winfo_width(self):
        return int(self._options.get('width') or 1)

    def winfo_height(self):
        return int(self._options.get('height') or 1)

    winfo_reqwidth, winfo_reqheight = winfo_width, winfo_height

    def winfo_x(self):
        return 0

    winfo_y = winfo_rootx = winfo_rooty = winfo_x

    def winfo_screenwidth(self):
        return 1920

    def winfo_screenheight(self):
        return 1080

    def nametowidget(self, name):
        name = str(name)
        for obj in self._state.objects:
            if str(obj) == name:
                return obj
        raise KeyError(name)

    def _noop(self, *a, **k):
        return None

    focus_set = focus = focus_force = grab_set = grab_release = lift = lower = tkraise = _noop
    wait_window = wait_visibility = option_add = bell = _noop
    tk_focusNext = tk_focusPrev = _noop

    def focus_get(self):
        return None

    def wait_variable(self, name=None):
        return None

    waitvar = wait_variable

    def clipboard_clear(self):
        self._state.clipboard = ''

    def clipboard_append(self, string, **kw):
        self._state.clipboard += str(string)

    def clipboard_get(self, **kw):
        return self._state.clipboard

    def register(self, func, subst=None, needcleanup=1):
        return func

    def __str__(self):
        return self._w

    def __repr__(self):
        bits = [type(self).__name__, self._w]
        if self.text:
            bits.append('text=%r' % self.text)
        if self.manager:
            bits.append(self.manager)
        if self.destroyed:
            bits.append('destroyed')
        return '<%s>' % ' '.join(bits)

    def __bool__(self):
        return True


class _Wm(_Misc):
    """Phần "cửa sổ" của Tk/Toplevel: title, geometry, protocol…"""

    def _wm_setup(self):
        self._title = 'tk'
        self._geometry = '200x200+0+0'
        self._protocols = {}
        self._resizable = (True, True)
        self._wm_state = 'normal'

    def title(self, string=None):
        if string is None:
            return self._title
        self._title = str(string)

    wm_title = title

    def geometry(self, newGeometry=None):
        if newGeometry is None:
            return self._geometry
        text = str(newGeometry)
        if not re.fullmatch(r'(=?\d+x\d+)?([+-]-?\d+[+-]-?\d+)?', text):
            raise TclError('bad geometry specifier "%s"' % text)
        if 'x' in text and '+' not in text and '-' not in text.split('x', 1)[1]:
            text += '+0+0'
        self._geometry = text.lstrip('=')

    wm_geometry = geometry

    def resizable(self, width=None, height=None):
        if width is None and height is None:
            return self._resizable
        self._resizable = (bool(width), bool(height))

    def protocol(self, name=None, func=None):
        if func is None:
            return self._protocols.get(name, '')
        self._protocols[name] = func

    wm_protocol = protocol

    def state(self, newstate=None):
        if newstate is None:
            return self._wm_state
        self._wm_state = newstate

    def withdraw(self):
        self._wm_state = 'withdrawn'

    def deiconify(self):
        self._wm_state = 'normal'

    def iconify(self):
        self._wm_state = 'iconic'

    def close(self):
        """Người dùng bấm nút X: gọi handler WM_DELETE_WINDOW nếu có, không thì destroy()."""
        handler = self._protocols.get('WM_DELETE_WINDOW')
        if handler:
            return handler()
        self.destroy()

    minsize = maxsize = iconbitmap = iconphoto = attributes = overrideredirect = transient = _Misc._noop
    wm_attributes = wm_minsize = wm_maxsize = wm_iconbitmap = _Misc._noop


class _BaseWidget(_Misc):
    def __init__(self, master=None, cnf=None, **kw):
        if master is None:
            master = _tk_state().default_root(create=True)
        name = kw.pop('name', None)
        if name is None:
            base = type(self).__name__.lower()
            count = master._last_child_ids.get(base, 0) + 1
            master._last_child_ids[base] = count
            name = '!%s' % base if count == 1 else '!%s%d' % (base, count)
        self._w = ('.' + name) if str(master) == '.' else '%s.%s' % (master, name)
        opts = dict(cnf or {})
        opts.update(kw)
        self._prepare()
        self._setup(master, master._state, name, opts)
        master.children[name] = self

    def _prepare(self):
        pass


def _call_command(widget, *args):
    cmd = widget._options.get('command')
    if not cmd:
        return ''
    result = cmd(*args)
    return '' if result is None else result


def _disabled(widget):
    return str(widget._options.get('state', 'normal')) == 'disabled' or 'disabled' in getattr(widget, '_flags', ())


class Tk(_Wm):
    def __init__(self, screenName=None, baseName=None, className='Tk', useTk=True, sync=False, use=None):
        state = _tk_state()
        self._w = '.'
        self._wm_setup()
        self._setup(None, state, '.', {})
        if state.root is None or state.root.destroyed:
            state.root = self

    def report_callback_exception(self, exc, val, tb):
        sys.stderr.write('Exception in Tkinter callback\n' + ''.join(traceback.format_exception(exc, val, tb)))


class Toplevel(_BaseWidget, _Wm):
    def _prepare(self):
        self._wm_setup()


class Frame(_BaseWidget):
    pass


class LabelFrame(_BaseWidget):
    pass


class Label(_BaseWidget):
    pass


class Message(_BaseWidget):
    pass


class Button(_BaseWidget):
    _defaults = {'state': 'normal'}

    def invoke(self):
        """Bấm nút (như người dùng click). Nút disabled thì không làm gì."""
        if _disabled(self):
            return ''
        return _call_command(self)

    def flash(self):
        pass


class Checkbutton(_BaseWidget):
    _defaults = {'state': 'normal', 'onvalue': 1, 'offvalue': 0}

    def _prepare(self):
        self._own_var = None

    def _variable(self):
        var = self._options.get('variable')
        if not isinstance(var, _Variable):
            if self._own_var is None:
                self._own_var = IntVar(self.master if self.master else None, value=self._options.get('offvalue', 0))
            var = self._own_var
        return var

    def select(self):
        self._variable().set(self._options.get('onvalue', 1))

    def deselect(self):
        self._variable().set(self._options.get('offvalue', 0))

    def toggle(self):
        var = self._variable()
        on = self._options.get('onvalue', 1)
        var.set(self._options.get('offvalue', 0) if str(var._value) == str(on) else on)

    def invoke(self):
        if _disabled(self):
            return ''
        self.toggle()
        return _call_command(self)

    @property
    def checked(self):
        return str(self._variable()._value) == str(self._options.get('onvalue', 1))


class Radiobutton(_BaseWidget):
    _defaults = {'state': 'normal'}

    def select(self):
        var = self._options.get('variable')
        if isinstance(var, _Variable):
            var.set(self._options.get('value', ''))

    def deselect(self):
        var = self._options.get('variable')
        if isinstance(var, _Variable):
            var.set('')

    def invoke(self):
        if _disabled(self):
            return ''
        self.select()
        return _call_command(self)

    @property
    def checked(self):
        var = self._options.get('variable')
        return isinstance(var, _Variable) and str(var._value) == str(self._options.get('value', ''))


class Entry(_BaseWidget):
    _defaults = {'state': 'normal', 'show': ''}

    def _prepare(self):
        self._value = ''

    def _get_text(self):
        var = self._options.get('textvariable')
        return str(var._value) if isinstance(var, _Variable) else self._value

    def _put_text(self, text):
        var = self._options.get('textvariable')
        if isinstance(var, _Variable):
            var.set(text)
        else:
            self._value = text

    def _locked(self):
        return str(self._options.get('state', 'normal')) in ('disabled', 'readonly') or 'disabled' in getattr(
            self, '_flags', ())

    def get(self):
        return self._get_text()

    def insert(self, index, string):
        if self._locked():
            return
        text = self._get_text()
        i = _tk_index(index, len(text))
        self._put_text(text[:i] + str(string) + text[i:])

    def delete(self, first, last=None):
        if self._locked():
            return
        text = self._get_text()
        i = _tk_index(first, len(text))
        j = i + 1 if last is None else _tk_index(last, len(text))
        if j > i:
            self._put_text(text[:i] + text[j:])

    def fill(self, text):
        """(chỉ có trong mô phỏng) Người dùng xoá ô rồi gõ `text`."""
        self.delete(0, 'end')
        self.insert(0, text)
        return self

    def index(self, index):
        return _tk_index(index, len(self._get_text()))

    icursor = select_range = selection_range = selection_clear = select_clear = xview = _Misc._noop

    def selection_present(self):
        return False


class Spinbox(Entry):
    _defaults = {'state': 'normal', 'from': 0, 'to': 0, 'increment': 1}

    def _set_option(self, key, value):
        super()._set_option(key, value)
        if key in ('from', 'values') and not self._get_text():
            values = self._options.get('values')
            if values:
                self._value = str(list(values)[0] if not isinstance(values, str) else values.split()[0])
            else:
                start = self._options.get('from', 0)
                self._value = str(int(start)) if float(start).is_integer() else str(start)

    def set(self, value):
        self._put_text(str(value))

    def invoke(self, element='buttonup'):
        values = self._options.get('values')
        if values:
            values = list(values) if not isinstance(values, str) else values.split()
            current = self.get()
            i = values.index(current) if current in values else -1
            i = min(i + 1, len(values) - 1) if element == 'buttonup' else max(i - 1, 0)
            self._put_text(str(values[i]))
        else:
            step = float(self._options.get('increment', 1))
            try:
                value = float(self.get())
            except ValueError:
                value = float(self._options.get('from', 0))
            value += step if element == 'buttonup' else -step
            value = max(float(self._options.get('from', 0)), min(float(self._options.get('to', 0)), value))
            self._put_text(str(int(value)) if value.is_integer() else str(value))
        return _call_command(self)


class Scale(_BaseWidget):
    _defaults = {'from': 0, 'to': 100, 'orient': 'vertical', 'state': 'normal'}

    def _prepare(self):
        self._value = 0

    def get(self):
        var = self._options.get('variable')
        return var.get() if isinstance(var, _Variable) else self._value

    def set(self, value):
        var = self._options.get('variable')
        if isinstance(var, _Variable):
            var.set(value)
        else:
            self._value = value
        cmd = self._options.get('command')
        if cmd:
            cmd(str(value))


class Listbox(_BaseWidget):
    _defaults = {'selectmode': 'browse', 'state': 'normal'}

    def _prepare(self):
        self._items = []
        self._selected = set()
        self._active = 0

    def _index(self, index, after=False):
        if index in ('end',):
            return len(self._items) if after else len(self._items) - 1
        if index in ('active',):
            return self._active
        if index in ('anchor',):
            return min(self._selected) if self._selected else 0
        try:
            return int(index)
        except (TypeError, ValueError):
            raise TclError('bad listbox index "%s": must be active, anchor, end, @x,y, or a number' % index)

    def insert(self, index, *elements):
        i = min(self._index(index, after=True), len(self._items))
        self._items[i:i] = [e for e in elements]
        self._selected = {s + len(elements) if s >= i else s for s in self._selected}

    def delete(self, first, last=None):
        i = self._index(first)
        j = i if last is None else min(self._index(last), len(self._items) - 1)
        if 0 <= i < len(self._items):
            del self._items[i:j + 1]
            self._selected = {s - (j + 1 - i) if s > j else s for s in self._selected if not (i <= s <= j)}

    def get(self, first, last=None):
        i = self._index(first)
        if last is None:
            return self._items[i] if 0 <= i < len(self._items) else ''
        j = min(self._index(last), len(self._items) - 1)
        return tuple(self._items[i:j + 1])

    def size(self):
        return len(self._items)

    def curselection(self):
        return tuple(sorted(s for s in self._selected if s < len(self._items)))

    def selection_set(self, first, last=None):
        i = self._index(first)
        j = i if last is None else self._index(last)
        for k in range(i, min(j, len(self._items) - 1) + 1):
            self._selected.add(k)

    select_set = selection_set

    def selection_clear(self, first, last=None):
        i = self._index(first)
        j = i if last is None else self._index(last)
        self._selected = {s for s in self._selected if not (i <= s <= j)}

    select_clear = selection_clear

    def selection_includes(self, index):
        return self._index(index) in self._selected

    select_includes = selection_includes

    def activate(self, index):
        self._active = self._index(index)

    def index(self, index):
        return self._index(index, after=True)

    def select(self, index):
        """(chỉ có trong mô phỏng) Người dùng click dòng `index`: chọn + phát <<ListboxSelect>>."""
        if self._options.get('selectmode') in ('browse', 'single'):
            self._selected = set()
        self.selection_set(index)
        self.activate(index)
        self.event_generate('<<ListboxSelect>>')
        return self

    see = nearest = yview = xview = itemconfigure = itemconfig = _Misc._noop


class Text(_BaseWidget):
    _defaults = {'state': 'normal', 'wrap': 'char'}

    def _prepare(self):
        self._text = ''

    def _pos(self, index):
        text = self._text
        index = str(index)
        extra = 0
        m = re.fullmatch(r'(.+?)\s*([+-])\s*(\d+)\s*c(hars?)?', index)
        if m:
            index, extra = m.group(1), int(m.group(3)) * (1 if m.group(2) == '+' else -1)
        if index == 'end':
            pos = len(text) + 1
        elif index in ('insert', 'current'):
            pos = len(text)
        else:
            m = re.fullmatch(r'(\d+)\.(\d+|end)', index)
            if not m:
                raise TclError('bad text index "%s"' % index)
            lines = (text + '\n').split('\n')
            line = int(m.group(1))
            if line < 1:
                pos = 0
            elif line > len(lines) - 1:
                pos = len(text) + 1
            else:
                start = sum(len(l) + 1 for l in lines[:line - 1])
                length = len(lines[line - 1])
                col = length if m.group(2) == 'end' else min(int(m.group(2)), length)
                pos = start + col
        return max(0, min(pos + extra, len(text) + 1))

    def get(self, index1, index2=None):
        full = self._text + '\n'
        i = self._pos(index1)
        if index2 is None:
            return full[i:i + 1]
        return full[i:self._pos(index2)]

    def insert(self, index, chars, *tags):
        if str(self._options.get('state', 'normal')) == 'disabled':
            return
        i = min(self._pos(index), len(self._text))
        self._text = self._text[:i] + str(chars) + self._text[i:]

    def delete(self, index1, index2=None):
        if str(self._options.get('state', 'normal')) == 'disabled':
            return
        i = min(self._pos(index1), len(self._text))
        j = i + 1 if index2 is None else min(self._pos(index2), len(self._text))
        if j > i:
            self._text = self._text[:i] + self._text[j:]

    def fill(self, text):
        """(chỉ có trong mô phỏng) Xoá hết rồi gõ `text`."""
        self.delete('1.0', 'end')
        self.insert('1.0', text)
        return self

    def index(self, index):
        i = self._pos(index)
        before = (self._text + '\n')[:i]
        return '%d.%d' % (before.count('\n') + 1, len(before.rsplit('\n', 1)[-1]))

    see = mark_set = tag_add = tag_remove = tag_configure = tag_config = tag_bind = yview = xview = _Misc._noop
    edit_reset = edit_separator = edit_undo = edit_redo = _Misc._noop


class Canvas(_BaseWidget):
    def _prepare(self):
        self.items = {}
        self._next_item = 0

    def _create(self, kind, args, kw):
        self._next_item += 1
        coords = [c for a in args for c in (a if isinstance(a, (list, tuple)) else (a,))]
        self.items[self._next_item] = {'type': kind, 'coords': coords, 'options': dict(kw)}
        return self._next_item

    def create_line(self, *a, **k):
        return self._create('line', a, k)

    def create_rectangle(self, *a, **k):
        return self._create('rectangle', a, k)

    def create_oval(self, *a, **k):
        return self._create('oval', a, k)

    def create_text(self, *a, **k):
        return self._create('text', a, k)

    def create_polygon(self, *a, **k):
        return self._create('polygon', a, k)

    def create_arc(self, *a, **k):
        return self._create('arc', a, k)

    def create_image(self, *a, **k):
        return self._create('image', a, k)

    def create_window(self, *a, **k):
        return self._create('window', a, k)

    def delete(self, *ids):
        for ident in ids:
            if ident == 'all':
                self.items.clear()
            else:
                self.items.pop(ident, None)

    def coords(self, ident, *args):
        if args:
            self.items[ident]['coords'] = [c for a in args for c in (a if isinstance(a, (list, tuple)) else (a,))]
        return list(self.items.get(ident, {}).get('coords', []))

    def itemconfigure(self, ident, **kw):
        self.items[ident]['options'].update(kw)

    itemconfig = itemconfigure

    def itemcget(self, ident, option):
        return self.items[ident]['options'].get(option, '')

    def type(self, ident):
        return self.items.get(ident, {}).get('type')

    def find_all(self):
        return tuple(self.items)

    def move(self, ident, dx, dy):
        c = self.items[ident]['coords']
        self.items[ident]['coords'] = [v + (dx if i % 2 == 0 else dy) for i, v in enumerate(c)]

    tag_bind = bbox = yview = xview = _Misc._noop


class Scrollbar(_BaseWidget):
    def set(self, first, last):
        self._options['_pos'] = (first, last)

    def get(self):
        return self._options.get('_pos', (0.0, 1.0))


class Menu(_BaseWidget):
    def _prepare(self):
        self.entries = []

    def add(self, itemType, cnf=None, **kw):
        entry = dict(cnf or {}, **kw)
        entry['type'] = itemType
        self.entries.append(entry)

    def add_command(self, cnf=None, **kw):
        self.add('command', cnf, **kw)

    def add_cascade(self, cnf=None, **kw):
        self.add('cascade', cnf, **kw)

    def add_checkbutton(self, cnf=None, **kw):
        self.add('checkbutton', cnf, **kw)

    def add_radiobutton(self, cnf=None, **kw):
        self.add('radiobutton', cnf, **kw)

    def add_separator(self, cnf=None, **kw):
        self.add('separator', cnf, **kw)

    def _entry(self, index):
        if isinstance(index, int):
            return self.entries[index]
        for entry in self.entries:
            if entry.get('label') == index:
                return entry
        raise TclError('bad menu entry index "%s"' % index)

    def invoke(self, index):
        entry = self._entry(index)
        if entry.get('state') == 'disabled':
            return ''
        var = entry.get('variable')
        if entry['type'] == 'radiobutton' and isinstance(var, _Variable):
            var.set(entry.get('value', entry.get('label')))
        if entry['type'] == 'checkbutton' and isinstance(var, _Variable):
            var.set(0 if str(var._value) in ('1', 'True') else 1)
        cmd = entry.get('command')
        return cmd() if cmd else ''

    def entryconfigure(self, index, cnf=None, **kw):
        self._entry(index).update(dict(cnf or {}, **kw))

    entryconfig = entryconfigure

    def entrycget(self, index, option):
        return self._entry(index).get(_opt(option), '')

    def index(self, index):
        if index == 'end':
            return len(self.entries) - 1 if self.entries else None
        return self.entries.index(self._entry(index))

    def delete(self, index1, index2=None):
        i = self.index(index1)
        j = i if index2 is None else self.index(index2)
        del self.entries[i:j + 1]

    def type(self, index):
        return self._entry(index)['type']

    post = unpost = tk_popup = _Misc._noop


class Menubutton(_BaseWidget):
    pass


class OptionMenu(Menubutton):
    def __init__(self, master, variable, value, *values, **kwargs):
        command = kwargs.pop('command', None)
        super().__init__(master, textvariable=variable, **kwargs)
        self._variable = variable
        self._values = [value] + list(values)
        self._command = command
        menu = Menu(self, name='menu')
        for v in self._values:
            menu.add_command(label=v, command=lambda v=v: self._pick(v))
        self['menu'] = menu
        self._menu = menu
        variable.set(value)

    def _pick(self, value):
        self._variable.set(value)
        if self._command:
            self._command(value)

    def __getitem__(self, name):
        if name == 'menu':
            return self._menu
        return super().__getitem__(name)


class PanedWindow(_BaseWidget):
    def _prepare(self):
        self._panes = []

    def add(self, child, **kw):
        self._panes.append(child)

    def panes(self):
        return list(self._panes)


class PhotoImage:
    _seq = [0]

    def __init__(self, name=None, cnf=None, master=None, **kw):
        PhotoImage._seq[0] += 1
        self.name = name or 'pyimage%d' % PhotoImage._seq[0]
        self._options = dict(cnf or {}, **kw)

    def width(self):
        return int(self._options.get('width', 0))

    def height(self):
        return int(self._options.get('height', 0))

    def subsample(self, x, y=''):
        return self

    zoom = copy = subsample

    def configure(self, **kw):
        self._options.update(kw)

    config = configure

    def cget(self, key):
        return self._options.get(key, '')

    def __str__(self):
        return self.name


BitmapImage = PhotoImage


class _Variable:
    _default = ''

    def __init__(self, master=None, value=None, name=None):
        if master is None:
            root = _tk_state().default_root(create=False)
            if root is None:
                raise RuntimeError('Too early to create variable: no default root window')
            master = root
        self._state = master._state
        self._state._var_seq += 1
        self._name = name or 'PY_VAR%d' % (self._state._var_seq - 1)
        self._value = self._default if value is None else value
        self._traces = []

    def __str__(self):
        return self._name

    def __repr__(self):
        return '<%s %s=%r>' % (type(self).__name__, self._name, self._value)

    def __eq__(self, other):
        return isinstance(other, _Variable) and type(self) is type(other) and self._name == other._name

    def __hash__(self):
        return hash(self._name)

    def _fire(self, op):
        for modes, callback, _ in list(self._traces):
            if op in modes:
                callback(self._name, '', op)

    def set(self, value):
        self._value = value
        self._fire('write')

    initialize = set

    def _raw(self):
        self._fire('read')
        return self._value

    def get(self):
        return self._raw()

    def trace_add(self, mode, callback):
        modes = (mode,) if isinstance(mode, str) else tuple(mode)
        ident = '%d%s' % (id(callback), callback.__name__ if hasattr(callback, '__name__') else 'cb')
        self._traces.append((modes, callback, ident))
        return ident

    def trace_remove(self, mode, cbname):
        self._traces = [t for t in self._traces if t[2] != cbname]

    def trace_info(self):
        return [(t[0], t[2]) for t in self._traces]

    def trace_variable(self, mode, callback):
        names = {'w': 'write', 'r': 'read', 'u': 'unset'}
        return self.trace_add(tuple(names.get(m, m) for m in mode), callback)

    trace = trace_variable

    def trace_vdelete(self, mode, cbname):
        self.trace_remove(mode, cbname)

    def trace_vinfo(self):
        return self.trace_info()


Variable = _Variable


class StringVar(_Variable):
    _default = ''

    def get(self):
        value = self._raw()
        return value if isinstance(value, str) else str(value)


class IntVar(_Variable):
    _default = 0

    def get(self):
        value = self._raw()
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        try:
            return int(str(value).strip())
        except ValueError:
            try:
                return int(float(str(value)))
            except ValueError:
                raise TclError('expected floating-point number but got "%s"' % value)


class DoubleVar(_Variable):
    _default = 0.0

    def get(self):
        value = self._raw()
        try:
            return float(value)
        except (TypeError, ValueError):
            raise TclError('expected floating-point number but got "%s"' % value)


class BooleanVar(_Variable):
    _default = False

    def get(self):
        value = self._raw()
        if isinstance(value, (bool, int, float)):
            return bool(value)
        text = str(value).strip().lower()
        if text in ('1', 'true', 'yes', 'on', 't', 'y'):
            return True
        if text in ('0', 'false', 'no', 'off', 'f', 'n'):
            return False
        raise TclError('expected boolean value but got "%s"' % value)


# ---- ttk

class _TtkMixin:
    _ttk = True

    def state(self, statespec=None):
        flags = getattr(self, '_flags', None)
        if flags is None:
            flags = self._flags = set()
        if statespec is None:
            return tuple(sorted(flags))
        for spec in ([statespec] if isinstance(statespec, str) else statespec):
            if spec.startswith('!'):
                flags.discard(spec[1:])
            else:
                flags.add(spec)
        return tuple(sorted(flags))

    def instate(self, statespec, callback=None, *args, **kw):
        flags = getattr(self, '_flags', set())
        ok = all((s[1:] not in flags) if s.startswith('!') else (s in flags)
                 for s in ([statespec] if isinstance(statespec, str) else statespec))
        if ok and callback is not None:
            return callback(*args, **kw)
        return ok


def _ttk_class(base, name):
    return type(name, (_TtkMixin, base), {'__module__': 'tkinter.ttk'})


class _TtkCombobox(_TtkMixin, Entry):
    _defaults = {'state': 'normal', 'values': ()}

    def _set_option(self, key, value):
        if key == 'values' and isinstance(value, str):
            value = tuple(value.split())
        elif key == 'values':
            value = tuple(value)
        super()._set_option(key, value)

    def _locked(self):
        return str(self._options.get('state', 'normal')) in ('disabled', 'readonly')

    def set(self, value):
        self._put_text(str(value))

    def current(self, newindex=None):
        values = list(self._options.get('values', ()))
        if newindex is None:
            text = self.get()
            return next((i for i, v in enumerate(values) if str(v) == text), -1)
        if not 0 <= int(newindex) < len(values):
            raise TclError('index "%s" out of range' % newindex)
        self.set(values[int(newindex)])

    def choose(self, value):
        """(chỉ có trong mô phỏng) Người dùng chọn `value` trong danh sách: set + <<ComboboxSelected>>."""
        self.set(value)
        self.event_generate('<<ComboboxSelected>>')
        return self


_TtkCombobox.__name__ = _TtkCombobox.__qualname__ = 'Combobox'


class _TtkProgressbar(_TtkMixin, _BaseWidget):
    _defaults = {'value': 0.0, 'maximum': 100.0, 'mode': 'determinate', 'orient': 'horizontal'}

    def step(self, amount=1.0):
        value = float(self._options.get('value', 0)) + amount
        maximum = float(self._options.get('maximum', 100))
        self._options['value'] = value % maximum if maximum else value

    def cget(self, key):
        var = self._options.get('variable')
        if _opt(key) == 'value' and isinstance(var, _Variable):
            return var.get()
        return super().cget(key)

    start = stop = _Misc._noop


_TtkProgressbar.__name__ = _TtkProgressbar.__qualname__ = 'Progressbar'


class _TtkNotebook(_TtkMixin, _BaseWidget):
    def _prepare(self):
        self._tabs = []
        self._current = None

    def add(self, child, **kw):
        self._tabs.append((child, dict(kw)))
        if self._current is None:
            self._current = child

    def tabs(self):
        return tuple(str(c) for c, _ in self._tabs)

    def select(self, tab_id=None):
        if tab_id is None:
            return str(self._current) if self._current is not None else ''
        if isinstance(tab_id, int):
            self._current = self._tabs[tab_id][0]
        else:
            self._current = next(c for c, _ in self._tabs if c is tab_id or str(c) == str(tab_id))
        self.event_generate('<<NotebookTabChanged>>')

    def tab(self, tab_id, option=None, **kw):
        child, opts = self._tabs[tab_id] if isinstance(tab_id, int) else next(
            t for t in self._tabs if t[0] is tab_id or str(t[0]) == str(tab_id))
        if kw:
            opts.update(kw)
        return opts.get(option) if option else dict(opts)

    def index(self, tab_id):
        if tab_id == 'end':
            return len(self._tabs)
        if tab_id == 'current':
            return next(i for i, (c, _) in enumerate(self._tabs) if c is self._current)
        return next(i for i, (c, _) in enumerate(self._tabs) if c is tab_id or str(c) == str(tab_id))

    def forget(self, tab_id):
        i = self.index(tab_id)
        del self._tabs[i]


_TtkNotebook.__name__ = _TtkNotebook.__qualname__ = 'Notebook'


def _tv_value(v):
    if isinstance(v, str) and re.fullmatch(r'-?\d+', v.strip()):
        return int(v)
    return v


class _TtkTreeview(_TtkMixin, _BaseWidget):
    def _prepare(self):
        self._items = {'': {'text': '', 'values': [], 'children': [], 'parent': '', 'open': False, 'tags': []}}
        self._seq = 0
        self._sel = ()
        self._focus = ''
        self.headings = {}
        self.columns = {}

    def insert(self, parent, index, iid=None, **kw):
        if parent not in self._items:
            raise TclError('Item %s not found' % parent)
        if iid is None:
            self._seq += 1
            iid = 'I%03X' % self._seq
        elif iid in self._items:
            raise TclError('Item %s already exists' % iid)
        values = kw.get('values', ())
        self._items[iid] = {'text': kw.get('text', ''), 'values': list(values) if not isinstance(values, str)
                            else values.split(), 'children': [], 'parent': parent,
                            'open': bool(kw.get('open', False)), 'tags': list(kw.get('tags', ()))}
        siblings = self._items[parent]['children']
        pos = len(siblings) if index in ('end', None) else int(index)
        siblings.insert(pos, iid)
        return iid

    def get_children(self, item=''):
        return tuple(self._items[item]['children'])

    def item(self, item, option=None, **kw):
        node = self._items[item]
        if kw:
            for key, value in kw.items():
                node[_opt(key)] = list(value) if _opt(key) == 'values' and not isinstance(value, str) else value
            return None
        data = {'text': node['text'], 'image': '', 'values': [_tv_value(v) for v in node['values']] or '',
                'open': int(node['open']), 'tags': node['tags'] or ''}
        return data[_opt(option)] if option else data

    def set(self, item, column=None, value=None):
        node = self._items[item]
        cols = list(self._options.get('columns', ()))
        if column is None:
            return {c: (node['values'][i] if i < len(node['values']) else '') for i, c in enumerate(cols)}
        i = cols.index(column) if column in cols else int(str(column).lstrip('#')) - 1
        if value is None:
            return node['values'][i] if i < len(node['values']) else ''
        while len(node['values']) <= i:
            node['values'].append('')
        node['values'][i] = value

    def delete(self, *items):
        for item in items:
            node = self._items.pop(item, None)
            if node is None:
                continue
            for child in list(node['children']):
                self.delete(child)
            parent = self._items.get(node['parent'])
            if parent and item in parent['children']:
                parent['children'].remove(item)

    detach = delete

    def exists(self, item):
        return item in self._items

    def parent(self, item):
        return self._items[item]['parent']

    def index(self, item):
        return self._items[self._items[item]['parent']]['children'].index(item)

    def heading(self, column, option=None, **kw):
        opts = self.headings.setdefault(column, {})
        opts.update({_opt(k): v for k, v in kw.items()})
        return opts.get(option) if option else (dict(opts) if not kw else None)

    def column(self, column, option=None, **kw):
        opts = self.columns.setdefault(column, {})
        opts.update({_opt(k): v for k, v in kw.items()})
        return opts.get(option) if option else (dict(opts) if not kw else None)

    def selection(self):
        return tuple(self._sel)

    def selection_set(self, *items):
        flat = [i for it in items for i in (it if isinstance(it, (list, tuple)) else (it,))]
        self._sel = tuple(flat)
        self.event_generate('<<TreeviewSelect>>')

    def selection_add(self, *items):
        self.selection_set(*(list(self._sel) + list(items)))

    def selection_remove(self, *items):
        self._sel = tuple(i for i in self._sel if i not in items)

    def focus(self, item=None):
        if item is None:
            return self._focus
        self._focus = item

    see = move = yview = xview = tag_configure = tag_bind = _Misc._noop


_TtkTreeview.__name__ = _TtkTreeview.__qualname__ = 'Treeview'


class _TtkStyle:
    def __init__(self, master=None):
        self._conf = {}

    def configure(self, style, query_opt=None, **kw):
        self._conf.setdefault(style, {}).update(kw)

    def map(self, style, query_opt=None, **kw):
        return {}

    def lookup(self, style, option, state=None, default=None):
        return self._conf.get(style, {}).get(option, default)

    def layout(self, style, layoutspec=None):
        return []

    def theme_use(self, themename=None):
        return 'default' if themename is None else None

    def theme_names(self):
        return ('clam', 'alt', 'default', 'classic')

    element_create = theme_create = theme_settings = _Misc._noop


# ---- messagebox & hộp thoại

def _dialog_state(options):
    parent = options.get('parent')
    return parent._state if isinstance(parent, _Misc) else _tk_state()


def _answer(state, default):
    return state.answers.pop(0) if state.answers else default


def _show(kind):
    def show(title=None, message=None, **options):
        _dialog_state(options).messages.append((kind, title, message))
        return 'ok'
    show.__name__ = 'show' + kind
    return show


def _ask(kind, default, convert=None):
    def ask(title=None, message=None, **options):
        state = _dialog_state(options)
        state.messages.append((kind, title, message))
        value = _answer(state, default)
        return convert(value) if convert else value
    ask.__name__ = kind
    return ask


_TK = types.ModuleType('tkinter')


def _build_tkinter():
    constants = types.ModuleType('tkinter.constants')
    const = dict(NO=0, FALSE=0, OFF=0, YES=1, TRUE=1, ON=1, N='n', S='s', W='w', E='e', NW='nw', SW='sw',
                 NE='ne', SE='se', NS='ns', EW='ew', NSEW='nsew', CENTER='center', NONE='none', X='x', Y='y',
                 BOTH='both', LEFT='left', TOP='top', RIGHT='right', BOTTOM='bottom', RAISED='raised',
                 SUNKEN='sunken', FLAT='flat', RIDGE='ridge', GROOVE='groove', SOLID='solid',
                 HORIZONTAL='horizontal', VERTICAL='vertical', NUMERIC='numeric', CHAR='char', WORD='word',
                 BASELINE='baseline', INSIDE='inside', OUTSIDE='outside', SEL='sel', SEL_FIRST='sel.first',
                 SEL_LAST='sel.last', END='end', INSERT='insert', CURRENT='current', ANCHOR='anchor', ALL='all',
                 NORMAL='normal', DISABLED='disabled', ACTIVE='active', HIDDEN='hidden', CASCADE='cascade',
                 CHECKBUTTON='checkbutton', COMMAND='command', RADIOBUTTON='radiobutton', SEPARATOR='separator',
                 SINGLE='single', BROWSE='browse', MULTIPLE='multiple', EXTENDED='extended', DOTBOX='dotbox',
                 UNDERLINE='underline', PIESLICE='pieslice', CHORD='chord', ARC='arc', FIRST='first', LAST='last',
                 BUTT='butt', PROJECTING='projecting', ROUND='round', BEVEL='bevel', MITER='miter',
                 MOVETO='moveto', SCROLL='scroll', UNITS='units', PAGES='pages')
    constants.__dict__.update(const)

    tk = _TK
    tk.__doc__ = 'tkinter MÔ PHỎNG của Python Studio (studio-harness.py) — không mở cửa sổ thật.'
    tk.__dict__.update(const)
    for cls in (Tk, Toplevel, Frame, LabelFrame, Label, Message, Button, Checkbutton, Radiobutton, Entry,
                Spinbox, Scale, Listbox, Text, Canvas, Scrollbar, Menu, Menubutton, OptionMenu, PanedWindow,
                PhotoImage, StringVar, IntVar, DoubleVar, BooleanVar):
        setattr(tk, cls.__name__, cls)
        cls.__module__ = 'tkinter'
    tk.BitmapImage = BitmapImage
    tk.Variable = _Variable
    tk.TclError = TclError
    tk.Event = _TkEvent
    tk.Misc = tk.BaseWidget = tk.Widget = _Misc
    tk.Wm = _Wm
    tk.TkVersion = tk.TclVersion = 8.6
    tk.Tcl = lambda *a, **k: Tk()
    tk.NoDefaultRoot = lambda: None
    tk.mainloop = lambda n=0: _tk_state().mainloop()
    tk.image_names = lambda: ()
    tk.constants = constants

    ttk = types.ModuleType('tkinter.ttk')
    for base in (Button, Label, Entry, Frame, LabelFrame, Checkbutton, Radiobutton, Scale, Scrollbar, Spinbox,
                 Menubutton, PanedWindow):
        setattr(ttk, base.__name__, _ttk_class(base, base.__name__))
    ttk.Labelframe = ttk.LabelFrame
    ttk.Panedwindow = ttk.PanedWindow
    ttk.Separator = _ttk_class(_BaseWidget, 'Separator')
    ttk.Sizegrip = _ttk_class(_BaseWidget, 'Sizegrip')
    ttk.Combobox = _TtkCombobox
    ttk.Progressbar = _TtkProgressbar
    ttk.Notebook = _TtkNotebook
    ttk.Treeview = _TtkTreeview
    ttk.Style = _TtkStyle
    ttk.OptionMenu = OptionMenu
    ttk.LabeledScale = ttk.Scale
    ttk.Widget = _Misc
    for cls in (_TtkCombobox, _TtkProgressbar, _TtkNotebook, _TtkTreeview):
        cls.__module__ = 'tkinter.ttk'

    mb = types.ModuleType('tkinter.messagebox')
    mb.showinfo, mb.showwarning, mb.showerror = _show('info'), _show('warning'), _show('error')
    mb.askquestion = _ask('askquestion', 'yes', lambda v: 'yes' if v in (True, 'yes') else 'no')
    mb.askokcancel = _ask('askokcancel', True, bool)
    mb.askyesno = _ask('askyesno', True, bool)
    mb.askyesnocancel = _ask('askyesnocancel', True)
    mb.askretrycancel = _ask('askretrycancel', True, bool)
    for name in ('ABORT', 'RETRY', 'IGNORE', 'OK', 'CANCEL', 'YES', 'NO'):
        setattr(mb, name, name.lower())
    mb.ERROR, mb.INFO, mb.QUESTION, mb.WARNING = 'error', 'info', 'question', 'warning'

    sd = types.ModuleType('tkinter.simpledialog')
    sd.askstring = _ask('askstring', None)
    sd.askinteger = _ask('askinteger', None)
    sd.askfloat = _ask('askfloat', None)

    fd = types.ModuleType('tkinter.filedialog')
    fd.askopenfilename = lambda **o: _ask('askopenfilename', '')(o.get('title'), None, **o)
    fd.asksaveasfilename = lambda **o: _ask('asksaveasfilename', '')(o.get('title'), None, **o)
    fd.askdirectory = lambda **o: _ask('askdirectory', '')(o.get('title'), None, **o)
    fd.askopenfilenames = lambda **o: _ask('askopenfilenames', ())(o.get('title'), None, **o)
    fd.askopenfile = lambda mode='r', **o: None
    fd.asksaveasfile = lambda mode='w', **o: None

    cc = types.ModuleType('tkinter.colorchooser')
    cc.askcolor = lambda color=None, **o: (None, None)

    font = types.ModuleType('tkinter.font')

    class Font:
        def __init__(self, root=None, font=None, name=None, exists=False, **options):
            self.name = name or 'font%d' % id(self)
            self._options = dict(family='TkDefaultFont', size=10, weight='normal', slant='roman')
            self._options.update(options)

        def actual(self, option=None, displayof=None):
            return self._options.get(option) if option else dict(self._options)

        cget = lambda self, option: self._options.get(option)

        def configure(self, **options):
            self._options.update(options)

        config = configure

        def measure(self, text, displayof=None):
            return 7 * len(str(text))

        def metrics(self, *options, **kw):
            return {'ascent': 12, 'descent': 3, 'linespace': 15, 'fixed': 0}

    font.Font = Font
    font.families = lambda root=None, displayof=None: ('Arial', 'Courier New', 'Times New Roman')
    font.nametofont = lambda name, root=None: Font(name=name)
    font.NORMAL, font.BOLD, font.ITALIC, font.ROMAN = 'normal', 'bold', 'italic', 'roman'

    st = types.ModuleType('tkinter.scrolledtext')

    class ScrolledText(Text):
        pass

    ScrolledText.__module__ = 'tkinter.scrolledtext'
    st.ScrolledText = ScrolledText

    tk.ttk, tk.messagebox, tk.simpledialog, tk.filedialog = ttk, mb, sd, fd
    tk.colorchooser, tk.font, tk.scrolledtext = cc, font, st
    return {'tkinter': tk, 'tkinter.constants': constants, 'tkinter.ttk': ttk, 'tkinter.messagebox': mb,
            'tkinter.simpledialog': sd, 'tkinter.filedialog': fd, 'tkinter.colorchooser': cc,
            'tkinter.font': font, 'tkinter.scrolledtext': st}


# ---------------------------------------------------------------- module giả + móc import

_FAKE_BUILDERS = {'tkinter': _build_tkinter, 'multiprocessing': _build_multiprocessing}
_FAKE_PACKAGES = {'tkinter', 'multiprocessing'}
_FAKE_CACHE = {}
_POST_IMPORT = {}
_HOOKING = set()


def _fake_module(name):
    top = name.split('.')[0]
    if top not in _FAKE_CACHE:
        _FAKE_CACHE[top] = _FAKE_BUILDERS[top]()
    return _FAKE_CACHE[top].get(name)


class _HookedLoader:
    def __init__(self, loader, hook):
        self._loader = loader
        self._hook = hook

    def create_module(self, spec):
        return self._loader.create_module(spec)

    def exec_module(self, module):
        self._loader.exec_module(module)
        self._hook(module)

    def __getattr__(self, name):
        return getattr(self._loader, name)


class _StudioFinder:
    """sys.meta_path: cấp tkinter/multiprocessing GIẢ, và móc vào matplotlib khi nó được import.

    Module giả chỉ dựng khi học viên import — bài không dùng thì không tốn gì.
    """

    def find_spec(self, fullname, path=None, target=None):
        top = fullname.split('.')[0]
        if top in _FAKE_BUILDERS and _fake_module(fullname) is not None:
            return importlib.machinery.ModuleSpec(fullname, self, is_package=fullname in _FAKE_PACKAGES)
        hook = _POST_IMPORT.get(fullname)
        if hook is None or fullname in _HOOKING:
            return None
        _HOOKING.add(fullname)
        try:
            spec = importlib.util.find_spec(fullname)
        finally:
            _HOOKING.discard(fullname)
        if spec is None or spec.loader is None:
            return None
        spec.loader = _HookedLoader(spec.loader, hook)
        return spec

    def create_module(self, spec):
        return _fake_module(spec.name)

    def exec_module(self, module):
        pass


_FINDER = _StudioFinder()


# ---- matplotlib

def _plt_show(*args, **kwargs):
    ctx = _ctx()
    if ctx is not None:
        ctx.show_calls += 1


def _hook_matplotlib(mpl):
    try:
        mpl.use('Agg', force=True)
    except Exception:
        pass


def _hook_figure(module):
    fig_cls = module.Figure
    if getattr(fig_cls.__init__, '_studio', False):
        return
    original = fig_cls.__init__

    def __init__(self, *args, **kwargs):
        original(self, *args, **kwargs)
        ctx = _ctx()
        if ctx is not None:
            ctx.figures.append(self)

    __init__._studio = True
    fig_cls.__init__ = __init__
    original_save = fig_cls.savefig

    def savefig(self, fname, *args, **kwargs):
        # Ghi lại CHÍNH figure được lưu: plt.close() rồi plt.savefig() lưu một
        # figure mới tinh, trống trơn — chỉ nhìn "file có tồn tại" thì không bắt được.
        ctx = _ctx()
        if ctx is not None:
            name = os.fspath(fname) if isinstance(fname, (str, os.PathLike)) else '<buffer>'
            ctx.saved.append({'file': os.path.basename(str(name)), 'figure': self, 'axes': len(self.axes),
                              'empty': not any(ax.has_data() for ax in self.axes)})
        return original_save(self, fname, *args, **kwargs)

    fig_cls.savefig = savefig


def _hook_pyplot(module):
    module.show = _plt_show


_POST_IMPORT.update({'matplotlib': _hook_matplotlib, 'matplotlib.figure': _hook_figure,
                     'matplotlib.pyplot': _hook_pyplot})


def _chart(fig):
    """Tóm tắt một Figure để ca chấm so sánh gọn (không so ảnh)."""
    axes = []
    for ax in fig.axes:
        legend = ax.get_legend()
        bars = sum(len(c) for c in getattr(ax, 'containers', []) if type(c).__name__ == 'BarContainer')
        axes.append({
            'title': ax.get_title(), 'xlabel': ax.get_xlabel(), 'ylabel': ax.get_ylabel(),
            'lines': len(ax.lines), 'bars': bars, 'patches': len(ax.patches),
            'collections': len(ax.collections), 'texts': len(ax.texts),
            'legend': [t.get_text() for t in legend.get_texts()] if legend is not None else [],
            'xscale': ax.get_xscale(), 'yscale': ax.get_yscale(),
            'xticklabels': [t.get_text() for t in ax.get_xticklabels()],
        })
    sup = getattr(fig, '_suptitle', None)
    return {'suptitle': sup.get_text() if sup is not None else '', 'axes': axes}


def _reset_pyplot():
    plt = sys.modules.get('matplotlib.pyplot')
    if plt is not None:
        try:
            plt.close('all')
        except Exception:
            pass


# ---------------------------------------------------------------- cài đặt

def _install():
    # input() thay toàn cục giống os.fork/threading.Thread bên dưới: namespace
    # của học viên dùng chính module builtins nên không chèn riêng được.
    builtins.input = _input
    time.time = _time
    time.perf_counter = _perf_counter
    time.monotonic = _monotonic
    time.sleep = _sleep
    threading.Thread = SimThread
    threading.Timer = SimTimer
    threading.Lock = SimLock
    threading.RLock = SimRLock
    threading.Condition = SimCondition
    threading.current_thread = _current_thread
    threading.currentThread = _current_thread
    threading.get_ident = _get_ident
    threading.main_thread = lambda: _MAIN_THREAD
    threading.active_count = threading.activeCount = lambda: len(_active_threads())
    threading.enumerate = _active_threads
    queue.time = _monotonic
    threading._time = _monotonic
    queue.Queue.put = _queue_put
    os.fork = _fork
    # Có os.fork thì module random (numpy/pandas nạp nó) gọi os.register_at_fork —
    # CPython trên Windows không có hàm này, nên chấm thử lúc dựng bài sẽ nổ.
    if not hasattr(os, 'register_at_fork'):
        os.register_at_fork = lambda **kwargs: None
    os.waitpid = _waitpid
    os.wait = _wait
    os._exit = _exit_now
    os.getpid = _getpid
    os.getppid = _getppid
    os.cpu_count = lambda: CPU_COUNT
    os.system = _os_system
    os.WIFEXITED = lambda status: (status & 0x7F) == 0
    os.WEXITSTATUS = lambda status: (status >> 8) & 0xFF
    os.WIFSIGNALED = lambda status: False
    os.waitstatus_to_exitcode = lambda status: (status >> 8) & 0xFF
    sys.executable = FAKE_EXECUTABLE
    subprocess.run = _sp_run
    subprocess.Popen = SimPopen
    subprocess.call = _sp_call
    subprocess.check_call = _sp_check_call
    subprocess.check_output = _sp_check_output
    subprocess.getoutput = _sp_getoutput
    subprocess.getstatusoutput = _sp_getstatusoutput
    if _cf is not None:
        _cf.ThreadPoolExecutor = SimThreadPoolExecutor
        _cf.ProcessPoolExecutor = SimProcessPoolExecutor
        _cf.as_completed = _as_completed
        _cf.wait = _cf_wait
        sys.modules['concurrent.futures.thread'].ThreadPoolExecutor = SimThreadPoolExecutor
    # Backend không cần màn hình; đặt trước khi matplotlib được import.
    os.environ['MPLBACKEND'] = 'Agg'
    if _FINDER not in sys.meta_path:
        sys.meta_path.insert(0, _FINDER)
        # CPython (lúc dựng bài) có tkinter/multiprocessing thật: bỏ bản đã nạp
        # để lần import sau đi qua bản mô phỏng như trong trình duyệt.
        for name in list(sys.modules):
            if name.split('.')[0] in _FAKE_BUILDERS and sys.modules[name] is not _fake_module(name):
                del sys.modules[name]
    for name, hook in _POST_IMPORT.items():
        module = sys.modules.get(name)
        if module is not None:
            hook(module)


# ---------------------------------------------------------------- chạy chương trình

_JOB = {}


def _override(tree, values):
    """Thay vế phải của phép gán CẤP NGOÀI CÙNG đầu tiên cho mỗi tên."""
    left = dict(values)
    for node in tree.body:
        target = None
        if isinstance(node, ast.Assign) and len(node.targets) == 1:
            target = node.targets[0]
        elif isinstance(node, ast.AnnAssign) and node.value is not None:
            target = node.target
        if isinstance(target, ast.Name) and target.id in left:
            value = left.pop(target.id)
            text = str(value) if isinstance(value, Expr) else repr(value)
            node.value = ast.parse(text, mode='eval').body
    if left:
        names = ', '.join(sorted(left))
        raise StudioSetupError(
            'Không tìm thấy dòng gán %s = ... ở ngoài cùng chương trình. '
            'Giữ nguyên tên biến đề bài cấp sẵn để bộ chấm thay được dữ liệu.' % names)
    return ast.fix_missing_locations(tree)


def _prepare_dir(files):
    _RUN_SEQ[0] += 1
    path = '%s/run%d' % (WORK_ROOT, _RUN_SEQ[0])
    os.makedirs(path, exist_ok=True)
    for name, content in files.items():
        if content is None:
            continue
        with open(os.path.join(path, name), 'w', encoding='utf-8', newline='') as fh:
            fh.write(content)
    return path


def _purge_support():
    for name in list(_SUPPORT_MODULES):
        sys.modules.pop(name, None)


def _format_exc(exc):
    frames = [f for f in traceback.extract_tb(exc.__traceback__)
              if not f.filename.startswith(('<', '/lib/')) and 'studio-harness' not in f.filename
              and 'site-packages' not in f.filename]
    lines = ['Traceback (most recent call last):\n'] if frames else []
    for f in frames:
        lines.append('  File "%s", line %s, in %s\n' % (os.path.basename(f.filename), f.lineno, f.name))
        if f.line:
            lines.append('    %s\n' % f.line)
    lines.extend(traceback.format_exception_only(type(exc), exc))
    return ''.join(lines)


def _finish_run(ctx):
    """Cuối chương trình: timer chưa tới hạn vẫn chạy (Python chờ thread không-daemon),
    output của Popen chưa ai chờ vẫn hiện."""
    if ctx.timers:
        _run_due_timers(ctx)
    if ctx.open_popens:
        _flush_popens(ctx)


def _execute(ctx, source, files, vars=None, entry=None, setup=None):
    """Chạy cả chương trình trong một thư mục mới. Trả dict kết quả thô."""
    outcome = {'exit': None, 'error': None, 'exc': None, 'value': None, 'ns': None, 'dir': None}
    path = _prepare_dir(files)
    outcome['dir'] = path
    old_cwd = os.getcwd()
    _STACK.append(ctx)
    try:
        os.chdir(path)
        _purge_support()
        # Để traceback hiện được dòng code của học viên.
        linecache.cache['main.py'] = (len(source), None, source.splitlines(True), 'main.py')
        try:
            tree = ast.parse(source, 'main.py')
            if vars:
                tree = _override(tree, vars)
            code = compile(tree, 'main.py', 'exec')
        except SyntaxError as exc:
            outcome['error'] = type(exc).__name__
            outcome['exc'] = exc
            return outcome
        ns = {'__name__': '__main__' if entry is None else 'solution', '__builtins__': builtins}
        outcome['ns'] = ns
        with redirect_stdout(ctx.out), redirect_stderr(ctx.out), _redirect_stdin(ctx.stdin):
            try:
                exec(code, ns)
                if setup:
                    exec(compile(setup, '<setup>', 'exec'), ns)
                if entry:
                    try:
                        expr = compile(entry, '<entry>', 'eval')
                    except SyntaxError:
                        exec(compile(entry, '<entry>', 'exec'), ns)
                    else:
                        outcome['value'] = eval(expr, ns)
                _finish_run(ctx)
            except _Exit as stop:
                outcome['exit'] = stop.code if isinstance(stop.code, int) else 1
            except SystemExit as stop:
                outcome['exit'] = stop.code if isinstance(stop.code, int) else (0 if stop.code is None else 1)
            except _Abort as stop:
                ctx.violation = ctx.violation or 'abort'
                outcome['error'] = 'SimulationError'
                outcome['exc'] = stop
            except StudioSetupError:
                raise
            except BaseException as exc:
                outcome['error'] = type(exc).__name__
                outcome['exc'] = exc
    finally:
        _STACK.pop()
        os.chdir(old_cwd)
    return outcome


class Result:
    """Kết quả một lần chạy (cả chương trình hoặc một lời gọi hàm)."""

    def __init__(self, ctx, outcome):
        self._ctx = ctx
        self.stdout = ctx.out.getvalue()
        self.error = outcome['error']
        exc = outcome['exc']
        self.message = str(exc) if exc is not None else ''
        self.traceback = _format_exc(exc) if exc is not None else ''
        self.value = outcome['value']
        self.ns = outcome['ns'] or {}
        self.dir = outcome['dir']
        self.exit_code = outcome['exit']
        self.threads = ctx.threads
        self.children = ctx.children
        self.waited = ctx.waited
        self.timeline = ctx.timeline
        self.subprocess_calls = ctx.subprocess_calls
        self.processes = ctx.processes
        self.pools = ctx.pools
        self.figures = list(ctx.figures)
        self.saved = list(ctx.saved)
        self.show_calls = ctx.show_calls
        self.elapsed = _time() - ctx.started_at

    def file(self, name):
        """Nội dung file sau khi chạy (None nếu file không tồn tại)."""
        try:
            with open(os.path.join(self.dir, name), encoding='utf-8', newline='') as fh:
                return fh.read()
        except FileNotFoundError:
            return None

    def exists(self, name):
        """File (kể cả file nhị phân như ảnh .png) có được tạo ra không."""
        return os.path.exists(os.path.join(self.dir, name))

    def var(self, name):
        # Đề PE yêu cầu lưu kết quả vào biến có tên cố định (message, lines…).
        # Thiếu biến thì nói thẳng lý do — "nhận None" khiến người học tưởng
        # logic sai trong khi chỉ đặt tên khác.
        if name not in self.ns:
            raise StudioSetupError(
                'Không thấy biến `%s` sau khi chạy. Đề yêu cầu lưu kết quả vào biến tên `%s` '
                '— đổi tên biến thì bộ chấm không tìm được.' % (name, name))
        return self.ns.get(name)

    @property
    def tk(self):
        return self._ctx.tk if self._ctx.tk is not None else _TkState()

    @property
    def charts(self):
        return [_chart(fig) for fig in self.figures]

    @property
    def thread_count(self):
        return len(self.threads)

    @property
    def starts_before_joins(self):
        return _starts_before_joins(self.timeline)

    @property
    def all_joined(self):
        return bool(self.threads) and all(t.joined for t in self.threads)

    @property
    def targets_callable(self):
        return bool(self.threads) and all(t.target_callable for t in self.threads)

    @property
    def process_count(self):
        return len(self.processes)

    @property
    def process_targets_callable(self):
        return bool(self.processes) and all(p.target_callable or type(p).run is not SimProcess.run
                                            for p in self.processes)

    @property
    def process_starts_before_joins(self):
        starts = [i for i, row in enumerate(self.timeline) if row[0] == 'pstart']
        joins = [i for i, row in enumerate(self.timeline) if row[0] == 'pjoin']
        return bool(starts) and bool(joins) and max(starts) < min(joins)

    @property
    def all_processes_joined(self):
        return bool(self.processes) and all(p.joined for p in self.processes)

    @property
    def reaped_all(self):
        # Chưa tạo child nào thì "đã chờ hết" là đúng một cách vô nghĩa — khung
        # trống không được qua ca này.
        return bool(self.children) and all(c.pid in self._ctx.reaped for c in self.children)

    @property
    def unreaped(self):
        return [c.pid for c in self.children if c.pid not in self._ctx.reaped]

    @property
    def grandchildren(self):
        return any(c.violation == 'grandchild' for c in self.children)

    @property
    def forks_before_waits(self):
        forks = [i for i, row in enumerate(self.timeline) if row[0] == 'fork']
        waits = [i for i, row in enumerate(self.timeline) if row[0] == 'wait']
        return bool(forks) and bool(waits) and max(forks) < min(waits)

    @property
    def threads_before_fork(self):
        return self._ctx.threads_before_fork or 0

    def after_waits(self, text):
        """`text` được parent in SAU khi đã chờ xong child cuối cùng."""
        waits = [row[2] for row in self.timeline if row[0] == 'wait']
        if not waits:
            return False
        return self.stdout.rfind(text) >= max(waits)

    @property
    def measured_lifecycle(self):
        """Giá trị trả về có bao trùm đoạn từ trước fork đầu tới sau lần chờ cuối."""
        start, end = self._ctx.clock_first_fork, self._ctx.clock_last_wait
        if not isinstance(self.value, (int, float)) or isinstance(self.value, bool):
            return False
        if start is None or end is None:
            return False
        # Đo từ trước vòng fork tới sau lần chờ cuối thì phải >= khoảng ảo này;
        # bắt đầu đo sau fork hoặc dừng đo trước waitpid sẽ hụt FORK_COST/WAIT_COST.
        return self.value >= (end - start) - 1e-6

    def __repr__(self):
        bits = ['stdout=%r' % self.stdout[:80]]
        if self.error:
            bits.append('error=%s' % self.error)
        return '<Result %s>' % ' '.join(bits)


def _starts_before_joins(timeline):
    starts = [i for i, row in enumerate(timeline) if row[0] == 'start']
    joins = [i for i, row in enumerate(timeline) if row[0] == 'join']
    return bool(starts) and bool(joins) and max(starts) < min(joins)


# ---------------------------------------------------------------- API cho ca chấm

class Studio:
    """Đối tượng `_studio` trong namespace của học viên — ca chấm gọi qua đây."""

    def __init__(self, source, files, main_dir):
        self.source = source
        self.files = files
        self.main = None
        self._main_dir = main_dir

    def run(self, vars=None, files=None, entry=None, setup=None, fail_fork_at=None, child_exit=None,
            stdin=None):
        """Chạy lại CẢ chương trình (thư mục mới), có thể thay dữ liệu đề cấp.

        `stdin=['Hoa', '20']` cho ca chấm đổi bộ input như đang đổi `vars` —
        bỏ trống thì dùng lại stdin client gửi cho cả bài.
        """
        merged = dict(self.files)
        merged.update(files or {})
        options = {'fail_fork_at': fail_fork_at, 'child_exit': child_exit or {}}
        return _run_program(self.source, merged, vars, entry, setup, options, stdin)

    def call(self, fn, *args, **kwargs):
        """Gọi một hàm, ghi lại stdout/lỗi/thread phát sinh trong lời gọi."""
        ctx = Ctx(can_fork=False, kind='call')
        outcome = {'exit': None, 'error': None, 'exc': None, 'value': None, 'ns': None,
                   'dir': self._main_dir}
        _STACK.append(ctx)
        old = os.getcwd()
        try:
            os.chdir(self._main_dir)
            with redirect_stdout(ctx.out), redirect_stderr(ctx.out), _redirect_stdin(ctx.stdin):
                try:
                    outcome['value'] = fn(*args, **kwargs)
                    _finish_run(ctx)
                except _Exit as stop:
                    outcome['exit'] = stop.code
                except StudioSetupError:
                    raise
                except BaseException as exc:
                    outcome['error'] = type(exc).__name__
                    outcome['exc'] = exc
        finally:
            _STACK.pop()
            os.chdir(old)
        return Result(ctx, outcome)

    def stdout(self, fn, *args, **kwargs):
        return self.call(fn, *args, **kwargs).stdout

    @staticmethod
    def expr(text):
        return Expr(text)

    def check(self, code):
        """Chạy một khối lệnh (assert...) trên bản sao namespace; đạt thì True."""
        scope = dict(self.main.ns) if self.main else {}
        old = os.getcwd()
        try:
            os.chdir(self._main_dir)
            sink = io.StringIO()
            with redirect_stdout(sink), redirect_stderr(sink):
                exec(compile(code, '<check>', 'exec'), scope)
        finally:
            os.chdir(old)
        return True

    def write(self, name, content):
        """Tạo file fixture trong thư mục của lần chạy chính, trả lại tên file."""
        with open(os.path.join(self._main_dir, name), 'w', encoding='utf-8', newline='') as fh:
            fh.write(content)
        return name

    def read(self, name):
        try:
            with open(os.path.join(self._main_dir, name), encoding='utf-8', newline='') as fh:
                return fh.read()
        except FileNotFoundError:
            return None

    def exists(self, name):
        return os.path.exists(os.path.join(self._main_dir, name))

    @property
    def tk(self):
        return self.main.tk

    @property
    def figures(self):
        return self.main.figures

    @property
    def charts(self):
        return self.main.charts

    @property
    def subprocess_calls(self):
        return self.main.subprocess_calls


def _run_program(source, files, vars=None, entry=None, setup=None, options=None, stdin=None):
    saved_job = dict(_JOB)
    _JOB.clear()
    _JOB.update({'source': source, 'files': files, 'vars': vars, 'entry': entry, 'setup': setup,
                 'stdin': stdin})
    saved_clock = _Clock.offset
    saved_pids, saved_mp = _PIDS[0], _MP_SEQ[0]
    _PIDS[0], _MP_SEQ[0] = SUB_BASE, 0
    _reset_pyplot()
    # Ctx đọc _JOB['stdin'] trong __init__ nên phải dựng SAU khi _JOB đã cập
    # nhật; _simulate_child cũng dựng Ctx trong lúc _JOB còn là job này, nhờ
    # vậy child chạy lại nhận đúng bộ input đó từ dòng đầu.
    ctx = Ctx(options=options or {})
    try:
        outcome = _execute(ctx, source, files, vars, entry, setup)
    finally:
        _JOB.clear()
        _JOB.update(saved_job)
        _PIDS[0], _MP_SEQ[0] = saved_pids, saved_mp
        # Đồng hồ ảo chỉ có nghĩa TRONG một lần chạy; giữ nguyên offset để
        # time.time() không chạy lùi giữa hai lần chạy liền nhau.
        _Clock.offset = max(_Clock.offset, saved_clock)
    return Result(ctx, outcome)


def _notes(result):
    """Mấy dòng tóm tắt mô phỏng, hiện mờ dưới console của học viên."""
    notes = []
    if result.threads:
        joined = sum(1 for t in result.threads if t.joined)
        line = '[mô phỏng thread] %d Thread được tạo, %d đã start, %d đã join' % (
            len(result.threads), sum(1 for t in result.threads if t.started), joined)
        if len(result.threads) > 1 and joined:
            line += ' — start hết trước khi join ✓' if result.starts_before_joins else ' — có thread join trước khi thread sau được start'
        notes.append(line)
        if any(not t.target_callable for t in result.threads):
            notes.append('[mô phỏng thread] Có Thread với target=None: target phải là tên hàm, không phải kết quả của lời gọi hàm.')
    for child in result.children:
        state = 'thoát mã %s' % child.exit_code
        if child.violation == 'grandchild':
            state = 'fork thêm process cháu ✗'
        elif child.leaked:
            state = 'không gọi os._exit — chạy tiếp code của parent ✗'
        elif child.error:
            state = 'lỗi %s' % child.error
        extra = ', %d thread' % len(child.threads) if child.threads else ''
        reaped = 'đã được chờ' if child.pid in result._ctx.reaped else 'CHƯA được parent chờ ✗'
        notes.append('[mô phỏng fork] child pid %d: %s%s, %s' % (child.pid, state, extra, reaped))
    for call in result.subprocess_calls[:6]:
        args = call['args']
        shown = ' '.join(str(a) for a in args) if isinstance(args, (list, tuple)) else str(args)
        state = 'quá timeout, bị kill' if call['timed_out'] else 'returncode %s' % call['returncode']
        notes.append('[mô phỏng subprocess] %s(%s) → %s' % (call['kind'], shown[:70], state))
    if result.processes:
        joined = sum(1 for p in result.processes if p.joined)
        notes.append('[mô phỏng multiprocessing] %d Process, %d đã start, %d đã join; exitcode %s' % (
            len(result.processes), sum(1 for p in result.processes if p.started), joined,
            [p.exitcode for p in result.processes]))
    for pool in result.pools:
        notes.append('[mô phỏng pool] %s: %d worker, %d việc' % (pool['kind'], pool['workers'], pool['tasks']))
    tk = result._ctx.tk
    if tk is not None and tk.objects:
        notes.append('[mô phỏng tkinter] %d cửa sổ, %d widget; mainloop() %s' % (
            len(tk.windows), len(tk.widgets), 'đã gọi' if tk.mainloop_called else 'CHƯA gọi'))
    if result.figures:
        notes.append('[matplotlib] %d Figure được tạo (backend Agg, không mở cửa sổ)' % len(result.figures))
    return notes


# ---------------------------------------------------------------- điểm vào

_PRELOAD = {'numpy': ('numpy',), 'pandas': ('pandas',), 'matplotlib': ('matplotlib', 'matplotlib.pyplot'),
            'sqlite3': ('sqlite3',)}


def _studio_preload(packages_json='[]'):
    """Import sẵn thư viện của bài (sau khi worker đã tải gói), TRƯỚC khi bấm đồng hồ 5 giây.

    `import pandas` / `import matplotlib.pyplot` tốn 1–3 giây trong Pyodide — tính vào
    giới hạn 5 giây thì bài đúng cũng có thể bị cắt. Runtime được giữ giữa các lần
    chạy nên chỉ tốn một lần. _install() đi trước để matplotlib nạp với backend Agg
    và móc ghi Figure.
    """
    _install()
    errors = []
    for name in json.loads(packages_json or '[]'):
        for module in _PRELOAD.get(name, ()):
            try:
                importlib.import_module(module)
            except Exception as exc:  # thiếu gói: để lần chạy thật báo lỗi cho học viên
                errors.append('%s: %s' % (module, exc))
    return json.dumps(errors)


# ---------------------------------------------------------------------------
# ĐO ĐỘ HIỆU QUẢ (step_4.perf) — chạy SAU khi mọi ca chấm đã đạt.
#
# Vì sao có: hai lời giải cùng ĐÚNG vẫn có thể cách nhau một bậc độ phức tạp, và
# bài học muốn chỉ ra điều đó. Vì sao không dùng đồng hồ: đo trong WASM lệch tới
# 2,07 lần trên cùng một đoạn code và còn phán SAI BẬC; `performance.now()` lại
# bị làm thô về ~100 µs vì trang không cross-origin isolated. Một học viên nộp
# đúng cùng một code hai lần mà nhận hai phán quyết khác nhau thì mất lòng tin
# vào cả hệ thống nhanh hơn bất cứ lỗi nào. Nên đo bằng ĐẾM, tất định tuyệt đối.
#
# HAI NGUỒN ĐẾM, KHÔNG PHẢI MỘT. Đây là chỗ dễ hiểu sai nhất:
# `sys.monitoring.CALL` KHÔNG bắn cho dunder gọi qua TOÁN TỬ. Đo trong chính
# Pyodide 314.0.7: vòng lặp lồng kinh điển sinh sự kiện cho enumerate/len/range/
# append/sorted và KHÔNG MỘT sự kiện nào cho `Probe.__eq__` (qua `==`) hay
# `list.__contains__` (qua `in`) — trong khi bộ đếm bên trong Probe thấy 65 phép
# so sánh. Số mũ theo CALL là 0,99 ("hiệu quả"); theo Probe là 1,97. Ai cài bảng
# phí trên CALL mà bỏ Probe sẽ dựng một bộ chấm KHEN đúng cái bài học muốn chữa,
# không ngoại lệ nào được ném, không log nào đỏ.
#
# ĐIỂM MÙ đã biết — bài rơi vào đây thì ĐỪNG khai `perf`:
#  · ghép chuỗi (`s += x`, `''.join(parts)` trong vòng lặp): `+=` là toán tử nên
#    CALL mù; `join` thì `arg0` là DẤU NGĂN chứ không phải danh sách (đo được),
#    nên không có cách nào thấy được khối lượng thật;
#  · dịch phần tử bằng toán tử (`out = [x] + out`): cùng lý do;
#  · `set`/`dict` trên dữ liệu đối kháng: chi phí thăm dò nằm ngoài tầm cả hai
#    nguồn (đo được: va chạm slot mà khác hash KHÔNG sinh một phép __eq__ nào);
#  · bài NumPy/pandas: `np.asarray([Probe(1)])` cho dtype int32 và phần tử KHÔNG
#    còn là Probe (đo được) — dùng `elem: "none"` cho nhóm này.
_PERF_TOOL = 3
_PERF_TRAN = 2_000_000   # trần: vượt là dừng sớm, trả 'unknown', không treo 5 giây
_PERF_SAN = 200          # sàn áp cho MẪU SỐ, kiểm TRƯỚC khi chia


class _PerfBoHoc(Exception):
    """Vượt trần gas. Chỉ được bắt trong pha đo, không bao giờ thành 'ca trượt'."""


# Hình dạng độ phức tạp lấy từ docs.python.org/3.14/builtins/time-complexity.html,
# trừ ba dòng dưới đây lấy từ CPython Objects/listobject.c (trang tài liệu không
# liệt kê chúng, mà chúng lại là lý do bảng phí tồn tại):
#  · list_count_impl quét HẾT list, không thoát sớm  -> len là đúng;
#  · list_index_impl và list_remove_impl THOÁT SỚM ở phần tử khớp đầu tiên,
#    nên len là tính THỪA. Giữ len vì hằng số không đổi số mũ, và vì bù lại cho
#    phần `PyObject_RichCompareBool` trả 1 ngay khi hai toán hạng là một object
#    (tức Probe không đếm được phép so sánh ấy).
_PHI_THEO_LEN = frozenset({
    'count', 'index', 'remove', 'copy', 'reverse', 'sum', 'min', 'max',
    'sorted', 'set', 'list', 'tuple', 'dict', 'any', 'all', 'enumerate',
})
# n·log n — dùng bit_length() chứ không math.log2: số nguyên, không có số thực,
# và nó là chặn TRÊN, tức sai về phía đắt (hướng lệch có chủ ý).
_PHI_THEO_NLOGN = frozenset({'sort'})
# Phí phẳng vì KHỐI LƯỢNG THẬT NẰM Ở ĐỐI SỐ, mà callback chỉ thấy arg0 = chính
# instance (đo được: `a.extend(b)` -> arg0 là `a`; `'-'.join(p)` -> arg0 là `'-'`).
# Tính len(arg0) ở đây là tính SAI CHIỀU, nên tính phẳng và ghi nhận điểm mù.
_PHI_PHANG_DU_LA_QUET = frozenset({'extend', 'update', 'join'})


def _perf_do_mot_lan(ham, ns, bien_dem):
    """Chạy `ham()` một lần, trả (số đơn vị, lỗi nếu có)."""
    mon = sys.monitoring
    tong = [0]

    def cb(code, offset, callable_, arg0):
        # Chỉ tính code của HỌC VIÊN. _run_program compile với tên 'main.py'
        # (dòng ~4550), còn ca chấm eval ra '<string>' — nên phép lọc này không
        # nuốt nhầm chi phí của chính bộ chấm.
        if code.co_filename != 'main.py':
            return
        ten = getattr(callable_, '__name__', '')
        if ten in _PHI_THEO_LEN:
            try:
                tong[0] += len(arg0)
            except TypeError:
                tong[0] += 1
        elif ten in _PHI_THEO_NLOGN:
            try:
                n = len(arg0)
                tong[0] += n * max(1, n.bit_length())
            except TypeError:
                tong[0] += 1
        else:
            tong[0] += 1
        if tong[0] > _PERF_TRAN:
            raise _PerfBoHoc('vượt trần %d đơn vị' % _PERF_TRAN)

    # Tool id là tài nguyên TOÀN CỤC và KHÔNG tự dọn: đo được rằng sau khi bỏ dở,
    # get_tool(3) vẫn trả về tên cũ và get_events(3) vẫn là CALL. Runtime lại
    # được giữ giữa các lần chạy, nên thiếu `finally` là lần sau ValueError.
    if mon.get_tool(_PERF_TOOL) is not None:
        return None, 'tool id %d đang có người dùng' % _PERF_TOOL
    mon.use_tool_id(_PERF_TOOL, 'pe-perf')
    try:
        mon.register_callback(_PERF_TOOL, mon.events.CALL, cb)
        mon.set_events(_PERF_TOOL, mon.events.CALL)
        try:
            ham()
        finally:
            mon.set_events(_PERF_TOOL, 0)
            mon.register_callback(_PERF_TOOL, mon.events.CALL, None)
    except _PerfBoHoc as exc:
        return None, str(exc)
    except BaseException as exc:
        return None, '%s: %s' % (type(exc).__name__, exc)
    finally:
        mon.free_tool_id(_PERF_TOOL)
    return tong[0] + bien_dem.lay(), None


class _PerfDem:
    """Nguồn đếm thứ hai: phép so sánh/băm mà CALL không bao giờ thấy."""

    def __init__(self):
        self.n = 0

    def lay(self):
        v = self.n
        self.n = 0
        return v


class _PerfKhong:
    """Dùng cho bài NumPy/pandas: bọc kiểu bị nuốt mất nên đừng bọc."""

    def lay(self):
        return 0


def _perf_lam_probe(dem):
    class _Probe(int):
        __slots__ = ()

        def __eq__(self, other):
            dem.n += 1
            return int(self) == int(other)

        def __ne__(self, other):
            dem.n += 1
            return int(self) != int(other)

        def __lt__(self, other):
            dem.n += 1
            return int(self) < int(other)

        def __le__(self, other):
            dem.n += 1
            return int(self) <= int(other)

        def __gt__(self, other):
            dem.n += 1
            return int(self) > int(other)

        def __ge__(self, other):
            dem.n += 1
            return int(self) >= int(other)

        def __hash__(self):
            dem.n += 1
            return int.__hash__(self)

    return _Probe


def _perf_sinh(n, boc, mode):
    """Dữ liệu chấm: CHỈ số nguyên.

    Chuỗi bị random hoá hash mỗi lần nạp trang nên số đếm đổi giữa hai phiên —
    tất định là điều kiện biên của cả phương pháp, không phải chi tiết. Và tránh
    bước nhảy luỹ thừa 2: không phải vì lời giải `set` bị oan (đo rồi, không bị)
    mà vì chi phí thăm dò nằm ngoài tầm cả hai nguồn đếm, tức có thể KHEN NHẦM.
    """
    buoc = 7 if mode != 'trung' else 3
    tho = [(i * buoc + 11) % (n * 2 + 7) for i in range(n)]
    return [boc(v) for v in tho] if boc is not None else tho


def _perf_hang(p):
    if p is None:
        return 'unknown'
    if p < 1.5:
        return 'efficient'
    if p >= 1.75:
        return 'slow'
    return 'unknown'


def _perf_chay(ns, perf):
    """Trả dict kết quả đo, hoặc {'verdict': 'unknown', 'reason': …}."""
    import math

    goi = perf.get('call')
    if not goi:
        return {'verdict': 'unknown', 'reason': 'bài không khai perf.call'}
    co_ban = int(perf.get('base') or 100)
    co = [co_ban, co_ban * 2, co_ban * 4]
    dung_probe = (perf.get('elem') or 'int') == 'int'
    mode = perf.get('shape') or 'thuong'

    dem = _PerfDem() if dung_probe else _PerfKhong()
    boc = _perf_lam_probe(dem) if dung_probe else None

    so_dem = []
    for n in co:
        du_lieu = _perf_sinh(n, boc, mode)
        rieng = dict(ns)
        rieng['_perf_data'] = du_lieu
        c, loi = _perf_do_mot_lan(lambda: eval(goi, rieng), rieng, dem)
        if loi is not None:
            return {'verdict': 'unknown', 'reason': loi}
        so_dem.append(c)

    cn, _c2n, c4n = so_dem
    # Sàn áp cho MẪU SỐ và kiểm TRƯỚC khi chia. Thiếu phép kiểm này thì một lời
    # giải mà bộ đếm mù (cn = c4n = 2) ra p = 0 và bị đọc thành "hằng số, rất
    # hiệu quả" — tức khen một lời giải có thể đang là bậc hai.
    if cn < _PERF_SAN:
        if cn == c4n:
            return {'verdict': 'efficient', 'counts': so_dem,
                    'reason': 'số đếm không đổi theo cỡ dữ liệu'}
        return {'verdict': 'unknown', 'counts': so_dem,
                'reason': 'số đếm quá nhỏ (%d) để kết luận' % cn}
    p = math.log2(c4n / cn) / 2
    return {'verdict': _perf_hang(p), 'counts': so_dem, 'p': round(p, 3)}


def _studio_main(source, cases_json, files_json, stdin_json='[]', perf_json='null'):
    # stdin_json và perf_json có mặc định để check-pyodide.mjs (và mọi chỗ gọi
    # cũ) vẫn gọi được bằng 3 tham số.
    _install()
    os.makedirs(WORK_ROOT, exist_ok=True)
    _STDIN['lines'] = json.loads(stdin_json or '[]') or []
    _STDIN['loose'] = None
    _TK_FALLBACK[0] = None
    _LOOSE_TK[0] = None
    files = {}
    for item in json.loads(files_json or '[]'):
        files[item['name']] = item.get('content', '')
    _SUPPORT_MODULES.clear()
    _SUPPORT_MODULES.update(name[:-3] for name in files if name.endswith('.py'))
    cases = json.loads(cases_json or '[]')
    results = []
    error = None

    main = _run_program(source, files)
    output = main.stdout
    if main.error and main.error != 'SimulationError':
        error = main.traceback
    elif main.error == 'SimulationError':
        error = 'Mô phỏng dừng: %s' % main.message
    notes = _notes(main)

    if error is None:
        studio = Studio(source, files, main.dir)
        studio.main = main
        # Callback (nút bấm, messagebox…) chạy từ ca chấm ghi vào trạng thái Tk của lần chạy chính.
        _TK_FALLBACK[0] = main.tk if main._ctx.tk is not None else None
        ns = main.ns
        ns['_studio'] = studio
        for case in cases:
            name = case.get('name') or case.get('call') or 'Kiểm tra'
            old = os.getcwd()
            try:
                os.chdir(main.dir)
                sink = io.StringIO()
                with redirect_stdout(sink), redirect_stderr(sink), _redirect_stdin(_loose_stdin()):
                    actual = eval(case['call'], ns)
                    expected = eval(case['expect'], ns)
                ok = actual == expected
                detail = ('Đạt: %r' % (actual,)) if ok else ('Mong đợi %r nhưng nhận %r' % (expected, actual))
                results.append({'name': name, 'passed': bool(ok), 'detail': detail[:400]})
            except (AssertionError, StudioSetupError) as exc:
                results.append({'name': name, 'passed': False,
                                'detail': (str(exc) or 'Điều kiện kiểm tra không thỏa.')[:400]})
            except (_Exit, _Abort, _Cut) as exc:
                results.append({'name': name, 'passed': False, 'detail': 'Mô phỏng dừng: %s' % exc})
            except BaseException as exc:
                results.append({'name': name, 'passed': False,
                                'detail': ('%s: %s' % (type(exc).__name__, exc))[:400]})
            finally:
                os.chdir(old)

    # Pha ĐO ĐỘ HIỆU QUẢ — NẰM NGOÀI vòng ca chấm, và đó là chuyện sống còn:
    # vòng trên kết thúc bằng `except BaseException` ghi {'passed': False}, nên
    # một ngoại lệ của pha đo (vượt trần gas chẳng hạn) rơi vào đó sẽ hiện ra
    # thành "ca kiểm tra trượt" GẮN TÊN CA CỦA HỌC VIÊN, trên một lời giải
    # ĐÚNG. Đo được: ngoại lệ ném từ callback của sys.monitoring nổi lên qua
    # đúng frame main.py của học viên, nên rủi ro ấy có thật.
    #
    # `results` phải KHÁC RỖNG: `all([])` là True, nên thiếu phép kiểm này thì
    # mọi bài không có ca chấm nào cũng lọt vào pha đo rồi cố eval một
    # `perf.call` không tồn tại.
    perf_kq = None
    perf = json.loads(perf_json or 'null')
    if perf and error is None and results and all(r['passed'] for r in results):
        old = os.getcwd()
        try:
            os.chdir(main.dir)
            # Sink riêng: harness cố ý gộp stderr vào stdout để console học viên
            # hiện cả hai, nên bất cứ thứ gì pha đo in ra sẽ thành KẾT QUẢ BỊ
            # CHẤM của họ.
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                perf_kq = _perf_chay(main.ns, perf)
        except BaseException as exc:
            # Mọi lỗi của pha đo chỉ được biến thành 'unknown'. Pha này không
            # bao giờ được làm một lời giải đúng trông như sai.
            perf_kq = {'verdict': 'unknown',
                       'reason': '%s: %s' % (type(exc).__name__, exc)}
        finally:
            os.chdir(old)

    return json.dumps({
        'tests': results,
        'error': error,
        'output': output[:12000],
        'notes': notes,
        'perf': perf_kq,
        'version': sys.version.split()[0],
    })
