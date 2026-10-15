'use client';

// S1 · Lý thuyết: phần NỀN của bài — khái niệm, ví dụ, ứng dụng và hình minh hoạ.
// Là màn ĐẦU TIÊN của bài, đứng trước cả đề bài (`brief`) và `explain`: học viên
// phải biết process/thread/widget là gì trước khi bị đòi viết code cho nó.
//
// Màn này chạy ở CỘT RỘNG (LessonChrome nhận `wide` từ StudioLesson) để hình có
// chỗ — xem .contentWide trong LessonChrome.module.css.
//
// Hình là SVG tĩnh cùng miền, hiện bằng `<img>`: animation viết bằng CSS trong
// chính file SVG vẫn chạy, không cần nới CSP (img-src 'self' đã cho phép).
//
// Hoạt hình trong 23 file đó LẶP VÔ HẠN, một vòng 9,33–12,67 giây. Chuyển động
// tự chạy quá 5 giây thì WCAG 2.2.2 (mức A) đòi phải có cách dừng, mà trong
// `<img>` thì trang không chạm được vào animation bên trong. Vì vậy ở đây có
// nút Dừng/Chạy, và nó dừng bằng cách ĐỔI NGUỒN ẢNH sang một Blob đã tắt hoạt
// hình. Toàn bộ lý do chọn hướng này (thay vì <iframe> + getAnimations, hay
// <object> mà CSP chặn) nằm ở lib/figure-motion.ts.
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  animatedSvgSource,
  FIGURE_HIDDEN_NOTE,
  FIGURE_VIEW_MARGIN_PX,
  figureSource,
  figureToggleLabel,
  figureToggleText,
  initialFigurePlaying,
  stillSvgSource,
} from '@/lib/figure-motion';
import type { LessonFigure } from '@/lib/studio-lesson';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

import BookIntro from '../intro/BookIntro';
import c from '../studio-chrome.module.css';
import { paragraphs, ScreenShell } from './chrome';
import type { ShellProps } from './props';

/**
 * Hai bản SVG dựng từ chính file gốc, dưới dạng blob: URL.
 * `still` = đã tắt hoạt hình; `motion` = đã vô hiệu hoá khối @media reduce.
 */
type Variants = { still: string | null; motion: string | null };

/** Tải file SVG một lần rồi dựng hai bản. Lỗi thì trả về hai null. */
function useSvgVariants(src: string, enabled: boolean): Variants {
  const [variants, setVariants] = useState<Variants>({ still: null, motion: null });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const urls: string[] = [];
    // `fetch` này gần như không tốn gì: chính `<img>` vừa tải đúng URL đó nên
    // phản hồi nằm trong HTTP cache. Chỉ chạy khi hình đã vào gần khung nhìn,
    // để không phá `loading="lazy"` của những hình nằm cuối trang.
    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => {
        if (!alive) return;
        const make = (body: string | null) => {
          if (body === null) return null;
          const url = URL.createObjectURL(new Blob([body], { type: 'image/svg+xml' }));
          urls.push(url);
          return url;
        };
        setVariants({ still: make(stillSvgSource(text)), motion: make(animatedSvgSource(text)) });
      })
      .catch(() => {
        // Không tải được: để hai null. `figureSource` sẽ ẩn hình khi dừng chứ
        // không âm thầm cho nó chạy tiếp.
        if (alive) setVariants({ still: null, motion: null });
      });

    return () => {
      alive = false;
      // Blob giữ cả file SVG trong bộ nhớ (tới 120 KB/file) nên phải thu hồi.
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [src, enabled]);

  return variants;
}

/**
 * Hình + chú thích. Dùng lại ở màn `explain` khi bài không có màn lý thuyết.
 *
 * `frozen` = "đang có việc khác cần main thread, đứng yên đã". Hiện chỉ có một
 * chỗ bật nó: lúc hoạt cảnh mở sách đang chạy. Lý do là số đo trong
 * lib/figure-motion.ts — animation CSS trong SVG nhúng dạng `<img>` KHÔNG được
 * đưa lên compositor, nên mỗi nhịp phải tính lại style rồi vẽ lại ảnh trên
 * main thread (đo được 2 007ms main thread / 10,5s với hai hình ở CPU 4×). Để
 * chúng chạy thì 860ms của hoạt cảnh phải chia main thread với hai hình, và
 * trong lúc đó lớp chữ đang `opacity: 0` nên chẳng ai xem hình.
 *
 * Nó cộng vào `inView` chứ không thay thế: ra ngoài khung nhìn thì vẫn phải
 * dừng, bất kể hoạt cảnh có chạy hay không.
 */
export function Figure({ figure, frozen }: { figure: LessonFigure; frozen?: boolean }) {
  const reduced = usePrefersReducedMotion();
  // `null` = người dùng chưa bấm gì, cứ theo tuỳ chọn hệ thống. Giữ riêng ý
  // muốn của người dùng để việc đổi tuỳ chọn hệ thống giữa phiên không ghi đè
  // lên cú bấm của họ.
  const [wanted, setWanted] = useState<boolean | null>(null);
  const playing = wanted ?? initialFigurePlaying(reduced);

  // Mặc định `true`: lần render đầu (kể cả trên server) hình vẫn hiện bình
  // thường. IntersectionObserver chỉnh lại ngay sau khi mount.
  const [inView, setInView] = useState(true);
  const [seen, setSeen] = useState(false);
  const boxRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          setInView(e.isIntersecting);
          if (e.isIntersecting) setSeen(true);
        }
      },
      { rootMargin: `${FIGURE_VIEW_MARGIN_PX}px` },
    );
    io.observe(box);
    return () => io.disconnect();
  }, []);

  const variants = useSvgVariants(figure.src, seen);
  const kind = figureSource({
    playing,
    inView: inView && !frozen,
    reduced,
    stillReady: variants.still !== null,
    motionReady: variants.motion !== null,
  });
  const src =
    kind === 'still' ? variants.still : kind === 'motion' ? variants.motion : kind === 'file' ? figure.src : null;

  const toggle = useCallback(() => setWanted((prev) => !(prev ?? initialFigurePlaying(reduced))), [reduced]);

  return (
    <figure className={c.theoryFigure}>
      {/* Hình vẽ ở khổ 1280x640. Ở cột 680px của Figma nó chỉ còn ~580px bề
          ngang, tức chưa tới một nửa: chữ trong sơ đồ xuống 6–7px, không đọc nổi
          trên laptop — nên màn lý thuyết nay chạy ở cột rộng (~1230px cho hình,
          gần đúng khổ vẽ). Vẫn giữ <a> mở chính file SVG ở tab mới: màn hình nhỏ
          và người cần phóng to hơn nữa vẫn xem được đúng khổ gốc, animation vẫn
          chạy, và không phải dựng thêm lightbox. */}
      <a
        ref={boxRef}
        className={c.theoryFigureBox}
        href={figure.src}
        target="_blank"
        rel="noopener noreferrer"
        title="Mở hình ở khổ lớn"
      >
        {/* next/image không hợp ở đây: SVG động, kích thước cố định 1280x640 và đã
            nằm sẵn trong public/ nên tối ưu hoá chỉ thêm một vòng xử lý. Khung giữ
            đúng tỉ lệ 2:1 bằng CSS nên hình chưa vẽ xong (ảnh vỡ) không làm vỡ layout. */}
        {src !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={figure.alt} width={1280} height={640} loading="lazy" />
        ) : (
          <span className={c.theoryFigureOff}>{FIGURE_HIDDEN_NOTE}</span>
        )}
      </a>
      <figcaption>
        {figure.caption}
        {/* Ký tự ↗ nằm TRONG tên của liên kết thì trình đọc màn hình đọc nó
            thành tên ký tự ("north east arrow"), tức tên liên kết thành "Xem
            khổ lớn north east arrow". Bản thiết kế §1.2 chốt mũi tên là ICON
            SVG — `TryItButton.tsx:43` đã làm đúng (ký tự bọc aria-hidden), chỗ
            này là bản còn sót. Dùng icon "mở ở ngoài" vì liên kết mở tab mới. */}
        <a href={figure.src} target="_blank" rel="noopener noreferrer">
          Xem khổ lớn
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M7 17L17 7M9 7h8v8" /></svg>
        </a>
        {/* Nút nằm TRONG figcaption để nó luôn đi liền với đúng hình nó điều
            khiển — màn lý thuyết có thể có nhiều hình. */}
        <button type="button" className={c.theoryFigureToggle} aria-label={figureToggleLabel(playing)} onClick={toggle}>
          {figureToggleText(playing)}
        </button>
      </figcaption>
    </figure>
  );
}

export default function TheoryScreen({ lesson, scr, metaLabel }: ShellProps) {
  const one = lesson.step_1;
  const blocks = one?.theory ?? [];
  // Hình chính hiện ở khối nào khai nó; bài khai figure mà không khối nào mang thì
  // vẫn cho xem ở cuối, để hình không bị nuốt mất.
  const shown = blocks.some((b) => b.figure?.src);
  const trailing = !shown && one?.figure?.src ? one.figure : null;
  const slides = lesson.source?.slides;

  // Hình đứng yên tới khi hoạt cảnh mở sách lắng — xem chú thích `frozen` ở
  // Figure. Khởi tạo `false` (chưa lắng): BookIntro gọi onSettled ngay trong
  // một effect kể cả khi KHÔNG có hoạt cảnh nào, nên không có bài nào bị kẹt
  // ở trạng thái đóng băng.
  const [settled, setSettled] = useState(false);
  const onSettled = useCallback(() => setSettled(true), []);

  // Chữ trên bìa sách. Lấy từ chính nội dung bài: mã bài + tiêu đề brief, và
  // chặng/module làm dòng nhỏ. Không bịa chữ trang trí nào.
  const coverTitle = one?.brief?.title || metaLabel || 'Lý thuyết của bài';
  // `eyebrow` của brief là ["M1", "ĐA LUỒNG", "T03"] — mã bài nằm sẵn trong đó,
  // nên không cần nguồn thứ hai (StudioLesson không mang `lesson_code`).
  const coverEyebrow = one?.brief?.eyebrow?.length ? one.brief.eyebrow.join(' · ') : undefined;

  return (
    <ScreenShell scr={scr} metaLabel={metaLabel} title="Lý thuyết của bài">
      <BookIntro
        title={coverTitle}
        eyebrow={coverEyebrow}
        hasTheory={blocks.length > 0}
        onSettled={onSettled}
      >
        <div className={c.theory}>
          {blocks.map((block, i) => (
            <section key={i} className={c.theoryBlock}>
              <h4>{block.title}</h4>
              {block.body && <p>{paragraphs(block.body)}</p>}
              {block.bullets?.length ? (
                <ul>
                  {block.bullets.map((bullet, j) => (
                    <li key={j}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
              {block.figure?.src && <Figure figure={block.figure} frozen={!settled} />}
            </section>
          ))}
          {trailing && (
            <section className={c.theoryBlock}>
              <Figure figure={trailing} frozen={!settled} />
            </section>
          )}
        </div>
      </BookIntro>
      {/* In NGUYÊN VĂN chuỗi nguồn: nó có thể là nhiều khoảng trang rời
          ("SL 95-105, 133") hoặc kèm tài liệu chính thức ("SL 51-53; DOC subprocess"). */}
      {slides && <p className={c.theorySource}>Nguồn: {slides}</p>}
    </ScreenShell>
  );
}
