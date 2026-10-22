"""Khoá Python Advanced (pe-v4) — chặng M8 "Dự án DA": DA01, DA02 (cả hai là Boss, gate=True).

Nguồn: python-learning-data.json bài DA01 (sổ tay trang 143–144) và DA02 (trang 145–146),
cùng da-sales-practice.csv kèm chính sách tham chiếu "11 dòng raw → 6 đơn hợp lệ, revenue = 155;
north = 65, south = 90; January = 110, February = 45" (đã chạy lại bằng pandas 2.2.3: khớp).

Vì sao bài viết theo kiểu "năm hàm nhỏ" chứ không phải một script:
* Mỗi hàm là một bước của pipeline DA (đọc → làm sạch có lý do → báo cáo → KPI → biểu đồ),
  nên bộ chấm gọi riêng từng bước và chỉ ra ĐÚNG bước hỏng, thay vì một con số cuối sai.
* Mọi ca chấm quan trọng chạy lại trên một file THỨ HAI mà học viên chưa thấy (lỗi khác hẳn
  sales.csv / grades.csv). Viết cứng 6/155 hay 18/13 sẽ trượt ngay.
* Biểu đồ chấm qua thuộc tính Axes (số cột, chiều dài cột, dữ liệu đường, tiêu đề, nhãn) —
  không so ảnh. Hàm vẽ TRẢ VỀ Figure nên không cần `_studio.figures`.

Biến thể sai (`bad`) mỗi cái là một lỗi DA có thật và đổi đúng MỘT dòng của lời giải, để
mini-game "săn lỗi" khoanh được dòng đó.
"""
try:
    from authoring import T, TX, out, run  # noqa: F401
except ImportError:  # chạy lẻ file này khi chưa có scripts/pe-v4/authoring.py
    def T(name, call, value):
        return (name, call, repr(value))

    def TX(name, call, expr):
        return (name, call, expr)

    def out(*lines):
        return ''.join(f'{line}\n' for line in lines)

    def run(**kwargs):
        return '_studio.run(' + ', '.join(f'{k}={v!r}' for k, v in kwargs.items()) + ')'

try:
    from authoring import DA_ENV
except ImportError:
    DA_ENV = ('Bài này dùng numpy / pandas / matplotlib chạy ngay trong trình duyệt (Pyodide). Lần đầu mở bài, '
              'trình duyệt tải thêm thư viện nên chờ lâu hơn một chút. Biểu đồ vẽ bằng backend Agg: plt.show() '
              'không mở cửa sổ, bộ chấm đọc thẳng tiêu đề, nhãn trục và dữ liệu của Figure. Chạy trên máy để xem hình.')

PACKAGES = ['numpy', 'pandas', 'matplotlib']

# ---------------------------------------------------------------- dữ liệu

# Chép ĐÚNG TỪNG BYTE da-sales-practice.csv (xuống dòng CRLF như file gốc, không BOM).
SALES_CSV = '\r\n'.join([
    'order_id,date,region,product,qty,unit_price',
    'O01,2026-01-01, North ,Book,2,10',
    'O02,2026-01-02,south,Pen,1,20',
    'O03,2026-01-03,north,Book,,10',
    'O04,bad,south,Pen,2,20',
    'O05,2026-01-04,NORTH,Book,3,10',
    'O05,2026-01-04,NORTH,Book,3,10',
    'O06,2026-01-25,South,Pen,2,20',
    'O07,2026-02-01,north,Book,-1,10',
    'O08,2026-02-02,south,Pen,2,',
    'O09,2026-02-03,north,Book,1,15',
    'O10,2026-02-04,south,Pen,3,10',
]) + '\r\n'

# File thứ hai của DA01 — học viên không thấy trước. Lỗi KHÁC sales.csv:
#   mã đơn có số 0 đầu (đọc không khai dtype là thành 101), ngày 30/02 không tồn tại, ô ngày trống,
#   qty viết bằng chữ, qty = 0, giá không phải số, cùng đơn 0102 nhập hai lần với cách viết khác
#   (" west"/"West", "Book"/"book" — drop_duplicates() cả dòng KHÔNG bắt được), và hai đơn THẬT
#   0107/0108 giống nhau mọi cột trừ order_id (bỏ trùng không theo khoá sẽ xoá nhầm).
# Kết quả đúng: 13 dòng → 7 đơn, revenue 255; east 200 (qty 15), west 55 (qty 4);
#   2026-03: 90, 2026-04: 165.
SALES_Q2 = '\n'.join([
    'order_id,date,region,product,qty,unit_price',
    '0101,2026-03-01,East,Pen,2,20',
    '0102,2026-03-02, west,Book,1,10',
    '0103,2026-02-30,east,Pen,1,20',
    '0104,,West,Book,2,10',
    '0105,2026-03-04,WEST ,Book,two,10',
    '0102,2026-03-02,West,book,1,10',
    '0106,2026-04-01,east,Pen,3,abc',
    '0107,2026-04-02,east,Pen,4,15',
    '0108,2026-04-02,east,Pen,4,15',
    '0109,2026-04-05,  West,Book,2,12.5',
    '0110,2026-04-06,west,Book,0,12',
    '0111,2026-03-15,EAST,Book,5,8',
    '0112,2026-04-20,west,Pen,1,20',
]) + '\n'

# Bảng điểm cấp sẵn cho DA02 (thang 10). Lỗi cố ý:
#   "s02 " (chữ thường + dấu cách) cùng người với "S02"; "abs" và ô trống là THIẾU điểm (không phải 0);
#   85 là nhập nhầm thang 100; tín chỉ 0; "cs101 " / "4" là bản nhập lại của S03-CS101 "4.0".
# Kết quả đúng: 18 dòng → 13 dòng hợp lệ; GPA S04 8.64 A · S01 8.11 B · S02 7.5 B · S06 7.0 B ·
#   S07 6.29 C · S03 4.43 D · S05 3.5 F; GPA chung theo tín chỉ 287 / 43 = 6.67.
GRADES_CSV = '\n'.join([
    'student_id,name,course,credits,score',
    'S01,An,MATH101,3,8.0',
    'S01,An,PHYS101,2,6.5',
    'S01,An,CS101,4,9.0',
    's02 ,Bình,MATH101,3,7.5',
    'S02,Bình,CS101,4,abs',
    'S02,Bình,PHYS101,2,85',
    'S03,Chi,MATH101,3,5.0',
    'S03,Chi,CS101,4,4.0',
    'S03,Chi,cs101 ,4,4',
    'S04,Dũng,MATH101,3,9.5',
    'S04,Dũng,PHYS101,0,7.0',
    'S04,Dũng,CS101,4,8.0',
    'S05,Em,MATH101,3,',
    'S05,Em,CS101,4,3.5',
    'S06,Giang,PHYS101,2,6.0',
    'S06,Giang,CS101,4,7.5',
    'S07,Hà,MATH101,3,6.0',
    'S07,Hà,CS101,4,6.5',
]) + '\n'

# File thứ hai của DA02 — lỗi khác: "N/A" (pandas tự coi là thiếu), điểm -1 và 10.5, tín chỉ "abc"
# và trống, " B03" có dấu cách đầu dòng. GPA rơi ĐÚNG các mốc hạng: 8.5, 5.5, 4.0 và 3.99.
# Kết quả đúng: 15 dòng → 9; B02 10.0 A · B01 8.5 A · B06 7.5 B · B03 5.5 C · B04 4.0 D · B05 3.99 F;
#   GPA chung 162.45 / 26 = 6.25 (trung bình các GPA lại là 6.58).
GRADES_K2 = '\n'.join([
    'student_id,name,course,credits,score',
    'B01,Lan,MATH101,3,8.5',
    'B01,Lan,CS101,3,8.5',
    'B02,Minh,MATH101,2,10',
    'B02,Minh,CS101,4,N/A',
    'B02,Minh,PHYS101,2,-1',
    'b03,Nga,MATH101,3,5.5',
    'B03,Nga,PHYS101,3,5.5',
    ' B03,Nga,MATH101,3,5.5',
    'B04,Oanh,CS101,4,4',
    'B04,Oanh,MATH101,abc,9',
    'B05,Phú,CS101,5,3.99',
    'B05,Phú,MATH101,,7',
    'B06,Quang,CS101,2,10.5',
    'B06,Quang,MATH101,2,7',
    'B06,Quang,PHYS101,1,8.5',
]) + '\n'

SUPPORT = {
    'sales.csv': SALES_CSV,
    'grades.csv': GRADES_CSV,
}

# ---------------------------------------------------------------- DA01: lời giải

DA01_SOLUTION = r'''import pandas as pd
import matplotlib.pyplot as plt

REASONS = ["bad_date", "bad_qty", "bad_price", "duplicate"]


def load_sales(path):
    # dtype=str: mọi cột là chữ, giữ nguyên raw để còn kiểm và báo lỗi.
    return pd.read_csv(path, dtype=str)


def clean_sales(raw):
    df = raw.copy()
    df["region"] = df["region"].str.strip().str.lower()
    df["date"] = pd.to_datetime(df["date"], format="%Y-%m-%d", errors="coerce")
    df["qty"] = pd.to_numeric(df["qty"], errors="coerce")
    df["unit_price"] = pd.to_numeric(df["unit_price"], errors="coerce")

    # Mỗi dòng nhận MỘT lý do, theo thứ tự kiểm cố định.
    reason = pd.Series("", index=df.index)
    checks = [
        ("bad_date", df["date"].isna()),
        ("bad_qty", df["qty"].isna() | (df["qty"] <= 0)),
        ("bad_price", df["unit_price"].isna() | (df["unit_price"] <= 0)),
    ]
    for name, bad in checks:
        reason[(reason == "") & bad] = name

    # Bỏ trùng theo khoá của grain, chỉ trong các dòng đã hợp lệ.
    dup_rows = df[reason == ""].duplicated(subset="order_id", keep="first")
    reason.loc[dup_rows[dup_rows].index] = "duplicate"

    clean = df[reason == ""].copy()
    clean["month"] = clean["date"].dt.strftime("%Y-%m")
    clean["revenue"] = clean["qty"] * clean["unit_price"]

    rejected = raw[reason != ""].copy()
    rejected["reason"] = reason[reason != ""]
    return clean, rejected


def quality_report(raw, clean, rejected):
    if len(raw) != len(clean) + len(rejected):
        raise ValueError("raw != clean + rejected: có dòng bị mất hoặc bị đếm hai lần")
    report = {"rows_in": len(raw), "rows_out": len(clean)}
    for name in REASONS:
        report[name] = int((rejected["reason"] == name).sum())
    return report


def kpi_table(clean, by):
    table = clean.groupby(by).agg(
        orders=("order_id", "count"),
        qty=("qty", "sum"),
        revenue=("revenue", "sum"),
    )
    # Tỷ số của tổng: đơn mua 5 cái nặng hơn đơn mua 1 cái.
    table["avg_price"] = table["revenue"] / table["qty"]
    return table


def revenue_chart(clean):
    by_region = kpi_table(clean, "region")["revenue"].sort_values()
    by_month = kpi_table(clean, "month")["revenue"]

    fig, (ax_region, ax_month) = plt.subplots(1, 2, figsize=(10, 4), layout="constrained")
    ax_region.barh(by_region.index, by_region.values)
    ax_region.set(title="Doanh thu theo vùng (dữ liệu mô phỏng)", xlabel="Doanh thu")
    ax_month.plot(by_month.index, by_month.values, marker="o")
    ax_month.set(title="Doanh thu theo tháng (dữ liệu mô phỏng)", xlabel="Tháng", ylabel="Doanh thu")
    return fig


if __name__ == "__main__":
    raw = load_sales("sales.csv")
    clean, rejected = clean_sales(raw)
    print(quality_report(raw, clean, rejected))
    print(rejected[["order_id", "reason"]].to_string(index=False))
    print(kpi_table(clean, "region").round(2))
    print("Tổng revenue:", clean["revenue"].sum())
    revenue_chart(clean)
    plt.show()
'''

DA01_STARTER = r'''import pandas as pd
import matplotlib.pyplot as plt

# Boss DA01: tự viết 5 hàm theo bảng hợp đồng. sales.csv nằm cùng thư mục.
# Viết xong hàm nào, chạy thử hàm đó và đối chiếu với 6 đơn / revenue 155.

REASONS = ["bad_date", "bad_qty", "bad_price", "duplicate"]


def load_sales(path):
    pass


def clean_sales(raw):
    pass


def quality_report(raw, clean, rejected):
    pass


def kpi_table(clean, by):
    pass


def revenue_chart(clean):
    pass


# Chạy thử (bỏ dấu # khi các hàm đã viết xong):
# raw = load_sales("sales.csv")
# clean, rejected = clean_sales(raw)
# print(quality_report(raw, clean, rejected))
# print(kpi_table(clean, "region"))
'''

# ---------------------------------------------------------------- DA01: ca chấm

SALES_RAW = "load_sales('sales.csv')"
SALES = "clean_sales(load_sales('sales.csv'))"
Q2_RAW = f"load_sales(_studio.write('sales_q2.csv', {SALES_Q2!r}))"
Q2 = f"clean_sales({Q2_RAW})"
PDT = "__import__('pandas').api.types"
SOURCE_TX = ("__import__('pandas').DataFrame({'order_id': ['a1', 'a2', 'b1'], 'region': ['A', 'A', 'B'], "
             "'qty': [1, 2, 3], 'unit_price': [10, 10, 20], 'revenue': [10, 20, 60]})")
SALES_COLUMNS = ['order_id', 'date', 'region', 'product', 'qty', 'unit_price']


def report_of(raw_expr):
    return f"(lambda raw: quality_report(raw, *clean_sales(raw)))({raw_expr})"


def chart_of(clean_expr, body):
    return f"(lambda f: {body})(revenue_chart({clean_expr}[0]))"


DA01_TESTS = [
    T('load_sales: 11 dòng × 6 cột, đúng tên cột', f"(lambda r: (len(r), list(r.columns)))({SALES_RAW})",
      (11, SALES_COLUMNS)),
    T('load_sales đọc mọi cột là chữ: " North " còn dấu cách, qty là "2", ô trống là NaN',
      f"(lambda r: (r.loc[0, 'region'], r.loc[0, 'qty'], int(r['qty'].isna().sum())))({SALES_RAW})",
      (' North ', '2', 1)),
    T('File mới: mã đơn "0101" giữ số 0 đầu', f"{Q2_RAW}['order_id'].head(2).tolist()", ['0101', '0102']),
    T('sales.csv → đúng 6 đơn hợp lệ', f"sorted({SALES}[0]['order_id'])",
      ['O01', 'O02', 'O05', 'O06', 'O09', 'O10']),
    T('sales.csv → tổng revenue = 155', f"float({SALES}[0]['revenue'].sum())", 155.0),
    T('clean: region chuẩn hoá, month dạng "YYYY-MM", date là datetime, revenue là số',
      f"(lambda c: (sorted(set(c['region'])), sorted(set(c['month'])), {PDT}.is_datetime64_any_dtype(c['date']), "
      f"{PDT}.is_numeric_dtype(c['revenue'])))({SALES}[0])",
      (['north', 'south'], ['2026-01', '2026-02'], True, True)),
    T('rejected: 5 dòng, mỗi dòng đúng một lý do',
      f"sorted(map(tuple, {SALES}[1][['order_id', 'reason']].values.tolist()))",
      [('O03', 'bad_qty'), ('O04', 'bad_date'), ('O05', 'duplicate'), ('O07', 'bad_qty'), ('O08', 'bad_price')]),
    T('rejected giữ text raw (date vẫn là "bad"); raw không bị sửa',
      f"(lambda raw: (lambda res: (res[1].loc[res[1]['order_id'] == 'O04', 'date'].tolist(), raw.loc[0, 'region'], "
      f"len(raw)))(clean_sales(raw)))({SALES_RAW})",
      (['bad'], ' North ', 11)),
    T('quality_report trên sales.csv: 11 = 6 + 1 + 2 + 1 + 1', report_of(SALES_RAW),
      {'rows_in': 11, 'rows_out': 6, 'bad_date': 1, 'bad_qty': 2, 'bad_price': 1, 'duplicate': 1}),
    T('quality_report: số dòng không khớp (mất một dòng clean) → ValueError',
      f"(lambda raw: (lambda c, r: _studio.call(quality_report, raw, c.iloc[1:], r).error)(*clean_sales(raw)))({SALES_RAW})",
      'ValueError'),
    T('File mới: report 13 → 7 (2 bad_date, 2 bad_qty, 1 bad_price, 1 duplicate)', report_of(Q2_RAW),
      {'rows_in': 13, 'rows_out': 7, 'bad_date': 2, 'bad_qty': 2, 'bad_price': 1, 'duplicate': 1}),
    T('File mới: 7 đơn, revenue 255 — bỏ trùng theo order_id, giữ hai đơn thật giống nhau',
      f"(lambda c: (sorted(c['order_id']), float(c['revenue'].sum())))({Q2}[0])",
      (['0101', '0102', '0107', '0108', '0109', '0111', '0112'], 255.0)),
    T('kpi_table theo region: orders, revenue và avg_price = revenue / qty',
      f"(lambda t: (t['orders'].to_dict(), t['revenue'].to_dict(), t['avg_price'].round(2).to_dict()))"
      f"(kpi_table({SALES}[0], 'region'))",
      ({'north': 3, 'south': 3}, {'north': 65.0, 'south': 90.0}, {'north': 10.83, 'south': 15.0})),
    T('kpi_table theo month; tổng các tháng = 155',
      f"(lambda t: (t['revenue'].to_dict(), float(t['revenue'].sum())))(kpi_table({SALES}[0], 'month'))",
      ({'2026-01': 110.0, '2026-02': 45.0}, 155.0)),
    T('kpi_table trên 3 giao dịch của bài tập gốc: A 30, B 60, tổng 90',
      f"(lambda t: (t['revenue'].to_dict(), t['avg_price'].to_dict(), float(t['revenue'].sum())))"
      f"(kpi_table({SOURCE_TX}, 'region'))",
      ({'A': 30, 'B': 60}, {'A': 10.0, 'B': 20.0}, 90.0)),
    T('File mới: KPI theo region và theo month',
      f"(lambda c: (kpi_table(c, 'region')['revenue'].to_dict(), kpi_table(c, 'region')['avg_price'].round(2).to_dict(), "
      f"kpi_table(c, 'month')['revenue'].to_dict()))({Q2}[0])",
      ({'east': 200.0, 'west': 55.0}, {'east': 13.33, 'west': 13.75}, {'2026-03': 90.0, '2026-04': 165.0})),
    T('revenue_chart: 2 Axes — barh 2 vùng (65, 90) và line 2 tháng (110, 45)',
      chart_of(SALES, "(len(f.axes), [float(p.get_width()) for p in f.axes[0].patches], "
                      "[float(y) for y in f.axes[1].lines[0].get_ydata()])"),
      (2, [65.0, 90.0], [110.0, 45.0])),
    T('File mới: barh sắp tăng dần (west 55 rồi east 200), line 90 → 165',
      chart_of(Q2, "([float(p.get_width()) for p in f.axes[0].patches], "
                   "[float(y) for y in f.axes[1].lines[0].get_ydata()])"),
      ([55.0, 200.0], [90.0, 165.0])),
    T('revenue_chart: Axes nào cũng có tiêu đề, có nhãn trục, ghi rõ dữ liệu mô phỏng',
      chart_of(SALES, "(lambda text: (all(a.get_title() for a in f.axes), bool(f.axes[0].get_xlabel()), "
                      "bool(f.axes[1].get_xlabel()), bool(f.axes[1].get_ylabel()), "
                      "'mô phỏng' in text or 'synthetic' in text))"
                      "(' '.join([a.get_title() for a in f.axes] + [f.get_suptitle()]).lower())"),
      (True, True, True, True, True)),
]

K_LOAD_SALES = dict(
    sig='load_sales(path)', does='Đọc file CSV bán hàng, giữ nguyên raw.',
    takes='path: str — file CSV có dòng tiêu đề',
    gives='DataFrame đủ các cột theo thứ tự của file; MỌI ô là chuỗi (dtype=str), ô trống là NaN',
    effect='Không ép kiểu, không strip, không bỏ dòng nào.',
    call='load_sales("sales.csv") → 11 dòng × 6 cột; .loc[0, "region"] == " North "')
K_CLEAN_SALES = dict(
    sig='clean_sales(raw)', does='Chuẩn hoá, kiểm từng dòng, gắn lý do loại, bỏ trùng theo order_id.',
    takes='raw: DataFrame từ load_sales — KHÔNG được sửa',
    gives='(clean, rejected). clean: dòng hợp lệ; region đã strip + lower; date kiểu datetime; qty, unit_price là số; '
          'thêm month = "YYYY-MM" và revenue = qty × unit_price. rejected: các dòng RAW bị loại (giữ text gốc) + cột reason',
    effect='Lý do theo thứ tự kiểm, mỗi dòng một lý do: bad_date (không phải ngày YYYY-MM-DD có thật) → bad_qty (thiếu, '
           'không phải số, hoặc ≤ 0) → bad_price (thiếu, không phải số, hoặc ≤ 0) → duplicate (trong các dòng hợp lệ, '
           'order_id đã gặp — giữ dòng đầu).',
    call='clean_sales(load_sales("sales.csv")) → 6 dòng clean, 5 dòng rejected')
K_REPORT = dict(
    sig='quality_report(raw, clean, rejected)', does='Tóm tắt chất lượng dữ liệu và đối chiếu số dòng.',
    takes='raw; clean, rejected do clean_sales trả về',
    gives='dict đủ 6 khoá: rows_in, rows_out, bad_date, bad_qty, bad_price, duplicate (lý do không gặp thì 0)',
    effect='len(raw) khác len(clean) + len(rejected) → raise ValueError.',
    call='→ {"rows_in": 11, "rows_out": 6, "bad_date": 1, "bad_qty": 2, "bad_price": 1, "duplicate": 1}')
K_KPI = dict(
    sig='kpi_table(clean, by)', does='Bảng KPI theo vùng hoặc theo tháng.',
    takes='clean; by: "region" hoặc "month"',
    gives='DataFrame, index là giá trị của cột by (tăng dần); cột orders (số đơn), qty (tổng), revenue (tổng), '
          'avg_price = revenue / qty của nhóm',
    effect='Không sửa clean.',
    call='kpi_table(clean, "region") → north: 3 đơn, revenue 65, avg_price 10.83')
K_CHART = dict(
    sig='revenue_chart(clean)', does='Vẽ hai biểu đồ từ bảng KPI đã tổng hợp (không từ giao dịch thô).',
    takes='clean',
    gives='Figure đúng 2 Axes: axes[0] barh revenue theo region, sắp TĂNG dần; axes[1] line revenue theo month, có marker',
    effect='Mỗi Axes có title, tiêu đề ghi rõ "dữ liệu mô phỏng"; axes[0] có xlabel; axes[1] có xlabel và ylabel. '
           'Không gọi plt.show() trong hàm.',
    call='revenue_chart(clean).axes[0].patches → 2 cột dài 65 và 90')

DA01 = dict(
    code='DA01', title='Mini-project: doanh thu từ raw tới chart', minutes=60, gate=True, exam='Dự án DA · doanh thu',
    goal='Tự dựng pipeline doanh thu: đọc raw → làm sạch có lý do → báo cáo chất lượng → KPI → biểu đồ.',
    prereq='M06', support=['sales.csv'], packages=PACKAGES, env=DA_ENV,
    brief='Boss cuối khoá, phần 1. sales.csv (cấp sẵn) là 11 giao dịch mô phỏng có lỗi cố ý; grain: một dòng = một đơn, '
          'khoá order_id. Tự viết năm hàm thuần, không hàm nào được sửa dữ liệu đầu vào. (1) load_sales(path): đọc mọi '
          'cột dưới dạng chữ (dtype=str). (2) clean_sales(raw) → (clean, rejected): region bỏ khoảng trắng hai đầu và '
          'viết thường; date phải là ngày YYYY-MM-DD có thật; qty và unit_price phải là số > 0; mỗi dòng lỗi mang MỘT lý '
          'do theo thứ tự bad_date → bad_qty → bad_price; trong các dòng hợp lệ, order_id gặp lại thì giữ dòng đầu, '
          'dòng sau là duplicate. clean thêm month ("YYYY-MM") và revenue = qty × unit_price; rejected là các dòng raw bị '
          'loại kèm cột reason. (3) quality_report(raw, clean, rejected): đếm dòng vào/ra và từng lý do; tổng không khớp '
          'thì ValueError. (4) kpi_table(clean, by) theo "region" hoặc "month": orders, qty, revenue và avg_price = '
          'revenue / qty. (5) revenue_chart(clean) → Figure hai Axes: barh doanh thu theo vùng (tăng dần) và line doanh '
          'thu theo tháng, có tiêu đề ghi rõ dữ liệu mô phỏng và nhãn trục.',
    example='sales.csv: 11 dòng raw → 6 đơn hợp lệ, revenue = 155 (north 65, south 90; 2026-01: 110, 2026-02: 45).',
    explain=[
        'Định nghĩa grain trước khi viết code: một dòng là một đơn hàng, nên order_id phải duy nhất. Bỏ trùng, đếm đơn, '
        'cộng doanh thu đều dựa trên câu này.',
        'Đọc raw dưới dạng chữ (dtype=str) để chưa mất gì trước khi kiểm: mã "0101" không thành số 101, " North " còn '
        'nguyên dấu cách để bạn thấy dữ liệu bẩn ra sao. Ép kiểu là việc của bước làm sạch: pd.to_numeric và '
        'pd.to_datetime với errors="coerce" biến giá trị hỏng thành NaN/NaT để rà soát, không làm sập chương trình.',
        'Loại dòng phải có lý do, và mỗi dòng đúng một lý do: nhờ vậy rows_in = rows_out + tổng các lý do. Phép đối chiếu '
        'này bắt được dòng "bốc hơi" giữa đường. rejected giữ text RAW (date vẫn là "bad") để người khác kiểm lại được.',
        'KPI phải nói rõ mẫu số: giá bán bình quân = tổng revenue / tổng qty (tỷ số của tổng), không phải trung bình cột '
        'unit_price — đơn mua 5 cái phải nặng hơn đơn mua 1 cái.',
        'Biểu đồ vẽ từ bảng đã tổng hợp: barh để so vùng (sắp tăng dần, cột dài nhất nằm trên cùng), line cho diễn tiến '
        'theo tháng, tiêu đề ghi rõ đây là dữ liệu mô phỏng. Vẽ thẳng giao dịch thô thì mỗi đơn thành một cột chồng lên '
        'nhau — trông như tổng nhưng không phải.',
    ],
    predict=dict(q='sales.csv có hai dòng O05 giống hệt nhau, O03 thiếu qty, O04 có date "bad", O07 qty = -1, O08 thiếu '
                   'giá. Theo chính sách của bài, còn bao nhiêu đơn và revenue bao nhiêu?', options=[
        ('6 đơn, revenue 155', 'Loại O03, O04, O07, O08 và bản O05 thứ hai: 20 + 20 + 30 + 40 + 15 + 30 = 155.', True),
        ('7 đơn, revenue 185', 'Quên bỏ bản trùng O05 — đơn 30 bị cộng hai lần.', False),
        ('11 dòng, revenue 215', 'Không làm sạch, chỉ điền thiếu bằng 0: O04 vẫn cộng 40, O07 trừ 10, bản trùng cộng 30.', False),
    ]),
    myth=('Năm cái bẫy của DA01',
          'Đọc không khai dtype (mã "0101" thành 101, qty thành 2.0); chuẩn hoá thiếu một bước (strip mà quên lower thì '
          '"North" và "north" là hai vùng); drop_duplicates() không subset (chỉ bỏ dòng giống HỆT, đơn nhập lại với "Book"/'
          '"book" vẫn bị đếm hai lần); avg_price = trung bình unit_price (trung bình của tỷ số thay cho tỷ số của tổng); '
          'vẽ barh từ giao dịch thô thay vì từ bảng KPI. Thêm một lỗi pandas hay gặp: df = raw (không .copy()) rồi sửa df '
          'là sửa luôn raw.'),
    mcq=[
        dict(q='Đơn P7 bị nhập hai lần: " west,Book" và "West,book". Hai đơn P8, P9 giống nhau mọi cột trừ order_id. '
               'Lệnh bỏ trùng nào đúng với grain "một dòng = một đơn"?', options=[
            ('duplicated(subset="order_id", keep="first") trên các dòng đã hợp lệ',
             'Khoá của grain là order_id: P7 còn một dòng, P8 và P9 đều được giữ.', True),
            ('drop_duplicates() không tham số',
             'Chỉ bỏ dòng giống hệt ở mọi cột — "Book"/"book" khác nhau nên đơn P7 bị đếm hai lần.', False),
            ('drop_duplicates(subset=["date", "region", "qty", "unit_price"])',
             'Xoá nhầm P9: hai đơn thật khác order_id chỉ "trông giống nhau".', False),
        ]),
        dict(q='Vùng north có 3 đơn: 2 cuốn × 10, 3 cuốn × 10, 1 cuốn × 15. Giá bán bình quân mỗi cuốn là?', options=[
            ('65 / 6 ≈ 10.83 — tổng revenue chia tổng qty', 'Tỷ số của tổng: cuốn nào cũng nặng như nhau.', True),
            ('(10 + 10 + 15) / 3 ≈ 11.67', 'Trung bình đơn giá coi đơn 1 cuốn nặng bằng đơn 3 cuốn.', False),
            ('65 / 3 ≈ 21.67', 'Đó là doanh thu bình quân mỗi ĐƠN, không phải mỗi cuốn.', False),
        ]),
        dict(q='Đọc file có mã đơn "0101", "0102"… bằng pd.read_csv(path) không khai dtype thì…', options=[
            ('order_id thành số 101, 102 — mất số 0 đầu, không còn khớp với hệ thống khác',
             'pandas tự đoán kiểu: cột toàn chữ số thành int.', True),
            ('Vẫn giữ nguyên "0101"', 'Chỉ giữ khi khai dtype=str (hoặc dtype={"order_id": str}).', False),
            ('Báo lỗi ngay', 'Không lỗi gì — đó mới là chỗ nguy hiểm.', False),
        ]),
    ],
    why=dict(
        prompt='Vì sao rows_in phải bằng rows_out cộng tổng các lý do loại, và vì sao mỗi dòng chỉ được một lý do?',
        sample='Mỗi dòng raw phải đi đúng một nơi: vào clean, hoặc vào rejected với một lý do. Nếu tổng không khớp là có '
               'dòng bị mất (lọc hai lần, groupby bỏ NaN) hoặc bị đếm hai lần. Một dòng vừa sai ngày vừa thiếu qty mà '
               'đếm cả hai lý do thì tổng các lý do lớn hơn số dòng bị loại và phép đối chiếu vô nghĩa; nên kiểm theo thứ '
               'tự cố định và dừng ở lỗi đầu tiên.'),
    flow=['load_sales: sales.csv → 11 dòng, mọi cột là chữ.',
          'clean_sales: chuẩn hoá region, ép kiểu date / qty / unit_price → gắn lý do → bỏ trùng order_id → 6 đơn + 5 dòng rejected.',
          'quality_report: 11 = 6 + (1 bad_date + 2 bad_qty + 1 bad_price + 1 duplicate).',
          'kpi_table: north 65, south 90; 2026-01 110, 2026-02 45 — tổng vẫn 155.',
          'revenue_chart: barh 2 cột (65, 90) + line 2 điểm (110, 45).'],
    transfer='Bộ chấm chạy lại cả pipeline trên một file khác bạn chưa thấy: mã đơn có số 0 đầu, ngày 30/02, ô ngày trống, '
             'qty viết bằng chữ, qty = 0, giá không phải số, một đơn nhập hai lần với cách viết khác, và hai đơn thật giống '
             'nhau. Viết cứng 6 / 155 sẽ trượt.',
    counter=dict(q='Thêm đơn hợp lệ "O11,2026-02-10, South,Pen,1,20" vào cuối sales.csv. Revenue của south thành bao nhiêu?',
                 options=['110', '90', '20'], correct='110'),
    practice='Viết và chạy từng hàm trên sales.csv, in kết quả ra đối chiếu (11 dòng → 6 đơn → 155) rồi mới sang hàm sau. '
             'Nộp lần đầu trước khi xem lời giải.',
    steps=['load_sales: pd.read_csv(path, dtype=str) — chưa ép kiểu lúc đọc.',
           'clean_sales: df = raw.copy(); region .str.strip().str.lower(); pd.to_datetime(..., format="%Y-%m-%d", '
           'errors="coerce"); pd.to_numeric(..., errors="coerce") cho qty và unit_price.',
           'Series reason toàn "": lần lượt bad_date → bad_qty → bad_price, chỉ gán cho dòng còn ""; trong các dòng còn "", '
           'duplicated(subset="order_id") → "duplicate".',
           'clean = dòng reason == "" + month + revenue; rejected = raw của dòng bị loại + cột reason.',
           'quality_report đếm theo REASONS và kiểm tổng; kpi_table = groupby(by).agg(...) rồi avg_price = revenue / qty; '
           'revenue_chart lấy số từ kpi_table.'],
    partial=r'''    reason = pd.Series("", index=df.index)
    checks = [
        ("bad_date", df["date"].isna()),
        ("bad_qty", df["qty"].isna() | (df["qty"] <= 0)),
        ("bad_price", df["unit_price"].isna() | (df["unit_price"] <= 0)),
    ]
    for name, bad in checks:
        reason[(reason == "") & bad] = name
    ...''',
    io=[('sales.csv', '11 dòng → 6 đơn, revenue 155; rejected: O03 bad_qty, O04 bad_date, O05 duplicate, O07 bad_qty, O08 bad_price'),
        ('kpi_table(clean, "region")', 'north: 3 đơn, 65, avg_price 10.83 · south: 3 đơn, 90, avg_price 15.0')],
    contracts=[K_LOAD_SALES, K_CLEAN_SALES, K_REPORT, K_KPI, K_CHART],
    starter=DA01_STARTER,
    solution=DA01_SOLUTION,
    tests=DA01_TESTS,
    bad=[
        ('bỏ trùng cả dòng thay vì theo order_id', DA01_SOLUTION.replace(
            'duplicated(subset="order_id", keep="first")', 'duplicated(keep="first")')),
        ('avg_price = trung bình đơn giá', DA01_SOLUTION.replace(
            'table["avg_price"] = table["revenue"] / table["qty"]',
            'table["avg_price"] = clean.groupby(by)["unit_price"].mean()')),
        ('đọc không khai dtype', DA01_SOLUTION.replace('pd.read_csv(path, dtype=str)', 'pd.read_csv(path)')),
        ('strip mà quên lower', DA01_SOLUTION.replace(
            'df["region"].str.strip().str.lower()', 'df["region"].str.strip()')),
        ('vẽ barh từ giao dịch thô', DA01_SOLUTION.replace(
            'ax_region.barh(by_region.index, by_region.values)', 'ax_region.barh(clean["region"], clean["revenue"])')),
        ('df = raw (sửa luôn raw)', DA01_SOLUTION.replace('    df = raw.copy()\n', '    df = raw\n')),
        ('chỉ loại qty âm, giữ qty = 0', DA01_SOLUTION.replace('(df["qty"] <= 0)', '(df["qty"] < 0)')),
    ],
)

# ---------------------------------------------------------------- DA02: lời giải

DA02_SOLUTION = r'''import pandas as pd
import matplotlib.pyplot as plt

REASONS = ["missing_score", "out_of_range", "bad_credits", "duplicate"]
GRADE_BINS = [0, 4, 5.5, 7, 8.5, 10]


def load_grades(path):
    return pd.read_csv(path, dtype=str)


def clean_grades(raw):
    df = raw.copy()
    df["student_id"] = df["student_id"].str.strip().str.upper()
    df["course"] = df["course"].str.strip().str.upper()
    df["score"] = pd.to_numeric(df["score"], errors="coerce")
    df["credits"] = pd.to_numeric(df["credits"], errors="coerce")

    # Thiếu điểm là THIẾU, không phải 0: loại khỏi phép tính và đếm lại.
    reason = pd.Series("", index=df.index)
    checks = [
        ("missing_score", df["score"].isna()),
        ("out_of_range", (df["score"] < 0) | (df["score"] > 10)),
        ("bad_credits", df["credits"].isna() | (df["credits"] <= 0)),
    ]
    for name, bad in checks:
        reason[(reason == "") & bad] = name

    # Grain: một sinh viên, một môn, một điểm.
    dup_rows = df[reason == ""].duplicated(subset=["student_id", "course"], keep="first")
    reason.loc[dup_rows[dup_rows].index] = "duplicate"

    clean = df[reason == ""].copy()
    report = {"rows_in": len(raw), "rows_out": len(clean)}
    for name in REASONS:
        report[name] = int((reason == name).sum())
    return clean, report


def letter(gpa):
    if gpa >= 8.5:
        return "A"
    if gpa >= 7.0:
        return "B"
    if gpa >= 5.5:
        return "C"
    if gpa >= 4.0:
        return "D"
    return "F"


def gpa_table(clean):
    df = clean.assign(points=clean["score"] * clean["credits"])
    table = df.groupby("student_id").agg(
        courses=("course", "count"),
        credits=("credits", "sum"),
        points=("points", "sum"),
    )
    table["gpa"] = (table["points"] / table["credits"]).round(2)
    table["letter"] = table["gpa"].map(letter)
    return table.sort_values("gpa", ascending=False)


def class_gpa(clean):
    total = (clean["score"] * clean["credits"]).sum()
    return round(float(total / clean["credits"].sum()), 2)


def grade_chart(table):
    fig, ax = plt.subplots(figsize=(6, 4), layout="constrained")
    ax.hist(table["gpa"], bins=GRADE_BINS, edgecolor="white")
    ax.set(title=f"Phân bố GPA (dữ liệu mô phỏng, n={len(table)})",
           xlabel="GPA (thang 10)", ylabel="Số sinh viên")
    return fig


if __name__ == "__main__":
    raw = load_grades("grades.csv")
    clean, report = clean_grades(raw)
    print(report)
    table = gpa_table(clean)
    print(table)
    print("GPA chung theo tín chỉ:", class_gpa(clean))
    grade_chart(table)
    plt.show()
'''

DA02_STARTER = r'''import pandas as pd
import matplotlib.pyplot as plt

# Boss DA02: tự viết 6 hàm theo bảng hợp đồng. grades.csv nằm cùng thư mục.
# Điểm thang 10; thiếu điểm KHÔNG phải điểm 0.

REASONS = ["missing_score", "out_of_range", "bad_credits", "duplicate"]
GRADE_BINS = [0, 4, 5.5, 7, 8.5, 10]


def load_grades(path):
    pass


def clean_grades(raw):
    pass


def letter(gpa):
    pass


def gpa_table(clean):
    pass


def class_gpa(clean):
    pass


def grade_chart(table):
    pass


# Chạy thử (bỏ dấu # khi các hàm đã viết xong):
# clean, report = clean_grades(load_grades("grades.csv"))
# print(report)
# print(gpa_table(clean))
'''

# ---------------------------------------------------------------- DA02: ca chấm

GRADES_RAW = "load_grades('grades.csv')"
GRADES = "clean_grades(load_grades('grades.csv'))"
K2_RAW = f"load_grades(_studio.write('grades_k2.csv', {GRADES_K2!r}))"
K2 = f"clean_grades({K2_RAW})"
SOURCE_GPA = ("__import__('pandas').DataFrame({'student_id': ['A', 'A', 'B'], 'course': ['X', 'Y', 'X'], "
              "'credits': [1, 2, 3], 'score': [6.0, 9.0, 8.0]})")
GRADES_COLUMNS = ['student_id', 'name', 'course', 'credits', 'score']


def gpa_dict(table_expr):
    return f"{{k: round(float(v), 2) for k, v in {table_expr}['gpa'].items()}}"


def hist_of(clean_expr, body):
    return f"(lambda f: {body})(grade_chart(gpa_table({clean_expr}[0])))"


DA02_TESTS = [
    T('load_grades: 18 dòng, đúng cột, mọi ô là chữ ("3", "s02 ")',
      f"(lambda r: (len(r), list(r.columns), r.loc[0, 'credits'], r.loc[3, 'student_id']))({GRADES_RAW})",
      (18, GRADES_COLUMNS, '3', 's02 ')),
    T('clean_grades trên grades.csv: báo cáo 18 → 13', f"{GRADES}[1]",
      {'rows_in': 18, 'rows_out': 13, 'missing_score': 2, 'out_of_range': 1, 'bad_credits': 1, 'duplicate': 1}),
    T('File mới: báo cáo 15 → 9 (N/A, -1, 10.5, tín chỉ "abc"/trống, bản trùng " B03")', f"{K2}[1]",
      {'rows_in': 15, 'rows_out': 9, 'missing_score': 1, 'out_of_range': 2, 'bad_credits': 2, 'duplicate': 1}),
    T('clean: mã sinh viên / mã môn đã chuẩn hoá, điểm là số; raw không bị sửa',
      f"(lambda raw: (lambda c: (sorted(set(c['student_id'])), sorted(set(c['course'])), "
      f"{PDT}.is_numeric_dtype(c['score']), raw.loc[3, 'student_id']))(clean_grades(raw)[0]))({GRADES_RAW})",
      (['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07'], ['CS101', 'MATH101', 'PHYS101'], True, 's02 ')),
    T('letter: biên dưới thuộc hạng trên (8.5 → A, 7.0 → B, 5.5 → C, 4.0 → D)',
      '[letter(x) for x in [10, 8.5, 8.49, 7.0, 6.99, 5.5, 5.49, 4.0, 3.99, 0]]',
      ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D', 'F', 'F']),
    T('gpa_table: GPA = Σ(điểm × tín chỉ) / Σ tín chỉ, điểm thiếu không tính là 0',
      gpa_dict(f"gpa_table({GRADES}[0])"),
      {'S01': 8.11, 'S02': 7.5, 'S03': 4.43, 'S04': 8.64, 'S05': 3.5, 'S06': 7.0, 'S07': 6.29}),
    T('gpa_table: tổng tín chỉ, số môn và hạng chữ',
      f"(lambda t: (t['credits'].to_dict(), t['courses'].to_dict(), t['letter'].to_dict()))(gpa_table({GRADES}[0]))",
      ({'S01': 9, 'S02': 3, 'S03': 7, 'S04': 7, 'S05': 4, 'S06': 6, 'S07': 7},
       {'S01': 3, 'S02': 1, 'S03': 2, 'S04': 2, 'S05': 1, 'S06': 2, 'S07': 2},
       {'S01': 'B', 'S02': 'B', 'S03': 'D', 'S04': 'A', 'S05': 'F', 'S06': 'B', 'S07': 'C'})),
    T('gpa_table sắp GPA giảm dần', f"gpa_table({GRADES}[0]).index.tolist()",
      ['S04', 'S01', 'S02', 'S06', 'S07', 'S03', 'S05']),
    T('Bài tập gốc: A có điểm [6, 9], tín chỉ [1, 2] → GPA 8.0, không phải 7.5',
      gpa_dict(f"gpa_table({SOURCE_GPA})"), {'A': 8.0, 'B': 8.0}),
    T('File mới: GPA và hạng chữ ngay tại các mốc',
      f"(lambda t: ({gpa_dict('t')}, t['letter'].to_dict()))(gpa_table({K2}[0]))",
      ({'B01': 8.5, 'B02': 10.0, 'B03': 5.5, 'B04': 4.0, 'B05': 3.99, 'B06': 7.5},
       {'B01': 'A', 'B02': 'A', 'B03': 'C', 'B04': 'D', 'B05': 'F', 'B06': 'B'})),
    T('class_gpa: tỷ số của tổng (6.67 và 6.25), không phải trung bình các GPA',
      f"(round(class_gpa({GRADES}[0]), 2), round(class_gpa({K2}[0]), 2))", (6.67, 6.25)),
    T('grade_chart: hist 5 bin theo mốc hạng, chiều cao [1, 1, 1, 3, 1]',
      hist_of(GRADES, "(len(f.axes), [float(p.get_height()) for p in f.axes[0].patches], "
                      "[round(float(p.get_x()), 2) for p in f.axes[0].patches])"),
      (1, [1.0, 1.0, 1.0, 3.0, 1.0], [0.0, 4.0, 5.5, 7.0, 8.5])),
    T('File mới: hist [1, 1, 1, 1, 2], tiêu đề ghi n=6',
      hist_of(K2, "([float(p.get_height()) for p in f.axes[0].patches], "
                  "'n=6' in f.axes[0].get_title().replace(' ', ''))"),
      ([1.0, 1.0, 1.0, 1.0, 2.0], True)),
    T('grade_chart: tiêu đề có cỡ mẫu n=7, có nhãn hai trục',
      hist_of(GRADES, "('n=7' in f.axes[0].get_title().replace(' ', ''), bool(f.axes[0].get_xlabel()), "
                      "bool(f.axes[0].get_ylabel()))"),
      (True, True, True)),
]

K_LOAD_GRADES = dict(
    sig='load_grades(path)', does='Đọc bảng điểm CSV, giữ nguyên raw.',
    takes='path: str — file CSV có dòng tiêu đề',
    gives='DataFrame đủ các cột của file; MỌI ô là chuỗi (dtype=str), ô trống / "N/A" là NaN',
    effect='Không ép kiểu, không strip, không bỏ dòng.',
    call='load_grades("grades.csv") → 18 dòng; .loc[3, "student_id"] == "s02 "')
K_CLEAN_GRADES = dict(
    sig='clean_grades(raw)', does='Chuẩn hoá mã, ép kiểu, loại dòng lỗi có lý do và bỏ trùng theo (student_id, course).',
    takes='raw: DataFrame từ load_grades — KHÔNG được sửa',
    gives='(clean, report). clean: dòng hợp lệ; student_id và course đã strip + upper; score, credits là số. report: dict '
          'đủ 6 khoá rows_in, rows_out, missing_score, out_of_range, bad_credits, duplicate',
    effect='Mỗi dòng một lý do, theo thứ tự: missing_score (score thiếu hoặc không phải số — KHÔNG thay bằng 0) → '
           'out_of_range (score < 0 hoặc > 10) → bad_credits (thiếu, không phải số, hoặc ≤ 0) → duplicate (trong các dòng '
           'hợp lệ, cặp student_id + course đã gặp — giữ dòng đầu).',
    call='clean_grades(load_grades("grades.csv"))[1] → rows_in 18, rows_out 13')
K_LETTER = dict(
    sig='letter(gpa)', does='Đổi GPA thang 10 sang hạng chữ.',
    takes='gpa: số thực',
    gives='"A" nếu ≥ 8.5; "B" nếu ≥ 7.0; "C" nếu ≥ 5.5; "D" nếu ≥ 4.0; còn lại "F"',
    effect='Biên dưới thuộc hạng trên: dùng >= ở mọi mốc.',
    call='letter(8.5) → "A"; letter(6.99) → "C"')
K_GPA = dict(
    sig='gpa_table(clean)', does='Bảng tổng hợp từng sinh viên.',
    takes='clean (bảng đã làm sạch)',
    gives='DataFrame index student_id, sắp gpa GIẢM dần; cột courses (số môn), credits (tổng tín chỉ), '
          'gpa = Σ(score × credits) / Σ credits làm tròn 2 chữ số, letter = letter(gpa)',
    effect='Không sửa clean; có thể thêm cột phụ (vd. points = Σ score × credits).',
    call='gpa_table(clean).loc["S01", "gpa"] → 8.11')
K_CLASS = dict(
    sig='class_gpa(clean)', does='GPA chung của cả lớp, mỗi TÍN CHỈ nặng như nhau.',
    takes='clean',
    gives='float làm tròn 2 chữ số = Σ(score × credits) / Σ credits trên mọi dòng hợp lệ',
    effect='Không phải trung bình các GPA của từng sinh viên (mean of means).',
    call='class_gpa(clean) → 6.67 trên grades.csv')
K_HIST = dict(
    sig='grade_chart(table)', does='Histogram phân bố GPA theo đúng các mốc hạng.',
    takes='table: kết quả gpa_table',
    gives='Figure một Axes: hist cột gpa với bins = GRADE_BINS = [0, 4, 5.5, 7, 8.5, 10]',
    effect='Tiêu đề ghi cỡ mẫu "n=<số sinh viên>"; có xlabel và ylabel. Không gọi plt.show() trong hàm.',
    call='grade_chart(gpa_table(clean)).axes[0].patches → 5 cột cao 1, 1, 1, 3, 1')

DA02 = dict(
    code='DA02', title='Mini-project: điểm số và GPA', minutes=50, gate=True, exam='Dự án DA · GPA',
    goal='Làm sạch bảng điểm, tính GPA có trọng số tín chỉ, xếp hạng chữ và vẽ phân bố.',
    prereq='DA01', support=['grades.csv'], packages=PACKAGES, env=DA_ENV,
    brief='Boss cuối khoá, phần 2. grades.csv (cấp sẵn, thang 10) có lỗi cố ý; grain: một sinh viên, một môn, một điểm. '
          'Tự viết sáu hàm thuần. (1) load_grades(path): mọi cột là chữ. (2) clean_grades(raw) → (clean, report): '
          'student_id và course bỏ khoảng trắng hai đầu và viết HOA; score thiếu hoặc không phải số → missing_score (KHÔNG '
          'thay bằng 0); score ngoài [0, 10] → out_of_range; credits thiếu, không phải số hoặc ≤ 0 → bad_credits; trong các '
          'dòng hợp lệ, cặp (student_id, course) gặp lại → duplicate, giữ dòng đầu; report đếm rows_in, rows_out và từng '
          'lý do. (3) letter(gpa): A ≥ 8.5, B ≥ 7.0, C ≥ 5.5, D ≥ 4.0, còn lại F. (4) gpa_table(clean): mỗi sinh viên một '
          'dòng — courses, credits, gpa = Σ(điểm × tín chỉ) / Σ tín chỉ (làm tròn 2 chữ số), letter — sắp gpa giảm dần. '
          '(5) class_gpa(clean): GPA chung theo tín chỉ của cả lớp. (6) grade_chart(table) → Figure: hist GPA với bins '
          '[0, 4, 5.5, 7, 8.5, 10], tiêu đề ghi cỡ mẫu n, có nhãn hai trục.',
    example='Sinh viên A có điểm [6, 9], tín chỉ [1, 2] → GPA = (6×1 + 9×2) / 3 = 8.0, không phải 7.5. '
            'grades.csv: 18 dòng → 13 dòng hợp lệ, 7 sinh viên, GPA chung 6.67.',
    explain=[
        'Schema trước khi tính: score là số trong [0, 10], credits là số dương, khoá của grain là cặp (student_id, course). '
        'Bỏ trùng chỉ theo student_id là xoá mất các môn khác của cùng một người.',
        'Thiếu điểm KHÁC điểm 0: "abs", "N/A" hay ô trống nghĩa là chưa có điểm. Điền 0 kéo GPA xuống và có thể biến một '
        'sinh viên khá thành trượt. Loại dòng đó khỏi phép tính và báo số dòng thiếu trong report.',
        'Điểm ngoài khoảng (85 do nhập nhầm thang 100, -1) là lỗi nhập liệu: loại và báo, đừng tự chia 10 khi chưa có quy '
        'tắc nghiệp vụ. "s02 " và "S02" là một người — chuẩn hoá mã (strip + upper) TRƯỚC khi bỏ trùng và groupby.',
        'GPA = Σ(điểm × tín chỉ) / Σ(tín chỉ): môn 4 tín chỉ nặng gấp đôi môn 2 tín chỉ. GPA chung của lớp cũng là tỷ số của '
        'tổng trên mọi dòng điểm; trung bình các GPA (mean of means) chỉ trùng kết quả khi mọi người học cùng số tín chỉ.',
        'Hạng chữ theo biên dưới: A ≥ 8.5, B ≥ 7.0, C ≥ 5.5, D ≥ 4.0, còn lại F — dùng >= ở mọi mốc, xếp hạng trên GPA đã '
        'làm tròn 2 chữ số. Histogram dùng chính các mốc đó làm biên bin (bin [a, b) gồm biên trái) và ghi cỡ mẫu n trong '
        'tiêu đề, để người đọc biết 3 sinh viên hạng B là trên tổng bao nhiêu.',
    ],
    predict=dict(q='Sinh viên A có điểm [6, 9] với tín chỉ [1, 2]. GPA của A là?', options=[
        ('8.0 = (6×1 + 9×2) / 3', 'Trung bình có trọng số tín chỉ: môn 2 tín chỉ nặng gấp đôi.', True),
        ('7.5 = (6 + 9) / 2', 'Trung bình không trọng số — coi môn 1 tín chỉ nặng bằng môn 2 tín chỉ.', False),
        ('24', 'Đó mới là tử số Σ(điểm × tín chỉ), chưa chia tổng tín chỉ.', False),
    ]),
    myth=('"Điểm thiếu thì coi như 0 cho đủ dòng"',
          'Thiếu điểm (vắng thi, chưa nhập, "N/A") không phải là được 0 điểm. fillna(0) làm GPA của S02 rơi từ 7.5 xuống '
          '3.21 — từ hạng B thành F — chỉ vì một ô "abs". Đúng là loại dòng khỏi phép tính GPA và báo số dòng thiếu. Cùng '
          'họ với lỗi này: lấy trung bình điểm không trọng số, bỏ trùng theo sai khoá, quên strip mã sinh viên, và dùng > '
          'thay cho >= ở mốc hạng.'),
    mcq=[
        dict(q='grades.csv có "S03,Chi,CS101,4,4.0" và "S03,Chi,cs101 ,4,4". Làm sạch thế nào cho đúng grain?', options=[
            ('Chuẩn hoá course (strip + upper), ép score về số, rồi duplicated(subset=["student_id", "course"]) — giữ bản đầu',
             'Sau chuẩn hoá hai dòng cùng khoá (S03, CS101): một môn chỉ được tính một lần.', True),
            ('drop_duplicates(subset="student_id")', 'Mỗi sinh viên chỉ còn đúng một môn — GPA sai hết.', False),
            ('drop_duplicates() ngay trên raw', '"CS101"/"cs101 " và "4.0"/"4" khác nhau ở dạng chữ nên không bị coi là '
                                                'trùng: môn bị tính hai lần.', False),
        ]),
        dict(q='GPA của một sinh viên đúng bằng 7.0 thì hạng chữ là?', options=[
            ('B — mốc B là ≥ 7.0, biên dưới thuộc hạng trên', 'Dùng >= ở mọi mốc.', True),
            ('C — vì chưa vượt quá 7.0', 'Viết > thay vì >= là lệch một hạng ngay tại biên.', False),
            ('Tuỳ cách làm tròn', 'GPA đã làm tròn 2 chữ số; 7.0 nằm đúng mốc B.', False),
        ]),
        dict(q='Lớp có X học 20 tín chỉ, GPA 8.0, và Y học 4 tín chỉ, GPA 5.0. GPA chung theo tín chỉ của lớp là?', options=[
            ('(8.0×20 + 5.0×4) / 24 = 7.5', 'Tỷ số của tổng: mỗi tín chỉ nặng như nhau.', True),
            ('(8.0 + 5.0) / 2 = 6.5', 'Trung bình các GPA (mean of means) coi 4 tín chỉ của Y nặng bằng 20 tín chỉ của X.', False),
            ('8.0', 'Chỉ lấy người học nhiều tín chỉ hơn — bỏ mất Y.', False),
        ]),
    ],
    why=dict(
        prompt='Vì sao GPA là Σ(điểm × tín chỉ) / Σ(tín chỉ) chứ không phải trung bình điểm, và vì sao không được thay điểm '
               'thiếu bằng 0?',
        sample='Môn nhiều tín chỉ chiếm nhiều thời lượng hơn nên phải nặng hơn: điểm [6, 9] với tín chỉ [1, 2] cho GPA 8.0, '
               'trung bình thường ra 7.5 là coi hai môn ngang nhau. Điểm thiếu là chưa có dữ liệu chứ không phải được 0: '
               'thay bằng 0 vừa kéo tử số xuống vừa giữ nguyên mẫu số, nên GPA tụt oan (7.5 thành 3.21). Đúng là loại dòng '
               'thiếu khỏi cả tử lẫn mẫu và ghi số dòng bị loại vào report.'),
    flow=['load_grades: grades.csv → 18 dòng chữ.',
          'clean_grades: strip + upper mã → ép số → missing_score 2, out_of_range 1, bad_credits 1, duplicate 1 → 13 dòng.',
          'gpa_table: S01 (8×3 + 6.5×2 + 9×4) / 9 = 8.11 → B; S06 (6×2 + 7.5×4) / 6 = 7.0 → B.',
          'class_gpa: 287 / 43 = 6.67 (trung bình 7 GPA lại ra 6.5).',
          'grade_chart: hist theo [0, 4, 5.5, 7, 8.5, 10] → cột F, D, C, B, A cao 1, 1, 1, 3, 1; tiêu đề n=7.'],
    transfer='Bộ chấm dùng thêm một bảng điểm khác chưa thấy: "N/A", điểm -1 và 10.5, tín chỉ "abc" hoặc trống, mã có dấu '
             'cách đầu, và GPA rơi đúng các mốc 8.5, 5.5, 4.0, 3.99 — lệch một dấu >= là trượt.',
    counter=dict(q='Sinh viên có MATH101 = 9.0 (3 tín chỉ) và CS101 = "abs" (4 tín chỉ). GPA theo chính sách của bài?',
                 options=['9.0', '3.86', '4.5'], correct='9.0'),
    practice='Làm từng hàm và in ra đối chiếu với grades.csv (18 → 13 dòng; S01 = 8.11) trước khi sang hàm sau. Nộp lần '
             'đầu trước khi xem lời giải.',
    steps=['load_grades: pd.read_csv(path, dtype=str).',
           'clean_grades: df = raw.copy(); student_id, course .str.strip().str.upper(); pd.to_numeric(..., errors="coerce") '
           'cho score và credits — KHÔNG fillna(0).',
           'Series reason: missing_score → out_of_range → bad_credits, chỉ gán cho dòng còn ""; rồi duplicated(subset='
           '["student_id", "course"]) trong các dòng còn "" → "duplicate"; report đếm theo REASONS.',
           'letter: chuỗi if gpa >= 8.5 / 7.0 / 5.5 / 4.0.',
           'gpa_table: thêm points = score × credits, groupby("student_id").agg(...), gpa = (points / credits).round(2), '
           'letter = gpa.map(letter), sort_values("gpa", ascending=False). class_gpa = Σ points / Σ credits.',
           'grade_chart: fig, ax = plt.subplots(); ax.hist(table["gpa"], bins=GRADE_BINS); ax.set(title=f"... n={len(table)}", '
           'xlabel=..., ylabel=...); return fig.'],
    partial=r'''    df = clean.assign(points=clean["score"] * clean["credits"])
    table = df.groupby("student_id").agg(
        courses=("course", "count"),
        credits=("credits", "sum"),
        points=("points", "sum"),
    )
    table["gpa"] = (table["points"] / table["credits"]).round(2)
    ...''',
    io=[('grades.csv', 'report: 18 → 13 (missing_score 2, out_of_range 1, bad_credits 1, duplicate 1)'),
        ('gpa_table + class_gpa', 'S04 8.64 A · S01 8.11 B · S02 7.5 B · S06 7.0 B · S07 6.29 C · S03 4.43 D · S05 3.5 F; '
                                  'GPA chung 6.67')],
    contracts=[K_LOAD_GRADES, K_CLEAN_GRADES, K_LETTER, K_GPA, K_CLASS, K_HIST],
    starter=DA02_STARTER,
    solution=DA02_SOLUTION,
    tests=DA02_TESTS,
    bad=[
        ('coi điểm thiếu là 0', DA02_SOLUTION.replace(
            'df["score"] = pd.to_numeric(df["score"], errors="coerce")',
            'df["score"] = pd.to_numeric(df["score"], errors="coerce").fillna(0)')),
        ('trung bình điểm không trọng số', DA02_SOLUTION.replace(
            'table["gpa"] = (table["points"] / table["credits"]).round(2)',
            'table["gpa"] = df.groupby("student_id")["score"].mean().round(2)')),
        ('bỏ trùng theo student_id', DA02_SOLUTION.replace(
            'duplicated(subset=["student_id", "course"], keep="first")', 'duplicated(subset=["student_id"], keep="first")')),
        ('quên strip mã sinh viên', DA02_SOLUTION.replace(
            'df["student_id"].str.strip().str.upper()', 'df["student_id"].str.upper()')),
        ('mốc B dùng > thay vì >=', DA02_SOLUTION.replace('    if gpa >= 7.0:\n', '    if gpa > 7.0:\n')),
        ('GPA lớp = trung bình các GPA', DA02_SOLUTION.replace(
            '    return round(float(total / clean["credits"].sum()), 2)',
            '    return round(float(gpa_table(clean)["gpa"].mean()), 2)')),
        ('hist với bins mặc định', DA02_SOLUTION.replace('bins=GRADE_BINS', 'bins=5')),
    ],
)

LESSONS = [DA01, DA02]

BRIEFS = {
    'DA01': dict(
        goal='Tự dựng pipeline doanh thu từ raw tới chart.',
        task='Viết load → clean (có lý do loại) → report → KPI → chart; sales.csv phải ra 6 đơn, revenue 155.',
        predict='drop_duplicates() không tham số đã đủ để bỏ trùng đơn hàng chưa?',
        code=['def load_sales(path): ...            # mọi cột là chữ',
              'def clean_sales(raw): ...            # → (clean, rejected)',
              'def quality_report(raw, clean, rejected): ...',
              'def kpi_table(clean, by): ...        # orders, qty, revenue, avg_price',
              'def revenue_chart(clean): ...        # → Figure: barh + line'],
        tests=['sales.csv → 6 đơn, revenue 155', 'kpi_table(clean, "region") → north 65, south 90'],
        reflect='Vì sao rows_in phải bằng rows_out cộng tổng các lý do loại?'),
    'DA02': dict(
        goal='Làm sạch bảng điểm và tính GPA có trọng số tín chỉ.',
        task='Viết clean (thiếu ≠ 0, ngoài [0, 10], trùng SV + môn) → GPA → hạng chữ → bảng tổng hợp → hist.',
        predict='Điểm [6, 9], tín chỉ [1, 2]: GPA là 7.5 hay 8.0?',
        code=['def clean_grades(raw): ...   # → (clean, report)',
              'def letter(gpa): ...         # A ≥ 8.5, B ≥ 7, C ≥ 5.5, D ≥ 4',
              'def gpa_table(clean): ...    # Σ(điểm × tín chỉ) / Σ tín chỉ',
              'def class_gpa(clean): ...',
              'def grade_chart(table): ...  # → Figure: hist, n=…'],
        tests=['grades.csv → 18 dòng vào, 13 dòng hợp lệ', 'letter(8.5) → "A", letter(6.99) → "C"'],
        reflect='Vì sao không được thay điểm thiếu bằng 0?'),
}
