#!/usr/bin/env python3
"""RASTER HOÁ tiền cảnh bàn quan trắc rồi ĐO — và trước hết, để NHÌN nó.

    py -I scripts/room/raster_room.py --png a.png            # XEM bức tranh
    py -I scripts/room/raster_room.py --png a.png --buoc 1    # đúng 1360 × 360
    py -I scripts/room/raster_room.py --lop tho-go,nen-ban    # chỉ vài lớp
    py -I scripts/room/raster_room.py --json so-do.json       # số đo cho ca test
    py -I scripts/room/raster_room.py --out DIR               # đo thư mục khác

**ĐỔI BẤT CỨ THỨ GÌ TRONG HỒ SƠ THÌ XUẤT PNG VÀ MỞ RA NHÌN, ĐỪNG CHỈ ĐỌC BẢNG.**

── VÌ SAO TỆP NÀY TỒN TẠI ───────────────────────────────────────────────────

`build_room.py --do` đo bằng MÔ HÌNH: `nen_rgb` dựng lại màu từ chính các hàm
mà các lớp dùng. Một phép đo dựng lại từ hàm KHÔNG phải một phép đo bức tranh:
nó không biết `<path>` ghi ra có khép lại không, không biết `fill-rule` có XOR
mất bậc trong cùng không, không biết lớp nào nằm trên lớp nào trong tệp. Ở bản
đồ sao cả ba thứ ấy đã sai CÙNG LÚC và không một ca nào bắt được — vì mọi ca
đều đọc mô hình. Lúc đó mô hình nói bậc giữa 47,3 % còn tranh thật đo ra 4,3 %.

Và cái đắt hơn mọi con số: năm vòng đánh giá liên tiếp không ai NHÌN bức tranh.
Lần đầu nó được xuất ra PNG và mở lên, có BỐN khuyết tật mà không một con số
nào trong bảng bắt được — mười mảng tối hình bao lồi khoét thủng tinh vân, chín
tia bụi là chín vạch kẻ thẳng, tám tấm nền nhãn là tám vệt bôi đen, lõi mặt
trời là một đa giác méo.

PHẦN RASTER MƯỢN `scripts/star/raster.py` (`Khung`, `ve`, `ghi_png`) — ba thứ
đó không biết gì về bản đồ sao, chúng chỉ biết tập con SVG mà cả hai bộ sinh
dùng. Mượn chứ không chép, vì một bộ raster tồn tại ở hai bản là hai bản sẽ
lệch, và lúc ấy không bản nào còn là cái thước. `scripts/star/**` chỉ được ĐỌC.

NỀN KIỂM: phía trên mép bàn tiền cảnh KHÔNG vẽ gì (chỗ ấy để tấm trời lọt
qua), nên khung được tô sẵn `checkSky` trước khi vẽ. Không có bước ấy thì nửa
trên PNG là đen tuyệt đối và không ai thấy được cái mép bàn CẮT vào đâu — tức
mất đúng thứ thứ tư trong bốn thứ bức này tồn tại để có.

CHỮ: `raster.ve` không biết thẻ `<text>`, nên lớp `chu` (chú giải khắc trên thẻ
đồng) từng VÔ HÌNH trong mọi lượt nhìn — và một dòng trong bốn dòng đã nằm hẳn
ngoài tấm thẻ suốt thời gian ấy, với một bảng tương phản đạt 5,03 : 1. Mục 0b
đổi mỗi chữ cái thành một KHUNG CHỮ NHẬT trước khi raster. Thô, và nói rõ nó
thô: đây không phải một bộ font, nó chỉ trả lời ba câu mà phép đo tương phản
không hỏi được — chữ có TRÀN khỏi vật mang nó không, có ĐÈ lên vật khác không,
các dòng có CHỒNG nhau không.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

GOC = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(GOC / "scripts" / "room"))
sys.path.insert(0, str(GOC / "scripts" / "star"))

import build_room as br                                        # noqa: E402
import raster                                                   # noqa: E402
from raster import Khung, ghi_png, hex_rgb, ve                  # noqa: E402

MAC_DINH = GOC / "frontend" / "public" / "map" / "room"


# ═══════════════════════════════════════════════════════════════════════
# 0 · NẮN LẠI MỘT CHỖ CỦA CÁI THƯỚC — chiều quay của nét dày
# ═══════════════════════════════════════════════════════════════════════
#
# `raster.net_thanh_hinh` đổi một nét dày thành danh sách đa giác: mỗi ĐOẠN
# thành một hình chữ nhật, mỗi MỐI NỐI và ĐẦU NÉT thành một đa giác tròn. Rồi
# `Khung.to` gom crossing của cả danh sách và tô theo `nonzero`.
#
# Chỗ cong: hình chữ nhật dựng theo thứ tự (a+n, b+n, b−n, a−n) nên chiều quay
# của nó phụ thuộc HƯỚNG ĐOẠN, còn `da_giac_tron` luôn quay một chiều cố định.
# Hai chiều ngược nhau thì `nonzero` TRỪ chúng cho nhau — và phần chồng nhau
# (tức đúng chỗ mối nối) ra số vòng 0, tức KHÔNG ĐƯỢC TÔ.
#
# Đo được bằng một nét thẳng dày 20 px với bốn mối nối. Lát cắt ngang giữa nét:
#
#     ##########..........#####################........#.........##########…
#
# Mười điểm ảnh TRỐNG ở mỗi mối nối, trên một nét liền.
#
# Vì sao nó đáng mười lăm dòng chú thích: lượt nhìn đầu tiên của bức này cho ra
# một lớp lót thủng lỗ chỗ hình thạch nhũ, và nếu tin vào nó thì bản sửa sẽ là
# dựng lại cả lớp lót — chữa một khuyết tật KHÔNG CÓ trong tệp SVG, rồi làm
# hỏng một lớp đang đúng. Trình duyệt vẽ nét dày theo đúng hình nét, không theo
# phép cộng vòng này.
#
# `scripts/star/**` chỉ được ĐỌC, nên không sửa tệp ấy: bọc hàm lúc chạy, và
# chỉ ép MỘT thứ — mọi đa giác cùng một chiều quay.


def _thuan(poly):
    """Ép đa giác về chiều quay DƯƠNG (diện tích có dấu > 0)."""
    s = 0.0
    n = len(poly)
    for i in range(n):
        x0, y0 = poly[i]
        x1, y1 = poly[(i + 1) % n]
        s += x0 * y1 - x1 * y0
    return poly if s >= 0 else poly[::-1]


_GOC_NET = raster.net_thanh_hinh


def _net_thanh_hinh(subs, w, cap):
    return [_thuan(p) for p in _GOC_NET(subs, w, cap)]


raster.net_thanh_hinh = _net_thanh_hinh


# ═══════════════════════════════════════════════════════════════════════
# 0b · CHỮ → NÉT, vì `raster.ve` không biết thẻ `<text>`
# ═══════════════════════════════════════════════════════════════════════
#
# `raster._THE` chỉ bắt `path|g|circle|/g`. Bầu trời không có một chữ nào nên
# ở đó không ai thấy thiếu; bức này có CHÚ GIẢI KHẮC trên thẻ đồng, tức đúng
# thứ MANG TIN của bức — và nó chưa từng lọt vào một lượt NHÌN nào. Nó chỉ
# được canh bằng `do_tuong_phan_chu`, một phép đo dựng lại nền từ hàm: cùng
# loại thước đã nói 47,3 % trong khi tranh thật là 4,3 %.
#
# Phép đo ấy KHÔNG trả lời được ba câu mà chỉ mắt trả lời được: chữ có TRÀN
# khỏi tấm thẻ không, có ĐÈ lên đinh tán / mép vát không, và bốn dòng có
# chồng lên nhau không. Cả ba đều là lỗi hình học, và cả ba đều lọt qua một
# phép đo tương phản đạt 5,03 : 1.
#
# KHÔNG dựng một bộ font: mỗi chữ cái thành một KHUNG CHỮ NHẬT rỗng, nét dày
# bằng thân chữ serif (≈ 0,09 em). Thô, và nói rõ nó thô — nhưng một khung
# đúng chỗ, đúng cỡ, đúng bề rộng dòng trả lời đủ ba câu trên, và nó TÔ CÙNG
# MỘT MÃ MÀU với chữ thật nên vùng ảnh quanh nó vẫn đọc được bằng mắt.
#
# Chiều rộng mỗi chữ lấy ĐÚNG công thức `do_tuong_phan_chu` dùng (0,52 em +
# tracking): hai ước lượng bề rộng là hai con số sẽ lệch, và lệch ở đây nghĩa
# là cái khung vẽ ra một chỗ còn phép đo đọc một chỗ khác.

_THE_CHU = re.compile(r'<g ([^>]*font-family[^>]*)>([\s\S]*?)</g>')
_MOT_CHU = re.compile(r'<text x="(-?[\d.]+)" y="(-?[\d.]+)">([^<]*)</text>')


def _attr(s: str, ten: str, mac_dinh=None):
    m = re.search(r'%s="([^"]*)"' % ten, s)
    return m.group(1) if m else mac_dinh


def chu_thanh_net(svg: str) -> str:
    """Thay mỗi `<g font-…>…</g>` bằng một `<path>` khung chữ — xem chú thích."""
    def thay(m):
        a, than = m.group(1), m.group(2)
        mau = _attr(a, "fill", "#FFFFFF")
        size = float(_attr(a, "font-size", "12"))
        track = float(_attr(a, "letter-spacing", "0"))
        op = _attr(a, "fill-opacity")
        d = []
        for g in _MOT_CHU.finditer(than):
            x, y = float(g.group(1)), float(g.group(2))
            for ch in g.group(3):
                buoc = size * 0.52 + track
                if not ch.isspace():
                    x0, x1 = x + size * 0.06, x + buoc - size * 0.06
                    y0, y1 = y - size * 0.70, y
                    d.append("M%.1f %.1fh%.1fv%.1fh%.1fZ"
                             % (x0, y0, x1 - x0, y1 - y0, x0 - x1))
                x += buoc
        if not d:
            return ""
        return ('<path fill="none" stroke="%s" stroke-width="%.2f"%s d="%s"/>'
                % (mau, size * 0.09,
                   '' if op is None else ' stroke-opacity="%s"' % op, "".join(d)))

    return _THE_CHU.sub(thay, svg)


def loc_lop(svg: str, giu: set[str]) -> str:
    """Giữ lại một TẬP CON lớp. Dùng để trả lời "cái lỗ kia nằm ở lớp nào" —
    ở bản đồ sao đúng một lượt như thế đã chứng minh mười mảng tối thuộc tấm
    trời chứ không thuộc tấm chòm."""
    ra = []
    for i, khoi in enumerate(svg.split('<g data-lop="')):
        if i == 0:
            ra.append(khoi)
            continue
        ten = khoi.split('"', 1)[0]
        if ten in giu:
            ra.append('<g data-lop="' + khoi)
        elif "</svg>" in khoi:
            ra.append("</svg>")
    return "".join(ra)


def do_raster(out_dir: Path, buoc: int = 2, png: Path | None = None,
              lop: str | None = None, P=None):
    tep = out_dir / "room-ban.svg"
    if not tep.exists():
        raise SystemExit("chưa có %s — chạy `py scripts/room/build_room.py` trước" % tep)
    P = P or br.grab("ROOM_PROFILE_DARK")
    kh = Khung(br.W, br.H, buoc)
    # TÔ NỀN TRỜI trước: xem chú thích "NỀN KIỂM" ở đầu tệp.
    troi = hex_rgb(P["checkSky"])
    for i in range(len(kh.R)):
        kh.R[i], kh.G[i], kh.B[i] = troi
    # LUÔN đi qua một tệp tạm, kể cả khi không lọc lớp: `chu_thanh_net` phải
    # chạy TRƯỚC `ve`, không thì lớp `chu` (chú giải khắc) vô hình trong mọi
    # lượt nhìn — xem chú thích mục 0b.
    s = tep.read_text(encoding="utf-8")
    if lop:
        s = loc_lop(s, set(lop.split(",")))
    tam = out_dir / "_raster.svg"
    tam.write_text(chu_thanh_net(s), encoding="utf-8")
    try:
        ve(tam, kh)
    finally:
        tam.unlink(missing_ok=True)
    if png:
        w, h = ghi_png(kh, png)
        print("  đã ghi %s (%d × %d px)" % (png, w, h))

    # Chỉ đo phần MẶT BÀN: phía trên mép là nền trời tô sẵn, đếm nó vào là
    # đếm một thứ bức này không vẽ.
    Ls, tren = [], 0
    for j in range(kh.ny):
        y = (j + 0.5) * buoc
        for i in range(kh.nx):
            x = (i + 0.5) * buoc
            if y < br.mep_y(x):
                tren += 1
                continue
            lin = []
            for v in (kh.R[j * kh.nx + i], kh.G[j * kh.nx + i], kh.B[j * kh.nx + i]):
                c = min(max(v, 0.0), 255.0) / 255.0
                lin.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
            Ls.append(0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2])
    Ls.sort()
    o = len(Ls)
    moc = br.BUDGET["bands"]
    dem = [0] * (len(moc) + 1)
    for L in Ls:
        k = 0
        while k < len(moc) and L > moc[k]:
            k += 1
        dem[k] += 1
    lo, hi = br.BUDGET["midLo"], br.BUDGET["midHi"]
    return {
        "buoc": buoc,
        "o": o,
        "tren_mep": tren,
        "bac": [c / o for c in dem],
        "mid": sum(1 for L in Ls if lo < L <= hi) / o,
        "trung_vi": Ls[o // 2],
        "p99": Ls[int(o * 0.99)],
        "sang": sum(1 for L in Ls if L > 0.5) / o,
    }


def main():
    ap = argparse.ArgumentParser(description="Raster hoá và đo tiền cảnh bàn quan trắc")
    ap.add_argument("--out", default=None, help="thư mục SVG (mặc định public/map/room)")
    ap.add_argument("--buoc", type=int, default=2, help="bước lấy mẫu px (1 = đầy đủ)")
    ap.add_argument("--png", default=None, help="ghi khung ra PNG — XEM, đừng chỉ đo")
    ap.add_argument("--lop", default=None, help="chỉ vẽ các lớp này (phân cách bằng dấu phẩy)")
    ap.add_argument("--json", default=None, help="ghi số đo ra tệp JSON")
    ap.add_argument("--khong-mo-hinh", action="store_true", help="bỏ cột mô hình")
    args = ap.parse_args()

    out_dir = Path(args.out) if args.out else MAC_DINH
    P = br.grab("ROOM_PROFILE_DARK")
    r = do_raster(out_dir, args.buoc, Path(args.png) if args.png else None, args.lop, P)
    m = None if args.khong_mo_hinh or args.lop else br.do_ngan_sach(P)

    ten = ["đen sâu  < 0,01", "nền     0,01–0,03", "0,03–0,08", "0,08–0,18",
           "0,18–0,35", "0,35–0,60", "0,60–0,85", "rực     > 0,85"]
    print()
    print("  bậc độ chói trên MẶT BÀN      raster   mô hình")
    for i, t in enumerate(ten):
        print("  %-22s %7.2f%%  %7s" % (
            t, r["bac"][i] * 100, "—" if m is None else "%.2f%%" % (m["bac"][i] * 100)))
    print("  %-22s %7.2f%%  %7s" % ("BẬC GIỮA 0,03–0,85", r["mid"] * 100,
                                     "—" if m is None else "%.2f%%" % (m["mid"] * 100)))
    print("  %-22s %7.4f   %7s" % ("trung vị", r["trung_vi"],
                                    "—" if m is None else "%.4f" % m["trung_vi"]))
    print("  %-22s %7.4f   %7s" % ("phân vị 99", r["p99"],
                                    "—" if m is None else "%.4f" % m["p99"]))
    print("  %-22s %7.3f%%  %7s" % ("diện tích L>0,5", r["sang"] * 100,
                                     "—" if m is None else "%.3f%%" % (m["sang"] * 100)))
    print("  (%d mẫu trên bàn, %d mẫu trên mép — phần trời, không đếm)"
          % (r["o"], r["tren_mep"]))
    print()
    if m is not None:
        # KHOẢNG LỆCH mô hình ‖ raster là con số đáng đọc nhất của cả bảng: nó
        # không nói bức tranh đẹp hay xấu, nó nói hai cái thước có đang đo
        # cùng một bức hay không. Ở bản đồ sao khoảng lệch ấy từng là MƯỜI LẦN.
        print("  lệch bậc giữa mô hình ‖ raster  %+.2f điểm phần trăm"
              % ((m["mid"] - r["mid"]) * 100))
        print()
    if args.json:
        Path(args.json).write_text(json.dumps(r, indent=2), encoding="utf-8")
        print("  đã ghi số đo ra %s" % args.json)


if __name__ == "__main__":
    main()
