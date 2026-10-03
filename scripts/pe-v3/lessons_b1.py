"""PE Python v3 — Cơ bản, chặng M1–M2 (B01–B10). Nguồn: PDF trang 8–17, 48–57, 91–92."""
from authoring import T, TX, out, run

LESSONS = [
    # ------------------------------------------------------------------ B01
    dict(
        code='B01', title='Biến và kết quả', minutes=15,
        goal='Gán giá trị vào biến và in theo thứ tự.',
        prereq='Không cần bài trước.',
        brief='Gán name = "Python" và year = 1991, rồi in hai biến trên hai dòng. Không có input nhập tay.',
        example='Kết quả: Python rồi 1991 — mỗi giá trị một dòng.',
        demo=r'''city = "Hanoi"
founded = 1010
print(city)
print(founded)
''',
        explain=[
            'Dấu = gán giá trị cho tên biến: "Hanoi" là chuỗi (str), 1010 là số nguyên (int).',
            'print(city) đọc giá trị HIỆN TẠI của city rồi in ra; mỗi lệnh print kết thúc bằng một lần xuống dòng.',
            'Luồng dữ liệu: city giữ Hanoi → print(city) in Hanoi; founded giữ 1010 → print(founded) in 1010.',
        ],
        predict=dict(q='Nếu đổi year thành 2026 (không sửa lệnh print), dòng kết quả nào thay đổi?', options=[
            ('Chỉ dòng thứ hai', 'print(year) đọc giá trị mới 2026; dòng Python giữ nguyên.', True),
            ('Cả hai dòng', 'name không đổi nên dòng đầu vẫn là Python.', False),
            ('Không dòng nào — phải sửa cả print', 'print đọc giá trị hiện tại của biến, không giữ cố định số 1991.', False),
        ]),
        myth=('"print("name") cũng in ra giá trị của biến name"',
              'Có dấu nháy thì "name" là chuỗi chữ n-a-m-e, nên màn hình hiện đúng chữ name. Muốn đọc biến thì '
              'viết print(name), không có dấu nháy. Cũng đừng in sẵn cả đáp án như print("Python") — đổi dữ liệu là sai ngay.'),
        mcq=[
            dict(q='Với name = "C" và year = 1972, chương trình in gì?', options=[
                ('C rồi 1972, mỗi giá trị một dòng', 'Hai lệnh print, mỗi lệnh tự xuống dòng.', True),
                ('C 1972 trên cùng một dòng', 'Mỗi print kết thúc bằng xuống dòng nên có hai dòng.', False),
                ('name rồi year', 'Không có dấu nháy nên print đọc giá trị của biến.', False),
            ]),
            dict(q='Gán year = 0 thì dòng thứ hai in gì?', options=[
                ('0', 'Số 0 là giá trị bình thường; print in đúng 0 và vẫn đủ hai dòng.', True),
                ('Một dòng trống', 'print(0) in chữ số 0, không in dòng trống.', False),
                ('False', 'year là số nguyên 0, không phải bool.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao đổi giá trị biến làm kết quả đổi theo mà không phải sửa lệnh print?',
            sample='print không giữ sẵn chữ Python hay số 1991; mỗi lần chạy, print(year) đọc giá trị HIỆN TẠI của '
                   'biến year. Gán year = 2026 thì dòng thứ hai thành 2026, còn dòng đầu vẫn là Python vì name không đổi.'),
        scaffold=dict(
            intro='Dữ liệu mới: name = "C", year = 1972. Đặt hai lệnh in vào đúng chỗ — chọn lệnh ĐỌC BIẾN, đừng chọn lệnh in chữ cố định.',
            template=r'''name = "C"
year = 1972
{{slot1}}
{{slot2}}
''',
            slots=['print(name)', 'print(year)'],
            traps=[('print("name")', 1, 'In ra chữ name chứ không đọc biến.'),
                   ('print("C")', 1, 'Hard-code: đổi dữ liệu là sai.'),
                   ('print(1972)', 2, 'In số cố định, không đọc year.')]),
        flow=['name = "Python" → biến name giữ chuỗi Python.',
              'year = 1991 → biến year giữ số 1991.',
              'print(name) → dòng 1: Python.',
              'print(year) → dòng 2: 1991.'],
        transfer='Đổi name thành "C" và year thành 1972. Dự đoán hai dòng kết quả trước khi chạy.',
        counter=dict(q='Đổi thành name = "C", year = 1972 thì kết quả là gì?',
                     options=['Python rồi 1991', 'C rồi 1972', 'name rồi year'], correct='C rồi 1972'),
        practice='Gán hai biến rồi dùng HAI lệnh print riêng, mỗi lệnh in một biến.',
        steps=['Dòng 1–2: gán name = "Python", year = 1991.',
               'Dòng 3–4: print(name) rồi print(year) — không đặt dấu nháy quanh tên biến.'],
        partial=r'''name = "Python"
year = 1991
print(name)
# còn một lệnh in nữa''',
        io=[('Mặc định', r'Python\n1991\n'), ('Đổi year = 2026', r'Python\n2026\n')],
        starter=r'''# Tự gán name, year và in trên hai dòng.
''',
        solution=r'''name = "Python"
year = 1991
print(name)
print(year)
''',
        tests=[
            T('Mặc định: Python rồi 1991', run() + '.stdout', out('Python', 1991)),
            T('Đổi year = 2026 thì dòng 2 đổi theo', run(vars={'year': 2026}) + '.stdout', out('Python', 2026)),
            T('Dữ liệu mới: C / 1972', run(vars={'name': 'C', 'year': 1972}) + '.stdout', out('C', 1972)),
            T('year = 0 vẫn in đủ hai dòng', run(vars={'year': 0}) + '.stdout', out('Python', 0)),
        ],
        bad=[('in chữ cố định', 'print("Python")\nprint(1991)\n'),
             ('in tên biến', 'name = "Python"\nyear = 1991\nprint("name")\nprint("year")\n')],
    ),

    # ------------------------------------------------------------------ B02
    dict(
        code='B02', title='Ghép chuỗi', minutes=15,
        goal='Tạo thông báo từ phần cố định và một biến chuỗi.',
        prereq='B01',
        brief='Cho name = "Python". Tạo message = "Language: Python" bằng phép nối chuỗi rồi in message.',
        example='name = "Python" → message = "Language: Python".',
        demo=r'''city = "Hue"
greeting = "Hello, " + city
print(greeting)
''',
        explain=[
            'Dấu + giữa hai chuỗi ghép chúng theo thứ tự trái sang phải: "Hello, " + "Hue" → "Hello, Hue".',
            'Dấu cách sau dấu phẩy nằm TRONG chuỗi "Hello, " nên là một phần của dữ liệu.',
            'greeting nhận chuỗi mới; print(greeting) in chuỗi đó.',
        ],
        predict=dict(q='Nếu name = "C", message sẽ là gì?', options=[
            ('"Language: C"', 'Phần cố định giữ nguyên, phần sau lấy giá trị mới của name.', True),
            ('"Language: Python"', 'message được ghép lại từ name mới mỗi lần chạy.', False),
            ('"Language:C"', 'Dấu cách nằm trong "Language: " nên vẫn còn.', False),
        ]),
        myth=('"Viết thẳng message = "Language: Python" cho nhanh"',
              'Câu cố định chỉ đúng với đúng một dữ liệu: đổi name = "C" vẫn in Language: Python. Ghép "Language: " + name '
              'mới dùng được cho mọi tên. Lưu ý: bài này name là str; cộng chuỗi với số (như "Year: " + 1991) báo TypeError.'),
        mcq=[
            dict(q='name = "" (chuỗi rỗng) thì message là gì?', options=[
                ('"Language: " — vẫn còn dấu cách ở cuối', 'Ghép với chuỗi rỗng không bỏ ký tự nào của phần cố định.', True),
                ('"Language:"', 'Dấu cách thuộc phần cố định nên không mất.', False),
                ('Báo lỗi vì name rỗng', 'Chuỗi rỗng vẫn là str hợp lệ để ghép.', False),
            ]),
            dict(q='Biểu thức nào gây TypeError?', options=[
                ('"Year: " + 1991', 'Không cộng được str với int.', True),
                ('"Year: " + "1991"', 'Hai chuỗi ghép bình thường thành "Year: 1991".', False),
                ('"Language: " + name, với name = "C"', 'Cả hai đều là chuỗi.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao không nên viết message = "Language: Python" cố định?',
            sample='Câu cố định không phản ánh name mới. Ghép "Language: " + name thì mỗi lần chạy message lấy giá trị '
                   'hiện tại của name: name = "C" cho Language: C, name = "Rust" cho Language: Rust. Một dòng code dùng được cho nhiều dữ liệu.'),
        scaffold=dict(
            intro='Dữ liệu mới: name = "Rust". Lắp phép ghép và lệnh in.',
            template=r'''name = "Rust"
message = {{slot1}}
{{slot2}}
''',
            slots=['"Language: " + name', 'print(message)'],
            traps=[('"Language: Rust"', 1, 'Hard-code cả câu.'),
                   ('"Language:" + name', 1, 'Mất dấu cách sau dấu hai chấm.'),
                   ('print("message")', 2, 'In ra chữ message.')]),
        flow=['name = "Python".',
              '"Language: " + name → "Language: " + "Python" → "Language: Python".',
              'message giữ chuỗi mới.',
              'print(message) → Language: Python.'],
        transfer='Thay name bằng chuỗi rỗng "". Kiểm xem dấu cách sau dấu hai chấm còn được giữ không.',
        counter=dict(q='name = "Rust" thì chương trình in gì?',
                     options=['Language: Rust', 'Language: Python', 'Language:Rust'], correct='Language: Rust'),
        practice='Tạo message bằng "Language: " + name, rồi in message.',
        steps=['Phần cố định "Language: " có một dấu cách ở cuối.',
               'Ghép với name bằng dấu +, lưu vào message, rồi print(message).'],
        partial=r'''message = "Language: " + ...''',
        io=[('name = "Python"', 'Language: Python'), ('name = "C"', 'Language: C')],
        starter=r'''name = "Python"
# Tự tạo message bằng phép nối chuỗi và in.
''',
        solution=r'''name = "Python"
message = "Language: " + name
print(message)
''',
        tests=[
            T('name = "Python"', run() + '.stdout', out('Language: Python')),
            T('name = "C" — không hard-code cả câu', run(vars={'name': 'C'}) + '.stdout', out('Language: C')),
            T('name rỗng vẫn giữ dấu cách cuối', run(vars={'name': ''}) + ".var('message')", 'Language: '),
            T('name = "Rust"', run(vars={'name': 'Rust'}) + '.stdout', out('Language: Rust')),
        ],
        bad=[('hard-code', 'name = "Python"\nmessage = "Language: Python"\nprint(message)\n'),
             ('mất dấu cách', 'name = "Python"\nmessage = "Language:" + name\nprint(message)\n')],
    ),

    # ------------------------------------------------------------------ B03
    dict(
        code='B03', title='Đảo chuỗi', minutes=15,
        goal='Đảo một chuỗi bằng slicing.',
        prereq='B02',
        brief='Cho text = "python". Tạo reversed_text bằng slicing rồi in kết quả.',
        example='text = "python" → reversed_text = "nohtyp".',
        demo=r'''word = "stressed"
backwards = word[::-1]
print(backwards)
print(word)
''',
        explain=[
            'Slicing có dạng [start:stop:step]. Bỏ trống start và stop là lấy cả chuỗi; step = -1 là đi từ cuối về đầu.',
            'word[::-1] tạo một chuỗi MỚI "desserts"; word vẫn giữ "stressed".',
            'Luồng dữ liệu: s t r e s s e d → đọc từ cuối về đầu → d e s s e r t s.',
        ],
        predict=dict(q='Đảo "level" và "a" cho kết quả gì?', options=[
            ('"level" và "a"', 'Hai chuỗi này đọc xuôi hay ngược đều giống nhau.', True),
            ('"level" và chuỗi rỗng', 'Một ký tự đảo lại vẫn là chính nó.', False),
            ('"levle" và "a"', 'Đọc ngược từng ký tự l-e-v-e-l vẫn ra level.', False),
        ]),
        myth=('"text[-1] là đảo chuỗi"',
              'text[-1] chỉ lấy MỘT ký tự cuối ("n" của python). Muốn đảo cả chuỗi phải có hai dấu hai chấm: text[::-1].'),
        mcq=[
            dict(q='Sau reversed_text = text[::-1] với text = "python", text bằng gì?', options=[
                ('"python" — text không đổi', 'Slicing tạo chuỗi mới; chuỗi trong Python không bị sửa tại chỗ.', True),
                ('"nohtyp"', 'Chỉ reversed_text nhận chuỗi đảo.', False),
                ('Chuỗi rỗng', 'Không lệnh nào xoá text.', False),
            ]),
            dict(q='text = "" (chuỗi rỗng) thì text[::-1] là gì?', options=[
                ('Chuỗi rỗng ""', 'Không có ký tự nào để đảo; kết quả vẫn rỗng, không lỗi.', True),
                ('Báo IndexError', 'Slicing không báo lỗi với chuỗi rỗng.', False),
                ('None', 'Slicing luôn trả về str.', False),
            ]),
        ],
        why=dict(
            prompt='Sau phép đảo, text có bị đổi thành "nohtyp" không? Vì sao?',
            sample='Không. text[::-1] tạo một chuỗi mới rồi gán vào reversed_text; text vẫn giữ "python" vì chuỗi '
                   'không bị sửa tại chỗ. Chuỗi rỗng đảo vẫn ra chuỗi rỗng vì không có ký tự nào để đảo.'),
        scaffold=dict(
            intro='Dữ liệu mới: text = "ab". Chọn đúng phép đảo cả chuỗi.',
            template=r'''text = "ab"
{{slot1}}
print(reversed_text)
''',
            slots=['reversed_text = text[::-1]'],
            traps=[('reversed_text = text[-1]', 1, 'Chỉ lấy ký tự cuối.'),
                   ('reversed_text = text[::1]', 1, 'step = 1 là đi xuôi, không đảo.'),
                   ('text = text[::-1]', 1, 'Ghi đè text, còn reversed_text chưa có.')]),
        flow=['text = "python".',
              'text[::-1] đi từ "n" về "p" → "nohtyp".',
              'reversed_text giữ "nohtyp"; text vẫn là "python".',
              'print(reversed_text) → nohtyp.'],
        transfer='Thử text = "ab" và text = "" (chuỗi rỗng); giải thích vì sao chuỗi rỗng vẫn đảo được.',
        counter=dict(q='text = "ab" thì chương trình in gì?', options=['ab', 'ba', 'b'], correct='ba'),
        practice='Dùng text[::-1] và lưu vào biến có tên rõ ràng (reversed_text).',
        steps=['Slicing [::-1] đọc chuỗi từ cuối về đầu.',
               'Lưu kết quả vào reversed_text rồi print(reversed_text).'],
        partial=r'''reversed_text = text[...]''',
        io=[('text = "python"', 'nohtyp'), ('text = "a"', 'a')],
        starter=r'''text = "python"
# Tự tạo reversed_text và in.
''',
        solution=r'''text = "python"
reversed_text = text[::-1]
print(reversed_text)
''',
        tests=[
            T('text = "python" → nohtyp', run() + '.stdout', out('nohtyp')),
            T('text = "a" → a', run(vars={'text': 'a'}) + '.stdout', out('a')),
            T('text = "ab" → ba', run(vars={'text': 'ab'}) + '.stdout', out('ba')),
            T('Chuỗi rỗng đảo vẫn rỗng', run(vars={'text': ''}) + ".var('reversed_text')", ''),
            T('text giữ nguyên sau phép đảo', run() + ".var('text')", 'python'),
        ],
        bad=[('lấy ký tự cuối', 'text = "python"\nreversed_text = text[-1]\nprint(reversed_text)\n'),
             ('hard-code', 'text = "python"\nreversed_text = "nohtyp"\nprint(reversed_text)\n')],
    ),

    # ------------------------------------------------------------------ B04
    dict(
        code='B04', title='So sánh palindrome', minutes=15,
        goal='So sánh chuỗi gốc và chuỗi đảo để tạo giá trị bool.',
        prereq='B03',
        brief='Cho text (không rỗng) và reversed_text = text[::-1] đã cấp. Tạo result bằng phép so sánh text với reversed_text rồi in result.',
        example='text = "level" → result = True; text = "abc" → result = False.',
        demo=r'''word = "noon"
backwards = word[::-1]
same = word == backwards
print(same)
''',
        explain=[
            '== hỏi "hai giá trị có bằng nhau không?" và trả về bool: True hoặc False. Một dấu = là gán, hai dấu == là so sánh.',
            'So sánh chuỗi phân biệt hoa/thường: "Noon" khác "nooN".',
            'Luồng dữ liệu: noon → đảo được noon → bằng nhau → same = True.',
        ],
        predict=dict(q='"Level" có giống chuỗi đảo của chính nó không?', options=[
            ('Không — đảo ra "leveL", chữ L hoa đổi chỗ', 'So sánh phân biệt hoa/thường nên kết quả là False.', True),
            ('Có — vì "level" là palindrome', 'Bài này KHÔNG đổi chữ thường; "Level" khác "leveL".', False),
            ('Báo lỗi vì có chữ hoa', 'So sánh chuỗi không bao giờ lỗi vì chữ hoa.', False),
        ]),
        myth=('"Phải viết if/else mới có True/False"',
              'Bản thân phép so sánh đã là một giá trị bool: result = text == reversed_text gán thẳng True/False. '
              'Và đừng tự đổi chữ thường bằng lower() — đề yêu cầu giữ nguyên hoa/thường.'),
        mcq=[
            dict(q='text = "a" thì result là gì?', options=[
                ('True', 'Một ký tự đảo lại vẫn là chính nó.', True),
                ('False', '"a" == "a" là đúng.', False),
                ('Báo lỗi', 'Chuỗi một ký tự đảo bình thường.', False),
            ]),
            dict(q='Khác nhau giữa = và == là gì?', options=[
                ('= gán giá trị cho biến; == so sánh và trả bool', 'result = text == reversed_text dùng cả hai.', True),
                ('Hai dấu giống nhau', 'text = reversed_text là gán, không trả True/False.', False),
                ('== là gán hai lần', '== không gán gì cả.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao "Level" khác "level" trong phép kiểm tra này?',
            sample='Đảo "Level" được "leveL": chữ L hoa chuyển từ đầu xuống cuối. So sánh chuỗi phân biệt hoa/thường '
                   'nên "Level" == "leveL" là False. Bài giữ nguyên dữ liệu, không tự chuyển sang chữ thường.'),
        scaffold=dict(
            intro='Dữ liệu mới: text = "abc". Chọn phép tạo result.',
            template=r'''text = "abc"
reversed_text = text[::-1]
{{slot1}}
print(result)
''',
            slots=['result = text == reversed_text'],
            traps=[('result = text = reversed_text', 1, 'Dấu = là gán, không so sánh.'),
                   ('result = text.lower() == reversed_text.lower()', 1, 'Tự đổi chữ thường làm sai hợp đồng của bài.'),
                   ('result = "True"', 1, 'Chuỗi "True" không phải kết quả so sánh.')]),
        flow=['text = "level"; reversed_text = "level".',
              'text == reversed_text → True.',
              'result giữ True.',
              'print(result) → True.'],
        transfer='Thử "abc" và "Level"; viết chuỗi đảo ra giấy trước khi chạy.',
        counter=dict(q='text = "abc" thì chương trình in gì?', options=['True', 'False', 'cba'], correct='False'),
        practice='So sánh text với reversed_text bằng ==, không đổi hoa/thường.',
        steps=['== trả bool True/False.', 'Gán kết quả so sánh vào result rồi print(result).'],
        partial=r'''result = text == ...''',
        io=[('text = "level"', 'True'), ('text = "abc"', 'False')],
        starter=r'''text = "level"
reversed_text = text[::-1]
# Tự tạo result bằng phép so sánh và in.
''',
        solution=r'''text = "level"
reversed_text = text[::-1]
result = text == reversed_text
print(result)
''',
        tests=[
            T('text = "level" → True', run() + '.stdout', out(True)),
            T('text = "abc" → False', run(vars={'text': 'abc'}) + '.stdout', out(False)),
            T('"Level" → False (giữ hoa/thường)', run(vars={'text': 'Level'}) + '.stdout', out(False)),
            T('text = "a" → True', run(vars={'text': 'a'}) + '.stdout', out(True)),
            TX('result là bool', 'type(' + run() + ".var('result')).__name__", "'bool'"),
        ],
        bad=[('đổi chữ thường', 'text = "level"\nreversed_text = text[::-1]\nresult = text.lower() == reversed_text.lower()\nprint(result)\n'),
             ('hard-code', 'text = "level"\nreversed_text = text[::-1]\nresult = True\nprint(result)\n')],
    ),

    # ------------------------------------------------------------------ B05
    dict(
        code='B05', title='if và else', minutes=15,
        goal='Chọn đúng một thông báo bằng if/else.',
        prereq='B04',
        brief='Cho biến result (True hoặc False). In PALINDROME nếu result là True, ngược lại in NOT PALINDROME — dùng if/else.',
        example='result = True → PALINDROME; result = False → NOT PALINDROME.',
        demo=r'''is_open = False
if is_open:
    print("OPEN")
else:
    print("CLOSED")
''',
        explain=[
            'if kiểm tra is_open: True thì chạy khối thụt vào dưới if; False thì chạy khối dưới else.',
            'Dấu : mở một khối lệnh; thụt vào 4 dấu cách để Python biết lệnh nào thuộc nhánh nào.',
            'Mỗi lần chạy CHỈ một nhánh chạy: is_open = False → bỏ nhánh if → in CLOSED.',
        ],
        predict=dict(q='Với result = False, nhánh nào được thực hiện?', options=[
            ('Nhánh else — in NOT PALINDROME', 'Điều kiện sai nên bỏ qua khối if.', True),
            ('Nhánh if', 'Khối if chỉ chạy khi result là True.', False),
            ('Cả hai nhánh', 'if/else luôn chọn đúng MỘT nhánh.', False),
        ]),
        myth=('"Đặt hai print ra ngoài if/else cũng được"',
              'Lệnh không thụt vào thì không thuộc nhánh nào: cả hai print đều chạy và chương trình in hai dòng bất kể '
              'result. Sai thụt lề còn có thể gây IndentationError hoặc làm lệnh chạy ngoài nhánh.'),
        mcq=[
            dict(q='Nếu đổi nhầm hai thông báo (nhánh if in NOT PALINDROME), chương trình sẽ…', options=[
                ('Vẫn chạy nhưng in sai thông báo — sai bài', 'Python không hiểu ý nghĩa thông báo; lỗi logic không báo lỗi.', True),
                ('Báo SyntaxError', 'Cú pháp vẫn đúng.', False),
                ('Tự in đúng', 'Máy chỉ làm đúng điều được viết.', False),
            ]),
            dict(q='Chương trình đúng in bao nhiêu dòng mỗi lần chạy?', options=[
                ('Đúng 1 dòng', 'Chỉ một nhánh chạy.', True),
                ('2 dòng', 'Đó là khi cả hai print nằm ngoài if/else.', False),
                ('Tuỳ result mà 0 hoặc 2', 'Luôn có đúng một nhánh.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao không đặt hai print ở ngoài if/else?',
            sample='Lệnh ở ngoài nhánh thì luôn chạy, nên cả PALINDROME lẫn NOT PALINDROME đều được in — không còn lựa '
                   'chọn theo result. Đặt mỗi print trong đúng nhánh thì mỗi lần chạy chỉ in một dòng phù hợp với result.'),
        scaffold=dict(
            intro='Đặt mỗi thông báo vào đúng nhánh.',
            template=r'''result = False
if result:
    {{slot1}}
else:
    {{slot2}}
''',
            slots=['print("PALINDROME")', 'print("NOT PALINDROME")'],
            traps=[('print(result)', 1, 'In True/False chứ không in thông báo.')]),
        flow=['result = True → điều kiện đúng → chạy nhánh if → in PALINDROME.',
              'result = False → bỏ nhánh if → chạy else → in NOT PALINDROME.'],
        transfer='Chạy lần lượt result = True và result = False. Thử đổi nhầm hai thông báo rồi giải thích vì sao chương trình vẫn chạy nhưng sai bài.',
        counter=dict(q='result = False thì chương trình in gì?',
                     options=['Một dòng: NOT PALINDROME', 'Hai dòng: PALINDROME rồi NOT PALINDROME', 'Không in gì'],
                     correct='Một dòng: NOT PALINDROME'),
        practice='Chạy lần lượt result = True và result = False; mỗi lần phải in đúng một dòng.',
        steps=['if result: → nhánh True in PALINDROME.', 'else: → nhánh False in NOT PALINDROME. Thụt vào 4 dấu cách.'],
        partial=r'''if result:
    print("PALINDROME")
else:
    ...''',
        io=[('result = True', 'PALINDROME (một dòng)'), ('result = False', 'NOT PALINDROME (một dòng)')],
        starter=r'''result = True
# Tự viết if/else và hai thông báo.
''',
        solution=r'''result = True

if result:
    print("PALINDROME")
else:
    print("NOT PALINDROME")
''',
        tests=[
            T('result = True → PALINDROME', run() + '.stdout', out('PALINDROME')),
            T('result = False → NOT PALINDROME', run(vars={'result': False}) + '.stdout', out('NOT PALINDROME')),
        ],
        bad=[('print ngoài nhánh', 'result = True\nprint("PALINDROME")\nprint("NOT PALINDROME")\n'),
             ('đảo thông báo', 'result = True\nif result:\n    print("NOT PALINDROME")\nelse:\n    print("PALINDROME")\n')],
    ),

    # ------------------------------------------------------------------ B06
    dict(
        code='B06', title='Duyệt danh sách', minutes=15,
        goal='Duyệt list và xử lý từng phần tử bằng for.',
        prereq='B05',
        brief='Cho words = ["level", "python", "radar"]. Dùng for để in từng phần tử, mỗi phần tử một dòng.',
        example='Ba dòng theo đúng thứ tự: level, python, radar.',
        demo=r'''colors = ["red", "green"]
for color in colors:
    print(color)
print("done")
''',
        explain=[
            'List dùng [] và giữ các phần tử theo thứ tự.',
            'Mỗi lượt for, color nhận phần tử tiếp theo; khối thụt vào chạy một lần cho mỗi phần tử.',
            'print("done") không thụt vào nên chạy MỘT lần sau khi vòng lặp kết thúc.',
        ],
        predict=dict(q='List rỗng [] làm vòng lặp chạy bao nhiêu lần?', options=[
            ('0 lần', 'Không có phần tử nào để gán cho biến lặp.', True),
            ('1 lần', 'Vòng for chạy đúng bằng số phần tử.', False),
            ('Báo lỗi', 'Duyệt list rỗng là hợp lệ.', False),
        ]),
        myth=('"print(words) cũng in từng từ"',
              "print(words) in biểu diễn của cả list trên MỘT dòng: ['level', 'python', 'radar']. Đề cần mỗi từ một dòng nên phải duyệt bằng for."),
        mcq=[
            dict(q='words = ["radar", "radar"] thì in mấy dòng?', options=[
                ('2 dòng radar', 'for duyệt đủ mọi phần tử, kể cả phần tử trùng.', True),
                ('1 dòng radar', 'for không tự bỏ trùng.', False),
                ('Không in gì', 'List có hai phần tử nên thân vòng lặp chạy hai lần.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao list rỗng không in gì?',
            sample='Vòng for lấy lần lượt từng phần tử của list. List rỗng không có phần tử nào để gán cho word, nên '
                   'thân vòng lặp không chạy lần nào và không có output. Đó không phải lỗi.'),
        scaffold=dict(
            intro='Dữ liệu mới: words = ["a", "ab"]. Lắp vòng lặp và lệnh in.',
            template=r'''words = ["a", "ab"]
{{slot1}}
    {{slot2}}
''',
            slots=['for word in words:', 'print(word)'],
            traps=[('for word in "words":', 1, 'Duyệt từng ký tự của chuỗi "words".'),
                   ('print(words)', 2, 'In cả list mỗi lượt.')]),
        flow=['Lượt 1: word = "level" → in level.',
              'Lượt 2: word = "python" → in python.',
              'Lượt 3: word = "radar" → in radar; hết phần tử, vòng lặp dừng.'],
        transfer='Thử words = [] và words = ["radar", "radar"]; đếm số dòng in ra.',
        counter=dict(q='words = ["a"] thì chương trình in gì?', options=['a', "['a']", 'Không in gì'], correct='a'),
        practice='In từng từ trong vòng for, không in nguyên list.',
        steps=['for word in words: — mỗi lượt word là một phần tử.', 'Thân vòng lặp: print(word), thụt vào 4 dấu cách.'],
        partial=r'''for word in words:
    ...''',
        io=[('List mẫu', r'level\npython\nradar\n'), ('[]', 'Không có output.')],
        starter=r'''words = ["level", "python", "radar"]
# Tự viết for để in từng word.
''',
        solution=r'''words = ["level", "python", "radar"]
for word in words:
    print(word)
''',
        tests=[
            T('List mẫu: ba dòng đúng thứ tự', run() + '.stdout', out('level', 'python', 'radar')),
            T('List rỗng: không có output', run(vars={'words': []}) + '.stdout', ''),
            T('Phần tử trùng vẫn in hai dòng', run(vars={'words': ['radar', 'radar']}) + '.stdout', out('radar', 'radar')),
            T('["a"] → một dòng a', run(vars={'words': ['a']}) + '.stdout', out('a')),
        ],
        bad=[('in cả list', 'words = ["level", "python", "radar"]\nprint(words)\n')],
    ),

    # ------------------------------------------------------------------ B07
    dict(
        code='B07', title='Lọc bằng vòng lặp', minutes=20,
        goal='Tích luỹ kết quả lọc bằng list mới và append.',
        prereq='B06',
        brief='Cho words = ["level", "python", "radar", ""] và palindromes = []. Dùng for/if/append để giữ các từ đối xứng KHÔNG rỗng, rồi in palindromes. Chưa dùng hàm tự định nghĩa.',
        example='["level", "python", "radar", ""] → ["level", "radar"].',
        demo=r'''numbers = [4, 7, 10]
evens = []
for number in numbers:
    if number % 2 == 0:
        evens.append(number)
print(evens)
''',
        explain=[
            'evens = [] tạo nơi giữ kết quả, đặt TRƯỚC vòng lặp.',
            'Mỗi lượt, if quyết định giữ hay bỏ; append thêm phần tử vào CUỐI evens.',
            'Duyệt numbers nhưng chỉ sửa evens — list đầu vào giữ nguyên. Kết quả [4, 10].',
        ],
        predict=dict(q='Nếu "level" xuất hiện hai lần trong words, kết quả cần giữ mấy lần?', options=[
            ('Hai lần — giữ cả phần tử trùng', 'Mỗi lần gặp từ hợp lệ là append một lần; không dùng set.', True),
            ('Một lần', 'Bài không yêu cầu bỏ trùng; set còn làm mất thứ tự.', False),
            ('Không lần nào', 'level là từ đối xứng hợp lệ.', False),
        ]),
        myth=('"Xoá từ sai khỏi words cho gọn"',
              'Không sửa list đầu vào, nhất là trong lúc đang duyệt nó — dễ bỏ sót phần tử. Tạo list kết quả mới rồi append. '
              'Ở lần đầu học cũng chưa dùng comprehension: viết vòng lặp rõ từng bước.'),
        mcq=[
            dict(q='words = ["", "Level"] thì palindromes là gì?', options=[
                ('[]', 'Chuỗi rỗng bị bỏ; "Level" đảo thành "leveL" nên không bằng.', True),
                ('["Level"]', 'So sánh phân biệt hoa/thường.', False),
                ('[""]', 'Chuỗi rỗng bị loại trước bước so sánh.', False),
            ]),
            dict(q='words = ["a", "ab", "a"] thì palindromes là gì?', options=[
                ('["a", "a"]', 'Giữ thứ tự và phần tử trùng.', True),
                ('["a"]', 'Không bỏ trùng.', False),
                ('["a", "ab", "a"]', '"ab" đảo thành "ba", khác nhau.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao kết quả giữ thứ tự và cả phần tử trùng?',
            sample='Vòng lặp đi theo thứ tự của words, mỗi lần gặp từ hợp lệ thì append đúng một lần vào cuối palindromes. '
                   'Không dùng set nên không bỏ trùng, không xáo thứ tự. words không bị sửa vì chỉ palindromes được append.'),
        scaffold=dict(
            intro='Dữ liệu mới: ["a", "ab", "a"]. Lắp điều kiện so sánh và lệnh thêm vào kết quả.',
            template=r'''words = ["a", "ab", "a"]
palindromes = []
for word in words:
    if word != "":
        reversed_word = word[::-1]
        if {{slot1}}:
            {{slot2}}
print(palindromes)
''',
            slots=['word == reversed_word', 'palindromes.append(word)'],
            traps=[('word = reversed_word', 1, 'Gán chứ không so sánh.'),
                   ('words.append(word)', 2, 'Sửa list đầu vào.'),
                   ('palindromes = [word]', 2, 'Ghi đè, mất các từ trước.')]),
        flow=['palindromes = [].',
              'level → hợp lệ → [level].',
              'python → đảo thành nohtyp, khác → giữ nguyên list.',
              'radar → [level, radar].',
              '"" → rỗng, bỏ qua.'],
        transfer='Thử ["a", "ab", "a"] và []; kiểm list đầu vào không đổi.',
        counter=dict(q='words = ["a", "ab", "a"] cho kết quả nào?',
                     options=["['a', 'a']", "['a']", "['a', 'ab', 'a']"], correct="['a', 'a']"),
        practice='Bỏ chuỗi rỗng trước, rồi dùng phép đảo và so sánh đã học để quyết định append.',
        steps=['palindromes = [] đã có; mỗi lượt kiểm word != "".',
               'reversed_word = word[::-1]; nếu word == reversed_word thì palindromes.append(word).'],
        partial=r'''for word in words:
    if word != "":
        reversed_word = word[::-1]
        ...''',
        io=[('List mẫu', '["level", "radar"]'), ('[]', '[]')],
        starter=r'''words = ["level", "python", "radar", ""]
palindromes = []
# Tự duyệt, kiểm tra và append.
''',
        solution=r'''words = ["level", "python", "radar", ""]
palindromes = []

for word in words:
    if word != "":
        reversed_word = word[::-1]
        if word == reversed_word:
            palindromes.append(word)

print(palindromes)
''',
        tests=[
            T('List mẫu → ["level", "radar"]', run() + ".var('palindromes')", ['level', 'radar']),
            T('List rỗng → []', run(vars={'words': []}) + ".var('palindromes')", []),
            T('Giữ thứ tự và phần tử trùng', run(vars={'words': ['a', 'ab', 'a']}) + ".var('palindromes')", ['a', 'a']),
            T('Bỏ chuỗi rỗng, giữ hoa/thường', run(vars={'words': ['', 'Level']}) + ".var('palindromes')", []),
            T('Không sửa words', run() + ".var('words')", ['level', 'python', 'radar', '']),
        ],
        bad=[('giữ chuỗi rỗng', 'words = ["level", "python", "radar", ""]\npalindromes = []\nfor word in words:\n    if word == word[::-1]:\n        palindromes.append(word)\nprint(palindromes)\n'),
             ('bỏ trùng bằng set', 'words = ["level", "python", "radar", ""]\npalindromes = []\nfor word in set(words):\n    if word != "" and word == word[::-1]:\n        palindromes.append(word)\nprint(palindromes)\n')],
    ),

    # ------------------------------------------------------------------ B08
    dict(
        code='B08', title='Tự viết một hàm', minutes=20,
        goal='Tự định nghĩa hàm đầu tiên và nhận kết quả bằng return.',
        prereq='B07',
        brief='Viết is_empty(text) trả True nếu text là chuỗi rỗng, ngược lại trả False. Hàm không print; gọi thử ở ngoài, lưu vào result rồi in.',
        example='is_empty("") → True; is_empty(" ") → False.',
        demo=r'''def is_short(text):
    if len(text) < 3:
        return True
    else:
        return False

result = is_short("ab")
print(result)
''',
        explain=[
            'def đặt tên hàm; text là THAM SỐ nhận giá trị khi gọi. Định nghĩa hàm chưa chạy thân hàm.',
            'return đưa giá trị về NƠI GỌI và kết thúc lần gọi đó.',
            'is_short("ab") → text = "ab" → độ dài 2 < 3 → return True → result = True → print in True.',
        ],
        predict=dict(q='Một dấu cách " " có phải chuỗi rỗng không?', options=[
            ('Không — nó có 1 ký tự', 'Chuỗi rỗng là "" (0 ký tự); " " chứa một dấu cách.', True),
            ('Có', 'Dấu cách là một ký tự thật.', False),
            ('Tuỳ máy', 'Kết quả luôn giống nhau.', False),
        ]),
        myth=('"print(True) trong hàm cũng là trả kết quả"',
              'print chỉ hiện chữ lên màn hình. Hàm không có return mang giá trị thì trả None — result = is_empty("") sẽ '
              'là None. Hàm kiểm tra phải return; việc in để nơi gọi làm. pass chỉ giữ chỗ trong khung, không phải lời giải.'),
        mcq=[
            dict(q='Nếu thay return True bằng print(True), result = is_empty("") nhận gì?', options=[
                ('None', 'Hàm không gặp return mang giá trị nên trả None.', True),
                ('True', 'print không đưa giá trị về nơi gọi.', False),
                ('"True"', 'print không trả về chuỗi.', False),
            ]),
            dict(q='is_empty("\\n") trả gì?', options=[
                ('False — ký tự xuống dòng vẫn là một ký tự', '"\\n" có độ dài 1.', True),
                ('True', 'Chỉ "" mới rỗng.', False),
                ('None', 'Hàm đúng luôn trả bool.', False),
            ]),
        ],
        why=dict(
            prompt='Nếu thay return True bằng print(True), result nhận gì? Vì sao?',
            sample='result nhận None. print chỉ in True ra màn hình như một tác dụng phụ; hàm không gặp return mang giá '
                   'trị nên Python tự trả None. Nơi gọi cần giá trị bool để dùng tiếp, nên hàm phải return True/False.'),
        scaffold=dict(
            intro='Lắp điều kiện và giá trị trả về.',
            template=r'''def is_empty(text):
    if {{slot1}}:
        {{slot2}}
    else:
        return False
''',
            slots=['text == ""', 'return True'],
            traps=[('text == " "', 1, 'Dấu cách không phải chuỗi rỗng.'),
                   ('print(True)', 2, 'In chứ không trả về — hàm sẽ trả None.'),
                   ('pass', 2, 'Chỉ giữ chỗ, không làm gì.')]),
        flow=['is_empty("") → text = "".',
              'text == "" đúng → return True.',
              'result = True → print(result) in True.'],
        transfer='Thử is_empty("a") và is_empty(" "); lưu kết quả vào result rồi in ở nơi gọi.',
        counter=dict(q='is_empty("a") trả gì?', options=['True', 'False', 'None'], correct='False'),
        practice='Viết if/else rõ ràng để trả bool, không print bên trong hàm.',
        steps=['if text == "": return True', 'else: return False — rồi gọi thử result = is_empty("") và print(result) ở ngoài hàm.'],
        partial=r'''def is_empty(text):
    if text == "":
        return True
    ...''',
        io=[('is_empty("")', 'True'), ('is_empty(" ")', 'False')],
        contracts=[dict(sig='is_empty(text)', does='Kiểm tra chuỗi rỗng.', takes='text: str',
                        gives='bool — True nếu text == "", ngược lại False', effect='Không in, không đổi dữ liệu ngoài.',
                        call='is_empty(" ") → False')],
        starter=r'''def is_empty(text):
    pass

# Gọi thử hàm ở đây.
''',
        solution=r'''def is_empty(text):
    if text == "":
        return True
    else:
        return False

result = is_empty("")
print(result)
''',
        tests=[
            T('is_empty("") → True', 'is_empty("")', True),
            T('is_empty(" ") → False', 'is_empty(" ")', False),
            T('is_empty("a") → False', 'is_empty("a")', False),
            T('is_empty("\\n") → False', r'is_empty("\n")', False),
            T('Hàm không print', '_studio.stdout(is_empty, "")', ''),
            T('Trả về bool', 'type(is_empty("x")).__name__', 'bool'),
        ],
        bad=[('print thay return', 'def is_empty(text):\n    if text == "":\n        print(True)\n    else:\n        print(False)\n'),
             ('strip quá tay', 'def is_empty(text):\n    return text.strip() == ""\n')],
    ),

    # ------------------------------------------------------------------ B09
    dict(
        code='B09', title='Hàm kiểm tra chuỗi', minutes=20,
        goal='Tự viết một hàm kiểm tra palindrome.',
        prereq='B08',
        brief='Viết is_palindrome(text): chuỗi rỗng trả False; còn lại so text với chuỗi đảo của nó. Không strip, không đổi hoa/thường, không print.',
        example='is_palindrome("level") → True; is_palindrome("python") → False.',
        demo=r'''def is_mirror(code):
    if code == "":
        return False
    flipped = code[::-1]
    return code == flipped

print(is_mirror("1221"))
print(is_mirror(""))
''',
        explain=[
            'Nhánh đầu xử lý trường hợp đặc biệt trước: rỗng → return False ngay, các dòng sau không chạy.',
            'flipped giữ chuỗi đảo; return code == flipped trả thẳng kết quả so sánh (bool).',
            '"1221" → "1221" → True; "" → False ngay từ nhánh đầu.',
        ],
        predict=dict(q='Dự đoán is_palindrome("a") và is_palindrome("").', options=[
            ('True và False', '"a" đảo vẫn là "a"; chuỗi rỗng bị loại theo quy tắc của khoá.', True),
            ('True và True', 'Rỗng bằng chuỗi đảo của nó, nhưng quy tắc bài nói rỗng trả False.', False),
            ('False và False', 'Một ký tự là palindrome hợp lệ.', False),
        ]),
        myth=('"Thêm strip() và lower() cho chắc"',
              'Làm vậy là đổi hợp đồng của bài: " a " phải được xét nguyên (đảo vẫn là " a " → True), còn "Level" phải là False. '
              'Hàm kiểm tra không in, không ghi file, không sửa dữ liệu đầu vào.'),
        mcq=[
            dict(q='is_palindrome(" a ") trả gì?', options=[
                ('True — dấu cách hai bên đối xứng nhau', 'Không strip nên " a " đảo vẫn là " a ".', True),
                ('False', 'Dấu cách là ký tự bình thường, vẫn đối xứng.', False),
                ('Báo lỗi', 'Chuỗi có dấu cách vẫn so sánh được.', False),
            ]),
            dict(q='is_palindrome("độđ") trả gì?', options=[
                ('True', 'Ký tự có dấu cũng được đảo đúng thứ tự.', True),
                ('False', 'đ-ộ-đ đọc ngược vẫn là đ-ộ-đ.', False),
                ('Lỗi vì có dấu tiếng Việt', 'Chuỗi Python là Unicode.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao chuỗi rỗng trả False dù nó bằng chuỗi đảo của chính nó?',
            sample='Quy tắc của khoá định nghĩa palindrome phải KHÔNG rỗng. Nhánh if text == "" chạy trước phép so sánh '
                   'và return False ngay. Nếu bỏ nhánh này thì "" == "" là True — sai quy tắc.'),
        scaffold=dict(
            intro='Lắp nhánh xử lý rỗng và lệnh trả kết quả.',
            template=r'''def is_palindrome(text):
    if {{slot1}}:
        return False
    reversed_text = text[::-1]
    {{slot2}}
''',
            slots=['text == ""', 'return text == reversed_text'],
            traps=[('text.strip() == ""', 1, 'Loại cả chuỗi chỉ có dấu cách.'),
                   ('print(text == reversed_text)', 2, 'In thay vì trả về.'),
                   ('return text.lower() == reversed_text.lower()', 2, 'Đổi hoa/thường.')]),
        flow=['"python" → không rỗng → đảo "nohtyp" → khác → False.',
              '"level" → đảo "level" → True.',
              '"" → False ngay, không tới bước đảo.'],
        transfer='Thử "radar", "Level" và " a ". Không strip, không đổi hoa/thường.',
        counter=dict(q='is_palindrome("Level") trả gì?', options=['True', 'False', 'Báo lỗi'], correct='False'),
        practice='Xử lý chuỗi rỗng trước; lưu chuỗi đảo rồi return phép so sánh.',
        steps=['Nhánh đầu: if text == "": return False.', 'reversed_text = text[::-1]; return text == reversed_text.'],
        partial=r'''def is_palindrome(text):
    if text == "":
        return False
    ...''',
        io=[('"level"', 'True'), ('""', 'False')],
        contracts=[dict(sig='is_palindrome(text)', does='Kiểm tra chuỗi đối xứng và không rỗng.',
                        takes='text: str — giữ nguyên hoa/thường và khoảng trắng', gives='bool',
                        effect='Không in, không ghi file, không sửa dữ liệu đầu vào.', call='is_palindrome("level") → True')],
        starter=r'''def is_palindrome(text):
    pass
''',
        solution=r'''def is_palindrome(text):
    if text == "":
        return False

    reversed_text = text[::-1]
    return text == reversed_text

result = is_palindrome("level")
print(result)
''',
        tests=[
            T('"level" → True', 'is_palindrome("level")', True),
            T('"" → False', 'is_palindrome("")', False),
            T('"ab" → False', 'is_palindrome("ab")', False),
            T('"Level" → False (giữ hoa/thường)', 'is_palindrome("Level")', False),
            T('" a " → True (không strip)', 'is_palindrome(" a ")', True),
            T('"độđ" → True', 'is_palindrome("độđ")', True),
            T('Hàm không print', '_studio.stdout(is_palindrome, "level")', ''),
        ],
        bad=[('quên nhánh rỗng', 'def is_palindrome(text):\n    return text == text[::-1]\n'),
             ('đổi chữ thường', 'def is_palindrome(text):\n    if text == "":\n        return False\n    return text.lower() == text[::-1].lower()\n')],
    ),

    # ------------------------------------------------------------------ B10
    dict(
        code='B10', title='Nối hai hàm', minutes=20,
        goal='Nối hàm kiểm tra với hàm lọc list.',
        prereq='B09',
        brief='is_palindrome (B09) đã cấp. Tự viết filter_palindromes(words): duyệt từng word, gọi is_palindrome(word), append từ hợp lệ, cuối cùng return list kết quả.',
        example='filter_palindromes(["level", "ab", "radar", ""]) → ["level", "radar"].',
        demo=r'''def is_even(number):
    return number % 2 == 0

def keep_even(numbers):
    result = []
    for number in numbers:
        if is_even(number):
            result.append(number)
    return result

print(keep_even([3, 4, 10]))
''',
        explain=[
            'keep_even tạo list kết quả RIÊNG; mỗi lượt gọi is_even với MỘT số.',
            'return result nằm SAU vòng for (thụt ngang hàng for) để xét đủ mọi phần tử, kể cả khi list rỗng.',
            '3 → False → bỏ; 4 → True → thêm; 10 → True → thêm → [4, 10].',
        ],
        predict=dict(q='is_palindrome cần nhận cả list hay từng word?', options=[
            ('Từng word — mỗi lần một chuỗi', 'Hàm kiểm tra nhận str; vòng lặp đưa từng phần tử vào.', True),
            ('Cả list words', 'Đảo list rồi so sánh list không phải là kiểm tra từng từ.', False),
            ('Tên file', 'Bài này chưa đọc file.', False),
        ]),
        myth=('"Đặt return trong for cho gọn"',
              'return kết thúc hàm ngay ở lượt đầu tiên: chỉ xét được phần tử đầu. Với list rỗng, vòng lặp không chạy nên '
              'return trong for không bao giờ tới — hàm trả None.'),
        mcq=[
            dict(q='filter_palindromes(["radar", "ab", "radar"]) trả gì?', options=[
                ('["radar", "radar"]', 'Giữ thứ tự và phần tử trùng.', True),
                ('["radar"]', 'Không bỏ trùng.', False),
                ('["radar", "ab", "radar"]', '"ab" không đối xứng.', False),
            ]),
            dict(q='filter_palindromes(["Level", "", "a"]) trả gì?', options=[
                ('["a"]', '"Level" khác "leveL", chuỗi rỗng bị loại.', True),
                ('["Level", "a"]', 'Giữ nguyên hoa/thường.', False),
                ('["", "a"]', 'Chuỗi rỗng không phải palindrome theo quy tắc.', False),
            ]),
        ],
        why=dict(
            prompt='Vì sao return phải đặt sau vòng for?',
            sample='return kết thúc hàm. Đặt trong for thì hàm dừng ở phần tử đầu tiên; với list rỗng vòng lặp không chạy '
                   'nên không gặp return và hàm trả None. Đặt sau for thì mọi phần tử đều được xét và list rỗng trả [].'),
        scaffold=dict(
            intro='Lắp lời gọi hàm kiểm tra và lệnh trả kết quả (dòng cuối thụt ngang hàng với for).',
            template=r'''def filter_palindromes(words):
    palindromes = []
    for word in words:
        if {{slot1}}:
            palindromes.append(word)
    {{slot2}}
''',
            slots=['is_palindrome(word)', 'return palindromes'],
            traps=[('is_palindrome(words)', 1, 'Đưa cả list vào hàm kiểm một chuỗi.'),
                   ('print(palindromes)', 2, 'Hàm sẽ trả None.'),
                   ('return word', 2, 'Chỉ trả từ cuối cùng.')]),
        flow=['level → is_palindrome True → thêm.',
              'ab → False → bỏ.',
              'radar → True → thêm.',
              '"" → False → bỏ.',
              'Hết for → return ["level", "radar"].'],
        transfer='Thử [] và ["radar", "ab", "radar"]; kiểm words giữ nguyên.',
        counter=dict(q='filter_palindromes([]) trả gì?', options=['[]', 'None', 'Báo lỗi'], correct='[]'),
        practice='Dùng for, gọi is_palindrome(word), append phần tử hợp lệ; return sau vòng lặp.',
        steps=['palindromes = [] trong hàm; for word in words: if is_palindrome(word): append.',
               'return palindromes nằm sau for, thụt 4 dấu cách.'],
        partial=r'''def filter_palindromes(words):
    palindromes = []
    for word in words:
        ...
    return palindromes''',
        io=[('List mẫu', '["level", "radar"]'), ('[]', '[]')],
        contracts=[
            dict(sig='is_palindrome(text)', does='Kiểm tra chuỗi đối xứng và không rỗng (đã cấp).', takes='text: str',
                 gives='bool', effect='Không in, không sửa dữ liệu.', call='is_palindrome("level") → True'),
            dict(sig='filter_palindromes(words)', does='Lọc chuỗi bằng is_palindrome, giữ thứ tự và trùng lặp.',
                 takes='words: list[str]', gives='list[str] mới; list rỗng khi không có kết quả',
                 effect='Không in, không sửa words.', call='filter_palindromes(["radar", "ab"]) → ["radar"]'),
        ],
        starter=r'''def is_palindrome(text):
    if text == "":
        return False

    reversed_text = text[::-1]
    return text == reversed_text

def filter_palindromes(words):
    pass
''',
        solution=r'''def is_palindrome(text):
    if text == "":
        return False

    reversed_text = text[::-1]
    return text == reversed_text

def filter_palindromes(words):
    palindromes = []
    for word in words:
        if is_palindrome(word):
            palindromes.append(word)
    return palindromes

words = ["level", "ab", "radar", ""]
result = filter_palindromes(words)
print(result)
''',
        tests=[
            T('List mẫu → ["level", "radar"]', 'filter_palindromes(["level", "ab", "radar", ""])', ['level', 'radar']),
            T('List rỗng → []', 'filter_palindromes([])', []),
            T('Giữ trùng: ["radar", "ab", "radar"]', 'filter_palindromes(["radar", "ab", "radar"])', ['radar', 'radar']),
            T('["Level", "", "a"] → ["a"]', 'filter_palindromes(["Level", "", "a"])', ['a']),
            TX('Không sửa words, trả list mới',
               "_studio.check('w = [\"a\", \"ab\"]\\nr = filter_palindromes(w)\\nassert w == [\"a\", \"ab\"], \"words bị sửa\"\\nassert r is not w, \"phải trả list MỚI\"')",
               'True'),
            T('Hàm không print', '_studio.stdout(filter_palindromes, ["level"])', ''),
        ],
        bad=[('return trong for', 'def is_palindrome(text):\n    if text == "":\n        return False\n    return text == text[::-1]\n\ndef filter_palindromes(words):\n    palindromes = []\n    for word in words:\n        if is_palindrome(word):\n            palindromes.append(word)\n        return palindromes\n')],
    ),
]
