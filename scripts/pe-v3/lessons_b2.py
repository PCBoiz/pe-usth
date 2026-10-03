"""PE Python v3 — Cơ bản, chặng M3–M4 (B11–B20). Nguồn: PDF trang 18–27, 58–67, 93–94."""
from authoring import T, TX, out, run

# Ba hàm đã học, cấp sẵn ở B16–B19 (đúng mã mẫu B09/B14/B15 của PDF).
READ_LINES = r'''def read_lines(path):
    lines = []
    with open(path, "r", encoding="utf-8") as file:
        for line in file:
            text = line.rstrip("\r\n")
            lines.append(text)
    return lines
'''

IS_PALINDROME = r'''def is_palindrome(text):
    if text == "":
        return False

    reversed_text = text[::-1]
    return text == reversed_text
'''

FILTER_PALINDROMES = r'''def filter_palindromes(words):
    palindromes = []
    for word in words:
        if is_palindrome(word):
            palindromes.append(word)
    return palindromes
'''

WRITE_LINES = r'''def write_lines(path, lines):
    with open(path, "w", encoding="utf-8") as file:
        for text in lines:
            file.write(text + "\n")
'''

C_READ = dict(sig='read_lines(path)', does='Đọc từng dòng và bỏ ký tự xuống dòng ở cuối.',
              takes='path: str — tên hoặc đường dẫn file UTF-8', gives='list[str]; file rỗng trả []',
              effect='Đọc file; with đóng file; không in. Thiếu file phát sinh FileNotFoundError.',
              call='read_lines("data.txt") → danh sách các dòng')
C_PAL = dict(sig='is_palindrome(text)', does='Kiểm tra chuỗi đối xứng và không rỗng.',
             takes='text: str — giữ nguyên hoa/thường và khoảng trắng', gives='bool',
             effect='Không in, không ghi file, không sửa dữ liệu đầu vào.', call='is_palindrome("level") → True')
C_FILTER = dict(sig='filter_palindromes(words)', does='Lọc chuỗi bằng is_palindrome, giữ thứ tự và trùng lặp.',
                takes='words: list[str]', gives='list[str] mới; list rỗng khi không có kết quả',
                effect='Không in, không sửa words.', call='filter_palindromes(["radar", "ab"]) → ["radar"]')
C_WRITE = dict(sig='write_lines(path, lines)', does='Ghi từng chuỗi trên một dòng.',
               takes='path: str; lines: list[str] không chứa CR/LF bên trong',
               gives='None — không có return mang giá trị',
               effect='Tạo hoặc ghi đè file; không sửa lines, không in.',
               call='write_lines("out.txt", ["a"]) → None; file chứa a và xuống dòng')

EX1_RULES = ('Quy tắc của khoá: palindrome phải KHÔNG rỗng; phân biệt hoa/thường; giữ khoảng trắng; chỉ bỏ CR/LF '
             'ở cuối dòng; giữ thứ tự và phần tử trùng; ghi đè file kết quả; không sửa file nguồn.')

EX1_SOLUTION = READ_LINES + '\n' + IS_PALINDROME + '\n' + WRITE_LINES + r'''
lines = read_lines("data.txt")
palindromes = []
for text in lines:
    if is_palindrome(text):
        palindromes.append(text)

write_lines("palindromes.txt", palindromes)
'''


def ex1_tests(prefix=''):
    """Ca chấm hành vi của cả chương trình Ex1 (B19, B20) — chỉ nhìn file vào/ra."""
    pal = "file('palindromes.txt')"
    return [
        T(prefix + 'Fixture công khai', run(files={'data.txt': 'a\nab\nradar'}) + '.' + pal, 'a\nradar\n'),
        T(prefix + 'File rỗng → file kết quả rỗng', run(files={'data.txt': ''}) + '.' + pal, ''),
        T(prefix + 'Có Unicode, dòng rỗng', run(files={'data.txt': 'level\npython\n\nđộđ\nradar'}) + '.' + pal,
          'level\nđộđ\nradar\n'),
        T(prefix + 'Giữ khoảng trắng, phân biệt hoa/thường, giữ trùng',
          run(files={'data.txt': 'Level\n a \nradar\nradar'}) + '.' + pal, ' a \nradar\nradar\n'),
        T(prefix + 'File xuống dòng CRLF', run(files={'data.txt': 'radar\r\nab\r\nx\r\n'}) + '.' + pal, 'radar\nx\n'),
        T(prefix + 'Dòng cuối không có newline', run(files={'data.txt': 'radar'}) + '.' + pal, 'radar\n'),
        T(prefix + 'Ghi đè file kết quả cũ',
          run(files={'data.txt': 'ab', 'palindromes.txt': 'old\n'}) + '.' + pal, ''),
        T(prefix + 'Không sửa file nguồn',
          run(files={'data.txt': 'level\npython'}) + ".file('data.txt')", 'level\npython'),
        T(prefix + 'Ca riêng: dữ liệu hỗn hợp',
          run(files={'data.txt': 'Level\nlevel\n\nđộđ\n a \nradar\nradar\nx'}) + '.' + pal,
          'level\nđộđ\n a \nradar\nradar\nx\n'),
    ]


LESSONS = [
    # ------------------------------------------------------------------ B11
    dict(
        code='B11', title='Đọc file đầu tiên', minutes=20,
        goal='Đọc toàn bộ file UTF-8 bằng with/open.',
        prereq='B10',
        brief='Dùng with/open (mode "r", encoding="utf-8") để đọc toàn bộ data.txt vào text, rồi in text ở NGOÀI khối with. File data.txt đã có sẵn trong thư mục bài.',
        example='data.txt chứa "level\\npython\\nđộđ" → text nhận đúng nội dung đó.',
        demo=r'''with open("note.txt", "r", encoding="utf-8") as file:
    content = file.read()

print(len(content))
print(content)
''',
        explain=[
            'open mở file: "r" là đọc, encoding="utf-8" để đọc đúng chữ có dấu.',
            'with giữ file trong khối thụt vào và TỰ ĐÓNG file khi ra khỏi khối. file.read() lấy toàn bộ nội dung thành một str, kể cả ký tự xuống dòng.',
            'Ra khỏi with, file đã đóng nhưng biến content vẫn giữ chuỗi trong bộ nhớ.',
        ],
        predict=dict(q='Nếu file rỗng, file.read() nhận được gì?', options=[
            ('Chuỗi rỗng ""', 'Không có ký tự nào để đọc; read() trả "" chứ không lỗi.', True),
            ('None', 'read() luôn trả về str.', False),
            ('Báo lỗi', 'File rỗng vẫn mở và đọc bình thường.', False),
        ]),
        myth=('"Đóng file rồi thì mất luôn nội dung đã đọc"',
              'text đã là một chuỗi trong bộ nhớ; with chỉ đóng kết nối tới file. Còn thiếu file thì Python báo '
              'FileNotFoundError — đó là lỗi dữ liệu/môi trường, bài này chưa cần try/except.'),
        mcq=[
            dict(q='Vì sao cần encoding="utf-8" khi mở data.txt?', options=[
                ('Để đọc đúng chữ có dấu như "độđ"', 'Mã hoá mặc định của máy có thể khác UTF-8.', True),
                ('Để đọc nhanh hơn', 'Encoding quyết định cách giải mã byte thành chữ, không phải tốc độ.', False),
                ('Để file tự đóng', 'Việc tự đóng file là của with.', False),
            ]),
            dict(q='Mở data.txt bằng mode "w" để đọc thì chuyện gì xảy ra?', options=[
                ('Nội dung file bị xoá ngay khi mở', 'Mode "w" ghi đè — tuyệt đối không dùng với file nguồn.', True),
                ('Đọc bình thường', '"w" là mode ghi, không đọc được.', False),
                ('Python tự đổi sang "r"', 'Python làm đúng mode bạn ghi.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao in text ở ngoài with vẫn được?',
            sample='file.read() đã chép nội dung file vào biến text (một str trong bộ nhớ). with chỉ đóng file khi ra '
                   'khỏi khối, không xoá biến text, nên print(text) ở ngoài vẫn in đúng nội dung, kể cả chữ có dấu.'),
        scaffold=dict(
            intro='Lắp lời mở file và lệnh đọc.',
            template=r'''with {{slot1}} as file:
    {{slot2}}

print(text)
''',
            slots=['open("data.txt", "r", encoding="utf-8")', 'text = file.read()'],
            traps=[('open("data.txt", "w", encoding="utf-8")', 1, 'Mode w XOÁ file nguồn!'),
                   ('text = file', 2, 'file là đối tượng file, chưa phải nội dung.'),
                   ('text = file.readline()', 2, 'Chỉ đọc một dòng.')]),
        flow=['open("data.txt", "r", encoding="utf-8") mở file.',
              'file.read() → text = "level\\npython\\nđộđ".',
              'Ra khỏi with → file đóng.',
              'print(text) → in nội dung, cộng một xuống dòng của print.'],
        transfer='Thử file rỗng và file có tiếng Việt; không thêm xử lý lỗi ở bài này.',
        counter=dict(q='data.txt rỗng thì print(text) in gì?',
                     options=['Một dòng trống', 'None', 'Báo lỗi'], correct='Một dòng trống'),
        practice='Đọc bằng mode "r" và encoding="utf-8". In text sau khi ra khỏi with.',
        steps=['with open("data.txt", "r", encoding="utf-8") as file:',
               'Trong with: text = file.read(); ngoài with: print(text).'],
        partial=r'''with open("data.txt", "r", encoding="utf-8") as file:
    ...
print(text)''',
        io=[('data.txt: "level\\npython\\nđộđ"', 'text đúng; stdout thêm một xuống dòng do print'),
            ('File rỗng', 'text = ""; print tạo một dòng rỗng')],
        data={'data.txt': 'level\npython\nđộđ'},
        starter=r'''# data.txt đã được cấp trong thư mục bài.
# Tự đọc file vào text và in để quan sát.
''',
        solution=r'''with open("data.txt", "r", encoding="utf-8") as file:
    text = file.read()

print(text)
''',
        tests=[
            T('text nhận đúng nội dung (cả dấu tiếng Việt)', run() + ".var('text')", 'level\npython\nđộđ'),
            T('stdout = nội dung + một xuống dòng', run() + '.stdout', 'level\npython\nđộđ\n'),
            T('File rỗng → text = ""', run(files={'data.txt': ''}) + ".var('text')", ''),
            T('Ca riêng: "xin chào"', run(files={'data.txt': 'xin chào'}) + ".var('text')", 'xin chào'),
            T('Giữ xuống dòng cuối file', run(files={'data.txt': 'a\nb\n'}) + ".var('text')", 'a\nb\n'),
        ],
        bad=[('chỉ đọc một dòng', 'with open("data.txt", "r", encoding="utf-8") as file:\n    text = file.readline()\nprint(text)\n')],
    ),

    # ------------------------------------------------------------------ B12
    dict(
        code='B12', title='Đọc từng dòng', minutes=20,
        goal='Đọc từng dòng và chỉ bỏ ký tự CR/LF ở cuối dòng.',
        prereq='B11',
        brief='Duyệt data.txt từng dòng; dùng line.rstrip("\\r\\n") để bỏ ký tự xuống dòng ở cuối rồi append vào lines. Phần mở file đã cấp.',
        example='File " level \\n\\nradar" → [" level ", "", "radar"].',
        demo=r'''rows = []
with open("scores.txt", "r", encoding="utf-8") as file:
    for line in file:
        rows.append(line.rstrip("\r\n"))
print(rows)
''',
        explain=[
            'for line in file đọc lần lượt từng dòng; mỗi dòng (trừ dòng cuối có thể không có) mang "\\n" ở cuối.',
            'rstrip("\\r\\n") chỉ bỏ ký tự CR/LF ở CUỐI — dấu cách vẫn giữ nguyên.',
            'append lưu cả chuỗi rỗng; việc lọc là của bước sau.',
        ],
        predict=dict(q='Dùng strip() thay rstrip("\\r\\n") có giữ hai dấu cách quanh " level " không?', options=[
            ('Không — strip() xoá cả khoảng trắng hai đầu', '" level " thành "level": dữ liệu bị đổi.', True),
            ('Có — strip() chỉ bỏ xuống dòng', 'strip() không tham số bỏ MỌI khoảng trắng hai đầu.', False),
            ('Chỉ giữ dấu cách bên phải', 'Cả hai đầu đều bị xoá.', False),
        ]),
        myth=('"Bỏ luôn dòng rỗng khi đọc cho gọn"',
              'Bước đọc chỉ chuyển file thành list dòng — giữ nguyên dữ liệu. Loại chuỗi rỗng là việc của bước kiểm '
              'tra palindrome. strip() cũng sai vì làm mất dấu cách thuộc dữ liệu.'),
        mcq=[
            dict(q='File "a\\r\\nb\\r\\n" (xuống dòng kiểu Windows) cho lines là gì?', options=[
                ('["a", "b"]', 'rstrip("\\r\\n") bỏ cả CR lẫn LF ở cuối.', True),
                ('["a\\r", "b\\r"]', 'CR cũng nằm trong tập ký tự được bỏ.', False),
                ('["a", "", "b", ""]', 'Mỗi dòng chỉ được đọc một lần.', False),
            ]),
            dict(q='Dòng cuối "radar" không có xuống dòng. line[:-1] cho kết quả gì?', options=[
                ('"rada" — cắt mất chữ r', 'line[:-1] luôn bỏ ký tự cuối, kể cả khi đó không phải \\n. Vì vậy dùng rstrip.', True),
                ('"radar"', 'line[:-1] không kiểm tra ký tự cuối là gì.', False),
                ('Báo lỗi', 'Slicing không lỗi.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao dùng rstrip("\\r\\n") thay vì strip()?',
            sample='Bài chỉ bỏ ký tự xuống dòng ở cuối. strip() còn xoá dấu cách đầu/cuối nên " level " thành "level" — '
                   'đổi dữ liệu. rstrip("\\r\\n") giữ nguyên khoảng trắng, bỏ cả \\r của file Windows, và dòng cuối không '
                   'có newline vẫn được giữ nguyên.'),
        scaffold=dict(
            intro='Lắp phép bỏ xuống dòng và lệnh thêm vào list.',
            template=r'''lines = []
with open("data.txt", "r", encoding="utf-8") as file:
    for line in file:
        text = {{slot1}}
        {{slot2}}
print(lines)
''',
            slots=[r'line.rstrip("\r\n")', 'lines.append(text)'],
            traps=[('line.strip()', 1, 'Xoá cả dấu cách thuộc dữ liệu.'),
                   ('line[:-1]', 1, 'Cắt mất ký tự cuối của dòng không có newline.'),
                   ('lines = [text]', 2, 'Ghi đè list mỗi lượt.')]),
        flow=['" level \\n" → " level ".',
              '"\\n" → "".',
              '"radar" (không newline) → giữ "radar".',
              'lines = [" level ", "", "radar"].'],
        transfer='Thử file rỗng, file xuống dòng CRLF và file có dòng cuối không newline.',
        counter=dict(q='File " \\n" (một dấu cách rồi xuống dòng) cho lines là gì?',
                     options=['[" "]', '[""]', '[]'], correct='[" "]'),
        practice='Đọc list dòng; giữ chuỗi rỗng và khoảng trắng để phần lọc xử lý sau.',
        steps=['Mỗi lượt: text = line.rstrip("\\r\\n").', 'lines.append(text) — giữ cả chuỗi rỗng.'],
        partial=r'''    for line in file:
        text = line.rstrip("\r\n")
        ...''',
        io=[('" level \\n\\nradar"', '[" level ", "", "radar"]'), ('File rỗng', '[]')],
        data={'data.txt': ' level \n\nradar'},
        starter=r'''lines = []
with open("data.txt", "r", encoding="utf-8") as file:
    for line in file:
        pass
# Tự thêm từng dòng đã xử lý vào lines.
print(lines)
''',
        solution=r'''lines = []
with open("data.txt", "r", encoding="utf-8") as file:
    for line in file:
        text = line.rstrip("\r\n")
        lines.append(text)

print(lines)
''',
        tests=[
            T('" level \\n\\nradar" → [" level ", "", "radar"]', run() + ".var('lines')", [' level ', '', 'radar']),
            T('File rỗng → []', run(files={'data.txt': ''}) + ".var('lines')", []),
            T('CRLF: "a\\r\\nb\\r\\n" → ["a", "b"]', run(files={'data.txt': 'a\r\nb\r\n'}) + ".var('lines')", ['a', 'b']),
            T('Dòng cuối không newline giữ nguyên', run(files={'data.txt': 'radar'}) + ".var('lines')", ['radar']),
            T('" \\n" → [" "] (giữ dấu cách)', run(files={'data.txt': ' \n'}) + ".var('lines')", [' ']),
        ],
        bad=[('strip()', 'lines = []\nwith open("data.txt", "r", encoding="utf-8") as file:\n    for line in file:\n        lines.append(line.strip())\nprint(lines)\n'),
             ('cắt ký tự cuối', 'lines = []\nwith open("data.txt", "r", encoding="utf-8") as file:\n    for line in file:\n        lines.append(line[:-1])\nprint(lines)\n')],
    ),

    # ------------------------------------------------------------------ B13
    dict(
        code='B13', title='Ghi một kết quả', minutes=20,
        goal='Ghi list chuỗi ra file, mỗi phần tử một dòng.',
        prereq='B12',
        brief='Cho words = ["level", "radar"]. Mở palindromes.txt bằng mode "w" (UTF-8) và ghi mỗi từ trên một dòng. List kết quả đã cấp, chưa phải tự lọc. Không in gì ra màn hình.',
        example='words = ["level", "radar"] → palindromes.txt chứa "level\\nradar\\n".',
        demo=r'''names = ["An", "Binh"]
with open("names.txt", "w", encoding="utf-8") as file:
    for name in names:
        file.write(name + "\n")
''',
        explain=[
            '"w" tạo file nếu chưa có và XOÁ nội dung cũ nếu đã có.',
            'file.write ghi đúng chuỗi được đưa vào — không tự xuống dòng như print, nên phải nối "\\n".',
            'with đóng file sau khi ghi xong; kết quả nằm trong FILE, không phải trên màn hình.',
        ],
        predict=dict(q='Chạy lại với words = ["a"] — file có giữ dữ liệu của lần trước không?', options=[
            ('Không — mode "w" ghi đè, file chỉ còn "a\\n"', 'Mở bằng "w" là làm rỗng file trước khi ghi.', True),
            ('Có — "a" được thêm vào cuối', 'Đó là hành vi của mode "a" (append).', False),
            ('Báo lỗi vì file đã tồn tại', '"w" ghi đè file có sẵn mà không báo lỗi.', False),
        ]),
        myth=('"Mở bằng mode "a" cho an toàn"',
              'Mode "a" cộng dồn kết quả qua các lần chạy — chạy hai lần là file lẫn dữ liệu cũ. Và tuyệt đối không '
              'mở data.txt (file nguồn) bằng "w": nội dung bị xoá ngay khi mở.'),
        mcq=[
            dict(q='Vì sao phải tự thêm "\\n" sau mỗi từ?', options=[
                ('Vì write không tự xuống dòng', 'Không có "\\n" thì các từ dính liền: "levelradar".', True),
                ('Vì UTF-8 yêu cầu', 'Encoding không liên quan tới xuống dòng.', False),
                ('Không cần, write tự xuống dòng', 'Chỉ print mới tự thêm xuống dòng.', False),
            ]),
            dict(q='words = [] thì palindromes.txt sau khi chạy là gì?', options=[
                ('File rỗng (được tạo hoặc ghi đè)', 'Mở "w" đã làm rỗng file; vòng lặp không ghi gì.', True),
                ('Không có file', 'open(..., "w") tạo file ngay khi mở.', False),
                ('Giữ dữ liệu cũ', '"w" luôn xoá nội dung cũ.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao phải tự thêm "\\n" khi ghi?',
            sample='file.write ghi đúng chuỗi được đưa vào, không tự xuống dòng như print mặc định. Nối word + "\\n" '
                   'thì mỗi từ nằm trên một dòng; mode "w" ghi đè nên chạy lại không lẫn dữ liệu cũ.'),
        scaffold=dict(
            intro='Dữ liệu mới: ["độđ", "độđ"]. Chọn mode mở file và lệnh ghi.',
            template=r'''words = ["độđ", "độđ"]
with open("palindromes.txt", {{slot1}}, encoding="utf-8") as file:
    for word in words:
        {{slot2}}
''',
            slots=['"w"', r'file.write(word + "\n")'],
            traps=[('"a"', 1, 'Cộng dồn qua các lần chạy.'),
                   ('"r"', 1, 'Chỉ đọc, không ghi được.'),
                   ('file.write(word)', 2, 'Các từ dính liền trên một dòng.'),
                   ('print(word)', 2, 'In ra màn hình, không ghi file.')]),
        flow=['Mở "w" → file rỗng.',
              'Ghi "level\\n".',
              'Ghi "radar\\n".',
              'Ra khỏi with → đóng file.'],
        transfer='Chạy hai lần với hai list khác nhau; lần thứ hai thử [] và kiểm file rỗng.',
        counter=dict(q='File cũ chứa "old\\n", chạy với words = ["a"]. File sau khi chạy?',
                     options=['"a\\n"', '"old\\na\\n"', '"old\\n"'], correct='"a\\n"'),
        practice='Mỗi lần write ghi word + "\\n".',
        steps=['with open("palindromes.txt", "w", encoding="utf-8") as file:',
               'for word in words: file.write(word + "\\n")'],
        partial=r'''with open("palindromes.txt", "w", encoding="utf-8") as file:
    for word in words:
        ...''',
        io=[('["level", "radar"]', 'File: "level\\nradar\\n"; stdout rỗng'), ('[]', 'Tạo/ghi đè thành file rỗng')],
        starter=r'''words = ["level", "radar"]
# Tự mở palindromes.txt bằng mode w và ghi từng word.
''',
        solution=r'''words = ["level", "radar"]
with open("palindromes.txt", "w", encoding="utf-8") as file:
    for word in words:
        file.write(word + "\n")
''',
        tests=[
            T('File: "level\\nradar\\n"', run() + ".file('palindromes.txt')", 'level\nradar\n'),
            T('stdout rỗng', run() + '.stdout', ''),
            T('[] → file rỗng', run(vars={'words': []}) + ".file('palindromes.txt')", ''),
            T('Ghi đè file cũ', run(vars={'words': ['a']}, files={'palindromes.txt': 'old\n'}) + ".file('palindromes.txt')", 'a\n'),
            T('Giữ dấu tiếng Việt và dòng trùng', run(vars={'words': ['độđ', 'độđ']}) + ".file('palindromes.txt')", 'độđ\nđộđ\n'),
        ],
        bad=[('mode a', 'words = ["level", "radar"]\nwith open("palindromes.txt", "a", encoding="utf-8") as file:\n    for word in words:\n        file.write(word + "\\n")\n'),
             ('thiếu xuống dòng', 'words = ["level", "radar"]\nwith open("palindromes.txt", "w", encoding="utf-8") as file:\n    for word in words:\n        file.write(word)\n')],
    ),

    # ------------------------------------------------------------------ B14
    dict(
        code='B14', title='Đưa phần đọc vào hàm', minutes=20,
        goal='Đưa việc đọc từng dòng vào một hàm có giá trị trả về.',
        prereq='B13',
        brief='Viết read_lines(path) trả list các dòng đã bỏ ký tự xuống dòng ở cuối (như B12). Hàm không print. Gọi thử với "data.txt" và in kết quả ở ngoài hàm.',
        example='data.txt chứa "level\\npython" → read_lines("data.txt") → ["level", "python"].',
        demo=r'''def read_text(path):
    with open(path, "r", encoding="utf-8") as file:
        content = file.read()
    return content

print(read_text("note.txt"))
''',
        explain=[
            'path là tham số: cùng một hàm đọc được bất kỳ file nào, không cố định "note.txt" trong thân hàm.',
            'Biến tạo trong hàm (content) là của riêng mỗi lần gọi.',
            'return content nằm sau with: file đã đóng, giá trị vẫn được gửi về nơi gọi.',
        ],
        predict=dict(q='return lines đặt ngoài with có còn trả được kết quả không?', options=[
            ('Có — lines đã nằm trong bộ nhớ', 'Đóng file không xoá list đã đọc.', True),
            ('Không — file đóng thì lines rỗng', 'with chỉ đóng file, không đụng tới biến.', False),
            ('Báo lỗi', 'return sau with là cách viết chuẩn.', False),
        ]),
        myth=('"print(lines) trong hàm là đủ"',
              'Nơi gọi cần LIST để lọc tiếp; print chỉ hiển thị và hàm trả None. Đừng hard-code "data.txt" trong thân hàm — '
              'dùng tham số path. Thiếu file thì cứ để FileNotFoundError bật lên, đừng biến lỗi thành [].'),
        mcq=[
            dict(q='read_lines("missing.txt") khi file không tồn tại thì…', options=[
                ('Phát sinh FileNotFoundError', 'Để lỗi hiện ra giúp phát hiện sai tên file.', True),
                ('Trả []', 'Giấu lỗi làm nơi gọi tưởng file rỗng.', False),
                ('Trả None', 'Không có return nào chạy tới khi open lỗi.', False),
            ]),
            dict(q='Khởi tạo lines = [] ở đâu để mỗi lần gọi có list mới?', options=[
                ('Trong thân hàm', 'Mỗi lần gọi chạy lại thân hàm nên có list mới.', True),
                ('Ở ngoài hàm, trên đầu file', 'List dùng chung sẽ dồn kết quả của nhiều lần gọi.', False),
                ('Không cần khởi tạo', 'append vào biến chưa có sẽ báo NameError.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao return lines thay vì print(lines) trong hàm?',
            sample='Nơi gọi cần list để dùng tiếp (lọc palindrome). print chỉ hiển thị lên màn hình và hàm sẽ trả None, '
                   'nơi gọi không nhận được dữ liệu. return lines gửi list về; muốn xem thì nơi gọi tự print.'),
        scaffold=dict(
            intro='Lắp tham số đúng chỗ và lệnh trả kết quả.',
            template=r'''def read_lines(path):
    lines = []
    with open({{slot1}}, "r", encoding="utf-8") as file:
        for line in file:
            lines.append(line.rstrip("\r\n"))
    {{slot2}}
''',
            slots=['path', 'return lines'],
            traps=[('"data.txt"', 1, 'Hard-code tên file.'),
                   ('print(lines)', 2, 'Hàm sẽ trả None.'),
                   ('return line', 2, 'Chỉ trả dòng cuối.')]),
        flow=['read_lines("data.txt") → path = "data.txt".',
              'Đọc từng dòng → lines = ["level", "python"].',
              'Ra khỏi with → đóng file.',
              'return lines → nơi gọi nhận list.'],
        transfer='Gọi cùng hàm với other.txt và với một file rỗng. Không bắt lỗi thiếu file.',
        counter=dict(q='File " a \\nđộđ" → read_lines trả gì?',
                     options=['[" a ", "độđ"]', '["a", "độđ"]', '[" a \\n", "độđ"]'], correct='[" a ", "độđ"]'),
        practice='Dùng tham số path thay tên file cố định; return list sau khi đọc hết.',
        steps=['lines = [] trong hàm; with open(path, "r", encoding="utf-8").',
               'Mỗi dòng rstrip("\\r\\n") rồi append; return lines sau with.'],
        partial=r'''def read_lines(path):
    lines = []
    with open(path, "r", encoding="utf-8") as file:
        ...
    return lines''',
        io=[('File: "level\\npython"', '["level", "python"]'), ('File rỗng', '[]')],
        contracts=[C_READ],
        data={'data.txt': 'level\npython'},
        starter=r'''def read_lines(path):
    pass

# Gọi thử và in ở ngoài hàm.
''',
        solution=READ_LINES + r'''
lines = read_lines("data.txt")
print(lines)
''',
        tests=[
            T('"level\\npython" → ["level", "python"]', r"read_lines(_studio.write('t1.txt', 'level\npython'))", ['level', 'python']),
            T('File rỗng → []', "read_lines(_studio.write('t2.txt', ''))", []),
            T('Đọc đúng file theo path (other.txt)', r"read_lines(_studio.write('other.txt', 'a\nb'))", ['a', 'b']),
            T('UTF-8 và khoảng trắng', r"read_lines(_studio.write('t3.txt', ' a \nđộđ'))", [' a ', 'độđ']),
            T('Thiếu file → FileNotFoundError', "_studio.call(read_lines, 'missing.txt').error", 'FileNotFoundError'),
            T('Hàm không print', "_studio.stdout(read_lines, 'data.txt')", ''),
        ],
        bad=[('hard-code data.txt', 'def read_lines(path):\n    lines = []\n    with open("data.txt", "r", encoding="utf-8") as file:\n        for line in file:\n            lines.append(line.rstrip("\\r\\n"))\n    return lines\n'),
             ('giấu lỗi thiếu file', 'def read_lines(path):\n    lines = []\n    try:\n        with open(path, "r", encoding="utf-8") as file:\n            for line in file:\n                lines.append(line.rstrip("\\r\\n"))\n    except FileNotFoundError:\n        return []\n    return lines\n')],
    ),

    # ------------------------------------------------------------------ B15
    dict(
        code='B15', title='Đưa phần ghi vào hàm', minutes=20,
        goal='Đưa việc ghi từng dòng vào hàm có tác dụng phụ.',
        prereq='B14',
        brief='Viết write_lines(path, lines): mở path bằng mode "w", UTF-8, ghi mỗi chuỗi trong lines trên một dòng. Hàm không print và không return giá trị.',
        example='write_lines("palindromes.txt", ["level", "radar"]) tạo file hai dòng và trả None.',
        demo=r'''def save_names(path, names):
    with open(path, "w", encoding="utf-8") as file:
        for name in names:
            file.write(name + "\n")

result = save_names("names.txt", ["An"])
print(result)
''',
        explain=[
            'path quyết định file đích; names là list chuỗi cần ghi.',
            'Không có return mang giá trị nên lời gọi trả None — kết quả cần quan sát nằm ở FILE.',
            'print(result) in None: hàm vẫn làm xong việc của nó (ghi file) — đó là tác dụng phụ.',
        ],
        predict=dict(q='Hàm không có return mang giá trị thì nơi gọi nhận gì?', options=[
            ('None', 'Python tự trả None khi hàm chạy hết mà không gặp return mang giá trị.', True),
            ('List vừa ghi', 'Không có return lines nên không trả list.', False),
            ('True', 'Không có gì trả True.', False),
        ]),
        myth=('"Hàm trả None là hàm không làm gì"',
              'write_lines làm việc bằng TÁC DỤNG PHỤ: ghi file. Nó không cần trả dữ liệu. Đừng dùng print(lines) thay cho '
              'ghi file — hai hành vi khác nhau.'),
        mcq=[
            dict(q='Gọi write_lines("out.txt", ["a"]) rồi write_lines("out.txt", []). File cuối cùng chứa gì?', options=[
                ('Rỗng — lần gọi sau ghi đè', 'Mỗi lần mở "w" là làm rỗng file.', True),
                ('"a\\n"', 'Lần gọi thứ hai đã ghi đè.', False),
                ('Báo lỗi vì list rỗng', 'Duyệt list rỗng là hợp lệ.', False),
            ]),
        ],
        why=dict(
            prompt='Hàm trả None có nghĩa là không làm được việc gì không?',
            sample='Không. write_lines thực hiện tác dụng phụ là ghi file; nó không cần trả dữ liệu để hoàn thành việc đó. '
                   'Kết quả nằm trong file đích, còn giá trị trả về là None vì không có return mang giá trị.'),
        scaffold=dict(
            intro='Lắp mode mở file và lệnh ghi từng chuỗi.',
            template=r'''def write_lines(path, lines):
    with open(path, {{slot1}}, encoding="utf-8") as file:
        for text in lines:
            {{slot2}}
''',
            slots=['"w"', r'file.write(text + "\n")'],
            traps=[('"a"', 1, 'Cộng dồn qua các lần gọi.'),
                   ('file.write(lines)', 2, 'write nhận str, không nhận list → TypeError.'),
                   ('print(text)', 2, 'In ra màn hình, không ghi file.')]),
        flow=['lines → lấy từng text.',
              'Ghi text + "\\n" vào file đích.',
              'Ra khỏi with → đóng file.',
              'Hàm kết thúc → trả None.'],
        transfer='Gọi hai lần vào cùng một file: trước ghi ["a"], sau ghi []; kiểm nội dung lần đầu bị thay thế.',
        counter=dict(q='write_lines("out.txt", ["độđ"]) trả về gì?', options=['None', '["độđ"]', 'True'], correct='None'),
        practice='Dùng mode "w", UTF-8 và for để ghi mỗi text + "\\n".',
        steps=['with open(path, "w", encoding="utf-8") as file:', 'for text in lines: file.write(text + "\\n") — không return.'],
        partial=r'''def write_lines(path, lines):
    with open(path, "w", encoding="utf-8") as file:
        ...''',
        io=[('["level", "radar"]', 'File: "level\\nradar\\n"; trả None'), ('[]', 'File rỗng; trả None')],
        contracts=[C_WRITE],
        starter=r'''def write_lines(path, lines):
    pass
''',
        solution=WRITE_LINES + r'''
write_lines("palindromes.txt", ["level", "radar"])
''',
        tests=[
            T('["level", "radar"] → file hai dòng, trả None',
              "(write_lines('w1.txt', ['level', 'radar']), _studio.read('w1.txt'))", (None, 'level\nradar\n')),
            T('[] → file rỗng, trả None', "(write_lines('w2.txt', []), _studio.read('w2.txt'))", (None, '')),
            TX('Ghi đè, không cộng dồn',
               "_studio.check('write_lines(\"w3.txt\", [\"a\"])\\nwrite_lines(\"w3.txt\", [])\\nassert _studio.read(\"w3.txt\") == \"\", \"file phải rỗng sau lần ghi thứ hai\"')",
               'True'),
            T('UTF-8: "độđ"', "(write_lines('w4.txt', ['độđ']), _studio.read('w4.txt'))[1]", 'độđ\n'),
            TX('Không sửa lines',
               "_studio.check('items = [\"a\", \"b\"]\\nwrite_lines(\"w5.txt\", items)\\nassert items == [\"a\", \"b\"]')", 'True'),
            T('Hàm không print', "_studio.stdout(write_lines, 'w6.txt', ['a'])", ''),
        ],
        bad=[('mode a', 'def write_lines(path, lines):\n    with open(path, "a", encoding="utf-8") as file:\n        for text in lines:\n            file.write(text + "\\n")\n'),
             ('trả list', 'def write_lines(path, lines):\n    with open(path, "w", encoding="utf-8") as file:\n        for text in lines:\n            file.write(text + "\\n")\n    return lines\n')],
    ),

    # ------------------------------------------------------------------ B16
    dict(
        code='B16', title='Sửa lỗi print và return', minutes=20,
        goal='Sửa hàm để trả kết quả sau khi đã xét đủ list.',
        prereq='B15',
        brief='filter_palindromes trong khung đang print bên trong và đặt return TRONG vòng for. Sửa để hàm không print và chỉ return sau khi xét đủ mọi từ. is_palindrome (B09) đã cấp.',
        example='Với ["level", "ab", "radar"], bản lỗi dừng sau "level"; bản đúng trả ["level", "radar"].',
        demo=r'''def first_long(words):
    for word in words:
        if len(word) > 3:
            return word
    return ""

print(first_long(["hi", "hello", "world"]))
''',
        explain=[
            'Hàm này CỐ Ý dừng sớm: gặp từ dài đầu tiên là return ngay — đúng cho bài "tìm phần tử đầu tiên".',
            'Hàm LỌC thì khác: phải xét đủ mọi phần tử, nên return phải đứng SAU vòng for.',
            'return "" sau for là phương án khi không tìm thấy, kể cả list rỗng — thiếu nó hàm trả None.',
        ],
        predict=dict(q='Với list rỗng, bản lỗi có đi tới return không?', code=r'''def filter_palindromes(words):
    palindromes = []
    for word in words:
        if is_palindrome(word):
            palindromes.append(word)
        print(palindromes)
        return palindromes
''', options=[
            ('Không — vòng for không chạy lượt nào nên hàm trả None', 'return nằm trong for nên không bao giờ được chạy.', True),
            ('Có — trả []', 'Chỉ bản đã sửa mới trả [].', False),
            ('Báo lỗi', 'Không có lỗi; hàm chỉ âm thầm trả None.', False),
        ]),
        myth=('"print trong hàm giúp nơi gọi thấy kết quả"',
              'Nơi gọi chỉ nhận được giá trị qua return; print trong hàm làm bẩn stdout mỗi lần gọi. Lệnh print ở cuối mã '
              'mẫu là của NƠI GỌI để quan sát, không phải trong hàm.'),
        mcq=[
            dict(q='Bản lỗi gọi với ["ab", "radar"] trả gì?', options=[
                ('[] — dừng ngay sau lượt "ab"', 'return trong for kết thúc hàm ở lượt đầu.', True),
                ('["radar"]', 'Hàm chưa kịp xét "radar".', False),
                ('None', 'Lượt đầu đã gặp return [].', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao bản lỗi trả None khi words = []?',
            sample='Với list rỗng, vòng for không chạy lượt nào; return nằm trong vòng lặp nên không bao giờ được thực '
                   'hiện, hàm chạy hết và Python tự trả None. Đặt return sau for thì list rỗng trả [] và list dài được xét đủ.'),
        scaffold=dict(
            intro='Lắp dòng cuối của hàm đã sửa (thụt ngang hàng với for, ngoài vòng lặp).',
            template=r'''def filter_palindromes(words):
    palindromes = []
    for word in words:
        if is_palindrome(word):
            palindromes.append(word)
    {{slot1}}
''',
            slots=['return palindromes'],
            traps=[('print(palindromes)', 1, 'In thay vì trả về — hàm trả None.'),
                   ('return word', 1, 'Chỉ trả từ cuối.'),
                   ('return palindromes.append(word)', 1, 'append trả None.')]),
        flow=['level → True → [level].',
              'ab → False → bỏ (vẫn đi tiếp).',
              'radar → True → [level, radar].',
              'Hết for → return [level, radar].'],
        transfer='Thử [] và ["ab", "radar"]. Giải thích vì sao từ đầu tiên sai vẫn phải xét các từ tiếp theo.',
        counter=dict(q='Bản đã sửa với ["ab", "radar"] trả gì?', options=['["radar"]', '[]', 'None'], correct='["radar"]'),
        practice='Dùng đầu vào có cả từ đúng lẫn từ sai; kiểm hàm xét tới phần tử cuối.',
        steps=['Bỏ print(palindromes) khỏi hàm.', 'Chuyển return palindromes ra ngoài for (thụt 4 dấu cách).'],
        partial=r'''    for word in words:
        if is_palindrome(word):
            palindromes.append(word)
    return ...''',
        io=[('["level", "ab", "radar"]', '["level", "radar"]'), ('[]', '[]')],
        contracts=[C_PAL, C_FILTER],
        starter=IS_PALINDROME + r'''
def filter_palindromes(words):
    palindromes = []
    for word in words:
        if is_palindrome(word):
            palindromes.append(word)
        print(palindromes)
        return palindromes
''',
        solution=IS_PALINDROME + '\n' + FILTER_PALINDROMES + r'''
result = filter_palindromes(["level", "ab", "radar"])
print(result)
''',
        tests=[
            T('["level", "ab", "radar"] → ["level", "radar"]', 'filter_palindromes(["level", "ab", "radar"])', ['level', 'radar']),
            T('[] → []', 'filter_palindromes([])', []),
            T('["ab", "radar"] → ["radar"]', 'filter_palindromes(["ab", "radar"])', ['radar']),
            T('Lời gọi hàm không in gì (stdout rỗng)', '_studio.stdout(filter_palindromes, ["level", "ab"])', ''),
        ],
        bad=[('bản lỗi gốc', None)],  # None = dùng chính starter
    ),

    # ------------------------------------------------------------------ B17
    dict(
        code='B17', title='Nối đọc với lọc', minutes=20,
        goal='Nối kết quả đọc file với bước lọc bằng vòng lặp.',
        prereq='B16',
        brief='read_lines và is_palindrome đã cấp. Tự viết phần điều phối: đọc data.txt bằng read_lines, duyệt từng dòng, giữ dòng là palindrome vào palindromes, rồi in palindromes. Chưa ghi file.',
        example='data.txt: level, python, radar → ["level", "radar"].',
        demo=r'''def read_numbers(path):
    numbers = []
    with open(path, "r", encoding="utf-8") as file:
        for line in file:
            numbers.append(int(line))
    return numbers

def is_even(number):
    return number % 2 == 0

evens = []
for number in read_numbers("nums.txt"):
    if is_even(number):
        evens.append(number)
print(evens)
''',
        explain=[
            'read_numbers chỉ lo ĐỌC: file → list; nó không quyết định giữ hay bỏ.',
            'is_even chỉ lo KIỂM một số → bool.',
            'Vòng lặp ở dưới là phần ĐIỀU PHỐI nối hai hàm: lấy từng phần tử, hỏi is_even, append nếu True.',
        ],
        predict=dict(q='read_lines trả list; is_palindrome cần nhận dữ liệu nào từ list đó?', options=[
            ('Từng chuỗi một, mỗi lượt lặp', 'is_palindrome kiểm MỘT chuỗi.', True),
            ('Cả list lines', 'Đưa cả list vào là so sánh list với list đảo.', False),
            ('Tên file "data.txt"', 'Tên file không phải dữ liệu cần kiểm.', False),
        ]),
        myth=('"is_palindrome(lines) là kiểm cả file một lần"',
              'is_palindrome nhận MỘT chuỗi. Đưa cả list vào là so sánh list với list đảo — không phải kiểm từng dòng. '
              'Mỗi lượt lặp chỉ đưa một text.'),
        mcq=[
            dict(q='data.txt chứa "Level\\n\\na". palindromes là gì?', options=[
                ('["a"]', '"Level" sai hoa/thường; dòng rỗng bị loại.', True),
                ('["Level", "a"]', 'Không đổi chữ thường.', False),
                ('["", "a"]', 'Chuỗi rỗng không phải palindrome.', False),
            ]),
            dict(q='Bài này có tạo palindromes.txt không?', options=[
                ('Không — chỉ in list; ghi file là việc của B18', 'Mỗi bài thêm một mắt xích.', True),
                ('Có', 'Chưa gọi hàm ghi nào.', False),
                ('Có nếu list không rỗng', 'Không có lệnh ghi nào trong bài.', False),
            ]),
        ],
        why=dict(
            prompt='Hai hàm đã cấp có vai trò khác nhau thế nào?',
            sample='read_lines đọc file và trả list chuỗi; nó không quyết định giữ hay bỏ dòng nào. is_palindrome kiểm '
                   'một chuỗi và trả bool. Vòng lặp điều phối nối chúng: lấy từng text trong list, hỏi is_palindrome, '
                   'append vào palindromes nếu True.'),
        scaffold=dict(
            intro='Lắp phần điều phối (hai hàm đã cấp ở trên).',
            template=r'''lines = read_lines("data.txt")
palindromes = []
for text in {{slot1}}:
    if {{slot2}}:
        palindromes.append(text)
print(palindromes)
''',
            slots=['lines', 'is_palindrome(text)'],
            traps=[('"data.txt"', 1, 'Duyệt từng KÝ TỰ của tên file!'),
                   ('is_palindrome(lines)', 2, 'Đưa cả list vào hàm kiểm một chuỗi.')]),
        flow=['File → read_lines → [level, python, radar].',
              'level → True → giữ; python → False; radar → True.',
              'palindromes = [level, radar] → print.'],
        transfer='Thử file rỗng và file chứa "Level", một dòng rỗng, "a"; kiểm file nguồn không đổi.',
        counter=dict(q='data.txt "radar\\nradar" → palindromes?',
                     options=['["radar", "radar"]', '["radar"]', '[]'], correct='["radar", "radar"]'),
        practice='Đọc file, lọc vào list mới; chưa cần write_lines.',
        steps=['lines = read_lines("data.txt"); palindromes = [].',
               'for text in lines: if is_palindrome(text): palindromes.append(text).'],
        partial=r'''for text in lines:
    ...''',
        io=[('"level\\npython\\nradar"', '["level", "radar"]'), ('File rỗng', '[]')],
        contracts=[C_READ, C_PAL],
        data={'data.txt': 'level\npython\nradar'},
        starter=READ_LINES + '\n' + IS_PALINDROME + r'''
lines = read_lines("data.txt")
palindromes = []
# Tự duyệt lines và lọc bằng is_palindrome.

print(palindromes)
''',
        solution=READ_LINES + '\n' + IS_PALINDROME + r'''
lines = read_lines("data.txt")
palindromes = []
for text in lines:
    if is_palindrome(text):
        palindromes.append(text)

print(palindromes)
''',
        tests=[
            T('level/python/radar → ["level", "radar"]', run() + ".var('palindromes')", ['level', 'radar']),
            T('File rỗng → []', run(files={'data.txt': ''}) + ".var('palindromes')", []),
            T('"Level\\n\\na" → ["a"]', run(files={'data.txt': 'Level\n\na'}) + ".var('palindromes')", ['a']),
            T('Giữ trùng: "radar\\nradar"', run(files={'data.txt': 'radar\nradar'}) + ".var('palindromes')", ['radar', 'radar']),
            T('Chưa tạo file kết quả', run() + ".file('palindromes.txt')", None),
            T('File nguồn không đổi', run() + ".file('data.txt')", 'level\npython\nradar'),
        ],
        bad=[('kiểm cả list', READ_LINES + '\n' + IS_PALINDROME + '\nlines = read_lines("data.txt")\npalindromes = []\nif is_palindrome(lines):\n    palindromes = lines\nprint(palindromes)\n')],
    ),

    # ------------------------------------------------------------------ B18
    dict(
        code='B18', title='Nối lọc với ghi', minutes=20,
        goal='Nối kết quả lọc list với hàm ghi file.',
        prereq='B17',
        brief='is_palindrome, filter_palindromes và write_lines đã cấp. Với words cho sẵn, tự viết HAI lệnh điều phối: lọc words thành palindromes rồi ghi palindromes ra palindromes.txt.',
        example='words = ["level", "python", "radar", ""] → file "level\\nradar\\n".',
        demo=r'''def keep_even(numbers):
    result = []
    for number in numbers:
        if number % 2 == 0:
            result.append(number)
    return result

def save_numbers(path, numbers):
    with open(path, "w", encoding="utf-8") as file:
        for number in numbers:
            file.write(str(number) + "\n")

evens = keep_even([3, 4, 10])
save_numbers("evens.txt", evens)
''',
        explain=[
            'keep_even trả LIST MỚI; list gốc không đổi.',
            'evens giữ kết quả trung gian — đặt tên rõ để dòng sau dùng.',
            'save_numbers nhận evens (đã lọc), không nhận list gốc.',
        ],
        predict=dict(q='Đưa words gốc hay palindromes vào write_lines?', options=[
            ('palindromes — list đã lọc', 'File kết quả chỉ chứa chuỗi đối xứng.', True),
            ('words gốc', 'words còn từ sai và chuỗi rỗng.', False),
            ('Cả hai', 'Mỗi lần gọi write_lines ghi đè lần trước.', False),
        ]),
        myth=('"Ghi thẳng words cho nhanh"',
              'words còn từ sai và chuỗi rỗng; file kết quả phải chỉ có chuỗi đối xứng. Bài này cũng không đọc thêm file — '
              'đầu vào là list cấp sẵn.'),
        mcq=[
            dict(q='words = ["Level", ""] thì palindromes.txt chứa gì?', options=[
                ('File rỗng', 'Không từ nào hợp lệ; write_lines vẫn tạo/ghi đè file.', True),
                ('"Level\\n"', 'Phân biệt hoa/thường.', False),
                ('Không có file', 'write_lines luôn mở file bằng "w".', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao ghi words thay vì palindromes là sai?',
            sample='words còn chứa từ không đối xứng và chuỗi rỗng; palindromes mới là kết quả lọc cần xuất. Lưu kết quả '
                   'lọc vào palindromes rồi đưa đúng list đó cho write_lines thì file chỉ có chuỗi đối xứng, giữ thứ tự và trùng.'),
        scaffold=dict(
            intro='Dữ liệu mới: ["radar", "ab", "radar"]. Lắp hai lệnh điều phối.',
            template=r'''words = ["radar", "ab", "radar"]
palindromes = {{slot1}}
{{slot2}}
''',
            slots=['filter_palindromes(words)', 'write_lines("palindromes.txt", palindromes)'],
            traps=[('is_palindrome(words)', 1, 'Kiểm cả list — trả một bool.'),
                   ('write_lines("palindromes.txt", words)', 2, 'Ghi cả từ sai.'),
                   ('print(palindromes)', 2, 'In ra màn hình, không ghi file.')]),
        flow=['words → filter_palindromes → [level, radar].',
              '[level, radar] → write_lines → hai dòng trong palindromes.txt.'],
        transfer='Thử ["radar", "ab", "radar"] và []; kiểm file bị ghi đè và giữ phần tử trùng.',
        counter=dict(q='words = ["radar", "ab", "radar"] → palindromes.txt?',
                     options=['"radar\\nradar\\n"', '"radar\\n"', '"radar\\nab\\nradar\\n"'], correct='"radar\\nradar\\n"'),
        practice='Lưu kết quả lọc vào palindromes, rồi ghi list đó.',
        steps=['palindromes = filter_palindromes(words)', 'write_lines("palindromes.txt", palindromes)'],
        partial=r'''palindromes = filter_palindromes(words)
...''',
        io=[('List mẫu', 'File: "level\\nradar\\n"'), ('[]', 'File rỗng, thay dữ liệu cũ')],
        contracts=[C_PAL, C_FILTER, C_WRITE],
        starter=IS_PALINDROME + '\n' + FILTER_PALINDROMES + '\n' + WRITE_LINES + r'''
words = ["level", "python", "radar", ""]
# Tự gọi filter_palindromes rồi write_lines.
''',
        solution=IS_PALINDROME + '\n' + FILTER_PALINDROMES + '\n' + WRITE_LINES + r'''
words = ["level", "python", "radar", ""]
palindromes = filter_palindromes(words)
write_lines("palindromes.txt", palindromes)
''',
        tests=[
            T('List mẫu → "level\\nradar\\n"', run() + ".file('palindromes.txt')", 'level\nradar\n'),
            T('Giữ trùng: ["radar", "ab", "radar"]', run(vars={'words': ['radar', 'ab', 'radar']}) + ".file('palindromes.txt')", 'radar\nradar\n'),
            T('[] → file rỗng, thay dữ liệu cũ',
              run(vars={'words': []}, files={'palindromes.txt': 'old\n'}) + ".file('palindromes.txt')", ''),
            T('["Level", ""] → file rỗng', run(vars={'words': ['Level', '']}) + ".file('palindromes.txt')", ''),
            T('Không sửa words', run() + ".var('words')", ['level', 'python', 'radar', '']),
        ],
        bad=[('ghi words', IS_PALINDROME + '\n' + FILTER_PALINDROMES + '\n' + WRITE_LINES + '\nwords = ["level", "python", "radar", ""]\nwrite_lines("palindromes.txt", words)\n')],
    ),

    # ------------------------------------------------------------------ B19
    dict(
        code='B19', title='Ex1 có hỗ trợ', minutes=35,
        goal='Ghép ba hàm đã học thành chương trình Ex1 có hỗ trợ.',
        prereq='B18',
        brief='Hoàn thành ba hàm read_lines, is_palindrome, write_lines và phần điều phối: đọc data.txt → lọc palindrome → ghi palindromes.txt. Làm theo ba checkpoint; mỗi hàm một nhiệm vụ, chưa thêm hàm thứ tư.',
        example='File "level\\npython\\n\\nđộđ\\nradar" → palindromes.txt "level\\nđộđ\\nradar\\n".',
        demo=r'''lines = read_lines("data.txt")            # checkpoint 1: đọc
palindromes = []
for text in lines:                         # checkpoint 2: lọc
    if is_palindrome(text):
        palindromes.append(text)
write_lines("palindromes.txt", palindromes)  # checkpoint 3: ghi
''',
        explain=[
            'Checkpoint 1 — read_lines: file → list dòng, chỉ bỏ CR/LF cuối dòng. Kiểm list trước khi lọc.',
            'Checkpoint 2 — is_palindrome + vòng lặp: giữ chuỗi không rỗng, đối xứng, đúng thứ tự và cả phần tử trùng.',
            'Checkpoint 3 — write_lines: ghi đè file kết quả, mỗi chuỗi một dòng; file nguồn không đổi.',
        ],
        predict=dict(q='Bước nào bỏ ký tự xuống dòng? Bước nào bỏ chuỗi rỗng?', options=[
            ('read_lines bỏ xuống dòng; is_palindrome loại chuỗi rỗng', 'Mỗi hàm một nhiệm vụ.', True),
            ('read_lines làm cả hai', 'Bước đọc giữ nguyên dữ liệu, kể cả dòng rỗng.', False),
            ('write_lines bỏ chuỗi rỗng', 'write_lines ghi đúng list được đưa vào.', False),
        ]),
        myth=('"Thêm strip/lower hay set cho gọn"',
              'strip/lower đổi dữ liệu (" a " và "Level" bị xử lý sai), set làm mất thứ tự và phần tử trùng. Và không '
              'bao giờ mở file nguồn bằng "w".'),
        mcq=[
            dict(q='data.txt "Level\\n a \\nradar\\nradar" → palindromes.txt?', options=[
                ('" a \\nradar\\nradar\\n"', 'Giữ khoảng trắng, phân biệt hoa/thường, giữ trùng.', True),
                ('"level\\na\\nradar\\n"', 'Không lower, không strip, không bỏ trùng.', False),
                ('"radar\\n"', 'Không dùng set.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao read_lines không tự lọc, và write_lines không tự kiểm palindrome?',
            sample='Mỗi hàm giữ một nhiệm vụ: read_lines chỉ đọc, is_palindrome chỉ kiểm, write_lines chỉ ghi. Vòng lặp '
                   'điều phối nối các bước nên dễ kiểm từng checkpoint, dễ sửa riêng và dùng lại hàm cho dữ liệu khác.'),
        scaffold=dict(
            intro='Ba checkpoint: lắp dòng cốt lõi của mỗi hàm.',
            template=r'''def read_lines(path):
    lines = []
    with open(path, "r", encoding="utf-8") as file:
        for line in file:
            lines.append({{slot1}})
    return lines

def is_palindrome(text):
    if text == "":
        return False
    {{slot2}}

def write_lines(path, lines):
    with open(path, "w", encoding="utf-8") as file:
        for text in lines:
            {{slot3}}
''',
            slots=[r'line.rstrip("\r\n")', 'return text == text[::-1]', r'file.write(text + "\n")'],
            traps=[('line.strip()', 1, 'Mất khoảng trắng thuộc dữ liệu.'),
                   ('return text.lower() == text[::-1].lower()', 2, 'Đổi hoa/thường.'),
                   ('file.write(text)', 3, 'Các dòng dính liền.')]),
        flow=['File → read_lines → ["level", "python", "", "độđ", "radar"].',
              'Lọc → ["level", "độđ", "radar"].',
              'write_lines → palindromes.txt.'],
        transfer='Đổi fixture thành "Level\\n a \\nradar\\nradar"; dự đoán file kết quả trước khi chạy.',
        counter=dict(q='data.txt chỉ có "radar" (không newline) → palindromes.txt?',
                     options=['"radar\\n"', '"radar"', '""'], correct='"radar\\n"'),
        practice='Làm theo ba checkpoint: đọc được list; lọc đúng list; ghi đúng file. Mở gợi ý sau khi đã thử.',
        steps=['Hoàn thành read_lines rồi kiểm list dòng; chưa lọc ở bước này.',
               'Hoàn thành is_palindrome và vòng lặp lọc; so với kết quả dự đoán.',
               'Hoàn thành write_lines để xuất list đã lọc; kiểm file nguồn không thay đổi.'],
        partial=r'''lines = read_lines("data.txt")
palindromes = []
for text in lines:
    if is_palindrome(text):
        palindromes.append(text)
write_lines("palindromes.txt", palindromes)''',
        io=[('Fixture mẫu', 'File: "level\\nđộđ\\nradar\\n"'), ('File rỗng', 'File kết quả rỗng')],
        contracts=[C_READ, C_PAL, C_WRITE],
        data={'data.txt': 'level\npython\n\nđộđ\nradar'},
        starter=r'''def read_lines(path):
    pass

def is_palindrome(text):
    pass

def write_lines(path, lines):
    pass

# Tự viết phần điều phối đọc -> lọc -> ghi.
''',
        solution=EX1_SOLUTION,
        tests=[
            T('Checkpoint 1: read_lines', r"read_lines(_studio.write('c1.txt', ' a \n\nradar'))", [' a ', '', 'radar']),
            T('Checkpoint 2: is_palindrome', '[is_palindrome(x) for x in ["level", "", "Level", " a ", "độđ"]]',
              [True, False, False, True, True]),
            T('Checkpoint 3: write_lines', "(write_lines('c3.txt', ['a', 'b']), _studio.read('c3.txt'))", (None, 'a\nb\n')),
        ] + ex1_tests('Cả chương trình: '),
        bad=[('strip dữ liệu', EX1_SOLUTION.replace('line.rstrip("\\r\\n")', 'line.strip()'))],
    ),

    # ------------------------------------------------------------------ B20
    dict(
        code='B20', title='Ex1 tự làm', minutes=40, gate=True,
        goal='Tự giải Ex1 trên dữ liệu mới, không xem lời giải trước.',
        prereq='B19',
        brief='Tự viết chương trình đọc data.txt và ghi các dòng palindrome ra palindromes.txt, tối đa 3 hàm tự viết. Không có hàm mẫu cấp sẵn. ' + EX1_RULES,
        example='"a\\nab\\nradar" → palindromes.txt "a\\nradar\\n".',
        explain=[
            'Đầu vào: data.txt (UTF-8). Đầu ra: palindromes.txt, mỗi chuỗi hợp lệ một dòng.',
            'Bộ chấm dùng file mới chưa thấy: có Unicode, dòng rỗng, khoảng trắng, từ trùng, xuống dòng CRLF và dòng cuối không newline.',
            'Đây là cửa kiểm tra cơ bản: nộp lần đầu trước khi xem lời giải. Mở gợi ý thì được ghi nhận "có hỗ trợ".',
        ],
        predict=dict(q='Mô tả đường đi dữ liệu trước khi viết code — đường nào đúng?', options=[
            ('data.txt → list dòng → lọc từng dòng → ghi palindromes.txt', 'Đọc → lọc → ghi, file nguồn chỉ được đọc.', True),
            ('data.txt → ghi đè data.txt → lọc', 'Không bao giờ ghi vào file nguồn.', False),
            ('đọc → ghi → lọc', 'Phải lọc xong mới ghi kết quả.', False),
        ]),
        myth=('Năm cái bẫy của Ex1',
              'strip()/lower() làm đổi dữ liệu; set làm mất thứ tự và phần tử trùng; mode "a" cộng dồn kết quả cũ; '
              'line[:-1] cắt mất ký tự của dòng cuối không newline; quên loại chuỗi rỗng thì dòng trống lọt vào file.'),
        mcq=[
            dict(q='data.txt "Level\\nlevel\\n\\nđộđ\\n a \\nradar\\nradar\\nx" → palindromes.txt?', options=[
                ('"level\\nđộđ\\n a \\nradar\\nradar\\nx\\n"', 'Đủ mọi quy tắc: bỏ Level và dòng rỗng, giữ khoảng trắng, trùng và thứ tự.', True),
                ('"level\\nđộđ\\na\\nradar\\nx\\n"', 'Sai: strip " a " và bỏ trùng.', False),
                ('"Level\\nlevel\\nđộđ\\n a \\nradar\\nradar\\nx\\n"', 'Sai: "Level" không đối xứng khi phân biệt hoa/thường.', False),
            ]),
        ],
        why=dict(
            prompt='Giải thích đầu vào/đầu ra của từng hàm bạn viết và vì sao mọi dòng đều được xét.',
            sample='read_lines nhận path, trả list dòng đã bỏ CR/LF cuối. is_palindrome nhận một chuỗi, trả bool (rỗng là '
                   'False, phân biệt hoa/thường). write_lines nhận path và list, ghi đè file và trả None. Vòng lặp duyệt '
                   'đủ list từ read_lines nên mọi dòng đều được kiểm trước khi ghi.'),
        flow=['Đọc: data.txt → list dòng (chỉ bỏ CR/LF cuối).',
              'Lọc: giữ dòng không rỗng và bằng chuỗi đảo của nó.',
              'Ghi: mở palindromes.txt bằng "w", mỗi dòng hợp lệ + "\\n".'],
        transfer='Bộ chấm dùng fixture mới: Unicode, dòng rỗng, khoảng trắng, từ trùng, CRLF và dòng cuối không newline.',
        counter=dict(q='data.txt "ab\\r\\nx\\r\\n" (CRLF) → palindromes.txt?',
                     options=['"x\\n"', '"x\\r\\n"', '"ab\\nx\\n"'], correct='"x\\n"'),
        practice='Nộp bài lần đầu trước khi xem đáp án; chạy ca công khai để phát hiện lỗi.',
        steps=['Đọc file thành list, chỉ bỏ CR/LF cuối dòng.',
               'Kiểm từng chuỗi: bỏ rỗng, giữ hoa/thường, khoảng trắng, thứ tự và trùng.',
               'Ghi đè file kết quả, mỗi chuỗi một dòng; giữ file nguồn nguyên vẹn.'],
        partial=r'''lines = read_lines("data.txt")
palindromes = []
for text in lines:
    if is_palindrome(text):
        palindromes.append(text)
write_lines("palindromes.txt", palindromes)''',
        io=[('"a\\nab\\nradar"', 'File: "a\\nradar\\n"'), ('File rỗng', 'File kết quả rỗng')],
        data={'data.txt': 'a\nab\nradar'},
        starter=r'''# Không cấp hàm mẫu ở bài kiểm tra độc lập.
# Tự viết đọc -> lọc -> ghi, tối đa 3 hàm.
''',
        solution=EX1_SOLUTION,
        tests=ex1_tests(),
        bad=[('dùng set', EX1_SOLUTION.replace('for text in lines:', 'for text in set(lines):')),
             ('mode a', EX1_SOLUTION.replace('open(path, "w"', 'open(path, "a"')),
             ('cắt ký tự cuối', EX1_SOLUTION.replace('line.rstrip("\\r\\n")', 'line[:-1]'))],
    ),
]
