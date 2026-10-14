'use client';

/**
 * Vỏ hoạt cảnh MỞ SÁCH cho màn lý thuyết, và dấu hiệu ngắn khi vào màn sandbox.
 *
 * Lý do bỏ nửa sau của chuyển cảnh (gập sách → ngẩng lên → hiện IDE) nằm ở đầu
 * `@/lib/lesson-intro`. Tóm một câu: lý thuyết là màn 1, viết code là màn 10,
 * giữa chúng có TÁM màn khác — nối hai cảnh đó là kể một câu nhân–quả sai.
 *
 * Mọi quyết định (chạy hay không, bản nào, thời lượng, keyframe) nằm trong
 * `@/lib/lesson-intro` để `node --test` kiểm được không cần trình duyệt. File
 * này chỉ còn phần phải có DOM: gắn ref, gọi `.animate()`, bỏ qua, dọn dẹp.
 *
 * VÌ SAO BỌC Ở ĐÂY CHỨ KHÔNG Ở StudioLesson.frame(): màn lý thuyết là màn DUY
 * NHẤT có quyển sách. Bọc ở ngoài thì 10 màn còn lại cũng phải trả tiền cho
 * CSS 3D và cho phần JS quyết định chế độ.
 *
 * VỀ SSR / HYDRATE: `StudioLesson` chặn ở `if (loading)` với `loading` khởi
 * tạo `true`, nên HTML dựng trên server KHÔNG hề chứa màn lý thuyết — component
 * này luôn mount ở client, sau khi hydrate xong. Nhờ vậy đọc `sessionStorage`,
 * `CSS.supports` và `window.innerWidth` ngay trong hàm khởi tạo `useState` là
 * an toàn, không lệch hydrate.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// `sessionStorageOrNull` dùng lại từ ide-handoff, KHÔNG viết bản thứ hai: lý
// do nó tồn tại (chỉ ĐỌC `window.sessionStorage` cũng ném SecurityError khi
// trình duyệt chặn dữ liệu trang) không phụ thuộc vào chuyện đang cất mã /ide
// hay cất cờ "đã xem hoạt cảnh". Hai bản sao là hai chỗ để quên try/catch.
import { sessionStorageOrNull } from '@/lib/ide-handoff';
import {
  BOOK_MIN_WIDTH_PX,
  bookStep,
  coverStep,
  finishAnimations,
  type IntroMode,
  type IntroStep,
  introMode,
  introSeen,
  keySkips,
  markIntroSeen,
  SANDBOX_CUE_KEY,
  sandboxCueOn,
  sandboxCueSteps,
  supportsBook3d,
  textStep,
} from '@/lib/lesson-intro';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

import s from './BookIntro.module.css';

/**
 * Có Web Animations API hay không.
 *
 * Phải kiểm, chứ không chỉ "để cho nó nổ": `.animate()` là CÁCH DUY NHẤT hoạt
 * cảnh này chạy, và `finish()` là cách duy nhất bỏ qua được nó (xem
 * finishAnimations). Thiếu nó thì chế độ về 'off' và trạng thái nghỉ của CSS
 * — vốn đã là trạng thái cuối — chính là thứ người học thấy.
 */
function waapiAvailable(): boolean {
  return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
}

/** Trình duyệt dựng được cảnh 3D. Hỏi NĂNG LỰC, không dò tên trình duyệt. */
function book3dAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const css: typeof window.CSS | undefined = window.CSS;
  if (typeof css?.supports !== 'function') return false;
  return supportsBook3d((declaration) => css.supports(declaration));
}

/** Khung nhìn đủ rộng cho trải sách hai trang. */
function roomyViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth >= BOOK_MIN_WIDTH_PX;
}

export type BookIntroProps = {
  /** Nội dung lý thuyết THẬT. Luôn render, kể cả khi hoạt cảnh chưa xong. */
  children: React.ReactNode;
  /** Chữ trên bìa sách: mã bài + tiêu đề. */
  title: string;
  /** Dòng nhỏ trên bìa: chặng/module. */
  eyebrow?: string;
  /**
   * Bài có `step_1.theory` hay không. 28/48 bài KHÔNG có (X01–X05, N01–N06,
   * PD01–PD09, M01–M06, DA01–DA02) và với chúng thì KHÔNG có hoạt cảnh nào:
   * không có phần đọc thì không có quyển sách để mở.
   */
  hasTheory: boolean;
  /** Gọi khi hoạt cảnh lắng (xong, bị bỏ qua, hoặc không có hoạt cảnh nào). */
  onSettled?: () => void;
};

export default function BookIntro({
  children,
  title,
  eyebrow,
  hasTheory,
  onSettled,
}: BookIntroProps) {
  const reduced = usePrefersReducedMotion();

  // Quyết định MỘT LẦN lúc mount. Đổi tuỳ chọn hệ thống hay thu cửa sổ giữa
  // chừng không được làm hoạt cảnh đang chạy tự đổi chế độ — nó sẽ đổi chế độ
  // ngay giữa một chuyển động, tức đúng cái giật mà cả file này tránh.
  const [mode] = useState<IntroMode>(() =>
    introMode({
      hasTheory,
      reduced,
      seen: introSeen(sessionStorageOrNull()),
      book3d: book3dAvailable(),
      roomy: roomyViewport(),
      waapi: waapiAvailable(),
    }),
  );

  const [running, setRunning] = useState(mode !== 'off');
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<HTMLDivElement | null>(null);
  const coverRef = useRef<HTMLDivElement | null>(null);
  const animsRef = useRef<Animation[]>([]);

  // onSettled qua ref: đổi hàm callback không được khởi động lại hoạt cảnh.
  const settledRef = useRef(onSettled);
  useEffect(() => {
    settledRef.current = onSettled;
  }, [onSettled]);

  const settle = useCallback(() => {
    animsRef.current = [];
    // Nhả lớp GPU đã hâm nóng. Không giữ `will-change` vô thời hạn trên trang
    // vốn đã nặng (Monaco + Pyodide + 23 SVG tự chạy).
    sceneRef.current?.removeAttribute('data-warm');
    setRunning(false);
    settledRef.current?.();
  }, []);

  useLayoutEffect(() => {
    if (mode === 'off') return;
    const layer = layerRef.current;
    if (!layer) return;

    // Ghi "đã xem" ngay lúc BẮT ĐẦU, không chờ tới lúc xong. Mọi đường ra khỏi
    // hoạt cảnh (xong, bỏ qua, rời màn giữa chừng, tải lại trang giữa chừng)
    // đều đã là "đã xem" theo nghĩa người học quan tâm; ghi ở đầu thì không có
    // đường nào quên ghi.
    markIntroSeen(sessionStorageOrNull());

    const anims: Animation[] = [];
    const add = (el: Element | null, step: IntroStep) => {
      if (!el) return;
      const anim = el.animate(step.keyframes, step.options);
      // Dừng ở khung ĐẦU rồi mới chạy ở khung hình sau. Lý do: `data-warm`
      // (tức `will-change`) có mặt trong DOM từ lần render đầu của `.scene`,
      // nhưng lớp GPU chỉ thực sự được tạo ở lượt style/paint kế tiếp. Nguyên
      // mẫu đo được một task 39,9ms khi bật `will-change` ĐÚNG LÚC chuyển động
      // bắt đầu, nên ở đây chuyển động nhường ra một khung hình. `fill` là
      // 'backwards' nên lúc tạm dừng phần tử vẫn đứng ở khung đầu — không có
      // cú chớp "chữ hiện rồi tắt rồi hiện lại".
      anim.pause();
      anim.currentTime = 0;
      anims.push(anim);
    };

    add(layer, textStep(mode));
    if (mode === 'full') {
      add(coverRef.current, coverStep());
      add(bookRef.current, bookStep());
    }
    animsRef.current = anims;

    let alive = true;
    const raf = requestAnimationFrame(() => {
      if (!alive) return;
      for (const anim of anims) anim.play();
    });
    // Một đường về duy nhất cho MỌI kết cục: xong tự nhiên, bị `finish()` vì
    // bỏ qua, hay bị `cancel()`. `allSettled` chứ không `all`: một animation bị
    // cancel thì `finished` BỊ TỪ CHỐI, và `all` sẽ bỏ luôn cú settle — tức nút
    // "Bỏ qua" còn treo trên màn và hình minh hoạ còn bị đóng băng.
    void Promise.allSettled(anims.map((anim) => anim.finished)).then(() => {
      if (alive) settle();
    });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      // Rời màn giữa hoạt cảnh (nút ‹ của LessonChrome): kết thúc chứ không
      // bỏ dở. `fill: 'backwards'` nên kết thúc là trả phần tử về trạng thái
      // nghỉ của CSS — nếu màn này được mount lại thì nó mount sạch.
      finishAnimations(anims);
    };
  }, [mode, settle]);

  // Chế độ 'off': không có animation nào, nhưng vẫn phải ghi "đã xem" và gọi
  // onSettled (chỗ gọi dùng nó để cho hình minh hoạ chạy lại). Effect THƯỜNG,
  // không phải layout effect: không có gì phải xong trước lúc vẽ.
  useEffect(() => {
    if (mode !== 'off') return;
    markIntroSeen(sessionStorageOrNull());
    settledRef.current?.();
  }, [mode]);

  const skip = useCallback(() => {
    finishAnimations(animsRef.current);
  }, []);

  // Bấm phím bất kỳ / chạm / bấm chuột = bỏ qua. Chỉ gắn khi đang chạy.
  useEffect(() => {
    if (!running) return;
    const onKey = (event: KeyboardEvent) => {
      if (!keySkips(event)) return;
      // Chặn hành vi mặc định của phím: lúc này người học đang nói "cho tôi
      // xem nội dung", không phải đang ra lệnh cho trang.
      event.preventDefault();
      skip();
    };
    const onPointer = () => skip();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [running, skip]);

  // Người dùng bật "giảm chuyển động" GIỮA lúc hoạt cảnh chạy. Với `transition`
  // thì `@media` trong CSS lo được, nhưng Web Animations API không chịu ảnh
  // hưởng của media query — phải tự kết thúc. Kết thúc, không bỏ dở: nội dung
  // phải ở trạng thái cuối ngay lập tức.
  useEffect(() => {
    if (reduced && running) skip();
  }, [reduced, running, skip]);

  return (
    // `data-running` bật phần cắt khung của `.root` — chỉ trong lúc bìa còn
    // quét, xem chú thích `.root[data-running]` trong CSS module.
    <div className={s.root} data-running={running && mode === 'full' ? '' : undefined}>
      {/* Quyển sách là TRANG TRÍ: aria-hidden, và tháo khỏi DOM ngay khi hoạt
          cảnh lắng. Tháo được mà không ai thấy vì mặt giấy dùng đúng --ds-page
          của nền trang (xem .spread trong CSS module). */}
      {running && mode === 'full' && (
        <div className={s.scene} ref={sceneRef} aria-hidden="true" data-warm="">
          <div className={s.book} ref={bookRef}>
            <div className={s.board} />
            <div className={s.spread}>
              <div className={`${s.sheet} ${s.sheetL}`} />
              <div className={s.spine} />
              <div className={`${s.sheet} ${s.sheetR}`} />
            </div>
            <div className={s.cover} ref={coverRef}>
              <div className={`${s.face} ${s.faceFront}`}>
                <div>
                  {eyebrow && <div className={s.coverEyebrow}>{eyebrow}</div>}
                  <div className={s.coverTitle}>{title}</div>
                  <div className={s.coverRule} />
                </div>
              </div>
              <div className={`${s.face} ${s.faceBack}`} />
            </div>
          </div>
        </div>
      )}

      {/* Nội dung thật: TRONG DOM ngay từ lần render đầu, nên trình đọc màn
          hình có nó không cần chờ hoạt cảnh. `opacity: 0` lúc đang mở sách do
          Web Animations đặt — và `opacity: 0` vẫn được đọc, khác hẳn
          `display: none` / `visibility: hidden`. */}
      <div className={s.layer} ref={layerRef}>
        {children}
      </div>

      {/* Nút chỉ có ở bản ĐẦY ĐỦ. Bản rút gọn dài 240ms: một cái nút loé lên
          rồi tắt trong 240ms là nhiễu, không phải lối thoát. Phím/chạm vẫn bỏ
          qua được ở cả hai bản. */}
      {running && mode === 'full' && (
        <button type="button" className={s.skip} onClick={skip}>
          Bỏ qua
        </button>
      )}
    </div>
  );
}

/**
 * Dấu hiệu vào màn sandbox: khung soạn thảo nhấc lên và hiện, kèm một quầng
 * viền loé lên quanh khung. 240ms, chỉ `opacity`/`transform`.
 *
 * KHÔNG phải nửa sau của chuyển cảnh nguyên mẫu (gập sách → ngẩng lên → IDE).
 * Đây là một cú RIÊNG, ngắn, không liên quan tới quyển sách: giữa màn lý
 * thuyết và màn này có tám màn khác, nên lúc người học tới đây thì trong tay
 * họ không còn quyển sách nào để gập.
 */
export function SandboxCue({ children }: { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const [on] = useState(() =>
    sandboxCueOn({
      reduced,
      // Khoá RIÊNG: đây là cảnh khác cảnh mở sách, nhớ riêng. Dùng chung khoá
      // thì mở bài rồi là dấu hiệu sandbox không bao giờ chạy.
      seen: introSeen(sessionStorageOrNull(), SANDBOX_CUE_KEY),
      waapi: waapiAvailable(),
    }),
  );
  const [lit, setLit] = useState(on);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const haloRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    if (!on) return;
    const frame = frameRef.current;
    if (!frame) return;
    markIntroSeen(sessionStorageOrNull(), SANDBOX_CUE_KEY);

    const steps = sandboxCueSteps();
    const anims: Animation[] = [frame.animate(steps.frame.keyframes, steps.frame.options)];
    const halo = haloRef.current;
    if (halo) anims.push(halo.animate(steps.halo.keyframes, steps.halo.options));

    let alive = true;
    void Promise.allSettled(anims.map((anim) => anim.finished)).then(() => {
      if (alive) setLit(false);
    });
    return () => {
      alive = false;
      finishAnimations(anims);
    };
  }, [on]);

  return (
    <div className={s.cue} ref={frameRef}>
      {lit && <span className={s.halo} ref={haloRef} aria-hidden="true" />}
      {children}
    </div>
  );
}
