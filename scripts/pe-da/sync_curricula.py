"""Chép giáo trình 172 bài pe-da vào frontend/src/lib/curricula.json.

    py scripts/pe-da/sync_curricula.py

Trang chủ và trang khoá học đọc file TĨNH này, không gọi `/api/courses` (route đó
đòi JWT, khách gọi là 401 — xem bẫy "hai nguồn danh sách bài" trong AGENTS.md).
Nội dung bài thì lấy từ DB. Dựng lại pe-da mà quên bước chép này thì trang khoá
học hiện giáo trình cũ trong khi bài học đã là bộ mới: hai con số trên cùng một
màn hình nói hai chuyện khác nhau.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TARGET = HERE.parent.parent / 'frontend' / 'src' / 'lib' / 'curricula.json'
SOURCE = HERE / 'out' / 'curriculum-python-advanced.json'
BUNDLE = HERE / 'out' / 'lessons.json'


def main() -> int:
    if not BUNDLE.is_file():
        print('LỖI: chưa dựng — chạy `py scripts/pe-da/build.py` trước.', file=sys.stderr)
        return 1
    bai = json.loads(BUNDLE.read_text(encoding='utf-8'))['lessons']
    if len(bai) != 172:
        print(f'LỖI: out/ chỉ có {len(bai)} bài (bản dựng thiếu) — dựng đủ 172 bài trước.',
              file=sys.stderr)
        return 1

    data = json.loads(TARGET.read_text(encoding='utf-8'))
    data['CURRICULA']['python_advanced'] = json.loads(SOURCE.read_text(encoding='utf-8'))
    TARGET.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    tong = sum(len(m['lessons']) for m in data['CURRICULA']['python_advanced']['modules'])
    phut = sum(b['estimated_minutes'] for b in bai)
    print(f'✓ CURRICULA.python_advanced = {tong} bài, {phut} phút ≈ {phut / 60:.1f} giờ.')
    print('  Nhớ sửa `duration` và `lessons` trong frontend/src/lib/catalog.ts cho khớp.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
