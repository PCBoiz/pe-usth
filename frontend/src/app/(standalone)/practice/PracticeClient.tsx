'use client';

/**
 * "Ôn tập của tôi" — phần tương tác của /practice.
 *
 * Hạ tầng dùng lại NGUYÊN của backend, không thêm route nào:
 *   · POST /api/courses/:id/quiz/generate-review  → đề CÓ TRỌNG SỐ (bài hay sai
 *     thì gặp lại nhiều hơn), không cổng theo ngày, không giới hạn số lần.
 *   · POST /api/quizzes/:id/submit                → server chấm và lưu từng câu.
 *   · GET  /api/courses/:id/quiz/history          → các lần ôn trước.
 *   · GET  /api/enrolled                          → bài đã xong trong khoá.
 * Mọi quyết định (chọn endpoint, cổng "phải xong 2 bài", kiểu câu trả lời gửi
 * lên, có được vẽ phản hồi mức-lựa-chọn hay không) nằm ở src/lib/practice-plan.ts
 * và được test chốt bằng `npm run test:unit`.
 *
 * Vì sao dùng `apiFetch` (chứ không `apiFetchSessionOnly` như trang chủ và
 * trang khoá): /practice là trang SAU đăng nhập — vào đây là đã có ý học, nên
 * để `apiFetch` tự lấy tài khoản khách khi cần là đúng. Trang công khai thì
 * ngược lại: mỗi con bot mở trang sẽ sinh một tài khoản khách và ăn hết quota
 * THROTTLE_GUEST_LIMIT, nên chúng phải đi đường chỉ-refresh.
 *
 * ── BA CHỖ BẢN THIẾT KẾ VẼ MÀ DỮ LIỆU CHƯA CÓ (cố ý KHÔNG dựng) ────────────
 *  1. Hộp Leitner 1·3·7·14 ngày và biểu đồ "nhịp ôn 14 ngày tới": chưa có bảng
 *     nào lưu hộp/ngày gặp lại của từng câu, nên mọi con số vẽ ra là số bịa.
 *     Thay bằng "Những lần ôn gần đây" — đọc từ `quiz/history`, là số thật,
 *     và KHÔNG dựng khối đó khi chưa có lần ôn nào.
 *  2. Phản hồi theo ĐÚNG phương án vừa chọn: `normalizeQuestion()` của backend
 *     bỏ field `detail` của từng phương án (cả 438 phương án trong giáo trình
 *     đều có), nên phản hồi chỉ tới MỨC CÂU. Chỗ gắn `detail` vào đã chừa sẵn
 *     (`optionFeedback`), hôm nay luôn rỗng và màn hình nói thẳng điều đó.
 *  3. "Vì sao hôm nay" và mã bài trên từng thẻ: `stripAnswers()` chỉ gửi
 *     {index, question, options} nên trang không biết câu nào thuộc bài nào.
 *     Bản cũ lấp chỗ đó bằng một câu dẫn kể cơ chế ("Hệ thống chọn câu từ
 *     chính những bài bạn đã xong…") — đã gỡ 15/10/2026; không biết thì
 *     không nói, chứ không nói về cách mình hoạt động.
 */

import { useCallback, useEffect, useState } from 'react';

import SiteHeader from '@/components/SiteHeader';
import { apiFetch, asList, findEnrollment } from '@/lib/api';
import CURRICULA_JSON from '@/lib/curricula.json';
import {
  COURSE_ID,
  ENROLLED_PATH,
  TOTAL_LESSONS,
  answersPayload,
  completedLessons,
  gateFromError,
  historyPath,
  lessonLabels,
  planPractice,
  readGeneratedQuiz,
  readGradedQuestions,
  recentReviews,
  reviewPath,
  scoreLine,
  submitPath,
  type GradedQuestion,
  type PastReview,
  type PracticeGate,
  type ReviewQuiz,
} from '@/lib/practice-plan';

import styles from './practice.module.css';

/** Giáo trình tĩnh — cùng nguồn trang khoá học dùng để vẽ danh sách bài. */
const LESSONS = lessonLabels(
  (CURRICULA_JSON.CURRICULA as Record<string, { modules?: unknown }>)[COURSE_ID]?.modules,
);

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
 * `next/link` — giống cách trang chi tiết khoá đang làm. Trang bài học và trang
 * khoá nạp tổ hợp CSS và script legacy riêng; đi bằng client-side routing thì
 * React GIỮ LẠI tài nguyên của trang cũ (đúng thiết kế của PageStyles) nên hai
 * bộ CSS/script sống chồng nhau.
 */
function lessonHref(no: number): string {
  return `/lesson/${COURSE_ID}?lesson=${no - 1}`;
}

function lessonName(no: number): string {
  return LESSONS.get(no)?.title ?? `bài ${no}`;
}

type Phase = 'loading' | 'gate' | 'generating' | 'quiz' | 'grading' | 'result';

export default function PracticeClient() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [gate, setGate] = useState<PracticeGate | null>(null);
  const [history, setHistory] = useState<PastReview[]>([]);
  const [quiz, setQuiz] = useState<ReviewQuiz | null>(null);
  // picks[i] = CHỈ SỐ phương án đã chọn ở câu thứ i (null = chưa chọn).
  const [picks, setPicks] = useState<Array<number | null>>([]);
  const [graded, setGraded] = useState<GradedQuestion[] | null>(null);
  const [score, setScore] = useState({ score: 0, total: 0 });
  const [notice, setNotice] = useState('');

  // Tiến độ + lịch sử ôn: nạp một lượt lúc mở trang.
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
      setGate(planPractice({ completed: done, total: TOTAL_LESSONS }));
      setHistory(recentReviews((hist as { history?: unknown } | null)?.history, 5));
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
        // Lỗi "chưa đủ câu" của server → đúng trạng thái trống tử tế, không
        // phải chữ lỗi: hai nguồn số bài có thể lệch nhau (xem practice-plan).
        setGate((g) => (g ? gateFromError(g, errMessage(body)) : g));
        if (!errMessage(body)) setNotice('Chưa tạo được phần ôn. Thử lại sau một lát.');
        setPhase('gate');
        return;
      }
      const parsed = readGeneratedQuiz(body);
      if (!parsed) {
        setNotice('Phần ôn trả về chưa dùng được. Bạn thử lại, hoặc đi học bài tiếp.');
        setPhase('gate');
        return;
      }
      setQuiz(parsed);
      setPicks(parsed.questions.map(() => null));
      setGraded(null);
      setPhase('quiz');
    } catch {
      setNotice('Mạng đang chập chờn nên chưa tạo được phần ôn. Thử lại.');
      setPhase('gate');
    }
  }, []);

  const submit = useCallback(async () => {
    if (!quiz) return;
    setNotice('');
    setPhase('grading');
    try {
      const res = await apiFetch(submitPath(quiz.quizId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Mảng THEO VỊ TRÍ, giá trị là CHỈ SỐ phương án — xem answersPayload().
        body: JSON.stringify({ answers: answersPayload(picks, quiz.questions.length) }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice(
          errMessage(body)
            || 'Chưa gửi được phần ôn. Các phương án bạn chọn vẫn còn đây, thử lại.',
        );
        setPhase('quiz');
        return;
      }
      const data = (body ?? {}) as { score?: number; total?: number; detail?: unknown };
      setGraded(readGradedQuestions(quiz.questions, data.detail));
      setScore({
        score: typeof data.score === 'number' ? data.score : 0,
        total: typeof data.total === 'number' ? data.total : quiz.questions.length,
      });
      setPhase('result');
    } catch {
      setNotice('Mạng đang chập chờn nên phần ôn chưa gửi đi. Các phương án vẫn còn đây.');
      setPhase('quiz');
    }
  }, [quiz, picks]);

  const answered = picks.filter((p) => p !== null).length;
  const totalQ = quiz?.questions.length ?? 0;
  const nextNo = gate?.ctaLessonNo ?? null;
  const showQuiz = quiz !== null && (phase === 'quiz' || phase === 'grading' || phase === 'result');

  return (
    <div className={styles.page}>
      <SiteHeader wide />

      <main className={styles.main}>
        <div className={styles.grid}>
          <section className={styles.left} aria-labelledby="practiceTitle">
            <p className={styles.eyebrow}>Ôn tập của tôi</p>
            <h1 className={styles.h1} id="practiceTitle">
              Gặp lại những câu bạn đã làm
            </h1>
            {/* Câu dẫn cũ đã gỡ: "Hệ thống chọn câu từ chính những bài bạn đã
                xong, và lấy nhiều câu hơn từ những bài bạn hay chọn sai. Sai ở
                đây không trừ gì cả." — nửa đầu kể về cơ chế bên trong, nửa sau
                rào đón trước khi có gì để rào. Tiêu đề đã nói màn này làm gì. */}

            {phase === 'loading' && (
              <p className={styles.quiet} aria-live="polite">
                Đang xem bạn đã xong những bài nào…
              </p>
            )}

            {/* ── Trạng thái trống / sẵn sàng ───────────────────────────── */}
            {gate && !showQuiz && phase !== 'loading' && (
              <div className={styles.gateCard}>
                <h2 className={styles.gateHead}>{gate.headline}</h2>
                <p className={styles.gateBody}>{gate.body}</p>

                {gate.kind === 'ready' ? (
                  <>
                    <button
                      type="button"
                      className={styles.primary}
                      onClick={start}
                      disabled={phase === 'generating'}
                    >
                      {phase === 'generating' ? 'Đang dựng phần ôn…' : 'Bắt đầu phần ôn'}
                    </button>
                    <p className={styles.quiet}>
                      Mỗi phần ôn 5–10 câu, khoảng 2 phút. Ôn bao nhiêu lần trong ngày cũng được.
                    </p>
                  </>
                ) : (
                  nextNo !== null && (
                    <a className={styles.primary} href={lessonHref(nextNo)}>
                      {gate.ctaLabel}
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

            {/* ── Phần ôn ───────────────────────────────────────────────── */}
            {showQuiz && quiz && (
              <>
                <div className={styles.countRow}>
                  <span className={styles.countText}>
                    {graded
                      ? scoreLine(score.score, score.total)
                      : `${totalQ} câu · chọn phương án rồi xem kết quả`}
                  </span>
                  <span className={styles.countRight}>
                    <span aria-hidden="true" className={styles.pips}>
                      {quiz.questions.map((q, i) => {
                        const row = graded?.[i];
                        const cls = row
                          ? row.isCorrect
                            ? styles.pipOk
                            : styles.pipBad
                          : picks[i] !== null
                            ? styles.pipDone
                            : styles.pipTodo;
                        return <span className={cls} key={q.index} />;
                      })}
                    </span>
                    <span className={styles.countNote} aria-live="polite">
                      {graded ? 'Đã chấm cả phần ôn' : `Đã chọn ${answered}/${totalQ}`}
                    </span>
                  </span>
                </div>

                <ol className={styles.list}>
                  {quiz.questions.map((q, i) => {
                    const row = graded?.[i];
                    const locked = row !== undefined || phase === 'grading';
                    return (
                      <li
                        className={row ? `${styles.card} ${styles.cardDone}` : styles.card}
                        key={q.index}
                      >
                        <p className={styles.cardLabel}>
                          Câu {i + 1}/{totalQ} · trắc nghiệm
                        </p>
                        <p className={styles.question}>{q.question}</p>

                        <div
                          className={styles.options}
                          role="radiogroup"
                          aria-label={`Phương án cho câu ${i + 1}`}
                        >
                          {q.options.map((opt, oi) => {
                            const picked = (row ? row.pickedIndex : picks[i]) === oi;
                            const isAnswer = row?.correctIndex === oi;
                            const wrongPick = Boolean(row) && picked && !isAnswer;
                            const cls = [
                              styles.option,
                              isAnswer ? styles.optionOk : '',
                              wrongPick ? styles.optionBad : '',
                              row && !isAnswer && !wrongPick ? styles.optionRest : '',
                              !row && picked ? styles.optionPicked : '',
                            ]
                              .filter(Boolean)
                              .join(' ');
                            return (
                              <button
                                type="button"
                                role="radio"
                                aria-checked={picked}
                                className={cls}
                                disabled={locked}
                                key={oi}
                                onClick={() => {
                                  setPicks((prev) => {
                                    const next = [...prev];
                                    next[i] = oi;
                                    return next;
                                  });
                                }}
                              >
                                <span aria-hidden="true" className={styles.letter}>
                                  {LETTERS[oi] ?? oi + 1}
                                </span>
                                <span className={styles.optionText}>{opt}</span>
                                {/* Đúng/chưa đúng KHÔNG chỉ phân biệt bằng màu:
                                    bảng token v2 không có xanh lá, và WCAG 1.4.1
                                    đòi kèm hình hoặc chữ. */}
                                {isAnswer && (
                                  <span className={styles.markOk}>
                                    <svg
                                      width="20"
                                      height="20"
                                      viewBox="0 0 16 16"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.4"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <path d="M3 8.5L6.5 12L13 4.5" />
                                    </svg>
                                    Đáp án
                                  </span>
                                )}
                                {wrongPick && (
                                  <span className={styles.markBad}>
                                    <svg
                                      width="18"
                                      height="18"
                                      viewBox="0 0 16 16"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.4"
                                      strokeLinecap="round"
                                      aria-hidden="true"
                                    >
                                      <path d="M4 4l8 8M12 4l-8 8" />
                                    </svg>
                                    Bạn chọn
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {!row && (
                          <p className={styles.quiet}>
                            Đây là câu ôn, không phải bài kiểm tra. Chọn xong cả phần rồi bấm
                            “Xem kết quả”.
                          </p>
                        )}

                        {/* Khối phản hồi KHÔNG có aria-live: cả phần ôn được chấm
                            một lượt nên 6 vùng live sẽ cùng đọc một lúc. Lời
                            thông báo nằm ở một chỗ duy nhất — dòng đếm phía trên. */}
                        {row && (
                          <div className={row.isCorrect ? styles.fbOk : styles.fbBad}>
                            <span className={styles.fbHead}>
                              {row.isCorrect ? 'Đúng' : 'Chưa đúng'}
                            </span>
                            {/* MỨC CÂU. Phản hồi theo đúng phương án vừa chọn
                                cần field `detail` mà backend chưa gửi — không
                                vẽ thứ chưa có. */}
                            {row.explanation && <p className={styles.fbBody}>{row.explanation}</p>}
                            {!row.isCorrect && row.correctIndex !== null && (
                              <p className={styles.fbBody}>
                                <span className={styles.fbStrong}>Đáp án đúng: </span>
                                {row.options[row.correctIndex]}
                              </p>
                            )}
                            {!row.isCorrect && (
                              <p className={styles.fbBody}>
                                Ôn là để gặp lại đúng chỗ này. Câu của bài này sẽ xuất hiện nhiều
                                hơn ở những phần ôn sau.
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>

                {notice && (
                  <p className={styles.notice} role="status">
                    {notice}
                  </p>
                )}

                {!graded ? (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.primary}
                      onClick={submit}
                      disabled={phase === 'grading'}
                    >
                      {phase === 'grading' ? 'Đang chấm…' : 'Xem kết quả'}
                    </button>
                    <span className={styles.quiet}>
                      {answered < totalQ
                        ? `Còn ${totalQ - answered} câu chưa chọn — bỏ trống cũng xem được kết quả.`
                        : 'Hệ thống chấm cả phần ôn một lượt ở máy chủ.'}
                    </span>
                  </div>
                ) : (
                  <div className={styles.doneCard}>
                    <span className={styles.fbHead}>Xong phần ôn này</span>
                    <p className={styles.fbBody}>
                      {scoreLine(score.score, score.total)}. Những bài bạn chọn sai sẽ góp nhiều
                      câu hơn vào phần ôn sau. Bạn muốn ôn tiếp hay đi học bài mới cũng được.
                    </p>
                    <div className={styles.actions}>
                      <button type="button" className={styles.primary} onClick={start}>
                        Ôn một phần nữa
                      </button>
                      {nextNo !== null && (
                        <a className={styles.quietLink} href={lessonHref(nextNo)}>
                          Mở {lessonName(nextNo)}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* ── Cột phải ──────────────────────────────────────────────── */}
          <aside className={styles.aside} aria-label="Học tiếp và các lần ôn trước">
            {/* Một tên bài và một cái nút.

                Bản cũ có bốn lớp chú giải bao quanh đúng cái nút này: nhãn
                "Gợi ý bước tiếp · hệ thống chọn", đoạn "Vì sao: bạn đã xong
                0/48 bài, và P01 … là bài trống đầu tiên trong giáo trình
                (M1 · …)", câu "Đây là gợi ý, không phải lệnh. Bạn tự quyết
                đường đi:", rồi lối ra "Tự chọn bài". Luật rút ra ghi ở đầu
                khối `nextStep` trong `lib/home-copy.ts`; cùng lúc này thẻ
                song sinh ở trang khoá (`ResumeCard`) cũng bị cắt y như vậy. */}
            <section className={styles.suggest} aria-labelledby="nextTitle">
              <h2 className={styles.suggestHead} id="nextTitle">
                {nextNo !== null ? lessonName(nextNo) : `Bạn đã xong cả ${TOTAL_LESSONS} bài`}
              </h2>
              {nextNo !== null && (
                <a className={styles.suggestBtn} href={lessonHref(nextNo)}>
                  Mở bài {nextNo}
                </a>
              )}
            </section>

            {/* Lối sang chế độ thử thách — MỘT cái nút, không lời giới
                thiệu. Khác luật chơi thì màn Thử thách tự nói ở ngay trên
                nó; nói trước ở đây là giải thích một thứ người đọc chưa gặp.
                Không có lối vào thì route /practice/challenge không ai tới
                được, nên cái nút này phải còn. */}
            <a className={styles.challengeLink} href="/practice/challenge">
              Mở Thử thách ôn
            </a>

            {/* Chưa có lần ôn nào thì KHÔNG dựng khối: một trạng thái rỗng
                không cần một câu nói rằng nó rỗng. Bản cũ in "Chưa có lần ôn
                nào được lưu. Phần ôn đầu tiên của bạn sẽ nằm ở đây." — và
                dưới nó là một đoạn văn giải thích rằng hệ thống KHÔNG hẹn
                ngày gặp lại cho từng câu (kiểu 1·3·7·14 ngày). Không ai hỏi
                điều đó; nó chỉ kể về cơ chế của chính mình. */}
            {history.length > 0 && (
              <section className={styles.sideCard} aria-labelledby="pastTitle">
                <p className={styles.sideLabel} id="pastTitle">
                  Những lần ôn gần đây
                </p>
                <ul className={styles.pastList}>
                  {history.map((h, i) => (
                    <li className={styles.pastItem} key={`${h.day}-${i}`}>
                      {h.line}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>

        <footer className={styles.footer}>
          <p className={styles.footNote}>
            <span className={styles.fbStrong}>Phản hồi ở đây là của CÂU, chưa của từng phương án. </span>
            Mỗi phương án trong bài đều có lời giải thích riêng, nhưng kho câu ôn chưa mang nó
            theo, nên phần “Chưa đúng” chỉ nói được lời giải thích chung của câu và đáp án đúng.
          </p>
          <p className={styles.footNote}>
            <span className={styles.fbStrong}>Tiến độ gắn với tài khoản khách trên trình duyệt này</span>
            {' '}— đổi máy hay xoá dữ liệu trình duyệt là mất. Đề xuất (chưa có): cấp một mã khôi
            phục để mang tiến độ sang máy khác.
          </p>
        </footer>
      </main>
    </div>
  );
}
