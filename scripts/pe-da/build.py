"""Dựng 172 bài "Python cho Data Analyst" thành studio-lesson/v2 cho khoá python_advanced.

    py scripts/pe-da/build.py            # -> scripts/pe-da/out/
    py scripts/pe-da/build.py --check    # chỉ kiểm, không ghi

Nguồn là `source/course.json` — bản đã bỏ trường `html` của gói python-da (bản
HTML dựng lại được từ `reading`, giữ lại chỉ làm file phình gấp đôi mà không ai
đọc). Hình dạng đích: xem SCHEMA.md cùng thư mục.

Bộ này KHÔNG có trắc nghiệm, scaffold hay ca chấm — nên build không phát
`step_2.mcq`, `step_3`, `step_4.tests`. Đừng "bù" bằng cách tự sinh: câu hỏi do
máy sinh từ chính lời giảng chỉ kiểm được trí nhớ ngắn hạn, và nó làm người đọc
báo cáo tưởng khoá có phần luyện đã được kiểm duyệt.
"""
from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'source' / 'course.json'
OUT = HERE / 'out'

COURSE_ID = 'python_advanced'
# Ảnh biểu đồ chép sang frontend/public/static/da/ (xem copy_anh()).
ANH_URL = '/static/da/'
IMPORTED_AT = '2026-10-24T00:00:00+00:00'

# ---------------------------------------------------------------------------
# Chạy được trong trình duyệt hay không
#
# Phân loại nằm NGAY TRONG build (không đọc file ngoài) để lần dựng nào cũng ra
# cùng kết quả. Bản kiểm độc lập (chạy thật từng khối bằng CPython) dùng để đối
# chiếu với bảng này, không phải để thay nó.
# ---------------------------------------------------------------------------

# Wheel tự lưu trữ trong frontend/public/pyodide/v0.27.7/ — khớp StudioPackage.
VENDORED = {'numpy': 'numpy', 'pandas': 'pandas', 'matplotlib': 'matplotlib',
            'mpl_toolkits': 'matplotlib', 'sqlite3': 'sqlite3', 'PIL': None}

# WASM không có: không phải thiếu wheel mà là nền tảng không hỗ trợ.
WASM_KHONG_CO = {
    'tkinter': 'Tkinter cần hệ cửa sổ của máy',
    'turtle': 'turtle vẽ qua Tk',
    'multiprocessing': 'WASM không fork được tiến trình',
    'subprocess': 'WASM không gọi được chương trình ngoài',
    'curses': 'curses cần terminal thật',
    'socket': 'WASM không mở được socket TCP',
    'threading': 'bản Pyodide này không bật thread thật',
    'signal': 'tín hiệu POSIX không có trong WASM',
    'resource': 'giới hạn tài nguyên POSIX không có trong WASM',
    'pwd': 'tài khoản hệ điều hành không có trong WASM',
    'grp': 'nhóm hệ điều hành không có trong WASM',
    'fcntl': 'khoá file POSIX không có trong WASM',
    'termios': 'terminal thật không có trong WASM',
    'select': 'select trên mô tả file thật không có trong WASM',
    'concurrent': 'concurrent.futures chạy trên thread/process thật',
    'ctypes': 'không nạp được thư viện động của máy',
    'webbrowser': 'không mở được trình duyệt của máy',
    # Đo thật bằng chính runtime trong repo (importlib trên 38 module), không
    # suy từ tài liệu: ba module stdlib này KHÔNG có trong python_stdlib.zip của
    # bản Pyodide 0.27.7 đang dùng. `sqlite3` cũng không có sẵn, nhưng nó có
    # wheel riêng nên vẫn chạy được — đừng gộp chung.
    'lzma': 'lzma không có trong stdlib của bản Pyodide này',
    'ssl': 'ssl không có trong stdlib của bản Pyodide này',
}

# Thuộc tính phơi ra môi trường THẬT của máy. Bài kiểm chúng (EX03 in
# `Path(sys.executable).is_file()`) chạy trong trình duyệt sẽ ra kết quả khác
# hẳn bài ghi — đúng cú pháp, đúng logic, sai sự thật.
THUOC_TINH_MAY = {
    'sys.executable': 'sys.executable trong trình duyệt không trỏ tới file thật',
    'sys.prefix': 'sys.prefix trong trình duyệt không phải môi trường của bạn',
    'sys.base_prefix': 'sys.base_prefix trong trình duyệt không phải môi trường của bạn',
}

# Thư viện được gọi qua CHUỖI chứ không qua `import` — quét import bỏ sót hẳn.
# PD13 viết `df.to_excel(..., engine="openpyxl")`: không dòng import nào, nhưng
# chạy là ModuleNotFoundError.
CHUOI_GOI_THU_VIEN = {
    'openpyxl': 'openpyxl chưa có wheel trong /pyodide/v0.27.7/',
    'xlsxwriter': 'xlsxwriter chưa có wheel trong /pyodide/v0.27.7/',
    'pyarrow': 'pyarrow chưa có wheel trong /pyodide/v0.27.7/',
    'sas7bdat': 'sas7bdat chưa có wheel trong /pyodide/v0.27.7/',
}

# Thư viện Python thật nhưng KHÔNG có wheel trong repo.
THIEU_WHEEL = {
    'seaborn', 'plotly', 'scipy', 'sklearn', 'statsmodels', 'requests',
    'bs4', 'openpyxl', 'xlrd', 'pyarrow', 'dash', 'ipywidgets', 'IPython',
    'sqlalchemy', 'h5py',
    'notebook', 'jupyter', 'sas7bdat', 'pandasql', 'psutil', 'PySimpleGUI',
}

# Lời gọi làm treo hoặc vô nghĩa trong worker.
GOI_CHAN = {
    'os.fork': 'os.fork không có trong WASM',
    'os.forkpty': 'os.forkpty không có trong WASM',
    'os.system': 'os.system cần shell của máy',
    'os.execv': 'os.exec* cần tiến trình thật',
    'os.execvp': 'os.exec* cần tiến trình thật',
    'os.kill': 'gửi tín hiệu cần tiến trình thật',
    'os.wait': 'chờ tiến trình con cần tiến trình thật',
    'os.waitpid': 'chờ tiến trình con cần tiến trình thật',
    'os.getppid': 'PID trong WASM là số giả, dạy sai thì hại hơn',
    'input': 'input() làm worker đứng im chờ mãi',
}


# Đoạn viết đúng với thư viện mà GÓI GỐC kiểm, nhưng không chạy trên thư viện
# mà NỀN TẢNG có. Gói kiểm trên matplotlib 3.11.2 / numpy 2.5.4 / pandas 3.1.0
# (requirements-tested.txt), còn Pyodide 0.27.7 trong repo mang matplotlib 3.8.4
# / numpy 2.0.2 / pandas 2.2.3 — lệch tới một major ở pandas.
#
# Đây KHÔNG phải danh sách bỏ qua cho yên chuyện: mỗi dòng là một đoạn nội dung
# cần tác giả sửa, và nó nằm đây để người học không bấm Chạy rồi nhận traceback
# trong lúc chờ. Sửa xong nội dung thì XOÁ dòng tương ứng. `check-pyodide.mjs`
# là thứ tìm ra chúng, nên thêm bài mới cũng sẽ lộ ra theo cùng cách.
LECH_PHIEN_BAN = {
    ('VZ07', 0): 'ax.boxplot(tick_labels=…) cần matplotlib ≥ 3.9; nền tảng có 3.8.4',
    ('VZ07', 1): 'ax.boxplot(tick_labels=…) cần matplotlib ≥ 3.9; nền tảng có 3.8.4',
    ('VZ03', 0): 'fig.autofmt_xdate() xung đột với layout="constrained" ở matplotlib 3.8.4 '
                 '— in ra UserWarning chen vào giữa kết quả bài ghi',
}


def modules_cua(code: str) -> tuple[set[str], set[str], bool]:
    """(module import, lời gọi bị chặn, có lỗi cú pháp)."""
    try:
        cay = ast.parse(code)
    except SyntaxError:
        return set(), set(), True
    mods: set[str] = set()
    goi: set[str] = set()
    for nut in ast.walk(cay):
        if isinstance(nut, ast.Import):
            for a in nut.names:
                mods.add(a.name.split('.')[0])
        elif isinstance(nut, ast.ImportFrom):
            if nut.level == 0 and nut.module:
                mods.add(nut.module.split('.')[0])
        elif isinstance(nut, ast.Call):
            ten = ten_cua_goi(nut.func)
            if ten in GOI_CHAN:
                goi.add(ten)
    return mods, goi, False


def ten_cua_goi(nut: ast.expr) -> str:
    """'os.fork' cho os.fork(), 'input' cho input(); '' cho mọi dạng khác."""
    if isinstance(nut, ast.Name):
        return nut.id
    if isinstance(nut, ast.Attribute) and isinstance(nut.value, ast.Name):
        return f'{nut.value.id}.{nut.attr}'
    return ''


def phan_loai_khoi(code: str) -> tuple[bool, str]:
    """(chạy được trong Pyodide, lý do nếu không).

    Lệnh shell đã được `la_lenh_terminal()` lọc ra TRƯỚC khi vào đây, nên một
    đoạn không phân tích được cú pháp ở bước này là đoạn Python thật sự hỏng —
    không được lặng lẽ cho qua.
    """
    mods, goi, loi_cu_phap = modules_cua(code)
    if loi_cu_phap:
        return False, 'đoạn Python không phân tích được cú pháp — cần xem lại nội dung'
    for m in sorted(mods):
        if m in WASM_KHONG_CO:
            return False, WASM_KHONG_CO[m]
        if m in THIEU_WHEEL:
            return False, f'{m} chưa có wheel trong /pyodide/v0.27.7/'
    if goi:
        return False, GOI_CHAN[sorted(goi)[0]]
    for ten, ly_do in THUOC_TINH_MAY.items():
        if ten in code:
            return False, ly_do
    for ten, ly_do in CHUOI_GOI_THU_VIEN.items():
        if f'"{ten}"' in code or f"'{ten}'" in code:
            return False, ly_do
    # Dữ liệu mẫu của gói gốc (fixtures/) không được chép sang repo, nên bài nào
    # đọc file trong đó chỉ chạy được trên máy có gói giải nén.
    if 'fixtures/' in code:
        return False, 'bài đọc file mẫu trong fixtures/ của gói gốc'
    return True, ''


def goi_can_tai(codes: list[str]) -> list[str]:
    can: set[str] = set()
    for code in codes:
        mods, _, _ = modules_cua(code)
        for m in mods:
            ten = VENDORED.get(m)
            if ten:
                can.add(ten)
    # matplotlib kéo theo pillow; worker tự lo, chỉ khai tên gói chính.
    return sorted(can)


# ---------------------------------------------------------------------------
# Chia bài đọc thành màn
# ---------------------------------------------------------------------------

def chia_man(reading: list[dict]) -> list[list[dict]]:
    """Một màn = một ý được một khối code chứng minh.

    Cắt màn mới ngay TRƯỚC đoạn văn nào đứng sau một khối code, khi màn đang
    dựng đã có code. Nhịp của nguồn là: dẫn chuyện → code → kết quả → giải
    thích, nên luật này giữ nguyên nhịp đó thay vì cắt máy móc theo số khối.
    """
    man: list[list[dict]] = []
    hien_tai: list[dict] = []
    da_co_code = False
    for khoi in reading:
        if khoi['type'] == 'paragraph' and da_co_code and len(hien_tai) >= 2:
            man.append(hien_tai)
            hien_tai = []
            da_co_code = False
        hien_tai.append(khoi)
        if khoi['type'] == 'code':
            da_co_code = True
    if hien_tai:
        # Màn cuối chỉ còn một khối lẻ thì gộp lại: một màn chỉ có đúng một câu
        # kết là màn trống rỗng với người học.
        if len(hien_tai) == 1 and man:
            man[-1].extend(hien_tai)
        else:
            man.append(hien_tai)
    return man


def code_hoc_vien(khoi: dict) -> tuple[str, str | None]:
    """(code người học đọc, kết quả kèm theo).

    Nguồn giữ HAI biến thể cho cùng một khối: `code` là bản đầy đủ dùng để xuất
    hình (có `matplotlib.use("Agg")` và `fig.savefig(...)` vào thư mục tạm), còn
    `displayCode` là bản gọn viết cho người học (`plt.show()`, không có đoạn ghi
    file). Bài học phải hiện bản GỌN: đoạn savefig là máy móc của khâu soạn
    sách, in nó ra cho người mới học là dạy họ một thói quen không ai dùng.
    """
    code = khoi.get('displayCode') or khoi['code']
    ket_qua = khoi.get('displayExpected', khoi.get('expected'))
    return code, ket_qua


def la_lenh_terminal(khoi: dict) -> bool:
    """Khối là LỆNH SHELL chứ không phải Python (`python -m venv .venv`…)."""
    return khoi.get('kind') == 'terminal' or 'manual' in (
        khoi.get('mode'), khoi.get('displayMode'))


def khoi_doc(khoi: dict) -> list[dict]:
    """Chuyển một khối nguồn sang các ReadBlock renderer hiểu được."""
    if khoi['type'] == 'paragraph':
        return [{'type': 'paragraph', 'text': khoi['text']}]
    if khoi['type'] == 'table':
        return [{'type': 'table', 'headers': khoi['headers'], 'rows': khoi['rows']}]
    if khoi['type'] != 'code':
        raise ValueError(f'khối lạ: {khoi["type"]}')

    code, ket_qua = code_hoc_vien(khoi)
    loai = 'terminal' if la_lenh_terminal(khoi) else 'code'
    ra: dict = {'type': loai, 'code': code}
    if ket_qua is not None:
        ra['expected'] = ket_qua
    khoi_ra = [ra]
    # Hình do chính đoạn code trên vẽ ra. Lời giảng trỏ thẳng vào nó ("trong
    # hình đầu, vị trí ngang cho biết ngày…") nên bỏ hình là bỏ nửa bài.
    #
    # CHỈ PNG. Mười "hình" của VZ20–VZ22/VZ26 là file .html do Plotly xuất ra,
    # mỗi file nhúng sẵn cả thư viện plotly.js — 4,7 MB một hình, 46 MB cho đúng
    # bốn bài. Bản dựng đầu chép chúng theo tên file và làm public/static/da/
    # phình từ 2,3 MB lên 49 MB, lại còn đưa vào thẻ <img> nên cũng không hiện
    # ra hình. Bốn bài đó dùng plotly nên vốn đã là bài chạy trên máy.
    hinh = khoi.get('figure')
    if hinh and hinh.lower().endswith('.png'):
        ten = hinh.split('/')[-1]
        khoi_ra.append({'type': 'figure', 'src': f'{ANH_URL}{ten}',
                        'alt': f'Biểu đồ do đoạn code trên vẽ ra ({ten})'})
    return khoi_ra


# ---------------------------------------------------------------------------
# Thời lượng và XP
#
# Nguồn KHÔNG ghi thời lượng. Ước bằng khối lượng thật của bài, và ghi rõ công
# thức ở đây để con số trong danh mục có chỗ kiểm lại — mốc "~48 giờ" sai của
# bản trước sinh ra đúng từ việc không ai viết công thức xuống.
# ---------------------------------------------------------------------------

def phut_cua(reading: list[dict], so_cau: int) -> int:
    tu = sum(len(k['text'].split()) for k in reading if k['type'] == 'paragraph')
    dong_code = sum(len(k['code'].splitlines()) for k in reading if k['type'] == 'code')
    phut = tu / 160 + dong_code / 6 + so_cau * 1.5
    return max(6, min(30, round(phut)))


def xp_cua(phut: int) -> int:
    return max(8, min(25, round(phut * 0.6)))


# ---------------------------------------------------------------------------

def nguon_cua(bai: dict) -> str:
    phan = []
    for ref in bai.get('sourceRefs') or []:
        trang = ref.get('pages') or []
        if trang:
            phan.append(f'{ref["document"]} tr. {gon_trang(trang)}')
        else:
            phan.append(ref['document'])
    if not phan and bai.get('sourcePages'):
        phan.append(f'All_slide_one_file.pdf tr. {gon_trang(bai["sourcePages"])}')
    for s in bai.get('sources') or []:
        phan.append(s['title'])
    return '; '.join(phan)


def gon_trang(trang: list[int]) -> str:
    """[112,113,114,120] -> '112-114, 120'."""
    trang = sorted(set(trang))
    doan, dau, truoc = [], None, None
    for t in trang + [None]:
        if dau is None:
            dau = truoc = t
            continue
        if t == (truoc or 0) + 1:
            truoc = t
            continue
        doan.append(str(dau) if dau == truoc else f'{dau}-{truoc}')
        dau = truoc = t
    return ', '.join(doan)


def cau_luyen(bai: dict) -> list[dict]:
    ra = []
    for d in (bai.get('drills') or []) + (bai.get('reviewExercises') or []):
        muc = {'prompt': d['prompt'], 'answer': d['answer']}
        if d.get('answerCode'):
            muc['answerCode'] = d['answerCode']
        if d.get('answerExpected') is not None:
            muc['answerExpected'] = d['answerExpected']
        ra.append(muc)
    return ra


def dung_bai(bai: dict, thu_tu: int, module_so: int, module_ten: str,
             ten_theo_id: dict[str, str]) -> dict:
    reading = bai['reading']
    man = chia_man(reading)
    luyen = cau_luyen(bai)
    phut = phut_cua(reading, len(luyen))

    # Phân loại theo code NGƯỜI HỌC đọc, không theo bản xuất hình: hai bản
    # import khác nhau (bản xuất hình thêm matplotlib.use/pathlib/tempfile).
    ma_bai = bai['id']
    codes = [code_hoc_vien(k)[0] for k in reading
             if k['type'] == 'code' and not la_lenh_terminal(k)]
    so_lenh_terminal = sum(1 for k in reading
                           if k['type'] == 'code' and la_lenh_terminal(k))
    phan_loai = []
    for i, c in enumerate(codes):
        lech = LECH_PHIEN_BAN.get((ma_bai, i))
        phan_loai.append((False, lech) if lech else phan_loai_khoi(c))
    chay_duoc = [c for c, (ok, _) in zip(codes, phan_loai) if ok]
    chan = [(i, ly_do) for i, (ok, ly_do) in enumerate(phan_loai) if not ok]

    if not codes:
        mode = 'local'
        ly_do_bai = ('bài này là các lệnh gõ trong terminal'
                     if so_lenh_terminal else 'bài không có đoạn code nào để chạy')
    elif not chan:
        mode = 'pyodide'
        ly_do_bai = ''
    elif chay_duoc:
        mode = 'mixed'
        ly_do_bai = chan[0][1]
    else:
        mode = 'local'
        ly_do_bai = chan[0][1]

    ma = bai['id']
    tieu_de = f'{ma} · {bai["title"]}'
    phu_de = f'{bai["level"]} · M{module_so} · {phut} phút'

    step_1: dict = {'read': [[r for k in lat for r in khoi_doc(k)] for lat in man]}
    truoc = [ten_theo_id[b] for b in bai.get('before') or [] if b in ten_theo_id]
    step_1['context'] = {
        'level': bai['level'],
        'prereq': ', '.join(truoc) if truoc else 'Bắt đầu tại đây',
    }

    noi_dung: dict = {
        'schema': 'studio-lesson/v2',
        'title': tieu_de,
        'subtitle': phu_de,
        'source': {
            'kind': 'python-da',
            'filename': f'course.json#{ma}',
            'parser': 'pe-da/build',
            'importedAt': IMPORTED_AT,
            'slides': nguon_cua(bai),
        },
        'step_1': step_1,
    }
    if luyen:
        noi_dung['step_2'] = {'practice': luyen}
    noi_dung['step_4'] = dung_sandbox(mode, ly_do_bai, chay_duoc, chan)

    return {
        'lesson_code': ma,
        'sort_order': thu_tu,
        'module': module_ten,
        'title': tieu_de,
        'subtitle': phu_de,
        'estimated_minutes': phut,
        'xp_reward': xp_cua(phut),
        'content_json': noi_dung,
        # Không vào DB — chỉ để check.py và báo cáo đối chiếu.
        '_mode': mode,
        '_blocked': [{'block': i, 'reason': r} for i, r in chan],
    }


def dung_sandbox(mode: str, ly_do: str, chay_duoc: list[str],
                 chan: list[tuple[int, str]]) -> dict:
    if mode == 'local':
        return {
            'task': {
                'title': 'Chạy trên máy của bạn',
                'body': f'Bài này không chạy được trong trình duyệt: {ly_do}. '
                        'Mở Python trên máy rồi gõ lại các đoạn code ở trên.',
            },
            # Có `procedure` mà không có starterCode/tests thì showEditorOf() ẩn
            # hẳn ô soạn mã — người học không bấm Chạy để nhận một lỗi khó hiểu.
            'procedure': [
                'Mở terminal tại thư mục làm việc của bạn.',
                'Tạo môi trường: py -m venv .venv',
                'Cài thư viện bài cần: .venv\\Scripts\\python -m pip install <tên gói>',
                'Lưu đoạn code vào một file .py rồi chạy: .venv\\Scripts\\python ten_file.py',
            ],
        }

    than = ('Ô này chạy Python ngay trong trình duyệt. Code của bài đã có sẵn — '
            'sửa số liệu, thêm print() rồi chạy lại để xem kết quả đổi thế nào.')
    if mode == 'mixed':
        than += (f' {len(chan)} đoạn trong bài không chạy được ở đây ({chan[0][1]}) '
                 'nên không nằm trong ô này.')
    ra: dict = {
        'task': {'title': 'Chạy thử', 'body': than},
        'starterCode': noi_code(chay_duoc),
    }
    goi = goi_can_tai(chay_duoc)
    if goi:
        ra['packages'] = goi
    if mode == 'mixed':
        ra['env'] = f'{len(chan)} đoạn phải chạy bằng Python trên máy: {chan[0][1]}.'
    return ra


def noi_code(codes: list[str]) -> str:
    """Nối các đoạn của bài theo đúng thứ tự đọc.

    Nguồn viết các đoạn trong một bài để chạy NỐI TIẾP nhau (đoạn sau dùng biến
    và import của đoạn trước), nên nối lại là đúng cách người học gặp chúng.
    """
    if len(codes) == 1:
        return codes[0].rstrip() + '\n'
    phan = []
    for i, code in enumerate(codes, 1):
        phan.append(f'# ── Đoạn {i} ──\n{code.rstrip()}')
    return '\n\n'.join(phan) + '\n'


ANH_NGUON = Path('C:/Users/sonkh/Downloads/python-da-share/python-da/visuals')
ANH_DICH = HERE.parent.parent / 'frontend' / 'public' / 'static' / 'da'


def chep_anh(can: set[str]) -> tuple[int, list[str]]:
    """Chép các PNG biểu đồ mà bài trỏ tới sang public/static/da/.

    Chỉ PNG (2,2 MB cho 80 file). KHÔNG chép 11 file HTML Plotly: mỗi file nhúng
    sẵn cả thư viện plotly nên riêng chúng đã là 46 MB cho đúng 3 bài.
    """
    if not ANH_NGUON.is_dir():
        # Gói gốc chỉ có trên máy người soạn; CI và máy khác chạy lại build với
        # ảnh ĐÃ COMMIT. Thiếu gói gốc không phải lỗi — thiếu ẢNH mới là lỗi.
        co_san = {p.name for p in ANH_DICH.glob('*.png')} if ANH_DICH.is_dir() else set()
        return len(can & co_san), sorted(can - co_san)
    ANH_DICH.mkdir(parents=True, exist_ok=True)
    # Dọn file lạ còn sót từ lần dựng trước (bản đầu lỡ chép 10 file .html).
    for cu in ANH_DICH.iterdir():
        if cu.name not in can:
            cu.unlink()
    chep, thieu = 0, []
    for ten in sorted(can):
        if not ten.lower().endswith('.png'):
            thieu.append(f'{ten} (không phải PNG — xem chú thích ở khoi_doc)')
            continue
        nguon = ANH_NGUON / ten
        if nguon.is_file():
            (ANH_DICH / ten).write_bytes(nguon.read_bytes())
            chep += 1
        else:
            thieu.append(ten)
    return chep, thieu


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='chỉ kiểm, không ghi file')
    args = ap.parse_args()

    du_lieu = json.loads(SOURCE.read_text(encoding='utf-8'))
    bai_theo_id = {b['id']: b for b in du_lieu['lessons']}
    ten_theo_id = {b['id']: f'{b["id"]} · {b["title"]}' for b in du_lieu['lessons']}

    bai_ra: list[dict] = []
    modules: list[dict] = []
    thu_tu = 0
    for so, nhom in enumerate(du_lieu['groups'], 1):
        ten_module = f'M{so} · {nhom["title"]}'
        trong_module = []
        for ma in nhom['ids']:
            thu_tu += 1
            b = dung_bai(bai_theo_id[ma], thu_tu, so, ten_module, ten_theo_id)
            bai_ra.append(b)
            trong_module.append(b['title'])
        modules.append({'title': ten_module, 'lessons': trong_module})

    tong_phut = sum(b['estimated_minutes'] for b in bai_ra)
    dem_mode: dict[str, int] = {}
    for b in bai_ra:
        dem_mode[b['_mode']] = dem_mode.get(b['_mode'], 0) + 1

    print(f'{len(bai_ra)} bài · {len(modules)} module · '
          f'{tong_phut} phút ≈ {tong_phut / 60:.1f} giờ')
    print('chạy được:', ', '.join(f'{k}={v}' for k, v in sorted(dem_mode.items())))
    print('màn đọc:', sum(len(b['content_json']['step_1']['read']) for b in bai_ra),
          '· câu luyện tập:',
          sum(len(b['content_json'].get('step_2', {}).get('practice', [])) for b in bai_ra))

    if args.check:
        return 0

    OUT.mkdir(exist_ok=True)
    (OUT / 'lessons').mkdir(exist_ok=True)
    for cu in (OUT / 'lessons').glob('*.json'):
        cu.unlink()
    for b in bai_ra:
        ten = f'{b["sort_order"]:03d}-{b["lesson_code"]}.json'
        (OUT / 'lessons' / ten).write_text(
            json.dumps(b, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

    (OUT / 'lessons.json').write_text(
        json.dumps({'course_id': COURSE_ID, 'lessons': bai_ra},
                   ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

    giao_trinh = {
        'requirements': [
            'Học bằng cách đọc lời giảng, đọc code kèm kết quả rồi tự chạy lại và sửa',
            'Không cần biết Python trước: bài PY01 bắt đầu từ một phép cộng',
            f'{dem_mode.get("pyodide", 0)} bài chạy được ngay trong trình duyệt; '
            f'{dem_mode.get("local", 0) + dem_mode.get("mixed", 0)} bài cần Python 3.12 trên máy '
            '(Tkinter, tiến trình, đa luồng, seaborn, plotly)',
            'Bài numpy/pandas/matplotlib tải thêm thư viện ở lần mở đầu tiên (vài MB)',
        ],
        'skills': [
            'Python nền tảng: biến, điều kiện, vòng lặp, collection, hàm và file',
            'NumPy: array, shape, index, slice, phép toán theo phần tử và theo trục',
            'pandas: đọc dữ liệu, chọn lọc, nhóm, nối bảng và quy trình phân tích',
            'Trực quan hoá: Matplotlib, seaborn, Plotly và dashboard',
            'OOP, module, lưu trữ dữ liệu và sqlite3',
            'Hệ điều hành: tiến trình, đa luồng, multiprocessing và shell',
            'Tkinter: từ form nhỏ tới ứng dụng quản lý điểm',
        ],
        'modules': modules,
    }
    (OUT / 'curriculum-python-advanced.json').write_text(
        json.dumps(giao_trinh, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    can_anh = {k['src'].rsplit('/', 1)[-1]
               for b in bai_ra for lat in b['content_json']['step_1']['read']
               for k in lat if k['type'] == 'figure'}
    chep, thieu = chep_anh(can_anh)
    print(f'ảnh: {chep}/{len(can_anh)} chép sang {ANH_DICH}')
    if thieu:
        print('THIẾU ảnh (bài sẽ trỏ vào hình không có):', ', '.join(thieu), file=sys.stderr)

    print(f'✓ ghi vào {OUT}')
    return 1 if thieu else 0


if __name__ == '__main__':
    sys.exit(main())
