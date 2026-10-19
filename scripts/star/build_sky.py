#!/usr/bin/env python3
"""Sinh BẢN ĐỒ SAO (SVG) — bản mẫu: chòm M1 "Chạc", 7 ngôi = 7 bài.

    py scripts/star/build_sky.py                 # sinh ra frontend/public/map/star/
    py scripts/star/build_sky.py --stats         # thêm bảng đếm nét từng lớp
    py scripts/star/build_sky.py --css           # in khối .hitM1 cho css module
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

Trần dung lượng: `MAX_KB` dưới đây, script TỰ CHẶN. Bản vực lấy 900 KB cho cả
khung 1360 × 820; đây là một ô crop 660 × 390 nên trần chặt hơn hẳn.
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

# Trần dung lượng MỖI tệp. Hai tấm (nghỉ + hover) nên trần tổng là 2 ×.
MAX_KB = 240

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
VIEW = grab("SKY_VIEW")
MW = grab("SKY_MILKYWAY")
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
LOCAL = grab("SKY_LOCAL")

W, H = FRAME["width"], FRAME["height"]


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

    def render(self) -> str:
        esc = lambda s: (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
        out = [
            "<!-- SINH BỞI scripts/star/build_sky.py — ĐỪNG SỬA TAY. Sửa dữ liệu ở "
            "frontend/src/lib/star-map.ts rồi chạy lại script. -->",
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s" width="%s" '
            'height="%s" role="img" aria-label="%s">'
            % (nf(VIEW["x"]), nf(VIEW["y"]), nf(VIEW["width"]), nf(VIEW["height"]),
               nf(VIEW["width"]), nf(VIEW["height"]), esc(ARIA)),
        ]
        # Thứ tự lớp là MỘT danh sách duy nhất (`SKY_LAYERS` ở TS): thứ tự đăng
        # ký LÀ thứ tự z, LÀ thứ tự vẽ. Azgaar đã trả giá cho việc chép thứ tự
        # lớp ở ba chỗ mà "không có gì giữ cho ba chỗ ấy khớp nhau".
        for name in LAYERS:
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

    Đặc tả §2 nói "0–100 trong hộp" nhưng bảng M1 của chính nó có y tới 195 —
    hai câu không khớp. Giải theo hướng GIỮ ĐƯỢC HÌNH: lưới là 100 × 200, đặt
    vào hộp bằng `min` của hai tỉ lệ. Bóp theo từng trục cho khít hộp 310 × 210
    thì cái chạc cao 186 đơn vị thành một hình bè ra — mất đúng thứ phải đọc
    ra. Cùng công thức ở `placeStar()` phía TS; ca test so lại từng ngôi."""
    for c in CONS:
        bx, by, bw, bh = c["box"]
        k = min(bw / LOCAL["width"], bh / LOCAL["height"])
        ox = bx + (bw - LOCAL["width"] * k) / 2
        oy = by + (bh - LOCAL["height"] * k) / 2
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


def horizon_amt(y):
    """Quầng chân trời: chỉ ở `SKY_HORIZON.height` px dưới cùng của KHUNG."""
    top = H - HORIZON["height"]
    return smoothstep((y - top) / HORIZON["height"]) if y > top else 0.0


# ═══════════════════════════════════════════════════════════════════════
# 6 · marching squares + Douglas–Peucker
# ═══════════════════════════════════════════════════════════════════════


def contours(fn, level, x0, y0, x1, y1, cell):
    """Đường đồng mức của một trường vô hướng. Quy trình giống MapMage: sinh
    trường bằng Python → lấy đường đồng mức → xuất path. KHÔNG raster, KHÔNG
    bộ lọc: đặc tả §9.1 cấm gửi một `feTurbulence` nào xuống trình duyệt, và
    bằng chứng ở đó mạnh bất thường (WebKit không tăng tốc bộ lọc SVG bằng
    GPU, bug 287982 còn mở)."""
    nx = int((x1 - x0) / cell) + 1
    ny = int((y1 - y0) / cell) + 1
    val = [[fn(x0 + i * cell, y0 + j * cell) for j in range(ny)] for i in range(nx)]

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
    net = net_chom_segs()
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
        for a, b in c["lines"]:
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


def ve_net_chom(ink, P, focus):
    """Bảy nét cho bảy ngôi. Nối theo HÌNH, không theo đường ngắn nhất: luật
    của H. A. Rey (1952) — nét nối tồn tại để LÀM RA MỘT HÌNH NHẬN RA ĐƯỢC.
    Cây khung ngắn nhất cho ra một mớ gạch, đúng thứ cần tránh.

    Trần 12 nét cho một chòm (§4.1): trên mức đó hình bắt đầu không nhớ được.
    M1 dùng 7 — script tự chặn ở dưới nếu ai thêm quá trần."""
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
    op = hover if focus else nghi
    hue_of = {c["key"]: P["hues"][c["hue"]] for c in CONS}
    key_of = {}
    for c in CONS:
        for a, b in c["lines"]:
            key_of[(a, b)] = c["key"]
    segs = net_chom_segs()
    i = 0
    for c in CONS:
        for _ab in c["lines"]:
            a, b = segs[i]
            i += 1
            # Độ dày KHÔNG đổi khi hover: đổi kích thước là "chuyển động" theo
            # định nghĩa hẹp của WCAG, nên nó phải bỏ dưới `reduce`. Hai tấm
            # ảnh chỉ khác nhau ở ĐỘ MỜ ⇒ bản này an toàn với `reduce` ngay từ
            # lúc sinh, không cần một tấm thứ ba.
            ink.poly("net-chom", wobble_line(a[0], a[1], b[0], b[1], LINK["wobble"]),
                     hue_of[c["key"]], P["scale"]["line"], op)


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
        # Bán kính × `scale.star` — bảng §19.3: 1,00 ở bản tối, 1,08 ở bản sáng
        # (chấm mực cần to hơn một chút để cùng đọc ra bằng ngần ấy bậc).
        r = round(r0 * P["scale"]["star"], 2)
        halo_r = r * t["haloScale"]
        base_op = t["haloOpacity"] + (MAG["haloFocusBoost"] if focus else 0.0)
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
        ink.circle("sao-bai", x, y, r, hue)
        # Lõi trắng không phải trang trí: sao thật cháy trắng ở tâm và chỉ ánh
        # màu ở rìa. Nó cũng là thứ giữ cho tám sắc khoáng không biến 48 ngôi
        # thành 48 chấm kẹo. Trắng tuyệt đối (`profile.core`) CHỈ được dùng ở
        # đúng chỗ này trong cả bản đồ — nhờ thế nó thành một giá trị MANG NGHĨA.
        # `core: null` ⇒ KHÔNG vẽ lõi (bản sáng, §18.3). Một khoá `null` thay
        # cho một nhánh `if profile == 'light'`: nhánh `if` theo TÊN hồ sơ là
        # đúng chỗ hai bản trôi xa nhau mà không ai thấy (§19.1).
        if P["core"]:
            ink.circle("loi-sao", x, y, r * MAG["coreScale"], P["core"],
                       MAG["coreOpacity"])


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


def nhan_vi_pham(c, g, P):
    """Lý do một chỗ đặt KHÔNG dùng được, hoặc `None`. Bộ điều kiện §8.4 nằm
    đúng MỘT chỗ, nên lượt tìm và lượt kiểm không thể nghĩ khác nhau."""
    box, pad = g["box"], LBL["boxPad"]
    if (box[0] - pad < VX0 or box[2] + pad > VX1
            or box[1] - pad < VY0 or box[3] + pad > VY1):
        return "hộp chữ (nở %g) tràn khỏi khung" % pad
    net = net_chom_segs()
    if any(seg_cross(g["p0"], g["p1"], a, b) or seg_cross(g["p1"], g["p2"], a, b)
           for a, b in net):
        return "đường dẫn cắt qua một nét chòm"
    sp = LBL["starPad"]
    for s in STARS:
        if box[0] - sp <= s[1] <= box[2] + sp and box[1] - sp <= s[2] <= box[3] + sp:
            return "hộp chữ đè lên ngôi %s (nở %g)" % (s[0], sp)
    for key, hull in HULLS:
        if box_hits_hull(box, inflate_hull(hull, LBL["hullPad"])):
            return "hộp chữ giao bao lồi chòm %s (nở %g)" % (key, LBL["hullPad"])
    if box_sang_qua(box, P):
        return "độ chói trung bình trong hộp chữ vượt trần %s" % P["textCeiling"]
    return None


def nhan_box(c, P):
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
    ly_do = nhan_vi_pham(c, g, P)
    if ly_do:
        raise SystemExit(
            "CHỖ ĐẶT NHÃN ĐÃ ĐÓNG BĂNG KHÔNG CÒN DÙNG ĐƯỢC — chòm %s, neo %s, "
            "đoạn %g, hướng %+d%+d: %s.\nĐặc tả §8.4 nói build phải TRƯỢT ở đây "
            "chứ không đẩy một bản đồ có chữ chồng ra cho mắt người soi. Chạy "
            "`--place-nhan` để tìm lại rồi cập nhật SKY_LABEL_PLACED."
            % (c["key"], rec["anchor"], rec["leg"], rec["dir"][0], rec["dir"][1], ly_do))
    return g


def tim_nhan(c, P):
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
    for anchor in ranked[:2]:
        _code, ax, ay, _ar, _t, _k = anchor
        leg = LBL["legMin"]
        while leg <= LBL["legHardMax"]:
            # Bốn hướng ứng viên: trên-trái, trên-phải, dưới-trái, dưới-phải.
            for sx in (1, -1):
                for sy in (-1, 1):
                    g = nhan_hinh_hoc(c, anchor, leg, sx, sy)
                    ly_do = nhan_vi_pham(c, g, P)
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


def do_sang(x, y, P) -> float:
    """Độ chói ƯỚC TÍNH của bức tại một điểm, dựng lại từ CHÍNH các trường mà
    các lớp dùng. Đặc tả §3.1 nói script phải TỰ ĐO được điều này từ thứ nó
    vừa sinh, nên đây là một điều kiện build kiểm được, không phải một lời dặn.
    (Ở bản raster thì đo thẳng trên điểm ảnh; bản này là SVG nên phải tính lại
    từ trường — cùng hàm, cùng con số.)"""
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
    return luminance(col)


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


def ve_nhan(ink, P, focus):
    """Hai tầng nhãn là quy ước THẬT của bản đồ sao, không phải một thoả hiệp
    hiện đại: Bayer in ký hiệu ngắn trên bản khắc và bảng dữ liệu đầy đủ ở bên
    cạnh — bản khắc không bao giờ cõng cả tên đầy đủ. Nên: tên chòm + một dòng
    phụ trên bản đồ, MÃ BÀI lúc hover, tên bài đầy đủ ở chú giải."""
    out = []
    for c in CONS:
        g = nhan_box(c, P)
        p0, p1, p2, box = g["p0"], g["p1"], g["p2"], g["box"]
        name, sub, wn = g["name"], g["sub"], g["wn"]
        hue = P["hues"][c["hue"]]
        lop = LBL["leaderFocusOpacity"] if focus else LBL["leaderOpacity"]
        ink.poly("nhan", [p0, p1, p2], hue, LBL["ruleWidth"], lop)
        rule_x0 = box[0]
        ink.poly("nhan", [(rule_x0, p2[1]), (rule_x0 + wn + LBL["rulePad"], p2[1])],
                 hue, LBL["ruleWidth"], lop)
        ink.text("nhan", rule_x0, p2[1] - LBL["baselineLift"], name, P["text"],
                 LBL["nameSize"], LBL["nameWeight"], LBL["fontStack"])
        ink.text("nhan", rule_x0, p2[1] + LBL["sublineGap"], sub,
                 P["text"] if focus else P["textSub"],
                 LBL["subSize"], LBL["subWeight"], LBL["fontStack"],
                 tracking=LBL["subTracking"])
        out.append((c["key"], box))
        if focus:
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

ARIA = ""


def build(P, focus: bool):
    """Hai tấm cho cùng một bức: NGHỈ và HOVER.

    Vì sao hai tấm chứ không một SVG nội tuyến đổi độ mờ: tranh vào trang bằng
    `<img>` nên nó bị cách ly — CSS của trang không với vào trong được. Lớp
    hover là HTML chồng lên, và nó chỉ đổi `opacity` giữa hai tấm. Giá phải
    trả là một tấm nữa (~vài chục KB); cái được là KHÔNG một `id` nào trong
    SVG, tức không một byte chết nào tải ở mỗi lượt vào trang.

    Và hai tấm KHÁC NHAU CHỈ Ở ĐỘ MỜ: không bán kính nào to lên, không nét nào
    dày lên. Theo định nghĩa hẹp của WCAG, đổi màu/độ mờ KHÔNG tính là hoạt
    ảnh chuyển động, còn đổi kích thước thì TÍNH — nên bản này an toàn với
    `prefers-reduced-motion` ngay từ lúc sinh, không cần một tấm thứ ba."""
    global ARIA
    ARIA = ("Bầu trời của chặng %s: %d ngôi sao, mỗi ngôi là một bài — %s."
            % (CONS[0]["key"], len(STARS),
               ", ".join(s[0] for s in STARS)))
    ink = Ink()
    # `dim`: khi một chòm được trỏ vào, MỌI THỨ CÒN LẠI mờ đi. Tách hình khỏi
    # nền bằng TƯƠNG PHẢN, không bằng chuyển động (§10 hiệu ứng 3). Hệ số lấy
    # từ HỒ SƠ (`scale.skyDim`), không viết ở đây.
    dim = P["scale"]["skyDim"] if focus else 1.0
    ve_nen(ink, P, dim)
    ve_bui_xa(ink, P, dim)
    ve_tinh_van(ink, P, dim)
    ve_khe_bui(ink, P, dim)
    ve_soi_sang(ink, P, dim)
    ve_quang_chan_troi(ink, P, dim)
    ve_truong_sao(ink, P, dim)
    ve_luoi(ink, P, dim)
    ve_net_chom(ink, P, focus)
    ve_sao(ink, P, focus)
    boxes = ve_nhan(ink, P, focus)
    return ink, boxes


def vung_bam(boxes):
    """Vùng bấm = bao lồi của chòm nở `SKY_HIT.hullPad` CỘNG hộp nhãn (§10):
    bấm vào nhãn cũng là mở chặng. Không phải một ô chia hết bầu trời — đặc tả
    chọn quy ước Bayer (§4.4), nên khoảng tối giữa hai chòm không thuộc về ai."""
    out = {}
    for key, hull in HULLS:
        pad = HIT["hullPad"]
        x0 = min(p[0] for p in hull) - pad
        x1 = max(p[0] for p in hull) + pad
        y0 = min(p[1] for p in hull) - pad
        y1 = max(p[1] for p in hull) + pad
        for k, b in boxes:
            if k != key:
                continue
            x0, y0 = min(x0, b[0]), min(y0, b[1])
            x1, y1 = max(x1, b[2]), max(y1, b[3])
        out[key] = (x0, y0, x1, y1)
    return out


def main():
    ap = argparse.ArgumentParser(description="Sinh bản đồ sao (SVG) — mẫu chòm M1")
    ap.add_argument("--profile", default="dark",
                    help="tên profile màu trong star-map.ts (dark | light)")
    ap.add_argument("--out", default=None, help="thư mục xuất (mặc định public/map/star)")
    ap.add_argument("--stats", action="store_true", help="in bảng đếm nét từng lớp")
    ap.add_argument("--css", action="store_true",
                    help="in khối .hit* để chép vào star-map.module.css")
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

    dat_sao()
    kiem_tran_chom(P)

    if args.place_nhan:
        # Bộ máy §8.4–§8.5 chạy MỘT LẦN, kết quả đóng băng vào TS rồi cả hai
        # hồ sơ đọc CÙNG một chỗ (§19.2 dòng 4).
        print("export const SKY_LABEL_PLACED = [")
        for c in CONS:
            g = tim_nhan(c, P)
            print("  { key: '%s', anchor: '%s', dir: [%d, %d], leg: %g },"
                  % (c["key"], g["code"], g["sx"], g["sy"], g["leg"]))
        print("] as const;")
        return

    out_dir = Path(args.out) if args.out else OUT
    # `os.makedirs` chứ không `Path.mkdir`: trên Windows + Python 3.14,
    # `mkdir(exist_ok=True)` vẫn ném WinError 183 với một thư mục đã có.
    os.makedirs(out_dir, exist_ok=True)

    rows = []
    hit = None
    for focus in (False, True):
        ink, boxes = build(P, focus)
        svg = ink.render()
        for xau in ("Gradient", "gradient", "<filter", "feTurbulence"):
            if xau in svg:
                raise SystemExit(
                    "sinh ra `%s` — tinh vân phải làm bằng đường đồng mức và "
                    "quầng sao bằng vòng đồng tâm. Một ngoại lệ là một cái lỗ "
                    "để đúng cái lỗi 'mảng phẳng tô gradient' quay lại." % xau)
        p = out_dir / ("m1-%s.svg" % ("focus" if focus else "rest"))
        p.write_text(svg, encoding="utf-8")
        kb = len(svg.encode("utf-8")) / 1024
        rows.append((p.name, ink.n, kb))
        if not focus:
            hit = vung_bam(boxes)
            if args.stats:
                print()
                for lop in LAYERS:
                    b = ink.buckets[lop]
                    n = sum(len(v) for v in b.values())
                    if n:
                        print("  %-18s %6d nét  %3d nhóm" % (lop, n, len(b)))
                print()

    if args.css:
        for key, (x0, y0, x1, y1) in hit.items():
            print(".hit%s {" % key)
            print("  left: %.3f%%;" % ((x0 - VX0) / VIEW["width"] * 100))
            print("  top: %.3f%%;" % ((y0 - VY0) / VIEW["height"] * 100))
            print("  width: %.3f%%;" % ((x1 - x0) / VIEW["width"] * 100))
            print("  height: %.3f%%;" % ((y1 - y0) / VIEW["height"] * 100))
            print("}")
        return

    for n, strokes, kb in rows:
        print("%-16s %6d nét %8.1f KB" % (n, strokes, kb))
    over = ["%s %.0f KB" % (n, kb) for n, _s, kb in rows if kb > MAX_KB]
    if over:
        raise SystemExit("vượt trần %d KB — hạ DENSITY hoặc nới NEB['cell']: %s"
                         % (MAX_KB, ", ".join(over)))


if __name__ == "__main__":
    main()
