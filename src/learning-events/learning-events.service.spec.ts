import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

import { PHIEN_BAN_DONG_Y } from './learning-event-consent';
import { GIOI_HAN } from './learning-event-kinds';
import { LearningEventsService } from './learning-events.service';

/**
 * Một hàm Prisma giả. Theo đúng khuôn đã dọn ở `lessons.service.spec.ts`:
 * `Promise<unknown>` cho giá trị TRẢ VỀ là đủ, phần ĐỐI SỐ mới cần kiểu thật —
 * vì test đọc lại `mock.calls` để chứng minh "user_id lấy từ JWT, không từ
 * body" và "một câu createMany, không vòng lặp insert".
 *
 * Khai `let prisma: any` ở đây thì `calls[0][0].data[0].userId` cũng là `any`:
 * gõ sai đường dẫn (`.data[0].user_id`) vẫn biên dịch, `toBe(7)` so `undefined`
 * với 7 và test đỏ ở chỗ khó hiểu — hoặc tệ hơn là xanh vô nghĩa.
 */
type AsyncMock<A extends unknown[] = unknown[]> = jest.Mock<
  Promise<unknown>,
  A
>;

const asyncMock = <A extends unknown[] = unknown[]>(): AsyncMock<A> =>
  jest.fn<Promise<unknown>, A>();

/**
 * Đối số thật của `createMany` — kèm `skipDuplicates`, vì nó là một phần của
 * hợp đồng chứ không phải một tuỳ chọn: thiếu nó thì một lô gửi lại (phản hồi
 * không về kịp lúc trang ẩn) ném lỗi khoá trùng và mất CẢ LÔ.
 */
type CreateManyArg = {
  data: Prisma.LearningEventCreateManyInput[];
  skipDuplicates?: boolean;
};

/**
 * Đối số thật của phép đọc bản ghi đồng ý. Khai kiểu để ca "đọc theo
 * `created_at`, không theo `id`" chứng minh được điều nó nói: hai hàng của cùng
 * một người vào trong cùng một millisecond thì thứ tự phải theo THỜI ĐIỂM
 * QUYẾT, và `id` chỉ tình cờ cùng thứ tự hôm nay.
 */
type ConsentFindArg = {
  where: { userId: number };
  orderBy: { createdAt: 'desc' } | { id: 'desc' };
  select?: Record<string, boolean>;
};

type PrismaMock = {
  learningEvent: { createMany: AsyncMock<[CreateManyArg]> };
  learningEventConsent: {
    findFirst: AsyncMock<[ConsentFindArg]>;
    create: AsyncMock<[{ data: Record<string, unknown> }]>;
  };
};

let demEid = 0;
function eid(): string {
  demEid += 1;
  return `00000000-0000-4000-8000-${demEid.toString(16).padStart(12, '0')}`;
}

/** Đúng hình dạng frontend gửi — xem ghi chú fixture trong *.sanitize.spec.ts. */
function suKien(doi: Record<string, unknown> = {}) {
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
      failed: ['ca 1'],
      sameAsPrev: true,
      editsSinceLastRun: 4,
      attemptNo: 2,
    },
    ...doi,
  };
}

describe('LearningEventsService.record', () => {
  let service: LearningEventsService;
  let prisma: PrismaMock;

  /** Giả lập Postgres: `skipDuplicates` nên `count` là số hàng THẬT SỰ chèn. */
  function chenDuoc(n: number) {
    prisma.learningEvent.createMany.mockResolvedValue({ count: n });
  }

  beforeEach(async () => {
    prisma = {
      learningEvent: {
        createMany: asyncMock<[CreateManyArg]>().mockResolvedValue({
          count: 0,
        }),
      },
      learningEventConsent: {
        // MẶC ĐỊNH LÀ ĐÃ ĐỒNG Ý, và `version` lấy từ hằng THẬT chứ không một
        // chuỗi gõ tay: gõ tay thì ngày `PHIEN_BAN_DONG_Y` đổi, mọi ca ở đây
        // lặng lẽ rơi vào nhánh "chưa đồng ý" và đo một đường đi khác hẳn mà
        // vẫn xanh ở phần lớn các assert. Đúng họ bẫy fixture mà AGENTS.md ghi.
        //
        // Ca kiểm chính cái cổng này thì tự đặt lại mock — xem describe
        // 'cổng đồng ý' ở dưới.
        findFirst: asyncMock<[ConsentFindArg]>().mockResolvedValue({
          granted: true,
          version: PHIEN_BAN_DONG_Y,
        }),
        create: asyncMock<
          [{ data: Record<string, unknown> }]
        >().mockResolvedValue({ id: 1 }),
      },
    };
    const mod = await Test.createTestingModule({
      providers: [
        LearningEventsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = mod.get(LearningEventsService);
    // `record` log warn khi có sự kiện bị bỏ — đó là hành vi muốn có, nhưng
    // đừng để nó đổ ra output của bộ test.
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
  });

  it('ghi cả lô bằng MỘT câu createMany, không vòng lặp insert', async () => {
    // Vì sao quan trọng, bằng số đo của chính dự án: mỗi truy vấn tới Neon mất
    // ~237 ms round-trip (prisma.service.ts), nên 20 sự kiện ghi từng cái là
    // ~4,7 giây giữ một connection — cho một việc người học không chờ kết quả.
    chenDuoc(3);
    const res = await service.record(7, [suKien(), suKien(), suKien()]);

    expect(prisma.learningEvent.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.learningEvent.createMany.mock.calls[0][0].data).toHaveLength(
      3,
    );
    expect(res).toMatchObject({
      ok: true,
      accepted: 3,
      dropped: 0,
      duplicates: 0,
    });
  });

  it('`skipDuplicates: true` — thiếu nó là lô gửi lại làm mất CẢ LÔ', async () => {
    // Một lô gửi lúc trang ẩn có thể TỚI máy chủ mà phản hồi không về kịp, nên
    // client gửi lại. Không có `skipDuplicates` thì lần hai ném lỗi khoá trùng
    // trên `uq_learning_events_event_id` và `createMany` thất bại toàn bộ.
    chenDuoc(1);
    await service.record(7, [suKien()]);
    expect(
      prisma.learningEvent.createMany.mock.calls[0][0].skipDuplicates,
    ).toBe(true);
  });

  it('`duplicates` = số sự kiện đã có — một SỐ ĐO, lấy miễn phí từ `count`', async () => {
    // Postgres bỏ 2 hàng trùng -> `count` là 1. Hiệu số cho ra tỉ lệ gửi lại mà
    // không phải đi đo riêng ở đâu.
    chenDuoc(1);
    const res = await service.record(7, [suKien(), suKien(), suKien()]);
    expect(res.accepted).toBe(1);
    expect(res.duplicates).toBe(2);
    expect(res.dropped).toBe(0); // trùng KHÁC hỏng — đừng gộp hai con số
  });

  it('`user_id` lấy từ tham số (JWT), KHÔNG từ body', async () => {
    // Client tự khai mình là ai thì mọi phép đếm "số người riêng biệt" thành
    // vô nghĩa — và đó chính là phép đếm của câu SQL drop-off.
    chenDuoc(1);
    await service.record(7, [suKien({ userId: 999, user_id: 999 })]);
    const hang = prisma.learningEvent.createMany.mock.calls[0][0].data[0];
    expect(hang.userId).toBe(7);
  });

  it('`clientSentAt` đặt CHO CẢ LÔ từ `sentAt`, không từ từng sự kiện', async () => {
    // `stm` của Snowplow là mốc GỬI, và cả lô gửi một lần. Cùng `clientAt` của
    // từng sự kiện, nó cho mốc suy ra `createdAt - (clientSentAt - clientAt)` —
    // mốc duy nhất so được giữa người học khi đồng hồ máy họ lệch.
    chenDuoc(2);
    const sentAt = '2026-10-28T03:04:05.000Z';
    await service.record(7, [suKien(), suKien()], sentAt);
    for (const hang of prisma.learningEvent.createMany.mock.calls[0][0].data) {
      expect(hang.clientSentAt).toEqual(new Date(sentAt));
    }
  });

  it('`sentAt` thiếu/rác -> cột null, SỰ KIỆN VẪN GHI', async () => {
    // Mất mốc suy ra của một lô còn chấp nhận được; mất cả lô thì không.
    chenDuoc(1);
    for (const xau of [undefined, 'khong-phai-ngay', '2097-01-01T00:00:00Z']) {
      prisma.learningEvent.createMany.mockClear();
      await service.record(7, [suKien()], xau);
      const hang = prisma.learningEvent.createMany.mock.calls[0][0].data[0];
      expect(hang.clientSentAt).toBeNull();
    }
  });

  it('hàng ghi xuống mang đúng các cột, payload đã cắt trần', async () => {
    chenDuoc(1);
    await service.record(7, [
      suKien({ payload: { passed: false, errorMessage: 'E'.repeat(9_000) } }),
    ]);
    const hang = prisma.learningEvent.createMany.mock.calls[0][0].data[0];
    expect(hang).toMatchObject({
      kind: 'Submit',
      courseId: 'python_advanced',
      lessonNo: 97,
      screenKey: 's4-sandbox',
    });
    expect(hang.eventId).toMatch(/^[0-9a-f-]{36}$/);
    const payload = hang.payload as { errorMessage: string };
    expect(payload.errorMessage).toHaveLength(GIOI_HAN.kyTuChuoi);
  });

  it('payload rỗng ghi `Prisma.DbNull`, không ghi `undefined`', async () => {
    // Với cột JSONB nullable, `undefined` nghĩa là "không đặt cột này" còn
    // DbNull là NULL thật. Để `undefined` thì hôm nay vẫn ra NULL nhưng vì một
    // lý do khác, nên ngày ai đó thêm DEFAULT cho cột thì hành vi đổi mà không
    // có gì đỏ.
    chenDuoc(1);
    await service.record(7, [
      suKien({ kind: 'X-Lesson.Heartbeat', payload: null }),
    ]);
    const hang = prisma.learningEvent.createMany.mock.calls[0][0].data[0];
    expect(hang.payload).toBe(Prisma.DbNull);
  });

  it('sự kiện hỏng bị bỏ, phần còn lại VẪN ghi, số bị bỏ đi ra response', async () => {
    chenDuoc(2);
    const res = await service.record(7, [
      suKien(),
      suKien({ kind: 'khong-co-loai-nay' }),
      suKien({ payload: { code: 'print(1)' } }),
      suKien({ eid: 'khong-phai-uuid' }),
      suKien({ kind: 'X-Lesson.Open' }),
    ]);

    expect(res.accepted).toBe(2);
    expect(res.dropped).toBe(3);
    expect(res.reasons).toEqual({ kind_la: 1, payload_cam: 1, eid_la: 1 });
    expect(prisma.learningEvent.createMany.mock.calls[0][0].data).toHaveLength(
      2,
    );
  });

  it('lô toàn rác -> KHÔNG gọi DB, và không ném', async () => {
    const res = await service.record(7, [null, 'x', { kind: 'la' }]);
    expect(prisma.learningEvent.createMany).not.toHaveBeenCalled();
    expect(res).toMatchObject({ accepted: 0, dropped: 3, duplicates: 0 });
  });

  it('lô rỗng -> KHÔNG gọi DB', async () => {
    await service.record(7, []);
    expect(prisma.learningEvent.createMany).not.toHaveBeenCalled();
  });

  it('lô quá lớn -> ném 400 và KHÔNG chạm DB (lọc trước, không tốn vòng DB)', async () => {
    const qua = Array.from({ length: GIOI_HAN.suKienMoiLo + 1 }, () =>
      suKien(),
    );
    await expect(service.record(7, qua)).rejects.toThrow(BadRequestException);
    expect(prisma.learningEvent.createMany).not.toHaveBeenCalled();
  });

  it('`events` không phải mảng -> ném 400, không chạm DB', async () => {
    await expect(service.record(7, { kind: 'X-Lesson.Open' })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.learningEvent.createMany).not.toHaveBeenCalled();
  });
});

/**
 * CỔNG ĐỒNG Ý Ở MÁY CHỦ.
 *
 * Trước bản này, cổng duy nhất là `let dongY = false` trong
 * `frontend/src/lib/learning-events.ts` — tức ở client. `record()` nhận lô nào
 * cũng ghi. Một cổng ở client không nói được ai đã đồng ý/lúc nào/với điều gì,
 * nó mất cùng localStorage, và nó không chặn được một request gửi tay.
 *
 * Bằng chứng ba mảnh của cổng này đều CHỊU LỰC, không phải nhánh trang trí —
 * đã ablate và ĐẾM:
 *   · gỡ phép kiểm `conHieuLuc` khỏi `record()`        → **5 ca đỏ**;
 *   · `conHieuLuc` thôi so `version`                   → **3 ca đỏ**;
 *   · `canHoiLai` thôi hỏi lại khi phiên bản đổi       → **1 ca đỏ**.
 * Và chính việc THÊM cổng đã làm 11 ca cũ đỏ cho tới khi mock có
 * `learningEventConsent` — nó nằm trên đường đi chính của mọi lô, không ở một
 * nhánh rẽ.
 */
describe('LearningEventsService — cổng đồng ý', () => {
  let service: LearningEventsService;
  let prisma: PrismaMock;

  function datDongY(ban: { granted: boolean; version: string } | null) {
    prisma.learningEventConsent.findFirst.mockResolvedValue(ban);
  }

  beforeEach(async () => {
    prisma = {
      learningEvent: {
        createMany: asyncMock<[CreateManyArg]>().mockResolvedValue({
          count: 1,
        }),
      },
      learningEventConsent: {
        findFirst: asyncMock<[ConsentFindArg]>().mockResolvedValue(null),
        create: asyncMock<
          [{ data: Record<string, unknown> }]
        >().mockResolvedValue({ id: 1 }),
      },
    };
    const mod = await Test.createTestingModule({
      providers: [
        LearningEventsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = mod.get(LearningEventsService);
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
  });

  it('CHƯA đồng ý -> KHÔNG ghi một hàng nào, và nói ra bằng `refused`', async () => {
    datDongY(null);
    const res = await service.record(7, [suKien(), suKien()]);

    expect(prisma.learningEvent.createMany).not.toHaveBeenCalled();
    expect(res.refused).toBe('no-consent');
    // Hai sự kiện phải được đếm vào `dropped`, không biến mất khỏi mọi con số:
    // `accepted 0 / dropped 0` đọc ra là "lô rỗng", một câu nói sai về chuyện
    // vừa xảy ra — và nó là con số duy nhất log HTTP giữ lại.
    expect(res.dropped).toBe(2);
    expect(res.accepted).toBe(0);
  });

  it('đã RÚT LẠI -> KHÔNG ghi, dù trước đó từng đồng ý', async () => {
    // Trạng thái hiện tại là hàng MỚI NHẤT, nên một hàng `granted: false` sau
    // một hàng `granted: true` phải tắt lớp ghi. Bảng append-only làm chuyện
    // này đọc được; một cột bị ghi đè thì không.
    datDongY({ granted: false, version: PHIEN_BAN_DONG_Y });
    const res = await service.record(7, [suKien()]);

    expect(prisma.learningEvent.createMany).not.toHaveBeenCalled();
    expect(res.refused).toBe('no-consent');
  });

  it('đồng ý với phiên bản CŨ -> KHÔNG ghi', async () => {
    // Mở rộng phạm vi thu thập không được chạy dưới sự đồng ý cũ. Đây là nửa
    // THI HÀNH của luật phiên bản; nửa còn lại là ca ghim dấu ấn trong
    // learning-event-consent.spec.ts.
    datDongY({ granted: true, version: '2026-01-01' });
    const res = await service.record(7, [suKien()]);

    expect(prisma.learningEvent.createMany).not.toHaveBeenCalled();
    expect(res.refused).toBe('no-consent');
  });

  it('đã đồng ý ĐÚNG phiên bản -> ghi bình thường, không có `refused`', async () => {
    datDongY({ granted: true, version: PHIEN_BAN_DONG_Y });
    const res = await service.record(7, [suKien()]);

    expect(prisma.learningEvent.createMany).toHaveBeenCalledTimes(1);
    expect(res.refused).toBeUndefined();
    expect(res.accepted).toBe(1);
  });

  it('đọc bản ghi theo `created_at` DESC, không theo `id`', async () => {
    // Hai hàng của cùng một người có thể vào trong cùng một millisecond (bấm
    // đúp), và thứ tự phải theo THỜI ĐIỂM QUYẾT. `id` tình cờ cùng thứ tự hôm
    // nay — "tình cờ đúng" là thứ sẽ lệch ngày ai đó nhập dữ liệu cũ vào bảng.
    // Và đây cũng là hình dạng mà `idx_log_consents_user_created` phủ.
    datDongY({ granted: true, version: PHIEN_BAN_DONG_Y });
    await service.record(7, [suKien()]);

    const arg = prisma.learningEventConsent.findFirst.mock.calls[0][0];
    expect(arg.orderBy).toEqual({ createdAt: 'desc' });
    expect(arg.where).toEqual({ userId: 7 });
  });

  it('CHỈ MỘT vòng DB cho phép kiểm đồng ý, dù lô có bao nhiêu sự kiện', async () => {
    // Giá của cổng này là một vòng DB mỗi LÔ. Nếu nó thành một vòng mỗi SỰ KIỆN
    // thì ở nhịp dày nhất (20 sự kiện/lô, ~237 ms round-trip tới Neon) đó là
    // ~4,7 giây giữ một connection — đúng cái giá mà `createMany` được chọn để
    // tránh. Ca này khoá chỗ đó.
    datDongY({ granted: true, version: PHIEN_BAN_DONG_Y });
    await service.record(7, [suKien(), suKien(), suKien(), suKien()]);

    expect(prisma.learningEventConsent.findFirst).toHaveBeenCalledTimes(1);
  });

  it('`ghiDongY` THÊM hàng, không cập nhật, và phiên bản do MÁY CHỦ đặt', async () => {
    // `version` không nhận từ body: nếu nhận thì một client cũ ghi được "đã
    // đồng ý với phiên bản hiện hành" trong khi hộp nó hiện ra là bản mô tả CŨ
    // — bản ghi nói sai về điều người học thật sự đã đọc, đúng cái mà cột này
    // tồn tại để nói đúng.
    datDongY({ granted: true, version: PHIEN_BAN_DONG_Y });
    await service.ghiDongY(7, true);

    expect(prisma.learningEventConsent.create).toHaveBeenCalledTimes(1);
    expect(prisma.learningEventConsent.create.mock.calls[0][0].data).toEqual({
      userId: 7,
      granted: true,
      version: PHIEN_BAN_DONG_Y,
    });
  });

  it('`trangThaiDongY` phân biệt "không được ghi" với "phải hỏi"', async () => {
    // Người đã từ chối: không ghi, nhưng KHÔNG hỏi lại. Gộp hai câu này thành
    // một là hiện lại hộp mỗi lần mở bài, tức ép đồng ý bằng sự mệt mỏi.
    datDongY({ granted: false, version: PHIEN_BAN_DONG_Y });
    expect(await service.trangThaiDongY(7)).toEqual({
      granted: false,
      shouldAsk: false,
      version: PHIEN_BAN_DONG_Y,
    });

    datDongY(null);
    expect(await service.trangThaiDongY(7)).toEqual({
      granted: false,
      shouldAsk: true,
      version: PHIEN_BAN_DONG_Y,
    });
  });
});
