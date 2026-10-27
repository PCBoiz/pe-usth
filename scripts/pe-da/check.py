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
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
SOURCE = HERE / 'source' / 'course.json'
ANH = HERE.parent.parent / 'frontend' / 'public' / 'static' / 'da'
CURRICULA = HERE.parent.parent / 'frontend' / 'src' / 'lib' / 'curricula.json'

# Năm loại khối màn đọc dựng được — khớp ReadBlock trong frontend/src/lib/studio-lesson.ts
# và mục "Hai khối mới" của SCHEMA.md. Ba chỗ này phải đổi CÙNG LÚC.
LOAI_KHOI = {'paragraph', 'code', 'terminal', 'figure', 'table'}

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
    kiem_sandbox(bai)
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
