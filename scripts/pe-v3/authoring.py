"""Hàm viết tắt khi soạn bài v3 — chỉ để file nội dung đọc gọn hơn.

Quy ước trong các file lessons_*.py:

* Mã nguồn (demo, starter, solution, bad) viết bằng chuỗi THÔ r'''...''' để
  `"\n"` trong code giữ nguyên là hai ký tự, không thành xuống dòng thật.
* Ca chấm: T(tên, biểu thức gọi, GIÁ TRỊ Python mong đợi) — giá trị được
  repr() thành biểu thức `expect`. TX(...) khi muốn tự viết biểu thức expect.
* Biểu thức gọi chạy trong namespace của học viên, có sẵn `_studio` (xem
  frontend/public/static/js/studio-harness.py).
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
