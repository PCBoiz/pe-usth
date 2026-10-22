"""Chép giáo trình 48 bài pe-v4 vào frontend/src/lib/curricula.json (khối CURRICULA.python_advanced).

Trang khoá học và trang chủ đọc file tĩnh này (không gọi API — xem bẫy "hai nguồn
danh sách bài" trong AGENTS.md), nên sau mỗi lần dựng lại pe-v4 phải chạy bước này,
nếu không trang khoá học hiện giáo trình cũ trong khi bài học lấy từ DB.

Khoá `python` cơ bản đã gỡ khỏi trang web: script này cũng bỏ khối CURRICULA.python
và LESSON_URLS.python nếu còn.

    py scripts/pe-v4/sync_curricula.py
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TARGET = HERE.parent.parent / 'frontend' / 'src' / 'lib' / 'curricula.json'
SOURCE = HERE / 'out-advanced' / 'curriculum-python-advanced.json'


def main() -> int:
    bundle = json.loads((HERE / 'out-advanced' / 'lessons.json').read_text(encoding='utf-8'))
    if bundle.get('partial') or len(bundle['lessons']) != 48:
        print(f'LỖI: out-advanced chỉ có {len(bundle["lessons"])} bài (bản dựng thiếu) — dựng đủ 48 bài trước.',
              file=sys.stderr)
        return 1
    data = json.loads(TARGET.read_text(encoding='utf-8'))
    data['CURRICULA']['python_advanced'] = json.loads(SOURCE.read_text(encoding='utf-8'))
    data['CURRICULA'].pop('python', None)
    data['LESSON_URLS'].pop('python', None)
    TARGET.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    total = sum(len(m['lessons']) for m in data['CURRICULA']['python_advanced']['modules'])
    print(f'✓ CURRICULA.python_advanced = {total} bài; đã bỏ khối python.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
