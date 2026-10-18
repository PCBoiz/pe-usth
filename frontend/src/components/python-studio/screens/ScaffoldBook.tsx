'use client';

// Màn lắp khung mã dạng SÁCH MỞ, theo Figma "Book layout" (node 107:6804 — đã
// điền đủ, 107:6600 — có ô sai). Trang trái là main.py với các ô ①②③ nằm
// ngay trong dòng code; trang phải là khay thẻ, NHÓM THEO Ô: thẻ nào thuộc ô
// nào lấy từ `bank[].slot` của giáo trình.
//
// Thay cho Assemble (cầm thẻ ở kho rồi bấm vào ô): nay kéo thẻ thả vào ô cùng
// số, hoặc BẤM thẻ là đặt luôn vào ô của nó. Bấm là đường chính cho bàn phím
// và màn cảm ứng — kéo-thả HTML5 không chạy trên điện thoại.
//
// Khác Figma, có chủ ý:
//  · Nhãn mỗi nhóm: Figma viết câu mô tả ("Kết quả chuyển trạng thái
//    io_done"), giáo trình không có — cả 149 ô chỉ có placeholder "[Slot n]"
//    (đo ngày 18/10/2026). Nhãn ở đây là số dòng + chính dòng code chứa ô.
//  · Thẻ đang nằm trong ô được tô viền tím: khay không còn rút thẻ đã dùng
//    (Figma vẽ cả ba thẻ của mỗi ô ở trạng thái đã điền), nên không có dấu này
//    thì không biết mình đã chọn thẻ nào.
//  · Cỡ chữ theo thang (code 16, nhãn 15…) thay vì 11–14px của Figma.
import { useState } from 'react';

import type { Step3 } from '@/lib/studio-lesson';

import c from '../studio-chrome.module.css';
import { circled } from './ScaffoldReview';

type Scaffold = NonNullable<Step3['scaffold']>;

const SLOT = /\{\{\s*slot(\d+)\s*\}\}/g;

/** Icon lucide của Figma (grip-vertical, move) — vẽ bằng currentColor. */
const GRIP = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M6.6664 8C6.6664 8.36815 6.36786 8.6666 5.9996 8.6666C5.63134 8.6666 5.3328 8.36815 5.3328 8C5.3328 7.63185 5.63134 7.3334 5.9996 7.3334C6.36786 7.3334 6.6664 7.63185 6.6664 8ZM6.6664 3.3338C6.6664 3.70195 6.36786 4.0004 5.9996 4.0004C5.63134 4.0004 5.3328 3.70195 5.3328 3.3338C5.3328 2.96565 5.63134 2.6672 5.9996 2.6672C6.36786 2.6672 6.6664 2.96565 6.6664 3.3338ZM6.6664 12.6662C6.6664 13.0344 6.36786 13.3328 5.9996 13.3328C5.63134 13.3328 5.3328 13.0344 5.3328 12.6662C5.3328 12.298 5.63134 11.9996 5.9996 11.9996C6.36786 11.9996 6.6664 12.298 6.6664 12.6662ZM10.6672 8C10.6672 8.36815 10.3687 8.6666 10.0004 8.6666C9.63214 8.6666 9.3336 8.36815 9.3336 8C9.3336 7.63185 9.63214 7.3334 10.0004 7.3334C10.3687 7.3334 10.6672 7.63185 10.6672 8ZM10.6672 3.3338C10.6672 3.70195 10.3687 4.0004 10.0004 4.0004C9.63214 4.0004 9.3336 3.70195 9.3336 3.3338C9.3336 2.96565 9.63214 2.6672 10.0004 2.6672C10.3687 2.6672 10.6672 2.96565 10.6672 3.3338ZM10.6672 12.6662C10.6672 13.0344 10.3687 13.3328 10.0004 13.3328C9.63214 13.3328 9.3336 13.0344 9.3336 12.6662C9.3336 12.298 9.63214 11.9996 10.0004 11.9996C10.3687 11.9996 10.6672 12.298 10.6672 12.6662Z" />
  </svg>
);
const MOVE = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M8 1.3328V8M10.0002 3.33296L8 1.3328L5.99984 3.33296M8 8V14.6672M8 8H14.6672M8 8H1.3328M5.99984 12.667L8 14.6672L10.0002 12.667M12.667 10.0002L14.6672 8L12.667 5.99984M3.33296 10.0002L1.3328 8L3.33296 5.99984" />
  </svg>
);

type Part = { text: string } | { slot: number };

/** Tách một dòng template thành chữ thường và các ô {{slotN}}. */
function splitLine(line: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const m of line.matchAll(SLOT)) {
    if (m.index > last) parts.push({ text: line.slice(last, m.index) });
    parts.push({ slot: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < line.length || !parts.length) parts.push({ text: line.slice(last) });
  return parts;
}

export default function ScaffoldBook({
  scaffold,
  note,
  slots,
  wrong,
  checked,
  onPlace,
}: {
  scaffold: Scaffold;
  /** Câu dẫn của bài (step_3.task.body) — đặt dưới code như ghi chú của Figma. */
  note?: string;
  /** Thẻ đang nằm trong từng ô, theo số ô. */
  slots: Record<number, string>;
  /** Ô đã chấm là sai (rỗng khi chưa bấm Kiểm tra). */
  wrong: number[];
  checked: boolean;
  onPlace: (n: number, label: string) => void;
}) {
  // Thẻ đang được kéo: dataTransfer KHÔNG đọc được trong dragover, nên phải
  // tự nhớ để biết ô nào được nhận (chỉ ô cùng số).
  const [drag, setDrag] = useState<{ slot: number; label: string } | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const lines = scaffold.template.replace(/\s+$/, '').split('\n');
  const lineOf = (n: number) => lines.findIndex((l) => [...l.matchAll(SLOT)].some((m) => Number(m[1]) === n));
  const total = scaffold.slots.length;
  const filled = scaffold.slots.filter((s) => slots[s.n]).length;

  return (
    <div className={c.book}>
      <section className={c.bookLeft} aria-label="Mã nguồn main.py">
        <div className={c.bookToolbar}>
          <span className={c.bookFile}>
            <span className={c.bookDots} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            main.py
          </span>
          <span className={c.bookRuntime}>
            <i aria-hidden="true" />
            Python 3.12
          </span>
        </div>
        <div className={c.bookSource}>
          {lines.map((line, i) => (
            <div key={i} className={c.bookLine}>
              <span className={c.bookNum} aria-hidden="true">
                {i + 1}
              </span>
              <span className={c.bookCode}>
                {splitLine(line).map((p, j) => {
                  if ('text' in p) return p.text;
                  const n = p.slot;
                  const label = slots[n];
                  const target = drag?.slot === n;
                  const cls = [
                    c.bookSlot,
                    label ? '' : c.bookSlotEmpty,
                    wrong.includes(n) ? c.bookSlotWrong : '',
                    target ? c.bookSlotTarget : '',
                    over === n && target ? c.bookSlotOver : '',
                  ].join(' ');
                  return (
                    <span
                      key={j}
                      className={cls}
                      aria-label={`Ô ${circled(n)}: ${label ?? 'còn trống'}`}
                      onDragOver={(e) => {
                        if (drag?.slot !== n) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setOver(n);
                      }}
                      onDragLeave={() => setOver((cur) => (cur === n ? null : cur))}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (drag?.slot === n) onPlace(n, drag.label);
                        setDrag(null);
                        setOver(null);
                      }}
                    >
                      {label ?? circled(n)}
                    </span>
                  );
                })}
              </span>
            </div>
          ))}
        </div>
        {note && <p className={c.bookNote}>{note}</p>}
      </section>

      <div className={c.bookSpine} aria-hidden="true" />

      <section className={c.bookRight} aria-labelledby="book-tray-title">
        <div className={c.bookTrayHead}>
          <div className={c.bookTrayText}>
            <h2 id="book-tray-title" className={c.bookTitle}>
              Kéo mã vào chỗ trống
            </h2>
            <p className={c.bookSub}>
              Chọn một đoạn mã cho mỗi ô. Có cả đáp án đúng và đáp án gây nhiễu.
            </p>
          </div>
          <span className={c.bookBadge}>
            {checked ? `${total - wrong.length} / ${total} đúng` : `${filled} / ${total} ô`}
          </span>
        </div>

        <div className={c.bookGroups}>
          {scaffold.slots.map((slot) => {
            const at = lineOf(slot.n);
            return (
              <div key={slot.n} className={c.bookGroup} role="group" aria-label={`Thẻ cho ô ${circled(slot.n)}`}>
                <div className={c.bookGroupHead}>
                  <span className={c.bookSlotBadge}>{circled(slot.n)}</span>
                  {at >= 0 && (
                    <span className={c.bookGroupLabel}>
                      Dòng {at + 1} ·{' '}
                      <code>{lines[at].trim().replace(SLOT, (_m, k) => (Number(k) === slot.n ? '…' : circled(Number(k))))}</code>
                    </span>
                  )}
                </div>
                {scaffold.bank
                  .filter((b) => b.slot === slot.n)
                  .map((b) => {
                    const on = slots[slot.n] === b.label;
                    return (
                      <button
                        key={b.label}
                        type="button"
                        draggable
                        className={on ? `${c.bookChoice} ${c.bookChoiceOn}` : c.bookChoice}
                        aria-pressed={on}
                        onClick={() => onPlace(slot.n, b.label)}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', b.label);
                          e.dataTransfer.effectAllowed = 'move';
                          setDrag({ slot: slot.n, label: b.label });
                        }}
                        onDragEnd={() => {
                          setDrag(null);
                          setOver(null);
                        }}
                      >
                        <span className={c.bookGrip} aria-hidden="true">
                          {GRIP}
                        </span>
                        <code className={c.bookChoiceCode}>{b.label}</code>
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>

        <p className={c.bookFoot}>
          <span className={c.bookMove} aria-hidden="true">
            {MOVE}
          </span>
          Giữ tay nắm ⋮⋮, kéo đoạn mã và thả vào ô có cùng số — hoặc bấm vào đoạn mã.
        </p>
      </section>
    </div>
  );
}
