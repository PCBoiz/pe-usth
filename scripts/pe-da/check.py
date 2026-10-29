"""Kiểm bản dựng pe-da trước khi nạp vào DB.

    py scripts/pe-da/check.py            # kiểm cấu trúc
    py scripts/pe-da/check.py --strict   # thêm: cảnh báo cũng tính là lỗi (CI chạy bản này)

Kiểm CẤU TRÚC, không kiểm code chạy ra gì — việc đó là của check-pyodide.mjs
(chạy từng đoạn trong chính Pyodide của trình duyệt rồi so với `expected`).

Vì sao cần cả hai: bài có thể đúng cú pháp, chạy ra đúng số, mà vẫn hỏng với
người học — trỏ vào một hình không tồn tại, hiện nút Chạy cho bài Tkinter, hay
mất sạch câu luyện tập vì một khoá bị gõ sai. Đó là loại lỗi không ngoại lệ nào
được ném ra, chỉ có người đọc mới thấy.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
SOURCE = HERE / 'source' / 'course.json'
PRACTICE = HERE / 'source' / 'practice.json'
ANH = HERE.parent.parent / 'frontend' / 'public' / 'static' / 'da'
# Bộ dữ liệu quán, phục vụ ở cùng origin — xem kiem_du_lieu().
DU_LIEU = HERE.parent.parent / 'frontend' / 'public' / 'static' / 'da-dulieu'
# Khớp TEN_FILE_DU_LIEU của build.py, TEN_DU_LIEU của studio-lesson.worker.js và
# của studio-lesson.schema.ts. CỐ Ý chép, không import: check.py là phía đối
# chứng, import thì một lỗi trong khâu dựng xuất hiện ở cả hai phía phép so.
TEN_FILE_DU_LIEU = re.compile(r'^[a-z0-9_-]+\.csv$')
CURRICULA = HERE.parent.parent / 'frontend' / 'src' / 'lib' / 'curricula.json'

# SÁU loại khối màn đọc dựng được — khớp ReadBlock trong
# frontend/src/lib/studio-lesson.ts và mục "Hai khối mới" của SCHEMA.md. BỐN chỗ
# phải đổi CÙNG LÚC: hằng này, ReadBlock, ReadScreen và khâu phát ở build.py.
LOAI_KHOI = {'paragraph', 'code', 'terminal', 'figure', 'table', 'diagram'}

LOI: list[str] = []
CANH_BAO: list[str] = []


def loi(msg: str) -> None:
    LOI.append(msg)


def canh_bao(msg: str) -> None:
    CANH_BAO.append(msg)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--strict', action='store_true')
    args = ap.parse_args()

    if not (OUT / 'lessons.json').is_file():
        print('LỖI: chưa dựng — chạy `py scripts/pe-da/build.py` trước.', file=sys.stderr)
        return 1

    bai = json.loads((OUT / 'lessons.json').read_text(encoding='utf-8'))['lessons']
    nguon = json.loads(SOURCE.read_text(encoding='utf-8'))
    nguon_theo_id = {b['id']: b for b in nguon['lessons']}

    kiem_so_luong(bai, nguon)
    kiem_thu_tu(bai)
    kiem_noi_dung(bai, nguon_theo_id)
    kiem_anh(bai)
    kiem_so_do(bai, nguon_theo_id)
    kiem_vet(bai)
    kiem_bai_tap_doi_nguon(bai)
    kiem_thu_trong_ide(bai)
    kiem_du_lieu(bai)
    kiem_sandbox(bai)
    kiem_trac_nghiem(bai)
    kiem_curricula(bai)

    for m in CANH_BAO:
        print(f'cảnh báo: {m}')
    for m in LOI:
        print(f'LỖI: {m}', file=sys.stderr)

    hong = len(LOI) + (len(CANH_BAO) if args.strict else 0)
    print(f'\n{len(bai)} bài · {len(LOI)} lỗi · {len(CANH_BAO)} cảnh báo'
          f'{" (strict: cảnh báo tính là lỗi)" if args.strict else ""}')
    return 1 if hong else 0


def kiem_so_luong(bai: list[dict], nguon: dict) -> None:
    if len(bai) != len(nguon['lessons']):
        loi(f'dựng ra {len(bai)} bài nhưng nguồn có {len(nguon["lessons"])}')
    ma_nguon = {b['id'] for b in nguon['lessons']}
    ma_dung = {b['lesson_code'] for b in bai}
    if ma_nguon - ma_dung:
        loi(f'bài trong nguồn không được dựng: {sorted(ma_nguon - ma_dung)}')
    if ma_dung - ma_nguon:
        loi(f'bài dựng ra không có trong nguồn: {sorted(ma_dung - ma_nguon)}')


def kiem_thu_tu(bai: list[dict]) -> None:
    """sort_order phải là 1…N liên tục và duy nhất.

    Bài được TRA theo (course_id, sort_order) chứ không theo id — xem bẫy trong
    AGENTS.md. Một số trùng hoặc một lỗ hổng ở đây là một bài không bao giờ mở
    được, hoặc hai bài đè lên nhau.
    """
    thu_tu = [b['sort_order'] for b in bai]
    if sorted(thu_tu) != list(range(1, len(bai) + 1)):
        trung = {t for t in thu_tu if thu_tu.count(t) > 1}
        loi(f'sort_order không phải 1…{len(bai)} liên tục; trùng: {sorted(trung)}')
    ma = [b['lesson_code'] for b in bai]
    if len(set(ma)) != len(ma):
        loi('lesson_code trùng nhau')


def kiem_noi_dung(bai: list[dict], nguon: dict[str, dict]) -> None:
    for b in bai:
        ma = b['lesson_code']
        c = b['content_json']
        man = c.get('step_1', {}).get('read') or []
        if not man:
            loi(f'{ma}: không có màn đọc nào')
        for i, lat in enumerate(man):
            if not lat:
                loi(f'{ma}: màn đọc {i} rỗng')
            for k in lat:
                # Loại khối lạ = renderer không có nhánh nào dựng nó. Bản dựng
                # đầu phát `figure`/`terminal` trong khi ReadBlock mới khai ba
                # loại, và 26 bài có hình ném TypeError ngay màn đọc — không ai
                # thấy cho tới khi mở đúng bài đó.
                if k['type'] not in LOAI_KHOI:
                    loi(f'{ma}: màn {i} có loại khối lạ "{k["type"]}" — '
                        f'renderer chỉ dựng {sorted(LOAI_KHOI)}')
                if k['type'] == 'paragraph' and not k.get('text', '').strip():
                    loi(f'{ma}: màn {i} có đoạn văn rỗng')
                if k['type'] in ('code', 'terminal') and not k.get('code', '').strip():
                    loi(f'{ma}: màn {i} có khối code rỗng')
                if k['type'] == 'figure':
                    if not k.get('alt', '').strip():
                        loi(f'{ma}: màn {i} có hình không có lời mô tả (alt)')
                    if not k.get('src', '').lower().endswith('.png'):
                        loi(f'{ma}: màn {i} có hình không phải PNG — {k.get("src")}')

        # Số câu luyện tập phải khớp nguồn: mất câu là mất im lặng, không ai thấy.
        goc = nguon[ma]
        can = len(goc.get('drills') or []) + len(goc.get('reviewExercises') or [])
        co = len(c.get('step_2', {}).get('practice') or [])
        if co != can:
            loi(f'{ma}: {co} câu luyện tập nhưng nguồn có {can}')
        for j, cau in enumerate(c.get('step_2', {}).get('practice') or []):
            if not cau.get('prompt', '').strip():
                loi(f'{ma}: câu luyện tập {j} không có đề')
            if not cau.get('answer', '').strip():
                loi(f'{ma}: câu luyện tập {j} không có đáp án')

        if b['estimated_minutes'] <= 0 or b['xp_reward'] <= 0:
            loi(f'{ma}: thời lượng hoặc XP bằng 0')
        if not c.get('source', {}).get('slides'):
            canh_bao(f'{ma}: không ghi nguồn (slides rỗng)')


def kiem_anh(bai: list[dict]) -> None:
    """Mọi hình bài trỏ tới phải có file thật trong public/static/da/."""
    can: set[str] = set()
    for b in bai:
        for lat in b['content_json']['step_1']['read']:
            for k in lat:
                if k['type'] == 'figure':
                    ten = k['src'].rsplit('/', 1)[-1]
                    can.add(ten)
                    if not (ANH / ten).is_file():
                        loi(f'{b["lesson_code"]}: trỏ vào hình không có file — {k["src"]}')
    thua = {p.name for p in ANH.glob('*.png')} - can if ANH.is_dir() else set()
    if thua:
        canh_bao(f'{len(thua)} ảnh trong public/static/da/ không bài nào dùng: '
                 f'{", ".join(sorted(thua)[:5])}…')


def kiem_so_do(bai: list[dict], nguon: dict[str, dict]) -> None:
    """Khối `diagram` (SƠ ĐỒ bằng DOM) phải còn NỐI VỚI bài nó giải thích.

    Vì sao luật này tồn tại, chứ không chỉ để đủ bộ. Sơ đồ được khai trong
    `SO_DO_DOC` của build.py — tức nó là chữ do người viết đặt, KHÔNG suy ra từ
    nguồn. Nên nó có thể trôi: người soạn giáo trình sửa `3 * 15 - 5` thành con
    số khác, bài dạy một chuyện và sơ đồ dạy chuyện khác ngay cạnh nó, không
    exception nào được ném và không log nào đỏ. Phép so dưới đây là thứ duy nhất
    chạm tới NGUỒN.

    Nới đúng một bậc: chỉ bước ĐẦU (biểu thức) và bước CUỐI (kết quả) phải có
    thật trong bài. Các bước giữa là phép rút gọn — đó chính là nội dung sơ đồ
    thêm vào, nên nó không có trong nguồn và không được đòi.
    """
    def gon(t: str) -> str:
        return ''.join(t.split())

    for b in bai:
        ma = b['lesson_code']
        goc = nguon.get(ma) or {}
        # Code và kết quả NGƯỜI HỌC ĐỌC (bản `displayCode` khi có) — cùng bản mà
        # khoi_doc() phát ra, nếu không thì so với một văn bản khác hẳn.
        khoi_code = [k for k in goc.get('reading') or [] if k['type'] == 'code']
        ma_nguon = gon(''.join((k.get('displayCode') or k.get('code') or '')
                               for k in khoi_code))
        kq_nguon = gon(''.join(str(k.get('displayExpected', k.get('expected')) or '')
                               for k in khoi_code))
        da_thay_code = False
        for i, lat in enumerate(b['content_json']['step_1']['read']):
            for k in lat:
                if k['type'] == 'code':
                    da_thay_code = True
                if k['type'] != 'diagram':
                    continue
                o = f'{ma}: màn {i} sơ đồ'
                # Sơ đồ đứng TRƯỚC mọi khối code của bài là đọc đáp án trước đề.
                if not da_thay_code:
                    loi(f'{o} đứng trước mọi khối code — nó gộp lại điều đoạn '
                        f'code vừa chứng minh, không giới thiệu thay cho code')
                if not str(k.get('title', '')).strip():
                    loi(f'{o} không có tiêu đề')
                lan = k.get('lanes')
                if not isinstance(lan, list) or len(lan) < 2:
                    loi(f'{o} cần ít nhất 2 làn — một làn thì không có gì để so')
                    continue
                # SỐ CHẴN: grid dựng hai cột, một làn lẻ đứng một mình ở hàng
                # cuối là mất phép so sánh, tức mất đúng thứ duy nhất khối này
                # mang lại (và là lý do nó KHÔNG được làm thành animation).
                if len(lan) % 2:
                    loi(f'{o} có {len(lan)} làn — phải CHẴN để hai làn cạnh nhau '
                        f'so được với nhau')
                for j, l in enumerate(lan):
                    v = f'{o} làn {j}'
                    for truong in ('label', 'note'):
                        chu = str(l.get(truong) or '')
                        if not chu.strip():
                            loi(f'{v} thiếu {truong}')
                        # Backtick lẻ: `withInlineCode` chỉ bóc được CẶP, nên một
                        # dấu lẻ hiện ra nguyên văn trước mặt người học — đúng
                        # lỗi người thử gửi ảnh ngày 27/10 ở ô tổng kết.
                        if chu.count('`') % 2:
                            loi(f'{v} có dấu backtick lẻ trong {truong}')
                    buoc = l.get('steps')
                    if not isinstance(buoc, list) or len(buoc) < 2:
                        loi(f'{v} cần ít nhất 2 bước mới là một phép rút gọn')
                        continue
                    if any(not str(x).strip() for x in buoc):
                        loi(f'{v} có bước rỗng')
                        continue
                    if gon(str(buoc[0])) not in ma_nguon:
                        loi(f'{v}: biểu thức "{buoc[0]}" không có trong code '
                            f'của bài {ma} — sơ đồ đã trôi khỏi bài')
                    if gon(str(buoc[-1])) not in kq_nguon:
                        loi(f'{v}: kết quả "{buoc[-1]}" không có trong `expected` '
                            f'của bài {ma} — sơ đồ nói một con số bài không in ra')


def kiem_vet(bai: list[dict]) -> None:
    """BẢNG TỪNG BƯỚC (`trace` trên khối code của màn đọc).

    Vì sao cần luật ở đây, chứ không tin build.py: vết được SINH Ở MỘT LẦN CHẠY
    KHÁC (`gen_traces.py`, commit vào traces.json) và nó được cắt theo KHOẢNG
    DÒNG của từng đoạn trong chương trình đã nối. Lệch một dòng ở phép cắt đó
    là bảng của đoạn 2 nằm dưới đoạn 3 — và nó hỏng IM LẶNG: bảng vẫn mở ra,
    vẫn có số dòng, chỉ là số dòng của một đoạn khác. build.py canh được
    "có/không" và canh hash của NGUỒN; chỉ ở đây mới canh được "vết này có nói
    về ĐÚNG đoạn code nằm ngay trên nó không".

    Sáu luật, mỗi luật chặn một kiểu lệch:
      1. `trace` chỉ nằm trên khối `code`;
      2. mọi `line` phải trỏ vào một dòng CÓ THẬT và KHÔNG RỖNG của chính
         `block.code` — đây là luật bắt phép cắt lệch đoạn;
      3. bảng phải có ≥ 3 dòng (ít hơn thì không có gì để xem) và ≤ TRAN_DONG;
      4. câu dự đoán phải có và đáp án không rỗng, backtick đi theo cặp;
      5. đáp án KHÔNG được xuất hiện trong `expected` của chính khối — nếu có
         thì "dự đoán" chỉ là chép lại ô "Kết quả:" ngay phía trên, và cơ chế
         (đoán → ngạc nhiên → chú ý) mà bước này tồn tại để kích hoạt không
         chạy lần nào;
      6. đáp án phải TRẢ LỜI ĐƯỢC BẰNG BẢNG: `final`/`mid` thì biến được hỏi
         phải xuất hiện trong một dòng bảng, `count` thì số lần đếm được ở mức
         module phải đúng bằng đáp án.
    """
    # Trần dòng bảng — phải khớp TRAN_DONG của gen_traces.py. Chép chứ không
    # import: check.py là phía đối chứng, import thì một lỗi trong khâu sinh
    # xuất hiện ở cả hai phía phép so.
    tran_dong = 42
    tong = 0
    for b in bai:
        ma = b['lesson_code']
        for i, lat in enumerate(b['content_json']['step_1']['read']):
            for k in lat:
                if 'trace' not in k:
                    continue
                o = f'{ma}: màn {i} vết'
                if k['type'] != 'code':
                    loi(f'{o} nằm trên khối "{k["type"]}" — chỉ khối code mới có '
                        'bảng từng bước')
                    continue
                tong += 1
                v = k['trace']
                dong_ma = k['code'].split('\n')
                hang = v.get('rows')
                if not isinstance(hang, list) or len(hang) < 3:
                    loi(f'{o} chỉ có {len(hang or [])} dòng — bảng không nói thêm gì')
                    continue
                if len(hang) > tran_dong:
                    loi(f'{o} có {len(hang)} dòng, quá trần {tran_dong}')
                for h in hang:
                    n = h.get('line')
                    if not isinstance(n, int) or not (1 <= n <= len(dong_ma)):
                        loi(f'{o} trỏ vào dòng {n} nhưng khối chỉ có '
                            f'{len(dong_ma)} dòng — phép cắt vết lệch đoạn')
                        break
                    if not dong_ma[n - 1].strip():
                        loi(f'{o} nói dòng {n} đã chạy nhưng dòng đó RỖNG — '
                            'phép cắt vết lệch đoạn')
                        break
                dd = v.get('predict') or {}
                dap_an = str(dd.get('answer') or '')
                if not dap_an.strip() or not str(dd.get('prompt') or '').strip():
                    loi(f'{o} thiếu câu dự đoán hoặc đáp án')
                    continue
                # Đáp án phải GÕ LẠI ĐƯỢC. Bản vẽ của một đối tượng mờ
                # (`ndarray: array([1, 2, 3])`), một cái tên trong ngoặc nhọn
                # (`<thư viện numpy>`), hay một số nguyên 31 chữ số (`2 ** 100`
                # ở EX07) thì không ai gõ lại — mà gõ lại chính là hành động
                # cam kết mà cả bước dự đoán tồn tại để lấy.
                if re.match(r'^(<|[A-Za-z_][\w.]*: )', dap_an) \
                        or (dap_an.lstrip('-').isdigit() and len(dap_an.lstrip('-')) > 10):
                    loi(f'{o}: đáp án "{dap_an[:40]}" không gõ lại được — '
                        'khâu sinh phải BỎ QUA khối thay vì hỏi câu này')
                if str(dd['prompt']).count('`') % 2:
                    loi(f'{o} có dấu backtick lẻ trong câu hỏi — nó sẽ hiện ra '
                        'nguyên văn trước mặt người học')
                gon = lambda t: ''.join(str(t).split())  # noqa: E731
                if gon(dap_an) and gon(dap_an) in gon(k.get('expected') or ''):
                    loi(f'{o}: đáp án "{dap_an}" đã có sẵn trong ô Kết quả của '
                        'chính khối — câu dự đoán chỉ là chép lại màn hình')
                if dd.get('kind') in ('final', 'mid'):
                    ten = dd.get('var')
                    dat = [h for h in hang
                           if any(ten == t for t, _ in h.get('set') or [])]
                    if not dat:
                        loi(f'{o} hỏi về `{ten}` nhưng không dòng bảng nào hiện '
                            'biến đó — bảng không trả lời được câu hỏi của nó')
                    elif len(dat) == 1:
                        # Biến gán ĐÚNG MỘT LẦN bằng hằng viết ngay trên dòng đó
                        # thì đáp án nằm nguyên văn trong ô code phía trên —
                        # câu hỏi không bắt nghĩ một bước nào (lỗi thật ở EX02:
                        # `raw = "name,mark\nMai,8.5\nAn,7.0\n"`). Bỏ dấu nháy
                        # trước khi so: repr dùng nháy đơn, nguồn hay viết nháy kép.
                        bo_nhay = lambda t: gon(t).replace("'", '').replace('"', '')  # noqa: E731
                        n = dat[0].get('line') or 0
                        if 1 <= n <= len(dong_ma) and bo_nhay(dap_an) in bo_nhay(dong_ma[n - 1]):
                            loi(f'{o}: đáp án "{dap_an}" đã có nguyên văn trên dòng '
                                f'{n} của chính đoạn code — không có gì để đoán')
                elif dd.get('kind') == 'count':
                    lan = sum(1 for h in hang
                              if h.get('line') == dd.get('line') and not h.get('fn'))
                    if str(lan) != dap_an:
                        loi(f'{o} nói dòng {dd.get("line")} chạy {dap_an} lần '
                            f'nhưng bảng đếm được {lan}')
                    # Và dòng được hỏi phải là THÂN VÒNG LẶP. Hỏi chính dòng
                    # `for` thì đáp án là n+1 (Python chạy qua nó thêm một lần
                    # để biết đã hết), còn hỏi một dòng có comprehension thì số
                    # đếm là chi tiết nội tuyến hoá của 3.12 (PEP 709) — cả hai
                    # đều là con số của máy ảo, không phải điều bài dạy. Lỗi
                    # thật: SY13 `print([s["id"] for s in students])` → "4 lần".
                    n = dd.get('line') or 0
                    cau = dong_ma[n - 1] if 1 <= n <= len(dong_ma) else ''
                    thut = len(cau) - len(cau.lstrip())
                    co_lap = any(
                        re.match(r'\s*(for|while)\b', t)
                        and len(t) - len(t.lstrip()) < thut
                        for t in dong_ma[:max(n - 1, 0)] if t.strip())
                    if re.match(r'\s*(for|while)\b', cau) or not co_lap \
                            or re.search(r'[\[\{(][^\]\})]*\bfor\b', cau):
                        loi(f'{o} đếm số lần chạy của dòng {n} ("{cau.strip()[:40]}") '
                            '— chỉ được hỏi về một dòng THÂN vòng lặp')
                else:
                    loi(f'{o} có loại câu hỏi lạ: {dd.get("kind")!r}')

    # Module 1 KHÔNG có bảng — quyết định đã chốt, và nó phải kiểm được từ bản
    # dựng chứ không chỉ từ một hằng trong build.py. 18 bài đầu là module 1.
    for b in bai:
        if b['sort_order'] > 18:
            continue
        if any(k.get('trace') for lat in b['content_json']['step_1']['read'] for k in lat):
            loi(f'{b["lesson_code"]}: bài module 1 mà có bảng từng bước')

    if not tong:
        loi('không bài nào có bảng từng bước — vết đã dựng nhưng không có đường '
            'tới người học (xem traces.json và gen_traces.py)')


def kiem_bai_tap_doi_nguon(bai: list[dict]) -> None:
    """Mọi bài tập của gói nguồn phải hoặc ĐƯỢC CHẤM, hoặc có LÝ DO ghi lại.

    Vì sao cần luật này. Một lượt audit ngày 27/10 báo "14 bài tập và 80 ca chấm
    còn sót, chi phí soạn bằng 0, chỉ là nối" — và cả hai nửa đều sai. Đo lại
    ngày 28/10: 14 bài đó **không nối được** (openpyxl/seaborn/plotly/ipywidgets/
    h5py/sqlalchemy thiếu wheel trong Pyodide 314, và CT07/CT08/EX04 vì
    `sys.executable` trong trình duyệt không trỏ tới file thật), mỗi bài 3 ca =
    **42 ca**, không phải 80. Con số 80 là 457−377, trong đó 38 ca là ca mới
    được THÊM VÀO NGUỒN ngày 28/10 để lời giải tầm thường trượt.

    Nghĩa là "còn sót" là một kết luận rút ra từ phép trừ hai con số, mà phép
    trừ đó không nói được ca nào sót và vì sao. Luật dưới đây thay phép trừ bằng
    một phép đối chiếu TỪNG BÀI, nên lần sau câu hỏi "còn sót không" có câu trả
    lời bằng lệnh thay vì bằng một lượt đọc.

    Ba luật:
      1. bài nguồn có `exercises` thì bản dựng phải có `step_4.tests`, HOẶC
         `_bai_tap` phải ghi lý do cụ thể (`khong: <vì sao>`);
      2. bài được chấm phải có ĐÚNG số ca của nguồn — mất ca là mất im lặng,
         không ai thấy vì bộ chấm vẫn xanh trên số ca còn lại;
      3. tổng (ca đã dựng + ca của bài bị loại) phải bằng tổng ca của nguồn.
    """
    if not PRACTICE.is_file():
        canh_bao('không có source/practice.json — bỏ qua phép đối chiếu bài tập')
        return
    nguon = json.loads(PRACTICE.read_text(encoding='utf-8'))
    ca_nguon = {}
    for b in nguon['lessons']:
        ex = b.get('exercises') or []
        if ex:
            ca_nguon[b['id']] = sum(len(e.get('tests') or e.get('cases') or [])
                                    for e in ex)

    theo_ma = {b['lesson_code']: b for b in bai}
    da_dung = bi_loai = 0
    for ma, can in sorted(ca_nguon.items()):
        b = theo_ma.get(ma)
        if b is None:
            loi(f'{ma}: gói nguồn có bài tập nhưng bản dựng không có bài này')
            continue
        co = (b['content_json'].get('step_4') or {}).get('tests') or []
        if co:
            da_dung += len(co)
            if len(co) != can:
                loi(f'{ma}: {len(co)} ca chấm nhưng nguồn có {can}')
        else:
            bi_loai += can
            ly_do = b.get('_bai_tap') or ''
            if not ly_do.startswith('khong: '):
                loi(f'{ma}: có bài tập trong nguồn mà bản dựng không chấm, '
                    f'và KHÔNG ghi lý do (_bai_tap = {ly_do!r})')

    tong = sum(ca_nguon.values())
    if da_dung + bi_loai != tong:
        loi(f'ca chấm: dựng {da_dung} + loại {bi_loai} ≠ nguồn {tong}')


def kiem_thu_trong_ide(bai: list[dict]) -> None:
    """Cờ `tryIt` — nút "Thử ngay trong IDE" dưới khối code của màn đọc.

    Vì sao phải kiểm chứ không tin khâu build: phép nối cờ tới khối đi qua một
    dict khoá theo `id()` của chính dict nguồn (`chia_man` chia lại các dict
    trong `reading`, không chép). Lệch một khối là bài mở ra một tab IDE nạp
    SAI đoạn mã — và không ngoại lệ nào được ném, không log nào đỏ, chỉ người
    học thấy một chương trình không phải của bài mình đang đọc.

    Bốn luật, và mỗi luật chặn một kiểu lệch khác nhau:
      1. `tryIt` chỉ được nằm trên khối `code`. Trên khối `terminal` thì nó bàn
         giao `git clone` vào một sandbox Python; trên `figure`/`table` thì nó
         vô nghĩa.
      2. KHÔNG được phát `tryIt: false` — renderer đọc bằng `block.tryIt ?` nên
         false và vắng mặt là một, mà phát false thì content_json nặng thêm 406
         khoá vô ích.
      3. Số khối có cờ phải bằng SỐ KHỐI CHẠY ĐƯỢC mà `_blocked` ghi. Đây là
         luật bắt được lệch id(): đúng số mà sai khối thì luật 4 bắt.
      4. Nối mọi khối có cờ theo thứ tự đọc phải ra ĐÚNG `step_4.starterCode` ở
         những bài còn ô chạy thử — `starterCode` chính là `noi_code(chay_duoc)`,
         nên hai đường độc lập cùng nói một chuyện. Bài có BÀI TẬP ĐƯỢC CHẤM thì
         `step_4` không còn `starterCode` nên luật này không áp được (đó cũng
         đúng là 124 bài mà nút này đáng giá nhất — xem `maDeThu` ở frontend).
    """
    for b in bai:
        ma = b['lesson_code']
        c = b['content_json']
        mode = b['_mode']
        co_co: list[str] = []
        for i, lat in enumerate(c.get('step_1', {}).get('read') or []):
            for k in lat:
                if 'tryIt' not in k:
                    continue
                if k['type'] != 'code':
                    loi(f'{ma}: màn {i} có tryIt trên khối "{k["type"]}" — '
                        'chỉ khối code mới bàn giao được sang /ide')
                    continue
                if k['tryIt'] is not True:
                    loi(f'{ma}: màn {i} phát tryIt={k["tryIt"]!r} — chỉ được phát True')
                    continue
                co_co.append(k['code'])

        # Khối ĐỌC FILE DỮ LIỆU không có nút, và vì mã bàn giao là TIỀN TỐ thì
        # mọi khối SAU nó cũng không có: tiền tố sẽ thiếu đúng dòng đọc file.
        # Nên số nút = số khối chạy được ĐỨNG TRƯỚC khối dữ liệu đầu tiên.
        khoi_du_lieu = (b.get('_du_lieu') or {}).get('blocks') or []
        tat_tu = min(khoi_du_lieu) if khoi_du_lieu else len(_code_bai_doc(c))
        chan_chi_so = {x['block'] for x in b['_blocked']}
        can = sum(1 for i in range(tat_tu) if i not in chan_chi_so)
        if len(co_co) != can:
            loi(f'{ma}: {len(co_co)} khối có nút Thử-trong-IDE nhưng {can} khối chạy được')
        if mode == 'local' and co_co:
            loi(f'{ma}: bài phải chạy trên máy nhưng vẫn có {len(co_co)} nút Thử-trong-IDE')

        # CHỈ so với `starterCode` của ô CHẠY THỬ. Bài có BÀI TẬP ĐƯỢC CHẤM
        # cũng mang `starterCode` — nhưng đó là KHUNG TRỐNG của bài tập, không
        # phải mã bài đọc, nên so với nó thì cả 122 bài đều "sai" (đã chạy và
        # thấy đúng 122 lỗi đó trước khi siết điều kiện này).
        bon = c.get('step_4') or {}
        # Bài khai FILE DỮ LIỆU cũng ra khỏi luật 4: `starterCode` của ô chạy
        # thử có cả khối dữ liệu (nó CHẠY ĐƯỢC ở đây — chỉ /ide là không), nên
        # nối các khối có cờ sẽ thiếu đúng khối đó. Luật 3 ngay trên vẫn canh
        # được việc cờ gắn đúng khối, vì nó đếm theo chỉ số.
        khoi_dau = (None if bon.get('tests') or bon.get('dataFiles')
                    else bon.get('starterCode'))
        if khoi_dau and co_co and _noi_nhu_build(co_co) != khoi_dau:
            loi(f'{ma}: nối các khối có tryIt KHÔNG ra đúng step_4.starterCode — '
                'cờ gắn sai khối')


def kiem_du_lieu(bai: list[dict]) -> None:
    """`step_4.dataFiles` — file dữ liệu nạp vào hệ tệp ảo của Pyodide.

    Tám luật, và mỗi luật chặn một cách cơ chế này hỏng IM LẶNG:
      1. tên phải khớp `TEN_FILE_DU_LIEU` — worker ghép tên vào
         `/static/da-dulieu/` rồi fetch, nên một tên có `/` là một request đi
         chỗ khác;
      2. file phải CÓ THẬT trên đĩa. Thiếu thì worker nhận 404 và cả bài chết ở
         lần bấm Chạy đầu bằng một câu lỗi hạ tầng người học không gỡ được —
         còn bộ chấm nội dung thì đỏ, nên luật này chỉ là chặn SỚM hơn;
      3. không khai trùng;
      4. bài khai file thì phải CÓ mã đọc file đó — khối code của màn đọc, hoặc
         mã của bài tập được chấm. Khai mà không đọc là bắt mọi học viên của bài
         tải thêm 1,29 MB cho một file không ai dùng — và nó không hỏng gì cả,
         nên không có cách nào khác để biết;
      5. ngược lại: khối nào gọi `read_csv('<tên trong bộ dữ liệu>')` thì bài
         PHẢI khai tên đó. Đây là luật bắt được lỗi ngược — thêm một đoạn đọc
         `don_hang.csv` mà quên khai là FileNotFoundError trước mặt học viên;
      6. khối dữ liệu KHÔNG được mang `trace`: vết sinh bằng CPython ở
         gen_traces.py, trong thư mục tạm không có file dữ liệu nào (xem
         `bo_qua` của vet_cua_bai trong build.py);
      6b. và KHÔNG được mang `tryIt`: /ide chưa nạp được file, nên bàn giao
         sang đó là `FileNotFoundError` trước mặt người học — xem luật 3 của
         `kiem_thu_trong_ide` để biết vì sao cả khối SAU nó cũng mất nút;
      7. mã của BÀI TẬP ĐƯỢC CHẤM (`starterCode`/`solutionCode`) gọi tên một
         file của bộ dữ liệu thì bài PHẢI khai tên đó. Đây là chiều ngược của
         luật 5, ở phía bài tập: thiếu khai là mọi ca chấm trượt bằng
         FileNotFoundError trên một lời giải ĐÚNG.

    Luật 8 cũ — "bài có `tests` thì không được khai `dataFiles`" — đã BỎ ngày
    29/10. Nó ra đời vì `check-practice.mjs` chưa có nhánh nạp file; nay bộ đó
    đọc file từ đĩa và có hẳn một pha canh việc file tới được mã học viên ở MỌI
    lần chạy lại của từng ca. Giữ lại cổng ấy nghĩa là không bài tập nào được
    chấm trên dữ liệu thật — đúng thứ đang chặn module thực hành.
    """
    co_san = {p.name for p in DU_LIEU.glob('*.csv')} if DU_LIEU.is_dir() else set()
    for b in bai:
        ma = b['lesson_code']
        c = b['content_json']
        khai = (c.get('step_4') or {}).get('dataFiles') or []
        bao_cao = b.get('_du_lieu') or {}
        if sorted(khai) != sorted(bao_cao.get('files') or []):
            loi(f'{ma}: step_4.dataFiles {khai} lệch với báo cáo {bao_cao.get("files")}')
        for ten in khai:
            if not TEN_FILE_DU_LIEU.match(str(ten)):
                loi(f'{ma}: tên file dữ liệu "{ten}" không phải tên trơn .csv')
            elif ten not in co_san:
                loi(f'{ma}: khai file dữ liệu "{ten}" nhưng '
                    f'frontend/public/static/da-dulieu/ không có — worker nhận 404')
        if len(set(khai)) != len(khai):
            loi(f'{ma}: khai trùng tên file dữ liệu: {khai}')

        # Khối nào THẬT SỰ đọc file nào. Dò theo tên file xuất hiện trong code:
        # mọi cách đọc đều phải gõ tên file ra (`read_csv`, `open`, `Path`), nên
        # phép dò này không phụ thuộc vào hàm nào được gọi.
        khoi_code = [k for lat in (c.get('step_1', {}).get('read') or [])
                     for k in lat if k['type'] == 'code']
        # Dò trên CẢ tên đã khai, không chỉ tên có trên đĩa: file bị xoá đi thì
        # luật 2 ở trên đã báo, và nếu ở đây chỉ dò theo đĩa thì cùng một sự cố
        # còn đẻ thêm một câu "khai thừa" nói ngược sự thật.
        ten_can_do = co_san | set(khai)
        doc_file = {ten for ten in ten_can_do
                    for k in khoi_code if f"'{ten}'" in k['code'] or f'"{ten}"' in k['code']}
        # Mã của BÀI TẬP ĐƯỢC CHẤM cũng đọc file được, từ 29/10 (xem luật 7).
        # Nó tính vào CẢ HAI chiều: một bài khai file mà chỉ bài tập dùng tới
        # thì không phải "khai thừa", và một bài tập gọi tên file mà bài không
        # khai thì phải đỏ.
        bon = c.get('step_4') or {}
        ma_bai_tap = (f'{bon.get("starterCode") or ""}\n{bon.get("solutionCode") or ""}'
                      if bon.get('tests') else '')
        doc_file |= {ten for ten in ten_can_do
                     if f"'{ten}'" in ma_bai_tap or f'"{ten}"' in ma_bai_tap}
        thua = set(khai) - doc_file
        if thua:
            loi(f'{ma}: khai file dữ liệu {sorted(thua)} nhưng không khối code nào '
                f'đọc chúng — học viên tải thêm một file không ai dùng')
        thieu = doc_file - set(khai)
        if thieu:
            loi(f'{ma}: có mã đọc {sorted(thieu)} nhưng bài KHÔNG khai trong '
                f'step_4.dataFiles — chạy là FileNotFoundError')

        chi_so = set(bao_cao.get('blocks') or [])
        for i, k in enumerate(khoi_code):
            if i in chi_so and k.get('trace'):
                loi(f'{ma}: khối {i} đọc file dữ liệu mà vẫn có bảng từng bước — '
                    'vết được sinh ở nơi không có file đó')
            if i in chi_so and k.get('tryIt'):
                loi(f'{ma}: khối {i} đọc file dữ liệu mà vẫn có nút Thử-trong-IDE — '
                    '/ide không có cơ chế nạp file, người học sẽ nhận FileNotFoundError')


def _code_bai_doc(c: dict) -> list[str]:
    """Mọi khối `code` của màn đọc, theo thứ tự đọc (không tính `terminal`)."""
    return [k['code'] for lat in (c.get('step_1', {}).get('read') or [])
            for k in lat if k['type'] == 'code']


def _noi_nhu_build(codes: list[str]) -> str:
    """Bản chép của `noi_code()` trong build.py — cố ý CHÉP, không import.

    Nếu import thì một lỗi trong `noi_code` sẽ xuất hiện ở cả hai phía phép so
    và luật 4 ở trên không chứng minh được gì. Ba bản phải khớp từng ký tự:
    đây, `noi_code` trong build.py, và `maDeThu` trong frontend/src/lib/studio-lesson.ts.
    """
    if len(codes) == 1:
        return codes[0].rstrip() + '\n'
    phan = [f'# ── Đoạn {i} ──\n{code.rstrip()}' for i, code in enumerate(codes, 1)]
    return '\n\n'.join(phan) + '\n'


def kiem_sandbox(bai: list[dict]) -> None:
    """Nút Chạy chỉ được hiện ở bài thật sự chạy được trong trình duyệt.

    `showEditorOf()` ở frontend hiện ô soạn mã khi có `starterCode`. Bài cần
    Tkinter/fork mà lỡ phát `starterCode` thì học viên bấm Chạy và nhận một
    traceback không ai giải thích — tệ hơn hẳn việc nói thẳng là phải chạy trên
    máy.

    Từ 26/10 có BÀI TẬP ĐƯỢC CHẤM (`step_4.tests`, nguồn source/practice.json),
    nên luật ở đây chia hai nhánh. Bài có bài tập thì `_mode` của BÀI ĐỌC không
    còn quyết định ô soạn mã: CT10/CT11 có code bài đọc phải chạy trên máy
    (`subprocess`) nhưng bài tập của chúng chỉ hỏi giá trị trả về, và harness
    mô phỏng đủ để chấm — `check-practice.mjs` chạy thật và chúng đạt hết ca.
    Đổi lại, bài như thế PHẢI mang `env` nói rõ chuyện đó, không thì học viên
    mất hẳn hướng dẫn "chạy trên máy" mà bản cũ có.
    """
    hop_le = {'numpy', 'pandas', 'matplotlib', 'tzdata'}
    for b in bai:
        bon = b['content_json'].get('step_4') or {}
        mode = b['_mode']
        ma = b['lesson_code']
        co_bai_tap = bool(bon.get('tests'))
        if co_bai_tap:
            kiem_bai_tap(ma, bon, mode)
        elif mode == 'local':
            if bon.get('starterCode'):
                loi(f'{ma}: bài phải chạy trên máy nhưng vẫn phát starterCode')
            if not bon.get('procedure'):
                loi(f'{ma}: bài chạy trên máy nhưng không có các bước hướng dẫn')
        else:
            if not bon.get('starterCode', '').strip():
                loi(f'{ma}: bài chạy được trong trình duyệt nhưng starterCode rỗng')
            if bon.get('procedure'):
                loi(f'{ma}: vừa có starterCode vừa có procedure — ô soạn mã sẽ bị ẩn')
        la = set(bon.get('packages') or []) - hop_le
        if la:
            loi(f'{ma}: khai gói không có wheel trong /pyodide/v314.0.7/ — {sorted(la)}')


def kiem_bai_tap(ma: str, bon: dict, mode: str) -> None:
    """Bất biến của một bài tập ĐƯỢC CHẤM.

    Mỗi luật ở đây tương ứng một cách bài tập hỏng mà KHÔNG ném gì cả: học viên
    bấm Chạy, thấy một bảng ca kiểm thử, và bảng đó nói sai.
    """
    if not bon.get('starterCode', '').strip():
        # Không có khung đề thì ô soạn mã bị ẩn (showEditorOf), nhưng `tests`
        # vẫn ở đó: bảng ca kiểm thử hiện ra mà không có chỗ nào viết code.
        loi(f'{ma}: có ca chấm nhưng starterCode rỗng — bảng ca kiểm thử không có ô để viết')
    if bon.get('procedure'):
        loi(f'{ma}: vừa có ca chấm vừa có procedure — ô soạn mã sẽ bị ẩn')
    if not (bon.get('task') or {}).get('body', '').strip():
        loi(f'{ma}: bài tập không có đề — học viên không biết phải viết gì')

    giai = bon.get('solutionCode') or ''
    if not giai.strip():
        loi(f'{ma}: bài tập không có lời giải mẫu — check-practice.mjs không có thước đo')
    elif giai.strip() == bon.get('starterCode', '').strip():
        loi(f'{ma}: lời giải mẫu TRÙNG khung đề — khung đề đang chứa đáp án')

    hd = bon.get('contract') or {}
    la = set(hd) - {'mode', 'inputVariable', 'resultVariable', 'returnType'}
    if la:
        loi(f'{ma}: contract có khoá lạ {sorted(la)} — bộ chấm bỏ qua chúng im lặng')
    if hd.get('mode') == 'script':
        for truong in ('inputVariable', 'resultVariable'):
            if not hd.get(truong):
                # Thiếu thì bộ chấm rơi về tên mặc định ('data'/'result'), tức
                # tiêm vào một tên mà đề không nói, và MỌI ca trượt với
                # NameError — trên lời giải đúng.
                loi(f'{ma}: contract mode=script nhưng thiếu {truong}')
    elif hd.get('mode') not in (None, 'function'):
        loi(f'{ma}: contract.mode lạ: {hd.get("mode")!r}')

    bieu_thuc = du_lieu = 0
    for i, ca in enumerate(bon['tests']):
        if not (ca.get('name') or '').strip():
            loi(f'{ma}: ca chấm {i} không có tên — bảng kết quả hiện một dòng trống')
        if 'call' in ca:
            bieu_thuc += 1
            if not ca.get('expect'):
                loi(f'{ma}: ca chấm {i} có call nhưng không có expect')
        elif 'input' in ca and 'expected' in ca:
            du_lieu += 1
        else:
            loi(f'{ma}: ca chấm {i} không theo hợp đồng nào — thiếu cả call và input/expected')
    # Trộn hai hợp đồng trong một bài thì `contract` chỉ đúng cho một nửa, mà
    # nửa kia không báo gì — bộ chấm phân nhánh theo từng ca nên nó cứ chạy.
    if bieu_thuc and du_lieu:
        loi(f'{ma}: trộn {bieu_thuc} ca biểu thức với {du_lieu} ca dữ liệu trong một bài')
    if du_lieu and len(bon['tests']) < 2:
        # Một ca duy nhất thì lời giải "return <hằng>" cũng đạt.
        loi(f'{ma}: chỉ có 1 ca chấm — trả hằng là đạt, bài không hỏi gì')
    if du_lieu and mode == 'local' and not bon.get('env'):
        loi(f'{ma}: code bài đọc phải chạy trên máy nhưng bài tập chấm tại đây, '
            'mà không có `env` nói rõ — học viên mất hướng dẫn chạy trên máy')


def kiem_trac_nghiem(bai: list[dict]) -> None:
    """Câu trắc nghiệm đã dựng phải khớp NGUỒN, nhất là ở chỗ đáp án nào đúng.

    VÌ SAO PHÉP KIỂM NÀY PHẢI Ở ĐÂY, không ở bộ test backend. Ca test trong
    `quizzes.service.spec.ts` so `correct` của snapshot với vị trí lựa chọn
    mang cờ trong BẢN DỰNG — nên nó chứng minh "build.py và
    normalizeQuestion nói cùng một chuyện", KHÔNG chứng minh build.py chọn
    đúng đáp án. Đã ablate: đổi build.py sang đánh dấu lựa chọn ĐẦU TIÊN là
    đúng thì cả 30 ca backend vẫn XANH, vì chúng đọc lại chính dữ liệu đã bị
    đổi. Thẩm quyền về đáp án nằm ở `correctOption` của nguồn, nên phép so
    phải chạm tới nguồn.

    Và nó không ném ở đâu cả nếu sai: một câu đánh dấu sai đáp án vẫn chấm
    bình thường, chỉ là đánh trượt mọi học viên trả lời đúng.
    """
    if not PRACTICE.is_file():
        canh_bao('không có source/practice.json — không đối chiếu được trắc nghiệm')
        return
    nguon = json.loads(PRACTICE.read_text(encoding='utf-8'))
    mcq_nguon: dict[str, list[dict]] = {}
    for l in nguon['lessons']:
        for a in l.get('mcq') or []:
            # Phẳng: câu gốc rồi các biến thể, đúng thứ tự build.py lấy.
            mcq_nguon[l['id']] = [a] + list(a.get('variants') or [])
            break

    tong = 0
    for b in bai:
        ma = b['lesson_code']
        dung = (b['content_json'].get('step_2') or {}).get('mcq') or []
        goc = mcq_nguon.get(ma) or []
        if not dung:
            if goc:
                loi(f'{ma}: nguồn có {len(goc)} câu trắc nghiệm nhưng bản dựng không phát câu nào')
            continue
        tong += len(dung)
        if len(dung) != b.get('_so_mcq'):
            loi(f'{ma}: _so_mcq={b.get("_so_mcq")} nhưng step_2.mcq có {len(dung)} câu')
        if len(dung) > len(goc):
            loi(f'{ma}: dựng ra {len(dung)} câu nhưng nguồn chỉ có {len(goc)}')
            continue

        for i, q in enumerate(dung):
            # Đối chiếu theo VỊ TRÍ: build.py lấy `[gốc] + biến thể[:n-1]` nên
            # câu thứ i của bản dựng phải là câu thứ i của nguồn. So theo nội
            # dung thì một lần đổi thứ tự lấy câu sẽ lọt qua im lặng.
            g = goc[i]
            # `question` = `prompt` của nguồn, CỘNG đoạn `code` nếu nguồn có.
            #
            # Luật này từng là `question == prompt` thẳng, và chính nó khoá cứng
            # một lỗi có thật: 471/1032 câu của gói mang một trường `code` riêng
            # mà bản dựng bỏ đi, nên **214/516 câu đang phát mất đoạn code
            # quyết định đáp án và 90 câu ở 45 bài còn TRỎ TỚI nó** — PY01, bài
            # ĐẦU TIÊN của khoá, hỏi "Kết quả ở lệnh print cuối có giá trị nào?"
            # mà không có lệnh print nào trên màn hình. Luật cũ xanh suốt, vì nó
            # kiểm bản dựng khớp một trường của nguồn chứ không kiểm câu hỏi có
            # TRẢ LỜI ĐƯỢC hay không.
            de_can = (g.get('prompt') or '').rstrip()
            code_nguon = (g.get('code') or '').strip()
            if code_nguon:
                de_can = f'{de_can}\n\n{code_nguon}'
            if q.get('question') != de_can:
                loi(f'{ma} câu {i}: `question` không khớp nguồn '
                    f'({"prompt + code" if code_nguon else "prompt"})')
                continue
            # KHÔNG có luật thứ hai kiểu "câu trỏ tới code thì phải có code", và
            # đó là một kết luận đã ĐO chứ không phải một chỗ bỏ sót.
            #
            # Tôi đã viết luật đó (regex trên "đoạn code|lệnh print|sẽ in gì…"),
            # và nó báo oan ngay bài ĐẦU TIÊN của khoá: PY01 câu 0 viết "Chạy
            # morning = 8; afternoon = 11; print(morning + afternoon) sẽ in gì?"
            # — code nằm NỘI TUYẾN trong đề, nguồn không có trường `code`, câu
            # trả lời được bình thường. Thêm phép loại trừ "đề có dấu hiệu code
            # thì bỏ qua" thì luật hết báo oan, nhưng đo lại thì nó bắt được
            # **0 ca ngay cả khi gỡ CẢ phép gấp code VÀ phép so với nguồn** —
            # vì gần như mọi đề trỏ tới code cũng chứa `(`/`=`/`print` đâu đó.
            # Một luật không thể trượt trông như hàng rào mà không phải, nên nó
            # bị xoá. Thứ CÓ răng là phép so `question == prompt + code` ngay
            # trên: ablation 214 lỗi.
            lc_goc = g.get('options') or []
            lc_dung = q.get('options') or []
            if len(lc_dung) != len(lc_goc):
                loi(f'{ma} câu {i}: dựng {len(lc_dung)} lựa chọn, nguồn có {len(lc_goc)}')
                continue
            # So theo TẬP CHỮ, không theo vị trí.
            #
            # Luật này từng là `[text...] == [text...]` thẳng, và nó đúng cho
            # tới ngày build.py bắt đầu TRỘN vị trí đáp án (xem
            # `tron_vi_tri_dap_an`). Nó phải nới đúng một bậc — từ "cùng thứ
            # tự" xuống "cùng tập chữ" — và KHÔNG nới thêm: phép so đáp án
            # ngay dưới chuyển sang so bằng CHỮ, nên một phương án bị sửa chữ,
            # bị thêm hay bị bớt vẫn đỏ.
            if sorted(o.get('text') or '' for o in lc_dung) != sorted(
                    o.get('text') or '' for o in lc_goc):
                loi(f'{ma} câu {i}: tập chữ của lựa chọn không khớp nguồn')
                continue

            danh_dau = [j for j, o in enumerate(lc_dung) if o.get('correct') is True]
            if len(danh_dau) != 1:
                loi(f'{ma} câu {i}: có {len(danh_dau)} lựa chọn được đánh dấu đúng, cần đúng 1')
                continue
            # ĐÂY là phép kiểm mà bộ test backend không làm được.
            #
            # So bằng CHỮ chứ không bằng vị trí, vì vị trí nay do phép trộn
            # quyết định. Chữ thì không: `correctOption` của nguồn trỏ tới một
            # `id`, `id` trỏ tới một phương án, và phương án đó mang chữ của
            # nó đi theo khi đổi chỗ. Nên phép so này vẫn chạm tới NGUỒN —
            # trộn sai (mang cờ `correct` sang phương án khác) là đỏ.
            chu_dung_nguon = next(
                (o.get('text') or '' for o in lc_goc if o.get('id') == g.get('correctOption')),
                None)
            chu_dung_dung = lc_dung[danh_dau[0]].get('text') or ''
            if chu_dung_dung != chu_dung_nguon:
                loi(f'{ma} câu {i}: đánh dấu đúng cho {chu_dung_dung!r}, '
                    f'nhưng nguồn nói correctOption={g.get("correctOption")!r} '
                    f'tức {chu_dung_nguon!r}')
            if not (q.get('question') or '').strip():
                loi(f'{ma} câu {i}: câu hỏi rỗng')
            # Ghép bản dựng với nguồn THEO CHỮ, cùng lý do như trên. Nguồn hôm
            # nay có 0/1032 câu trùng chữ giữa hai phương án (đã đo), nên phép
            # ghép này là song ánh; `tron_vi_tri_dap_an` cũng không trộn câu
            # trùng chữ, nên hai phía không lệch nhau được.
            fb_nguon = {o.get('text') or '': (o.get('feedback') or '') for o in lc_goc}
            for j, o in enumerate(lc_dung):
                chu = o.get('text') or ''
                if not chu.strip():
                    loi(f'{ma} câu {i}: lựa chọn {j} không có chữ')
                # `detail` là lời phản hồi RIÊNG của từng lựa chọn — thứ nói
                # vì sao lựa chọn SAI là sai. Nguồn có nó cho cả 3 096 lựa
                # chọn; mất nó thì học viên chọn sai rồi chỉ thấy một dấu X,
                # và màn trắc nghiệm hết tác dụng dạy. Bỏ đi không làm gì đỏ
                # nên phải canh ở đây.
                #
                # Từ ngày có phép trộn, luật này canh thêm một lỗi KHÁC và tệ
                # hơn: `feedback` phải đi THEO phương án, không theo vị trí.
                # Trộn chữ mà để lời phản hồi ở lại chỗ cũ thì học viên chọn
                # sai rồi đọc được lời giải thích của một phương án khác — và
                # không ngoại lệ nào được ném. So THEO CHỮ bắt được đúng chuyện
                # đó, so theo vị trí thì không.
                if fb_nguon.get(chu, '').strip() and not (o.get('detail') or '').strip():
                    loi(f'{ma} câu {i}: lựa chọn {j} ({chu!r}) mất `detail` — nguồn CÓ feedback')
                if fb_nguon.get(chu) and (o.get('detail') or '') != fb_nguon[chu]:
                    loi(f'{ma} câu {i}: lựa chọn {j} ({chu!r}) mang `detail` của phương án khác')

    # MIN_POOL của backend là 5 CÂU: 3 câu mỗi bài nghĩa là phải xong 2 bài mới
    # mở được quiz ôn. Hạ xuống 1-2 câu/bài là đổi hành vi người dùng thấy
    # được (phải xong 3-5 bài), nên con số này phải được canh.
    for b in bai:
        n = len((b['content_json'].get('step_2') or {}).get('mcq') or [])
        if n and n < 3:
            loi(f'{b["lesson_code"]}: chỉ {n} câu trắc nghiệm — cần ≥3 để 2 bài '
                'đủ MIN_POOL=5 của kho quiz')
    if tong and tong != 3 * len(bai):
        canh_bao(f'tổng câu trắc nghiệm là {tong}, không phải 3 × {len(bai)} bài')

    kiem_vi_tri_dap_an(bai)
    kiem_phuong_an(bai)


# Ngưỡng cho phân bố vị trí đáp án trên CẢ bản dựng, tính theo điểm phần trăm
# lệch khỏi mức đều (1/số lựa chọn).
#
# 8 điểm phần trăm, và con số đó có hai đầu:
#  · bệnh cũ là 49,4% ở vị trí 1 trên 516 câu đang phát, tức lệch +16,1 điểm —
#    ngưỡng 8 bắt nó với biên gấp đôi;
#  · bản trộn đo được 32,8 / 34,1 / 33,1 (lệch tối đa 0,8 điểm), nên ngưỡng 8
#    cách số thật 10 lần. Nó canh một THIÊN LỆCH HỆ THỐNG, không canh nhiễu
#    thống kê: với 516 câu, sai số chuẩn của một tỉ lệ 1/3 là ~2,1 điểm, nên
#    đặt ngưỡng sát hơn là tự tạo lỗi ngẫu nhiên vào ngày nguồn đổi vài câu.
NGUONG_LECH_VI_TRI = 8.0

# Trần số câu mà đáp án DÀI HƠN HẲN mọi phương án nhiễu (dài hơn 2 lần + 3 ký
# tự). Đây là một mẹo lộ bài có tên trong tài liệu đo lường: người học không
# biết câu trả lời vẫn chọn đúng vì phương án đúng được viết kỹ hơn.
#
# Nó là KHIẾM KHUYẾT CỦA NỘI DUNG, không phải của khâu dựng — phép trộn không
# chữa được (đo: 21 câu trước khi trộn, 21 câu sau khi trộn, y nhau). Nên đây
# là một mốc TRẦN như mốc lint của backend: **chỉ được hạ**. Gói nội dung mới
# làm nó tăng là một câu hỏi phải viết lại, không phải một con số phải nới.
TRAN_LECH_DO_DAI = 21

# "Tất cả đều đúng" / "không phương án nào đúng" bị CẤM HẲN (VAN-PHONG.md §8
# M2). Lý do không phải thẩm mỹ: chúng biến câu 3 phương án thành câu đúng/sai
# đội lốt, và người học loại được chúng bằng luật "ra đề thì ít ai viết vậy"
# mà không cần biết nội dung. Nguồn hôm nay có 0 câu như vậy — luật này canh
# gói nội dung SAU.
CAM_PHUONG_AN = (
    ('tất cả', 'đúng'), ('tất cả', 'trên'), ('cả ba', 'đúng'), ('cả 3', 'đúng'),
    ('không', 'nào', 'đúng'), ('all of the above',), ('none of the above',),
)


def _la_day_so(texts: list[str]) -> bool:
    """Mọi phương án đều là số? — bản ĐỘC LẬP của `la_day_so()` trong build.py.

    Cố ý CHÉP chứ không import: nếu check.py gọi chính hàm của build.py thì một
    lỗi trong phép phân loại đó xuất hiện ở CẢ HAI phía phép so, và luật miễn
    trừ dưới đây không chứng minh được gì. Đúng lý do mà `_noi_nhu_build()`
    trong file này cũng là bản chép.
    """
    if not texts:
        return False
    for t in texts:
        try:
            float((t or '').strip().replace('_', ''))
        except ValueError:
            return False
    return True


def kiem_vi_tri_dap_an(bai: list[dict]) -> None:
    """Vị trí đáp án phải RẢI ĐỀU — trên cả khoá và trong từng bài.

    VÌ SAO LUẬT NÀY PHẢI CÓ. Ngân hàng nguồn được dựng bằng cách XOAY vị trí
    đáp án theo công thức, không trộn. Đo trên nguồn: 1 032 câu, tất cả đúng 3
    phương án, mà **519 câu (50,3%) có đáp án ở vị trí 1**; cả 172 bài chỉ sinh
    ra **8 dãy vị trí khác nhau**, và câu đầu mỗi bài chạy đúng chu kỳ 1→3→2.
    Trên 516 câu ĐANG PHÁT thì là 49,4% / 31,4% / 19,2%, với **16 bài có cả 3
    câu cùng một vị trí** và **88 bài** mà bấm "a" cho mọi câu đúng ≥2/3.

    Và nó không ném ở đâu cả: mọi câu vẫn chấm bình thường, chỉ là phần chấm
    trắc nghiệm không đo được học viên có hiểu hay không. Thứ duy nhất nhìn
    thấy được chuyện này là một phép đếm trên CẢ bản dựng — nên nó ở đây, chứ
    không ở một ca test đọc một bài.
    """
    vi_tri: list[int] = []
    so_lua_chon = Counter()
    for b in bai:
        ma = b['lesson_code']
        cau = (b['content_json'].get('step_2') or {}).get('mcq') or []
        trong_bai: list[int] = []
        toan_day_so = bool(cau)
        for q in cau:
            op = q.get('options') or []
            j = next((k for k, o in enumerate(op) if o.get('correct') is True), None)
            if j is None:
                continue  # đã có luật riêng báo chuyện này
            trong_bai.append(j)
            vi_tri.append(j)
            so_lua_chon[len(op)] += 1
            if not _la_day_so([o.get('text') or '' for o in op]):
                toan_day_so = False
        # Trong MỖI bài, các câu không được dồn vào một vị trí. Ngẫu nhiên
        # THUẦN không đủ để hứa điều này: với đề 3 câu, xác suất cả 3 cùng vị
        # trí là 1/9, tức ~19/172 bài sẽ trông y như bệnh cũ với người học. Nên
        # build.py trộn CÓ PHÂN TẦNG, và đây là phép kiểm của tính chất đó.
        #
        # MIỄN TRỪ cho bài mà MỌI câu là dãy số: những câu đó được SẮP chứ
        # không trộn (xem `la_day_so()` trong build.py), nên vị trí đáp án do
        # chính con số quyết định và không có cách nào rải nó. Hôm nay đúng 1
        # bài rơi vào đây — NP16, cả 3 câu đáp án nằm giữa hai nhiễu kẹp hai
        # bên. Miễn trừ này HẸP có chủ đích: một bài chỉ cần MỘT câu không phải
        # dãy số là hết miễn trừ.
        if len(trong_bai) > 1 and len(set(trong_bai)) == 1 and not toan_day_so:
            loi(f'{ma}: cả {len(trong_bai)} câu trắc nghiệm có đáp án ở cùng vị trí '
                f'{trong_bai[0] + 1} — bấm một phương án là đúng hết bài')
    if not vi_tri:
        return
    k = max(so_lua_chon) if so_lua_chon else 3
    deu = 100.0 / k
    dem = Counter(vi_tri)
    for p in range(k):
        ti_le = 100.0 * dem.get(p, 0) / len(vi_tri)
        if abs(ti_le - deu) > NGUONG_LECH_VI_TRI:
            loi(f'đáp án ở vị trí {p + 1} chiếm {ti_le:.1f}% ({dem.get(p, 0)}/{len(vi_tri)} '
                f'câu), lệch quá {NGUONG_LECH_VI_TRI:.0f} điểm khỏi mức đều {deu:.1f}% — '
                'vị trí đáp án đang theo công thức, không được trộn')


def kiem_phuong_an(bai: list[dict]) -> None:
    """Ba bẫy còn lại của VAN-PHONG.md §8 M2, trên bản dựng.

    Trộn vị trí không chữa được bẫy nào trong ba bẫy này — chúng là tính chất
    của chính các phương án — nên chúng cần phép đếm riêng, không phải một
    nhánh của phép trộn.
    """
    cam: list[str] = []
    lech_dai: list[str] = []
    lien_truoc = tong = 0
    for b in bai:
        ma = b['lesson_code']
        for i, q in enumerate((b['content_json'].get('step_2') or {}).get('mcq') or []):
            op = q.get('options') or []
            texts = [o.get('text') or '' for o in op]
            for t in texts:
                thap = t.lower()
                if any(all(x in thap for x in bo) for bo in CAM_PHUONG_AN):
                    cam.append(f'{ma} câu {i}: phương án bị cấm {t!r}')
            j = next((k for k, o in enumerate(op) if o.get('correct') is True), None)
            if j is None or len(op) < 3:
                continue
            tong += 1
            nhieu_dai = max(len(t) for k, t in enumerate(texts) if k != j)
            # Đáp án dài hơn 2 lần + 3 ký tự: "+3" để một đáp án 5 ký tự cạnh
            # nhiễu 1 ký tự ("Thiếu" vs "0") không bị đếm chỉ vì cả hai đều
            # ngắn.
            if len(texts[j]) >= 2 * max(nhieu_dai, 1) + 3:
                lech_dai.append(f'{ma} câu {i}: đáp án {len(texts[j])} ký tự, '
                                f'nhiễu dài nhất {nhieu_dai}')
            # Bẫy thứ ba: nhiễu GIỐNG ĐÁP ÁN NHẤT không được LUÔN đứng liền
            # trước đáp án — người học quét hai phương án cạnh nhau rồi chọn
            # cái sau là đúng, không cần đọc đề. Với 3 phương án, mức tình cờ
            # là 1/3 (đáp án ở vị trí 2 hoặc 3 — xác suất 2/3 — rồi nhiễu
            # giống nhất rơi đúng vào chỗ trước nó — 1/2). Đo được: 24,8%
            # trước khi trộn (THẤP hơn tình cờ, vì đáp án hay ở vị trí 1 nơi
            # không có "liền trước"), 32,6% sau khi trộn.
            giong = max(range(len(texts)), key=lambda k: (
                -1.0 if k == j else SequenceMatcher(None, texts[j], texts[k]).ratio()))
            if giong == j - 1:
                lien_truoc += 1
    for m in cam:
        loi(m)
    if len(lech_dai) > TRAN_LECH_DO_DAI:
        loi(f'{len(lech_dai)} câu có đáp án dài hơn hẳn mọi nhiễu, trần là '
            f'{TRAN_LECH_DO_DAI} — đáp án dài hơn hẳn là mẹo lộ bài, '
            f'phải viết lại câu chứ không nới trần. Ví dụ: {lech_dai[:3]}')
    elif len(lech_dai) < TRAN_LECH_DO_DAI:
        canh_bao(f'chỉ còn {len(lech_dai)} câu lệch độ dài (trần {TRAN_LECH_DO_DAI}) — '
                 'hạ TRAN_LECH_DO_DAI trong check.py xuống con số này')
    if tong:
        ti_le = 100.0 * lien_truoc / tong
        # Ngưỡng 50%: mức tình cờ là 33,3%, nên 50% là "nhiều hơn tình cờ một
        # nửa" — đủ xa để không báo oan, đủ gần để bắt được một luật sắp xếp
        # (nếu nhiễu giống nhất LUÔN đứng liền trước thì tỉ lệ là 66,7%, vì nó
        # chỉ không làm được khi đáp án ở vị trí 1).
        if ti_le > 50.0:
            loi(f'{lien_truoc}/{tong} câu ({ti_le:.1f}%) có nhiễu giống đáp án nhất '
                'đứng LIỀN TRƯỚC đáp án — mức tình cờ là 33,3%, đây là một luật '
                'sắp xếp người học đọc ra được')


def kiem_curricula(bai: list[dict]) -> None:
    """curricula.json (trang khoá học) và lessons.json (bài học) không được lệch.

    Đây là bẫy "hai nguồn danh sách bài" trong AGENTS.md: trang khoá học đọc file
    tĩnh, nội dung bài đọc từ DB. Quên bước chép là trang khoá hiện giáo trình cũ.
    """
    if not CURRICULA.is_file():
        canh_bao('chưa có frontend/src/lib/curricula.json để đối chiếu')
        return
    data = json.loads(CURRICULA.read_text(encoding='utf-8'))
    khoa = data.get('CURRICULA', {}).get('python_advanced')
    if not khoa:
        loi('curricula.json không có khối python_advanced')
        return
    trong_trang = [t for m in khoa['modules'] for t in m['lessons']]
    trong_db = [b['title'] for b in bai]
    if trong_trang != trong_db:
        loi(f'curricula.json lệch với bản dựng: trang có {len(trong_trang)} bài, '
            f'bản dựng có {len(trong_db)} — chạy `py scripts/pe-da/sync_curricula.py`')


if __name__ == '__main__':
    sys.exit(main())
