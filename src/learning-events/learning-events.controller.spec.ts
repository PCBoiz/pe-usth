import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import {
  THROTTLER_LIMIT,
  THROTTLER_TTL,
} from '@nestjs/throttler/dist/throttler.constants';

import { LearningEventsController } from './learning-events.controller';
import { LearningEventsService } from './learning-events.service';

/**
 * HỢP ĐỒNG của route ghi nhật ký với GATEWAY — ba thứ hỏng trong im lặng.
 *
 * Không dựng app Nest thật ở đây có chủ đích: AGENTS.md ghi lại một bẫy đã đo
 * được — `python-runner.controller.spec.ts` dựng app thật rồi gọi 11 lượt HTTP
 * trong MỘT ca, chạy riêng 0,3 s nhưng 2,96 s khi chạy cả bộ với cache ts-jest
 * nguội, có lần vượt 5 s rồi báo "Exceeded timeout". Ba điều cần canh ở đây đều
 * là METADATA, nên đọc metadata là đủ và không mang theo cái bẫy đồng hồ đó.
 */
/**
 * Đọc một mảnh metadata.
 *
 * Hai lớp bọc, cả hai có lý do lint thật:
 *  · `Reflect.getMetadata` khai trả `any`, nên gán thẳng là
 *    `no-unsafe-assignment` — `as unknown` nói ra rằng ta KHÔNG biết kiểu và
 *    buộc mọi ca phải tự hẹp lại.
 *  · `target` nhận `object` chứ không nhận `Class.prototype.method`: truy cập
 *    một method rồi truyền đi là `unbound-method`, và luật đó đúng về nguyên
 *    tắc (method tách khỏi object thì `this` sai). Ở đây ta chỉ cần CHÍNH cái
 *    hàm làm khoá metadata, nên lấy nó qua property descriptor.
 */
function metaCua(key: string, target: object): unknown {
  return Reflect.getMetadata(key, target) as unknown;
}

/** Hàm handler làm khoá metadata, lấy mà không "tháo" method khỏi prototype. */
function handler(ten: string): object {
  const d = Object.getOwnPropertyDescriptor(
    LearningEventsController.prototype,
    ten,
  );
  if (!d || typeof d.value !== 'function') {
    throw new Error(`LearningEventsController không còn method \`${ten}\``);
  }
  return d.value as object;
}

describe('LearningEventsController — hợp đồng với gateway', () => {
  it('path là `events`, KHÔNG mang prefix/version', () => {
    // Quy tắc 1 của src/api-gateway/README.md: prefix/version là tài sản độc
    // quyền của gateway (`setGlobalPrefix('api')`). Viết `api/v1/events` ở đây
    // thì đường thật thành `/api/api/v1/events` — 404, và 404 của một lớp ghi
    // nhật ký "hỏng im lặng" thì không ai phát hiện ra.
    const path = metaCua(PATH_METADATA, LearningEventsController);
    expect(path).toBe('events');
    expect(String(path)).not.toMatch(/api|v1/);
  });

  it('trả 202 Accepted — nói đúng rằng đây là ghi-rồi-quên', () => {
    expect(metaCua(HTTP_CODE_METADATA, handler('record'))).toBe(
      HttpStatus.ACCEPTED,
    );
  });

  it('CÓ rate limit riêng, và ngưỡng > 0', () => {
    // `THROTTLE_EVENTS_LIMIT=` để trống thì `?? 300` KHÔNG áp (chuỗi rỗng không
    // phải undefined), `Number('')` ra 0, và MỌI lượt ghi bị 429. Biến đã khai
    // trong env.validation.ts để app từ chối khởi động khi nó sai; ca này canh
    // nửa còn lại — rằng route này thật sự có override, không rơi vào tier
    // chung 1000/giờ dùng cùng mọi route khác.
    const h = handler('record');
    // `@Throttle` lưu giá trị dạng số HOẶC dạng hàm resolver tuỳ phiên bản, nên
    // quy về số thay vì khẳng định kiểu — thứ cần canh là "có override và > 0".
    const so = (v: unknown) => (typeof v === 'number' ? v : Number(v));
    expect(so(metaCua(`${THROTTLER_LIMIT}ip_hour`, h))).toBeGreaterThan(0);
    expect(so(metaCua(`${THROTTLER_TTL}ip_hour`, h))).toBeGreaterThan(0);
  });

  it('controller chỉ chuyển tiếp — mọi luật nằm ở service', () => {
    // Nếu một ngày controller tự lọc/tự cắt trần thì có HAI nơi quyết định, và
    // chúng sẽ lệch. Ca này khoá đường đi: gọi controller phải gọi service với
    // ĐÚNG userId, ĐÚNG mảng events và ĐÚNG `sentAt`, không biến đổi gì ở giữa.
    //
    // `sentAt` phải đi cùng: bỏ nó thì cột `client_sent_at` luôn NULL, mốc suy
    // ra `createdAt - (clientSentAt - clientAt)` không tính được, và mọi phép so
    // thời gian giữa người học rơi về `clientAt` — tức sai theo độ lệch đồng hồ
    // máy người học. Hỏng im lặng: bảng vẫn đầy hàng, chỉ là mốc sai.
    const events = [
      { eid: '3f2a9b1c-4d5e-4a7b-9c8d-0e1f2a3b4c5d', kind: 'X-Lesson.Open' },
    ];
    const sentAt = '2026-10-28T03:04:05.000Z';
    const service = { record: jest.fn().mockResolvedValue({ ok: true }) };
    const controller = new LearningEventsController(
      service as unknown as LearningEventsService,
    );
    void controller.record(7, { events, sentAt });
    expect(service.record).toHaveBeenCalledWith(7, events, sentAt);
  });
});
