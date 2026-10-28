'use client';

// Dựng mọi bài lưu ở `lessons.content_json` theo schema studio-lesson/v1 (kết
// quả của bộ nhập PDF/Markdown và của scripts/pe-v3) bằng khung
// LessonChrome — vỏ dịch từ Stitch, xem trước ở /admin/lesson-chrome-demo:
// thanh tiến độ trên đầu, MỘT thẻ nội dung mỗi màn, một nút CTA dưới đáy.
//
// Khác bản cũ ở chỗ chia màn: trước đây mỗi bước S1–S4 là một trang nhồi nhiều
// thẻ; giờ mỗi phần (ngữ cảnh, giải thích, từng câu hỏi, khung lắp ghép,
// sandbox…) là một màn riêng — buildScreens() trong @/lib/studio-lesson quyết
// định danh sách đó và tự bỏ phần tài liệu nguồn không có.
//
// Bài List & Mutability dựng tay vẫn dùng PythonStudio.tsx, không đi qua đây.
//
// File này giờ CHỈ còn phần điều phối. Trước đây nó là 2.058 dòng với 31
// useState và cả phần render của 15 loại màn; cắt ra thành:
//
//   screens/          một component cho mỗi loại màn, nhận props, không đọc
//                     state dùng chung (screens/index.tsx phân tuyến)
//   runner/           hợp đồng `Runner` + bản chạy bằng Pyodide trong Worker
//   useCodeRunner.ts  cầu nối React cho bộ chạy, và luật "chạy & nộp" của bài
//   useLessonData.ts  mọi thứ hỏi backend về bài học
//   useLessonDraft.ts bản nháp + tự lưu xuống localStorage
//   useLessonProgress.ts  màn đang mở, màn đã đúng, điểm/combo, hiệu ứng
//   cta.ts            luật của nút CTA dưới đáy (hàm thuần)
//   answer-key.ts     bảng đáp án cho admin (hàm thuần)
import { useEffect, useMemo, useRef, useState } from 'react';

import LessonChrome from '@/components/lesson-chrome/LessonChrome';
import ShellB from '@/components/lesson-chrome/ShellB';
import c from './studio-chrome.module.css';
import AdminAnswerKey from './AdminAnswerKey';
import LessonOverlays from './LessonOverlays';
import { answerKeyFor } from './answer-key';
import { primaryCta, secondaryCta, type Action, type Cta } from './cta';
import { useLessonRun } from './useCodeRunner';
import { useLessonData } from './useLessonData';
import { useLessonDraft } from './useLessonDraft';
import { useLessonProgress } from './useLessonProgress';
import LessonScreenView from './screens';
import { ICON } from './screens/chrome';
import { datBoiCanhBai, dayNgay, ghiSuKien } from '@/lib/learning-events';

import ConsentBanner from './ConsentBanner';
import {
  buildScreens,
  EMPTY_SCORE,
  firstUnfinished,
  gameOf,
  isRunnableGame,
  markDoneOnNext,
  maxReachedStep,
  quizPercent,
  screenVerdict,
  type LessonScreen,
} from '@/lib/studio-lesson';

export default function StudioLesson({
  courseId,
  lessonNo,
  courseName = 'Python',
}: {
  courseId: string;
  lessonNo: number;
  /** Tên khoá hiện trên thanh trên cùng và nút đăng ký. */
  courseName?: string;
}) {
  // Bản nháp trước, vì hook dữ liệu cần `restore` để nạp lại nháp đúng lúc có
  // nội dung bài (giữ nguyên thứ tự cũ: một lần render, không nhảy màn).
  const draftState = useLessonDraft({ courseId, lessonNo });
  const data = useLessonData({ courseId, lessonNo, onDraftReady: draftState.restore });
  const {
    lesson,
    meta,
    user,
    streak,
    totalLessons,
    enrolled,
    completed,
    loading,
    loadError,
    empty,
    busy,
    message,
    setMessage,
    xpGained,
    awards,
    setAwards,
    enroll,
    consent,
    decideConsent,
  } = data;
  const load = data.reload;
  const d = draftState.draft;
  const update = draftState.update;
  const saveStatus = draftState.saveStatus;

  const screens = useMemo(() => (lesson ? buildScreens(lesson) : []), [lesson]);

  // Chờ LÂU thì phải nói ra đang chờ gì.
  //
  // Đo trên production ngày 25/10/2026: request API ĐẦU TIÊN sau lúc máy chủ
  // nghỉ mất hơn 25 giây (Render + Neon thức dậy), các request sau 300 ms. Suốt
  // 25 giây đó trang chỉ hiện "Đang tải bài học…" — không một chữ nào nói vì
  // sao, nên người học đầu tiên trong ngày kết luận là trang hỏng rồi bỏ đi.
  // Mốc 6 giây: đủ dài để lần tải bình thường (300 ms – 3 s) không bao giờ thấy
  // dòng này, đủ ngắn để họ đọc được nó trước khi mất kiên nhẫn.
  const [choLau, setChoLau] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const hen = setTimeout(() => setChoLau(true), 6000);
    // Dọn ở CLEANUP, không phải trong thân effect: React 19 chặn `setState`
    // đồng bộ trong thân (`react-hooks/set-state-in-effect`) vì nó gây một
    // lượt render dây chuyền, và luật đó đúng.
    return () => {
      clearTimeout(hen);
      setChoLau(false);
    };
  }, [loading]);
  const scr: LessonScreen | undefined = screens[d.step - 1];

  /**
   * NHỊP CÒN ĐANG MỞ BÀI + sự kiện BỎ DỞ.
   *
   * Vì sao cần cả hai, và vì sao chúng không thay nhau được:
   *  · `X-Lesson.Open` một mình không phân biệt được "đọc 20 phút" với "mở tab
   *    rồi đi ăn cơm". Chỉ nhịp heartbeat nói được họ còn ở đó.
   *  · Nhưng "nhịp dừng" cũng xảy ra khi máy sleep hay mất mạng, nên nó KHÔNG
   *    thay được `X-Lesson.Abandon` — cái đó là một HÀNH VI (tab bị ẩn / rời
   *    trang khi chưa hoàn thành), không phải một khoảng lặng.
   *
   * Màn hiện tại đi kèm sự kiện bỏ dở: "bỏ ở màn nào" là thứ duy nhất phân biệt
   * được "đề bài không hiểu nổi" với "đọc xong rồi bỏ".
   *
   * 30 giây: đủ thưa để một buổi học 40 phút chỉ sinh 80 sự kiện, đủ dày để
   * phân giải thời-gian-trên-tác-vụ xuống nửa phút — mà phép đo đó chỉ dùng làm
   * bộ phát hiện ngoại lai TRONG MỘT NGƯỜI ("người này mất 40 phút cho bài 12
   * phút"), nên không cần mịn hơn.
   *
   * Đọc trạng thái qua REF, không qua dependency: để nhịp và listener gắn ĐÚNG
   * MỘT LẦN cho cả lượt mở bài. Đưa `scr`/`completed` vào deps thì mỗi lần
   * chuyển màn là gỡ rồi gắn lại interval, và nhịp 30 giây không bao giờ tới.
   */
  const trangThaiRef = useRef<{ screenKey?: string; completed: boolean; step: number }>({
    completed: false,
    step: 1,
  });
  // Đồng bộ trong EFFECT, không trong thân render: React 19 chặn việc ghi ref
  // lúc render (`react-hooks/refs`), và luật đó đúng — ghi lúc render thì một
  // lần render bị bỏ (StrictMode, Suspense) vẫn để lại giá trị mới.
  // Không có mảng dep: effect này cố ý chạy sau MỌI lần render.
  useEffect(() => {
    trangThaiRef.current = { screenKey: scr?.key, completed, step: d.step };
  });

  useEffect(() => {
    if (loading || !lesson) return;
    const nhip = setInterval(() => {
      // Tab đang ẩn thì KHÔNG đập nhịp: nhịp là để nói "họ còn ở đây", mà một
      // tab ẩn thì họ không ở đây. (Trình duyệt cũng bóp `setInterval` ở tab
      // nền, nên nhịp ở đó vừa sai vừa thưa.)
      if (document.visibilityState !== 'visible') return;
      const t = trangThaiRef.current;
      ghiSuKien('X-Lesson.Heartbeat', {
        screenKey: t.screenKey,
        payload: { step: t.step, completed: t.completed },
      });
    }, 30_000);

    const boDo = (vi_sao: 'hidden' | 'unmount') => {
      const t = trangThaiRef.current;
      // ĐÃ HOÀN THÀNH thì không phải bỏ dở. Ghi cả hai vào một loại là làm
      // câu SQL "bài nào có người đâm tường" đếm cả những người học xong.
      if (t.completed) return;
      ghiSuKien('X-Lesson.Abandon', {
        screenKey: t.screenKey,
        payload: { step: t.step, totalSteps: screens.length, reason: vi_sao },
      });
    };
    const khiAn = () => {
      if (document.visibilityState === 'hidden') boDo('hidden');
    };
    document.addEventListener('visibilitychange', khiAn);

    return () => {
      clearInterval(nhip);
      document.removeEventListener('visibilitychange', khiAn);
      boDo('unmount');
      // Gỡ bối cảnh = đóng cổng ghi, VÀ đẩy nốt những gì đang chờ. Không gỡ thì
      // lần mở bài sau nối tiếp bối cảnh cũ và vài sự kiện bị gán nhầm bài.
      datBoiCanhBai(null);
      dayNgay();
    };
    // `lesson`/`loading` là hai thứ duy nhất quyết định lượt mở bài này có
    // sống hay không; mọi trạng thái đổi theo từng màn đi qua ref ở trên.
  }, [loading, lesson, screens.length]);
  const play = lesson?.play;
  const boss = Boolean(play?.boss);
  const game = lesson ? gameOf(lesson, scr) : undefined;
  const score = d.score ?? EMPTY_SCORE;

  const progress = useLessonProgress({
    screens,
    draft: d,
    setDraft: draftState.setDraft,
    update,
    scored: Boolean(play),
    clearMessage: () => setMessage(''),
  });
  const {
    checkedKey,
    setCheckedKey,
    runVerdicts,
    setRunVerdicts,
    gameRuns,
    setGameRuns,
    pop,
    setPop,
    celebrate,
    setCelebrate,
    flash,
    setFlash,
    held,
    setHeld,
    hintOpen,
    setHintOpen,
    hintIndex,
    setHintIndex,
    procedureOpen,
    setProcedureOpen,
    answerOpen,
    setAnswerOpen,
    markDone,
    updateGame,
    goTo,
    award,
  } = progress;

  /**
   * Chạy & nộp bài: giữ worker Python nguội sẵn giữa các lượt, nạp runtime từ
   * lúc mở bài, và áp luật của bài khi nộp. Chi tiết Worker/Pyodide nằm sau
   * seam `Runner` — xem runner/types.ts.
   */
  const lessonRun = useLessonRun({
    lesson,
    screens,
    draft: d,
    busy,
    scored: Boolean(play),
    update,
    markDone,
    goTo,
    award,
    setCheckedKey,
    setRunVerdicts,
    setGameRuns,
    setMessage,
    setCelebrate,
    // `quizScore` do TRÌNH DUYỆT chấm (AGENTS.md: server tin con số này, chỉ
    // chặn trần XP bằng `lessons.xp_reward`).
    saveCompletion: () => data.complete(diemBai()),
  });
  const { running, runtimeStatus, result, run, runGame } = lessonRun;
  const cancelRun = lessonRun.cancel;
  /**
   * Điểm bài gửi về backend: tỉ lệ màn chấm ĐÚNG NGAY LẦN ĐẦU.
   *
   * Trước đây là `play ? quizPercent(…) : 100` — tức khoá 172 bài luôn gửi
   * 100, kể cả khi trả lời sai cả 3 câu trắc nghiệm, vì `score.firstTry` của
   * nó rỗng (xem `award`). Cộng với luật cũ "sai thì chỉ còn nút Thử lại",
   * điểm bài là 100% với MỌI người học sau vài lần bấm. Nay `quizPercent` tự
   * trả 100 khi bài không có màn nào được chấm (bài quy trình, bài làm trên
   * máy), nên không cần cổng `play` nữa.
   */
  function diemBai(): number {
    return quizPercent(screens, d, boss);
  }
  const complete = () => data.complete(diemBai());

  // ---------- Trạng thái màn hiện tại ----------

  const checked = Boolean(scr && checkedKey === scr.key);
  const verdict =
    lesson && scr && checked
      ? isRunnableGame(game)
        ? (runVerdicts[scr.key] ?? null)
        : screenVerdict(lesson, scr, d)
      : null;
  // Phần nội dung của S4 mà VỎ còn cần biết (nút CTA, nút gợi ý, màn tổng kết).
  // Những gì chỉ màn sandbox dùng đã nằm trong screens/SandboxScreen.tsx.
  const hints = lesson?.step_4?.hints ?? [];
  const gate = Boolean(lesson?.step_4?.gate);

  const hasNextLesson = totalLessons > 0 && lessonNo < totalLessons;

  /** Nhãn/màu/hành động của nút CTA — quy tắc nằm trong cta.ts (hàm thuần). */
  function primary(): Cta {
    return primaryCta({
      lesson,
      scr,
      screens,
      draft: d,
      game,
      checked,
      verdict,
      completed,
      hasNextLesson,
      lessonNo,
      running,
      busy,
      result,
    });
  }

  function doAction(action: Action) {
    if (action === 'leave') return leave();
    if (action === 'nextLesson')
      return window.location.assign(`/lesson/${courseId}?lesson=${lessonNo}`);
    if (action === 'toSandbox')
      return goTo(screens.findIndex((x) => x.kind === 'sandbox') + 1);
    if (action === 'toBlocked') {
      const missing = firstUnfinished(screens, d);
      if (missing) goTo(screens.indexOf(missing) + 1);
      return;
    }
    if (action === 'complete') return void complete();
    if (action === 'submit') return run(true);
    if (action === 'check') {
      if (!scr || !lesson) return;
      setFlash('');
      if (game && isRunnableGame(game)) return runGame(scr.key, game, true);
      setCheckedKey(scr.key);
      const v = screenVerdict(lesson, scr, d);
      if (v) {
        const misses = game?.type === 'match' ? (d.games?.[game.id]?.misses ?? 0) : 0;
        award(scr.key, v.correct, v.correct && !misses);
      }
      if (v?.correct) markDone(scr.key);
      // ĐÁP ÁN TRẮC NGHIỆM CHI TIẾT, không chỉ điểm.
      //
      // `lesson_progress.quiz_score` là MỘT con số gộp cho cả bài, nên nó không
      // bao giờ chỉ ra được distractor NÀO bị chọn lặp lại — mà đúng cái đó mới
      // quyết định được bài nào cần `MisconceptionScreen`. Ghi `picked` (khoá
      // phương án, kiểu 'A'/'B') chứ KHÔNG ghi nội dung phương án: nội dung là
      // chữ của người soạn giáo trình, tra lại được bằng `screenKey` + `index`.
      //
      // Chỉ các màn CÓ CHẤM tại chỗ; `read`/`practice` của khoá bài đọc không
      // có gì để so nên `screenVerdict` trả null ở đó.
      if (v && (scr.kind === 'mcq' || scr.kind === 'predict')) {
        ghiSuKien('X-Quiz.Answer', {
          screenKey: scr.key,
          payload: {
            screenKind: scr.kind,
            index: scr.index ?? 0,
            picked: scr.kind === 'mcq' ? (d.mcq[scr.index ?? 0] ?? '') : d.predict,
            correct: v.correct,
            // Lần chấm ĐẦU của màn này hay chấm lại sau khi sai: một phương án
            // sai bị chọn ở lần đầu nói khác hẳn với chọn sau khi đã thử hết.
            firstTry: d.score?.firstTry?.[scr.key] === undefined,
            assisted: Boolean(d.assisted),
          },
        });
      }
      return;
    }
    if (action === 'retry') return setCheckedKey('');
    // ĐI TIẾP. `markDoneOnNext` chứ không `markDone` trần: câu chọn phương án
    // nay đi tiếp được cả khi SAI, mà đánh dấu "đã làm đúng" cho một câu sai
    // thì ô "Câu đã làm đúng" ở màn tổng kết đếm luôn cả nó.
    if (scr && markDoneOnNext(scr, verdict)) markDone(scr.key);
    goTo(d.step + 1);
  }

  function leave() {
    // Mang theo chỉ số bài để trang khoá học mở đúng module chứa nó. Một
    // người thử ngày 27/10: "khi mà t click vào dấu x để tắt hoặc về trang thì
    // nó lại mở full list mục 1 và t lại phải tìm lại bài nếu t học mục 2,3".
    // Tức đường ra duy nhất của màn bài học luôn thả người ta xuống đầu khoá
    // 172 bài.
    //
    // `lessonNo - 1` vì hai bên đánh số LỆCH NHAU: `lessonNo` là `sort_order`
    // đếm từ 1, còn link ở trang khoá học là chỉ số phẳng đếm từ 0. Quên trừ
    // thì nó mở đúng module trong hầu hết trường hợp nên trông như chạy được,
    // chỉ sai ở bài ĐẦU của mỗi module — đúng kiểu lỗi không ai thấy.
    window.location.assign(`/courses/${courseId}?lesson=${lessonNo - 1}`);
  }

  // ---------- Vỏ ----------

  const cta = primary();
  /** Nút PHỤ của màn đang mở (hôm nay: "Chọn lại" sau câu trắc nghiệm sai). */
  const phu = secondaryCta({
    lesson,
    scr,
    screens,
    draft: d,
    game,
    checked,
    verdict,
    completed,
    hasNextLesson,
    lessonNo,
    running,
    busy,
    result,
  });
  const adminKey = user?.role === 'admin' ? answerKeyFor({ lesson, scr, game, draft: d }) : null;
  const reached = maxReachedStep(screens, d);
  function frame(children: React.ReactNode, over?: Partial<React.ComponentProps<typeof LessonChrome>>) {
    return (
      <LessonChrome
        step={Math.min(d.step, Math.max(1, screens.length || 1))}
        totalSteps={Math.max(1, screens.length || 1)}
        streak={streak}
        points={play ? score.points : undefined}
        courseLabel={
          (boss ? '⚔️ BOSS · ' : '') +
          (lesson?.step_1?.brief?.title || meta?.title
            ? `${courseName} · ` + (lesson?.step_1?.brief?.title || meta?.title)
            : `${courseName} Studio`)
        }
        // Lưu nháp thành công thì giữ đúng câu của Figma; chỉ đổi khi có lỗi.
        saveLabel={saveStatus.startsWith('Không') ? saveStatus : '✓ Tiến độ tự lưu'}
        onClose={leave}
        primaryLabel={cta.label}
        primaryTone={cta.tone}
        primaryDisabled={cta.disabled}
        onPrimaryClick={() => doAction(cta.action)}
        // Quay lại màn trước. Dùng CHÍNH `goTo` mà thanh tiến độ dùng, không
        // viết một đường đi thứ hai: `goTo` đã lo xoá kết quả chấm của màn cũ,
        // đóng gợi ý và cuộn lên đầu — bỏ sót một trong ba thứ đó thì màn mới
        // mở ra kèm băng "Chưa đúng" của màn trước.
        onBack={() => goTo(d.step - 1)}
        onSeek={screens.length > 1 ? goTo : undefined}
        seekMax={Math.max(d.step, Math.min(screens.length, reached))}
        doneSteps={screens.map((x) => completed || Boolean(d.done[x.key]))}
        // Màn lý thuyết và màn BÀI ĐỌC chạy ở cột rộng — xem .contentWide
        // trong LessonChrome.module.css (hình minh hoạ khổ 1280×640; bài đọc
        // thì vì bảng và khối code cần chiều ngang — chữ vẫn bó ~78 ký tự).
        wide={scr?.kind === 'theory' || scr?.kind === 'read'}
        // Ô nút phụ có HAI người dùng, và chúng không bao giờ cùng xuất hiện:
        // "Chọn lại" sau một câu trắc nghiệm sai (màn mcq/predict) và "💡 Gợi
        // ý" (chỉ màn sandbox). `secondaryCta` được hỏi TRƯỚC vì nó nói về màn
        // đang mở, còn nhánh gợi ý mới là nhánh mặc định của màn sandbox.
        secondaryLabel={
          phu
            ? phu.label
            : hints.length && scr?.kind === 'sandbox' && !boss
              ? hintOpen
                ? '💡 Ẩn gợi ý'
                : gate && !d.assisted
                  ? '💡 Gợi ý (tính là có hỗ trợ)'
                  : '💡 Gợi ý'
              : undefined
        }
        onSecondaryClick={() => {
          if (phu) return doAction(phu.action);
          if (!hintOpen && !d.assisted) update({ assisted: true });
          // MỞ GỢI Ý: `lesson_progress` không có chỗ nào ghi việc này, mà nó là
          // dấu hiệu bỏ-cuộc mạnh nhất còn TRONG bài — người học vẫn ở đây
          // nhưng đã hết tự lực. Chỉ ghi lúc MỞ, không ghi lúc đóng.
          if (!hintOpen) {
            ghiSuKien('Resource.View', {
              screenKey: scr?.key,
              payload: { resource: 'hint', level: hintIndex, gate, boss },
            });
          }
          setHintOpen((o) => !o);
        }}
        {...over}
      >
        {/* HỘP XIN ĐỒNG Ý, đặt TRƯỚC nội dung bài có chủ đích: nó phải được
            thấy, và một hộp dưới đáy một bài dài là một hộp không ai đọc. Nhưng
            nó KHÔNG chặn bài — người học cuộn qua và học bình thường nếu chưa
            muốn trả lời (chặn bài để lấy sự đồng ý là cưỡng chế).

            `consent?.shouldAsk` chứ không `!consent?.granted`: người đã TỪ CHỐI
            cũng là `granted: false` nhưng KHÔNG được hỏi lại — xem `canHoiLai()`
            ở backend. Và `consent === null` (chưa đọc xong) cũng không hiện, nên
            hộp không loé lên một nhịp ở mỗi lần mở bài. */}
        {consent?.shouldAsk ? <ConsentBanner onDecide={decideConsent} /> : null}
        {children}
        <LessonOverlays
          pop={pop}
          onPopEnd={() => setPop(null)}
          celebrate={celebrate}
          onCelebrateEnd={() => setCelebrate(0)}
          awards={awards}
          onDismissAwards={() => setAwards([])}
          message={message}
          onDismissMessage={() => setMessage('')}
        />
      </LessonChrome>
    );
  }

  const info = (title: string, body: React.ReactNode, eyebrow = 'Python Studio') => (
    <ShellB eyebrowIcon={ICON.book} eyebrowLabel={eyebrow} title={title} description={body} centered />
  );

  if (loading)
    return frame(info('Đang tải bài học…', choLau
      ? 'Máy chủ đang khởi động lại sau một lúc không có ai học — lần đầu trong '
        + 'ngày có thể mất khoảng nửa phút. Tiến độ của bạn vẫn còn, không cần '
        + 'tải lại trang.'
      : 'Chờ một chút, nội dung đang được lấy từ máy chủ.'), {
      primaryLabel: 'Đang tải…',
      primaryDisabled: true,
      onPrimaryClick: () => undefined,
      onSeek: undefined,
      onBack: undefined,
    });

  if (loadError)
    return frame(info('Chưa kết nối được bài học', loadError), {
      primaryLabel: 'Thử lại',
      onPrimaryClick: () => void load(),
      onSeek: undefined,
      onBack: undefined,
    });

  if (!enrolled && user?.role !== 'admin')
    return frame(
      info(
        meta?.title || `Bài học ${courseName}`,
        'Đăng ký khóa học miễn phí để mở bài học và lưu tiến độ.',
      ),
      {
        primaryLabel: busy ? 'Đang đăng ký…' : `Đăng ký khóa ${courseName} & bắt đầu`,
        primaryDisabled: busy,
        onPrimaryClick: () => void enroll(),
        onSeek: undefined,
        onBack: undefined,
      },
    );

  if (empty)
    return frame(
      info(
        meta?.title || `Bài ${lessonNo}`,
        'Bài học này chưa có nội dung Studio. Quản trị viên có thể nhập nội dung từ file PDF hoặc Markdown trong trang quản trị.',
        'Đang biên soạn',
      ),
      { primaryLabel: 'Về khóa học →', onPrimaryClick: leave, onSeek: undefined, onBack: undefined },
    );

  return frame(
    <>
      {user?.role === 'admin' && !enrolled && (
        <div className={c.note} role="status">
          <strong>Chế độ xem trước của quản trị viên.</strong> Bạn chưa ghi danh khoá này nên
          tiến độ và XP sẽ không được lưu.
        </div>
      )}
      {completed && scr?.kind !== 'recap' && (
        <div className={`${c.note} ${c.noteOk}`} role="status">
          ✓ Bài này đã hoàn thành và được lưu trên hệ thống. Bạn có thể luyện tập lại.
        </div>
      )}
      {lesson && scr && (
        <LessonScreenView
          lesson={lesson}
          scr={scr}
          screens={screens}
          metaLabel={meta?.title}
          draft={d}
          update={update}
          clearChecked={() => setCheckedKey('')}
          checked={checked}
          // Băng phản hồi chỉ hiện khi đã bấm Kiểm tra ở ĐÚNG màn này.
          verdict={checked ? verdict : null}
          game={game}
          updateGame={updateGame}
          flash={flash}
          setFlash={setFlash}
          held={held}
          onHold={setHeld}
          gameRun={scr ? gameRuns[scr.key] : undefined}
          gradedRun={scr ? runVerdicts[scr.key]?.result : undefined}
          onRunGame={(grade) => {
            if (game) runGame(scr.key, game, grade);
          }}
          onBreakCombo={() => {
            if (play) update({ score: { ...score, combo: 0 } });
          }}
          running={running}
          runtimeStatus={runtimeStatus}
          result={result}
          onRun={() => run(false)}
          onStop={cancelRun}
          busy={busy}
          setMessage={setMessage}
          hint={{
            open: hintOpen,
            index: hintIndex,
            onUnlock: setHintIndex,
            onClose: () => setHintOpen(false),
          }}
          procedure={{ open: procedureOpen, toggle: () => setProcedureOpen((o) => !o) }}
          completed={completed}
          xpGained={xpGained}
          xpReward={meta?.xpReward ?? 0}
          onFinish={() => doAction(primary().action)}
        />
      )}
      {adminKey && (
        <AdminAnswerKey
          answerKey={adminKey}
          open={answerOpen}
          onToggle={() => setAnswerOpen((o) => !o)}
          onFill={() => {
            setCheckedKey('');
            setHeld(null);
            if (adminKey.fill) update(adminKey.fill);
          }}
        />
      )}
    </>,
  );
}
