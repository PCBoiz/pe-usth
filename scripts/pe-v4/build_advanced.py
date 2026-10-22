"""Dựng khoá Python Advanced (`python_advanced`, studio-lesson/v2) từ 48 bài pe-v4.

Nguồn: out/lessons.json + out/qa.json (do build.py sinh). Mini-game được SINH từ dữ
liệu đã kiểm chứng của bài, bằng CHÍNH các hàm sinh của scripts/pe-v3/build_advanced.py
(traceTable, match, trueFalse, spotError, parsons — xem chú thích ở file đó). Khác pe-v3:

* Cấp của bài lấy từ chặng (MODULES trong build.py), không từ chữ cái đầu của mã:
  Trung cấp -> luồng 'I' (fill + parsons), Nâng cao -> luồng 'N' (fill, săn lỗi, sửa
  code, tự giải thích). Boss = bài có step_4.gate (R02, DA01, DA02).
* `step_1.theory` / `step_1.figure` / `source.slides` (lý thuyết + hình của M1–M3)
  đi NGUYÊN qua bản v2: content_json được copy cả cụm, và các hàm sinh game chỉ
  đọc đúng khoá chúng cần (misconception, explain, scaffold, solutionCode…) nên
  không khối nào biến lý thuyết thành câu hỏi. Đừng đổi sang "chép từng khoá" —
  thêm khoá mới ở build.py sẽ im lặng rơi mất.
* Game CHẠY CODE được chấm thử ngay lúc dựng bằng studio-harness.py dưới CPython
  (harness_cpython.py), cùng luật với check-advanced.mjs: ghép parsons đúng thứ tự
  phải đạt mọi ca, thứ tự xáo trộn phải trượt; code của game sửa lỗi phải trượt.
  Bài pe-v4 dùng subprocess/tkinter/pandas nên không chạy độc lập bằng python được
  như verify() của pe-v3.

Chạy:  py scripts/pe-v4/build_advanced.py [--only P01,G03] [--no-run]
Ra:    out-advanced/lessons.json, out-advanced/lessons/*.json,
       out-advanced/curriculum-python-advanced.json, out-advanced/report.md
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / 'out'
OUT = HERE / 'out-advanced'
COURSE_ID = 'python_advanced'
SCHEMA = 'studio-lesson/v2'
SELF_EXPLAIN_MIN_WORDS = 8

sys.path.insert(0, str(HERE))


def _load_v3():
    """Các hàm sinh game của pe-v3 (giữ nguyên ở đó; pe-v4 dùng lại, không chép)."""
    path = HERE.parent / 'pe-v3' / 'build_advanced.py'
    spec = importlib.util.spec_from_file_location('pe_v3_build_advanced', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


V3 = _load_v3()
LEVEL_CODE = {'Cơ bản': 'B', 'Trung cấp': 'I', 'Nâng cao': 'N'}
LEVEL_NAME = {'B': 'Cơ bản', 'I': 'Trung cấp', 'N': 'Nâng cao'}


def level_of(row: dict) -> str:
    level = row['content_json'].get('step_1', {}).get('context', {}).get('level', 'Nâng cao')
    return LEVEL_CODE.get(level, 'N')


def build_play(row: dict, qa: dict, report=None) -> tuple[dict, list[str]]:
    c = row['content_json']
    code = row['lesson_code']
    level = level_of(row)
    rng = V3.rng_for(code)
    one, three, four = c.get('step_1', {}), c.get('step_3', {}), c.get('step_4', {})
    boss = bool(four.get('gate'))
    solution = four.get('solutionCode', '')
    bads = qa.get('bad', [])
    games: list[dict] = []
    notes: list[str] = []

    def add(kind, title, data, why_missing):
        if data is None:
            notes.append(f'không có {kind} ({why_missing})')
            return False
        games.append({'id': f'{kind}-{len(games)}', 'type': kind, 'title': title, **data})
        return True

    tf = V3.build_true_false(one, rng)
    spots = [s for s in (V3.build_spot_error(solution, b) for b in bads) if s]
    if boss:
        add('trueFalse', 'Khởi động trận Boss: mỗi đáp án đúng hay sai?',
            V3.build_true_false_from_mcq(c.get('step_2', {})) or tf, 'thiếu trắc nghiệm/ngộ nhận')
        add('spotError', 'Săn lỗi: dòng nào làm chương trình sai?', spots[0] if spots else None,
            'biến thể sai không khoanh được 1 dòng')
        return {'level': level, 'boss': True, 'games': games, 'selfExplainMinWords': SELF_EXPLAIN_MIN_WORDS}, notes

    # 1. Khởi động: bảng theo dõi biến > nối cặp > đúng/sai.
    demo = (one.get('code') or {}).get('source', '')
    tt = V3.build_trace_table(demo) if demo else None
    if tt:
        add('traceTable', 'Theo dõi biến: điền giá trị sau mỗi dòng', {'code': demo, **tt}, '')
    else:
        m = V3.build_match(three.get('trace', {}).get('steps', []), rng)
        if m:
            add('match', 'Nối mỗi dòng lệnh với việc nó làm', m, '')
        else:
            add('trueFalse', 'Đúng hay sai?', tf, 'thiếu ngộ nhận/giải thích')

    # 2. Điền khuyết (khung lắp ghép sẵn có).
    if three.get('scaffold'):
        games.append({'id': f'fill-{len(games)}', 'type': 'fill',
                      'title': three.get('task', {}).get('title') or 'Điền mảnh còn thiếu'})

    # 3. Trung cấp: ghép code chạy được + săn lỗi. Nâng cao: săn lỗi + sửa code + tự giải thích.
    if level in 'BI':
        add('parsons', 'Ghép các dòng thành chương trình chạy đúng', V3.build_parsons(solution, bads, rng),
            'lời giải quá ngắn')
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
    """Kiểm cấu trúc game (không chạy code — phần chạy code ở game_jobs/judge_games)."""
    problems = []
    solution = row['content_json'].get('step_4', {}).get('solutionCode', '')
    for g in play['games']:
        if g['type'] == 'parsons':
            rebuilt = parsons_code(g, [l['id'] for l in g['lines']])
            if [l for l in rebuilt.split('\n') if l.strip()] != [l for l in solution.split('\n') if l.strip()]:
                problems.append('parsons: ghép đúng thứ tự không ra lời giải')
        if g['type'] == 'spotError':
            shown = g['code'].split('\n')
            if not (0 <= g['line'] - g['firstLine'] < len(shown)):
                problems.append('spotError: dòng lỗi nằm ngoài đoạn hiển thị')
        if g['type'] == 'traceTable' and not g['answers']:
            problems.append('traceTable: không có ô nào để điền')
    if not play['games']:
        problems.append('không sinh được mini-game nào')
    return problems


def parsons_code(game: dict, ids: list[str]) -> str:
    """Đúng cách frontend ghép (frontend/src/lib/studio-lesson.ts#parsonsCode)."""
    by_id = {l['id']: l['text'] for l in game['lines']}
    body = '\n'.join(by_id[i] for i in ids)
    return '\n'.join(part for part in (game['head'], body, game['tail']) if part != '') + '\n'


def game_jobs(row: dict, play: dict) -> list[tuple[dict, bool]]:
    """(job cho harness, có phải đạt hết ca không) cho mọi game chạy code của một bài."""
    four = row['content_json']['step_4']
    base = {'tests': four.get('tests', []), 'files': four.get('files', [])}
    jobs = []
    for g in play['games']:
        if g['type'] == 'parsons':
            right = [l['id'] for l in g['lines']]
            jobs.append(({**base, 'label': 'parsons đúng thứ tự', 'code': parsons_code(g, right)}, True))
            naive = [i for i in g['order'] if not i.startswith('D')]
            if naive != right:
                jobs.append(({**base, 'label': 'parsons thứ tự xáo trộn', 'code': parsons_code(g, naive)}, False))
        if g['type'] == 'debug':
            jobs.append(({**base, 'label': 'debug: code cần sửa', 'code': g['code']}, False))
    return jobs


def check_games(rows_play: list[tuple[dict, dict]], workers: int = 2, timeout: float = 10) -> dict[str, list[str]]:
    """Chạy game chạy-code của nhiều bài qua harness dưới CPython. Trả {mã: [vấn đề]}."""
    import build as v4build  # cùng thư mục; nạp muộn để build.py import được file này

    def one(item):
        row, play = item
        jobs = game_jobs(row, play)
        if not jobs:
            return row['lesson_code'], []
        qa = {'code': row['lesson_code'], 'packages': row['content_json']['step_4'].get('packages', [])}
        results = v4build.run_harness(qa, [j for j, _ in jobs], timeout)
        problems = []
        total = len(row['content_json']['step_4'].get('tests', []))
        for (job, must_pass), res in zip(jobs, results):
            ok = v4build.passed_all(res['result'], total)
            if must_pass and not ok:
                failed = [t['name'] for t in res['result'].get('tests', []) if not t['passed']]
                err = (res['result'].get('error') or '').strip().split('\n')[-1:]
                problems.append(f'{job["label"]} KHÔNG đạt ({"; ".join(failed[:3]) or err})')
            if not must_pass and ok:
                problems.append(f'{job["label"]} vẫn ĐẠT hết ca — game quá dễ / không còn gì để sửa')
        return row['lesson_code'], problems

    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        return dict(pool.map(one, rows_play))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description='Dựng python_advanced (studio-lesson/v2) từ out/ của pe-v4.')
    ap.add_argument('--only', help='Chỉ xem trước các mã này (không ghi out-advanced/).')
    ap.add_argument('--no-run', action='store_true', help='Bỏ bước chấm thử game chạy code.')
    ap.add_argument('--jobs', type=int, default=2)
    args = ap.parse_args(argv)
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass

    bundle = json.loads((SRC / 'lessons.json').read_text(encoding='utf-8'))
    qa = {q['code']: q for q in json.loads((SRC / 'qa.json').read_text(encoding='utf-8'))}
    curriculum = json.loads((SRC / 'curriculum-python-advanced-v1.json').read_text(encoding='utf-8'))
    only = set(args.only.split(',')) if args.only else None
    if bundle.get('partial') and not only:
        print('! out/lessons.json là bản dựng THIẾU bài (--partial): out-advanced/ sẽ thiếu theo.', file=sys.stderr)

    rows_out, report, failures, rows_play = [], [], [], []
    counts: dict[str, int] = {}
    for row in bundle['lessons']:
        code = row['lesson_code']
        if only and code not in only:
            continue
        play, notes = build_play(row, qa.get(code, {}))
        problems = verify(row, play)
        if problems:
            failures.append(f'{code}: ' + '; '.join(problems))
        content = dict(row['content_json'])
        content['schema'] = SCHEMA
        content['source'] = {**content.get('source', {}), 'kind': 'pe-v4-advanced', 'parser': 'pe-v4/build_advanced'}
        content['play'] = play
        out = {**row, 'content_json': content}
        rows_out.append(out)
        rows_play.append((out, play))
        kinds = ' → '.join(g['type'] for g in play['games'])
        for g in play['games']:
            counts[g['type']] = counts.get(g['type'], 0) + 1
        report.append(f"| {code} | {'BOSS' if play['boss'] else LEVEL_NAME[play['level']]} | {kinds} | "
                      f"{'; '.join(notes) or ''} |")

    if not args.no_run:
        for code, problems in check_games(rows_play, args.jobs).items():
            if problems:
                failures.append(f'{code}: ' + '; '.join(problems))

    if not only:
        (OUT / 'lessons').mkdir(parents=True, exist_ok=True)
        for old in (OUT / 'lessons').glob('*.json'):
            old.unlink()
        for out in rows_out:
            (OUT / 'lessons' / f"{out['sort_order']:03d}-{out['lesson_code']}.json").write_text(
                json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        packed = {'course_id': COURSE_ID, 'lessons': rows_out}
        if bundle.get('partial'):
            packed['partial'] = True
        (OUT / 'lessons.json').write_text(json.dumps(packed, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        adv = dict(curriculum)
        adv['requirements'] = [
            'Học bằng cách ghép code rồi chạy thật, săn lỗi, sửa code, trận Boss cuối chặng',
            *curriculum['requirements'],
        ]
        (OUT / 'curriculum-python-advanced.json').write_text(json.dumps(adv, ensure_ascii=False, indent=2) + '\n',
                                                             encoding='utf-8')
        md = ['# Python Advanced (pe-v4) — báo cáo dựng mini-game', '',
              'Sinh bởi `scripts/pe-v4/build_advanced.py`. Mỗi dòng: mã bài, cấp, chuỗi game theo thứ tự.', '',
              f'**{len(rows_out)} bài.** Tổng số game: ' + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())), '',
              '| Bài | Cấp | Game | Ghi chú |', '|---|---|---|---|', *report, '']
        if failures:
            md += ['## Lỗi kiểm chứng', '', *[f'- {f}' for f in failures], '']
        (OUT / 'report.md').write_text('\n'.join(md), encoding='utf-8')
        print(f'{len(rows_out)} bài -> {OUT}')
    else:
        for line in report:
            print(line)
    print('Game:', counts)
    if failures:
        print('LỖI:\n  ' + '\n  '.join(failures))
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
