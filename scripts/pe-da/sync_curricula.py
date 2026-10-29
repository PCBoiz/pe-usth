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
# Gói NGUỒN — dùng để biết bản dựng có đủ bài hay không. Xem `main()`.
GOI_NGUON = HERE / 'source' / 'course.json'


def main() -> int:
    if not BUNDLE.is_file():
        print('LỖI: chưa dựng — chạy `py scripts/pe-da/build.py` trước.', file=sys.stderr)
        return 1
    bai = json.loads(BUNDLE.read_text(encoding='utf-8'))['lessons']
    # Số bài phải khớp GÓI NGUỒN, không khớp một con số ghi cứng ở đây.
    #
    # Dòng này từng là `if len(bai) != 172`, và nó chặn đúng việc thêm module
    # 11: bản dựng ra 179 bài thì script từ chối với câu "bản dựng thiếu" —
    # tức một con số cũ nói ngược sự thật, đúng cái bẫy mà AGENTS.md gọi là
    # "một con số cũ trong bảng không phải chú thích lỗi thời vô hại". Luật vẫn
    # có răng vì nó so với một NGUỒN KHÁC: build.py đọc `source/course.json`,
    # và một bản dựng cũ (hoặc dựng dở) sẽ lệch với nó ngay.
    can = len(json.loads(GOI_NGUON.read_text(encoding='utf-8'))['lessons'])
    if len(bai) != can:
        print(f'LỖI: out/ có {len(bai)} bài nhưng source/course.json có {can} '
              f'— dựng lại bằng `py scripts/pe-da/build.py` trước.',
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
