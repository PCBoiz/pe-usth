"""Chạy CHÍNH bộ chấm của trình duyệt (frontend/public/static/js/studio-harness.py)
bằng CPython, để build.py chấm thử lời giải / biến thể sai ngay lúc dựng.

Vì sao không chấm bằng `python main.py` như build_advanced.py của pe-v3: bài pe-v4
dùng subprocess, multiprocessing, threading và tkinter — trình duyệt chỉ có bản MÔ
PHỎNG. Chấm bằng CPython thật thì Tk mở cửa sổ, subprocess gọi process thật, và
kết quả lúc dựng sẽ khác kết quả học viên thấy. Chạy qua cùng harness thì hai
bên dùng một bộ mô phỏng; chỉ còn khác ở phiên bản thư viện, nên build.py ưu
tiên scripts/pe-v4/.venv (CPython 3.12 + đúng numpy/pandas/matplotlib của
Pyodide 0.27.7).

Giao thức (một process cho một bài, build.py gọi):
    stdin : {"harness": path, "workdir": dir, "timeout": giây, "packages": [...], "jobs": [
               {"label", "code", "tests": [...], "files": [...], "stdin": [...]}]}
    stdout: {"results": [{"label", "result": <JSON của _studio_main>, "seconds", "timeout"}]}

Mỗi job có hạn giờ riêng (mặc định 10 s): quá hạn thì ngắt bằng
_thread.interrupt_main() — giống worker trình duyệt bị terminate() sau 5 giây,
job đó tính là KHÔNG đạt.
"""
import _thread
import builtins
import io
import json
import os
import sys
import time

# Đồng hồ, sleep và _exit THẬT, lấy trước khi harness thay time.*/os._exit bằng bản mô phỏng.
REAL_MONOTONIC = time.monotonic
REAL_SLEEP = time.sleep
REAL_EXIT = os._exit


def posix_like():
    """Cho CPython trên Windows ghi file giống Pyodide (Linux): xuống dòng '\\n'.

    Không có bước này, file học viên ghi bằng open(..., 'w') trên Windows chứa
    '\\r\\n', còn bộ chấm (đọc lại với newline='') và trình duyệt thấy '\\n' — ca
    chấm nội dung file sẽ trượt lúc dựng mà đạt trên trình duyệt.
    """
    os.linesep = '\n'   # pandas.to_csv lấy lineterminator mặc định từ đây
    real_open = io.open

    def open_posix(file, mode='r', buffering=-1, encoding=None, errors=None, newline=None, closefd=True,
                   opener=None):
        if 'b' not in mode and newline is None and any(c in mode for c in 'wax+'):
            newline = '\n'
        if 'b' not in mode and encoding is None:
            encoding = 'utf-8'
        return real_open(file, mode, buffering, encoding, errors, newline, closefd, opener)

    builtins.open = open_posix


def main():
    job = json.loads(sys.stdin.buffer.read().decode('utf-8'))
    workdir = job['workdir']
    os.makedirs(workdir, exist_ok=True)
    os.chdir(workdir)
    os.environ['MPLBACKEND'] = 'Agg'
    posix_like()

    source = open(job['harness'], encoding='utf-8').read()
    harness = {'__name__': 'studio_harness', '__file__': 'studio-harness.py'}
    exec(compile(source, 'studio-harness.py', 'exec'), harness)
    # /tmp/studio của Pyodide -> thư mục tạm do build.py cấp.
    harness['WORK_ROOT'] = os.path.join(workdir, 'studio')
    grade = harness['_studio_main']
    # Import sẵn numpy/pandas/matplotlib như worker trình duyệt làm trước khi bấm
    # giờ — thời gian đo dưới đây chỉ còn là thời gian chạy code của bài.
    preload_errors = json.loads(harness['_studio_preload'](json.dumps(job.get('packages', []))))

    state = {'job': -1, 'deadline': None, 'fired': False}
    limit = float(job.get('timeout') or 10)

    def watchdog():
        while True:
            REAL_SLEEP(0.2)
            deadline = state['deadline']
            if deadline is not None and REAL_MONOTONIC() > deadline:
                state['fired'] = True
                state['deadline'] = REAL_MONOTONIC() + 1.0
                _thread.interrupt_main()

    _thread.start_new_thread(watchdog, ())

    results = []
    for i, item in enumerate(job['jobs']):
        state.update(job=i, fired=False, deadline=REAL_MONOTONIC() + limit)
        started = REAL_MONOTONIC()
        try:
            raw = grade(item.get('code', ''), json.dumps(item.get('tests', [])), json.dumps(item.get('files', [])),
                        json.dumps(item.get('stdin', [])))
            result = json.loads(raw)
        except BaseException as exc:  # KeyboardInterrupt từ watchdog lọt ra ngoài bộ chấm
            result = {'tests': [], 'error': '%s: %s' % (type(exc).__name__, exc), 'output': '', 'notes': []}
        finally:
            state['deadline'] = None
        if state['fired']:
            result['error'] = (result.get('error') or '') + '\n[quá %ss — vòng lặp vô hạn?]' % limit
        results.append({'label': item.get('label'), 'result': result,
                        'seconds': round(REAL_MONOTONIC() - started, 3), 'timeout': state['fired']})

    out = json.dumps({'results': results, 'preload_errors': preload_errors}, ensure_ascii=False)
    sys.__stdout__.buffer.write(out.encode('utf-8'))
    sys.__stdout__.flush()
    # Thoát CỨNG: harness đã thay threading.get_ident/Lock… bằng bản mô phỏng, nên
    # threading._shutdown() lúc tắt interpreter treo vô hạn (process chấm thử
    # không bao giờ kết thúc). Kết quả đã ghi xong ở trên.
    REAL_EXIT(0)


if __name__ == '__main__':
    main()
