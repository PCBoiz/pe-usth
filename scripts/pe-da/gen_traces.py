# -*- coding: utf-8 -*-
"""Sinh BẢNG TỪNG BƯỚC tính sẵn cho màn đọc của 172 bài pe-da.

    py scripts/pe-da/gen_traces.py              # sinh lại traces.json
    py scripts/pe-da/gen_traces.py --only=SY05  # chỉ một/vài bài (so phẩy)
    py scripts/pe-da/gen_traces.py --report     # chỉ in thống kê, không ghi

VÌ SAO LÀ MỘT SCRIPT RIÊNG, KHÔNG NẰM TRONG build.py
----------------------------------------------------
CI chạy `python scripts/pe-da/build.py` rồi ĐÒI bản dựng trùng từng byte với
bản đã commit (job `giao-trinh-da`). Runner đó là Python 3.12 **không có
numpy/pandas/matplotlib**, trong khi 90/154 bài từ module 2 trở đi import chúng.
Nếu build.py tự chạy tracer thì:
  · trên máy người soạn (có numpy) nó ghi vết;
  · trên CI (không có numpy) nó bỏ qua;
  · hai bản dựng khác nhau ⇒ CI đỏ mãi mãi, mà không ai sửa được.
Thêm nữa, `repr` của một số giá trị đổi theo phiên bản Python (3.12 vs 3.14),
nên ngay cả bài stdlib thuần cũng không chắc dựng ra giống nhau.

Nên vết được sinh ở ĐÂY và COMMIT vào `traces.json`; build.py chỉ ĐỌC. Đúng
khuôn mà `chep_anh()` trong build.py đã dùng cho 80 ảnh biểu đồ: gói nguồn chỉ
có trên máy người soạn, CI dùng bản đã commit. Và build.py không im lặng tin
file đó — nó so HASH của code bài với hash lúc sinh vết, lệch là `return 1`.

VÌ SAO CHẠY TRACER CỦA REPO, KHÔNG VIẾT TRACER THỨ HAI
------------------------------------------------------
`scripts/tracer/pe_tracer.py` đã có 65 phép kiểm và đã được đo trong chính
module worker của trình duyệt. Nó được gọi ở đây theo ĐÚNG cách
`scripts/tracer/pe_tracer_test.py` gọi: dựng một file `tracer + _pe_run(<mã đã
nén>)`, chạy bằng một tiến trình Python riêng (`-I`), rồi đọc JSON ra từ giữa
hai mốc. Khác duy nhất: ở đây dùng bản `.py` đầy đủ chứ không bản rút gọn, vì
không phải gửi qua dây.

MỘT LẦN CHẠY MỖI BÀI, KHÔNG MỖI KHỐI — và đây là chỗ một bản làm nửa vời sẽ
trông như xong. Nguồn viết các đoạn trong một bài để chạy NỐI TIẾP nhau: đoạn 3
dùng `df` và `import pandas` của đoạn 1 (xem `maDeThu` ở frontend và `noi_code`
ở build.py). Trace riêng đoạn 3 là trace một chương trình chết ở NameError. Nên
cả bài được nối bằng CHÍNH `noi_code()` rồi trace MỘT lần, sau đó vết được CẮT
theo khoảng dòng của từng đoạn và đánh số lại về 1 — vì ô code trên màn đọc
hiện số dòng của riêng nó.

CHỈ LƯU THỨ HIỆN RA. Tài liệu vết của `/ide` mang cả call stack đầy đủ, locals
của mọi frame ở MỌI bước, `limits`, `stats` — 1,5 MB cho một chương trình tầm
thường. Bảng ở màn đọc cần đúng ba thứ mỗi dòng: dòng nào vừa chạy, biến nào
ĐỔI, và chương trình in ra gì ở dòng đó. Nên mỗi bước được nén thành
`{line, set, out}` và giá trị thành CHỮ (`ve_gia_tri`), không mang cây JSON của
tracer vào content_json.

CÂU DỰ ĐOÁN LÀ BẮT BUỘC, KHÔNG PHẢI TRANG TRÍ
---------------------------------------------
Hundhausen 2002 (tổng hợp 24 thực nghiệm có đối chứng): chỉ 46% cho kết quả có
ý nghĩa, 42% KHÔNG — và khi Gurka lặp lại thí nghiệm nhưng BỎ điều kiện "dự
đoán trước" thì lợi thế biến mất. Brod 2021 nói ra cơ chế: đoán sai → ngạc
nhiên → chú ý dồn vào đáp án đúng. Nghĩa là XEM THỤ ĐỘNG gần như không mua được
gì; thứ mua được là lúc người học cam kết một câu trả lời. Nên một đoạn KHÔNG
sinh được câu dự đoán trả lời-được-bằng-bảng thì nó bị BỎ QUA (và đếm), chứ
không phát một cái bảng không ai phải đoán gì.

Hai loại câu, và cả hai đều có đáp án NẰM TRONG BẢNG chứ không nằm trong ô
"Kết quả:" đã hiện sẵn phía trên:
  · `final` — "Sau khi chạy xong, `total` bằng mấy?" Chỉ dùng biến có ĐỔI trong
    chính đoạn này (nên bảng hiện nó ra) và có giá trị KHÔNG xuất hiện trong
    `expected` của đoạn (nếu không thì đáp án đã in sẵn trên màn hình).
  · `count` — "Dòng N chạy bao nhiêu lần?" Dùng khi không có biến nào kín: số
    lần chạy là thứ ô "Kết quả:" không bao giờ nói, và nó hỏi đúng về luồng
    điều khiển. Chỉ dùng khi bảng KHÔNG bị cắt bớt, vì cắt rồi thì đếm sai.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SOURCE = HERE / 'source' / 'course.json'
CACHE = HERE / 'traces.json'
TRACER = ROOT / 'scripts' / 'tracer' / 'pe_tracer.py'

BEGIN = '__PE_TRACE_V1_BEGIN__'
END = '__PE_TRACE_V1_END__'

# Module 1 (18 bài PY01–PY18) KHÔNG có bảng. Quyết định đã chốt với chủ dự án:
# ở đó code còn là `print(2 + 3)`, một bảng "dòng 1 đã chạy" không nói gì mà lại
# dạy người học bỏ qua cái nút ngay lúc nó chưa đáng bấm — rồi họ sẽ bỏ qua nó
# cả ở module 5.
MODULE_DAU_TIEN = 2

# Trần của BẢNG (khác hẳn trần của tracer, xem PE_LIMITS). Đây là trần của thứ
# NGƯỜI HỌC ĐỌC, nên nó do mắt quyết định chứ không do bộ nhớ: một bảng 300
# dòng thì không ai đọc, và nó cũng không dạy thêm gì so với 36 dòng đầu + 6
# dòng cuối (vòng lặp lặp lại chính nó). Giữ cả hai đầu vì đáp án của câu dự
# đoán nằm ở ĐẦU CUỐI.
TRAN_DONG = 42
GIU_DAU = 30
GIU_CUOI = 6

# Trần ký tự của MỘT giá trị trong bảng. `repr` của một DataFrame là nhiều dòng
# và hàng trăm ký tự; để nguyên thì một ô bảng cao bằng cả màn hình.
TRAN_GIA_TRI = 72
# Trần ký tự của đoạn chương trình in ra ở MỘT dòng.
TRAN_IN_RA = 160
# Trần độ dài đáp án của câu dự đoán: dài hơn thì không ai gõ lại được, mà "gõ
# lại" chính là hành động cam kết mà bước này cần.
#
# 40 chứ không 24, và con số đo được: ở 24 thì CT05 đoạn 3 mất câu
# "sau khi chạy xong, `queues` bằng mấy?" — đáp án
# `{'high': [], 'low': ['B', 'A']}` dài 31 ký tự và nó đúng là điều cả ô code
# lẫn ô Kết quả không nói (bài in `[] ['B', 'A']`, không in tên khoá). Nới tới
# 40 thêm 23 đoạn có câu hỏi; nới tiếp tới 60 chỉ thêm 4 đoạn mà đáp án thành
# thứ không ai gõ lại.
TRAN_DAP_AN = 40


def nap_build():
    """build.py là NGUỒN DUY NHẤT về phép phân loại và phép nối.

    Cố ý IMPORT chứ không chép: `phan_loai_khoi`/`noi_code`/`code_hoc_vien` phải
    là CÙNG MỘT hàm mà build.py dùng, nếu không thì vết được sinh cho một tập
    khối khác tập khối được phát ra và cổng đối chiếu trong build.py đỏ mãi.
    (Khác `_noi_nhu_build` trong check.py — ở đó phép CHÉP mới đúng, vì check.py
    là phía đối chứng của phép so.)
    """
    spec = importlib.util.spec_from_file_location('pe_da_build', HERE / 'build.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ---------------------------------------------------------------------------
# Chạy tracer
# ---------------------------------------------------------------------------

#
# `timeBudgetMs` của tracer là 4 000 ms, và con số đó được chọn cho ĐƯỜNG CHẠY
# TRONG TRÌNH DUYỆT: nó phải nhỏ hơn hạn 5 giây của bài học, vì hạn ngoài cắt
# bằng `worker.terminate()` và lúc đó không còn đường nào trả vết về (xem
# PE_LIMITS). Ở KHÂU BUILD không có hạn nào như thế và không có người học nào
# đang chờ — thứ duy nhất canh treo là `timeout` của subprocess dưới đây.
#
# Và nó KHÔNG phải tinh chỉnh cho đẹp số: đo lần sinh đầu, **44 khối** bị bỏ với
# `time-limit` và **15 khối** quá 120 s, gần hết là bài matplotlib/pandas — chỉ
# riêng `import matplotlib.pyplot` đã tốn vài giây và nó nằm TRONG mã người học
# nên tính vào trần. Tức trần của trình duyệt đang cắt một phép tính diễn ra
# nhiều ngày trước khi có người học nào mở bài.
#
# `maxSteps`/`maxBytes` thì GIỮ NGUYÊN: chúng bó cái BẢNG, không bó lần chạy.
TRAN_GIO_BUILD_MS = 60_000


def chay_tracer(code: str, timeout: int = 90) -> tuple[dict | None, str]:
    """(tài liệu vết, lý do nếu không có). Dựng ĐÚNG file mà worker gọi."""
    payload = base64.b64encode(zlib.compress(code.encode('utf-8'), 9)).decode('ascii')
    program = (TRACER.read_text(encoding='utf-8')
               + f'\nPE_LIMITS["timeBudgetMs"] = {TRAN_GIO_BUILD_MS}\n'
               + '_pe_run("' + payload + '")\n')
    thu_muc = Path(tempfile.mkdtemp(prefix='pe-da-trace-'))
    tep = thu_muc / 'main.py'
    tep.write_text(program, encoding='utf-8', newline='\n')
    # MPLBACKEND=Agg là BẮT BUỘC, không phải tối ưu. `code_hoc_vien()` trả bản
    # `displayCode` — bản viết cho người học, có `plt.show()`. Trên máy người
    # soạn, matplotlib chọn backend Tk và `plt.show()` MỞ MỘT CỬA SỔ rồi CHẶN
    # cho tới khi có người đóng nó. Đo được ở lần sinh đầu: 30 bài VZ mỗi bài
    # treo tới hết `timeout`. Đây đúng là việc mà `studio-harness.py` làm cho
    # đường trình duyệt (nó cũng đặt MPLBACKEND=Agg rồi móc Figure).
    # (`-I` kéo theo `-E`, nên mọi biến `PYTHON*` bị bỏ qua; `MPLBACKEND` thì
    # không mang tiền tố đó nên nó vẫn tới được matplotlib.)
    env = {**os.environ, 'MPLBACKEND': 'Agg'}
    try:
        proc = subprocess.run([sys.executable, '-I', str(tep)],
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                              env=env, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None, f'tracer không về trong {timeout}s'
    out = proc.stdout.decode('utf-8', 'replace')
    if BEGIN not in out or END not in out:
        err = proc.stderr.decode('utf-8', 'replace').strip().splitlines()
        return None, f'không có mốc JSON ({err[-1] if err else "không rõ"})'
    return json.loads(out.split(BEGIN, 1)[1].rsplit(END, 1)[0]), ''


# ---------------------------------------------------------------------------
# Giá trị -> CHỮ
#
# Cây JSON của tracer (`_pe_value`) được thiết kế cho giao diện bước-từng-bước
# của /ide: có `t`, `items`, `n`, `more`, `trunc`… Bảng ở màn đọc chỉ hiện MỘT
# chuỗi mỗi ô, nên quy đổi ngay tại đây — bê cả cây vào content_json là nhân ba
# dung lượng để frontend dựng lại đúng chuỗi này.
# ---------------------------------------------------------------------------

_BAO = {'list': '[]', 'tuple': '()', 'set': '{}', 'frozenset': '{}'}


def ve_gia_tri(v: dict) -> str:
    t = v.get('t')
    if t == 'prim':
        return str(v.get('r'))
    if t == 'str':
        s = str(v.get('r'))
        return repr(s)[:-1] + '…\'' if v.get('trunc') else repr(s)
    if t == 'bytes':
        return str(v.get('r'))
    if t in _BAO:
        mo, dong = _BAO[t]
        phan = [ve_gia_tri(x) for x in v.get('items') or []]
        if v.get('more'):
            phan.append('…')
        if t == 'tuple' and len(phan) == 1:
            return f'({phan[0]},)'
        if t in ('set', 'frozenset') and not phan:
            return 'set()'
        return mo + ', '.join(phan) + dong
    if t == 'dict':
        phan = [f'{ve_gia_tri(k)}: {ve_gia_tri(x)}' for k, x in v.get('items') or []]
        if v.get('more'):
            phan.append('…')
        return '{' + ', '.join(phan) + '}'
    if t == 'obj':
        phan = [f'{k}={ve_gia_tri(x)}' for k, x in v.get('attrs') or []]
        if v.get('more'):
            phan.append('…')
        return f'{v.get("cls")}({", ".join(phan)})'
    if t == 'fn':
        return f'<hàm {v.get("name")}>'
    if t == 'cls':
        return f'<lớp {v.get("name")}>'
    if t == 'cycle':
        return '<tự tham chiếu>'
    if t == 'depth':
        return '…'
    if t == 'opaque':
        if v.get('cls') == 'module':
            # `import numpy as np` -> "<thư viện numpy>". repr thật là
            # "<module 'numpy' from 'C:\\...\\site-packages\\numpy\\__init__.py'>"
            # — một đường dẫn trên máy người soạn, tức vừa vô nghĩa với người
            # học vừa làm bản dựng khác nhau giữa hai máy.
            m = re.search(r"<module '([^']+)'", str(v.get('r') or ''))
            return f'<thư viện {m.group(1) if m else "?"}>'
        return f'{v.get("cls")}: {gon_mot_dong(str(v.get("r") or ""))}'
    return '?'


# Địa chỉ bộ nhớ trong `repr` (`<cell at 0x0000027BBC5CC8E0>`). Hai lý do phải
# xoá, và cả hai là lỗi thật đã thấy trong bản sinh đầu:
#   · với người học nó là rác — không câu nào của bài nói về địa chỉ ô nhớ;
#   · nó đổi MỖI LẦN CHẠY, nên `traces.json` sinh lại là một diff khổng lồ và
#     phép so hash trong build.py không còn nói được điều gì hữu ích.
_DIA_CHI = re.compile(r' at 0x[0-9a-fA-F]+')


def gon_mot_dong(s: str) -> str:
    return _DIA_CHI.sub('', ' '.join(s.split()))


def cat(s: str, tran: int) -> str:
    s = gon_mot_dong(s)
    return s if len(s) <= tran else s[:tran - 1] + '…'


def la_gia_tri_hoc_duoc(v: dict) -> bool:
    """Giá trị có đáng làm ĐÁP ÁN của câu dự đoán không?

    Thư viện, hàm, lớp thì không: "np bằng mấy" không phải một câu hỏi. Đối
    tượng mờ (DataFrame, Figure) cũng không — đáp án của chúng là một repr dài
    mà không ai gõ lại được.
    """
    return v.get('t') in ('prim', 'str', 'bytes', 'list', 'tuple', 'set',
                          'frozenset', 'dict')


# ---------------------------------------------------------------------------
# Vết -> các dòng bảng
# ---------------------------------------------------------------------------

def dong_cua_doan(codes: list[str]) -> list[tuple[int, int]]:
    """Khoảng dòng (1-based, bao cả hai đầu) của từng đoạn trong `noi_code(codes)`.

    Phải khớp từng ký tự với `noi_code()` của build.py: một đoạn thì để trần,
    nhiều đoạn thì mỗi đoạn có một dòng mốc `# ── Đoạn i ──` rồi cách nhau một
    dòng trống. Lệch một dòng ở đây là cắt vết sai chỗ — và nó hỏng IM LẶNG:
    bảng vẫn hiện, chỉ là hiện các dòng của đoạn bên cạnh.
    """
    if len(codes) == 1:
        return [(1, len(codes[0].rstrip().split('\n')))]
    ra = []
    pos = 1
    for code in codes:
        n = len(code.rstrip().split('\n'))
        ra.append((pos + 1, pos + n))   # pos là dòng mốc
        pos = pos + n + 2               # + dòng trống giữa hai đoạn
    return ra


def _sau_nhat(step: dict) -> dict:
    khung = step.get('frames') or []
    return khung[-1] if khung else {'name': '<module>', 'locals': []}


# Tên mà CHÍNH CPython đặt vào frame của THÂN LỚP, không phải người học viết.
# `_pe_run` chỉ lọc dunder ở frame `<module>` (xem `snap()` trong pe_tracer.py),
# nên `class Student:` của SY05 làm bảng hiện ba dòng `__qualname__`,
# `__firstlineno__`, `__static_attributes__` — rác với người học, và còn đổi
# theo phiên bản Python (3.14 thêm hai cái cuối). `__init__` thì KHÔNG nằm đây:
# nó là hàm người học vừa định nghĩa và bảng phải hiện nó ra.
NOI_BO_LOP = {'__module__', '__qualname__', '__firstlineno__', '__doc__',
              '__static_attributes__', '__classdictcell__', '__annotations__',
              '__type_params__', '__dict__', '__weakref__'}


def _bien(step: dict) -> dict[str, str]:
    return {k: cat(ve_gia_tri(v), TRAN_GIA_TRI)
            for k, v in _sau_nhat(step).get('locals') or []
            if k not in NOI_BO_LOP}


def dong_bang(doc: dict) -> list[dict]:
    """Tài liệu vết -> danh sách dòng bảng, mỗi dòng là MỘT lần một dòng mã CHẠY XONG.

    `sys.settrace` phát sự kiện TRƯỚC khi dòng chạy, nên state ở bước k là state
    TRƯỚC dòng `steps[k].line`. Một bảng ghi "trước khi chạy dòng 3, total = 0"
    thì người học phải tự dịch sang "vậy dòng 2 làm total = 0" — nên ở đây mỗi
    dòng bảng được dựng từ MỘT CẶP bước liền nhau: dòng vừa chạy là
    `steps[k].line`, còn thứ nó làm đổi thì đọc ở `steps[k+1]`.
    """
    steps = doc.get('steps') or []
    stdout = doc.get('stdout') or ''
    ra: list[dict] = []
    for k, cur in enumerate(steps):
        nxt = steps[k + 1] if k + 1 < len(steps) else None
        khung_cur = _sau_nhat(cur)
        d: dict = {'line': cur['line']}
        sau = len(cur.get('frames') or [])
        if khung_cur.get('name') not in (None, '<module>'):
            d['fn'] = khung_cur['name']
        if sau > 1:
            d['depth'] = sau - 1
        if cur.get('event') == 'call':
            # Bước BƯỚC VÀO hàm: locals lúc này đúng là tham số đã nhận.
            d['enter'] = True
            doi = _bien(cur)
        elif nxt is not None and len(nxt.get('frames') or []) == sau \
                and _sau_nhat(nxt).get('name') == khung_cur.get('name'):
            truoc = _bien(cur)
            doi = {k2: v for k2, v in _bien(nxt).items() if truoc.get(k2) != v}
        else:
            # Sang/ra khỏi một frame khác: không so được hai bộ locals khác
            # phạm vi, nên dòng này chỉ nói "dòng N đã chạy".
            doi = {}
        if cur.get('event') == 'return' and 'ret' in cur:
            d['ret'] = cat(ve_gia_tri(cur['ret']), TRAN_GIA_TRI)
        if cur.get('event') == 'exception' and cur.get('exc'):
            d['exc'] = cat(f'{cur["exc"].get("type")}: {cur["exc"].get("message")}',
                           TRAN_GIA_TRI)
        if doi:
            d['set'] = [[k2, doi[k2]] for k2 in sorted(doi)]
        a = cur.get('out') or 0
        b = (nxt.get('out') if nxt else len(stdout)) or 0
        if b > a:
            d['out'] = cat(stdout[a:b], TRAN_IN_RA)
        ra.append(d)
    return ra


def loc_bien_cua_doan(d: dict, code: str) -> dict:
    """Bỏ khỏi một dòng bảng những biến mà ĐOẠN NÀY không hề nhắc tới.

    LỖI THẬT đã thấy ở SY13. Bài có ba đoạn; đoạn 1 đặt `marks`/`credits` (hai
    `ndarray`), đoạn 3 chỉ làm việc với một list dict. Vậy mà bảng của đoạn 3
    hiện `credits = ndarray: array([3., 1.]) | marks = …` ở giữa hai dòng
    `print` — hai biến không xuất hiện một lần nào trong đoạn đang đọc.

    Nguyên nhân là phép so hai bộ `f_locals` ở mức module: `<module>` là MỘT
    frame cho cả chương trình đã nối, nên bất cứ chỗ nào Python trình bày lại
    bộ biến đó (comprehension được nội tuyến hoá từ 3.12, PEP 709) cũng có thể
    làm một biến cũ trông như vừa đổi. Thay vì đoán cho đúng mọi ngóc ngách của
    CPython, luật ở đây nói thẳng điều người đọc cần: **bảng của một đoạn chỉ
    hiện biến mà đoạn đó nhắc tới**. Biến đoạn trước để lại mà đoạn này có sửa
    (`queues["low"].append(...)`) thì tên vẫn có trong code nên vẫn hiện.
    """
    bien = d.get('set')
    if not bien:
        return d
    giu = [[t, v] for t, v in bien if re.search(rf'\b{re.escape(t)}\b', code)]
    if len(giu) == len(bien):
        return d
    ra = dict(d)
    if giu:
        ra['set'] = giu
    else:
        ra.pop('set', None)
    return ra


def cat_bang(dong: list[dict]) -> tuple[list[dict], int, int]:
    """(dòng giữ lại, số dòng bị bỏ, vị trí chỗ bỏ). Giữ CẢ HAI đầu."""
    if len(dong) <= TRAN_DONG:
        return dong, 0, 0
    return (dong[:GIU_DAU] + dong[-GIU_CUOI:],
            len(dong) - GIU_DAU - GIU_CUOI, GIU_DAU)


# ---------------------------------------------------------------------------
# Câu dự đoán
# ---------------------------------------------------------------------------

# Giá trị trông như thế này thì KHÔNG dùng làm đáp án cho câu dự đoán: bản vẽ
# của một đối tượng mờ (`ndarray: array([1, 2, 3])`) hay một cái tên trong ngoặc
# nhọn (`<thư viện numpy>`, `<hàm fib>`). Người học không gõ lại được chúng, mà
# "gõ lại" chính là hành động cam kết mà bước dự đoán cần.
_RAC_DAP_AN = re.compile(r'^(<|[A-Za-z_][\w.]*: )')


def dap_an_hop_le(gt: str) -> bool:
    """Chuỗi này có gõ lại được trong một ô nhập không?"""
    if not gt or len(gt) > TRAN_DAP_AN:
        return False
    if _RAC_DAP_AN.match(gt):
        return False
    # Số nguyên khổng lồ (`2 ** 100` ở EX07 ra 31 chữ số): đúng là một bất ngờ,
    # nhưng không ai đoán được CHÍNH XÁC và cũng không ai gõ lại nổi.
    if gt.lstrip('-').isdigit() and len(gt.lstrip('-')) > 10:
        return False
    return True


def trong_vong_lap(n: int, dong_ma: list[str]) -> bool:
    """Dòng thứ `n` (1-based) có phải THÂN của một vòng lặp không?

    Một dòng thân vòng lặp là dòng có một `for`/`while` thụt NÔNG HƠN đứng
    trước nó, và bản thân nó không mở vòng lặp, không chứa comprehension.
    """
    if not (1 <= n <= len(dong_ma)):
        return False
    d = dong_ma[n - 1]
    if not d.strip() or re.match(r'\s*(for|while)\b', d):
        return False
    # Comprehension: một `for` nằm trong ngoặc trên cùng dòng.
    if re.search(r'[\[\{(][^\]\})]*\bfor\b', d):
        return False
    thut = len(d) - len(d.lstrip())
    for truoc in reversed(dong_ma[:n - 1]):
        if not truoc.strip():
            continue
        t = len(truoc) - len(truoc.lstrip())
        if t < thut and re.match(r'\s*(for|while)\b', truoc):
            return True
        if t < thut:
            # Khối bao ngoài gần nhất không phải vòng lặp (if/def/class) —
            # lùi tiếp ra ngoài nó.
            thut = t
    return False


def _khong_dau(s: str) -> str:
    """Bỏ khoảng trắng VÀ dấu nháy — để so một giá trị với CHỮ trong code.

    `repr` của chuỗi dùng nháy đơn, nguồn thường viết nháy kép, nên so thô thì
    `'name,mark\\nMai,8.5\\n'` và `"name,mark\\nMai,8.5\\n"` thành hai thứ khác
    nhau và phép so không bắt được gì.
    """
    return ''.join(str(s).split()).replace("'", '').replace('"', '')


def cau_du_doan(dong: list[dict], giu: list[dict], steps_doan: list[dict],
                ket_qua: str, bi_cat: bool, dong_ma: list[str]) -> dict | None:
    """Câu hỏi phải trả lời TRƯỚC khi bảng mở ra. None = đoạn không đủ điều kiện.

    Đáp án phải nằm TRONG BẢNG và KHÔNG nằm trong ô "Kết quả:" đã hiện sẵn ở
    trên — nếu không thì "dự đoán" chỉ là chép lại thứ đang ở trên màn hình, và
    đúng cái cơ chế (đoán → ngạc nhiên → chú ý) mà bước này tồn tại để kích
    hoạt sẽ không chạy lần nào.

    HAI danh sách, và phải phân biệt: `dong` là mọi bước của đoạn, `giu` là
    những bước THẬT SỰ HIỆN RA sau khi cắt bớt phần giữa. Đáp án phải đúng theo
    `dong` (nó là giá trị cuối THẬT) nhưng phải nhìn thấy được trong `giu` —
    hỏi một biến mà bảng không hiện là một bảng không trả lời được câu hỏi của
    chính nó, và `kiem_vet()` ở check.py đọc đúng `giu` nên nó sẽ đỏ.
    """
    kq = gon_mot_dong(ket_qua or '')

    def cuoi_cua(ds: list[dict]) -> dict[str, str]:
        ra: dict[str, str] = {}
        for d in ds:
            if d.get('depth'):
                continue
            for k, v in d.get('set') or []:
                ra[k] = v
        return ra

    # Loại `final`: biến có ĐỔI ở mức module trong chính đoạn này.
    doi_o_day = [(k, v) for d in giu if not d.get('depth')
                 for k, v in d.get('set') or []]
    cuoi = cuoi_cua(dong)
    cuoi_hien = cuoi_cua(giu)
    hoc_duoc = set()
    for s in steps_doan:
        for k, v in (s.get('frames') or [{}])[0].get('locals') or []:
            if la_gia_tri_hoc_duoc(v):
                hoc_duoc.add(k)
    # Biến phải CÒN TỒN TẠI ở bước cuối của đoạn. LỖI THẬT đã thấy ở SY13: từ
    # Python 3.12 list comprehension được nội tuyến hoá (PEP 709) nên biến chạy
    # của nó — `s` trong `[s["id"] for s in ranked]` — xuất hiện trong f_locals
    # mức module LÚC comprehension đang chạy, rồi BIẾN MẤT. Hỏi "sau khi chạy
    # xong, `s` bằng mấy?" là hỏi về một biến không còn tồn tại.
    con_lai = {k for k, _ in
               ((steps_doan[-1].get('frames') or [{}])[0].get('locals') or [])} \
        if steps_doan else set()
    ung_vien = [(k, v) for k, v in cuoi.items()
                if k in hoc_duoc and k in con_lai and not k.startswith('_')
                and dap_an_hop_le(v) and v not in kq
                # Giá trị CUỐI phải là giá trị cuối cùng bảng HIỆN RA: biến đổi
                # lần cuối trong phần bị cắt thì bảng nói một số, đáp án nói số
                # khác, và người học đúng vẫn bị báo sai.
                and cuoi_hien.get(k) == v]
    # BỎ biến chỉ được gán ĐÚNG MỘT LẦN bằng một hằng viết ngay trên dòng đó.
    # Lỗi thật đã thấy ở EX02: `raw = "name,mark\nMai,8.5\nAn,7.0\n"` rồi hỏi
    # "sau khi chạy xong, `raw` bằng mấy?" — đáp án nằm nguyên văn trong ô code
    # ngay phía trên, nên câu hỏi không bắt người học nghĩ một bước nào. Cùng
    # tinh thần với luật "đáp án không được có trong ô Kết quả", chỉ khác là
    # nguồn lộ ở ĐÂY là CHÍNH ĐOẠN CODE.
    def lo_trong_code(ten: str, gt: str) -> bool:
        o = [d for d in giu if any(t == ten for t, _ in d.get('set') or [])]
        if len(o) != 1:
            return False          # đổi nhiều lần thì giá trị cuối phải suy ra
        n = o[0]['line']
        nguon = dong_ma[n - 1] if 1 <= n <= len(dong_ma) else ''
        return _khong_dau(gt) in _khong_dau(nguon)

    ung_vien = [(k, v) for k, v in ung_vien if not lo_trong_code(k, v)]
    if ung_vien:
        # Biến ĐỔI NHIỀU LẦN nhất là biến thú vị nhất (bộ tích luỹ của vòng
        # lặp); hoà thì lấy biến đổi SAU CÙNG, vì "sau khi chạy xong" đang nói
        # về cuối đoạn.
        dem = {k: sum(1 for k2, _ in doi_o_day if k2 == k) for k, _ in ung_vien}
        thu_tu = {k: i for i, (k, _) in enumerate(doi_o_day)}
        ten, gt = max(ung_vien, key=lambda kv: (dem[kv[0]], thu_tu[kv[0]]))
        return {'kind': 'final', 'var': ten,
                'prompt': f'Sau khi chạy xong, `{ten}` bằng mấy?', 'answer': gt}
    # Loại `count`: số lần một dòng chạy. Bảng bị cắt thì đếm sai, nên không hỏi.
    #
    # CHỈ ĐẾM DÒNG Ở MỨC MODULE (`not d.get('fn')`), và đây là một lỗi thật đã
    # sửa: với `class Student:` ở SY05, dòng 1 sinh ra ba bước (câu lệnh class,
    # lúc vào thân lớp, lúc thân lớp chạy) nên bản đầu hỏi "dòng 1 chạy bao
    # nhiêu lần?" và đáp án là 3 — một con số của máy ảo Python, không phải
    # điều bài đang dạy. Ở mức module thì "chạy 5 lần" chỉ có một nghĩa: vòng lặp.
    if not bi_cat:
        dem_dong: dict[int, int] = {}
        for d in dong:
            if not d.get('fn'):
                dem_dong[d['line']] = dem_dong.get(d['line'], 0) + 1
        # CHỈ hỏi về một dòng THÂN VÒNG LẶP, và hai điều kiện dưới đây đều là
        # lỗi thật đã sửa:
        #   · dòng phải nằm TRONG một vòng lặp (có một dòng `for`/`while` thụt
        #     nông hơn đứng trước nó). Hỏi chính dòng `for` thì đáp án là n+1 —
        #     Python còn chạy qua nó một lần nữa để biết là đã hết — và đó là
        #     chi tiết máy ảo, không phải điều bài dạy;
        #   · dòng KHÔNG được chứa comprehension. Ở SY13, dòng
        #     `print([s["id"] for s in students])` sinh 4 sự kiện mức module vì
        #     từ Python 3.12 comprehension được nội tuyến hoá (PEP 709), nên
        #     "dòng 4 chạy 4 lần" là một con số không ai giải thích được.
        dem_dong = {n: v for n, v in dem_dong.items() if trong_vong_lap(n, dong_ma)}
        if dem_dong:
            n, lan = max(dem_dong.items(), key=lambda kv: (kv[1], -kv[0]))
            # Và SỐ LẦN cũng phải kín. Bản đầu chỉ kiểm điều này cho `final`/
            # `mid`, nên `kiem_vet()` của check.py bắt được 3 ca thật (PD29,
            # VZ02, CT06): vòng lặp chạy 3 lần và bài in ra một dòng có chữ số
            # 3 — người học đọc ô "Kết quả:" là đoán trúng mà chẳng cần nghĩ.
            if lan >= 3 and str(lan) not in kq:
                return {'kind': 'count', 'line': n,
                        'prompt': f'Dòng {n} chạy bao nhiêu lần?', 'answer': str(lan)}
    # Loại `mid`: giá trị TRUNG GIAN của một biến — nó đổi tiếp về sau, nên giá
    # trị này cũng phải đọc trên `giu` (phần hiện ra), không trên `dong`.
    # trị này không có trong `expected` và cũng không phải "giá trị cuối" mà
    # người học đoán được bằng cách đọc dòng print.
    #
    # Đây là loại câu cứu được đúng những đoạn đáng xem bảng nhất: SY05 dựng
    # một đối tượng bằng ba dòng `self.x = …`, nên "ngay sau dòng 3, `self` bằng
    # mấy?" hỏi đúng cái mà cả ô code lẫn ô Kết quả đều không nói — rằng đối
    # tượng được lấp dần từng thuộc tính một.
    thay = {}
    for d in giu:
        for k, v in d.get('set') or []:
            cu = thay.get(k)
            if cu is not None and cu[1] != v:
                # `cu` là lần xuất hiện ĐẦU, và nó đã bị thay bởi `v` -> kín.
                if (dap_an_hop_le(cu[1]) and cu[1] not in kq
                        and not k.startswith('__')):
                    return {'kind': 'mid', 'var': k, 'line': cu[0],
                            'prompt': f'Ngay sau khi dòng {cu[0]} chạy, `{k}` bằng mấy?',
                            'answer': cu[1]}
            if cu is None:
                thay[k] = (d['line'], v)
    return None


# ---------------------------------------------------------------------------

def bang_cua_bai(b, bai: dict) -> tuple[dict[str, dict], str]:
    """({chỉ số khối -> vết hoặc lý do bỏ}, hash của chương trình đã nối)."""
    khoi_code = [k for k in bai['reading']
                 if k['type'] == 'code' and not b.la_lenh_terminal(k)]
    chay: list[tuple[int, str, dict]] = []
    for i, k in enumerate(khoi_code):
        code, kq = b.code_hoc_vien(k)
        if b.phan_loai_khoi(code)[0] and not b.LECH_PHIEN_BAN.get((bai['id'], i)):
            chay.append((i, code, k))
    if not chay:
        return {}, ''
    noi = b.noi_code([c for _, c, _ in chay])
    bam = hashlib.sha256(noi.encode('utf-8')).hexdigest()[:16]

    doc, ly_do = chay_tracer(noi)
    if doc is None:
        return {str(i): {'skip': ly_do} for i, _, _ in chay}, bam
    if doc.get('error'):
        e = doc['error']
        return ({str(i): {'skip': f'chương trình lỗi: {e.get("type")}'}
                 for i, _, _ in chay}, bam)
    if doc.get('stopReason') != 'done':
        return ({str(i): {'skip': f'vết chạm trần: {doc["stopReason"]}'}
                 for i, _, _ in chay}, bam)
    if doc.get('stdoutTruncated'):
        return {str(i): {'skip': 'đầu ra bị cắt'} for i, _, _ in chay}, bam

    tat_ca = dong_bang(doc)
    khoang = dong_cua_doan([c for _, c, _ in chay])

    def doan_cua(n: int) -> int | None:
        for j, (a, z) in enumerate(khoang):
            if a <= n <= z:
                return j
        return None

    # Đoạn của TỪNG bước, theo thứ tự chạy. Cần nó vì phép cắt KHÔNG được chỉ
    # lọc theo khoảng dòng: một bài định nghĩa hàm ở đoạn 1 rồi GỌI nó ở đoạn 3
    # thì thân hàm chạy ở đoạn 3 nhưng số dòng vẫn thuộc đoạn 1 — lọc theo dòng
    # là nhét mấy bước đó vào CUỐI bảng của đoạn 1, kèm tham số mà đoạn 1 chưa
    # có biến nào mang. Nên bảng của đoạn j dừng ở lần đầu luồng chạy bước sang
    # một đoạn SAU nó.
    cua_buoc = [doan_cua(d['line']) for d in tat_ca]
    ra: dict[str, dict] = {}
    for vt, ((i, code, khoi), (dau, cuoi_d)) in enumerate(zip(chay, khoang)):
        het = next((k for k, j in enumerate(cua_buoc) if j is not None and j > vt),
                   len(tat_ca))
        giu_k = [k for k in range(min(het, len(tat_ca))) if cua_buoc[k] == vt]
        trong = [loc_bien_cua_doan(tat_ca[k], code) for k in giu_k]
        # `dong_bang` phát ĐÚNG một dòng cho mỗi bước, nên hai danh sách cùng
        # chỉ số — cắt chúng bằng cùng một phép chọn.
        steps_doan = [doc['steps'][k] for k in giu_k]
        # Đánh số lại về 1: ô code trên màn đọc hiện số dòng của RIÊNG nó.
        dong = [dict(d, line=d['line'] - dau + 1) for d in trong]
        if len(dong) < 3:
            ra[str(i)] = {'skip': f'chỉ {len(dong)} bước — bảng không nói thêm gì'}
            continue
        giu, bo, cho_bo = cat_bang(dong)
        kq = b.code_hoc_vien(khoi)[1] or ''
        du_doan = cau_du_doan(dong, giu, steps_doan, str(kq), bool(bo),
                              code.split('\n'))
        if du_doan is None:
            ra[str(i)] = {'skip': 'không có câu dự đoán nào bảng trả lời được'}
            continue
        vet: dict = {'predict': du_doan, 'rows': giu}
        if bo:
            vet['elided'] = bo
            vet['elidedAt'] = cho_bo
        ra[str(i)] = vet
    return ra, bam


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='', help='chỉ các mã bài này (cách nhau dấu phẩy)')
    ap.add_argument('--report', action='store_true', help='không ghi traces.json')
    args = ap.parse_args()
    chi = {m.strip() for m in args.only.split(',') if m.strip()}

    b = nap_build()
    du_lieu = json.loads(SOURCE.read_text(encoding='utf-8'))
    bai_theo_id = {x['id']: x for x in du_lieu['lessons']}

    cu = json.loads(CACHE.read_text(encoding='utf-8')) if CACHE.is_file() else {'lessons': {}}
    ra: dict[str, dict] = dict(cu.get('lessons') or {}) if chi else {}

    du, co_vet, bo_qua = 0, 0, 0
    ly_do_bo: dict[str, int] = {}
    for so, nhom in enumerate(du_lieu['groups'], 1):
        if so < MODULE_DAU_TIEN:
            continue
        for ma in nhom['ids']:
            if chi and ma not in chi:
                continue
            muc, bam = bang_cua_bai(b, bai_theo_id[ma])
            if not muc:
                ra.pop(ma, None)
                continue
            ra[ma] = {'codeHash': bam, 'blocks': muc}
            du += len(muc)
            for v in muc.values():
                if 'skip' in v:
                    bo_qua += 1
                    nhan = v['skip'].split(' —')[0].split(' (')[0]
                    ly_do_bo[nhan] = ly_do_bo.get(nhan, 0) + 1
                else:
                    co_vet += 1
            print(f'  {ma}: {sum(1 for v in muc.values() if "skip" not in v)}/{len(muc)} '
                  f'khối có vết', flush=True)

    print(f'\n{du} khối đủ điều kiện · {co_vet} có vết · {bo_qua} bỏ qua')
    for k, v in sorted(ly_do_bo.items(), key=lambda kv: -kv[1]):
        print(f'  bỏ {v:>3}: {k}')

    if args.report:
        return 0
    CACHE.write_text(
        json.dumps({'note': 'Sinh bằng scripts/pe-da/gen_traces.py — ĐỪNG sửa tay.',
                    'lessons': dict(sorted(ra.items()))},
                   ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'✓ ghi {CACHE} ({CACHE.stat().st_size / 1024:.0f} KB)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
