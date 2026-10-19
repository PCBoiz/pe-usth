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
   ~1/r, tinh vân bằng năm đường đồng mức lồng nhau (đặc tả §9.5). Một ngoại lệ
   "chỉ cho quầng sao" là một cái lỗ để đúng cái lỗi gốc quay lại.

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
HIT = grab("SKY_HIT")
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

    def _add(self, layer, key, d):
        if layer not in self.buckets:
            raise SystemExit("lớp '%s' không có trong SKY_LAYERS (star-map.ts)" % layer)
        self.buckets[layer].setdefault(key, []).append(d)
        self.n += 1

    def stroke(self, layer, d, color, w=0.6, op=1.0, cap="round", dash=None):
        w = max(self.STEP_W, round(w / self.STEP_W) * self.STEP_W)
        op = max(self.STEP_OP, min(1.0, round(op / self.STEP_OP) * self.STEP_OP))
        self._add(layer, ("s", color, round(w, 2), round(op, 2), cap, dash), d)

    def fill(self, layer, d, color, op=1.0, rule=None):
        op = max(self.STEP_OP, min(1.0, round(op / self.STEP_OP) * self.STEP_OP))
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
             op=1.0, tracking=None):
        self._add(layer, ("t", color, round(op, 2), size, weight, family, anchor, tracking),
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
                    _, color, op, rule = key
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
                    _, color, op, size, weight, family, anchor, tracking = key
                    a = ['fill="%s"' % color, 'font-family="%s"' % family,
                         'font-size="%s"' % wf(size), 'font-weight="%d"' % weight]
                    if anchor != "start":
                        a.append('text-anchor="%s"' % anchor)
                    if op < 1:
                        a.append('fill-opacity="%s"' % of(op))
                    if tracking:
                        a.append('letter-spacing="%s"' % wf(tracking * size))
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


def mw_half(t):
    """Dải PHÌNH ở giữa — nửa bề rộng 85 ở hai đầu, 130 ở giữa (§4.3)."""
    e, m = MW["halfWidth"]["ends"], MW["halfWidth"]["mid"]
    return e + (m - e) * math.sin(math.pi * max(0.0, min(1.0, t)))


HULLS = []   # bao lồi của từng chòm, trong khung đầy đủ
STARS = []   # [(mã, x, y, r, bậc, chòm)]


def dat_sao():
    """Toạ độ lưới cục bộ → khung 1360 × 820, tỉ lệ ĐỒNG DẠNG, căn giữa hộp.

    `min` chứ không bóp theo từng trục: bóp theo từng trục cho khít hộp
    310 × 210 thì cái kẹp cao 186 đơn vị thành một hình bè ra — mất đúng thứ
    phải đọc ra ở phép thử nhận dạng. Lưới là của TỪNG chòm (`c["grid"]`), vì
    bảng §2 cho M2…M8 toạ độ y trong 0…100 còn M1 tới 195. Cùng công thức ở
    `placeStar()` phía TS; ca test so lại từng ngôi."""
    for c in CONS:
        bx, by, bw, bh = c["box"]
        gw, gh = c["grid"]
        k = min(bw / gw, bh / gh)
        ox = bx + (bw - gw * k) / 2
        oy = by + (bh - gh * k) / 2
        pts = []
        for s in c["stars"]:
            code = s["code"]
            if code not in SO_CA:
                raise SystemExit(
                    "mã bài %s không có trong out-advanced/lessons — bản đồ đang "
                    "vẽ một bài không tồn tại" % code)
            x, y = ox + s["x"] * k, oy + s["y"] * k
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
    là thứ giữ cho trần độ chói cục bộ của §3.1 không bị vỡ."""
    d = min(dist_to_hull(x, y, h) for _, h in HULLS)
    return smoothstep(d / pad) if pad > 0 else 1.0


def neb_field(x, y):
    """Trường tinh vân 0..1: dải Ngân Hà × fBm BÓP MÉO MIỀN bậc hai.

    CÁI BẪY LỚN NHẤT của bóp méo miền: phải CHUẨN HOÁ LẠI dải giá trị. fBm sau
    khi bóp méo chỉ chiếm một dải hẹp (một bản port đo được [0,39 ; 0,83]);
    không ánh xạ lại về [0, 1] thì tinh vân ra MỘT MÀN SƯƠNG XÁM ĐỀU, không
    phải một đám mây — đúng cái "mảng phẳng không có chiều sâu" bị chê."""
    t, s = mw_coords(x, y)
    hw = mw_half(t)
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
    """Lớp 1 — bụi xa: một dải rộng hơn, KHÔNG bóp méo miền (§3.1)."""
    t, s = mw_coords(x, y)
    hw = mw_half(t) * NEB["dust"]["spread"]
    band = smoothstep(1.0 - abs(s) / hw) if hw > 0 else 0.0
    n = NZ.fbm(x * 1.6 / W, y * 1.6 / W, 5, NEB["lacunarity"], NEB["gain"])
    fm = NEB["floorMix"]
    return band * (fm + (1 - fm) * n)


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
    điệu theo r nên hai vòng không bao giờ cắt nhau."""
    k = math.sqrt(max(0.0, min(1.0, r / LIGHT["outer"])))
    return 1.0 + LIGHT["warp"] * k * light_wave(th)


def light_f(x, y) -> float:
    """`f` của một điểm: 0 ở rìa quầng, 1 ở trong lõi. Nghịch đảo của phép
    dựng vòng, nên lượt VẼ và lượt ĐO nói đúng cùng một hình."""
    dx, dy = x - LIGHT["at"]["x"], y - LIGHT["at"]["y"]
    d = math.hypot(dx, dy)
    if d <= 0:
        return 1.0
    th = math.atan2(dy, dx)
    # Bán kính hiệu dụng: chia cho hệ số méo tại chính bán kính đó. Hai vòng
    # lặp thô là đủ — `light_m` biến thiên chậm theo r.
    de = d / light_m(th, d)
    de = d / light_m(th, de)
    if de >= LIGHT["outer"]:
        return 0.0
    if de <= LIGHT["core"]:
        return 1.0
    return (LIGHT["outer"] - de) / (LIGHT["outer"] - LIGHT["core"])


def light_alpha(f: float):
    """`(độ mờ sắc quầng, độ mờ sắc lõi)` CỘNG DỒN tại `f`.

    MỘT hàm cho cả lượt vẽ lẫn lượt ĐO: `ve_nguon_sang` tô mười sáu vòng theo
    hồ sơ này, `do_sang_rgb` đọc lại chính hồ sơ ấy. Hai công thức là hai con
    số sẽ lệch, và lệch ở đây nghĩa là ngân sách diện tích đang đo một bức
    tranh khác với bức được ghi ra tệp."""
    if f <= 0:
        return 0.0, 0.0
    n, nc = LIGHT["levels"], LIGHT["coreLevels"]
    fs = (n - nc) / n
    A = lambda u: LIGHT["alphaMax"] * u ** LIGHT["falloff"]
    if f <= fs:
        return A(f), 0.0
    a0 = A(fs)
    return a0, (A(f) - a0) / max(1e-6, 1.0 - a0)


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
    # 3 · tương phản dọc cung
    mau = hex_rgb(P["zodiac"])
    xau, at = 99.0, None
    for i in range(0, len(pts), 3):
        x, y = pts[i]
        if not (0 <= x <= W and 0 <= y <= H):
            continue
        nen = do_sang_rgb(x, y, P)
        tren = over(nen, mau, ZOD["opacity"])
        L1, L2 = luminance(tren), luminance(nen)
        tp = (max(L1, L2) + 0.05) / (min(L1, L2) + 0.05)
        if tp < xau:
            xau, at = tp, (round(x), round(y))
    if xau < 3.0:
        raise SystemExit(
            "mạch hoàng đạo chỉ còn %.2f:1 tại %s — dưới 3:1 của WCAG 1.4.11. "
            "Nét MANG TIN phải đọc được ở MỌI chỗ nó đi qua; dịch "
            "`SKY_LIGHT.at` ra xa cung, hay hạ `SKY_LIGHT.levels`." % (xau, at))
    return xau


def horizon_amt(y):
    """Quầng chân trời: chỉ ở `SKY_HORIZON.height` px dưới cùng của KHUNG."""
    top = H - HORIZON["height"]
    return smoothstep((y - top) / HORIZON["height"]) if y > top else 0.0


# ═══════════════════════════════════════════════════════════════════════
# 6 · marching squares + Douglas–Peucker
# ═══════════════════════════════════════════════════════════════════════


_GRID: dict = {}


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
    key = lambda p: (round(p[0], 3), round(p[1], 3))
    start: dict = {}
    for a, b in segs:
        start.setdefault(key(a), []).append((a, b))
    chains = []
    used = set()
    for idx, (a0, b0) in enumerate(segs):
        if idx in used:
            continue
        chain = [a0, b0]
        used.add(idx)
        cur = b0
        while True:
            nxt = None
            for cand in start.get(key(cur), []):
                ci = segs.index(cand)
                if ci not in used:
                    nxt = (ci, cand)
                    break
            if nxt is None:
                break
            used.add(nxt[0])
            cur = nxt[1][1]
            chain.append(cur)
            if key(cur) == key(a0):
                break
        if len(chain) >= 4:
            chains.append(chain)
    return [simplify(ch, NEB["simplify"]) for ch in chains]


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
        for ch in contours(dust_field, lv, MX0, MY0, MX1, MY1, NEB["cell"] * 2):
            ink.fill("bui-xa", pl(ch, True), P["dustFar"],
                     NEB["dust"]["opacity"] * dim, "evenodd")


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
    n, nc = LIGHT["levels"], LIGHT["coreLevels"]
    cx, cy = LIGHT["at"]["x"], LIGHT["at"]["y"]
    tich_g = tich_c = 0.0
    for i in range(n):
        f = (i + 1) / n
        r = LIGHT["outer"] + (LIGHT["core"] - LIGHT["outer"]) * f
        ag, ac = light_alpha(f)
        if i < n - nc:
            a, tich_g = (ag - tich_g) / max(1e-6, 1.0 - tich_g), ag
            col = P["glow"]
        else:
            a, tich_c = (ac - tich_c) / max(1e-6, 1.0 - tich_c), ac
            col = P["glowCore"]
        if a <= 0.004:
            continue
        pts = []
        for k in range(LIGHT["seg"]):
            th = math.tau * k / LIGHT["seg"]
            rr = r * light_m(th, r)
            pts.append((cx + math.cos(th) * rr, cy + math.sin(th) * rr))
        ink.fill("nguon-sang", pl(pts, True), col, a * dim)
    # LẤM TẤM trong quầng — cùng lý lẽ với lấm tấm của tinh vân: nó là thứ giữ
    # cho mười sáu vòng phẳng khỏi đọc ra là mười sáu cái vòng. Ở đây nó cần
    # hơn ở tinh vân, vì nguồn sáng là vật TO nhất bức nên mỗi vòng của nó là
    # một mảng to.
    st = LIGHT["stipple"]
    R = LIGHT["outer"] * (1 + LIGHT["warp"])
    for i in range(int(st["count"] * DENSITY)):
        a = rnd(i * 3.1, 1.7) * math.tau
        r = math.sqrt(rnd(i * 5.3, 9.1)) * R
        x, y = cx + math.cos(a) * r, cy + math.sin(a) * r
        if not (VX0 <= x <= VX1 and VY0 <= y <= VY1):
            continue
        f = light_f(x, y)
        if f < st["at"] or rnd(x * 1.9, y * 4.1) > (f - st["at"]) * st["gain"]:
            continue
        ink.stroke("nguon-sang", dot(x, y), P["glowCore"],
                   st["size"] * 2, st["opacity"] * dim)


def ve_loe_ngang(ink, P, dim):
    """VỆT LOÉ NGANG qua nguồn sáng — đọc được bằng mắt trên khung hình tham
    chiếu (`chieu-sau-tuong-tac.md` §2.2) và đặc tả §3.3 đã chép nó.

    Nó không phải trang trí: một vệt ngang là thứ nói ra "đây là một NGUỒN
    SÁNG, không phải một mảng sơn sáng" — mắt đọc vệt loé ra là ánh sáng tràn
    qua một thấu kính. Thuôn về hai đầu bằng ĐỘ MỜ, không bằng gradient."""
    fl = LIGHT["flare"]
    cx, cy = LIGHT["at"]["x"], LIGHT["at"]["y"]
    half = LIGHT["outer"] * fl["span"] / 2
    for i in range(fl["steps"]):
        t = (i + 0.5) / fl["steps"]
        u = (t - 0.5) * 2                     # −1 … +1
        x0 = cx + u * half
        seg = half * 2 / fl["steps"]
        thuon = max(0.0, 1.0 - abs(u)) ** 1.6
        if thuon <= 0.02:
            continue
        ink.poly("loe-ngang", [(x0 - seg / 2, cy), (x0 + seg / 2, cy)],
                 P["glowCore"], fl["width"] * (0.4 + 0.6 * thuon),
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
    fn = neb_fade
    for i in range(n):
        lv = lo + (hi - lo) * i / (n - 1)
        col = P["nebula"] if i < n - 2 else P["nebulaCore"]
        for ch in contours(fn, lv, MX0, MY0, MX1, MY1, NEB["cell"]):
            ink.fill("tinh-van", pl(ch, True), col,
                     NEB["levelOpacity"] * dim, "evenodd")
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
        for ch in contours(lane_field, lv, MX0, MY0, MX1, MY1, NEB["cell"]):
            ink.fill("khe-bui", pl(ch, True), P["dustLane"],
                     NEB["lane"]["opacity"] * dim, "evenodd")


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


def ve_quang_chan_troi(ink, P, dim):
    """Lớp 5 — quầng chân trời, dựng bằng MẬT ĐỘ NÉT chứ không bằng gradient
    dọc. Bầu trời chạm đất, không phải một cái hố đen dán giữa trang (§5.3).
    Và đây cũng là chỗ bắt đầu của bản đồ báo bằng ÁNH SÁNG VÙNG (§15)."""
    far, near = HORIZON["step"]
    o0, o1 = HORIZON["opacity"]
    y = max(VY0, H - HORIZON["height"])
    while y < VY1:
        amt = horizon_amt(y)
        pts = wobble_line(VX0 - 4, y, VX1 + 4, y + (NZ.v(y * 0.05, 1.1) - 0.5) * 6,
                          HORIZON["wobble"])
        ink.poly("quang-chan-troi", pts, P["horizon"], HORIZON["width"],
                 (o0 + o1 * amt) * dim)
        y += near + (far - near) * (1 - amt)


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
            h = horizon_amt(y)
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
    ink.poly("mach-hoang-dao", pts, P["zodiac"], ZOD["width"],
             ZOD["opacity"] * dim, dash=ZOD["dash"])
    ink.poly("mach-hoang-dao", mach_le(pts, ZOD["bandOffset"]), P["zodiac"],
             ZOD["width"], ZOD["bandOpacity"] * dim, dash=ZOD["dash"])


def ve_net_chom(ink, P, focus):
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
            # Nét ĐẬM HƠN ở hàng/cột nhãn của M6 — chỗ DUY NHẤT trong cả bản
            # đồ mà độ dày nét mang nghĩa riêng (§2). Nó nói ra khác biệt giữa
            # `ndarray` (M5, không nhãn) và `DataFrame` (M6, có nhãn) bằng
            # HÌNH chứ không bằng chữ, nên nó cũng phải có trong chú giải.
            w = P["scale"]["line"] * (LINK["emphasis"] if len(ab) > 2 else 1.0)
            # Độ dày KHÔNG đổi khi hover: đổi kích thước là "chuyển động" theo
            # định nghĩa hẹp của WCAG, nên nó phải bỏ dưới `reduce`. Hai tấm
            # ảnh chỉ khác nhau ở ĐỘ MỜ ⇒ bản này an toàn với `reduce` ngay từ
            # lúc sinh, không cần một tấm thứ ba.
            ink.poly("net-chom", wobble_line(a[0], a[1], b[0], b[1], LINK["wobble"]),
                     hue, w, op)


def ve_sao(ink, P, focus):
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
    nhan`) lẫn lượt KIỂM (mỗi lần build). Hai hàm là hai công thức sẽ lệch."""
    code, ax, ay, ar, _t, _k = anchor
    name = c["name"]
    sub = "%s · %s · %d bài" % (c["key"], c["subtitle"], len(c["stars"]))
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
    if box_sang_qua(box, P):
        return "độ chói trung bình trong hộp chữ vượt trần %s" % P["textCeiling"]
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


def tim_nhan(c, P, da_dat=()):
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
                    if best is None or score > best[0]:
                        best = (score, g)
            # Nới đoạn 1 theo bước 2 px tới `legMax`, rồi theo bước 6 px tới
            # `legHardMax` (§8.4 "khi hết chỗ").
            leg += LBL["legStep"] if leg < LBL["legMax"] else LBL["legGrow"]
        if best:
            break
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
    # thân Ngân Hà — năm bậc, hai bậc trong cùng dùng sắc lõi
    g = neb_fade(x, y)
    lo, hi, n = NEB["levelLo"], NEB["levelHi"], NEB["levels"]
    lv = sum(1 for i in range(n) if g > lo + (hi - lo) * i / (n - 1))
    if lv:
        core = max(0, lv - (n - 2))
        col = over(col, hex_rgb(P["nebula"]),
                   1 - (1 - NEB["levelOpacity"]) ** (lv - core))
        if core:
            col = over(col, hex_rgb(P["nebulaCore"]),
                       1 - (1 - NEB["levelOpacity"]) ** core)
    # khe bụi NHÂN vào — nó làm TỐI đi, nên nó chỉ giúp đạt trần
    nl = sum(1 for lv in NEB["lane"]["levels"] if lane_field(x, y) > lv)
    if nl:
        col = over(col, hex_rgb(P["dustLane"]),
                   1 - (1 - NEB["lane"]["opacity"]) ** nl)
    # quầng chân trời: các nét chồng nhau, cộng dồn theo số nét phủ một điểm
    h = horizon_amt(y)
    if h > 0:
        lop = HORIZON["opacity"][0] + HORIZON["opacity"][1] * h
        col = over(col, hex_rgb(P["horizon"]),
                   min(1.0, 1 - (1 - lop) ** HORIZON["overlap"]))
    # NGUỒN SÁNG TRỘI, cộng cuối cùng vì lớp của nó nằm trên bụi xa và dưới
    # tinh vân, mà ở chỗ nó sáng nhất thì tinh vân đã loãng (nó nằm ngoài dải
    # Ngân Hà) — nên xếp sau là xấp xỉ sát hơn, và nó là xấp xỉ ĐẮT hơn, tức
    # an toàn hơn cho ba phép kiểm tiếp cận dựa vào hàm này.
    ag, ac = light_alpha(light_f(x, y))
    if ag > 0:
        col = over(col, hex_rgb(P["glow"]), ag)
    if ac > 0:
        col = over(col, hex_rgb(P["glowCore"]), ac)
    return col


def do_sang(x, y, P) -> float:
    return luminance(do_sang_rgb(x, y, P))


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


def kiem_tran_chom(P):
    """Trần độ chói CỤC BỘ: trong bao lồi mỗi chòm nở 24 px, độ chói không
    được vượt `hullCeiling`. Lý do ở §4.1: dưới ngưỡng đó nét chòm mới đạt
    3:1 — tức đây là một ràng buộc TIẾP CẬN, không phải một gu thẩm mỹ."""
    tran = luminance(hex_rgb(P["hullCeiling"]))
    pad = FIELD["ceilingPad"]
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
        if worst > tran:
            raise SystemExit(
                "chòm %s: độ chói nền trong bao lồi đạt %.4f tại %s, vượt trần "
                "%.4f (%s) — nét chòm ở đó tụt dưới 3:1. Hạ mật độ tinh vân hoặc "
                "nới `SKY_NEBULA.hullFade`." % (key, worst, at, tran, P["hullCeiling"]))


def thu_tu_nhan():
    """Thứ tự ĐẶT nhãn: chòm có ngôi neo SÁNG NHẤT đặt trước (§8.4).

    Quy ước bản đồ sao: nhãn sáng hơn GIỮ CHỖ, nhãn mờ hơn NHƯỜNG. Với một
    nhãn thì thứ tự không có nghĩa gì — đó là lý do bản mẫu một chòm không thử
    được luật này. Với tám nhãn nó quyết định bản đồ nào ra: đổi thứ tự là đổi
    chỗ đứng của vài cái nhãn, và những cái nhường sẽ phải đi ra xa hơn.

    Phá hoà bằng KHOÁ chòm, không bằng thứ tự khai: hai chòm có ngôi neo cùng
    bậc thì phải xếp theo một thứ gì ổn định, và `M1 < M2 < …` ổn định hơn một
    thứ tự khai mà ai cũng có thể hoán đổi khi thêm chòm."""
    def sang_nhat(c):
        return max(s[3] for s in STARS if s[5] == c["key"])
    return sorted(CONS, key=lambda c: (-sang_nhat(c), c["key"]))


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
    return {
        "trung_vi": Ls[o // 2],
        "p99": Ls[int(o * 0.99)],
        "sang": sang / dt_o,
        "bao_hoa": sum(sat) / len(sat),
        "bao_hoa_w": sat_w / w_tong,
        "ti_le": ti_le,
    }


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
    if d["ti_le"] < BUDGET["scaleRatioMin"]:
        raise SystemExit(
            "TỈ LỆ VẬT LỚN NHẤT : SAO NỀN chỉ %.1f:1, dưới %g:1 — người xem "
            "không cảm được độ lớn của bức. Đạt bằng cách nới nguồn sáng, "
            "KHÔNG bằng cách phóng to một ngôi nào."
            % (d["ti_le"], BUDGET["scaleRatioMin"]))
    return d


def ve_nhan(ink, P, focus):
    """Hai tầng nhãn là quy ước THẬT của bản đồ sao, không phải một thoả hiệp
    hiện đại: Bayer in ký hiệu ngắn trên bản khắc và bảng dữ liệu đầy đủ ở bên
    cạnh — bản khắc không bao giờ cõng cả tên đầy đủ. Nên: tên chòm + một dòng
    phụ trên bản đồ, MÃ BÀI lúc hover, tên bài đầy đủ ở chú giải."""
    out = []
    da_dat = []
    for c in thu_tu_nhan():
        g = nhan_box(c, P, tuple(da_dat))
        da_dat.append((c["key"], g["box"]))
        p0, p1, p2, box = g["p0"], g["p1"], g["p2"], g["box"]
        name, sub, wn = g["name"], g["sub"], g["wn"]
        hue = P["hues"][c["hue"]]
        ro = focus == c["key"]
        mo = 1.0
        if focus is not None and not ro:
            mo = P["scale"]["dimOpacity"] / P["scale"]["lineOpacity"][0]
        lop = (LBL["leaderFocusOpacity"] if ro else LBL["leaderOpacity"]) * mo
        ink.poly("nhan", [p0, p1, p2], hue, LBL["ruleWidth"], lop)
        rule_x0 = box[0]
        ink.poly("nhan", [(rule_x0, p2[1]), (rule_x0 + wn + LBL["rulePad"], p2[1])],
                 hue, LBL["ruleWidth"], lop)
        ink.text("nhan", rule_x0, p2[1] - LBL["baselineLift"], name, P["text"],
                 LBL["nameSize"], LBL["nameWeight"], LBL["fontStack"], op=mo)
        ink.text("nhan", rule_x0, p2[1] + LBL["sublineGap"], sub,
                 P["text"] if ro else P["textSub"],
                 LBL["subSize"], LBL["subWeight"], LBL["fontStack"],
                 op=mo, tracking=LBL["subTracking"])
        out.append((c["key"], box))
        if ro:
            # Hiệu ứng 7 của §10, rẻ nhất trong cả danh sách: mã bài hiện ra ở
            # chéo trên-phải. KHÔNG hiện tên bài — tên đầy đủ thuộc về chú giải.
            for s in STARS:
                if s[5] != c["key"]:
                    continue
                ink.text("nhan", s[1] + s[3] + LBL["codeOffset"],
                         s[2] - s[3] - LBL["codeOffset"] * 0.4, s[0], P["code"],
                         LBL["codeSize"], 500, LBL["monoStack"])
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
    ve_quang_chan_troi(ink, P, 1.0)
    ve_truong_sao(ink, P, 1.0)
    ve_luoi(ink, P, 1.0)
    ve_mach(ink, P, 1.0)
    return ink


def build_chom(P, focus):
    """Năm lớp CHÒM — nét, quầng, thân, lõi, nhãn. Một tấm cho trạng thái nghỉ
    và một tấm cho mỗi chòm được trỏ vào, tức chín tấm.

    Chín tấm NHỎ, và đó là cả điểm: lớp chòm không có tinh vân, không có 1 250
    sao nền, nên một tấm chỉ nặng vài chục KB. Tấm tiêu điểm của chòm Mk vẽ
    ĐỦ tám chòm — Mk ở độ mờ hover, bảy chòm kia ở `dimOpacity`. Nhờ vẽ đủ
    tám mà đúng MỘT tấm chòm hiện ở mỗi lúc, nên không có chỗ nào hai bản của
    cùng một chòm chồng lên nhau và cộng độ mờ với nhau.

    Và chín tấm KHÁC NHAU CHỈ Ở ĐỘ MỜ: không bán kính nào to lên, không nét
    nào dày lên. Theo định nghĩa hẹp của WCAG, đổi màu/độ mờ KHÔNG tính là
    hoạt ảnh chuyển động, còn đổi kích thước thì TÍNH — nên bản này an toàn
    với `prefers-reduced-motion` ngay từ lúc sinh, không cần một tấm thứ ba."""
    ink = Ink()
    ve_net_chom(ink, P, focus)
    ve_sao(ink, P, focus)
    boxes = ve_nhan(ink, P, focus)
    return ink, boxes


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
    dat_sao()
    khe = kiem_khe_hai_chom()
    kiem_tran_chom(P)
    tp_mach = kiem_mach(P)

    if args.do:
        d = kiem_ngan_sach(P)
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
        print()
        return

    if args.place_nhan:
        # Bộ máy §8.4–§8.5 chạy MỘT LẦN, kết quả đóng băng vào TS rồi cả hai
        # hồ sơ đọc CÙNG một chỗ (§19.2 dòng 4). Thứ tự là thứ tự NHƯỜNG:
        # chòm có ngôi neo sáng nhất giữ chỗ trước.
        print("export const SKY_LABEL_PLACED = [")
        da_dat = []
        for c in thu_tu_nhan():
            g = tim_nhan(c, P, tuple(da_dat))
            da_dat.append((c["key"], g["box"]))
            print("  { key: '%s', anchor: '%s', dir: [%d, %d], leg: %g },"
                  % (c["key"], g["code"], g["sx"], g["sy"], g["leg"]))
        print("] as const;")
        return

    kiem_ngan_sach(P)

    out_dir = Path(args.out) if args.out else OUT
    # `os.makedirs` chứ không `Path.mkdir`: trên Windows + Python 3.14,
    # `mkdir(exist_ok=True)` vẫn ném WinError 183 với một thư mục đã có.
    os.makedirs(out_dir, exist_ok=True)

    troi = build_troi(P)
    chom = {None: build_chom(P, None)}
    for c in CONS:
        chom[c["key"]] = build_chom(P, c["key"])
    hit = vung_bam(chom[None][1])

    if args.stats:
        print()
        for lop in LAYERS:
            b = troi.buckets[lop] or chom[None][0].buckets[lop]
            n = sum(len(v) for v in b.values())
            print("  %-18s %6d nét  %3d nhóm" % (lop, n, len(b)))
        print()

    if args.css:
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
        return

    ten_chom = {c["key"]: c["name"] for c in CONS}
    viec = []
    for t in TILES:
        if t["file"] == "chom":
            viec.append(("sky-chom-nghi", chom[None][0], t["layers"],
                         "Tám chòm sao: %d ngôi, mỗi ngôi là một bài của khoá."
                         % len(STARS)))
            for c in CONS:
                viec.append(("sky-chom-%s" % c["key"], chom[c["key"]][0], t["layers"],
                             "Chòm %s · %s, %d bài — rõ lên, bảy chòm còn lại mờ đi."
                             % (c["key"], ten_chom[c["key"]], len(c["stars"]))))
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

    for n, strokes, kb in rows:
        print("%-22s %6d nét %8.1f KB" % (n, strokes, kb))
    print("%-22s %6s     %8.1f KB  (trần %d)" % ("TỔNG", "", tong, MAX_TOTAL_KB))
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
