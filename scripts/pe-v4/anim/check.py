#!/usr/bin/env python3
"""Kiểm hình SVG của khoá pe-v4 (frontend/public/static/anim/*.svg).

Vì sao cần: hình được nhúng bằng `<img src="/static/anim/....svg">`. Trong `<img>`,
SVG chạy ở chế độ "tài liệu độc lập, không script, không tải tài nguyên ngoài" —
nên một hình dùng `<script>`, webfont hay `<image href="https://…">` sẽ TRÔNG ĐÚNG
khi mở trực tiếp bằng trình duyệt mà HỎNG trong bài học. Checker này bắt đúng nhóm
lỗi đó, cộng các quy ước của scripts/pe-v4/CONTRACT-THEORY.md (mục 2–3).

Checker này cũng đếm số hình THỰC SỰ được bài tham chiếu. Vì sao: "23/23 hình PASS"
từng che mất việc chỉ 20 hình được nối vào bài — ba hình (P01-process-tree,
P02-fork-exec-wait, P03-round-robin) vẽ xong, kiểm đạt, mà không bài nào khai nên
không bao giờ lên màn hình.

Đếm theo out-advanced/lessons.json — gói mà scripts/seed-python-advanced-v4.ts và
scripts/update-lesson-content.ts nạp vào DB — chứ không theo out/lessons.json. Bản cũ
đọc out/: chạy build.py mà quên build_advanced.py thì out/ đã có hình mới còn gói
được seed thì chưa, vậy mà checker vẫn báo đủ. Nay đọc cả hai và so từng bài; lệch là
FAIL (kể cả không có --strict), vì lệch nghĩa là thứ sắp nạp vào DB khác nguồn.

Chạy:
    py scripts/pe-v4/anim/check.py                  # kiểm mọi hình
    py scripts/pe-v4/anim/check.py P02-lifecycle    # kiểm một/vài hình (tên hoặc đường dẫn)
    py scripts/pe-v4/anim/check.py --quiet          # chỉ in hình FAIL
    py scripts/pe-v4/anim/check.py --strict         # hình không bài nào dùng cũng là lỗi

Trả 0 khi tất cả PASS, 1 khi có hình FAIL (hoặc không tìm thấy hình nào).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
ANIM_DIR = ROOT / 'frontend' / 'public' / 'static' / 'anim'
# Gói THẬT được nạp vào DB (build_advanced.py sinh). Đây là nguồn để đếm.
BUNDLE_JSON = HERE.parent / 'out-advanced' / 'lessons.json'
# Bản dựng trung gian của build.py; chỉ dùng để phát hiện gói ở trên đã cũ.
BUILD_JSON = HERE.parent / 'out' / 'lessons.json'

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


# Hình CỐ Ý chưa gắn vào bài nào, kèm lý do. Danh sách này phải NGẮN và mỗi dòng
# phải nói rõ điều kiện gỡ ra — nếu không nó thành chỗ chôn hình hỏng.
ALLOW_ORPHAN_LY_DO = {
    'P03-round-robin': 'hình vẽ P3 cần 2 đơn vị (P3 xong t=6, P2 t=9, P1 t=10) trong khi '
                       'bài P03 dùng ("P3", 1) → lịch thật P1 0–2, P2 2–4, P3 4–5 và đáp án '
                       'câu dự đoán là "P3, lúc 5". Vẽ lại cho khớp rồi gỡ khỏi danh sách này.',
}
ALLOW_ORPHAN = set(ALLOW_ORPHAN_LY_DO)


def rel(path: Path) -> str:
    """Đường dẫn để in: tương đối so với gốc repo nếu được, không thì để nguyên."""
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def figures_by_lesson(path: Path) -> dict[str, list[str]] | None:
    """{mã bài: [tên hình, theo thứ tự xuất hiện]} đọc từ một gói lessons.json.

    Lấy cả hình chính (`step_1.figure`) lẫn hình của từng khối theory. Trả None khi
    chưa dựng (không có file) — người vẽ hình chạy checker trước khi bài được dựng lại
    là chuyện thường, nên khi đó chỉ bỏ qua phần đếm.
    """
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding='utf-8'))
    out: dict[str, list[str]] = {}

    for row in data.get('lessons') or []:
        one = (row.get('content_json') or {}).get('step_1') or {}
        srcs = [(one.get('figure') or {}).get('src')]
        srcs += [(block.get('figure') or {}).get('src') for block in one.get('theory') or []]
        # Hình chính cũng nằm ở một khối theory nên sẽ gặp hai lần — bỏ trùng, giữ thứ tự.
        out[str(row.get('lesson_code'))] = list(dict.fromkeys(
            src.rsplit('/', 1)[-1][:-4] for src in srcs if isinstance(src, str) and src.endswith('.svg')))
    return out


def bundle_drift(bundle: dict[str, list[str]], build: dict[str, list[str]]) -> list[str]:
    """Các bài mà hình trong gói out-advanced khác hình trong out/ — tức gói đã cũ."""
    lines = []
    for code in sorted(set(bundle) | set(build)):
        a, b = bundle.get(code), build.get(code)
        if a is None or b is None:
            lines.append(f'{code}: chỉ có trong {"out/" if a is None else "out-advanced/"}')
        elif sorted(a) != sorted(b):
            lines.append(f'{code}: out-advanced dùng {", ".join(a) or "(không hình)"}; '
                         f'out/ dùng {", ".join(b) or "(không hình)"}')
    return lines


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
    ap.add_argument('--strict', action='store_true',
                    help='Coi hình không bài nào tham chiếu là lỗi (dùng trước khi deploy).')
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

    # Hình đạt mọi quy ước vẫn có thể vô dụng nếu không bài nào trỏ tới nó. In số hình
    # ĐƯỢC DÙNG ngay cạnh số hình PASS để không ai đọc "23/23 PASS" thành "23 hình lên bài".
    bundle = figures_by_lesson(BUNDLE_JSON)
    build = figures_by_lesson(BUILD_JSON)
    if bundle is not None and build is not None:
        drift = bundle_drift(bundle, build)
        if drift:
            print(f'FAIL: {rel(BUNDLE_JSON)} lệch {rel(BUILD_JSON)} ở '
                  f'{len(drift)} bài — chạy lại py scripts/pe-v4/build_advanced.py:')
            for line in drift:
                print(f'       - {line}')
            failed += 1
    if bundle is None:
        print(f'(chưa có {rel(BUNDLE_JSON)} — không đếm được hình nào được bài dùng)')
    else:
        used = {name for names in bundle.values() for name in names}
        names = {path.stem for path in paths}
        orphan = sorted(names - used)
        print(f'{len(names) - len(orphan)}/{len(names)} hình được bài tham chiếu (theo {rel(BUNDLE_JSON)})'
              + (f', {len(orphan)} chưa bài nào dùng: {", ".join(orphan)}' if orphan else ''))
        con_lai = sorted(set(orphan) - ALLOW_ORPHAN)
        if con_lai and args.strict:
            print('FAIL: --strict coi hình chưa bài nào dùng là lỗi (khai figure=… ở một khối theory): '
                  + ', '.join(con_lai))
            failed += 1
        for ten in sorted(set(orphan) & ALLOW_ORPHAN):
            print(f'  (bỏ qua có chủ đích) {ten}: {ALLOW_ORPHAN_LY_DO[ten]}')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
