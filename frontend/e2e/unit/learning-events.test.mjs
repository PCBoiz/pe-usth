// LỚP GHI NHẬT KÝ LẦN THỬ — nửa trình duyệt.
//
// VÌ SAO CÓ FILE NÀY: lớp này hỏng trong IM LẶNG theo thiết kế (luật 3 trong
// `src/lib/learning-events.ts`). Người học không bao giờ thấy nó lỗi, API luôn
// trả 202, và một hàng rào bị gỡ ra thì không có gì đỏ ở đâu. Nên MỖI hàng rào
// phải có một ca riêng, và mỗi ca phải trượt khi gỡ đúng hàng rào đó.
//
// Bộ ghi nhận `gui`/`now`/`hen` tiêm vào được, nên cả file chạy trong Node
// thuần: không DOM, không fetch, không đồng hồ thật. Logic nằm trong hook là
// logic không có test — cùng lý lẽ với `src/lib/lesson-load.ts`.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CAU_LOI_HA_TANG,
  CAU_QUA_HAN,
  bamMa,
  dauVetTruot,
  khoangCach,
  laLoiHaTang,
  laPhienMoi,
  laQuaHan,
  loaiLoi,
  NGUONG_GOP_SUA_MS,
  sinhEid,
  soByte,
  taoBoGhi,
} from '../../src/lib/learning-events.ts';
import {
  GIOI_HAN,
  HAN_LUU_NGAY,
  KHOA_CAM_PAYLOAD,
  KIND_LAN_THU,
  LEARNING_EVENT_KINDS,
  NGUONG_PHIEN_MS,
  RE_UUID_V4,
  TRAN_BYTE_MOI_LO,
  TRAN_DEM,
  TRAN_KHOANG_CACH_MS,
} from '../../src/lib/learning-event-kinds.ts';

const GOC = new URL('../../../', import.meta.url);
const doc = (p) => readFileSync(new URL(p, GOC), 'utf8');

const BOI_CANH = { courseId: 'python_advanced', lessonNo: 97, env: 'browser' };

/**
 * Một bộ ghi để thử, kèm đồng hồ và hẹn giờ giả.
 * `lo` giữ MỌI lô đã gửi; `tick(ms)` dời đồng hồ rồi chạy các hẹn đã tới hạn.
 */
function dungBoThu({ dongY = true, boiCanh = BOI_CANH, guiNem = false } = {}) {
  const lo = [];
  let t = Date.UTC(2026, 9, 28, 3, 0, 0);
  const hens = [];
  const bo = taoBoGhi({
    gui: (x) => {
      if (guiNem) throw new Error('mạng chết');
      lo.push(x);
    },
    now: () => t,
    hen: (fn, ms) => {
      const h = { khi: t + ms, fn, huy: false };
      hens.push(h);
      return () => {
        h.huy = true;
      };
    },
  });
  if (dongY) bo.datDongY(true);
  if (boiCanh) bo.datBoiCanh(boiCanh);
  const tick = (ms) => {
    t += ms;
    for (const h of [...hens]) {
      if (!h.huy && h.khi <= t) {
        h.huy = true;
        h.fn();
      }
    }
  };
  // `dat` dời đồng hồ mà KHÔNG chạy hẹn giờ — để dựng được ca "hai lượt cách
  // nhau 90 giây" mà không vô tình đẩy một lô ở giữa.
  const dat = (ms) => {
    t += ms;
  };
  return {
    bo: Object.assign(bo, { tick, dat }),
    lo,
    tick,
    dat,
    suKien: () => lo.flatMap((x) => x.events),
  };
}

// ===========================================================================
// HAI BẢN CỦA HỢP ĐỒNG PHẢI KHỚP TỪNG KÝ TỰ
// ===========================================================================

test('learning-event-kinds.ts ở backend và frontend giống nhau từng ký tự', () => {
  const nguon = doc('src/learning-events/learning-event-kinds.ts');
  const chep = doc('frontend/src/lib/learning-event-kinds.ts');
  assert.equal(
    chep,
    nguon,
    'Hai bản của hợp đồng đã LỆCH NHAU.\n' +
      'NGUỒN là src/learning-events/learning-event-kinds.ts — sửa ở đó rồi chạy:\n' +
      '  cp src/learning-events/learning-event-kinds.ts frontend/src/lib/learning-event-kinds.ts\n' +
      'Lệch nhau nghĩa là frontend gửi một `kind` mà máy chủ không nhận (sự kiện bị bỏ\n' +
      'im lặng), hoặc đo trần theo hai con số khác nhau.',
  );
});

test('danh sách kind: 10 loại, tên chuẩn ProgSnap2 đúng chính tả, còn lại mang `X-`', () => {
  assert.equal(LEARNING_EVENT_KINDS.length, 10);
  const chuan = new Set(['Run.Test', 'Submit', 'Resource.View']);
  for (const k of chuan) assert.ok(LEARNING_EVENT_KINDS.includes(k), `thiếu tên chuẩn ${k}`);
  for (const k of LEARNING_EVENT_KINDS) {
    if (!chuan.has(k)) assert.ok(k.startsWith('X-'), `${k} không chuẩn mà cũng không có X-`);
  }
  assert.deepEqual([...KIND_LAN_THU], ['Run.Test', 'Submit']);
});

// ===========================================================================
// HÀNG RÀO 1 — CỔNG ĐỒNG Ý
// ===========================================================================

test('CHƯA đồng ý: không gom, không gửi, hàng chờ RỖNG', () => {
  // Gom trước rồi "đợi đồng ý" vẫn là thu thập — nếu họ không bao giờ đồng ý
  // thì ta đã giữ một bản ghi hành vi của họ suốt phiên mà không được phép.
  const { bo, lo, tick } = dungBoThu({ dongY: false });
  for (let i = 0; i < 100; i++) bo.ghi('X-Lesson.Heartbeat');
  bo.ghiLuotChay({ submit: true, code: 'x=1', tests: [], total: 1, machineMs: 10 });
  bo.ghiBamDung();
  bo.ghiSuaMa();
  assert.equal(bo.dangCho(), 0, 'đã xếp sự kiện vào hàng chờ khi chưa đồng ý');
  bo.day();
  tick(60_000);
  assert.equal(lo.length, 0, 'đã GỬI khi chưa đồng ý');
});

test('mặc định là TẮT — `daDongY()` false khi chưa ai bật', () => {
  const bo = taoBoGhi({ gui: () => {} });
  assert.equal(bo.daDongY(), false);
});

test('RÚT LẠI đồng ý thì XOÁ hàng chờ, KHÔNG đẩy nốt', () => {
  // Đẩy nốt "cho khỏi mất dữ liệu" là gửi đúng thứ người ta vừa nói đừng gửi.
  const { bo, lo, tick } = dungBoThu();
  bo.ghi('X-Lesson.Open');
  bo.ghi('X-Lesson.Heartbeat');
  assert.equal(bo.dangCho(), 2);
  bo.datDongY(false);
  assert.equal(bo.dangCho(), 0);
  bo.day();
  tick(60_000);
  assert.equal(lo.length, 0, 'đã đẩy nốt hàng chờ sau khi rút lại đồng ý');
});

test('rút lại rồi đồng ý lại thì KHÔNG hồi sinh dữ liệu cũ', () => {
  const { bo, lo } = dungBoThu();
  bo.ghi('X-Lesson.Open');
  bo.datDongY(false);
  bo.datDongY(true);
  bo.day();
  assert.equal(lo.length, 0);
  bo.ghi('X-Lesson.Open');
  bo.day();
  assert.equal(lo[0].events.length, 1, 'lô mới phải chỉ có sự kiện sau khi đồng ý lại');
});

// ===========================================================================
// HÀNG RÀO 2 — KHÔNG GHI Ở TRANG CÔNG KHAI
// ===========================================================================

test('CHƯA có bối cảnh bài học: không gom, không gửi (chặn tạo tài khoản khách)', () => {
  // `apiFetch` gặp 401 là tự `ensureGuest()`. Gọi nó ở một trang công khai
  // nghĩa là mỗi bot quét web sinh một tài khoản khách. Đây là hàng rào CẤU
  // TRÚC cho luật đó: không có bài học nào đang mở thì không có đường nào gửi.
  const { bo, lo, tick } = dungBoThu({ boiCanh: null });
  assert.equal(bo.daDongY(), true, 'ca này phải chạy với đồng ý ĐÃ bật');
  for (let i = 0; i < 50; i++) bo.ghi('X-Lesson.Heartbeat');
  bo.ghiLuotChay({ submit: false, code: 'x', tests: [], total: 1, machineMs: 1 });
  assert.equal(bo.dangCho(), 0);
  tick(60_000);
  assert.equal(lo.length, 0);
});

test('chỉ `apiFetch` được dùng, và chỉ ở lớp này', () => {
  const nguon = doc('frontend/src/lib/learning-events.ts');
  // Đuôi `.ts` trong specifier là CỐ Ý: bộ test này chạy `node --test` trên
  // chính file .ts, mà ESM của Node không tự thêm đuôi cho specifier tương đối.
  assert.match(nguon, /import \{ apiFetch \} from '\.\/api\.ts'/);
  // Không có đường nào khác ra mạng: một `fetch(` trần bỏ qua cả phần đính
  // Authorization lẫn phần refresh, nên nó sẽ 401 mãi và im lặng mất dữ liệu.
  const khongChuThich = nguon
    .replace(/\r/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  assert.equal(
    (khongChuThich.match(/(?<!api)\bfetch\s*\(/g) ?? []).length,
    0,
    'có một lời gọi fetch() trần — phải đi qua apiFetch',
  );
});

test('KHÔNG trang công khai nào import lớp ghi nhật ký', () => {
  // Trang chủ và /courses/* và /ide không được kéo lớp này vào: `apiFetch` ở đó
  // là mỗi bot một tài khoản khách. Hàng rào bối cảnh đã chặn việc GỬI, ca này
  // chặn việc ai đó gỡ hàng rào đó rồi tưởng là an toàn.
  for (const p of [
    'frontend/src/app/page.tsx',
    'frontend/src/app/ide/IdeClient.tsx',
    'frontend/src/lib/ide-runner.ts',
  ]) {
    let s;
    try {
      s = doc(p);
    } catch {
      continue; // file đổi tên thì ca khác lo
    }
    assert.ok(
      !s.includes('learning-events'),
      `${p} import lớp ghi nhật ký — xem bẫy apiFetch ở trang công khai trong AGENTS.md`,
    );
  }
});

// ===========================================================================
// HÀNG RÀO 3 — KHÔNG BAO GIỜ GỬI MÃ NGUỒN, KỂ CẢ HASH
// ===========================================================================

test('không một payload nào mang khoá trong danh sách CẤM', () => {
  const { bo, suKien } = dungBoThu();
  const ma = 'def solve(data):\n    return data["x"]\n';
  // Đi qua MỌI đường phát sự kiện, kể cả hai đường chỉ chạy khi trượt lặp lại.
  bo.ghi('X-Lesson.Open');
  bo.ghiSuaMa();
  bo.ghiLuotChay({
    submit: false, code: ma, total: 2,
    tests: [{ name: 'ca 1', passed: false }, { name: 'ca 2', passed: true }],
    error: "Traceback...\nKeyError: 'x'", machineMs: 42,
  });
  bo.ghiLuotChay({
    submit: true, code: ma, total: 2,
    tests: [{ name: 'ca 1', passed: false }, { name: 'ca 2', passed: true }],
    error: "Traceback...\nKeyError: 'x'", machineMs: 44,
  });
  bo.ghiLuotChay({ submit: true, code: ma, tests: [], total: 1, machineMs: 5, error: CAU_QUA_HAN });
  bo.ghiLuotChay({
    submit: true, code: ma, tests: [], total: 1, machineMs: 0,
    error: CAU_LOI_HA_TANG[0],
  });
  bo.ghiBamDung();
  bo.day();

  const ds = suKien();
  assert.ok(ds.length >= 5, 'phải có đủ sự kiện để kiểm');
  for (const e of ds) {
    for (const khoa of KHOA_CAM_PAYLOAD) {
      assert.ok(
        !(e.payload && khoa in e.payload),
        `sự kiện ${e.kind} mang khoá cấm \`${khoa}\``,
      );
    }
    // Và không chuỗi nào trong payload chứa nguyên văn mã của người học.
    const phang = JSON.stringify(e.payload ?? {});
    assert.ok(!phang.includes('def solve'), `sự kiện ${e.kind} chở mã nguồn nguyên văn`);
  }
});

test('thay cho hash: `sameAsPrev` một bit, `repeatStreak` một số', () => {
  const { bo, suKien } = dungBoThu();
  const luot = {
    submit: false, code: 'x=1', total: 1,
    tests: [{ name: 'ca 1', passed: false }], error: 'ValueError: sai', machineMs: 3,
  };
  bo.ghiLuotChay(luot);
  bo.dat(1000);
  bo.ghiLuotChay(luot);
  bo.day();
  const chay = suKien().filter((e) => KIND_LAN_THU.includes(e.kind));
  assert.equal(chay[0].payload.sameAsPrev, false);
  assert.equal(chay[1].payload.sameAsPrev, true);
  assert.equal(typeof chay[1].payload.sameAsPrev, 'boolean');
});

test('`bamMa` dùng Math.imul — khác nhau cho mã khác nhau, ổn định cho mã giống nhau', () => {
  assert.equal(bamMa('x=1'), bamMa('x=1'));
  assert.notEqual(bamMa('x=1'), bamMa('x=2'));
  assert.match(bamMa(''), /^[0-9a-f]{8}$/);
  // `h * 16777619` vượt 2^53 và mất bit thấp -> hash đụng nhau hàng loạt.
  const nguon = doc('frontend/src/lib/learning-events.ts');
  assert.match(nguon, /Math\.imul\(h, 0x01000193\)/);
});

// ===========================================================================
// PHÂN NHÁNH MỘT LƯỢT CHẠY
// ===========================================================================

test('lỗi HẠ TẦNG -> X-Runtime.Failure, KHÔNG tính là một lần thử', () => {
  // Trộn nó vào lượt trượt là biến một sự cố của mình thành "bài này khó": nếu
  // worker không nạp được thì cả cohort "trượt" bài đó.
  for (const cau of CAU_LOI_HA_TANG) {
    const { bo, suKien } = dungBoThu();
    bo.ghiLuotChay({ submit: true, code: 'x', tests: [], total: 1, machineMs: 0, error: cau });
    bo.day();
    const ds = suKien();
    assert.equal(ds.length, 1);
    assert.equal(ds[0].kind, 'X-Runtime.Failure');
    assert.ok(!KIND_LAN_THU.includes(ds[0].kind));
  }
});

test('QUÁ HẠN 5 giây -> X-Run.Interrupted(timeout), KHÔNG tính là một lần thử', () => {
  // Đếm nó vào "số lần thử tới khi đạt" thì một vòng lặp vô hạn làm phồng con
  // số của một bài mà người học giải xong ở lượt thứ hai.
  const { bo, suKien } = dungBoThu();
  bo.ghiLuotChay({
    submit: false, code: 'while True: pass', tests: [], total: 1, machineMs: 5000,
    error: `Chương trình ${CAU_QUA_HAN}. Kiểm tra vòng lặp vô hạn.`,
  });
  bo.day();
  const ds = suKien();
  assert.equal(ds.length, 1);
  assert.equal(ds[0].kind, 'X-Run.Interrupted');
  assert.equal(ds[0].payload.reason, 'timeout');
});

test('bấm Dừng -> X-Run.Interrupted(stop)', () => {
  const { bo, suKien } = dungBoThu();
  bo.ghiBamDung('s4-sandbox');
  bo.day();
  assert.equal(suKien()[0].kind, 'X-Run.Interrupted');
  assert.equal(suKien()[0].payload.reason, 'stop');
  assert.equal(suKien()[0].screenKey, 's4-sandbox');
});

test('Chạy thử -> Run.Test, Nộp -> Submit (ProgSnap2 tách hai loại)', () => {
  const { bo, suKien } = dungBoThu();
  const t = [{ name: 'ca 1', passed: true }];
  bo.ghiLuotChay({ submit: false, code: 'a', tests: t, total: 1, machineMs: 1 });
  bo.dat(1000);
  bo.ghiLuotChay({ submit: true, code: 'a', tests: t, total: 1, machineMs: 1 });
  bo.day();
  assert.deepEqual(suKien().map((e) => e.kind), ['Run.Test', 'Submit']);
});

test('`passed` đúng chỉ khi KHÔNG lỗi và ĐỦ số ca và không ca nào trượt', () => {
  const ca = (x) => {
    const { bo, suKien } = dungBoThu();
    bo.ghiLuotChay({ submit: true, code: 'a', machineMs: 1, ...x });
    bo.day();
    return suKien()[0].payload.passed;
  };
  assert.equal(ca({ tests: [{ name: 'a', passed: true }], total: 1 }), true);
  assert.equal(ca({ tests: [{ name: 'a', passed: false }], total: 1 }), false);
  // Thiếu ca: bộ chấm dừng giữa đường. Coi là đạt thì "số lần thử tới khi đạt"
  // của một bài hay nổ giữa bộ chấm trông đẹp hơn thực tế.
  assert.equal(ca({ tests: [{ name: 'a', passed: true }], total: 3 }), false);
  assert.equal(ca({ tests: [], total: 0 }), false);
  assert.equal(
    ca({ tests: [{ name: 'a', passed: true }], total: 1, error: 'ValueError: x' }),
    false,
  );
});

// ===========================================================================
// TRƯỢT Y HỆT LẶP LẠI
// ===========================================================================

test('trượt y hệt 2 lần -> X-Repeat.Fail với repeatStreak tăng dần', () => {
  const { bo, suKien } = dungBoThu();
  const luot = {
    submit: false, code: 'x=1', total: 2,
    tests: [{ name: 'ca 1', passed: false }, { name: 'ca 2', passed: false }],
    error: 'ValueError: sai', machineMs: 2,
  };
  for (let i = 0; i < 3; i++) {
    bo.ghiLuotChay(luot);
    bo.dat(1000);
  }
  bo.day();
  const lap = suKien().filter((e) => e.kind === 'X-Repeat.Fail');
  assert.deepEqual(lap.map((e) => e.payload.repeatStreak), [2, 3]);
});

test('ĐỔI mã thì chuỗi đâm tường BẮT ĐẦU LẠI, không nối tiếp', () => {
  const { bo, suKien } = dungBoThu();
  const nen = {
    submit: false, total: 1, tests: [{ name: 'ca 1', passed: false }],
    error: 'ValueError: sai', machineMs: 2,
  };
  bo.ghiLuotChay({ ...nen, code: 'x=1' });
  bo.ghiLuotChay({ ...nen, code: 'x=1' });   // streak 2
  bo.ghiLuotChay({ ...nen, code: 'x=2' });   // mã khác -> về 1
  bo.day();
  const lap = suKien().filter((e) => e.kind === 'X-Repeat.Fail');
  assert.deepEqual(lap.map((e) => e.payload.repeatStreak), [2]);
});

test('ĐẠT rồi thì chuỗi đâm tường được XOÁ — nếu không `repeatStreak` nói sai', () => {
  const { bo, suKien } = dungBoThu();
  const truot = {
    submit: false, code: 'x=1', total: 1, tests: [{ name: 'ca 1', passed: false }],
    error: 'ValueError: sai', machineMs: 2,
  };
  bo.ghiLuotChay(truot);
  bo.ghiLuotChay(truot); // streak 2
  bo.ghiLuotChay({ submit: false, code: 'ok', total: 1, tests: [{ name: 'ca 1', passed: true }], machineMs: 2 });
  bo.ghiLuotChay(truot); // phải về 1, không phải 3
  bo.ghiLuotChay(truot); // 2
  bo.day();
  const lap = suKien().filter((e) => e.kind === 'X-Repeat.Fail');
  assert.deepEqual(lap.map((e) => e.payload.repeatStreak), [2, 2]);
});

test('`dauVetTruot` SẮP XẾP tập ca trượt — không sắp thì bộ đếm không bao giờ lên', () => {
  const a = dauVetTruot({ codeHash: 'aa', failed: ['ca 2', 'ca 1'], errorType: null });
  const b = dauVetTruot({ codeHash: 'aa', failed: ['ca 1', 'ca 2'], errorType: null });
  assert.equal(a, b);
  assert.notEqual(
    a,
    dauVetTruot({ codeHash: 'aa', failed: ['ca 1'], errorType: null }),
  );
});

// ===========================================================================
// THỜI GIAN: HAI HẰNG CÓ TIỀN LỆ, VÀ HAI PHÂN PHỐI KHÔNG ĐƯỢC TRỘN
// ===========================================================================

test('`sincePrevMs` null ở lượt đầu và khi vượt trần 10 phút (luật DataShop)', () => {
  assert.equal(khoangCach(undefined, 1000), null, 'lượt đầu phải null, không phải 0');
  assert.equal(khoangCach(0, 500), 500);
  assert.equal(khoangCach(0, TRAN_KHOANG_CACH_MS), TRAN_KHOANG_CACH_MS);
  // Quá 10 phút thì nó không còn đo "người này nghĩ bao lâu" mà đo "người này
  // đi đâu đó" — một con số 40 phút nằm trong trung bình sẽ kéo lệch đúng thứ
  // mình muốn đọc.
  assert.equal(khoangCach(0, TRAN_KHOANG_CACH_MS + 1), null);
  // Đồng hồ client nhảy lùi (NTP đồng bộ giữa phiên) -> âm -> null, không ghi
  // một con số âm vào cột thời gian.
  assert.equal(khoangCach(5000, 1000), null);
  assert.equal(TRAN_KHOANG_CACH_MS, 10 * 60 * 1000);
});

test('`newSession` theo ngưỡng 5 phút của Jadud, KHÁC trần 10 phút', () => {
  assert.equal(NGUONG_PHIEN_MS, 5 * 60 * 1000);
  assert.notEqual(NGUONG_PHIEN_MS, TRAN_KHOANG_CACH_MS, 'hai hằng này không được gộp');
  assert.equal(laPhienMoi(undefined, 0), true);
  assert.equal(laPhienMoi(0, NGUONG_PHIEN_MS), false);
  assert.equal(laPhienMoi(0, NGUONG_PHIEN_MS + 1), true);
});

test('lượt chạy mang CẢ `machineMs` lẫn `sincePrevMs` — máy và người là hai trường', () => {
  // 26 bài biểu đồ trả thêm ~0,8 s chỉ để xuất PNG, lần import matplotlib đầu
  // từng đo được 5,62 s, và 27 bài chạy TRÊN MÁY người học. Gộp thời gian máy
  // với thời gian người là lấy trung bình của hai thứ khác loại.
  const { bo, suKien } = dungBoThu();
  bo.ghiLuotChay({ submit: true, code: 'a', tests: [{ name: 'x', passed: true }], total: 1, machineMs: 812 });
  bo.dat(90_000);
  bo.ghiLuotChay({ submit: true, code: 'b', tests: [{ name: 'x', passed: true }], total: 1, machineMs: 37 });
  bo.day();
  const ds = suKien();
  assert.equal(ds[0].payload.machineMs, 812);
  assert.equal(ds[0].payload.sincePrevMs, null);
  assert.equal(ds[1].payload.machineMs, 37);
  assert.equal(ds[1].payload.sincePrevMs, 90_000);
});

test('`env` đính vào MỌI sự kiện, không chỉ sự kiện chạy', () => {
  // Câu SQL gộp thời gian phải nhóm theo nó, kể cả khi gộp thời gian ĐỌC bài.
  const { bo, suKien } = dungBoThu();
  bo.ghi('X-Lesson.Open');
  bo.ghi('X-Lesson.Heartbeat');
  bo.ghiBamDung();
  bo.day();
  for (const e of suKien()) assert.equal(e.payload.env, 'browser', `thiếu env ở ${e.kind}`);
});

test('bài không khai `env` thì không bịa ra giá trị nào', () => {
  const { bo, suKien } = dungBoThu({
    boiCanh: { courseId: 'c', lessonNo: 1 },
  });
  bo.ghi('X-Lesson.Open');
  bo.day();
  assert.equal(suKien()[0].payload, null);
});

// ===========================================================================
// TÍN HIỆU SỬA/CHẠY
// ===========================================================================

test('`editsSinceLastRun` đếm rồi RESET ở mỗi lượt chạy', () => {
  // Nhiều SỬA + ít CHẠY = tắc ngữ nghĩa; nhiều SỬA + nhiều CHẠY = tắc cú pháp.
  // Không reset thì con số thành "tổng số lần sửa", và tỉ số mất hết nghĩa.
  const { bo, suKien } = dungBoThu();
  const sua = (n) => {
    for (let i = 0; i < n; i++) {
      bo.ghiSuaMa();
      bo.dat(NGUONG_GOP_SUA_MS + 1); // mỗi lần là một ĐỢT gõ riêng
    }
  };
  sua(12);
  bo.ghiLuotChay({ submit: false, code: 'a', tests: [{ name: 'x', passed: false }], total: 1, machineMs: 1 });
  sua(2);
  bo.ghiLuotChay({ submit: false, code: 'b', tests: [{ name: 'x', passed: false }], total: 1, machineMs: 1 });
  bo.day();
  const chay = suKien().filter((e) => KIND_LAN_THU.includes(e.kind));
  assert.deepEqual(chay.map((e) => e.payload.editsSinceLastRun), [12, 2]);
});

test('các lần gõ liên tiếp GỘP thành MỘT lần sửa', () => {
  // `onCodeChange` của Monaco bắn mỗi ký tự. Đếm thẳng thì `editsSinceLastRun`
  // là "số ký tự đã gõ" — một con số đo tốc độ đánh máy, không đo số lần người
  // học QUYẾT ĐỊNH đổi mã.
  const { bo, suKien } = dungBoThu();
  for (let i = 0; i < 40; i++) {
    bo.ghiSuaMa();
    bo.dat(50); // gõ liên tục, 20 ký tự/giây
  }
  bo.ghiLuotChay({ submit: false, code: 'a', tests: [{ name: 'x', passed: true }], total: 1, machineMs: 1 });
  bo.day();
  const chay = suKien().filter((e) => KIND_LAN_THU.includes(e.kind))[0];
  assert.ok(
    chay.payload.editsSinceLastRun <= 3,
    `40 ký tự gõ liên tục thành ${chay.payload.editsSinceLastRun} lần sửa — chưa gộp`,
  );
  assert.ok(chay.payload.editsSinceLastRun >= 1, 'gộp quá tay thành 0 lần sửa');
});

test('`ghiSuaMa` KHÔNG phát sự kiện nào — một bộ đếm, không phải click-stream', () => {
  // Blackbox cố ý chọn mức dòng thay vì click-stream vì "data-cleaning proved
  // to be a significant problem". Một sự kiện mỗi lần gõ nhân số hàng lên hàng
  // trăm lần mà cho ra đúng con số một bộ đếm cho ra.
  const { bo, lo, tick } = dungBoThu();
  for (let i = 0; i < 500; i++) bo.ghiSuaMa();
  assert.equal(bo.dangCho(), 0);
  tick(60_000);
  assert.equal(lo.length, 0);
});

// ===========================================================================
// GOM LÔ VÀ ĐẨY
// ===========================================================================

test('đẩy khi đủ NGƯỠNG SỐ LƯỢNG, không chờ hết đồng hồ', () => {
  const { bo, lo } = dungBoThu();
  for (let i = 0; i < 20; i++) bo.ghi('X-Lesson.Heartbeat');
  assert.equal(lo.length, 1);
  assert.equal(lo[0].events.length, 20);
  assert.equal(bo.dangCho(), 0);
});

test('đẩy khi hết ĐỒNG HỒ dù chưa đủ số lượng', () => {
  const { bo, lo, tick } = dungBoThu();
  bo.ghi('X-Lesson.Open');
  assert.equal(lo.length, 0);
  tick(10_000);
  assert.equal(lo.length, 1);
  assert.equal(bo.dangCho(), 0);
});

test('đồng hồ chỉ chạy khi CÓ sự kiện chờ — không gửi lô rỗng', () => {
  const { lo, tick } = dungBoThu();
  tick(600_000);
  assert.equal(lo.length, 0);
});

test('mỗi lô mang `sentAt` (stm) — mốc GỬI, một giá trị cho cả lô', () => {
  const { bo, lo } = dungBoThu();
  bo.ghi('X-Lesson.Open');
  bo.dat(5_000);
  bo.ghi('X-Lesson.Heartbeat');
  bo.day();
  assert.equal(lo.length, 1);
  assert.equal(typeof lo[0].sentAt, 'string');
  // `clientAt` của hai sự kiện KHÁC nhau (mốc TẠO), `sentAt` thì một giá trị:
  // thiếu phân biệt này là mất mốc suy ra ở máy chủ.
  assert.notEqual(lo[0].events[0].clientAt, lo[0].events[1].clientAt);
  assert.ok(lo[0].sentAt >= lo[0].events[1].clientAt);
});

test('mọi sự kiện có `eid` UUID v4 và không trùng nhau', () => {
  const { bo, suKien } = dungBoThu();
  for (let i = 0; i < 30; i++) bo.ghi('X-Lesson.Heartbeat');
  bo.day();
  bo.day();
  const ds = suKien();
  const tap = new Set(ds.map((e) => e.eid));
  assert.equal(tap.size, ds.length, '`eid` bị trùng — mất khả năng khử trùng ở máy chủ');
  for (const e of ds) assert.match(e.eid, RE_UUID_V4, `eid sai hình dạng: ${e.eid}`);
});

test('`sinhEid` có đường dự phòng khi thiếu crypto.randomUUID', () => {
  // `crypto.randomUUID` chỉ có trong secure context: một bản xem qua
  // `http://<ip>` thì không có, và khi đó `eid` rỗng làm máy chủ BỎ sự kiện.
  // `globalThis.crypto` trong Node là thuộc tính CHỈ CÓ GETTER, nên phải
  // defineProperty chứ không gán thẳng.
  const cu = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const dat = (v) =>
    Object.defineProperty(globalThis, 'crypto', { value: v, configurable: true, writable: true });
  try {
    dat({ getRandomValues: (b) => b.fill(7) });
    assert.match(sinhEid(), RE_UUID_V4);
    dat(undefined);
    assert.match(sinhEid(), RE_UUID_V4);
  } finally {
    if (cu) Object.defineProperty(globalThis, 'crypto', cu);
  }
});

test('TRẦN BYTE: lô nặng bị tách, phần dư Ở LẠI hàng chờ', () => {
  // Trần 64 KiB của `keepalive` là ngân sách GỘP, và vượt trần trả về network
  // error KHÔNG phân biệt được với mất mạng — máy chủ không bao giờ thấy. Nên
  // phải đo trước khi gửi, không để nó tự nổ.
  const { bo, lo } = dungBoThu();
  const nang = 'đ'.repeat(400); // ~1,2 KB mỗi chuỗi sau khi JSON hoá
  for (let i = 0; i < 19; i++) {
    bo.ghi('Run.Test', { payload: { a: nang, b: nang, c: nang, d: nang, e: nang } });
  }
  bo.day();
  assert.ok(lo.length >= 1);
  assert.ok(soByte(lo[0].events) <= TRAN_BYTE_MOI_LO, 'lô đầu đã vượt trần byte');
  assert.ok(lo[0].events.length < 19, 'lô phải bị TÁCH, không gửi hết một lần');
  assert.ok(bo.dangCho() > 0, 'phần dư phải Ở LẠI hàng chờ, không bị bỏ');
  // Và phần dư đi được ở lô sau — không tắc vĩnh viễn.
  const con = bo.dangCho();
  bo.day();
  assert.ok(bo.dangCho() < con);
});

test('một sự kiện MỘT MÌNH vượt trần vẫn được gửi — không tắc hàng chờ', () => {
  // Giữ nó lại thì hàng chờ tắc vĩnh viễn và mọi sự kiện sau cũng không đi.
  // Máy chủ sẽ từ chối nó bằng 400 — hỏng ồn ào, đúng chiều cần.
  const { bo, lo } = dungBoThu();
  bo.ghi('Run.Test', { payload: { a: 'x'.repeat(TRAN_BYTE_MOI_LO + 5_000) } });
  bo.ghi('X-Lesson.Heartbeat');
  bo.day();
  assert.equal(lo[0].events.length, 1);
  assert.equal(bo.dangCho(), 1);
});

test('TRẦN SỐ LƯỢNG mỗi lô không vượt trần của máy chủ', () => {
  const { bo, lo } = dungBoThu();
  // Đặt 120 sự kiện vào hàng chờ mà không để ngưỡng tự đẩy: gọi `ghi` thì nó
  // tự đẩy ở mốc 20, nên kiểm ngay trên các lô đã gửi.
  for (let i = 0; i < 120; i++) bo.ghi('X-Lesson.Heartbeat');
  bo.day();
  for (const l of lo) {
    assert.ok(
      l.events.length <= GIOI_HAN.suKienMoiLo,
      `một lô có ${l.events.length} sự kiện, vượt trần ${GIOI_HAN.suKienMoiLo} của máy chủ`,
    );
  }
});

test('ĐỆM có trần, bỏ CÁI CŨ NHẤT ở mốc TRAN_DEM', () => {
  // Phình tới mức này nghĩa là KHÔNG CÓ LƯỢT ĐẨY NÀO xảy ra giữa các sự kiện,
  // và thứ đáng giữ khi đó là trạng thái GẦN ĐÂY của người học, không phải lịch
  // sử đầu phiên.
  //
  // ĐỌC KỸ `nguongSoLuong: Infinity`: ở cấu hình MẶC ĐỊNH trần này KHÔNG VỚI
  // TỚI ĐƯỢC, và nói ra thì tốt hơn là để người sau tưởng nó đang làm việc.
  // `ghi()` gọi `day()` ngay khi hàng chờ đạt 20, mà `day()` luôn lấy ra ít
  // nhất một sự kiện — nên hàng chờ dao động quanh 20 và không bao giờ tới
  // 1000. Trần là một CHẶN TRÊN phòng xa cho ngày chính sách đẩy đổi (ví dụ
  // thêm một phép "đang có lô bay thì chưa gửi lô mới"), không phải một đường
  // đang chạy. Ca này dựng lại đúng tình huống đó bằng cách bỏ cửa đẩy theo số
  // lượng và không dời đồng hồ.
  const lo = [];
  const bo = taoBoGhi({
    gui: (x) => lo.push(x),
    now: () => 0,
    hen: () => () => {},
    nguongSoLuong: Infinity,
  });
  bo.datDongY(true);
  bo.datBoiCanh(BOI_CANH);
  for (let i = 0; i < TRAN_DEM + 500; i++) bo.ghi('X-Lesson.Heartbeat', { payload: { i } });
  assert.equal(lo.length, 0, 'ca này phải chạy khi KHÔNG có lượt đẩy nào');
  assert.ok(bo.dangCho() <= TRAN_DEM, `hàng chờ ${bo.dangCho()} vượt trần ${TRAN_DEM}`);
  // Bỏ CÁI CŨ NHẤT, không phải cái mới nhất: sự kiện còn lại phải là đoạn CUỐI.
  bo.day();
  const i0 = lo[0].events[0].payload.i;
  assert.ok(i0 >= 500, `giữ lại sự kiện cũ nhất (i=${i0}) — phải bỏ cái cũ, giữ cái mới`);
});

test('HỎNG LÀ IM LẶNG: `gui` ném thì không ném ra ngoài, bài học không việc gì', () => {
  const { bo } = dungBoThu({ guiNem: true });
  assert.doesNotThrow(() => {
    for (let i = 0; i < 25; i++) bo.ghi('X-Lesson.Heartbeat');
    bo.ghiLuotChay({ submit: true, code: 'a', tests: [], total: 1, machineMs: 1 });
    bo.day();
  });
});

test('ĐỔI BÀI thì đẩy sự kiện của bài CŨ trước — lô không trộn hai bài', () => {
  const { bo, lo } = dungBoThu();
  bo.ghi('X-Lesson.Open');
  bo.datBoiCanh({ ...BOI_CANH, lessonNo: 98 });
  bo.ghi('X-Lesson.Open');
  bo.day();
  assert.equal(lo.length, 2);
  assert.equal(lo[0].events[0].lessonNo, 97);
  assert.equal(lo[1].events[0].lessonNo, 98);
});

test('bộ đếm theo BÀI, không dùng chung giữa các bài', () => {
  const { bo, suKien } = dungBoThu();
  const t = [{ name: 'x', passed: false }];
  bo.ghiLuotChay({ submit: false, code: 'a', tests: t, total: 1, machineMs: 1 });
  bo.ghiLuotChay({ submit: false, code: 'a', tests: t, total: 1, machineMs: 1 });
  bo.datBoiCanh({ ...BOI_CANH, lessonNo: 98 });
  bo.ghiLuotChay({ submit: false, code: 'a', tests: t, total: 1, machineMs: 1 });
  bo.day();
  const chay = suKien().filter((e) => KIND_LAN_THU.includes(e.kind));
  assert.deepEqual(chay.map((e) => [e.lessonNo, e.payload.attemptNo]), [
    [97, 1], [97, 2], [98, 1],
  ]);
});

// ===========================================================================
// TÁCH LOẠI LỖI
// ===========================================================================

test('`loaiLoi` lấy DÒNG CUỐI dạng `TênLỗi: nội dung`', () => {
  // Phần giữa traceback mang số dòng và đường dẫn file tạm, nên dùng nó thì hai
  // lượt giống nhau lại ra hai chữ ký khác nhau và "trượt y hệt" không bắt được gì.
  const tb = [
    'Traceback (most recent call last):',
    '  File "/tmp/xyz123/main.py", line 7, in <module>',
    '    solve(data)',
    '  File "/tmp/xyz123/main.py", line 3, in solve',
    "    return data['doanh_thu']",
    "KeyError: 'doanh_thu'",
  ].join('\n');
  assert.deepEqual(loaiLoi(tb), {
    errorType: 'KeyError',
    errorMessage: "KeyError: 'doanh_thu'",
  });
  assert.deepEqual(loaiLoi(undefined), { errorType: null, errorMessage: null });
  assert.equal(loaiLoi('SyntaxError: invalid syntax').errorType, 'SyntaxError');
  assert.equal(loaiLoi('MatplotlibDeprecationWarning: x').errorType, 'MatplotlibDeprecationWarning');
  // Không nhận diện được loại thì vẫn giữ dòng cuối làm nội dung, đừng trả rỗng.
  assert.equal(loaiLoi('mot cau khong co loai').errorMessage, 'mot cau khong co loai');
});

test('số dòng/đường dẫn tạm KHÁC nhau vẫn cho CÙNG chữ ký trượt', () => {
  const lam = (n) =>
    `Traceback:\n  File "/tmp/ab${n}/main.py", line ${n}, in solve\nValueError: sai`;
  const a = loaiLoi(lam(3));
  const b = loaiLoi(lam(9));
  assert.equal(a.errorType, b.errorType);
  assert.equal(
    dauVetTruot({ codeHash: 'h', failed: [], errorType: a.errorType }),
    dauVetTruot({ codeHash: 'h', failed: [], errorType: b.errorType }),
  );
});

test('câu lỗi HẠ TẦNG còn nằm trong pyodide-runner.ts', () => {
  // Phép phân biệt "lỗi hạ tầng" so với "lỗi người học" nhận diện theo CÂU DO
  // MÌNH SINH RA. Đổi câu ở runner mà không đổi ở đây thì mọi sự cố hạ tầng bị
  // ghi thành lượt trượt của người học — và bài đó trông như khó.
  const runner = doc('frontend/src/components/python-studio/runner/pyodide-runner.ts');
  for (const cau of CAU_LOI_HA_TANG) {
    assert.ok(
      runner.includes(cau),
      `chuỗi "${cau}" không còn trong pyodide-runner.ts — cập nhật CAU_LOI_HA_TANG`,
    );
  }
  assert.ok(
    runner.includes(CAU_QUA_HAN),
    `chuỗi "${CAU_QUA_HAN}" không còn trong pyodide-runner.ts — cập nhật CAU_QUA_HAN`,
  );
  assert.equal(laLoiHaTang(CAU_QUA_HAN), false, 'quá hạn KHÔNG phải lỗi hạ tầng');
  assert.equal(laQuaHan(CAU_LOI_HA_TANG[0]), false);
  assert.equal(laLoiHaTang(undefined), false);
});

// ===========================================================================
// ĐƯỜNG GỬI VÀ HẠN LƯU
// ===========================================================================

test('đẩy ở `visibilitychange`, KHÔNG dùng unload/beforeunload', () => {
  // `application/json` + `Authorization` khác origin buộc PREFLIGHT, mà
  // preflight không hoàn thành được trong lúc trang unload (posthog-js
  // 1.399.4, PR #4139). Ở mốc `hidden` trang còn sống nên preflight xong bình
  // thường. Và `unload` đã bị Chrome gỡ 100% ở Chrome 155.
  const nguon = doc('frontend/src/lib/learning-events.ts');
  assert.match(nguon, /addEventListener\('visibilitychange'/);
  const khongChuThich = nguon
    .replace(/\r/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  assert.ok(
    !/addEventListener\('(unload|beforeunload)'/.test(khongChuThich),
    'đã gắn unload/beforeunload — xem lý do ở đầu learning-events.ts',
  );
  assert.match(nguon, /keepalive: true/);
});

test('hạn lưu được nói ra ở đúng một chỗ, và câu DELETE tồn tại', () => {
  assert.equal(HAN_LUU_NGAY, 90);
  const sql = doc('scripts/learning-events/truy-van.sql');
  assert.match(sql, /DELETE\s+FROM\s+learning_events/i);
  assert.ok(sql.includes(String(HAN_LUU_NGAY)), 'câu DELETE không dẫn về HAN_LUU_NGAY');
});

test('ba câu SQL đếm SỐ NGƯỜI và đọc theo thứ bậc, không tính phần trăm', () => {
  // Ở n = 20–40 một tỉ lệ có khoảng tin cậy rộng hơn chính nó; và đếm SỰ KIỆN
  // thay vì NGƯỜI làm một người sốt ruột trông như cả cohort đang tắc.
  const sql = doc('scripts/learning-events/truy-van.sql');
  assert.match(sql, /count\(DISTINCT user_id\)/);
  assert.match(sql, /percentile_cont\(0\.5\)/, 'phải dùng trung vị, không trung bình');
  assert.ok(!/\bavg\s*\(/i.test(sql), 'có avg() — ở n nhỏ một ngoại lai kéo cả con số');
  // `kind IN ('Run.Test','Submit')`, không phải một phép so bằng.
  assert.match(sql, /kind IN \('Run\.Test', 'Submit'\)/);
});
