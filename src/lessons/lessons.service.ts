import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { StreakService, toStudyDate } from 'src/common/streak/streak.service';
import { AchievementsService } from 'src/achievements/achievements.service';
import { CoursesService } from 'src/courses/courses.service';
import { TX_OPTIONS } from 'src/common/prisma-tx.options';

// Django: gems = gems + xp_earned (CÙNG giá trị với XP), không phải hằng số.
const DEFAULT_XP = 50; // Django default khi xpEarned không hợp lệ
const MAX_XP = 500; // Django chặn client gửi XP tuỳ ý
const DEFAULT_LESSON_MINUTES = 15; // COALESCE(l.estimated_minutes, 15)

/**
 * Khoá có mini-game (Python Advanced) chia XP theo chất lượng làm bài:
 * quizScore = % màn đúng ngay lần đầu, XP = xp_reward × (50% + 50% × quizScore).
 * Chặn trần ở xp_reward nên client có gian lận quizScore cũng không vượt được
 * mức thưởng do server cấu hình — chỉ có thể tự làm mình nhận ÍT hơn.
 */
const SCORED_XP_COURSES = ['python_advanced'];

export function scaledXp(base: number, quizScore: number | undefined): number {
  if (quizScore === undefined || !Number.isFinite(quizScore)) return base;
  const pct = Math.min(100, Math.max(0, quizScore));
  return Math.max(1, Math.round(base * (0.5 + 0.5 * (pct / 100))));
}

/** Đọc step_4 trong content_json mà không tin cấu trúc JSON do admin nhập vào. */
function readStep4(
  contentJson: Prisma.JsonValue | null | undefined,
): Record<string, unknown> | null {
  if (
    !contentJson ||
    typeof contentJson !== 'object' ||
    Array.isArray(contentJson)
  )
    return null;
  const step4 = (contentJson as Record<string, unknown>)['step_4'];
  if (!step4 || typeof step4 !== 'object' || Array.isArray(step4)) return null;
  return step4 as Record<string, unknown>;
}

/**
 * Bài có "cửa tự kiểm tra": step_4.gate === true.
 *
 * Hiện đúng 5 bài B20, I07, I12, N04, N08 (scripts/pe-v3/lessons_*.py khai
 * `gate=True`, build.py ghi `step4['gate'] = True`). Nhận diện theo CỜ trong
 * nội dung chứ không hard-code 5 mã bài: biên tập thêm cửa mới thì server tự
 * khoá theo, không phải sửa code backend.
 */
export function isSelfTestGateLesson(
  contentJson: Prisma.JsonValue | null | undefined,
): boolean {
  return readStep4(contentJson)?.['gate'] === true;
}

/**
 * Bỏ `step_4.solutionCode` khỏi nội dung gửi về trình duyệt.
 *
 * LỖ HỔNG ĐƯỢC BỊT: quy tắc sản phẩm của cửa tự kiểm tra là "lời giải mẫu chỉ
 * mở sau lần nộp đầu" — nhưng nó CHỈ được canh ở trình duyệt
 * (StudioLesson.tsx: `onShowSolution={four?.solutionCode && (!gate || d.submitted)}`),
 * còn server vẫn trả nguyên content_json. Nghĩa là mở tab Network xem response
 * của GET /api/courses/:id/lessons/:n/content là đã có toàn bộ lời giải trước
 * khi gõ một dòng nào — kiểm trên API thật đúng như vậy. Nút bị ẩn không phải
 * là dữ liệu bị giữ lại.
 *
 * Trả về BẢN SAO (clone nông ở 2 tầng đủ dùng vì chỉ xoá một khoá của step_4):
 * không được mutate object đọc từ Prisma vì nó có thể còn được dùng ở nơi khác.
 *
 * Giữ lại cờ `solutionWithheld` để client phân biệt "bài không có lời giải mẫu"
 * với "có nhưng server đang giữ" — không có cờ này thì FE không thể giải thích
 * cho học viên vì sao nút biến mất.
 */
export function withholdSolutionCode(
  contentJson: Prisma.JsonValue,
): Prisma.JsonValue {
  const step4 = readStep4(contentJson);
  if (!step4 || !('solutionCode' in step4)) return contentJson;

  // delete trên BẢN SAO, không destructuring-bỏ-biến: biến thừa chỉ để loại
  // một khoá làm eslint (no-unused-vars) đỏ mà không nói thêm điều gì.
  const keptStep4 = { ...step4 };
  delete keptStep4.solutionCode;
  return {
    ...(contentJson as Record<string, unknown>),
    step_4: { ...keptStep4, solutionWithheld: true },
  };
}

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly streak: StreakService,
    private readonly achievements: AchievementsService,
    private readonly courses: CoursesService,
  ) {}

  // ---------- Task 108 ----------
  /**
   * Trả về id bài học theo (khoá học, thứ tự bài). Tạo bản ghi tối thiểu nếu
   * bài học chưa có trong DB — nội dung một số khoá vẫn nằm ở frontend.
   *
   * BẮT BUỘC gọi sau khi đã kiểm tra lessonNo nằm trong [1, course.lessonCount]:
   * trước đây hàm này tạo bản ghi cho BẤT KỲ số nào client gửi lên, nên chỉ cần
   * gọi /api/lessons/999999/complete rồi đổi số là cộng XP vô hạn và bơm phình
   * bảng lessons.
   */
  async resolveLesson(
    tx: Prisma.TransactionClient,
    courseId: string,
    lessonNo: number,
    title?: string,
  ): Promise<{ id: number; xpReward: number }> {
    const existing = await tx.lesson.findFirst({
      where: { courseId, sortOrder: lessonNo },
      select: { id: true, xpReward: true },
    });
    if (existing) return existing;

    // Lớp phòng thủ thứ hai (ngoài kiểm tra ở completeLesson): CHỈ tự tạo bài
    // khi lessonNo còn nằm trong [1, lessonCount] của khoá — caller mới nào
    // quên kiểm tra cũng không bơm được bài rác + XP.
    const course = await tx.course.findUnique({
      where: { id: courseId },
      select: { lessonCount: true },
    });
    if (
      !course ||
      !Number.isInteger(lessonNo) ||
      lessonNo < 1 ||
      lessonNo > course.lessonCount
    ) {
      throw new BadRequestException(
        `Số thứ tự bài học không hợp lệ (khoá này có ${course?.lessonCount ?? 0} bài)`,
      );
    }

    try {
      return await tx.lesson.create({
        data: {
          courseId,
          sortOrder: lessonNo,
          title: title ?? `Bài ${lessonNo}`,
          xpReward: 0,
        },
        select: { id: true, xpReward: true },
      });
    } catch (e) {
      // Hai request song song cùng tạo một bài -> bản thua nhận lỗi trùng khoá
      // (khi đã áp unique index (course_id, sort_order) trong optional-indexes.sql).
      // Đọc lại bản của người thắng thay vì để cả request hỏng.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const winner = await tx.lesson.findFirst({
          where: { courseId, sortOrder: lessonNo },
          select: { id: true, xpReward: true },
        });
        if (winner) return winner;
      }
      throw e;
    }
  }

  // ---------- Task 110-116 ----------
  /**
   * Nội dung một bài học cho học viên ĐÃ ghi danh.
   *
   * Studio cần content_json để dựng bài nhập từ PDF/Markdown; trước đây không
   * có route nào trả nội dung nên mọi bài Python đều phải hard-code ở frontend.
   * Chặn theo Enrollment giống completeLesson — nội dung bài là tài sản của
   * khoá, không phải dữ liệu công khai.
   */
  async getLessonContent(userId: number, courseId: string, lessonNo: number) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { userId: true },
    });

    // Đã chứng minh là admin ngay ở nhánh dưới -> khỏi truy vấn lại role lần hai.
    let knownAdmin = false;
    if (!enrollment) {
      // Quản trị viên xem trước bài học mà không phải ghi danh như học viên.
      // Đây chỉ là quyền ĐỌC: completeLesson vẫn đòi Enrollment nên không có
      // đường farm XP từ đây.
      const viewer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (viewer?.role !== 'admin') {
        throw new ForbiddenException('Bạn chưa đăng ký khóa học này');
      }
      knownAdmin = true;
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: { courseId, sortOrder: lessonNo },
      select: {
        id: true,
        title: true,
        subtitle: true,
        module: true,
        sortOrder: true,
        xpReward: true,
        contentJson: true,
      },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');

    const progress = await this.prisma.lessonProgress.findFirst({
      where: { userId, courseId, lessonId: lesson.id, status: 'completed' },
      select: { lessonId: true },
    });
    const completed = Boolean(progress);

    // CHỈ giữ lời giải mẫu lại ở bài cửa tự kiểm tra và khi học viên chưa xong
    // bài. Không mở rộng sang mọi bài vì ở các bài còn lại "Hiện lời giải" là
    // TÍNH NĂNG có chủ đích (gợi ý bậc cuối, bấm vào là FE ghi solutionUsed /
    // assisted) — cắt hết thì phá trải nghiệm học mà không bịt thêm lỗ nào.
    //
    // Truy vấn role chỉ nằm trong nhánh này: 5/40 bài, và chỉ tới khi học viên
    // làm xong. Đường nóng (mọi bài khác) KHÔNG phải thêm vòng gọi DB nào —
    // mỗi vòng tới Neon ~237ms nên không đặt nó ở ngoài.
    // ĐÁNH ĐỔI NGƯỜI DÙNG THẤY ĐƯỢC, ghi lại để không ai tưởng là lỗi:
    // FE chỉ gọi endpoint này MỘT LẦN lúc mở bài (StudioLesson.tsx, useEffect
    // nạp content), còn nút "Hiện lời giải" của bài cửa bật theo cờ tại chỗ
    // `!gate || d.submitted`. Mốc của server là `completed` (có
    // LessonProgress), KHÔNG phải "đã nộp" — server không có tín hiệu nào cho
    // trạng thái đó. Nên ở 5 bài cửa, học viên nộp xong trong cùng phiên vẫn
    // chưa thấy lời giải mẫu: phải tải lại trang sau khi bài được tính hoàn
    // thành. Khoảng trống này nằm ở FE (gọi lại content sau POST
    // /lessons/:n/complete, hoặc đọc cờ `solutionWithheld` để xin lời giải khi
    // cần) — cố tình KHÔNG lấp bằng cách nới lỏng điều kiện ở server, vì nới ra
    // là mở lại đúng cái lỗ vừa bịt.
    const gated = isSelfTestGateLesson(lesson.contentJson);
    if (gated && !completed) {
      const isAdmin =
        knownAdmin ||
        (
          await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
          })
        )?.role === 'admin';

      // Admin xem trước nội dung thì vẫn thấy lời giải: bảng đáp án trong
      // StudioLesson.tsx đã chặn theo role === 'admin' sẵn, và họ không phải
      // người đang được đánh giá.
      if (!isAdmin) {
        return {
          ok: true,
          lesson: {
            ...lesson,
            contentJson: withholdSolutionCode(lesson.contentJson),
          },
          completed,
        };
      }
    }

    return { ok: true, lesson, completed };
  }

  async completeLesson(
    userId: number,
    lessonNo: number,
    body: {
      courseId?: string;
      course_id?: string;
      lessonTitle?: string;
      title?: string;
      xpEarned?: number;
      xp?: number;
      quizScore?: number;
      quiz_score?: number;
    },
  ) {
    const courseId = body.courseId ?? body.course_id;
    if (!courseId) throw new BadRequestException('Thiếu courseId');

    const lessonTitle = body.lessonTitle ?? body.title;
    const quizScore = body.quizScore ?? body.quiz_score;

    // Bước 1: course phải tồn tại.
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');

    // Bước 1a: PHẢI đã ghi danh khoá này (lỗ hổng BB2-7, MEDIUM, đã chứng
    // minh khai thác được trên môi trường thật).
    //
    // Trước đây endpoint chỉ kiểm tra course tồn tại + lessonNo hợp lệ, KHÔNG
    // hề kiểm tra Enrollment — gọi thẳng POST /api/lessons/:n/complete với
    // courseId của MỘT KHOÁ BẤT KỲ (kể cả chưa đăng ký) vẫn cộng XP/streak
    // bình thường. Đo thật: 6 request tới các khoá chưa ghi danh (python,
    // java) cộng liền +60 XP; tổng toàn bộ bài học farmable được ngay lập
    // tức lên tới ~4460 XP, đủ vượt bảng xếp hạng bằng một script vài phút —
    // và còn ghi "tiến độ" giả cho một khoá chưa từng đăng ký.
    //
    // Cùng thông điệp/kiểu lỗi với courses.service.ts#rateCourse (chỗ khác
    // đã có sẵn đúng kiểm tra này) để giữ nhất quán trải nghiệm lỗi trong
    // toàn hệ thống.
    const enrolled = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrolled) {
      throw new ForbiddenException(
        'Bạn cần đăng ký khoá học trước khi hoàn thành bài học',
      );
    }

    // Bước 1b: CHẶN số thứ tự bài học nằm ngoài khoá học.
    // Không có kiểm tra này thì gọi /api/lessons/<số bất kỳ>/complete sẽ tạo ra
    // một bài học mới và cộng XP — đổi số là farm XP vô hạn, đồng thời bơm phình
    // bảng lessons bằng dữ liệu rác.
    // KHÔNG miễn kiểm tra khi lessonCount = 0: khoá mới tạo (mặc định 0 bài)
    // mà cho qua mọi lessonNo thì N=1,2,3,... là farm XP vô hạn y hệt lỗ cũ.
    if (
      !Number.isInteger(lessonNo) ||
      lessonNo < 1 ||
      lessonNo > course.lessonCount
    ) {
      throw new BadRequestException(
        `Số thứ tự bài học không hợp lệ (khoá này có ${course.lessonCount} bài)`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const lesson = await this.resolveLesson(
        tx,
        courseId,
        lessonNo,
        lessonTitle,
      );
      const lessonId = lesson.id;

      // XP do SERVER quyết định, không lấy theo lời khai của client.
      // Trước đây dùng thẳng body.xpEarned (chỉ chặn <= 500), nên client sửa
      // payload là tự thưởng cho mình gấp 10 lần mỗi bài. Giá trị chuẩn nằm ở
      // cột lessons.xp_reward; bài chưa cấu hình (=0) thì dùng mặc định.
      const baseXp =
        lesson.xpReward > 0 ? Math.min(lesson.xpReward, MAX_XP) : DEFAULT_XP;
      const xpGain = SCORED_XP_COURSES.includes(courseId)
        ? scaledXp(baseXp, quizScore)
        : baseXp;

      // Bước 2: CHIẾM QUYỀN "người hoàn thành đầu tiên" một cách NGUYÊN TỬ.
      //
      // Bản cũ đọc trạng thái rồi mới ghi (findUnique -> upsert). Ở mức cô lập
      // READ COMMITTED (mặc định của Postgres), hai request giống hệt nhau gửi
      // song song (bấm đúp, client tự thử lại) đều đọc ra "chưa hoàn thành" rồi
      // CẢ HAI cùng cộng XP. Ở đây dùng compare-and-set: Postgres đánh giá lại
      // điều kiện WHERE sau khi khoá dòng, nên đúng MỘT request thắng.
      const created = await tx.lessonProgress.createMany({
        data: [
          {
            userId,
            lessonId,
            courseId,
            status: 'completed',
            quizScore: quizScore ?? 0,
            xpEarned: xpGain,
          },
        ],
        skipDuplicates: true,
      });

      let isFirstCompletion = created.count === 1;

      if (!isFirstCompletion) {
        const claimed = await tx.lessonProgress.updateMany({
          where: { userId, lessonId, status: { not: 'completed' } },
          data: {
            status: 'completed',
            xpEarned: xpGain,
            ...(quizScore !== undefined ? { quizScore } : {}),
          },
        });
        isFirstCompletion = claimed.count === 1;

        if (!isFirstCompletion) {
          // Đã hoàn thành từ trước: không cộng thưởng nữa, chỉ nâng điểm nếu
          // lần này cao hơn (không bao giờ hạ thành tích đã đạt).
          await tx.lessonProgress.updateMany({
            where: { userId, lessonId, xpEarned: { lt: xpGain } },
            data: { xpEarned: xpGain },
          });
          if (quizScore !== undefined) {
            await tx.lessonProgress.updateMany({
              where: { userId, lessonId, quizScore: { lt: quizScore } },
              data: { quizScore },
            });
          }
        }
      }

      const alreadyCompleted = !isFirstCompletion;

      // Bước 4: tính lại tiến độ khoá học.
      const progress = await this.courses.recomputeProgress(
        tx,
        userId,
        courseId,
        course.lessonCount,
      );

      // Bước 5-6: CHỈ khi lần đầu hoàn thành mới cộng XP/gems/streak.
      let newStreak: number | null = null;

      if (!alreadyCompleted) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { streak: true, lastStudyDate: true },
        });

        const today = new Date();
        newStreak = this.streak.computeNewStreak(
          user?.lastStudyDate,
          user?.streak ?? 0,
          today,
        );

        await tx.user.update({
          where: { id: userId },
          data: {
            xp: { increment: xpGain },
            gems: { increment: xpGain },
            streak: newStreak,
            // toStudyDate: cột @db.Date lưu ở UTC midnight, ghi thẳng new Date() sẽ lệch ngày.
            lastStudyDate: toStudyDate(today),
          },
        });

        // Bước 6: log XP theo ngày (cộng dồn nếu đã có bản ghi hôm nay).
        const logDate = toStudyDate(today);
        const existingLog = await tx.userDailyXpLog.findFirst({
          where: { userId, logDate },
        });
        if (existingLog) {
          await tx.userDailyXpLog.update({
            where: { id: existingLog.id },
            data: { xpEarned: { increment: xpGain } },
          });
        } else {
          await tx.userDailyXpLog.create({
            data: { userId, logDate, xpEarned: xpGain },
          });
        }
      }

      return {
        completedLessons: progress.completedLessons,
        progress: progress.progress,
        xpGain,
        newStreak,
        alreadyCompleted,
      };
    }, TX_OPTIONS);

    // Trao thành tích SAU KHI transaction đã commit.
    //
    // Trước đây bước này nằm TRONG transaction: nó quét toàn bảng achievements
    // rồi ghi từng dòng, thêm 5-7 vòng gọi DB (mỗi vòng ~237ms tới Neon) trong
    // khi transaction vẫn đang GIỮ một connection của pool. Với pool 50, chỉ
    // vài chục người hoàn thành bài cùng lúc là cạn connection và toàn hệ thống
    // đứng. Thành tích là dữ liệu suy ra được nên tách ra ngoài là an toàn:
    // lỗi ở đây không được phép làm mất XP đã cộng.
    let awarded: unknown[] = [];
    if (!result.alreadyCompleted) {
      try {
        awarded = await this.achievements.checkAndAwardAchievements(userId);
      } catch (e) {
        this.logger.warn(
          `Trao thành tích thất bại cho user ${userId}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    // Shape khớp bản Django (lessons/views.py): camelCase, xpGained = 0 khi
    // đã hoàn thành trước đó.
    return {
      ok: true,
      completedLessons: result.completedLessons,
      progress: result.progress,
      xpGained: result.alreadyCompleted ? 0 : result.xpGain,
      newAchievements: awarded,
      // Field bổ sung ngoài Django, hữu ích cho FE hiện tại:
      streak: result.newStreak,
      alreadyCompleted: result.alreadyCompleted,
    };
  }
}
