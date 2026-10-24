/**
 * Chạy mã của /ide bằng Pyodide trong trình duyệt, thay đường
 * POST /api/python/run → container Docker ở backend.
 *
 * VÌ SAO CÓ FILE NÀY: sản phẩm đang có HAI đường chạy mã ngược nhau — trang bài
 * học chạy Pyodide ở client, /ide gửi lên máy chủ — và hai đường còn chạy hai
 * Python khác nhau (ảnh sandbox là python:3.12-slim, bài học là 3.14.2). Cố vấn
 * dự án cũng đã chốt: đừng chạy mã học viên ở backend. Máy chạy hiện tại còn
 * chỉ phục vụ ĐÚNG HAI lượt song song, trong khi ở client là bằng số máy học
 * viên.
 *
 * ĐANG SAU MỘT CỜ, mặc định vẫn là máy chủ. Đổi ý thì tắt cờ, không phải revert.
 * Xem `ideRunnerMode()` bên dưới.
 *
 * ĐIỀU KIỆN CHẶN ĐƯỜNG trước khi bật mặc định cho mọi người — ghi ở đây vì đây
 * là chỗ người ta sẽ đọc khi định bật: `/ide` ĐÃ CÓ đường chia sẻ link
 * (`ide-handoff.ts` nhét mã vào `/ide#code=…`, và `TryItButton` dựng nó thành
 * một <a> thật trên trang bài học). Hôm nay vô hại vì mã chạy trong Docker. Khi
 * mã chạy Pyodide CÙNG ORIGIN với phiên của người xem, cái link đó thành đường
 * một cú bấm từ mã của người này vào ngữ cảnh JS của người kia — đúng lớp lỗ
 * hổng đã có 4 CVE 8,3–9,9 (thoát sandbox Pyodide qua ctypes → export
 * Emscripten). Lớp phòng đúng là ORIGIN (iframe sandbox ở domain khác), không
 * phải chặn `ctypes`. Đừng bật mặc định trước khi quyết xong chuyện đó.
 *
 * File này KHÔNG import gì theo alias '@/…' và không có JSX, nên bộ test chạy
 * bằng `node --test` thuần import trực tiếp được — cùng tiền lệ với
 * src/lib/editor-load-gate.ts. Vì vậy mọi phần LOGIC THUẦN của /ide (kể cả
 * phần tự lưu mã ở cuối file) sống ở đây chứ không rải trong IdeClient.tsx:
 * logic nằm trong component là logic không có test.
 */

export type IdeRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
  durationMs: number;
  queuedMs?: number;
  /**
   * AI đã cắt lần chạy này. Chỉ đường client đặt trường này:
   *  · 'timeout' — hết TIMEOUT_MS, hệ thống tự cắt;
   *  · 'user'    — người học bấm "■ Dừng".
   * Bỏ trống = không bị cắt, hoặc là kết quả từ đường MÁY CHỦ (backend không
   * biết trường này). Nhờ vậy giao diện nói đúng câu cho đúng nguồn cắt mà
   * KHÔNG phải đổi gì ở nhánh máy chủ — xem `CutNotice` trong IdeClient.tsx.
   *
   * `timedOut` vẫn đặt true cho CẢ HAI: nó mang nghĩa "không chạy xong", và
   * phần giao diện cũ dựa vào nó để thôi hiện mã thoát (cắt kiểu này thì không
   * có mã thoát nào cả).
   */
  cutBy?: 'timeout' | 'user';
};

/** Lỗi HẠ TẦNG (không nạp được runtime) — khác lỗi trong chương trình của người học. */
export class IdeRunnerError extends Error {}

const WORKER_URL = '/static/js/ide.worker.js';

/**
 * Giới hạn thời gian. Dài hơn 10 s của Docker vì ở client không ai trả tiền CPU
 * ngoài chính máy học viên, và cái giá của việc cắt nhầm cũng khác: nạp lại là
 * 13 MB runtime chứ không phải một container.
 *
 * Worker KHÔNG tự cắt được: `runPythonAsync` chặn luôn vòng lặp sự kiện nên
 * worker không nghe được thông điệp nào trong lúc chạy. Cắt phải đến TỪ ĐÂY.
 *
 * Xuất ra ngoài vì giao diện phải nói đúng con số này cho người học ("đã dừng
 * sau 15 giây"). Hai chỗ ghi hai số khác nhau là lời nói dối khó phát hiện.
 */
export const IDE_RUN_TIMEOUT_MS = 15_000;

/**
 * Bắt đầu hiện ĐẾM NGƯỢC khi chỉ còn bấy nhiêu thời gian.
 *
 * VÌ SAO CÓ ĐẾM NGƯỢC: trước bản này, người học viết `while True:` rồi ngồi
 * nhìn chữ "Đang chạy…" 15 giây, và việc bị cắt đến như một cú giật. Đếm ngược
 * làm việc bị cắt thành chuyện BIẾT TRƯỚC. Chỉ 5 giây cuối, không phải cả 15:
 * đếm ngược từ đầu thì mọi lần chạy bình thường (dưới 1 s) cũng bị nhuộm màu
 * hồi hộp vô cớ.
 */
export const IDE_COUNTDOWN_FROM_MS = 5_000;

/**
 * Số giây còn lại ĐỂ HIỆN, hay null nghĩa là chưa đến lúc nói gì.
 *
 * `ceil` chứ không `round`/`floor`: còn 300 ms thì phải hiện "1 s" chứ không
 * phải "0 s" — hiện 0 trong khi chương trình còn chạy là nói sai, và người đọc
 * sẽ tưởng giao diện treo. Quá giờ thì kẹp về 0, không bao giờ âm.
 */
export function countdownSeconds(elapsedMs: number, timeoutMs = IDE_RUN_TIMEOUT_MS): number | null {
  // Đồng hồ cho ra số rác (NaN vì chưa có mốc, âm vì mốc lấy sai) thì KHÔNG
  // đoán: thà không hiện đếm ngược còn hơn hiện một con số sai rồi cắt sớm.
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return null;
  const conLai = timeoutMs - elapsedMs;
  if (conLai > IDE_COUNTDOWN_FROM_MS) return null;
  return Math.max(0, Math.ceil(conLai / 1000));
}

/** `?runner=client|server` ghi đè cờ build — để thử trên trang thật mà không deploy lại. */
export function ideRunnerMode(): 'client' | 'server' {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('runner');
    if (q === 'client' || q === 'server') return q;
  }
  return process.env.NEXT_PUBLIC_IDE_RUNNER === 'client' ? 'client' : 'server';
}

let worker: Worker | null = null;

function spawn(): Worker {
  // `type: 'module'` BẮT BUỘC: Pyodide 314 bỏ hỗ trợ classic worker và không
  // còn phát hành `pyodide.js`, nên worker nạp runtime bằng `await import(...)`.
  const w = new Worker(WORKER_URL, { type: 'module' });
  worker = w;
  return w;
}

/**
 * MỘT worker cho cả nút Chạy lẫn nút "Xem từng bước".
 *
 * Hai module từng giữ mỗi bên một worker, và soi DevTools thấy ngay cái giá:
 * `pyodide.asm.wasm` 9,2 MB bị tải HAI lần và hai runtime cùng nằm trong bộ nhớ
 * máy học viên. `ide.worker.js` vốn đã nhận cả `{type:'run'}` lẫn
 * `{type:'trace'}`, nên dùng chung là đủ.
 *
 * Hệ quả phải biết: `terminate()` ở một đường giết luôn đường kia. Chấp nhận
 * được vì hai nút không bao giờ chạy cùng lúc (bấm cái này thì cái kia bị khoá),
 * và ai gọi `disposeIdeRunner()` cũng đang rời trang.
 */
export function sharedIdeWorker(): Worker {
  return worker ?? spawn();
}

/** Worker đã chết (bị terminate từ đường khác) thì lần sau tạo bản mới. */
export function dropIdeWorker(): void {
  worker = null;
}

/** Nạp sẵn runtime lúc người học còn đang gõ, để lần bấm Chạy đầu không phải chờ 13 MB. */
export function warmIdeRunner(): void {
  if (ideRunnerMode() !== 'client' || worker) return;
  try {
    spawn().postMessage({ type: 'warmup' });
  } catch {
    // Trình duyệt không cho tạo worker (CSP, tắt JS module worker): im lặng ở
    // đây, lần bấm Chạy sẽ báo lỗi tử tế thay vì làm hỏng lúc mở trang.
    worker = null;
  }
}

/**
 * Cách cắt lần chạy ĐANG treo, do `runInBrowser` cài vào mỗi lần chạy.
 *
 * Vì sao là một biến ở tầm module chứ không phải tham số `AbortSignal`: chỉ có
 * MỘT worker và do đó chỉ có MỘT lần chạy tại một thời điểm (xem `worker` ở
 * trên), còn phía React thì cần bấm Dừng từ một chỗ hoàn toàn khác với chỗ
 * `await` kết quả. null = không có gì để dừng.
 */
let dungLanChay: (() => void) | null = null;

/**
 * Người học bấm "■ Dừng". Trả về false khi không có lần chạy nào để dừng (cú
 * bấm muộn, sau khi chương trình vừa tự xong) — chỗ gọi không cần làm gì.
 *
 * Lần chạy bị dừng KHÔNG reject: nó resolve với `cutBy: 'user'`, vì "tôi dừng
 * nó" là một kết cục bình thường chứ không phải lỗi hạ tầng.
 */
export function stopInBrowser(): boolean {
  const dung = dungLanChay;
  if (!dung) return false;
  dung();
  return true;
}

export function disposeIdeRunner(): void {
  worker?.terminate();
  worker = null;
  // Worker đã chết thì cái móc dừng kia chỉ còn trỏ vào một lần chạy không bao
  // giờ trả lời nữa — bỏ luôn, đừng để cú bấm Dừng sau đó chạy vào đó.
  dungLanChay = null;
}

export function runInBrowser(code: string): Promise<IdeRunResult> {
  return new Promise((resolve, reject) => {
    let w: Worker;
    try {
      w = worker ?? spawn();
    } catch (error) {
      reject(new IdeRunnerError(`Không tạo được worker: ${String(error)}`));
      return;
    }

    const t0 = Date.now();
    let xong = false;
    const het = (fn: () => void) => {
      if (xong) return;
      xong = true;
      clearTimeout(hen);
      dungLanChay = null;
      w.onmessage = null;
      w.onerror = null;
      fn();
    };

    /**
     * Cắt lần chạy đang treo. HẾT GIỜ và NÚT DỪNG đi chung đúng một đường: cả
     * hai đều là `terminate()` từ bên ngoài, chỉ khác ai bấm — nên khác nhau
     * đúng một trường `cutBy`. Tách thành hai nhánh code là mời một trong hai
     * nhánh quên mất bước nạp lại worker.
     */
    const cat = (cutBy: 'timeout' | 'user') =>
      het(() => {
        // Cắt từ bên ngoài là cách DUY NHẤT: worker đang bị chặn. Mất sạch
        // namespace và MEMFS của lần chạy — nhưng mã trong trình soạn thảo thì
        // KHÔNG mất, vì Monaco sống ở main thread. Nói rõ điều đó với người học.
        w.terminate();
        worker = null;
        // Nạp sẵn worker thay thế ở nền để lần bấm Chạy sau không phải chờ lại.
        warmIdeRunner();
        resolve({
          stdout: '',
          stderr: '',
          exitCode: null,
          timedOut: true,
          cutBy,
          outputTruncated: false,
          durationMs: Date.now() - t0,
          queuedMs: 0,
        });
      });

    const hen = setTimeout(() => cat('timeout'), IDE_RUN_TIMEOUT_MS);
    dungLanChay = () => cat('user');

    w.onmessage = ({ data }) => {
      if (!data) return;
      if (data.type === 'result') {
        het(() => {
          const kq = data.result as IdeRunResult;
          // HẾT BỘ NHỚ: runtime SỐNG SÓT (Pyodide 314 không bật
          // ABORTING_MALLOC, malloc hỏng thì ném ngoại lệ chứ không abort), nên
          // nhìn qua thì chẳng có gì phải làm. Nhưng đo được: heap chỉ đi lên —
          // 618 MiB rồi 836 MiB trong CÙNG một worker — và `gc.collect()` không
          // trả lại một byte nào. Giữ worker đó lại nghĩa là mọi lần chạy sau
          // trong buổi học đều kéo theo ~0,8 GiB. `terminate()` thì thu hồi
          // thật (đo 10 vòng: vòng nào cũng khởi động lại ở đúng 30 MiB).
          //
          // Phải bắt CẢ HAI tên: wasm32 có PY_SSIZE_T_MAX = 2**31-1 nên
          // `bytearray(2**31)` ném OverflowError chứ không phải MemoryError.
          if (/\b(MemoryError|OverflowError: cannot fit)\b/.test(kq.stderr)) {
            w.terminate();
            worker = null;
            warmIdeRunner(); // nạp sẵn bản sạch ở nền, đừng bắt họ chờ lần sau
          }
          resolve(kq);
        });
      }
      else if (data.type === 'fatal') {
        het(() => {
          w.terminate();
          worker = null;
          reject(new IdeRunnerError(String(data.message)));
        });
      }
      // 'ready' của warmup: bỏ qua, không phải kết quả của lần chạy nào.
      // 'trace' của "Xem từng bước" có vòng đời riêng trong src/lib/ide-trace.ts.
    };
    w.onerror = (event) => {
      het(() => {
        w.terminate();
        worker = null;
        reject(new IdeRunnerError(event.message || 'worker dừng đột ngột'));
      });
    };

    w.postMessage({ type: 'run', code });
  });
}

// --- TỰ LƯU MÃ ĐANG SOẠN -----------------------------------------------------
//
// VÌ SAO Ở ĐÂY, chung file với bộ chạy: đây là NỬA CÒN LẠI của câu "mã trong
// trình soạn thảo vẫn còn nguyên" mà thông báo bị-cắt ở trên hứa với người học.
// `terminate()` không đụng tới Monaco, nhưng một lần F5 — hoặc mạng rớt giữa
// buổi — thì vẫn mất trắng, và lúc đó câu hứa kia thành nửa vời. Mẫu chép từ
// Basthon: lưu "mã vừa gõ" vào localStorage, sống qua tải lại trang và qua mất
// mạng.
//
// Và vì sao KHÔNG nằm trong IdeClient.tsx: bộ test chạy `node --test` không bóc
// được JSX, nên logic đặt trong component là logic không ai chặn hồi quy được.
// Thứ tự "`#code=` thắng bản tự lưu" dưới đây đúng là loại luật phải có test:
// đảo nó thì người học bấm "Thử ngay trong IDE" từ trang bài học sẽ thấy mã CŨ
// CỦA HỌ thay vì mã của bài, và không có gì đỏ lên để báo.
//
// Tách sang src/lib/ide-autosave.ts riêng thì cũng được; chưa làm vì đang sửa
// song song nhiều file ở /ide, thêm file mới chỉ để đổi chỗ 50 dòng là tạo
// xung đột không đổi lấy gì.

/** Khoá localStorage. Đổi tên khoá = mọi người mất bản tự lưu đang có. */
export const IDE_AUTOSAVE_KEY = 'pe_ide_code';

/**
 * Chờ bấy nhiêu ms không gõ gì mới ghi.
 *
 * Ghi mỗi phím là một lượt `setItem` ĐỒNG BỘ trên main thread cho mỗi ký tự —
 * với file vài nghìn ký tự thì đó là tuần tự hoá lại cả bài sau mỗi lần nhấn.
 * 800 ms: đủ ngắn để một lần F5 ngoài ý muốn gần như không mất gì, đủ dài để
 * một câu gõ liền mạch chỉ tốn một lượt ghi.
 */
export const IDE_AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * Trần ký tự được tự lưu.
 *
 * localStorage là hạn mức CHUNG cho cả origin (~5 MB) và `setItem` ném khi
 * vượt. Dán một file 3 MB vào editor không được phép ăn hết chỗ của mọi thứ
 * khác trên trang. 100 nghìn ký tự ≈ 60 lần mã dài nhất trong giáo trình.
 */
export const MAX_IDE_AUTOSAVE_CHARS = 100_000;

/** Chỉ ba hàm của Storage được dùng — khai hẹp để test tiêm được kho giả. */
type KhoDonGian = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function khoCucBo(): KhoDonGian | null {
  try {
    // CHÍNH VIỆC ĐỌC `localStorage` cũng ném được, không chỉ getItem/setItem:
    // Chrome ném SecurityError khi người dùng chặn "site data" cho site này,
    // và trong iframe không cùng origin thì truy cập thuộc tính này là lỗi.
    // Vì vậy try/catch bọc cả phép đọc, không phải chỉ bọc lời gọi.
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Không có kho thì /ide vẫn phải chạy đúng, chỉ là không nhớ gì.
    return null;
  }
}

/** Đọc bản tự lưu. null = không có / không đọc được / dài quá trần. */
export function loadIdeCode(kho: KhoDonGian | null = khoCucBo()): string | null {
  try {
    const text = kho?.getItem(IDE_AUTOSAVE_KEY);
    // Dài quá trần nghĩa là bản này do một bản code khác (hoặc một tab khác)
    // ghi với luật khác — không tin, trả null để rơi về ví dụ mặc định.
    if (!text || text.length > MAX_IDE_AUTOSAVE_CHARS) return null;
    return text;
  } catch {
    // Quota, chế độ riêng tư, site data bị chặn: coi như chưa từng lưu.
    return null;
  }
}

/** Ghi bản tự lưu. Không bao giờ ném — mất bản lưu không được làm sập trang. */
export function saveIdeCode(code: string, kho: KhoDonGian | null = khoCucBo()): void {
  try {
    if (code.length > MAX_IDE_AUTOSAVE_CHARS) {
      // XOÁ chứ không chỉ bỏ qua: giữ bản cũ ngắn hơn thì lần mở sau sẽ "khôi
      // phục" một đoạn mã KHÔNG phải thứ người ta đang có trên màn hình.
      kho?.removeItem(IDE_AUTOSAVE_KEY);
      return;
    }
    kho?.setItem(IDE_AUTOSAVE_KEY, code);
  } catch {
    // Hết quota hoặc kho bị chặn: im lặng. Người học không làm gì sai, và
    // không có gì họ làm được với thông báo này.
  }
}

/** Bỏ bản tự lưu (người học chọn "Dùng ví dụ mặc định"). */
export function clearIdeCode(kho: KhoDonGian | null = khoCucBo()): void {
  try {
    kho?.removeItem(IDE_AUTOSAVE_KEY);
  } catch {
    // Xoá không được thì cũng chẳng còn cách nào khác; đừng làm sập trang.
  }
}

/** Mã mở ra đến từ đâu — quyết định có nói "đã khôi phục" hay không. */
export type IdeCodeSource = 'hash' | 'autosave' | 'default';

/**
 * Chọn đoạn mã /ide mở ra, theo thứ tự ưu tiên CỐ ĐỊNH.
 *
 * `#code=` THẮNG bản tự lưu. Vì sao đây là luật quan trọng nhất của hàm này:
 * người học bấm "Thử ngay trong IDE" trên trang bài học là đang nói "cho tôi
 * xem mã CỦA BÀI NÀY". Nếu bản tự lưu thắng, họ mở link và thấy đoạn mã cũ của
 * chính mình — đúng thứ họ không yêu cầu — mà chẳng có dấu hiệu nào cho biết
 * link đã bị bỏ qua. Nút đó là đường đi chính từ giáo trình sang IDE, nên hỏng
 * ở đây là hỏng chỗ dễ thấy nhất.
 *
 * Bản tự lưu TRÙNG ví dụ mặc định thì tính là 'default': người mở /ide lần đầu
 * cũng được lưu ngay ví dụ mặc định, và báo "đã khôi phục mã của bạn" cho đoạn
 * mã họ chưa hề gõ là nói sai.
 */
/**
 * Mã đến từ một ĐƯỜNG LINK có phải hỏi người mở trước khi chạy không.
 *
 * `/ide#code=…` là link chia sẻ được: `ide-handoff.ts` mã hoá mã vào fragment,
 * `TryItButton` trên trang bài học dựng nó thành một `<a>` thật, và chú thích
 * của chính file ấy ghi rằng copy-dán hay mở lại đều ra đúng đoạn mã.
 *
 * Chừng nào mã còn chạy trong container ở máy chủ thì điều đó vô hại — trình
 * duyệt người mở không bao giờ thực thi nó. Khi mã chạy bằng Pyodide CÙNG
 * ORIGIN thì khác hẳn: thoát sandbox Pyodide là chuyện đã có thật (4 CVE,
 * CVSS 8,3–9,9, đi qua `ctypes` tới bảng export của Emscripten), và chỗ nó đáp
 * xuống là JS cùng origin với phiên của người đang xem. Gửi một link, người kia
 * bấm Chạy, thế là xong — nếu không có gì chen vào giữa.
 *
 * Lớp phòng ĐÚNG là tách ORIGIN (chạy trong iframe sandbox ở domain khác). Hàm
 * này KHÔNG thay thế việc đó; nó chỉ cắt chuỗi "một cú bấm" bằng một lần hỏi,
 * và chỉ hỏi đúng ca đáng hỏi: mã từ link, chạy ở client. Mã người học tự gõ
 * hoặc khôi phục từ máy họ thì không hỏi gì.
 */
export function needsLinkConfirm(
  source: IdeCodeSource,
  mode: 'client' | 'server',
): boolean {
  return source === 'hash' && mode === 'client';
}

export function pickIdeOpeningCode(nguon: {
  hashCode: string | null | undefined;
  savedCode: string | null | undefined;
  defaultCode: string;
}): { code: string; source: IdeCodeSource } {
  const tuLink = nguon.hashCode;
  if (tuLink && tuLink.trim()) return { code: tuLink, source: 'hash' };

  const daLuu = nguon.savedCode;
  if (daLuu && daLuu.trim() && daLuu !== nguon.defaultCode) {
    return { code: daLuu, source: 'autosave' };
  }

  return { code: nguon.defaultCode, source: 'default' };
}
