// ĐỀ ÔN CHẤM Ở MÁY CHỦ — luật của đường đi, dưới dạng hàm thuần.
//
// VÌ SAO CÓ FILE NÀY. `src/quizzes/quizzes.controller.ts` có 11 route đang
// chạy và cho tới hôm nay KHÔNG trang nào gọi route nào (grep `frontend/src`:
// 0 lời gọi). Ba file JS di sản Django biết gọi, nhưng không `page.tsx` nào nạp
// chúng — thứ duy nhất còn sống của đường cũ là `edu-review-quiz.css`, tức mọi
// trang khoá học đang tải style cho một hộp thoại không bao giờ mở. Đây là lần
// thứ chín của cùng một hình dạng lỗi trong repo này (tracer không bài nào tới,
// nút "Try it Yourself" không màn nào mount, 13 màn tối…), và là lần đắt nhất:
// đó là đường chấm DUY NHẤT mà client không giả mạo được — `submitQuiz` chấm
// theo SNAPSHOT trong DB, `stripAnswers` không gửi `correct`/`explanation` ra
// ngoài, mỗi đề chỉ nộp được một lần.
//
// Luật nằm ở ĐÂY chứ không trong component vì logic trong component là logic
// không có test. Và không được import bất cứ `.tsx` nào: `node --test` nạp
// thẳng file `.ts` này (xem cta.ts — nó import một `.tsx` nên nhánh nút chính
// chỉ canh được bằng phép đọc cây mã).

/**
 * Trần/sàn số câu mỗi đề, CHÉP từ `SAMPLE_MIN`/`SAMPLE_MAX` của
 * `src/quizzes/quizzes.service.ts`.
 *
 * Chép chứ không nhập được (hai cây mã, hai bộ chạy test), nên nó SẼ TRÔI —
 * và trôi im lặng: nhãn nút hứa "10 câu" trong khi server phát 8 thì không có
 * gì đỏ, chỉ có người học đếm lại. `review-quiz.test.mjs` đọc CẢ HAI cây mã và
 * bắt hai con số phải khớp, cùng khuôn `tracer-web-sync` / `insert-gate-sync`.
 */
export const DE_MIN = 5;
export const DE_MAX = 10;

/** Trạng thái "mở được đề ôn chưa" — `GET /api/courses/:id/quiz/status`. */
export type TrangThaiDeOn = {
  /** Số bài đã hoàn thành trong khoá. */
  soBaiXong: number;
  /** Số bài THỰC SỰ góp được câu hỏi (≤ soBaiXong). */
  soBaiCoCau: number;
  /** Tổng số câu rút được từ những bài đó. */
  soCau: number;
  /** Ngưỡng `MIN_POOL` của máy chủ, tính theo CÂU. */
  nguong: number;
  /** Chính máy chủ nói: lần bấm tới có ra được đề không. */
  moDuoc: boolean;
};

/** Một câu trong đề, ĐÃ bị `stripAnswers` bỏ đáp án. */
export type CauHoiDeOn = {
  index: number;
  question: string;
  options: string[];
};

export type DeOn = {
  quizId: number;
  cauHoi: CauHoiDeOn[];
};

/** Một dòng trong `detail` của lượt nộp — đã chấm, nên có cả đáp án. */
export type ChiTietCham = {
  question: string;
  given: unknown;
  correct: number | string;
  dung: boolean;
  giaiThich: string | null;
};

export type KetQuaCham = {
  diem: number;
  tong: number;
  chiTiet: ChiTietCham[];
};

function soNguyen(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? Math.trunc(x) : null;
}

function banGhi(x: unknown): Record<string, unknown> | null {
  return typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : null;
}

/**
 * Đọc response trạng thái. Trả `null` khi hình dạng không dùng được, thay vì
 * dựng một đối tượng toàn số 0 — số 0 bịa ra sẽ hiện thành câu "cần hoàn thành
 * thêm bài học" cho một người đã học 50 bài, tức nền tảng nói sai về chính
 * tiến độ của họ.
 */
export function docTrangThai(raw: unknown): TrangThaiDeOn | null {
  const x = banGhi(raw);
  if (!x) return null;
  const soCau = soNguyen(x.questions_available);
  const nguong = soNguyen(x.min_questions);
  if (soCau === null || nguong === null) return null;
  return {
    soBaiXong: soNguyen(x.lessons_completed) ?? 0,
    soBaiCoCau: soNguyen(x.lessons_counted) ?? 0,
    soCau,
    nguong,
    // Quyết định là CỦA MÁY CHỦ khi nó nói; `soCau >= nguong` chỉ là đường lùi
    // cho bản backend cũ hơn. Tự tính rồi bỏ qua `can_quiz` là dựng ra hai sự
    // thật về cùng một chuyện.
    moDuoc: typeof x.can_quiz === 'boolean' ? x.can_quiz : soCau >= nguong,
  };
}

/**
 * CÒN THIẾU MẤY BÀI, không phải mấy câu.
 *
 * Đây là chỗ dễ nói sai nhất của cả đường đi: `MIN_POOL = 5` đếm theo CÂU, mà
 * mỗi bài của khoá 172 bài chỉ có 3 câu — nên "cần 5 câu" nghĩa là "cần xong 2
 * bài". Hiện nguyên câu của backend ("Chưa đủ câu hỏi để tạo quiz, hãy hoàn
 * thành thêm bài học") là để người học tự suy ra con số đó, và họ sẽ suy ra 1.
 *
 * Số câu mỗi bài tính từ DỮ LIỆU THẬT của chính họ (`soCau / soBaiCoCau`), chứ
 * không ghi cứng 3: bài không có trắc nghiệm vẫn tồn tại, và một hằng số 3 ở
 * đây sẽ nói sai đúng vào lúc đó mà không có gì đỏ.
 *
 * `null` = KHÔNG ĐO ĐƯỢC (chưa bài nào góp câu), khác hẳn 0 = đã đủ. Gộp hai
 * thứ đó là hiện "còn thiếu 0 bài" cho người chưa học gì.
 */
export function soBaiConThieu(tt: TrangThaiDeOn): number | null {
  if (tt.soCau >= tt.nguong) return 0;
  if (tt.soBaiCoCau <= 0 || tt.soCau <= 0) return null;
  const moiBai = tt.soCau / tt.soBaiCoCau;
  return Math.max(1, Math.ceil((tt.nguong - tt.soCau) / moiBai));
}

/**
 * Số câu của đề sắp phát — mô phỏng `sampleSize()` ở máy chủ: kẹp cỡ pool vào
 * [DE_MIN, DE_MAX]. Dùng cho nhãn nút, để người học biết mình sắp làm bao
 * nhiêu câu TRƯỚC khi bấm.
 */
export function soCauTrongDe(soCau: number): number {
  return Math.min(DE_MAX, Math.max(DE_MIN, Math.min(soCau, DE_MAX)));
}

/**
 * Câu nói ra ở ô đề ôn. Một hàm, hai nhánh, để nhánh "chưa mở" không bao giờ
 * là một ô trống hay một câu lỗi trần.
 */
export function cauCuaCong(tt: TrangThaiDeOn): string {
  if (tt.moDuoc) {
    return (
      `Đề ${soCauTrongDe(tt.soCau)} câu, chấm ở máy chủ, rút từ ${tt.soBaiCoCau} bài ` +
      `bạn đã hoàn thành (${tt.soCau} câu trong kho). Mỗi đề chỉ nộp được một lần.`
    );
  }
  const thieu = soBaiConThieu(tt);
  if (thieu === null) {
    return (
      'Các bài bạn đã hoàn thành chưa có câu trắc nghiệm nào để ra đề. ' +
      'Học thêm một bài có phần trắc nghiệm rồi quay lại đây.'
    );
  }
  if (thieu === 0) {
    // MÁY CHỦ nói chưa mở, trong khi số câu đã vượt ngưỡng nó tự báo. Suy ra
    // "hoàn thành thêm 0 bài nữa là mở được đề" là một câu TỰ PHỦ ĐỊNH — và nó
    // đã lọt vào bản đầu, ca "cổng tin can_quiz của MÁY CHỦ" bắt được. Nói
    // đúng phần biết: đủ câu, nhưng quyết định là của máy chủ.
    return (
      `Đã có ${tt.soCau} câu từ ${tt.soBaiCoCau} bài bạn học xong, nhưng máy chủ ` +
      'chưa mở đề ôn cho khoá này. Thử lại sau.'
    );
  }
  // NÓI CẢ HAI ĐƠN VỊ: ngưỡng của máy chủ tính theo câu, còn việc người học
  // phải làm thì tính theo bài. Nói một nửa là để họ tự suy ra nửa kia sai.
  return (
    `Đề ôn cần ít nhất ${tt.nguong} câu; ${tt.soBaiCoCau} bài bạn đã học mới cho ` +
    `${tt.soCau} câu. Hoàn thành thêm ${thieu} bài nữa là mở được đề.`
  );
}

/** Đọc response phát đề. `null` khi không có câu nào dùng được. */
export function docDe(raw: unknown): DeOn | null {
  const x = banGhi(raw);
  if (!x) return null;
  const quizId = soNguyen(x.quiz_id);
  if (quizId === null || !Array.isArray(x.questions)) return null;

  const cauHoi: CauHoiDeOn[] = [];
  for (const [i, item] of x.questions.entries()) {
    const q = banGhi(item);
    if (!q || typeof q.question !== 'string' || !Array.isArray(q.options)) continue;
    cauHoi.push({
      // `index` của máy chủ là THỨ TỰ trong snapshot, và `submitQuiz` chấm
      // `answers[i]` theo đúng chỉ số đó. Thiếu thì rơi về vị trí trong mảng —
      // nhưng không được đổi thứ tự hiển thị, nếu không là chấm lệch câu.
      index: soNguyen(q.index) ?? i,
      question: q.question,
      options: q.options.map((o) => String(o)),
    });
  }
  return cauHoi.length > 0 ? { quizId, cauHoi } : null;
}

/**
 * Mảng `answers` gửi lên. Phải ĐỦ ĐỘ DÀI và ĐÚNG THỨ TỰ: `submitQuiz` lấy
 * `answers[i]` cho câu thứ i của snapshot, nên một mảng nén (chỉ câu đã chọn)
 * là chấm lệch câu — im lặng, và theo chiều "sai nhưng vẫn ra điểm".
 *
 * Gửi CHỈ SỐ phương án (số), vì `normalizeQuestion` quy đáp án về vị trí.
 */
export function goiDapAn(chon: Array<number | null>, soCauHoi: number): Array<number | null> {
  const out: Array<number | null> = [];
  for (let i = 0; i < soCauHoi; i += 1) out.push(chon[i] ?? null);
  return out;
}

/** Đã chọn hết chưa — nút Nộp mở theo cái này. */
export function daChonHet(chon: Array<number | null>, soCauHoi: number): boolean {
  if (soCauHoi <= 0) return false;
  for (let i = 0; i < soCauHoi; i += 1) {
    if (typeof chon[i] !== 'number') return false;
  }
  return true;
}

/** Đọc response nộp bài. */
export function docKetQua(raw: unknown): KetQuaCham | null {
  const x = banGhi(raw);
  if (!x) return null;
  const diem = soNguyen(x.score);
  const tong = soNguyen(x.total);
  if (diem === null || tong === null) return null;

  const chiTiet: ChiTietCham[] = [];
  if (Array.isArray(x.detail)) {
    for (const item of x.detail) {
      const d = banGhi(item);
      if (!d) continue;
      chiTiet.push({
        question: typeof d.question === 'string' ? d.question : '',
        given: d.given ?? null,
        correct: (typeof d.correct === 'number' || typeof d.correct === 'string'
          ? d.correct
          : -1) as number | string,
        dung: d.is_correct === true,
        giaiThich: typeof d.explanation === 'string' ? d.explanation : null,
      });
    }
  }
  return { diem, tong, chiTiet };
}

/**
 * Vị trí phương án ĐÚNG trong danh sách phương án đang hiện.
 *
 * `correct` của snapshot là một SỐ với nội dung hiện tại (`normalizeQuestion`
 * quy về vị trí), nhưng hợp đồng của `isCorrect()` ở máy chủ là so bằng
 * `String()` không phân biệt hoa thường — nên một đề cũ có thể mang `correct`
 * là CHỮ của phương án. Chấp nhận cả hai, và `null` khi không khớp gì: thà
 * không tô phương án nào còn hơn tô sai một phương án rồi dạy ngược.
 */
export function viTriDung(correct: number | string, options: string[]): number | null {
  if (typeof correct === 'number') {
    return correct >= 0 && correct < options.length ? correct : null;
  }
  const can = correct.trim().toLowerCase();
  const i = options.findIndex((o) => o.trim().toLowerCase() === can);
  return i >= 0 ? i : null;
}

/**
 * Câu lỗi hiện cho người học, lấy từ body của backend.
 *
 * Bộ lọc lỗi ở gateway trả `{ error: { status, message, detail } }`; vài chỗ
 * khác trả `{ message }` thẳng. Không có câu nào thì phải tự dựng một câu CÓ
 * NGHĨA kèm mã HTTP — một ô lỗi trống là thứ duy nhất tệ hơn một câu lỗi khó
 * hiểu, vì nó không nói được là nên thử lại hay nên đi học bài khác.
 */
export function thongDiepLoi(body: unknown, status: number): string {
  const x = banGhi(body);
  const loi = banGhi(x?.error);
  const cau = (() => {
    if (typeof loi?.message === 'string' && loi.message.trim()) return loi.message;
    if (typeof x?.message === 'string' && x.message.trim()) return x.message;
    if (Array.isArray(x?.message) && typeof x.message[0] === 'string') return x.message[0];
    return '';
  })();
  if (cau) return cau;
  if (status === 409) return 'Đề này đã được nộp rồi.';
  if (status === 401 || status === 403) return 'Phiên học đã hết — tải lại trang rồi thử lại.';
  return `Không gọi được máy chủ (${status}). Thử lại sau một chút.`;
}

/**
 * Nhãn điểm. LUÔN kèm MẪU SỐ ("3/5", không bao giờ "60%") — cùng lý do mà
 * `generatePostTest` ghi trong chú thích của nó: ba câu của một bài sinh từ
 * MỘT gốc câu hỏi, nên một tỉ lệ phần trăm ở đây gợi ra một độ chính xác mà
 * cỡ mẫu này không có.
 */
export function nhanDiem(kq: KetQuaCham): string {
  return `${kq.diem}/${kq.tong} câu đúng`;
}

// --- ĐỀ ĐANG LÀM PHẢI SỐNG QUA LẦN TẢI LẠI -----------------------------------
//
// LỖI ĐANG SỬA. `quiz_id` chỉ sống trong state React, nên một lần F5 giữa lúc
// đang làm đề là MẤT ĐỀ: hàng `quizzes` trong DB kẹt ở `generated` VĨNH VIỄN
// (không ai nộp được nó nữa — `submitQuiz` đòi đúng id đó), và người học chỉ
// còn đường bấm phát một đề khác. Route `GET quizzes/:id` đã tồn tại từ Task
// 133 và trả đúng đề đã `stripAnswers`, nhưng `grep` trên `frontend/src` ra 0
// lời gọi — lần thứ CHÍN của hình dạng lỗi "dựng xong mà không có đường tới".
//
// BA QUYẾT ĐỊNH, và lý do:
//
// 1. CẤT Ở `localStorage` THEO KHOÁ HỌC, không trong bản nháp bài.
//    Bản nháp (`useLessonDraft`) có khoá `pe-studio-lesson-v1:<user>:<khoá>:<bài>`
//    — gắn với BÀI. Còn đề ôn gắn với KHOÁ: nó rút câu từ MỌI bài đã hoàn
//    thành (`buildQuestionPool`), và ô đề ôn được mount ở màn tổng kết của BẤT
//    KỲ bài nào. Cất vào nháp bài 12 thì mở lại bài 12 mới thấy đề, mà người
//    học vừa làm xong bài 13 thì màn tổng kết bài 13 lại phát một đề thứ hai —
//    hai đề cùng mở, một trong hai chắc chắn kẹt lại mãi.
//    Khoá KHÔNG mang `userId` (ô này không có nó trong tay, và thêm một lượt
//    API chỉ để lấy thì đắt hơn thứ nó mua): phép chặn theo chủ sở hữu nằm ở
//    MÁY CHỦ — `getQuiz` trả 404 cho quiz của người khác (không phải 403, để
//    không tiết lộ quiz đó tồn tại). Nên một id còn sót lại của tài khoản khách
//    cũ (hết hạn refresh ⇒ `ensureGuest()` cấp tài khoản MỚI) chỉ ra 404, và ô
//    này xoá nó đi rồi hiện cổng thường.
//
// 2. "ĐÃ NỘP" KHÁC "ĐANG LÀM", và trạng thái đó đọc từ MÁY CHỦ.
//    Nộp lần hai là 409 (`submitQuiz` dùng compare-and-set `generated ->
//    submitted`). Nếu khôi phục một đề ĐÃ NỘP thành "đang làm" thì người học
//    chọn lại đủ 10 câu, bấm Nộp, và nhận một câu lỗi — tức nền tảng mời họ
//    làm một việc nó biết trước là không được. `docDeKhoiPhuc` vì vậy đọc
//    `status` của response và KHÔNG BAO GIỜ trả nhánh `dangLam` cho một đề
//    `submitted`, kể cả khi response có kèm `questions`.
//
// 3. BỎ DỞ QUÁ `HAN_GIU_DE_MS` THÌ BỎ, IM LẶNG.
//    Không có hạn nào ở máy chủ, nên hạn phải quyết ở đây. Giữ quá dài là hại:
//    pool lớn dần theo số bài hoàn thành, nên một đề phát lúc mới xong 2 bài
//    (đúng `MIN_POOL = 5` câu) mà quay lại sau một module nữa thì nó đang ôn
//    một phần nhỏ của thứ người ta đã học — và đề mới thì luôn sẵn, một bấm.
//    Giữ quá ngắn thì mất đúng ca "bỏ dở hôm nay, mai mở lại". Chọn 7 ngày: dài
//    hơn mọi lần nghỉ ngắn, ngắn hơn một nhịp học hết một module.
//    Và khi quá hạn thì KHÔNG hiện lỗi gì — người học không nhớ mình có một đề
//    mở dở, nên một câu nói về nó chỉ gây hoang mang. Hiện cổng thường.
//
// Hạn tính từ lúc PHÁT đề (`luc`), không từ lần bấm cuối: nó bó TUỔI của đề,
// tức bó đúng cái đang cũ đi (pool), chứ không bó độ rảnh của người học.

/** Tiền tố khoá `localStorage`. Đổi tên = mọi người mất đề đang làm. */
export const TIEN_TO_LUU_DE = 'pe-review-quiz-v1';

/** Khoá của một KHOÁ HỌC — xem quyết định 1 ở trên. */
export function khoaLuuDe(courseId: string): string {
  return `${TIEN_TO_LUU_DE}:${courseId}`;
}

/** Quá bấy nhiêu thì bỏ đề đang làm — xem quyết định 3 ở trên. */
export const HAN_GIU_DE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Đề đang làm, như nó nằm trên đĩa.
 *
 * `chon` đi kèm `quizId` vì lần tải lại phải không mất gì: nhớ id mà bỏ các
 * phương án đã chọn thì người học vẫn phải làm lại cả đề, chỉ khác là lần này
 * nộp được. Mảng ≤ 10 số nên ghi mỗi lần bấm là đủ rẻ — khác hẳn tự lưu CODE,
 * nơi mỗi phím là tuần tự hoá lại cả bài (xem `IDE_AUTOSAVE_DEBOUNCE_MS`).
 */
export type DeDangLam = {
  quizId: number;
  /** Lúc PHÁT đề, ms. */
  luc: number;
  chon: Array<number | null>;
};

/** Chỉ ba hàm của Storage được dùng — khai hẹp để test tiêm được kho giả. */
type KhoDonGian = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function khoCucBo(): KhoDonGian | null {
  try {
    // CHÍNH VIỆC ĐỌC `localStorage` cũng ném được (Chrome ném SecurityError khi
    // người dùng chặn "site data"), nên try/catch bọc cả phép đọc thuộc tính.
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Ghi đề đang làm. KHÔNG BAO GIỜ ném: mất bản lưu không được làm sập ô này. */
export function ghiDeDangLam(
  courseId: string,
  ban: DeDangLam,
  kho: KhoDonGian | null = khoCucBo(),
): void {
  try {
    kho?.setItem(khoaLuuDe(courseId), JSON.stringify(ban));
  } catch {
    // Hết quota / kho bị chặn: im lặng. Không có gì người học làm được với
    // thông báo này, và đề vẫn làm được trong phiên hiện tại.
  }
}

/** Bỏ đề đang làm (đã nộp xong, hoặc máy chủ nói id đó không còn dùng được). */
export function xoaDeDangLam(
  courseId: string,
  kho: KhoDonGian | null = khoCucBo(),
): void {
  try {
    kho?.removeItem(khoaLuuDe(courseId));
  } catch {
    /* không có kho thì cũng không có gì để xoá */
  }
}

/**
 * Đọc đề đang làm. `null` = không có / không đọc được / QUÁ HẠN.
 *
 * Quá hạn thì XOÁ luôn, không chỉ bỏ qua: để lại thì mỗi lần mở màn tổng kết
 * là một lượt `GET quizzes/:id` cho một đề không ai còn muốn làm.
 */
export function docDeDangLam(
  courseId: string,
  bayGio: number = Date.now(),
  kho: KhoDonGian | null = khoCucBo(),
): DeDangLam | null {
  try {
    const text = kho?.getItem(khoaLuuDe(courseId));
    if (!text) return null;
    const x = banGhi(JSON.parse(text) as unknown);
    const quizId = soNguyen(x?.quizId);
    const luc = soNguyen(x?.luc);
    // Thiếu `luc` thì KHÔNG đoán là "vừa phát" — một bản ghi không nói được
    // tuổi của nó là bản ghi do một bản code khác ghi, và nó sẽ sống mãi.
    if (quizId === null || quizId <= 0 || luc === null) {
      xoaDeDangLam(courseId, kho);
      return null;
    }
    // `bayGio < luc`: đồng hồ máy bị đặt lùi (hoặc bản ghi từ tương lai) —
    // không tính được tuổi thì không giữ.
    if (bayGio - luc > HAN_GIU_DE_MS || bayGio < luc) {
      xoaDeDangLam(courseId, kho);
      return null;
    }
    const chon = Array.isArray(x?.chon) ? (x.chon as unknown[]) : [];
    return { quizId, luc, chon: chon.map((v) => soNguyen(v)) };
  } catch {
    // JSON hỏng, kho bị chặn: coi như chưa từng lưu.
    return null;
  }
}

/** Đề khôi phục được từ `GET quizzes/:id` — hai nhánh, không bao giờ lẫn nhau. */
export type DeKhoiPhuc =
  | { loai: 'dangLam'; de: DeOn }
  | { loai: 'daNop'; diem: number; tong: number };

/**
 * Đọc response của `GET quizzes/:id`.
 *
 * Hợp đồng THẬT của route đó (đã đọc `getQuiz`, không suy từ tên):
 *  · chưa nộp → `{ok, quiz_id, status, questions}` với `questions` đã
 *    `stripAnswers` — ĐÚNG hình dạng mà `generate-review` trả, nên `docDe`
 *    dùng lại được nguyên vẹn;
 *  · đã nộp → `{ok, quiz_id, status: 'submitted', score, total, detail}`,
 *    KHÔNG có `questions`. Nên nhánh này không dựng lại được danh sách phương
 *    án (chỉ `detail` mới có, và nó không mang `options`) — vì vậy nó chỉ trả
 *    về ĐIỂM, và ô đề ôn hiện một dòng "đề trước đã nộp xong" cộng nút lấy đề
 *    mới. Thà nói đúng một nửa còn hơn dựng một màn đề mà mọi phương án trống.
 *
 * `status === 'submitted'` được xét TRƯỚC `questions`: xem quyết định 2 ở trên.
 */
export function docDeKhoiPhuc(raw: unknown): DeKhoiPhuc | null {
  const x = banGhi(raw);
  if (!x) return null;
  if (x.status === 'submitted') {
    const diem = soNguyen(x.score);
    const tong = soNguyen(x.total);
    return diem === null || tong === null ? null : { loai: 'daNop', diem, tong };
  }
  const de = docDe(x);
  return de ? { loai: 'dangLam', de } : null;
}

/**
 * Các phương án đã chọn, ÁP vào đúng đề vừa nạp về.
 *
 * Phải kẹp theo SỐ PHƯƠNG ÁN của từng câu, không chỉ theo số câu: một bản ghi
 * cũ mang chỉ số 5 cho một câu 3 phương án thì radio không tô gì (`chon[i] ===
 * j` không khớp ai) NHƯNG `daChonHet` vẫn đọc ra "đã chọn" — nút Nộp mở, và
 * `answers[i] = 5` được gửi đi rồi chấm là SAI. Im lặng, và theo chiều "sai
 * nhưng vẫn ra điểm", đúng họ lỗi mà `goiDapAn` đã phải chữa một lần.
 */
export function apDungChon(de: DeOn, chon: unknown): Array<number | null> {
  const nguon = Array.isArray(chon) ? (chon as unknown[]) : [];
  return de.cauHoi.map((q, i) => {
    const v = soNguyen(nguon[i]);
    return v !== null && v >= 0 && v < q.options.length ? v : null;
  });
}
