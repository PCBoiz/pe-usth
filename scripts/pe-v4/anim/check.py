#!/usr/bin/env python3
"""Kiểm hình SVG của khoá pe-v4 (frontend/public/static/anim/*.svg).

Vì sao cần: hình được nhúng bằng `<img src="/static/anim/....svg">`. Trong `<img>`,
SVG chạy ở chế độ "tài liệu độc lập, không script, không tải tài nguyên ngoài" —
nên một hình dùng `<script>`, webfont hay `<image href="https://…">` sẽ TRÔNG ĐÚNG
khi mở trực tiếp bằng trình duyệt mà HỎNG trong bài học. Checker này bắt đúng nhóm
lỗi đó, cộng các quy ước của CONTRACT-THEORY.md.

Chạy:
    py scripts/pe-v4/anim/check.py                  # kiểm mọi hình
    py scripts/pe-v4/anim/check.py P02-lifecycle    # kiểm một/vài hình (tên hoặc đường dẫn)
    py scripts/pe-v4/anim/check.py --quiet          # chỉ in hình FAIL

Trả 0 khi tất cả PASS, 1 khi có hình FAIL (hoặc không tìm thấy hình nào).
"""
from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
ANIM_DIR = ROOT / 'frontend' / 'public' / 'static' / 'anim'

SVG_NS = 'http://www.w3.org/2000/svg'
XLINK_NS = 'http://www.w3.org/1999/xlink'

WIDTH, HEIGHT = 1280, 640
MAX_BYTES = 120 * 1024

# Họ font chung: `font-family` phải kết thúc bằng một trong các tên này, vì máy học
# viên không chắc có 'Segoe UI' hay 'Cascadia Mono'.
GENERIC_FAMILIES = {'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
                    'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded'}

# Thuộc tính có thể trỏ ra ngoài (ảnh, font, tài liệu khác).
EXTERNAL_RE = re.compile(r'''(?:xlink:)?href\s*=\s*["']([^"']+)["']''')
# Hai dạng khai font: thuộc tính `font-family="…"` và khai báo CSS `font-family: …;`.
# Tách riêng vì dấu nháy trong danh sách font ('Segoe UI') làm một regex gộp cắt sớm,
# bỏ mất chính phần fallback cần kiểm.
FONT_ATTR_RE = re.compile(r'''font-family\s*=\s*(["'])(.*?)\1''', re.S)
FONT_CSS_RE = re.compile(r'font-family\s*:\s*([^;}<>]+)')
URL_RE = re.compile(r'url\(\s*["\']?([^)"\']+)')
REDUCED_MOTION_RE = re.compile(r'@media[^{]*prefers-reduced-motion\s*:\s*reduce')


def local_name(tag: str) -> str:
    return tag.rsplit('}', 1)[-1] if '}' in tag else tag


def check_size(root: ET.Element) -> list[str]:
    """Khổ cố định 1280x640: sổ tay chụp PNG theo đúng tỉ lệ này, lệch là hình bị méo."""
    problems = []
    for attr, want in (('width', WIDTH), ('height', HEIGHT)):
        got = (root.get(attr) or '').strip()
        if got.endswith('px'):
            got = got[:-2]
        if got != str(want):
            problems.append(f'{attr}="{got or "(thiếu)"}" — phải là "{want}"')
    box = (root.get('viewBox') or '').replace(',', ' ').split()
    if [b.lstrip('+') for b in box] != ['0', '0', str(WIDTH), str(HEIGHT)]:
        problems.append(f'viewBox="{root.get("viewBox") or "(thiếu)"}" — phải là "0 0 {WIDTH} {HEIGHT}"')
    return problems


def check_tree(root: ET.Element) -> list[str]:
    problems = []
    for el in root.iter():
        name = local_name(el.tag)
        if name == 'script':
            problems.append('có <script> — `<img>` không chạy script, hình sẽ đứng im hoặc hỏng')
        if name == 'foreignObject':
            problems.append('có <foreignObject> — không hiển thị đáng tin trong `<img>`')
        # SMIL: Chromium còn hỗ trợ nhưng hợp đồng chốt CSS, vì CSS tắt được bằng
        # prefers-reduced-motion còn SMIL thì không.
        if name in ('animate', 'animateTransform', 'animateMotion', 'set', 'mpath'):
            problems.append(f'có <{name}> (SMIL) — chỉ dùng animation bằng CSS')
    return problems


def check_text(text: str) -> list[str]:
    problems = []

    for raw in EXTERNAL_RE.findall(text):
        target = raw.strip()
        if target.startswith('#') or target.startswith('data:'):
            continue  # trỏ nội bộ (<use href="#id">) hoặc data: URI nhúng sẵn
        problems.append(f'href ra ngoài: {target[:80]!r} — `<img>` không tải tài nguyên ngoài')
    for raw in URL_RE.findall(text):
        target = raw.strip()
        if not target.startswith('#') and not target.startswith('data:'):
            problems.append(f'url(…) ra ngoài: {target[:80]!r}')
    if '@font-face' in text:
        problems.append('có @font-face — webfont không nạp được trong `<img>`')

    declarations = [m[1] for m in FONT_ATTR_RE.findall(text)] + FONT_CSS_RE.findall(text)
    for raw in declarations:
        families = [f.strip().strip('\'"').lower() for f in raw.split(',') if f.strip()]
        if not families:
            continue
        if families[-1] not in GENERIC_FAMILIES:
            problems.append(f'font-family "{raw.strip()}" thiếu fallback chung '
                            f'(kết thúc bằng {" / ".join(sorted(GENERIC_FAMILIES))})')

    has_animation = re.search(r'@keyframes|animation\s*:', text) is not None
    if not REDUCED_MOTION_RE.search(text):
        problems.append('thiếu khối @media (prefers-reduced-motion: reduce) — '
                        'người tắt hiệu ứng vẫn thấy hình nhảy'
                        + ('' if has_animation else '; hình tĩnh cũng phải khai để nhất quán'))
    return problems


def check_file(path: Path) -> list[str]:
    problems = []
    data = path.read_bytes()
    if len(data) > MAX_BYTES:
        problems.append(f'{len(data) / 1024:.0f} KB > {MAX_BYTES // 1024} KB — nặng, bài tải chậm')
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError as err:
        return problems + [f'không phải UTF-8: {err}']
    try:
        root = ET.fromstring(text)
    except ET.ParseError as err:
        return problems + [f'XML không hợp lệ: {err}']
    if local_name(root.tag) != 'svg':
        return problems + [f'phần tử gốc là <{local_name(root.tag)}>, phải là <svg>']
    return problems + check_size(root) + check_tree(root) + check_text(text)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('names', nargs='*', help='Tên hình (P02-lifecycle) hoặc đường dẫn .svg; bỏ trống = tất cả.')
    ap.add_argument('--quiet', '-q', action='store_true', help='Chỉ in hình FAIL.')
    args = ap.parse_args(argv)
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass

    if args.names:
        paths = []
        for name in args.names:
            path = Path(name)
            if not path.suffix:
                path = ANIM_DIR / f'{name}.svg'
            elif not path.is_absolute() and not path.exists():
                path = ANIM_DIR / path.name
            if not path.exists():
                print(f'FAIL {name}: không có file {path}')
                return 1
            paths.append(path)
    else:
        paths = sorted(ANIM_DIR.glob('*.svg'))
        if not paths:
            print(f'Không có hình nào trong {ANIM_DIR} — chưa vẽ hình thì chưa có gì để kiểm.')
            return 1

    failed = 0
    for path in paths:
        problems = check_file(path)
        if problems:
            failed += 1
            print(f'FAIL {path.name}')
            for p in problems:
                print(f'       - {p}')
        elif not args.quiet:
            print(f'PASS {path.name}  ({path.stat().st_size / 1024:.0f} KB)')
    print(f'{len(paths) - failed}/{len(paths)} hình PASS' + (f', {failed} FAIL' if failed else ''))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
