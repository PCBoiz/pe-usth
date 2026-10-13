#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Dựng sổ tay PDF cho giáo trình "Advanced Python" (pe-v4).

Vì sao có file này: đội làm motion-graphic/visualization ở ngoài không đọc được
JSON studio-lesson/v1 và không có repo. Họ cần MỘT tài liệu in được, mỗi bài một
trang, mã bài nhìn là biết, kèm khối "kịch bản minh hoạ" nói rõ animation phải
thể hiện cái gì. File này chỉ RENDER lại JSON đã build — không tự nghĩ thêm nội
dung bài học, vì tài liệu sai lệch so với bài trong Studio thì còn tệ hơn không có.

Cách dùng:
    py -m pip install reportlab          # lần đầu
    py scripts/pe-v4/handbook.py         # -> scripts/pe-v4/out/python-advanced-handbook.pdf

Vài ràng buộc cố ý:
  - Đọc được bài nào dựng bài đó. Các bài còn đang được agent khác build (G01-G06,
    R02, X02 ở thời điểm viết) sẽ bị bỏ qua, in cảnh báo, và lần chạy sau tự có —
    không cần sửa file này.
  - Output tất định: ngày build là hằng số BUILD_DATE (hoặc --date), canvas bật
    invariant nên không nhét timestamp vào byte PDF. Chạy hai lần ra file y hệt.
  - Font Unicode bắt buộc: reportlab mặc định dùng Helvetica latin-1, tiếng Việt
    sẽ ra ô vuông/mất dấu. Xem _register_fonts.
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import sys
from dataclasses import dataclass, field

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "out")
# PNG của hình minh hoạ, do node scripts/pe-v4/anim/shot.mjs chụp từ SVG.
FIGURE_DIR = os.path.join(OUT_DIR, "figures")
DEFAULT_PDF = os.path.join(OUT_DIR, "python-advanced-handbook.pdf")

# Ngày build in trên bìa. Hằng số, không dùng datetime.now() — xem docstring.
BUILD_DATE = "13/10/2026"

# 48 mã bài của giáo trình. Dùng để biết bài nào CHƯA được build chứ không phải
# để sinh nội dung: thiếu thì báo thiếu, tuyệt đối không bịa bài.
EXPECTED_CODES = [
    "P01", "P02", "P03", "P04", "P05", "P06", "P07",
    "T01", "T02", "T03", "T04", "T05", "T06",
    "G01", "G02", "G03", "G04", "G05", "G06",
    "R02",
    "X01", "X02", "X03", "X04", "X05",
    "N01", "N02", "N03", "N04", "N05", "N06",
    "PD01", "PD02", "PD03", "PD04", "PD05", "PD06", "PD07", "PD08", "PD09",
    "M01", "M02", "M03", "M04", "M05", "M06",
    "DA01", "DA02",
]

PAGE_W, PAGE_H = A4
MARGIN_X = 18 * mm
MARGIN_TOP = 20 * mm
MARGIN_BOTTOM = 16 * mm
FRAME_W = PAGE_W - 2 * MARGIN_X

INK = colors.HexColor("#101418")
MUTED = colors.HexColor("#5b6670")
ACCENT = colors.HexColor("#0b5fa5")
WARN = colors.HexColor("#9a3412")
RULE = colors.HexColor("#c9d2da")
CODE_BG = colors.HexColor("#f4f6f8")
VIZ_BG = colors.HexColor("#eef4fb")


# --------------------------------------------------------------------------- font


# Chuỗi dò glyph: gom các ký tự tiếng Việt khó, gồm cả tổ hợp nguyên âm có mũ/móc
# mang dấu thanh. Phải dò thật vì font "có tiếng Việt" không có nghĩa là đủ:
# DejaVuSansMono thiếu ủ, ầ, ệ… nên "của"/"Lần" trong khối code bị in thành ô vuông
# mà lớp text của PDF vẫn đúng chữ — lỗi chỉ thấy khi nhìn trang in.
VIET_PROBE = (
    "ăâđêôơưĂÂĐÊÔƠƯ"
    "áàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹ"
)
# Ký hiệu dùng ở phần chữ thường: dấu chấm giữa, mũi tên, sao ưu tiên, dấu tích.
SANS_PROBE = VIET_PROBE + "·→★✔–—“”…"
MONO_PROBE = VIET_PROBE + "→"
# Ký hiệu đánh dấu chỗ dòng code bị bọc. Consolas không có ↵ nên phải chọn theo
# glyph font thật sự dùng, nếu không chính dấu hiệu "dòng còn tiếp" lại thành ô vuông.
WRAP_MARK_CANDIDATES = ["↵", "»", "…", "\\"]
WRAP_MARK = "\\"
GLYPH_PROBE = SANS_PROBE


def _coverage_gap(path: str, probe: str = GLYPH_PROBE) -> str:
    """Trả về các ký tự trong probe mà font KHÔNG có glyph (rỗng = đủ)."""
    from reportlab.pdfbase.ttfonts import TTFontFile

    face = TTFontFile(path)
    table = getattr(face, "charToGlyph", {}) or {}
    return "".join(ch for ch in probe if table.get(ord(ch), 0) == 0)


def _font_dirs():
    """Thư mục chứa font ứng viên: DejaVu đi kèm matplotlib, rồi tới font hệ thống."""
    dirs = [os.path.join(HERE, ".venv", "Lib", "site-packages", "matplotlib", "mpl-data", "fonts", "ttf")]
    try:  # matplotlib cài ở interpreter đang chạy thì lấy luôn thư mục của nó
        import matplotlib  # noqa: F401  (chỉ dùng để tìm font, không vẽ gì)

        dirs.append(os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data", "fonts", "ttf"))
    except Exception:
        pass
    dirs.append(os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts"))
    dirs += ["/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/truetype/msttcorefonts", HERE]
    return dirs


# Mỗi ứng viên: (regular, bold, italic). Chọn theo độ phủ glyph, không theo thứ tự cứng.
SANS_CANDIDATES = [
    ("DejaVuSans.ttf", "DejaVuSans-Bold.ttf", "DejaVuSans-Oblique.ttf"),
    ("arial.ttf", "arialbd.ttf", "ariali.ttf"),
    ("segoeui.ttf", "segoeuib.ttf", "segoeuii.ttf"),
]
MONO_CANDIDATES = [
    ("consola.ttf", "consolab.ttf"),           # Consolas phủ đủ tiếng Việt
    ("DejaVuSansMono.ttf", "DejaVuSansMono-Bold.ttf"),  # thiếu vài glyph, chỉ dùng khi hết cách
    ("cour.ttf", "courbd.ttf"),
    ("LiberationMono-Regular.ttf", "LiberationMono-Bold.ttf"),
]


def _pick(candidates, dirs, probe=GLYPH_PROBE):
    """Chọn bộ font đầu tiên vừa có đủ file vừa đủ glyph; không bộ nào đủ thì lấy bộ thiếu ít nhất."""
    best = None
    for names in candidates:
        for d in dirs:
            paths = [os.path.join(d, n) for n in names]
            if not all(os.path.exists(p) for p in paths):
                continue
            gap = _coverage_gap(paths[0], probe)
            if not gap:
                return paths, ""
            if best is None or len(gap) < len(best[1]):
                best = (paths, gap)
            break
    return best if best else (None, probe)


def _register_fonts():
    """Nạp font sans + mono Unicode, chọn theo độ phủ glyph tiếng Việt.

    Cố ý KHÔNG fallback về Helvetica: PDF vẫn dựng xong nhưng tiếng Việt mất dấu,
    và lỗi đó chỉ lộ ra khi tài liệu đã tới tay đội thiết kế.
    """
    dirs = _font_dirs()
    sans, sans_gap = _pick(SANS_CANDIDATES, dirs, SANS_PROBE)
    mono, mono_gap = _pick(MONO_CANDIDATES, dirs, MONO_PROBE)
    if not sans or not mono:
        raise SystemExit(
            "Không tìm thấy font TTF Unicode (DejaVuSans / arial.ttf cho chữ thường, "
            "consola.ttf / DejaVuSansMono.ttf cho code). Cài matplotlib trong scripts/pe-v4/.venv "
            "hoặc copy font vào cạnh file này."
        )
    for name, path in zip(("HBSans", "HBSans-Bold", "HBSans-Italic"), sans):
        pdfmetrics.registerFont(TTFont(name, path))
    for name, path in zip(("HBMono", "HBMono-Bold"), mono):
        pdfmetrics.registerFont(TTFont(name, path))
    pdfmetrics.registerFontFamily(
        "HBSans", normal="HBSans", bold="HBSans-Bold", italic="HBSans-Italic", boldItalic="HBSans-Bold"
    )
    pdfmetrics.registerFontFamily("HBMono", normal="HBMono", bold="HBMono-Bold")
    global WRAP_MARK
    for mark in WRAP_MARK_CANDIDATES:
        if not _coverage_gap(mono[0], mark):
            WRAP_MARK = mark
            break
    for label, gap in (("chữ thường", sans_gap), ("code", mono_gap)):
        if gap:
            print("  CẢNH BÁO: font %s thiếu glyph %r — các ký tự này sẽ in ra ô vuông." % (label, gap))
    return "%s + %s" % (os.path.basename(sans[0]), os.path.basename(mono[0]))


# ------------------------------------------------------------------------- styles

CODE_FONT_SIZE = 7.2
CODE_LEADING = 8.7


def make_styles():
    s = {}
    s["cover_kicker"] = ParagraphStyle(
        "cover_kicker", fontName="HBSans-Bold", fontSize=10, leading=14, textColor=ACCENT,
        alignment=TA_CENTER, spaceAfter=4,
    )
    s["cover_title"] = ParagraphStyle(
        "cover_title", fontName="HBSans-Bold", fontSize=27, leading=33, textColor=INK,
        alignment=TA_CENTER, spaceAfter=8,
    )
    s["cover_sub"] = ParagraphStyle(
        "cover_sub", fontName="HBSans", fontSize=12, leading=18, textColor=MUTED,
        alignment=TA_CENTER, spaceAfter=14,
    )
    s["cover_note"] = ParagraphStyle(
        "cover_note", fontName="HBSans", fontSize=9.5, leading=14.5, textColor=INK, alignment=TA_LEFT,
    )
    s["h1"] = ParagraphStyle(
        "h1", fontName="HBSans-Bold", fontSize=17, leading=21, textColor=ACCENT, spaceBefore=2, spaceAfter=10,
    )
    s["lesson_title"] = ParagraphStyle(
        "lesson_title", fontName="HBSans-Bold", fontSize=14, leading=18, textColor=INK, spaceAfter=2,
    )
    s["meta"] = ParagraphStyle(
        "meta", fontName="HBSans", fontSize=8, leading=11, textColor=MUTED, spaceAfter=7,
    )
    s["label"] = ParagraphStyle(
        "label", fontName="HBSans-Bold", fontSize=7.6, leading=10, textColor=ACCENT,
        spaceBefore=7, spaceAfter=2.5,
    )
    s["label_warn"] = ParagraphStyle(
        "label_warn", parent=s["label"], textColor=WARN,
    )
    s["body"] = ParagraphStyle(
        "body", fontName="HBSans", fontSize=8.6, leading=12.2, textColor=INK, spaceAfter=3,
    )
    s["bullet"] = ParagraphStyle(
        "bullet", parent=s["body"], leftIndent=9, bulletIndent=1, spaceAfter=2.2,
    )
    s["small"] = ParagraphStyle(
        "small", fontName="HBSans", fontSize=7.4, leading=10.2, textColor=MUTED, spaceAfter=2,
    )
    s["cell"] = ParagraphStyle("cell", fontName="HBSans", fontSize=7.6, leading=10.4, textColor=INK)
    s["cell_bold"] = ParagraphStyle("cell_bold", parent=s["cell"], fontName="HBSans-Bold")
    s["cell_mono"] = ParagraphStyle("cell_mono", fontName="HBMono", fontSize=7.0, leading=9.8, textColor=INK)
    s["code"] = ParagraphStyle(
        "code", fontName="HBMono", fontSize=CODE_FONT_SIZE, leading=CODE_LEADING, textColor=INK,
        backColor=CODE_BG, borderPadding=(4, 5, 4, 5), spaceBefore=1, spaceAfter=4,
    )
    s["toc1"] = ParagraphStyle(
        "toc1", fontName="HBSans-Bold", fontSize=9.4, leading=14, textColor=ACCENT, spaceBefore=6,
    )
    s["toc2"] = ParagraphStyle(
        "toc2", fontName="HBSans", fontSize=8.4, leading=11.6, textColor=INK, leftIndent=12,
    )
    return s


# ------------------------------------------------------------------ helpers chung


def esc(text) -> str:
    """Escape cho Paragraph. & < > là ký tự thường gặp trong code/kết quả Python."""
    if text is None:
        return ""
    t = str(text)
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def wrap_code(source: str, width_pt: float, font_size: float = CODE_FONT_SIZE) -> str:
    """Bọc dòng code dài lại cho vừa khung.

    Preformatted KHÔNG tự wrap: dòng dài hơn frame bị cắt mất ở mép phải và người
    đọc không biết là đã mất chữ. Nên tự cắt theo số ký tự vừa khung (mono nên
    mọi ký tự cùng bề rộng), ưu tiên cắt ở khoảng trắng, và thụt lề dòng tiếp
    theo cho thấy rõ là một dòng bị gãy.
    """
    char_w = pdfmetrics.stringWidth("M", "HBMono", font_size)
    limit = max(24, int(width_pt / char_w))
    out = []
    for raw in (source or "").replace("\t", "    ").split("\n"):
        line = raw.rstrip()
        if len(line) <= limit:
            out.append(line)
            continue
        indent = " " * (len(line) - len(line.lstrip(" ")) + 4)
        first = True
        while line:
            # trừ 2 chỗ cho " <dấu nối>" ở cuối, nếu không dòng bọc lại dài hơn khung.
            room = (limit if first else limit - len(indent)) - 2
            room = max(16, room)
            if len(line) <= room:
                out.append(line if first else indent + line)
                break
            cut = line.rfind(" ", 0, room)
            if cut < room // 3:  # không có chỗ ngắt tử tế → cắt cứng
                cut = room
            chunk, line = line[:cut].rstrip(), line[cut:].lstrip()
            out.append((chunk if first else indent + chunk) + " " + WRAP_MARK)
            first = False
    return "\n".join(out)


def code_block(styles, source: str, avail: float = None) -> Preformatted:
    avail = avail or (FRAME_W - 12)
    return Preformatted(wrap_code(source, avail), styles["code"])


def kv_table(styles, rows, widths, header=None):
    data = []
    if header:
        data.append([Paragraph("<b>%s</b>" % esc(h), styles["cell_bold"]) for h in header])
    data.extend(rows)
    t = Table(data, colWidths=widths, hAlign="LEFT")
    style = [
        ("GRID", (0, 0), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
    ]
    if header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e7edf3")))
    t.setStyle(TableStyle(style))
    return t


# ------------------------------------------------------------------- đọc dữ liệu


@dataclass
class Lesson:
    code: str
    sort_order: int
    module: str
    title: str
    minutes: int
    xp: int
    content: dict
    path: str

    @property
    def s1(self) -> dict:
        return self.content.get("step_1") or {}

    @property
    def s2(self) -> dict:
        return self.content.get("step_2") or {}

    @property
    def s3(self) -> dict:
        return self.content.get("step_3") or {}

    @property
    def s4(self) -> dict:
        return self.content.get("step_4") or {}

    @property
    def trace_steps(self) -> list:
        return ((self.s3.get("trace") or {}).get("steps")) or []

    @property
    def scaffold(self) -> dict:
        return self.s3.get("scaffold") or {}

    @property
    def level(self) -> str:
        return (self.s1.get("context") or {}).get("level") or ""


@dataclass
class Module:
    title: str
    lessons: list = field(default_factory=list)


def load_lessons(out_dir: str):
    lessons = {}
    for path in sorted(glob.glob(os.path.join(out_dir, "lessons", "*.json"))):
        with open(path, encoding="utf-8") as fh:
            raw = json.load(fh)
        content = raw.get("content_json") or {}
        if content.get("schema") != "studio-lesson/v1":
            print("  cảnh báo: %s không phải studio-lesson/v1, bỏ qua" % os.path.basename(path))
            continue
        code = raw.get("lesson_code") or ""
        lessons[code] = Lesson(
            code=code,
            sort_order=raw.get("sort_order") or 0,
            module=raw.get("module") or "Chưa gán module",
            title=raw.get("title") or content.get("title") or code,
            minutes=raw.get("estimated_minutes") or 0,
            xp=raw.get("xp_reward") or 0,
            content=content,
            path=path,
        )
    return lessons


def load_curriculum(out_dir: str):
    """Thứ tự module lấy từ curriculum JSON (file nào mới nhất theo tên)."""
    files = sorted(glob.glob(os.path.join(out_dir, "curriculum-python-advanced*.json")))
    if not files:
        return {}, []
    with open(files[-1], encoding="utf-8") as fh:
        data = json.load(fh)
    order = [m.get("title") for m in data.get("modules", []) if m.get("title")]
    return data, order


def group_modules(lessons: dict, order: list):
    """Nhóm bài theo module, theo thứ tự curriculum; module lạ xếp sau theo sort_order.

    Curriculum và bài được build bởi các script khác nhau nên có lúc lệch nhau
    (M3 GUI chưa có trong curriculum lúc viết file này). Lệch thì vẫn phải in ra
    hết bài, không được rơi bài nào.
    """
    by_module = {}
    for ls in lessons.values():
        by_module.setdefault(ls.module, []).append(ls)
    mods = []
    for title in order:
        if title in by_module:
            mods.append(Module(title, sorted(by_module.pop(title), key=lambda x: x.sort_order)))
    for title in sorted(by_module, key=lambda t: min(x.sort_order for x in by_module[t])):
        mods.append(Module(title, sorted(by_module[title], key=lambda x: x.sort_order)))
    return mods


# ------------------------------------------------- kịch bản minh hoạ (viz brief)


def viz_shots(ls: Lesson):
    """Rút các "khung" animation từ chính dữ liệu bài — không thêm ý tưởng ngoài JSON.

    Nguồn duy nhất: trace steps (chuỗi trạng thái trước/sau), misconception (khung
    đối chiếu sai/đúng), scaffold (các slot và bẫy), io của bài tập (đầu vào →
    đầu ra kỳ vọng). Bài không có gì thì trả list rỗng để trang bài nói thẳng là
    chưa có dữ liệu, thay vì bịa một cảnh quay.
    """
    shots = []
    trace = ls.trace_steps
    for i, st in enumerate(trace, 1):
        shots.append(("Khung %d — %s" % (i, st.get("label") or "bước %d" % i), st.get("text") or ""))
    mis = ls.s1.get("misconception") or {}
    if mis.get("body"):
        shots.append(
            ("Khung đối chiếu — ngộ nhận %s" % (mis.get("title") or ""),
             "Chia đôi màn hình: bên sai làm theo ngộ nhận, bên đúng theo giải thích. " + mis["body"]),
        )
    sc = ls.scaffold
    if sc.get("slots"):
        traps = [b.get("label") for b in (sc.get("bank") or []) if b.get("trap")]
        shots.append(
            ("Khung lắp mảnh — %d slot" % len(sc["slots"]),
             "Thả từng mảnh vào chỗ trống trong template; mảnh bẫy phải diễn cảnh hỏng: %s"
             % (", ".join(traps) if traps else "chưa khai báo bẫy")),
        )
    io = (ls.s4.get("task") or {}).get("io") or []
    if io:
        shots.append(
            ("Khung kết quả — %d cặp vào/ra" % len(io),
             "; ".join("%s → %s" % (x.get("label"), x.get("value")) for x in io)),
        )
    return shots


def viz_idea(ls: Lesson) -> str:
    """Một dòng ý tưởng animation, suy ra máy móc từ dữ liệu. Không có dữ liệu → nói không có."""
    trace = ls.trace_steps
    if len(trace) >= 2:
        first = (trace[0].get("text") or "").strip()
        last = (trace[-1].get("text") or "").strip()
        return "Chuỗi %d khung theo bảng trace: %s … %s" % (len(trace), first, last)
    if trace:
        return "Một khung theo bảng trace: %s" % (trace[0].get("text") or "").strip()
    sc = ls.scaffold
    if sc.get("slots"):
        return "Lắp %d mảnh vào template, mỗi mảnh bẫy diễn một cảnh hỏng" % len(sc["slots"])
    mis = ls.s1.get("misconception") or {}
    if mis.get("title"):
        return "Đối chiếu sai/đúng quanh ngộ nhận %s" % mis["title"]
    return "Không có dữ liệu flow/trace/scaffold trong JSON — chưa rút được ý tưởng nào"


def priority_tier(ls: Lesson) -> int:
    """Mức ưu tiên dựng animation, suy ra từ lượng dữ liệu có sẵn.

    Đo thực tế trên bản build 48 bài: MỌI bài đều có trace từ 4 bước, nên nếu chỉ
    lấy tiêu chí "có trace nhiều bước" thì cả 48 bài đều ưu tiên và đội thiết kế
    không biết bắt đầu từ đâu. Nên chia hai mức: mức 2 là bài vừa có chuỗi dài
    (>=5 bước) vừa có scaffold để dựng cảnh lắp mảnh; mức 1 là bài có chuỗi >=3
    bước; mức 0 là bài không có chuỗi.
    """
    n = len(ls.trace_steps)
    if n >= 5 and ls.scaffold.get("slots"):
        return 2
    if n >= 3:
        return 1
    return 0


PRIORITY_LABEL = {
    2: "ƯU TIÊN CAO",
    1: "ƯU TIÊN",
    0: "chưa đủ dữ liệu để ưu tiên",
}


# -------------------------------------------------------------------- flowables


def figure_flowables(figure: dict, styles, avail):
    """Ảnh PNG của hình + chú thích. Thiếu PNG thì GHI LÀ THIẾU, không bỏ im lặng.

    Vì sao in từ PNG chứ không từ SVG: reportlab không vẽ được SVG có animation CSS.
    PNG do `node scripts/pe-v4/anim/shot.mjs` chụp bằng Chromium ở chế độ
    prefers-reduced-motion, tức đúng khung hình "trạng thái hoàn chỉnh" của hình.
    """
    name = figure.get("name") or os.path.basename(figure.get("src") or "").removesuffix(".svg")
    png = os.path.join(FIGURE_DIR, "%s.png" % name) if name else ""
    f = []
    if png and os.path.exists(png):
        # Hình vẽ theo khổ 1280x640 (tỉ lệ 2:1) — giữ nguyên tỉ lệ, rộng hết khung.
        f.append(Image(png, width=avail, height=avail / 2))
    else:
        f.append(
            Paragraph(
                "[Chưa có ảnh %s.png — chạy <font face=\"HBMono\" size=\"7\">node "
                "scripts/pe-v4/anim/shot.mjs</font> sau khi hình SVG được vẽ xong.]"
                % esc(name or "(không rõ tên)"),
                styles["small"],
            )
        )
    caption = figure.get("caption") or ""
    alt = figure.get("alt") or ""
    if caption:
        f.append(Paragraph("<b>Hình %s.</b> %s" % (esc(name), esc(caption)), styles["small"]))
    if alt:
        f.append(Paragraph("Mô tả hình: %s" % esc(alt), styles["small"]))
    return f


def theory_flowables(ls: Lesson, styles, avail):
    """Khối LÝ THUYẾT của bài (step_1.theory) + hình + dòng nguồn slide.

    Bài M4–M8 không khai `theory` nên hàm trả [] và trang bài giữ nguyên như trước.
    """
    blocks = ls.s1.get("theory") or []
    figure = ls.s1.get("figure") or {}
    if not blocks and not figure:
        return []

    f = [Paragraph("LÝ THUYẾT", styles["label"])]
    shown = False
    for block in blocks:
        f.append(Paragraph("<b>%s</b>" % esc(block.get("title")), styles["body"]))
        if block.get("body"):
            f.append(Paragraph(esc(block["body"]), styles["body"]))
        for bullet in block.get("bullets") or []:
            f.append(Paragraph("• %s" % esc(bullet), styles["bullet"], bulletText=""))
        if block.get("figure"):
            f.extend(figure_flowables({**block["figure"], "name": figure.get("name")}, styles, avail))
            shown = True
    if figure and not shown:
        f.extend(figure_flowables(figure, styles, avail))

    # Dòng nguồn in NGUYÊN VĂN chuỗi `slides`: nó có thể là nhiều khoảng trang rời
    # ("SL 95-105, 133") hoặc kèm tài liệu chính thức ("SL 51-53; DOC subprocess").
    # Tách/chuẩn hoá ở đây là bịa ra một bản đồ trang mà ta không suy ra được.
    slides = (ls.content.get("source") or {}).get("slides")
    if slides:
        f.append(Paragraph("Nguồn lý thuyết: %s (xem chú giải ở bìa)" % esc(slides), styles["small"]))
    return f


def lesson_flowables(ls: Lesson, styles, doc):
    f = []
    avail = FRAME_W

    f.append(Paragraph(esc(ls.title), styles["lesson_title"]))
    meta = " · ".join(
        x for x in [
            "Mã bài: %s" % ls.code,
            ls.level,
            ls.module,
            "%d phút" % ls.minutes if ls.minutes else "",
            "%d XP" % ls.xp if ls.xp else "",
            "thứ tự %d" % ls.sort_order,
        ] if x
    )
    f.append(Paragraph(esc(meta), styles["meta"]))

    brief = ls.s1.get("brief") or {}
    ctx = ls.s1.get("context") or {}

    # Mục tiêu + tiên quyết: hai thứ đội thiết kế cần để biết bài nằm ở đâu trong lộ trình.
    if brief.get("goal") or ctx.get("title"):
        f.append(Paragraph("MỤC TIÊU", styles["label"]))
        f.append(Paragraph(esc(brief.get("goal") or ctx.get("title")), styles["body"]))
    f.append(Paragraph("CẦN NHỚ TRƯỚC", styles["label"]))
    f.append(
        Paragraph(
            esc(ctx.get("prereq")) if ctx.get("prereq") else "JSON không ghi bài tiên quyết cho bài này.",
            styles["body"],
        )
    )

    if ctx.get("body"):
        f.append(Paragraph("BỐI CẢNH", styles["label"]))
        f.append(Paragraph(esc(ctx["body"]), styles["body"]))
    if ctx.get("example"):
        f.append(Paragraph("VÍ DỤ MINH HOẠ", styles["label"]))
        f.append(Paragraph(esc(ctx["example"]), styles["body"]))

    f.extend(theory_flowables(ls, styles, avail))

    explain = ls.s1.get("explain") or []
    if explain:
        f.append(Paragraph("ĐIỂM KIẾN THỨC", styles["label"]))
        for item in explain:
            f.append(
                Paragraph(
                    "%s. %s" % (item.get("n", "•"), esc(item.get("body"))),
                    styles["bullet"],
                    bulletText="",
                )
            )

    code = ls.s1.get("code") or {}
    if code.get("source"):
        f.append(
            Paragraph(
                "MẪU CODE · %s · %s · %s"
                % (esc(code.get("filename") or "vi_du.py"), esc(code.get("version") or ""), esc(code.get("kind") or "")),
                styles["label"],
            )
        )
        f.append(code_block(styles, code["source"], avail - 12))
        tests = brief.get("tests") or []
        if tests:
            f.append(
                Paragraph("Kết quả dự kiến (theo JSON): %s" % esc("; ".join(tests)), styles["small"])
            )
        else:
            f.append(Paragraph("JSON không kèm kết quả dự kiến cho đoạn này.", styles["small"]))

    mis = ls.s1.get("misconception") or {}
    if mis.get("body"):
        f.append(Paragraph("NGỘ NHẬN THƯỜNG GẶP: %s" % esc(mis.get("title") or ""), styles["label_warn"]))
        f.append(Paragraph(esc(mis["body"]), styles["body"]))

    pred = ls.s1.get("predict") or {}
    if pred.get("question"):
        f.append(Paragraph("CÂU DỰ ĐOÁN", styles["label"]))
        f.append(Paragraph(esc(pred["question"]), styles["body"]))
        if pred.get("code"):
            f.append(code_block(styles, pred["code"], avail - 12))
        rows = []
        for opt in pred.get("options") or []:
            mark = "ĐÚNG" if opt.get("correct") else "sai"
            rows.append([
                Paragraph(esc(mark), styles["cell_bold"] if opt.get("correct") else styles["cell"]),
                Paragraph(esc(opt.get("title")), styles["cell"]),
                Paragraph(esc(opt.get("detail")), styles["cell"]),
            ])
        if rows:
            f.append(kv_table(styles, rows, [0.08 * avail, 0.36 * avail, 0.56 * avail]))

    mcqs = ls.s2.get("mcq") or []
    if mcqs:
        f.append(Paragraph("TỰ KIỂM TRA", styles["label"]))
        for i, q in enumerate(mcqs, 1):
            f.append(Paragraph("%d. %s" % (i, esc(q.get("question"))), styles["body"]))
            opts = q.get("options") or []
            for j, opt in enumerate(opts):
                correct = opt.get("correct") or j == q.get("correct")
                f.append(
                    Paragraph(
                        "%s %s%s"
                        % (
                            "\u2714" if correct else "\u2022",
                            esc(opt.get("text") or opt.get("title")),
                            " — %s" % esc(opt.get("detail")) if opt.get("detail") else "",
                        ),
                        styles["bullet"],
                    )
                )
            if q.get("explanation"):
                f.append(Paragraph("Đáp án: %s" % esc(q["explanation"]), styles["small"]))

    se = ls.s2.get("selfExplain") or {}
    if se.get("prompt"):
        f.append(Paragraph("TỰ GIẢI THÍCH", styles["label"]))
        f.append(Paragraph(esc(se["prompt"]), styles["body"]))
        if se.get("sample"):
            f.append(Paragraph("Mẫu trả lời: %s" % esc(se["sample"]), styles["small"]))

    if ls.trace_steps:
        f.append(Paragraph("BẢNG TRACE (trạng thái trước → sau)", styles["label"]))
        rows = [
            [Paragraph(esc(st.get("label")), styles["cell_bold"]), Paragraph(esc(st.get("text")), styles["cell"])]
            for st in ls.trace_steps
        ]
        f.append(kv_table(styles, rows, [0.18 * avail, 0.82 * avail], header=["Bước", "Trạng thái"]))

    counter = ls.s3.get("counter") or {}
    if counter.get("question"):
        f.append(Paragraph("CÂU PHẢN VÍ DỤ", styles["label"]))
        f.append(Paragraph(esc(counter["question"]), styles["body"]))
        opts = counter.get("options") or []
        f.append(
            Paragraph(
                "Lựa chọn: %s · Đáp án: %s" % (esc(" | ".join(map(str, opts))), esc(counter.get("correct"))),
                styles["small"],
            )
        )

    sc = ls.scaffold
    if sc.get("template"):
        f.append(Paragraph("TEMPLATE LẮP MẢNH", styles["label"]))
        f.append(code_block(styles, sc["template"], avail - 12))
        rows = []
        for slot in sc.get("slots") or []:
            rows.append([
                Paragraph(esc(slot.get("placeholder") or "slot %s" % slot.get("n")), styles["cell_bold"]),
                Paragraph(esc(slot.get("answer")), styles["cell_mono"]),
            ])
        if rows:
            f.append(kv_table(styles, rows, [0.22 * avail, 0.78 * avail], header=["Slot", "Mảnh đúng"]))
        traps = [b for b in (sc.get("bank") or []) if b.get("trap")]
        if traps:
            rows = [
                [Paragraph(esc(b.get("label")), styles["cell_mono"]), Paragraph(esc(b.get("trap")), styles["cell"])]
                for b in traps
            ]
            f.append(kv_table(styles, rows, [0.32 * avail, 0.68 * avail], header=["Mảnh bẫy", "Vì sao sai"]))

    task3 = ls.s3.get("task") or {}
    if task3.get("body"):
        f.append(Paragraph("LUYỆN CÓ HỖ TRỢ · %s" % esc(task3.get("title") or ""), styles["label"]))
        f.append(Paragraph(esc(task3["body"]), styles["body"]))
        if task3.get("rule"):
            f.append(Paragraph("Yêu cầu thêm: %s" % esc(task3["rule"]), styles["small"]))

    task4 = ls.s4.get("task") or {}
    if task4.get("body"):
        f.append(Paragraph("BÀI TẬP ĐỘC LẬP · %s" % esc(task4.get("title") or ""), styles["label"]))
        for para in str(task4["body"]).split("\n\n"):
            if para.strip():
                f.append(Paragraph(esc(para.strip()), styles["body"]))
        io = task4.get("io") or []
        if io:
            rows = [
                [Paragraph(esc(x.get("label")), styles["cell_mono"]), Paragraph(esc(x.get("value")), styles["cell_mono"])]
                for x in io
            ]
            f.append(kv_table(styles, rows, [0.58 * avail, 0.42 * avail], header=["Gọi", "Kết quả mong đợi"]))

    contracts = ls.s4.get("contracts") or []
    if contracts:
        f.append(Paragraph("HỢP ĐỒNG HÀM", styles["label"]))
        rows = []
        for c in contracts:
            rows.append([
                Paragraph(esc(c.get("sig") or c.get("call")), styles["cell_mono"]),
                Paragraph(
                    esc(" · ".join(x for x in [c.get("does"), c.get("takes"), c.get("gives"), c.get("effect")] if x)),
                    styles["cell"],
                ),
            ])
        f.append(kv_table(styles, rows, [0.38 * avail, 0.62 * avail], header=["Chữ ký", "Nhận / trả / tác dụng"]))

    tests = ls.s4.get("tests") or []
    if tests:
        f.append(Paragraph("BỘ CHẤM (%d ca)" % len(tests), styles["label"]))
        rows = [
            [
                Paragraph(esc(t.get("name")), styles["cell"]),
                Paragraph(esc(t.get("call")), styles["cell_mono"]),
                Paragraph(esc(t.get("expect")), styles["cell_mono"]),
            ]
            for t in tests
        ]
        f.append(kv_table(styles, rows, [0.3 * avail, 0.44 * avail, 0.26 * avail], header=["Ca", "Gọi", "Mong đợi"]))

    env_bits = []
    if ls.s4.get("env"):
        env_bits.append(str(ls.s4["env"]))
    if ls.s4.get("packages"):
        env_bits.append("Thư viện: %s." % ", ".join(ls.s4["packages"]))
    files = ls.s4.get("files") or []
    if files:
        env_bits.append("File kèm bài: %s." % ", ".join("%s (%s)" % (x.get("name"), x.get("kind")) for x in files))
    if ls.s4.get("gate"):
        env_bits.append("Bài có cửa tự kiểm tra (gate): lời giải mẫu chỉ mở sau khi hoàn thành.")
    if env_bits:
        f.append(Paragraph("MÔI TRƯỜNG CHẠY", styles["label"]))
        f.append(Paragraph(esc(" ".join(env_bits)), styles["small"]))

    # --- khối quan trọng nhất với đội thiết kế: kịch bản minh hoạ ---
    shots = viz_shots(ls)
    tier = priority_tier(ls)
    head = "KỊCH BẢN MINH HOẠ — %s (trace %d bước%s)" % (
        PRIORITY_LABEL[tier],
        len(ls.trace_steps),
        ", có scaffold %d slot" % len(ls.scaffold["slots"]) if ls.scaffold.get("slots") else "",
    )
    inner = [Paragraph(esc(head), styles["cell_bold"])]
    if shots:
        for title, text in shots:
            inner.append(Paragraph("<b>%s.</b> %s" % (esc(title), esc(text)), styles["cell"]))
    else:
        inner.append(
            Paragraph(
                "Bài này không có trace/scaffold/io trong JSON — chưa có dữ liệu để dựng kịch bản. "
                "Không tự nghĩ thêm; chờ bản build sau.",
                styles["cell"],
            )
        )
    box = Table([[inner]], colWidths=[avail], hAlign="LEFT")
    box.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), VIZ_BG),
            ("BOX", (0, 0), (-1, -1), 0.6, ACCENT),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    f.append(Spacer(1, 5))
    f.append(box)

    src = ls.content.get("source") or {}
    f.append(
        Paragraph(
            "Nguồn: %s · %s · parser %s · file build %s"
            % (
                esc(src.get("kind") or "pe-v4"),
                esc(src.get("filename") or ""),
                esc(src.get("parser") or ""),
                esc(os.path.basename(ls.path)),
            ),
            styles["small"],
        )
    )
    return f


def appendix_flowables(lessons: dict, styles):
    """Phụ lục: mỗi mã bài một dòng, kèm cờ dữ liệu và một dòng ý tưởng animation."""
    avail = FRAME_W
    head = Paragraph("Phụ lục · Bảng tra ứng viên animation", styles["h1"])
    # Gắn vào mục lục cấp 0 để header trang phụ lục không còn mang tên module cuối.
    head._toc_level, head._toc_text = 0, "Phụ lục · Bảng tra ứng viên animation"
    f = [head]
    f.append(
        Paragraph(
            "Cột “Dữ liệu” ghi bài có sẵn những gì để dựng hình: trace (chuỗi trạng thái), "
            "scaffold (template lắp mảnh), io (cặp vào/ra). Bài không có mục nào thì ghi rõ "
            "là chưa rút được ý tưởng — không bịa.",
            styles["body"],
        )
    )
    tiers = [priority_tier(l) for l in lessons.values()]
    f.append(
        Paragraph(
            "★★ = ưu tiên cao (trace từ 5 bước và có scaffold): %d bài. "
            "★ = ưu tiên (trace từ 3 bước): %d bài. Không dấu = chưa đủ dữ liệu: %d bài."
            % (tiers.count(2), tiers.count(1), tiers.count(0)),
            styles["body"],
        )
    )
    rows = []
    for code in EXPECTED_CODES:
        ls = lessons.get(code)
        if ls is None:
            rows.append([
                Paragraph(esc(code), styles["cell_bold"]),
                Paragraph("<i>chưa được build ở bản này</i>", styles["cell"]),
                Paragraph("—", styles["cell"]),
                Paragraph("Chưa có JSON để đọc.", styles["cell"]),
            ])
            continue
        flags = []
        if ls.trace_steps:
            flags.append("trace %d bước" % len(ls.trace_steps))
        if ls.scaffold.get("slots"):
            flags.append("scaffold %d slot" % len(ls.scaffold["slots"]))
        if (ls.s4.get("task") or {}).get("io"):
            flags.append("io %d cặp" % len((ls.s4["task"]).get("io")))
        stars = {2: " ★★", 1: " ★", 0: ""}[priority_tier(ls)]
        rows.append([
            Paragraph("<b>%s</b>%s" % (esc(code), stars), styles["cell_bold"]),
            # Tiêu đề bài đã mở đầu bằng chính mã bài ("P01 · …") — bỏ đi cho khỏi lặp cột Mã.
            Paragraph(esc(ls.title.split("·", 1)[-1].strip() if ls.title.startswith(code) else ls.title), styles["cell"]),
            Paragraph(esc(", ".join(flags) or "không có"), styles["cell"]),
            Paragraph(esc(viz_idea(ls)), styles["cell"]),
        ])
    f.append(
        kv_table(
            styles,
            rows,
            [0.08 * avail, 0.26 * avail, 0.18 * avail, 0.48 * avail],
            header=["Mã", "Tên bài", "Dữ liệu", "Ý tưởng animation (rút từ JSON)"],
        )
    )
    f.append(
        Paragraph(
            "Ý tưởng ở cột cuối được rút máy móc từ bước đầu và bước cuối của bảng trace trong "
            "JSON, không phải đề xuất sáng tạo — xem khối “kịch bản minh hoạ” ở trang của bài để "
            "có đủ các khung.",
            styles["small"],
        )
    )
    return f


# ----------------------------------------------------------------- doc template


class HandbookDoc(BaseDocTemplate):
    """Doc template có header/footer và nhớ mục lục qua afterFlowable + multiBuild."""

    def __init__(self, path, **kw):
        super().__init__(path, pagesize=A4, **kw)
        frame = Frame(
            MARGIN_X, MARGIN_BOTTOM, FRAME_W, PAGE_H - MARGIN_TOP - MARGIN_BOTTOM, id="body",
            leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        )
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[frame], onPage=self._cover_page),
            # Vẽ header/footer ở onPageEnd chứ không onPage: tên module chỉ được
            # afterFlowable ghi lại SAU khi tiêu đề module được vẽ, nên nếu vẽ
            # header lúc mở trang thì trang đầu mỗi module lại mang tên module trước.
            PageTemplate(id="body", frames=[frame], onPageEnd=self._body_page),
        ])
        self.section = ""
        self.build_date = BUILD_DATE

    # Header/footer: mã/module ở trên, số trang ở dưới — giống sổ tay tham chiếu.
    def _body_page(self, canv, doc):
        canv.saveState()
        canv.setFont("HBSans", 7)
        canv.setFillColor(MUTED)
        canv.drawString(MARGIN_X, PAGE_H - MARGIN_TOP + 7 * mm, "ADVANCED PYTHON / SỔ TAY NỘI DUNG")
        canv.drawRightString(PAGE_W - MARGIN_X, PAGE_H - MARGIN_TOP + 7 * mm, doc.section[:70])
        canv.setStrokeColor(RULE)
        canv.line(MARGIN_X, PAGE_H - MARGIN_TOP + 5 * mm, PAGE_W - MARGIN_X, PAGE_H - MARGIN_TOP + 5 * mm)
        canv.line(MARGIN_X, MARGIN_BOTTOM - 4 * mm, PAGE_W - MARGIN_X, MARGIN_BOTTOM - 4 * mm)
        canv.drawString(MARGIN_X, MARGIN_BOTTOM - 8 * mm, "Bản dựng %s · nguồn scripts/pe-v4/out" % doc.build_date)
        canv.drawRightString(PAGE_W - MARGIN_X, MARGIN_BOTTOM - 8 * mm, "trang %d" % doc.page)
        canv.restoreState()

    def _cover_page(self, canv, doc):
        canv.saveState()
        canv.setStrokeColor(ACCENT)
        canv.setLineWidth(2)
        canv.line(MARGIN_X, PAGE_H - MARGIN_TOP + 6 * mm, PAGE_W - MARGIN_X, PAGE_H - MARGIN_TOP + 6 * mm)
        canv.restoreState()

    def afterFlowable(self, flowable):
        """Ghi mục lục. Dùng thuộc tính _toc gắn tay để không bắt style theo tên."""
        level = getattr(flowable, "_toc_level", None)
        if level is None:
            return
        text = getattr(flowable, "_toc_text", "")
        key = getattr(flowable, "_toc_key", None)
        if level == 0:
            self.section = text
        self.notify("TOCEntry", (level, text, self.page, key))


def cover_flowables(styles, n_lessons, n_modules, missing, build_date):
    f = [Spacer(1, 38 * mm)]
    f.append(Paragraph("ADVANCED PYTHON · PE-V4", styles["cover_kicker"]))
    f.append(Paragraph("Sổ tay nội dung giáo trình", styles["cover_title"]))
    f.append(
        Paragraph(
            "%d bài · %d module · bản dựng %s" % (len(EXPECTED_CODES), n_modules, build_date),
            styles["cover_sub"],
        )
    )
    note = [
        "<b>Tài liệu này là brief nội dung cho việc thiết kế visualization / motion-graphic.</b> "
        "Mỗi bài có một khối “KỊCH BẢN MINH HOẠ” nói rõ animation cần thể hiện gì; "
        "phụ lục cuối sách là bảng tra toàn bộ mã bài kèm một dòng ý tưởng.",
        "Toàn bộ nội dung được render tự động từ JSON bài học đã build "
        "(<font face=\"HBMono\" size=\"8\">scripts/pe-v4/out/lessons/*.json</font>, schema "
        "<font face=\"HBMono\" size=\"8\">studio-lesson/v1</font>). Không có câu nào được viết thêm "
        "trong lúc dựng PDF: thiếu dữ liệu thì tài liệu ghi là thiếu.",
        "Mã bài (P01, T01, N01, PD01, M01, DA01…) là định danh duy nhất — dùng đúng mã khi đặt tên "
        "asset và khi trao đổi.",
        # Chú giải nguồn: bắt buộc, vì số trang trong dòng "Nguồn lý thuyết" là số thứ tự
        # trang trong TỆP slide đã gộp, không phải số in trên mặt slide. Deck không có lớp
        # text và các slide overlay dùng lại cùng một số in, nên không suy ra bản đồ nào khác.
        "<b>Chú giải nguồn lý thuyết.</b> "
        "<font face=\"HBMono\" size=\"8\">SL n</font> = trang thứ n trong tệp slide gốc đã gộp của "
        "giảng viên (1–56 Multi Processing · 57–107 Multithreading · 108–135 GUI Toolkit). "
        "Số in trên slide có thể khác vì một slide có nhiều lớp hiện dần. "
        "<font face=\"HBMono\" size=\"8\">DOC …</font> = tài liệu chính thức của Python.",
    ]
    if missing:
        note.append(
            "Bản dựng này có %d/%d bài. <b>Còn thiếu %d mã bài</b> (đang được build ở nhánh khác): %s. "
            "Chạy lại handbook.py khi các bài này có mặt."
            % (n_lessons, len(EXPECTED_CODES), len(missing), ", ".join(missing))
        )
    else:
        note.append("Bản dựng này có đủ %d/%d mã bài." % (n_lessons, len(EXPECTED_CODES)))
    for line in note:
        f.append(Paragraph(line, styles["cover_note"]))
        f.append(Spacer(1, 4))
    return f


def build(out_dir: str, pdf_path: str, build_date: str) -> dict:
    font_used = _register_fonts()
    styles = make_styles()

    lessons = load_lessons(out_dir)
    curriculum, order = load_curriculum(out_dir)
    modules = group_modules(lessons, order)
    missing = [c for c in EXPECTED_CODES if c not in lessons]
    extra = [c for c in sorted(lessons) if c not in EXPECTED_CODES]

    doc = HandbookDoc(
        pdf_path,
        leftMargin=MARGIN_X, rightMargin=MARGIN_X, topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOTTOM,
        title="Advanced Python · Sổ tay nội dung",
        author="pe_usth / scripts/pe-v4/handbook.py",
        subject="Brief nội dung cho thiết kế visualization",
        invariant=1,  # không nhét timestamp vào PDF -> chạy lại ra file y hệt
    )
    doc.build_date = build_date

    story = [NextPageTemplate("body")]
    story += cover_flowables(styles, len(lessons), len(modules), missing, build_date)
    story.append(PageBreak())

    # Trang điều kiện/kỹ năng lấy từ curriculum (nếu có) — giúp đội ngoài hiểu ngữ cảnh.
    if curriculum:
        story.append(Paragraph("Phạm vi và yêu cầu đầu vào", styles["h1"]))
        if curriculum.get("requirements"):
            story.append(Paragraph("YÊU CẦU ĐẦU VÀO", styles["label"]))
            for r in curriculum["requirements"]:
                story.append(Paragraph("• %s" % esc(r), styles["bullet"]))
        if curriculum.get("skills"):
            story.append(Paragraph("KỸ NĂNG ĐẦU RA", styles["label"]))
            for r in curriculum["skills"]:
                story.append(Paragraph("• %s" % esc(r), styles["bullet"]))
        story.append(Paragraph("CÁCH ĐỌC MỖI BÀI", styles["label"]))
        story.append(
            Paragraph(
                "Mỗi bài theo đúng thứ tự khối: mục tiêu → cần nhớ trước → bối cảnh → điểm kiến thức "
                "→ mẫu code và kết quả dự kiến → ngộ nhận → câu dự đoán và tự kiểm tra → bảng trace "
                "→ template lắp mảnh → bài tập và bộ chấm → môi trường chạy → kịch bản minh hoạ.",
                styles["body"],
            )
        )
        story.append(
            Paragraph(
                "Trong khối code, dấu <font face=\"HBMono\">%s</font> ở cuối dòng nghĩa là dòng gốc "
                "dài hơn khổ giấy nên bị bọc xuống dòng dưới — không phải ký tự của chương trình."
                % esc(WRAP_MARK),
                styles["small"],
            )
        )
        story.append(PageBreak())

    toc = TableOfContents()
    toc.levelStyles = [styles["toc1"], styles["toc2"]]
    story.append(Paragraph("Mục lục", styles["h1"]))
    story.append(Paragraph("Số trang là trang PDF. Mỗi bài bắt đầu ở một trang mới.", styles["small"]))
    story.append(Spacer(1, 4))
    story.append(toc)
    story.append(PageBreak())

    for mod in modules:
        head = Paragraph(esc(mod.title), styles["h1"])
        head._toc_level, head._toc_text = 0, mod.title
        story.append(head)
        story.append(
            Paragraph(
                "%d bài: %s" % (len(mod.lessons), ", ".join(l.code for l in mod.lessons)),
                styles["body"],
            )
        )
        hi = [l.code for l in mod.lessons if priority_tier(l) == 2]
        mid = [l.code for l in mod.lessons if priority_tier(l) == 1]
        story.append(
            Paragraph(
                "Ứng viên animation — ưu tiên cao (★★): %s · ưu tiên (★): %s"
                % (", ".join(hi) or "không có", ", ".join(mid) or "không có"),
                styles["small"],
            )
        )
        for ls in mod.lessons:
            story.append(PageBreak())
            entry = Paragraph(esc(ls.title), styles["lesson_title"])
            entry._toc_level, entry._toc_text = 1, ls.title
            flows = lesson_flowables(ls, styles, doc)
            flows[0] = entry  # tiêu đề bài vừa là mục lục cấp 2
            story.extend(flows)
        story.append(PageBreak())

    story.extend(appendix_flowables(lessons, styles))

    doc.multiBuild(story)

    size = os.path.getsize(pdf_path)
    return {
        "pdf": pdf_path,
        "font": font_used,
        "pages": doc.page,
        "bytes": size,
        "lessons": len(lessons),
        "modules": [(m.title, len(m.lessons)) for m in modules],
        "missing": missing,
        "extra": extra,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description="Dựng sổ tay PDF giáo trình Advanced Python (pe-v4)")
    ap.add_argument("--out-dir", default=OUT_DIR, help="thư mục out của pe-v4")
    ap.add_argument("--pdf", default=DEFAULT_PDF, help="đường dẫn PDF đích")
    ap.add_argument("--date", default=BUILD_DATE, help="ngày build in trên bìa (giữ cố định để output tất định)")
    args = ap.parse_args(argv)

    info = build(args.out_dir, args.pdf, args.date)
    print("Sổ tay: %s" % info["pdf"])
    print("  font Unicode: %s" % info["font"])
    print("  %d trang · %.1f KB" % (info["pages"], info["bytes"] / 1024))
    print("  %d bài trong %d module:" % (info["lessons"], len(info["modules"])))
    for title, n in info["modules"]:
        print("    - %s: %d bài" % (title, n))
    if info["missing"]:
        print("  CẢNH BÁO: thiếu %d/%d mã bài, chạy lại khi có: %s"
              % (len(info["missing"]), len(EXPECTED_CODES), ", ".join(info["missing"])))
    else:
        print("  đủ %d mã bài" % len(EXPECTED_CODES))
    if info["extra"]:
        print("  cảnh báo: có mã bài lạ ngoài danh sách 48: %s" % ", ".join(info["extra"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
