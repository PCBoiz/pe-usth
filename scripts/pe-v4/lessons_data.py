"""Khoá Python Advanced (pe-v4) — M4 "Nhập dữ liệu, SQL và tra cứu" (X01–X03) và M5 "NumPy" (N01–N06).

Nguồn: python-learning-data.json (bài X01, X02, X03, N01–N06: points, examples, exercise) và
python-knowledge-handbook.pdf trang 90–111. Mọi đoạn code chạy được trên Python 3.12 + numpy 2.0.2 +
pandas 2.2.3 — đúng phiên bản Pyodide 0.27.7 của trình duyệt.

Ba điều phải nhớ khi sửa file này:

* Bộ chấm so `actual == expected` rồi lấy bool(...). Array NumPy so với list cho ra ARRAY, bool() của
  nó nổ "truth value is ambiguous" — học viên sẽ thấy một lỗi khó hiểu thay vì "mong đợi X nhận Y".
  Nên ca chấm luôn đổi kết quả về giá trị Python thuần (R1/R2 bên dưới, .tolist(), int(...)).
* Số nguyên mặc định của numpy trong trình duyệt là int32 (wasm32), trên máy 64-bit là int64. Không ca
  nào được so dtype số nguyên hay in dtype vào kết quả mong đợi.
* Pyodide 0.27.7 KHÔNG có openpyxl trong bộ gói (pyodide-lock.json chỉ có xlrd cho .xls cũ), nhưng có
  h5py và scipy. X02 vì vậy chấm phần Stata (pandas thuần) và phần chọn thư viện theo đuôi file; Excel,
  HDF5, MATLAB học qua giải thích và trắc nghiệm. Đừng thêm ca chấm cần openpyxl khi hạ tầng chưa tải
  được nó — bài sẽ chết với mọi học viên.
"""
from authoring import T, TX, out, run  # noqa: F401  (giữ cùng bộ import với mọi file bài)

try:
    from authoring import DA_ENV, SQL_ENV
except ImportError:  # authoring.py của hạ tầng chưa có hằng môi trường
    DA_ENV = ('Bài này dùng numpy / pandas chạy ngay trong trình duyệt (Pyodide). Lần đầu mở bài, trình duyệt '
              'tải thêm thư viện (vài MB) nên chờ lâu hơn một chút. Chạy trên máy để so kết quả.')
    SQL_ENV = ('sqlite3 chạy thật trong trình duyệt (Pyodide): database ":memory:" hoặc file .db nằm trong thư '
               'mục tạm của lần chạy và mất khi chạy lại. Lần đầu dùng, trình duyệt tải thêm module sqlite3.')

# DA_ENV của authoring.py nói cả về biểu đồ (backend Agg, bộ chấm đọc tiêu đề/nhãn trục) — đúng cho bài
# matplotlib nhưng là chữ thừa, dễ gây hiểu lầm ở bài chỉ có numpy/pandas. Hai bài này không mô phỏng gì.
NP_ENV = ('Bài này chạy numpy THẬT ngay trong trình duyệt (Pyodide) — không có phần nào là mô phỏng. Lần đầu mở bài, '
          'trình duyệt tải thêm thư viện (vài MB) nên chờ lâu hơn một chút. Muốn chạy trên máy: pip install numpy.')
PD_ENV = ('Bài này chạy numpy và pandas THẬT ngay trong trình duyệt (Pyodide) — không có phần nào là mô phỏng. Lần đầu '
          'mở bài, trình duyệt tải thêm thư viện (vài MB) nên chờ lâu hơn một chút. Muốn chạy trên máy: '
          'pip install numpy pandas.')

INT_NOTE = (' Số nguyên mặc định của numpy trong trình duyệt là int32 (trên máy 64-bit thường là int64) — '
            'bộ chấm không phụ thuộc dtype đó.')

X02_ENV = ('Bài này chỉ nạp pandas trong trình duyệt (Pyodide): ghi/đọc Stata và CSV chạy thật. Excel cần thêm '
           'openpyxl, HDF5 cần h5py, file .mat cần scipy — phần đó học qua giải thích và trắc nghiệm; muốn thử '
           'trên máy: pip install openpyxl h5py scipy rồi chạy các dòng mẫu trong phần giải thích. Lần đầu mở bài, '
           'trình duyệt tải thêm thư viện nên chờ lâu hơn một chút.')


def R1(expr, nd=4):
    """Array/list 1 chiều → list float đã làm tròn (so được bằng ==)."""
    return f'[round(float(v), {nd}) for v in {expr}]'


def R2(expr, nd=4):
    """Array/list 2 chiều → list lồng float đã làm tròn."""
    return f'[[round(float(v), {nd}) for v in row] for row in {expr}]'


def I1(expr):
    return f'[int(v) for v in {expr}]'


# ---------------------------------------------------------------- file cấp sẵn

MARKS_CSV = '''# Bảng điểm lớp DA, xuất từ hệ thống cũ
name;class;mark
Mai;A;8.5
An;B;-
Binh;A;7
Chi;B;9
'''

READINGS_CSV = '''day,temp,humidity
1,30.5,70
2,,65
3,29.0,
4,31.5,72
'''

SUPPORT = {
    'marks.csv': MARKS_CSV,
    'readings.csv': READINGS_CSV,
}


# ================================================================ X01

X01_SOLUTION = r'''import pandas as pd


def load_marks(path):
    return pd.read_csv(path, sep=";", comment="#", na_values=["-"])


def schema(df):
    return {
        "rows": len(df),
        "columns": df.columns.tolist(),
        "missing": int(df["mark"].isna().sum()),
        "mean_mark": round(float(df["mark"].mean()), 2),
    }


df = load_marks("marks.csv")
print(df.head())
print(df.dtypes)
print(schema(df))
'''

X01_COLS = ['name', 'class', 'mark']
X01_T1 = '# a\n# b\nname;class;mark\nHoa;C;6\nLan;C;-\n'
X01_T2 = 'name;class;mark\nKa;A;10\nLy;A;7.5\n'

K_LOAD_MARKS = dict(sig='load_marks(path)', does='Đọc file điểm dùng dấu ";" ngăn cột, có dòng chú thích "#", ghi thiếu là "-".',
                    takes='path: str — đường dẫn file CSV', gives='DataFrame cột name, class, mark (mark là float64, ô "-" là NaN)',
                    effect='Không in gì.', call='load_marks("marks.csv") → DataFrame 4 dòng × 3 cột')
K_SCHEMA = dict(sig='schema(df)', does='Tóm tắt bảng vừa đọc để kiểm trước khi tính.',
                takes='df: DataFrame có cột mark', gives='dict rows, columns, missing, mean_mark (làm tròn 2 chữ số)',
                effect='Không sửa df.', call='schema(load_marks("marks.csv")) → {"rows": 4, …, "mean_mark": 8.17}')

# ================================================================ X02

X02_SOLUTION = r'''from pathlib import Path

import pandas as pd

READERS = {
    ".csv": "pd.read_csv",
    ".xlsx": "pd.read_excel",
    ".xls": "pd.read_excel",
    ".dta": "pd.read_stata",
    ".sas7bdat": "pd.read_sas",
    ".h5": "h5py.File",
    ".hdf5": "h5py.File",
    ".mat": "scipy.io.loadmat",
}


def reader_for(path):
    suffix = Path(path).suffix.lower()
    if suffix not in READERS:
        raise ValueError("unknown data format: " + path)
    return READERS[suffix]


def stata_roundtrip(df, path):
    df.to_stata(path, write_index=False)
    return pd.read_stata(path)


print(reader_for("Lab/Marks.XLSX"))
marks = pd.DataFrame({"name": ["Mai", "An"], "mark": [8.5, 9.0]})
print(stata_roundtrip(marks, "marks.dta"))
'''

X02_STARTER = r'''from pathlib import Path

import pandas as pd

# Đuôi file (chữ thường) → tên hàm/lớp dùng để đọc. Điền tiếp theo bảng trong đề.
READERS = {
    ".csv": "pd.read_csv",
}


def reader_for(path):
    pass


def stata_roundtrip(df, path):
    pass
'''

K_READER = dict(sig='reader_for(path)', does='Chọn hàm đọc phù hợp theo đuôi file.',
                takes='path: str — tên hoặc đường dẫn file', gives='str — tên hàm đọc, vd. "pd.read_excel"; đuôi lạ → ValueError',
                effect='Không mở file.', call='reader_for("Lab/Marks.XLSX") → "pd.read_excel"')
K_STATA = dict(sig='stata_roundtrip(df, path)', does='Ghi df ra file Stata (.dta) rồi đọc lại.',
               takes='df: DataFrame; path: str', gives='DataFrame đọc lại — đúng các cột của df, không thêm cột index',
               effect='Tạo/ghi đè file path.', call='stata_roundtrip(bảng name/mark, "m.dta") → cột ["name", "mark"]')


def df_lit(columns):
    return 'pd.DataFrame(' + repr(columns) + ')'


# ================================================================ X03

X03_ROWS = [('Mai', 'A', 8.5), ('An', 'B', 9.5), ('Binh', 'A', 8.0), ("O'Brien", 'B', 7.5)]
INJECT = "x' OR '1'='1"
OBRIEN = "O'Brien"

X03_HEAD = r'''import sqlite3

import pandas as pd


def make_db(rows):
    """Cấp sẵn: database trong RAM có bảng marks(name, class, mark)."""
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE marks (name TEXT, class TEXT, mark REAL)")
    conn.executemany("INSERT INTO marks VALUES (?, ?, ?)", rows)
    conn.commit()
    return conn

'''

X03_SOLUTION = X03_HEAD + r'''
def find_student(conn, name):
    sql = "SELECT name, class, mark FROM marks WHERE name = ?"
    return pd.read_sql_query(sql, conn, params=(name,))


def class_average(conn, class_name):
    row = conn.execute("SELECT AVG(mark) FROM marks WHERE class = ?", (class_name,)).fetchone()
    return row[0]


ROWS = [("Mai", "A", 8.5), ("An", "B", 9.5), ("Binh", "A", 8.0), ("O'Brien", "B", 7.5)]
conn = make_db(ROWS)
print(find_student(conn, "Mai"))
print(class_average(conn, "A"))
conn.close()
'''

X03_STARTER = X03_HEAD + r'''
def find_student(conn, name):
    pass


def class_average(conn, class_name):
    pass


ROWS = [("Mai", "A", 8.5), ("An", "B", 9.5), ("Binh", "A", 8.0), ("O'Brien", "B", 7.5)]
conn = make_db(ROWS)
# Gọi thử find_student(conn, "Mai") và class_average(conn, "A") rồi in kết quả.
'''

K_FIND = dict(sig='find_student(conn, name)', does='Lấy các dòng của bảng marks có đúng tên name.',
              takes='conn: kết nối sqlite3; name: str (có thể chứa dấu nháy)', gives='DataFrame cột name, class, mark (rỗng nếu không ai khớp)',
              effect='Chỉ đọc database.', call='find_student(conn, "Mai") → 1 dòng Mai, A, 8.5')
K_AVG = dict(sig='class_average(conn, class_name)', does='Tính AVG(mark) của một lớp ngay trong SQL.',
             takes='conn: kết nối sqlite3; class_name: str', gives='float; lớp không có ai → None',
             effect='Chỉ đọc database.', call='class_average(conn, "A") → 8.25')


def db(rows=None):
    return f'make_db({(rows or X03_ROWS)!r})'


# ================================================================ N01

N01_SOLUTION = r'''import numpy as np


def make_grid(n, n_cols):
    return np.arange(1, n + 1).reshape(-1, n_cols)


def describe(a):
    a = np.asarray(a)
    return {
        "shape": a.shape,
        "ndim": a.ndim,
        "size": a.size,
        "col_sums": a.sum(axis=0),
        "row_sums": a.sum(axis=1),
        "total": a.sum(),
    }


grid = make_grid(12, 4)
print(grid)
print(describe(grid))
'''

K_GRID = dict(sig='make_grid(n, n_cols)', does='Xếp các số 1..n thành array 2 chiều, mỗi hàng n_cols cột.',
              takes='n, n_cols: int dương', gives='ndarray shape (n // n_cols, n_cols); n không chia hết → ValueError',
              effect='Không in gì.', call='make_grid(12, 4) → shape (3, 4), hàng cuối [9, 10, 11, 12]')
K_DESCRIBE = dict(sig='describe(a)', does='Mô tả array 2 chiều và tổng theo từng axis.',
                  takes='a: ndarray hoặc list lồng nhau, 2 chiều', gives='dict shape, ndim, size, col_sums, row_sums, total',
                  effect='Không sửa a.', call='describe(make_grid(12, 4))["col_sums"] → [15, 18, 21, 24]')

# ================================================================ N02

N02_SOLUTION = r'''import numpy as np


def curve(scores, bonus):
    a = np.asarray(scores, dtype=float)
    valid = a[(a >= 0) & (a <= 10)]
    return np.clip(valid + bonus, 0, 10)


def grade_labels(scores, cutoff):
    a = np.asarray(scores)
    return np.where(a >= cutoff, "pass", "fail")


print(curve([3, 5, 8, 12], 0.5))
print(grade_labels([4, 6, 9], 5))
'''

K_CURVE = dict(sig='curve(scores, bonus)', does='Bỏ điểm ngoài 0..10, cộng thưởng rồi chặn trên ở 10.',
               takes='scores: list/array số; bonus: số', gives='ndarray float các điểm hợp lệ sau khi cộng (có thể rỗng)',
               effect='Không sửa scores.', call='curve([3, 5, 8, 12], 0.5) → [3.5, 5.5, 8.5]')
K_LABELS = dict(sig='grade_labels(scores, cutoff)', does='Gắn nhãn đạt/trượt cho từng điểm.',
                takes='scores: list/array số; cutoff: số', gives='ndarray chuỗi "pass" (≥ cutoff) hoặc "fail", cùng độ dài',
                effect='Không in gì.', call='grade_labels([4, 6, 9], 5) → ["fail", "pass", "pass"]')

# ================================================================ N03

N03_SOLUTION = r'''import numpy as np


def center_columns(a):
    a = np.asarray(a, dtype=float)
    mean = a.mean(axis=0, keepdims=True)
    return a - mean


def zscore_columns(a):
    a = np.asarray(a, dtype=float)
    std = a.std(axis=0, keepdims=True)
    safe = np.where(std == 0, 1, std)
    return (a - a.mean(axis=0, keepdims=True)) / safe


print(center_columns([[2, 20], [4, 40]]))
print(zscore_columns([[1, 5], [3, 5]]))
'''

K_CENTER = dict(sig='center_columns(a)', does='Trừ mean của từng cột khỏi cột đó.',
                takes='a: array/list 2 chiều', gives='ndarray float cùng shape; mỗi cột có mean 0',
                effect='Không sửa a.', call='center_columns([[2, 20], [4, 40]]) → [[-1, -10], [1, 10]]')
K_ZSCORE = dict(sig='zscore_columns(a)', does='Chuẩn hoá z-score theo cột: (x − mean) / std.',
                takes='a: array/list 2 chiều', gives='ndarray float cùng shape; cột hằng (std = 0) ra toàn 0',
                effect='Không sửa a.', call='zscore_columns([[1, 5], [3, 5]]) → [[-1, 0], [1, 0]]')

# ================================================================ N04

NAN = "float('nan')"

N04_SOLUTION = r'''import numpy as np


def nan_summary(values):
    a = np.asarray(values, dtype=float)
    return {
        "valid": int(np.isfinite(a).sum()),
        "mean": float(np.nanmean(a)),
        "median": float(np.nanmedian(a)),
    }


def weighted_gpa(marks, credits):
    m = np.asarray(marks, dtype=float)
    c = np.asarray(credits, dtype=float)
    ok = ~np.isnan(m)
    return float(np.average(m[ok], weights=c[ok]))


print(nan_summary([4, np.nan, 8, 10]))
print(weighted_gpa([7, 8, np.nan], [2, 3, 4]))
'''

K_NANSUM = dict(sig='nan_summary(values)', does='Đếm quan sát hợp lệ và tính mean/median bỏ qua NaN.',
                takes='values: list/array số, có thể có nan', gives='dict valid (int), mean (float), median (float)',
                effect='Không sửa values; không điền 0 vào ô thiếu.', call='nan_summary([4, nan, 8, 10]) → valid 3, mean 7.333…, median 8.0')
K_GPA = dict(sig='weighted_gpa(marks, credits)', does='Điểm trung bình có trọng số theo tín chỉ, bỏ môn thiếu điểm.',
             takes='marks: điểm (có thể nan); credits: tín chỉ, cùng độ dài', gives='float',
             effect='Không sửa đầu vào.', call='weighted_gpa([7, 8, nan], [2, 3, 4]) → 7.6')

# ================================================================ N05

N05_SOLUTION = r'''import numpy as np


def scaled_head(a, k, factor):
    head = a[:k].copy()
    head *= factor
    return head


def totals_match(parts, total):
    return bool(np.isclose(np.sum(parts), total))


prices = np.array([10, 20, 30])
print(scaled_head(prices, 2, 2), prices)
print(totals_match([0.1, 0.2], 0.3), 0.1 + 0.2 == 0.3)
'''

K_HEAD = dict(sig='scaled_head(a, k, factor)', does='Nhân k phần tử đầu của a với factor, trả array MỚI.',
              takes='a: ndarray; k: int ≥ 0; factor: số (cùng loại số với a)', gives='ndarray k phần tử, không dùng chung bộ nhớ với a',
              effect='KHÔNG sửa a của người gọi.', call='scaled_head(np.array([10, 20, 30]), 2, 2) → [20, 40]; a vẫn [10, 20, 30]')
K_TOTAL = dict(sig='totals_match(parts, total)', does='Kiểm tổng các phần có bằng total trong sai số cho phép.',
               takes='parts: list/array số thực; total: số', gives='bool',
               effect='Không in gì.', call='totals_match([0.1, 0.2], 0.3) → True')


def keeps(call_fmt, arr):
    """Ca "array gốc không đổi": gọi hàm trên array a rồi trả a.tolist()."""
    return f'(lambda a: ({call_fmt}, a.tolist())[1])(np.array({arr!r}))'


# ================================================================ N06

N06_SOLUTION = r'''import numpy as np


def load_readings(path):
    return np.genfromtxt(path, delimiter=",", skip_header=1, usecols=(1, 2))


def column_means(path):
    return np.nanmean(load_readings(path), axis=0)


def roll_dice(seed, n):
    rng = np.random.default_rng(seed)
    return rng.integers(1, 7, size=n)


print(load_readings("readings.csv"))
print(column_means("readings.csv"))
print(roll_dice(7, 5), roll_dice(7, 5))
'''

K_LOAD = dict(sig='load_readings(path)', does='Đọc hai cột temp, humidity của file CSV có tiêu đề và ô trống.',
              takes='path: str — CSV cột day,temp,humidity', gives='ndarray float shape (số dòng, 2); ô trống → nan',
              effect='Không in gì.', call='load_readings("readings.csv").shape → (4, 2)')
K_MEANS = dict(sig='column_means(path)', does='Mean từng cột, bỏ qua nan.',
               takes='path: str', gives='ndarray 2 phần tử [mean temp, mean humidity]',
               effect='Không in gì.', call='column_means("readings.csv") → [30.33…, 69.0]')
K_DICE = dict(sig='roll_dice(seed, n)', does='Mô phỏng n lần tung xúc xắc tái lập được.',
              takes='seed: int; n: int ≥ 0', gives='ndarray n số nguyên trong 1..6; cùng seed → cùng dãy',
              effect='Dùng generator riêng, không đụng RNG toàn cục của np.random.', call='roll_dice(7, 5) hai lần → hai dãy giống hệt')

READINGS_2 = 'day,temp,humidity\n1,20,50\n2,22,54\n3,24,58\n'
READINGS_3 = 'day,temp,humidity\n7,1.5,2.5\n8,3.5,4.5\n'


LESSONS = [
    # ------------------------------------------------------------------ X01
    dict(
        code='X01', title='Nhập dữ liệu bằng NumPy và pandas', minutes=30,
        goal='Đọc một bảng CSV "khó tính" đúng delimiter, dòng chú thích và ký hiệu thiếu, rồi kiểm schema trước khi tính.',
        prereq=None, support=['marks.csv'], env=PD_ENV, packages=['numpy', 'pandas'],
        brief='File marks.csv (đã cấp) dùng dấu chấm phẩy ";" để ngăn cột, dòng đầu là chú thích bắt đầu bằng "#", và '
              'điểm chưa có ghi là "-". Viết load_marks(path) đọc file bằng pd.read_csv với sep, comment và na_values '
              'phù hợp. Viết schema(df) trả dict gồm rows (số dòng), columns (list tên cột), missing (số ô thiếu ở cột '
              'mark) và mean_mark (trung bình cột mark, bỏ qua ô thiếu, làm tròn 2 chữ số).',
        example='marks.csv → rows 4, columns ["name", "class", "mark"], missing 1, mean_mark 8.17.',
        demo=r'''import numpy as np
import pandas as pd
from io import StringIO

text = "x,y\n1,2\n3,4\n5,6"
a = np.loadtxt(StringIO(text), delimiter=",", skiprows=1)
print(a.shape, len(a), a.sum())

weather = StringIO("city|temp\nHue|31\nVinh|NA\nHanoi|29")
df = pd.read_csv(weather, sep="|")
print(df.shape, df.columns.tolist())
print(df.dtypes)
print(df["temp"].isna().sum(), df["temp"].mean())
print(df.head(2))
''',
        explain=[
            'np.loadtxt đọc bảng SỐ sạch thành ndarray: delimiter="," tách cột, skiprows=1 bỏ dòng tiêu đề, usecols chọn '
            'cột cần. Gặp chữ hoặc ô trống là ValueError — khi đó dùng np.genfromtxt (học kỹ ở N06).',
            'Mỗi array có shape (kích thước từng chiều) và dtype (kiểu chung của mọi phần tử). len(a) chỉ cho độ dài '
            'chiều đầu — số hàng, không phải số phần tử.',
            'pd.read_csv đọc bảng có tiêu đề thành DataFrame. Tham số hay dùng: sep (ký tự ngăn cột), header (dòng nào là '
            'tiêu đề), comment (bỏ phần sau ký tự chú thích), na_values (chuỗi nào coi là thiếu — "NA", ô trống đã có sẵn), '
            'nrows (chỉ đọc vài dòng đầu để xem thử).',
            'Khám phá trước khi tính: df.shape, df.columns, df.dtypes, df.head()/tail(), df.info(). Cột điểm mà dtype là '
            'object nghĩa là còn chữ lẫn trong số — mean sẽ báo lỗi hoặc cho số vô nghĩa.',
            'df.values (hay df.to_numpy()) chuyển bảng sang ndarray khi cần tính bằng NumPy; np.info(...) và help(...) '
            'tra nhanh tài liệu ngay trong Python.',
        ],
        predict=dict(q='File ngăn cột bằng ";". Gọi pd.read_csv(path) mà không truyền sep thì DataFrame có mấy cột?',
                     code='name;class;mark\nMai;A;8.5\nBinh;A;7',
                     options=[
                         ('Một cột duy nhất, tên là cả chuỗi "name;class;mark"', 'Mặc định sep=",", file không có dấu phẩy nên mỗi dòng là một ô.', True),
                         ('Ba cột name, class, mark', 'read_csv không tự đổi sang ";" khi sep mặc định là ",".', False),
                         ('Báo lỗi ngay', 'Không có lỗi nào — sai lặng lẽ mới là điều nguy hiểm.', False),
                     ]),
        myth=('"read_csv chạy không báo lỗi là đã đọc đúng"',
              'Sai delimiter cho ra MỘT cột; quên na_values để "-" biến cả cột điểm thành chữ (dtype object); quên comment '
              'thì dòng chú thích chiếm chỗ tiêu đề. Không lỗi nào báo đỏ ngay lúc đọc — chỉ lộ ra khi xem df.columns, '
              'df.dtypes và số dòng.'),
        mcq=[
            dict(q='Cột mark đọc ra có dtype object thay vì float64. Nguyên nhân khả dĩ nhất?', options=[
                ('Còn ký hiệu thiếu như "-" chưa khai trong na_values nên cả cột bị đọc thành chữ', 'Chỉ một ô không phải số là đủ để cả cột thành object.', True),
                ('pandas luôn đọc số thực thành object', 'Cột toàn số được đọc thành float64 hoặc int64.', False),
                ('Do file có chữ tiếng Việt có dấu', 'Mã hoá ảnh hưởng cột chữ, không biến cột số thành object.', False),
            ]),
            dict(q='a = np.loadtxt(...) có shape (5, 3). len(a) bằng bao nhiêu?', options=[
                ('5 — len là độ dài chiều thứ nhất (số hàng)', 'Tổng số phần tử là a.size = 15.', True),
                ('15', 'Đó là a.size.', False),
                ('3', 'Đó là số cột a.shape[1].', False),
            ]),
            dict(q='Muốn xem thử 3 dòng đầu của một file CSV rất lớn mà KHÔNG đọc hết file, dùng gì?', options=[
                ('pd.read_csv(path, nrows=3)', 'nrows dừng đọc sau 3 dòng dữ liệu.', True),
                ('pd.read_csv(path).head(3)', 'Vẫn đọc toàn bộ file rồi mới cắt.', False),
                ('pd.read_csv(path, header=3)', 'header chọn dòng làm tiêu đề, không giới hạn số dòng đọc.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao phải xem columns, dtypes và số dòng NGAY sau khi đọc file?',
            sample='Vì read_csv thường không báo lỗi khi đọc sai: sai sep thì chỉ có một cột, thiếu na_values thì cột số '
                   'thành object, thiếu comment thì dòng chú thích chiếm chỗ tiêu đề. Kiểm schema ngay giúp phát hiện sớm, '
                   'trước khi mean hay biểu đồ cho ra kết quả sai mà trông vẫn hợp lý.'),
        scaffold=dict(
            intro='Lắp các tham số đọc file và cách đếm số dòng.',
            template=r'''import pandas as pd


def load_marks(path):
    return pd.read_csv(path, sep={{slot1}}, comment={{slot2}}, na_values={{slot3}})


def schema(df):
    return {
        "rows": {{slot4}},
        "columns": df.columns.tolist(),
        "missing": int(df["mark"].isna().sum()),
        "mean_mark": round(float(df["mark"].mean()), 2),
    }
''',
            slots=['";"', '"#"', '["-"]', 'len(df)'],
            hints=['Ký tự ngăn cột mà file này dùng — xem dòng đầu của dữ liệu',
                   'Ký tự mở đầu dòng ghi chú cần bỏ qua',
                   'Danh sách chuỗi mà file này dùng để đánh dấu ô thiếu',
                   'Số DÒNG của bảng, không phải tổng số ô'],
            traps=[('","', 1, 'Dấu phẩy là mặc định của read_csv, nhưng dòng đầu file cho thấy cột được ngăn '
                              'bằng ký tự khác.'),
                   ('["NA"]', 3, '"NA" thì pandas đã tự coi là thiếu; file này đánh dấu thiếu bằng ký tự khác.'),
                   ('df.size', 4, 'size là tổng số ô = số dòng × số cột, không phải số dòng.')]),
        flow=['read_csv(sep=";") → tách đúng 3 cột name, class, mark',
              'comment="#" → dòng chú thích đầu file bị bỏ qua',
              'na_values=["-"] → "-" thành NaN, cột mark là float64',
              'schema(df) → rows 4, missing 1, mean_mark 8.17'],
        transfer='Đọc một file khác cùng quy ước (hai dòng chú thích, ô thiếu ở dòng cuối) mà không sửa code: load_marks '
                 'phải dùng tham số path, không viết cứng "marks.csv".',
        counter=dict(q='File "name;class;mark\\nHoa;C;6\\nLan;C;-" → schema trả mean_mark bao nhiêu?',
                     options=['6.0', '3.0', 'Lỗi TypeError'], correct='6.0'),
        practice='Truyền đủ sep, comment, na_values cho read_csv; schema lấy số dòng bằng len(df), số ô thiếu bằng '
                 'isna().sum(), mean tự bỏ qua NaN.',
        steps=['load_marks: return pd.read_csv(path, sep=";", comment="#", na_values=["-"]).',
               'schema: rows = len(df); columns = df.columns.tolist(); missing = int(df["mark"].isna().sum()).',
               'mean_mark = round(float(df["mark"].mean()), 2) — mean bỏ qua NaN, không cần điền 0.'],
        partial=r'''def load_marks(path):
    return pd.read_csv(path, sep=";", ...)''',
        io=[('marks.csv', 'rows 4 · columns [name, class, mark] · missing 1 · mean_mark 8.17'),
            ('File không có ô thiếu', 'missing 0; mean_mark là trung bình mọi dòng')],
        contracts=[K_LOAD_MARKS, K_SCHEMA],
        starter=r'''import pandas as pd


def load_marks(path):
    pass


def schema(df):
    pass


# Gọi thử: df = load_marks("marks.csv"), rồi xem df.head(), df.dtypes và schema(df).
''',
        solution=X01_SOLUTION,
        tests=[
            T('marks.csv: đúng 3 cột', "load_marks('marks.csv').columns.tolist()", X01_COLS),
            T('marks.csv: 4 dòng, bỏ dòng chú thích', "len(load_marks('marks.csv'))", 4),
            T('"-" thành ô thiếu, cột mark là số thực',
              "(int(load_marks('marks.csv')['mark'].isna().sum()), str(load_marks('marks.csv')['mark'].dtype))", (1, 'float64')),
            T('schema của marks.csv', "schema(load_marks('marks.csv'))",
              {'rows': 4, 'columns': X01_COLS, 'missing': 1, 'mean_mark': 8.17}),
            T('File khác: hai dòng chú thích, ô thiếu ở cuối', f"schema(load_marks(_studio.write('t1.csv', {X01_T1!r})))",
              {'rows': 2, 'columns': X01_COLS, 'missing': 1, 'mean_mark': 6.0}),
            T('File không có ô thiếu', f"schema(load_marks(_studio.write('t2.csv', {X01_T2!r})))",
              {'rows': 2, 'columns': X01_COLS, 'missing': 0, 'mean_mark': 8.75}),
        ],
        bad=[('quên sep=";"', X01_SOLUTION.replace('sep=";", ', '')),
             ('không khai na_values', X01_SOLUTION.replace(', na_values=["-"]', '')),
             ('bỏ comment="#"', X01_SOLUTION.replace('comment="#", ', ''))],
    ),

    # ------------------------------------------------------------------ X02
    dict(
        code='X02', title='Excel, Stata, SAS, HDF5 và MATLAB', minutes=30,
        goal='Nhận ra thư viện đọc từng định dạng file và tự kiểm một vòng ghi–đọc Stata.',
        prereq='X01', env=X02_ENV, packages=['pandas'],
        brief='Hoàn thành READERS (đuôi file chữ thường → tên hàm đọc) cho đủ 8 đuôi: .csv → "pd.read_csv"; .xlsx, .xls → '
              '"pd.read_excel"; .dta → "pd.read_stata"; .sas7bdat → "pd.read_sas"; .h5, .hdf5 → "h5py.File"; .mat → '
              '"scipy.io.loadmat". Viết reader_for(path): lấy đuôi file (không phân biệt hoa/thường, tên có thể có nhiều '
              'dấu chấm), trả tên hàm đọc; đuôi không có trong READERS → raise ValueError. Viết stata_roundtrip(df, path): '
              'ghi df ra file Stata KHÔNG kèm index, đọc lại bằng pd.read_stata và trả DataFrame đọc được.',
        example='reader_for("Lab/Marks.XLSX") → "pd.read_excel"; reader_for("notes.txt") → ValueError; stata_roundtrip '
                'giữ đúng hai cột name, mark.',
        demo=r'''import pandas as pd
from io import BytesIO

weather = pd.DataFrame({"city": ["Hue", "Vinh"], "temp": [31.5, 29.0]})

with_index = BytesIO()
weather.to_stata(with_index)
with_index.seek(0)
print(pd.read_stata(with_index).columns.tolist())

clean = BytesIO()
weather.to_stata(clean, write_index=False)
clean.seek(0)
back = pd.read_stata(clean)
print(back.columns.tolist())
print(back)
''',
        explain=[
            'Mỗi định dạng có "cửa" riêng: Excel (.xlsx/.xls) → pd.read_excel hoặc pd.ExcelFile; Stata (.dta) → '
            'pd.read_stata; SAS (.sas7bdat) → pd.read_sas (slide cũ dùng thư viện sas7bdat: SAS7BDAT(path).to_data_frame()); '
            'HDF5 (.h5) → h5py.File; MATLAB (.mat) → scipy.io.loadmat.',
            'Excel có nhiều sheet: pd.ExcelFile(path).sheet_names liệt kê tên sheet; book.parse("Marks") hoặc '
            'pd.read_excel(path, sheet_name="Marks") đọc một sheet (sheet_name=0 là sheet đầu). usecols=["mark"] chỉ lấy '
            'cột cần — thay cho parse_cols trong bảng cũ. Cần cài openpyxl.',
            'h5py.File(path) mở file HDF5 như một dict lồng nhau: list(f.keys()) cho các group/dataset, f["group/data"][()] '
            'lấy dữ liệu (bảng cũ viết .value — đã bị bỏ). scipy.io.loadmat(path) trả dict: tên biến MATLAB → ndarray. '
            'File .mat bản v7.3 thực chất là HDF5: loadmat báo NotImplementedError thì mới mở bằng h5py.',
            'to_excel / to_stata mặc định ghi cả index thành một cột. Muốn đọc lại đúng bảng gốc thì ghi index=False '
            '(Excel) hoặc write_index=False (Stata).',
            'Đuôi file lấy bằng Path(path).suffix — phần sau dấu chấm CUỐI, kèm dấu chấm: "exp.v2.h5" → ".h5", "README" → "". '
            'Hạ chữ thường bằng .lower() để "Marks.XLSX" vẫn nhận ra Excel. API đổi theo phiên bản: hiểu chức năng trước, '
            'rồi tra tài liệu của phiên bản đang dùng.',
        ],
        predict=dict(q='Ghi rồi đọc lại bằng Stata như dưới đây. Bảng đọc lại có những cột nào?',
                     code='df = pd.DataFrame({"x": [1, 2]})\ndf.to_stata("a.dta")\nprint(pd.read_stata("a.dta").columns.tolist())',
                     options=[
                         ('["index", "x"] — to_stata mặc định ghi cả index thành cột', 'Muốn bỏ thì truyền write_index=False.', True),
                         ('["x"]', 'Chỉ đúng khi đã truyền write_index=False.', False),
                         ('Báo lỗi vì Stata không lưu được số nguyên', 'Stata lưu được số nguyên.', False),
                     ]),
        myth=('"Mọi file dữ liệu đều đọc bằng read_csv hoặc một thư viện chung"',
              '.xlsx là file nén chứa XML, .dta và .sas7bdat là định dạng nhị phân của Stata và SAS, .h5 là HDF5 có cây '
              'group/dataset, .mat là workspace của MATLAB. Đọc chúng bằng read_csv chỉ ra rác hoặc UnicodeDecodeError. '
              'Nhìn đuôi file để chọn đúng thư viện, rồi tra tài liệu phiên bản đang dùng — API cũ như parse_cols, .value '
              'đã bị bỏ.'),
        mcq=[
            dict(q='Muốn đọc workspace.mat thì dùng gì?', options=[
                ('scipy.io.loadmat — trả dict tên biến → array', 'Nhóm scipy.io trong bảng tra cứu.', True),
                ('pd.read_stata', 'Dành cho file .dta của Stata.', False),
                ('pd.read_csv', '.mat là file nhị phân, không phải văn bản.', False),
            ]),
            dict(q='book.xlsx có hai sheet "Q1" và "Q2". Đọc sheet thứ hai thế nào?', options=[
                ('pd.read_excel("book.xlsx", sheet_name="Q2") hoặc sheet_name=1', 'Chọn sheet bằng tên hoặc chỉ số đếm từ 0.', True),
                ('pd.read_excel("book.xlsx", sheet_name=2)', 'Chỉ số đếm từ 0: 2 là sheet thứ BA (ở đây không có).', False),
                ('pd.read_excel("book.xlsx") rồi lấy dòng thứ hai', 'Mặc định chỉ đọc sheet đầu tiên.', False),
            ]),
            dict(q='Vừa mở file HDF5: f = h5py.File("exp.h5"). Muốn biết bên trong có gì, làm gì đầu tiên?', options=[
                ('list(f.keys()) — xem các group/dataset ở gốc', 'HDF5 tổ chức như dict lồng nhau.', True),
                ('f.head()', 'h5py.File không phải DataFrame.', False),
                ('f.read()', 'Không có method này; dữ liệu lấy qua key.', False),
            ]),
            dict(q='Survey của khoa xuất ra file survey.dta. Hàm nào đọc được?', options=[
                ('pd.read_stata("survey.dta")', '.dta là định dạng của Stata.', True),
                ('pd.read_sas("survey.dta")', 'read_sas dành cho .sas7bdat/.xpt của SAS — dễ nhầm vì cùng là phần mềm thống kê.', False),
                ('h5py.File("survey.dta")', 'h5py chỉ mở file HDF5.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao nên ghi index=False / write_index=False khi lưu bảng để chương trình khác đọc lại?',
            sample='Mặc định pandas ghi index thành một cột riêng (tên "index" hoặc "Unnamed: 0"). Đọc lại sẽ có thêm cột '
                   'không có trong bảng gốc, làm lệch số cột và có thể bị tính nhầm như dữ liệu thật. Tắt ghi index thì '
                   'vòng ghi–đọc trả lại đúng các cột ban đầu.'),
        scaffold=dict(
            intro='Lắp bảng tra, cách lấy đuôi file và lệnh ghi Stata.',
            template=r'''from pathlib import Path

import pandas as pd

READERS = {".csv": "pd.read_csv", ".dta": {{slot1}}, ".mat": {{slot2}}}


def reader_for(path):
    suffix = {{slot3}}
    if suffix not in READERS:
        raise ValueError("unknown data format: " + path)
    return READERS[suffix]


def stata_roundtrip(df, path):
    {{slot4}}
    return pd.read_stata(path)
''',
            slots=['"pd.read_stata"', '"scipy.io.loadmat"', 'Path(path).suffix.lower()',
                   'df.to_stata(path, write_index=False)'],
            hints=['Tên hàm pandas đọc file .dta',
                   'Tên hàm đọc .mat của MATLAB — không thuộc pandas, cũng không phải thư viện HDF5',
                   'Đuôi file kèm dấu chấm, hạ chữ thường, lấy từ dấu chấm CUỐI',
                   'Ghi bảng ra định dạng Stata mà KHÔNG kèm cột index'],
            traps=[('"pd.read_sas"', 1, '.dta là Stata; read_sas dành cho .sas7bdat của SAS.'),
                   ('"h5py.File"', 2, 'h5py.File dành cho HDF5 (.h5), không mở được .mat của MATLAB.'),
                   ('path.split(".")[1]', 3, 'Lấy phần sau dấu chấm ĐẦU TIÊN, không kèm dấu chấm: "exp.v2.h5" → "v2".'),
                   ('df.to_stata(path)', 4, 'Ghi thêm cột index — đọc lại thừa một cột.')]),
        flow=['Path("Lab/Marks.XLSX").suffix.lower() → ".xlsx"',
              'READERS[".xlsx"] → "pd.read_excel"',
              'Path("notes.txt").suffix không có trong READERS → ValueError',
              'to_stata(write_index=False) + read_stata → đúng cột name, mark'],
        transfer='Thêm một định dạng mới mà không sửa reader_for: chỉ thêm một dòng vào READERS (ví dụ ".parquet": '
                 '"pd.read_parquet").',
        counter=dict(q='reader_for("exp.v2.h5") trả gì?', options=['"h5py.File"', 'ValueError', '"v2"'],
                     correct='"h5py.File"'),
        practice='Lấy đuôi bằng Path(path).suffix.lower(); tra trong READERS; không có thì raise ValueError. Ghi Stata với '
                 'write_index=False rồi đọc lại bằng pd.read_stata.',
        steps=['READERS: điền đủ 8 đuôi theo bảng trong đề (khoá là chữ thường, có dấu chấm).',
               'reader_for: suffix = Path(path).suffix.lower(); suffix không có trong READERS → raise ValueError; còn lại '
               'return READERS[suffix].',
               'stata_roundtrip: df.to_stata(path, write_index=False); return pd.read_stata(path).'],
        partial=r'''def reader_for(path):
    suffix = Path(path).suffix.lower()
    ...''',
        io=[('reader_for("Lab/Marks.XLSX")', '"pd.read_excel"'),
            ('reader_for("notes.txt")', 'ValueError'),
            ('stata_roundtrip(bảng name/mark, "m.dta")', 'DataFrame đúng hai cột name, mark')],
        contracts=[K_READER, K_STATA],
        starter=X02_STARTER,
        solution=X02_SOLUTION,
        tests=[
            T('Excel: marks.xlsx', "reader_for('marks.xlsx')", 'pd.read_excel'),
            T('Không phân biệt hoa thường, có thư mục', "reader_for('Lab/Marks.XLSX')", 'pd.read_excel'),
            T('Stata: survey.dta', "reader_for('survey.dta')", 'pd.read_stata'),
            T('MATLAB: workspace.mat', "reader_for('workspace.mat')", 'scipy.io.loadmat'),
            T('Đủ các đuôi còn lại (tên có nhiều dấu chấm)',
              "[reader_for(p) for p in ('exp.v2.h5', 'run.HDF5', 'census.sas7bdat', 'a.csv', 'old.xls')]",
              ['h5py.File', 'h5py.File', 'pd.read_sas', 'pd.read_csv', 'pd.read_excel']),
            T('Đuôi lạ → ValueError', "_studio.call(reader_for, 'notes.txt').error", 'ValueError'),
            T('Không có đuôi → ValueError', "_studio.call(reader_for, 'README').error", 'ValueError'),
            T('Stata: đúng cột, không thêm index',
              f"stata_roundtrip({df_lit({'name': ['Mai', 'An'], 'mark': [8.5, 9.0]})}, 'r1.dta').columns.tolist()",
              ['name', 'mark']),
            T('Stata: giữ nguyên giá trị (dữ liệu khác)',
              f"(lambda d: (d['city'].tolist(), d['temp'].tolist()))(stata_roundtrip({df_lit({'city': ['Hue', 'Vinh', 'Hanoi'], 'temp': [31.5, 29.0, 27.25]})}, 'r2.dta'))",
              (['Hue', 'Vinh', 'Hanoi'], [31.5, 29.0, 27.25])),
            T('Ghi ra đúng path đã cho',
              f"(stata_roundtrip({df_lit({'x': [1.0]})}, 'r3.dta'), __import__('os').path.getsize('r3.dta') > 0)[1]", True),
        ],
        bad=[('quên write_index=False', X02_SOLUTION.replace('df.to_stata(path, write_index=False)', 'df.to_stata(path)')),
             ('nhầm Stata với SAS', X02_SOLUTION.replace('".dta": "pd.read_stata"', '".dta": "pd.read_sas"')),
             ('so đuôi phân biệt hoa thường', X02_SOLUTION.replace('Path(path).suffix.lower()', 'Path(path).suffix'))],
    ),

    # ------------------------------------------------------------------ X03
    dict(
        code='X03', title='SQL với sqlite3 và pandas', minutes=35,
        goal='Truy vấn SQLite có tham số và đưa kết quả về pandas, không mở cửa cho SQL injection.',
        prereq='X02', env=SQL_ENV, packages=['pandas', 'sqlite3'],
        brief='make_db(rows) đã cấp: tạo database trong RAM có bảng marks(name, class, mark). Viết find_student(conn, name) '
              'trả DataFrame các dòng có đúng tên đó (cột name, class, mark), dùng pd.read_sql_query với chỗ giữ ? và '
              'params. Viết class_average(conn, class_name) tính AVG(mark) NGAY TRONG SQL cho một lớp và trả con số '
              '(None nếu lớp không có ai). Không ghép giá trị người dùng vào chuỗi SQL.',
        example='class_average(conn, "A") → 8.25; find_student(conn, "O\'Brien") → 1 dòng; '
                'find_student(conn, "x\' OR \'1\'=\'1") → DataFrame rỗng, không lộ cả bảng.',
        demo=r'''import sqlite3
import pandas as pd

with sqlite3.connect(":memory:") as conn:
    conn.execute("CREATE TABLE sales (city TEXT, amount REAL)")
    conn.executemany("INSERT INTO sales VALUES (?, ?)",
                     [("Hue", 120.0), ("Vinh", 80.0), ("Hue", 40.0)])
    cur = conn.execute("SELECT city, amount FROM sales ORDER BY amount DESC")
    print([column[0] for column in cur.description])
    print(cur.fetchmany(2))
    print(cur.fetchmany(2))
    sql = "SELECT city, SUM(amount) AS total FROM sales WHERE amount > ? GROUP BY city"
    print(pd.read_sql_query(sql, conn, params=(50,)))
conn.close()
''',
        explain=[
            'sqlite3.connect(":memory:") mở một database SQLite nằm trong RAM (đưa đường dẫn file .db thì lưu ra đĩa). '
            'conn.execute(sql) trả cursor: cursor.description cho tên cột; fetchone(), fetchmany(size), fetchall() lấy '
            'một dòng / tối đa size dòng tiếp theo / tất cả.',
            'pd.read_sql_query(sql, conn, params=...) chạy truy vấn và trả thẳng DataFrame, tên cột lấy từ SELECT. Slide '
            'cũ dùng SQLAlchemy: engine = create_engine("sqlite:///data.sqlite") rồi đưa engine vào read_sql_query; với '
            'SQLite, kết nối sqlite3 có sẵn là đủ. Các ví dụ cũ như engine.table_names() đã bị bỏ ở SQLAlchemy mới.',
            'Giá trị từ người dùng KHÔNG ghép vào chuỗi SQL. Viết chỗ giữ ? rồi truyền tuple params=(name,): driver gửi '
            'giá trị tách khỏi câu lệnh, nên dấu nháy trong "O\'Brien" hay chuỗi "x\' OR \'1\'=\'1" chỉ là dữ liệu.',
            'Để database làm phần tổng hợp: SELECT AVG(mark) … WHERE class = ? trả về MỘT dòng thay vì kéo cả bảng về '
            'Python. Không dòng nào khớp thì AVG trả NULL — Python nhận None.',
            'with sqlite3.connect(...) as conn: chỉ tự commit (hoặc rollback khi lỗi) giao dịch, KHÔNG đóng kết nối — vẫn '
            'phải conn.close(). Ghi dữ liệu xong nhớ conn.commit(), nếu không một lần rollback sẽ xoá mất các dòng vừa thêm.',
        ],
        predict=dict(q='Ghép giá trị người dùng vào SQL bằng f-string như dưới. Truy vấn trả về gì?',
                     code='name = "x\' OR \'1\'=\'1"\nsql = f"SELECT * FROM marks WHERE name = \'{name}\'"',
                     options=[
                         ("Mọi dòng của bảng — điều kiện thành name = 'x' OR '1'='1', luôn đúng",
                          'Chuỗi người dùng đã trở thành một phần câu lệnh SQL: đó là SQL injection.', True),
                         ('Không dòng nào, vì không ai tên như vậy', 'Đúng nếu dùng chỗ giữ ? và params.', False),
                         ('Báo lỗi cú pháp SQL', 'Chuỗi được chọn khéo để câu SQL vẫn hợp lệ.', False),
                     ]),
        myth=('"Ghép chuỗi SQL bằng f-string là được, miễn dữ liệu của mình sạch"',
              "Chỉ cần một tên có dấu nháy (O'Brien) là câu SQL vỡ; một chuỗi cố ý như x' OR '1'='1 biến điều kiện lọc "
              'thành luôn đúng và lộ cả bảng — đó là SQL injection. Chỗ giữ ? + params không chỉ an toàn hơn mà còn đúng '
              'với MỌI giá trị.'),
        mcq=[
            dict(q='cursor.fetchmany(size=5) làm gì?', options=[
                ('Lấy tối đa 5 dòng tiếp theo của kết quả; gọi lại để lấy nhóm sau', 'Hết dòng thì trả list rỗng.', True),
                ('Lấy đúng 5 dòng, thiếu thì báo lỗi', 'Ít hơn 5 dòng vẫn trả bình thường.', False),
                ('Chạy truy vấn 5 lần', 'Truy vấn đã chạy ở execute; fetch chỉ lấy kết quả.', False),
            ]),
            dict(q='params=(name) với name = "Mai" sẽ thế nào?', options=[
                ('Lỗi: (name) chỉ là chuỗi "Mai" — sqlite3 coi là 3 giá trị cho 1 dấu ?', 'Tuple một phần tử phải có dấu phẩy: (name,).', True),
                ('Chạy bình thường', '(name) không phải tuple, chỉ là name trong ngoặc.', False),
                ('Tìm lần lượt "M", "a", "i"', 'sqlite3 báo lỗi số lượng tham số chứ không tìm ba lần.', False),
            ]),
            dict(q='Ra khỏi khối with sqlite3.connect(...) as conn: thì kết nối…', options=[
                ('Vẫn mở — with chỉ commit/rollback; cần gọi conn.close()', 'Khác với with open(...) của file.', True),
                ('Tự đóng như file', 'Đó là hành vi của open(), không phải sqlite3.', False),
                ('Bị xoá database', 'Database trong RAM chỉ mất khi kết nối đóng.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao dùng chỗ giữ ? với params thay vì ghép giá trị vào chuỗi SQL?',
            sample="Với ? và params, driver gửi câu lệnh và giá trị riêng nhau, nên giá trị chỉ được coi là dữ liệu: dấu "
                   "nháy trong O'Brien không làm vỡ câu, chuỗi x' OR '1'='1 không thành điều kiện luôn đúng. Ghép chuỗi thì "
                   'giá trị người dùng trở thành một phần lệnh SQL — vừa lỗi với dữ liệu thật vừa mở cửa SQL injection.'),
        scaffold=dict(
            intro='Dữ liệu mới: bảng sales(city, amount). Lắp chỗ giữ, tham số và cách lấy kết quả tổng hợp.',
            template=r'''import sqlite3

import pandas as pd


def city_sales(conn, city):
    sql = "SELECT city, amount FROM sales WHERE city = {{slot1}}"
    return pd.read_sql_query(sql, conn, params={{slot2}})


def city_total(conn, city):
    row = conn.execute("SELECT {{slot3}} FROM sales WHERE city = ?", (city,)).{{slot4}}
    return row[0]
''',
            slots=['?', '(city,)', 'SUM(amount)', 'fetchone()'],
            hints=['Chỗ giữ cho giá trị để sqlite3 tự chèn — đừng ghép vào chuỗi SQL',
                   'Dãy tham số của câu SQL — một phần tử vẫn phải là tuple',
                   'Biểu thức tổng hợp cộng cả cột tiền ngay trong SQL',
                   'Lấy MỘT dòng kết quả, để row[0] là con số'],
            traps=[("'{city}'", 1, 'Ghép giá trị vào chuỗi SQL — mở cửa injection (và thiếu chữ f nên chỉ là chữ "{city}").'),
                   ('(city)', 2, 'Thiếu dấu phẩy: chỉ là chuỗi city trong ngoặc, không phải tuple.'),
                   ('fetchall()', 4, 'Trả list các dòng; row[0] khi đó là cả tuple chứ không phải con số.')]),
        flow=['make_db(ROWS) → bảng marks 4 dòng trong RAM',
              'WHERE name = ? + params=(name,) → giá trị đi riêng, chỉ là dữ liệu',
              'read_sql_query → DataFrame cột name, class, mark',
              'AVG(mark) … fetchone() → (8.25,), trả 8.25'],
        transfer="Thử tên có dấu nháy (O'Brien) và chuỗi tấn công x' OR '1'='1: truy vấn có tham số phải xử lý cả hai như "
                 'dữ liệu bình thường.',
        counter=dict(q='class_average(conn, "Z") khi không có lớp Z → ?', options=['None', '0', 'Lỗi ZeroDivisionError'],
                     correct='None'),
        practice='Viết SQL có dấu ?, truyền giá trị qua params=(name,) / (class_name,); để AVG chạy trong SQL và lấy kết '
                 'quả bằng fetchone()[0].',
        steps=['find_student: sql = "SELECT name, class, mark FROM marks WHERE name = ?"; return pd.read_sql_query(sql, '
               'conn, params=(name,)).',
               'class_average: row = conn.execute("SELECT AVG(mark) FROM marks WHERE class = ?", (class_name,)).fetchone(); '
               'return row[0].'],
        partial=r'''def find_student(conn, name):
    sql = "SELECT name, class, mark FROM marks WHERE name = ?"
    ...''',
        io=[('find_student(conn, "Mai")', '1 dòng: Mai, A, 8.5'),
            ('find_student(conn, "x\' OR \'1\'=\'1")', 'DataFrame rỗng'),
            ('class_average(conn, "A")', '8.25; lớp không có ai → None')],
        contracts=[K_FIND, K_AVG],
        starter=X03_STARTER,
        solution=X03_SOLUTION,
        tests=[
            T('Tìm đúng một người', f"find_student({db()}, 'Mai').values.tolist()", [['Mai', 'A', 8.5]]),
            T('Đủ ba cột name, class, mark', f"find_student({db()}, 'An').columns.tolist()", ['name', 'class', 'mark']),
            T("Tên có dấu nháy: O'Brien", f"find_student({db()}, {OBRIEN!r})['mark'].tolist()", [7.5]),
            T('Chuỗi tấn công không lộ bảng', f"len(find_student({db()}, {INJECT!r}))", 0),
            T('Hai người trùng tên (dữ liệu khác)',
              f"find_student({db([('Hoa', 'C', 6.0), ('Hoa', 'D', 7.0), ('Ty', 'C', 9.0)])}, 'Hoa')['class'].tolist()", ['C', 'D']),
            T('AVG lớp A', f"round(class_average({db()}, 'A'), 2)", 8.25),
            T('AVG dữ liệu khác', f"round(class_average({db([('Ty', 'C', 6.0), ('Lan', 'C', 7.0), ('Ka', 'C', 9.5)])}, 'C'), 2)", 7.5),
            T('Lớp không có ai → None', f"class_average({db()}, 'Z')", None),
            T('Chuỗi tấn công vào tên lớp → None', f"class_average({db()}, {INJECT!r})", None),
        ],
        bad=[('ghép tên vào chuỗi SQL', X03_SOLUTION.replace(
                 '    sql = "SELECT name, class, mark FROM marks WHERE name = ?"\n'
                 '    return pd.read_sql_query(sql, conn, params=(name,))\n',
                 '    sql = f"SELECT name, class, mark FROM marks WHERE name = \'{name}\'"\n'
                 '    return pd.read_sql_query(sql, conn)\n')),
             ('params thiếu dấu phẩy', X03_SOLUTION.replace('params=(name,)', 'params=(name)')),
             ('ghép tên lớp vào chuỗi SQL', X03_SOLUTION.replace(
                 'row = conn.execute("SELECT AVG(mark) FROM marks WHERE class = ?", (class_name,)).fetchone()',
                 'row = conn.execute(f"SELECT AVG(mark) FROM marks WHERE class = \'{class_name}\'").fetchone()'))],
    ),

    # ------------------------------------------------------------------ N01
    dict(
        code='N01', title='Array, dtype, shape và axis', minutes=30,
        goal='Tạo array 2 chiều bằng arange/reshape và tổng hợp đúng theo axis.',
        prereq=None, env=NP_ENV + INT_NOTE, packages=['numpy'],
        brief='Viết make_grid(n, n_cols): array các số 1..n xếp thành hàng, mỗi hàng n_cols cột (n không chia hết cho '
              'n_cols thì để reshape báo ValueError). Viết describe(a) — a là array hoặc list lồng nhau 2 chiều — trả dict: '
              'shape, ndim, size, col_sums (tổng TỪNG CỘT), row_sums (tổng từng hàng) và total (tổng tất cả).',
        example='make_grid(12, 4) → shape (3, 4); describe(...) → col_sums [15, 18, 21, 24], row_sums [10, 26, 42], total 78.',
        demo=r'''import numpy as np

temps = np.array([[30, 32, 31], [25, 27, 26]])   # 2 thành phố × 3 ngày
print(temps.shape, temps.ndim, temps.size, len(temps))
print(temps.sum(axis=0))   # gộp các HÀNG → còn một số cho mỗi ngày (cột)
print(temps.sum(axis=1))   # gộp các CỘT → còn một số cho mỗi thành phố (hàng)
print(temps.sum())

print(np.array([1, 2, 3.5]).dtype)
print(np.linspace(0, 1, 5))
print(np.zeros((2, 3)).shape, np.ones(2))
print(np.arange(6).reshape(3, -1))
''',
        explain=[
            'np.array([[...], [...]]) tạo ndarray 2 chiều. Mọi phần tử chung MỘT dtype: toàn số nguyên thì là int64 trên '
            'máy 64-bit (trong trình duyệt có thể là int32 — tuỳ nền tảng); trộn 1 với 2.5 thì cả array thành float64.',
            'shape là kích thước từng chiều, ví dụ (2, 3) = 2 hàng × 3 cột; ndim là số chiều (2); size là tổng số phần tử '
            '(6). len(a) chỉ là độ dài chiều đầu — số hàng.',
            'np.arange(1, 13) cho 1..12 — điểm dừng KHÔNG nằm trong kết quả. reshape(3, 4) xếp lại 12 phần tử thành 3 hàng '
            '× 4 cột; viết -1 để NumPy tự tính một chiều; số phần tử không khớp → ValueError. linspace, zeros, ones tạo '
            'nhanh dữ liệu thử.',
            'axis là chiều bị GỘP: sum(axis=0) gộp các hàng → còn một giá trị cho mỗi cột; sum(axis=1) gộp các cột → còn '
            'một giá trị cho mỗi hàng. Không ghi axis thì gộp hết thành một số.',
            'Trước khi tính, viết ra shape mong muốn và đơn vị của mỗi cột: tổng theo cột của array (3, 4) phải có shape (4,).',
        ],
        predict=dict(q='a = np.arange(1, 13).reshape(3, 4). a.sum(axis=0) có bao nhiêu phần tử?', options=[
            ('4 — gộp 3 hàng lại, còn một tổng cho mỗi cột', 'axis=0 là chiều hàng bị gộp mất.', True),
            ('3 — một tổng cho mỗi hàng', 'Đó là axis=1.', False),
            ('1 — tổng toàn bộ là 78', 'Đó là a.sum() không có axis.', False),
        ]),
        myth=('"axis=0 nghĩa là tính theo hàng nên được một số cho mỗi hàng"',
              'axis là chiều bị GỘP mất, không phải chiều được giữ lại. Với array (3, 4), axis=0 gộp 3 hàng → kết quả shape '
              '(4,) — một số cho mỗi cột. Ma trận vuông còn nguy hiểm hơn: nhầm axis vẫn ra đúng shape nên không có lỗi nào '
              'báo, chỉ có số sai.'),
        mcq=[
            dict(q='a.shape là (5, 3). len(a) và a.size bằng bao nhiêu?', options=[
                ('len(a) = 5, a.size = 15', 'len đo chiều đầu; size đếm mọi phần tử.', True),
                ('len(a) = 15, a.size = 15', 'len chỉ là số hàng.', False),
                ('len(a) = 3, a.size = 8', 'size là TÍCH các chiều, không phải tổng.', False),
            ]),
            dict(q='np.arange(10).reshape(4, 3) thì sao?', options=[
                ('ValueError — 10 phần tử không xếp được thành 4 × 3 = 12', 'reshape giữ nguyên số phần tử.', True),
                ('Tự thêm 2 số 0 cho đủ', 'NumPy không tự đệm.', False),
                ('Cắt bớt còn 9 phần tử', 'NumPy không tự cắt.', False),
            ]),
            dict(q='np.array([1, 2, 3.5]).dtype là gì?', options=[
                ('float64 — một số thực kéo cả array thành số thực', 'Array có một dtype chung.', True),
                ('object', 'Chỉ khi trộn những kiểu không phải số.', False),
                ('int và float lẫn nhau', 'Mỗi array chỉ có một dtype.', False),
            ]),
        ],
        why=dict(
            prompt='Giải thích axis=0 và axis=1 với array điểm có shape (học viên, môn).',
            sample='Với array shape (học viên, môn), axis=0 gộp chiều học viên nên kết quả còn một giá trị cho mỗi môn '
                   '(tổng hay trung bình theo môn); axis=1 gộp chiều môn nên còn một giá trị cho mỗi học viên. Kiểm lại bằng '
                   'shape kết quả: (số môn,) hay (số học viên,).'),
        scaffold=dict(
            intro='Dữ liệu mới: 2 thành phố × 3 ngày. Lắp lệnh tạo dữ liệu, số phần tử và tổng theo axis.',
            template=r'''import numpy as np

temps = np.arange(1, {{slot1}}).reshape(2, 3)
info = {
    "shape": temps.shape,
    "size": {{slot2}},
    "per_day": temps.sum({{slot3}}),
    "per_city": temps.sum({{slot4}}),
}
''',
            slots=['7', 'temps.size', 'axis=0', 'axis=1'],
            hints=['Điểm dừng của arange — reshape(2, 3) quyết định cần bao nhiêu số',
                   'Tổng số phần tử của array, không phải số hàng',
                   'Cộng theo chiều thành phố, để ra tổng TỪNG NGÀY',
                   'Cộng theo chiều ngày, để ra tổng TỪNG THÀNH PHỐ'],
            traps=[('6', 1, 'arange dừng TRƯỚC điểm dừng: arange(1, 6) chỉ có 5 số, reshape(2, 3) sẽ lỗi.'),
                   ('len(temps)', 2, 'len chỉ đếm số hàng (2), không phải số phần tử (6).'),
                   ('axis=2', 4, 'Array 2 chiều chỉ có axis 0 và 1 — AxisError.')]),
        flow=['np.arange(1, 13) → 12 số từ 1 đến 12',
              'reshape(-1, 4) → shape (3, 4)',
              'sum(axis=0) → [15, 18, 21, 24], một tổng mỗi cột',
              'sum(axis=1) → [10, 26, 42], một tổng mỗi hàng',
              'sum() → 78'],
        transfer='Thử array 2 × 3 nhập tay ([[5, 0, 1], [2, 2, 2]]) và một ma trận vuông 2 × 2: viết shape kết quả mong '
                 'muốn TRƯỚC khi chạy.',
        counter=dict(q='describe([[1, 2], [3, 4]])["col_sums"] là gì?', options=['[4, 6]', '[3, 7]', '10'], correct='[4, 6]'),
        practice='make_grid dùng np.arange(1, n + 1).reshape(-1, n_cols); describe đổi đầu vào bằng np.asarray rồi dùng '
                 'shape, ndim, size, sum(axis=0), sum(axis=1), sum().',
        steps=['make_grid: return np.arange(1, n + 1).reshape(-1, n_cols) — điểm dừng là n + 1.',
               'describe: a = np.asarray(a) để nhận cả list lồng nhau.',
               'col_sums = a.sum(axis=0) (gộp hàng), row_sums = a.sum(axis=1) (gộp cột), total = a.sum().'],
        partial=r'''def make_grid(n, n_cols):
    return np.arange(1, n + 1).reshape(...)''',
        io=[('make_grid(12, 4)', 'shape (3, 4); hàng cuối [9, 10, 11, 12]'),
            ('describe(make_grid(12, 4))', 'col_sums [15, 18, 21, 24] · row_sums [10, 26, 42] · total 78'),
            ('make_grid(10, 4)', 'ValueError')],
        contracts=[K_GRID, K_DESCRIBE],
        starter=r'''import numpy as np


def make_grid(n, n_cols):
    pass


def describe(a):
    pass
''',
        solution=N01_SOLUTION,
        tests=[
            T('make_grid(12, 4): shape (3, 4)', 'make_grid(12, 4).shape', (3, 4)),
            T('make_grid(12, 4): hàng cuối là 9..12', I1('make_grid(12, 4)[-1]'), [9, 10, 11, 12]),
            T('make_grid(8, 2): 4 hàng, bắt đầu từ 1', '(make_grid(8, 2).shape, ' + I1('make_grid(8, 2)[0]') + ')', ((4, 2), [1, 2])),
            T('make_grid(10, 4) → ValueError', '_studio.call(make_grid, 10, 4).error', 'ValueError'),
            T('Tổng từng cột (axis=0)', I1("describe(make_grid(12, 4))['col_sums']"), [15, 18, 21, 24]),
            T('Tổng từng hàng (axis=1)', I1("describe(make_grid(12, 4))['row_sums']"), [10, 26, 42]),
            T('shape, ndim, size, total',
              "(lambda d: (tuple(d['shape']), int(d['ndim']), int(d['size']), int(d['total'])))(describe(make_grid(12, 4)))",
              ((3, 4), 2, 12, 78)),
            T('List lồng nhau 2 × 3 (dữ liệu khác)',
              "(lambda d: (" + I1("d['col_sums']") + ", " + I1("d['row_sums']") + ", int(d['size'])))(describe([[5, 0, 1], [2, 2, 2]]))",
              ([7, 2, 3], [6, 6], 6)),
            T('Ma trận vuông 2 × 2: không nhầm axis', "(lambda d: (" + I1("d['col_sums']") + ", " + I1("d['row_sums']") + "))(describe([[1, 2], [3, 4]]))",
              ([4, 6], [3, 7])),
        ],
        bad=[('nhầm axis', N01_SOLUTION.replace('"col_sums": a.sum(axis=0),\n        "row_sums": a.sum(axis=1),',
                                                 '"col_sums": a.sum(axis=1),\n        "row_sums": a.sum(axis=0),')),
             ('len thay cho size', N01_SOLUTION.replace('"size": a.size,', '"size": len(a),')),
             ('arange bắt đầu từ 0', N01_SOLUTION.replace('np.arange(1, n + 1)', 'np.arange(n)'))],
    ),

    # ------------------------------------------------------------------ N02
    dict(
        code='N02', title='Indexing, mask và vectorization', minutes=30,
        goal='Chọn dữ liệu bằng boolean mask nhiều điều kiện và tính đồng loạt không cần vòng lặp.',
        prereq='N01', env=NP_ENV, packages=['numpy'],
        brief='Viết curve(scores, bonus): chỉ giữ các điểm hợp lệ trong đoạn 0..10 (bỏ điểm âm và điểm lớn hơn 10), cộng '
              'bonus cho từng điểm còn lại rồi chặn tối đa ở 10; trả array số thực. Viết grade_labels(scores, cutoff): trả '
              'array nhãn "pass" (điểm ≥ cutoff) hoặc "fail" cho TỪNG điểm, dùng np.where.',
        example='curve([3, 5, 8, 12], 0.5) → [3.5, 5.5, 8.5]; grade_labels([4, 6, 9], 5) → ["fail", "pass", "pass"].',
        demo=r'''import numpy as np

temps = np.array([[28, 35], [31, 40], [22, 30]])
print(temps[1, 0], temps[:, 1])          # một ô; cả cột thứ hai
hot = (temps >= 30) & (temps < 40)
print(hot)
print(temps[hot])                         # chỉ các ô thỏa CẢ HAI điều kiện
print(temps * 1.8 + 32)                   # °C → °F cho mọi ô, không vòng lặp
print(np.where(temps > 32, "nóng", "ổn"))
print(np.clip(temps, 25, 35))             # kéo về biên, không bỏ ô nào
''',
        explain=[
            'a[i, j] lấy một ô; a[:, 1] lấy cả cột thứ hai; a[0:2] lấy hai hàng đầu. Slice dùng start:stop như list.',
            'So sánh trên array cho ra array bool cùng shape (mask). a[mask] giữ các phần tử ứng với True — kết quả là '
            'array 1 chiều MỚI.',
            'Ghép điều kiện dùng & (và), | (hoặc), ~ (phủ định), mỗi điều kiện đặt trong NGOẶC: (a >= 0) & (a <= 10). '
            'and/or đòi một giá trị True/False duy nhất nên báo ValueError với array; thiếu ngoặc thì & được tính trước >=.',
            'Phép toán trên array chạy element-wise cho mọi phần tử (vectorization): a + 0.5, a * 1.8 — không cần vòng for. '
            'Nhưng đừng nhồi mọi thứ vào một dòng khó đọc: đặt tên bước trung gian như valid để pipeline rõ ràng.',
            'np.where(điều kiện, x, y) chọn x hoặc y cho TỪNG phần tử; np.clip(a, lo, hi) kéo giá trị ngoài biên về biên — '
            'nó không loại phần tử nào.',
        ],
        predict=dict(q='a = np.array([4, 6, 8, 11]). Dòng dưới cho gì?', code='a[(a >= 5) and (a <= 10)]', options=[
            ('ValueError: truth value of an array ... is ambiguous', 'and cần MỘT bool; array có nhiều giá trị.', True),
            ('array([6, 8])', 'Đúng nếu dùng & thay cho and.', False),
            ('array([4, 6, 8, 11])', 'Không phép lọc nào chạy được.', False),
        ]),
        myth=('"np.clip loại bỏ điểm sai"',
              'clip không bỏ phần tử nào: 12 bị kéo về 10 và vẫn nằm trong kết quả. Muốn LOẠI điểm ngoài 0..10 thì lọc '
              'bằng mask; clip chỉ dùng để chặn giá trị sau khi cộng thưởng.'),
        mcq=[
            dict(q='a = np.array([[6, 8], [7, 9]]). a[:, 1] là gì?', options=[
                ('[8, 9] — cột thứ hai của mọi hàng', ': là mọi hàng, 1 là cột có chỉ số 1.', True),
                ('[7, 9] — hàng thứ hai', 'Hàng thứ hai là a[1].', False),
                ('8', 'Một ô cần hai chỉ số cụ thể, ví dụ a[0, 1].', False),
            ]),
            dict(q='np.where(np.array([120, 80]) > 100, "high", "low") trả gì?', options=[
                ('array(["high", "low"]) — chọn cho từng phần tử', 'where với 3 đối số là "if/else theo từng phần tử".', True),
                ('"high"', 'Không gộp thành một giá trị.', False),
                ('(array([0]),)', 'Đó là np.where với MỘT đối số: trả vị trí các phần tử True.', False),
            ]),
            dict(q='a[a > 5] = 0 làm gì?', options=[
                ('Gán 0 cho mọi phần tử > 5 ngay trong a', 'Mask ở bên trái dấu = sửa array gốc.', True),
                ('Tạo array mới chỉ gồm số 0', 'Gán qua mask sửa tại chỗ.', False),
                ('Lỗi vì mask không gán được', 'Gán qua mask là cách làm phổ biến.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao viết (a >= 0) & (a <= 10) mà không viết a >= 0 and a <= 10?',
            sample='and/or của Python cần MỘT giá trị True/False, còn a >= 0 là cả array bool nên Python báo ValueError '
                   '(ambiguous). & so từng cặp phần tử và trả mask mới. Ngoặc bắt buộc vì & được tính trước >= và <=; thiếu '
                   'ngoặc thì biểu thức thành a >= (0 & a) <= 10, sai nghĩa hoặc lỗi.'),
        scaffold=dict(
            intro='Dữ liệu mới: nhiệt độ. Giữ các ngày từ 20 đến 35 độ, đổi sang °F, gắn nhãn.',
            template=r'''import numpy as np

temps = np.array([18.0, 25.0, 33.0, 41.0])
ok = temps[{{slot1}}]
fahrenheit = {{slot2}}
labels = np.where({{slot3}}, "hot", "mild")
''',
            slots=['(temps >= 20) & (temps <= 35)', 'ok * 1.8 + 32', 'ok > 30'],
            hints=['Mask bool giữ các ngày trong khoảng — mỗi phép so một cặp ngoặc',
                   'Công thức đổi độ C sang độ F, áp lên cả array đã lọc',
                   'Điều kiện bool chọn nhãn nóng, tính trên array đã lọc'],
            traps=[('(temps >= 20) and (temps <= 35)', 1, 'and với array → ValueError.'),
                   ('temps >= 20 & temps <= 35', 1, 'Thiếu ngoặc: & được tính trước >=.'),
                   ('np.clip(temps, 20, 35)', 1, 'clip kéo về biên chứ không lọc; chỉ số phải là mask bool.')]),
        flow=['a = [3, 5, 8, 12]; a >= 0 → [True, True, True, True]',
              'a <= 10 → [True, True, True, False]',
              '(a >= 0) & (a <= 10) → giữ [3, 5, 8]',
              'valid + 0.5 → [3.5, 5.5, 8.5]',
              'np.clip(..., 0, 10) → chặn trên ở 10'],
        transfer='Thử điểm âm, điểm đúng bằng 10 và bonus đẩy điểm vượt 10: lọc trước, cộng sau, chặn cuối.',
        counter=dict(q='curve([9.8, 12], 0.5) → ?', options=['[10.0]', '[10.0, 10.0]', '[10.3]'], correct='[10.0]'),
        practice='Tạo mask bằng & với hai điều kiện trong ngoặc, lọc, cộng bonus, rồi np.clip(…, 0, 10). grade_labels '
                 'dùng np.where.',
        steps=['a = np.asarray(scores, dtype=float); valid = a[(a >= 0) & (a <= 10)].',
               'return np.clip(valid + bonus, 0, 10).',
               'grade_labels: return np.where(np.asarray(scores) >= cutoff, "pass", "fail").'],
        partial=r'''def curve(scores, bonus):
    a = np.asarray(scores, dtype=float)
    valid = a[(a >= 0) & ...]
    ...''',
        io=[('curve([3, 5, 8, 12], 0.5)', '[3.5, 5.5, 8.5]'),
            ('curve([9.8, 7], 0.5)', '[10.0, 7.5]'),
            ('grade_labels([4, 6, 9], 5)', '["fail", "pass", "pass"]')],
        contracts=[K_CURVE, K_LABELS],
        starter=r'''import numpy as np


def curve(scores, bonus):
    pass


def grade_labels(scores, cutoff):
    pass
''',
        solution=N02_SOLUTION,
        tests=[
            T('Đề mẫu: [3, 5, 8, 12] + 0.5', R1('curve([3, 5, 8, 12], 0.5)'), [3.5, 5.5, 8.5]),
            T('Bỏ điểm âm, 10 + 1 chặn về 10', R1('curve([-1, 4, 10], 1)'), [5.0, 10.0]),
            T('Chặn ở 10 sau khi cộng', R1('curve([9.8, 7], 0.5)'), [10.0, 7.5]),
            T('Giữ đúng biên 0 và 10', R1('curve([0, 10, 10.5], 0)'), [0.0, 10.0]),
            T('Không còn điểm hợp lệ → rỗng', 'len(curve([11, -2], 1))', 0),
            TX('Không sửa array đầu vào', "(lambda s: (curve(s, 1), s.tolist())[1])(np.array([1.0, 2.0, 12.0]))",
               '[1.0, 2.0, 12.0]'),
            T('Nhãn cho từng điểm', '[str(v) for v in grade_labels([4, 6, 9], 5)]', ['fail', 'pass', 'pass']),
            T('Đúng ngưỡng là pass (dữ liệu khác)', '[str(v) for v in grade_labels([7, 6.99, 10], 7)]', ['pass', 'fail', 'pass']),
        ],
        bad=[('dùng and thay cho &', N02_SOLUTION.replace('a[(a >= 0) & (a <= 10)]', 'a[(a >= 0) and (a <= 10)]')),
             ('thiếu ngoặc quanh điều kiện', N02_SOLUTION.replace('a[(a >= 0) & (a <= 10)]', 'a[a >= 0 & a <= 10]')),
             ('dùng clip thay cho lọc', N02_SOLUTION.replace('valid = a[(a >= 0) & (a <= 10)]', 'valid = np.clip(a, 0, 10)'))],
    ),

    # ------------------------------------------------------------------ N03
    dict(
        code='N03', title='Broadcasting và chuẩn hoá dữ liệu', minutes=35,
        goal='Trừ mean và chuẩn hoá z-score theo cột bằng broadcasting, xử lý cột hằng.',
        prereq='N02', env=NP_ENV, packages=['numpy'],
        brief='Viết center_columns(a): trừ mean của TỪNG CỘT khỏi cột đó (dùng mean(axis=0, keepdims=True)) và trả array '
              'số thực cùng shape. Viết zscore_columns(a): (a − mean cột) / std cột; cột có std = 0 (mọi giá trị bằng nhau) '
              'phải ra toàn 0 thay vì nan. Không sửa array đầu vào.',
        example='center_columns([[2, 20], [4, 40]]) → [[-1, -10], [1, 10]]; zscore_columns([[1, 5], [3, 5]]) → [[-1, 0], [1, 0]].',
        demo=r'''import numpy as np

qty = np.array([[2, 1], [0, 3], [4, 2]])   # 3 đơn hàng × 2 sản phẩm
price = np.array([15.0, 40.0])             # giá từng sản phẩm, shape (2,)
revenue = qty * price                      # (3, 2) * (2,) → giá áp cho mỗi hàng
print(revenue)

order_total = revenue.sum(axis=1, keepdims=True)
print(order_total.shape)                   # (3, 1)
print(revenue / order_total)               # tỉ trọng từng sản phẩm trong đơn

try:
    revenue - revenue.sum(axis=1)          # (3, 2) - (3,) → không khớp
except ValueError as error:
    print("ValueError:", error)
''',
        explain=[
            'Broadcasting: NumPy so shape từ PHẢI sang TRÁI; hai chiều hợp nhau khi bằng nhau, hoặc một bên bằng 1 (hoặc '
            'không có). (3, 2) * (2,) → (3, 2): vector giá được "kéo" cho từng hàng.',
            'a.mean(axis=0) có shape (2,); thêm keepdims=True thì shape (1, 2) — viết rõ "một hàng mean" nên a − mean trừ '
            'đúng từng cột. Với phép theo hàng (axis=1) thì bắt buộc keepdims: (3, 1) mới trừ/chia được cho (3, 2).',
            'Shape không hợp, như (3, 2) − (3,), báo ValueError: operands could not be broadcast. Nguy hiểm hơn là ma trận '
            'vuông: nhầm axis vẫn broadcast được nên không có lỗi, chỉ có số sai.',
            'z-score = (x − mean) / std. Cột hằng có std = 0 → chia cho 0 ra nan; thay std bằng 1 ở những cột đó '
            '(np.where(std == 0, 1, std)) để kết quả là 0. Khi chuẩn hoá dữ liệu mới, dùng lại mean/std của tập tham chiếu.',
            'Broadcast không có nghĩa là không tốn bộ nhớ: kết quả shape (10000, 10000) vẫn được cấp phát đầy đủ.',
        ],
        predict=dict(q='a có shape (3, 2). a − a.mean(axis=1) chạy thế nào?', options=[
            ('ValueError — mean theo hàng có shape (3,), không khớp chiều cuối 2', 'So từ phải: 2 với 3 không bằng nhau và không có 1.', True),
            ('Trừ mean của từng hàng', 'Muốn vậy phải keepdims=True để có shape (3, 1).', False),
            ('Trừ mean của từng cột', 'mean(axis=1) là mean theo hàng.', False),
        ]),
        myth=('"Không báo lỗi broadcast nghĩa là đã trừ đúng chiều"',
              'Với ma trận vuông (2, 2), a − a.mean(axis=1) vẫn chạy: mean theo hàng shape (2,) bị kéo theo CỘT, cho số sai '
              'mà không lỗi. Viết shape mong muốn trước khi tính và dùng keepdims=True để chiều bị gộp vẫn hiện ra — (1, n) '
              'là mean cột, (m, 1) là mean hàng.'),
        mcq=[
            dict(q='Shape nào broadcast được với (4, 3)?', options=[
                ('(1, 3) — chiều 1 được kéo thành 4', 'Từ phải: 3 = 3, còn 1 kéo được.', True),
                ('(4,)', 'Từ phải: 3 với 4 không khớp → ValueError.', False),
                ('(3, 4)', 'Cả hai chiều đều lệch.', False),
            ]),
            dict(q='Chuẩn hoá z-score cột [5, 5, 5] mà không xử lý gì thì ra gì?', options=[
                ('nan — std = 0 nên thành 0/0', 'Cần thay std = 0 bằng 1 để ra 0.', True),
                ('0', 'Chỉ khi đã xử lý std = 0.', False),
                ('5', 'Mean đã bị trừ đi.', False),
            ]),
            dict(q='a.mean(axis=0, keepdims=True) với a shape (3, 2) có shape gì?', options=[
                ('(1, 2)', 'Chiều bị gộp vẫn còn, với độ dài 1.', True),
                ('(2,)', 'Đó là khi không có keepdims.', False),
                ('(3, 1)', 'Đó là mean theo hàng với keepdims.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao cần keepdims=True và xử lý std = 0 khi chuẩn hoá theo cột?',
            sample='keepdims=True giữ chiều bị gộp với độ dài 1 (mean cột có shape (1, n)), nên phép trừ broadcast rõ ràng '
                   'theo cột và không vô tình khớp nhầm chiều khi ma trận vuông. Cột hằng có std = 0, chia sẽ ra nan; thay '
                   'std bằng 1 ở cột đó để z-score bằng 0, đúng ý nghĩa "không lệch khỏi mean".'),
        scaffold=dict(
            intro='Dữ liệu mới: chuẩn hoá theo HÀNG (mỗi hàng là một học viên, mỗi cột một môn). Lắp đúng chiều.',
            template=r'''import numpy as np

marks = np.array([[6.0, 8.0, 10.0], [5.0, 5.0, 5.0]])
row_mean = marks.mean({{slot1}})
row_std = marks.std(axis=1, keepdims=True)
safe = {{slot2}}
z = {{slot3}}
''',
            slots=['axis=1, keepdims=True', 'np.where(row_std == 0, 1, row_std)', '(marks - row_mean) / safe'],
            hints=['Mean theo TỪNG HỌC VIÊN, và giữ lại chiều để còn trừ được',
                   'Thay độ lệch 0 bằng một số chia được, giữ nguyên các giá trị khác',
                   'Công thức z, chia cho mẫu số đã chống 0'],
            traps=[('axis=1', 1, 'Shape (2,) không trừ được cho (2, 3) — cần (2, 1).'),
                   ('axis=0, keepdims=True', 1, 'Đó là mean từng cột (từng môn), không phải từng học viên.'),
                   ('(marks - row_mean) / row_std', 3, 'Hàng hằng có std = 0 → nan.')]),
        flow=['mean(axis=0, keepdims=True) → [[3., 30.]], shape (1, 2)',
              'a − mean → [[-1., -10.], [1., 10.]]',
              '[[1, 5], [3, 5]].std(axis=0) → [1., 0.]',
              'np.where(std == 0, 1, std) → cột hằng chia cho 1, ra 0'],
        transfer='Thử array 3 × 2 và 3 × 3 có một cột hằng: kiểm từng cột sau khi trừ có mean 0, cột hằng ra 0 chứ không nan.',
        counter=dict(q='zscore_columns([[0, 7], [10, 7]]) → ?',
                     options=['[[-1, 0], [1, 0]]', '[[-1, nan], [1, nan]]', '[[-5, 0], [5, 0]]'], correct='[[-1, 0], [1, 0]]'),
        practice='Đổi đầu vào sang float, lấy mean/std với axis=0, keepdims=True, thay std = 0 bằng 1 trước khi chia.',
        steps=['center_columns: a = np.asarray(a, dtype=float); return a - a.mean(axis=0, keepdims=True).',
               'zscore_columns: std = a.std(axis=0, keepdims=True); safe = np.where(std == 0, 1, std).',
               'return (a - a.mean(axis=0, keepdims=True)) / safe — phép trừ tạo array mới, a không đổi.'],
        partial=r'''def center_columns(a):
    a = np.asarray(a, dtype=float)
    mean = a.mean(axis=0, keepdims=True)
    ...''',
        io=[('center_columns([[2, 20], [4, 40]])', '[[-1, -10], [1, 10]]'),
            ('zscore_columns([[1, 5], [3, 5]])', '[[-1, 0], [1, 0]] — cột hằng ra 0')],
        contracts=[K_CENTER, K_ZSCORE],
        starter=r'''import numpy as np


def center_columns(a):
    pass


def zscore_columns(a):
    pass
''',
        solution=N03_SOLUTION,
        tests=[
            T('Đề mẫu: trừ mean từng cột', R2('center_columns([[2, 20], [4, 40]])'), [[-1.0, -10.0], [1.0, 10.0]]),
            T('3 × 3: không nhầm axis', R2('center_columns([[1, 10, 100], [3, 30, 300], [5, 50, 500]])'),
              [[-2.0, -20.0, -200.0], [0.0, 0.0, 0.0], [2.0, 20.0, 200.0]]),
            T('3 × 2: giữ shape, mỗi cột có mean 0',
              "(lambda c: (tuple(c.shape), " + R1('c.mean(axis=0)', 6) + "))(center_columns([[1, 2], [3, 4], [5, 9]]))",
              ((3, 2), [0.0, 0.0])),
            T('z-score có cột hằng → 0, không nan', R2('zscore_columns([[1, 5], [3, 5]])'), [[-1.0, 0.0], [1.0, 0.0]]),
            T('z-score dữ liệu khác (3 hàng)', R2('zscore_columns([[2, 1], [4, 1], [6, 1]])'),
              [[-1.2247, 0.0], [0.0, 0.0], [1.2247, 0.0]]),
            T('z-score không có cột hằng', R2('zscore_columns([[0, 2], [10, 6]])'), [[-1.0, -1.0], [1.0, 1.0]]),
            TX('Không sửa array đầu vào', "(lambda x: (center_columns(x), x.tolist())[1])(np.array([[1.0, 2.0], [3.0, 6.0]]))",
               '[[1.0, 2.0], [3.0, 6.0]]'),
        ],
        bad=[('trừ mean theo hàng', N03_SOLUTION.replace('mean = a.mean(axis=0, keepdims=True)', 'mean = a.mean(axis=1, keepdims=True)')),
             ('không xử lý std = 0', N03_SOLUTION.replace('return (a - a.mean(axis=0, keepdims=True)) / safe',
                                                          'return (a - a.mean(axis=0, keepdims=True)) / std')),
             ('trừ tại chỗ trên đầu vào', N03_SOLUTION.replace('    return a - mean\n', '    a -= mean\n    return a\n'))],
    ),

    # ------------------------------------------------------------------ N04
    dict(
        code='N04', title='Thống kê, NaN và trọng số', minutes=35,
        goal='Tính thống kê bỏ qua NaN đúng cách và trung bình có trọng số.',
        prereq='N03', env=NP_ENV, packages=['numpy'],
        brief='Viết nan_summary(values) trả dict: valid (số quan sát hợp lệ — không phải NaN), mean (nanmean), median '
              '(nanmedian); KHÔNG thay NaN bằng 0. Viết weighted_gpa(marks, credits): điểm trung bình có trọng số theo số '
              'tín chỉ, bỏ các môn có điểm NaN (bỏ luôn tín chỉ của môn đó).',
        example='nan_summary([4, nan, 8, 10]) → valid 3, mean 7.333…, median 8.0; weighted_gpa([7, 8], [2, 3]) → 7.6.',
        demo=r'''import numpy as np

wait = np.array([5.0, 7.0, np.nan, 6.0, 60.0])   # phút chờ: 1 ô thiếu, 1 ngoại lai
print(np.isnan(wait).sum(), (wait == np.nan).sum())
print(wait.mean(), np.nanmean(wait), np.nanmedian(wait))
print(round(np.nanstd(wait), 2), round(np.nanstd(wait, ddof=1), 2))
print(np.nanquantile(wait, [0.25, 0.5, 0.75]))
print(np.average([6.0, 9.0], weights=[1, 3]))
''',
        explain=[
            'NaN (np.nan) đánh dấu "thiếu" trong array số thực. Mọi phép tính dính NaN đều ra NaN: np.mean([7, nan, 9]) là nan.',
            'NaN không bằng chính nó: x == np.nan luôn False. Kiểm bằng np.isnan(a) (hoặc np.isfinite(a) để loại cả inf); '
            'đếm ô thiếu bằng np.isnan(a).sum().',
            'np.nanmean / np.nanmedian / np.nanstd bỏ NaN rồi mới tính. Thay NaN bằng 0 là BỊA dữ liệu: [4, 0, 8, 10] cho '
            'mean 5.5 thay vì 7.33.',
            'Mean nhạy với ngoại lai; median và quantile mô tả vị trí theo cách khác: [1, 2, 3, 100] có mean 26.5 nhưng '
            'median 2.5.',
            'np.average(a, weights=w) = Σ a·w / Σ w — GPA theo tín chỉ. std mặc định ddof=0 (chia n); ddof=1 cho độ lệch '
            'chuẩn mẫu (chia n − 1) — ghi rõ đang dùng định nghĩa nào. np.corrcoef đo tương quan, không chứng minh nhân quả.',
        ],
        predict=dict(q='a = np.array([7.0, np.nan, 9.0]). (a == np.nan).sum() bằng mấy?', options=[
            ('0 — NaN không bằng bất cứ thứ gì, kể cả chính nó', 'Phải dùng np.isnan(a).sum() → 1.', True),
            ('1', 'Đó là kết quả của np.isnan(a).sum().', False),
            ('Báo lỗi', 'So sánh chạy bình thường, chỉ là luôn False.', False),
        ]),
        myth=('"Ô thiếu thì điền 0 cho dễ tính"',
              'Điền 0 là thêm một quan sát GIẢ: [4, NaN, 8, 10] thành [4, 0, 8, 10], mean tụt từ 7.33 xuống 5.5 và số quan '
              'sát tăng từ 3 lên 4. Dùng nanmean/nanmedian để bỏ ô thiếu; nếu thật sự phải điền thì đó là một quyết định '
              'phân tích cần ghi rõ.'),
        mcq=[
            dict(q='Điểm [7, 8], tín chỉ [2, 3]. np.average(điểm, weights=tín chỉ) bằng bao nhiêu?', options=[
                ('7.6 = (7·2 + 8·3) / 5', 'Trọng số lớn kéo kết quả về phía điểm đó.', True),
                ('7.5', 'Đó là mean thường, bỏ qua tín chỉ.', False),
                ('38', 'Đó là tổng có trọng số chưa chia Σ trọng số.', False),
            ]),
            dict(q='a = [1, 2, 3, 100]. Thống kê nào mô tả "điểm giữa" ít bị 100 kéo lệch?', options=[
                ('Median = 2.5', 'Median chỉ phụ thuộc thứ tự.', True),
                ('Mean = 26.5', 'Mean bị ngoại lai kéo lên.', False),
                ('Max = 100', 'Max chính là ngoại lai.', False),
            ]),
            dict(q='np.std(a) và np.std(a, ddof=1) khác nhau thế nào?', options=[
                ('ddof=0 chia n (tổng thể), ddof=1 chia n − 1 (mẫu) nên lớn hơn một chút', 'Ghi rõ định nghĩa đang dùng.', True),
                ('Giống hệt nhau', 'Mẫu số khác nhau.', False),
                ('ddof=1 bỏ qua NaN', 'Bỏ NaN là việc của np.nanstd.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao không đếm ô thiếu bằng a == np.nan và không điền 0 vào chỗ thiếu?',
            sample='NaN không bằng chính nó nên a == np.nan luôn False — đếm ra 0 dù có ô thiếu; phải dùng np.isnan. Điền 0 '
                   'tạo ra quan sát giả: số quan sát tăng và mean bị kéo xuống. nanmean/nanmedian bỏ ô thiếu và tính trên '
                   'dữ liệu thật.'),
        scaffold=dict(
            intro='Dữ liệu mới: thời gian chờ (phút) có ô thiếu, và GPA ba môn có một môn chưa có điểm.',
            template=r'''import numpy as np

wait = np.array([5.0, np.nan, 6.0, 60.0])
missing = {{slot1}}
typical = {{slot2}}
marks = np.array([6.0, 9.0, np.nan])
credits = np.array([1, 3, 2])
ok = {{slot3}}
gpa = np.average(marks[ok], weights={{slot4}})
''',
            slots=['np.isnan(wait).sum()', 'np.nanmedian(wait)', '~np.isnan(marks)', 'credits[ok]'],
            hints=['Đếm ô thiếu — NaN phải nhận bằng hàm, không bằng phép so bằng',
                   'Giá trị điển hình, chịu được cả ô thiếu lẫn một số lệch hẳn',
                   'Mask chọn các môn ĐÃ có điểm',
                   'Trọng số phải lọc cùng mask với điểm, không thì lệch shape'],
            traps=[('(wait == np.nan).sum()', 1, 'NaN không bằng chính nó → luôn đếm ra 0.'),
                   ('np.median(wait)', 2, 'Có NaN → kết quả nan.'),
                   ('credits', 4, 'Thiếu lọc: 3 tín chỉ cho 2 điểm → lỗi lệch shape.')]),
        flow=['np.isfinite([4, nan, 8, 10]).sum() → 3 quan sát',
              'np.nanmean → (4 + 8 + 10) / 3 = 7.33',
              'np.nanmedian → 8.0',
              '~np.isnan(marks) → bỏ môn thiếu điểm cùng tín chỉ của nó',
              'np.average([7, 8], weights=[2, 3]) → 7.6'],
        transfer='Thử dữ liệu có hai ô thiếu và dữ liệu không có ô thiếu nào; GPA có một môn thiếu điểm phải ra như khi xoá '
                 'hẳn môn đó.',
        counter=dict(q='nan_summary([nan, 1, 2, nan, 6])["mean"] = ?', options=['3.0', '1.8', 'nan'], correct='3.0'),
        practice='Đổi về float, đếm bằng np.isfinite, tính bằng np.nanmean/np.nanmedian; GPA lọc mask ~np.isnan(marks) cho '
                 'cả điểm lẫn tín chỉ.',
        steps=['a = np.asarray(values, dtype=float); valid = int(np.isfinite(a).sum()).',
               'mean = float(np.nanmean(a)); median = float(np.nanmedian(a)).',
               'weighted_gpa: ok = ~np.isnan(m); return float(np.average(m[ok], weights=c[ok])).'],
        partial=r'''def weighted_gpa(marks, credits):
    m = np.asarray(marks, dtype=float)
    c = np.asarray(credits, dtype=float)
    ok = ~np.isnan(m)
    ...''',
        io=[('nan_summary([4, nan, 8, 10])', 'valid 3 · mean 7.333… · median 8.0'),
            ('weighted_gpa([7, 8, nan], [2, 3, 4])', '7.6 — môn thiếu điểm bị bỏ cùng tín chỉ')],
        contracts=[K_NANSUM, K_GPA],
        starter=r'''import numpy as np


def nan_summary(values):
    pass


def weighted_gpa(marks, credits):
    pass
''',
        solution=N04_SOLUTION,
        tests=[
            T('Đề mẫu: 3 quan sát hợp lệ', f"nan_summary([4, {NAN}, 8, 10])['valid']", 3),
            T('Đề mẫu: mean bỏ NaN', f"round(nan_summary([4, {NAN}, 8, 10])['mean'], 4)", 7.3333),
            T('Đề mẫu: median bỏ NaN', f"round(nan_summary([4, {NAN}, 8, 10])['median'], 4)", 8.0),
            T('Dữ liệu khác: hai ô thiếu',
              f"(lambda d: (d['valid'], round(d['mean'], 4), round(d['median'], 4)))(nan_summary([{NAN}, 1, 2, {NAN}, 6]))",
              (3, 3.0, 2.0)),
            T('Không có ô thiếu (có ngoại lai)',
              "(lambda d: (d['valid'], round(d['mean'], 4), round(d['median'], 4)))(nan_summary([1, 2, 3, 100]))",
              (4, 26.5, 2.5)),
            T('GPA có trọng số', 'round(weighted_gpa([7, 8], [2, 3]), 4)', 7.6),
            T('GPA bỏ môn thiếu điểm cùng tín chỉ', f'round(weighted_gpa([7, 8, {NAN}], [2, 3, 4]), 4)', 7.6),
            T('GPA dữ liệu khác', 'round(weighted_gpa([10, 5, 6], [1, 1, 2]), 4)', 6.75),
        ],
        bad=[('mean thường gặp NaN', N04_SOLUTION.replace('"mean": float(np.nanmean(a)),', '"mean": float(np.mean(a)),')),
             ('thay NaN bằng 0', N04_SOLUTION.replace('    a = np.asarray(values, dtype=float)\n',
                                                       '    a = np.nan_to_num(np.asarray(values, dtype=float))\n')),
             ('đếm thiếu bằng != np.nan', N04_SOLUTION.replace('"valid": int(np.isfinite(a).sum()),',
                                                               '"valid": int((a != np.nan).sum()),')),
             ('bỏ trọng số', N04_SOLUTION.replace('return float(np.average(m[ok], weights=c[ok]))', 'return float(np.mean(m[ok]))'))],
    ),

    # ------------------------------------------------------------------ N05
    dict(
        code='N05', title='View, copy và sai số số thực', minutes=30,
        goal='Biết khi nào slice sửa luôn array gốc, và so sánh số thực bằng tolerance.',
        prereq='N04', env=NP_ENV, packages=['numpy'],
        brief='Viết scaled_head(a, k, factor): trả array MỚI gồm k phần tử đầu của a nhân với factor; array a của người '
              'gọi phải giữ nguyên, và kết quả không được dùng chung bộ nhớ với a. Viết totals_match(parts, total): True '
              'nếu tổng các phần tử của parts bằng total trong sai số cho phép (np.isclose), không so bằng ==.',
        example='a = np.array([10, 20, 30]); scaled_head(a, 2, 2) → [20, 40] và a vẫn là [10, 20, 30]; '
                'totals_match([0.1, 0.2], 0.3) → True.',
        demo=r'''import numpy as np

scores = np.array([4, 5, 6, 7])
window = scores[1:3]           # slice → view, chung bộ nhớ
window[0] = 50
print(scores)

picked = scores[scores > 5]    # mask → copy
picked[0] = -1
print(scores, picked)

safe = scores[:2].copy()
safe[:] = 0
print(scores, np.shares_memory(scores, window), np.shares_memory(scores, safe))

print(np.array([2.7, -1.5]).astype(int))   # cắt phần thập phân, không làm tròn
print(0.1 + 0.2, 0.1 + 0.2 == 0.3, np.isclose(0.1 + 0.2, 0.3))
''',
        explain=[
            'Slice cơ bản (a[1:3], a[:, 0]) trả VIEW: một cửa sổ nhìn vào cùng bộ nhớ. Gán vào view (window[0] = 50, '
            'head *= 2) là sửa luôn array gốc.',
            'Boolean mask và fancy indexing (a[a > 5], a[[0, 2]]) trả COPY. Muốn chắc chắn độc lập thì gọi .copy(); '
            'np.shares_memory(x, y) cho biết hai array có dùng chung bộ nhớ không.',
            'Phép toán tạo kết quả mới (a[:2] * 2) cho array MỚI; còn *=, +=, gán vào chỉ số là sửa TẠI CHỖ và giữ nguyên '
            'dtype (head *= 1.5 trên array số nguyên báo UFuncTypeError — khi đó dùng a[:k] * 1.5). reshape cũng có thể '
            'trả view — đừng mặc định là nó đã sao chép.',
            'astype(int) CẮT phần thập phân (2.7 → 2, −1.5 → −1), không làm tròn; muốn làm tròn thì np.round trước. dtype '
            'nhỏ hơn (float32, int8) tiết kiệm bộ nhớ nhưng có thể mất độ chính xác hoặc tràn số.',
            'Số thực nhị phân không biểu diễn đúng 0.1: 0.1 + 0.2 = 0.30000000000000004. So bằng np.isclose / np.allclose '
            '(hoặc math.isclose) với tolerance phù hợp, không dùng ==.',
        ],
        predict=dict(q='Sau ba dòng dưới, a là gì?', code='a = np.array([1, 2, 3])\nb = a[:2]\nb[0] = 9', options=[
            ('[9, 2, 3] — b là view của a', 'Slice cơ bản dùng chung bộ nhớ với array gốc.', True),
            ('[1, 2, 3]', 'Chỉ đúng nếu b = a[:2].copy().', False),
            ('[9, 2]', 'a vẫn có 3 phần tử; b mới có 2.', False),
        ]),
        myth=('"Cắt slice là đã có bản sao riêng, như list Python"',
              'Với list Python, lst[:2] là bản sao; với NumPy, a[:2] là VIEW. Sửa tại chỗ trên view (b[0] = 9, b *= 2) làm '
              'array của người gọi đổi theo — lỗi khó thấy vì hàm vẫn trả đúng kết quả. Gọi .copy() khi cần độc lập.'),
        mcq=[
            dict(q='Phép nào trả COPY chứ không phải view?', options=[
                ('a[a > 0]', 'Boolean mask luôn tạo array mới.', True),
                ('a[1:4]', 'Slice cơ bản là view.', False),
                ('a[:, 0]', 'Vẫn là slice cơ bản — view.', False),
            ]),
            dict(q='np.array([1.9, 2.1]).astype(int) cho gì?', options=[
                ('[1, 2] — cắt phần thập phân', 'Muốn [2, 2] thì np.round trước rồi mới astype.', True),
                ('[2, 2]', 'astype không làm tròn.', False),
                ('Lỗi vì mất thông tin', 'NumPy cho phép, chỉ âm thầm cắt.', False),
            ]),
            dict(q='Kiểm 0.1 + 0.2 có "bằng" 0.3 không, cách nào đúng?', options=[
                ('np.isclose(0.1 + 0.2, 0.3) → True', 'Sai số làm tròn nằm trong tolerance.', True),
                ('0.1 + 0.2 == 0.3 → True', 'Thực tế là False: tổng là 0.30000000000000004.', False),
                ('int(0.1 + 0.2) == int(0.3) → True rồi kết luận bằng nhau', 'Đúng là True, nhưng vì cả hai bị cắt về 0 — so như vậy vô nghĩa.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao scaled_head phải copy trước khi nhân tại chỗ, và vì sao so số thực bằng np.isclose?',
            sample='a[:k] là view dùng chung bộ nhớ với a; nhân tại chỗ (*=) trên view sẽ sửa array của người gọi. copy() '
                   'tạo bộ nhớ riêng nên chỉ kết quả đổi. Số thực nhị phân có sai số làm tròn (0.1 + 0.2 = '
                   '0.30000000000000004) nên == có thể sai dù hai số "bằng nhau"; np.isclose so trong một sai số cho phép.'),
        scaffold=dict(
            intro='Dữ liệu mới: nhân đôi giá 3 sản phẩm đầu mà không sửa bảng giá gốc, rồi kiểm tổng.',
            template=r'''import numpy as np

prices = np.array([1.1, 2.2, 4.0, 9.9])
first = prices[:3]{{slot1}}
first *= 2
same = np.shares_memory(prices, first)
total_ok = {{slot2}}
''',
            slots=['.copy()', 'np.isclose(first.sum(), 14.6)'],
            hints=['Tách hẳn khỏi bảng gốc — lát cắt vẫn chia chung bộ nhớ',
                   'So tổng số thực theo SAI SỐ, không so bằng tuyệt đối'],
            traps=[('[:]', 1, 'prices[:3][:] vẫn là view của prices.'),
                   ('first.sum() == 14.6', 2, 'Tổng thực tế là 14.600000000000001 → == cho False.')]),
        flow=['a[:2] → view, chung bộ nhớ với a',
              'a[:2].copy() → bộ nhớ riêng',
              'head *= 2 → chỉ head đổi, a giữ [10, 20, 30]',
              'np.sum([0.1, 0.2]) → 0.30000000000000004',
              'np.isclose(tổng, 0.3) → True, còn == cho False'],
        transfer='Thử array số thực và k bằng cả độ dài array; sau mỗi lời gọi in lại array gốc để chắc nó không đổi.',
        counter=dict(q='totals_match([1.1, 2.2], 3.3) → ?', options=['True', 'False', 'Lỗi'], correct='True'),
        practice='Lấy a[:k].copy() rồi mới nhân (hoặc a[:k] * factor — phép * tạo array mới); tổng dùng np.sum và so '
                 'bằng np.isclose.',
        steps=['head = a[:k].copy(); head *= factor; return head.',
               'totals_match: return bool(np.isclose(np.sum(parts), total)).'],
        partial=r'''def scaled_head(a, k, factor):
    head = a[:k].copy()
    ...''',
        io=[('scaled_head(np.array([10, 20, 30]), 2, 2)', '[20, 40]; a vẫn [10, 20, 30]'),
            ('totals_match([0.1, 0.2], 0.3)', 'True'),
            ('totals_match([0.1, 0.2], 0.31)', 'False')],
        contracts=[K_HEAD, K_TOTAL],
        starter=r'''import numpy as np


def scaled_head(a, k, factor):
    pass


def totals_match(parts, total):
    pass
''',
        solution=N05_SOLUTION,
        tests=[
            T('2 phần tử đầu × 2', I1('scaled_head(np.array([10, 20, 30]), 2, 2)'), [20, 40]),
            T('Array gốc giữ nguyên', keeps('scaled_head(a, 2, 2)', [10, 20, 30]), [10, 20, 30]),
            T('Số thực, k = 3 (dữ liệu khác)',
              "(lambda a: (" + R1('scaled_head(a, 3, 0.5)') + ", a.tolist()))(np.array([2.0, 4.0, 6.0, 8.0]))",
              ([1.0, 2.0, 3.0], [2.0, 4.0, 6.0, 8.0])),
            T('k = 0 → rỗng', 'len(scaled_head(np.array([1, 2]), 0, 3))', 0),
            T('Sửa kết quả không làm đổi a',
              '(lambda a: (lambda h: (h.__setitem__(0, 99), a.tolist())[1])(scaled_head(a, 2, 1)))(np.array([5, 6, 7]))',
              [5, 6, 7]),
            T('0.1 + 0.2 so với 0.3', 'totals_match([0.1, 0.2], 0.3)', True),
            T('1.1 + 2.2 so với 3.3', 'totals_match([1.1, 2.2], 3.3)', True),
            T('Lệch thật → False', 'totals_match([0.1, 0.2], 0.31)', False),
        ],
        bad=[('sửa tại chỗ trên view', N05_SOLUTION.replace('head = a[:k].copy()', 'head = a[:k]')),
             ('so số thực bằng ==', N05_SOLUTION.replace('return bool(np.isclose(np.sum(parts), total))',
                                                        'return bool(np.sum(parts) == total)'))],
    ),

    # ------------------------------------------------------------------ N06
    dict(
        code='N06', title='Đọc dữ liệu và mô phỏng tái lập', minutes=35,
        goal='Đọc bảng số có ô trống bằng genfromtxt và tạo mô phỏng ngẫu nhiên tái lập được bằng seed.',
        prereq='N05', support=['readings.csv'], env=NP_ENV, packages=['numpy'],
        brief='readings.csv (đã cấp) có dòng tiêu đề, ba cột day, temp, humidity và vài ô trống. Viết load_readings(path) '
              'đọc HAI cột temp, humidity thành array số thực (ô trống → nan) bằng np.genfromtxt. Viết column_means(path) '
              'trả mean từng cột, bỏ qua nan. Viết roll_dice(seed, n): tung xúc xắc n lần bằng np.random.default_rng(seed), '
              'trả array số nguyên 1..6 — cùng seed phải cho cùng kết quả, và hàm không được đụng tới RNG toàn cục '
              'np.random.',
        example='load_readings("readings.csv") có shape (4, 2) và 2 ô nan; column_means → [30.33, 69.0]; roll_dice(7, 5) '
                'gọi hai lần cho cùng 5 số.',
        demo=r'''import numpy as np
from io import BytesIO, StringIO

clean = "x,y\n1,2\n3,4"
print(np.loadtxt(StringIO(clean), delimiter=",", skiprows=1))

messy = "x,y\n1,\n3,4"
a = np.genfromtxt(StringIO(messy), delimiter=",", skip_header=1)
print(a, np.isnan(a).sum())

rng = np.random.default_rng(2026)
print(rng.integers(1, 7, size=5))
print(np.random.default_rng(2026).integers(1, 7, size=5))   # cùng seed → cùng dãy
print(rng.normal(0, 1, size=2).round(3))                    # rng đi tiếp, số mới

buffer = BytesIO()
np.save(buffer, a)
buffer.seek(0)
print(np.load(buffer).shape)
''',
        explain=[
            'np.loadtxt đọc bảng SỐ SẠCH: delimiter tách cột, skiprows bỏ dòng tiêu đề, usecols chọn cột, dtype ép kiểu. Gặp '
            'ô trống hay chữ là ValueError.',
            'np.genfromtxt linh hoạt hơn: ô trống hoặc không đọc được thành nan (bỏ tiêu đề bằng skip_header, không phải '
            'skiprows). Đọc xong kiểm shape và số nan, rồi tính bằng nanmean như bài N04.',
            'np.random.default_rng(seed) tạo một generator RIÊNG. Cùng seed (và cùng phiên bản NumPy) → cùng dãy số: kết quả '
            'mô phỏng tái lập được. Không seed thì mỗi lần chạy một khác.',
            'rng.integers(low, high) KHÔNG lấy high: xúc xắc là integers(1, 7). Đừng gọi np.random.seed(...) trong hàm — '
            'nó đặt lại RNG toàn cục và làm đổi kết quả của mọi phần khác trong chương trình đang dùng RNG đó.',
            'np.save/np.load lưu array kèm dtype và shape (.npy); np.savetxt ghi ra text cho người đọc. Ghi lại seed và '
            'phiên bản thư viện cùng kết quả. Dữ liệu mô phỏng chỉ để minh hoạ — không phải dữ liệu quan sát hay bằng chứng.',
        ],
        predict=dict(q='Hai dòng dưới in ra hai dãy thế nào?',
                     code='print(np.random.default_rng(42).integers(1, 7, size=3))\nprint(np.random.default_rng(42).integers(1, 7, size=3))',
                     options=[
                         ('Giống hệt nhau — mỗi dòng tạo generator mới với cùng seed 42', 'Seed quyết định toàn bộ dãy.', True),
                         ('Khác nhau vì là số ngẫu nhiên', 'Chỉ đúng khi không truyền seed.', False),
                         ('Lỗi vì một seed chỉ dùng được một lần', 'Seed dùng bao nhiêu lần cũng được.', False),
                     ]),
        myth=('"Đặt np.random.seed(...) ở đầu chương trình là đủ tái lập"',
              'RNG toàn cục bị MỌI đoạn code dùng chung: một hàm khác rút thêm số là dãy của bạn lệch theo, và hàm nào gọi '
              'seed lại sẽ đổi kết quả của phần khác. default_rng(seed) cho mỗi mô phỏng một generator riêng — nhận seed '
              'làm tham số và ghi seed ra cùng kết quả.'),
        mcq=[
            dict(q='File có ô trống "1,\\n3,4". Hàm nào đọc được mà không lỗi?', options=[
                ('np.genfromtxt(..., delimiter=",") — ô trống thành nan', 'genfromtxt xử lý giá trị thiếu.', True),
                ('np.loadtxt(..., delimiter=",")', 'loadtxt báo ValueError với ô trống.', False),
                ('Cả hai như nhau', 'Chỉ genfromtxt xử lý ô thiếu.', False),
            ]),
            dict(q='rng.integers(1, 6, size=1000) có bao giờ ra 6 không?', options=[
                ('Không — high = 6 bị loại; xúc xắc phải là integers(1, 7)', 'Giống range và arange.', True),
                ('Có, cả 1 và 6 đều được lấy', 'integers mặc định không lấy high (endpoint=False).', False),
                ('Thỉnh thoảng', 'Không bao giờ.', False),
            ]),
            dict(q='Muốn lưu array để lần sau nạp lại đúng dtype và shape, dùng gì?', options=[
                ('np.save("a.npy", a) rồi np.load("a.npy")', 'File .npy giữ dtype và shape.', True),
                ('print(a) rồi chép lại', 'Mất độ chính xác và cấu trúc.', False),
                ('np.savetxt cho array 3 chiều', 'savetxt chỉ ghi array 1D/2D ra text.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao dùng default_rng(seed) cục bộ thay vì np.random.seed toàn cục cho một mô phỏng?',
            sample='default_rng(seed) tạo generator riêng: cùng seed cho cùng dãy, và không phần code nào khác rút số từ nó '
                   'nên kết quả không bị lệch. np.random.seed đặt lại RNG dùng chung — vừa dễ bị code khác làm lệch dãy, '
                   'vừa làm thay đổi kết quả của những phần khác đang dùng RNG toàn cục.'),
        scaffold=dict(
            intro='Dữ liệu mới: điểm hai bài kiểm tra có ô trống, và mô phỏng tung đồng xu.',
            template=r'''import numpy as np
from io import StringIO

text = "id,quiz1,quiz2\n1,7,\n2,9,6\n"
marks = np.genfromtxt(StringIO(text), delimiter=",", {{slot1}}, usecols=(1, 2))
means = {{slot2}}
rng = {{slot3}}
coins = rng.integers(0, 2, size=10)
''',
            slots=['skip_header=1', 'np.nanmean(marks, axis=0)', 'np.random.default_rng(2026)'],
            hints=['Tham số bỏ dòng tiêu đề — tên riêng của genfromtxt',
                   'Trung bình từng cột, bỏ qua ô trống',
                   'Nguồn số ngẫu nhiên CÓ seed, để chạy lại ra đúng kết quả cũ'],
            traps=[('skiprows=1', 1, 'Đó là tên tham số của loadtxt; genfromtxt dùng skip_header → TypeError.'),
                   ('marks.mean(axis=0)', 2, 'Cột có nan → kết quả nan.'),
                   ('np.random.default_rng()', 3, 'Không seed → mỗi lần chạy một khác.')]),
        flow=['genfromtxt(skip_header=1, usecols=(1, 2)) → array (4, 2)',
              'Ô trống trong CSV → nan',
              'np.nanmean(axis=0) → [30.33, 69.0]',
              'default_rng(7).integers(1, 7, size=5) → 5 số trong 1..6',
              'default_rng(7) tạo lại → đúng 5 số đó'],
        transfer='Thử file không có ô trống và file có cột day khác; với roll_dice, đổi seed phải đổi dãy, giữ seed phải giữ dãy.',
        counter=dict(q='column_means của "day,temp,humidity\\n1,20,50\\n2,22,54\\n3,24,58" → ?',
                     options=['[22.0, 54.0]', '[2.0, 22.0, 54.0]', '[nan, nan]'], correct='[22.0, 54.0]'),
        practice='genfromtxt(path, delimiter=",", skip_header=1, usecols=(1, 2)); np.nanmean(..., axis=0); '
                 'rng = np.random.default_rng(seed); rng.integers(1, 7, size=n).',
        steps=['load_readings: return np.genfromtxt(path, delimiter=",", skip_header=1, usecols=(1, 2)).',
               'column_means: return np.nanmean(load_readings(path), axis=0).',
               'roll_dice: rng = np.random.default_rng(seed); return rng.integers(1, 7, size=n).'],
        partial=r'''def roll_dice(seed, n):
    rng = np.random.default_rng(seed)
    ...''',
        io=[('load_readings("readings.csv")', 'shape (4, 2); 2 ô nan'),
            ('column_means("readings.csv")', '[30.33, 69.0]'),
            ('roll_dice(7, 5) gọi hai lần', 'cùng 5 số trong 1..6')],
        contracts=[K_LOAD, K_MEANS, K_DICE],
        starter=r'''import numpy as np


def load_readings(path):
    pass


def column_means(path):
    pass


def roll_dice(seed, n):
    pass
''',
        solution=N06_SOLUTION,
        tests=[
            T('readings.csv: shape (4, 2), 2 ô nan',
              "(lambda a: (tuple(a.shape), int(np.isnan(a).sum())))(load_readings('readings.csv'))", ((4, 2), 2)),
            T('Mean từng cột bỏ nan', R1("column_means('readings.csv')", 2), [30.33, 69.0]),
            T('Bỏ cột day (dữ liệu khác)', R2(f"load_readings(_studio.write('r2.csv', {READINGS_3!r}))"), [[1.5, 2.5], [3.5, 4.5]]),
            T('File không có ô trống', R1(f"column_means(_studio.write('r1.csv', {READINGS_2!r}))", 2), [22.0, 54.0]),
            T('Cùng seed → cùng dãy', 'roll_dice(7, 20).tolist() == roll_dice(7, 20).tolist()', True),
            T('Seed khác → dãy khác', 'roll_dice(1, 20).tolist() != roll_dice(2, 20).tolist()', True),
            T('200 lần: đủ n số, đủ mặt 1..6', '(lambda r: (len(r), sorted(set(int(v) for v in r))))(roll_dice(3, 200))',
              (200, [1, 2, 3, 4, 5, 6])),
            T('Không đụng RNG toàn cục np.random',
              '(np.random.seed(123), roll_dice(1, 5), float(np.random.random()))[2] == (np.random.seed(123), float(np.random.random()))[1]',
              True),
        ],
        bad=[('loadtxt với ô trống', N06_SOLUTION.replace(
                 'return np.genfromtxt(path, delimiter=",", skip_header=1, usecols=(1, 2))',
                 'return np.loadtxt(path, delimiter=",", skiprows=1, usecols=(1, 2))')),
             ('generator không seed', N06_SOLUTION.replace('rng = np.random.default_rng(seed)', 'rng = np.random.default_rng()')),
             ('mean thường gặp nan', N06_SOLUTION.replace('return np.nanmean(load_readings(path), axis=0)',
                                                         'return load_readings(path).mean(axis=0)')),
             ('integers(1, 6) bỏ mất mặt 6', N06_SOLUTION.replace('rng.integers(1, 7, size=n)', 'rng.integers(1, 6, size=n)')),
             ('seed RNG toàn cục', N06_SOLUTION.replace(
                 '    rng = np.random.default_rng(seed)\n    return rng.integers(1, 7, size=n)\n',
                 '    np.random.seed(seed)\n    return np.random.randint(1, 7, size=n)\n'))],
    ),
]


BRIEFS = {
    'X01': dict(
        goal='Đọc CSV đúng sep, comment, na_values rồi kiểm schema.',
        task='load_marks(path) đọc marks.csv; schema(df) trả rows, columns, missing, mean_mark.',
        predict='Quên sep=";" thì DataFrame có mấy cột?',
        code=['import pandas as pd', '', 'def load_marks(path):', '    pass  # pd.read_csv(path, sep=..., comment=..., na_values=...)',
              '', 'def schema(df):', '    pass'],
        tests=['marks.csv → 4 dòng, 3 cột, 1 ô thiếu', 'mean_mark → 8.17 (bỏ qua ô thiếu)'],
        reflect='Vì sao read_csv không báo lỗi khi đọc sai delimiter?'),
    'X02': dict(
        goal='Chọn đúng thư viện theo đuôi file; ghi–đọc Stata không thêm index.',
        task='Điền READERS, viết reader_for(path) và stata_roundtrip(df, path).',
        predict='to_stata không có write_index=False thì đọc lại thừa cột nào?',
        code=['READERS = {".csv": "pd.read_csv"}  # điền tiếp', '', 'def reader_for(path):',
              '    pass  # đuôi .lower(); đuôi lạ → ValueError', '', 'def stata_roundtrip(df, path):', '    pass'],
        tests=['"Lab/Marks.XLSX" → "pd.read_excel"', '"notes.txt" → ValueError'],
        reflect='Vì sao phải nhìn đuôi file trước khi chọn hàm đọc?'),
    'X03': dict(
        goal='Truy vấn có tham số và lấy kết quả về pandas.',
        task='find_student(conn, name) dùng ? + params; class_average(conn, class_name) tính AVG trong SQL.',
        predict='Ghép "x\' OR \'1\'=\'1" vào f-string SQL thì lộ bao nhiêu dòng?',
        code=['def find_student(conn, name):', '    sql = "SELECT name, class, mark FROM marks WHERE name = ?"',
              '    pass  # pd.read_sql_query(..., params=...)', '', 'def class_average(conn, class_name):',
              '    pass  # AVG(mark) ... fetchone()'],
        tests=['find_student(conn, "Mai") → 1 dòng', '"x\' OR \'1\'=\'1" → DataFrame rỗng'],
        reflect='Vì sao ? + params an toàn hơn ghép chuỗi?'),
    'N01': dict(
        goal='Tạo array 2 chiều và tổng hợp đúng axis.',
        task='make_grid(n, n_cols) bằng arange/reshape; describe(a) trả shape, ndim, size, tổng cột, tổng hàng, tổng chung.',
        predict='Array (3, 4): sum(axis=0) có mấy phần tử?',
        code=['import numpy as np', '', 'def make_grid(n, n_cols):', '    pass  # np.arange(...).reshape(...)', '',
              'def describe(a):', '    pass'],
        tests=['make_grid(12, 4) → col_sums [15, 18, 21, 24]', 'make_grid(10, 4) → ValueError'],
        reflect='axis=0 gộp chiều nào, giữ chiều nào?'),
    'N02': dict(
        goal='Lọc bằng mask nhiều điều kiện, tính đồng loạt.',
        task='curve(scores, bonus): lọc 0..10, cộng bonus, chặn ở 10; grade_labels bằng np.where.',
        predict='a[(a >= 5) and (a <= 10)] chạy thế nào?',
        code=['def curve(scores, bonus):', '    a = np.asarray(scores, dtype=float)', '    pass  # mask & → + bonus → clip',
              '', 'def grade_labels(scores, cutoff):', '    pass  # np.where'],
        tests=['[3, 5, 8, 12], 0.5 → [3.5, 5.5, 8.5]', '[9.8, 7], 0.5 → [10.0, 7.5]'],
        reflect='Vì sao clip không thay được mask?'),
    'N03': dict(
        goal='Trừ mean và z-score theo cột bằng broadcasting.',
        task='center_columns(a) và zscore_columns(a) với keepdims; cột std = 0 ra 0.',
        predict='(3, 2) − mean(axis=1) có broadcast được không?',
        code=['def center_columns(a):', '    a = np.asarray(a, dtype=float)', '    pass  # a - mean(axis=0, keepdims=True)',
              '', 'def zscore_columns(a):', '    pass  # std == 0 → chia cho 1'],
        tests=['[[2, 20], [4, 40]] → [[-1, -10], [1, 10]]', '[[1, 5], [3, 5]] → [[-1, 0], [1, 0]]'],
        reflect='Vì sao ma trận vuông làm lỗi axis khó thấy?'),
    'N04': dict(
        goal='Thống kê bỏ NaN và GPA có trọng số.',
        task='nan_summary(values): valid, mean, median bỏ NaN; weighted_gpa(marks, credits) bỏ môn thiếu điểm.',
        predict='(a == np.nan).sum() với một ô thiếu bằng mấy?',
        code=['def nan_summary(values):', '    a = np.asarray(values, dtype=float)', '    pass  # isfinite, nanmean, nanmedian',
              '', 'def weighted_gpa(marks, credits):', '    pass  # mask ~np.isnan → np.average'],
        tests=['[4, nan, 8, 10] → valid 3, mean 7.33', '[7, 8], [2, 3] → 7.6'],
        reflect='Điền 0 vào ô thiếu làm sai kết quả thế nào?'),
    'N05': dict(
        goal='Tránh sửa nhầm array gốc qua view; so số thực bằng tolerance.',
        task='scaled_head(a, k, factor) không đổi a; totals_match(parts, total) dùng np.isclose.',
        predict='b = a[:2]; b[0] = 9 — a có đổi không?',
        code=['def scaled_head(a, k, factor):', '    pass  # a[:k] là view!', '', 'def totals_match(parts, total):',
              '    pass  # np.isclose, không =='],
        tests=['[10, 20, 30], k = 2, × 2 → [20, 40]; a giữ nguyên', '[0.1, 0.2] với 0.3 → True'],
        reflect='Khi nào slice NumPy khác slice list?'),
    'N06': dict(
        goal='Đọc CSV có ô trống và mô phỏng tái lập bằng seed.',
        task='load_readings/column_means bằng genfromtxt + nanmean; roll_dice(seed, n) bằng default_rng.',
        predict='default_rng(42) tạo hai lần có cho cùng dãy?',
        code=['def load_readings(path):', '    pass  # genfromtxt, skip_header, usecols', 'def column_means(path):',
              '    pass  # nanmean theo cột', 'def roll_dice(seed, n):', '    pass  # default_rng(seed).integers(1, 7, ...)'],
        tests=['readings.csv → shape (4, 2), mean [30.33, 69.0]', 'roll_dice(7, 5) hai lần → cùng 5 số'],
        reflect='Cần ghi lại gì để người khác tái lập được mô phỏng?'),
}
