#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SINH BẢN ĐỒ THẾ GIỚI của trang chủ — "Công trình cắt dọc", tám gian.

    py scripts/map/build_map.py            # sinh lại 9 tệp SVG
    py scripts/map/build_map.py --stats    # thêm bảng đếm nét từng lớp

Ra:
    frontend/public/map/world-map.svg      bản rộng 1360 × 820
    frontend/public/map/scene-M1..M8.svg   ô crop cho bản hẹp (điện thoại)

── VÌ SAO LÀ SCRIPT, KHÔNG PHẢI VÀI CHỤC `<path>` VIẾT TAY ────────────────
Hai bản đồ tham chiếu (bản đồ Vực Thẳm của *Made in Abyss*, bản đồ Runeterra)
không phải hình tô mảng phẳng: chúng là TRANH NÉT — hàng nghìn nét mực, màu chỉ
là lớp phủ bên dưới. Hai bản bản đồ trước của repo này bị bác đúng vì chỗ đó:
tô mảng bằng gradient rồi để trống. Mật độ như tranh vẽ tay KHÔNG viết tay
được; nó phải sinh ra bằng hàm toán có nhiễu. Nên:

  · mọi sắc độ làm bằng MẬT ĐỘ NÉT, không bằng gradient (script này không sinh
    `<linearGradient>`/`<radialGradient>` nào, và `world-map.test.mjs` canh);
  · mỗi nét đi qua `seg_d()` nên nó hơi cong và hơi lệch — nét thẳng tuyệt đối
    là thứ tố cáo máy vẽ ngay từ xa;
  · nét gộp theo NHÓM THUỘC TÍNH: mỗi nhóm (màu · độ dày · độ mờ · nét đứt)
    thành MỘT `<path>` mang nhiều đoạn `M…L…`. Khoảng 25 byte/nét thay vì ~90,
    đó là lý do 15 nghìn nét vẫn nằm dưới trần 900 KB.

── MỘT NGUỒN SỰ THẬT ─────────────────────────────────────────────────────
Script ĐỌC `frontend/src/lib/world-map.ts` để lấy `MAP_PALETTE`,
`REGION_LAYOUT`, `MAP_FLOWS`, `MAP_WELLS`, `MAP_SUN`, `MAP_FRAME`. Không một
mã màu, một toạ độ vùng hay một cạnh phụ thuộc nào được viết lại ở đây. Hệ quả
kiểm được: ca test so từng mã màu trong SVG sinh ra với bảng trong TS, và so
tập `data-flow` của tranh với `MAP_FLOWS`. Đổi dữ liệu ở TS rồi chạy lại script
là đổi cả bức vẽ; sửa tranh mà quên dữ liệu thì đỏ.

── KỸ THUẬT RÚT TỪ HAI BẢN THAM CHIẾU (rút KỸ THUẬT, không rút tài sản) ───
  hachure      nét chạy XUÔI DỐC, dày và sát nhau ở chỗ dốc, thưa ở chỗ thoải
               (luật Lehmann). Dùng cho vách đá, sườn núi xa, mép gian khoét.
  contour      đường bình độ / vỉa tầng — nét dài bám theo hình đất, khoảng
               cách giữa hai đường là tín hiệu độ dốc và độ sâu.
  stipple      chấm lấm tấm, mật độ = sắc độ; chấm phải LỆCH LƯỚI (nhiễu) chứ
               không xếp hàng, không thì ra hoa văn vải.
  cross-hatch  hai–ba lượt nét chéo khác góc cho bóng đổ.
  engraved sky trời là trường nét ngang đứt quãng; chỗ sáng KHÔNG tô sáng mà
               BỚT NÉT đi — đó là cách thợ khắc đồng làm quầng sáng, và là lý
               do ở đây không cần gradient nào cả.
  echo lines   nét sóng chạy song song mép nước, thưa dần ra xa bờ.
  vignette     mép giấy tối lại bằng nét ngắn dày dần, không bằng bóng mờ.

Chi tiết nguồn tham khảo: `design/v3/ky-thuat-ban-do.md`.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TS = ROOT / "frontend" / "src" / "lib" / "world-map.ts"
OUT = ROOT / "frontend" / "public" / "map"

# Một con số duy nhất để hạ/nâng mật độ cả bức. Trần 900 KB trong AGENTS.md là
# ràng buộc thật, nên khi thêm chi tiết thì hạ số này chứ đừng bỏ kỹ thuật.
DENSITY = 1.0


# ═══════════════════════════════════════════════════════════════════════
# 0 · đọc dữ liệu từ world-map.ts
# ═══════════════════════════════════════════════════════════════════════

def _obj(block: str):
    """Khối literal của TS → dữ liệu Python. Đủ cho các khối ở world-map.ts:
    khoá là định danh, chuỗi nháy đơn, có dấu phẩy thừa cuối."""
    s = re.sub(r"/\*[\s\S]*?\*/", " ", block)
    s = re.sub(r"//[^\n]*", " ", s)
    s = re.sub(r"([{,]\s*)([A-Za-z_$][\w$]*)\s*:", r'\1"\2":', s)
    s = s.replace("'", '"')
    s = re.sub(r",(\s*[}\]])", r"\1", s)
    return json.loads(s)


def read_ts():
    src = TS.read_text(encoding="utf-8")

    def grab(name, open_ch, close_ch):
        m = re.search(r"export const %s[^=]*=\s*" % name, src)
        if not m:
            raise SystemExit("world-map.ts thiếu %s" % name)
        i = m.end()
        depth = 0
        for j in range(i, len(src)):
            if src[j] == open_ch:
                depth += 1
            elif src[j] == close_ch:
                depth -= 1
                if depth == 0:
                    return _obj(src[i:j + 1])
        raise SystemExit("không đóng được khối %s" % name)

    return {
        "palette": grab("MAP_PALETTE", "{", "}"),
        "layout": grab("REGION_LAYOUT", "[", "]"),
        "flows": grab("MAP_FLOWS", "[", "]"),
        "wells": grab("MAP_WELLS", "[", "]"),
        "sun": grab("MAP_SUN", "{", "}"),
        "frame": grab("MAP_FRAME", "{", "}"),
    }


DATA = read_ts()
P = DATA["palette"]
LAYOUT = DATA["layout"]
FLOWS = DATA["flows"]
WELLS = DATA["wells"]
SUN = DATA["sun"]
W = DATA["frame"]["width"]
H = DATA["frame"]["height"]
BOX = {r["key"]: r["box"] for r in LAYOUT}
PLATE = {r["key"]: r["plate"] for r in LAYOUT}


# ═══════════════════════════════════════════════════════════════════════
# 1 · nhiễu + hình học
# ═══════════════════════════════════════════════════════════════════════

class Noise:
    """Nhiễu giá trị 2D nội suy mượt + fbm. Tất định theo hạt giống: chạy lại
    script phải ra ĐÚNG tệp cũ, không thì mỗi lần build là một diff 400 KB."""

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

    def fbm(self, x: float, y: float, octaves: int = 4) -> float:
        amp, freq, acc, norm = 1.0, 1.0, 0.0, 0.0
        for _ in range(octaves):
            acc += amp * self.v(x * freq, y * freq)
            norm += amp
            amp *= 0.5
            freq *= 2.0
        return acc / norm


NZ = Noise(0x5EED)
RN = Noise(0xC0FFEE)


def rnd(k: float, j: float = 0.0) -> float:
    """Số giả ngẫu nhiên 0..1 tất định theo khoá — thay cho random.random() để
    thêm một nét ở giữa file không làm xê dịch mọi nét sau nó."""
    return RN.h(int(k * 7919) & 0xFFFF, int(j * 104729) & 0xFFFF)


def nf(v: float) -> str:
    """Toạ độ làm tròn về SỐ NGUYÊN của khung 1360 × 820.

    Không phải để cho gọn mã: ở đây nó là ràng buộc kích thước. Một nét tốn
    thêm 4–6 byte cho phần thập phân, nhân với mấy chục nghìn nét là hơn 200 KB
    — mà sai số lớn nhất là nửa đơn vị khung, tức ~0,4 px trên màn. Với nét
    mảnh 0,4 px thì mắt không thấy, mà nó còn thêm một chút run tay."""
    s = "%.0f" % v
    return "0" if s == "-0" else s


def ln(x1, y1, x2, y2) -> str:
    """Lệnh TƯƠNG ĐỐI (`l`) cho đoạn thứ hai: toạ độ lệch luôn ngắn hơn toạ độ
    tuyệt đối, và trong một bức toàn nét ngắn thì đó là 20% dung lượng."""
    return "M%s %sl%s %s" % (nf(x1), nf(y1), nf(x2 - x1), nf(y2 - y1))


def dot(x, y) -> str:
    """Chấm = đoạn cực ngắn với đầu nét tròn. Rẻ hơn `<circle>` khoảng ba lần
    và gộp được vào cùng một `<path>` với các nét khác cùng nhóm."""
    return "M%s %sh.1" % (nf(x), nf(y))


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


def seg_d(x1, y1, x2, y2, amp=0.55) -> str:
    """Một nét "vẽ tay": cong nhẹ, độ cong lớn nhất ở giữa nét."""
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy)
    # Nét NGẮN vẽ thẳng. Không phải vì tiếc chỗ: một nét hachure dài 7 đơn vị
    # thì khúc cong của nó nhỏ hơn bề rộng ngòi, nên 5 điểm giữa chỉ tốn byte.
    # Run tay chỉ thấy được trên nét DÀI — đường bờ, vỉa đá, sợi khung cửi.
    if L < 13 or amp <= 0:
        return ln(x1, y1, x2, y2)
    k = max(2, min(7, int(L / 11)))
    nx, ny = -dy / L, dx / L
    pts = []
    for i in range(k + 1):
        t = i / k
        w = (NZ.v(x1 * 0.09 + t * 4.3, y1 * 0.09 + t * 2.1) - 0.5) * 2 * amp
        w *= math.sin(math.pi * t)
        pts.append((x1 + dx * t + nx * w, y1 + dy * t + ny * w))
    return pl(pts)


def wobble(pts, amp=1.2, seed=0.0):
    out = []
    for i, (x, y) in enumerate(pts):
        a = (NZ.v(x * 0.05 + seed, y * 0.05) - 0.5) * 2 * amp
        b = (NZ.v(y * 0.05 + seed + 11, x * 0.05) - 0.5) * 2 * amp
        out.append((x + a, y + b))
    return out


def rough_ring(cx, cy, r, amp=2.4, n=48, seed=0.0, squash=1.0):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r + (NZ.v(math.cos(a) * 2.3 + seed, math.sin(a) * 2.3 + seed) - 0.5) * 2 * amp
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr * squash))
    return pts


def lerp(a, b, t):
    return a + (b - a) * t


def cubic(p0, p1, p2, p3, t):
    u = 1 - t
    return (u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3)


def parse_cubic(d: str):
    """`M x y C x1 y1 x2 y2 x3 y3` → danh sách điểm trên đường cong. Chỉ đủ cho
    dạng mà MAP_FLOWS dùng; gặp dạng khác thì phải mở rộng ở đây, đừng vẽ tay."""
    nums = [float(v) for v in re.findall(r"-?\d+(?:\.\d+)?", d)]
    if len(nums) != 8:
        raise SystemExit("MAP_FLOWS.d không phải một đoạn cubic: %s" % d)
    x0, y0, x1, y1, x2, y2, x3, y3 = nums
    return [(cubic(x0, x1, x2, x3, i / 60), cubic(y0, y1, y2, y3, i / 60)) for i in range(61)]


def parse_poly(d: str):
    """`M x y L x y L …` → danh sách điểm (MAP_WELLS)."""
    return [(float(a), float(b)) for a, b in re.findall(r"[ML]\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)", d)]


def resample(pts, step=4.0):
    """Lấy lại mẫu polyline theo chiều dài cung — để rải nét đều dọc đường."""
    out = [pts[0]]
    acc = 0.0
    for i in range(1, len(pts)):
        (ax, ay), (bx, by) = pts[i - 1], pts[i]
        seg = math.hypot(bx - ax, by - ay)
        if seg <= 0:
            continue
        t = 0.0
        while acc + (seg - t) >= step:
            t += step - acc
            acc = 0.0
            out.append((lerp(ax, bx, t / seg), lerp(ay, by, t / seg)))
        acc += seg - t
    return out


def normals(pts):
    out = []
    for i in range(len(pts)):
        a = pts[max(0, i - 1)]
        b = pts[min(len(pts) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1.0
        out.append((-dy / L, dx / L))
    return out


# ═══════════════════════════════════════════════════════════════════════
# 2 · bút mực: gộp nét theo nhóm thuộc tính
# ═══════════════════════════════════════════════════════════════════════

class Ink:
    def __init__(self):
        self.layers = []
        self.defs = []
        self.clip = None
        self.n = 0
        self.layer("nen")

    def layer(self, name: str, flow: str | None = None):
        """Mở một lớp mới. Nét chỉ gộp TRONG một lớp — gộp xuyên lớp thì thứ tự
        chồng vỡ (vân đá vẽ sau lại chui xuống dưới gian vẽ trước).

        `flow` gắn `data-flow="M5-M6"` lên nhóm: đó là chỗ ca test đếm lại ba
        mạch phụ thuộc trong CHÍNH bức tranh, không chỉ trong dữ liệu."""
        self.cur = {}
        self.layers.append((name, self.cur, flow))

    def _add(self, key, d):
        self.cur.setdefault(key, []).append(d)
        self.n += 1

    # Độ dày và độ mờ ĐƯỢC LÀM TRÒN VỀ BẬC. Hai lý do, lý do sau mới là chính:
    #  · mỗi giá trị khác nhau là một `<path>` riêng với đủ bộ thuộc tính (~70
    #    byte); để độ mờ chạy liên tục thì một lớp đẻ ra 240 nhóm;
    #  · và bản khắc thật cũng chỉ có vài bậc nét — Lehmann đúng 8 bậc độ dày.
    #    Thang rời rạc giữ cho sắc độ đọc ra thành LỚP, không thành bùn.
    STEP_W = 0.05
    STEP_OP = 0.05

    def stroke(self, d, color, w=0.6, op=1.0, cap="round", dash=None):
        w = max(self.STEP_W, round(w / self.STEP_W) * self.STEP_W)
        op = max(self.STEP_OP, min(1.0, round(op / self.STEP_OP) * self.STEP_OP))
        self._add(("s", color, round(w, 2), round(op, 2), cap, dash, self.clip), d)

    def fill(self, d, color, op=1.0):
        op = max(self.STEP_OP, min(1.0, round(op / self.STEP_OP) * self.STEP_OP))
        self._add(("f", color, round(op, 2), self.clip), d)

    def line(self, x1, y1, x2, y2, color, w=0.6, op=1.0, amp=0.55, cap="round", dash=None):
        self.stroke(seg_d(x1, y1, x2, y2, amp), color, w, op, cap, dash)

    def poly(self, pts, color, w=0.6, op=1.0, close=False, cap="round", dash=None):
        self.stroke(pl(pts, close), color, w, op, cap, dash)

    def dots(self, pts, color, size=0.9, op=1.0):
        for x, y in pts:
            self.stroke(dot(x, y), color, size, op, "round")

    def clip_rect(self, x, y, w, h, name):
        self.defs.append(
            '<clipPath id="%s"><rect x="%s" y="%s" width="%s" height="%s"/></clipPath>'
            % (name, nf(x), nf(y), nf(w), nf(h))
        )

    def clip_circle(self, cx, cy, r, name):
        self.defs.append(
            '<clipPath id="%s"><circle cx="%s" cy="%s" r="%s"/></clipPath>'
            % (name, nf(cx), nf(cy), nf(r))
        )

    def render(self, vx, vy, vw, vh) -> str:
        out = [
            "<!-- SINH BỞI scripts/map/build_map.py — ĐỪNG SỬA TAY. "
            "Sửa dữ liệu ở frontend/src/lib/world-map.ts rồi chạy lại script. -->",
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s" '
            'width="%s" height="%s" aria-hidden="true" role="presentation">'
            % (nf(vx), nf(vy), nf(vw), nf(vh), nf(vw), nf(vh)),
        ]
        if self.defs:
            out.append("<defs>%s</defs>" % "".join(self.defs))
        for name, buckets, flow in self.layers:
            if not buckets:
                continue
            out.append('<g data-lop="%s"%s>'
                       % (name, ' data-flow="%s"' % flow if flow else ""))
            for key, ds in buckets.items():
                d = "".join(ds)
                if key[0] == "s":
                    _, color, w, op, cap, dash, clip = key
                    # ĐỘ DÀY KHÔNG ĐI QUA `nf()`. `nf` làm tròn về số nguyên của
                    # khung 1360 × 820 — đúng cho TOẠ ĐỘ, chết người cho bề
                    # rộng nét: cả bức từng render với `stroke-width="0"`, tức
                    # năm chục nghìn nét vô hình, và nhìn ra đúng cái lỗi "tô
                    # mảng phẳng" mà bản này sinh ra để chữa.
                    a = ['fill="none"', 'stroke="%s"' % color,
                         'stroke-width="%s"' % ("%g" % round(w, 2))]
                    if op < 1:
                        a.append('stroke-opacity="%s"' % ("%g" % op))
                    if cap != "butt":
                        a.append('stroke-linecap="%s"' % cap)
                        a.append('stroke-linejoin="round"')
                    if dash:
                        a.append('stroke-dasharray="%s"' % dash)
                    if clip:
                        a.append('clip-path="url(#%s)"' % clip)
                else:
                    _, color, op, clip = key
                    a = ['fill="%s"' % color]
                    if op < 1:
                        a.append('fill-opacity="%s"' % ("%g" % op))
                    if clip:
                        a.append('clip-path="url(#%s)"' % clip)
                out.append("<path %s d=\"%s\"/>" % (" ".join(a), d))
            out.append("</g>")
        out.append("</svg>")
        return "\n".join(out)


# ═══════════════════════════════════════════════════════════════════════
# 3 · địa tầng: bốn dải, mép lượn
# ═══════════════════════════════════════════════════════════════════════

def horizon(x):
    """Mặt đất KHÔNG PHẢI MỘT ĐƯỜNG KẺ. Bản trước để biên độ 8 đơn vị nên nó
    thành cái thước, và cả bức lập tức ra "sơ đồ mặt cắt" chứ không ra bản đồ.
    Ba octave, biên độ 34: có gò, có trũng, và các gian đứng trên chỗ cao thấp
    khác nhau."""
    return 238 - NZ.fbm(x * 0.0035, 3.1, 3) ** 1.3 * 34


def y_shallow(x):
    return 390 - NZ.fbm(x * 0.0026, 9.4, 3) * 40


def y_deep(x):
    return 528 - NZ.fbm(x * 0.0023, 17.7, 3) * 40


def y_floor(x):
    return 710 - NZ.fbm(x * 0.0021, 23.3, 3) * 34


BANDS = [
    ("surface", horizon, y_shallow),
    ("shallow", y_shallow, y_deep),
    ("deep", y_deep, y_floor),
    ("floor", y_floor, lambda x: H + 40),
]


def band_at(y, x=680.0):
    if y < horizon(x):
        return "sky"
    for name, top, bot in BANDS:
        if y < bot(x):
            return name
    return "floor"


def band_fill(ink, top_fn, bot_fn, color, x0=0.0, x1=None, op=1.0):
    x1 = W if x1 is None else x1
    xs = [x0 + i * (x1 - x0) / 48 for i in range(49)]
    pts = [(x, top_fn(x)) for x in xs] + [(x, bot_fn(x)) for x in reversed(xs)]
    ink.fill(pl(pts, True), color, op)


# ═══════════════════════════════════════════════════════════════════════
# 4 · trường nét dùng chung
# ═══════════════════════════════════════════════════════════════════════

def hatch_rect(ink, x0, y0, x1, y1, color, angle=55.0, spacing=3.2, w=0.45,
               op=0.5, length=7.0, tone=None, jitter=1.0, amp=0.4):
    """Trường nét chéo trong một hình chữ nhật. `tone(x, y) -> 0..1` là xác
    suất đặt nét: đó là chỗ MẬT ĐỘ thay cho sắc độ — không có gradient nào.

    Góc mặc định tránh 45° và tránh số tròn (rough.js chốt −41° sau nhiều lần
    chỉnh): góc tròn trùng lưới điểm ảnh và trùng lượt nét thứ hai, ra moiré.
    Tâm mỗi nét còn được xê dịch trong khoảng ±nửa bước lưới — đủ phá hình
    chiếc lược, mà không đủ để hai nét đổi chỗ cho nhau."""
    ca, sa = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    diag = math.hypot(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    steps = int(diag / spacing * DENSITY)
    per = max(1, int(diag / (length * 1.6)))
    k = 0
    for i in range(-steps // 2, steps // 2 + 1):
        off = i * spacing
        bx, by = cx - sa * off, cy + ca * off
        phase = (rnd(i * 9.1, 2.3) - 0.5) * spacing      # lệch pha từng hàng
        for j in range(-per // 2, per // 2 + 1):
            t = j * length * 1.55 + (rnd(i * 3.7, j * 1.9) - 0.5) * length * jitter
            px, py = bx + ca * (t + phase), by + sa * (t + phase)
            if not (x0 <= px <= x1 and y0 <= py <= y1):
                continue
            if tone is not None and rnd(px * 1.3, py * 2.7) > tone(px, py):
                continue
            # Dài 0,85–1,20 lần bước lưới: "nét sát nhau nhưng hiếm khi chạm
            # nhau" — tiêu chí của Magyari-Sáska khi sinh hachure cho bản in.
            L = length * (0.85 + 0.35 * rnd(px * 0.7, py * 1.1))
            ink.line(px, py, px + ca * L, py + sa * L, color, w, op, amp)
            k += 1
    return k


def stipple_rect(ink, x0, y0, x1, y1, color, count, op=0.55, size=0.9,
                 tone=None, size_jitter=0.6):
    """Chấm lấm tấm. Ba luật, đều đo được, đều từ Deussen & al. (2000):

     · Sắc độ do MẬT ĐỘ, cỡ chấm chỉ là điều chỉnh phụ — và biên độ cỡ chấm
       của người vẽ tay đo được là ĐÚNG HAI LẦN (chấm to nhất gấp đôi chấm nhỏ
       nhất). Vượt quá là ra hạt sạn, không ra sắc độ.
     · Phân bố phải là "nhiễu xanh": không ngẫu nhiên thuần (vón cục) và không
       lưới (ra hoa văn vải). Ở đây lấy lưới thô rồi đẩy mỗi chấm — rẻ hơn
       Lloyd/Voronoi nhiều và đủ cho cỡ hiển thị này.
     · Biên độ đẩy co lại theo MẬT ĐỘ: chỗ tối (chấm dày) đẩy ít, chỗ sáng đẩy
       nhiều. Không có luật này thì vùng tối vón thành từng mảng loang."""
    count = max(1, int(count * DENSITY))
    size_jitter = min(1.0, size_jitter)   # trần "gấp đôi" nói ở trên
    cols = max(1, int(math.sqrt(count * (x1 - x0) / max(1.0, y1 - y0))))
    rows = max(1, count // cols)
    for i in range(cols):
        for j in range(rows):
            u, v = (i + 0.5) / cols, (j + 0.5) / rows
            px0 = x0 + (x1 - x0) * u
            py0 = y0 + (y1 - y0) * v
            k = 1.9 * (0.45 + 0.55 * (1 - (tone(px0, py0) if tone else 0.5)))
            px = px0 + (rnd(i * 2.1, j * 5.3) - 0.5) * (x1 - x0) / cols * k
            py = py0 + (rnd(i * 7.7, j * 3.1) - 0.5) * (y1 - y0) / rows * k
            if not (x0 <= px <= x1 and y0 <= py <= y1):
                continue
            if tone is not None and rnd(px * 2.9, py * 1.7) > tone(px, py):
                continue
            s = size * (1 + size_jitter * rnd(px * 1.9, py * 0.9))
            ink.stroke(dot(px, py), color, s, op, "round")


def ridge_hachure(ink, pts, color, side=1, spacing=3.0, length=9.0, w=0.45,
                  op=0.6, slope_gain=1.0):
    """Hachure Lehmann/Imhof dọc một đường sống.

    Ba luật lấy đúng từ tài liệu, và cả ba đều NGƯỢC với trực giác:
     · DỐC thì nét NGẮN và ĐẬM, THOẢI thì nét DÀI và MẢNH (luật 3 + 4 của Imhof:
       độ dài nét = khoảng cách giữa hai đường bình độ tại chỗ đó, mà chỗ dốc
       thì hai đường bình độ sát nhau). Vẽ ngược lại là ra lông nhím.
     · Độ dày đi theo BẬC RỜI RẠC (Lehmann có 8 bậc), không phải thang liên tục.
     · Dưới một độ dốc tối thiểu thì KHÔNG VẼ GÌ — đất thoải để trắng.
    Và ngưỡng bỏ nét được cho NHIỄU (mewo2: `|s| ≥ runif(0.1, 0.4)`): nhờ thế
    mép của trường hachure lỗ chỗ như tay đặt, không phải một đường cắt thẳng.
    """
    sm = resample(pts, spacing)
    nm = normals(sm)
    for i, ((x, y), (nx, ny)) in enumerate(zip(sm, nm)):
        if i == 0 or i == len(sm) - 1:
            continue
        ax, ay = sm[i - 1]
        bx, by = sm[i + 1]
        slope = abs(by - ay) / (abs(bx - ax) + 0.001) * slope_gain
        if slope < 0.09 + 0.26 * rnd(x * 3.1, y * 0.7):
            continue
        cls = min(8, 1 + int(slope * 5))           # 8 bậc độ dày của Lehmann
        ww = w * (0.75 + cls * 0.09)
        # Dài ở chỗ thoải, ngắn ở chỗ dốc; biên độ 0,85–1,20 lần bước lưới.
        L = length / (0.55 + slope) * (0.85 + 0.35 * rnd(x * 1.7, y * 2.3))
        L = max(spacing, min(length * 1.8, L))
        ink.line(x, y, x + nx * L * side, y + ny * L * side, color, ww, op, 0.35)


def contour_field(ink, top_fn, bot_fn, color, step=14.0, x0=0.0, x1=None,
                  w=0.45, op=0.4, dash=None, warp=1.0):
    """Đường bình độ / vỉa tầng: nội suy giữa mép trên và mép dưới của dải, cộng
    nhiễu — nên các vỉa KHÔNG song song đều, chúng dày lên chỗ này mỏng đi chỗ
    kia đúng như đá thật."""
    x1 = W if x1 is None else x1
    n = max(2, int((bot_fn((x0 + x1) / 2) - top_fn((x0 + x1) / 2)) / step))
    for i in range(1, n):
        t = i / n
        pts = []
        for j in range(int((x1 - x0) / 11) + 1):
            x = x0 + j * 11
            y = lerp(top_fn(x), bot_fn(x), t)
            y += (NZ.fbm(x * 0.012, t * 9 + 40) - 0.5) * 13 * warp
            pts.append((x, y))
        ink.poly(pts, color, w, op * (0.6 + 0.6 * rnd(i * 4.4)), dash=dash)


def crack_field(ink, x0, y0, x1, y1, color, count=26, w=0.5, op=0.5, span=70.0):
    """Khe nứt: một nét gãy khúc, thỉnh thoảng rẽ nhánh. Rẽ nhánh mới là thứ
    làm nó ra ĐÁ; nét gãy khúc đơn lẻ nhìn như vết xước."""
    count = max(1, int(count * DENSITY))
    for i in range(count):
        x = lerp(x0, x1, rnd(i * 1.7, 3.3))
        y = lerp(y0, y1, rnd(i * 5.1, 9.9))
        a = rnd(i * 2.2, 1.1) * math.pi * 2
        pts = [(x, y)]
        for k in range(6):
            a += (rnd(i * 3.3, k * 1.7) - 0.5) * 1.1
            d = span / 6 * (0.5 + rnd(i, k))
            x += math.cos(a) * d
            y += math.sin(a) * d
            pts.append((x, y))
        ink.poly(pts, color, w, op)
        if rnd(i * 8.1) > 0.45:
            bx, by = pts[2 + int(rnd(i * 1.3) * 2)]
            ba = a + (rnd(i * 4.7) - 0.5) * 2.2
            bp = [(bx, by)]
            for k in range(3):
                ba += (rnd(i * 2.9, k) - 0.5) * 0.9
                bx += math.cos(ba) * span / 7
                by += math.sin(ba) * span / 7
                bp.append((bx, by))
            ink.poly(bp, color, w * 0.7, op * 0.8)


# ═══════════════════════════════════════════════════════════════════════
# 5 · giấy, trời, mây, núi xa
# ═══════════════════════════════════════════════════════════════════════

def draw_paper(ink, x0, y0, x1, y1):
    """Vân giấy cũ. Ba thứ, mỗi thứ chữa một triệu chứng của "nền phẳng":
    đốm nhỏ (foxing) cho bề mặt, vết ố lớn cho chỗ đậm nhạt, và viền tối bằng
    nét ngắn dày dần ở mép — KHÔNG bằng bóng mờ."""
    ink.fill("M%s %sH%sV%sH%sZ" % (nf(x0), nf(y0), nf(x1), nf(y1), nf(x0)), P["paper"])
    stipple_rect(ink, x0, y0, x1, y1, P["ink"]["pale"], 1500, op=0.17, size=0.75,
                 tone=lambda x, y: 0.25 + 0.75 * NZ.fbm(x * 0.02, y * 0.02))
    for i in range(int(34 * DENSITY)):
        cx = lerp(x0, x1, rnd(i * 1.3, 7.7))
        cy = lerp(y0, y1, rnd(i * 9.1, 2.2))
        r = 16 + 46 * rnd(i * 3.3)
        ink.fill(pl(rough_ring(cx, cy, r, r * 0.3, 26, i * 1.7, 0.72), True),
                 P["ink"]["wash"], 0.055)
    # Viền tối: mật độ nét tăng theo khoảng cách tới mép gần nhất.
    for side in range(4):
        for i in range(int(190 * DENSITY)):
            t = i / (190 * DENSITY)
            depth = 46 * (0.25 + 0.75 * rnd(i * 2.7, side))
            if side == 0:
                px, py = lerp(x0, x1, t), y0 + depth * rnd(i, side)
                dx, dy = 0, -1
            elif side == 1:
                px, py = lerp(x0, x1, t), y1 - depth * rnd(i, side)
                dx, dy = 0, 1
            elif side == 2:
                px, py = x0 + depth * rnd(i, side), lerp(y0, y1, t)
                dx, dy = -1, 0
            else:
                px, py = x1 - depth * rnd(i, side), lerp(y0, y1, t)
                dx, dy = 1, 0
            L = 5 + 9 * rnd(i * 5.5, side)
            ink.line(px, py, px + dx * L, py + dy * L, P["ink"]["soft"], 0.5, 0.2)


def draw_sky(ink, x0, y0, x1, y1):
    """Trời khắc: trường nét ngang đứt quãng. Quầng mặt trời làm bằng cách BỚT
    NÉT quanh nó (xác suất đặt nét tỉ lệ với khoảng cách tới mặt trời), đúng
    cách thợ khắc đồng làm ánh sáng — nên ở đây không cần gradient nào."""
    sx, sy = SUN["cx"], SUN["cy"]
    y = y0 + 3
    while y < y1:
        x = x0
        while x < x1:
            seg = 9 + 20 * rnd(x * 0.3, y * 0.7)
            d = math.hypot(x - sx, y - sy)
            tone = min(1.0, max(0.0, (d - 95) / 300.0))
            tone *= 0.35 + 0.65 * NZ.fbm(x * 0.006, y * 0.02 + 5)
            if rnd(x * 1.7, y * 2.9) < tone:
                ink.line(x, y, x + seg, y + (rnd(x, y) - 0.5) * 1.2,
                         P["ink"]["pale"], 0.42, 0.34 + 0.3 * tone, 0.3)
            x += seg + 4 + 8 * rnd(x * 0.9, y * 1.3)
        y += 3.4 / DENSITY
    # Tia và vòng quầng: nét, không phải mảng.
    for i in range(int(72 * DENSITY)):
        a = 2 * math.pi * i / (72 * DENSITY)
        r0 = 34 + 10 * rnd(i * 2.3)
        r1 = r0 + 70 + 190 * rnd(i * 1.7)
        ink.line(sx + math.cos(a) * r0, sy + math.sin(a) * r0,
                 sx + math.cos(a) * r1, sy + math.sin(a) * r1,
                 P["light"]["ray"], 0.8, 0.5, 0.6)
    for i in range(22):
        r = 30 + i * 8.5
        ink.poly(rough_ring(sx, sy, r, 1.8 + i * 0.22, 40, i * 3.1),
                 P["light"]["halo"], 0.7, 0.55 - i * 0.02, close=True)
    ink.poly(rough_ring(sx, sy, 24, 1.1, 36, 2.2), P["light"]["sun"], 1.4, 0.95, close=True)
    for i in range(26):
        r = 3 + i * 0.85
        ink.poly(rough_ring(sx, sy, r, 0.6, 24, i * 1.3), P["light"]["sun"], 0.8, 0.5, close=True)


def draw_clouds(ink, x0, y0, x1, y1):
    """Mây: đường viền vỏ sò + nét chéo chồng ở mặt dưới (nguồn sáng trên trái)
    + chấm ở thân. Không mảng trắng nào."""
    seeds = [(300, 58, 86), (520, 40, 64), (760, 72, 96), (1010, 48, 70),
             (1230, 82, 78), (880, 150, 54), (170, 160, 46), (1150, 170, 50)]
    for n, (cx, cy, r) in enumerate(seeds):
        if cx + r < x0 or cx - r > x1 or cy + r < y0 or cy - r > y1:
            continue
        lobes = []
        for i in range(6):
            u = i / 5
            lx = cx + (u - 0.5) * r * 2.1
            ly = cy - math.sin(u * math.pi) * r * 0.42 + (rnd(n, i) - 0.5) * r * 0.2
            lr = r * (0.3 + 0.28 * math.sin(u * math.pi)) * (0.8 + 0.4 * rnd(n * 2.1, i))
            lobes.append((lx, ly, lr))
        for lx, ly, lr in lobes:
            ink.poly(rough_ring(lx, ly, lr, lr * 0.14, 26, lx * 0.01), P["ink"]["soft"], 0.55, 0.5, close=True)
            ink.fill(pl(rough_ring(lx, ly, lr * 0.96, lr * 0.1, 22, lx * 0.02), True), P["light"]["halo"], 0.5)
        for lx, ly, lr in lobes:
            for k in range(int(lr * 0.9 * DENSITY)):
                t = k / max(1, lr * 0.9)
                ax = lx - lr * 0.85 + t * lr * 1.7
                ay = ly + math.sqrt(max(0.0, lr * lr - (ax - lx) ** 2)) * 0.82
                L = 3 + 7 * rnd(k * 1.3, lx)
                ink.line(ax, ay - L, ax + L * 0.5, ay, P["ink"]["pale"], 0.4, 0.42, 0.3)
            stipple_rect(ink, lx - lr, ly - lr * 0.8, lx + lr, ly + lr * 0.8,
                         P["ink"]["wash"], int(lr * 2.4), op=0.3, size=0.75)


def draw_far_ranges(ink, x0, x1):
    """Ba dãy núi xa. Dãy càng xa thì nét càng NHẠT và càng THƯA — mật độ nét
    chính là phối cảnh không khí, không phải lớp mờ."""
    for layer, (base, amp, op, sp) in enumerate(
            [(206, 44, 0.3, 4.6), (218, 32, 0.42, 3.8), (228, 22, 0.55, 3.1)]):
        pts = []
        x = x0 - 20
        while x <= x1 + 20:
            n = NZ.fbm(x * 0.0055 + layer * 13, layer * 7.3, 5)
            ridge = base - (n ** 1.4) * amp * 2.1
            pts.append((x, ridge))
            x += 7
        poly = pts + [(x1 + 20, 260), (x0 - 20, 260)]
        ink.fill(pl(poly, True), P["rock"]["veil"], 0.5 + layer * 0.16)
        ink.poly(pts, P["ink"]["soft"], 0.55 + layer * 0.12, op + 0.2)
        # Nguồn sáng ở trên-trái ⇒ sườn đổ về bên PHẢI là sườn tối.
        shade = [p for i, p in enumerate(pts) if i and pts[i][1] > pts[i - 1][1]]
        if len(shade) > 3:
            ridge_hachure(ink, pts, P["ink"]["soft"], 1, sp / DENSITY,
                          7 + layer * 3, 0.4, op, slope_gain=1.4)


def draw_surface(ink, x0, x1):
    """Mặt đất: vạch đất đậm, lớp mùn chấm dày, rễ cây, và rừng cây bằng chấm."""
    xs = [x0 + i * (x1 - x0) / 160 for i in range(161)]
    line = [(x, horizon(x)) for x in xs]
    ink.poly(line, P["ink"]["deep"], 2.1, 0.92)
    ink.poly([(x, horizon(x) + 2.6) for x in xs], P["ink"]["mid"], 0.8, 0.45)
    # Hachure xuôi dốc ngay dưới mặt đất: chỗ sườn dốc mới có nét, chỗ bằng để
    # trắng. Đó là thứ cho người xem đọc ra gò và trũng mà không cần bóng đổ.
    ridge_hachure(ink, line, P["rock"]["crack"], 1, 3.0 / DENSITY, 15, 0.5, 0.65, 2.6)
    stipple_rect(ink, x0, 200, x1, 300, P["rock"]["crack"], 1200, op=0.6, size=0.95,
                 tone=lambda x, y: max(0.0, min(1.0, 1.05 - (y - horizon(x)) / 70)))
    for i in range(int((x1 - x0) / 3.4 * DENSITY)):
        x = x0 + i * 3.4 / DENSITY + rnd(i) * 2
        y = horizon(x)
        L = 5 + 16 * rnd(i * 2.3)
        a = math.pi / 2 + (rnd(i * 1.9) - 0.5) * 1.3
        ink.line(x, y, x + math.cos(a) * L, y + math.sin(a) * L, P["rock"]["crack"], 0.45, 0.42)
    # Rừng: mỗi cây là một cụm chấm + hai nét thân. Cây xa (trái/phải) nhỏ hơn.
    occupied = [(BOX[k][0], BOX[k][0] + BOX[k][2]) for k in ("M1", "M2", "M3")]
    i = 0
    x = x0 + 4
    while x < x1:
        step = 7 + 11 * rnd(i * 3.1)
        if not any(a - 6 < x < b + 6 for a, b in occupied):
            r = 4 + 5 * rnd(i * 1.7)
            ty = horizon(x) - 2
            for k in range(int((6 + r * 1.6) * DENSITY)):
                a = rnd(i, k) * math.pi * 2
                rr = r * math.sqrt(rnd(i * 2.2, k))
                ink.stroke(dot(x + math.cos(a) * rr, ty - r * 0.9 + math.sin(a) * rr * 0.8),
                           P["ink"]["mid"], 0.85, 0.5)
            ink.line(x, ty, x, ty - r * 0.7, P["ink"]["mid"], 0.55, 0.6, 0.2)
            if rnd(i * 4.4) > 0.6:
                ink.poly([(x - r, ty - r * 0.3), (x, ty - r * 2.1), (x + r, ty - r * 0.3)],
                         P["ink"]["soft"], 0.5, 0.5)
        x += step
        i += 1


def draw_underground(ink, x0, x1):
    """Ba dải đá. Mật độ nét TĂNG theo độ sâu (đúng như bản mặt cắt tham chiếu),
    nhưng quanh hồ ở đáy thì GIẢM lại — đó là cách vẽ "đáy sáng lại" bằng nét."""
    lake_cx, lake_cy = BOX["M8"][0] + BOX["M8"][2] / 2, 772

    def lake_glow(x, y):
        d = math.hypot((x - lake_cx) * 0.62, y - lake_cy)
        return min(1.0, max(0.0, (d - 120) / 190))

    # `dark` là NÉT CHÍNH, `light` là lượt phụ. Trên dải sáng thì nét chính là
    # mực nâu đậm; xuống dải tối thì ĐẢO LẠI — nét chính thành màn đá nhạt, vì
    # mực đậm trên đá tối thì biến mất. Bản trước giữ nguyên mực nâu cho cả bốn
    # dải nên hai dải dưới mất sạch kết cấu.
    for name, top, bot, dark, light, dens in [
        ("surface", horizon, y_shallow, P["rock"]["crack"], P["rock"]["shade"], 1.0),
        ("shallow", y_shallow, y_deep, P["rock"]["shade"], P["ink"]["deep"], 1.25),
        ("deep", y_deep, y_floor, P["rock"]["veil"], P["rock"]["grain"], 1.5),
        ("floor", y_floor, lambda x: H + 30, P["rock"]["veil"], P["rock"]["grain"], 1.7),
    ]:
        ink.layer("da-" + name)
        contour_field(ink, top, bot, light, 13 / dens, x0, x1, 0.5, 0.45)
        contour_field(ink, top, bot, dark, 26 / dens, x0, x1, 0.8, 0.75, warp=1.6)
        ytop, ybot = top(680), bot(680)

        def tone(x, y, name=name):
            t = 0.45 + 0.55 * NZ.fbm(x * 0.009, y * 0.016 + 3)
            if name == "floor":
                t *= 0.3 + 0.7 * lake_glow(x, y)
            return t

        # Ba lượt nét, góc lệch nhau và KHÔNG phải số tròn. Độ mờ ở đây cố tình
        # cao hơn bản trước gấp đôi: bản trước để 0,26–0,3 nên 28 nghìn nét đá
        # biến mất hết, bản đồ lại thành ba dải màu phẳng — đúng lỗi bị chê.
        hatch_rect(ink, x0, max(0, ytop - 4), x1, ybot + 4, dark,
                   angle=-41 if name != "deep" else 49,
                   spacing=4.2 / dens, w=0.45, op=0.8, length=7.5, tone=tone)
        hatch_rect(ink, x0, max(0, ytop - 4), x1, ybot + 4, light,
                   angle=34, spacing=7.0 / dens, w=0.42, op=0.5, length=6.0, tone=tone)
        stipple_rect(ink, x0, ytop, x1, ybot, dark, int(620 * dens), op=0.75, size=0.9,
                     tone=tone)
        crack_field(ink, x0, ytop, x1, ybot, dark, int(13 * dens), 0.6, 0.6, 85)
        # Thấu kính đá: mảng vỉa hình thoi nằm xen trong tầng — thứ làm địa tầng
        # ra địa tầng chứ không ra bánh ga-tô nhiều lớp.
        for i in range(int(7 * dens * DENSITY)):
            lx = lerp(x0, x1, rnd(i * 2.7, ord(name[0])))
            ly = lerp(ytop + 12, ybot - 12, rnd(i * 5.9, 3.3))
            lw, lh = 30 + 70 * rnd(i * 1.3), 5 + 9 * rnd(i * 4.1)
            lens = rough_ring(lx, ly, lw / 2, lw * 0.05, 26, i * 3.3, lh / (lw / 2))
            ink.poly(lens, dark, 0.7, 0.6, close=True)
            hatch_rect(ink, lx - lw / 2, ly - lh, lx + lw / 2, ly + lh, dark,
                       angle=4, spacing=1.8, w=0.4, op=0.45, length=lw * 0.3)
        ink.poly([(x, top(x)) for x in [x0 + i * (x1 - x0) / 60 for i in range(61)]],
                 P["ink"]["deep"], 1.3, 0.55)


# ═══════════════════════════════════════════════════════════════════════
# 6 · khung gian: khoét đá, viền, bóng
# ═══════════════════════════════════════════════════════════════════════

def vault(ink, key, pad=10.0):
    """KHOÉT MỘT GIAN XÂY trong đá — không phải một cái bọt.

    Bản trước vẽ gian bằng một hình bầu dục méo, và đó chính là chỗ bị chê "trẻ
    con": một đường cong khép kín không nói được gì ngoài "có cái gì ở đây".
    Thứ kể ra được "công trình của nhà triết học tự nhiên" là KIẾN TRÚC: vết
    đào trong đá, rồi bên trong là vòm cuốn có viên đá múi, hai trụ tường xây
    đá tảng, nền lát, và bóng đổ theo đúng một nguồn sáng.

    Trả về `(rx0, rx1, floor, spring)` để nội dung của gian đứng lên nền thật.
    """
    x, y, w, h = BOX[key]
    c = P[key.lower()]
    # Gian XÂY nằm gọn trong vết đào, chừa đá ra bốn phía: nhịp vòm hẹp hơn ô
    # và đỉnh vòm cao hơn nửa nhịp ⇒ nó đọc ra là CUỐN, không phải mái vòm tôn.
    rx0, rx1 = x + w * 0.2, x + w - w * 0.2
    floor = y + h - pad * 1.5
    spring = y + h * 0.56
    apex = y + h * 0.16
    cxm = (rx0 + rx1) / 2

    # 1 · vết đào: ĐÁ VỠ, không phải bong bóng. Ít đỉnh và lệch mạnh ⇒ cạnh
    # thẳng, góc gãy — hình của chỗ bị đục ra. Bản trước lấy 76 đỉnh lệch nhẹ
    # nên ra đúng một hình bầu dục méo, và đó là chỗ bị chê "trẻ con".
    cut = []
    n = 22
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 1 + (NZ.fbm(math.cos(a) * 2.4 + ord(key[-1]) * 1.7,
                        math.sin(a) * 2.4) - 0.5) * 0.52
        cut.append((cxm + math.cos(a) * (w / 2 - pad * 0.3) * k,
                    (y + h / 2) + math.sin(a) * (h / 2 - pad * 0.3) * k))
    band = band_at(y + h / 2, cxm)
    room = P["room"]["lit"] if band == "shallow" else (
        P["room"]["dark"] if band == "floor" else P["room"]["dim"])
    ink.fill(pl(cut, True), room)
    ink.poly(cut, P["ink"]["deep"], 1.6, 0.85, close=True)
    nm = normals(cut)
    for (px, py), (nx, ny) in zip(cut, nm):
        shade = max(0.0, (nx + ny) / 2 + 0.3)
        L = 5 + 20 * shade
        ink.line(px, py, px + nx * L, py + ny * L, P["ink"]["deep"], 0.45,
                 0.25 + 0.45 * shade, 0.3)

    # 2 · vòm cuốn: nửa ellipse + viên đá múi toả về tâm.
    arc = []
    for i in range(49):
        a = math.pi * i / 48
        arc.append((cxm - math.cos(a) * (rx1 - rx0) / 2,
                    spring - math.sin(a) * (spring - apex)))
    ink.fill(pl(arc + [(rx1, floor), (rx0, floor)], True), room)
    ink.poly(arc, c["edge"], 1.7, 0.95)
    for i in range(0, 49, 2):
        px, py = arc[i]
        dx, dy = px - cxm, (py - spring) * 1.5
        L = math.hypot(dx, dy) or 1
        ink.line(px, py, px - dx / L * 9, py - dy / L * 9, c["edge"], 0.55, 0.6, 0.15)
    # Bóng ở mặt trong vòm, nặng về phía phải (nguồn sáng trên-trái).
    for k in range(1, 5):
        sh = [(cxm - math.cos(math.pi * i / 48) * ((rx1 - rx0) / 2 - k * 2.6),
               spring - math.sin(math.pi * i / 48) * ((spring - apex) - k * 2.2))
              for i in range(0, 49)]
        ink.poly([p for i, p in enumerate(sh) if i > 20], P["ink"]["deep"], 0.45, 0.3)

    # 3 · hai trụ tường xây đá tảng + nền lát.
    for side, px in ((-1, rx0), (1, rx1)):
        ink.line(px, spring, px, floor, c["edge"], 1.5, 0.9, 0.2)
        rows = int((floor - spring) / 9)
        for r in range(rows + 1):
            yy = spring + r * (floor - spring) / max(1, rows)
            ink.line(px, yy, px - side * 13, yy, c["edge"], 0.5, 0.55, 0.2)
        shade_face(ink, px - 13 if side > 0 else px, spring, 13, floor - spring,
                   P["ink"]["deep"], 0.26 if side < 0 else 0.42)
    ink.line(rx0 - 6, floor, rx1 + 6, floor, P["ink"]["deep"], 1.7, 0.9, 0.2)
    tiles = int((rx1 - rx0) / 22)
    for i in range(tiles + 1):
        xx = rx0 + i * (rx1 - rx0) / max(1, tiles)
        ink.line(xx, floor, xx - 4, floor + 5, P["ink"]["deep"], 0.5, 0.5, 0.1)
    ink.line(rx0 - 6, floor + 5, rx1 + 6, floor + 5, P["ink"]["deep"], 0.7, 0.5, 0.2)
    return rx0, rx1, floor, spring


def glow_rings(ink, cx, cy, r, color, rings=9, op=0.42):
    for i in range(rings):
        rr = r * (0.35 + i * 0.75 / rings)
        ink.poly(rough_ring(cx, cy, rr, 1.3 + i * 0.3, 34, i * 2.7 + cx * 0.01),
                 color, 0.6, op * (1 - i / (rings + 1)), close=True)


def brick(ink, x, y, w, h, color, ink_c, rows=10, per=9, op=0.85):
    """Hàng gạch/đá xây: mạch ngang liền, mạch đứng so le, cộng một lượt nét
    chéo cho mặt tường bắt sáng. Hàng trăm nét ngắn — và chính kiểu nét này làm
    một khối hộp trở thành một BỨC TƯỜNG thay vì một mảng màu.

    Độ mờ mặc định 0,85 chứ không phải 0,5: ở bản trước mạch gạch mờ tới mức
    tường M1 hiện ra đúng như một hình chữ nhật cam."""
    rh = h / rows
    for r in range(rows + 1):
        yy = y + r * rh
        ink.line(x, yy, x + w, yy, ink_c, 0.5, op, 0.35)
        if r == rows:
            break
        off = (r % 2) * (w / per / 2)
        for c in range(per + 1):
            xx = x + off + c * w / per
            if x <= xx <= x + w:
                ink.line(xx, yy + 0.6, xx, yy + rh - 0.6, ink_c, 0.45, op * 0.8, 0.2)
        # Mỗi hàng vài viên được gạch chéo — đá xây thật không đều màu.
        for c in range(per):
            if rnd(r * 3.1, c * 1.7) > 0.72:
                xx = x + off + c * w / per
                hatch_rect(ink, xx, yy + 1, min(x + w, xx + w / per) - 0.5,
                           yy + rh - 1, color, -41, 1.7, 0.4, 0.55, w / per)
    ink.stroke("M%s %sH%sV%sH%sZ" % (nf(x), nf(y), nf(x + w), nf(y + h), nf(x)), ink_c, 1.4, 0.95)


def shade_face(ink, x, y, w, h, color, op=0.3, spacing=2.6):
    """Bóng đổ ba lượt {a, a+90, a+45}, mỗi lượt lệch thêm vài độ và lệch pha —
    ba lượt đúng góc tròn thì chỗ giao nhau xếp thành lưới và ra moiré."""
    for k, (da, sp, ww) in enumerate(((0, 1.0, 0.42), (90, 1.7, 0.38), (45, 2.5, 0.34))):
        hatch_rect(ink, x, y, x + w, y + h, color,
                   angle=-41 + da + (rnd(k * 3.7, x) - 0.5) * 9,
                   spacing=spacing * sp, w=ww, op=op * (1 - k * 0.22),
                   length=min(h, 9 - k))


# ═══════════════════════════════════════════════════════════════════════
# 7 · tám gian
# ═══════════════════════════════════════════════════════════════════════

def scene_M1(ink):
    """LÒ ĐÚC — tiến trình và subprocess. Một gian chính, hai ống khói, và hai
    lán con nối bằng ống đồng: tiến trình cha sinh tiến trình con."""
    x, y, w, h = BOX["M1"]
    c = P["m1"]
    gy = horizon(x + w / 2)
    hall_x, hall_w = x + 128, 176
    hall_y, hall_h = gy - 86, 86
    ink.fill("M%s %sH%sV%sH%sZ" % (nf(hall_x), nf(hall_y), nf(hall_x + hall_w),
                                   nf(hall_y + hall_h), nf(hall_x)), c["wash"], 0.55)
    brick(ink, hall_x, hall_y, hall_w, hall_h, c["edge"], c["ink"], 12, 11, 0.55)
    shade_face(ink, hall_x + hall_w * 0.6, hall_y, hall_w * 0.4, hall_h, c["ink"], 0.28)
    # Mái: hàng ngói bằng cung ngắn.
    apex = (hall_x + hall_w / 2, hall_y - 46)
    roof = [(hall_x - 14, hall_y), apex, (hall_x + hall_w + 14, hall_y)]
    ink.fill(pl(roof, True), c["edge"], 0.9)
    ink.poly(roof, c["ink"], 1.8, 0.95, close=True)
    # Ngói: từng hàng cung ngắn, hàng sau so le nửa viên.
    for r in range(13):
        t = r / 13
        lx = lerp(hall_x - 14, apex[0], t)
        ly = lerp(hall_y, apex[1], t)
        rx = lerp(hall_x + hall_w + 14, apex[0], t)
        ink.line(lx, ly, rx, ly, c["glow"], 0.45, 0.4, 0.3)
        n = int(max(3, (rx - lx) / 8))
        off = (r % 2) * 0.5
        for i in range(n):
            tx = lerp(lx, rx, (i + off) / n)
            if tx < lx:
                continue
            ink.line(tx, ly, tx, ly + 4.6, c["glow"], 0.4, 0.35, 0.2)
    # Sườn mái bên phải là sườn tối.
    hatch_rect(ink, apex[0], hall_y - 46, hall_x + hall_w + 14, hall_y, c["ink"],
               -41, 2.2, 0.4, 0.4, 9)
    # Cửa lò: vòm + tia sáng (nét, không mảng).
    fx, fy = hall_x + 30, hall_y + hall_h
    ink.poly([(fx - 15, fy), (fx - 15, fy - 26), (fx, fy - 38), (fx + 15, fy - 26), (fx + 15, fy)],
             c["ink"], 1.5, 0.95, close=True)
    ink.fill(pl([(fx - 13, fy), (fx - 13, fy - 25), (fx, fy - 35), (fx + 13, fy - 25), (fx + 13, fy)], True),
             c["glow"], 0.8)
    for i in range(int(34 * DENSITY)):
        a = math.pi * (0.1 + 0.8 * rnd(i * 1.3))
        L = 10 + 34 * rnd(i * 2.9)
        ink.line(fx, fy - 18, fx - math.cos(a) * L, fy - 18 - math.sin(a) * L,
                 P["light"]["glow"], 0.55, 0.5, 0.5)
    for i in range(3):
        ink.poly(rough_ring(fx, fy - 18, 16 + i * 7, 1.6, 26, i), c["glow"], 0.6, 0.4 - i * 0.1, close=True)
    # Hai ống khói + khói cuộn.
    for n, (sx0, sh) in enumerate([(hall_x + 26, 56), (hall_x + 122, 74)]):
        ink.stroke("M%s %sH%sV%sH%sZ" % (nf(sx0), nf(hall_y - 36 - sh), nf(sx0 + 17),
                                         nf(hall_y - 20), nf(sx0)), c["ink"], 1.3, 0.9)
        brick(ink, sx0, hall_y - 36 - sh, 17, sh + 16, c["edge"], c["ink"], int(sh / 7), 2, 0.5)
        px, py = sx0 + 8, hall_y - 40 - sh
        for k in range(int(9 * DENSITY)):
            rr = 9 + k * 3.4
            px += (rnd(n, k) - 0.5) * 13 - 2
            py -= 9 + 4 * rnd(n * 2.1, k)
            ink.poly(rough_ring(px, py, rr, rr * 0.2, 22, k + n), P["ink"]["pale"], 0.5, 0.4, close=True)
            stipple_rect(ink, px - rr, py - rr, px + rr, py + rr, P["ink"]["wash"],
                         int(rr * 1.5), op=0.28, size=0.8)
    # Ống đồng rẽ nhánh sang hai lán con.
    for n, (sy, by) in enumerate([(hall_y + 24, gy - 34), (hall_y + 52, gy - 8)]):
        px = hall_x + hall_w
        ink.poly([(px, sy), (px + 26, sy), (px + 26, by), (px + 62, by)], c["edge"], 4.2, 0.9)
        ink.poly([(px, sy), (px + 26, sy), (px + 26, by), (px + 62, by)], c["ink"], 0.6, 0.6)
        for k in range(6):
            t = (k + 0.5) / 6
            fxx = px + 26 + (0 if t < 0.5 else 0)
            ink.line(px + 4 + k * 4, sy - 3.4, px + 4 + k * 4, sy + 3.4, c["ink"], 0.5, 0.6, 0.2)
        sx1, sy1 = px + 62, by - 22
        ink.fill("M%s %sH%sV%sH%sZ" % (nf(sx1), nf(sy1), nf(sx1 + 34), nf(sy1 + 22), nf(sx1)),
                 c["wash"], 0.5)
        brick(ink, sx1, sy1, 34, 22, c["edge"], c["ink"], 4, 4, 0.5)
        ink.poly([(sx1 - 4, sy1), (sx1 + 17, sy1 - 12), (sx1 + 38, sy1)], c["ink"], 1.2, 0.9)
        shade_face(ink, sx1 + 20, sy1, 14, 22, c["ink"], 0.3)
    # Bóng đổ trên đất, hắt về bên phải.
    hatch_rect(ink, hall_x + hall_w, gy - 4, hall_x + hall_w + 86, gy + 16,
               P["ink"]["mid"], angle=10, spacing=2.4, w=0.42, op=0.3, length=16)


def scene_M2(ink):
    """KHUNG CỬI — đa luồng. Hàng trăm sợi dọc chạy song song; đúng một chỗ hai
    sợi bắt chéo và thắt nút: tranh chấp."""
    x, y, w, h = BOX["M2"]
    c = P["m2"]
    gy = horizon(x + w / 2)
    fx0, fx1 = x + 54, x + w - 54
    top, bot = y + 74, gy - 18
    # Khung gỗ + vân gỗ.
    for px in (fx0, fx1 - 12):
        ink.fill("M%s %sH%sV%sH%sZ" % (nf(px), nf(top - 14), nf(px + 12), nf(bot + 16), nf(px)),
                 c["wash"], 0.6)
        ink.stroke("M%s %sH%sV%sH%sZ" % (nf(px), nf(top - 14), nf(px + 12), nf(bot + 16), nf(px)),
                   c["edge"], 1.3, 0.9)
        for k in range(int(26 * DENSITY)):
            yy = lerp(top - 14, bot + 16, k / (26 * DENSITY))
            ink.line(px + 1.5, yy, px + 10.5, yy + 2 + 4 * rnd(k, px), c["ink"], 0.4, 0.4, 0.5)
    for yy, hgt in ((top - 14, 12), (bot + 4, 12)):
        ink.fill("M%s %sH%sV%sH%sZ" % (nf(fx0), nf(yy), nf(fx1), nf(yy + hgt), nf(fx0)), c["wash"], 0.6)
        ink.stroke("M%s %sH%sV%sH%sZ" % (nf(fx0), nf(yy), nf(fx1), nf(yy + hgt), nf(fx0)), c["edge"], 1.2, 0.9)
        for k in range(int((fx1 - fx0) / 7 * DENSITY)):
            xx = fx0 + k * 7 / DENSITY
            ink.line(xx, yy + 2, xx + 5, yy + hgt - 2, c["ink"], 0.38, 0.35, 0.4)
    # Sợi dọc.
    n = int(78 * DENSITY)
    cross = n // 2
    for i in range(n):
        xx = lerp(fx0 + 8, fx1 - 8, i / (n - 1))
        if i in (cross, cross + 1):
            continue
        pts = [(xx + (NZ.v(i * 0.7, t * 3.1) - 0.5) * 1.8,
                lerp(top, bot, t / 8)) for t in range(9)]
        ink.poly(pts, c["edge"] if i % 3 else c["ink"], 0.55, 0.55 + 0.35 * rnd(i))
    xa = lerp(fx0 + 8, fx1 - 8, cross / (n - 1))
    xb = lerp(fx0 + 8, fx1 - 8, (cross + 1) / (n - 1))
    mid = (top + bot) / 2
    ink.poly([(xa, top), (xa, mid - 16), (xb + 9, mid), (xa, mid + 16), (xa, bot)], c["ink"], 0.9, 0.9)
    ink.poly([(xb, top), (xb, mid - 16), (xa - 9, mid), (xb, mid + 16), (xb, bot)], c["ink"], 0.9, 0.9)
    ink.poly(rough_ring((xa + xb) / 2, mid, 7.5, 1.1, 24, 3.3), c["ink"], 1.4, 0.95, close=True)
    glow_rings(ink, (xa + xb) / 2, mid, 20, c["glow"], 5, 0.5)
    # Go (thanh ngang) + ống suốt.
    for k, yy in enumerate((top + 24, top + 54, top + 84)):
        ink.line(fx0 + 4, yy, fx1 - 4, yy, c["edge"], 2.0, 0.85, 0.3)
        for i in range(int((fx1 - fx0) / 11 * DENSITY)):
            xx = fx0 + 6 + i * 11 / DENSITY
            ink.line(xx, yy - 3.5, xx, yy + 3.5, c["ink"], 0.4, 0.5, 0.15)
    sx, sy = fx1 + 14, bot - 10
    ink.poly(rough_ring(sx, sy, 15, 0.9, 28, 1.4, 1.25), c["edge"], 1.3, 0.9, close=True)
    for i in range(int(22 * DENSITY)):
        t = i / (22 * DENSITY)
        ink.poly([(sx - 13 + t * 26, sy - 17), (sx - 11 + t * 22, sy), (sx - 13 + t * 26, sy + 17)],
                 c["ink"], 0.45, 0.45)
    hatch_rect(ink, fx0, bot + 16, fx1, gy + 10, P["ink"]["mid"], angle=12,
               spacing=2.8, w=0.4, op=0.26, length=13)


def scene_M3(ink):
    """Ô CỬA QUAN SÁT — GUI. Một mặt tiền kính: lưới ô, mỗi ô một lượt nét chéo
    khác mật độ, vài ô phản chiếu trời."""
    x, y, w, h = BOX["M3"]
    c = P["m3"]
    gy = horizon(x + w / 2)
    bx, bw = x + 62, w - 124
    by, bh = y + 62, gy - (y + 62)
    ink.fill("M%s %sH%sV%sH%sZ" % (nf(bx - 16), nf(by - 16), nf(bx + bw + 16), nf(gy), nf(bx - 16)),
             c["wash"], 0.35)
    brick(ink, bx - 16, by - 16, bw + 32, bh + 16, c["edge"], c["ink"], 13, 13, 0.45)
    # Gờ mái + răng cưa.
    ink.line(bx - 24, by - 20, bx + bw + 24, by - 20, c["ink"], 1.6, 0.9, 0.3)
    for i in range(int(bw / 9 * DENSITY)):
        xx = bx - 20 + i * 9 / DENSITY
        ink.stroke("M%s %sH%sV%sH%sZ" % (nf(xx), nf(by - 20), nf(xx + 5), nf(by - 13), nf(xx)),
                   c["edge"], 0.5, 0.65)
    cols, rows = 6, 5
    pw, ph = bw / cols, bh / rows
    for r in range(rows):
        for q in range(cols):
            px, py = bx + q * pw, by + r * ph
            sky = (r * cols + q) in (0, 2, 3, 7, 9, 14, 16, 22, 25)
            ink.fill("M%s %sH%sV%sH%sZ" % (nf(px + 2), nf(py + 2), nf(px + pw - 2),
                                           nf(py + ph - 2), nf(px + 2)),
                     c["glow"] if sky else c["wash"], 0.55 if sky else 0.4)
            dens = 2.3 if sky else 3.6 + 2.4 * rnd(r * 3.1, q * 1.7)
            hatch_rect(ink, px + 2, py + 2, px + pw - 2, py + ph - 2, c["edge"],
                       angle=32, spacing=dens, w=0.4, op=0.5, length=min(pw, ph) * 0.8)
            if sky:
                hatch_rect(ink, px + 2, py + 2, px + pw - 2, py + ph - 2, c["glow"],
                           angle=32, spacing=dens * 1.4, w=0.5, op=0.6, length=pw * 0.6)
            ink.stroke("M%s %sH%sV%sH%sZ" % (nf(px + 1), nf(py + 1), nf(px + pw - 1),
                                             nf(py + ph - 1), nf(px + 1)), c["ink"], 0.9, 0.8)
    for q in range(cols + 1):
        ink.line(bx + q * pw, by, bx + q * pw, by + bh, c["ink"], 1.5, 0.85, 0.2)
    for r in range(rows + 1):
        ink.line(bx, by + r * ph, bx + bw, by + r * ph, c["ink"], 1.5, 0.85, 0.2)
    # Ban công + con tiện.
    ink.line(bx - 20, by + bh * 0.62, bx + bw + 20, by + bh * 0.62, c["ink"], 2.0, 0.9, 0.2)
    for i in range(int(bw / 10 * DENSITY)):
        xx = bx - 16 + i * 10 / DENSITY
        ink.line(xx, by + bh * 0.62, xx, by + bh * 0.62 + 13, c["edge"], 0.7, 0.7, 0.25)
    ink.line(bx - 20, by + bh * 0.62 + 13, bx + bw + 20, by + bh * 0.62 + 13, c["ink"], 1.3, 0.85, 0.2)
    hatch_rect(ink, bx + bw + 16, gy - 10, bx + bw + 92, gy + 14, P["ink"]["mid"],
               angle=10, spacing=2.6, w=0.42, op=0.28, length=15)


def scene_M4(ink):
    """GIẾNG VÀ MẠCH — nhập dữ liệu, SQL. Nhiều mạch rỉ từ đá vào một bể: dữ
    liệu từ nhiều nguồn chảy về một chỗ."""
    x, y, w, h = BOX["M4"]
    c = P["m4"]
    rx0, rx1, floor_y, spring = vault(ink, "M4", 9)
    cx = x + w / 2
    water_y = y + h - 34
    # Mạch nước rỉ vào bể.
    for i, (sx, sy) in enumerate([(x + 34, y + 10), (x + 92, y + 4), (x + 150, y + 14),
                                  (x + w - 150, y + 6), (x + w - 92, y + 12), (x + w - 34, y + 20)]):
        pts = [(sx, sy)]
        for k in range(1, 9):
            t = k / 8
            px = lerp(sx, cx + (rnd(i) - 0.5) * 70, t) + (NZ.v(i * 2.3, k) - 0.5) * 9
            py = lerp(sy, water_y - 2, t ** 1.2)
            pts.append((px, py))
        for o in range(3):
            ink.poly([(px + (o - 1) * 1.7, py) for px, py in pts], c["edge"], 0.55 - o * 0.1,
                     0.75 - o * 0.2)
        for k in range(int(10 * DENSITY)):
            t = (k + 0.5) / (10 * DENSITY)
            idx = min(len(pts) - 1, int(t * (len(pts) - 1)))
            px, py = pts[idx]
            ink.stroke(dot(px + (rnd(i, k) - 0.5) * 7, py + (rnd(i * 2, k) - 0.5) * 7),
                       c["wash"], 1.1, 0.5)
    # Bể: mặt nước bằng nét sóng ngang thưa dần xuống đáy.
    bx0, bx1 = x + 42, x + w - 42
    ink.fill("M%s %sH%sV%sH%sZ" % (nf(bx0), nf(water_y), nf(bx1), nf(y + h - 6), nf(bx0)),
             c["wash"], 0.55)
    rows = int(18 * DENSITY)
    for r in range(rows):
        yy = water_y + 2 + r * (26 / rows)
        step = 13 + r * 2.4
        xx = bx0 + 3 + (r % 2) * 6
        while xx < bx1 - 6:
            L = step * (0.4 + 0.5 * rnd(r, xx))
            ink.line(xx, yy, xx + L, yy + (rnd(xx, r) - 0.5) * 1.1,
                     c["edge"] if r % 3 else c["glow"], 0.5, 0.65 - r * 0.02, 0.4)
            xx += L + 5 + 7 * rnd(xx * 1.3, r)
        yy += 1
    ink.line(bx0, water_y, bx1, water_y, c["glow"], 1.3, 0.8, 0.5)
    # Thành bể xây đá vòm.
    for sidex in (bx0, bx1):
        s = -1 if sidex == bx0 else 1
        ink.poly([(sidex, y + h - 4), (sidex, water_y - 16), (sidex + s * 10, water_y - 26)],
                 c["ink"], 1.4, 0.85)
    arc = []
    for i in range(27):
        t = i / 26
        arc.append((lerp(bx0, bx1, t), water_y - 26 - math.sin(t * math.pi) * 16))
    ink.poly(arc, c["edge"], 1.5, 0.85)
    for i in range(0, 26, 2):
        ink.line(arc[i][0], arc[i][1], arc[i][0], arc[i][1] + 11, c["ink"], 0.5, 0.6, 0.2)
    glow_rings(ink, (bx0 + bx1) / 2, water_y, 54, c["glow"], 6, 0.3)


def scene_M5(ink):
    """PHÒNG TINH THỂ — NumPy. Tinh thể mọc theo LƯỚI ĐỀU: mảng có hình dạng,
    có trục; đó là cái duy nhất đáng vẽ cho một thư viện mảng."""
    x, y, w, h = BOX["M5"]
    c = P["m5"]
    rx0, rx1, floor_y, spring = vault(ink, "M5", 8)
    cols, rows = 7, 3
    gx0, gy0 = x + 32, y + 36
    gw, gh = w - 64, h - 62
    for i in range(cols + 1):
        ink.line(gx0 + gw * i / cols, gy0 - 8, gx0 + gw * i / cols, gy0 + gh + 10,
                 c["facet"] if "facet" in c else c["glow"], 0.4, 0.3, 0.2, dash="2 4")
    for j in range(rows + 1):
        ink.line(gx0 - 8, gy0 + gh * j / rows, gx0 + gw + 8, gy0 + gh * j / rows,
                 c["glow"], 0.4, 0.3, 0.2, dash="2 4")
    for j in range(rows):
        for i in range(cols):
            cxx = gx0 + gw * (i + 0.5) / cols
            cyy = gy0 + gh * (j + 0.75) / rows
            hgt = 14 + 16 * rnd(i * 3.1, j * 2.7)
            wid = 6 + 4 * rnd(i * 1.7, j * 5.3)
            top = cyy - hgt
            pts = [(cxx - wid, cyy), (cxx - wid, top + 6), (cxx, top),
                   (cxx + wid, top + 6), (cxx + wid, cyy)]
            ink.fill(pl(pts, True), c["wash"], 0.45)
            ink.poly(pts, c["edge"], 1.1, 0.95, close=True)
            ink.line(cxx, top, cxx, cyy, c["glow"], 0.5, 0.75, 0.2)
            ink.line(cxx - wid, top + 6, cxx, top + 11, c["glow"], 0.45, 0.6, 0.2)
            ink.line(cxx + wid, top + 6, cxx, top + 11, c["glow"], 0.45, 0.6, 0.2)
            hatch_rect(ink, cxx, top + 4, cxx + wid, cyy, c["ink"], angle=74,
                       spacing=1.8, w=0.35, op=0.42, length=hgt * 0.6)
            glow_rings(ink, cxx, top + 4, 11, c["glow"], 3, 0.3)
    # Nền và mảnh vỡ.
    ink.line(gx0 - 10, gy0 + gh + 10, gx0 + gw + 10, gy0 + gh + 10, c["edge"], 1.5, 0.85, 0.3)
    for i in range(int(26 * DENSITY)):
        px = lerp(gx0 - 6, gx0 + gw + 6, rnd(i * 1.3))
        py = gy0 + gh + 12 + 10 * rnd(i * 2.9)
        s = 2 + 3 * rnd(i * 5.1)
        ink.poly([(px - s, py), (px, py - s * 1.6), (px + s, py)], c["edge"], 0.6, 0.7, close=True)


def scene_M6(ink):
    """SẢNH SỔ CÁI — pandas. Giá sách xếp HÀNG VÀ CỘT, cột đầu đánh dấu: khung
    dữ liệu có chỉ mục."""
    x, y, w, h = BOX["M6"]
    c = P["m6"]
    rx0, rx1, floor_y, spring = vault(ink, "M6", 8)
    sx0, sy0 = x + 30, y + 26
    sw, sh = w - 92, h - 70
    shelves, slots = 4, 16
    for r in range(shelves):
        yy = sy0 + sh * r / shelves
        rh = sh / shelves - 3
        ink.line(sx0 - 4, yy + rh, sx0 + sw + 4, yy + rh, c["edge"], 1.6, 0.9, 0.25)
        for q in range(slots):
            bx = sx0 + sw * q / slots + 1
            bw = sw / slots - 2
            bh = rh * (0.62 + 0.34 * rnd(r * 2.3, q * 1.9))
            by = yy + rh - bh
            first = q == 0
            ink.fill("M%s %sH%sV%sH%sZ" % (nf(bx), nf(by), nf(bx + bw), nf(by + bh), nf(bx)),
                     c["glow"] if first else c["wash"], 0.6 if first else 0.45)
            ink.stroke("M%s %sH%sV%sH%sZ" % (nf(bx), nf(by), nf(bx + bw), nf(by + bh), nf(bx)),
                       c["ink"] if first else c["edge"], 0.8, 0.85)
            for k in range(2 + int(3 * rnd(r, q))):
                yy2 = by + bh * (k + 1) / (4 + k)
                ink.line(bx + 1, yy2, bx + bw - 1, yy2, c["edge"] if first else c["ink"],
                         0.42, 0.55, 0.15)
            if first:
                ink.line(bx - 4, by + 3, bx, by + 3, c["ink"], 1.6, 0.9, 0.1)
        hatch_rect(ink, sx0 - 4, yy + rh, sx0 + sw + 4, yy + rh + 3.4, c["ink"],
                   angle=20, spacing=2.2, w=0.35, op=0.35, length=4)
    # Bàn đọc với quyển sổ mở, kẻ dòng.
    tx, ty = x + w - 56, y + h - 44
    ink.poly([(tx - 26, ty), (tx + 26, ty), (tx + 22, ty + 5), (tx - 22, ty + 5)],
             c["edge"], 1.2, 0.9, close=True)
    for s in (-1, 1):
        pg = [(tx, ty - 2), (tx + s * 25, ty - 8), (tx + s * 25, ty - 24), (tx, ty - 18)]
        ink.fill(pl(pg, True), c["glow"], 0.6)
        ink.poly(pg, c["ink"], 0.8, 0.85, close=True)
        for k in range(int(7 * DENSITY)):
            t = (k + 1) / (7 * DENSITY + 1)
            ink.line(tx + s * 3, lerp(ty - 4, ty - 17, t), tx + s * 22,
                     lerp(ty - 9, ty - 22, t), c["edge"], 0.4, 0.6, 0.15)
    ink.line(tx, ty + 5, tx, ty + 18, c["edge"], 1.4, 0.85, 0.2)
    glow_rings(ink, tx, ty - 14, 26, c["glow"], 5, 0.26)


def scene_M7(ink):
    """PHÒNG VẼ SAO — Matplotlib. Vòm sao ở trên, bàn vẽ có TRỤC và đường vẽ ở
    dưới: biểu đồ là chuyện đặt một hiện tượng lên hai trục."""
    x, y, w, h = BOX["M7"]
    c = P["m7"]
    rx0, rx1, floor_y, spring = vault(ink, "M7", 8)
    cx = x + w / 2
    dome_y = y + h * 0.46
    stipple_rect(ink, x + 18, y + 14, x + w - 18, dome_y, c["glow"], 330, op=0.75,
                 size=1.1, size_jitter=1.4,
                 tone=lambda px, py: 0.35 + 0.65 * NZ.fbm(px * 0.03, py * 0.03 + 9))
    for i in range(int(9 * DENSITY)):
        px = lerp(x + 30, x + w - 30, rnd(i * 1.9))
        py = lerp(y + 20, dome_y - 10, rnd(i * 3.7))
        for k in range(4):
            a = math.pi * 2 * (k / 4) + 0.4
            ink.line(px, py, px + math.cos(a) * 6, py + math.sin(a) * 6, c["glow"], 0.5, 0.8, 0.1)
    con = [(x + 46, y + 30), (x + 92, y + 52), (x + 138, y + 34), (x + 196, y + 60),
           (x + 250, y + 40), (x + 294, y + 66)]
    ink.poly(con, c["edge"], 0.5, 0.45, dash="3 5")
    # Vòm.
    arc = [(lerp(x + 14, x + w - 14, i / 40),
            dome_y - math.sin(i / 40 * math.pi) * 10) for i in range(41)]
    ink.poly(arc, c["edge"], 1.4, 0.8)
    ridge_hachure(ink, arc, c["ink"], -1, 3.4 / DENSITY, 8, 0.4, 0.4, 1.2)
    # Bàn vẽ: trục, vạch chia, điểm và đường.
    ax0, ay0 = x + 52, y + h - 24
    aw, ah = w - 120, h * 0.34
    ink.poly([(ax0, ay0 - ah), (ax0, ay0), (ax0 + aw, ay0)], c["edge"], 1.7, 0.95)
    for i in range(int(13 * DENSITY)):
        xx = ax0 + aw * (i + 1) / (13 * DENSITY + 1)
        ink.line(xx, ay0, xx, ay0 + 4, c["edge"], 0.6, 0.8, 0.1)
        ink.line(xx, ay0 - ah, xx, ay0, c["edge"], 0.35, 0.22, 0.1, dash="2 5")
    for i in range(int(6 * DENSITY)):
        yy = ay0 - ah * (i + 1) / (6 * DENSITY + 1)
        ink.line(ax0 - 4, yy, ax0, yy, c["edge"], 0.6, 0.8, 0.1)
        ink.line(ax0, yy, ax0 + aw, yy, c["edge"], 0.35, 0.22, 0.1, dash="2 5")
    curve = []
    for i in range(33):
        t = i / 32
        curve.append((ax0 + aw * t,
                      ay0 - ah * (0.18 + 0.62 * NZ.fbm(t * 3.4 + 2, 1.7, 3))))
    ink.poly(curve, c["glow"], 1.6, 0.95)
    ink.poly([(px, py + 2.4) for px, py in curve], c["ink"], 0.6, 0.4)
    for i in range(0, 33, 3):
        px, py = curve[i]
        ink.poly(rough_ring(px, py, 2.6, 0.4, 12, i), c["edge"], 0.9, 0.9, close=True)
    glow_rings(ink, ax0 + aw * 0.5, ay0 - ah * 0.5, 62, c["glow"], 6, 0.22)


def scene_M8(ink):
    """HỒ HỢP LƯU — dự án. Đáy SÁNG LẠI: mặt hồ phản chiếu bảy sắc của bảy gian
    trên nó, vì hai bài dự án dùng lại mọi thứ đã học."""
    x, y, w, h = BOX["M8"]
    c = P["m8"]
    cx = x + w / 2
    # Hang TỰ NHIÊN, không vòm xây: bảy gian kia là công trình, chỗ này là nơi
    # mọi mạch đổ về. Trần răng cưa, nền phẳng, và quanh hồ thì đá SÁNG LẠI.
    roof = [(lerp(x + 24, x + w - 24, i / 40),
             y + 14 + NZ.fbm(i * 0.34 + 4, 2.2, 5) * 30) for i in range(41)]
    # Vách và nền cũng phải LỞM CHỞM. Bản trước đóng hang bằng hai cạnh thẳng
    # đứng và một cạnh ngang, nên cái hang ra đúng một hình chữ nhật tối.
    side_r = [(x + w - 24 + NZ.fbm(i * 1.7 + 9, 5.1) * 26,
               lerp(roof[-1][1], y + h - 10, i / 7)) for i in range(1, 8)]
    base = [(lerp(x + w - 20, x + 20, i / 12),
             y + h - 14 - NZ.fbm(i * 0.9 + 21, 7.3) * 14) for i in range(13)]
    side_l = [(x + 24 - NZ.fbm(i * 1.3 + 31, 3.7) * 22,
               lerp(y + h - 10, roof[0][1], i / 7)) for i in range(1, 8)]
    cave = roof + side_r + base + side_l
    ink.fill(pl(cave, True), P["room"]["dark"])
    ink.poly(side_r + base + side_l, P["ink"]["deep"], 1.6, 0.85)
    ink.poly(roof, P["ink"]["deep"], 2.0, 0.9)
    ridge_hachure(ink, roof, c["edge"], 1, 4.2 / DENSITY, 4.5, 0.4, 0.3, 1.3)
    ink.poly(roof, c["edge"], 0.8, 0.4)
    wy = y + h * 0.44
    # Nhũ đá trên trần, có hachure.
    for i in range(int(16 * DENSITY)):
        px = lerp(x + 40, x + w - 40, i / (16 * DENSITY - 1))
        L = 12 + 26 * rnd(i * 2.3)
        tip = (px + (rnd(i) - 0.5) * 6, y + 22 + L)
        base = y + 16 + NZ.fbm(i * 1.3 + 4, 2.2, 5) * 30
        tri = [(px - 6, base), tip, (px + 6, base)]
        ink.fill(pl(tri, True), P["ink"]["deep"], 0.9)
        ink.poly(tri, P["ink"]["deep"], 1.0, 0.9, close=True)
        # Chỉ MÉP TRÁI bắt sáng (nguồn sáng trên-trái); mặt phải để tối đặc.
        ink.line(px - 5, base, tip[0], tip[1], c["edge"], 0.6, 0.55, 0.2)
        for k in range(int(L / 4 * DENSITY)):
            t = (k + 0.5) / max(1.0, L / 4)
            ink.line(lerp(px + 5, tip[0], t), lerp(base, tip[1], t),
                     lerp(px + 1, tip[0], t), lerp(base + 2, tip[1], t),
                     c["edge"], 0.35, 0.25, 0.2)
    # Mặt hồ: nét sóng ngang, thưa dần về phía xa (lên trên).
    rows = int(30 * DENSITY)
    for r in range(rows):
        t = r / rows
        yy = wy + t * (h * 0.46)
        half = (w / 2 - 34) * (0.42 + 0.58 * t)
        xx = cx - half
        while xx < cx + half:
            L = 7 + 26 * t + 16 * rnd(xx * 0.3, r)
            ink.line(xx, yy, xx + L, yy + (rnd(xx, r * 1.3) - 0.5) * 1.3,
                     c["edge"] if r % 4 else c["glow"], 0.5 + t * 0.4,
                     0.45 + 0.45 * t, 0.35)
            xx += L + 4 + 10 * rnd(xx * 1.7, r)
    # Bảy vệt phản chiếu, mỗi vệt một sắc của gian trên nó.
    for i, k in enumerate(["m1", "m2", "m3", "m4", "m5", "m6", "m7"]):
        rx = cx + (i - 3) * (w * 0.108)
        for q in range(int(13 * DENSITY)):
            t = q / (13 * DENSITY)
            yy = wy + 6 + t * (h * 0.4)
            half = 5 + 9 * t
            ink.line(rx - half + (rnd(i, q) - 0.5) * 5, yy,
                     rx + half + (rnd(i * 2, q) - 0.5) * 5, yy,
                     P[k]["wash"], 1.0, 0.45 - 0.25 * t, 0.5)
    ink.line(cx - (w / 2 - 36), wy, cx + (w / 2 - 36), wy, c["glow"], 1.6, 0.9, 0.6)
    glow_rings(ink, cx, wy + 18, 150, c["glow"], 10, 0.2)
    # Bờ: chấm dày rồi thưa dần ra xa mép nước.
    stipple_rect(ink, x + 16, wy - 16, x + w - 16, wy + 8, c["edge"], 300, op=0.4, size=0.9,
                 tone=lambda px, py: max(0.0, 1 - abs(py - wy) / 18))


SCENES = {"M1": scene_M1, "M2": scene_M2, "M3": scene_M3, "M4": scene_M4,
          "M5": scene_M5, "M6": scene_M6, "M7": scene_M7, "M8": scene_M8}


# ═══════════════════════════════════════════════════════════════════════
# 8 · giếng, mạch phụ thuộc
# ═══════════════════════════════════════════════════════════════════════

def draw_wells(ink):
    """Mỗi gian dưới mặt đất có LỐI RIÊNG lên mặt đất. Giếng không nối gian với
    gian: nó vẽ ra chuyện "vào đâu cũng được" — thứ mà một đường 1→8 phủ nhận."""
    for n, wl in enumerate(WELLS):
        pts = parse_poly(wl["d"])
        sm = resample(pts, 3.0)
        nm = normals(sm)
        # HẸP. Bản trước để nửa bề rộng 7 đơn vị với mảng mờ phủ lên, nên năm
        # cái giếng thành năm cột giàn giáo xám cắt ngang cả bức. Giếng là lối
        # đi, nó phải mảnh và nằm DƯỚI mọi thứ khác.
        hw = 3.5
        left = [(px - nx * hw, py - ny * hw) for (px, py), (nx, ny) in zip(sm, nm)]
        right = [(px + nx * hw, py + ny * hw) for (px, py), (nx, ny) in zip(sm, nm)]
        ink.fill(pl(left + list(reversed(right)), True), P["ink"]["deep"], 0.2)
        ink.poly(left, P["well"]["shaft"], 0.9, 0.85)
        ink.poly(right, P["well"]["shaft"], 0.9, 0.85)
        for i in range(0, len(sm), max(2, int(4 / DENSITY))):
            (px, py), (nx, ny) = sm[i], nm[i]
            ink.line(px - nx * hw, py - ny * hw, px + nx * hw, py + ny * hw,
                     P["well"]["rope"], 0.5, 0.75, 0.15)
        # Đầu giếng trên mặt đất: giá chữ A + ròng rọc có nan.
        hx = wl["x"]
        hy = horizon(hx)
        ink.poly([(hx - 17, hy), (hx, hy - 32), (hx + 17, hy)], P["well"]["head"], 1.5, 0.9)
        ink.line(hx - 11, hy - 11, hx + 11, hy - 11, P["well"]["head"], 1.1, 0.85, 0.2)
        ink.poly(rough_ring(hx, hy - 32, 7, 0.5, 20, n), P["well"]["head"], 1.2, 0.9, close=True)
        for k in range(8):
            a = math.pi * k / 8
            ink.line(hx - math.cos(a) * 6, hy - 32 - math.sin(a) * 6,
                     hx + math.cos(a) * 6, hy - 32 + math.sin(a) * 6,
                     P["well"]["head"], 0.45, 0.7, 0.1)
        hatch_rect(ink, hx - 20, hy - 34, hx + 20, hy, P["ink"]["mid"], angle=62,
                   spacing=3.0, w=0.38, op=0.26, length=7)


def draw_flows(ink):
    """MẠCH PHỤ THUỘC — chỉ ba cạnh thật (M5→M6→M7→M8), dựng từ MAP_FLOWS. Vẽ
    thành một BÓ nét lệch nhau cộng lõi chấm, để nó đọc ra là dòng chảy chứ
    không phải một mũi tên quy trình."""
    for f in FLOWS:
        base = parse_cubic(f["d"])
        nm = normals(base)
        gid = "%s-%s" % (f["from"], f["to"])
        ink.layer("mach-%s" % gid, flow=gid)
        for o in range(-3, 4):
            off = o * 2.3
            pts = [(px + nx * off, py + ny * off) for (px, py), (nx, ny) in zip(base, nm)]
            ink.poly(pts, P["flow"], 0.75 if o else 1.5, 0.75 - abs(o) * 0.14)
        for i in range(0, len(base), 3):
            px, py = base[i]
            nx, ny = nm[i]
            s = (rnd(i * 1.7, px) - 0.5) * 7
            ink.stroke(dot(px + nx * s, py + ny * s), P["flow"], 1.2, 0.65)
        # Đầu mũi tên tính TỪ đường cong, không viết tay toạ độ.
        i = int(len(base) * 0.62)
        px, py = base[i]
        dx, dy = base[i + 3][0] - px, base[i + 3][1] - py
        L = math.hypot(dx, dy) or 1
        dx, dy = dx / L, dy / L
        ink.fill(pl([(px + dx * 9, py + dy * 9),
                     (px - dy * 5.4, py + dx * 5.4),
                     (px + dy * 5.4, py - dx * 5.4)], True), P["flow"], 0.9)


# ═══════════════════════════════════════════════════════════════════════
# 9 · bộ máy chú giải: khung, hoa thị, thước độ sâu, đường dẫn, vòng phóng to
# ═══════════════════════════════════════════════════════════════════════

def draw_leaders(ink):
    """Đường dẫn từ tấm nhãn (HTML, nằm trên tranh) tới gian của nó. Nhãn vì thế
    không còn là một hộp dán lên hình: nó được MÓC vào địa danh."""
    for r in LAYOUT:
        k = r["key"]
        bx, by, bw, bh = BOX[k]
        px, py = PLATE[k]
        tx, ty = bx + bw / 2, by + bh / 2
        dx, dy = tx - px, ty - py
        L = math.hypot(dx, dy) or 1
        ex, ey = px + dx / L * (L - min(L * 0.42, 70)), py + dy / L * (L - min(L * 0.42, 70))
        ink.line(px, py, ex, ey, P["ink"]["mid"], 0.6, 0.5, 0.8, dash="5 4")
        ink.poly(rough_ring(ex, ey, 4.2, 0.4, 14, L), P["ink"]["mid"], 0.8, 0.65, close=True)
        ink.poly(rough_ring(px, py, 2.4, 0.3, 10, L + 3), P["ink"]["mid"], 0.9, 0.7, close=True)


def draw_gauge(ink):
    """THƯỚC ĐỘ SÂU ở lề phải: vạch nhỏ đều, vạch lớn ở mỗi mép dải. KHÔNG CÓ
    SỐ — bản đồ này không biết một con số nào về chiều sâu, và số bịa còn tệ
    hơn không có thước."""
    gx = W - 24
    ink.line(gx, 30, gx, H - 30, P["ink"]["mid"], 1.1, 0.75, 0.25)
    y = 30.0
    while y < H - 30:
        ink.line(gx, y, gx - 5, y, P["ink"]["soft"], 0.5, 0.55, 0.15)
        y += 11
    for _, top, _bot in BANDS:
        yy = top(gx)
        ink.line(gx + 5, yy, gx - 16, yy, P["ink"]["deep"], 1.2, 0.85, 0.2)
        ink.poly(rough_ring(gx, yy, 3.4, 0.3, 12, yy), P["ink"]["deep"], 0.9, 0.85, close=True)
    ink.line(gx, H - 30, gx - 9, H - 44, P["ink"]["deep"], 0.9, 0.8, 0.2)
    ink.line(gx, H - 30, gx + 9, H - 44, P["ink"]["deep"], 0.9, 0.8, 0.2)
    ink.poly([(gx - 6, H - 44), (gx, H - 30), (gx + 6, H - 44)], P["ink"]["deep"], 1.2, 0.9, close=True)


def rosette(ink, cx, cy, r):
    """Hoa thị góc khung: 24 nan + ba vòng + hình thoi giữa. Dựng bằng thước
    compa, không chép hoa văn của ai."""
    for i in range(24):
        a = 2 * math.pi * i / 24
        rr = r if i % 2 == 0 else r * 0.62
        ink.line(cx + math.cos(a) * r * 0.2, cy + math.sin(a) * r * 0.2,
                 cx + math.cos(a) * rr, cy + math.sin(a) * rr,
                 P["ink"]["mid"], 0.5, 0.65, 0.2)
    for k, rr in enumerate((r * 0.28, r * 0.64, r)):
        ink.poly(rough_ring(cx, cy, rr, 0.35, 32, k + cx * 0.01), P["ink"]["mid"],
                 0.7 if k == 2 else 0.5, 0.75, close=True)
    ink.poly([(cx, cy - r * 0.42), (cx + r * 0.3, cy), (cx, cy + r * 0.42), (cx - r * 0.3, cy)],
             P["ink"]["deep"], 0.8, 0.8, close=True)


def draw_frame(ink):
    m = 14
    for off, wdt, op in ((0, 1.6, 0.85), (5, 0.7, 0.6), (8, 0.4, 0.4)):
        ink.stroke("M%s %sH%sV%sH%sZ" % (nf(m + off), nf(m + off), nf(W - m - off),
                                         nf(H - m - off), nf(m + off)),
                   P["ink"]["deep"], wdt, op)
    hatch_rect(ink, m + 5, m + 5, W - m - 5, m + 8, P["ink"]["mid"], 70, 2.4, 0.4, 0.5, 3)
    hatch_rect(ink, m + 5, H - m - 8, W - m - 5, H - m - 5, P["ink"]["mid"], 70, 2.4, 0.4, 0.5, 3)
    hatch_rect(ink, m + 5, m + 5, m + 8, H - m - 5, P["ink"]["mid"], 20, 2.4, 0.4, 0.5, 3)
    hatch_rect(ink, W - m - 8, m + 5, W - m - 5, H - m - 5, P["ink"]["mid"], 20, 2.4, 0.4, 0.5, 3)
    for cx, cy in ((m + 22, m + 22), (W - m - 22, m + 22), (m + 22, H - m - 22), (W - m - 22, H - m - 22)):
        rosette(ink, cx, cy, 16)


def zoom_inset(ink, cx, cy, r, src_key, n):
    """VÒNG PHÓNG TO — mượn ý "soi kỹ một chỗ" của bản mặt cắt tham chiếu: một
    vòng kép, bên trong là chi tiết của gian được phóng lớn, một đường dẫn về
    đúng chỗ bị soi. Chi tiết vẽ lại ở tỉ lệ lớn chứ không phóng ảnh."""
    name = "zoom%d" % n
    ink.clip_circle(cx, cy, r - 2, name)
    bx, by, bw, bh = BOX[src_key]
    tx, ty = bx + bw * 0.5, by + bh * 0.5
    ink.layer("vongsoi-%s" % src_key)
    ink.clip = name
    c = P[src_key.lower()]
    ink.fill("M%s %sh%sv%sh%sZ" % (nf(cx - r), nf(cy - r), nf(2 * r), nf(2 * r), nf(-2 * r)),
             P["room"]["dim"] if src_key != "M1" else P["band"]["sky"])
    if src_key == "M1":
        brick(ink, cx - r - 6, cy - r - 6, 2 * r + 12, 2 * r + 12, c["edge"], c["ink"], 9, 7, 0.6)
        for k in range(int(30 * DENSITY)):
            a = 2 * math.pi * k / (30 * DENSITY)
            ink.line(cx, cy + 6, cx + math.cos(a) * (r - 6), cy + 6 + math.sin(a) * (r - 6) * 0.5,
                     P["light"]["glow"], 0.6, 0.55, 0.5)
        ink.poly(rough_ring(cx, cy + 6, 13, 0.7, 24, 2.1), c["ink"], 1.4, 0.9, close=True)
        for k in range(12):
            a = 2 * math.pi * k / 12
            ink.line(cx + math.cos(a) * 13, cy + 6 + math.sin(a) * 13,
                     cx + math.cos(a) * 19, cy + 6 + math.sin(a) * 19, c["ink"], 1.6, 0.85, 0.1)
    else:
        for row in range(int(14 * DENSITY)):
            yy = cy - r + 6 + row * (2 * r - 12) / (14 * DENSITY)
            xx = cx - r
            while xx < cx + r:
                L = 8 + 18 * rnd(xx * 0.3, row)
                ink.line(xx, yy, xx + L, yy + (rnd(xx, row) - 0.5) * 1.6,
                         c["edge"] if row % 3 else c["glow"], 0.7, 0.7, 0.4)
                xx += L + 5 + 9 * rnd(xx * 1.1, row)
        for i, k in enumerate(["m2", "m4", "m6"]):
            ink.line(cx - 22 + i * 22, cy - r, cx - 22 + i * 22, cy + r, P[k]["wash"], 1.6, 0.45, 0.9)
    ink.clip = None
    ink.layer("vongsoi-vien-%s" % src_key)
    ink.poly(rough_ring(cx, cy, r, 0.7, 60, n * 3.3), P["ink"]["deep"], 1.8, 0.9, close=True)
    ink.poly(rough_ring(cx, cy, r - 4, 0.5, 56, n * 2.1), P["ink"]["mid"], 0.7, 0.7, close=True)
    for k in range(int(64 * DENSITY)):
        a = 2 * math.pi * k / (64 * DENSITY)
        ink.line(cx + math.cos(a) * r, cy + math.sin(a) * r,
                 cx + math.cos(a) * (r + 4.5), cy + math.sin(a) * (r + 4.5),
                 P["ink"]["mid"], 0.5, 0.6, 0.1)
    dx, dy = tx - cx, ty - cy
    L = math.hypot(dx, dy) or 1
    ink.line(cx + dx / L * (r + 5), cy + dy / L * (r + 5), tx - dx / L * 26, ty - dy / L * 26,
             P["ink"]["mid"], 0.7, 0.55, 1.0, dash="6 4")
    ink.poly(rough_ring(tx - dx / L * 26, ty - dy / L * 26, 5, 0.4, 14, n), P["ink"]["mid"],
             0.8, 0.6, close=True)


# ═══════════════════════════════════════════════════════════════════════
# 10 · lắp bức tranh
# ═══════════════════════════════════════════════════════════════════════

def build_full() -> Ink:
    ink = Ink()
    ink.layer("giay")
    draw_paper(ink, 0, 0, W, H)
    ink.layer("troi")
    band_fill(ink, lambda x: -20, horizon, P["band"]["sky"])
    draw_sky(ink, 0, 0, W, 250)
    ink.layer("nui-xa")
    draw_far_ranges(ink, 0, W)
    ink.layer("may")
    draw_clouds(ink, 0, 0, W, 210)
    ink.layer("dai")
    for name, top, bot in BANDS:
        band_fill(ink, top, bot, P["band"][name])
    draw_underground(ink, 0, W)
    ink.layer("mat-dat")
    draw_surface(ink, 0, W)
    ink.layer("gieng")
    draw_wells(ink)
    for key in ("M4", "M5", "M6", "M7", "M8", "M1", "M2", "M3"):
        ink.layer("gian-" + key)
        SCENES[key](ink)
    draw_flows(ink)
    ink.layer("vong-soi")
    zoom_inset(ink, 196, 404, 58, "M1", 1)
    zoom_inset(ink, 1196, 352, 54, "M8", 2)
    ink.layer("chu-giai")
    draw_leaders(ink)
    draw_gauge(ink)
    draw_frame(ink)
    return ink


def build_scene(key: str) -> Ink:
    """Ô crop cho bản hẹp. Dựng LẠI nền cục bộ bằng chính các hàm của bản rộng
    (cùng nhiễu, cùng toạ độ) nên hai bản không thể lệch phong cách — nhưng mỗi
    tệp chỉ mang nét của riêng ô đó, nhờ vậy điện thoại không tải bản rộng."""
    global DENSITY
    x, y, w, h = BOX[key]
    # Ô crop chỉ hiện ở bản HẸP, rộng tối đa 560 px — một phần ba cỡ bản rộng.
    # Giữ nguyên mật độ ở đó là trả tiền mạng cho những nét không ai phân biệt
    # được, nên hạ xuống còn 45%: đúng cái luật "giảm mật độ ở vùng xa".
    DENSITY = 0.45
    ink = Ink()
    ink.clip_rect(x, y, w, h, "crop")
    ink.clip = "crop"
    ink.layer("giay")
    draw_paper(ink, x, y, x + w, y + h)
    if y < horizon(x + w / 2):
        ink.layer("troi")
        band_fill(ink, lambda px: y - 20, horizon, P["band"]["sky"], x, x + w)
        draw_sky(ink, x, y, x + w, min(y + h, 250))
        ink.layer("nui-xa")
        draw_far_ranges(ink, x, x + w)
        ink.layer("may")
        draw_clouds(ink, x, y, x + w, y + h)
    ink.layer("dai")
    for name, top, bot in BANDS:
        if bot(x + w / 2) < y or top(x + w / 2) > y + h:
            continue
        band_fill(ink, top, bot, P["band"][name], x, x + w)
    draw_underground(ink, x, x + w)
    if y < horizon(x + w / 2) < y + h:
        ink.layer("mat-dat")
        draw_surface(ink, x, x + w)
    ink.layer("gian")
    DENSITY = 0.8          # gian là thứ người xem nhìn vào, giữ chi tiết hơn nền
    SCENES[key](ink)
    DENSITY = 1.0
    return ink


def main():
    ap = argparse.ArgumentParser(description="Sinh bản đồ thế giới (SVG)")
    ap.add_argument("--stats", action="store_true", help="in bảng đếm nét từng lớp")
    ap.add_argument("--css", action="store_true",
                    help="in khối .spot1…8 để chép vào world-map.module.css")
    args = ap.parse_args()

    if args.css:
        # Toạ độ tám ô nằm ở HAI nơi (REGION_LAYOUT và CSS) vì CSS module không
        # đọc được TS. `world-map.test.mjs` so lại từng con số, nên chỗ này chỉ
        # để khỏi phải tính tay — đừng sửa CSS mà không chạy nó.
        def pct(v):
            # Làm tròn NỬA LÊN, không phải nửa-về-chẵn của Python: ca test tính
            # lại bằng `Number.toFixed(2)` của JS, và 8,125 ra "8.13" ở đó
            # nhưng "8.12" ở đây. Một con số lệch là một ca đỏ.
            from decimal import Decimal, ROUND_HALF_UP
            d = Decimal(repr(v * 100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            s = str(d)
            return (s.rstrip("0").rstrip(".") if "." in s else s) + "%"
        for i, r in enumerate(LAYOUT):
            x, y, w, h = r["box"]
            px, py = r["plate"]
            print(".spot%d { left: %s; top: %s; width: %s; height: %s; }"
                  % (i + 1, pct(x / W), pct(y / H), pct(w / W), pct(h / H)))
            print(".spot%d > .plate { left: %s; top: %s; }"
                  % (i + 1, pct((px - x) / w), pct((py - y) / h)))
        return

    OUT.mkdir(parents=True, exist_ok=True)
    total_bytes = 0
    total_strokes = 0
    rows = []

    full = build_full()
    svg = full.render(0, 0, W, H)
    if "Gradient" in svg or "gradient" in svg:
        raise SystemExit("sinh ra gradient — sắc độ phải làm bằng mật độ nét")
    path = OUT / "world-map.svg"
    path.write_text(svg, encoding="utf-8")
    kb = len(svg.encode("utf-8")) / 1024
    rows.append(("world-map.svg", full.n, kb))
    total_bytes += kb
    total_strokes += full.n
    over = ["world-map.svg %0.0f KB" % kb] if kb > 900 else []

    for r in LAYOUT:
        key = r["key"]
        x, y, w, h = BOX[key]
        ink = build_scene(key)
        svg = ink.render(x, y, w, h)
        p = OUT / ("scene-%s.svg" % key)
        p.write_text(svg, encoding="utf-8")
        kb = len(svg.encode("utf-8")) / 1024
        rows.append((p.name, ink.n, kb))
        total_bytes += kb
        total_strokes += ink.n
        if kb > 900:
            over.append("%s %0.0f KB" % (p.name, kb))

    for name, n, kb in rows:
        print("%-20s %7d nét %8.1f KB" % (name, n, kb))
    print("%-20s %7d nét %8.1f KB" % ("TỔNG", total_strokes, total_bytes))
    if args.stats:
        print()
        for name, buckets, _flow in full.layers:
            n = sum(len(v) for v in buckets.values())
            if n:
                print("  %-22s %6d nét  %3d nhóm" % (name, n, len(buckets)))

    if over:
        raise SystemExit("vượt trần 900 KB (AGENTS.md) — hạ DENSITY hoặc bớt "
                         "mật độ nét ở vùng xa: " + ", ".join(over))


if __name__ == "__main__":
    main()
