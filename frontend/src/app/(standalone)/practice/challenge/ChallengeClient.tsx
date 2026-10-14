'use client';

/**
 * "Thử thách ôn" — phần tương tác của /practice/challenge.
 *
 * Màn này là chế độ thứ hai của trang "Ôn tập của tôi": thay vì hiện cả đề
 * một trang như /practice, nó đi MỘT CÂU MỘT LẦN, sai lần đầu thì cho nghĩ lại
 * một lần, và cuối lượt mới tổng kết. Đấu với chính mình — KHÔNG có đối thủ,
 * không xếp hạng, không đồng hồ, không chuỗi ngày (ba lý do đã đo: ghép cặp
 * trực tiếp không đủ người; trạng thái trận nằm trong RAM một tiến trình nên
 * mất mỗi lần deploy; thứ hạng tiêu cực hại động lực hơn không báo gì).
 *
 * Hạ tầng dùng lại NGUYÊN của /practice, không thêm route backend nào — mọi
 * quyết định về endpoint, kiểu câu trả lời gửi lên và cách đọc kết quả nằm ở
 * src/lib/practice-plan.ts; luật chơi của riêng màn này nằm ở
 * src/lib/challenge-run.ts. Cả hai đều có test chốt (`npm run test:unit`).
 *
 * Vì sao `apiFetch` (chứ không `apiFetchSessionOnly`): đây là trang SAU đăng
 * nhập — vào đây là đã có ý học, nên để `apiFetch` tự lấy tài khoản khách khi
 * cần là đúng. Trang công khai thì ngược lại (mỗi bot mở trang sẽ sinh một tài
 * khoản khách và ăn hết quota THROTTLE_GUEST_LIMIT).
 *
 * ── MÂU THUẪN LỚN NHẤT VỚI BẢN THIẾT KẾ, VÀ CÁCH GIẢI ─────────────────────
 * Bản thiết kế vẽ "chốt một câu → phản hồi ngay → nghĩ lại". Backend KHÔNG
 * chấm từng câu: `POST /quizzes/:id/submit` chấm cả đề một lượt và chỉ nộp
 * được MỘT lần (lần hai nhận 409), còn trình duyệt không hề biết đáp án trước
 * đó (`stripAnswers()` chỉ gửi {index, question, options}) nên cũng không tự
 * chấm được. Nên lượt chơi ở đây chia làm hai:
 *   · LƯỢT CHỐT — chốt lần lượt từng câu, KHÔNG có phản hồi nào. Màn mở đầu
 *     nói trước điều này, không để người học chờ một phản hồi không tới.
 *   · nộp cả đề → máy chủ trả `is_correct`/`correct`/`explanation` cho từng
 *     câu. Đây là điểm CHÍNH THỨC và là điểm duy nhất được lưu.
 *   · LƯỢT NGHĨ LẠI — những câu chưa đúng được chọn lại một lần, và lần này
 *     TRÌNH DUYỆT tự chấm bằng đáp án máy chủ vừa gửi; không gửi lên nữa.
 * Màn kết quả nói rõ con số nào do máy chủ chấm và lưu, con số nào do trình
 * duyệt chấm và không lưu (xem `splitScore()`).
 *
 * ── BỐN CHỖ BẢN THIẾT KẾ VẼ MÀ DỮ LIỆU CHƯA CÓ (cố ý KHÔNG dựng) ──────────
 *  1. "Câu đã chắc" (cùng một câu đúng lần đầu ở hai ngày khác nhau): không có
 *     bảng nào lưu lịch sử theo từng câu — `quiz/history` chỉ trả
 *     {score, total, submittedAt}. Thay bằng `cumulativeFirstTry()`: cộng dồn
 *     LƯỢT trả lời đúng ngay lần đầu, và màn hình nói đúng chữ đó.
 *  2. "Từ bài P03", "Mở bài" ở từng câu, "Nên ôn" gọi tên bài: `stripAnswers()`
 *     không cho biết câu nào thuộc bài nào; response submit có `lesson_id`
 *     nhưng đó là id bảng lessons, không phải số bài (bài tra theo
 *     (course_id, sort_order)) nên chỉ ĐẾM được số bài khác nhau, không đặt
 *     tên được.
 *  3. Chip "Phạm vi câu hỏi" theo chặng: đường sinh đề của backend không nhận
 *     tham số phạm vi — có chip thì chip không làm gì.
 *  4. Phản hồi theo ĐÚNG phương án vừa chọn: backend bỏ field `detail` của
 *     từng phương án, nên phản hồi chỉ tới MỨC CÂU. Màn này KHÔNG đọc
 *     `optionFeedback` (chỗ chừa sẵn ở practice-plan.ts, hôm nay luôn null).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import SiteHeader from '@/components/SiteHeader';
import { apiFetch, asList, findEnrollment } from '@/lib/api';
import {
  RUN_RULES,
  STATE_LABEL,
  WHY_NO_PER_QUESTION_REASON,
  WHY_THIS_QUESTION,
  allCommitted,
  applyGrading,
  cellState,
  challengeGate,
  commitPick,
  createCells,
  committedCount,
  cumulativeFirstTry,
  feedbackBody,
  feedbackHead,
  firstTryAfterRun,
  firstTryLine,
  isPickable,
  lessonIdsOf,
  lockedOptionIndex,
  runSummary,
  shownPick,
  splitScore,
  stageProgress,
  visibleCorrectIndex,
  visibleExplanation,
  type CellState,
  type ChallengeGate,
  type FirstTryTotal,
  type RunCell,
  type StageRow,
} from '@/lib/challenge-run';
import CURRICULA_JSON from '@/lib/curricula.json';
import {
  COURSE_ID,
  ENROLLED_PATH,
  TOTAL_LESSONS,
  answersPayload,
  completedLessons,
  historyPath,
  nextLessonNo,
  readGeneratedQuiz,
  readGradedQuestions,
  recentReviews,
  reviewPath,
  submitPath,
} from '@/lib/practice-plan';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

import styles from './challenge.module.css';

/** Giáo trình tĩnh — cùng nguồn trang khoá học dùng để vẽ danh sách bài. */
const MODULES = (CURRICULA_JSON.CURRICULA as Record<string, { modules?: unknown }>)[
  COURSE_ID
]?.modules;

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** Lỗi backend có dạng { error: { status, message }, request_id }. */
function errMessage(body: unknown): string {
  if (body && typeof body === 'object') {
    const e = (body as Record<string, unknown>).error;
    if (e && typeof e === 'object') {
      const msg = (e as Record<string, unknown>).message;
      if (typeof msg === 'string') return msg;
    }
    if (typeof e === 'string') return e;
  }
  return '';
}

/**
 * Đường tới bài học: trang bài nhận chỉ số 0-based, DB đánh số từ 1.
 *
 * Mọi lối rời trang này đều là `<a href>` thường (tải lại trang), KHÔNG
 * `next/link` — giống /practice và trang chi tiết khoá: trang bài học nạp tổ
 * hợp CSS/script legacy riêng, đi bằng client-side routing thì React GIỮ LẠI
 * tài nguyên của trang cũ nên hai bộ sống chồng nhau.
 */
function lessonHref(no: number): string {
  return `/lesson/${COURSE_ID}?lesson=${no - 1}`;
}

/* ── ô tiến độ: bốn+hai trạng thái, phân biệt bằng HÌNH ───────────────────
   Hình quan trọng hơn màu: bảng token v2 không có xanh lá, và WCAG 1.4.1 đòi
   thông tin không được chỉ nằm ở màu. Tròn nét đứt = chưa làm; tròn đặc = đã
   chốt (chưa chấm); ô đặc + dấu kiểm = đúng lần đầu; ô bo tròn hẳn + chấm giữa
   = đúng sau nghĩ lại; ô góc nhọn + dấu nhân = chưa đúng. Năm hình, năm kiểu
   viền — challenge-run.test.mjs trượt nếu hai kết cục dùng cùng một hình. */
const PIP_CLASS: Record<CellState, string> = {
  empty: styles.pipEmpty,
  committed: styles.pipCommitted,
  ok: styles.pipOk,
  rethinking: styles.pipRethink,
  again: styles.pipAgain,
  bad: styles.pipBad,
};

function PipGlyph({ state }: { state: CellState }) {
  if (state === 'ok') {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 8.5L6.5 12L13 4.5" />
      </svg>
    );
  }
  if (state === 'bad') {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.6"
        strokeLinecap="round" aria-hidden="true">
        <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
      </svg>
    );
  }
  if (state === 'again') {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <circle cx="8" cy="8" r="3.4" />
      </svg>
    );
  }
  if (state === 'rethinking') {
    return (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.6"
        strokeLinecap="round" aria-hidden="true">
        <path d="M4.5 8h7" />
      </svg>
    );
  }
  return null;
}

function Pips({
  cells,
  at,
}: {
  cells: ReadonlyArray<RunCell>;
  at: number | null;
}) {
  return (
    <ol className={styles.pips}>
      {cells.map((cell, i) => {
        const state = cellState(cell);
        const here = i === at;
        return (
          <li
            className={`${styles.pip} ${PIP_CLASS[state]}${here ? ` ${styles.pipHere}` : ''}`}
            key={cell.index}
          >
            <span className={styles.pipSr}>
              {`Câu ${i + 1}: ${STATE_LABEL[state]}${here ? ' — đang ở câu này' : ''}`}
            </span>
            <PipGlyph state={state} />
          </li>
        );
      })}
    </ol>
  );
}

const LEGEND: ReadonlyArray<CellState> = ['empty', 'ok', 'again', 'bad'];

type Phase = 'loading' | 'gate' | 'generating' | 'run' | 'grading' | 'rethink' | 'result';

export default function ChallengeClient() {
  const reduced = usePrefersReducedMotion();

  const [phase, setPhase] = useState<Phase>('loading');
  const [gate, setGate] = useState<ChallengeGate | null>(null);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [nextNo, setNextNo] = useState<number | null>(null);
  const [firstTry, setFirstTry] = useState<FirstTryTotal>({ answers: 0, runs: 0 });
  const [lastRun, setLastRun] = useState<string | null>(null);

  const [quizId, setQuizId] = useState<number | null>(null);
  const [cells, setCells] = useState<RunCell[]>([]);
  /** Câu đang mở ở lượt chốt. */
  const [at, setAt] = useState(0);
  /** Vị trí trong danh sách câu phải nghĩ lại. */
  const [reviewAt, setReviewAt] = useState(0);
  /** Phương án đang chọn mà CHƯA chốt. */
  const [sel, setSel] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [notice, setNotice] = useState('');

  // Tiến độ + lịch sử: nạp một lượt lúc mở trang.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [enrolled, hist] = await Promise.all([
        apiFetch(ENROLLED_PATH)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        apiFetch(historyPath(COURSE_ID))
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      if (!alive) return;
      const row = findEnrollment(asList(enrolled, 'enrolled'), COURSE_ID);
      const done = completedLessons(row?.completedLessonNumbers, TOTAL_LESSONS);
      const history = (hist as { history?: unknown } | null)?.history;
      setGate(challengeGate({ completed: done }));
      setStages(stageProgress(MODULES, done));
      setNextNo(nextLessonNo(done, TOTAL_LESSONS));
      setFirstTry(cumulativeFirstTry(history));
      setLastRun(recentReviews(history, 1)[0]?.line ?? null);
      setPhase('gate');
    })();
    return () => {
      alive = false;
    };
  }, []);

  const start = useCallback(async () => {
    setNotice('');
    setPhase('generating');
    try {
      const res = await apiFetch(reviewPath(COURSE_ID), { method: 'POST' });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice(
          errMessage(body)
            || 'Chưa dựng được lượt thử thách. Thử lại sau một lát, hoặc đi học bài tiếp.',
        );
        setPhase('gate');
        return;
      }
      const parsed = readGeneratedQuiz(body);
      if (!parsed) {
        setNotice('Đề trả về chưa dùng được. Bạn thử lại, hoặc đi học bài tiếp.');
        setPhase('gate');
        return;
      }
      setQuizId(parsed.quizId);
      setCells(createCells(parsed.questions));
      setAt(0);
      setReviewAt(0);
      setSel(null);
      setListOpen(false);
      setPhase('run');
    } catch {
      setNotice('Mạng đang chập chờn nên chưa dựng được lượt thử thách. Thử lại nhé.');
      setPhase('gate');
    }
  }, []);

  /** Nộp CẢ ĐỀ một lượt — đường duy nhất backend có. */
  const grade = useCallback(
    async (finalCells: RunCell[]) => {
      if (quizId === null) return;
      setNotice('');
      setPhase('grading');
      try {
        const res = await apiFetch(submitPath(quizId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Mảng THEO VỊ TRÍ, giá trị là CHỈ SỐ phương án — xem answersPayload().
          body: JSON.stringify({
            answers: answersPayload(
              finalCells.map((c) => c.firstPick),
              finalCells.length,
            ),
          }),
        });
        const body: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          setNotice(
            errMessage(body)
              || 'Chưa gửi được lượt này. Các phương án bạn đã chốt vẫn còn đây, thử lại nhé.',
          );
          setPhase('run');
          return;
        }
        const data = (body ?? {}) as { detail?: unknown };
        const graded = applyGrading(
          finalCells,
          readGradedQuestions(
            finalCells.map((c) => ({ index: c.index, question: c.question, options: c.options })),
            data.detail,
          ),
          lessonIdsOf(data.detail),
        );
        setCells(graded);
        setFirstTry((prev) => ({
          // CHỈ TĂNG: cộng thêm số câu đúng lần đầu của lượt này, không bao giờ
          // tính lại từ đầu theo một con số có thể nhỏ hơn.
          answers: firstTryAfterRun(prev.answers, runSummary(graded).firstTry),
          runs: prev.runs + 1,
        }));
        const wrong = graded.findIndex((c) => c.firstCorrect === false);
        setSel(null);
        setReviewAt(0);
        setPhase(wrong < 0 ? 'result' : 'rethink');
      } catch {
        setNotice('Mạng đang chập chờn nên lượt này chưa gửi đi. Các phương án vẫn còn đây.');
        setPhase('run');
      }
    },
    [quizId],
  );

  /* ── lượt chốt ─────────────────────────────────────────────────────────── */

  const commitRun = useCallback(() => {
    if (sel === null) return;
    const next = commitPick(cells, at, sel);
    setCells(next);
    setSel(null);
    if (allCommitted(next)) {
      void grade(next);
      return;
    }
    // Câu trống TIẾP THEO, không phải at + 1: người học không quay lại được
    // nhưng vòng tìm này giữ cho lượt không bỏ sót câu nào nếu về sau có nút
    // "để dành câu này".
    const idx = next.findIndex((c) => c.firstPick === null);
    setAt(idx < 0 ? at : idx);
  }, [cells, at, sel, grade]);

  /* ── lượt nghĩ lại ─────────────────────────────────────────────────────── */

  /** Những câu máy chủ chấm là chưa đúng — đúng danh sách được nghĩ lại. */
  const rethinkQueue = useMemo(
    () => cells.map((c, i) => (c.firstCorrect === false ? i : -1)).filter((i) => i >= 0),
    [cells],
  );

  const rethinkIndex = rethinkQueue[reviewAt] ?? -1;
  const rethinkCell = rethinkIndex >= 0 ? cells[rethinkIndex] : null;

  const commitRethink = useCallback(() => {
    if (sel === null || rethinkIndex < 0) return;
    setCells(commitPick(cells, rethinkIndex, sel));
    setSel(null);
  }, [cells, rethinkIndex, sel]);

  const nextRethink = useCallback(() => {
    setSel(null);
    if (reviewAt + 1 >= rethinkQueue.length) {
      setPhase('result');
      return;
    }
    setReviewAt(reviewAt + 1);
  }, [reviewAt, rethinkQueue.length]);

  /* ── số liệu chung ─────────────────────────────────────────────────────── */

  const total = cells.length;
  const summary = useMemo(() => runSummary(cells), [cells]);
  const score = useMemo(() => splitScore(summary), [summary]);
  const riseClass = reduced ? '' : ` ${styles.rise}`;

  /** Một thẻ câu: dùng chung cho lượt chốt và lượt nghĩ lại. */
  const questionCard = (cell: RunCell, idx: number, pickable: boolean) => {
    const state = cellState(cell);
    const locked = lockedOptionIndex(cell);
    const answer = visibleCorrectIndex(cell);
    const explain = visibleExplanation(cell);
    const current = pickable ? sel : shownPick(cell);
    const head = feedbackHead(state);

    return (
      <section className={`${styles.card}${riseClass}`} aria-labelledby="qText" key={cell.index}>
        <p className={styles.cardLabel}>
          Câu {idx + 1}/{total} · trắc nghiệm
        </p>
        <h2 className={styles.question} id="qText">
          {cell.question}
        </h2>

        {/* Phản hồi của LƯỢT NGHĨ LẠI nằm TRƯỚC danh sách phương án: ở trạng
            thái 'rethinking' nó là lời duy nhất nói "chưa đúng" mà không nói
            đáp án, nên người học phải đọc nó trước khi chọn lại. */}
        {head && (
          <div
            className={
              state === 'ok' || state === 'again' ? styles.fbOk : styles.fbBad
            }
          >
            <span className={styles.fbHead}>{head}</span>
            <p className={styles.fbBody}>{feedbackBody(state)}</p>
            {explain && <p className={styles.fbBody}>{explain}</p>}
            {answer !== null && state !== 'ok' && (
              <p className={styles.fbBody}>
                <span className={styles.strong}>Đáp án đúng: </span>
                {cell.options[answer]}
              </p>
            )}
          </div>
        )}

        <div
          className={styles.options}
          role="radiogroup"
          aria-label={`Phương án cho câu ${idx + 1}`}
        >
          {cell.options.map((opt, oi) => {
            const picked = current === oi;
            const isAnswer = answer === oi;
            const wrongPick = answer !== null && picked && !isAnswer;
            const isLocked = locked === oi;
            const cls = [
              styles.option,
              isAnswer ? styles.optionOk : '',
              wrongPick ? styles.optionBad : '',
              isLocked ? styles.optionLocked : '',
              !isAnswer && !wrongPick && picked && pickable ? styles.optionPicked : '',
              answer !== null && !isAnswer && !wrongPick ? styles.optionRest : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                type="button"
                role="radio"
                aria-checked={picked}
                className={cls}
                disabled={!pickable || isLocked}
                key={oi}
                onClick={() => setSel(oi)}
              >
                <span aria-hidden="true" className={styles.letter}>
                  {LETTERS[oi] ?? oi + 1}
                </span>
                <span className={styles.optionText}>{opt}</span>
                {/* Đúng / chưa đúng / đã khoá KHÔNG chỉ phân biệt bằng màu —
                    mỗi trạng thái kèm chữ. */}
                {isAnswer && <span className={styles.tagOk}>Đáp án đúng</span>}
                {wrongPick && <span className={styles.tagBad}>Bạn chọn</span>}
                {isLocked && <span className={styles.tagLocked}>Đã thử — khoá</span>}
              </button>
            );
          })}
        </div>

        {/* "Vì sao câu này?" — lý do THẬT, giống nhau cho mọi câu; xem
            WHY_THIS_QUESTION. Để trong <details> vì nó không đổi theo câu. */}
        <details className={styles.why}>
          <summary className={styles.whySummary}>Vì sao câu này?</summary>
          <p className={styles.whyBody}>{WHY_THIS_QUESTION}</p>
          <p className={styles.whyBody}>{WHY_NO_PER_QUESTION_REASON}</p>
        </details>
      </section>
    );
  };

  return (
    <div className={styles.page}>
      <SiteHeader wide />

      <main className={styles.main}>
        {/* ── màn mở đầu ───────────────────────────────────────────────── */}
        {(phase === 'loading' || phase === 'gate' || phase === 'generating') && (
          <div className={styles.grid}>
            <section className={styles.left} aria-labelledby="challengeTitle">
              <p className={styles.eyebrow}>
                <a className={styles.backLink} href="/practice">
                  Ôn tập của tôi
                </a>
                {' · chế độ thử thách'}
              </p>
              <h1 className={styles.h1} id="challengeTitle">
                Thử thách ôn
              </h1>
              <p className={styles.kicker}>
                Không tính giờ · không xếp hạng · chỉ so với chính bạn
              </p>
              <p className={styles.lead}>
                Một lượt rút câu từ chính những câu bạn đã làm trong bài. Sai lần đầu thì được
                nghĩ lại một lần ngay trong lượt. Không ai đứng bên kia bàn — bàn so sánh duy
                nhất ở đây là bạn của những lượt trước.
              </p>

              {phase === 'loading' && (
                <p className={styles.quiet} aria-live="polite">
                  Đang xem bạn đã xong những bài nào…
                </p>
              )}

              {gate && (
                <div className={styles.gateCard}>
                  <h2 className={styles.gateHead}>{gate.headline}</h2>
                  <p className={styles.gateBody}>{gate.body}</p>

                  {gate.canStart ? (
                    <>
                      <button
                        type="button"
                        className={styles.primary}
                        onClick={start}
                        disabled={phase === 'generating'}
                      >
                        {phase === 'generating'
                          ? 'Đang dựng lượt…'
                          : `Bắt đầu ${gate.expected} câu`}
                      </button>
                      <p className={styles.quiet}>
                        Dừng giữa lượt được, nhưng lượt dừng dở không được lưu — máy chủ chỉ
                        chấm khi cả đề được nộp một lượt.
                      </p>
                    </>
                  ) : (
                    nextNo !== null && (
                      <a className={styles.primary} href={lessonHref(nextNo)}>
                        Mở bài {nextNo}
                      </a>
                    )
                  )}

                  {notice && (
                    <p className={styles.notice} role="status">
                      {notice}
                    </p>
                  )}
                </div>
              )}

              <section className={styles.sideCard} aria-labelledby="rulesTitle">
                <p className={styles.sideLabel} id="rulesTitle">
                  Luật của một lượt
                </p>
                <ul className={styles.ruleList}>
                  {RUN_RULES.map((r) => (
                    <li className={styles.ruleItem} key={r}>
                      {r}
                    </li>
                  ))}
                </ul>
              </section>
            </section>

            <aside className={styles.aside} aria-label="Chỉ số của bạn và mức theo chặng">
              <section className={styles.metric} aria-labelledby="metricTitle">
                <p className={styles.metricLabel} id="metricTitle">
                  Chỉ tăng, không bao giờ tụt
                </p>
                <p className={styles.metricBig}>{firstTry.answers}</p>
                <p className={styles.metricUnit}>lượt trả lời đúng ngay lần đầu</p>
                <p className={styles.metricNote}>
                  Con số này không giảm khi bạn sai. Sai chỉ có nghĩa là lượt đó không cộng
                  thêm gì.
                </p>
                <p className={styles.metricNote}>{firstTryLine(firstTry)}</p>
                {lastRun && <p className={styles.metricNote}>Lần ôn gần nhất: {lastRun}</p>}
              </section>

              {/* Khối ghi chú trung thực: nói thẳng cái gì CHƯA có. */}
              <p className={styles.honest}>
                <span className={styles.strong}>Đây là LƯỢT trả lời, không phải câu khác nhau. </span>
                Hệ thống không lưu lịch sử theo từng câu, nên nó không biết “cùng một câu bạn
                đã trả lời đúng ngay lần đầu mấy ngày khác nhau”. Cùng một câu gặp lại và đúng
                lần nữa thì con số trên tăng thêm một.
              </p>

              <section className={styles.sideCard} aria-labelledby="stageTitle">
                <p className={styles.sideLabel} id="stageTitle">
                  Mức của bạn theo chặng
                </p>
                <p className={styles.sideBody}>
                  Mỗi ô là một bài. Ô đặc là bài đã xong — chặng nào xong nhiều bài thì kho câu
                  của chặng đó dày hơn, nên lượt thử thách gặp câu ở đó nhiều hơn.
                </p>
                <ul className={styles.stageList}>
                  {stages.map((s) => (
                    <li className={styles.stageItem} key={s.name}>
                      <span className={styles.stageName}>{s.name}</span>
                      <span className={styles.stageLabel}>{s.label}</span>
                      <span className={styles.segs} aria-hidden="true">
                        {Array.from({ length: s.total }, (_, i) => (
                          <span
                            className={i < s.done ? styles.segDone : styles.segTodo}
                            key={i}
                          />
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className={styles.honest}>
                  <span className={styles.strong}>Thanh này đếm BÀI, không đếm câu. </span>
                  Bản thiết kế vẽ “mức câu đã chắc theo chặng”; muốn vậy phải có lịch sử theo
                  từng câu, thứ hệ thống chưa lưu. Số bài đã xong thì có thật.
                </p>
              </section>

              <section className={styles.sideCard} aria-labelledby="notTitle">
                <p className={styles.sideLabel} id="notTitle">
                  Ở đây không có
                </p>
                <ul className={styles.ruleList}>
                  <li className={styles.ruleItem}>Không xếp hạng, không bảng điểm chung</li>
                  <li className={styles.ruleItem}>Không đồng hồ, không điểm tốc độ</li>
                  <li className={styles.ruleItem}>
                    Không đối thủ — không ghép cặp với ai, và cũng không cần
                  </li>
                  <li className={styles.ruleItem}>Không có chuỗi ngày để đứt</li>
                  <li className={styles.ruleItem}>Không chọn được phạm vi theo chặng</li>
                </ul>
                <p className={styles.honest}>
                  <span className={styles.strong}>Phạm vi: cả khoá, không chọn được. </span>
                  Đường sinh đề của hệ thống chỉ nhận một khoá, không nhận chặng — nên ở đây
                  không có chip chọn chặng để bấm.
                </p>
              </section>
            </aside>
          </div>
        )}

        {/* ── lượt chốt ────────────────────────────────────────────────── */}
        {(phase === 'run' || phase === 'grading') && cells[at] && (
          <div className={styles.runWrap}>
            <div className={styles.runBar}>
              <span className={styles.runCount}>
                Câu {Math.min(committedCount(cells) + 1, total)}/{total}
              </span>
              <Pips at={at} cells={cells} />
              <span className={styles.runNote} aria-live="polite">
                {phase === 'grading'
                  ? 'Đang nộp cả đề để máy chủ chấm…'
                  : `Đã chốt ${committedCount(cells)}/${total}`}
              </span>
            </div>

            <p className={styles.quiet}>
              Lượt chốt chưa có phản hồi: máy chủ chấm cả đề một lượt sau câu cuối. Chốt xong
              câu thứ {total} là bạn thấy ngay từng câu đúng hay chưa.
            </p>

            {questionCard(cells[at], at, phase === 'run')}

            {notice && (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                disabled={sel === null || phase === 'grading'}
                onClick={commitRun}
              >
                {committedCount(cells) + 1 >= total ? 'Chốt câu cuối và nộp' : 'Chốt'}
              </button>
              <span className={styles.quiet}>
                {sel === null
                  ? 'Nút Chốt mờ tới khi bạn chọn một phương án. Đổi ý bao nhiêu lần cũng được — chưa Chốt là chưa tính.'
                  : `Đã chọn ${LETTERS[sel] ?? sel + 1}. Chốt rồi thì không đổi được: máy chủ chấm đúng phương án bạn chốt.`}
              </span>
              <a className={styles.quietLink} href="/practice">
                Dừng lượt này
              </a>
            </div>
          </div>
        )}

        {/* ── lượt nghĩ lại ────────────────────────────────────────────── */}
        {phase === 'rethink' && rethinkCell && (
          <div className={styles.runWrap}>
            <div className={styles.runBar}>
              <span className={styles.runCount}>
                Nghĩ lại {reviewAt + 1}/{rethinkQueue.length}
              </span>
              <Pips at={rethinkIndex} cells={cells} />
              <span className={styles.runNote} aria-live="polite">
                {`Máy chủ đã chấm: đúng lần đầu ${summary.firstTry}/${total}`}
              </span>
            </div>

            <p className={styles.quiet}>
              Những câu chưa đúng được chọn lại MỘT lần. Lần này trình duyệt tự chấm bằng đáp
              án máy chủ vừa gửi về — không gửi lên nữa, vì mỗi đề chỉ nộp được một lần. Nên
              lần nghĩ lại không đổi điểm đã lưu, và cũng không trừ gì.
            </p>

            {questionCard(rethinkCell, rethinkIndex, isPickable(rethinkCell))}

            <div className={styles.actions}>
              {isPickable(rethinkCell) ? (
                <>
                  <button
                    type="button"
                    className={styles.primary}
                    disabled={sel === null}
                    onClick={commitRethink}
                  >
                    Chốt lần nghĩ lại
                  </button>
                  <span className={styles.quiet}>
                    Chọn một phương án KHÁC rồi chốt. Phương án đã thử bị khoá.
                  </span>
                </>
              ) : (
                <button type="button" className={styles.primary} onClick={nextRethink}>
                  {reviewAt + 1 >= rethinkQueue.length ? 'Xem kết quả' : 'Câu nghĩ lại tiếp'}
                </button>
              )}
              <button
                type="button"
                className={styles.quietBtn}
                onClick={() => setPhase('result')}
              >
                Bỏ qua, xem kết quả
              </button>
            </div>
          </div>
        )}

        {/* ── kết quả ──────────────────────────────────────────────────── */}
        {phase === 'result' && (
          <div className={`${styles.runWrap}${riseClass}`}>
            <p className={styles.eyebrow}>Thử thách ôn · xong lượt</p>
            <h1 className={styles.h1}>Xong {total} câu</h1>
            <p className={styles.lead}>
              Hai con số dưới đây là của riêng bạn, và chúng đến từ hai nơi khác nhau — nói rõ
              để bạn biết cái nào được lưu.
            </p>

            <div className={styles.resultCard}>
              <span className={styles.fbHead}>{score.officialLine}</span>
              <p className={styles.fbBody}>{score.officialNote}</p>
              {score.localLine && (
                <>
                  <span className={styles.fbHead}>{score.localLine}</span>
                  <p className={styles.fbBody}>{score.localNote}</p>
                </>
              )}
              {summary.pendingRethink > 0 && (
                <p className={styles.fbBody}>
                  Còn {summary.pendingRethink} câu bạn chưa nghĩ lại. Đáp án của những câu đó
                  vẫn chưa hiện — gặp lại ở lượt sau.
                </p>
              )}
            </div>

            <div className={styles.runBar}>
              <span className={styles.runCount}>Từng câu</span>
              <Pips at={null} cells={cells} />
              <span className={styles.runNote}>
                {`${summary.firstTry} đúng lần đầu · ${summary.afterRethink} sau nghĩ lại `
                  + `· ${summary.stillWrong} chưa đúng`}
              </span>
            </div>

            <ul className={styles.legend}>
              {LEGEND.map((state) => (
                <li className={styles.legendItem} key={state}>
                  <span className={`${styles.pip} ${PIP_CLASS[state]}`} aria-hidden="true">
                    <PipGlyph state={state} />
                  </span>
                  {STATE_LABEL[state]}
                </li>
              ))}
            </ul>

            <div className={styles.metric}>
              <p className={styles.metricLabel}>Chỉ tăng, không bao giờ tụt</p>
              <p className={styles.metricBig}>{firstTry.answers}</p>
              <p className={styles.metricUnit}>lượt trả lời đúng ngay lần đầu</p>
              <p className={styles.metricNote}>
                {summary.firstTry > 0
                  ? `Lượt này cộng thêm ${summary.firstTry}. Câu còn sai không lấy đi gì của con số này — nó chỉ không cộng.`
                  : 'Lượt này chưa cộng thêm câu nào, và cũng không trừ đi gì.'}
              </p>
            </div>

            <section className={styles.sideCard} aria-labelledby="redoTitle">
              <p className={styles.sideLabel} id="redoTitle">
                Nên ôn
              </p>
              {summary.firstTry === total ? (
                <p className={styles.sideBody}>
                  Cả {total} câu đúng ngay lần đầu. Không có chỗ nào cần đọc lại từ lượt này.
                </p>
              ) : (
                <p className={styles.sideBody}>
                  {summary.lessonsToReview > 0
                    ? `${total - summary.firstTry} câu chưa đúng lần đầu, và chúng đụng vào ${summary.lessonsToReview} bài. `
                      + 'Đọc lại đúng mấy bài đó thường nhanh hơn làm thêm câu.'
                    : `${total - summary.firstTry} câu chưa đúng lần đầu.`}
                </p>
              )}
              <p className={styles.honest}>
                <span className={styles.strong}>Không gọi được tên bài. </span>
                Máy chủ gửi về câu hỏi và kết quả, nhưng không gửi câu đó thuộc bài số mấy
                (id trong kết quả là id bảng dữ liệu, còn bài được tra theo thứ tự trong khoá)
                — nên ở đây chỉ đếm được số bài, không mở thẳng bài được.
              </p>
              <a className={styles.quietLink} href={`/courses/${COURSE_ID}`}>
                Tự chọn bài để đọc lại
              </a>
            </section>

            <section className={styles.sideCard} aria-labelledby="listTitle">
              <button
                type="button"
                className={styles.listToggle}
                aria-expanded={listOpen}
                onClick={() => setListOpen(!listOpen)}
              >
                <span className={styles.sideLabel} id="listTitle">
                  Xem lại {total} câu
                </span>
                <span className={styles.runNote}>{listOpen ? 'Gập lại' : 'Mở ra'}</span>
              </button>
              {listOpen && (
                <ol className={styles.reviewList}>
                  {cells.map((cell, i) => {
                    const state = cellState(cell);
                    const explain = visibleExplanation(cell);
                    return (
                      <li className={styles.reviewItem} key={cell.index}>
                        <span className={`${styles.pip} ${PIP_CLASS[state]}`} aria-hidden="true">
                          <PipGlyph state={state} />
                        </span>
                        <span className={styles.reviewText}>
                          <span className={styles.reviewLabel}>
                            Câu {i + 1} · {STATE_LABEL[state]}
                          </span>
                          <span className={styles.reviewQ}>{cell.question}</span>
                          {explain && <span className={styles.reviewWhy}>{explain}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {notice && (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            )}

            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={start}>
                Thử thách một lượt nữa
              </button>
              <a className={styles.quietLink} href="/practice">
                Về Ôn tập của tôi
              </a>
            </div>
          </div>
        )}

        <footer className={styles.footer}>
          <p className={styles.footNote}>
            <span className={styles.strong}>Phản hồi ở đây là của CÂU, chưa của từng phương án. </span>
            Mỗi phương án trong bài đều có lời giải thích riêng, nhưng kho câu ôn chưa mang nó
            theo — nên phần “chưa đúng” chỉ nói được lời giải thích chung của câu và đáp án
            đúng, không nói được vì sao đúng phương án bạn vừa chọn là sai.
          </p>
          <p className={styles.footNote}>
            <span className={styles.strong}>Tiến độ gắn với tài khoản khách trên trình duyệt này</span>
            {' '}— đổi máy hay xoá dữ liệu trình duyệt là mất. Đề xuất (chưa có): cấp một mã
            khôi phục để mang tiến độ sang máy khác.
          </p>
        </footer>
      </main>
    </div>
  );
}
