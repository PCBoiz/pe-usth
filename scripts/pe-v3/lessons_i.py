"""PE Python v3 — Trung cấp, chặng M5–M7 (I01–I12). Nguồn: PDF trang 28–39, 68–79, 95–97, 100."""
from authoring import T, TX, out, run

PL_INIT = r'''class ProgrammingLanguage:
    def __init__(self, name, year_created, paradigms):
        self.name = name
        self.year_created = year_created
        self.paradigms = list(paradigms)
'''

PL_ADD = r'''
    def add_paradigms(self, paradigm):
        self.paradigms.append(paradigm)
'''

PL_STR = r'''
    def __str__(self):
        description = f"Language[{self.name}]"
        description += f", Year created[{self.year_created}]"
        description += f", Paradigms{self.paradigms}"
        return description
'''

PL_FULL = PL_INIT + PL_ADD + PL_STR

C_INIT = r'''class C(ProgrammingLanguage):
    def __init__(self, name, year_created, paradigms, std_version):
        super().__init__(name, year_created, paradigms)
        self.std_version = std_version
'''

C_STR = r'''
    def __str__(self):
        description = super().__str__()
        return description + f", Standard version[{self.std_version}]"
'''

C_COMPILE = r'''
    def compile(self):
        print(f"Compiling C code using standard version {self.std_version}")
'''

IMPORT_BASE = 'from language_base import ProgrammingLanguage\n\n'

K_INIT = dict(sig='ProgrammingLanguage.__init__(self, name, year_created, paradigms)',
              does='Khởi tạo ba thuộc tính của object.',
              takes='self: object hiện tại; name: str; year_created: int; paradigms: list[str]',
              gives='None — lời gọi class mới tạo ra object, không phải giá trị của __init__',
              effect='Gán thuộc tính; list(paradigms) tạo list riêng.',
              call='ProgrammingLanguage("Python", 1991, ["procedural"])')
K_ADD = dict(sig='add_paradigms(self, paradigm)', does='Thêm một kiểu lập trình vào cuối list.',
             takes='self; paradigm: str', gives='None',
             effect='Sửa self.paradigms; giữ phần tử trùng; không in.', call='obj.add_paradigms("functional")')
K_STR = dict(sig='ProgrammingLanguage.__str__(self)', does='Biểu diễn object bằng chuỗi.',
             takes='self', gives='str đúng format v3', effect='Không print, không đổi object.',
             call="str(obj) → Language[Python], Year created[1991], Paradigms['procedural']")
K_CINIT = dict(sig='C.__init__(self, name, year_created, paradigms, std_version)',
               does='Khởi tạo phần cha và thêm phiên bản C.', takes='self; ba trường của cha; std_version: str',
               gives='None', effect='Gọi super().__init__; gán self.std_version.', call='C("C", 1972, ["procedural"], "C17")')
K_CSTR = dict(sig='C.__str__(self)', does='Giữ chuỗi của cha rồi thêm phiên bản.', takes='self: object C',
              gives='str kết thúc bằng Standard version[...]', effect='Không print, không đổi trạng thái.',
              call='str(obj) kết thúc bằng Standard version[C17]')
K_COMPILE = dict(sig='compile(self)', does='In thông báo mô phỏng biên dịch.',
                 takes='self: object C — đọc std_version hiện tại', gives='None',
                 effect='In một dòng; không chạy compiler C thật.',
                 call='obj.compile() → Compiling C code using standard version C17')


def pl(name, year, paradigms):
    return f'ProgrammingLanguage({name!r}, {year}, {paradigms!r})'


def cobj(version='C17', paradigms=('procedural',)):
    return f'C("C", 1972, {list(paradigms)!r}, {version!r})'


S_PY = "Language[Python], Year created[1991], Paradigms['procedural']"


def ex2_tests():
    """Ca chấm class ProgrammingLanguage đầy đủ (I07)."""
    return [
        T('Ba thuộc tính', f"(lambda o: (o.name, o.year_created, o.paradigms))({pl('C', 1972, ['procedural'])})",
          ('C', 1972, ['procedural'])),
        T('Thêm imperative rồi str', f"_studio.call(lambda: (lambda o: (o.add_paradigms('imperative'), str(o))[1])({pl('C', 1972, ['procedural'])})).value",
          "Language[C], Year created[1972], Paradigms['procedural', 'imperative']"),
        T('List rỗng: thêm được một paradigm', f"(lambda o: (o.add_paradigms('functional'), o.paradigms)[1])({pl('Go', 2009, [])})",
          ['functional']),
        TX('Hai object từ cùng list nguồn độc lập nhau',
           "_studio.check('src = [\"p\"]\\na = ProgrammingLanguage(\"A\", 1, src)\\nb = ProgrammingLanguage(\"B\", 2, src)\\n"
           "a.add_paradigms(\"x\")\\nassert b.paradigms == [\"p\"], \"B bị đổi theo A\"\\nassert src == [\"p\"], \"list nguồn bị đổi\"\\n"
           "src.append(\"y\")\\nassert a.paradigms == [\"p\", \"x\"], \"A bị đổi theo list nguồn\"')", 'True'),
        T('add_paradigms trả None, giữ trùng',
          f"(lambda o: (o.add_paradigms('p'), o.add_paradigms('p'), o.paradigms))({pl('X', 1, [])})", (None, None, ['p', 'p'])),
        T('str không tự in', f"_studio.stdout(str, {pl('C', 1972, [])})", ''),
        T('Format với list rỗng', f"str({pl('C', 1972, [])})", 'Language[C], Year created[1972], Paradigms[]'),
    ]


def ex3_tests():
    """Ca chấm class C kế thừa (I12)."""
    return [
        T('Bốn thuộc tính', f"(lambda o: (o.name, o.year_created, o.paradigms, o.std_version))({cobj()})",
          ('C', 1972, ['procedural'], 'C17')),
        T('isinstance với lớp cha', f'isinstance({cobj()}, ProgrammingLanguage)', True),
        T('str đủ bốn trường', f'str({cobj()})',
          "Language[C], Year created[1972], Paradigms['procedural'], Standard version[C17]"),
        T('compile in đúng một dòng, trả None', f'(lambda r: (r.value, r.stdout))(_studio.call({cobj()}.compile))',
          (None, 'Compiling C code using standard version C17\n')),
        T('compile dùng phiên bản hiện tại',
          f"_studio.stdout(lambda: (lambda o: (setattr(o, 'std_version', 'C23'), o.compile()))({cobj()}))",
          'Compiling C code using standard version C23\n'),
        T('Method cha vẫn dùng được', f"(lambda o: (o.add_paradigms('imperative'), o.paradigms)[1])({cobj()})",
          ['procedural', 'imperative']),
        TX('Hai object C11/C23 độc lập',
           "_studio.check('src = [\"procedural\"]\\na = C(\"C\", 1972, src, \"C11\")\\nb = C(\"C\", 1972, src, \"C23\")\\n"
           "a.add_paradigms(\"imperative\")\\nassert b.paradigms == [\"procedural\"]\\nassert (a.std_version, b.std_version) == (\"C11\", \"C23\")\\n"
           "src.append(\"x\")\\nassert a.paradigms == [\"procedural\", \"imperative\"]')", 'True'),
        T('str không in, không đệ quy', f'_studio.call(str, {cobj("C23", [])}).stdout', ''),
    ]


LESSONS = [
    # ------------------------------------------------------------------ I01
    dict(
        code='I01', title='Đọc thuộc tính object', minutes=25,
        goal='Tạo object từ class được cấp và đọc thuộc tính.',
        prereq='B20', support=['language_base.py'],
        brief='File language_base.py (đã cấp) có class ProgrammingLanguage. Tạo object language = ProgrammingLanguage("Python", 1991, ["procedural"]) rồi in ba thuộc tính name, year_created, paradigms — mỗi thuộc tính một dòng. Không viết lại class.',
        example="Python / 1991 / [\"procedural\"] → ba dòng: Python, 1991, ['procedural'].",
        demo=r'''class Book:
    def __init__(self, title, pages):
        self.title = title
        self.pages = pages

novel = Book("De Men", 120)
print(novel.title)
print(novel.pages)
''',
        explain=[
            'Class mô tả cách tạo object; mỗi object giữ dữ liệu RIÊNG của nó.',
            'Gọi tên class như gọi hàm — Book("De Men", 120) — để tạo một object.',
            'novel.title dùng dấu chấm đọc thuộc tính title của object novel.',
            'Bài này dùng import để lấy class từ file cấp sẵn: from language_base import ProgrammingLanguage.',
        ],
        predict=dict(q='Tạo object C/1972 bằng cùng class thì có phải đổi tên thuộc tính khi đọc không?', options=[
            ('Không — vẫn là .name, .year_created, .paradigms', 'Mọi object của cùng class có cùng tên thuộc tính, khác giá trị.', True),
            ('Có — mỗi object một tên thuộc tính', 'Tên thuộc tính do class quy định.', False),
            ('Phải viết lại class', 'Một class tạo được nhiều object.', False),
        ]),
        myth=('"name là một biến toàn cục"',
              'name là thuộc tính CỦA object: phải viết language.name. Gõ name trơn sẽ báo NameError (hoặc lấy nhầm một biến '
              'khác). Bài này không tự viết lại class — class nằm trong language_base.py.'),
        mcq=[
            dict(q='print(language.paradigms) với paradigms = ["procedural"] in gì?', options=[
                ("['procedural']", 'print một list in biểu diễn của list: ngoặc vuông và dấu nháy đơn.', True),
                ('procedural', 'Đó là phần tử, không phải cả list.', False),
                ('["procedural"]', 'Python biểu diễn chuỗi trong list bằng dấu nháy đơn.', False),
            ]),
            dict(q='Class và object khác nhau thế nào?', options=[
                ('Class là bản mô tả; object là một thực thể tạo từ class, giữ dữ liệu riêng', 'Một class tạo được nhiều object.', True),
                ('Là một', 'ProgrammingLanguage là class; language là object.', False),
                ('Object là file, class là hàm', 'Không đúng.', False),
            ]),
        ],
        why=dict(
            prompt='Class và object khác nhau thế nào trong ví dụ này?',
            sample='ProgrammingLanguage là class — bản mô tả gồm ba thuộc tính. language là object tạo từ class bằng lời gọi '
                   'ProgrammingLanguage("Python", 1991, ["procedural"]) và giữ giá trị riêng. Đổi sang object C/1972 vẫn đọc '
                   'bằng cùng mã language.name, language.year_created, language.paradigms.'),
        scaffold=dict(
            intro='Dữ liệu mới: C/1972/["procedural"]. Lắp lời tạo object và lệnh đọc thuộc tính.',
            template=r'''from language_base import ProgrammingLanguage

language = {{slot1}}
print(language.name)
print({{slot2}})
print(language.paradigms)
''',
            slots=['ProgrammingLanguage("C", 1972, ["procedural"])', 'language.year_created'],
            traps=[('ProgrammingLanguage', 1, 'Chỉ là class, chưa tạo object.'),
                   ('year_created', 2, 'Thiếu object phía trước → NameError.'),
                   ('language.year', 2, 'Sai tên thuộc tính → AttributeError.')]),
        flow=['Lời gọi class → object language.',
              'language.name → Python.',
              'language.year_created → 1991.',
              "language.paradigms → ['procedural']."],
        transfer='Tạo thêm object C/1972/["procedural"] và dùng cùng cách truy cập.',
        counter=dict(q='Với object C/1972/["procedural"], dòng thứ hai in gì?', options=['1972', 'year_created', 'C'], correct='1972'),
        practice='Gọi ProgrammingLanguage(...) rồi dùng dấu chấm để đọc thuộc tính.',
        steps=['from language_base import ProgrammingLanguage (đã có).',
               'language = ProgrammingLanguage("Python", 1991, ["procedural"]); in language.name, language.year_created, language.paradigms.'],
        partial=r'''language = ProgrammingLanguage("Python", 1991, ["procedural"])
print(language.name)
...''',
        io=[('Python/1991/["procedural"]', "Python\\n1991\\n['procedural']"), ('C/1972/["procedural"]', "C\\n1972\\n['procedural']")],
        starter=IMPORT_BASE + '# Tự tạo object language và in ba thuộc tính.\n',
        solution=IMPORT_BASE + r'''language = ProgrammingLanguage("Python", 1991, ["procedural"])
print(language.name)
print(language.year_created)
print(language.paradigms)
''',
        tests=[
            T('Python/1991: ba dòng', run() + '.stdout', out('Python', 1991, "['procedural']")),
            T('Object C/1972 với cùng mã truy cập',
              f"_studio.run(vars={{'language': _studio.expr({pl('C', 1972, ['procedural'])!r})}}).stdout",
              out('C', 1972, "['procedural']")),
            T('Ca riêng: Rust/2010/[]',
              f"_studio.run(vars={{'language': _studio.expr({pl('Rust', 2010, [])!r})}}).stdout", out('Rust', 2010, '[]')),
            T('language là object của ProgrammingLanguage', "type(_studio.main.var('language')).__name__", 'ProgrammingLanguage'),
        ],
        bad=[('in chữ cố định', IMPORT_BASE + 'print("Python")\nprint(1991)\nprint(["procedural"])\n')],
    ),

    # ------------------------------------------------------------------ I02
    dict(
        code='I02', title='Viết constructor', minutes=25,
        goal='Tự viết constructor và tạo list riêng cho object.',
        prereq='I01',
        brief='Tự viết __init__(self, name, year_created, paradigms) lưu ba thuộc tính; khi lưu list, tạo bản sao bằng list(paradigms). Chưa cần add_paradigms hay __str__.',
        example='ProgrammingLanguage("C", 1972, ["procedural"]) có đủ ba thuộc tính.',
        demo=r'''class Playlist:
    def __init__(self, title, songs):
        self.title = title
        self.songs = list(songs)

mine = ["Song A"]
p = Playlist("Chill", mine)
mine.append("Song B")
print(p.songs)
''',
        explain=[
            'self là object ĐANG được khởi tạo; self.title = title lưu dữ liệu vào chính object đó.',
            'list(songs) tạo một list MỚI có cùng phần tử — object không dùng chung list với nơi gọi.',
            "Sửa mine sau đó không ảnh hưởng p.songs: in ra ['Song A'].",
            '__init__ không return gì (trả None); chính lời gọi Playlist(...) trả về object.',
        ],
        predict=dict(q='Nếu list nguồn được thêm phần tử SAU khi tạo object, object có nên tự đổi theo không?', options=[
            ('Không — object giữ bản sao riêng', 'list(paradigms) tách object khỏi list của nơi gọi.', True),
            ('Có — vì cùng dữ liệu', 'Cùng dữ liệu lúc tạo không có nghĩa là cùng list.', False),
            ('Tuỳ trình thông dịch', 'Hành vi luôn xác định.', False),
        ]),
        myth=('"self.paradigms = paradigms là đủ"',
              'Gán nguyên list chỉ tạo thêm một TÊN trỏ vào cùng list: sửa list bên ngoài là object đổi theo. Và đừng '
              'return self trong __init__ — constructor phải trả None (Python báo TypeError nếu trả giá trị khác).'),
        mcq=[
            dict(q='Sau self.paradigms = list(paradigms), obj.paradigms is source cho gì?', options=[
                ('False — hai list khác nhau dù cùng giá trị', 'is kiểm có phải CÙNG một object không.', True),
                ('True', 'list(...) tạo object mới.', False),
                ('Báo lỗi', 'is so sánh được mọi object.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao dùng list(paradigms) thay vì gán nguyên paradigms?',
            sample='Gán nguyên list khiến object và nơi gọi cùng trỏ vào một list: sửa list nguồn là object đổi theo. '
                   'list(paradigms) tạo list mới chứa cùng phần tử, nên object có list riêng; sửa source sau khi tạo không làm object thay đổi.'),
        scaffold=dict(
            intro='Lắp hai dòng gán thuộc tính.',
            template=r'''class ProgrammingLanguage:
    def __init__(self, name, year_created, paradigms):
        {{slot1}}
        self.year_created = year_created
        {{slot2}}
''',
            slots=['self.name = name', 'self.paradigms = list(paradigms)'],
            traps=[('name = name', 1, 'Chỉ gán biến cục bộ, object không có thuộc tính.'),
                   ('self.paradigms = paradigms', 2, 'Dùng chung list với nơi gọi.'),
                   ('return self', 2, '__init__ phải trả None → TypeError.')]),
        flow=['source = ["procedural"].',
              'ProgrammingLanguage("C", 1972, source) → __init__ copy list.',
              'source.append("functional") → chỉ source đổi.',
              "language.paradigms vẫn là ['procedural']."],
        transfer='Tạo object từ source = ["procedural"], rồi source.append("functional"); kiểm object không đổi.',
        counter=dict(q='Sau source.append("functional"), language.paradigms là gì?',
                     options=["['procedural']", "['procedural', 'functional']", '[]'], correct="['procedural']"),
        practice='Lưu name, year_created; dùng list(paradigms) khi lưu list.',
        steps=['self.name = name; self.year_created = year_created.', 'self.paradigms = list(paradigms).'],
        partial=r'''    def __init__(self, name, year_created, paradigms):
        self.name = name
        ...''',
        io=[('Ba trường C/1972/["procedural"]', 'Thuộc tính đúng giá trị'), ('Sửa source sau khởi tạo', 'Object vẫn ["procedural"]')],
        contracts=[K_INIT],
        starter=r'''class ProgrammingLanguage:
    def __init__(self, name, year_created, paradigms):
        pass
''',
        solution=PL_INIT + r'''
source = ["procedural"]
language = ProgrammingLanguage("C", 1972, source)
source.append("functional")
print(language.name)
print(language.year_created)
print(language.paradigms)
''',
        tests=[
            T('Ba thuộc tính đúng giá trị', f"(lambda o: (o.name, o.year_created, o.paradigms))({pl('C', 1972, ['procedural'])})",
              ('C', 1972, ['procedural'])),
            TX('Sửa source sau khởi tạo → object không đổi',
               "_studio.check('src = [\"procedural\"]\\no = ProgrammingLanguage(\"C\", 1972, src)\\nsrc.append(\"functional\")\\n"
               "assert o.paradigms == [\"procedural\"], \"object đổi theo list nguồn\"')", 'True'),
            T('paradigms = [] → list rỗng riêng', f"{pl('Go', 2009, [])}.paradigms", []),
            TX('Hai object từ cùng source không chung list',
               "_studio.check('src = []\\na = ProgrammingLanguage(\"A\", 1, src)\\nb = ProgrammingLanguage(\"B\", 2, src)\\n"
               "assert a.paradigms is not b.paradigms and a.paradigms is not src')", 'True'),
        ],
        bad=[('không copy list', 'class ProgrammingLanguage:\n    def __init__(self, name, year_created, paradigms):\n        self.name = name\n        self.year_created = year_created\n        self.paradigms = paradigms\n')],
    ),

    # ------------------------------------------------------------------ I03
    dict(
        code='I03', title='Thêm một paradigm', minutes=20,
        goal='Tự viết method thêm dữ liệu vào object.',
        prereq='I02',
        brief='Trong class đã cấp (constructor từ I02), viết method add_paradigms(self, paradigm) thêm paradigm vào cuối self.paradigms bằng append. Method không in, không return giá trị.',
        example='Từ ["procedural"], thêm "functional" → ["procedural", "functional"].',
        demo=r'''class Cart:
    def __init__(self):
        self.items = []

    def add(self, item):
        self.items.append(item)

cart = Cart()
result = cart.add("pen")
print(cart.items)
print(result)
''',
        explain=[
            'Method là hàm thuộc class. cart.add("pen") tự truyền cart vào self.',
            'self.items.append(item) sửa list CỦA object đó và giữ thứ tự.',
            'Method không return nên result là None — nhưng cart.items đã đổi.',
        ],
        predict=dict(q='Gọi add_paradigms hai lần với cùng giá trị có giữ cả hai lần không?', options=[
            ('Có — append không bỏ trùng', 'Quy ước v3: thêm vào cuối, giữ trùng.', True),
            ('Không — chỉ giữ một lần', 'append không kiểm tra trùng.', False),
            ('Báo lỗi lần thứ hai', 'Thêm trùng là hợp lệ.', False),
        ]),
        myth=('"self.paradigms = self.paradigms.append(p) cho chắc"',
              'append sửa list tại chỗ và trả None: dòng đó gán None vào self.paradigms — list mất luôn. '
              'Chỉ cần self.paradigms.append(paradigm).'),
        mcq=[
            dict(q='result = obj.add_paradigms("functional") thì result là gì?', options=[
                ('None', 'Method không có return mang giá trị.', True),
                ("['procedural', 'functional']", 'Muốn xem list thì đọc obj.paradigms.', False),
                ('True', 'Không có gì trả True.', False),
            ]),
            dict(q='Thêm vào object A thì object B (tạo riêng) có đổi không?', options=[
                ('Không — mỗi object có list riêng', 'self là object được gọi method.', True),
                ('Có', 'Constructor đã tạo list riêng cho mỗi object.', False),
                ('Tuỳ thứ tự tạo', 'Không phụ thuộc thứ tự.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao result là None nhưng list vẫn thay đổi?',
            sample='add_paradigms sửa trạng thái của object qua self.paradigms.append(...) — một tác dụng phụ. Nó không có '
                   'return mang giá trị nên lời gọi trả None. Muốn xem kết quả thì đọc obj.paradigms.'),
        scaffold=dict(
            intro='Lắp thân method.',
            template=PL_INIT + r'''
    def add_paradigms(self, paradigm):
        {{slot1}}
''',
            slots=['self.paradigms.append(paradigm)'],
            traps=[('self.paradigms = self.paradigms.append(paradigm)', 1, 'append trả None → mất list.'),
                   ('paradigms.append(paradigm)', 1, 'paradigms không phải biến trong method này → NameError.'),
                   ('return self.paradigms + [paradigm]', 1, 'Tạo list mới, object không đổi.')]),
        flow=['Object giữ ["procedural"].',
              'add_paradigms("functional") → append vào cuối.',
              'Object giữ ["procedural", "functional"]; result = None.'],
        transfer='Thêm hai lần "procedural" vào object có list rỗng; kiểm thứ tự và giá trị trả về.',
        counter=dict(q='Object list rỗng, thêm "procedural" hai lần → paradigms?',
                     options=["['procedural', 'procedural']", "['procedural']", '[]'], correct="['procedural', 'procedural']"),
        practice='Dùng self.paradigms.append(paradigm); không tạo list dùng chung.',
        steps=['Method nhận self và paradigm.', 'Một dòng: self.paradigms.append(paradigm) — không return.'],
        partial=r'''    def add_paradigms(self, paradigm):
        self.paradigms...''',
        io=[('Thêm functional', 'List có phần tử mới ở cuối'), ('Giá trị trả về', 'None; method không tự in')],
        contracts=[K_INIT, K_ADD],
        starter=PL_INIT + r'''
    def add_paradigms(self, paradigm):
        pass
''',
        solution=PL_INIT + PL_ADD + r'''
language = ProgrammingLanguage("Python", 1991, ["procedural"])
result = language.add_paradigms("functional")
print(language.paradigms)
print(result)
''',
        tests=[
            T('Thêm functional vào cuối', f"(lambda o: (o.add_paradigms('functional'), o.paradigms)[1])({pl('Python', 1991, ['procedural'])})",
              ['procedural', 'functional']),
            T('Trả None', f"{pl('Python', 1991, [])}.add_paradigms('x')", None),
            T('Giữ phần tử trùng', f"(lambda o: (o.add_paradigms('procedural'), o.add_paradigms('procedural'), o.paradigms)[2])({pl('X', 1, [])})",
              ['procedural', 'procedural']),
            TX('Thêm vào A không đổi B hay list nguồn',
               "_studio.check('src = [\"p\"]\\na = ProgrammingLanguage(\"A\", 1, src)\\nb = ProgrammingLanguage(\"B\", 2, src)\\n"
               "a.add_paradigms(\"x\")\\nassert b.paradigms == [\"p\"] and src == [\"p\"]')", 'True'),
            T('Method không in', f"_studio.stdout({pl('A', 1, [])}.add_paradigms, 'x')", ''),
        ],
        bad=[('gán kết quả append', PL_INIT + '\n    def add_paradigms(self, paradigm):\n        self.paradigms = self.paradigms.append(paradigm)\n'),
             ('trả list', PL_INIT + '\n    def add_paradigms(self, paradigm):\n        self.paradigms.append(paradigm)\n        return self.paradigms\n')],
    ),

    # ------------------------------------------------------------------ I04
    dict(
        code='I04', title='Viết __str__', minutes=25,
        goal='Trả chuỗi biểu diễn object bằng __str__.',
        prereq='I03',
        brief="Trong class đã cấp, viết __str__ trả chuỗi theo format v3: Language[name], Year created[year], Paradigms[...list...] — ví dụ Language[Python], Year created[1991], Paradigms['procedural']. __str__ phải return chuỗi, không print.",
        example=f'str(language) → {S_PY}',
        demo=r'''class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __str__(self):
        text = f"Point[{self.x}]"
        text += f", y[{self.y}]"
        return text

p = Point(2, 5)
print(p)
print(str(p) == "Point[2], y[5]")
''',
        explain=[
            'f trước dấu nháy cho phép đặt giá trị trong {}: f"Point[{self.x}]" → "Point[2]".',
            '+= nối thêm phần tiếp theo vào text.',
            'str(p) và print(p) đều gọi __str__; __str__ phải RETURN str.',
        ],
        predict=dict(q='__str__ cần print chuỗi hay return chuỗi?', options=[
            ('return — str(obj) và print(obj) lấy giá trị trả về', 'print(obj) tự in chuỗi mà __str__ trả.', True),
            ('print', '__str__ in rồi trả None → str(obj) báo TypeError.', False),
            ('Cả hai', 'In thêm trong __str__ làm mỗi lần str(obj) đều sinh output.', False),
        ]),
        myth=('"Paradigms[{self.paradigms}] mới đúng format"',
              "f\"{self.paradigms}\" đã có sẵn ngoặc vuông: ['procedural']. Viết thêm [...] bên ngoài thành "
              "Paradigms[['procedural']]. Format v3 là f\", Paradigms{self.paradigms}\"."),
        mcq=[
            dict(q='Object C/1972/[] → str(obj) là gì?', options=[
                ('Language[C], Year created[1972], Paradigms[]', 'List rỗng biểu diễn là [].', True),
                ('Language[C], Year created[1972], Paradigms[[]]', 'Thừa một cặp ngoặc.', False),
                ('Language[C], Year created[1972]', 'Thiếu trường Paradigms.', False),
            ]),
            dict(q='Nếu __str__ chỉ print rồi kết thúc, str(obj) sẽ…', options=[
                ('Báo TypeError: __str__ returned non-string', '__str__ trả None.', True),
                ('Trả chuỗi rỗng', 'Python không tự đổi None thành "".', False),
                ('Chạy bình thường', 'str(obj) bắt buộc __str__ trả str.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao print(obj) dùng được __str__?',
            sample='print cần một chuỗi để hiển thị object; nó gọi str(obj), và str(obj) gọi __str__ để lấy chuỗi trả về. '
                   'Vì vậy __str__ phải return str; nếu chỉ print thì trả None và str(obj) báo TypeError.'),
        scaffold=dict(
            intro='Lắp hai phần nối và lệnh trả kết quả.',
            template=r'''    def __str__(self):
        description = f"Language[{self.name}]"
        description += {{slot1}}
        description += {{slot2}}
        {{slot3}}
''',
            slots=['f", Year created[{self.year_created}]"', 'f", Paradigms{self.paradigms}"', 'return description'],
            traps=[('f", Paradigms[{self.paradigms}]"', 2, 'Thừa một cặp ngoặc vuông.'),
                   ('", Year created[self.year_created]"', 1, 'Thiếu f và {} → in nguyên chữ.'),
                   ('print(description)', 3, '__str__ trả None → TypeError.')]),
        flow=['"Language[Python]"', '+ ", Year created[1991]"', "+ \", Paradigms['procedural']\"", 'return chuỗi → nơi gọi mới print.'],
        transfer='Thử name = "C", year = 1972, paradigms = []; kiểm format và stdout của str(obj).',
        counter=dict(q='Paradigms ["procedural", "functional"] → phần cuối chuỗi là gì?',
                     options=["Paradigms['procedural', 'functional']", 'Paradigms[procedural, functional]',
                              "Paradigms[['procedural', 'functional']]"], correct="Paradigms['procedural', 'functional']"),
        practice='Tạo description theo ba bước, rồi return description.',
        steps=['description = f"Language[{self.name}]"', 'Nối Year created và Paradigms bằng +=; return description.'],
        partial=r'''        description = f"Language[{self.name}]"
        description += f", Year created[{self.year_created}]"
        ...''',
        io=[('Object Python', S_PY), ('C/1972/[]', 'Language[C], Year created[1972], Paradigms[]')],
        contracts=[K_INIT, K_ADD, K_STR],
        starter=PL_INIT + PL_ADD + r'''
    def __str__(self):
        pass
''',
        solution=PL_FULL + r'''
language = ProgrammingLanguage("Python", 1991, ["procedural"])
text = str(language)
print(text)
''',
        tests=[
            T('Object Python', f"str({pl('Python', 1991, ['procedural'])})", S_PY),
            T('C/1972/[]', f"str({pl('C', 1972, [])})", 'Language[C], Year created[1972], Paradigms[]'),
            T('Hai paradigm giữ thứ tự', f"str({pl('Python', 1991, ['procedural', 'functional'])})",
              "Language[Python], Year created[1991], Paradigms['procedural', 'functional']"),
            T('str(obj) không in gì', f"_studio.stdout(str, {pl('C', 1972, [])})", ''),
            T('print(obj) in một dòng', f"_studio.stdout(print, {pl('C', 1972, [])})", 'Language[C], Year created[1972], Paradigms[]\n'),
        ],
        bad=[('print thay return', PL_INIT + PL_ADD + PL_STR.replace('return description', 'print(description)')),
             ('thừa ngoặc', PL_INIT + PL_ADD + PL_STR.replace('Paradigms{self.paradigms}', 'Paradigms[{self.paradigms}]'))],
    ),

    # ------------------------------------------------------------------ I05
    dict(
        code='I05', title='Hai object độc lập', minutes=25,
        goal='Sửa list dùng chung để hai object độc lập.',
        prereq='I04',
        brief='Class trong khung đang lưu self.paradigms = paradigms nên các object dùng chung list. Sửa ĐÚNG chỗ lưu list trong constructor để thêm paradigm vào object A không làm đổi object B hay list nguồn. Các method khác giữ nguyên.',
        example='A và B tạo từ cùng source = ["procedural"]; thêm "functional" vào A chỉ đổi A.',
        demo=r'''source = ["x"]
a = source
b = list(source)
a.append("y")
print(source)
print(b)
print(a is source, b is source)
''',
        explain=[
            'a = source không tạo list mới: a và source là HAI TÊN của cùng một list.',
            'list(source) tạo list mới có cùng phần tử.',
            "a.append(\"y\") sửa list chung → source cũng thành ['x', 'y']; b vẫn ['x']. is kiểm có phải CÙNG một object không.",
        ],
        predict=dict(q='Với self.paradigms = paradigms, A, B và source đang giữ mấy list?', code=r'''class ProgrammingLanguage:
    def __init__(self, name, year_created, paradigms):
        self.name = name
        self.year_created = year_created
        self.paradigms = paradigms

source = ["procedural"]
language_a = ProgrammingLanguage("Python", 1991, source)
language_b = ProgrammingLanguage("C", 1972, source)
''', options=[
            ('Một list dùng chung', 'Ba tên cùng trỏ vào một list.', True),
            ('Ba list riêng', 'Phép gán không sao chép.', False),
            ('Hai list', 'Không có lệnh nào tạo list mới.', False),
        ]),
        myth=('"Hai list bằng giá trị là cùng một list"',
              '== so giá trị, is so danh tính. Hai list riêng có thể bằng nhau (==) nhưng sửa list này không đổi list kia. '
              'Đừng "sửa" lỗi bằng cách xoá dữ liệu của source.'),
        mcq=[
            dict(q='Sau khi sửa đúng, A.paradigms is B.paradigms cho gì?', options=[
                ('False', 'Mỗi object có list riêng.', True),
                ('True', 'Đó là bản lỗi.', False),
                ('Báo lỗi', 'is luôn so sánh được.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao hai list bằng giá trị vẫn cần là hai object khác nhau?',
            sample='Nếu A, B và source dùng chung một list thì append vào A cũng làm B và source đổi theo. list(paradigms) '
                   'cho mỗi object một list riêng: lúc đầu bằng giá trị nhưng sửa list này không ảnh hưởng list kia.'),
        scaffold=dict(
            intro='Sửa đúng một dòng trong constructor.',
            template=r'''class ProgrammingLanguage:
    def __init__(self, name, year_created, paradigms):
        self.name = name
        self.year_created = year_created
        {{slot1}}
''',
            slots=['self.paradigms = list(paradigms)'],
            traps=[('self.paradigms = paradigms', 1, 'Vẫn dùng chung list.'),
                   ('self.paradigms = []', 1, 'Mất dữ liệu ban đầu.'),
                   ('paradigms.clear()', 1, 'Xoá dữ liệu của nơi gọi.')]),
        flow=['source → bản copy cho A; bản copy khác cho B.',
              'A.add_paradigms("functional") → chỉ list của A đổi.',
              'B và source vẫn là ["procedural"].'],
        transfer='Sau khi sửa, thử sửa source; kiểm A và B đều không bị đổi theo.',
        counter=dict(q='Với BẢN LỖI: thêm "functional" vào A rồi print(B.paradigms) in gì?',
                     options=["['procedural', 'functional']", "['procedural']", '[]'], correct="['procedural', 'functional']"),
        practice='Tạo A, B từ cùng source rồi thêm vào A.',
        steps=['Gán nguyên list chỉ tạo thêm tham chiếu, không tạo list mới.',
               'Đổi thành list(paradigms): mỗi lần khởi tạo object có list riêng.'],
        partial=r'''        self.paradigms = list(...)''',
        io=[('Thêm functional vào A', 'A = [procedural, functional]; B và source = [procedural]'),
            ('Source ban đầu []', 'Thêm vào A không đổi B hay source')],
        contracts=[K_INIT, K_ADD],
        starter=r'''class ProgrammingLanguage:
    def __init__(self, name, year_created, paradigms):
        self.name = name
        self.year_created = year_created
        self.paradigms = paradigms

    def add_paradigms(self, paradigm):
        self.paradigms.append(paradigm)

source = ["procedural"]
language_a = ProgrammingLanguage("Python", 1991, source)
language_b = ProgrammingLanguage("C", 1972, source)
language_a.add_paradigms("functional")
print(language_a.paradigms)
print(language_b.paradigms)
print(source)
''',
        solution=PL_INIT + PL_ADD + r'''
source = ["procedural"]
language_a = ProgrammingLanguage("Python", 1991, source)
language_b = ProgrammingLanguage("C", 1972, source)
language_a.add_paradigms("functional")
print(language_a.paradigms)
print(language_b.paradigms)
print(source)
''',
        tests=[
            T('A đổi; B và source giữ nguyên', run() + '.stdout', out("['procedural', 'functional']", "['procedural']", "['procedural']")),
            T('Source ban đầu []', run(vars={'source': []}) + '.stdout', out("['functional']", '[]', '[]')),
            TX('A.paradigms is not B.paradigms',
               "_studio.check('s = [\"p\"]\\na = ProgrammingLanguage(\"A\", 1, s)\\nb = ProgrammingLanguage(\"B\", 2, s)\\nassert a.paradigms is not b.paradigms')",
               'True'),
            TX('Sửa source sau khi tạo cả hai → A/B không đổi',
               "_studio.check('s = [\"p\"]\\na = ProgrammingLanguage(\"A\", 1, s)\\nb = ProgrammingLanguage(\"B\", 2, s)\\ns.append(\"z\")\\nassert a.paradigms == [\"p\"] and b.paradigms == [\"p\"]')",
               'True'),
        ],
        bad=[('bản lỗi gốc', None)],
    ),

    # ------------------------------------------------------------------ I06
    dict(
        code='I06', title='Phân biệt print và str', minutes=20,
        goal='Phân biệt lấy chuỗi bằng str và in bằng print.',
        prereq='I05',
        brief='__str__ trong khung đang print thay vì return. Sửa nó, rồi viết hai lời gọi: text = str(language) để lấy chuỗi, và print(language) để hiển thị.',
        example='text = str(language) lưu chuỗi; print(language) in một dòng. Gọi str riêng không tự in.',
        demo=r'''class Badge:
    def __init__(self, owner):
        self.owner = owner

    def __str__(self):
        return f"Badge[{self.owner}]"

badge = Badge("An")
label = str(badge)
print(len(label))
print(badge)
''',
        explain=[
            'str(badge) gọi __str__ và nhận CHUỖI trả về — không in gì.',
            'label là str bình thường: dùng được len, nối chuỗi, ghi file…',
            'print(badge) cũng gọi __str__, rồi mới đưa chuỗi ra màn hình: đúng một dòng.',
        ],
        predict=dict(q='Nếu __str__ chỉ print rồi kết thúc, str(obj) nhận được str hợp lệ không?', code=r'''    def __str__(self):
        description = f"Language[{self.name}]"
        description += f", Year created[{self.year_created}]"
        description += f", Paradigms{self.paradigms}"
        print(description)
''', options=[
            ('Không — __str__ trả None nên str(obj) báo TypeError', 'Dòng in ra không phải giá trị trả về.', True),
            ('Có — chuỗi vừa in', 'print không trả chuỗi.', False),
            ('Nhận chuỗi rỗng', 'Python không tự đổi None thành "".', False),
        ]),
        myth=('"Thêm return None sau print là xong"',
              'Vẫn trả None. Phải thay print(description) bằng return description. Giá trị trả về là thứ str(obj) nhận; '
              'dòng được in chỉ là tác dụng phụ.'),
        mcq=[
            dict(q='Gọi str(language) hai lần liên tiếp thì…', options=[
                ('Hai kết quả bằng nhau, không in gì, object không đổi', '__str__ chỉ đọc trạng thái.', True),
                ('In hai dòng', 'str không in.', False),
                ('Lần hai báo lỗi', '__str__ gọi bao nhiêu lần cũng được.', False),
            ]),
        ],
        why=dict(
            prompt='Sự khác nhau giữa giá trị trả về và dòng được in là gì?',
            sample='Giá trị trả về đi vào biến (text = str(language)) để dùng tiếp; dòng được in chỉ là tác dụng phụ trên màn '
                   'hình. __str__ phải trả chuỗi; print(language) mới là nơi hiển thị, và str(language) gọi riêng không in gì.'),
        scaffold=dict(
            intro='Sửa __str__ và viết hai cách gọi.',
            template=r'''    def __str__(self):
        description = f"Language[{self.name}]"
        description += f", Year created[{self.year_created}]"
        description += f", Paradigms{self.paradigms}"
        {{slot1}}

language = ProgrammingLanguage("Python", 1991, ["procedural"])
text = {{slot2}}
{{slot3}}
''',
            slots=['return description', 'str(language)', 'print(language)'],
            traps=[('print(description)', 1, '__str__ trả None.'),
                   ('language.__str__', 2, 'Chưa gọi method — text là một method, không phải chuỗi.'),
                   ('print(text())', 3, 'text là str, không gọi được.')]),
        flow=['str(language) → __str__ → text (không có output).',
              'print(language) → __str__ → một dòng trên màn hình.'],
        transfer='Thử object C/1972/[]; kiểm text là str và chỉ có một dòng do print ở nơi gọi.',
        counter=dict(q='Chương trình đúng (text = str(language); print(language)) in mấy dòng?',
                     options=['1 dòng', '2 dòng', '0 dòng'], correct='1 dòng'),
        practice='Lưu text = str(language) và dùng print(language) để hiển thị.',
        steps=['Thay print(description) cuối __str__ bằng return description.', 'text = str(language); print(language).'],
        partial=r'''text = str(language)
...''',
        io=[('Object Python', 'text đúng str; stdout một dòng từ print'), ('Gọi str riêng', 'Không có output')],
        contracts=[K_INIT, K_STR],
        starter=PL_INIT + r'''
    def __str__(self):
        description = f"Language[{self.name}]"
        description += f", Year created[{self.year_created}]"
        description += f", Paradigms{self.paradigms}"
        print(description)

language = ProgrammingLanguage("Python", 1991, ["procedural"])
# Tự viết text = str(...) và print(...).
''',
        solution=PL_INIT + PL_STR + r'''
language = ProgrammingLanguage("Python", 1991, ["procedural"])
text = str(language)
print(language)
''',
        tests=[
            T('stdout đúng một dòng', run() + '.stdout', out(S_PY)),
            T('text là chuỗi đúng format', run() + ".var('text')", S_PY),
            T('str(obj) gọi riêng không in', f"_studio.stdout(str, {pl('Python', 1991, ['procedural'])})", ''),
            T('C/1972/[] không TypeError', f"str({pl('C', 1972, [])})", 'Language[C], Year created[1972], Paradigms[]'),
            T('Gọi str hai lần bằng nhau', f"(lambda o: str(o) == str(o))({pl('A', 1, ['x'])})", True),
        ],
        bad=[('bản lỗi + lời gọi', PL_INIT + PL_STR.replace('return description', 'print(description)') +
              '\nlanguage = ProgrammingLanguage("Python", 1991, ["procedural"])\nprint(language)\n')],
    ),

    # ------------------------------------------------------------------ I07
    dict(
        code='I07', title='Ex2 tự làm', minutes=40, gate=True,
        goal='Tự viết ProgrammingLanguage hoàn chỉnh cho Ex2.',
        prereq='I06',
        brief="Tự viết class ProgrammingLanguage với ba method: __init__ (lưu name, year_created và BẢN SAO list paradigms), add_paradigms (append vào cuối, trả None, không in) và __str__ (return chuỗi Language[name], Year created[year], Paradigms[...]). Không xem lời giải trước khi nộp.",
        example="C/1972/[\"procedural\"], thêm imperative → Language[C], Year created[1972], Paradigms['procedural', 'imperative']",
        explain=[
            '__init__ khởi tạo: ba thuộc tính, list(paradigms) cho list riêng.',
            'add_paradigms THAY ĐỔI trạng thái: append, trả None, không in.',
            '__str__ chỉ ĐỌC trạng thái: trả chuỗi đúng format, không in.',
            'Cửa kiểm tra Ex2: bộ chấm dùng hai object từ cùng list nguồn, tên/năm mới và nhiều paradigm.',
        ],
        predict=dict(q='Method nào thay đổi trạng thái object, method nào chỉ đọc?', options=[
            ('add_paradigms thay đổi; __str__ chỉ đọc', '__init__ khởi tạo trạng thái lúc tạo object.', True),
            ('__str__ thay đổi; add_paradigms chỉ đọc', 'Ngược lại.', False),
            ('Cả hai chỉ đọc', 'append sửa list của object.', False),
        ]),
        myth=('Bốn cái bẫy của Ex2',
              'self.paradigms = paradigms (dùng chung list); self.paradigms = self.paradigms.append(...) (gán None); '
              '__str__ print thay vì return (TypeError); Paradigms[{self.paradigms}] (thừa ngoặc vuông).'),
        mcq=[
            dict(q='Hai object tạo từ cùng list nguồn; thêm "x" vào A. B.paradigms thế nào?', options=[
                ('Không đổi', 'Mỗi object giữ bản sao riêng.', True),
                ('Có thêm "x"', 'Chỉ khi dùng chung list (lỗi).', False),
                ('Bị xoá', 'Không có lệnh xoá.', False),
            ]),
        ],
        why=dict(
            prompt='Method nào thay đổi trạng thái, method nào chỉ đọc trạng thái? Vì sao điều đó quan trọng?',
            sample='__init__ khởi tạo trạng thái; add_paradigms thay đổi list của object và trả None; __str__ chỉ đọc các '
                   'trường để trả chuỗi, không in, không sửa gì — gọi bao nhiêu lần cũng cho cùng kết quả. Tách rõ như vậy '
                   'mới kiểm được từng method riêng.'),
        flow=['Tạo object: __init__ lưu ba trường + copy list.',
              'add_paradigms("imperative") → list thêm phần tử cuối.',
              'str(obj) → __str__ → chuỗi đầy đủ → nơi gọi print.'],
        transfer='Bộ chấm dùng hai object từ cùng list nguồn, tên/năm mới, list rỗng và phần tử trùng.',
        counter=dict(q='Go/2009/[] thêm "concurrent" → str(obj)?',
                     options=["Language[Go], Year created[2009], Paradigms['concurrent']",
                              'Language[Go], Year created[2009], Paradigms[concurrent]',
                              'Language[Go], Year created[2009], Paradigms[]'],
                     correct="Language[Go], Year created[2009], Paradigms['concurrent']"),
        practice='Tạo object, thêm dữ liệu rồi gọi str. Kiểm ba trường và list riêng.',
        steps=['Constructor lưu ba trường và copy list nguồn.',
               'add_paradigms thêm vào cuối list của object và trả None.',
               '__str__ trả chuỗi đầy đủ, không tự in.'],
        partial=r'''class ProgrammingLanguage:
    def __init__(self, name, year_created, paradigms):
        ...
    def add_paradigms(self, paradigm):
        ...
    def __str__(self):
        ...''',
        io=[('C/1972; thêm imperative', "Language[C], Year created[1972], Paradigms['procedural', 'imperative']"),
            ('List rỗng', 'Thêm được một paradigm; không dùng list chung')],
        contracts=[K_INIT, K_ADD, K_STR],
        starter=r'''# Tự viết class ProgrammingLanguage với ba method.
# Không cấp lời giải ở lần nộp đầu.
''',
        solution=PL_FULL + r'''
language = ProgrammingLanguage("C", 1972, ["procedural"])
language.add_paradigms("imperative")
text = str(language)
print(text)
''',
        tests=ex2_tests(),
        bad=[('dùng chung list', PL_FULL.replace('list(paradigms)', 'paradigms')),
             ('__str__ print', PL_FULL.replace('return description', 'print(description)'))],
    ),

    # ------------------------------------------------------------------ I08
    dict(
        code='I08', title='Lớp con đầu tiên', minutes=25,
        goal='Tạo lớp con và dùng hành vi của lớp cha.',
        prereq='I07', support=['language_base.py'],
        brief='Từ class cha ProgrammingLanguage (language_base.py), khai báo class C(ProgrammingLanguage) chưa thêm gì (pass). Tạo language = C("C", 1972, ["procedural"]), thêm "imperative" bằng method của cha, rồi in name, paradigms và isinstance(language, ProgrammingLanguage).',
        example='C kế thừa ProgrammingLanguage; object C dùng được add_paradigms của cha.',
        demo=r'''class Animal:
    def __init__(self, name):
        self.name = name

    def describe(self):
        return "I am " + self.name

class Dog(Animal):
    pass

rex = Dog("Rex")
print(rex.describe())
print(isinstance(rex, Animal))
''',
        explain=[
            'class Dog(Animal): tên cha trong ngoặc tạo quan hệ kế thừa.',
            'pass: lớp con chưa thêm gì — Dog("Rex") dùng __init__ của Animal, rex.describe() dùng method của cha.',
            'isinstance(rex, Animal) là True: object của lớp con cũng là object của lớp cha.',
        ],
        predict=dict(q='Class C chưa viết constructor thì ai khởi tạo ba trường?', options=[
            ('__init__ của lớp cha ProgrammingLanguage', 'Python tìm method không có ở lớp con lên lớp cha.', True),
            ('Không ai — object rỗng', 'Constructor cha vẫn chạy.', False),
            ('Báo lỗi vì thiếu __init__', 'Kế thừa đã cung cấp __init__.', False),
        ]),
        myth=('"Tạo object ProgrammingLanguage cũng được"',
              'Bài yêu cầu object của lớp C. ProgrammingLanguage("C", ...) có cùng dữ liệu nhưng thuộc lớp cha — các bài sau '
              '(super, override, compile) cần đúng lớp con.'),
        mcq=[
            dict(q='type(language).__name__ là gì?', options=[
                ('C', 'Object tạo từ lớp con.', True),
                ('ProgrammingLanguage', 'Đó là lớp cha; isinstance mới tính cả cha.', False),
                ('object', 'type trả lớp cụ thể nhất.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao C dùng được method dù thân class chỉ có pass?',
            sample='Khi C không định nghĩa một method, Python tìm method đó ở lớp cha ProgrammingLanguage. Vì vậy C("C", 1972, ...) '
                   'dùng __init__ của cha, add_paradigms và __str__ cũng là của cha; isinstance(language, ProgrammingLanguage) là True.'),
        scaffold=dict(
            intro='Lắp khai báo lớp con và lời tạo object.',
            template=r'''from language_base import ProgrammingLanguage

{{slot1}}
    pass

language = {{slot2}}
language.add_paradigms("imperative")
print(isinstance(language, ProgrammingLanguage))
''',
            slots=['class C(ProgrammingLanguage):', 'C("C", 1972, ["procedural"])'],
            traps=[('class C:', 1, 'Không kế thừa → không có __init__ ba tham số.'),
                   ('class ProgrammingLanguage(C):', 1, 'Ngược quan hệ cha/con.'),
                   ('ProgrammingLanguage("C", 1972, ["procedural"])', 2, 'Object của lớp cha.')]),
        flow=['C dùng constructor cha → có ba trường.',
              'Gọi add_paradigms của cha → list thêm imperative.',
              'isinstance(language, ProgrammingLanguage) → True.'],
        transfer='Tạo hai object C khác tên/năm; thêm paradigm bằng method của cha.',
        counter=dict(q='str(C("C", 1972, [])) dùng format nào?',
                     options=['Language[C], Year created[1972], Paradigms[] (format của cha)', 'C object', 'Báo lỗi'],
                     correct='Language[C], Year created[1972], Paradigms[] (format của cha)'),
        practice='Dùng class C(ProgrammingLanguage): pass, rồi tạo object như với lớp cha.',
        steps=['Tên cha trong ngoặc xác định kế thừa; pass là chưa thêm hành vi mới.',
               'isinstance kiểm object có thuộc class đó hoặc lớp con của nó không.'],
        partial=r'''class C(ProgrammingLanguage):
    pass
...''',
        io=[('Object C/1972', 'Có đủ ba trường từ constructor cha'), ('isinstance(language, ProgrammingLanguage)', 'True')],
        starter=IMPORT_BASE + '# Tự khai báo class C kế thừa và tạo object.\n',
        solution=IMPORT_BASE + r'''class C(ProgrammingLanguage):
    pass

language = C("C", 1972, ["procedural"])
language.add_paradigms("imperative")
print(language.name)
print(language.paradigms)
print(isinstance(language, ProgrammingLanguage))
''',
        tests=[
            T('stdout: name, paradigms, isinstance', run() + '.stdout', out('C', "['procedural', 'imperative']", True)),
            T('C kế thừa ProgrammingLanguage', 'issubclass(C, ProgrammingLanguage)', True),
            T('language là object của C', "type(_studio.main.var('language')).__name__", 'C'),
            TX('Hai object C có list độc lập',
               "_studio.check('a = C(\"C\", 1972, [])\\nb = C(\"C\", 1989, [])\\na.add_paradigms(\"x\")\\nassert b.paradigms == []')", 'True'),
            T('str dùng format của cha', "str(C('C', 1972, []))", 'Language[C], Year created[1972], Paradigms[]'),
        ],
        bad=[('dùng lớp cha', IMPORT_BASE + 'class C(ProgrammingLanguage):\n    pass\n\nlanguage = ProgrammingLanguage("C", 1972, ["procedural"])\nlanguage.add_paradigms("imperative")\nprint(language.name)\nprint(language.paradigms)\nprint(isinstance(language, ProgrammingLanguage))\n')],
    ),

    # ------------------------------------------------------------------ I09
    dict(
        code='I09', title='super và thuộc tính mới', minutes=25,
        goal='Khởi tạo phần cha và thêm std_version trong lớp con.',
        prereq='I08', support=['language_base.py'],
        brief='Viết C.__init__(self, name, year_created, paradigms, std_version): gọi super().__init__ với ba trường của cha, rồi lưu self.std_version.',
        example='C("C", 1972, ["procedural"], "C17") giữ đủ bốn thuộc tính.',
        demo=r'''class Animal:
    def __init__(self, name):
        self.name = name

class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)
        self.breed = breed

rex = Dog("Rex", "Corgi")
print(rex.name, rex.breed)
''',
        explain=[
            'super() truy cập hành vi của lớp cha; super().__init__(name) để cha khởi tạo phần của cha.',
            'self.breed = breed thêm thuộc tính RIÊNG của lớp con.',
            'Không truyền self vào super().__init__ — super() đã gắn với object hiện tại.',
        ],
        predict=dict(q='Nếu chỉ gán std_version mà không gọi cha, ba trường còn lại có tồn tại không?', options=[
            ('Không — đọc language.name sẽ báo AttributeError', '__init__ của con thay hoàn toàn __init__ của cha.', True),
            ('Có — Python tự gọi cha', 'Phải tự gọi super().__init__.', False),
            ('Có nhưng bằng None', 'Thuộc tính không tồn tại chứ không phải None.', False),
        ]),
        myth=('"Tự gán lại cả ba trường của cha cho chắc"',
              'Viết lại là lặp logic của cha — và dễ quên phần copy list. Gọi super().__init__(name, year_created, paradigms) '
              'để cha giữ trách nhiệm đó. Không viết super().__init__(self, ...).'),
        mcq=[
            dict(q='Sửa list nguồn sau khi tạo C("C", 1972, source, "C17") thì language.paradigms?', options=[
                ('Không đổi — constructor cha đã copy list', 'Dùng super() là dùng luôn phần copy.', True),
                ('Đổi theo', 'Chỉ khi tự gán self.paradigms = paradigms.', False),
                ('Bị xoá', 'Không có lệnh xoá.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao gọi super().__init__ thay vì tự gán lại toàn bộ trường?',
            sample='Lớp cha đã giữ trách nhiệm khởi tạo name, year_created và copy list paradigms. Gọi super().__init__ dùng lại '
                   'đúng logic đó; lớp con chỉ thêm std_version. Tự gán lại vừa lặp code vừa dễ quên list(paradigms).'),
        scaffold=dict(
            intro='Lắp hai dòng của constructor lớp con.',
            template=IMPORT_BASE + r'''class C(ProgrammingLanguage):
    def __init__(self, name, year_created, paradigms, std_version):
        {{slot1}}
        {{slot2}}
''',
            slots=['super().__init__(name, year_created, paradigms)', 'self.std_version = std_version'],
            traps=[('super().__init__(self, name, year_created, paradigms)', 1, 'Thừa self → TypeError.'),
                   ('ProgrammingLanguage(name, year_created, paradigms)', 1, 'Tạo một object KHÁC rồi bỏ đi.'),
                   ('std_version = std_version', 2, 'Biến cục bộ, object không có thuộc tính.')]),
        flow=['Ba trường → constructor cha (có copy list).',
              'C17 → thuộc tính của con.',
              'Object có đủ bốn trường.'],
        transfer='Tạo object C17 và C23; đổi phiên bản của object thứ nhất, kiểm object thứ hai.',
        counter=dict(q='C("C", 1972, [], "C23").std_version là gì?', options=['C23', 'C17', 'None'], correct='C23'),
        practice='Gọi super().__init__ với ba trường của cha, rồi lưu std_version.',
        steps=['super().__init__(name, year_created, paradigms)', 'self.std_version = std_version'],
        partial=r'''    def __init__(self, name, year_created, paradigms, std_version):
        super().__init__(...)
        ...''',
        io=[('C17', 'name=C, year_created=1972, paradigms=[procedural], std_version=C17'), ('C23', 'Giữ đúng phiên bản C23')],
        contracts=[K_CINIT],
        starter=IMPORT_BASE + r'''class C(ProgrammingLanguage):
    def __init__(self, name, year_created, paradigms, std_version):
        pass
''',
        solution=IMPORT_BASE + C_INIT + r'''
language = C("C", 1972, ["procedural"], "C17")
print(language.name)
print(language.year_created)
print(language.paradigms)
print(language.std_version)
''',
        tests=[
            T('Bốn thuộc tính của C17', f"(lambda o: (o.name, o.year_created, o.paradigms, o.std_version))({cobj()})",
              ('C', 1972, ['procedural'], 'C17')),
            T('C23 giữ đúng phiên bản', f"{cobj('C23')}.std_version", 'C23'),
            TX('Đổi phiên bản object A không đổi B',
               "_studio.check('a = C(\"C\", 1972, [], \"C17\")\\nb = C(\"C\", 1972, [], \"C23\")\\na.std_version = \"C11\"\\nassert b.std_version == \"C23\"')", 'True'),
            TX('Sửa list nguồn không đổi object (copy của cha)',
               "_studio.check('src = [\"procedural\"]\\no = C(\"C\", 1972, src, \"C17\")\\nsrc.append(\"x\")\\nassert o.paradigms == [\"procedural\"]')", 'True'),
            T('Method cha vẫn dùng được', f"str({cobj('C17', [])})", 'Language[C], Year created[1972], Paradigms[]'),
        ],
        bad=[('không gọi cha', IMPORT_BASE + 'class C(ProgrammingLanguage):\n    def __init__(self, name, year_created, paradigms, std_version):\n        self.std_version = std_version\n'),
             ('tự gán, quên copy', IMPORT_BASE + 'class C(ProgrammingLanguage):\n    def __init__(self, name, year_created, paradigms, std_version):\n        self.name = name\n        self.year_created = year_created\n        self.paradigms = paradigms\n        self.std_version = std_version\n')],
    ),

    # ------------------------------------------------------------------ I10
    dict(
        code='I10', title='Override __str__', minutes=25,
        goal='Override __str__ mà giữ đầy đủ chuỗi của lớp cha.',
        prereq='I09', support=['language_base.py'],
        brief='C đã có constructor. Override __str__: lấy chuỗi của cha bằng super().__str__() rồi nối ", Standard version[...]".',
        example="C17 → Language[C], Year created[1972], Paradigms['procedural'], Standard version[C17]",
        demo=r'''class Animal:
    def __init__(self, name):
        self.name = name

    def __str__(self):
        return f"Animal[{self.name}]"

class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)
        self.breed = breed

    def __str__(self):
        base = super().__str__()
        return base + f", Breed[{self.breed}]"

print(Dog("Rex", "Corgi"))
''',
        explain=[
            'Override: lớp con viết method CÙNG TÊN để thay hành vi khi gọi trên object con.',
            'super().__str__() lấy chuỗi của cha; lớp con chỉ nối thêm phần của mình.',
            'Đừng gọi str(self) trong __str__: nó gọi lại chính method đang chạy → đệ quy vô hạn (RecursionError).',
        ],
        predict=dict(q='Gọi str(self) bên trong __str__ sẽ gọi cha hay gọi lại chính method hiện tại?', options=[
            ('Gọi lại chính nó — đệ quy tới RecursionError', 'self là object C nên str(self) chạy C.__str__.', True),
            ('Gọi __str__ của cha', 'Chỉ super().__str__() mới đi lên cha.', False),
            ('Trả chuỗi rỗng', 'Không có điểm dừng.', False),
        ]),
        myth=('"Viết lại cả chuỗi của cha trong lớp con"',
              'Copy format của cha vào con là lặp code: cha đổi format thì con lệch. super().__str__() lấy đúng phần của cha. '
              'Và __str__ vẫn phải return str, không print.'),
        mcq=[
            dict(q='C23 với paradigms [] → str(obj) kết thúc thế nào?', options=[
                ('…Paradigms[], Standard version[C23]', 'Phần cha giữ nguyên, nối thêm phần con.', True),
                ('Standard version[C23]', 'Mất phần của cha.', False),
                ('…Paradigms[]', 'Thiếu phần của con.', False),
            ]),
        ],
        why=dict(
            prompt='Tại sao dùng super().__str__() trong lớp con?',
            sample='Để lấy hành vi của cha rồi mở rộng: giữ đủ tên, năm, list do cha định dạng và chỉ nối thêm Standard '
                   'version[...]. Không lặp code của cha, và không gọi str(self) vì đó là gọi lại chính method → đệ quy.'),
        scaffold=dict(
            intro='Lắp phần lấy chuỗi cha và phần nối.',
            template=r'''    def __str__(self):
        description = {{slot1}}
        return {{slot2}}
''',
            slots=['super().__str__()', 'description + f", Standard version[{self.std_version}]"'],
            traps=[('str(self)', 1, 'Đệ quy vô hạn.'),
                   ('f"Language[{self.name}]"', 1, 'Mất các trường còn lại của cha.'),
                   ('f", Standard version[{self.std_version}]"', 2, 'Mất phần của cha.')]),
        flow=['Chuỗi cha → description.', 'Nối ", Standard version[C17]".', 'return chuỗi đầy đủ.'],
        transfer='Thử C23 và list paradigms rỗng; kiểm vẫn có đủ các trường của cha.',
        counter=dict(q='Đổi obj.std_version = "C23" rồi str(obj) — phần cuối là gì?',
                     options=['Standard version[C23]', 'Standard version[C17]', 'Không đổi được'], correct='Standard version[C23]'),
        practice='Lấy super().__str__() rồi nối thông tin phiên bản.',
        steps=['description = super().__str__()', 'return description + f", Standard version[{self.std_version}]"'],
        partial=r'''        description = super().__str__()
        return ...''',
        io=[('C17', 'Chuỗi giữ tên/năm/list và thêm Standard version[C17]'),
            ('C23 với []', 'Kết thúc bằng Standard version[C23]; phần cha có Paradigms[]')],
        contracts=[K_CINIT, K_CSTR],
        starter=IMPORT_BASE + C_INIT + r'''
    def __str__(self):
        pass
''',
        solution=IMPORT_BASE + C_INIT + C_STR + r'''
language = C("C", 1972, ["procedural"], "C17")
text = str(language)
print(text)
''',
        tests=[
            T('C17: đủ trường cha + phiên bản', f'str({cobj()})',
              "Language[C], Year created[1972], Paradigms['procedural'], Standard version[C17]"),
            T('C23 với []', f"str({cobj('C23', [])})", 'Language[C], Year created[1972], Paradigms[], Standard version[C23]'),
            T('Đổi std_version phản ánh vào chuỗi', f"(lambda o: (setattr(o, 'std_version', 'C11'), str(o))[1])({cobj()})",
              "Language[C], Year created[1972], Paradigms['procedural'], Standard version[C11]"),
            T('Gọi str riêng: không in, không RecursionError', f'(lambda r: (r.error, r.stdout))(_studio.call(str, {cobj()}))', (None, '')),
        ],
        bad=[('đệ quy str(self)', IMPORT_BASE + C_INIT + '\n    def __str__(self):\n        return str(self) + f", Standard version[{self.std_version}]"\n'),
             ('mất phần cha', IMPORT_BASE + C_INIT + '\n    def __str__(self):\n        return f"Standard version[{self.std_version}]"\n')],
    ),

    # ------------------------------------------------------------------ I11
    dict(
        code='I11', title='Viết compile', minutes=20,
        goal='Viết method compile dùng trạng thái hiện tại của object.',
        prereq='I10', support=['language_base.py'],
        brief='Thêm method compile(self) in đúng một dòng: Compiling C code using standard version <std_version>. Đọc self.std_version hiện tại, không hard-code C17. Constructor và __str__ đã cấp.',
        example='C17 → Compiling C code using standard version C17',
        demo=r'''class Printer:
    def __init__(self, model):
        self.model = model

    def status(self):
        print(f"Printer {self.model} ready")

p = Printer("X1")
p.status()
p.model = "X2"
result = p.status()
print(result)
''',
        explain=[
            'status đọc self.model ĐÚNG LÚC được gọi — đổi model rồi gọi lại sẽ in giá trị mới.',
            'Method chỉ print (tác dụng phụ) nên trả None: result là None.',
            'compile trong bài cũng vậy: in thông báo mô phỏng, không biên dịch C thật.',
        ],
        predict=dict(q='Nếu std_version đổi từ C17 thành C23, compile nên in giá trị nào?', options=[
            ('C23 — giá trị hiện tại', 'compile đọc self.std_version mỗi lần được gọi.', True),
            ('C17 — giá trị lúc tạo object', 'Không có gì "chụp" lại giá trị cũ.', False),
            ('Cả hai', 'Mỗi lần gọi in đúng một dòng.', False),
        ]),
        myth=('"return message thay cho print"',
              'Hợp đồng của compile là IN một dòng; return message thì không có output — sai đề. Ngược lại, __str__ thì phải '
              'return, không print.'),
        mcq=[
            dict(q='compile khác __str__ thế nào?', options=[
                ('compile in một dòng và trả None; __str__ trả chuỗi và không in', 'Khác ở kết quả và tác dụng phụ.', True),
                ('Giống nhau', 'Một cái in, một cái trả.', False),
                ('compile trả chuỗi', 'Theo hợp đồng v3, compile in.', False),
            ]),
        ],
        why=dict(
            prompt='compile khác __str__ ở kết quả và tác dụng phụ thế nào?',
            sample='__str__ trả chuỗi và không in, nên str(obj) dùng được để lưu hay nối tiếp. compile in thông báo (tác dụng '
                   'phụ) và trả None. Cả hai đọc trạng thái hiện tại: đổi std_version thì lần gọi sau phản ánh giá trị mới.'),
        scaffold=dict(
            intro='Lắp thân compile.',
            template=r'''    def compile(self):
        {{slot1}}
''',
            slots=['print(f"Compiling C code using standard version {self.std_version}")'],
            traps=[('print("Compiling C code using standard version C17")', 1, 'Hard-code C17.'),
                   ('return f"Compiling C code using standard version {self.std_version}"', 1, 'Không in gì.')]),
        flow=['Object giữ C17.', 'compile đọc std_version.', 'In thông báo C17; trả None.'],
        transfer='Đổi std_version thành C23 rồi gọi lại; kiểm mỗi lần đúng một dòng và trả None.',
        counter=dict(q='obj.std_version = "C23"; obj.compile() in gì?',
                     options=['Compiling C code using standard version C23', 'Compiling C code using standard version C17', 'Không in gì'],
                     correct='Compiling C code using standard version C23'),
        practice='In thông báo có self.std_version; không hard-code C17.',
        steps=['f-string đọc self.std_version.', 'print đúng một dòng; không return.'],
        partial=r'''    def compile(self):
        print(f"...")''',
        io=[('C17', 'Compiling C code using standard version C17'), ('C23', 'Compiling C code using standard version C23')],
        contracts=[K_CINIT, K_CSTR, K_COMPILE],
        starter=IMPORT_BASE + C_INIT + C_STR + r'''
    def compile(self):
        pass
''',
        solution=IMPORT_BASE + C_INIT + C_STR + C_COMPILE + r'''
language = C("C", 1972, ["procedural"], "C17")
language.compile()
''',
        tests=[
            T('C17: một dòng đúng', f'_studio.stdout({cobj()}.compile)', 'Compiling C code using standard version C17\n'),
            T('C23: một dòng đúng', f"_studio.stdout({cobj('C23')}.compile)", 'Compiling C code using standard version C23\n'),
            T('Trả None', f'_studio.call({cobj()}.compile).value', None),
            T('Đổi phiên bản rồi gọi lại',
              f"_studio.stdout(lambda: (lambda o: (o.compile(), setattr(o, 'std_version', 'C11'), o.compile()))({cobj()}))",
              'Compiling C code using standard version C17\nCompiling C code using standard version C11\n'),
        ],
        bad=[('hard-code', IMPORT_BASE + C_INIT + C_STR + '\n    def compile(self):\n        print("Compiling C code using standard version C17")\n'),
             ('return thay print', IMPORT_BASE + C_INIT + C_STR + '\n    def compile(self):\n        return f"Compiling C code using standard version {self.std_version}"\n')],
    ),

    # ------------------------------------------------------------------ I12
    dict(
        code='I12', title='Ex3 tự làm', minutes=40, gate=True,
        goal='Tự giải Ex3 với class cha cấp sẵn.',
        prereq='I11', support=['language_base.py'],
        brief='Từ class cha ProgrammingLanguage (đã cấp, đã kiểm), tự viết class C với ba method: __init__ (super + std_version), __str__ (chuỗi của cha + ", Standard version[...]") và compile (in "Compiling C code using standard version ..."). Không viết lại class cha.',
        example="C17 → str có đủ bốn trường; compile in Compiling C code using standard version C17.",
        explain=[
            'Phần cha khởi tạo: name, year_created, paradigms (có copy list) — gọi qua super().',
            'Phần con bổ sung: std_version; override __str__; method compile.',
            'Cửa kiểm tra Ex3: dữ liệu mới C11/C23, list nguồn dùng chung cho hai object. Khoảng 15–25 dòng mới.',
        ],
        predict=dict(q='Nêu trách nhiệm của __init__, __str__ và compile — phương án nào đúng?', options=[
            ('__init__ khởi tạo (gọi cha); __str__ trả chuỗi; compile in thông báo', 'Mỗi method một trách nhiệm.', True),
            ('__str__ in thông báo; compile trả chuỗi', 'Ngược hợp đồng.', False),
            ('__init__ in object', 'Constructor không in.', False),
        ]),
        myth=('Ba cái bẫy của Ex3',
              'Quên super().__init__ (thiếu trường cha); gọi str(self) trong __str__ (RecursionError); compile hard-code C17 '
              'hoặc return thay vì print.'),
        mcq=[
            dict(q='Phần nào của object do cha khởi tạo?', options=[
                ('name, year_created, paradigms', 'Con chỉ thêm std_version.', True),
                ('std_version', 'Đó là phần của con.', False),
                ('Không phần nào', 'super().__init__ khởi tạo ba trường.', False),
            ]),
        ],
        why=dict(
            prompt='Phần nào của object do cha khởi tạo, phần nào do con bổ sung?',
            sample='Cha khởi tạo name, year_created, paradigms (kèm copy list) qua super().__init__. Con thêm std_version, mở '
                   'rộng __str__ bằng super().__str__() + Standard version[...], và thêm compile in thông báo theo phiên bản hiện tại.'),
        flow=['Tạo C → cha lưu ba trường, con thêm std_version.',
              'str(obj) → chuỗi cha + phiên bản.',
              'compile() → đọc std_version hiện tại, in một dòng.'],
        transfer='Bộ chấm dùng C11/C23 và list nguồn dùng chung cho hai object.',
        counter=dict(q='C("C", 1972, [], "C23") → str(obj)?',
                     options=['Language[C], Year created[1972], Paradigms[], Standard version[C23]',
                              'Language[C], Standard version[C23]', 'Standard version[C23]'],
                     correct='Language[C], Year created[1972], Paradigms[], Standard version[C23]'),
        practice='Tạo object C, kiểm thuộc tính, str và compile; không viết lại class cha.',
        steps=['Constructor con gọi cha rồi lưu std_version.',
               '__str__ gọi cha và nối phiên bản, trả str.',
               'compile đọc trạng thái và in một thông báo.'],
        partial=r'''class C(ProgrammingLanguage):
    def __init__(self, name, year_created, paradigms, std_version):
        ...
    def __str__(self):
        ...
    def compile(self):
        ...''',
        io=[('C17', 'Đúng bốn trường, chuỗi và thông báo'), ('isinstance với cha', 'True; các method cha vẫn dùng được')],
        contracts=[K_CINIT, K_CSTR, K_COMPILE],
        starter=IMPORT_BASE + r'''class C(ProgrammingLanguage):
    def __init__(self, name, year_created, paradigms, std_version):
        pass

    def __str__(self):
        pass

    def compile(self):
        pass
''',
        solution=IMPORT_BASE + C_INIT + C_STR + C_COMPILE + r'''
language = C("C", 1972, ["procedural"], "C17")
print(str(language))
language.compile()
''',
        tests=ex3_tests(),
        bad=[('compile hard-code', IMPORT_BASE + C_INIT + C_STR + '\n    def compile(self):\n        print("Compiling C code using standard version C17")\n'),
             ('quên super', IMPORT_BASE + 'class C(ProgrammingLanguage):\n    def __init__(self, name, year_created, paradigms, std_version):\n        self.std_version = std_version\n' + C_STR + C_COMPILE)],
    ),
]
