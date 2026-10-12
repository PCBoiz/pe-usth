import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseLevel, Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { TX_OPTIONS } from 'src/common/prisma-tx.options';

const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const VALID_LANGUAGES = [
  'python',
  'javascript',
  'java',
  'c',
  'c++',
  'csharp',
  'go',
  'rust',
  'sql',
] as const;

const SKILLS_CACHE_TTL_MS = 5 * 60 * 1000; // Task 96: cache 5 phút

/** Icon cố định theo course id (task 89). */
const COURSE_ICONS: Record<string, string> = {
  python: '🐍',
  python_advanced: '🐍',
  javascript: '📜',
  java: '☕',
  c: '🔧',
  'c++': '⚙️',
  sql: '🗄️',
  go: '🐹',
  rust: '🦀',
};

/**
 * Khoá học bằng Python Studio: trang khoá học cần biết CHÍNH XÁC bài số mấy đã
 * xong (mở khoá tuần tự), không chỉ tổng số bài — xem getEnrolled().
 */
export const STUDIO_COURSES = ['python_advanced'];

/** DB lưu enum tiếng Anh; card trên dashboard cần nhãn tiếng Việt. */
const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};

/**
 * content_meta.image có phải giá trị do seed tự sinh (chưa ai tùy chỉnh) không?
 * Seed cũ ghi đúng `static/images/<id>.svg`; chỉ khi khớp y hệt chuỗi đó — hoặc
 * bỏ trống — ta mới thay bằng ảnh bìa mới, để không đè lên ảnh quản trị tự đặt.
 */
function isAutoImage(image: string | undefined, courseId: string): boolean {
  return !image || image === `static/images/${courseId}.svg`;
}

@Injectable()
export class CoursesService {
  private skillsCache: { data: unknown; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  // ---------- Task 87-88 ----------
  async listCourses(
    userId: number,
    q?: string,
    level?: string,
    language?: string,
  ) {
    const where: Prisma.CourseWhereInput = {};
    const and: Prisma.CourseWhereInput[] = [];

    // Bước 0: cột courses.is_published có từ đầu nhưng CHƯA từng được dùng để
    // lọc — khoá seed với is_published = false (vd. python_advanced, xem
    // scripts/seed-python-advanced.ts) vẫn nằm trên trang khám phá và ai cũng
    // đăng ký được. Học viên thường chỉ thấy khoá đã phát hành; quản trị viên
    // thấy tất cả để xem trước bản nháp trước khi mở cho học viên.
    if (!(await this.isAdmin(userId))) {
      and.push({ isPublished: true });
    }

    // Bước 1: search động trên nhiều cột.
    if (q?.trim()) {
      const term = q.trim();
      const lower = term.toLowerCase();

      // Case đặc biệt: 'c' và 'c++' — search ILIKE '%c%' sẽ khớp gần như mọi khoá.
      // Với 2 từ khoá này phải so khớp CHÍNH XÁC cột language/title.
      if (lower === 'c' || lower === 'c++') {
        and.push({
          OR: [
            { language: { equals: lower, mode: 'insensitive' } },
            { title: { equals: term, mode: 'insensitive' } },
          ],
        });
      } else {
        and.push({
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { language: { contains: term, mode: 'insensitive' } },
            { id: { contains: term, mode: 'insensitive' } },
          ],
        });
      }
    }

    // Bước 2: filter level + language theo danh sách cố định (giá trị lạ -> bỏ qua,
    // không ném lỗi, để FE gửi filter rỗng vẫn hoạt động).
    if (level && (VALID_LEVELS as readonly string[]).includes(level)) {
      and.push({ level: level as CourseLevel });
    }
    if (
      language &&
      (VALID_LANGUAGES as readonly string[]).includes(language.toLowerCase())
    ) {
      and.push({
        language: { equals: language.toLowerCase(), mode: 'insensitive' },
      });
    }
    if (and.length) where.AND = and;

    const [courses, enrollments] = await Promise.all([
      this.prisma.course.findMany({ where, orderBy: { id: 'asc' } }),
      this.prisma.enrollment.findMany({
        where: { userId },
        select: { courseId: true },
      }),
    ]);

    const enrolledIds = new Set(enrollments.map((e) => e.courseId));

    return {
      ok: true,
      courses: courses.map((c) => this.mapCourse(c, enrolledIds.has(c.id))),
    };
  }

  // ---------- Task 89 ----------
  async getEnrolled(userId: number) {
    const rows = await this.prisma.enrollment.findMany({
      where: { userId },
      include: { course: true },
      orderBy: { enrolledAt: 'desc' },
    });

    const titles = await this.fetchLessonTitles(rows);
    const studioIds = rows
      .map((r) => r.courseId)
      .filter((id) => STUDIO_COURSES.includes(id));
    const studioCompleted = studioIds.length
      ? await this.prisma.lessonProgress.findMany({
          where: { userId, courseId: { in: studioIds }, status: 'completed' },
          select: { courseId: true, lesson: { select: { sortOrder: true } } },
        })
      : [];
    // Trước đây chỗ này còn truy vấn `lessons` của khoá 'python' bài 11 để trả
    // thêm field `pythonStudio` cho card trên dashboard cũ. Khoá 'python' đã
    // được gỡ (chỉ còn python_advanced) và không client nào đọc field đó nữa —
    // giữ lại chỉ là thêm một vòng gọi Neon (~237ms) trên đường nóng của mọi
    // lần mở bài học, để lấy về null.
    return {
      ok: true,
      enrolled: rows.map((r) => ({
        ...this.mapEnrollment(r, titles),
        ...(STUDIO_COURSES.includes(r.courseId)
          ? {
              completedLessonNumbers: studioCompleted
                .filter((p) => p.courseId === r.courseId)
                .map((p) => p.lesson.sortOrder),
            }
          : {}),
      })),
    };
  }

  // ---------- Task 90 ----------
  async getCoursesEnrolled(userId: number) {
    // Khác listCourses() một chút: endpoint này nuôi cả trang "Khoá học của
    // tôi", nên ngoài khoá đã phát hành còn phải giữ khoá mà CHÍNH user này đã
    // ghi danh. Nếu lọc cứng is_published = true, học viên đang học một khoá bị
    // ẩn sẽ thấy khoá đó biến mất khỏi danh sách và không vào học được nữa —
    // chỉ việc KHÁM PHÁ bị chặn, không phải việc học đang dở.
    const visible: Prisma.CourseWhereInput | undefined = (await this.isAdmin(
      userId,
    ))
      ? undefined
      : { OR: [{ isPublished: true }, { enrollments: { some: { userId } } }] };

    const [courses, rows] = await Promise.all([
      this.prisma.course.findMany({ where: visible, orderBy: { id: 'asc' } }),
      this.prisma.enrollment.findMany({
        where: { userId },
        include: { course: true },
        orderBy: { enrolledAt: 'desc' },
      }),
    ]);

    const enrolledIds = new Set(rows.map((r) => r.courseId));
    const titles = await this.fetchLessonTitles(rows);
    return {
      ok: true,
      courses: courses.map((c) => this.mapCourse(c, enrolledIds.has(c.id))),
      enrolled: rows.map((r) => this.mapEnrollment(r, titles)),
    };
  }

  // ---------- Task 91-92 ----------
  async enroll(userId: number, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khoá học');

    // Khoá chưa phát hành không được nhận ghi danh MỚI: trước đây enroll() bỏ
    // qua hẳn is_published nên bất kỳ ai biết mã khoá (python_advanced) đều
    // đăng ký được vào bản nháp.
    //
    // Chỉ chặn người CHƯA ghi danh. Học viên đã ghi danh từ trước khi khoá bị
    // ẩn vẫn gọi lại enroll() được, vì endpoint này đồng thời tính lại tiến độ
    // (recomputeProgress) — chặn họ ở đây là cắt luôn đường học tiếp.
    if (!course.isPublished) {
      const existing = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: { userId: true },
      });
      if (!existing && !(await this.isAdmin(userId))) {
        throw new ForbiddenException('Khoá học này chưa được phát hành');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Bước 1: ON CONFLICT DO NOTHING — re-enroll không ghi đè dữ liệu cũ.
      await tx.enrollment.createMany({
        data: [{ userId, courseId, progress: 0, completedLessons: 0 }],
        skipDuplicates: true,
      });

      // Bước 2: tính LẠI tiến độ từ lesson_progress. Nếu bỏ bước này, user từng học
      // rồi unenroll → enroll lại sẽ thấy 0% dù lesson_progress vẫn còn nguyên.
      const stats = await this.recomputeProgress(
        tx,
        userId,
        courseId,
        course.lessonCount,
      );

      return { ok: true, ...stats };
    }, TX_OPTIONS);
  }

  // ---------- Task 93 ----------
  async unenroll(userId: number, courseId: string) {
    // CHỈ xoá enrollment — giữ lesson_progress để tiến độ còn nguyên khi học lại.
    await this.prisma.enrollment.deleteMany({ where: { userId, courseId } });
    return { ok: true };
  }

  // ---------- Task 94 ----------
  async rateCourse(userId: number, courseId: string, rating: number) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Đánh giá phải từ 1 đến 5 sao');
    }

    const enrolled = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrolled) {
      throw new ForbiddenException(
        'Bạn cần đăng ký khoá học trước khi đánh giá',
      );
    }

    // Ghi đánh giá + đồng bộ cột courses.rating trong CÙNG transaction.
    // Trước đây chỉ upsert vào course_ratings, trong khi mapCourse() đọc cột
    // tĩnh courses.rating -> user chấm 5 sao nhưng card khoá học vẫn hiện
    // điểm seed cũ mãi mãi.
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.courseRating.upsert({
        where: { userId_courseId: { userId, courseId } },
        create: { userId, courseId, rating },
        update: { rating },
      });

      const agg = await tx.courseRating.aggregate({
        where: { courseId },
        _avg: { rating: true },
        _count: { rating: true },
      });
      const average = agg._avg.rating
        ? Math.round(agg._avg.rating * 10) / 10
        : 0;

      await tx.course.update({
        where: { id: courseId },
        data: { rating: average },
      });

      return { average, count: agg._count.rating };
    }, TX_OPTIONS);

    return { ok: true, ...result };
  }

  // ---------- Task 95 ----------
  async getCourseRating(courseId: string) {
    const agg = await this.prisma.courseRating.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
      count: agg._count.rating,
    };
  }

  // ---------- Task 96-97 ----------
  async getSkills(userId: number) {
    // Bước 1: cấu trúc lessons×courses gần như tĩnh -> cache 5 phút.
    const structure = await this.getSkillStructure();

    // Bước 2: tiến độ riêng từng user -> luôn query mới.
    const done = await this.prisma.lessonProgress.findMany({
      where: { userId, status: 'completed' },
      select: { lessonId: true },
    });
    const doneIds = new Set(done.map((d) => d.lessonId));

    // Bước 3: bảng kỹ năng dựng từ lessons của MỌI khoá, nên nó cũng là một
    // đường khám phá: khoá nháp bị lộ cả mã khoá lẫn tên module (0%). Lọc ở
    // đây thay vì trong getSkillStructure() vì structure được cache 5 phút và
    // dùng chung cho mọi user — cờ is_published phải đọc tươi theo từng request.
    // Vẫn giữ khoá mà user đã ghi danh, để tiến độ của học viên đang học một
    // khoá bị ẩn không bốc hơi khỏi bảng kỹ năng.
    const visibleIds = (await this.isAdmin(userId))
      ? null
      : new Set(
          (
            await this.prisma.course.findMany({
              where: {
                OR: [
                  { isPublished: true },
                  { enrollments: { some: { userId } } },
                ],
              },
              select: { id: true },
            })
          ).map((c) => c.id),
        );

    const skills = structure
      .filter((s) => !visibleIds || visibleIds.has(s.courseId))
      .map((s) => {
        const completed = s.lessonIds.filter((id) => doneIds.has(id)).length;
        return {
          courseId: s.courseId,
          skill: s.module,
          total: s.lessonIds.length,
          completed,
          progress: s.lessonIds.length
            ? Math.round((completed / s.lessonIds.length) * 100)
            : 0,
        };
      });

    return { ok: true, skills };
  }

  // ---------- helpers ----------

  /**
   * Người xem có phải quản trị viên không?
   *
   * Đọc cột users.role y như lessons.service.ts#getLessonContent (và cùng một
   * khái niệm role = 'admin' mà AdminGuard dùng) — KHÔNG tự bày ra cơ chế
   * quyền mới. Phải truy vấn DB vì các service ở đây chỉ nhận userId từ
   * @CurrentUserId(), không thấy payload JWT.
   */
  private async isAdmin(userId: number): Promise<boolean> {
    const viewer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return viewer?.role === 'admin';
  }

  private async getSkillStructure() {
    if (this.skillsCache && this.skillsCache.expiresAt > Date.now()) {
      return this.skillsCache.data as Array<{
        courseId: string;
        module: string;
        lessonIds: number[];
      }>;
    }

    const lessons = await this.prisma.lesson.findMany({
      where: { module: { not: null } },
      select: { id: true, courseId: true, module: true, sortOrder: true },
      orderBy: [{ courseId: 'asc' }, { sortOrder: 'asc' }],
    });

    const grouped = new Map<
      string,
      { courseId: string; module: string; lessonIds: number[] }
    >();
    for (const l of lessons) {
      if (!l.module || l.module.trim() === '') continue; // module <> ''
      const key = `${l.courseId}::${l.module}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          courseId: l.courseId,
          module: l.module,
          lessonIds: [],
        });
      }
      grouped.get(key)!.lessonIds.push(l.id);
    }

    const data = [...grouped.values()];
    this.skillsCache = { data, expiresAt: Date.now() + SKILLS_CACHE_TTL_MS };
    return data;
  }

  /** Dùng chung bởi enroll() và completeLesson() — luôn tính lại từ lesson_progress. */
  async recomputeProgress(
    tx: Prisma.TransactionClient,
    userId: number,
    courseId: string,
    totalLessons: number,
  ) {
    // Chỉ đếm bài đang nằm trong giáo trình (sort_order 1..totalLessons). Khi
    // thay giáo trình (vd. khoá python chuyển sang PE v3 — scripts/seed-pe-v3.ts),
    // bài cũ được lưu trữ ở sort_order >= 1000 cùng lesson_progress của nó; nếu
    // đếm cả chúng thì học viên cũ hiện sẵn % hoàn thành của khoá mới.
    const completedLessons = await tx.lessonProgress.count({
      where: {
        userId,
        courseId,
        status: 'completed',
        lesson: { sortOrder: { gte: 1, lte: totalLessons } },
      },
    });

    const progress =
      totalLessons > 0
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : 0;

    await tx.enrollment.updateMany({
      where: { userId, courseId },
      data: { completedLessons, progress },
    });

    return { completedLessons, progress };
  }

  private mapCourse(
    c: {
      id: string;
      title: string | null;
      level: CourseLevel | null;
      rating: number;
      lessonCount: number;
      xp_reward: number;
      isPublished: boolean;
      language: string | null;
      accentColor: string | null;
      contentMeta?: Prisma.JsonValue;
    },
    enrolled: boolean,
  ) {
    // Trường mô tả (subtitle/description/duration/tag/image/color) không có cột
    // riêng — nằm trong content_meta (xem course-admin.module.ts). Trước đây
    // mapCourse() bỏ hẳn các trường này khỏi response, nên dashboard.js/main.js
    // vẽ card với ảnh vỡ (undefined) và text "undefined" ở mô tả/badge màu.
    const meta = (c.contentMeta ?? {}) as Record<string, string>;

    // Response dùng camelCase (Sheet 3: FE Next.js đang đọc đúng tên này).
    return {
      id: c.id,
      title: c.title,
      // DB lưu enum tiếng Anh; card hiện tiếng Việt như bản gốc.
      level: c.level ? (LEVEL_LABELS[c.level] ?? c.level) : null,
      rating: c.rating,
      totalLessons: c.lessonCount,
      xpReward: c.xp_reward,
      isPublished: c.isPublished,
      language: c.language,
      accentColor: c.accentColor,
      icon: COURSE_ICONS[c.id.toLowerCase()] ?? '📘',
      enrolled,
      // Trường hiển thị card — có fallback an toàn nếu content_meta trống.
      subtitle: meta.subtitle ?? '',
      description: meta.description ?? '',
      duration: meta.duration ?? '',
      tag: meta.tag ?? (c.language ?? '').toUpperCase(),
      // Ảnh bìa: từ 13/08/2026 mỗi khóa có ảnh thật (WebP) thay cho icon SVG
      // phẳng. Giá trị cũ trong content_meta do seed ghi theo ĐÚNG quy ước
      // `static/images/<id>.svg`, nên coi giá trị khớp y hệt quy ước đó là
      // "chưa ai tùy chỉnh" và trả về ảnh mới — nhờ vậy không phải ghi lại
      // cơ sở dữ liệu. Ảnh do quản trị đặt riêng (khác quy ước) vẫn giữ nguyên.
      image: isAutoImage(meta.image, c.id)
        ? `static/images/${c.id}.webp`
        : meta.image,
      color: meta.color ?? c.accentColor ?? '#3B82F6',
      students: '0',
      lessons: c.lessonCount,
    };
  }

  /**
   * Dựng thẻ "Khoá học của tôi" cho frontend.
   *
   * QUAN TRỌNG — hình dạng dữ liệu phải khớp ĐÚNG cái frontend đọc:
   * main.js renderMyCourses() dùng c.id, c.color, c.subtitle, c.duration,
   * c.lastLesson, c.nextLesson. Bản trước chỉ trả `courseId` (không có `id`) và
   * thiếu hẳn 5 trường kia, nên sau khi đăng ký thành công người dùng vẫn KHÔNG
   * vào học được: nút "Tiếp tục học" tra COURSE_URLS[undefined] nên không gắn
   * được sự kiện bấm, còn nút "Huỷ đăng ký" thì gọi với id 'undefined'.
   */
  private mapEnrollment(
    r: {
      courseId: string;
      progress: number;
      completedLessons: number;
      status: string | null;
      timeSpent: string | null;
      enrolledAt: Date;
      course: {
        title: string | null;
        lessonCount: number;
        accentColor: string | null;
        contentMeta?: Prisma.JsonValue;
      };
    },
    lessonTitles?: Map<string, string>,
  ) {
    const meta = (r.course.contentMeta ?? {}) as Record<string, string>;
    const done = r.completedLessons;

    return {
      // `id` là trường frontend thực sự dùng; giữ `courseId` cho client cũ.
      id: r.courseId,
      courseId: r.courseId,
      title: r.course.title,
      subtitle: meta.subtitle ?? '',
      duration: meta.duration ?? '',
      color: meta.color ?? r.course.accentColor ?? '#3B82F6',
      accentColor: r.course.accentColor ?? meta.color ?? '#3B82F6',
      // Cùng logic ảnh bìa với mapCourse() — /api/courses đã có ảnh thật từ
      // 13/08/2026 nhưng mapEnrollment() (nuôi /api/enrolled, tức "Bài học gần
      // đây" trên dashboard) bị bỏ sót nên card đó vẫn kẹt ở vân chéo CSS.
      image: isAutoImage(meta.image, r.courseId)
        ? `static/images/${r.courseId}.webp`
        : meta.image,
      progress: r.progress,
      completedLessons: done,
      totalLessons: r.course.lessonCount,
      // Cột time_spent cho phép NULL; trả chuỗi rỗng sẽ hiện "null" trên giao diện.
      timeSpent: r.timeSpent ?? '0h',
      status: r.status,
      icon: COURSE_ICONS[r.courseId.toLowerCase()] ?? '📘',
      lastLesson:
        done > 0
          ? (lessonTitles?.get(`${r.courseId}:${done}`) ?? `Bài ${done}`)
          : 'Chưa bắt đầu',
      nextLesson:
        done < r.course.lessonCount
          ? (lessonTitles?.get(`${r.courseId}:${done + 1}`) ??
            `Bài ${done + 1}`)
          : 'Đã hoàn thành khoá học',
      enrolledAt: r.enrolledAt,
    };
  }

  /**
   * Lấy tên bài vừa học xong và bài kế tiếp cho tất cả khoá đã đăng ký bằng
   * MỘT truy vấn duy nhất (thay vì 2 truy vấn cho mỗi khoá).
   */
  private async fetchLessonTitles(
    rows: Array<{ courseId: string; completedLessons: number }>,
  ): Promise<Map<string, string>> {
    if (!rows.length) return new Map();

    const or = rows.flatMap((r) => [
      { courseId: r.courseId, sortOrder: r.completedLessons },
      { courseId: r.courseId, sortOrder: r.completedLessons + 1 },
    ]);

    const lessons = await this.prisma.lesson.findMany({
      where: { OR: or },
      select: { courseId: true, sortOrder: true, title: true },
    });

    return new Map(
      lessons
        .filter((l) => l.title)
        .map((l) => [`${l.courseId}:${l.sortOrder}`, l.title as string]),
    );
  }
}
