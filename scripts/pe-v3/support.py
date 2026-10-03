"""Bốn file cấp sẵn của PE Python v3 (phụ lục, trang 100–103 của PDF).

Studio ghi các file này vào thư mục chạy bài trước khi chạy mã học viên, nên
`from language_base import ProgrammingLanguage` chạy y như trên máy lab. Học
viên thấy nội dung file ở màn sandbox (chỉ đọc).
"""

LANGUAGE_BASE = '''class ProgrammingLanguage:
    def __init__(self, name, year_created, paradigms):
        self.name = name
        self.year_created = year_created
        self.paradigms = list(paradigms)

    def add_paradigms(self, paradigm):
        self.paradigms.append(paradigm)

    def __str__(self):
        description = f"Language[{self.name}]"
        description += f", Year created[{self.year_created}]"
        description += f", Paradigms{self.paradigms}"
        return description
'''

C_LANGUAGE = '''from language_base import ProgrammingLanguage


class C(ProgrammingLanguage):
    def __init__(self, name, year_created, paradigms, std_version):
        super().__init__(name, year_created, paradigms)
        self.std_version = std_version

    def __str__(self):
        description = super().__str__()
        return description + f", Standard version[{self.std_version}]"

    def compile(self):
        print(f"Compiling C code using standard version {self.std_version}")
'''

THREAD_LANGUAGE = '''import threading
from c_language import C as BaseC


class C(BaseC):
    def _compile_worker(self, n):
        message = f"Compiling C code using {n} threads"
        message += f" with standard version {self.std_version}"
        print(message, flush=True)

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

PROCESS_TOOLS = '''import os


def wait_for_children(pids):
    success = True
    for pid in pids:
        try:
            waited_pid, status = os.waitpid(pid, 0)
        except OSError:
            success = False
        else:
            if not os.WIFEXITED(status):
                success = False
            elif os.WEXITSTATUS(status) != 0:
                success = False
    return success
'''

SUPPORT = {
    'language_base.py': LANGUAGE_BASE,
    'c_language.py': C_LANGUAGE,
    'thread_language.py': THREAD_LANGUAGE,
    'process_tools.py': PROCESS_TOOLS,
}

# File nào kéo theo file nào (import dây chuyền).
REQUIRES = {
    'language_base.py': [],
    'c_language.py': ['language_base.py'],
    'thread_language.py': ['c_language.py', 'language_base.py'],
    'process_tools.py': [],
}


def support_files(*names):
    """Danh sách file cấp sẵn kèm phụ thuộc, theo thứ tự cố định."""
    wanted = set()
    stack = list(names)
    while stack:
        name = stack.pop()
        if name in wanted:
            continue
        wanted.add(name)
        stack.extend(REQUIRES[name])
    return [{'name': name, 'content': SUPPORT[name], 'kind': 'module'}
            for name in SUPPORT if name in wanted]
