// ĐỀ ÔN CHẤM Ở MÁY CHỦ — đường đi tới người học, và câu nói ra ở cái cổng.
//
// VÌ SAO CÓ FILE NÀY. `src/quizzes/quizzes.controller.ts` có 11 route đang chạy
// và cho tới hôm nay KHÔNG trang nào gọi route nào (`grep` trên `frontend/src`:
// 0 lời gọi). Ba file JS di sản Django biết gọi, nhưng không `page.tsx` nào nạp
// chúng — thứ duy nhất còn sống của đường cũ là `edu-review-quiz.css`, tức mọi
// trang khoá học đang tải style cho một hộp thoại không bao giờ mở. Đây là
// đường chấm DUY NHẤT client không giả mạo được (`submitQuiz` chấm theo
// SNAPSHOT trong DB, `stripAnswers` không gửi `correct`/`explanation`, mỗi đề
// nộp một lần), và kho 516 câu đã đầy sẵn từ 27/10.
//
// Ba thứ file này canh, cả ba đều hỏng trong IM LẶNG:
//  1. câu ở cổng nói theo CÂU thay vì theo BÀI — `MIN_POOL = 5` đếm câu, mà
//     mỗi bài chỉ có 3 câu, nên "cần 5 câu" nghĩa là "cần xong 2 BÀI". Người
//     học đọc "còn thiếu 2 câu" sẽ học thêm 1 bài rồi quay lại và vẫn bị chặn;
//  2. đường đi bị gỡ mất một mắt — ô đề ôn không còn được mount, hoặc bị đẩy
//     xuống DƯỚI nút "Hoàn thành ✓" (muốn tới phải cuộn qua đúng cái nút đưa
//     mình ra khỏi bài). Repo này đã vấp đúng hình dạng lỗi đó tám lần;
//  3. một trang CÔNG KHAI gọi tới đường này — `apiFetch` gặp 401 là tự tạo tài
//     khoản khách, nên mỗi bot quét web sẽ sinh một `@guest.local` và ăn hết
//     `THROTTLE_GUEST_LIMIT` (120 lượt/giờ/IP).
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  apDungChon,
  cauCuaCong,
  daChonHet,
  DE_MAX,
  DE_MIN,
  docDe,
  docDeDangLam,
  docDeKhoiPhuc,
  docKetQua,
  docTrangThai,
  ghiDeDangLam,
  goiDapAn,
  HAN_GIU_DE_MS,
  khoaLuuDe,
  nhanDiem,
  soBaiConThieu,
  soCauTrongDe,
  thongDiepLoi,
  viTriDung,
  xoaDeDangLam,
} from '../../src/lib/review-quiz.ts';

const doc = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const NGUON_SERVICE = doc('../../../src/quizzes/quizzes.service.ts');
const NGUON_CONTROLLER = doc('../../../src/quizzes/quizzes.controller.ts');
const NGUON_O = doc('../../src/components/python-studio/ReviewQuiz.tsx');
const NGUON_RECAP_SCREEN = doc('../../src/components/python-studio/screens/RecapScreen.tsx');
const NGUON_RECAP = doc('../../src/components/lesson-chrome/exercises/Recap.tsx');

/** Hình dạng THẬT của `GET /api/courses/:id/quiz/status` với khoá 172 bài. */
const TT_MOT_BAI = {
  ok: true,
  lessons_completed: 1,
  lessons_counted: 1,
  questions_available: 3,
  min_questions: 5,
  can_quiz: false,
};
const TT_HAI_BAI = {
  ok: true,
  lessons_completed: 2,
  lessons_counted: 2,
  questions_available: 6,
  min_questions: 5,
  can_quiz: true,
};

// ---------------------------------------------------------------- cái cổng

test('xong 1 bài (3 câu / ngưỡng 5) → còn thiếu đúng 1 BÀI, không phải 2 câu', () => {
  const tt = docTrangThai(TT_MOT_BAI);
  assert.equal(soBaiConThieu(tt), 1);
  const cau = cauCuaCong(tt);
  // Phải nói ra con số BÀI. Đây là ca bắt lỗi của cả file: hiện nguyên câu
  // backend ("Chưa đủ câu hỏi để tạo quiz, hãy hoàn thành thêm bài học") thì
  // chuỗi dưới đây không có.
  assert.match(cau, /thêm 1 bài/);
  // …và vẫn phải nói ngưỡng theo CÂU, vì đó là con số máy chủ thật sự kiểm.
  assert.match(cau, /5 câu/);
  assert.match(cau, /3 câu/);
});

test('ngưỡng 5 câu với bài 2 câu mỗi bài → 2 bài, không phải 1', () => {
  // Số câu mỗi bài tính từ dữ liệu THẬT của chính người học, không ghi cứng 3:
  // 2 câu/bài thì thiếu 3 câu = thêm 2 bài. Một hằng số 3 ở đây nói "1 bài".
  const tt = docTrangThai({ ...TT_MOT_BAI, lessons_counted: 1, questions_available: 2 });
  assert.equal(soBaiConThieu(tt), 2);
  assert.match(cauCuaCong(tt), /thêm 2 bài/);
});

test('đã đủ → 0 bài thiếu, và câu ở cổng mời làm kèm số câu của đề', () => {
  const tt = docTrangThai(TT_HAI_BAI);
  assert.equal(soBaiConThieu(tt), 0);
  const cau = cauCuaCong(tt);
  assert.match(cau, /Đề 6 câu/);
  assert.match(cau, /2 bài/);
  // Nói ra luật "mỗi đề một lần": `submitQuiz` ném 409 ở lần nộp thứ hai, và
  // một người không biết trước điều đó sẽ coi 409 là lỗi của trang.
  assert.match(cau, /một lần/);
});

test('chưa bài nào góp câu → KHÔNG đo được (null), không phải "thiếu 0 bài"', () => {
  const tt = docTrangThai({
    ok: true,
    lessons_completed: 1,
    lessons_counted: 0,
    questions_available: 0,
    min_questions: 5,
    can_quiz: false,
  });
  assert.equal(soBaiConThieu(tt), null);
  // Gộp null với 0 là hiện "còn thiếu 0 bài là mở được" cho người chưa có câu
  // nào — một câu tự phủ định.
  const cau = cauCuaCong(tt);
  assert.doesNotMatch(cau, /thêm 0 bài/);
  assert.match(cau, /chưa có câu trắc nghiệm/i);
});

test('cổng tin `can_quiz` của MÁY CHỦ, không tự tính lại', () => {
  // Máy chủ là nơi duy nhất biết luật thật (và luật đó đổi được). Tự suy
  // `soCau >= nguong` rồi bỏ qua `can_quiz` là dựng ra hai sự thật.
  const tt = docTrangThai({ ...TT_HAI_BAI, can_quiz: false });
  assert.equal(tt.moDuoc, false);
  assert.doesNotMatch(cauCuaCong(tt), /^Đề/);
});

test('status hỏng hình dạng → null, không phải một đối tượng toàn số 0', () => {
  // Số 0 bịa ra sẽ hiện thành "cần hoàn thành thêm bài học" cho một người đã
  // học 50 bài, tức nền tảng nói sai về chính tiến độ của họ.
  for (const rac of [null, undefined, 42, 'ok', {}, { ok: true }, { questions_available: 3 }]) {
    assert.equal(docTrangThai(rac), null, JSON.stringify(rac));
  }
});

// ------------------------------------------------- số câu của đề, và phép khớp

test('soCauTrongDe kẹp đúng như `sampleSize()` của máy chủ', () => {
  assert.equal(soCauTrongDe(6), 6);
  assert.equal(soCauTrongDe(10), 10);
  assert.equal(soCauTrongDe(36), 10);
  assert.equal(soCauTrongDe(5), 5);
});

test('DE_MIN/DE_MAX phải KHỚP SAMPLE_MIN/SAMPLE_MAX trong cây mã backend', () => {
  // Hai hằng này là bản CHÉP (hai cây mã, hai bộ chạy test, không import được
  // qua nhau) nên chúng SẼ TRÔI — và trôi im lặng: nhãn nút hứa "10 câu" trong
  // khi máy chủ phát 8 thì không có gì đỏ, chỉ có người học đếm lại. Cùng
  // khuôn `tracer-web-sync` / `insert-gate-sync`.
  const lay = (ten) => {
    const m = NGUON_SERVICE.match(new RegExp(`const ${ten} = (\\d+)`));
    assert.ok(m, `không tìm thấy hằng ${ten} ở backend — phép so này đang chứng minh số 0`);
    return Number(m[1]);
  };
  assert.equal(DE_MIN, lay('SAMPLE_MIN'));
  assert.equal(DE_MAX, lay('SAMPLE_MAX'));
  // Và ngưỡng mà cổng nói ra là `min_questions` của máy chủ, nên nó phải đến
  // TỪ response — không có hằng MIN_POOL nào ở phía frontend để mà lệch.
  assert.ok(lay('MIN_POOL') > 0);
  // Không có hằng MIN_POOL nào KHAI ở phía frontend để mà lệch (nhắc tên nó
  // trong chú thích thì được).
  assert.doesNotMatch(doc('../../src/lib/review-quiz.ts'), /(?:const|let)\s+MIN_POOL/);
});

// ---------------------------------------------------------------- đọc đề, nộp

test('docDe giữ `index` của máy chủ và bỏ câu hỏng', () => {
  const de = docDe({
    ok: true,
    quiz_id: 77,
    questions: [
      { index: 0, question: 'Q0', options: ['a', 'b', 'c'] },
      { index: 1, question: 'Q1' }, // thiếu options → bỏ
      { index: 2, question: 'Q2', options: ['x', 'y'] },
    ],
  });
  assert.equal(de.quizId, 77);
  assert.equal(de.cauHoi.length, 2);
  assert.deepEqual(
    de.cauHoi.map((q) => q.index),
    [0, 2],
  );
});

test('docDe trả null khi không có câu nào dùng được', () => {
  assert.equal(docDe({ ok: true, quiz_id: 1, questions: [] }), null);
  assert.equal(docDe({ ok: true, questions: [{ question: 'Q', options: ['a'] }] }), null);
  assert.equal(docDe(null), null);
});

test('goiDapAn gửi mảng ĐỦ ĐỘ DÀI, giữ nguyên thứ tự và cả chỗ trống', () => {
  // `submitQuiz` chấm `answers[i]` cho câu thứ i của SNAPSHOT. Nén mảng (bỏ
  // câu chưa chọn) là chấm lệch câu — im lặng, và theo chiều "sai nhưng vẫn ra
  // điểm".
  assert.deepEqual(goiDapAn([2, null, 0], 3), [2, null, 0]);
  assert.deepEqual(goiDapAn([1], 3), [1, null, null]);
  assert.equal(goiDapAn([1, 2, 3], 3).length, 3);
});

test('daChonHet chặn nút Nộp khi còn câu trống', () => {
  assert.equal(daChonHet([0, 1, 2], 3), true);
  assert.equal(daChonHet([0, null, 2], 3), false);
  assert.equal(daChonHet([0, 1], 3), false);
  // 0 là một lựa chọn HỢP LỆ (phương án đầu). Kiểm bằng truthiness là chặn
  // đúng những người chọn phương án a cho mọi câu — đã gặp đúng lỗi này ở
  // `VZ30 if event.xdata`.
  assert.equal(daChonHet([0, 0, 0], 3), true);
  assert.equal(daChonHet([], 0), false);
});

test('docKetQua đọc điểm + chi tiết đã chấm', () => {
  const kq = docKetQua({
    ok: true,
    score: 2,
    total: 3,
    detail: [
      { question: 'Q0', given: 1, correct: 1, is_correct: true, explanation: 'vì vậy' },
      { question: 'Q1', given: 0, correct: 2, is_correct: false, explanation: null },
      'rác',
    ],
  });
  assert.equal(kq.diem, 2);
  assert.equal(kq.tong, 3);
  assert.equal(kq.chiTiet.length, 2);
  assert.equal(kq.chiTiet[0].dung, true);
  assert.equal(kq.chiTiet[0].giaiThich, 'vì vậy');
  assert.equal(kq.chiTiet[1].dung, false);
  assert.equal(kq.chiTiet[1].giaiThich, null);
  assert.equal(docKetQua({ ok: true }), null);
});

test('nhanDiem luôn kèm MẪU SỐ, không bao giờ phần trăm', () => {
  // Ba câu của một bài sinh từ MỘT gốc câu hỏi, nên một tỉ lệ phần trăm ở đây
  // gợi ra một độ chính xác mà cỡ mẫu này không có — lý do đã ghi trong
  // `generatePostTest`.
  assert.equal(nhanDiem({ diem: 3, tong: 5, chiTiet: [] }), '3/5 câu đúng');
  assert.doesNotMatch(nhanDiem({ diem: 3, tong: 5, chiTiet: [] }), /%/);
});

test('viTriDung nhận cả số lẫn chữ, và null khi không khớp', () => {
  assert.equal(viTriDung(1, ['a', 'b', 'c']), 1);
  assert.equal(viTriDung(9, ['a', 'b']), null); // ngoài dải → không tô gì
  assert.equal(viTriDung(-1, ['a', 'b']), null);
  assert.equal(viTriDung(' B ', ['a', 'b']), 1); // hợp đồng `isCorrect()`
  assert.equal(viTriDung('z', ['a', 'b']), null);
});

test('thongDiepLoi không bao giờ trả chuỗi rỗng', () => {
  // Một ô lỗi trống là thứ duy nhất tệ hơn một câu lỗi khó hiểu: nó không nói
  // được là nên thử lại hay nên đi học bài khác.
  assert.equal(
    thongDiepLoi({ error: { status: 400, message: 'Chưa đủ câu hỏi để tạo quiz' } }, 400),
    'Chưa đủ câu hỏi để tạo quiz',
  );
  assert.equal(thongDiepLoi({ message: 'Quiz này đã được nộp' }, 409), 'Quiz này đã được nộp');
  assert.equal(thongDiepLoi({ message: ['sai ô A', 'sai ô B'] }, 400), 'sai ô A');
  for (const [body, status] of [
    [null, 500],
    [{}, 502],
    [{ error: { message: '  ' } }, 409],
  ]) {
    assert.ok(thongDiepLoi(body, status).length > 10, `status ${status}`);
  }
});

// ------------------------------------------------- đường đi có THẬT tới đâu

test('ô đề ôn ĐƯỢC MOUNT ở màn tổng kết, cho CẢ HAI nhánh của màn đó', () => {
  assert.match(NGUON_RECAP_SCREEN, /import ReviewQuiz from '\.\.\/ReviewQuiz'/);
  // Hai nhánh: khoá có mini-game (`play`) và khoá bài đọc. Để sót một nhánh là
  // dựng lại đúng cái bẫy "có nút mà không màn nào mount" của `TryItButton`.
  assert.equal((NGUON_RECAP_SCREEN.match(/extra=\{deOn\}/g) ?? []).length, 2);
  // Chỉ dựng khi bài ĐÃ hoàn thành: pool ở máy chủ chỉ gồm bài
  // `status = 'completed'`, nên hỏi sớm hơn là đếm thiếu đúng bài vừa học.
  assert.match(NGUON_RECAP_SCREEN, /completed \? <ReviewQuiz/);
});

test('ô đề ôn nằm TRƯỚC nút "Hoàn thành" trong Recap', () => {
  // Đặt sau nút kết thúc thì muốn tới ô này phải cuộn qua đúng cái nút đưa
  // mình ra khỏi bài — và một đường đi phải đoán mới thấy thì trên thực tế nó
  // không tồn tại (bài học của thanh tiến độ bấm được mà 5 người thử không
  // thấy).
  const viTriExtra = NGUON_RECAP.indexOf('{extra}');
  const viTriNut = NGUON_RECAP.indexOf('onClick={onFinish}');
  assert.ok(viTriExtra > 0, 'Recap không còn dựng {extra}');
  assert.ok(viTriNut > 0);
  assert.ok(viTriExtra < viTriNut, 'ô extra bị đẩy xuống dưới nút Hoàn thành');
});

test('MỌI đường dẫn API mà ô này gọi đều là route CÓ THẬT ở backend', () => {
  // Ablate bằng cách gõ sai một route (`generate_review`) thì ca này đỏ. Không
  // có nó thì một lỗi gõ chỉ hiện ra dưới dạng 404 trên tay người học, và chỉ
  // ở đúng cái nút mà hôm nay chưa ai từng bấm.
  const duocKhai = new Set(
    [...NGUON_CONTROLLER.matchAll(/@(?:Get|Post)\('([^']+)'\)/g)].map((m) => m[1]),
  );
  assert.ok(duocKhai.size >= 10, 'phép quét controller không thấy route nào');

  const goiDi = [...NGUON_O.matchAll(/`\/api\/([^`]+)`/g)].map((m) =>
    // `${khoa}` / `${de.quizId}` → tham số route.
    m[1].replace(/\$\{[^}]+\}/g, ':id'),
  );
  assert.ok(goiDi.length >= 3, `ô đề ôn không còn gọi API nào: ${goiDi.join()}`);
  for (const p of goiDi) {
    assert.ok(duocKhai.has(p), `route không tồn tại ở backend: ${p}`);
  }
  // Ba mắt của đường đi: hỏi trạng thái → phát đề → nộp. Thiếu mắt giữa thì ô
  // chỉ còn là một cái nhãn.
  assert.ok(goiDi.some((p) => p.endsWith('/quiz/status')));
  assert.ok(goiDi.some((p) => p.endsWith('/quiz/generate-review')));
  assert.ok(goiDi.some((p) => p.endsWith('/submit')));
});

test('ô đề ôn CHỈ được mount từ cây bài học, không từ trang công khai', () => {
  // `apiFetch` gặp 401 là tự tạo tài khoản khách, nên một trang ai cũng vào
  // được mà gọi tới đây nghĩa là mỗi bot quét web sinh một `@guest.local` và
  // ăn hết `THROTTLE_GUEST_LIMIT` (120 lượt/giờ/IP). Quét CẢ cây mã chứ không
  // kiểm vài file đã biết: nơi thứ hai mount nó mới là nơi gây ra chuyện đó.
  const goc = new URL('../../src/', import.meta.url);
  const ra = [];
  const di = (thuMuc) => {
    for (const e of readdirSync(new URL(thuMuc, goc), { withFileTypes: true })) {
      const duong = `${thuMuc}${e.name}`;
      if (e.isDirectory()) di(`${duong}/`);
      else if (/\.tsx?$/.test(e.name) && duong !== 'components/python-studio/ReviewQuiz.tsx') {
        if (/from '[^']*ReviewQuiz'/.test(readFileSync(new URL(duong, goc), 'utf8'))) ra.push(duong);
      }
    }
  };
  di('');
  assert.deepEqual(ra, ['components/python-studio/screens/RecapScreen.tsx']);
});

/** Bỏ chú thích: chữ `apiFetch` trong một câu GIẢI THÍCH không phải lời gọi. */
const boChuThich = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((d) => !d.trimStart().startsWith('//'))
    .join('\n');

test('trang công khai KHÔNG tự gọi API, và không mount đề ôn', () => {
  // Bản trước của ca này đòi "trang công khai không có ĐƯỜNG nào tới API".
  // Từ 4d5f86d (bê trang chủ Góc học + trang khoá từ nhánh `test`) điều đó
  // KHÔNG còn đúng: cả hai trang lấy tiến độ qua `apiFetch` — chủ dự án quyết
  // giữ thế (04/11). Ca này nay canh phần CÒN đúng: chính file trang không gọi
  // API và không mount đề ôn. Phần "chỉ gọi khi đã có phiên" ở ca dưới.
  //
  // Và nó từng ĐỎ OAN vì không bỏ chú thích: page.tsx GIẢI THÍCH vì sao không
  // gọi `apiFetch`, và chính câu giải thích ấy khớp regex.
  for (const f of ['src/app/page.tsx', 'src/app/(standalone)/courses/[courseId]/page.tsx']) {
    const s = boChuThich(doc(`../../${f}`));
    assert.doesNotMatch(s, /apiFetch|ReviewQuiz|quiz\/generate|quiz\/status/, f);
  }
});

test('trang công khai CHỈ gọi API khi máy đã có phiên — bot không chạm API', () => {
  // Cơ chế THẬT đang chặn "mỗi con bot một tài khoản khách" trên hai trang công
  // khai: `apiFetch` chỉ được gọi SAU phép `hasStoredSession`. Bot không có
  // phiên đã lưu nên dừng ở đó, 0 lời gọi mạng. Gỡ phép chặn là mở lại lỗ ấy
  // mà không gì khác đỏ — trang vẫn chạy, chỉ bảng `users` phình ra.

  // Trang chủ: mọi `apiFetch(` nằm trong helper `doc`, và `doc` chỉ được gọi
  // trong `laySo` SAU dòng trả sớm khi chưa có phiên.
  const room = boChuThich(doc('../../src/components/goc-hoc/StudyRoom.tsx'));
  const goi = [...room.matchAll(/apiFetch\(/g)].map((m) => m.index);
  const thanDoc = room.indexOf('async function doc<');
  const hetDoc = room.indexOf('\n}', thanDoc);
  assert.ok(thanDoc >= 0, 'StudyRoom.tsx không còn helper `doc` — đổi cấu trúc thì sửa ca này.');
  assert.ok(goi.length > 0 && goi.every((i) => i > thanDoc && i < hetDoc),
    'Có lời gọi apiFetch( nằm NGOÀI helper `doc` của StudyRoom — nó không đi qua phép chặn phiên.');
  const laySo = room.indexOf('async function laySo(');
  const chan = room.indexOf('if (!hasStoredSession(session)) return', laySo);
  assert.ok(laySo >= 0 && chan > laySo, '`laySo` không còn trả sớm khi chưa có phiên.');
  const goiDoc = [...room.matchAll(/\bdoc<[^>]*>\(|\bdoc\(/g)].map((m) => m.index)
    .filter((i) => i !== thanDoc + 'async function '.length);
  assert.ok(goiDoc.length > 0 && goiDoc.every((i) => i > chan),
    'Có lời gọi doc(...) đứng TRƯỚC phép chặn phiên trong StudyRoom.');

  // Trang khoá: lời gọi duy nhất nằm trong `fetchCompleted`, mà
  // `loadCompletedLessons` chặn phiên ngay dòng đầu.
  const detail = boChuThich(doc('../../src/app/(standalone)/courses/[courseId]/CourseDetail.tsx'));
  const goiCD = [...detail.matchAll(/apiFetch\(/g)].map((m) => m.index);
  const fc = detail.indexOf('fetchCompleted:');
  assert.equal(goiCD.length, 1, 'CourseDetail phải có ĐÚNG MỘT lời gọi apiFetch( (trong fetchCompleted).');
  assert.ok(fc >= 0 && goiCD[0] > fc && goiCD[0] - fc < 200,
    'Lời gọi apiFetch( của CourseDetail không nằm trong fetchCompleted.');
  const prog = boChuThich(doc('../../src/lib/course-progress.ts'));
  assert.match(prog,
    /export async function loadCompletedLessons\([\s\S]*?\): Promise<number\[\] \| null> \{\s*if \(!hasStoredSession\(input\.session\)\) return null;/,
    '`loadCompletedLessons` phải chặn phiên ở DÒNG ĐẦU, trước mọi lời gọi.');
});

// ------------------------------------------- ĐỀ ĐANG LÀM sống qua tải lại
//
// LỖI ĐANG CANH: `quiz_id` chỉ sống trong state React, nên một lần F5 giữa lúc
// đang làm đề là MẤT ĐỀ — hàng `quizzes` kẹt ở `generated` vĩnh viễn (không ai
// nộp được nó nữa) và người học chỉ còn đường phát một đề khác. `GET
// quizzes/:id` đã có từ Task 133 và chưa ai gọi.

/** Kho giả, đủ ba hàm mà `review-quiz.ts` khai. */
function khoGia(ban = {}) {
  const o = { ...ban };
  return {
    o,
    getItem: (k) => (k in o ? o[k] : null),
    setItem: (k, v) => {
      o[k] = String(v);
    },
    removeItem: (k) => {
      delete o[k];
    },
  };
}

const DE_MAU = {
  ok: true,
  quiz_id: 77,
  status: 'generated',
  questions: [
    { index: 0, question: 'Câu A?', options: ['a', 'b', 'c'] },
    { index: 1, question: 'Câu B?', options: ['x', 'y'] },
  ],
};

test('khoá lưu gắn với KHOÁ HỌC, không với BÀI', () => {
  // Bản nháp (`useLessonDraft`) gắn với bài: `pe-studio-lesson-v1:<user>:<khoá>:<bài>`.
  // Đề ôn thì rút câu từ MỌI bài đã hoàn thành và ô đề ôn mount ở màn tổng kết
  // của BẤT KỲ bài nào — cất vào nháp bài 12 thì màn tổng kết bài 13 lại phát
  // một đề THỨ HAI, và một trong hai chắc chắn kẹt lại mãi.
  assert.equal(khoaLuuDe('python_advanced'), khoaLuuDe('python_advanced'));
  assert.notEqual(khoaLuuDe('python_advanced'), khoaLuuDe('python'));
  assert.doesNotMatch(khoaLuuDe('python_advanced'), /lesson|bai|:\d+$/);
  // …và id đề KHÔNG được chui vào bản nháp bài: đó là chỗ nó sẽ gắn với bài.
  assert.doesNotMatch(doc('../../src/lib/studio-lesson.ts'), /quizId|quiz_id/);
  assert.doesNotMatch(
    doc('../../src/components/python-studio/useLessonDraft.ts'),
    /quizId|quiz_id/,
  );
});

test('ghi rồi đọc lại: giữ id, mốc phát đề và các phương án đã chọn', () => {
  const kho = khoGia();
  const luc = 1_700_000_000_000;
  ghiDeDangLam('python_advanced', { quizId: 77, luc, chon: [2, null] }, kho);
  // Nhớ id mà bỏ các phương án đã chọn thì người học vẫn phải làm lại cả đề.
  assert.deepEqual(docDeDangLam('python_advanced', luc + 1000, kho), {
    quizId: 77,
    luc,
    chon: [2, null],
  });
  // Và khoá học KHÁC thì không thấy gì — đề của khoá này không hiện ở khoá kia.
  assert.equal(docDeDangLam('python', luc + 1000, kho), null);
});

test('bỏ dở quá 7 ngày → bỏ đề, và XOÁ bản lưu', () => {
  const kho = khoGia();
  const luc = 1_700_000_000_000;
  ghiDeDangLam('python_advanced', { quizId: 77, luc, chon: [] }, kho);

  // Trong hạn: còn nạp lại. "Bỏ dở ba ngày rồi quay lại" phải thấy đề cũ.
  assert.ok(docDeDangLam('python_advanced', luc + 3 * 24 * 3600_000, kho));
  // Quá hạn: bỏ. Pool lớn dần theo số bài hoàn thành, nên một đề phát lúc mới
  // xong 2 bài mà quay lại sau một module nữa thì nó đang ôn một phần nhỏ của
  // thứ người ta đã học — và đề mới thì luôn sẵn, một bấm.
  assert.equal(docDeDangLam('python_advanced', luc + HAN_GIU_DE_MS + 1, kho), null);
  // XOÁ chứ không chỉ bỏ qua: để lại thì mỗi lần mở màn tổng kết là một lượt
  // `GET quizzes/:id` cho một đề không ai còn muốn làm.
  assert.deepEqual(Object.keys(kho.o), []);
});

test('hạn giữ đề là 7 ngày', () => {
  // Dài hơn mọi lần nghỉ ngắn, ngắn hơn một nhịp học hết một module.
  assert.equal(HAN_GIU_DE_MS, 7 * 24 * 60 * 60 * 1000);
});

test('bản ghi không nói được TUỔI của nó thì không được giữ', () => {
  // Thiếu `luc` mà đoán là "vừa phát" thì bản ghi đó sống mãi — và nó do một
  // bản code khác (hoặc một tab khác, luật khác) ghi ra.
  for (const xau of [
    { quizId: 77 },
    { quizId: 77, luc: 'hôm qua' },
    { quizId: 0, luc: 1 },
    { quizId: -3, luc: 1 },
    { luc: 1 },
    'không phải JSON',
    '[]',
  ]) {
    const kho = khoGia({
      [khoaLuuDe('python_advanced')]: typeof xau === 'string' ? xau : JSON.stringify(xau),
    });
    assert.equal(docDeDangLam('python_advanced', 2, kho), null, JSON.stringify(xau));
  }
  // Đồng hồ máy bị đặt lùi: không tính được tuổi thì không giữ.
  const kho = khoGia();
  ghiDeDangLam('python_advanced', { quizId: 77, luc: 5000, chon: [] }, kho);
  assert.equal(docDeDangLam('python_advanced', 4000, kho), null);
});

test('kho bị chặn / không có kho: không ném, chỉ là không nhớ gì', () => {
  const nem = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceeded');
    },
    removeItem: () => {
      throw new Error('SecurityError');
    },
  };
  assert.equal(docDeDangLam('python_advanced', 1, nem), null);
  assert.doesNotThrow(() => ghiDeDangLam('python_advanced', { quizId: 1, luc: 1, chon: [] }, nem));
  assert.doesNotThrow(() => xoaDeDangLam('python_advanced', nem));
  assert.equal(docDeDangLam('python_advanced', 1, null), null);
  assert.doesNotThrow(() => ghiDeDangLam('python_advanced', { quizId: 1, luc: 1, chon: [] }, null));
});

test('đề CHƯA nộp nạp về đúng hình dạng mà `docDe` đọc được', () => {
  // `getQuiz` khi chưa nộp trả `{ok, quiz_id, status, questions}` với
  // `questions` đã `stripAnswers` — ĐÚNG khuôn mà `generate-review` trả.
  const kp = docDeKhoiPhuc(DE_MAU);
  assert.equal(kp?.loai, 'dangLam');
  assert.deepEqual(kp.de, docDe(DE_MAU));
  assert.equal(kp.de.quizId, 77);
  assert.equal(kp.de.cauHoi.length, 2);
  assert.doesNotMatch(JSON.stringify(kp), /correct|explanation/);
});

test('đề ĐÃ NỘP không bao giờ trở lại thành "đang làm"', () => {
  // Nộp lần hai là 409 (`submitQuiz` compare-and-set generated -> submitted).
  // Khôi phục một đề đã nộp thành "đang làm" là mời người học chọn lại đủ 10
  // câu rồi nhận một câu lỗi — một việc nền tảng BIẾT TRƯỚC là không được.
  const kp = docDeKhoiPhuc({
    ok: true,
    quiz_id: 77,
    status: 'submitted',
    score: 4,
    total: 5,
    detail: [],
  });
  assert.deepEqual(kp, { loai: 'daNop', diem: 4, tong: 5 });

  // Và `status` phải được xét TRƯỚC `questions`: một response mang CẢ HAI (bản
  // backend sau này, hoặc một đề nộp xong mà vẫn trả câu hỏi) vẫn là "đã nộp".
  const caHai = docDeKhoiPhuc({ ...DE_MAU, status: 'submitted', score: 1, total: 2 });
  assert.equal(caHai?.loai, 'daNop');

  // Đã nộp mà không có điểm thì không dựng ra số 0 — hiện cổng thường.
  assert.equal(docDeKhoiPhuc({ quiz_id: 77, status: 'submitted' }), null);
  assert.equal(docDeKhoiPhuc(null), null);
  assert.equal(docDeKhoiPhuc({ ok: true, quiz_id: 77, status: 'generated' }), null);
});

test('phương án đã lưu được KẸP theo số phương án của từng câu', () => {
  const de = docDe(DE_MAU);
  // Câu 2 chỉ có 2 phương án: chỉ số 5 phải thành null. Để nguyên thì radio
  // không tô gì NHƯNG `daChonHet` vẫn đọc ra "đã chọn" — nút Nộp mở và
  // `answers[1] = 5` được gửi đi rồi chấm là SAI, im lặng.
  const chon = apDungChon(de, [2, 5]);
  assert.deepEqual(chon, [2, null]);
  assert.equal(daChonHet(chon, de.cauHoi.length), false);

  // Độ dài luôn bằng SỐ CÂU của đề vừa nạp về, không bằng độ dài bản lưu.
  assert.equal(apDungChon(de, [0]).length, 2);
  assert.equal(apDungChon(de, [0, 1, 1, 1]).length, 2);
  assert.deepEqual(apDungChon(de, ['1', null, 3]), [null, null]);
  assert.deepEqual(apDungChon(de, 'hỏng'), [null, null]);
  assert.deepEqual(apDungChon(de, [-1, 1]), [null, 1]);
});

test('ô đề ôn THỰC SỰ gọi `GET quizzes/:id` và xoá bản lưu sau khi nộp', () => {
  // Mắt thứ TƯ của đường đi. Không có lời gọi này thì cả lớp lưu trên đây chỉ
  // là một id nằm trên đĩa mà không ai nạp về — đúng hình dạng lỗi "dựng xong
  // mà không có đường tới" mà ô này ra đời để chữa.
  assert.match(NGUON_O, /`\/api\/quizzes\/\$\{luu\.quizId\}`/);
  assert.match(NGUON_O, /docDeDangLam\(courseId\)/);
  // Nạp lại SONG SONG với lượt hỏi trạng thái, không nối đuôi (repo này đã trả
  // giá một lần cho ba lượt API tuần tự ở màn mở bài: 3,7 giây).
  assert.match(NGUON_O, /Promise\.all\(\[/);
  // Nộp xong (hoặc 409) thì bản lưu phải đi, kẻo mỗi lần mở màn tổng kết lại
  // tốn một lượt GET rồi rơi vào nhánh "đã nộp".
  const viTriNop = NGUON_O.indexOf('/submit`');
  const viTriXoa = NGUON_O.indexOf('xoaDeDangLam(courseId);', viTriNop);
  assert.ok(viTriNop > 0 && viTriXoa > viTriNop, 'nộp xong không xoá bản lưu');
});

test('CẢ VÒNG: phát đề → chọn → tải lại → đúng đề, đúng phương án → nộp xong thì hết', () => {
  // Mỗi hàm ở trên đã có ca riêng; ca này canh chỗ chúng NỐI vào nhau, vì đó
  // là chỗ lỗi cũ sống: từng mảnh đều đúng mà đường đi vẫn không có.
  const kho = khoGia();
  const luc = 1_700_000_000_000;

  // 1. Phát đề (response của `POST .../quiz/generate-review`).
  const de = docDe(DE_MAU);
  ghiDeDangLam('python_advanced', { quizId: de.quizId, luc, chon: [null, null] }, kho);
  // 2. Người học chọn câu 1 rồi F5 giữa lúc đang làm.
  ghiDeDangLam('python_advanced', { quizId: de.quizId, luc, chon: [2, null] }, kho);

  // 3. Mở lại màn tổng kết: đọc đĩa, gọi `GET quizzes/:id`, dựng lại.
  const luu = docDeDangLam('python_advanced', luc + 60_000, kho);
  assert.equal(luu.quizId, 77);
  const kp = docDeKhoiPhuc({ ...DE_MAU, quiz_id: luu.quizId });
  assert.equal(kp.loai, 'dangLam');
  const chon = apDungChon(kp.de, luu.chon);
  assert.deepEqual(chon, [2, null]);
  // Chưa chọn hết thì nút Nộp vẫn khoá — trạng thái sau khi tải lại giống y
  // trạng thái trước đó, không phải một đề mới trắng trơn.
  assert.equal(daChonHet(chon, kp.de.cauHoi.length), false);

  // 4. Chọn nốt rồi nộp.
  chon[1] = 0;
  assert.equal(daChonHet(chon, kp.de.cauHoi.length), true);
  assert.deepEqual(goiDapAn(chon, kp.de.cauHoi.length), [2, 0]);
  xoaDeDangLam('python_advanced', kho);

  // 5. Tải lại lần nữa: KHÔNG còn gì để nạp, nên ô hiện cổng thường chứ không
  //    mời làm lại một đề mà `submit` sẽ trả 409.
  assert.equal(docDeDangLam('python_advanced', luc + 120_000, kho), null);
  assert.deepEqual(Object.keys(kho.o), []);
});

test('đề khôi phục giữ NGUYÊN mốc tuổi, không tự gia hạn', () => {
  // Nếu ô này ghi `luc: Date.now()` ở mỗi lượt lưu thì mỗi lần mở lại màn tổng
  // kết là gia hạn thêm 7 ngày — hạn đó không bao giờ tới, và quyết định 3
  // thành một chú thích không có hiệu lực. Lỗi IM LẶNG: bộ test về hàm thuần
  // vẫn xanh vì hàm thuần nhận `luc` từ bên gọi.
  assert.match(NGUON_O, /setLucPhat\(luu\.luc\)/);
  assert.match(NGUON_O, /ghiDeDangLam\(courseId, \{ quizId: de\.quizId, luc: lucPhat, chon \}\)/);
  // Mốc chỉ được đặt bằng `Date.now()` ở đúng MỘT chỗ: lúc phát đề mới. Đếm
  // `setLucPhat(Date.now())` chứ không đếm `Date.now()` trần — chuỗi sau có cả
  // trong chú thích, và một phép quét cây mã bị chú thích làm lệch thì nó canh
  // sai chỗ (cùng họ bẫy CRLF của `label-version.test.mjs`).
  assert.equal((NGUON_O.match(/setLucPhat\(/g) ?? []).length, 2);
  assert.equal((NGUON_O.match(/setLucPhat\(Date\.now\(\)\)/g) ?? []).length, 1);
});
