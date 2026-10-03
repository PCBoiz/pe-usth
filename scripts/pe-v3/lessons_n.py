"""PE Python v3 — Nâng cao, chặng M8–M9 (N01–N08). Nguồn: PDF trang 7, 40–47, 80–90, 98–103."""
from authoring import T, TX, out, run

THREAD_ENV = ('Trình duyệt không chạy được thread thật, nên Studio MÔ PHỎNG threading.Thread: target chạy khi start() và '
              'bộ chấm ghi lại thứ tự tạo / start / join. Hãy chạy thêm file trên máy (Windows hoặc Linux) để thấy thread thật '
              '— thứ tự dòng in có thể khác mỗi lần.')
FORK_ENV = ('os.fork chỉ có trên Linux/macOS/WSL — Python trên Windows báo "module os has no attribute fork" (lỗi môi trường, '
            'không phải sai kiến thức). Studio chạy bản MÔ PHỎNG fork/waitpid trong trình duyệt để chấm cấu trúc parent/child; '
            'nghiệm thu thật bằng script Python 3 trên Linux/WSL, parent đơn luồng.')

IMPORT_C = 'import threading\nfrom c_language import C\n\n'
OBJ = 'obj = C("C", 1972, ["procedural"], "C17")\n'

WORKER = r'''    def _compile_worker(self, n):
        message = f"Compiling C code using {n} threads"
        message += f" with standard version {self.std_version}"
        print(message, flush=True)
'''

PARALLEL = r'''
    def parallel_compile(self, n):
        if type(n) is not int or n <= 0:
            raise ValueError("n must be a positive integer")

        threads = []
        for index in range(n):
            worker = threading.Thread(target=self._compile_worker, args=(n,))
            threads.append(worker)

        for worker in threads:
            worker.start()

        for worker in threads:
            worker.join()
'''

EX4_HEAD = 'import threading\nfrom c_language import C as BaseC\n\n\nclass C(BaseC):\n'
EX4_SOLUTION = EX4_HEAD + WORKER + PARALLEL + r'''

obj = C("C", 1972, ["procedural"], "C17")
obj.parallel_compile(3)
'''

N06_SOLUTION = r'''import os
import sys
from process_tools import wait_for_children


def main(m):
    if type(m) is not int or m <= 0:
        raise ValueError("m must be a positive integer")

    sys.stdout.flush()
    pids = []
    try:
        for index in range(m):
            pid = os.fork()
            if pid == 0:
                print("Child work", flush=True)
                os._exit(0)
            pids.append(pid)
    except OSError:
        wait_for_children(pids)
        raise

    if not wait_for_children(pids):
        raise RuntimeError("child failed")

    print("Parent finished", flush=True)


if __name__ == "__main__":
    main(2)
'''

N07_SOLUTION = r'''import os
import sys
from process_tools import wait_for_children

from thread_language import C


def main(m, n):
    if type(m) is not int or m <= 0:
        raise ValueError("m must be a positive integer")
    if type(n) is not int or n <= 0:
        raise ValueError("n must be a positive integer")

    obj = C("C", 1972, ["procedural"], "C17")
    sys.stdout.flush()
    pids = []
    try:
        for index in range(m):
            pid = os.fork()
            if pid == 0:
                try:
                    obj.parallel_compile(n)
                except Exception:
                    os._exit(1)
                os._exit(0)
            pids.append(pid)
    except OSError:
        wait_for_children(pids)
        raise

    if not wait_for_children(pids):
        raise RuntimeError("child failed")


if __name__ == "__main__":
    main(2, 3)
'''

N08_SOLUTION = r'''import os
import sys
import time
from thread_language import C as BaseC
from process_tools import wait_for_children


class C(BaseC):
    def benchmark(self, m, n):
        if type(m) is not int or m <= 0:
            raise ValueError("m must be a positive integer")
        if type(n) is not int or n <= 0:
            raise ValueError("n must be a positive integer")

        sys.stdout.flush()
        start = time.time()
        pids = []
        try:
            for index in range(m):
                pid = os.fork()
                if pid == 0:
                    try:
                        self.parallel_compile(n)
                    except Exception:
                        os._exit(1)
                    os._exit(0)
                pids.append(pid)
        except OSError:
            wait_for_children(pids)
            raise

        if not wait_for_children(pids):
            raise RuntimeError("child failed")

        elapsed = time.time() - start
        return elapsed


if __name__ == "__main__":
    obj = C("C", 1972, ["procedural"], "C17")
    elapsed = obj.benchmark(2, 3)
    print(elapsed)
'''

MSG = 'Compiling C code using {n} threads with standard version {v}'
K_WORKER = dict(sig='_compile_worker(self, n)', does='Thực hiện một công việc mô phỏng.',
                takes='self; n: int — đọc self.std_version', gives='None',
                effect='In một dòng có n và phiên bản; flush=True đẩy output ngay.',
                call='obj._compile_worker(3) → thông báo cho n = 3')
K_PARALLEL = dict(sig='parallel_compile(self, n)', does='Tạo n thread và chờ tất cả hoàn tất.',
                  takes='self; n là int dương, không phải bool', gives='None; n sai → ValueError',
                  effect='Tạo/start/join thread; worker in output; không bảo đảm thứ tự dòng in.',
                  call='obj.parallel_compile(3) → đúng ba worker hoàn tất')
K_WAIT = dict(sig='wait_for_children(pids)', does='Chờ và thu hồi trạng thái của tất cả child đã lưu (cấp sẵn).',
              takes='pids: list[int] — chỉ PID child của parent', gives='bool: True khi mọi child thoát mã 0',
              effect='Gọi waitpid cho từng child; một child lỗi vẫn chờ tiếp các PID còn lại.',
              call='wait_for_children([pid1, pid2]) → True/False')


def call_parallel(n, version='C17'):
    return f'_studio.call(C("C", 1972, ["procedural"], {version!r}).parallel_compile, {n!r})'


def ex4_tests(include_helper=True):
    tests = [
        T('n = 3: ba worker', call_parallel(3) + '.thread_count', 3),
        T('Start hết rồi mới join', call_parallel(3) + '.starts_before_joins', True),
        T('Join đủ mọi worker', call_parallel(3) + '.all_joined', True),
        T('target là method, args = (n,)', f"[(t.target_name, t._args) for t in {call_parallel(2)}.threads]",
          [('_compile_worker', (2,)), ('_compile_worker', (2,))]),
        T('n = 3: ba dòng đúng thông báo', call_parallel(3) + '.stdout', out(*[MSG.format(n=3, v='C17')] * 3)),
        T('n = 1, C23', call_parallel(1, 'C23') + '.stdout', out(MSG.format(n=1, v='C23'))),
        T('Trả None khi tất cả xong', call_parallel(2) + '.value', None),
    ]
    if include_helper:
        tests.insert(0, T('Helper in đúng một dòng', '_studio.stdout(C("C", 1972, [], "C17")._compile_worker, 3)',
                          out(MSG.format(n=3, v='C17'))))
    return tests


def ex4_validation_tests():
    rows = []
    for bad in (0, -1, True, 1.5, '3'):
        rows.append(T(f'n = {bad!r} → ValueError, chưa tạo worker',
                      f'(lambda r: (r.error, r.thread_count))({call_parallel(bad)})', ('ValueError', 0)))
    return rows


N08_ENTRY = 'C("C", 1972, ["procedural"], "C17").benchmark({m}, {n})'


def bench(m, n, **opts):
    extra = ''.join(f', {k}={v!r}' for k, v in opts.items())
    return f"_studio.run(entry={N08_ENTRY.format(m=m, n=n)!r}{extra})"


LESSONS = [
    # ------------------------------------------------------------------ N01
    dict(
        code='N01', title='Một thread', minutes=30,
        goal='Chạy một công việc trong thread và chờ nó kết thúc.',
        prereq='I12', support=['c_language.py'], env=THREAD_ENV,
        brief='Cho obj = C("C", 1972, ["procedural"], "C17") (c_language.py đã cấp, có method compile). Tạo một threading.Thread với target=obj.compile, start rồi join.',
        example='Một thread gọi compile của C17 → một dòng "Compiling C code using standard version C17".',
        demo=r'''import threading

def greet():
    print("Hello from", threading.current_thread().name)

worker = threading.Thread(target=greet)
worker.start()
worker.join()
print("Main continues")
''',
        explain=[
            'Thread(target=greet) tạo đối tượng MÔ TẢ công việc — chưa chạy gì.',
            'start() mới cho greet chạy trong thread con; join() bắt thread chính chờ worker xong.',
            'target nhận TÊN hàm (greet), không có dấu ngoặc: greet() sẽ chạy ngay trong thread chính và đưa None vào target.',
        ],
        predict=dict(q='target=obj.compile khác target=obj.compile() thế nào?', options=[
            ('Không ngoặc: giao hàm cho thread; có ngoặc: gọi ngay ở thread chính, target nhận None', 'Dấu ngoặc là lời gọi hàm.', True),
            ('Giống nhau', 'Một cái là hàm, một cái là kết quả (None) của lời gọi.', False),
            ('Có ngoặc mới chạy được', 'start() mới là thứ cho target chạy.', False),
        ]),
        myth=('"Có dòng Compiling in ra là thread đã chạy đúng"',
              'target=obj.compile() cũng in ra dòng đó — nhưng từ thread CHÍNH, còn thread con nhận target=None và không làm gì. '
              'Không gọi start hai lần trên cùng một Thread (RuntimeError).'),
        mcq=[
            dict(q='Gọi worker.start() hai lần trên cùng một Thread thì…', options=[
                ('RuntimeError: threads can only be started once', 'Cần thêm worker thì tạo Thread mới.', True),
                ('Chạy target hai lần', 'Một Thread chỉ start được một lần.', False),
                ('Lần hai bị bỏ qua', 'Python báo lỗi chứ không bỏ qua.', False),
            ]),
            dict(q='worker.run() khác worker.start() thế nào?', options=[
                ('run() chạy target NGAY trong thread hiện tại; start() mới tạo thread con', 'Gọi run() không tạo thread mới.', True),
                ('Giống nhau', 'Chỉ start() tạo luồng thực thi mới.', False),
                ('run() chạy nhanh hơn', 'Không phải chuyện tốc độ.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao không viết target=obj.compile()?',
            sample='Dấu ngoặc gọi compile ngay tại nơi tạo Thread, trong thread chính; giá trị trả về là None nên Thread nhận '
                   'target=None và thread con không làm gì. target phải là callable obj.compile (không ngoặc) để start() cho nó chạy trong thread con.'),
        scaffold=dict(
            intro='Dữ liệu mới: C23. Lắp ba thao tác Thread/start/join.',
            template=IMPORT_C + r'''obj = C("C", 1972, ["procedural"], "C23")
worker = {{slot1}}
{{slot2}}
{{slot3}}
''',
            slots=['threading.Thread(target=obj.compile)', 'worker.start()', 'worker.join()'],
            traps=[('threading.Thread(target=obj.compile())', 1, 'Gọi compile ngay ở thread chính.'),
                   ('worker.run()', 2, 'Chạy target trong thread chính, không tạo thread mới.'),
                   ('obj.compile()', 3, 'Gọi thêm một lần, không chờ worker.')]),
        flow=['Tạo Thread → chưa chạy.',
              'start() → compile chạy ở thread con.',
              'join() → chờ worker xong → chương trình tiếp tục.'],
        transfer='Thử object C23; kiểm công việc chạy trong thread con và đã xong sau join.',
        counter=dict(q='Với obj C23, worker in gì?', options=[
            'Compiling C code using standard version C23', 'Compiling C code using standard version C17', 'Không in gì'],
            correct='Compiling C code using standard version C23'),
        practice='Đưa callable obj.compile vào target; chưa gọi compile ngay.',
        steps=['Thread(...) tạo đối tượng mô tả công việc; nó chưa chạy cho đến start().',
               'target nhận tên hàm callable; join() chờ worker kết thúc trước khi chạy tiếp.'],
        partial=r'''worker = threading.Thread(target=obj.compile)
...''',
        io=[('Object C17', 'Một dòng compile C17; target chạy trong thread con'),
            ('Object C23', 'Một dòng compile C23; worker đã xong sau join')],
        starter=IMPORT_C + OBJ + '# Tự tạo Thread, start và join.\n',
        solution=IMPORT_C + OBJ + r'''worker = threading.Thread(target=obj.compile)
worker.start()
worker.join()
''',
        tests=[
            T('Tạo đúng một Thread', '_studio.main.thread_count', 1),
            T('target là method, không gọi sẵn', '_studio.main.targets_callable', True),
            T('Công việc chạy trong thread con', '_studio.main.threads[0].output', 'Compiling C code using standard version C17\n'),
            T('start trước, join sau', '_studio.main.starts_before_joins', True),
            T('Worker đã được join', '_studio.main.all_joined', True),
            T('Object C23', '_studio.run(vars={\'obj\': _studio.expr(\'C("C", 1972, ["procedural"], "C23")\')}).threads[0].output',
              'Compiling C code using standard version C23\n'),
        ],
        bad=[('gọi sẵn target', IMPORT_C + OBJ + 'worker = threading.Thread(target=obj.compile())\nworker.start()\nworker.join()\n'),
             ('quên join', IMPORT_C + OBJ + 'worker = threading.Thread(target=obj.compile)\nworker.start()\n')],
    ),

    # ------------------------------------------------------------------ N02
    dict(
        code='N02', title='Nhiều thread', minutes=30,
        goal='Chạy nhiều thread bằng hai vòng lặp start và join riêng.',
        prereq='N01', support=['c_language.py'], env=THREAD_ENV,
        brief='Tạo n Thread (target=obj.compile) và giữ trong list threads; vòng lặp thứ nhất start TẤT CẢ, vòng lặp thứ hai join TẤT CẢ. Bài này n đã là int dương.',
        example='n = 3 → ba worker gọi compile; cả ba xong trước khi chương trình tiếp tục.',
        demo=r'''import threading

def tick():
    print("tick", flush=True)

workers = []
for index in range(2):
    workers.append(threading.Thread(target=tick))

for worker in workers:
    worker.start()

for worker in workers:
    worker.join()
''',
        explain=[
            'range(2) tạo 2 lượt (0, 1); mỗi lượt tạo một Thread MỚI và lưu vào list.',
            'Vòng thứ nhất start hết để các worker có thể chạy chồng lấp.',
            'Vòng thứ hai join hết: chương trình chỉ đi tiếp khi mọi worker đã xong.',
        ],
        predict=dict(q='Nếu start rồi join ngay từng worker trong CÙNG một vòng, các worker còn chạy chồng lấp được không?', options=[
            ('Không — worker trước phải xong mới start worker sau, thành chạy tuần tự', 'join chặn nơi gọi tới khi worker đó xong.', True),
            ('Có', 'join ngay sau start không cho worker kế tiếp bắt đầu.', False),
            ('Báo lỗi', 'Không lỗi — chỉ mất tính song song.', False),
        ]),
        myth=('"Dùng lại một Thread cho nhiều lần start"',
              'Mỗi Thread chỉ start được một lần. Cần n worker thì tạo n Thread mới trong vòng lặp. Bài này chưa yêu cầu kiểm '
              'tra n (học ở N04).'),
        mcq=[
            dict(q='n = 4 thì target compile chạy mấy lần?', options=[
                ('4 lần, trên bốn Thread khác nhau', 'Mỗi lượt range tạo một Thread.', True),
                ('1 lần', 'Có bốn worker.', False),
                ('Tuỳ máy', 'Số worker xác định; chỉ thứ tự dòng in là tuỳ.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao tách vòng start và vòng join?',
            sample='join ngay sau từng start làm nơi gọi chờ worker đó xong rồi mới start worker kế tiếp — chạy tuần tự. '
                   'Start hết trước cho phép mọi worker chạy chồng lấp; vòng join sau đó bảo đảm tất cả đã xong trước khi đi tiếp.'),
        scaffold=dict(
            intro='Lắp ba chỗ: lưu worker, start, join.',
            template=IMPORT_C + OBJ + r'''n = 3
threads = []
for index in range(n):
    worker = threading.Thread(target=obj.compile)
    {{slot1}}

for worker in threads:
    {{slot2}}

for worker in threads:
    {{slot3}}
''',
            slots=['threads.append(worker)', 'worker.start()', 'worker.join()'],
            traps=[('worker.run()', 2, 'Chạy target ngay ở thread chính, không tạo thread mới.'),
                   ('threads = [worker]', 1, 'Ghi đè, chỉ giữ worker cuối.'),
                   ('obj.compile()', 2, 'Gọi ở thread chính.')]),
        flow=['Tạo [worker0, worker1, worker2].', 'start 0/1/2.', 'join 0/1/2 → hoàn tất.'],
        transfer='Đổi n = 1 rồi n = 4; kiểm đúng số worker và tất cả đều hoàn tất.',
        counter=dict(q='n = 1 thì có mấy dòng Compiling?', options=['1', '3', '0'], correct='1'),
        practice='Tạo Thread mới cho từng lượt lặp, giữ trong list, rồi start toàn bộ trước khi join.',
        steps=['range(n) tạo n lượt; mỗi lượt tạo một Thread mới và lưu vào threads.',
               'Vòng đầu start tất cả; vòng sau mới join tất cả.'],
        partial=r'''for index in range(n):
    worker = threading.Thread(target=obj.compile)
    threads.append(worker)
...''',
        io=[('n = 1', 'Một worker hoàn tất'), ('n = 3', 'Ba worker hoàn tất; tất cả start trước join')],
        starter=IMPORT_C + OBJ + 'n = 3\nthreads = []\n# Tự tạo n worker, start hết rồi join hết.\n',
        solution=IMPORT_C + OBJ + r'''n = 3
threads = []
for index in range(n):
    worker = threading.Thread(target=obj.compile)
    threads.append(worker)

for worker in threads:
    worker.start()

for worker in threads:
    worker.join()
''',
        tests=[
            T('n = 3: ba Thread', '_studio.main.thread_count', 3),
            T('Start hết trước khi join', '_studio.main.starts_before_joins', True),
            T('Join đủ', '_studio.main.all_joined', True),
            T('target là method obj.compile', '_studio.main.targets_callable', True),
            T('n = 1: một worker', "_studio.run(vars={'n': 1}).thread_count", 1),
            T('n = 4: bốn worker, bốn dòng', "len(_studio.run(vars={'n': 4}).stdout.splitlines())", 4),
        ],
        bad=[('start + join cùng vòng', IMPORT_C + OBJ + 'n = 3\nfor index in range(n):\n    worker = threading.Thread(target=obj.compile)\n    worker.start()\n    worker.join()\n')],
    ),

    # ------------------------------------------------------------------ N03
    dict(
        code='N03', title='Ex4 có hỗ trợ', minutes=35,
        goal='Ghép helper và parallel_compile theo ba checkpoint.',
        prereq='N02', support=['c_language.py'], env=THREAD_ENV,
        brief='Trong class C(BaseC), viết helper _compile_worker(self, n) in "Compiling C code using {n} threads with standard version {std_version}" (flush=True), và hoàn thành parallel_compile(self, n): tạo n Thread với target=self._compile_worker, args=(n,), start hết rồi join hết. Validation n đã cấp.',
        example='n = 3, C17 → ba dòng "Compiling C code using 3 threads with standard version C17".',
        demo=r'''import threading

def report(label, total):
    print(f"{label}: {total}", flush=True)

worker = threading.Thread(target=report, args=("tasks", 3))
worker.start()
worker.join()

single = (3,)
print(type(single), len(single))
''',
        explain=[
            'args là TUPLE các đối số truyền vào target: Thread chạy report("tasks", 3).',
            'Tuple một phần tử phải có dấu phẩy: (3,) — còn (3) chỉ là số 3 trong ngoặc.',
            'flush=True đẩy output ra ngay; cần khi dùng lại trong process ở N07–N08.',
        ],
        predict=dict(q='args=(n,) dùng để làm gì? Vì sao có dấu phẩy?', options=[
            ('Truyền n vào helper; dấu phẩy để (n,) là tuple một phần tử', 'Thread gọi target(*args).', True),
            ('Dấu phẩy thừa, bỏ đi cũng được', '(n) chỉ là n trong ngoặc — không phải tuple.', False),
            ('args là số thread cần tạo', 'Số thread do vòng range(n) quyết định.', False),
        ]),
        myth=('"target=self._compile_worker(n) cho gọn"',
              'Có ngoặc là gọi helper NGAY trong thread hiện tại; Thread nhận None. Đưa tên method vào target, đối số vào '
              'args=(n,). Đừng hiển thị cả mẫu một lúc — làm lần lượt ba checkpoint: tạo list, start hết, join hết.'),
        mcq=[
            dict(q='args=(n) với n = 3 sẽ thế nào khi thread chạy?', options=[
                ('Lỗi TypeError trong thread — (3) không phải tuple', 'Thread cần args là iterable các đối số.', True),
                ('Chạy bình thường', '(3) là số nguyên 3.', False),
                ('Tạo 3 thread', 'args không quyết định số thread.', False),
            ]),
        ],
        why=dict(
            prompt='Phân biệt đối tượng Thread đã tạo với công việc đã chạy.',
            sample='Tạo Thread chỉ mô tả target và args, chưa chạy gì. start() mới cho công việc chạy trong thread con, '
                   'join() chờ nó kết thúc. Vì vậy parallel_compile tạo list n Thread, start hết rồi join hết mới trả về.'),
        scaffold=dict(
            intro='Ba checkpoint của parallel_compile.',
            template=EX4_HEAD + WORKER + r'''
    def parallel_compile(self, n):
        if type(n) is not int or n <= 0:
            raise ValueError("n must be a positive integer")
        threads = []
        for index in range(n):
            threads.append({{slot1}})
        for worker in threads:
            {{slot2}}
        for worker in threads:
            {{slot3}}
''',
            slots=['threading.Thread(target=self._compile_worker, args=(n,))', 'worker.start()', 'worker.join()'],
            traps=[('threading.Thread(target=self._compile_worker(n))', 1, 'Gọi helper ngay ở thread hiện tại.'),
                   ('threading.Thread(target=self._compile_worker, args=n)', 1, 'args phải là tuple (n,).'),
                   ('self._compile_worker(n)', 2, 'Chạy tuần tự trong thread chính.')]),
        flow=['parallel_compile(3) → ba Thread target = helper, args = (3,).',
              'start 3 worker → ba thông báo.',
              'join đủ → trả None.'],
        transfer='Đổi n = 1 sang n = 3; thử bản start/join trong cùng một vòng rồi sửa lại.',
        counter=dict(q='obj.parallel_compile(1) với C23 in gì?', options=[
            MSG.format(n=1, v='C23'), MSG.format(n=3, v='C23'), 'Không in gì'], correct=MSG.format(n=1, v='C23')),
        practice='Checkpoint 1 tạo list; checkpoint 2 start hết; checkpoint 3 join hết. Kiểm từng bước.',
        steps=['Helper chỉ in thông báo chứa n và phiên bản, flush=True.',
               'target giữ callable; args=(n,) là tuple một phần tử truyền n vào helper.',
               'parallel_compile tạo list, start toàn bộ rồi join toàn bộ; không yêu cầu output theo thứ tự.'],
        partial=r'''worker = threading.Thread(target=self._compile_worker, args=(n,))
threads.append(worker)''',
        io=[('n = 1 / C17', 'Một dòng có 1 threads và C17'), ('n = 3 / C17', 'Ba dòng có 3 threads và C17; trả về khi tất cả xong')],
        contracts=[K_WORKER, K_PARALLEL],
        starter=EX4_HEAD + r'''    def _compile_worker(self, n):
        pass

    def parallel_compile(self, n):
        if type(n) is not int or n <= 0:
            raise ValueError("n must be a positive integer")
        # Tự viết tạo list, start và join.
''',
        solution=EX4_SOLUTION,
        tests=ex4_tests(),
        bad=[('args không phải tuple', EX4_SOLUTION.replace('args=(n,)', 'args=n')),
             ('join cùng vòng start', EX4_HEAD + WORKER + '\n    def parallel_compile(self, n):\n        for index in range(n):\n            worker = threading.Thread(target=self._compile_worker, args=(n,))\n            worker.start()\n            worker.join()\n')],
    ),

    # ------------------------------------------------------------------ N04
    dict(
        code='N04', title='Ex4 tự làm và sửa lỗi', minutes=40, gate=True,
        goal='Tự giải Ex4 và kiểm dữ liệu n.',
        prereq='N03', support=['c_language.py'], env=THREAD_ENV,
        brief='Helper _compile_worker đã cấp. Tự viết lại parallel_compile(n) từ khung rỗng, kể cả kiểm tra n: chỉ nhận int dương — không nhận bool (True), 1.5 hay "3". Dữ liệu sai phải raise ValueError TRƯỚC khi tạo worker; dữ liệu đúng thì tạo n worker, start hết rồi join hết.',
        example='n = 3 hợp lệ; n = 0, -1, True, 1.5 hoặc "3" → ValueError.',
        explain=[
            'bool là lớp con của int: isinstance(True, int) là True. Dùng type(n) is int để loại bool.',
            'raise ValueError báo dữ liệu không hợp lệ — không âm thầm chạy 0 worker.',
            'Sau validation, tạo/start/join như N02; helper giữ đúng một nhiệm vụ in thông báo.',
            'Cửa kiểm tra Ex4: bộ chấm đo vòng đời worker thật sự (tạo, start hết, join hết), không chỉ đếm dòng in.',
        ],
        predict=dict(q='Vì sao chỉ kiểm isinstance(n, int) chưa loại được True?', options=[
            ('Vì bool là lớp con của int nên isinstance(True, int) là True', 'type(True) is int là False.', True),
            ('Vì True bằng 1 nên hợp lệ', 'Đề v3 coi bool là dữ liệu sai.', False),
            ('isinstance đã loại được', 'Không — cần type(n) is int.', False),
        ]),
        myth=('"Kiểm n xong thì không cần join"',
              'Validation kiểm ĐẦU VÀO trước khi chạy; join bảo đảm vòng đời worker đã HOÀN TẤT trước khi trả về — hai việc khác '
              'nhau. Và đừng hứa worker bắt đầu cùng lúc hay chạy nhanh hơn: đó không phải tiêu chí Ex4.'),
        mcq=[
            dict(q='parallel_compile(1.5) theo hợp đồng v3 thì…', options=[
                ('ValueError, chưa tạo worker nào', 'Chỉ nhận int dương.', True),
                ('Tạo 1 worker', 'Không làm tròn.', False),
                ('TypeError từ range', 'Phải chặn sớm bằng ValueError.', False),
            ]),
        ],
        why=dict(
            prompt='Validation n và join kiểm hai điều khác nhau thế nào?',
            sample='Validation kiểm đầu vào trước khi chạy: n phải là int dương, không phải bool, sai thì raise ValueError khi '
                   'chưa có worker nào. join kiểm vòng đời: mọi worker đã start đều kết thúc trước khi parallel_compile trả về.'),
        flow=['n sai → ValueError trước bước tạo.',
              'n hợp lệ → n worker → start hết → join hết → trả None.'],
        transfer='Bộ chấm dùng n khác và fixture đo vòng đời worker; dữ liệu sai phải lỗi trước khi có worker.',
        counter=dict(q='parallel_compile("3") → ?', options=['ValueError', 'Ba worker', 'TypeError'], correct='ValueError'),
        practice='Kiểm type(n) is int và n > 0 trước khi tạo worker, rồi start hết / join hết.',
        steps=['if type(n) is not int or n <= 0: raise ValueError("n must be a positive integer")',
               'threads = [Thread(target=self._compile_worker, args=(n,)) cho mỗi lượt]; start hết; join hết.'],
        partial=r'''    def parallel_compile(self, n):
        if type(n) is not int or n <= 0:
            raise ValueError("n must be a positive integer")
        ...''',
        io=[('n = 3', 'Ba worker và ba thông báo; trả None khi xong'), ('n = 0', 'ValueError; chưa tạo worker')],
        contracts=[K_WORKER, K_PARALLEL],
        starter=EX4_HEAD + WORKER + r'''
    def parallel_compile(self, n):
        pass
''',
        solution=EX4_SOLUTION,
        tests=ex4_tests(include_helper=False) + ex4_validation_tests(),
        bad=[('isinstance cho qua True', EX4_SOLUTION.replace('type(n) is not int', 'not isinstance(n, int)')),
             ('không kiểm n', EX4_SOLUTION.replace('        if type(n) is not int or n <= 0:\n            raise ValueError("n must be a positive integer")\n', ''))],
    ),

    # ------------------------------------------------------------------ N05
    dict(
        code='N05', title='Một process con', minutes=35,
        goal='Hiểu hai nhánh sau fork và chờ một child.',
        prereq='N04', env=FORK_ENV,
        brief='Trong khung script POSIX, dùng os.fork(): nhánh child (pid == 0) in "Child work" (flush=True) rồi os._exit(0); nhánh parent chờ bằng os.waitpid(pid, 0), kiểm trạng thái thoát (WIFEXITED/WEXITSTATUS, sai thì raise RuntimeError) rồi mới in "Parent finished".',
        example='Child in Child work; parent chỉ in Parent finished sau khi child đã kết thúc.',
        demo=r'''import os

pid = os.fork()
if pid == 0:
    print("child: my pid is", os.getpid(), flush=True)
    os._exit(0)

print("parent: created child", pid)
os.waitpid(pid, 0)
print("parent: child done")
''',
        explain=[
            'fork tạo process con. Cùng một lời gọi trở về HAI lần: trả 0 trong child, trả PID của child trong parent.',
            'Child làm việc rồi os._exit(0) — nếu không thoát, child chạy tiếp cả phần code của parent.',
            'Parent gọi waitpid(pid, 0) để chờ và thu hồi child. status không phải exit code: dùng WIFEXITED rồi WEXITSTATUS.',
            'if __name__ == "__main__": chỉ gọi main khi chạy file trực tiếp; import file thì không tự chạy.',
        ],
        predict=dict(q='Giá trị pid trong child và parent khác nhau thế nào?', options=[
            ('Child nhận 0; parent nhận PID (số dương) của child', 'Nhờ vậy if pid == 0 tách được hai nhánh.', True),
            ('Cả hai nhận PID của child', 'Child nhận 0.', False),
            ('Parent nhận 0', 'Ngược lại.', False),
        ]),
        myth=('"Thay fork bằng thread cho chạy được trên Windows"',
              'Thread và process là hai cơ chế khác nhau — bài này học process. Lỗi "os has no attribute fork" trên Windows là '
              'lỗi môi trường: chạy trên WSL/Linux. Lưu ý thêm: _exit không tự flush output — child in bằng flush=True, parent '
              'gọi sys.stdout.flush() trước khi fork để output đệm không bị nhân đôi.'),
        mcq=[
            dict(q='Child quên os._exit(0) thì…', options=[
                ('Child chạy tiếp code của parent: tự waitpid (lỗi), in cả "Parent finished"', 'Child là bản sao của parent.', True),
                ('Child tự dừng sau print', 'Không có gì dừng nó.', False),
                ('Parent báo lỗi ngay', 'Parent không biết child đang làm gì.', False),
            ]),
            dict(q='status trả về từ os.waitpid là gì?', options=[
                ('Một số mã hoá; dùng os.WIFEXITED(status) rồi os.WEXITSTATUS(status) để lấy exit code', 'Không so trực tiếp với 0/1.', True),
                ('Chính exit code của child', 'Exit code nằm ở byte cao của status.', False),
                ('PID của child', 'PID là phần tử thứ nhất của tuple.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao child phải _exit và parent phải waitpid?',
            sample='Child là bản sao của parent: nếu không os._exit sau khi làm việc, nó chạy tiếp phần code của parent. '
                   'waitpid giúp parent chờ child kết thúc và thu hồi trạng thái (không để lại zombie), nhờ đó parent chỉ in '
                   'Parent finished sau khi child xong và biết child thoát thành công hay lỗi.'),
        scaffold=dict(
            intro='Lắp điều kiện nhánh child, lệnh thoát và lệnh chờ.',
            template=r'''import os
import sys

def main():
    sys.stdout.flush()
    pid = os.fork()
    if {{slot1}}:
        print("Child work", flush=True)
        {{slot2}}

    waited_pid, status = {{slot3}}
    if not os.WIFEXITED(status) or os.WEXITSTATUS(status) != 0:
        raise RuntimeError("child failed")
    print("Parent finished", flush=True)
''',
            slots=['pid == 0', 'os._exit(0)', 'os.waitpid(pid, 0)'],
            traps=[('pid > 0', 1, 'Đó là nhánh parent.'),
                   ('return', 2, 'Child quay về và chạy tiếp code của parent ở nơi gọi main.'),
                   ('time.sleep(1)', 3, 'Ngủ không phải chờ: không thu hồi child, không biết exit code.')]),
        flow=['fork → child pid = 0 → in Child work → _exit(0).',
              'Parent có PID child → waitpid → kiểm status.',
              'Child thành công → in Parent finished.'],
        transfer='Đội dev thêm fixture child chậm hoặc exit code 1; kiểm parent vẫn chờ và nhận đúng trạng thái.',
        counter=dict(q='Child thoát với mã 1 thì parent làm gì?', options=[
            'raise RuntimeError("child failed")', 'In Parent finished như thường', 'Không biết được'],
            correct='raise RuntimeError("child failed")'),
        practice='Chạy từ script trên Linux/WSL; parent đơn luồng. Child phải thoát sau khi làm xong việc.',
        steps=['fork tạo process con; trả 0 trong child, PID child trong parent.',
               'Child làm việc rồi _exit(0); flush=True đẩy output trước _exit.',
               'Parent waitpid(pid, 0); dùng WIFEXITED/WEXITSTATUS đọc trạng thái.'],
        partial=r'''    pid = os.fork()
    if pid == 0:
        print("Child work", flush=True)
        os._exit(0)
    ...''',
        io=[('Chạy script mẫu', 'Child work trước Parent finished; parent thoát mã 0'),
            ('Child chậm (fixture)', 'Parent vẫn chờ child trước thông báo cuối')],
        starter=r'''import os
import sys


def main():
    sys.stdout.flush()
    # Tự fork, tách nhánh child/parent và waitpid.


if __name__ == "__main__":
    main()
''',
        solution=r'''import os
import sys


def main():
    sys.stdout.flush()
    pid = os.fork()
    if pid == 0:
        print("Child work", flush=True)
        os._exit(0)

    waited_pid, status = os.waitpid(pid, 0)
    if not os.WIFEXITED(status) or os.WEXITSTATUS(status) != 0:
        raise RuntimeError("child failed")
    print("Parent finished", flush=True)


if __name__ == "__main__":
    main()
''',
        tests=[
            T('Child work rồi Parent finished', '_studio.main.stdout', out('Child work', 'Parent finished')),
            T('Đúng một child', 'len(_studio.main.children)', 1),
            T('Child thoát bằng os._exit(0)', '[(c.exited, c.exit_code) for c in _studio.main.children]', [(True, 0)]),
            T('Parent đã chờ (thu hồi) child', '_studio.main.reaped_all', True),
            T('Parent finished in SAU khi chờ', "_studio.main.after_waits('Parent finished')", True),
            T('Child exit 1 → parent RuntimeError', "_studio.run(child_exit={0: 1}).error", 'RuntimeError'),
        ],
        bad=[('quên _exit', r'''import os
import sys


def main():
    sys.stdout.flush()
    pid = os.fork()
    if pid == 0:
        print("Child work", flush=True)

    waited_pid, status = os.waitpid(pid, 0)
    print("Parent finished", flush=True)


if __name__ == "__main__":
    main()
'''), ('không chờ child', r'''import os

def main():
    pid = os.fork()
    if pid == 0:
        print("Child work", flush=True)
        os._exit(0)
    print("Parent finished", flush=True)

if __name__ == "__main__":
    main()
''')],
    ),

    # ------------------------------------------------------------------ N06
    dict(
        code='N06', title='Tạo m process', minutes=40,
        goal='Tạo đúng m child mà không nhân đôi cây process.',
        prereq='N05', support=['process_tools.py'], env=FORK_ENV,
        brief='Viết vòng tạo trong main(m): chỉ parent tiếp tục vòng lặp tạo m child; mỗi child in "Child work" rồi os._exit(0); parent lưu PID vào pids. Validation m, khung xử lý fork lỗi và lệnh chờ wait_for_children (process_tools.py) đã cấp.',
        example='m = 2 → hai Child work, rồi một Parent finished.',
        demo=r'''import os

pids = []
for index in range(2):
    pid = os.fork()
    if pid == 0:
        print("child", index, flush=True)
        os._exit(0)
    pids.append(pid)

for pid in pids:
    os.waitpid(pid, 0)
print("parent saw", len(pids), "children")
''',
        explain=[
            'Parent lặp m lần và lưu PID trả về. Child có pid = 0 nên vào nhánh if và kết thúc bằng _exit — không quay lại vòng for.',
            'Chỉ parent append PID; child không bao giờ tới dòng pids.append.',
            'Tạo ĐỦ m child rồi mới chờ: các child làm việc chồng lấp. Chờ ngay trong vòng lặp thì parent tạo từng child một.',
            'Khung try/except cấp sẵn: fork lỗi giữa chừng → chờ những child đã tạo rồi raise lại lỗi.',
        ],
        predict=dict(q='Nếu child không thoát, nó có tiếp tục vòng for tạo thêm child không?', options=[
            ('Có — child chạy tiếp vòng lặp và fork ra process cháu', 'Cây process bị nhân đôi.', True),
            ('Không — child tự biết dừng', 'Child là bản sao của parent tại thời điểm fork.', False),
            ('Chỉ parent mới có vòng for', 'Child có cùng code và trạng thái.', False),
        ]),
        myth=('"Chờ ngay từng child cho chắc"',
              'waitpid ngay trong vòng tạo khiến parent đứng chờ child này xong mới tạo child kế tiếp — mất tính đồng thời. '
              'Không append PID 0 của nhánh child, và không để child tiếp tục vòng tạo process.'),
        mcq=[
            dict(q='m = 3, child thứ hai thoát mã 1. Parent nên làm gì?', options=[
                ('Chờ đủ cả ba rồi raise RuntimeError', 'wait_for_children vẫn chờ tiếp PID còn lại.', True),
                ('Dừng ngay, bỏ mặc child thứ ba', 'Child chưa thu hồi thành zombie.', False),
                ('Coi như thành công', 'Child lỗi không được ghi nhận là thành công.', False),
            ]),
            dict(q='fork lỗi ở lượt thứ 2 (đã có 1 child). Khung cấp sẵn làm gì?', options=[
                ('Chờ child đã tạo rồi raise lại OSError', 'Không để child nào chưa được thu hồi.', True),
                ('Bỏ qua lỗi, chạy tiếp', 'Lỗi phải được báo.', False),
                ('Kill child đã tạo', 'Bài không yêu cầu kill.', False),
            ]),
        ],
        why=dict(
            prompt='Tại sao chờ sau vòng tạo, thay vì chờ ngay từng child?',
            sample='Chờ ngay mỗi lượt khiến parent chưa tạo child kế tiếp cho tới khi child trước xong — các child chạy tuần tự. '
                   'Tạo đủ m child trước rồi mới chờ cho phép chúng làm việc chồng lấp; wait_for_children vẫn thu hồi đủ và kiểm exit status.'),
        scaffold=dict(
            intro='Lắp vòng tạo m child.',
            template=r'''    try:
        for index in range(m):
            pid = {{slot1}}
            if pid == 0:
                print("Child work", flush=True)
                {{slot2}}
            {{slot3}}
    except OSError:
        wait_for_children(pids)
        raise
''',
            slots=['os.fork()', 'os._exit(0)', 'pids.append(pid)'],
            traps=[('os.getpid()', 1, 'Chỉ lấy PID hiện tại, không tạo process.'),
                   ('continue', 2, 'Child quay lại vòng for → fork ra process cháu.'),
                   ('os.waitpid(pid, 0)', 3, 'Chờ ngay → tuần tự, và không lưu PID.')]),
        flow=['Parent tạo pid1 → child 1 làm việc, _exit.',
              'Parent tạo pid2 → child 2 làm việc, _exit.',
              'Parent chờ pid1, pid2 → in Parent finished.'],
        transfer='Thử m = 1 và m = 3; fixture một child lỗi hoặc fork lỗi sau child đầu.',
        counter=dict(q='Bỏ os._exit(0) với m = 2 thì có bao nhiêu process (kể cả parent)?',
                     options=['4 — child đầu fork thêm một cháu', '3', '2'], correct='4 — child đầu fork thêm một cháu'),
        practice='Chỉ parent append PID; child in rồi thoát, không quay lại vòng for.',
        steps=['Parent lặp m lần, lưu PID trả về; child có pid = 0 nên kết thúc nhánh bằng _exit.',
               'wait_for_children chờ từng PID sau khi tạo đủ, kiểm exit status.',
               'try/except cấp sẵn: fork báo OSError giữa chừng thì chờ child đã có rồi báo lại lỗi.'],
        partial=r'''        for index in range(m):
            pid = os.fork()
            if pid == 0:
                ...
            pids.append(pid)''',
        io=[('m = 1', 'Một child; parent chỉ hoàn tất sau child'), ('m = 2', 'Đúng hai child, không có process cháu')],
        contracts=[K_WAIT],
        starter=r'''import os
import sys
from process_tools import wait_for_children


def main(m):
    if type(m) is not int or m <= 0:
        raise ValueError("m must be a positive integer")

    sys.stdout.flush()
    pids = []
    try:
        # Tự tạo m child: child in "Child work" rồi os._exit(0);
        # parent lưu PID vào pids.
        pass
    except OSError:
        wait_for_children(pids)
        raise

    if not wait_for_children(pids):
        raise RuntimeError("child failed")

    print("Parent finished", flush=True)


if __name__ == "__main__":
    main(2)
''',
        solution=N06_SOLUTION,
        tests=[
            T('m = 2: hai Child work rồi Parent finished', '_studio.main.stdout', out('Child work', 'Child work', 'Parent finished')),
            T('m = 1: một child', "len(_studio.run(entry='main(1)').children)", 1),
            T('m = 3: ba child, không process cháu', "(lambda r: (len(r.children), r.grandchildren))(_studio.run(entry='main(3)'))", (3, False)),
            T('Mọi child thoát bằng _exit(0)', "[(c.exited, c.exit_code) for c in _studio.main.children]", [(True, 0), (True, 0)]),
            T('Tạo đủ rồi mới chờ', '_studio.main.forks_before_waits', True),
            T('Parent finished sau khi chờ đủ', "_studio.main.after_waits('Parent finished')", True),
            T('Một child exit 1 → chờ đủ rồi RuntimeError',
              "(lambda r: (r.error, r.reaped_all))(_studio.run(entry='main(3)', child_exit={1: 1}))", ('RuntimeError', True)),
            T('Fork lỗi lượt 2 → chờ child đã tạo, raise OSError',
              "(lambda r: (r.error, len(r.children), r.unreaped))(_studio.run(entry='main(3)', fail_fork_at=1))", ('OSError', 1, [])),
        ],
        bad=[('quên _exit', N06_SOLUTION.replace('                os._exit(0)\n', '')),
             ('chờ trong vòng tạo', N06_SOLUTION.replace('            pids.append(pid)\n', '            pids.append(pid)\n            os.waitpid(pid, 0)\n            pids.remove(pid)\n'))],
    ),

    # ------------------------------------------------------------------ N07
    dict(
        code='N07', title='Mỗi process chạy n thread', minutes=40,
        goal='Ghép process với method thread đã học.',
        prereq='N06', support=['thread_language.py', 'process_tools.py'], env=FORK_ENV,
        brief='Viết phần child trong main(m, n): mỗi child gọi obj.parallel_compile(n) (thread_language.py đã cấp); lỗi thì os._exit(1), xong thì os._exit(0). Parent đơn luồng tạo m child rồi chờ đủ bằng wait_for_children. Validation m, n và khung fork/chờ đã cấp.',
        example='m = 2, n = 3 → hai child; mỗi child tạo ba thread, tổng sáu công việc.',
        demo=r'''import os
import threading

def job():
    print("pid", os.getpid(), "thread", threading.get_ident(), flush=True)

pid = os.fork()
if pid == 0:
    workers = [threading.Thread(target=job) for index in range(2)]
    for worker in workers:
        worker.start()
    for worker in workers:
        worker.join()
    os._exit(0)
os.waitpid(pid, 0)
''',
        explain=[
            'Thread được tạo SAU fork, bên trong child. Parent fork khi vẫn còn đơn luồng.',
            'Child join đủ thread của nó rồi mới _exit — thoát sớm sẽ cắt ngang worker.',
            'Bằng chứng đúng là PID và thread identity của từng worker, không phải số dòng in ra.',
        ],
        predict=dict(q='Thread được tạo trước fork ở parent hay sau fork trong child?', options=[
            ('Sau fork, trong child', 'Fork từ process đang có nhiều thread là nguy hiểm (chỉ thread gọi fork được sao chép).', True),
            ('Trước fork, ở parent', 'Parent phải đơn luồng khi fork.', False),
            ('Không quan trọng', 'Rất quan trọng trên POSIX.', False),
        ]),
        myth=('"Sáu dòng in ra là đủ chứng minh hai process, sáu thread"',
              'Một vòng lặp tuần tự trong một process cũng in được sáu dòng. Phải kiểm PID, thread identity và thời điểm hoàn tất. '
              'Đừng đổi lỗi trong child thành exit code 0.'),
        mcq=[
            dict(q='parallel_compile trong child ném exception. Child nên thoát thế nào?', options=[
                ('os._exit(1) để parent biết child lỗi', 'Parent chờ đủ rồi báo RuntimeError.', True),
                ('os._exit(0)', 'Che lỗi — parent tưởng thành công.', False),
                ('Không cần thoát', 'Child sẽ chạy tiếp code của parent.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao sáu dòng in chưa đủ chứng minh có hai process và sáu thread?',
            sample='Một vòng lặp tuần tự trong một process cũng in được sáu dòng giống hệt. Muốn chứng minh phải kiểm PID của '
                   'từng child khác parent, mỗi PID có ba worker thread cùng tồn tại, và parent chờ đủ child — số dòng in không đo được điều đó.'),
        scaffold=dict(
            intro='Lắp nhánh child.',
            template=r'''            pid = os.fork()
            if pid == 0:
                try:
                    {{slot1}}
                except Exception:
                    {{slot2}}
                {{slot3}}
            pids.append(pid)
''',
            slots=['obj.parallel_compile(n)', 'os._exit(1)', 'os._exit(0)'],
            traps=[('threading.Thread(target=obj.parallel_compile, args=(n,))', 1, 'Chỉ tạo Thread, chưa start/join.'),
                   ('print("child failed")', 2, 'In ra rồi đi tiếp xuống _exit(0) — parent tưởng child thành công.'),
                   ('pass', 2, 'Child đi tiếp xuống _exit(0) — lỗi bị che.')]),
        flow=['Parent đơn luồng → fork m child.',
              'Mỗi child → parallel_compile(n): n thread, join đủ.',
              'Child _exit(0) (lỗi → 1) → parent wait đủ.'],
        transfer='Thử m = 1, n = 2; fixture ghi PID và thread identity để kiểm thật số worker.',
        counter=dict(q='m = 2, n = 3: tổng số worker thread?', options=['6', '3', '2'], correct='6'),
        practice='Parent tạo child khi CHƯA có worker thread; child gọi method đã học, join xong mới _exit(0).',
        steps=['Class thread đã cấp; không viết lại OOP và thread.',
               'Sau fork, chỉ nhánh pid = 0 gọi parallel_compile; method đã join đủ trước khi child thoát.',
               'Exception trong child → exit code 1; parent chờ đủ rồi kiểm kết quả.'],
        partial=r'''            if pid == 0:
                try:
                    obj.parallel_compile(n)
                except Exception:
                    ...''',
        io=[('m = 1, n = 2', 'Một child, hai worker hoàn tất'), ('m = 2, n = 3', 'Hai child, mỗi child ba worker; parent chờ đủ')],
        contracts=[K_PARALLEL, K_WAIT],
        starter=N07_SOLUTION.replace(r'''                try:
                    obj.parallel_compile(n)
                except Exception:
                    os._exit(1)
                os._exit(0)''', r'''                # Tự gọi obj.parallel_compile(n) trong child;
                # lỗi -> os._exit(1), xong -> os._exit(0).
                os._exit(0)'''),
        solution=N07_SOLUTION,
        tests=[
            T('m = 2: hai child', 'len(_studio.main.children)', 2),
            T('Mỗi child đúng 3 thread', '[c.thread_count for c in _studio.main.children]', [3, 3]),
            T('Trong child: start hết rồi join hết', '[c.starts_before_joins and c.all_joined for c in _studio.main.children]', [True, True]),
            T('Parent đơn luồng khi fork', '_studio.main.threads_before_fork', 0),
            T('m = 1, n = 2', "[c.thread_count for c in _studio.run(entry='main(1, 2)').children]", [2]),
            T('Child lỗi → exit 1 → parent RuntimeError',
              "_studio.run(entry='main(2, 3)', setup='import thread_language\\ndef _boom(self, n):\\n    raise RuntimeError(\"boom\")\\nthread_language.C.parallel_compile = _boom').error",
              'RuntimeError'),
            T('Mọi child được chờ', '_studio.main.reaped_all', True),
            T('m sai → ValueError', "_studio.run(entry='main(0, 3)').error", 'ValueError'),
        ],
        bad=[('thread ở parent', N07_SOLUTION.replace('    sys.stdout.flush()\n', '    obj.parallel_compile(n)\n    sys.stdout.flush()\n')),
             ('che lỗi child', N07_SOLUTION.replace('                    os._exit(1)', '                    os._exit(0)')),
             ('khung chưa làm', None)],
    ),

    # ------------------------------------------------------------------ N08
    dict(
        code='N08', title='Ex5 tự làm', minutes=45, gate=True,
        goal='Tự giải Ex5 và đo thời gian đúng vòng đời công việc.',
        prereq='N07', support=['thread_language.py', 'process_tools.py'], env=FORK_ENV,
        brief='Viết benchmark(self, m, n) trong class C (kế thừa thread_language.C): kiểm m, n là int dương không phải bool (sai → ValueError, trước khi fork); bắt đầu đo bằng time.time() TRƯỚC khi tạo child; tạo m child, mỗi child gọi self.parallel_compile(n) rồi thoát (lỗi → exit 1); parent chờ đủ bằng wait_for_children, child lỗi → RuntimeError, fork lỗi giữa chừng → chờ child đã tạo rồi raise lại; trả về số giây đo SAU khi chờ đủ.',
        example='benchmark(2, 3) trả số giây sau khi hai child (mỗi child ba thread) đã xong.',
        explain=[
            'Validation m, n trước khi tạo process; parent vẫn đơn luồng khi fork.',
            'Giữ luồng N07: child gọi parallel_compile rồi thoát; parent lưu PID và chờ đủ, kể cả khi một child thất bại.',
            'Đo time.time() trước vòng tạo và sau khi chờ đủ. Số giây phụ thuộc máy — không chấm một con số cố định, không bắt nhiều worker phải nhanh hơn.',
            'Trong trình duyệt, mỗi lần fork/chờ cộng thêm thời gian ẢO để bộ chấm biết bạn đo bao trùm cả vòng đời child.',
        ],
        predict=dict(q='Nếu lấy thời gian kết thúc TRƯỚC waitpid, bạn đang đo phần nào?', options=[
            ('Chỉ thời gian tạo child — chưa tính lúc child làm việc', 'Phải chờ đủ mới biết công việc đã xong.', True),
            ('Toàn bộ công việc', 'Child có thể còn đang chạy.', False),
            ('Không đo gì', 'Vẫn đo, nhưng sai đoạn.', False),
        ]),
        myth=('Bốn cái bẫy của Ex5',
              'Đo bắt đầu sau khi đã fork; dừng đo trước khi chờ đủ; quên validation (True, 1.5, "2" lọt qua); để child lỗi thoát '
              'mã 0. Cũng đừng kỳ vọng m/n lớn hơn thì nhanh hơn — print chỉ mô phỏng compile.'),
        mcq=[
            dict(q='benchmark(True, 3) theo hợp đồng v3?', options=[
                ('ValueError trước khi fork', 'bool không phải int hợp lệ ở bài này.', True),
                ('Chạy với m = 1', 'Không chấp nhận bool.', False),
                ('Trả 0.0', 'Phải báo lỗi.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao đặt phép đo kết thúc sau wait_for_children?',
            sample='Chỉ khi chờ đủ mới biết mọi child (và thread của chúng) đã hoàn tất. Dừng đo trước đó là bỏ mất thời gian chạy '
                   'còn lại của child. Bắt đầu đo trước vòng fork để tính cả chi phí tạo process.'),
        flow=['start = time.time() → fork m child.',
              'Mỗi child: n thread, join, _exit.',
              'Parent wait đủ → elapsed = time.time() - start → return float.'],
        transfer='Bộ chấm dùng m, n mới, child chậm, một child lỗi và fork lỗi giữa chừng.',
        counter=dict(q='Trả về gì khi một child lỗi?', options=['raise RuntimeError sau khi chờ đủ', 'Số giây như thường', 'None'],
                     correct='raise RuntimeError sau khi chờ đủ'),
        practice='Validation trước khi fork; bắt đầu đo trước khi tạo child; kết thúc đo sau khi chờ đủ.',
        steps=['Kiểm m, n bằng type(...) is int và > 0.',
               'start = time.time(); vòng fork như N07 (self.parallel_compile(n) trong child).',
               'wait_for_children(pids) → lỗi thì RuntimeError; elapsed = time.time() - start; return elapsed.'],
        partial=r'''        start = time.time()
        ...
        if not wait_for_children(pids):
            raise RuntimeError("child failed")
        return time.time() - start''',
        io=[('m = 1, n = 1', 'Trả float sau khi công việc xong'), ('m = 2, n = 3', 'Hai child, mỗi child ba worker; đo bao gồm thời gian chờ')],
        contracts=[dict(sig='benchmark(self, m, n)', does='Đo từ trước khi tạo child đến sau khi mọi child kết thúc.',
                        takes='self; m, n: int dương, không phải bool',
                        gives='float số giây; đầu vào sai → ValueError; child lỗi → RuntimeError; fork lỗi → raise lại OSError',
                        effect='Tạo m child, mỗi child n thread; thu hồi mọi child; dùng time.time.',
                        call='obj.benchmark(2, 3) → số giây thực đo, không cố định'), K_PARALLEL, K_WAIT],
        starter=r'''import os
import sys
import time
from thread_language import C as BaseC
from process_tools import wait_for_children


class C(BaseC):
    def benchmark(self, m, n):
        pass
''',
        solution=N08_SOLUTION,
        tests=[
            T('Trả float', f'type({bench(2, 3)}.value).__name__', 'float'),
            T('Đo bao trùm từ trước fork tới sau khi chờ đủ', f'{bench(2, 3)}.measured_lifecycle', True),
            T('m = 2, n = 3: hai child × ba thread', f'[c.thread_count for c in {bench(2, 3)}.children]', [3, 3]),
            T('m = 1, n = 1', f'(lambda r: (len(r.children), r.reaped_all))({bench(1, 1)})', (1, True)),
            T('Parent đơn luồng khi fork', f'{bench(2, 3)}.threads_before_fork', 0),
            TX('m/n sai → ValueError, chưa fork',
               '[(_studio.run(entry=e).error, len(_studio.run(entry=e).children)) for e in ['
               + ', '.join(repr(N08_ENTRY.format(m=m, n=n)) for m, n in ((0, 3), (-1, 3), (True, 3), (1.5, 3), ('"2"', 3), (2, 0), (2, False)))
               + ']]', repr([('ValueError', 0)] * 7)),
            T('Child lỗi → chờ đủ rồi RuntimeError', f'(lambda r: (r.error, r.reaped_all))({bench(3, 1, child_exit={1: 1})})', ('RuntimeError', True)),
            T('Fork lỗi giữa chừng → OSError, không bỏ sót child', f'(lambda r: (r.error, r.unreaped))({bench(3, 1, fail_fork_at=1)})', ('OSError', [])),
        ],
        bad=[('dừng đo trước khi chờ', N08_SOLUTION.replace('''        if not wait_for_children(pids):
            raise RuntimeError("child failed")

        elapsed = time.time() - start''', '''        elapsed = time.time() - start
        if not wait_for_children(pids):
            raise RuntimeError("child failed")''')),
             ('bắt đầu đo sau fork', N08_SOLUTION.replace('        start = time.time()\n        pids = []\n', '        pids = []\n').replace('        except OSError:\n            wait_for_children(pids)\n            raise\n', '        except OSError:\n            wait_for_children(pids)\n            raise\n        start = time.time()\n')),
             ('isinstance cho qua bool', N08_SOLUTION.replace('type(m) is not int', 'not isinstance(m, int)'))],
    ),
]
