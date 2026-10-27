import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BadRequestException } from '@nestjs/common';

import {
  GIOI_HAN,
  HAN_LUU_NGAY,
  KHOA_CAM_PAYLOAD,
  KIND_LAN_THU,
  LEARNING_EVENT_KINDS,
  RE_UUID_V4,
  TRAN_BYTE_MOI_LO,
  laKindHopLe,
} from './learning-event-kinds';
import {
  catChuoi,
  catGiaTri,
  gioClientHoacNull,
  locLo,
  locSuKien,
  soByte,
} from './learning-events.sanitize';

/** UUID v4 hợp lệ, khác nhau mỗi lần — `eid` là bắt buộc trên mọi sự kiện. */
let demEid = 0;
function eid(): string {
  demEid += 1;
  const h = demEid.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${h}`;
}

/**
 * Hàng rào của lớp ghi nhật ký lần thử.
 *
 * ĐỌC TRƯỚC KHI SỬA — vì sao các ca ở đây dùng hình dạng ĐẦY ĐỦ chứ không
 * `{ kind: 'x' }`: AGENTS.md ghi một bẫy đã xảy ra thật — `quizzes.service.spec.ts`
 * từng khẳng định "không bao giờ lộ đáp án" bằng fixture `options: ['a','b']`
 * trong khi dữ liệu thật là mảng object mang cờ `correct`, nên lỗ lộ đáp án
 * sống sót qua mọi lần chạy test. Ở đây hình dạng thật là thứ
 * `frontend/src/lib/learning-events.ts` gửi đi, nên `suKienThat()` dưới đây
 * dựng đúng hình dạng đó (kèm `payload` của `exercise_attempt`, sự kiện dày
 * nhất), và các ca đều đi qua nó.
 */

/** Đúng hình dạng một `Submit` mà frontend gửi — sự kiện dày nhất. */
function suKienThat(doi: Record<string, unknown> = {}) {
  return {
    eid: eid(),
    kind: 'Submit',
    courseId: 'python_advanced',
    lessonNo: 97,
    screenKey: 's4-sandbox',
    clientAt: new Date().toISOString(),
    payload: {
      env: 'browser',
      passed: false,
      total: 3,
      failed: ['ca 1: bảng rỗng', 'ca 2: thiếu cột'],
      errorType: 'KeyError',
      errorMessage: "KeyError: 'doanh_thu'",
      sameAsPrev: true,
      editsSinceLastRun: 7,
      machineMs: 142,
      attemptNo: 4,
      sincePrevMs: 48_219,
      newSession: false,
    },
    ...doi,
  };
}

describe('danh sách `kind` ĐÓNG, đặt tên theo ProgSnap2', () => {
  it('mười loại, và bốn tên CHUẨN của ProgSnap2 đúng chính tả của nó', () => {
    // Con số 10 là một quyết định (xem chú thích trong learning-event-kinds.ts),
    // không phải chi tiết ngẫu nhiên: thêm/bớt loại là đổi thứ câu SQL đếm được.
    expect(LEARNING_EVENT_KINDS).toHaveLength(10);
    expect([...LEARNING_EVENT_KINDS]).toEqual([
      'X-Lesson.Open',
      'X-Lesson.Heartbeat',
      'X-Lesson.Abandon',
      'Run.Test',
      'Submit',
      'X-Repeat.Fail',
      'X-Run.Interrupted',
      'X-Runtime.Failure',
      'Resource.View',
      'X-Quiz.Answer',
    ]);
    // Gõ sai một tên chuẩn (`Run.Tests`, `ResourceView`) là mất hẳn khả năng so
    // dữ liệu với bộ của người khác — và nó sai trong im lặng.
    for (const chuan of ['Run.Test', 'Submit', 'Resource.View']) {
      expect(LEARNING_EVENT_KINDS).toContain(chuan);
    }
    // Phần còn lại PHẢI mang tiền tố `X-`: đó là chỗ ProgSnap2 dành cho sự kiện
    // riêng của nền tảng, và tự đặt một tên trần là giả vờ nó là tên chuẩn.
    const chuanHoa = new Set<string>(['Run.Test', 'Submit', 'Resource.View']);
    for (const k of LEARNING_EVENT_KINDS) {
      if (!chuanHoa.has(k)) expect(k.startsWith('X-')).toBe(true);
    }
  });

  it('`KIND_LAN_THU` là đúng hai loại đếm thành một lần thử', () => {
    // Câu SQL "số lần thử tới khi đạt" phải `kind IN (...)` chứ không `=`, vì
    // ProgSnap2 tách Run.Test khỏi Submit. Hằng này là chỗ duy nhất nói ra cặp
    // đó — gõ lại ở nơi khác là chỗ hai danh sách lệch nhau.
    expect([...KIND_LAN_THU]).toEqual(['Run.Test', 'Submit']);
    for (const k of KIND_LAN_THU) expect(LEARNING_EVENT_KINDS).toContain(k);
  });

  it('mọi loại trong danh sách đều qua được bộ lọc', () => {
    for (const kind of LEARNING_EVENT_KINDS) {
      const r = locSuKien(suKienThat({ kind }));
      expect(r.ok).toBe(true);
    }
  });

  it('loại LẠ bị bỏ — ca bắt lỗi của whitelist', () => {
    // `Run.Tests` là lỗi gõ thật dễ xảy ra ở frontend. Không có whitelist thì
    // nó vào DB êm ru và câu `WHERE kind IN ('Run.Test','Submit')` đếm thiếu mà
    // không ai biết.
    for (const xau of [
      'Run.Tests',
      'X-Lesson.Opened',
      'RUN.TEST',
      ' Run.Test',
      'Lesson.Open',
      '',
      'drop table learning_events',
    ]) {
      const r = locSuKien(suKienThat({ kind: xau }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('kind_la');
    }
  });

  it('`kind` không phải chuỗi cũng bị bỏ, không ném', () => {
    for (const xau of [undefined, null, 1, {}, ['X-Lesson.Open']]) {
      expect(laKindHopLe(xau)).toBe(false);
      expect(locSuKien(suKienThat({ kind: xau })).ok).toBe(false);
    }
  });
});

describe('`eid` — khoá chống trùng, BẮT BUỘC', () => {
  it('thiếu hoặc sai hình dạng UUID v4 thì BỎ, KHÔNG tự sinh hộ', () => {
    // Máy chủ sinh hộ nghĩa là hàng đó không khử trùng được, mà
    // `accepted`/`duplicates` thì vẫn trông như đáng tin — một phép đo nói sai.
    for (const xau of [
      undefined,
      null,
      '',
      'khong-phai-uuid',
      '00000000-0000-0000-0000-000000000000', // v0: sai nibble phiên bản
      '00000000-0000-4000-0000-000000000000', // sai nibble variant
      '00000000-0000-4000-8000-00000000000', // thiếu một ký tự
      123,
      { eid: 'x' },
    ]) {
      const r = locSuKien(suKienThat({ eid: xau }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('eid_la');
    }
  });

  it('UUID v4 thật thì qua, và được hạ về chữ thường', () => {
    // Hạ chữ để `UNIQUE(event_id)` thật sự khử trùng: cùng một UUID gửi lần hai
    // ở dạng HOA là một chuỗi khác với Postgres, nên nó sẽ chèn thành hàng mới.
    const hoa = '3F2A9B1C-4D5E-4A7B-9C8D-0E1F2A3B4C5D';
    expect(RE_UUID_V4.test(hoa)).toBe(true);
    const r = locSuKien(suKienThat({ eid: hoa }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.event.eventId).toBe(hoa.toLowerCase());
  });
});

describe('trần payload', () => {
  it('chuỗi dài bị cắt về đúng trần, có dấu … để biết đã cắt', () => {
    const dai = 'x'.repeat(5_000);
    const r = locSuKien(suKienThat({ payload: { errorMessage: dai } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const v = r.event.payload?.errorMessage as string;
    expect(v).toHaveLength(GIOI_HAN.kyTuChuoi);
    expect(v.endsWith('…')).toBe(true);
  });

  it('mảng bị cắt về đúng số phần tử', () => {
    const nhieu = Array.from({ length: 200 }, (_, i) => `ca ${i}`);
    const r = locSuKien(suKienThat({ payload: { failed: nhieu } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.payload?.failed).toHaveLength(GIOI_HAN.phanTuMang);
  });

  it('phần tử mảng sai hình dạng bị bỏ, mảng vẫn giữ phần còn lại', () => {
    // Một ca trượt gửi sai hình dạng không được làm mất danh sách ca trượt.
    const r = locSuKien(
      suKienThat({
        payload: { failed: ['ca 1', { a: 1 }, 'ca 2', () => 0, 3] },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.payload?.failed).toEqual(['ca 1', 'ca 2', 3]);
  });

  it('object LỒNG bị bỏ khỏi payload — trần số khoá chỉ đếm được một tầng', () => {
    const r = locSuKien(
      suKienThat({
        payload: { passed: false, chiTiet: { a: { b: { c: 1 } } } },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.payload).toEqual({ passed: false });
  });

  it('NaN/Infinity bị bỏ, không biến thành null im lặng', () => {
    // `JSON.stringify(NaN)` ra `null`: để lọt thì cột payload có một khoá null
    // mà không ai biết nó đã từng là NaN.
    const r = locSuKien(
      suKienThat({
        payload: { sincePrevMs: Number.NaN, total: Infinity, attemptNo: 2 },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.payload).toEqual({ attemptNo: 2 });
  });

  it('payload quá nhiều khoá -> BỎ CẢ SỰ KIỆN, không cắt bớt khoá', () => {
    const phinh: Record<string, unknown> = {};
    for (let i = 0; i <= GIOI_HAN.khoaPayload; i++) phinh[`k${i}`] = i;
    const r = locSuKien(suKienThat({ payload: phinh }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('payload_qua_nhieu_khoa');
  });

  it('đúng trần khoá thì VẪN qua — trần là <=, không phải <', () => {
    const vuaDu: Record<string, unknown> = {};
    for (let i = 0; i < GIOI_HAN.khoaPayload; i++) vuaDu[`k${i}`] = i;
    expect(locSuKien(suKienThat({ payload: vuaDu })).ok).toBe(true);
  });

  it('payload rỗng / không phải object -> null, sự kiện vẫn nhận', () => {
    for (const p of [undefined, null, {}, [], 'x', 7]) {
      const r = locSuKien(suKienThat({ payload: p }));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.event.payload).toBeNull();
    }
  });

  it('catChuoi/catGiaTri là hàm thuần, gọi trực tiếp cũng đúng', () => {
    expect(catChuoi('abcdef', 4)).toBe('abc…');
    expect(catChuoi('abc', 4)).toBe('abc');
    expect(catGiaTri(null)).toBeNull();
    expect(catGiaTri(true)).toBe(true);
    expect(catGiaTri(() => 0)).toBeUndefined();
    expect(catGiaTri(10n)).toBeUndefined();
  });
});

describe('KHÔNG BAO GIỜ ghi mã nguồn của người học, kể cả dạng HASH', () => {
  it('mọi khoá trong danh sách cấm làm sự kiện bị BỎ', () => {
    // Bỏ lặng khoá đó rồi vẫn ghi hàng là để lọt một bản sửa nửa vời ở
    // frontend mà không ai thấy — nên luật là bỏ CẢ sự kiện.
    for (const khoa of KHOA_CAM_PAYLOAD) {
      const r = locSuKien(
        suKienThat({
          payload: { passed: false, [khoa]: 'df = pd.read_csv("x")' },
        }),
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('payload_cam');
    }
  });

  it('`codeHash` NẰM TRONG danh sách cấm — ca bắt lỗi của quyết định 2', () => {
    // Bản đầu của lớp này gửi `codeHash` và nó là mảnh yếu nhất của cả schema:
    // không mua thêm thông tin nào (phép so chạy trong trình duyệt, nơi mã gốc
    // vẫn còn) nhưng lại làm bản ghi dễ nối hơn. Ca này canh đúng chỗ đó: ai
    // thêm lại thì sự kiện bị bỏ và `dropped` nhảy lên, chứ không im lặng.
    expect(KHOA_CAM_PAYLOAD).toContain('codeHash');
    expect(KHOA_CAM_PAYLOAD).toContain('hash');
    const r = locSuKien(suKienThat({ payload: { codeHash: 'deadbeef' } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('payload_cam');
  });

  it('thứ THAY THẾ nó thì được: `sameAsPrev` một bit, `repeatStreak` một số', () => {
    const r = locSuKien(
      suKienThat({
        payload: { sameAsPrev: true, repeatStreak: 3, attemptNo: 5 },
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.event.payload).toEqual({
        sameAsPrev: true,
        repeatStreak: 3,
        attemptNo: 5,
      });
    }
  });
});

describe('hạn lưu được nói ra ở ĐÚNG MỘT chỗ', () => {
  it('`HAN_LUU_NGAY` là 90 và câu DELETE dẫn về chính nó', () => {
    // Ba chỗ cùng nói về hạn lưu (hằng này, chú thích schema, câu DELETE trong
    // scripts/learning-events/truy-van.sql). Ca này khoá con số ở hằng, và
    // kiểm luôn rằng câu DELETE tồn tại — một hạn lưu không có đường xoá là
    // một lời hứa, không phải một cơ chế.
    expect(HAN_LUU_NGAY).toBe(90);
    const sql = readFileSync(
      join(__dirname, '..', '..', 'scripts', 'learning-events', 'truy-van.sql'),
      'utf8',
    );
    expect(sql).toMatch(/DELETE\s+FROM\s+learning_events/i);
    expect(sql).toContain(String(HAN_LUU_NGAY));
  });
});

describe('cột ngoài payload', () => {
  it('`lessonNo` phải là số nguyên dương, chuỗi số KHÔNG được nhận', () => {
    // Chuỗi '12' vào cột INTEGER thì Prisma ném, và một sự kiện ném là cả
    // `createMany` của lô đó thất bại — đúng thứ nguyên tắc "một sự kiện hỏng
    // không làm mất cả lô" cấm.
    for (const xau of ['12', 12.5, 0, -3, Number.NaN, 1e9, null, {}]) {
      const r = locSuKien(suKienThat({ lessonNo: xau }));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.event.lessonNo).toBeNull();
    }
    const ok = locSuKien(suKienThat({ lessonNo: 97 }));
    expect(ok.ok && ok.event.lessonNo).toBe(97);
  });

  it('`courseId`/`screenKey` bị cắt theo trần riêng', () => {
    const r = locSuKien(
      suKienThat({
        courseId: 'c'.repeat(500),
        screenKey: 's'.repeat(500),
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.courseId).toHaveLength(GIOI_HAN.kyTuCourseId);
    expect(r.event.screenKey).toHaveLength(GIOI_HAN.kyTuScreenKey);
  });

  it('KHÔNG có cột `lesson_code` — nó sẽ luôn NULL, nên lấy bằng JOIN', () => {
    // `getLessonContent` chỉ select id/title/subtitle/module/sortOrder/
    // xpReward/contentJson, nên response `/content` KHÔNG mang `lesson_code`:
    // client không có gì để gửi. Một cột luôn NULL tệ hơn một cột không tồn tại
    // — nó mời người đọc sau này tin là có dữ liệu ở đó. Câu SQL lấy nó bằng
    // `LEFT JOIN lessons ON (course_id, sort_order)`.
    const r = locSuKien(suKienThat({ lessonCode: 'PD13' }));
    expect(r.ok).toBe(true);
    if (r.ok) expect('lessonCode' in r.event).toBe(false);
  });

  it('chuỗi rỗng / chỉ khoảng trắng thành null, không thành ""', () => {
    const r = locSuKien(suKienThat({ courseId: '   ', screenKey: '  ' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.courseId).toBeNull();
    expect(r.event.screenKey).toBeNull();
  });

  it('`clientAt` lệch quá xa giờ máy chủ -> null, SỰ KIỆN VẪN NHẬN', () => {
    const bayGio = Date.UTC(2026, 9, 28);
    // Đồng hồ máy người học lệch là chuyện thường; một mốc năm 2097 thì phá
    // mọi câu SQL có `BETWEEN` — và phá trong im lặng.
    expect(gioClientHoacNull('2097-01-01T00:00:00Z', bayGio)).toBeNull();
    expect(gioClientHoacNull('1999-01-01T00:00:00Z', bayGio)).toBeNull();
    expect(gioClientHoacNull('khong-phai-ngay', bayGio)).toBeNull();
    expect(gioClientHoacNull(undefined, bayGio)).toBeNull();
    const gan = new Date(bayGio - 1000).toISOString();
    expect(gioClientHoacNull(gan, bayGio)?.toISOString()).toBe(gan);

    const r = locSuKien(
      suKienThat({ clientAt: '2097-01-01T00:00:00Z' }),
      bayGio,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.event.clientAt).toBeNull();
  });
});

describe('một sự kiện hỏng KHÔNG được làm mất cả lô', () => {
  it('giữ phần còn lại và đếm số bị bỏ theo lý do', () => {
    const lo = [
      suKienThat(),
      suKienThat({ kind: 'Run.Tests' }), // kind_la
      suKienThat({ kind: 'X-Lesson.Open', payload: null }),
      null, // khong_phai_object
      'chuoi', // khong_phai_object
      suKienThat({ payload: { code: 'print(1)' } }), // payload_cam
      suKienThat({ eid: 'x' }), // eid_la
      suKienThat({ kind: 'X-Quiz.Answer' }),
    ];
    const r = locLo(lo);
    expect(r.events).toHaveLength(3);
    expect(r.dropped).toBe(5);
    expect(r.reasons).toEqual({
      kind_la: 1,
      khong_phai_object: 2,
      payload_cam: 1,
      eid_la: 1,
    });
  });

  it('lô toàn rác -> 0 sự kiện, KHÔNG ném (client hỏng không được nhận lỗi 400)', () => {
    const r = locLo([null, 1, 'x', {}, []]);
    expect(r.events).toHaveLength(0);
    expect(r.dropped).toBe(5);
  });

  it('payload rỗng -> null, nhưng `eid` vẫn phải có', () => {
    const r = locLo([{ eid: eid(), kind: 'X-Lesson.Heartbeat' }]);
    expect(r.events).toHaveLength(1);
    expect(r.events[0].payload).toBeNull();
    expect(r.events[0].courseId).toBeNull();
  });

  it('lô rỗng là hợp lệ', () => {
    expect(locLo([])).toEqual({ events: [], dropped: 0, reasons: {} });
  });
});

describe('lô QUÁ LỚN thì ném, không cắt bớt im lặng', () => {
  it('vượt trần -> BadRequestException kèm cả hai con số', () => {
    // Cắt bớt im lặng là tự tạo một phép đo nói sai: client gửi 5 000, server
    // nhận 50, không ai biết 4 950 cái kia có hay không.
    const qua = Array.from({ length: GIOI_HAN.suKienMoiLo + 1 }, () =>
      suKienThat(),
    );
    expect(() => locLo(qua)).toThrow(BadRequestException);
    expect(() => locLo(qua)).toThrow(String(GIOI_HAN.suKienMoiLo));
    expect(() => locLo(qua)).toThrow(String(GIOI_HAN.suKienMoiLo + 1));
  });

  it('đúng trần thì qua — trần là <=, không phải <', () => {
    const vuaDu = Array.from({ length: GIOI_HAN.suKienMoiLo }, () =>
      suKienThat(),
    );
    expect(locLo(vuaDu).events).toHaveLength(GIOI_HAN.suKienMoiLo);
  });

  it('`events` không phải mảng -> ném, không coi như lô rỗng', () => {
    for (const xau of [undefined, null, {}, 'x', 7]) {
      expect(() => locLo(xau)).toThrow(BadRequestException);
    }
  });

  it('lô ít sự kiện nhưng NẶNG cũng bị chặn — trần thứ hai, khác trần số lượng', () => {
    // Chỉ có trần số lượng thì một lô 3 sự kiện mà mỗi cái mang 20 MB đi qua.
    // Và trần byte phải đo BYTE chứ không ký tự: chuỗi tiếng Việt 2–3 byte mỗi
    // chữ, nên đếm ký tự là một trần lỏng hơn mình nghĩ theo đúng chiều nguy
    // hiểm.
    const nang = {
      eid: eid(),
      kind: 'Submit',
      // Mỗi khoá một chuỗi 500 ký tự (đúng trần chuỗi), 24 khoá (đúng trần
      // khoá) — tức mỗi sự kiện vẫn HỢP LỆ từng phần mà lô thì không.
      payload: Object.fromEntries(
        Array.from({ length: GIOI_HAN.khoaPayload }, (_, i) => [
          `k${i}`,
          'đ'.repeat(500),
        ]),
      ),
    };
    const lo = Array.from({ length: 20 }, () => ({ ...nang, eid: eid() }));
    expect(soByte(lo)).toBeGreaterThan(TRAN_BYTE_MOI_LO);
    expect(lo.length).toBeLessThanOrEqual(GIOI_HAN.suKienMoiLo);
    expect(() => locLo(lo)).toThrow(BadRequestException);
    expect(() => locLo(lo)).toThrow(/byte/);
  });

  it('`soByte` đếm BYTE UTF-8, không đếm ký tự UTF-16', () => {
    expect(soByte('abc')).toBe(5); // "abc" kèm hai dấu nháy
    expect(soByte('đ')).toBe(4); // 'đ' là 2 byte + hai dấu nháy
  });
});
