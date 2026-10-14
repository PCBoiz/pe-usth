'use client';

// Những thứ nổi lên TRÊN bài học: "+10 điểm · Combo x3", pháo giấy khi code
// chạy đúng, hộp huy hiệu mới, và thanh thông báo dưới đáy.
//
// Dùng createPortal ra `document.body` vì LessonChrome có vùng cuộn riêng —
// để trong cây thẻ thì hiệu ứng bị cắt theo khung cuộn đó.
//
// Người bật "giảm chuyển động" được xử lý RIÊNG ở đây, không chỉ bằng CSS: ở
// nhánh đó hai thông báo không animate gì cả, nên `animationend` không bao giờ
// bắn và phải gỡ bằng hẹn giờ. Lý do đầy đủ: lib/status-pop-life.ts.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { statusPopPlan } from '@/lib/status-pop-life';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

import c from './studio-chrome.module.css';
import type { Award } from './useLessonData';

export default function LessonOverlays({
  pop,
  onPopEnd,
  celebrate,
  onCelebrateEnd,
  awards,
  onDismissAwards,
  message,
  onDismissMessage,
}: {
  pop: { id: number; text: string } | null;
  onPopEnd: () => void;
  /** Đổi số để chạy lại animation; 0 = không có gì. */
  celebrate: number;
  onCelebrateEnd: () => void;
  awards: Award[];
  onDismissAwards: () => void;
  message: string;
  onDismissMessage: () => void;
}) {
  const plan = statusPopPlan(usePrefersReducedMotion());
  const popId = pop?.id ?? 0;

  // Giữ hai hàm gỡ trong ref: chỗ gọi (StudioLesson.tsx) truyền arrow dựng mới
  // ở MỖI lần render. Đưa chúng vào mảng phụ thuộc thì mỗi render lại đặt lại
  // hẹn giờ, nên thông báo sống thêm vô hạn khi màn đang render liên tục (ví dụ
  // lúc chạy code). Chỉ `popId`/`celebrate` được phép đặt lại hẹn giờ.
  const endRef = useRef({ pop: onPopEnd, celebrate: onCelebrateEnd });
  // Gán trong effect, không gán khi render: eslint react-hooks/refs chặn việc
  // chạm `.current` giữa lúc render.
  useEffect(() => {
    endRef.current = { pop: onPopEnd, celebrate: onCelebrateEnd };
  });

  // Hẹn giờ gỡ — CHỈ ở nhánh giảm chuyển động (`dismissAfterMs !== null`). Mỗi
  // lần `popId` đổi là một thông báo mới nên hẹn giờ đặt lại từ đầu.
  useEffect(() => {
    if (plan.dismissAfterMs === null || popId === 0) return;
    const t = window.setTimeout(() => endRef.current.pop(), plan.dismissAfterMs);
    return () => window.clearTimeout(t);
  }, [popId, plan.dismissAfterMs]);

  useEffect(() => {
    if (plan.dismissAfterMs === null || celebrate <= 0) return;
    const t = window.setTimeout(() => endRef.current.celebrate(), plan.dismissAfterMs);
    return () => window.clearTimeout(t);
  }, [celebrate, plan.dismissAfterMs]);

  return (
    <>
      {pop &&
        createPortal(
          <div
            key={`pop-${pop.id}`}
            className={c.pop}
            role="status"
            onAnimationEnd={plan.dismissOnAnimationEnd ? onPopEnd : undefined}
          >
            {pop.text}
          </div>,
          document.body,
        )}
      {celebrate > 0 &&
        createPortal(
          <div
            key={`burst-${celebrate}`}
            className={c.burst}
            aria-hidden="true"
            onAnimationEnd={
              plan.dismissOnAnimationEnd
                ? (e) => {
                    if (e.target === e.currentTarget) onCelebrateEnd();
                  }
                : undefined
            }
          >
            {['🎉', '✨', '🐍', '⭐', '🎊', '✨', '🎉', '⭐'].map((emoji, i) => (
              <span key={i} style={{ '--i': i } as React.CSSProperties}>
                {emoji}
              </span>
            ))}
            <strong>Code chạy đúng!</strong>
          </div>,
          document.body,
        )}
      {awards.length > 0 &&
        createPortal(
          <div className={c.awardsBackdrop} role="dialog" aria-modal="true" aria-label="Thành tích mới">
            <div className={c.awards}>
              <p className={c.awardsEyebrow}>THÀNH TÍCH MỚI</p>
              {awards.map((a, i) => (
                <div key={i} className={c.award}>
                  <span>{a.icon || '🏅'}</span>
                  <div>
                    <strong>{a.name || 'Huy hiệu mới'}</strong>
                    {a.description && <p>{a.description}</p>}
                  </div>
                </div>
              ))}
              <button type="button" onClick={onDismissAwards}>
                Tuyệt vời!
              </button>
            </div>
          </div>,
          document.body,
        )}
      {message && (
        <div className={c.toast} role="status">
          <p>{message}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={onDismissMessage}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
