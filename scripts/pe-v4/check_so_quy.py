"""Kiểm động cơ mini-game "Sổ quỹ chung" (frontend/public/static/js/so-quy.py) bằng CPython.

    py -I scripts/pe-v4/check_so_quy.py

CÁC CA NẰM Ở ĐÂY và chạy được ở CẢ HAI runtime: file này tự chạy dưới CPython,
còn scripts/pe-v4/check-so-quy.mjs nạp chính file này vào Pyodide 0.27.7 rồi gọi
`chay_ca(nguon_dong_co)`. Một bộ ca, hai runtime — không có chuyện ca ở bên này
đạt vì viết khác ca bên kia.

Vì sao chạy các ca trong TIẾN TRÌNH CON có hạn giờ: một ca là "vòng lặp vô hạn
phải bị cắt". Nếu động cơ hết cắt được, chạy thẳng trong tiến trình này thì bộ
kiểm TREO chứ không TRƯỢT — đúng cái lỗi nó sinh ra để bắt. Tiến trình con quá
hạn bị giết và tính là trượt. Chạy hai lần với PYTHONHASHSEED khác nhau rồi so
dấu vết: "tất định" phải đúng qua cả các lần khởi động, không chỉ trong một
tiến trình.
"""
import hashlib
import json
import os
import subprocess
import sys
import time

CAU_HINH = {'so_du': 100, 'nguoi': [{'ten': 'A', 'so_tien': 50}, {'ten': 'B', 'so_tien': 10}], 'ham': 'nap'}

KHONG_KHOA = '''def nap(so_quy, khoa, so_tien):
    x = so_quy.doc()
    so_quy.ghi(x + so_tien)
'''

CO_KHOA = '''def nap(so_quy, khoa, so_tien):
    with khoa:
        x = so_quy.doc()
        so_quy.ghi(x + so_tien)
'''

# (người, việc, dòng, số dư sau nhịp) — vết THẬT của từng nhịp. Viết cứng để một
# thay đổi lịch nào cũng lộ ra, kể cả khi con số cuối vẫn trùng.
VET_KHONG_KHOA = [(0, 'doc', 2, 100), (1, 'doc', 2, 100), (0, 'ghi', 3, 150), (1, 'ghi', 3, 110)]
VET_CO_KHOA = [
    (0, 'lay', 2, 100), (1, 'cho', 2, 100), (0, 'doc', 3, 100), (1, 'cho', 2, 100),
    (0, 'ghi', 4, 150), (1, 'cho', 2, 150), (0, 'tra', 2, 150),
    (1, 'lay', 2, 150), (1, 'doc', 3, 150), (1, 'ghi', 4, 160), (1, 'tra', 2, 160),
]

MOT_DONG = '''def nap(so_quy, khoa, so_tien):
    so_quy.ghi(so_quy.doc() + so_tien)
'''
KHOA_CHI_LUC_DOC = '''def nap(so_quy, khoa, so_tien):
    with khoa:
        x = so_quy.doc()
    so_quy.ghi(x + so_tien)
'''
VO_HAN = '''def nap(so_quy, khoa, so_tien):
    while True:
        x = 1
'''
VO_HAN_CO_DOC = '''def nap(so_quy, khoa, so_tien):
    while True:
        so_quy.doc()
'''
QUEN_TRA = '''def nap(so_quy, khoa, so_tien):
    khoa.acquire()
    x = so_quy.doc()
    so_quy.ghi(x + so_tien)
'''
CO_TRA = QUEN_TRA + '    khoa.release()\n'
SAI_CU_PHAP = '''def nap(so_quy, khoa, so_tien)
    pass
'''
# Gõ sai tên biến — lỗi Python thật nhất của người học. NameError chứ không phải
# chia cho 0: câu báo của ZeroDivisionError đổi giữa CPython 3.12 (Pyodide) và 3.14.
GO_SAI_TEN = '''def nap(so_quy, khoa, so_tien):
    x = so_quy.doc()
    so_quy.ghi(x + so_tein)
'''

# Vết THẬT mà test phía React (frontend/e2e/unit/so-quy-replay.test.mjs) phát lại.
# Không viết tay: bẫy số 1 của AGENTS.md là fixture không giống dữ liệu thật. File
# do `--ghi-mau` sinh, và ca "vết mẫu khớp động cơ" dưới đây trượt ngay khi động
# cơ đổi mà quên sinh lại — ở cả CPython lẫn Pyodide.
# Ghi đè ở nhịp 4 nhưng vết dài 6: phát lại phải DỪNG ở chỗ hỏng, không chạy tới cuối.
DOC_LAI = KHONG_KHOA + '    so_quy.doc()\n'
MAU ={'khong_khoa': KHONG_KHOA, 'co_khoa': CO_KHOA, 'khoa_chi_luc_doc': KHOA_CHI_LUC_DOC,
       'go_sai_ten': GO_SAI_TEN, 'doc_lai': DOC_LAI}
DUONG_MAU = ('frontend', 'e2e', 'unit', 'fixtures', 'so-quy-vet.json')

GIOI_HAN_MS = 5000  # cửa sổ 5 giây của trình duyệt — lời báo có dòng phải về trước nó


def _vet(t):
    return [(x['ai'], x['viec'], x['dong'], x['so_du']) for x in t['nhip']]


def vet_mau(main):
    ch = json.dumps(CAU_HINH)
    return {ten: json.loads(main(code, ch)) for ten, code in MAU.items()}


def chay_ca(nguon_dong_co, mau_da_ghi=None):
    """Chạy mọi ca trên động cơ nạp từ chuỗi nguồn. Trả danh sách dict (tên, đạt, chi tiết, ms).

    `mau_da_ghi`: nội dung so-quy-vet.json đã commit (chuỗi) — có thì so với động cơ.
    """
    ns = {'__name__': 'so_quy_dong_co'}
    exec(nguon_dong_co, ns)
    main = ns['_so_quy_main']
    ch = json.dumps(CAU_HINH)

    def chay(code):
        t0 = time.perf_counter()
        raw = main(code, ch)
        return json.loads(raw), raw, round((time.perf_counter() - t0) * 1000)

    ket_qua = []

    def ca(ten, ham):
        t0 = time.perf_counter()
        try:
            chi_tiet = ham()
            dat = chi_tiet is None
        except Exception as e:  # ca hỏng vì động cơ ném lỗi = trượt, không làm sập bộ kiểm
            dat, chi_tiet = False, f'{type(e).__name__}: {e}'
        ket_qua.append({'ten': ten, 'dat': dat, 'chi_tiet': chi_tiet or '',
                        'ms': round((time.perf_counter() - t0) * 1000)})

    def chua_khoa():
        t, _, _ = chay(KHONG_KHOA)
        if t['so_du'] != 110 or t['dat']:
            return f"sổ ra {t['so_du']}, dat={t['dat']} — phải 110 và không đạt"
        loi = t['loi'] or {}
        if (loi.get('loai'), loi.get('nhip'), loi.get('dong'), loi.get('ai')) != ('ghi_de', 4, 3, 1):
            return f'lỗi phải gắn ghi_de · nhịp 4 · dòng 3 · B, nhận {loi}'
        if _vet(t) != VET_KHONG_KHOA:
            return f'vết lệch: {_vet(t)}'
        return None

    def da_khoa():
        t, _, _ = chay(CO_KHOA)
        if t['so_du'] != 160 or not t['dat'] or t['loi'] is not None:
            return f"sổ ra {t['so_du']}, dat={t['dat']}, loi={t['loi']} — phải 160 và đạt"
        if _vet(t) != VET_CO_KHOA:
            return f'vết lệch: {_vet(t)}'
        # Nhịp 2: B đứng chờ ngoài cửa, A giữ khoá.
        n2 = t['nhip'][1]
        if n2['khoa'] != 0 or n2['nguoi'][1]['o'] != 'cho':
            return f"nhịp 2 phải là A giữ khoá, B chờ — nhận khoa={n2['khoa']}, B={n2['nguoi'][1]['o']}"
        # Biến cục bộ: B đọc 150 ở nhịp 9 (sau khi A đã trả khoá).
        if t['nhip'][8]['nguoi'][1]['bien'].get('x') != 150:
            return f"nhịp 9: x của B phải là 150, nhận {t['nhip'][8]['nguoi'][1]['bien']}"
        return None

    def mot_vet(code):
        def kiem():
            mau = chay(code)[1]
            khac = sum(1 for _ in range(99) if chay(code)[1] != mau)
            return f'{khac}/99 lần chạy ra vết khác lần đầu' if khac else None
        return kiem

    def lo_loi(code, mong):
        def kiem():
            t, _, _ = chay(code)
            if t['dat']:
                return f"được chấm ĐẠT với sổ {t['so_du']} — bản sai lọt qua"
            if mong is not None and t['so_du'] != mong:
                return f"sổ ra {t['so_du']}, mong {mong}"
            return None
        return kiem

    def bi_cat(code, loai, dong):
        def kiem():
            t, _, ms = chay(code)
            loi = t['loi'] or {}
            if loi.get('loai') != loai or loi.get('dong') != dong:
                return f'phải báo {loai} ở dòng {dong}, nhận {loi}'
            if ms >= GIOI_HAN_MS:
                return f'cắt sau {ms} ms — trình duyệt đã giết worker ở {GIOI_HAN_MS} ms, mất lời báo có dòng'
            return None
        return kiem

    def dat_160(code):
        def kiem():
            t, _, _ = chay(code)
            return None if t['dat'] and t['so_du'] == 160 else f"sổ {t['so_du']}, loi={t['loi']}"
        return kiem

    def cu_phap():
        t, _, _ = chay(SAI_CU_PHAP)
        loi = t['loi'] or {}
        return None if (loi.get('loai'), loi.get('dong')) == ('cu_phap', 1) else f'nhận {loi}'

    ca('chưa khoá: sổ ra 110, lỗi ghi đè ở nhịp 4 · dòng 3', chua_khoa)
    ca('đã khoá: sổ ra 160, B đứng chờ ngoài cửa', da_khoa)
    ca('chưa khoá: chạy 100 lần ra đúng một vết', mot_vet(KHONG_KHOA))
    ca('đã khoá: chạy 100 lần ra đúng một vết', mot_vet(CO_KHOA))
    ca('gộp đọc-ghi trên một dòng vẫn lộ lỗi (110)', lo_loi(MOT_DONG, 110))
    ca('chỉ khoá lúc đọc: dò lịch bắt được, không chấm đạt', lo_loi(KHOA_CHI_LUC_DOC, None))
    ca('vòng lặp vô hạn trong thân hàm bị cắt, báo đúng dòng', bi_cat(VO_HAN, 'vong_lap', 2))
    ca('vòng lặp vô hạn có đọc sổ bị cắt ở trần nhịp', bi_cat(VO_HAN_CO_DOC, 'qua_nhip', 3))
    ca('acquire mà quên release: kẹt khoá, không treo', bi_cat(QUEN_TRA, 'ket_khoa', 2))
    ca('acquire + release: sổ ra 160', dat_160(CO_TRA))
    ca('lỗi cú pháp báo đúng dòng', cu_phap)

    def khop_mau():
        if json.loads(mau_da_ghi) != vet_mau(main):
            return 'so-quy-vet.json lệch động cơ — chạy: py -I scripts/pe-v4/check_so_quy.py --ghi-mau'
        return None

    if mau_da_ghi is not None:
        ca('vết mẫu của test phía React khớp động cơ', khop_mau)
    return ket_qua


def dau_vet(nguon_dong_co):
    """sha256 của vết hai lần chạy chính — để so giữa các tiến trình/runtime."""
    ns = {'__name__': 'so_quy_dong_co'}
    exec(nguon_dong_co, ns)
    ch = json.dumps(CAU_HINH)
    raw = ns['_so_quy_main'](KHONG_KHOA, ch) + '\n' + ns['_so_quy_main'](CO_KHOA, ch)
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def _goc():
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _nguon():
    with open(os.path.join(_goc(), 'frontend', 'public', 'static', 'js', 'so-quy.py'), encoding='utf-8') as f:
        return f.read()


def _mau_da_ghi():
    with open(os.path.join(_goc(), *DUONG_MAU), encoding='utf-8') as f:
        return f.read()


def main():
    if '--ghi-mau' in sys.argv:
        ns = {'__name__': 'so_quy_dong_co'}
        exec(_nguon(), ns)
        duong = os.path.join(_goc(), *DUONG_MAU)
        os.makedirs(os.path.dirname(duong), exist_ok=True)
        with open(duong, 'w', encoding='utf-8', newline=chr(10)) as f:
            json.dump(vet_mau(ns['_so_quy_main']), f, ensure_ascii=False, indent=1)
            f.write(chr(10))
        print('đã ghi', duong)
        return 0
    if '--trong' in sys.argv:  # tiến trình con
        nguon = _nguon()
        print(json.dumps({'ca': chay_ca(nguon, _mau_da_ghi()), 'dau': dau_vet(nguon)}, ensure_ascii=False))
        return 0
    lan = []
    for seed in ('0', '4242'):
        env = dict(os.environ, PYTHONHASHSEED=seed, PYTHONIOENCODING='utf-8')
        try:
            out = subprocess.run([sys.executable, '-I', os.path.abspath(__file__), '--trong'],
                                 capture_output=True, timeout=120, env=env, check=True)
        except subprocess.TimeoutExpired:
            print('✖ TREO: các ca không chạy xong trong 120 s — có vòng lặp vô hạn không bị cắt')
            return 1
        except subprocess.CalledProcessError as e:
            print(e.stderr.decode('utf-8', 'replace'))
            return 1
        lan.append(json.loads(out.stdout.decode('utf-8')))
    truot = 0
    for c in lan[0]['ca']:
        print(f"{'✔' if c['dat'] else '✖'} {c['ten']}  ({c['ms']} ms){'' if c['dat'] else '  — ' + c['chi_tiet']}")
        truot += 0 if c['dat'] else 1
    giong = lan[0]['dau'] == lan[1]['dau']
    print(f"{'✔' if giong else '✖'} cùng vết qua hai tiến trình (PYTHONHASHSEED 0 / 4242): {lan[0]['dau'][:16]}")
    truot += 0 if giong else 1
    tong = len(lan[0]['ca']) + 1
    print(f'\nCPython {sys.version.split()[0]}: {tong - truot}/{tong} ca đạt')
    return 1 if truot else 0


if __name__ == '__main__':
    sys.exit(main())
