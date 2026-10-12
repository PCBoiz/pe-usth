#!/usr/bin/env python3
"""Dựng 48 bài khoá Python Advanced (pe-v4) thành nội dung studio-lesson/v1.

Cùng khuôn với scripts/pe-v3/build.py (bản đó giữ nguyên cho khoá cũ) nhưng:

* Danh sách chặng là DANH SÁCH MÃ tường minh, không còn "chặng theo chữ cái
  đầu": mã mới có PD01 và P01, so theo chữ đầu thì PD lọt vào chặng P.
* Nội dung nằm ở MỌI file scripts/pe-v4/lessons_*.py (mỗi tác giả một file):
  mỗi file khai LESSONS, BRIEFS và (tuỳ chọn) SUPPORT = {tên file: nội dung}.
  Bản dựng đầy đủ đòi đủ 48 mã; thiếu là lỗi.
* Cửa tự kiểm tra (Boss) lấy từ chính dict bài (`gate=True`, `exam='…'`), không
  còn bảng mã cứng như GATE_EXAM của pe-v3.
* Bài M1–M3 có thể khai thêm `theory=[...]` (3–5 khối nền: định nghĩa, ví dụ,
  ứng dụng, đọc sơ đồ), `figure=dict(name=…, caption=…, alt=…)` và `slides='SL 15-16'`
  — xem CONTRACT-THEORY.md. Chúng đổ vào content_json.step_1.theory / .figure và
  content_json.source.slides. Hình SVG nằm ở frontend/public/static/anim/<name>.svg;
  thiếu file chỉ là CẢNH BÁO (tác giả nội dung không phải chờ agent vẽ hình), trừ khi
  chạy với --strict.
* Bài có thể khai `packages=[...]` (numpy, pandas, matplotlib, sqlite3); build còn tự dò `import` trong lời giải. Trình duyệt chỉ tải các
  thư viện này cho bài cần — bài khác không chậm thêm.
* CHẤM THỬ NGAY LÚC DỰNG: lời giải phải đạt mọi ca, code khởi tạo và mỗi biến
  thể sai phải trượt ít nhất một ca — chạy bằng CHÍNH bộ chấm của trình duyệt
  (studio-harness.py) dưới CPython (harness_cpython.py), nên subprocess,
  multiprocessing, tkinter… đi qua cùng bản mô phỏng học viên gặp. Pyodide
  thật vẫn là trọng tài cuối: node scripts/pe-v4/check-pyodide.mjs.

Chạy:
    py scripts/pe-v4/build.py --only P01,P02     # tác giả: kiểm vài bài, KHÔNG ghi out/
    py scripts/pe-v4/build.py --partial          # dựng các bài đang có, ghi out/ (thiếu bài = cảnh báo)
    py scripts/pe-v4/build.py                    # bản đầy đủ 48 bài -> out/
    thêm --no-run để bỏ bước chấm thử, --jobs 3 để chấm song song nhiều hơn.

Đầu ra (scripts/pe-v4/out/):
    lessons.json              gói 48 bài (build_advanced.py đọc để sinh mini-game)
    lessons/<sort>-<mã>.json  từng bài, dễ đọc/diff
    curriculum-python-advanced-v1.json  giáo trình theo chặng
    qa.json                   lời giải + biến thể sai, để check-pyodide.mjs chấm thử
"""
from __future__ import annotations

import argparse
import ast
import importlib.util
import json
import os
import random
import re
import subprocess
import sys
import tempfile
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
HARNESS = ROOT / 'frontend' / 'public' / 'static' / 'js' / 'studio-harness.py'
DRIVER = HERE / 'harness_cpython.py'
sys.path.insert(0, str(HERE))

import glossary  # noqa: E402

SCHEMA = 'studio-lesson/v1'
SOURCE = 'python-learning-data.json'
# Ngày của chính tài liệu nguồn, KHÔNG phải lúc chạy lệnh — để dựng lại ra đúng
# từng byte (xem chú thích SOURCE_DATE ở pe-v3/build.py).
SOURCE_DATE = '2026-10-12T00:00:00+00:00'

# (tên chặng, mức, mã bài theo thứ tự) — thứ tự ở đây LÀ thứ tự học.
MODULES = [
    ('Tiến trình và subprocess', 'Trung cấp', ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07']),
    ('Đa luồng', 'Nâng cao', ['T01', 'T02', 'T03', 'T04', 'T05', 'T06']),
    ('GUI Tkinter và dự án', 'Nâng cao', ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'R02']),
    ('Nhập dữ liệu, SQL và tra cứu', 'Trung cấp', ['X01', 'X02', 'X03', 'X04', 'X05']),
    ('NumPy', 'Trung cấp', ['N01', 'N02', 'N03', 'N04', 'N05', 'N06']),
    ('pandas', 'Nâng cao', ['PD01', 'PD02', 'PD03', 'PD04', 'PD05', 'PD06', 'PD07', 'PD08', 'PD09']),
    ('Matplotlib', 'Nâng cao', ['M01', 'M02', 'M03', 'M04', 'M05', 'M06']),
    ('Dự án DA', 'Nâng cao', ['DA01', 'DA02']),
]
ORDER = [code for _, _, codes in MODULES for code in codes]
MODULE_OF = {code: (i, name, level) for i, (name, level, codes) in enumerate(MODULES, start=1) for code in codes}

# XP cấu hình trên backend (lessons.xp_reward). Cửa tự kiểm tra (Boss) gấp đôi.
XP = {'Cơ bản': 10, 'Trung cấp': 15, 'Nâng cao': 20}
HINT_TITLES = ('Nguyên lý', 'Cấu trúc', 'Lời giải từng phần')

# Thư viện trình duyệt tải được (tự lưu trữ trong frontend/public/pyodide/v0.27.7/).
# Khoá = tên gói khai trong bài; giá trị = tên module khi `import`.
# openpyxl KHÔNG có trong pyodide-lock.json của 0.27.7 nên không được khai.
PACKAGES = {'numpy': 'numpy', 'pandas': 'pandas', 'matplotlib': 'matplotlib', 'sqlite3': 'sqlite3'}
IMPORT_TO_PACKAGE = {mod: pkg for pkg, mod in PACKAGES.items()}

MIN_TESTS = 5
MIN_BAD = 2

# ---- LÝ THUYẾT + HÌNH (M1–M3, xem CONTRACT-THEORY.md)
# Hai khoá mới của dict bài: `theory` (3–5 khối nền) và `figure` (hình chính).
# Giới hạn độ dài KHÔNG phải tuỳ hứng: màn `theory` của frontend là một thẻ, chữ
# dài hơn mức này thì thẻ tràn và học viên bỏ qua. Bài M4–M8 không khai gì thì
# build giữ nguyên như trước.
THEORY_MIN_BLOCKS = 3
THEORY_MAX_BLOCKS = 5
THEORY_H_MAX = 40
THEORY_BODY_MAX = 400
THEORY_BULLETS_MAX = 5
THEORY_BULLET_MAX = 160
FIGURE_CAPTION_MAX = 90
FIGURE_ALT_MAX = 200
ANIM_DIR = ROOT / 'frontend' / 'public' / 'static' / 'anim'
ANIM_URL = '/static/anim'
# Tên hình thành tên file nên chỉ cho chữ/số/._- (không '/', không '..').
FIGURE_NAME_RE = re.compile(r'[A-Za-z0-9][\w.-]*')


class BuildError(Exception):
    pass


def check(cond, code, message):
    if not cond:
        raise BuildError(f'{code}: {message}')


# ---------------------------------------------------------------- nạp nội dung

def load_sources(strict: bool):
    """Gộp LESSONS/BRIEFS/SUPPORT của mọi lessons_*.py. Trả (specs, briefs, support, cảnh báo)."""
    specs, briefs, support, origin, warnings = {}, {}, {}, {}, []
    for path in sorted(HERE.glob('lessons_*.py')) + EXTRA_FILES:
        name = path.stem
        try:
            spec = importlib.util.spec_from_file_location(name, path)
            module = importlib.util.module_from_spec(spec)
            sys.modules[name] = module
            spec.loader.exec_module(module)
        except Exception:
            message = f'{path.name}: không nạp được\n' + traceback.format_exc(limit=3)
            if strict:
                raise BuildError(message)
            warnings.append(message)
            continue
        for lesson in getattr(module, 'LESSONS', []):
            code = lesson.get('code')
            if code in specs:
                raise BuildError(f'{code}: khai hai lần ({origin[code]} và {path.name})')
            if code not in MODULE_OF:
                raise BuildError(f'{code} ({path.name}): mã không có trong giáo trình 48 bài (MODULES của build.py)')
            specs[code] = lesson
            origin[code] = path.name
        for code, brief in (getattr(module, 'BRIEFS', None) or {}).items():
            if code in briefs:
                raise BuildError(f'{code}: màn mở đầu khai hai lần (BRIEFS)')
            briefs[code] = brief
        for fname, content in (getattr(module, 'SUPPORT', None) or {}).items():
            if fname in support and support[fname] != content:
                raise BuildError(f'file cấp sẵn {fname} khai hai nội dung khác nhau ({path.name})')
            support[fname] = content
    return specs, briefs, support, origin, warnings


EXTRA_FILES: list[Path] = []


def register_extra(path: Path):
    """--extra: bài thử của hạ tầng (vd. scratch smoke) — mã lạ vào chặng "Thử", cuối khoá."""
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    codes = [l['code'] for l in getattr(module, 'LESSONS', []) if l['code'] not in MODULE_OF]
    if codes:
        MODULES.append(('Thử nghiệm hạ tầng', 'Nâng cao', codes))
        ORDER.extend(codes)
        for code in codes:
            MODULE_OF[code] = (len(MODULES), 'Thử nghiệm hạ tầng', 'Nâng cao')
    EXTRA_FILES.append(path.resolve())


# ---------------------------------------------------------------- từng khối

def brief_block(code, spec, briefs, module_no, level):
    """Màn mở đầu "một màn" (cùng mẫu Figma của pe-v3, xem pe-v3/briefs.py)."""
    brief = briefs.get(code)
    check(brief is not None, code, 'thiếu màn mở đầu trong BRIEFS')
    check(len(brief.get('tests', [])) == 2, code, 'màn mở đầu cần đúng 2 ca công khai như Figma')
    check(len(brief.get('code', [])) <= 7, code, 'khung code ở màn mở đầu tối đa 7 dòng')
    for key in ('goal', 'task', 'predict', 'reflect'):
        check(brief.get(key), code, f'màn mở đầu thiếu {key}')
    return {
        'eyebrow': [f'M{module_no}', 'BOSS' if spec.get('gate') else f'BÀI TẬP {level.upper()}', code],
        'title': spec['title'],
        'goal': brief['goal'],
        'task': brief['task'],
        'predict': brief['predict'],
        'code': '\n'.join(brief['code']),
        'tests': brief['tests'],
        'reflect': brief['reflect'],
    }


def predict_block(code, spec):
    options = [{'id': '', 'title': t, 'detail': d, 'correct': bool(ok)} for t, d, ok in spec['options']]
    check(sum(o['correct'] for o in options) == 1, code, 'dự đoán phải có đúng một đáp án')
    # Trộn cố định theo mã bài: đáp án đúng không luôn đứng đầu (xem pe-v3/build.py).
    random.Random(f'{code}-predict').shuffle(options)
    for i, option in enumerate(options):
        option['id'] = chr(97 + i)
    block = {'question': spec['q'], 'options': options}
    if spec.get('code'):
        block['code'] = spec['code'].rstrip('\n')
    return block


def mcq_block(code, spec):
    options = [{'text': t, 'detail': d, 'correct': bool(ok)} for t, d, ok in spec['options']]
    right = [i for i, o in enumerate(options) if o['correct']]
    check(len(right) == 1, code, f'trắc nghiệm "{spec["q"]}" phải có đúng một đáp án')
    random.Random(f'{code}-mcq-{spec["q"]}').shuffle(options)
    # `correct` là CHỈ SỐ nên tính lại sau khi trộn (quizzes.service.ts đọc step_2.mcq).
    answer = next(i for i, o in enumerate(options) if o['correct'])
    return {'question': spec['q'], 'options': options, 'correct': answer, 'explanation': options[answer]['detail']}


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
    random.Random(code).shuffle(bank)
    return {
        'template': template,
        'slots': [{'n': i, 'placeholder': f'[Slot {i}]', 'answer': a} for i, a in enumerate(slots, start=1)],
        'bank': bank,
    }


def detect_packages(*sources: str) -> set[str]:
    """Thư viện ngoài được `import` trong code (bỏ qua code không parse được)."""
    found = set()
    for source in sources:
        try:
            tree = ast.parse(source or '')
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            names = []
            if isinstance(node, ast.Import):
                names = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
                names = [node.module]
            for name in names:
                top = name.split('.')[0]
                if top in IMPORT_TO_PACKAGE:
                    found.add(IMPORT_TO_PACKAGE[top])
    return found


def uses_excel(source: str) -> str | None:
    """Lời giải THẬT SỰ gọi Excel (không tính chuỗi "pd.read_excel" trong bảng tra)."""
    try:
        tree = ast.parse(source or '')
    except SyntaxError:
        return None
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and                 node.func.attr in ('read_excel', 'to_excel', 'ExcelWriter', 'ExcelFile'):
            return node.func.attr
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = [a.name for a in node.names] if isinstance(node, ast.Import) else [node.module or '']
            for name in names:
                if name.split('.')[0] in ('openpyxl', 'xlsxwriter'):
                    return name
    return None


def lesson_files(code, spec, support):
    files = []
    for name in spec.get('support', []) or []:
        check(name in support, code, f'support={name!r} nhưng không file lessons_*.py nào khai SUPPORT[{name!r}]')
        files.append({'name': name, 'content': support[name], 'kind': 'module' if name.endswith('.py') else 'data'})
    for name, content in (spec.get('data') or {}).items():
        files.append({'name': name, 'content': content, 'kind': 'data'})
    for f in files:
        check(re.fullmatch(r'[\w.-]+', f['name']), code, f'tên file {f["name"]!r} phải là tên trơn (chữ, số, . _ -)')
    return files


def figure_block(code, raw, warnings, strict_figures):
    """Chuẩn hoá dict `figure` của bài thành {name, src, caption, alt}.

    File SVG do agent vẽ hình sinh ra sau, nên THIẾU FILE chỉ là cảnh báo: tác giả
    nội dung không bị chặn vì hình chưa vẽ xong. `--strict` (dùng trước khi deploy)
    biến nó thành lỗi để không đẩy lên bài có <img> hỏng.
    """
    check(isinstance(raw, dict), code, 'figure phải là dict(name=…, caption=…, alt=…)')
    name = str(raw.get('name') or '')
    check(FIGURE_NAME_RE.fullmatch(name), code,
          f'figure.name={name!r} phải là tên trơn (chữ, số, . _ -) vì nó thành tên file SVG')
    caption = str(raw.get('caption') or '')
    alt = str(raw.get('alt') or '')
    check(caption, code, 'figure.caption trống — chú thích in dưới hình trong sổ tay')
    check(len(caption) <= FIGURE_CAPTION_MAX, code,
          f'figure.caption dài {len(caption)} ký tự, tối đa {FIGURE_CAPTION_MAX}')
    check(alt, code, 'figure.alt trống — người dùng trình đọc màn hình sẽ không biết hình vẽ gì')
    check(len(alt) <= FIGURE_ALT_MAX, code, f'figure.alt dài {len(alt)} ký tự, tối đa {FIGURE_ALT_MAX}')
    unknown = set(raw) - {'name', 'caption', 'alt'}
    check(not unknown, code, f'figure có khoá lạ {sorted(unknown)}; chỉ dùng name/caption/alt')
    if not (ANIM_DIR / f'{name}.svg').exists():
        message = f'{code}: chưa có hình frontend/public/static/anim/{name}.svg'
        if strict_figures:
            raise BuildError(message + ' (--strict)')
        warnings.append(message)
    return {'name': name, 'src': f'{ANIM_URL}/{name}.svg', 'caption': caption, 'alt': alt}


def theory_blocks(code, spec, warnings, strict_figures):
    """(danh sách khối lý thuyết, hình chính) — cả hai là None nếu bài không khai.

    Khối lý thuyết là phần NỀN (khái niệm, hình, ứng dụng), khác `explain` là đọc
    từng dòng code; frontend hiện nó thành một màn riêng chèn ngay sau màn mở đầu.
    """
    raw_theory = spec.get('theory')
    raw_figure = spec.get('figure')
    if not raw_theory:
        check(not raw_figure, code, 'khai figure nhưng không có theory — hình không có chỗ nào hiện')
        return None, None

    check(isinstance(raw_theory, (list, tuple)), code, 'theory phải là list các dict(h=…, body=…, bullets=[…])')
    check(THEORY_MIN_BLOCKS <= len(raw_theory) <= THEORY_MAX_BLOCKS, code,
          f'theory có {len(raw_theory)} khối, phải {THEORY_MIN_BLOCKS}–{THEORY_MAX_BLOCKS}')
    check(raw_figure is not None, code, 'có theory thì phải khai figure (một khối phải giải thích hình)')
    figure = figure_block(code, raw_figure, warnings, strict_figures)

    blocks, with_figure = [], []
    for i, raw in enumerate(raw_theory, start=1):
        at = f'theory[{i}]'
        check(isinstance(raw, dict), code, f'{at} phải là dict')
        unknown = set(raw) - {'h', 'body', 'bullets', 'figure'}
        check(not unknown, code, f'{at} có khoá lạ {sorted(unknown)}; chỉ dùng h/body/bullets/figure')
        h = str(raw.get('h') or '').strip()
        check(h, code, f'{at} thiếu tiêu đề h')
        check(len(h) <= THEORY_H_MAX, code, f'{at}.h dài {len(h)} ký tự, tối đa {THEORY_H_MAX}')
        body = raw.get('body')
        if body is not None:
            body = str(body).strip()
            check(len(body) <= THEORY_BODY_MAX, code,
                  f'{at}.body dài {len(body)} ký tự, tối đa {THEORY_BODY_MAX}')
        bullets = raw.get('bullets')
        if bullets is not None:
            check(isinstance(bullets, (list, tuple)), code, f'{at}.bullets phải là list chuỗi')
            bullets = [str(b).strip() for b in bullets]
            check(bullets, code, f'{at}.bullets rỗng — bỏ khoá này đi nếu không có gạch đầu dòng')
            check(len(bullets) <= THEORY_BULLETS_MAX, code,
                  f'{at}.bullets có {len(bullets)} mục, tối đa {THEORY_BULLETS_MAX}')
            for j, bullet in enumerate(bullets, start=1):
                check(bullet, code, f'{at}.bullets[{j}] trống')
                check(len(bullet) <= THEORY_BULLET_MAX, code,
                      f'{at}.bullets[{j}] dài {len(bullet)} ký tự, tối đa {THEORY_BULLET_MAX}')
        check(body or bullets, code, f'{at} phải có body hoặc bullets (hoặc cả hai)')
        block = {'title': h, 'body': body or None, 'bullets': bullets or None, 'figure': None}
        if raw.get('figure'):
            check(str(raw['figure']) == figure['name'], code,
                  f'{at}.figure={raw["figure"]!r} khác figure.name={figure["name"]!r}')
            block['figure'] = {k: figure[k] for k in ('src', 'caption', 'alt')}
            with_figure.append(at)
        blocks.append(block)
    check(len(with_figure) == 1, code,
          f'đúng MỘT khối theory được mang figure, đang có {len(with_figure)} ({", ".join(with_figure) or "không khối nào"})')
    return blocks, figure


def build_lesson(spec, briefs, support, sort_order, warnings=None, strict_figures=False):
    code = spec['code']
    module_no, module_name, level = MODULE_OF[code]
    gate = bool(spec.get('gate'))
    title = f"{code} · {spec['title']}"
    subtitle = f"{level} · M{module_no} · {spec['minutes']} phút"
    if gate:
        subtitle += f" · Boss {spec.get('exam') or module_name}"

    prereq = spec.get('prereq')
    if prereq:
        check(prereq in ORDER and ORDER.index(prereq) < ORDER.index(code), code,
              f'prereq={prereq!r} phải là mã một bài ĐỨNG TRƯỚC trong khoá mới')

    files = lesson_files(code, spec, support)
    theory, figure = theory_blocks(code, spec, warnings if warnings is not None else [], strict_figures)

    # ---- S1: hiểu và dự đoán
    step1 = {
        'brief': brief_block(code, spec, briefs, module_no, level),
        # Lý thuyết đứng NGAY SAU màn mở đầu (xem buildPlayScreens của frontend):
        # học viên cần khái niệm + hình trước khi đọc code từng dòng ở `explain`.
        'theory': theory,
        'figure': figure,
        'context': {
            'title': spec['goal'],
            'body': spec['brief'],
            'example': spec.get('example'),
            'prereq': prereq,
            'level': level,
            'files': [f['name'] for f in files] or None,
        },
        'predict': predict_block(code, spec['predict']),
        'misconception': {'title': spec['myth'][0], 'body': spec['myth'][1]},
        'explain': [{'n': i, 'body': text} for i, text in enumerate(spec['explain'], start=1)],
    }
    if spec.get('demo'):
        step1['code'] = {'filename': 'vi_du.py', 'version': 'Python 3.12',
                         'source': spec['demo'].rstrip('\n'), 'kind': 'demo'}

    # ---- S2: bẫy ngộ nhận
    step2 = {
        'mcq': [mcq_block(code, q) for q in spec['mcq']],
        'selfExplain': {
            'prompt': spec['why']['prompt'],
            'placeholder': 'Nêu dữ liệu vào → chương trình xử lý thế nào → kết quả ra, rồi thêm một trường hợp đặc biệt (ví dụ dữ liệu rỗng).',
            'sample': spec['why']['sample'],
        },
    }
    check(step2['mcq'], code, 'cần ít nhất một câu trắc nghiệm (kho câu hỏi ôn tập đọc step_2.mcq)')

    # ---- S3: luyện có hỗ trợ
    counter = spec['counter']
    check(counter['correct'] in counter['options'], code, 'đáp án tái dự đoán không nằm trong các lựa chọn')
    counter_options = list(counter['options'])
    random.Random(f'{code}-counter').shuffle(counter_options)
    step3 = {
        'task': {
            'title': 'Luyện có hỗ trợ' if not gate else 'Lập kế hoạch trước khi tự viết',
            'body': (spec.get('scaffold') or {}).get('intro') or 'Đi lại đường dữ liệu của bài trước khi tự viết code.',
            'rule': spec['transfer'],
        },
        'trace': {'steps': [{'label': f'Bước {i}', 'text': t} for i, t in enumerate(spec['flow'], start=1)]},
        'counter': {'question': counter['q'], 'options': counter_options, 'correct': counter['correct']},
    }
    if spec.get('scaffold'):
        check(not gate, code, 'cửa tự kiểm tra (gate=True) không cấp khung lắp ghép')
        step3['scaffold'] = scaffold_block(code, spec['scaffold'])

    # ---- S4: sandbox
    tests = [{'name': name, 'call': call, 'expect': expect} for name, call, expect in spec['tests']]
    check(len(tests) >= MIN_TESTS, code, f'cần ít nhất {MIN_TESTS} ca chấm (đang có {len(tests)})')
    check(len({t['name'] for t in tests}) == len(tests), code, 'tên ca chấm bị trùng')
    check(spec['starter'] != spec['solution'], code, 'code khởi tạo trùng lời giải')
    declared = set(spec.get('packages') or [])
    unknown = declared - set(PACKAGES)
    check(not unknown, code, f'packages {sorted(unknown)} không có; chỉ dùng được {sorted(PACKAGES)}')
    excel = uses_excel(spec['solution'])
    check(not excel, code, f'lời giải dùng {excel}: Excel cần openpyxl, mà Pyodide 0.27.7 không có gói này — '
                           'trình duyệt sẽ lỗi')
    packages = sorted(declared | detect_packages(spec['solution'], spec['starter'],
                                                 *[t['call'] + '\n' + t['expect'] for t in tests]))
    task_body = spec['brief']
    if spec.get('practice'):
        task_body += '\n\nThực hành: ' + spec['practice']
    step4 = {
        'task': {
            'title': 'Boss — tự viết, nộp lần đầu trước khi xem lời giải' if gate else 'Thử thách độc lập',
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
    if packages:
        step4['packages'] = packages

    # `slides` = trang slide gốc của giảng viên ("SL 15-16"), để sổ tay in được dòng
    # nguồn dưới khối lý thuyết. Đi cùng `source` vì nó nói về xuất xứ, không phải nội dung.
    slides = spec.get('slides')
    if slides is not None:
        slides = str(slides).strip()
        check(slides, code, 'slides khai rỗng — bỏ khoá này đi nếu không dẫn được nguồn')
        check(len(slides) <= 80, code, f'slides dài {len(slides)} ký tự, tối đa 80')

    content = {
        'schema': SCHEMA,
        'title': title,
        'subtitle': subtitle,
        'source': {'kind': 'pe-v4', 'filename': f'{SOURCE}#{code}', 'parser': 'pe-v4/build',
                   'importedAt': SOURCE_DATE, 'slides': slides},
        'step_1': step1,
        'step_2': step2,
        'step_3': step3,
        'step_4': step4,
    }
    xp = XP[level] * (2 if gate else 1)
    row = {
        'lesson_code': code,
        'sort_order': sort_order,
        'module': f'M{module_no} · {module_name}',
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
    check(len(bad) >= MIN_BAD, code, f'cần ít nhất {MIN_BAD} biến thể sai (`bad`), đang có {len(bad)}')
    qa = {'code': code, 'solution': spec['solution'], 'starter': spec['starter'], 'bad': bad,
          'tests': tests, 'files': files, 'packages': packages, 'demo': spec.get('demo') or ''}
    return row, qa


def strip_none(value):
    if isinstance(value, dict):
        return {k: strip_none(v) for k, v in value.items() if v is not None}
    if isinstance(value, list):
        return [strip_none(v) for v in value]
    return value


# ---------------------------------------------------------------- chấm thử bằng CPython

def interpreter() -> str:
    """CPython dùng để chấm thử: ưu tiên .venv có đúng phiên bản thư viện của Pyodide."""
    env = os.environ.get('PE_V4_PYTHON')
    if env:
        return env
    for candidate in (HERE / '.venv' / 'Scripts' / 'python.exe', HERE / '.venv' / 'bin' / 'python'):
        if candidate.exists():
            return str(candidate)
    return sys.executable


def run_jobs(qa: dict, timeout: float) -> list[dict]:
    """Chạy lời giải, khung trống, biến thể sai và ví dụ minh hoạ của MỘT bài qua harness."""
    jobs = [{'label': 'solution', 'code': qa['solution'], 'tests': qa['tests'], 'files': qa['files']},
            {'label': 'starter', 'code': qa['starter'], 'tests': qa['tests'], 'files': qa['files']}]
    jobs += [{'label': f'bad:{b["label"]}', 'code': b['code'], 'tests': qa['tests'], 'files': qa['files']}
             for b in qa['bad']]
    if qa.get('demo'):
        jobs.append({'label': 'demo', 'code': qa['demo'], 'tests': [], 'files': qa['files']})
    return run_harness(qa, jobs, timeout)


def run_harness(qa: dict, jobs: list[dict], timeout: float) -> list[dict]:
    """Một process CPython chạy lần lượt các job qua studio-harness.py (harness_cpython.py)."""
    with tempfile.TemporaryDirectory(prefix=f'pe-v4-{qa["code"]}-') as workdir:
        payload = json.dumps({'harness': str(HARNESS), 'workdir': workdir, 'timeout': timeout,
                              'packages': qa.get('packages', []), 'jobs': jobs})
        env = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONUTF8='1', MPLBACKEND='Agg')
        try:
            proc = subprocess.run([interpreter(), '-I', str(DRIVER)], input=payload.encode('utf-8'),
                                  capture_output=True, timeout=timeout * len(jobs) + 60, env=env, cwd=workdir)
        except subprocess.TimeoutExpired:
            return [{'label': j['label'], 'result': {'tests': [], 'error': 'process chấm thử bị treo'},
                     'seconds': None, 'timeout': True} for j in jobs]
        if proc.returncode != 0 or not proc.stdout:
            err = proc.stderr.decode('utf-8', 'replace')[-1500:]
            return [{'label': j['label'], 'result': {'tests': [], 'error': f'harness_cpython lỗi:\n{err}'},
                     'seconds': None, 'timeout': False} for j in jobs]
        return json.loads(proc.stdout.decode('utf-8'))['results']


def passed_all(result: dict, total: int) -> bool:
    return not result.get('error') and len(result.get('tests', [])) == total and all(t['passed'] for t in result['tests'])


def judge(qa: dict, results: list[dict], verbose: bool) -> tuple[list[str], list[str]]:
    """(vấn đề, dòng tóm tắt) cho một bài — cùng ba luật của pe-v3/check-pyodide.mjs."""
    problems, lines = [], []
    code, total = qa['code'], len(qa['tests'])
    by_label = {r['label']: r for r in results}
    good = by_label['solution']
    res = good['result']
    if not passed_all(res, total):
        failed = [f"      ✗ {t['name']}: {t['detail']}" for t in res.get('tests', []) if not t['passed']]
        problems.append(f'{code}: LỜI GIẢI MẪU KHÔNG ĐẠT' + (f"\n      lỗi: {res['error'].strip()}" if res.get('error') else '')
                        + ('\n' + '\n'.join(failed) if failed else ''))
    else:
        slow = good['seconds'] or 0
        note = f' — CHẬM {slow:.1f}s trên CPython, Pyodide còn chậm hơn vài lần (giới hạn 5 s)' if slow > 1.5 else ''
        lines.append(f'{code}: lời giải đạt {total}/{total} ({good["seconds"]}s){note}')
        if slow > 1.5:
            problems.append(f'{code}: lời giải chạy {slow:.1f}s trên CPython — dễ vượt giới hạn 5 s của trình duyệt')
    for r in results:
        label = r['label']
        if label in ('solution', 'demo'):
            continue
        name = 'code khởi tạo' if label == 'starter' else label[4:]
        if passed_all(r['result'], total):
            problems.append(f'{code}: "{name}" vẫn QUA hết {total} ca — ca chấm chưa bắt được lỗi này')
        elif verbose:
            caught = 'lỗi chạy' if r['result'].get('error') else '; '.join(
                t['name'] for t in r['result']['tests'] if not t['passed'])
            lines.append(f'   {name}: bị bắt ({caught[:160]})')
    demo = by_label.get('demo')
    if demo and demo['result'].get('error'):
        problems.append(f'{code}: ví dụ minh hoạ (demo) chạy lỗi:\n      {demo["result"]["error"].strip()[-600:]}')
    return problems, lines


def run_checks(qa_rows: list[dict], jobs: int, timeout: float, verbose: bool) -> list[str]:
    python = interpreter()
    if python == sys.executable and not os.environ.get('PE_V4_PYTHON'):
        print(f'! Chấm thử bằng {sys.version.split()[0]} (không thấy scripts/pe-v4/.venv): phiên bản numpy/pandas '
              'có thể khác Pyodide 0.27.7. Tạo venv: uv venv scripts/pe-v4/.venv --python 3.12 && uv pip install '
              '--python scripts/pe-v4/.venv/Scripts/python.exe numpy==2.0.2 pandas==2.2.3 matplotlib==3.8.4')
    started = time.monotonic()
    problems = []
    with ThreadPoolExecutor(max_workers=max(1, jobs)) as pool:
        for qa, results in zip(qa_rows, pool.map(lambda q: run_jobs(q, timeout), qa_rows)):
            found, lines = judge(qa, results, verbose)
            for line in lines:
                print('  ' + line)
            problems += found
    variants = sum(len(q['bad']) + 1 for q in qa_rows)
    cases = sum(len(q['tests']) for q in qa_rows)
    print(f'Chấm thử (CPython qua studio-harness.py): {len(qa_rows)} bài, {cases} ca, {variants} biến thể sai/khung trống '
          f'— {time.monotonic() - started:.1f}s.')
    return problems


# ---------------------------------------------------------------- main

def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--only', help='Chỉ dựng + chấm các mã này (vd. P01,P02). Không ghi out/.')
    ap.add_argument('--partial', action='store_true', help='Dựng mọi bài đang có (thiếu bài chỉ cảnh báo), ghi out/.')
    ap.add_argument('--write', action='store_true', help='Với --only: vẫn ghi out/ (chỉ các bài đã chọn).')
    ap.add_argument('--no-run', action='store_true', help='Bỏ bước chấm thử bằng CPython.')
    ap.add_argument('--jobs', type=int, default=2, help='Số bài chấm song song (mặc định 2).')
    ap.add_argument('--timeout', type=float, default=10, help='Giây tối đa cho một lần chạy (mặc định 10).')
    ap.add_argument('--strict', action='store_true',
                    help='Hình SVG còn thiếu là LỖI, không phải cảnh báo (dùng trước khi deploy).')
    ap.add_argument('--verbose', '-v', action='store_true')
    ap.add_argument('--extra', action='append', default=[],
                    help='Nạp thêm file bài ngoài lessons_*.py (bài thử của hạ tầng); mã lạ được xếp vào chặng "Thử".')
    args = ap.parse_args(argv)
    # Console Windows mặc định cp1252: in tiếng Việt/✓ qua pipe sẽ nổ UnicodeEncodeError.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    for extra in args.extra:
        register_extra(Path(extra))

    only =[c.strip() for c in args.only.split(',') if c.strip()] if args.only else None
    strict = only is None and not args.partial
    try:
        specs, briefs, support, origin, warnings = load_sources(strict)
    except BuildError as err:
        print('LỖI:', err, file=sys.stderr)
        return 1
    for w in warnings:
        print('! ' + w, file=sys.stderr)

    if only:
        unknown = [c for c in only if c not in MODULE_OF]
        missing = [c for c in only if c in MODULE_OF and c not in specs]
        if unknown or missing:
            print(f'LỖI: mã không thuộc giáo trình: {unknown}; chưa có trong lessons_*.py: {missing}', file=sys.stderr)
            return 1
        wanted = [c for c in ORDER if c in only]
    else:
        missing = [c for c in ORDER if c not in specs]
        if missing and strict:
            print(f'LỖI: thiếu {len(missing)}/48 bài: {", ".join(missing)} '
                  '(dùng --partial hoặc --only khi đang soạn)', file=sys.stderr)
            return 1
        if missing:
            print(f'! Thiếu {len(missing)}/48 bài: {", ".join(missing)}', file=sys.stderr)
        wanted = [c for c in ORDER if c in specs]

    rows, qa_rows = [], []
    errors = []
    figure_warnings: list[str] = []
    for code in wanted:
        try:
            row, qa = build_lesson(specs[code], briefs, support, ORDER.index(code) + 1,
                                   warnings=figure_warnings, strict_figures=args.strict)
        except BuildError as err:
            errors.append(str(err))
            continue
        except (KeyError, TypeError, ValueError) as err:
            errors.append(f'{code} ({origin[code]}): dict bài thiếu/sai trường: {type(err).__name__}: {err}')
            continue
        row['content_json'] = glossary.polish(row['content_json'])
        rows.append(strip_none(row))
        qa_rows.append(qa)
    if figure_warnings:
        print(f'! {len(figure_warnings)} hình chưa vẽ (bài vẫn dựng được; --strict để coi là lỗi):', file=sys.stderr)
        for w in figure_warnings:
            print('  ' + w, file=sys.stderr)
    if errors:
        print(f'LỖI dựng ({len(errors)}):', file=sys.stderr)
        for e in errors:
            print('  ' + e, file=sys.stderr)

    write = (only is None) or args.write
    if write and rows and not (strict and errors):
        write_outputs(rows, qa_rows, partial=bool(only) or args.partial or len(rows) != len(ORDER))

    problems = []
    if not args.no_run and qa_rows:
        problems = run_checks(qa_rows, args.jobs, args.timeout, args.verbose)
        if problems:
            print(f'\n{len(problems)} vấn đề khi chấm thử:')
            for p in problems:
                print('  ' + p)
    if only and rows:
        if preview_games(rows, qa_rows, run=not args.no_run):
            problems.append('mini-game (xem dòng ✗ ở trên)')

    tests = sum(len(q['tests']) for q in qa_rows)
    bad = sum(len(q['bad']) for q in qa_rows)
    ok = not errors and not problems
    mark = '✓' if ok else '✗'
    print(f'{mark} {len(rows)} bài dựng được, {tests} ca chấm, {bad} biến thể sai'
          + (' — ghi vào scripts/pe-v4/out/' if write and rows else ' (không ghi out/)'))
    return 0 if ok else 1


def write_outputs(rows, qa_rows, partial):
    out = HERE / 'out'
    (out / 'lessons').mkdir(parents=True, exist_ok=True)
    for old in (out / 'lessons').glob('*.json'):
        old.unlink()
    for row in rows:
        (out / 'lessons' / f"{row['sort_order']:03d}-{row['lesson_code']}.json").write_text(
            json.dumps(row, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    bundle = {'course_id': 'python_advanced', 'source': SOURCE, 'lessons': rows}
    if partial:
        # Seed từ chối gói thiếu bài; cờ này nói rõ vì sao.
        bundle['partial'] = True
    (out / 'lessons.json').write_text(json.dumps(bundle, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    (out / 'qa.json').write_text(json.dumps(qa_rows, ensure_ascii=False) + '\n', encoding='utf-8')

    modules = []
    for row in rows:
        if not modules or modules[-1]['title'] != row['module']:
            modules.append({'title': row['module'], 'lessons': []})
        modules[-1]['lessons'].append(row['title'])
    curriculum = {
        'requirements': [
            'Đã viết được hàm, vòng lặp, đọc/ghi file và class cơ bản bằng Python',
            'Trình duyệt có mạng để chạy Python (Pyodide) ngay trong bài; máy cài Python 3.12 để chạy thật subprocess, thread, Tkinter',
            'Bài numpy/pandas/matplotlib tải thêm thư viện ở lần mở đầu tiên (vài MB)',
        ],
        'skills': [
            'Chạy chương trình con bằng subprocess: returncode, stdout/stderr, timeout, check=True',
            'Đa luồng với threading: start/join, Lock, Queue và đo thời gian chờ I/O',
            'Dựng GUI Tkinter: widget, biến, pack/grid, command và tách logic khỏi giao diện',
            'Nhập dữ liệu, truy vấn SQL với sqlite3 và tra cứu',
            'NumPy: mảng, vector hoá, lọc bằng mask',
            'pandas: đọc CSV/Excel, làm sạch, groupby, merge',
            'Matplotlib: line, bar, scatter, histogram, subplot có nhãn đầy đủ',
            'Dự án DA: từ dữ liệu bẩn tới báo cáo và biểu đồ',
        ],
        'modules': modules,
    }
    (out / 'curriculum-python-advanced-v1.json').write_text(
        json.dumps(curriculum, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def preview_games(rows, qa_rows, run=True):
    """--only: cho tác giả thấy mini-game sinh từ bài của mình (không ghi file)."""
    try:
        import build_advanced
    except Exception as err:  # build_advanced chưa có / lỗi: không chặn tác giả
        print(f'(bỏ qua xem trước mini-game: {err})')
        return 0
    qa = {q['code']: q for q in qa_rows}
    print('Mini-game sẽ sinh (build_advanced.py):')
    plays = []
    for row in rows:
        play, notes = build_advanced.build_play(row, qa[row['lesson_code']])
        plays.append((row, play, notes, build_advanced.verify(row, play)))
    ran = build_advanced.check_games([(row, play) for row, play, _, _ in plays]) if run else {}
    bad = 0
    for row, play, notes, problems in plays:
        problems = problems + ran.get(row['lesson_code'], [])
        bad += bool(problems)
        kinds = ' → '.join(g['type'] for g in play['games'])
        print(f"  {row['lesson_code']}: {kinds}" + (f"  [{'; '.join(notes)}]" if notes else '')
              + (f'  ✗ {"; ".join(problems)}' if problems else ''))
    return bad


if __name__ == '__main__':
    sys.exit(main())
