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
#
# TRẦN NAY SỐNG Ở `ROOM_FORMATS[].maxKb`, MỘT CON SỐ MỖI KHỔ — không một hằng
# chung. Bản dọc hiển thị 390 đơn vị trên 390 px (bản ngang: 1 360 đơn vị trên
# 2 350 px), nên cùng một mật độ nét cho bản dọc là chi tiết dưới một điểm ảnh,
# tức byte chết trên mạng điện thoại. Hai khổ, hai ngân sách, hai lý lẽ.

# Mật độ cả bức, hạ/nâng theo KHỔ (`ROOM_FORMATS[].density`) — `dung_kho` gán
# lại. Vẫn là một con số duy nhất như `DENSITY` của build_sky.py.
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
PENCIL = grab("ROOM_PENCIL")
SHADOW = grab("ROOM_SHADOW")
BUDGET = grab("ROOM_BUDGET")
LIT = grab("ROOM_LIT")
COPY = grab("ROOM_COPY")
FORMATS = grab("ROOM_FORMATS")

# Hồ sơ GỐC, giữ nguyên để `dung_kho` luôn trộn từ nó chứ từ bản đã trộn lần
# trước — trộn chồng lên nhau thì khổ thứ hai thừa hưởng những gì khổ thứ nhất
# ghi đè, và thứ tự sinh tệp sẽ đổi được bức tranh.
_GOC = {"desk": DESK, "lamp": LAMP, "book": BOOK, "plate": PLATE, "tools": TOOLS}

W, H = FRAME["width"], FRAME["height"]
# Tập vật được VẼ ở khổ đang dựng. Bản dọc bỏ sổ và thẻ đồng — xem
# `ROOM_FORMATS` ở TS để biết vì sao, và nhớ rằng MỌI phép đo cũng phải đọc
# tập này: một phép đo tương phản chạy trên một cuốn sổ không được vẽ là một
# con số nói về một bức tranh không tồn tại.
VE = {"den", "so-tay", "the-dong", "thuoc", "com-pa"}
# Ngưỡng "có chỗ RỰC" — theo KHỔ, vì nó phụ thuộc vật liệu có trong khung.
# Xem `ROOM_FORMATS[].brightAt` ở TS.
BRIGHT_AT = 0.5


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
    xuyến" mà bản gradient đang là.

    BÁN KÍNH CỦA BẢNG nhân `spread` (theo KHỔ): đèn ở xa hơn cho vũng sáng
    rộng hơn và dốc thoải hơn, chứ không mạnh hơn. Xem `ROOM_LAMP.spread`."""
    tb = LAMP["profile"]
    re = re / max(1e-6, LAMP["spread"])
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
    k = LAMP["spread"]
    if a >= tb[0][1]:
        r = tb[0][0]
        for rr, aa in tb:
            if aa >= a:
                r = rr
            else:
                break
        return r * k
    for i in range(1, len(tb)):
        r0, a0 = tb[i - 1]
        r1, a1 = tb[i]
        if a1 <= a <= a0:
            if a0 == a1:
                return r1 * k
            return (r0 + (r1 - r0) * ((a0 - a) / (a0 - a1))) * k
    return tb[-1][0] * k


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


def thuoc_canh_quad():
    """MẶT BÊN của thước — tứ giác tụt xuống dưới MÉP GẦN.

    MÉP GẦN LÀ `[0] → [1]`, không `[3] → [2]`, và chỗ này đã sai một lần.
    `thuoc_quad` dựng tứ giác theo `(a+n, b+n, b−n, a−n)` với `n = (−dy, dx)`,
    mà thước dốc XUỐNG-phải nên `n` chỉ xuống — `[0]`, `[1]` là mép DƯỚI. Lấy
    nhầm `[3] → [2]` thì mặt bên tụt xuống từ mép TRÊN, tức nó nằm ĐÈ LÊN mặt
    trên của chính cái thước: trên PNG ra một dải tối chạy dọc giữa thanh, và
    không một con số nào kêu — diện tích, tông, bề rộng đều hợp lệ, chỉ cái
    CHỖ là sai. (Chú thích cũ ở `ve_thuoc` gọi `[0] → [1]` là "mép trên" chính
    là thứ đã dẫn đi nhầm; nó đã sửa.)

    Mặt này quay XUỐNG-TRƯỚC nên nó gần như không nhận gì từ một ngọn đèn ở
    trên-trái — đó là lý do nó có một thang tông riêng (`sideGain`) chứ không
    tô cùng tông với mặt trên."""
    r = TOOLS["ruler"]
    t, dx = r["thick"], r["thick"] * r["sideDx"]
    a, b = THUOC[0], THUOC[1]
    return [a, b, (b[0] + dx, b[1] + t), (a[0] + dx, a[1] + t)]


THUOC_CANH = thuoc_canh_quad()
# Hình CHE của cả thanh thước = mặt trên + mặt bên. `che_boi` và `nen_rgb`
# đọc nó: một điểm trên mặt bên mà mô hình gọi là GỖ là đúng kiểu lệch mô hình
# ‖ tranh mà cả bộ sinh này tồn tại để không mắc.
THUOC_KHOI = bao_loi(THUOC + THUOC_CANH)


# ── BÚT CHÌ ────────────────────────────────────────────────────────────
#
# Trục của bút chạy từ ĐUÔI (cục tẩy) tới MŨI, và mọi phần đều dựng trên
# cùng một hệ `(dọc, ngang)` lấy từ trục ấy — không phần nào tự tính lại góc.
# Chép góc sang chỗ thứ hai là một trong hai chỗ sẽ lệch, đúng cái bẫy mà mặt
# bên của thước đã mắc.


def but_truc():
    """`(gốc đuôi, vector đơn vị DỌC, vector đơn vị NGANG, chiều dài)`."""
    a, b = PENCIL["from"], PENCIL["to"]
    dx, dy = b["x"] - a["x"], b["y"] - a["y"]
    L = math.hypot(dx, dy) or 1.0
    ux, uy = dx / L, dy / L
    return (a["x"], a["y"]), (ux, uy), (-uy, ux), L


def _but_p(t, s, k=1.0):
    """Điểm trên bút: `t` đơn vị dọc từ đuôi, `s` ∈ −1..1 ngang, `k` lần bán
    kính thân."""
    (ax, ay), (ux, uy), (nx, ny), _L = but_truc()
    h = PENCIL["half"] * k
    return (ax + ux * t + nx * h * s, ay + uy * t + ny * h * s)


def but_quad():
    """THÂN SƠN — từ sau đai tới chân đầu gọt, theo thứ tự (đuôi-trên,
    mũi-trên, mũi-dưới, đuôi-dưới): `quad_pt(q, u, v)` cho `u` chạy DỌC thân
    và `v` chạy NGANG, tức đúng hệ mà ba mặt của thân sáu cạnh cần."""
    if "but-chi" not in VE:
        return []
    _o, _u, _n, L = but_truc()
    u0, u1 = PENCIL["ferrule"]["len"], L - PENCIL["tip"]["len"]
    return [_but_p(u0, -1), _but_p(u1, -1), _but_p(u1, 1), _but_p(u0, 1)]


def but_dai_quad():
    """ĐAI KIM LOẠI — khúc giữa cục tẩy và thân sơn."""
    if "but-chi" not in VE:
        return []
    f = PENCIL["ferrule"]["len"]
    return [_but_p(0, -1), _but_p(f, -1), _but_p(f, 1), _but_p(0, 1)]


def but_tay_quad():
    """CỤC TẨY — thò ra SAU đuôi, đầu đã MÒN nên hẹp hơn thân (`taper`)."""
    if "but-chi" not in VE:
        return []
    e = PENCIL["eraser"]
    return [_but_p(-e["len"], -1, e["taper"]), _but_p(0, -1),
            _but_p(0, 1), _but_p(-e["len"], 1, e["taper"])]


def but_dau_poly():
    """ĐẦU GỌT — tam giác từ chân nón tới mũi."""
    if "but-chi" not in VE:
        return []
    _o, _u, _n, L = but_truc()
    u1 = L - PENCIL["tip"]["len"]
    return [_but_p(u1, -1), _but_p(L, 0), _but_p(u1, 1)]


BUT_THAN = but_quad()
BUT_DAI = but_dai_quad()
BUT_TAY = but_tay_quad()
BUT_DAU = but_dau_poly()
# Hình CHE của cả cây bút — `che_boi` và `nen_rgb` đọc nó. Một điểm trên thân
# bút mà mô hình gọi là GỖ BÀN là đúng kiểu lệch mô hình ‖ tranh mà cả bộ
# sinh này tồn tại để không mắc.
BUT_KHOI = bao_loi(BUT_THAN + BUT_DAI + BUT_TAY + BUT_DAU) if BUT_THAN else []


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


def ve_bong(ink, lop, poly, h, P, tiep_xuc=None, chu=None):
    """BÓNG của một hình, hai tầng + lấm tấm ở vành — bóng mềm KHÔNG `<filter>`.

    UMBRA ở `umbra` phần độ lệch (đậm) và PENUMBRA ở trọn độ lệch (nhạt): hai
    đa giác chồng nhau cho ba mức sáng, tức một dốc đọc được. Lấm tấm ở vành
    ngoài không phải trang trí — tám tấm nền nhãn của bản đồ sao đọc ra là
    "tám vệt bôi đen" đúng vì chúng có MÉP SẮC, và một đa giác bóng không lấm
    tấm là vệt bôi đen thứ chín.

    `tiep_xuc` là mép TIẾP ĐẤT của vật (chỉ số các đỉnh chạm mặt bàn): một nét
    đậm sát mép ấy là thứ nói ra vật ĐẶT TRÊN bàn chứ không nổi lơ lửng.

    `chu` là hình CHE của vật, mặc định bằng chính `poly`. Nó tách ra vì một
    vật có BỀ DÀY che nhiều hơn cái mặt đổ bóng của nó: thước đổ bóng theo mặt
    TRÊN, nhưng mặt BÊN của nó cũng không nằm trong bóng của chính nó. Gộp hai
    vai trò vào một đa giác thì hoặc bóng dựng sai hình, hoặc `bong_phu` dìm
    mặt bên — mà chiều thứ hai đã có tiền lệ: nó kéo một phép đo tương phản từ
    5,13 : 1 xuống 1,08 : 1 trong khi tranh không đổi một điểm ảnh nào."""
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
        BONG.append((hop, op * mo, chu or poly))
        ink.fill(lop, pl(hop, True), P["shadow"], op * mo, rule="nonzero", solo=True)
        if ten == "pen":
            # LẤM TẤM ở vành ngoài: mật độ giảm theo khoảng cách ra ngoài mép,
            # và SỐ LƯỢNG tỉ lệ với chính độ dài bóng. Không chia theo độ dài
            # thì vật nằm gần như NGAY DƯỚI đèn (cái đế) — bóng chỉ nhô ra vài
            # đơn vị — vẫn nhận đủ số chấm, và chúng toả 360° quanh chân đế
            # thành một cái chổi xể. Thấy ngay trên PNG, không con số nào báo.
            dai = math.hypot(*lech_bong(poly[0][0], poly[0][1], h))
            # SỐ CHẤM theo CHU VI hình, không theo SỐ ĐỈNH — và đây là một cái
            # bẫy đã bắt được. Bản trước nhân với `len(poly)`, nên một đĩa nhỏ
            # khai bằng 16 đỉnh (khớp com-pa, rộng 8 đơn vị) nhận GẤP BỐN số
            # chấm của cả một trang sổ rộng 250 đơn vị: cùng một vật, khai
            # bằng 4 đỉnh hay 16 đỉnh là hai cái bóng khác hẳn nhau, mà số
            # đỉnh là một chi tiết dựng hình chứ một thuộc tính của vật. Nó
            # đẩy tệp vượt trần 380 KB ngay lần đầu có một bóng tròn.
            cv = sum(math.hypot(poly[(j + 1) % len(poly)][0] - poly[j][0],
                                poly[(j + 1) % len(poly)][1] - poly[j][1])
                     for j in range(len(poly)))
            n = int(SHADOW["stipple"]["per"] * DENSITY * cv / 760.0
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


def but_t(x, y) -> float:
    return LIT["pencilBase"] + LIT["pencilGain"] * sang(x, y)


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
    if z < tt["thuoc"] and trong_da_giac(x, y, THUOC_KHOI):
        return True
    if z < tt["but-chi"] and trong_da_giac(x, y, BUT_KHOI):
        return True
    return False


def nen_rgb(x, y, P):
    """MÀU NỀN tại `(x, y)` — MỘT hàm cho mọi phép đo tương phản của tệp này.

    Thứ tự hỏi là thứ tự z ngược: vật gần nhất ở trên. Bóng phủ cộng vào SAU
    CÙNG; đúng với mọi chỗ bức này đo (chữ trên thẻ, nét chì trên giấy, vạch
    trên thước) vì ở cả ba chỗ bóng nằm TRÊN mặt vật."""
    if trong_da_giac(x, y, TRANG_PHAI) or trong_da_giac(x, y, TRANG_TRAI):
        rgb = ton_rgb(P["paperRamp"], giay_t(x, y))
    elif trong_da_giac(x, y, BUT_THAN):
        rgb = ton_rgb(P["pencilRamp"], but_t(x, y))
    elif trong_da_giac(x, y, BUT_DAU):
        rgb = ton_rgb(P["pencilBare"], but_t(x, y))
    elif trong_da_giac(x, y, BUT_DAI):
        rgb = ton_rgb(P["steelRamp"], but_t(x, y))
    elif trong_da_giac(x, y, BUT_TAY):
        rgb = hex_rgb(P["eraser"])
    elif trong_da_giac(x, y, THUOC):
        rgb = ton_rgb(P["rulerRamp"], thuoc_t(x, y))
    elif trong_da_giac(x, y, THUOC_CANH):
        # MẶT BÊN của thước, không phải gỗ bàn — xem `thuoc_canh_quad`.
        rgb = ton_rgb(P["rulerRamp"], thuoc_t(x, y) * TOOLS["ruler"]["sideGain"])
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


def uon_quanh_mat(pts):
    """ĐẨY các điểm RA KHỎI mắt gỗ — thớ đi vòng, không đi xuyên.

    Làm việc trong hệ toạ độ RIÊNG của từng mắt (xoay theo `tilt`, bỏ nén
    theo `squash`), nên cái mắt dù dẹt và nghiêng vẫn được ôm bằng một phép
    đẩy TRÒN — rồi đổi ngược về khung. Viết thẳng phép đẩy trong khung ảnh
    thì thớ ôm một hình tròn trong khi mắt là một ê-líp nghiêng, và hai hình
    lệch nhau đúng ở chỗ ai cũng nhìn: ngay rìa mắt.

    Điểm ở TÂM bị đẩy ra tới rìa (`bend × r`): thớ không chui qua được một
    cành cây. Hiệu ứng tắt dần tới `reach × r` để không có một vòng gợn nào
    ở chỗ phép đẩy kết thúc."""
    kf = DESK["knotFlow"]
    # CHIA NHỎ ĐOẠN đi qua vùng ảnh hưởng TRƯỚC khi đẩy. `wobble` cho vệt thớ
    # đi `buoc = 68`, tức một vệt dài 160 đơn vị chỉ có BA điểm — đẩy ba điểm
    # của một đường thẳng dài thì hoặc không có điểm nào rơi vào vùng mắt
    # (không uốn gì cả), hoặc đúng một điểm giữa bị đẩy và ra một cái GÃY
    # KHÚC. Lượt nhìn đầu sau khi thêm phép đẩy cho ra đúng cái thứ nhất: mắt
    # gỗ vẽ xong mà thớ quanh nó vẫn chạy thẳng tắp.
    # Chỉ chia những đoạn thật sự đi gần mắt, nên dung lượng chỉ tăng ở ba
    # chỗ trong bức chứ không ở bảy nghìn vệt.
    day = []
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        day.append(a)
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        gan = False
        if L > 10:
            for k in range(7):
                t = k / 6
                px, py = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                for kn in DESK["knots"]:
                    # Thử bằng KHOẢNG CÁCH TRONG HỆ CỦA MẮT, không bằng một
                    # hộp chữ nhật: hộp `tam × tam` của cái mắt r = 46 phủ
                    # 156 đơn vị mỗi phía, tức một phần tám bức — và mọi vệt
                    # trong đó bị chia nhỏ dù phép đẩy ở rìa bằng không. Đo
                    # được: 33 KB, mà không một điểm ảnh nào đổi màu.
                    ca, sa = math.cos(kn["tilt"]), math.sin(kn["tilt"])
                    dx, dy = px - kn["x"], py - kn["y"]
                    if math.hypot(dx * ca + dy * sa,
                                  (-dx * sa + dy * ca) / kn["squash"]) \
                            < kn["r"] * kf["reach"]:
                        gan = True
                        break
                if gan:
                    break
        if gan:
            n = min(12, int(L / 11) + 2)
            for k in range(1, n):
                t = k / n
                day.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    day.append(pts[-1])
    ra = []
    for x, y in day:
        for kn in DESK["knots"]:
            ca, sa = math.cos(kn["tilt"]), math.sin(kn["tilt"])
            dx, dy = x - kn["x"], y - kn["y"]
            ex = dx * ca + dy * sa
            ey = (-dx * sa + dy * ca) / kn["squash"]
            d = math.hypot(ex, ey)
            tam = kn["r"] * kf["reach"]
            if d >= tam or d < 1e-6:
                continue
            f = 1.0 - d / tam
            k = (d + kn["r"] * kf["bend"] * f * f) / d
            ex, ey = ex * k, ey * k
            x = kn["x"] + ex * ca - ey * kn["squash"] * sa
            y = kn["y"] + ex * sa + ey * kn["squash"] * ca
        ra.append((x, y))
    return ra


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
            # SÓNG LỚN dùng chung cho các hàng kề nhau (`waveRow` nhỏ) — xem
            # chú thích `ROOM_DESK.grain.wave`.
            y1 = y0 + (NZ.v(x0 * g["waveX"], j * g["waveRow"]) - 0.5) * g["wave"] * scale
            x2, y2 = x0 + L, y1 + L * tilt
            if max(y1, y2) > H - 1:
                continue
            # UỐN QUANH MẮT GỖ xong MỚI kiểm mép: phép đẩy làm vệt nhô lên
            # vài đơn vị, nên kiểm trước khi uốn là kiểm một vệt khác với vệt
            # được ghi ra tệp — đúng kiểu lệch mô hình ‖ tranh mà cả bộ sinh
            # này tồn tại để không mắc. `kiem_mep_trong` đọc TỆP, nên nó sẽ
            # bắt được, nhưng lúc ấy nó chặn build chứ không bỏ một vệt.
            pts = uon_quanh_mat(wobble(x0, y1, x2, y2, 1.5 * scale, j * 0.7, 68))
            if min(p[1] for p in pts) < mep_y(x0) + 2.5:
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
            ink.poly("tho-go", pts, mau, w, op)
    # VỆT SẪM NGẮN CẮT NGANG — tia gỗ. Dốc gấp mười lần thớ, nên chúng là
    # phương THỨ HAI của mặt gỗ; một mặt chỉ có một phương là một mặt chải.
    ck = DESK["checks"]
    for i in range(int(ck["count"] * DENSITY)):
        x = rnd(i * 2.1, 3.7) * (W + 60) - 30
        y = hang_y(rnd(i * 4.3, 6.1))
        L = ck["len"] * (0.4 + rnd(i * 6.7, 2.3))
        th = ck["tilt"] * (1 if rnd(i * 8.9, 5.1) < 0.5 else -1) \
            * (0.6 + rnd(i * 3.3, 7.1) * 0.8)
        pts = uon_quanh_mat([(x, y), (x + L * math.cos(th * 0.4), y + L * math.sin(th))])
        if min(p[1] for p in pts) < mep_y(x) + 2.5 or max(p[1] for p in pts) > H - 1:
            continue
        s = sang(x, y)
        ink.poly("tho-go", pts, ton(P["grainRamp"], 0.04 + 0.4 * s, x, y),
                 ck["width"], ck["opacity"] * (0.35 + 0.65 * s))
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
        ca, sa = math.cos(kn["tilt"]), math.sin(kn["tilt"])
        # LÕI MẮT: một mảng tô sẫm. Không có nó thì cái mắt là mấy vòng rỗng
        # và thớ phía sau vẫn đọc xuyên qua — tức vẫn là một hoa văn, không
        # một cái cành bị cắt ngang.
        ink.fill("tho-go", pl([(cx + math.cos(th) * kn["r"] * 0.3 * ca
                                - math.sin(th) * kn["r"] * 0.3 * kn["squash"] * sa,
                                cy + math.cos(th) * kn["r"] * 0.3 * sa
                                + math.sin(th) * kn["r"] * 0.3 * kn["squash"] * ca)
                               for th in [math.tau * k / 16 for k in range(16)]], True),
                 P["grainRamp"][0], 0.75)
        for r in range(kn["rings"], 0, -1):
            rr = kn["r"] * r / kn["rings"]
            seg = max(12, int(rr * 1.4))
            pts = []
            for i in range(seg):
                th = math.tau * i / seg
                # Méo NHẸ (0,07, không 0,16): biên độ lớn làm vòng năm lượn
                # ba múi và cả cái mắt đọc ra một nét NGUỆCH NGOẠC vẽ lên mặt
                # bàn — đo được trên PNG ở lượt nhìn thứ hai.
                w = 1.0 + 0.07 * math.sin(th * 3 + r * 0.7) * (r / kn["rings"])
                ex = rr * w * math.cos(th)
                ey = rr * w * kn["squash"] * math.sin(th)
                pts.append((cx + ex * ca - ey * sa, cy + ex * sa + ey * ca))
            # MỌI VÒNG ĐỀU SẪM, dày mỏng xen kẽ. Bản trước cho vòng chẵn tông
            # `grainLit` và cái mắt thành một hình xoắn ốc SÁNG nổi trên gỗ —
            # một cái mắt gỗ là chỗ thớ ĐẶC LẠI, nên nó tối hơn mặt gỗ quanh
            # nó, không sáng hơn. Nét sáng duy nhất là một cung ở rìa dưới-phải
            # (gờ mắt bắt đèn), vẽ sau vòng ngoài cùng.
            chan = r % 2 == 0
            ink.poly("tho-go", pts,
                     ton(P["grainRamp"], (0.02 if chan else 0.22) + 0.3 * s, cx, cy),
                     (0.5 if chan else 1.0) * (0.8 + 0.5 * (1 - r / kn["rings"])),
                     (0.4 if chan else 0.75) + 0.25 * s, close=True)
        # Gờ mắt bắt đèn — cung ngắn ở rìa DƯỚI-PHẢI, cùng hướng với mọi vành
        # sáng khác trong bức (đèn ở trên-trái).
        ink.poly("tho-go", [
            (cx + (kn["r"] * 1.02 * math.cos(th)) * ca
             - (kn["r"] * 1.02 * kn["squash"] * math.sin(th)) * sa,
             cy + (kn["r"] * 1.02 * math.cos(th)) * sa
             + (kn["r"] * 1.02 * kn["squash"] * math.sin(th)) * ca)
            for th in [math.pi * (0.1 + 0.75 * k / 10) for k in range(11)]],
            P["grainLit"], 0.8, 0.2 + 0.5 * s)


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


def chao_canh(v: float):
    """Hai mép và `y` của chao ở độ cao `v` (0 = đỉnh, 1 = miệng). MỘT hàm cho
    cả dải ngang, nan dọc lẫn vết búa — ba công thức là ba hình sẽ lệch."""
    sh = LAMP["shade"]
    cx, my = LAMP["at"]["x"], LAMP["at"]["y"]
    half = sh["topHalf"] + (sh["mouthHalf"] - sh["topHalf"]) * v
    return cx - half, cx + half, sh["topY"] + (my - sh["topY"]) * v


def _e_lip(cx, cy, rx, ry, seg=40):
    return [(cx + math.cos(math.tau * k / seg) * rx,
             cy + math.sin(math.tau * k / seg) * ry) for k in range(seg)]


def ve_den(ink, P):
    """CHAO, MIỆNG, BÓNG ĐÈN, THÂN, ĐẾ — xem `ROOM_LAMP.shade` để biết bản đầu
    hỏng ở đâu. Tóm tắt: cái chao là MỘT MẶT CONG có dốc dọc, cái miệng là một
    Ê-LÍP mà người xem nhìn XUỐNG vào trong, mép dưới là một VÀNH SÁNG, và
    bóng đèn có QUẦNG chứ không một cạnh sắc."""
    sh = LAMP["shade"]
    cx, my = LAMP["at"]["x"], LAMP["at"]["y"]
    mh = sh["mouthHalf"]
    ry = mh * sh["mouthSquash"]

    # ── 1 · DỐC DỌC mặt ngoài: `bands` dải hình thang, tô ĐẶC, mỗi dải một
    # `<path>` riêng. Ánh sáng rò ra ở mép dưới nên tông dồn vào phần dưới
    # (`vPow` > 1); một dốc tuyến tính làm nửa trên chao sáng bằng nửa dưới,
    # tức một cái chao được chiếu từ NGOÀI.
    nb = sh["bands"]
    for i in range(nb):
        v0, v1 = i / nb, (i + 1) / nb
        l0, r0, y0 = chao_canh(v0)
        l1, r1, y1 = chao_canh(v1)
        vm = (v0 + v1) / 2
        t = sh["vLo"] + (sh["vHi"] - sh["vLo"]) * vm ** sh["vPow"]
        ink.fill("den", pl([(l0, y0), (r0, y0), (r1, y1), (l1, y1)], True),
                 ton_muot(P["shadeRamp"], t), 1.0, solo=True)

    # ── 2 · KHỐI TRÒN: `ribs` nan dọc MỜ. Chúng không tô lại cái dốc ở trên
    # (độ mờ thấp), chúng chỉ cộng thêm chiều NGANG — tối ở giữa thân, và một
    # dải sáng MẢNH ở hai rìa bóng, vì kim loại nhìn gần phương tiếp tuyến
    # phản xạ mạnh hơn hẳn. 26 nan đục của bản đầu đọc ra SỌC; nan mờ và dày
    # gấp ba thì chồng mép nhau và đọc ra một mặt cong.
    eg = sh["edge"]
    for i in range(sh["ribs"] + 1):
        u = i / sh["ribs"]
        lt, rt, yt = chao_canh(0.0)
        lb, rb, yb = chao_canh(1.0)
        canh = abs(u - 0.5) * 2
        ria = smoothstep((canh - eg["at"]) / max(1e-6, 1 - eg["at"]))
        # Thân chao: TỐI dần vào giữa (mặt quay thẳng về người xem nhận ít
        # ánh rò nhất), rồi bật lên ở rìa.
        if ria > 0.25:
            mau, op, w = P["shadeLit"], 0.18 + eg["gain"] * ria, 1.9
        else:
            khoi = 1.0 - canh ** 2
            mau = ton_muot(P["shadeRamp"], 0.5 - 0.42 * khoi)
            op, w = 0.1 + 0.26 * khoi, 2.2
        ink.poly("den", wobble(lt + (rt - lt) * u, yt, lb + (rb - lb) * u, yb,
                               0.8, i * 1.3, 30), mau, w, op)

    # ── 3 · VẾT BÚA — đồng gò thì có vết búa; một mặt chao mịn tuyệt đối là
    # một mặt nhựa. Đậm hơn ở phần dưới, nơi có ánh sáng để bắt.
    for i in range(int(sh["hammer"] * DENSITY)):
        u, v = rnd(i * 1.7, 3.1), rnd(i * 2.3, 8.9)
        l, r, y = chao_canh(v)
        x = l + (r - l) * u
        f = v ** 1.6 * (1.0 - 0.5 * abs(u - 0.5) * 2)
        # Độ mờ THẤP và đường kính dưới một đơn vị: vết búa là thứ phải ĐOÁN
        # ra khi nhìn gần, không phải thứ đếm được từ xa. Bản trước để 0,44 và
        # mặt chao đọc ra một trận mưa hạt vàng.
        ink.stroke("den", dot(x, y), P["shadeLit"] if rnd(i * 4.1, 1.3) < 0.4 + f
                   else P["shadeRamp"][0], 0.9, 0.06 + 0.17 * f)

    # ── 4 · MIỆNG CHAO — ê-líp, và người xem nhìn XUỐNG vào trong nó.
    # Vòng ngoài là thành trong phía xa (sáng vừa), rồi `mouthLevels` vòng lồng
    # nhau LỆCH DẦN LÊN TRÊN và nóng dần: vũng sáng trong lòng chao. Lệch lên
    # vì thành phía XA là thứ bóng đèn rọi thẳng vào, còn thành phía GẦN quay
    # lưng lại người xem và nằm trong bóng của chính cái mép.
    ink.fill("den", pl(_e_lip(cx, my, mh, ry, 44), True),
             ton_muot(P["shadeRamp"], 0.42), 1.0, solo=True)
    nm = sh["mouthLevels"]
    for j in range(nm):
        k = 1.0 - (j + 1) / (nm + 1)
        dy = -(1 - k) * ry * 0.5
        t = (j + 1) / nm
        mau = ton_muot((P["shadeRamp"][3], P["shadeLit"], P["shadeRim"],
                        P["bulb"]), t)
        seg = max(12, int(mh * k * 0.7))
        ink.fill("den", pl(_e_lip(cx, my + dy, mh * k, ry * k, seg), True),
                 mau, 0.62, solo=True)

    # ── 5 · VÀNH SÁNG MÉP DƯỚI — `rimArcs` cung lồng nhau dọc NỬA DƯỚI ê-líp,
    # mờ dần ra ngoài. Đây là chỗ bản đầu đặt một ĐOẠN THẲNG trắng, và chính
    # đoạn thẳng ấy đọc ra "một thanh trắng mảnh". Một mép kim loại dày 2 mm
    # dưới ánh đèn của chính nó không có cạnh sắc nào.
    na = sh["rimArcs"]
    for j in range(na):
        f = j / max(1, na - 1)
        rr, rry = mh * (1 + 0.012 * j), ry * (1 + 0.012 * j)
        cung = [(cx + math.cos(th) * rr, my + math.sin(th) * rry)
                for th in [math.pi * (0.04 + 0.92 * k / 26) for k in range(27)]]
        ink.poly("den", cung, P["shadeRim"] if f < 0.5 else P["core"],
                 2.6 - 1.4 * f, 0.9 - 0.62 * f)
    # Mép TRÊN của miệng: nét tối mảnh — nó là cạnh ngoài của chao nhìn gần
    # phương tiếp tuyến, không phải một chỗ bắt sáng.
    ink.poly("den", [(cx + math.cos(th) * mh, my + math.sin(th) * ry)
                     for th in [math.pi * (1.06 + 0.88 * k / 18) for k in range(19)]],
             P["shadeRamp"][1], 1.6, 0.8)

    # ── 6 · BÓNG ĐÈN — `levels` đĩa lồng nhau theo ĐỘ MỜ TÍCH LUỸ, cùng kỹ
    # thuật với 152 đĩa của vệt sáng. Ba đĩa của bản đầu cho ba cạnh sắc nhìn
    # đếm được; một bóng đèn thật có QUẦNG, vì chính không khí quanh nó tán xạ.
    bl = sh["bulb"]
    by = my + bl["drop"]
    tich = 0.0
    for i in range(bl["levels"]):
        f = 1.0 - i / bl["levels"]
        r = bl["r"] * f ** 0.78
        muc = (i + 1) / bl["levels"]
        a, tich = (muc - tich) / max(1e-6, 1.0 - tich), muc
        mau = ton_muot((P["glowCore"], P["core"], P["bulb"]),
                       min(1.0, (1 - f) ** 0.6 * 1.25))
        ink.fill("den", pl(_e_lip(cx, by, r, r * bl["squash"],
                                  max(10, int(r * 1.5))), True), mau, a, solo=True)

    # ── 7 · THÂN: ba nét song song, sáng bên trái tối bên phải — thân kim loại
    # tròn dưới một nguồn sáng ở trên-trái thì phải thế, và đó là chỗ rẻ nhất
    # để nói "vật này có khối".
    # Ba nét CHỒNG MÉP nhau, không ba nét rời: bản trước đặt tâm cách nhau
    # `width` nhưng vẽ nét rộng 0,42 `width`, nên giữa chúng có khe — và trên
    # vũng sáng chói, hai nét tối cách nhau một khe đọc ra HAI SỢI DÂY, không
    # ra một cái thân đèn.
    st = sh["stem"]
    for k, t in ((-1, 0.9), (0, 0.46), (1, 0.12)):
        off = k * st["width"] / 3
        ink.poly("den", wobble(cx + off, my + 10, cx + off * 1.4, st["toY"], 0.7, off),
                 ton_muot(P["shadeRamp"], t), st["width"] * 0.45, 0.95)

    # ── 8 · ĐẾ: vòng TRONG sáng, vòng ngoài tối, tâm lệch nhẹ VỀ PHÍA ĐÈN.
    # Bản đầu làm ngược (vành sáng, tâm `shadeDark`) và cái đế đọc ra một CÁI
    # HỐ — một cái hố ngay dưới nguồn sáng duy nhất của bức.
    bs = sh["base"]
    for k in range(bs["rings"], 0, -1):
        f = k / bs["rings"]
        # ĐỤC HẾT, không 0,55: vòng lồng nhau tô đè nhau thì độ mờ cộng dồn
        # và vòng trong cùng nhận tích của mười lăm lượt phủ — đúng cái lỗi
        # "gộp nhóm hình lồng nhau" ở `Ink.fill`, chỉ khác là lần này nó nằm
        # ở phía người gọi. Dốc đi qua TÔNG, không qua độ mờ.
        # Vòng trong giữ lại 40 % chiều cao: `nf()` làm tròn toạ độ về số
        # nguyên, nên một ê-líp cao 0,8 đơn vị suy biến thành một đoạn thẳng
        # và BIẾN MẤT — sáu vòng trong cùng của bản trước không bao giờ được
        # vẽ, nên cái đế dừng ở tông #49371F và đọc ra một cái hố. Giữ chiều
        # cao cũng đúng hình: đây là một cái đế VÒM, không một tấm đĩa dẹt.
        rx = bs["rx"] * f * (1 + 0.012 * math.sin(k * 2.1))
        ry_ = bs["ry"] * (0.4 + 0.6 * f)
        ink.fill("den", pl(_e_lip(cx, bs["y"] - (1 - f) * bs["ry"] * 0.45,
                                  rx, ry_, 34), True),
                 ton_muot((P["shadeRamp"][1], P["shadeRamp"][3], P["shadeLit"],
                           P["shadeRim"]), 1.0 - f ** 1.35), 1.0, solo=True)
    # Cung sáng ở vành trên-trái (mép đế quay về đèn) và nét tối ở mép dưới
    # (chỗ đế chạm bàn) — hai nét, hai phía, một nguồn.
    ink.poly("den", [(cx + math.cos(th) * bs["rx"] * 0.94,
                      bs["y"] + math.sin(th) * bs["ry"] * 0.94)
                     for th in [math.pi * (1.08 + 0.6 * k / 12) for k in range(13)]],
             P["shadeRim"], 1.8, 0.8)
    ink.poly("den", [(cx + math.cos(th) * bs["rx"] * 0.99,
                      bs["y"] + math.sin(th) * bs["ry"] * 0.99)
                     for th in [math.pi * (0.1 + 0.8 * k / 12) for k in range(13)]],
             P["shadeRamp"][0], 2.0, 0.7)


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


def _net_mot_tu(quad, u0, u1, v, rong, cao, hat):
    """Dãy điểm của MỘT TỪ viết tay — trả về danh sách NÉT (nhấc bút cắt đôi).

    Thân chữ là một nhịp lên-xuống giữa ĐƯỜNG NỀN và `xHeight`: hai bước là
    một chữ cái, y như nét `m` nối nhau trong chữ thảo. Trên cái nhịp ấy mới
    cộng ba thứ làm nó thành chữ chứ thành sóng:

     · nét LÊN ở `riseAt` phần số chữ cái và nét XUỐNG ở `dropAt` — không có
       chúng thì cả dòng cao đều một mức, tức không có chữ cái nào;
     · NGHIÊNG PHẢI (`slant`): đỉnh nét đi TRƯỚC chân nét, vì cây bút nghiêng;
     · ĐƯỜNG NỀN TRÔI (`drift`) rất chậm dọc dòng — biên độ phải nhỏ hơn hẳn
       khoảng dòng, vì giấy này CÓ kẻ nên chữ bám theo đường kẻ.

    Nhấc bút cắt ở MỐC CHẴN, tức ranh giữa hai chữ cái: cắt giữa một nét cho
    ra hai nửa chữ lơ lửng, đọc ra là một vệt đứt chứ không ra một lần nhấc."""
    hd = BOOK["hand"]
    buoc_u = hd["step"] / rong
    n = max(4, int((u1 - u0) / max(1e-9, buoc_u)))
    cat = -1
    if rnd(hat * 1.3, 4.7) < hd["lift"] and n >= 8:
        cat = 2 * int(2 + rnd(hat * 5.9, 1.1) * (n / 2 - 3))
    doan, cur = [], []
    for k in range(n + 1):
        u = u0 + (u1 - u0) * k / n
        tren = (k % 2) == 1
        chu = k // 2
        # THÂN CHỮ cao thấp khác nhau TỪNG CHỮ: mọi đỉnh bằng nhau cho ra một
        # hàng răng lược đều tăm tắp — cùng họ với cái mã vạch, chỉ dựng đứng.
        dy = -hd["xHeight"] * (0.66 + 0.52 * rnd(hat * 1.9 + chu, 5.7)) if tren else 0.0
        if tren and rnd(hat * 3.1 + chu, 9.7) < hd["riseAt"]:
            dy -= hd["ascend"]
        elif (not tren) and rnd(hat * 7.7 + chu, 2.3) < hd["dropAt"]:
            dy += hd["descend"]
        dy += (rnd(hat + k * 1.9, 6.1) - 0.5) * hd["jitter"]
        dy += (NZ.v(u * 9.0, hat * 0.31) - 0.5) * hd["drift"]
        du = (-dy * hd["slant"] + (rnd(hat + k * 2.7, 3.3) - 0.5) * hd["jitter"]) / rong
        if k == cat:
            doan.append(cur)
            cur = []
        cur.append(quad_pt(quad, u + du, v + dy / cao))
    doan.append(cur)
    return [d for d in doan if len(d) > 1]


def ve_chu_tay(ink, P, quad):
    """CHỮ VIẾT TAY — chữ TAY, không một hàng gạch.

    Không phải chữ ĐỌC ĐƯỢC: ở cỡ thân chữ 2,5 đơn vị, chữ thật là một hàng
    mực nhoè, và nó sẽ là một câu không ai dịch nổi trên một bức tranh. Thứ
    phải dựng là cái HÌNH của một dòng chữ tay — xem `ROOM_BOOK.hand` để biết
    bốn thứ bản "vệt rung" thiếu, và `_net_mot_tu` cho hình một từ.

    Dòng cuối mỗi khổ ngắn hơn (giữ từ bản trước): một khối chữ mà mọi dòng
    dài bằng nhau đọc ra là một hoa văn. Lề trái so le nhẹ vì không ai đặt bút
    đúng một chỗ chín lần."""
    hd = BOOK["hand"]
    ru = BOOK["rule"]
    # ĐƠN VỊ KHUNG → (u, v): mọi con số của `hand` là bề rộng/bề cao THẬT trên
    # mặt giấy. Hai trang trái/phải là hai tứ giác khác cỡ, nên quy đổi phải
    # tính từ CHÍNH tứ giác đang vẽ, không từ một hằng chép sẵn.
    ax, ay = quad_pt(quad, 0.0, 0.5)
    bx, by = quad_pt(quad, 1.0, 0.5)
    rong = math.hypot(bx - ax, by - ay) or 1.0
    cx0, cy0 = quad_pt(quad, 0.5, 0.0)
    cx1, cy1 = quad_pt(quad, 0.5, 1.0)
    cao = math.hypot(cx1 - cx0, cy1 - cy0) or 1.0
    u_lo = ru["inset"] + 0.055
    u_hi = 1 - ru["inset"] - 0.045
    for r in range(hd["rows"]):
        # ĐƯỜNG NỀN trùng đường kẻ của dòng: chữ ngồi TRÊN đường kẻ, nét xuống
        # thò qua nó. Bản trước đặt vệt ở `v − 0,012`, tức lơ lửng giữa hai
        # dòng kẻ — một dòng chữ không chạm đường kẻ nào là một dòng chữ không
        # ai viết ra.
        v = (r + 1) / (ru["count"] + 1)
        dai = 1.0 if (r + 1) % 4 else 0.40 + 0.3 * rnd(r * 3.1, 1.9)
        u_het = u_lo + (u_hi - u_lo) * dai
        u = u_lo + (rnd(r * 1.7, 8.3) - 0.5) * 0.012
        for k in range(hd["words"] + 3):
            if u >= u_het:
                break
            L = hd["wordLen"] / rong * (1 - hd["wordJitter"] / 2
                                        + rnd(r * 7.3 + k, 2.9) * hd["wordJitter"])
            L = min(L, u_het - u)
            # Một mẩu ngắn hơn hai chữ cái không phải một từ — nó là một vết
            # mực, và chín vết mực cuối chín dòng lại thành một hoa văn.
            if L * rong < hd["step"] * 4:
                break
            x, y = quad_pt(quad, u + L / 2, v)
            s = sang(x, y)
            # ĐỘ ĐẬM theo TỪ, không theo nét: một lần chấm bút viết hết một
            # từ rồi mới nhạt dần, nên hai nét trong cùng một từ cùng độ đậm.
            muc = 0.34 + 0.3 * rnd(r * 2.9 + k * 1.3, 7.1)
            w = hd["width"] * (0.78 + 0.44 * rnd(r * 5.1 + k, 3.7))
            for net in _net_mot_tu(quad, u, u + L, v, rong, cao, r * 13 + k):
                ink.poly("so-tay", net, P["paperInk"], w, muc * (0.5 + 0.6 * s))
            u += L + hd["gap"] / rong * (1 - hd["gapJitter"] / 2
                                         + rnd(r * 2.1 + k * 3.7, 5.3) * hd["gapJitter"])


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
    # VÂN CHẢI: vệt chạy dọc TRỤC DÀI của tấm — xem `ROOM_PLATE.scratch` để
    # biết vì sao bản gạch chéo đọc ra "ô bị bôi đen".
    sc = PLATE["scratch"]
    for i in range(int(sc["count"] * DENSITY)):
        u, v = rnd(i * 1.7, 2.3), rnd(i * 3.1, 7.9)
        x, y = quad_pt(q, u, v)
        L = sc["len"] * (1 - sc["lenJitter"] / 2 + rnd(i * 5.3, 1.1) * sc["lenJitter"])
        th = sc["angle"] + (rnd(i * 2.9, 4.7) - 0.5) * 0.05
        x2, y2 = x + math.cos(th) * L, y + math.sin(th) * L
        # Cắt về trong tấm: một vệt xước chạy ra ngoài mép là một vệt xước
        # trên mặt bàn, và mặt bàn không có đồng.
        if not (trong_da_giac(x, y, q) and trong_da_giac(x2, y2, q)):
            continue
        # VẾT CHẢI ĐI THÀNH CỤM, không rải đều — và phép dò cụm phải THẬT SỰ
        # lọc. Bản đầu viết `rnd() > 0,18 + 1,5 × cum`, mà `cum` là fbm chuẩn
        # hoá nên nó quanh 0,5, tức ngưỡng ≈ 0,93: 2 180/3 400 vệt sống sót và
        # mặt đồng thành một ô gạch chéo. Dạng smoothstep ở đây cho một ngưỡng
        # ĐỌC ĐƯỢC: dưới `clumpLo` không có vệt nào, trên `clumpLo + clumpWide`
        # thì `keep` phần được giữ.
        cum = NZ.fbm(x * 0.03, y * 0.1, 3, 2.01, 0.55)
        if rnd(i * 9.1, 2.3) > sc["keep"] * smoothstep(
                (cum - sc["clumpLo"]) / sc["clumpWide"]):
            continue
        s = dong_t(x, y)
        # ~9 % là vệt SÁNG DÀI — một đường miết bắt đèn. Không có nó thì mặt
        # đồng chỉ có vết tối, tức mắt đọc ra đá mài chứ không ra kim loại.
        if rnd(i * 7.7, 3.3) < 0.05 + 0.13 * s:
            ink.poly("the-dong", [(x, y), (x2, y2)], P["brassScratchLit"],
                     sc["width"] * 1.5, min(0.4, sc["opacity"] * (1.2 + 1.8 * s)))
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
    # ĐƯỜNG VIỀN CHÌM — một RÃNH khắc chạy vòng bên trong mép vát. Nó dùng
    # ĐÚNG luật ánh sáng của chữ khắc (nét tối ở trên, nét sáng ngay dưới, vì
    # đèn ở trên-trái), nên hai thứ đọc ra cùng một kỹ thuật gia công; và nó
    # đóng khung bốn dòng chú giải lại thành MỘT tấm biển, không bốn dòng chữ
    # rơi trên một mảng đồng.
    gr = PLATE["groove"]
    vien = [quad_pt(q, gr["u"], gr["v"]), quad_pt(q, 1 - gr["u"], gr["v"]),
            quad_pt(q, 1 - gr["u"], 1 - gr["v"]), quad_pt(q, gr["u"], 1 - gr["v"])]
    for dy, mau, op in ((0.0, P["brassScratchDark"], 0.85),
                        (1.0, P["brassScratchLit"], 0.5)):
        ink.poly("the-dong", [(p[0], p[1] + dy) for p in vien] + [
            (vien[0][0], vien[0][1] + dy)], mau, gr["width"], op)
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
    # ══ MẶT BÊN — thứ biến một hình chữ nhật có vạch thành một VẬT NẰM TRÊN
    # bàn. Bản trước có bóng đổ nhưng không có bề dày, nên thước đọc ra đúng
    # cái `box-shadow` của CSS: một hình phẳng với một vệt tối dưới chân.
    #
    # Mười dải dọc theo trục dài chứ một mảng tô: mặt bên cũng lùi xa đèn dần
    # như mặt trên, và một mảng phẳng ở đây là chỗ DUY NHẤT của cả thanh không
    # có dốc — tức chỗ mắt đọc ra "dán lên".
    cq = THUOC_CANH
    g = TOOLS["ruler"]["sideGain"]
    ink.fill("thuoc", pl(cq, True),
             ton_muot(P["rulerRamp"], thuoc_t(*quad_pt(cq, 0.5, 0.5)) * g))
    for i in range(10):
        u0, u1 = i / 10, (i + 1) / 10
        xm, ym = quad_pt(cq, (u0 + u1) / 2, 0.5)
        ink.fill("thuoc", pl([quad_pt(cq, u0, 0.0), quad_pt(cq, u1, 0.0),
                              quad_pt(cq, u1, 1.0), quad_pt(cq, u0, 1.0)], True),
                 ton_muot(P["rulerRamp"], thuoc_t(xm, ym) * g), 1.0, solo=True)
    # Thớ gỗ chạy TIẾP sang mặt bên — gỗ không đổi thớ ở một cái cạnh, và một
    # mặt bên trơn cạnh một mặt trên có thớ đọc ra hai vật liệu khác nhau.
    for i in range(int(gr["count"] * DENSITY * 0.22)):
        u, v = rnd(i * 2.3, 9.1), rnd(i * 4.7, 1.3)
        a = quad_pt(cq, u, v)
        b = quad_pt(cq, min(1.0, u + 0.03 + rnd(i * 5.1, 2.7) * 0.06), v)
        ink.poly("thuoc", [a, b], P["rulerTick"], gr["width"], gr["opacity"] * 0.8)
    # MÉP GẤP giữa hai mặt: một nét sáng mảnh — cạnh trên của mặt bên là chỗ
    # duy nhất của mặt ấy còn ngửa lên đèn. Và mép ĐÁY một nét tối: chỗ thước
    # chạm bàn, tức bóng tiếp xúc của chính nó.
    ink.poly("thuoc", [cq[0], cq[1]], P["rulerRamp"][3], 1.0, 0.9)
    ink.poly("thuoc", [cq[3], cq[2]], P["rulerTick"], 1.3, 0.75)
    # MÉP XA (`[3] → [2]`) bắt đèn: nó là cạnh ngửa nhất về phía trên-trái, và
    # nó cũng là đường viền của thanh trên nền gỗ tối hơn.
    ink.poly("thuoc", [q[3], q[2]], P["rulerRamp"][3], 1.2, 0.8)


def ve_but_chi(ink, P):
    """BÚT CHÌ — và nó phải đọc ra một cây bút chì, không một que sơn vàng.

    Bài học của cái đèn và tấm thẻ đồng: mọi vật đọc ra "hình kỹ thuật" là vì
    thiếu HÌNH chứ thiếu tông. Sáu thứ dưới đây là sáu thứ hình học khác
    nhau, không sáu bản sao của một nét:

     1. **BA MẶT của thân sáu cạnh** — mặt ngửa về đèn sáng hơn hẳn hai mặt
        bên. Một tứ giác tô đều là một cái que, và cái que ấy sẽ hợp lệ ở mọi
        phép đo độ chói.
     2. **ĐẦU GỌT CÓ MÚI** — người gọt bằng dao để lại các vạt phẳng hội tụ về
        mũi, nên nón không trơn.
     3. **LÕI CHÌ CHỈ Ở MŨI** — `coreAt` phần bề rộng. Tô đen cả nón là một
        cây bút cháy.
     4. **ĐAI CÓ GỜ** — `steelRamp`, cùng chất với com-pa (chỗ DUY NHẤT bức
        này dùng lại một thang tông, và nó dùng lại vì vật liệu trùng nhau
        chứ không vì tiện tay).
     5. **TẨY MÒN KHÔNG ĐỀU** — đầu hẹp hơn thân.
     6. **VỤN TẨY** quanh đầu chì: thứ duy nhất trong cả hai khổ ghi lại một
        cái SAI đã được xoá đi."""
    q, dai, tay, dau = BUT_THAN, BUT_DAI, BUT_TAY, BUT_DAU
    _o, (ux, uy), (nx, ny), L = but_truc()
    # MẶT NÀO NGỬA VỀ ĐÈN: tích vô hướng của pháp tuyến ngang với hướng TỪ
    # đèn tới bút. Tính ra chứ không ghi cứng — đổi `from`/`to` mà quên đổi
    # dấu là cái bút được chiếu sáng từ phía sau, và không con số nào kêu.
    cx, cy = quad_pt(q, 0.5, 0.5)
    ve_den_x, ve_den_y = LAMP["at"]["x"] - cx, LAMP["at"]["y"] - cy
    ngua = 1.0 if (nx * ve_den_x + ny * ve_den_y) < 0 else -1.0

    # ══ THÂN: ba mặt dọc, mỗi mặt lại chia 14 khúc theo chiều dài để nó lùi
    # xa đèn dần — cùng kỹ thuật mà thước và thẻ đồng dùng.
    n = PENCIL["facets"]
    g = PENCIL["facetGain"]
    ink.fill("but-chi", pl(q, True), ton_muot(P["pencilRamp"], but_t(cx, cy)))
    for f in range(n):
        v0, v1 = f / n, (f + 1) / n
        # −1 ở mặt khuất, +1 ở mặt ngửa; mặt giữa gần 0.
        huong = ((v0 + v1) - 1.0) * ngua
        for i in range(14):
            u0, u1 = i / 14, (i + 1) / 14
            xm, ym = quad_pt(q, (u0 + u1) / 2, (v0 + v1) / 2)
            ink.fill("but-chi", pl([quad_pt(q, u0, v0), quad_pt(q, u1, v0),
                                    quad_pt(q, u1, v1), quad_pt(q, u0, v1)], True),
                     ton_muot(P["pencilRamp"], but_t(xm, ym) * (1.0 + g * huong)),
                     1.0, solo=True)
    # GỜ GIỮA HAI MẶT: nét mảnh ở ranh, vì một cạnh sáu cạnh là một cạnh THẬT
    # — không có nó, ba dải tông đọc ra ba vệt sơn.
    for f in range(1, n):
        v = f / n
        ink.poly("but-chi", [quad_pt(q, 0.0, v), quad_pt(q, 1.0, v)],
                 P["pencilRamp"][3] if f / n > 0.5 * (1 + ngua) * 0.5 else P["pencilRamp"][0],
                 0.45, 0.5)
    # VỆT SƠN dọc thân — sơn phủ vẫn ánh lên theo chiều gỗ bên dưới.
    lq = PENCIL["lacquer"]
    for i in range(int(lq["count"] * DENSITY)):
        u, v = rnd(i * 2.3, 4.1), rnd(i * 6.1, 1.7)
        a = quad_pt(q, u, v)
        b = quad_pt(q, min(1.0, u + 0.05 + rnd(i * 3.7, 9.1) * 0.09), v)
        ink.poly("but-chi", [a, b], P["pencilRamp"][3] if rnd(i * 5.3, 2.9) < 0.5
                 else P["pencilRamp"][0], lq["width"], lq["opacity"])

    # ══ ĐAI KIM LOẠI — cùng `steelRamp` với com-pa, và có GỜ.
    ink.fill("but-chi", pl(dai, True),
             ton_muot(P["steelRamp"], but_t(*quad_pt(dai, 0.5, 0.5))))
    fr = PENCIL["ferrule"]
    for i in range(fr["ridges"]):
        u = (i + 0.5) / fr["ridges"]
        ink.poly("but-chi", [quad_pt(dai, u, 0.0), quad_pt(dai, u, 1.0)],
                 P["steelRamp"][0], fr["width"], 0.55)
        ink.poly("but-chi", [quad_pt(dai, min(1.0, u + 0.07), 0.0),
                             quad_pt(dai, min(1.0, u + 0.07), 1.0)],
                 P["steelRamp"][3], fr["width"] * 0.8, 0.45)

    # ══ TẨY — một tông đều (cao su không có thớ), nhưng MÉP MÒN không thẳng.
    ink.fill("but-chi", pl(tay, True), P["eraser"])
    ink.poly("but-chi", [tay[0], tay[3]], P["steelRamp"][0], 0.8, 0.45)

    # ══ ĐẦU GỌT: vạt dao hội tụ về mũi, rồi lõi chì.
    ink.fill("but-chi", pl(dau, True),
             ton_muot(P["pencilBare"], but_t(*dau[1])))
    tp = PENCIL["tip"]
    chan, mui = (dau[0], dau[2]), dau[1]
    for i in range(tp["facets"] + 1):
        t = i / tp["facets"]
        a = (chan[0][0] + (chan[1][0] - chan[0][0]) * t,
             chan[0][1] + (chan[1][1] - chan[0][1]) * t)
        ink.poly("but-chi", [a, mui],
                 P["pencilBare"][2] if abs(t - 0.5 - 0.22 * ngua) < 0.2
                 else P["pencilBare"][0], tp["width"], 0.6)
    # LÕI CHÌ — chỉ `coreAt` phần cuối nón.
    u1 = L - tp["len"]
    lo = tp["coreAt"]
    ink.fill("but-chi", pl([_but_p(L - tp["len"] * lo, -lo), _but_p(L, 0),
                            _but_p(L - tp["len"] * lo, lo)], True), P["graphite"])
    # Một nét SÁNG trên cạnh ngửa về đèn: gỗ mới gọt bắt đèn mạnh, và đó là
    # thứ nói ra cái nón có BỀ MẶT chứ chỉ có đường bao.
    ink.poly("but-chi", [_but_p(u1, ngua), _but_p(L, 0)], P["pencilBare"][2], 0.6, 0.8)
    # ══ MÉP NGỬA VỀ ĐÈN của cả thân — một nét sáng mảnh chạy suốt từ đai tới
    # chân nón. Không có nó, mặt sơn tối ở cạnh dưới hoà thẳng vào cái bóng
    # của chính cây bút và cả vật đọc ra NỬA cây bút: cùng khuyết tật mà mặt
    # bên của thước đã phải chữa bằng một nét ở `[3] → [2]`.
    ink.poly("but-chi", [_but_p(PENCIL["ferrule"]["len"], ngua), _but_p(u1, ngua)],
             P["pencilRamp"][3], 0.7, 0.85)

    # ══ VỤN TẨY — chấm, rải quanh đầu chì. Chúng KHÔNG đổ bóng: ở cỡ dưới
    # một đơn vị, một cái bóng là một chấm thứ hai đặt cạnh chấm thứ nhất.
    cr = PENCIL["crumbs"]
    for i in range(int(cr["count"] * DENSITY)):
        th = rnd(i * 3.7, 2.1) * math.tau
        r = math.sqrt(rnd(i * 5.9, 7.3)) * cr["spread"]
        x = cr["at"]["x"] + math.cos(th) * r
        y = cr["at"]["y"] + math.sin(th) * r * 0.62
        if not (0 <= x <= W and tren_ban(x, y) and y <= H) or trong_da_giac(x, y, BUT_KHOI):
            continue
        ink.stroke("but-chi", dot(x, y), P["eraser"],
                   cr["size"] * 2 * (0.6 + rnd(i * 1.3, 8.7) * 0.8),
                   cr["opacity"] * (0.5 + 0.5 * sang(x, y)))


def com_pa_poly():
    d = TOOLS["divider"]
    hx, hy = d["hinge"]["x"], d["hinge"]["y"]
    out = []
    for leg in d["legs"]:
        out.append(((hx, hy), (leg["x"], leg["y"])))
    return out


def com_pa_than(a, b):
    """Đa giác THÂN của một chân com-pa — THON, không một thanh đều bề rộng.

    Rộng `taperHi` ở khớp, nhỏ còn `taperLo` ở mũi. Thon là thứ đầu tiên mắt
    đọc ra "một chân com-pa" chứ "một đoạn thẳng": một thanh thép đều bề rộng
    từ khớp tới mũi là một que, và cái que ấy đã là lời chê.

    Thứ tự đỉnh: hai đỉnh đầu ở phía `+n`, hai đỉnh sau ở `−n` — `ve_com_pa`
    đọc lại đúng thứ tự ấy để biết cạnh nào quay về đèn."""
    d = TOOLS["divider"]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / L, dx / L
    wh, wl = d["width"] * d["taperHi"], d["width"] * d["taperLo"]
    return [(a[0] + nx * wh, a[1] + ny * wh), (b[0] + nx * wl, b[1] + ny * wl),
            (b[0] - nx * wl, b[1] - ny * wl), (a[0] - nx * wh, a[1] - ny * wh)]


def khop_poly(k=1.0):
    """Đa giác ĐĨA KHỚP XOAY, nén nhẹ theo trục dọc như mọi vật nằm trên mặt
    bàn nhìn xiên. `k` nhân bán kính (bóng đổ dùng đúng hình này)."""
    d = TOOLS["divider"]
    r = d["knurl"]["r"] * k
    hx, hy = d["hinge"]["x"], d["hinge"]["y"]
    return [(hx + math.cos(math.tau * j / 16) * r,
             hy + math.sin(math.tau * j / 16) * r * 0.9) for j in range(16)]


def com_pa_quads():
    """Hình CHE của com-pa: hai thân THON + đĩa khớp. `che_boi` đọc danh sách
    này, nên nó phải là đúng hình được VẼ — một hình che rộng hơn thân thật
    là một phép đo tương phản bỏ qua những nét không hề bị che."""
    return [com_pa_than(a, b) for a, b in com_pa_poly()] + [khop_poly()]


def ve_com_pa(ink, P):
    """COM-PA — thứ vẽ ra 128 vòng đồng tâm, nên nó cũng mang nghĩa.

    Nó nằm NGANG TRÊN sổ tay, nên bóng của nó rơi lên GIẤY chứ không lên gỗ:
    chỗ duy nhất trong bức chứng minh được bóng đổ bám theo vật BÊN DƯỚI chứ
    không phải một vệt đen dán lên mặt bàn.

    ── VÌ SAO BA NÉT SONG SONG KHÔNG ĐỦ ────────────────────────────────────

    Bản trước vẽ mỗi chân bằng BA NÉT (sáng / giữa / tối) đặt cạnh nhau. Ở xa
    nó đọc được; ở gần nó là ba đường kẻ cách đều, tức đúng cái "hình kỹ
    thuật" mà cả bức sinh ra để thôi là. Một thanh thép có BỐN thứ, và cả bốn
    là hình học chứ độ đậm:

     1. **THÂN THON** — rộng ở khớp, nhỏ về mũi. Một thanh đều bề rộng là một
        que, và ba nét song song thì luôn đều bề rộng.
     2. **DỐC DỌC THÂN** — thép phản xạ mạnh, nên nửa gần đèn sáng hơn hẳn
        nửa xa. Sáu dải theo chiều dài, cùng kỹ thuật mà thước và thẻ đồng
        dùng, ở cỡ nhỏ.
     3. **HAI CẠNH KHÁC NHAU VỀ CHẤT** — cạnh quay về đèn là một đường SẮC
        (kim loại mài), cạnh kia chìm hẳn. Nét sáng phải nằm ĐÚNG trên mép,
        không song song cách mép một quãng.
     4. **VỆT LOÉ** chạy dọc bên trong cạnh sáng, ngắn hơn thân — đó là thứ
        duy nhất nói "mặt này cong", vì một mặt trụ bắt sáng thành một dải
        hẹp chứ không sáng đều.

    Và khớp xoay là một VẬT TRÒN CÓ BÓNG RIÊNG (`hingeShadowH`), không một
    chấm sơn: nó dày gấp ba thân, nên dùng chung độ cao biểu kiến với thân là
    chép một con số sang chỗ nó sai."""
    d = TOOLS["divider"]
    for (a, b) in com_pa_poly():
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1.0
        q = com_pa_than(a, b)
        # Cạnh nào quay VỀ đèn — không ghi cứng "bên trên", vì `ROOM_LAMP.at`
        # đổi là hướng ấy đổi theo. `q[0:2]` là phía `+n` (xem `com_pa_than`).
        nx, ny = -dy / L, dx / L
        lx, ly = LAMP["at"]["x"] - (a[0] + b[0]) / 2, LAMP["at"]["y"] - (a[1] + b[1]) / 2
        lL = math.hypot(lx, ly) or 1.0
        sang_tren = nx * lx / lL + ny * ly / lL > 0
        canh_sang = (q[0], q[1]) if sang_tren else (q[3], q[2])
        canh_toi = (q[3], q[2]) if sang_tren else (q[0], q[1])
        ink.fill("com-pa", pl(q, True), P["steelRamp"][1])
        for i in range(6):
            u0, u1 = i / 6, (i + 1) / 6
            xm, ym = quad_pt(q, (u0 + u1) / 2, 0.5)
            t = 0.12 + 0.8 * sang(xm, ym)
            ink.fill("com-pa", pl([quad_pt(q, u0, 0.0), quad_pt(q, u1, 0.0),
                                   quad_pt(q, u1, 1.0), quad_pt(q, u0, 1.0)], True),
                     ton_muot(P["steelRamp"], t), 1.0, solo=True)
        ink.poly("com-pa", list(canh_sang), P["steelRamp"][3], 0.7, 0.95)
        ink.poly("com-pa", list(canh_toi), P["steelRamp"][0], 0.9, 0.9)
        # VỆT LOÉ: lùi vào `specAt` bề rộng kể từ cạnh sáng, dài `specLen`.
        v = d["specAt"] if sang_tren else 1 - d["specAt"]
        ink.poly("com-pa", [quad_pt(q, 0.08, v), quad_pt(q, 0.08 + d["specLen"], v)],
                 P["steelRamp"][3], 0.5, 0.55)
        # KIM: mũi nhọn, nét mảnh dần — và nó CHẠM mặt giấy, nên có một chấm
        # tối ngay dưới mũi (bóng tiếp xúc nhỏ nhất của bức).
        ux, uy = dx / L, dy / L
        ink.poly("com-pa", [(b[0] - ux * d["needle"], b[1] - uy * d["needle"]), b],
                 P["steelRamp"][3], 1.5, 0.95)
        ink.stroke("com-pa", dot(b[0] + 1.4, b[1] + 1.2), P["shadow"], 2.6, 0.6)
    # KHỚP XOAY: đĩa có khía, và nó có KHỐI — vành quay về đèn là một cung
    # sáng, vành đối diện một cung tối, giữa là một núm lồi.
    kn = d["knurl"]
    hx, hy = d["hinge"]["x"], d["hinge"]["y"]
    th_den = math.atan2(LAMP["at"]["y"] - hy, LAMP["at"]["x"] - hx)
    ink.fill("com-pa", pl(khop_poly(), True), P["steelRamp"][1])
    for k in range(kn["teeth"]):
        th = math.tau * k / kn["teeth"]
        f = 0.5 + 0.5 * math.cos(th - th_den)
        ink.poly("com-pa", [(hx + math.cos(th) * kn["r"] * 0.5,
                             hy + math.sin(th) * kn["r"] * 0.45),
                            (hx + math.cos(th) * kn["r"] * 0.97,
                             hy + math.sin(th) * kn["r"] * 0.88)],
                 P["steelRamp"][3] if f > 0.6 else P["steelRamp"][0], 0.9, 0.5 + 0.4 * f)
    # Hai cung vành: mỗi cung nửa đĩa, dựng quanh HƯỚNG TỚI ĐÈN chứ quanh một
    # góc ghi cứng — đổi chỗ đèn là hai cung tự xoay theo.
    for goc, mau, w in ((th_den, P["steelRamp"][3], 1.3),
                        (th_den + math.pi, P["steelRamp"][0], 1.5)):
        ink.poly("com-pa", [(hx + math.cos(goc + (j / 8 - 0.5) * 2.0) * kn["r"] * 0.95,
                             hy + math.sin(goc + (j / 8 - 0.5) * 2.0) * kn["r"] * 0.86)
                            for j in range(9)], mau, w, 0.85)
    ink.fill("com-pa", pl([(hx + math.cos(math.tau * k / 12) * kn["r"] * 0.32,
                            hy + math.sin(math.tau * k / 12) * kn["r"] * 0.3)
                           for k in range(12)], True), P["steelRamp"][0], 0.9)
    ink.stroke("com-pa", dot(hx + math.cos(th_den) * kn["r"] * 0.17,
                             hy + math.sin(th_den) * kn["r"] * 0.15),
               P["steelRamp"][3], 1.8, 0.8)


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
    if "the-dong" not in VE:
        return ra
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
    return min((r[1] for r in ra), default=float('inf'))


def do_tuong_phan_net(P):
    """TƯƠNG PHẢN CỦA NÉT MANG TIN với nền tại chỗ nó nằm — sàn 3 : 1 (WCAG
    1.4.11 cho thành phần đồ hoạ mang tin).

    Hai nhóm nét, và cả hai MANG TIN chứ không phải chất liệu: phác chòm sao
    trên trang phải (nó nói bức trên là cái gì) và vạch chia trên thước (nó
    làm cái thước thành cái thước). Thớ gỗ, sợi giấy, vân xước KHÔNG đi qua
    sàn này — chúng là chất liệu, và một sàn tương phản áp cho chất liệu là
    cách chắc chắn nhất để xoá chất liệu."""
    ra = []
    if "so-tay" in VE:
        sk = BOOK["sketch"]
        pts = [quad_pt(TRANG_PHAI, 0.12 + p[0] * 0.78, 0.1 + p[1] * 0.74)
               for p in sk["stars"]]
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
    if "thuoc" in VE:
        tk = TOOLS["ruler"]["ticks"]
        for i in range(tk["per"] + 1):
            u = i / tk["per"]
            x, y = quad_pt(THUOC, u, 0.1)
            if che_boi(x, y, "thuoc"):
                continue
            nen = nen_rgb(x, y, P)
            mau = over(nen, hex_rgb(P["rulerTick"]), 0.9)
            ra.append(("vạch thước", tuong_phan(nen, mau), (round(x), round(y))))
    if "but-chi" in VE:
        # LÕI CHÌ là thứ làm cây bút thành cây bút — cùng hạng với vạch thước.
        # Nền của nó là MẶT NÓN GỖ MỚI GỌT ngay sau nó, không phải mặt bàn:
        # đo trên gỗ bàn (tối hơn nhiều) là một con số dễ đạt nói về một cặp
        # màu bức tranh không có — đúng cái bẫy `che_boi` sinh ra để chặn.
        tp = PENCIL["tip"]
        _o, _u, _n, L = but_truc()
        for k in range(3):
            t = 0.45 + k * 0.18
            x, y = _but_p(L - tp["len"] * tp["coreAt"] * (0.2 + 0.3 * k), 0.0)
            nx_, ny_ = _but_p(L - tp["len"] * t, 0.0)
            nen = nen_rgb(nx_, ny_, P)
            ra.append(("lõi chì", tuong_phan(nen, hex_rgb(P["graphite"])),
                       (round(x), round(y))))
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
    return min((r[1] for r in ra), default=float('inf'))


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
    nb = BUDGET["deepBands"]
    Ls = []
    # PHẦN ĐEN theo BĂNG NGANG: tổng số mẫu và số mẫu dưới `bands[0]` của
    # từng băng. Một con số cho CẢ khung không bắt được "hai phần ba dưới
    # chìm hẳn" — xem `ROOM_BUDGET.deepShareMax`.
    bang_o, bang_den = [0] * nb, [0] * nb
    y0 = DESK["edgeY"]
    for i in range(0, int(W), step):
        x = i + step / 2
        for j in range(0, int(H), step):
            y = j + step / 2
            if not tren_ban(x, y):
                continue
            L = luminance(nen_rgb(x, y, P))
            Ls.append(L)
            k = min(nb - 1, max(0, int((y - y0) / max(1e-6, H - y0) * nb)))
            bang_o[k] += 1
            if L < BUDGET["bands"][0]:
                bang_den[k] += 1
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
        "sang": sum(1 for L in Ls if L > BRIGHT_AT) / o,
        "bac": [c / o for c in dem],
        "mid": sum(1 for L in Ls if lo < L <= hi) / o,
        "den_bang": [(d / n if n else 0.0) for d, n in zip(bang_den, bang_o)],
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
    # ── PHẦN ĐEN THEO BĂNG NGANG ────────────────────────────────────────
    #
    # Cái sàn `midShareMin` ở trên đếm bậc GIỮA trên CẢ mặt bàn, và chính vì
    # vậy nó đã để lọt bản dọc ngày 20/10: bức ấy đo bậc giữa 43 % (đạt) với
    # 37 % diện tích ở L < 0,01 — tức một dải mà hai phần ba DƯỚI chìm hẳn
    # thành đen, nhìn ra là "một mẫu vân gỗ" chứ một cái cảnh. Một con số
    # trung bình trên cả khung KHÔNG thể nói ra chuyện ấy: nó cộng một nửa
    # rất sáng với một nửa đen rồi báo một con số lành.
    #
    # Nên phép gác phải hỏi TỪNG BĂNG: ở mỗi tầng của bức, bao nhiêu phần
    # diện tích tối tới mức không nét nào còn đọc được? Đó cũng là định
    # nghĩa của "diện tích KHÔNG mang nội dung" — dưới L = 0,01, thớ gỗ,
    # khe ván và mọi phản chiếu khẽ đều nằm dưới ngưỡng thấy được, nên một
    # băng đen là một băng trống dù có bao nhiêu nét trong tệp.
    te = [(k, v) for k, v in enumerate(d["den_bang"]) if v > BUDGET["deepShareMax"]]
    if te:
        k, v = max(te, key=lambda r: r[1])
        raise SystemExit(
            "BĂNG %d/%d của mặt bàn có %.1f%% diện tích ở L<%g, vượt trần %.0f%% — "
            "chỗ ấy không nét nào đọc được, nên nó là diện tích TRỐNG dù tệp có bao "
            "nhiêu nét đi nữa (%d/%d băng trượt). Nới `ROOM_LAMP.spread` của khổ này, "
            "hay thu ngắn khung lại cho vừa tầm ngọn đèn."
            % (k + 1, BUDGET["deepBands"], v * 100, BUDGET["bands"][0],
               BUDGET["deepShareMax"] * 100, len(te), BUDGET["deepBands"]))
    if d["trung_vi"] > BUDGET["medianMax"]:
        raise SystemExit(
            "TRUNG VỊ ĐỘ CHÓI %.3f vượt trần %g — cả mặt bàn đang sáng đều, tức cái "
            "nguồn sáng duy nhất thôi là một nguồn sáng. Hạ `ROOM_LIT.ambient`."
            % (d["trung_vi"], BUDGET["medianMax"]))
    if d["sang"] < BUDGET["brightShareMin"]:
        raise SystemExit(
            "chỉ %.3f%% diện tích trên L>%g, dưới sàn %.1f%% — không có chỗ nào RỰC, "
            "nên cái đèn không đọc ra là một nguồn sáng. Nới `ROOM_LAMP.profile` ở "
            "phần lõi." % (d["sang"] * 100, BUDGET["brightShareMin"] * 100))
    return d


# ═══════════════════════════════════════════════════════════════════════
# 15 · DỰNG BỨC
# ═══════════════════════════════════════════════════════════════════════

# (tên, đa giác, độ cao biểu kiến) — `kiem_bong_mot_nguon` đọc lại danh sách
# này, nên một vật được vẽ bóng mà không khai ở đây là một vật không được kiểm.
VAT_BONG: list[tuple[str, list, float]] = []


def _tron(goc, moi):
    """Trộn SÂU `moi` lên `goc`. Khổ dọc khai một DELTA, không khai lại cả hồ
    sơ: chép lại trọn `ROOM_DESK` cho khổ thứ hai là hai bản sẽ trôi xa nhau ở
    đúng chỗ một con số bị sửa một bên — cùng cái bẫy mà bản đồ vực trả giá
    khi lớp chuyển động chép bốn mốc địa tầng."""
    ra = dict(goc)
    for k, v in moi.items():
        ra[k] = _tron(goc[k], v) if isinstance(v, dict) and isinstance(goc.get(k), dict) else v
    return ra


def dung_kho(kho):
    """Chuyển bộ sinh sang một KHỔ — và rebind MỌI hằng dẫn xuất.

    Đây là chỗ một lỗi im lặng dễ nằm nhất của cả tệp: `HORIZON`, `_UA`,
    `TRANG_TRAI`, `THUOC`, `_STACK`… đều tính MỘT LẦN lúc nạp module từ hồ sơ
    khổ ngang. Quên rebind một trong số chúng thì khổ dọc vẽ bằng phối cảnh
    (hay bằng chồng vòng ánh đèn) của khổ ngang — ra một tệp hợp lệ, đúng kích
    thước, không ngoại lệ nào, và sai ở đúng thứ không ai đi tìm.

    Vật KHÔNG được vẽ thì hình của nó về RỖNG, chứ không giữ toạ độ cũ:
    `che_boi` và `nen_rgb` đọc những hình ấy, nên một cuốn sổ "vô hình" ở toạ
    độ khổ ngang sẽ che mất một vùng của khổ dọc trong MỌI phép đo."""
    global DESK, LAMP, BOOK, PLATE, TOOLS, W, H, HORIZON, _UA, _UB, DENSITY, VE
    global SP, LF, RT, TRANG_TRAI, TRANG_PHAI, THE_DONG, THUOC, THUOC_CANH, THUOC_KHOI
    global _STACK, BRIGHT_AT, BUT_THAN, BUT_DAI, BUT_TAY, BUT_DAU, BUT_KHOI
    o = kho["over"]
    DESK = _tron(_GOC["desk"], o.get("desk", {}))
    LAMP = _tron(_GOC["lamp"], o.get("lamp", {}))
    BOOK = _tron(_GOC["book"], o.get("book", {}))
    PLATE = _tron(_GOC["plate"], o.get("plate", {}))
    TOOLS = _tron(_GOC["tools"], o.get("tools", {}))
    W, H = kho["frame"]["width"], kho["frame"]["height"]
    DENSITY = kho["density"]
    VE = set(kho["draw"])
    BRIGHT_AT = kho["brightAt"]
    HORIZON = DESK["edgeY"] - DESK["horizonLift"]
    _UA = 1.0 / (DESK["edgeY"] - HORIZON)
    _UB = 1.0 / (H - HORIZON)
    SP, LF, RT = BOOK["spine"], BOOK["left"], BOOK["right"]
    if "so-tay" in VE:
        TRANG_TRAI = [(SP["farX"], SP["farY"]), (LF["farX"], LF["farY"]),
                      (LF["nearX"], LF["nearY"]), (SP["nearX"], SP["nearY"])]
        TRANG_PHAI = [(SP["farX"], SP["farY"]), (RT["farX"], RT["farY"]),
                      (RT["nearX"], RT["nearY"]), (SP["nearX"], SP["nearY"])]
    else:
        TRANG_TRAI, TRANG_PHAI = [], []
    THE_DONG = [tuple(p) for p in PLATE["quad"]] if "the-dong" in VE else []
    if "thuoc" in VE:
        THUOC = thuoc_quad()
        THUOC_CANH = thuoc_canh_quad()
        THUOC_KHOI = bao_loi(THUOC + THUOC_CANH)
    else:
        THUOC, THUOC_CANH, THUOC_KHOI = [], [], []
    # Bút chì: bốn hình con + hình CHE. Khổ nào không vẽ nó phải cho hình
    # RỖNG chứ giữ toạ độ cũ — `che_boi`/`nen_rgb` đọc chúng, nên một cây bút
    # "vô hình" vẫn che một vùng của khổ kia trong MỌI phép đo.
    BUT_THAN, BUT_DAI = but_quad(), but_dai_quad()
    BUT_TAY, BUT_DAU = but_tay_quad(), but_dau_poly()
    BUT_KHOI = bao_loi(BUT_THAN + BUT_DAI + BUT_TAY + BUT_DAU) if BUT_THAN else []
    # Chồng vòng ánh đèn phụ thuộc `LAMP` — không xoá là khổ sau dùng lại vũng
    # sáng của khổ trước, và nó sẽ TRÙNG KHỚP với mọi phép đo (chúng cũng đọc
    # cái chồng ấy), tức không một con số nào kêu.
    _STACK = None
    _REV[:] = []


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
    # Mỗi vật chỉ được dựng khi KHỔ đang vẽ có khai nó (`ROOM_FORMATS.draw`).
    # Khổ dọc bỏ sổ và thẻ đồng vì giao diện điện thoại ĐÃ LÀ cuốn sổ và tấm
    # thẻ — xem chú thích `ROOM_FORMATS` ở TS.
    for ten, poly, hh, lop, tx, chu in (
        ("thẻ đồng", THE_DONG, h["plate"], "bong-xa", (2, 3), None),
        # Bóng thước dựng từ MẶT TRÊN (hình và mép tiếp đất của nó), nhưng
        # hình CHE là cả khối: mặt bên không nằm trong bóng của chính thước.
        ("thước", THUOC, h["ruler"], "bong-xa", (2, 3), THUOC_KHOI),
        # Bút chì đổ bóng từ CẢ cây (hình che), không từ riêng thân sơn: cục
        # tẩy và đầu gọt cũng chặn ánh sáng, và một cái bóng ngắn hơn vật là
        # thứ nói ra vật đang lơ lửng.
        ("bút chì", BUT_KHOI, h["pencil"], "bong-xa", None, BUT_KHOI),
    ):
        if not poly:
            continue
        VAT_BONG.append((ten, poly, hh))
        ve_bong(ink, lop, poly, hh, P, tx, chu)
    if "the-dong" in VE:
        ve_the_dong(ink, P)
    if "thuoc" in VE:
        ve_thuoc(ink, P)
    if "but-chi" in VE:
        ve_but_chi(ink, P)

    cho_bong = []
    if "so-tay" in VE:
        cho_bong += [("sổ tay trái", TRANG_TRAI, h["book"], (2, 3)),
                     ("sổ tay phải", TRANG_PHAI, h["book"], (2, 3))]
    if "den" in VE:
        cho_bong.append(("đế đèn", de_den_poly(), h["lampBase"], None))
    for ten, poly, hh, tx in cho_bong:
        VAT_BONG.append((ten, poly, hh))
        ve_bong(ink, "bong-giua", poly, hh, P, tx)
    if "so-tay" in VE:
        ve_so_tay(ink, P)

    if "com-pa" in VE:
        # Bóng com-pa dựng từ ĐÚNG hình thân thon được vẽ, không từ một hình
        # chữ nhật xấp xỉ: một cái bóng rộng đều trong khi vật thon dần là thứ
        # nói ra bóng không thuộc về vật nào.
        for i, (a, b) in enumerate(com_pa_poly()):
            poly = com_pa_than(a, b)
            VAT_BONG.append(("com-pa chân %d" % (i + 1), poly, h["divider"]))
            ve_bong(ink, "bong-gan", poly, h["divider"], P, None)
        # KHỚP XOAY đổ bóng RIÊNG, và cao hơn thân: nó là vật tròn dày nhất
        # của com-pa, nên một cái đĩa không có bóng của chính nó đọc ra là một
        # chấm sơn trên giấy.
        khop = khop_poly(0.92)
        VAT_BONG.append(("com-pa khớp", khop, TOOLS["divider"]["hingeShadowH"]))
        ve_bong(ink, "bong-gan", khop, TOOLS["divider"]["hingeShadowH"], P, None)
        ve_com_pa(ink, P)

    if "den" in VE:
        ve_quang_den(ink, P)
        ve_den(ink, P)
    if "the-dong" in VE:
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
    ap.add_argument("--kho", default=None,
                    help="chỉ dựng một khổ (ngang | doc); mặc định dựng cả hai")
    args = ap.parse_args()

    name = "ROOM_PROFILE_%s" % args.profile.upper()
    if not re.search(r"export const %s\b" % name, SRC):
        raise SystemExit(
            "room-art.ts chưa có %s. Bộ sinh KHÔNG biết màu nào cả — thêm một profile "
            "ở TS là chạy được ngay, không phải sửa tệp này." % name)
    P = grab(name)

    khos = [k for k in FORMATS if args.kho in (None, k["key"])]
    if not khos:
        raise SystemExit("không có khổ '%s' trong ROOM_FORMATS (room-art.ts)" % args.kho)
    for kho in khos:
        dung_kho(kho)
        mot_kho(kho, P, args)


def mot_kho(kho, P, args):
    """Dựng MỘT khổ — đo, gác, rồi ghi. Mọi phép gác chạy lại cho TỪNG khổ:
    một cái sàn chỉ kiểm bản ngang là một cái sàn không gác bản mà nửa số
    người xem sẽ thấy."""
    ink = build(P)
    MAX = kho["maxKb"]

    if args.do:
        # ĐO rồi IN rồi mới GÁC: `--do` là cái kính hiển vi của người đang
        # dựng, và trượt sàn trước khi in bảng là lấy đi đúng cái bảng cần đọc
        # để biết phải sửa chỗ nào. Đường dựng tệp thì gác TRƯỚC khi ghi.
        d = do_ngan_sach(P)
        buoc, tai = do_buoc_dai(P)
        print()
        print("  ══ KHỔ %s · %d × %d ══" % (kho["key"].upper(), W, H))
        print("  nét tổng           %d" % ink.n)
        print("  trung vị độ chói   %.4f   (trần %g)" % (d["trung_vi"], BUDGET["medianMax"]))
        print("  phân vị 99         %.4f" % d["p99"])
        print("  %% diện tích L>%.2f %.3f%%  (sàn %.1f%%)" % (BRIGHT_AT,
                 d["sang"] * 100, BUDGET["brightShareMin"] * 100))
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
        print("  %-20s %s   (trần %.0f%% MỖI BĂNG)"
              % ("PHẦN ĐEN mỗi băng",
                 " ".join("%.0f%%" % (v * 100) for v in d["den_bang"]),
                 BUDGET["deepShareMax"] * 100))
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

    svg = ink.render(kho["alt"])
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
    if kb > MAX:
        raise SystemExit(
            "khổ %s vượt trần %d KB — hạ `density` của khổ ấy, hay hạ "
            "`ROOM_DESK.grain.per`. Tiền cảnh nằm NGAY TRÊN màn hình đầu tiên nên nó "
            "vào LCP cùng tấm trời, và tấm trời đã lấy 285 KB của ngân sách 900 KB. "
            "(đang %.1f KB)" % (kho["key"], MAX, kb))

    out_dir = Path(args.out) if args.out else OUT
    # `os.makedirs` chứ không `Path.mkdir`: trên Windows + Python 3.14,
    # `mkdir(exist_ok=True)` vẫn ném WinError 183 với một thư mục đã có.
    os.makedirs(out_dir, exist_ok=True)
    f = out_dir / kho["file"]
    f.write_text(svg, encoding="utf-8")
    print("%-22s %7d nét %8.1f KB  (trần %d)" % (f.name, ink.n, kb, MAX))
    print("  bước dải %.2f/255 mã màu · bậc giữa %.1f%% · %d vật có bóng"
          % (buoc, do_ngan_sach(P)["mid"] * 100, len(VAT_BONG)))


if __name__ == "__main__":
    main()
