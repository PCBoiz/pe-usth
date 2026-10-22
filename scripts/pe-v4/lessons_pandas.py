"""pe-v4 — M6 pandas (PD01–PD09).

Nguồn: python-learning-data.json bài PD01–PD09 (points, examples, exercise; handbook trang
113–130) và da-sales-practice.csv (cấp sẵn thành `sales.csv`, chính sách tham chiếu:
11 dòng thô → 6 đơn hợp lệ, revenue = 155).

Bài tập chấm điểm là HÀM nhận DataFrame (clean_sales(raw), region_kpi(df)…) để ca chấm gọi
lại với dữ liệu KHÁC ví dụ: nhãn lẫn khoảng trắng/hoa thường, qty thiếu hoặc là chữ, ngày
hỏng, đơn gửi lại, qty âm. Ca chấm chỉ so giá trị Python thuần (tolist, to_dict, round…) vì
bộ chấm làm `actual == expected`: so hai DataFrame sẽ ra DataFrame chứ không ra True/False,
và NaN không bằng chính nó — ô thiếu được đếm (isna().sum()) hoặc fillna(-1) trước khi so.

Ghi chú phiên bản: trình duyệt chạy pandas 2.2.3 / numpy 2.0.2 (Pyodide 0.27.7). Biến thể
sai "chained assignment" dùng dạng df[mask]["cột"] = … vì dạng này KHÔNG sửa df ở cả pandas
2.2 lẫn 3.0; dạng df["cột"][mask] = … vẫn "ăn" ở 2.2 nên không dùng làm biến thể sai.

Excel (read_excel/openpyxl) chỉ dạy ở phần giải thích của PD02, không có ca chấm: openpyxl
không có trong pyodide-lock.json 0.27.7.
"""
from authoring import DA_ENV, T, TX, out, run  # noqa: F401  (out/run giữ cho đồng bộ quy ước)

PKG = ['numpy', 'pandas']


def write(name, text):
    """Biểu thức ca chấm: ghi `text` thành file trong thư mục chạy, trả lại tên file."""
    return f'_studio.write({name!r}, {text!r})'


def read_csv(name, text):
    """Biểu thức ca chấm: DataFrame đọc thô từ CSV — đúng hình dạng học viên nhận khi read_csv."""
    return f'pd.read_csv({write(name, text)})'


def keep_raw(fn_call, inspect):
    """Biểu thức: gọi hàm trên `r` rồi trả `inspect` của chính `r` (kiểm hàm không sửa đầu vào)."""
    return f'(lambda r: ({fn_call}, {inspect})[1])'


# ---------------------------------------------------------------- file cấp sẵn

# Đúng từng byte da-sales-practice.csv (xuống dòng CRLF như file gốc). lessons_da.py khai CÙNG
# file này; build.py từ chối hai nội dung khác nhau cho một tên file, nên giữ y hệt bản đó.
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

SCORES_CSV = '''id;mark;note
001;8;
007;9;retake
010;missing;absent
'''

SUPPORT = {
    'sales.csv': SALES_CSV,
    'scores.csv': SCORES_CSV,
}


# ================================================================== PD01

PD01_SOLUTION = r'''import pandas as pd


def pick(df, sid):
    by_label = df.loc[sid, "mark"]
    first = df.iloc[0]["mark"]
    return int(by_label), int(first)


def add_bonus(marks, bonus):
    return marks + bonus


if __name__ == "__main__":
    df = pd.DataFrame({"mark": [7, 9]}, index=["S01", "S02"])
    print(df.shape, df.dtypes.to_dict())
    print(pick(df, "S02"))
    bonus = pd.Series([1, 0], index=["S02", "S01"])
    print(add_bonus(df["mark"], bonus).to_dict())
'''

PD01_STARTER = r'''import pandas as pd


def pick(df, sid):
    # Trả (điểm của sid lấy theo NHÃN, điểm của hàng đầu lấy theo VỊ TRÍ), cả hai ép int
    pass


def add_bonus(marks, bonus):
    # Cộng điểm thưởng theo mã sinh viên, không theo vị trí
    pass


if __name__ == "__main__":
    df = pd.DataFrame({"mark": [7, 9]}, index=["S01", "S02"])
    print(df.shape, df.dtypes.to_dict())
    print(pick(df, "S02"))
'''

DF_S = 'pd.DataFrame({"mark": [7, 9]}, index=["S01", "S02"])'
MARKS3 = 'pd.Series([7, 9, 5], index=["S01", "S02", "S03"])'

# ================================================================== PD02

PD02_SOLUTION = r'''import pandas as pd


def load_scores(path):
    return pd.read_csv(
        path,
        sep=";",
        usecols=["id", "mark"],
        dtype={"id": "string"},
        na_values=["missing"],
    )


def export_csv(df, path):
    df.to_csv(path, index=False)


if __name__ == "__main__":
    scores = load_scores("scores.csv")
    print(scores.dtypes.to_dict())
    print(len(scores), "dòng,", int(scores["mark"].isna().sum()), "ô thiếu")
    export_csv(scores, "scores_clean.csv")
    print(open("scores_clean.csv", encoding="utf-8").read())
'''

PD02_STARTER = r'''import pandas as pd


def load_scores(path):
    # read_csv với sep, usecols, dtype, na_values khai rõ
    pass


def export_csv(df, path):
    # Ghi CSV dấu phẩy, không có cột index
    pass


if __name__ == "__main__":
    print(load_scores("scores.csv"))
'''

T2_TEXT = 'id;mark;note\n0042;missing;a\n0107;6;b\n0200;7.5;c\n'
T2_BLANK = 'id;mark;note\n0042;missing;a\n0107;;b\n0200;7.5;c\n'
NO_MARK = 'id;score\n001;8\n'

# ================================================================== PD03

PD03_SOLUTION = r'''import pandas as pd


def score_stats(values):
    s = pd.to_numeric(pd.Series(values), errors="coerce")
    valid = s.dropna()
    mean = round(float(valid.mean()), 2) if len(valid) else None
    return {"bad": int(s.isna().sum()), "mean": mean}


def clean_sales(raw):
    df = raw.copy()
    df["region"] = df["region"].str.strip().str.lower()
    df["qty"] = pd.to_numeric(df["qty"], errors="coerce")
    df["unit_price"] = pd.to_numeric(df["unit_price"], errors="coerce")
    df = df.drop_duplicates(subset="order_id", keep="first")
    df = df.dropna(subset=["qty", "unit_price"])
    return df.reset_index(drop=True)


if __name__ == "__main__":
    print(score_stats(["8", "bad", "9"]))
    raw = pd.read_csv("sales.csv")
    clean = clean_sales(raw)
    print(len(raw), "->", len(clean), "dòng")
    print(clean[["order_id", "region", "qty", "unit_price"]])
'''

PD03_STARTER = r'''import pandas as pd


def score_stats(values):
    # {"bad": số ô không đổi được thành số, "mean": trung bình ô hợp lệ (2 chữ số) hoặc None}
    pass


def clean_sales(raw):
    # Không sửa raw: làm trên bản copy
    pass


if __name__ == "__main__":
    print(score_stats(["8", "bad", "9"]))
    print(clean_sales(pd.read_csv("sales.csv")))
'''

RAW_A_TEXT = '''order_id,date,region,product,qty,unit_price
A1,2026-03-01, Hanoi ,Pen,2,5
A2,2026-03-01,HANOI,Pen,two,5
A3,2026-03-02,hue,Book,1,12
A3,2026-03-02,Hue,Book,4,12
A4,2026-03-03,hue ,Book,1,12
A5,2026-03-03,Hanoi,Pen,,5
A6,2026-03-04,hanoi,Pen,3,?
A7,2026-03-03,hue,Book,1,12
'''
RAW_A = read_csv('raw_a.csv', RAW_A_TEXT)

# ================================================================== PD04

PD04_SOLUTION = r'''import pandas as pd


def add_flags(df):
    out = df.copy()
    out["revenue"] = out["qty"] * out["unit_price"]
    out["status"] = "ok"
    out.loc[out["qty"] <= 0, "status"] = "check"
    return out


def top_orders(df, region, min_revenue):
    data = add_flags(df)
    mask = (data["region"] == region) & (data["status"] == "ok") & (data["revenue"] >= min_revenue)
    return data.loc[mask].sort_values("revenue", ascending=False)


if __name__ == "__main__":
    orders = pd.DataFrame({
        "order_id": ["O1", "O2", "O3", "O4"],
        "region": ["north", "north", "south", "north"],
        "qty": [2, 3, 2, -1],
        "unit_price": [10, 20, 20, 10],
    })
    print(add_flags(orders))
    print(top_orders(orders, "north", 30))
    print(orders.columns.tolist())
'''

PD04_STARTER = r'''import pandas as pd


def add_flags(df):
    # Bản copy + cột revenue + cột status ("ok", riêng qty <= 0 là "check")
    pass


def top_orders(df, region, min_revenue):
    # Đúng region, status "ok", revenue >= min_revenue, sắp revenue giảm dần
    pass


if __name__ == "__main__":
    orders = pd.DataFrame({
        "order_id": ["O1", "O2", "O3", "O4"],
        "region": ["north", "north", "south", "north"],
        "qty": [2, 3, 2, -1],
        "unit_price": [10, 20, 20, 10],
    })
    print(add_flags(orders))
    print(top_orders(orders, "north", 30))
'''

D4 = ('pd.DataFrame({"order_id": ["B1", "B2", "B3", "B4", "B5", "B6"], '
      '"region": ["hue", "hanoi", "hue", "hue", "hue", "hanoi"], '
      '"qty": [5, 4, 0, 1, -2, 2], "unit_price": [8.0, 10.0, 30.0, 50.0, 25.0, 40.0]})')
D4_EXAMPLE = ('pd.DataFrame({"order_id": ["O1", "O2"], "region": ["north", "north"], '
              '"qty": [2, 3], "unit_price": [10, 20]})')

# ================================================================== PD05

PD05_SOLUTION = r'''import pandas as pd


def region_kpi(df):
    data = df.assign(
        region=df["region"].fillna("unknown"),
        revenue=df["qty"] * df["unit_price"],
    )
    out = data.groupby("region").agg(
        orders=("order_id", "size"),
        qty=("qty", "sum"),
        revenue=("revenue", "sum"),
    )
    out["avg_price"] = out["revenue"] / out["qty"]
    out["share"] = out["revenue"] / out["revenue"].sum()
    lost = data["revenue"].sum() - out["revenue"].sum()
    assert abs(lost) < 1e-9, "Tổng theo vùng lệch tổng nguồn: có dòng bị mất khi groupby"
    return out


if __name__ == "__main__":
    orders = pd.DataFrame({
        "order_id": ["O1", "O2", "O3"],
        "region": ["A", "A", "B"],
        "qty": [1, 1, 1],
        "unit_price": [10, 20, 40],
    })
    kpi = region_kpi(orders)
    print(kpi)
    print("Vùng A chiếm", round(kpi.loc["A", "share"], 4), "tổng doanh thu")
'''

PD05_STARTER = r'''import pandas as pd


def region_kpi(df):
    # Index là region; cột orders, qty, revenue, avg_price, share
    pass


if __name__ == "__main__":
    orders = pd.DataFrame({
        "order_id": ["O1", "O2", "O3"],
        "region": ["A", "A", "B"],
        "qty": [1, 1, 1],
        "unit_price": [10, 20, 40],
    })
    print(region_kpi(orders))
'''

DK = ('pd.DataFrame({"order_id": ["C1", "C2", "C3", "C4", "C5", "C6"], '
      '"region": ["north", "north", "south", "south", "south", None], '
      '"qty": [1, 3, 2, None, 2, 1], "unit_price": [10.0, 20.0, 15.0, 15.0, 30.0, 5.0]})')
DK_EXAMPLE = ('pd.DataFrame({"order_id": ["1", "2", "3"], "region": ["A", "A", "B"], '
              '"qty": [1, 1, 1], "unit_price": [10, 20, 40]})')

# ================================================================== PD06

PD06_SOLUTION = r'''import pandas as pd


def attach_prices(orders, prices):
    return orders.merge(
        prices,
        on="sku",
        how="left",
        validate="many_to_one",
        indicator=True,
    )


def stack(frames):
    columns = set(frames[0].columns)
    for frame in frames[1:]:
        if set(frame.columns) != columns:
            raise ValueError("Các bảng không cùng schema: " + str(sorted(frame.columns)))
    return pd.concat(frames, ignore_index=True)


if __name__ == "__main__":
    orders = pd.DataFrame({"order_id": ["O1", "O2"], "sku": ["A", "B"], "qty": [2, 1]})
    prices = pd.DataFrame({"sku": ["A"], "price": [10]})
    out = attach_prices(orders, prices)
    print(out)
    print(len(orders), "đơn ->", len(out), "dòng;", int(out["price"].isna().sum()), "đơn thiếu giá")
    jan = pd.DataFrame({"sku": ["A"], "qty": [3]})
    feb = pd.DataFrame({"sku": ["B"], "qty": [5]})
    print(stack([jan, feb]))
'''

PD06_STARTER = r'''import pandas as pd


def attach_prices(orders, prices):
    # Left merge theo sku, validate="many_to_one", indicator=True
    pass


def stack(frames):
    # Kiểm mọi bảng cùng tập cột (khác thì ValueError) rồi concat, index mới 0..n-1
    pass


if __name__ == "__main__":
    orders = pd.DataFrame({"order_id": ["O1", "O2"], "sku": ["A", "B"], "qty": [2, 1]})
    prices = pd.DataFrame({"sku": ["A"], "price": [10]})
    print(attach_prices(orders, prices))
'''

O6 = 'pd.DataFrame({"order_id": ["D1", "D2", "D3", "D4"], "sku": ["PEN", "BOOK", "PEN", "CUP"], "qty": [2, 1, 5, 3]})'
P6 = 'pd.DataFrame({"sku": ["PEN", "BOOK"], "price": [4.0, 12.0]})'
P6_DUP = 'pd.DataFrame({"sku": ["PEN", "PEN", "BOOK"], "price": [4.0, 4.5, 12.0]})'

# ================================================================== PD07

PD07_SOLUTION = r'''import pandas as pd


def to_long(wide):
    return wide.melt(id_vars="region", var_name="month", value_name="revenue")


def to_wide(long):
    table = long.pivot_table(index="region", columns="month", values="revenue", aggfunc="sum")
    return table


if __name__ == "__main__":
    wide = pd.DataFrame({"region": ["north", "south"], "2026-01": [110, 60], "2026-02": [45, 30]})
    long = to_long(wide)
    print(long)
    back = to_wide(long)
    print(back)
    print("Tổng trước/sau:", wide[["2026-01", "2026-02"]].sum().sum(), back.sum().sum())
'''

PD07_STARTER = r'''import pandas as pd


def to_long(wide):
    # wide: cột region + mỗi tháng một cột -> long: region, month, revenue
    pass


def to_wide(long):
    # long (có thể trùng region, month) -> wide: index region, cột month, ô = TỔNG revenue
    pass


if __name__ == "__main__":
    wide = pd.DataFrame({"region": ["north", "south"], "2026-01": [110, 60], "2026-02": [45, 30]})
    print(to_long(wide))
'''

W7 = 'pd.DataFrame({"region": ["hanoi", "hue"], "2026-01": [100, 40], "2026-02": [80, 60]})'
L7 = ('pd.DataFrame({"region": ["hanoi", "hanoi", "hue", "hanoi", "hue"], '
      '"month": ["2026-01", "2026-01", "2026-01", "2026-02", "2026-03"], "revenue": [30, 20, 15, 40, 25]})')

# ================================================================== PD08

PD08_SOLUTION = r'''import pandas as pd


def monthly_revenue(df):
    data = df.copy()
    data["date"] = pd.to_datetime(data["date"], format="%Y-%m-%d", errors="coerce")
    data = data.dropna(subset=["date"])
    monthly = data.set_index("date")["revenue"].resample("MS")
    return monthly.sum(min_count=1)


def rolling_mean(s, window):
    return s.sort_index().rolling(window).mean()


if __name__ == "__main__":
    sales = pd.read_csv("sales.csv").drop_duplicates(subset="order_id")
    sales = sales.loc[sales["qty"] > 0].copy()
    sales["revenue"] = sales["qty"] * sales["unit_price"]
    monthly = monthly_revenue(sales)
    print(monthly)
    print(rolling_mean(monthly, 2))
'''

PD08_STARTER = r'''import pandas as pd


def monthly_revenue(df):
    # to_datetime(..., errors="coerce") -> bỏ NaT -> set_index -> resample("MS") -> tổng (tháng trống = NaN)
    pass


def rolling_mean(s, window):
    # Sắp theo ngày rồi trung bình trượt window quan sát
    pass


if __name__ == "__main__":
    sales = pd.read_csv("sales.csv")
    print(sales[["date", "qty", "unit_price"]])
'''

TD8 = ('pd.DataFrame({"date": ["2026-03-02", "2026-01-05", "bad", "2026-01-20", "2026-03-30", "2026-13-01"], '
       '"revenue": [40, 10, 99, 20, 5, 7]})')
S8_UNSORTED = 'pd.Series([8, 2, 4], index=pd.to_datetime(["2026-01-03", "2026-01-01", "2026-01-02"]))'
SALES_POLICY = ('pd.read_csv("sales.csv").drop_duplicates(subset="order_id").query("qty > 0")'
                '.assign(revenue=lambda d: d["qty"] * d["unit_price"])')

# ================================================================== PD09

PD09_SOLUTION = r'''import pandas as pd


def _parse(raw):
    qty = pd.to_numeric(raw["qty"], errors="coerce")
    price = pd.to_numeric(raw["unit_price"], errors="coerce")
    dates = pd.to_datetime(raw["date"], format="%Y-%m-%d", errors="coerce")
    return qty, price, dates


def quality_report(raw):
    qty, price, dates = _parse(raw)
    return {
        "rows": int(len(raw)),
        "duplicate_ids": int(raw["order_id"].duplicated().sum()),
        "missing_qty": int(qty.isna().sum()),
        "negative_qty": int((qty < 0).sum()),
        "missing_price": int(price.isna().sum()),
        "bad_dates": int(dates.isna().sum()),
    }


def export_clean(raw, path):
    qty, price, dates = _parse(raw)
    df = raw.copy()
    df["qty"] = qty
    df["unit_price"] = price
    df["date"] = dates
    df = df.drop_duplicates(subset="order_id", keep="first")
    df = df.dropna(subset=["qty", "unit_price", "date"])
    df = df.loc[df["qty"] > 0].copy()
    df["region"] = df["region"].str.strip().str.lower()
    df["revenue"] = df["qty"] * df["unit_price"]
    df.to_csv(path, index=False)
    return {"raw_rows": int(len(raw)), "clean_rows": int(len(df)), "revenue": float(df["revenue"].sum())}


if __name__ == "__main__":
    raw = pd.read_csv("sales.csv")
    print(raw.describe())
    print(quality_report(raw))
    print(export_clean(raw, "sales_clean.csv"))
    print(pd.read_csv("sales_clean.csv"))
'''

PD09_STARTER = r'''import pandas as pd


def quality_report(raw):
    # dict: rows, duplicate_ids, missing_qty, negative_qty, missing_price, bad_dates — không sửa raw
    pass


def export_clean(raw, path):
    # Làm sạch trên bản sao, ghi CSV không index, trả {"raw_rows", "clean_rows", "revenue"}
    pass


if __name__ == "__main__":
    raw = pd.read_csv("sales.csv")
    print(raw.describe())
    print(quality_report(raw))
'''

R9_TEXT = '''order_id,date,region,product,qty,unit_price
E1,2026-04-01,Hue,Pen,3,2.5
E2,2026-04-01,hue ,Pen,x,2.5
E2,2026-04-01,hue ,Pen,x,2.5
E3,2026/04/02,Hanoi,Book,1,12
E4,2026-04-03,hanoi,Book,-2,12
E5,2026-04-31,HANOI,Pen,4,
E6,2026-04-05,hue,Book,2,12
E6,2026-04-05,hue,Book,5,12
'''
R9 = read_csv('raw_e.csv', R9_TEXT)
SALES = 'pd.read_csv("sales.csv")'


LESSONS = [
    # ------------------------------------------------------------------ PD01
    dict(
        code='PD01', title='Series, DataFrame và index', minutes=30,
        goal='Phân biệt nhãn (loc) với vị trí (iloc) và thấy phép tính Series căn theo index.',
        prereq=None, env=DA_ENV, packages=PKG,
        brief='Viết hai hàm. pick(df, sid): df có cột "mark" và index là mã sinh viên; trả tuple (điểm của sid lấy theo '
              'NHÃN bằng loc, điểm của hàng ĐẦU TIÊN lấy theo VỊ TRÍ bằng iloc), cả hai ép về int. '
              'add_bonus(marks, bonus): hai Series điểm cùng tập mã sinh viên nhưng có thể khác thứ tự; trả Series '
              'marks + bonus cộng đúng theo mã.',
        example='Index S01, S02 với điểm 7, 9: pick(df, "S02") → (9, 7). marks {S01: 7, S02: 9} cộng bonus '
                '{S02: 1, S01: 0} → {S01: 7, S02: 10}.',
        demo=r'''import pandas as pd

s = pd.Series([8, 9, 6], index=[30, 10, 20])
print(s.loc[10], s.iloc[0])

df = pd.DataFrame({"name": ["Mai", "An"], "mark": [8, 9]}, index=["S01", "S02"])
print(df.shape)
print(df.dtypes.to_dict())
print(type(df["mark"]).__name__, type(df[["mark"]]).__name__)

a = pd.Series([1, 2], index=["x", "y"])
b = pd.Series([10, 20], index=["y", "x"])
print((a + b).to_dict())
''',
        explain=[
            'Series là một cột có nhãn; DataFrame là bảng nhiều cột, mỗi cột một dtype. Cả hai có index — tập NHÃN của hàng.',
            'loc tra theo nhãn, iloc theo vị trí: với index [30, 10, 20], s.loc[10] là 9 còn s.iloc[0] là 8.',
            'df["mark"] trả Series; df[["mark"]] (list tên cột) giữ DataFrame một cột, shape (n, 1).',
            'Trước khi phân tích, nhìn shape, dtypes, head(), info(), describe() — biết bảng có bao nhiêu hàng, cột nào kiểu gì.',
            'a + b căn theo NHÃN chứ không theo vị trí: x cộng x, y cộng y. Nhãn có ở bên này mà thiếu ở bên kia cho NaN — '
            'kiểm nhãn trước khi cộng hay ghép.',
        ],
        predict=dict(q='s.loc[20] và s.iloc[0] lần lượt là?',
                     code='s = pd.Series([8, 9], index=[10, 20])',
                     options=[
                         ('9 và 8', 'loc[20] tìm NHÃN 20 (giá trị 9); iloc[0] lấy VỊ TRÍ đầu (giá trị 8).', True),
                         ('KeyError ở loc[20] vì Series chỉ có 2 phần tử', 'loc tìm nhãn 20, không phải vị trí 20 — nhãn 20 có tồn tại.', False),
                         ('8 và 8', 'loc theo nhãn, nên 20 trỏ tới phần tử thứ hai.', False),
                     ]),
        myth=('"Index chỉ là số thứ tự hàng 0, 1, 2…"',
              'Index là NHÃN. Sau khi lọc, sắp xếp hoặc đặt mã sinh viên làm index, nhãn không còn trùng vị trí: '
              'df.loc[0] có thể KeyError hoặc trả nhầm hàng, còn s[0] trên Series index số là tra NHÃN 0. Cần hàng đầu '
              'tiên thì iloc[0]; cần đúng mã thì loc[mã].'),
        mcq=[
            dict(q='df["mark"] và df[["mark"]] khác nhau thế nào?', options=[
                ('Một cặp [] cho Series; hai cặp [] (list tên cột) cho DataFrame một cột', 'shape lần lượt là (n,) và (n, 1).', True),
                ('Giống hệt nhau', 'Kiểu trả về khác nhau: Series và DataFrame.', False),
                ('df[["mark"]] là cú pháp lỗi', 'Truyền list tên cột là cách chọn nhiều cột — ở đây list một phần tử.', False),
            ]),
            dict(q='a = Series([1, 2], index=["x", "y"]); b = Series([10, 20], index=["y", "x"]). (a + b)["x"] = ?', options=[
                ('21', 'x của a (1) cộng x của b (20).', True),
                ('11', 'Đó là cộng theo vị trí — pandas căn theo nhãn.', False),
                ('Lỗi vì index khác thứ tự', 'Cùng tập nhãn thì pandas tự căn.', False),
            ]),
            dict(q='Muốn biết bảng có bao nhiêu hàng, cột và kiểu từng cột, xem gì trước?', options=[
                ('df.shape và df.dtypes (hoặc df.info())', 'Đây là bước kiểm tra trước khi phân tích.', True),
                ('print(df) rồi đếm tay', 'Bảng lớn thì print bị rút gọn; shape cho con số chính xác.', False),
                ('Chỉ cần df.describe()', 'describe chỉ tóm tắt cột số, không cho biết dtype của cột chữ.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao pick dùng loc cho mã sinh viên nhưng iloc cho "hàng đầu"?',
            sample='Mã sinh viên là NHÃN của index nên tra bằng loc[sid]. "Hàng đầu" là VỊ TRÍ 0, không phải nhãn 0 — với '
                   'index S01, S02 thì nhãn 0 không tồn tại, với index [1, 0] thì nhãn 0 lại là hàng thứ hai. iloc[0] '
                   'luôn lấy hàng đầu dù index là gì.'),
        scaffold=dict(
            intro='Dữ liệu mới: index số lộn xộn [30, 10, 20] và bonus đảo thứ tự. Lắp ba chỗ.',
            template=r'''import pandas as pd


def pick(df, sid):
    by_label = {{slot1}}
    first = {{slot2}}
    return int(by_label), int(first)


def add_bonus(marks, bonus):
    return {{slot3}}
''',
            slots=['df.loc[sid, "mark"]', 'df.iloc[0]["mark"]', 'marks + bonus'],
            traps=[('df.iloc[sid]["mark"]', 1, 'iloc nhận VỊ TRÍ số nguyên; sid là nhãn.'),
                   ('df.loc[0, "mark"]', 2, 'Nhãn 0 có thể không tồn tại hoặc không phải hàng đầu.'),
                   ('marks.values + bonus.values', 3, '.values bỏ nhãn: cộng theo vị trí, sai khi hai Series khác thứ tự.')]),
        flow=['df.loc["S02", "mark"] → tìm hàng có NHÃN S02 → 9.',
              'df.iloc[0]["mark"] → lấy hàng ở VỊ TRÍ đầu → 7.',
              'marks + bonus → căn theo mã sinh viên rồi mới cộng.',
              'df[["mark"]] → DataFrame một cột, shape (n, 1).'],
        transfer='Đổi sang index số [30, 10, 20] và bonus đảo thứ tự; kiểm loc/iloc và phép cộng vẫn đúng.',
        counter=dict(q='df có index [30, 10, 20], mark [4, 9, 7]. pick(df, 10) = ?',
                     options=['(9, 4)', '(4, 9)', 'KeyError'], correct='(9, 4)'),
        practice='loc[nhãn, cột] cho mã sinh viên; iloc[0] cho hàng đầu; cộng hai Series trực tiếp để pandas căn nhãn.',
        steps=['by_label = df.loc[sid, "mark"] — tra theo nhãn.',
               'first = df.iloc[0]["mark"] — lấy theo vị trí; ép int(...) cả hai trước khi trả.',
               'add_bonus trả marks + bonus (không dùng .values, không cộng theo vị trí).'],
        partial=r'''def pick(df, sid):
    by_label = df.loc[sid, "mark"]
    ...''',
        io=[('index S01, S02; mark 7, 9; sid "S02"', '(9, 7)'),
            ('index [30, 10, 20]; mark [4, 9, 7]; sid 10', '(9, 4)'),
            ('marks {S01: 7, S02: 9}, bonus {S02: 1, S01: 0}', '{S01: 7, S02: 10}')],
        contracts=[
            dict(sig='pick(df, sid)', does='Lấy điểm theo nhãn và điểm của hàng đầu theo vị trí.',
                 takes='df: DataFrame có cột "mark", index là mã sinh viên; sid: một nhãn có trong index',
                 gives='tuple (int, int)', effect='Không sửa df.', call='pick(df, "S02") → (9, 7)'),
            dict(sig='add_bonus(marks, bonus)', does='Cộng điểm thưởng theo đúng mã sinh viên.',
                 takes='marks, bonus: Series cùng tập nhãn, thứ tự có thể khác', gives='Series có index là mã sinh viên',
                 effect='Không sửa hai Series đầu vào.', call='add_bonus(marks, bonus).to_dict() → {"S01": 7, "S02": 10}'),
        ],
        starter=PD01_STARTER,
        solution=PD01_SOLUTION,
        tests=[
            T('Đề mẫu: S02 theo nhãn, hàng đầu theo vị trí', f'pick({DF_S}, "S02")', (9, 7)),
            T('Index số lộn xộn [30, 10, 20]', 'pick(pd.DataFrame({"mark": [4, 9, 7]}, index=[30, 10, 20]), 10)', (9, 4)),
            T('Index [1, 0]: nhãn 0 KHÔNG phải hàng đầu', 'pick(pd.DataFrame({"mark": [5, 8]}, index=[1, 0]), 0)', (8, 5)),
            T('Index chữ, hàng đầu không phải S01',
              'pick(pd.DataFrame({"mark": [5, 8, 6]}, index=["B07", "A01", "C03"]), "C03")', (6, 5)),
            T('pick trả int thuần', f'[type(v).__name__ for v in pick({DF_S}, "S01")]', ['int', 'int']),
            T('add_bonus: đề mẫu',
              'add_bonus(pd.Series([7, 9], index=["S01", "S02"]), pd.Series([1, 0], index=["S02", "S01"])).to_dict()',
              {'S01': 7, 'S02': 10}),
            T('add_bonus căn theo mã khi bonus đảo thứ tự',
              f'add_bonus({MARKS3}, pd.Series([1, 0, 2], index=["S03", "S01", "S02"])).to_dict()',
              {'S01': 7, 'S02': 11, 'S03': 6}),
            T('add_bonus không sửa marks',
              keep_raw('add_bonus(r, pd.Series([1, 1], index=["b", "a"]))', 'r.tolist()')
              + '(pd.Series([3, 4], index=["a", "b"]))', [3, 4]),
        ],
        bad=[
            ('lấy hàng đầu bằng nhãn 0', PD01_SOLUTION.replace('first = df.iloc[0]["mark"]', 'first = df.loc[0, "mark"]')),
            ('cộng theo vị trí bằng .values', PD01_SOLUTION.replace(
                'return marks + bonus', 'return pd.Series(marks.values + bonus.values, index=marks.index)')),
            ('s[0] tưởng là phần tử đầu', PD01_SOLUTION.replace('first = df.iloc[0]["mark"]', 'first = df["mark"][0]')),
        ],
    ),

    # ------------------------------------------------------------------ PD02
    dict(
        code='PD02', title='CSV, Excel và schema', minutes=35,
        goal='Đọc file với schema khai rõ (sep, usecols, dtype, na_values) và xuất CSV không sinh cột index.',
        prereq='PD01', support=['scores.csv'], env=DA_ENV, packages=PKG,
        brief='scores.csv dùng dấu ; và có ba cột id;mark;note. Viết load_scores(path): đọc bằng pd.read_csv với sep=";", '
              'chỉ lấy hai cột id, mark (usecols), giữ id là chuỗi (dtype "string" — không mất số 0 đầu) và coi chữ '
              '"missing" là ô thiếu (na_values). File thiếu cột id hoặc mark phải báo ValueError. Viết export_csv(df, path): '
              'ghi CSV dấu phẩy, KHÔNG có cột index.',
        example='"007;9;retake" → id "007", mark 9.0; "010;missing;absent" → mark NaN. Xuất lại → dòng đầu "id,mark".',
        demo=r'''import pandas as pd
from io import StringIO

text = "code|qty\n0042|3\n0107|n/a\n"
df = pd.read_csv(StringIO(text), sep="|", dtype={"code": "string"}, na_values=["n/a"])
print(df["code"].tolist())
print(int(df["qty"].isna().sum()), "ô thiếu")
print(df.dtypes.to_dict())

guess = pd.read_csv(StringIO(text), sep="|")
print(guess["code"].tolist(), guess["qty"].tolist())

print(df.to_csv(index=False).splitlines()[0])
print(df.to_csv().splitlines()[0])
''',
        explain=[
            'Đọc một file là khai rõ: dấu phân cách (sep), header, lấy cột nào (usecols), kiểu từng cột (dtype) và chữ '
            'nào nghĩa là "thiếu" (na_values).',
            'Không khai dtype thì pandas ĐOÁN: "007" thành số 7 — mất số 0 đầu, mã không còn khớp với bảng khác. '
            'dtype={"id": "string"} giữ nguyên chuỗi.',
            'Một ô chữ lạ ("missing", "n/a") làm cả cột số thành object (chuỗi). na_values=["missing"] biến ô đó thành NaN, '
            'cột còn là số.',
            'usecols vừa bỏ cột thừa vừa là phép kiểm schema: file thiếu cột yêu cầu thì read_csv báo ValueError ngay.',
            'to_csv mặc định ghi cả index thành một cột không tên; index=False bỏ cột rác đó.',
            'Excel: pd.read_excel(path, sheet_name="Q1", usecols=..., dtype=...) cùng ý tưởng, cần engine openpyxl '
            '(pip install openpyxl trên máy; trình duyệt của bài chưa có thư viện này). File rất lớn: '
            'read_csv(..., chunksize=100_000) đọc từng khúc; luôn in số dòng đã đọc trước khi tổng hợp.',
        ],
        predict=dict(q='Đọc KHÔNG khai dtype. df.loc[0, "id"] là gì?',
                     code='df = pd.read_csv(StringIO("id,mark\\n007,8"))',
                     options=[
                         ('Số 7 — pandas đoán cột id là số, mất số 0 đầu', 'Khai dtype={"id": "string"} để giữ "007".', True),
                         ('Chuỗi "007"', 'Chỉ khi khai dtype chuỗi.', False),
                         ('Lỗi vì 007 không phải số hợp lệ', '"007" vẫn đọc được thành số 7.', False),
                     ]),
        myth=('"read_csv tự hiểu file, không cần khai gì"',
              'pandas chỉ ĐOÁN: mã có số 0 đầu thành số, một ô "missing" làm cả cột điểm thành chuỗi, file dấu ; đọc ra '
              'một cột duy nhất "id;mark;note". parse_dates gặp ngày hỏng cũng không báo lỗi mà để nguyên cột chữ. Khai '
              'schema rồi kiểm df.dtypes ngay sau khi đọc.'),
        mcq=[
            dict(q='File dấu ; nhưng gọi pd.read_csv(path) không có sep. Kết quả?', options=[
                ('Một cột duy nhất tên "id;mark;note"', 'Mặc định sep=",".', True),
                ('pandas tự nhận ra dấu ;', 'Không — mặc định luôn là dấu phẩy.', False),
                ('ValueError', 'Không lỗi — chỉ ra bảng sai.', False),
            ]),
            dict(q='df.to_csv("out.csv") (không index=False) rồi đọc lại. Thấy gì?', options=[
                ('Thêm cột "Unnamed: 0" chứa index cũ', 'Ghi index=False để không ghi index.', True),
                ('Không khác gì', 'Index được ghi thành cột đầu.', False),
                ('Mất cột cuối', 'Không mất cột — thừa cột.', False),
            ]),
            dict(q='Cột mark có 8, 9 và "missing". Đọc không có na_values thì dtype của mark là?', options=[
                ('object — cả cột thành chuỗi vì một ô chữ', 'na_values=["missing"] biến ô đó thành NaN, cột còn là số.', True),
                ('float64, ô missing thành NaN', 'Chỉ khi khai na_values.', False),
                ('int64, ô missing thành 0', 'pandas không bao giờ tự đổi chữ thành 0.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao phải khai dtype cho cột id dù file "trông" đã đúng?',
            sample='Không khai thì pandas đoán kiểu: "007" thành 7, mất số 0 đầu và không còn khớp với mã ở bảng khác. '
                   'Khai dtype={"id": "string"} biến kiểu cột thành một phần của cách đọc file; kiểm df.dtypes ngay sau '
                   'khi đọc để chắc chắn.'),
        scaffold=dict(
            intro='Dữ liệu mới: file dấu ; có cột note thừa và ô "missing". Lắp bốn chỗ.',
            template=r'''import pandas as pd


def load_scores(path):
    return pd.read_csv(
        path,
        {{slot1}},
        usecols=["id", "mark"],
        {{slot2}},
        {{slot3}},
    )


def export_csv(df, path):
    df.to_csv(path, {{slot4}})
''',
            slots=['sep=";"', 'dtype={"id": "string"}', 'na_values=["missing"]', 'index=False'],
            traps=[('sep=","', 1, 'File dùng dấu ; — đọc bằng dấu phẩy ra một cột duy nhất.'),
                   ('dtype={"id": "int"}', 2, 'Ép số làm mất số 0 đầu của mã.'),
                   ('na_values=[0]', 3, 'Ô thiếu được ghi là chữ "missing", không phải số 0.'),
                   ('index=True', 4, 'Ghi thêm cột index không tên.')]),
        flow=['sep=";" → tách đúng ba cột id, mark, note.',
              'usecols=["id", "mark"] → bỏ note; thiếu cột thì ValueError.',
              'dtype={"id": "string"} → "007" vẫn là "007".',
              'na_values=["missing"] → ô thiếu thành NaN, mark là float.',
              'to_csv(path, index=False) → dòng đầu là id,mark.'],
        transfer='Thử file có cả ô trống lẫn ô "missing", và một file thiếu cột mark; kiểm số ô thiếu và lỗi schema.',
        counter=dict(q='File "id;mark;note\\n0010;missing;x\\n". load_scores(...)["mark"].isna().sum() = ?',
                     options=['1', '0', 'ValueError'], correct='1'),
        practice='Khai đủ bốn tham số của read_csv (sep, usecols, dtype, na_values); xuất bằng index=False.',
        steps=['return pd.read_csv(path, sep=";", usecols=["id", "mark"], dtype={"id": "string"}, na_values=["missing"]).',
               'Kiểm df.dtypes: id là string, mark là float64 (vì có NaN).',
               'export_csv gọi df.to_csv(path, index=False).'],
        partial=r'''def load_scores(path):
    return pd.read_csv(path, sep=";", usecols=["id", "mark"], ...)''',
        io=[('scores.csv (cấp sẵn)', 'id ["001", "007", "010"]; mark có 1 ô thiếu'),
            ('File thiếu cột mark', 'ValueError (từ usecols)'),
            ('export_csv(df, "out.csv")', 'Dòng đầu file là id,mark')],
        contracts=[
            dict(sig='load_scores(path)', does='Đọc file điểm dấu ; theo schema cố định.',
                 takes='path: tên file CSV dấu ; có cột id, mark (có thể thêm cột khác)',
                 gives='DataFrame đúng hai cột: id (string), mark (float, NaN cho "missing")',
                 effect='Thiếu cột id/mark → ValueError.', call='load_scores("scores.csv")["id"].tolist() → ["001", "007", "010"]'),
            dict(sig='export_csv(df, path)', does='Ghi DataFrame ra CSV dấu phẩy.', takes='df: DataFrame; path: tên file',
                 gives='None', effect='Tạo/ghi đè file; không ghi cột index.', call='export_csv(df, "out.csv") → dòng đầu "id,mark"'),
        ],
        starter=PD02_STARTER,
        solution=PD02_SOLUTION,
        tests=[
            T('scores.csv: id giữ số 0 đầu', 'load_scores("scores.csv")["id"].tolist()', ['001', '007', '010']),
            T('Chỉ còn hai cột id, mark', 'load_scores("scores.csv").columns.tolist()', ['id', 'mark']),
            T('Dữ liệu khác: id "0042", "0107", "0200"', f'load_scores({write("t2.csv", T2_TEXT)})["id"].tolist()',
              ['0042', '0107', '0200']),
            T('"missing" là thiếu, cột mark vẫn là số', f'float(load_scores({write("t2.csv", T2_TEXT)})["mark"].sum())', 13.5),
            T('Ô trống và "missing" đều là thiếu', f'int(load_scores({write("t3.csv", T2_BLANK)})["mark"].isna().sum())', 2),
            T('File thiếu cột mark → ValueError',
              f'_studio.call(load_scores, {write("bad.csv", NO_MARK)}).error', 'ValueError'),
            T('export_csv không ghi cột index',
              '(export_csv(pd.DataFrame({"id": ["007"], "mark": [9]}), "out.csv"), _studio.read("out.csv").splitlines())[1]',
              ['id,mark', '007,9']),
            T('Xuất rồi đọc lại (dtype string) vẫn giữ "007"',
              '(export_csv(load_scores("scores.csv"), "round.csv"), '
              'pd.read_csv("round.csv", dtype={"id": "string"})["id"].tolist())[1]', ['001', '007', '010']),
        ],
        bad=[
            ('ép id thành số', PD02_SOLUTION.replace('dtype={"id": "string"},', 'dtype={"id": "int"},')),
            ('xuất kèm index', PD02_SOLUTION.replace('df.to_csv(path, index=False)', 'df.to_csv(path)')),
            ('đọc bằng dấu phẩy mặc định', PD02_SOLUTION.replace('sep=";",', 'sep=",",')),
            ('không khai na_values', PD02_SOLUTION.replace('        na_values=["missing"],\n', '')),
        ],
    ),

    # ------------------------------------------------------------------ PD03
    dict(
        code='PD03', title='Làm sạch thiếu, trùng và sai kiểu', minutes=40,
        goal='Đổi kiểu an toàn, chuẩn hoá nhãn và bỏ trùng theo khoá — không coi ô thiếu là 0.',
        prereq='PD02', support=['sales.csv'], env=DA_ENV, packages=PKG,
        brief='Viết hai hàm. score_stats(values): values là list chuỗi điểm có thể hỏng ("8", "bad", "9", ""); trả dict '
              '{"bad": số ô không đổi được thành số, "mean": trung bình các ô HỢP LỆ làm tròn 2 chữ số, hoặc None nếu '
              'không có ô hợp lệ}. clean_sales(raw): raw là DataFrame đọc thô từ CSV bán hàng (order_id, date, region, '
              'product, qty, unit_price); trả bản sạch: region bỏ khoảng trắng và viết thường, qty và unit_price thành số '
              '(ô hỏng thành NaN), bỏ dòng trùng order_id (giữ dòng đầu), bỏ dòng thiếu qty hoặc unit_price, index đánh '
              'lại từ 0. Không sửa raw. (Ngày hỏng và qty âm để các bài sau xử lý.)',
        example='["8", "bad", "9"] → {"bad": 1, "mean": 8.5}. sales.csv 11 dòng → clean_sales còn 8 dòng '
                '(bỏ bản O05 gửi lại, O03 thiếu qty, O08 thiếu giá).',
        demo=r'''import pandas as pd

marks = pd.Series(["7", "", "x", "10"])
nums = pd.to_numeric(marks, errors="coerce")
print(nums.tolist())
print(int(nums.isna().sum()), "ô hỏng; mean hợp lệ =", nums.mean())
print("Nếu coi hỏng là 0:", nums.fillna(0).mean())

labels = pd.Series([" Hanoi", "HANOI ", "hanoi"])
print(labels.nunique(), "->", labels.str.strip().str.lower().nunique())

orders = pd.DataFrame({"id": ["A1", "A1", "A2"], "qty": [2, 5, 2]})
print(len(orders.drop_duplicates()), len(orders.drop_duplicates(subset="id")))
''',
        explain=[
            'Kiểm trước, sửa sau: isna().sum() đếm ô thiếu, duplicated(subset=khoá).sum() đếm dòng trùng. Thiếu (NaN) '
            'khác 0 và khác chuỗi rỗng.',
            'pd.to_numeric(..., errors="coerce") biến ô hỏng ("bad", "two", "?") thành NaN để đếm và rà soát; '
            'astype(float) thì ValueError ngay ở ô hỏng đầu tiên.',
            'mean() tự bỏ qua NaN: ["8", "bad", "9"] → 8.5. fillna(0) trước khi tính là bịa thêm một điểm 0 → 5.67.',
            'str.strip().str.lower() gộp " North ", "NORTH", "north" thành một nhãn; không chuẩn hoá thì groupby đếm thành ba vùng.',
            'Grain của bảng bán hàng là MỘT đơn = một order_id. drop_duplicates(subset="order_id") bỏ bản gửi lại; '
            'drop_duplicates() không khoá chỉ bỏ dòng giống hệt nhau từng ô.',
            'dropna(subset=[...]) bỏ dòng thiếu số liệu bắt buộc; ghi lại đã bỏ bao nhiêu dòng (len trước − len sau) '
            'thay vì xoá âm thầm.',
        ],
        predict=dict(q='Kết quả của dòng dưới là?',
                     code='pd.to_numeric(pd.Series(["8", "bad", "9"]), errors="coerce").mean()',
                     options=[
                         ('8.5 — "bad" thành NaN và mean bỏ qua NaN', 'Trung bình của 8 và 9.', True),
                         ('5.67 — "bad" tính là 0', 'Chỉ khi fillna(0): bịa thêm một điểm 0.', False),
                         ('ValueError vì có chữ "bad"', 'errors="coerce" không báo lỗi mà đổi thành NaN.', False),
                     ]),
        myth=('"Ô hỏng hay ô thiếu thì cứ coi là 0 cho dễ tính"',
              '0 là một GIÁ TRỊ: số lượng 0, điểm 0. Ô "bad" hay ô trống là "không biết". fillna(0) kéo trung bình '
              'xuống và tạo ra đơn hàng 0 sản phẩm không có thật. Đổi thành NaN, đếm, rồi chọn chính sách có lý do '
              '(bỏ dòng, cách ly, hỏi lại nguồn).'),
        mcq=[
            dict(q='Hai đơn O11, O12 khác order_id nhưng cùng ngày, vùng, sản phẩm, qty, giá. drop_duplicates(subset="order_id") làm gì?', options=[
                ('Giữ cả hai — đó là hai giao dịch thật', 'Khoá order_id khác nhau nên không trùng.', True),
                ('Bỏ một đơn vì giống nhau', 'Chỉ khi bỏ trùng theo các cột giá trị — sai grain.', False),
                ('Bỏ cả hai', 'drop_duplicates luôn giữ một bản (keep="first").', False),
            ]),
            dict(q='Đơn O05 bị gửi lại lần 2 với qty khác. drop_duplicates() KHÔNG có subset thì…', options=[
                ('Giữ cả hai dòng O05 vì hai dòng khác nhau ở qty', 'Không khoá thì chỉ dòng giống hệt từng ô mới bị bỏ.', True),
                ('Giữ dòng đầu', 'Đó là kết quả của subset="order_id".', False),
                ('Báo lỗi trùng khoá', 'drop_duplicates không báo lỗi.', False),
            ]),
            dict(q='pd.Series(["2", "two"]).astype(float) thì…', options=[
                ('ValueError ở ô "two"', 'Dùng to_numeric(errors="coerce") để đổi ô hỏng thành NaN.', True),
                ('[2.0, nan]', 'Đó là kết quả của to_numeric(errors="coerce").', False),
                ('[2.0, 0.0]', 'pandas không tự đổi chữ thành 0.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao bỏ trùng theo order_id mà không theo cả dòng hay theo các cột giá trị?',
            sample='Mỗi dòng của bảng là một đơn — khoá order_id xác định grain. Bản gửi lại có thể lệch vài ô nên '
                   'drop_duplicates() cả dòng không bắt được; còn bỏ theo giá trị (vùng, sản phẩm, giá) thì xoá nhầm hai '
                   'giao dịch thật chỉ vì giống nhau. Bỏ theo khoá giữ đúng một dòng cho mỗi đơn.'),
        scaffold=dict(
            intro='Dữ liệu mới: qty có chữ "two", nhãn vùng lẫn hoa thường, một đơn bị gửi lại. Lắp ba chỗ.',
            template=r'''import pandas as pd


def clean_sales(raw):
    df = raw.copy()
    df["region"] = {{slot1}}
    df["qty"] = {{slot2}}
    df["unit_price"] = pd.to_numeric(df["unit_price"], errors="coerce")
    df = {{slot3}}
    df = df.dropna(subset=["qty", "unit_price"])
    return df.reset_index(drop=True)
''',
            slots=['df["region"].str.strip().str.lower()', 'pd.to_numeric(df["qty"], errors="coerce")',
                   'df.drop_duplicates(subset="order_id", keep="first")'],
            traps=[('df["region"].lower()', 1, 'Series không có .lower(); phải đi qua .str.'),
                   ('df["qty"].astype(float)', 2, 'ValueError ở ô "two".'),
                   ('pd.to_numeric(df["qty"], errors="coerce").fillna(0)', 2, 'Coi ô thiếu là 0 — tạo đơn 0 sản phẩm.'),
                   ('df.drop_duplicates()', 3, 'Không khoá: bản gửi lại lệch một ô vẫn lọt.')]),
        flow=['str.strip().str.lower() → " North " và "NORTH" thành "north".',
              'to_numeric(errors="coerce") → "two" và ô trống thành NaN.',
              'drop_duplicates(subset="order_id") → mỗi đơn còn một dòng.',
              'dropna(subset=["qty", "unit_price"]) → bỏ dòng thiếu số liệu.',
              'reset_index(drop=True) → index 0, 1, 2… liền mạch.'],
        transfer='Thử bảng có đơn gửi lại với qty khác, hai đơn thật giống hệt giá trị, qty "two" và giá "?"; đếm số dòng còn lại.',
        counter=dict(q='score_stats(["10", "?", "", "6"]) = ?',
                     options=['{"bad": 2, "mean": 8.0}', '{"bad": 1, "mean": 8.0}', '{"bad": 2, "mean": 4.0}'],
                     correct='{"bad": 2, "mean": 8.0}'),
        practice='copy() trước khi sửa; chuẩn hoá chữ qua .str; to_numeric(errors="coerce") cho cột số; bỏ trùng theo '
                 'order_id; dropna theo cột bắt buộc.',
        steps=['score_stats: s = pd.to_numeric(pd.Series(values), errors="coerce"); bad = int(s.isna().sum()); mean tính '
               'trên s.dropna(), rỗng thì None.',
               'clean_sales: df = raw.copy(), rồi chuẩn hoá region và đổi hai cột số.',
               'drop_duplicates(subset="order_id", keep="first") → dropna(subset=["qty", "unit_price"]) → reset_index(drop=True).'],
        partial=r'''def score_stats(values):
    s = pd.to_numeric(pd.Series(values), errors="coerce")
    valid = s.dropna()
    ...''',
        io=[('["8", "bad", "9"]', '{"bad": 1, "mean": 8.5}'),
            ('sales.csv (11 dòng)', '8 dòng: bỏ bản O05 gửi lại, O03 thiếu qty, O08 thiếu giá'),
            ('Đơn gửi lại khác qty', 'Giữ dòng đầu của order_id')],
        contracts=[
            dict(sig='score_stats(values)', does='Đếm ô điểm hỏng và tính trung bình các ô hợp lệ.',
                 takes='values: list chuỗi (có thể "bad", "", "?")', gives='dict {"bad": int, "mean": float | None}',
                 effect='Không coi ô hỏng là 0.', call='score_stats(["8", "bad", "9"]) → {"bad": 1, "mean": 8.5}'),
            dict(sig='clean_sales(raw)', does='Làm sạch bảng bán hàng đọc thô.',
                 takes='raw: DataFrame cột order_id, date, region, product, qty, unit_price',
                 gives='DataFrame mới, mỗi order_id một dòng, qty/unit_price là số, index 0..n-1',
                 effect='Không sửa raw.', call='len(clean_sales(pd.read_csv("sales.csv"))) → 8'),
        ],
        starter=PD03_STARTER,
        solution=PD03_SOLUTION,
        tests=[
            T('Đề mẫu: ["8", "bad", "9"]', 'score_stats(["8", "bad", "9"])', {'bad': 1, 'mean': 8.5}),
            T('Ô trống và "?" đều hỏng, không tính là 0', 'score_stats(["10", "?", "", "6"])', {'bad': 2, 'mean': 8.0}),
            T('Không có ô hợp lệ → mean là None', 'score_stats(["x", ""])', {'bad': 2, 'mean': None}),
            T('Dữ liệu bẩn: còn đúng các đơn hợp lệ', f'clean_sales({RAW_A})["order_id"].tolist()', ['A1', 'A3', 'A4', 'A7']),
            T('Nhãn vùng đã chuẩn hoá', f'clean_sales({RAW_A})["region"].tolist()', ['hanoi', 'hue', 'hue', 'hue']),
            T('Đơn gửi lại: giữ dòng đầu (qty 1), qty là số', f'clean_sales({RAW_A})["qty"].tolist()', [2.0, 1.0, 1.0, 1.0]),
            T('sales.csv: 11 → 8 dòng, index liền 0..7', f'clean_sales({SALES}).index.tolist()', list(range(8))),
            T('Không sửa raw', keep_raw('clean_sales(r)', 'r["region"].tolist()[:2]') + f'({SALES})', [' North ', 'south']),
        ],
        bad=[
            ('coi ô hỏng là 0', PD03_SOLUTION.replace(
                's = pd.to_numeric(pd.Series(values), errors="coerce")',
                's = pd.to_numeric(pd.Series(values), errors="coerce").fillna(0)')),
            ('bỏ trùng không theo khoá', PD03_SOLUTION.replace(
                'df = df.drop_duplicates(subset="order_id", keep="first")', 'df = df.drop_duplicates()')),
            ('astype(float) thay to_numeric', PD03_SOLUTION.replace(
                'df["qty"] = pd.to_numeric(df["qty"], errors="coerce")', 'df["qty"] = df["qty"].astype(float)')),
            ('quên strip', PD03_SOLUTION.replace(
                'df["region"] = df["region"].str.strip().str.lower()', 'df["region"] = df["region"].str.lower()')),
            ('sửa thẳng raw', PD03_SOLUTION.replace('df = raw.copy()', 'df = raw')),
        ],
    ),

    # ------------------------------------------------------------------ PD04
    dict(
        code='PD04', title='Lọc, tính cột và cập nhật an toàn', minutes=40,
        goal='Lọc bằng mask có ngoặc, tạo cột doanh thu và cập nhật bằng df.loc[mask, cột] trên bản copy.',
        prereq='PD03', env=DA_ENV, packages=PKG,
        brief='Bảng đơn đã đúng kiểu (order_id, region, qty, unit_price; qty có thể ≤ 0). Viết add_flags(df): trả bản '
              'COPY có thêm cột revenue = qty * unit_price và cột status — "ok" cho mọi dòng, riêng dòng qty <= 0 là '
              '"check", cập nhật bằng .loc[mask, "status"]; không được sửa df gốc. Viết top_orders(df, region, '
              'min_revenue): từ add_flags(df), giữ dòng đúng region, status "ok" và revenue >= min_revenue, sắp '
              'revenue giảm dần.',
        example='qty [2, 3, -1], giá [10, 20, 10] → revenue [20, 60, -10], status [ok, ok, check]. '
                'top_orders(..., "north", 30) chỉ còn đơn revenue 60.',
        demo=r'''import pandas as pd

df = pd.DataFrame({"mark": [4, 8, 9], "cls": ["A", "A", "B"]})
passed_a = df.loc[(df["mark"] >= 5) & (df["cls"] == "A")]
print(passed_a["mark"].tolist())

df["grade"] = "pass"
df.loc[df["mark"] < 5, "grade"] = "fail"
print(df["grade"].tolist())

df[df["mark"] < 5]["grade"] = "retake"
print(df["grade"].tolist())

top = df.sort_values("mark", ascending=False).head(2)
print(top["mark"].tolist())
''',
        explain=[
            'Mask là Series True/False. Ghép điều kiện bằng & (và), | (hoặc), ~ (phủ định) và BỌC NGOẶC từng điều '
            'kiện: & ưu tiên cao hơn ==, >=.',
            '`and`/`or` của Python cần MỘT giá trị True/False nên với Series báo "truth value of a Series is ambiguous".',
            'Cột mới: df["revenue"] = df["qty"] * df["unit_price"] (hoặc df.assign(revenue=...)) tính cả cột một lần, '
            'không cần vòng for. revenue cùng đơn vị tiền với unit_price.',
            'Cập nhật một phần cột: df.loc[mask, "status"] = "check" — MỘT lần lập chỉ mục, ghi thẳng vào df.',
            'df[mask]["status"] = ... là chained assignment: df[mask] tạo bảng tạm, phép gán rơi vào bảng tạm và df '
            'không đổi (pandas cảnh báo SettingWithCopyWarning; pandas 3 với Copy-on-Write càng chắc chắn không đổi).',
            'Hàm nhận df của người gọi: out = df.copy() trước khi thêm cột, nếu không bảng của người gọi bị đổi theo. '
            'Lọc ra bảng con rồi muốn sửa riêng thì cũng copy().',
        ],
        predict=dict(q='Hai dòng dưới khác nhau thế nào?',
                     code='df.loc[df["qty"] <= 0, "status"] = "check"\ndf[df["qty"] <= 0]["status"] = "check"',
                     options=[
                         ('Dòng đầu sửa df; dòng sau gán vào bảng tạm nên df không đổi', 'df[mask] tạo bảng mới; ["status"] = ... gán vào bảng đó.', True),
                         ('Giống nhau, dòng sau ngắn hơn', 'Dòng sau là chained assignment — không ghi vào df.', False),
                         ('Dòng đầu lỗi vì loc chỉ dùng để đọc', 'loc dùng được cả để đọc lẫn ghi.', False),
                     ]),
        myth=('"Có SettingWithCopyWarning thôi, kết quả vẫn đúng"',
              'Cảnh báo đó báo phép gán có thể rơi vào bảng tạm: df[mask]["col"] = ... KHÔNG sửa df, cả ở pandas 2.2 '
              'trong trình duyệt lẫn pandas 3. Dạng df["col"][mask] = ... có khi vẫn "ăn" ở pandas 2.2 nhưng hỏng âm '
              'thầm ở pandas 3 (Copy-on-Write). Luôn viết một lần: df.loc[mask, "col"] = giá_trị.'),
        mcq=[
            dict(q='df[df["qty"] > 0 & df["region"] == "north"] (thiếu ngoặc) thì…', options=[
                ('Lỗi hoặc ra sai — & được tính trước > và ==', 'Viết (df["qty"] > 0) & (df["region"] == "north").', True),
                ('Chạy đúng như ý', '& ưu tiên cao hơn phép so sánh.', False),
                ('pandas tự hiểu là and', 'Python không đoán ý.', False),
            ]),
            dict(q='Hàm gán out = df rồi out["revenue"] = ... (không copy). Sau khi gọi, bảng của người gọi…', options=[
                ('Có thêm cột revenue — hàm đã sửa chính đối tượng được truyền vào', 'DataFrame là đối tượng mutable như list.', True),
                ('Không đổi — Python truyền bản sao', 'Python truyền tham chiếu tới cùng đối tượng.', False),
                ('Lỗi', 'Gán cột mới luôn được phép.', False),
            ]),
            dict(q='Lấy 3 đơn doanh thu cao nhất, cách nào đúng?', options=[
                ('df.sort_values("revenue", ascending=False).head(3)', 'Sắp giảm dần rồi lấy đầu.', True),
                ('df.head(3)', 'head lấy 3 dòng đầu theo thứ tự hiện tại.', False),
                ('df.sort_values("revenue").head(3)', 'Mặc định tăng dần: đó là 3 đơn thấp nhất.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao add_flags phải copy() và cập nhật status bằng loc?',
            sample='copy() để hàm không sửa bảng người gọi đưa vào — người gọi có thể còn dùng bảng gốc. Cập nhật bằng '
                   'out.loc[mask, "status"] là một phép gán duy nhất vào chính bảng; viết out[mask]["status"] = ... chỉ '
                   'gán vào bảng tạm do out[mask] tạo ra nên status không đổi.'),
        scaffold=dict(
            intro='Dữ liệu mới: có đơn qty 0, qty âm và hai vùng. Lắp bốn chỗ.',
            template=r'''import pandas as pd


def add_flags(df):
    out = {{slot1}}
    out["revenue"] = out["qty"] * out["unit_price"]
    out["status"] = "ok"
    {{slot2}}
    return out


def top_orders(df, region, min_revenue):
    data = add_flags(df)
    mask = {{slot3}}
    return {{slot4}}
''',
            slots=['df.copy()', 'out.loc[out["qty"] <= 0, "status"] = "check"',
                   '(data["region"] == region) & (data["status"] == "ok") & (data["revenue"] >= min_revenue)',
                   'data.loc[mask].sort_values("revenue", ascending=False)'],
            traps=[('df', 1, 'Không copy: thêm cột vào chính bảng của người gọi.'),
                   ('out[out["qty"] <= 0]["status"] = "check"', 2, 'Chained assignment: gán vào bảng tạm, out không đổi.'),
                   ('data["region"] == region and data["revenue"] >= min_revenue', 3, '`and` không dùng được với Series.'),
                   ('data.loc[mask].sort_values("revenue")', 4, 'Mặc định tăng dần — đơn nhỏ lên đầu.')]),
        flow=['out = df.copy() → bảng riêng, bảng gốc không đổi.',
              'out["qty"] * out["unit_price"] → cột revenue cho mọi dòng.',
              'out.loc[out["qty"] <= 0, "status"] → "check" đúng dòng.',
              '(a) & (b) & (c) → mask: đúng vùng, ok, đủ doanh thu.',
              'sort_values(..., ascending=False) → đơn lớn nhất lên đầu.'],
        transfer='Đổi vùng và ngưỡng doanh thu; thêm đơn qty 0 và qty âm; kiểm bảng gốc không có cột mới.',
        counter=dict(q='qty [1, 0, 4], giá [50, 20, 10] → cột status = ?',
                     options=['["ok", "check", "ok"]', '["ok", "ok", "ok"]', '["check", "check", "ok"]'],
                     correct='["ok", "check", "ok"]'),
        practice='copy → tính revenue → status mặc định "ok" → loc[mask, "status"] = "check"; lọc bằng mask có ngoặc rồi '
                 'sort_values giảm dần.',
        steps=['out = df.copy(); out["revenue"] = out["qty"] * out["unit_price"].',
               'out["status"] = "ok"; out.loc[out["qty"] <= 0, "status"] = "check".',
               'top_orders: mask ba điều kiện bọc ngoặc nối bằng &; trả data.loc[mask].sort_values("revenue", ascending=False).'],
        partial=r'''def add_flags(df):
    out = df.copy()
    out["revenue"] = out["qty"] * out["unit_price"]
    ...''',
        io=[('qty [2, 3, -1], giá [10, 20, 10]', 'revenue [20, 60, -10]; status [ok, ok, check]'),
            ('top_orders(df, "north", 30)', 'Chỉ đơn north, status ok, revenue ≥ 30, giảm dần'),
            ('Sau khi gọi', 'df gốc không có cột revenue/status')],
        contracts=[
            dict(sig='add_flags(df)', does='Thêm cột revenue và status trên bản sao.',
                 takes='df: DataFrame có qty, unit_price', gives='DataFrame mới thêm revenue, status ("ok"/"check")',
                 effect='Không sửa df.', call='add_flags(df)["status"].tolist() → ["ok", "ok", "check"]'),
            dict(sig='top_orders(df, region, min_revenue)', does='Lọc đơn tốt của một vùng, lớn nhất trước.',
                 takes='df như trên; region: str; min_revenue: số', gives='DataFrame đã lọc, revenue giảm dần',
                 effect='Không sửa df.', call='top_orders(df, "north", 30)["revenue"].tolist() → [60]'),
        ],
        starter=PD04_STARTER,
        solution=PD04_SOLUTION,
        tests=[
            T('Đề mẫu: revenue ≥ 30, giảm dần', f'top_orders({D4_EXAMPLE}, "north", 30)["revenue"].tolist()', [60]),
            T('revenue = qty × unit_price', f'add_flags({D4})["revenue"].tolist()', [40.0, 40.0, 0.0, 50.0, -50.0, 80.0]),
            T('qty ≤ 0 → status "check"', f'add_flags({D4})["status"].tolist()', ['ok', 'ok', 'check', 'ok', 'check', 'ok']),
            T('Không sửa bảng gốc', keep_raw('add_flags(r)', 'r.columns.tolist()') + f'({D4})',
              ['order_id', 'region', 'qty', 'unit_price']),
            T('Lọc vùng + ngưỡng, sắp giảm dần', f'top_orders({D4}, "hue", 40)["order_id"].tolist()', ['B4', 'B1']),
            T('Ngưỡng 0: đơn status "check" vẫn bị loại', f'top_orders({D4}, "hue", 0)["order_id"].tolist()', ['B4', 'B1']),
            T('Vùng khác', f'top_orders({D4}, "hanoi", 50)["order_id"].tolist()', ['B6']),
            T('Không đơn nào đạt → bảng rỗng', f'len(top_orders({D4}, "hanoi", 1000))', 0),
        ],
        bad=[
            ('chained assignment', PD04_SOLUTION.replace(
                'out.loc[out["qty"] <= 0, "status"] = "check"', 'out[out["qty"] <= 0]["status"] = "check"')),
            ('không copy', PD04_SOLUTION.replace('out = df.copy()', 'out = df')),
            ('thiếu ngoặc trong mask', PD04_SOLUTION.replace(
                'mask = (data["region"] == region) & (data["status"] == "ok") & (data["revenue"] >= min_revenue)',
                'mask = data["region"] == region & data["status"] == "ok" & data["revenue"] >= min_revenue')),
            ('quên sắp giảm dần', PD04_SOLUTION.replace(
                'return data.loc[mask].sort_values("revenue", ascending=False)', 'return data.loc[mask]')),
        ],
    ),

    # ------------------------------------------------------------------ PD05
    dict(
        code='PD05', title='GroupBy và KPI có mẫu số rõ ràng', minutes=40,
        goal='Tổng hợp theo nhóm bằng named aggregation; tỷ lệ có mẫu số rõ, giá bình quân là tổng chia tổng.',
        prereq='PD04', env=DA_ENV, packages=PKG,
        brief='Bảng đơn (order_id, region, qty, unit_price; region có thể thiếu, qty có thể thiếu). Viết region_kpi(df) '
              'trả DataFrame index là region (region thiếu gom thành "unknown"), đúng thứ tự cột: orders (số DÒNG đơn '
              'của vùng — kể cả đơn thiếu qty), qty (tổng), revenue (tổng qty*unit_price), avg_price = revenue / qty '
              'của vùng, share = revenue vùng / TỔNG revenue mọi vùng. Trước khi trả, kiểm tổng revenue các vùng khớp '
              'tổng revenue của bảng nguồn.',
        example='Vùng A có rev 10, 20; vùng B có 40 → revenue A 30, B 40; tổng 70; A chiếm 3/7 ≈ 0.4286.',
        demo=r'''import pandas as pd

df = pd.DataFrame({"cls": ["A", "A", "A", "B"], "score": [6, 8, None, 9]})
out = df.groupby("cls").agg(rows=("score", "size"), graded=("score", "count"), avg=("score", "mean"))
print(out)

df["share_in_class"] = df["score"] / df.groupby("cls")["score"].transform("sum")
print(df["share_in_class"].round(3).tolist())

shop = pd.DataFrame({"qty": [4, 1], "price": [5, 20]})
shop["rev"] = shop["qty"] * shop["price"]
print("mean các giá:", shop["price"].mean())
print("giá bình quân:", shop["rev"].sum() / shop["qty"].sum())
''',
        explain=[
            'GroupBy là split-apply-combine: tách theo khoá, tính trên từng nhóm, ghép lại. agg trả MỘT dòng mỗi nhóm; '
            'transform trả kết quả dài bằng bảng gốc.',
            'size đếm số dòng của nhóm; count chỉ đếm ô KHÔNG thiếu của một cột. Đơn thiếu qty vẫn là một đơn.',
            'Named aggregation agg(orders=("order_id", "size"), revenue=("revenue", "sum")) đặt tên metric rõ ràng ngay '
            'trong kết quả.',
            'Tỷ lệ phải nói rõ mẫu số: share = doanh thu vùng / TỔNG doanh thu; giá bình quân = tổng doanh thu / tổng số lượng.',
            'Trung bình của các giá (hay trung bình của các trung bình) không bằng giá bình quân khi số lượng mỗi đơn khác '
            'nhau: đơn 9 cái và đơn 1 cái không nặng như nhau.',
            'groupby mặc định BỎ nhóm có khoá thiếu (dropna=True). Gom thành "unknown" (hoặc dropna=False) khi đó là '
            'chính sách, và luôn kiểm tổng các nhóm = tổng nguồn để bắt dòng bị mất.',
        ],
        predict=dict(q='Vùng north có hai đơn: 1 cái giá 10 và 3 cái giá 20. Giá bình quân của vùng là?',
                     options=[
                         ('17.5 — tổng doanh thu 70 chia tổng số lượng 4', 'Giá bình quân có trọng số theo số lượng.', True),
                         ('15 — trung bình của hai giá', 'Đó là mean các giá: coi đơn 1 cái nặng bằng đơn 3 cái.', False),
                         ('35 — doanh thu chia số đơn', 'Đó là doanh thu trung bình mỗi ĐƠN, không phải giá mỗi sản phẩm.', False),
                     ]),
        myth=('"Muốn giá trung bình thì lấy mean của cột giá"',
              'mean(unit_price) coi mọi đơn nặng như nhau. Giá bình quân thật là tổng doanh thu / tổng số lượng — ratio '
              'of sums, không phải mean of ratios. Tương tự, trung bình của các trung bình theo vùng không bằng trung '
              'bình chung khi các vùng có cỡ khác nhau. Mỗi tỷ lệ phải nói rõ tử số và mẫu số.'),
        mcq=[
            dict(q='Nhóm có 3 dòng, một dòng score thiếu. size() và count() lần lượt cho?', options=[
                ('3 và 2', 'size đếm dòng; count bỏ ô thiếu.', True),
                ('2 và 3', 'Ngược lại.', False),
                ('3 và 3', 'count không đếm NaN.', False),
            ]),
            dict(q='agg và transform khác nhau thế nào?', options=[
                ('agg một dòng mỗi nhóm; transform trả về đúng số dòng của bảng gốc', 'transform dùng để gắn chỉ số nhóm vào từng dòng (vd. tỷ trọng trong nhóm).', True),
                ('Giống nhau', 'Hình dạng kết quả khác nhau.', False),
                ('transform chỉ dùng cho cột chữ', 'transform dùng cho mọi phép tính theo nhóm.', False),
            ]),
            dict(q='Có dòng region bị thiếu. df.groupby("region")["revenue"].sum().sum() so với df["revenue"].sum()?', options=[
                ('Nhỏ hơn — nhóm khoá thiếu bị bỏ (dropna=True mặc định)', 'Gom thành "unknown" hoặc dropna=False, rồi đối chiếu tổng.', True),
                ('Luôn bằng nhau', 'Dòng khoá thiếu không thuộc nhóm nào nên bị bỏ.', False),
                ('Lớn hơn', 'groupby không nhân dòng.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao avg_price = revenue / qty của vùng mà không dùng mean(unit_price)?',
            sample='Mỗi đơn có số lượng khác nhau: đơn 3 cái giá 20 đóng góp nhiều hơn đơn 1 cái giá 10. Tổng doanh thu '
                   'chia tổng số lượng cân theo số lượng (17.5); mean các giá coi hai đơn như nhau (15). KPI phải nêu mẫu '
                   'số — ở đây là tổng số sản phẩm đã bán.'),
        scaffold=dict(
            intro='Dữ liệu mới: một đơn thiếu qty, một đơn thiếu region. Lắp bốn chỗ.',
            template=r'''import pandas as pd


def region_kpi(df):
    data = df.assign(
        region={{slot1}},
        revenue=df["qty"] * df["unit_price"],
    )
    out = data.groupby("region").agg(
        orders={{slot2}},
        qty=("qty", "sum"),
        revenue=("revenue", "sum"),
    )
    out["avg_price"] = {{slot3}}
    out["share"] = {{slot4}}
    lost = data["revenue"].sum() - out["revenue"].sum()
    assert abs(lost) < 1e-9, "Tổng theo vùng lệch tổng nguồn: có dòng bị mất khi groupby"
    return out
''',
            slots=['df["region"].fillna("unknown")', '("order_id", "size")', 'out["revenue"] / out["qty"]',
                   'out["revenue"] / out["revenue"].sum()'],
            traps=[('df["region"]', 1, 'Vùng thiếu bị groupby bỏ — tổng lệch tổng nguồn.'),
                   ('("qty", "count")', 2, 'count bỏ đơn thiếu qty — đếm hụt đơn.'),
                   ('data.groupby("region")["unit_price"].mean()', 3, 'Mean các giá — không cân theo số lượng.'),
                   ('out["revenue"] / len(out)', 4, 'Mẫu số là số vùng, không phải tổng doanh thu.')]),
        flow=['region.fillna("unknown") → không nhóm nào bị bỏ.',
              '("order_id", "size") → đếm mọi dòng đơn của vùng.',
              'revenue / qty theo vùng → giá bình quân có trọng số.',
              'revenue / revenue.sum() → tỷ trọng, cộng lại bằng 1.',
              'tổng các vùng = tổng nguồn → không mất dòng.'],
        transfer='Thêm một đơn thiếu qty và một đơn thiếu region; kiểm orders, avg_price, share và đối chiếu tổng.',
        counter=dict(q='south: (2 cái, 15), (qty thiếu, 15), (2 cái, 30). orders và avg_price của south?',
                     options=['3 và 22.5', '2 và 22.5', '3 và 20.0'], correct='3 và 22.5'),
        practice='assign region đã gom thiếu và revenue; named aggregation với size/sum; avg_price và share là phép chia '
                 'hai cột tổng; assert tổng khớp.',
        steps=['data = df.assign(region=df["region"].fillna("unknown"), revenue=df["qty"] * df["unit_price"]).',
               'out = data.groupby("region").agg(orders=("order_id", "size"), qty=("qty", "sum"), revenue=("revenue", "sum")).',
               'out["avg_price"] = out["revenue"] / out["qty"]; out["share"] = out["revenue"] / out["revenue"].sum(); '
               'assert tổng khớp rồi return out.'],
        partial=r'''    out = data.groupby("region").agg(
        orders=("order_id", "size"),
        qty=("qty", "sum"),
        revenue=("revenue", "sum"),
    )
    ...''',
        io=[('Vùng A: 10, 20; B: 40 (qty 1)', 'revenue A 30, B 40; share A ≈ 0.4286'),
            ('north: (1, 10), (3, 20)', 'avg_price north = 17.5'),
            ('Đơn thiếu region', 'Vào nhóm "unknown"; tổng khớp tổng nguồn')],
        contracts=[
            dict(sig='region_kpi(df)', does='KPI theo vùng với mẫu số rõ ràng.',
                 takes='df: DataFrame order_id, region, qty, unit_price (region/qty có thể thiếu)',
                 gives='DataFrame index region; cột orders, qty, revenue, avg_price, share',
                 effect='Không sửa df; tổng lệch → AssertionError.',
                 call='region_kpi(df)["revenue"].to_dict() → {"A": 30, "B": 40}'),
        ],
        starter=PD05_STARTER,
        solution=PD05_SOLUTION,
        tests=[
            T('Đề mẫu: A = 30, B = 40', f'region_kpi({DK_EXAMPLE})["revenue"].to_dict()', {'A': 30, 'B': 40}),
            T('Đề mẫu: A chiếm 3/7 tổng', f'round(float(region_kpi({DK_EXAMPLE}).loc["A", "share"]), 4)', 0.4286),
            T('Doanh thu theo vùng, vùng thiếu → "unknown"', f'region_kpi({DK})["revenue"].to_dict()',
              {'north': 70.0, 'south': 90.0, 'unknown': 5.0}),
            T('orders đếm dòng (size), kể cả đơn thiếu qty', f'region_kpi({DK})["orders"].to_dict()',
              {'north': 2, 'south': 3, 'unknown': 1}),
            T('avg_price = tổng revenue / tổng qty', f'region_kpi({DK})["avg_price"].round(2).to_dict()',
              {'north': 17.5, 'south': 22.5, 'unknown': 5.0}),
            T('share có mẫu số là tổng doanh thu', f'region_kpi({DK})["share"].round(4).to_dict()',
              {'north': 0.4242, 'south': 0.5455, 'unknown': 0.0303}),
            T('Tổng các vùng khớp tổng nguồn', f'round(float(region_kpi({DK})["revenue"].sum()), 6)', 165.0),
            T('Đúng thứ tự cột', f'region_kpi({DK}).columns.tolist()', ['orders', 'qty', 'revenue', 'avg_price', 'share']),
        ],
        bad=[
            ('giá bình quân = mean các giá', PD05_SOLUTION.replace(
                'out["avg_price"] = out["revenue"] / out["qty"]',
                'out["avg_price"] = data.groupby("region")["unit_price"].mean()')),
            ('count thay size', PD05_SOLUTION.replace('orders=("order_id", "size"),', 'orders=("qty", "count"),')),
            ('bỏ quên vùng thiếu', PD05_SOLUTION.replace('        region=df["region"].fillna("unknown"),\n', '')),
            ('share chia cho số vùng', PD05_SOLUTION.replace(
                'out["share"] = out["revenue"] / out["revenue"].sum()', 'out["share"] = out["revenue"] / len(out)')),
        ],
    ),

    # ------------------------------------------------------------------ PD06
    dict(
        code='PD06', title='Merge, concat và kiểm tra cardinality', minutes=40,
        goal='Ghép bảng tra cứu bằng left merge có validate, đánh dấu dòng không ghép được, chồng bảng bằng concat đúng schema.',
        prereq='PD05', env=DA_ENV, packages=PKG,
        brief='Viết attach_prices(orders, prices): orders (order_id, sku, qty) ghép bảng giá prices (sku, price) bằng '
              'LEFT merge theo sku, validate="many_to_one" (bảng giá trùng sku phải báo MergeError chứ không nhân dòng) '
              'và indicator=True (cột _merge). Kết quả có đúng len(orders) dòng, đúng thứ tự đơn. Viết stack(frames): '
              'chồng list DataFrame bằng concat với index mới 0..n-1; nếu một bảng không cùng tập cột với bảng đầu thì '
              'raise ValueError.',
        example='orders sku A, B; bảng giá chỉ có A → 2 dòng, đơn B có price NaN và _merge = "left_only".',
        demo=r'''import pandas as pd

students = pd.DataFrame({"sid": ["S1", "S2", "S3"], "class_id": ["K1", "K2", "K9"]})
classes = pd.DataFrame({"class_id": ["K1", "K2"], "room": ["A101", "B204"]})
out = students.merge(classes, on="class_id", how="left", validate="many_to_one", indicator=True)
print(out[["sid", "room", "_merge"]])
print(len(students), "->", len(out))

dup = pd.concat([classes, classes.head(1)], ignore_index=True)
print("bảng tra trùng K1:", len(students.merge(dup, on="class_id", how="left")), "dòng")

a = pd.DataFrame({"x": [1, 2]})
b = pd.DataFrame({"x": [3]})
print(pd.concat([a, b]).index.tolist(), pd.concat([a, b], ignore_index=True).index.tolist())
''',
        explain=[
            'merge ghép theo cột khoá (on=...); how chọn dòng giữ lại: inner (MẶC ĐỊNH) chỉ khoá có ở hai bên, left mọi '
            'dòng bên trái, outer tất cả.',
            'Gắn thông tin từ bảng tra cứu (giá, phòng học) vào bảng giao dịch: how="left" để không đơn nào biến mất; '
            'dòng không ghép được có NaN.',
            'Khoá lặp ở bảng tra cứu NHÂN dòng: một đơn ghép với hai giá thành hai dòng, doanh thu bị đếm đôi. '
            'validate="many_to_one" biến kỳ vọng "mỗi sku một giá" thành phép kiểm: sai là MergeError.',
            'indicator=True thêm cột _merge (both / left_only / right_only) để đếm dòng không ghép được. Khác SQL, pandas '
            'ghép NaN với NaN — khoá thiếu cần chính sách riêng.',
            'concat chồng các bảng cùng schema. ignore_index=True đánh lại index 0..n-1; không có thì index cũ lặp lại '
            '(0, 1, 0). Cột lệch tên thì concat không báo lỗi mà điền NaN — tự kiểm schema trước.',
        ],
        predict=dict(q='orders có 3 đơn sku PEN; bảng giá có PEN hai lần (4.0 và 4.5). orders.merge(prices, on="sku") ra mấy dòng?',
                     options=[
                         ('6 — mỗi đơn ghép với cả hai giá', 'Khoá lặp bên phải nhân số dòng.', True),
                         ('3 — merge giữ số dòng bên trái', 'Chỉ đúng khi khoá bên phải duy nhất.', False),
                         ('MergeError', 'Chỉ khi có validate="many_to_one".', False),
                     ]),
        myth=('"merge xong thì số dòng vẫn như bảng đơn"',
              'Không có gì bảo đảm điều đó: inner (mặc định) làm RƠI đơn không có giá, khoá lặp ở bảng giá làm NHÂN đơn. '
              'Chọn how="left", khai validate="many_to_one" và so len trước/sau merge.'),
        mcq=[
            dict(q='orders.merge(prices, on="sku") không ghi how. Đơn có sku không có trong bảng giá sẽ…', options=[
                ('Biến mất — mặc định how="inner"', 'Muốn giữ thì how="left".', True),
                ('Có price = NaN', 'Đó là kết quả của how="left".', False),
                ('Gây lỗi', 'Không lỗi — chỉ rơi dòng âm thầm.', False),
            ]),
            dict(q='pd.concat([a, b]) với a có index 0, 1 và b có index 0. Index kết quả là?', options=[
                ('[0, 1, 0]', 'Giữ index cũ; dùng ignore_index=True để thành [0, 1, 2].', True),
                ('[0, 1, 2]', 'Chỉ khi ignore_index=True.', False),
                ('Lỗi trùng index', 'concat không kiểm trùng index.', False),
            ]),
            dict(q='validate="many_to_one" kiểm điều gì?', options=[
                ('Khoá ở bảng PHẢI là duy nhất (mỗi sku một giá)', 'Bên trái được lặp (nhiều đơn cùng sku).', True),
                ('Bảng trái không có khoá trùng', 'Đó là "one_to_many" hoặc "one_to_one".', False),
                ('Mọi đơn đều tìm được giá', 'Dòng không ghép được kiểm bằng indicator=True.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao attach_prices dùng how="left" và validate="many_to_one" cùng lúc?',
            sample='how="left" bảo đảm không đơn nào rơi mất khi bảng giá thiếu sku — đơn đó có price NaN và _merge = '
                   'left_only để đếm. validate="many_to_one" bảo đảm không đơn nào bị nhân lên khi bảng giá trùng sku — '
                   'vi phạm thì MergeError ngay. Cả hai cùng giữ số dòng kết quả đúng bằng số đơn.'),
        scaffold=dict(
            intro='Dữ liệu mới: một sku không có giá, bảng giá có thể trùng sku. Lắp ba chỗ.',
            template=r'''import pandas as pd


def attach_prices(orders, prices):
    return orders.merge(
        prices,
        on="sku",
        {{slot1}},
        {{slot2}},
        indicator=True,
    )


def stack(frames):
    columns = set(frames[0].columns)
    for frame in frames[1:]:
        if set(frame.columns) != columns:
            raise ValueError("Các bảng không cùng schema")
    return {{slot3}}
''',
            slots=['how="left"', 'validate="many_to_one"', 'pd.concat(frames, ignore_index=True)'],
            traps=[('how="inner"', 1, 'Đơn không có giá bị rơi mất.'),
                   ('validate="one_to_many"', 2, 'Kiểm sai phía: bảng giá mới phải là phía "một".'),
                   ('pd.concat(frames)', 3, 'Giữ index cũ — 0, 1, 0.')]),
        flow=['how="left" → giữ mọi đơn, đơn thiếu giá có NaN.',
              'validate="many_to_one" → bảng giá trùng sku thì MergeError.',
              'indicator=True → cột _merge: both / left_only.',
              'set(frame.columns) → so schema trước khi chồng.',
              'concat(..., ignore_index=True) → index 0..n-1.'],
        transfer='Thêm sku không có giá và một bảng giá bị trùng sku; kiểm số dòng, _merge và lỗi MergeError.',
        counter=dict(q='orders sku [PEN, CUP, PEN], bảng giá chỉ có PEN. Số dòng left_only?',
                     options=['1', '0', '2'], correct='1'),
        practice='Left merge + validate + indicator; so tập cột trước concat; ignore_index=True.',
        steps=['return orders.merge(prices, on="sku", how="left", validate="many_to_one", indicator=True).',
               'stack: columns = set(frames[0].columns); bảng nào khác tập cột → raise ValueError.',
               'return pd.concat(frames, ignore_index=True).'],
        partial=r'''def attach_prices(orders, prices):
    return orders.merge(prices, on="sku", how="left", ...)''',
        io=[('orders D1–D4 (PEN, BOOK, PEN, CUP), giá PEN, BOOK', '4 dòng; D4 left_only, price NaN'),
            ('Bảng giá trùng PEN', 'MergeError'),
            ('stack([x 1, 2], [x 3])', 'x [1, 2, 3], index [0, 1, 2]')],
        contracts=[
            dict(sig='attach_prices(orders, prices)', does='Gắn giá vào từng đơn, không rơi và không nhân dòng.',
                 takes='orders: DataFrame có sku; prices: DataFrame sku, price (mỗi sku một dòng)',
                 gives='DataFrame len(orders) dòng, thêm price và _merge',
                 effect='Bảng giá trùng sku → MergeError.', call='attach_prices(orders, prices)["_merge"] → both / left_only'),
            dict(sig='stack(frames)', does='Chồng các bảng cùng schema.', takes='frames: list DataFrame (ít nhất một)',
                 gives='DataFrame, index 0..n-1', effect='Tập cột khác nhau → ValueError.',
                 call='stack([a, b]).index.tolist() → [0, 1, 2]'),
        ],
        starter=PD06_STARTER,
        solution=PD06_SOLUTION,
        tests=[
            T('Đề mẫu: giữ cả hai đơn, một đơn thiếu giá',
              '(lambda o: (len(o), int(o["price"].isna().sum())))(attach_prices(pd.DataFrame({"sku": ["A", "B"]}), '
              'pd.DataFrame({"sku": ["A"], "price": [10]})))', (2, 1)),
            T('Giữ đủ mọi đơn (left), đúng thứ tự', f'attach_prices({O6}, {P6})["order_id"].tolist()', ['D1', 'D2', 'D3', 'D4']),
            T('Đơn CUP không có giá → left_only', f'attach_prices({O6}, {P6})["_merge"].astype(str).tolist()',
              ['both', 'both', 'both', 'left_only']),
            T('Giá gắn đúng đơn', f'attach_prices({O6}, {P6})["price"].fillna(-1).tolist()', [4.0, 12.0, 4.0, -1.0]),
            T('Bảng giá trùng sku → MergeError, không nhân dòng', f'_studio.call(attach_prices, {O6}, {P6_DUP}).error', 'MergeError'),
            T('stack: index mới 0..n-1', 'stack([pd.DataFrame({"x": [1, 2]}), pd.DataFrame({"x": [3]})]).index.tolist()', [0, 1, 2]),
            T('stack: cùng cột khác thứ tự vẫn chồng đúng',
              'stack([pd.DataFrame({"a": [1], "b": [2]}), pd.DataFrame({"b": [4], "a": [3]})])["a"].tolist()', [1, 3]),
            T('stack: khác schema → ValueError',
              '_studio.call(stack, [pd.DataFrame({"x": [1]}), pd.DataFrame({"y": [2]})]).error', 'ValueError'),
        ],
        bad=[
            ('inner join mặc định', PD06_SOLUTION.replace('how="left",', 'how="inner",')),
            ('không validate cardinality', PD06_SOLUTION.replace('        validate="many_to_one",\n', '')),
            ('concat giữ index cũ', PD06_SOLUTION.replace('pd.concat(frames, ignore_index=True)', 'pd.concat(frames)')),
            ('không kiểm schema', PD06_SOLUTION.replace(
                '    for frame in frames[1:]:\n        if set(frame.columns) != columns:\n'
                '            raise ValueError("Các bảng không cùng schema: " + str(sorted(frame.columns)))\n', '')),
        ],
    ),

    # ------------------------------------------------------------------ PD07
    dict(
        code='PD07', title='Long, wide, pivot và melt', minutes=35,
        goal='Đổi wide ↔ long bằng melt và pivot_table có aggfunc rõ ràng, không làm đổi tổng.',
        prereq='PD06', env=DA_ENV, packages=PKG,
        brief='Viết to_long(wide): wide có cột region và mỗi tháng một cột ("2026-01", "2026-02"…); trả bảng long ba '
              'cột region, month, revenue (melt với id_vars="region"). Viết to_wide(long): long có thể có NHIỀU dòng '
              'cùng (region, month) — trả bảng wide index region, cột là month, ô là TỔNG revenue (pivot_table với '
              'aggfunc="sum"); ô không có dữ liệu để NaN, KHÔNG điền 0.',
        example='id 1 với A = 5, B = 8 → melt ra 2 dòng → pivot lại vẫn A = 5, B = 8. Hai dòng (hanoi, 2026-01) 30 và 20 '
                '→ ô = 50.',
        demo=r'''import pandas as pd

wide = pd.DataFrame({"sid": ["S1", "S2"], "math": [7, 9], "art": [8, 6]})
long = wide.melt(id_vars="sid", var_name="subject", value_name="mark")
print(long)
print(len(wide), "->", len(long), "dòng; tổng", long["mark"].sum())

back = long.pivot(index="sid", columns="subject", values="mark")
print(back.loc["S2", "math"])

log = pd.DataFrame({"sid": ["S1", "S1"], "subject": ["math", "math"], "mark": [6, 8]})
print(log.pivot_table(index="sid", columns="subject", values="mark", aggfunc="max"))
print(log.pivot_table(index="sid", columns="subject", values="mark"))
''',
        explain=[
            'Long: mỗi dòng MỘT quan sát (vùng, tháng, doanh thu). Wide: mỗi tháng một cột. Cùng dữ liệu, hai hình dạng; '
            'groupby và vẽ theo nhóm thường cần long, bảng báo cáo thường là wide.',
            'melt(id_vars=..., var_name=..., value_name=...) đổi wide → long: cột id giữ nguyên, các cột còn lại thành '
            'cặp (tên cột, giá trị). n hàng × k cột tháng → n·k dòng.',
            'pivot(index, columns, values) đổi long → wide nhưng ĐÒI mỗi cặp (index, columns) duy nhất; trùng thì '
            'ValueError "Index contains duplicate entries".',
            'pivot_table gộp các dòng trùng bằng aggfunc. Mặc định aggfunc là mean — muốn tổng doanh thu phải ghi aggfunc="sum".',
            'fill_value=0 chỉ đúng khi ô trống thật sự nghĩa là "không có giao dịch". Chưa biết là không bán hay chưa thu '
            'thập thì để NaN. Đổi hình dạng không được làm đổi tổng: so sum trước và sau.',
        ],
        predict=dict(q='Bảng long có hai dòng (hanoi, 2026-01) doanh thu 30 và 20. Ô (hanoi, 2026-01) của bảng dưới bằng bao nhiêu?',
                     code='long.pivot_table(index="region", columns="month", values="revenue")',
                     options=[
                         ('25 — không ghi aggfunc thì mặc định là mean', 'Ghi aggfunc="sum" để được 50.', True),
                         ('50', 'Chỉ khi aggfunc="sum".', False),
                         ('ValueError vì trùng khoá', 'Đó là pivot; pivot_table thì gộp.', False),
                     ]),
        myth=('"pivot và pivot_table là một, cái nào cũng được"',
              'pivot chỉ XẾP lại, không gộp: gặp (vùng, tháng) trùng là ValueError. pivot_table GỘP, nhưng mặc định bằng '
              'mean — tổng doanh thu lặng lẽ thành trung bình. Biết grain của dữ liệu trước, rồi chọn pivot (khoá duy '
              'nhất) hoặc pivot_table với aggfunc ghi rõ.'),
        mcq=[
            dict(q='wide có 3 vùng và 4 cột tháng. melt(id_vars="region") ra mấy dòng?', options=[
                ('12', '3 vùng × 4 tháng.', True),
                ('4', 'Mỗi vùng cho 4 dòng, có 3 vùng.', False),
                ('7', 'melt nhân, không cộng.', False),
            ]),
            dict(q='Khi nào fill_value=0 trong pivot_table là hợp lý?', options=[
                ('Khi ô trống chắc chắn nghĩa là "không có giao dịch"', 'Chưa chắc thì để NaN.', True),
                ('Luôn luôn, để bảng đẹp', '0 là một giá trị: kéo lệch trung bình và che mất dữ liệu thiếu.', False),
                ('Không bao giờ', 'Có lúc 0 đúng nghĩa: đã ghi nhận đầy đủ và không bán.', False),
            ]),
            dict(q='melt(var_name="month", value_name="revenue") quên id_vars="region" thì…', options=[
                ('Cột region cũng bị biến thành giá trị trong cột month', 'id_vars giữ cột định danh nguyên vẹn.', True),
                ('pandas tự giữ region', 'Không có id_vars thì mọi cột đều bị melt.', False),
                ('Lỗi', 'Không lỗi — chỉ ra bảng sai.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao to_wide dùng pivot_table(aggfunc="sum") mà không dùng pivot?',
            sample='Dữ liệu long có thể có nhiều dòng cùng (vùng, tháng) vì mỗi dòng là một đơn. pivot đòi cặp khoá duy nhất '
                   'nên báo ValueError; pivot_table gộp các dòng đó, và phải ghi aggfunc="sum" vì mặc định là mean. Ô không '
                   'có đơn để NaN vì chưa biết là không bán hay thiếu dữ liệu.'),
        scaffold=dict(
            intro='Dữ liệu mới: long có hai dòng cùng (hanoi, 2026-01) và vài ô không có dữ liệu. Lắp ba chỗ.',
            template=r'''import pandas as pd


def to_long(wide):
    return wide.melt({{slot1}}, var_name="month", value_name="revenue")


def to_wide(long):
    table = long.{{slot2}}(index="region", columns="month", values="revenue", {{slot3}})
    return table
''',
            slots=['id_vars="region"', 'pivot_table', 'aggfunc="sum"'],
            traps=[('value_vars="region"', 1, 'Đó là cột bị melt, không phải cột giữ lại.'),
                   ('pivot', 2, 'Không gộp được (vùng, tháng) trùng — ValueError.'),
                   ('fill_value=0', 3, 'Không ghi aggfunc thì mặc định mean; còn ô thiếu bị điền 0.')]),
        flow=['melt(id_vars="region") → mỗi (vùng, tháng) một dòng.',
              'var_name / value_name → đặt tên cột month, revenue.',
              'pivot_table(..., aggfunc="sum") → gộp đơn trùng ô.',
              'Không fill_value → ô chưa có dữ liệu là NaN.',
              'sum() trước = sum() sau → hình dạng đổi, tổng giữ nguyên.'],
        transfer='Thêm dòng trùng (vùng, tháng) và một tháng chỉ một vùng có dữ liệu; kiểm ô gộp, ô NaN và tổng.',
        counter=dict(q='long có (hue, 2026-03) = 25 và (hue, 2026-03) = 5. to_wide(long).loc["hue", "2026-03"] = ?',
                     options=['30', '15', 'ValueError'], correct='30'),
        practice='melt với id_vars; pivot_table với aggfunc="sum", không fill_value.',
        steps=['to_long: return wide.melt(id_vars="region", var_name="month", value_name="revenue").',
               'to_wide: long.pivot_table(index="region", columns="month", values="revenue", aggfunc="sum").',
               'Kiểm tổng: to_wide(long).sum().sum() bằng long["revenue"].sum().'],
        partial=r'''def to_long(wide):
    return wide.melt(id_vars="region", var_name="month", value_name="revenue")
...''',
        io=[('wide hanoi 100/80, hue 40/60', 'long 4 dòng, tổng 280'),
            ('long (hanoi, 2026-01) 30 và 20', 'Ô (hanoi, 2026-01) = 50'),
            ('(hue, 2026-02) không có dòng nào', 'Ô đó là NaN, không phải 0')],
        contracts=[
            dict(sig='to_long(wide)', does='Đổi bảng wide (mỗi tháng một cột) sang long.',
                 takes='wide: DataFrame cột region + các cột tháng', gives='DataFrame cột region, month, revenue',
                 effect='Không sửa wide; tổng giữ nguyên.', call='len(to_long(wide)) → số vùng × số tháng'),
            dict(sig='to_wide(long)', does='Đổi long sang wide, gộp dòng trùng bằng tổng.',
                 takes='long: DataFrame region, month, revenue (có thể trùng cặp region, month)',
                 gives='DataFrame index region, cột month; ô thiếu là NaN', effect='Không sửa long.',
                 call='to_wide(long).loc["hanoi", "2026-01"] → 50.0'),
        ],
        starter=PD07_STARTER,
        solution=PD07_SOLUTION,
        tests=[
            T('Đề mẫu: melt rồi pivot lại vẫn A = 5, B = 8',
              'to_wide(to_long(pd.DataFrame({"region": ["r1"], "A": [5], "B": [8]}))).to_dict()',
              {'A': {'r1': 5}, 'B': {'r1': 8}}),
            T('to_long: đúng ba cột', f'to_long({W7}).columns.tolist()', ['region', 'month', 'revenue']),
            T('to_long: 2 vùng × 2 tháng, tổng giữ nguyên', f'(lambda d: (len(d), int(d["revenue"].sum())))(to_long({W7}))', (4, 280)),
            T('to_long: đúng từng quan sát',
              f'to_long({W7}).sort_values(["region", "month"]).to_dict("records")',
              [{'region': 'hanoi', 'month': '2026-01', 'revenue': 100}, {'region': 'hanoi', 'month': '2026-02', 'revenue': 80},
               {'region': 'hue', 'month': '2026-01', 'revenue': 40}, {'region': 'hue', 'month': '2026-02', 'revenue': 60}]),
            T('Trùng (vùng, tháng) → cộng dồn', f'float(to_wide({L7}).loc["hanoi", "2026-01"])', 50.0),
            T('Ô không có dữ liệu giữ NaN (2 ô)', f'int(to_wide({L7}).isna().sum().sum())', 2),
            T('to_wide giữ tổng', f'float(to_wide({L7}).sum().sum())', 130.0),
            T('Hàng là vùng, cột là tháng', f'(lambda w: (w.index.tolist(), w.columns.tolist()))(to_wide({L7}))',
              (['hanoi', 'hue'], ['2026-01', '2026-02', '2026-03'])),
        ],
        bad=[
            ('pivot khi khoá trùng', PD07_SOLUTION.replace(
                'table = long.pivot_table(index="region", columns="month", values="revenue", aggfunc="sum")',
                'table = long.pivot(index="region", columns="month", values="revenue")')),
            ('pivot_table quên aggfunc', PD07_SOLUTION.replace(
                'table = long.pivot_table(index="region", columns="month", values="revenue", aggfunc="sum")',
                'table = long.pivot_table(index="region", columns="month", values="revenue")')),
            ('điền 0 cho ô thiếu', PD07_SOLUTION.replace('aggfunc="sum")', 'aggfunc="sum", fill_value=0)')),
            ('melt quên id_vars', PD07_SOLUTION.replace(
                'wide.melt(id_vars="region", var_name="month", value_name="revenue")',
                'wide.melt(var_name="month", value_name="revenue")')),
        ],
    ),

    # ------------------------------------------------------------------ PD08
    dict(
        code='PD08', title='Ngày giờ, resample và rolling', minutes=40,
        goal='Tách ngày hỏng bằng to_datetime(errors="coerce"), tổng theo tháng bằng resample và trung bình trượt trên '
             'chuỗi đã sắp xếp.',
        prereq='PD07', support=['sales.csv'], env=DA_ENV, packages=PKG,
        brief='Viết monthly_revenue(df): df có cột date (chuỗi "YYYY-MM-DD", có thể hỏng) và revenue. Đổi date bằng '
              'pd.to_datetime(..., format="%Y-%m-%d", errors="coerce"), bỏ dòng NaT, đặt date làm index rồi '
              'resample("MS") lấy tổng revenue mỗi tháng — tháng không có dòng nào phải là NaN (sum(min_count=1)), '
              'không phải 0. Viết rolling_mean(s, window): s là Series có DatetimeIndex có thể chưa sắp xếp; trả trung '
              'bình trượt window quan sát trên chuỗi đã sort_index().',
        example='Ngày 1/1 và 2/1 doanh thu 5 và 15 → tháng 1 = 20; rolling(2) ở ngày 2/1 = 10.',
        demo=r'''import pandas as pd

raw = pd.Series(["2026-02-03", "03/02/2026", "oops"])
dates = pd.to_datetime(raw, format="%Y-%m-%d", errors="coerce")
print(dates.tolist())
print(int(dates.isna().sum()), "ngày không đọc được")

visits = pd.Series([3, 5, 2], index=pd.to_datetime(["2026-01-10", "2026-01-25", "2026-03-04"]))
print(visits.resample("MS").sum().tolist())
print(visits.resample("MS").sum(min_count=1).tolist())

steps = pd.Series([4, 6, 8, 2])
print(steps.rolling(2).mean().tolist())
print(steps.rolling(2, min_periods=1).mean().tolist())
''',
        explain=[
            'pd.to_datetime(..., errors="coerce") biến chuỗi không phải ngày thành NaT (ngày thiếu) để đếm và loại; '
            'không có errors="coerce" thì một ô "bad" làm cả lệnh ValueError.',
            'Ghi format="%Y-%m-%d" khi dữ liệu dễ nhập nhằng: "03/02/2026" là 3/2 hay 2/3? Có format thì chuỗi sai định '
            'dạng thành NaT thay vì bị đoán bừa.',
            'resample cần DatetimeIndex: set_index("date") rồi resample("MS") gom theo tháng, nhãn là NGÀY ĐẦU tháng '
            '(MS = month start; "ME" là cuối tháng).',
            'Tháng không có dòng nào: sum() trả 0, sum(min_count=1) trả NaN. Chưa biết là không bán hay chưa thu thập '
            'thì đừng để nó thành 0.',
            'rolling(window) tính trên các quan sát LIỀN NHAU theo thứ tự hiện tại — chưa sort_index() thì "liền nhau" '
            'sai. min_periods quyết định cửa sổ thiếu quan sát ra NaN hay vẫn tính; rolling("7D") là cửa sổ 7 NGÀY, '
            'khác cửa sổ 7 dòng.',
        ],
        predict=dict(q='Doanh thu có ngày 10/1 và 4/3, không có ngày nào trong tháng 2. resample("MS").sum() cho tháng 2 bao nhiêu?',
                     options=[
                         ('0 — sum của nhóm rỗng là 0', 'Dùng sum(min_count=1) để thành NaN.', True),
                         ('NaN', 'Chỉ khi sum(min_count=1).', False),
                         ('Tháng 2 không xuất hiện', 'resample tạo đủ mọi tháng giữa đầu và cuối.', False),
                     ]),
        myth=('"Tháng không có số liệu thì doanh thu là 0"',
              'Có thể là không bán, cũng có thể hệ thống chưa ghi nhận. resample().sum() điền 0 âm thầm, kéo trung bình '
              'trượt xuống và vẽ ra một tháng "sụt giảm" không có thật. Để NaN bằng sum(min_count=1) rồi quyết định có lý do.'),
        mcq=[
            dict(q='s.rolling(2).mean() khi s chưa sắp theo ngày thì…', options=[
                ('Tính trên hai dòng liền nhau theo thứ tự hiện tại — sai nghĩa thời gian', 'Gọi sort_index() trước.', True),
                ('pandas tự sắp theo index', 'rolling không sắp lại dữ liệu.', False),
                ('Lỗi', 'Không lỗi với cửa sổ đếm dòng.', False),
            ]),
            dict(q='pd.to_datetime(pd.Series(["2026-01-01", "bad"])) không có errors=... thì…', options=[
                ('ValueError ở "bad"', 'errors="coerce" để thành NaT.', True),
                ('[2026-01-01, NaT]', 'Chỉ khi errors="coerce".', False),
                ('Bỏ qua "bad"', 'pandas không tự bỏ dòng.', False),
            ]),
            dict(q='pd.Series([2, 4, 8]).rolling(2).mean().tolist() = ?', options=[
                ('[nan, 3.0, 6.0]', 'Cửa sổ đầu chỉ có một quan sát, chưa đủ 2 → NaN.', True),
                ('[2.0, 3.0, 6.0]', 'Chỉ khi min_periods=1.', False),
                ('[3.0, 6.0]', 'rolling giữ nguyên số dòng.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao phải sort_index() trước rolling, còn resample thì không cần?',
            sample='resample gom từng dòng vào thùng tháng theo GIÁ TRỊ ngày nên thứ tự dòng không đổi kết quả. rolling '
                   'lấy các dòng LIỀN NHAU theo thứ tự hiện tại; chuỗi chưa sắp xếp thì cửa sổ ghép những ngày không kề '
                   'nhau và trung bình trượt sai.'),
        scaffold=dict(
            intro='Dữ liệu mới: ngày lộn xộn, có "bad" và "2026-13-01", tháng 2 không có đơn. Lắp bốn chỗ.',
            template=r'''import pandas as pd


def monthly_revenue(df):
    data = df.copy()
    data["date"] = pd.to_datetime(data["date"], format="%Y-%m-%d", {{slot1}})
    data = data.dropna(subset=["date"])
    monthly = data.set_index("date")["revenue"].resample({{slot2}})
    return {{slot3}}


def rolling_mean(s, window):
    return {{slot4}}
''',
            slots=['errors="coerce"', '"MS"', 'monthly.sum(min_count=1)', 's.sort_index().rolling(window).mean()'],
            traps=[('errors="raise"', 1, 'Một ô "bad" làm cả lệnh ValueError.'),
                   ('"ME"', 2, 'Nhãn cuối tháng; đề yêu cầu đầu tháng.'),
                   ('monthly.sum()', 3, 'Tháng không có dữ liệu thành 0.'),
                   ('s.rolling(window).mean()', 4, 'Chưa sắp theo ngày.')]),
        flow=['to_datetime(errors="coerce") → "bad", "2026-13-01" thành NaT.',
              'dropna(subset=["date"]) → bỏ dòng ngày hỏng.',
              'set_index("date") → DatetimeIndex để resample.',
              'resample("MS").sum(min_count=1) → tháng trống là NaN.',
              'sort_index().rolling(2) → cửa sổ hai ngày liền nhau.'],
        transfer='Thử ngày lộn xộn, có ngày hỏng và một tháng không có đơn; kiểm tổng tháng, tháng trống và rolling.',
        counter=dict(q='Ngày [2026-01-05, bad, 2026-02-10], revenue [10, 99, 30]. monthly_revenue(...).tolist() = ?',
                     options=['[10.0, 30.0]', '[109.0, 30.0]', 'ValueError'], correct='[10.0, 30.0]'),
        practice='to_datetime(errors="coerce") → dropna → set_index → resample("MS") → sum(min_count=1); rolling sau sort_index().',
        steps=['data = df.copy(); data["date"] = pd.to_datetime(data["date"], format="%Y-%m-%d", errors="coerce").',
               'data = data.dropna(subset=["date"]); monthly = data.set_index("date")["revenue"].resample("MS").',
               'return monthly.sum(min_count=1); rolling_mean trả s.sort_index().rolling(window).mean().'],
        partial=r'''def monthly_revenue(df):
    data = df.copy()
    data["date"] = pd.to_datetime(data["date"], format="%Y-%m-%d", errors="coerce")
    ...''',
        io=[('1/1: 5, 2/1: 15', 'Tháng 1 = 20; rolling(2) ngày 2/1 = 10'),
            ('Có "bad", "2026-13-01"', 'Hai dòng đó bị loại, không lỗi'),
            ('Tháng 2 không có đơn', 'Tháng 2 = NaN, không phải 0')],
        contracts=[
            dict(sig='monthly_revenue(df)', does='Tổng revenue theo tháng, bỏ ngày hỏng.',
                 takes='df: DataFrame cột date (chuỗi "YYYY-MM-DD", có thể hỏng), revenue',
                 gives='Series index là ngày đầu tháng; tháng trống là NaN', effect='Không sửa df.',
                 call='monthly_revenue(df).tolist() → [30.0, nan, 45.0]'),
            dict(sig='rolling_mean(s, window)', does='Trung bình trượt theo thứ tự ngày.',
                 takes='s: Series có DatetimeIndex (có thể chưa sắp xếp); window: int',
                 gives='Series đã sắp theo ngày; window − 1 giá trị đầu là NaN', effect='Không sửa s.',
                 call='rolling_mean(s, 2).tolist() → [nan, 3.0, 6.0]'),
        ],
        starter=PD08_STARTER,
        solution=PD08_SOLUTION,
        tests=[
            T('Đề mẫu: 1/1 và 2/1 doanh thu 5, 15 → tháng 1 = 20',
              'monthly_revenue(pd.DataFrame({"date": ["2026-01-01", "2026-01-02"], "revenue": [5, 15]})).tolist()', [20.0]),
            T('Đề mẫu: rolling(2) ở ngày cuối = 10',
              'float(rolling_mean(pd.Series([5, 15], index=pd.to_datetime(["2026-01-01", "2026-01-02"])), 2).iloc[-1])', 10.0),
            T('Ngày hỏng bị loại, không làm lỗi', f'float(monthly_revenue({TD8}).sum())', 75.0),
            T('Tháng 2 không có dữ liệu → NaN, không phải 0', f'monthly_revenue({TD8}).fillna(-1).tolist()', [30.0, -1.0, 45.0]),
            T('Index là ngày đầu tháng (MS)', f'[d.strftime("%Y-%m-%d") for d in monthly_revenue({TD8}).index]',
              ['2026-01-01', '2026-02-01', '2026-03-01']),
            T('sales.csv (bỏ trùng, qty > 0): tháng 1 = 110, tháng 2 = 45', f'monthly_revenue({SALES_POLICY}).tolist()', [110.0, 45.0]),
            T('rolling(2) trên chuỗi chưa sắp xếp', f'rolling_mean({S8_UNSORTED}, 2).fillna(-1).tolist()', [-1.0, 3.0, 6.0]),
            T('rolling trả chuỗi theo ngày tăng dần', f'[d.day for d in rolling_mean({S8_UNSORTED}, 2).index]', [1, 2, 3]),
        ],
        bad=[
            ('kỳ thiếu thành 0', PD08_SOLUTION.replace('return monthly.sum(min_count=1)', 'return monthly.sum()')),
            ('rolling khi chưa sắp xếp', PD08_SOLUTION.replace(
                'return s.sort_index().rolling(window).mean()', 'return s.rolling(window).mean()')),
            ('to_datetime không coerce', PD08_SOLUTION.replace(
                'pd.to_datetime(data["date"], format="%Y-%m-%d", errors="coerce")',
                'pd.to_datetime(data["date"], format="%Y-%m-%d")')),
            ('resample nhãn cuối tháng', PD08_SOLUTION.replace('.resample("MS")', '.resample("ME")')),
        ],
    ),

    # ------------------------------------------------------------------ PD09
    dict(
        code='PD09', title='EDA, chất lượng dữ liệu và export', minutes=45,
        goal='Lập báo cáo chất lượng (khoá trùng, thiếu, âm, ngày hỏng) trước khi tin số liệu, rồi xuất bản sạch kèm '
             'nhật ký — không sửa dữ liệu thô.',
        prereq='PD08', support=['sales.csv'], env=DA_ENV, packages=PKG,
        brief='Viết quality_report(raw) trả dict số nguyên: rows (số dòng), duplicate_ids (số dòng có order_id đã xuất '
              'hiện ở dòng trước), missing_qty (qty thiếu hoặc không phải số), negative_qty (qty < 0), missing_price '
              '(unit_price thiếu hoặc không phải số), bad_dates (date không đọc được theo "%Y-%m-%d"). Viết '
              'export_clean(raw, path): trên BẢN SAO, bỏ trùng order_id (giữ dòng đầu), bỏ dòng thiếu qty/giá/ngày và '
              'dòng qty <= 0, chuẩn hoá region (strip + lower), thêm cột revenue, ghi CSV không index ra path và trả '
              'nhật ký {"raw_rows", "clean_rows", "revenue"}. Cả hai hàm không được sửa raw.',
        example='sales.csv → 1 dòng trùng, 1 qty thiếu, 1 qty âm, 1 giá thiếu, 1 ngày hỏng; export_clean → 11 dòng thô, '
                '6 đơn hợp lệ, revenue 155.0.',
        demo=r'''import pandas as pd

df = pd.DataFrame({"id": [1, 2, 2, 3], "qty": [2, 5, 5, -1], "city": ["HN", "HN", "HN", "HUE"]})
print(df.shape)
print(df["qty"].describe()[["min", "max"]].tolist())
print(df["city"].value_counts().to_dict(), df["city"].nunique())

report = {
    "dup_ids": int(df["id"].duplicated().sum()),
    "rows_in_dup": int(df["id"].duplicated(keep=False).sum()),
    "negative": int(df["qty"].lt(0).sum()),
}
print(report)

summary = df.groupby("city")["qty"].sum()
print(summary.sum() == df["qty"].sum())
''',
        explain=[
            'EDA bắt đầu bằng câu hỏi "một dòng là gì?" (grain), rồi schema (dtypes), số dòng, thiếu/trùng và phạm vi hợp '
            'lệ — trước mọi biểu đồ hay trung bình.',
            'describe() cho min/max/mean cột số — qty âm hiện ngay ở min; value_counts() và nunique() cho cột phân loại; '
            'nhóm quá nhỏ thì đừng vội diễn giải.',
            'duplicated() đánh dấu lần xuất hiện THỨ HAI trở đi của khoá (keep="first"); keep=False đánh dấu mọi bản sao — '
            'ra số dòng dính trùng, không phải số dòng thừa.',
            'Sau read_csv, ô trống đã là NaN chứ không còn là chuỗi "": đếm thiếu bằng isna() sau to_numeric, không so với "".',
            'Viết quy tắc chất lượng thành phép kiểm rõ: khoá duy nhất (is_unique), qty không âm (ge(0).all()), tổng sau '
            'groupby/merge khớp tổng nguồn. Outlier là tín hiệu để điều tra, không tự động xoá; tương quan không phải nhân quả.',
            'Giữ raw riêng: báo cáo và làm sạch trên bản chuyển đổi, không gán ngược vào raw. Xuất bằng to_csv(index=False) '
            'kèm nhật ký: số dòng trước/sau, tổng doanh thu, chính sách đã áp.',
        ],
        predict=dict(q='order_id ["O1", "O5", "O5", "O9"]. duplicated().sum() và duplicated(keep=False).sum() lần lượt là?',
                     options=[
                         ('1 và 2', 'Mặc định chỉ đánh dấu bản thứ hai; keep=False đánh dấu cả hai bản.', True),
                         ('2 và 2', 'Mặc định keep="first" không đánh dấu bản đầu.', False),
                         ('1 và 1', 'keep=False đánh dấu mọi bản sao.', False),
                     ]),
        myth=('"Thấy dữ liệu sai thì sửa luôn vào bảng gốc cho gọn"',
              'Sửa raw tại chỗ thì không còn gì để đối chiếu: không đếm lại được bao nhiêu dòng hỏng, không chạy lại được '
              'với chính sách khác. Báo cáo và làm sạch trên bản sao (copy, assign hoặc biến tạm), xuất file sạch riêng '
              'kèm nhật ký, raw giữ nguyên.'),
        mcq=[
            dict(q='Cột qty đọc từ CSV có ô trống. (raw["qty"] == "").sum() trả?', options=[
                ('0 — read_csv đã đổi ô trống thành NaN, không phải chuỗi rỗng', 'Đếm thiếu bằng isna() sau to_numeric.', True),
                ('Số ô trống', 'Ô trống không còn là "" sau read_csv.', False),
                ('Lỗi', 'So sánh không lỗi, chỉ ra sai.', False),
            ]),
            dict(q='describe() cho qty có min = -1. Nên làm gì?', options=[
                ('Đếm, điều tra (trả hàng? nhập sai?) rồi ghi chính sách xử lý', 'Giá trị lạ là tín hiệu để điều tra.', True),
                ('Xoá ngay mọi dòng lạ', 'Xoá tự động có thể mất dữ liệu thật (đơn trả hàng).', False),
                ('Bỏ qua vì chỉ một dòng', 'Một dòng âm vẫn làm sai tổng doanh thu.', False),
            ]),
            dict(q='Doanh số và nhiệt độ có tương quan mạnh. Kết luận nào đúng?', options=[
                ('Hai đại lượng cùng biến thiên; cần thêm bằng chứng mới nói được nhân quả', 'Correlation không phải causation.', True),
                ('Nhiệt độ gây ra doanh số', 'Tương quan không chứng minh nhân quả.', False),
                ('Tương quan mạnh nghĩa là dữ liệu sai', 'Không liên quan đến chất lượng dữ liệu.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao quality_report và export_clean phải làm trên bản chuyển đổi mà không gán ngược vào raw?',
            sample='raw là bằng chứng gốc: còn nó thì đếm lại được số dòng trùng, thiếu, âm và chạy lại với chính sách khác. '
                   'Gán to_numeric hay to_datetime ngược vào raw làm mất chữ gốc ("x", "2026/04/02") nên không còn biết ô '
                   'nào đã hỏng. Làm trên biến tạm hoặc copy(), xuất bản sạch riêng kèm nhật ký.'),
        scaffold=dict(
            intro='Dữ liệu mới: qty có chữ "x", ngày sai định dạng và ngày 31/4, hai đơn gửi lại. Lắp bốn chỗ.',
            template=r'''import pandas as pd


def _parse(raw):
    qty = pd.to_numeric(raw["qty"], errors="coerce")
    price = pd.to_numeric(raw["unit_price"], errors="coerce")
    dates = pd.to_datetime(raw["date"], format="%Y-%m-%d", errors="coerce")
    return qty, price, dates


def quality_report(raw):
    qty, price, dates = _parse(raw)
    return {
        "rows": int(len(raw)),
        "duplicate_ids": {{slot1}},
        "missing_qty": {{slot2}},
        "negative_qty": int((qty < 0).sum()),
        "missing_price": int(price.isna().sum()),
        "bad_dates": int(dates.isna().sum()),
    }


def export_clean(raw, path):
    qty, price, dates = _parse(raw)
    df = {{slot3}}
    df["qty"] = qty
    df["unit_price"] = price
    df["date"] = dates
    df = df.drop_duplicates(subset="order_id", keep="first")
    df = df.dropna(subset=["qty", "unit_price", "date"])
    df = df.loc[df["qty"] > 0].copy()
    df["region"] = df["region"].str.strip().str.lower()
    df["revenue"] = df["qty"] * df["unit_price"]
    {{slot4}}
    return {"raw_rows": int(len(raw)), "clean_rows": int(len(df)), "revenue": float(df["revenue"].sum())}
''',
            slots=['int(raw["order_id"].duplicated().sum())', 'int(qty.isna().sum())', 'raw.copy()',
                   'df.to_csv(path, index=False)'],
            traps=[('int(raw["order_id"].duplicated(keep=False).sum())', 1, 'Đếm cả bản đầu — ra số dòng dính trùng.'),
                   ('int((raw["qty"] == "").sum())', 2, 'Ô trống đã thành NaN sau read_csv.'),
                   ('raw', 3, 'Gán cột vào df là sửa thẳng raw.'),
                   ('df.to_csv(path)', 4, 'Thêm cột index không tên.')]),
        flow=['duplicated() → đánh dấu bản thứ hai trở đi của khoá.',
              'to_numeric(errors="coerce").isna() → qty thiếu hoặc là chữ.',
              'to_datetime(format=..., errors="coerce") → ngày hỏng thành NaT.',
              'raw.copy() → làm sạch trên bản sao, raw giữ nguyên.',
              'to_csv(path, index=False) + nhật ký → file sạch, số dòng trước/sau.'],
        transfer='Thử bảng có qty là chữ, ngày sai định dạng, ngày không tồn tại và đơn gửi lại; đối chiếu báo cáo với nhật ký xuất.',
        counter=dict(q='order_id [A, A, A, B]. quality_report(...)["duplicate_ids"] = ?',
                     options=['2', '3', '1'], correct='2'),
        practice='Một hàm phụ đổi kiểu (to_numeric, to_datetime đều coerce) dùng chung cho báo cáo và xuất; mọi thay đổi '
                 'làm trên copy; to_csv(index=False).',
        steps=['_parse(raw) trả (qty, price, dates) đã đổi kiểu, KHÔNG gán vào raw.',
               'quality_report: đếm duplicated(), isna(), (qty < 0), mỗi số bọc int(...).',
               'export_clean: df = raw.copy() → gán ba cột đã đổi → bỏ trùng → dropna → qty > 0 → region → revenue → '
               'to_csv(path, index=False) → trả nhật ký.'],
        partial=r'''def quality_report(raw):
    qty, price, dates = _parse(raw)
    return {
        "rows": int(len(raw)),
        "duplicate_ids": int(raw["order_id"].duplicated().sum()),
        ...
    }''',
        io=[('sales.csv', 'rows 11; trùng 1; qty thiếu 1; qty âm 1; giá thiếu 1; ngày hỏng 1'),
            ('export_clean(sales.csv)', '{"raw_rows": 11, "clean_rows": 6, "revenue": 155.0}'),
            ('Sau khi gọi', 'raw không đổi; file sạch không có cột index')],
        contracts=[
            dict(sig='quality_report(raw)', does='Đếm các lỗi chất lượng của bảng bán hàng thô.',
                 takes='raw: DataFrame order_id, date, region, product, qty, unit_price (đọc thô)',
                 gives='dict int: rows, duplicate_ids, missing_qty, negative_qty, missing_price, bad_dates',
                 effect='Không sửa raw.', call='quality_report(raw)["duplicate_ids"] → 1'),
            dict(sig='export_clean(raw, path)', does='Áp chính sách làm sạch, ghi CSV sạch và trả nhật ký.',
                 takes='raw như trên; path: tên file đầu ra', gives='dict {"raw_rows": int, "clean_rows": int, "revenue": float}',
                 effect='Ghi file path (không cột index); không sửa raw.',
                 call='export_clean(raw, "clean.csv") → {"raw_rows": 11, "clean_rows": 6, "revenue": 155.0}'),
        ],
        starter=PD09_STARTER,
        solution=PD09_SOLUTION,
        tests=[
            T('sales.csv: báo cáo chất lượng', f'quality_report({SALES})',
              {'rows': 11, 'duplicate_ids': 1, 'missing_qty': 1, 'negative_qty': 1, 'missing_price': 1, 'bad_dates': 1}),
            T('Dữ liệu khác: qty "x", ngày sai định dạng, ngày 31/4', f'quality_report({R9})',
              {'rows': 8, 'duplicate_ids': 2, 'missing_qty': 2, 'negative_qty': 1, 'missing_price': 1, 'bad_dates': 2}),
            T('Bảng sạch → báo cáo toàn 0',
              'quality_report(pd.DataFrame({"order_id": ["Z1"], "date": ["2026-05-01"], "region": ["hue"], '
              '"product": ["Pen"], "qty": [1], "unit_price": [3.0]}))',
              {'rows': 1, 'duplicate_ids': 0, 'missing_qty': 0, 'negative_qty': 0, 'missing_price': 0, 'bad_dates': 0}),
            T('sales.csv: 11 dòng thô → 6 đơn, revenue 155', f'export_clean({SALES}, "clean.csv")',
              {'raw_rows': 11, 'clean_rows': 6, 'revenue': 155.0}),
            T('Dữ liệu khác: nhật ký làm sạch', f'export_clean({R9}, "clean_e.csv")',
              {'raw_rows': 8, 'clean_rows': 2, 'revenue': 31.5}),
            T('export_clean không sửa raw',
              keep_raw('export_clean(r, "clean.csv")', 'r["date"].tolist()[:2] + r["region"].tolist()[:1]') + f'({SALES})',
              ['2026-01-01', '2026-01-02', ' North ']),
            T('File xuất không có cột index',
              f'(export_clean({SALES}, "clean.csv"), _studio.read("clean.csv").splitlines()[0])[1]',
              'order_id,date,region,product,qty,unit_price,revenue'),
            T('File xuất: 6 đơn, vùng đã chuẩn hoá',
              f'(export_clean({SALES}, "clean.csv"), (lambda c: (len(c), sorted(set(c["region"]))))(pd.read_csv("clean.csv")))[1]',
              (6, ['north', 'south'])),
        ],
        bad=[
            ('đếm trùng bằng keep=False', PD09_SOLUTION.replace(
                '"duplicate_ids": int(raw["order_id"].duplicated().sum()),',
                '"duplicate_ids": int(raw["order_id"].duplicated(keep=False).sum()),')),
            ('sửa thẳng vào raw', PD09_SOLUTION.replace('df = raw.copy()', 'df = raw')),
            ('đếm thiếu bằng chuỗi rỗng', PD09_SOLUTION.replace(
                '"missing_qty": int(qty.isna().sum()),', '"missing_qty": int((raw["qty"] == "").sum()),')),
            ('xuất kèm index', PD09_SOLUTION.replace('df.to_csv(path, index=False)', 'df.to_csv(path)')),
        ],
    ),
]


BRIEFS = {
    'PD01': dict(
        goal='Lấy dữ liệu theo nhãn (loc), theo vị trí (iloc) và cộng Series theo nhãn.',
        task='Viết pick(df, sid) và add_bonus(marks, bonus).',
        predict='Index [10, 20]: s.loc[20] và s.iloc[0] là gì?',
        code=['def pick(df, sid):', '    pass  # (điểm theo nhãn, điểm hàng đầu)', '',
              'def add_bonus(marks, bonus):', '    pass  # cộng theo mã sinh viên'],
        tests=['S01, S02 / 7, 9 → pick(df, "S02") = (9, 7)', 'bonus đảo thứ tự → vẫn cộng đúng mã'],
        reflect='Vì sao "hàng đầu" phải dùng iloc[0] chứ không loc[0]?'),
    'PD02': dict(
        goal='Đọc file theo schema khai rõ và xuất CSV không cột index.',
        task='Viết load_scores(path) đọc file dấu ; (usecols, dtype, na_values) và export_csv(df, path).',
        predict='Không khai dtype, "007" đọc ra thành gì?',
        code=['def load_scores(path):', '    return pd.read_csv(path, sep=";", ...)', '',
              'def export_csv(df, path):', '    pass  # ghi CSV, không cột index'],
        tests=['scores.csv → id ["001", "007", "010"], 1 ô thiếu', 'export_csv → dòng đầu "id,mark"'],
        reflect='Vì sao phải khai dtype cho cột id?'),
    'PD03': dict(
        goal='Làm sạch kiểu số, nhãn chữ và dòng trùng theo khoá.',
        task='Viết score_stats(values) và clean_sales(raw): to_numeric(coerce), strip/lower, bỏ trùng theo order_id.',
        predict='["8", "bad", "9"]: trung bình hợp lệ là bao nhiêu?',
        code=['def score_stats(values):', '    pass  # {"bad": ..., "mean": ...}', '',
              'def clean_sales(raw):', '    df = raw.copy()', '    # chuẩn hoá, đổi số, bỏ trùng, bỏ thiếu'],
        tests=['["8", "bad", "9"] → {"bad": 1, "mean": 8.5}', 'sales.csv 11 dòng → 8 dòng sạch'],
        reflect='Vì sao không được coi ô "bad" là 0?'),
    'PD04': dict(
        goal='Lọc, tính cột và cập nhật bằng loc trên bản copy.',
        task='Viết add_flags(df) (revenue, status) và top_orders(df, region, min_revenue).',
        predict='df[mask]["status"] = "check" có sửa được df không?',
        code=['def add_flags(df):', '    out = df.copy()', '    # revenue, status "ok" / "check"', '',
              'def top_orders(df, region, min_revenue):', '    pass'],
        tests=['qty [2, 3], giá [10, 20], ngưỡng 30 → [60]', 'qty ≤ 0 → status "check"; df gốc không đổi'],
        reflect='Vì sao phải viết out.loc[mask, "status"] = ... trong một lần?'),
    'PD05': dict(
        goal='Tính KPI theo vùng với mẫu số rõ ràng.',
        task='Viết region_kpi(df): orders, qty, revenue, avg_price = revenue / qty, share = revenue / tổng.',
        predict='Giá bình quân vùng: mean(unit_price) hay tổng revenue / tổng qty?',
        code=['def region_kpi(df):', '    data = df.assign(...)', '    out = data.groupby("region").agg(...)',
              '    # avg_price, share, đối chiếu tổng', '    return out'],
        tests=['A: 10, 20; B: 40 → revenue A 30, B 40', 'A chiếm 3/7 ≈ 0.4286 tổng doanh thu'],
        reflect='Vì sao trung bình của các giá không bằng giá bình quân?'),
    'PD06': dict(
        goal='Ghép bảng tra cứu không làm rơi hay nhân dòng.',
        task='Viết attach_prices(orders, prices) (left, validate, indicator) và stack(frames).',
        predict='Bảng giá trùng sku thì merge ra thêm dòng hay báo lỗi?',
        code=['def attach_prices(orders, prices):', '    return orders.merge(prices, on="sku", ...)', '',
              'def stack(frames):', '    pass  # kiểm schema rồi concat'],
        tests=['sku A, B; giá chỉ có A → 2 dòng, 1 thiếu giá', 'Bảng giá trùng sku → MergeError'],
        reflect='Vì sao phải so số dòng trước và sau merge?'),
    'PD07': dict(
        goal='Đổi long ↔ wide mà không đổi tổng.',
        task='Viết to_long(wide) bằng melt và to_wide(long) bằng pivot_table(aggfunc="sum").',
        predict='Hai dòng cùng (vùng, tháng): pivot hay pivot_table?',
        code=['def to_long(wide):', '    return wide.melt(...)', '',
              'def to_wide(long):', '    pass  # pivot_table, aggfunc ghi rõ'],
        tests=['id 1: A = 5, B = 8 → melt → pivot lại A = 5, B = 8', 'Trùng (vùng, tháng) 30 + 20 → ô = 50'],
        reflect='Khi nào fill_value=0 là hợp lý?'),
    'PD08': dict(
        goal='Tổng theo tháng và trung bình trượt trên ngày đã làm sạch.',
        task='Viết monthly_revenue(df) (coerce, resample "MS", tháng trống NaN) và rolling_mean(s, window).',
        predict='Tháng không có đơn: resample().sum() cho 0 hay NaN?',
        code=['def monthly_revenue(df):', '    # to_datetime(errors="coerce") → bỏ NaT', '    # set_index → resample("MS") → sum(min_count=1)',
              '', 'def rolling_mean(s, window):', '    pass'],
        tests=['1/1: 5, 2/1: 15 → tháng 1 = 20; rolling(2) = 10', 'Tháng 2 trống → NaN, không phải 0'],
        reflect='Vì sao phải sort_index() trước rolling?'),
    'PD09': dict(
        goal='Báo cáo chất lượng rồi xuất bản sạch kèm nhật ký.',
        task='Viết quality_report(raw) và export_clean(raw, path) — không sửa raw.',
        predict='order_id [O1, O5, O5]: duplicated().sum() là 1 hay 2?',
        code=['def quality_report(raw):', '    pass  # rows, duplicate_ids, missing_qty, ...', '',
              'def export_clean(raw, path):', '    pass  # làm sạch bản sao → to_csv(index=False)'],
        tests=['sales.csv → 1 trùng, 1 thiếu qty, 1 qty âm, 1 thiếu giá, 1 ngày hỏng', 'export_clean → 11 dòng thô, 6 đơn, revenue 155'],
        reflect='Vì sao không gán kết quả làm sạch ngược vào raw?'),
}
