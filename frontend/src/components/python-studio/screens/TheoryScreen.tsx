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
import type { LessonFigure } from '@/lib/studio-lesson';

import c from '../studio-chrome.module.css';
import { paragraphs, ScreenShell } from './chrome';
import type { ShellProps } from './props';

/** Hình + chú thích. Dùng lại ở màn `explain` khi bài không có màn lý thuyết. */
export function Figure({ figure }: { figure: LessonFigure }) {
  return (
    <figure className={c.theoryFigure}>
      {/* Hình vẽ ở khổ 1280x640. Ở cột 680px của Figma nó chỉ còn ~580px bề
          ngang, tức chưa tới một nửa: chữ trong sơ đồ xuống 6–7px, không đọc nổi
          trên laptop — nên màn lý thuyết nay chạy ở cột rộng (~1230px cho hình,
          gần đúng khổ vẽ). Vẫn giữ <a> mở chính file SVG ở tab mới: màn hình nhỏ
          và người cần phóng to hơn nữa vẫn xem được đúng khổ gốc, animation vẫn
          chạy, và không phải dựng thêm lightbox. */}
      <a href={figure.src} target="_blank" rel="noopener noreferrer" title="Mở hình ở khổ lớn">
        {/* next/image không hợp ở đây: SVG động, kích thước cố định 1280x640 và đã
            nằm sẵn trong public/ nên tối ưu hoá chỉ thêm một vòng xử lý. Khung giữ
            đúng tỉ lệ 2:1 bằng CSS nên hình chưa vẽ xong (ảnh vỡ) không làm vỡ layout. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={figure.src} alt={figure.alt} width={1280} height={640} loading="lazy" />
      </a>
      <figcaption>
        {figure.caption}
        <a href={figure.src} target="_blank" rel="noopener noreferrer">
          Xem khổ lớn ↗
        </a>
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

  return (
    <ScreenShell scr={scr} metaLabel={metaLabel} title="Lý thuyết của bài">
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
            {block.figure?.src && <Figure figure={block.figure} />}
          </section>
        ))}
        {trailing && (
          <section className={c.theoryBlock}>
            <Figure figure={trailing} />
          </section>
        )}
      </div>
      {/* In NGUYÊN VĂN chuỗi nguồn: nó có thể là nhiều khoảng trang rời
          ("SL 95-105, 133") hoặc kèm tài liệu chính thức ("SL 51-53; DOC subprocess"). */}
      {slides && <p className={c.theorySource}>Nguồn: {slides}</p>}
    </ScreenShell>
  );
}
