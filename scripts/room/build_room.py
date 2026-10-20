#!/usr/bin/env python3
"""Sinh TIỀN CẢNH BÀN QUAN TRẮC (SVG) — bằng một BỘ SINH NÉT, không bằng CSS.

    py scripts/room/build_room.py              # sinh ra frontend/public/map/room/
    py scripts/room/build_room.py --stats       # thêm bảng đếm nét từng lớp
    py scripts/room/build_room.py --do          # in bảng SỐ ĐO, không ghi tệp
    py scripts/room/build_room.py --out <thư mục>   # sinh ra chỗ khác (ca test dùng)

Hồ sơ hình học và MÀU: `frontend/src/lib/room-art.ts`. Cái thước để NHÌN thứ
vừa vẽ: `py -I scripts/room/raster_room.py --png a.png --buoc 1`.

── VÌ SAO TỆP NÀY TỒN TẠI ───────────────────────────────────────────────────

Tiền cảnh trang chủ trước đây là ba mảng `linear-gradient`, và lời chê nhận
về hai lần là "vẫn thua một góc học VẼ TAY". Bức TRÊN (bản đồ sao) là một bức
tranh thật — 46 nghìn nét, đã đo qua năm vòng; bức DƯỚI là CSS. Gradient CSS
không bao giờ trông như tranh, vì nó không có nét, không có thớ, và
`box-shadow` toả ĐỀU bốn phía nên không chỉ về một nguồn sáng nào.

Bộ máy đã thắng được CSS một lần rồi: `scripts/star/build_sky.py`. Tệp này lặp
lại ĐÚNG kiến trúc ấy cho tiền cảnh.

── SÁU LUẬT, LẤY NGUYÊN TỪ BỘ SINH BẦU TRỜI VÌ CHÚNG ĐÃ TRẢ GIÁ ────────────

1. KHÔNG MỘT MÃ MÀU NÀO Ở ĐÂY. Mọi màu đọc từ `ROOM_PROFILE_<TÊN>` trong
   `frontend/src/lib/room-art.ts`. Lý do không phải cho gọn: hai bản sáng/tối
   sẽ trôi xa nhau ở đúng chỗ một con số bị chép — bản đồ vực đã trả giá khi
   lớp chuyển động chép bốn mốc địa tầng.

2. ĐỘ DÀY NÉT KHÔNG ĐI QUA `nf()`. `nf()` làm tròn toạ độ về SỐ NGUYÊN của
   khung 1360 × 360 — đúng cho toạ độ, chết người cho bề rộng: thớ gỗ 0,5 và
   sợi giấy 0,4 ĐỀU sẽ thành `stroke-width="0"`, tức cả bức VÔ HÌNH. Bản vực
   đã render một lần như thế và nhìn ra đúng "mảng phẳng tô gradient", tức
   chính cái lỗi mà bản vẽ sinh ra để chữa. Bề rộng đi qua `wf()`, có SÀN.

3. KHÔNG `id`, KHÔNG `data-*` nào ngoài `data-lop`. Tranh vào trang bằng
   `<img>`, tức một tài liệu SVG RIÊNG bị cách ly: CSS của trang không khớp
   được selector nào bên trong, JS không `querySelector` vào được. Mọi `id`
   là byte chết tải ở mỗi lượt vào trang chủ.

4. KHÔNG GRADIENT, KHÔNG `<filter>`. Ánh đèn rơi theo khoảng cách dựng bằng
   128 ĐĨA LỒNG NHAU chia đều theo ĐỘ MỜ TÍCH LUỸ (1,6/255 mã màu mỗi bước,
   dưới ngưỡng thấy dải ≈ 2 mã); bóng mềm bằng HAI đa giác chồng cộng lấm tấm
   ở vành; mắt gỗ bằng vòng ê-líp lồng nhau. Một ngoại lệ "chỉ cho chỗ này" là
   một cái lỗ để đúng cái lỗi gốc quay lại.

5. TẤT ĐỊNH. Chạy hai lần ra ĐÚNG một tệp — nhiễu đi qua hàm băm theo toạ độ,
   không qua `random`. Không thì mỗi lần build là một diff vô nghĩa.

6. TỰ CHẶN. Trần dung lượng, sàn tương phản chữ 4,5 : 1 và nét mang tin 3 : 1,
   bước lượng tử của vòng sáng, và BÓNG MỘT NGUỒN (mọi bóng lệch xuống-phải)
   đều là phép đo trong tệp này, chạy TRƯỚC khi ghi một byte nào.

── VÀ MỘT LUẬT RIÊNG CỦA BỨC NÀY ───────────────────────────────────────────

MÉP BÀN CẮT NGANG BỨC. Trên `ROOM_DESK.edgeY` bộ sinh không vẽ MỘT NÉT NÀO:
chỗ ấy để tấm trời lạnh lọt qua. Đối lập nhiệt độ (trời nguội trên, bàn vàng
dưới) phải được VẼ RA chứ không viết thành một câu trong tài liệu — nên vành
sáng ở mép bàn là nét nóng nhất của cả nửa trên bức, và `kiem_mep_trong` chặn
build nếu có nét nào lọt lên trên mép (trừ cái đèn, nó CHE mép theo chủ ý).
"""

from __future__ import annotations

import argparse
import bisect
import json
import math
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TS = ROOT / "frontend" / "src" / "lib" / "room-art.ts"
OUT = ROOT / "frontend" / "public" / "map" / "room"

# Trần dung lượng. Một tệp duy nhất, nên một con số — nhưng vẫn phải có: tiền
# cảnh nằm NGAY TRÊN màn hình đầu tiên nên nó vào LCP cùng tấm trời, và tấm
# trời đã lấy 285 KB của ngân sách 900 KB ở đặc tả §9.2.
#
# 380 chứ 220, và con số đi kèm hai phép đo chứ một cái gu:
#  · bản hiện tại cân **350 KB thô, 89 KB sau gzip** — SVG nén cực tốt vì nó
#    là cùng một cú pháp lặp lại mười bốn nghìn lần, còn `sky-troi.svg` cân
#    285 KB thô. Cái đi qua dây là 89 KB, bằng một tấm ảnh JPEG cỡ vừa.
#  · trần 220 của bản đầu đã bị vượt ở mọi cấu hình cho ra một bức tranh:
#    hạ xuống dưới nó phải bỏ lớp THỚ GỖ, mà thớ gỗ là thứ đầu tiên trong bốn
#    thứ bức này tồn tại để có. Một cái trần ép bỏ đúng cái lý do tồn tại thì
#    nó là một cái trần sai, không phải một ràng buộc đáng giữ.
# Khoảng trống còn lại ~8 %, đủ hẹp để trần vẫn CẮN khi ai đó thêm một lớp.
MAX_KB = 380

# Một con số duy nhất để hạ/nâng mật độ cả bức, như `DENSITY` của build_sky.py.
DENSITY = 1.0


# ═══════════════════════════════════════════════════════════════════════
# 0 · đọc dữ liệu từ room-art.ts
# ═══════════════════════════════════════════════════════════════════════
#
# Chép cách làm của `build_sky.py::grab` — một bộ phân tích literal rất thô, đủ
# cho các khối ở `room-art.ts`. KHÔNG `import build_sky`: tệp đó đọc
# `star-map.ts` ngay lúc nạp module, nên một thay đổi ở bản đồ sao sẽ làm tiền
# cảnh vỡ build vì một lý do chẳng liên quan. `build_sky.py` từ chối
# `import build_map.py` vì đúng lý lẽ này.


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
        raise SystemExit("room-art.ts thiếu %s" % name)
    i = m.end()
    open_ch = SRC[i]
    close_ch = {"{": "}", "[": "]"}.get(open_ch)
    if close_ch is None:
        raise SystemExit("%s không mở bằng { hoặc [" % name)
    depth = 0
    j = i
    trong_chuoi = False
    while j < len(SRC):
        ch = SRC[j]
        if trong_chuoi:
            trong_chuoi = ch != "'"
        elif ch == "'":
            trong_chuoi = True
        elif ch in "{[":
            depth += 1
        elif ch in "}]":
            depth -= 1
            if depth == 0:
                break
        j += 1
    return _obj(SRC[i:j + 1])


FRAME = grab("ROOM_FRAME")
LAYERS = grab("ROOM_LAYERS")
DESK = grab("ROOM_DESK")
LAMP = grab("ROOM_LAMP")
BOOK = grab("ROOM_BOOK")
PLATE = grab("ROOM_PLATE")
TOOLS = grab("ROOM_TOOLS")
SHADOW = grab("ROOM_SHADOW")
BUDGET = grab("ROOM_BUDGET")
LIT = grab("ROOM_LIT")
COPY = grab("ROOM_COPY")

W, H = FRAME["width"], FRAME["height"]


# ═══════════════════════════════════════════════════════════════════════
# 1 · nhiễu, in số, hình học
# ═══════════════════════════════════════════════════════════════════════


class Noise:
    """Nhiễu giá trị 2D nội suy mượt. Tất định theo hạt giống (luật 5)."""

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
        hai để các quãng nhiễu không xếp thẳng hàng và tạo hoa văn giả."""
        amp, acc, norm = 1.0, 0.0, 0.0
        ca, sa = math.cos(0.517), math.sin(0.517)
        for _ in range(octaves):
            acc += amp * self.v(x, y)
            norm += amp
            amp *= gain
            x, y = (x * ca - y * sa) * lac, (x * sa + y * ca) * lac
        return acc / norm


NZ = Noise(0xB0A4D)       # thớ gỗ, sợi giấy
RN = Noise(0x1A3D7)       # số giả ngẫu nhiên theo khoá
DT = Noise(0xD17E2)       # nhiễu TÁN (dither) khi chọn tông


def rnd(k: float, j: float = 0.0) -> float:
    """Số giả ngẫu nhiên 0..1 tất định theo KHOÁ — thay cho `random.random()`
    để thêm một nét ở giữa file không làm xê dịch mọi nét sau nó."""
    return RN.h(int(k * 7919) & 0xFFFF, int(j * 104729) & 0xFFFF)


def nf(v: float) -> str:
    """TOẠ ĐỘ làm tròn về số nguyên của khung 1360 × 360. Mỗi nét tiết kiệm
    4–6 byte phần thập phân, mà sai số lớn nhất là nửa đơn vị khung."""
    s = "%.0f" % v
    return "0" if s == "-0" else s


def wf(v: float) -> str:
    """BỀ RỘNG NÉT — hàm làm tròn RIÊNG, và đây là cái bẫy đắt nhất của cả hai
    bộ sinh. `nf()` làm tròn về số nguyên, nên thớ gỗ 0,5 và sợi giấy 0,4 đều
    thành `stroke-width="0"`: cả bức render với nét vô hình, đúng kích thước
    tệp, không ngoại lệ nào được ném, và nhìn ra "mảng phẳng tô gradient" —
    tức chính cái lỗi bức này sinh ra để chữa."""
    return "%g" % max(0.05, round(v, 2))


def of(v: float) -> str:
    """ĐỘ MỜ — ba chữ số thập phân, không hai.

    Nét và mảng tô gộp nhóm vẫn được làm tròn về bậc 0,01 trong `Ink` (xem
    `STEP_OP`), nên với chúng hàm này in ra đúng con số ấy. Chữ số thứ ba chỉ
    có nghĩa với hình `solo=True` — và ở đó nó đáng một byte: 128 vòng ánh đèn
    có độ mờ riêng ~0,008…0,03, mà làm tròn 0,024 về 0,02 là mất 17 % đóng góp
    của vòng ấy. Đo được: bước dải 2,56/255 mã màu (vượt trần 2) phần lớn đến
    từ chính phép làm tròn này, không từ số vòng."""
    return "%g" % max(0.002, min(1.0, round(v, 3)))


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


def wobble(x1, y1, x2, y2, amp, seed=0.0, buoc=11.0):
    """Nét "vẽ tay": một nhịp nhiễu mềm dọc nét, lệch ±amp, hạt giống cố định.

    Nét thẳng tuyệt đối đọc ra "sơ đồ", nét hơi rung đọc ra "vẽ tay". Đây là
    thứ rẻ nhất trong cả tệp và cũng là thứ đổi cảm giác nhiều nhất.

    `buoc` là khoảng cách giữa hai điểm uốn, và nó là MỘT NÚT DUNG LƯỢNG chứ
    một tham số hình học: mỗi điểm thêm vào tốn ~8 byte, nhân với bảy nghìn
    vệt thớ là 400 KB. Bản đầu dùng `buoc` 11 cho mọi thứ và ra **1 020 KB**,
    gấp bốn lần rưỡi trần. Nét MANG TIN (nét gáy, vạch, phác chòm) giữ `buoc`
    nhỏ; nét CHẤT LIỆU (thớ, sợi, lót) đi `buoc` lớn — ở cỡ 0,5 đơn vị bề
    rộng, ba điểm uốn hay mười hai điểm uốn là một thứ không ai phân biệt
    được, nhưng chênh nhau 300 KB."""
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy)
    if L < 4 or amp <= 0:
        return [(x1, y1), (x2, y2)]
    k = max(2, int(L / buoc))
    nx, ny = -dy / L, dx / L
    pts = []
    for i in range(k + 1):
        t = i / k
        w = (NZ.v(x1 * 0.06 + t * 3.3 + seed, y1 * 0.06 + t * 1.9) - 0.5) * 2 * amp
        w *= math.sin(math.pi * t) ** 0.6
        pts.append((x1 + dx * t + nx * w, y1 + dy * t + ny * w))
    return pts


def smoothstep(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def trong_da_giac(x, y, poly) -> bool:
    """Phép thử tia — dùng cho CẢ lượt vẽ (chọn tông theo vật nào ở dưới) lẫn
    lượt ĐO (`nen_rgb`). Hai cách thử là hai câu trả lời sẽ lệch."""
    trong = False
    n = len(poly)
    for i in range(n):
        ax, ay = poly[i]
        bx, by = poly[(i + 1) % n]
        if (ay > y) != (by > y) and x < ax + (y - ay) / (by - ay) * (bx - ax):
            trong = not trong
    return trong


def bao_loi(pts):
    """Bao lồi (monotone chain). Dùng cho HỢP của vật và hình bóng đã dịch —
    xem chú thích ở `ve_bong`."""
    p = sorted(set((round(x, 3), round(y, 3)) for x, y in pts))
    if len(p) < 3:
        return p

    def nua(seq):
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

    return nua(p)[:-1] + nua(p[::-1])[:-1]


def quad_pt(q, u, v):
    """Điểm (u, v) trong tứ giác `q` theo nội suy song tuyến tính.

    Tứ giác của bức này RỘNG HƠN Ở DƯỚI (phía người ngồi), nên chính hình đã
    mang phối cảnh — mọi thứ đặt theo (u, v) tự nghiêng theo nó, không phải
    nhân thêm một phép biến đổi nào."""
    a = (q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u)
    b = (q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u)
    return (a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v)


# ═══════════════════════════════════════════════════════════════════════
# 2 · màu: đo tương phản, chọn tông — KHÔNG mã màu nào viết ở đây
# ═══════════════════════════════════════════════════════════════════════


def hex_rgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def luminance(rgb) -> float:
    """Độ chói tương đối WCAG. Phải TỰ ĐO được từ chính thứ vừa sinh, chứ
    không nhận một lời dặn: hai sàn 4,5 : 1 và 3 : 1 chặn build ở `main`."""
    c = []
    for v in rgb:
        s = v / 255.0
        c.append(s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def over(base, top, alpha):
    return tuple(base[i] + (top[i] - base[i]) * alpha for i in range(3))


def tuong_phan(a, b) -> float:
    L1, L2 = luminance(a), luminance(b)
    return (max(L1, L2) + 0.05) / (min(L1, L2) + 0.05)


def ton(ramp, t, x, y) -> str:
    """Tông của một nét: bậc `t` ∈ 0..1 trên thang `ramp`, TÁN giữa hai bậc kề.

    ── VÌ SAO PHẢI TÁN, VÀ VÌ SAO TÁN LÀ ĐỦ ────────────────────────────────

    Một thang bảy tông trên cả mặt bàn là bảy dải nhìn thấy được — đúng cái
    lỗi mà 16 vòng mặt trời của bản đồ sao mắc (14,3 mã màu mỗi bước). Nhưng ở
    đây mặt bàn không phải những mảng tô: nó là BẢY NGHÌN vệt thớ nhỏ, nên
    chọn bậc theo xác suất `fr` cho mỗi vệt làm hai bậc kề TRỘN VÀO NHAU theo
    đúng tỉ lệ — mắt tích phân ra một dốc liên tục, y như lấm tấm của tinh vân
    làm với dốc Lambert.

    Và nó CŨNG là lý do `ton_rgb` (lượt đo) trả về màu NỘI SUY: giá trị trung
    bình của phép tán chính là thứ mắt đọc được, nên đo bằng màu nội suy là đo
    đúng bức tranh, không phải đo một bức dễ hơn."""
    n = len(ramp)
    f = max(0.0, min(1.0, t)) * (n - 1)
    i = int(f)
    if i >= n - 1:
        return ramp[n - 1]
    fr = f - i
    return ramp[i + 1] if DT.h(int(x * 3.0) & 0xFFFF, int(y * 3.0) & 0xFFFF) < fr else ramp[i]


def ton_muot(ramp, t) -> str:
    """Tông NỘI SUY — dùng cho MẢNG TÔ, không cho nét.

    ── CÁI LỖI MÀ CHỈ LƯỢT NHÌN BẮT ĐƯỢC ───────────────────────────────────

    Hai trang giấy và tấm thẻ đồng được tô bằng 22–26 DẢI, mỗi dải lấy tông
    qua `ton()`. Mà `ton()` tán bằng MỘT phép tung đồng xu ở tâm hình — đúng
    cho một vệt thớ rộng nửa đơn vị, sai hẳn cho một dải rộng mười hai đơn vị
    và cao cả trang: mỗi dải nhận trọn một trong hai bậc kề, nên trang giấy ra
    một dãy SỌC DỌC đậm nhạt xen kẽ.

    Bảng số không thấy gì cả: `ton_rgb` (lượt đo) trả về màu trung bình, mà
    trung bình của sọc đúng bằng trung bình của dốc. Chỉ PNG thấy — và nó là
    khuyết tật dễ thấy nhất của bản đầu.

    Nội suy không tốn byte ở chỗ nó được dùng: mỗi dải đã là một `<path>`
    riêng (`solo=True`). Với NÉT thì ngược lại — nét gộp nhóm theo màu, nên
    nội suy ở đó là hàng nghìn nhóm; nét vẫn tán, và tán ĐÚNG ở cỡ ấy."""
    rgb = ton_rgb(ramp, t)
    return "#%02X%02X%02X" % tuple(int(v + 0.5) for v in rgb)


def ton_rgb(ramp, t):
    """Màu TRUNG BÌNH của `ton()` — dùng cho lượt ĐO. Xem chú thích ở `ton`."""
    n = len(ramp)
    f = max(0.0, min(1.0, t)) * (n - 1)
    i = min(n - 2, int(f)) if n > 1 else 0
    fr = f - i
    return over(hex_rgb(ramp[i]), hex_rgb(ramp[i + 1]), max(0.0, min(1.0, fr)))


# ═══════════════════════════════════════════════════════════════════════
# 3 · lớp mực
# ═══════════════════════════════════════════════════════════════════════


class Ink:
    """Gom nét theo (loại, màu, bề rộng, độ mờ) để mỗi nhóm là MỘT `<path>`.

    Độ dày và độ mờ được làm tròn về BẬC: mỗi giá trị khác nhau là một `<path>`
    riêng với đủ bộ thuộc tính (~70 byte), nên để độ mờ chạy liên tục thì một
    lớp đẻ ra vài trăm nhóm."""

    # Bậc của BỀ RỘNG và ĐỘ MỜ cho nét/mảng GỘP NHÓM. Mỗi giá trị khác nhau là
    # một `<path>` riêng cõng đủ bộ thuộc tính (~90 byte), nên để độ mờ chạy
    # liên tục thì một lớp đẻ ra hơn nghìn nhóm — đo được: lớp `tho-go` ra
    # **1 305 nhóm**, tức ~117 KB chỉ riêng thuộc tính. Bậc 0,05 cho 20 mức độ
    # mờ, nhiều hơn mức mắt đọc được trên một vệt rộng nửa đơn vị.
    STEP_W = 0.1
    STEP_OP = 0.05

    def __init__(self):
        self.buckets: dict[str, dict] = {k: {} for k in LAYERS}
        self.n = 0
        self._solo = 0

    def _add(self, layer, key, d):
        if layer not in self.buckets:
            raise SystemExit("lớp '%s' không có trong ROOM_LAYERS (room-art.ts)" % layer)
        self.buckets[layer].setdefault(key, []).append(d)
        self.n += 1

    def stroke(self, layer, d, color, w=0.6, op=1.0, cap="round", dash=None):
        w = max(self.STEP_W, round(w / self.STEP_W) * self.STEP_W)
        op = max(self.STEP_OP, min(1.0, round(op / self.STEP_OP) * self.STEP_OP))
        self._add(layer, ("s", color, round(w, 2), round(op, 2), cap, dash), d)

    def fill(self, layer, d, color, op=1.0, rule=None, solo=False):
        """`solo=True` ⇒ hình này được MỘT `<path>` RIÊNG, không gộp nhóm.

        ── LỖI ĐẮT NHẤT CỦA BỘ SINH BẦU TRỜI, chép nguyên cách chữa ─────────

        Gộp nhóm là lossless khi các hình KHÔNG CHỒNG NHAU. Với hình LỒNG NHAU
        thì nó sai và sai im lặng: 128 vòng ánh đèn sau khi làm tròn độ mờ về
        bậc 0,01 có hàng chục vòng cùng bậc, và hợp của chúng được tô ĐÚNG MỘT
        LẦN ở bậc ấy — độ mờ tích luỹ thôi cộng dồn, nên cả cái vệt sáng mất
        đi phần lớn độ sáng của nó. Ở bản đồ sao, mô hình nói 47,3 % còn tranh
        thật đo ra 4,3 %: mười lần lệch, và không một phép kiểm nào bắt được
        vì MỌI phép kiểm đọc mô hình, không đọc tệp.

        Giá của bản sửa: ~60 byte thuộc tính mỗi hình."""
        # Hình `solo` KHÔNG làm tròn về bậc 0,01: bậc ấy tồn tại để gộp nhóm,
        # mà hình solo không gộp với gì cả — làm tròn nó là mất chính xác mà
        # không tiết kiệm một byte nào.
        if solo:
            self._solo += 1
            self._add(layer, ("f", color, round(min(1.0, max(0.002, op)), 3), rule,
                              self._solo), d)
        else:
            op = max(self.STEP_OP, min(1.0, round(op / self.STEP_OP) * self.STEP_OP))
            self._add(layer, ("f", color, round(op, 2), rule), d)

    def poly(self, layer, pts, color, w=0.6, op=1.0, close=False, dash=None):
        self.stroke(layer, pl(pts, close), color, w, op, "round", dash)

    def text(self, layer, x, y, s, color, size, weight, anchor="start", op=1.0,
             tracking=None):
        self._add(layer, ("t", color, round(op, 2), size, weight, anchor, tracking),
                  (x, y, s))

    def render(self, aria="") -> str:
        esc = lambda s: (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
        out = [
            "<!-- SINH BỞI scripts/room/build_room.py — ĐỪNG SỬA TAY. Sửa dữ liệu ở "
            "frontend/src/lib/room-art.ts rồi chạy lại script. -->",
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" width="%s" '
            'height="%s" role="img" aria-label="%s">'
            % (nf(W), nf(H), nf(W), nf(H), esc(aria)),
        ]
        # Thứ tự lớp là MỘT danh sách duy nhất (`ROOM_LAYERS` ở TS): thứ tự
        # đăng ký LÀ thứ tự z, LÀ thứ tự vẽ. Azgaar đã trả giá cho việc chép
        # thứ tự lớp ở ba chỗ mà không có gì giữ cho ba chỗ ấy khớp nhau.
        for name in LAYERS:
            b = self.buckets[name]
            if not b:
                continue
            out.append('<g data-lop="%s">' % name)
            for key, items in b.items():
                if key[0] == "s":
                    _, color, w, op, cap, dash = key
                    a = ['fill="none"', 'stroke="%s"' % color,
                         # BỀ RỘNG QUA `wf()`, KHÔNG QUA `nf()` — luật 2.
                         'stroke-width="%s"' % wf(w)]
                    if op < 1:
                        a.append('stroke-opacity="%s"' % of(op))
                    a.append('stroke-linecap="%s"' % cap)
                    a.append('stroke-linejoin="round"')
                    if dash:
                        a.append('stroke-dasharray="%s"' % dash)
                    out.append('<path %s d="%s"/>' % (" ".join(a), "".join(items)))
                elif key[0] == "f":
                    _, color, op, rule = key[:4]
                    a = ['fill="%s"' % color]
                    if rule:
                        a.append('fill-rule="%s"' % rule)
                    if op < 1:
                        a.append('fill-opacity="%s"' % of(op))
                    out.append('<path %s d="%s"/>' % (" ".join(a), "".join(items)))
                else:
                    _, color, op, size, weight, anchor, tracking = key
                    a = ['fill="%s"' % color, 'font-family="%s"' % COPY["font"],
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
# 4 · hình học mặt bàn: mép xa và PHỐI CẢNH
# ═══════════════════════════════════════════════════════════════════════

HORIZON = DESK["edgeY"] - DESK["horizonLift"]
_UA = 1.0 / (DESK["edgeY"] - HORIZON)
_UB = 1.0 / (H - HORIZON)


def mep_y(x: float) -> float:
    """MÉP XA của bàn tại `x` — hơi rung, vì một đường thẳng tuyệt đối dài
    1360 đơn vị là thứ duy nhất trong bức đọc ra ngay là "do máy kẻ"."""
    a = DESK["edgeWobble"]
    return DESK["edgeY"] + (NZ.v(x * 0.012, 7.3) - 0.5) * 2 * a


def do_sau(y: float) -> float:
    """ĐỘ SÂU 0..1 của hàng `y`: 0 ở mép xa, 1 ở mép dưới khung.

    Mặt phẳng nhìn xiên nén dần về xa, nên độ sâu đi qua `1/(y − chân trời)`
    chứ không tuyến tính theo `y`. Một mặt bàn chia đều theo `y` đọc ra là một
    hình chữ nhật dán lên, không ra một mặt bàn."""
    u = 1.0 / max(1e-6, y - HORIZON)
    return (_UA - u) / (_UA - _UB)


def hang_y(t: float) -> float:
    """`y` của hàng ở độ sâu `t` — phép đảo của `do_sau`. Hai hàm, một công
    thức: `deskDepth`/`deskRowY` ở TS là bản sinh đôi, ca test so hai chỗ."""
    return HORIZON + 1.0 / (_UA - (_UA - _UB) * t)


# ═══════════════════════════════════════════════════════════════════════
# 5 · ÁNH SÁNG — một nguồn, rơi theo khoảng cách, không thấy dải
# ═══════════════════════════════════════════════════════════════════════


def pool_re(x, y) -> float:
    """BÁN KÍNH HIỆU DỤNG của một điểm trong vệt sáng trên mặt bàn.

    Mặt bàn nhìn XIÊN nên vệt sáng là một ê-líp bị nén theo trục dọc
    (`pool.squash`), không một hình tròn: chia khoảng cách dọc cho `squash` là
    đưa điểm về hệ toạ độ tròn. Nghịch đảo của phép dựng vòng ở `ve_vung_sang`,
    nên lượt VẼ và lượt ĐO nói đúng cùng một hình."""
    p = LAMP["pool"]
    dx, dy = x - p["x"], (y - p["y"]) / p["squash"]
    d = math.hypot(dx, dy)
    if d <= 0:
        return 0.0
    th = math.atan2(dy, dx)
    return d / (1.0 + p["warp"] * math.cos(th * 2 + 0.6))


def lamp_A(re: float) -> float:
    """ĐỘ MỜ TÍCH LUỸ tại bán kính hiệu dụng `re` — TRA BẢNG `ROOM_LAMP.profile`.

    Bảng chứ không công thức, và lý do giống `SKY_LIGHT.profile`: đèn có một
    LÕI PHẲNG bão hoà ngay dưới chao, một thềm, rồi một đầu gối dốc. Khớp một
    luỹ thừa trên cả dải thì sai ở hai đầu và cho ra đúng cái "đĩa viền
    xuyến" mà bản gradient đang là."""
    tb = LAMP["profile"]
    if re <= tb[0][0]:
        return tb[0][1]
    for i in range(1, len(tb)):
        r1, a1 = tb[i]
        if re <= r1:
            r0, a0 = tb[i - 1]
            t = (re - r0) / (r1 - r0) if r1 > r0 else 0.0
            return a0 + (a1 - a0) * t
    return 0.0


def lamp_r_of_A(a: float) -> float:
    """BÁN KÍNH mà tại đó độ mờ tích luỹ bằng `a` — phép đảo của `lamp_A`.

    Vòng chia đều theo ĐỘ MỜ, không theo bán kính, và đó là chỗ con số
    1,6/255 mã màu mỗi vòng đến từ: chia đều theo bán kính thì vùng đuôi (A
    đổi chậm) được quá nhiều vòng còn vùng đầu gối (A đổi nhanh) được quá ít —
    tức dải vẫn thấy ở đúng chỗ dốc nhất.

    `a` ≥ giá trị đầu bảng trả về MÉP NGOÀI của thềm bão hoà, KHÔNG tâm: bảng
    mở đầu `[0, 1]` rồi `[40, 1]`, nên trả về 0 là một đa giác suy biến và cái
    lõi bão hoà không được tô. Bản đồ sao đã mất đúng cái lõi ấy một lần, và
    chỉ raster hoá mới bắt được (mô hình nói p99 = 0,977, tranh thật 0,572)."""
    tb = LAMP["profile"]
    if a >= tb[0][1]:
        r = tb[0][0]
        for rr, aa in tb:
            if aa >= a:
                r = rr
            else:
                break
        return r
    for i in range(1, len(tb)):
        r0, a0 = tb[i - 1]
        r1, a1 = tb[i]
        if a1 <= a <= a0:
            if a0 == a1:
                return r1
            return r0 + (r1 - r0) * ((a0 - a) / (a0 - a1))
    return tb[-1][0]


def sang(x, y) -> float:
    """ÁNH SÁNG tới một điểm, 0..1 — MỘT hàm cho mọi lớp và cho cả lượt đo.

    `ambient` là nền sáng của chính bầu trời phía trên (và chút ánh bật lại từ
    tường): không có nó, nửa phải bức là một mảng đen tuyệt đối, tức bức lại
    thành một hàm HAI giá trị — đúng cái đã chẩn đoán ra ở lời chê thứ năm của
    bản đồ sao (89,7 % diện tích ở L < 0,01 so với 20,5 % của khung tham
    chiếu). Nhưng nó phải NHỎ: ambient lớn là xoá luôn cái nguồn sáng duy
    nhất, và bóng đổ mất nghĩa."""
    return min(1.0, LIT["ambient"] + lamp_A(pool_re(x, y)))


def pool_ton(muc: float, P) -> str:
    """Màu của vòng ánh đèn ở mức độ mờ tích luỹ `muc` — NỘI SUY ba tông.

    ── VÌ SAO NỘI SUY, KHÔNG BA DẢI RỜI ───────────────────────────────────

    Bản đầu chia ba dải rời theo `rimAt`/`coreAt` như bầu trời làm. Phép đo
    bắt được ngay: **bước dải 3,02/255 mã màu tại r = 109**, vượt trần 2 —
    và chỗ đó không phải một bước ĐỘ MỜ mà là một bước MÀU, đúng ranh
    `coreAt`. Tức cái dải nhìn thấy được không đến từ số vòng (128 vòng cho
    1,6 mã) mà từ hai vòng kề nhau mang HAI MÀU khác nhau.

    Ở bầu trời cái ranh ấy chìm được, vì nền quanh nó là tinh vân lấm tấm. Ở
    đây nó nằm giữa một mặt bàn trơn, nên nó đọc ra là một đường tròn.

    Nội suy không tốn một byte nào: mỗi vòng đã là một `<path>` riêng
    (`solo=True`) nên 128 màu khác nhau cũng chỉ là 128 thuộc tính `fill`."""
    r_at, c_at = LAMP["rimAt"], LAMP["coreAt"]
    if muc <= r_at:
        a, b, t = P["glowRim"], P["glowCore"], muc / max(1e-6, r_at)
    elif muc <= c_at:
        a, b, t = P["glowCore"], P["core"], (muc - r_at) / max(1e-6, c_at - r_at)
    else:
        return P["core"]
    rgb = over(hex_rgb(a), hex_rgb(b), smoothstep(t))
    return "#%02X%02X%02X" % tuple(int(v + 0.5) for v in rgb)


_STACK = None
_REV: list[float] = []


def pool_stack(P):
    """CHỒNG VÒNG đã gộp thành MỘT lớp: `[(bán kính, A tích luỹ, màu tiền
    nhân)]`, một phần tử mỗi vòng, bán kính GIẢM dần.

    Phát lại ĐÚNG trình tự mà `ve_vung_sang` tô, kể cả phép LÀM TRÒN ĐỘ MỜ về
    bậc 0,01 của `Ink` — nếu không thì mô hình đo một bức tranh khác với bức
    được ghi ra tệp, và đó là cái lỗi đã làm bản đồ sao báo bậc giữa 47,3 %
    trong khi raster đo 4,3 %.

    Gộp được vì phép phủ liên tiếp có dạng `kết quả = nền·(1−A) + C`: `A` và
    `C` chỉ phụ thuộc dãy vòng, không phụ thuộc nền — nên tính MỘT LẦN rồi
    mọi điểm chỉ còn một phép nội suy, thay cho 128 phép phủ."""
    global _STACK
    if _STACK is None:
        n = LAMP["levels"]
        A, C, tich = 0.0, (0.0, 0.0, 0.0), 0.0
        out = []
        for i in range(n):
            r = lamp_r_of_A((i + 1) / n)
            muc = (i + 1) / n * LIT["poolMix"]
            a = (muc - tich) / max(1e-6, 1.0 - tich)
            tich = muc
            if a > 0.004:
                a = round(min(1.0, max(0.002, a)), 3)
                col = hex_rgb(pool_ton(muc, P))
                C = tuple(C[k] * (1 - a) + col[k] * a for k in range(3))
                A = A + a * (1 - A)
            out.append((r, A, C))
        _STACK = out
        _REV[:] = [r for r, _a, _c in reversed(out)]
    return _STACK


def pool_rgb_re(base, re_: float, P):
    """Màu nền SAU ánh đèn, tính theo BÁN KÍNH HIỆU DỤNG thay cho toạ độ.

    Tách khỏi `pool_rgb` để `do_buoc_dai` đo được ĐÚNG MỘT bước vòng. Bản đầu
    đo bằng cách lấy hai điểm ở `(cx + r_i, cy)`: sai, vì `pool_re` còn chia
    cho hệ số méo rìa (`warp`), nên một điểm ở khoảng cách `r_i` có bán kính
    HIỆU DỤNG lệch 5,5 % — ở chỗ vòng dày đặc, 5,5 % là HAI, BA vòng. Phép đo
    ấy báo 3,12/255 mã màu, và nó TỆ HƠN khi tăng số vòng (vòng càng dày thì
    5,5 % càng vắt qua nhiều vòng) — một dấu hiệu đọc được rằng chính phép đo
    sai, chứ không phải bức tranh."""
    st = pool_stack(P)
    # Vòng phủ một điểm là mọi vòng có bán kính ≥ `re`; bán kính giảm theo chỉ
    # số nên đếm bằng một phép tìm nhị phân trên danh sách đảo.
    k = len(st) - bisect.bisect_left(_REV, re_)
    if k <= 0:
        return base
    _r, A, C = st[k - 1]
    return tuple(base[i] * (1 - A) + C[i] for i in range(3))


def pool_rgb(base, x, y, P):
    """Màu mặt bàn tại `(x, y)` SAU khi các vòng ánh đèn phủ lên — lượt ĐO."""
    return pool_rgb_re(base, pool_re(x, y), P)


# ═══════════════════════════════════════════════════════════════════════
# 6 · hình học các vật — một chỗ duy nhất, lượt vẽ và lượt đo cùng đọc
# ═══════════════════════════════════════════════════════════════════════

SP, LF, RT = BOOK["spine"], BOOK["left"], BOOK["right"]
# Tứ giác theo thứ tự (xa-trong, xa-ngoài, gần-ngoài, gần-trong) để `quad_pt`
# cho u = "từ gáy ra mép ngoài", v = "từ xa về gần".
TRANG_TRAI = [(SP["farX"], SP["farY"]), (LF["farX"], LF["farY"]),
              (LF["nearX"], LF["nearY"]), (SP["nearX"], SP["nearY"])]
TRANG_PHAI = [(SP["farX"], SP["farY"]), (RT["farX"], RT["farY"]),
              (RT["nearX"], RT["nearY"]), (SP["nearX"], SP["nearY"])]
THE_DONG = [tuple(p) for p in PLATE["quad"]]


def thuoc_quad():
    """Tứ giác của THƯỚC — một thanh dài, hai mép song song, hơi nghiêng."""
    r = TOOLS["ruler"]
    ax, ay = r["from"]["x"], r["from"]["y"]
    bx, by = r["to"]["x"], r["to"]["y"]
    dx, dy = bx - ax, by - ay
    L = math.hypot(dx, dy)
    nx, ny = -dy / L * r["half"], dx / L * r["half"]
    return [(ax + nx, ay + ny), (bx + nx, by + ny), (bx - nx, by - ny), (ax - nx, ay - ny)]


THUOC = thuoc_quad()


def tren_ban(x, y) -> bool:
    return y >= mep_y(x)


# ═══════════════════════════════════════════════════════════════════════
# 7 · BÓNG ĐỔ — một nguồn, nên mọi bóng chỉ về một hướng
# ═══════════════════════════════════════════════════════════════════════

# Mọi bóng đã vẽ, giữ lại để `nen_rgb` đọc được. Một phép đo tương phản mà
# không biết chỗ nó đo đang bị bóng phủ là một phép đo nói dối theo chiều
# SÁNG — và chỗ tệ nhất của bức (nét chì dưới bóng com-pa) là đúng chỗ ấy.
# (hình bóng, độ mờ, hình VẬT ĐỔ BÓNG). Phần tử thứ ba có mặt vì một điểm
# nằm TRÊN MẶT vật thì KHÔNG nằm trong bóng của chính vật ấy — mặt trên được
# chiếu sáng, đó là lý do nó có bóng.
BONG: list[tuple[list, float, list]] = []


def lech_bong(x, y, h):
    """Vector bóng của một điểm vật ở độ cao `h`: ĐI RA KHỎI đèn, dài TUYẾN
    TÍNH theo khoảng cách tới đèn.

    Sinh đôi của `shadowOffset` ở TS, và ca test so hai chỗ — xem chú thích ở
    `ROOM_SHADOW.len` cho cái luật sai mà bản đầu dùng (bóng dài BẰNG NHAU ở
    mọi khoảng cách, tức mô hình nguồn sáng ở vô cực, tức đúng `box-shadow`)."""
    dx, dy = x - LAMP["at"]["x"], y - LAMP["at"]["y"]
    d = math.hypot(dx, dy) or 1.0
    lo, hi = SHADOW["clamp"]
    k = h * SHADOW["len"] * min(hi, max(lo, d / SHADOW["ref"]))
    return dx / d * k, dy / d * k


def mo_bong(x, y) -> float:
    """Hệ số mờ của bóng theo khoảng cách tới đèn. Xa đèn thì cả vật lẫn bóng
    đều chìm, nên một bóng đậm như nhau ở mọi chỗ là thứ phá đúng cái nó dựng."""
    d = math.hypot(x - LAMP["at"]["x"], y - LAMP["at"]["y"])
    f = SHADOW["fade"]
    return f["floor"] + (1 - f["floor"]) * max(0.0, 1 - max(0.0, d - f["at"]) / 900.0)


def ve_bong(ink, lop, poly, h, P, tiep_xuc=None):
    """BÓNG của một hình, hai tầng + lấm tấm ở vành — bóng mềm KHÔNG `<filter>`.

    UMBRA ở `umbra` phần độ lệch (đậm) và PENUMBRA ở trọn độ lệch (nhạt): hai
    đa giác chồng nhau cho ba mức sáng, tức một dốc đọc được. Lấm tấm ở vành
    ngoài không phải trang trí — tám tấm nền nhãn của bản đồ sao đọc ra là
    "tám vệt bôi đen" đúng vì chúng có MÉP SẮC, và một đa giác bóng không lấm
    tấm là vệt bôi đen thứ chín.

    `tiep_xuc` là mép TIẾP ĐẤT của vật (chỉ số các đỉnh chạm mặt bàn): một nét
    đậm sát mép ấy là thứ nói ra vật ĐẶT TRÊN bàn chứ không nổi lơ lửng."""
    # Hệ số mờ lấy ở TÂM hình, không ở đỉnh đầu: đỉnh đầu là một điểm tuỳ ý
    # trong danh sách, nên cùng một hình khai theo thứ tự khác sẽ ra một cái
    # bóng đậm nhạt khác — một thứ không ai nhìn ra mà vẫn đổi bức tranh.
    mo = mo_bong(sum(p[0] for p in poly) / len(poly),
                 sum(p[1] for p in poly) / len(poly))
    for ten, k, op in (("pen", 1.0, SHADOW["penumbraOpacity"]),
                       ("umb", SHADOW["umbra"], SHADOW["umbraOpacity"])):
        q = []
        for x, y in poly:
            ox, oy = lech_bong(x, y, h * k)
            q.append((x + ox, y + oy))
        # Bóng là HỢP của vật và hình đã dịch — không thì cái bóng rời khỏi
        # chân vật và vật đọc ra là đang bay. Hợp lấy bằng BAO LỒI, không bằng
        # cách nối hai đường viền: hướng dịch toả ra khỏi đèn nên với một vật
        # TRÒN (cái đế đèn, nằm gần như ngay dưới nguồn) hai viền quấn vào
        # nhau và đa giác nối tự cắt chính nó. Trên PNG nó ra một cái chổi xể
        # tua rua dưới chân đèn — thấy ngay, mà không một con số nào báo.
        hop = bao_loi(poly + q)
        BONG.append((hop, op * mo, poly))
        ink.fill(lop, pl(hop, True), P["shadow"], op * mo, rule="nonzero", solo=True)
        if ten == "pen":
            # LẤM TẤM ở vành ngoài: mật độ giảm theo khoảng cách ra ngoài mép,
            # và SỐ LƯỢNG tỉ lệ với chính độ dài bóng. Không chia theo độ dài
            # thì vật nằm gần như NGAY DƯỚI đèn (cái đế) — bóng chỉ nhô ra vài
            # đơn vị — vẫn nhận đủ số chấm, và chúng toả 360° quanh chân đế
            # thành một cái chổi xể. Thấy ngay trên PNG, không con số nào báo.
            dai = math.hypot(*lech_bong(poly[0][0], poly[0][1], h))
            n = int(SHADOW["stipple"]["per"] * len(poly) * DENSITY / 4
                    * min(1.0, dai / 22.0))
            for i in range(n):
                t = rnd(i * 2.7, 31.1) * len(poly)
                j = int(t) % len(poly)
                u = t - int(t)
                ax, ay = poly[j]
                bx, by = poly[(j + 1) % len(poly)]
                px, py = ax + (bx - ax) * u, ay + (by - ay) * u
                ox, oy = lech_bong(px, py, h)
                s = 1.0 + rnd(i * 5.1, 7.7) * 0.85
                x, y = px + ox * s, py + oy * s
                if not (0 <= x <= W and tren_ban(x, y) and y <= H):
                    continue
                ink.stroke(lop, dot(x, y), P["shadow"],
                           SHADOW["stipple"]["size"] * 2,
                           SHADOW["stipple"]["opacity"] * mo * (1.3 - s * 0.6))
    if tiep_xuc:
        pts = [poly[i] for i in tiep_xuc]
        ink.poly(lop, wobble(pts[0][0], pts[0][1], pts[-1][0], pts[-1][1], 1.2, 3.3),
                 P["shadow"], SHADOW["contact"]["width"],
                 SHADOW["contact"]["opacity"] * mo)


def bong_phu(x, y) -> float:
    """Độ mờ bóng TÍCH LUỸ tại một điểm, đọc từ `BONG`.

    Bỏ qua bóng của chính vật chứa điểm ấy — và chỗ này đã sai một lần, sai
    đúng kiểu im lặng: hình bóng là BAO LỒI của vật và vật-đã-dịch, nên nó
    CHỨA cả vật. Tính nó vào thì mỗi vật tự dìm mặt trên của mình, và phép đo
    tương phản tụt từ 5,13 : 1 xuống **1,08 : 1** trong khi bức tranh không
    đổi một điểm ảnh nào (hình bóng vẫn nằm DƯỚI vật, nên mắt không thấy gì).
    Một phép đo sai theo chiều ấy chặn build ở chỗ không có lỗi — và nếu ai
    "chữa" nó bằng cách bôi sáng nét thì nét sẽ loá ở mọi chỗ KHÔNG bị bóng."""
    a = 0.0
    for poly, op, chu in BONG:
        if trong_da_giac(x, y, chu):
            continue
        if trong_da_giac(x, y, poly):
            a = a + op - a * op
    return a


# ═══════════════════════════════════════════════════════════════════════
# 8 · MÔ HÌNH NỀN — một hàm trả về màu nền tại một điểm bất kỳ
# ═══════════════════════════════════════════════════════════════════════


def ban_t(x, y) -> float:
    return LIT["deskBase"] + LIT["deskGain"] * sang(x, y) ** LIT["deskGamma"]


def giay_t(x, y) -> float:
    return LIT["paperBase"] + LIT["paperGain"] * sang(x, y)


def dong_spec(x, y) -> float:
    """DẢI PHẢN QUANG của tấm thẻ đồng.

    Nó ở xa đèn nhưng chú giải vẫn phải đọc được ≥ 4,5 : 1, và câu trả lời
    KHÔNG phải "kéo nó lại gần đèn" — là ĐỒNG PHẢN QUANG. Kim loại bắt nguồn
    sáng mạnh hơn gỗ tán xạ rất nhiều, nên một dải sáng chạy ngang tấm thẻ
    theo góc tới là một hiện tượng thật, đo được. Đó là lý do chú giải đọc
    được ở chỗ gỗ quanh nó đã gần đen."""
    sp = PLATE["spec"]
    y0 = THE_DONG[0][1] + (THE_DONG[3][1] - THE_DONG[0][1]) * sp["at"]
    hh = (THE_DONG[3][1] - THE_DONG[0][1]) * sp["half"]
    f = max(0.0, 1.0 - abs(y - y0) / max(1e-6, hh))
    return smoothstep(f) * sp["gain"] * (0.45 + 0.55 * sang(x, y) * 4)


def dong_t(x, y) -> float:
    return LIT["brassBase"] + LIT["brassGain"] * min(1.0, sang(x, y) + dong_spec(x, y))


def thuoc_t(x, y) -> float:
    return LIT["rulerBase"] + LIT["rulerGain"] * sang(x, y)


def che_boi(x, y, lop: str) -> bool:
    """Điểm `(x, y)` của lớp `lop` có bị một lớp TRÊN nó che hẳn không?

    ── VÌ SAO PHÉP KIỂM TƯƠNG PHẢN CẦN HÀM NÀY ────────────────────────────

    Hai phép đo đầu tiên trượt nặng — phác chòm 1,21 : 1 và vạch thước
    1,13 : 1 — và CẢ HAI đều là phép đo nói dối: điểm phác nằm lọt dưới khớp
    xoay com-pa, còn đầu phải cái thước nằm lọt dưới trang giấy. Ở cả hai chỗ,
    `nen_rgb` trả về đúng màu của vật Ở TRÊN (giấy, thép) rồi so nó với màu
    nét của vật BÊN DƯỚI — một cặp màu mà bức tranh không có.

    Nguy hiểm hơn chuyện con số sai: nó ĐẨY người sửa đi đúng hướng sai. Cách
    duy nhất làm con số ấy đạt là bôi sáng một nét KHÔNG AI NHÌN THẤY, và cái
    giá trả là nét ấy sẽ lộ ra ở chỗ nó KHÔNG bị che. Nên hàm này không phải
    một ngoại lệ để lách sàn — nó là điều kiện để cái sàn nói đúng điều nó
    định nói.

    Thứ tự lớp lấy từ `ROOM_LAYERS`, không ghi cứng: đổi thứ tự z mà quên ở
    đây là một phép kiểm đo bức tranh cũ."""
    tt = {l: i for i, l in enumerate(LAYERS)}
    z = tt[lop]
    if z < tt["so-tay"] and (trong_da_giac(x, y, TRANG_TRAI)
                             or trong_da_giac(x, y, TRANG_PHAI)):
        return True
    if z < tt["com-pa"] and any(trong_da_giac(x, y, q) for q in com_pa_quads()):
        return True
    if z < tt["the-dong"] and trong_da_giac(x, y, THE_DONG):
        return True
    if z < tt["thuoc"] and trong_da_giac(x, y, THUOC):
        return True
    return False


def nen_rgb(x, y, P):
    """MÀU NỀN tại `(x, y)` — MỘT hàm cho mọi phép đo tương phản của tệp này.

    Thứ tự hỏi là thứ tự z ngược: vật gần nhất ở trên. Bóng phủ cộng vào SAU
    CÙNG; đúng với mọi chỗ bức này đo (chữ trên thẻ, nét chì trên giấy, vạch
    trên thước) vì ở cả ba chỗ bóng nằm TRÊN mặt vật."""
    if trong_da_giac(x, y, TRANG_PHAI) or trong_da_giac(x, y, TRANG_TRAI):
        rgb = ton_rgb(P["paperRamp"], giay_t(x, y))
    elif trong_da_giac(x, y, THUOC):
        rgb = ton_rgb(P["rulerRamp"], thuoc_t(x, y))
    elif trong_da_giac(x, y, THE_DONG):
        rgb = ton_rgb(P["brassRamp"], dong_t(x, y))
    elif tren_ban(x, y):
        rgb = pool_rgb(ton_rgb(P["deskRamp"], ban_t(x, y)), x, y, P)
    else:
        # Trên mép bàn là chỗ TRỐNG — tấm trời lọt qua. Nền ở đó là màu trời.
        rgb = hex_rgb(P["checkSky"])
    b = bong_phu(x, y)
    return over(rgb, hex_rgb(P["shadow"]), b) if b > 0 else rgb


# ═══════════════════════════════════════════════════════════════════════
# 9 · MẶT BÀN: nền, thớ, khe ván, mắt gỗ
# ═══════════════════════════════════════════════════════════════════════


def ve_mat_ban(ink, P):
    """Nền mặt bàn: một mảng tô TỐI NHẤT làm lớp chặn, rồi ~500 VỆT BẢN RỘNG
    chồng mép nhau mang cái dốc tông.

    ── VÌ SAO KHÔNG PHẢI MỘT MẢNG TÔ DUY NHẤT ──────────────────────────────

    Bản đầu tô một tông đều rồi để 128 vòng ánh đèn gánh cả dốc sáng. Nhưng
    `nen_rgb` (lượt ĐO) dựng nền từ thang `deskRamp` theo ánh sáng, tức mô
    hình đo một mặt bàn CÓ dốc tông còn tranh vẽ một mặt bàn PHẲNG. Đó đúng
    kiểu lệch mô hình ‖ tranh đã làm bản đồ sao báo "bậc giữa 47,3 %" trong
    khi raster đo 4,3 % — và bài học của nó là chữa ở phía TRANH, không ở phía
    phép đo.

    Vệt bản rộng chồng mép nhau (`overlap` ≈ 1,95 lần khoảng hàng) phủ kín,
    nên nền thật có đúng cái dốc mô hình nói; và vì là NÉT chứ mảng tô, biên
    giữa hai tông kề là biên RUNG chứ không một đường thẳng — vẫn không có
    dải nào để thấy."""
    pts = [(x, mep_y(x)) for x in range(0, int(W) + 9, 8)]
    pts += [(W, H), (0, H)]
    ink.fill("nen-ban", pl(pts, True), P["deskRamp"][0])
    wa = DESK["wash"]
    rows = int(wa["rows"] * DENSITY)
    for j in range(rows):
        t = (j + 0.5) / rows
        y = hang_y(t)
        # Bề rộng vệt = khoảng tới hàng kế × `overlap`, nên hàng gần (thưa
        # hơn theo phối cảnh) có vệt dày hơn và phủ vẫn kín.
        khe = abs(hang_y(min(1.0, (j + 1.5) / rows)) - y)
        w = max(2.0, khe * wa["overlap"])
        for i in range(wa["per"]):
            x0 = i / wa["per"] * (W + 180) - 90
            x1 = x0 + (W + 180) / wa["per"] * 1.12
            xm, ym = (x0 + x1) / 2, y
            if ym > H + w:
                continue
            pts = wobble(x0, y + (NZ.v(x0 * 0.005, j * 0.7) - 0.5) * khe * 0.5,
                         x1, y + (NZ.v(x1 * 0.005, j * 0.7) - 0.5) * khe * 0.5,
                         khe * 0.45, j * 1.1, 46)
            # KẸP xuống dưới mép bàn, cộng nửa bề rộng nét: một vệt bản rộng
            # có TÂM dưới mép vẫn chờm lên trên mép mất nửa bề rộng, và nửa ấy
            # là một vệt gỗ nằm trên bầu trời. `kiem_mep_trong` đọc toạ độ nên
            # nó không bắt được chuyện này — chỉ bắt được tâm nét.
            pts = [(px, max(py, mep_y(px) + w / 2 + 0.6)) for px, py in pts]
            if min(py for _px, py in pts) > H:
                continue
            ink.poly("nen-ban", pts,
                     ton(P["deskRamp"], ban_t(xm, ym), xm, ym), w, wa["width"])


def ve_tho_go(ink, P):
    """THỚ GỖ — thứ CSS không làm được, và thứ chiếm phần lớn số nét của bức.

    `rows` hàng chia đều theo ĐỘ SÂU (nên nén lại ở phía xa, y như khe ván);
    mỗi vệt dài, rung, hơi lệch khỏi phương ngang, và tông chọn theo ÁNH SÁNG
    tại chính chỗ nó nằm. Chính chỗ đó là chỗ thớ gỗ khác một hoa văn: vệt
    gần đèn sáng vàng, vệt xa chìm thành gần đen, và giữa hai đầu là một dốc
    liên tục nhờ phép TÁN ở `ton()`.

    Vài phần trăm vệt lấy `grainLit` — mặt thớ nhô lên BẮT ĐÈN. Không có nó
    thì gỗ chỉ có thớ TỐI, tức mắt đọc ra giấy nhám chứ không ra gỗ đánh bóng."""
    g = DESK["grain"]
    rows = int(g["rows"] * DENSITY)
    for j in range(rows):
        t = (j + 0.5) / rows
        y0 = hang_y(t)
        # Một vệt dài thêm theo độ sâu: hàng gần có cùng số vệt nhưng trải
        # trên một dải `y` cao hơn, nên vệt phải dài ra không thì gỗ loãng dần
        # về phía người ngồi — ngược hẳn với phối cảnh.
        scale = 0.55 + 1.15 * t
        per = max(6, int(g["per"] * DENSITY))
        for i in range(per):
            x0 = (i + rnd(j * 3.1 + i * 0.7, 2.3)) / per * (W + 160) - 80
            L = g["len"] * scale * (1 - g["lenJitter"] / 2 + rnd(i * 1.9, j * 4.1) * g["lenJitter"])
            tilt = (rnd(i * 5.7, j * 2.9) - 0.5) * 2 * g["tilt"]
            y1 = y0 + (NZ.v(x0 * 0.004, j * 0.31) - 0.5) * 9 * scale
            x2, y2 = x0 + L, y1 + L * tilt
            # Lề 2,5 và kiểm CẢ HAI đầu: một vệt dài 112 đơn vị có độ nghiêng
            # `tilt` nên đầu kia có thể cao hơn đầu này vài đơn vị, và
            # `kiem_mep_trong` đã bắt đúng ca ấy (một vệt ở y = 106 trong khi
            # mép thấp nhất ở 107).
            if min(y1, y2) < mep_y(x0) + 2.5 or max(y1, y2) > H - 1:
                continue
            xm, ym = (x0 + x2) / 2, (y1 + y2) / 2
            s = sang(xm, ym)
            # `litFlip`: một tỉ lệ nhỏ vệt là MẶT THỚ BẮT ĐÈN, và tỉ lệ ấy lớn
            # dần theo ánh sáng — chỗ tối không có thớ nào loé lên được.
            if rnd(i * 7.3, j * 6.1) < LIT["grainLitAt"] * s:
                mau, w, op = P["grainLit"], g["width"] * 0.85, 0.5 + 0.4 * s
            else:
                mau = ton(P["grainRamp"], LIT["grainBase"] + LIT["grainGain"] * s, xm, ym)
                w, op = g["width"] * (0.7 + 0.6 * scale), 0.4 + 0.5 * s
            ink.poly("tho-go", wobble(x0, y1, x2, y2, 1.5 * scale, j * 0.7, 68),
                     mau, w, op)
    # LỖ CHÂN GỖ — chấm, không nét. Thứ cho gỗ cái mặt rỗ li ti mà vệt dài
    # không bao giờ cho được.
    pr = DESK["pores"]
    for i in range(int(pr["count"] * DENSITY)):
        x = rnd(i * 1.3, 11.7) * W
        t = rnd(i * 2.9, 5.3)
        y = hang_y(t)
        if y < mep_y(x) + 2.5 or y > H - 1:
            continue
        s = sang(x, y)
        ink.stroke("tho-go", dot(x, y),
                   ton(P["grainRamp"], LIT["grainBase"] + LIT["grainGain"] * s, x, y),
                   pr["size"] * 2 * (0.6 + t), pr["opacity"] * (0.45 + 0.55 * s))


def ve_khe_van(ink, P):
    """KHE VÁN — chia đều theo ĐỘ SÂU, nên nén lại về phía xa. Mỗi khe là một
    nét tối cộng một nét sáng ngay DƯỚI nó: mép ván bên này tụt xuống, mép bên
    kia nhô lên bắt đèn. Một nét đơn độc đọc ra là một vạch kẻ."""
    p = DESK["planks"]
    for k in range(1, p["count"] + 1):
        t = k / (p["count"] + 1)
        y = hang_y(t)
        if y <= DESK["edgeY"] + 2 or y >= H - 1:
            continue
        pts = wobble(0, y, W, y, p["wobble"], k * 1.7, 26)
        ink.poly("khe-van", pts, P["seam"], p["width"] * (0.6 + t), p["opacity"])
        duoi = [(x, yy + 1.1 + t) for x, yy in pts]
        ink.poly("khe-van", duoi, P["grainLit"], p["width"] * 0.55 * (0.6 + t),
                 0.1 + 0.22 * sang(W / 2, y))


def ve_mat_go(ink, P):
    """MẮT GỖ — vòng ê-líp LỒNG NHAU, méo theo góc.

    Đúng kỹ thuật tinh vân dùng (đường đồng mức lồng nhau) ở cỡ nhỏ, và nó là
    chỗ nói ra "đây là một tấm gỗ thật" rõ nhất: thớ gỗ đi quanh mắt gỗ chứ
    không đi xuyên qua. Vòng ngoài méo nhiều hơn vòng trong, vì mắt gỗ là mặt
    cắt của một cành nhìn xiên."""
    for kn in DESK["knots"]:
        cx, cy = kn["x"], kn["y"]
        if cy < DESK["edgeY"] + 8:
            continue
        s = sang(cx, cy)
        for r in range(kn["rings"], 0, -1):
            rr = kn["r"] * r / kn["rings"]
            seg = max(12, int(rr * 1.4))
            pts = []
            for i in range(seg):
                th = math.tau * i / seg
                w = 1.0 + 0.16 * math.sin(th * 3 + r * 0.7) * (r / kn["rings"])
                ex = rr * w * math.cos(th)
                ey = rr * w * kn["squash"] * math.sin(th)
                ca, sa = math.cos(kn["tilt"]), math.sin(kn["tilt"])
                pts.append((cx + ex * ca - ey * sa, cy + ex * sa + ey * ca))
            ink.poly("tho-go", pts, ton(P["grainRamp"], LIT["grainBase"] + 0.3 * s, cx, cy),
                     0.55 if r > 1 else 0.9, (0.3 + 0.45 * s) * (0.5 + 0.5 * r / kn["rings"]),
                     close=True)


def ve_vung_sang(ink, P):
    """128 ĐĨA LỒNG NHAU — ánh đèn rơi trên mặt bàn, và KHÔNG THẤY DẢI.

    Đĩa tô đặc chồng từ ngoài vào, không vòng viền: vòng viền có hai mép nên
    mắt đếm được từng vòng. Bán kính chia đều theo ĐỘ MỜ TÍCH LUỸ
    (`lamp_r_of_A`), nên bước lượng tử đều nhau trên cả dải — `do_buoc_dai`
    đo lại con số ấy và `main` chặn build nếu nó vượt 2/255 mã màu.

    Mỗi đĩa `solo=True`: gộp nhóm các hình LỒNG NHAU là lỗi đắt nhất của bộ
    sinh bầu trời — độ mờ tích luỹ thôi cộng dồn và cả vệt sáng mất phần lớn
    độ sáng, im lặng (47,3 % mô hình so với 4,3 % tranh thật).

    Đĩa bị CẮT ở mép bàn: ánh sáng đọng trên MẶT BÀN, còn phần trên mép là
    không khí — chỗ ấy có `ve_quang_den` lo, với một quầng mờ hẳn."""
    n = LAMP["levels"]
    p = LAMP["pool"]
    cx, cy = p["x"], p["y"]
    ban = [lamp_r_of_A((i + 1) / n) for i in range(n)]
    tich = 0.0
    for i in range(n):
        r = ban[i]
        if r <= 0:
            continue
        muc = (i + 1) / n * LIT["poolMix"]
        col = pool_ton(muc, P)
        a, tich = (muc - tich) / max(1e-6, 1.0 - tich), muc
        if a <= 0.004:
            continue
        seg = max(p["segMin"], min(p["segMax"], int(round(r / p["segPer"]))))
        khe = abs(r - (ban[i + 1] if i + 1 < n else 0.0))
        pts = []
        for k in range(seg):
            th = math.tau * k / seg
            rr = r * (1.0 + p["warp"] * math.cos(th * 2 + 0.6))
            # Dao động riêng mỗi vòng, biên độ dưới nửa khe tới vòng kế — hai
            # vòng KHÔNG THỂ cắt nhau mà biên giới của chúng thôi trùng pha.
            rr += (RN.v(th * 7.3 + i * 2.1, i * 3.7) - 0.5) * khe * 0.4
            x = cx + math.cos(th) * rr
            y = cy + math.sin(th) * rr * p["squash"]
            pts.append((x, max(y, mep_y(x) + 0.5)))
        ink.fill("vung-sang", pl(pts, True), col, a, solo=True)
    # LẤM TẤM trong vệt sáng — thứ giữ cho 128 đĩa phẳng khỏi đọc ra 128 đĩa.
    st = LAMP["stipple"]
    R = lamp_r_of_A(st["at"])
    for i in range(int(st["count"] * DENSITY)):
        th = rnd(i * 3.1, 1.7) * math.tau
        r = math.sqrt(rnd(i * 5.3, 9.1)) * R
        x = cx + math.cos(th) * r
        y = cy + math.sin(th) * r * p["squash"]
        if not (0 <= x <= W and tren_ban(x, y) and y <= H):
            continue
        f = lamp_A(pool_re(x, y))
        if f < st["at"] or rnd(x * 1.9, y * 4.1) > (f - st["at"]) * st["gain"]:
            continue
        ink.stroke("vung-sang", dot(x, y), P["core"], st["size"] * 2, st["opacity"] * f)


def ve_mep_ban(ink, P):
    """MÉP BÀN — VẾT CẮT của bức, và nó phải được VẼ RA.

    Ba nét: một nét TỐI ngay trên mép (cạnh bàn ngược sáng, kề trời nguội),
    một VÀNH SÁNG bắt đèn ngay dưới (bàn vàng), rồi một nét tối mờ dưới nữa
    (mặt bàn tụt vào trong bóng của chính cái cạnh). Vành sáng mờ dần về phía
    phải vì đèn ở bên trái — một vành sáng đều từ trái sang phải là thứ nói
    rằng có một nguồn sáng thứ hai không tồn tại."""
    r = DESK["rim"]
    buoc = 6
    xs = [x for x in range(0, int(W) + buoc, buoc)]
    for k in range(len(xs) - 1):
        x0, x1 = xs[k], xs[k + 1]
        y0, y1 = mep_y(x0), mep_y(x1)
        xm = (x0 + x1) / 2
        s = sang(xm, (y0 + y1) / 2 + 2)
        ink.poly("mep-ban", [(x0, y0 - r["drop"] * 0.4), (x1, y1 - r["drop"] * 0.4)],
                 P["rimDark"], r["dark"], 0.9)
        ink.poly("mep-ban", [(x0, y0 + 0.6), (x1, y1 + 0.6)], P["rim"],
                 r["width"] * (0.5 + 0.5 * min(1.0, s * 2.2)),
                 r["opacity"] * min(1.0, 0.12 + s * 1.9))
        ink.poly("mep-ban", [(x0, y0 + r["drop"]), (x1, y1 + r["drop"])],
                 P["rimDark"], r["dark"] * 1.4, 0.3 + 0.3 * (1 - s))


# ═══════════════════════════════════════════════════════════════════════
# 10 · ĐÈN HỔ PHÁCH — nguồn sáng duy nhất
# ═══════════════════════════════════════════════════════════════════════


def chao_poly():
    sh = LAMP["shade"]
    cx, my = LAMP["at"]["x"], LAMP["at"]["y"]
    return [(cx - sh["topHalf"], sh["topY"]), (cx + sh["topHalf"], sh["topY"]),
            (cx + sh["mouthHalf"], my), (cx - sh["mouthHalf"], my)]


def ve_quang_den(ink, P):
    """QUẦNG TRONG KHÔNG KHÍ quanh bóng đèn — vòng TRÒN (không nén), mờ hẳn.

    Đây là thứ duy nhất của đèn được phép vượt lên TRÊN mép bàn. Nó cần, vì
    một nguồn sáng không có quầng trong không khí đọc ra là một mảng sơn
    sáng — và cũng là chỗ duy nhất trong bức mà ánh đèn ấm CHẠM vào trời
    nguội, tức chỗ cái vết cắt nhiệt độ được nối lại một chút cho đỡ cứng."""
    hl = LAMP["halo"]
    n = hl["levels"]
    cx, cy = LAMP["at"]["x"], LAMP["at"]["y"] - 4
    tich = 0.0
    for i in range(n):
        muc = (i + 1) / n * hl["opacity"]
        r = hl["r"] * (1 - (i + 1) / n) ** 0.72 + 5
        a, tich = (muc - tich) / max(1e-6, 1.0 - tich), muc
        seg = max(10, min(72, int(r * 1.1)))
        pts = [(cx + math.cos(math.tau * k / seg) * r,
                cy + math.sin(math.tau * k / seg) * r) for k in range(seg)]
        ink.fill("den", pl(pts, True),
                 P["core"] if muc > hl["opacity"] * 0.72 else P["glowCore"], a, solo=True)


def ve_den(ink, P):
    """CHAO, THÂN, ĐẾ. Mặt ngoài chao TỐI (đèn sáng từ TRONG) với một dải sáng
    bên trái-trên; VÀNH MIỆNG trong nóng rực — đó là chỗ nói ra "nguồn sáng ở
    đây", và nó là điểm sáng nhất bức."""
    sh = LAMP["shade"]
    cx, my = LAMP["at"]["x"], LAMP["at"]["y"]
    poly = chao_poly()
    ink.fill("den", pl(poly, True), P["shadeDark"])
    # NAN CHAO: `ribs` nét dọc nối đỉnh với miệng, tông theo góc tới của đèn
    # phòng (không có) — tức theo khoảng cách tới dải sáng bên trái.
    for i in range(sh["ribs"] + 1):
        u = i / sh["ribs"]
        xt = cx - sh["topHalf"] + 2 * sh["topHalf"] * u
        xb = cx - sh["mouthHalf"] + 2 * sh["mouthHalf"] * u
        f = max(0.0, 1.0 - abs(u - 0.34) / 0.5)
        mau = P["shadeLit"] if f > 0.72 else P["shadeMid"] if f > 0.3 else P["shadeDark"]
        ink.poly("den", wobble(xt, sh["topY"], xb, my, 0.8, i * 1.3, 24), mau,
                 1.5, 0.3 + 0.5 * f)
    # Búa gõ: chấm lấm tấm trên mặt chao, đậm hơn ở dải sáng. Đồng gò thì có
    # vết búa; một mặt chao mịn tuyệt đối là một mặt nhựa.
    for i in range(int(sh["hammer"] * DENSITY)):
        u, v = rnd(i * 1.7, 3.1), rnd(i * 2.3, 8.9)
        x = (cx - sh["topHalf"] + 2 * sh["topHalf"] * u) * (1 - v) + \
            (cx - sh["mouthHalf"] + 2 * sh["mouthHalf"] * u) * v
        y = sh["topY"] + (my - sh["topY"]) * v
        f = max(0.0, 1.0 - abs(u - 0.34) / 0.5)
        ink.stroke("den", dot(x, y), P["shadeLit"] if f > 0.6 else P["shadeDark"],
                   1.1, 0.14 + 0.3 * f)
    # VÀNH MIỆNG — hai nét: vành ngoài kim loại sáng, vành trong NÓNG RỰC.
    ink.poly("den", [(cx - sh["mouthHalf"], my), (cx + sh["mouthHalf"], my)],
             P["shadeRim"], 2.6, 0.95)
    ink.poly("den", [(cx - sh["mouthHalf"] + 4, my + 2.2),
                     (cx + sh["mouthHalf"] - 4, my + 2.2)], P["bulb"], 3.4, 0.9)
    # BÓNG ĐÈN: ba đĩa nhỏ lồng nhau dưới miệng chao. Điểm sáng nhất bức.
    for k, (rr, col, op) in enumerate(((13, P["core"], 0.5), (8, P["bulb"], 0.7),
                                       (4.5, P["bulb"], 1.0))):
        seg = 20
        pts = [(cx + math.cos(math.tau * i / seg) * rr,
                my + 5 + math.sin(math.tau * i / seg) * rr * 0.8) for i in range(seg)]
        ink.fill("den", pl(pts, True), col, op, solo=True)
    # THÂN: hai nét song song, sáng bên trái tối bên phải — thân kim loại tròn
    # dưới một nguồn sáng ở trên-trái thì phải thế, và đó là chỗ rẻ nhất để
    # nói "vật này có khối".
    st = sh["stem"]
    for off, mau, w in ((-st["width"] / 2, P["shadeLit"], st["width"] * 0.42),
                        (0, P["shadeMid"], st["width"] * 0.5),
                        (st["width"] / 2, P["shadeDark"], st["width"] * 0.42)):
        ink.poly("den", wobble(cx + off, my + 10, cx + off * 1.4, st["toY"], 0.7, off),
                 mau, w, 0.9)
    # ĐẾ: `rings` vòng ê-líp lồng nhau, nửa trên-trái sáng.
    bs = sh["base"]
    for k in range(bs["rings"], 0, -1):
        f = k / bs["rings"]
        seg = 34
        pts = []
        for i in range(seg):
            th = math.tau * i / seg
            pts.append((cx + math.cos(th) * bs["rx"] * f,
                        bs["y"] + math.sin(th) * bs["ry"] * f))
        mau = P["shadeLit"] if f > 0.82 else P["shadeMid"] if f > 0.45 else P["shadeDark"]
        ink.fill("den", pl(pts, True), mau, 1.0 if f > 0.95 else 0.5, solo=True)
    ink.poly("den", [(cx - bs["rx"] * 0.88, bs["y"] - bs["ry"] * 0.5),
                     (cx - bs["rx"] * 0.2, bs["y"] - bs["ry"] * 0.95)],
             P["shadeRim"], 1.8, 0.75)


# ═══════════════════════════════════════════════════════════════════════
# 11 · SỔ QUAN TRẮC
# ═══════════════════════════════════════════════════════════════════════


def ve_trang(ink, P, quad, phai: bool):
    ink.fill("so-tay", pl(quad, True), ton_hex(P["paperRamp"], quad, P))
    # TÔ LẠI theo DẢI DỌC: một trang giấy nhận ánh sáng khác nhau ở hai đầu
    # (gáy gần đèn hơn mép ngoài), và 22 dải tán vào nhau cho một dốc đọc
    # được mà vẫn chỉ tốn 22 hình.
    # Nhiều dải HƠN và mép dải LỆCH NGẪU NHIÊN: ngay cả với tông nội suy, một
    # loạt mép thẳng tắp cách đều nhau vẫn đọc ra là một lưới. Lệch ±0,35 bước
    # là đủ để mắt thôi tìm thấy nhịp.
    n = 46
    for i in range(n):
        u0 = (i + (rnd(i * 3.1, 7.7) - 0.5) * 0.7) / n
        u1 = (i + 1 + (rnd((i + 1) * 3.1, 7.7) - 0.5) * 0.7) / n
        p = [quad_pt(quad, u0, 0.0), quad_pt(quad, u1, 0.0),
             quad_pt(quad, u1, 1.0), quad_pt(quad, u0, 1.0)]
        xm, ym = quad_pt(quad, (u0 + u1) / 2, 0.5)
        ink.fill("so-tay", pl(p, True), ton_muot(P["paperRamp"], giay_t(xm, ym)),
                 1.0, solo=True)
    # SỢI GIẤY: vệt rất ngắn + chấm. Giấy không có thớ dài như gỗ; nó có sợi
    # ngắn hướng loạn, và đó là lý do hai lớp này khác nhau chứ không phải
    # cùng một hàm gọi hai lần với tham số khác.
    fb = BOOK["fiber"]
    for i in range(int(fb["strokes"] * DENSITY / 2)):
        u, v = rnd(i * 1.3, 2.7), rnd(i * 3.7, 5.1)
        x, y = quad_pt(quad, u, v)
        th = rnd(i * 7.1, 1.3) * math.tau
        L = fb["len"] * (0.5 + rnd(i * 2.1, 9.7))
        s = sang(x, y)
        sang_hon = rnd(i * 4.3, 6.7) < 0.42 + 0.3 * s
        ink.poly("so-tay", [(x, y), (x + math.cos(th) * L, y + math.sin(th) * L)],
                 P["paperFiberLit"] if sang_hon else P["paperFiberDark"],
                 fb["width"], fb["opacity"] * (0.5 + 0.6 * s))
    for i in range(int(fb["dots"] * DENSITY / 2)):
        u, v = rnd(i * 5.9, 7.3), rnd(i * 1.1, 4.3)
        x, y = quad_pt(quad, u, v)
        s = sang(x, y)
        ink.stroke("so-tay", dot(x, y),
                   P["paperFiberDark"] if rnd(i * 3.3, 2.9) < 0.5 else P["paperFiberLit"],
                   0.8, fb["opacity"] * (0.4 + 0.6 * s))
    # DÒNG KẺ: nội suy theo (u, v) nên chúng tự nghiêng theo phối cảnh trang.
    ru = BOOK["rule"]
    for i in range(ru["count"]):
        v = (i + 1) / (ru["count"] + 1)
        a = quad_pt(quad, ru["inset"], v)
        b = quad_pt(quad, 1 - ru["inset"], v)
        xm, ym = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        ink.poly("so-tay", wobble(a[0], a[1], b[0], b[1], 0.6, i * 2.1, 22),
                 P["paperLine"], ru["width"], ru["opacity"] * (0.4 + 0.6 * sang(xm, ym)))
    if phai:
        ve_phac_chom(ink, P, quad)
    else:
        ve_chu_tay(ink, P, quad)


def ton_hex(ramp, quad, P) -> str:
    xm, ym = quad_pt(quad, 0.5, 0.5)
    return ton(ramp, giay_t(xm, ym), xm, ym)


def ve_chu_tay(ink, P, quad):
    """CHỮ VIẾT TAY — vệt rung ngắn nối nhau, KHÔNG phải chữ thật.

    Chữ thật ở cỡ 7 px là một hàng mực nhoè, và nó sẽ là một câu không ai dịch
    nổi trên một bức tranh. Vệt rung đọc ra "có người đã viết ở đây", mà đó
    đúng là thứ cần nói. Dòng cuối mỗi khổ ngắn hơn, vì một khối chữ mà mọi
    dòng dài bằng nhau đọc ra là một hoa văn."""
    hd = BOOK["hand"]
    ru = BOOK["rule"]
    for r in range(hd["rows"]):
        v = (r + 1) / (ru["count"] + 1)
        dai = 1.0 if (r + 1) % 4 else 0.42 + 0.3 * rnd(r * 3.1, 1.9)
        n = max(2, int(hd["per"] * dai))
        for k in range(n):
            u0 = ru["inset"] + 0.06 + (1 - 2 * ru["inset"] - 0.1) * (k / hd["per"])
            u1 = u0 + (1 - 2 * ru["inset"] - 0.1) / hd["per"] * (0.3 + 0.62
                                                                 * rnd(k * 5.3, r * 1.1))
            a = quad_pt(quad, u0, v - 0.012)
            b = quad_pt(quad, u1, v - 0.012)
            s = sang(*a)
            pts = wobble(a[0], a[1], b[0], b[1], hd["jitter"], r * 5.3 + k)
            # Mỗi vệt một độ dài và một độ đậm riêng, và cả hai lệch NHIỀU:
            # chín dòng vệt đều tăm tắp đọc ra một mã vạch, không ra chữ tay.
            ink.poly("so-tay", pts, P["paperInk"],
                     hd["width"] * (0.55 + 0.8 * rnd(k * 1.7, r * 2.3)),
                     (0.3 + 0.35 * rnd(k * 3.1, r)) * (0.5 + 0.6 * s))


def ve_phac_chom(ink, P, quad):
    """CHÒM SAO ĐANG ĐƯỢC DỰNG — không phải trang trí.

    Sổ của người quan trắc thì phải có thứ người ấy đang quan trắc, và nó là
    CÙNG MỘT HÌNH với bức phía trên. Đây là nét MANG TIN của bức này, nên nó
    đi qua sàn 3 : 1 ở `kiem_tuong_phan_net` như mọi nét mang tin khác."""
    sk = BOOK["sketch"]
    pts = [quad_pt(quad, 0.12 + p[0] * 0.78, 0.1 + p[1] * 0.74) for p in sk["stars"]]
    for a, b in sk["links"]:
        x1, y1 = pts[a]
        x2, y2 = pts[b]
        ink.poly("so-tay", wobble(x1, y1, x2, y2, 0.9, a * 3.7 + b),
                 P["paperInk"], sk["width"], sk["opacity"])
    for i, (x, y) in enumerate(pts):
        r = sk["r"] * (0.7 + rnd(i * 2.3, 4.1) * 0.9)
        seg = 10
        ink.fill("so-tay", pl([(x + math.cos(math.tau * k / seg) * r,
                                y + math.sin(math.tau * k / seg) * r)
                               for k in range(seg)], True), P["paperInk"], sk["opacity"])
        # Vòng tròn nhỏ quanh vài ngôi: dấu của người đo, không của người vẽ.
        if i % 3 == 0:
            rr = r + 2.6
            ink.poly("so-tay", [(x + math.cos(math.tau * k / 16) * rr,
                                 y + math.sin(math.tau * k / 16) * rr * 0.85)
                                for k in range(16)], P["paperInk"], 0.45, 0.6, close=True)


def ve_so_tay(ink, P):
    ve_trang(ink, P, TRANG_TRAI, False)
    ve_trang(ink, P, TRANG_PHAI, True)
    # GÂN GÁY: đường cong lồng nhau hai bên gáy — giấy không gập vuông góc.
    cu = BOOK["curl"]
    for i in range(cu["count"]):
        f = (i + 1) / cu["count"]
        for sgn in (-1, 1):
            pts = []
            for k in range(13):
                v = k / 12
                x, y = quad_pt(TRANG_PHAI if sgn > 0 else TRANG_TRAI, 0.012 + f * 0.052, v)
                pts.append((x + sgn * math.sin(math.pi * v) * cu["bulge"] * 0.12, y))
            ink.poly("so-tay", pts, P["paperEdge"], cu["width"],
                     0.55 - 0.3 * f)
    # DÀY TRANG ở mép gần và mép ngoài — xếp chồng nét mảnh.
    th = BOOK["thickness"]
    for quad in (TRANG_TRAI, TRANG_PHAI):
        for i in range(th["count"]):
            d = (i + 1) * th["gap"]
            a = quad_pt(quad, 0.0, 1.0)
            b = quad_pt(quad, 1.0, 1.0)
            ink.poly("so-tay", [(a[0] - d * 0.25, a[1] + d), (b[0] + d * 0.25, b[1] + d)],
                     P["paperEdge"] if i % 2 else P["paperRamp"][2], th["width"],
                     0.8 - i * 0.1)


# ═══════════════════════════════════════════════════════════════════════
# 12 · TẤM THẺ ĐỒNG và CHỮ KHẮC
# ═══════════════════════════════════════════════════════════════════════


def ve_the_dong(ink, P):
    q = THE_DONG
    ink.fill("the-dong", pl(q, True), ton_rgb_hex(P["brassRamp"], q, P))
    # 26 DẢI DỌC: dải phản quang chạy ngang tấm nên chia theo `v` (chiều dọc
    # tấm), không theo `u`. Chia sai trục là một dải sáng chạy dọc, tức một
    # nguồn sáng ở BÊN TRÁI tấm — và đèn không ở đó.
    n = 44
    for i in range(n):
        v0 = (i + (rnd(i * 5.3, 2.9) - 0.5) * 0.7) / n
        v1 = (i + 1 + (rnd((i + 1) * 5.3, 2.9) - 0.5) * 0.7) / n
        p = [quad_pt(q, 0.0, v0), quad_pt(q, 1.0, v0),
             quad_pt(q, 1.0, v1), quad_pt(q, 0.0, v1)]
        xm, ym = quad_pt(q, 0.5, (v0 + v1) / 2)
        ink.fill("the-dong", pl(p, True), ton_muot(P["brassRamp"], dong_t(xm, ym)),
                 1.0, solo=True)
    # VÂN XƯỚC: vệt song song ở −41°, KHÔNG −45°. Góc chẵn xếp thẳng hàng với
    # lưới điểm ảnh và đọc ra là hoa văn máy, không ra vết đánh bóng.
    sc = PLATE["scratch"]
    for i in range(int(sc["count"] * DENSITY)):
        u, v = rnd(i * 1.7, 2.3), rnd(i * 3.1, 7.9)
        x, y = quad_pt(q, u, v)
        L = sc["len"] * (1 - sc["lenJitter"] / 2 + rnd(i * 5.3, 1.1) * sc["lenJitter"])
        th = sc["angle"] + (rnd(i * 2.9, 4.7) - 0.5) * 0.06
        x2, y2 = x + math.cos(th) * L, y + math.sin(th) * L
        # Cắt về trong tấm: một vệt xước chạy ra ngoài mép là một vệt xước
        # trên mặt bàn, và mặt bàn không có đồng.
        if not (trong_da_giac(x, y, q) and trong_da_giac(x2, y2, q)):
            continue
        # VÊT XƯỚC ĐI THÀNH CỤM, không rải đều. Đồng đánh bóng bằng tay thì
        # vết xước tụ lại theo đường tay đi — rải đều cho ra một hình chữ nhật
        # GẠCH CHÉO, tức một hoa văn máy. Đọc được ngay trên PNG, và nó là
        # khuyết tật còn lại rõ nhất của vật này.
        cum = NZ.fbm(x * 0.022, y * 0.05, 3, 2.01, 0.55)
        if rnd(i * 9.1, 2.3) > 0.18 + 1.5 * cum:
            continue
        s = dong_t(x, y)
        # ~9 % là vệt SÁNG DÀI — một đường miết bắt đèn. Không có nó thì mặt
        # đồng chỉ có vết tối, tức mắt đọc ra đá mài chứ không ra kim loại.
        if rnd(i * 7.7, 3.3) < 0.09 + 0.22 * s:
            ink.poly("the-dong", [(x, y), (x2, y2)], P["brassScratchLit"],
                     sc["width"] * 1.6, min(0.75, sc["opacity"] * (1.4 + 2.2 * s)))
        else:
            ink.poly("the-dong", [(x, y), (x2, y2)], P["brassScratchDark"],
                     sc["width"], sc["opacity"] * (0.4 + 0.6 * min(1.0, s)))
    # MÉP VÁT: nét sáng ở hai mép bắt đèn (trên, trái), nét tối ở hai mép kia.
    bv = PLATE["bevel"]
    ins = bv["inset"]
    trong = [quad_pt(q, ins / 300 + 0.012, ins / 80 + 0.06),
             quad_pt(q, 1 - ins / 300 - 0.012, ins / 80 + 0.06),
             quad_pt(q, 1 - ins / 300 - 0.012, 1 - ins / 80 - 0.06),
             quad_pt(q, ins / 300 + 0.012, 1 - ins / 80 - 0.06)]
    for k in range(4):
        a, b = trong[k], trong[(k + 1) % 4]
        # Mép nào quay VỀ đèn thì sáng: pháp tuyến của mép so với hướng tới
        # đèn. Viết thẳng "mép trên sáng" là ghi cứng một hướng sáng ở chỗ thứ
        # hai, và hai chỗ sẽ lệch khi `ROOM_LAMP.at` đổi.
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        ex, ey = b[0] - a[0], b[1] - a[1]
        eL = math.hypot(ex, ey) or 1.0
        nx, ny = ey / eL, -ex / eL
        lx, ly = LAMP["at"]["x"] - mx, LAMP["at"]["y"] - my
        lL = math.hypot(lx, ly) or 1.0
        dp = nx * lx / lL + ny * ly / lL
        ink.poly("the-dong", wobble(a[0], a[1], b[0], b[1], 0.5, k * 3.1),
                 P["brassScratchLit"] if dp > 0 else P["brassScratchDark"],
                 bv["width"], 0.45 + 0.4 * abs(dp))
    # ĐINH TÁN bốn góc — vật nhỏ, nhưng là thứ nói ra tấm thẻ được VÍT vào
    # một cái gì, không phải một hình chữ nhật dán lên.
    rv = PLATE["rivets"]
    for u, v in ((0.028, 0.16), (0.972, 0.16), (0.028, 0.84), (0.972, 0.84)):
        x, y = quad_pt(q, u, v)
        seg = 12
        ink.fill("the-dong", pl([(x + math.cos(math.tau * k / seg) * rv["r"],
                                  y + math.sin(math.tau * k / seg) * rv["r"] * 0.85)
                                 for k in range(seg)], True), P["brassScratchDark"], 0.8)
        ink.poly("the-dong", [(x - rv["r"] * 0.5, y - rv["r"] * 0.45),
                              (x + rv["r"] * 0.1, y - rv["r"] * 0.62)],
                 P["brassScratchLit"], 1.1, 0.8)


def ton_rgb_hex(ramp, quad, P) -> str:
    xm, ym = quad_pt(quad, 0.5, 0.5)
    return ton(ramp, dong_t(xm, ym), xm, ym)


def dong_chu():
    """Vị trí từng dòng chữ khắc — MỘT chỗ cho cả lượt vẽ lẫn lượt đo tương
    phản. Hai chỗ là hai toạ độ sẽ lệch, và lệch ở đây nghĩa là phép đo nói
    4,7 : 1 trong khi chữ nằm trên một chỗ đồng khác."""
    t = PLATE["text"]
    ra = [(t["x"], t["y"], COPY["title"], t["titleSize"], 700)]
    for i, s in enumerate(COPY["rows"]):
        ra.append((t["x"], t["y"] + t["lead"] * (i + 1) + 2, s, t["size"], 400))
    return ra


def ve_chu(ink, P):
    """CHỮ KHẮC — hai lượt, và thứ tự của chúng là thứ tự ánh sáng.

    Khắc nổi nét sáng (`brightcut`): rãnh cắt lộ ra đồng thô SÁNG, còn thành
    rãnh phía quay về đèn nằm trong bóng của chính nó. Nên: một bản chữ TỐI
    lệch LÊN-TRÁI (về phía đèn) trước, rồi bản chữ SÁNG phủ lên.

    Lệch xuống-phải là đổ bóng NGOÀI, tức chữ nổi lên khỏi mặt tấm — ngược hẳn
    với "khắc", và nó đọc ra ngay là sai vì mọi bóng khác trong bức đi
    xuống-phải."""
    t = PLATE["text"]
    for x, y, s, size, weight in dong_chu():
        ink.text("chu", x + t["reliefDx"], y + t["reliefDy"], s, P["plateCutShade"],
                 size, weight, tracking=t["tracking"])
        ink.text("chu", x, y, s, P["plateCut"], size, weight, tracking=t["tracking"])


# ═══════════════════════════════════════════════════════════════════════
# 13 · HAI DỤNG CỤ
# ═══════════════════════════════════════════════════════════════════════


def ve_thuoc(ink, P):
    """THƯỚC — cái thước là ẩn dụ của chính kho mã này (`raster.py` là "cái
    thước"), nên nó không phải đồ trang trí rải thêm.

    Nó nằm gần đèn nhất nên là vật gỗ SÁNG nhất bức, và phần phải của nó TỤT
    XUỐNG DƯỚI sổ tay — thứ tự lớp lo việc đó, và đó là chỗ duy nhất trong bức
    chứng minh "vật gần che vật xa" bằng một vật bị che thật."""
    r = TOOLS["ruler"]
    q = THUOC
    ink.fill("thuoc", pl(q, True), ton(P["rulerRamp"], thuoc_t(*quad_pt(q, 0.5, 0.5)),
                                       *quad_pt(q, 0.5, 0.5)))
    n = 24
    for i in range(n):
        u0, u1 = i / n, (i + 1) / n
        p = [quad_pt(q, u0, 0.0), quad_pt(q, u1, 0.0),
             quad_pt(q, u1, 1.0), quad_pt(q, u0, 1.0)]
        xm, ym = quad_pt(q, (u0 + u1) / 2, 0.5)
        ink.fill("thuoc", pl(p, True), ton_muot(P["rulerRamp"], thuoc_t(xm, ym)),
                 1.0, solo=True)
    # Thớ gỗ hoàng dương: vệt dọc theo thân thước, rất mảnh.
    gr = r["grain"]
    for i in range(int(gr["count"] * DENSITY)):
        u, v = rnd(i * 1.9, 3.3), rnd(i * 5.7, 2.1)
        a = quad_pt(q, u, v)
        b = quad_pt(q, min(1.0, u + 0.04 + rnd(i * 3.1, 8.3) * 0.08), v + (rnd(i, 1) - 0.5) * 0.06)
        ink.poly("thuoc", [a, b], P["rulerTick"] if rnd(i * 7.1, 4.3) < 0.4
                 else P["rulerRamp"][3], gr["width"], gr["opacity"])
    # VẠCH CHIA — nét MANG TIN: nó là thứ làm cái thước thành cái thước. Đi
    # qua sàn 3 : 1 ở `kiem_tuong_phan_net`.
    tk = r["ticks"]
    for i in range(tk["per"] + 1):
        u = i / tk["per"]
        lon = i % tk["major"] == 0
        L = (tk["majorLen"] if lon else tk["len"]) / (2 * r["half"])
        a = quad_pt(q, u, 0.06)
        b = quad_pt(q, u, 0.06 + L)
        ink.poly("thuoc", [a, b], P["rulerTick"], tk["width"] * (1.5 if lon else 1.0), 0.9)
    # Mép trên bắt đèn, mép dưới trong bóng của chính thân thước.
    ink.poly("thuoc", [q[0], q[1]], P["rulerRamp"][3], 1.2, 0.8)
    ink.poly("thuoc", [q[3], q[2]], P["rulerTick"], 1.4, 0.5)


def com_pa_poly():
    d = TOOLS["divider"]
    hx, hy = d["hinge"]["x"], d["hinge"]["y"]
    out = []
    for leg in d["legs"]:
        out.append(((hx, hy), (leg["x"], leg["y"])))
    return out


def com_pa_quads():
    """Tứ giác CHE của hai chân com-pa, cộng đĩa khớp xoay (xấp xỉ bằng một
    tứ giác). `che_boi` đọc danh sách này — xem chú thích ở đó."""
    d = TOOLS["divider"]
    ra = []
    for a, b in com_pa_poly():
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / L * d["width"], dx / L * d["width"]
        ra.append([(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny),
                   (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)])
    r = d["knurl"]["r"]
    hx, hy = d["hinge"]["x"], d["hinge"]["y"]
    ra.append([(hx - r, hy - r), (hx + r, hy - r), (hx + r, hy + r), (hx - r, hy + r)])
    return ra


def ve_com_pa(ink, P):
    """COM-PA — thứ vẽ ra 128 vòng đồng tâm, nên nó cũng mang nghĩa.

    Nó nằm NGANG TRÊN sổ tay, nên bóng của nó rơi lên GIẤY chứ không lên gỗ:
    chỗ duy nhất trong bức chứng minh được bóng đổ bám theo vật BÊN DƯỚI chứ
    không phải một vệt đen dán lên mặt bàn.

    Mỗi chân ba nét: sáng ở phía quay về đèn (trên-trái), tối ở phía kia, một
    nét giữa. Ba nét thay cho một hình tô là cách rẻ nhất để một thanh kim
    loại mảnh có khối."""
    d = TOOLS["divider"]
    for (a, b) in com_pa_poly():
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / L, dx / L
        # Pháp tuyến nào quay VỀ đèn thì mang nét sáng — không ghi cứng "bên
        # trên", vì `ROOM_LAMP.at` đổi là hướng ấy đổi theo.
        lx, ly = LAMP["at"]["x"] - (a[0] + b[0]) / 2, LAMP["at"]["y"] - (a[1] + b[1]) / 2
        lL = math.hypot(lx, ly) or 1.0
        if nx * lx / lL + ny * ly / lL < 0:
            nx, ny = -nx, -ny
        w = d["width"]
        for off, mau, ww in ((-w * 0.34, P["steelRamp"][3], w * 0.34),
                             (0.0, P["steelRamp"][2], w * 0.42),
                             (w * 0.36, P["steelRamp"][0], w * 0.38)):
            ink.poly("com-pa",
                     wobble(a[0] + nx * off, a[1] + ny * off,
                            b[0] + nx * off * 0.5, b[1] + ny * off * 0.5, 0.6, off * 3),
                     mau, ww, 0.95)
        # KIM: mũi nhọn, nét mảnh dần — và nó CHẠM mặt giấy, nên có một chấm
        # tối ngay dưới mũi (bóng tiếp xúc nhỏ nhất của bức).
        ux, uy = dx / L, dy / L
        ink.poly("com-pa", [(b[0] - ux * d["needle"], b[1] - uy * d["needle"]), b],
                 P["steelRamp"][3], 1.5, 0.95)
        ink.stroke("com-pa", dot(b[0] + 1.4, b[1] + 1.2), P["shadow"], 2.6, 0.6)
    # KHỚP XOAY: đĩa có khía. `teeth` nét ngắn toả ra từ tâm.
    kn = d["knurl"]
    hx, hy = d["hinge"]["x"], d["hinge"]["y"]
    seg = 18
    ink.fill("com-pa", pl([(hx + math.cos(math.tau * k / seg) * kn["r"],
                            hy + math.sin(math.tau * k / seg) * kn["r"] * 0.9)
                           for k in range(seg)], True), P["steelRamp"][1])
    for k in range(kn["teeth"]):
        th = math.tau * k / kn["teeth"]
        f = 0.5 + 0.5 * math.cos(th - math.atan2(LAMP["at"]["y"] - hy, LAMP["at"]["x"] - hx))
        ink.poly("com-pa", [(hx + math.cos(th) * kn["r"] * 0.5,
                             hy + math.sin(th) * kn["r"] * 0.45),
                            (hx + math.cos(th) * kn["r"] * 0.97,
                             hy + math.sin(th) * kn["r"] * 0.88)],
                 P["steelRamp"][3] if f > 0.6 else P["steelRamp"][0], 0.9, 0.5 + 0.4 * f)
    ink.fill("com-pa", pl([(hx + math.cos(math.tau * k / 12) * kn["r"] * 0.3,
                            hy + math.sin(math.tau * k / 12) * kn["r"] * 0.28)
                           for k in range(12)], True), P["steelRamp"][0], 0.9)


# ═══════════════════════════════════════════════════════════════════════
# 14 · PHÉP ĐO — tệp này tự gác, không nhận một lời dặn
# ═══════════════════════════════════════════════════════════════════════


def do_buoc_dai(P):
    """BƯỚC LƯỢNG TỬ giữa hai vòng ánh đèn kề nhau, theo MÃ MÀU 0..255.

    Con số khép câu hỏi "có thấy dải không": bản đồ sao đo được 128 vòng cho
    1,78 mã mỗi vòng (dưới ngưỡng thấy dải ≈ 2 mã) trong khi 16 vòng cho 14,3
    mã — thấy rõ, và đó là MỘT PHẦN của cái "mảng phẳng tô gradient". Đo trên
    đường nối tâm vệt sáng ra mép, tại chính bán kính của từng vòng."""
    n = LAMP["levels"]
    base = hex_rgb(P["deskRamp"][1])
    xau = 0.0
    tai = 0.0
    for i in range(n - 1):
        r0 = lamp_r_of_A((i + 1) / n)
        r1 = lamp_r_of_A((i + 2) / n)
        a = pool_rgb_re(base, r0, P)
        b = pool_rgb_re(base, r1, P)
        dd = max(abs(a[k] - b[k]) for k in range(3))
        if dd > xau:
            xau, tai = dd, r0
    return xau, tai


def do_tuong_phan_chu(P):
    """TƯƠNG PHẢN CỦA TỪNG DÒNG CHỮ với nền tại ĐÚNG CHỖ nó nằm — sàn 4,5 : 1.

    Đo lại MỖI LẦN, vì đổi câu chữ là đổi bề rộng dòng, tức đổi chỗ nó phủ
    lên, tức đổi nền sau chữ. Và đo bằng `nen_rgb`, cùng hàm mà mọi phép đo
    khác dùng: hai công thức là hai con số sẽ lệch, và lệch ở đây nghĩa là
    phép đo nói 4,7 : 1 trong khi chữ nằm trên một chỗ đồng khác."""
    ra = []
    for x, y, s, size, _w in dong_chu():
        # Bề rộng xấp xỉ: 0,52 em mỗi ký tự cho serif hoa + tracking.
        wid = len(s) * size * (0.52 + PLATE["text"]["tracking"])
        te = 99.0
        tai = (x, y)
        for k in range(9):
            px = x + wid * (k + 0.5) / 9
            py = y - size * 0.35
            tp = tuong_phan(nen_rgb(px, py, P), hex_rgb(P["plateCut"]))
            if tp < te:
                te, tai = tp, (round(px), round(py))
        ra.append((s, te, tai))
    return ra


def kiem_tuong_phan_chu(P, san=None):
    san = BUDGET["textMin"] if san is None else san
    ra = do_tuong_phan_chu(P)
    te = [r for r in ra if r[1] < san]
    if te:
        x = min(te, key=lambda r: r[1])
        raise SystemExit(
            "CHỮ KHẮC KHÔNG ĐẠT %.1f:1 (WCAG 1.4.3): %r chỉ còn %.2f:1 tại %s — %d dòng "
            "trượt. Chú giải là thứ MANG TIN của bức, nên nó không chữa bằng cách dìm "
            "chữ cho đẹp: nâng `ROOM_LIT.brassBase`, `ROOM_PLATE.spec.gain`, hay đổi "
            "`plateCut`." % (san, x[0], x[1], x[2], len(te)))
    return min(r[1] for r in ra)


def do_tuong_phan_net(P):
    """TƯƠNG PHẢN CỦA NÉT MANG TIN với nền tại chỗ nó nằm — sàn 3 : 1 (WCAG
    1.4.11 cho thành phần đồ hoạ mang tin).

    Hai nhóm nét, và cả hai MANG TIN chứ không phải chất liệu: phác chòm sao
    trên trang phải (nó nói bức trên là cái gì) và vạch chia trên thước (nó
    làm cái thước thành cái thước). Thớ gỗ, sợi giấy, vân xước KHÔNG đi qua
    sàn này — chúng là chất liệu, và một sàn tương phản áp cho chất liệu là
    cách chắc chắn nhất để xoá chất liệu."""
    ra = []
    sk = BOOK["sketch"]
    pts = [quad_pt(TRANG_PHAI, 0.12 + p[0] * 0.78, 0.1 + p[1] * 0.74) for p in sk["stars"]]
    for a, b in sk["links"]:
        for k in range(5):
            t = (k + 0.5) / 5
            x = pts[a][0] + (pts[b][0] - pts[a][0]) * t
            y = pts[a][1] + (pts[b][1] - pts[a][1]) * t
            if che_boi(x, y, "so-tay"):
                continue
            nen = nen_rgb(x, y, P)
            mau = over(nen, hex_rgb(P["paperInk"]), sk["opacity"])
            ra.append(("phác chòm", tuong_phan(nen, mau), (round(x), round(y))))
    r = TOOLS["ruler"]
    tk = r["ticks"]
    for i in range(tk["per"] + 1):
        u = i / tk["per"]
        x, y = quad_pt(THUOC, u, 0.1)
        if che_boi(x, y, "thuoc"):
            continue
        nen = nen_rgb(x, y, P)
        mau = over(nen, hex_rgb(P["rulerTick"]), 0.9)
        ra.append(("vạch thước", tuong_phan(nen, mau), (round(x), round(y))))
    return ra


def kiem_tuong_phan_net(P, san=None):
    san = BUDGET["inkMin"] if san is None else san
    ra = do_tuong_phan_net(P)
    te = [r for r in ra if r[1] < san]
    if te:
        x = min(te, key=lambda r: r[1])
        raise SystemExit(
            "NÉT MANG TIN KHÔNG ĐẠT %.1f:1 (WCAG 1.4.11): %s chỉ còn %.2f:1 tại %s — "
            "%d điểm trượt. Nét mang tin phải đọc được ở MỌI chỗ nó đi qua."
            % (san, x[0], x[1], x[2], len(te)))
    return min(r[1] for r in ra)


def kiem_bong_mot_nguon():
    """MỌI BÓNG LỆCH XUỐNG-PHẢI — phép kiểm của thứ thứ hai trong bốn thứ bức
    này tồn tại để có.

    Và đây là chỗ nó khác `box-shadow`: CSS toả bóng ĐỀU bốn phía nên không
    chỉ về nguồn nào, còn ở đây mỗi điểm bóng đi RA KHỎI đèn. Kiểm trên TÂM
    của từng bóng chứ từng điểm: vật nằm NGAY DƯỚI đèn (cái đế) có nửa trái
    đổ hơi sang trái, và đó là đúng — nhưng tâm của nó vẫn phải xuống-dưới.

    `dy > 0` cho MỌI điểm: không một vật nào trong bức được đổ bóng LÊN TRÊN,
    vì không có nguồn sáng nào ở dưới mặt bàn."""
    loi = []
    for ten, poly, h in VAT_BONG:
        cx = sum(p[0] for p in poly) / len(poly)
        cy = sum(p[1] for p in poly) / len(poly)
        ox, oy = lech_bong(cx, cy, h)
        if ox < 0 or oy <= 0:
            loi.append("%s: tâm bóng lệch (%.1f, %.1f)" % (ten, ox, oy))
        for x, y in poly:
            _, py = lech_bong(x, y, h)
            if py <= 0:
                loi.append("%s: điểm (%.0f, %.0f) đổ bóng LÊN TRÊN" % (ten, x, y))
                break
    if loi:
        raise SystemExit(
            "BÓNG KHÔNG NHẤT QUÁN MỘT NGUỒN — đèn ở (%g, %g) nên mọi bóng phải lệch "
            "xuống-phải:\n  %s" % (LAMP["at"]["x"], LAMP["at"]["y"], "\n  ".join(loi)))
    return len(VAT_BONG)


def kiem_mep_trong(svg: str):
    """TRÊN MÉP BÀN KHÔNG CÓ NÉT NÀO — trừ cái đèn, nó CHE mép theo chủ ý.

    Vết cắt chỉ là vết cắt khi phía trên nó TRỐNG: một nét lạc lên đó là một
    vệt sơn trên bầu trời, và nó sẽ đọc ra là lỗi render chứ không ra tiền
    cảnh. Kiểm bằng cách đọc lại CHÍNH TỆP đã sinh: mọi lớp trừ `den` phải có
    `y` nhỏ nhất ≥ mép bàn thấp nhất."""
    # Trần = mép bàn thấp nhất, TRỪ nét tối của chính cái mép (`rim.drop`):
    # nét ấy ở trên mép theo chủ ý — nó là cạnh bàn ngược sáng, tức nửa trên
    # của vết cắt. Mọi nét khác phải ở dưới.
    tran = (DESK["edgeY"] - DESK["edgeWobble"]
            - DESK["rim"]["drop"] * 0.4 - 1)
    loi = []
    for m in re.finditer(r'<g data-lop="([^"]+)">([\s\S]*?)</g>\s*(?=<g data-lop=|</svg>)',
                         svg):
        lop, than = m.group(1), m.group(2)
        if lop == "den":
            continue
        ys = []
        for p in re.finditer(r'\sd="([^"]*)"', than):
            # Tách theo LỆNH, không theo một regex gộp: `M` đặt lại con trỏ
            # tuyệt đối còn `l` cộng dồn tương đối, và một `d` của tệp này gộp
            # nhiều subpath (`M… l… Z M… l…`). Cộng dồn xuyên qua một `M` là
            # một con số bịa — nó sẽ báo lỗi ở chỗ không có lỗi, hoặc tệ hơn,
            # im lặng ở chỗ có.
            cur = 0.0
            for m2 in re.finditer(r'([Mlhv])\s*(-?[\d.]+)(?:[ ,]+(-?[\d.]+))?',
                                  p.group(1)):
                cmd = m2.group(1)
                if cmd == "M":
                    cur = float(m2.group(3))
                elif cmd == "l":
                    cur += float(m2.group(3))
                elif cmd == "v":
                    cur += float(m2.group(2))
                else:
                    continue
                ys.append(cur)
        for p in re.finditer(r'<text x="-?[\d.]+" y="(-?[\d.]+)"', than):
            ys.append(float(p.group(1)))
        if ys and min(ys) < tran:
            loi.append("%s: có nét ở y = %.0f (mép bàn ở %.0f)" % (lop, min(ys), tran))
    if loi:
        raise SystemExit(
            "NÉT LỌT LÊN TRÊN MÉP BÀN — chỗ ấy để tấm trời lọt qua, một nét ở đó là "
            "một vệt sơn trên bầu trời:\n  %s" % "\n  ".join(loi))


def do_ngan_sach(P):
    """ĐO phân bố ĐỘ CHÓI trên MẶT BÀN rồi trả về bảng số — `main` chặn build.

    Tám bậc, và cái phải đọc là HÌNH DẠNG của phân bố. Chẩn đoán của lời chê
    thứ năm ở bản đồ sao là MỘT con số: 89,7 % diện tích ở L < 0,01 và 2,55 %
    ở một mảng phẳng chói, tức một hàm HAI giá trị — còn khung tham chiếu có
    46,8 % ở các bậc GIỮA. Cái lỗ ấy CHÍNH LÀ "sơ đồ chứ không phải tranh".

    Đo trên mặt bàn (dưới mép xa), không trên cả khung: phần trên mép là chỗ
    TRỐNG để trời lọt qua, đếm nó vào là đếm một thứ bức này không vẽ — và nó
    sẽ nhồi bậc "đen sâu" một cách vô nghĩa."""
    step = BUDGET["sampleStep"]
    Ls = []
    for i in range(0, int(W), step):
        x = i + step / 2
        for j in range(0, int(H), step):
            y = j + step / 2
            if not tren_ban(x, y):
                continue
            Ls.append(luminance(nen_rgb(x, y, P)))
    Ls.sort()
    o = len(Ls)
    moc = BUDGET["bands"]
    dem = [0] * (len(moc) + 1)
    for L in Ls:
        k = 0
        while k < len(moc) and L > moc[k]:
            k += 1
        dem[k] += 1
    lo, hi = BUDGET["midLo"], BUDGET["midHi"]
    return {
        "o": o,
        "trung_vi": Ls[o // 2],
        "p99": Ls[int(o * 0.99)],
        "sang": sum(1 for L in Ls if L > 0.5) / o,
        "bac": [c / o for c in dem],
        "mid": sum(1 for L in Ls if lo < L <= hi) / o,
    }


def kiem_ngan_sach(P):
    d = do_ngan_sach(P)
    if d["mid"] < BUDGET["midShareMin"]:
        raise SystemExit(
            "BẬC GIỮA chỉ %.1f%% diện tích mặt bàn, dưới sàn %.0f%% — một bức chỉ có "
            "đen sâu và mảng chói là một hàm HAI giá trị, tức sơ đồ chứ không phải "
            "tranh (đúng chẩn đoán của lời chê thứ năm ở bản đồ sao: 89,7%% ở L<0,01). "
            "Nới `ROOM_LAMP.profile` ở phần đuôi, hay nâng `ROOM_LIT.ambient`."
            % (d["mid"] * 100, BUDGET["midShareMin"] * 100))
    if d["trung_vi"] > BUDGET["medianMax"]:
        raise SystemExit(
            "TRUNG VỊ ĐỘ CHÓI %.3f vượt trần %g — cả mặt bàn đang sáng đều, tức cái "
            "nguồn sáng duy nhất thôi là một nguồn sáng. Hạ `ROOM_LIT.ambient`."
            % (d["trung_vi"], BUDGET["medianMax"]))
    if d["sang"] < BUDGET["brightShareMin"]:
        raise SystemExit(
            "chỉ %.3f%% diện tích trên L>0,5, dưới sàn %.1f%% — không có chỗ nào RỰC, "
            "nên cái đèn không đọc ra là một nguồn sáng. Nới `ROOM_LAMP.profile` ở "
            "phần lõi." % (d["sang"] * 100, BUDGET["brightShareMin"] * 100))
    return d


# ═══════════════════════════════════════════════════════════════════════
# 15 · DỰNG BỨC
# ═══════════════════════════════════════════════════════════════════════

# (tên, đa giác, độ cao biểu kiến) — `kiem_bong_mot_nguon` đọc lại danh sách
# này, nên một vật được vẽ bóng mà không khai ở đây là một vật không được kiểm.
VAT_BONG: list[tuple[str, list, float]] = []


def de_den_poly():
    bs = LAMP["shade"]["base"]
    cx = LAMP["at"]["x"]
    seg = 20
    return [(cx + math.cos(math.tau * k / seg) * bs["rx"],
             bs["y"] + math.sin(math.tau * k / seg) * bs["ry"]) for k in range(seg)]


def build(P) -> Ink:
    ink = Ink()
    BONG.clear()
    VAT_BONG.clear()
    h = SHADOW["height"]

    ve_mat_ban(ink, P)
    ve_tho_go(ink, P)
    ve_mat_go(ink, P)
    ve_khe_van(ink, P)
    ve_vung_sang(ink, P)
    ve_mep_ban(ink, P)

    # Bóng vật XA trước, rồi vật xa; bóng vật GẦN sau, nên nó rơi ĐƯỢC lên vật
    # xa. Gộp cả vào một lớp là bóng com-pa biến mất dưới sổ tay.
    for ten, poly, hh, lop, tx in (
        ("thẻ đồng", THE_DONG, h["plate"], "bong-xa", (2, 3)),
        ("thước", THUOC, h["ruler"], "bong-xa", (2, 3)),
    ):
        VAT_BONG.append((ten, poly, hh))
        ve_bong(ink, lop, poly, hh, P, tx)
    ve_the_dong(ink, P)
    ve_thuoc(ink, P)

    for ten, poly, hh, tx in (
        ("sổ tay trái", TRANG_TRAI, h["book"], (2, 3)),
        ("sổ tay phải", TRANG_PHAI, h["book"], (2, 3)),
        ("đế đèn", de_den_poly(), h["lampBase"], None),
    ):
        VAT_BONG.append((ten, poly, hh))
        ve_bong(ink, "bong-giua", poly, hh, P, tx)
    ve_so_tay(ink, P)

    for i, (a, b) in enumerate(com_pa_poly()):
        d = TOOLS["divider"]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / L * d["width"] * 0.6, dx / L * d["width"] * 0.6
        poly = [(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny),
                (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)]
        VAT_BONG.append(("com-pa chân %d" % (i + 1), poly, h["divider"]))
        ve_bong(ink, "bong-gan", poly, h["divider"], P, None)
    ve_com_pa(ink, P)

    ve_quang_den(ink, P)
    ve_den(ink, P)
    ve_chu(ink, P)
    return ink


# ═══════════════════════════════════════════════════════════════════════
# 16 · main
# ═══════════════════════════════════════════════════════════════════════


def main():
    ap = argparse.ArgumentParser(description="Sinh tiền cảnh bàn quan trắc (SVG)")
    ap.add_argument("--profile", default="dark",
                    help="tên profile màu trong room-art.ts (dark | light)")
    ap.add_argument("--out", default=None, help="thư mục xuất (mặc định public/map/room)")
    ap.add_argument("--stats", action="store_true", help="in bảng đếm nét từng lớp")
    ap.add_argument("--do", action="store_true",
                    help="in bảng số đo (độ chói, tương phản, bước dải), không ghi tệp")
    args = ap.parse_args()

    name = "ROOM_PROFILE_%s" % args.profile.upper()
    if not re.search(r"export const %s\b" % name, SRC):
        raise SystemExit(
            "room-art.ts chưa có %s. Bộ sinh KHÔNG biết màu nào cả — thêm một profile "
            "ở TS là chạy được ngay, không phải sửa tệp này." % name)
    P = grab(name)

    ink = build(P)

    if args.do:
        # ĐO rồi IN rồi mới GÁC: `--do` là cái kính hiển vi của người đang
        # dựng, và trượt sàn trước khi in bảng là lấy đi đúng cái bảng cần đọc
        # để biết phải sửa chỗ nào. Đường dựng tệp thì gác TRƯỚC khi ghi.
        d = do_ngan_sach(P)
        buoc, tai = do_buoc_dai(P)
        print()
        print("  nét tổng           %d" % ink.n)
        print("  trung vị độ chói   %.4f   (trần %g)" % (d["trung_vi"], BUDGET["medianMax"]))
        print("  phân vị 99         %.4f" % d["p99"])
        print("  %% diện tích L>0,5  %.3f%%  (sàn %.1f%%)"
              % (d["sang"] * 100, BUDGET["brightShareMin"] * 100))
        print("  bước dải xấu nhất  %.2f/255 mã màu tại r=%.0f  (trần %g — bản đồ sao đo "
              "1,78 với 128 vòng, 14,3 với 16 vòng)" % (buoc, tai, BUDGET["bandStepMax"]))
        print("  bóng đã kiểm       %d vật" % len(VAT_BONG))
        print()
        ten = ["đen sâu  < 0,01", "nền     0,01–0,03", "0,03–0,08", "0,08–0,18",
               "0,18–0,35", "0,35–0,60", "0,60–0,85", "rực     > 0,85"]
        print("  bậc độ chói trên MẶT BÀN (%d mẫu)" % d["o"])
        for i, t in enumerate(ten):
            print("  %-20s %7.2f%%" % (t, d["bac"][i] * 100))
        print("  %-20s %7.2f%%   (sàn %.0f%%)"
              % ("BẬC GIỮA 0,03–0,85", d["mid"] * 100, BUDGET["midShareMin"] * 100))
        print()
        for s, tp, tai in do_tuong_phan_chu(P):
            print("  chữ %-28s %6.2f:1 tại %s  (sàn %g)"
                  % (s[:28], tp, tai, BUDGET["textMin"]))
        xau = {}
        for ten_n, tp, tai in do_tuong_phan_net(P):
            if ten_n not in xau or tp < xau[ten_n][0]:
                xau[ten_n] = (tp, tai)
        for ten_n, (tp, tai) in xau.items():
            print("  nét %-28s %6.2f:1 tại %s  (sàn %g)"
                  % (ten_n, tp, tai, BUDGET["inkMin"]))
        print()
        kiem_bong_mot_nguon()
        kiem_ngan_sach(P)
        kiem_tuong_phan_chu(P)
        kiem_tuong_phan_net(P)
        return

    if args.stats:
        print()
        for lop in LAYERS:
            b = ink.buckets[lop]
            print("  %-12s %7d nét  %4d nhóm"
                  % (lop, sum(len(v) for v in b.values()), len(b)))
        print()

    # GÁC TRƯỚC KHI GHI MỘT BYTE NÀO.
    kiem_bong_mot_nguon()
    kiem_ngan_sach(P)
    kiem_tuong_phan_chu(P)
    kiem_tuong_phan_net(P)
    buoc, tai = do_buoc_dai(P)
    if buoc > BUDGET["bandStepMax"]:
        raise SystemExit(
            "BƯỚC DẢI %.2f/255 mã màu tại r=%.0f, vượt trần %g — mắt thấy được từng "
            "vòng ánh đèn, tức cái dốc sáng đọc ra là %d cái vòng. Nâng "
            "`ROOM_LAMP.levels`." % (buoc, tai, BUDGET["bandStepMax"], LAMP["levels"]))

    svg = ink.render(COPY["alt"])
    for xau_tu in ("Gradient", "gradient", "<filter", "feTurbulence", ' id="', "data-"):
        if xau_tu in svg.replace('data-lop="', ""):
            raise SystemExit(
                "SVG sinh ra `%s` — luật 3 và 4 ở đầu tệp không có ngoại lệ. Gradient "
                "là cái lỗi bức này tồn tại để chữa; `id`/`data-*` là byte chết vì "
                "tranh vào trang bằng `<img>` nên không selector nào với vào trong "
                "được." % xau_tu)
    kiem_mep_trong(svg)

    # TRẦN GÁC TRƯỚC KHI GHI, không sau: một lần chạy trượt mà vẫn để lại một
    # tệp quá khổ trong `public/` là một tệp sẽ lên production qua commit sau,
    # và thông báo lỗi thì đã cuộn mất khỏi màn hình từ lâu.
    kb = len(svg.encode("utf-8")) / 1024
    if kb > MAX_KB:
        raise SystemExit(
            "vượt trần %d KB — hạ DENSITY, hay hạ `ROOM_DESK.grain.per`. Tiền cảnh nằm "
            "NGAY TRÊN màn hình đầu tiên nên nó vào LCP cùng tấm trời, và tấm trời đã "
            "lấy 285 KB của ngân sách 900 KB." % MAX_KB)

    out_dir = Path(args.out) if args.out else OUT
    # `os.makedirs` chứ không `Path.mkdir`: trên Windows + Python 3.14,
    # `mkdir(exist_ok=True)` vẫn ném WinError 183 với một thư mục đã có.
    os.makedirs(out_dir, exist_ok=True)
    f = out_dir / "room-ban.svg"
    f.write_text(svg, encoding="utf-8")
    print("%-22s %7d nét %8.1f KB  (trần %d)" % (f.name, ink.n, kb, MAX_KB))
    print("  bước dải %.2f/255 mã màu · bậc giữa %.1f%% · %d vật có bóng"
          % (buoc, do_ngan_sach(P)["mid"] * 100, len(VAT_BONG)))


if __name__ == "__main__":
    main()
