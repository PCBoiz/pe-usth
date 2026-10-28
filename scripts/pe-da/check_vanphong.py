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

L14/L15 đo muộn hơn, trên `source/course.json` sha256 `a6d7b460aa4082f3`:

    L14 69 lỗi (28 miền-ngoài + 41 dữ-liệu-trơ) / 42 cb · L15 0/106

⚠️ Con số của L14/L15 là ẢNH CHỤP, và nó ĐÃ trôi trong lúc đo: module 1 được viết
lại theo câu chuyện quán cà phê ở một nhánh việc khác NGAY TRONG buổi đo, nên L14
đi 74/48 → 72/45 → 69/42 và dấu hiệu A của L15 đi 9 → 16 bài. Đo lại bằng
`--luat L14,L15` sau mỗi đợt viết lại, đừng tin lại con số này.

Phân bố theo module nói rõ việc còn lại nằm ở đâu, và nó cũng là bằng chứng hai
luật này đo đúng thứ chúng nói: **PY (18 bài, module vừa viết lại) có 0 lỗi L14,
0 cảnh báo L14 và 0 cảnh báo L15** — cả ba đều không phải vì luật bỏ qua nó mà vì
18 bài đó nay có bối cảnh quán cà phê và có câu nối. Còn lại:

    L14 lỗi  PD 24 · SY 16 · NP 9 · VZ 8 · RD 6 · GU 3 · EX 3
    L14 cb   GU 9 · NP 8 · SY 8 · CT 6 · PD 5 · VZ 4 · RC 1 · EX 1
    L15 cb   PD 29 · VZ 25 · NP 18 · SY 18 · GU 8 · RD 4 · EX 2 · CT 1 · RC 1

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

L14 VÀ L15 — bối cảnh và sự nối bài (thêm 29/10/2026)
=====================================================
Chúng trả lời một phản hồi của chủ dự án, không phải một mục nào của VAN-PHONG.md:
*"không có sự liên kết giữa các bài với nhau, như 1 hành trình để thực hiện hóa 1
cốc cà phê hay mở 1 quán cà phê."* Danh sách miền nằm ở `boi-canh.json`, không
nhúng vào đây — cùng lý lẽ với `thuatngu.json` (§4): nhiều luật đọc chung một
nguồn thì không lệch nhau được, và người sửa NỘI DUNG sửa được danh sách mà không
mở script.

**L14 là luật DUY NHẤT đọc vào trong backtick, và đó là cố ý.** Tiền xử lý số 1
của §10 (backtick → token trơ) tồn tại để phép đếm thuật ngữ và độ dài câu không
tính `df.groupby("month")` thành bốn thuật ngữ. Nhưng miền ví dụ sống ĐÚNG trong
chỗ đó: `cups_sold`, `sales.csv`, `marks.txt`. Bỏ backtick ra trước khi đo miền là
đo mù đúng nửa bằng chứng. Tiền xử lý số 2 (`\\r`) vẫn áp như mọi luật khác. Và
L14 đọc bản HỌC VIÊN thấy — `displayCode`/`displayExpected` khi có, chứ không phải
`code` — đúng cái bẫy AGENTS.md ghi ("lấy nhầm là dạy sai").

Biên từ khoá coi GẠCH DƯỚI là biên (`(?<![^\\W_])`), nên `cups` khớp trong
`total_cups` mà `cup` không khớp trong `cupboard`. Một danh sách dùng được cho cả
văn xuôi lẫn định danh snake_case.

**Ba con số của bản audit KHÔNG tái lập được, và cả ba lệch theo cùng một kiểu:**
đếm một từ có nghĩa thứ hai.
  · "thư viện/sách 39 bài" → đo lại: **0 bài**. Cả 35 lần `sách` là `danh sách`
    (list) và `chính sách`; cả 25 lần `thư viện` là THƯ VIỆN MÃ (`numpy`, `venv`,
    `.so`). Vì vậy `sách` và `thư viện` KHÔNG được làm từ khoá, và `boi-canh.json`
    có trường `loaiTru` để ghi lại đúng những cụm này.
  · "vé 6 bài" → chữ `vé` xuất hiện **0 lần** trong `source/course.json`. Con số 6
    đến từ một gói nội dung khác.
  · "file 23 bài" → `file` không phải MIỀN VÍ DỤ: bài dạy mở file buộc phải nói về
    file, và quán cà phê lưu đơn hàng vào file thì vẫn là quán cà phê. Nó ở trong
    `boi-canh.json` với vai trò `trungTinh` để không ai đếm nó thành miền lần nữa.
Hai con số tái lập được gần đúng: cà phê **32** (audit: 32) và bán hàng **38**
(audit: 39), đo ở ngưỡng ≥3 lần từ khoá.

**Ngưỡng 2 lần từ khoá** cho "bài DÙNG miền này". Đo cả ba ngưỡng trên corpus
(lỗi miền-ngoài + lỗi dữ-liệu-trơ / cảnh báo không-có-bối-cảnh):

    ngưỡng 1 → 35 + 51 = 86 lỗi / 32 cb
    ngưỡng 2 → 30 + 42 = 72 lỗi / 45 cb     ← đang dùng
    ngưỡng 3 → 24 + 36 = 60 lỗi / 56 cb

Chọn 2 vì hai đầu đều mất thứ cụ thể, và đây là danh sách những bài đổi phe:
  · lên ngưỡng 3 là MẤT GU03 và GU07 (`sinh viên` + `môn học` — form nhập điểm,
    miền ngoài rõ ràng), NP13/NP14 (`lượng mưa`×2 — bảng dữ liệu mưa), VZ28
    (`nhiệt độ` + `temperature`), PY16 (`hoá đơn` + `đơn giá` không gắn quán nào);
  · xuống ngưỡng 1 là THÊM SY01, PD24, PD25 (`đơn hàng`/`doanh thu` đúng MỘT lần
    trong một bài nói chuyện khác) — một lần nhắc qua không phải bối cảnh của bài.
Riêng phép NEO vào miền chính chỉ cần **1** lần (ngưỡng 2 làm số lỗi 42 → 47,
ngưỡng 3 → 50), và lệch hai ngưỡng này là có chủ đích: một L14 báo oan đẩy người
soạn đi XOÁ một ví dụ đang đúng, nên phía "bài đã có bối cảnh" phải rộng tay hơn
phía "bài dùng miền lạ".

**Dương tính giả ở miền CHÍNH tệ hơn ở miền ngoài** — nó làm một bài chưa neo
trông như đã neo, và luật im lặng. Đã bắt được một ca: `nhất quán` (= consistent,
10 lần trong corpus) là TOÀN BỘ dấu hiệu "quán" của PY09. Nó nằm trong `loaiTru`
của miền chính, cùng chỗ với `book` của PD13 (`with pd.ExcelFile(…) as book:` —
bằng chứng duy nhất của miền sách trong cả corpus, và nó không phải quyển sách
nào).

**L15 KHÔNG ĐÁNG TIN BẰNG MỌI LUẬT KHÁC TRONG BỘ NÀY, và con số nói rõ vì sao.**
Dấu hiệu A — đoạn mở bài có một cụm chỉ sự nối tiếp (`bài trước`, `vừa làm`,
`, giờ`, `… rồi.`, `tiếp tục`…) — đạt **16/171 bài**, và PHẦN LỚN là module 1 vừa
viết lại (lúc bắt đầu đợt này con số là 9). Riêng A thì luật cảnh báo 155/171
bài, tức 91% khoá học; một luật cảnh báo 91% thì không ai đọc nữa, đúng điều §12
nói về CI đỏ thường trực.
Dấu hiệu B — đoạn mở bài nhắc lại một thuật ngữ termbank mà bài LIỀN TRƯỚC cũng
dùng — đạt 47/171. Hợp A ∪ B còn **112 cảnh báo** (59 bài đạt).
**B KHÔNG đo được "sự nối", và đó là giới hạn thật của luật này**: hai bài pandas
liền nhau dùng chung chữ `DataFrame` là chuyện tự nhiên, không phải một câu nối.
Nên L15 có nhiều ÂM TÍNH GIẢ (bài đạt nhờ B mà thật ra không nối gì) chứ không
nhiều dương tính giả, và nó chỉ đo được TRƯỜNG HỢP XẤU NHẤT: bài không chia gì
với bài trước, cả cụm chữ lẫn khái niệm. Nó ở mức CẢNH BÁO, mãi mãi. Đừng nâng
lên lỗi, và đừng siết danh sách cụm nối cho ra số đẹp — số thật là 9/171, và nó
nói rằng việc phải làm nằm ở NỘI DUNG, không ở ngưỡng.
Hai dấu hiệu đã thử và BỎ, ghi lại để không ai cài lại rồi tưởng mình thêm được
một phép dò:
  · định danh trong backtick ở đoạn mở bài mà bài trước cũng dùng — **0** ca trên
    cả 171 bài, vì đoạn mở bài gần như không bao giờ có backtick;
  · danh sách cụm nối RỘNG (`cùng`, `vẫn`, `đã`, `sau khi`) — nó hạ cảnh báo
    xuống 72, nhưng `cùng` một mình khớp 39 bài và nó không nói gì về sự nối
    ("cùng một bảng", "cùng kiểu"). Con số 72 đó là số đẹp mua bằng dương tính
    giả.

**ABLATE — số ca bắt được** (bản sao corpus ở scratchpad, chạy bằng `--nguon`;
mỗi lần đo kèm một bản ĐỐI CHỨNG chép từ cùng thời điểm đọc, vì corpus đang bị
sửa song song):
  · 6 bài sạch nhận thêm một đoạn miền sách → **+6 lỗi** L14 (6/6);
  · 5 bài sạch nhận một bảng `sales`/`revenue` không nhắc quán → **+5 lỗi** (5/5);
  · gỡ MỌI dấu hiệu quán cà phê khỏi 5 bài đang neo (PD02, VZ01–VZ04) →
    **+5 lỗi** (5/5). Lần đầu chỉ ra +2, vì bản gỡ bỏ sót `đồ uống` — phép ablate
    tự bắt được chỗ danh sách từ khoá rộng hơn bản gỡ;
  · thêm miền sinh viên vào 3 bài ĐƯỢC MIỄN TRỪ (CT03, CT04, EX05) → **0 thay
    đổi**, đúng như miễn trừ hứa;
  · cắt cụm nối khỏi 5 bài đang đạt L15 → **+3 cảnh báo** (NP11, PD29, GU11), còn
    PD18 và EX02 VẪN ĐẠT nhờ dấu hiệu B. Đó không phải lỗi của phép ablate: nó là
    âm tính giả đã nói ở trên, đo được bằng con số 3/5.
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
BOI_CANH = HERE / 'boi-canh.json'

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
    'L14': 'bối cảnh bài phải thuộc danh sách đã chốt (boi-canh.json)',
    'L15': 'đoạn mở bài phải nối với bài trước (CẢNH BÁO, xem docstring)',
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


def van_ban_hoc_vien(l: dict) -> str:
    """TOÀN BỘ chữ người học thấy trong phần giảng — kể cả code và đầu ra.

    Chỉ L14 dùng hàm này, và nó cố ý KHÔNG gọi `chuan()`: miền ví dụ sống đúng
    trong chỗ mà tiền xử lý số 1 của §10 xoá đi (`cups_sold`, `sales.csv`,
    `marks.txt`). Mọi luật khác vẫn đọc `doan_cua()`, nơi backtick đã thành
    token trơ.

    `displayCode`/`displayExpected` thắng `code`/`expected` khi có: đó là bản
    người học đọc, và AGENTS.md đã ghi "lấy nhầm là dạy sai" cho đúng cặp này.
    """
    ra: list[str] = []
    for k in (l.get('reading') or []):
        loai = k.get('type')
        if loai == 'paragraph':
            ra.append(k.get('text') or '')
        elif loai == 'code':
            ra.append(k.get('displayCode') or k.get('code') or '')
            ra.append(k.get('displayExpected') or k.get('expected') or '')
        elif loai == 'table':
            ra.extend(str(x) for x in (k.get('headers') or []))
            for hang in (k.get('rows') or []):
                ra.extend(str(x) for x in (hang or []))
        else:
            # `figure` chỉ là tên file ảnh; `terminal` là lệnh shell. Cả hai
            # vẫn đưa vào: tên file `doanh-thu-2024.png` cũng là một miền.
            ra.append(str(k.get('code') or k.get('caption') or k.get('figure') or ''))
    return '\n'.join(ra).replace('\r', '')


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


# ── L14: bối cảnh ví dụ ───────────────────────────────────────────────────
# Biên từ khoá, và GẠCH DƯỚI tính là biên. `(?<![^\W_])` = "không có chữ cái
# hay chữ số liền trước"; `_` được coi như khoảng trắng. Nhờ vậy MỘT danh sách
# dùng được cho cả văn xuôi lẫn định danh snake_case: `cups` khớp trong
# `total_cups`, mà `cup` không khớp trong `cupboard`.
BIEN_T = r'(?<![^\W_])'
BIEN_P = r'(?![^\W_])'

# Ngưỡng — đo cả ba trên corpus ngày 29/10/2026, danh sách bài đổi phe nằm ở
# docstring đầu file: ngưỡng 1 → 88 lỗi/35 cb · 2 → 74/48 · 3 → 61/60.
# Chọn 2. Ngưỡng 1 bắt cả một lần nhắc qua (`đơn hàng` đúng một lần ở SY01);
# ngưỡng 3 mất GU03/GU07 (form nhập điểm sinh viên) và NP13/NP14 (lượng mưa).
NGUONG_MIEN = 2
# Phép NEO chỉ cần MỘT dấu hiệu (đặt 2 làm số lỗi 42 → 47, đặt 3 → 50), và lệch
# hai ngưỡng này là có chủ đích: một L14 báo oan đẩy người soạn đi XOÁ một ví dụ
# đang đúng, nên phía "bài đã có bối cảnh" phải rộng tay hơn phía "bài dùng miền
# lạ".
NGUONG_NEO = 1
VAI_TRO = ('chinh', 'kemChinh', 'ngoai', 'trungTinh')


class Mien:
    """Một miền ví dụ của `boi-canh.json`, kèm regex đã biên dịch."""

    __slots__ = ('id', 'ten', 'vai', 're_tu', 're_loai', 'ghi_chu')

    def __init__(self, d: dict) -> None:
        self.id = d['id']
        self.ten = d.get('ten') or d['id']
        self.vai = d.get('vaiTro')
        self.ghi_chu = d.get('ghiChu') or ''
        self.re_tu = [(w, re.compile(BIEN_T + re.escape(w) + BIEN_P, re.IGNORECASE))
                      for w in (d.get('tuKhoa') or [])]
        self.re_loai = [re.compile(BIEN_T + re.escape(w) + BIEN_P, re.IGNORECASE)
                        for w in (d.get('loaiTru') or [])]

    def dem(self, s: str) -> tuple[int, list[str]]:
        """(số lần khớp, từ khoá đã khớp) sau khi XOÁ các cụm `loaiTru`.

        Xoá trước rồi mới đếm — đúng cách §10 làm với backtick, và đúng chỗ
        bản audit đếm sai: cả 35 lần `sách` của corpus là `danh sách`.
        """
        for rx in self.re_loai:
            s = rx.sub(' ', s)
        n, thay = 0, []
        for w, rx in self.re_tu:
            k = len(rx.findall(s))
            if k:
                n += k
                thay.append(f'{w}×{k}' if k > 1 else w)
        return n, thay


def nap_boi_canh() -> tuple[list[Mien], dict[str, str]]:
    if not BOI_CANH.is_file():
        print(f'LỖI: không có {BOI_CANH} — L14 không chạy được.', file=sys.stderr)
        sys.exit(1)
    data = json.loads(BOI_CANH.read_text(encoding='utf-8'))
    mien = [Mien(d) for d in data['mien']]
    tru: dict[str, str] = {}
    for muc in (data.get('mienTru') or []):
        ly_do = (muc.get('lyDo') or '').strip()
        for ma in (muc.get('bai') or []):
            if ma in tru:
                loi('L14', f'boi-canh.json: {ma} được miễn trừ ở HAI mục — '
                           'gộp lại, không thì sửa một mục mà tưởng đã sửa cả hai')
            # LÝ DO phải nằm trong FILE DỮ LIỆU, không trong code: một miễn trừ
            # không kèm lý do là một miễn trừ không ai dám bỏ đi sau này.
            if not ly_do:
                loi('L14', f'boi-canh.json: {ma} được miễn trừ mà mục không có '
                           '`lyDo` — ghi lý do vào file dữ liệu, đừng vào code')
            tru[ma] = ly_do
    chinh = [m for m in mien if m.vai == 'chinh']
    if data.get('mienChinh') not in {m.id for m in chinh}:
        loi('L14', f'boi-canh.json: `mienChinh`={data.get("mienChinh")!r} không '
                   'trỏ tới một miền có `vaiTro` là "chinh"')
    return mien, tru


def kiem_boi_canh(bai: list[dict], mien: list[Mien], tru: dict[str, str]) -> None:
    """L14 + bất biến của chính `boi-canh.json`.

    Vì sao bất biến báo chung dưới nhãn L14 chứ không thành một hàng riêng: một
    file dữ liệu sai nghĩa là L14 KHÔNG CHẠY ĐƯỢC, nên nó phải nổi lên ở đúng
    chỗ người đọc đang tìm L14 — cùng lý lẽ `kiem_termbank` dùng cho TB.
    """
    co = {m.id for m in mien}
    for m in mien:
        if m.vai not in VAI_TRO:
            loi('L14', f'boi-canh.json: {m.id} có `vaiTro` lạ {m.vai!r} — '
                       f'chỉ có {"/".join(VAI_TRO)}')
        if m.vai != 'trungTinh' and not m.re_tu:
            loi('L14', f'boi-canh.json: {m.id} không có `tuKhoa` nào — '
                       'L14 không có gì để nhận diện miền này')
        if not m.ghi_chu.strip():
            loi('L14', f'boi-canh.json: {m.id} không có `ghiChu` — mỗi miền phải '
                       'nói được vì sao nó ở trong danh sách')
    if len(co) != len(mien):
        loi('L14', 'boi-canh.json: có hai miền cùng `id`')
    ma_bai = {l['id'] for l in bai}
    for ma in tru:
        # Cùng họ bẫy `baiDauTien` của termbank: một mã bài không còn tồn tại
        # làm miễn trừ thành câu nói về không ai, mà không gì đỏ.
        if ma not in ma_bai:
            loi('L14', f'boi-canh.json: miễn trừ {ma} nhưng corpus không có bài '
                       'nào mang mã đó')

    chinh = [m for m in mien if m.vai == 'chinh']
    for l in bai:
        ma = l['id']
        if ma in tru:
            continue
        s = van_ban_hoc_vien(l)
        dem = {m.id: m.dem(s) for m in mien if m.vai != 'trungTinh'}
        neo = sum(dem[m.id][0] for m in chinh)
        xau = [m for m in mien if m.vai == 'ngoai'
               and dem[m.id][0] >= NGUONG_MIEN]
        kem = [m for m in mien if m.vai == 'kemChinh'
               and dem[m.id][0] >= NGUONG_MIEN]
        for m in xau:
            loi('L14', f'{ma}: dùng miền "{m.ten}" — ngoài hành trình '
                       f'({", ".join(dem[m.id][1])})')
        if kem and neo < NGUONG_NEO:
            loi('L14', f'{ma}: dữ liệu {", ".join(m.ten for m in kem)} '
                       'nhưng không một chữ nào nói đây là quán nào '
                       f'({", ".join(w for m in kem for w in dem[m.id][1])})')
        if neo < NGUONG_NEO and not xau and not kem:
            # Không gộp vào lỗi: bài KHÔNG CÓ bối cảnh nào là một khiếm khuyết
            # khác với bài dùng bối cảnh SAI, và nó sửa bằng cách thêm chữ chứ
            # không bằng cách đổi chữ.
            canh_bao('L14', f'{ma}: không có bối cảnh nào — ví dụ không gắn vào '
                            'hành trình quán cà phê')


# ── L15: câu nối với bài trước ────────────────────────────────────────────
# Danh sách HẸP, và nó hẹp vì phép đo: chỉ 5/171 bài đạt bằng riêng danh sách
# này. Đừng nới nó ra để con số đẹp hơn — `cùng` một mình khớp 39 bài và nó
# không nói gì về sự nối ("cùng một bảng", "cùng kiểu"), tức nới là tự tạo
# dương tính giả rồi tưởng corpus đã đạt.
CUM_NOI = [re.compile(p, re.IGNORECASE) for p in [
    r'bài trước', r'bài trên', r'(?:ở|từ|trong|sau) bài', r'phần trước',
    r'đoạn trước', r'bước trước', r'nối tiếp', r'tiếp tục',
    r'vừa (?:làm|tạo|viết|xong|dựng|có|đọc|tính|thấy|gặp|nén|lưu|đặt|gom)',
    r'(?:đã|vừa) (?:có|tạo|viết|dựng|làm|lưu) ở',
    r'bảng (?:này|vừa)', r'(?:hàm|file|lớp|class) (?:này|vừa)',
    # Hai khuôn dưới đến từ chính bản viết lại module 1 theo câu chuyện quán
    # cà phê: "Môi trường đã riêng, giờ chọn chỗ để tính." (PY03) và "Ô code
    # giữ được số liệu rồi." (PY04). Thêm chúng vì nếu không thì L15 cảnh báo
    # ĐÚNG những bài vừa được viết để chữa lỗi nó đang đo — một luật báo oan
    # người làm đúng thì bị tắt, không được sửa.
    r',\s*giờ(?![^\W_])', r'rồi\s*[.,]',
    # `xong` một mình ĐÃ THỬ VÀ BỎ: 4 bài khớp, nhưng 3 trong 4 là "chạy xong
    # thì…" bên trong một câu nói về chương trình, không phải nối với bài
    # trước. L15 đã thừa âm tính giả, đừng thêm dương tính giả vào.
]]


def kiem_noi_bai(bai: list[dict], bank: list[Muc]) -> None:
    """L15 — CẢNH BÁO, và đọc giới hạn của nó ở docstring đầu file trước khi tin.

    Hai dấu hiệu, bài đạt khi có MỘT:
      A. đoạn mở bài có một cụm chỉ sự nối tiếp (`CUM_NOI`);
      B. đoạn mở bài nhắc lại một thuật ngữ termbank mà bài LIỀN TRƯỚC cũng dùng.

    B là dấu hiệu YẾU và nó được nhận vào có ý thức: nó không phân biệt được một
    câu nối với chuyện hai bài pandas liền nhau đương nhiên dùng chung chữ
    `DataFrame`. Chỉ có A nói được "tác giả đã viết một câu nối", và riêng A thì
    cảnh báo 162/171 bài — một luật cảnh báo 95% khoá học thì không ai đọc nữa
    (§12 nói đúng chuyện đó về CI đỏ thường trực). Nên L15 đo TRƯỜNG HỢP XẤU
    NHẤT: bài không chia gì với bài trước, cả cụm chữ lẫn khái niệm.

    Bài ĐẦU khoá được miễn, và chỉ bài đầu khoá: bài đầu mỗi module vẫn phải nối,
    vì "một hành trình" nghĩa là ranh giới module không được là chỗ bỏ người học
    xuống.
    """
    for i in range(1, len(bai)):
        l, truoc = bai[i], bai[i - 1]
        doan = doan_cua(l)
        if not doan:
            continue
        dau = doan[0]
        if any(rx.search(dau) for rx in CUM_NOI):
            continue
        # Termbank lọc theo phạm vi của TỪNG bài: một thuật ngữ chỉ tính là
        # "mang sang" khi nghĩa đó áp cho cả hai bài.
        truoc_van = ' '.join(doan_cua(truoc))
        if any(m.re_tn.search(dau) and m.trong_bai(l['id'])
               and m.re_tn.search(truoc_van) and m.trong_bai(truoc['id'])
               for m in bank):
            continue
        canh_bao('L15', f'{l["id"]}: đoạn mở bài không nối gì với {truoc["id"]} — '
                        f'không cụm nối, không khái niệm mang sang · {goi(dau)}')


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
    mien, tru = nap_boi_canh()

    kiem_termbank(bank, bai)
    kiem_do_dai(bai)
    kiem_khuon_chu(bai)
    kiem_thuat_ngu(bai, bank)
    kiem_boi_canh(bai, mien, tru)
    kiem_noi_bai(bai, bank)

    chon = {t.strip().upper() for t in args.luat.split(',') if t.strip()}
    def loc(xs: list[tuple[str, str]]) -> list[tuple[str, str]]:
        return [x for x in xs if not chon or x[0].upper() in chon]

    lo, cb = loc(LOI), loc(CANH_BAO)

    dem_lo, dem_cb = Counter(l for l, _ in lo), Counter(l for l, _ in cb)
    thu_tu = [f'L{i}' for i in range(1, 16)] + ['TB', '§4-A']
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
