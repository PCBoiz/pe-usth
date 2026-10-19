#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SINH BẢN ĐỒ THẾ GIỚI của trang chủ — MỘT CÁI VỰC LIỀN MẠCH, tám gian khoét vào
vách của chính nó.

    py scripts/map/build_map.py            # sinh lại 9 tệp SVG
    py scripts/map/build_map.py --stats    # thêm bảng đếm nét từng lớp
    py scripts/map/build_map.py --css      # in lại khối .spot1…8 cho CSS

Ra:
    frontend/public/map/world-map.svg      bản rộng 1360 × 820
    frontend/public/map/scene-M1..M8.svg   ô crop cho bản hẹp (điện thoại)

── KHUYẾT ĐIỂM ĐƯỢC CHỮA Ở BẢN NÀY ───────────────────────────────────────
Bản trước bị chủ sản phẩm bác bằng đúng một câu: "chưa có sự liên kết giữa các
màn". Chẩn đoán kỹ thuật: tám gian là tám HÌNH KHÉP KÍN RỜI NHAU (`vault()` vẽ
một vết đục khép kín cho mỗi gian) thả vào bốn dải đá chạy ngang hết khung, nối
với nhau bằng vài đường mảnh. Mắt đọc ra tám cái hốc, không đọc ra một thế giới.

Bản này đổi HÌNH THÁI, giữ nguyên bộ kỹ thuật nét:

  1. CÓ ĐÚNG MỘT CÁI HỐ. `Vuc` dưới đây định nghĩa hai mặt cắt liên tục theo độ
     sâu — `shaft_half(y)` (lòng vực) và `rock_half(y)` (khối đá) — nở ra ở
     miệng, thắt lại ở y≈438, phình ra thành gallery ở y≈626, thắt lần hai rồi
     loe ra thành lòng hồ. Vách vực vẽ bằng ĐÚNG MỘT `<path>` mỗi bên: một lệnh
     `M` rồi vài trăm lệnh `l`. Đó là thứ ca test đo được, và là thứ không thể
     có nếu ai đó quay lại vẽ tám hình rời.
  2. GIAN LÀ BƯỚU CỦA CHÍNH ĐƯỜNG VÁCH ẤY. Mỗi hốc (M1 M3 M5 M7) cộng vào
     `shaft_half` một bướu `sin(πt)` — bằng 0 ở hai đầu, nên đường vách vẫn
     liền, chỉ là nó đi vòng ra ngoài chỗ có gian. Hốc KHÔNG có đường viền khép
     kín: phía mở ra lòng vực không có nét nào, vì ở đó không có đá.
     M2 và M6 khoét vào VÁCH SAU — mặt trong của cùng cái hố, vẽ liền từ miệng
     xuống đáy. M4 là công trình chắn ngang chỗ THẮT, M8 là lòng hồ ở đáy.
  3. NƯỚC VÀ ÁNH SÁNG LÀ SỢI DỌC. Một dòng nước duy nhất rơi từ miệng, qua bể
     của M4, tràn xuống gallery rồi đổ vào hồ M8 — một nhóm, không đứt đoạn.
     Một nêm sáng duy nhất từ mặt trời rọi qua miệng, hẹp dần theo độ sâu.
  4. THANG ĐỘ SÂU CHẠY DỌC CẢ HAI LỀ, cộng vạch ngang nét đứt cắt qua cả bức
     tại mỗi mốc tầng và một đường dẫn nét đứt tới từng gian. Đây là bộ máy chú
     giải của bản mặt cắt tham chiếu, và nó cũng chính là thứ nói "càng xuống
     càng sâu" mà không cần một con số nào.

── THÊM VỰC THỨ HAI THÌ KHÔNG PHẢI VIẾT LẠI ──────────────────────────────
Hôm nay đây là bản đồ của MỘT khoá. Sau này mỗi khoá (Frontend, Backend, AI
Engineer…) là một vùng đất trên một bản đồ thế giới lớn hơn, và cái vực này chỉ
là một trong số đó. Cấu trúc đã dọn sẵn cho chuyện đó:

  · `Vuc` là một LỚP, không phải một mớ hàm toàn cục. Mọi hình thái (tâm, mặt
    cắt, mốc tầng, danh sách hốc) là THUỘC TÍNH của một thể hiện; không hàm vẽ
    nào đọc biến toàn cục về hình dáng — tất cả nhận `v: Vuc` làm tham số đầu.
  · `VUC` ở cuối mục 3 là thể hiện DUY NHẤT hiện có, dựng từ `world-map.ts`.
    Thêm vực thứ hai = thêm một `Vuc(...)` nữa (tâm khác, mặt cắt khác, tiền tố
    màu khác) rồi gọi `draw_vuc(ink, v2)`; `build_full()` chỉ việc lặp qua danh
    sách vực thay vì gọi một lần.
  · Khi đó `world-map.ts` tách thành một tệp mỗi khoá (`world-map.<khoá>.ts`)
    và `read_ts()` nhận tên tệp làm tham số — hàm đã viết sẵn theo kiểu đó, nó
    không mở `TS` bằng hằng mà nhận đường dẫn.
  · Bảng màu: mỗi vực mang `prefix` riêng (`m1…m8` hôm nay) nên hai vực không
    tranh nhau khoá màu. Cái phải bàn lại lúc đó là KHUNG: 1360 × 820 là khung
    của một vực; bản đồ nhiều vực cần khung riêng và mỗi vực là một `<symbol>`
    hoặc một tệp SVG rời được đặt vào.

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
DENSITY = 1.7


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


def read_ts(path: Path = TS):
    """Đọc dữ liệu hình thái của MỘT vực từ tệp TS của nó.

    Nhận đường dẫn chứ không mở hằng `TS`: ngày có vực thứ hai, mỗi khoá là một
    `world-map.<khoá>.ts` và chỗ này không phải sửa."""
    src = path.read_text(encoding="utf-8")

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
        "abyss": grab("MAP_ABYSS", "{", "}"),
    }


DATA = read_ts()
P = DATA["palette"]
LAYOUT = DATA["layout"]
FLOWS = DATA["flows"]
WELLS = DATA["wells"]
SUN = DATA["sun"]
AB = DATA["abyss"]
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

    def layer(self, name: str, flow: str | None = None, attrs: dict | None = None):
        """Mở một lớp mới. Nét chỉ gộp TRONG một lớp — gộp xuyên lớp thì thứ tự
        chồng vỡ (vân đá vẽ sau lại chui xuống dưới gian vẽ trước).

        `flow` gắn `data-flow="M5-M6"` lên nhóm: đó là chỗ ca test đếm lại ba
        mạch phụ thuộc trong CHÍNH bức tranh, không chỉ trong dữ liệu.

        `attrs` gắn thêm thuộc tính lên nhóm. Hiện CHỈ dùng cho `transform` của
        tám nhóm `gian-M*`, và nó phải vậy:

        ĐỪNG THÊM `id`/`data-*` VÀO SVG ĐỂ LỚP CHUYỂN ĐỘNG BÁM VÀO. Tranh vào
        trang bằng `background-image` (`world-map.module.css`), tức trình duyệt
        coi nó là một TÀI LIỆU RIÊNG, không script, bị cách ly: CSS của trang
        không khớp được selector nào bên trong, JS không `querySelector` vào
        được. Mọi `id` đặt cho tầng vách / dòng nước / trục tia sáng là byte
        chết trong một tệp tải ở mỗi lượt vào trang chủ — mà tệp ấy đang phải
        nằm dưới trần 900 KB. (`src/lib/figure-motion.ts` đã trả giá cho đúng
        điều này với 23 hình nhúng bằng `<img>`.)

        Hợp đồng THẬT với lớp chuyển động là TOẠ ĐỘ MỐC trong `world-map.ts`
        (`MAP_FRAME`, `MAP_ABYSS`, `REGION_LAYOUT`, `MAP_WELLS`, `MAP_SUN`,
        `MAP_PALETTE`) — cùng những hằng mà script này đọc qua `read_ts()`, nên
        hai bên không lệch nhau được. Xem `design/v3/ky-thuat-ban-do.md` mục
        6.3. Nhóm vẫn mang `data-lop="…"` sẵn có, đủ cho việc đọc/kiểm SVG."""
        self.cur = {}
        a = dict(attrs or {})
        if flow:
            a["data-flow"] = flow
        self.layers.append((name, self.cur, a))

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

    # Bù bề rộng nét cho nhóm BỊ THU NHỎ. `draw_gian()` đặt tiểu cảnh vào hốc
    # bằng `transform="… scale(0.48)"`, mà `stroke-width` CŨNG bị nhân 0,48 —
    # nét 0,45 thành 0,21 và cả tiểu cảnh nhạt đi như bị rửa. Nên trong một
    # nhóm có tỉ lệ s, nét được ghi ở 0,45/s để lúc render ra đúng 0,45.
    #
    # Đây là họ hàng của cái bẫy đã ghi trong AGENTS.md (`nf()` làm `stroke-
    # width` thành 0 ⇒ năm chục nghìn nét vô hình): bề rộng nét KHÔNG bao giờ
    # được đi qua một phép biến đổi mà không ai bù lại.
    wscale = 1.0

    def stroke(self, d, color, w=0.6, op=1.0, cap="round", dash=None):
        w = max(self.STEP_W, round(w * self.wscale / self.STEP_W) * self.STEP_W)
        op = max(self.STEP_OP, min(1.0, round(op / self.STEP_OP) * self.STEP_OP))
        self._add(("s", color, round(w, 2), round(op, 2), cap, dash, self.clip), d)

    def fill(self, d, color, op=1.0):
        op = max(self.STEP_OP, min(1.0, round(op / self.STEP_OP) * self.STEP_OP))
        self._add(("f", color, round(op, 2), self.clip, None), d)

    def fill_rule(self, d, color, op=1.0, rule="evenodd"):
        """Tô một hình CÓ LỖ: `d` mang nhiều vòng khép kín và `fill-rule` quyết
        vòng nào là lỗ. Đây là cách khối đá và lòng vực thành MỘT hình thay vì
        hai hình chồng nhau — vòng trong không có nét viền riêng, nên không có
        chỗ nào để mắt đọc ra "một cái hốc dán lên đá"."""
        op = max(self.STEP_OP, min(1.0, round(op / self.STEP_OP) * self.STEP_OP))
        self._add(("f", color, round(op, 2), self.clip, rule), d)

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

    def clip_path(self, d, name, rule=None):
        """Cắt theo một hình bất kỳ — dùng để nhốt trường nét vào ĐÚNG khối đá
        hoặc ĐÚNG lòng vực. Nhờ nó, một `hatch_rect` chữ nhật vẫn ra đúng hình
        của cái hố: trường nét là TOÀN CỤC, chỉ phần nhìn thấy mới theo hình."""
        if any('id="%s"' % name in d0 for d0 in self.defs):
            return
        self.defs.append(
            '<clipPath id="%s"><path%s d="%s"/></clipPath>'
            % (name, ' clip-rule="%s"' % rule if rule else "", d)
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
        for name, buckets, attrs in self.layers:
            if not buckets:
                continue
            extra = "".join(' %s="%s"' % (k, attrs[k]) for k in sorted(attrs))
            out.append('<g data-lop="%s"%s>' % (name, extra))
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
                    _, color, op, clip, rule = key
                    a = ['fill="%s"' % color]
                    if rule:
                        a.append('fill-rule="%s"' % rule)
                    if op < 1:
                        a.append('fill-opacity="%s"' % ("%g" % op))
                    if clip:
                        a.append('clip-path="url(#%s)"' % clip)
                out.append("<path %s d=\"%s\"/>" % (" ".join(a), d))
            out.append("</g>")
        out.append("</svg>")
        return "\n".join(out)


# ═══════════════════════════════════════════════════════════════════════
# 3 · HÌNH THÁI: một cái vực liền từ miệng xuống đáy
# ═══════════════════════════════════════════════════════════════════════
#
# Bản trước có bốn DẢI đá chạy ngang hết khung và tám hốc rời thả vào đó. Ở đây
# chỉ còn MỘT khối đá — một hình bóng liền trôi trên giấy — và trong lòng nó là
# MỘT cái hố. Bốn "dải" vẫn còn, nhưng đổi nghĩa: chúng là bốn TẦNG ĐỘ SÂU của
# cùng cái hố ấy (dùng cho sắc độ, cho thang độ sâu, và cho bố cục cuộn dọc ở
# bản hẹp), không còn là bốn lớp bánh.


def smooth_profile(pts):
    """Mặt cắt theo độ sâu: nội suy cosin qua các mốc `(y, nửa bề rộng)`.

    Cosin chứ không tuyến tính vì ĐẠO HÀM BẰNG 0 tại mỗi mốc — nên chỗ nở rộng
    nhất và chỗ thắt chặt nhất đều có một đoạn "đứng yên" trước khi đổi chiều,
    đúng dáng một cái hố bị nước khoét: phình ra, giữ một đoạn, rồi thót lại.
    Nội suy tuyến tính cho ra hình quả trám nhọn — nhìn ra ngay là máy vẽ.

    Trả về một HÀM liên tục của y. Tính liền mạch của cả bức tranh dựa vào đúng
    chỗ này: vách vực là ảnh của một hàm liên tục, nên nó không thể đứt."""
    pts = sorted(pts)

    def f(y):
        if y <= pts[0][0]:
            return pts[0][1]
        if y >= pts[-1][0]:
            return pts[-1][1]
        for i in range(len(pts) - 1):
            y0, v0 = pts[i]
            y1, v1 = pts[i + 1]
            if y0 <= y <= y1:
                t = (y - y0) / (y1 - y0)
                return lerp(v0, v1, (1 - math.cos(math.pi * t)) / 2)
        return pts[-1][1]

    return f


class Vuc:
    """MỘT cái vực. Mọi hình dáng của bức tranh nằm trong một thể hiện của lớp
    này, và mọi hàm vẽ nhận nó làm tham số đầu — xem chú thích đầu tệp về chuyện
    thêm vực thứ hai.

    Hai mặt cắt, cả hai là hàm liên tục của độ sâu:
      `shaft_half(y)`  nửa bề rộng LÒNG vực (chỗ rỗng)
      `rock_half(y)`   nửa bề rộng KHỐI ĐÁ (hình bóng trên giấy)

    và một danh sách HỐC: mỗi hốc cộng thêm vào `shaft_half` một bướu `sin(πt)`
    ở bên của nó. Bướu bằng 0 ở hai đầu nên đường vách KHÔNG ĐỨT — nó chỉ đi
    vòng ra ngoài chỗ có gian. Đó là toàn bộ mẹo "tám gian thuộc cùng một hố".
    """

    def __init__(self, key, cx, mouth_y, shaft, rock, alcoves, tiers, prefix="m"):
        self.key = key
        self.cx = cx
        self.mouth_y = mouth_y          # miệng vực = chỗ mặt đất bị cắt đứt
        self.bottom_y = max(y for y, _ in shaft)
        self._shaft = smooth_profile(shaft)
        self._rock = smooth_profile(rock)
        self.alcoves = alcoves          # [(key, "trai"|"phai", y0, y1, sâu)]
        self.tiers = tiers              # [(tên dải, y đáy dải)]
        self.prefix = prefix

    # ── mặt cắt ───────────────────────────────────────────────────────
    def bump(self, key_side, y):
        """Bướu của một hốc tại độ sâu y.

        `sin(πt)^0.35`, không phải `sin(πt)`. Số mũ nhỏ hơn 1 nhiều làm hai vai
        bướu DỰNG lên gần như thẳng rồi đỉnh phẳng: hốc ra hình một cái GIAN
        KHOÉT VÀO ĐÁ. Để số mũ gần 1 thì bướu loe ra rất thoải, và nó không đọc
        ra là một cái hốc nữa — nó nhập luôn vào lòng vực, làm cả tầng trên
        thành một cái sân rộng. Đã thử 0,72 và hỏng đúng kiểu đó.

        Vẫn bằng 0 ở hai đầu, nên đường vách KHÔNG ĐỨT ở đâu cả."""
        s = 0.0
        for k, side, y0, y1, d in self.alcoves:
            if side != key_side or not (y0 < y < y1):
                continue
            t = (y - y0) / (y1 - y0)
            s = max(s, d * math.sin(math.pi * t) ** 0.35)
        return s

    def wall_thick(self, y):
        """Bề dày đá tối thiểu giữa lòng vực và hình bóng ngoài. Có nhiễu nên
        vách chỗ dày chỗ mỏng; không có nó thì hai đường chạy song song đều tăm
        tắp và cả khối đá đọc ra là một cái ống nhựa."""
        return 56 + 30 * NZ.fbm(y * 0.011, 3.7, 3)

    def out_left(self, y):
        return self.cx - self._rock(y) - NZ.fbm(y * 0.017, 11.3, 4) * 16

    def out_right(self, y):
        return self.cx + self._rock(y) + NZ.fbm(y * 0.017, 29.1, 4) * 16

    def left(self, y):
        """Vách TRÁI của lòng vực. `max(...)` giữ cho lòng vực không ăn thủng
        hình bóng ngoài: dù hốc có sâu tới đâu, luôn còn `wall_thick` đá sau
        lưng nó. Cả hai vế đều liên tục nên `max` của chúng cũng liên tục."""
        raw = self.cx - self._shaft(y) - self.bump("trai", y)
        raw -= NZ.fbm(y * 0.03, 5.5, 4) * 11
        return max(self.out_left(y) + self.wall_thick(y), raw)

    def right(self, y):
        raw = self.cx + self._shaft(y) + self.bump("phai", y)
        raw += NZ.fbm(y * 0.03, 41.7, 4) * 11
        return min(self.out_right(y) - self.wall_thick(y), raw)

    def inside(self, x, y):
        return self.mouth_y <= y <= self.bottom_y and self.left(y) <= x <= self.right(y)

    # ── lấy mẫu dọc ───────────────────────────────────────────────────
    def ys(self, step=2.0, pad_top=0.0):
        y = self.mouth_y - pad_top
        out = []
        while y <= self.bottom_y:
            out.append(y)
            y += step
        if out[-1] < self.bottom_y:
            out.append(self.bottom_y)
        return out

    def wall(self, side, step=2.0):
        """Vách vực thành MỘT danh sách điểm — nguồn của một `<path>` duy nhất.
        Không hàm nào khác được vẽ lại đoạn vách của riêng một gian: làm thế là
        tám mảnh vách rời, tức đúng khuyết điểm đang chữa."""
        f = self.left if side == "trai" else self.right
        return [(f(y), y) for y in self.ys(step)]

    def tier_at(self, y):
        for name, ybot in self.tiers:
            if y < ybot:
                return name
        return self.tiers[-1][0]

    def tier_span(self, name):
        top = self.mouth_y
        for n, ybot in self.tiers:
            if n == name:
                return top, ybot
            top = ybot
        return self.mouth_y, self.bottom_y


# Mặt đất: một dải mỏng ở trên cùng, và nó BỊ CẮT ĐỨT ở miệng vực — đó là cách
# duy nhất để người xem hiểu cái hố này mở ra từ chính mặt đất họ đang đứng.
def horizon(x):
    """Mặt đất KHÔNG PHẢI MỘT ĐƯỜNG KẺ. Bản trước để biên độ 8 đơn vị nên nó
    thành cái thước, và cả bức lập tức ra "sơ đồ mặt cắt" chứ không ra bản đồ."""
    return 128 - NZ.fbm(x * 0.0045, 3.1, 3) ** 1.3 * 26


# Thể hiện DUY NHẤT hiện có, dựng từ `MAP_ABYSS` trong `world-map.ts`.
#
# KHÔNG một con số hình thái nào viết ở tệp này. Lý do giống hệt lý do bảng màu
# nằm ở TS: lớp chuyển động (`map-motion.ts`) cũng cần những mốc ấy để đặt phần
# tử chồng lên tranh, và nó đã trả giá một lần cho chuyện giữ bản sao — bốn mốc
# địa tầng chép sang tệp của nó chết trong hai giờ khi bức tranh được vẽ lại.
# Toạ độ nào mà hai bên cùng cần thì nó ở `world-map.ts`, không ở đâu khác.
#
# Ghi lại một quyết định hình thái, vì nó dễ bị sửa ngược: miệng vực CHỈ rộng
# 636 đơn vị trên khung 1360, không phải gần hết khung. Bản đầu để miệng rộng
# 860 và cả tầng trên đọc ra một cái sân có ba hõm, không ra một cái hố — mắt
# cần thấy ĐẤT ở hai bên thì mới thấy được cái lỗ. Hai hốc M1/M3 bù lại bằng
# cách phình ra khỏi vách ngay dưới vành miệng.
VUC = Vuc(
    key="python-advanced",
    cx=float(AB["cx"]),
    mouth_y=float(AB["mouthY"]),
    shaft=[(float(a), float(b)) for a, b in AB["shaft"]],
    rock=[(float(a), float(b)) for a, b in AB["rock"]],
    alcoves=[(k, side, float(y0), float(y1), float(d))
             for k, side, y0, y1, d in AB["alcoves"]],
    tiers=[(t["band"], float(t["bottomY"])) for t in AB["tiers"]],
)

# Gian nào khoét vào vách nào. "sau" = vách SAU của lòng vực — cùng một mặt đá
# chạy liền từ miệng xuống hồ, nên M2 và M6 đứng trên đúng mặt mà M1/M3/M5/M7
# khoét vào từ hai bên. Không gian nào đứng ngoài cái hố.
SIDE_OF = {"M1": "trai", "M2": "sau", "M3": "phai", "M4": "sau",
           "M5": "trai", "M6": "sau", "M7": "phai", "M8": "sau"}

# Ô DỰNG HÌNH của từng tiểu cảnh — KHÁC với `BOX` (ô crop + hộp liên kết).
#
# Tách hai thứ này ra là cách giữ nguyên được tám tiểu cảnh đã vẽ khi hình thái
# đổi: tiểu cảnh vẫn dựng trong đúng khung cũ của nó, còn `draw_gian()` đặt
# khung ấy vào hốc thật bằng MỘT phép `transform` trên nhóm. Không có nó thì
# đổi hình thái đồng nghĩa với vẽ lại cả tám tiểu cảnh — và lần sau cũng vậy.
#
# Phép biến hình luôn ĐỒNG DẠNG (một hệ số cho cả hai trục): kéo lệch hai trục
# làm nét tròn thành nét bầu dục và mạch gạch thành hình thoi, tức phá đúng cái
# mật độ nét mà cả script này tồn tại để tạo ra.
ART_BOX = {
    "M1": (0, 0, 420, 250), "M2": (0, 0, 380, 210), "M3": (0, 0, 380, 210),
    "M4": (0, 0, 420, 130), "M5": (0, 0, 320, 140), "M6": (0, 0, 330, 140),
    "M7": (0, 0, 330, 140), "M8": (0, 0, 500, 134),
}

# CỠ THẬT của từng gian trong hốc `(rộng, cao)`, đơn vị khung 1360 × 820.
# Khoảng 14–17% bề rộng khung: đủ đọc được nội dung, đủ nhỏ để cái hố vẫn là
# nhân vật chính. M4 rộng hơn vì nó CHẮN NGANG chỗ thắt, M8 lấy trọn bề rộng
# lòng vực vì nó là cái đáy.
VAULT_KIND = {"M1": "cuon", "M2": "lanh", "M3": "lanh", "M4": "cuon",
              "M5": "khe", "M6": "lanh", "M7": "khe", "M8": "khe"}

GIAN_SIZE = {
    "M1": (204, 132), "M2": (222, 140), "M3": (204, 132), "M4": (296, 104),
    "M5": (192, 118), "M6": (212, 120), "M7": (192, 118), "M8": (0, 112),
}


# Bốn mốc tầng vẫn là HÀM của x (hơi lượn) chứ không phải hằng: một đường kẻ
# ngang tuyệt đối ngang là thứ tố cáo máy vẽ ngay từ xa, và thang độ sâu ở lề
# bám vào chính các hàm này.
def _tier_y(i, seed, amp):
    """Mép dưới của tầng thứ `i`, LẤY TỪ `MAP_ABYSS.tiers` — không viết lại con
    số nào. Cộng nhiễu vì một đường kẻ ngang tuyệt đối ngang là thứ tố cáo máy
    vẽ ngay từ xa, nhưng cái MỐC thì vẫn là mốc trong dữ liệu."""
    base = float(AB["tiers"][i]["bottomY"])
    return lambda x: base - NZ.fbm(x * 0.0024, seed, 3) * amp


y_shallow = _tier_y(0, 9.4, 16)
y_deep = _tier_y(1, 17.7, 16)
y_floor = _tier_y(2, 23.3, 14)


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


def rock_poly(v: Vuc, y0=None, y1=None, step=6.0):
    """Hình bóng khối đá giữa hai độ sâu — đi xuống theo mép ngoài trái rồi
    ngược lên theo mép ngoài phải. Dùng cho mảng nền của từng tầng."""
    y0 = v.mouth_y if y0 is None else y0
    y1 = v.bottom_y if y1 is None else y1
    ys = []
    y = y0
    while y < y1:
        ys.append(y)
        y += step
    ys.append(y1)
    return [(v.out_left(y), y) for y in ys] + [(v.out_right(y), y) for y in reversed(ys)]


def shaft_poly(v: Vuc, y0=None, y1=None, step=4.0):
    """Lòng vực giữa hai độ sâu — chỗ RỖNG. Vẽ nền của nó bằng sắc tầng sáng
    hơn đá quanh nó, nên cái hố đọc ra là một khoảng trống chứ không phải một
    vết sơn."""
    y0 = v.mouth_y if y0 is None else y0
    y1 = v.bottom_y if y1 is None else y1
    ys = []
    y = y0
    while y < y1:
        ys.append(y)
        y += step
    ys.append(y1)
    return [(v.left(y), y) for y in ys] + [(v.right(y), y) for y in reversed(ys)]


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


def draw_surface(ink, v: Vuc, x0, x1):
    """Mặt đất — và chỗ nó BỊ CẮT ĐỨT.

    Đây là nét đầu tiên nói "có một cái hố": đường đất chạy từ mép khung vào
    tới miệng vực rồi DỪNG, lượn xuống thành mép vực. Bản trước có một đường
    đất liền hết bề rộng và tám gian nằm dưới nó như tám cái hầm — không có gì
    nói rằng chúng thuộc cùng một chỗ."""
    ml, mr = v.left(v.mouth_y), v.right(v.mouth_y)

    def strip(a, b, side):
        if b - a < 8:
            return
        xs = [a + i * (b - a) / 60 for i in range(61)]
        line = [(x, horizon(x)) for x in xs]
        # Mép vực: đường đất không cụt ngang mà cong xuống, nối thẳng vào vách.
        lip = []
        for i in range(17):
            t = i / 16
            lx = lerp(b if side < 0 else a, ml if side < 0 else mr, t)
            ly = lerp(horizon(b if side < 0 else a), v.mouth_y + 26, t ** 1.7)
            lip.append((lx, ly))
        full = line + lip if side < 0 else list(reversed(lip)) + line
        ink.poly(full, P["ink"]["deep"], 2.1, 0.92)
        ink.poly([(px, py + 2.6) for px, py in full], P["ink"]["mid"], 0.8, 0.45)
        ridge_hachure(ink, full, P["rock"]["crack"], 1, 3.0 / DENSITY, 13, 0.5, 0.65, 2.6)
        stipple_rect(ink, a, 60, b, v.mouth_y + 40, P["rock"]["crack"], 420, op=0.6, size=0.95,
                     tone=lambda x, y: max(0.0, min(1.0, 1.05 - (y - horizon(x)) / 46)))
        # Rễ cây thò ra khỏi mép vực — nét vắt QUA ranh giới đất/đá, và theo
        # luật "good continuation" thì mọi nét vắt qua ranh giới đều khâu hai
        # bên lại thành một vật.
        i = 0
        x = a + 4
        while x < b:
            step = 7 + 11 * rnd(i * 3.1)
            r = 4 + 5 * rnd(i * 1.7)
            ty = horizon(x) - 2
            for k in range(int((6 + r * 1.6) * DENSITY)):
                ang = rnd(i, k) * math.pi * 2
                rr = r * math.sqrt(rnd(i * 2.2, k))
                ink.stroke(dot(x + math.cos(ang) * rr, ty - r * 0.9 + math.sin(ang) * rr * 0.8),
                           P["ink"]["mid"], 0.85, 0.5)
            ink.line(x, ty, x, ty - r * 0.7, P["ink"]["mid"], 0.55, 0.6, 0.2)
            if rnd(i * 4.4) > 0.6:
                ink.poly([(x - r, ty - r * 0.3), (x, ty - r * 2.1), (x + r, ty - r * 0.3)],
                         P["ink"]["soft"], 0.5, 0.5)
            x += step
            i += 1

    strip(max(x0, 0), min(x1, ml), -1)
    strip(max(x0, mr), min(x1, W), 1)


# ── khối đá: MỘT hình bóng, MỘT trường nét ─────────────────────────────

def da_tone(v: Vuc, x, y):
    """MỘT trường sắc độ cho cả khối đá, không phải một trường cho mỗi gian.

    Hai thành phần, và cả hai cố ý TOÀN CỤC:
      · độ sâu: càng xuống càng dày nét (hàm đơn điệu của y, không bậc thang);
      · nhiễu fbm cùng một hạt giống cho cả khối.
    Lý do không chia theo gian: sắc độ tính riêng từng gian là thứ làm tám gian
    thành tám mảnh vá — mỗi mảnh có "khí hậu" riêng. Một trường duy nhất là
    cách bản khắc nói "cùng một thứ đá"."""
    d = max(0.0, min(1.0, (y - v.mouth_y) / (v.bottom_y - v.mouth_y)))
    t = 0.30 + 0.52 * d + 0.40 * NZ.fbm(x * 0.009, y * 0.014 + 3)
    # Quanh hồ ở đáy thì SÁNG LẠI — đáy vực sáng là điểm nhấn của bản mặt cắt
    # tham chiếu, và nó làm bằng cách BỚT NÉT, không bằng một mảng sáng.
    glow = math.hypot((x - v.cx) * 0.62, y - 772)
    if glow < 230:
        t *= 0.34 + 0.66 * (glow / 230)
    return max(0.0, min(1.0, t))


def draw_rock_mass(ink, v: Vuc, x0, x1):
    """KHỐI ĐÁ — một hình bóng liền, với lòng vực là LỖ trong chính nó.

    `fill-rule="evenodd"` làm việc chính ở đây: một `<path>` duy nhất mang hai
    vòng (biên ngoài, rồi biên lòng vực) và chỗ rỗng là lỗ thủng của cùng một
    hình. Đó là khác biệt giữa "đá có một cái hố" và "mấy mảng đá xếp quanh mấy
    cái hốc" — và nó là khác biệt NHÌN THẤY ĐƯỢC, vì vòng trong không có nét
    viền riêng.

    Rồi bốn TẦNG chỉ đổi sắc độ, KHÔNG đổi hình: mỗi tầng tô đè một mảng sắc
    tầng của nó lên cùng khối đá ấy."""
    outer = rock_poly(v, step=5.0)
    inner = shaft_poly(v, step=4.0)
    # Vòng trong đi NGƯỢC chiều vòng ngoài — với evenodd thì chiều không đổi kết
    # quả, nhưng giữ đúng quy ước để ai đổi sang nonzero không phải đoán.
    ink.fill_rule(pl(outer, True) + pl(list(reversed(inner)), True),
                  P["rock"]["veil"], 1.0, rule="evenodd")

    # Sắc tầng: tô đè theo từng tầng, cắt bởi chính hai biên trên.
    for name, _ybot in v.tiers:
        top, bot = v.tier_span(name)
        bot = min(bot, v.bottom_y)
        if bot <= top or bot < 0:
            continue
        o = rock_poly(v, top, bot, 5.0)
        i2 = shaft_poly(v, top, bot, 4.0)
        ink.fill_rule(pl(o, True) + pl(list(reversed(i2)), True),
                      P["band"][name], 1.0, rule="evenodd")

    ink.clip_path(pl(outer, True) + pl(list(reversed(inner)), True), "da", rule="evenodd")
    ink.clip = "da"
    # RĂNG CƯA Ở RANH GIỚI HAI TẦNG. Bốn mảng sắc tầng chồng lên nhau để lại
    # bốn đường cắt ngang gần như thẳng, và bốn đường ấy chia cả bức thành bốn
    # lát bánh — đúng cái "bốn dải" mà bản này bỏ đi. Ranh giới vỉa thật thì
    # răng cưa vào nhau: tầng trên thò lưỡi xuống, tầng dưới thò lưỡi lên.
    # Vẫn là MỘT ranh giới chạy hết bề rộng (quy ước mặt cắt địa chất), nhưng
    # giờ nó là một đường KHÂU chứ không phải một nhát cắt.
    names = [n for n, _ in v.tiers]
    for bi, (_name, top, _bot) in enumerate(BANDS[1:], start=1):
        tren, duoi = P["band"][names[bi - 1]], P["band"][names[bi]]
        xx = 0.0
        i = 0
        while xx < W:
            wtooth = 14 + 34 * rnd(i * 2.7, bi)
            dep = 4 + 14 * rnd(i * 5.1, bi * 1.3)
            up = rnd(i * 1.9, bi * 3.7) > 0.5
            cx_ = xx + wtooth / 2
            y0 = top(cx_)
            # Ranh giới vỉa chỉ TỒN TẠI trong đá. Răng cưa vẽ vắt qua lòng vực
            # thành mấy cục tối lửng lơ giữa khoảng rỗng — đã thấy đúng như vậy
            # ở lần dựng trước, và `clip-path` không cứu được vì chỗ đó vẫn là
            # đá theo hình bóng NGOÀI, chỉ không phải đá theo hình bóng TRONG.
            if v.left(y0) - 6 <= cx_ <= v.right(y0) + 6 or not (
                    v.out_left(y0) < cx_ < v.out_right(y0)):
                xx += wtooth
                i += 1
                continue
            tooth = [(xx, y0), (xx + wtooth * 0.3, y0 + (-dep if up else dep) * 0.75),
                     (xx + wtooth * 0.7, y0 + (-dep if up else dep)),
                     (xx + wtooth, y0)]
            ink.fill(pl(tooth, True), duoi if up else tren)
            xx += wtooth
            i += 1
    for name, _ybot in v.tiers:
        top, bot = v.tier_span(name)
        bot = min(bot, v.bottom_y)
        if bot <= top:
            continue
        # Mật độ nét theo tầng. Hai luật đánh nhau ở đây và luật thứ hai thắng:
        #  · "càng sâu nét càng dày" (bản mặt cắt tham chiếu) — vẫn giữ;
        #  · nhưng TRẦN 900 KB là thật, và chỗ phải cắt là chỗ người ta nhìn ít
        #    nhất. Tầng đáy nằm xa nhất khỏi mặt đất, lại bị quầng sáng của hồ
        #    làm thưa nét sẵn, nên nó chịu phần cắt; hai tầng trên — chỗ mắt
        #    dừng lại lâu nhất — được DÀY LÊN bằng chỗ vừa tiết kiệm được.
        dark, light, dens = {
            "surface": (P["rock"]["crack"], P["rock"]["shade"], 1.3),
            "shallow": (P["rock"]["shade"], P["ink"]["deep"], 1.4),
            "deep": (P["rock"]["veil"], P["rock"]["grain"], 1.45),
            "floor": (P["rock"]["veil"], P["rock"]["grain"], 1.45),
        }[name]
        ink.layer("da-" + name)
        a = max(x0, v.cx - 700)
        b = min(x1, v.cx + 700)

        # Trường nét là TOÀN CỤC (một góc, một pha, cho cả khối đá) nhưng chỉ
        # ĐẶT NÉT ở chỗ thật sự có đá. Không phải để cho đẹp: trước khi có hàm
        # này, `hatch_rect` rải nét khắp hình chữ nhật rồi `clip-path` mới cắt
        # bỏ — 40% số nét nằm trong tệp mà không ai nhìn thấy, và bản rộng vượt
        # trần 900 KB vì đúng chỗ đó.
        def tone(px, py, v=v):
            if px < v.out_left(py) or px > v.out_right(py):
                return 0.0
            if v.left(py) <= px <= v.right(py):
                return 0.0
            return da_tone(v, px, py)
        # MỘT góc nét cho cả khối đá (−41°), và góc thứ hai 34° làm lượt phụ.
        # Góc chỉ ĐỔI ở ranh giới vật liệu thật — luật gạch mặt cắt của bản vẽ
        # kỹ thuật: cùng một vật thì cùng một góc gạch, đổi góc là báo đổi vật.
        hatch_rect(ink, a, top - 4, b, bot + 4, dark,
                   angle=-41, spacing=4.2 / dens, w=0.45, op=0.8, length=7.5, tone=tone)
        hatch_rect(ink, a, top - 4, b, bot + 4, light,
                   angle=34, spacing=7.0 / dens, w=0.42, op=0.5, length=6.0, tone=tone)
        stipple_rect(ink, a, top, b, bot, dark, int(560 * dens), op=0.75, size=0.9, tone=tone)
        # Thấu kính đá: vỉa hình thoi nằm xen trong tầng.
        for i in range(int(6 * dens * DENSITY)):
            lx = lerp(a, b, rnd(i * 2.7, ord(name[0])))
            ly = lerp(top + 12, bot - 12, rnd(i * 5.9, 3.3))
            lw, lh = 30 + 70 * rnd(i * 1.3), 5 + 9 * rnd(i * 4.1)
            lens = rough_ring(lx, ly, lw / 2, lw * 0.05, 26, i * 3.3, lh / (lw / 2))
            ink.poly(lens, dark, 0.7, 0.6, close=True)
            hatch_rect(ink, lx - lw / 2, ly - lh, lx + lw / 2, ly + lh, dark,
                       angle=4, spacing=1.8, w=0.4, op=0.45, length=lw * 0.3)

    # Khe nứt CHẠY QUA nhiều tầng. Mỗi khe là MỘT polyline dài, không phải mấy
    # vết xước cắt khúc trong từng tầng — nét vắt qua ranh giới là thứ khâu các
    # tầng lại thành một khối (good continuation).
    # HÌNH BÓNG NGOÀI của khối đá: một nét vừa phải cộng hachure đổ RA NGOÀI.
    # Khối đá trôi trên giấy, nên mép ngoài của nó cũng là một đường liên tục
    # từ mặt đất xuống đáy — vực là một hình liền cả ở mặt ngoài lẫn mặt trong.
    ink.layer("vien-da")
    for side in ("trai", "phai"):
        f = v.out_left if side == "trai" else v.out_right
        pts = [(f(y), y) for y in v.ys(3.0)]
        ink.poly(pts, P["ink"]["mid"], 1.5, 0.75)
        ridge_hachure(ink, pts, P["ink"]["soft"], -1 if side == "trai" else 1,
                      4.4 / DENSITY, 9, 0.42, 0.45, slope_gain=0.4)

    ink.clip = "da"
    ink.layer("da-nut")
    for i in range(int(16 * DENSITY)):
        side = -1 if i % 2 == 0 else 1
        y = lerp(v.mouth_y + 30, v.bottom_y - 40, rnd(i * 1.9, 2.2))
        x = (v.out_left(y) + v.left(y)) / 2 if side < 0 else (v.out_right(y) + v.right(y)) / 2
        pts = [(x, y)]
        ang = math.pi / 2 + (rnd(i * 3.3) - 0.5) * 1.5
        for k in range(14):
            ang += (rnd(i * 3.3, k * 1.7) - 0.5) * 0.8
            d = 16 + 20 * rnd(i, k)
            x += math.cos(ang) * d
            y += math.sin(ang) * d
            pts.append((x, y))
        ink.poly(pts, P["rock"]["crack"], 0.6, 0.55)
    ink.clip = None


def draw_vach(ink, v: Vuc):
    """VÁCH VỰC — hai `<path>`, mỗi bên MỘT đường từ miệng xuống đáy.

    Đây là nét quyết định cả bức. Mỗi bên đúng MỘT lệnh `M` rồi vài trăm lệnh
    `l`; gian không cắt nó ra thành khúc, gian chỉ làm nó phình ra. Ca test
    "vách vực là một đường liền" đếm đúng con số đó, vì khuyết điểm phải chữa
    ("chưa có sự liên kết giữa các màn") có hình dạng kiểm được: tám đường viền
    khép kín rời nhau.

    Hachure chạy VUÔNG GÓC với vách và chết dần vào trong (luật "nét hachure
    phải bám theo hình"). Nét bám mép thì mép đọc ra là MẶT của một khối đặc;
    nét vẽ quanh một cái hộp thì nó đọc ra là cái hộp."""
    for side, tag in (("trai", "trai"), ("phai", "phai")):
        pts = v.wall(side, 2.4)
        ink.layer("vach-" + tag)
        # Hình bóng một nét ĐẬM HƠN mọi nét bên trong (2,4 so với 0,4–1,6):
        # nheo mắt lại thì chỉ còn đúng cái hố. Đó là phép thử "squint test".
        ink.poly(pts, P["ink"]["deep"], 2.4, 0.95)
        ink.poly([(x + (3 if side == "trai" else -3), y) for x, y in pts],
                 P["ink"]["mid"], 0.7, 0.45)
        ridge_hachure(ink, pts, P["ink"]["deep"], 1 if side == "trai" else -1,
                      3.4 / DENSITY, 13, 0.5, 0.6, slope_gain=0.45)
        # Mép bắt sáng: bên trái hứng nắng (mặt trời trên-trái) nên mép sáng,
        # bên phải tối. Làm bằng MẬT ĐỘ nét, không bằng mảng sáng.
        c = P["light"]["halo"] if side == "trai" else P["ink"]["deep"]
        for i in range(0, len(pts), 2):
            x, y = pts[i]
            if y < v.mouth_y + 8:
                continue
            d = max(0.0, 1 - (y - v.mouth_y) / 420)
            if rnd(x * 1.3, y * 2.1) > 0.25 + 0.6 * d:
                continue
            s = 1 if side == "trai" else -1
            ink.line(x + s * 1.5, y, x + s * (3 + 5 * rnd(x, y)), y + 1.5,
                     c, 0.5, 0.35 + 0.4 * d, 0.2)


def draw_vach_sau(ink, v: Vuc):
    """VÁCH SAU — mặt trong của cùng cái hố, vẽ liền từ miệng xuống hồ.

    Trong một bản vẽ cắt dọc, cái nhìn thấy phía sau khoảng rỗng là vách SAU.
    Nó là nền của mọi gian, và vì nó liền một mạch nên tám gian đứng trên cùng
    một mặt. Theo luật cắt bổ của Li & al. (SIGGRAPH 2007) — "vật ở xa người
    xem bị cắt ít hơn vật ở gần" — vách sau vẽ NHẠT và THƯA hơn hai vách hông,
    nên nó lùi lại chứ không tranh chỗ."""
    ink.layer("vach-sau")
    ink.clip_path(pl(shaft_poly(v, step=4.0), True), "long-vuc")
    ink.clip = "long-vuc"
    # Bóng dưới VÀNH MIỆNG. Không có nó, chỗ mặt đất gặp cái hố chỉ là hai sắc
    # độ cạnh nhau và người xem đọc ra "đất rồi tới đất khác", không đọc ra
    # "mép một cái hố". Đá nhô ra che nắng — đó là nét đậm nhất của cả miệng
    # vực, và nó làm bằng mật độ nét, không bằng một mảng tối.
    for i in range(int(230 * DENSITY)):
        t = i / (230 * DENSITY)
        px = lerp(v.left(v.mouth_y) - 10, v.right(v.mouth_y) + 10, t)
        d = 10 + 46 * (0.3 + 0.7 * NZ.fbm(px * 0.014, 2.2, 3))
        L = 6 + 16 * rnd(i * 1.7, 3.1)
        ink.line(px, v.mouth_y + d * rnd(i, 2), px + (rnd(i * 2.3) - 0.5) * 7,
                 v.mouth_y + d * rnd(i, 2) - L, P["ink"]["deep"], 0.55, 0.55, 0.3)
    # Nền lòng vực: sắc tầng, nhưng SÁNG HƠN đá quanh nó một bậc — chỗ rỗng
    # phải sáng hơn chỗ đặc, không thì cái hố đọc ra là một vết mực.
    for name, _ in v.tiers:
        top, bot = v.tier_span(name)
        bot = min(bot, v.bottom_y)
        if bot <= top:
            continue
        # Lòng vực SÁNG HƠN đá ở MỌI độ sâu — ánh sáng chỉ vào được qua cái hố
        # — mà cả hai vẫn tối dần xuống sâu. Một cột sáng duy nhất chạy suốt
        # bức là tín hiệu hình-nền mạnh nhất có ở đây: nheo mắt lại chỉ còn nó.
        room = {"surface": P["band"]["sky"], "shallow": P["room"]["lit"],
                "deep": P["room"]["dim"], "floor": P["room"]["dark"]}[name]
        ink.fill(pl(shaft_poly(v, top, bot, 4.0), True), room)
    # Đường bình độ của vách sau: cung ngang hơi võng, thưa dần xuống sâu. Đây
    # là thứ làm vách sau ra MẶT CONG chứ không ra mảng màu.
    y = v.mouth_y + 10
    i = 0
    while y < v.bottom_y:
        a, b = v.left(y), v.right(y)
        if b - a > 24:
            pts = [(lerp(a + 6, b - 6, j / 24),
                    y + math.sin(math.pi * j / 24) * (b - a) * 0.035
                    + (NZ.fbm(j * 0.3 + i, y * 0.02) - 0.5) * 5) for j in range(25)]
            ink.poly(pts, P["ink"]["mid"], 0.5, 0.3 + 0.2 * rnd(i))
        y += 13 + 7 * rnd(i * 2.3)
        i += 1
    # Nét chéo CÙNG MỘT GÓC với khối đá (−41°) nhưng THƯA HƠN HẲN và nhạt hơn
    # hẳn. Hai con số này là chỗ bản đầu của hình thái hỏng: vách sau được gạch
    # dày gần bằng đá, nên lòng vực và đá cùng một sắc độ và cái hố biến mất —
    # tức mất đúng thứ cả bản này sinh ra để có. Khoảng RỖNG phải THƯA NÉT; đó
    # là cách bản khắc nói "chỗ này không có gì", và là tín hiệu hình-nền mạnh
    # nhất còn lại sau khi đã bỏ hết gradient.
    def tone(px, py):
        if not (v.left(py) <= px <= v.right(py)):
            return 0.0
        return 0.10 + 0.34 * da_tone(v, px, py)

    hatch_rect(ink, v.cx - 560, v.mouth_y, v.cx + 560, v.bottom_y, P["ink"]["soft"],
               angle=-41, spacing=13.0 / DENSITY, w=0.4, op=0.2, length=6.0, tone=tone)
    stipple_rect(ink, v.cx - 560, v.mouth_y, v.cx + 560, v.bottom_y, P["ink"]["soft"],
                 320, op=0.3, size=0.8, tone=tone)
    ink.clip = None


def draw_muc_nuoc(ink, v: Vuc):
    """MỰC NƯỚC CỔ — hai đường ngang nhạt cắt NGANG CẢ BỨC, qua đá lẫn qua lòng
    vực.

    Không phải trang trí. Thuỷ văn karst: mực nước ngầm là MỘT mặt duy nhất
    chia đới thoáng khí với đới bão hoà, và hang hình thành theo từng tầng ứng
    với các mực nước cũ khi mực nước hạ dần. Một đường thuộc về CẢ khối đá, nên
    nó buộc mọi gian nó cắt qua vào cùng một hệ — đúng thứ "liên kết giữa các
    màn" đang thiếu. Và nó giải thích luôn hình dáng: phía TRÊN đường (đới
    thoáng khí) lòng vực hẹp và thẳng theo khe nứt, phía DƯỚI (đới bão hoà)
    lòng vực tròn và rộng hơn cao — xem bảng mặt cắt ở mục 3."""
    for n, yy in ((0, 508.0), (1, 716.0)):
        pts = [(x, yy + (NZ.fbm(x * 0.004, 7.7 + n * 3, 3) - 0.5) * 9)
               for x in [i * 10 for i in range(W // 10 + 1)]]
        ink.poly(pts, P["ink"]["pale"], 0.6, 0.5, dash="9 7")
        for i in range(0, len(pts) - 1, 7):
            x, y = pts[i]
            ink.line(x, y, x + 5, y - 3.5, P["ink"]["pale"], 0.45, 0.4, 0.1)


# ═══════════════════════════════════════════════════════════════════════
# 6 · khung gian: khoét đá, viền, bóng
# ═══════════════════════════════════════════════════════════════════════

def vault(ink, v: Vuc, key, pad=10.0):
    """KHOÉT MỘT GIAN VÀO VÁCH CỦA CHÍNH CÁI VỰC — không phải thả một cái bọt
    vào đá.

    Bản trước vẽ mỗi gian bằng một đường KHÉP KÍN (`cut` 22 đỉnh, `ink.poly(…,
    close=True)`). Tám đường khép kín là tám vật thể rời — đó chính là câu
    "chưa có sự liên kết giữa các màn", viết ra được bằng hình học. Ở đây:

      · hốc nằm ở ĐÚNG chỗ `Vuc.alcoves` đã làm vách phình ra, nên hình của hốc
        và hình của vách là MỘT;
      · đường viền hốc là một CUNG HỞ: phía mở ra lòng vực không có nét nào, vì
        ở đó không có đá. Không có chỗ nào để mắt khép hình lại thành một bọt;
      · chừa một GỜ ĐÁ nhô ra che mép trên của hốc (Li & al. 2007: "cắt bổ hiệu
        quả nhất là cắt một PHẦN, chừa lại đủ để người xem tự dựng lại chỗ bị
        bỏ đi") — gờ ấy cũng là thứ nói hốc nằm TRONG một khối dày.

    Trả về `(rx0, rx1, floor, spring)` — nhịp vòm và nền của gian xây bên trong.
    """
    x, y, w, h = BOX[key]
    c = P[key.lower()]
    side = SIDE_OF.get(key, "sau")
    ytop, ybot = max(y + pad * 0.6, v.mouth_y + 4), y + h - pad * 0.6

    # 1 · MIỆNG HỐC: lấy thẳng từ đường vách. Không tính lại, không vẽ xấp xỉ —
    # lấy đúng những điểm mà `draw_vach` đã vẽ, nên hốc không thể lệch khỏi vách.
    ys = [ytop + (ybot - ytop) * i / 26 for i in range(27)]
    if side == "trai":
        mouth = [(v.left(t), t) for t in ys]
    elif side == "phai":
        mouth = [(v.right(t), t) for t in ys]
    else:
        mouth = []

    rx0, rx1, floor, apex = noi_gian(v, key)
    spring = lerp(apex, floor, 0.46)
    cxm = (rx0 + rx1) / 2

    tier = v.tier_at((ytop + ybot) / 2)
    room = P["room"]["lit"] if tier in ("surface", "shallow") else (
        P["room"]["dark"] if tier == "floor" else P["room"]["dim"])

    # 2 · LÒNG HỐC: một hõm ôm sát gian, ăn NGƯỢC vào vách. Phía mở ra lòng vực
    # KHÔNG có nét viền — ở đó không có đá, nên vẽ một nét ở đó là dựng lại cái
    # bọt khép kín mà bản này sinh ra để chữa.
    ny0, ny1 = apex - 16, floor + 7
    ys2 = [ny0 + (ny1 - ny0) * i / 18 for i in range(19)]
    if side == "trai":
        back_pts = [(v.left(t) - 2, t) for t in ys2]
        front = rx1 + 18
    elif side == "phai":
        back_pts = [(v.right(t) + 2, t) for t in ys2]
        front = rx0 - 18
    else:
        back_pts = []
        front = 0.0
    if back_pts:
        ink.fill(pl(back_pts + [(front, ny1), (front, ny0)], True), room)
        brow = [(lerp(back_pts[0][0], front, i / 16),
                 ny0 + math.sin(math.pi * i / 16) * 7
                 + (NZ.fbm(i * 0.5 + ord(key[-1]), 4.4) - 0.5) * 6) for i in range(17)]
    else:
        ink.fill(pl([(rx0 - 22, ny1), (rx0 - 22, ny0 + 10), (cxm, ny0 - 7),
                     (rx1 + 22, ny0 + 10), (rx1 + 22, ny1)], True), room)
        brow = [(lerp(rx0 - 26, rx1 + 26, i / 16),
                 ny0 + 4 - math.sin(math.pi * i / 16) * 10
                 + (NZ.fbm(i * 0.5 + ord(key[-1]), 4.4) - 0.5) * 6) for i in range(17)]

    # 3 · GỜ ĐÁ che mép trên — cắt một PHẦN, không cắt phẳng (Li & al. 2007).
    ink.poly(brow, P["ink"]["deep"], 1.5, 0.85)
    ridge_hachure(ink, brow, P["ink"]["deep"], 1, 3.0 / DENSITY, 9, 0.45, 0.55, 1.6)

    # 4 · KHUNG GIAN — và nó KHÁC NHAU theo từng gian.
    #
    # Bản đầu của hình thái này cho cả bảy gian cùng một nửa ellipse. Bảy cái
    # vòm giống hệt nhau xếp thành hàng là chính cái tín hiệu "tám hốc rời" ở
    # dạng khác: mắt nhóm những hình GIỐNG NHAU lại với nhau (luật tương tự),
    # nên bảy cái vòm đọc ra là bảy món cùng bộ sưu tập, không ra bảy chỗ của
    # cùng một cái hố. Ba kiểu khung, chọn theo cái gian ấy LÀ GÌ:
    #   cuon  vòm cuốn xây — công trình có người xây (M1 xưởng, M4 đập nước)
    #   lanh  lanh-tô phẳng gác trên hai trụ — gian khoét vào vách sau
    #   khe   khe đá tự nhiên, không có gì xây — M5, M7
    kind = VAULT_KIND[key]
    if kind == "cuon":
        arc = [(cxm - math.cos(math.pi * i / 48) * (rx1 - rx0) / 2,
                spring - math.sin(math.pi * i / 48) * (spring - apex)) for i in range(49)]
        ink.fill(pl(arc + [(rx1, floor), (rx0, floor)], True), room)
        ink.poly(arc, c["edge"], 1.7, 0.95)
        for i in range(0, 49, 2):
            px, py = arc[i]
            dx, dy = px - cxm, (py - spring) * 1.5
            L = math.hypot(dx, dy) or 1
            ink.line(px, py, px - dx / L * 9, py - dy / L * 9, c["edge"], 0.55, 0.6, 0.15)
    elif kind == "lanh":
        arc = [(rx0, spring), (rx0, apex + 8), (rx1, apex + 8), (rx1, spring)]
        ink.fill(pl([(rx0, floor), (rx0, apex + 4), (rx1, apex + 4), (rx1, floor)], True), room)
        # Lanh-tô: một thanh đá nằm ngang gác lên hai trụ, có mạch cắt đứng.
        ink.stroke("M%s %sH%sV%sH%sZ" % (nf(rx0 - 8), nf(apex), nf(rx1 + 8),
                                         nf(apex + 10), nf(rx0 - 8)), c["edge"], 1.6, 0.95)
        n = max(3, int((rx1 - rx0) / 22))
        for i in range(1, n):
            xx = lerp(rx0 - 8, rx1 + 8, i / n)
            ink.line(xx, apex, xx, apex + 10, c["edge"], 0.55, 0.6, 0.1)
        hatch_rect(ink, rx0 - 8, apex, rx1 + 8, apex + 10, c["ink"], 18, 2.0, 0.35, 0.4, 7)
    else:
        # Khe đá: hai mép gãy khúc chụm lại ở trên, KHÔNG có nét xây nào. Gian
        # tự nhiên và gian xây đứng cạnh nhau là chuyện có thật của một cái vực
        # bị người tới sau chiếm dụng — và nó phá được hàng vòm giống hệt nhau.
        left_e = [(rx0 + math.sin(i * 1.9) * 4 - (1 - i / 10) * 6, lerp(floor, apex, i / 10))
                  for i in range(11)]
        right_e = [(rx1 - math.sin(i * 2.3) * 4 + (1 - i / 10) * 6, lerp(floor, apex, i / 10))
                   for i in range(11)]
        arc = list(reversed(left_e)) + right_e
        ink.fill(pl([(rx0 - 6, floor)] + left_e + right_e + [(rx1 + 6, floor)], True), room)
        ink.poly(left_e, c["edge"], 1.5, 0.9)
        ink.poly(right_e, c["edge"], 1.5, 0.9)
        ridge_hachure(ink, left_e, c["ink"], -1, 3.0 / DENSITY, 7, 0.4, 0.45, 0.6)
        ridge_hachure(ink, right_e, c["ink"], 1, 3.0 / DENSITY, 7, 0.4, 0.45, 0.6)
    for k in range(1, 5):
        sh = [(cxm - math.cos(math.pi * i / 48) * ((rx1 - rx0) / 2 - k * 2.6),
               spring - math.sin(math.pi * i / 48) * ((spring - apex) - k * 2.2))
              for i in range(0, 49)]
        ink.poly([p for i, p in enumerate(sh) if i > 20], P["ink"]["deep"], 0.45, 0.3)

    # 5 · hai trụ tường xây đá tảng + nền lát. Khe đá tự nhiên không có trụ —
    # ở đó cái "tường" chính là mép đá đã vẽ ở trên.
    for s, px in (() if kind == "khe" else ((-1, rx0), (1, rx1))):
        ink.line(px, spring, px, floor, c["edge"], 1.5, 0.9, 0.2)
        rows = int((floor - spring) / 9)
        for r in range(rows + 1):
            yy = spring + r * (floor - spring) / max(1, rows)
            ink.line(px, yy, px - s * 13, yy, c["edge"], 0.5, 0.55, 0.2)
        shade_face(ink, px - 13 if s > 0 else px, spring, 13, floor - spring,
                   P["ink"]["deep"], 0.26 if s < 0 else 0.42)
    ink.line(rx0 - 6, floor, rx1 + 6, floor, P["ink"]["deep"], 1.7, 0.9, 0.2)
    tiles = int((rx1 - rx0) / 22)
    for i in range(tiles + 1):
        xx = rx0 + i * (rx1 - rx0) / max(1, tiles)
        ink.line(xx, floor, xx - 4, floor + 5, P["ink"]["deep"], 0.5, 0.5, 0.1)
    ink.line(rx0 - 6, floor + 5, rx1 + 6, floor + 5, P["ink"]["deep"], 0.7, 0.5, 0.2)

    # 6 · LỐI THÔNG ra lòng vực: bậc đá từ nền gian chìa ra tới mép vách. Mỗi
    # gian vào thẳng được, nhưng nó phải THUỘC cái hố — bậc đá là chỗ nói điều
    # đó bằng hình.
    if mouth:
        edge_x = v.left(floor) if side == "trai" else v.right(floor)
        s = 1 if side == "trai" else -1
        for k in range(5):
            bx = lerp(rx1 if side == "trai" else rx0, edge_x, (k + 1) / 5)
            ink.line(bx, floor + k * 2.4, bx + s * 11, floor + k * 2.4,
                     P["ink"]["deep"], 0.8, 0.6, 0.2)
    return rx0, rx1, floor, apex


def noi_gian(v: Vuc, key):
    """Ô TRỐNG trong lòng hốc — chỗ tiểu cảnh được đặt vào.

    Tách khỏi `vault()` để ca test gọi lại được mà không phải vẽ: "mỗi gian
    nằm trong lòng vực" kiểm bằng chính hàm này."""
    x, y, w, h = BOX[key]
    side = SIDE_OF.get(key, "sau")
    pad = 9.0
    ytop = max(y + pad * 0.6, v.mouth_y + 4)
    ybot = y + h - pad * 0.6
    ys = [ytop + (ybot - ytop) * i / 26 for i in range(27)]
    # GIAN PHẢI NHỎ SO VỚI CÁI HỐ. Bản đầu của hình thái này cho mỗi gian
    # chiếm gần trọn hốc (0,72 bề rộng ô, 0,87 chiều cao) — và nó hỏng đúng
    # kiểu cũ: bảy cái vòm to bằng nhau xếp thành hàng, mắt lại đọc ra bảy căn
    # phòng chứ không ra một cái vực. Ở bản mặt cắt tham chiếu, công trình của
    # con người bé xíu so với cái hố; chính cái tỉ lệ ấy mới nói "sâu".
    size = GIAN_SIZE[key]
    if side == "trai":
        back = min(v.left(t) for t in ys)
        rx0, rx1 = back + 14, back + 14 + size[0]
    elif side == "phai":
        back = max(v.right(t) for t in ys)
        rx0, rx1 = back - 14 - size[0], back - 14
    elif key == "M8":
        # Hồ ở đáy KHÔNG có vòm xây: nó rộng hết lòng vực, vì cả cái vực đổ
        # vào đây. Lấy thẳng bề rộng lòng vực tại mực nước.
        rx0, rx1 = v.left(770) + 18, v.right(770) - 18
    else:
        cxm = x + w / 2
        rx0, rx1 = cxm - size[0] / 2, cxm + size[0] / 2
    floor = ybot - 4
    apex = floor - size[1]
    return rx0, rx1, floor, apex


def draw_gian(ink, v: Vuc, key):
    """Khoét hốc vào vách rồi ĐẶT tiểu cảnh vào lòng nó.

    Tiểu cảnh được dựng trong `ART_BOX` (khung riêng của nó) rồi đưa vào chỗ
    thật bằng một `transform` đồng dạng trên nhóm `gian-M*`. Nhóm ấy mang
    `id="gian-M1"` và `data-gian="M1"` — móc cho lớp chuyển động."""
    ink.layer("hoc-" + key)
    if key != "M8":
        vault(ink, v, key)
    else:
        # M8 không có hốc xây — "hốc" của nó là chỗ MẶT HỒ gặp hai vách vực.
        # Vẫn phải vẽ gì đó vào lớp này: lớp rỗng bị bỏ khi render, và lúc ấy
        # `data-hoc="M8"` biến mất khỏi hợp đồng móc ở ky-thuat-ban-do.md.
        wy = 770.0
        for f, s in ((v.left, 1), (v.right, -1)):
            for k in range(int(16 * DENSITY)):
                yy = wy - 9 + k * 18 / (16 * DENSITY)
                xx = f(yy)
                L = 9 + 20 * rnd(k * 1.7, xx)
                ink.line(xx, yy, xx + s * L, yy + (rnd(xx, k) - 0.5) * 2,
                         P["m8"]["edge"], 0.55, 0.5, 0.4)
            ink.line(f(wy) , wy, f(wy) + s * 34, wy, P["m8"]["glow"], 1.3, 0.8, 0.4)
    rx0, rx1, floor, apex = noi_gian(v, key)
    ax, ay, aw, ah = ART_BOX[key]
    iw, ih = (rx1 - rx0) - 8, (floor - apex) - 10
    s = max(0.2, min(iw / aw, ih / ah))
    tx = rx0 + 4 + (iw - aw * s) / 2 - ax * s
    ty = apex + 8 + (ih - ah * s) / 2 - ay * s
    ink.wscale = 1.0 / s
    # Nhóm chỉ mang `transform` — KHÔNG mang `id`/`data-gian`. Nhóm đã có
    # `data-lop="gian-M1"` sẵn, đủ để đọc và kiểm tệp; thêm một `id` nữa là
    # thêm byte chết, vì tranh vào trang bằng ảnh nền nên không ai
    # `querySelector` vào trong nó được (xem `Ink.layer`).
    #
    # Toạ độ của `translate` làm tròn tới 0,1 — `nf()` làm tròn về số nguyên
    # của khung, và với một phép tịnh tiến thì nửa đơn vị khung là nửa đơn vị
    # LỆCH của cả tiểu cảnh, không phải của một nét.
    ink.layer("gian-" + key, attrs={
        "transform": "translate(%.1f %.1f) scale(%.4f)" % (tx, ty, s),
    })
    SCENES[key](ink)
    ink.wscale = 1.0


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
    x, y, w, h = ART_BOX["M1"]
    c = P["m1"]
    gy = y + h - 10
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
    x, y, w, h = ART_BOX["M2"]
    c = P["m2"]
    gy = y + h - 10
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
    x, y, w, h = ART_BOX["M3"]
    c = P["m3"]
    gy = y + h - 10
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
    x, y, w, h = ART_BOX["M4"]
    c = P["m4"]
    rx0, rx1, floor_y, spring = x + 6, x + w - 6, y + h - 8, y + h * 0.42
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
    x, y, w, h = ART_BOX["M5"]
    c = P["m5"]
    rx0, rx1, floor_y, spring = x + 6, x + w - 6, y + h - 8, y + h * 0.42
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
    x, y, w, h = ART_BOX["M6"]
    c = P["m6"]
    rx0, rx1, floor_y, spring = x + 6, x + w - 6, y + h - 8, y + h * 0.42
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
    x, y, w, h = ART_BOX["M7"]
    c = P["m7"]
    rx0, rx1, floor_y, spring = x + 6, x + w - 6, y + h - 8, y + h * 0.42
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
    x, y, w, h = ART_BOX["M8"]
    c = P["m8"]
    cx = x + w / 2
    # KHÔNG CÓ VỎ HANG Ở ĐÂY NỮA, và đó là cả điểm của bản này.
    #
    # Bản trước đóng M8 bằng một đa giác khép kín (`cave = roof + side_r + base
    # + side_l`, rồi `pl(cave, True)`): một cái hang RỜI, tình cờ nằm ở chỗ
    # thấp nhất. Nay vỏ hang chính là VÁCH VỰC — cùng hai đường mà M1 và M5
    # khoét vào — nên ở đây chỉ còn những gì nằm TRONG lòng nó: trần nhũ đá,
    # mặt hồ, và bảy vệt phản chiếu. Thêm lại một đường khép kín ở đây là trả
    # bản đồ về đúng khuyết điểm "tám hốc rời".
    roof = [(lerp(x + 10, x + w - 10, i / 40),
             y + 8 + NZ.fbm(i * 0.34 + 4, 2.2, 5) * 24) for i in range(41)]
    ridge_hachure(ink, roof, c["edge"], 1, 4.2 / DENSITY, 4.5, 0.4, 0.35, 1.3)
    ink.poly(roof, c["edge"], 0.8, 0.45)
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

def draw_wells(ink, v: Vuc):
    """LỐI XUỐNG RIÊNG của từng gian — năm sợi cáp thả từ miệng vực.

    Bản trước vẽ năm cái giếng ĐÀO THẲNG qua đá, mỗi giếng một trục dọc riêng.
    Ở hình thái mới chúng không còn chỗ: khối đá thắt lại ở y≈438, một trục dọc
    ở x=100 sẽ chui ra ngoài hình bóng và treo lơ lửng trên giấy.

    Thay bằng năm sợi cáp thả TRONG LÒNG VỰC, mỗi sợi một tời riêng trên vành
    miệng, luồn qua chỗ thắt rồi xoè ra tới gian của nó. Vẫn nói đúng điều cũ
    — "từ mặt đất xuống thẳng chỗ này được, không phải đi qua gian khác" — mà
    lại nói thêm một điều bản trước không nói được: cả năm cùng chui qua MỘT
    cái cổ họng, nên năm cái gian ở dưới hiển nhiên nằm trong cùng một cái hố.
    Nét vắt qua cả bốn mốc tầng cũng chính là thứ khâu bốn tầng lại với nhau."""
    for n, wl in enumerate(WELLS):
        pts = resample(wobble(parse_poly(wl["d"]), 1.6, n * 3.1), 4.0)
        # Cáp: lõi đậm + hai sợi bện mảnh lệch sang hai bên. Ba nét chứ không
        # một, vì một nét đơn ở cỡ này đọc ra là vết xước.
        ink.poly(pts, P["well"]["shaft"], 1.1, 0.85)
        nm = normals(pts)
        for s in (-1, 1):
            ink.poly([(px + nx * 1.6 * s, py + ny * 1.6 * s)
                      for (px, py), (nx, ny) in zip(pts, nm)],
                     P["well"]["rope"], 0.5, 0.6)
        # Mấu bện: vạch ngắn cắt ngang cáp, cách đều — thứ làm nó ra DÂY.
        for i in range(0, len(pts), max(3, int(5 / DENSITY))):
            (px, py), (nx, ny) = pts[i], nm[i]
            ink.line(px - nx * 2.4, py - ny * 2.4, px + nx * 2.4, py + ny * 2.4,
                     P["well"]["rope"], 0.45, 0.7, 0.1)
        # Tời trên vành miệng: giá chữ A + ròng rọc có nan.
        hx = wl["x"]
        hy = horizon(hx) if hx < v.left(v.mouth_y) or hx > v.right(v.mouth_y) else v.mouth_y + 6
        ink.poly([(hx - 15, hy), (hx, hy - 28), (hx + 15, hy)], P["well"]["head"], 1.5, 0.9)
        ink.line(hx - 10, hy - 10, hx + 10, hy - 10, P["well"]["head"], 1.1, 0.85, 0.2)
        ink.poly(rough_ring(hx, hy - 28, 6.5, 0.5, 20, n), P["well"]["head"], 1.2, 0.9, close=True)
        for k in range(8):
            a = math.pi * k / 8
            ink.line(hx - math.cos(a) * 5.5, hy - 28 - math.sin(a) * 5.5,
                     hx + math.cos(a) * 5.5, hy - 28 + math.sin(a) * 5.5,
                     P["well"]["head"], 0.45, 0.7, 0.1)
        hatch_rect(ink, hx - 18, hy - 30, hx + 18, hy, P["ink"]["mid"], angle=62,
                   spacing=3.0, w=0.38, op=0.26, length=7)


def draw_nuoc(ink, v: Vuc):
    """NƯỚC — MỘT dòng, từ miệng xuống hồ, không đứt một đoạn nào.

    Đây là sợi dọc của cả bức. Thuỷ văn karst cho sẵn lý lẽ: một cái vực đá vôi
    là do nước khoét ra, nên nước là thứ DUY NHẤT có mặt ở mọi tầng, và vẽ nó
    liền một mạch là nói "tất cả chỗ này là việc của cùng một dòng nước".

    Vẽ thành một BÓ nét dọc lệch nhau + bụi nước ở chỗ đập vào đá, chứ không
    phải một dải xanh: ở đây sắc độ vẫn là mật độ nét."""
    # Dòng chảy LÁCH QUA bên trái chỗ thắt: ở độ sâu 450 lòng vực chỉ còn
    # x ∈ [473, 887] và M4 chắn gần hết (532…828), nên nước phải chui qua khe
    # 59 đơn vị còn lại. Đó không phải chuyện kỹ thuật vặt — chính chỗ nước
    # phải lách mới là chỗ nói cái vực thắt lại ở đây.
    spine = [(508, v.mouth_y - 6), (512, 200), (508, 280), (500, 350),
             (494, 410), (496, 452), (502, 500), (530, 560), (576, 630),
             (612, 690), (640, 742), (656, 772)]
    base = resample(wobble(spine, 1.3, 7.7), 3.0)
    ink.layer("nuoc")
    nm = normals(base)
    # Bó nét: rộng dần theo độ sâu (nước thu thêm nước ở mỗi tầng).
    for o in range(-5, 6):
        pts = []
        for ((px, py), (nx, ny)) in zip(base, nm):
            k = 1.9 + 2.6 * max(0.0, (py - v.mouth_y) / 620)
            pts.append((px + nx * o * k, py + ny * o * k))
        ink.poly(pts, P["light"]["halo"] if abs(o) < 2 else P["light"]["glow"],
                 1.2 if o == 0 else 0.6, 0.85 - abs(o) * 0.12)
    # Bụi nước ở ba chỗ đập: vành miệng, bể của M4, mặt hồ.
    for cx_, cy_, r in ((508, 284, 24), (498, 452, 30), (652, 764, 56)):
        for i in range(int(r * 1.6 * DENSITY)):
            a = rnd(i * 1.7, cx_) * math.pi * 2
            rr = r * math.sqrt(rnd(i * 2.9, cy_))
            ink.stroke(dot(cx_ + math.cos(a) * rr, cy_ + math.sin(a) * rr * 0.62),
                       P["light"]["halo"], 1.0, 0.45)
        for k in range(4):
            ink.poly(rough_ring(cx_, cy_, r * (0.5 + k * 0.2), 2.0 + k, 28, k + cx_ * 0.01),
                     P["light"]["glow"], 0.5, 0.4 - k * 0.07, close=True)


def draw_tia_sang(ink, v: Vuc):
    """NÊM SÁNG — một trục duy nhất từ mặt trời, qua miệng, hẹp dần theo độ sâu.

    Làm bằng nét thưa dần, KHÔNG bằng mảng sáng hay gradient: thợ khắc đồng tạo
    quầng sáng bằng cách BỚT NÉT, và cả script này không sinh một `<gradient>`
    nào. Một trục duy nhất cắt qua cả bốn tầng là một vật thể hình học duy nhất
    trải dài cả bức — nên nó đọc ra là MỘT bầu không khí, không phải đèn bàn
    thắp riêng cho từng gian."""
    sx, sy = SUN["cx"], SUN["cy"]
    ink.layer("tia-sang")
    for i in range(int(66 * DENSITY)):
        t = i / (66 * DENSITY)
        y1 = v.mouth_y + 60 + t * 520
        # Nêm hẹp dần: mép sáng bám theo chính vách vực, nên ánh sáng "chui
        # lọt" đúng chỗ cái hố cho nó lọt.
        a = lerp(v.left(min(y1, v.bottom_y)), v.cx, min(1.0, t * 0.9))
        b = lerp(v.right(min(y1, v.bottom_y)), v.cx, min(1.0, t * 0.9))
        x1 = lerp(a, b, rnd(i * 1.3, 2.7))
        op = 0.42 * (1 - t) ** 1.6 + 0.05
        ink.line(sx + (x1 - sx) * 0.06, sy + (y1 - sy) * 0.06, x1, y1,
                 P["light"]["ray"], 0.55, op, 0.9)
    # Bụi lơ lửng trong luồng sáng — chấm thưa dần theo độ sâu.
    stipple_rect(ink, v.cx - 400, v.mouth_y, v.cx + 400, v.mouth_y + 480,
                 P["light"]["halo"], 520, op=0.45, size=0.85,
                 tone=lambda px, py: max(0.0, 0.9 - (py - v.mouth_y) / 460)
                 * (1 if v.inside(px, py) else 0.0))


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
# 9 · bộ máy chú giải: thang độ sâu hai lề, vạch tầng, đường dẫn, vòng soi
# ═══════════════════════════════════════════════════════════════════════

GAUGE_X = (46.0, W - 46.0)


def draw_gauge(ink, v: Vuc):
    """THANG ĐỘ SÂU CHẠY DỌC CẢ HAI LỀ, cộng vạch tầng cắt ngang cả bức.

    Đây là bộ máy chú giải của bản mặt cắt tham chiếu, và nó làm hai việc cùng
    lúc — việc thứ hai mới là việc quan trọng:

      1. nó nói "càng xuống càng sâu" mà không cần một con số nào (và script
         này KHÔNG BIẾT một con số nào về chiều sâu, nên số bịa còn tệ hơn);
      2. mỗi vạch tầng là một đường chạy TỪ LỀ TRÁI SANG LỀ PHẢI, cắt qua cả đá
         lẫn lòng vực. Quy ước mặt cắt địa chất: ranh giới vỉa vẽ hết bề rộng
         bản vẽ. Một đường đi xuyên qua phía sau một cái gian là bằng chứng
         hình học rằng cái gian ấy NẰM TRONG một thể liên tục — chứ không phải
         một cái hộp đặt cạnh những cái hộp khác.

    Không có số, không có chữ: xem `MAP_COPY` ở `world-map.ts`."""
    ink.layer("thang-do-sau")
    for gi, gx in enumerate(GAUGE_X):
        s = 1 if gi == 0 else -1
        ink.line(gx, 34, gx, H - 34, P["ink"]["mid"], 1.1, 0.75, 0.25)
        y = 34.0
        while y < H - 34:
            ink.line(gx, y, gx + s * 5, y, P["ink"]["soft"], 0.5, 0.55, 0.15)
            y += 11
        # Mũi tên xuống ở chân thang: chiều đọc của cả bức là chiều ấy.
        ink.poly([(gx - 6, H - 48), (gx, H - 34), (gx + 6, H - 48)],
                 P["ink"]["deep"], 1.2, 0.9, close=True)

    # Vạch tầng: nét đứt chạy hết bề rộng, cộng một vạch lớn ở hai đầu.
    for name, top, _bot in BANDS:
        pts = [(x, top(x)) for x in [GAUGE_X[0] + i * (GAUGE_X[1] - GAUGE_X[0]) / 80
                                     for i in range(81)]]
        ink.poly(pts, P["ink"]["mid"], 0.6, 0.55, dash="7 6")
        for gi, gx in enumerate(GAUGE_X):
            yy = top(gx)
            ink.line(gx - 9, yy, gx + 9, yy, P["ink"]["deep"], 1.3, 0.85, 0.15)
            ink.poly(rough_ring(gx, yy, 3.4, 0.3, 12, yy + gi), P["ink"]["deep"],
                     0.9, 0.85, close=True)


def draw_leaders(ink, v: Vuc):
    """ĐƯỜNG DẪN NÉT ĐỨT: từ thang độ sâu ở lề tới từng gian, và từ tấm nhãn
    (HTML, nằm trên tranh) tới gian của nó.

    Hai nhánh, hai việc khác nhau. Nhánh TỪ LỀ móc mỗi gian vào thang độ sâu —
    nhờ nó, tám cái tên không còn là tám nhãn rải trên hình mà là tám mốc trên
    cùng MỘT trục. Nhánh TỪ TẤM NHÃN móc chữ vào địa danh, nên nhãn không còn
    là một cái hộp dán lên tranh.

    Đường dẫn dừng lại TRƯỚC khi chạm gian (`- 26`), không cắm vào. Quy ước
    bản đồ hang: nét của phần nằm dưới phải dừng trước nét của phần nằm trên,
    để chỗ giao nhau đọc ra là CHE KHUẤT (interposition) — một trong những tín
    hiệu hình-nền mạnh nhất, và là thứ nói "hai cái này ở hai lớp sâu khác
    nhau của cùng một vật"."""
    for r in LAYOUT:
        k = r["key"]
        bx, by, bw, bh = BOX[k]
        rx0, rx1, floor, apex = noi_gian(v, k)
        tx, ty = (rx0 + rx1) / 2, (apex + floor) / 2
        # 1 · từ lề gần hơn.
        gx = GAUGE_X[0] if tx < W / 2 else GAUGE_X[1]
        s = 1 if gx < W / 2 else -1
        ink.layer("dan-" + k)
        ex = rx0 - 14 if s > 0 else rx1 + 14
        ink.line(gx + s * 7, ty, ex, ty, P["ink"]["mid"], 0.55, 0.45, 0.6, dash="5 5")
        ink.poly(rough_ring(gx + s * 7, ty, 3.0, 0.3, 12, ty), P["ink"]["mid"],
                 0.9, 0.7, close=True)
        ink.line(ex, ty - 5, ex, ty + 5, P["ink"]["deep"], 1.1, 0.8, 0.1)
        # 2 · từ tấm nhãn.
        px, py = PLATE[k]
        dx, dy = tx - px, ty - py
        L = math.hypot(dx, dy) or 1
        ex2, ey2 = px + dx / L * (L - min(L * 0.42, 70)), py + dy / L * (L - min(L * 0.42, 70))
        ink.line(px, py, ex2, ey2, P["ink"]["mid"], 0.6, 0.5, 0.8, dash="5 4")
        ink.poly(rough_ring(ex2, ey2, 4.2, 0.4, 14, L), P["ink"]["mid"], 0.8, 0.65, close=True)
        ink.poly(rough_ring(px, py, 2.4, 0.3, 10, L + 3), P["ink"]["mid"], 0.9, 0.7, close=True)


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

def draw_vuc(ink, v: Vuc, x0=0.0, x1=None):
    """VẼ MỘT CÁI VỰC. Thứ tự ở đây là thứ tự của chính bản vẽ: khối đá trước,
    rồi lòng nó, rồi những gì sống trong lòng nó.

    Hàm nhận `v` chứ không đọc biến toàn cục: ngày có vực thứ hai, `build_full`
    chỉ việc gọi hàm này thêm một lần với một `Vuc` khác — xem chú thích đầu
    tệp."""
    x1 = W if x1 is None else x1
    ink.layer("khoi-da")
    draw_rock_mass(ink, v, x0, x1)
    draw_vach_sau(ink, v)
    draw_vach(ink, v)
    ink.layer("muc-nuoc")
    draw_muc_nuoc(ink, v)
    ink.layer("mat-dat")
    draw_surface(ink, v, x0, x1)
    draw_tia_sang(ink, v)
    ink.layer("cap")
    draw_wells(ink, v)
    # Gian vẽ từ SÂU LÊN NÔNG: gian nông che gian sâu đúng như độ sâu thật.
    for key in ("M8", "M7", "M6", "M5", "M4", "M3", "M2", "M1"):
        draw_gian(ink, v, key)
    draw_nuoc(ink, v)
    draw_flows(ink)


def build_full() -> Ink:
    ink = Ink()
    ink.layer("giay")
    draw_paper(ink, 0, 0, W, H)
    ink.layer("troi")
    band_fill(ink, lambda x: -20, horizon, P["band"]["sky"])
    draw_sky(ink, 0, 0, W, 150)
    ink.layer("nui-xa")
    draw_far_ranges(ink, 0, W)
    ink.layer("may")
    draw_clouds(ink, 0, 0, W, 120)
    draw_vuc(ink, VUC)
    ink.layer("vong-soi")
    zoom_inset(ink, 150, 470, 56, "M1", 1)
    zoom_inset(ink, 1210, 470, 56, "M8", 2)
    ink.layer("chu-giai")
    draw_leaders(ink, VUC)
    draw_gauge(ink, VUC)
    draw_frame(ink)
    return ink


def build_scene(key: str) -> Ink:
    """Ô crop cho bản hẹp. Dựng LẠI nền cục bộ bằng chính các hàm của bản rộng
    (cùng nhiễu, cùng toạ độ) nên hai bản không thể lệch phong cách — nhưng mỗi
    tệp chỉ mang nét của riêng ô đó, nhờ vậy điện thoại không tải bản rộng.

    Và ô crop cắt ra từ CÙNG MỘT CÁI VỰC: `draw_rock_mass`/`draw_vach` vẽ trọn
    hình thái rồi `clip` mới cắt. Nhờ thế mép vách trong ô crop là mép thật của
    cái hố chứ không phải một hình vẽ lại cho riêng ô — tức bản hẹp cũng nói
    đúng cái điều bản rộng nói."""
    global DENSITY
    x, y, w, h = BOX[key]
    # Ô crop chỉ hiện ở bản HẸP, rộng tối đa 560 px — một phần ba cỡ bản rộng.
    # Giữ nguyên mật độ ở đó là trả tiền mạng cho những nét không ai phân biệt
    # được, nên hạ xuống: đúng cái luật "giảm mật độ ở vùng xa".
    DENSITY = 0.8
    ink = Ink()
    ink.clip_rect(x, y, w, h, "crop")
    ink.clip = "crop"
    v = VUC
    ink.layer("giay")
    draw_paper(ink, x, y, x + w, y + h)
    if y < horizon(x + w / 2):
        ink.layer("troi")
        band_fill(ink, lambda px: y - 20, horizon, P["band"]["sky"], x, x + w)
        draw_sky(ink, x, y, x + w, min(y + h, 150))
        ink.layer("nui-xa")
        draw_far_ranges(ink, x, x + w)
        ink.layer("may")
        draw_clouds(ink, x, y, x + w, min(y + h, 130))
    ink.layer("khoi-da")
    draw_rock_mass(ink, v, x - 40, x + w + 40)
    draw_vach_sau(ink, v)
    draw_vach(ink, v)
    ink.layer("muc-nuoc")
    draw_muc_nuoc(ink, v)
    if y < horizon(x + w / 2) < y + h:
        ink.layer("mat-dat")
        draw_surface(ink, v, max(0.0, x - 30), min(W, x + w + 30))
    draw_tia_sang(ink, v)
    DENSITY = 1.3          # gian là thứ người xem nhìn vào, giữ chi tiết hơn nền
    draw_gian(ink, v, key)
    if key in ("M4", "M8"):
        draw_nuoc(ink, v)
    DENSITY = 1.7
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
