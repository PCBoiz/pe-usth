"""Python Advanced (pe-v4) — Matplotlib: X04, X05 (tra cứu bổ sung, mở đầu phần biểu đồ) và M01–M06.

Nguồn: python-learning-data.json (X04, X05, M01–M06: points, examples, exercise) và
python-knowledge-handbook.pdf trang 96–99, 131–142.

Chấm biểu đồ KHÔNG so ảnh. Mỗi bài cho học viên viết HÀM dựng và trả về Figure (hoặc
xuất bytes); ca chấm gọi hàm với dữ liệu KHÁC ví dụ rồi đọc thuộc tính Matplotlib:
ax.get_title()/get_xlabel(), ax.lines[i].get_ydata(), ax.patches (chiều cao cột),
ax.images[0].get_clim(), ax.texts, ax.get_ylim(), formatter của trục, header PNG
(rộng/cao nằm ở byte 16–24), số figure đang mở (plt.get_fignums()). Không ca nào cần
`_studio.figures`; M05 dùng `_studio.call` (đã có từ pe-v3) để bắt ValueError.

Lệch so với nguồn (có chủ đích):
* Ví dụ M02 dùng `ax.boxplot(..., tick_labels=...)` — tham số này chỉ có từ Matplotlib 3.9;
  Pyodide 0.27.7 có 3.8.4 (gọi là `labels=`). Bài dùng `ax.set_xticks(vị trí, tên)` chạy được
  ở mọi phiên bản và giải thích sự đổi tên trong explain.
* Bài tập nguồn là script vẽ một hình cố định; ở đây chuyển thành hàm trả Figure để chấm được
  trên dữ liệu mới. Dữ liệu ví dụ của nguồn giữ ở `example`/`io`/demo.
"""
from authoring import T, TX, out, run  # noqa: F401

try:
    from authoring import DA_ENV
except ImportError:  # authoring.py của hạ tầng chưa có hằng này
    DA_ENV = ('Bài này dùng numpy / pandas / matplotlib chạy ngay trong trình duyệt (Pyodide). Biểu đồ vẽ bằng '
              'backend Agg: plt.show() không mở cửa sổ, bộ chấm đọc thẳng tiêu đề, nhãn trục và dữ liệu của '
              'Figure. Chạy trên máy để xem hình.')

MPL = ['numpy', 'matplotlib']
PD_MPL = ['numpy', 'pandas', 'matplotlib']

PNG_SIG = b'\x89PNG\r\n\x1a\n'


def floats(expr):
    """Biểu thức đổi một dãy số (array/list) thành list float thuần để so sánh và in đẹp."""
    return f'[float(v) for v in {expr}]'


def png_size(expr):
    """(rộng, cao) đọc từ header IHDR của bytes PNG — không cần thư viện ảnh."""
    return f'(lambda b: (int.from_bytes(b[16:20], "big"), int.from_bytes(b[20:24], "big")))({expr})'


TO_HEX = '__import__("matplotlib.colors", fromlist=["to_hex"]).to_hex'


# ====================================================================== X04
X04_SOLUTION = r'''import matplotlib.pyplot as plt


def plot_weekly(weeks, scores):
    fig, ax = plt.subplots()
    ax.plot(weeks, scores, marker="o")
    ax.set(xlabel="Week", ylabel="Score")
    return fig


def plot_histogram(scores, edges):
    fig, ax = plt.subplots()
    ax.hist(scores, bins=edges)
    ax.set(xlabel="Score", ylabel="Count")
    return fig


if __name__ == "__main__":
    plot_weekly([1, 2, 3], [7, 8, 6])
    plot_histogram([4, 5, 5, 7, 8, 9], [4, 6, 8, 10])
    plt.show()
'''

X04_STARTER = r'''import matplotlib.pyplot as plt


def plot_weekly(weeks, scores):
    # Tạo fig, ax; vẽ line có marker "o"; nhãn Week / Score; return fig
    pass


def plot_histogram(scores, edges):
    # Tạo fig, ax; histogram với bins=edges; nhãn Score / Count; return fig
    pass


if __name__ == "__main__":
    plot_weekly([1, 2, 3], [7, 8, 6])
    plot_histogram([4, 5, 5, 7, 8, 9], [4, 6, 8, 10])
    plt.show()
'''

X04_W = 'plot_weekly([1, 2, 3, 4], [5, 9, 4, 6])'
X04_H = 'plot_histogram([0, 10, 10, 3, 7], [0, 5, 10])'

# ====================================================================== X05
X05_SOLUTION = r'''import matplotlib.pyplot as plt
from io import BytesIO


def plot_marks(names, marks, pass_mark):
    fig, ax = plt.subplots()
    ax.bar(names, marks)
    ax.axhline(pass_mark, color="gray", linestyle="--", label="Pass")
    ax.set_ylim(0, 10)
    ax.legend()
    ax.set(title="Marks", xlabel="Student", ylabel="Score")
    return fig


def export_png(fig, dpi):
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=dpi)
    plt.close(fig)
    return buf.getvalue()


if __name__ == "__main__":
    plot_marks(["An", "Binh", "Chi"], [8, 6, 9], 5)
    plt.show()
'''

X05_STARTER = r'''import matplotlib.pyplot as plt
from io import BytesIO


def plot_marks(names, marks, pass_mark):
    # bar điểm; axhline nét đứt label "Pass"; ylim 0..10; legend; tiêu đề + nhãn; return fig
    pass


def export_png(fig, dpi):
    # Lưu CHÍNH fig vào BytesIO dạng PNG với dpi; đóng fig; trả bytes
    pass


if __name__ == "__main__":
    plot_marks(["An", "Binh", "Chi"], [8, 6, 9], 5)
    plt.show()
'''

X05_M = 'plot_marks(["An", "Binh", "Chi"], [9, 3, 6], 4)'

# ====================================================================== M01
M01_SOLUTION = r'''import matplotlib.pyplot as plt


def revenue_dashboard(days, revenue, categories, orders):
    fig, (ax_line, ax_bar) = plt.subplots(1, 2, layout="constrained")

    ax_line.plot(days, revenue, marker="o")
    ax_line.set(xlabel="Day", ylabel="Revenue", title="Daily revenue")

    ranked = sorted(zip(orders, categories))
    ax_bar.barh([name for count, name in ranked], [count for count, name in ranked])
    ax_bar.set(xlabel="Orders", title="Orders by category")
    return fig


if __name__ == "__main__":
    revenue_dashboard([1, 2, 3], [10, 15, 12], ["A", "B", "C"], [30, 15, 22])
    plt.show()
'''

M01_STARTER = r'''import matplotlib.pyplot as plt


def revenue_dashboard(days, revenue, categories, orders):
    # 1. fig, (ax_line, ax_bar) = plt.subplots(1, 2, layout="constrained")
    # 2. ax_line: line marker "o"; Day / Revenue; tiêu đề "Daily revenue"
    # 3. ax_bar: barh đã sắp, lớn nhất trên cùng; Orders; tiêu đề "Orders by category"
    pass


if __name__ == "__main__":
    revenue_dashboard([1, 2, 3], [10, 15, 12], ["A", "B", "C"], [30, 15, 22])
    plt.show()
'''

M01_D = 'revenue_dashboard([1, 2, 3, 4], [40, 25, 35, 50], ["Pen", "Book", "Bag", "Ink"], [12, 40, 7, 25])'

# ====================================================================== M02
M02_SOLUTION = r'''import matplotlib.pyplot as plt


def plot_distribution(groups, edges):
    fig, (ax_hist, ax_box) = plt.subplots(1, 2, layout="constrained")
    all_scores = [score for scores in groups.values() for score in scores]
    ax_hist.hist(all_scores, bins=edges)
    ax_hist.set(xlabel="Score", ylabel="Count", title=f"All scores (n={len(all_scores)})")

    ax_box.boxplot(list(groups.values()))
    ax_box.set_xticks(range(1, len(groups) + 1), list(groups))
    ax_box.set(ylabel="Score")
    return fig


def plot_relation(hours, scores):
    fig, ax = plt.subplots()
    ax.scatter(hours, scores, alpha=0.5)
    ax.set(xlabel="Hours", ylabel="Score")
    return fig


if __name__ == "__main__":
    plot_distribution({"A": [4, 5, 6, 7], "B": [5, 6, 7, 20]}, [0, 5, 10, 25])
    plot_relation([1, 2, 3, 4], [2, 3, 3, 5])
    plt.show()
'''

M02_STARTER = r'''import matplotlib.pyplot as plt


def plot_distribution(groups, edges):
    # Hai Axes: histogram của MỌI điểm (bins=edges, tiêu đề có n) và boxplot mỗi nhóm một hộp
    pass


def plot_relation(hours, scores):
    # scatter alpha=0.5; nhãn Hours / Score; return fig
    pass


if __name__ == "__main__":
    plot_distribution({"A": [4, 5, 6, 7], "B": [5, 6, 7, 20]}, [0, 5, 10, 25])
    plot_relation([1, 2, 3, 4], [2, 3, 3, 5])
    plt.show()
'''

M02_G = ('plot_distribution({"North": [50, 55, 60, 62, 58], "South": [52, 57, 61, 59, 95], '
         '"East": [10, 56, 58, 60, 57]}, [0, 40, 60, 100])')
M02_R = 'plot_relation([1, 2, 2, 5], [3, 4, 4, 9])'
FLIERS = '[[float(v) for v in l.get_ydata()] for l in {ax}.lines if l.get_linestyle() == "None"]'

# ====================================================================== M03
M03_SOLUTION = r'''import matplotlib.pyplot as plt
import pandas as pd


def plot_heatmaps(tables, unit):
    vmax = max(table.to_numpy().max() for table in tables.values())
    fig, axes = plt.subplots(1, len(tables), layout="constrained", squeeze=False)
    for ax, (title, table) in zip(axes[0], tables.items()):
        im = ax.imshow(table.to_numpy(), cmap="viridis", vmin=0, vmax=vmax)
        ax.set_xticks(range(len(table.columns)), table.columns)
        ax.set_yticks(range(len(table.index)), table.index)
        ax.set_title(title)
    fig.colorbar(im, ax=list(axes[0]), label=unit)
    return fig


if __name__ == "__main__":
    jan = pd.DataFrame([[10, 20], [30, 40]], index=["A", "B"], columns=["Pen", "Ink"])
    feb = pd.DataFrame([[5, 15], [25, 60]], index=["A", "B"], columns=["Pen", "Ink"])
    plot_heatmaps({"Jan": jan, "Feb": feb}, "Orders")
    plt.show()
'''

M03_STARTER = r'''import matplotlib.pyplot as plt
import pandas as pd


def plot_heatmaps(tables, unit):
    # vmax chung = giá trị lớn nhất của MỌI bảng
    # fig, axes = plt.subplots(1, len(tables), layout="constrained", squeeze=False)
    # mỗi bảng: imshow viridis, vmin=0, vmax chung; tick = tên cột / tên hàng; tiêu đề = khoá
    # một colorbar cho cả hàng, label=unit; return fig
    pass


if __name__ == "__main__":
    jan = pd.DataFrame([[10, 20], [30, 40]], index=["A", "B"], columns=["Pen", "Ink"])
    feb = pd.DataFrame([[5, 15], [25, 60]], index=["A", "B"], columns=["Pen", "Ink"])
    plot_heatmaps({"Jan": jan, "Feb": feb}, "Orders")
    plt.show()
'''

M03_TABLES = ('{"Jan": pd.DataFrame([[10, 20], [30, 40], [5, 0]], index=["N", "S", "E"], columns=["Pen", "Ink"]), '
              '"Feb": pd.DataFrame([[15, 70], [25, 35], [8, 2]], index=["N", "S", "E"], columns=["Pen", "Ink"])}')
M03_H = f'plot_heatmaps({M03_TABLES}, "Orders")'

# ====================================================================== M04
M04_SOLUTION = r'''import matplotlib.pyplot as plt
import pandas as pd

HIGHLIGHT = "#bf4520"
BASE = "#bfc0c0"


def plot_highlight(revenue):
    pos = int(revenue.to_numpy().argmax())
    top, value = revenue.index[pos], revenue.iloc[pos]
    colors = [BASE] * len(revenue)
    colors[pos] = HIGHLIGHT

    fig, ax = plt.subplots()
    ax.bar(revenue.index, revenue.to_numpy(), color=colors)
    ax.annotate(str(value), xy=(pos, value), ha="center", va="bottom")
    ax.set_ylim(0, value * 1.2)
    ax.set(title=f"{top} has the highest revenue", ylabel="Revenue")
    return fig


if __name__ == "__main__":
    plot_highlight(pd.Series([12, 25, 18], index=["A", "B", "C"]))
    plt.show()
'''

M04_STARTER = r'''import matplotlib.pyplot as plt
import pandas as pd

HIGHLIGHT = "#bf4520"
BASE = "#bfc0c0"


def plot_highlight(revenue):
    # pos = vị trí cột lớn nhất; màu HIGHLIGHT cho cột đó, BASE cho cột khác
    # bar đủ mọi category; annotate giá trị tại (pos, giá trị); ylim 0..max*1.2
    # tiêu đề f"{top} has the highest revenue"; nhãn y "Revenue"; return fig
    pass


if __name__ == "__main__":
    plot_highlight(pd.Series([12, 25, 18], index=["A", "B", "C"]))
    plt.show()
'''

M04_R = 'plot_highlight(pd.Series([18, 9, 31, 22], index=["Pen", "Ink", "Bag", "Book"]))'

# ====================================================================== M05
M05_SOLUTION = r'''import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd
from matplotlib.ticker import PercentFormatter


def plot_rate(df):
    data = df.assign(date=pd.to_datetime(df["date"]))
    data = data.sort_values("date")
    fig, ax = plt.subplots()
    ax.plot(data["date"], data["rate"], marker="o")
    ax.yaxis.set_major_formatter(PercentFormatter(xmax=1))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d/%m"))
    ax.set_ylim(0, 1)
    ax.set_ylabel("Conversion rate")
    return fig


def plot_log_sizes(names, sizes):
    if any(size <= 0 for size in sizes):
        raise ValueError("log scale needs positive sizes")
    fig, ax = plt.subplots()
    ax.bar(names, sizes)
    ax.set_yscale("log")
    ax.set_ylabel("Users (log scale)")
    return fig


if __name__ == "__main__":
    df = pd.DataFrame({"date": ["2026-01-03", "2026-01-01", "2026-01-02"], "rate": [0.5, 0.25, 0.4]})
    plot_rate(df)
    plot_log_sizes(["A", "B", "C"], [120, 4000, 45000])
    plt.show()
'''

M05_STARTER = r'''import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd
from matplotlib.ticker import PercentFormatter


def plot_rate(df):
    # to_datetime + sort theo ngày; line marker "o"; PercentFormatter(xmax=1); ylim 0..1
    # DateFormatter("%d/%m") cho trục x; nhãn y "Conversion rate"; return fig
    pass


def plot_log_sizes(names, sizes):
    # size <= 0 -> ValueError TRƯỚC khi vẽ; bar; trục y log; nhãn "Users (log scale)"
    pass


if __name__ == "__main__":
    df = pd.DataFrame({"date": ["2026-01-03", "2026-01-01", "2026-01-02"], "rate": [0.5, 0.25, 0.4]})
    plot_rate(df)
    plot_log_sizes(["A", "B", "C"], [120, 4000, 45000])
    plt.show()
'''

M05_DF = ('pd.DataFrame({"date": ["2026-02-02", "2026-01-30", "2026-02-01", "2026-01-31"], '
          '"rate": [0.6, 0.2, 0.45, 0.3]})')
M05_F = f'plot_rate({M05_DF})'
M05_L = 'plot_log_sizes(["A", "B", "C"], [120, 4000, 300000])'
DATE2NUM = '__import__("matplotlib.dates", fromlist=["date2num"]).date2num'

# ====================================================================== M06
M06_SOLUTION = r'''import matplotlib.pyplot as plt
from io import BytesIO


def make_chart(title, values):
    fig, ax = plt.subplots(figsize=(6, 3), layout="constrained")
    ax.plot(range(1, len(values) + 1), values, marker="o")
    ax.set(title=title, xlabel="Day", ylabel="Revenue")
    return fig


def export_all(charts, dpi):
    result = {}
    for title, values in charts.items():
        fig = make_chart(title, values)
        buf = BytesIO()
        fig.savefig(buf, format="png", dpi=dpi)
        plt.close(fig)
        result[title] = buf.getvalue()
    return result


if __name__ == "__main__":
    make_chart("Week 1", [10, 20, 15])
    plt.show()
'''

M06_STARTER = r'''import matplotlib.pyplot as plt
from io import BytesIO


def make_chart(title, values):
    # figure 6x3 inch, layout="constrained"; line marker "o" theo ngày 1, 2, ...
    # tiêu đề title; nhãn Day / Revenue; return fig
    pass


def export_all(charts, dpi):
    # mỗi (title, values): make_chart -> savefig PNG vào BytesIO với dpi -> close -> lưu bytes
    pass


if __name__ == "__main__":
    make_chart("Week 1", [10, 20, 15])
    plt.show()
'''

OPEN_DELTA = '(lambda n: ({call}, len(plt.get_fignums()) - n){pick})(len(plt.get_fignums()))'


LESSONS = [
    # ------------------------------------------------------------------ X04
    dict(
        code='X04', title='Matplotlib: dữ liệu và loại biểu đồ', minutes=30,
        goal='Tạo Figure/Axes bằng plt.subplots() và chọn đúng loại biểu đồ: line cho diễn tiến, histogram cho phân bố.',
        prereq=None, packages=MPL, env=DA_ENV,
        brief='Viết hai hàm, mỗi hàm tạo fig, ax = plt.subplots(), vẽ lên ax rồi RETURN fig (không gọi plt.show() trong hàm). '
              '(1) plot_weekly(weeks, scores): line plot có marker "o", nhãn trục x "Week", trục y "Score". '
              '(2) plot_histogram(scores, edges): histogram dùng đúng các biên bin edges (bins=edges), nhãn trục x "Score", trục y "Count".',
        example='plot_weekly([1, 2, 3], [7, 8, 6]) → một Axes, một đường đi qua 7, 8, 6. '
                'plot_histogram([4, 5, 5, 7, 8, 9], [4, 6, 8, 10]) → 3 cột cao 3, 1, 2.',
        demo=r'''import matplotlib.pyplot as plt

fig, ax = plt.subplots()
ax.plot([1, 2, 3], [20, 30, 25], marker="o")
ax.set(xlabel="Day", ylabel="Visitors")

print(type(fig).__name__, len(fig.axes))
print(ax.get_xlabel(), "/", ax.get_ylabel())
print(ax.lines[0].get_ydata().tolist())

fig2, ax2 = plt.subplots()
counts, edges, bars = ax2.hist([1, 2, 2, 4, 5], bins=[0, 3, 6])
print(counts.tolist(), len(ax2.patches))
''',
        explain=[
            'Một biểu đồ đi qua các bước: chuẩn bị dữ liệu → tạo Figure/Axes → vẽ → tùy chỉnh (nhãn, tiêu đề) → lưu → hiển thị. '
            'plt.subplots() trả về CẶP (fig, ax): Figure là cả tấm hình, Axes là một vùng toạ độ bên trong để vẽ.',
            'Vẽ bằng method của ax (ax.plot, ax.hist, ax.set…) để biết chắc nét vẽ rơi vào Axes nào. Figure là một object Python: '
            'fig.axes, ax.lines, ax.patches cho đọc lại những gì đã vẽ — bộ chấm của bài dùng chính các thuộc tính này, không so ảnh.',
            'Chọn biểu đồ theo câu hỏi: line nối các điểm theo một trục có thứ tự (tuần, ngày); bar/barh so các category; '
            'scatter cho quan hệ giữa hai biến; histogram ĐẾM số quan sát rơi vào từng khoảng (bin) — đó là phân bố, không phải diễn tiến.',
            'ax.hist(data, bins=[4, 6, 8, 10]) tạo 3 bin [4, 6), [6, 8), [8, 10] — bin cuối gồm cả biên phải. Không truyền bins thì '
            'Matplotlib tự chia 10 bin đều, số cột và chiều cao đổi theo, kết luận về phân bố cũng đổi.',
            'Trên máy: script gọi plt.show() ở cuối để mở cửa sổ; notebook tự hiện figure cuối cell. Hàm vẽ nên RETURN fig để nơi gọi '
            'tự quyết định hiển thị, lưu file hay kiểm tra. NumPy (linspace, sin…) hay đi kèm để tạo dữ liệu vẽ thử.',
        ],
        predict=dict(q='ax.hist([4, 5, 5, 7, 8, 9], bins=[4, 6, 8, 10]) tạo mấy cột, cao bao nhiêu?', options=[
            ('3 cột: 3, 1, 2', '[4, 6) có 4, 5, 5; [6, 8) có 7; [8, 10] có 8 và 9 — bin cuối gồm cả biên phải.', True),
            ('6 cột, mỗi cột cao 1', 'hist không vẽ một cột cho mỗi giá trị; nó đếm theo bin.', False),
            ('4 cột: 3, 1, 1, 1', 'Bốn biên tạo ba bin, không phải bốn.', False),
            ('3 cột: 3, 1, 1', '8 và 9 cùng rơi vào bin cuối [8, 10].', False),
        ]),
        myth=('"Histogram và line plot cùng một mục đích — đều là vẽ các con số"',
              'Line nối điểm theo một trục có thứ tự (tuần 1 → 2 → 3); histogram đếm bao nhiêu quan sát rơi vào mỗi khoảng giá trị. '
              'Vẽ danh sách điểm thi bằng ax.plot(scores) cho ra một đường zig-zag theo THỨ TỰ NHẬP, không nói gì về việc điểm tập trung ở đâu.'),
        mcq=[
            dict(q='fig, ax = plt.subplots() — fig và ax khác nhau thế nào?', options=[
                ('fig là cả tấm hình (Figure), ax là một vùng toạ độ (Axes) bên trong để vẽ', 'Một Figure có thể chứa nhiều Axes: fig.axes là list.', True),
                ('Giống nhau, chỉ là hai tên gọi', 'Figure chứa Axes; dữ liệu được vẽ lên Axes.', False),
                ('ax là file ảnh, fig là dữ liệu', 'Chưa có file nào cho tới khi gọi savefig.', False),
            ]),
            dict(q='Muốn xem điểm thi của lớp tập trung ở khoảng nào, chọn biểu đồ nào?', options=[
                ('Histogram', 'Histogram đếm số quan sát theo khoảng — đó là phân bố.', True),
                ('Line plot', 'Line nối các điểm theo thứ tự; thứ tự nhập danh sách điểm không có ý nghĩa.', False),
                ('Scatter', 'Scatter cần HAI biến (ví dụ giờ học và điểm).', False),
            ]),
            dict(q='Gọi ax.hist(scores) mà không truyền bins thì…', options=[
                ('Matplotlib tự chia 10 bin đều — số cột và chiều cao phụ thuộc lựa chọn đó', 'Muốn so được giữa các lần vẽ thì chốt biên bin.', True),
                ('Mỗi giá trị khác nhau thành một cột', 'Không — mặc định là 10 bin.', False),
                ('Báo lỗi thiếu bins', 'bins có giá trị mặc định nên không lỗi.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao hàm vẽ nên return fig thay vì gọi plt.show() bên trong?',
            sample='Hàm trả fig thì nơi gọi tự quyết định: hiển thị (plt.show()), lưu file (fig.savefig) hay kiểm tra '
                   '(fig.axes[0].get_xlabel()). plt.show() bên trong hàm khoá việc dùng lại: trên máy nó chặn chương trình tới khi đóng '
                   'cửa sổ, và sau khi cửa sổ đóng thì figure đã bị huỷ, không lưu được nữa.'),
        scaffold=dict(
            intro='plot_weekly đã viết sẵn. Lắp ba chỗ của plot_histogram: tạo Figure/Axes, vẽ histogram với biên cho sẵn, ghi nhãn.',
            template=r'''import matplotlib.pyplot as plt


def plot_weekly(weeks, scores):
    fig, ax = plt.subplots()
    ax.plot(weeks, scores, marker="o")
    ax.set(xlabel="Week", ylabel="Score")
    return fig


def plot_histogram(scores, edges):
    {{slot1}}
    {{slot2}}
    {{slot3}}
    return fig
''',
            slots=['fig, ax = plt.subplots()', 'ax.hist(scores, bins=edges)', 'ax.set(xlabel="Score", ylabel="Count")'],
            hints=['Tạo Figure và Axes — lời gọi trả về một CẶP',
                   'Vẽ phân bố theo biên đề cho sẵn, đếm theo khoảng',
                   'Ghi nhãn hai trục — hàm vẽ không tự mở cửa sổ'],
            traps=[('ax.plot(scores)', 2, 'Nối các điểm theo thứ tự nhập — không đếm theo bin.'),
                   ('ax.hist(scores)', 2, 'Không truyền bins → 10 bin tự động, không phải biên đề cho.'),
                   ('fig = plt.subplots()', 1, 'subplots() trả về CẶP (fig, ax); fig sẽ thành tuple.'),
                   ('plt.show()', 3, 'Không ghi nhãn; và hàm vẽ không nên tự show.')]),
        flow=['fig, ax = plt.subplots() → một Figure chứa một Axes',
              'ax.plot(weeks, scores, marker="o") → đường nối điểm theo tuần',
              'ax.hist(scores, bins=edges) → đếm số điểm trong từng bin',
              'ax.set(xlabel=..., ylabel=...) → trục có tên',
              'return fig → nơi gọi tự show, lưu hoặc kiểm tra'],
        transfer='Đổi dữ liệu: 4 tuần với điểm [5, 9, 4, 6]; điểm [0, 10, 10] với biên [0, 5, 10]. Tự đoán số cột và chiều cao trước khi chạy.',
        counter=dict(q='plot_histogram([0, 10, 10], [0, 5, 10]) cho các cột cao bao nhiêu?',
                     options=['1 và 2', '1 và 0', '3'], correct='1 và 2'),
        practice='Mỗi hàm: fig, ax = plt.subplots() → vẽ bằng ax → ax.set(...) → return fig. Histogram phải nhận bins=edges.',
        steps=['plot_weekly: fig, ax = plt.subplots(); ax.plot(weeks, scores, marker="o"); ax.set(xlabel="Week", ylabel="Score"); return fig.',
               'plot_histogram: ax.hist(scores, bins=edges) — biên bin do đề cho, không để Matplotlib tự chọn; nhãn Score / Count.',
               'Không gọi plt.show() trong hàm; muốn xem trên máy thì gọi ở khối if __name__ == "__main__".'],
        partial=r'''def plot_weekly(weeks, scores):
    fig, ax = plt.subplots()
    ax.plot(weeks, scores, marker="o")
    ...''',
        io=[('plot_weekly([1, 2, 3], [7, 8, 6])', 'Figure 1 Axes; đường qua 7, 8, 6; nhãn Week / Score'),
            ('plot_histogram([4, 5, 5, 7, 8, 9], [4, 6, 8, 10])', '3 cột cao 3, 1, 2; nhãn Score / Count')],
        contracts=[
            dict(sig='plot_weekly(weeks, scores)', does='Vẽ diễn tiến điểm theo tuần.',
                 takes='weeks, scores: hai list số cùng độ dài', gives='Figure có đúng 1 Axes',
                 effect='Line có marker "o"; nhãn Week / Score; không gọi plt.show().',
                 call='plot_weekly([1, 2, 3], [7, 8, 6]).axes[0].get_xlabel() → "Week"'),
            dict(sig='plot_histogram(scores, edges)', does='Vẽ phân bố điểm theo các bin cho sẵn.',
                 takes='scores: list số; edges: list biên bin tăng dần', gives='Figure có 1 Axes, len(edges) - 1 cột',
                 effect='Cột thứ i cao bằng số điểm trong bin i; bin cuối gồm cả biên phải.',
                 call='plot_histogram([4, 5, 5, 7, 8, 9], [4, 6, 8, 10]) → cột cao 3, 1, 2'),
        ],
        starter=X04_STARTER,
        solution=X04_SOLUTION,
        tests=[
            T('plot_weekly trả về Figure có đúng 1 Axes', f'(lambda f: (type(f).__name__, len(f.axes)))({X04_W})', ('Figure', 1)),
            T('Line đi qua đúng dữ liệu mới', floats(f'{X04_W}.axes[0].lines[0].get_ydata()'), [5.0, 9.0, 4.0, 6.0]),
            T('Line có marker "o"', f'{X04_W}.axes[0].lines[0].get_marker()', 'o'),
            T('Nhãn trục Week / Score', f'(lambda ax: (ax.get_xlabel(), ax.get_ylabel()))({X04_W}.axes[0])', ('Week', 'Score')),
            T('Histogram: số cột = số bin', f'len({X04_H}.axes[0].patches)', 2),
            T('Histogram đếm đúng; 10 thuộc bin cuối', floats(f'(p.get_height() for p in {X04_H}.axes[0].patches)'), [2.0, 3.0]),
            T('Histogram giữ cả bin rỗng', floats('(p.get_height() for p in plot_histogram([1, 1, 2, 9], [0, 2, 4, 6, 8, 10]).axes[0].patches)'),
              [2.0, 1.0, 0.0, 0.0, 1.0]),
            T('Histogram có nhãn Score / Count', f'(lambda ax: (ax.get_xlabel(), ax.get_ylabel()))({X04_H}.axes[0])', ('Score', 'Count')),
        ],
        bad=[('Line cho phân bố', X04_SOLUTION.replace('ax.hist(scores, bins=edges)', 'ax.plot(scores)')),
             ('Để Matplotlib tự chọn bin', X04_SOLUTION.replace('ax.hist(scores, bins=edges)', 'ax.hist(scores)')),
             ('Scatter thay cho line', X04_SOLUTION.replace('ax.plot(weeks, scores, marker="o")', 'ax.scatter(weeks, scores)'))],
    ),

    # ------------------------------------------------------------------ X05
    dict(
        code='X05', title='Matplotlib: tùy chỉnh và xuất', minutes=30,
        goal='Làm biểu đồ đọc được (nhãn, đường mốc, giới hạn trục, legend) và xuất đúng figure ra PNG rồi đóng nó.',
        prereq='X04', packages=MPL, env=DA_ENV,
        brief='Viết hai hàm. (1) plot_marks(names, marks, pass_mark): bar chart điểm từng sinh viên; đường ngang nét đứt '
              'ax.axhline(pass_mark, linestyle="--", label="Pass"); trục y cố định 0..10; ax.legend(); tiêu đề "Marks", nhãn '
              '"Student" / "Score"; return fig. (2) export_png(fig, dpi): lưu CHÍNH fig (không phải "figure hiện hành") vào '
              'io.BytesIO dạng PNG với dpi cho trước, sau đó đóng fig bằng plt.close(fig), trả về bytes.',
        example='plot_marks(["An", "Binh"], [8, 6], 5) → 2 cột 8 và 6, mốc nét đứt ở 5, legend "Pass". '
                'export_png của figure 4×2 inch với dpi 50 → bytes PNG 200×100 pixel, figure đã đóng.',
        demo=r'''import matplotlib.pyplot as plt
from io import BytesIO

fig, ax = plt.subplots(figsize=(4, 3))
ax.bar(["Q1", "Q2"], [7, 4], color="steelblue")
ax.axhline(5, color="gray", linestyle="--", label="Target")
ax.set_ylim(0, 10)
ax.legend()

buf = BytesIO()
fig.savefig(buf, format="png", dpi=50)
png = buf.getvalue()
print(png[:4])
print(int.from_bytes(png[16:20], "big"), int.from_bytes(png[20:24], "big"))
plt.close(fig)
print(plt.fignum_exists(fig.number))
''',
        explain=[
            'Chữ giúp đọc biểu đồ: ax.set(title=..., xlabel=..., ylabel=...) cho tên và đơn vị. Nét vẽ có label=... thì ax.legend() '
            'mới có mục để hiện. ax.axhline(y, linestyle="--") vẽ một đường mốc ngang (vd. điểm đạt) — nó cũng là một Line2D trong ax.lines.',
            'Màu, alpha, marker, linewidth, linestyle là tham số của từng lệnh vẽ; ax.text/ax.annotate đặt chữ tại một toạ độ. '
            'ax.set_ylim(0, 10) cố định vùng nhìn: cột bắt đầu từ 0 nên chiều dài cột so được với nhau, và thang không nhảy theo dữ liệu.',
            'fig.savefig(buf, ..., dpi=50) ghi CHÍNH figure đó. Kích thước pixel = figsize (inch) × dpi: 4×3 inch ở dpi 50 → 200×150. '
            'io.BytesIO là "file trong bộ nhớ": getvalue() trả bytes, mở đầu bằng chữ ký PNG; rộng/cao nằm ở byte 16–24.',
            'Ba lệnh dọn dẹp khác nhau: ax.cla() xoá nội dung một Axes, fig.clf() xoá nội dung figure nhưng figure VẪN mở, '
            'plt.close(fig) đóng hẳn figure và giải phóng bộ nhớ. Luôn savefig TRƯỚC close (và trước plt.show() trên máy).',
        ],
        predict=dict(q='Lưu figure 4×3 inch với dpi=50 ra PNG thì ảnh có kích thước bao nhiêu pixel?', options=[
            ('200 × 150', 'pixel = inch × dpi: 4 × 50 và 3 × 50.', True),
            ('4 × 3', 'figsize tính bằng inch, không phải pixel.', False),
            ('400 × 300', 'Đó là dpi=100 — dpi quyết định mật độ điểm ảnh.', False),
        ]),
        myth=('"plt.close(fig) rồi plt.savefig(...) vẫn lưu được biểu đồ vừa vẽ"',
              'plt.savefig lưu figure HIỆN HÀNH. Khi fig đã đóng (hoặc sau plt.show() trên máy, lúc cửa sổ đã tắt) không còn figure đó; '
              'pyplot tạo một figure MỚI, trống, khổ mặc định 6.4×4.8 inch — file ra là ảnh trắng, sai kích thước. '
              'Dùng fig.savefig(...) trước, plt.close(fig) sau.'),
        mcq=[
            dict(q='fig.clf() khác plt.close(fig) thế nào?', options=[
                ('clf xoá nội dung nhưng figure vẫn mở; close đóng hẳn figure', 'Chạy hàng loạt mà chỉ clf thì figure vẫn chiếm bộ nhớ.', True),
                ('Giống nhau', 'clf giữ figure mở; close mới đóng.', False),
                ('close chỉ xoá Axes đầu tiên', 'Xoá một Axes là việc của ax.cla().', False),
            ]),
            dict(q='ax.axhline(5, label="Pass") nhưng không gọi ax.legend() thì…', options=[
                ('Đường mốc vẫn được vẽ, nhưng không có hộp chú giải', 'label chỉ hiện khi legend() được gọi.', True),
                ('Báo lỗi', 'Không có lỗi nào.', False),
                ('Legend tự hiện', 'Matplotlib không tự thêm legend.', False),
            ]),
            dict(q='Vì sao cố định ax.set_ylim(0, 10) cho bảng điểm thang 10?', options=[
                ('Cột bắt đầu từ 0 và thang không đổi theo dữ liệu, nên chiều dài cột so được', 'Tự co trục có thể cắt đáy cột, phóng đại chênh lệch.', True),
                ('Để ảnh nét hơn', 'Độ nét do dpi quyết định, không phải ylim.', False),
                ('Bắt buộc, nếu không bar báo lỗi', 'Không bắt buộc; đây là lựa chọn để đọc đúng.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao export_png dùng fig.savefig(...) rồi mới plt.close(fig), không đảo thứ tự hay dùng plt.savefig?',
            sample='fig.savefig ghi đúng figure được truyền vào, không phụ thuộc "figure hiện hành" — nơi gọi có thể vừa tạo figure khác. '
                   'Đóng trước thì plt.savefig không còn figure đó: pyplot tạo figure mới trống, ảnh ra trắng và sai kích thước. '
                   'Lưu xong mới close để giải phóng bộ nhớ; clf() không đủ vì figure vẫn mở.'),
        scaffold=dict(
            intro='plot_marks đã viết sẵn. Lắp export_png: tạo bộ đệm, lưu đúng figure với dpi, đóng figure.',
            template=r'''import matplotlib.pyplot as plt
from io import BytesIO


def plot_marks(names, marks, pass_mark):
    fig, ax = plt.subplots()
    ax.bar(names, marks)
    ax.axhline(pass_mark, color="gray", linestyle="--", label="Pass")
    ax.set_ylim(0, 10)
    ax.legend()
    ax.set(title="Marks", xlabel="Student", ylabel="Score")
    return fig


def export_png(fig, dpi):
    buf = {{slot1}}
    {{slot2}}
    {{slot3}}
    return buf.getvalue()
''',
            slots=['BytesIO()', 'fig.savefig(buf, format="png", dpi=dpi)', 'plt.close(fig)'],
            hints=['Bộ đệm bytes trong bộ nhớ, không phải file trên đĩa',
                   'Lưu ĐÚNG figure được truyền vào, kèm định dạng và dpi',
                   'Giải phóng figure hẳn, không chỉ xoá nội dung'],
            traps=[('plt.savefig(buf, format="png", dpi=dpi)', 2, 'Lưu figure HIỆN HÀNH — chưa chắc là fig được truyền vào.'),
                   ('fig.clf()', 3, 'Xoá nội dung nhưng figure vẫn mở.'),
                   ('open("chart.png", "wb")', 1, 'Đề cần bytes trong bộ nhớ, không ghi file.')]),
        flow=['ax.bar(names, marks) → mỗi sinh viên một cột',
              'ax.axhline(pass_mark, linestyle="--") → đường mốc điểm đạt',
              'ax.set_ylim(0, 10) → cột bắt đầu từ 0, thang cố định',
              'fig.savefig(buf, dpi=dpi) → bytes PNG của đúng fig',
              'plt.close(fig) → figure đóng, giải phóng bộ nhớ'],
        transfer='Thử 3 sinh viên với mốc 4; xuất figure 4×2 inch ở dpi 50 rồi dpi 100 và so kích thước pixel.',
        counter=dict(q='Figure 5×2 inch, export_png(fig, 40) → PNG bao nhiêu pixel?',
                     options=['200 × 80', '5 × 2', '500 × 200'], correct='200 × 80'),
        practice='plot_marks: bar → axhline có label → set_ylim(0, 10) → legend → nhãn → return fig. '
                 'export_png: BytesIO → fig.savefig(..., dpi=dpi) → plt.close(fig) → getvalue().',
        steps=['plot_marks: ax.bar(names, marks); ax.axhline(pass_mark, color="gray", linestyle="--", label="Pass").',
               'ax.set_ylim(0, 10); ax.legend(); ax.set(title="Marks", xlabel="Student", ylabel="Score"); return fig.',
               'export_png: buf = BytesIO(); fig.savefig(buf, format="png", dpi=dpi) — dùng fig, không dùng plt.savefig.',
               'plt.close(fig) SAU khi lưu; return buf.getvalue().'],
        partial=r'''def export_png(fig, dpi):
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=dpi)
    ...''',
        io=[('plot_marks(["An", "Binh"], [8, 6], 5)', '2 cột 8, 6; mốc nét đứt ở 5; legend Pass; trục y 0..10'),
            ('export_png(plt.figure(figsize=(4, 2)), 50)', 'bytes PNG 200×100 pixel; figure đã đóng')],
        contracts=[
            dict(sig='plot_marks(names, marks, pass_mark)', does='Vẽ điểm từng sinh viên kèm mốc điểm đạt.',
                 takes='names: list tên; marks: list điểm 0..10; pass_mark: số', gives='Figure 1 Axes',
                 effect='Bar + axhline nét đứt label "Pass"; ylim 0..10; legend; tiêu đề Marks.',
                 call='plot_marks(["An"], [8], 5).axes[0].get_ylim() → (0.0, 10.0)'),
            dict(sig='export_png(fig, dpi)', does='Xuất một figure ra PNG trong bộ nhớ.',
                 takes='fig: Figure bất kỳ; dpi: số điểm ảnh mỗi inch', gives='bytes PNG (rộng = inch × dpi)',
                 effect='Đóng fig sau khi lưu (plt.fignum_exists(fig.number) → False).',
                 call='export_png(plt.figure(figsize=(4, 2)), 50) → PNG 200×100'),
        ],
        starter=X05_STARTER,
        solution=X05_SOLUTION,
        tests=[
            T('Mỗi sinh viên một cột đúng điểm', floats(f'(p.get_height() for p in {X05_M}.axes[0].patches)'), [9.0, 3.0, 6.0]),
            T('Đường mốc nét đứt ở pass_mark', f'[(l.get_linestyle(), {floats("l.get_ydata()")}) for l in {X05_M}.axes[0].lines]',
              [('--', [4.0, 4.0])]),
            T('Trục y cố định 0..10', f'tuple(float(v) for v in {X05_M}.axes[0].get_ylim())', (0.0, 10.0)),
            T('Legend có mục "Pass"', f'[t.get_text() for t in {X05_M}.axes[0].get_legend().get_texts()]', ['Pass']),
            T('Tiêu đề và nhãn trục', f'(lambda ax: (ax.get_title(), ax.get_xlabel(), ax.get_ylabel()))({X05_M}.axes[0])',
              ('Marks', 'Student', 'Score')),
            T('export_png trả bytes PNG', 'export_png(plt.figure(figsize=(4, 2)), 50)[:8]', PNG_SIG),
            T('Lưu đúng fig được truyền vào, không phải figure hiện hành',
              png_size('(lambda f, other: export_png(f, 50))(plt.figure(figsize=(4, 2)), plt.figure(figsize=(3, 3)))'), (200, 100)),
            T('dpi quyết định số pixel', png_size('export_png(plt.figure(figsize=(2, 1)), 100)'), (200, 100)),
            T('Figure đã đóng sau khi xuất', '(lambda f: (export_png(f, 30), plt.fignum_exists(f.number))[1])(plt.figure())', False),
        ],
        bad=[('Đóng trước rồi plt.savefig', X05_SOLUTION.replace(
                 '    fig.savefig(buf, format="png", dpi=dpi)\n    plt.close(fig)\n',
                 '    plt.close(fig)\n    plt.savefig(buf, format="png", dpi=dpi)\n')),
             ('clf thay cho close', X05_SOLUTION.replace('    plt.close(fig)\n', '    fig.clf()\n')),
             ('Để trục y tự co', X05_SOLUTION.replace('    ax.set_ylim(0, 10)\n', '')),
             ('plt.savefig lưu figure hiện hành', X05_SOLUTION.replace('    fig.savefig(buf, format="png", dpi=dpi)\n',
                                                                       '    plt.savefig(buf, format="png", dpi=dpi)\n'))],
    ),

    # ------------------------------------------------------------------ M01
    dict(
        code='M01', title='Figure, Axes và chọn biểu đồ', minutes=35,
        goal='Dựng một Figure hai Axes, mỗi Axes trả lời một câu hỏi bằng đúng loại biểu đồ, và luôn vẽ qua biến Axes.',
        prereq='X05', packages=MPL, env=DA_ENV,
        brief='Viết revenue_dashboard(days, revenue, categories, orders) trả về Figure gồm 2 Axes cạnh nhau: '
              'fig, (ax_line, ax_bar) = plt.subplots(1, 2, layout="constrained"). Axes trái: line có marker "o" của doanh thu theo '
              'ngày, nhãn "Day" / "Revenue", tiêu đề "Daily revenue". Axes phải: barh số đơn theo category, SẮP để category nhiều '
              'đơn nhất nằm trên cùng, nhãn trục x "Orders", tiêu đề "Orders by category". Mọi lệnh vẽ gọi qua ax_line / ax_bar, '
              'không qua plt.plot.',
        example='revenue_dashboard([1, 2, 3], [10, 15, 12], ["A", "B", "C"], [30, 15, 22]) → trái: đường qua 10, 15, 12; '
                'phải: các thanh từ dưới lên B (15), C (22), A (30).',
        demo=r'''import matplotlib.pyplot as plt

fig, (left, right) = plt.subplots(1, 2, layout="constrained")
left.plot([1, 2, 3], [20, 30, 25], marker="o")
right.barh(["Pen", "Book"], [15, 30])

print(len(fig.axes))
print(plt.gca() is right)
plt.plot([1, 2], [5, 5])
print(len(left.lines), len(right.lines))
''',
        explain=[
            'plt.subplots(1, 2) tạo MỘT Figure với HAI Axes xếp 1 hàng 2 cột; viết fig, (ax_line, ax_bar) = ... để đặt tên từng Axes ngay. '
            'layout="constrained" tự dàn khoảng cách để nhãn và tiêu đề hai Axes không chồng nhau.',
            'pyplot giữ một "Axes hiện hành" — Axes được tạo hoặc chọn gần nhất. Sau subplots(1, 2) đó là Axes BÊN PHẢI, nên plt.plot(...) '
            'rơi vào ax_bar dù bạn định vẽ bên trái (ví dụ minh hoạ in ra 1 1). Gọi ax_line.plot(...) thì không thể nhầm.',
            'Mỗi Axes một câu hỏi: diễn tiến theo ngày có thứ tự → line; so các category → bar/barh; quan hệ hai biến → scatter; '
            'phân bố → histogram. Không nối các category không có thứ tự bằng line — độ dốc giữa "A" và "B" không mang nghĩa gì.',
            'barh vẽ thanh đầu tiên ở DƯỚI cùng. Muốn xếp hạng (nhiều nhất trên cùng) thì sắp TĂNG dần trước khi vẽ: '
            'sorted(zip(orders, categories)) sắp theo số đơn. Mỗi thanh phải có metric, đơn vị và mức tổng hợp rõ (tổng đơn theo category).',
            'Notebook tự hiện figure cuối cell; script trên máy gọi plt.show(); chạy hàng loạt (server, CI) dùng backend Agg không có cửa sổ — '
            'Studio cũng chạy Agg.',
        ],
        predict=dict(q='Sau fig, (left, right) = plt.subplots(1, 2), lệnh plt.plot([1, 2], [5, 5]) vẽ vào đâu?',
                     code='fig, (left, right) = plt.subplots(1, 2)\nplt.plot([1, 2], [5, 5])', options=[
            ('Vào right — Axes được tạo sau cùng là Axes hiện hành', 'pyplot vẽ lên plt.gca(); subplots tạo left trước, right sau.', True),
            ('Vào left — Axes đầu tiên', 'pyplot không chọn Axes đầu; nó dùng Axes hiện hành.', False),
            ('Vào cả hai', 'Mỗi lệnh vẽ chỉ rơi vào một Axes.', False),
            ('Báo lỗi vì có hai Axes', 'Không lỗi — chính vì im lặng nên dễ nhầm.', False),
        ]),
        myth=('"plt.plot và ax.plot như nhau, dùng cái nào cũng được"',
              'Với MỘT Axes thì kết quả giống nhau. Với nhiều Axes, plt.plot vẽ lên Axes hiện hành (thường là Axes tạo sau cùng), '
              'không phải Axes bạn đang nghĩ — biểu đồ sai mà không báo lỗi. Trong hàm vẽ, luôn gọi method của biến Axes.'),
        mcq=[
            dict(q='Doanh thu 7 ngày liên tiếp — loại biểu đồ nào hợp nhất?', options=[
                ('Line có marker', 'Ngày có thứ tự; line cho thấy diễn tiến, marker đánh dấu từng quan sát.', True),
                ('Pie', 'Pie so phần của một tổng, không cho thấy diễn tiến theo thời gian.', False),
                ('Histogram', 'Histogram đếm phân bố giá trị, mất thứ tự ngày.', False),
            ]),
            dict(q='Số đơn của 5 category không có thứ tự tự nhiên — nên vẽ thế nào?', options=[
                ('barh, sắp theo số đơn để đọc ngay thứ hạng', 'Sắp category theo câu hỏi (ở đây là xếp hạng).', True),
                ('Line nối 5 category theo thứ tự chữ cái', 'Độ dốc giữa hai category không có ý nghĩa.', False),
                ('Scatter category với số đơn', 'Scatter dành cho quan hệ giữa hai biến số.', False),
            ]),
            dict(q='ax.barh(["B", "C", "A"], [15, 22, 30]) — thanh nào nằm trên cùng?', options=[
                ('A (30)', 'Thanh đầu tiên ở dưới cùng, thanh cuối ở trên cùng.', True),
                ('B (15)', 'B là thanh đầu tiên nên nằm dưới cùng.', False),
                ('Tự sắp theo giá trị', 'barh giữ đúng thứ tự bạn đưa vào.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao hàm dashboard gọi ax_line.plot(...) thay vì plt.plot(...)?',
            sample='subplots(1, 2) để Axes bên phải làm Axes hiện hành, nên plt.plot vẽ đường doanh thu đè lên biểu đồ barh còn Axes '
                   'trái trống — không có lỗi nào báo. Gọi qua biến ax_line chỉ đúng vùng vẽ, và hàm vẫn đúng dù trước đó ai đã tạo '
                   'thêm Axes hay figure khác.'),
        scaffold=dict(
            intro='Lắp ba chỗ: tạo hai Axes, vẽ line đúng Axes, sắp category trước khi vẽ barh.',
            template=r'''import matplotlib.pyplot as plt


def revenue_dashboard(days, revenue, categories, orders):
    fig, (ax_line, ax_bar) = {{slot1}}

    {{slot2}}
    ax_line.set(xlabel="Day", ylabel="Revenue", title="Daily revenue")

    ranked = {{slot3}}
    ax_bar.barh([name for count, name in ranked], [count for count, name in ranked])
    ax_bar.set(xlabel="Orders", title="Orders by category")
    return fig
''',
            slots=['plt.subplots(1, 2, layout="constrained")', 'ax_line.plot(days, revenue, marker="o")',
                   'sorted(zip(orders, categories))'],
            hints=['Tạo HAI Axes cạnh nhau, và để matplotlib tự dàn khoảng',
                   'Vẽ đường lên ĐÚNG panel bên trái, không lên panel hiện hành',
                   'Ghép số đơn với tên rồi xếp hạng — barh vẽ từ dưới lên'],
            traps=[('plt.plot(days, revenue, marker="o")', 2, 'Vẽ lên Axes hiện hành — tức ax_bar.'),
                   ('sorted(zip(orders, categories), reverse=True)', 3, 'Giảm dần → thanh lớn nhất nằm DƯỚI cùng.'),
                   ('plt.subplots()', 1, 'Chỉ một Axes, không tách được thành hai.'),
                   ('list(zip(orders, categories))', 3, 'Giữ thứ tự nhập, không xếp hạng.')]),
        flow=['plt.subplots(1, 2, layout="constrained") → 1 Figure, 2 Axes',
              'ax_line.plot(days, revenue, marker="o") → line bên trái',
              'sorted(zip(orders, categories)) → cặp (số đơn, tên) tăng dần',
              'ax_bar.barh(names, counts) → thanh lớn nhất nằm trên cùng',
              'return fig → nơi gọi đọc fig.axes[0], fig.axes[1]'],
        transfer='Đổi sang 4 ngày và 4 category; kiểm Axes phải không có đường nào và thanh trên cùng là category lớn nhất.',
        counter=dict(q='categories ["A", "B", "C"], orders [30, 15, 22] — thanh trên cùng là?', options=['A', 'B', 'C'], correct='A'),
        practice='Đặt tên hai Axes khi tách; vẽ line bằng ax_line, barh bằng ax_bar; sắp tăng dần trước barh để lớn nhất ở trên.',
        steps=['fig, (ax_line, ax_bar) = plt.subplots(1, 2, layout="constrained").',
               'ax_line.plot(days, revenue, marker="o"); ax_line.set(xlabel="Day", ylabel="Revenue", title="Daily revenue").',
               'ranked = sorted(zip(orders, categories)); ax_bar.barh([tên ...], [số đơn ...]) theo thứ tự ranked.',
               'ax_bar.set(xlabel="Orders", title="Orders by category"); return fig.'],
        partial=r'''def revenue_dashboard(days, revenue, categories, orders):
    fig, (ax_line, ax_bar) = plt.subplots(1, 2, layout="constrained")
    ax_line.plot(days, revenue, marker="o")
    ...''',
        io=[('revenue_dashboard([1, 2, 3], [10, 15, 12], ["A", "B", "C"], [30, 15, 22])',
             '2 Axes; trái: line 10, 15, 12; phải: barh từ dưới lên B, C, A'),
            ('Một ngày, một category', 'Vẫn 2 Axes; barh một thanh')],
        contracts=[dict(sig='revenue_dashboard(days, revenue, categories, orders)', does='Dashboard hai câu hỏi: diễn tiến doanh thu và xếp hạng category.',
                        takes='days, revenue: list cùng độ dài; categories, orders: list cùng độ dài',
                        gives='Figure: fig.axes[0] là line, fig.axes[1] là barh',
                        effect='Axes phải không có Line2D nào; thanh cuối (trên cùng) là category nhiều đơn nhất.',
                        call='revenue_dashboard([1, 2], [5, 7], ["A", "B"], [3, 9]) → barh B ở trên')],
        starter=M01_STARTER,
        solution=M01_SOLUTION,
        tests=[
            T('Một Figure, hai Axes', f'len({M01_D}.axes)', 2),
            T('Axes trái: đường qua doanh thu mới', floats(f'{M01_D}.axes[0].lines[0].get_ydata()'), [40.0, 25.0, 35.0, 50.0]),
            T('Axes trái: marker, nhãn và tiêu đề',
              f'(lambda ax: (ax.lines[0].get_marker(), ax.get_xlabel(), ax.get_ylabel(), ax.get_title()))({M01_D}.axes[0])',
              ('o', 'Day', 'Revenue', 'Daily revenue')),
            T('Axes phải không có đường nào (không vẽ nhầm bằng plt.plot)', f'len({M01_D}.axes[1].lines)', 0),
            T('barh: từ dưới lên tăng dần, lớn nhất trên cùng', floats(f'(p.get_width() for p in {M01_D}.axes[1].patches)'),
              [7.0, 12.0, 25.0, 40.0]),
            T('barh: tên category khớp thanh', f'[t.get_text() for t in {M01_D}.axes[1].get_yticklabels()]', ['Bag', 'Pen', 'Ink', 'Book']),
            T('Axes phải: nhãn Orders và tiêu đề', f'(lambda ax: (ax.get_xlabel(), ax.get_title()))({M01_D}.axes[1])',
              ('Orders', 'Orders by category')),
            T('layout="constrained"', f'type({M01_D}.get_layout_engine()).__name__', 'ConstrainedLayoutEngine'),
            T('Một ngày, một category', '(lambda f: (len(f.axes), ' + floats('(p.get_width() for p in f.axes[1].patches)') +
              '))(revenue_dashboard([1], [9], ["Solo"], [3]))', (2, [3.0])),
        ],
        bad=[('plt.plot vẽ nhầm Axes', M01_SOLUTION.replace('ax_line.plot(days, revenue, marker="o")', 'plt.plot(days, revenue, marker="o")')),
             ('Không sắp category', M01_SOLUTION.replace('ranked = sorted(zip(orders, categories))', 'ranked = list(zip(orders, categories))')),
             ('Sắp giảm dần — lớn nhất nằm dưới', M01_SOLUTION.replace('sorted(zip(orders, categories))',
                                                                       'sorted(zip(orders, categories), reverse=True)'))],
    ),

    # ------------------------------------------------------------------ M02
    dict(
        code='M02', title='Phân bố, scatter và outlier', minutes=35,
        goal='Vẽ phân bố bằng histogram có biên bin cố định, so nhóm bằng boxplot GIỮ outlier, và vẽ quan hệ bằng scatter có alpha.',
        prereq='M01', packages=MPL, env=DA_ENV,
        brief='Viết hai hàm trả về Figure. (1) plot_distribution(groups, edges): groups là dict tên nhóm → list điểm. '
              'fig, (ax_hist, ax_box) = plt.subplots(1, 2, layout="constrained"). ax_hist: histogram của TẤT CẢ điểm gộp lại với '
              'bins=edges, nhãn "Score" / "Count", tiêu đề f"All scores (n={n})" với n là tổng số quan sát. ax_box: boxplot mỗi nhóm '
              'một hộp theo thứ tự dict, GIỮ điểm ngoài whisker (không lọc, không tắt showfliers), tick là tên nhóm, nhãn y "Score". '
              '(2) plot_relation(hours, scores): scatter alpha=0.5, nhãn "Hours" / "Score".',
        example='plot_distribution({"A": [4, 5, 6, 7], "B": [5, 6, 7, 20]}, [0, 5, 10, 25]) → histogram 3 cột 1, 6, 1; '
                'tiêu đề "All scores (n=8)"; hộp B có điểm ngoài 20.',
        demo=r'''import matplotlib.pyplot as plt

fig, (ax_hist, ax_box) = plt.subplots(1, 2, layout="constrained")
counts, edges, bars = ax_hist.hist([1, 2, 2, 4], bins=[0, 3, 5])
print(counts.tolist())

parts = ax_box.boxplot([[4, 5, 6, 7], [5, 6, 7, 20]])
ax_box.set_xticks([1, 2], ["A", "B"])
print([line.get_ydata().tolist() for line in parts["fliers"]])
print([t.get_text() for t in ax_box.get_xticklabels()])
''',
        explain=[
            'Histogram đếm số quan sát trong từng bin; biên bin là một quyết định: cùng dữ liệu, biên khác → hình khác → kết luận khác. '
            'Chốt bins=edges và ghi cỡ mẫu n lên tiêu đề để người đọc biết đang nhìn bao nhiêu quan sát.',
            'Boxplot tóm tắt mỗi nhóm bằng median (vạch giữa), tứ phân vị (hộp) và whisker; điểm ngoài whisker được vẽ riêng (fliers). '
            'Điểm ngoài KHÔNG tự là lỗi — có thể là kết quả thật đáng chú ý nhất. Giữ nó trên hình rồi điều tra.',
            'ax.boxplot(list_các_nhóm) đặt hộp ở x = 1, 2, …; ghi tên bằng ax.set_xticks([1, 2], ["A", "B"]). Matplotlib 3.8 (trong Studio) '
            'còn nhận labels=…; từ 3.9 tham số đổi tên thành tick_labels= — set_xticks chạy được ở mọi phiên bản.',
            'Scatter vẽ từng CẶP quan sát (giờ học, điểm). alpha=0.5 làm điểm trong suốt một nửa nên chỗ nhiều điểm chồng nhau hiện đậm hơn. '
            'ax.plot sẽ nối các cặp theo thứ tự nhập — đường đó không có nghĩa.',
            'Scatter cho thấy tương quan, không chứng minh nhân quả: có thể có biến gây nhiễu hoặc dữ liệu thiếu. '
            'So phân bố các nhóm thì báo cỡ mẫu trước.',
        ],
        predict=dict(q='groups = {"A": [4, 5, 6, 7], "B": [5, 6, 7, 20]}, edges = [0, 5, 10, 25]. Histogram gộp có mấy cột, cao bao nhiêu?',
                     options=[
            ('3 cột: 1, 6, 1', '[0, 5) chỉ có 4; [5, 10) có 5, 6, 7, 5, 6, 7; [10, 25] có 20.', True),
            ('Hai histogram riêng cho A và B', 'Đề gộp mọi điểm vào một histogram; so nhóm là việc của boxplot.', False),
            ('3 cột: 3, 4, 1', '5 thuộc bin [5, 10) — biên trái đóng, biên phải mở (trừ bin cuối).', False),
        ]),
        myth=('"Điểm ngoài whisker là lỗi nhập liệu — bỏ đi cho biểu đồ gọn"',
              'Boxplot chỉ ĐÁNH DẤU điểm xa so với phần lớn dữ liệu; nó không biết điểm đó sai hay thật. Bỏ điểm 20 làm nhóm B trông '
              'giống A và che mất thứ đáng điều tra nhất. Muốn loại dữ liệu thì phải có chính sách rõ ràng và ghi lại, '
              'không phải tắt showfliers.'),
        mcq=[
            dict(q='ax.boxplot(data, showfliers=False) làm gì?', options=[
                ('Ẩn các điểm ngoài whisker khỏi hình — dữ liệu vẫn còn nhưng người đọc không thấy', 'Hình "gọn" hơn nhưng che outlier.', True),
                ('Xoá outlier khỏi list data', 'List không đổi; chỉ là không vẽ.', False),
                ('Sửa outlier về giá trị whisker', 'Không sửa dữ liệu nào.', False),
            ]),
            dict(q='Scatter giờ học – điểm có xu hướng đi lên. Kết luận nào đúng mực?', options=[
                ('Hai biến có tương quan dương trong mẫu này; chưa đủ để nói học nhiều GÂY RA điểm cao', 'Tương quan khác nhân quả; còn biến gây nhiễu, cỡ mẫu.', True),
                ('Học thêm 1 giờ chắc chắn tăng điểm', 'Scatter không chứng minh tác động.', False),
                ('Không kết luận được gì vì có điểm chồng nhau', 'Điểm chồng xử lý bằng alpha; vẫn đọc được xu hướng.', False),
            ]),
            dict(q='Vì sao tiêu đề histogram ghi n=…?', options=[
                ('Để người đọc biết cỡ mẫu trước khi tin vào hình dạng phân bố', '8 quan sát và 8000 quan sát cho độ tin cậy rất khác nhau.', True),
                ('Matplotlib bắt buộc', 'Không bắt buộc; đây là thói quen trình bày đúng.', False),
                ('Để đếm số bin', 'Số bin là len(edges) - 1.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao bài giữ outlier trên boxplot và chốt biên bin, thay vì để mặc định hoặc lọc dữ liệu cho đẹp?',
            sample='Biên bin mặc định đổi theo dữ liệu nên hai lần vẽ không so được; chốt edges thì cùng một thang. Outlier có thể là dữ '
                   'liệu thật quan trọng nhất — boxplot vẽ riêng nó để người đọc thấy và điều tra; tắt showfliers hay lọc bỏ là đổi '
                   'dữ liệu mà không báo cho ai.'),
        scaffold=dict(
            intro='plot_relation đã viết sẵn. Lắp ba chỗ của plot_distribution: histogram biên cố định, tiêu đề có n, boxplot đủ nhóm.',
            template=r'''import matplotlib.pyplot as plt


def plot_distribution(groups, edges):
    fig, (ax_hist, ax_box) = plt.subplots(1, 2, layout="constrained")
    all_scores = [score for scores in groups.values() for score in scores]
    {{slot1}}
    ax_hist.set(xlabel="Score", ylabel="Count", title={{slot2}})

    {{slot3}}
    ax_box.set_xticks(range(1, len(groups) + 1), list(groups))
    ax_box.set(ylabel="Score")
    return fig


def plot_relation(hours, scores):
    fig, ax = plt.subplots()
    ax.scatter(hours, scores, alpha=0.5)
    ax.set(xlabel="Hours", ylabel="Score")
    return fig
''',
            slots=['ax_hist.hist(all_scores, bins=edges)', 'f"All scores (n={len(all_scores)})"', 'ax_box.boxplot(list(groups.values()))'],
            hints=['Vẽ phân bố mọi điểm lên panel trái, theo biên đề cho',
                   'Tiêu đề kèm số QUAN SÁT, không phải số nhóm',
                   'Một hộp cho MỖI nhóm, và giữ outlier hiện ra'],
            traps=[('ax_hist.hist(all_scores)', 1, 'Bin tự động — không phải biên đề cho.'),
                   ('f"All scores (n={len(groups)})"', 2, 'len(groups) là số NHÓM, không phải số quan sát.'),
                   ('ax_box.boxplot(list(groups.values()), showfliers=False)', 3, 'Ẩn outlier khỏi hình.'),
                   ('ax_box.boxplot(all_scores)', 3, 'Gộp mọi nhóm thành một hộp — mất phép so sánh.')]),
        flow=['all_scores = [... của mọi nhóm] → gộp, n = len(all_scores)',
              'ax_hist.hist(all_scores, bins=edges) → đếm theo biên cố định',
              'ax_box.boxplot(list(groups.values())) → mỗi nhóm một hộp, giữ fliers',
              'ax_box.set_xticks(range(1, k + 1), names) → tên nhóm dưới hộp',
              'ax.scatter(hours, scores, alpha=0.5) → cặp quan sát, chỗ chồng đậm hơn'],
        transfer='Thử ba nhóm, một nhóm có điểm rất thấp; kiểm boxplot vẫn vẽ điểm đó và n trên tiêu đề đúng tổng số điểm.',
        counter=dict(q='groups {"X": [1, 2], "Y": [3, 4, 5]} → tiêu đề histogram là?',
                     options=['All scores (n=5)', 'All scores (n=2)', 'All scores (n=3)'], correct='All scores (n=5)'),
        practice='Gộp mọi điểm cho histogram (bins=edges, n trên tiêu đề); boxplot nhận list các nhóm, tick là tên nhóm; scatter có alpha.',
        steps=['all_scores = [score for scores in groups.values() for score in scores]; n = len(all_scores).',
               'ax_hist.hist(all_scores, bins=edges); ax_hist.set(xlabel="Score", ylabel="Count", title=f"All scores (n={n})").',
               'ax_box.boxplot(list(groups.values())) — để mặc định showfliers; ax_box.set_xticks(range(1, len(groups) + 1), list(groups)).',
               'plot_relation: ax.scatter(hours, scores, alpha=0.5); ax.set(xlabel="Hours", ylabel="Score"); return fig.'],
        partial=r'''def plot_distribution(groups, edges):
    fig, (ax_hist, ax_box) = plt.subplots(1, 2, layout="constrained")
    all_scores = [score for scores in groups.values() for score in scores]
    ax_hist.hist(all_scores, bins=edges)
    ...''',
        io=[('plot_distribution({"A": [4, 5, 6, 7], "B": [5, 6, 7, 20]}, [0, 5, 10, 25])',
             'histogram 1, 6, 1; tiêu đề All scores (n=8); hộp B giữ điểm 20'),
            ('plot_relation([1, 2, 3, 4], [2, 3, 3, 5])', '4 điểm scatter, alpha 0.5; nhãn Hours / Score')],
        contracts=[
            dict(sig='plot_distribution(groups, edges)', does='So phân bố: histogram gộp + boxplot theo nhóm.',
                 takes='groups: dict tên → list điểm; edges: list biên bin', gives='Figure 2 Axes',
                 effect='Tiêu đề histogram ghi n; boxplot giữ mọi điểm ngoài whisker; tick là tên nhóm.',
                 call='plot_distribution({"A": [1, 2]}, [0, 2, 4]).axes[0].get_title() → "All scores (n=2)"'),
            dict(sig='plot_relation(hours, scores)', does='Vẽ quan hệ giữa hai biến.',
                 takes='hours, scores: list cùng độ dài', gives='Figure 1 Axes',
                 effect='Scatter alpha=0.5, không nối đường; nhãn Hours / Score.',
                 call='plot_relation([1, 2], [3, 4]).axes[0].collections[0].get_alpha() → 0.5'),
        ],
        starter=M02_STARTER,
        solution=M02_SOLUTION,
        tests=[
            T('Hai Axes', f'len({M02_G}.axes)', 2),
            T('Histogram gộp mọi nhóm, đúng biên', floats(f'(p.get_height() for p in {M02_G}.axes[0].patches)'), [1.0, 9.0, 5.0]),
            T('Tiêu đề ghi cỡ mẫu n', f'{M02_G}.axes[0].get_title()', 'All scores (n=15)'),
            T('Histogram có nhãn Score / Count', f'(lambda ax: (ax.get_xlabel(), ax.get_ylabel()))({M02_G}.axes[0])', ('Score', 'Count')),
            T('Boxplot: mỗi nhóm một hộp, tick là tên nhóm', f'[t.get_text() for t in {M02_G}.axes[1].get_xticklabels()]',
              ['North', 'South', 'East']),
            T('Boxplot giữ outlier của từng nhóm', f'(lambda ax: {FLIERS.format(ax="ax")})({M02_G}.axes[1])', [[], [95.0], [10.0]]),
            T('Scatter: đúng các cặp quan sát', f'{M02_R}.axes[0].collections[0].get_offsets().tolist()',
              [[1.0, 3.0], [2.0, 4.0], [2.0, 4.0], [5.0, 9.0]]),
            T('Scatter: alpha 0.5, nhãn Hours / Score, không nối đường',
              f'(lambda ax: (ax.collections[0].get_alpha(), ax.get_xlabel(), ax.get_ylabel(), len(ax.lines)))({M02_R}.axes[0])',
              (0.5, 'Hours', 'Score', 0)),
            T('Một nhóm duy nhất', '(lambda f: (' + floats('(p.get_height() for p in f.axes[0].patches)') +
              ', f.axes[0].get_title(), [t.get_text() for t in f.axes[1].get_xticklabels()]))(plot_distribution({"Solo": [1, 2, 3]}, [0, 2, 4]))',
              ([1.0, 2.0], 'All scores (n=3)', ['Solo'])),
        ],
        bad=[('Ẩn outlier', M02_SOLUTION.replace('ax_box.boxplot(list(groups.values()))',
                                                 'ax_box.boxplot(list(groups.values()), showfliers=False)')),
             ('Đếm nhóm thay vì quan sát', M02_SOLUTION.replace('n={len(all_scores)}', 'n={len(groups)}')),
             ('Line nối các cặp quan sát', M02_SOLUTION.replace('ax.scatter(hours, scores, alpha=0.5)', 'ax.plot(hours, scores, alpha=0.5)')),
             ('Bin tự động', M02_SOLUTION.replace('ax_hist.hist(all_scores, bins=edges)', 'ax_hist.hist(all_scores)'))],
    ),

    # ------------------------------------------------------------------ M03
    dict(
        code='M03', title='Subplot và heatmap đọc được', minutes=40,
        goal='Vẽ nhiều heatmap cạnh nhau từ DataFrame: nhãn hàng/cột, colormap sequential, CÙNG thang vmin/vmax và một colorbar có đơn vị.',
        prereq='M02', packages=PD_MPL, env=DA_ENV,
        brief='Viết plot_heatmaps(tables, unit): tables là dict tiêu đề → DataFrame (index = region, columns = sản phẩm/tháng — như kết quả '
              'pivot_table). Tạo fig, axes = plt.subplots(1, len(tables), layout="constrained", squeeze=False). Mỗi bảng một Axes: '
              'ax.imshow(table.to_numpy(), cmap="viridis", vmin=0, vmax=vmax) với vmax là giá trị LỚN NHẤT của MỌI bảng; tick x là tên '
              'cột, tick y là tên hàng; tiêu đề là khoá của dict. Cuối cùng MỘT colorbar cho cả hàng: '
              'fig.colorbar(im, ax=list(axes[0]), label=unit). Return fig.',
        example='plot_heatmaps({"Jan": jan, "Feb": feb}, "Orders") với jan = [[10, 20], [30, 40]], feb = [[5, 15], [25, 60]] '
                '→ 2 heatmap cùng thang 0..60, 1 colorbar "Orders" (fig.axes có 3 Axes).',
        demo=r'''import matplotlib.pyplot as plt
import pandas as pd

table = pd.DataFrame([[10, 20, 15], [30, 40, 35]],
                     index=["North", "South"], columns=["Jan", "Feb", "Mar"])
fig, ax = plt.subplots(layout="constrained")
im = ax.imshow(table.to_numpy(), cmap="viridis", vmin=0, vmax=40)
ax.set_xticks(range(len(table.columns)), table.columns)
ax.set_yticks(range(len(table.index)), table.index)
fig.colorbar(im, ax=ax, label="Orders")

print(table.shape, [float(v) for v in im.get_clim()])
print([t.get_text() for t in ax.get_xticklabels()])
print(len(fig.axes), fig.axes[-1].get_ylabel())
''',
        explain=[
            'Heatmap mã hoá GIÁ TRỊ bằng MÀU. ax.imshow(bảng) vẽ ô hàng i, cột j tại toạ độ (x = j, y = i): cột của bảng nằm ngang, hàng '
            'nằm dọc. Thiếu nhãn thì người đọc chỉ thấy ô màu vô danh: set_xticks(range(số cột), tên cột), set_yticks(range(số hàng), tên hàng).',
            'Colorbar là "thước đo" của màu: fig.colorbar(im, ..., label="Orders") thêm một Axes nhỏ có đơn vị. Không có colorbar thì '
            'không ai biết màu vàng là bao nhiêu.',
            'imshow tự co thang màu theo min/max của TỪNG bảng. Hai heatmap tự co thì cùng một màu có thể là 40 ở bảng này và 60 ở bảng kia '
            '— so màu giữa hai panel là sai. Đặt vmin/vmax giống nhau cho mọi panel rồi dùng MỘT colorbar chung.',
            'Colormap sequential (viridis, Blues…) cho lượng đi một chiều từ thấp tới cao; diverging (coolwarm, RdBu) khi có mốc giữa có nghĩa '
            'như 0 của "thay đổi", với vmin = -m, vmax = m. Rainbow/jet tạo các dải sáng giả, mắt thấy ranh giới không có trong dữ liệu.',
            'plt.subplots(1, k, squeeze=False) luôn trả mảng 2 chiều, kể cả k = 1 — axes[0] là hàng Axes duy nhất, nên một vòng for chạy '
            'đúng cho 1 hay nhiều bảng. Subplot để tách câu hỏi; dùng chung thang (sharey, vmin/vmax) khi người đọc cần so trực tiếp. '
            'Ghi số vào từng ô chỉ hữu ích khi bảng nhỏ.',
        ],
        predict=dict(q='Hai heatmap vẽ bằng imshow KHÔNG đặt vmin/vmax: Jan có giá trị 10..40, Feb có 5..60. Ô 40 của Jan và ô 60 của Feb có màu gì?',
                     options=[
            ('Cùng màu đậm nhất — mỗi panel tự co thang theo max của chính nó', 'Cùng màu nhưng khác giá trị: so màu giữa hai panel bị sai.', True),
            ('Ô 60 sáng hơn ô 40', 'Chỉ đúng khi hai panel dùng chung vmin/vmax.', False),
            ('Matplotlib tự đồng bộ thang giữa các subplot', 'Không — mỗi imshow có thang riêng.', False),
        ]),
        myth=('"Mỗi heatmap tự có colorbar riêng là đủ để so sánh"',
              'Hai colorbar với hai thang khác nhau buộc người đọc tra số từng ô — mắt vẫn so màu và kết luận sai. Muốn so thì chung '
              'vmin/vmax và một colorbar. Và đừng dùng rainbow cho dữ liệu một chiều: dùng sequential như viridis.'),
        mcq=[
            dict(q='Bảng "thay đổi doanh thu so với tháng trước" có cả số âm và dương — colormap nào hợp?', options=[
                ('Diverging (vd. coolwarm) với vmin = -m, vmax = m để 0 nằm giữa', '0 là mốc có nghĩa; hai phía hai màu.', True),
                ('Sequential viridis với thang tự động', 'Không thấy được đâu là tăng, đâu là giảm.', False),
                ('jet để nhiều màu cho dễ phân biệt', 'Rainbow tạo ranh giới giả và không có mốc giữa.', False),
            ]),
            dict(q='ax.imshow(table.to_numpy()) với table 2 hàng × 3 cột — set_xticks cần mấy vị trí?', options=[
                ('3 — số CỘT nằm trên trục x', 'imshow đặt cột theo x, hàng theo y.', True),
                ('2 — số hàng', 'Hàng nằm trên trục y.', False),
                ('6 — số ô', 'Tick đánh dấu cột, không đánh dấu từng ô.', False),
            ]),
            dict(q='Vì sao chỉ cần MỘT colorbar cho cả hàng heatmap trong bài?', options=[
                ('Vì mọi panel dùng chung vmin/vmax nên một thước màu đúng cho tất cả', 'Chung thang mới dùng chung thước được.', True),
                ('Vì Matplotlib chỉ cho một colorbar mỗi Figure', 'Một Figure có thể có nhiều colorbar.', False),
                ('Vì colorbar không quan trọng', 'Thiếu colorbar thì màu không đọc ra số.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao bài tính vmax từ TẤT CẢ bảng và đặt giống nhau cho mọi panel?',
            sample='imshow mặc định co thang màu theo từng bảng, nên cùng một màu có thể là 40 ở panel này và 60 ở panel kia; người đọc so '
                   'màu sẽ kết luận sai. Chốt vmin = 0 và vmax = max của mọi bảng thì cùng màu là cùng giá trị, và một colorbar có đơn vị '
                   'đủ để đọc mọi panel.'),
        scaffold=dict(
            intro='Lắp ba chỗ: vmax chung, thang màu cố định cho mỗi panel, một colorbar có đơn vị.',
            template=r'''import matplotlib.pyplot as plt
import pandas as pd


def plot_heatmaps(tables, unit):
    vmax = {{slot1}}
    fig, axes = plt.subplots(1, len(tables), layout="constrained", squeeze=False)
    for ax, (title, table) in zip(axes[0], tables.items()):
        im = ax.imshow(table.to_numpy(), cmap="viridis", {{slot2}})
        ax.set_xticks(range(len(table.columns)), table.columns)
        ax.set_yticks(range(len(table.index)), table.index)
        ax.set_title(title)
    {{slot3}}
    return fig
''',
            slots=['max(table.to_numpy().max() for table in tables.values())', 'vmin=0, vmax=vmax',
                   'fig.colorbar(im, ax=list(axes[0]), label=unit)'],
            hints=['Giá trị lớn nhất trên TOÀN BỘ các bảng, lấy từ số liệu chứ không từ tiêu đề',
                   'Chốt CẢ HAI đầu thang màu, để các panel so sánh được với nhau',
                   'Một thanh màu duy nhất cho mọi panel, có ghi đơn vị'],
            traps=[('max(tables)', 1, 'max của các KHOÁ (tiêu đề), không phải giá trị trong bảng.'),
                   ('vmin=0', 2, 'Thiếu vmax → mỗi panel tự co thang theo max của nó.'),
                   ('fig.colorbar(im, ax=ax)', 3, 'Colorbar chỉ gắn vào panel cuối và không có đơn vị.')]),
        flow=['max(... for table in tables.values()) → vmax chung',
              'plt.subplots(1, k, squeeze=False) → axes[0] luôn là hàng Axes',
              'ax.imshow(..., vmin=0, vmax=vmax) → mọi panel cùng thang màu',
              'ax.set_xticks(range(n_cột), table.columns) → tên cột trên trục x',
              'fig.colorbar(im, ax=list(axes[0]), label=unit) → một thước màu có đơn vị'],
        transfer='Thử bảng 3 hàng × 2 cột (không vuông) để chắc không đảo hàng/cột; thử dict chỉ một bảng.',
        counter=dict(q='tables gồm 3 bảng → fig.axes có mấy Axes?', options=['4', '3', '6'], correct='4'),
        practice='Tính vmax chung trước vòng lặp; trong vòng: imshow viridis với vmin=0, vmax=vmax, đặt tick cột/hàng, tiêu đề; '
                 'sau vòng: một colorbar cho list(axes[0]).',
        steps=['vmax = max(table.to_numpy().max() for table in tables.values()).',
               'fig, axes = plt.subplots(1, len(tables), layout="constrained", squeeze=False); duyệt zip(axes[0], tables.items()).',
               'Mỗi panel: im = ax.imshow(table.to_numpy(), cmap="viridis", vmin=0, vmax=vmax); tick x = table.columns, tick y = table.index; '
               'ax.set_title(title).',
               'fig.colorbar(im, ax=list(axes[0]), label=unit); return fig.'],
        partial=r'''def plot_heatmaps(tables, unit):
    vmax = max(table.to_numpy().max() for table in tables.values())
    fig, axes = plt.subplots(1, len(tables), layout="constrained", squeeze=False)
    for ax, (title, table) in zip(axes[0], tables.items()):
        im = ax.imshow(table.to_numpy(), cmap="viridis", vmin=0, vmax=vmax)
        ...''',
        io=[('Jan [[10, 20], [30, 40]], Feb [[5, 15], [25, 60]], "Orders"', '2 panel cùng thang 0..60; 1 colorbar "Orders"; 3 Axes'),
            ('Một bảng 1×3, "Units"', '1 panel + colorbar "Units"; tick x đủ 3 cột')],
        contracts=[dict(sig='plot_heatmaps(tables, unit)', does='Vẽ một hàng heatmap có thể so sánh với nhau.',
                        takes='tables: dict tiêu đề → DataFrame số; unit: chuỗi đơn vị',
                        gives='Figure: len(tables) panel + 1 Axes colorbar',
                        effect='Mọi panel clim = (0, max của mọi bảng); cmap viridis; tick là tên cột/hàng.',
                        call='plot_heatmaps({"Q1": df}, "Units").axes[-1].get_ylabel() → "Units"')],
        starter=M03_STARTER,
        solution=M03_SOLUTION,
        tests=[
            T('Hai panel + một colorbar = 3 Axes', f'len({M03_H}.axes)', 3),
            T('Mỗi panel vẽ đúng bảng của nó', f'[ax.images[0].get_array().tolist() for ax in {M03_H}.axes[:2]]',
              [[[10, 20], [30, 40], [5, 0]], [[15, 70], [25, 35], [8, 2]]]),
            T('Mọi panel cùng thang 0..max của MỌI bảng', f'[tuple(float(v) for v in ax.images[0].get_clim()) for ax in {M03_H}.axes[:2]]',
              [(0.0, 70.0), (0.0, 70.0)]),
            T('Tick x = tên cột, tick y = tên hàng (bảng không vuông)',
              f'(lambda ax: ([t.get_text() for t in ax.get_xticklabels()], [t.get_text() for t in ax.get_yticklabels()]))({M03_H}.axes[0])',
              (['Pen', 'Ink'], ['N', 'S', 'E'])),
            T('Tiêu đề panel là khoá của dict', f'[ax.get_title() for ax in {M03_H}.axes[:2]]', ['Jan', 'Feb']),
            T('Colorbar có nhãn đơn vị', f'{M03_H}.axes[-1].get_ylabel()', 'Orders'),
            T('Colormap sequential viridis', f'[ax.images[0].get_cmap().name for ax in {M03_H}.axes[:2]]', ['viridis', 'viridis']),
            T('Một bảng duy nhất', '(lambda f: (len(f.axes), tuple(float(v) for v in f.axes[0].images[0].get_clim()), '
              '[t.get_text() for t in f.axes[0].get_xticklabels()], f.axes[-1].get_ylabel()))'
              '(plot_heatmaps({"Q1": pd.DataFrame([[1, 2, 3]], index=["All"], columns=["a", "b", "c"])}, "Units"))',
              (2, (0.0, 3.0), ['a', 'b', 'c'], 'Units')),
        ],
        bad=[('Mỗi panel tự co thang', M03_SOLUTION.replace('cmap="viridis", vmin=0, vmax=vmax', 'cmap="viridis"')),
             ('Rainbow cho dữ liệu một chiều', M03_SOLUTION.replace('cmap="viridis"', 'cmap="jet"')),
             ('Đảo hàng và cột khi đặt tick', M03_SOLUTION.replace(
                 '        ax.set_xticks(range(len(table.columns)), table.columns)\n        ax.set_yticks(range(len(table.index)), table.index)\n',
                 '        ax.set_xticks(range(len(table.index)), table.index)\n        ax.set_yticks(range(len(table.columns)), table.columns)\n')),
             ('Colorbar chỉ cho panel cuối, không đơn vị', M03_SOLUTION.replace('fig.colorbar(im, ax=list(axes[0]), label=unit)',
                                                                               'fig.colorbar(im, ax=ax)'))],
    ),

    # ------------------------------------------------------------------ M04
    dict(
        code='M04', title='Màu, annotation và kể chuyện dữ liệu', minutes=35,
        goal='Vẽ bar chart từ một Series tổng hợp, nhấn đúng category lớn nhất bằng màu và annotation, giữ baseline 0 và đủ mọi category.',
        prereq='M03', packages=PD_MPL, env=DA_ENV,
        brief='Viết plot_highlight(revenue) với revenue là pandas Series (index = category, giá trị = doanh thu — như kết quả '
              'df.groupby("category")["revenue"].sum()). Vẽ ax.bar(revenue.index, revenue.to_numpy(), color=colors) GIỮ nguyên thứ tự '
              'và đủ mọi category. pos = vị trí cột lớn nhất (int(revenue.to_numpy().argmax())); cột đó màu HIGHLIGHT, các cột khác màu '
              'BASE (hằng cho sẵn). Ghi giá trị cột lớn nhất: ax.annotate(str(value), xy=(pos, value), ha="center", va="bottom"). '
              'Trục y từ 0 tới value * 1.2 để chừa chỗ cho chữ. Tiêu đề nói kết quả: f"{top} has the highest revenue"; nhãn y '
              '"Revenue". Return fig.',
        example='plot_highlight(pd.Series([12, 25, 18], index=["A", "B", "C"])) → B màu HIGHLIGHT, chữ "25" tại (1, 25), '
                'trục y 0..30, tiêu đề "B has the highest revenue".',
        demo=r'''import matplotlib.pyplot as plt
import pandas as pd

orders = pd.Series([20, 35, 15], index=["A", "B", "C"])
pos = int(orders.to_numpy().argmax())
colors = ["#bfc0c0"] * len(orders)
colors[pos] = "#bf4520"

fig, ax = plt.subplots()
ax.bar(orders.index, orders.to_numpy(), color=colors)
ax.annotate(str(orders.iloc[pos]), xy=(pos, orders.iloc[pos]), ha="center", va="bottom")
ax.set_ylim(0, orders.max() * 1.2)
print(orders.index[pos], pos, colors)
print(ax.texts[0].get_text(), [float(v) for v in ax.get_ylim()])
''',
        explain=[
            'Tiêu đề nên nói KẾT QUẢ mà dữ liệu ủng hộ ("B has the highest revenue"), không chỉ tên biến ("Revenue by category"). '
            'Phạm vi, đơn vị, cỡ mẫu đưa vào nhãn trục hoặc dòng phụ.',
            'Nhấn MỘT thứ quan trọng: cột cần chú ý một màu đậm, còn lại xám nhạt — mắt đi thẳng tới đó. color=[...] nhận một màu cho mỗi '
            'cột, theo đúng thứ tự cột.',
            'Giữ màu nhất quán cho cùng nhóm giữa các biểu đồ, và đừng để màu là tín hiệu DUY NHẤT: thêm annotation, tiêu đề, marker hay '
            'linestyle (legend phân biệt Actual/Target bằng nét đứt) để người mù màu hoặc bản in đen trắng vẫn đọc được.',
            'ax.annotate(text, xy=(x, y)) đặt chữ tại một điểm dữ liệu; trục category đặt cột thứ i ở x = i (0, 1, 2…). Chừa chỗ phía trên '
            '(ylim trên = max × 1.2) để chữ không bị cắt hay che dữ liệu.',
            'Bar so CHIỀU DÀI nên baseline phải là 0. set_ylim(28, 42) làm cột 30 trông chỉ bằng 1/6 cột 40 dù thật ra là 3/4 — trục bị cắt '
            'phóng đại chênh lệch. Nếu buộc phải đổi thang thì nói rõ trên hình.',
            'Không bỏ category nhỏ hay điểm "xấu" chỉ để câu chuyện đẹp. Muốn loại dữ liệu thì có chính sách và ghi lại; biểu đồ vẽ đủ những '
            'gì Series có, kèm mức độ không chắc chắn nếu có.',
        ],
        predict=dict(q='Doanh thu A = 30, B = 40, C = 34 vẽ bar với ax.set_ylim(28, 42). Người xem thấy gì?', options=[
            ('Cột B trông gấp khoảng 6 lần cột A, dù thật ra chỉ hơn 1/3', 'Phần nhìn thấy là 40 − 28 = 12 so với 30 − 28 = 2.', True),
            ('Tỷ lệ cột vẫn đúng vì số trên trục y vẫn đúng', 'Mắt so chiều dài cột, ít ai đọc số trên trục.', False),
            ('Matplotlib tự giữ baseline 0', 'set_ylim đã ghi đè giới hạn.', False),
        ]),
        myth=('"Cắt trục y cho chênh lệch rõ hơn thì biểu đồ dễ đọc hơn"',
              'Với bar, người đọc so CHIỀU DÀI cột. Cắt đáy trục làm chênh lệch nhỏ trông khổng lồ — biểu đồ gây hiểu nhầm dù mọi con số '
              'đều đúng. Bar luôn bắt đầu từ 0; muốn soi chênh lệch nhỏ thì vẽ chính chênh lệch đó, hoặc dùng line/dot plot và ghi rõ thang.'),
        mcq=[
            dict(q='Muốn người xem thấy ngay category nổi bật nhất, cách nào tốt nhất?', options=[
                ('Một màu đậm cho cột đó, màu xám cho phần còn lại, kèm annotation giá trị', 'Nhấn một thứ, và không dựa vào màu đơn độc.', True),
                ('Mỗi cột một màu cầu vồng', 'Màu nào cũng nổi thì không gì nổi.', False),
                ('Xoá các category nhỏ cho gọn', 'Bỏ dữ liệu làm câu chuyện sai lệch.', False),
            ]),
            dict(q='Trục category ["A", "B", "C"] — muốn annotate cột "B" thì xy có x bằng bao nhiêu?', options=[
                ('1 — cột thứ i nằm ở x = i, đếm từ 0', 'Category được đặt ở 0, 1, 2…', True),
                ('2 — vì B là chữ thứ hai', 'Vị trí đếm từ 0.', False),
                ('Bằng giá trị của cột B', 'Giá trị là toạ độ y, không phải x.', False),
            ]),
            dict(q='Vẽ Actual và Target trên cùng Axes — cách nào vẫn phân biệt được khi in đen trắng?', options=[
                ('label cho mỗi đường + ax.legend(); Target nét đứt linestyle="--", Actual có marker', 'Nét và marker vẫn còn khi mất màu.', True),
                ('Chỉ đổi màu hai đường', 'Màu đơn độc mất khi in đen trắng hoặc với người mù màu.', False),
                ('Ghi số lên mọi điểm', 'Chữ dày đặc che dữ liệu; legend và kiểu nét là đủ.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao plot_highlight đặt ylim dưới = 0 và vẽ đủ mọi category, dù cắt trục hay bỏ category nhỏ làm hình "ấn tượng" hơn?',
            sample='Người đọc bar so chiều dài cột; baseline khác 0 phóng đại chênh lệch nên hình nói sai dù số đúng. Bỏ category nhỏ là '
                   'chọn dữ liệu cho hợp câu chuyện. Nhấn cột lớn nhất bằng màu + annotation + tiêu đề nói kết quả là đủ để kể chuyện '
                   'mà không bóp méo dữ liệu.'),
        scaffold=dict(
            intro='Lắp ba chỗ: tìm vị trí cột lớn nhất, đặt annotation đúng toạ độ, giữ baseline 0.',
            template=r'''import matplotlib.pyplot as plt
import pandas as pd

HIGHLIGHT = "#bf4520"
BASE = "#bfc0c0"


def plot_highlight(revenue):
    pos = {{slot1}}
    top, value = revenue.index[pos], revenue.iloc[pos]
    colors = [BASE] * len(revenue)
    colors[pos] = HIGHLIGHT

    fig, ax = plt.subplots()
    ax.bar(revenue.index, revenue.to_numpy(), color=colors)
    ax.annotate(str(value), {{slot2}}, ha="center", va="bottom")
    {{slot3}}
    ax.set(title=f"{top} has the highest revenue", ylabel="Revenue")
    return fig
''',
            slots=['int(revenue.to_numpy().argmax())', 'xy=(pos, value)', 'ax.set_ylim(0, value * 1.2)'],
            hints=['Vị trí cột LỚN nhất, tính từ dữ liệu chứ không viết cứng',
                   'Toạ độ chú thích: x là vị trí cột, y là giá trị',
                   'Giữ đáy trục ở 0, chừa chỗ trên cho chú thích'],
            traps=[('1', 1, 'Viết cứng vị trí cột B của ví dụ — dữ liệu khác sẽ nhấn sai cột.'),
                   ('xy=(value, pos)', 2, 'Đảo x và y: x là vị trí cột, y là giá trị.'),
                   ('ax.set_ylim(revenue.min() * 0.9, value * 1.2)', 3, 'Cắt đáy trục — phóng đại chênh lệch giữa các cột.'),
                   ('int(revenue.to_numpy().argmin())', 1, 'argmin là cột NHỎ nhất.')]),
        flow=['revenue.to_numpy().argmax() → vị trí cột lớn nhất',
              'colors[pos] = HIGHLIGHT → chỉ một cột đậm, còn lại BASE',
              'ax.annotate(str(value), xy=(pos, value)) → số ngay trên cột',
              'ax.set_ylim(0, value * 1.2) → baseline 0, chừa chỗ cho chữ',
              'title=f"{top} has the highest revenue" → tiêu đề nói kết quả'],
        transfer='Thử Series 4 category mà cột lớn nhất nằm cuối; kiểm màu, annotation và ylim theo dữ liệu mới, không theo ví dụ.',
        counter=dict(q='revenue = Series([12, 25, 18], index=["A", "B", "C"]) → giới hạn trục y là?',
                     options=['(0, 30)', '(12, 30)', '(0, 25)'], correct='(0, 30)'),
        practice='Tính pos bằng argmax trên dữ liệu (không viết cứng); colors theo pos; annotate tại (pos, value); ylim (0, value * 1.2).',
        steps=['pos = int(revenue.to_numpy().argmax()); top, value = revenue.index[pos], revenue.iloc[pos].',
               'colors = [BASE] * len(revenue); colors[pos] = HIGHLIGHT; ax.bar(revenue.index, revenue.to_numpy(), color=colors).',
               'ax.annotate(str(value), xy=(pos, value), ha="center", va="bottom"); ax.set_ylim(0, value * 1.2).',
               'ax.set(title=f"{top} has the highest revenue", ylabel="Revenue"); return fig.'],
        partial=r'''def plot_highlight(revenue):
    pos = int(revenue.to_numpy().argmax())
    top, value = revenue.index[pos], revenue.iloc[pos]
    colors = [BASE] * len(revenue)
    colors[pos] = HIGHLIGHT
    ...''',
        io=[('Series([12, 25, 18], index=["A", "B", "C"])', 'B đậm; chữ "25" tại (1, 25); trục y 0..30; "B has the highest revenue"'),
            ('Series([50, 20, 5], index=["X", "Y", "Z"])', 'X đậm (cột đầu); chữ "50" tại (0, 50); đủ 3 cột')],
        contracts=[dict(sig='plot_highlight(revenue)', does='Kể chuyện "category nào cao nhất" mà không bóp méo dữ liệu.',
                        takes='revenue: pandas Series số dương, index = tên category',
                        gives='Figure 1 Axes, đủ len(revenue) cột theo thứ tự Series',
                        effect='Một cột HIGHLIGHT; một annotation tại (pos, value); ylim (0, value * 1.2).',
                        call='plot_highlight(pd.Series([1, 3], index=["a", "b"])).axes[0].get_title() → "b has the highest revenue"')],
        starter=M04_STARTER,
        solution=M04_SOLUTION,
        tests=[
            T('Đủ 4 cột, đúng thứ tự Series', floats(f'(p.get_height() for p in {M04_R}.axes[0].patches)'), [18.0, 9.0, 31.0, 22.0]),
            T('Chỉ cột lớn nhất (Bag) có màu HIGHLIGHT', f'[{TO_HEX}(p.get_facecolor()) for p in {M04_R}.axes[0].patches]',
              ['#bfc0c0', '#bfc0c0', '#bf4520', '#bfc0c0']),
            T('Annotation ghi giá trị tại cột lớn nhất', f'[(t.get_text(), tuple(float(v) for v in t.xy)) for t in {M04_R}.axes[0].texts]',
              [('31', (2.0, 31.0))]),
            T('Baseline 0, chừa chỗ phía trên', f'tuple(round(float(v), 6) for v in {M04_R}.axes[0].get_ylim())', (0.0, 37.2)),
            T('Tiêu đề nói kết quả; nhãn y', f'(lambda ax: (ax.get_title(), ax.get_ylabel()))({M04_R}.axes[0])',
              ('Bag has the highest revenue', 'Revenue')),
            T('Cột lớn nhất đứng đầu Series',
              f'(lambda ax: ([{TO_HEX}(p.get_facecolor()) for p in ax.patches], [(t.get_text(), tuple(float(v) for v in t.xy)) for t in ax.texts]))'
              '(plot_highlight(pd.Series([50, 20, 5], index=["X", "Y", "Z"])).axes[0])',
              (['#bf4520', '#bfc0c0', '#bfc0c0'], [('50', (0.0, 50.0))])),
            T('Một category duy nhất', '(lambda ax: (' + floats('(p.get_height() for p in ax.patches)') +
              ', ax.get_title(), tuple(round(float(v), 6) for v in ax.get_ylim())))(plot_highlight(pd.Series([7], index=["Only"])).axes[0])',
              ([7.0], 'Only has the highest revenue', (0.0, 8.4))),
        ],
        bad=[('Cắt đáy trục y', M04_SOLUTION.replace('ax.set_ylim(0, value * 1.2)', 'ax.set_ylim(revenue.min() * 0.9, value * 1.2)')),
             ('Viết cứng vị trí của ví dụ', M04_SOLUTION.replace('pos = int(revenue.to_numpy().argmax())', 'pos = 1')),
             ('Bỏ category nhỏ nhất cho đẹp', M04_SOLUTION.replace('def plot_highlight(revenue):\n',
                                                                    'def plot_highlight(revenue):\n    revenue = revenue[revenue > revenue.min()]\n')),
             ('Đảo x và y của annotation', M04_SOLUTION.replace('xy=(pos, value)', 'xy=(value, pos)'))],
    ),

    # ------------------------------------------------------------------ M05
    dict(
        code='M05', title='Ticks, scale và ngày trên trục', minutes=40,
        goal='Sắp thời gian trước khi vẽ line, định dạng trục ngày và trục phần trăm đúng thang, dùng trục log có kiểm tra giá trị dương.',
        prereq='M04', packages=PD_MPL, env=DA_ENV,
        brief='Viết hai hàm trả về Figure. (1) plot_rate(df): df có cột "date" (chuỗi "YYYY-MM-DD", CHƯA sắp) và "rate" (tỷ lệ 0..1). '
              'Chuyển date bằng pd.to_datetime, sắp theo ngày, vẽ line marker "o"; trục y dùng PercentFormatter(xmax=1) và ylim 0..1; '
              'trục x dùng mdates.DateFormatter("%d/%m"); nhãn y "Conversion rate". (2) plot_log_sizes(names, sizes): bar với trục y log '
              '(ax.set_yscale("log")), nhãn y "Users (log scale)" để người đọc biết khoảng cách đã đổi nghĩa; nếu có size <= 0 thì '
              'raise ValueError TRƯỚC khi tạo figure.',
        example='plot_rate với ngày 03/01, 01/01, 02/01 và rate 0.5, 0.25, 0.4 → đường đi qua 0.25, 0.4, 0.5 theo ngày; trục y ghi 0%, 20%, …, 100%. '
                'plot_log_sizes(["A", "B"], [10, 0]) → ValueError.',
        demo=r'''import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd
from matplotlib.ticker import PercentFormatter

df = pd.DataFrame({"date": ["2026-01-03", "2026-01-01", "2026-01-02"],
                   "rate": [0.3, 0.1, 0.2]})
df["date"] = pd.to_datetime(df["date"])
df = df.sort_values("date")

fig, ax = plt.subplots()
ax.plot(df["date"], df["rate"], marker="o")
ax.yaxis.set_major_formatter(PercentFormatter(xmax=1))
ax.xaxis.set_major_formatter(mdates.DateFormatter("%d/%m"))
ax.set_ylim(0, 1)

print(df["rate"].tolist())
print(ax.yaxis.get_major_formatter()(0.3))
print(ax.xaxis.get_major_formatter()(mdates.date2num(df["date"].iloc[0])))
''',
        explain=[
            'Line nối điểm theo THỨ TỰ HÀNG trong dữ liệu, không theo thứ tự ngày. Dữ liệu chưa sắp thì đường đi tới, lùi, rồi tới — một '
            'hình zig-zag giả. Chuyển cột ngày bằng pd.to_datetime rồi sort_values("date") trước khi vẽ (chuỗi kiểu "2026-1-10" so theo '
            'chữ còn đứng trước "2026-1-9").',
            'Formatter đổi CÁCH VIẾT nhãn, không đổi dữ liệu. PercentFormatter(xmax=1) hiểu 1.0 là 100%: 0.25 → "25%". Để mặc định '
            'xmax=100 thì 0.25 thành "0.25%" — sai 100 lần mà không có lỗi nào. Tỷ lệ 0..1 và số phần trăm 0..100 là hai thứ khác nhau.',
            'FuncFormatter(lambda x, pos: f"{x/1000:g}k") cho nhãn tự chọn (1000 → "1k"); DateFormatter("%d/%m") viết ngày gọn, '
            'fig.autofmt_xdate() xoay nhãn ngày để không chồng. Tick label phải đi cùng vị trí tick — đổi nhãn bằng set_xticklabels mà '
            'không đặt vị trí là gán chữ cho sai chỗ.',
            'Trục log (ax.set_yscale("log")) hợp với dải rất rộng (120 và 300 000): mỗi nấc là GẤP 10, không phải cộng thêm một khoảng '
            'bằng nhau — nên phải nói ra trên nhãn trục. log không định nghĩa cho 0 và số âm: Matplotlib lặng lẽ bỏ các cột đó khỏi hình, '
            'vì vậy hàm phải tự kiểm và raise ValueError.',
            'Giới hạn trục phải giữ dữ liệu cần thấy: ylim(0, 1) cho tỷ lệ giữ cả mốc 0% và 100%. Trước khi xuất, đọc lại nhãn và thử '
            'diễn giải hình như người xem.',
        ],
        predict=dict(q='Đã pd.to_datetime nhưng QUÊN sort: ngày 03/01, 01/01, 02/01 với rate 0.5, 0.25, 0.4. Đường line nối các điểm theo thứ tự nào?',
                     options=[
            ('03/01 → 01/01 → 02/01: đi lùi rồi tới, thành hình zig-zag giả', 'Line nối theo thứ tự hàng trong DataFrame.', True),
            ('01/01 → 02/01 → 03/01 vì trục ngày tự sắp', 'Điểm nằm đúng vị trí ngày, nhưng đường nối theo thứ tự hàng.', False),
            ('Báo lỗi vì ngày chưa sắp', 'Không có lỗi — chính vì im lặng nên dễ sót.', False),
        ]),
        myth=('"PercentFormatter() mặc định là đủ cho mọi dữ liệu phần trăm"',
              'Mặc định xmax=100: nó coi 100 là 100%. Dữ liệu tỷ lệ 0..1 (0.25) sẽ hiện "0.25%". Với tỷ lệ phải ghi PercentFormatter(xmax=1). '
              'Formatter chỉ đổi chữ trên trục; nhầm xmax là sai thông điệp 100 lần mà không có lỗi nào báo.'),
        mcq=[
            dict(q='Số người dùng 5 cửa hàng: 120, 900, 4 000, 45 000, 300 000. Vẽ bar trục y tuyến tính thì…', options=[
                ('Mấy cửa hàng nhỏ gần như không thấy — cân nhắc trục log và ghi rõ "(log scale)"', 'Dải quá rộng; log cho thấy cấp độ lớn.', True),
                ('Ổn, bar luôn dùng trục tuyến tính', 'Có thể, nhưng mất thông tin về các cửa hàng nhỏ.', False),
                ('Dùng trục log, không cần ghi gì', 'Log đổi nghĩa khoảng cách — phải nói rõ.', False),
            ]),
            dict(q='ax.set_yscale("log") với một cột có giá trị 0 thì…', options=[
                ('Cột đó biến mất khỏi hình mà không báo lỗi', 'log(0) không xác định; Matplotlib che giá trị không dương.', True),
                ('Cột cao 0 như bình thường', 'Trên trục log không có vị trí cho 0.', False),
                ('Python báo ZeroDivisionError', 'Không có lỗi nào — vì vậy hàm phải tự kiểm.', False),
            ]),
            dict(q='Vì sao chuyển cột ngày dạng chuỗi bằng pd.to_datetime trước khi sort và vẽ?', options=[
                ('Chuỗi so theo từng ký tự; ngày thật so theo thời gian và giữ đúng khoảng cách trên trục', 'Với "2026-1-9" và "2026-1-10", sắp chuỗi cho thứ tự sai.', True),
                ('Matplotlib không vẽ được chuỗi', 'Vẽ được — nhưng thành category, mất khoảng cách thời gian.', False),
                ('Để chạy nhanh hơn', 'Lý do là đúng thứ tự và đúng khoảng cách.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao plot_log_sizes kiểm size <= 0 và raise ValueError thay vì cứ vẽ?',
            sample='Trên trục log không có vị trí cho 0 hay số âm; Matplotlib lặng lẽ không vẽ các cột đó và không báo lỗi, nên người đọc '
                   'tưởng dữ liệu chỉ có những cột còn lại. Raise ValueError trước khi tạo figure buộc nơi gọi xử lý dữ liệu không dương '
                   'một cách có chủ đích.'),
        scaffold=dict(
            intro='Lắp ba chỗ: sắp theo thời gian, formatter phần trăm đúng thang, điều kiện chặn trục log.',
            template=r'''import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd
from matplotlib.ticker import PercentFormatter


def plot_rate(df):
    data = df.assign(date=pd.to_datetime(df["date"]))
    data = {{slot1}}
    fig, ax = plt.subplots()
    ax.plot(data["date"], data["rate"], marker="o")
    {{slot2}}
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d/%m"))
    ax.set_ylim(0, 1)
    ax.set_ylabel("Conversion rate")
    return fig


def plot_log_sizes(names, sizes):
    if {{slot3}}:
        raise ValueError("log scale needs positive sizes")
    fig, ax = plt.subplots()
    ax.bar(names, sizes)
    ax.set_yscale("log")
    ax.set_ylabel("Users (log scale)")
    return fig
''',
            slots=['data.sort_values("date")', 'ax.yaxis.set_major_formatter(PercentFormatter(xmax=1))', 'any(size <= 0 for size in sizes)'],
            hints=['Sắp theo thời gian trước khi vẽ, không theo giá trị',
                   'Formatter phần trăm cho trục y, khai rằng 1 là 100 phần trăm',
                   'Điều kiện chặn vì trục log không nhận giá trị không dương'],
            traps=[('data.sort_values("rate")', 1, 'Sắp theo giá trị — đường không còn đi theo thời gian.'),
                   ('ax.yaxis.set_major_formatter(PercentFormatter())', 2, 'xmax mặc định 100: 0.25 hiện thành 0.25%.'),
                   ('all(size <= 0 for size in sizes)', 3, 'Chỉ chặn khi MỌI giá trị không dương; một số 0 vẫn lọt.')]),
        flow=['pd.to_datetime(df["date"]) → chuỗi thành Timestamp',
              'data.sort_values("date") → hàng theo thứ tự thời gian',
              'PercentFormatter(xmax=1) → 0.25 hiện "25%"',
              'DateFormatter("%d/%m") → nhãn ngày gọn',
              'any(size <= 0 ...) → ValueError trước khi vẽ log'],
        transfer='Thử 4 ngày xáo trộn vắt qua tháng 2 và một bộ sizes có số âm; đoán trước nhãn và lỗi rồi mới chạy.',
        counter=dict(q='Với PercentFormatter(xmax=1) trên trục 0..1, giá trị 0.05 hiện là?', options=['5%', '0.05%', '50%'], correct='5%'),
        practice='plot_rate: chuyển ngày → sort → vẽ → formatter % (xmax=1) và formatter ngày → ylim → nhãn. '
                 'plot_log_sizes: kiểm any(size <= 0) TRƯỚC khi tạo figure.',
        steps=['data = df.assign(date=pd.to_datetime(df["date"])).sort_values("date") — không sửa df của nơi gọi.',
               'ax.plot(data["date"], data["rate"], marker="o"); ax.yaxis.set_major_formatter(PercentFormatter(xmax=1)).',
               'ax.xaxis.set_major_formatter(mdates.DateFormatter("%d/%m")); ax.set_ylim(0, 1); ax.set_ylabel("Conversion rate").',
               'plot_log_sizes: if any(size <= 0 for size in sizes): raise ValueError(...); rồi bar, set_yscale("log"), nhãn "Users (log scale)".'],
        partial=r'''def plot_rate(df):
    data = df.assign(date=pd.to_datetime(df["date"]))
    data = data.sort_values("date")
    fig, ax = plt.subplots()
    ...''',
        io=[('date 03/01, 01/01, 02/01; rate 0.5, 0.25, 0.4', 'line qua 0.25, 0.4, 0.5; trục y ghi 0%, 20%, …, 100%; nhãn x dạng 01/01'),
            ('plot_log_sizes(["A", "B"], [10, 0])', 'ValueError, chưa tạo figure')],
        contracts=[
            dict(sig='plot_rate(df)', does='Vẽ tỷ lệ chuyển đổi theo ngày.',
                 takes='df: DataFrame cột "date" (chuỗi YYYY-MM-DD) và "rate" (0..1)', gives='Figure 1 Axes',
                 effect='Line theo thứ tự ngày; trục y PercentFormatter(xmax=1), 0..1; trục x DateFormatter("%d/%m").',
                 call='formatter trục y (0.25) → "25%"'),
            dict(sig='plot_log_sizes(names, sizes)', does='So các cỡ chênh nhau nhiều bậc.',
                 takes='names: list tên; sizes: list số DƯƠNG', gives='Figure 1 Axes, trục y log',
                 effect='size <= 0 → ValueError trước khi tạo figure; nhãn y có chữ "log".',
                 call='plot_log_sizes(["A"], [0]) → ValueError'),
        ],
        starter=M05_STARTER,
        solution=M05_SOLUTION,
        tests=[
            T('Đường đi theo thứ tự ngày', floats(f'{M05_F}.axes[0].lines[0].get_ydata()'), [0.2, 0.3, 0.45, 0.6]),
            T('Trục x tăng dần theo thời gian', f'[str(v)[:10] for v in {M05_F}.axes[0].lines[0].get_xdata()]',
              ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']),
            T('Trục y là phần trăm của tỷ lệ 0..1', f'[{M05_F}.axes[0].yaxis.get_major_formatter()(v) for v in (0.25, 0.05, 1)]',
              ['25%', '5%', '100%']),
            T('ylim 0..1 và nhãn y', f'(lambda ax: (tuple(float(v) for v in ax.get_ylim()), ax.get_ylabel()))({M05_F}.axes[0])',
              ((0.0, 1.0), 'Conversion rate')),
            T('Nhãn ngày dạng ngày/tháng', f'{M05_F}.axes[0].xaxis.get_major_formatter()({DATE2NUM}(pd.Timestamp("2026-01-31")))', '31/01'),
            T('Trục log có ghi chú "log" trên nhãn', f'(lambda ax: (ax.get_yscale(), "log" in ax.get_ylabel().lower()))({M05_L}.axes[0])',
              ('log', True)),
            T('Trục log: cột đúng dữ liệu', floats(f'(p.get_height() for p in {M05_L}.axes[0].patches)'), [120.0, 4000.0, 300000.0]),
            T('Có giá trị 0 → ValueError, chưa tạo figure',
              OPEN_DELTA.format(call='_studio.call(plot_log_sizes, ["A", "B"], [10, 0]).error', pick=''), ('ValueError', 0)),
            T('Số âm → ValueError', '_studio.call(plot_log_sizes, ["A"], [-5]).error', 'ValueError'),
        ],
        bad=[('Quên sort theo ngày', M05_SOLUTION.replace('    data = data.sort_values("date")\n', '')),
             ('PercentFormatter mặc định xmax=100', M05_SOLUTION.replace('PercentFormatter(xmax=1))', 'PercentFormatter())')),
             ('Không kiểm giá trị không dương', M05_SOLUTION.replace(
                 '    if any(size <= 0 for size in sizes):\n        raise ValueError("log scale needs positive sizes")\n', '')),
             ('Trục log không nói ra', M05_SOLUTION.replace('ax.set_ylabel("Users (log scale)")', 'ax.set_ylabel("Users")'))],
    ),

    # ------------------------------------------------------------------ M06
    dict(
        code='M06', title='Layout, xuất hình và kiểm tra chất lượng', minutes=40,
        goal='Dựng figure đúng kích thước inch với layout constrained, xuất hàng loạt PNG đúng số pixel và đóng mọi figure sau khi lưu.',
        prereq='M05', packages=MPL, env=DA_ENV,
        brief='Viết hai hàm. (1) make_chart(title, values): fig, ax = plt.subplots(figsize=(6, 3), layout="constrained"); line marker "o" '
              'của values theo ngày 1, 2, …, len(values); tiêu đề title, nhãn "Day" / "Revenue"; return fig. (2) export_all(charts, dpi): '
              'charts là dict tiêu đề → list giá trị. Với từng mục: fig = make_chart(...), lưu fig vào io.BytesIO dạng PNG với dpi cho '
              'sẵn (KHÔNG dùng bbox_inches="tight" — đề cần ảnh đúng 6·dpi × 3·dpi pixel), rồi plt.close(fig). Trả dict tiêu đề → bytes '
              'PNG. Sau export_all, số figure đang mở không đổi.',
        example='make_chart("Week 1", [10, 20, 15]) → figure 6×3 inch, layout constrained. '
                'export_all({"Week 1": [10, 20, 15]}, 150) → {"Week 1": bytes PNG 900×450}, không figure nào còn mở.',
        demo=r'''import matplotlib.pyplot as plt
from io import BytesIO, StringIO

fig, ax = plt.subplots(figsize=(4, 2), layout="constrained")
ax.bar(["A", "B"], [3, 4])
ax.set_title("Orders")

png = BytesIO()
fig.savefig(png, format="png", dpi=100)
data = png.getvalue()
print(int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big"))

svg = StringIO()
fig.savefig(svg, format="svg")
print("<svg" in svg.getvalue())

before = len(plt.get_fignums())
plt.close(fig)
print(before, len(plt.get_fignums()))
''',
        explain=[
            'figsize tính bằng INCH, dpi là số điểm ảnh mỗi inch: PNG 6×3 inch ở dpi 150 có 900×450 pixel. Tăng dpi làm ảnh mịn hơn khi '
            'in hay phóng to nhưng KHÔNG thêm chi tiết dữ liệu nào.',
            'layout="constrained" (đặt khi tạo figure) tự dàn lề để tiêu đề, nhãn trục, colorbar không chồng nhau. tight_layout() là cách '
            'cũ, chạy một lần mỗi khi gọi; chọn một trong hai, đừng dùng cả hai trên cùng figure.',
            'PNG là ảnh raster (điểm ảnh) — hợp cho web, slide. SVG/PDF là vector — phóng to không vỡ, hợp cho báo cáo in. savefig đoán '
            'kiểu ảnh từ đuôi tên file ("chart.svg"); ghi vào BytesIO/StringIO thì phải nói rõ format="png"/"svg". bbox_inches="tight" '
            'cắt/thêm lề theo nội dung nên kích thước ảnh ra KHÁC figsize × dpi.',
            'Kiểm FILE ĐÃ LƯU, không chỉ cửa sổ trên màn hình: đọc lại bytes (chữ ký PNG, rộng/cao ở byte 16–24) hoặc mở file ra xem. '
            'Chốt font, màu, nền, đơn vị trước khi xuất hàng loạt.',
            'Thứ tự đúng: vẽ → savefig → close. Vòng lặp xuất 100 biểu đồ mà không plt.close(fig) giữ 100 figure trong bộ nhớ '
            '(Matplotlib cảnh báo khi quá 20). Script cần hiển thị thì gọi plt.show() ở CUỐI, sau khi đã lưu.',
        ],
        predict=dict(q='Figure figsize=(6, 3) lưu PNG với dpi=150 (không bbox_inches) — ảnh bao nhiêu pixel?', options=[
            ('900 × 450', '6 × 150 và 3 × 150.', True),
            ('6 × 3', 'figsize tính bằng inch, không phải pixel.', False),
            ('600 × 300', 'Đó là dpi=100.', False),
            ('Tuỳ nội dung hình', 'Chỉ khi có bbox_inches="tight" kích thước mới phụ thuộc nội dung.', False),
        ]),
        myth=('"Tăng dpi là biểu đồ có nhiều thông tin hơn"',
              'dpi chỉ là số điểm ảnh mỗi inch: cùng đường, cùng nhãn, chỉ mịn hơn và file nặng hơn. Muốn biểu đồ nói nhiều hơn phải đổi dữ '
              'liệu hoặc cách trình bày. Và bbox_inches="tight" đổi kích thước canvas — đề cần đúng kích thước thì đừng dùng.'),
        mcq=[
            dict(q='Báo cáo in A4, người đọc sẽ phóng to biểu đồ. Nên xuất kiểu nào?', options=[
                ('SVG hoặc PDF (vector)', 'Vector phóng to không vỡ.', True),
                ('PNG dpi=72', 'Raster dpi thấp sẽ vỡ hạt khi phóng to.', False),
                ('Chụp màn hình cửa sổ plt.show()', 'Kích thước phụ thuộc màn hình, không lặp lại được.', False),
            ]),
            dict(q='Vòng lặp xuất 200 biểu đồ, mỗi vòng plt.subplots() + savefig nhưng không close. Chuyện gì xảy ra?', options=[
                ('200 figure vẫn mở, chiếm bộ nhớ; Matplotlib cảnh báo khi quá 20 figure', 'Batch phải plt.close(fig) sau mỗi lần lưu.', True),
                ('savefig tự đóng figure', 'savefig không đóng gì cả.', False),
                ('Figure cũ tự bị ghi đè', 'Mỗi plt.subplots() tạo một figure mới.', False),
            ]),
            dict(q='fig.savefig(buf, dpi=50, bbox_inches="tight") với figure 6×3 inch cho ảnh…', options=[
                ('Gần nhưng không đúng 300×150 — kích thước theo vùng nội dung', 'tight cắt/thêm lề nên canvas xuất thay đổi.', True),
                ('Đúng 300×150', 'Chỉ đúng khi không có bbox_inches="tight".', False),
                ('Lỗi vì thiếu layout', 'Không có lỗi nào.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao export_all phải gọi plt.close(fig) sau khi lưu, và vì sao gọi SAU savefig chứ không trước?',
            sample='Mỗi make_chart tạo một figure mới mà pyplot giữ lại tới khi close; xuất hàng loạt không close thì figure dồn lại, tốn '
                   'bộ nhớ. Close trước rồi plt.savefig thì không còn figure đó: pyplot tạo figure trống mới, ảnh ra trắng, sai kích '
                   'thước và lại thêm một figure mở. Đúng thứ tự: fig.savefig → plt.close(fig).'),
        scaffold=dict(
            intro='Lắp ba chỗ: kích thước + layout của figure, lưu PNG đúng dpi, đóng figure trong vòng lặp.',
            template=r'''import matplotlib.pyplot as plt
from io import BytesIO


def make_chart(title, values):
    fig, ax = {{slot1}}
    ax.plot(range(1, len(values) + 1), values, marker="o")
    ax.set(title=title, xlabel="Day", ylabel="Revenue")
    return fig


def export_all(charts, dpi):
    result = {}
    for title, values in charts.items():
        fig = make_chart(title, values)
        buf = BytesIO()
        {{slot2}}
        {{slot3}}
        result[title] = buf.getvalue()
    return result
''',
            slots=['plt.subplots(figsize=(6, 3), layout="constrained")', 'fig.savefig(buf, format="png", dpi=dpi)', 'plt.close(fig)'],
            hints=['Tạo Figure cỡ 6×3 inch và bật dàn khoảng tự động',
                   'Lưu vào bộ đệm đúng dpi, và KHÔNG cắt theo nội dung',
                   'Đóng figure sau mỗi lượt, đừng mở cửa sổ'],
            traps=[('plt.subplots(figsize=(600, 300))', 1, 'figsize tính bằng inch, không phải pixel.'),
                   ('fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight")', 2, 'Cắt theo nội dung → không đúng 6·dpi × 3·dpi.'),
                   ('fig.clf()', 3, 'Xoá nội dung nhưng figure vẫn mở.'),
                   ('plt.show()', 3, 'Không đóng figure; trên máy còn chặn vòng lặp tới khi tắt cửa sổ.')]),
        flow=['plt.subplots(figsize=(6, 3), layout="constrained") → 6×3 inch',
              'fig.savefig(buf, format="png", dpi=dpi) → PNG 6·dpi × 3·dpi',
              'plt.close(fig) → figure đóng ngay sau khi lưu',
              'result[title] = buf.getvalue() → bytes để kiểm hoặc ghi file'],
        transfer='Xuất 3 biểu đồ ở dpi 100 rồi dpi 40; kiểm kích thước từng PNG và số figure đang mở trước/sau.',
        counter=dict(q='export_all({"A": [1, 2]}, 40) — ảnh "A" bao nhiêu pixel?', options=['240 × 120', '6 × 3', '600 × 300'],
                     correct='240 × 120'),
        practice='make_chart chốt figsize (inch) và layout ngay khi tạo; export_all theo đúng thứ tự make_chart → savefig → close cho từng mục.',
        steps=['make_chart: fig, ax = plt.subplots(figsize=(6, 3), layout="constrained"); ax.plot(range(1, len(values) + 1), values, marker="o").',
               'ax.set(title=title, xlabel="Day", ylabel="Revenue"); return fig.',
               'export_all: result = {}; với mỗi (title, values): fig = make_chart(...); buf = BytesIO(); fig.savefig(buf, format="png", dpi=dpi).',
               'plt.close(fig) ngay sau savefig; result[title] = buf.getvalue(); cuối cùng return result.'],
        partial=r'''def export_all(charts, dpi):
    result = {}
    for title, values in charts.items():
        fig = make_chart(title, values)
        buf = BytesIO()
        ...''',
        io=[('make_chart("Week 1", [10, 20, 15])', 'figure 6×3 inch, layout constrained; line qua 10, 20, 15'),
            ('export_all({"Week 1": [10, 20, 15]}, 150)', '{"Week 1": PNG 900×450}; không figure nào còn mở')],
        contracts=[
            dict(sig='make_chart(title, values)', does='Dựng một biểu đồ doanh thu khổ cố định.',
                 takes='title: chuỗi; values: list số', gives='Figure 6×3 inch, layout constrained',
                 effect='Line marker "o" theo ngày 1..n; nhãn Day / Revenue.',
                 call='make_chart("W", [1, 2]).get_size_inches().tolist() → [6.0, 3.0]'),
            dict(sig='export_all(charts, dpi)', does='Xuất hàng loạt biểu đồ ra PNG trong bộ nhớ.',
                 takes='charts: dict tiêu đề → list số; dpi: int', gives='dict tiêu đề → bytes PNG (6·dpi × 3·dpi)',
                 effect='Đóng mọi figure đã tạo; số figure mở trước/sau như nhau.',
                 call='export_all({"A": [1, 2]}, 40)["A"] → PNG 240×120'),
        ],
        starter=M06_STARTER,
        solution=M06_SOLUTION,
        tests=[
            T('make_chart: figure 6×3 inch', 'make_chart("W", [1, 2, 3]).get_size_inches().tolist()', [6.0, 3.0]),
            T('make_chart: layout constrained', 'type(make_chart("W", [1, 2, 3]).get_layout_engine()).__name__', 'ConstrainedLayoutEngine'),
            T('make_chart: dữ liệu theo ngày, tiêu đề, nhãn',
              '(lambda ax: (' + floats('ax.lines[0].get_xdata()') + ', ' + floats('ax.lines[0].get_ydata()') +
              ', ax.get_title(), ax.get_xlabel(), ax.get_ylabel()))(make_chart("Week 2", [8, 3, 5, 9]).axes[0])',
              ([1.0, 2.0, 3.0, 4.0], [8.0, 3.0, 5.0, 9.0], 'Week 2', 'Day', 'Revenue')),
            # Mỗi lần savefig có layout constrained tốn ~0.25 s trên CPython (Pyodide chậm hơn vài lần, giới hạn 5 s),
            # nên cả bài chỉ xuất 3 ảnh: gộp kiểm khoá + chữ ký + kích thước vào một ca.
            T('export_all: đủ khoá, mỗi giá trị là PNG 6·dpi × 3·dpi (dpi 20)',
              '{k: (v[:8], ' + png_size('v') + ') for k, v in export_all({"A": [1, 2], "B": [3, 1, 2]}, 20).items()}',
              {'A': (PNG_SIG, (120, 60)), 'B': (PNG_SIG, (120, 60))}),
            # plt.close("all") trước: pyplot trống như một script mới chạy. Không có bước này, bản "close rồi
            # plt.savefig" lưu nhầm một figure 6×3 còn mở từ ca trước nên vẫn ra đúng kích thước.
            T('Pyplot trống: dpi 50 → PNG 300×150 và không figure nào còn mở',
              '(plt.close("all"), ' + png_size('export_all({"Q": [5, 1, 4]}, 50)["Q"]') + ', len(plt.get_fignums()))[1:]',
              ((300, 150), 0)),
            T('Dict rỗng → {} và không tạo figure', OPEN_DELTA.format(call='export_all({}, 50)', pick=''), ({}, 0)),
        ],
        bad=[('bbox_inches="tight" đổi kích thước', M06_SOLUTION.replace('fig.savefig(buf, format="png", dpi=dpi)',
                                                                          'fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight")')),
             ('Quên close trong vòng lặp', M06_SOLUTION.replace('        plt.close(fig)\n', '')),
             ('Đóng trước rồi plt.savefig', M06_SOLUTION.replace(
                 '        fig.savefig(buf, format="png", dpi=dpi)\n        plt.close(fig)\n',
                 '        plt.close(fig)\n        plt.savefig(buf, format="png", dpi=dpi)\n')),
             ('clf thay cho close', M06_SOLUTION.replace('        plt.close(fig)\n', '        fig.clf()\n'))],
    ),
]


BRIEFS = {
    'X04': dict(
        goal='Tạo Figure/Axes và chọn line hay histogram theo câu hỏi.',
        task='Viết plot_weekly (line có marker) và plot_histogram (hist với biên cho sẵn); cả hai return fig.',
        predict='Biên [4, 6, 8, 10] chia [4, 5, 5, 7, 8, 9] thành mấy cột, cao bao nhiêu?',
        code=['import matplotlib.pyplot as plt', '', 'def plot_weekly(weeks, scores):', '    fig, ax = plt.subplots()',
              '    # ax.plot(...); ax.set(...)', '    return fig'],
        tests=['plot_weekly([1, 2, 3], [7, 8, 6]) → 1 Axes, nhãn Week / Score',
               'plot_histogram([0, 10, 10], [0, 5, 10]) → cột cao 1 và 2'],
        reflect='Vì sao vẽ danh sách điểm thi bằng line không cho thấy phân bố?'),
    'X05': dict(
        goal='Làm biểu đồ đọc được và xuất đúng figure ra PNG.',
        task='plot_marks: bar + đường mốc "Pass" + ylim 0..10 + legend. export_png: fig.savefig vào BytesIO rồi plt.close(fig).',
        predict='Figure 4×2 inch lưu với dpi 50 thì PNG rộng, cao bao nhiêu pixel?',
        code=['def export_png(fig, dpi):', '    buf = BytesIO()', '    # lưu CHÍNH fig với dpi', '    # đóng fig',
              '    return buf.getvalue()'],
        tests=['plot_marks(["An", "Binh"], [8, 6], 5) → mốc nét đứt ở 5, legend Pass',
               'export_png(figure 4×2, 50) → PNG 200×100, figure đã đóng'],
        reflect='clf() khác close() thế nào, và vì sao savefig phải đứng trước close?'),
    'M01': dict(
        goal='Một Figure, hai Axes, hai câu hỏi — luôn vẽ qua biến Axes.',
        task='revenue_dashboard: line doanh thu bên trái, barh số đơn đã xếp hạng bên phải.',
        predict='Sau plt.subplots(1, 2), plt.plot(...) rơi vào Axes nào?',
        code=['def revenue_dashboard(days, revenue, categories, orders):',
              '    fig, (ax_line, ax_bar) = plt.subplots(1, 2, layout="constrained")',
              '    # ax_line.plot(...) — không dùng plt.plot', '    # sắp tăng dần rồi ax_bar.barh(...)', '    return fig'],
        tests=['Axes phải không có đường nào', 'orders [30, 15, 22] → thanh trên cùng là A'],
        reflect='Vì sao barh phải sắp TĂNG dần để category lớn nhất nằm trên cùng?'),
    'M02': dict(
        goal='Đọc phân bố, so nhóm và giữ outlier.',
        task='plot_distribution: histogram gộp (bins=edges, n trên tiêu đề) + boxplot mỗi nhóm. plot_relation: scatter alpha 0.5.',
        predict='{"A": [4, 5, 6, 7], "B": [5, 6, 7, 20]}, biên [0, 5, 10, 25] → histogram cao bao nhiêu?',
        code=['def plot_distribution(groups, edges):', '    fig, (ax_hist, ax_box) = plt.subplots(1, 2, layout="constrained")',
              '    # histogram gộp, tiêu đề có n', '    # boxplot mỗi nhóm, giữ fliers', '    return fig'],
        tests=['Ví dụ → cột 1, 6, 1; tiêu đề "All scores (n=8)"', 'Hộp B vẫn có điểm ngoài 20'],
        reflect='Vì sao không được tắt showfliers để biểu đồ "gọn" hơn?'),
    'M03': dict(
        goal='Heatmap có nhãn, colorbar có đơn vị và chung một thang.',
        task='plot_heatmaps: một hàng heatmap từ dict DataFrame, vmin=0, vmax chung, cmap viridis, một colorbar.',
        predict='Không đặt vmin/vmax, ô 40 của Jan và ô 60 của Feb có cùng màu không?',
        code=['def plot_heatmaps(tables, unit):', '    vmax = ...  # max của MỌI bảng',
              '    fig, axes = plt.subplots(1, len(tables), layout="constrained", squeeze=False)',
              '    # imshow(..., vmin=0, vmax=vmax), tick cột/hàng, tiêu đề', '    # fig.colorbar(im, ax=list(axes[0]), label=unit)',
              '    return fig'],
        tests=['Jan + Feb → 3 Axes, mọi panel thang 0..max chung', 'Colorbar có nhãn "Orders"'],
        reflect='Vì sao so màu giữa hai heatmap tự co thang là sai?'),
    'M04': dict(
        goal='Nhấn đúng một category mà không bóp méo dữ liệu.',
        task='plot_highlight(revenue): bar đủ category, cột lớn nhất màu HIGHLIGHT + annotation, ylim từ 0.',
        predict='A=30, B=40, C=34 với ylim(28, 42): cột B trông gấp mấy lần cột A?',
        code=['def plot_highlight(revenue):', '    pos = int(revenue.to_numpy().argmax())', '    # colors: HIGHLIGHT tại pos, BASE còn lại',
              '    # bar, annotate tại (pos, value), ylim(0, value * 1.2)', '    return fig'],
        tests=['[12, 25, 18] → B đậm, chữ "25" tại (1, 25)', 'Trục y luôn bắt đầu từ 0'],
        reflect='Vì sao bar chart phải giữ baseline 0?'),
    'M05': dict(
        goal='Trục thời gian đúng thứ tự, trục % đúng thang, trục log đúng chỗ.',
        task='plot_rate: to_datetime + sort + PercentFormatter(xmax=1) + DateFormatter. plot_log_sizes: trục log, size <= 0 → ValueError.',
        predict='PercentFormatter() mặc định hiển thị tỷ lệ 0.25 thành gì?',
        code=['def plot_rate(df):', '    data = df.assign(date=pd.to_datetime(df["date"]))', '    # sort theo ngày, vẽ line',
              '    # PercentFormatter(xmax=1), DateFormatter("%d/%m"), ylim 0..1', '    return fig'],
        tests=['Ngày xáo trộn → đường đi theo thứ tự ngày', '0.25 trên trục y → "25%"'],
        reflect='Trục log đổi ý nghĩa khoảng cách thế nào, và vì sao phải chặn giá trị 0?'),
    'M06': dict(
        goal='Xuất hình đúng kích thước và dọn figure khi chạy hàng loạt.',
        task='make_chart: figsize (6, 3) + layout constrained. export_all: savefig PNG theo dpi rồi close từng figure.',
        predict='Figure 6×3 inch, dpi 150 → PNG bao nhiêu pixel?',
        code=['def export_all(charts, dpi):', '    result = {}', '    for title, values in charts.items():',
              '        fig = make_chart(title, values)', '        # savefig vào BytesIO với dpi, rồi close', '    return result'],
        tests=['dpi 20 → mỗi PNG 120×60', 'Sau export_all không còn figure nào mở'],
        reflect='Vì sao không dùng bbox_inches="tight" khi đề cần đúng kích thước pixel?'),
}

# Bài Matplotlib không cần file cấp sẵn.
SUPPORT = {}
