#!/usr/bin/env python3
"""RASTER HOÁ bộ SVG bản đồ sao rồi ĐO phân bố độ chói — cái thước THẬT.

    py -I scripts/star/raster.py            # bảng hai cột: mô hình ‖ raster
    py -I scripts/star/raster.py --buoc 1   # đo từng điểm ảnh (chậm hơn ~4×)
    py -I scripts/star/raster.py --json x   # ghi số đo ra JSON cho ca test
    py -I scripts/star/raster.py --out DIR  # đo một thư mục khác
    py -I scripts/star/raster.py --png a.png --buoc 1          # XEM bức tranh
    py -I scripts/star/raster.py --png b.png --lop troi,sao-nen  # chỉ vài lớp

**ĐỔI HỒ SƠ THÌ XUẤT PNG VÀ NHÌN, ĐỪNG CHỈ ĐỌC BẢNG.** Xem `ghi_png` cho
bốn khuyết tật mà bảng tám bậc không bắt được một cái nào.

VÌ SAO TỆP NÀY TỒN TẠI, và vì sao nó không được là một script tạm nữa.

`build_sky.py --do` đo bằng MÔ HÌNH: `do_sang_rgb` dựng lại độ chói từ chính
các TRƯỜNG mà các lớp dùng (đếm xem một điểm bị bao nhiêu bậc đồng mức phủ,
rồi cộng độ mờ theo thứ tự lớp). Một phép đo dựng lại từ trường KHÔNG phải một
phép đo bức tranh: nó không biết `<path>` ghi ra có thật sự khép lại không,
không biết `fill-rule` có XOR mất bậc trong cùng không, không biết lớp nào nằm
trên lớp nào trong tệp. Cả ba thứ ấy đã từng sai CÙNG LÚC, và không một ca nào
trong kho mã bắt được — vì mọi ca đều đọc mô hình.

Ba lỗi mà chính bộ raster này bắt được (ghi trong AGENTS.md mục bản đồ sao):
  · hình LỒNG NHAU gộp vào một `<path>` ⇒ `evenodd` XOR các bậc với nhau;
  · lõi nguồn sáng bão hoà ra một đa giác suy biến;
  · lớp `tinh-van` nằm TRÊN `nguon-sang` ⇒ phủ kín cái lõi trắng.
Lúc đó mô hình nói bậc giữa 47,3 % còn tranh thật đo ra 4,3 %.

Và lần thứ tư: sau khi chữa cả ba, mô hình nói 47,3 % mà raster nói 23,8 % —
chênh 23 điểm phần trăm, toàn bộ nằm ở tinh vân. Nguyên nhân là `contours()`
để lại đường HỞ: vùng bên trong một đường hở không được tô, nên mỗi đường hở
là một mảng tinh vân biến mất khỏi bức. Chữa xong, raster lên 44,4 %.

KHÔNG DÙNG THƯ VIỆN NGOÀI. Bản tìm ra ba lỗi trên viết bằng numpy + PIL, và
đúng vì thế mà nó không commit được: môi trường chạy `build_sky.py` (CI của
frontend, `star-map.test.mjs` tự tìm `py`/`python3`) không có hai thứ ấy. Một
cái thước chỉ chạy được trên một máy thì lần sau vẫn là script tạm. Nên phần
vẽ ở đây là marching-scanline thuần stdlib: đủ cho ĐÚNG tập con SVG mà
`build_sky.py` sinh (`<path>` tô/nét, `<circle>`, lệnh `M l h v a Z`, cung
tròn). `<text>` bị bỏ qua — chữ chiếm quá ít diện tích để đổi một chữ số
thập phân nào, và nó không phải thứ cần canh.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_sky as bs                                        # noqa: E402

GOC = Path(__file__).resolve().parents[2]
MAC_DINH = GOC / "frontend" / "public" / "map" / "star"

# Tám bậc độ chói của `bo-cuc-hung-vi.md` §1 và cột tham chiếu đo trên
# `design/tham-chieu/ban-do-sao-game.png`. Cùng một bảng với `--do`, cố ý: đặt
# hai cột cạnh nhau chỉ có nghĩa khi hai cột đếm cùng một thứ.
MOC = bs.BUDGET["bands"]
TEN = ["đen sâu  < 0,01", "nền trời 0,01–0,03", "t.vân mờ 0,03–0,08",
       "tinh vân 0,08–0,18", "t.vân sáng 0,18–0,35", "rìa quầng 0,35–0,60",
       "quầng    0,60–0,85", "lõi chói > 0,85"]
TC = [20.5, 23.1, 24.0, 11.0, 8.0, 7.4, 3.7, 2.5]
TC_MID, TC_MID3 = 46.8, 43.0


# ═══════════════════════════════════════════════════════════════════════
# 1 · đọc `d` → danh sách đường gấp khúc
# ═══════════════════════════════════════════════════════════════════════

_SO = re.compile(r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")


def _so(d, i):
    """Số kế tiếp từ vị trí `i`, bỏ qua dấu cách và dấu phẩy."""
    m = _SO.search(d, i)
    return float(m.group()), m.end()


def cung_tron(x0, y0, r, laf, sf, x1, y1):
    """Cung TRÒN theo tham số hoá điểm-cuối của SVG (`A rx ry 0 laf sf x y`
    với rx == ry). Cả 2 688 lệnh `a` trong bộ tệp đều là hình này: quầng sao
    và vành đai hành tinh, mỗi hình tròn ghép từ hai nửa cung. Bản raster tạm
    trước đây NỐI THẲNG tới điểm cuối, nên cả lớp `quang-sao` biến thành đa
    giác suy biến và mất hẳn khỏi phép đo."""
    dx, dy = (x1 - x0) / 2, (y1 - y0) / 2
    q = dx * dx + dy * dy
    r = max(r, math.sqrt(q))                 # bán kính nhỏ quá: SVG tự nới
    h = math.sqrt(max(0.0, r * r - q))
    s = 1 if laf != sf else -1
    cx = (x0 + x1) / 2 + s * h * (-dy) / math.sqrt(q) if q else x0
    cy = (y0 + y1) / 2 + s * h * dx / math.sqrt(q) if q else y0
    a0 = math.atan2(y0 - cy, x0 - cx)
    a1 = math.atan2(y1 - cy, x1 - cx)
    da = a1 - a0
    if sf and da < 0:
        da += math.tau
    if not sf and da > 0:
        da -= math.tau
    n = max(6, int(abs(da) * r / 1.2) + 1)
    return [(cx + r * math.cos(a0 + da * k / n), cy + r * math.sin(a0 + da * k / n))
            for k in range(1, n + 1)]


def giai_d(d):
    """`d` → [(điểm…, kín?)]. Tập lệnh của `build_sky.py`: M l h v a Z."""
    ra, cur, kin = [], [], False
    x = y = 0.0
    i, n = 0, len(d)
    while i < n:
        ch = d[i]
        if ch == "M":
            if cur:
                ra.append((cur, kin))
            x, i = _so(d, i + 1)
            y, i = _so(d, i)
            cur, kin = [(x, y)], False
        elif ch == "l":
            dx, i = _so(d, i + 1)
            dy, i = _so(d, i)
            x, y = x + dx, y + dy
            cur.append((x, y))
        elif ch == "h":
            dx, i = _so(d, i + 1)
            x += dx
            cur.append((x, y))
        elif ch == "v":
            dy, i = _so(d, i + 1)
            y += dy
            cur.append((x, y))
        elif ch == "a":
            v = []
            while len(v) < 7:
                t, i = _so(d, i if v else i + 1)
                v.append(t)
            pts = cung_tron(x, y, v[0], int(v[3]), int(v[4]), x + v[5], y + v[6])
            cur.extend(pts)
            x, y = cur[-1]
        elif ch == "Z":
            kin = True
            ra.append((cur, kin))
            cur, kin = [], False
            i += 1
        else:
            i += 1
    if cur:
        ra.append((cur, kin))
    return ra


def da_giac_tron(cx, cy, r, canh=None):
    n = canh or max(8, int(r * 2.2) + 6)
    return [(cx + r * math.cos(math.tau * k / n), cy + r * math.sin(math.tau * k / n))
            for k in range(n)]


def net_thanh_hinh(subs, w, cap):
    """Nét dày → danh sách đa giác (tô theo `nonzero` là ra đúng hình nét).

    Mỗi đoạn thành một hình chữ nhật, mỗi mối nối / đầu nét tròn thành một đa
    giác tròn. Bề rộng sàn 1 px: nét 0,5 px trên màn thật vẫn thắp sáng trọn
    một điểm ảnh (trình duyệt khử răng cưa), và một phép đo diện tích làm tròn
    nó về 0 là một phép đo nói dối theo chiều TỐI."""
    r = max(w, 1.0) / 2
    hinh = []
    for pts, kin in subs:
        q = list(pts) + ([pts[0]] if kin and len(pts) > 2 else [])
        if len(q) == 1:
            hinh.append(da_giac_tron(q[0][0], q[0][1], r))
            continue
        for k in range(len(q) - 1):
            (ax, ay), (bx, by) = q[k], q[k + 1]
            L = math.hypot(bx - ax, by - ay)
            if L < 1e-9:
                continue
            nx, ny = -(by - ay) / L * r, (bx - ax) / L * r
            hinh.append([(ax + nx, ay + ny), (bx + nx, by + ny),
                         (bx - nx, by - ny), (ax - nx, ay - ny)])
        if cap == "round" or len(q) > 2:
            for p in q:
                hinh.append(da_giac_tron(p[0], p[1], r))
    return hinh


# ═══════════════════════════════════════════════════════════════════════
# 2 · scanline + trộn
# ═══════════════════════════════════════════════════════════════════════


class Khung:
    """Khung ảnh ba kênh, lấy mẫu mỗi `buoc` px ở TÂM điểm ảnh."""

    def __init__(self, w, h, buoc):
        self.buoc = buoc
        self.nx = max(1, int(w / buoc))
        self.ny = max(1, int(h / buoc))
        n = self.nx * self.ny
        self.R = [0.0] * n
        self.G = [0.0] * n
        self.B = [0.0] * n

    def _nhip(self, hinh, rule):
        """[(hàng, x_bắt, x_hết)] — các đoạn điểm ảnh mà `hinh` tô kín.

        Gom crossing của MỌI đa giác trong `hinh` rồi mới áp quy tắc tô, nên
        một điểm ảnh bị hai đa giác chồng lên nhau vẫn chỉ ra MỘT đoạn — đúng
        nghĩa SVG: `fill-opacity` áp một lần cho cả `<path>`, không cộng dồn
        theo từng subpath."""
        b = self.buoc
        canh = []                       # (y_thấp, y_cao, x_tại_y, hệ_số, chiều)
        ylo, yhi = 1e18, -1e18
        for pts in hinh:
            m = len(pts)
            if m < 3:
                continue
            for k in range(m):
                ax, ay = pts[k]
                bx, by = pts[(k + 1) % m]
                if ay == by:
                    continue
                chieu = 1 if by > ay else -1
                if chieu < 0:
                    ax, ay, bx, by = bx, by, ax, ay
                canh.append((ay, by, ax, (bx - ax) / (by - ay), chieu))
                ylo = min(ylo, ay)
                yhi = max(yhi, by)
        if not canh:
            return
        canh.sort()
        j0 = max(0, int((ylo - b / 2) / b))
        j1 = min(self.ny - 1, int((yhi - b / 2) / b) + 1)
        for j in range(j0, j1 + 1):
            yc = (j + 0.5) * b
            cat = []
            for ay, by, ax, he, chieu in canh:
                if ay > yc:
                    break               # `canh` đã sắp theo y thấp
                if by > yc:
                    cat.append((ax + (yc - ay) * he, chieu))
            if not cat:
                continue
            cat.sort()
            if rule == "evenodd":
                for k in range(0, len(cat) - 1, 2):
                    yield j, cat[k][0], cat[k + 1][0]
            else:
                thu = 0
                mo = 0.0
                for xx, chieu in cat:
                    if thu == 0:
                        mo = xx
                    thu += chieu
                    if thu == 0:
                        yield j, mo, xx

    def to(self, hinh, rgb, alpha, rule="nonzero"):
        if alpha <= 0:
            return
        b, nx = self.buoc, self.nx
        ia = 1.0 - alpha
        ra, ga, ba = rgb[0] * alpha, rgb[1] * alpha, rgb[2] * alpha
        R, G, B = self.R, self.G, self.B
        for j, xa, xb in self._nhip(hinh, rule):
            i0 = max(0, int(xa / b + 0.5))
            i1 = min(nx - 1, int(xb / b - 0.5))
            if i1 < i0:
                # Đoạn hẹp hơn một ô lấy mẫu: vẫn thắp ô gần tâm đoạn nhất,
                # không thì mọi nét mảnh rơi khỏi phép đo.
                i0 = i1 = max(0, min(nx - 1, int((xa + xb) / 2 / b)))
            k = j * nx + i0
            for _ in range(i1 - i0 + 1):
                R[k] = R[k] * ia + ra
                G[k] = G[k] * ia + ga
                B[k] = B[k] * ia + ba
                k += 1


def hex_rgb(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


_THE = re.compile(r"<(path|g|circle|/g)\b([^>]*)>")


def _attr(s, ten):
    m = re.search(r'%s="([^"]*)"' % ten, s)
    return m.group(1) if m else None


def ve(tep: Path, kh: Khung):
    s = tep.read_text(encoding="utf-8")
    # Ngăn xếp `<g>`: `fill` / `fill-opacity` của nhóm là thứ các `<circle>`
    # bên trong thừa hưởng (`build_sky.py` không ghi màu lên từng circle).
    ngan = [{}]
    for m in _THE.finditer(s):
        tag, attr = m.group(1), m.group(2)
        if tag == "/g":
            if len(ngan) > 1:
                ngan.pop()
            continue
        if tag == "g":
            moi = dict(ngan[-1])
            for k in ("fill", "fill-opacity"):
                if _attr(attr, k) is not None:
                    moi[k] = _attr(attr, k)
            ngan.append(moi)
            continue
        if tag == "circle":
            col = ngan[-1].get("fill")
            if not col or not col.startswith("#"):
                continue
            a = float(ngan[-1].get("fill-opacity", 1.0))
            cx, cy = float(_attr(attr, "cx")), float(_attr(attr, "cy"))
            r = float(_attr(attr, "r"))
            kh.to([da_giac_tron(cx, cy, r)], hex_rgb(col), a)
            continue
        # <path>
        d = _attr(attr, "d")
        if not d:
            continue
        subs = giai_d(d)
        fill = _attr(attr, "fill") or ngan[-1].get("fill")
        if fill and fill.startswith("#"):
            a = float(_attr(attr, "fill-opacity") or ngan[-1].get("fill-opacity", 1.0))
            rule = _attr(attr, "fill-rule") or "nonzero"
            kh.to([p for p, _k in subs], hex_rgb(fill), a, rule)
        stroke = _attr(attr, "stroke")
        if stroke and stroke.startswith("#"):
            w = float(_attr(attr, "stroke-width") or 1.0)
            a = float(_attr(attr, "stroke-opacity") or 1.0)
            cap = _attr(attr, "stroke-linecap") or "butt"
            kh.to(net_thanh_hinh(subs, w, cap), hex_rgb(stroke), a)


# ═══════════════════════════════════════════════════════════════════════
# 3 · đo
# ═══════════════════════════════════════════════════════════════════════


def thu_tu_tep():
    """Thứ tự TỆP, và nó LÀ thứ tự z (thứ tự trong DOM). Lấy từ `SKY_TILES`
    qua `build_sky.TILES` chứ không ghi cứng: thêm một tấm mà quên ở đây là
    một lớp không được đo."""
    ra = []
    for t in bs.TILES:
        if t["file"] == "chom":
            ra += ["sky-chom-%s.svg" % c["key"] for c in bs.CONS]
        else:
            ra.append("sky-%s.svg" % t["file"])
    return ra


def ghi_png(kh: Khung, tep: Path):
    """GHI KHUNG RA PNG — thuần stdlib (`zlib` + `struct`), không thư viện ngoài.

    ── VÌ SAO MƯỜI LĂM DÒNG NÀY ĐÁNG GIÁ HƠN CẢ BẢNG SỐ ───────────────────

    Năm vòng đánh giá liên tiếp không ai NHÌN bức tranh: mọi agent đều dừng ở
    câu "tôi chưa chạy được trình duyệt", rồi vặn số theo bảng tám bậc. Lần
    đầu bức được xuất ra PNG và mở lên, có BỐN khuyết tật mà **không một con
    số nào trong bảng bắt được** — mười mảng tối hình bao lồi khoét thủng tinh
    vân, chín tia bụi là chín vạch kẻ thẳng, tám tấm nền nhãn là tám vệt bôi
    đen, lõi mặt trời là một đa giác méo. Bảng số vẫn đạt mọi sàn trong khi
    hai khuyết tật đầu đủ để bị loại ngay từ cái nhìn đầu tiên.

    `Khung` đã giữ sẵn ba kênh R/G/B ở đúng độ phân giải của bức, nên cái
    THIẾU chưa bao giờ là phép raster — chỉ là một hàm ghi tệp. Nay nó là một
    cờ: `--png <tệp>`. **Đổi bất cứ thứ gì trong hồ sơ thì xuất PNG và NHÌN,
    đừng chỉ đọc bảng.**

    `--buoc 1` cho đúng 1360 × 820; bước lớn hơn cho ảnh nhỏ hơn theo tỉ lệ.
    """
    import struct
    import zlib
    raw = bytearray()
    for j in range(kh.ny):
        raw.append(0)                     # bộ lọc 0 (None) cho mỗi hàng
        k = j * kh.nx
        for i in range(kh.nx):
            raw.append(int(min(max(kh.R[k + i], 0.0), 255.0) + 0.5))
            raw.append(int(min(max(kh.G[k + i], 0.0), 255.0) + 0.5))
            raw.append(int(min(max(kh.B[k + i], 0.0), 255.0) + 0.5))

    def khoi(ten: bytes, than: bytes) -> bytes:
        return (struct.pack(">I", len(than)) + ten + than
                + struct.pack(">I", zlib.crc32(ten + than) & 0xFFFFFFFF))

    png = (b"\x89PNG\r\n\x1a\n"
           + khoi(b"IHDR", struct.pack(">IIBBBBB", kh.nx, kh.ny, 8, 2, 0, 0, 0))
           + khoi(b"IDAT", zlib.compress(bytes(raw), 6))
           + khoi(b"IEND", b""))
    tep.write_bytes(png)
    return kh.nx, kh.ny


def do_raster(out_dir: Path, buoc: int = 2, png: Path = None, lop: str = None):
    tep = thu_tu_tep()
    vb = (out_dir / tep[0]).read_text(encoding="utf-8")
    m = re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"', vb)
    W, H = float(m.group(3)), float(m.group(4))
    kh = Khung(W, H, buoc)
    # `--lop` giữ lại một TẬP CON tệp: ba lớp trời riêng là cách duy nhất nói
    # được "cái lỗ kia nằm ở lớp nào" — đã dùng đúng một lần để chứng minh
    # mười mảng tối thuộc `sky-troi.svg` chứ không thuộc tấm chòm.
    if lop:
        giu = [t for t in tep if any(k in t for k in lop.split(","))]
        if not giu:
            raise SystemExit("--lop %r không khớp tệp nào trong %s"
                             % (lop, ", ".join(tep)))
        tep = giu
    for t in tep:
        ve(out_dir / t, kh)
    if png:
        w, h = ghi_png(kh, png)
        print("  đã ghi %s (%d × %d px, %d tệp SVG)" % (png, w, h, len(tep)))
    # sRGB → tuyến tính → Y. Cùng công thức với `luminance()` ở build_sky.py.
    Ls = []
    for i in range(len(kh.R)):
        lin = []
        for v in (kh.R[i], kh.G[i], kh.B[i]):
            c = min(max(v, 0.0), 255.0) / 255.0
            lin.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
        Ls.append(0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2])
    Ls.sort()
    o = len(Ls)
    dem = [0] * (len(MOC) + 1)
    for L in Ls:
        k = 0
        while k < len(MOC) and L > MOC[k]:
            k += 1
        dem[k] += 1
    lo, hi = bs.BUDGET["midLo"], bs.BUDGET["midHi"]
    return {
        "buoc": buoc,
        "o": o,
        "bac": [c / o for c in dem],
        "mid": sum(1 for L in Ls if lo < L <= hi) / o,
        "mid3": sum(1 for L in Ls if lo < L <= bs.BUDGET["mid3Hi"]) / o,
        "trung_vi": Ls[o // 2],
        "p99": Ls[int(o * 0.99)],
        "sang": sum(1 for L in Ls if L > 0.5) / o,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", default=None, help="thư mục SVG (mặc định public/map/star)")
    ap.add_argument("--buoc", type=int, default=2,
                    help="bước lấy mẫu px (1 = từng điểm ảnh; mặc định 2)")
    ap.add_argument("--json", default=None, help="ghi số đo ra tệp JSON")
    ap.add_argument("--khong-mo-hinh", action="store_true",
                    help="bỏ cột mô hình (nhanh hơn — không chạy do_ngan_sach)")
    ap.add_argument("--png", default=None,
                    help="XUẤT BỨC TRANH ra PNG — dùng nó, đừng chỉ đọc bảng")
    ap.add_argument("--lop", default=None,
                    help="chỉ vẽ tệp có tên chứa một trong các chuỗi này "
                         "(ngăn bằng dấu phẩy), ví dụ --lop troi,sao-nen")
    args = ap.parse_args()

    out = Path(args.out) if args.out else MAC_DINH
    r = do_raster(out, max(1, args.buoc),
                  Path(args.png) if args.png else None, args.lop)

    mo = None
    if not args.khong_mo_hinh:
        bs.dat_sao()
        mo = bs.do_ngan_sach(bs.grab("SKY_PROFILE_DARK"))

    def cot(v):
        return "     —  " if v is None else "%7.2f%%" % (v * 100)

    print()
    print("  đo ở %s · bước %d px · %d ô mẫu" % (out, r["buoc"], r["o"]))
    print()
    print("  bậc độ chói              RASTER    mô hình   tham chiếu")
    for i, t in enumerate(TEN):
        print("  %-22s %s  %s    %6.1f%%"
              % (t, cot(r["bac"][i]), cot(mo["bac"][i] if mo else None), TC[i]))
    print("  %-22s %s  %s    %6.1f%%   ← con số của lời chê thứ năm"
          % ("BẬC GIỮA 0,03–0,85", cot(r["mid"]), cot(mo["mid"] if mo else None), TC_MID))
    print("  %-22s %s  %s    %6.1f%%   (sàn mô hình %.0f%%)"
          % ("ba bậc 0,03–0,35", cot(r["mid3"]), cot(mo["mid3"] if mo else None),
             TC_MID3, bs.BUDGET["midShareMin"] * 100))
    print()
    print("  trung vị    %s %s   (tham chiếu 0,0284)"
          % ("%.4f" % r["trung_vi"], "‖ %.4f" % mo["trung_vi"] if mo else ""))
    print("  phân vị 99  %s %s   (tham chiếu 0,955)"
          % ("%.4f" % r["p99"], "‖ %.4f" % mo["p99"] if mo else ""))
    print("  L > 0,5     %s %s   (tham chiếu 7,73%%)"
          % ("%.3f%%" % (r["sang"] * 100), "‖ %.3f%%" % (mo["sang"] * 100) if mo else ""))
    if mo:
        lech = (mo["mid"] - r["mid"]) * 100
        print()
        print("  KHOẢNG LỆCH mô hình − raster ở bậc giữa: %+.2f điểm phần trăm" % lech)
        print("  Mô hình là MỤC TIÊU, raster là SỰ THẬT. Lệch lớn nghĩa là thứ ghi ra")
        print("  tệp khác thứ hồ sơ đòi — thường là đường đồng mức còn hở, hình lồng")
        print("  nhau bị `evenodd` XOR, hay một lớp nằm sai chỗ trong thứ tự z.")
    if args.json:
        Path(args.json).write_text(json.dumps(r, indent=1), encoding="utf-8")
        print("\n  đã ghi %s" % args.json)


if __name__ == "__main__":
    main()
