# -*- coding: utf-8 -*-
"""In ra bản KHÔNG CHÚ THÍCH của tracer, để nhúng vào backend.

Vì sao phải có bước này: `POST /run` chặn mã nguồn ở 20 KB (MAX_CODE_BYTES trong
docker-sandbox.ts) và backend gửi tracer + mã người học thành MỘT file. Bản
pe_tracer.py có chú thích tiếng Việt nặng ~26 KB — tự nó đã vượt trần, chưa kể
chỗ cho mã người học. Bản rút gọn còn khoảng một phần ba.

Cách làm: `ast.parse` rồi `ast.unparse`. Chú thích không nằm trong AST nên biến
mất; docstring thì có (là câu lệnh chuỗi) nên phải bỏ tay. KHÔNG dùng cách cắt
chuỗi theo dấu '#' — dấu đó nằm trong chuỗi ký tự là cắt sai mã, im lặng.

Chạy (Windows dùng `py`, không dùng `python`):
    py scripts/pe-tracer-strip.py src/python-runner/tracer/pe_tracer.py
"""
import ast
import io
import sys

_HAS_BODY = (
    ast.Module,
    ast.FunctionDef,
    ast.AsyncFunctionDef,
    ast.ClassDef,
)


def drop_docstrings(tree):
    """Bỏ docstring của module, hàm và lớp (câu lệnh chuỗi đứng đầu thân)."""
    for node in ast.walk(tree):
        if not isinstance(node, _HAS_BODY):
            continue
        body = node.body
        if (
            body
            and isinstance(body[0], ast.Expr)
            and isinstance(body[0].value, ast.Constant)
            and isinstance(body[0].value.value, str)
        ):
            # Thân rỗng là lỗi cú pháp: thay bằng `pass`.
            node.body = body[1:] or [ast.Pass()]
    return tree


def main(argv):
    if len(argv) != 2:
        sys.stderr.write("dùng: pe-tracer-strip.py <file.py>\n")
        return 2
    with io.open(argv[1], encoding="utf-8") as fh:
        source = fh.read()
    tree = drop_docstrings(ast.parse(source))
    stripped = ast.unparse(tree)
    # Kiểm ngay tại đây: bản rút gọn phải còn biên dịch được. Nếu bước rút gọn
    # làm hỏng mã thì phải đổ ở ĐÂY, không phải ở trong sandbox của người học.
    compile(stripped, "pe_tracer_stripped.py", "exec")
    out = io.open(sys.stdout.fileno(), "w", encoding="utf-8", newline="\n", closefd=False)
    out.write(stripped)
    out.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
