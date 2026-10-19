#!/usr/bin/env python3
"""Sinh BẢN ĐỒ SAO (SVG) — CẢ BẦU TRỜI: 8 chòm, 48 ngôi = 48 bài.

    py scripts/star/build_sky.py                 # sinh ra frontend/public/map/star/
    py scripts/star/build_sky.py --stats         # thêm bảng đếm nét từng lớp
    py scripts/star/build_sky.py --css           # in khối .hit* cho css module
    py scripts/star/build_sky.py --do            # in bảng SỐ ĐO độ chói/bão hoà/tỉ lệ
    py scripts/star/build_sky.py --place-nhan    # in khối SKY_LABEL_PLACED
    py scripts/star/build_sky.py --out <thư mục> # sinh ra chỗ khác (ca test dùng)

Đặc tả: `design/v3/ban-do-sao.md`. Kiến trúc lặp theo `scripts/map/build_map.py`:
**Python sinh nét, TS giữ toạ độ và màu.**

── NĂM LUẬT CỦA TỆP NÀY ───────────────────────────────────────────────────

1. KHÔNG MỘT MÃ MÀU NÀO Ở ĐÂY. Mọi màu đọc từ `SKY_PROFILE_<TÊN>` trong
   `frontend/src/lib/star-map.ts`. `--profile light` sẽ chạy ngay khi ai đó
   thêm hằng đó — bộ sinh không biết gì về màu nên không phải viết lại.

2. ĐỘ DÀY NÉT KHÔNG ĐI QUA `nf()`. `nf()` làm tròn toạ độ về SỐ NGUYÊN của
   khung 1360 × 820 — đúng cho toạ độ, chết người cho bề rộng nét: bản vực
   từng render với `stroke-width="0"`, tức năm chục nghìn nét VÔ HÌNH, và nhìn
   ra đúng cái lỗi "mảng phẳng tô gradient" mà bản vẽ ấy sinh ra để chữa. Ở
   đây nguy hiểm hơn: nét chòm 1,15 và nét lưới 0,6 ĐỀU sẽ thành 0. Bề rộng
   đi qua `wf()`, có SÀN, và một ca test đếm lại.

3. KHÔNG `id`/`data-*` NÀO NGOÀI `data-lop`. Tranh vào trang bằng `<img>`, tức
   một tài liệu SVG RIÊNG bị cách ly: CSS của trang không khớp được selector
   nào bên trong, JS không `querySelector` vào được. Mọi `id` đặt cho lớp hover
   là byte chết tải ở mỗi lượt vào trang. Lớp hover là HTML CHỒNG LÊN, bám
   `[data-map-region]`, và nó đổi trạng thái bằng cách đổi giữa HAI tấm ảnh.

4. KHÔNG GRADIENT, KHÔNG `<filter>`. Quầng sao dựng bằng vòng đồng tâm mật độ
   ~1/r, tinh vân bằng MƯỜI BỐN đường đồng mức lồng nhau, mặt trời bằng 128
   vòng chia đều theo ĐỘ MỜ TÍCH LUỸ. Một ngoại lệ "chỉ cho quầng sao" là một
   cái lỗ để đúng cái lỗi gốc quay lại.

   Và luật này KHÔNG phải thứ đang hỏng khi bức bị chê "mảng phẳng tô
   gradient" — ngược lại. Phép đo ở `bo-cuc-hung-vi.md` §3.2 cho thấy mặt trời
   tham chiếu là một lõi phẳng bão hoà cộng một đuôi ~1/r^2,9, tức đúng thứ mà
   đĩa đồng tâm tái hiện chính xác được. Con số khép câu hỏi là BƯỚC LƯỢNG TỬ:
   128 vòng cho 1,78/255 mã màu mỗi vòng, dưới ngưỡng thấy dải (≈ 2 mã), trong
   khi 16 vòng của bản cũ cho 14,3 mã — thấy rõ, và đó là một PHẦN của cái
   "mảng phẳng". Chỗ luật thật sự cắn là DỐC LAMBERT trên tinh vân (14 bậc =
   ~12 mã), và nó được chữa bằng LẤM TẤM BIÊN chứ không bằng một ngoại lệ.

5. TẤT ĐỊNH. Chạy hai lần phải ra ĐÚNG một tệp — nhiễu đi qua hàm băm theo
   toạ độ, không qua `random`. Không thì mỗi lần build là một diff vô nghĩa.

6. MỘT TẤM = MỘT NHÓM LỚP, không phải cả bức. `SKY_TILES` ở TS chia 15 lớp
   thành bốn nhóm; mỗi nhóm ra một tệp, và chỉ nhóm CHÒM mới có bản nghỉ/bản
   rõ cho từng chòm. Nhân cách của bản mẫu (một tấm đủ lớp cho mỗi trạng thái)
   lên tám chòm là chín tấm, mỗi tấm cõng lại cả tinh vân và 1 250 sao nền —
   đo được ~160 KB một tấm, tức ~1,4 MB cho một trang. Chia lớp thì phần trời
   tải MỘT lần.

Trần dung lượng: `MAX_KB` mỗi tệp VÀ `MAX_TOTAL_KB` cho cả bộ — script TỰ CHẶN
cả hai. Mốc tổng lấy 900 KB của đặc tả §9.2 (bằng đúng phần ẢNH của một trang
di động trung bình theo Web Almanac 2024).
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TS = ROOT / "frontend" / "src" / "lib" / "star-map.ts"
OUT = ROOT / "frontend" / "public" / "map" / "star"

# Trần dung lượng MỖI tệp, và trần cho CẢ BỘ. Hai con số vì hai cách hỏng
# khác nhau: một tệp phình ra làm chậm đúng một lớp (và tấm `troi` là tấm nặng
# nhất, nó quyết LCP), còn cả bộ phình ra làm chậm cả trang. Bản mẫu một chòm
# lấy 240 KB cho một ô crop 660 × 390; đây là cả khung 1360 × 820 nên trần mỗi
# tệp nới lên, còn trần TỔNG thì lấy đúng 900 KB của đặc tả §9.2.
MAX_KB = 420
MAX_TOTAL_KB = 900

# Một con số duy nhất để hạ/nâng mật độ cả bức, như `DENSITY` của build_map.py.
DENSITY = 1.0


# ═══════════════════════════════════════════════════════════════════════
# 0 · đọc dữ liệu từ star-map.ts
# ═══════════════════════════════════════════════════════════════════════
#
# Chép cách làm của `build_map.py::read_ts` — một bộ phân tích literal rất thô,
# đủ cho các khối ở `star-map.ts` (khoá là định danh, chuỗi nháy đơn, có dấu
# phẩy thừa cuối). Không `import` từ `build_map.py`: tệp đó đọc `world-map.ts`
# ngay lúc nạp module, nên một thay đổi ở bản đồ vực sẽ làm bản đồ sao vỡ build
# vì một lý do chẳng liên quan.


def _obj(block: str):
    s = re.sub(r"/\*[\s\S]*?\*/", " ", block)
    s = re.sub(r"//[^\n]*", " ", s)
    s = re.sub(r"([{,]\s*)([A-Za-z_$][\w$]*)\s*:", r'\1"\2":', s)
    s = s.replace("'", '"')
    s = re.sub(r",(\s*[}\]])", r"\1", s)
    return json.loads(s)


SRC = TS.read_text(encoding="utf-8")


def grab(name: str):
    """Literal của `export const <name>` → dữ liệu Python."""
    m = re.search(r"export const %s\b[^=]*=\s*" % re.escape(name), SRC)
    if not m:
        raise SystemExit("star-map.ts thiếu %s" % name)
    i = m.end()
    open_ch = SRC[i]
    close_ch = {"{": "}", "[": "]"}.get(open_ch)
    if close_ch is None:
        raise SystemExit("%s không mở bằng { hoặc [" % name)
    depth = 0
    for j in range(i, len(SRC)):
        if SRC[j] == open_ch:
            depth += 1
        elif SRC[j] == close_ch:
            depth -= 1
            if depth == 0:
                return _obj(SRC[i:j + 1])
    raise SystemExit("không đóng được khối %s" % name)


FRAME = grab("SKY_FRAME")
TILES = grab("SKY_TILES")
MW = grab("SKY_MILKYWAY")
ZOD = grab("SKY_ZODIAC")
LIGHT = grab("SKY_LIGHT")
BUDGET = grab("SKY_BUDGET")
HORIZON = grab("SKY_HORIZON")
GRID = grab("SKY_GRID")
FIELD = grab("SKY_FIELD")
NEB = grab("SKY_NEBULA")
MAG = grab("SKY_MAGNITUDE")
LINK = grab("SKY_LINK")
LBL = grab("SKY_LABEL")
COURSE = grab("SKY_COURSE")
HIT = grab("SKY_HIT")
ZOOM = grab("SKY_ZOOM")
PLANET = grab("SKY_PLANET")
PLACED = grab("SKY_LABEL_PLACED")
LAYERS = grab("SKY_LAYERS")
KEYS = grab("SKY_CONSTELLATION_KEYS")
CONS = [grab("SKY_%s" % k) for k in KEYS]

W, H = FRAME["width"], FRAME["height"]

# Bản mẫu một chòm vẽ một Ô CROP (`SKY_VIEW`, đã bỏ ở TS) nên cả phần thân
# dưới đây nói bằng `VIEW`. Giờ ô vẽ ĐÚNG BẰNG khung, nên giữ cái tên và cho nó
# bằng khung: đổi tên ở ba chục chỗ chỉ để xoá một khái niệm không còn khác
# nhau là một diff không ai đọc được, trong khi toạ độ sao thì chưa bao giờ là
# toạ độ của ô crop — chúng luôn là toạ độ THẬT trong khung 1360 × 820.
VIEW = {"x": 0, "y": 0, "width": W, "height": H}


# ═══════════════════════════════════════════════════════════════════════
# 1 · số ca chấm → bậc độ sáng (đọc từ GIÁO TRÌNH, không từ TS)
# ═══════════════════════════════════════════════════════════════════════

LESSONS = ROOT / "scripts" / "pe-v4" / "out-advanced" / "lessons"


def doc_so_ca() -> dict[str, int]:
    """`{mã bài: số ca chấm}` từ `step_4.tests`.

    Vì sao không viết bán kính vào TS: thêm một ca chấm vào một bài thì ngôi
    sao của nó TỰ to lên, nên bản đồ không bao giờ lệch với giáo trình. Đó cũng
    là nghĩa nói được bằng một câu trong chú giải: sao càng sáng, bài càng đòi
    nhiều thứ phải qua."""
    if not LESSONS.is_dir():
        raise SystemExit("thiếu %s — chạy `py scripts/pe-v4/build_advanced.py`" % LESSONS)
    out: dict[str, int] = {}
    for p in sorted(LESSONS.glob("*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        code = d.get("lesson_code")
        body = d.get("content_json", d)
        s4 = body.get("step_4") or {}
        tests = s4.get("tests")
        if code and isinstance(tests, list):
            out[code] = len(tests)
    return out


SO_CA = doc_so_ca()


def doc_ten_bai() -> dict[str, str]:
    """`{mã bài: tên bài}` từ `title`, ĐÃ BỎ tiền tố mã bài.

    Giáo trình ghi `P01 · Program, process và tài nguyên`; chip ở tỉ lệ gần đã
    có một ô riêng cho mã bài, nên để nguyên tiền tố là in `P01` hai lần cạnh
    nhau. Cắt bằng chính MÃ BÀI chứ không bằng "mọi thứ trước dấu ·": một tên
    bài có dấu `·` trong thân sẽ bị cắt mất nửa đầu, và chuyện đó sẽ không ai
    thấy cho tới lần giáo trình đặt một cái tên như thế."""
    out: dict[str, str] = {}
    for p in sorted(LESSONS.glob("*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        code, ten = d.get("lesson_code"), d.get("title")
        if not code or not isinstance(ten, str):
            continue
        tien = "%s · " % code
        out[code] = ten[len(tien):] if ten.startswith(tien) else ten
    return out


TEN_BAI = doc_ten_bai()


def doc_bai_cua() -> list[str]:
    """MÃ các bài CỬA TỰ KIỂM TRA — ĐẾM TỪ CỜ `step_4.gate`, không viết cứng.

    Đây là nguồn duy nhất cho ba hành tinh của §7.2, và nó là CHÍNH chỗ backend
    (`isSelfTestGateLesson`) và frontend đang đọc. AGENTS.md dặn đúng chuyện
    này: *"đừng viết test khoá cứng con số 3 — thêm cửa mới là server tự khoá
    theo"*. Ở đây hệ quả là bản đồ TỰ MỌC thêm một hành tinh, không phải một
    người phải nhớ sửa một con số thứ hai.

    (Hiện đếm được ba: R02 ở `sort_order` 20, DA01 ở 47, DA02 ở 48. Con số ấy
    ghi ra đây làm MỘT PHÉP ĐO ngày 19/10/2026, không làm một hằng.)"""
    out = []
    for p in sorted(LESSONS.glob("*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        code = d.get("lesson_code")
        body = d.get("content_json", d)
        s4 = body.get("step_4") or {}
        if code and s4.get("gate"):
            out.append(code)
    return out


BAI_CUA = doc_bai_cua()


def bac(tests: int) -> dict:
    for t in MAG["tiers"]:
        if tests >= t["minTests"]:
            return t
    return MAG["tiers"][-1]


def ban_kinh(tests: int) -> float:
    """`r = base × ratio^(5 − bậc)` — hàm MŨ, không tuyến tính, vì bậc độ sáng
    vốn là thang log (tỉ số Pogson 2,512 lần độ rọi mỗi bậc). Thang tuyến tính
    "mỗi bậc bớt 0,65 px" là một thang không tồn tại trong nghề.

    Cùng công thức ở `starMagnitude()` phía TS, và ca test gọi hàm TS đó rồi so
    với bán kính ĐỌC TỪ SVG — nên "ai đó chỉnh bán kính cho đẹp" là một ca đỏ."""
    r = MAG["base"] * MAG["ratio"] ** (5 - bac(tests)["tier"])
    return max(MAG["floor"], round(r, 2))


# ═══════════════════════════════════════════════════════════════════════
# 2 · nhiễu, hình học, in số
# ═══════════════════════════════════════════════════════════════════════


class Noise:
    """Nhiễu giá trị 2D nội suy mượt + fbm. Tất định theo hạt giống."""

    def __init__(self, seed: int):
        self.seed = seed & 0xFFFFFFFF

    def h(self, i: int, j: int) -> float:
        n = (i * 73856093) ^ (j * 19349663) ^ (self.seed * 83492791)
        n &= 0xFFFFFFFF
        n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
        return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0

    def v(self, x: float, y: float) -> float:
        i, j = math.floor(x), math.floor(y)
        fx, fy = x - i, y - j
        sx = fx * fx * (3 - 2 * fx)
        sy = fy * fy * (3 - 2 * fy)
        a, b = self.h(i, j), self.h(i + 1, j)
        c, d = self.h(i, j + 1), self.h(i + 1, j + 1)
        return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy

    def fbm(self, x: float, y: float, octaves: int, lac: float, gain: float) -> float:
        """`lacunarity` 2,01 chứ không 2,00, và XOAY MIỀN giữa hai quãng — cả
        hai để các quãng nhiễu không xếp thẳng hàng và tạo hoa văn giả (Inigo
        Quilez). Họ hàng của luật "góc nét −41°, không −45°" ở bản vực."""
        amp, acc, norm = 1.0, 0.0, 0.0
        ca, sa = math.cos(0.517), math.sin(0.517)
        for _ in range(octaves):
            acc += amp * self.v(x, y)
            norm += amp
            amp *= gain
            x, y = (x * ca - y * sa) * lac, (x * sa + y * ca) * lac
        return acc / norm


NZ = Noise(0x5EED)
RN = Noise(0xC0FFEE)
# Bóp méo miền: HẠT GIỐNG KHÁC NHAU cho mỗi kênh. Chính IQ nói các vector lệch
# `(5,2)`/`(1,3)` trong bản gốc KHÔNG có nghĩa gì — chúng chỉ để lấy ra những
# giá trị fBm khác nhau từ một hàm `fbm()` duy nhất. Hạt giống riêng sạch hơn
# và tách tương quan hoàn toàn.
WQ = [Noise(0xA11CE), Noise(0xB0B), Noise(0xC0DE), Noise(0xDEAD)]


def rnd(k: float, j: float = 0.0) -> float:
    """Số giả ngẫu nhiên 0..1 tất định theo KHOÁ — thay cho `random.random()`
    để thêm một nét ở giữa file không làm xê dịch mọi nét sau nó."""
    return RN.h(int(k * 7919) & 0xFFFF, int(j * 104729) & 0xFFFF)


def nf(v: float) -> str:
    """TOẠ ĐỘ làm tròn về số nguyên của khung 1360 × 820. Không phải để cho
    gọn mã: mỗi nét tốn thêm 4–6 byte cho phần thập phân, mà sai số lớn nhất
    là nửa đơn vị khung (~0,4 px trên màn)."""
    s = "%.0f" % v
    return "0" if s == "-0" else s


def wf(v: float) -> str:
    """BỀ RỘNG NÉT — hàm làm tròn RIÊNG, và đây là cái bẫy đắt nhất của kho mã
    này. `nf()` làm tròn về số nguyên, nên nét 0,6 (lưới) và 1,15 (nét chòm)
    đều thành `stroke-width="0"`: cả bức render với nét vô hình, và nhìn ra
    đúng "mảng phẳng tô gradient" — tức chính cái lỗi mà bản vẽ này sinh ra để
    chữa. Hai chữ số thập phân, và một SÀN để không có đường nào về 0."""
    return "%g" % max(0.05, round(v, 2))


def of(v: float) -> str:
    return "%g" % max(0.01, min(1.0, round(v, 2)))


def pl(pts, close=False) -> str:
    d = "M%s %s" % (nf(pts[0][0]), nf(pts[0][1]))
    px, py = float(nf(pts[0][0])), float(nf(pts[0][1]))
    for p in pts[1:]:
        qx, qy = float(nf(p[0])), float(nf(p[1]))
        if qx == px and qy == py:
            continue
        d += "l%s %s" % (nf(qx - px), nf(qy - py))
        px, py = qx, qy
    return d + "Z" if close else d


def dot(x, y) -> str:
    """Chấm = đoạn cực ngắn với đầu nét tròn, đường kính = bề rộng nét. Rẻ hơn
    `<circle>` khoảng ba lần và gộp được vào cùng một `<path>`."""
    return "M%s %sh.1" % (nf(x), nf(y))


def wobble_line(x1, y1, x2, y2, amp):
    """Nét "vẽ tay": một nhịp sin mỗi ~70 px, lệch ±amp, hạt giống cố định.
    Nét thẳng tuyệt đối đọc ra "sơ đồ", nét hơi rung đọc ra "vẽ tay"."""
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy)
    if L < 10 or amp <= 0:
        return [(x1, y1), (x2, y2)]
    k = max(2, int(L / 9))
    nx, ny = -dy / L, dx / L
    pts = []
    for i in range(k + 1):
        t = i / k
        w = (NZ.v(x1 * 0.07 + t * 3.1, y1 * 0.07 + t * 1.7) - 0.5) * 2 * amp
        w *= math.sin(math.pi * t)
        pts.append((x1 + dx * t + nx * w, y1 + dy * t + ny * w))
    return pts


def seg_dist(px, py, x1, y1, x2, y2) -> float:
    dx, dy = x2 - x1, y2 - y1
    L2 = dx * dx + dy * dy
    if L2 <= 0:
        return math.hypot(px - x1, py - y1)
    t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / L2))
    return math.hypot(px - x1 - dx * t, py - y1 - dy * t)


def seg_cross(a, b, c, d) -> bool:
    def side(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    d1, d2 = side(c, d, a), side(c, d, b)
    d3, d4 = side(a, b, c), side(a, b, d)
    return ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0))


def convex_hull(pts):
    p = sorted(set((round(x, 3), round(y, 3)) for x, y in pts))
    if len(p) < 3:
        return p

    def half(seq):
        out = []
        for q in seq:
            while len(out) >= 2:
                (ax, ay), (bx, by) = out[-2], out[-1]
                if (bx - ax) * (q[1] - ay) - (by - ay) * (q[0] - ax) <= 0:
                    out.pop()
                else:
                    break
            out.append(q)
        return out

    return half(p)[:-1] + half(p[::-1])[:-1]


def inflate_hull(hull, pad):
    cx = sum(p[0] for p in hull) / len(hull)
    cy = sum(p[1] for p in hull) / len(hull)
    out = []
    for x, y in hull:
        d = math.hypot(x - cx, y - cy) or 1.0
        out.append((x + (x - cx) / d * pad, y + (y - cy) / d * pad))
    return out


def dist_to_hull(x, y, hull) -> float:
    """Khoảng cách tới bao lồi; ÂM nếu điểm nằm trong."""
    inside = True
    best = 1e9
    n = len(hull)
    for i in range(n):
        ax, ay = hull[i]
        bx, by = hull[(i + 1) % n]
        if (bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0:
            inside = False
        best = min(best, seg_dist(x, y, ax, ay, bx, by))
    return -best if inside else best


def smoothstep(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


# ═══════════════════════════════════════════════════════════════════════
# 3 · màu: đo tương phản, trộn — KHÔNG mã màu nào viết ở đây
# ═══════════════════════════════════════════════════════════════════════


def hex_rgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def luminance(rgb) -> float:
    """Độ chói tương đối WCAG. Cần vì đặc tả đặt hai TRẦN ĐỘ CHÓI (§3.1) và
    luật đặt nhãn theo độ chói (§8.4) — và nói rõ script phải TỰ ĐO được từ
    chính thứ nó vừa sinh, chứ không phải nhận một lời dặn."""
    c = []
    for v in rgb:
        s = v / 255.0
        c.append(s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def over(base, top, alpha):
    return tuple(base[i] + (top[i] - base[i]) * alpha for i in range(3))


# ═══════════════════════════════════════════════════════════════════════
# 4 · lớp mực
# ═══════════════════════════════════════════════════════════════════════


class Ink:
    """Gom nét theo (loại, màu, bề rộng, độ mờ) để mỗi nhóm là MỘT `<path>`.

    Độ dày và độ mờ được làm tròn về BẬC: mỗi giá trị khác nhau là một `<path>`
    riêng với đủ bộ thuộc tính (~70 byte), nên để độ mờ chạy liên tục thì một
    lớp đẻ ra vài trăm nhóm."""

    STEP_W = 0.05
    STEP_OP = 0.01

    def __init__(self):
        self.buckets: dict[str, dict] = {k: {} for k in LAYERS}
        self.n = 0
        # Bộ đếm cho `fill(solo=True)`: mỗi hình LỒNG NHAU phải có một `<path>`
        # riêng, không thì gộp nhóm làm sai độ mờ tích luỹ. Xem `fill`.
        self._solo = 0

    def _add(self, layer, key, d):
        if layer not in self.buckets:
            raise SystemExit("lớp '%s' không có trong SKY_LAYERS (star-map.ts)" % layer)
        self.buckets[layer].setdefault(key, []).append(d)
        self.n += 1

    def stroke(self, layer, d, color, w=0.6, op=1.0, cap="round", dash=None):
        w = max(self.STEP_W, round(w / self.STEP_W) * self.STEP_W)
        op = max(self.STEP_OP, min(1.0, round(op / self.STEP_OP) * self.STEP_OP))
        self._add(layer, ("s", color, round(w, 2), round(op, 2), cap, dash), d)

    def fill(self, layer, d, color, op=1.0, rule=None, solo=False):
        """`solo=True` ⇒ hình này được MỘT `<path>` RIÊNG, không gộp nhóm.

        ── CÁI LỖI ĐẮT NHẤT CỦA TỆP NÀY, tìm ra 20/10/2026 ──────────────────

        Gộp nhóm là lossless khi các hình KHÔNG CHỒNG NHAU. Với hình LỒNG NHAU
        thì nó sai, và sai theo hai kiểu khác nhau, cả hai im lặng:

         · **`fill-rule="evenodd"`** (tinh vân, bụi xa, khe bụi): mười bốn bậc
           đồng mức lồng nhau gộp vào MỘT `<path>` thì evenodd XOR chúng với
           nhau — ra một dãy vành TÔ / KHÔNG TÔ xen kẽ, không ra một dốc. Bậc
           trong cùng (lẽ ra đậm nhất) có thể thành TRỐNG.
         · **nonzero** (128 vòng mặt trời): mười vòng cùng độ mờ sau khi làm
           tròn về bậc 0,01 gộp vào một `<path>`, và hợp của chúng được tô
           ĐÚNG MỘT LẦN ở độ mờ ấy. Độ mờ tích luỹ vì thế không cộng dồn:
           `a_i = 1/(n − i)` nên 63 vòng ngoài cùng của 128 đều tròn về 0,01 và
           cả nhóm chỉ đóng góp 0,01 thay vì `1 − 0,99⁶³ = 0,47`.

        Đo được bằng cách RASTER HOÁ chính bộ tệp đã ghi ra rồi so với
        `do_sang_rgb`: bậc giữa ra **4,3 %** trên tranh thật trong khi mô hình
        nói 47,3 %, p99 ra 0,595 trong khi mô hình nói 0,977. Hai con số lệch
        mười lần, và không một phép kiểm nào trong kho mã bắt được — vì MỌI
        phép kiểm đọc mô hình, không đọc tệp.

        Lỗi này có từ trước bản vẽ lại (16 vòng cũng gộp, năm bậc tinh vân cũng
        gộp), nên nó là một phần của chính cái "mảng phẳng" bị chê bốn lần.
        Giá của bản sửa: ~60 byte thuộc tính mỗi hình, tức +8 KB cho mặt trời
        và +1 KB cho tinh vân."""
        op = max(self.STEP_OP, min(1.0, round(op / self.STEP_OP) * self.STEP_OP))
        if solo:
            self._solo += 1
            self._add(layer, ("f", color, round(op, 2), rule, self._solo), d)
        else:
            self._add(layer, ("f", color, round(op, 2), rule), d)

    def poly(self, layer, pts, color, w=0.6, op=1.0, close=False, dash=None):
        self.stroke(layer, pl(pts, close), color, w, op, "round", dash)

    def circle(self, layer, cx, cy, r, color, op=1.0):
        """`<circle>` thật, không phải chấm-bằng-nét. Chỉ dùng cho THÂN và LÕI
        của ngôi mang nghĩa: nhờ thế ca test đọc được `r=` và kiểm được KHE
        TRỐNG 1,20–2,20 px của §7.2 — hàng rào chính giữ sao nền không lẫn với
        sao bài. Quầng đi vào lớp riêng dưới dạng vòng NÉT, nên bán kính của nó
        không lọt vào phép kiểm ấy."""
        op = max(self.STEP_OP, min(1.0, round(op / self.STEP_OP) * self.STEP_OP))
        self._add(layer, ("c", color, round(op, 2)), (cx, cy, r))

    def text(self, layer, x, y, s, color, size, weight, family, anchor="start",
             op=1.0, tracking=None, vien=None):
        """`vien=(màu, bề rộng)` ⇒ chữ được vẽ với một NÉT VIỀN cùng màu bao
        quanh glyph, dày `bề rộng` px.

        Đây là thứ THAY cho tấm nền chữ nhật (xem `ve_nhan`). Hai lớp `<text>`
        chồng nhau chứ KHÔNG `paint-order`: lớp dưới tô-và-viền bằng màu nền,
        lớp trên là chữ thật. Cách ấy không phụ thuộc một thuộc tính mà trình
        duyệt cũ có thể bỏ qua — mà nếu nó bị bỏ qua thì chữ bị chính cái viền
        của mình bít lại, tức một kiểu hỏng im lặng ở đúng chỗ không ai mở
        ra xem."""
        self._add(layer,
                  ("t", color, round(op, 2), size, weight, family, anchor, tracking, vien),
                  (x, y, s))

    def render(self, lops=None, aria="") -> str:
        """`lops` là TẬP LỚP của tấm này — mặc định cả `SKY_LAYERS`.

        Một tấm = một nhóm lớp, không phải cả bức (`SKY_TILES` ở TS). Thứ tự
        vẫn lấy từ `LAYERS` chứ không từ `lops`: nếu một tấm khai lớp theo một
        thứ tự khác thì đó là một thứ tự z thứ hai, và chuyện "thứ tự lớp bị
        chép ở nhiều chỗ mà không có gì giữ cho chúng khớp nhau" là đúng cái
        lỗi mà luật một-danh-sách-duy-nhất tồn tại để chặn."""
        esc = lambda s: (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
        chon = list(LAYERS) if lops is None else [l for l in LAYERS if l in lops]
        out = [
            "<!-- SINH BỞI scripts/star/build_sky.py — ĐỪNG SỬA TAY. Sửa dữ liệu ở "
            "frontend/src/lib/star-map.ts rồi chạy lại script. -->",
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s" width="%s" '
            'height="%s" role="img" aria-label="%s">'
            % (nf(VIEW["x"]), nf(VIEW["y"]), nf(VIEW["width"]), nf(VIEW["height"]),
               nf(VIEW["width"]), nf(VIEW["height"]), esc(aria)),
        ]
        # Thứ tự lớp là MỘT danh sách duy nhất (`SKY_LAYERS` ở TS): thứ tự đăng
        # ký LÀ thứ tự z, LÀ thứ tự vẽ. Azgaar đã trả giá cho việc chép thứ tự
        # lớp ở ba chỗ mà "không có gì giữ cho ba chỗ ấy khớp nhau".
        for name in chon:
            b = self.buckets[name]
            if not b:
                continue
            out.append('<g data-lop="%s">' % name)
            for key, items in b.items():
                if key[0] == "s":
                    _, color, w, op, cap, dash = key
                    a = ['fill="none"', 'stroke="%s"' % color,
                         # BỀ RỘNG QUA `wf()`, KHÔNG QUA `nf()` — xem luật 2.
                         'stroke-width="%s"' % wf(w)]
                    if op < 1:
                        a.append('stroke-opacity="%s"' % of(op))
                    a.append('stroke-linecap="%s"' % cap)
                    a.append('stroke-linejoin="round"')
                    if dash:
                        a.append('stroke-dasharray="%s"' % dash)
                    out.append('<path %s d="%s"/>' % (" ".join(a), "".join(items)))
                elif key[0] == "f":
                    # Khoá có BỐN hay NĂM phần tử: phần thứ năm là số thứ tự
                    # `solo`, chỉ để khoá KHÔNG TRÙNG, không đi vào thuộc tính.
                    _, color, op, rule = key[:4]
                    a = ['fill="%s"' % color]
                    if rule:
                        a.append('fill-rule="%s"' % rule)
                    if op < 1:
                        a.append('fill-opacity="%s"' % of(op))
                    out.append('<path %s d="%s"/>' % (" ".join(a), "".join(items)))
                elif key[0] == "c":
                    _, color, op = key
                    a = ['fill="%s"' % color]
                    if op < 1:
                        a.append('fill-opacity="%s"' % of(op))
                    out.append("<g %s>%s</g>" % (
                        " ".join(a),
                        "".join('<circle cx="%s" cy="%s" r="%s"/>'
                                % (nf(cx), nf(cy), wf(r)) for cx, cy, r in items)))
                else:
                    _, color, op, size, weight, family, anchor, tracking, vien = key
                    a = ['fill="%s"' % color, 'font-family="%s"' % family,
                         'font-size="%s"' % wf(size), 'font-weight="%d"' % weight]
                    if anchor != "start":
                        a.append('text-anchor="%s"' % anchor)
                    if op < 1:
                        a.append('fill-opacity="%s"' % of(op))
                    if tracking:
                        a.append('letter-spacing="%s"' % wf(tracking * size))
                    if vien:
                        # BỀ RỘNG QUA `wf()` — luật 2, y như mọi nét khác.
                        a.append('stroke="%s"' % vien[0])
                        a.append('stroke-width="%s"' % wf(vien[1]))
                        a.append('stroke-linejoin="round"')
                        if op < 1:
                            a.append('stroke-opacity="%s"' % of(op))
                    out.append("<g %s>%s</g>" % (
                        " ".join(a),
                        "".join('<text x="%s" y="%s">%s</text>'
                                % (nf(x), nf(y), esc(s)) for x, y, s in items)))
            out.append("</g>")
        out.append("</svg>")
        return "\n".join(out)


# ═══════════════════════════════════════════════════════════════════════
# 5 · hình thái bầu trời: dải Ngân Hà, trường tinh vân
# ═══════════════════════════════════════════════════════════════════════

_AX = (MW["from"]["x"], MW["from"]["y"])
_BX = (MW["to"]["x"], MW["to"]["y"])
_DX, _DY = _BX[0] - _AX[0], _BX[1] - _AX[1]
_DL = math.hypot(_DX, _DY)
_UX, _UY = _DX / _DL, _DY / _DL
_NX, _NY = -_UY, _UX


def mw_coords(x, y):
    """(t dọc dải 0..1, khoảng cách CÓ DẤU tới trục dải)."""
    px, py = x - _AX[0], y - _AX[1]
    return (px * _UX + py * _UY) / _DL, px * _NX + py * _NY


def mw_half(t, x=None, y=None):
    """Dải PHÌNH ở giữa — nửa bề rộng ở hai đầu và ở giữa (§4.3).

    Và THẮT LẠI quanh mặt trời khi biết toạ độ (`MW.nearSun`): đó là VÀNH
    TRỐNG đo được ở `bo-cuc-hung-vi.md` §3.4 — trong khung tham chiếu tinh vân
    KHÔNG chạm mặt trời, có một vành tối rộng ~110 px cô lập nó. Đây là thiết
    bị bố cục mạnh nhất của khung ấy và nó miễn phí: tương phản cục bộ tối đa
    ở đúng chỗ mắt phải nhìn trước."""
    e, m = MW["halfWidth"]["ends"], MW["halfWidth"]["mid"]
    hw = e + (m - e) * math.sin(math.pi * max(0.0, min(1.0, t)))
    if x is None:
        return hw
    ns = MW["nearSun"]
    d = math.hypot(x - LIGHT["at"]["x"], y - LIGHT["at"]["y"])
    if d >= ns["radius"]:
        return hw
    k = smoothstep(d / ns["radius"])
    return hw * (ns["shrink"] + (1 - ns["shrink"]) * k)


HULLS = []   # bao lồi của từng chòm, trong khung đầy đủ
STARS = []   # [(mã, x, y, r, bậc, chòm)]


def xoay_sao(c, s):
    """Toạ độ lưới sau khi XOAY quanh tâm lưới (`SkyConstellation.rotate`).

    Phép chữa cho tính CĂN TRỤC: bản cũ có 27/50 nét nằm trong 8° của một
    trục. Xoay bảo toàn hình hoàn toàn nên nó không đổi NGHĨA một chòm nào —
    đó là lý do nó được ưu tiên hơn vẽ lại ở năm chòm. Ba chòm phải đọc ra là
    lưới/bảng/khung thì xoay KHÔNG chữa được (một hình chữ nhật xoay vẫn là
    hình chữ nhật) nên chúng được vẽ lại bằng hội tụ."""
    deg = c.get("rotate", 0) or 0
    if not deg:
        return s["x"], s["y"]
    gw, gh = c["grid"]
    th = math.radians(deg)
    co, si = math.cos(th), math.sin(th)
    dx, dy = s["x"] - gw / 2, s["y"] - gh / 2
    return gw / 2 + dx * co - dy * si, gh / 2 + dx * si + dy * co


def dat_sao():
    """Toạ độ lưới cục bộ → khung 1360 × 820, tỉ lệ ĐỒNG DẠNG, căn giữa hộp.

    `min` chứ không bóp theo từng trục: bóp theo từng trục cho khít hộp
    310 × 210 thì cái kẹp cao 186 đơn vị thành một hình bè ra — mất đúng thứ
    phải đọc ra ở phép thử nhận dạng. Lưới là của TỪNG chòm (`c["grid"]`), vì
    bảng §2 cho M2…M8 toạ độ y trong 0…100 còn M1 tới 195. Cùng công thức ở
    `placeStar()` phía TS; ca test so lại từng ngôi."""
    for c in CONS:
        bx, by, bw, bh = c["box"]
        # XOAY trước, rồi khớp theo BAO CỦA TẬP NGÔI (không theo bao của lưới).
        # Cùng công thức ở `placeStar()` phía TS, và ca test so lại từng ngôi.
        q = [xoay_sao(c, s) for s in c["stars"]]
        x0, x1 = min(p[0] for p in q), max(p[0] for p in q)
        y0, y1 = min(p[1] for p in q), max(p[1] for p in q)
        ew, eh = max(1e-6, x1 - x0), max(1e-6, y1 - y0)
        k = min(bw / ew, bh / eh)
        ox = bx + (bw - ew * k) / 2
        oy = by + (bh - eh * k) / 2
        pts = []
        for s, (qx, qy) in zip(c["stars"], q):
            code = s["code"]
            if code not in SO_CA:
                raise SystemExit(
                    "mã bài %s không có trong out-advanced/lessons — bản đồ đang "
                    "vẽ một bài không tồn tại" % code)
            x, y = ox + (qx - x0) * k, oy + (qy - y0) * k
            STARS.append((code, x, y, ban_kinh(SO_CA[code]),
                          bac(SO_CA[code]), c["key"]))
            pts.append((x, y))
        HULLS.append((c["key"], convex_hull(pts)))
    kiem_khe_hai_chom()


def kiem_khe_hai_chom():
    """Hai ngôi của HAI chòm khác nhau không được gần hơn `SKY_LINK.minGap`.

    Đây là một ca chặn build có nguyên nhân cụ thể, không phải một phép đo cho
    vui: bảng hộp §15 của đặc tả CHỒNG NHAU (M4 chiếm y 430–630 và M2 chiếm
    y 600–780, cả hai đụng nhau ở x 470–700; M4 và M6 chồng ở y 430–450). Đặt
    đúng theo bảng đó thì PD07 của M6 và X03 của M4 cách nhau 21 px — hai ngôi
    của HAI chặng khác nhau, quầng chồng lên nhau, và mắt đọc ra một cặp sao
    đôi không ai định vẽ. Hộp ở TS đã dịch cho hết chồng; phép đo này là thứ
    giữ cho lần sau ai dịch lại cũng không dựng lại cái lỗi ấy."""
    xau, khe = None, 1e9
    for i in range(len(STARS)):
        for j in range(i + 1, len(STARS)):
            a, b = STARS[i], STARS[j]
            if a[5] == b[5]:
                continue
            d = math.hypot(a[1] - b[1], a[2] - b[2])
            if d < khe:
                khe, xau = d, (a[0], a[5], b[0], b[5])
    if xau and khe < LINK["minGap"]:
        raise SystemExit(
            "KHE GIỮA HAI CHÒM QUÁ HẸP: %s (%s) và %s (%s) cách nhau %.1f px, "
            "dưới %g px. Hai ngôi của hai chặng khác nhau mà sát thế thì quầng "
            "chồng lên nhau và mắt đọc ra một cặp sao đôi. Dịch `box` của một "
            "trong hai chòm ở star-map.ts."
            % (xau[0], xau[1], xau[2], xau[3], khe, LINK["minGap"]))
    return khe


def hull_atten(x, y, pad):
    """0 ở giữa bao lồi → 1 ngoài `pad`. Dùng để LOÃNG trời ngay chỗ có một
    chòm: đó là cách một bản khắc cổ chừa chỗ cho hình thần thoại, và nó cũng
    là thứ giữ cho trần độ chói cục bộ của §3.1 không bị vỡ.

    ── THÔI ĐO THEO BAO LỒI, ĐO THEO HÌNH, ngày 20/10/2026 ────────────────

    Khuyết tật NẶNG NHẤT của bản 20/10, và không một con số nào trong bảng
    tám bậc bắt được nó — nó chỉ lộ ra khi bức được xuất ra PNG và NHÌN
    (`raster.py --png`). Tinh vân đã sáng hẳn lên, nên tám cái loãng này thôi
    là "trời hơi nhạt quanh chòm" và trở thành **tám mảng tối cạnh thẳng góc
    bo nằm giữa vùng sáng** — đọc ra là ai đó cắt mấy ô chữ nhật ra khỏi bức
    tranh. Bao lồi M1 một mình Ø 426 px.

    Nguyên nhân là chọn HÌNH DẠNG, không phải chọn con số: một BAO LỒI nở
    `pad` là một đa giác LỒI, và bên trong nó `dist_to_hull` âm nên cả ruột
    tô một màu đen phẳng — tức cái lỗ mang ĐÚNG hình đa giác ấy. Đã thử làm
    mềm mép bằng nhiễu: mép hết thẳng nhưng hình vẫn đọc ra là một đa giác
    lồi, vì cái bị nhìn thấy là KHỐI chứ không phải cạnh.

    Nay đo theo `fig_dist` — khoảng cách tới chính NÉT và NGÔI của chòm. Ba
    cái được cùng lúc:
     · chỗ loãng ÔM LẤY hình que, nên nó đọc ra là "chòm rẽ một lối qua tinh
       vân" chứ không là một ô bị cắt;
     · nó tối ĐÚNG CHỖ tương phản được đo — `kiem_tuong_phan_net` lấy mẫu
       trên chính các nét, và ở đó `fig_dist` = 0 nên độ loãng sâu y như bản
       bao lồi; biên 3 : 1 không đổi một phần nghìn;
     · và nó TRẢ LẠI mid-tone cho phần ruột bao lồi không có nét nào đi qua —
       tức phần lớn trong 32 % diện tích mà bản cũ bỏ tối.
    Nhiễu NHÂN vào độ dốc (không cộng vào khoảng cách) giữ cho `d = 0 ⇒ 0`,
    nên mép gợn mà chỗ sát nét vẫn tối tuyệt đối."""
    if pad <= 0:
        return 1.0
    hf = NEB["hullFade"]
    n = NZ.fbm(x * hf["warpFreq"] / W, y * hf["warpFreq"] / W, 3,
               NEB["lacunarity"], NEB["gain"])
    return smoothstep(fig_dist(x, y)
                      / (pad * max(0.2, 1.0 + hf["warp"] * (n * 2 - 1))))


_FIG = None
_FIGD: dict = {}


def fig_bits():
    """Các ĐOẠN nét và tâm NGÔI của cả tám chòm. Dựng một lần."""
    global _FIG
    if _FIG is None:
        _FIG = (net_chom_segs(),
                [(x, y) for _c, x, y, _r, _t, _k in STARS])
    return _FIG


def fig_dist(x, y) -> float:
    """Khoảng cách tới HÌNH chòm gần nhất — nét và ngôi, không bao lồi.

    Nhớ lại theo toạ độ làm tròn 0,1 đơn vị, cùng lý do với `neb_field`: mỗi
    lần hỏi màu một điểm là năm lần gọi (một cho trường, bốn cho ∇F), và lưới
    đường đồng mức hỏi đúng những toạ độ ấy ở cả hai mươi hai bậc."""
    k = (round(x, 1), round(y, 1))
    v = _FIGD.get(k)
    if v is None:
        segs, pts = fig_bits()
        v = min(min(seg_dist(x, y, a[0], a[1], b[0], b[1]) for a, b in segs),
                min(math.hypot(x - px, y - py) for px, py in pts))
        _FIGD[k] = v
    return v


_NEB_MEMO: dict = {}


def neb_field(x, y):
    """Trường tinh vân 0..1: dải Ngân Hà × fBm BÓP MÉO MIỀN bậc hai.

    NHỚ LẠI theo toạ độ làm tròn 0,1 đơn vị, và đây là một con số hiệu năng
    chứ không một chi tiết: từ lúc có dốc Lambert (§8.1), mỗi lần hỏi màu một
    điểm là NĂM lần gọi hàm này — một lần cho trường, bốn lần cho sai phân
    trung tâm lấy ∇F. Mà `do_ngan_sach` hỏi màu ~70 000 điểm trên lưới 4 px, và
    mỗi lần gọi là 13 quãng nhiễu (hai lượt bóp méo × bốn quãng, cộng năm quãng
    của fBm cuối). Không nhớ lại thì một lệnh `--do` đi từ vài giây lên nhiều
    phút. Lưới 4 px với sai phân ±2 px còn làm các điểm biên TRÙNG nhau giữa
    hai mẫu kề, nên tỉ lệ trúng bộ nhớ không nhỏ.

    Tất định không đổi: khoá là toạ độ đã làm tròn, nên hai lần chạy vẫn ra
    đúng một tệp (luật 5 ở đầu tệp)."""
    k = (round(x, 1), round(y, 1))
    v = _NEB_MEMO.get(k)
    if v is None:
        v = _NEB_MEMO[k] = _neb_field(x, y)
    return v


def _neb_field(x, y):
    """Thân thật của `neb_field` — xem chú thích ở đó.

    CÁI BẪY LỚN NHẤT của bóp méo miền: phải CHUẨN HOÁ LẠI dải giá trị. fBm sau
    khi bóp méo chỉ chiếm một dải hẹp (một bản port đo được [0,39 ; 0,83]);
    không ánh xạ lại về [0, 1] thì tinh vân ra MỘT MÀN SƯƠNG XÁM ĐỀU, không
    phải một đám mây — đúng cái "mảng phẳng không có chiều sâu" bị chê."""
    t, s = mw_coords(x, y)
    hw = mw_half(t, x, y)
    band = smoothstep(1.0 - abs(s) / hw) if hw > 0 else 0.0
    if band <= 0:
        return 0.0
    f = NEB["baseFreq"] / W
    u, v = x * f, y * f
    # Trường bóp méo chỉ cần MƯỢT, nên tính q/r ở 4 quãng dù fbm cuối dùng 5.
    for lap in range(NEB["warp"]):
        qx = WQ[lap * 2].fbm(u, v, 4, NEB["lacunarity"], NEB["gain"]) - 0.5
        qy = WQ[lap * 2 + 1].fbm(u, v, 4, NEB["lacunarity"], NEB["gain"]) - 0.5
        u += NEB["warpStrength"] * qx
        v += NEB["warpStrength"] * qy
    raw = NZ.fbm(u, v, NEB["octaves"], NEB["lacunarity"], NEB["gain"])
    o, wid = NEB["normalize"]
    raw = max(0.0, min(1.0, (raw - o) / wid))   # chuẩn hoá lại, xem trên
    fm = NEB["floorMix"]
    return band * (fm + (1 - fm) * raw)


def neb_fade(x, y):
    """Trường tinh vân đã LOÃNG quanh chòm — nguồn duy nhất cho cả lớp vẽ lẫn
    phép đo trần độ chói, nên hai chỗ không lệch nhau được."""
    hf = NEB["hullFade"]
    return neb_field(x, y) * (hf["floor"]
                              + (1 - hf["floor"]) * hull_atten(x, y, FIELD["hullPad"] * hf["pad"]))


def neb_ton(i: int) -> str:
    """Khoá màu của bậc tinh vân thứ `i` — MỘT chỗ cho cả lượt vẽ lẫn lượt đo.

    Mười bốn bậc chia ba tông (`SKY_NEBULA.ramp` / `rampAt`). Trước khi có hàm
    này, việc chia tông viết thẳng trong `ve_tinh_van` là `i < n - 2` và chép
    lại trong `do_sang_rgb` là `max(0, lv - (n - 2))`: hai công thức cho cùng
    một việc, tức hai con số sẽ lệch khi số bậc đổi — và lệch ở đây nghĩa là
    ngân sách diện tích đang đo một bức tranh khác với bức được ghi ra tệp."""
    ten = NEB["ramp"][0]
    for k, at in enumerate(NEB["rampAt"]):
        if i >= at:
            ten = NEB["ramp"][k]
    return ten


def lambert(x, y):
    """HỆ SỐ CHIẾU SÁNG của tinh vân tại một điểm — Lambert trên mặt ẩn (§8.1).

    ĐÂY LÀ BƯỚC ĐÁNG GIÁ NHẤT của cả bản vẽ lại, và nó không đụng tới mặt
    trời. Chẩn đoán của lời chê thứ năm là một cái lỗ ~46 điểm phần trăm ở các
    bậc độ chói GIỮA; và chỗ thiếu KHÔNG phải mặt trời — trong khung tham
    chiếu mặt trời gánh ~70 % ngân sách sáng, tinh vân ~30 %, còn phần bản này
    hụt nằm nguyên ở **tinh vân chưa được chiếu sáng**. Tinh vân cũ không biết
    mặt trời ở đâu nên nó là một tấm vải tối ĐỀU, và một tấm vải tối đều không
    có bậc giữa nào để đóng góp.

        Λ = floor + (1 − floor) · D · S
        D = (dRef / max(d, dRef))^dSlope      — suy giảm theo khoảng cách
        S = clamp(sMin, sMax, sBias + sGain · (n̂ · ŝ))   — TỰ ĐỔ BÓNG

    `S` mới là thứ cho ra "đổ bóng các kiểu": chỗ gradient mật độ quay VỀ mặt
    trời thì sáng, chỗ quay ĐI thì tối, nên cùng một đám mây có sườn sáng và
    sườn tối — và hai sườn ấy nhất quán với mọi vật khác trong bức, vì cả bức
    chỉ có một nguồn sáng.

    Giá: một lần lấy ∇F thêm cho mỗi mẫu. `F` là hàm thuần tuý tất định nên ∇
    lấy bằng sai phân trung tâm; không đổi dung lượng, không đổi hình học
    đường đồng mức."""
    lb = NEB["lambert"]
    sx, sy = LIGHT["at"]["x"] - x, LIGHT["at"]["y"] - y
    d = math.hypot(sx, sy)
    if d <= 1e-6:
        return 1.0
    sx, sy = sx / d, sy / d
    D = (lb["dRef"] / max(d, lb["dRef"])) ** lb["dSlope"]
    h = lb["grad"]
    gx = neb_field(x + h, y) - neb_field(x - h, y)
    gy = neb_field(x, y + h) - neb_field(x, y - h)
    gl = math.hypot(gx, gy)
    # Chỗ trường PHẲNG (gl ≈ 0) không có mặt nào để nhận sáng, nên S về giá
    # trị giữa `sBias` thay vì về 0 hay 1 — không thì mọi vùng mịn của tinh
    # vân nhảy sang một đầu cực và cái dốc Lambert đọc ra là một vết cắt.
    dotp = 0.0 if gl < 1e-9 else (gx / gl * sx + gy / gl * sy)
    S = max(lb["sMin"], min(lb["sMax"], lb["sBias"] + lb["sGain"] * dotp))
    return lb["floor"] + (1 - lb["floor"]) * D * S


def neb_lit(x, y):
    """Trường tinh vân ĐÃ CHIẾU SÁNG — nguồn duy nhất cho cả lượt vẽ lẫn lượt
    đo, nên hai chỗ không lệch nhau được.

    Λ GẤP VÀO TRƯỜNG, không nhân vào độ mờ. Đặc tả §8.1 viết "nhân độ mờ của
    mỗi mẫu", nhưng `contours()` cho ra đa giác độ mờ PHẲNG — không có chỗ nào
    để nhân một hệ số theo ĐIỂM vào. Gấp vào trường thì sườn quay về mặt trời
    leo lên bậc đồng mức CAO hơn (tức sáng hơn, vì nhiều lớp phủ chồng hơn),
    và `do_sang_rgb` — vốn đếm số bậc phủ một điểm — tự đúng theo mà không
    phải viết lại một dòng. §10.6 cũng chốt đúng cách ấy cho bản sáng."""
    return neb_fade(x, y) * lambert(x, y)


def lane_field(x, y):
    """Khe bụi tối chẻ dọc dải. Nó NHÂN vào, không cộng — bụi ở GẦN, sao ở XA,
    và đó là tín hiệu chiều sâu mạnh nhất trong bảy tín hiệu của §3.2."""
    t, s = mw_coords(x, y)
    hw = mw_half(t)
    if hw <= 0:
        return 0.0
    band = smoothstep(1.0 - abs(s) / hw)
    off = MW["lane"]["offset"] + 34 * (NZ.v(t * 6.1, 3.3) - 0.5) * 2
    return band * smoothstep(1.0 - abs(s - off) / MW["lane"]["halfWidth"])


def dust_field(x, y):
    """Lớp 1 — bụi xa: một dải rộng hơn, KHÔNG bóp méo miền (§3.1).

    LOÃNG ĐI quanh bao lồi chòm từ 19/10/2026, cùng lúc `dustFar` sáng lên.
    Hai thay đổi ấy là một: lớp này nay gánh phần lớn bậc "nền trời" và "tinh
    vân mờ" (23 % + 24 % diện tích của khung tham chiếu), nên nó không còn là
    một lớp mờ không ảnh hưởng gì — và một lớp sáng phủ đều lên tám bao lồi là
    tám cái hình chòm chìm vào nền. Hệ số loãng NHẸ hơn của tinh vân (0,55 so
    với 0,12): bụi xa là lớp XA NHẤT, nên nó phải mờ chứ không được biến mất,
    không thì tám bao lồi thành tám cái lỗ đen có hình chữ nhật.

    TẦN SỐ NHIỄU 1,6 → `dust.freq` ngày 20/10/2026, và lý do là một bức ảnh.
    Ở 1,6 trên khung 1 360 px thì một quãng nhiễu dài ~850 px, tức LỚN HƠN
    nửa khung: ba bậc đồng mức của lớp này ra ba cái MẢNG PHẲNG có mép gần
    thẳng, và sau khi `spread` nới ra 3,2 thì mép ngoài cùng của chúng thành
    một đường chéo cứng chạy qua góc trên-trái — nhìn thấy ngay trên PNG, mà
    bảng tám bậc thì không: diện tích và độ chói y hệt, chỉ HÌNH là khác.
    Ở 4,2 quãng nhiễu còn ~320 px nên ba bậc đan vào nhau thành mây, và mép
    ngoài thôi là một đường."""
    t, s = mw_coords(x, y)
    hw = mw_half(t) * NEB["dust"]["spread"]
    band = smoothstep(1.0 - abs(s) / hw) if hw > 0 else 0.0
    f = NEB["dust"]["freq"] / W
    n = NZ.fbm(x * f, y * f, 5, NEB["lacunarity"], NEB["gain"])
    fm = NEB["floorMix"]
    hf = NEB["dust"]["hullFade"]
    mo = hf + (1 - hf) * hull_atten(x, y, FIELD["hullPad"])
    return band * (fm + (1 - fm) * n) * mo


def light_wave(th: float) -> float:
    """Hệ số méo rìa theo GÓC — một tổng ba sóng, pha cố định.

    Cùng một sóng cho mọi vòng, nên các vòng không cắt nhau được; biên độ mới
    là thứ đổi theo bán kính (`light_m`). Ba tần số chứ không một: một sóng
    sin đơn cho ra một hình hột đậu đọc ra ngay là "một phép biến dạng"."""
    return (0.30 * math.sin(3 * th + 0.7)
            + 0.40 * math.sin(5 * th + 2.1)
            + 0.30 * math.sin(9 * th + 4.3))


def light_m(th: float, r: float) -> float:
    """Biên độ méo TĂNG theo bán kính: rìa ngoài xơ xác, lõi tròn hơn. Đơn
    điệu theo r nên hai vòng không bao giờ cắt nhau.

    Số mũ `warpRamp` thay căn bậc hai (tức mũ 0,5) ngày 20/10/2026, và lý do
    là một bức ảnh: với mũ 0,5, ở mép lõi bão hoà (r = 62) hệ số đã là
    √(62/210) = 0,54, tức lõi méo ±11 % bán kính và **đọc ra là một đa giác
    méo, không một đĩa**. Phóng to trên PNG thấy rõ sáu bảy cạnh. Mũ 1,8 cho
    0,12 ở cùng chỗ — lõi gần tròn — mà vẫn bằng 1 ở `outer`, nên rìa ngoài
    xơ xác đúng như cũ. `light_re` là phép đảo của chính hàm này nên lượt vẽ
    và lượt đo vẫn nói một hình."""
    k = max(0.0, min(1.0, r / LIGHT["outer"])) ** LIGHT["warpRamp"]
    return 1.0 + LIGHT["warp"] * k * light_wave(th)


def light_re(x, y) -> float:
    """BÁN KÍNH HIỆU DỤNG của một điểm — bán kính thật chia hệ số méo rìa.

    Nghịch đảo của phép dựng vòng, nên lượt VẼ và lượt ĐO nói đúng cùng một
    hình."""
    dx, dy = x - LIGHT["at"]["x"], y - LIGHT["at"]["y"]
    d = math.hypot(dx, dy)
    if d <= 0:
        return 0.0
    th = math.atan2(dy, dx)
    # Hai vòng lặp thô là đủ — `light_m` biến thiên chậm theo r.
    de = d / light_m(th, d)
    return d / light_m(th, de)


def light_A(re: float) -> float:
    """ĐỘ MỜ TÍCH LUỸ tại bán kính hiệu dụng `re` — TRA BẢNG `SKY_LIGHT.profile`,
    nội suy tuyến tính giữa các mốc.

    Bảng chứ không công thức, và lý do là phép đo ở §3.2: hồ sơ thật có một
    LÕI PHẲNG BÃO HOÀ, một THỀM ở r = 76…101, rồi một đầu gối dốc ~1/r³. Khớp
    một luỹ thừa trên cả dải thì sai ở hai đầu — bản cũ dùng
    `alphaMax × f^falloff` và cho ra đúng cái "đĩa bán kính 90 px viền xuyến
    30 px" mà §1.1 đo được.

    Nội suy TUYẾN TÍNH chứ không cubic đơn điệu như đặc tả đề xuất, và nói ra
    chỗ đi chệch: mười sáu mốc cách nhau 8–25 px, trong khi bước độ mờ mỗi
    vòng đã là 1,78/255 mã màu — dưới ngưỡng thấy dải. Một đường cubic sẽ làm
    mềm mười sáu cái gãy mà không đổi được MỘT giá trị độ mờ nào sau khi làm
    tròn về bậc 0,01 của `Ink`. Đổi nó là thêm một thứ không ai đo lại được."""
    tb = LIGHT["profile"]
    if re <= tb[0][0]:
        return tb[0][1]
    for i in range(1, len(tb)):
        r1, a1 = tb[i]
        if re <= r1:
            r0, a0 = tb[i - 1]
            t = (re - r0) / (r1 - r0) if r1 > r0 else 0.0
            return a0 + (a1 - a0) * t
    return 0.0


def light_r_of_A(a: float) -> float:
    """BÁN KÍNH mà tại đó độ mờ tích luỹ bằng `a` — phép đảo của `light_A`.

    Vòng chia đều theo ĐỘ MỜ, không theo bán kính, nên phép dựng 128 vòng cần
    chính phép đảo này. Và đó mới là chỗ con số 1,78/255 mã màu mỗi vòng đến
    từ: chia đều theo bán kính thì vùng đuôi (A đổi chậm) được quá nhiều vòng
    còn vùng đầu gối (A đổi nhanh) được quá ít — tức dải vẫn thấy ở đúng chỗ
    dốc nhất."""
    tb = LIGHT["profile"]
    if a >= tb[0][1]:
        # MÉP NGOÀI của thềm bão hoà, không tâm. Bảng mở đầu bằng `[0, 1.0]`
        # rồi `[59, 1.0]`, tức cả lõi r ≤ 59 có A = 1,0; trả về `tb[0][0]` = 0
        # thì vòng trong cùng có BÁN KÍNH 0 — một đa giác suy biến, diện tích
        # không, và cái lõi bão hoà KHÔNG ĐƯỢC TÔ.
        #
        # Đã xảy ra, và chỉ raster hoá mới bắt được: mô hình nói p99 = 0,977
        # (nó tra `light_A`, thấy A = 1,0 ở r < 59 và tin là có mực ở đó) còn
        # tranh thật đo ra **0,572**. Hai con số lệch vì chúng nói về hai thứ:
        # một cái nói hồ sơ PHẢI thế nào, một cái nói tệp CÓ gì.
        r = tb[0][0]
        for rr, aa in tb:
            if aa >= a:
                r = rr
            else:
                break
        return r
    # Bảng đi từ A cao (r nhỏ) xuống A thấp (r lớn) và đã được làm cho ĐƠN
    # ĐIỆU ở TS, nên quét một lượt là đủ.
    for i in range(1, len(tb)):
        r0, a0 = tb[i - 1]
        r1, a1 = tb[i]
        if a1 <= a <= a0:
            if a0 == a1:
                return r1          # giữa một THỀM: lấy mép ngoài
            t = (a0 - a) / (a0 - a1)
            return r0 + (r1 - r0) * t
    return tb[-1][0]


def light_alpha(re: float):
    """`(độ mờ rìa, độ mờ ngà, độ mờ lõi)` ĐÃ QUY VỀ TỪNG DẢI tại `re`.

    MỘT hàm cho cả lượt vẽ lẫn lượt ĐO: `ve_nguon_sang` tô 128 vòng theo hồ sơ
    này, `do_sang_rgb` đọc lại chính hồ sơ ấy. Hai công thức là hai con số sẽ
    lệch, và lệch ở đây nghĩa là ngân sách diện tích đang đo một bức tranh
    khác với bức được ghi ra tệp.

    Ba dải màu nối tiếp nhau theo ĐỘ MỜ (`rimAt`, `coreAt`), và thứ tự tô là
    thứ tự bán kính giảm, tức thứ tự A tăng — nên ba dải liền mạch trong thời
    gian. Giá trị trả về là độ mờ mà mỗi dải phải đạt KHI TÔ LÊN kết quả của
    dải trước: `a2 = (A₂ − A₁) / (1 − A₁)`. Không chia như thế thì ba lần phủ
    cộng dồn ra một con số khác với bảng, và cái "bão hoà ở lõi" không bao giờ
    tới được 1,0."""
    A = light_A(re)
    if A <= 0:
        return 0.0, 0.0, 0.0
    r_at, c_at = LIGHT["rimAt"], LIGHT["coreAt"]
    a1 = min(A, r_at)
    a2 = max(0.0, min(A, c_at) - r_at)
    a3 = max(0.0, A - c_at)
    return (a1,
            a2 / max(1e-6, 1.0 - a1),
            a3 / max(1e-6, 1.0 - a1 - a2))


# ─── mạch hoàng đạo (§4.2) ────────────────────────────────────────────────


def mach_moc():
    """Bốn mốc của cung: NEO VÀO SAO, không vào toạ độ. Hai mã ⇒ trung điểm —
    ở M8 cung phải đi GIỮA hai ngôi. Cùng công thức ở `zodiacAnchors()` phía
    TS; chép toạ độ sang đây là bốn con số sẽ lệch khi một hộp chòm dịch."""
    pos = {code: (x, y) for code, x, y, _r, _t, _k in STARS}
    out = []
    for a in ZOD["anchors"]:
        ps = []
        for code in a["stars"]:
            if code not in pos:
                raise SystemExit("SKY_ZODIAC neo vào %s — không ngôi nào mã đó" % code)
            ps.append(pos[code])
        dx, dy = a["offset"]
        out.append((sum(q[0] for q in ps) / len(ps) + dx,
                    sum(q[1] for q in ps) / len(ps) + dy))
    return out


def mach_duong():
    """Cung trơn Catmull–Rom qua bốn mốc, NỐI DÀI theo tiếp tuyến ở hai đầu.

    Nối dài vì một vòng tròn lớn không bắt đầu và kết thúc ở giữa trời: hoàng
    đạo thật chạy hết bầu trời và chỉ ĐI QUA một tập con chòm sao. Đó cũng là
    thứ làm nó đọc ra là một QUAN HỆ chứ không phải một lộ trình có điểm đầu
    và điểm cuối — nên cũng không có mũi tên, không có chữ trên cung (§4.2)."""
    P4 = mach_moc()
    ext = [P4[0], *P4, P4[-1]]
    pts = []
    for i in range(len(P4) - 1):
        p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
        for st in range(ZOD["steps"] + (1 if i == len(P4) - 2 else 0)):
            t = st / ZOD["steps"]
            t2, t3 = t * t, t * t * t
            pts.append((
                0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t
                       + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                       + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t
                       + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                       + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)))

    def noi_dai(a, b, L):
        dx, dy = a[0] - b[0], a[1] - b[1]
        d = math.hypot(dx, dy) or 1.0
        return (a[0] + dx / d * L, a[1] + dy / d * L)

    e0, e1 = ZOD["extend"]
    return [noi_dai(pts[0], pts[1], e0)] + pts + [noi_dai(pts[-1], pts[-2], e1)]


def mach_le(pts, off):
    """Nét thứ hai của DẢI: lệch `off` px theo pháp tuyến. Atlas cổ vẽ hoàng
    đạo là một DẢI, không phải một vạch."""
    out = []
    for i, (x, y) in enumerate(pts):
        a = pts[max(0, i - 1)]
        b = pts[min(len(pts) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dy) or 1.0
        out.append((x - dy / d * off, y + dx / d * off))
    return out


def kiem_mach(P):
    """Ba điều kiện của §4.2, đo trên chính đường vừa dựng.

    1 · KHÔNG CHẠM SAO NÀO (≥ `clearMin`). Nếu cung dính một ngôi thì nó đọc
        ra là "nét của chòm" và ba lớp liên kết của §4 không còn phân biệt
        được — tức mất chính thứ mà cả bản này được dựng để nói.
    2 · ĐI SÁT ngôi neo đã khai của M5, M6, M7 (≤ `nearMax`), và đi giữa hai
        ngôi M8. "Đi sát" là một con số đo được, không phải một lời.
    3 · Nét MANG TIN phải giữ 3:1 so với chỗ nó nằm trên. Đây là chỗ dễ trượt
        nhất của cả bức sau khi có nguồn sáng trội, vì cung chạy xuyên nửa
        trên bầu trời qua nhiều vùng độ chói khác nhau."""
    pts = mach_duong()
    # 0 · KHÔNG ĐƯỢC RỜI KHUNG. `viewBox` cắt phần ngoài, nên một cung vồng ra
    #     ngoài mép rồi quay vào KHÔNG đọc ra là "cung đi hết bầu trời": nó đọc
    #     ra là HAI MẨU NÉT RỜI bám mép, đúng hai sợi tóc lạc mà lời chê thứ
    #     sáu chỉ ra. Và nó đã xảy ra vì một lý do nhìn thấy được ngay khi in
    #     bốn mốc ra: mốc thứ hai (PD09 + offset) rơi đúng **(1361, 327)** —
    #     ngoài mép phải 1 px — nên Catmull–Rom vồng thêm 14 px nữa, 13 điểm
    #     liền nằm ngoài khung.
    #
    #     Gác ở ĐÂY chứ không cắt ở `mach_duong`: cắt là lặng lẽ làm mất đoạn
    #     cung đi sát mốc M06, tức chữa cái nhìn thấy bằng cách bỏ cái mang
    #     tin. Đo cả nét LỀ (`bandOffset`) vì dải có hai sợi và sợi ngoài là
    #     sợi ra khỏi khung trước.
    bien = [pts, mach_le(pts, ZOD["bandOffset"])]
    for duong in bien:
        for x, y in duong:
            if not (VX0 <= x <= VX1 and VY0 <= y <= VY1):
                raise SystemExit(
                    "mạch hoàng đạo ra NGOÀI khung tại (%.0f, %.0f) — khung là "
                    "%g×%g. `viewBox` cắt chỗ ấy, nên trên tranh nó thành hai "
                    "mẩu nét rời bám mép chứ không thành một cung. Dịch "
                    "`offset` của mốc gần đó trong `SKY_ZODIAC.anchors` vào "
                    "trong; bốn mốc in ra bằng `mach_moc()`."
                    % (x, y, VIEW["width"], VIEW["height"]))
    for code, x, y, _r, _t, _k in STARS:
        d = min(seg_dist(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])
                for i in range(len(pts) - 1))
        if d < ZOD["clearMin"]:
            raise SystemExit(
                "mạch hoàng đạo chạm ngôi %s (cách %.1f px, tối thiểu %g) — "
                "cung dính một ngôi thì nó đọc ra là nét của chòm."
                % (code, d, ZOD["clearMin"]))
    pos = {code: (x, y) for code, x, y, _r, _t, _k in STARS}
    for a in ZOD["anchors"]:
        qs = [pos[c] for c in a["stars"]]
        qx = sum(q[0] for q in qs) / len(qs)
        qy = sum(q[1] for q in qs) / len(qs)
        d = min(seg_dist(qx, qy, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])
                for i in range(len(pts) - 1))
        if d > ZOD["nearMax"]:
            raise SystemExit(
                "mạch hoàng đạo đi cách mốc %s tới %.1f px, quá %g — nó không "
                "còn 'đi sát' chòm đó nữa, tức mạch phụ thuộc hết đọc ra."
                % ("+".join(a["stars"]), d, ZOD["nearMax"]))
    # 3 · tương phản dọc cung — đo giữa LÕI và VỎ BỌC, không giữa lõi và NỀN.
    #
    # Đó là cả điểm của vỏ bọc (xem `ve_mach`): một lõi sáng trên một vỏ tối
    # đọc được trên MỌI nền, nên con số phải đo đúng cặp màu mà mắt so. Đo
    # lõi với nền là đo một cặp mà bức tranh không có — và nó là phép đo đã
    # chặn build ở (844, 552) trong khi cung ở đó thật ra đọc rất rõ.
    cs = ZOD["casing"]
    xau, at = 99.0, None
    for i in range(0, len(pts), 3):
        x, y = pts[i]
        if not (0 <= x <= W and 0 <= y <= H):
            continue
        nen = do_sang_rgb(x, y, P)
        vo = over(nen, hex_rgb(P["dustLane"]), cs["opacity"])
        loi = over(vo, hex_rgb(P["zodiac"]), ZOD["opacity"])
        L1, L2 = luminance(loi), luminance(vo)
        tp = (max(L1, L2) + 0.05) / (min(L1, L2) + 0.05)
        if tp < xau:
            xau, at = tp, (round(x), round(y))
    if xau < 3.0:
        raise SystemExit(
            "mạch hoàng đạo chỉ còn %.2f:1 tại %s — dưới 3:1 của WCAG 1.4.11. "
            "Nét MANG TIN phải đọc được ở MỌI chỗ nó đi qua. Nới "
            "`SKY_ZODIAC.casing.opacity` hay `SKY_ZODIAC.opacity`: tương phản "
            "ở đây là giữa LÕI và VỎ BỌC, nên nó không chữa bằng cách dịch mặt "
            "trời." % (xau, at))
    return xau


def chan_troi_y(x):
    """ĐỘ CAO RÌA thiên thể tại `x` — một cung tròn, không một đường thẳng.

    `y = cy − sqrt(R² − (x − cx)²)`. Với R = 3 800 trên khung rộng 1 360, độ
    võng là 61 px: đỉnh ở y = 752 giữa khung, y = 813 ở hai mép. Đủ để mép đọc
    ra là một CUNG (tức một vật tròn rất lớn) mà chưa thành một cái bát."""
    R = HORIZON["radius"]
    dx = x - HORIZON["at"]["x"]
    h = R * R - dx * dx
    return HORIZON["at"]["y"] - (math.sqrt(h) if h > 0 else 0.0)


def chan_troi_cos(x):
    """`cos θ` giữa PHÁP TUYẾN rìa tại `x` và hướng tới mặt trời.

    Một luật, ba chỗ dùng (§8.4): mọi vật thể rắn nhận vành sáng CHỈ ở nửa
    quay về mặt trời. Đó là thứ làm cả bức có MỘT hướng sáng — mục thứ tư
    trong công thức hùng vĩ, và mục mà bản cũ có 0 trên 4."""
    y = chan_troi_y(x)
    nx = (x - HORIZON["at"]["x"]) / HORIZON["radius"]
    ny = (y - HORIZON["at"]["y"]) / HORIZON["radius"]
    sx, sy = LIGHT["at"]["x"] - x, LIGHT["at"]["y"] - y
    d = math.hypot(sx, sy)
    return 0.0 if d <= 0 else max(0.0, nx * sx / d + ny * sy / d)


def horizon_amt(y, x=None):
    """Bề dày LỚP KHÍ trên rìa, 0…1 — dùng cho phối cảnh khí quyển của sao nền.

    Nó KHÔNG còn là hồ sơ độ mờ của một dải gạch ngang: khối chân trời nay tô
    ĐẶC (xem `ve_quang_chan_troi`), nên thứ duy nhất cần một con số liên tục là
    hai hệ số `SKY_FIELD.horizonFade` / `horizonSwell`."""
    rim = chan_troi_y(x if x is not None else W / 2)
    top = rim - HORIZON["haze"]
    return smoothstep((y - top) / HORIZON["haze"]) if y > top else 0.0


# ═══════════════════════════════════════════════════════════════════════
# 6 · marching squares + Douglas–Peucker
# ═══════════════════════════════════════════════════════════════════════


_GRID: dict = {}

# Sổ đếm của `contours` — cộng dồn qua mọi lượt gọi trong một lần chạy.
# Vì sao nó phải sống ở đây chứ không ở một script tạm: con số "bao nhiêu
# đường đồng mức còn HỞ" là chẩn đoán duy nhất của 23 điểm phần trăm bậc giữa
# bị mất (một đường hở ⇒ vùng bên trong nó KHÔNG được tô). `scripts/star/
# raster.py` in nó cạnh hai cột số đo.
CTR_STAT = {"duong": 0, "ho": 0, "khep": 0, "le": 0, "ca_hop": 0}


def contours(fn, level, x0, y0, x1, y1, cell):
    """Đường đồng mức của một trường vô hướng. Quy trình giống MapMage: sinh
    trường bằng Python → lấy đường đồng mức → xuất path. KHÔNG raster, KHÔNG
    bộ lọc: đặc tả §9.1 cấm gửi một `feTurbulence` nào xuống trình duyệt, và
    bằng chứng ở đó mạnh bất thường (WebKit không tăng tốc bộ lọc SVG bằng
    GPU, bug 287982 còn mở)."""
    nx = int((x1 - x0) / cell) + 1
    ny = int((y1 - y0) / cell) + 1
    # NHỚ LẠI LƯỚI giữa các bậc. Một trường được lấy đường đồng mức ở 2…9 bậc
    # khác nhau, và lưới thì GIỐNG NHAU ở mọi bậc — chỉ ngưỡng đổi. Không nhớ
    # thì `neb_fade` (13 quãng nhiễu + khoảng cách tới 8 bao lồi mỗi điểm) bị
    # tính lại năm lần cho 45 000 điểm, và cả bức mất gần hai phút ở khung
    # đầy đủ 1360 × 820 thay vì hơn hai chục giây.
    ck = (fn, x0, y0, x1, y1, cell)
    val = _GRID.get(ck)
    if val is None:
        val = [[fn(x0 + i * cell, y0 + j * cell) for j in range(ny)] for i in range(nx)]
        _GRID[ck] = val

    def ip(a, b):
        return 0.5 if b == a else max(0.0, min(1.0, (level - a) / (b - a)))

    segs = []
    for i in range(nx - 1):
        for j in range(ny - 1):
            a, b = val[i][j], val[i + 1][j]
            c, d = val[i + 1][j + 1], val[i][j + 1]
            code = (a > level) | ((b > level) << 1) | ((c > level) << 2) | ((d > level) << 3)
            if code in (0, 15):
                continue
            X, Y = x0 + i * cell, y0 + j * cell
            top = (X + cell * ip(a, b), Y)
            right = (X + cell, Y + cell * ip(b, c))
            bot = (X + cell * ip(d, c), Y + cell)
            left = (X, Y + cell * ip(a, d))
            # Hướng nét: giữ "phần trong" ở bên trái, để vòng ra đúng chiều.
            table = {
                1: [(left, top)], 2: [(top, right)], 3: [(left, right)],
                4: [(right, bot)], 5: [(left, top), (right, bot)],
                6: [(top, bot)], 7: [(left, bot)], 8: [(bot, left)],
                9: [(bot, top)], 10: [(bot, left), (top, right)],
                11: [(bot, right)], 12: [(right, left)],
                13: [(right, top)], 14: [(top, left)],
            }
            segs.extend(table[code])

    # Nối đoạn thành đường. Khoá là toạ độ LÀM TRÒN — hai đoạn kề nhau sinh ra
    # cùng một điểm nhưng qua hai phép nội suy khác nhau, nên so bằng float
    # thuần là chuỗi đứt vụn thành vài nghìn mảnh (và dung lượng nổ theo).
    #
    # LẬP CHỈ MỤC CẢ HAI ĐẦU, và đi CẢ HAI CHIỀU. Bản trước chỉ lập chỉ mục
    # theo điểm ĐẦU rồi đi xuôi; với một đường KÍN thì bắt đầu ở đâu cũng
    # được, nhưng với một đường HỞ mà đoạn gặp đầu tiên (thứ tự quét lưới, chứ
    # không phải thứ tự hình học) nằm ở GIỮA nó thì nửa phía trước rụng ra
    # thành một mảnh riêng — và mảnh ấy có một đầu KHÔNG ở mép, nên phép khép
    # mép bên dưới không nhận ra nó là đường hở và để nguyên cho `pl(…, True)`
    # khép bằng dây cung. Đo được: dải Ngân Hà ở `cell` 5 ra 1 415 đường / 147
    # hở theo lối cũ, còn 1 303 đường / 35 hở khi đi cả hai chiều.
    # (`segs.index(cand)` cũng là một phép quét O(n) trong vòng lặp; chỉ mục
    # theo CHỈ SỐ bỏ luôn được nó.)
    key = lambda p: (round(p[0], 3), round(p[1], 3))
    tu: dict = {}
    den: dict = {}
    for idx, (a, b) in enumerate(segs):
        tu.setdefault(key(a), []).append(idx)
        den.setdefault(key(b), []).append(idx)
    chains = []
    used = set()
    for idx in range(len(segs)):
        if idx in used:
            continue
        used.add(idx)
        a0, b0 = segs[idx]
        chain = [a0, b0]
        while True:                                 # xuôi, từ đuôi
            k = next((c for c in tu.get(key(chain[-1]), []) if c not in used), None)
            if k is None:
                break
            used.add(k)
            chain.append(segs[k][1])
            if key(chain[-1]) == key(chain[0]):
                break
        if key(chain[0]) != key(chain[-1]):         # ngược, từ đầu
            truoc, dau = [], chain[0]
            while True:
                k = next((c for c in den.get(key(dau), []) if c not in used), None)
                if k is None:
                    break
                used.add(k)
                dau = segs[k][0]
                truoc.append(dau)
                if key(dau) == key(chain[-1]):
                    break
            chain = truoc[::-1] + chain
        if len(chain) >= 4:
            chains.append(chain)
    # ── KHÉP ĐƯỜNG HỞ DỌC MÉP HỘP LẤY MẪU ──────────────────────────────────
    #
    # Một vùng tràn ra NGOÀI hộp lấy mẫu cho ra một đường HỞ: hai đầu nằm trên
    # mép hộp. `pl(ch, True)` khép nó bằng một DÂY CUNG thẳng từ cuối về đầu —
    # và cái dây cung ấy cắt mất phần vùng nằm sát mép, đôi khi gần hết.
    #
    # Đo được, và chỉ raster hoá mới đo được: mô hình (`do_sang_rgb`, đếm bậc
    # bằng cách so TRƯỜNG với ngưỡng) nói bậc giữa chiếm 47,4 % diện tích,
    # trong khi raster chính mấy tệp SVG đã ghi ra chỉ đo được 23,8 %. Dải
    # Ngân Hà chạy chéo HẾT khung và `mw_half` kẹp `t` về [0, 1], nên dải
    # KHÔNG BAO GIỜ tự đóng theo chiều ngang — nới hộp lấy mẫu ra bao nhiêu
    # cũng không chữa được. Phải khép theo MÉP.
    #
    # KHÉP TỪNG ĐƯỜNG MỘT LÀ SAI, và đó là lý do bản khép trước không thu hẹp
    # được khoảng lệch. Một dải chạy xuyên khung cho ra HAI đường hở — một cho
    # mỗi bờ dải — và mỗi bờ đi từ mép này sang mép kia. Khép riêng từng bờ
    # thành một đa giác thì hai đa giác ấy PHỦ NHAU, và `evenodd` XOR chúng
    # thành đúng phần BÙ của cái dải. Thuật toán đúng là KHÂU: đi hết một
    # đường, tới mép thì ĐI DỌC MÉP sang đầu của đường kế, rồi tiếp — cho tới
    # khi về chỗ xuất phát. Nó xử lý luôn cả lỗ chạm mép, vì lỗ cũng chỉ là
    # một đường nữa trong cùng vòng khâu.
    #
    # CHIỀU đi dọc mép không phải thứ để đoán: bảng marching squares ở trên
    # luôn đặt phần TRONG về cùng một phía của mỗi đoạn (kiểm được bằng tích
    # chéo cho cả 16 mã), nên vòng khâu đúng là vòng đi dọc mép theo chiều
    # GIẢM toạ độ cung — với toạ độ cung đánh 0 ở góc trên-trái rồi tăng theo
    # trên → phải → dưới → trái. Đi ngược chiều ấy là tô ra phần bù.
    #
    # Mép lấy theo MÉP LƯỚI (`gx1`, `gy1`), không theo `x1`/`y1`: lưới chỉ phủ
    # `x0 … x0 + (nx−1)·cell`, có thể hụt gần một ô so với `x1`, và một dây
    # cung lệch một ô ở đây là một vệt sáng thừa dọc cả mép.
    gx1 = x0 + (nx - 1) * cell
    gy1 = y0 + (ny - 1) * cell
    Wb, Hb = gx1 - x0, gy1 - y0
    CV = 2 * (Wb + Hb)

    def mep_s(p):
        """Toạ độ CUNG trên mép lưới, hay None nếu điểm không nằm trên mép."""
        e = cell * 0.51
        x, y = p
        if abs(y - y0) < e:
            return min(max(x - x0, 0.0), Wb)
        if abs(x - gx1) < e:
            return Wb + min(max(y - y0, 0.0), Hb)
        if abs(y - gy1) < e:
            return Wb + Hb + min(max(gx1 - x, 0.0), Wb)
        if abs(x - x0) < e:
            return 2 * Wb + Hb + min(max(gy1 - y, 0.0), Hb)
        return None

    goc_s = [(0.0, (x0, y0)), (Wb, (gx1, y0)),
             (Wb + Hb, (gx1, gy1)), (2 * Wb + Hb, (x0, gy1))]

    ra, mep, le = [], [], 0
    for ch in chains:
        if key(ch[0]) == key(ch[-1]):
            ra.append(ch)
            continue
        sa, sb = mep_s(ch[0]), mep_s(ch[-1])
        if sa is None or sb is None:
            # Đầu hở mà không ở mép: chỉ xảy ra ở điểm yên ngựa phân giải lệch
            # nhau. Giữ hành vi cũ (dây cung) — đếm lại để không ai tưởng là 0.
            le += 1
            ra.append(ch)
        else:
            mep.append((ch, sa, sb))
    CTR_STAT["duong"] += len(chains)
    CTR_STAT["ho"] += len(mep) + le
    CTR_STAT["le"] += le

    def goc_giua(s_tu, s_den):
        """Các GÓC gặp khi đi dọc mép theo chiều GIẢM, từ `s_tu` tới `s_den`."""
        span = (s_tu - s_den) % CV
        qua = [((s_tu - s) % CV, p) for s, p in goc_s]
        qua = [(d, p) for d, p in qua if 1e-9 < d < span - 1e-9]
        return [p for _d, p in sorted(qua)]

    dung = [False] * len(mep)
    for i0 in range(len(mep)):
        if dung[i0]:
            continue
        vong, i = [], i0
        while True:
            dung[i] = True
            ch, _sa, sb = mep[i]
            vong.extend(ch[1:] if vong and key(ch[0]) == key(vong[-1]) else ch)
            # Đường kế: đường có ĐẦU gần nhất khi đi dọc mép theo chiều giảm.
            j = min(range(len(mep)), key=lambda k: (sb - mep[k][1]) % CV)
            vong.extend(goc_giua(sb, mep[j][1]))
            if j == i0 or dung[j]:
                break
            i = j
        if len(vong) >= 4:
            CTR_STAT["khep"] += 1
            ra.append(vong)
    if not chains:
        # Không một đoạn nào: bậc này hoặc trống hẳn, hoặc phủ KÍN cả hộp. Cả
        # hai cùng ra "không vẽ gì" nếu không hỏi trường, và cái thứ hai là
        # một bậc tinh vân bị mất trắng.
        if fn((x0 + gx1) / 2, (y0 + gy1) / 2) > level:
            CTR_STAT["ca_hop"] += 1
            return [[(x0, y0), (gx1, y0), (gx1, gy1), (x0, gy1)]]
    return [simplify(ch, NEB["simplify"]) for ch in ra]


def simplify(pts, eps):
    """Douglas–Peucker. Không giản lược thì đường đồng mức đắt khủng khiếp ở
    DỮ LIỆU ĐƯỜNG: `mw.json` của d3-celestial nặng 534 KB (§9.5)."""
    if len(pts) < 3:
        return pts
    out = [pts[0]]
    stack = [(0, len(pts) - 1)]
    keep = {0, len(pts) - 1}
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        best, bi = -1.0, i
        for k in range(i + 1, j):
            d = seg_dist(pts[k][0], pts[k][1], pts[i][0], pts[i][1], pts[j][0], pts[j][1])
            if d > best:
                best, bi = d, k
        if best > eps:
            keep.add(bi)
            stack.append((i, bi))
            stack.append((bi, j))
    out = [pts[k] for k in sorted(keep)]
    return out


# ═══════════════════════════════════════════════════════════════════════
# 7 · các lớp
# ═══════════════════════════════════════════════════════════════════════

VX0, VY0 = VIEW["x"], VIEW["y"]
VX1, VY1 = VIEW["x"] + VIEW["width"], VIEW["y"] + VIEW["height"]
# Nới biên khi lấy mẫu: đường đồng mức phải chạy ra NGOÀI khung, không thì nó
# khép lại dọc mép và mắt đọc ra một cái vệt dán vào lề.
MX0, MY0, MX1, MY1 = VX0 - 60, VY0 - 60, VX1 + 60, VY1 + 60


def ve_nen(ink, P, dim):
    ink.fill("nen", "M%s %sh%sv%sh-%sZ" % (nf(VX0), nf(VY0), nf(VIEW["width"]),
                                           nf(VIEW["height"]), nf(VIEW["width"])),
             P["base"])


def ve_bui_xa(ink, P, dim):
    """Lớp 1 — bụi xa: một dải rộng hơn, mờ hơn, KHÔNG bóp méo miền."""
    for lv in NEB["dust"]["levels"]:
        # MỘT `<path>` cho MỖI BẬC, gom hết vòng của bậc ấy vào trong — và cả
        # hai nửa của câu đó đều cần thiết:
        #  · gom hết vòng CỦA MỘT BẬC vào một path là cách `evenodd` KHOÉT LỖ
        #    (chỗ trường tụt xuống dưới ngưỡng) đúng;
        #  · tách các BẬC ra là cách độ mờ CỘNG DỒN đúng — gộp hai bậc lồng
        #    nhau vào một path thì evenodd XOR chúng và ra vành tô/không-tô xen
        #    kẽ. Xem chú thích dài ở `Ink.fill`.
        d = "".join(pl(ch, True)
                    for ch in contours(dust_field, lv, MX0, MY0, MX1, MY1,
                                       NEB["cell"] * 2))
        if d:
            ink.fill("bui-xa", d, P["dustFar"],
                     NEB["dust"]["opacity"] * dim, "evenodd", solo=True)


def ve_nguon_sang(ink, P, dim):
    """MỘT NGUỒN SÁNG TRỘI — bước đáng giá nhất của `chieu-sau-tuong-tac.md` §5.

    Mười sáu ĐA GIÁC LỒNG NHAU tô đặc, bán kính giảm dần từ `outer` về `core`,
    rìa méo theo góc. Độ mờ mỗi vòng tính NGƯỢC từ hồ sơ `light_alpha` để độ
    mờ CỘNG DỒN tại bán kính của nó bằng đúng hồ sơ — y như cách quầng sao
    làm, và vì cùng một lý do: vòng viền có hai mép nên mắt đếm được từng
    vòng, còn đĩa tô đặc chồng từ ngoài vào thì không.

    Vẫn KHÔNG `radialGradient` nào: luật 4 ở đầu tệp không có ngoại lệ, kể cả
    cho cái vật sáng nhất bức. Một ngoại lệ "chỉ cho nguồn sáng" là một cái lỗ
    để đúng cái lỗi 'mảng phẳng tô gradient' quay lại — mà lần này nó quay lại
    ở chỗ to nhất và dễ thấy nhất."""
    n = LIGHT["levels"]
    cx, cy = LIGHT["at"]["x"], LIGHT["at"]["y"]
    ban = [light_r_of_A((i + 1) / n) for i in range(n)]
    tich = 0.0       # độ mờ tích luỹ đã đạt, dùng chung cho cả ba dải
    for i in range(n):
        r = ban[i]
        if r <= 0:
            continue
        muc = (i + 1) / n
        col = (P["core"] if muc >= LIGHT["coreAt"]
               else P["glowCore"] if muc >= LIGHT["rimAt"] else P["glowRim"])
        a, tich = (muc - tich) / max(1e-6, 1.0 - tich), muc
        if a <= 0.004:
            continue
        # Số điểm theo BÁN KÍNH: vòng trong cùng (r ≈ 5) không cần 128 điểm,
        # và chênh lệch ấy là vài chục KB trên 128 vòng.
        seg = max(LIGHT["segMin"], min(LIGHT["segMax"],
                                       int(round(r / LIGHT["segPer"]))))
        # Khoảng cách tới vòng kế — biên độ dao động riêng của vòng này lấy
        # theo nó, nên hệ số dưới 0,5 là hai vòng KHÔNG THỂ cắt nhau (ràng
        # buộc cũ còn nguyên) mà biên giới của chúng thôi trùng pha.
        khe = abs(r - (ban[i + 1] if i + 1 < n else LIGHT["core"] * 0.5))
        jit = LIGHT["ringJitter"] * khe
        pts = []
        for k in range(seg):
            th = math.tau * k / seg
            rr = r * light_m(th, r)
            if jit > 0:
                rr += (RN.v(th * 7.3 + i * 2.1, i * 3.7) - 0.5) * 2 * jit
            pts.append((cx + math.cos(th) * rr, cy + math.sin(th) * rr))
        ink.fill("nguon-sang", pl(pts, True), col, a * dim, solo=True)
    # LẤM TẤM trong quầng — cùng lý lẽ với lấm tấm của tinh vân: nó là thứ giữ
    # cho mười sáu vòng phẳng khỏi đọc ra là mười sáu cái vòng. Ở đây nó cần
    # hơn ở tinh vân, vì nguồn sáng là vật TO nhất bức nên mỗi vòng của nó là
    # một mảng to.
    st = LIGHT["stipple"]
    R = LIGHT["tail"] * (1 + LIGHT["warp"])
    for i in range(int(st["count"] * DENSITY)):
        a = rnd(i * 3.1, 1.7) * math.tau
        r = math.sqrt(rnd(i * 5.3, 9.1)) * R
        x, y = cx + math.cos(a) * r, cy + math.sin(a) * r
        if not (VX0 <= x <= VX1 and VY0 <= y <= VY1):
            continue
        # Lọc theo ĐỘ MỜ TÍCH LUỸ, không theo `f` cũ (0 ở rìa, 1 ở lõi) — hồ
        # sơ nay là một bảng theo bán kính nên `f` không còn tồn tại.
        f = light_A(light_re(x, y))
        if f < st["at"] or rnd(x * 1.9, y * 4.1) > (f - st["at"]) * st["gain"]:
            continue
        ink.stroke("nguon-sang", dot(x, y), P["glowCore"],
                   st["size"] * 2, st["opacity"] * dim)


def ve_loe_ngang(ink, P, dim):
    """HAI VỆT LOÉ VUÔNG GÓC qua nguồn sáng — đọc được bằng mắt trên khung
    hình tham chiếu (`chieu-sau-tuong-tac.md` §2.2).

    Nó không phải trang trí: một vệt ngang là thứ nói ra "đây là một NGUỒN
    SÁNG, không phải một mảng sơn sáng" — mắt đọc vệt loé ra là ánh sáng tràn
    qua một thấu kính. Thuôn về hai đầu bằng ĐỘ MỜ, không bằng gradient.

    VỆT DỌC thêm ngày 19/10/2026: hai vệt vuông góc là chữ ký đọc-ra-ngay của
    "một nguồn sáng qua thấu kính", còn một vệt đơn độc thì đọc ra là một nét
    kẻ. Và đây là chỗ DUY NHẤT trong bản đồ được phép có hình căn trục —
    `SKY_LINK.axisMin` cấm góc vuông cho CHÒM, vệt loé không phải một chòm."""
    fl = LIGHT["flare"]
    cx, cy = LIGHT["at"]["x"], LIGHT["at"]["y"]
    # `span` đọc là NỬA vệt theo đơn vị `outer` (xem chú thích ở TS): 2,6 × 210
    # = 546 px mỗi bên, vệt dài 1 092 px = 80 % bề rộng khung.
    half = LIGHT["outer"] * fl["span"]
    for truc, dai in (("ngang", half), ("doc", half * fl["cross"])):
        for i in range(fl["steps"]):
            t = (i + 0.5) / fl["steps"]
            u = (t - 0.5) * 2                     # −1 … +1
            seg = dai * 2 / fl["steps"]
            thuon = max(0.0, 1.0 - abs(u)) ** 1.6
            if thuon <= 0.02:
                continue
            if truc == "ngang":
                p = [(cx + u * dai - seg / 2, cy), (cx + u * dai + seg / 2, cy)]
            else:
                p = [(cx, cy + u * dai - seg / 2), (cx, cy + u * dai + seg / 2)]
            ink.poly("loe-ngang", p, P["glowCore"],
                     fl["width"] * (0.4 + 0.6 * thuon),
                     fl["opacity"] * thuon * dim)


def ve_tinh_van(ink, P, dim):
    """Lớp 2 — thân Ngân Hà, NĂM đường đồng mức LỒNG NHAU.

    Đây là phương án §9.5, và nó được chọn CÓ Ý: tinh vân KHÔNG được là một
    `radial-gradient` phủ. Đó vừa là lỗi đã bị loại lần đầu ("mảng phẳng tô
    gradient"), vừa là dấu hiệu AI rõ nhất. Năm bậc phẳng cộng dồn
    1 − 0,85⁵ ≈ 0,56 ở lõi và 0,15 ở rìa, qua bốn bậc trung gian; khối thật
    đến từ chỗ khác — khe bụi tối NHÂN vào, sợi sáng, lấm tấm trong lõi, và
    mật độ sao nền đổi theo chính trường này."""
    lo, hi = NEB["levelLo"], NEB["levelHi"]
    n = NEB["levels"]
    fn = neb_lit
    muc = [lo + (hi - lo) * i / (n - 1) for i in range(n)]
    for i in range(n):
        col = P[neb_ton(i)]
        # MỘT `<path>` RIÊNG cho mỗi bậc, gom hết vòng của bậc ấy vào trong.
        # Xem chú thích dài ở `Ink.fill`: gộp hai bậc LỒNG NHAU vào một path
        # thì `evenodd` XOR chúng, và mười bốn bậc ra một dãy vành tô/không-tô
        # xen kẽ thay vì một dốc — bậc trong cùng có thể thành TRỐNG.
        d = "".join(pl(ch, True)
                    for ch in contours(fn, muc[i], MX0, MY0, MX1, MY1, NEB["cell"]))
        if d:
            ink.fill("tinh-van", d, col, NEB["levelOpacity"] * dim, "evenodd",
                     solo=True)
    # LẤM TẤM Ở BIÊN mỗi bậc — chỗ luật cấm gradient thật sự CẮN, và cách rẻ
    # nhất giữ được luật.
    #
    # Một dốc Lambert là liên tục; tô nó bằng 14 bậc vẫn cho ~12 mã màu sRGB
    # mỗi bậc, gấp sáu lần ngưỡng thấy dải (≈ 2 mã). Ba phương án đã cân: 14
    # bậc trần (thấy dải ở vùng rộng), 24 bậc (+88 KB, vẫn 7 mã), hay 14 bậc
    # cộng lấm tấm biên (~3 mã hiệu dụng, +52 KB). Chọn cách ba. Chấm mang
    # tông của bậc CAO HƠN và rắc trong dải `band` NGAY DƯỚI ngưỡng, nên mắt
    # đọc ra một chuyển tiếp thay vì một đường biên.
    dt = NEB["levelDither"]
    # Mật độ chấm/1000 px² → số mẫu trên cả khung; lọc theo điều kiện "đang ở
    # trong dải biên của bậc nào" nên mẫu bị loại phần lớn.
    tong = int(dt["per1000"] * VIEW["width"] * VIEW["height"] / 1000 * DENSITY)
    cols = max(1, int(math.sqrt(tong * VIEW["width"] / VIEW["height"])))
    rows = max(1, tong // cols)
    for i in range(cols):
        for j in range(rows):
            x = VX0 + VIEW["width"] * (i + 0.5) / cols \
                + (rnd(i * 1.3, j * 4.7) - 0.5) * VIEW["width"] / cols * 1.8
            y = VY0 + VIEW["height"] * (j + 0.5) / rows \
                + (rnd(i * 6.1, j * 2.3) - 0.5) * VIEW["height"] / rows * 1.8
            if not (VX0 <= x <= VX1 and VY0 <= y <= VY1):
                continue
            g = fn(x, y)
            # Bậc kế tiếp mà điểm này CHƯA tới. Dải biên tính theo GIÁ TRỊ
            # trường, quy từ `band` px bằng độ dốc cục bộ — nhưng một phép xấp
            # xỉ rẻ hơn đủ dùng: bề rộng một bậc chia theo tỉ lệ `band` trên
            # khoảng cách trung bình giữa hai đường đồng mức (~`cell` × 4).
            k = sum(1 for lv in muc if g > lv)
            if k >= n:
                continue
            thieu = muc[k] - g
            rong = (hi - lo) / (n - 1) * (dt["band"] / (NEB["cell"] * 8))
            if thieu > rong or thieu < 0:
                continue
            if rnd(x * 3.7, y * 2.9) > 1 - thieu / rong:
                continue
            ink.stroke("tinh-van", dot(x, y), P[neb_ton(k)],
                       NEB["stipple"]["size"] * 2, NEB["levelOpacity"] * dim)
    # Lấm tấm TRONG LÕI: thứ giữ cho năm bậc phẳng khỏi đọc ra là năm mảng.
    st = NEB["stipple"]
    cnt = int(st["count"] * DENSITY)
    cols = max(1, int(math.sqrt(cnt * VIEW["width"] / VIEW["height"])))
    rows = max(1, cnt // cols)
    for i in range(cols):
        for j in range(rows):
            u, v = (i + 0.5) / cols, (j + 0.5) / rows
            x = VX0 + VIEW["width"] * u + (rnd(i * 2.1, j * 5.3) - 0.5) * VIEW["width"] / cols * 1.7
            y = VY0 + VIEW["height"] * v + (rnd(i * 7.7, j * 3.1) - 0.5) * VIEW["height"] / rows * 1.7
            if not (VX0 <= x <= VX1 and VY0 <= y <= VY1):
                continue
            g = fn(x, y)
            if g < st["at"] or rnd(x * 2.9, y * 1.7) > (g - st["at"]) * st["gain"]:
                continue
            ink.stroke("tinh-van", dot(x, y), P["nebulaCore"],
                       st["size"] * 2, st["opacity"] * dim)


def ve_khe_bui(ink, P, dim):
    for lv in NEB["lane"]["levels"]:
        # MỘT `<path>` cho mỗi bậc — xem `ve_bui_xa` và `Ink.fill`.
        d = "".join(pl(ch, True)
                    for ch in contours(lane_field, lv, MX0, MY0, MX1, MY1, NEB["cell"]))
        if d:
            ink.fill("khe-bui", d, P["dustLane"],
                     NEB["lane"]["opacity"] * dim, "evenodd", solo=True)


def ve_soi_sang(ink, P, dim):
    """Lớp 4 — sợi sáng: ridged noise (1 − |fBm|), chỉ giữ phần giá trị cao
    nhất. Nét, không mảng: đó là thứ cho tinh vân một cấu trúc có HƯỚNG."""
    fl = NEB["filament"]
    cnt = int(fl["count"] * DENSITY)
    done = 0
    for i in range(cnt * 7):
        if done >= cnt:
            break
        x = VX0 + (rnd(i * 1.7, 11.3)) * VIEW["width"]
        y = VY0 + (rnd(i * 3.9, 7.1)) * VIEW["height"]
        g = neb_field(x, y)
        if g < fl["at"]:
            continue
        r = 1.0 - abs(NZ.fbm(x * 7.0 / W, y * 7.0 / W, 4,
                             NEB["lacunarity"], NEB["gain"]) * 2 - 1)
        if r < 1.0 - fl["keep"]:
            continue
        a = NZ.v(x * 0.013, y * 0.013) * math.pi
        L = fl["length"] * (0.5 + rnd(i * 5.1, 2.2))
        pts = wobble_line(x - math.cos(a) * L / 2, y - math.sin(a) * L / 2,
                          x + math.cos(a) * L / 2, y + math.sin(a) * L / 2, 1.4)
        ink.poly("soi-sang", pts, P["filament"], fl["width"],
                 fl["opacity"] * g * dim)
        done += 1


def vanh_sang_rim(ink, lop, cx, cy, r, P, dim, w=None, op=None):
    """VÀNH SÁNG RÌA — một luật, ba chỗ dùng, không ngoại lệ (§8.4).

    Một cung `glowCore` mỏng CHỈ trên nửa quay về mặt trời, độ mờ giảm theo
    `max(0, cos θ)^falloff`. Đó là thứ làm cả bức có MỘT hướng sáng — mục thứ
    tư trong công thức hùng vĩ, và mục mà bản cũ có 0 trên 4. Dùng cho khối
    chân trời, ba hành tinh, và vành đai; viết một lần ở đây để ba chỗ không
    thể lệch nhau."""
    rm = LIGHT["rim"]
    sx, sy = LIGHT["at"]["x"] - cx, LIGHT["at"]["y"] - cy
    d = math.hypot(sx, sy) or 1.0
    sx, sy = sx / d, sy / d
    n = max(24, int(r * 1.6))
    for k in range(n):
        th0 = math.tau * k / n
        th1 = math.tau * (k + 1) / n
        tm = (th0 + th1) / 2
        co = math.cos(tm) * sx + math.sin(tm) * sy      # n̂ · ŝ
        if co <= 0:
            continue
        a = (op or rm["opacity"]) * co ** rm["falloff"]
        if a <= 0.01:
            continue
        ink.poly(lop, [(cx + math.cos(th0) * r, cy + math.sin(th0) * r),
                       (cx + math.cos(th1) * r, cy + math.sin(th1) * r)],
                 P["glowCore"], w or rm["width"], a * dim)


def ve_hanh_tinh(ink, P, dim, only=None):
    """BA HÀNH TINH = BA BÀI CỬA (§7.2) — vật thể RẮN đầu tiên của bản đồ.

    Bản cũ chỉ có MỘT thể loại vật (sao nền · 48 ngôi · nét chòm · tinh vân ·
    lưới · mạch), tức không một vật RẮN nào, tức không một chỗ CHE KHUẤT nào —
    và che khuất là tín hiệu chiều sâu rẻ nhất mà bức tranh có thể có. Ở đây
    có hai lần che trong MỘT vật: nửa gần của vành đai phủ lên hành tinh, hành
    tinh phủ lên nửa xa của vành.

    Pha ĐỌC RA được hướng mặt trời: viền sáng của cả ba quay về (680, 313).
    Không một ký hiệu nào làm được điều đó, và đó là lý do bài cửa được vẽ
    bằng một vật chứ không bằng một ngôi to hơn."""
    ph = PLANET["phase"]
    rg = PLANET["ring"]
    cx0, cy0 = LIGHT["at"]["x"], LIGHT["at"]["y"]
    dk_chom = {}
    for key, _h in HULLS:
        ps = [(x, y) for _c, x, y, _r, _t, k in STARS if k == key]
        dk_chom[key] = max((math.hypot(a[0] - b[0], a[1] - b[1])
                            for i, a in enumerate(ps) for b in ps[i + 1:]), default=0.0)
    for code, x, y, _r, _t, key in STARS:
        if code not in BAI_CUA:
            continue
        if only is not None and key != only:
            continue
        dk = max(PLANET["sizeMin"],
                 min(PLANET["sizeMax"], PLANET["sizeRatio"] * dk_chom[key]))
        R = dk / 2
        d = math.hypot(x - cx0, y - cy0)
        phi = math.radians(ph["base"] - ph["span"] * min(1.0, d / ph["ref"]))
        # Góc của hướng TỚI mặt trời — trục của phép phân giới sáng/tối.
        al = math.atan2(cy0 - y, cx0 - x)
        # ── VÀNH ĐAI, NỬA XA trước (bị hành tinh phủ lên) ────────────────
        amaj, amin = R * rg["major"], R * rg["major"] * math.cos(math.radians(rg["tilt"]))
        nghieng = math.radians(18)
        def vanh(t0, t1, n=28):
            pts = []
            for k in range(n + 1):
                t = t0 + (t1 - t0) * k / n
                ex, ey = amaj * math.cos(t), amin * math.sin(t)
                pts.append((x + ex * math.cos(nghieng) - ey * math.sin(nghieng),
                            y + ex * math.sin(nghieng) + ey * math.cos(nghieng)))
            return pts
        ink.poly("hanh-tinh", vanh(math.pi, math.tau), P["glowRim"],
                 rg["width"], rg["opacity"] * dim)
        # ── MẶT TỐI: một đĩa gần đặc ──────────────────────────────────────
        ink.fill("hanh-tinh", pl([(x + math.cos(math.tau * k / 48) * R,
                                   y + math.sin(math.tau * k / 48) * R)
                                  for k in range(48)], True),
                 P["dustLane"], PLANET["nightOpacity"] * dim)
        # ── MẶT SÁNG: ĐÚNG HAI CUNG ───────────────────────────────────────
        #
        # Cung rìa hành tinh (nửa quay về mặt trời) + cung đường phân giới,
        # một ellipse bán trục `R·|cos φ|`. Hai cung tròn là TOÀN BỘ hình học
        # của một pha — không clip, không mask, không gradient, và đó là vì sao
        # luật cấm gradient không cắn ở đây.
        b = R * abs(math.cos(phi))
        dau = -1.0 if math.cos(phi) < 0 else 1.0
        pts = []
        for k in range(25):          # cung rìa, từ cực này sang cực kia
            t = -math.pi / 2 + math.pi * k / 24
            pts.append((x + math.cos(al + t) * R, y + math.sin(al + t) * R))
        for k in range(25):          # cung phân giới, quay về
            t = math.pi / 2 - math.pi * k / 24
            ex, ey = dau * b * math.cos(t), R * math.sin(t)
            pts.append((x + ex * math.cos(al) - ey * math.sin(al),
                        y + ex * math.sin(al) + ey * math.cos(al)))
        ink.fill("hanh-tinh", pl(pts, True), P["hues"][next(
            c["hue"] for c in CONS if c["key"] == key)],
            PLANET["litOpacity"] * dim)
        # ── VÀNH ĐAI, NỬA GẦN (phủ LÊN hành tinh) ─────────────────────────
        ink.poly("hanh-tinh", vanh(0.0, math.pi), P["glowRim"],
                 rg["width"], rg["opacity"] * dim)
        # ── VÀNH SÁNG RÌA, cùng luật với khối chân trời ────────────────────
        vanh_sang_rim(ink, "hanh-tinh", x, y, R, P, dim)


def ve_tia_bui(ink, P, dim):
    """CHÍN NÊM TIA SÁNG XUYÊN BỤI (§8.3).

    Nó nói gì: một nêm TỐI là bằng chứng có thứ CHẮN giữa mặt trời và người
    xem, tức giữa hai vật có KHÔNG GIAN. Đây là tín hiệu "có một mặt trời ở
    kia" mạnh thứ hai sau vệt loé, và nó rẻ — chín đa giác.

    Nêm bắt đầu từ các nút BỤI DÀY trong `within` px quanh mặt trời và toả
    theo hướng xuyên tâm; mọi nêm bị CẮT ở rìa khối chân trời, vì dưới rìa thì
    không lớp nào sống sót."""
    ry = LIGHT["ray"]
    cx, cy = LIGHT["at"]["x"], LIGHT["at"]["y"]
    # Chọn chín hướng bằng cách quét góc và lấy chỗ trường bụi dày nhất —
    # tất định, và nó neo nêm vào HÌNH của tinh vân chứ không vào một danh
    # sách góc viết tay (một danh sách như thế sẽ lệch ngay lần dải Ngân Hà
    # dịch, và lệch im lặng).
    ung = []
    for k in range(72):
        th = math.tau * k / 72
        r = ry["within"] * 0.55
        x, y = cx + math.cos(th) * r, cy + math.sin(th) * r
        ung.append((neb_field(x, y) + dust_field(x, y) * 0.5, th))
    ung.sort(reverse=True)
    # Lọc cho chín hướng CÁCH NHAU: lấy dày nhất rồi loại mọi hướng trong 18°.
    chon = []
    for _g, th in ung:
        if all(abs((th - t + math.pi) % math.tau - math.pi) > math.radians(18)
               for t in chon):
            chon.append(th)
        if len(chon) >= ry["count"]:
            break
    g0, g1 = ry["spread"]
    l0, l1 = ry["length"]
    o0, o1 = ry["opacity"]
    # BA NÊM LỒNG NHAU cho mỗi tia, không một. Trên PNG bản một-nêm, chín tia
    # đọc ra là **chín vạch kẻ kỹ thuật**: mép sắc tuyệt đối, bề rộng đều,
    # toả đều từ tâm — dấu hiệu "máy vẽ" rõ nhất trong cả bức, và không con số
    # nào trong bảng tám bậc nhìn thấy nó. Ánh sáng thật qua bụi có mép TÁN và
    # bề rộng KHÔNG ĐỀU. Luật cấm gradient còn nguyên: cái tán ở đây làm bằng
    # ba lớp phủ chồng (nêm ngoài rộng hơn và mờ hơn), đúng kỹ thuật của quầng
    # sao và của bậc tinh vân.
    lop = ry["layers"]
    for i, th in enumerate(sorted(chon)):
        u = i / max(1, len(chon) - 1)
        mo = math.radians(g0 + (g1 - g0) * rnd(i * 2.3, 7.1))
        dai = l0 + (l1 - l0) * rnd(i * 4.7, 3.3)
        r0 = LIGHT["core"] * 1.1
        for q in range(lop):
            # Nêm q: rộng hơn và mờ hơn khi ra ngoài. `q = 0` là lõi tia.
            rong = 1.0 + ry["layerSpread"] * q
            amo = (o0 + (o1 - o0) * u) / (1.0 + ry["layerFade"] * q)
            pts = []
            for s in (-1, 1):
                for k in range(ry["steps"]):
                    t = k / (ry["steps"] - 1)
                    rr = r0 + (r0 + dai) * t
                    # BỀ RỘNG KHÔNG ĐỀU theo chiều dài: một nhiễu dọc trục,
                    # nên tia phình ra thóp vào thay vì là một cái nêm thẳng.
                    phinh = 0.55 + 0.9 * NZ.v(t * 3.1 + i * 7.7, q * 2.3 + 1.9)
                    a = th + s * mo / 2 * rong * phinh * (0.3 + 0.7 * t)
                    # Rung MÉP: biên độ lớn dần ra ngoài — gốc tia còn gọn,
                    # ngọn thì tướp. Nhiễu liên tục theo `t` (không phải
                    # `rnd` theo chỉ số) nên mép gợn chứ không gãy khúc.
                    j = ry["jitter"] * (0.25 + t) * rong
                    x = cx + math.cos(a) * rr + (NZ.v(t * 5.3 + i * 3.3, s + q * 4.1) - 0.5) * 2 * j
                    y = cy + math.sin(a) * rr + (NZ.v(t * 4.1 + i * 9.1, s * 2 + q) - 0.5) * 2 * j
                    # CẮT ở rìa chân trời — nêm là một lớp của TRỜI, và trời
                    # dừng ở mép khối.
                    y = min(y, chan_troi_y(x))
                    pts.append((x, y))
                if s < 0:
                    pts.reverse()
            ink.fill("tia-bui", pl(pts, True), P["dustLane"], amo * dim)


def ve_quang_chan_troi(ink, P, dim):
    """Lớp 5 — KHỐI CHÂN TRỜI: rìa một thiên thể, tô ĐẶC (§7.1).

    Thay cho dải 170 px gạch ngang cũ, thứ vừa mờ vừa không có mép vừa không
    phải một vật. Bốn việc nó làm, và không việc nào thay được bằng thứ khác:
    một mép CỨNG LIỀN chạy hết bề rộng (tín hiệu chiều sâu mạnh nhất có thể có
    với một nét duy nhất); một cái THƯỚC (1 250 sao nền dừng đột ngột ở mép
    đó); một khối TỐI LỚN đối trọng với mặt trời chói ở giữa; và HƯỚNG SÁNG —
    vành sáng chỉ xuất hiện ở nửa quay về mặt trời, nên nó CHỨNG MINH có một
    nguồn sáng chứ không chỉ hiển thị một nguồn sáng."""
    n = 160
    xs = [VX0 + (VX1 - VX0) * i / n for i in range(n + 1)]
    # KHỐI TỐI: một đa giác đi theo cung rồi khép qua đáy khung. `base` ĐẶC —
    # không một ngôi, không một nét tinh vân nào sống sót bên dưới nó, và đó
    # là toàn bộ sức mạnh của lớp này (xem `ve_truong_sao`, `contours`).
    than = [(x, chan_troi_y(x)) for x in xs] + [(VX1, VY1 + 4), (VX0, VY1 + 4)]
    ink.fill("quang-chan-troi", pl(than, True), P["base"], 1.0)
    # LỚP KHÍ rồi VÀNH SÁNG, theo thứ tự đó: lớp khí dày và mờ nằm TRÊN mép,
    # vành sáng mảnh và rõ nằm ĐÚNG trên mép. Vẽ khí trước thì vành sáng không
    # bị nó làm nhoè.
    for ten in ("air", "rim"):
        c = HORIZON[ten]
        for i in range(n):
            x0, x1 = xs[i], xs[i + 1]
            co = chan_troi_cos((x0 + x1) / 2)
            if ten == "air":
                a = c["opacity"] * (0.4 + 0.6 * co)
            else:
                a = c["opacity"] * co ** HORIZON["rim"]["falloff"]
            if a <= 0.004:
                continue
            dy = -c["width"] / 2 if ten == "air" else 0.0
            ink.poly("quang-chan-troi",
                     [(x0, chan_troi_y(x0) + dy), (x1, chan_troi_y(x1) + dy)],
                     P["glowRim"] if ten == "air" else P["glowCore"],
                     c["width"], a * dim)


def mat_do_sao(x, y):
    """Trường mật độ sao nền (§7.1). Trời thật dày sao ở Ngân Hà và thưa ở hai
    cực, nên trường sao không rải đều là có LÝ DO vật lý, không phải một hiệu
    ứng. Dòng `hull` quan trọng nhất: trời LOÃNG HẲN ngay chỗ có một chòm."""
    D, A = FIELD["density"], FIELD["at"]
    g = neb_field(x, y)
    k = D["core"] if g > A["core"] else (D["edge"] if g > A["edge"] else D["plain"])
    if lane_field(x, y) > A["lane"]:
        k *= D["lane"]
    # Hai góc xa Ngân Hà nhất.
    t, s = mw_coords(x, y)
    if abs(s) > mw_half(t) * A["far"]:
        k *= D["far"]
    k *= D["hull"] + (1 - D["hull"]) * hull_atten(x, y, FIELD["hullPad"])
    return k


def ve_truong_sao(ink, P, dim):
    """1 250 ngôi cho cả khung (ở đây: phần của ô crop). Một bầu trời "gian
    lận" có chủ ý — trời thật ở khung 60°×34° chỉ có ~410 ngôi tới cấp 6,5 —
    đủ dày để ra chất trời mà vẫn thưa để 48 ngôi mang nghĩa còn THẮNG ĐƯỢC.

    Bốn hàng rào của §7.2 nằm ngay trong hàm này:
     1 bán kính CỐ ĐỊNH `FIELD.radius`, dưới KHE TRỐNG 1,20–2,20;
     2 sắc trung tính LẠNH, không phải một trong tám sắc khoáng;
     3 không quầng, chỉ một chấm;
     4 không ngôi nào nằm trên một nét chòm (loại thẳng ở dưới)."""
    area = VIEW["width"] * VIEW["height"]
    target = FIELD["per10k"] * area / 10000.0 * DENSITY
    # Nhiễu xanh kiểu `stipple_rect`: lưới thô rồi ĐẨY mỗi chấm. Ngẫu nhiên
    # thuần vón cục thành những "chòm sao giả" mà không ai định vẽ — đúng loại
    # nhiễu phá hỏng cả bản đồ.
    over_sample = FIELD["overSample"]
    cnt = int(target * over_sample)
    cols = max(1, int(math.sqrt(cnt * VIEW["width"] / VIEW["height"])))
    rows = max(1, cnt // cols)
    jit = FIELD["blueNoise"]
    tiers = FIELD["tiers"]
    # Hàng rào 4 tính cả MẠCH HOÀNG ĐẠO: một sao nền nằm ngay trên cung thì
    # cung đọc ra là một dãy chấm, và ba lớp liên kết của §4 lẫn vào nhau.
    mp = mach_duong()
    net = net_chom_segs() + [(mp[i], mp[i + 1]) for i in range(len(mp) - 1)]
    for i in range(cols):
        for j in range(rows):
            u, v = (i + 0.5) / cols, (j + 0.5) / rows
            x = VX0 + VIEW["width"] * u + (rnd(i * 4.3, j * 1.1) - 0.5) * VIEW["width"] / cols * jit * 2
            y = VY0 + VIEW["height"] * v + (rnd(i * 2.7, j * 8.9) - 0.5) * VIEW["height"] / rows * jit * 2
            if not (VX0 + 1 <= x <= VX1 - 1 and VY0 + 1 <= y <= VY1 - 1):
                continue
            # DƯỚI RÌA KHỐI CHÂN TRỜI thì KHÔNG một sao nào. Đây là cả sức
            # mạnh của lớp §7.1: 1 250 sao nền dừng lại ĐỘT NGỘT ở một mép
            # cứng, và mắt suy ra ngay cái này ở gần, kia ở xa. Vẽ rồi để khối
            # tô đặc che đi thì đúng kết quả nhưng tốn byte của mấy trăm nét
            # không ai thấy.
            if y > chan_troi_y(x):
                continue
            if rnd(x * 1.3, y * 3.7) * over_sample > mat_do_sao(x, y):
                continue
            # Hàng rào 4 + không đè lên một ngôi mang nghĩa.
            if any(seg_dist(x, y, a[0], a[1], b[0], b[1]) < FIELD["keepOffLine"]
                   for a, b in net):
                continue
            if any(math.hypot(x - sx, y - sy) < r * FIELD["keepOffStar"] + FIELD["keepOffLine"]
                   for _, sx, sy, r, _, _ in STARS):
                continue
            q = rnd(y * 5.9, x * 2.3)
            acc = 0.0
            t = tiers[0]
            for cand in tiers:
                acc += cand["share"]
                t = cand
                if q <= acc:
                    break
            op = t["opacity"]
            # Phối cảnh khí quyển (§3.2): sao ở dải chân trời mờ hơn mà TO hơn
            # — nhìn qua một lớp khí dày. Bán kính vẫn bị kẹp ở `FIELD.radius`
            # (luật Stellarium), nên "to hơn" đi vào bề rộng nét, không vào
            # một bán kính mới làm vỡ khe trống 1,20–2,20.
            h = horizon_amt(y, x)
            op *= 1.0 - FIELD["horizonFade"] * h
            ink.stroke("truong-sao", dot(x, y), P["field"],
                       FIELD["radius"] * 2 * (1 + FIELD["horizonSwell"] * h), op * dim)


def ve_luoi(ink, P, dim):
    """Lưới kinh–vĩ cong — thứ nói ra "đây là MỘT MẶT CẦU, không phải tờ giấy
    phẳng". Tương phản 1,38:1 là CỐ Ý dưới ngưỡng: lưới là chất liệu chứ không
    mang tin, và nếu nó đủ rõ để đọc thì nó cạnh tranh với nét chòm."""
    g = GRID
    def cut(pts):
        """Lưới ĐỨT ở chỗ cắt qua một ngôi của chòm (nghỉ `starGap` mỗi bên).
        Chỗ đứt ấy là tín hiệu che khuất: sao nằm TRƯỚC lưới."""
        runs, cur = [], []
        for x, y in pts:
            hit = any(math.hypot(x - sx, y - sy) < r + g["starGap"]
                      for _, sx, sy, r, _, _ in STARS)
            if hit:
                if len(cur) > 1:
                    runs.append(cur)
                cur = []
            else:
                cur.append((x, y))
        if len(cur) > 1:
            runs.append(cur)
        return runs

    for i in range(g["parallels"]):
        # Vòng vĩ tuyến: cong LÕM LÊN ở nửa trên và LÕM XUỐNG ở nửa dưới, đúng
        # cách một tấm bản đồ sao hình chữ nhật chiếu mặt cầu. Vòng giữa thẳng.
        fy = (i + 0.5) / g["parallels"]
        y0 = fy * H
        k = (fy - 0.5) * 2
        pts = [(x, y0 + k * g["sagMax"] * math.sin(math.pi * x / W))
               for x in range(-20, W + 21, 12)]
        for run in cut(pts):
            ink.poly("luoi", run, P["grid"], g["width"], g["opacity"] * dim,
                     dash=g["dash"])
    for i in range(g["meridians"]):
        # Kinh tuyến hội tụ nhẹ về hai mép trên/dưới.
        cx = W / 2 + (i - (g["meridians"] - 1) / 2) * g["meridianGap"]
        pts = []
        for y in range(-20, H + 21, 12):
            k = abs(y / H - 0.5) * 2
            s = 1.0 - (1.0 - g["converge"]) * k
            pts.append((W / 2 + (cx - W / 2) * s, y))
        for run in cut(pts):
            ink.poly("luoi", run, P["grid"], g["width"], g["opacity"] * dim,
                     dash=g["dash"])


def net_chom_segs():
    """Đoạn nối (đã trừ khe hở hai đầu) — dùng cả để vẽ lẫn để kiểm."""
    pos = {code: (x, y, r) for code, x, y, r, _, _ in STARS}
    out = []
    for c in CONS:
        for ab in c["lines"]:
            # `ab` dài 2 hoặc 3 — phần tử thứ ba là cờ `'dam'` (§2). Mở gói
            # bằng chỉ số chứ không bằng `for a, b in …`, vì cách kia ném
            # ValueError ngay ở M6 và thông báo của nó không nói gì về cái cờ.
            a, b = ab[0], ab[1]
            ax, ay, ar = pos[a]
            bx, by, br = pos[b]
            dx, dy = bx - ax, by - ay
            L = math.hypot(dx, dy) or 1.0
            ux, uy = dx / L, dy / L
            # Nét DỪNG CÁCH TÂM SAO `r + gap`: quy ước bản đồ sao — nét nối
            # không được chạm vào sao, nếu không sao thành một cái NÚT của nét
            # thay vì một vật thể. Đây cũng là lý do bản vực cũ nhìn rối.
            g = LINK["gap"]
            out.append(((ax + ux * (ar + g), ay + uy * (ar + g)),
                        (bx - ux * (br + g), by - uy * (br + g))))
    return out


def ve_mach(ink, P, dim):
    """MẠCH PHỤ THUỘC — lớp liên kết thứ hai của §4, và nó phải phân biệt được
    với hai lớp kia BẰNG MẮT.

    Ba thứ làm việc đó, và cả ba đều cố ý: nét ĐỨT (nét chòm liền), SẮC RIÊNG
    `profile.zodiac` (nét chòm dùng sắc của chặng), và nó đi XUYÊN QUA các chòm
    thay vì ở trong một chòm. Luật "mỗi loại nét một sắc riêng, không chia sắc
    giữa hai loại" lấy từ Stellarium — nó dành `#CC4C4C` riêng cho đường ranh
    giới, khác hẳn sắc nét chòm (§4.1).

    Không mũi tên, không chữ trên cung: hướng của phụ thuộc đọc ra được mà
    không cần mũi tên, vì bốn chòm xếp theo thứ tự dọc cung và chòm cuối (M8)
    là chòm sáng nhất — mắt đi về phía sáng."""
    pts = mach_duong()
    # ──── VỎ BỌC TỐI DƯỚI MỘT LÕI SÁNG ────────────────────────────────────
    #
    # Mạch là vệt DỄ TRƯỢT 3 : 1 NHẤT của cả bức — đặc tả báo trước đúng điều
    # đó ở va chạm #3 — vì cung chạy xuyên nửa trên bầu trời qua nhiều vùng độ
    # chói khác nhau. Sau khi tinh vân được chiếu sáng, nó trượt thật: 2,39 : 1
    # tại (844, 552), chỗ nền đo được L = 0,085.
    #
    # LUẬT ĐƯỜNG CHÓI (§10.3) KHÔNG chữa được chỗ này, và nói ra vì sao để
    # không ai thử lại: ở nền L = 0,085, tông SÁNG cho 2,39 : 1 còn tông TỐI
    # cho **1,65 : 1** — tệ hơn. Đổi tông chỉ chữa được hai đầu dải; giữa dải
    # có một VÙNG CHẾT mà không tông nào đạt, vì độ mờ 0,48 không đủ kéo màu
    # ra xa nền theo bất cứ chiều nào. Luật ấy vẫn đúng cho NÉT CHÒM (sắc
    # khoáng sáng hơn hẳn, và nét chòm nằm trong bao lồi nơi nền đã bị làm
    # loãng), nhưng mạch thì cần một thứ khác.
    #
    # Thứ đó là một thủ pháp bản đồ cổ: **một lõi sáng trên một vỏ bọc tối**.
    # Tương phản được đo giữa LÕI và VỎ, nên nó KHÔNG phụ thuộc vào nền — đo
    # được 4,7 : 1 trên trời trống và 4,1 : 1 giữa tinh vân sáng. Đây cũng là
    # khuôn đã dùng cho vòng hai nét của chip mã bài ("vòng HAI NÉT không thể
    # cùng trượt 3:1"), nên nó không phải một cơ chế mới phải tin.
    cs = ZOD["casing"]
    for duong, op in ((pts, ZOD["opacity"]),
                      (mach_le(pts, ZOD["bandOffset"]), ZOD["bandOpacity"])):
        ink.poly("mach-hoang-dao", duong, P["dustLane"],
                 ZOD["width"] + cs["grow"], cs["opacity"] * dim, dash=ZOD["dash"])
        ink.poly("mach-hoang-dao", duong, P["zodiac"], ZOD["width"],
                 op * dim, dash=ZOD["dash"])


def ve_net_chom(ink, P, focus, only=None):
    """Năm mươi nét cho bốn mươi tám ngôi. Nối theo HÌNH, không theo đường ngắn
    nhất: luật của H. A. Rey (1952) — nét nối tồn tại để LÀM RA MỘT HÌNH NHẬN
    RA ĐƯỢC. Cây khung ngắn nhất cho ra một mớ gạch, đúng thứ cần tránh.

    Trần 12 nét cho một chòm (§4.1): trên mức đó hình bắt đầu không nhớ được.
    M6 dùng đúng 12 — script tự chặn ở dưới nếu ai thêm quá trần.

    `focus` là KHOÁ của chòm đang được trỏ vào, hay `None` cho trạng thái nghỉ.
    Bản mẫu một chòm dùng một cờ `bool` vì "chòm đang trỏ" và "chòm duy nhất"
    là một; với tám chòm thì hover phải nói RÕ chòm nào, vì bảy chòm còn lại
    phải MỜ ĐI (`scale.dimOpacity`) — tách hình khỏi nền bằng TƯƠNG PHẢN, không
    bằng chuyển động (§10 hiệu ứng 3)."""
    for c in CONS:
        if len(c["lines"]) > LINK["maxLines"]:
            raise SystemExit(
                "chòm %s có %d nét, vượt trần %d của đặc tả §4.1 — trên mức đó "
                "hình không nhớ được nữa"
                % (c["key"], len(c["lines"]), LINK["maxLines"]))
    # Độ mờ và bề rộng nét LẤY TỪ HỒ SƠ (`scale.lineOpacity`, `scale.line`),
    # không từ `SKY_LINK` — bảng §19.3 cho phép đúng ba thứ này khác nhau giữa
    # hai bản, và chúng phải khác ở MỘT chỗ chứ không ở hai.
    nghi, hover = P["scale"]["lineOpacity"]
    segs = net_chom_segs()
    i = 0
    for c in CONS:
        hue = P["hues"][c["hue"]]
        if focus is None:
            op = nghi
        elif focus == c["key"]:
            op = hover
        else:
            op = P["scale"]["dimOpacity"]
        for ab in c["lines"]:
            a, b = segs[i]
            i += 1
            # `only` cắt tấm xuống còn MỘT chòm. Vòng lặp vẫn chạy đủ tám để
            # `segs` được tiêu đúng thứ tự — bỏ qua bằng `continue` ở ĐÂY chứ
            # không bằng một `if` quanh cả vòng, vì `segs` là một danh sách
            # PHẲNG đánh theo thứ tự khai và nhảy qua một chòm là lệch chỉ số.
            if only is not None and c["key"] != only:
                continue
            # Nét ĐẬM HƠN ở hàng/cột nhãn của M6 — chỗ DUY NHẤT trong cả bản
            # đồ mà độ dày nét mang nghĩa riêng (§2). Nó nói ra khác biệt giữa
            # `ndarray` (M5, không nhãn) và `DataFrame` (M6, có nhãn) bằng
            # HÌNH chứ không bằng chữ, nên nó cũng phải có trong chú giải.
            w = P["scale"]["line"] * (LINK["emphasis"] if len(ab) > 2 else 1.0)
            # Độ dày KHÔNG đổi khi hover: đổi kích thước là "chuyển động" theo
            # định nghĩa hẹp của WCAG, nên nó phải bỏ dưới `reduce`. Hai tấm
            # ảnh chỉ khác nhau ở ĐỘ MỜ ⇒ bản này an toàn với `reduce` ngay từ
            # lúc sinh, không cần một tấm thứ ba.
            # LUẬT ĐƯỜNG CHÓI (§10.3): vệt nào nằm trên nền ĐỦ SÁNG thì đổi từ
            # tông sắc khoáng sang tông TỐI. Nó đúng về vật lý (một vật trước
            # nền sáng đọc ra là bóng đen), nó là thứ giữ sàn 3 : 1 ở vùng mềm
            # quanh mặt trời, và nó cho ra hiệu ứng đẹp nhất của cả bản: phần
            # của một chòm gần mặt trời nhất SẬM LẠI THÀNH BÓNG còn phần xa thì
            # sáng — một chòm có hai tông vì nó nằm trong một không gian CÓ ánh
            # sáng. Chia đoạn làm ba để chuyển tông bắt được giữa một nét dài.
            for t0, t1 in ((0.0, 1 / 3), (1 / 3, 2 / 3), (2 / 3, 1.0)):
                qa = (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0)
                qb = (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)
                mx, my = (qa[0] + qb[0]) / 2, (qa[1] + qb[1]) / 2
                mau = net_tong(mx, my, hue, P)
                # VỎ BỌC, tông NGƯỢC với lõi — và nó phải dùng CHÍNH đường
                # rung ấy, không một đường rung thứ hai: `wobble_line` là một
                # hàm nhiễu theo toạ độ nên gọi hai lần cho ra hai đường khác
                # nhau, tức vỏ lệch khỏi lõi vài phần mười px và lộ ra một
                # bên. Dựng MỘT lần rồi vẽ hai lượt.
                #
                # Vỏ vẽ TRƯỚC lõi trong cùng lớp `net-chom`: `Ink` giữ thứ tự
                # chèn khoá, nên mọi vỏ của mọi chòm ra trước mọi lõi. Đó là
                # thứ tự ĐÚNG — vỏ của chòm này không được nằm trên lõi của
                # chòm kia ở chỗ hai chòm giao nhau.
                duong = wobble_line(qa[0], qa[1], qb[0], qb[1], LINK["wobble"])
                cs = LINK["casing"]
                ink.poly("net-chom", duong, net_vo_tong(mau, P),
                         w + cs["grow"], cs["opacity"] * (op / nghi))
                ink.poly("net-chom", duong, mau, w, op)


def ve_sao(ink, P, focus, only=None):
    """Ba vòng tròn đồng tâm, vẽ từ ngoài vào: quầng · thân · lõi.

    Quầng dựng bằng VÒNG ĐỒNG TÂM độ mờ ~1/r, không bằng `radialGradient`:
    `1/r²` tắt quá nhanh để mắt đọc ra một cái quầng, Gauss thuần còn nhanh
    hơn nữa. Đổi khỏi gradient để ca test chặn được gradient TUYỆT ĐỐI — xem
    luật 4 ở đầu tệp."""
    if P["halo"]["kind"] != "glow":
        raise SystemExit(
            "hồ sơ khai quầng kiểu '%s' (vùng BỎ CHẤM của bản sáng, §18.3) — "
            "bộ sinh chưa dựng kiểu đó. Nói ra ở đây chứ không âm thầm vẽ quầng "
            "toả rồi xuất ra một tệp mang tên bản sáng." % P["halo"]["kind"])
    for code, x, y, r0, t, ckey in STARS:
        if only is not None and ckey != only:
            continue
        hue = P["hues"][next(c["hue"] for c in CONS if c["key"] == ckey)]
        # Chòm KHÔNG được trỏ vào mờ đi theo đúng tỉ lệ của nét chòm, nên hai
        # lớp cùng một chòm không bao giờ lệch trạng thái với nhau.
        mo = 1.0
        if focus is not None and focus != ckey:
            mo = P["scale"]["dimOpacity"] / P["scale"]["lineOpacity"][0]
        # Bán kính × `scale.star` — bảng §19.3: 1,00 ở bản tối, 1,08 ở bản sáng
        # (chấm mực cần to hơn một chút để cùng đọc ra bằng ngần ấy bậc).
        r = round(r0 * P["scale"]["star"], 2)
        halo_r = r * t["haloScale"]
        base_op = (t["haloOpacity"]
                   + (MAG["haloFocusBoost"] if focus == ckey else 0.0)) * mo
        n = MAG["haloRings"]
        # ĐĨA TÔ ĐẶC chồng từ ngoài vào, KHÔNG phải vòng viền: vòng viền có
        # hai mép nên mắt đếm được từng vòng — bản đầu render ra đúng một củ
        # hành, không ra một cái quầng.
        #
        # Độ mờ mỗi đĩa chọn sao cho ĐỘ MỜ CỘNG DỒN tại bán kính của nó bằng
        # đúng `base × r/ρ`. Ba điểm dừng của §6.2 xấp xỉ **1/r**, KHÔNG phải
        # 1/r² và cũng không phải Gauss thuần — số đo lấy từ một shader trường
        # sao đang chạy thật (hệ số quầng là 0,01/d). 1/r² tắt quá nhanh để
        # mắt đọc ra một cái quầng; Gauss thuần còn nhanh hơn nữa.
        tich = 0.0
        for i in range(n):
            f = r / halo_r + (1.0 - r / halo_r) * i / (n - 1)
            rr = r / f
            muc = base_op * f
            a = (muc - tich) / max(1e-6, 1.0 - tich)
            tich = muc
            ink.fill("quang-sao",
                     "M%s %sa%s %s 0 1 0 %s 0a%s %s 0 1 0 -%s 0Z"
                     % (nf(x - rr), nf(y), wf(rr), wf(rr), wf(rr * 2),
                        wf(rr), wf(rr), wf(rr * 2)),
                     hue, a)
        ink.circle("sao-bai", x, y, r, hue, mo)
        # Lõi trắng không phải trang trí: sao thật cháy trắng ở tâm và chỉ ánh
        # màu ở rìa. Nó cũng là thứ giữ cho tám sắc khoáng không biến 48 ngôi
        # thành 48 chấm kẹo. Trắng tuyệt đối (`profile.core`) CHỈ được dùng ở
        # đúng chỗ này trong cả bản đồ — nhờ thế nó thành một giá trị MANG NGHĨA.
        # `core: null` ⇒ KHÔNG vẽ lõi (bản sáng, §18.3). Một khoá `null` thay
        # cho một nhánh `if profile == 'light'`: nhánh `if` theo TÊN hồ sơ là
        # đúng chỗ hai bản trôi xa nhau mà không ai thấy (§19.1).
        if P["core"]:
            ink.circle("loi-sao", x, y, r * MAG["coreScale"], P["core"],
                       MAG["coreOpacity"] * mo)


# ═══════════════════════════════════════════════════════════════════════
# 8 · nhãn — luật neo, và build TRƯỢT nếu không đặt được
# ═══════════════════════════════════════════════════════════════════════


def text_w(s: str, size: float) -> float:
    """Bề rộng chữ, ước lượng RỘNG hơn thật.

    Chữ nằm trong một tài liệu SVG riêng (ảnh vào trang bằng `<img>`), nên
    webfont của trang KHÔNG với tới được và font thật tuỳ máy. Đo HẸP là tự
    cho phép nhãn chồng lên sao trên máy người khác — nên ước lượng rộng, và
    đo theo số ký tự sau khi bỏ dấu kết hợp (tiếng Việt có dấu nên `len()`
    thô đếm cả dấu tổ hợp là đếm lố)."""
    import unicodedata
    base = sum(1 for ch in unicodedata.normalize("NFD", s)
               if not unicodedata.combining(ch))
    return base * LBL["advance"] * size


def nhan_hinh_hoc(c, anchor, leg, sx, sy):
    """Hình học §8.3 của một chỗ đặt: ba điểm đường dẫn + hộp chữ + câu chữ.

    Tách riêng để đúng MỘT hàm dựng hình học, dùng cho cả lượt TÌM (`--place-
    nhan`) lẫn lượt KIỂM (mỗi lần build). Hai hàm là hai công thức sẽ lệch.

    HAI DÒNG, và dòng dưới CHỈ hiện lúc trỏ vào (xem `ve_nhan`):
     · `name` = `M1 · Tiến trình` — mã chặng · tên phần. Luôn hiện. Đây là
       dòng đã THAY tên chòm ("Kẹp") ngày 19/10/2026;
     · `sub` = `Advanced Python · 7 bài` — tên khoá · số bài. Chỉ lúc hover.

    Nhưng HỘP VA CHẠM tính CẢ HAI dòng dù lúc nghỉ chỉ vẽ một. Một chỗ đặt
    phải hợp lệ ở cả hai trạng thái: tính hộp theo trạng thái nghỉ thì lúc trỏ
    vào, dòng phụ (dài hơn dòng chính ở sáu trong tám chòm) mọc ra ngoài hộp
    và rơi lên một ngôi sao — mà nó chỉ rơi lúc hover nên mở bản tĩnh ra không
    thấy được. Số bài đếm từ `stars`, tên khoá đọc từ `SKY_COURSE` ở TS."""
    code, ax, ay, ar, _t, _k = anchor
    name = "%s · %s" % (c["key"], c["subtitle"])
    sub = "%s · %d bài" % (COURSE["name"], len(c["stars"]))
    wn, ws = text_w(name, LBL["nameSize"]), text_w(sub, LBL["subSize"])
    bw = max(wn, ws) + LBL["rulePad"]
    ang = math.radians(LBL["legAngle"])
    dx, dy = sx * math.cos(ang), sy * math.sin(ang)
    p0 = (ax + dx * (ar + LBL["gap"]), ay + dy * (ar + LBL["gap"]))
    p1 = (p0[0] + dx * leg, p0[1] + dy * leg)
    p2 = (p1[0] + sx * LBL["elbow"], p1[1])
    x0 = p2[0] + LBL["textOffset"] if sx > 0 else p2[0] - LBL["textOffset"] - bw
    box = (x0, p2[1] - LBL["nameSize"] * 0.8 - LBL["baselineLift"],
           x0 + bw, p2[1] + LBL["sublineGap"] + LBL["subSize"] * 0.3)
    return {"code": code, "p0": p0, "p1": p1, "p2": p2, "box": box,
            "name": name, "sub": sub, "wn": wn, "sx": sx, "sy": sy, "leg": leg}


def nhan_vi_pham(c, g, P, da_dat=()):
    """Lý do một chỗ đặt KHÔNG dùng được, hoặc `None`. Bộ điều kiện §8.4 nằm
    đúng MỘT chỗ, nên lượt tìm và lượt kiểm không thể nghĩ khác nhau.

    `da_dat` là các hộp nhãn ĐÃ GIỮ CHỖ — đây là luật NHƯỜNG của §8.4, và nó
    là phần việc mà bản mẫu một chòm chưa thử được: với một nhãn thì không có
    gì để chồng. Quy ước bản đồ sao: nhãn SÁNG HƠN giữ chỗ, nhãn mờ hơn
    nhường. `tim_nhan` vì thế chạy theo thứ tự ngôi neo sáng dần xuống, và
    chòm tới sau phải tránh mọi hộp đã giữ."""
    box, pad = g["box"], LBL["boxPad"]
    if (box[0] - pad < VX0 or box[2] + pad > VX1
            or box[1] - pad < VY0 or box[3] + pad > VY1):
        return "hộp chữ (nở %g) tràn khỏi khung" % pad
    net = net_chom_segs()
    if any(seg_cross(g["p0"], g["p1"], a, b) or seg_cross(g["p1"], g["p2"], a, b)
           for a, b in net):
        return "đường dẫn cắt qua một nét chòm"
    # …và MẠCH HOÀNG ĐẠO không được xuyên qua hộp chữ. Thêm điều kiện này sau
    # khi nhìn bức đã dựng: cung nét đứt chạy đúng qua dòng phụ của nhãn M5
    # ("M5 · NumPy · 6 bài"), và chữ có một đường kẻ chạy ngang giữa thì không
    # đọc được. Bản mẫu một chòm không thể thấy lỗi này vì nó chưa có mạch.
    mp = mach_duong()
    bx = (box[0] - 4, box[1] - 4, box[2] + 4, box[3] + 4)
    canh = [((bx[0], bx[1]), (bx[2], bx[1])), ((bx[2], bx[1]), (bx[2], bx[3])),
            ((bx[2], bx[3]), (bx[0], bx[3])), ((bx[0], bx[3]), (bx[0], bx[1]))]
    for i in range(len(mp) - 1):
        a, b = mp[i], mp[i + 1]
        if bx[0] <= a[0] <= bx[2] and bx[1] <= a[1] <= bx[3]:
            return "mạch hoàng đạo chạy xuyên hộp chữ"
        if any(seg_cross(a, b, e[0], e[1]) for e in canh):
            return "mạch hoàng đạo cắt qua hộp chữ"
    sp = LBL["starPad"]
    for s in STARS:
        if box[0] - sp <= s[1] <= box[2] + sp and box[1] - sp <= s[2] <= box[3] + sp:
            return "hộp chữ đè lên ngôi %s (nở %g)" % (s[0], sp)
    for key, hull in HULLS:
        if box_hits_hull(box, inflate_hull(hull, LBL["hullPad"])):
            return "hộp chữ giao bao lồi chòm %s (nở %g)" % (key, LBL["hullPad"])
    for key, b in da_dat:
        if (box[0] - pad < b[2] + pad and box[2] + pad > b[0] - pad
                and box[1] - pad < b[3] + pad and box[3] + pad > b[1] - pad):
            return "hộp chữ (nở %g) chồng hộp nhãn chòm %s đã giữ chỗ" % (pad, key)
    # ĐĨA MỀM QUANH MẶT TRỜI — thay cho điều kiện `textCeiling` cũ, và hai thứ
    # đó gác hai việc khác nhau:
    #
    # `textCeiling` gác TIẾP CẬN ("chữ này có đọc được không?"), nhưng từ lúc
    # mọi hộp nhãn có một TẤM NỀN `base` α 0,72 (§10.2 luật 2) thì nền sau chữ
    # bị ghim xuống L ≤ 0,02 bất kể trời sáng bao nhiêu — nên cái trần ấy thôi
    # gác được gì, và `do_tuong_phan_nhan` đo thẳng câu hỏi thật ở từng điểm.
    # Giữ nó làm điều kiện loại là tự chặn mình: với một tinh vân được chiếu
    # sáng thì KHÔNG hướng nào của một số chòm còn đạt, và build trượt vì một
    # lý do không còn thật.
    #
    # Thứ `textCeiling` KHÔNG gác được là BỐ CỤC: một nhãn đặt giữa quầng mặt
    # trời là một nhãn đặt lên điểm tụ của cả bức. Nên luật nay nói theo HÌNH
    # HỌC, và nó kiểm được bằng một phép đo không phụ thuộc màu.
    if LBL["keepOffSun"]:
        cx, cy = LIGHT["at"]["x"], LIGHT["at"]["y"]
        qx = min(max(cx, box[0]), box[2])
        qy = min(max(cy, box[1]), box[3])
        if math.hypot(qx - cx, qy - cy) < LBL["keepOffSun"]:
            return "hộp chữ cắt đĩa r < %g quanh mặt trời" % LBL["keepOffSun"]
    return None


def nhan_box(c, P, da_dat=()):
    """Lấy chỗ đặt nhãn ĐÃ ĐÓNG BĂNG ở `SKY_LABEL_PLACED` rồi KIỂM LẠI nó.

    Vì sao không tính lại mỗi lần dựng: với MỘT hồ sơ thì không sao, với HAI
    thì hai bản tự tính ra hai chỗ đặt nhãn khác nhau và kiểu hỏng là kiểu im
    lặng — không ai mở hai bản cạnh nhau để so. Đặc tả §19.2 xếp "vị trí nhãn"
    vào danh sách 9 thứ phải GIỐNG HỆT, sai số 0.

    Nhưng đóng băng mà không kiểm lại thì còn tệ hơn tính lại: một khối cũ
    trong TS sẽ âm thầm đặt chữ chồng lên sao sau khi hình chòm đổi. Nên mỗi
    lần build chạy lại ĐÚNG bộ điều kiện của §8.4, và **TRƯỢT** nếu khối cũ
    sai — đúng tinh thần "không xuất ra được một bản đồ có nhãn chồng"."""
    rec = next((r for r in PLACED if r["key"] == c["key"]), None)
    if rec is None:
        raise SystemExit(
            "SKY_LABEL_PLACED thiếu chòm %s. Chạy `py scripts/star/build_sky.py "
            "--place-nhan` rồi chép khối in ra vào star-map.ts." % c["key"])
    anchor = next((s for s in STARS if s[0] == rec["anchor"]), None)
    if anchor is None or anchor[5] != c["key"]:
        raise SystemExit(
            "SKY_LABEL_PLACED[%s].anchor = %s không phải một ngôi của chòm đó"
            % (c["key"], rec["anchor"]))
    g = nhan_hinh_hoc(c, anchor, rec["leg"], rec["dir"][0], rec["dir"][1])
    ly_do = nhan_vi_pham(c, g, P, da_dat)
    if ly_do:
        raise SystemExit(
            "CHỖ ĐẶT NHÃN ĐÃ ĐÓNG BĂNG KHÔNG CÒN DÙNG ĐƯỢC — chòm %s, neo %s, "
            "đoạn %g, hướng %+d%+d: %s.\nĐặc tả §8.4 nói build phải TRƯỢT ở đây "
            "chứ không đẩy một bản đồ có chữ chồng ra cho mắt người soi. Chạy "
            "`--place-nhan` để tìm lại rồi cập nhật SKY_LABEL_PLACED."
            % (c["key"], rec["anchor"], rec["leg"], rec["dir"][0], rec["dir"][1], ly_do))
    return g


def tim_nhan(c, P, da_dat=(), tra_het=False):
    """Bộ máy §8.4–§8.5 — chạy MỘT LẦN, kết quả đóng băng vào TS.

    Neo vào ngôi SÁNG NHẤT của chòm, không vào trọng tâm (§8.2): trọng tâm của
    một hình kín nằm GIỮA hình nên mọi đường dẫn từ đó cắt qua chính nét của
    chòm; trọng tâm của một hình cong rơi vào chỗ không có sao nào nên đường
    dẫn bắt đầu từ hư không. Ngôi sáng nhất thì luôn có thật, luôn ở trên
    hình, và luôn là ngôi người xem nhìn đầu tiên.

    Điểm "build TRƯỢT" là bản sửa THẬT cho lời chê "chữ hơi lệch": bản cũ
    không có ai kiểm, nên nhãn M3 và M4 chồng nhau mà vẫn xuất ra file."""
    mine = [s for s in STARS if s[5] == c["key"]]
    # Sáng nhất; hoà thì lấy bài có `sort_order` nhỏ hơn, mà thứ tự `stars`
    # trong TS đã theo thứ tự bài nên `index` là tiêu chí phá hoà.
    order = {s["code"]: i for i, s in enumerate(c["stars"])}
    ranked = sorted(mine, key=lambda s: (-s[3], order[s[0]]))

    hull = next(h for k, h in HULLS if k == c["key"])
    cx = sum(p[0] for p in hull) / len(hull)
    cy = sum(p[1] for p in hull) / len(hull)

    thu = []
    best = None
    moi = []     # MỌI chỗ hợp lệ, đã chấm điểm — nguồn cho phép lùi (`xep_nhan`)
    # BA ngôi neo, không hai. §8.4 nói "đổi sang ngôi sáng thứ nhì"; với tám
    # nhãn thì hai là không đủ, và M5 là ca chứng minh: cả N01 lẫn N02 đều ở
    # nửa TRÁI của cái lưới, mà bên trái chúng chỉ còn 176 px tới mép khung —
    # hẹp hơn hộp chữ. Bốn hướng từ hai ngôi ấy hoặc tràn khung, hoặc giao
    # chính bao lồi M5, hoặc bị mạch hoàng đạo cắt ngang. Từ N03 (góc
    # trên-PHẢI) thì có chỗ. Dừng ở ba chứ không thử hết: neo vào một ngôi mờ
    # là neo vào một ngôi người xem không nhìn trước, và đến lúc đó thì nên để
    # build TRƯỢT để người dựng dịch hộp chòm, chứ không phải giấu cái chật
    # vào một chỗ đặt kỳ quặc.
    for anchor in ranked[:3]:
        _code, ax, ay, _ar, _t, _k = anchor
        leg = LBL["legMin"]
        while leg <= LBL["legHardMax"]:
            # Bốn hướng ứng viên: trên-trái, trên-phải, dưới-trái, dưới-phải.
            for sx in (1, -1):
                for sy in (-1, 1):
                    g = nhan_hinh_hoc(c, anchor, leg, sx, sy)
                    ly_do = nhan_vi_pham(c, g, P, da_dat)
                    thu.append((g, ly_do))
                    if ly_do:
                        continue
                    p0, p1, p2 = g["p0"], g["p1"], g["p2"]
                    # Chấm điểm: khoảng cách nhỏ nhất từ tia tới mọi ngôi là
                    # LỚN NHẤT, ưu tiên hướng QUAY LƯNG vào trọng tâm chòm
                    # (nhãn không bao giờ nằm đè lên hình của chính nó), và ưu
                    # tiên tia gần phương NGANG (Azgaar) — chữ nằm ngang đọc
                    # nhanh hơn chữ xiên, mà ở đây mọi nhãn phải đọc được
                    # trong một cái liếc.
                    clear = min(min(seg_dist(s[1], s[2], p0[0], p0[1], p1[0], p1[1]),
                                    seg_dist(s[1], s[2], p1[0], p1[1], p2[0], p2[1]))
                                for s in STARS)
                    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
                    dl = math.hypot(dx, dy) or 1.0
                    away = (dx / dl * (ax - cx) + dy / dl * (ay - cy)) / (math.hypot(ax - cx, ay - cy) or 1)
                    horiz = 1.0 - abs(math.degrees(math.atan2(abs(dy), abs(dx)))) / 90.0
                    score = (clear + LBL["wAway"] * away + LBL["wHoriz"] * horiz
                             - LBL["wLeg"] * leg)
                    moi.append((score, g))
                    if best is None or score > best[0]:
                        best = (score, g)
            # Nới đoạn 1 theo bước 2 px tới `legMax`, rồi theo bước 6 px tới
            # `legHardMax` (§8.4 "khi hết chỗ").
            leg += LBL["legStep"] if leg < LBL["legMax"] else LBL["legGrow"]
        # KHÔNG `break` khi đã có chỗ: `xep_nhan` cần CẢ danh sách để lùi được.
        # Thứ tự ngôi neo vẫn nằm trong điểm số (ngôi mờ hơn cho `clear` nhỏ
        # hơn), nên "ưu tiên ngôi sáng nhất" không mất — nó chỉ thôi là một
        # lần `break` không quay lại được.
    if tra_het:
        moi.sort(key=lambda t: -t[0])
        return moi, thu
    if best is None:
        raise SystemExit(
            "KHÔNG ĐẶT ĐƯỢC NHÃN cho chòm %s — đặc tả §8.4 nói build phải "
            "TRƯỢT ở đây chứ không đẩy một bản đồ có chữ chồng ra cho mắt "
            "người soi. Đã thử %d hộp, 16 chỗ đầu:\n%s"
            % (c["key"], len(thu),
               "\n".join("  neo %s · đoạn %g · hướng %+d%+d · %s"
                          % (g["code"], g["leg"], g["sx"], g["sy"], r)
                          for g, r in thu[:16])))
    return best[1]


_XEP: dict = {}


def xep_nhan(P):
    """TÁM CHỖ ĐẶT NHÃN CÙNG MỘT LÚC, có PHÉP LÙI — không tám lần chọn tham lam.

    ── VÌ SAO PHẢI LÙI, ngày 19/10/2026 ────────────────────────────────────

    Bộ máy §8.4 chọn tham lam: xếp tám chòm theo thứ tự nhường, rồi mỗi chòm
    lấy chỗ điểm cao nhất còn hợp lệ. Với một bố cục rộng thì không sao. Với
    một mặt trời chói giữa khung thì chỗ trống hiếm, và tham lam **hỏng có hệ
    thống**: một chòm lấy đúng cái chỗ DUY NHẤT của chòm sau nó, rồi build
    trượt với một thông báo chỉ vào chòm sau — tức chỉ vào nạn nhân, không
    vào nguyên nhân.

    Đã đo ba lần trong một phiên, ba cặp khác nhau: M7 chiếm chỗ của M6; rồi
    (sau khi đổi sang thứ tự ít-chỗ-nhất-đi-trước) M6 chiếm chỗ của M7; rồi M5
    chiếm chỗ của M3. Mỗi lần "sửa" bằng cách dịch một hộp chòm là đổi nạn
    nhân, không chữa bệnh — và mỗi lần dịch hộp lại phải chạy lại bốn phép
    kiểm bố cục. Đó là dấu hiệu của một thuật toán sai, không của một bố cục
    sai.

    Phép lùi chữa cả lớp lỗi ấy: nếu chòm thứ k không còn chỗ, bỏ chỗ của chòm
    k−1 và thử chỗ tốt NHÌ của nó. Thứ tự nhường của §8.4 vẫn còn nguyên — nó
    là thứ tự THĂM và là điểm số ưu tiên, nên nghiệm tìm được vẫn là nghiệm mà
    nhãn sáng hơn giữ chỗ tốt hơn; chỉ khác là nay có nghiệm.

    `nut` chặn cho tìm kiếm không bùng nổ. Nếu vượt mà vẫn chưa xong thì build
    TRƯỢT như cũ — "không xuất ra được một bản đồ có nhãn chồng" không đổi."""
    if P["base"] in _XEP:
        return _XEP[P["base"]]
    thu_tu = thu_tu_nhan(P)
    cho, vi_pham = {}, {}
    for c in thu_tu:
        moi, thu = tim_nhan(c, P, (), tra_het=True)
        cho[c["key"]] = moi
        vi_pham[c["key"]] = thu
    gioi_han = LBL["branch"]
    nut = [0]

    def chong(box, b):
        pad = LBL["boxPad"]
        return (box[0] - pad < b[2] + pad and box[2] + pad > b[0] - pad
                and box[1] - pad < b[3] + pad and box[3] + pad > b[1] - pad)

    def di(i, da_dat):
        if i == len(thu_tu):
            return list(da_dat)
        key = thu_tu[i]["key"]
        for _s, g in cho[key][:gioi_han]:
            nut[0] += 1
            if nut[0] > LBL["nodeMax"]:
                return None
            if any(chong(g["box"], b) for _k, b, _g in da_dat):
                continue
            ra = di(i + 1, da_dat + [(key, g["box"], g)])
            if ra is not None:
                return ra
        return None

    ra = di(0, [])
    if ra is None:
        te = min(thu_tu, key=lambda c: len(cho[c["key"]]))
        raise SystemExit(
            "KHÔNG XẾP ĐƯỢC TÁM NHÃN, kể cả khi lùi (%d nút, trần %d). Chòm bó "
            "nhất là %s với %d chỗ hợp lệ; nếu là 0 thì 16 lý do đầu:\n%s\n"
            "Đặc tả §8.4 nói build phải TRƯỢT ở đây chứ không đẩy một bản đồ có "
            "chữ chồng ra cho mắt người soi."
            % (nut[0], LBL["nodeMax"], te["key"], len(cho[te["key"]]),
               "\n".join("  neo %s · đoạn %g · hướng %+d%+d · %s"
                         % (g["code"], g["leg"], g["sx"], g["sy"], r)
                         for g, r in vi_pham[te["key"]][:16])))
    _XEP[P["base"]] = {k: g for k, _b, g in ra}
    return _XEP[P["base"]]


def box_hits_hull(box, hull) -> bool:
    x0, y0, x1, y1 = box
    corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    if any(dist_to_hull(x, y, hull) < 0 for x, y in corners):
        return True
    if any(x0 <= x <= x1 and y0 <= y <= y1 for x, y in hull):
        return True
    edges = [(corners[i], corners[(i + 1) % 4]) for i in range(4)]
    n = len(hull)
    for i in range(n):
        a, b = hull[i], hull[(i + 1) % n]
        if any(seg_cross(a, b, e[0], e[1]) for e in edges):
            return True
    return False


def do_sang_rgb(x, y, P):
    """MÀU ƯỚC TÍNH của bức tại một điểm, dựng lại từ CHÍNH các trường mà các
    lớp dùng. Đặc tả §3.1 nói script phải TỰ ĐO được điều này từ thứ nó vừa
    sinh, nên đây là một điều kiện build kiểm được, không phải một lời dặn.
    (Ở bản raster thì đo thẳng trên điểm ảnh; bản này là SVG nên phải tính lại
    từ trường — cùng hàm, cùng con số.)

    Trả về MÀU chứ không trả về độ chói, vì bốn phép đo khác nhau cần nó: trần
    trong bao lồi, chỗ đặt nhãn, tương phản của mạch hoàng đạo, và ngân sách
    diện tích. Phép cuối cần cả bão hoà, mà bão hoà thì không suy ra được từ
    một con số độ chói."""
    col = hex_rgb(P["base"])
    # bụi xa — đếm số bậc đường đồng mức phủ lên điểm này
    df = dust_field(x, y)
    nd = sum(1 for lv in NEB["dust"]["levels"] if df > lv)
    if nd:
        col = over(col, hex_rgb(P["dustFar"]),
                   1 - (1 - NEB["dust"]["opacity"]) ** nd)
    # thân Ngân Hà — MƯỜI BỐN bậc trên trường ĐÃ CHIẾU SÁNG, ba tông.
    #
    # Đếm số bậc phủ điểm này rồi gộp theo TÔNG, đúng thứ tự tô (tông ngoài
    # trước). Nhờ `neb_ton()` là một hàm dùng chung, phép đo không thể lệch
    # cách chia tông của lượt vẽ — mà lệch ở đây là đo một bức tranh khác với
    # bức được ghi ra tệp.
    g = neb_lit(x, y)
    lo, hi, n = NEB["levelLo"], NEB["levelHi"], NEB["levels"]
    lv = sum(1 for i in range(n) if g > lo + (hi - lo) * i / (n - 1))
    if lv:
        dem: dict[str, int] = {}
        for i in range(lv):
            t = neb_ton(i)
            dem[t] = dem.get(t, 0) + 1
        for ten in NEB["ramp"]:
            if dem.get(ten):
                col = over(col, hex_rgb(P[ten]),
                           1 - (1 - NEB["levelOpacity"]) ** dem[ten])
    # khe bụi NHÂN vào — nó làm TỐI đi, nên nó chỉ giúp đạt trần
    nl = sum(1 for lv in NEB["lane"]["levels"] if lane_field(x, y) > lv)
    if nl:
        col = over(col, hex_rgb(P["dustLane"]),
                   1 - (1 - NEB["lane"]["opacity"]) ** nl)
    # KHỐI CHÂN TRỜI tô ĐẶC bằng `base`: dưới rìa thì không lớp nào sống sót,
    # nên phép đo trả về thẳng màu nền và THOÁT. Không thoát sớm thì mặt trời ở
    # dưới cùng còn được cộng vào, và ngân sách sẽ đếm một vùng sáng mà tệp
    # SVG không có.
    if y > chan_troi_y(x):
        return hex_rgb(P["base"])
    # NGUỒN SÁNG TRỘI, cộng cuối cùng — và nay đó là THỨ TỰ THẬT, không còn
    # một phép xấp xỉ.
    #
    # Chú thích cũ ở đây biện hộ cho việc cộng sau bằng một lý lẽ đã hết đúng:
    # *"lớp của nó nằm trên bụi xa và DƯỚI tinh vân, mà ở chỗ nó sáng nhất thì
    # tinh vân đã loãng — nó nằm ngoài dải Ngân Hà"*. Đúng khi mặt trời còn ở
    # góc (124, 104). Từ lúc nó về giữa khung thì dải chạy ngay SAU nó, và
    # mười bốn bậc tinh vân cộng dồn 0,90 phủ gần kín cái lõi trắng: đo trên
    # tranh thật, tâm mặt trời ra `rgb(120, 127, 146)` trong khi hàm này trả
    # về trắng tinh. Lệch 0,21 so với 1,0, và nó là nguồn lệch LỚN NHẤT giữa
    # mô hình và tệp.
    #
    # `SKY_LAYERS` đã đưa `nguon-sang` lên TRÊN `tinh-van`, nên thứ tự ở đây
    # và thứ tự vẽ nay là một.
    a1, a2, a3 = light_alpha(light_re(x, y))
    if a1 > 0:
        col = over(col, hex_rgb(P["glowRim"]), a1)
    if a2 > 0:
        col = over(col, hex_rgb(P["glowCore"]), a2)
    if a3 > 0:
        col = over(col, hex_rgb(P["core"]), a3)
    return col


def do_sang(x, y, P) -> float:
    return luminance(do_sang_rgb(x, y, P))


def do_sang_sau_vien(x, y, P):
    """Màu NGAY CẠNH một nét chữ — tức màu mà mắt THẬT SỰ so chữ với.

    ── VÌ SAO NÓ THAY `do_sang_sau_tam`, 20/10/2026 ────────────────────────

    Bản cũ trả về "trời đã bị TẤM NỀN ghim xuống", vì nền sau chữ lúc đó là
    một hình chữ nhật `base` phủ trọn hộp. Tấm nền ấy đã bị bỏ (xem
    `SKY_LABEL.haloWidth`): nó là chín vệt bôi đen trên PNG, và nó một mình
    ăn 8,8 điểm phần trăm mid-tone của cả bức.

    Thứ thay nó là một VIỀN ôm lấy glyph, nên màu kề nét chữ là trời đã bị
    chính cái viền ấy phủ — `over(trời, base, haloOpacity)`. Khác tấm nền ở
    DIỆN TÍCH (một đường biên thay vì một hình chữ nhật), KHÔNG khác ở cặp
    màu mà WCAG hỏi về.

    Không còn tham số `co_tam`: viền vẽ ở MỌI nhãn, nên lượt vẽ và lượt đo
    không còn một nhánh nào để lệch nhau."""
    return over(do_sang_rgb(x, y, P), hex_rgb(P["base"]), LBL["haloOpacity"])


def box_sang_qua(box, P) -> bool:
    """Hộp chữ không được đặt lên chỗ có độ chói trung bình vượt
    `profile.textCeiling` — dòng phụ chỉ còn 4,42:1 ở chỗ sáng nhất của bức,
    tức DƯỚI 4,5:1 (§5.2). Mã màu nằm ở TS, không ở đây: ca test quét tệp này
    tìm `#` + sáu chữ số hex và đòi ĐÚNG BẰNG 0 (§19.4 ca 14)."""
    tran = luminance(hex_rgb(P["textCeiling"]))
    x0, y0, x1, y1 = box
    acc, k = 0.0, 0
    for i in range(5):
        for j in range(4):
            acc += do_sang(x0 + (x1 - x0) * (i + 0.5) / 5,
                           y0 + (y1 - y0) * (j + 0.5) / 4, P)
            k += 1
    return acc / k > tran


def do_tran_chom(P):
    """Độ chói NỀN LỚN NHẤT trong bao lồi mỗi chòm (nở `ceilingPad`), và chỗ nó
    xảy ra — ĐO, không gác.

    ── VÌ SAO NÓ THÔI LÀM MỘT PHÉP GÁC, ngày 19/10/2026 ─────────────────────

    Nó từng là một ca chặn build: "trong bao lồi nở 24 px, độ chói không được
    vượt `hullCeiling`", với lý lẽ "dưới ngưỡng đó nét chòm mới đạt 3 : 1".
    Nhưng nó là một XẤP XỈ cho câu hỏi ấy, và từ bố cục mới thì xấp xỉ đó
    KHÔNG CÒN ĐÚNG ĐƯỢC — không phải vì nó khắt khe quá, mà vì tiền đề của nó
    đã sai theo cả hai chiều:

    · **Không thoả được.** M3 đứng cách tâm mặt trời 176 px, và đó là một
      quyết định bố cục CÓ Ý (`bo-cuc-hung-vi.md` §5.4: *"đây là chỗ hẹp nhất
      của cả bố cục"*). Nền trong bao lồi M3 vì thế đo được **L = 0,2935** —
      không một trần nào vừa cho phép chuyện đó vừa còn nói được gì về bảy
      chòm kia.
    · **Không cần thoả.** Từ lúc có LUẬT ĐƯỜNG CHÓI (§10.3), một vệt trên nền
      sáng ĐỔI sang tông tối và vẫn đạt 3 : 1 — nên nền sáng không còn hàm ý
      nét trượt. Đo thẳng: nét chòm xấu nhất **3,13 : 1** lúc nghỉ, với M3
      nằm trong vùng sáng ấy.

    Nên câu hỏi thật nay do `kiem_tuong_phan_net` trả lời, ở đúng từng đoạn
    nét, bằng đúng cái tông mà đoạn ấy được tô. `hullCeiling` còn trong hồ sơ
    và còn được IN RA ở `--do` làm một con số theo dõi — "nền chỗ có hình đang
    sáng tới đâu" là một thứ đáng biết — nhưng nó không chặn build nữa, vì một
    phép gác mà phải nới mỗi lần bố cục đổi thì nó đang đo bố cục, không đo
    tiếp cận."""
    pad = FIELD["ceilingPad"]
    ra = []
    for key, hull in HULLS:
        box_x0 = min(p[0] for p in hull) - pad
        box_x1 = max(p[0] for p in hull) + pad
        box_y0 = min(p[1] for p in hull) - pad
        box_y1 = max(p[1] for p in hull) + pad
        worst, at = 0.0, None
        for i in range(31):
            for j in range(31):
                x = box_x0 + (box_x1 - box_x0) * i / 30
                y = box_y0 + (box_y1 - box_y0) * j / 30
                if dist_to_hull(x, y, hull) > pad:
                    continue
                L = do_sang(x, y, P)
                if L > worst:
                    worst, at = L, (round(x), round(y))
        ra.append((key, worst, at))
    return ra


def net_tong(x, y, hue, P):
    """Tông THẬT của một vệt tại `(x, y)` — sắc khoáng, hay `dustLane` nếu nền
    ở đó sáng hơn `litFlip.at`. MỘT hàm cho lượt vẽ lẫn lượt đo."""
    return P["dustLane"] if do_sang(x, y, P) > LIGHT["litFlip"]["at"] else hue


def net_vo_tong(mau, P):
    """Tông của VỎ BỌC dưới một vệt đã biết tông — luôn NGƯỢC với lõi.

    Vệt sắc khoáng (sáng) ⇒ vỏ `dustLane`; vệt đã đổi sang `dustLane` (tối)
    ⇒ vỏ `glowCore` (ngà). Chọn cùng tông là xoá hiệu ứng hai tông của LUẬT
    ĐƯỜNG CHÓI, tức mất đúng chỗ đẹp nhất của bức: phần một chòm gần mặt trời
    SẬM LẠI THÀNH BÓNG còn phần xa thì sáng.

    MỘT hàm cho lượt vẽ (`ve_net_chom`) lẫn lượt đo (`do_tuong_phan_net`) —
    hai công thức là hai con số sẽ lệch, và lệch ở đây nghĩa là phép đo nói
    nét đạt 4 : 1 trong khi tệp vẽ một cặp màu khác."""
    return P["glowCore"] if mau == P["dustLane"] else P["dustLane"]


def do_tuong_phan_net(P):
    """TƯƠNG PHẢN CỦA TỪNG NÉT CHÒM với nền tại đúng chỗ nó nằm — WCAG 1.4.11
    cho thành phần đồ hoạ mang tin: sàn 3 : 1.

    Vì sao phép đo này THAY cho `kiem_tran_chom` làm cái gác chính (§10.2 luật
    4): cái trần bao lồi là một XẤP XỈ cho câu hỏi thật. Nó nói "trong bao lồi
    nở 24 px, không điểm nào được sáng hơn `hullCeiling`", và lý lẽ của nó là
    "dưới ngưỡng đó nét chòm mới đạt 3 : 1". Nhưng từ lúc có LUẬT ĐƯỜNG CHÓI
    (§10.3) thì tiền đề ấy sai theo cả hai chiều: một vệt trên nền sáng KHÔNG
    trượt, vì nó đã đổi sang tông tối; và cái trần vẫn chặn build ở những chỗ
    chẳng có nét nào đi qua. Đo thẳng cái phải đạt thì vừa chặt hơn vừa không
    chặn oan.

    Đo cả hai trạng thái: nghỉ và MỜ (bảy chòm không được trỏ). Trạng thái mờ
    là trạng thái mà nét mỏng nhất, nên bỏ qua nó là bỏ qua đúng ca xấu nhất.

    ── ĐO LÕI VỚI VỎ, KHÔNG LÕI VỚI NỀN, 20/10/2026 ────────────────────────

    Từ lúc nét chòm có VỎ BỌC (`SKY_LINK.casing`), cặp màu mà mắt so KHÔNG
    còn là "vệt với bầu trời" mà là "lõi với vỏ" — vỏ rộng hơn lõi `grow` px
    nên nó lộ ra một dải mỗi bên, và chính dải ấy là thứ kề nét. So lõi với
    nền là so một cặp màu mà bức tranh không có; đó đúng là phép đo đã chặn
    build ở nét M3 (2,96 : 1) trong khi chỗ ấy đọc rất rõ. Cùng bản sửa đã
    làm cho mạch hoàng đạo (`kiem_mach`), cùng lý lẽ.

    Và chính vì tương phản thôi phụ thuộc nền mà HAI thứ mở ra cùng lúc: cái
    hào quanh chòm bỏ được (`SKY_NEBULA.hullFade`), và quầng mặt trời nới
    được (`SKY_LIGHT.profile`). Hai chỗ TRỪ đi ánh sáng đổi lấy một chỗ CỘNG
    vào."""
    ra = []
    nghi = P["scale"]["lineOpacity"][0]
    cs = LINK["casing"]
    segs = net_chom_segs()
    i = 0
    for c in CONS:
        hue = P["hues"][c["hue"]]
        for _ab in c["lines"]:
            a, b = segs[i]
            i += 1
            for k in range(7):
                t = (k + 0.5) / 7
                x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                nen = do_sang_rgb(x, y, P)
                ton = net_tong(x, y, hue, P)
                mau = hex_rgb(ton)
                vo_mau = hex_rgb(net_vo_tong(ton, P))
                # `k` là HỆ SỐ MỜ của cả tấm, không một độ mờ riêng cho lõi:
                # trạng thái mờ chạy thật bằng `opacity` CSS trên thẻ `<img>`,
                # nên vỏ mờ đi ĐÚNG BẰNG lõi. Đo bằng hai hệ số khác nhau là
                # đo một bức tranh không tồn tại.
                for ten, kmo in (("nghỉ", 1.0), ("mờ", mo_css(P))):
                    vo = over(nen, vo_mau, min(1.0, cs["opacity"] * kmo))
                    L1 = luminance(over(vo, mau, nghi * kmo))
                    L2 = luminance(vo)
                    tp = (max(L1, L2) + 0.05) / (min(L1, L2) + 0.05)
                    ra.append((c["key"], ten, tp, (round(x), round(y))))
    return ra


def kiem_tuong_phan_net(P, san=3.0):
    ra = do_tuong_phan_net(P)
    te = [r for r in ra if r[1] == "nghỉ" and r[2] < san]
    if te:
        xau = min(te, key=lambda r: r[2])
        raise SystemExit(
            "NÉT CHÒM KHÔNG ĐẠT %.1f:1 (WCAG 1.4.11): %s chỉ còn %.2f:1 tại %s "
            "— %d điểm trượt. Nét MANG TIN phải đọc được ở MỌI chỗ nó đi qua. "
            "Tương phản ở đây đo giữa LÕI và VỎ BỌC nên nó KHÔNG chữa bằng "
            "cách dìm bầu trời: nới `SKY_LINK.casing.opacity` hay "
            "`casing.grow`, hoặc `SKY_LINK.opacity` của chính lõi."
            % (san, xau[0], xau[2], xau[3], len(te)))
    return min(r[2] for r in ra if r[1] == "nghỉ"), min(r[2] for r in ra)


def mo_css(P) -> float:
    """HỆ SỐ MỜ mà CSS đặt lên tấm NGHỈ của bảy chòm không được trỏ vào.

    Một con số, một chỗ: nó vào phép đo tương phản ở dưới, vào `sky-theme.css`
    qua `khoi_bien_mau`, và vào ca test qua TS. Ba chỗ tự chia nhau một phép
    chia là ba chỗ sẽ lệch.

    Làm tròn ở ĐÂY, không ở chỗ in ra: `of()` chỉ giữ hai chữ số nên nó biến
    0,5636 thành 0,56, và lúc đó phép ĐO tương phản nói về một bức tranh khác
    bức chạy thật. Bốn chữ số đủ nhỏ để không ai thấy, và đủ để hai chỗ nói
    cùng một con số."""
    return round(P["scale"]["dimOpacity"] / P["scale"]["lineOpacity"][0], 4)


def kiem_mo_css(P):
    """Hệ số mờ phải ≥ `SKY_LABEL.dimTextOpacity` — một SÀN, không một gợi ý.

    Vì sao chặn build: trước khi tách tấm, chữ của bảy nhãn mờ theo một độ mờ
    RIÊNG (0,55) còn nét theo tỉ số của nét (0,509), nên hạ `dimOpacity` chỉ
    làm nét mờ hơn. Nay một `opacity` của CSS mờ ĐỀU cả hai, nên hạ
    `dimOpacity` là hạ tương phản CHỮ — và nó đã đo được 4,36:1 ở đúng tỉ số
    0,509 ấy, dưới sàn 4,5:1 của §5.2. Không có phép kiểm này thì 0,31 là một
    con số ai cũng "dọn cho tròn" về 0,28 được."""
    mo = mo_css(P)
    if mo < LBL["dimTextOpacity"] - 1e-9:
        raise SystemExit(
            "dimOpacity %.3f / lineOpacity[0] %.3f = %.4f, dưới sàn chữ %.3f "
            "(`SKY_LABEL.dimTextOpacity`).\nTừ lúc tách tấm, bảy chòm mờ đi "
            "bằng MỘT `opacity` của CSS trên tấm nghỉ — nó mờ cả CHỮ của nhãn, "
            "mà chữ có sàn 4,5:1 (đo được 4,36:1 ở tỉ số 0,509). Nâng "
            "`dimOpacity` lên ≥ %.3f."
            % (P["scale"]["dimOpacity"], P["scale"]["lineOpacity"][0], mo,
               LBL["dimTextOpacity"],
               LBL["dimTextOpacity"] * P["scale"]["lineOpacity"][0]))
    return mo


def do_tuong_phan_nhan(P):
    """Tương phản THẬT của chữ từng nhãn với chỗ trời nó rơi vào — ĐO, không
    suy ra từ một cái trần.

    Vì sao thêm phép đo này khi đã có `textCeiling`: cái trần đó so độ chói
    TRUNG BÌNH của hộp chữ với một ngưỡng, tức nó là một thứ XẤP XỈ cho câu
    hỏi thật ("chữ này có đạt 4,5:1 không?"). Trung bình thì một hộp nửa tối
    nửa sáng vẫn qua, trong khi dòng chữ nằm đúng nửa sáng. Và nó không trả
    lời được gì về trạng thái MỜ, vì ở đó cái đổi là độ mờ của chữ chứ không
    phải độ chói của nền.

    Nên ở đây tính tỉ số tương phản ở TỪNG ĐIỂM lấy mẫu rồi lấy ca xấu nhất,
    và tính riêng cho từng (dòng × trạng thái): ba thứ đó dùng ba màu/độ mờ
    khác nhau và nằm ở hai dải khác nhau trong hộp.

    Đổi câu chữ nhãn là đổi bề rộng hộp, tức đổi chỗ đặt, tức đổi nền sau chữ
    — nên con số này phải đo LẠI mỗi lần dựng, không phải một lần rồi chép vào
    chú thích. §5.2 đòi 4,5:1 cho chữ."""
    ra = []
    da_dat = []
    for c in thu_tu_nhan(P):
        g = nhan_box(c, P, tuple(da_dat))
        da_dat.append((c["key"], g["box"]))
        x0, y0, x1, y1 = g["box"]
        py = g["p2"][1]
        # BA phép đo, không hai — trạng thái MỜ là một trạng thái có chữ, nên
        # nó cũng phải đạt 4,5:1. Bỏ qua nó là bỏ qua đúng chỗ việc thôi mờ
        # bầu trời đã làm vỡ: nền sau chữ không tối theo nữa.
        #
        # VIỀN CHỮ vào phép đo ở đây, và nó phải vào: màu mà mắt so với nét
        # chữ là màu NGAY CẠNH nét chữ, và từ 20/10/2026 màu ấy là trời đã bị
        # viền `base` phủ (`do_sang_sau_vien`). Đo trên trời trần là đo một
        # bức tranh không tồn tại — và là một bức TỆ HƠN, nên nó sẽ chặn build
        # vì một lý do không thật.
        for ten, mau, op, (by0, by1) in (
                ("chặng", P["text"], 1.0, (y0, py)),
                # TỈ SỐ THẬT MÀ CSS SẼ DÙNG, không phải một độ mờ đặt riêng
                # cho chữ. Từ lúc tách tấm, bảy chòm mờ đi bằng `opacity` trên
                # thẻ `<img>` của tấm NGHỈ, nên chữ và nét mờ ĐỀU theo cùng
                # một hệ số. Đo bằng một con số khác con số chạy thật là đo
                # một bức tranh không tồn tại.
                ("chặng-mờ", P["text"], mo_css(P), (y0, py)),
                ("khoá", P["textSub"], 1.0, (py, y1))):
            chu = hex_rgb(mau)
            xau = 99.0
            for i in range(9):
                for j in range(5):
                    nen = do_sang_sau_vien(x0 + (x1 - x0) * (i + 0.5) / 9,
                                           by0 + (by1 - by0) * (j + 0.5) / 5, P)
                    # Độ mờ của SVG trộn trong không gian sRGB đã mã hoá, nên
                    # trộn trước rồi mới tính độ chói — tính độ chói rồi mới
                    # trộn là một con số khác và là một con số dễ dãi hơn.
                    a, b = luminance(over(nen, chu, op)), luminance(nen)
                    hi, lo = max(a, b), min(a, b)
                    xau = min(xau, (hi + 0.05) / (lo + 0.05))
            ra.append((c["key"], ten, xau))
    return ra


def kiem_tuong_phan_nhan(P, san=4.5):
    """Một nhãn dưới `san` ⇒ **build TRƯỢT**. Cùng tinh thần với mọi phép kiểm
    khác ở tệp này: một con số trong chú thích không chặn được gì."""
    ra = do_tuong_phan_nhan(P)
    te = [r for r in ra if r[2] < san]
    if te:
        raise SystemExit(
            "CHỮ TRÊN NHÃN KHÔNG ĐẠT %.1f:1 (§5.2):\n%s\nĐổi câu chữ nhãn là "
            "đổi bề rộng hộp, tức đổi chỗ đặt, tức đổi nền sau chữ. Chạy "
            "`--place-nhan` để tìm lại chỗ, hoặc hạ `textCeiling`."
            % (san, "\n".join("  %s dòng %s: %.2f:1" % r for r in te)))
    return ra


_THU_TU: dict = {}


def thu_tu_nhan(P=None):
    """Thứ tự ĐẶT nhãn: chòm BỊ BÓ NHẤT đặt trước, rồi tới chòm có ngôi neo
    sáng nhất.

    ── VÌ SAO ĐỔI THỨ TỰ, ngày 19/10/2026 ──────────────────────────────────

    Luật cũ chỉ có một tiêu chí — "nhãn sáng hơn GIỮ CHỖ, nhãn mờ hơn NHƯỜNG",
    quy ước bản đồ sao của §8.4. Nó đúng về quy ước và SAI về thuật toán: với
    một mặt trời chói giữa khung, số chỗ đặt hợp lệ của các chòm chênh nhau
    hàng chục lần, và một chòm "sáng hơn" nhưng có 40 chỗ hợp lệ sẽ chiếm đúng
    cái chỗ DUY NHẤT của một chòm mờ hơn.

    Đã xảy ra, và đo được: M7 (ngôi neo 9 ca chấm) đặt trước M6 (cả chín bài 8
    ca) và lấy khoảng trống dưới-trái của nó; M6 khi ấy còn **0 trên 288** chỗ
    hợp lệ — phía phải tràn khung, phía trái chồng hộp M7, phía trên-trái cắt
    đĩa 210 quanh mặt trời. Build trượt, và không một con số nào chỉ ra rằng
    nguyên nhân là THỨ TỰ chứ không phải bố cục.

    Nên tiêu chí đầu tiên nay là **ít chỗ hợp lệ nhất đi trước** — ràng buộc
    chặt nhất giải trước, luật quen của mọi bài toán xếp chỗ. Độ sáng ngôi neo
    xuống làm tiêu chí THỨ HAI, nên quy ước §8.4 vẫn quyết mọi lần hoà (và nó
    hoà thường xuyên: bảy trong tám chòm có cùng số chỗ hợp lệ trong một bố
    cục rộng rãi). Phá hoà cuối bằng KHOÁ chòm, không bằng thứ tự khai: `M1 <
    M2 < …` ổn định hơn một thứ tự mà ai cũng có thể hoán đổi khi thêm chòm.

    `P` tuỳ chọn: không có hồ sơ thì không đếm được chỗ hợp lệ, và hàm lùi về
    đúng luật cũ. Hai chỗ gọi nó mà chưa cần hồ sơ (`--phong`, ca test) vì thế
    không phải đổi."""
    if P is None:
        return sorted(CONS, key=lambda c: (-max(s[3] for s in STARS if s[5] == c["key"]),
                                           c["key"]))

    def sang_nhat(c):
        return max(s[3] for s in STARS if s[5] == c["key"])

    def so_cho(c):
        n = 0
        for s in sorted((q for q in STARS if q[5] == c["key"]), key=lambda q: -q[3])[:3]:
            leg = LBL["legMin"]
            while leg <= LBL["legHardMax"]:
                for sx in (1, -1):
                    for sy in (-1, 1):
                        g = nhan_hinh_hoc(c, s, leg, sx, sy)
                        # Đếm với `da_dat` TRỐNG: con số phải nói "chòm này bị
                        # bó bởi HÌNH HỌC đến đâu", không phải "ai đã lấy chỗ
                        # trước" — không thì thứ tự lại phụ thuộc chính nó.
                        if nhan_vi_pham(c, g, P) is None:
                            n += 1
                leg += LBL["legStep"] if leg < LBL["legMax"] else LBL["legGrow"]
        return n

    # NHỚ LẠI theo hồ sơ: `so_cho` chạy 8 × 3 × 20 × 4 lần `nhan_vi_pham`, mỗi
    # lần đo bao lồi, mạch và tám hộp — và `thu_tu_nhan` được gọi bốn chỗ
    # trong một lượt dựng. Không nhớ lại thì một lệnh `--css` tốn thêm vài
    # phút cho đúng một danh sách tám khoá không đổi.
    if P["base"] not in _THU_TU:
        _THU_TU[P["base"]] = sorted(
            CONS, key=lambda c: (so_cho(c), -sang_nhat(c), c["key"]))
    return _THU_TU[P["base"]]


def do_ngan_sach(P):
    """ĐO độ chói · bão hoà · tỉ lệ, rồi TRẢ VỀ bảng số — `main` chặn build.

    Đây là thứ thay cho trần độ chói TOÀN CỤC của §3.1
    (`chieu-sau-tuong-tac.md` §2.4): một cái trần nói "không điểm nào được
    sáng hơn X", còn một ngân sách nói "được phép bấy nhiêu phần trăm diện
    tích sáng hơn X, và phần còn lại phải tối hơn". Hai câu đó cho ra hai bức
    tranh khác nhau hẳn, và bức thứ hai là bức mà khung hình tham chiếu đang
    là: trung vị 0,0284 nhưng 7,73% diện tích trên L > 0,5.

    Đo trên lưới `sampleStep` px bằng CHÍNH các trường mà các lớp dùng, cộng
    diện tích hình tròn của 48 ngôi (quầng không tính: nó mờ, nó không đưa
    điểm ảnh nào lên trên ngưỡng). Lưới 4 px là 87 125 điểm — đủ để con số ổn
    định tới chữ số thập phân thứ hai mà vẫn chạy trong vài giây."""
    step = BUDGET["sampleStep"]
    Ls, sat, sat_w, w_tong = [], [], 0.0, 0.0
    for i in range(0, int(W), step):
        for j in range(0, int(H), step):
            rgb = do_sang_rgb(i + step / 2, j + step / 2, P)
            L = luminance(rgb)
            Ls.append(L)
            mx, mn = max(rgb), min(rgb)
            S = 0.0 if mx <= 0 else (mx - mn) / mx
            sat.append(S)
            # Bão hoà CÓ TRỌNG SỐ theo độ chói, và nó là con số đáng tin hơn
            # con số trần. Bão hoà HSV của một điểm gần đen không có nghĩa
            # cảm nhận được: `#070C17` đo ra S = 0,696 nhưng trên màn hình nó
            # không phân biệt được với `#0A0A0A`. Mà 28,6% khung hình tham
            # chiếu là điểm gần đen, nên một trung bình KHÔNG trọng số đang so
            # hai thứ mà phần lớn là chỗ mắt không đọc được màu. Trọng số
            # L + 0,02 giữ cho chỗ gần đen vẫn có mặt nhưng không áp đảo.
            w = L + 0.02
            sat_w += S * w
            w_tong += w
    Ls.sort()
    o = len(Ls)
    dt_o = o * step * step
    # Phần diện tích ngôi sao vượt ngưỡng: thân + lõi của 48 ngôi. Cộng THÊM
    # vào tỉ lệ đo trên lưới, vì lưới 4 px bỏ qua những vật nhỏ hơn ô của nó —
    # mà 48 ngôi thì chính là loại vật ấy.
    dt_sao = sum(math.pi * (r * P["scale"]["star"]) ** 2
                 for _c, _x, _y, r, _t, _k in STARS)
    sang = sum(1 for L in Ls if L > BUDGET["brightAt"]) * step * step + dt_sao
    # Tỉ lệ ĐƯỜNG KÍNH vật sáng lớn nhất : sao nền. Vật lớn nhất là lõi nguồn
    # sáng; nó không đổi một bán kính ngôi nào, nên ca "bán kính khớp số ca
    # chấm" vẫn xanh — đó là điều kiện của bước 3 trong bản đánh giá §5.
    ti_le = (LIGHT["core"] * 2) / (FIELD["radius"] * 2)
    # ── HISTOGRAM TÁM BẬC — cái thước của `bo-cuc-hung-vi.md` §1 ─────────────
    #
    # Vì sao nó phải ở đây chứ không ở một script tạm: chẩn đoán của lời chê
    # thứ năm là MỘT con số — "bản hiện tại là một hàm hai giá trị, 89,7 % ở
    # L < 0,01 và 2,55 % ở mảng phẳng 0,60–0,85, 0,95 % ở năm bậc GIỮA". Khung
    # tham chiếu có 46,8 % ở bậc giữa. Cái lỗ ~46 điểm phần trăm đó CHÍNH LÀ
    # "sơ đồ chứ không phải bức tranh", và trước khi có dòng này thì không một
    # phép kiểm nào trong cả kho mã đo được nó: `medianMax` chỉ chặn chiều
    # SÁNG QUÁ, còn kiểu hỏng thật là TỐI QUÁ Ở GIỮA.
    moc = BUDGET["bands"]
    dem = [0] * (len(moc) + 1)
    for L in Ls:                      # Ls đã sắp, nên quét một lượt là đủ
        k = 0
        while k < len(moc) and L > moc[k]:
            k += 1
        dem[k] += 1
    bac_pc = [c / o for c in dem]
    # Bậc GIỮA = từ `midLo` tới `midHi`. Hai con số, hai việc: `mid` (0,03–0,85)
    # là con số của bảng §1 để báo cáo, `mid3` (0,03–0,35) là con số CHẶN BUILD
    # (`midShareMin`) — nó bỏ hai bậc quầng ra ngoài, nên không ai đạt được nó
    # bằng cách phóng mặt trời to hơn.
    lo, hi = BUDGET["midLo"], BUDGET["midHi"]
    mid = sum(1 for L in Ls if lo < L <= hi) / o
    mid3 = sum(1 for L in Ls if lo < L <= BUDGET["mid3Hi"]) / o
    return {
        "trung_vi": Ls[o // 2],
        "p99": Ls[int(o * 0.99)],
        "sang": sang / dt_o,
        "bao_hoa": sum(sat) / len(sat),
        "bao_hoa_w": sat_w / w_tong,
        "ti_le": ti_le,
        "bac": bac_pc,
        "mid": mid,
        "mid3": mid3,
    }


def do_bo_cuc():
    """ĐO BỐ CỤC — năm con số của §12 bước 3 và bước 4, trong một hàm.

    Trước bản này không phép kiểm nào đo bốn thứ đầu, nên "mọi chòm một cỡ",
    "ba chòm chữ nhật" và "không có điểm tụ" sống sót qua bốn lần chê: không
    có thước thì không ai thấy chúng là số, chỉ thấy chúng là cảm giác."""
    # 1 · đường kính bao từng chòm, và TỈ LỆ lớn nhất : nhỏ nhất
    dk = {}
    for key, _h in HULLS:
        ps = [(x, y) for _c, x, y, _r, _t, k in STARS if k == key]
        dk[key] = max((math.hypot(a[0] - b[0], a[1] - b[1])
                       for i, a in enumerate(ps) for b in ps[i + 1:]), default=0.0)
    ti_le_chom = max(dk.values()) / max(1e-6, min(dk.values()))
    # 2 · khe tới mặt trời: đĩa CẤM r < forbid và đĩa MỀM r < soft
    cx, cy = LIGHT["at"]["x"], LIGHT["at"]["y"]
    khe_sao = [(math.hypot(x - cx, y - cy), code) for code, x, y, _r, _t, _k in STARS]
    gan_nhat = min(khe_sao)
    trong_cam = [c for d, c in khe_sao if d < LIGHT["forbid"]]
    trong_mem = [c for d, c in khe_sao if d < LIGHT["soft"]]
    # 3 · nét CĂN TRỤC: cách trục ngang hay trục dọc dưới `axisMin` độ
    truc = []
    # Đo trên TOẠ ĐỘ NGÔI, không trên đoạn đã vẽ: hai đầu đoạn vẽ bị trừ khe
    # `r + gap` nên hướng của nó lệch một chút so với hướng nối hai ngôi, và
    # cái phải đo là hình — không phải cái nét.
    pos = {code: (x, y) for code, x, y, _r, _t, _k in STARS}
    for c in CONS:
        for ab in c["lines"]:
            (x1, y1), (x2, y2) = pos[ab[0]], pos[ab[1]]
            a = math.degrees(math.atan2(y2 - y1, x2 - x1)) % 180.0
            lech = min(a, abs(a - 90.0), abs(a - 180.0))
            if lech < LINK["axisMin"]:
                truc.append((c["key"], ab[0], ab[1], lech))
    # 4 · ngôi nào CHÌM dưới rìa chân trời
    duoi = [code for code, x, y, _r, _t, _k in STARS if y > chan_troi_y(x)]
    return {
        "dk": dk,
        "ti_le_chom": ti_le_chom,
        "gan_mat_troi": gan_nhat,
        "trong_cam": trong_cam,
        "trong_mem": trong_mem,
        "truc": truc,
        "duoi_chan_troi": duoi,
    }


def kiem_bo_cuc():
    b = do_bo_cuc()
    if b["trong_cam"]:
        raise SystemExit(
            "ĐĨA CẤM BỊ XÂM: %s nằm trong r < %g của mặt trời. Vành trống quanh "
            "nguồn sáng là thiết bị bố cục mạnh nhất chép từ khung tham chiếu "
            "(§3.4) — tương phản cục bộ tối đa ở đúng chỗ mắt phải nhìn trước. "
            "Dịch `box` của chòm, đừng nới `SKY_LIGHT.forbid`."
            % (", ".join(b["trong_cam"]), LIGHT["forbid"]))
    if b["ti_le_chom"] < LINK["scaleRatioMin"]:
        raise SystemExit(
            "TỈ LỆ CỠ CHÒM chỉ %.2f : 1, dưới sàn %g : 1. Đây là con số mà lời "
            "chê 'mọi chòm một cỡ' hỏi tới — bản cũ đo được 3,53 : 1 và chỉ "
            "1,86 : 1 nếu bỏ M8 ra. Mắt đọc 'rải gần đều' chủ yếu từ việc MỌI "
            "THỨ BẰNG NHAU, không từ toạ độ."
            % (b["ti_le_chom"], LINK["scaleRatioMin"]))
    if b["truc"]:
        raise SystemExit(
            "%d NÉT CĂN TRỤC (dưới %g° của trục ngang hay trục dọc): %s. Một "
            "bầu trời mà phần lớn nét là ngang hoặc dọc là hình học của một sơ "
            "đồ. Chữa bằng XOAY (chòm mà hình vốn không phải lưới) hay bằng HỘI "
            "TỤ (chòm phải đọc ra là lưới/bảng/khung)."
            % (len(b["truc"]), LINK["axisMin"],
               ", ".join("%s %s–%s %.1f°" % (k, a, c, d) for k, a, c, d in b["truc"])))
    if b["duoi_chan_troi"]:
        raise SystemExit(
            "%s NẰM DƯỚI RÌA CHÂN TRỜI — khối chân trời tô đặc nên những ngôi ấy "
            "biến mất hẳn, tức mất bài. Dịch `box` lên."
            % ", ".join(b["duoi_chan_troi"]))
    return b


def kiem_ngan_sach(P):
    d = do_ngan_sach(P)
    if d["sang"] < BUDGET["brightShareMin"]:
        raise SystemExit(
            "NGÂN SÁCH ĐỘ CHÓI KHÔNG ĐẠT SÀN: chỉ %.3f%% diện tích trên "
            "L > %g, dưới sàn %.2f%% (khung tham chiếu: 7,73%%). Bức này lại "
            "là một mảng tối đều — không có gì neo được mắt. Nới "
            "`SKY_LIGHT.core` hoặc `levels`."
            % (d["sang"] * 100, BUDGET["brightAt"], BUDGET["brightShareMin"] * 100))
    if d["sang"] > BUDGET["brightShareMax"]:
        raise SystemExit(
            "NGÂN SÁCH ĐỘ CHÓI VƯỢT TRẦN: %.3f%% diện tích trên L > %g, trên "
            "trần %.2f%% — cả bức thành một cái đèn."
            % (d["sang"] * 100, BUDGET["brightAt"], BUDGET["brightShareMax"] * 100))
    if d["trung_vi"] > BUDGET["medianMax"]:
        raise SystemExit(
            "TRUNG VỊ ĐỘ CHÓI %.4f, vượt %g. Đây là dòng dễ phá nhất của cả "
            "ngân sách: phải SÁNG THÊM Ở ĐUÔI, không sáng thêm nói chung. Nới "
            "con số này là làm hỏng đúng thứ đang đi tìm — hạ `nebula` /"
            "`dustFar` / `horizon` thay vì nới nó."
            % (d["trung_vi"], BUDGET["medianMax"]))
    # SÀN trung vị và SÀN bậc giữa — hai cái gác MỚI, và chúng gác chiều NGƯỢC
    # với `medianMax`. Lời chê thứ năm là về chiều này: không một ca nào đang
    # bắt được "quá tối ở giữa", nên bản cũ đạt mọi phép kiểm trong khi 89,7 %
    # diện tích nằm ở L < 0,01. Một ngân sách chỉ có trần là một ngân sách chỉ
    # gác được một nửa.
    if d["trung_vi"] < BUDGET["medianMin"]:
        raise SystemExit(
            "TRUNG VỊ ĐỘ CHÓI CHỈ %.4f, dưới sàn %g (tham chiếu 0,0284). Bức "
            "này là một hàm hai giá trị: đen tuyệt đối cộng một mảng sáng, "
            "không có phần TRUNG GIAN — tức một sơ đồ, không phải một bức "
            "tranh. Chữa bằng CHIẾU SÁNG tinh vân (`SKY_NEBULA.lambert`), "
            "không bằng cách nâng độ sáng nền."
            % (d["trung_vi"], BUDGET["medianMin"]))
    if d["mid3"] < BUDGET["midShareMin"]:
        raise SystemExit(
            "BẬC GIỮA chỉ %.2f%% diện tích (L %g–%g), dưới sàn %.0f%% (tham "
            "chiếu 43,0%%). Đây là cái lỗ ~46 điểm phần trăm mà bốn lời chê "
            "trước đều đang chỉ vào bằng những chữ khác nhau. Lấp bằng ÁNH "
            "SÁNG CÓ HƯỚNG trên tinh vân, không bằng một mặt trời to hơn."
            % (d["mid3"] * 100, BUDGET["midLo"], BUDGET["mid3Hi"],
               BUDGET["midShareMin"] * 100))
    if d["ti_le"] < BUDGET["scaleRatioMin"]:
        raise SystemExit(
            "TỈ LỆ VẬT LỚN NHẤT : SAO NỀN chỉ %.1f:1, dưới %g:1 — người xem "
            "không cảm được độ lớn của bức. Đạt bằng cách nới nguồn sáng, "
            "KHÔNG bằng cách phóng to một ngôi nào."
            % (d["ti_le"], BUDGET["scaleRatioMin"]))
    return d


def ve_vien_chu(ink, x, y, chuoi, co, dam, P, op=1.0, tracking=None):
    """VIỀN của một dòng chữ — cùng chuỗi, cùng toạ độ, tô-và-viền bằng `base`.

    Vì sao hai lớp `<text>` chứ không `paint-order="stroke"` trên một lớp:
    thuộc tính ấy là thứ một trình duyệt cũ bỏ qua được, và khi nó bị bỏ qua
    thì nét viền vẽ ĐÈ lên mặt chữ — chữ bị chính cái viền của mình bít lại.
    Hai lớp không có kiểu hỏng đó: lớp dưới xấu nhất là một vệt chữ dày, lớp
    trên vẫn đọc được.

    Gọi RIÊNG khỏi `ve_mat_chu` vì thứ tự trong lớp `nhan` mang nghĩa: viền
    của CẢ HAI dòng phải nằm dưới GẠCH CHÂN, không thì đuôi chữ "ế"/"g" ăn
    mất mấy khúc của một gạch rộng 0,8 px — và gạch chân cũng được hưởng cái
    nền tối ấy. Mặt chữ thì vẽ sau cùng."""
    ink.text("nhan", x, y, chuoi, P["base"], co, dam, LBL["fontStack"],
             op=op * LBL["haloOpacity"], tracking=tracking,
             vien=(P["base"], LBL["haloWidth"]))


def ve_mat_chu(ink, x, y, chuoi, mau, co, dam, op=1.0, tracking=None):
    """MẶT chữ — lớp trên của cặp. Luôn đi cùng một `ve_vien_chu` cùng toạ độ:
    một dòng có viền và một dòng không là đúng chỗ dòng kia trượt 4,5 : 1 mà
    không ai mở ra xem."""
    ink.text("nhan", x, y, chuoi, mau, co, dam, LBL["fontStack"],
             op=op, tracking=tracking)


def ve_nhan(ink, P, focus, only=None):
    """Hai tầng nhãn là quy ước THẬT của bản đồ sao, không phải một thoả hiệp
    hiện đại: Bayer in ký hiệu ngắn trên bản khắc và bảng dữ liệu đầy đủ ở bên
    cạnh — bản khắc không bao giờ cõng cả tên đầy đủ.

    Ngày 19/10/2026 nhãn ĐI XUỐNG CÒN MỘT DÒNG lúc nghỉ, và đó là một thay đổi
    người dùng thấy ngay: `M1 · Tiến trình`, hết. Tên chòm ("Kẹp") đã bỏ hẳn —
    học viên tìm "chặng nào, học gì", mà tên hình không trả lời câu nào trong
    hai câu đó, nên giữ nó là bắt người ta học một hệ tên thứ hai mới dùng
    được bản đồ.

    Tên khoá và SỐ BÀI thì chuyển xuống một dòng phụ CHỈ HIỆN LÚC TRỎ VÀO —
    cùng chỗ với mã bài. Nhờ thế bản khắc lúc nghỉ còn đúng cái Bayer in: một
    ký hiệu ngắn cho mỗi chòm. Và nó không làm vỡ luật "chín tấm chòm chỉ khác
    nhau ở ĐỘ MỜ": thêm một dòng CHỮ không phải đổi kích thước một vật đang có
    (WCAG đọc hẹp — đổi kích thước là chuyển động, chữ mới xuất hiện thì
    không), đúng như mã bài đã làm từ trước."""
    out = []
    da_dat = []
    for c in thu_tu_nhan(P):
        g = nhan_box(c, P, tuple(da_dat))
        da_dat.append((c["key"], g["box"]))
        # Vòng ĐẶT nhãn phải chạy ĐỦ TÁM dù tấm chỉ vẽ một chòm: chỗ đứng của
        # nhãn thứ k phụ thuộc `da_dat` của k−1 nhãn trước (luật NHƯỜNG, §8.4).
        # Cắt vòng lại là để mỗi tấm tự tìm chỗ, tức tám tấm ra tám chỗ khác
        # nhau và nhãn NHẢY khi đổi tấm.
        if only is not None and c["key"] != only:
            out.append((c["key"], g["box"]))
            continue
        p0, p1, p2, box = g["p0"], g["p1"], g["p2"], g["box"]
        name, sub, wn = g["name"], g["sub"], g["wn"]
        hue = P["hues"][c["hue"]]
        ro = focus == c["key"]
        mo = 1.0
        if focus is not None and not ro:
            mo = P["scale"]["dimOpacity"] / P["scale"]["lineOpacity"][0]
        lop = (LBL["leaderFocusOpacity"] if ro else LBL["leaderOpacity"]) * mo
        rule_x0 = box[0]
        # VIỀN ÔM NÉT CHỮ, KHÔNG MỘT TẤM NỀN ĐẶC (20/10/2026).
        #
        # Tấm nền cũ là một hình chữ nhật `base` phủ trọn hộp chữ; nó giữ chữ
        # ở 5,2 : 1 và nó đọc ra trên PNG là một tấm thẻ đen dán đè. Viền chữ
        # giải cùng bài toán bằng cách CỘNG một đường biên quanh glyph thay vì
        # TRỪ ánh sáng trên cả một mảng — màu kề nét chữ vẫn là `base`, nên
        # tương phản không giảm, mà cái mép thì không còn tồn tại để nhìn
        # thấy. Xem `SKY_LABEL.haloWidth` cho cả phép đo đi kèm.
        #
        # VẼ Ở MỌI NHÃN, không còn điều kiện `plateAt`: điều kiện ấy có vì tám
        # vệt đen trên trời đã tối là tám vệt vô cớ, mà một viền ôm nét chữ
        # thì ở đâu cũng đúng. Bỏ nhánh ấy là bỏ chỗ lượt VẼ và lượt ĐO lệch
        # nhau được.
        op_ten = 1.0 if (focus is None or ro) else LBL["dimTextOpacity"]
        ve_vien_chu(ink, rule_x0, p2[1] - LBL["baselineLift"], name,
                    LBL["nameSize"], LBL["nameWeight"], P, op=op_ten)
        if ro:
            ve_vien_chu(ink, rule_x0, p2[1] + LBL["sublineGap"], sub,
                        LBL["subSize"], LBL["subWeight"], P,
                        tracking=LBL["subTracking"])
        # ĐƯỜNG DẪN và GẠCH CHÂN nằm GIỮA viền và mặt chữ — xem `ve_vien_chu`.
        ink.poly("nhan", [p0, p1, p2], hue, LBL["ruleWidth"], lop)
        ink.poly("nhan", [(rule_x0, p2[1]), (rule_x0 + wn + LBL["rulePad"], p2[1])],
                 hue, LBL["ruleWidth"], lop)
        # CHỮ mờ theo một con số RIÊNG, không theo `mo` của nét. Chữ có sàn
        # 4,5:1 còn hình có sàn 3:1, nên hai thứ mờ cùng một tỉ số là một thứ
        # trượt trước — và nó trượt thật: ở `mo` = 0,509 nhãn M4 chỉ còn
        # 4,36:1. Xem `SKY_LABEL.dimTextOpacity`.
        ve_mat_chu(ink, rule_x0, p2[1] - LBL["baselineLift"], name, P["text"],
                   LBL["nameSize"], LBL["nameWeight"], op=op_ten)
        out.append((c["key"], box))
        if ro:
            # Dòng phụ: tên khoá · số bài. CHỈ ở chòm đang được trỏ — bảy chòm
            # kia không có nó, nên không có chuyện tám dòng phụ cùng hiện và
            # cái bản khắc thành một bảng chữ.
            ve_mat_chu(ink, rule_x0, p2[1] + LBL["sublineGap"], sub,
                       P["textSub"], LBL["subSize"], LBL["subWeight"],
                       tracking=LBL["subTracking"])
            # MÃ BÀI KHÔNG CÒN VẼ VÀO TRANH. Nó từng là "hiệu ứng 7 của §10",
            # nhưng bước 1–2 đã dựng mã bài bằng HTML (`.chip` trong
            # `SkyCursor.tsx`) và hai bản rơi vào ĐÚNG MỘT điểm: chip neo
            # `calc(50% + 9px)` chéo trên-phải, đúng `LBL["codeOffset"] = 9`.
            # Tức từ bước 2 tới nay mỗi mã bài được in HAI LẦN chồng lên nhau —
            # mắt đọc ra "chữ hơi dày", không ai đỏ lên.
            #
            # Bỏ bản SVG, giữ bản HTML, vì chỉ bản HTML làm được ba việc mà bản
            # vẽ không làm được: hiện LẦN LƯỢT theo thứ tự bài (bậc 45 ms), nói
            # thêm số ca ở ngôi đang được nhận, và phóng lên ở tỉ lệ gần mà
            # không bị nhoè.
    return out


# ═══════════════════════════════════════════════════════════════════════
# 9 · dựng
# ═══════════════════════════════════════════════════════════════════════

def build_troi(P):
    """Mười một lớp TRỜI — nền, nguồn sáng, tinh vân, sao nền, lưới, mạch.

    Dựng MỘT LẦN, không có bản hover. Bản mẫu một chòm dựng cả bức hai lần
    (nghỉ · hover) và nhân `dim` vào độ mờ từng phần tử; ở tám chòm thì cách
    đó là chín tấm, mỗi tấm cõng lại cả tinh vân và 1 250 sao nền. Nay phần
    trời mờ đi bằng `opacity` của CSS trên chính thẻ `<img>` — CSS KHÔNG với
    vào trong một tài liệu SVG cách ly được, nhưng độ mờ của THẺ thì nó đặt
    được, và đó là đúng chỗ ranh giới ấy nằm.

    Một chỗ lệch phải nói ra vì nó có thật, chứ đừng để ai phát hiện bằng mắt:
    `dim` nhân vào từng phần tử, còn `opacity` của CSS LÀM PHẲNG rồi mới mờ.
    Hai phép chỉ bằng nhau khi các nét không chồng nhau, mà năm đường đồng mức
    tinh vân thì có chồng. Chọn `opacity` vì nó rẻ hơn tám tấm và vì cái lệch
    ấy chỉ xảy ra ở TRẠNG THÁI HOVER của phần NỀN — chỗ mà cả thiết kế đang cố
    làm cho người xem bớt chú ý tới."""
    ink = Ink()
    ve_nen(ink, P, 1.0)
    ve_bui_xa(ink, P, 1.0)
    ve_nguon_sang(ink, P, 1.0)
    ve_loe_ngang(ink, P, 1.0)
    ve_tinh_van(ink, P, 1.0)
    ve_khe_bui(ink, P, 1.0)
    ve_soi_sang(ink, P, 1.0)
    ve_tia_bui(ink, P, 1.0)
    ve_quang_chan_troi(ink, P, 1.0)
    ve_truong_sao(ink, P, 1.0)
    ve_luoi(ink, P, 1.0)
    ve_mach(ink, P, 1.0)
    return ink


def build_chom(P, focus, only=None):
    """Năm lớp CHÒM — nét, quầng, thân, lõi, nhãn. `only` cắt tấm xuống còn
    MỘT chòm.

    ── VÌ SAO TÁCH, VÀ CON SỐ ĐÃ TRẢ ────────────────────────────────────

    Bản trước xuất CHÍN tấm, mỗi tấm vẽ ĐỦ tám chòm (một rõ, bảy mờ), vì "vẽ
    đủ tám" là cách giữ cho đúng MỘT tấm chòm hiện ở mỗi lúc. Giá của nó: cả
    48 ngôi được vẽ chín lần. Đo ngày 19/10/2026: chín tệp = **446 005 byte**,
    trong đó tám phần chín là bản sao.

    Nay mỗi chòm có tấm RIÊNG, hai trạng thái:
      · `sky-chom-M<k>.svg`     — chòm k lúc NGHỈ (nét 0,55 · quầng không
        boost · đường dẫn 0,5 · chữ nhãn 1,0);
      · `sky-chom-M<k>-ro.svg`  — chòm k lúc RÕ (nét 0,85 · quầng +0,12 ·
        đường dẫn 0,85 · thêm dòng khoá·số bài).
    Trạng thái MỜ của bảy chòm kia KHÔNG có tấm riêng: nó là tấm NGHỈ hạ bằng
    `opacity` của CSS (`--sky-mo`). Hệ số đúng bằng `dimOpacity /
    lineOpacity[0]`, nên nét mờ ra đúng `dimOpacity` như trước.

    Một chỗ phải nói ra vì nó có thật: `dim` nhân vào TỪNG phần tử, còn
    `opacity` của CSS LÀM PHẲNG rồi mới mờ. Với QUẦNG hai phép bằng nhau tuyệt
    đối — độ mờ cộng dồn của 14 đĩa là `base × r/ρ`, tuyến tính theo `base`.
    Chỗ lệch là nơi quầng · thân · lõi chồng nhau (lệch vài phần trăm ở đúng
    cái lõi đường kính 0,8 px của một ngôi ĐANG BỊ GÁC LẠI). Cùng đánh đổi mà
    `build_troi` đã nhận cho lớp trời, và nhận ở đúng chỗ thiết kế đang cố làm
    người xem bớt chú ý tới.

    Và các tấm KHÁC NHAU CHỈ Ở ĐỘ MỜ: không bán kính nào to lên, không nét nào
    dày lên. Theo định nghĩa hẹp của WCAG, đổi màu/độ mờ KHÔNG tính là hoạt
    ảnh chuyển động, còn đổi kích thước thì TÍNH — nên các tấm an toàn với
    `prefers-reduced-motion` ngay từ lúc sinh. (Cú PHÓNG thì đổi kích thước,
    nên nó bỏ chuyển tiếp dưới `reduce` — xem `star-map.module.css`.)"""
    ink = Ink()
    # Hành tinh mờ theo CÙNG hệ số với nét của chòm nó thuộc về: nó là một vật
    # CỦA chặng ấy, nên nó phải nghỉ và rõ cùng chặng ấy. Tấm `-ro` dùng độ mờ
    # hover, tấm nghỉ dùng độ mờ nghỉ, và bảy chòm kia mờ bằng `opacity` của
    # CSS trên chính thẻ `<img>` — không có một hệ số thứ ba ở đây.
    ve_hanh_tinh(ink, P, 1.0 if focus is None or focus == only
                 else P["scale"]["dimOpacity"] / P["scale"]["lineOpacity"][0], only)
    ve_net_chom(ink, P, focus, only)
    ve_sao(ink, P, focus, only)
    boxes = ve_nhan(ink, P, focus, only)
    return ink, boxes


def hop_nhan_tat_ca(P):
    """Tám hộp nhãn theo thứ tự NHƯỜNG — chỉ ĐẶT chỗ, không vẽ gì.

    Tồn tại vì `vung_bam()` cần cả tám hộp, mà từ lúc tách tấm thì không tấm
    nào vẽ cả tám nhãn nữa. Gọi `build_chom(P, None)` chỉ để lấy hộp là dựng
    cả 48 ngôi rồi bỏ đi."""
    out, da_dat = [], []
    for c in thu_tu_nhan(P):
        g = nhan_box(c, P, tuple(da_dat))
        da_dat.append((c["key"], g["box"]))
        out.append((c["key"], g["box"]))
    return out


def vung_bam(boxes):
    """Vùng bấm của một chặng = HAI ô: bao lồi chòm nở `SKY_HIT.hullPad`, và
    hộp nhãn. Bấm vào nhãn cũng là mở chặng (§10).

    HAI ô chứ không một ô bao cả hai, và đây là một bản sửa có số đo: nhãn
    nằm NGOÀI chòm, nên một ô chữ nhật bao cả bao lồi lẫn hộp nhãn phình ra
    tới 35% bề rộng khung. Tám ô như thế chồng lên nhau ở mười mấy chỗ, và ô
    nào nằm sau trong DOM thì nuốt con trỏ của ô kia — tức trỏ vào chòm này
    lại làm chòm khác sáng lên. Đo lại với hai ô: tám ô BAO LỒI không chồng
    nhau một cặp nào, chỉ còn hai chỗ hộp nhãn M1 phủ lên bao lồi M2 và M4.
    Giải bằng THỨ TỰ DOM — ô nhãn đặt trước, ô bao lồi đặt sau, nên chỗ chồng
    thuộc về bao lồi: các ngôi sao là cái người ta định trỏ vào, cái tên chỉ
    là một lối vào thêm.

    Không phải một ô chia hết bầu trời — đặc tả chọn quy ước Bayer (§4.4), nên
    khoảng tối giữa hai chòm không thuộc về ai."""
    out = {}
    for key, hull in HULLS:
        pad = HIT["hullPad"]
        bl = (min(p[0] for p in hull) - pad, min(p[1] for p in hull) - pad,
              max(p[0] for p in hull) + pad, max(p[1] for p in hull) + pad)
        nh = next(b for k, b in boxes if k == key)
        out[key] = (bl, nh)
    return out


def hinh_phong(hit):
    """TỈ LỆ THỨ HAI — ba con số cho mỗi chòm: hệ số phóng và tâm khung.

    ── PHÉP BIẾN HÌNH, VIẾT RA ĐỂ BA CHỖ KHÔNG TỰ SUY LẠI ────────────────

    CSS đặt lên mỗi tấm `transform: scale(S) translate(dx%, dy%)` với gốc mặc
    định 50% 50%. Một điểm ở tỉ lệ `p` (0..1 của bề rộng khung) đi tới
    `0,5 + S·(p − 0,5 + dx)`, nên muốn tâm chòm `cx` về giữa khung thì
    `dx = 0,5 − cx`. Cửa sổ thấy được là `[cx − 0,5/S ; cx + 0,5/S]`.

    ĐIỂM DỪNG là chỗ KẸP cái tâm (`kep_tam`). Không kẹp thì phóng vào M8 (chòm
    hai ngôi ở thiên đỉnh, sát mép trên) để lộ một dải trống ngoài bức tranh —
    và một bản đồ có mép là một bản đồ nói rằng thế giới hết ở đó. Đây cũng là
    cái "có điểm dừng" mà nghiên cứu đòi: biên độ do tay người dùng gây ra,
    nhưng nó dừng ở một chỗ xác định, không trôi tiếp.

    Hộp đích là HỢP của hai ô bấm (bao lồi chòm nở 20 px, và hộp nhãn) nở thêm
    `ZOOM['pad']`. Lấy cả hộp nhãn vì ở tỉ lệ gần cái nhãn là thứ nói ra ĐANG
    Ở CHẶNG NÀO; phóng vào rồi mất tên chặng là phóng vào một đám sao lạ.

    Hệ số kẹp trong `[minScale, maxScale]`: M8 chỉ có hai ngôi nên hộp của nó
    bé, và `min(W/w, H/h)` cho ra hơn 6 lần — ở mức đó hai ngôi cách nhau nửa
    màn hình và cú phóng thành một cú rơi. Trần giữ cho tám chặng ở cùng một
    bậc tỉ lệ, tức chữ "gần" nghĩa như nhau ở cả tám."""
    out = []
    for key in KEYS:
        bl, nh = hit[key]
        pad = ZOOM["pad"]
        x0 = min(bl[0], nh[0]) - pad
        y0 = min(bl[1], nh[1]) - pad
        x1 = max(bl[2], nh[2]) + pad
        y1 = max(bl[3], nh[3]) + pad
        s = min(W / max(1.0, x1 - x0), H / max(1.0, y1 - y0))
        s = round(max(ZOOM["minScale"], min(ZOOM["maxScale"], s)), 3)
        nua = 0.5 / s
        out.append({"key": key, "scale": s,
                    "cx": kep_tam((x0 + x1) / 2 / W, nua),
                    "cy": kep_tam((y0 + y1) / 2 / H, nua)})
    return out


def kep_tam(c: float, nua: float) -> float:
    """Kẹp tâm vào `[nua ; 1 − nua]` rồi làm tròn VÀO TRONG, 5 chữ số.

    "Vào trong" là cả điểm, và nó là một lỗi đã xảy ra thật: kẹp xong rồi
    `round(c, 5)` thô thì M2 (tâm đúng ở mép dưới) ra 0,83120 trong khi mép là
    0,8311950…, tức cửa sổ thấy được chạm 1,000005 — **vượt bức tranh 5 phần
    triệu**. Con số ấy nhỏ đến mức một lần xem bằng mắt không bao giờ bắt
    được, nên nó là đúng loại sai mà một ca test phải chặn; và cái nó phá là
    một INVARIANT ("cửa sổ nằm trọn trong bức tranh"), thứ chỉ có nghĩa khi nó
    đúng tuyệt đối."""
    lo, hi = nua, 1.0 - nua
    c = min(hi, max(lo, c))
    r = round(c, 5)
    if r < lo:
        r = math.ceil(lo * 1e5) / 1e5
    if r > hi:
        r = math.floor(hi * 1e5) / 1e5
    return r


def khoi_phong(hit):
    """Khối `SKY_ZOOM_PLACED` cho TS — ĐÓNG BĂNG, cùng khuôn `SKY_LABEL_PLACED`.

    Vì sao đóng băng ở TS thay vì chỉ in ra CSS: lớp con trỏ phải ĐẢO phép
    biến hình lại. Khi đang phóng, con trỏ ở tỉ lệ `u` của khung nằm ở toạ độ
    khung `cx − 0,5/S + u/S`, và nếu `SkyCursor.tsx` không biết ba con số ấy
    thì nó nhận SAI ngôi — một bản đồ phóng vào rồi chỉ sai chỗ còn tệ hơn một
    bản đồ không phóng. Hộp nhãn thì chỉ Python đo được (nó cần bề rộng chữ),
    nên TS nhận con số đã tính, và ca test tính lại rồi so."""
    out = ["export const SKY_ZOOM_PLACED = ["]
    for r in hinh_phong(hit):
        out.append("  { key: '%s', scale: %g, cx: %g, cy: %g },"
                   % (r["key"], r["scale"], r["cx"], r["cy"]))
    out.append("] as const;")
    return "\n".join(out)


def khoi_css_phong(hit):
    """Tám khối `.phongM<k>` — ba biến CSS, không một phép tính nào ở phía CSS.

    `--zx`/`--zy` in ra dưới dạng %, vì `translate()` lấy % của CHÍNH phần tử
    và cả tấm lẫn lớp con trỏ đều phủ đúng khung (`inset: 0`), nên một con số
    dùng được cho cả hai."""
    out = []
    for r in hinh_phong(hit):
        out.append(".phong%s {" % r["key"])
        out.append("  --zs: %g;" % r["scale"])
        out.append("  --zx: %.3f%%;" % ((0.5 - r["cx"]) * 100))
        out.append("  --zy: %.3f%%;" % ((0.5 - r["cy"]) * 100))
        out.append("}")
    return "\n".join(out)


def khoi_ten_bai():
    """Khối `SKY_TITLES` cho TS — 48 TÊN BÀI THẬT, đọc từ giáo trình.

    ── VÌ SAO KHỐI NÀY PHẢI TỒN TẠI, VÀ VÌ SAO NÓ ĐƯỢC CHÉP ──────────────

    Tỉ lệ gần phải tiết lộ thứ tỉ lệ xa KHÔNG có; nếu không thì phóng vào chỉ
    là phóng to một bức ảnh. Ở tỉ lệ xa mỗi ngôi mang MÃ bài (`P03`) — bốn ký
    tự nói đúng một thứ. Ở tỉ lệ gần nó phải mang TÊN bài.

    Tên bài nằm trong `scripts/pe-v4/out-advanced/lessons/*.json`, mà trang
    này KHÔNG GỌI API nào (`apiFetch` gặp 401 là tự tạo tài khoản khách, và
    đây là trang ai cũng vào được), nên nó phải đi vào mã nguồn. Đúng đường mà
    `SKY_TESTS` đã đi, và an toàn vì cùng một lý do: ca test ĐỌC LẠI 48 tệp
    giáo trình rồi so từng chuỗi, nên một tên cũ là một ca ĐỎ.

    Và nó KHÔNG vẽ được vào tranh: 48 cái tên tiếng Việt dài 20–45 ký tự trên
    một bầu trời 1360 × 820 là một bảng chữ, và `kiem_tuong_phan_nhan` sẽ
    trượt build ngay vì không còn chỗ nào đặt được. Nên nó là chữ HTML."""
    out = ["export const SKY_TITLES: Record<string, string> = {"]
    for c in CONS:
        hang = []
        for s in c["stars"]:
            t = TEN_BAI[s["code"]]
            hang.append("%s: %s," % (s["code"], json.dumps(t, ensure_ascii=False)
                                     .replace('"', "'")))
        out.append("  /* %s */ %s" % (c["key"], " ".join(hang)))
    out.append("};")
    return "\n".join(out)


def khoi_bien_mau(P, ten_hs):
    """CSS khai `--sky-base` = `profile.base`, SINH RA chứ không chép tay.

    Vì sao phải có tệp này, và vì sao nó không nằm trong `star-map.module.css`:

    `.frame` của route xem thử từng tô `var(--ds-page)`, mà bản SÁNG của token
    đó là một màu trắng xanh. Nền ấy chỉ lộ ra ở hai chỗ — lúc ảnh chưa tải
    xong, và lúc một tấm trời hạ độ mờ — nhưng chỗ thứ hai đã làm chủ sản phẩm
    chê đúng một câu: "tại sao khi hover thì nó lại XÁM đi chứ không phải MỜ
    đi?". Hạ độ mờ của một lớp TỐI trên nền SÁNG không làm nó tối hơn, nó làm
    nó NHẠT: đo được chỗ trời tối nhất đi từ L = 0,0038 lên 0,1226, sáng gấp
    32 lần. Nền phải là chính màu nền trời.

    Nhưng `npm run lint:tokens` CẤM mọi mã hex trong `*.module.css` (và cấm
    đúng chỗ: một mã chép tay là một chỗ bản tối và bản sáng sẽ trôi xa nhau).
    Nên màu đi qua một BIẾN, và cái biến ấy do bộ sinh viết ra từ hồ sơ TS —
    cùng đường đi với các khối `.hit*`. Ca test so lại giá trị trong tệp này
    với `SKY_PROFILE_DARK.base`.

    Khi bản SÁNG có hồ sơ, tệp này cần hai khối (một cho mỗi chế độ giao diện,
    vì bản đồ đổi theo chế độ của trang). Lúc đó sửa ở đây là đủ: `--sky-base`
    là tên duy nhất mà CSS của trang biết.

    ── VÌ SAO TỆP NÀY NAY MANG MƯỜI HAI BIẾN, KHÔNG MỘT ──────────────────

    Lớp con trỏ (`SkyCursor.tsx`) là HTML chồng lên tranh, nên nó phải tự vẽ:
    một vòng dò, hai vạch lề, và một chip mã bài. Cả ba mang tin, nên cả ba
    phải đo được tương phản — và cách DUY NHẤT đo được bằng hai con số thay vì
    lấy mẫu ảnh là cho chip một nền ĐẶC. Nền ấy là chính `base`.

    Mười hai biến, ba nhóm:
     · `--sky-base` nền khung (cũ);
     · `--sky-chip` nền chip + nét TỐI của vòng dò, `--sky-ink` chữ,
       `--sky-code` mã bài, `--sky-dim` chữ phụ;
     · `--sky-m1…m8` tám sắc chặng, cho vòng dò của một ngôi lấy đúng sắc chặng
       nó thuộc về — nếu không thì "ngôi này của chặng nào" phải đọc bằng chữ."""
    return "\n".join([
        "/* SINH RA bởi `py scripts/star/build_sky.py` — ĐỪNG SỬA TAY, lần chạy",
        "   sau xoá sạch. Nguồn: `SKY_PROFILE_%s` trong"
        % ten_hs.upper(),
        "   `frontend/src/lib/star-map.ts`.",
        "",
        "   Vì sao một tệp riêng chứ không mấy dòng trong `star-map.module.css`:",
        "   `npm run lint:tokens` cấm mã hex trong mọi `*.module.css`, và cấm đúng",
        "   chỗ — màu chỉ được sống ở hồ sơ TS. Nền của khung PHẢI là màu nền trời:",
        "   nó từng là `var(--ds-page)`, và hạ độ mờ một lớp tối trên nền sáng làm",
        "   bầu trời NHẠT thành xám sữa chứ không tối đi.",
        "",
        "   Chín biến ở giữa là của LỚP CON TRỎ — nó là HTML chồng lên tranh nên",
        "   nó phải tự vẽ, và chip mã bài cần một nền ĐẶC để tương phản tính được",
        "   bằng hai mã màu thay vì lấy mẫu ảnh.",
        "",
        "   `--sky-mo` là HỆ SỐ MỜ của bảy chòm không được trỏ vào. Nó ở đây chứ",
        "   không ở `*.module.css` vì nó là một PHÉP CHIA trên hồ sơ",
        "   (`dimOpacity / lineOpacity[0]`): chép con số đã chia vào CSS là chép",
        "   một con số sẽ lệch ngay lần ai đó chỉnh `dimOpacity`. Từ lúc tách tấm,",
        "   chính con số này mờ luôn CHỮ của nhãn, nên nó có một sàn 4,5:1 — xem",
        "   `kiem_mo_css()`. */",
        ":root {",
        "  --sky-base: %s;" % P["base"],
        "  --sky-mo: %g;" % mo_css(P),
        "  --sky-chip: %s;" % P["base"],
        "  --sky-ink: %s;" % P["text"],
        "  --sky-dim: %s;" % P["textSub"],
        "  --sky-code: %s;" % P["code"],
    ] + [
        "  --sky-%s: %s;" % (k, P["hues"][k]) for k in sorted(P["hues"])
    ] + [
        "}",
        "",
    ])


def khoi_so_ca():
    """Khối `SKY_TESTS` cho TS — 48 con số ca chấm, ĐÓNG BĂNG.

    Vì sao một khối sinh ra chứ không đọc trực tiếp: số ca chấm nằm trong
    `scripts/pe-v4/out-advanced/lessons/*.json`, mà trang bản đồ KHÔNG gọi API
    và không đọc tệp lúc chạy (nó công khai, và `apiFetch` gặp 401 là tự tạo
    tài khoản khách). Python đọc được giáo trình, trình duyệt thì không.

    Vì sao vẫn an toàn dù là số chép: ca test `bán kính mỗi ngôi khớp số ca
    chấm` ĐẾM LẠI từ chính giáo trình rồi so với khối này, nên một con số cũ là
    một ca ĐỎ, không phải một con số im lặng sai. Đúng khuôn `SKY_LABEL_PLACED`.

    Và nó mua được một thứ cụ thể: bán kính ngôi ĐÃ mang nghĩa (số ca chấm của
    bài) nhưng trước đây không chỗ nào NÓI RA con số ấy, nên nó không làm việc
    gì cả — người xem thấy ngôi to ngôi nhỏ mà không biết to theo cái gì. Có
    khối này thì lớp con trỏ in được `P05 · 12 ca` ngay cạnh ngôi."""
    rows = []
    for c in CONS:
        rows.append("  /* %s */ %s" % (
            c["key"], " ".join("%s: %d," % (s["code"], SO_CA[s["code"]])
                               for s in c["stars"])))
    return "\n".join([
        "export const SKY_TESTS: Record<string, number> = {",
        *rows,
        "};",
    ])


def kiem_tile_phu_lop():
    """Hợp các `layers` của tất cả các tấm phải ĐÚNG BẰNG `SKY_LAYERS`, theo
    đúng thứ tự.

    Vì sao đây là một ca chặn build: thứ tự tệp trong DOM LÀ thứ tự z, và một
    lớp bị bỏ quên khỏi `SKY_TILES` thì biến mất khỏi bức mà KHÔNG có gì đỏ
    lên — nó chỉ còn nằm trong `Ink.buckets` rồi bị bỏ lúc xuất tệp. Đúng loại
    hỏng im lặng mà cả bộ test này tồn tại để chặn, và nó dễ xảy ra hơn mọi
    thứ khác ở đây: thêm một lớp là phải sửa HAI mảng."""
    phang = [lop for t in TILES for lop in t["layers"]]
    if phang != list(LAYERS):
        raise SystemExit(
            "SKY_TILES không phủ đúng SKY_LAYERS.\n  tấm: %s\n  lớp: %s\n"
            "Thứ tự tệp trong DOM LÀ thứ tự z — một lớp thiếu ở đây là một lớp "
            "biến mất khỏi bức mà không có gì đỏ lên."
            % (phang, list(LAYERS)))


def main():
    ap = argparse.ArgumentParser(description="Sinh bản đồ sao (SVG) — tám chòm")
    ap.add_argument("--profile", default="dark",
                    help="tên profile màu trong star-map.ts (dark | light)")
    ap.add_argument("--out", default=None, help="thư mục xuất (mặc định public/map/star)")
    ap.add_argument("--stats", action="store_true", help="in bảng đếm nét từng lớp")
    ap.add_argument("--css", action="store_true",
                    help="in khối .hit* để chép vào star-map.module.css")
    ap.add_argument("--do", action="store_true",
                    help="in bảng số đo độ chói / bão hoà / tỉ lệ, không ghi tệp")
    ap.add_argument("--place-nhan", action="store_true",
                    help="chạy bộ máy đặt nhãn và in khối SKY_LABEL_PLACED")
    ap.add_argument("--so-ca", action="store_true",
                    help="in khối SKY_TESTS để chép vào star-map.ts")
    ap.add_argument("--ten-bai", action="store_true",
                    help="in khối SKY_TITLES (tên bài thật) để chép vào star-map.ts")
    ap.add_argument("--phong", action="store_true",
                    help="in khối SKY_ZOOM_PLACED (hình học cú phóng) cho star-map.ts")
    args = ap.parse_args()

    name = "SKY_PROFILE_%s" % args.profile.upper()
    if not re.search(r"export const %s\b" % name, SRC):
        raise SystemExit(
            "star-map.ts chưa có %s. Bộ sinh KHÔNG biết màu nào cả — thêm một "
            "profile ở TS là chạy được ngay, không phải sửa tệp này." % name)
    P = grab(name)
    if P["render"] != "luminance":
        raise SystemExit(
            "hồ sơ '%s' khai `render: %s`. Bộ sinh hiện chỉ dựng được nhánh "
            "'luminance' (bản tối, §3.1); nhánh 'stipple' là bản sáng (§18.2) "
            "và nó CHƯA được dựng. Trượt ở đây là cố ý: âm thầm vẽ bản tối rồi "
            "ghi ra một tệp mang tên bản sáng là đúng kiểu hỏng im lặng mà §19 "
            "tồn tại để chặn." % (args.profile, P["render"]))

    kiem_tile_phu_lop()
    kiem_mo_css(P)
    dat_sao()
    khe = kiem_khe_hai_chom()
    bc = do_bo_cuc()
    if not args.do:
        # `--do` in bảng TRƯỚC rồi mới gác: nó là cái kính hiển vi của người
        # đang dựng, và trượt trước khi in bảng là lấy đi đúng cái bảng cần
        # đọc. Đường dựng tệp thì gác trước khi ghi một byte nào.
        kiem_bo_cuc()
        kiem_tuong_phan_net(P)
    tp_net = do_tuong_phan_net(P)
    tp_net_nghi = min(r[2] for r in tp_net if r[1] == "nghỉ")
    tp_net_mo = min(r[2] for r in tp_net)
    tp_mach = kiem_mach(P)

    if args.do:
        # ĐO rồi IN rồi mới GÁC. `--do` là cái kính hiển vi của người đang
        # dựng: trượt sàn trước khi in bảng là lấy đi đúng cái bảng cần đọc để
        # biết phải sửa chỗ nào. `main` (đường dựng tệp) vẫn gác TRƯỚC khi ghi.
        d = do_ngan_sach(P)
        print()
        print("  trung vị độ chói   %.4f   (tham chiếu 0,0284 · trần %g)"
              % (d["trung_vi"], BUDGET["medianMax"]))
        print("  phân vị 99         %.4f   (tham chiếu 0,955)" % d["p99"])
        print("  %% diện tích L>%g   %.3f%%   (tham chiếu 7,73%% · sàn %.1f%%)"
              % (BUDGET["brightAt"], d["sang"] * 100, BUDGET["brightShareMin"] * 100))
        print("  bão hoà trung bình %.4f   (tham chiếu 0,196 — xem chú thích)"
              % d["bao_hoa"])
        print("  bão hoà theo độ chói %.4f (con số đáng tin hơn)" % d["bao_hoa_w"])
        print("  tỉ lệ lớn : nhỏ    %.1f:1   (tham chiếu ~45:1 · sàn %g:1)"
              % (d["ti_le"], BUDGET["scaleRatioMin"]))
        print("  khe hai chòm gần nhau nhất %.1f px (sàn %g)" % (khe, LINK["minGap"]))
        print("  mạch hoàng đạo tương phản xấu nhất %.2f:1 (sàn 3,0)" % tp_mach)
        print("  nét chòm tương phản xấu nhất %.2f:1 lúc nghỉ · %.2f:1 lúc mờ "
              "(sàn 3,0 lúc nghỉ)" % (tp_net_nghi, tp_net_mo))
        print("  nền sáng nhất trong bao lồi  " + "  ".join(
            "%s %.3f" % (k, v) for k, v, _at in do_tran_chom(P)))
        print()
        print("  đk bao chòm  " + "  ".join("%s %.0f" % (k, v) for k, v in bc["dk"].items()))
        print("  tỉ lệ cỡ chòm      %.2f:1  (cũ 3,53 · sàn %g)"
              % (bc["ti_le_chom"], LINK["scaleRatioMin"]))
        print("  ngôi gần mặt trời nhất %s ở %.0f px (đĩa cấm %g · đĩa mềm %g)"
              % (bc["gan_mat_troi"][1], bc["gan_mat_troi"][0],
                 LIGHT["forbid"], LIGHT["soft"]))
        print("  ngôi trong đĩa cấm %d · trong đĩa mềm %d · dưới chân trời %d"
              % (len(bc["trong_cam"]), len(bc["trong_mem"]), len(bc["duoi_chan_troi"])))
        print("  nét căn trục       %d / %d  (cũ 27/50 ở sàn 8° · sàn nay %g°)%s"
              % (len(bc["truc"]), sum(len(c["lines"]) for c in CONS),
                 LINK["axisMin"],
                 "" if not bc["truc"] else
                 "\n      " + ", ".join("%s %s–%s %.1f°" % t for t in bc["truc"])))
        print()
        # BẢNG TÁM BẬC — cột tham chiếu là phép đo của `bo-cuc-hung-vi.md` §1
        # trên `design/tham-chieu/ban-do-sao-game.png` (đã bỏ 24 % UI chrome).
        # In cả hai cột cạnh nhau vì một con số của mình không nói được gì khi
        # đứng một mình: cái phải đọc là HÌNH DẠNG của phân bố.
        tc = [0.205, 0.231, 0.240, 0.110, 0.080, 0.074, 0.037, 0.025]
        ten = ["đen sâu  < 0,01", "nền trời 0,01–0,03", "t.vân mờ 0,03–0,08",
               "tinh vân 0,08–0,18", "t.vân sáng 0,18–0,35", "rìa quầng 0,35–0,60",
               "quầng    0,60–0,85", "lõi chói > 0,85"]
        print("  bậc độ chói              của mình   tham chiếu")
        for i, t in enumerate(ten):
            print("  %-22s %7.2f%%     %6.1f%%" % (t, d["bac"][i] * 100, tc[i] * 100))
        print("  %-22s %7.2f%%     %6.1f%%   ← con số của lời chê thứ năm"
              % ("BẬC GIỮA 0,03–0,85", d["mid"] * 100, 46.8))
        print("  %-22s %7.2f%%     %6.1f%%   (sàn %.0f%%)"
              % ("ba bậc 0,03–0,35", d["mid3"] * 100, 43.0,
                 BUDGET["midShareMin"] * 100))
        print()
        # Tám nhãn, hai dòng mỗi nhãn — đo lại MỖI LẦN vì đổi câu chữ nhãn là
        # đổi bề rộng hộp, tức đổi chỗ đặt, tức đổi nền sau chữ.
        for key, ten, t in do_tuong_phan_nhan(P):
            print("  nhãn %-3s dòng %-6s %6.2f:1   (sàn 4,5)" % (key, ten, t))
        print()
        kiem_ngan_sach(P)
        return

    if args.place_nhan:
        # Bộ máy §8.4–§8.5 chạy MỘT LẦN, kết quả đóng băng vào TS rồi cả hai
        # hồ sơ đọc CÙNG một chỗ (§19.2 dòng 4). Thứ tự THĂM là thứ tự NHƯỜNG
        # — chòm bó nhất trước, rồi chòm có ngôi neo sáng nhất — nhưng tám chỗ
        # được tìm CÙNG MỘT LÚC và có phép LÙI (xem `xep_nhan`).
        print("export const SKY_LABEL_PLACED = [")
        xep = xep_nhan(P)
        for c in thu_tu_nhan(P):
            g = xep[c["key"]]
            print("  { key: '%s', anchor: '%s', dir: [%d, %d], leg: %g },"
                  % (c["key"], g["code"], g["sx"], g["sy"], g["leg"]))
        print("] as const;")
        return

    kiem_ngan_sach(P)
    kiem_tuong_phan_nhan(P)

    # HAI KHỐI ĐÓNG BĂNG, in ra TRƯỚC khi dựng tranh: cả hai chỉ cần hình học
    # nhãn, không cần một nét nào. Dựng cả bức rồi bỏ đi chỉ để in 48 dòng chữ
    # là mười giây chờ không ai cần.
    if args.ten_bai:
        print(khoi_ten_bai())
        return

    if args.phong:
        print(khoi_phong(vung_bam(hop_nhan_tat_ca(P))))
        return

    out_dir = Path(args.out) if args.out else OUT
    # `os.makedirs` chứ không `Path.mkdir`: trên Windows + Python 3.14,
    # `mkdir(exist_ok=True)` vẫn ném WinError 183 với một thư mục đã có.
    os.makedirs(out_dir, exist_ok=True)

    troi = build_troi(P)
    # Hai tấm cho mỗi chòm: nghỉ (`focus=None`) và rõ (`focus=khoá`). Không có
    # tấm MỜ — xem `build_chom`.
    chom = {}
    for c in CONS:
        chom[(c["key"], False)] = build_chom(P, None, c["key"])[0]
        chom[(c["key"], True)] = build_chom(P, c["key"], c["key"])[0]
    hit = vung_bam(hop_nhan_tat_ca(P))

    if args.stats:
        print()
        for lop in LAYERS:
            b = troi.buckets[lop]
            if b:
                n, g = sum(len(v) for v in b.values()), len(b)
            else:
                # Lớp chòm: cộng cả tám tấm nghỉ, vì không tấm nào còn vẽ đủ
                # tám chòm từ lúc tách tấm.
                n = sum(sum(len(v) for v in chom[(c["key"], False)].buckets[lop].values())
                        for c in CONS)
                g = sum(len(chom[(c["key"], False)].buckets[lop]) for c in CONS)
            print("  %-18s %6d nét  %3d nhóm" % (lop, n, g))
        print()

    if args.css:
        # Biến màu nền TRƯỚC, vì nó là thứ `sky-theme.css` phải mang; các khối
        # `.hit*` thì chép vào `star-map.module.css`.
        print(khoi_bien_mau(P, args.profile))
        # `a` = bao lồi chòm, `b` = hộp nhãn. Quy ra % của khung để ô bấm
        # không lệch khi bề rộng màn đổi.
        for key, hai in hit.items():
            for hau, (x0, y0, x1, y1) in zip("ab", hai):
                print(".hit%s%s {" % (key, hau))
                print("  left: %.3f%%;" % ((x0 - VX0) / VIEW["width"] * 100))
                print("  top: %.3f%%;" % ((y0 - VY0) / VIEW["height"] * 100))
                print("  width: %.3f%%;" % ((x1 - x0) / VIEW["width"] * 100))
                print("  height: %.3f%%;" % ((y1 - y0) / VIEW["height"] * 100))
                print("}")
        # 48 DẤU NGÔI của lớp con trỏ — TÂM của ngôi, quy ra % khung.
        #
        # Vì sao in ra đây chứ không tính trong React: `star-map.module.css`
        # không được mang `style={{…}}` (SSR tuần tự hoá nó thành thuộc tính
        # `style="…"`, một trong hai nguyên nhân `style-src 'unsafe-inline'`
        # chưa bỏ được), nên vị trí phải là CSS tĩnh. Và đây đúng đường đi của
        # `.hit*`: con số sinh ra từ `placeStar()`, ca test tính lại từ hồ sơ
        # TS và so từng số — chép tay một toạ độ là một toạ độ sẽ lệch.
        for code, x, y, _r, _b, _key in STARS:
            print(".sao%s {" % code)
            print("  left: %.3f%%;" % ((x - VX0) / VIEW["width"] * 100))
            print("  top: %.3f%%;" % ((y - VY0) / VIEW["height"] * 100))
            print("}")
        # TÁM KHỐI CÚ PHÓNG. Cùng ba con số với `SKY_ZOOM_PLACED`, chỉ khác
        # đơn vị — ca test so hai chỗ, vì CSS lái bức tranh còn TS lái phép đảo
        # của lớp con trỏ, và hai chỗ lệch nhau là vòng dò nhận sai ngôi.
        print(khoi_css_phong(hit))
        return

    if args.so_ca:
        print(khoi_so_ca())
        return

    # Tên nghe được PHẢI trùng tên nhìn thấy. `c["name"]` là tên HÌNH ("Kẹp",
    # "Con thoi") — đã bỏ khỏi nhãn, nhưng từng sống sót ở đây, nên người dùng
    # trình đọc màn hình vẫn nghe một cái tên mà giao diện không còn dùng và
    # không chỗ nào giải thích. Dùng `c["subtitle"]`, đúng chuỗi mà dòng nhãn
    # ở `cum_nhan()` đang in ra.
    viec = []
    for t in TILES:
        if t["file"] == "chom":
            for c in CONS:
                viec.append(("sky-chom-%s" % c["key"], chom[(c["key"], False)],
                             t["layers"],
                             "Chòm %s · %s: %d ngôi, mỗi ngôi là một bài."
                             % (c["key"], c["subtitle"], len(c["stars"]))))
                viec.append(("sky-chom-%s-ro" % c["key"], chom[(c["key"], True)],
                             t["layers"],
                             "Chòm %s · %s, %d bài — bản rõ lên lúc được trỏ vào."
                             % (c["key"], c["subtitle"], len(c["stars"]))))
        else:
            viec.append(("sky-%s" % t["file"], troi, t["layers"],
                         {"troi": "Nền trời: tinh vân, một nguồn sáng trội và dải Ngân Hà.",
                          "sao-nen": "Trường sao nền và lưới toạ độ — chất liệu, không mang tin.",
                          "mach": "Mạch phụ thuộc: cung nét đứt qua bốn chặng NumPy, pandas, "
                                  "Matplotlib và dự án."}[t["file"]]))

    rows, tong = [], 0.0
    for ten, ink, lops, aria in viec:
        svg = ink.render(lops, aria)
        for xau in ("Gradient", "gradient", "<filter", "feTurbulence"):
            if xau in svg:
                raise SystemExit(
                    "%s sinh ra `%s` — tinh vân và nguồn sáng phải làm bằng "
                    "đường đồng mức, quầng sao bằng vòng đồng tâm. Một ngoại lệ "
                    "là một cái lỗ để đúng cái lỗi 'mảng phẳng tô gradient' quay "
                    "lại." % (ten, xau))
        f = out_dir / ("%s.svg" % ten)
        f.write_text(svg, encoding="utf-8")
        kb = len(svg.encode("utf-8")) / 1024
        tong += kb
        net = sum(len(v) for lop in lops for v in ink.buckets[lop].values())
        rows.append((f.name, net, kb))

    # Biến màu nền của khung, ghi RA TỆP chứ chỉ in ra thì nó sẽ lệch: in ra
    # là chờ một con người chép, và màu chép tay là màu sẽ trôi.
    theme = out_dir / "sky-theme.css"
    theme.write_text(khoi_bien_mau(P, args.profile), encoding="utf-8")
    tong += len(theme.read_bytes()) / 1024

    for n, strokes, kb in rows:
        print("%-22s %6d nét %8.1f KB" % (n, strokes, kb))
    print("%-22s %6s     %8.1f KB" % (theme.name, "", len(theme.read_bytes()) / 1024))
    print("%-22s %6s     %8.1f KB  (trần %d)" % ("TỔNG", "", tong, MAX_TOTAL_KB))
    # SỔ ĐẾM ĐƯỜNG ĐỒNG MỨC — in ở ĐÂY vì đây là chỗ duy nhất `contours()` thật
    # sự chạy (`--do` chỉ hỏi trường, không vẽ một đường nào). Một đường còn HỞ
    # là một mảng tinh vân không được tô; con số này từng là 147 và đó là toàn
    # bộ 20 điểm phần trăm bậc giữa bị mất. `scripts/star/raster.py` đo hệ quả,
    # dòng này chỉ ra nguyên nhân.
    print("đường đồng mức        %6d đường · %d khép theo mép · %d còn hở · %d phủ cả hộp"
          % (CTR_STAT["duong"], CTR_STAT["khep"], CTR_STAT["le"], CTR_STAT["ca_hop"]))
    over = ["%s %.0f KB" % (n, kb) for n, _s, kb in rows if kb > MAX_KB]
    if over:
        raise SystemExit("vượt trần %d KB mỗi tệp — hạ DENSITY hoặc nới "
                         "NEB['cell']: %s" % (MAX_KB, ", ".join(over)))
    if tong > MAX_TOTAL_KB:
        raise SystemExit("cả bộ nặng %.0f KB, vượt trần %d KB (mốc đặc tả §9.2 — "
                         "bằng đúng phần ảnh của một trang di động trung bình)"
                         % (tong, MAX_TOTAL_KB))


if __name__ == "__main__":
    main()
