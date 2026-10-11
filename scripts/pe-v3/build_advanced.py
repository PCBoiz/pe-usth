"""Dựng khoá Python Advanced (`python_advanced`) từ 40 bài PE v3.

Nguồn: out/lessons/*.json và out/qa.json (do build.py sinh). Không soạn tay nội
dung mới — mọi mini-game được SINH từ dữ liệu đã kiểm chứng của bài gốc rồi chạy
thử bằng CPython ngay lúc build:

  traceTable  chạy ví dụ minh hoạ (step_1.code) qua sys.settrace, ghi giá trị biến
              sau từng dòng; học viên điền các ô vừa đổi.
  match       nhật ký biến đổi (step_3.trace) dạng "code → ý nghĩa": nối hai cột.
  trueFalse   ngộ nhận (luôn SAI) trộn với các ý giải thích (luôn ĐÚNG).
  fill        khung lắp ghép sẵn có (step_3.scaffold), giữ lời giải thích bẫy.
  parsons     xếp lại các dòng của LỜI GIẢI thật; dòng nhiễu lấy từ biến thể sai
              của qa.json. Chấm bằng chạy bộ test của bài trong Pyodide.
  spotError   một biến thể sai (qa.json) — chỉ ra dòng gây lỗi.
  debug       (Nâng cao) sửa biến thể sai trong editor cho tới khi qua hết test.

Luồng màn (studio-lesson/v2, frontend/src/lib/studio-lesson.ts#buildScreens):
  Cơ bản    brief → giải thích → dự đoán → khởi động → parsons ▶ → săn lỗi → sandbox → tổng kết
  Trung cấp + fill trước parsons
  Nâng cao  brief → giải thích → dự đoán → khởi động → fill → săn lỗi → debug ▶ → tự giải thích → sandbox → tổng kết
  Boss      (5 cửa tự kiểm tra) brief → đúng/sai → săn lỗi → sandbox không gợi ý → tổng kết

Chạy:  python scripts/pe-v3/build_advanced.py
Ra:    out-advanced/lessons.json, out-advanced/lessons/*.json,
       out-advanced/curriculum-python-advanced.json, out-advanced/report.md
"""
from __future__ import annotations

import difflib
import io
import json
import os
import random
import re
import subprocess
import sys
import tempfile
import textwrap
from contextlib import redirect_stdout
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / 'out'
OUT = HERE / 'out-advanced'
COURSE_ID = 'python_advanced'
SCHEMA = 'studio-lesson/v2'

PARSONS_WINDOW = 8
TRACE_MAX_ROWS = 6
TRACE_MAX_COLS = 3
TRACE_MAX_BLANKS = 4
SELF_EXPLAIN_MIN_WORDS = 8

SIMPLE = (int, float, str, bool)


# ---------------------------------------------------------------- tiện ích

def rng_for(code: str) -> random.Random:
    """Trộn ổn định theo mã bài: build lại không đổi thứ tự đáp án."""
    return random.Random(f'python_advanced:{code}')


def shuffled(items: list, rng: random.Random, avoid_identity: bool = True) -> list:
    out = list(items)
    for _ in range(10):
        rng.shuffle(out)
        if not avoid_identity or len(out) < 2 or out != items:
            break
    return out


def run_python(code: str, files: list[dict] | None = None, timeout: int = 5) -> tuple[int, str, str]:
    """Chạy một chương trình độc lập bằng CPython (python -I) trong thư mục tạm."""
    with tempfile.TemporaryDirectory() as d:
        for f in files or []:
            Path(d, f['name']).write_text(f['content'], encoding='utf-8')
        main = Path(d, 'main.py')
        main.write_text(code, encoding='utf-8')
        env = dict(os.environ, PYTHONIOENCODING='utf-8')
        try:
            r = subprocess.run([sys.executable, '-I', str(main)], cwd=d, capture_output=True,
                               text=True, timeout=timeout, encoding='utf-8', env=env)
        except subprocess.TimeoutExpired:
            return -1, '', 'timeout'
        return r.returncode, r.stdout, r.stderr


def is_movable(line: str) -> bool:
    s = line.strip()
    return bool(s) and not s.startswith('#') and not s.startswith(('import ', 'from '))


# ---------------------------------------------------------------- traceTable

def fmt_value(v) -> str:
    return repr(v) if isinstance(v, str) else str(v)


def build_trace_table(demo: str) -> dict | None:
    """Ghi giá trị biến cấp module sau mỗi dòng của ví dụ minh hoạ."""
    if 'fork' in demo or 'open(' in demo or 'input(' in demo or 'import' in demo:
        return None
    lines = demo.split('\n')
    snapshots: list[tuple[int, dict]] = []
    state = {'line': None}

    def snap(frame):
        return {k: v for k, v in frame.f_locals.items()
                if not k.startswith('__') and isinstance(v, SIMPLE) and len(fmt_value(v)) <= 14}

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != '<demo>':
            return None
        if frame.f_code.co_name != '<module>':
            return None
        if event == 'line':
            if state['line'] is not None:
                snapshots.append((state['line'], snap(frame)))
            state['line'] = frame.f_lineno
        elif event == 'return' and state['line'] is not None:
            snapshots.append((state['line'], snap(frame)))
            state['line'] = None
        return tracer

    glb: dict = {'__name__': '__main__'}
    try:
        code_obj = compile(demo, '<demo>', 'exec')
        sys.settrace(tracer)
        with redirect_stdout(io.StringIO()):
            exec(code_obj, glb)
    except Exception:
        return None
    finally:
        sys.settrace(None)

    rows, prev = [], {}
    for lineno, values in snapshots:
        changed = [k for k, v in values.items() if k not in prev or prev[k] != v]
        if changed:
            rows.append({'line': lines[lineno - 1].strip(), 'values': dict(values), 'changed': changed})
        prev = values
    if len(rows) < 2:
        return None
    rows = rows[:TRACE_MAX_ROWS]
    order: list[str] = []
    for r in rows:
        for k in r['changed']:
            if k not in order:
                order.append(k)
    columns = order[:TRACE_MAX_COLS]
    if not columns:
        return None

    out_rows, answers, blanks = [], {}, 0
    for i, r in enumerate(rows):
        vals = {}
        for c in columns:
            if c not in r['values']:
                vals[c] = '—'
            elif c in r['changed'] and blanks < TRACE_MAX_BLANKS and i > 0:
                vals[c] = None
                answers[f'{i}-{c}'] = fmt_value(r['values'][c])
                blanks += 1
            else:
                vals[c] = fmt_value(r['values'][c])
        out_rows.append({'step': r['line'][:40], 'values': vals})
    if blanks < 2:
        return None
    return {'columns': columns, 'rows': out_rows, 'answers': answers}


# ---------------------------------------------------------------- match / trueFalse

def build_match(trace_steps: list[dict], rng: random.Random) -> dict | None:
    pairs = []
    for st in trace_steps:
        text = st.get('text', '')
        if ' → ' not in text:
            continue
        left, right = text.split(' → ', 1)
        left, right = left.strip(), right.strip().rstrip('.')
        if left and right and len(left) <= 60 and all(p['left'] != left and p['right'] != right for p in pairs):
            pairs.append({'left': left, 'right': right})
    if len(pairs) < 3:
        return None
    pairs = pairs[:4]
    return {'pairs': pairs, 'rightOrder': shuffled(list(range(len(pairs))), rng)}


def clean_myth(title: str) -> str:
    return title.strip().strip('"“”').strip()


HEADING_MYTH = re.compile(r'^(Hai|Ba|Bốn|Năm|Sáu) cái bẫy', re.I)


def build_true_false_from_mcq(two: dict) -> dict | None:
    """Đúng/sai cho TỪNG đáp án của câu trắc nghiệm đầu: "kết quả này đúng không?"."""
    mcq = (two.get('mcq') or [None])[0]
    if not mcq or len(mcq.get('options', [])) < 2:
        return None
    items = []
    for i, o in enumerate(mcq['options']):
        text = o['text'] if isinstance(o, dict) else o
        correct = (o.get('correct') is True) if isinstance(o, dict) else i == mcq.get('correct')
        items.append({'statement': text, 'answer': bool(correct),
                      'explain': (o.get('detail') if isinstance(o, dict) else '') or ''})
    if sum(it['answer'] for it in items) != 1:
        return None
    return {'prompt': mcq['question'], 'items': items}


def build_true_false(one: dict, rng: random.Random) -> dict | None:
    myth = one.get('misconception') or {}
    if HEADING_MYTH.match(myth.get('title', '')):
        return None  # tiêu đề kiểu "Năm cái bẫy của Ex1" không phải một nhận định để hỏi đúng/sai
    facts = sorted((e['body'] for e in one.get('explain', []) if len(e.get('body', '')) <= 150), key=len)
    if not myth.get('title') or not facts:
        return None
    items = [{'statement': clean_myth(myth['title']), 'answer': False, 'explain': myth.get('body', '')}]
    for body in facts[:2]:
        items.append({'statement': body, 'answer': True, 'explain': 'Đúng — đây là ý chính của bài.'})
    return {'items': shuffled(items, rng)}


# ---------------------------------------------------------------- dùng biến thể sai

def diff_block(solution: str, bad: str) -> tuple[int, int, int, int] | None:
    """Khối khác biệt DUY NHẤT giữa lời giải và biến thể sai, theo chỉ số dòng."""
    a, b = solution.rstrip('\n').split('\n'), bad.rstrip('\n').split('\n')
    ops = [op for op in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes() if op[0] != 'equal']
    if len(ops) != 1:
        return None
    _, i1, i2, j1, j2 = ops[0]
    return i1, i2, j1, j2


def build_spot_error(solution: str, bad: dict) -> dict | None:
    blk = diff_block(solution, bad['code'])
    if not blk:
        return None
    i1, i2, j1, j2 = blk
    if j2 - j1 < 1 or j2 - j1 > 2:  # dòng lỗi phải nhìn thấy được trong code sai
        return None
    lines = bad['code'].rstrip('\n').split('\n')
    line = j1 + 1
    lo, hi = max(1, line - 7), min(len(lines), line + 7)
    fix = solution.rstrip('\n').split('\n')[i1:i2]
    return {
        'code': '\n'.join(lines[lo - 1:hi]),
        'firstLine': lo,
        'line': line,
        # Biến thể sai có thể đổi 2 dòng liền nhau: chọn dòng nào trong khối cũng đúng.
        'lines': list(range(j1 + 1, j2 + 1)),
        'label': bad['label'],
        'fix': '\n'.join(fix),
    }


def build_parsons(solution: str, bads: list[dict], rng: random.Random) -> dict | None:
    lines = solution.rstrip('\n').split('\n')
    movable = [i for i, l in enumerate(lines) if is_movable(l)]
    if len(movable) < 3:
        return None
    # Cửa sổ xáo trộn: ưu tiên quanh dòng mà biến thể sai hay làm hỏng.
    core = None
    for bad in bads:
        blk = diff_block(solution, bad['code'])
        if blk and blk[0] < len(lines):
            core = blk[0]
            break
    if len(movable) <= PARSONS_WINDOW:
        window = movable
    else:
        center = core if core is not None else movable[-1]
        pos = min(range(len(movable)), key=lambda k: abs(movable[k] - center))
        start = max(0, min(pos - PARSONS_WINDOW // 2, len(movable) - PARSONS_WINDOW))
        window = movable[start:start + PARSONS_WINDOW]
    # Cửa sổ phải liền khối để phần đầu/cuối cố định ghép lại đúng thứ tự.
    lo, hi = window[0], window[-1]
    block = list(range(lo, hi + 1))
    pieces = [{'id': f'L{k}', 'text': lines[k]} for k in block if lines[k].strip()]
    if len(pieces) < 3:
        return None
    distractors = []
    seen = {l.strip() for l in lines}
    for bad in bads:
        blk = diff_block(solution, bad['code'])
        if not blk:
            continue
        _, _, j1, j2 = blk
        for text in bad['code'].rstrip('\n').split('\n')[j1:j2]:
            if text.strip() and text.strip() not in seen and is_movable(text):
                distractors.append({'id': f'D{len(distractors)}', 'text': text, 'reason': bad['label']})
                seen.add(text.strip())
        if len(distractors) >= 2:
            break
    order = shuffled([p['id'] for p in pieces] + [d['id'] for d in distractors], rng)
    return {
        'head': '\n'.join(lines[:lo]),
        'tail': '\n'.join(lines[hi + 1:]),
        'lines': pieces,
        'distractors': distractors,
        'order': order,
    }


# ---------------------------------------------------------------- lắp bài

LEVEL = {'B': 'Cơ bản', 'I': 'Trung cấp', 'N': 'Nâng cao'}


def build_play(row: dict, qa: dict, report: list[str]) -> dict:
    c = row['content_json']
    code = row['lesson_code']
    level = code[0]
    rng = rng_for(code)
    one, three, four = c.get('step_1', {}), c.get('step_3', {}), c.get('step_4', {})
    boss = bool(four.get('gate'))
    solution = four.get('solutionCode', '')
    bads = qa.get('bad', [])
    games: list[dict] = []
    notes: list[str] = []

    def add(kind: str, title: str, data: dict | None, why_missing: str):
        if data is None:
            notes.append(f'không có {kind} ({why_missing})')
            return False
        games.append({'id': f'{kind}-{len(games)}', 'type': kind, 'title': title, **data})
        return True

    tf = build_true_false(one, rng)
    if boss:
        add('trueFalse', 'Khởi động trận Boss: mỗi đáp án đúng hay sai?',
            build_true_false_from_mcq(c.get('step_2', {})) or tf, 'thiếu trắc nghiệm/ngộ nhận')
        spot = next((s for s in (build_spot_error(solution, b) for b in bads) if s), None)
        add('spotError', 'Săn lỗi: dòng nào làm chương trình sai?', spot, 'biến thể sai không khoanh được 1 dòng')
        return {'level': level, 'boss': True, 'games': games, 'selfExplainMinWords': SELF_EXPLAIN_MIN_WORDS}, notes

    # 1. Khởi động: bảng theo dõi biến > nối cặp > đúng/sai.
    demo = (one.get('code') or {}).get('source', '')
    tt = build_trace_table(demo) if demo else None
    if tt:
        add('traceTable', 'Theo dõi biến: điền giá trị sau mỗi dòng', {'code': demo, **tt}, '')
    else:
        m = build_match(three.get('trace', {}).get('steps', []), rng)
        if m:
            add('match', 'Nối mỗi dòng lệnh với việc nó làm', m, '')
        else:
            add('trueFalse', 'Đúng hay sai?', tf, 'thiếu ngộ nhận/giải thích')

    # 2. Điền khuyết (khung lắp ghép sẵn có) cho Trung cấp / Nâng cao.
    if level in 'IN' and three.get('scaffold'):
        games.append({'id': f'fill-{len(games)}', 'type': 'fill',
                      'title': three.get('task', {}).get('title') or 'Điền mảnh còn thiếu'})

    # 3. Ghép code chạy được (Cơ bản/Trung cấp) hoặc sửa code (Nâng cao).
    spots = [s for s in (build_spot_error(solution, b) for b in bads) if s]
    if level in 'BI':
        p = build_parsons(solution, bads, rng)
        add('parsons', 'Ghép các dòng thành chương trình chạy đúng', p, 'lời giải quá ngắn')
        add('spotError', 'Săn lỗi: dòng nào làm chương trình sai?', spots[0] if spots else None,
            'biến thể sai không khoanh được 1 dòng')
    else:
        if spots:
            add('spotError', 'Săn lỗi: dòng nào làm chương trình sai?', spots[0], '')
        debug_src = bads[1] if len(bads) > 1 else (bads[0] if bads else None)
        add('debug', 'Sửa code cho chạy đúng',
            {'code': debug_src['code'], 'label': debug_src['label']} if debug_src else None,
            'không có biến thể sai')
        if c.get('step_2', {}).get('selfExplain'):
            games.append({'id': f'selfExplain-{len(games)}', 'type': 'selfExplain',
                          'title': c['step_2']['selfExplain'].get('prompt', 'Tự giải thích')})

    return {'level': level, 'boss': False, 'games': games, 'selfExplainMinWords': SELF_EXPLAIN_MIN_WORDS}, notes


def verify(row: dict, play: dict) -> list[str]:
    """Kiểm chứng bằng CPython những gì chạy được độc lập (không cần harness)."""
    problems = []
    four = row['content_json'].get('step_4', {})
    files = four.get('files')
    solution = four.get('solutionCode', '')
    for g in play['games']:
        if g['type'] == 'parsons':
            body = '\n'.join(l['text'] for l in g['lines'])
            rebuilt = '\n'.join(x for x in (g['head'], body, g['tail']) if x != '')
            if rebuilt.strip() != solution.strip().replace('\n\n\n', '\n\n') and \
                    [l for l in rebuilt.split('\n') if l.strip()] != [l for l in solution.split('\n') if l.strip()]:
                problems.append('parsons: ghép đúng thứ tự không ra lời giải')
        if g['type'] == 'spotError':
            shown = g['code'].split('\n')
            if not (0 <= g['line'] - g['firstLine'] < len(shown)):
                problems.append('spotError: dòng lỗi nằm ngoài đoạn hiển thị')
        if g['type'] == 'traceTable' and not g['answers']:
            problems.append('traceTable: không có ô nào để điền')
    if play['level'] == 'B' and 'fork' not in solution and not files:
        rc, _, err = run_python(solution, files)
        if rc != 0:
            problems.append(f'lời giải không chạy độc lập được: {err.strip().splitlines()[-1:]}')
    return problems


def main() -> None:
    bundle = json.loads((SRC / 'lessons.json').read_text(encoding='utf-8'))
    qa = {q['code']: q for q in json.loads((SRC / 'qa.json').read_text(encoding='utf-8'))}
    curriculum = json.loads((SRC / 'curriculum-python.json').read_text(encoding='utf-8'))

    (OUT / 'lessons').mkdir(parents=True, exist_ok=True)
    rows_out, report, failures = [], [], []
    for row in bundle['lessons']:
        code = row['lesson_code']
        play, notes = build_play(row, qa.get(code, {}), report)
        problems = verify(row, play)
        if problems:
            failures.append(f'{code}: ' + '; '.join(problems))
        content = dict(row['content_json'])
        content['schema'] = SCHEMA
        content['source'] = {**content.get('source', {}), 'kind': 'pe-v3-advanced', 'parser': 'pe-v3/build_advanced'}
        content['play'] = play
        out = {**row, 'content_json': content}
        out['title'] = row['title']
        rows_out.append(out)
        (OUT / 'lessons' / f"{row['sort_order']:03d}-{code}.json").write_text(
            json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        kinds = ' → '.join(g['type'] for g in play['games'])
        report.append(f"| {code} | {'BOSS' if play['boss'] else LEVEL[code[0]]} | {kinds} | {'; '.join(notes) or ''} |")

    (OUT / 'lessons.json').write_text(json.dumps({'course_id': COURSE_ID, 'lessons': rows_out},
                                                 ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    adv = dict(curriculum)
    adv['requirements'] = [
        'Không cần kinh nghiệm lập trình trước — học qua mini-game: ghép code, săn lỗi, theo dõi biến',
        *curriculum['requirements'][1:],
    ]
    (OUT / 'curriculum-python-advanced.json').write_text(json.dumps(adv, ensure_ascii=False, indent=2) + '\n',
                                                         encoding='utf-8')
    counts: dict[str, int] = {}
    for r in rows_out:
        for g in r['content_json']['play']['games']:
            counts[g['type']] = counts.get(g['type'], 0) + 1
    md = ['# Python Advanced — báo cáo dựng mini-game', '',
          'Sinh bởi `scripts/pe-v3/build_advanced.py`. Mỗi dòng: mã bài, cấp, chuỗi game theo thứ tự.', '',
          '**Tổng số game:** ' + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())), '',
          '| Bài | Cấp | Game | Ghi chú |', '|---|---|---|---|', *report, '']
    if failures:
        md += ['## Lỗi kiểm chứng', '', *[f'- {f}' for f in failures], '']
    (OUT / 'report.md').write_text('\n'.join(md), encoding='utf-8')
    print(f'{len(rows_out)} bài -> {OUT}')
    print('Game:', counts)
    if failures:
        print('LỖI:\n  ' + '\n  '.join(failures))
        sys.exit(1)


if __name__ == '__main__':
    main()
