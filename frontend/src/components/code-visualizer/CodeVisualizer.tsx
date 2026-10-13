'use client';

// Bộ xem từng bước (code visualizer) cho Python IDE.
//
// Người học bấm "Xem từng bước": chương trình chạy ĐÚNG MỘT LẦN trong sandbox
// Docker trên máy chủ (cùng đường đi với nút Chạy — xem src/python-runner), và
// trả về toàn bộ vết trong một phản hồi. Từ đó việc bước tiến/bước lùi là thuần
// cục bộ, không có lượt gọi máy chủ nào cho mỗi bước. Lý do không phải là tối
// ưu: mỗi lượt chạy là một container DÙNG MỘT LẦN, không có tiến trình nào sống
// sót giữa hai request để mà "bước tiếp".
//
// Vì sao là Python thật chứ không mô phỏng trong trình duyệt: cái người học
// thấy ở đây phải trùng khít cái họ nhận khi bấm Chạy. Một bộ giả lập viết bằng
// JS sẽ lệch ở đúng những chỗ khó (số thực, thứ tự dict, thông điệp ngoại lệ).
//
// Mọi logic quyết định "hiện cái gì" nằm ở frontend/src/lib/trace.ts để test
// được bằng `node --test` (nó không bóc được JSX).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OnMount } from '@monaco-editor/react';

import { apiFetch } from '@/lib/api';
import { isRunnerDown, RUNNER_UNAVAILABLE_MESSAGE } from '@/lib/runner-error';
import {
  changedNames,
  EVENT_LABELS,
  formatValue,
  nextIndex,
  outputAt,
  stopNotice,
  TRACE_COST_NOTE,
  type TraceDocument,
  type TraceResponse,
  type TraceRunInfo,
} from '@/lib/trace';

import styles from './CodeVisualizer.module.css';

type MountArgs = Parameters<OnMount>;
/** Đúng hai thứ `onMount` của Monaco đưa cho IdeClient; không nhận thêm gì. */
export type MonacoHandle = { editor: MountArgs[0]; monaco: MountArgs[1] };

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; doc: TraceDocument; run: TraceRunInfo; code: string }
  | { status: 'error'; kind: 'infra' | 'busy' | 'other'; message: string; detail?: string };

/** Backend bọc lỗi thành { error: { message } } (AllExceptionsFilter) hoặc { message } (ValidationPipe). */
function errorMessage(body: unknown, fallback: string): string {
  const b = body as { error?: { message?: unknown } | string; message?: unknown } | null;
  const raw = (typeof b?.error === 'object' ? b.error?.message : undefined) ?? b?.message;
  if (Array.isArray(raw)) return raw.join(', ');
  return typeof raw === 'string' && raw ? raw : fallback;
}

export default function CodeVisualizer({
  codeRef,
  editorRef,
}: {
  /**
   * Nội dung editor MỚI NHẤT. Nhận ref chứ không nhận chuỗi `code`: IdeClient
   * cập nhật `codeRef.current` ĐỒNG BỘ trong onChange, nên bấm ngay sau khi gõ
   * vẫn ghi vết đúng bản vừa gõ (state `code` chỉ mới ở render kế tiếp — bẫy đã
   * có thật ở Ctrl+Enter của nút Chạy).
   */
  codeRef: { current: string };
  /** Có thì dòng đang chạy được tô ngay trong Monaco; không có thì chỉ tô ở khung mã bên dưới. */
  editorRef?: { current: MonacoHandle | null };
}) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [index, setIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  const doc = state.status === 'ready' ? state.doc : null;
  // useMemo (không phải `doc?.steps ?? []`): mảng rỗng mới mỗi lần render làm
  // mọi useMemo/useCallback phụ thuộc vào nó tính lại vô ích ở mỗi render.
  const steps = useMemo(
    () => (state.status === 'ready' ? state.doc.steps : []),
    [state],
  );
  const step = steps[index];

  const start = useCallback(async () => {
    if (abortRef.current) return; // đang chạy: bỏ qua cú bấm thứ hai
    const controller = new AbortController();
    abortRef.current = controller;
    const code = codeRef.current;
    setState({ status: 'loading' });
    setIndex(0);
    try {
      const res = await apiFetch('/api/python/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      });
      const body: unknown = await res.json().catch(() => null);
      if (res.status === 429) {
        // Hai nguồn 429 với hai lời khuyên khác nhau (bấm quá nhiều / máy chủ
        // quá tải); backend đã phân biệt bằng thông điệp nên hiện đúng câu đó.
        setState({
          status: 'error',
          kind: 'busy',
          message: errorMessage(body, 'Máy chủ đang quá tải, thử lại sau'),
        });
      } else if (res.status === 503) {
        setState({
          status: 'error',
          kind: 'infra',
          message: RUNNER_UNAVAILABLE_MESSAGE,
          detail: `HTTP 503 — ${errorMessage(body, 'bộ chạy Python không trả lời.')}`,
        });
      } else if (res.status === 401) {
        setState({
          status: 'error',
          kind: 'infra',
          message:
            'Lúc này IDE chưa chạy được mã. Các bài học trong khóa vẫn chạy Python '
            + 'bình thường ngay trong trình duyệt.',
          detail: `HTTP 401 — ${errorMessage(body, 'phiên khách chưa sẵn sàng; tải lại trang.')}`,
        });
      } else if (!res.ok) {
        // 400 ở đây gần như luôn là "chương trình quá dài để ghi vết": thông
        // điệp của backend có con số thật và chỉ sang nút Chạy, nên hiện nguyên.
        setState({
          status: 'error',
          kind: 'other',
          message: errorMessage(body, `Không ghi được vết (HTTP ${res.status}).`),
        });
      } else {
        const payload = body as TraceResponse | null;
        if (!payload?.trace) {
          setState({ status: 'error', kind: 'other', message: 'Máy chủ trả về dữ liệu lạ.' });
        } else if (
          // 200 nhưng docker chết trước khi Python kịp chạy — cùng phép thử với
          // nút Chạy, dùng lại đúng hàm đó để hai nơi không nói khác nhau.
          isRunnerDown({
            stdout: payload.trace.stdout,
            stderr: payload.trace.stderr,
            exitCode: payload.run.exitCode,
            timedOut: payload.run.timedOut,
            outputTruncated: payload.run.outputTruncated,
          })
        ) {
          setState({
            status: 'error',
            kind: 'infra',
            message: RUNNER_UNAVAILABLE_MESSAGE,
            detail: payload.trace.stderr.trim(),
          });
        } else {
          setState({
            status: 'ready',
            doc: payload.trace,
            run: payload.run,
            code,
          });
          setIndex(0);
        }
      }
    } catch (e) {
      if (controller.signal.aborted) return; // người dùng rời trang
      setState({
        status: 'error',
        kind: 'other',
        message:
          e instanceof Error
            ? `Không kết nối được máy chủ: ${e.message}`
            : 'Không kết nối được máy chủ.',
      });
    } finally {
      abortRef.current = null;
    }
  }, [codeRef]);

  // Rời trang giữa chừng thì huỷ request đang treo (container tự hết giờ ở máy chủ).
  useEffect(() => () => abortRef.current?.abort(), []);

  // Tô dòng đang chạy trong Monaco. Dọn sạch khi đổi bước/đóng panel, nếu không
  // các decoration cũ cộng dồn và cả file sáng lên.
  useEffect(() => {
    const handle = editorRef?.current;
    if (!handle || !step) return;
    const { editor, monaco } = handle;
    const collection = editor.createDecorationsCollection([
      {
        range: new monaco.Range(step.line, 1, step.line, 1),
        options: {
          isWholeLine: true,
          className: styles.monacoLine,
          glyphMarginClassName: styles.monacoGlyph,
        },
      },
    ]);
    editor.revealLineInCenterIfOutsideViewport(step.line);
    return () => collection.clear();
  }, [editorRef, step]);

  // Dòng đang chạy phải tự hiện ra trong khung mã, kể cả với chương trình dài.
  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const go = useCallback(
    (move: 'first' | 'prev' | 'next' | 'last') =>
      setIndex((i) => nextIndex(i, steps.length, move)),
    [steps.length],
  );

  const codeLines = useMemo(
    () => (state.status === 'ready' ? state.code.replace(/\n$/, '').split('\n') : []),
    [state],
  );
  const changed = useMemo(
    () => (step ? changedNames(steps[index - 1], step) : new Set<string>()),
    [step, steps, index],
  );
  const output = doc ? outputAt(doc, index) : { stdout: '', stderr: '' };
  const notice = doc ? stopNotice(doc) : null;

  return (
    <section
      className={styles.panel}
      ref={panelRef}
      aria-label="Xem từng bước"
      // ←/→ bước, Home/End về đầu/cuối — chỉ khi tiêu điểm đang ở TRONG panel,
      // nên không giành phím mũi tên của người đang gõ mã trong Monaco. Ô kéo
      // (type=range) tự xử lý ←/→ rồi, đừng xử lý hai lần.
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement) return;
        const move =
          e.key === 'ArrowLeft'
            ? 'prev'
            : e.key === 'ArrowRight'
              ? 'next'
              : e.key === 'Home'
                ? 'first'
                : e.key === 'End'
                  ? 'last'
                  : null;
        if (!move) return;
        e.preventDefault();
        go(move);
      }}
    >
      <header className={styles.head}>
        <h2 className={styles.title}>Xem từng bước</h2>
        <button
          type="button"
          className={styles.start}
          onClick={() => void start()}
          disabled={state.status === 'loading'}
        >
          {state.status === 'loading'
            ? 'Đang ghi vết…'
            : state.status === 'ready'
              ? '↻ Ghi vết lại'
              : '⇥ Xem từng bước'}
        </button>
        {state.status === 'ready' && (
          <span className={styles.cost}>
            Ghi vết mất {(state.run.durationMs / 1000).toFixed(2)} s
            {state.run.queuedMs > 0 && ` (chờ hàng đợi ${(state.run.queuedMs / 1000).toFixed(1)} s)`}
            {' · '}
            {state.doc.stats.steps.toLocaleString('vi-VN')} bước ghi được
            {state.doc.stats.events > state.doc.stats.steps
              && ` / ${state.doc.stats.events.toLocaleString('vi-VN')} bước đã chạy`}
          </span>
        )}
      </header>

      {/* Nói trước cái giá, ở TRÊN MẶT chứ không chỉ trong tài liệu. */}
      <p className={styles.note}>{TRACE_COST_NOTE}</p>

      {state.status === 'error' && (
        <div
          className={`${styles.notice} ${
            state.kind === 'infra' ? styles.noticeWarn : styles.noticeError
          }`}
          role="alert"
        >
          <p>{state.message}</p>
          {state.detail && (
            <details className={styles.detail}>
              <summary>Chi tiết kỹ thuật</summary>
              <pre className={styles.detailBody}>{state.detail}</pre>
            </details>
          )}
        </div>
      )}

      {state.status === 'loading' && (
        <p className={styles.hint}>
          <span className={styles.spinner} aria-hidden="true" />
          Đang chạy và ghi vết trong sandbox…
        </p>
      )}

      {doc && (
        <>
          {notice && (
            <div
              className={`${styles.notice} ${
                notice.kind === 'error' ? styles.noticeError : styles.noticeWarn
              }`}
              role="status"
            >
              <p>{notice.text}</p>
            </div>
          )}

          {steps.length === 0 ? (
            <p className={styles.hint}>
              Không có bước nào để xem — chương trình chưa chạy được dòng nào.
            </p>
          ) : (
            <>
              <div className={styles.controls}>
                <div className={styles.buttons} role="group" aria-label="Điều khiển bước">
                  <button
                    type="button"
                    className={styles.ctrl}
                    onClick={() => go('first')}
                    disabled={index === 0}
                    aria-label="Về bước đầu"
                    title="Về bước đầu (Home)"
                  >
                    ⏮
                  </button>
                  <button
                    type="button"
                    className={styles.ctrl}
                    onClick={() => go('prev')}
                    disabled={index === 0}
                    aria-label="Bước trước"
                    title="Bước trước (←)"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    className={styles.ctrl}
                    onClick={() => go('next')}
                    disabled={index >= steps.length - 1}
                    aria-label="Bước sau"
                    title="Bước sau (→)"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className={styles.ctrl}
                    onClick={() => go('last')}
                    disabled={index >= steps.length - 1}
                    aria-label="Tới bước cuối"
                    title="Tới bước cuối (End)"
                  >
                    ⏭
                  </button>
                </div>
                {/* <input type=range> thay vì thanh tiến trình tự vẽ: kéo được,
                    đọc được bằng bàn phím và trình đọc màn hình, và không cần
                    style nội tuyến (CSP của trang không cho style="…"). */}
                <input
                  className={styles.scrub}
                  type="range"
                  min={0}
                  max={steps.length - 1}
                  value={index}
                  onChange={(e) => setIndex(Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Home') {
                      e.preventDefault();
                      go('first');
                    } else if (e.key === 'End') {
                      e.preventDefault();
                      go('last');
                    }
                  }}
                  aria-label="Chọn bước"
                  aria-valuetext={`Bước ${index + 1} trên ${steps.length}`}
                />
                <span className={styles.counter} aria-live="polite">
                  Bước {(index + 1).toLocaleString('vi-VN')}/
                  {steps.length.toLocaleString('vi-VN')}
                  {step && ` · ${EVENT_LABELS[step.event]} ${step.line}`}
                </span>
              </div>

              <div className={styles.grid}>
                <div className={styles.codePane}>
                  <h3 className={styles.paneTitle}>Mã đã ghi vết</h3>
                  <div className={styles.code}>
                    {codeLines.map((text, i) => {
                      const active = step?.line === i + 1;
                      return (
                        <div
                          key={i}
                          ref={active ? activeLineRef : undefined}
                          className={active ? `${styles.line} ${styles.lineActive}` : styles.line}
                        >
                          <span className={styles.lineNo} aria-hidden="true">
                            {i + 1}
                          </span>
                          <span className={styles.lineArrow} aria-hidden="true">
                            {active ? '▶' : ''}
                          </span>
                          <code className={styles.lineText}>{text || ' '}</code>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.sidePane}>
                  <h3 className={styles.paneTitle}>Call stack</h3>
                  <ol className={styles.stack}>
                    {step?.framesElided ? (
                      <li className={styles.stackElided}>
                        … bỏ {step.framesElided.toLocaleString('vi-VN')} khung ở giữa (đệ quy sâu)
                      </li>
                    ) : null}
                    {step?.frames
                      .slice()
                      .reverse()
                      .map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className={i === 0 ? `${styles.frame} ${styles.frameTop}` : styles.frame}
                        >
                          <span className={styles.frameName}>{f.name}</span>
                          <span className={styles.frameLine}>dòng {f.line}</span>
                        </li>
                      ))}
                  </ol>

                  <h3 className={styles.paneTitle}>Biến</h3>
                  {step && step.frames.length > 0 ? (
                    step.frames
                      .slice()
                      .reverse()
                      .map((f, fi) => (
                        <div key={`vars-${f.name}-${fi}`} className={styles.varGroup}>
                          <p className={styles.varScope}>
                            {f.name === '<module>' ? 'toàn cục' : `trong ${f.name}`}
                          </p>
                          {f.locals.length === 0 ? (
                            <p className={styles.hint}>(chưa có biến nào)</p>
                          ) : (
                            <dl className={styles.vars}>
                              {f.locals.map(([name, value]) => (
                                <div
                                  key={name}
                                  className={
                                    fi === 0 && changed.has(name)
                                      ? `${styles.varRow} ${styles.varChanged}`
                                      : styles.varRow
                                  }
                                >
                                  <dt className={styles.varName}>{name}</dt>
                                  <dd className={styles.varValue}>{formatValue(value)}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </div>
                      ))
                  ) : (
                    <p className={styles.hint}>(chưa có biến nào)</p>
                  )}

                  {step?.ret !== undefined && (
                    <p className={styles.returned}>
                      Trả về: <code>{formatValue(step.ret)}</code>
                    </p>
                  )}
                  {step?.exc && (
                    <p className={styles.thrown}>
                      Ngoại lệ: <code>{step.exc.type}: {step.exc.message}</code>
                    </p>
                  )}
                </div>

                <div className={styles.outPane}>
                  <h3 className={styles.paneTitle}>Đầu ra tới bước này</h3>
                  {output.stdout ? (
                    <pre className={styles.stdout}>{output.stdout}</pre>
                  ) : (
                    <p className={styles.hint}>(chưa in gì)</p>
                  )}
                  {output.stderr && <pre className={styles.stderr}>{output.stderr}</pre>}
                  {doc.stdoutTruncated && (
                    <p className={styles.hint}>
                      … đầu ra vượt {doc.limits.maxOutputChars.toLocaleString('vi-VN')} ký tự nên
                      phần sau không được giữ.
                    </p>
                  )}
                  {doc.error?.traceback && (
                    <details className={styles.detail} open>
                      <summary>Traceback</summary>
                      <pre className={styles.stderr}>{doc.error.traceback}</pre>
                    </details>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
