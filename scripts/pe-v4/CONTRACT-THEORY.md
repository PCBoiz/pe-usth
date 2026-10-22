# Hợp đồng khối lý thuyết + hình (pe-v4)

Hợp đồng giữa **người soạn bài** (`scripts/pe-v4/lessons_*.py`), **người vẽ hình**
(`frontend/public/static/anim/*.svg`) và **hai bộ kiểm** đang thi hành nó:
`scripts/pe-v4/build.py` (phần dữ liệu bài) và `scripts/pe-v4/anim/check.py` (phần file
SVG). Mọi con số dưới đây là hằng số trong hai file đó — sửa ở đây mà không sửa code thì
tài liệu sai, sửa code mà không sửa ở đây thì người soạn bài làm theo con số cũ.

## 1. Khai trong dict bài

```python
dict(
    code='P01', ...,
    theory=[                                   # 3–5 khối
        dict(h='Định nghĩa: process', body='…'),
        dict(h='Dùng ở đâu', bullets=['…', '…']),
        dict(h='Đọc sơ đồ', figure='P01-program-vs-process', body='…'),
        dict(h='Cây process', figure='P01-process-tree', bullets=['…']),
    ],
    figure=[                                   # dict, hoặc list 1–2 dict; phần tử đầu là hình CHÍNH
        dict(name='P01-program-vs-process', caption='…', alt='…'),
        dict(name='P01-process-tree', caption='…', alt='…'),
    ],
    slides='SL 15-16',                         # tuỳ chọn: trang slide gốc của giảng viên
)
```

Quy ước là bài M1–M3 (P, T, G, R02) khai `theory`; bài không khai thì build giữ nguyên
như cũ và frontend không mọc thêm màn.

### Khối `theory` (`build.py: theory_blocks`)

| Trường | Ràng buộc | Hằng số |
|---|---|---|
| số khối | 3–5 | `THEORY_MIN_BLOCKS`, `THEORY_MAX_BLOCKS` |
| `h` | bắt buộc, ≤ 40 ký tự | `THEORY_H_MAX` |
| `body` | tuỳ chọn, ≤ 400 ký tự | `THEORY_BODY_MAX` |
| `bullets` | tuỳ chọn, list 1–5 chuỗi không rỗng, mỗi chuỗi ≤ 160 ký tự | `THEORY_BULLETS_MAX`, `THEORY_BULLET_MAX` |
| `figure` | tuỳ chọn, TÊN một hình đã khai ở `figure` của bài | — |

Mỗi khối phải có `body` hoặc `bullets` (hoặc cả hai). Khoá khác bốn khoá trên là lỗi —
gõ nhầm `bullet=` sẽ không lặng lẽ rơi mất. Vì sao giới hạn chặt: màn lý thuyết là MỘT
thẻ; chữ dài hơn thì thẻ tràn và học viên lướt qua.

### `figure` của bài (`build.py: figure_list`, `figure_block`)

| Trường | Ràng buộc | Hằng số |
|---|---|---|
| số hình | 1–2 (`dict` hoặc `list`) | `FIGURES_MAX` |
| `name` | chữ/số/`._-`, không `/` — nó thành tên file `<name>.svg` | `FIGURE_NAME_RE` |
| `caption` | bắt buộc, ≤ 90 ký tự (in dưới hình trong sổ tay) | `FIGURE_CAPTION_MAX` |
| `alt` | bắt buộc, ≤ 200 ký tự (cho trình đọc màn hình) | `FIGURE_ALT_MAX` |

Luật nối hình với khối:

1. Có `theory` thì phải có `figure`; có `figure` mà không có `theory` là lỗi (hình không
   có chỗ hiện).
2. Mỗi hình hiện ở **đúng một** khối: hai khối cùng `figure='X'` là lỗi.
3. Hình khai mà **không khối nào mang** là lỗi — nó sẽ không bao giờ lên màn hình.
4. Tên hai hình trong một bài không được trùng.
5. Thiếu file `frontend/public/static/anim/<name>.svg` chỉ là CẢNH BÁO (người soạn bài
   không phải chờ hình), trừ khi chạy `py scripts/pe-v4/build.py --strict`.

Luật 3 chỉ thấy hình ĐÃ KHAI. Hình vẽ xong mà chưa bài nào khai thì build.py không biết
nó tồn tại — đó là việc của `anim/check.py --strict` (mục 3).

### Đầu ra trong `content_json`

- `step_1.theory`: list `{title, body, bullets, figure}`; `figure` của khối là
  `{src, caption, alt}` hoặc `null`. `src` = `/static/anim/<name>.svg`.
- `step_1.figure`: hình CHÍNH `{name, src, caption, alt}` — màn `explain` và sổ tay dùng
  nó khi bài không có màn lý thuyết.
- `source.slides`: chuỗi `slides` (≤ 80 ký tự) hoặc `null`.

`build_advanced.py` chép nguyên `content_json` sang gói `out-advanced/` (thêm `play`), nên
mọi khoá trên đi thẳng vào DB.

## 2. File SVG (`anim/check.py`)

Hình hiện bằng `<img src="/static/anim/….svg">`. Trong `<img>`, SVG là tài liệu độc lập:
không chạy script, không tải tài nguyên ngoài. Một hình vi phạm các luật dưới đây vẫn
TRÔNG ĐÚNG khi mở thẳng file, nhưng hỏng trong bài học.

- Gốc là `<svg>`, `width="1280" height="640" viewBox="0 0 1280 640"` — sổ tay chụp PNG
  đúng tỉ lệ này.
- ≤ 120 KB.
- Không `<script>`, không `<foreignObject>`, không SMIL (`<animate>`, `<set>`, …). Hoạt hình
  chỉ bằng CSS trong chính file, vì CSS tắt được bằng `prefers-reduced-motion`.
- Không `href`/`url(…)` ra ngoài (chỉ `#id` nội bộ hoặc `data:`), không `@font-face`.
- Mọi `font-family` kết thúc bằng một họ chung (`sans-serif`, `monospace`, …).
- Có khối `@media (prefers-reduced-motion: reduce)`, và ở chế độ đó hình đứng ở TRẠNG THÁI
  HOÀN CHỈNH: `anim/shot.mjs` chụp PNG cho sổ tay đúng ở chế độ này.

## 3. Hình phải được bài dùng

`py scripts/pe-v4/anim/check.py --strict` đếm hình theo gói thật được nạp DB,
`out-advanced/lessons.json`, và:

- FAIL nếu một SVG không bài nào tham chiếu, trừ khi tên nằm trong `ALLOW_ORPHAN_LY_DO`
  kèm lý do và điều kiện gỡ (hiện chỉ `P03-round-robin`, lệch số liệu với bài P03);
- FAIL (kể cả không `--strict`) nếu hình trong `out-advanced/` khác `out/` — tức đã chạy
  `build.py` mà quên `build_advanced.py`.

Bước này chạy trong CI (job `hinh-ly-thuyet` của `.github/workflows/ci.yml`).
