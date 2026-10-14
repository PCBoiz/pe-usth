'use client';

// Một chỗ duy nhất đọc `prefers-reduced-motion` cho phần React.
//
// Vì sao không dùng @media trong CSS ở mọi chỗ: hai lỗi khả năng truy cập sửa
// ngày 14/10/2026 đều cần quyết định bằng JS, không chỉ bằng style.
//  - LessonOverlays: ở nhánh giảm chuyển động thì KHÔNG có animation nào, nên
//    `animationend` không bắn; phải đổi sang hẹn giờ (xem lib/status-pop-life.ts).
//  - TheoryScreen: hình minh hoạ phải MẶC ĐỊNH ĐỨNG YÊN, tức phải chọn `src`
//    khác ngay từ lần render đầu (xem lib/figure-motion.ts).
//
// Vì sao theo dõi bằng `change` chứ không đọc một lần: Windows và macOS cho đổi
// tuỳ chọn này giữa phiên (và DevTools → Rendering cũng đổi nóng để kiểm) —
// đọc một lần là trạng thái bị đóng băng sai.
//
// Dùng `useSyncExternalStore` chứ không phải useState + useEffect: matchMedia
// là nguồn dữ liệu NGOÀI React, và eslint của repo (react-hooks/set-state-in-effect)
// chặn đúng kiểu "đọc trạng thái ngoài rồi setState trong effect".
import { useSyncExternalStore } from 'react';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function available(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function subscribe(onChange: () => void): () => void {
  if (!available()) return () => {};
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return available() && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Trên server không có `window`; trả false để HTML dựng sẵn khớp lần render đầu. */
function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
