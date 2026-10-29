"""Dựng 172 bài "Python cho Data Analyst" thành studio-lesson/v2 cho khoá python_advanced.

    py scripts/pe-da/build.py            # -> scripts/pe-da/out/
    py scripts/pe-da/build.py --check    # chỉ kiểm, không ghi

Nguồn là `source/course.json` — bản đã bỏ trường `html` của gói python-da (bản
HTML dựng lại được từ `reading`, giữ lại chỉ làm file phình gấp đôi mà không ai
đọc). Hình dạng đích: xem SCHEMA.md cùng thư mục.

`source/practice.json` là nguồn THỨ HAI: 138 bài tự làm kèm 419 ca chấm thật
và lời giải tham khảo, trích từ lớp practice của gói gốc. Bài nào có bài tập
CHẤM ĐƯỢC trong trình duyệt thì `step_4` là bài tập đó (task + starterCode +
tests + contract), thay cho ô chạy thử. Trước bản này cả 172 bài KHÔNG có một
ca chấm nào — người thử viết code rồi tự so bằng mắt.

`step_2.mcq` nay cũng có: 3 câu mỗi bài, lấy từ 1032 câu trắc nghiệm NGƯỜI
VIẾT của gói (mỗi bài 1 gốc + 5 biến thể, mỗi câu 3 lựa chọn kèm lời phản hồi
riêng). Đây là nguồn duy nhất rót được vào kho quiz ôn tập ở backend — bộ đó
chấm Ở SERVER và không gửi đáp án ra client, nên là phần duy nhất của hệ thống
chấm mà client không giả mạo được.

Vẫn KHÔNG tự sinh câu hỏi, và vẫn không có `step_3`: câu do máy sinh từ chính
lời giảng chỉ kiểm được trí nhớ ngắn hạn, và nó làm người đọc báo cáo tưởng
khoá có phần luyện đã được kiểm duyệt.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import random
import re
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'source' / 'course.json'
PRACTICE = HERE / 'source' / 'practice.json'
# Vết TỪNG BƯỚC tính sẵn, sinh bởi `py scripts/pe-da/gen_traces.py` và COMMIT.
# Vì sao không sinh ở đây: CI chạy build.py trên Python 3.12 không có
# numpy/pandas rồi đòi bản dựng trùng từng byte với bản đã commit — build mà tự
# chạy tracer thì hai môi trường ra hai bản dựng và CI đỏ mãi. Đúng khuôn mà
# `chep_anh()` đã dùng cho 80 ảnh biểu đồ. Xem đầu gen_traces.py.
TRACES = HERE / 'traces.json'
OUT = HERE / 'out'

COURSE_ID = 'python_advanced'

# Số câu trắc nghiệm phát ra MỖI BÀI, lấy từ đầu danh sách (gốc trước, rồi biến
# thể). Gói có 6 câu mỗi bài; phát hết là thêm 6 màn vào mỗi bài, dài gấp rưỡi.
#
# Con số 3 có hai lý do đo được, không phải chọn cho đẹp:
#  · khớp pe-v4 (46/48 bài có 3 câu), nên hành vi "phải xong 2 bài mới mở được
#    quiz ôn" mà AGENTS.md đã ghi vẫn đúng — MIN_POOL của backend là 5 CÂU;
#  · mỗi bài chỉ có MỘT gốc câu hỏi, nên câu thứ 4-6 vẫn hỏi cùng một thứ. Thêm
#    chúng làm bài dài ra mà không hỏi thêm điều gì.
SO_CAU_MCQ = 3
# Ảnh biểu đồ chép sang frontend/public/static/da/ (xem copy_anh()).
ANH_URL = '/static/da/'
IMPORTED_AT = '2026-10-24T00:00:00+00:00'

# ---------------------------------------------------------------------------
# FILE DỮ LIỆU — bộ dữ liệu quán, nạp vào hệ tệp ảo của Pyodide
#
# Trước bản này KHÔNG có đường nào để một file dữ liệu tới được Pyodide: worker
# chỉ biết `step_4.packages` → `loadPackage`, và cả 499 khối code của bản dựng
# đều tự dựng dữ liệu tại chỗ (`StringIO`, `tempfile`, `df = pd.DataFrame(...)`)
# — `read_csv` một file thật xuất hiện đúng 7 lần, và không lần nào đọc được gì.
#
# Khai ở CẤP BÀI (`step_4.dataFiles`), không ở cấp khối, vì ba lý do đo được:
#   · thư mục làm việc là của CẢ LẦN CHẠY. `_prepare_dir` trong
#     studio-harness.py tạo một thư mục rồi `chdir` vào đó cho toàn bộ chương
#     trình, mà ô "Chạy thử" nối MỌI khối chạy được thành một chương trình —
#     nên "file này chỉ có ở khối 3" là một lời hứa hệ tệp không giữ được;
#   · `packages` đã ở cấp bài và cùng một ý nghĩa ("mọi lần chạy Python của bài
#     này có sẵn thứ này"). Hai cơ chế cùng nghĩa mà khác cấp là thứ sẽ lệch;
#   · bộ chấm nội dung (check-pyodide.mjs) chạy DỒN các khối của bài thành một
#     chương trình, nên nó cũng chỉ hỏi được câu "bài này cần file nào".
#
# ĐƯỜNG DẪN TRONG CODE HỌC VIÊN LÀ TÊN FILE TRƠN (`pd.read_csv('mon.csv')`):
# người học đang học pandas, không học đường dẫn của website này. File được ghi
# vào chính thư mục chạy nên tên trơn là đúng.
#
# Danh sách trắng KHÔNG phải một hằng ở đây mà là CHÍNH THƯ MỤC dưới đây: bài
# chỉ khai được tên file có thật trong đó, và `main()` chặn ở khâu dựng. Lý do
# không chép thành danh sách thứ hai trong file này: ba chỗ (thư mục, bản literal
# ở studio-lesson.schema.ts, luật ở check.py) đã là nhiều nhất còn canh được —
# bản literal ở schema là bắt buộc vì backend chạy ở nơi KHÔNG có frontend/public.
DU_LIEU_DICH = HERE.parent.parent / 'frontend' / 'public' / 'static' / 'da-dulieu'
# Dùng cho thông báo lỗi; đường fetch thật nằm trong studio-lesson.worker.js.
DU_LIEU_URL = '/static/da-dulieu/'
# Chỉ CSV, chữ thường, không đường dẫn. `-` có trong `coffee-sales-cc0.csv`.
# Khớp TEN_DU_LIEU của worker và DU_LIEU_HOP_LE của studio-lesson.schema.ts.
TEN_FILE_DU_LIEU = re.compile(r'^[a-z0-9_-]+\.csv$')

# Khối đọc file dữ liệu, PHÁT TỪ BUILD — hôm nay đúng MỘT bài.
#
# Vì sao bảng nằm ở đây và không thành trường mới trong `source/course.json`:
# cùng lý lẽ đã viết cho SO_DO_DOC bên dưới — gói nội dung còn được giao lại
# nhiều lần, và đây là PHÉP THỬ cho cơ chế nạp file, không phải một đặc tả.
# Ngày module thực hành (module 11) cần bộ dữ liệu này cho cả chục bài thì
# chuyển khai báo sang gói nguồn, đừng nuôi bảng này thành danh bạ.
#
# PD13 là bài đầu tiên, và nó được chọn vì `step_4` của nó vẫn là ô "Chạy thử":
# bài nào có BÀI TẬP ĐƯỢC CHẤM thì `step_4` là bài tập đó, nên mã bài đọc không
# còn được học viên bấm Chạy. PD13 là bài pandas duy nhất mà bài tập của gói
# không chấm được (openpyxl thiếu wheel), nên khối dưới đây CÓ người bấm Chạy.
# Chủ đề cũng khớp: "chọn đúng bảng cần đọc".
#
# PD16 là bài thứ hai, thêm 29/10, và nó CÓ bài tập được chấm — hôm qua đó là
# điều bị cấm. Cổng cấm ấy ra đời vì `check-practice.mjs` chưa nạp được file;
# nay nó nạp được, nên cái giá còn lại là cái giá thật của việc khai file ở một
# bài có bài tập: học viên TẢI mon.csv (479 byte) rồi chỉ ĐỌC khối dữ liệu chứ
# không chạy lại được nó. Đổi lại, file nằm sẵn trong thư mục chạy của bài tập,
# nên đây cũng là chỗ đầu tiên chứng minh được hai thứ đi cùng nhau. Chủ đề
# khớp: merge là lúc một bảng DANH MỤC có thật đáng giá hơn một bảng dựng tay.
#
# Khối được CHÈN VÀO CUỐI phần đọc, không chèn theo chỉ số: nguồn còn được viết
# lại, và một khoá theo chỉ số khối sẽ trôi im lặng.
KHOI_DU_LIEU: dict[str, dict] = {
    'PD13': {
        'files': ['mon.csv', 'quay.csv'],
        'paragraph':
            'Hai bảng tra của quán có THẬT trong thư mục của bài này: '
            '`mon.csv` giữ giá niêm yết từng món, `quay.csv` giữ ba quầy. Khi '
            'file đã nằm cạnh chương trình thì `pd.read_csv` nhận luôn tên '
            'file — không cần `StringIO` như các ví dụ ở trên. Việc đầu tiên '
            'vẫn là xem bảng nào có cột mình cần, chứ không phải đọc cả hai '
            'rồi mới tính.',
        'code': (
            "import pandas as pd\n"
            "\n"
            "mon = pd.read_csv('mon.csv')\n"
            "quay = pd.read_csv('quay.csv')\n"
            "print(mon.shape, quay.shape)\n"
            "print(list(mon.columns))\n"
            "print(mon.groupby('nhom')['gia_niem_yet'].mean().astype(int).to_dict())\n"
            "print(quay.loc[0, 'ten'])\n"
        ),
        # Kết quả THẬT, do `node scripts/pe-da/check-pyodide.mjs PD13` đo trên
        # chính Pyodide của trình duyệt. Đừng sửa bằng tay: sửa là tự tạo ra
        # đúng loại lỗi bộ chấm đó tồn tại để bắt.
        'expected': (
            "(12, 4) (3, 4)\n"
            "['mon', 'ten_mon', 'nhom', 'gia_niem_yet']\n"
            "{'Bánh': 28500, 'Cà phê': 34571, 'Trà': 40500, 'Đá xay': 49000}\n"
            "Quầy mặt phố"
        ),
    },
    'PD16': {
        'files': ['mon.csv'],
        'paragraph':
            'Bảng danh mục của quán có THẬT trong thư mục của bài này: '
            '`mon.csv` giữ mã món, tên và giá niêm yết. Đây đúng là hình dạng '
            'mà `merge` sinh ra để phục vụ — một bên là đơn hàng đổi từng '
            'ngày, một bên là danh mục đứng yên, nối với nhau bằng mã món. Và '
            'câu hỏi ngay trên vẫn là câu hỏi đầu tiên: mã trong bảng danh mục '
            'có duy nhất không, vì nếu không thì phép nối nhân số hàng đơn '
            'hàng lên.',
        'code': (
            "import pandas as pd\n"
            "\n"
            "mon = pd.read_csv('mon.csv')\n"
            "don = pd.DataFrame({'mon': ['latte', 'bac-xiu', 'latte', 'tra-dao']})\n"
            "ban = don.merge(mon[['mon', 'ten_mon', 'gia_niem_yet']], on='mon', how='left')\n"
            "print(mon['mon'].is_unique)\n"
            "print(ban['ten_mon'].tolist())\n"
            "print(int(ban['gia_niem_yet'].sum()))\n"
        ),
        # Kết quả THẬT, do `node scripts/pe-da/check-pyodide.mjs PD16` đo trên
        # chính Pyodide của trình duyệt. Đừng sửa bằng tay.
        'expected': (
            "True\n"
            "['Latte', 'Bạc xỉu', 'Latte', 'Trà đào cam sả']\n"
            "161000"
        ),
    },
}

# ---------------------------------------------------------------------------
# Chạy được trong trình duyệt hay không
#
# Phân loại nằm NGAY TRONG build (không đọc file ngoài) để lần dựng nào cũng ra
# cùng kết quả. Bản kiểm độc lập (chạy thật từng khối bằng CPython) dùng để đối
# chiếu với bảng này, không phải để thay nó.
# ---------------------------------------------------------------------------

# Wheel tự lưu trữ trong frontend/public/pyodide/v314.0.7/ — khớp StudioPackage.
# Giá trị None = module CÓ sẵn, không phải tải gói nào: `sqlite3` là wheel riêng
# ở Pyodide 0.27.7 nhưng vào thẳng stdlib ở 314, và khai nó làm `loadPackage`
# ném "No known package" rồi giết cả lần chạy. `zoneinfo` thì ngược lại — là
# stdlib nhưng rỗng dữ liệu múi giờ, phải tải gói `tzdata` mới tra được
# "Asia/Ho_Chi_Minh" (PD23 phát hiện ra chuyện này).
VENDORED = {'numpy': 'numpy', 'pandas': 'pandas', 'matplotlib': 'matplotlib',
            'mpl_toolkits': 'matplotlib', 'PIL': None, 'sqlite3': None,
            'zoneinfo': 'tzdata'}

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
    # Đo thật bằng chính runtime trong repo, không suy từ tài liệu. Ở Pyodide
    # 0.27.7 thì `lzma`, `ssl`, `sqlite3` đều THIẾU; bản 314.0.7 có cả ba, nên
    # ba dòng chặn chúng đã được gỡ khỏi đây (bài SY19 dạy nén bz2/lzma nhờ đó
    # chạy được trong trình duyệt). Chỉ còn `curses` và `tkinter` là thiếu
    # thật, và đó là giới hạn của WASM chứ không phải thiếu wheel.
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
# Gói phải tải nhưng KHÔNG xuất hiện trong bất cứ dòng `import` nào của bài.
# PD23 viết `tz_convert('Asia/Ho_Chi_Minh')`: pandas gọi `zoneinfo` ở bên trong,
# mà `zoneinfo` trong Pyodide là stdlib RỖNG — không có gói `tzdata` thì ném
# ZoneInfoNotFoundError. Quét import không thấy gì để bám vào, nên phải dò theo
# chính thao tác người học gõ.
GOI_AN = [
    (('tz_convert', 'tz_localize', 'ZoneInfo(', 'tz='), 'tzdata'),
]


CHUOI_GOI_THU_VIEN = {
    'openpyxl': 'openpyxl chưa có wheel trong /pyodide/v314.0.7/',
    'xlsxwriter': 'xlsxwriter chưa có wheel trong /pyodide/v314.0.7/',
    'pyarrow': 'pyarrow chưa có wheel trong /pyodide/v314.0.7/',
    'sas7bdat': 'sas7bdat chưa có wheel trong /pyodide/v314.0.7/',
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
    # Trống sau khi nâng Pyodide 0.27.7 → 314.0.7 (Python 3.12.7 → 3.14.2,
    # matplotlib 3.8.4 → 3.10.8, pandas 2.2.3 → 3.0.2, numpy 2.0.2 → 2.4.6).
    # Hai mục từng nằm đây — VZ07 (`ax.boxplot(tick_labels=…)` cần matplotlib
    # ≥ 3.9) và VZ03 (`fig.autofmt_xdate()` xung đột `layout="constrained"`) —
    # đều hết lỗi vì nền tảng nay MỚI HƠN chỗ chúng vỡ. Giữ cái móc này lại:
    # lần nâng sau sẽ lại có thứ lệch theo chiều ngược lại.
}


# ---------------------------------------------------------------------------
# SƠ ĐỒ bằng DOM cho màn đọc — PHÉP THỬ, hôm nay đúng MỘT bài
#
# Vì sao có bảng này. Ba trên bốn người trả lời khảo sát ngày 29/10/2026 chọn
# "Chữ và nhãn TRONG sơ đồ quá nhỏ, phải phóng to mới đọc được". Chữ đó nằm
# trong PNG 780×455, nên CSS không với tới: chữ của TRANG reflow, chữ trong
# ẢNH thì scale — trên màn 360px ảnh bị bóp 0,46× và nhãn 10pt hiện ra 4–5px.
# Khối `diagram` dựng sơ đồ bằng DOM để chữ là chữ.
#
# Vì sao bảng nằm TRONG build.py, không thành trường mới trong course.json:
#   · `source/course.json` là GÓI NỘI DUNG của người soạn giáo trình — thêm
#     trường vào đó là đòi họ bảo trì một hình dạng dữ liệu mà hôm nay chỉ một
#     bài dùng, và gói thì còn được giao lại nhiều lần nữa;
#   · đây là PHÉP THỬ trước khi bỏ công cho cả bộ. Một dict 20 dòng rút lại
#     được trong một commit; một trường trong đặc tả thì không.
# Ngày bộ này lớn hơn chục bài thì chuyển nó sang gói nguồn, đừng nuôi bảng này
# thành danh bạ.
#
# Khoá: (mã bài, chỉ số khối CODE của bài — đếm trên `khoi_code`, tức ĐÃ bỏ các
# khối terminal). Sơ đồ được chèn NGAY SAU khối đó.
#
# RÀNG BUỘC do check.py canh, không phải thẩm mỹ:
#   · số làn phải CHẴN — grid dựng hai cột, một làn lẻ đứng một mình là mất
#     phép so sánh, tức mất đúng thứ duy nhất khối này mang lại;
#   · bước ĐẦU của mỗi làn phải là một biểu thức CÓ THẬT trong code bài (so sau
#     khi bỏ hết khoảng trắng), và bước CUỐI phải có thật trong `expected` của
#     bài. Thiếu luật này thì sơ đồ trôi khỏi bài mà không gì đỏ: nguồn sửa
#     `3 * 15 - 5` thành con số khác, bài dạy một chuyện và sơ đồ dạy chuyện
#     khác ngay cạnh nó.
SO_DO_DOC: dict[tuple[str, int], dict] = {
    # PY05 "thứ tự phép tính". Đặt sau khối code THỨ HAI (`7 / 2`, `7 // 2`):
    # tới đó người học đã thấy cả hai cặp — dấu ngoặc ở khối 1, chia ở khối 2 —
    # nên sơ đồ là chỗ gộp chúng lại, không phải chỗ giới thiệu.
    ('PY05', 1): {
        'title': 'Thứ tự phép tính — hai cách đọc cùng một dãy số',
        'lanes': [
            {
                'label': 'Không có ngoặc',
                'steps': ['3 * 15 - 5', '45 - 5', '40'],
                'note': 'Nhân chạy trước vì `*` ưu tiên hơn `-`: '
                        'giảm 5 nghìn MỘT lần cho cả hoá đơn.',
            },
            {
                'label': 'Có ngoặc',
                'steps': ['3 * (15 - 5)', '3 * 10', '30'],
                'note': 'Ngoặc chạy trước mọi thứ: '
                        'giảm 5 nghìn cho TỪNG cốc, nên hoá đơn rẻ hơn 10 nghìn.',
            },
            {
                'label': 'Chia thực `/`',
                'steps': ['7 / 2', '3.5'],
                'note': '`/` luôn trả số thực, kể cả khi chia hết — `4 / 2` ra `2.0`.',
            },
            {
                'label': 'Chia lấy thương `//`',
                'steps': ['7 // 2', '3'],
                'note': '`//` làm tròn XUỐNG, nên `-7 // 2` ra `-4` chứ không phải `-3`.',
            },
        ],
    },
}


# ---------------------------------------------------------------------------
# BẢNG TỪNG BƯỚC (vết tính sẵn) — module nào được có
#
# Module 1 (18 bài PY01–PY18) KHÔNG có bảng. Quyết định đã chốt với chủ dự án:
# ở đó code còn là `print(2 + 3)`, nên một bảng "dòng 1 đã chạy" không nói thêm
# gì — mà tệ hơn, nó dạy người học rằng cái nút đó không đáng bấm, rồi họ sẽ
# không bấm nó cả ở module 5 khi nó mới thật sự đáng.
#
# Con số này phải khớp `MODULE_DAU_TIEN` trong gen_traces.py; nếu không thì
# build đòi vết cho một module mà khâu sinh không sinh, và cổng đối chiếu ở
# main() đỏ ngay — tức lệch không sống sót im lặng được.
MODULE_DAU_TIEN_CO_VET = 2


def nap_vet() -> dict[str, dict]:
    """Đọc traces.json. Thiếu file = không bài nào có vết (và main() báo lỗi)."""
    if not TRACES.is_file():
        return {}
    return json.loads(TRACES.read_text(encoding='utf-8')).get('lessons') or {}


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


# Module mà studio-harness.py MÔ PHỎNG: không có bản thật trong WASM, nhưng
# harness thay bằng bản đơn luồng/chạy-lại-chương-trình đủ để chấm hợp đồng
# (xem docstring của studio-harness.py). Bài ĐỌC vẫn bị chặn vì nó so đầu ra
# với dòng "Kết quả:" tác giả ghi, mà mô phỏng in khác bản thật ở PID và thứ tự
# thread. Bài TẬP thì ca chấm hỏi GIÁ TRỊ TRẢ VỀ, nên mô phỏng là đủ.
DUOC_MO_PHONG = {'threading', 'subprocess', 'multiprocessing', 'concurrent',
                 'signal', 'select', 'queue'}


def phan_loai_khoi(code: str, cho_mo_phong: bool = False) -> tuple[bool, str]:
    """(chạy được trong Pyodide, lý do nếu không).

    Lệnh shell đã được `la_lenh_terminal()` lọc ra TRƯỚC khi vào đây, nên một
    đoạn không phân tích được cú pháp ở bước này là đoạn Python thật sự hỏng —
    không được lặng lẽ cho qua.

    `cho_mo_phong=True` chỉ dùng cho BÀI TẬP được chấm — xem DUOC_MO_PHONG.
    """
    mods, goi, loi_cu_phap = modules_cua(code)
    if loi_cu_phap:
        return False, 'đoạn Python không phân tích được cú pháp — cần xem lại nội dung'
    for m in sorted(mods):
        if m in WASM_KHONG_CO:
            if cho_mo_phong and m in DUOC_MO_PHONG:
                continue
            return False, WASM_KHONG_CO[m]
        if m in THIEU_WHEEL:
            return False, f'{m} chưa có wheel trong /pyodide/v314.0.7/'
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


# Mốc nối giữa ĐỀ BÀI và ĐOẠN CODE trong một câu trắc nghiệm. Hai chỗ phải khớp
# từng ký tự: `cau_trac_nghiem()` ở đây nối, `tachDeVaCode()` trong
# frontend/src/lib/studio-lesson.ts tách. Đổi một bên thì màn trắc nghiệm hiện
# nguyên chuỗi gộp làm tiêu đề — code dồn thành một dòng, không đọc được.
NOI_DE_CODE = '\n\n'


# ---------------------------------------------------------------------------
# Trộn vị trí đáp án — ngẫu nhiên CÓ PHÂN TẦNG, seed cố định
#
# BỆNH ĐANG CHỮA, đo trên ngân hàng nguồn `source/practice.json`: 1 032 câu, tất
# cả đúng 3 phương án, mà **519 câu (50,3%) có đáp án ở vị trí 1** — ngẫu nhiên
# phải ~33%. Cả 172 bài chỉ sinh ra **8 dãy vị trí khác nhau**, và câu đầu mỗi
# bài chạy đúng chu kỳ 1→3→2: nghĩa là người soạn (hoặc công cụ sinh của gói)
# XOAY vị trí theo công thức chứ không trộn. Hệ quả đo được: học viên bấm phương
# án "a" cho mọi câu được **6/6 ở 16 bài và 5/6 ở 30 bài** — 46 bài mà phần chấm
# trắc nghiệm không đo được gì.
#
# Thiên lệch này KHÔNG chỉ là mẹo đoán. Với đề lập trình, thiên lệch chọn của
# sinh viên đi theo hướng vị trí ĐẦU (Tellinghuisen & Sulikowski, 676 sinh
# viên), nên 50,3% ở vị trí 1 làm cả ngân hàng vừa dễ hơn vừa phân biệt kém hơn.
# Xem VAN-PHONG.md §8 M2.
#
# BA lựa chọn thiết kế, mỗi cái chống một lỗi khác:
#
#  1. PHÂN TẦNG, không ngẫu nhiên thuần. Với đề 3 câu, xác suất cả 3 câu cùng
#     rơi vào một vị trí là 1/9 — tức ~19/172 bài sẽ trông y như bệnh cũ với
#     người học, và họ không có cách nào biết đó là tình cờ. Phân tầng nghĩa là
#     trong MỖI bài, ba câu rơi vào BA vị trí khác nhau.
#
#  2. Ở khâu BUILD, không ở frontend. Kho quiz chấm Ở SERVER lấy snapshot từ
#     `content_json`, nên trộn ở client là trộn sau khi đáp án đã được chốt —
#     hai phía sẽ nói hai chuyện khác nhau về "lựa chọn số mấy là đúng".
#
#  3. Seed CỐ ĐỊNH suy từ mã bài. Dựng hai lần phải ra giống hệt từng byte: nếu
#     không thì mỗi lần build lại là một lần đổi đáp án của học viên đang học
#     dở, và `update-lesson-content.ts` (in sha256 cũ → mới) không so được gì.
#     KHÔNG dùng `hash()` dựng sẵn: với chuỗi, nó được băm theo PYTHONHASHSEED
#     ngẫu nhiên mỗi tiến trình, nên `random.Random(hash(ma_bai))` ra một kết
#     quả KHÁC mỗi lần chạy — đúng cái bẫy mà seed cố định sinh ra để tránh, và
#     nó im lặng (bản dựng vẫn hợp lệ, chỉ là khác bản trước).
SEED_TRON = 'pe-da/mcq/v1'


def _so_cua(text: str) -> float | None:
    """Giá trị số của một phương án, hoặc None nếu nó không phải số."""
    t = (text or '').strip().replace('_', '')
    try:
        return float(t)
    except ValueError:
        return None


def la_day_so(texts: list[str]) -> bool:
    """Các phương án có phải một DÃY SỐ (có thứ tự tự nhiên) không?

    Bẫy thứ nhất của M2: **không trộn** phương án là dãy số. Với `12 / 11 / 1`
    thì thứ tự chính nó là manh mối hợp lệ — người học đọc ba số cạnh nhau để
    thấy chúng lệch nhau ở đâu. Trộn chúng lấy đi manh mối đó mà không mua lại
    gì, vì thứ cần phá là THIÊN LỆCH CỦA NGƯỜI SOẠN, còn thứ tự của một dãy số
    thì do chính con số quyết định, không do người soạn.

    Nên nhóm này được SẮP TĂNG thay vì trộn: vừa giữ được manh mối (đo trên
    nguồn: chỉ 24/98 câu đang được trình bày theo thứ tự, 74 câu còn lại đang
    lộn xộn), vừa đưa vị trí đáp án về chỗ do con số quyết định. Đo sau khi
    sắp: 10 / 62 / 26 — vẫn lệch về giữa, nhưng lệch đó là tính chất của NỘI
    DUNG (nhiễu hay kẹp hai bên đáp án), không phải của khâu dựng, và 98 câu
    trên 1 032 không đủ kéo tổng phân bố ra khỏi ngưỡng.
    """
    return bool(texts) and all(_so_cua(t) is not None for t in texts)


def _vi_tri_dich(rng: random.Random, so_cau: int, so_lua_chon: int,
                 da_chiem: list[int]) -> list[int]:
    """Túi vị trí đích cho các câu CÒN PHẢI TRỘN của một bài.

    Phân tầng = chia đều: `so_cau` câu trên `so_lua_chon` vị trí thì mỗi vị trí
    nhận `so_cau // so_lua_chon` câu, phần dư rải bằng rng. `da_chiem` là vị
    trí mà các câu "dãy số" đã lấy (chúng không trộn được nên vị trí của chúng
    là dữ kiện, không phải lựa chọn) — trừ chúng ra khỏi chỉ tiêu để tổng của
    cả BÀI vẫn đều, chứ không chỉ phần trộn được đều.
    """
    chi_tieu: list[int] = []
    for i in range(so_cau):
        chi_tieu.append(i % so_lua_chon)
    # Phần dư thuộc về vị trí nào là do rng quyết, không phải luôn là vị trí 0.
    if so_cau % so_lua_chon:
        vt = list(range(so_lua_chon))
        rng.shuffle(vt)
        chi_tieu = chi_tieu[:so_cau - so_cau % so_lua_chon] + vt[:so_cau % so_lua_chon]
    con = Counter(chi_tieu)
    for p in da_chiem:
        if con.get(p):
            con[p] -= 1
    tui = [p for p in range(so_lua_chon) for _ in range(con.get(p, 0))]
    can = so_cau - len(da_chiem)
    # Bài có nhiều câu "dãy số" dồn vào một vị trí thì túi hụt — bù bằng vị trí
    # đang ít câu nhất, để không bao giờ phải trả về túi rỗng rồi trộn hỏng.
    while len(tui) < can:
        dem = Counter(da_chiem) + Counter(tui)
        tui.append(min(range(so_lua_chon), key=lambda p: (dem.get(p, 0), p)))
    rng.shuffle(tui)
    return tui[:can]


def tron_vi_tri_dap_an(ma_bai: str, cau: list[dict]) -> list[dict]:
    """Đổi chỗ phương án của từng câu để vị trí đáp án rải đều trong bài.

    Nhận/trả danh sách câu ở hình dạng NGUỒN (`options` mang `id`/`text`/
    `feedback`, `correctOption` là id). Trả về bản mới với `options` đã đổi chỗ;
    `correctOption` KHÔNG đổi vì nó trỏ theo `id`, nên không có cách nào để
    phép đổi chỗ này làm lệch đáp án — đó là lý do trộn ở đây chứ không ở sau
    bước quy về vị trí.

    Bẫy thứ ba và thứ tư của M2 được xử ở đây:
      · nhiễu được trộn bằng chính rng (không giữ thứ tự nguồn), nên nhiễu
        giống đáp án nhất không ĐỨNG LIỀN TRƯỚC đáp án theo một luật nào —
        `kiem_trac_nghiem()` đo tỉ lệ đó và đòi nó quanh mức tình cờ;
      · độ dài phương án thì phép trộn không chữa được (nó là việc của người
        soạn), nên check.py BÁO ra câu nào lệch nhiều thay vì im lặng.

    `feedback` đi THEO phương án vì cả dict được mang nguyên sang chỗ mới. Đây
    là lỗi im lặng tệ nhất có thể có ở khâu này: trộn chữ mà để `feedback` ở
    lại theo vị trí thì học viên chọn sai và đọc được lời giải thích của một
    phương án khác — không ngoại lệ nào được ném, không log nào đỏ.
    """
    rng = random.Random(f'{SEED_TRON}/{ma_bai}')
    # Pha 1: các câu "dãy số" được SẮP, và vị trí đáp án của chúng là dữ kiện.
    sap: dict[int, list[dict]] = {}
    da_chiem: list[int] = []
    so_lua_chon = max((len(q.get('options') or []) for q in cau), default=0)
    for i, q in enumerate(cau):
        op = list(q.get('options') or [])
        texts = [o.get('text') or '' for o in op]
        # Hai lý do để KHÔNG trộn một câu, và cả hai đều khoá vị trí của nó lại:
        #  · dãy số — xem `la_day_so()`, câu được SẮP TĂNG;
        #  · hai phương án cùng chữ — không phân biệt được chúng ở đâu sau khi
        #    trộn, mà check.py đối chiếu bản dựng với nguồn THEO CHỮ. Nguồn hôm
        #    nay có 0/1032 câu như vậy; giữ nhánh này để ngày nào có thì câu đó
        #    được để NGUYÊN chứ không trộn sai.
        trung_chu = len(set(texts)) != len(texts)
        if not (trung_chu or la_day_so(texts)):
            continue
        if not trung_chu:
            op.sort(key=lambda o: _so_cua(o.get('text') or '') or 0.0)
        sap[i] = op
        da_chiem.append(next((j for j, o in enumerate(op)
                              if o.get('id') == q.get('correctOption')), 0))
    # Pha 2: phần còn lại nhận túi vị trí đã trừ chỗ pha 1 chiếm.
    con = [i for i in range(len(cau)) if i not in sap]
    tui = _vi_tri_dich(rng, len(cau), so_lua_chon or 1, da_chiem) if con else []
    ra: list[dict] = []
    for i, q in enumerate(cau):
        if i in sap:
            ra.append({**q, 'options': sap[i]})
            continue
        op = list(q.get('options') or [])
        dung = next((j for j, o in enumerate(op)
                     if o.get('id') == q.get('correctOption')), None)
        if dung is None or len(op) < 2:
            ra.append(q)
            continue
        nhieu = [o for j, o in enumerate(op) if j != dung]
        rng.shuffle(nhieu)
        dich = min(tui.pop() if tui else 0, len(op) - 1)
        moi = nhieu[:dich] + [op[dung]] + nhieu[dich:]
        ra.append({**q, 'options': moi})
    return ra


def cau_trac_nghiem(mcq: dict, ma_bai: str = '', so_cau: int = SO_CAU_MCQ) -> list[dict]:
    """Chuyển câu trắc nghiệm của gói sang hình dạng `step_2.mcq`.

    HAI phía đọc trường này, và cả hai đã nhận cùng một hình dạng từ trước:
      · frontend — `correctIndex()` tìm lựa chọn có `correct === true`,
        `optionText()` đọc `text`, `optionDetail()` đọc `detail`;
      · backend — `normalizeQuestion()` đòi `question` (KHÔNG phải `prompt`) và
        tìm lựa chọn `correct === true`, rồi quy về `correct: <vị trí>` trước
        khi lưu snapshot.

    Gói thì dùng `prompt` + `correctOption: '<id>'` + `feedback`. Lệch ở ĐÚNG
    ba tên đó, và lệch IM LẶNG: `normalizeQuestion` trả None cho mọi câu thiếu
    `question`, nên kho quiz cứ rỗng mà không ngoại lệ nào được ném, không log
    nào đỏ. Vì vậy phép đổi tên nằm Ở ĐÂY, không phải thêm một nhánh vào
    service — service đã đọc đúng hình dạng mà cả dự án dùng.

    `correct: False` KHÔNG được phát ra: `findIndex(o => o.correct === true)`
    chạy đúng khi lựa chọn sai không có khoá đó, và bỏ nó đi thì
    `content_json` nhỏ hơn 1 032 khoá.
    """
    # Câu hỏng thì BỎ, không phát ra nửa vời: một câu không có đáp án đúng nào
    # làm `correctIndex()` trả -1, và màn trắc nghiệm thành màn không bao giờ
    # đúng được — `firstUnfinished()` chặn luôn nút kết thúc bài.
    chon = [q for q in [mcq] + list(mcq.get('variants') or [])[:so_cau - 1]
            if len(q.get('options') or []) >= 2
            and q.get('correctOption') in {o.get('id') for o in (q.get('options') or [])}]
    # Trộn TRƯỚC khi quy về `correct: True`, và trộn trên DANH SÁCH ĐÃ LỌC: phân
    # tầng chia đều trên số câu THẬT SỰ phát ra, nên một bài mất một câu hỏng
    # vẫn rải đều hai câu còn lại.
    chon = tron_vi_tri_dap_an(ma_bai, chon)
    ra: list[dict] = []
    for q in chon:
        lua_chon = q.get('options') or []
        dung = q.get('correctOption')
        # GẤP `code` của nguồn vào CHÍNH đề bài.
        #
        # Bản dựng đầu BỎ trường này, và đó là một lỗi có thật đã tới tay người
        # học: đo trên bản dựng 28/10 — **214/516 câu đang phát mất đoạn code
        # quyết định đáp án, và 90 câu ở 45 bài thì ĐỀ BÀI CÒN TRỎ TỚI nó**, nên
        # chúng không trả lời được. Ví dụ nguyên văn PY01 — bài ĐẦU TIÊN của
        # khoá: "Buổi sáng bán 10 cốc, chiều bán 7 cốc. Kết quả ở lệnh print
        # cuối có giá trị nào?" và không có lệnh print nào trên màn hình. VZ20
        # thì có HAI câu trùng nhau từng ký tự, vì thứ duy nhất phân biệt chúng
        # là `code`.
        #
        # Không ngoại lệ nào được ném và không log nào đỏ — đúng họ bẫy "lệch
        # IM LẶNG" mà mục kho quiz trong AGENTS.md đã ghi. Thứ bắt được nó là
        # `kiem_trac_nghiem()` trong check.py, nay có luật cho chuyện này.
        #
        # Loại bỏ câu có `code` KHÔNG phải lựa chọn: đo thử thì 44/172 bài mất
        # SẠCH câu và 62 bài còn đúng 1 câu.
        #
        # Vì sao gấp vào `question` chứ không thêm một trường mới: hình dạng này
        # đi qua `normalizeQuestion` ở backend để vào kho quiz chấm Ở SERVER, mà
        # hàm đó chỉ đọc `question`/`options`/`explanation` — một trường mới sẽ
        # bị BỎ ÂM THẦM ở đúng con đường chấm duy nhất client không giả mạo
        # được. Gấp vào thì cả hai kho (trong bài và hậu kiểm) tự đủ, không nơi
        # nào phải đổi.
        #
        # Mốc nối phải khớp với `tachDeVaCode()` ở frontend — xem hằng đó.
        de = (q.get('prompt') or '').rstrip()
        code = (q.get('code') or '').strip()
        if code:
            de = f'{de}{NOI_DE_CODE}{code}'
        ra.append({
            'question': de,
            'options': [
                {'text': o.get('text') or '',
                 **({'detail': o['feedback']} if o.get('feedback') else {}),
                 **({'correct': True} if o.get('id') == dung else {})}
                for o in lua_chon
            ],
            **({'explanation': q['explanation']} if q.get('explanation') else {}),
        })
    return ra


def bai_tap_cua(bai_tap: dict, mode: str = 'pyodide',
                ly_do_doc: str = '') -> tuple[dict | None, str]:
    """(step_4 cho bài tập được chấm, lý do nếu không chấm được).

    Hai thứ quyết định chấm được hay không, và CHỈ hai thứ này:
      · lời giải tham khảo có chạy trong Pyodide không (`phan_loai_khoi` — dùng
        lại NGUYÊN hàm đã phân loại code bài đọc, không viết luật thứ hai, chỉ
        bật `cho_mo_phong`);
      · khung đề có chạy không (starter `pass` thì luôn chạy, nhưng bài nào
        starter đã import thư viện thiếu thì cũng tắc ngay lần Chạy đầu).

    Chạy không được thì trả (None, lý do) và bài giữ ô chạy thử như trước. 11
    bài rơi vào đây: seaborn (VZ16-19), plotly (VZ20-22), ipywidgets (VZ23),
    openpyxl (PD13), h5py (SY23), sqlalchemy (SY24) — Pyodide 314 không có
    wheel cho chúng, nên chấm trong trình duyệt là không thể, không phải chưa
    làm.

    `cho_mo_phong=True` mới là chỗ cổng này KHÁC cổng bài đọc, và khác có lý:
    bản dựng đầu dùng cổng nghiêm của bài đọc rồi chặn thêm 9 bài
    (CT07-13, EX04, EX06) vì `threading`/`subprocess`. Nhưng harness MÔ PHỎNG
    đúng hai thứ đó — nó tồn tại để pe-v4 dạy được chúng — và
    `check-practice.mjs` đã chạy thật 9 lời giải ấy: đạt hết ca. Bài ĐỌC phải
    nghiêm hơn vì nó so đầu ra với dòng "Kết quả:" tác giả ghi, mà mô phỏng thì
    in khác bản thật ở chi tiết (PID, thứ tự thread). Bài TẬP không so đầu ra:
    ca chấm hỏi giá trị trả về, nên mô phỏng là đủ.

    Nếu cổng này nới quá tay thì `check-practice.mjs` ĐỎ — nó chạy đúng những
    bài tập build phát ra, nên không có đường nào cho một bài tập không chạy
    được lọt vào bản dựng mà vẫn xanh.
    """
    loi_giai = bai_tap.get('referenceSolution') or ''
    chay, ly_do = phan_loai_khoi(loi_giai, cho_mo_phong=True)
    if not chay:
        return None, ly_do
    khung = bai_tap.get('starter') or ''
    chay_khung, ly_do_khung = phan_loai_khoi(khung, cho_mo_phong=True)
    if not chay_khung:
        return None, ly_do_khung

    hop_dong = {k: bai_tap[k] for k in
                ('mode', 'inputVariable', 'resultVariable', 'returnType')
                if bai_tap.get(k)}
    # Chỉ giữ hợp đồng khi nó NÓI điều gì: bài `solve(data)` thuần thì mọi
    # trường đều mặc định, và một dict rỗng trong content_json chỉ làm người đọc
    # tưởng có luật riêng.
    ra: dict = {
        'task': {
            'title': bai_tap.get('title') or 'Thử thách độc lập',
            'body': bai_tap.get('prompt') or '',
        },
        'starterCode': khung if khung.endswith('\n') else khung + '\n',
        'solutionCode': loi_giai,
        # Phân nhánh theo TRƯỜNG CÓ MẶT, y như studio-harness.py và
        # check-practice.mjs: ca hợp đồng BIỂU THỨC phải đi qua NGUYÊN VẸN.
        # Chuẩn hoá tất cả về {name,input,expected} là biến call/expect
        # thành input=None — lời giải đúng ném lỗi, lời giải tầm thường trả
        # None và khớp expected=None. Đảo ngược đúng/sai, gặp 30/10/2026 ở
        # SY20: ca đó phải là biểu thức vì nó cần một byte NUL, mà Postgres
        # jsonb không lưu được NUL trong dữ liệu.
        'tests': [
            ({'name': t['name'], 'call': t['call'], 'expect': t['expect']}
             if 'call' in t else
             {'name': t['name'], 'input': t.get('input'),
              'expected': t.get('expected')})
            for t in bai_tap.get('tests') or []
        ],
    }
    if hop_dong:
        ra['contract'] = hop_dong
    goi_y = [g for g in bai_tap.get('hints') or [] if g]
    if goi_y:
        ra['hints'] = [{'title': f'Gợi ý {i + 1}', 'body': g}
                       for i, g in enumerate(goi_y)]
    goi = goi_can_tai([loi_giai, khung])
    if goi:
        ra['packages'] = goi
    if mode != 'pyodide' and ly_do_doc:
        # Bài tập chấm được NGAY ĐÂY nhưng code của BÀI ĐỌC thì không chạy được
        # trong trình duyệt (CT10/CT11 dùng `subprocess`). Bản trước bỏ trống
        # chỗ này và hệ quả thấy được: nhánh `local` của `dung_sandbox` vốn in
        # cả một danh sách bước "mở terminal, tạo venv, chạy file" — thay step_4
        # bằng bài tập là hướng dẫn đó MẤT HẲN, và học viên không còn chỗ nào
        # biết phải làm gì với code trong bài. `check.py` chặn đúng chỗ này.
        ra['env'] = (f'Bài tập dưới đây chấm được ngay trong trình duyệt. Nhưng code '
                     f'trong phần bài đọc thì không: {ly_do_doc}. Muốn chạy lại các '
                     f'đoạn đó thì mở Python trên máy.')
    return ra, ''


def goi_can_tai(codes: list[str]) -> list[str]:
    can: set[str] = set()
    for code in codes:
        mods, _, _ = modules_cua(code)
        for m in mods:
            ten = VENDORED.get(m)
            if ten:
                can.add(ten)
        for dau_hieu, goi in GOI_AN:
            if any(d in code for d in dau_hieu):
                can.add(goi)
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


def khoi_doc(khoi: dict, thu_duoc: dict[int, bool] | None = None,
             so_do: dict[int, dict] | None = None,
             vet: dict[int, dict] | None = None) -> list[dict]:
    """Chuyển một khối nguồn sang các ReadBlock renderer hiểu được.

    `thu_duoc` khoá theo `id()` của chính dict nguồn, nói khối code này có chạy
    được trong Pyodide hay không — để renderer biết có dựng nút "Thử ngay trong
    IDE" (kiểu "Try it Yourself") dưới nó hay không. Phép phân loại nằm ở khâu
    BUILD, không ở frontend, vì chỉ ở đây mới có `modules_cua` (phân tích AST),
    `THIEU_WHEEL`, `GOI_AN`, `CHUOI_GOI_THU_VIEN`, `THUOC_TINH_MAY` và
    `LECH_PHIEN_BAN`. Cổng cũ `chayDuocTrongIde` ở frontend chỉ là một regex
    trên dòng `import` và nó KHÔNG biết seaborn/plotly/openpyxl thiếu wheel —
    đúng những thứ chặn bài của khoá này.

    `so_do` khoá theo cùng `id()` đó, nói khối này có một SƠ ĐỒ đi kèm hay
    không (xem SO_DO_DOC). Dùng lại đúng cơ chế của `thu_duoc` chứ không thêm
    cách thứ hai: hai cách định vị khối là hai cách sẽ lệch nhau.

    `vet` cũng khoá theo cùng `id()` — BẢNG TỪNG BƯỚC tính sẵn của khối, đọc từ
    traces.json. Đi vào CHÍNH khối `code` (không thành một loại khối riêng) vì
    bảng gắn với đúng một đoạn mã: nút "Xem từng bước" đứng trong chân của khối
    đó, và số dòng trong bảng là số dòng của `code` ngay trên. Một loại khối
    riêng là một thứ nữa có thể trôi lệch khỏi khối nó nói về.
    """
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
    # Chỉ phát khi ĐÚNG, không phát `tryIt: False`: renderer đọc bằng
    # `block.tryIt ?` nên khối không có khoá cũng là không có nút, mà
    # content_json thì nhẹ hơn 406 khoá.
    if loai == 'code' and thu_duoc is not None and thu_duoc.get(id(khoi)):
        ra['tryIt'] = True
    v = (vet or {}).get(id(khoi))
    if loai == 'code' and v:
        ra['trace'] = v
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
    # Sơ đồ đứng SAU cả code lẫn hình: nó gộp lại điều đoạn code vừa chứng
    # minh, nên đọc nó trước khi đọc code là đọc đáp án trước đề.
    sd = (so_do or {}).get(id(khoi))
    if sd:
        khoi_ra.append({'type': 'diagram', 'title': sd['title'],
                        'lanes': [dict(l) for l in sd['lanes']]})
    return khoi_ra


def bam_code(chay_duoc: list[str]) -> str:
    """Dấu ấn của CHƯƠNG TRÌNH ĐÃ NỐI mà vết được sinh từ đó.

    Phải tính trên `noi_code(chay_duoc)` — đúng chuỗi gen_traces.py đưa cho
    tracer — chứ không trên từng khối rời: vết của khối 3 phụ thuộc vào khối 1
    (đoạn sau dùng biến và import của đoạn trước), nên một thay đổi ở khối 1
    làm vết của khối 3 sai mà hash của riêng khối 3 không đổi.
    """
    return hashlib.sha256(noi_code(chay_duoc).encode('utf-8')).hexdigest()[:16]


def vet_cua_bai(ma_bai: str, module_so: int, khoi_code: list[dict],
                phan_loai: list[tuple[bool, str]], chay_duoc: list[str],
                vet_bai: dict | None,
                bo_qua: set[int] | None = None) -> tuple[dict[int, dict], dict]:
    """({id(khối) -> vết}, báo cáo đối chiếu). KHÔNG tự chạy tracer.

    `bo_qua` = chỉ số các khối KHÔNG được ghi vết: hôm nay là các khối đọc file
    dữ liệu (KHOI_DU_LIEU). Không phải để cho tiện — `gen_traces.py` chạy tracer
    bằng CPython trên máy, trong một thư mục tạm KHÔNG có file dữ liệu nào, nên
    "bảng từng bước" của một khối `pd.read_csv('mon.csv')` sẽ là một
    FileNotFoundError. Giữ chúng ngoài cũng giữ `codeHash` của 128 bài đã sinh
    vết không đổi, tức thêm một khối dữ liệu không bắt sinh lại vết cả khoá.

    CỔNG CHỐNG "BUILT BUT UNREACHABLE". Repo này đã dính bốn lần (bộ ghi vết
    không bài nào tới, nút "Try it Yourself" không màn nào mount, 13 màn tối,
    kho quiz rỗng), và mỗi lần nó im lặng: tính năng có mã, có test, không có
    người dùng. Nên ở đây mọi lệch đều là LỖI chứ không phải cảnh báo, và
    `main()` trả 1 khi có lỗi:

      · bài ở module ≥ 2 có khối chạy được mà traces.json KHÔNG có mục → vết
        chưa sinh (hoặc sinh rồi mà quên commit);
      · bài ở module 1, hoặc bài không có khối nào chạy được, mà traces.json
        LẠI có mục → mục mồ côi, nó sẽ không bao giờ được phát ra;
      · `codeHash` lệch → nguồn đã sửa code sau khi vết được sinh. Đây là lệch
        NGUY HIỂM NHẤT vì nó hỏng im lặng: bảng vẫn mở ra, vẫn đẹp, và dạy sai
        một đoạn code không còn tồn tại. Cùng họ với luật "sơ đồ đã trôi khỏi
        bài" của `kiem_so_do`;
      · thiếu/thừa khoá khối → lệch chỉ số, tức bảng của đoạn 2 nằm dưới đoạn 3.
    """
    bo_qua = bo_qua or set()
    du = [i for i, (ok, _) in enumerate(phan_loai) if ok and i not in bo_qua]
    co_quyen = module_so >= MODULE_DAU_TIEN_CO_VET and bool(du)
    bao_cao: dict = {'can': len(du) if co_quyen else 0, 'co': 0, 'bo': 0, 'loi': []}
    if not co_quyen:
        if vet_bai:
            bao_cao['loi'].append(
                f'{ma_bai}: traces.json có mục nhưng bài này không được có vết '
                f'(module {module_so}, {len(du)} khối chạy được) — mục mồ côi')
        return {}, bao_cao
    if not vet_bai:
        bao_cao['loi'].append(
            f'{ma_bai}: {len(du)} khối đủ điều kiện nhưng traces.json không có '
            f'mục nào — chạy `py scripts/pe-da/gen_traces.py`')
        return {}, bao_cao
    if vet_bai.get('codeHash') != bam_code(chay_duoc):
        bao_cao['loi'].append(
            f'{ma_bai}: code của bài đã đổi sau khi sinh vết (codeHash lệch) — '
            f'chạy `py scripts/pe-da/gen_traces.py --only={ma_bai}`')
        return {}, bao_cao
    khoi = vet_bai.get('blocks') or {}
    if set(khoi) != {str(i) for i in du}:
        bao_cao['loi'].append(
            f'{ma_bai}: traces.json khai các khối {sorted(khoi)} nhưng khối đủ '
            f'điều kiện là {[str(i) for i in du]} — lệch chỉ số khối')
        return {}, bao_cao
    ra: dict[int, dict] = {}
    for i in du:
        m = khoi[str(i)]
        if 'skip' in m:
            bao_cao['bo'] += 1
            continue
        if not m.get('predict') or not m.get('rows'):
            bao_cao['loi'].append(
                f'{ma_bai}: vết của khối {i} thiếu câu dự đoán hoặc thiếu dòng '
                f'bảng — xem gen_traces.py, nó phải BỎ QUA thay vì phát vết rỗng')
            continue
        ra[id(khoi_code[i])] = m
        bao_cao['co'] += 1
    return ra, bao_cao


# ---------------------------------------------------------------------------
# Thời lượng và XP
#
# Nguồn KHÔNG ghi thời lượng. Ước bằng khối lượng thật của bài, và ghi rõ công
# thức ở đây để con số trong danh mục có chỗ kiểm lại — mốc "~48 giờ" sai của
# bản trước sinh ra đúng từ việc không ai viết công thức xuống.
# ---------------------------------------------------------------------------

def phut_cua(reading: list[dict], so_cau: int, so_mcq: int = 0) -> int:
    tu = sum(len(k['text'].split()) for k in reading if k['type'] == 'paragraph')
    dong_code = sum(len(k['code'].splitlines()) for k in reading if k['type'] == 'code')
    # Trắc nghiệm tính 1 phút/câu, nhẹ hơn câu luyện tập (1,5) vì nó là chọn một
    # trong ba chứ không phải tự viết. Phải CÓ trong công thức: thêm 3 màn vào
    # mỗi bài mà vẫn báo đúng số phút cũ thì con số trên trang khoá học nói sai,
    # và đó là con số người học dùng để quyết định có bắt đầu hay không.
    phut = tu / 160 + dong_code / 6 + so_cau * 1.5 + so_mcq
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
             ten_theo_id: dict[str, str], bai_tap: dict | None = None,
             mcq: dict | None = None, vet_bai: dict | None = None) -> dict:
    # Khối đọc file dữ liệu được CHÈN VÀO CUỐI phần đọc (xem KHOI_DU_LIEU).
    # Danh sách mới, không sửa `bai['reading']` tại chỗ: nguồn được đọc một lần
    # và dùng cho cả báo cáo đối chiếu, nên làm bẩn nó là làm lệch phép so.
    reading = bai['reading']
    khai_du_lieu = KHOI_DU_LIEU.get(bai['id'])
    # id() của các khối cần file dữ liệu — cùng cơ chế định vị khối mà
    # `thu_duoc`/`so_do`/`vet` đang dùng, không thêm cách thứ hai.
    can_du_lieu: set[int] = set()
    if khai_du_lieu:
        khoi_moi = {'type': 'code', 'code': khai_du_lieu['code'],
                    'expected': khai_du_lieu['expected']}
        can_du_lieu.add(id(khoi_moi))
        reading = reading + [
            {'type': 'paragraph', 'text': khai_du_lieu['paragraph']},
            khoi_moi,
        ]
    man = chia_man(reading)
    luyen = cau_luyen(bai)
    trac_nghiem = cau_trac_nghiem(mcq, bai['id']) if mcq else []
    phut = phut_cua(reading, len(luyen), len(trac_nghiem))

    # Phân loại theo code NGƯỜI HỌC đọc, không theo bản xuất hình: hai bản
    # import khác nhau (bản xuất hình thêm matplotlib.use/pathlib/tempfile).
    ma_bai = bai['id']
    khoi_code = [k for k in reading
                 if k['type'] == 'code' and not la_lenh_terminal(k)]
    codes = [code_hoc_vien(k)[0] for k in khoi_code]
    so_lenh_terminal = sum(1 for k in reading
                           if k['type'] == 'code' and la_lenh_terminal(k))
    phan_loai = []
    for i, c in enumerate(codes):
        lech = LECH_PHIEN_BAN.get((ma_bai, i))
        phan_loai.append((False, lech) if lech else phan_loai_khoi(c))
    chay_duoc = [c for c, (ok, _) in zip(codes, phan_loai) if ok]
    chan = [(i, ly_do) for i, (ok, ly_do) in enumerate(phan_loai) if not ok]
    # Chỉ số các khối CẦN FILE DỮ LIỆU, tính trên cùng `khoi_code` mà `_blocked`
    # đếm trên — để check.py đối chiếu được bằng một con số, không phải bằng id().
    chi_so_du_lieu = [i for i, k in enumerate(khoi_code) if id(k) in can_du_lieu]

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

    # `chia_man` chia lại CHÍNH các dict trong `reading` (không chép), nên khoá
    # theo id() còn đúng tới hết hàm. Phép phân loại đã tính ở `phan_loai` ngay
    # trên — ở đây chỉ nối nó tới từng khối.
    #
    # NÚT "THỬ NGAY TRONG IDE" TẮT TỪ KHỐI DỮ LIỆU TRỞ ĐI. /ide chưa có cơ chế
    # nạp file dữ liệu, nên bàn giao một đoạn `pd.read_csv('mon.csv')` sang đó
    # là mở tab mới để người học đọc `FileNotFoundError` — đúng cái nút này ra
    # đời để tránh. Và vì mã bàn giao là TIỀN TỐ (`maDeThu` gộp mọi khối tryIt
    # từ đầu bài tới khối được bấm), một khối cần dữ liệu làm mọi khối SAU nó
    # cũng không bàn giao được: thiếu đúng dòng đọc file trong tiền tố.
    dau_du_lieu = min(chi_so_du_lieu) if chi_so_du_lieu else len(khoi_code)
    thu_duoc = {id(k): ok and i < dau_du_lieu
                for i, (k, (ok, _)) in enumerate(zip(khoi_code, phan_loai))}
    # Sơ đồ DOM của màn đọc, khoá theo cùng id() — xem SO_DO_DOC để biết vì sao
    # bảng nằm trong build.py chứ không thành trường mới của course.json.
    so_do = {id(k): SO_DO_DOC[(ma_bai, i)]
             for i, k in enumerate(khoi_code) if (ma_bai, i) in SO_DO_DOC}
    # `chay_duoc` cho vết KHÔNG gồm khối dữ liệu: chương trình gen_traces.py đã
    # ghi vết là chương trình KHÔNG có chúng, nên `codeHash` phải tính trên
    # đúng chuỗi đó (xem `bo_qua` trong vet_cua_bai).
    chay_duoc_vet = [c for i, (c, (ok, _)) in enumerate(zip(codes, phan_loai))
                     if ok and i not in set(chi_so_du_lieu)]
    vet, vet_bao_cao = vet_cua_bai(ma_bai, module_so, khoi_code, phan_loai,
                                   chay_duoc_vet, vet_bai, set(chi_so_du_lieu))
    step_1: dict = {
        'read': [[r for k in lat for r in khoi_doc(k, thu_duoc, so_do, vet)]
                 for lat in man],
    }
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
    # Trắc nghiệm đứng TRƯỚC câu luyện tập trong step_2, và `buildScreens` phát
    # màn theo đúng thứ tự đó: phần ĐƯỢC CHẤM làm trước, phần tự viết (không
    # chấm) làm sau. Thứ tự này đã có trong buildScreens từ trước, ở đây chỉ là
    # không phá nó.
    if trac_nghiem or luyen:
        noi_dung['step_2'] = {}
        if trac_nghiem:
            noi_dung['step_2']['mcq'] = trac_nghiem
        if luyen:
            noi_dung['step_2']['practice'] = luyen
    # BÀI TẬP ĐƯỢC CHẤM đứng TRƯỚC ô chạy thử, không đứng cạnh.
    #
    # Mọi đoạn code của bài đã hiện kèm kết quả ở màn đọc, và muốn thử tự do
    # thì có /ide — nên chỗ `step_4` đáng dành cho thứ duy nhất màn đọc không
    # làm được: chấm xem học viên viết đúng chưa. Đổi lại, 127 bài mất ô "sửa
    # số liệu rồi chạy lại"; đó là trao đổi có chủ đích, không phải bỏ sót.
    ly_do_bt = ''
    if bai_tap:
        s4, ly_do_bt = bai_tap_cua(bai_tap, mode, ly_do_bai)
        if s4:
            noi_dung['step_4'] = s4
    if 'step_4' not in noi_dung:
        noi_dung['step_4'] = dung_sandbox(mode, ly_do_bai, chay_duoc, chan)

    # FILE DỮ LIỆU: khai ở cấp bài, cạnh `packages`, vì cùng một ý nghĩa —
    # "mọi lần chạy Python của bài này có sẵn thứ này trong thư mục làm việc".
    #
    # Bài có BÀI TẬP ĐƯỢC CHẤM cũng khai được, từ 29/10. Trước đó khâu này
    # `raise SystemExit` vì `check-practice.mjs` chưa có nhánh nạp file: một
    # bài tập được chấm mà đọc file dữ liệu sẽ trượt hết ca ở CI bằng
    # FileNotFoundError. Nay bộ chấm đó đọc thẳng file từ đĩa (cùng hàm
    # `fileDuLieu` mà check-pyodide.mjs dùng) và có hẳn một pha canh việc file
    # tới được mã học viên ở MỌI lần chạy, nên cổng cấm mất lý do tồn tại.
    if khai_du_lieu:
        noi_dung['step_4']['dataFiles'] = list(khai_du_lieu['files'])

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
        # Không vào DB — khối nào CẦN FILE DỮ LIỆU (chỉ số trên cùng dãy khối
        # code mà `_blocked` đếm trên) và bài khai những file nào. check.py đối
        # chiếu cả hai với đĩa và với cờ `tryIt`. CHỈ phát ở bài có khai: một
        # khoá `null` ở 171 bài còn lại chỉ làm bản dựng nặng thêm và làm diff
        # của mọi lần dựng sau này lớn hơn chính thay đổi của nó.
        **({'_du_lieu': {'files': list(khai_du_lieu['files']),
                         'blocks': chi_so_du_lieu}} if khai_du_lieu else {}),
        # Không vào DB — chỉ để check.py và báo cáo đối chiếu.
        '_so_mcq': len(trac_nghiem),
        # '_bai_tap' nói bài này có bài tập được chấm hay không, và vì sao
        # không — để check.py và báo cáo đối chiếu được, thay vì phải suy từ
        # việc step_4 có `tests` hay không.
        '_bai_tap': ('cham' if noi_dung['step_4'].get('tests')
                     else (f'khong: {ly_do_bt}' if ly_do_bt else 'khong co')),
        # Không vào DB — đối chiếu "bao nhiêu khối đủ điều kiện / bao nhiêu có
        # bảng từng bước", cho cổng ở main() và cho check.py.
        '_vet': vet_bao_cao,
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
    # Bài tập tự làm, tra theo MÃ BÀI. Lấy bài tập CUỐI khi một bài có nhiều —
    # gói xếp chúng theo độ khó tăng dần, nên cái cuối là bài chuyển giao
    # (`transferNote`), đúng thứ thuộc về "Thử thách độc lập".
    bai_tap_theo_ma: dict[str, dict] = {}
    mcq_theo_ma: dict[str, dict] = {}
    if PRACTICE.is_file():
        for l in json.loads(PRACTICE.read_text(encoding='utf-8'))['lessons']:
            if l.get('exercises'):
                bai_tap_theo_ma[l['id']] = l['exercises'][-1]
            # Câu trắc nghiệm: lấy hoạt động mcq ĐẦU TIÊN của bài (mỗi bài có
            # đúng một, mang 5 biến thể bên trong).
            for a in l.get('mcq') or []:
                mcq_theo_ma[l['id']] = a
                break
    ten_theo_id = {b['id']: f'{b["id"]} · {b["title"]}' for b in du_lieu['lessons']}
    vet_theo_ma = nap_vet()

    bai_ra: list[dict] = []
    modules: list[dict] = []
    thu_tu = 0
    for so, nhom in enumerate(du_lieu['groups'], 1):
        ten_module = f'M{so} · {nhom["title"]}'
        trong_module = []
        for ma in nhom['ids']:
            thu_tu += 1
            b = dung_bai(bai_theo_id[ma], thu_tu, so, ten_module, ten_theo_id,
                         bai_tap_theo_ma.get(ma), mcq_theo_ma.get(ma),
                         vet_theo_ma.get(ma))
            bai_ra.append(b)
            trong_module.append(b['title'])
        modules.append({'title': ten_module, 'lessons': trong_module})

    # Mỗi khoá của SO_DO_DOC phải TRÚNG một khối thật. Gõ sai mã bài hay lệch
    # chỉ số khối thì sơ đồ lặng lẽ không được phát ra — và một sơ đồ không ai
    # thấy thì không có log nào đỏ, đúng kiểu lỗi mà AGENTS.md gọi là "built
    # but unreachable".
    so_do_phat = sum(1 for b in bai_ra
                     for lat in b['content_json']['step_1']['read']
                     for k in lat if k['type'] == 'diagram')
    if so_do_phat != len(SO_DO_DOC):
        print(f'LỖI: SO_DO_DOC khai {len(SO_DO_DOC)} sơ đồ nhưng phát ra '
              f'{so_do_phat} — có khoá không trúng khối code nào '
              f'(mã bài sai, hoặc chỉ số khối lệch).')
        return 1

    # FILE DỮ LIỆU: mọi khai báo phải TRÚNG một file có thật trong thư mục được
    # phục vụ, và mọi bài khai trong KHOI_DU_LIEU phải phát ra được khai báo đó.
    #
    # Vì sao là LỖI chứ không cảnh báo: khai một tên file không có trên đĩa thì
    # worker nhận 404, và cả bài chết ở lần bấm Chạy đầu với một câu lỗi hạ tầng
    # — thứ không ai gỡ được từ phía người học. Và đây là chỗ DUY NHẤT trong
    # khâu dựng còn nhìn thấy đĩa: schema ở backend phải mang bản literal vì nó
    # chạy ở nơi không có frontend/public.
    phat_du_lieu = {b['lesson_code']: b['content_json']['step_4'].get('dataFiles')
                    for b in bai_ra if b['content_json']['step_4'].get('dataFiles')}
    if set(phat_du_lieu) != set(KHOI_DU_LIEU):
        print(f'LỖI: KHOI_DU_LIEU khai {sorted(KHOI_DU_LIEU)} nhưng bản dựng '
              f'phát khai báo file cho {sorted(phat_du_lieu)} — mã bài sai.')
        return 1
    for ma_bai, ten_files in sorted(phat_du_lieu.items()):
        for ten in ten_files:
            if not TEN_FILE_DU_LIEU.match(ten):
                print(f'LỖI: {ma_bai} khai file dữ liệu "{ten}" — tên phải khớp '
                      f'{TEN_FILE_DU_LIEU.pattern} (tên trơn, chữ thường, .csv).')
                return 1
            if not (DU_LIEU_DICH / ten).is_file():
                print(f'LỖI: {ma_bai} khai file dữ liệu "{ten}" nhưng '
                      f'{DU_LIEU_DICH / ten} không có — worker sẽ nhận 404 '
                      f'({DU_LIEU_URL}{ten}).')
                return 1

    # BẢNG TỪNG BƯỚC: số vết PHÁT RA phải bằng số khối đủ điều kiện trừ số khối
    # khâu sinh đã bỏ qua. Đây là cổng chống "built but unreachable" — xem
    # `vet_cua_bai` để biết từng loại lệch nó chặn. Mọi lệch là LỖI, không phải
    # cảnh báo: một bảng không ai thấy, hay một bảng dạy đoạn code đã bị sửa,
    # đều không ném ngoại lệ nào.
    loi_vet = [m for b in bai_ra for m in b['_vet']['loi']]
    vet_can = sum(b['_vet']['can'] for b in bai_ra)
    vet_bo = sum(b['_vet']['bo'] for b in bai_ra)
    vet_co = sum(b['_vet']['co'] for b in bai_ra)
    vet_phat = sum(1 for b in bai_ra
                   for lat in b['content_json']['step_1']['read']
                   for k in lat if k.get('trace'))
    mo_ta_vet = (f'bảng từng bước: {vet_co} vết / {vet_can} khối đủ điều kiện '
                 f'({vet_bo} khối khâu sinh bỏ qua)')
    print(mo_ta_vet)
    if loi_vet or vet_phat != vet_co or vet_co + vet_bo != vet_can:
        for m in loi_vet[:20]:
            print(f'LỖI: {m}', file=sys.stderr)
        if len(loi_vet) > 20:
            print(f'… và {len(loi_vet) - 20} lỗi nữa', file=sys.stderr)
        if vet_phat != vet_co:
            print(f'LỖI: đếm được {vet_co} vết nhưng phát ra {vet_phat} khối có '
                  f'`trace` — bản đồ id() lệch', file=sys.stderr)
        if vet_co + vet_bo != vet_can:
            print(f'LỖI: {vet_co} + {vet_bo} ≠ {vet_can} khối đủ điều kiện',
                  file=sys.stderr)
        return 1

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
            'Tkinter: từ form nhỏ tới màn hình nhận đơn tại quầy',
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
