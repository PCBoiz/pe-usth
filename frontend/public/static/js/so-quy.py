"""Động cơ mini-game "Sổ quỹ chung" (bài T05) — chạy BÊN TRONG Pyodide.

studio-lesson.worker.js tải file này MỘT lần (lần đầu có màn game cần nó), exec,
rồi gọi `_so_quy_main(code, cau_hinh_json)` và gửi nguyên chuỗi JSON trả về
cho phía React. Phía React chỉ PHÁT LẠI vết này (frontend/src/lib/so-quy-replay.ts);
kéo thanh tua không chạy lại Python. scripts/pe-v4/check_so_quy.py (CPython) và
scripts/pe-v4/check-so-quy.mjs (Pyodide thật) nạp CHÍNH file này để kiểm.

VÌ SAO KHÔNG DÙNG THREAD: Pyodide không mở được thread thật, và bộ chấm của
Studio chạy target của thread LẦN LƯỢT — `step_4.env` của T05 tự ghi race
condition không tái hiện được ở đó. Mà dù có thread thật, race là chuyện may
rủi: người học sửa xong thấy đúng chưa chắc vì đã sửa đúng. Ở đây không có may
rủi nào: hai hàm thành hai generator, một bộ lập lịch TẤT ĐỊNH cho chúng chạy
xen kẽ, cùng code thì chạy 100 lần ra đúng một vết.

MỘT NHỊP LÀ GÌ — đổi so với đề xuất "chèn yield sau mỗi câu lệnh", có lý do:
mỗi nhịp là đúng MỘT lần một người đụng vào thứ dùng chung (đọc sổ, ghi sổ,
lấy khoá, chờ khoá, trả khoá). Phần tính toán cục bộ giữa hai lần đụng chạy
liền trong nhịp của người đó. Cắt theo câu lệnh thì sai ở chỗ dạy: viết gộp
`so_quy.ghi(so_quy.doc() + so_tien)` trên MỘT dòng sẽ đọc-rồi-ghi trong cùng
một nhịp, lịch luân phiên ra 160 dù không khoá — người học tưởng đúng, đúng
cái "lần này may" mà màn này sinh ra để diệt. Xen kẽ phần cục bộ thì không đổi
được kết quả nào, nên cắt ở chỗ dùng chung là đủ và mỗi nhịp đều có nghĩa.

LỊCH LÀM LỘ LỖI: chạy lịch luân phiên A, B, A, B… trước. Đạt thì CHƯA tin: dò
thêm mọi lịch "chạy liền, chỉ bị chen ngang tối đa 2 lần" theo thứ tự cố định,
báo lịch ĐẦU TIÊN làm hỏng. Ví dụ chỉ khoá quanh lần đọc rồi ghi ngoài khoá:
luân phiên ra 160, nhưng lịch "A đọc xong trả khoá, B đọc, rồi cả hai ghi" ra
110 — không dò thì bản sai ấy được chấm đạt.

VÒNG LẶP VÔ HẠN: mọi thân vòng lặp được chèn `_buoc(dòng)`; quá MAX_BUOC bước
thì cắt kèm số dòng. Vòng lặp có đụng sổ quỹ thì còn trần MAX_NHIP nhịp. Thứ
duy nhất không cắt được ở đây là một BIỂU THỨC chạy mãi (`sum(itertools.count())`)
— chỗ đó vẫn do `worker.terminate()` sau 5 giây ở phía React lo, như mọi bài.
"""
import ast
import contextlib
import io
import json

PHIEN_BAN = 1
MAX_NHIP = 200
MAX_BUOC = 100000
# Trần cho cả đợt dò lịch: dừng dò (giữ kết quả lịch luân phiên) chứ không để
# lượt chạy chạm 5 giây rồi bị giết mất cả vết.
MAX_NHIP_DO = 20000
MAX_CHEN = 2
TEN_FILE = '<bai>'

# Thao tác trên sổ quỹ / khoá được biến thành điểm dừng của generator.
API_SO = ('doc', 'ghi')
API_KHOA = {'acquire': 'lay', 'release': 'tra'}


class _QuaBuoc(BaseException):
    """BaseException để `except Exception:` trong code người học không nuốt mất."""

    def __init__(self, dong):
        super().__init__(dong)
        self.dong = dong


class _LoiMan(Exception):
    """Lỗi của luật màn chơi (không phải lỗi Python) — kèm dòng nếu biết."""

    def __init__(self, loai, cau, dong=None, nhip_cuoi=False):
        super().__init__(cau)
        self.loai, self.cau, self.dong = loai, cau, dong
        # True: lỗi thuộc về nhịp VỪA ghi (kẹt khoá, quá trần nhịp), không phải
        # một nhịp chạy dở chưa kịp ghi.
        self.nhip_cuoi = nhip_cuoi


class SoQuy:
    def __init__(self, so_du):
        self.so_du = so_du
        self.phien = 0          # tăng sau mỗi lần ghi
        self.ghi_cuoi = None    # (ai, giá trị, nhịp) của lần ghi gần nhất

    # Gọi thẳng (không qua bộ lập lịch) chỉ xảy ra khi người học đặt lời gọi
    # trong hàm phụ, lambda hay comprehension — những chỗ không chèn yield được.
    def doc(self):
        raise _LoiMan('ngoai_luong', 'so_quy.doc() chỉ chạy được khi gọi thẳng trong thân hàm của người nộp.')

    def ghi(self, *_):
        raise _LoiMan('ngoai_luong', 'so_quy.ghi(...) chỉ chạy được khi gọi thẳng trong thân hàm của người nộp.')

    def __repr__(self):
        return '<sổ quỹ>'


class Khoa:
    def __init__(self):
        self.giu = None  # chỉ số người đang giữ

    def _sai(self, *_):
        raise _LoiMan('ngoai_luong', 'Khoá chỉ dùng được bằng `with khoa:` ngay trong thân hàm của người nộp.')

    __enter__ = __exit__ = acquire = release = _sai

    def __repr__(self):
        return '<khoá>'


class _YeuCau:
    __slots__ = ('viec', 'vat', 'doi_so', 'dong')

    def __init__(self, viec, vat, doi_so, dong):
        self.viec, self.vat, self.doi_so, self.dong = viec, vat, doi_so, dong


# ------------------------------------------------------------ biến đổi cây

def _ten(id_):
    return ast.Name(id=id_, ctx=ast.Load())


def _yeu_cau(viec, vat, doi_so, dong):
    """`(yield _YC('doc', so_quy, [], 3))` — giá trị gửi lại qua gen.send()."""
    return ast.Yield(value=ast.Call(
        func=_ten('_YC'),
        args=[ast.Constant(viec), vat, ast.List(elts=doi_so, ctx=ast.Load()), ast.Constant(dong)],
        keywords=[]))


class _ChenBuoc(ast.NodeTransformer):
    """Đầu mỗi thân for/while: `_buoc(dòng)` — áp cho CẢ module, kể cả hàm phụ."""

    def _chen(self, node):
        self.generic_visit(node)
        goi = ast.Expr(ast.Call(func=_ten('_buoc'), args=[ast.Constant(node.lineno)], keywords=[]))
        node.body.insert(0, ast.copy_location(goi, node))
        return node

    visit_For = visit_While = visit_AsyncFor = _chen


class _ThanhGenerator(ast.NodeTransformer):
    """Biến thân hàm của một người thành generator dừng ở mỗi thao tác dùng chung.

    Không đi vào hàm lồng, lambda, comprehension: `yield` ở đó hoặc là lỗi cú
    pháp, hoặc biến chính chỗ đó thành generator. Lời gọi ở những chỗ ấy rơi
    vào SoQuy.doc() thật — nó báo một câu dễ hiểu thay vì chạy sai im lặng.
    """

    def __init__(self):
        self.dem = 0

    def _bo_qua(self, node):
        return node

    visit_FunctionDef = visit_AsyncFunctionDef = visit_Lambda = visit_ClassDef = _bo_qua
    visit_ListComp = visit_SetComp = visit_DictComp = visit_GeneratorExp = _bo_qua

    def visit_Yield(self, node):
        raise _LoiMan('cu_phap', 'Màn này không dùng yield trong hàm của người nộp.', node.lineno)

    visit_YieldFrom = visit_Await = visit_Yield

    def visit_Call(self, node):
        self.generic_visit(node)
        f = node.func
        if not isinstance(f, ast.Attribute) or node.keywords or any(isinstance(a, ast.Starred) for a in node.args):
            return node
        if f.attr in API_SO:
            moi = _yeu_cau(f.attr, f.value, list(node.args), node.lineno)
        elif f.attr in API_KHOA and not node.args:
            moi = _yeu_cau(API_KHOA[f.attr], f.value, [], node.lineno)
        else:
            return node
        return ast.copy_location(moi, node)

    def visit_With(self, node):
        self.generic_visit(node)
        than = node.body
        # `with a, b:` = `with a:` lồng `with b:` — dựng từ trong ra ngoài.
        for muc in reversed(node.items):
            than = self._boc(muc, than, node.lineno)
        return than

    def _boc(self, muc, than, dong):
        self.dem += 1
        k, ok = f'_k{self.dem}', f'_ok{self.dem}'
        gan = lambda ten, gia_tri: ast.Assign(targets=[ast.Name(id=ten, ctx=ast.Store())], value=gia_tri)
        trong = []
        if muc.optional_vars is not None:
            trong.append(ast.Assign(targets=[muc.optional_vars], value=_ten(k)))
        trong += than
        trong.append(gan(ok, ast.Constant(True)))
        # `return`/ngoại lệ giữa chừng: trả khoá ngay (không thành nhịp), như
        # with thật. Đường bình thường: trả khoá là MỘT nhịp riêng — người học
        # thấy được lúc cửa mở cho người đang chờ.
        cuoi = ast.If(test=ast.UnaryOp(op=ast.Not(), operand=_ten(ok)),
                      body=[ast.Expr(ast.Call(func=_ten('_tra_khan'), args=[_ten(k)], keywords=[]))],
                      orelse=[])
        return [
            gan(k, muc.context_expr),
            ast.Expr(_yeu_cau('lay', _ten(k), [], dong)),
            gan(ok, ast.Constant(False)),
            ast.Try(body=trong, handlers=[], orelse=[], finalbody=[cuoi]),
            ast.Expr(_yeu_cau('tra', _ten(k), [], dong)),
        ]


def _dich(code, ten_ham):
    """Mã người học → code object đã biến đổi. Lỗi cú pháp ném _LoiMan."""
    try:
        cay = ast.parse(code, TEN_FILE)
    except SyntaxError as e:
        raise _LoiMan('cu_phap', f'Lỗi cú pháp: {e.msg}.', e.lineno)
    cay = _ChenBuoc().visit(cay)
    co_ham = set()
    for node in cay.body:
        if isinstance(node, ast.FunctionDef) and node.name in ten_ham:
            co_ham.add(node.name)
            bien_doi = _ThanhGenerator()
            node.body = [bien_doi.visit(s) for s in node.body]
            phang = []
            for s in node.body:
                phang.extend(s if isinstance(s, list) else [s])
            # Thân không có thao tác dùng chung nào vẫn phải là generator.
            ep = ast.If(test=ast.Constant(False), body=[ast.Expr(ast.Yield(value=None))], orelse=[])
            node.body = [ast.copy_location(ep, node)] + phang
    thieu = [t for t in ten_ham if t not in co_ham]
    if thieu:
        raise _LoiMan('thieu_ham', f'Chưa thấy hàm `def {thieu[0]}(...)` ở cấp ngoài cùng.', 1)
    ast.fix_missing_locations(cay)
    try:
        return compile(cay, TEN_FILE, 'exec')
    except SyntaxError as e:
        raise _LoiMan('cu_phap', f'Lỗi cú pháp: {e.msg}.', e.lineno)


def _dong_loi(tb):
    """Dòng cuối cùng thuộc code người học trong traceback."""
    dong = None
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == TEN_FILE:
            dong = tb.tb_lineno
        tb = tb.tb_next
    return dong


def _gia_tri(v):
    """Số giữ nguyên là số (để phía React so được), còn lại là repr ngắn."""
    if isinstance(v, bool) or v is None:
        return repr(v)
    if isinstance(v, (int, float)):
        return v if abs(v) < 2 ** 53 else repr(v)
    r = repr(v)
    return r if len(r) <= 40 else r[:39] + '…'


# ------------------------------------------------------------ một lượt chạy

class _Nguoi:
    def __init__(self, i, ten, so_tien, ham):
        self.i, self.ten, self.so_tien, self.ham = i, ten, so_tien, ham
        self.gen = None
        self.o = 'chua'          # chua · chay · xong
        self.yeu_cau = None      # thao tác dùng chung đang chờ thực hiện
        self.cam = None          # số đọc được gần nhất — "bong bóng" trên đầu nhân vật
        self.phien_doc = 0       # phiên sổ quỹ lúc đọc gần nhất
        self.bien = {}
        self.dong = None


class _Luot:
    """Một lần chạy trọn vẹn theo MỘT lịch. Dựng lại từ đầu cho mỗi lịch dò."""

    def __init__(self, code_obj, cau_hinh):
        self.cau_hinh = cau_hinh
        self.so_quy = SoQuy(cau_hinh['so_du'])
        self.khoa = Khoa()
        self.buoc = 0
        self.nhip = []
        self.loi = None
        self.in_ra = io.StringIO()
        self.dang_chay = None    # người đang được chạy — để lỗi Python biết của ai
        ns = {'__name__': '__bai__', '_YC': _YeuCau, '_buoc': self._buoc, '_tra_khan': self._tra_khan}
        with contextlib.redirect_stdout(self.in_ra):
            exec(code_obj, ns)
        ham = cau_hinh['ham']
        self.nguoi = [_Nguoi(i, n['ten'], n['so_tien'], ns[ham]) for i, n in enumerate(cau_hinh['nguoi'])]

    # -- gọi từ code người học
    def _buoc(self, dong):
        self.buoc += 1
        if self.buoc > MAX_BUOC:
            raise _QuaBuoc(dong)

    def _tra_khan(self, k):
        if isinstance(k, Khoa):
            k.giu = None

    # -- điều khiển một người
    def _tiep(self, p, gui):
        """Chạy p tới thao tác dùng chung kế tiếp (hoặc hết hàm)."""
        self.dang_chay = p
        while True:
            with contextlib.redirect_stdout(self.in_ra):
                try:
                    r = p.gen.send(gui) if p.gen is not None else self._khoi_dong(p)
                except StopIteration:
                    p.o, p.yeu_cau = 'xong', None
                    self._chup_bien(p, cuoi=True)
                    return
            if not isinstance(r, _YeuCau):
                gui = None
                continue
            if r.viec in API_SO and not isinstance(r.vat, SoQuy):
                gui = getattr(r.vat, r.viec)(*r.doi_so)  # đối tượng tự tạo: không phải thứ dùng chung
                continue
            if r.viec in ('lay', 'tra') and not isinstance(r.vat, Khoa):
                raise _LoiMan('khoa_la', 'Màn này chỉ có một khoá dùng chung: tham số `khoa`.', r.dong)
            p.yeu_cau, p.dong = r, r.dong
            self._chup_bien(p)
            return

    def _khoi_dong(self, p):
        p.o = 'chay'
        p.gen = p.ham(self.so_quy, self.khoa, p.so_tien)
        if not hasattr(p.gen, 'send'):
            raise _LoiMan('thieu_ham', f'`{self.cau_hinh["ham"]}` phải là một hàm.', None)
        return next(p.gen)

    def _chup_bien(self, p, cuoi=False):
        fr = None if cuoi or p.gen is None else p.gen.gi_frame
        if fr is None:
            return
        p.bien = {k: _gia_tri(v) for k, v in dict(fr.f_locals).items()
                  if not k.startswith('_') and not isinstance(v, (SoQuy, Khoa))}

    def chuan_bi(self, p):
        """Lần đầu được xét: chạy phần cục bộ tới thao tác dùng chung đầu tiên."""
        if p.o == 'chua':
            self._tiep(p, None)

    def bi_chan(self, p):
        r = p.yeu_cau
        return r is not None and r.viec == 'lay' and self.khoa.giu is not None and self.khoa.giu != p.i

    def chay_duoc(self, p):
        self.chuan_bi(p)
        return p.o != 'xong' and not self.bi_chan(p)

    def mot_nhip(self, p):
        """p thực hiện thao tác đang chờ (hoặc đứng chờ khoá) — đúng một nhịp."""
        r = p.yeu_cau
        n = len(self.nhip) + 1
        if self.bi_chan(p):
            self._ghi_nhip(p, 'cho', r.dong, None)
            return
        gia_tri, gui = None, None
        if r.viec == 'doc':
            gui = gia_tri = self.so_quy.so_du
            p.cam, p.phien_doc = gia_tri, self.so_quy.phien
        elif r.viec == 'ghi':
            if len(r.doi_so) != 1:
                raise _LoiMan('loi_chay', 'so_quy.ghi(...) nhận đúng một số.', r.dong)
            gia_tri = r.doi_so[0]
            truoc = self.so_quy.ghi_cuoi
            if self.loi is None and self.so_quy.phien != p.phien_doc and truoc is not None and truoc[0] != p.i:
                ai, cu, luc = truoc
                q = self.nguoi[ai].ten
                self.loi = {
                    'loai': 'ghi_de', 'nhip': n, 'dong': r.dong, 'ai': p.i,
                    'cau': (f'{p.ten} ghi {_gia_tri(gia_tri)} đè lên '
                            f'{_gia_tri(cu)} mà {q} vừa ghi ở nhịp {luc}. Kéo thanh tua về lúc '
                            f'{p.ten} đọc sổ để xem số {p.ten} đang cầm.'),
                }
            self.so_quy.so_du = gia_tri
            self.so_quy.phien += 1
            self.so_quy.ghi_cuoi = (p.i, gia_tri, n)
        elif r.viec == 'lay':
            if self.khoa.giu == p.i:
                raise _LoiMan('ket_khoa', f'{p.ten} lấy khoá lần nữa khi đang giữ nó: trên máy thật chương '
                              'trình đứng im mãi ở đây.', r.dong)
            self.khoa.giu = p.i
        elif r.viec == 'tra':
            if self.khoa.giu != p.i:
                raise _LoiMan('tra_khoa_la', f'{p.ten} trả một khoá mình không giữ (Python báo RuntimeError).',
                              r.dong)
            self.khoa.giu = None
        p.yeu_cau = None
        self._tiep(p, gui)
        self._ghi_nhip(p, r.viec, r.dong, gia_tri)

    def _ghi_nhip(self, p, viec, dong, gia_tri):
        self.nhip.append({
            'n': len(self.nhip) + 1,
            'ai': p.i,
            'viec': viec,
            'dong': dong,
            'gia_tri': None if gia_tri is None else _gia_tri(gia_tri),
            'so_du': _gia_tri(self.so_quy.so_du),
            'khoa': self.khoa.giu,
            'nguoi': [self._anh(q) for q in self.nguoi],
        })
        if len(self.nhip) >= MAX_NHIP and any(q.o != 'xong' for q in self.nguoi):
            raise _LoiMan('qua_nhip', f'Quá {MAX_NHIP} nhịp mà chưa ai xong — vòng lặp không dừng?', dong, True)

    def _anh(self, q):
        o = q.o
        if o == 'chay' and self.bi_chan(q):
            o = 'cho'
        return {'o': o, 'dong': q.dong, 'cam': None if q.cam is None else _gia_tri(q.cam), 'bien': dict(q.bien)}

    def ket_thuc(self):
        con = [q for q in self.nguoi if q.o != 'xong']
        if con:
            ai = con[0]
            self.dang_chay = ai
            raise _LoiMan('ket_khoa', f'{ai.ten} đứng chờ khoá mãi: không ai trả khoá.', ai.dong, True)


def _lich_luan_phien(luot, vua):
    """A, B, A, B… Người đang bị chặn vẫn được tới lượt: nhịp đó là 'đứng chờ'."""
    n = len(luot.nguoi)
    bat_dau = 0 if vua is None else vua.i + 1
    for k in range(n):
        p = luot.nguoi[(bat_dau + k) % n]
        luot.chuan_bi(p)
        if p.o != 'xong':
            if all(luot.bi_chan(q) for q in luot.nguoi if q.o != 'xong'):
                return None  # ai cũng chờ: kẹt khoá — ket_thuc() báo
            return p
    return None


def _lich_chen(diem_chen):
    """Chạy LIỀN một người tới khi xong hoặc bị chặn; sau nhịp nằm trong
    `diem_chen` thì nhường người kế tiếp (một lần "chen ngang")."""
    diem = set(diem_chen)

    def chon(luot, vua):
        n = len(luot.nguoi)
        if vua is None:
            thu_tu = list(luot.nguoi)
        else:
            thu_tu = [luot.nguoi[(vua.i + 1 + k) % n] for k in range(n)]  # vua đứng cuối
            if len(luot.nhip) in diem:
                for p in thu_tu[:-1]:
                    if luot.chay_duoc(p):
                        return p
            if luot.chay_duoc(vua):
                return vua
        for p in thu_tu:
            if luot.chay_duoc(p):
                return p
        return None  # còn người mà ai cũng bị chặn: ket_thuc() báo kẹt khoá

    return chon


def _hong(luot):
    return luot.loi is not None or luot.so_quy.so_du != _mong_doi(luot.cau_hinh)


def _mong_doi(cau_hinh):
    return cau_hinh['so_du'] + sum(n['so_tien'] for n in cau_hinh['nguoi'])


def _cac_lich(gioi_han):
    """0 lần chen, rồi 1, rồi 2 — thứ tự CỐ ĐỊNH để lịch báo ra luôn là một.

    `gioi_han` = số thao tác của lượt luân phiên + 2: chen sau khi mọi người đã
    xong thì trùng với một lịch đã dò.
    """
    yield ()
    for a in range(1, gioi_han):
        yield (a,)
    for a in range(1, gioi_han):
        for b in range(a + 1, gioi_han):
            yield (a, b)


def _ra_loi(loai, cau, dong, nhip, ai=None):
    return {'loai': loai, 'nhip': nhip, 'dong': dong, 'ai': ai, 'cau': cau}


def _ket_qua(cau_hinh, luot, lich, so_lich, loi=None):
    nguoi = [{'ten': n['ten'], 'so_tien': n['so_tien']} for n in cau_hinh['nguoi']]
    nhip = luot.nhip if luot else []
    so_du = luot.so_quy.so_du if luot else cau_hinh['so_du']
    loi = loi or (luot.loi if luot else None)
    mong_doi = _mong_doi(cau_hinh)
    return {
        'phien_ban': PHIEN_BAN,
        'nguoi': nguoi,
        'so_du_dau': cau_hinh['so_du'],
        'mong_doi': mong_doi,
        'nhip': nhip,
        'so_du': _gia_tri(so_du),
        'dat': loi is None and so_du == mong_doi,
        'loi': loi,
        'lich': lich,
        'so_lich_da_do': so_lich,
        'in_ra': (luot.in_ra.getvalue()[:4000] if luot else ''),
    }


class _LuotHong(Exception):
    def __init__(self, luot, loi):
        super().__init__(loi['cau'])
        self.luot, self.loi = luot, loi


def _cho_hong(luot):
    """(số nhịp đã ghi, người đang chạy) lúc hỏng."""
    if luot is None:
        return 0, None
    return len(luot.nhip), (luot.dang_chay.i if luot.dang_chay is not None else None)


def _chay_an_toan(code_obj, cau_hinh, chon):
    """Một lượt; mọi lỗi của người học thành `_LuotHong` mang vết tới chỗ hỏng."""
    luot = None
    try:
        luot = _Luot(code_obj, cau_hinh)
        vua = None
        while True:
            p = chon(luot, vua)
            if p is None:
                break
            luot.mot_nhip(p)
            vua = p
        luot.ket_thuc()
        return luot
    except _LoiMan as e:
        n, ai = _cho_hong(luot)
        dong = e.dong if e.dong is not None else _dong_loi(e.__traceback__)
        raise _LuotHong(luot, _ra_loi(e.loai, e.cau, dong, n if e.nhip_cuoi and n else n + 1, ai))
    except _QuaBuoc as e:
        n, ai = _cho_hong(luot)
        raise _LuotHong(luot, _ra_loi('vong_lap', f'Vòng lặp chạy quá {MAX_BUOC} bước mà không dừng.',
                                      e.dong, n + 1, ai))
    except Exception as e:  # lỗi Python trong code người học
        n, ai = _cho_hong(luot)
        raise _LuotHong(luot, _ra_loi('loi_chay', f'{type(e).__name__}: {e}', _dong_loi(e.__traceback__),
                                      n + 1, ai))


def chay_so_quy(code, cau_hinh):
    """Trả dict vết. Không bao giờ ném lỗi vì code người học.

    Vết mang theo chính đoạn code đã chạy (`ma`): phía React hiện code cạnh
    thanh tua, và người học có thể sửa ô soạn trong lúc đang tua — vết phải
    chỉ vào code CỦA NÓ, không phải code đang nằm trong ô soạn.
    """
    kq = _chay_so_quy(code, cau_hinh)
    kq['ma'] = code
    return kq


def _chay_so_quy(code, cau_hinh):
    ten_ham = [cau_hinh['ham']]
    try:
        code_obj = _dich(code, ten_ham)
    except _LoiMan as e:
        return _ket_qua(cau_hinh, None, {'kieu': 'luan-phien', 'chen': []}, 0, _ra_loi(e.loai, e.cau, e.dong, 0))
    try:
        luot = _chay_an_toan(code_obj, cau_hinh, _lich_luan_phien)
    except _LuotHong as h:
        return _ket_qua(cau_hinh, h.luot, {'kieu': 'luan-phien', 'chen': []}, 1, h.loi)
    if _hong(luot):
        return _ket_qua(cau_hinh, luot, {'kieu': 'luan-phien', 'chen': []}, 1)
    # Luân phiên đạt: CHƯA tin — dò tiếp các lịch ít chen ngang.
    da_do, tong_nhip = 1, len(luot.nhip)
    so_thao_tac = sum(1 for x in luot.nhip if x['viec'] != 'cho')
    for chen in _cac_lich(so_thao_tac + 2):
        if tong_nhip > MAX_NHIP_DO:
            break
        da_do += 1
        try:
            thu = _chay_an_toan(code_obj, cau_hinh, _lich_chen(chen))
        except _LuotHong as h:
            return _ket_qua(cau_hinh, h.luot, {'kieu': 'chen', 'chen': list(chen)}, da_do, h.loi)
        tong_nhip += len(thu.nhip)
        if _hong(thu):
            return _ket_qua(cau_hinh, thu, {'kieu': 'chen', 'chen': list(chen)}, da_do)
    return _ket_qua(cau_hinh, luot, {'kieu': 'luan-phien', 'chen': []}, da_do)


def _doc_cau_hinh(raw):
    c = json.loads(raw) if isinstance(raw, str) else dict(raw)
    nguoi = [{'ten': str(n['ten'])[:12], 'so_tien': int(n['so_tien'])} for n in c['nguoi']][:4]
    if len(nguoi) < 2:
        raise ValueError('cần ít nhất 2 người')
    return {'so_du': int(c.get('so_du', 100)), 'nguoi': nguoi, 'ham': str(c.get('ham', 'nap'))}


def _so_quy_main(code, cau_hinh_json):
    """Điểm vào cho worker: chuỗi vào, chuỗi JSON ra."""
    return json.dumps(chay_so_quy(str(code), _doc_cau_hinh(cau_hinh_json)), ensure_ascii=False)
