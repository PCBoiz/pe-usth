"""Dựng KHO ĐỀ HẬU KIỂM CÓ TRỄ từ 3 biến thể trắc nghiệm mà build.py KHÔNG phát.

    py scripts/pe-da/build_posttest.py            # -> src/quizzes/post-test-bank.json
    py scripts/pe-da/build_posttest.py --check    # chỉ kiểm, không ghi

VÌ SAO CÓ FILE NÀY
------------------
Mỗi bài trong `source/practice.json` có 1 gốc câu hỏi + 5 biến thể. `build.py`
phát `SO_CAU_MCQ = 3` câu đầu (gốc + v2 + v3) vào `step_2.mcq` của 172 bài, tức
516 câu, và học viên GẶP chúng ngay trong bài. Ba biến thể còn lại (v4 + v5 +
v6, cũng 516 câu) được GIỮ LẠI có chủ đích.

Giá trị của bộ giữ lại không phải "thi vượt module" mà là BÀI HẬU KIỂM CÓ TRỄ —
nhạc cụ đo duy nhất đợt thử nghiệm này có thể dùng được. Lý do một concept
inventory chuẩn (SCS1) không dùng được ở đây — không có bản dịch tiếng Việt đã
kiểm định, không phủ pandas/matplotlib — lại chính là lý do bộ này dùng được:
đã tiếng Việt, đã khớp mục tiêu khoá, đã chấm Ở SERVER (phần duy nhất của hệ
chấm mà client không giả mạo được), và người học CHƯA TỪNG THẤY nó.

VÌ SAO KHO NẰM Ở PHÍA SERVER, KHÔNG NHỒI VÀO `content_json`
-----------------------------------------------------------
Ba lý do, mỗi lý do một mình đã đủ:
  · `content_json` ĐƯỢC GỬI RA FRONTEND mỗi lần mở bài (`getLessonContent`).
    Đề hậu kiểm nằm trong đó là đáp án đi qua client trước khi người học làm
    bài — hỏng đúng cái tính chất khiến bộ này đáng dùng.
  · nhồi vào `content_json` là phải nạp lại 172 bài vào DB; đường nạp an toàn
    (`scripts/update-lesson-content.ts`) vẫn tốn một transaction hơn trăm câu
    UPDATE trên Neon, và lần nạp 124 bài ngày 27/10 đã hết hạn 5 giây một lần.
  · `lessons.lesson_code` là khoá nối sẵn có, nên kho đọc theo mã bài là đủ —
    không cần thêm cột, không cần thêm bảng.

VÌ SAO DÙNG LẠI `cau_trac_nghiem()` CỦA build.py CHỨ KHÔNG VIẾT LẠI
-------------------------------------------------------------------
Gói dùng `prompt` / `correctOption: '<id>'` / `feedback`; backend
(`normalizeQuestion`) đòi `question` và tìm `options[].correct === true`. Lệch
ở đúng ba tên đó và lệch IM LẶNG: `normalizeQuestion` trả null cho mọi câu
thiếu `question`, nên kho RỖNG mà không ngoại lệ nào được ném, không log nào
đỏ. Viết lại phép đổi tên ở đây là tạo ra bản thứ hai phải khớp — và nó sẽ
lệch. Nên file này IMPORT thẳng hàm của build.py và chỉ tự lo việc CHỌN câu.

KIỂM CHÉO VỚI NGUỒN, KHÔNG KIỂM BẢN DỰNG VỚI CHÍNH NÓ
-----------------------------------------------------
Bài học đã trả giá một lần: ca test backend so `correct` của snapshot với lựa
chọn mang cờ trong BẢN DỰNG — tức so bản dựng với chính nó — và vẫn XANH khi
build.py bị sửa để đánh dấu lựa chọn ĐẦU TIÊN là đúng. Thẩm quyền về đáp án
nằm ở `correctOption` của NGUỒN, nên `kiem_dap_an()` dưới đây so với nguồn.

Và phép kiểm quan trọng nhất — KHÔNG TRÙNG — so với `out/lessons.json`, tức
BẢN DỰNG thật mà học viên nhận, không so với nguồn: giữa nguồn và học viên có
một phép chọn (`SO_CAU_MCQ`) nên kiểm nguồn thì một lần đổi hằng đó không làm
đỏ ở đâu cả.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
# Import build.py để dùng lại NGUYÊN phép đổi tên hình dạng. build.py không có
# tác dụng lề lúc import (mọi thứ nằm trong main()), nên import là an toàn.
sys.path.insert(0, str(HERE))
from build import COURSE_ID, PRACTICE, SO_CAU_MCQ, cau_trac_nghiem  # noqa: E402

BAN_DUNG = HERE / 'out' / 'lessons.json'
DICH = HERE.parent.parent / 'src' / 'quizzes' / 'post-test-bank.json'

# Số câu hậu kiểm MỖI BÀI = số biến thể còn lại sau khi build.py lấy SO_CAU_MCQ
# câu đầu. Không ghi cứng 3: đổi SO_CAU_MCQ là hai bộ tự đi theo nhau, và nếu
# ai đó nâng nó lên 6 thì kho này rỗng và check dưới đây báo thẳng ra.
TONG_BIEN_THE = 6


def cau_giu_lai(mcq: dict) -> list[dict]:
    """Ba câu NGUỒN mà build.py không phát: biến thể thứ SO_CAU_MCQ trở đi."""
    bien_the = list(mcq.get('variants') or [])
    # `[mcq] + bien_the` là thứ tự build.py duyệt, nên phần giữ lại là phần
    # đuôi của CHÍNH danh sách đó.
    return ([mcq] + bien_the)[SO_CAU_MCQ:]


def doi_hinh_dang(giu: list[dict]) -> list[dict]:
    """Đổi tên bằng ĐÚNG `cau_trac_nghiem()` của build.py.

    Hàm đó nhận một câu GỐC rồi tự lấy thêm `variants` của nó, nên ở đây dựng
    một "gốc giả" từ câu giữ lại đầu tiên và treo phần còn lại vào `variants`.
    Vòng vo một chút, nhưng rẻ hơn hẳn việc có bản thứ hai của phép đổi tên.
    """
    if not giu:
        return []
    goc_gia = {**giu[0], 'variants': giu[1:]}
    return cau_trac_nghiem(goc_gia, so_cau=len(giu))


def gan_code(ra: list[dict], giu: list[dict]) -> int:
    """Gấp `code` của nguồn vào CHÍNH đề bài. Trả về số câu đã gấp.

    VÌ SAO BẮT BUỘC: 471/1032 câu của gói mang một trường `code` riêng, và đề
    bài của chúng KHÔNG tự đứng được — PY04-practice-1-v2 chỉ viết "Giá vé từ ô
    nhập là chuỗi. Kết quả ở lệnh print cuối có giá trị nào?", còn ba dòng code
    quyết định đáp án thì nằm ở `code`. `cau_trac_nghiem()` của build.py BỎ
    trường đó (hình dạng `step_2.mcq` không có chỗ cho nó), nên nếu kho này đi
    nguyên theo thì 257/516 câu hậu kiểm là câu không ai trả lời được — và một
    bài hậu kiểm gồm câu không trả lời được thì đo ra con số vô nghĩa, tệ hơn
    là không đo.

    Loại bỏ chúng KHÔNG phải lựa chọn: đo thử thì 44/172 bài mất sạch câu và 62
    bài còn đúng 1 câu. Nên đề bài được dựng thành chuỗi TỰ ĐỦ (đề + dòng
    trống + code). Giao diện hiển thị phải để `white-space: pre-wrap` cho
    `question`, nếu không code dồn thành một dòng.

    Làm Ở ĐÂY, sau phép đổi tên, chứ không sửa `cau_trac_nghiem()`: 516 câu
    đang phát trong bài đã nằm trong DB theo hình dạng cũ, đổi hàm chung là đổi
    cả chúng.
    """
    so = 0
    for q, nguon in zip(ra, giu):
        code = (nguon.get('code') or '').strip()
        if not code:
            continue
        # `cau_trac_nghiem()` nay GẤP SẴN code vào đề (sửa 28/10 — 214/516 câu
        # đang phát trong bài bị mất đoạn code, 90 câu ở 45 bài còn trỏ tới nó).
        # Gấp lần hai thì kho hậu kiểm có đề bài mang code HAI LẦN, và nó vẫn
        # "đúng" với mọi phép kiểm hiện có vì không ca nào đếm số lần code xuất
        # hiện. Nên hàm này giữ lại làm LƯỚI: nó chỉ gấp nếu chưa có.
        if code in q['question']:
            continue
        q['question'] = q['question'].rstrip() + '\n\n' + code
        so += 1
    return so


def kiem_dap_an(ma: str, ra: list[dict], giu: list[dict]) -> list[str]:
    """So bản dựng với NGUỒN: đúng một lựa chọn mang cờ, và đúng lựa chọn đó.

    Ghép theo VỊ TRÍ, và chỉ khi hai danh sách dài bằng nhau.
    `cau_trac_nghiem()` bỏ câu hỏng nên `ra` có thể ngắn hơn `giu` — khi đó
    ghép theo vị trí là so sai cặp, nên hàm báo lỗi và không so nữa.
    Ghép theo `prompt` thì KHÔNG dùng được: trong cùng một bài có những cặp
    biến thể dùng chung một câu dẫn ("Đoạn code dưới đây in gì?") và chỉ khác ở
    `code` — bản đầu của hàm này ghép theo prompt nên 246 lỗi giả nổi lên.
    """
    loi: list[str] = []
    if len(ra) != len(giu):
        return [f'{ma}: dựng ra {len(ra)} câu từ {len(giu)} câu nguồn — có câu hỏng, '
                'không ghép được để kiểm đáp án']
    for q, nguon in zip(ra, giu):
        # Đề bài = `prompt` CỘNG đoạn `code` nếu nguồn có.
        #
        # Luật này từng là `question == prompt` thẳng, và nó đỏ 257 lỗi ngay khi
        # `cau_trac_nghiem()` bắt đầu gấp `code` vào đề (sửa 28/10 — 214/516 câu
        # ĐANG PHÁT trong bài bị mất đoạn code quyết định đáp án, 90 câu ở 45
        # bài còn trỏ tới nó). Phép gấp nay nằm trong hàm chung nên cả hai kho
        # đi theo; `gan_code()` dưới chỉ còn là lưới và báo 0 câu phải gấp.
        de_can = (nguon.get('prompt') or '').rstrip()
        code_nguon = (nguon.get('code') or '').strip()
        if code_nguon:
            de_can = f'{de_can}\n\n{code_nguon}'
        if q['question'] != de_can:
            loi.append(f'{ma}: đề bài lệch nguồn '
                       f'({"prompt + code" if code_nguon else "prompt"})')
        co_co = [i for i, o in enumerate(q['options']) if o.get('correct') is True]
        if len(co_co) != 1:
            loi.append(f'{ma}: câu "{q["question"][:40]}…" có {len(co_co)} lựa chọn mang cờ đúng')
            continue
        lua_chon_nguon = nguon.get('options') or []
        if len(lua_chon_nguon) != len(q['options']):
            loi.append(f'{ma}: số lựa chọn lệch nguồn ({len(q["options"])} vs {len(lua_chon_nguon)})')
            continue
        dung_nguon = next(
            (i for i, o in enumerate(lua_chon_nguon)
             if o.get('id') == nguon.get('correctOption')), -1)
        if dung_nguon != co_co[0]:
            loi.append(
                f'{ma}: đáp án lệch nguồn — bản dựng đánh dấu lựa chọn {co_co[0]}, '
                f'nguồn nói correctOption="{nguon.get("correctOption")}" '
                f'(lựa chọn {dung_nguon})')
        # Nội dung lựa chọn phải đi nguyên văn, không chỉ đúng vị trí: một phép
        # sắp xếp lại lặng lẽ cũng làm "đúng vị trí" mà sai câu trả lời.
        for i, (a, b) in enumerate(zip(q['options'], lua_chon_nguon)):
            if a.get('text') != (b.get('text') or ''):
                loi.append(f'{ma}: lựa chọn {i} lệch nội dung nguồn')
    return loi


def kiem_khong_trung(kho: list[dict], trong_bai: dict[str, list[dict]]) -> list[str]:
    """Không câu nào của kho trùng câu ĐANG PHÁT trong bài. Đây là TOÀN BỘ giá
    trị của bộ này: trùng một câu là đo lại thứ người học vừa đọc đáp án.

    So theo HAI dấu: `question` (đề bài) và bộ nội dung lựa chọn. Chỉ so đề bài
    là bỏ sót trường hợp hai biến thể dùng chung một câu dẫn với lựa chọn khác;
    chỉ so lựa chọn là bỏ sót trường hợp ngược lại.
    """
    loi: list[str] = []
    for muc in kho:
        ma = muc['lesson_code']
        bai = trong_bai.get(ma) or []
        de_bai = {q.get('question') for q in bai}
        lua_chon = {tuple(o.get('text') for o in (q.get('options') or [])) for q in bai}
        for q in muc['questions']:
            if q['question'] in de_bai:
                loi.append(f'{ma}: đề bài "{q["question"][:50]}…" ĐÃ phát trong bài')
            khoa = tuple(o.get('text') for o in q['options'])
            if khoa in lua_chon:
                loi.append(f'{ma}: bộ lựa chọn {khoa} ĐÃ phát trong bài')
    return loi


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='chỉ kiểm, không ghi file')
    args = ap.parse_args()

    tho = PRACTICE.read_bytes()
    nguon = json.loads(tho.decode('utf-8'))

    # Bản dựng thật — nguồn duy nhất nói được "học viên ĐÃ thấy câu nào".
    if not BAN_DUNG.is_file():
        print(f'THIẾU {BAN_DUNG}: chạy `py scripts/pe-da/build.py` trước, '
              'phép kiểm KHÔNG TRÙNG cần bản dựng thật.', file=sys.stderr)
        return 1
    dung = json.loads(BAN_DUNG.read_text(encoding='utf-8'))
    trong_bai = {b['lesson_code']: b['content_json'].get('step_2', {}).get('mcq', [])
                 for b in dung['lessons']}

    kho: list[dict] = []
    loi: list[str] = []
    so_gap_code = 0
    for l in nguon['lessons']:
        ma = l['id']
        hoat_dong = (l.get('mcq') or [None])[0]
        if not hoat_dong:
            loi.append(f'{ma}: không có hoạt động trắc nghiệm nào')
            continue
        tong = 1 + len(hoat_dong.get('variants') or [])
        if tong != TONG_BIEN_THE:
            loi.append(f'{ma}: nguồn có {tong} câu, chờ {TONG_BIEN_THE}')
        giu = cau_giu_lai(hoat_dong)
        if not giu:
            loi.append(f'{ma}: không còn câu nào sau khi build.py lấy {SO_CAU_MCQ} câu đầu')
            continue
        ra = doi_hinh_dang(giu)
        loi += kiem_dap_an(ma, ra, giu)
        so_gap_code += gan_code(ra, giu)
        if not ra:
            loi.append(f'{ma}: mọi câu giữ lại đều hỏng, bài này không có đề hậu kiểm')
            continue
        kho.append({
            'lesson_code': ma,
            'title': l.get('title') or '',
            # `id` của nguồn chỉ để truy vết (đối chiếu lại gói khi có bản mới).
            # `normalizeQuestion` không đọc nó và `stripAnswers` chỉ phát
            # index/question/options, nên nó không bao giờ ra tới client.
            'source_ids': [q.get('id') for q in giu],
            'questions': ra,
        })

    so_cau = sum(len(m['questions']) for m in kho)
    loi += kiem_khong_trung(kho, trong_bai)

    print(f'{len(kho)} bài · {so_cau} câu hậu kiểm '
          f'(giữ lại từ câu thứ {SO_CAU_MCQ + 1} trở đi của mỗi bài) · '
          f'{so_gap_code} câu phải gấp `code` vào đề bài')
    print(f'đang phát trong bài: {sum(len(v) for v in trong_bai.values())} câu · '
          f'trùng nhau: {"CÓ — xem lỗi" if loi else "0 câu"}')

    if loi:
        for d in loi[:40]:
            print('LỖI', d, file=sys.stderr)
        print(f'tổng {len(loi)} lỗi', file=sys.stderr)
        return 1

    if args.check:
        return 0

    ra = {
        'schema': 'post-test-bank/v1',
        'course_id': COURSE_ID,
        # sha256 của NGUỒN: khi gói practice có bản mới, con số này đổi và biết
        # ngay là phải dựng lại kho.
        'practice_sha256': hashlib.sha256(tho).hexdigest(),
        'held_back_from': SO_CAU_MCQ,
        'lessons': kho,
    }
    DICH.write_text(json.dumps(ra, ensure_ascii=False, indent=1) + '\n',
                    encoding='utf-8')
    print(f'✓ ghi vào {DICH}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
