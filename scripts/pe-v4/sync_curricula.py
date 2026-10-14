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


def main() -> int:
    bundle = json.loads((HERE / 'out-advanced' / 'lessons.json').read_text(encoding='utf-8'))
    if bundle.get('partial') or len(bundle['lessons']) != 48:
        print(f'LỖI: out-advanced chỉ có {len(bundle["lessons"])} bài (bản dựng thiếu) — dựng đủ 48 bài trước.',
              file=sys.stderr)
        return 1
    data = json.loads(TARGET.read_text(encoding='utf-8'))
    data['CURRICULA']['python_advanced'] = json.loads(SOURCE.read_text(encoding='utf-8'))
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
