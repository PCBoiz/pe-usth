"""Chép giáo trình 48 bài pe-v4 vào frontend/src/lib/curricula.json (khối CURRICULA.python_advanced).

Trang khoá học và trang chủ đọc file tĩnh này (không gọi API — xem bẫy "hai nguồn
danh sách bài" trong AGENTS.md), nên sau mỗi lần dựng lại pe-v4 phải chạy bước này,
nếu không trang khoá học hiện giáo trình cũ trong khi bài học lấy từ DB.

Script này cũng DỌN các khoá đã gỡ khỏi sản phẩm. Phải dọn ở ĐÂY chứ không phải
sửa tay curricula.json: file đó do script sinh ra, nên lần sync sau sẽ kéo dữ
liệu chết về.

    py scripts/pe-v4/sync_curricula.py
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TARGET = HERE.parent.parent / 'frontend' / 'src' / 'lib' / 'curricula.json'
SOURCE = HERE / 'out-advanced' / 'curriculum-python-advanced.json'

# Khoá đã gỡ khỏi sản phẩm — bỏ cả giáo trình lẫn địa chỉ trang bài học.
#
#   python              khoá Python cơ bản, gỡ khỏi trang 10/2026
#   cpp, java, htmlcss  gỡ khỏi danh mục 13/10/2026 (xem src/lib/catalog.ts),
#                       và 15/10/2026 xoá nốt route của chúng — `/lesson/java`,
#                       `/lesson/htmlcss`, `/interface` (commit "xoá 4 route
#                       chết"). Để lại trong curricula.json thì LESSON_URLS còn
#                       trỏ tới ba đường dẫn 404, cộng 265 tên bài không trang
#                       nào vẽ.
#
# `db_design` KHÔNG có trong danh sách: cụm /courses/db_design* →
# /lesson/db_design* → /card/<id> vẫn mở được và còn ca e2e đi qua.
DROPPED_COURSES = ('python', 'cpp', 'java', 'htmlcss')


def screen_keys(content: dict, code: str) -> list:
    """Danh sách màn của một bài, đúng thứ tự `buildPlayScreens` (src/lib/studio-lesson.ts).

    Trang /dashboard cần danh sách này để vẽ "mục đã học / sẽ học tiếp" mà không
    gọi API lấy content_json. Nó phải KHỚP TỪNG KHOÁ với trình duyệt: tiến độ
    trong bài đọc từ bản nháp localStorage, mà bản nháp đánh dấu màn đã xong theo
    chính các khoá này (`draft.done['g-match-0']`…). Lệch một khoá là dashboard
    báo sai số mục. Test `e2e/unit/dashboard-plan.test.mjs` so cả 48 bài với
    `buildScreens()` thật, nên sửa luồng màn ở TS mà quên ở đây thì test đỏ.

    Mỗi màn là [khoá, loại]; loại của màn game là `game.type` (match, fill…).
    """
    play = content.get('play') or {}
    games = play.get('games') or []
    if not games:
        raise SystemExit(f'LỖI: {code} không có play.games — screen_keys chỉ dựng luồng mini-game '
                         '(buildPlayScreens); luồng S1–S4 cũ không còn bài nào dùng.')
    one = content.get('step_1') or {}
    out = []
    if one.get('theory'):
        out.append(['s1-theory', 'theory'])
    if (one.get('brief') or {}).get('task'):
        out.append(['s1-brief', 'brief'])
    elif (one.get('context') or {}).get('body'):
        out.append(['s1-context', 'context'])
    if not play.get('boss'):
        if one.get('explain'):
            out.append(['s1-explain', 'explain'])
        if len((one.get('predict') or {}).get('options') or []) >= 2:
            out.append(['s1-predict', 'predict'])
    for game in games:
        if game['type'] == 'fill' and not ((content.get('step_3') or {}).get('scaffold') or {}).get('slots'):
            continue
        if game['type'] == 'selfExplain' and not ((content.get('step_2') or {}).get('selfExplain') or {}).get('prompt'):
            continue
        out.append([f"g-{game['id']}", game['type']])
    four = content.get('step_4') or {}
    if (four.get('task') or {}).get('body') or four.get('starterCode') or four.get('tests') or four.get('solutionCode'):
        out.append(['s4-sandbox', 'sandbox'])
    if out:
        out.append(['recap', 'recap'])
    return out


def lesson_meta(bundle: dict, modules: list) -> list:
    """Phút, XP, cờ boss và danh sách màn của từng bài — PHẲNG, cùng thứ tự `?lesson=`."""
    rows = sorted(bundle['lessons'], key=lambda r: r['sort_order'])
    titles = [t for m in modules for t in m['lessons']]
    out = []
    for i, row in enumerate(rows):
        # Hai nguồn phải cùng thứ tự: tên bài ở modules[] bắt đầu bằng mã bài.
        if i >= len(titles) or not titles[i].startswith(row['lesson_code'] + ' '):
            raise SystemExit(f'LỖI: bài thứ {i + 1} là {row["lesson_code"]} trong lessons.json nhưng '
                             f'giáo trình ghi "{titles[i] if i < len(titles) else "(thiếu)"}".')
        content = row['content_json']
        out.append({
            'code': row['lesson_code'],
            'minutes': row['estimated_minutes'],
            'xp': row['xp_reward'],
            'boss': bool((content.get('play') or {}).get('boss')),
            'screens': screen_keys(content, row['lesson_code']),
        })
    return out


def main() -> int:
    bundle = json.loads((HERE / 'out-advanced' / 'lessons.json').read_text(encoding='utf-8'))
    if bundle.get('partial') or len(bundle['lessons']) != 48:
        print(f'LỖI: out-advanced chỉ có {len(bundle["lessons"])} bài (bản dựng thiếu) — dựng đủ 48 bài trước.',
              file=sys.stderr)
        return 1
    data = json.loads(TARGET.read_text(encoding='utf-8'))
    data['CURRICULA']['python_advanced'] = json.loads(SOURCE.read_text(encoding='utf-8'))
    # Dữ liệu từng bài cho /dashboard (xem lesson_meta). Khối riêng, không nhét
    # vào modules[].lessons: chỗ đó là MẢNG CHUỖI mà trang khoá, bản đồ, ôn tập
    # đều đang đọc — đổi thành object là vỡ cả ba.
    data.setdefault('LESSON_META', {})['python_advanced'] = lesson_meta(
        bundle, data['CURRICULA']['python_advanced']['modules'])
    dropped = []
    for course in DROPPED_COURSES:
        if data['CURRICULA'].pop(course, None) is not None:
            dropped.append(f'CURRICULA.{course}')
        if data['LESSON_URLS'].pop(course, None) is not None:
            dropped.append(f'LESSON_URLS.{course}')
    TARGET.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    total = sum(len(m['lessons']) for m in data['CURRICULA']['python_advanced']['modules'])
    print(f'✓ CURRICULA.python_advanced = {total} bài; '
          f'đã bỏ {len(dropped)} khối chết: {", ".join(dropped) or "(không còn gì)"}.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
