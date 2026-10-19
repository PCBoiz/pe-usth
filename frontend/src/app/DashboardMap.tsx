'use client';

// Phần tương tác của trang chủ `/` theo Figma 60:5137: bản đồ 8 chặng (đường sóng)
// → bài của chặng đang chọn → khung "bài đang chọn" với các màn đã học / sẽ học.
// Figma gọi chúng là "mục"; bảng thuật ngữ chốt khoá → chặng → bài → màn.
//
// Dữ liệu và luật nằm ở src/lib/dashboard-plan.ts (có test). File này chỉ lo:
//  · tải tiến độ — CHỈ khi máy đã có phiên, và qua `apiFetchSessionOnly`: trang
//    này công khai, `apiFetch` gặp 401 sẽ tạo tài khoản khách (bẫy trong
//    AGENTS.md). Chưa có phiên thì không một lời gọi mạng nào, trang hiện như
//    người mới.
//  · đọc bản nháp localStorage của các bài trong chặng để đếm màn đã xong.
//  · giữ lựa chọn chặng/bài.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { apiFetchSessionOnly, asList, findEnrollment } from '@/lib/api';
import {
  completedLessonSet,
  LS_ACCESS,
  LS_LEGACY_REFRESH,
  loadCompletedLessons,
  planResume,
} from '@/lib/course-progress';
import {
  defaultSelection,
  draftDone,
  draftKey,
  lessonSteps,
  stageDoneCount,
  type DashStage,
} from '@/lib/dashboard-plan';

import styles from './home.module.css';

const COURSE_ID = 'python_advanced';

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Bài đã xong (theo server) và id người dùng (để tìm bản nháp) — null khi chưa biết. */
function useProgress(): { completed: number[] | null; userId: number | null } {
  const [completed, setCompleted] = useState<number[] | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const session = {
      access: lsGet(LS_ACCESS),
      legacyRefresh: lsGet(LS_LEGACY_REFRESH),
      cookie: typeof document === 'undefined' ? null : document.cookie,
    };
    void loadCompletedLessons({
      session,
      fetchCompleted: async () => {
        const res = await apiFetchSessionOnly('/api/enrolled');
        if (!res.ok) return null;
        const row = findEnrollment(asList((await res.json()) as unknown, 'enrolled'), COURSE_ID);
        const raw = row?.completedLessonNumbers;
        return Array.isArray(raw) ? raw.filter((n): n is number => typeof n === 'number') : null;
      },
    }).then((list) => {
      if (alive && list) setCompleted(list);
    });
    // Cùng cổng phiên: id người dùng chỉ để ghép khoá bản nháp localStorage.
    void loadCompletedLessons({
      session,
      fetchCompleted: async () => {
        const res = await apiFetchSessionOnly('/api/user');
        if (!res.ok) return null;
        const id = ((await res.json()) as { id?: unknown })?.id;
        return typeof id === 'number' ? [id] : null;
      },
    }).then((ids) => {
      if (alive && ids?.length) setUserId(ids[0]);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { completed, userId };
}

// ── bản đồ sóng ─────────────────────────────────────────────────────────
// Toạ độ nút nằm ở CSS (.node:nth-child), không phải thuộc tính style nội
// tuyến: SSR tuần tự hoá nó thành thuộc tính HTML mà CSP `style-src` chặn
// (AGENTS.md). Hàm dưới chỉ vẽ ĐƯỜNG SVG và phải ra đúng các toạ độ đó:
// x = 70 + i·860/7 trên khung 1000 → 7%, 19,3%, … 93%; y = 112 / 48 trên 170.
const MAP_W = 1000;
const MAP_H = 170;
/** Nút thấp – cao xen kẽ như Figma: M01 thấp, M02 cao, … M08 cao. */
function nodeAt(i: number, count: number) {
  const x = 70 + (i * (MAP_W - 140)) / Math.max(count - 1, 1);
  const y = i % 2 === 0 ? 112 : 48;
  return { x, y };
}
function segmentPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = (b.x - a.x) / 2;
  return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
}

export default function DashboardMap({
  stages,
  lessonUrl,
}: {
  stages: DashStage[];
  lessonUrl: string;
}) {
  const { completed, userId } = useProgress();
  const total = stages.reduce((n, s) => n + s.lessons.length, 0);
  const doneSet = useMemo(() => completedLessonSet(completed, total), [completed, total]);

  // Lựa chọn: theo planResume tới khi người xem tự bấm.
  const [picked, setPicked] = useState<{ stage: number; lesson: number } | null>(null);
  const resume = defaultSelection(stages, planResume(completed, total).index);
  const sel = picked ?? resume;
  const stage = stages[sel.stage] ?? stages[0];

  // Bản nháp của các bài trong chặng đang xem (chỉ máy này).
  // Tính lúc render chứ không setState trong effect: userId chỉ có sau lượt
  // render đầu (effect tải phiên), nên server và lượt hydrate đều ra {} — khớp.
  const drafts = useMemo(() => {
    const out: Record<number, Record<string, unknown> | null> = {};
    if (userId === null || !stage) return out;
    for (const l of stage.lessons) out[l.no] = draftDone(lsGet(draftKey(userId, COURSE_ID, l.no)));
    return out;
  }, [userId, stage]);

  if (!stage) return null;
  const lesson = stage.lessons.find((l) => l.index === sel.lesson) ?? stage.lessons[0];
  const steps = lessonSteps(lesson.screens, drafts[lesson.no], doneSet.has(lesson.no));
  const stagesDone = stages.filter((s) => s.lessons.length > 0 && stageDoneCount(s, doneSet) === s.lessons.length).length;
  const bossStages = stages.filter((s) => s.hasBoss);
  const pts = stages.map((_, i) => nodeAt(i, stages.length));
  const lessonHref = `${lessonUrl}?lesson=${lesson.index}`;

  const pickStage = (i: number) => {
    const s = stages[i];
    const first = s.lessons.find((l) => !doneSet.has(l.no)) ?? s.lessons[0];
    setPicked({ stage: i, lesson: first?.index ?? 0 });
  };

  const statusOf = (no: number, index: number) => {
    if (doneSet.has(no)) return 'done' as const;
    const d = drafts[no];
    if (index === resume.lesson || (d && Object.values(d).some((v) => v === true))) return 'doing' as const;
    return 'todo' as const;
  };

  const ctaLabel = doneSet.has(lesson.no)
    ? `Xem lại ${lesson.code}`
    : steps.doneCount > 0
      ? `Tiếp tục học ${lesson.code}`
      : `Bắt đầu học ${lesson.code}`;

  return (
    <section className={styles.journey} aria-label="Bản đồ tiến trình">
      {/* ── bản đồ 8 chặng ── */}
      <div className={styles.mapHead}>
        <h2 className={styles.mapTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
            <path d="M9 3v15M15 6v15" />
          </svg>
          Bản đồ tiến trình
          <span className={styles.chip}>{stages.length} chặng</span>
        </h2>
        <span className={styles.mapCount}>
          {String(stagesDone).padStart(2, '0')} / {String(stages.length).padStart(2, '0')} chặng đã xong
        </span>
      </div>

      <div className={styles.mapScroll}>
        <div className={styles.mapCanvas}>
          <svg className={styles.mapSvg} viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none" aria-hidden="true">
            {pts.slice(1).map((p, i) => {
              const toBoss = stages[i + 1]?.hasBoss && i + 1 === stages.length - 1;
              const lit = i < resume.stage || i === sel.stage;
              return (
                <path
                  key={i}
                  d={segmentPath(pts[i], p)}
                  className={lit ? styles.mapPathLit : toBoss ? styles.mapPathBoss : styles.mapPath}
                />
              );
            })}
          </svg>
          {stages.map((s, i) => {
            const isSel = i === sel.stage;
            const full = s.lessons.length > 0 && stageDoneCount(s, doneSet) === s.lessons.length;
            const cls = [
              styles.node,
              isSel ? styles.nodeSel : '',
              full ? styles.nodeDone : '',
              s.hasBoss && !isSel ? styles.nodeBoss : '',
            ].join(' ');
            return (
              <button
                key={s.code}
                type="button"
                className={cls}
                aria-pressed={isSel}
                aria-label={`${s.code} · ${s.name} — ${s.topic}, ${s.lessons.length} bài${full ? ', đã xong' : ''}`}
                onClick={() => pickStage(i)}
              >
                <span className={styles.nodeBox}>{s.code}</span>
                <span className={styles.nodeLabel}>
                  {isSel ? s.name : s.hasBoss ? s.name : s.label}
                  {isSel && <span className={styles.nodeHere}>Đang xem ↓</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.mapFoot}>
        <span>
          {stage.code} đang mở · {stage.lessons.length} bài của chặng ở ngay bên dưới
        </span>
        {bossStages.length > 0 && (
          <span className={styles.bossNote}>
            Có bài tổng hợp chặng: {bossStages.map((s) => s.code).join(', ')}
          </span>
        )}
      </div>

      {/* ── bài của chặng ── */}
      <div className={styles.stageHead}>
        <div>
          <h2 className={styles.stageTitle}>
            <span className={styles.stageCode}>{stage.code}</span>
            {stage.label}: {stage.name}
            <span className={styles.chip}>{stage.lessons.length} bài</span>
          </h2>
          <p className={styles.stageSub}>
            {stage.topic} · {lesson.code} đang được chọn, nội dung hiện ngay bên dưới.
          </p>
        </div>
        <div className={styles.stageProgress}>
          <div className={styles.stageProgressRow}>
            <span>Tiến độ chặng</span>
            <strong>
              {stageDoneCount(stage, doneSet)} / {stage.lessons.length} đã xong
            </strong>
          </div>
          <progress
            className={styles.bar}
            value={stageDoneCount(stage, doneSet)}
            max={Math.max(stage.lessons.length, 1)}
            aria-label="Tiến độ chặng"
          />
        </div>
      </div>

      <div className={styles.lessonScroll}>
        <ol className={styles.lessonRow}>
          {stage.lessons.map((l) => {
            const st = statusOf(l.no, l.index);
            const isSel = l.index === lesson.index;
            const cls = [
              styles.lessonCard,
              isSel ? styles.lessonCardSel : '',
              l.boss ? styles.lessonCardBoss : '',
              st === 'done' ? styles.lessonCardDone : '',
            ].join(' ');
            return (
              <li key={l.code} className={styles.lessonCol}>
                <span className={`${styles.stepDot} ${isSel ? styles.stepDotSel : ''} ${l.boss ? styles.stepDotBoss : ''}`} aria-hidden="true">
                  <i />
                  {l.boss ? 'Tổng hợp' : l.code}
                </span>
                <button
                  type="button"
                  className={cls}
                  aria-pressed={isSel}
                  onClick={() => setPicked({ stage: sel.stage, lesson: l.index })}
                >
                  <span className={styles.lessonTitle}>{l.title}</span>
                  <span className={styles.lessonMeta}>
                    {l.code}
                    {l.minutes ? ` · ${l.minutes} phút` : ''}
                    {l.xp ? ` · +${l.xp} XP` : ''}
                  </span>
                  <span className={styles.lessonStatus}>
                    {l.boss && st !== 'done'
                      ? 'Bài tổng hợp chặng'
                      : st === 'done'
                        ? '✓ Đã xong'
                        : st === 'doing'
                          ? isSel
                            ? '• Đang học · Xem chi tiết ↓'
                            : '• Đang học'
                          : isSel
                            ? '• Chưa học · Xem chi tiết ↓'
                            : '• Chưa học'}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── bài đang chọn ── */}
      <div className={styles.band}>
        {lesson.code} / Nội dung bài đang chọn
      </div>

      <div className={styles.detail}>
        <div className={styles.detailHead}>
          <div>
            <p className={styles.crumb}>
              {stage.code} / {stage.label} / {lesson.code}
              <span className={styles.chipAccent}>
                {doneSet.has(lesson.no) ? 'Đã xong' : steps.doneCount > 0 ? 'Đang học' : 'Chưa học'}
              </span>
            </p>
            <h2 className={styles.detailTitle}>{lesson.title}</h2>
            <p className={styles.detailMeta}>
              {lesson.minutes > 0 && <span>⏱ {lesson.minutes} phút</span>}
              {lesson.xp > 0 && <span className={styles.xp}>+{lesson.xp} XP</span>}
              <span>
                {stage.label}: {stage.name}
              </span>
            </p>
          </div>
          <div className={styles.detailProgress}>
            <span className={styles.detailProgressLabel}>Tiến độ trong bài</span>
            <div className={styles.stageProgressRow}>
              <span>Trong bài {lesson.code}</span>
              <strong className={styles.pct}>{steps.pct}%</strong>
            </div>
            <progress className={styles.bar} value={steps.doneCount} max={Math.max(steps.total, 1)} aria-label={`Tiến độ trong bài ${lesson.code}`} />
            <span className={styles.detailProgressNote}>
              {steps.doneCount} / {steps.total} màn đã học ·{' '}
              {doneSet.has(lesson.no) ? 'bài đã xong' : 'bài chưa xong'}
            </span>
          </div>
        </div>

        <div className={styles.detailGrid}>
          <div className={styles.nowCard}>
            <span className={styles.nowEyebrow}>
              {steps.current
                ? `Đang học / Bước ${String(steps.current.n).padStart(2, '0')} trong ${String(steps.total).padStart(2, '0')}`
                : 'Đã xong cả bài'}
            </span>
            <h3 className={styles.nowTitle}>{steps.current?.label ?? 'Xem lại bài'}</h3>
            <p className={styles.nowText}>{steps.current?.hint ?? 'Mọi màn của bài đã xong. Bạn vẫn mở lại được để ôn.'}</p>
            <ol className={styles.nowStrip} aria-label={`${steps.doneCount} trên ${steps.total} màn đã xong`}>
              {steps.items.map((it) => (
                <li
                  key={it.key}
                  title={it.label}
                  className={it.state === 'done' ? styles.stripDone : it.state === 'current' ? styles.stripCurrent : ''}
                />
              ))}
            </ol>
            <Link href={lessonHref} className={styles.nowCta}>
              <span aria-hidden="true">→</span> {ctaLabel}
            </Link>
          </div>

          <div className={styles.listCol}>
            <h3 className={styles.listTitle}>
              <span className={styles.listIcon} aria-hidden="true">✓</span>
              Đã học <span className={styles.listCount}>{String(steps.doneCount).padStart(2, '0')} màn</span>
            </h3>
            {steps.doneCount === 0 ? (
              <p className={styles.listEmpty}>Chưa có màn nào.</p>
            ) : (
              <ul className={styles.list}>
                {steps.items
                  .filter((it) => it.state === 'done')
                  .map((it) => (
                    <li key={it.key} className={styles.listItemDone}>
                      <span className={styles.check} aria-hidden="true">✓</span>
                      <span>
                        <strong>{it.label}</strong>
                        <small>{it.hint}</small>
                      </span>
                    </li>
                  ))}
              </ul>
            )}
            <p className={styles.listNote}>Các màn đã học có thể xem lại trong bài {lesson.code}.</p>
          </div>

          <div className={styles.listCol}>
            <h3 className={styles.listTitle}>
              <span className={styles.listIcon} aria-hidden="true">☰</span>
              Sẽ học tiếp{' '}
              <span className={styles.listCount}>{String(steps.total - steps.doneCount).padStart(2, '0')} màn</span>
            </h3>
            {steps.total === steps.doneCount ? (
              <p className={styles.listEmpty}>Không còn màn nào.</p>
            ) : (
              <ul className={styles.list}>
                {steps.items
                  .filter((it) => it.state !== 'done')
                  .map((it) => (
                    <li key={it.key} className={it.state === 'current' ? styles.listItemNow : styles.listItem}>
                      <span className={styles.dot} aria-hidden="true" />
                      <span>
                        <strong>
                          {String(it.n).padStart(2, '0')} · {it.label}
                          {it.state === 'current' ? ' — đang học' : ''}
                        </strong>
                        <small>{it.hint}</small>
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        <div className={styles.detailFoot}>
          <p className={styles.detailNote}>
            Số màn đã học đọc từ bản nháp lưu trên máy này; học ở máy khác thì số ở đây có thể thấp
            hơn. Xong đủ {steps.total} màn là xong {lesson.code}
            {lesson.xp ? ` và nhận +${lesson.xp} XP` : ''}.
          </p>
          <div className={styles.detailActions}>
            <Link href={`/courses/${COURSE_ID}`} className={styles.ghostBtn}>
              Xem cả giáo trình
            </Link>
            <Link href={lessonHref} className={styles.ghostBtn}>
              Mở bài học
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
