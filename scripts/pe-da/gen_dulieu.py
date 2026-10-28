# -*- coding: utf-8 -*-
"""Sinh BỘ DỮ LIỆU XUYÊN SUỐT của khoá "Python cho Data Analyst" — Quán Hạt Rang.

Vì sao có file này
------------------
Vòng nghiên cứu 29/10/2026 (`nghiencuu-dulieu.md`) đã xếp bốn ứng viên trên
Hugging Face lên sáu điều kiện và KHÔNG bộ nào qua được bốn hàng cuối: không bộ
nào có chiều QUẦY, có cột SỐ LƯỢNG, có bảng THỨ HAI để `merge`, và có quan hệ
nhiều–nhiều. Mà bốn hàng đó không phải mong muốn thẩm mỹ — chúng là yêu cầu của
32 bài M3, 30 bài M4 và project bốn bài SY25–SY28.

Lý lẽ nặng nhất: ba trong bốn ứng viên LÀ dữ liệu synthetic. Chọn synthetic của
người khác thì trả đủ giá (giấy phép phải canh, đơn vị tiền không biết, cột
`card` phải bỏ) mà KHÔNG nhận được tính "thật" — vì nó không thật. Nên: tự sinh,
và dùng `tablegpt/CoffeeSales` (CC0 1.0) làm BẰNG CHỨNG HIỆU CHUẨN.

Hiệu chuẩn là phần quan trọng nhất của file này
-----------------------------------------------
`TRONG_SO_GIO` KHÔNG phải một phân bố tôi nghĩ ra. Nó là **một PHÉP HOÁN VỊ** của
vector tỉ lệ giờ đo được trên 2 623 hàng thật của bộ CC0 (`TI_LE_GIO_CC0` dưới
đây). Hoán vị nghĩa là: trung bình, phương sai, CV, min, max, và cả phân bố độ
lớn GIỮ NGUYÊN TỪNG GIÁ TRỊ — chỉ THỨ TỰ các giờ đổi. Nhờ vậy câu "bộ tự sinh
không vô lý" là một phép kiểm được chứ không phải một lời hứa: `--kiem` in ra
`CV` của cả hai và chứng minh hai tập giá trị bằng nhau.

Thứ tự đổi vì một lý do nói ra được, không phải vì thẩm mỹ: bộ CC0 là MỘT MÁY BÁN
CÀ PHÊ TỰ ĐỘNG trong một toà nhà, nên đỉnh của nó ở 10h (giờ nghỉ giữa buổi
sáng). Quán cà phê mặt phố Việt Nam bán mạnh nhất lúc 7–9h (người đi làm ghé
trước giờ vào). Phép hoán vị dời ĐÚNG cái đỉnh đó sớm hai giờ và giữ bướu tối.
Từng giờ được ghi lại nó lấy giá trị của giờ nào trong bộ thật.

Seed — bẫy đã cắn repo này một lần
-----------------------------------
`random.Random(hash(chuoi))` KHÔNG dùng được: với chuỗi, `hash()` băm theo
`PYTHONHASHSEED` ngẫu nhiên mỗi tiến trình, nên mỗi lần dựng ra một bộ KHÁC, và
`update-lesson-content.ts` (in sha256 cũ → mới) hết so được. AGENTS.md ghi lại
đúng chuyện này ở mục trộn vị trí đáp án trắc nghiệm.
Ở đây mọi luồng ngẫu nhiên là `random.Random(f'{SEED_GOC}/<tên luồng>')`.
`random.seed()` với `str` đi qua sha512 chứ KHÔNG qua `hash()`, nên nó ổn định
giữa các tiến trình — đó là lý do cách này an toàn còn `hash()` thì không.
Mỗi luồng có seed RIÊNG để thêm một luồng mới không dịch chuyển mọi số của các
luồng cũ (thêm một đặc tính là đổi hết dữ liệu thì không ai dám thêm).

Chạy
----
    py -I scripts/pe-da/gen_dulieu.py            # sinh cả ba tầng
    py -I scripts/pe-da/gen_dulieu.py --kiem     # sinh + in bảng số đo
    py -I scripts/pe-da/gen_dulieu.py --kiem --cc0 <index.csv>   # đo lại bộ thật

Chỉ dùng thư viện chuẩn (không numpy/pandas) để chạy được bằng `py -I` trên máy
sạch — đúng cờ mà AGENTS.md yêu cầu cho script đọc dữ liệu tải về.
"""
from __future__ import annotations

import argparse
import collections
import csv
import datetime as dt
import json
import random
import statistics
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent

# Tầng 0 + tầng 1 là tài liệu cho NGƯỜI SOẠN nội dung (dev chép từ đây), nên nằm
# trong scripts/, không trong frontend/public/.
RA_DEV = HERE / 'dulieu'

# Tầng 2 KHÔNG được đặt trong frontend/public/static/da/.
# Lý do, đã đọc mã: `chep_anh()` trong build.py làm
#     for cu in ANH_DICH.iterdir():
#         if cu.name not in can: cu.unlink()
# tức nó XOÁ mọi file trong static/da/ mà không bài nào khai là ảnh. Một file
# .csv đặt ở đó sẽ bị xoá im lặng ở lần `py scripts/pe-da/build.py` kế tiếp, còn
# một THƯ MỤC con thì làm `Path.unlink()` ném PermissionError trên Windows và
# build.py chết. Nhánh đó chỉ chạy khi gói ảnh gốc có trên máy — và nó CÓ trên
# máy người soạn. Nên tầng 2 đi sang một thư mục ANH EM, cùng origin nên CSP
# `connect-src 'self'` của ba worker vẫn phủ được (next.config.ts).
RA_WEB = REPO / 'frontend' / 'public' / 'static' / 'da-dulieu'

SEED_GOC = 20261029


def rng(ten: str) -> random.Random:
    """Một luồng ngẫu nhiên độc lập, seed cố định. Xem docstring đầu file."""
    return random.Random(f'{SEED_GOC}/{ten}')


# ──────────────────────────────────────────────────────────────────────────────
# 1. HIỆU CHUẨN THEO BỘ CC0
# ──────────────────────────────────────────────────────────────────────────────

CC0_NGUON = 'https://huggingface.co/datasets/tablegpt/CoffeeSales/resolve/main/index.csv'
CC0_NGAY_DO = '2026-10-29'
CC0_SO_HANG = 2623

# Tỉ lệ % số giao dịch theo giờ, ĐO THẬT trên 2 623 hàng của bộ CC0 ngày
# 29/10/2026. Hằng này là BẢN GHI của phép đo, không phải một con số chép tay:
# `--cc0 <đường dẫn>` đo lại từ chính file và báo lệch nếu có.
TI_LE_GIO_CC0 = {
    7: 2.48, 8: 6.63, 9: 6.44, 10: 9.95, 11: 8.65, 12: 7.28,
    13: 6.21, 14: 5.83, 15: 5.57, 16: 6.90, 17: 5.60, 18: 5.99,
    19: 6.60, 20: 5.30, 21: 6.79, 22: 3.77,
}

# Phép HOÁN VỊ: giờ của quán ← giờ nào của bộ CC0. Đọc cột phải để thấy từng giá
# trị đến từ đâu; tập giá trị hai bên BẰNG NHAU (đó là điều `--kiem` chứng minh).
#   8h nhận 9,95 — đỉnh của bộ thật, dời từ 10h về 8h vì bộ CC0 là máy bán tự
#   động trong toà nhà (đỉnh giờ nghỉ giữa buổi), còn quán mặt phố bán mạnh nhất
#   trước giờ vào làm.
#   19h nhận 6,79 — bướu tối của bộ thật (ở đó là 21h), dời về 19h vì quán đóng
#   22h chứ không bán tới khuya.
#   22h nhận 2,48 — giá trị NHỎ NHẤT của bộ thật (ở đó là 07h, giờ máy vừa có
#   người), ở đây là giờ cuối trước khi đóng cửa.
GIO_LAY_TU = {
    7: 9, 8: 10, 9: 11, 10: 12, 11: 13, 12: 8,
    13: 14, 14: 15, 15: 17, 16: 16, 17: 18, 18: 19,
    19: 21, 20: 20, 21: 22, 22: 7,
}
TRONG_SO_GIO = {gio: TI_LE_GIO_CC0[goc] for gio, goc in GIO_LAY_TU.items()}

# Cuối tuần KHÁC ngày thường, và nó phải khác theo HAI chiều: nhiều đơn hơn (hệ
# số dưới) và muộn hơn (hệ số này). Thiếu chiều thứ hai thì bản đồ nhiệt
# `giờ × thứ` của VZ08/VZ28 chỉ là bảy cột sáng đều nhau — tức một bảng 2 chiều
# mà chỉ có 1 chiều mang tin.
HE_SO_GIO_CUOI_TUAN = {
    7: 0.45, 8: 0.60, 9: 0.85, 10: 1.25, 11: 1.35, 12: 1.30,
    13: 1.20, 14: 1.20, 15: 1.25, 16: 1.25, 17: 1.15, 18: 1.10,
    19: 1.05, 20: 1.00, 21: 0.95, 22: 0.70,
}

# Quầy 2 nằm trong toà nhà văn phòng: đông buổi sáng, gần như tắt buổi tối. Đây
# là chiều thứ ba của bản đồ nhiệt (`giờ × quầy`, PD19/PD20 pivot).
# Biên độ CỐ Ý VỪA PHẢI (1,26× sáng ↔ 0,55× tối, không phải 1,40 ↔ 0,30): đo
# được là bản gắt làm phân bố giờ TỔNG lệch khỏi hình dạng CC0 (CV 0,338 so với
# 0,265) — tức chiều `giờ × quầy` ăn mất chính phép hiệu chuẩn. Bản này giữ
# được cả hai: Q2 vẫn là quầy sáng rõ rệt, mà tổng vẫn khớp bộ thật.
HE_SO_GIO_QUAY = {
    'Q1': {g: 1.0 for g in TRONG_SO_GIO},
    'Q2': {7: 1.23, 8: 1.26, 9: 1.20, 10: 1.10, 11: 1.07, 12: 1.13,
           13: 1.00, 14: 0.94, 15: 0.90, 16: 0.87, 17: 0.81, 18: 0.71,
           19: 0.64, 20: 0.61, 21: 0.58, 22: 0.55},
}

# CV của bảy hệ số này là 0,171 — trên ngưỡng 0,15 mà đặc tả đòi. Bộ
# `dirty_cafe_sales` chỉ đạt 0,019 theo thứ trong tuần, và đó chính là lý do nó
# bị loại: 29/30 bài của M4 vẽ ra bảy cột bằng nhau.
HE_SO_THU = {0: 0.85, 1: 0.90, 2: 0.92, 3: 0.95, 4: 1.12, 5: 1.35, 6: 1.25}

# Mùa trong năm, theo khí hậu Hà Nội. Tháng 2 thấp vì nghỉ Tết; tháng 5–8 nóng
# nên tổng đơn cao; tháng 12 lạnh, ít đơn hơn nhưng cà phê NÓNG lại lên (xem
# HE_SO_NHOM_THANG).
HE_SO_THANG = {1: 0.88, 2: 0.78, 3: 0.95, 4: 1.05, 5: 1.15, 6: 1.20,
               7: 1.18, 8: 1.14, 9: 1.05, 10: 1.00, 11: 0.92, 12: 0.90}

# Mùa đổi CƠ CẤU món, không chỉ tổng số đơn. Nếu thiếu phần này thì VZ19 (facet
# theo nhóm) và PD24 (rolling, so kỳ trước) vẽ ra 12 tháng giống nhau về tỉ lệ.
HE_SO_NHOM_THANG = {
    'Đá xay': {1: 0.45, 2: 0.50, 3: 0.75, 4: 1.15, 5: 1.55, 6: 1.75,
               7: 1.80, 8: 1.65, 9: 1.20, 10: 0.90, 11: 0.60, 12: 0.45},
    'Trà':    {1: 0.60, 2: 0.65, 3: 0.85, 4: 1.10, 5: 1.40, 6: 1.55,
               7: 1.55, 8: 1.45, 9: 1.15, 10: 0.95, 11: 0.75, 12: 0.60},
    'Cà phê': {1: 1.15, 2: 1.12, 3: 1.05, 4: 0.98, 5: 0.92, 6: 0.88,
               7: 0.88, 8: 0.90, 9: 0.96, 10: 1.02, 11: 1.10, 12: 1.18},
    'Bánh':   {m: 1.0 for m in range(1, 13)},
}

# ──────────────────────────────────────────────────────────────────────────────
# 2. BA BẢNG TRA — viết tay, không sinh ngẫu nhiên
# ──────────────────────────────────────────────────────────────────────────────

# `mon` là KHOÁ dạng slug ASCII: `don_hang` giữ được ASCII thuần (cần cho
# `np.loadtxt` ở NP21 và structured array ở EX02), và chữ hoa/chữ thường trở
# thành một khiếm khuyết TỰ NHIÊN để PD09 làm sạch. `ten_mon` mới là tên hiện
# cho người đọc — có dấu, vì PY06 dạy Unicode.
# Giá là VNĐ, số nguyên. Đơn vị tiền ghi rõ ở LUOC-DO.md và ở NOTICE: PD32 dạy
# nguyên văn "khi giao báo cáo, ghi đơn vị tiền", nên bộ dữ liệu của chính khoá
# không được là chỗ đầu tiên phạm luật đó.
MON = [
    # mon,            ten_mon,              nhom,      gia_niem_yet (VNĐ)
    ('ca-phe-den',    'Cà phê đen đá',      'Cà phê',  20000),
    ('ca-phe-sua',    'Cà phê sữa đá',      'Cà phê',  25000),
    ('bac-xiu',       'Bạc xỉu',            'Cà phê',  29000),
    ('espresso',      'Espresso',           'Cà phê',  35000),
    ('americano',     'Americano',          'Cà phê',  39000),
    ('latte',         'Latte',              'Cà phê',  45000),
    ('mocha',         'Mocha',              'Cà phê',  49000),
    ('tra-sen',       'Trà sen vàng',       'Trà',     39000),
    ('tra-dao',       'Trà đào cam sả',     'Trà',     42000),
    ('ca-phe-da-xay', 'Cà phê đá xay',      'Đá xay',  49000),
    ('banh-mi-pate',  'Bánh mì pa-tê',      'Bánh',    25000),
    ('croissant',     'Bánh sừng bò',       'Bánh',    32000),
]
# Tên món chọn theo CORPUS, không theo sở thích: đếm trên source/course.json thì
# `latte` xuất hiện 45 lần, `espresso` 31, `mocha` 5, `americano` 3, còn
# `cappuccino` 0 lần. Lấy `mocha` thay `cappuccino` để 48 chỗ đang viết tên món
# trong giáo trình không phải sửa.

# Độ phổ biến của món (tổng 100). Phải LỆCH NHAU THẬT: VZ04 (bar theo doanh thu)
# và RD03 (`argsort` giữ tên món) không nói được gì trên 12 cột bằng nhau. Cà
# phê sữa đá dẫn đầu là thực tế quán Việt, không phải một con số cho đẹp.
DO_PHO_BIEN = {
    'ca-phe-sua': 22, 'ca-phe-den': 16, 'bac-xiu': 11, 'latte': 9,
    'tra-dao': 8, 'americano': 6, 'ca-phe-da-xay': 6, 'tra-sen': 5,
    'mocha': 4, 'banh-mi-pate': 4, 'croissant': 3, 'espresso': 3,
}

NGAY_DAU = dt.date(2025, 1, 1)
NGAY_CUOI = dt.date(2025, 12, 31)

# Bảng `quay` có BA quầy, `don_hang` chỉ có HAI — đó là chủ đích:
#   · `quay.merge(don_hang, how='left', indicator=True)` → Q3 ra `left_only`,
#     tức "quầy đã có trong danh mục mà chưa có đơn nào" (PD17);
#   · đồng thời `don_hang` có một mã quầy KHÔNG nằm trong danh mục (QUAY_LA
#     dưới) → `don_hang.merge(quay, how='left', indicator=True)` cũng ra
#     `left_only`, tức "đơn chưa khớp danh mục" — đúng cái danh sách mà
#     `bao_cao.py` của mốc v2 phải in ra.
# Thiếu một trong hai chiều thì `indicator=True` chỉ là một tham số được nhắc tên.
QUAY = [
    # quay, ten,                     khu_vuc,     ngay_mo
    ('Q1', 'Quầy mặt phố',           'Trung tâm', '2025-01-01'),
    ('Q2', 'Quầy toà nhà Sao Mai',   'Phía Tây',  '2025-05-05'),
    ('Q3', 'Quầy xe đẩy chợ đêm',    'Phía Nam',  '2026-03-01'),
]
QUAY_MO = {'Q1': dt.date(2025, 1, 1), 'Q2': dt.date(2025, 5, 5)}
# Số đơn trung bình mỗi ngày mỗi quầy. Hai con số này là thứ DUY NHẤT điều
# khiển tổng số hàng: 30,0 + 24,0 ra ~18 000 hàng, đúng quy mô mà chủ dự án đã
# chốt cho tầng 2 (đo lại bằng `--kiem`, đừng đoán sau khi sửa).
BASE_QUAY = {'Q1': 30.0, 'Q2': 24.0}

# Mã quầy KHÔNG có trong bảng `quay`: hai ngày hội chợ cuối tuần, người bán ghi
# tay "QH" vào sổ mà chưa ai thêm quầy đó vào danh mục.
# Dồn vào ĐÚNG HAI NGÀY có chủ đích: rải mỏng 14 hàng suốt năm thì `pivot` theo
# `quay` sinh một cột gần như toàn NaN và làm nhoè bài học "NaN nghĩa là CHƯA MỞ"
# của NP17/PD08/PD17/PD20. Một sự kiện hai ngày thì giải thích được bằng một câu.
QUAY_LA = 'QH'
NGAY_HOI_CHO = [dt.date(2025, 11, 8), dt.date(2025, 11, 9)]

# 11 ngày quán đóng cửa ⇒ mốc thời gian KHUYẾT THẬT. PD22 `reindex`/`asfreq`
# cần những mốc này VẮNG trong dữ liệu; nếu điền sẵn 0 thì bài đó không còn việc.
NGAY_DONG = [
    dt.date(2025, 1, 28), dt.date(2025, 1, 29), dt.date(2025, 1, 30),
    dt.date(2025, 1, 31), dt.date(2025, 2, 1), dt.date(2025, 2, 2),  # Tết
    dt.date(2025, 4, 30), dt.date(2025, 5, 1),                        # lễ
    dt.date(2025, 9, 2),                                              # Quốc khánh
    dt.date(2025, 6, 16), dt.date(2025, 6, 17),                       # sửa máy
]

THANH_TOAN = [('tien_mat', 45), ('the', 30), ('vi_dien_tu', 25)]

# Quan hệ NHIỀU–NHIỀU Món ↔ Nguyên liệu. Đây là bảng tồn tại chỉ vì SY25–SY28:
# project bốn bài đó đổi từ "sinh viên / môn / điểm" sang "món / nguyên liệu /
# đơn", và quan hệ nhiều–nhiều là thứ bài học đó dạy. `ca-phe-hat` có mặt ở 8
# món, `da` ở 7, `bot-mi` ở 2 — nếu mỗi món có nguyên liệu riêng thì quan hệ chỉ
# là một–nhiều và project mất nội dung.
NGUYEN_LIEU = [
    ('ca-phe-den',    'ca-phe-hat',     18, 'g'),
    ('ca-phe-den',    'da',            150, 'g'),
    ('ca-phe-den',    'duong',           5, 'g'),
    ('ca-phe-sua',    'ca-phe-hat',     18, 'g'),
    ('ca-phe-sua',    'sua-dac',        30, 'ml'),
    ('ca-phe-sua',    'da',            150, 'g'),
    ('bac-xiu',       'ca-phe-hat',      9, 'g'),
    ('bac-xiu',       'sua-dac',        30, 'ml'),
    ('bac-xiu',       'sua-tuoi',       80, 'ml'),
    ('bac-xiu',       'da',            150, 'g'),
    ('espresso',      'ca-phe-hat',     18, 'g'),
    ('americano',     'ca-phe-hat',     18, 'g'),
    ('americano',     'da',            120, 'g'),
    ('latte',         'ca-phe-hat',     18, 'g'),
    ('latte',         'sua-tuoi',      180, 'ml'),
    ('mocha',         'ca-phe-hat',     18, 'g'),
    ('mocha',         'sua-tuoi',      120, 'ml'),
    ('mocha',         'bot-cacao',       8, 'g'),
    ('mocha',         'syrup-caramel',  15, 'ml'),
    ('tra-sen',       'tra-den',         4, 'g'),
    ('tra-sen',       'hoa-sen',         3, 'g'),
    ('tra-sen',       'duong',          10, 'g'),
    ('tra-sen',       'da',            150, 'g'),
    ('tra-dao',       'tra-den',         4, 'g'),
    ('tra-dao',       'dao-ngam',       60, 'g'),
    ('tra-dao',       'sa',             10, 'g'),
    ('tra-dao',       'da',            150, 'g'),
    ('ca-phe-da-xay', 'ca-phe-hat',     18, 'g'),
    ('ca-phe-da-xay', 'sua-tuoi',      120, 'ml'),
    ('ca-phe-da-xay', 'da',            200, 'g'),
    ('ca-phe-da-xay', 'syrup-caramel',  20, 'ml'),
    ('ca-phe-da-xay', 'kem-tuoi',       30, 'ml'),
    ('banh-mi-pate',  'bot-mi',         90, 'g'),
    ('banh-mi-pate',  'pa-te',          40, 'g'),
    ('banh-mi-pate',  'bo',             10, 'g'),
    ('croissant',     'bot-mi',         70, 'g'),
    ('croissant',     'bo',             35, 'g'),
    ('croissant',     'duong',           8, 'g'),
]

# ──────────────────────────────────────────────────────────────────────────────
# 3. KHIẾM KHUYẾT CỐ Ý — tỉ lệ, và cửa sổ của tầng 1
# ──────────────────────────────────────────────────────────────────────────────

TI_LE_THANH_TOAN_RONG = 0.020   # ~2% — PD12 `na_values`, PD08 phát hiện thiếu
TI_LE_MON_BAN = 0.010           # ~1% lệch hoa/thường + khoảng trắng — PD09
TI_LE_TRUNG = 0.003             # ~0,3% dòng trùng TOÀN PHẦN — PD10, PD30
TI_LE_LECH_TONG = 0.002         # ~0,2% `tong_tien != so_coc*don_gia` — PD30/PD32
TI_LE_GIO_VANG = 0.040          # ~4% đơn giá khuyến mãi — PD32 đối chiếu danh mục
TI_LE_CO_THE = 0.18             # ~18% đơn có thẻ tích điểm
TRAN_LUOT_MOI_THE = 8           # ≤ 8 lượt/thẻ — xem §5 về quyền dữ liệu

# Tầng 1 là MỘT TUẦN liền mạch, không phải 400 hàng bốc ngẫu nhiên: bốc ngẫu
# nhiên thì mất cấu trúc ngày/giờ, mà đó đúng là thứ tầng 1 tồn tại để có.
TANG1_DAU = dt.date(2025, 9, 8)
TANG1_CUOI = dt.date(2025, 9, 14)

# Và tầng 1 phải chứa ÍT NHẤT MỘT ca của mỗi khiếm khuyết. Theo tỉ lệ tự nhiên,
# một tuần ~400 hàng chỉ gặp 0,8 dòng lệch tổng và 1,2 dòng trùng — tức phần lớn
# các tuần KHÔNG có ca nào, và PD09/PD10/PD30 chạy trên tầng 1 sẽ "sạch" một cách
# giả tạo. Nên bộ tiêm đặt một hạn mức tối thiểu TRONG cửa sổ này.
TANG1_TOI_THIEU = {'thanh_toan_rong': 4, 'mon_ban': 4, 'trung': 2, 'lech_tong': 2}


# ──────────────────────────────────────────────────────────────────────────────
# 4. SINH `don_hang`
# ──────────────────────────────────────────────────────────────────────────────

GIA = {m: g for m, _, _, g in MON}
NHOM = {m: n for m, _, n, _ in MON}


def chon_theo_trong_so(r: random.Random, cap: list[tuple]) -> object:
    """Bốc một khoá theo trọng số. `random.choices` cũng được, nhưng nó bốc theo
    LÔ và dùng `random()` số lần khác nhau tuỳ cài đặt — viết tay thì số lần gọi
    `random()` cố định, nên dòng dữ liệu không dịch khi nâng Python."""
    tong = sum(w for _, w in cap)
    x = r.random() * tong
    for k, w in cap:
        x -= w
        if x < 0:
            return k
    return cap[-1][0]


def ngay_mo_cua() -> list[dt.date]:
    dong = set(NGAY_DONG)
    ngay, ra = NGAY_DAU, []
    while ngay <= NGAY_CUOI:
        if ngay not in dong:
            ra.append(ngay)
        ngay += dt.timedelta(days=1)
    return ra


def trong_so_gio(quay: str, cuoi_tuan: bool) -> list[tuple[int, float]]:
    cap = []
    for gio, w in TRONG_SO_GIO.items():
        w *= HE_SO_GIO_QUAY[quay][gio]
        if cuoi_tuan:
            w *= HE_SO_GIO_CUOI_TUAN[gio]
        cap.append((gio, w))
    return cap


def sinh_don_hang() -> list[dict]:
    r_so = rng('so-don')
    r_gio = rng('gio')
    r_mon = rng('mon')
    r_coc = rng('so-coc')
    r_tt = rng('thanh-toan')
    r_gv = rng('gio-vang')

    rows: list[dict] = []
    for ngay in ngay_mo_cua():
        thu = ngay.weekday()
        cuoi_tuan = thu >= 5
        for quay in ('Q1', 'Q2'):
            if ngay < QUAY_MO[quay]:
                continue  # Quầy 2 mở sau 4 tháng — xem NP17/PD08/PD17/PD20
            lam = (BASE_QUAY[quay] * HE_SO_THU[thu] * HE_SO_THANG[ngay.month])
            # Nhiễu nhân tính quanh 1,0: giữ hình dạng của các hệ số trên mà vẫn
            # cho mỗi ngày một con số riêng. Chặn dưới 1 để không có ngày mở cửa
            # mà 0 đơn — ngày đó sẽ lẫn với 11 ngày đóng cửa thật và phá PD22.
            n = max(1, round(lam * r_so.gauss(1.0, 0.18)))
            cap_gio = trong_so_gio(quay, cuoi_tuan)
            cap_mon = [(m, w * HE_SO_NHOM_THANG[NHOM[m]][ngay.month])
                       for m, w in DO_PHO_BIEN.items()]
            for _ in range(n):
                gio = chon_theo_trong_so(r_gio, cap_gio)
                t = dt.datetime(ngay.year, ngay.month, ngay.day, gio,
                                r_gio.randrange(60), r_gio.randrange(60))
                mon = chon_theo_trong_so(r_mon, cap_mon)
                so_coc = chon_theo_trong_so(
                    r_coc, [(1, 70), (2, 20), (3, 7), (4, 3)])
                don_gia = GIA[mon]
                # Giờ vàng 14–16h giảm 5 000 đ/cốc. Đây KHÔNG phải khiếm khuyết:
                # nó làm `don_gia` lệch `mon.gia_niem_yet` một cách HỢP LỆ, nên
                # PD32 phải đối chiếu rồi GIẢI THÍCH chứ không chỉ báo lỗi.
                if 14 <= gio <= 16 and r_gv.random() < TI_LE_GIO_VANG:
                    don_gia -= 5000
                rows.append({
                    'ma_don': '',
                    'thoi_diem': t.strftime('%Y-%m-%d %H:%M:%S'),
                    'quay': quay,
                    'mon': mon,
                    'so_coc': so_coc,
                    'don_gia': don_gia,
                    'tong_tien': so_coc * don_gia,
                    'thanh_toan': chon_theo_trong_so(r_tt, THANH_TOAN),
                    'ma_the_tich_diem': '',
                })

    rows.extend(sinh_hoi_cho())
    rows.extend(sinh_ngoai_lai())
    rows.sort(key=lambda d: (d['thoi_diem'], d['quay'], d['mon']))
    return rows


def sinh_hoi_cho() -> list[dict]:
    """14 đơn mang mã quầy `QH` không có trong danh mục — xem QUAY_LA."""
    r = rng('hoi-cho')
    ra = []
    for ngay in NGAY_HOI_CHO:
        for _ in range(7):
            gio = r.randrange(9, 18)
            mon = chon_theo_trong_so(r, list(DO_PHO_BIEN.items()))
            so_coc = chon_theo_trong_so(r, [(1, 60), (2, 30), (3, 10)])
            ra.append({
                'ma_don': '',
                'thoi_diem': dt.datetime(ngay.year, ngay.month, ngay.day, gio,
                                         r.randrange(60), r.randrange(60)
                                         ).strftime('%Y-%m-%d %H:%M:%S'),
                'quay': QUAY_LA, 'mon': mon, 'so_coc': so_coc,
                'don_gia': GIA[mon], 'tong_tien': so_coc * GIA[mon],
                'thanh_toan': 'tien_mat', 'ma_the_tich_diem': '',
            })
    return ra


# Đơn đặt trước cho hội thảo / lớp học: 18–40 cốc. NGOẠI LAI THẬT, không phải
# lỗi gõ — PD31 phải cờ chúng bằng IQR rồi GIỮ LẠI, còn VZ07 boxplot phải thấy
# râu dài. Viết tay từng đơn vì "vài đơn" là một con số nhỏ, và một con số nhỏ
# thì ngẫu nhiên hoá chỉ làm nó khó kiểm hơn.
NGOAI_LAI = [
    ('2025-03-14 08:40:00', 'Q1', 'ca-phe-sua', 24),
    ('2025-04-09 09:05:00', 'Q1', 'ca-phe-den', 18),
    ('2025-05-22 08:20:00', 'Q2', 'ca-phe-sua', 40),
    ('2025-06-27 08:55:00', 'Q2', 'ca-phe-sua', 30),
    ('2025-07-18 09:30:00', 'Q1', 'tra-dao', 20),
    ('2025-08-29 08:10:00', 'Q2', 'ca-phe-sua', 36),
    ('2025-09-11 09:15:00', 'Q1', 'banh-mi-pate', 25),
    ('2025-10-24 08:35:00', 'Q1', 'ca-phe-sua', 28),
    ('2025-12-05 08:25:00', 'Q2', 'latte', 22),
]


def sinh_ngoai_lai() -> list[dict]:
    return [{
        'ma_don': '', 'thoi_diem': t, 'quay': q, 'mon': m, 'so_coc': n,
        'don_gia': GIA[m], 'tong_tien': n * GIA[m],
        'thanh_toan': 'the', 'ma_the_tich_diem': '',
    } for t, q, m, n in NGOAI_LAI]


# ──────────────────────────────────────────────────────────────────────────────
# 5. THẺ TÍCH ĐIỂM — và vì sao nó bị chặn ở 8 lượt
# ──────────────────────────────────────────────────────────────────────────────
# Bộ CC0 có cột `card`: 1 038 thẻ, thẻ nhiều nhất xuất hiện 122 lần. Mã đã thay
# nhưng TÍNH LIÊN KẾT còn nguyên — "người này mua 122 lần, vào những giờ này" là
# dữ liệu giả danh THEO HÀNH VI, tức dữ liệu NHẠY CẢM theo Luật 91/2025 + Nghị
# định 356/2025. Đó là lý do cột `card` bị bỏ khi chép bộ CC0 vào repo.
# `ma_the_tich_diem` ở đây là mã thẻ CỦA QUÁN, sinh ngẫu nhiên, không nối được
# với người nào, và bị chặn ở ≤ 8 lượt/thẻ để không dựng lại được một hồ sơ hành
# vi. Nó tồn tại vì PD16/PD17 cần một khoá merge mà GIÁ TRỊ CÓ THỂ THIẾU — một
# bài học khác với merge vào bảng tra (`quay`, `mon`) nơi khoá luôn có.

def gan_the(rows: list[dict]) -> None:
    """Gán mã thẻ, SAU khi đã tiêm dòng trùng. Thứ tự đó là bản sửa một lỗi
    thật: bản đầu gán thẻ TRƯỚC, rồi bước nhân bản dòng trùng chép luôn mã thẻ
    sang bản sao — nên một thẻ đã dùng hết 8 lượt thành **9 lượt**, tức trần
    riêng tư bị phá bởi một bước hoàn toàn khác. `--kiem` in ra con số đó và nó
    là chỗ duy nhất nhìn thấy được.

    Nên hai dòng trùng toàn phần được gom thành MỘT đơn vị và tiêu HAI lượt của
    cùng một thẻ: bản sao buộc phải mang đúng mã thẻ của bản gốc, nếu không nó
    thôi là bản trùng toàn phần và PD10/PD30 mất ca.
    """
    r = rng('the-gan')
    r_chon = rng('the-chon')

    don_vi: list[list[int]] = []
    i = 0
    while i < len(rows):
        j = i + 1
        while j < len(rows) and rows[j]['ma_don'] == rows[i]['ma_don']:
            j += 1
        don_vi.append(list(range(i, j)))
        i = j

    pool: list[str] = []          # mã thẻ CÒN chỗ, theo thứ tự cấp
    con: dict[str, int] = {}
    stt = 0
    for u in don_vi:
        if r_chon.random() >= TI_LE_CO_THE:
            continue
        kha = [m for m in pool if con[m] >= len(u)]
        # 60% là khách quen quẹt lại thẻ cũ, 40% là thẻ mới. Thiếu phép trộn
        # này thì mọi thẻ đều dùng CẠN hạn mức và số lượt/thẻ thành một khối
        # đặc ở đúng 8 — một hình dạng không quán nào có.
        if kha and r.random() < 0.6:
            ma = r.choice(kha)
        else:
            stt += 1
            ma = f'TD{stt:05d}'
            # Hạn mức bốc trong 1..TRAN, nhưng không được NHỎ HƠN đơn vị đang
            # gán — nếu không thì một cặp dòng trùng không có thẻ nào nhận nổi.
            con[ma] = max(len(u), r.randint(1, TRAN_LUOT_MOI_THE))
            pool.append(ma)
        for idx in u:
            rows[idx]['ma_the_tich_diem'] = ma
        con[ma] -= len(u)
        if con[ma] <= 0:
            pool.remove(ma)


# ──────────────────────────────────────────────────────────────────────────────
# 6. TIÊM KHIẾM KHUYẾT
# ──────────────────────────────────────────────────────────────────────────────

def trong_cua_so_tang1(row: dict) -> bool:
    ngay = dt.date.fromisoformat(row['thoi_diem'][:10])
    return TANG1_DAU <= ngay <= TANG1_CUOI


def chon_de_tiem(rows: list[dict], ten: str, ti_le: float,
                 toi_thieu_tang1: int) -> list[int]:
    """Chọn chỉ số dòng để tiêm một khiếm khuyết.

    Hai phần: hạn mức tối thiểu TRONG cửa sổ tầng 1 (xem TANG1_TOI_THIEU), rồi
    phần còn lại rải đều trên cả bảng. Chỉ số trả về đã SẮP, và bộ chọn đọc
    `rows` theo thứ tự đã sắp theo `thoi_diem`, nên kết quả không phụ thuộc thứ
    tự băm của tập hợp nào.
    """
    r = rng(f'tiem/{ten}')
    trong = [i for i, row in enumerate(rows) if trong_cua_so_tang1(row)]
    ngoai = [i for i, row in enumerate(rows) if not trong_cua_so_tang1(row)]
    chon = set(r.sample(trong, min(toi_thieu_tang1, len(trong))))
    con = max(0, round(len(rows) * ti_le) - len(chon))
    chon |= set(r.sample(ngoai, min(con, len(ngoai))))
    return sorted(chon)


def tiem_khiem_khuyet(rows: list[dict]) -> dict[str, int]:
    """Tiêm bốn khiếm khuyết. Trả về số đo thật của từng loại."""
    do: dict[str, int] = {}

    # (1) ~2% `thanh_toan` rỗng — người bán quên tích hình thức thanh toán.
    idx = chon_de_tiem(rows, 'thanh-toan-rong', TI_LE_THANH_TOAN_RONG,
                       TANG1_TOI_THIEU['thanh_toan_rong'])
    for i in idx:
        rows[i]['thanh_toan'] = ''
    do['thanh_toan_rong'] = len(idx)

    # (2) ~1% `mon` lệch hoa/thường và có khoảng trắng đầu/cuối — ghi tay.
    # Bốn biến thể, vì `.str.lower()` một mình không đủ: `.str.strip()` phải có
    # việc, và PD09 dạy CẢ HAI.
    r = rng('tiem/mon-ban-bien-the')
    idx = chon_de_tiem(rows, 'mon-ban', TI_LE_MON_BAN,
                       TANG1_TOI_THIEU['mon_ban'])
    for i in idx:
        m = rows[i]['mon']
        rows[i]['mon'] = chon_theo_trong_so(r, [
            (m.upper(), 25), (m.capitalize(), 25),
            (f' {m}', 25), (f'{m} ', 25),
        ])
    do['mon_ban'] = len(idx)

    # (3) ~0,2% `tong_tien != so_coc * don_gia` — gõ tay sai một chữ số.
    # Tiêm TRƯỚC khi nhân bản dòng trùng, để một dòng vừa trùng vừa lệch tổng là
    # chuyện có thể xảy ra (và nó xảy ra thật trong sổ viết tay).
    r = rng('tiem/lech-tong')
    idx = chon_de_tiem(rows, 'lech-tong', TI_LE_LECH_TONG,
                       TANG1_TOI_THIEU['lech_tong'])
    for i in idx:
        dung = rows[i]['so_coc'] * rows[i]['don_gia']
        # Lệch phải ĐỦ LỚN để `assert` bắt được bằng phép so nguyên, và không
        # được là 0. Ba kiểu sai gõ tay thật: thừa một số 0, thiếu một cốc, lẫn
        # sang đơn giá.
        sai = chon_theo_trong_so(r, [
            (dung * 10, 20), (dung - rows[i]['don_gia'], 40),
            (dung + 10000, 40),
        ])
        rows[i]['tong_tien'] = int(sai) if sai > 0 else dung + 10000
    do['lech_tong'] = len(idx)

    # (4) ~0,3% dòng TRÙNG TOÀN PHẦN — sổ bị chốt hai lần. Trùng toàn phần
    # nghĩa là KỂ CẢ `ma_don`, nên `df.duplicated()` không tham số bắt được, và
    # `assert df['ma_don'].is_unique` của PD30 có thứ thật để trượt.
    # Gán `ma_don` TRƯỚC bước này: nhân bản xong mới gán thì hai dòng nhận hai
    # mã khác nhau và chúng thôi là bản trùng.
    idx = chon_de_tiem(rows, 'trung', TI_LE_TRUNG, TANG1_TOI_THIEU['trung'])
    for i in reversed(idx):   # chèn từ cuối để chỉ số phía trước không dịch
        rows.insert(i + 1, dict(rows[i]))
    do['trung'] = len(idx)
    return do


def gan_ma_don(rows: list[dict]) -> None:
    """`DH-2025-000001` — tiền tố + năm + số thứ tự. Khuôn này cố ý CÓ CẤU TRÚC
    để SY03 (regex) và PY07 (lát cắt chuỗi) có một mã thật để bóc."""
    for i, row in enumerate(rows, 1):
        row['ma_don'] = f'DH-{row["thoi_diem"][:4]}-{i:06d}'


COT_DON_HANG = ['ma_don', 'thoi_diem', 'quay', 'mon', 'so_coc', 'don_gia',
                'tong_tien', 'thanh_toan', 'ma_the_tich_diem']


def dung_bo_du_lieu() -> tuple[list[dict], dict[str, int]]:
    rows = sinh_don_hang()
    gan_ma_don(rows)          # trước khi nhân bản — xem chú thích (4)
    do = tiem_khiem_khuyet(rows)
    gan_the(rows)             # SAU khi nhân bản — xem docstring của gan_the
    return rows, do


# ──────────────────────────────────────────────────────────────────────────────
# 7. XUẤT FILE
# ──────────────────────────────────────────────────────────────────────────────

def ghi_csv(p: Path, cot: list[str], rows: list[dict]) -> int:
    """Ghi CSV ỔN ĐỊNH TỪNG BYTE: `newline=''` + `lineterminator='\\n'` (mặc
    định của csv là `\\r\\n`, và một lần chạy trên máy khác sẽ ra khác), utf-8
    không BOM, không sắp lại khoá."""
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open('w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=cot, lineterminator='\n')
        w.writeheader()
        w.writerows(rows)
    return p.stat().st_size


def d_quay() -> list[dict]:
    return [dict(zip(['quay', 'ten', 'khu_vuc', 'ngay_mo'], q)) for q in QUAY]


def d_mon() -> list[dict]:
    return [dict(zip(['mon', 'ten_mon', 'nhom', 'gia_niem_yet'], m))
            for m in MON]


def d_nguyen_lieu() -> list[dict]:
    return [dict(zip(['mon', 'nguyen_lieu', 'luong', 'don_vi'], n))
            for n in NGUYEN_LIEU]


# ── Tầng 0 ───────────────────────────────────────────────────────────────────
# Bảng nhỏ 5–20 hàng để NHÚNG THẲNG vào khối code của bài. Cùng tên cột, cùng
# tên món, cùng đơn vị với tầng 1 và tầng 2 — đó là toàn bộ lý do tầng 0 được
# sinh ra từ đây chứ không viết tay ở từng bài: hôm nay màn đọc dùng `store` /
# `amount` còn ca chấm dùng `region` / `qty`, ba bộ tên cho một khái niệm.

def tang0() -> dict:
    rows, _ = dung_bo_du_lieu()

    # 12 dòng đơn hàng cho PD01–PD11. Lấy từ tầng 1 (tuần 08–14/09) rồi ĐẢM BẢO
    # có đủ bốn khiếm khuyết: một bảng 12 hàng sạch bong thì PD09/PD10/PD30 chạy
    # trên nó không có gì để bắt, và đó là bài "tầng 0 nói dối" mà ta đang tránh.
    tuan = [r for r in rows if trong_cua_so_tang1(r)]
    ban = [r for r in tuan if r['mon'] != r['mon'].strip().lower()]
    rong = [r for r in tuan if r['thanh_toan'] == '']
    lech = [r for r in tuan
            if r['tong_tien'] != r['so_coc'] * r['don_gia']]
    dem = collections.Counter(
        (r['ma_don'], r['thoi_diem']) for r in tuan)
    trung = [r for r in tuan if dem[(r['ma_don'], r['thoi_diem'])] > 1]
    sach = [r for r in tuan
            if r not in ban and r not in rong and r not in lech
            and dem[(r['ma_don'], r['thoi_diem'])] == 1]
    nho: list[dict] = []
    for nguon, n in ((sach, 7), (ban, 1), (rong, 1), (lech, 1), (trung, 2)):
        nho.extend(nguon[:n])
    nho = nho[:12]
    nho.sort(key=lambda d: d['thoi_diem'])

    # Ma trận ngày × món cho M2: SỐ THUẦN, hình chữ nhật, cộng tay kiểm được.
    ngay5 = sorted({r['thoi_diem'][:10] for r in tuan})[:5]
    mon3 = ['ca-phe-sua', 'ca-phe-den', 'latte']
    ma_tran = []
    for ng in ngay5:
        ma_tran.append([sum(r['so_coc'] for r in tuan
                            if r['thoi_diem'][:10] == ng
                            and r['mon'] == m and r['quay'] == 'Q1')
                        for m in mon3])

    # Bảng ngày × quầy mang Ô TRỐNG THẬT: 7 ngày đầu tháng 1, Quầy 2 chưa mở
    # (05/05). `None` ở đây nghĩa là CHƯA MỞ, không phải BÁN 0 — NP17/PD08/PD17.
    ngay_1 = [f'2025-01-{d:02d}' for d in range(2, 9)]
    ngay_quay = []
    for ng in ngay_1:
        hang = []
        for q in ('Q1', 'Q2'):
            if dt.date.fromisoformat(ng) < QUAY_MO[q]:
                hang.append(None)
            else:
                hang.append(sum(r['so_coc'] for r in rows
                                if r['thoi_diem'][:10] == ng
                                and r['quay'] == q))
        ngay_quay.append(hang)

    return {
        'donVi': {'tien': 'VNĐ', 'luong': 'g / ml'},
        'bangGia': {m: GIA[m] for m in
                    ['ca-phe-den', 'ca-phe-sua', 'bac-xiu', 'latte', 'tra-dao']},
        'motDongHoaDon': [nho[0]['so_coc'], nho[0]['don_gia']],
        'soCocHaiBuoi': [
            sum(r['so_coc'] for r in tuan
                if r['thoi_diem'][:10] == ngay5[0]
                and int(r['thoi_diem'][11:13]) < 13),
            sum(r['so_coc'] for r in tuan
                if r['thoi_diem'][:10] == ngay5[0]
                and int(r['thoi_diem'][11:13]) >= 13),
        ],
        'maTranNgayMon': {'ngay': ngay5, 'mon': mon3, 'so_coc': ma_tran},
        'bangNgayQuay': {'ngay': ngay_1, 'quay': ['Q1', 'Q2'],
                         'so_coc': ngay_quay},
        'donHangNho': nho,
        'quay': d_quay(),
        'mon': d_mon(),
        'nguyenLieu': d_nguyen_lieu(),
    }


def _lit(v) -> str:
    return 'None' if v is None else repr(v)


def viet_tang0(t0: dict) -> list[tuple[Path, int]]:
    ra = []
    RA_DEV.mkdir(parents=True, exist_ok=True)

    p = RA_DEV / 'tang0.json'
    p.write_text(json.dumps(t0, ensure_ascii=False, indent=2) + '\n',
                 encoding='utf-8', newline='\n')
    ra.append((p, p.stat().st_size))

    # Bản .py để người soạn `import` khi dựng bài, và để chép-dán vào khối code.
    L = ['# -*- coding: utf-8 -*-',
         '"""Tầng 0 của bộ dữ liệu Quán Hạt Rang — bảng nhỏ nhúng thẳng vào bài.',
         '',
         'SINH TỰ ĐỘNG bởi scripts/pe-da/gen_dulieu.py — đừng sửa tay.',
         'Đơn vị tiền: VNĐ. Đơn vị nguyên liệu: g / ml.',
         '"""', '']
    L.append('BANG_GIA = {')
    for k, v in t0['bangGia'].items():
        L.append(f'    {k!r}: {v},')
    L.append('}')
    L.append('')
    L.append(f'MOT_DONG_HOA_DON = ({t0["motDongHoaDon"][0]}, '
             f'{t0["motDongHoaDon"][1]})  # (so_coc, don_gia)')
    L.append(f'SO_COC_HAI_BUOI = {tuple(t0["soCocHaiBuoi"])}  # (sáng, chiều)')
    L.append('')
    mt = t0['maTranNgayMon']
    L.append(f'NGAY = {mt["ngay"]!r}')
    L.append(f'MON_3 = {mt["mon"]!r}')
    L.append('SO_COC_NGAY_MON = [')
    for h in mt['so_coc']:
        L.append(f'    {h!r},')
    L.append(']')
    L.append('')
    nq = t0['bangNgayQuay']
    L.append('# None = quầy CHƯA MỞ, không phải bán 0 cốc (Quầy 2 mở 05/05/2025).')
    L.append(f'NGAY_DAU_NAM = {nq["ngay"]!r}')
    L.append('SO_COC_NGAY_QUAY = [')
    for h in nq['so_coc']:
        L.append('    [' + ', '.join(_lit(x) for x in h) + '],')
    L.append(']')
    L.append('')
    L.append('# 12 dòng đơn hàng, CÓ ĐỦ bốn khiếm khuyết của bảng đầy.')
    L.append('DON_HANG_NHO = {')
    for c in COT_DON_HANG:
        L.append(f'    {c!r}: {[r[c] for r in t0["donHangNho"]]!r},')
    L.append('}')
    L.append('')
    for ten, khoa, cot in (('QUAY', 'quay', ['quay', 'ten', 'khu_vuc', 'ngay_mo']),
                           ('MON', 'mon', ['mon', 'ten_mon', 'nhom', 'gia_niem_yet']),
                           ('NGUYEN_LIEU', 'nguyenLieu',
                            ['mon', 'nguyen_lieu', 'luong', 'don_vi'])):
        L.append(f'{ten} = {{')
        for c in cot:
            L.append(f'    {c!r}: {[r[c] for r in t0[khoa]]!r},')
        L.append('}')
        L.append('')
    p = RA_DEV / 'tang0.py'
    p.write_text('\n'.join(L), encoding='utf-8', newline='\n')
    ra.append((p, p.stat().st_size))

    # Bản .md: khối code chép-dán được, đúng thứ tự module dùng tới.
    M = ['# Tầng 0 — bảng nhỏ chép thẳng vào khối code của bài', '',
         '**SINH TỰ ĐỘNG** bởi `scripts/pe-da/gen_dulieu.py`. Đừng sửa tay: sửa',
         'ở đây là tạo ra một bộ từ vựng thứ hai, đúng cái bệnh mà bộ dữ liệu này',
         'ra đời để chữa (hôm nay màn đọc dùng `store`/`amount`, ca chấm dùng',
         '`region`/`qty`).', '',
         'Đơn vị tiền **VNĐ**, nguyên liệu **g / ml**. Lược đồ: [LUOC-DO.md](../LUOC-DO.md).',
         '']
    M += ['## PY12 — `dict` tra giá theo tên món', '', '```python',
          'BANG_GIA = ' + json.dumps(t0['bangGia'], ensure_ascii=False)
          .replace('"', "'"), '```', '']
    M += ['## PY11 — một dòng đã chốt đơn, `tuple`', '', '```python',
          f'dong = ({t0["motDongHoaDon"][0]}, {t0["motDongHoaDon"][1]})'
          '  # (so_coc, don_gia), đơn vị VNĐ', '```', '']
    M += ['## M2 — ma trận `ngày × món` (số cốc, Quầy 1)', '', '```python',
          f'ngay = {mt["ngay"]!r}', f'mon = {mt["mon"]!r}',
          'so_coc = [']
    for h in mt['so_coc']:
        M.append(f'    {h!r},')
    M += [']', '```', '']
    M += ['## NP17 / PD08 / PD17 / PD20 — ô trống nghĩa là CHƯA MỞ', '',
          'Quầy 2 mở ngày 05/05/2025, nên tuần đầu tháng 1 nó không có số — và',
          '`None` ở đây **không** phải "bán 0 cốc". Đó là cả bài học.', '',
          '```python', f'ngay = {nq["ngay"]!r}', "quay = ['Q1', 'Q2']",
          'so_coc = [']
    for h in nq['so_coc']:
        M.append('    [' + ', '.join(_lit(x) for x in h) + '],')
    M += [']', '```', '']
    M += ['## PD01–PD11 — 12 dòng đơn hàng, có đủ bốn khiếm khuyết', '',
          '```python', 'don_hang = {']
    for c in COT_DON_HANG:
        M.append(f'    {c!r}: {[r[c] for r in t0["donHangNho"]]!r},')
    M += ['}', '```', '']
    for tieu, khoa, cot in (
            ('PD16 / PD17 — bảng tra `quay` (3 quầy; `don_hang` chỉ có 2)',
             'quay', ['quay', 'ten', 'khu_vuc', 'ngay_mo']),
            ('PD26 / VZ27 / RD03 — thực đơn `mon` (12 món, 4 nhóm)',
             'mon', ['mon', 'ten_mon', 'nhom', 'gia_niem_yet']),
            ('SY25–SY28 — `nguyen_lieu`, quan hệ nhiều–nhiều',
             'nguyenLieu', ['mon', 'nguyen_lieu', 'luong', 'don_vi'])):
        M += [f'## {tieu}', '', '```python', f'{khoa.lower()} = {{']
        for c in cot:
            M.append(f'    {c!r}: {[r[c] for r in t0[khoa]]!r},')
        M += ['}', '```', '']
    p = RA_DEV / 'tang0.md'
    p.write_text('\n'.join(M), encoding='utf-8', newline='\n')
    ra.append((p, p.stat().st_size))
    return ra


# ──────────────────────────────────────────────────────────────────────────────
# 8. `--kiem` — ĐO LẠI từng đặc tính cố ý nhúng
# ──────────────────────────────────────────────────────────────────────────────
# Phần này nằm TRONG cùng một file có chủ đích: `py -I` chạy ở chế độ cô lập và
# KHÔNG thêm thư mục script vào `sys.path`, nên một module em `kiem_dulieu.py`
# sẽ ném ModuleNotFoundError — mà `-I` là đúng cờ AGENTS.md yêu cầu cho script
# đọc dữ liệu tải về. Một file, không có đường chạy sai.

def _cv(xs) -> float:
    xs = list(xs)
    return statistics.pstdev(xs) / statistics.mean(xs)


def do_gio_cc0(p: str) -> dict[int, float]:
    """Đo lại tỉ lệ giờ từ CHÍNH file CC0, để `TI_LE_GIO_CC0` không thành một
    con số chép tay mà không ai kiểm lại được."""
    rows = list(csv.DictReader(open(p, encoding='utf-8')))
    d = collections.Counter(int(r['datetime'][11:13]) for r in rows)
    n = sum(d.values())
    return {g: d[g] / n * 100 for g in sorted(d)}


def bao_cao(rows: list[dict], do: dict[str, int], tuan: list[dict],
            cc0: str | None) -> None:
    print('\n' + '=' * 72)
    print('BẢNG SO PHÂN BỐ GIỜ — bộ tự sinh so với bộ CC0 thật')
    print('=' * 72)
    cc0_do = do_gio_cc0(cc0) if cc0 else None
    if cc0_do:
        lech = max(abs(cc0_do[g] - TI_LE_GIO_CC0[g]) for g in TI_LE_GIO_CC0)
        print(f'(đo lại từ {cc0}: lệch lớn nhất so với hằng TI_LE_GIO_CC0 = '
              f'{lech:.3f} điểm %)')
    gio_all = collections.Counter(int(r['thoi_diem'][11:13]) for r in rows)
    q1_tt = collections.Counter(
        int(r['thoi_diem'][11:13]) for r in rows
        if r['quay'] == 'Q1'
        and dt.date.fromisoformat(r['thoi_diem'][:10]).weekday() < 5)
    n_all, n_q1 = sum(gio_all.values()), sum(q1_tt.values())
    print(f'{"giờ":>4} {"CC0 thật":>9} {"trọng số":>9} {"tự sinh":>9} '
          f'{"Q1 ngày thường":>15}   lấy từ')
    for g in sorted(TRONG_SO_GIO):
        print(f'{g:02d}h  {TI_LE_GIO_CC0[g]:8.2f}% {TRONG_SO_GIO[g]:8.2f}% '
              f'{gio_all[g] / n_all * 100:8.2f}% {q1_tt[g] / n_q1 * 100:14.2f}%'
              f'   CC0 {GIO_LAY_TU[g]:02d}h')
    print(f'{"CV":>4} {_cv(TI_LE_GIO_CC0.values()):9.3f} '
          f'{_cv(TRONG_SO_GIO.values()):9.3f} '
          f'{_cv(gio_all[g] for g in TRONG_SO_GIO):9.3f} '
          f'{_cv(q1_tt[g] for g in TRONG_SO_GIO):15.3f}')
    bang_nhau = (sorted(round(v, 2) for v in TI_LE_GIO_CC0.values())
                 == sorted(round(v, 2) for v in TRONG_SO_GIO.values()))
    print(f'trọng số là HOÁN VỊ của vector CC0: {bang_nhau}  '
          f'(nên CV của hai cột giữa BẰNG NHAU — đó là phép kiểm)')
    print(f'đỉnh:  CC0 {max(TI_LE_GIO_CC0, key=TI_LE_GIO_CC0.get)}h  →  '
          f'tự sinh {max(gio_all, key=gio_all.get)}h')

    print('\n' + '=' * 72)
    print('ĐẶC TÍNH CỐ Ý NHÚNG — số đo thật')
    print('=' * 72)
    n = len(rows)
    print(f'don_hang                     {n:,} hàng')
    thu = collections.Counter(
        dt.date.fromisoformat(r['thoi_diem'][:10]).weekday() for r in rows)
    print(f'cuối tuần khác ngày thường   CV theo thứ = '
          f'{_cv(thu[i] for i in range(7)):.3f}  (đòi ≥ 0,15; '
          f'dirty_cafe_sales = 0,019)')
    print('                             ' + ' · '.join(
        f'{["T2","T3","T4","T5","T6","T7","CN"][i]} {thu[i]}'
        for i in range(7)))
    thang = collections.Counter(r['thoi_diem'][:7] for r in rows)
    # CV theo tháng của CẢ BẢNG trộn hai chuyện: mùa, VÀ việc Quầy 2 mở từ
    # tháng 5. Nên in thêm CV chỉ của Q1 — đó mới là con số nói riêng về mùa.
    t_q1 = collections.Counter(r['thoi_diem'][:7] for r in rows
                               if r['quay'] == 'Q1')
    print(f'mùa trong năm                CV theo tháng = '
          f'{_cv(thang[k] for k in sorted(thang)):.3f} (cả bảng, gồm cả việc '
          f'Q2 mở tháng 5) · {_cv(t_q1[k] for k in sorted(t_q1)):.3f} '
          f'(chỉ Q1 = mùa thuần)')
    dx = collections.Counter()
    for r in rows:
        m = r['mon'].strip().lower()
        if NHOM.get(m) == 'Đá xay':
            dx[r['thoi_diem'][:7]] += r['so_coc']
    print('   đá xay theo tháng          ' + ' '.join(
        f'{dx[k]}' for k in sorted(thang)) + '  (tháng 7 / tháng 1 = '
        f'{dx["2025-07"] / max(1, dx["2025-01"]):.2f}×)')

    ngay_q = collections.defaultdict(set)
    for r in rows:
        ngay_q[r['thoi_diem'][:10]].add(r['quay'])
    chua_mo = sum(1 for d, q in ngay_q.items() if 'Q2' not in q)
    print(f'Quầy 2 mở sau 4 tháng        {chua_mo} ngày KHÔNG có hàng nào của '
          f'Q2 (mở {QUAY[1][3]}) ⇒ NaN = CHƯA MỞ')
    moc = set()
    d = NGAY_DAU
    while d <= NGAY_CUOI:
        moc.add(d.isoformat())
        d += dt.timedelta(days=1)
    thieu = sorted(moc - set(ngay_q))
    print(f'ngày đóng cửa                {len(thieu)} mốc ngày KHUYẾT: '
          f'{thieu[0]} … {thieu[-1]}')
    print(f'thanh_toan rỗng              {do["thanh_toan_rong"]} dòng = '
          f'{do["thanh_toan_rong"] / n * 100:.2f}%')
    print(f'mon lệch hoa/thường+trắng    {do["mon_ban"]} dòng = '
          f'{do["mon_ban"] / n * 100:.2f}%')
    dem = collections.Counter(tuple(r[c] for c in COT_DON_HANG) for r in rows)
    thuc_trung = sum(v - 1 for v in dem.values() if v > 1)
    print(f'dòng TRÙNG toàn phần         {do["trung"]} dòng nhân bản = '
          f'{do["trung"] / n * 100:.2f}%  (đếm lại trên bảng: {thuc_trung})')
    lech = [r for r in rows if r['tong_tien'] != r['so_coc'] * r['don_gia']]
    print(f'tong_tien != so_coc*don_gia  {len(lech)} dòng = '
          f'{len(lech) / n * 100:.3f}%  ⇒ `assert` ở PD30 có thứ thật để bắt')
    ngoai = sorted((r['so_coc'] for r in rows if r['so_coc'] >= 10),
                   reverse=True)
    print(f'ngoại lai so_coc             {len(ngoai)} đơn ≥ 10 cốc: {ngoai}')
    gia_la = {r['quay'] for r in rows} - {q[0] for q in QUAY}
    chua_don = {q[0] for q in QUAY} - {r['quay'] for r in rows}
    n_la = sum(1 for r in rows if r['quay'] in gia_la)
    khop = len({r['quay'] for r in rows} & {q[0] for q in QUAY})
    print(f'bảng `quay` {khop}/3 khớp          {khop}/3 quầy danh mục có đơn; '
          f'chưa có đơn: {sorted(chua_don)}')
    print(f'   đơn chưa khớp danh mục    {n_la} dòng mã {sorted(gia_la)} '
          f'⇒ merge(indicator=True) ra left_only CẢ HAI CHIỀU')
    gv = sum(1 for r in rows
             if r['don_gia'] != GIA.get(r['mon'].strip().lower(), r['don_gia']))
    print(f'   đơn giá lệch danh mục     {gv} dòng (giờ vàng 14–16h, HỢP LỆ) '
          f'⇒ PD32 phải đối chiếu rồi GIẢI THÍCH')
    nl = collections.Counter(x[1] for x in NGUYEN_LIEU)
    nhieu = [f'{k}×{v}' for k, v in nl.most_common(4)]
    print(f'nhiều–nhiều món↔nguyên liệu  {len(NGUYEN_LIEU)} cặp · '
          f'{len(MON)} món · {len(nl)} nguyên liệu; dùng chung: '
          f'{" ".join(nhieu)}')
    the = collections.Counter(r['ma_the_tich_diem'] for r in rows
                              if r['ma_the_tich_diem'])
    print(f'ma_the_tich_diem             {len(the)} thẻ / {sum(the.values())} '
          f'lượt ({sum(the.values()) / n * 100:.1f}% đơn); '
          f'nhiều nhất {max(the.values())} lượt (trần {TRAN_LUOT_MOI_THE})')
    print(f'định danh người              0 cột — không tên, không tuổi, '
          f'không điện thoại, không số thẻ thật')
    print(f'đơn vị tiền                  VNĐ, số nguyên; doanh thu cả kỳ = '
          f'{sum(r["tong_tien"] for r in rows):,} VNĐ')

    print('\n' + '=' * 72)
    print(f'TẦNG 1 — tuần {TANG1_DAU} … {TANG1_CUOI}: {len(tuan)} hàng')
    print('=' * 72)
    t_rong = sum(1 for r in tuan if r['thanh_toan'] == '')
    t_ban = sum(1 for r in tuan if r['mon'] != r['mon'].strip().lower())
    t_lech = sum(1 for r in tuan
                 if r['tong_tien'] != r['so_coc'] * r['don_gia'])
    d2 = collections.Counter(tuple(r[c] for c in COT_DON_HANG) for r in tuan)
    t_trung = sum(v - 1 for v in d2.values() if v > 1)
    print(f'khiếm khuyết trong tầng 1: thanh_toan rỗng {t_rong} · mon bẩn '
          f'{t_ban} · trùng {t_trung} · lệch tổng {t_lech}')
    print(f'số giá trị cho hist/box:   {len(tuan)} (đòi ≥ 200) · '
          f'cả hai quầy: {sorted({r["quay"] for r in tuan})}')


# ──────────────────────────────────────────────────────────────────────────────
# 9. Chép bộ CC0 vào repo — tầng R
# ──────────────────────────────────────────────────────────────────────────────

NOTICE = f"""# NOTICE — nguồn và giấy phép của dữ liệu trong thư mục này

## `coffee-sales-cc0.csv` — DỮ LIỆU CỦA NGƯỜI KHÁC

| | |
|---|---|
| Nguồn | `tablegpt/CoffeeSales` trên Hugging Face |
| Địa chỉ tải | {CC0_NGUON} |
| Gốc xa hơn | Kaggle `ihelon/coffee-sales` |
| Giấy phép | **CC0 1.0 Universal (Public Domain Dedication)** — khớp ở CẢ HAI nơi (HF `cardData.license` và JSON-LD của trang Kaggle). Không cần ghi công, được phát hành lại, được sửa. |
| Ngày tải | {CC0_NGAY_DO} |
| Bản gốc | {CC0_SO_HANG} hàng, 6 cột, 201 113 byte |

### Đã SỬA gì so với bản gốc, và vì sao

**Cột `card` đã bị BỎ.** Bản gốc có 1 038 mã thẻ, và thẻ nhiều nhất xuất hiện
**122 lần**. Mã đã được thay (`ANON-0000-0000-0012`) nhưng TÍNH LIÊN KẾT còn
nguyên: bảng đó nói "người này mua 122 lần, vào những giờ này". Đó là định
nghĩa của dữ liệu giả danh theo hành vi, và dữ liệu theo dõi hành vi là dữ liệu
**NHẠY CẢM** theo Luật 91/2025 + Nghị định 356/2025 — cùng lý lẽ đã buộc lớp
`learning-events` của repo này phải có cổng đồng ý ở máy chủ. Khoá học gửi file
này tới trình duyệt của học viên thật, nên cột đó không đi cùng.

Không sửa gì khác: hàng, thứ tự, giá trị, tên năm cột còn lại giữ nguyên.

### ⚠️ ĐƠN VỊ TIỀN CỦA CỘT `money` KHÔNG XÁC ĐỊNH

Giá trị chạy từ 18,12 đến 40,00. **README của bộ gốc không nói đây là tiền gì,
và vòng tra ngày {CC0_NGAY_DO} không tìm ra câu trả lời.** Tác giả người Ukraine
nên UAH là khả năng — nhưng đó là SUY ĐOÁN, không phải số liệu, và nó không
được viết vào bài học như một sự thật.

Đây không phải một khiếm khuyết phải giấu: PD32 dạy nguyên văn *"khi giao báo
cáo, ghi đơn vị tiền"*, nên **việc đầu tiên phải làm với số liệu của người khác
là đi hỏi đơn vị** — và bài học nói ra đúng điều đó. Đừng quy đổi sang VNĐ: quy
đổi từ một đơn vị không biết là bịa.

Bộ dữ liệu TỰ SINH (`don_hang.csv` và ba bảng tra) thì ngược lại: đơn vị là
**VNĐ**, ghi rõ trong [LUOC-DO.md](../../../../scripts/pe-da/LUOC-DO.md).

## `don_hang.csv` · `quay.csv` · `mon.csv` · `nguyen_lieu.csv` — TỰ SINH

Sinh bởi `scripts/pe-da/gen_dulieu.py` (seed cố định {SEED_GOC}), thuộc về
chính dự án này. Không mang giấy phép của bên thứ ba nào. Phân bố giờ được
HIỆU CHUẨN theo bộ CC0 ở trên — xem `--kiem` của script.
"""


def chep_cc0(nguon: str) -> None:
    """Chép bộ CC0 vào repo, BỎ cột `card`. Để trong script chứ không chép tay
    một lần: ngày cần tải lại bản mới, phép bỏ cột phải đi theo, và một thao tác
    làm tay thì lần sau sẽ có người quên."""
    with open(nguon, encoding='utf-8', newline='') as f:
        rows = list(csv.DictReader(f))
    cot = [c for c in rows[0].keys() if c != 'card']
    assert 'card' not in cot, 'cột card phải bị bỏ — xem NOTICE.md'
    RA_WEB.mkdir(parents=True, exist_ok=True)
    p = RA_WEB / 'coffee-sales-cc0.csv'
    with p.open('w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=cot, lineterminator='\n',
                           extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)
    (RA_WEB / 'NOTICE.md').write_text(NOTICE, encoding='utf-8', newline='\n')
    print(f'tầng R → {p.name:18s} {p.stat().st_size:>9,} byte '
          f'({len(rows):,} hàng, {len(cot)} cột, đã bỏ `card`)')
    print(f'         {"NOTICE.md":18s} '
          f'{(RA_WEB / "NOTICE.md").stat().st_size:>9,} byte')


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--kiem', action='store_true', help='in bảng số đo')
    ap.add_argument('--cc0', metavar='CSV',
                    help='đo lại phân bố giờ từ chính file CC0 và so')
    ap.add_argument('--chep-cc0', metavar='CSV', dest='chep_cc0',
                    help='chép bộ CC0 vào repo sau khi BỎ cột `card`')
    a = ap.parse_args()

    rows, do = dung_bo_du_lieu()

    # ── Tầng 2: bảng đầy + ba bảng tra ──────────────────────────────────────
    b2 = {}
    b2['don_hang.csv'] = ghi_csv(RA_WEB / 'don_hang.csv', COT_DON_HANG, rows)
    b2['quay.csv'] = ghi_csv(RA_WEB / 'quay.csv',
                             ['quay', 'ten', 'khu_vuc', 'ngay_mo'], d_quay())
    b2['mon.csv'] = ghi_csv(RA_WEB / 'mon.csv',
                            ['mon', 'ten_mon', 'nhom', 'gia_niem_yet'], d_mon())
    b2['nguyen_lieu.csv'] = ghi_csv(
        RA_WEB / 'nguyen_lieu.csv',
        ['mon', 'nguyen_lieu', 'luong', 'don_vi'], d_nguyen_lieu())

    # ── Tầng 1: một tuần liền mạch ───────────────────────────────────────────
    tuan = [r for r in rows if trong_cua_so_tang1(r)]
    b1 = {}
    b1['don_hang_tuan.csv'] = ghi_csv(
        RA_DEV / 'tang1' / 'don_hang_tuan.csv', COT_DON_HANG, tuan)
    b1['quay.csv'] = ghi_csv(RA_DEV / 'tang1' / 'quay.csv',
                             ['quay', 'ten', 'khu_vuc', 'ngay_mo'], d_quay())
    b1['mon.csv'] = ghi_csv(RA_DEV / 'tang1' / 'mon.csv',
                            ['mon', 'ten_mon', 'nhom', 'gia_niem_yet'], d_mon())
    b1['nguyen_lieu.csv'] = ghi_csv(
        RA_DEV / 'tang1' / 'nguyen_lieu.csv',
        ['mon', 'nguyen_lieu', 'luong', 'don_vi'], d_nguyen_lieu())

    # ── Tầng 0 ───────────────────────────────────────────────────────────────
    b0 = viet_tang0(tang0())

    print(f'tầng 2 → {RA_WEB}')
    for k, v in b2.items():
        print(f'  {k:18s} {v:>9,} byte')
    print(f'tầng 1 → {RA_DEV / "tang1"}')
    for k, v in b1.items():
        print(f'  {k:18s} {v:>9,} byte')
    print(f'tầng 0 → {RA_DEV}')
    for p, v in b0:
        print(f'  {p.name:18s} {v:>9,} byte')
    if a.chep_cc0:
        chep_cc0(a.chep_cc0)

    print(f'\ndon_hang: {len(rows):,} hàng · tầng 1: {len(tuan):,} hàng')

    if a.kiem:
        bao_cao(rows, do, tuan, a.cc0)
    return 0


if __name__ == '__main__':
    sys.exit(main())
