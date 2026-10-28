'use client';

// Cầu nối React ↔ `Runner`: giữ một bộ chạy duy nhất cho cả màn bài học, nạp
// sẵn runtime khi mở bài, và phơi ra đúng ba thứ UI cần biết — đang chạy hay
// không, dòng trạng thái ("Đang tải Python…"/"CPython 3.12"), và hàm chạy.
//
// Mọi chi tiết Pyodide/Worker nằm trong runner/pyodide-runner.ts. Khi có bộ
// chấm chạy trong Docker, chỉ cần đổi lớp dựng trong `grab()` dưới đây.
import { useCallback, useEffect, useRef, useState } from 'react';

import { ghiBamDung, ghiLuotChay } from '@/lib/learning-events';
import {
  isGraded,
  parsonsCode,
  type LessonDraft,
  type LessonScreen,
  type PlayGame,
  type StudioLesson as Lesson,
  type StudioPackage,
} from '@/lib/studio-lesson';

import { PyodideRunner } from './runner/pyodide-runner';
import { shouldPrewarm } from './prewarm-gate';
import type { RunRequest, RunResult, Runner, TestResult } from './runner/types';
import type { RunVerdict } from './useLessonProgress';

export type CodeRunner = {
  running: boolean;
  /** Dòng nhỏ cạnh tên file trong editor. */
  runtimeStatus: string;
  /** Chạy một lượt; `null` = người học bấm Dừng nên không có gì để hiện. */
  run: (request: RunRequest) => Promise<RunResult | null>;
  cancel: () => void;
};

export function useCodeRunner({
  enabled,
  packages,
}: {
  enabled: boolean;
  /** Thư viện của bài: nạp sẵn cùng runtime khi mở bài. */
  packages?: StudioPackage[];
}): CodeRunner {
  const [running, setRunning] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState('');
  // Bộ chạy nằm trong ref và được dựng LƯỜI (chỉ chạm trong callback/effect,
  // không đọc lúc render — react-hooks/refs).
  //
  // Vì sao không `useMemo`: React StrictMode (bật sẵn ở Next dev) gắn rồi tháo
  // rồi gắn lại component. Cleanup gọi dispose(), nhưng giá trị useMemo sống
  // qua lần gắn lại — bộ chạy sẽ "chết" vĩnh viễn ở chế độ dev. Để trong ref và
  // xoá về null khi tháo thì lần gắn lại dựng bản mới.
  const runnerRef = useRef<Runner | null>(null);
  const aliveRef = useRef(true);
  const grab = useCallback(() => (runnerRef.current ??= new PyodideRunner()), []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      runnerRef.current?.dispose();
      runnerRef.current = null;
    };
  }, []);

  // Nạp sẵn runtime ngay khi bài mở ra: học viên còn mấy màn đọc hiểu trước khi
  // tới ô soạn mã, nên phần chờ ~13 MB rơi vào lúc họ không ngồi đợi.
  // Khoá theo NỘI DUNG mảng để effect không chạy lại mỗi lần render.
  const packageKey = (packages ?? []).join(',');
  useEffect(() => {
    if (!enabled) return;
    const list = packageKey ? (packageKey.split(',') as StudioPackage[]) : [];
    const warm = setTimeout(() => grab().prewarm(list), 0);
    return () => clearTimeout(warm);
  }, [enabled, grab, packageKey]);

  const run = useCallback(
    async (request: RunRequest) => {
      setRunning(true);
      const result = await grab().run(request, (status) => {
        if (aliveRef.current) setRuntimeStatus(status);
      });
      if (aliveRef.current) setRunning(false);
      return result;
    },
    [grab],
  );

  const cancel = useCallback(() => {
    runnerRef.current?.cancel();
    setRunning(false);
    setRuntimeStatus('');
  }, []);

  return { running, runtimeStatus, run, cancel };
}

/**
 * Phần "chạy & nộp" của MỘT BÀI: ghép bộ chạy ở trên với luật của bài — chặn
 * nộp khi còn màn chưa làm, mở lời giải sau lần nộp đầu, ghi nhận hoàn thành,
 * và chấm các game chạy code (parsons/debug) bằng chính bộ test của bài.
 *
 * Nằm cùng file với useCodeRunner vì là hai tầng của một việc, nhưng lớp dưới
 * (runner/) tuyệt đối không biết gì về bài học — đó là chỗ bộ chấm Docker sẽ
 * thay vào.
 */
export function useLessonRun({
  lesson,
  screens,
  draft,
  busy,
  scored,
  update,
  markDone,
  goTo,
  award,
  setCheckedKey,
  setRunVerdicts,
  setGameRuns,
  setMessage,
  setCelebrate,
  saveCompletion,
}: {
  lesson: Lesson | null;
  screens: LessonScreen[];
  draft: LessonDraft;
  /** Đang gọi API ghi (đăng ký/hoàn thành) thì không cho chạy thêm. */
  busy: boolean;
  /** Khoá có mini-game: chạy đúng thì bắn pháo giấy. */
  scored: boolean;
  update: (changes: Partial<LessonDraft>) => void;
  markDone: (key: string) => void;
  goTo: (step: number) => void;
  award: (key: string, correct: boolean, clean?: boolean) => void;
  setCheckedKey: (key: string) => void;
  setRunVerdicts: React.Dispatch<React.SetStateAction<Record<string, RunVerdict>>>;
  setGameRuns: React.Dispatch<React.SetStateAction<Record<string, RunResult>>>;
  setMessage: (text: string) => void;
  setCelebrate: React.Dispatch<React.SetStateAction<number>>;
  saveCompletion: () => Promise<void> | void;
}) {
  /** Kết quả chạy gần nhất của màn sandbox (không lưu vào bản nháp). */
  const [result, setResult] = useState<RunResult | null>(null);
  /**
   * Mã đã thật sự gửi vào worker ở lượt chạy gần nhất — XUẤT XỨ của `result`.
   *
   * Đi CẶP với `result` và chỉ được đặt cùng lúc với nó: thiếu nó thì không ai
   * trả lời được câu "output đang nhìn thuộc bản code nào?" (xem
   * lib/run-freshness.ts). Không lưu vào bản nháp — nó nói về một lượt chạy
   * trong phiên này, mà `result` cũng không được lưu.
   */
  const [ranCode, setRanCode] = useState<string | null>(null);
  // Nạp sẵn runtime NGAY khi mở màn, không chờ API trả nội dung — xem
  // shouldPrewarm() để biết vì sao chờ là mất không 1,0–1,5 s mỗi lần mở bài.
  const runner = useCodeRunner({
    enabled: shouldPrewarm(lesson),
    packages: lesson?.step_4?.packages,
  });
  const { running, runtimeStatus } = runner;

  /**
   * Chạy `code` với bộ test của bài rồi gọi onDone. Dùng chung cho sandbox và
   * các game chạy code. Bấm Dừng thì onDone KHÔNG được gọi — giữ đúng nếp cũ
   * là không hiện kết quả nào cho lượt bị bỏ.
   */
  function execute(
    code: string,
    onDone: (data: RunResult) => void,
    ghi?: { submit: boolean; screenKey?: string },
  ) {
    const four = lesson?.step_4;
    if (!four) return;
    setMessage('');
    void runner
      .run({
        code,
        tests: four.tests ?? [],
        forbid: four.forbid ?? [],
        files: four.files ?? [],
        // Hợp đồng với worker có trường `stdin` (các dòng input() đọc lần
        // lượt). Chưa có UI để học viên tự nhập ở lượt này; khi thêm ô "dữ
        // liệu vào" thì truyền mảng dòng vào đúng chỗ này.
        stdin: [],
        packages: four.packages ?? [],
        // Hợp đồng gọi của bài tập dạng dữ liệu. Phải đi cùng lượt chạy: bộ
        // chấm cần nó TRƯỚC cả lần chạy chính, vì bài `mode: "script"` có đề
        // cấp sẵn một biến mà mã học viên không gán ở đâu cả.
        contract: four.contract,
      })
      .then((data) => {
        // GHI NHẬT KÝ LẦN THỬ — đặt ở đây vì đây là chỗ DUY NHẤT có đủ thông
        // tin: mã người học, ca nào trượt, exception, và thời gian worker đo.
        //
        // `data === null` nghĩa là lượt chạy BỊ BỎ (bấm Dừng / rời trang). Ghi
        // nó bằng `ghiBamDung` chứ không bằng một lượt trượt: người học không
        // nhận được chẩn đoán nào, nên nó không phải một lần thử.
        //
        // `ghi` chỉ được truyền cho màn sandbox. Game chạy code (parsons/debug)
        // KHÔNG ghi: ca chấm của chúng là ca của bài, nhưng "mã" lại là các dòng
        // người học xếp — trộn vào cùng một loại sự kiện thì `editsSinceLastRun`
        // và "trượt y hệt" đếm hai thứ khác nhau vào một chỗ. Khoá pe-da đang
        // xuất bản không có game nào, nên hôm nay nhánh này không mất gì.
        if (ghi) {
          if (!data) ghiBamDung(ghi.screenKey);
          else
            ghiLuotChay(
              {
                submit: ghi.submit,
                code,
                tests: data.tests ?? [],
                total: four.tests?.length ?? 0,
                error: data.error,
                machineMs: data.duration,
              },
              ghi.screenKey,
            );
        }
        if (data) onDone(data);
      });
  }

  function passedAll(data: RunResult): boolean {
    const total = lesson?.step_4?.tests?.length ?? 0;
    return (
      !data.error &&
      total > 0 &&
      data.tests.length === total &&
      data.tests.every((t: TestResult) => t.passed)
    );
  }

  function run(submit: boolean) {
    if (running || busy) return;
    if (!lesson?.step_4) return;
    const sandboxAt = screens.findIndex((x) => x.kind === 'sandbox');
    const blocked = screens
      .slice(0, sandboxAt < 0 ? 0 : sandboxAt)
      .some((x) => isGraded(x.kind) && !draft.done[x.key]);
    if (submit && blocked) {
      setMessage('Hãy hoàn thành các màn học phía trước trước khi nộp bài.');
      return;
    }
    setResult(null);
    // Cửa tự kiểm tra chỉ mở lời giải sau lần NỘP đầu, đạt hay chưa đạt.
    if (submit && !draft.submitted) update({ submitted: true });
    const sandboxKey = screens[sandboxAt < 0 ? 0 : sandboxAt]?.key;
    // Chụp lại mã NGAY LÚC GỬI, không đọc `draft.code` trong callback: người
    // học gõ tiếp trong lúc worker đang chạy là chuyện thường, và lúc đó
    // `draft.code` đã là bản khác hẳn bản worker nhận — ghi nó làm xuất xứ thì
    // một kết quả CŨ lại được đóng dấu "của bản đang gõ".
    const maDaGui = draft.code;
    execute(maDaGui, (data) => {
      setResult(data);
      setRanCode(maDaGui);
      // Chỉ lượt NỘP mới ghi nhận: chạy thử đạt hết vẫn phải bấm nộp thì tiến
      // độ mới được lưu, nếu không học viên tưởng xong mà backend không biết.
      if (submit && passedAll(data)) {
        markDone('s4-sandbox');
        if (scored) setCelebrate((n) => n + 1);
        void saveCompletion();
        // Nộp đạt là xong phần thực hành: đưa thẳng sang màn tổng kết để bấm
        // tiếp sang bài sau, không bắt bấm thêm "Tiếp tục".
        const recapAt = screens.findIndex((x) => x.kind === 'recap');
        if (recapAt >= 0) goTo(recapAt + 1);
      }
    }, { submit, screenKey: sandboxKey });
  }

  /** Mã đang chấm của game chạy code. */
  function gameCode(g: PlayGame): string {
    const st = draft.games?.[g.id] ?? {};
    if (g.type === 'parsons') return parsonsCode(g, st.picked ?? []);
    if (g.type === 'debug') return st.code ?? g.code;
    return '';
  }

  /** "Kiểm tra" ở game chạy code: chạy thật, đạt hết test mới tính đúng. */
  function runGame(key: string, g: PlayGame, grade: boolean) {
    if (running || busy) return;
    setGameRuns((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    execute(gameCode(g), (data) => {
      setGameRuns((prev) => ({ ...prev, [key]: data }));
      if (!grade) return;
      const correct = passedAll(data);
      const failed = data.tests.filter((t) => !t.passed);
      setRunVerdicts((prev) => ({
        ...prev,
        [key]: {
          correct,
          result: data,
          explain: correct
            ? `Chương trình chạy đúng — đạt cả ${data.tests.length} ca kiểm thử.`
            : data.error
              ? `Python báo lỗi khi chạy: ${data.error.trim().split('\n').slice(-1)[0]}`
              : `Trượt ${failed.length}/${data.tests.length} ca: ${failed
                  .slice(0, 2)
                  .map((t) => t.name)
                  .join('; ')}.`,
        },
      }));
      setCheckedKey(key);
      award(key, correct);
      if (correct) {
        markDone(key);
        setCelebrate((n) => n + 1);
      }
    });
  }

  return {
    running,
    runtimeStatus,
    result,
    ranCode,
    run,
    runGame,
    cancel: runner.cancel,
  };
}
