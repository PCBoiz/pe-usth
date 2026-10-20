// LỚP CON TRỎ — bước 1 của `design/v3/tuong-tac-ban-do.md` §6.1–§6.2:
// "con trỏ phải có mặt trong bức tranh".
//
// Nghiên cứu ngày 19/10/2026 lật ngược tiền đề của lời chê thứ tư ("chưa có tí
// animation nào"): màn bản đồ của Echo of Starsong ĐỨNG YÊN, và cảm xúc ở đó
// đến từ việc người chơi VẬN HÀNH MỘT KHÍ CỤ — rê một vòng ngắm, dò, rồi quyết.
// Nên tệp này không thêm một hiệu ứng nền nào. Nó thêm một thiết bị.
//
// ── SÁU ĐIỀU GIỮ Ở ĐÂY ────────────────────────────────────────────────
//
//  1. CHUYỂN ĐỘNG KHÔNG BAO GIỜ VÀO TRONG TÀI LIỆU SVG. `figure-motion.ts` đã
//     trả giá cho đúng chuyện đó: animation CSS bên trong một SVG nhúng bằng
//     `<img>` KHÔNG được đưa lên compositor — đo được 2 007 ms main thread
//     (19% trace) cho HAI hình, ~103 lượt tính lại style mỗi giây, và cuộn ra
//     ngoài khung nhìn cũng không rẻ hơn. Bản đồ này có MƯỜI HAI tấm phủ kín
//     khung. Nên mọi thứ ở đây là HTML chồng lên, và chỉ `opacity`/`translate`.
//
//  2. KHÔNG `style={{…}}`. SSR tuần tự hoá style nội tuyến thành thuộc tính
//     `style="…"` — một trong hai nguyên nhân `style-src 'unsafe-inline'` chưa
//     bỏ được (AGENTS.md). Toạ độ con trỏ đi vào CSS bằng `style.setProperty`
//     LÚC CHẠY, tức qua CSSOM: `style-src` không chi phối CSSOM (nó chi phối
//     thuộc tính `style` có trong MARKUP và thẻ `<style>`), nên cách này không
//     thêm một byte nợ nào cho việc bỏ `unsafe-inline`. Vị trí TĨNH của 48 dấu
//     ngôi thì là CSS thật, sinh bởi `build_sky.py --css`.
//
//  3. 48 DẤU NGÔI KHÔNG PHẢI VÙNG CHẠM. Đo được: hai ngôi gần nhau nhất cách
//     48,4 px trong khung 1360 (T02–T03), tức ~38 px CSS ở bề rộng khung thật
//     — vùng chạm 44 px sẽ CHỒNG NHAU. Nên chúng `pointer-events: none`, và
//     vùng chạm vẫn là tám ô bao lồi của `StarMap.tsx` (ô nhỏ nhất vẫn rộng 6,8%
//     × 4,9% khung ≈ 73 × 40 px). Chuột và ngón tay không thấy 48 ngôi;
//     CON TRỎ thì thấy (ngôi gần nhất tự nhận mình), và BÀN PHÍM thì thấy
//     (mũi tên đi giữa các ngôi) — đó là hai đường mà một ô bấm không làm được.
//
//  4. MÁY CHẠM KHÔNG GẮN MỘT LISTENER CON TRỎ NÀO. Không có con trỏ thì không
//     có gì để dò; thêm listener chỉ để nó không bao giờ chạy là tốn pin và
//     tốn một đường mã không ai đi. Hai listener TIÊU ĐIỂM thì vẫn gắn — một
//     chiếc điện thoại cắm bàn phím phải đi được. Đường dùng được trên điện
//     thoại: chạm một chòm là phóng vào chặng, và chỗ nối một dòng bảng với
//     một ngôi là CON SỐ thứ tự in ở cả hai chỗ (`STAR_COPY.zoomNote` nói ra
//     điều đó) — chữ, không phải hover.
//
//  5. TIẾT LỘ CÓ THỨ TỰ LÀ CSS THUẦN, không phải JS. `.frame:has(.hitM1:hover)
//     …` làm cả việc đó, nên nó chạy khi JS chưa tải xong, và `:focus-visible`
//     cho ra ĐÚNG cùng trạng thái. JS ở đây chỉ thêm ba thứ mà CSS không với
//     tới: toạ độ con trỏ, ngôi gần nhất, và mũi tên.
//
//  6. KHÔNG `cursor: none`. Con trỏ hệ điều hành là cái duy nhất tôn trọng cỡ
//     con trỏ phóng to, chế độ tương phản cao và "lắc để tìm" của macOS. Vòng
//     dò là một lớp CHỒNG THÊM, không phải một lớp thay thế.
'use client';

import { useEffect, useRef } from 'react';

import {
  lessonNumber,
  placeStar,
  starAriaLabel,
  zoomToFrame,
  SKY_CONSTELLATIONS,
  SKY_CURSOR,
  SKY_FRAME,
  SKY_TITLES,
} from '@/lib/star-map';

import styles from './star-map.module.css';

/**
 * 48 ngôi với toạ độ KHUNG, dựng MỘT LẦN lúc nạp module.
 *
 * Toạ độ do `placeStar()` tính, đúng hàm mà `build_sky.py` gọi lại và ca test
 * so từng ngôi — nên bảng này không lệch được với tranh. Chép toạ độ sang đây
 * là một toạ độ sẽ lệch (bài học `MAP_ABYSS` trong AGENTS.md).
 */
const SAO = SKY_CONSTELLATIONS.flatMap((c, i) => c.stars.map((s, j) => {
  const p = placeStar(c, s);
  return { code: s.code, chang: c.key, x: p.x, y: p.y, lesson: lessonNumber(i, j) };
}));

/**
 * Chip của ngôi ở một phần ba bên phải phải lật sang TRÁI, nếu không
 * `overflow: hidden` của khung cắt mất nó ở màn hẹp.
 *
 * Tính từ chính toạ độ `placeStar()`, không liệt kê mã ngôi: liệt kê là một
 * danh sách sẽ cũ ngay lần một hộp chòm dịch sang phải.
 */
const lePhai = (x: number) => x > SKY_FRAME.width * (2 / 3);

export default function SkyCursor() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // LỚP PHỦ NAY Ở SÂU HƠN MỘT TẦNG, và đó là bản sửa "hơi lag" 20/10/2026:
    // nó nằm trong `.canh`, cái bọc mang MỘT `transform` cho cả bức thay cho
    // hai mươi (xem điều 4 ở đầu `StarMap.tsx`). Nên `khung` phải là `.frame`
    // — ÔNG của lớp phủ, không CHA của nó.
    //
    // `.frame` là phần tử đúng cho cả ba việc dưới đây, và không phải vì nó
    // tiện: nó là phần tử mang `data-phong` (tức `zoomToFrame()` đọc được
    // trạng thái phóng ở đó), nó là hộp mà `--cx`/`--cy` tính theo (`.canh`
    // thì đã bị transform, nên một `getBoundingClientRect()` trên nó trả về
    // hộp ĐÃ PHÓNG và mọi tỉ lệ thô sẽ sai), và nó là phần tử mà tám ô bấm
    // cùng thuộc về.
    const lop = root.current;
    const canh = lop?.parentElement;
    const khung = canh?.parentElement;
    if (!lop || !khung) return undefined;

    const o = new Map<string, HTMLElement>();
    for (const el of lop.querySelectorAll<HTMLElement>('[data-sao]')) {
      o.set(el.dataset.sao ?? '', el);
    }

    /* ── LIÊN KẾT HAI CHIỀU với BẢNG BÀI dưới khung ──────────────────
     *
     * Bảng bài và bầu trời là HAI THỨ RỜI NHAU cho tới đây: chín dòng chữ và
     * chín ngôi, không gì nói dòng nào ứng với ngôi nào. Chủ sản phẩm đặt
     * đúng chiều cần nhất ("hover vào 1 bài thì cái ngôi sao đấy sẽ phát
     * sáng"); chiều ngược lại rẻ như cho vì chỗ đổi trạng thái đã có sẵn.
     *
     * VÌ SAO JS CHỨ KHÔNG CSS, khi mọi thứ khác ở đây là CSS thuần: cột bài
     * là ANH EM của `.frame`, nên một bộ chọn thuần phải đi NGANG rồi XUỐNG
     * (`.khung:has([data-bai]:hover) .frame … .saoP01`) — và `:has()` không
     * nói được "ngôi của ĐÚNG mã bài đang được trỏ" mà không viết 48 quy tắc,
     * mỗi quy tắc nhắc mã bài hai lần. Bốn mươi tám quy tắc sinh từ một vòng
     * lặp là bốn mươi tám chỗ lệch được; một `querySelector` thì không.
     *
     * VÌ SAO Ở TỆP NÀY chứ không một thành phần mới: `nhan()` dưới đây là chỗ
     * DUY NHẤT trong cả trang biết "ngôi nào đang sống". Một thành phần thứ
     * hai sẽ phải quan sát lại chính kết luận ấy (MutationObserver trên
     * `data-gan`), tức hai bộ máy cho một trạng thái — và hai bộ máy cho một
     * trạng thái là một trạng thái sẽ dính.
     *
     * VÌ SAO KHÔNG GIỮ MỘT THAM CHIẾU TỚI BẢNG, và đây là một LỖI ĐÃ SỬA chứ
     * không một kiểu viết: ở TỈ LỆ XA bảng bài KHÔNG TỒN TẠI (`StarMap.tsx`
     * chỉ dựng nó khi có `chang`). Thành phần này mount một lần ở tỉ lệ xa với
     * `deps: []`, nên một `querySelector('[data-bang]')` lúc mount trả `null`
     * MÃI MÃI — và cú phóng là điều hướng phía client, không tải lại trang,
     * nên effect không chạy lại. Liên kết hai chiều sẽ chỉ chạy khi người ta
     * vào thẳng `?chang=M5` bằng URL, và chết im lặng với mọi ai bấm từ bản
     * đồ. Nên mọi thứ đi qua UỶ QUYỀN trên CÁI BỌC của bản đồ (`.khung`) —
     * phần tử duy nhất chắc chắn sống suốt đời thành phần này — và tra bảng
     * ĐÚNG LÚC có việc.
     *
     * `.khung` chứ không `<main>` từ 20/10/2026: bản đồ nay dựng ở HAI trang
     * (trang chủ và route xem thử) với hai cái `<main>` khác nhau, nên "cha
     * của khung" thôi là một phần tử đoán được. `.khung` là phần tử mà chính
     * `StarMap` dựng, và cột bài LÀ con của nó — tức phạm vi uỷ quyền nay hẹp
     * đúng bằng bản đồ, không rộng bằng cả trang.
     */
    const trang = khung.parentElement;

    let dangSang: HTMLElement | null = null;
    /** Dòng bảng ứng với ngôi đang sống NỔI LÊN. Cùng khuôn `nhan()`: một
     *  biến giữ cái đang bật, nên không bao giờ có hai dòng cùng sáng. Tra
     *  bằng `querySelector` mỗi lần ĐỔI (không mỗi khung hình), và mã bài là
     *  chuỗi của chính `SKY_CONSTELLATIONS` nên không có gì để chèn vào bộ
     *  chọn. */
    const sangHang = (code: string | undefined) => {
      const el = code
        ? trang?.querySelector<HTMLElement>(`[data-bang] [data-bai="${code}"]`) ?? null
        : null;
      if (dangSang === el) return;
      dangSang?.removeAttribute('data-sang');
      el?.setAttribute('data-sang', '');
      dangSang = el;
    };

    let dangNhan: HTMLElement | null = null;
    const nhan = (el: HTMLElement | null) => {
      if (dangNhan === el) return;
      dangNhan?.removeAttribute('data-gan');
      el?.setAttribute('data-gan', '');
      dangNhan = el;
      sangHang(el?.dataset.sao);
    };

    const bo = () => {
      lop.removeAttribute('data-tay');
      nhan(null);
    };

    /* ── con trỏ ────────────────────────────────────────────────────── */

    // Máy chạm: không gắn gì (điều 4 ở đầu tệp).
    const coTro = window.matchMedia('(hover: hover)').matches;
    let khung_raf = 0;
    let cho: { x: number; y: number } | null = null;

    /* ── HỘP CỦA KHUNG, ĐO LẠI KHI NÓ ĐỔI — KHÔNG MỖI KHUNG HÌNH ───────
     *
     * Bản sửa cho lời chê "hơi lag" (20/10/2026), và cơ chế đáng viết ra vì
     * `getBoundingClientRect()` trông như một phép ĐỌC vô hại.
     *
     * Nó vô hại chỉ khi bố cục đang SẠCH. Ở đây nó không bao giờ sạch: cuối
     * mỗi khung hình, `nhan()` đặt/bỏ `data-gan` và `sangHang()` đặt/bỏ
     * `data-sang` — mà `.sao[data-gan]` đổi `border-color`, `outline` VÀ
     * `z-index`, còn `.chip` của nó đổi `opacity`. Tức mỗi khung hình làm bẩn
     * style, rồi lời gọi `getBoundingClientRect()` của khung hình SAU buộc
     * trình duyệt tính lại style và bố cục ngay tại chỗ (forced synchronous
     * layout) trước khi trả về con số — trên một cây có 19 tấm ảnh phủ kín
     * khung, 48 thẻ neo và 48 quầng sáng. Một lượt như thế mỗi khung hình,
     * suốt thời gian con trỏ còn di chuyển.
     *
     * Hộp này đổi vì ĐÚNG BA nguyên nhân, nên có đúng ba chỗ xoá nó:
     *  · KÍCH CỠ đổi — `ResizeObserver` trên chính khung. Nó lo cả cú phóng:
     *    lưới hai cột của `.khungRong` chia lại chỗ (và ở route xem thử `.rong`
     *    còn nới `main` từ 1 100 lên 1 560 px), nên khung ĐỔI CỠ ngay lúc
     *    `?chang=` đổi. Chỗ này là lý do phải dùng `ResizeObserver` chứ
     *    không chỉ `window.resize`: cú phóng là điều hướng phía client, effect
     *    có `deps: []` nên không chạy lại, và không một sự kiện `resize` nào
     *    của cửa sổ xảy ra — một hộp cũ ở đây nghĩa là vòng dò nhận ngôi cách
     *    đó mấy trăm pixel, đúng triệu chứng "chuột hơi lệch" mà
     *    `zoomToFrame()` sinh ra để chữa.
     *  · VỊ TRÍ đổi vì CUỘN — `scroll` ở pha capture, nên cuộn trong bất kỳ
     *    tổ tiên nào cũng tới.
     *  · VỊ TRÍ đổi vì một thứ khác trên trang xê dịch (phông, ảnh tải xong) —
     *    không có sự kiện nào cho việc đó, nên đo lại MỘT lần mỗi lúc con trỏ
     *    vào khung. Một lượt cho cả quãng rê, không một lượt mỗi khung hình. */
    let hop: DOMRect | null = null;
    const xoaHop = () => { hop = null; };
    const layHop = () => {
      if (!hop) hop = khung.getBoundingClientRect();
      return hop;
    };

    // MỘT lượt ghi mỗi khung hình, và ghi THẲNG vào lớp phủ chứ không vào cha:
    // ghi vào cha là kéo cả cây con vào lượt tính lại style, mà cây con ở đây
    // là mười hai tấm ảnh phủ kín khung.
    const ve = () => {
      khung_raf = 0;
      if (!cho) return;
      const r = layHop();
      if (r.width <= 0 || r.height <= 0) return;
      const u = (cho.x - r.left) / r.width;
      const v = (cho.y - r.top) / r.height;
      // `--cx`/`--cy` là vị trí trong LỚP PHỦ, tức trong hệ toạ độ TRƯỚC khi
      // transform của cú phóng áp vào — nên chúng vẫn là tỉ lệ thô của khung.
      lop.style.setProperty('--cx', `${(u * 100).toFixed(3)}%`);
      lop.style.setProperty('--cy', `${(v * 100).toFixed(3)}%`);
      lop.setAttribute('data-tay', '');

      // …còn phép DÒ thì phải nói bằng toạ độ KHUNG THẬT, và ở tỉ lệ gần hai
      // thứ đó không còn là một. `zoomToFrame()` đảo đúng phép biến hình mà
      // CSS đang áp (`.phongM<k>` trong `star-map.module.css`, sinh từ cùng ba
      // con số ở `SKY_ZOOM_PLACED`). Bỏ bước này thì ở tỉ lệ gần vòng dò nhận
      // một ngôi cách đó mấy trăm pixel — và triệu chứng đọc ra thành "chuột
      // hơi lệch", thứ không ai đi tìm trong một phép biến hình.
      const { x: fx, y: fy } = zoomToFrame(khung.dataset.phong, u, v);

      // Ngôi gần nhất TRONG bán kính nhận. Ngoài bán kính thì không ngôi nào
      // nhận — vòng dò trống, và cái trống ấy mang tin: chú giải đã khẳng định
      // khoảng tối giữa hai chòm không thuộc chặng nào.
      const tran = SKY_CURSOR.claimRadius * SKY_CURSOR.claimRadius;
      let gan: typeof SAO[number] | null = null;
      let min = tran;
      for (const s of SAO) {
        const d = (s.x - fx) * (s.x - fx) + (s.y - fy) * (s.y - fy);
        if (d <= min) { min = d; gan = s; }
      }
      nhan(gan ? o.get(gan.code) ?? null : null);
    };

    const diChuyen = (e: PointerEvent) => {
      // Ngón tay trên máy có cả chuột: một cú chạm không phải một lần rê, và
      // để nó bật vòng dò lên rồi đứng đó là để lại một con trỏ không có tay.
      if (e.pointerType === 'touch') return;
      cho = { x: e.clientX, y: e.clientY };
      if (!khung_raf) khung_raf = requestAnimationFrame(ve);
    };

    // Ba chỗ xoá hộp đã đệm — xem chú thích ở `layHop()`. `ResizeObserver`
    // gắn DÙ máy có hover hay không: nó rẻ, và nó là thứ duy nhất biết cú
    // phóng vừa đổi cỡ khung.
    const doCo = new ResizeObserver(xoaHop);
    doCo.observe(khung);
    if (coTro) {
      khung.addEventListener('pointermove', diChuyen);
      khung.addEventListener('pointerleave', bo);
      khung.addEventListener('pointerenter', xoaHop);
      window.addEventListener('scroll', xoaHop, { capture: true, passive: true });
    }

    /* ── bàn phím ───────────────────────────────────────────────────── */

    // Gắn dù máy có hover hay không: một chiếc điện thoại cắm bàn phím vẫn
    // phải đi được, và đây là đường DUY NHẤT tới từng ngôi mà không cần chuột.
    const trong = (key: string) => SAO.filter((s) => s.chang === key);

    const dat = (s: typeof SAO[number] | undefined) => {
      if (!s) return;
      o.get(s.code)?.focus();
    };

    const bam = (e: KeyboardEvent) => {
      const act = document.activeElement as HTMLElement | null;
      if (!act || !khung.contains(act)) return;
      const sao = act.dataset?.sao;
      const chang = sao ? act.dataset.chang : act.dataset.mapRegion;
      if (!chang) return;
      const ds = trong(chang);
      const i = sao ? ds.findIndex((s) => s.code === sao) : -1;

      if (e.key === 'Escape' && sao) {
        e.preventDefault();
        khung.querySelector<HTMLElement>(`[data-map-region="${chang}"]`)?.focus();
        return;
      }
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        dat(e.key === 'Home' ? ds[0] : ds[ds.length - 1]);
        return;
      }
      const buoc = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!buoc) return;
      e.preventDefault();
      // Từ ô bấm cả chặng: mũi tên "tiến" vào ngôi ĐẦU, mũi tên "lùi" vào ngôi
      // CUỐI — cùng quy ước với Tab/Shift+Tab, nên không phải học thêm gì.
      if (i < 0) { dat(buoc > 0 ? ds[0] : ds[ds.length - 1]); return; }
      // KHÔNG vòng lại ở hai đầu: một chặng có đầu và có cuối, và thứ tự ấy là
      // thứ tự bài. Vòng lại làm mất đúng cái tin mà lớp này vừa mua được.
      dat(ds[Math.min(ds.length - 1, Math.max(0, i + buoc))]);
    };

    // Tiêu điểm bàn phím vào một ngôi phải làm tấm chòm hiện lên y như con trỏ
    // đặt trên chòm. `:focus-visible` của chính ngôi không với tới tấm ảnh
    // được (ngôi nằm TRONG lớp phủ, tấm ảnh là anh em của lớp phủ), nên trạng
    // thái đi qua một thuộc tính trên lớp phủ và CSS đọc nó bằng `~`.
    const vao = (e: FocusEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-sao]');
      if (el?.dataset.chang) lop.setAttribute('data-chang', el.dataset.chang);
      else lop.removeAttribute('data-chang');
      // Tiêu điểm bàn phím vào một ngôi cũng phải làm nổi dòng của nó: nếu
      // không thì người đi bằng Tab/mũi tên thấy một bản đồ khác người đi
      // bằng chuột, đúng thứ luật 5 ở đầu tệp cấm.
      sangHang(el?.dataset.sao);
    };

    khung.addEventListener('keydown', bam);
    khung.addEventListener('focusin', vao);

    /* ── chiều NGƯỢC: một dòng bảng làm NGÔI của nó phát sáng ───────── */

    let dangNgoi: HTMLElement | null = null;
    const sangNgoi = (el: HTMLElement | null) => {
      if (dangNgoi === el) return;
      dangNgoi?.removeAttribute('data-sang');
      el?.setAttribute('data-sang', '');
      dangNgoi = el;
    };
    // Uỷ quyền trên `<main>`: `pointerover` nổi bọt lên từ mọi hậu duệ, nên
    // cùng một listener lo cả "vào một dòng" và "rời khỏi dòng" (ra khỏi dòng
    // là vào một phần tử khác, và phần tử khác không có `[data-bai]` nào ở
    // trên nó ⇒ tắt). Không cần một `pointerleave` thứ hai, và không cần bảng
    // phải tồn tại lúc gắn.
    const tuHang = (e: Event) => {
      const d = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-bang] [data-bai]');
      sangNgoi(d?.dataset.bai ? o.get(d.dataset.bai) ?? null : null);
    };
    // Tiêu điểm ĐI RA: `relatedTarget` của `focusout` là phần tử SẮP nhận tiêu
    // điểm, nên "còn trong bảng" đọc được ngay mà không cần một `setTimeout`
    // nào — và một `setTimeout` ở đây là một quầng sáng dính lại sau khi Tab
    // đã đi khỏi bảng.
    const roiTieu = (e: FocusEvent) => {
      const kia = (e.relatedTarget as HTMLElement | null)
        ?.closest<HTMLElement>('[data-bang] [data-bai]');
      if (!kia) sangNgoi(null);
    };
    if (trang) {
      // Máy chạm KHÔNG gắn listener con trỏ (điều 4 ở đầu tệp): ở đó không có
      // hover, nên chỗ nối một dòng với một ngôi là CON SỐ thứ tự in ở cả hai
      // chỗ (`.hangSo` và `.thuTu`), không phải quầng sáng. Hai listener tiêu
      // điểm thì GẮN DÙ GÌ — một chiếc điện thoại cắm bàn phím vẫn phải đi
      // được.
      if (coTro) trang.addEventListener('pointerover', tuHang);
      trang.addEventListener('focusin', tuHang);
      trang.addEventListener('focusout', roiTieu);
    }

    return () => {
      if (khung_raf) cancelAnimationFrame(khung_raf);
      doCo.disconnect();
      khung.removeEventListener('pointermove', diChuyen);
      khung.removeEventListener('pointerleave', bo);
      khung.removeEventListener('pointerenter', xoaHop);
      window.removeEventListener('scroll', xoaHop, { capture: true });
      khung.removeEventListener('keydown', bam);
      khung.removeEventListener('focusin', vao);
      trang?.removeEventListener('pointerover', tuHang);
      trang?.removeEventListener('focusin', tuHang);
      trang?.removeEventListener('focusout', roiTieu);
    };
  }, []);

  return (
    <div className={styles.lop} ref={root}>
      {/* Hai ke mảnh và hai vạch lề = THANG TOẠ ĐỘ. Phân vai rõ: hai ke là
          CHẤT LIỆU (độ mờ 0,14, cố ý dưới ngưỡng đọc, đúng vai của lưới toạ độ
          trong tranh), còn vòng dò và hai vạch lề là TÍN HIỆU — chúng mới phải
          đạt 3:1, và chúng đạt bằng hai nét (xem `.vong` trong CSS). */}
      <div aria-hidden="true" className={styles.keX} />
      <div aria-hidden="true" className={styles.keY} />
      <div aria-hidden="true" className={styles.lanX} />
      <div aria-hidden="true" className={styles.lanY} />
      <div aria-hidden="true" className={styles.vachX} />
      <div aria-hidden="true" className={styles.vachY} />
      <div aria-hidden="true" className={styles.vong} />

      {SKY_CONSTELLATIONS.map((c, i) => (
        <div className={`${styles.cum} ${styles[`cum${c.key}`]}`} key={c.key}>
          {c.stars.map((s, j) => (
            <a
              aria-label={starAriaLabel(c.key, s.code, lessonNumber(i, j))}
              className={`${styles.sao} ${styles[`sao${s.code}`]}`}
              data-chang={c.key}
              data-le={lePhai(placeStar(c, s).x) ? 'phai' : undefined}
              data-sao={s.code}
              href={`/lesson/python_advanced/${lessonNumber(i, j)}`}
              key={s.code}
              // Tiêu điểm LUÂN PHIÊN (roving): 48 chặng dừng Tab mới sẽ nhấn
              // chìm tám ô bấm thật. Tab vào chặng, mũi tên vào ngôi — đúng
              // khuôn một widget ghép, và `bam()` ở trên là bộ máy của nó.
              tabIndex={-1}
            >
              {/* QUẦNG SÁNG — "khi tôi hover vào 1 bài thì cái ngôi sao đấy sẽ
                  phát sáng". Một phần tử riêng chứ không `box-shadow` trên
                  chính `.sao`: chỉ `opacity`/`transform` chạy trên compositor,
                  nên quầng để `box-shadow` TĨNH rồi nội suy độ mờ của chính
                  nó.

                  ĐỨNG TRƯỚC CHIP, và thứ tự ấy là một hợp đồng: hai phần tử
                  cùng `position: absolute` và không `z-index` thì cái SAU vẽ
                  đè cái trước. Đảo lại là quầng phủ lên nền đặc của chip, tức
                  nhuộm sắc chặng lên chữ — đúng chỗ mà nền đặc của chip sinh
                  ra để tránh. */}
              <span aria-hidden="true" className={styles.quang} />
              <span className={styles.chip}>
                {/* THỨ TỰ HỌC TRONG CHẶNG — chỉ hiện ở TỈ LỆ GẦN. Nét chòm cố
                    ý không nói thứ tự (chú giải: "nó không nói thứ tự phải
                    học"), và bậc thang 45 ms kể thứ tự bằng THỜI GIAN — thứ mà
                    người bật `reduce` không nhận được. Một con số thì ai cũng
                    nhận được. */}
                <span className={styles.thuTu}>{j + 1}</span>
                <span className={styles.ma}>{s.code}</span>
                {/* KHÔNG CÒN Ô "9 ca". Thẻ in `1 N01 9 ca` tới ngày
                    19/10/2026, khi chủ sản phẩm xem màn phóng gần và nói "bỏ
                    phần ca đi". Con số ấy là con số mà BÁN KÍNH ngôi đã nói
                    rồi — in lại bằng chữ ngay cạnh cái hình đang nói nó là
                    trả hai lần cho một tin, trong một cái thẻ chỉ có chỗ cho
                    ba dòng. `starAriaLabel` giữ con số cho người không thấy
                    bán kính; `.scale` và `scaleNote` (chú giải của chính con
                    số này) đã bỏ cùng lúc. */}
                {/* TÊN BÀI THẬT — chỉ hiện ở tỉ lệ gần, và nó là lý do cú
                    phóng không phải "phóng to một bức ảnh". Nó ở trong DOM
                    ngay từ lượt dựng đầu, không chờ một `useEffect`: nhờ thế
                    người dùng trình đọc màn hình và máy tìm kiếm thấy nó, và
                    nó không phải một thứ xuất hiện sau khi JS tải xong. */}
                <span className={styles.tenBai}>{SKY_TITLES[s.code]}</span>
              </span>
            </a>
          ))}
        </div>
      ))}
    </div>
  );
}
