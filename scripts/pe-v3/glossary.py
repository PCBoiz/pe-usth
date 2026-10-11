"""Chuẩn hoá thuật ngữ trong chữ SINH VIÊN đọc (đề, giải thích, tên ca kiểm thử…).

Nội dung soạn từ PDF đề PE và ghi chú của người viết bộ chấm nên lẫn từ nghề kiểm thử
("fixture", "ca biên", "stdout", "hard-code", "validation"…) và tham chiếu nội bộ
("hợp đồng v3", "format v3"). build.py gọi polish() trên content_json trước khi ghi ra:
chỉ chạm vào chuỗi văn xuôi, KHÔNG đụng code, ca chấm (call/expect), lời giải, khung
lắp ghép hay file cấp sẵn.

Thuật ngữ Python chuẩn (list, object, method, thread, append, join…) được GIỮ NGUYÊN:
sinh viên cần học đúng tên gọi đó.
"""
from __future__ import annotations

import re

# Khoá chứa code hoặc dữ liệu máy đọc — không bao giờ sửa.
CODE_KEYS = {
    'code', 'source', 'solutionCode', 'starterCode', 'template', 'call', 'expect',
    'content', 'sig', 'answer', 'filename', 'schema', 'kind', 'parser', 'importedAt',
    'eyebrow', 'version', 'placeholder_code',
}

# (mẫu, thay bằng) — áp theo thứ tự: cụm cụ thể trước, từ đơn lẻ sau. Chuỗi thay
# bằng là CHỮ NGUYÊN VĂN (\r, \n giữ đúng hai ký tự); muốn dùng nhóm thì truyền hàm.
RULES: list[tuple[str, object]] = [
    # --- ca kiểm thử
    (r'nêu một ca biên của bài', 'nêu một trường hợp đặc biệt của bài (ví dụ dữ liệu rỗng)'),
    (r'\bca biên\b', 'trường hợp đặc biệt'),
    (r'\bFixture công khai\b', 'Dữ liệu mẫu của đề'),
    (r'\bFixture mẫu\b', 'Dữ liệu mẫu'),
    (r'\s*\(fixture\)', ''),
    (r'\bfixture\b', 'dữ liệu thử'),
    (r'\bca công khai\b', 'ví dụ trong đề'),
    (r'\bCa riêng\b', 'Ca ẩn'),
    (r'\bca riêng\b', 'ca ẩn'),
    # --- stdout / output
    (r'\s*\(stdout rỗng\)', ''),
    (r'stdout = nội dung \+ một xuống dòng', 'in ra: nội dung + một dòng mới'),
    (r'stdout thêm một xuống dòng do print', 'khi in có thêm một dòng mới do print'),
    (r'(?<![\w.])stdout rỗng', 'không in gì'),
    (r'(?<![\w.])[Ss]tdout đúng một dòng', 'in đúng một dòng'),
    (r'(?<![\w.])stdout một dòng', 'in một dòng'),
    (r'làm bẩn stdout', 'in thừa ra màn hình'),
    (r'kiểm format và stdout của', 'kiểm định dạng và phần in ra của'),
    (r'(?<![\w.])stdout:', 'In ra:'),
    (r'(?<![\w.])stdout(?![\w(])', 'phần in ra màn hình'),
    (r'Không có output', 'Không in gì'),
    (r'không có output', 'không in gì'),
    (r'đều sinh output', 'đều in thêm ra màn hình'),
    (r'worker in output', 'worker tự in ra màn hình'),
    (r'đẩy output ra ngay', 'đẩy dòng in ra màn hình ngay'),
    (r'đẩy output ngay', 'đẩy dòng in ra màn hình ngay'),
    (r'đẩy output trước', 'đẩy dòng in ra màn hình trước'),
    (r'không tự flush output', 'không tự đẩy các dòng in còn đệm ra màn hình'),
    (r'(?<![\w.])output(?![\w(])', 'phần in ra'),
    # --- từ tiếng Anh của người viết đề
    (r'\bhard-code\b', 'viết cứng'),
    (r'Validation và join kiểm hai điều', 'Kiểm tra đầu vào và join bảo đảm hai điều'),
    (r'Validation n và join kiểm hai điều', 'Kiểm tra n và join bảo đảm hai điều'),
    (r'Validation kiểm ĐẦU VÀO', 'Kiểm tra đầu vào xét DỮ LIỆU VÀO'),
    (r'Validation kiểm đầu vào', 'Kiểm tra đầu vào xét dữ liệu'),
    (r'\bValidation\b', 'Kiểm tra đầu vào'),
    (r'\bvalidation\b', 'kiểm tra đầu vào'),
    (r'\bHelper\b', 'Hàm phụ'),
    (r'\bhelper\b', 'hàm phụ'),
    (r'\bCheckpoint\b', 'Mốc'),
    (r'\bcheckpoint\b', 'mốc'),
    # open(..., mode) giữ nguyên trong code; văn xuôi gọi là "chế độ mở file".
    (r'(?<![\w.=])mode(?![\w=])', 'chế độ'),
    (r'(?<![\w.=])Mode(?![\w=])', 'Chế độ'),
    (r'cả CR lẫn LF', r'cả \r lẫn \n'),
    (r'^CRLF:', 'Xuống dòng kiểu Windows:'),
    (r'\(chỉ bỏ CR/LF cuối\)', r'(chỉ bỏ \r, \n ở cuối dòng)'),
    (r'không newline giữ nguyên', 'không có ký tự xuống dòng vẫn giữ nguyên'),
    (r'không newline', 'không có ký tự xuống dòng'),
    (r'ký tự CR/LF', r'ký tự xuống dòng (\r, \n)'),
    (r'\bCR/LF\b', r'ký tự xuống dòng (\r, \n)'),
    (r'xuống dòng CRLF', r'xuống dòng kiểu Windows (\r\n)'),
    (r'\(CRLF\)', '(xuống dòng kiểu Windows)'),
    (r'\bCRLF\b', r'xuống dòng kiểu Windows (\r\n)'),
    (r'\bnewline\b', 'ký tự xuống dòng'),
    (r'\binput nhập tay\b', 'dữ liệu nhập từ bàn phím'),
    (r'\bPOSIX\b', 'Linux/macOS'),
    (r'\bđúng format\b', 'đúng định dạng'),
    (r'\bformat\b(?!\()', 'định dạng'),
    (r'\bFormat\b(?!\()', 'Định dạng'),
    # --- tham chiếu nội bộ tới bản đề "v3"
    (r'theo hợp đồng v3', 'theo yêu cầu của đề'),
    (r'Theo hợp đồng v3', 'Theo yêu cầu của đề'),
    (r'định dạng v3', 'định dạng của đề'),
    (r'Định dạng v3', 'Định dạng của đề'),
    (r'Quy ước v3', 'Quy ước của đề'),
    (r'Đề v3', 'Đề bài'),
    (r'hợp đồng của bài', 'yêu cầu của bài'),
    (r'Hợp đồng của (\w+)', lambda m: f'Yêu cầu của {m.group(1)}'),
    (r'Ngược hợp đồng', 'Ngược yêu cầu của đề'),
    (r'\bhợp đồng\b', 'yêu cầu'),
    # --- "điều phối"
    (r'phần điều phối', 'phần chương trình chính'),
    (r'lệnh điều phối', 'lệnh chính'),
    (r'Vòng lặp điều phối', 'Vòng lặp chính'),
    (r'vòng lặp điều phối', 'vòng lặp chính'),
    (r'\bđiều phối\b', 'gọi nối các hàm'),
]
COMPILED = [(re.compile(p), r if callable(r) else (lambda m, lit=r: lit)) for p, r in RULES]


def looks_like_code(text: str) -> bool:
    """Chuỗi nhiều dòng có thụt lề hoặc mở đầu bằng từ khoá Python: coi là code."""
    return bool(re.search(r'\n {2,}\S', text)) or bool(re.match(r'\s*(def|class|import|from|for|if|with)\b', text))


def polish_text(text: str) -> str:
    if looks_like_code(text):
        return text
    for rx, rep in COMPILED:
        text = rx.sub(rep, text)
    return text


def polish(node, key: str = '', in_scaffold: bool = False):
    """Trả bản sao đã chuẩn hoá. Trong scaffold chỉ sửa lời giải thích bẫy (trap)."""
    if isinstance(node, dict):
        out = {}
        for k, v in node.items():
            if k in CODE_KEYS:
                out[k] = v
            elif k == 'scaffold':
                out[k] = polish(v, k, in_scaffold=True)
            else:
                out[k] = polish(v, k, in_scaffold)
        return out
    if isinstance(node, list):
        return [polish(v, key, in_scaffold) for v in node]
    if isinstance(node, str):
        if in_scaffold and key != 'trap':
            return node
        return polish_text(node)
    return node
