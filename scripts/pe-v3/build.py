#!/usr/bin/env python3
"""Dựng 40 bài PE Python v3 thành nội dung studio-lesson/v1 cho khoá `python`.

Nguồn duy nhất là bốn file soạn tay lessons_b1.py, lessons_b2.py, lessons_i.py,
lessons_n.py — chép từ PDF "PE_Python_v3_Toan_bo_40_bai_code.pdf" (30.09.2026)
và bổ sung phần Studio cần mà PDF không có (ví dụ minh hoạ ở S1, phương án
trắc nghiệm, mồi nhử ở khung lắp ghép). Không có gói JSON bàn giao, nên không
có bước chuyển đổi tự động nào như bộ v2.

Đầu ra (scripts/pe-v3/out/):
    lessons.json              gói để seed (scripts/seed-pe-v3.ts)
    lessons/<sort>-<mã>.json  từng bài, dễ đọc/diff
    curriculum-python.json    khối CURRICULA.python cho frontend/src/lib/curricula.json
    qa.json                   lời giải + biến thể sai, để check-pyodide.mjs chấm thử

Chạy:
    python scripts/pe-v3/build.py
    node scripts/pe-v3/check-pyodide.mjs        # bắt buộc trước khi seed
"""
from __future__ import annotations

import json
import random
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

import lessons_b1  # noqa: E402
import lessons_b2  # noqa: E402
import lessons_i  # noqa: E402
import lessons_n  # noqa: E402
from briefs import BRIEFS  # noqa: E402
from support import support_files  # noqa: E402

SCHEMA = 'studio-lesson/v1'
SOURCE_PDF = 'PE_Python_v3_Toan_bo_40_bai_code.pdf'

# (mã đầu, mã cuối, tên chặng, mức) — đúng "Roadmap 9 chặng" trang 2 của PDF.
MODULES = [
    ('B01', 'B05', 'Dữ liệu và điều kiện', 'Cơ bản'),
    ('B06', 'B10', 'Vòng lặp và hàm', 'Cơ bản'),
    ('B11', 'B15', 'Đọc và ghi file', 'Cơ bản'),
    ('B16', 'B20', 'Ghép bài Ex1', 'Cơ bản'),
    ('I01', 'I04', 'Class đầu tiên', 'Trung cấp'),
    ('I05', 'I08', 'Trạng thái và lớp cha (Ex2)', 'Trung cấp'),
    ('I09', 'I12', 'Kế thừa và override (Ex3)', 'Trung cấp'),
    ('N01', 'N04', 'Thread và chờ kết thúc (Ex4)', 'Nâng cao'),
    ('N05', 'N08', 'Process và đo thời gian (Ex5)', 'Nâng cao'),
]

# XP cấu hình trên backend (lessons.xp_reward). Cửa tự kiểm tra gấp đôi.
XP = {'Cơ bản': 10, 'Trung cấp': 15, 'Nâng cao': 20}

GATE_EXAM = {'B20': 'Ex1 · file/palindrome', 'I07': 'Ex2 · class', 'I12': 'Ex3 · kế thừa',
             'N04': 'Ex4 · thread', 'N08': 'Ex5 · process'}

HINT_TITLES = ('Nguyên lý', 'Cấu trúc', 'Lời giải từng phần')


def module_of(code: str):
    # Tên chặng theo Figma "00 · Tổng quan": "M1 · Dữ liệu và điều kiện".
    for i, (lo, hi, name, level) in enumerate(MODULES, start=1):
        if lo[0] == code[0] and lo <= code <= hi:
            return i, f'M{i} · {name}', level
    raise ValueError(f'{code} không thuộc chặng nào')


def brief_block(code: str, spec: dict, module_no: int, level: str) -> dict:
    """Màn mở đầu "một màn" theo Figma (xem briefs.py)."""
    brief = BRIEFS.get(code)
    check(brief is not None, code, 'thiếu màn mở đầu trong briefs.py')
    check(len(brief['tests']) == 2, code, 'màn mở đầu cần đúng 2 ca công khai như Figma')
    check(len(brief['code']) <= 7, code, 'khung code ở màn mở đầu tối đa 7 dòng')
    return {
        'eyebrow': [f'M{module_no}', f'BÀI TẬP {level.upper()}', code],
        'title': spec['title'],
        'goal': brief['goal'],
        'task': brief['task'],
        'predict': brief['predict'],
        'code': '\n'.join(brief['code']),
        'tests': brief['tests'],
        'reflect': brief['reflect'],
    }


class BuildError(Exception):
    pass


def check(cond, code, message):
    if not cond:
        raise BuildError(f'{code}: {message}')


def predict_block(code, spec):
    options = [{'id': chr(97 + i), 'title': t, 'detail': d, 'correct': bool(ok)}
               for i, (t, d, ok) in enumerate(spec['options'])]
    check(sum(o['correct'] for o in options) == 1, code, 'dự đoán phải có đúng một đáp án')
    block = {'question': spec['q'], 'options': options}
    if spec.get('code'):
        block['code'] = spec['code'].rstrip('\n')
    return block


def mcq_block(code, spec):
    options = [{'text': t, 'detail': d, 'correct': bool(ok)} for t, d, ok in spec['options']]
    right = [i for i, o in enumerate(options) if o['correct']]
    check(len(right) == 1, code, f'trắc nghiệm "{spec["q"]}" phải có đúng một đáp án')
    return {'question': spec['q'], 'options': options, 'correct': right[0],
            'explanation': options[right[0]]['detail']}


def scaffold_block(code, spec):
    template = spec['template']
    slots = spec['slots']
    marks = sorted(int(n) for n in re.findall(r'\{\{slot(\d+)\}\}', template))
    check(marks == list(range(1, len(slots) + 1)), code, f'khung lắp ghép có {marks} nhưng khai {len(slots)} slot')
    bank = [{'label': answer, 'slot': i} for i, answer in enumerate(slots, start=1)]
    bank += [{'label': label, 'slot': slot, 'trap': why} for label, slot, why in spec.get('traps', [])]
    labels = [b['label'] for b in bank]
    check(len(labels) == len(set(labels)), code, 'khối trong ngân hàng lắp ghép bị trùng nhãn')
    check(all('\n' not in b for b in labels), code, 'nhãn khối lắp ghép không được xuống dòng')
    # Trộn cố định theo mã bài để đáp án không luôn đứng đầu mà lần build sau vẫn y hệt.
    random.Random(code).shuffle(bank)
    return {
        'template': template,
        'slots': [{'n': i, 'placeholder': f'[Slot {i}]', 'answer': a} for i, a in enumerate(slots, start=1)],
        'bank': bank,
    }


def build_lesson(spec: dict, sort_order: int) -> tuple[dict, dict]:
    code = spec['code']
    module_no, module_title, level = module_of(code)
    gate = bool(spec.get('gate'))
    title = f"{code} · {spec['title']}"
    subtitle = f"{level} · M{module_no} · {spec['minutes']} phút"
    if gate:
        subtitle += f' · Cửa tự kiểm tra {GATE_EXAM[code]}'

    files = support_files(*spec.get('support', []))
    files += [{'name': name, 'content': content, 'kind': 'data'} for name, content in (spec.get('data') or {}).items()]

    # ---- S1: hiểu và dự đoán
    step1 = {
        'brief': brief_block(code, spec, module_no, level),
        'context': {
            'title': spec['goal'],
            'body': spec['brief'],
            'example': spec.get('example'),
            'prereq': spec.get('prereq'),
            'level': level,
            'files': [f['name'] for f in files] or None,
        },
        'predict': predict_block(code, spec['predict']),
        'misconception': {'title': spec['myth'][0], 'body': spec['myth'][1]},
        'explain': [{'n': i, 'body': text} for i, text in enumerate(spec['explain'], start=1)],
    }
    if spec.get('demo'):
        # kind 'demo': ví dụ dùng dữ liệu khác đề — Studio chỉ hiện ở màn giải thích.
        step1['code'] = {'filename': 'vi_du.py', 'version': 'Python 3.12',
                         'source': spec['demo'].rstrip('\n'), 'kind': 'demo'}

    # ---- S2: bẫy ngộ nhận
    step2 = {
        'mcq': [mcq_block(code, q) for q in spec['mcq']],
        'selfExplain': {
            'prompt': spec['why']['prompt'],
            'placeholder': 'Nối đầu vào → xử lý → đầu ra và nêu một ca biên của bài (ít nhất 12 từ).',
            'sample': spec['why']['sample'],
        },
    }
    check(step2['mcq'], code, 'cần ít nhất một câu trắc nghiệm (kho câu hỏi ôn tập đọc step_2.mcq)')

    # ---- S3: luyện có hỗ trợ
    counter = spec['counter']
    check(counter['correct'] in counter['options'], code, 'đáp án tái dự đoán không nằm trong các lựa chọn')
    step3 = {
        'task': {
            'title': 'Luyện có hỗ trợ' if not gate else 'Lập kế hoạch trước khi tự viết',
            'body': (spec.get('scaffold') or {}).get('intro') or 'Đi lại đường dữ liệu của bài trước khi tự viết code.',
            'rule': spec['transfer'],
        },
        'trace': {'steps': [{'label': f'Bước {i}', 'text': t} for i, t in enumerate(spec['flow'], start=1)]},
        'counter': {'question': counter['q'], 'options': counter['options'], 'correct': counter['correct']},
    }
    if spec.get('scaffold'):
        check(not gate, code, 'cửa tự kiểm tra không cấp khung lắp ghép')
        step3['scaffold'] = scaffold_block(code, spec['scaffold'])

    # ---- S4: sandbox
    tests = [{'name': name, 'call': call, 'expect': expect} for name, call, expect in spec['tests']]
    check(tests, code, 'thiếu ca chấm')
    check(spec['starter'] != spec['solution'], code, 'code khởi tạo trùng lời giải')
    task_body = spec['brief']
    if spec.get('practice'):
        task_body += '\n\nThực hành: ' + spec['practice']
    step4 = {
        'task': {
            'title': 'Cửa tự kiểm tra — tự viết, nộp lần đầu trước khi xem lời giải' if gate else 'Thử thách độc lập',
            'body': task_body,
            'io': [{'label': label, 'value': value} for label, value in spec['io']],
        },
        'starterCode': spec['starter'],
        'solutionCode': spec['solution'],
        'hints': [
            {'title': HINT_TITLES[0], 'body': spec['practice']},
            {'title': HINT_TITLES[1], 'body': '\n'.join(f'{i}. {s}' for i, s in enumerate(spec['steps'], start=1))},
            {'title': HINT_TITLES[2], 'body': spec['partial']},
        ],
        'tests': tests,
    }
    if files:
        step4['files'] = files
    if spec.get('contracts'):
        step4['contracts'] = spec['contracts']
    if gate:
        step4['gate'] = True
    if spec.get('env'):
        step4['env'] = spec['env']

    content = {
        'schema': SCHEMA,
        'title': title,
        'subtitle': subtitle,
        'source': {
            'kind': 'pe-v3',
            'filename': f'{SOURCE_PDF}#{code}',
            'parser': 'pe-v3/build',
            'importedAt': datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        },
        'step_1': step1,
        'step_2': step2,
        'step_3': step3,
        'step_4': step4,
    }
    xp = XP[level] * (2 if gate else 1)
    row = {
        'lesson_code': code,
        'sort_order': sort_order,
        'module': module_title,
        'title': title,
        'subtitle': subtitle,
        'estimated_minutes': spec['minutes'],
        'xp_reward': xp,
        'content_json': content,
    }

    bad = []
    for label, source in spec.get('bad', []):
        source = spec['starter'] if source is None else source
        check(source != spec['solution'], code, f'biến thể sai "{label}" trùng lời giải (replace không khớp?)')
        bad.append({'label': label, 'code': source})
    qa = {'code': code, 'solution': spec['solution'], 'starter': spec['starter'], 'bad': bad,
          'tests': tests, 'files': files}
    return row, qa


def strip_none(value):
    if isinstance(value, dict):
        return {k: strip_none(v) for k, v in value.items() if v is not None}
    if isinstance(value, list):
        return [strip_none(v) for v in value]
    return value


def main() -> int:
    specs = lessons_b1.LESSONS + lessons_b2.LESSONS + lessons_i.LESSONS + lessons_n.LESSONS
    codes = [s['code'] for s in specs]
    expected = [f'B{i:02d}' for i in range(1, 21)] + [f'I{i:02d}' for i in range(1, 13)] + [f'N{i:02d}' for i in range(1, 9)]
    if codes != expected:
        print('Thứ tự/mã bài không khớp roadmap v3:', codes, file=sys.stderr)
        return 1

    rows, qa = [], []
    try:
        for i, spec in enumerate(specs, start=1):
            row, check_row = build_lesson(spec, i)
            rows.append(strip_none(row))
            qa.append(check_row)
    except BuildError as err:
        print('LỖI:', err, file=sys.stderr)
        return 1

    out = HERE / 'out'
    (out / 'lessons').mkdir(parents=True, exist_ok=True)
    for old in (out / 'lessons').glob('*.json'):
        old.unlink()
    for row in rows:
        (out / 'lessons' / f"{row['sort_order']:03d}-{row['lesson_code']}.json").write_text(
            json.dumps(row, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    bundle = {'course_id': 'python', 'source': SOURCE_PDF, 'lessons': rows}
    (out / 'lessons.json').write_text(json.dumps(bundle, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    (out / 'qa.json').write_text(json.dumps(qa, ensure_ascii=False) + '\n', encoding='utf-8')

    modules = []
    for row in rows:
        if not modules or modules[-1]['title'] != row['module']:
            modules.append({'title': row['module'], 'lessons': []})
        modules[-1]['lessons'].append(row['title'])
    curriculum = {
        'requirements': [
            'Không cần kinh nghiệm lập trình trước — học lần lượt 9 chặng, từ biến tới process',
            'Trình duyệt có mạng để chạy Python (Pyodide) ngay trong bài; máy cài Python 3.12 để luyện thêm',
            'Chặng 9 (fork/process) cần Linux hoặc WSL khi nghiệm thu thật; trong bài có bản mô phỏng',
        ],
        'skills': [
            'Biến, chuỗi, điều kiện, vòng lặp và tự viết hàm có return',
            'Đọc/ghi file UTF-8 và giải Ex1: lọc palindrome từ data.txt ra palindromes.txt',
            'Class, constructor, __str__ và list riêng cho từng object (Ex2)',
            'Kế thừa, super() và override (Ex3)',
            'Thread: tạo n worker, start hết rồi join hết, kiểm dữ liệu n (Ex4)',
            'Process: fork m child, mỗi child n thread, chờ đủ và đo thời gian đúng (Ex5)',
        ],
        'modules': modules,
    }
    (out / 'curriculum-python.json').write_text(json.dumps(curriculum, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    tests = sum(len(r['content_json']['step_4']['tests']) for r in rows)
    bad = sum(len(q['bad']) for q in qa)
    print(f'✓ {len(rows)} bài, {len(modules)} chặng, {tests} ca chấm, {bad} biến thể sai để kiểm thử.')
    print(f'  Ghi vào {out}. Tiếp theo: node scripts/pe-v3/check-pyodide.mjs')
    return 0


if __name__ == '__main__':
    sys.exit(main())
