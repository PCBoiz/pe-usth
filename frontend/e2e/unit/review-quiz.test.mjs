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
  cauCuaCong,
  daChonHet,
  DE_MAX,
  DE_MIN,
  docDe,
  docKetQua,
  docTrangThai,
  goiDapAn,
  nhanDiem,
  soBaiConThieu,
  soCauTrongDe,
  thongDiepLoi,
  viTriDung,
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

test('trang công khai vẫn KHÔNG gọi API nào', () => {
  // Cơ chế thật đang chặn bot sinh tài khoản là "trang công khai không có
  // đường nào để gọi API", không phải một hàm fetch cẩn thận. Nối đường quiz
  // vào bài học không được làm hỏng tính chất đó.
  for (const f of ['src/app/page.tsx', 'src/app/(standalone)/courses/[courseId]/page.tsx']) {
    const s = doc(`../../${f}`);
    assert.doesNotMatch(s, /apiFetch|ReviewQuiz|quiz\/generate|quiz\/status/, f);
  }
});
