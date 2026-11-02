'use client';

// Ô ÔN GIÃN CÁCH — một câu người học đã trả lời SAI ở một bài TRƯỚC, hỏi lại khi
// họ mở một bài mới.
//
// Cepeda 2006 (184 nghiên cứu, 1,35 triệu phép đo): học giãn cách thắng học
// dồn. Luật chọn câu và hàng chờ nằm ở `lib/spaced-review.ts` — hàm thuần, có
// test gọi thẳng; chỗ này chỉ dựng.
//
// KHÔNG PHẢI MỘT `ScreenKind` MỚI, và đó là quyết định kiến trúc:
// thêm một loại màn thì phải đi qua `buildScreens` (mà nó là hàm THUẦN, không
// biết localStorage), `sinhDuocManNao` ở cổng INSERT của backend, thanh tiến độ,
// `screenSettled`, `firstUnfinished` — năm chỗ, để thêm một thẻ không thuộc về
// nội dung bài. Ô này đứng NGOÀI luồng màn như `ConsentBanner`, nên nó không
// đụng con số nào của bài: không vào tiến độ, không vào XP, không vào điểm.
//
// KHÔNG CHẤM VÀO ĐIỂM BÀI HIỆN TẠI. Câu này thuộc một bài khác; cộng/trừ nó vào
// bài đang mở là làm điểm của bài nói về một thứ không có trong bài.

import { useState } from 'react';

import { withInlineCode } from '@/lib/inline-code';
import type { CauOn } from '@/lib/spaced-review';

import c from './studio-chrome.module.css';

export default function OnGianCach({
  cau,
  onXong,
}: {
  cau: CauOn;
  /** Gọi khi người học đã xem xong — nơi gọi lo xoá câu khỏi hàng chờ. */
  onXong: () => void;
}) {
  const [chon, setChon] = useState<number | null>(null);
  const daChon = chon !== null;
  const dung = daChon && Boolean(cau.options[chon]?.correct);

  return (
    <section className={c.onGianCach} aria-label="Ôn lại một câu đã trả lời sai">
      <p className={c.onGianCachNhan}>
        <span aria-hidden="true">🔁</span> ÔN 30 GIÂY · câu này bạn từng trả lời sai ở bài{' '}
        {cau.maBai}
      </p>
      <p className={c.onGianCachHoi}>{withInlineCode(cau.question)}</p>

      <ul className={c.onGianCachDs}>
        {cau.options.map((o, i) => {
          // Sau khi chọn: đánh dấu đáp án đúng và phương án họ vừa chọn. Phương
          // án không-được-chọn-và-không-phải-đáp-án KHÔNG bị làm mờ — ở màn trắc
          // nghiệm chính, `opacity: .55` từng làm mờ đúng phần có giá trị nhất
          // (Van der Kleij 2015: phản hồi CÓ GIẢI THÍCH d = 0,49).
          const lop = !daChon
            ? c.onGianCachNut
            : o.correct
              ? `${c.onGianCachNut} ${c.onGianCachDung}`
              : i === chon
                ? `${c.onGianCachNut} ${c.onGianCachSai}`
                : c.onGianCachNut;
          return (
            <li key={i}>
              <button type="button" className={lop} disabled={daChon} onClick={() => setChon(i)}>
                {withInlineCode(o.text)}
                {daChon && o.detail && (
                  <span className={c.onGianCachChiTiet}>{withInlineCode(o.detail)}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {daChon && (
        <>
          <p className={c.onGianCachKetLuan}>
            {dung
              ? 'Lần này đúng. Câu này sẽ không hỏi lại nữa.'
              : 'Chưa đúng — đáp án đúng đã được đánh dấu ở trên.'}{' '}
            Câu ôn KHÔNG tính vào điểm bài này.
          </p>
          <button type="button" className={c.onGianCachTiep} onClick={onXong}>
            Vào bài →
          </button>
        </>
      )}
    </section>
  );
}
