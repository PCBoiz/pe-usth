"""Chuẩn hoá thuật ngữ trong chữ SINH VIÊN đọc — bản pe-v4 của scripts/pe-v3/glossary.py.

Khác pe-v3 có chủ đích: KHÔNG thay "stdout"/"stderr"/"output". Ở khoá Advanced đó là
thuật ngữ đang được dạy (subprocess.run(capture_output=True) trả về .stdout/.stderr),
nên đổi thành "phần in ra màn hình" sẽ làm sai nghĩa bài. Thuật ngữ Python chuẩn
(list, thread, process, DataFrame, subprocess…) giữ nguyên tiếng Anh.

Chỉ chạm vào chuỗi văn xuôi, KHÔNG đụng code, ca chấm (call/expect), lời giải, khung
lắp ghép hay file cấp sẵn.
"""
from __future__ import annotations

import re

# Khoá chứa code hoặc dữ liệu máy đọc — không bao giờ sửa.
CODE_KEYS = {
    'code', 'source', 'solutionCode', 'starterCode', 'template', 'call', 'expect',
    'content', 'sig', 'answer', 'filename', 'schema', 'kind', 'parser', 'importedAt',
    'eyebrow', 'version', 'placeholder_code', 'packages', 'name',
    # Hình minh hoạ: 'src' là đường dẫn file, 'slides' là mã trang slide ("SL 15-16").
    'src', 'slides',
}

RULES: list[tuple[str, object]] = [
    # --- ca kiểm thử (từ nghề kiểm thử, sinh viên không cần)
    (r'nêu một ca biên của bài', 'nêu một trường hợp đặc biệt của bài (ví dụ dữ liệu rỗng)'),
    (r'\bca biên\b', 'trường hợp đặc biệt'),
    (r'\bFixture công khai\b', 'Dữ liệu mẫu của đề'),
    (r'\bFixture mẫu\b', 'Dữ liệu mẫu'),
    (r'\s*\(fixture\)', ''),
    (r'\bfixture\b', 'dữ liệu thử'),
    (r'\bca công khai\b', 'ví dụ trong đề'),
    (r'\bCa riêng\b', 'Ca ẩn'),
    (r'\bca riêng\b', 'ca ẩn'),
    # --- từ tiếng Anh của người viết đề
    (r'\bhard-code\b', 'viết cứng'),
    (r'\bValidation\b', 'Kiểm tra đầu vào'),
    (r'\bvalidation\b', 'kiểm tra đầu vào'),
    (r'\bHelper\b', 'Hàm phụ'),
    (r'\bhelper\b', 'hàm phụ'),
    (r'\bCheckpoint\b', 'Mốc'),
    (r'\bcheckpoint\b', 'mốc'),
    (r'\binput nhập tay\b', 'dữ liệu nhập từ bàn phím'),
    (r'\bđúng format\b', 'đúng định dạng'),
    # --- tham chiếu nội bộ
    (r'\bhợp đồng của bài\b', 'yêu cầu của bài'),
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
