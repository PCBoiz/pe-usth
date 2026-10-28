"""Kiểm VĂN PHONG phần giảng của pe-da — thi hành scripts/pe-da/VAN-PHONG.md.

    py -I scripts/pe-da/check_vanphong.py              # kiểm, in bảng theo luật
    py -I scripts/pe-da/check_vanphong.py --strict      # cảnh báo cũng tính là lỗi
    py -I scripts/pe-da/check_vanphong.py --luat L3,L10 # chỉ chạy vài luật
    py -I scripts/pe-da/check_vanphong.py --chi-tiet 0  # in HẾT, không cắt bớt

Khác `check.py`: file đó kiểm CẤU TRÚC bản dựng (khối lạ, hình thiếu, ca chấm
lệch nguồn), file này kiểm CHỮ trong `source/course.json` — cái mà người học đọc
và cái mà phản hồi "người chưa từng tiếp xúc Python thấy khó hiểu" nói về.

Vì sao đọc NGUỒN chứ không đọc bản dựng: văn phong là thứ người soạn sửa, và họ
sửa ở `source/course.json`. Bắt lỗi ở `out/` là bắt lỗi ở một bản chép — người
soạn phải tự lần ngược về chỗ sửa. Bản dựng không thêm hay bỏ chữ nào của phần
giảng (`khoi_doc` chỉ đổi hình dạng khối), nên hai nơi nói cùng một chuyện về
chữ.

HAI TIỀN XỬ LÝ BẮT BUỘC (§10). Thiếu một trong hai là MỌI phép đếm sai:
  1. nội dung trong `` ` `` thay bằng một token trơ TRƯỚC khi đếm — nếu không,
     `df.groupby("month")["revenue"].sum()` được tính là bốn thuật ngữ tiếng Anh
     và năm tiếng, trong khi người đọc thấy nó là MỘT khối mã;
  2. `.replace('\\r', '')` — cây mã là CRLF và `.` của regex không khớp `\\r`,
     nên câu cuối mỗi dòng bị tính lẫn sang dòng sau. Bẫy này đã ghi trong
     AGENTS.md và đã cắn hai lần (`label-version`, bóc chú thích cuối dòng).

ĐƠN VỊ ĐẾM LÀ TIẾNG (âm tiết), KHÔNG phải "từ" (§10). Tiếng Việt viết rời theo
tiếng nên tách theo khoảng trắng là đúng; cài tách từ (underthesea/VnCoreNLP)
thêm ~3% nhiễu vào mọi ngưỡng mà không đổi được kết luận nào.

Và ĐỌC §9 trước khi tin bộ này: nó KHÔNG đếm được "ý" (nên L2 chỉ là xấp xỉ),
KHÔNG dò được giọng trung tính (L6 là danh sách hữu hạn nên sẽ bỏ sót), và L10
chỉ kiểm CÓ MẶT chú giải, không kiểm chú giải đúng hay đủ.

MỐC ĐO ngày 29/10/2026 trên 172 bài / 738 đoạn / 2 182 câu / 544 màn (số đoạn và
số màn khớp đúng "danh-từ-hoá đầu đoạn 1/738" của §6 và "544 màn đọc" của
AGENTS.md — đó là phép kiểm rẻ nhất cho hai tiền xử lý và cho bản chép
`chia_man`):

    L1 25 lỗi / 94 cb · L2 7/19 · L3 48/0 · L4 6/0 · L5 2/0 · L6 11/0 ·
    L7 0/19 · L8 43/30 · L9 0/0 · L10 65/0 · L11 16/0 · L12 4/43 ·
    L13 0/247 · TB 0/0 · §4-A 0/266

BA CHỖ LỆCH SO VỚI §11, và cả ba là lệch THẬT, không phải chỗ để chỉnh ngưỡng
cho khớp:

1. **L1/L3 phụ thuộc vào PHÉP CHẺ CÂU, mà §11 không định nghĩa phép chẻ nào.**
   Đếm được: chẻ ở `.!?…` cho 2 182 câu, L1 = 38 câu > 30 tiếng, L3 = 48; thêm
   `;` và `:` vào phép chẻ cho 2 750 câu (gần đúng con số 2 791 mà §6 dùng cho
   hedge), L1 còn 8, L3 KHÔNG CÒN CHẠY ĐƯỢC vì `;` là thứ chính L3 phải đếm
   BÊN TRONG một câu. §2 lại nói 3 059 câu, tức đặc tả mang ÍT NHẤT BA phép đo
   của ba phép chẻ khác nhau. Bộ này chọn `.!?…` vì đó là phép chẻ duy nhất để
   cả L1 và L3 cùng chạy được, và nói ra con số của phương án kia thay vì im.
2. **L8/L9/L10 tỉ lệ với ĐỘ LỚN CỦA TERMBANK**, nên con số tuyệt đối của §11
   không so trực tiếp được. §1 đo "23/40 từ thông dụng nhất không bao giờ được
   định nghĩa"; bộ này, giới hạn lại đúng 40 thuật ngữ thông dụng nhất, cho
   **27/31** — cùng một hiện tượng, cùng một cỡ. Mở ra cả 110 mục thì L10 = 65.
   Cùng lý đó, L8 ở đây có trung vị 32 / p90 90 / max 166 (RC01) so với 15/46/96
   của §1: xấp xỉ gấp đôi, đúng tỉ lệ số thuật ngữ được khai.
3. **L9 KHÔNG tái lập được "max 13".** Đếm trên 544 màn: trung vị 0, max 3, 0 ca
   vi phạm. Không phải vì luật không chạy — ablate (dồn 6 thuật ngữ chưa gặp vào
   màn đầu PY01) làm nó đỏ ngay. Nguyên nhân là "max 13" của §1 đếm TỪ TIẾNG ANH
   trong văn xuôi, còn L9 ở §4 đếm MỤC TERMBANK; 110 mục trải trên 544 màn thì
   không màn nào gánh quá 3. Hai phép đếm khác nhau, và chỉ phép đếm theo
   termbank là thứ người soạn sửa được.

Và hai chỗ đặc tả tự mâu thuẫn, ghi lại để lần sau không ai đi chỉnh script cho
khớp một con số không đứng được:

  · L12 — §6 nói "câu có ≥2 hedge 6/2791" còn §11 nói "10 câu"; không thể có 10
    câu ≥3 hedge mà chỉ 6 câu ≥2 hedge, vì tập sau chứa tập trước. Bộ này đếm
    447 hedge (so với 703 của §6, danh sách hedge hẹp hơn), 47 câu ≥2 và 4 câu
    ≥3. Ngưỡng lỗi đặt ở 3 theo §6 ("cấm là CHỒNG", không cấm `có thể`).
  · L6 — ra ĐÚNG 11 như §11, nhưng phân rã là `thực hiện` 3 + `một cách` 8, và
    ít nhất 4 trong 8 ca `một cách` là DƯƠNG TÍNH GIẢ: "một cách truy cập",
    "một cách gom", "một cách nêu" là danh ngữ ("một cách để…"), không phải
    trạng ngữ "một cách + tính từ" mà §6 cấm. Phân biệt hai nghĩa đó cần biết
    từ loại của từ đứng sau, tức cần tách từ — thứ §10 nói rõ là đừng cài. Con
    số 11 khớp đặc tả có lẽ vì đặc tả cũng đo bằng đúng phép dò này.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'source' / 'course.json'
TERMBANK = HERE / 'thuatngu.json'

LOI: list[tuple[str, str]] = []
CANH_BAO: list[tuple[str, str]] = []

# Mô tả ngắn từng luật, dùng cho bảng tổng kết. Khớp §11 của VAN-PHONG.md.
TEN_LUAT = {
    'L1': 'câu > 25 tiếng (cảnh báo) / > 30 tiếng (lỗi)',
    'L2': 'đoạn > 90 tiếng hoặc > 6 câu (cảnh báo) / 110 tiếng hoặc 8 câu (lỗi)',
    'L3': 'câu ≥ 3 dấu , hoặc ; VÀ ≥ 20 tiếng → phải thành bullet/bảng',
    'L4': 'không mở câu bằng danh-từ-hoá (Việc/Sự/Quá trình/Khả năng…)',
    'L5': 'cấm khuôn sao phỏng `được/bị + V + bởi`',
    'L6': 'từ cấm hành chính',
    'L7': 'chỉ xưng "bạn"',
    'L8': 'mật độ thuật ngữ ≤ 40/1000 tiếng (lỗi > 60)',
    'L9': '≤ 3 thuật ngữ MỚI mỗi màn đọc (lỗi > 5)',
    'L10': 'thuật ngữ lần đầu toàn khoá phải có chú giải',
    'L11': 'một thuật ngữ một cách gọi',
    'L12': '≤ 1 hedge mỗi câu (lỗi từ 3)',
    'L13': 'ưu tiên từ thuần Việt theo nhóm B của termbank',
    'TB': 'bất biến của chính termbank',
    '§4-A': 'định danh trong code phải nằm trong backtick',
}

# ── Tiền xử lý ────────────────────────────────────────────────────────────
# Token trơ thay cho nội dung backtick. Phải là MỘT tiếng, không mang chữ cái
# (để không khớp thuật ngữ nào) và không mang dấu kết câu (để không chẻ câu).
TRO = '◆'
BACKTICK = re.compile(r'`[^`]*`')
# `;` KHÔNG phải dấu kết câu ở đây: chính L3 đếm nó bên TRONG một câu, nên coi
# nó là dấu kết câu thì L3 không bao giờ bắt được ca nào.
HET_CAU = re.compile(r'(?<=[.!?…])\s+')
CHI_DAU = re.compile(r'^[\W_]+$', re.UNICODE)


def chuan(text: str) -> str:
    """Hai tiền xử lý bắt buộc của §10, theo đúng thứ tự."""
    return BACKTICK.sub(TRO, text.replace('\r', ''))


def cau_cua(doan: str) -> list[str]:
    """Chẻ đoạn thành câu. Số thập phân (`0.5`) không bị chẻ vì sau dấu chấm
    không có khoảng trắng — đó cũng là lý do không dùng `.split('.')`."""
    return [c.strip() for c in HET_CAU.split(doan) if c.strip()]


def tieng(s: str) -> list[str]:
    """Đếm theo TIẾNG: tách khoảng trắng, bỏ token chỉ có dấu câu."""
    return [t for t in s.split() if not CHI_DAU.match(t)]


# ── Termbank ──────────────────────────────────────────────────────────────
class Muc:
    """Một mục termbank, kèm sẵn regex đã biên dịch.

    Khoá là (thuatNgu, nguCanh) — KHÔNG phải một trường. `phamVi` là thứ làm
    khoá hai trường CHẠY ĐƯỢC: không có nó script không biết "stack" ở PD20 là
    nghĩa pandas hay nghĩa call stack, và hai nghĩa đó bị trộn thành một.
    """

    __slots__ = ('tn', 'nhom', 'nguc', 'tv', 'chu_giai', 'pham_vi', 'bai_dau',
                 're_tn', 're_tv')

    def __init__(self, d: dict) -> None:
        self.tn = d['thuatNgu']
        self.nhom = d['nhom']
        self.nguc = d['nguCanh']
        self.tv = d.get('tiengViet')
        self.chu_giai = d.get('chuGiai')
        self.pham_vi = tuple(d.get('phamVi') or ())
        self.bai_dau = d.get('baiDauTien')
        # Viết hoa toàn bộ (GIL, CPU, API) thì phân biệt hoa-thường: khớp lỏng
        # sẽ bắt cả những tiếng Việt không dấu tình cờ trùng. Còn lại khớp lỏng
        # vì thuật ngữ đứng đầu câu bị viết hoa ("Stack giữ khung lời gọi hàm").
        co = 0 if self.tn.isupper() else re.IGNORECASE
        self.re_tn = re.compile(r'(?<![\w])' + re.escape(self.tn) + r'(?![\w])', co)
        self.re_tv = (re.compile(r'(?<![\w])' + re.escape(self.tv) + r'(?![\w])',
                                 re.IGNORECASE) if self.tv else None)

    @property
    def khoa(self) -> tuple[str, str]:
        return (self.tn, self.nguc)

    def trong_bai(self, ma: str) -> bool:
        return not self.pham_vi or any(ma.startswith(p) for p in self.pham_vi)


def nap_termbank() -> list[Muc]:
    if not TERMBANK.is_file():
        print(f'LỖI: không có {TERMBANK} — L8/L9/L10/L11/L13 không chạy được.',
              file=sys.stderr)
        sys.exit(1)
    data = json.loads(TERMBANK.read_text(encoding='utf-8'))
    return [Muc(d) for d in data['thuatNgu']]


def kiem_termbank(bank: list[Muc], bai: list[dict]) -> None:
    """Bất biến của chính termbank, và phép đối chiếu `baiDauTien` với corpus.

    Vì sao phải đối chiếu lại mỗi lần chạy: `baiDauTien` là một con số thứ hai
    phải khớp với cây mã. AGENTS.md đã ghi đúng họ bẫy này — dòng đếm ca test
    ghi 204 trong khi cây mã có 134, và "một con số cũ trong bảng không phải
    chú thích lỗi thời vô hại". Người soạn chèn một đoạn mới vào giữa khoá là
    `baiDauTien` lệch ngay, và khi đó L10 đi kiểm chú giải Ở SAI BÀI — nó báo
    xanh cho một thuật ngữ thật ra chưa bao giờ được chú giải.
    """
    thay = Counter()
    for m in bank:
        thay[m.khoa] += 1
        if m.nhom not in ('A', 'B', 'C'):
            loi('TB', f'{m.tn}/{m.nguc}: nhóm lạ {m.nhom!r} — chỉ có A/B/C (§4)')
        if m.nhom == 'B' and not m.tv:
            loi('TB', f'{m.tn}/{m.nguc}: nhóm B mà không có `tiengViet` — '
                      'L13 không có gì để đề nghị thay')
        if m.nhom != 'B' and m.tv:
            loi('TB', f'{m.tn}/{m.nguc}: nhóm {m.nhom} mà có `tiengViet` — '
                      'nhóm A giữ nguyên, nhóm C ĐỪNG dịch cố (§4)')
        if m.nhom in ('B', 'C') and not (m.chu_giai or '').strip():
            loi('TB', f'{m.tn}/{m.nguc}: nhóm {m.nhom} mà không có `chuGiai` — '
                      'L10 đòi một chú giải mà termbank không gợi được câu nào')
    for khoa, n in thay.items():
        if n > 1:
            loi('TB', f'{khoa[0]}/{khoa[1]}: {n} mục cùng khoá (thuật ngữ, ngữ cảnh)')

    thuc = {}
    for l in bai:
        for d in doan_cua(l):
            for m in bank:
                if m.khoa in thuc or not m.trong_bai(l['id']):
                    continue
                if m.re_tn.search(d):
                    thuc[m.khoa] = l['id']
    for m in bank:
        that = thuc.get(m.khoa)
        if that is None:
            loi('TB', f'{m.tn}/{m.nguc}: khai `baiDauTien`={m.bai_dau} nhưng '
                      'KHÔNG xuất hiện ở đâu trong corpus (ngoài backtick)')
        elif that != m.bai_dau:
            loi('TB', f'{m.tn}/{m.nguc}: `baiDauTien`={m.bai_dau} nhưng corpus '
                      f'dùng lần đầu ở {that}')


# ── Đọc corpus ────────────────────────────────────────────────────────────
def doan_cua(l: dict) -> list[str]:
    """Các đoạn văn của phần giảng, ĐÃ qua hai tiền xử lý.

    Chỉ `paragraph`: khối `code`/`terminal` là mã, `figure`/`table` là nhãn
    giao diện. Đo văn phong trên mã là đo sai thứ.
    """
    return [chuan(k['text']) for k in (l.get('reading') or [])
            if k.get('type') == 'paragraph' and (k.get('text') or '').strip()]


def chia_man(reading: list[dict]) -> list[list[dict]]:
    """Bản CHÉP của `chia_man()` trong build.py — cố ý chép, không import.

    Cùng lý lẽ với `_noi_nhu_build()` trong check.py: import thì một lỗi trong
    `chia_man` xuất hiện ở cả hai phía phép so, và L9 không chứng minh được gì
    về số màn mà người học thật sự thấy. Hai bản phải khớp từng dòng.
    """
    man: list[list[dict]] = []
    hien_tai: list[dict] = []
    da_co_code = False
    for khoi in reading:
        if khoi['type'] == 'paragraph' and da_co_code and len(hien_tai) >= 2:
            man.append(hien_tai)
            hien_tai = []
            da_co_code = False
        hien_tai.append(khoi)
        if khoi['type'] == 'code':
            da_co_code = True
    if hien_tai:
        if len(hien_tai) == 1 and man:
            man[-1].extend(hien_tai)
        else:
            man.append(hien_tai)
    return man


# ── L1, L2, L3: độ dài và câu nhồi mệnh đề ────────────────────────────────
def kiem_do_dai(bai: list[dict]) -> None:
    """L1 + L2 + L3.

    L1/L2 là HÀNG RÀO CHỐNG TỤT, không phải việc phải làm: §2 đo được trung vị
    13 từ, p90 22, và chỉ 1,2% câu dài hơn 30 từ. Đừng mở một đợt "chẻ câu cho
    ngắn" dựa vào L1 — nó sẽ sửa đúng thứ không hỏng.

    L3 mới là luật có răng: cái sai ở 20 câu dài nhất là dấu `;` nhồi mệnh đề
    (15/20), tức MỘT BẢNG ĐỊNH NGHĨA BỊ NÉN THÀNH MỘT CÂU. Cách sửa là đổi sang
    bullet hoặc bảng, không phải cắt câu làm hai.
    """
    for l in bai:
        ma = l['id']
        for i, d in enumerate(doan_cua(l)):
            cs = cau_cua(d)
            n_tieng = len(tieng(d))
            if n_tieng > 110 or len(cs) > 8:
                loi('L2', f'{ma} đoạn {i}: {n_tieng} tiếng / {len(cs)} câu')
            elif n_tieng > 90 or len(cs) > 6:
                canh_bao('L2', f'{ma} đoạn {i}: {n_tieng} tiếng / {len(cs)} câu')
            for c in cs:
                n = len(tieng(c))
                dau = c.count(',') + c.count(';')
                # L3 trước L1: cùng một câu thì "chẻ thành bảng" là lời khuyên
                # đúng, còn "viết ngắn lại" là lời khuyên sai.
                if dau >= 3 and n >= 20:
                    loi('L3', f'{ma}: {n} tiếng, {dau} dấu , hoặc ; — '
                              f'phải thành bullet/bảng · {goi(c)}')
                elif n > 30:
                    loi('L1', f'{ma}: câu {n} tiếng · {goi(c)}')
                elif n > 25:
                    canh_bao('L1', f'{ma}: câu {n} tiếng · {goi(c)}')


def goi(c: str, n: int = 90) -> str:
    """Trích gọn một câu cho thông điệp lỗi."""
    c = ' '.join(c.split())
    return c if len(c) <= n else c[:n - 1] + '…'


# ── L4, L5, L6, L7, L12: khuôn chữ ────────────────────────────────────────
# L4 PHẢI neo vào ĐẦU CÂU. §6 đã đo: dò bằng `\bviệc\s+\w` ra 76 kết quả với
# ~95% dương tính giả (`làm việc`, `công việc`, `việc này`, `khỏi việc`).
DANH_TU_HOA = re.compile(
    r'^(Việc|Sự|Quá trình|Khả năng|Tính)\s+([^\W\d_]+)', re.UNICODE)
# Những từ theo sau làm cho cả cụm là một DANH NGỮ bình thường, không phải
# danh-từ-hoá một động từ: "Việc này…", "Sự kiện chuột…", "Khả năng đọc…".
SAU_KHONG_PHAI_DONG_TU = {
    'này', 'đó', 'ấy', 'kiện', 'thật', 'việc', 'kia', 'nào', 'gì',
}

# L5: ĐỪNG viết bộ dò câu bị động tiếng Việt. §6: giới ngôn ngữ học chưa thống
# nhất tiếng Việt có bị động hay không, và corpus có 230 `được+V` + 45 `bị+V`
# gần hết vô tội. Chỉ khuôn sao phỏng có `bởi` là sai chắc chắn.
BOI = re.compile(r'(?<![\w])(được|bị)\s+(\S+\s+){0,3}bởi(?![\w])', re.IGNORECASE)

# L6: danh sách HỮU HẠN nên SẼ BỎ SÓT (§9.2). Nó là hàng rào chống tụt, không
# phải phép đo giọng.
TU_CAM = [
    (re.compile(r'(?<![\w])tiến hành(?![\w])', re.I), 'tiến hành'),
    (re.compile(r'(?<![\w])đối với(?![\w])', re.I), 'đối với'),
    (re.compile(r'(?<![\w])nhằm(?![\w])', re.I), 'nhằm'),
    (re.compile(r'(?<![\w])thông qua việc(?![\w])', re.I), 'thông qua việc'),
    (re.compile(r'(?<![\w])vui lòng(?![\w])', re.I), 'vui lòng'),
    (re.compile(r'(?<![\w])thực hiện(?![\w])', re.I), 'thực hiện'),
    (re.compile(r'(?<![\w])một cách\s+[^\W\d_]+', re.I | re.U), 'một cách + tính từ'),
]

# L7: chỉ "bạn". `người dùng` CHỈ cảnh báo — nó có nghĩa thứ hai hợp lệ (người
# dùng của chương trình mà học viên viết), và đó là nghĩa đúng ở gần hết corpus.
XUNG_HO = [
    (re.compile(r'(?<![\w])chúng ta(?![\w])', re.I), 'chúng ta', True),
    (re.compile(r'(?<![\w])quý vị(?![\w])', re.I), 'quý vị', True),
    (re.compile(r'(?<![\w])các em(?![\w])', re.I), 'các em', True),
    (re.compile(r'(?<![\w])ta(?![\w])', re.I), 'ta', True),
    (re.compile(r'(?<![\w])người dùng(?![\w])', re.I), 'người dùng', False),
]

# L12: KHÔNG cấm `có thể` — nhiều chỗ nó đúng và cần. Cấm là CHỒNG.
HEDGE = [re.compile(r'(?<![\w])' + p + r'(?![\w])', re.I) for p in [
    r'có thể', r'có lẽ', r'thường', r'thường xuyên', r'đôi khi', r'có khi',
    r'nhiều khi', r'thỉnh thoảng', r'khoảng', r'hầu như', r'gần như',
    r'phần lớn', r'nói chung', r'thông thường', r'dường như', r'có vẻ',
    r'tương đối', r'khá', r'chưa hẳn', r'không hẳn', r'chưa chắc',
    r'không nhất thiết', r'ít nhiều', r'tuỳ', r'tùy',
]]


def kiem_khuon_chu(bai: list[dict]) -> None:
    """L4, L5, L6, L7, L12 — đều chạy trên CÂU đã qua tiền xử lý."""
    for l in bai:
        ma = l['id']
        for d in doan_cua(l):
            for c in cau_cua(d):
                m = DANH_TU_HOA.match(c)
                if m and m.group(2).lower() not in SAU_KHONG_PHAI_DONG_TU:
                    loi('L4', f'{ma}: mở câu bằng "{m.group(0)}" · {goi(c)}')
                if BOI.search(c):
                    loi('L5', f'{ma}: khuôn `được/bị + V + bởi` · {goi(c)}')
                for rx, ten in TU_CAM:
                    if rx.search(c):
                        loi('L6', f'{ma}: từ cấm "{ten}" · {goi(c)}')
                for rx, ten, nang in XUNG_HO:
                    if rx.search(c):
                        (loi if nang else canh_bao)(
                            'L7', f'{ma}: xưng hô "{ten}" — chỉ dùng "bạn" · {goi(c)}')
                n_hedge = sum(len(rx.findall(c)) for rx in HEDGE)
                # ≥3 là LỖI vì đó là con số §6 đã đo (10 câu, nặng nhất 4); 2 là
                # cảnh báo. Ngưỡng ở 2 mà tính lỗi thì luật đi cấm cả những câu
                # mà §6 nói rõ là vô tội.
                if n_hedge >= 3:
                    loi('L12', f'{ma}: {n_hedge} hedge chồng trong một câu · {goi(c)}')
                elif n_hedge == 2:
                    canh_bao('L12', f'{ma}: 2 hedge trong một câu · {goi(c)}')


# ── L8, L9, L10, L11, L13, §4-A: thuật ngữ ────────────────────────────────
def thuat_ngu_trong(d: str, bank: list[Muc], ma: str) -> list[tuple[Muc, int]]:
    """(mục termbank, số lần xuất hiện) trong một đoạn ĐÃ bỏ backtick.

    Chỉ những mục có nghĩa áp dụng cho bài này — đó là chỗ khoá hai trường được
    dùng thật, không chỉ được khai.
    """
    ra = []
    for m in bank:
        if not m.trong_bai(ma):
            continue
        n = len(m.re_tn.findall(d))
        if n:
            ra.append((m, n))
    return ra


def kiem_thuat_ngu(bai: list[dict], bank: list[Muc]) -> None:
    """L8 (mật độ) + L9 (thuật ngữ mới mỗi màn) + L10 (chú giải lần đầu)
    + L11 (một cách gọi) + L13 (ưu tiên thuần Việt) + §4-A (backtick).

    Bốn luật L3/L8/L9/L10 CÙNG nói một chuyện và là phần đáng làm trước mọi thứ
    khác (§1): hai phép đo độc lập đều dừng ở "một màn đọc mang quá nhiều khái
    niệm mới", chứ không ở độ dài câu.
    """
    da_gap: dict[tuple[str, str], str] = {}

    for l in bai:
        ma = l['id']
        doan = doan_cua(l)

        # L8 — mật độ tính trên CẢ BÀI: một đoạn ngắn toàn thuật ngữ nằm cạnh
        # một đoạn dài không có gì vẫn là một bài người học đọc liền mạch.
        tong_tieng = sum(len(tieng(d)) for d in doan)
        tong_tn = sum(n for d in doan for _, n in thuat_ngu_trong(d, bank, ma))
        if tong_tieng >= 50:
            mat_do = tong_tn * 1000 / tong_tieng
            if mat_do > 60:
                loi('L8', f'{ma}: {mat_do:.0f} thuật ngữ/1000 tiếng '
                          f'({tong_tn} lần / {tong_tieng} tiếng)')
            elif mat_do > 40:
                canh_bao('L8', f'{ma}: {mat_do:.0f} thuật ngữ/1000 tiếng '
                               f'({tong_tn} lần / {tong_tieng} tiếng)')

        # L9 + L10 + §4-A — duyệt theo MÀN, đúng thứ tự người học đọc.
        for i, man in enumerate(chia_man(l.get('reading') or [])):
            moi: list[Muc] = []
            for k in man:
                if k.get('type') != 'paragraph' or not (k.get('text') or '').strip():
                    continue
                d = chuan(k['text'])
                for m, _ in thuat_ngu_trong(d, bank, ma):
                    if m.nhom == 'A':
                        # §4 hàng A: định danh trong code phải LUÔN trong
                        # backtick. Sau tiền xử lý, một định danh còn sót lại
                        # nghĩa là nó đang đứng trần trong văn xuôi.
                        canh_bao('§4-A', f'{ma} màn {i}: `{m.tn}` đứng trần ngoài '
                                         f'backtick · {goi(d)}')
                        continue
                    if m.khoa in da_gap:
                        continue
                    da_gap[m.khoa] = ma
                    moi.append(m)
                    if not co_chu_giai(d, m):
                        loi('L10', f'{ma}: "{m.tn}" ({m.nguc}) dùng lần ĐẦU toàn '
                                   'khoá mà không có chú giải tại chỗ · '
                                   f'{goi(cau_chua(d, m))}')
            if len(moi) > 5:
                loi('L9', f'{ma} màn {i}: {len(moi)} thuật ngữ mới '
                          f'({", ".join(m.tn for m in moi)}) — chẻ màn ra')
            elif len(moi) > 3:
                canh_bao('L9', f'{ma} màn {i}: {len(moi)} thuật ngữ mới '
                               f'({", ".join(m.tn for m in moi)})')

        # L11 + L13 — nhóm B: tiếng Việt là cách gọi chính.
        for d in doan:
            for m, n in thuat_ngu_trong(d, bank, ma):
                if m.nhom != 'B' or m.re_tv is None:
                    continue
                co_tv = bool(m.re_tv.search(d))
                if ma == m.bai_dau:
                    # BÀI CHÚ GIẢI được miễn cả L11 lẫn L13, và miễn là BẮT
                    # BUỘC, không phải nới tay: chính khuôn chú giải của §10
                    # ("Bộ đệm (buffer) gom dữ liệu…") đặt hai tên cạnh nhau,
                    # nên không miễn thì L11 báo oan ĐÚNG những bài làm đúng —
                    # 8/24 ca của bản đầu là như vậy, trong đó có cả ba ví dụ ✅
                    # mà §1 nêu (NP02, SY17, NP13).
                    continue
                if co_tv:
                    # Hai cách gọi cùng một thứ, trong CÙNG MỘT ĐOẠN, ở một bài
                    # KHÔNG phải bài chú giải. Người đọc không có cách nào biết
                    # "thread" và "luồng" là một.
                    loi('L11', f'{ma}: gọi cùng một thứ bằng hai tên — '
                               f'"{m.tn}" và "{m.tv}" trong một đoạn · {goi(d)}')
                else:
                    canh_bao('L13', f'{ma}: dùng "{m.tn}" — nhóm B, '
                                    f'đã chốt gọi là "{m.tv}" (chú giải ở {m.bai_dau})')


# L10: ĐÚNG ba khuôn của §10, không thêm. Khuôn "X là <mô tả>" cố ý KHÔNG được
# nhận, và đó là lựa chọn của đặc tả chứ không phải chỗ bỏ sót: §1 dẫn CT01
# "File descriptor là số nhận diện tài nguyên I/O đang mở" làm ví dụ ❌. Lý do
# đứng được: "X là Y" khớp với mọi câu kể về X, nên nhận nó là mở cửa cho mọi
# câu có chữ "là" — luật hết răng mà vẫn trông như hàng rào.
GOI_LA = re.compile(r'gọi là', re.IGNORECASE)


def cau_chua(d: str, m: Muc) -> str:
    for c in cau_cua(d):
        if m.re_tn.search(c):
            return c
    return d


def co_chu_giai(d: str, m: Muc) -> bool:
    """Lần xuất hiện đầu có khớp một trong ba khuôn chú giải không (§10)."""
    c = cau_chua(d, m)
    # Khuôn 1 — `Thuật ngữ tiếng Việt (tiếng Anh)`: "Bộ đệm (buffer) gom…"
    if re.search(r'\(\s*' + re.escape(m.tn) + r'\s*[,)]', c, re.IGNORECASE):
        return True
    # Khuôn 2 — `tiếng Anh (thuật ngữ tiếng Việt)`: "một index (chỉ số) đại diện…"
    if re.search(re.escape(m.tn) + r'\s*\([^)]*[^\W\d_][^)]*\)', c, re.IGNORECASE):
        return True
    # Khuôn 3 — `… gọi là X`: "…được gọi là mask."
    if GOI_LA.search(c):
        return True
    return False


# ── Khung chạy ────────────────────────────────────────────────────────────
def loi(luat: str, msg: str) -> None:
    LOI.append((luat, msg))


def canh_bao(luat: str, msg: str) -> None:
    CANH_BAO.append((luat, msg))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--strict', action='store_true',
                    help='cảnh báo cũng tính là lỗi')
    ap.add_argument('--luat', default='',
                    help='chỉ chạy/in vài luật, ví dụ L3,L10')
    ap.add_argument('--chi-tiet', type=int, default=5,
                    help='số dòng chi tiết mỗi luật (0 = in hết)')
    # CHỈ dùng cho phép ablate: trỏ vào một BẢN SAO corpus đã cố tình làm sai,
    # để chứng minh từng luật bắt được lỗi (AGENTS.md "Quy ước khi sửa": gỡ bản
    # sửa ra thì test phải trượt). Đừng dùng nó để kiểm một nguồn khác trong
    # thật — `source/course.json` là nguồn duy nhất build.py đọc.
    ap.add_argument('--nguon', default=str(SOURCE),
                    help='bản sao corpus để ablate (mặc định: source/course.json)')
    args = ap.parse_args()

    src = Path(args.nguon)
    if not src.is_file():
        print(f'LỖI: không có {src}', file=sys.stderr)
        return 1
    nguon = json.loads(src.read_text(encoding='utf-8'))
    bai = nguon['lessons']          # ĐÚNG thứ tự chương — L9/L10 phụ thuộc vào nó
    bank = nap_termbank()

    kiem_termbank(bank, bai)
    kiem_do_dai(bai)
    kiem_khuon_chu(bai)
    kiem_thuat_ngu(bai, bank)

    chon = {t.strip().upper() for t in args.luat.split(',') if t.strip()}
    def loc(xs: list[tuple[str, str]]) -> list[tuple[str, str]]:
        return [x for x in xs if not chon or x[0].upper() in chon]

    lo, cb = loc(LOI), loc(CANH_BAO)

    dem_lo, dem_cb = Counter(l for l, _ in lo), Counter(l for l, _ in cb)
    thu_tu = [f'L{i}' for i in range(1, 14)] + ['TB', '§4-A']
    # In CẢ luật đang 0. Một luật không bắt được ca nào là THÔNG TIN, không phải
    # chuyện im lặng được: nó có thể là corpus đã đạt, mà cũng có thể là luật
    # không thể trượt — "một luật không thể trượt trông như hàng rào mà không
    # phải" (check.py, kiem_trac_nghiem). Ẩn nó đi là bỏ mất phép phân biệt đó.
    print('luật  lỗi  cảnh báo  nội dung')
    for t in thu_tu:
        if chon and t.upper() not in chon:
            continue
        print(f'{t:5s} {dem_lo[t]:4d} {dem_cb[t]:9d}  {TEN_LUAT.get(t, "")}')

    for ten, xs, nhan, ra in (('cảnh báo', cb, 'cảnh báo', sys.stdout),
                              ('lỗi', lo, 'LỖI', sys.stderr)):
        theo = {}
        for luat, msg in xs:
            theo.setdefault(luat, []).append(msg)
        for t in thu_tu:
            ms = theo.get(t) or []
            if not ms:
                continue
            print(f'\n── {nhan} {t} · {len(ms)} ──', file=ra)
            hien = ms if args.chi_tiet <= 0 else ms[:args.chi_tiet]
            for msg in hien:
                print(f'{nhan}: {t} {msg}', file=ra)
            if len(ms) > len(hien):
                print(f'  … còn {len(ms) - len(hien)} nữa '
                      '(--chi-tiet 0 để xem hết)', file=ra)

    hong = len(lo) + (len(cb) if args.strict else 0)
    print(f'\n{len(bai)} bài · {len(bank)} thuật ngữ · {len(lo)} lỗi · '
          f'{len(cb)} cảnh báo'
          f'{" (strict: cảnh báo tính là lỗi)" if args.strict else ""}')
    return 1 if hong else 0


if __name__ == '__main__':
    sys.exit(main())
