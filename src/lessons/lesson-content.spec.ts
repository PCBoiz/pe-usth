import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { StreakService } from 'src/common/streak/streak.service';
import { AchievementsService } from 'src/achievements/achievements.service';
import { CoursesService } from 'src/courses/courses.service';
import {
  LessonsService,
  isSelfTestGateLesson,
  withholdSolutionCode,
} from './lessons.service';

/**
 * Lời giải mẫu của CỬA TỰ KIỂM TRA không được gửi về trình duyệt trước khi học
 * viên tự làm xong.
 *
 * Quy tắc "lời giải chỉ mở sau lần nộp đầu" trước đây chỉ được canh ở FE
 * (StudioLesson.tsx ẩn nút "Hiện lời giải"), còn getLessonContent trả nguyên
 * content_json — xem response của GET /api/courses/:id/lessons/:n/content là
 * có ngay toàn bộ solutionCode. Các test dưới đây fail nếu bỏ phần lọc trong
 * getLessonContent.
 */

const SOLUTION = 'def is_palindrome(text):\n    return text == text[::-1]\n';

function gateContent() {
  return {
    schema: 'studio-lesson/v1',
    step_1: { context: { body: 'ly thuyet' } },
    step_3: { scaffold: { slots: [{ n: 1, answer: 'x' }] } },
    step_4: {
      gate: true,
      task: { body: 'de bai' },
      starterCode: '# viet code o day',
      solutionCode: SOLUTION,
      hints: [{ title: 'Nguyen ly', body: 'nop truoc' }],
      tests: [{ name: 'ca 1', call: 'f("a")', expect: 'True' }],
    },
  };
}

function normalContent() {
  return {
    schema: 'studio-lesson/v1',
    step_4: {
      task: { body: 'de bai' },
      solutionCode: SOLUTION,
      tests: [{ name: 'ca 1', call: 'f("a")', expect: 'True' }],
    },
  };
}

describe('withholdSolutionCode / isSelfTestGateLesson', () => {
  it('nhận diện cửa tự kiểm tra qua cờ step_4.gate', () => {
    expect(isSelfTestGateLesson(gateContent() as any)).toBe(true);
    expect(isSelfTestGateLesson(normalContent() as any)).toBe(false);
  });

  it('không nổ với content_json rác do admin nhập sai', () => {
    expect(isSelfTestGateLesson(null)).toBe(false);
    expect(isSelfTestGateLesson(undefined)).toBe(false);
    expect(isSelfTestGateLesson('chuoi' as any)).toBe(false);
    expect(isSelfTestGateLesson([1, 2] as any)).toBe(false);
    expect(isSelfTestGateLesson({ step_4: 'khong-phai-object' } as any)).toBe(
      false,
    );
    expect(isSelfTestGateLesson({ step_4: { gate: 'true' } } as any)).toBe(
      false,
    );
  });

  it('bỏ solutionCode nhưng GIỮ mọi thứ FE cần để dựng màn', () => {
    const out: any = withholdSolutionCode(gateContent() as any);

    expect(out.step_4.solutionCode).toBeUndefined();
    expect(out.step_4.solutionWithheld).toBe(true);
    // Những trường quyết định "có hiện ô soạn mã / màn sandbox hay không"
    // (StudioLesson.tsx#showEditor, studio-lesson.ts#buildScreens).
    expect(out.step_4.tests).toHaveLength(1);
    expect(out.step_4.task.body).toBe('de bai');
    expect(out.step_4.starterCode).toBe('# viet code o day');
    expect(out.step_4.hints).toHaveLength(1);
    expect(out.step_4.gate).toBe(true);
    expect(out.step_1).toEqual({ context: { body: 'ly thuyet' } });
    expect(out.step_3.scaffold.slots).toHaveLength(1);
  });

  it('KHÔNG mutate object đọc từ Prisma', () => {
    const original: any = gateContent();
    withholdSolutionCode(original);
    expect(original.step_4.solutionCode).toBe(SOLUTION);
    expect(original.step_4.solutionWithheld).toBeUndefined();
  });

  it('bài không có solutionCode thì trả về y nguyên', () => {
    const noSolution: any = { step_4: { gate: true, tests: [] } };
    expect(withholdSolutionCode(noSolution)).toBe(noSolution);
  });
});

describe('LessonsService.getLessonContent — lời giải của cửa tự kiểm tra', () => {
  let service: LessonsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      enrollment: { findUnique: jest.fn() },
      lesson: { findFirst: jest.fn() },
      lessonProgress: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'user' }) },
    };

    const mod = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StreakService, useValue: {} },
        { provide: AchievementsService, useValue: {} },
        { provide: CoursesService, useValue: {} },
      ],
    }).compile();
    service = mod.get(LessonsService);
  });

  function lessonRow(contentJson: unknown) {
    return {
      id: 20,
      title: 'B20',
      subtitle: null,
      module: 'M2',
      sortOrder: 20,
      xpReward: 40,
      contentJson,
    };
  }

  function enrolled() {
    prisma.enrollment.findUnique.mockResolvedValue({ userId: 1 });
  }

  it('học viên đã ghi danh, CHƯA xong bài cửa -> response KHÔNG chứa lời giải', async () => {
    enrolled();
    prisma.lesson.findFirst.mockResolvedValue(lessonRow(gateContent()));

    const res: any = await service.getLessonContent(1, 'python', 20);

    expect(res.completed).toBe(false);
    expect(res.lesson.contentJson.step_4.solutionCode).toBeUndefined();
    expect(res.lesson.contentJson.step_4.solutionWithheld).toBe(true);
    // Kiểm cả trên payload đã serialize: lời giải không được lọt ra dưới bất
    // kỳ khoá nào khác trong JSON gửi đi.
    expect(JSON.stringify(res)).not.toContain('is_palindrome');
  });

  it('đã hoàn thành bài cửa -> được xem lời giải để đối chiếu', async () => {
    enrolled();
    prisma.lesson.findFirst.mockResolvedValue(lessonRow(gateContent()));
    prisma.lessonProgress.findFirst.mockResolvedValue({ lessonId: 20 });

    const res: any = await service.getLessonContent(1, 'python', 20);

    expect(res.completed).toBe(true);
    expect(res.lesson.contentJson.step_4.solutionCode).toBe(SOLUTION);
    // Không đi vào nhánh kiểm role -> không tốn thêm vòng gọi DB.
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('bài KHÔNG phải cửa tự kiểm tra -> vẫn gửi lời giải (nút gợi ý bậc cuối)', async () => {
    enrolled();
    prisma.lesson.findFirst.mockResolvedValue(lessonRow(normalContent()));

    const res: any = await service.getLessonContent(1, 'python', 5);

    expect(res.lesson.contentJson.step_4.solutionCode).toBe(SOLUTION);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('admin xem trước (chưa ghi danh) -> vẫn thấy lời giải, không bị khoá', async () => {
    prisma.enrollment.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ role: 'admin' });
    prisma.lesson.findFirst.mockResolvedValue(lessonRow(gateContent()));

    const res: any = await service.getLessonContent(9, 'python', 20);

    expect(res.lesson.contentJson.step_4.solutionCode).toBe(SOLUTION);
    // Đã biết là admin từ nhánh ghi danh -> không truy vấn role lần thứ hai.
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it('admin ĐÃ ghi danh, bài cửa chưa xong -> vẫn thấy lời giải', async () => {
    enrolled();
    prisma.user.findUnique.mockResolvedValue({ role: 'admin' });
    prisma.lesson.findFirst.mockResolvedValue(lessonRow(gateContent()));

    const res: any = await service.getLessonContent(9, 'python', 20);

    expect(res.lesson.contentJson.step_4.solutionCode).toBe(SOLUTION);
  });

  it('chưa ghi danh và không phải admin -> 403, không đọc nội dung', async () => {
    prisma.enrollment.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ role: 'user' });

    await expect(service.getLessonContent(2, 'python', 20)).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.lesson.findFirst).not.toHaveBeenCalled();
  });

  it('bài không tồn tại -> 404', async () => {
    enrolled();
    prisma.lesson.findFirst.mockResolvedValue(null);

    await expect(service.getLessonContent(1, 'python', 99)).rejects.toThrow(
      NotFoundException,
    );
  });

  /**
   * Giới hạn đã biết, cố tình KHÔNG đóng ở đây: bộ chấm chạy trong trình duyệt
   * (Pyodide) nên `expect` của từng ca kiểm thử BẮT BUỘC phải tới được client.
   * Test này khoá hiện trạng đó lại để không ai tưởng là đã bịt.
   */
  it('expect của ca kiểm thử VẪN gửi về client (chấm ở trình duyệt)', async () => {
    enrolled();
    prisma.lesson.findFirst.mockResolvedValue(lessonRow(gateContent()));

    const res: any = await service.getLessonContent(1, 'python', 20);

    expect(res.lesson.contentJson.step_4.tests[0].expect).toBe('True');
  });
});
