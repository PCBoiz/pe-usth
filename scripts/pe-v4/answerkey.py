#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Dựng BẢN ĐÁP ÁN PDF cho 20 bài ĐẦU của giáo trình "Python nâng cao" (pe-v4).

Vì sao có file này: buổi chạy thử với người học thật có giảng viên và cố vấn ngồi
kèm. Họ phải trả lời được "sai ở đâu" ngay tại chỗ, mà không thể tự giải lại 20 bài
trước mỗi buổi. Sổ tay (handbook.py) in ĐỀ nhưng cố tình không in đáp án vì nó được
gửi cho đội thiết kế ở ngoài; bản này in ĐÁP ÁN và vì vậy KHÔNG được phát cho học
viên — bìa nói thẳng điều đó.

Phạm vi: P01–P07, T01–T06, G01–G06, R02 (20 bài đầu). 28 bài còn lại (X, N, PD, M,
DA) CỐ Ý ngoài phạm vi — buổi chạy thử không dùng tới, in thêm chỉ làm tập giấy dày
lên và dễ phát nhầm.

Nguồn dữ liệu — tất cả đều đọc từ bản build, không câu nào gõ tay:
  * scripts/pe-v4/out/lessons/*.json        (studio-lesson/v1) đề bài, trắc nghiệm,
                                            giải thích, ngộ nhận, trace, scaffold, env
  * scripts/pe-v4/out/qa.json               lời giải mẫu, starter, các biến thể SAI
                                            cố ý (`bad`), bộ ca chấm
  * scripts/pe-v4/out-advanced/lessons/*.json (studio-lesson/v2) các mini-game `play`
Thiếu trường nào thì trang bài GHI LÀ THIẾU. Tài liệu đáp án mà bịa một dòng thôi là
giảng viên đọc sai cho học viên — tệ hơn nhiều so với một dòng "JSON không khai".

Cách dùng:
    py -m pip install reportlab               # lần đầu
    py scripts/pe-v4/answerkey.py             # -> out/python-advanced-answerkey.pdf
    py scripts/pe-v4/answerkey.py --only G04  # xem nhanh một bài (ra file riêng)

Tái dùng hạ tầng của handbook.py (import, không chép lại): cách dò font theo glyph
tiếng Việt, cách bọc dòng code cho khỏi tràn lề, và cờ invariant để chạy hai lần ra
file y hệt. Sửa cách chọn font thì sửa ở handbook.py, cả hai tài liệu cùng được.
"""

from __future__ import annotations

import argparse
import difflib
import glob
import json
import os
import re
import sys
from dataclasses import dataclass, field

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
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

import handbook as hb
from handbook import esc, kv_table, wrap_code

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "out")
ADV_DIR = os.path.join(HERE, "out-advanced")
DEFAULT_PDF = os.path.join(OUT_DIR, "python-advanced-answerkey.pdf")
# Bộ chấm chạy trong trình duyệt: lấy phần tài liệu API `_studio` từ chính file đó
# thay vì chép lại, vì ca chấm trong PDF có gọi `_studio.call(...)`.
HARNESS_PY = os.path.join(
    os.path.dirname(os.path.dirname(HERE)), "frontend", "public", "static", "js", "studio-harness.py"
)

# Ngày build in trên bìa. Hằng số như handbook.py — xem docstring (output tất định).
BUILD_DATE = "13/10/2026"

# 20 mã bài trong phạm vi, theo đúng thứ tự giáo trình. Dùng để BIẾT bài nào thiếu,
# không phải để sinh nội dung.
SCOPE_CODES = [
    "P01", "P02", "P03", "P04", "P05", "P06", "P07",
    "T01", "T02", "T03", "T04", "T05", "T06",
    "G01", "G02", "G03", "G04", "G05", "G06",
    "R02",
]
# 28 mã CỐ Ý ngoài phạm vi — in ở bìa để không ai tưởng là bị rơi bài.
OUT_OF_SCOPE = [c for c in hb.EXPECTED_CODES if c not in SCOPE_CODES]

PAGE_W, PAGE_H = A4
MARGIN_X = 16 * mm
MARGIN_TOP = 19 * mm
MARGIN_BOTTOM = 15 * mm
FRAME_W = PAGE_W - 2 * MARGIN_X

INK = colors.HexColor("#101418")
MUTED = colors.HexColor("#5b6670")
ACCENT = colors.HexColor("#0b5fa5")
WARN = colors.HexColor("#9a3412")
DANGER = colors.HexColor("#b91c1c")
OK = colors.HexColor("#15803d")
RULE = colors.HexColor("#c9d2da")
CODE_BG = colors.HexColor("#f4f6f8")
ANS_BG = colors.HexColor("#eef7ef")
SIM_BG = colors.HexColor("#fdf2e9")
DANGER_BG = colors.HexColor("#fdeaea")

CODE_FONT_SIZE = 7.0
CODE_LEADING = 8.4


# ------------------------------------------------------------------------- styles


def make_styles():
    """Style riêng của bản đáp án.

    Không dùng hb.make_styles(): sổ tay là tài liệu brief cho đội thiết kế, bản này
    là tài liệu tra cứu lúc đang kèm học viên — cần cỡ chữ nhỏ hơn, nhiều bảng hơn,
    và một bộ màu nói rõ "đáp án" (xanh) / "bẫy" (đỏ) / "mô phỏng" (cam).
    """
    s = {}
    s["cover_kicker"] = ParagraphStyle(
        "cover_kicker", fontName="HBSans-Bold", fontSize=10, leading=14, textColor=DANGER,
        alignment=TA_CENTER, spaceAfter=4,
    )
    s["cover_title"] = ParagraphStyle(
        "cover_title", fontName="HBSans-Bold", fontSize=26, leading=32, textColor=INK,
        alignment=TA_CENTER, spaceAfter=6,
    )
    s["cover_sub"] = ParagraphStyle(
        "cover_sub", fontName="HBSans", fontSize=11.5, leading=17, textColor=MUTED,
        alignment=TA_CENTER, spaceAfter=12,
    )
    s["cover_warn"] = ParagraphStyle(
        "cover_warn", fontName="HBSans-Bold", fontSize=13.5, leading=19, textColor=DANGER,
        alignment=TA_CENTER,
    )
    s["cover_note"] = ParagraphStyle(
        "cover_note", fontName="HBSans", fontSize=9.2, leading=14, textColor=INK, alignment=TA_LEFT,
    )
    s["h1"] = ParagraphStyle(
        "h1", fontName="HBSans-Bold", fontSize=16, leading=20, textColor=ACCENT, spaceBefore=2, spaceAfter=8,
    )
    s["lesson_title"] = ParagraphStyle(
        "lesson_title", fontName="HBSans-Bold", fontSize=13.5, leading=17, textColor=INK, spaceAfter=2,
    )
    s["meta"] = ParagraphStyle(
        "meta", fontName="HBSans", fontSize=7.6, leading=10.4, textColor=MUTED, spaceAfter=5,
    )
    s["label"] = ParagraphStyle(
        "label", fontName="HBSans-Bold", fontSize=7.8, leading=10.4, textColor=ACCENT,
        spaceBefore=6.5, spaceAfter=2.5,
    )
    s["label_ans"] = ParagraphStyle("label_ans", parent=s["label"], textColor=OK)
    s["label_warn"] = ParagraphStyle("label_warn", parent=s["label"], textColor=WARN)
    s["label_danger"] = ParagraphStyle("label_danger", parent=s["label"], textColor=DANGER)
    s["body"] = ParagraphStyle(
        "body", fontName="HBSans", fontSize=8.4, leading=11.8, textColor=INK, spaceAfter=3,
    )
    s["bullet"] = ParagraphStyle("bullet", parent=s["body"], leftIndent=9, spaceAfter=2)
    s["small"] = ParagraphStyle(
        "small", fontName="HBSans", fontSize=7.2, leading=10, textColor=MUTED, spaceAfter=2,
    )
    s["cell"] = ParagraphStyle("cell", fontName="HBSans", fontSize=7.3, leading=10, textColor=INK)
    s["cell_bold"] = ParagraphStyle("cell_bold", parent=s["cell"], fontName="HBSans-Bold")
    s["cell_ok"] = ParagraphStyle("cell_ok", parent=s["cell_bold"], textColor=OK)
    s["cell_bad"] = ParagraphStyle("cell_bad", parent=s["cell"], textColor=DANGER)
    s["cell_mono"] = ParagraphStyle("cell_mono", fontName="HBMono", fontSize=6.8, leading=9.4, textColor=INK)
    s["cell_mono_ok"] = ParagraphStyle("cell_mono_ok", parent=s["cell_mono"], fontName="HBMono-Bold", textColor=OK)
    s["code"] = ParagraphStyle(
        "code", fontName="HBMono", fontSize=CODE_FONT_SIZE, leading=CODE_LEADING, textColor=INK,
        backColor=CODE_BG, borderPadding=(4, 5, 4, 5), spaceBefore=1, spaceAfter=4,
    )
    # Code của LỜI GIẢI: nền xanh nhạt để lật trang là thấy ngay khối cần đọc.
    s["code_ans"] = ParagraphStyle("code_ans", parent=s["code"], backColor=ANS_BG)
    # Code trong ô bảng: không nền, không padding — nền/viền do bảng lo.
    s["code_cell"] = ParagraphStyle(
        "code_cell", fontName="HBMono", fontSize=6.6, leading=8.4, textColor=INK,
        backColor=None, borderPadding=0, spaceBefore=0, spaceAfter=0,
    )
    # Băng tiêu đề có nền màu. Vì sao không dùng Table một ô bọc cả khối: ô bảng
    # KHÔNG tách được qua trang, nên một khối dài (bộ ca chấm của R02, env của T05)
    # bị đẩy nguyên sang trang sau và để lại nửa trang trắng. Băng + flowable chảy
    # tự do vẫn phân biệt được khối bằng màu mà vẫn gói trang chặt.
    s["banner_ans"] = ParagraphStyle(
        "banner_ans", fontName="HBSans-Bold", fontSize=7.8, leading=10.4, textColor=OK,
        backColor=ANS_BG, borderColor=OK, borderWidth=0.6, borderPadding=(3, 4, 3, 4),
        spaceBefore=6.5, spaceAfter=3,
    )
    s["banner_danger"] = ParagraphStyle(
        "banner_danger", parent=s["banner_ans"], textColor=DANGER, backColor=DANGER_BG, borderColor=DANGER,
    )
    s["banner_sim"] = ParagraphStyle(
        "banner_sim", parent=s["banner_ans"], textColor=WARN, backColor=SIM_BG, borderColor=WARN,
    )
    s["banner_sub"] = ParagraphStyle(
        "banner_sub", fontName="HBSans-Bold", fontSize=7.4, leading=10, textColor=INK,
        backColor=CODE_BG, borderColor=RULE, borderWidth=0.5, borderPadding=(2.5, 4, 2.5, 4),
        spaceBefore=5, spaceAfter=2.5,
    )
    s["toc1"] = ParagraphStyle(
        "toc1", fontName="HBSans-Bold", fontSize=9.2, leading=13.6, textColor=ACCENT, spaceBefore=5,
    )
    s["toc2"] = ParagraphStyle("toc2", fontName="HBSans", fontSize=8.2, leading=11.4, textColor=INK, leftIndent=12)
    return s


# ------------------------------------------------------------------ helper chung


def letter(i: int) -> str:
    """A, B, C… — đúng cách Studio đánh nhãn lựa chọn (frontend letterKey)."""
    return chr(65 + i) if i >= 0 else "?"


def code_block(styles, source: str, avail: float = None, style="code") -> Preformatted:
    """Khối code đã bọc dòng cho vừa khung.

    wrap_code cắt CỨNG theo số ký tự vừa khung nên khối code không bao giờ tràn lề —
    đó là lý do mọi chỗ in code (kể cả ô trong bảng) đều đi qua hàm này chứ không
    dùng Paragraph: Paragraph không ngắt được một token dài không có khoảng trắng.
    """
    avail = avail or (FRAME_W - 12)
    size = styles[style].fontSize
    return Preformatted(wrap_code(source or "", avail, size), styles[style])


def section(styles, title: str, kind: str = "label"):
    return Paragraph(esc(title), styles[kind])


def banner(styles, text: str, kind: str = "banner_ans") -> Paragraph:
    """Băng tiêu đề nền màu, thay cho khung bọc cả khối — xem chú thích ở make_styles."""
    return Paragraph(esc(text), styles[kind])


def box(flows, avail, bg, border):
    t = Table([[flows]], colWidths=[avail], hAlign="LEFT")
    t.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("BOX", (0, 0), (-1, -1), 0.7, border),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    return t


def missing(styles, what: str) -> Paragraph:
    """Một dòng "JSON không có". Có hàm riêng để mọi chỗ thiếu nói cùng một giọng."""
    return Paragraph(
        "<i>JSON của bài không khai %s — chỗ này KHÔNG được suy diễn thêm.</i>" % esc(what),
        styles["small"],
    )


def mcq_correct_index(q: dict) -> int:
    """Chỉ số đáp án đúng. Theo đúng frontend correctIndex(): `correct` là số thì
    lấy số, không thì tìm option có cờ correct=True."""
    if isinstance(q.get("correct"), int):
        return q["correct"]
    for i, o in enumerate(q.get("options") or []):
        if isinstance(o, dict) and o.get("correct") is True:
            return i
    return -1


def option_text(o) -> str:
    return o if isinstance(o, str) else (o.get("text") or o.get("title") or "")


def option_detail(o) -> str:
    return "" if isinstance(o, str) else (o.get("detail") or "")


def diff_rows(good: str, bad: str):
    """Các dòng KHÁC nhau giữa lời giải mẫu và một biến thể sai.

    Vì sao cần: qa.json chỉ ghi nhãn của biến thể sai ("nhầm chiều pid ↔ ppid") và
    cả file code. Giảng viên cần biết CHÍNH dòng nào khác để đối chiếu với code học
    viên trong vài giây. Diff là phép tính máy móc trên hai chuỗi đã có, không phải
    nhận định mới.
    """
    g, b = (good or "").split("\n"), (bad or "").split("\n")
    rows = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=g, b=b).get_opcodes():
        if tag == "equal":
            continue
        span = max(i2 - i1, j2 - j1)
        for k in range(span):
            gi, bj = i1 + k, j1 + k
            rows.append((
                gi + 1 if gi < i2 else None,
                g[gi] if gi < i2 else None,
                b[bj] if bj < j2 else None,
            ))
    return rows


# --------------------------------------------------------------- đọc dữ liệu


SIM_TAGS = [
    # (chuỗi mốc trong env, tên hệ thống bị mô phỏng). Dò bằng substring trên chính
    # chuỗi env của bài — các chuỗi này do authoring.py sinh ra nên ổn định.
    ("MÔ PHỎNG subprocess", "subprocess"),
    ("MÔ PHỎNG multiprocessing", "multiprocessing"),
    ("MÔ PHỎNG threading", "threading"),
    ("tkinter MÔ PHỎNG", "tkinter"),
    ("ĐỒNG HỒ ẢO", "đồng hồ (time.sleep)"),
    ("đồng hồ ảo", "đồng hồ (time.sleep)"),
]


@dataclass
class Entry:
    """Một bài trong phạm vi, gộp đủ ba nguồn."""

    code: str
    lesson: hb.Lesson            # studio-lesson/v1 (out/lessons)
    qa: dict = field(default_factory=dict)        # out/qa.json
    play: dict = field(default_factory=dict)      # out-advanced (studio-lesson/v2) .play
    adv_path: str = ""
    notes: list = field(default_factory=list)     # cảnh báo toàn vẹn, in ở trang bài

    @property
    def s1(self):
        return self.lesson.s1

    @property
    def s2(self):
        return self.lesson.s2

    @property
    def s3(self):
        return self.lesson.s3

    @property
    def s4(self):
        return self.lesson.s4

    @property
    def games(self):
        return self.play.get("games") or []

    @property
    def solution(self) -> str:
        """Lời giải mẫu LẤY TỪ qa.json (nguồn mà bài được build ra từ đó).

        Lesson JSON cũng có step_4.solutionCode; hai nguồn lệch nhau là dấu hiệu
        build cũ/mới trộn lẫn, nên ghi vào notes thay vì chọn im lặng một bên.
        """
        return self.qa.get("solution") or ""

    @property
    def sim_tags(self):
        env = self.s4.get("env") or ""
        out = []
        for needle, name in SIM_TAGS:
            if needle in env and name not in out:
                out.append(name)
        return out

    @property
    def short_title(self) -> str:
        t = self.lesson.title or self.code
        return t.split("·", 1)[-1].strip() if t.startswith(self.code) else t


def load_entries(out_dir: str, adv_dir: str, codes):
    lessons = hb.load_lessons(out_dir)

    qa_path = os.path.join(out_dir, "qa.json")
    qa_by_code = {}
    if os.path.exists(qa_path):
        with open(qa_path, encoding="utf-8") as fh:
            for item in json.load(fh):
                qa_by_code[item.get("code")] = item
    else:
        print("  CẢNH BÁO: không thấy %s — sẽ không có lời giải mẫu nào." % qa_path)

    adv = {}
    for path in sorted(glob.glob(os.path.join(adv_dir, "lessons", "*.json"))):
        with open(path, encoding="utf-8") as fh:
            raw = json.load(fh)
        adv[raw.get("lesson_code")] = (raw.get("content_json") or {}, path)

    entries, absent = [], []
    for code in codes:
        ls = lessons.get(code)
        if ls is None:
            absent.append(code)
            continue
        content, adv_path = adv.get(code, ({}, ""))
        e = Entry(code=code, lesson=ls, qa=qa_by_code.get(code) or {},
                  play=content.get("play") or {}, adv_path=adv_path)
        # --- kiểm toàn vẹn giữa ba nguồn. In ra trang bài, không chỉ ra console:
        # người cầm tờ giấy mới là người cần biết tờ giấy này có đáng tin không.
        if not e.qa:
            e.notes.append("Không có mục %s trong qa.json — thiếu lời giải mẫu và các biến thể sai." % code)
        elif e.solution and ls.s4.get("solutionCode") and e.solution != ls.s4["solutionCode"]:
            e.notes.append(
                "LỆCH NGUỒN: qa.json và out/lessons/%s khai solutionCode khác nhau. "
                "Trang này in bản của qa.json; dựng lại bài trước khi dùng."
                % os.path.basename(ls.path)
            )
        if e.qa and e.qa.get("tests") and ls.s4.get("tests") and e.qa["tests"] != ls.s4["tests"]:
            e.notes.append("LỆCH NGUỒN: bộ ca chấm trong qa.json khác bài đã build — dựng lại bài.")
        if not content:
            e.notes.append("Không thấy bản v2 trong out-advanced — trang này thiếu đáp án mini-game.")
        elif not e.games:
            e.notes.append("Bản v2 có nhưng không khai `play.games` — không có mini-game để in đáp án.")
        entries.append(e)
    return entries, absent


def load_studio_api(test_calls: str):
    """Trích các dòng API `_studio.…` từ chính bộ chấm, chỉ những helper CÓ dùng.

    Ca chấm in trong tài liệu có chỗ gọi `_studio.call(...)`; giảng viên không đọc
    được dòng đó thì tưởng là code của học viên. Lấy chữ từ docstring của
    studio-harness.py chứ không viết lại, để khi bộ chấm đổi API thì tài liệu đổi theo.
    """
    used = sorted(set(re.findall(r"_studio\.(\w+)", test_calls)))
    if not os.path.exists(HARNESS_PY):
        return used, [], "không tìm thấy %s" % HARNESS_PY
    with open(HARNESS_PY, encoding="utf-8") as fh:
        head = fh.read(12000)
    lines = []
    for raw in head.split("\n"):
        line = raw.strip()
        if not line.startswith("_studio."):
            continue
        if any(line.startswith("_studio.%s" % name) or ".%s(" % name in line for name in used):
            lines.append(line)
    return used, lines, ""


# ------------------------------------------------------- các khối của trang bài


def head_flowables(e: Entry, styles):
    f = [Paragraph(esc(e.lesson.title), styles["lesson_title"])]
    meta = " · ".join(x for x in [
        "Mã bài %s" % e.code,
        e.lesson.level,
        e.lesson.module,
        "%d phút" % e.lesson.minutes if e.lesson.minutes else "",
        "%d XP" % e.lesson.xp if e.lesson.xp else "",
        "thứ tự %d" % e.lesson.sort_order,
        "mức %s" % e.play.get("level") if e.play.get("level") else "",
        "BÀI BOSS" if e.play.get("boss") else "",
    ] if x)
    f.append(Paragraph(esc(meta), styles["meta"]))
    if e.notes:
        f.append(banner(styles, "KIỂM TOÀN VẸN DỮ LIỆU — trang này có chỗ không đáng tin", "banner_danger"))
        f += [Paragraph("• %s" % esc(n), styles["cell_bad"]) for n in e.notes]
    return f


def task_flowables(e: Entry, styles):
    """ĐỀ BÀI — để trang đáp án dùng được mà không cần mở sổ tay bên cạnh."""
    f = []
    task = e.s4.get("task") or {}
    goal = (e.s1.get("brief") or {}).get("goal") or (e.s1.get("context") or {}).get("title")
    if goal:
        f.append(section(styles, "MỤC TIÊU BÀI"))
        f.append(Paragraph(esc(goal), styles["body"]))
    f.append(section(styles, "ĐỀ BÀI TẬP ĐỘC LẬP · %s" % (task.get("title") or "")))
    if task.get("body"):
        for para in str(task["body"]).split("\n\n"):
            if para.strip():
                f.append(Paragraph(esc(para.strip()), styles["body"]))
    else:
        f.append(missing(styles, "step_4.task.body (đề bài)"))
    io = task.get("io") or []
    if io:
        rows = [[code_block(styles, x.get("label"), 0.54 * FRAME_W - 10, "code_cell"),
                 code_block(styles, x.get("value"), 0.46 * FRAME_W - 10, "code_cell")] for x in io]
        f.append(kv_table(styles, rows, [0.54 * FRAME_W, 0.46 * FRAME_W],
                          header=["Gọi (đề cho)", "Kết quả mong đợi"]))
    contracts = e.s4.get("contracts") or []
    if contracts:
        rows = [[code_block(styles, c.get("sig") or c.get("call"), 0.34 * FRAME_W - 10, "code_cell"),
                 Paragraph(esc(" · ".join(x for x in [c.get("does"), c.get("takes"), c.get("gives"),
                                                      c.get("effect")] if x)), styles["cell"])]
                for c in contracts]
        f.append(section(styles, "HỢP ĐỒNG HÀM (chữ ký mà bộ chấm đòi)"))
        f.append(kv_table(styles, rows, [0.34 * FRAME_W, 0.66 * FRAME_W], header=["Chữ ký", "Nhận / trả / tác dụng"]))
    elif contracts == []:
        f.append(missing(styles, "step_4.contracts (hợp đồng hàm)"))
    return f


def solution_flowables(e: Entry, styles):
    """LỜI GIẢI MẪU + bộ ca chấm. Khối chính của cả tài liệu."""
    f = [section(styles, "LỜI GIẢI MẪU (qa.json · %s)" % e.code, "label_ans")]
    if e.solution:
        f.append(code_block(styles, e.solution, FRAME_W - 12, "code_ans"))
    else:
        f.append(missing(styles, "lời giải mẫu trong qa.json"))

    tests = e.qa.get("tests") or e.s4.get("tests") or []
    if tests:
        f.append(section(styles, "BỘ CHẤM — %d ca, phải ĐẠT HẾT mới tính hoàn thành" % len(tests), "label_ans"))
        w = [0.05 * FRAME_W, 0.37 * FRAME_W, 0.58 * FRAME_W]
        rows = []
        for i, t in enumerate(tests, 1):
            call = (t.get("call") or "").strip()
            expect = str(t.get("expect") or "")
            rows.append([
                Paragraph(str(i), styles["cell_bold"]),
                Paragraph(esc(t.get("name") or "(ca không tên)"), styles["cell"]),
                code_block(styles, "%s\n→ %s" % (call, expect), w[2] - 10, "code_cell"),
            ])
        f.append(kv_table(styles, rows, w, header=["#", "Ca kiểm tra — chấm cái gì", "Biểu thức gọi → giá trị mong đợi"]))
    else:
        f.append(missing(styles, "bộ ca chấm (step_4.tests / qa.tests)"))

    hints = e.s4.get("hints") or []
    if hints:
        f.append(section(styles, "GỢI Ý THEO BẬC (học viên mở được, dùng để dẫn chứ không đưa đáp án)"))
        for h in hints:
            f.append(Paragraph("<b>%s.</b> %s" % (esc(h.get("title")), esc(h.get("body"))), styles["bullet"]))
    return f


def env_flowables(e: Entry, styles):
    """MÔI TRƯỜNG CHẤM. Khối phải đọc trước khi nói học viên sai.

    Vì sao đóng khung và đặt ngay sau lời giải: nhiều bài trong 20 bài này chấm một
    bản MÔ PHỎNG (subprocess/thread/tkinter đều là đồ giả trong trình duyệt). Giảng
    viên không biết điều đó sẽ bảo học viên "code sai" trong khi nguyên nhân thật là
    Studio chạy các thread lần lượt.
    """
    env = e.s4.get("env") or ""
    tags = e.sim_tags
    f = []
    if env:
        if tags:
            f.append(banner(styles, "MÔI TRƯỜNG CHẤM LÀ MÔ PHỎNG — %s · ĐỌC TRƯỚC KHI NÓI HỌC VIÊN SAI"
                            % ", ".join(tags), "banner_sim"))
            f.append(Paragraph(
                "Bộ chấm KHÔNG chạy %s thật. Khác biệt giữa bản mô phỏng và máy thật là nguyên nhân "
                "thường gặp hơn cả lỗi code — nguyên văn ghi chú của bài:"
                % esc(", ".join(tags)), styles["cell_bad"]))
        else:
            f.append(banner(styles, "MÔI TRƯỜNG CHẤM", "banner_sub"))
        # Tách theo câu cho dễ đọc to trước lớp, nhưng giữ NGUYÊN VĂN từng câu.
        for sentence in re.split(r"(?<=[.;]) (?=[A-ZĐÀ-Ỹ])", env):
            if sentence.strip():
                f.append(Paragraph("• %s" % esc(sentence.strip()), styles["bullet"]))
    else:
        f.append(section(styles, "MÔI TRƯỜNG CHẤM"))
        f.append(missing(styles, "step_4.env (ghi chú môi trường) — không có cảnh báo mô phỏng nào để đọc"))

    bits = []
    if e.s4.get("packages") or e.qa.get("packages"):
        bits.append("Thư viện nạp sẵn: %s." % ", ".join(e.s4.get("packages") or e.qa.get("packages")))
    if e.s4.get("gate"):
        bits.append("Bài có CỬA TỰ KIỂM TRA (gate): học viên phải nộp trước, lời giải mẫu trong Studio "
                    "chỉ mở sau khi bài được ghi nhận hoàn thành.")
    if bits:
        f.append(Paragraph(esc(" ".join(bits)), styles["small"]))

    # File cấp sẵn: in CẢ NỘI DUNG. Lời giải của học viên gọi sang file này, nên khi
    # học viên hỏi "vì sao process con báo lỗi" thì giảng viên phải đọc được đúng
    # cái mà file đó chờ ở stdin — chỉ biết tên file thì không trả lời được.
    for x in (e.s4.get("files") or e.qa.get("files") or []):
        f.append(banner(styles, "FILE CẤP SẴN CHO BÀI · %s (%s) — học viên không phải viết file này"
                        % (x.get("name"), x.get("kind")), "banner_sub"))
        if x.get("content"):
            f.append(code_block(styles, x["content"], FRAME_W - 12))
        else:
            f.append(missing(styles, "nội dung của file %s" % x.get("name")))
    return f


def quiz_flowables(e: Entry, styles):
    """Đáp án + GIẢI THÍCH cho câu dự đoán, trắc nghiệm, phản ví dụ, tự giải thích."""
    f = []
    avail = FRAME_W

    pred = e.s1.get("predict") or {}
    f.append(section(styles, "CÂU DỰ ĐOÁN — đáp án và giải thích", "label_ans"))
    if pred.get("question"):
        f.append(Paragraph(esc(pred["question"]), styles["body"]))
        if pred.get("code"):
            f.append(code_block(styles, pred["code"], avail - 12))
        rows = []
        for i, opt in enumerate(pred.get("options") or []):
            right = bool(opt.get("correct"))
            rows.append([
                Paragraph("%s %s" % (letter(i), "ĐÚNG" if right else ""), styles["cell_ok"] if right else styles["cell"]),
                Paragraph(esc(opt.get("title")), styles["cell_bold"] if right else styles["cell"]),
                Paragraph(esc(opt.get("detail")) or "<i>JSON không khai giải thích cho lựa chọn này</i>",
                          styles["cell"]),
            ])
        if rows:
            f.append(kv_table(styles, rows, [0.11 * avail, 0.33 * avail, 0.56 * avail],
                              header=["Nhãn", "Lựa chọn", "Vì sao đúng / vì sao sai"]))
        else:
            f.append(missing(styles, "step_1.predict.options"))
    else:
        f.append(missing(styles, "step_1.predict (câu dự đoán)"))

    mcqs = e.s2.get("mcq") or []
    f.append(section(styles, "TỰ KIỂM TRA — %d câu trắc nghiệm" % len(mcqs), "label_ans"))
    if not mcqs:
        f.append(missing(styles, "step_2.mcq (câu trắc nghiệm)"))
    for qi, q in enumerate(mcqs, 1):
        ci = mcq_correct_index(q)
        f.append(Paragraph("<b>%d.</b> %s" % (qi, esc(q.get("question"))), styles["body"]))
        rows = []
        for i, opt in enumerate(q.get("options") or []):
            right = i == ci
            rows.append([
                Paragraph("%s %s" % (letter(i), "ĐÚNG" if right else ""), styles["cell_ok"] if right else styles["cell"]),
                Paragraph(esc(option_text(opt)), styles["cell_bold"] if right else styles["cell"]),
                Paragraph(esc(option_detail(opt)) or "<i>JSON không khai giải thích cho lựa chọn này</i>",
                          styles["cell"]),
            ])
        if rows:
            f.append(kv_table(styles, rows, [0.11 * avail, 0.33 * avail, 0.56 * avail]))
        if ci < 0:
            f.append(Paragraph("<b>JSON KHÔNG ĐÁNH DẤU ĐÁP ÁN ĐÚNG cho câu này.</b>", styles["cell_bad"]))
        if q.get("explanation"):
            f.append(Paragraph("<b>Giải thích (nguyên văn JSON):</b> %s" % esc(q["explanation"]), styles["small"]))
        else:
            f.append(missing(styles, "explanation của câu %d" % qi))

    counter = e.s3.get("counter") or {}
    f.append(section(styles, "CÂU PHẢN VÍ DỤ — đáp án", "label_ans"))
    if counter.get("question"):
        f.append(Paragraph(esc(counter["question"]), styles["body"]))
        opts = [str(x) for x in (counter.get("options") or [])]
        correct = str(counter.get("correct"))
        rows = [[Paragraph("%s %s" % (letter(i), "ĐÚNG" if o == correct else ""),
                           styles["cell_ok"] if o == correct else styles["cell"]),
                 code_block(styles, o, 0.85 * avail - 10, "code_cell")] for i, o in enumerate(opts)]
        if rows:
            f.append(kv_table(styles, rows, [0.15 * avail, 0.85 * avail], header=["Nhãn", "Lựa chọn"]))
        if correct not in opts:
            f.append(Paragraph("<b>LỆCH DỮ LIỆU: `correct` = %s không nằm trong danh sách lựa chọn.</b>"
                               % esc(correct), styles["cell_bad"]))
        # step_3.counter KHÔNG có trường giải thích trong schema v1 — nói thẳng chỗ
        # phải tra thay vì tự viết một lời giải thích mới.
        f.append(Paragraph(
            "Schema không có trường giải thích cho câu phản ví dụ. Chỗ lý giải gần nhất đã có trong "
            "bài: khối NGỘ NHẬN và BẢNG TRACE bên dưới.", styles["small"]))
    else:
        f.append(missing(styles, "step_3.counter (câu phản ví dụ)"))

    se = e.s2.get("selfExplain") or {}
    f.append(section(styles, "TỰ GIẢI THÍCH — lời giải thích mẫu", "label_ans"))
    if se.get("prompt"):
        f.append(Paragraph("<b>Câu hỏi:</b> %s" % esc(se["prompt"]), styles["body"]))
    if se.get("sample"):
        f.append(Paragraph("<b>Mẫu đạt:</b> %s" % esc(se["sample"]), styles["body"]))
    else:
        f.append(missing(styles, "step_2.selfExplain.sample (lời giải thích mẫu)"))
    rubric = se.get("rubric") or []
    if rubric:
        f.append(kv_table(styles, [[Paragraph(esc(r.get("label")), styles["cell_bold"]),
                                    Paragraph(esc(" / ".join(r.get("keywords") or [])), styles["cell_mono"])]
                                   for r in rubric],
                          [0.3 * avail, 0.7 * avail], header=["Ý phải có", "Từ khoá được tính"]))
        f.append(Paragraph("Chấm theo từ khoá (bỏ dấu cũng tính).", styles["small"]))
    else:
        min_words = e.play.get("selfExplainMinWords")
        f.append(Paragraph(
            "Không có rubric từ khoá: Studio chỉ đòi độ dài tối thiểu %s. Nội dung thì giảng viên "
            "đối chiếu với mẫu ở trên." % ("%s từ" % min_words if min_words else "theo mặc định của Studio"),
            styles["small"]))
    return f


def misconception_flowables(e: Entry, styles):
    """NGỘ NHẬN — khối học viên thật sự vấp. Để riêng và đóng khung cho dễ tìm."""
    mis = e.s1.get("misconception") or {}
    if not (mis.get("title") or mis.get("body")):
        return [section(styles, "NGỘ NHẬN THƯỜNG GẶP", "label_warn"),
                missing(styles, "step_1.misconception")]
    f = [banner(styles, "NGỘ NHẬN THƯỜNG GẶP: %s" % (mis.get("title") or ""), "banner_danger")]
    if mis.get("body"):
        f.append(Paragraph(esc(mis["body"]), styles["body"]))
    return f


def trace_scaffold_flowables(e: Entry, styles):
    f = []
    avail = FRAME_W
    steps = e.lesson.trace_steps
    f.append(section(styles, "BẢNG TRACE (trạng thái trước → sau, dùng để giải thích cho học viên)"))
    if steps:
        f.append(kv_table(styles, [[Paragraph(esc(st.get("label")), styles["cell_bold"]),
                                    Paragraph(esc(st.get("text")), styles["cell"])] for st in steps],
                          [0.14 * avail, 0.86 * avail], header=["Bước", "Trạng thái"]))
    else:
        f.append(missing(styles, "step_3.trace.steps"))

    sc = e.lesson.scaffold
    f.append(banner(styles, "LẮP MẢNH (scaffold) — mảnh đúng cho từng ô và bẫy ở từng ô"))
    # Đề của màn lắp mảnh khác đề bài tập độc lập (step_4): nó đổi dữ liệu/điều kiện.
    # In ra để giảng viên biết học viên đang được yêu cầu cái gì ở màn này.
    task3 = e.s3.get("task") or {}
    if task3.get("body"):
        f.append(Paragraph("<b>Đề màn luyện có hỗ trợ (%s):</b> %s" % (esc(task3.get("title") or ""),
                                                                       esc(task3["body"])), styles["body"]))
    if task3.get("rule"):
        f.append(Paragraph("<b>Yêu cầu thêm:</b> %s" % esc(task3["rule"]), styles["small"]))
    if not sc.get("slots"):
        f.append(missing(styles, "step_3.scaffold (bài này không có màn lắp mảnh)"))
        return f
    if sc.get("template"):
        f.append(code_block(styles, sc["template"], avail - 12))
    rows = []
    for slot in sc.get("slots") or []:
        rows.append([
            Paragraph(esc(slot.get("placeholder") or "slot %s" % slot.get("n")), styles["cell_bold"]),
            code_block(styles, slot.get("answer"), 0.72 * avail - 10, "code_cell"),
        ])
    f.append(kv_table(styles, rows, [0.28 * avail, 0.72 * avail], header=["Ô trống", "MẢNH ĐÚNG"]))
    traps = [b for b in (sc.get("bank") or []) if b.get("trap")]
    if traps:
        rows = [[Paragraph("ô %s" % esc(b.get("slot")), styles["cell"]),
                 code_block(styles, b.get("label"), 0.33 * avail - 10, "code_cell"),
                 Paragraph(esc(b.get("trap")), styles["cell_bad"])] for b in traps]
        f.append(kv_table(styles, rows, [0.08 * avail, 0.33 * avail, 0.59 * avail],
                          header=["Thuộc ô", "MẢNH BẪY", "Vì sao sai"]))
    else:
        f.append(missing(styles, "mảnh bẫy (bank[].trap) — ngân hàng mảnh không có bẫy nào"))
    extra = [b for b in (sc.get("bank") or []) if not b.get("trap")]
    if extra:
        f.append(Paragraph(
            "Ngân hàng còn %d mảnh KHÔNG phải bẫy (chính là mảnh đúng của các ô): %s."
            % (len(extra), esc(", ".join("ô %s" % b.get("slot") for b in extra))), styles["small"]))
    return f


# ------------------------------------------------------------ đáp án mini-game


def game_match(g, styles, avail):
    f = [Paragraph("Nối đúng là từng CẶP theo thứ tự `pairs` trong JSON; cột phải hiển thị xáo theo "
                   "`rightOrder` = %s." % esc(g.get("rightOrder")), styles["small"])]
    rows = [[Paragraph(esc(p.get("left")), styles["cell"]),
             Paragraph(esc(p.get("right")), styles["cell_ok"])] for p in g.get("pairs") or []]
    if rows:
        f.append(kv_table(styles, rows, [0.5 * avail, 0.5 * avail], header=["Bên trái", "NỐI VỚI (đáp án)"]))
    else:
        f.append(Paragraph("<i>JSON không khai `pairs`.</i>", styles["small"]))
    return f


def game_fill(g, e, styles, avail):
    """Màn `fill` KHÔNG mang dữ liệu riêng: nó lắp lại step_3.scaffold (đúng như
    frontend answer-key.ts case 'fill'). Nên đáp án chính là bảng ô trống ở khối
    LẮP MẢNH — in lại gọn ở đây để không phải lật trang."""
    slots = (e.s3.get("scaffold") or {}).get("slots") or []
    f = [Paragraph("Màn này dùng lại step_3.scaffold (mảnh đúng + bẫy xem khối LẮP MẢNH).", styles["small"])]
    if slots:
        rows = [[Paragraph("ô %s" % esc(s.get("n")), styles["cell_bold"]),
                 code_block(styles, s.get("answer"), 0.8 * avail - 10, "code_cell")] for s in slots]
        f.append(kv_table(styles, rows, [0.2 * avail, 0.8 * avail], header=["Ô", "MẢNH ĐÚNG"]))
        traps = [b for b in ((e.s3.get("scaffold") or {}).get("bank") or []) if b.get("trap")]
        for b in traps:
            f.append(Paragraph("Bẫy ở ô %s — <font face=\"HBMono\" size=\"6.8\">%s</font>: %s"
                               % (esc(b.get("slot")), esc(b.get("label")), esc(b.get("trap"))), styles["cell_bad"]))
    else:
        f.append(Paragraph("<i>Bài không có step_3.scaffold.slots — màn này không có đáp án để in.</i>",
                           styles["small"]))
    return f


def game_parsons(g, styles, avail):
    """Thứ tự ĐÚNG là thứ tự mảng `lines` (frontend chấm bằng parsonsCode(game,
    lines.map(id))); `order` chỉ là thứ tự XÁO lúc hiện ra."""
    ids = [l.get("id") for l in g.get("lines") or []]
    f = [Paragraph("Thứ tự đúng (theo mảng `lines`): <font face=\"HBMono\" size=\"6.8\">%s</font>. "
                   "Thứ tự xáo lúc chơi là `order` = %s."
                   % (esc(" → ".join(map(str, ids))), esc(g.get("order"))), styles["small"])]
    body = "\n".join("%-4s %s" % (l.get("id"), l.get("text")) for l in g.get("lines") or [])
    if body:
        f.append(code_block(styles, body, avail - 14, "code_ans"))
    head, tail = g.get("head") or "", g.get("tail") or ""
    f.append(Paragraph("Phần đầu/cuối đã cho sẵn, học viên không sắp: %d dòng đầu + %d dòng cuối."
                       % (head.count("\n"), tail.count("\n")), styles["small"]))
    dis = g.get("distractors") or []
    if dis:
        rows = [[code_block(styles, d.get("text"), 0.45 * avail - 10, "code_cell"),
                 Paragraph(esc(d.get("reason")) or "<i>JSON không khai lý do</i>", styles["cell_bad"])]
                for d in dis]
        f.append(kv_table(styles, rows, [0.45 * avail, 0.55 * avail],
                          header=["DÒNG BẪY (không được dùng)", "Vì sao sai"]))
    else:
        f.append(Paragraph("<i>JSON không khai `distractors` — màn này không có dòng bẫy.</i>", styles["small"]))
    return f


def game_spoterror(g, styles, avail):
    lines = g.get("lines") or ([g.get("line")] if g.get("line") is not None else [])
    f = [Paragraph("<b>Dòng sai: %s</b> (số dòng tuyệt đối, đoạn hiện ra bắt đầu từ dòng %s)."
                   % (esc(", ".join(str(x) for x in lines)), esc(g.get("firstLine"))), styles["cell_ok"])]
    f.append(Paragraph("<b>Lỗi:</b> %s" % (esc(g.get("label")) or "<i>JSON không khai nhãn lỗi</i>"),
                       styles["cell"]))
    if g.get("fix"):
        f.append(Paragraph("<b>Sửa thành:</b>", styles["cell"]))
        f.append(code_block(styles, g["fix"], avail - 14, "code_ans"))
    else:
        f.append(Paragraph("<i>JSON không khai `fix` — không có dòng sửa mẫu.</i>", styles["small"]))
    # In lại đoạn code CÓ SỐ DÒNG và đánh dấu dòng sai: không có số dòng thì giảng
    # viên phải tự đếm, và `firstLine` làm lệch cách đếm từ 1.
    src = g.get("code") or ""
    if src:
        first = g.get("firstLine") or 1
        marked = "\n".join(
            "%s%4d | %s" % (">>" if (first + i) in lines else "  ", first + i, text)
            for i, text in enumerate(src.split("\n"))
        )
        f.append(code_block(styles, marked, avail - 14))
        f.append(Paragraph("Dấu >> ở đầu dòng là của tài liệu này, không phải của bài.", styles["small"]))
    return f


def game_debug(g, e, styles, avail):
    """Màn `debug` cho sẵn code SAI, đáp án là sửa về lời giải mẫu (frontend
    answer-key.ts trả step_4.solutionCode). In DIFF chứ không in lại cả lời giải:
    giảng viên cần biết đúng dòng phải đổi."""
    f = [Paragraph("<b>Lỗi cần sửa:</b> %s" % esc(g.get("label")), styles["cell_ok"]),
         Paragraph("Đáp án Studio nhận = LỜI GIẢI MẪU ở trên. Các dòng khác nhau giữa code cho sẵn "
                   "và lời giải mẫu:", styles["cell"])]
    rows = diff_rows(e.solution, g.get("code") or "")
    if not e.solution:
        f.append(Paragraph("<i>Không có lời giải mẫu để so — xem khối kiểm toàn vẹn ở đầu bài.</i>",
                           styles["small"]))
    elif rows:
        data = [[Paragraph(str(n) if n else "—", styles["cell"]),
                 code_block(styles, b if b is not None else "(không có dòng)", 0.45 * avail - 10, "code_cell"),
                 code_block(styles, s if s is not None else "(xoá dòng)", 0.45 * avail - 10, "code_cell")]
                for n, s, b in rows]
        f.append(kv_table(styles, data, [0.1 * avail, 0.45 * avail, 0.45 * avail],
                          header=["Dòng", "Code cho sẵn (SAI)", "Lời giải mẫu (ĐÚNG)"]))
    else:
        f.append(Paragraph("<i>Code cho sẵn GIỐNG HỆT lời giải mẫu — không có gì để sửa; dữ liệu bài "
                           "có vấn đề.</i>", styles["cell_bad"]))
    return f


def game_tracetable(g, styles, avail):
    """Bảng theo dõi biến đã ĐIỀN. `rows[i].values[col] = null` là ô học viên phải
    điền; đáp án nằm ở `answers["<i>-<col>"]`."""
    cols = g.get("columns") or []
    answers = g.get("answers") or {}
    f = []
    if g.get("code"):
        f.append(code_block(styles, g["code"], avail - 14))
    header = ["#", "Dòng chạy"] + list(cols)
    rows = []
    blanks = 0
    for i, r in enumerate(g.get("rows") or []):
        cells = [Paragraph(str(i), styles["cell"]), code_block(styles, r.get("step"), 0.3 * avail - 10, "code_cell")]
        for c in cols:
            v = (r.get("values") or {}).get(c)
            if v is None:
                v = answers.get("%d-%s" % (i, c))
                blanks += 1
                cells.append(Paragraph(esc(v) if v is not None else "<b>JSON thiếu đáp án</b>",
                                       styles["cell_mono_ok"] if v is not None else styles["cell_bad"]))
            else:
                cells.append(Paragraph(esc(v), styles["cell_mono"]))
        rows.append(cells)
    if rows:
        w = [0.05 * avail, 0.35 * avail]
        rest = (avail - sum(w)) / max(1, len(cols))
        f.append(kv_table(styles, rows, w + [rest] * len(cols), header=header))
        f.append(Paragraph("Ô IN XANH ĐẬM là ô học viên phải điền (%d ô); ô xám là giá trị bài cho sẵn. "
                           "So sánh bỏ nháy và không phân biệt hoa/thường." % blanks, styles["small"]))
    else:
        f.append(Paragraph("<i>JSON không khai `rows`.</i>", styles["small"]))
    return f


def game_truefalse(g, styles, avail):
    f = []
    if g.get("prompt"):
        f.append(Paragraph("<b>Câu hỏi:</b> %s" % esc(g["prompt"]), styles["cell"]))
    rows = []
    for it in g.get("items") or []:
        yes = bool(it.get("answer"))
        rows.append([
            Paragraph("ĐÚNG" if yes else "SAI", styles["cell_ok"] if yes else styles["cell_bad"]),
            Paragraph(esc(it.get("statement")), styles["cell"]),
            Paragraph(esc(it.get("explain")) or "<i>JSON không khai giải thích</i>", styles["cell"]),
        ])
    if rows:
        f.append(kv_table(styles, rows, [0.1 * avail, 0.42 * avail, 0.48 * avail],
                          header=["Phán quyết", "Phát biểu", "Vì sao"]))
    else:
        f.append(Paragraph("<i>JSON không khai `items`.</i>", styles["small"]))
    return f


def game_selfexplain(g, e, styles, avail):
    sample = (e.s2.get("selfExplain") or {}).get("sample") or ""
    min_words = e.play.get("selfExplainMinWords")
    f = [Paragraph("<b>Câu hỏi của màn:</b> %s" % esc(g.get("title")), styles["cell"])]
    if sample:
        f.append(Paragraph("<b>Lời giải thích mẫu:</b> %s" % esc(sample), styles["cell_ok"]))
    else:
        f.append(Paragraph("<i>step_2.selfExplain.sample không có — không có mẫu để đối chiếu.</i>",
                           styles["small"]))
    f.append(Paragraph("Studio chỉ chấm độ dài (%s), nội dung do giảng viên đối chiếu."
                       % ("tối thiểu %s từ" % min_words if min_words else "ngưỡng mặc định"), styles["small"]))
    return f


GAME_LABEL = {
    "match": "NỐI CẶP",
    "fill": "ĐIỀN Ô TRỐNG",
    "parsons": "SẮP DÒNG (Parsons)",
    "spotError": "SĂN LỖI",
    "debug": "SỬA CODE",
    "traceTable": "BẢNG THEO DÕI BIẾN",
    "trueFalse": "ĐÚNG / SAI",
    "selfExplain": "TỰ GIẢI THÍCH",
}


def games_flowables(e: Entry, styles):
    avail = FRAME_W
    f = [section(styles, "ĐÁP ÁN MINI-GAME (%d màn, nguồn out-advanced · studio-lesson/v2)"
                 % len(e.games), "label_ans")]
    if not e.games:
        f.append(missing(styles, "play.games cho bài này"))
        return f
    for g in e.games:
        kind = g.get("type") or "?"
        f.append(banner(styles, "%s · %s — %s" % (g.get("id"), GAME_LABEL.get(kind, kind), g.get("title")),
                        "banner_sub"))
        if kind == "match":
            f += game_match(g, styles, avail)
        elif kind == "fill":
            f += game_fill(g, e, styles, avail)
        elif kind == "parsons":
            f += game_parsons(g, styles, avail)
        elif kind == "spotError":
            f += game_spoterror(g, styles, avail)
        elif kind == "debug":
            f += game_debug(g, e, styles, avail)
        elif kind == "traceTable":
            f += game_tracetable(g, styles, avail)
        elif kind == "trueFalse":
            f += game_truefalse(g, styles, avail)
        elif kind == "selfExplain":
            f += game_selfexplain(g, e, styles, avail)
        else:
            f.append(Paragraph(
                "<i>Loại màn `%s` chưa được tài liệu này biết cách in đáp án. Dữ liệu thô: %s</i>"
                % (esc(kind), esc(json.dumps(g, ensure_ascii=False)[:600])), styles["cell_bad"]))
    return f


def bad_flowables(e: Entry, styles):
    """Các biến thể SAI cố ý trong qa.json.

    Đây là thứ giảng viên dùng nhiều nhất khi học viên hỏi "sai ở đâu": code của học
    viên thường rơi đúng vào một trong các biến thể này. In nhãn + CHÍNH dòng khác
    so với lời giải mẫu.
    """
    avail = FRAME_W
    bad = e.qa.get("bad") or []
    f = [section(styles, "CÁC KIỂU SAI ĐÃ BIẾT (qa.json · bad) — %d biến thể" % len(bad), "label_danger")]
    if not bad:
        f.append(missing(styles, "qa.bad (biến thể sai cố ý)"))
        return f
    f.append(Paragraph("Mỗi biến thể là một bản code chỉ khác lời giải mẫu vài dòng. Bảng dưới là diff: "
                       "trái = lời giải mẫu, phải = bản sai.", styles["small"]))
    for i, b in enumerate(bad, 1):
        f.append(banner(styles, "KIỂU SAI %d — %s" % (i, b.get("label") or "(JSON không khai nhãn)"),
                        "banner_danger"))
        rows = diff_rows(e.solution, b.get("code") or "")
        if not e.solution:
            f.append(Paragraph("<i>Không có lời giải mẫu để so.</i>", styles["small"]))
        elif rows:
            data = [[Paragraph(str(n) if n else "—", styles["cell"]),
                     code_block(styles, s if s is not None else "(không có dòng)", 0.45 * avail - 10, "code_cell"),
                     code_block(styles, bl if bl is not None else "(xoá dòng)", 0.45 * avail - 10, "code_cell")]
                    for n, s, bl in rows]
            f.append(kv_table(styles, data, [0.1 * avail, 0.45 * avail, 0.45 * avail],
                              header=["Dòng", "Lời giải mẫu (ĐÚNG)", "Bản sai"]))
        else:
            f.append(Paragraph("<i>Bản này không khác lời giải mẫu dòng nào — dữ liệu bài có vấn đề.</i>",
                               styles["cell_bad"]))
    return f


def lesson_flowables(e: Entry, styles):
    f = []
    f += head_flowables(e, styles)
    f += task_flowables(e, styles)
    f += solution_flowables(e, styles)
    f += env_flowables(e, styles)
    f += misconception_flowables(e, styles)
    f += quiz_flowables(e, styles)
    f += trace_scaffold_flowables(e, styles)
    f += games_flowables(e, styles)
    f += bad_flowables(e, styles)
    src = e.lesson.content.get("source") or {}
    f.append(Paragraph(
        "Nguồn trang này: %s · %s · %s · qa.json[%s]"
        % (esc(src.get("kind") or "pe-v4"), esc(os.path.basename(e.lesson.path)),
           esc(os.path.basename(e.adv_path) if e.adv_path else "(không có bản v2)"), esc(e.code)),
        styles["small"]))
    return f


# ----------------------------------------------------------------- doc template


class AnswerKeyDoc(BaseDocTemplate):
    """Header mang MÃ BÀI để một trang bị xé ra vẫn biết là của bài nào, và mang
    dòng "không phát cho học viên" vì tờ giấy rời sẽ không còn bìa đi kèm."""

    def __init__(self, path, **kw):
        super().__init__(path, pagesize=A4, **kw)
        frame = Frame(MARGIN_X, MARGIN_BOTTOM, FRAME_W, PAGE_H - MARGIN_TOP - MARGIN_BOTTOM,
                      id="body", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[frame], onPage=self._cover_page),
            # onPageEnd chứ không onPage: mã bài chỉ được afterFlowable ghi lại SAU
            # khi tiêu đề bài được vẽ (xem handbook.py — cùng lý do).
            PageTemplate(id="body", frames=[frame], onPageEnd=self._body_page),
        ])
        self.section = ""
        self.lesson_tag = ""
        self.build_date = BUILD_DATE

    def _body_page(self, canv, doc):
        canv.saveState()
        canv.setFont("HBSans-Bold", 7)
        canv.setFillColor(DANGER)
        canv.drawString(MARGIN_X, PAGE_H - MARGIN_TOP + 7 * mm, "BẢN ĐÁP ÁN · KHÔNG PHÁT CHO HỌC VIÊN")
        canv.setFont("HBSans-Bold", 7.5)
        canv.setFillColor(INK)
        canv.drawRightString(PAGE_W - MARGIN_X, PAGE_H - MARGIN_TOP + 7 * mm, (doc.lesson_tag or doc.section)[:78])
        canv.setStrokeColor(RULE)
        canv.line(MARGIN_X, PAGE_H - MARGIN_TOP + 5 * mm, PAGE_W - MARGIN_X, PAGE_H - MARGIN_TOP + 5 * mm)
        canv.line(MARGIN_X, MARGIN_BOTTOM - 4 * mm, PAGE_W - MARGIN_X, MARGIN_BOTTOM - 4 * mm)
        canv.setFont("HBSans", 7)
        canv.setFillColor(MUTED)
        canv.drawString(MARGIN_X, MARGIN_BOTTOM - 8 * mm,
                        "Python nâng cao · bản dựng %s · nguồn scripts/pe-v4/out + out-advanced" % doc.build_date)
        canv.drawRightString(PAGE_W - MARGIN_X, MARGIN_BOTTOM - 8 * mm, "trang %d" % doc.page)
        canv.restoreState()

    def _cover_page(self, canv, doc):
        canv.saveState()
        canv.setStrokeColor(DANGER)
        canv.setLineWidth(3)
        canv.line(MARGIN_X, PAGE_H - MARGIN_TOP + 6 * mm, PAGE_W - MARGIN_X, PAGE_H - MARGIN_TOP + 6 * mm)
        canv.line(MARGIN_X, MARGIN_BOTTOM - 6 * mm, PAGE_W - MARGIN_X, MARGIN_BOTTOM - 6 * mm)
        canv.restoreState()

    def afterFlowable(self, flowable):
        level = getattr(flowable, "_toc_level", None)
        if level is None:
            return
        text = getattr(flowable, "_toc_text", "")
        if level == 0:
            self.section = text
            self.lesson_tag = ""
        else:
            self.lesson_tag = getattr(flowable, "_toc_tag", text)
        self.notify("TOCEntry", (level, text, self.page, None))


def cover_flowables(styles, entries, absent, build_date, only):
    f = [Spacer(1, 22 * mm)]
    f.append(Paragraph("PYTHON NÂNG CAO · PE-V4 · 20 BÀI ĐẦU", styles["cover_kicker"]))
    f.append(Paragraph("Bản đáp án cho giảng viên và cố vấn", styles["cover_title"]))
    f.append(Paragraph("%d/%d bài trong phạm vi · bản dựng %s" % (len(entries), len(SCOPE_CODES), build_date),
                       styles["cover_sub"]))
    f.append(box([Paragraph("KHÔNG PHÁT CHO HỌC VIÊN", styles["cover_warn"]),
                  Paragraph("Tập giấy này chứa lời giải mẫu, đáp án trắc nghiệm và đáp án mọi mini-game "
                            "của 20 bài đầu. Phát cho học viên là phá buổi chạy thử. Mỗi trang đều có "
                            "dòng cảnh báo ở đầu trang để một tờ rời cũng không bị hiểu nhầm.",
                            styles["cover_note"])],
                 FRAME_W, DANGER_BG, DANGER))
    f.append(Spacer(1, 8))
    notes = [
        "<b>Dùng vào việc gì.</b> Kèm một buổi chạy thử có người học thật: đối chiếu code học viên với "
        "lời giải mẫu, biết bộ chấm đòi gì, trả lời được “sai ở đâu” mà không phải tự giải lại 20 bài.",
        "<b>Phạm vi.</b> P01–P07 (process), T01–T06 (thread), G01–G06 (GUI), R02 (boss). %d bài còn lại "
        "của giáo trình CỐ Ý không có ở đây: %s." % (len(OUT_OF_SCOPE), ", ".join(OUT_OF_SCOPE)),
        "<b>Mỗi bài bắt đầu ở một trang mới</b> và mang mã bài ở đầu trang. Bài nhiều code (R02) tràn "
        "sang vài trang — các trang đó vẫn mang đúng mã bài.",
        "<b>Nguồn.</b> Mọi dòng trong tài liệu được render từ bản build, không câu nào gõ tay: "
        "<font face=\"HBMono\" size=\"8\">out/lessons/*.json</font> (đề, trắc nghiệm, giải thích, ngộ nhận, "
        "trace, scaffold, env) · <font face=\"HBMono\" size=\"8\">out/qa.json</font> (lời giải mẫu, bộ ca "
        "chấm, các biến thể sai cố ý) · <font face=\"HBMono\" size=\"8\">out-advanced/lessons/*.json</font> "
        "(mini-game). Thiếu trường nào thì trang bài ghi là thiếu — tài liệu đáp án không được suy diễn.",
        "<b>Cái gì CỐ Ý không có ở đây.</b> Phần lý thuyết và “điểm kiến thức” của bài không được lặp lại "
        "— chúng nằm ở sổ tay nội dung (<font face=\"HBMono\" size=\"8\">python-advanced-handbook.pdf</font>, "
        "cùng thư mục). Tập này chỉ in những gì cần để CHẤM và GIẢI THÍCH: đề, lời giải, bộ chấm, đáp án, "
        "bẫy, môi trường.",
        "<b>Đọc kỹ khối MÔI TRƯỜNG CHẤM (khung cam).</b> Trong 20 bài này, subprocess / thread / tkinter "
        "đều là bản MÔ PHỎNG chạy trong trình duyệt. Thứ tự in của thread, việc cửa sổ không hiện ra, "
        "hay race condition không tái hiện được — đó là mô phỏng, KHÔNG phải lỗi của học viên.",
        "<b>Chấm nằm ở trình duyệt.</b> Server không chấm lại gì; một bài “đạt” nghĩa là bộ chấm trong "
        "trình duyệt báo đạt. Xem AGENTS.md.",
        "<b>Màu.</b> Khung xanh = đáp án. Khung đỏ = ngộ nhận / kiểu sai đã biết. Khung cam = môi trường "
        "mô phỏng. Chữ <font color=\"#15803d\"><b>ĐÚNG</b></font> đánh dấu lựa chọn đúng.",
    ]
    if absent:
        notes.append("<b>THIẾU %d/%d bài trong phạm vi</b> (không có JSON để đọc): %s. Dựng lại bài rồi "
                     "chạy lại answerkey.py." % (len(absent), len(SCOPE_CODES), ", ".join(absent)))
    else:
        notes.append("Bản dựng này có đủ %d/%d mã bài trong phạm vi." % (len(entries), len(SCOPE_CODES)))
    if only:
        notes.append("<b>BẢN XEM NHANH.</b> Lần dựng này chạy với <font face=\"HBMono\" size=\"8\">--only "
                     "%s</font> nên CHỈ có các bài đó. Bản đủ 20 bài phải dựng lại không có --only."
                     % ", ".join(only))
    for line in notes:
        f.append(Paragraph(line, styles["cover_note"]))
        f.append(Spacer(1, 3.5))
    return f


def howto_flowables(styles, entries):
    """Trang "cách đọc": thứ tự khối trong mỗi bài + chú giải cú pháp của bộ chấm."""
    f = [Paragraph("Cách đọc một trang đáp án", styles["h1"])]
    f[0]._toc_level, f[0]._toc_text = 0, "Cách đọc một trang đáp án"
    f.append(Paragraph("Mọi bài theo đúng một thứ tự khối, để lúc đang kèm học viên thì tìm bằng vị trí "
                       "chứ không phải đọc hết trang:", styles["body"]))
    order = [
        ("Mục tiêu + ĐỀ BÀI", "chép từ step_1.brief.goal và step_4.task — đủ để dùng trang này mà không "
                              "cần mở sổ tay."),
        ("Hợp đồng hàm", "chữ ký mà bộ chấm gọi tới; học viên đặt tên hàm khác là trượt hết ca."),
        ("LỜI GIẢI MẪU (khung xanh)", "nguyên văn qa.json. Không phải lời giải DUY NHẤT đúng — bộ chấm "
                                      "chỉ gọi hàm và so giá trị."),
        ("BỘ CHẤM", "từng ca: tên ca (chấm cái gì) và biểu thức gọi → giá trị mong đợi."),
        ("MÔI TRƯỜNG CHẤM (khung cam)", "cái gì là mô phỏng. Đọc trước khi kết luận học viên sai."),
        ("NGỘ NHẬN (khung đỏ)", "chỗ học viên thật sự vấp, theo chính tác giả bài."),
        ("Dự đoán / trắc nghiệm / phản ví dụ / tự giải thích", "đáp án kèm giải thích nguyên văn JSON."),
        ("Trace + LẮP MẢNH", "chuỗi trạng thái để giảng giải, mảnh đúng từng ô và bẫy từng ô."),
        ("ĐÁP ÁN MINI-GAME (khung xanh)", "từng màn một: nối cặp, điền ô, sắp dòng, săn lỗi, sửa code, "
                                          "bảng theo dõi biến, đúng/sai, tự giải thích."),
        ("CÁC KIỂU SAI ĐÃ BIẾT (khung đỏ)", "diff giữa lời giải mẫu và từng biến thể sai cố ý — code học "
                                            "viên thường rơi đúng vào đây."),
    ]
    f.append(kv_table(styles, [[Paragraph("<b>%s</b>" % esc(a), styles["cell_bold"]),
                                Paragraph(esc(b), styles["cell"])] for a, b in order],
                      [0.3 * FRAME_W, 0.7 * FRAME_W], header=["Khối", "Là gì"]))

    calls = "\n".join((t.get("call") or "") for e in entries for t in (e.qa.get("tests") or e.s4.get("tests") or []))
    used, api_lines, err = load_studio_api(calls)
    f.append(section(styles, "CÚ PHÁP CỦA BỘ CHẤM XUẤT HIỆN TRONG CÁC CA"))
    if used:
        f.append(Paragraph(
            "Biểu thức gọi chạy trong namespace của học viên và có sẵn đối tượng "
            "<font face=\"HBMono\" size=\"8\">_studio</font> của bộ chấm. Trong 20 bài này dùng tới: %s. "
            "Những dòng dưới trích từ chính bộ chấm "
            "(<font face=\"HBMono\" size=\"7.5\">frontend/public/static/js/studio-harness.py</font>):"
            % esc(", ".join("_studio.%s" % u for u in used)), styles["body"]))
        if api_lines:
            f.append(code_block(styles, "\n".join(api_lines), FRAME_W - 12))
        else:
            f.append(Paragraph("<i>Không trích được dòng API nào từ bộ chấm%s.</i>"
                               % (" (%s)" % esc(err) if err else ""), styles["small"]))
    else:
        f.append(Paragraph("Không ca nào trong 20 bài dùng tới helper của bộ chấm.", styles["body"]))
    f.append(Paragraph("Trong khối code, dấu <font face=\"HBMono\">%s</font> ở cuối dòng nghĩa là dòng gốc "
                       "dài hơn khổ giấy nên bị bọc xuống dòng dưới — không phải ký tự của chương trình."
                       % esc(hb.WRAP_MARK), styles["small"]))

    sim = [(e.code, ", ".join(e.sim_tags)) for e in entries if e.sim_tags]
    nosim = [e.code for e in entries if not e.sim_tags]
    f.append(section(styles, "BÀI NÀO CHẤM TRÊN BẢN MÔ PHỎNG", "label_warn"))
    f.append(Paragraph("Rút máy móc từ chuỗi <font face=\"HBMono\" size=\"8\">step_4.env</font> của từng "
                       "bài. Đây là bảng tra nhanh; chữ đầy đủ nằm ở khung cam trong trang bài.",
                       styles["small"]))
    if sim:
        f.append(kv_table(styles, [[Paragraph(esc(c), styles["cell_bold"]), Paragraph(esc(t), styles["cell"])]
                                   for c, t in sim],
                          [0.12 * FRAME_W, 0.88 * FRAME_W], header=["Mã bài", "Hệ thống bị mô phỏng"]))
    if nosim:
        f.append(Paragraph("Không có ghi chú mô phỏng trong env: %s." % esc(", ".join(nosim)), styles["small"]))
    return f


def build(out_dir: str, adv_dir: str, pdf_path: str, build_date: str, only=None) -> dict:
    font_used = hb._register_fonts()
    styles = make_styles()

    codes = [c for c in SCOPE_CODES if not only or c in only]
    entries, absent = load_entries(out_dir, adv_dir, codes)
    bad_only = [c for c in (only or []) if c not in SCOPE_CODES]

    doc = AnswerKeyDoc(
        pdf_path,
        leftMargin=MARGIN_X, rightMargin=MARGIN_X, topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOTTOM,
        title="Python nâng cao · Bản đáp án 20 bài đầu (không phát cho học viên)",
        author="pe_usth / scripts/pe-v4/answerkey.py",
        subject="Đáp án cho giảng viên và cố vấn buổi chạy thử",
        invariant=1,  # không nhét timestamp vào PDF -> chạy lại ra file y hệt
    )
    doc.build_date = build_date

    story = [NextPageTemplate("body")]
    story += cover_flowables(styles, entries, absent, build_date, only)
    story.append(PageBreak())
    story += howto_flowables(styles, entries)
    story.append(PageBreak())

    toc = TableOfContents()
    toc.levelStyles = [styles["toc1"], styles["toc2"]]
    story.append(Paragraph("Mục lục", styles["h1"]))
    story.append(Paragraph("Số trang là trang PDF. Mỗi bài bắt đầu ở một trang mới.", styles["small"]))
    story.append(Spacer(1, 4))
    story.append(toc)
    story.append(PageBreak())

    # Nhóm theo module, giữ thứ tự curriculum như sổ tay (cùng một hàm, cùng kết quả).
    _, order = hb.load_curriculum(out_dir)
    by_module, mod_order = {}, []
    for e in entries:
        if e.lesson.module not in by_module:
            by_module[e.lesson.module] = []
            mod_order.append(e.lesson.module)
        by_module[e.lesson.module].append(e)
    mods = [m for m in order if m in by_module] + [m for m in mod_order if m not in order]

    for mi, title in enumerate(mods):
        group = by_module[title]
        if mi:
            story.append(PageBreak())
        head = Paragraph(esc(title), styles["h1"])
        head._toc_level, head._toc_text = 0, title
        story.append(head)
        sim = [e.code for e in group if e.sim_tags]
        story.append(Paragraph(
            "%d bài trong phạm vi: %s. Chấm trên bản mô phỏng: %s."
            % (len(group), ", ".join(e.code for e in group), ", ".join(sim) if sim else "không bài nào"),
            styles["small"]))
        # Bài đầu của module đi liền sau tiêu đề module, KHÔNG sang trang: ba dòng
        # giới thiệu module không đáng một mặt giấy trong tập 20 bài.
        for li, e in enumerate(group):
            if li:
                story.append(PageBreak())
            flows = lesson_flowables(e, styles)
            entry = Paragraph(esc(e.lesson.title), styles["lesson_title"])
            entry._toc_level, entry._toc_text = 1, e.lesson.title
            entry._toc_tag = "%s · %s" % (e.code, e.short_title)
            flows[0] = entry
            story.extend(flows)

    doc.multiBuild(story)
    return {
        "pdf": pdf_path,
        "font": font_used,
        "pages": doc.page,
        "bytes": os.path.getsize(pdf_path),
        "entries": entries,
        "absent": absent,
        "bad_only": bad_only,
        "modules": [(t, len(by_module[t])) for t in mods],
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description="Dựng bản đáp án PDF cho 20 bài đầu của pe-v4")
    ap.add_argument("--out-dir", default=OUT_DIR, help="thư mục out của pe-v4 (lessons v1 + qa.json)")
    ap.add_argument("--adv-dir", default=ADV_DIR, help="thư mục out-advanced (lessons v2 mang play)")
    ap.add_argument("--pdf", default=None, help="đường dẫn PDF đích")
    ap.add_argument("--date", default=BUILD_DATE, help="ngày build in trên bìa (cố định để output tất định)")
    ap.add_argument("--only", default="", help="chỉ dựng các mã bài này, cách nhau bằng dấu phẩy "
                                              "(ra FILE RIÊNG để không ghi đè bản đủ 20 bài)")
    args = ap.parse_args(argv)

    only = [c.strip().upper() for c in args.only.split(",") if c.strip()] or None
    pdf = args.pdf
    if not pdf:
        # --only ra file riêng: bản đủ 20 bài là tài liệu được in và phát cho giảng
        # viên, ghi đè nó bằng một bản xem nhanh 1 bài là tai nạn chờ xảy ra.
        pdf = (DEFAULT_PDF if not only
               else os.path.join(OUT_DIR, "python-advanced-answerkey-only-%s.pdf" % "-".join(only)))

    info = build(args.out_dir, args.adv_dir, pdf, args.date, only)
    print("Bản đáp án: %s" % info["pdf"])
    print("  font Unicode: %s" % info["font"])
    print("  %d trang · %.1f KB" % (info["pages"], info["bytes"] / 1024))
    print("  %d bài trong %d module:" % (len(info["entries"]), len(info["modules"])))
    for title, n in info["modules"]:
        print("    - %s: %d bài" % (title, n))
    n_games = sum(len(e.games) for e in info["entries"])
    n_tests = sum(len(e.qa.get("tests") or e.s4.get("tests") or []) for e in info["entries"])
    n_bad = sum(len(e.qa.get("bad") or []) for e in info["entries"])
    print("  %d ca chấm · %d màn mini-game · %d biến thể sai" % (n_tests, n_games, n_bad))
    flagged = [e for e in info["entries"] if e.notes]
    for e in flagged:
        for n in e.notes:
            print("  CẢNH BÁO %s: %s" % (e.code, n))
    if info["absent"]:
        print("  CẢNH BÁO: thiếu %d mã bài trong phạm vi: %s"
              % (len(info["absent"]), ", ".join(info["absent"])))
    else:
        print("  đủ %d/%d mã bài trong phạm vi" % (len(info["entries"]), len(SCOPE_CODES)))
    if info["bad_only"]:
        print("  CẢNH BÁO: --only có mã ngoài phạm vi 20 bài, bị bỏ qua: %s" % ", ".join(info["bad_only"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
